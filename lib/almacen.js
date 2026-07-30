/* ============================================================================
   lib/almacen · Esquema de claves Redis + compresión de chunks
   ----------------------------------------------------------------------------
   Patrón de claves (todo lo del dominio bajo el prefijo licitaciones:):

     licitaciones:meta                    JSON {last_full,last_sync,total,porMes,…}
     licitaciones:progreso                JSON cursor reanudable de la carga full
     licitaciones:mes:{YYYY-MM}:manifest  JSON {sig,count,updatedAt}  (sig = índice
                                          libre para el próximo chunk del mes)
     licitaciones:mes:{YYYY-MM}:chunk:{i} base64(zlib.deflate(JSON[registros]))
     lock:sync                            candado de sincronización (TTL 300 s)

   Cada chunk se comprime con zlib.deflate nivel 6 y se parte recursivamente
   hasta que el binario comprimido quede ≤ 500 KB (límite del requerimiento;
   el base64 resultante ≈ 667 KB queda bajo el tope de 1 MB por valor del tier
   gratuito de Upstash). La lectura tolera chunks duplicados o a medio
   compactar: /api/oportunidades deduplica por id quedándose con el
   :updated_at más reciente.
   ========================================================================== */
"use strict";

const zlib = require("zlib");

const PREFIJO = "licitaciones:";
const CLAVES = {
  meta: PREFIJO + "meta",
  progreso: PREFIJO + "progreso",
  lock: "lock:sync",
  patronChunks: PREFIJO + "mes:*:chunk:*",
  patronTodo: PREFIJO + "*",
  manifest: (mes) => `${PREFIJO}mes:${mes}:manifest`,
  chunk: (mes, i) => `${PREFIJO}mes:${mes}:chunk:${i}`,
};

const LOCK_TTL_SEG = 300;          // candado con TTL: nunca queda atascado
const CHUNK_MAX_COMPRIMIDO = 500000; // 500 KB comprimidos por chunk (requerimiento)

function comprimir(registros) {
  return zlib.deflateSync(Buffer.from(JSON.stringify(registros), "utf8"), { level: 6 }).toString("base64");
}
function descomprimir(b64) {
  if (b64 == null) return null;
  try {
    return JSON.parse(zlib.inflateSync(Buffer.from(String(b64), "base64")).toString("utf8"));
  } catch {
    return null; // chunk corrupto: mejor perder un chunk que tumbar la consulta
  }
}

/* Parte `registros` en paquetes base64 cuyo binario comprimido ≤ 500 KB. */
function empaquetar(registros) {
  const b64 = comprimir(registros);
  if (Buffer.byteLength(b64, "base64") <= CHUNK_MAX_COMPRIMIDO) return [b64];
  if (registros.length <= 1) {
    // un único registro que no cabe ni solo: recortar campos largos
    const r = { ...registros[0] };
    for (const c of ["descripcion", "nombre", "descripci_n_del_procedimiento", "nombre_del_procedimiento"]) {
      if (typeof r[c] === "string" && r[c].length > 400) r[c] = r[c].slice(0, 400) + "…";
    }
    const b2 = comprimir([r]);
    return Buffer.byteLength(b2, "base64") <= CHUNK_MAX_COMPRIMIDO ? [b2] : [];
  }
  const mitad = Math.ceil(registros.length / 2);
  return empaquetar(registros.slice(0, mitad)).concat(empaquetar(registros.slice(mitad)));
}

async function leerJSON(redis, k) {
  const v = await redis.get(k);
  if (v == null) return null;
  try { return JSON.parse(v); } catch { return null; }
}
const escribirJSON = (redis, k, obj) => redis.set(k, JSON.stringify(obj));

module.exports = {
  PREFIJO, CLAVES, LOCK_TTL_SEG, CHUNK_MAX_COMPRIMIDO,
  comprimir, descomprimir, empaquetar, leerJSON, escribirJSON,
};
