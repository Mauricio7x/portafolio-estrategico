"use strict";
/* tests/leer_documentos.js · LEER LOS DOCUMENTOS DE MIS PROCESOS SIN LA PESTAÑA ABIERTA (PLAN_X20 tanda 12, 12-nov-2026)
   Hasta hoy los documentos de un proceso guardado (pliego, adendas, Formulario, cronograma…) solo se leían con la pestaña
   de Mis procesos abierta: la lectura es un ciclo del navegador (`leerDocumentos` en public/app.js) que baja cada archivo
   por `op=descargar`, lo interpreta con pdf.js y el OCR de la aplicación y devuelve el texto por `op=documentos`. El
   servidor no tiene lector de PDF.
   Esta herramienta la corre la tarea de la mañana (docs/RUTINAS.md, el vigilante): abre la página del PROPIO repositorio
   (public/, servida aquí en local) en Chromium y llama a la MISMA `leerDocumentos` (`window.__detektaLeerDocumentos`), para
   no tener dos reglas de qué se lee y cómo. Es el diseño de tests/capturar_evaluaciones.js, del que se reutiliza el
   servidor local y el cupo de OCR:
   · LA LLAVE NUNCA ENTRA A LA PÁGINA: los pedidos de la página a /api/ los reenvía Node a producción con la llave, y SOLO
     los de la lectura (`op=documentos`, `op=descargar` y `op=extraer-texto` del router pliego). Todo lo demás (la lista, el
     arranque de la página) recibe un 404 local y no sale: cargar la página no gasta la cuota de Upstash.
   · Los procesos salen de Mis procesos (`op=seguimiento&solo=abiertos`: los guardados que no han cerrado, de la foto, sin
     el corpus). Solo se abren los que tienen documentos por leer (`pendientes` de `op=documentos`), hasta `--max-procesos`.
   · `--probar`: lee de verdad pero NO guarda (los POST de `op=documentos` no salen; se anota qué se habría guardado).
   Uso:
     node tests/leer_documentos.js [--perfil helder] [--max-procesos 5] [--max-ocr 120] [--probar] [CO1.REQ.… …]
   Necesita HISTORICO_TOKEN y, con el muro de Vercel, VERCEL_AUTOMATION_BYPASS_SECRET. Termina con «RESUMEN {json}».
   Código de salida: 0 hecho (aunque no hubiera nada por leer), 3 la base de datos no responde, 1 otro fallo. */
const EV = require("./capturar_evaluaciones.js");

const APP = "https://detekta-app.vercel.app";
const TIEMPO_POR_PROCESO_MS = 15 * 60e3;
const TIEMPO_POR_PEDIDO_MS = 120e3;         // la lista de Mis procesos o el índice de documentos de un proceso (datos.gov.co detrás) pueden tardar; no se espera para siempre   // un proceso con 12 documentos y escaneos: el OCR de una página tarda segundos

function argumentos(argv) {
  const a = { perfil: "helder", maxProcesos: 5, maxOcr: 120, probar: false, ids: [] };
  for (let i = 0; i < argv.length; i++) {
    const x = argv[i], sig = () => argv[++i];
    if (x === "--perfil") a.perfil = String(sig() || "");
    else if (x === "--max-procesos") a.maxProcesos = Number(sig());
    else if (x === "--max-ocr") a.maxOcr = Number(sig());
    else if (x === "--probar") a.probar = true;
    else if (/^CO1\.[A-Z]+\.\d+$/.test(x)) a.ids.push(x);
    else throw new Error(`argumento desconocido: ${x}`);
  }
  if (!/^[a-z0-9_-]{2,60}$/i.test(a.perfil)) throw new Error("--perfil inválido");
  for (const [k, b] of [["maxProcesos", "--max-procesos"], ["maxOcr", "--max-ocr"]]) if (!Number.isInteger(a[k]) || a[k] < 0) throw new Error(`${b} debe ser un entero de 0 en adelante`);
  return a;
}

/* ¿Este pedido de la página es de la lectura y sale a producción? Solo el router pliego y solo esas tres operaciones. */
function reenviable(metodo, url) {
  let u;
  try { u = new URL(url); } catch { return false; }
  if (u.pathname !== "/api/pliego") return false;
  const op = u.searchParams.get("op");
  if (op === "documentos") return metodo === "GET" || metodo === "POST";
  return (op === "descargar" || op === "extraer-texto") && metodo === "POST";
}

