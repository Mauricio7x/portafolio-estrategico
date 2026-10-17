"use strict";
/* Base nacional de obra · el almacén R2 con TOPE PROPIO (17-oct-2026).
   Encargo del dueño: que nunca se pasen los topes gratis de R2. Cloudflare NO corta el gasto
   (sus alertas solo avisan, verificado el 17-oct-2026), así que la cerradura es de este lado.
   Topes gratis verificados en developers.cloudflare.com/r2/pricing (actualizada el 1-oct-2026):
   10 GB-mes de almacenamiento Standard (promedio del PICO diario en 30 días), 1 M operaciones
   clase A (PutObject, ListObjects…) y 10 M clase B (GetObject, HeadObject) al mes; borrar es
   gratis; el exceso se redondea HACIA ARRIBA; Infrequent Access no tiene gratis. La página no
   dice si el GB es 10^9 o 2^30 (se toma 10^9, el menor) ni si el gratis es por cuenta (se asume
   que sí: lo más prudente).
   Reglas:
   - Antes de subir se mide lo ocupado (listado completo) y lo gastado en el mes (registro
     `_cuota/AAAA-MM.json`); si lo ocupado + lo nuevo pasa la PARTE de la base o las operaciones
     pasan el 10 % del gratis, no se sube nada.
   - «No se pudo medir» NO es «vacío»: un listado que no es <ListBucketResult> (HTML del muro,
     <Error>), un registro ilegible o negativo, o un registro que falta habiendo objetos escritos
     este mes → no se sube.
   - La reserva va ANTES de gastar: el registro se escribe con lo ya gastado más lo previsto,
     con PUT condicional (If-Match / If-None-Match, que R2 evalúa atómicamente): si otra corrida
     lo movió entre medio, 412 y se aborta. Un fallo a mitad deja la cuenta DE MÁS (lado seguro).
   - Cada PUT de datos lleva `x-amz-storage-class: STANDARD` (la única clase con gratis).
   - Solo cuenta lo que escribe ESTE script: una llave filtrada, el panel o la copia nocturna
     escriben por fuera (por eso la llave va limitada a un almacén y el almacén es privado).
   Uso:  node scripts/base_obra/almacen.js medir
         node scripts/base_obra/almacen.js subir <carpeta> <prefijo>   (sube *.gz y *.json)
   Variables: OBJETOS_ENDPOINT, OBJETOS_BUCKET, OBJETOS_ACCESS_KEY_ID, OBJETOS_SECRET_ACCESS_KEY,
   BASE_TOPE_MB (opcional). */
const fs = require("fs");
const path = require("path");
const { faltan, firmar, rutaCodificada, amzAhora, sha256 } = require("../../lib/objetos");

const MB = 1e6;                                    // MB decimales: 10 GB = 10.000 MB en la lectura menor
const TOPE_CUENTA_MB = 9000;                       // decisión del dueño (17-oct-2026): 90 % de 10.000 MB
const COPIA_TOPE_MB = 5000;                        // parte reservada para la copia nocturna de Detekta
const TOPE_BASE_MB_MAX = TOPE_CUENTA_MB - COPIA_TOPE_MB;
const GRATIS_OPS_MES = { a: 1000000, b: 10000000 };
const TOPES_OPS_MES = { a: 100000, b: 1000000 };    // la base gasta como mucho el 10 % del gratis
const MARGEN_REGISTRO_BYTES = 4096;                 // el propio registro ocupa espacio
const MAX_PAGINAS = 200;                            // 200.000 objetos: más es un bucle, no un almacén
const CLAVE_REGISTRO = (mes) => `_cuota/${mes}.json`;

const natural = (x) => typeof x === "number" && Number.isFinite(x) && x >= 0;

