#!/usr/bin/env node
/* ============================================================================
   Detecta · Validación de la capa de extracción SECOP (sin red externa)
   ----------------------------------------------------------------------------
   Este entorno NO alcanza datos.gov.co, así que se valida contra un MOCK
   fiel de Socrata (paginación keyset por :id, count(*), $offset, fallos 429
   con Retry-After y 500 inyectados de forma determinista) y un MOCK del
   protocolo REST de Upstash Redis. Cubre:
     1 · carga completa = 100 % de los esperados (count) pese a fallos
     2 · corridas interrumpidas por presupuesto → reanudan sin perder/duplicar
     3 · fallo total → incidencias + reanudación al recuperarse la fuente
     4 · delta: nuevos + cambios de estado sin duplicar
     5 · empaquetado: chunks bajo el límite de KV con integridad
     6 · e2e por los handlers reales (/api/sync + /api/procesos) con KV mock
   Uso: node tests/validar-extractor.js
   ========================================================================== */
"use strict";

/* env ANTES de cargar el extractor (DEFAULTS lee process.env) */
const http = require("http");
process.env.SECOP_BACKOFF_MS = "1";
process.env.SECOP_PAGE = "250";
process.env.CRON_SECRET = "secreto-test";

const path = require("path");
const ROOT = path.join(__dirname, "..");

let fallos = 0, ok = 0;
function check(nombre, cond, detalle) {
  if (cond) { ok++; console.log("  ✓ " + nombre); }
  else { fallos++; console.error("  ✗ " + nombre + (detalle ? " — " + JSON.stringify(detalle).slice(0, 300) : "")); }
}

/* ═══════════════ MOCK Socrata + KV en un solo servidor ═══════════════ */
const F = "fecha_de_publicacion_del";
const estado = { data: [], nReq: 0, faltas: true, falloTotal: false, kv: new Map() };

function filtra(rows, where) {
  if (!where) return rows;
  return rows.filter((r) => where.split(" AND ").every((c) => {
    let m = c.match(/^\s*(:?[\w]+)\s*(>=|<=|>|<)\s*'([^']*)'\s*$/);
    if (!m) return true; // condición no reconocida: no filtra (el extractor no la emite)
    const [, campo, op, val] = m;
    const v = String(r[campo] ?? "");
    if (op === ">=") return v >= val;
    if (op === "<") return v < val;
    if (op === ">") return v > val;
    return v <= val;
  }));
}
function handleSocrata(q, res) {
  estado.nReq++;
  if (estado.falloTotal) { res.writeHead(500); return res.end("{}"); }
  if (estado.faltas && estado.nReq % 9 === 0) { res.writeHead(429, { "Retry-After": "0" }); return res.end("busy"); }
  if (estado.faltas && estado.nReq % 17 === 0) { res.writeHead(500); return res.end("boom"); }

  let rows = filtra(estado.data, q.get("$where"));
  const sel = q.get("$select") || "*";
  if (/count\((\*|1)\)/.test(sel)) { res.writeHead(200, { "Content-Type": "application/json" }); return res.end(JSON.stringify([{ n: String(rows.length) }])); }

  const order = q.get("$order") || "";
  if (order === ":id") rows = rows.slice().sort((a, b) => a[":id"].localeCompare(b[":id"]));
  else if (order) rows = rows.slice().sort((a, b) => String(a[F]).localeCompare(String(b[F])) || String(a.id_del_proceso).localeCompare(String(b.id_del_proceso)));

  const off = parseInt(q.get("$offset"), 10) || 0;
  const lim = parseInt(q.get("$limit"), 10) || 1000;
  rows = rows.slice(off, off + lim);
  if (sel !== "*" && !sel.includes("*")) { // sonda: solo campos pedidos
    const campos = sel.split(",").map((s) => s.trim());
    rows = rows.map((r) => Object.fromEntries(campos.map((c) => [c, r[c]])));
  }
  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(JSON.stringify(rows));
}
function handleKV(body, res) {
  // simulación de Redis caído / credenciales inválidas
  if (estado.kvFallo) { res.writeHead(500); return res.end(JSON.stringify({ error: "simulado: WRONGPASS invalid credentials" })); }
  // como Upstash real: el request completo no puede superar 1 MB
  if (body.length > 1_000_000) { res.writeHead(400); return res.end(JSON.stringify({ error: "ERR max request size exceeded" })); }
  let cmd; try { cmd = JSON.parse(body); } catch { res.writeHead(400); return res.end("{}"); }
  const [op, ...a] = cmd;
  const m = estado.kv;
  const viva = (k) => { const e = m.get(k); if (e && e.exp && e.exp < Date.now()) { m.delete(k); return null; } return e || null; };
  let result = null;
  if (op === "GET") { const e = viva(a[0]); result = e ? e.v : null; }
  else if (op === "SET") {
    const [k, v, ...fl] = a;
    const nx = fl.includes("NX"); const exI = fl.indexOf("EX");
    const exp = exI >= 0 ? Date.now() + parseInt(fl[exI + 1], 10) * 1000 : null;
    if (nx && viva(k)) result = null;
    else { m.set(k, { v: String(v), exp }); result = "OK"; }
  }
  else if (op === "DEL") { result = viva(a[0]) ? 1 : 0; m.delete(a[0]); }
  else if (op === "MGET") { result = a.map((k) => { const e = viva(k); return e ? e.v : null; }); }
  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ result }));
}
const server = http.createServer((req, res) => {
  const u = new URL(req.url, "http://x");
  if (u.pathname === "/resource/p6dx-8zbt.json") return handleSocrata(u.searchParams, res);
  if (u.pathname === "/kv") {
    let body = ""; req.on("data", (c) => (body += c)); req.on("end", () => handleKV(body, res));
    return;
  }
  res.writeHead(404); res.end();
});

