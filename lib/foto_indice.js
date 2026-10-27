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
/* Un almacén que NO CONTESTA (se colgó la conexión, no un 403 ni un 500: esos responden al
   instante) hace esperar TIMEOUT_LEER_MS a cada lector en frío, uno tras otro. Tras el primero, la
   instancia deja de preguntarle durante PAUSA_MS y va directo a Redis, como sin almacén. */
const PAUSA_MS = 5 * 60000;
/* La copia nocturna que intentó rehacer una foto y no pudo subirla no vuelve a leer el índice
   entero (~26 MB de Upstash) cada noche: espera ESPERA_TRAS_FALLO_SEG, salvo `forzar`. */
const ESPERA_TRAS_FALLO_SEG = 7 * 86400;

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

let _pausaHasta = 0;
const enPausa = (ahoraMs = Date.now()) => _pausaHasta > ahoraMs;

/* LA CLAVE PEQUEÑA NO SE BORRA: SE VENCE. Lleva los bytes del archivo que hay en el almacén, y el
   tope de lo ocupado los suma; borrada, esos bytes pasaban a contar 0 con el archivo todavía allí
   («sin dato» ≠ «cero»). Vencida (`sello: null`), ningún lector la usa y la copia nocturna la
   rehace. Que la clave no exista quiere decir que nunca se subió ese archivo: ahí sí es 0. */
async function vencer(redis, claveFoto, previo, motivo, bytesPosibles = 0) {
  const bytes = Math.max(previo && natural(previo.bytes) ? previo.bytes : 0, natural(bytesPosibles) ? bytesPosibles : 0);
  if (!previo && !bytesPosibles) { await redis.del(claveFoto); return; }
  await redis.set(claveFoto, JSON.stringify({ ...(previo || {}), formato: FORMATO, sello: null, bytes, vencida: motivo }));
}

/* Cómo salió lo último en ESTA instancia (op=salud lo repite sin gastar comandos). */
const _ultimaLectura = {};
const _ultimaEscritura = {};
function nota(nombre, hashes, motivo, detalle = null) {
  _ultimaLectura[nombre] = { fuente: hashes ? "almacen" : "redis", motivo: hashes ? null : motivo, detalle, ts: new Date().toISOString() };
  return hashes;
}

/* LA DECISIÓN DE SUBIR, una sola para la publicación y para la copia nocturna: la de la base
   nacional (decidirSubida), con el tope de la foto. `nuevosBytes` es el archivo hecho al subir y,
   ANTES de leer el hash para rehacerlo, el del archivo al que reemplazaría (lo único que se sabe
   sin leer). Devuelve también lo leído de las claves pequeñas, que quien llama reutiliza. */
async function decidir(redis, nombre, nuevosBytes, ahora) {
  // require DIFERIDO: la guarda vive con la base nacional y solo hace falta al subir
  const { decidirSubida } = require("../scripts/base_obra/almacen.js");
  const [registros, opsMes] = await Promise.all([redis.mget(NOMBRES.map((n) => CLAVES.fotoIndice(n))), opsDelMes(redis, mesUTC(ahora))]);
  const previos = (registros || []).map(parsear);
  const bytesDe = (r) => (r && natural(r.bytes) ? r.bytes : 0);   // sin clave = nunca se subió (0 de verdad: ver `vencer`)
  const propio = bytesDe(previos[NOMBRES.indexOf(nombre)]);
  const d = decidirSubida({
    usadoBytes: previos.reduce((s, r) => s + bytesDe(r), 0), nuevosBytes: nuevosBytes == null ? propio : nuevosBytes, reemplazaBytes: propio,
    topeBytes: FOTOS_TOPE_MB * MB, opsMes, opsNecesarias: { a: 1, b: 0 }, topesOps: FOTOS_TOPES_OPS,
  });
  return { d, previo: previos[NOMBRES.indexOf(nombre)] || null };
}
// un fallo SIN código de estado es que el almacén no contestó (red, tiempo agotado, cuerpo a goteo)
const pausarSiNoContesto = (e) => { if (!(e && e.status)) _pausaHasta = Date.now() + PAUSA_MS; };

/* Sube la foto. `hashes`: { claveDeRedis: { campo: valor } } con los valores que se pasaron al
   HSET. Nunca lanza: devuelve { escrita, motivo }; quien publica el índice sigue igual.
   ORDEN: primero el archivo, después la clave pequeña que lo describe. Al revés, un corte entre
   los dos dejaba una clave con el sello nuevo apuntando al archivo viejo. */
