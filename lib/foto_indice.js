/* ============================================================================
   lib/foto_indice · Los índices enteros, servidos desde el almacén de archivos
   ----------------------------------------------------------------------------
   Para qué existe (27-oct-2026): el plan gratis de Upstash da 10 GB al mes de
   ancho de banda y el 26-oct-2026 iban gastados 9. Cada instancia fría del
   listado baja ENTEROS el índice de competencia y los cuatro de baja (HSCAN,
   lib/redis.hgetallPorPartes): unos 26 MB medidos en memoria de Redis
   (`op=espacio`, 26-oct-2026), y lo mismo la portada al reconstruirse, el
   resumen del perfil y el diagnóstico. El almacén de archivos (Cloudflare R2,
   lib/objetos) no cobra la salida, así que la lectura entera se sirve de ahí.

   Qué hace:
     · al PUBLICAR un índice (lib/indice_competencia.construirIndice,
       lib/indice_baja.construirIndiceBaja), DESPUÉS de su meta, sube una foto
       comprimida de sus hashes a `indices/<nombre>.json.gz`, campo a campo con
       el MISMO texto que el HSET dejó en Redis (lib/redis.textoDeCampo), y deja
       en Redis una clave PEQUEÑA (`indice:foto:<nombre>`) con el sello de la
       meta, el SHA-256 y los bytes del archivo y cuántos campos trae cada hash;
     · al LEER, solo si hay almacén y esa clave trae el MISMO sello que la meta
       vigente, baja el archivo y comprueba bytes, huella, sello y conteos.
       Cualquier otra cosa —sin almacén, sin foto, sello distinto, huella
       distinta, almacén caído o lento, tope del mes— lee de Redis exactamente
       como antes: la foto ahorra ancho de banda, jamás decide una cifra.
   Sin las variables OBJETOS_* no gasta ni un comando de Redis de más.

   Tope (Cloudflare no corta el gasto, MEMORIA 17-oct-2026): la decisión es la
   MISMA de la base nacional (scripts/base_obra/almacen.decidirSubida), con su
   tope propio: la foto ocupa como mucho FOTOS_TOPE_MB (parte de los 5.000 MB
   reservados a la copia nocturna) y gasta como mucho FOTOS_TOPES_OPS al mes;
   las operaciones se cuentan en Redis ANTES de gastarlas. Los objetos tienen
   clave fija (se sobrescriben), así que lo ocupado no crece con las
   publicaciones.
   ========================================================================== */
"use strict";

const zlib = require("zlib");
const { CLAVES } = require("./almacen.js");
const { hayCredencialesObjetos, crearObjetos, sha256, tachar: tacharClave } = require("./objetos.js");
const { textoDeCampo } = require("./redis.js");

const FORMATO = 1;
const NOMBRES = Object.freeze(["competencia", "baja"]);
const objetoDe = (nombre) => `indices/${nombre}.json.gz`;
const MB = 1e6;
const FOTOS_TOPE_MB = 200;                              // de los 5.000 MB de la copia nocturna (COPIA_TOPE_MB)
const FOTOS_TOPES_OPS = Object.freeze({ a: 20000, b: 500000 });   // 2 % y 5 % de lo gratis al mes
const TIMEOUT_LEER_MS = 10000;                          // si tarda más, Redis como siempre
const TIMEOUT_SUBIR_MS = 30000;
const TTL_CONTADOR_SEG = 40 * 86400;

const mesUTC = (d) => d.toISOString().slice(0, 7);
const natural = (x) => typeof x === "number" && Number.isSafeInteger(x) && x >= 0;
// el censo de secretos es UNO (lib/apu_ocr.tacharClave); se llama por lib/objetos, que ya lo cruza
const tachar = (texto) => tacharClave(String(texto || "")).slice(0, 160);

const hayAlmacen = (env = process.env) => hayCredencialesObjetos(env);
function objetosDelEntorno(env, timeoutMs) {
  if (!hayCredencialesObjetos(env)) return null;
  try { return crearObjetos(env, { timeoutMs }); } catch { return null; }   // un endpoint ilegible es «sin almacén»
}
function parsear(v) {
  if (v == null) return null;
  try { const j = typeof v === "string" ? JSON.parse(v) : v; return j && typeof j === "object" ? j : null; } catch { return null; }
}

/* Lo gastado en el mes, del contador de Redis. Un campo que falta es 0 (mes nuevo); uno que no
   es un entero ≥ 0 es «no se pudo leer» (null), y la decisión niega. */