/* Decisión PURA: ¿se puede subir? Toda entrada que no sea un número finito ≥ 0 niega. */
function decidirSubida({ usadoBytes, nuevosBytes, reemplazaBytes = 0, topeBytes, opsMes, opsNecesarias, topesOps = TOPES_OPS_MES }) {
  if (!natural(usadoBytes)) return { ok: false, motivo: "no se pudo medir lo que ocupa el almacén: no se sube nada" };
  if (!opsMes || !natural(opsMes.a) || !natural(opsMes.b))
    return { ok: false, motivo: "no se pudo leer el registro de operaciones del mes: no se sube nada" };
  if (!natural(nuevosBytes) || !natural(reemplazaBytes) || reemplazaBytes > usadoBytes
    || !opsNecesarias || !natural(opsNecesarias.a) || !natural(opsNecesarias.b))
    return { ok: false, motivo: "entradas de la decisión ilegibles: no se sube nada" };
  if (!(topeBytes > 0) || topeBytes > TOPE_BASE_MB_MAX * MB)
    return { ok: false, motivo: `tope inválido (${topeBytes} bytes): debe ser positivo y no pasar de ${TOPE_BASE_MB_MAX} MB (${TOPE_CUENTA_MB} de la cuenta menos ${COPIA_TOPE_MB} de la copia nocturna)` };
  const tras = usadoBytes - reemplazaBytes + nuevosBytes;
  if (tras > topeBytes)
    return { ok: false, motivo: `la subida dejaría el almacén en ${(tras / MB).toFixed(3)} MB y el tope es ${(topeBytes / MB).toFixed(3)} MB`, usadoTras: tras };
  for (const k of ["a", "b"]) {
    if (opsMes[k] + opsNecesarias[k] > topesOps[k])
      return { ok: false, motivo: `operaciones clase ${k.toUpperCase()} del mes: ${opsMes[k]} + ${opsNecesarias[k]} pasarían el tope de ${topesOps[k]}` };
  }
  return { ok: true, usadoTras: tras };
}

/* BASE_TOPE_MB: solo dígitos con punto decimal opcional («4.900» se lee 4,9 MB: lado seguro). */
function topeBaseBytes(env = process.env) {
  const s = String(env.BASE_TOPE_MB || "").trim();
  if (!s) return TOPE_BASE_MB_MAX * MB;
  return /^\d+(\.\d+)?$/.test(s) ? Number(s) * MB : NaN;   // NaN → la decisión niega
}

const decodXml = (s) => s.replace(/&(amp|lt|gt|quot|apos|#\d+|#x[0-9a-f]+);/gi, (m, e) =>
  e === "amp" ? "&" : e === "lt" ? "<" : e === "gt" ? ">" : e === "quot" ? '"' : e === "apos" ? "'"
    : String.fromCodePoint(e[1] === "x" || e[1] === "X" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10)));

