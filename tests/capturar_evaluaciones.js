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
   OCR.SPACE SATURADO (3-nov-2026): la noche del 3-nov, 7 de 8 documentos se guardaron sin su OCR («saturado») y, como
   el lector da por leído todo lo guardado, no se iban a releer nunca. Ahora (`faltaOcrPasajero`): un documento que se
   quedó sin OCR por una falla pasajera (saturado, en pausa, sin cupo esta noche o la red) no se da por terminado.
     · En la MISMA noche: al saturarse, el OCR se pausa `PAUSA_OCR_MS`; lo que necesita OCR en ese lapso se aparta y
       se vuelve a leer al final, cuando la pausa terminó.
     · En OTRA noche: si tampoco entonces, el texto se guarda con `ocr_pendiente` (la interpretación usa lo que trae
       la capa) y el proceso se vuelve a leer las noches siguientes, hasta `MAX_INTENTOS_OCR` veces.
   Uso:
     node tests/capturar_evaluaciones.js [--perfil helder] [--max-docs 8] [--max-ocr 120] [--por-entidad 3] [--max-consultas 40]
       [--consultas-por-entidad 8] ["ENTIDAD|NIT" ...]
     node tests/capturar_evaluaciones.js --probar-url <url del PDF> | --probar-archivo <ruta>   (lee uno y NO guarda nada)
   Sin entidades, las de los procesos de «Mis procesos» del perfil. Necesita HISTORICO_TOKEN y, con el muro de Vercel,
   VERCEL_AUTOMATION_BYPASS_SECRET. Termina con una línea «RESUMEN {json}». Código de salida: 0 hecho (aunque no haya
   nada nuevo), 3 la base de datos no responde (no se lee nada: el texto no tendría dónde guardarse), 1 otro fallo. */
const http = require("http"), fs = require("fs"), path = require("path");
const { oferentesDe, primeraFecha } = require("../lib/indice_competencia.js");
const { crearCliente, escSoQL } = require("../lib/socrata.js");

const APP = "https://detekta-app.vercel.app";
const PAUSA_OCR_MS = 10 * 60e3;   // tras un documento con el OCR saturado, cuánto se deja de mandar imágenes
const MAX_INTENTOS_OCR = 3;       // lecturas EN TOTAL de un documento al que le faltó OCR por una falla pasajera: la primera y dos relecturas
const PUBLIC = path.join(__dirname, "..", "public");
const TIPOS = { ".html": "text/html; charset=utf-8", ".js": "application/javascript; charset=utf-8", ".css": "text/css", ".json": "application/json", ".csv": "text/csv", ".svg": "image/svg+xml", ".png": "image/png", ".ico": "image/x-icon" };
/* lo que sirve para la regla del precio (la misma de la ventana de la entidad: licitación o menor cuantía con 3 o más
   ofertas), cerrado desde 2025 (`dmgg-8hin` solo trae archivos cargados desde esa fecha) */
const util = (p) => /^CO1\.(REQ|PPI|NTC)\./.test(String(p.id || "")) && String(p.fecha_adjudicacion || "") >= "2025-01-01"
  && /licitaci|menor cuant/i.test(String(p.modalidad || "")) && Number(p.numero_ofertas) >= 3;