/* Los procesos abiertos de una respuesta de Mis procesos: la vista ligera (`procesos:[{id}]`) o, de un servidor que todavía
   no la conoce (un `solo` desconocido es inerte y responde la lista entera), los no cerrados de la lista entera. */
function idsAbiertos(j) {
  if (!j || !Array.isArray(j.procesos)) return null;
  return j.procesos.filter((p) => p && typeof p.id === "string" && p.es_historia !== true && p.cerrado !== true).map((p) => p.id);
}

function cabeceras() {
  const token = process.env.HISTORICO_TOKEN || "";
  if (!token) throw new Error("Falta HISTORICO_TOKEN en el entorno");
  return { "x-historico-token": token, ...(process.env.VERCEL_AUTOMATION_BYPASS_SECRET ? { "x-vercel-protection-bypass": process.env.VERCEL_AUTOMATION_BYPASS_SECRET } : {}) };
}
// el parseo del JSON va APARTE del fetch: el muro del edge responde HTML
async function pedir(ruta, { method = "GET", body } = {}) {
  const r = await fetch(APP + ruta, { method, headers: { ...cabeceras(), ...(body ? { "content-type": "application/json" } : {}) }, body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(TIEMPO_POR_PEDIDO_MS) });
  const texto = await r.text();
  try { return { status: r.status, j: JSON.parse(texto) }; } catch { return { status: r.status, j: null, texto: texto.slice(0, 200) }; }
}

/* Lo que se habría guardado, en --probar: sin el texto, solo de qué se trata. */
function resumenDelGuardado(cuerpo) {
  let b;
  try { b = JSON.parse(cuerpo || "{}"); } catch { return { ilegible: true, motivo: "cuerpo ilegible" }; }
  if (b.ilegible) return { id_documento: b.id_documento, ilegible: true, definitivo: b.definitivo === true, motivo: String(b.motivo || "").slice(0, 160) };
  if (b.formulario_excel) return { id_documento: b.id_documento, formulario_excel: !!(b.formulario_excel && b.formulario_excel.publicable) };
  if (b.cronograma_excel) return { id_documento: b.id_documento, cronograma_excel: !!(b.cronograma_excel && b.cronograma_excel.publicable) };
  return { id_documento: b.id_documento, caracteres: String(b.texto || "").length, paginas: b.paginas_total || null, origen: b.origen || null };
}