/* Cliente mínimo firmado con lib/objetos.firmar (no hay segundo firmador). */
function cliente(env) {
  const url = new URL(String(env.OBJETOS_ENDPOINT).trim().replace(/\/+$/, ""));
  const bucket = String(env.OBJETOS_BUCKET).trim();
  const cred = { llave: String(env.OBJETOS_ACCESS_KEY_ID).trim(), secreto: String(env.OBJETOS_SECRET_ACCESS_KEY).trim(),
    region: String(env.OBJETOS_REGION || "auto").trim() || "auto" };
  const enc = (s) => encodeURIComponent(s).replace(/[!'()*]/g, (c) => "%" + c.charCodeAt(0).toString(16).toUpperCase());
  async function pedir(metodo, clave, { q = {}, cuerpo = null, extra = {} } = {}) {
    const ruta = url.pathname.replace(/\/+$/, "") + rutaCodificada(clave === null ? [bucket] : [bucket, clave]);
    const query = Object.keys(q).sort().map((k) => `${enc(k)}=${enc(q[k])}`).join("&");
    const datos = cuerpo === null ? Buffer.alloc(0) : cuerpo;
    const hashCuerpo = sha256(datos); const amzFecha = amzAhora();
    const cabeceras = { host: url.host, "x-amz-content-sha256": hashCuerpo, "x-amz-date": amzFecha, ...extra };
    const { autorizacion } = firmar({ metodo, ruta, query, cabeceras, hashCuerpo, amzFecha, ...cred });
    const enviar = { ...cabeceras, authorization: autorizacion }; delete enviar.host;
    return fetch(`${url.protocol}//${url.host}${ruta}${query ? "?" + query : ""}`,
      { method: metodo, headers: enviar, body: metodo === "PUT" ? datos : undefined, signal: AbortSignal.timeout(60000) });
  }
  return { pedir, bucket };
}

/* Listado completo. Cada página debe ser un <ListBucketResult> sin <Error>; un token repetido o
   más de MAX_PAGINAS páginas es un bucle y se corta. Lo ocupado se suma EN el bucle. */
async function listar(c, mes) {
  const tam = new Map(); let token = null, paginas = 0, usado = 0, delMes = 0; const vistos = new Set();
  const cortar = (msg) => { const e = new Error(msg); e.paginas = paginas; return e; };
  do {
    if (++paginas > MAX_PAGINAS) throw cortar(`listado de más de ${MAX_PAGINAS} páginas: se corta`);
    const r = await c.pedir("GET", null, { q: { "list-type": "2", ...(token ? { "continuation-token": token } : {}) } });
    const xml = await r.text();
    if (!r.ok) { const e = cortar(`listar el almacén respondió ${r.status}: ${xml.slice(0, 200)}`); e.status = r.status; throw e; }
    if (!/<ListBucketResult[\s>]/.test(xml) || /<Error[\s>]/.test(xml)) throw cortar(`listado ilegible (no es un ListBucketResult): ${xml.slice(0, 120)}`);
    for (const m of xml.matchAll(/<Contents>([\s\S]*?)<\/Contents>/g)) {
      const k = (m[1].match(/<Key>([\s\S]*?)<\/Key>/) || [])[1];
      const t = Number((m[1].match(/<Size>(\d+)<\/Size>/) || [])[1]);
      if (k === undefined || !Number.isFinite(t)) throw cortar("listado ilegible: un objeto sin <Key> o <Size>");
      usado += t; tam.set(decodXml(k), t);
      if (((m[1].match(/<LastModified>([^<]+)<\/LastModified>/) || [])[1] || "").startsWith(mes)) delMes++;
    }
    const truncado = /<IsTruncated>true<\/IsTruncated>/.test(xml);
    token = truncado ? decodXml((xml.match(/<NextContinuationToken>([\s\S]*?)<\/NextContinuationToken>/) || [])[1] || "") : null;
    if (truncado && !token) throw cortar("listado truncado sin token para seguir");
    if (token && vistos.has(token)) throw cortar("listado con token repetido: se corta");
    if (token) vistos.add(token);
  } while (token);
  return { tam, usado, paginas, delMes };
}

const mesActual = (d = new Date()) => d.toISOString().slice(0, 7);

/* Registro del mes: { a, b } enteros ≥ 0 y su ETag (para la escritura condicional). */
async function leerRegistro(c, mes) {
  const r = await c.pedir("GET", CLAVE_REGISTRO(mes));
  if (r.status === 404) return { a: 0, b: 0, etag: null, falta: true };
  if (!r.ok) { const e = new Error(`leer el registro respondió ${r.status}`); e.status = r.status; throw e; }
  const j = JSON.parse(await r.text());
  if (!Number.isSafeInteger(j.a) || j.a < 0 || !Number.isSafeInteger(j.b) || j.b < 0) throw new Error("registro del mes con cifras ilegibles o negativas");
  return { a: j.a, b: j.b, etag: r.headers.get("etag"), falta: false };
}

/* PUT condicional del registro: si otra corrida lo cambió desde que se leyó, 412 → se aborta. */
async function escribirRegistro(c, mes, etag, datos) {
  const extra = { "content-type": "application/json", "x-amz-storage-class": "STANDARD", ...(etag ? { "if-match": etag } : { "if-none-match": "*" }) };
  const r = await c.pedir("PUT", CLAVE_REGISTRO(mes), { cuerpo: Buffer.from(JSON.stringify({ ...datos, actualizado: new Date().toISOString() })), extra });
  if (r.status === 412) { const e = new Error("NO SE SUBIÓ: otra corrida movió el registro del mes al mismo tiempo; vuelva a correrlo"); e.tope = true; throw e; }
  if (!r.ok) { const e = new Error(`escribir el registro respondió ${r.status}`); e.status = r.status; throw e; }
  return r.headers.get("etag");
}

/* Lo gastado por una corrida que ABORTA se suma al registro (relectura + PUT condicional, hasta
   3 intentos). Un registro ilegible o borrado no se puede sumar: ese gasto queda sin anotar y es
   el margen declarado (unas pocas operaciones por corrida fallida frente a un tope del 10 %). */
async function anotarGasto(c, mes, gasto) {
  for (let i = 0; i < 3; i++) {
    let reg;
    try { reg = await leerRegistro(c, mes); } catch { return false; }
    try { await escribirRegistro(c, mes, reg.etag, { a: reg.a + gasto.a + 1, b: reg.b + gasto.b + 1 }); return true; }
    catch (e) { if (!/otra corrida/.test(e.message)) return false; gasto = { a: gasto.a + 1, b: gasto.b + 1 }; }
  }
  return false;
}

/* Mide y anota lo gastado en medir (1 GET + las páginas del listado + el PUT del registro). */
async function medirConCliente(c, mes) {
  const reg = await leerRegistro(c, mes);
  let l;
  try { l = await listar(c, mes); }
  catch (e) { await anotarGasto(c, mes, { a: e.paginas || 1, b: 1 }); throw e; }
  const ops = { a: reg.a + l.paginas + 1, b: reg.b + 1 };   // +1 A: el PUT del registro que sigue
  if (reg.falta && l.delMes > 0) {   // no hay registro que sumar: gasto sin anotar (declarado)
    const e = new Error(`NO SE SUBIÓ: falta el registro del mes pero hay ${l.delMes} objetos escritos este mes; lo gastado no se puede reconstruir`);
    e.tope = true; throw e;
  }
  return { reg, l, ops };
}

async function medir(env = process.env) {
  const c = cliente(env), mes = mesActual();
  const { reg, l, ops } = await medirConCliente(c, mes);
  await escribirRegistro(c, mes, reg.etag, ops);
  return { usado_mb: +(l.usado / MB).toFixed(3), tope_mb: topeBaseBytes(env) / MB, objetos: l.tam.size, ops_mes: ops };
}

async function subir(carpeta, prefijo, env = process.env) {
  if (!/^[a-z0-9][a-z0-9_\-/]*$/.test(prefijo || "")) throw new Error(`prefijo inválido «${prefijo}»`);
  // Los Buffers se leen ANTES de decidir y se sube exactamente eso.
  const nuevos = fs.readdirSync(carpeta).filter((f) => /\.(gz|json)$/.test(f)).sort()
    .map((f) => ({ clave: `${prefijo.replace(/\/+$/, "")}/${f}`, buf: fs.readFileSync(path.join(carpeta, f)) }));
  if (!nuevos.length) throw new Error(`no hay *.gz ni *.json en ${carpeta}`);
  const c = cliente(env), mes = mesActual();
  const { reg, l, ops } = await medirConCliente(c, mes);
  const d = decidirSubida({ usadoBytes: l.usado, nuevosBytes: nuevos.reduce((s, x) => s + x.buf.length, 0) + MARGEN_REGISTRO_BYTES,
    reemplazaBytes: nuevos.reduce((s, x) => s + (l.tam.get(x.clave) || 0), 0), topeBytes: topeBaseBytes(env),
    opsMes: ops, opsNecesarias: { a: nuevos.length + 1, b: 0 } });
  if (!d.ok) {
    await escribirRegistro(c, mes, reg.etag, ops);         // el rechazo también gasta: se anota
    const e = new Error(`NO SE SUBIÓ: ${d.motivo}`); e.tope = true; throw e;
  }
  // Reserva ANTES de gastar: lo medido + los PUT de datos + el PUT final del registro.
  const reservado = { a: ops.a + nuevos.length + 1, b: ops.b };
  let etag;
  try { etag = await escribirRegistro(c, mes, reg.etag, { ...reservado, reserva_bytes: d.usadoTras }); }
  catch (e) { if (/otra corrida/.test(e.message)) await anotarGasto(c, mes, { a: l.paginas + 1, b: 1 }); throw e; }
  for (const x of nuevos) {
    const r = await c.pedir("PUT", x.clave, { cuerpo: x.buf, extra: { "content-type": x.clave.endsWith(".json") ? "application/json" : "application/gzip", "x-amz-storage-class": "STANDARD" } });
    if (!r.ok) { const e = new Error(`subir «${x.clave}» respondió ${r.status} (la reserva ya cuenta sus operaciones)`); e.status = r.status; throw e; }
  }
  await escribirRegistro(c, mes, etag, reservado);
  return { subidos: nuevos.map((x) => x.clave), usado_mb: +(d.usadoTras / MB).toFixed(3), tope_mb: topeBaseBytes(env) / MB, ops: reservado };
}

if (require.main === module) {
  const [orden, carpeta, prefijo] = process.argv.slice(2);
  const falta = faltan();
  if (falta.length) { console.error(`Faltan variables del almacén: ${falta.join(", ")}`); process.exit(2); }
  (orden === "subir" ? subir(carpeta, prefijo) : medir())
    .then((r) => console.log(JSON.stringify(r, null, 1)))
    .catch((e) => { console.error(e.message); process.exit(e.tope ? 3 : 1); });
}

module.exports = { decidirSubida, topeBaseBytes, decodXml, MB, TOPE_CUENTA_MB, COPIA_TOPE_MB, TOPE_BASE_MB_MAX, TOPES_OPS_MES, GRATIS_OPS_MES,
  MARGEN_REGISTRO_BYTES, MAX_PAGINAS, CLAVE_REGISTRO, subir, medir };
