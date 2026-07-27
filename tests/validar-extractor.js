#!/usr/bin/env node
/* ============================================================================
   Detecta · Validación de la capa de extracción SECOP (sin red externa)
   ----------------------------------------------------------------------------
   Este entorno NO alcanza datos.gov.co, así que se valida contra un MOCK
   fiel de Socrata (paginación keyset por :id, count(1), $offset, fallos 429
   con Retry-After y 500 inyectados de forma determinista) y un MOCK del
   protocolo REST de Vercel KV. Cubre:
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
  if (/count\(1\)/.test(sel)) { res.writeHead(200, { "Content-Type": "application/json" }); return res.end(JSON.stringify([{ n: String(rows.length) }])); }

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
  process.env.KV_REST_API_URL = `http://127.0.0.1:${PORT}/kv`;
  process.env.KV_REST_API_TOKEN = "token-test";

  const { crearExtractor, mesesDelRango, inicioAnoVigente } = require(path.join(ROOT, "lib/extractor.js"));
  const { AlmacenMemoria, descomprimir } = require(path.join(ROOT, "lib/almacen.js"));

  const inicioSolape = new Date(Date.parse(inicioAnoVigente() + "Z") - 120 * 864e5).toISOString().slice(0, 23);
  estado.data = generarDatos(mesesDelRango, inicioSolape);
  const enRango = estado.data.length; // todo el dataset cae en el rango por construcción
  console.log(`\nDataset sintético: ${enRango} filas en ${mesesDelRango(inicioSolape).length} meses (mock en :${PORT})`);

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

  const d = await x.extraerDelta({ presupuestoMs: 60000 });
  check("delta detecta 13 filas (5 cambiadas + 8 nuevas)", d.filas === 13, d);
  check("delta inserta 8", d.insertados === 8, d);
  check("delta actualiza 5", d.actualizados === 5, d);
  const { registros: regsViejo } = await x.leerMes(mesViejo);
  const adj = regsViejo.filter((p) => cambiados.some((c) => c[":id"] === p[":id"]));
  check("cambio de estado aplicado sin duplicar", adj.length === 5 && adj.every((p) => p.estado_del_procedimiento === "Adjudicado"), adj.length);
  const todos2 = new Set();
  for (const mes of mesesDelRango(inicioSolape)) for (const p of (await x.leerMes(mes)).registros) todos2.add(p._k);
  check("total tras delta = dataset ampliado", todos2.size === estado.data.length, { cache: todos2.size, data: estado.data.length });

  /* ── 5 · empaquetado bajo el límite de KV ── */
  console.log("\n5 · Empaquetado en chunks");
  const xChunk = crearExtractor({ store: new AlmacenMemoria(), dormir: sinDormir, logSink: () => {}, config: { CHUNK_MAX_B64: 2000 } });
  const incompresible = Array.from({ length: 300 }, (_, i) => ({ _k: "k" + i, blob: require("crypto").randomBytes(48).toString("hex") }));
  const paquetes = xChunk._interno.empaquetar(incompresible);
  check("parte en varios chunks", paquetes.length > 1, paquetes.length);
  check("todos bajo el límite", paquetes.every((p) => p.length <= 2000), paquetes.map((p) => p.length));
  const vuelta = paquetes.flatMap((p) => descomprimir(p));
  check("integridad del round-trip", JSON.stringify(vuelta) === JSON.stringify(incompresible));

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

  out = mkRes();
  await procesos({ query: { meta: "1" }, headers: { host: "app.test" } }, out);
  check("procesos?meta=1 responde", out._r.code === 200 && out._r.body.total === estado.data.length, out._r.body);
  check("meta.fresca tras sincronizar", out._r.body.fresca === true);

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
  await procesos({ query: { desde }, headers: { host: "app.test", origin: "https://malo.example" } }, out);
  check("procesos rechaza origen ajeno", out._r.code === 403);

  out = mkRes();
  await sync({ query: { modo: "auto" }, headers: { host: "app.test", origin: "http://app.test" } }, out);
  check("sync mismo-origen (auto) permitido", out._r.code === 200 && out._r.body.ok === true, out._r);

  /* ── resultado ── */
  server.close();
  console.log(`\n${fallos === 0 ? "✅" : "❌"} ${ok} comprobaciones OK · ${fallos} fallos · ${estado.nReq} peticiones al mock`);
  process.exit(fallos === 0 ? 0 : 1);
})().catch((e) => { console.error("✗ error inesperado:", e); process.exit(1); });