async function principal() {
  const a = argumentos(process.argv.slice(2));
  const R = { perfil: a.perfil, probar: a.probar, abiertos: 0, con_pendientes: 0, procesos: [], imagenes_ocr: 0, base_caida: false };
  // 1 · los procesos
  let ids = a.ids;
  if (!ids.length) {
    const r = await pedir(`/api/perfil?op=seguimiento&perfil=${encodeURIComponent(a.perfil)}&solo=abiertos`);
    if (EV.baseCaida(r)) { R.base_caida = true; console.log("RESUMEN", JSON.stringify(R)); process.exitCode = 3; return; }
    if (EV.llaveRechazada(r)) throw new Error(`la llave fue rechazada (${r.status})`);
    ids = idsAbiertos(r.j);
    if (!ids) throw new Error(`Mis procesos de «${a.perfil}»: ${r.status} ${JSON.stringify(r.j || r.texto).slice(0, 160)}`);
  }
  R.abiertos = ids.length;
  console.log(a.ids.length ? `· ${ids.length} ${ids.length === 1 ? "proceso pedido" : "procesos pedidos"}` : `· ${ids.length} procesos abiertos en Mis procesos de «${a.perfil}»`);
  // 2 · los que tienen documentos por leer (lo mismo que la pestaña pide primero)
  const cola = [];
  for (const id of ids) {
    if (cola.length >= a.maxProcesos) break;
    let r;
    try { r = await pedir(`/api/pliego?op=documentos&id_proceso=${encodeURIComponent(id)}`); }
    catch (e) { console.log(`· ${id}: no respondió (${String((e && e.message) || e).slice(0, 80)})`); continue; }
    if (EV.baseCaida(r)) { R.base_caida = true; break; }
    console.log(`· ${id}: ${r.j && Array.isArray(r.j.pendientes) ? r.j.pendientes.length : "?"} documentos por leer`);
    const n = r.j && Array.isArray(r.j.pendientes) ? r.j.pendientes.length : 0;
    if (n) cola.push({ id, pendientes: n });
  }
  R.con_pendientes = cola.length;
  if (R.base_caida) { console.log("RESUMEN", JSON.stringify(R)); process.exitCode = 3; return; }
  if (!cola.length) { console.log("RESUMEN", JSON.stringify(R)); return; }
  // 3 · la página del repositorio, con la lectura de la pestaña
  let chromium;
  try { ({ chromium } = require("playwright")); } catch { ({ chromium } = require("/opt/node22/lib/node_modules/playwright")); }
  const srv = await EV.servirPublic();   // ya escucha en 127.0.0.1 y un puerto libre
  const origen = `http://127.0.0.1:${srv.address().port}`;
  const nav = await chromium.launch(process.env.HTTPS_PROXY ? { proxy: { server: process.env.HTTPS_PROXY, bypass: "127.0.0.1,localhost" } } : {});
  const guardia = EV.crearGuardiaOcr({ topeImagenes: a.maxOcr, reenviar: async (cuerpo) => {
    const res = await fetch(`${APP}/api/pliego?op=extraer-texto`, { method: "POST", headers: { "content-type": "application/json", ...cabeceras() }, body: cuerpo });
    return { status: res.status, contentType: res.headers.get("content-type") || "application/json", body: Buffer.from(await res.arrayBuffer()) };
  } });
  const guardados = [];
  try {
    const ctx = await nav.newContext();
    await ctx.route(`${origen}/api/**`, async (route) => {
      const q = route.request(), metodo = q.method(), url = q.url();
      if (!reenviable(metodo, url)) return route.fallback();
      const u = new URL(url);
      if (u.searchParams.get("op") === "extraer-texto") { const r = await guardia.atender(q.postData()); return route.fulfill({ status: r.status, headers: { "content-type": r.contentType }, body: r.body }); }
      if (a.probar && metodo === "POST" && u.searchParams.get("op") === "documentos") {
        guardados.push(resumenDelGuardado(q.postData()));
        return route.fulfill({ status: 200, headers: { "content-type": "application/json" }, body: JSON.stringify({ ok: true, pendientes: [] }) });
      }
      const res = await fetch(`${APP}${u.pathname}${u.search}`, { method: metodo, headers: { ...cabeceras(), ...(metodo === "POST" ? { "content-type": "application/json" } : {}) }, body: metodo === "POST" ? q.postData() : undefined });
      if (metodo === "POST" && u.searchParams.get("op") === "documentos") guardados.push({ ...resumenDelGuardado(q.postData()), status: res.status });
      return route.fulfill({ status: res.status, headers: { "content-type": res.headers.get("content-type") || "application/json" }, body: Buffer.from(await res.arrayBuffer()) });
    });
    const pag = await ctx.newPage();
    const errores = [];
    pag.on("pageerror", (e) => errores.push(e.message));
    await pag.goto(`${origen}/index.html`, { waitUntil: "load", timeout: 90000 });
    await pag.waitForFunction(() => typeof window.__detektaLeerDocumentos === "function" && typeof window.__pliegoLeerPdf === "function", null, { timeout: 60000 });
    for (const p of cola) {
      const desde = guardados.length;
      let r;
      try {
        r = await Promise.race([pag.evaluate(([id, perfil]) => window.__detektaLeerDocumentos(id, perfil), [p.id, a.perfil]),
          new Promise((_, no) => setTimeout(() => no(new Error("el proceso pasó del tiempo de lectura")), TIEMPO_POR_PROCESO_MS))]);
      } catch (e) { r = { error: String((e && e.message) || e).slice(0, 200) }; }
      R.procesos.push({ id: p.id, pendientes: p.pendientes, ...(r || {}), guardados: guardados.slice(desde) });
      console.log(`· ${p.id}: ${r && r.leidos != null ? `${r.leidos} leídos, ${r.fallidos} sin leer` : r && r.error ? r.error : "sin resultado"}`);
    }
    R.imagenes_ocr = guardia.estado.imagenes;
    if (errores.length) R.errores_de_pagina = errores.slice(0, 5);
  } finally {
    await nav.close().catch(() => {});
    srv.close();
  }
  console.log("RESUMEN", JSON.stringify(R));
}

module.exports = { argumentos, reenviable, idsAbiertos, resumenDelGuardado };
if (require.main === module) principal().catch((e) => { console.log("FALLO:", String((e && e.message) || e).slice(0, 300)); console.log("RESUMEN", JSON.stringify({ fallo: true })); process.exitCode = 1; });
