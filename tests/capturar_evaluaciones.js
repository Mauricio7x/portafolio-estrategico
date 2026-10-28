"use strict";
/* tests/capturar_evaluaciones.js · LEER EVALUACIONES EN PRODUCCIÓN DESDE UNA SESIÓN (28-oct-2026)
   Lo mismo que hace el botón «Leer más evaluaciones de esta entidad» de la ventana de la entidad (public/app.js
   leerEvaluaciones), para que la tarea de madrugada (/evaluaciones) lea sola un cupo medido de documentos:
     op=evaluacion&documento=1 → op=descargar por trozos → window.__pliegoLeerPdfMixto (pdf.js + OCR de la app)
     → POST op=evaluacion (el TEXTO; la interpretación la hace después /evaluaciones).
   LA LLAVE NUNCA ENTRA AL CÓDIGO DE UNA PÁGINA: el servidor la rechaza desde un navegador, a propósito. Node hace las
   llamadas con la llave. Chromium abre la página del PROPIO repositorio (public/, servida aquí en local) solo para
   ejecutar el lector de PDF; de lo que esa página pide a /api/ se reenvía a producción ÚNICAMENTE el OCR
   (POST op=extraer-texto, que no toca la base de datos); todo lo demás recibe un 404 local y no sale. Así cargar la
   página no gasta la cuota de Upstash (la lista baja índices de ~26 MB) ni actúa con la llave.
   LOS CANDIDATOS SALEN DE DATOS.GOV.CO, NO DE LA APLICACIÓN (revisión adversaria, 28-oct-2026): la vista rápida de la
   entidad (`publicado=1`) trae la lista vacía a propósito, y la completa recorre el histórico en Upstash (su costo
   crece con el corpus). Node pide a p6dx-8zbt los procesos adjudicados de la entidad desde 2025 y les aplica las reglas
   de la aplicación (`lib/indice_competencia.oferentesDe` y `primeraFecha`).
   CUPOS (publicados el 28-oct-2026): OCR.space gratis da 500 solicitudes al día por IP y 25.000 al mes
   (https://ocr.space/ocrapi); la aplicación manda cada página como una imagen. El cupo cuenta las IMÁGENES que salen
   al OCR, no las páginas que volvieron con texto: por omisión no se empieza un documento nuevo pasadas 120, y pasadas
   150 no sale ninguna más (como mucho 8 documentos). Si OCR.space responde 429 o 5xx, el servidor reintenta cada imagen
   hasta 2 veces más (lib/apu_ocr.js): esas solicitudes no se ven desde aquí.
   Uso:
     node tests/capturar_evaluaciones.js [--perfil helder] [--max-docs 8] [--max-ocr 120] [--por-entidad 3] ["ENTIDAD|NIT" ...]
     node tests/capturar_evaluaciones.js --probar-url <url del PDF> | --probar-archivo <ruta>   (lee uno y NO guarda nada)
   Sin entidades, las de los procesos de «Mis procesos» del perfil. Necesita HISTORICO_TOKEN y, con el muro de Vercel,
   VERCEL_AUTOMATION_BYPASS_SECRET. Termina con una línea «RESUMEN {json}». Código de salida: 0 hecho (aunque no haya
   nada nuevo), 3 la base de datos no responde (no se lee nada: el texto no tendría dónde guardarse), 1 otro fallo. */
const http = require("http"), fs = require("fs"), path = require("path");
const { oferentesDe, primeraFecha } = require("../lib/indice_competencia.js");
const { crearCliente, escSoQL } = require("../lib/socrata.js");

const APP = "https://detekta-app.vercel.app";
const PUBLIC = path.join(__dirname, "..", "public");
const TIPOS = { ".html": "text/html; charset=utf-8", ".js": "application/javascript; charset=utf-8", ".css": "text/css", ".json": "application/json", ".csv": "text/csv", ".svg": "image/svg+xml", ".png": "image/png", ".ico": "image/x-icon" };
/* lo que sirve para la regla del precio (la misma de la ventana de la entidad: licitación o menor cuantía con 3 o más
   ofertas), cerrado desde 2025 (`dmgg-8hin` solo trae archivos cargados desde esa fecha) */