async function opsDelMes(redis, mes) {
  const h = (await redis.hgetall(CLAVES.fotoIndiceOps(mes))) || {};
  const leer = (v) => (v == null ? 0 : /^\d+$/.test(String(v)) ? Number(v) : null);
  const a = leer(h.a), b = leer(h.b);
  return a == null || b == null ? null : { a, b };
}
/* La reserva va ANTES de gastar (la regla de la base): se suma y después se pide. */
async function reservar(redis, mes, clase) {
  const k = CLAVES.fotoIndiceOps(mes);
  const n = Number(await redis.hincrby(k, clase, 1));
  if (n === 1) await redis.expire(k, TTL_CONTADOR_SEG);
  return n;
}

/* Cómo salió lo último en ESTA instancia (op=salud lo repite sin gastar comandos). */
const _ultimaLectura = {};
const _ultimaEscritura = {};
function nota(nombre, hashes, motivo, detalle = null) {
  _ultimaLectura[nombre] = { fuente: hashes ? "almacen" : "redis", motivo: hashes ? null : motivo, detalle, ts: new Date().toISOString() };
  return hashes;
}

/* Sube la foto. `hashes`: { claveDeRedis: { campo: valor } } con los valores que se pasaron al
   HSET. Nunca lanza: devuelve { escrita, motivo }; quien publica el índice sigue igual. */
async function escribirFoto(redis, nombre, sello, hashes, { env = process.env, ahora = new Date() } = {}) {
  const objetos = objetosDelEntorno(env, TIMEOUT_SUBIR_MS);
  if (!objetos) return { escrita: false, motivo: "sin_almacen" };
  const claveFoto = CLAVES.fotoIndice(nombre);
  const anotar = (r) => { _ultimaEscritura[nombre] = { ...r, ts: ahora.toISOString() }; return r; };
  try {
    if (!NOMBRES.includes(nombre) || typeof sello !== "string" || !sello || !hashes || typeof hashes !== "object") {
      throw new Error("foto sin nombre conocido, sin sello o sin hashes");
    }
    const cuerpo = { formato: FORMATO, nombre, sello, hashes: {} };
    const campos = {};
    for (const [clave, hash] of Object.entries(hashes)) {
      const plano = {};
      for (const [c, v] of Object.entries(hash || {})) plano[c] = textoDeCampo(v);
      cuerpo.hashes[clave] = plano;
      campos[clave] = Object.keys(plano).length;
    }
    const archivo = zlib.gzipSync(Buffer.from(JSON.stringify(cuerpo), "utf8"), { level: 6 });
    // require DIFERIDO: la guarda vive con la base nacional y solo hace falta al subir
    const { decidirSubida } = require("../scripts/base_obra/almacen.js");
    const mes = mesUTC(ahora);
    const [registros, opsMes] = await Promise.all([redis.mget(NOMBRES.map((n) => CLAVES.fotoIndice(n))), opsDelMes(redis, mes)]);
    const previos = (registros || []).map(parsear);
    const bytesDe = (r) => (r && natural(r.bytes) ? r.bytes : 0);
    const usadoBytes = previos.reduce((s, r) => s + bytesDe(r), 0);
    const d = decidirSubida({
      usadoBytes, nuevosBytes: archivo.length, reemplazaBytes: bytesDe(previos[NOMBRES.indexOf(nombre)]),
      topeBytes: FOTOS_TOPE_MB * MB, opsMes, opsNecesarias: { a: 1, b: 0 }, topesOps: FOTOS_TOPES_OPS,
    });
    if (!d.ok) {
      await redis.del(claveFoto);   // sin foto al día, los lectores van a Redis
      return anotar({ escrita: false, motivo: "tope", detalle: d.motivo });
    }
    await reservar(redis, mes, "a");
    await objetos.poner(objetoDe(nombre), archivo, "application/gzip", { "x-amz-storage-class": "STANDARD" });
    const registro = { formato: FORMATO, sello, objeto: objetoDe(nombre), bytes: archivo.length, sha256: sha256(archivo), campos, escrita: ahora.toISOString() };
    await redis.set(claveFoto, JSON.stringify(registro));
    return anotar({ escrita: true, motivo: null, bytes: archivo.length });
  } catch (e) {
    try { await redis.del(claveFoto); } catch { /* la clave vieja no casa con la meta nueva: igual se lee de Redis */ }
    return anotar({ escrita: false, motivo: "fallo", detalle: tachar(e && e.message) });
  }
}