/* ─── dataset sintético: TODOS los meses del rango, estados variados ─── */
function generarDatos(mesesDelRango, inicioSolape) {
  const ESTADOS = ["Convocado", "Activo", "Adjudicado", "Celebrado", "Borrador", "Suspendido", "Cancelado", "Evaluación"];
  const MODS = ["Licitación pública", "Selección abreviada", "Mínima cuantía", "Concurso de méritos", "Contratación directa"];
  const meses = mesesDelRango(inicioSolape);
  const data = []; let n = 0;
  for (const mes of meses) {
    const filasMes = 90 + (parseInt(mes.slice(5), 10) * 17) % 120; // 90-209 por mes
    for (let i = 0; i < filasMes; i++) {
      n++;
      const dia = String(1 + (i % 27)).padStart(2, "0");
      data.push({
        ":id": "row-" + String(n).padStart(8, "0"),
        ":created_at": "2025-01-01T00:00:00.000Z",
        ":updated_at": "2026-07-01T00:00:00.000Z",
        id_del_proceso: "CO1.PROC." + n,
        referencia_del_proceso: "REF-" + n,
        nombre_del_procedimiento: "Proceso sintético " + n,
        descripci_n_del_procedimiento: "desc " + n,
        entidad: "ENTIDAD " + (n % 37),
        departamento_entidad: "Tolima", ciudad_entidad: "Ibagué",
        modalidad_de_contratacion: MODS[n % MODS.length],
        estado_del_procedimiento: ESTADOS[n % ESTADOS.length],
        fase: "Presentación de ofertas",
        [F]: `${mes}-${dia}T0${n % 10}:00:00.000`,
        fecha_de_ultima_publicaci: `${mes}-${dia}T10:00:00.000`,
        precio_base: String(50e6 + n * 1e6),
        duracion: String(1 + (n % 12)), unidad_de_duracion: "Meses",
        urlproceso: { url: "https://community.secop.gov.co/p/" + n },
        codigo_principal_de_categoria: "V1.72141000",
        tipo_de_contrato: "Obra",
        fecha_de_recepcion_de: `${mes}-${dia}T17:00:00.000`,
      });
    }
  }
  return data;
}