const util = (p) => /^CO1\.(REQ|PPI|NTC)\./.test(String(p.id || "")) && String(p.fecha_adjudicacion || "") >= "2025-01-01"
  && /licitaci|menor cuant/i.test(String(p.modalidad || "")) && Number(p.numero_ofertas) >= 3;

function argumentos(argv) {
  const a = { perfil: "helder", maxDocs: 8, maxOcr: 120, porEntidad: 3, entidades: [], probarUrl: null, probarArchivo: null };
  for (let i = 0; i < argv.length; i++) {
    const x = argv[i], sig = () => argv[++i];
    if (x === "--perfil") a.perfil = String(sig() || "");
    else if (x === "--max-docs") a.maxDocs = Number(sig());
    else if (x === "--max-ocr") a.maxOcr = Number(sig());
    else if (x === "--por-entidad") a.porEntidad = Number(sig());
    else if (x === "--probar-url") a.probarUrl = String(sig() || "");
    else if (x === "--probar-archivo") a.probarArchivo = String(sig() || "");
    else a.entidades.push(x);
  }
  for (const [k, bandera] of [["maxDocs", "--max-docs"], ["maxOcr", "--max-ocr"], ["porEntidad", "--por-entidad"]]) if (!Number.isInteger(a[k]) || a[k] < 0) throw new Error(`${bandera} debe ser un entero de 0 en adelante`);
  return a;
}

function cabeceras() {
  const token = process.env.HISTORICO_TOKEN || "";
  if (!token) throw new Error("Falta HISTORICO_TOKEN en el entorno");
  return { "x-historico-token": token, ...(process.env.VERCEL_AUTOMATION_BYPASS_SECRET ? { "x-vercel-protection-bypass": process.env.VERCEL_AUTOMATION_BYPASS_SECRET } : {}) };
}
// el parseo del JSON va APARTE del fetch: el muro del edge responde HTML
async function pedir(ruta, { method = "GET", body } = {}) {
  const r = await fetch(APP + ruta, { method, headers: { ...cabeceras(), ...(body ? { "content-type": "application/json" } : {}) }, body: body ? JSON.stringify(body) : undefined });
  const texto = await r.text();
  try { return { status: r.status, j: JSON.parse(texto) }; } catch { return { status: r.status, j: null, texto: texto.slice(0, 200) }; }
}
/* la base caída se reconoce en la respuesta: «Redis: Upstash …» de la lista y la salud, o el 503 de op=evaluacion
   («No se pudo consultar o guardar en el almacén», con el texto de Upstash en `detalle`) */
const baseCaida = (r) => !!(r && r.j && r.j.ok === false
  && (/Redis|Upstash/i.test(`${r.j.error || ""} ${r.j.detalle || ""}`) || (r.status === 503 && /almac[eé]n/i.test(String(r.j.error || "")))));
const llaveRechazada = (r) => !!(r && (r.status === 401 || r.status === 403) && !baseCaida(r));
// el cupo de OCR cuenta lo que SALE: con `usadas` imágenes ya mandadas, ¿caben `nuevas` sin pasar `tope`?
const cabenEnElCupo = (usadas, nuevas, tope) => Number.isInteger(nuevas) && nuevas >= 0 && usadas + nuevas <= tope;
/* Filas de p6dx-8zbt → procesos con las reglas de la aplicación; una fila por proceso (la primera con número de
   ofertas), los más recientes primero */