async function escribirFoto(redis, nombre, sello, hashes, { env = process.env, ahora = new Date() } = {}) {
  const objetos = objetosDelEntorno(env, TIMEOUT_SUBIR_MS);
  if (!objetos) return { escrita: false, motivo: "sin_almacen" };
  const claveFoto = CLAVES.fotoIndice(nombre);
  const anotar = (r) => { _ultimaEscritura[nombre] = { ...r, ts: ahora.toISOString() }; return r; };
  // la clave vieja no casa con la meta nueva: los lectores van a Redis y la copia nocturna la rehace
  if (enPausa()) return anotar({ escrita: false, motivo: "almacen_en_pausa" });
  let previo, leido = false, archivo = null, subiendo = false;
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
    archivo = zlib.gzipSync(Buffer.from(JSON.stringify(cuerpo), "utf8"), { level: 6 });
    const { d, previo: p } = await decidir(redis, nombre, archivo.length, ahora);
    previo = p; leido = true;
    if (!d.ok) {
      await vencer(redis, claveFoto, previo, "tope");   // los lectores van a Redis
      return anotar({ escrita: false, motivo: "tope", detalle: d.motivo });
    }
    await reservar(redis, mesUTC(ahora), "a");
    subiendo = true;
    try { await objetos.poner(objetoDe(nombre), archivo, "application/gzip", { "x-amz-storage-class": "STANDARD" }); }
    catch (e) { pausarSiNoContesto(e); throw e; }
    const registro = { formato: FORMATO, sello, objeto: objetoDe(nombre), bytes: archivo.length, sha256: sha256(archivo), campos, escrita: ahora.toISOString() };
    await redis.set(claveFoto, JSON.stringify(registro));
    return anotar({ escrita: true, motivo: null, bytes: archivo.length });
  } catch (e) {
    // si el PUT llegó a salir, en el almacén puede estar el archivo nuevo: cuentan los bytes mayores
    try {
      if (!leido) previo = parsear(await redis.get(claveFoto));
      await vencer(redis, claveFoto, previo || null, "fallo", subiendo && archivo ? archivo.length : 0);
    } catch { /* la clave vieja no casa con la meta nueva: igual se lee de Redis */ }
    return anotar({ escrita: false, motivo: "fallo", detalle: tachar(e && e.message) });
  }
}