/* ═══════════════════════════ PRUEBAS ═══════════════════════════ */
(async () => {
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const PORT = server.address().port;
  process.env.SECOP_BASE_URL = `http://127.0.0.1:${PORT}/resource/p6dx-8zbt.json`;
  process.env.UPSTASH_REDIS_REST_URL = `http://127.0.0.1:${PORT}/kv`;
  process.env.UPSTASH_REDIS_REST_TOKEN = "token-test";

  /* ── 0 · Resolución de credenciales del cliente compartido ── */
  console.log("\n0 · lib/redis.js (Upstash)");
  const { credenciales } = require(path.join(ROOT, "lib/redis.js"));
  check("prefiere UPSTASH_REDIS_REST_*",
    credenciales().url.endsWith("/kv") && credenciales().token === "token-test");
  check("acepta KV_REST_API_* como respaldo",
    (() => { const c = credenciales({ KV_REST_API_URL: "http://legado/kv", KV_REST_API_TOKEN: "t" });
             return c && c.url === "http://legado/kv"; })());
  check("sin credenciales → null", credenciales({}) === null);

  const { crearExtractor, mesesDelRango, inicioAnoVigente } = require(path.join(ROOT, "lib/extractor.js"));
  const { AlmacenMemoria, descomprimir } = require(path.join(ROOT, "lib/almacen.js"));

  // La FUENTE simula meses viejos (rango de 120 días) pero el rango VIGENTE
  // es de 60 días (~1-nov del año anterior): lo anterior NO debe extraerse.
  const inicioViejo = new Date(Date.parse(inicioAnoVigente() + "Z") - 120 * 864e5).toISOString().slice(0, 23);
  const inicioSolape = new Date(Date.parse(inicioAnoVigente() + "Z") - 60 * 864e5).toISOString().slice(0, 23);
  const mesLimite = inicioSolape.slice(0, 7);
  estado.data = generarDatos(mesesDelRango, inicioViejo);
  const enRango = estado.data.filter((d) => d[F].slice(0, 7) >= mesLimite).length;
  console.log(`\nDataset sintético: ${estado.data.length} filas en la fuente, ${enRango} dentro del rango vigente (≥ ${mesLimite}) (mock en :${PORT})`);

  const sinDormir = () => Promise.resolve();

  /* ── 1 · carga completa de una vez: 100 % pese a 429/500 ── */
  console.log("\n1 · Carga completa (con fallos inyectados)");
  let store = new AlmacenMemoria();
  let x = crearExtractor({ store, dormir: sinDormir, logSink: () => {} });
  let r = await x.extraerTodo({ presupuestoMs: 120000 });
  check("termina (done:true)", r.done === true);
  check("auditoría: diferencia 0", r.auditoria && r.auditoria.diferencia === 0, r.auditoria);
  check("auditoría: esperados = dataset", r.auditoria.esperados === enRango, { esp: r.auditoria.esperados, real: enRango });
  check("auditoría: reporta duración", typeof r.auditoria.duracionMs === "number");
  const est1 = await x.estado();
  check("meta.total = dataset", est1.meta && est1.meta.total === enRango, est1.meta && est1.meta.total);
  check("estados terminales INCLUIDOS (sin filtros tempranos)", await (async () => {
    const { registros } = await x.leerMes(mesesDelRango(inicioSolape)[2]);
    return registros.some((p) => p.estado_del_procedimiento === "Adjudicado") &&
           registros.some((p) => p.estado_del_procedimiento === "Cancelado");
  })());
  check("los meses viejos de la fuente NO se extraen",
    (await x.leerMes(mesesDelRango(inicioViejo)[0])).manifest === null);
  const manB = (await x.leerMes(mesesDelRango(inicioSolape)[2])).manifest;
  check("manifest registra bytes almacenados", manB && manB.bytes > 0, manB && manB.bytes);
  check("meta registra bytes totales", est1.meta.bytes > 0 &&
    est1.meta.bytes === Object.values(est1.meta.porMes).reduce((a, m) => a + (m.bytes || 0), 0), est1.meta.bytes);

  /* ── 2 · interrumpida por presupuesto → reanuda sin perder ni duplicar ── */
  console.log("\n2 · Reanudación por presupuesto de tiempo");
  store = new AlmacenMemoria();
  x = crearExtractor({ store, dormir: sinDormir, logSink: () => {} });
  let vueltas = 0, fin;
  do { fin = await x.extraerTodo({ presupuestoMs: 5 }); vueltas++; } while (!fin.done && vueltas < 400);
  check(`termina en ${vueltas} tramos (>3 = hubo pausas reales)`, fin.done && vueltas > 3, vueltas);
  check("reanudada: diferencia 0", fin.auditoria && fin.auditoria.diferencia === 0, fin.auditoria && fin.auditoria.diferencia);
  const unicos = new Set();
  for (const mes of mesesDelRango(inicioSolape)) {
    const { registros } = await x.leerMes(mes);
    for (const p of registros) unicos.add(p._k);
  }
  check("sin duplicados tras reanudar", unicos.size === enRango, unicos.size);

  /* ── 2b · migración de rango sin reiniciar (120 → 60 días) ── */
  console.log("\n2b · Migración de rango sin reiniciar");
  store = new AlmacenMemoria();
  const xViejo = crearExtractor({ store, dormir: sinDormir, logSink: () => {}, config: { SOLAPE_PUBLICACION_DIAS: 120 } });
  let mig, vueltasV = 0;
  do { mig = await xViejo.extraerTodo({ presupuestoMs: 5 }); vueltasV++; } while (!mig.done && vueltasV < 10);
  check("carga con rango viejo a medias (no terminada)", mig.done === false, vueltasV);
  const progV = (await xViejo.estado()).progreso;
  check("el progreso viejo arranca antes del rango nuevo", progV.desde < inicioSolape, progV.desde);
  const xNuevo = crearExtractor({ store, dormir: sinDormir, logSink: () => {} }); // solape 60 por defecto
  const fin2 = await xNuevo.extraerTodo({ presupuestoMs: 120000 });
  check("la migración completa la carga con el rango nuevo", fin2.done === true && fin2.auditoria.diferencia === 0, fin2.auditoria);
  const progN = (await xNuevo.estado()).progreso;
  check("progreso migrado (desde nuevo y sin meses viejos)",
    progN.desde === inicioSolape && Object.keys(progN.porMes).every((m) => m >= mesLimite), progN.desde);
  check("particiones viejas purgadas en la migración",
    (await xNuevo.leerMes(mesesDelRango(inicioViejo)[0])).manifest === null);

  /* ── 3 · fallo total → incidencia; recuperación → completa ── */
  console.log("\n3 · Fuente caída e incidencias");
  store = new AlmacenMemoria();
  x = crearExtractor({ store, dormir: sinDormir, logSink: () => {}, config: { MAX_INTENTOS: 2 } });
  estado.falloTotal = true;
  let exploto = false;
  try { await x.extraerTodo({ presupuestoMs: 60000 }); } catch (e) { exploto = true; }
  check("con la fuente caída NO se da por bueno (lanza)", exploto);
  const inc = (await x.estado()).incidencias;
  check("incidencia registrada", Array.isArray(inc) && inc.length > 0 && inc[0].nivel === "error");
  estado.falloTotal = false;
  r = await x.extraerTodo({ presupuestoMs: 120000 });
  check("recuperada la fuente: completa al 100 %", r.done && r.auditoria.diferencia === 0, r.auditoria && r.auditoria.diferencia);

  /* ── 4 · delta: nuevos + cambio de estado, sin duplicar ── */
  console.log("\n4 · Delta incremental");
  const mesActual = mesesDelRango(inicioSolape).slice(-1)[0];
  const mesViejo = mesesDelRango(inicioSolape)[1];
  const ahoraISO = new Date().toISOString();
  const cambiados = estado.data.filter((d) => d[F].startsWith(mesViejo)).slice(0, 5);
  for (const c of cambiados) { c.estado_del_procedimiento = "Adjudicado"; c[":updated_at"] = ahoraISO; }
  for (let i = 1; i <= 7; i++) {
    estado.data.push({ ...estado.data[0], ":id": "row-99990" + i, id_del_proceso: "CO1.NEW." + i, referencia_del_proceso: "NEW-" + i, [F]: `${mesActual}-15T08:00:00.000`, ":updated_at": ahoraISO, estado_del_procedimiento: "Convocado", nombre_del_procedimiento: "Nuevo " + i });
  }
  estado.data.push({ ...estado.data[0], ":id": "row-9999999", id_del_proceso: "CO1.NEW.VIEJO", referencia_del_proceso: "NEW-V", [F]: `${mesViejo}-20T08:00:00.000`, ":updated_at": ahoraISO, estado_del_procedimiento: "Activo", nombre_del_procedimiento: "Retropublicado" });

  // 4a · delta cortado por presupuesto: NO avanza last_sync (pérdida cero)
  const syncAntes = ((await x.estado()).meta || {}).last_sync;
  const dParcial = await x.extraerDelta({ presupuestoMs: -1 });
  check("delta parcial reporta done:false", dParcial.done === false && dParcial.parcial === true, dParcial);
  check("delta parcial NO avanza last_sync", ((await x.estado()).meta || {}).last_sync === syncAntes);

  // 4b · delta real: nuevos + cambios de estado, sin duplicar (append-only)
  const d = await x.extraerDelta({ presupuestoMs: 60000 });
  check("delta detecta 13 filas (5 cambiadas + 8 nuevas)", d.done === true && d.filas === 13, d);
  check("delta toca 2 meses", d.meses === 2, d);
  const { registros: regsViejo } = await x.leerMes(mesViejo);
  const adj = regsViejo.filter((p) => cambiados.some((c) => c[":id"] === p[":id"]));
  check("cambio de estado aplicado sin duplicar", adj.length === 5 && adj.every((p) => p.estado_del_procedimiento === "Adjudicado"), adj.length);
  const todos2 = new Set();
  for (const mes of mesesDelRango(inicioSolape)) for (const p of (await x.leerMes(mes)).registros) todos2.add(p._k);
  const enRangoAmpliado = estado.data.filter((d) => d[F].slice(0, 7) >= mesLimite).length;
  check("total tras delta = dataset ampliado (en rango)", todos2.size === enRangoAmpliado, { cache: todos2.size, data: enRangoAmpliado });

  // 4c · compactación: tras el umbral, el mes se reescribe deduplicado en un
  // rango nuevo (manifest.ini avanza) sin perder registros
  const xComp = crearExtractor({ store, dormir: sinDormir, logSink: () => {}, config: { COMPACTAR_TRAS: 0 } });
  cambiados[0][":updated_at"] = new Date(Date.now() + 1000).toISOString();
  cambiados[0].estado_del_procedimiento = "Celebrado";
  const dc = await xComp.extraerDelta({ presupuestoMs: 60000 });
  check("delta de compactación aplicado", dc.done === true && dc.filas >= 1, dc);
  const { manifest: manComp, registros: regsComp } = await xComp.leerMes(mesViejo);
  check("mes compactado (manifest.ini avanza)", manComp && manComp.ini > 0, manComp);
  const regC = regsComp.find((p) => p[":id"] === cambiados[0][":id"]);
  check("compactación conserva la versión más nueva", regC && regC.estado_del_procedimiento === "Celebrado");
  const unicos3 = new Set(regsComp.map((p) => p._k));
  check("compactación sin duplicados ni pérdidas", unicos3.size === regsComp.length &&
    regsComp.length === estado.data.filter((r) => r[F].startsWith(mesViejo)).length, regsComp.length);

  // 4d · el delta purga particiones que quedaron fuera del rango vigente
  const { claves: clavesK, escribirJSON: escrJ, comprimir: compr } = require(path.join(ROOT, "lib/almacen.js"));
  const mesStale = mesesDelRango(inicioViejo)[0]; // p.ej. el mes más viejo de la fuente
  const Ks = clavesK(mesStale);
  await store.set(Ks.chunk(0), compr([{ _k: "reliquia-1" }]));
  await escrJ(store, Ks.manifest, { ini: 0, chunks: 1, count: 1, esperados: 1 });
  const K0s = clavesK("");
  const metaS = JSON.parse(await store.get(K0s.meta));
  metaS.porMes[mesStale] = { bajados: 1, esperados: 1 };
  await escrJ(store, K0s.meta, metaS);
  await x.extraerDelta({ presupuestoMs: 60000 });
  check("delta purga la partición fuera de rango",
    (await store.get(Ks.manifest)) === null && (await store.get(Ks.chunk(0))) === null);
  const metaS2 = JSON.parse(await store.get(K0s.meta));
  check("meta queda limpia y con cobertura honesta",
    !metaS2.porMes[mesStale] && metaS2.desde >= inicioSolape, { desde: metaS2.desde });

  /* ── 5 · empaquetado bajo el límite de KV ── */
  console.log("\n5 · Empaquetado en chunks");
  const xChunk = crearExtractor({ store: new AlmacenMemoria(), dormir: sinDormir, logSink: () => {}, config: { CHUNK_MAX_B64: 2000 } });
  const incompresible = Array.from({ length: 300 }, (_, i) => ({ _k: "k" + i, blob: require("crypto").randomBytes(48).toString("hex") }));
  const paquetes = xChunk._interno.empaquetar(incompresible);
  check("parte en varios chunks", paquetes.length > 1, paquetes.length);
  check("todos bajo el límite", paquetes.every((p) => p.length <= 2000), paquetes.map((p) => p.length));
  const vuelta = paquetes.flatMap((p) => descomprimir(p));
  check("integridad del round-trip", JSON.stringify(vuelta) === JSON.stringify(incompresible));

  /* ── 5b · límites del tier gratuito de Upstash ── */
  console.log("\n5b · Límites del tier gratuito");
  const VOCAB = ("construccion mejoramiento mantenimiento rehabilitacion via terciaria urbana municipio vereda " +
    "sector puente placa huella alcantarillado acueducto institucion educativa sede principal fase contrato obra " +
    "publica licitacion seleccion abreviada menor cuantia interventoria estudios disenos pavimento rigido flexible " +
    "andenes sardineles espacio deportivo parque polideportivo cubierta salon comunal centro salud plaza mercado " +
    "relleno sanitario bocatoma tanque redes distribucion optimizacion ampliacion adecuacion").split(" ");
  const frase = (i, n) => Array.from({ length: n }, (_, j) => VOCAB[(i * 31 + j * 7) % VOCAB.length]).join(" ");
  const filaReal = (i) => ({
    ":id": "row-abcd." + String(i).padStart(6, "0"), ":created_at": "2026-01-01T00:00:00.000Z",
    ":updated_at": "2026-0" + (1 + (i % 7)) + "-1" + (i % 9) + "T0" + (i % 9) + ":00:00.000Z",
    id_del_proceso: "CO1.BDOS." + (7e6 + i), referencia_del_proceso: "LP-" + (2026000 + i),
    nombre_del_procedimiento: frase(i, 14).toUpperCase(),
    descripci_n_del_procedimiento: frase(i * 3 + 1, 60 + (i % 3) * 60),
    entidad: "ALCALDIA MUNICIPAL DE " + VOCAB[(i * 13) % VOCAB.length].toUpperCase(),
    nit_entidad: String(800000000 + i), departamento_entidad: "Tolima", ciudad_entidad: "Ibagué",
    modalidad_de_contratacion: ["Licitación pública", "Selección abreviada", "Mínima cuantía"][i % 3],
    estado_del_procedimiento: ["Convocado", "Adjudicado", "Borrador"][i % 3], fase: "Presentación de ofertas",
    fecha_de_publicacion_del: "2026-0" + (1 + (i % 7)) + "-" + String(1 + (i % 27)).padStart(2, "0") + "T10:00:00.000",
    fecha_de_ultima_publicaci: "2026-07-01T10:00:00.000", precio_base: String(5e7 + i * 13791),
    duracion: String(1 + (i % 12)), unidad_de_duracion: "Meses",
    urlproceso: { url: "https://community.secop.gov.co/Public/Tendering/OpportunityDetail/Index?noticeUID=CO1.NTC." + (3e6 + i) },
    codigo_principal_de_categoria: "V1.7214" + (1000 + (i % 900)), tipo_de_contrato: "Obra",
    fecha_de_recepcion_de: "2026-08-0" + (1 + (i % 9)) + "T17:00:00.000",
    _k: "CO1.BDOS." + (7e6 + i),
  });
  const xDef = crearExtractor({ store: new AlmacenMemoria(), dormir: sinDormir, logSink: () => {} });
  const loteReal = Array.from({ length: 4000 }, (_, i) => filaReal(i));
  const paqDef = xDef._interno.empaquetar(loteReal);
  check("chunks por defecto ≤ 500 KB", paqDef.every((p) => p.length <= 500000), Math.max(...paqDef.map((p) => p.length)));
  const porFila = paqDef.reduce((a, p) => a + p.length, 0) / loteReal.length;
  const anualMB = (porFila * 600000) / 1e6;
  check(`proyección anual ≤ 200 MB (estimado ${anualMB.toFixed(0)} MB a ${porFila.toFixed(0)} B/fila comprimida)`, anualMB <= 200, anualMB);
  const malConfig = crearExtractor({ store: new AlmacenMemoria(), dormir: sinDormir, logSink: () => {}, config: { CHUNK_MAX_B64: 5e6 } });
  check("tope duro de 900 KB aunque CHUNK_MAX_B64 se configure mal",
    malConfig._interno.empaquetar(loteReal).every((p) => p.length <= 900000));

  /* ── 6 · e2e por los handlers reales con KV mock ── */
  console.log("\n6 · End-to-end /api/sync + /api/procesos");
  estado.kv.clear(); estado.nReq = 0;
  const sync = (await import(path.join(ROOT, "api/sync.js"))).default;
  const procesos = (await import(path.join(ROOT, "api/procesos.js"))).default;
  const mkRes = () => { const r = { code: 0, body: null }; return { status(c) { r.code = c; return this; }, json(o) { r.body = o; return r; }, setHeader() {}, _r: r }; };
  const auth = { host: "app.test", authorization: "Bearer secreto-test" };

  let out = mkRes();
  await sync({ query: { modo: "full", presupuesto: "600" }, headers: {} }, out);
  check("sync sin auth → 401", out._r.code === 401);

  let tramos = 0, ultimo;
  do {
    out = mkRes();
    await sync({ query: { modo: "full", presupuesto: "600" }, headers: auth }, out);
    ultimo = out._r; tramos++;
  } while (ultimo.code === 200 && ultimo.body && ultimo.body.done === false && tramos < 400);
  check(`sync full termina por tramos (${tramos})`, ultimo.code === 200 && ultimo.body.done === true, ultimo.body);
  check("sync reporta auditoría con diferencia 0", ultimo.body.auditoria && ultimo.body.auditoria.diferencia === 0, ultimo.body.auditoria);
  check("sync reporta consumo de comandos Redis", typeof ultimo.body.comandosRedis === "number" && ultimo.body.comandosRedis > 0, ultimo.body.comandosRedis);

  out = mkRes();
  await procesos({ query: { meta: "1" }, headers: { host: "app.test" } }, out);
  const enRangoE2E = estado.data.filter((d) => d[F].slice(0, 7) >= mesLimite).length;
  check("procesos?meta=1 responde (total del rango vigente)",
    out._r.code === 200 && out._r.body.total === enRangoE2E, out._r.body);
  check("meta.fresca tras sincronizar", out._r.body.fresca === true);
  check("meta expone la cobertura (desde ≈ 1-nov)", out._r.body.desde === inicioSolape, out._r.body.desde);
  check("meta expone bytes almacenados", out._r.body.bytesAlmacenados > 0, out._r.body.bytesAlmacenados);

  const desde = `${mesActual}-01T00:00:00.000`;
  const esperadosDesde = estado.data.filter((d) => String(d[F]) >= desde).length;
  let paginas = 0, filas = [], lote;
  do {
    out = mkRes();
    await procesos({ query: { desde, limit: "100", offset: String(filas.length) }, headers: { host: "app.test" } }, out);
    lote = out._r.body; filas = filas.concat(lote); paginas++;
  } while (Array.isArray(lote) && lote.length === 100 && paginas < 50);
  check(`procesos pagina el mes actual completo (${filas.length}/${esperadosDesde} en ${paginas} páginas)`, filas.length === esperadosDesde, { filas: filas.length, esperadosDesde });
  check("orden fecha DESC", filas.every((f, i) => i === 0 || String(filas[i - 1][F]) >= String(f[F])));
  check("forma Socrata intacta (mapProcess-compatible)", filas[0] && "id_del_proceso" in filas[0] && "urlproceso" in filas[0] && "fecha_de_recepcion_de" in filas[0]);

  out = mkRes();
  const minTest = 100e6;
  await procesos({ query: { desde, limit: "1500", min: String(minTest) }, headers: { host: "app.test" } }, out);
  check("procesos filtra min en servidor", Array.isArray(out._r.body) &&
    out._r.body.length > 0 && out._r.body.every((f) => parseFloat(f.precio_base) >= minTest), out._r.body.length);

  out = mkRes();
  await procesos({ query: { desde }, headers: { host: "app.test", origin: "https://malo.example" } }, out);
  check("procesos rechaza origen ajeno", out._r.code === 403);

  out = mkRes();
  await sync({ query: { modo: "auto" }, headers: { host: "app.test", origin: "http://app.test" } }, out);
  check("sync mismo-origen (auto) permitido", out._r.code === 200 && out._r.body.ok === true, out._r);

  /* ── 6b · candado de /api/sync: nunca bloqueado permanentemente ── */
  console.log("\n6b · Candado de /api/sync");
  const LOCK = "detecta:x:lock";
  // a) candado FRESCO de otra corrida → contención legítima (202 enCurso)
  estado.kv.set(LOCK, { v: JSON.stringify({ t: Date.now(), token: "otra-corrida" }), exp: null });
  out = mkRes();
  await sync({ query: { modo: "auto" }, headers: auth }, out);
  check("candado fresco → 202 enCurso", out._r.code === 202 && out._r.body.enCurso === true, out._r.body);
  check("el candado ajeno NO se borra al chocar", estado.kv.has(LOCK));
  // b) candado MUERTO (>10 min y sin TTL) → se sobrescribe y la llamada continúa
  estado.kv.set(LOCK, { v: JSON.stringify({ t: Date.now() - 11 * 60e3, token: "muerto" }), exp: null });
  out = mkRes();
  await sync({ query: { modo: "auto" }, headers: auth }, out);
  check("candado muerto (>10 min) → se sobrescribe y continúa", out._r.code === 200 && out._r.body.enCurso === undefined, out._r.body);
  check("el candado propio se libera al terminar (finally)", !estado.kv.has(LOCK));
  // c) Redis caído/credenciales malas → 502 con la causa, NUNCA "enCurso"
  estado.kvFallo = true;
  out = mkRes();
  await sync({ query: { modo: "auto" }, headers: auth }, out);
  check("error de Redis → 502 con causa real (no enCurso)",
    out._r.code === 502 && /Redis inaccesible/.test(out._r.body.error || "") && out._r.body.enCurso === undefined, out._r.body);
  estado.kvFallo = false;
  // d) /api/sync/unlock: 401 sin secreto; con secreto borra el candado
  const unlock = (await import(path.join(ROOT, "api/sync/unlock.js"))).default;
  estado.kv.set(LOCK, { v: JSON.stringify({ t: Date.now(), token: "otra-corrida" }), exp: null });
  out = mkRes();
  await unlock({ query: {}, headers: {} }, out);
  check("unlock sin secreto → 401", out._r.code === 401);
  out = mkRes();
  await unlock({ query: {}, headers: auth }, out);
  check("unlock con secreto borra el candado",
    out._r.code === 200 && out._r.body.desbloqueado === true && out._r.body.habiaCandado === true && !estado.kv.has(LOCK), out._r.body);
  // e) también como modo del endpoint principal, incluso con formato legado
  estado.kv.set(LOCK, { v: "token-legado-sin-json", exp: null });
  out = mkRes();
  await sync({ query: { modo: "unlock", secret: "secreto-test" }, headers: { host: "app.test" } }, out);
  check("?modo=unlock desbloquea (formato legado incluido)",
    out._r.code === 200 && out._r.body.desbloqueado === true && !estado.kv.has(LOCK), out._r.body);

  /* ── resultado ── */
  server.close();
  console.log(`\n${fallos === 0 ? "✅" : "❌"} ${ok} comprobaciones OK · ${fallos} fallos · ${estado.nReq} peticiones al mock`);
  process.exit(fallos === 0 ? 0 : 1);
})().catch((e) => { console.error("✗ error inesperado:", e); process.exit(1); });