function candidatosDe(filas) {
  const por = new Map();
  for (const f of Array.isArray(filas) ? filas : []) {
    const id = String((f && f.id_del_proceso) || "").trim();
    if (!id) continue;
    const p = { id, modalidad: f.modalidad_de_contratacion || null, fecha_adjudicacion: primeraFecha(f), numero_ofertas: oferentesDe(f) };
    const ya = por.get(id);
    if (!ya || (ya.numero_ofertas == null && p.numero_ofertas != null)) por.set(id, p);
  }
  return [...por.values()].sort((x, y) => String(y.fecha_adjudicacion || "").localeCompare(String(x.fecha_adjudicacion || "")));
}
async function procesosDeLaEntidad(entidad, nit) {
  const donde = nit ? `starts_with(nit_entidad, '${escSoQL(String(nit).replace(/\D/g, ""))}')` : `entidad = '${escSoQL(entidad)}'`;
  const filas = await crearCliente({ baseUrl: process.env.SECOP_BASE_URL || "https://www.datos.gov.co/resource/p6dx-8zbt.json" }).pedir({
    "$select": "id_del_proceso,modalidad_de_contratacion,fecha_adjudicacion,adjudicado,respuestas_al_procedimiento,proveedores_unicos_con,conteo_de_respuestas_a_ofertas,respuestas_externas",
    "$where": `${donde} AND adjudicado = 'Si' AND fecha_adjudicacion >= '2025-01-01T00:00:00'`, "$order": "fecha_adjudicacion DESC", "$limit": "1000",
  }, "procesos de la entidad", { plazoMs: 30000 });
  return candidatosDe(filas);
}

// public/ del repositorio, en local: la página solo pone el lector de PDF
function servirPublic() {
  const srv = http.createServer((q, r) => {
    let u;
    try { u = decodeURIComponent(String(q.url || "/").split("?")[0]); } catch { r.writeHead(400); return r.end(""); }
    if (u.startsWith("/api/")) { r.writeHead(404, { "content-type": "application/json" }); return r.end(JSON.stringify({ ok: false, error: "sin servidor en la lectura local" })); }
    const f = path.normalize(path.join(PUBLIC, u === "/" ? "index.html" : u));
    if (!f.startsWith(PUBLIC + path.sep) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end(""); }
    r.writeHead(200, { "content-type": TIPOS[path.extname(f)] || "application/octet-stream" });
    fs.createReadStream(f).pipe(r);
  });
  return new Promise((ok) => srv.listen(0, "127.0.0.1", () => ok(srv)));
}

// de lo que pide la página, SOLO sale a producción el OCR (que no toca la base); lo demás lo contesta el 404 local
const reenviarAProduccion = (metodo, url) => {
  let u; try { u = new URL(url); } catch { return false; }
  return metodo === "POST" && u.pathname === "/api/pliego" && u.searchParams.get("op") === "extraer-texto";
};