function argumentos(argv) {
  const a = { perfil: "helder", maxDocs: 8, maxOcr: 120, porEntidad: 3, maxConsultas: 40, consultasPorEntidad: 8, entidades: [], probarUrl: null, probarArchivo: null };
  for (let i = 0; i < argv.length; i++) {
    const x = argv[i], sig = () => argv[++i];
    if (x === "--perfil") a.perfil = String(sig() || "");
    else if (x === "--max-docs") a.maxDocs = Number(sig());
    else if (x === "--max-ocr") a.maxOcr = Number(sig());
    else if (x === "--por-entidad") a.porEntidad = Number(sig());
    else if (x === "--max-consultas") a.maxConsultas = Number(sig());
    else if (x === "--consultas-por-entidad") a.consultasPorEntidad = Number(sig());
    else if (x === "--probar-url") a.probarUrl = String(sig() || "");
    else if (x === "--probar-archivo") a.probarArchivo = String(sig() || "");
    else a.entidades.push(x);
  }
  for (const [k, bandera] of [["maxDocs", "--max-docs"], ["maxOcr", "--max-ocr"], ["porEntidad", "--por-entidad"], ["maxConsultas", "--max-consultas"], ["consultasPorEntidad", "--consultas-por-entidad"]]) if (!Number.isInteger(a[k]) || a[k] < 0) throw new Error(`${bandera} debe ser un entero de 0 en adelante`);
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
/* ¿A este documento le faltó OCR por una falla PASAJERA? Páginas sin leer y, durante su lectura, el servicio saturado,
   el OCR en pausa, el cupo de la noche agotado, o la página dijo por qué (`nota`: la red, «no respondió», saturado).
   Las páginas que no caben en el cupo POR DOCUMENTO (la página las deja sin `nota`) no son pasajeras: releerlo daría lo
   mismo. */
const faltaOcrPasajero = (leido, { saturo = false, aplazo = false, nego = false } = {}) =>
  !!(leido && Array.isArray(leido.sin_ocr) && leido.sin_ocr.length > 0 && (saturo || aplazo || nego || leido.nota != null));
/* Lo que la aplicación ya tiene de la entidad (`op=evaluacion&entidad=`, `procesos`), en dos: `ya` (no se vuelve a leer)
   y `releer` (id → intentos): los guardados con `ocr_pendiente` que no agotaron sus intentos. Un texto caducado (30 días
   sin interpretarse) es un proceso por leer, como antes. */
function yaYReleer(procesosApp, maxIntentos = MAX_INTENTOS_OCR) {
  const ya = new Set(), releer = new Map();
  for (const e of Object.values(procesosApp || {})) {
    if (!e || e.estado === "caducado" || !e.id_proceso) continue;
    const intentos = Number.isInteger(e.intentos_ocr) && e.intentos_ocr > 0 ? e.intentos_ocr : 1;
    if (e.ocr_pendiente === true && intentos < maxIntentos) releer.set(e.id_proceso, intentos);
    else ya.add(e.id_proceso);
  }
  for (const id of releer.keys()) ya.delete(id);   // dos portafolios del mismo proceso: manda el que falta releer
  return { ya, releer };
}
/* Filas de p6dx-8zbt → procesos con las reglas de la aplicación; una fila por proceso (la primera con número de
   ofertas), los más recientes primero */
function candidatosDe(filas) {
  const por = new Map();
  for (const f of Array.isArray(filas) ? filas : []) {
    const id = String((f && f.id_del_proceso) || "").trim();
    if (!id) continue;
    const p = { id, portafolio: String((f && f.id_del_portafolio) || "").trim() || null, modalidad: f.modalidad_de_contratacion || null, fecha_adjudicacion: primeraFecha(f), numero_ofertas: oferentesDe(f) };
    const ya = por.get(id);
    if (!ya || (ya.numero_ofertas == null && p.numero_ofertas != null)) por.set(id, p);
  }
  return [...por.values()].sort((x, y) => String(y.fecha_adjudicacion || "").localeCompare(String(x.fecha_adjudicacion || "")));
}
async function procesosDeLaEntidad(entidad, nit) {
  const donde = nit ? `starts_with(nit_entidad, '${escSoQL(String(nit).replace(/\D/g, ""))}')` : `entidad = '${escSoQL(entidad)}'`;
  const filas = await crearCliente({ baseUrl: process.env.SECOP_BASE_URL || "https://www.datos.gov.co/resource/p6dx-8zbt.json" }).pedir({
    "$select": "id_del_proceso,id_del_portafolio,modalidad_de_contratacion,fecha_adjudicacion,adjudicado,respuestas_al_procedimiento,proveedores_unicos_con,conteo_de_respuestas_a_ofertas,respuestas_externas",
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

/* LO QUE SALE AL OCR, en una pieza aparte para que la suite la ejecute sin navegador: el cupo de la noche, la pausa
   tras un documento con el servicio saturado y las cuentas. `reenviar(cuerpo)` lo manda a producción y devuelve
   {status, contentType, body}. */
function crearGuardiaOcr({ topeImagenes = Infinity, reenviar, ahora = () => Date.now() }) {
  const estado = { ocrPedidos: 0, imagenes: 0, negadas: 0, saturaciones: 0, aplazadas: 0, pausaHasta: 0 };
  const negar = (error) => ({ status: 400, contentType: "application/json", body: Buffer.from(JSON.stringify({ ok: false, error })) });
  const atender = async (cuerpo) => {
    /* en pausa (el servicio estaba saturado) no sale ninguna imagen: la página la da por no leída (400, sin reintento)
       y el documento se aparta o se relee otra noche. No gasta el cupo de OCR.space: cada tanda saturada cuesta hasta
       nueve solicitudes (tres intentos de la página por tres reintentos del servidor) */
    if (ahora() < estado.pausaHasta) { estado.aplazadas++; return negar("El reconocimiento de texto está en pausa en esta lectura: el servicio estaba saturado."); }
    let n = null;
    try { const c = JSON.parse(cuerpo || "{}"); n = Array.isArray(c.imagenes_base64) ? c.imagenes_base64.length : 0; } catch { n = null; }
    // pasado el cupo de la noche no sale ni una imagen más: la página la da por no leída (400 no se reintenta)
    if (!cabenEnElCupo(estado.imagenes, n, topeImagenes)) { estado.negadas++; return negar("Se acabó el cupo de reconocimiento de texto de esta lectura."); }
    estado.imagenes += n; estado.ocrPedidos++;
    const r = await reenviar(cuerpo);
    // la misma señal que mira la página (`cuerpo.ocr.saturado`, lib/apu_ocr.esSaturacion)
    try { const j = JSON.parse(Buffer.from(r.body).toString("utf8")); if (j && j.ocr && j.ocr.saturado === true) estado.saturaciones++; } catch { /* no es JSON: no es la señal */ }
    return r;
  };
  return { atender, estado, pausar: (ms) => { estado.pausaHasta = Math.max(estado.pausaHasta, ahora() + ms); } };
}
/* ¿Qué se hace con un documento leído? «aplazar» (primera vuelta, se quedó sin OCR porque el servicio estaba saturado o
   en pausa: se vuelve a leer al final), «guardar_pendiente» (le faltó OCR por una falla pasajera: se guarda y otra noche
   se relee) o «guardar». */
function queHacerConLaLectura(leido, senales, aplazable) {
  const pendiente = faltaOcrPasajero(leido, senales);
  if (pendiente && aplazable && (senales.saturo || senales.aplazo)) return "aplazar";
  return pendiente ? "guardar_pendiente" : "guardar";
}

async function abrirLector(origen, { topeImagenes = Infinity } = {}) {
  let chromium;
  try { ({ chromium } = require("playwright")); } catch { ({ chromium } = require("/opt/node22/lib/node_modules/playwright")); }
  const nav = await chromium.launch(process.env.HTTPS_PROXY ? { proxy: { server: process.env.HTTPS_PROXY, bypass: "127.0.0.1,localhost" } } : {});
  const ctx = await nav.newContext();
  const guardia = crearGuardiaOcr({ topeImagenes, reenviar: async (cuerpo) => {
    const res = await fetch(`${APP}/api/pliego?op=extraer-texto`, { method: "POST", headers: { "content-type": "application/json", ...cabeceras() }, body: cuerpo });
    return { status: res.status, contentType: res.headers.get("content-type") || "application/json", body: Buffer.from(await res.arrayBuffer()) };
  } });
  await ctx.route(`${origen}/api/**`, async (route) => {
    const q = route.request();
    if (reenviarAProduccion(q.method(), q.url())) {
      const r = await guardia.atender(q.postData());
      return route.fulfill({ status: r.status, headers: { "content-type": r.contentType }, body: r.body });
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
  const e = guardia.estado;
  return { leer, errores, ocrPedidos: () => e.ocrPedidos, imagenes: () => e.imagenes, negadas: () => e.negadas, saturaciones: () => e.saturaciones, aplazadas: () => e.aplazadas,
    pausarOcr: guardia.pausar, pausaHasta: () => e.pausaHasta, cerrar: () => nav.close() };
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

/* Las entidades de una respuesta de Mis procesos, en las dos formas: la vista ligera (`solo=entidades`, 1-nov-2026),
   que sale de la foto guardada de cada proceso sin leer el corpus del año, y la lista entera de siempre (lo que
   responde un servidor que no conoce la vista ligera: un `solo` desconocido es inerte). `incompleta`: la vista
   ligera no trae la entidad de algún proceso guardado (o no dice cuántos), y hay que pedir la lista entera. */
function entidadesDeRespuesta(j) {
  if (!j || typeof j !== "object") return null;
  const vistas = new Map();
  const sumar = (entidad, nit) => { if (entidad && !vistas.has(`${entidad}|${nit}`)) vistas.set(`${entidad}|${nit}`, { entidad, nit: nit || null }); };
  if (Array.isArray(j.entidades)) {
    for (const e of j.entidades) sumar(e && String(e.entidad || "").trim(), e && String(e.nit || "").trim());
    return { lista: [...vistas.values()], incompleta: j.sin_foto !== 0 };
  }
  if (!Array.isArray(j.procesos)) return null;
  for (const p of j.procesos) {
    const q = p && p.proceso;
    sumar(q && String(q.entidad || "").trim(), q && String(q.nit_entidad || "").trim());
  }
  return { lista: [...vistas.values()], incompleta: false };
}
async function entidadesDeMisProcesos(perfil, { pedirA = pedir } = {}) {
  const ruta = `/api/perfil?op=seguimiento&perfil=${encodeURIComponent(perfil)}`;
  let r = await pedirA(`${ruta}&solo=entidades`);
  if (baseCaida(r)) return { caida: true };
  let e = r.status === 200 ? entidadesDeRespuesta(r.j) : null;
  if (e && e.incompleta) {
    r = await pedirA(ruta);
    if (baseCaida(r)) return { caida: true };
    e = r.status === 200 ? entidadesDeRespuesta(r.j) : null;
  }
  if (!e || e.incompleta) throw new Error(`Mis procesos de «${perfil}»: ${r.status} ${JSON.stringify(r.j || r.texto).slice(0, 160)}`);
  return { lista: e.lista };
}

/* LA COLA DE UNA ENTIDAD (2-nov-2026). El cupo de documentos (`maxDocs` por noche, `porEntidad` por entidad) cuenta
   los documentos que de verdad se bajan y se leen. Un proceso cuya entidad todavía no publicó la evaluación
   («sin_documento») o que ya estaba leído no lo gasta: se pasa al siguiente, y otra noche se vuelve a mirar, porque
   la entidad lo puede publicar después. `maxConsultas` acota cuánto se le pregunta a datos.gov.co en una noche, y
   `consultasPorEntidad` cuánto se le dedica a una sola: sin él, una entidad con 45 procesos sin documento se gastaba
   las 40 consultas y las de atrás no se miraban nunca (revisión adversaria, 2-nov-2026, reproducido: 0 leídos).
   La primera noche que corrió sola (2-nov-2026) gastó 6 de sus 8 intentos en procesos de Cartagena y Montería sin
   documento; esas entidades van primeras en Mis procesos, así que se habría repetido cada noche.
   `consultar(p)` pide op=evaluacion&documento=1; `leerYGuardar(p, doc)` baja, lee y guarda, y devuelve la fila. */
/* lo que queda por mirar de una entidad: lo útil para el precio que no se leyó ni se miró esta noche, ENTERO (el
   cupo por entidad cuenta documentos leídos, no candidatos: lo aplica `recorrerCola`) */
/* SUS OFERTAS PERDIDAS PRIMERO (decisión del dueño, 12-nov-2026: «leer los informes de sus ofertas perdidas»): un proceso donde
   él ofertó y ganó otro entra aunque no sirva para la regla del precio (Natagaima, MC-001-2025, tuvo 2 ofertas) y va delante */
const colaDeLaEntidad = (procesos, ya, vistos, propios = new Set()) => procesos
  .filter((p) => (propios.has(p.portafolio) || util(p)) && !ya.has(p.id) && !vistos.has(p.id))
  .sort((x, y) => (propios.has(y.portafolio) ? 1 : 0) - (propios.has(x.portafolio) ? 1 : 0));
/* Las ofertas perdidas del perfil sin causa todavía (op=ofertas-propias, PLAN_X20 tanda 13): sus entidades y sus portafolios.
   Una respuesta que no sirve deja la lista vacía: la madrugada sigue con Mis procesos, como antes. */
function perdidasDeRespuesta(j) {
  const ofs = j && j.ok && Array.isArray(j.ofertas) ? j.ofertas : [];
  const sinCausa = ofs.filter((o) => o && o.resultado === "otro" && !(o.causa && o.causa.frase) && /^CO1\.BDOS\.\d+$/.test(String(o.id_portafolio || "")));
  const entidades = new Map();
  for (const o of sinCausa) { const k = String(o.nit_entidad || o.entidad || ""); if (k && !entidades.has(k)) entidades.set(k, { entidad: String(o.entidad || "").trim(), nit: o.nit_entidad || null }); }
  return { entidades: [...entidades.values()].filter((e) => e.entidad), portafolios: new Set(sinCausa.map((o) => o.id_portafolio)) };
}
async function recorrerCola(cola, { a, resumen, imagenes, consultar, leerYGuardar, pararPorBase, vistos, releer = new Map(), anotar = () => {} }) {
  let deLaEntidad = 0, consultasDeLaEntidad = 0;
  for (const p of cola) {
    if (deLaEntidad >= a.porEntidad || consultasDeLaEntidad >= a.consultasPorEntidad || resumen.intentados >= a.maxDocs || imagenes() >= a.maxOcr || resumen.consultados >= a.maxConsultas || resumen.base_caida) break;
    vistos.add(p.id);
    resumen.consultados++; consultasDeLaEntidad++;
    const t0 = Date.now();
    let r;
    try {
      const doc = await consultar(p);
      if (baseCaida(doc)) { pararPorBase(doc.j.detalle || doc.j.error); r = { id: p.id, estado: "base_caida" }; }
      else if (!doc.j || !doc.j.ok) { resumen.fallos++; r = { id: p.id, estado: "fallo", error: `documento: ${doc.status} ${JSON.stringify(doc.j || doc.texto).slice(0, 160)}` }; }
      else if (!doc.j.documento) { resumen.sin_documento++; r = { id: p.id, estado: "sin_documento", motivo: doc.j.motivo || null }; }
      // uno guardado sin su OCR (`ocr_pendiente`) se vuelve a leer aunque la aplicación lo tenga: es a lo que se vino
      else if (doc.j.ya_leido && !releer.has(p.id)) r = { id: p.id, estado: doc.j.en_cola ? "ya_en_cola" : "ya_leido" };
      else {
        resumen.intentados++; deLaEntidad++;
        r = await leerYGuardar(p, doc);
      }
    } catch (e) { resumen.fallos++; r = { id: p.id, estado: "fallo", error: String((e && e.message) || e).slice(0, 200) }; }
    r.segundos = Math.round((Date.now() - t0) / 1000); r.modalidad = p.modalidad; r.ofertas = p.numero_ofertas;
    anotar(r);
  }
}

/* EL FLUJO DE CADA DOCUMENTO (3-nov-2026), fuera de `principal()` para que la suite lo ejecute con un lector y una
   aplicación simulados: leer y guardar, apartar lo saturado, la segunda vuelta y las relecturas. `obtenerLector()` abre
   (o devuelve) el lector; `pedirApp` y `bajarDoc` son `pedir` y `bajar`; `esperar(ms)` duerme. */
function crearFlujo({ a, resumen, obtenerLector, pedirApp, bajarDoc, pararPorBase, esperar = (ms) => new Promise((r) => setTimeout(r, ms)), anotar = () => {}, ahora = () => Date.now() }) {
  const releerTodo = new Map(), aplazados = [];
  /* leer un documento ya bajado y guardarlo, o apartarlo para el final si se quedó sin OCR porque el servicio estaba
     saturado (`aplazable`: solo en la primera vuelta) */
  const leerUno = async (p, doc, bytes, { entidad, nit, aplazable }) => {
    const lector = await obtenerLector();
    const s0 = lector.saturaciones(), z0 = lector.aplazadas(), n0 = lector.negadas();
    const leido = await lector.leer(bytes);
    const saturo = lector.saturaciones() > s0, aplazo = lector.aplazadas() > z0, nego = lector.negadas() > n0;
    if (saturo) lector.pausarOcr(PAUSA_OCR_MS);
    const decision = queHacerConLaLectura(leido, { saturo, aplazo, nego }, aplazable), pendiente = decision === "guardar_pendiente";
    if (decision === "aplazar") {
      aplazados.push({ p, doc, bytes, entidad, nit }); resumen.aplazados++;
      return { id: p.id, estado: "aplazado", nombre: doc.j.documento.nombre, paginas: leido.paginas, sin_leer: leido.sin_ocr.length, nota: leido.nota };
    }
    resumen.leidos++; resumen.paginas_ocr += leido.paginas_ocr || 0; if (leido.sin_ocr.length) resumen.con_paginas_sin_leer++;
    const g = await guardarTexto(p, doc, { entidad, nit, leido, pendiente });
    const ok = !!(g.j && g.j.ok), sinMejora = ok && g.j.estado === "sin_mejora";
    if (ok && !sinMejora) resumen.guardados++;
    if (sinMejora) resumen.relecturas_sin_mejora++;
    else if (ok && releerTodo.has(p.id)) resumen.releidos++;
    if (ok && (sinMejora ? g.j.ocr_pendiente === true : pendiente)) resumen.ocr_pendiente++;
    if (!ok && (baseCaida(g) || g.status === 503)) pararPorBase((g.j && (g.j.detalle || g.j.error)) || g.status);
    else if (!ok) resumen.fallos++;
    return { id: p.id, estado: !ok ? "fallo_al_guardar" : sinMejora ? "relectura_sin_mejora" : "leido", http: g.status, nombre: doc.j.documento.nombre, paginas: leido.paginas, ocr: leido.paginas_ocr, sin_leer: leido.sin_ocr.length, nota: leido.nota,
      ...(pendiente ? { ocr_pendiente: (releerTodo.get(p.id) || 0) + 1 } : {}), error: !ok ? String((g.j && g.j.error) || "").slice(0, 160) : undefined };
  };
  /* EL TEXTO A LA APLICACIÓN. Una RELECTURA (un proceso de `releer`) va marcada: la aplicación solo cambia el texto
     guardado si el nuevo tiene menos páginas sin leer y, si no, se queda con el que tenía y anota el intento. Así
     una relectura que no mejora no pisa lo bueno, y una que falla (descarga caída, nada legible) también cuenta, y
     el proceso no se relee para siempre (revisión adversaria, 3-nov-2026) */
  const guardarTexto = (p, doc, { entidad, nit, leido, pendiente }) => {
    const relectura = releerTodo.has(p.id), intento = (releerTodo.get(p.id) || 0) + 1;
    return pedirApp("/api/pliego?op=evaluacion", { method: "POST", body: { id_proceso: p.id, portafolio: doc.j.portafolio, entidad, nit, documento: doc.j.documento, modalidad: p.modalidad || null,
      texto: leido ? leido.texto : "", paginas_ocr: leido ? leido.paginas_ocr : 0, paginas_sin_leer: leido ? leido.sin_ocr : [],
      ...(pendiente ? { ocr_pendiente: true } : {}), ...(pendiente || relectura ? { intento_ocr: intento } : {}), ...(relectura ? { relectura: true } : {}) } });
  };
  // una relectura que no se pudo hacer también se anota (sin texto: la aplicación conserva el que tenía)
  const anotarRelecturaFallida = async (p, doc, entidad, nit) => {
    if (!releerTodo.has(p.id)) return;
    try { await guardarTexto(p, doc, { entidad, nit, leido: null, pendiente: false }); } catch { /* sin red tampoco se anota: la próxima vuelve a intentar */ }
  };
  const leerYGuardarDe = (entidad, nit) => async (p, doc) => {
    let bytes;
    try { bytes = await bajarDoc(doc.j.documento.url); } catch (e) { await anotarRelecturaFallida(p, doc, entidad, nit); throw e; }
    /* si la lectura misma falla (la página se cae, se agota el tiempo), una relectura también anota su intento (segunda
       revisión adversaria: si no, se releía todas las noches) */
    try { return await leerUno(p, doc, bytes, { entidad, nit, aplazable: true }); } catch (e) { await anotarRelecturaFallida(p, doc, entidad, nit); throw e; }
  };
  /* LA SEGUNDA VUELTA: lo apartado por el OCR saturado se vuelve a leer cuando la pausa terminó. Si satura otra vez, se
     guarda con `ocr_pendiente` y otra noche lo relee. El cupo blando de la noche también manda aquí (revisión adversaria):
     pasadas `maxOcr` imágenes no se empieza otro; lo que no se alcanza no se guardó y vuelve a ser candidato, y una
     relectura anota su intento */
  const segundaVuelta = async () => {
    if (!aplazados.length || resumen.base_caida) return;
    const lector = await obtenerLector();
    const espera = Math.max(0, lector.pausaHasta() - ahora());
    anotar(`== ${aplazados.length} documentos apartados porque el OCR estaba saturado: se vuelven a leer en ${Math.ceil(espera / 60e3)} min`);
    if (espera) await esperar(espera);
    for (const x of aplazados) {
      if (lector.imagenes() >= a.maxOcr) { anotar({ id: x.p.id, estado: "sin_cupo_en_la_segunda_vuelta", vuelta: 2 }); await anotarRelecturaFallida(x.p, x.doc, x.entidad, x.nit); continue; }
      const t0 = ahora();
      let r;
      try { r = await leerUno(x.p, x.doc, x.bytes, { entidad: x.entidad, nit: x.nit, aplazable: false }); }
      catch (e) { resumen.fallos++; await anotarRelecturaFallida(x.p, x.doc, x.entidad, x.nit); r = { id: x.p.id, estado: "fallo", error: String((e && e.message) || e).slice(0, 200) }; }
      r.segundos = Math.round((ahora() - t0) / 1000); r.vuelta = 2;
      anotar(r);
      if (resumen.base_caida) break;
    }
  };
  return { releerTodo, aplazados, leerUno, leerYGuardarDe, segundaVuelta };
}

async function principal() {
  const a = argumentos(process.argv.slice(2));
  const srv = await servirPublic();
  const origen = `http://127.0.0.1:${srv.address().port}`;
  const tope = a.maxOcr + 30;   // pasado el cupo se termina el documento en curso, con su propio tope de 30, y nada más
  const resumen = { intentados: 0, consultados: 0, sin_documento: 0, leidos: 0, guardados: 0, imagenes_ocr: 0, envios_negados: 0, paginas_ocr: 0, con_paginas_sin_leer: 0,
    respuestas_saturadas: 0, aplazados: 0, ocr_pendiente: 0, releidos: 0, relecturas_sin_mejora: 0, entidades: 0, fallos: 0, base_caida: false };
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
      // sus ofertas perdidas: sus portafolios entran a la cola aunque no sirvan para la regla del precio, y sus entidades van primero
      let propios = new Set();
      try {
        const op = await pedir(`/api/perfil?op=ofertas-propias&perfil=${encodeURIComponent(a.perfil)}`);
        const pd = op.status === 200 ? perdidasDeRespuesta(op.j) : { entidades: [], portafolios: new Set() };
        propios = pd.portafolios;
        if (!entidades.length) entidades = pd.entidades;
        if (pd.portafolios.size) console.log(`== ${pd.portafolios.size} ofertas suyas perdidas sin causa todavía, en ${pd.entidades.length} entidades`);
      } catch (e) { console.log(`== sus ofertas no se pudieron consultar (${String((e && e.message) || e).slice(0, 120)}): sigue con Mis procesos`); }
      if (!a.entidades.length) {
        const m = await entidadesDeMisProcesos(a.perfil);
        if (m.caida) { pararPorBase("Mis procesos"); return; }
        const ya = new Set(entidades.map((e) => `${e.nit || ""}|${e.entidad}`));
        entidades = [...entidades, ...m.lista.filter((e) => !ya.has(`${e.nit || ""}|${e.entidad}`))];
      }
      resumen.entidades = entidades.length;
      console.log(`== ${entidades.length} entidades · cupo: ${a.maxDocs} documentos, ${a.maxOcr} imágenes de OCR (tope duro ${tope}), ${a.porEntidad} por entidad, ${a.maxConsultas} consultas`);
      const vistos = new Set();
      const flujo = crearFlujo({ a, resumen, pedirApp: pedir, bajarDoc: bajar, pararPorBase, anotar: (r) => console.log(typeof r === "string" ? r : `   ${JSON.stringify(r)}`),
        obtenerLector: async () => (lector = lector || await abrirLector(origen, { topeImagenes: tope })) });
      const releerTodo = flujo.releerTodo;
      for (const { entidad, nit } of entidades) {
        if (resumen.intentados >= a.maxDocs || imagenes() >= a.maxOcr || resumen.consultados >= a.maxConsultas) break;
        const qs = `entidad=${encodeURIComponent(entidad)}${nit ? `&nit=${encodeURIComponent(nit)}` : ""}`;
        const ev = await pedir(`/api/pliego?op=evaluacion&${qs}`);
        if (llaveRechazada(ev)) { codigo = 1; console.log(`FALLO: la aplicación rechazó la llave (${ev.status}).`); break; }
        if (baseCaida(ev)) { pararPorBase(ev.j.detalle || ev.j.error); break; }
        let procesos;
        try { procesos = await procesosDeLaEntidad(entidad, nit); }
        catch (e) { resumen.fallos++; console.log(`== ${entidad}: datos.gov.co no respondió (${String((e && e.message) || e).slice(0, 120)})`); continue; }
        if (!ev.j || !ev.j.ok) { resumen.fallos++; console.log(`== ${entidad}: no se pudo consultar lo ya leído (${ev.status})`); continue; }
        const { ya, releer } = yaYReleer(ev.j.procesos);
        for (const [id, n] of releer) releerTodo.set(id, n);
        const utiles = procesos.filter(util);
        const cola = colaDeLaEntidad(procesos, ya, vistos, propios);
        console.log(`== ${entidad}${nit ? ` (${nit})` : ""}: ${procesos.length} adjudicados desde 2025, ${utiles.length} útiles para la regla del precio, ${ya.size} ya leídos${releer.size ? `, ${releer.size} por releer sin su OCR` : ""}; ${cola.length} por mirar, hasta ${a.porEntidad} documentos`);
        await recorrerCola(cola, { a, resumen, imagenes, vistos, releer, pararPorBase, anotar: (r) => console.log("  ", JSON.stringify(r)),
          consultar: (p) => pedir(`/api/pliego?op=evaluacion&documento=1&id_proceso=${encodeURIComponent(p.id)}`),
          leerYGuardar: flujo.leerYGuardarDe(entidad, nit) });
        if (resumen.base_caida || codigo === 1) break;
      }
      if (codigo !== 1) await flujo.segundaVuelta();
    }
  } catch (e) { codigo = 1; console.log("FALLO:", String((e && e.message) || e).slice(0, 300)); }
  finally {
    if (lector) {
      resumen.imagenes_ocr = lector.imagenes(); resumen.envios_negados = lector.negadas(); resumen.respuestas_saturadas = lector.saturaciones();
      if (lector.errores.length) console.log("errores de la página:", lector.errores.join(" | ").slice(0, 300));
      await lector.cerrar();
    }
    srv.close();
    console.log("RESUMEN", JSON.stringify(resumen));
    process.exitCode = codigo;
  }
}

module.exports = { perdidasDeRespuesta, argumentos, util, reenviarAProduccion, servirPublic, baseCaida, llaveRechazada, cabenEnElCupo, candidatosDe, procesosDeLaEntidad, entidadesDeRespuesta, entidadesDeMisProcesos, recorrerCola, colaDeLaEntidad,
  faltaOcrPasajero, yaYReleer, crearGuardiaOcr, queHacerConLaLectura, crearFlujo, abrirLector, PAUSA_OCR_MS, MAX_INTENTOS_OCR };
if (require.main === module) principal().catch((e) => { console.log("FALLO:", String((e && e.message) || e).slice(0, 300)); console.log("RESUMEN", JSON.stringify({ fallo: true })); process.exitCode = 1; });