/* La foto, si casa con `sello`; null si no (y el motivo queda anotado). */
async function leerFoto(redis, nombre, sello, { env = process.env, ahora = new Date(), timeoutMs = TIMEOUT_LEER_MS } = {}) {
  const objetos = objetosDelEntorno(env, timeoutMs);
  if (!objetos) return nota(nombre, null, "sin_almacen");
  if (typeof sello !== "string" || !sello) return nota(nombre, null, "sin_sello");
  if (enPausa()) return nota(nombre, null, "almacen_en_pausa");   // ni un comando de más: Redis, como sin almacén
  const claveFoto = CLAVES.fotoIndice(nombre);
  try {
    const registro = parsear(await redis.get(claveFoto));
    if (!registro) return nota(nombre, null, "sin_foto");
    if (registro.formato !== FORMATO || registro.sello !== sello || registro.objeto !== objetoDe(nombre)) return nota(nombre, null, "foto_vieja");
    /* UNA CLAVE QUE PROMETE UN ARCHIVO QUE NO ESTÁ, O QUE NO ES ESE, SE VENCE. Sin esto quedaba
       «al día» para siempre (op=salud y la copia nocturna solo miran el sello) y cada lectura en frío
       pagaba el GET al almacén más la lectura entera de Redis: dos escritores cruzados (la
       publicación y la copia nocturna, archivo de uno y clave del otro) o un archivo borrado. Solo
       se vence si nadie la cambió entretanto; vencida, la copia nocturna la rehace. */
    const defecto = async (motivo) => {
      try {
        const ahoraReg = parsear(await redis.get(claveFoto));
        if (ahoraReg && ahoraReg.sello === registro.sello && ahoraReg.sha256 === registro.sha256) await vencer(redis, claveFoto, ahoraReg, motivo);
      } catch { /* la próxima lectura lo vuelve a intentar */ }
      return nota(nombre, null, motivo);
    };
    const usadas = await reservar(redis, mesUTC(ahora), "b");
    if (!(usadas <= FOTOS_TOPES_OPS.b)) return nota(nombre, null, "tope_del_mes");
    let archivo;
    try { archivo = await objetos.traer(objetoDe(nombre)); }
    catch (e) { pausarSiNoContesto(e); throw e; }
    if (!archivo) return defecto("sin_archivo");
    if (archivo.length !== registro.bytes || sha256(archivo) !== registro.sha256) return defecto("huella_distinta");
    const cuerpo = parsear(zlib.gunzipSync(archivo).toString("utf8"));
    if (!cuerpo || cuerpo.formato !== FORMATO || cuerpo.nombre !== nombre || cuerpo.sello !== sello
      || !cuerpo.hashes || typeof cuerpo.hashes !== "object") return defecto("foto_ilegible");
    const campos = registro.campos && typeof registro.campos === "object" ? registro.campos : {};
    for (const [clave, n] of Object.entries(campos)) {
      const h = cuerpo.hashes[clave];
      if (!h || typeof h !== "object" || Object.keys(h).length !== n) return defecto("foto_ilegible");
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
   LO QUE IMPIDE SUBIR SE MIRA ANTES DE LEER (revisión adversaria, 27-oct-2026): leía el índice
   entero (~26 MB de Upstash) y DESPUÉS descubría el tope del mes, el contador ilegible o la guarda
   que no carga, y así cada noche. Ahora, antes de leer: el almacén en pausa, la guarda, el tope
   (con el tamaño del archivo que reemplazaría) y, si la última vez no se pudo subir, la espera de
   ESPERA_TRAS_FALLO_SEG (`forzar` la salta).
   `fuentes` las da cada índice (`FUENTE_FOTO` de lib/indice_competencia y lib/indice_baja):
   este módulo NO los requiere, ni diferido, porque la cadena de lib/filtros llega hasta aquí y
   no puede alcanzar lib/indice_baja (la suite lo comprueba sobre el grafo de requires). */
async function asegurarFotos(redis, fuentes, { env = process.env, forzar = false, ahora = new Date() } = {}) {
  if (!hayAlmacen(env)) return null;
  const out = {};
  for (const f of fuentes) {
    try {
      const meta = await f.leerMeta(redis);
      if (!meta) { out[f.nombre] = { hecho: "sin_indice" }; continue; }
      const sello = f.selloDe(meta);
      const registro = parsear(await redis.get(CLAVES.fotoIndice(f.nombre)));
      if (registro && registro.formato === FORMATO && registro.sello === sello) { out[f.nombre] = { hecho: "al_dia" }; continue; }
      if (enPausa()) { out[f.nombre] = { hecho: "no_escrita", motivo: "almacen_en_pausa", detalle: null }; continue; }
      const espera = forzar ? null : await redis.get(CLAVES.fotoIndiceEspera(f.nombre));
      if (espera != null) { out[f.nombre] = { hecho: "en_espera", detalle: String(espera).slice(0, 160) }; continue; }
      let antes;
      try { antes = await decidir(redis, f.nombre, null, ahora); }
      catch (e) { out[f.nombre] = { hecho: "no_escrita", motivo: "fallo", detalle: tachar(e && e.message) }; continue; }
      if (!antes.d.ok) { out[f.nombre] = { hecho: "no_escrita", motivo: "tope", detalle: antes.d.motivo }; continue; }
      const crudos = await Promise.all(f.claves.map((k) => redis.hgetallPorPartes(k)));
      const despues = await f.leerMeta(redis);
      if (!despues || f.selloDe(despues) !== sello) { out[f.nombre] = { hecho: "cambio_mientras_se_leia" }; continue; }
      const r = await escribirFoto(redis, f.nombre, sello, Object.fromEntries(f.claves.map((k, i) => [k, crudos[i] || {}])), { env, ahora });
      if (!r.escrita) {
        try { await redis.set(CLAVES.fotoIndiceEspera(f.nombre), `${r.motivo}${r.detalle ? `: ${r.detalle}` : ""}`.slice(0, 200), { ex: ESPERA_TRAS_FALLO_SEG }); }
        catch { /* sin la espera, la próxima noche lo intenta de nuevo */ }
      }
      out[f.nombre] = r.escrita ? { hecho: "escrita", bytes: r.bytes } : { hecho: "no_escrita", motivo: r.motivo, detalle: r.detalle || null };
    } catch (e) {
      out[f.nombre] = { hecho: "fallo", detalle: tachar(e && e.message) };
    }
  }
  return out;
}

module.exports = {
  FORMATO, NOMBRES, objetoDe, FOTOS_TOPE_MB, FOTOS_TOPES_OPS, TIMEOUT_LEER_MS, TIMEOUT_SUBIR_MS, PAUSA_MS, ESPERA_TRAS_FALLO_SEG,
  hayAlmacen, escribirFoto, leerFoto, leerHashes, opsDelMes, asegurarFotos,
  pausaHasta: () => (enPausa() ? new Date(_pausaHasta).toISOString() : null),
  reiniciarPausa: () => { _pausaHasta = 0; },   // la suite: cada caso empieza con el almacén contestando
  ultimaLectura: (nombre) => _ultimaLectura[nombre] || null,
  ultimaEscritura: (nombre) => _ultimaEscritura[nombre] || null,
};
