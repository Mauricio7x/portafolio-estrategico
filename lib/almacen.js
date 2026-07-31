/* ============================================================================
   lib/almacen · Esquema de claves Redis + compresión de chunks
   ----------------------------------------------------------------------------
   El corpus vive partido en DOS keyspaces con ciclos de vida opuestos:

     ACTIVO     lo que la app sirve hoy (procesos abiertos del año vigente).
                Se PURGA: la full de higiene mensual lo reescribe entero y la
                compactación descarta lo que ya cerró.
     HISTÓRICO  memoria de largo plazo (procesos cerrados/adjudicados, con los
                datos de adjudicación). NUNCA se purga: es la materia prima del
                índice de competencia por entidad (lib/indice_competencia.js).

   Patrón de claves:

     licitaciones:meta                             JSON {last_full,last_sync,…}
     licitaciones:progreso                         JSON cursor de la full
     licitaciones:activo:mes:{YYYY-MM}:manifest    JSON {base,sig,count,…}
     licitaciones:activo:mes:{YYYY-MM}:chunk:{i}   base64(deflate(JSON[]))
     licitaciones:historico:mes:{YYYY-MM}:manifest JSON {base,sig,count,…}
     licitaciones:historico:mes:{YYYY-MM}:chunk:{i} base64(deflate(JSON[]))
     sync:historico:progreso                       JSON cursor de la extracción histórica
     sync:historico:meta                           JSON resumen de la última extracción
     indice:competencia                            HASH entidad → JSON de métricas
     indice:competencia:meta                       JSON {construido, cortes, …}
     indice:competencia:progreso                   JSON acumulador reanudable
     lock:sync                                     candado de sincronización (TTL 300 s)
     lock:sync:historico                           candado de la histórica  (TTL 600 s)

   `licitaciones:mes:*` es el patrón LEGADO (anterior a la separación activo/
   histórico); la full lo purga al terminar para no pagar Redis por un corpus
   que ya nadie lee.

   Cada chunk se comprime con zlib.deflate nivel 6 y se parte recursivamente
   hasta que el binario comprimido quede ≤ 500 KB (el base64 resultante ≈ 667 KB
   queda bajo el tope de 1 MB por valor de Upstash). La lectura tolera chunks
   duplicados o a medio compactar: se deduplica por `_k` quedándose con el
   `:updated_at` más reciente.
   ========================================================================== */
"use strict";

const zlib = require("zlib");

const PREFIJO = "licitaciones:";
const PREFIJO_ACTIVO = PREFIJO + "activo:mes:";
const PREFIJO_HISTORICO = PREFIJO + "historico:mes:";

const CLAVES = {
  meta: PREFIJO + "meta",
  progreso: PREFIJO + "progreso",
  lock: "lock:sync",

  /* ---------- activo (lo que sirve /api/oportunidades) ---------- */
  manifest: (mes) => `${PREFIJO_ACTIVO}${mes}:manifest`,
  chunk: (mes, i) => `${PREFIJO_ACTIVO}${mes}:chunk:${i}`,
  patronChunks: `${PREFIJO_ACTIVO}*:chunk:*`,
  patronMeses: `${PREFIJO_ACTIVO}*`,          // manifests + chunks de todos los meses
  mesDeClaveActiva: (k) => (String(k).match(/^licitaciones:activo:mes:(\d{4}-\d{2}):/) || [])[1] || null,

  /* ---------- histórico (memoria de largo plazo, jamás se purga) ---------- */
  histManifest: (mes) => `${PREFIJO_HISTORICO}${mes}:manifest`,
  histChunk: (mes, i) => `${PREFIJO_HISTORICO}${mes}:chunk:${i}`,
  patronChunksHist: `${PREFIJO_HISTORICO}*:chunk:*`,
  patronMesesHist: `${PREFIJO_HISTORICO}*`,
  mesDeClaveHist: (k) => (String(k).match(/^licitaciones:historico:mes:(\d{4}-\d{2}):/) || [])[1] || null,

  /* ---------- extracción histórica e índice de competencia ---------- */
  progresoHistorico: "sync:historico:progreso",
  metaHistorico: "sync:historico:meta",
  lockHistorico: "lock:sync:historico",
  indice: "indice:competencia",
  indiceNuevo: "indice:competencia:nuevo",   // se construye aquí y se renombra (swap atómico)
  indiceMeta: "indice:competencia:meta",
  indiceProgreso: "indice:competencia:progreso",

  /* ---------- corpus legado, previo a la separación activo/histórico ---------- */
  patronLegado: `${PREFIJO}mes:*`,

  patronTodo: PREFIJO + "*",
};

const LOCK_TTL_SEG = 300;            // candado de /api/sync
const LOCK_HISTORICO_TTL_SEG = 600;  // candado de /api/sync/historico (encargo)
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

/* Escribe `registros` como chunks consecutivos desde `desdeIndice`.
   `claveDe(i)` construye la clave (activo o histórico). Devuelve el siguiente
   índice libre. */
async function escribirChunks(redis, claveDe, desdeIndice, registros) {
  let i = desdeIndice;
  for (const paquete of empaquetar(registros)) {
    await redis.set(claveDe(i), paquete);
    i++;
  }
  return i;
}

/* Lee un conjunto de claves de chunk y deduplica por `_k` (gana el
   `:updated_at` más reciente). Un mismo proceso puede vivir en varios chunks:
   el delta es append-only y las re-publicaciones regeneran los `:id`. */
async function leerChunksDedup(redis, claves, { lote = 8 } = {}) {
  const mapa = new Map();
  for (let i = 0; i < claves.length; i += lote) {
    const paquetes = await redis.mget(claves.slice(i, i + lote));
    for (const b of paquetes) {
      for (const r of (descomprimir(b) || [])) {
        const prev = mapa.get(r._k);
        if (!prev || (r[":updated_at"] || "") >= (prev[":updated_at"] || "")) mapa.set(r._k, r);
      }
    }
  }
  return [...mapa.values()];
}

async function leerJSON(redis, k) {
  const v = await redis.get(k);
  if (v == null) return null;
  try { return JSON.parse(v); } catch { return null; }
}
const escribirJSON = (redis, k, obj) => redis.set(k, JSON.stringify(obj));

/* JSON comprimido para valores grandes (acumulador del índice): mismo formato
   que un chunk, así respeta el tope de 1 MB por valor de Upstash. */
const escribirJSONComprimido = (redis, k, obj) => redis.set(k, comprimir(obj));
async function leerJSONComprimido(redis, k) {
  const v = await redis.get(k);
  return v == null ? null : descomprimir(v);
}

module.exports = {
  PREFIJO, CLAVES, LOCK_TTL_SEG, LOCK_HISTORICO_TTL_SEG, CHUNK_MAX_COMPRIMIDO,
  comprimir, descomprimir, empaquetar,
  escribirChunks, leerChunksDedup,
  leerJSON, escribirJSON, escribirJSONComprimido, leerJSONComprimido,
};