async function abrirLector(origen, { topeImagenes = Infinity } = {}) {
  let chromium;
  try { ({ chromium } = require("playwright")); } catch { ({ chromium } = require("/opt/node22/lib/node_modules/playwright")); }
  const nav = await chromium.launch(process.env.HTTPS_PROXY ? { proxy: { server: process.env.HTTPS_PROXY, bypass: "127.0.0.1,localhost" } } : {});
  const ctx = await nav.newContext();
  let ocrPedidos = 0, imagenes = 0, negadas = 0;
  await ctx.route(`${origen}/api/**`, async (route) => {
    const q = route.request();
    if (reenviarAProduccion(q.method(), q.url())) {
      let n = null;
      try { const c = JSON.parse(q.postData() || "{}"); n = Array.isArray(c.imagenes_base64) ? c.imagenes_base64.length : 0; } catch { n = null; }
      // pasado el cupo de la noche no sale ni una imagen más: la página la da por no leída (400 no se reintenta)
      if (!cabenEnElCupo(imagenes, n, topeImagenes)) {
        negadas++;
        return route.fulfill({ status: 400, headers: { "content-type": "application/json" }, body: JSON.stringify({ ok: false, error: "Se acabó el cupo de reconocimiento de texto de esta lectura." }) });
      }
      imagenes += n; ocrPedidos++;
      const res = await fetch(`${APP}/api/pliego?op=extraer-texto`, { method: "POST", headers: { "content-type": "application/json", ...cabeceras() }, body: q.postData() });
      return route.fulfill({ status: res.status, headers: { "content-type": res.headers.get("content-type") || "application/json" }, body: Buffer.from(await res.arrayBuffer()) });
    }
    return route.fallback();
  });
  const pag = await ctx.newPage();
  const errores = [];
  pag.on("pageerror", (e) => errores.push(e.message));
  await pag.goto(`${origen}/index.html`, { waitUntil: "load", timeout: 90000 });
  await pag.waitForFunction(() => typeof window.__pliegoLeerPdfMixto === "function", null, { timeout: 60000 });
  const leer = (bytes) => pag.evaluate(async (b64) => {
    const bin = atob(b64); const u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
    const r = await window.__pliegoLeerPdfMixto(u);
    return { texto: r.texto, paginas: r.paginas, paginas_con_imagen: r.paginas_con_imagen, paginas_ocr: r.paginas_ocr, sin_ocr: r.sin_ocr || [], nota: r.nota || null };
  }, Buffer.from(bytes).toString("base64"));
  return { leer, errores, ocrPedidos: () => ocrPedidos, imagenes: () => imagenes, negadas: () => negadas, cerrar: () => nav.close() };
}

async function bajar(url) {
  const partes = []; let desde = 0;
  for (let k = 0; k < 60; k++) {
    const d = (await pedir("/api/pliego?op=descargar", { method: "POST", body: { url, desde } })).j;
    if (!d || !d.ok) throw new Error(`descarga: ${JSON.stringify(d).slice(0, 200)}`);
    const b = Buffer.from(d.base64 || "", "base64"); partes.push(b); desde += b.length;
    if (d.completo) return Buffer.concat(partes);
    if (!b.length) throw new Error("el documento no terminó de llegar");
  }
  throw new Error("el documento no terminó de llegar en 60 trozos");
}

async function entidadesDeMisProcesos(perfil) {
  const r = await pedir(`/api/perfil?op=seguimiento&perfil=${encodeURIComponent(perfil)}`);
  if (baseCaida(r)) return { caida: true };
  if (!r.j || !Array.isArray(r.j.procesos)) throw new Error(`Mis procesos de «${perfil}»: ${r.status} ${JSON.stringify(r.j || r.texto).slice(0, 160)}`);
  const vistas = new Map();
  for (const p of r.j.procesos) {
    const q = p && p.proceso;
    const entidad = q && String(q.entidad || "").trim(), nit = q && String(q.nit_entidad || "").trim();
    if (entidad && !vistas.has(`${entidad}|${nit}`)) vistas.set(`${entidad}|${nit}`, { entidad, nit: nit || null });
  }
  return { lista: [...vistas.values()] };
}