/* La foto, si casa con `sello`; null si no (y el motivo queda anotado). */
async function leerFoto(redis, nombre, sello, { env = process.env, ahora = new Date(), timeoutMs = TIMEOUT_LEER_MS } = {}) {
  const objetos = objetosDelEntorno(env, timeoutMs);
  if (!objetos) return nota(nombre, null, "sin_almacen");
  if (typeof sello !== "string" || !sello) return nota(nombre, null, "sin_sello");
  try {
    const registro = parsear(await redis.get(CLAVES.fotoIndice(nombre)));
    if (!registro) return nota(nombre, null, "sin_foto");
    if (registro.formato !== FORMATO || registro.sello !== sello || registro.objeto !== objetoDe(nombre)) return nota(nombre, null, "foto_vieja");
    const usadas = await reservar(redis, mesUTC(ahora), "b");
    if (!(usadas <= FOTOS_TOPES_OPS.b)) return nota(nombre, null, "tope_del_mes");
    const archivo = await objetos.traer(objetoDe(nombre));
    if (!archivo) return nota(nombre, null, "sin_archivo");
    if (archivo.length !== registro.bytes || sha256(archivo) !== registro.sha256) return nota(nombre, null, "huella_distinta");
    const cuerpo = parsear(zlib.gunzipSync(archivo).toString("utf8"));
    if (!cuerpo || cuerpo.formato !== FORMATO || cuerpo.nombre !== nombre || cuerpo.sello !== sello
      || !cuerpo.hashes || typeof cuerpo.hashes !== "object") return nota(nombre, null, "foto_ilegible");
    const campos = registro.campos && typeof registro.campos === "object" ? registro.campos : {};
    for (const [clave, n] of Object.entries(campos)) {
      const h = cuerpo.hashes[clave];
      if (!h || typeof h !== "object" || Object.keys(h).length !== n) return nota(nombre, null, "foto_ilegible");
    }
    return nota(nombre, cuerpo.hashes, null);
  } catch (e) {
    return nota(nombre, null, "fallo", tachar(e && e.message));
  }
}

/* Los hashes `claves`, en ese orden, cada uno como lo devuelve redis.hgetallPorPartes: desde la
   foto si casa con `sello` y los trae TODOS; si no, de Redis. */
async function leerHashes(redis, nombre, sello, claves) {
  const foto = await leerFoto(redis, nombre, sello);
  if (foto && claves.every((k) => foto[k] && typeof foto[k] === "object")) return claves.map((k) => ({ ...foto[k] }));
  if (foto) nota(nombre, null, "foto_incompleta");
  return Promise.all(claves.map((k) => redis.hgetallPorPartes(k)));
}

/* LA FOTO QUE FALTA O QUEDÓ VIEJA SE REHACE DESDE EL HASH PUBLICADO. La publicación la sube sola,
   pero el índice de competencia solo se reconstruye con el refresco del histórico (semanas), y una
   subida que falló no se reintenta. La copia nocturna (op=respaldo) llama a esto: si la clave
   pequeña no trae el sello de la meta, lee el hash UNA vez —lo mismo que gastaría una instancia
   fría— y sube la foto. Si la meta cambia mientras se lee, no sube nada. Nunca lanza.
   `fuentes` las da cada índice (`FUENTE_FOTO` de lib/indice_competencia y lib/indice_baja):
   este módulo NO los requiere, ni diferido, porque la cadena de lib/filtros llega hasta aquí y
   no puede alcanzar lib/indice_baja (la suite lo comprueba sobre el grafo de requires). */
async function asegurarFotos(redis, fuentes, { env = process.env } = {}) {
  if (!hayAlmacen(env)) return null;
  const out = {};
  for (const f of fuentes) {
    try {
      const meta = await f.leerMeta(redis);
      if (!meta) { out[f.nombre] = { hecho: "sin_indice" }; continue; }
      const sello = f.selloDe(meta);
      const registro = parsear(await redis.get(CLAVES.fotoIndice(f.nombre)));
      if (registro && registro.formato === FORMATO && registro.sello === sello) { out[f.nombre] = { hecho: "al_dia" }; continue; }
      const crudos = await Promise.all(f.claves.map((k) => redis.hgetallPorPartes(k)));
      const despues = await f.leerMeta(redis);
      if (!despues || f.selloDe(despues) !== sello) { out[f.nombre] = { hecho: "cambio_mientras_se_leia" }; continue; }
      const r = await escribirFoto(redis, f.nombre, sello, Object.fromEntries(f.claves.map((k, i) => [k, crudos[i] || {}])), { env });
      out[f.nombre] = r.escrita ? { hecho: "escrita", bytes: r.bytes } : { hecho: "no_escrita", motivo: r.motivo, detalle: r.detalle || null };
    } catch (e) {
      out[f.nombre] = { hecho: "fallo", detalle: tachar(e && e.message) };
    }
  }
  return out;
}

module.exports = {
  FORMATO, NOMBRES, objetoDe, FOTOS_TOPE_MB, FOTOS_TOPES_OPS, TIMEOUT_LEER_MS, TIMEOUT_SUBIR_MS,
  hayAlmacen, escribirFoto, leerFoto, leerHashes, opsDelMes, asegurarFotos,
  ultimaLectura: (nombre) => _ultimaLectura[nombre] || null,
  ultimaEscritura: (nombre) => _ultimaEscritura[nombre] || null,
};