async function principal() {
  const a = argumentos(process.argv.slice(2));
  const srv = await servirPublic();
  const origen = `http://127.0.0.1:${srv.address().port}`;
  const tope = a.maxOcr + 30;   // pasado el cupo se termina el documento en curso, con su propio tope de 30, y nada más
  const resumen = { intentados: 0, leidos: 0, guardados: 0, imagenes_ocr: 0, envios_negados: 0, paginas_ocr: 0, con_paginas_sin_leer: 0, entidades: 0, fallos: 0, base_caida: false };
  let lector = null, codigo = 0;
  const imagenes = () => (lector ? lector.imagenes() : 0);
  const pararPorBase = (motivo) => { resumen.base_caida = true; codigo = 3; console.log(`La base de datos no responde (${String(motivo || "").slice(0, 160)}): se para aquí.`); };
  try {
    if (a.probarUrl || a.probarArchivo) {
      // la prueba usa el cupo tal cual (sin el margen del documento en curso): con «--max-ocr 0» se ve el corte sin gastar OCR
      lector = await abrirLector(origen, { topeImagenes: a.maxOcr });
      const leido = await lector.leer(a.probarArchivo ? fs.readFileSync(a.probarArchivo) : await bajar(a.probarUrl));
      resumen.intentados = 1; resumen.leidos = leido.texto ? 1 : 0; resumen.paginas_ocr = leido.paginas_ocr || 0; resumen.con_paginas_sin_leer = leido.sin_ocr.length ? 1 : 0;
      console.log("  ", JSON.stringify({ estado: "leido_sin_guardar", paginas: leido.paginas, con_imagen: leido.paginas_con_imagen, ocr: leido.paginas_ocr, sin_leer: leido.sin_ocr.length, caracteres: String(leido.texto || "").length, nota: leido.nota, ocr_pedidos: lector.ocrPedidos(), imagenes: lector.imagenes(), negadas: lector.negadas() }));
      console.log("   inicio del texto:", JSON.stringify(String(leido.texto || "").replace(/\s+/g, " ").slice(0, 240)));
    } else {
      /* sin base de datos no hay dónde guardar el texto: no se gasta ni una imagen de OCR. La salud prueba también que
         la base ACEPTE escrituras (una base llena lee y no escribe: el 28-30 sep pasó) */
      const salud = await pedir("/api/procesos?op=salud&escritura=1");
      if (llaveRechazada(salud)) { codigo = 1; console.log(`FALLO: la aplicación rechazó la llave (${salud.status}).`); return; }
      if (baseCaida(salud)) { pararPorBase(salud.j.error); return; }
      if (salud.j && salud.j.escritura && salud.j.escritura.acepta === false) { pararPorBase(`no acepta escrituras: ${salud.j.escritura.motivo || ""}`); return; }
      let entidades = a.entidades.map((e) => { const [entidad, nit] = String(e).split("|"); return { entidad: entidad.trim(), nit: (nit || "").trim() || null }; });
      if (!entidades.length) {
        const m = await entidadesDeMisProcesos(a.perfil);
        if (m.caida) { pararPorBase("Mis procesos"); return; }
        entidades = m.lista;
      }
      resumen.entidades = entidades.length;
      console.log(`== ${entidades.length} entidades · cupo: ${a.maxDocs} documentos, ${a.maxOcr} imágenes de OCR (tope duro ${tope}), ${a.porEntidad} por entidad`);
      const vistos = new Set();
      for (const { entidad, nit } of entidades) {
        if (resumen.intentados >= a.maxDocs || imagenes() >= a.maxOcr) break;
        const qs = `entidad=${encodeURIComponent(entidad)}${nit ? `&nit=${encodeURIComponent(nit)}` : ""}`;
        const ev = await pedir(`/api/pliego?op=evaluacion&${qs}`);
        if (llaveRechazada(ev)) { codigo = 1; console.log(`FALLO: la aplicación rechazó la llave (${ev.status}).`); break; }
        if (baseCaida(ev)) { pararPorBase(ev.j.detalle || ev.j.error); break; }
        let procesos;
        try { procesos = await procesosDeLaEntidad(entidad, nit); }
        catch (e) { resumen.fallos++; console.log(`== ${entidad}: datos.gov.co no respondió (${String((e && e.message) || e).slice(0, 120)})`); continue; }
        if (!ev.j || !ev.j.ok) { resumen.fallos++; console.log(`== ${entidad}: no se pudo consultar lo ya leído (${ev.status})`); continue; }
        const ya = new Set(Object.values(ev.j.procesos || {}).filter((p) => p && p.estado !== "caducado").map((p) => p.id_proceso).filter(Boolean));
        const utiles = procesos.filter(util);
        const cola = utiles.filter((p) => !ya.has(p.id) && !vistos.has(p.id)).slice(0, a.porEntidad);
        console.log(`== ${entidad}${nit ? ` (${nit})` : ""}: ${procesos.length} adjudicados desde 2025, ${utiles.length} útiles para la regla del precio, ${ya.size} ya leídos; se intentan ${cola.length}`);
        for (const p of cola) {
          if (resumen.intentados >= a.maxDocs || imagenes() >= a.maxOcr) break;
          vistos.add(p.id);
          resumen.intentados++;
          const t0 = Date.now();
          let r;
          try {
            const doc = await pedir(`/api/pliego?op=evaluacion&documento=1&id_proceso=${encodeURIComponent(p.id)}`);
            if (baseCaida(doc)) { pararPorBase(doc.j.detalle || doc.j.error); r = { id: p.id, estado: "base_caida" }; }
            else if (!doc.j || !doc.j.ok) { resumen.fallos++; r = { id: p.id, estado: "fallo", error: `documento: ${doc.status} ${JSON.stringify(doc.j || doc.texto).slice(0, 160)}` }; }
            else if (!doc.j.documento) r = { id: p.id, estado: "sin_documento", motivo: doc.j.motivo || null };
            else if (doc.j.ya_leido) r = { id: p.id, estado: doc.j.en_cola ? "ya_en_cola" : "ya_leido" };
            else {
              lector = lector || await abrirLector(origen, { topeImagenes: tope });
              const leido = await lector.leer(await bajar(doc.j.documento.url));
              resumen.leidos++; resumen.paginas_ocr += leido.paginas_ocr || 0; if (leido.sin_ocr.length) resumen.con_paginas_sin_leer++;
              const g = await pedir("/api/pliego?op=evaluacion", { method: "POST", body: { id_proceso: p.id, portafolio: doc.j.portafolio, entidad, nit, documento: doc.j.documento, texto: leido.texto, paginas_ocr: leido.paginas_ocr, paginas_sin_leer: leido.sin_ocr } });
              if (g.j && g.j.ok) resumen.guardados++;
              else if (baseCaida(g) || g.status === 503) pararPorBase((g.j && (g.j.detalle || g.j.error)) || g.status);
              else resumen.fallos++;
              r = { id: p.id, estado: g.j && g.j.ok ? "leido" : "fallo_al_guardar", http: g.status, nombre: doc.j.documento.nombre, paginas: leido.paginas, ocr: leido.paginas_ocr, sin_leer: leido.sin_ocr.length, nota: leido.nota, error: g.j && !g.j.ok ? String(g.j.error || "").slice(0, 160) : undefined };
            }
          } catch (e) { resumen.fallos++; r = { id: p.id, estado: "fallo", error: String((e && e.message) || e).slice(0, 200) }; }
          r.segundos = Math.round((Date.now() - t0) / 1000); r.modalidad = p.modalidad; r.ofertas = p.numero_ofertas;
          console.log("  ", JSON.stringify(r));
          if (resumen.base_caida) break;
        }
        if (resumen.base_caida || codigo === 1) break;
      }
    }
  } catch (e) { codigo = 1; console.log("FALLO:", String((e && e.message) || e).slice(0, 300)); }
  finally {
    if (lector) {
      resumen.imagenes_ocr = lector.imagenes(); resumen.envios_negados = lector.negadas();
      if (lector.errores.length) console.log("errores de la página:", lector.errores.join(" | ").slice(0, 300));
      await lector.cerrar();
    }
    srv.close();
    console.log("RESUMEN", JSON.stringify(resumen));
    process.exitCode = codigo;
  }
}

module.exports = { argumentos, util, reenviarAProduccion, servirPublic, baseCaida, llaveRechazada, cabenEnElCupo, candidatosDe, procesosDeLaEntidad };
if (require.main === module) principal().catch((e) => { console.log("FALLO:", String((e && e.message) || e).slice(0, 300)); console.log("RESUMEN", JSON.stringify({ fallo: true })); process.exitCode = 1; });
