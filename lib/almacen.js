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
     indice:detalle:{entidad}                      JSON comprimido, caché del detalle (TTL 1 h)
     equivalencias:unspsc                          JSON comprimido {claseB: [{clase:A,…}]}
     equivalencias:unspsc:meta                     JSON {construido, pares, umbrales…}
     equivalencias:unspsc:progreso                 JSON comprimido acumulador reanudable
     vocabulario:unspsc                            JSON comprimido {familias:{FFFF:[…]}}
     vocabulario:unspsc:meta                       JSON {construido, familias, …}
     config:experiencia                            JSON comprimido, contratos ya ejecutados
     config:experiencia:terminos                   JSON comprimido, vocabulario derivado
     config:experiencia:version                    JSON {version, cargado, contratos}
     cobertura:{perfil}:{exp|base}                 JSON comprimido, caché de la auditoría (TTL 1 h)
     lock:sync                                     candado de sincronización (TTL 300 s)
     lock:sync:historico                           candado de la histórica  (TTL 600 s)
     dictamen:{proceso}:{perfil}:{hash}            JSON comprimido, dictamen del pliego por versión (TTL 30 d; 1 h si quedó gris)
     lock:dictamen:{proceso}:{perfil}              candado de una lectura en curso (TTL = presupuesto de reloj + 10 s)
     dictamen:cuota:{YYYY-MM-DD}                   contador de dictámenes pedidos hoy (hora Colombia, TTL 2 d)
     dictamen:uso:{YYYY-MM}                        JSON {dictamenes, tokens, lista[]} del mes (TTL 13 meses)

   Los tres «conocimientos» derivados del corpus histórico (índice de
   competencia, equivalencias funcionales y vocabulario por familia) viven
   fuera de `licitaciones:*` a propósito: se reconstruyen sin re-extraer nada
   y ninguna purga del corpus los toca.

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
const { fechaOperable } = require("./habiles.js"); // habiles no requiere nada: no cierra ciclo

/* Instante de una fecha OPERABLE (lib/habiles.fechaOperable); NaN si falta o si
   su año es imposible — así la aritmética de prórroga la ignora en vez de
   tomarla como «cerraba antes». */
function instanteOperable(f) {
  return f && fechaOperable(String(f)) ? Date.parse(f) : NaN;
}

const PREFIJO = "licitaciones:";
const PREFIJO_ACTIVO = PREFIJO + "activo:mes:";
const PREFIJO_HISTORICO = PREFIJO + "historico:mes:";

const CLAVES = {
  meta: PREFIJO + "meta",
  progreso: PREFIJO + "progreso",
  lock: "lock:sync",
  /* CENSO DE DESCARTES DE LA INGESTA (lib/censo_ingesta, ago 2026). Un JSON
     pequeño con cuántos procesos tiró la cascada de ingesta, por motivo, y unos
     pocos ejemplos. Es la única forma de responder «¿por qué no está este
     proceso?» cuando el proceso nunca llegó al corpus — el embudo de
     /api/diagnostico solo ve lo ya guardado. */
  censoIngesta: PREFIJO + "censo_ingesta",

  /* ---------- activo (lo que sirve /api/oportunidades) ---------- */
  manifest: (mes) => `${PREFIJO_ACTIVO}${mes}:manifest`,
  chunk: (mes, i) => `${PREFIJO_ACTIVO}${mes}:chunk:${i}`,
  patronChunks: `${PREFIJO_ACTIVO}*:chunk:*`,
  patronChunksMes: (mes) => `${PREFIJO_ACTIVO}${mes}:chunk:*`,
  patronMeses: `${PREFIJO_ACTIVO}*`,          // manifests + chunks de todos los meses
  mesDeClaveActiva: (k) => (String(k).match(/^licitaciones:activo:mes:(\d{4}-\d{2}):/) || [])[1] || null,

  /* ---------- histórico (memoria de largo plazo, jamás se purga) ---------- */
  histManifest: (mes) => `${PREFIJO_HISTORICO}${mes}:manifest`,
  histChunk: (mes, i) => `${PREFIJO_HISTORICO}${mes}:chunk:${i}`,
  patronChunksHist: `${PREFIJO_HISTORICO}*:chunk:*`,
  patronChunksHistMes: (mes) => `${PREFIJO_HISTORICO}${mes}:chunk:*`,
  patronMesesHist: `${PREFIJO_HISTORICO}*`,
  mesDeClaveHist: (k) => (String(k).match(/^licitaciones:historico:mes:(\d{4}-\d{2}):/) || [])[1] || null,

  /* ---------- extracción histórica e índice de competencia ---------- */
  progresoHistorico: "sync:historico:progreso",
  metaHistorico: "sync:historico:meta",
  lockHistorico: "lock:sync:historico",
  indice: "indice:competencia",
  /* medición de la tasa de acierto del PAA (lib/paa_acierto): un JSON pequeño
     con método, muestra y tasa; la vista del PAA lo lee best-effort */
  paaAcierto: "paa:acierto",
  // caché del detalle por entidad (TTL 1 h). El VALOR lleva el sello de
  // construcción del índice: reconstruirlo invalida todos los detalles.
  detalleCompetencia: "indice:detalle:",
  /* caché del desglose de P(ganar) por proceso (TTL 300 s, lo fija el encargo).
     El VALOR lleva el sello del corpus MÁS el de los dos índices y el costo de
     preparación consultado: resincronizar, reconstruir cualquiera de los dos
     índices o preguntar con otro costo la invalidan sin esperar al TTL. Vive
     bajo `indice:` para que `patronConocimiento` («indice:*») se la lleve en las
     limpiezas, igual que el detalle de competencia. */
  desgloseProbabilidad: "indice:desglose_p:",
  indiceNuevo: "indice:competencia:nuevo",   // se construye aquí y se renombra (swap atómico)
  indiceMeta: "indice:competencia:meta",
  indiceProgreso: "indice:competencia:progreso",

  /* ---------- índice de BAJA de mercado (lib/indice_baja) ----------
     Tres HASHES, uno por granularidad, no una clave suelta por entidad: así el
     swap puede ser atómico (RENAME sobre el hash entero) y la lectura es UN
     comando por granularidad en vez de N. Misma decisión y mismo motivo que
     `indice:competencia`. */
  indiceBaja: (nivel) => `indice:baja:${nivel}`,
  indiceBajaNuevo: (nivel) => `indice:baja:${nivel}:nuevo`,
  indiceBajaMeta: "indice:baja:meta",
  indiceBajaProgreso: "indice:baja:progreso",
  lockIndiceBaja: "lock:indice_baja",
  cacheIndiceBaja: "indice:baja:cache",   // respuesta de /api/indice-baja (TTL 1 h)

  /* ---------- equivalencias funcionales y vocabulario (aprendidos del histórico) ---------- */
  equivalencias: "equivalencias:unspsc",
  equivalenciasMeta: "equivalencias:unspsc:meta",
  equivalenciasProgreso: "equivalencias:unspsc:progreso",
  vocabulario: "vocabulario:unspsc",
  vocabularioMeta: "vocabulario:unspsc:meta",
  vocabularioProgreso: "vocabulario:unspsc:progreso",
  patronConocimiento: ["indice:*", "equivalencias:*", "vocabulario:*"], // para limpiezas y diagnóstico

  /* ---------- configuración cargada por el dueño (RUP por archivo) ----------
     Fuera de `licitaciones:*` a propósito: ninguna purga del corpus la toca, y
     la full puede reescribir el mundo entero sin llevarse el RUP por delante.
     `config:perfiles:version` se escribe SIEMPRE AL FINAL de la carga: es el
     sello que hace recargar a las instancias calientes, así que mientras no
     cambie nadie ve un estado a medias. */
  configPerfiles: "config:perfiles",
  configPerfilesVersion: "config:perfiles:version",
  configUnspsc: (perfil, que) => `config:unspsc:${perfil}:${que}`,
  /* ---------- perfiles DINÁMICOS (onboarding: RUP subido en PDF) ----------
     Un perfil por contratista que sube su certificado desde la landing. Los
     ids empiezan SIEMPRE por `rup_` (lib/perfil_dinamico), así que no pueden
     chocar ni con `config:perfiles` ni con `config:perfiles:version` ni con
     las whitelists de los tres perfiles fijos. Llevan TTL: no son
     configuración del dueño sino un onboarding renovable re-subiendo el PDF. */
  configPerfilDinamico: (id) => `config:perfiles:${id}`,
  patronPerfilesDinamicos: "config:perfiles:rup_*",
  patronUnspscDinamicos: "config:unspsc:rup_*",
  /* ---------- experiencia REALMENTE ejecutada (ago 2026) ----------
     Los contratos que el dueño ya ejecutó y el vocabulario que se deriva de
     ellos. Viven junto al RUP y por el mismo motivo: ninguna purga del corpus
     los toca. El sello se escribe AL FINAL de la carga (ver lib/experiencia). */
  configExperiencia: "config:experiencia",
  configExperienciaTerminos: "config:experiencia:terminos",
  configExperienciaVersion: "config:experiencia:version",
  patronConfig: "config:*",

  /* ---------- auditoría de cobertura del RUP (caché, TTL 1 h) ----------
     Recorre el histórico entero, así que se cachea; el VALOR lleva el sello del
     RUP y el de la experiencia, de modo que cargar cualquiera de los dos la
     invalida sin tener que acordarse de borrarla. */
  cobertura: (perfil, modo) => `cobertura:${perfil}:${modo}`,
  patronCobertura: "cobertura:*",

  /* ---------- caché del resumen del dashboard (TTL corto) ---------- */
  resumen: (perfil) => `resumen:${perfil}`,
  patronResumen: "resumen:*",
  patronPulso: "pulso:*",          // el pulso personalizado del tablero (lib/handlers/perfil/pulso)

  /* ---------- catálogo de precios APU (lib/apu/catalogo) ----------
     Fuera de `licitaciones:*` por el mismo motivo que el RUP: es configuración
     de referencia, no corpus, y ninguna purga de la ingesta puede llevársela.
     Las TRES primeras son el esquema que fija el encargo (hashes por insumo,
     por ítem y por región) y son la fuente de verdad. El snapshot comprimido
     que las acompaña es SOLO una caché de lectura: sirve el catálogo entero en
     dos comandos en vez de setenta, lleva dentro la MISMA `version` que la meta
     y, si no coincide, quien lee vuelve a los hashes. `apu:catalogo:meta` se
     escribe AL FINAL de la carga —igual que `config:perfiles:version`—, así que
     mientras no cambie nadie puede leer un catálogo a medio escribir. */
  apuInsumo: (id) => `apu:insumos:${id}`,
  apuItem: (codigo) => `apu:items:${codigo}`,
  apuFactores: (region) => `apu:factores_region:${region}`,
  apuMeta: "apu:catalogo:meta",
  apuManifest: "apu:catalogo:manifest",
  apuChunk: (i) => `apu:catalogo:chunk:${i}`,
  patronApuInsumos: "apu:insumos:*",
  patronApuItems: "apu:items:*",
  patronApuFactores: "apu:factores_region:*",
  patronApuChunks: "apu:catalogo:chunk:*",
  patronApu: "apu:*",

  /* ---------- presupuestos del editor de APU (ago 2026) ----------
     Los BORRADORES del editor, que no son el catálogo: el catálogo es
     configuración compartida y estos son el trabajo en curso de un perfil. Por
     eso cuelgan de `apu:presupuesto:` y no de `apu:catalogo:` — `patronApu`
     («apu:*») los cubre a los dos, así que una limpieza general se los lleva
     por delante y eso es lo correcto.

     Llevan TTL de 30 días —son borradores, no un archivo histórico— y el
     listado se resuelve con SCAN + MGET sobre estas mismas claves, SIN un
     índice aparte: un índice con TTL se desincroniza en cuanto caduca un
     presupuesto y empezaría a listar borradores que ya no existen. La clave es
     la única fuente de verdad de qué presupuestos hay. */
  /* Los precios que el contratista ya corrigió a mano, por perfil. Es el NIVEL
     1 de la cascada (lib/apu/precios) y la única fuente que mejora sola con el
     uso: cada corrección queda y manda sobre el catálogo la próxima vez.
     Cuelga de `apu:` para que `patronApu` («apu:*») se lo lleve en una limpieza
     general, igual que los borradores. NO lleva TTL: un precio de mercado
     envejece pero no desaparece, y caducarlo devolvería al usuario a una
     estimación PEOR sin avisarle — la fecha viaja dentro del registro para que
     se pueda ver cuán viejo es y decidir. */
  apuPreciosUsuario: (perfil) => `apu:precios:${perfil}`,
  patronApuPrecios: "apu:precios:*",
  apuPresupuesto: (perfil, id) => `apu:presupuesto:${perfil}:${id}`,
  /* Precios por una sesión de Claude Code (4-sep-2026, lib/apu/precios_ia): la
     SOLICITUD en cola y la PROPUESTA verificada, por borrador. El patrón lista
     las solicitudes con SCAN, sin índice aparte (la misma razón que el listado
     de borradores: un índice con TTL se desincroniza). */
  apuIaSolicitud: (perfil, id) => `apu:ia:solicitud:${perfil}:${id}`,
  apuIaPropuesta: (perfil, id) => `apu:ia:propuesta:${perfil}:${id}`,
  patronApuIaSolicitudes: "apu:ia:solicitud:*",
  patronApuPerfil: (perfil) => `apu:presupuesto:${perfil}:*`,
  patronApuPresupuestos: "apu:presupuesto:*",

  /* ---------- corpus legado, previo a la separación activo/histórico ---------- */
  patronLegado: `${PREFIJO}mes:*`,

  patronTodo: PREFIJO + "*",
};

const LOCK_TTL_SEG = 300;            // candado de /api/sync
const LOCK_HISTORICO_TTL_SEG = 600;  // candado de /api/sync/historico (encargo)
const RESUMEN_TTL_SEG = 300;         // caché de /api/resumen (5 min)
const APU_TTL_SEG = 30 * 24 * 3600;  // presupuestos de APU: 30 días (requerimiento)
/* Dictamen del pliego (2-sep-2026): 30 días con hechos comprobados en su página;
   UNA hora si el veredicto quedó gris («sin hechos comprobados»): un gris
   guardado un mes sería un «no sé» con fecha de caducidad de dictamen. */
const DICTAMEN_TTL_SEG = 30 * 24 * 3600;
const DICTAMEN_GRIS_TTL_SEG = 3600;
/* Perfiles dinámicos del onboarding: 45 días. La escritura es PÚBLICA (sin
   token, es el punto del onboarding), así que el TTL es la garantía de que un
   perfil abandonado no ocupa Redis para siempre; re-subir el RUP lo renueva. */
const PERFIL_DINAMICO_TTL_SEG = 45 * 24 * 3600;
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
async function leerChunksDedup(redis, claves, { lote = 8, onCorrupto = null, senales = false } = {}) {
  const mapa = new Map();
  /* Señales que solo existen ENTRE versiones y que el dedup destruye al
     quedarse con la última. Se derivan aquí porque este bucle ya las tiene
     delante: cero lecturas extra, cero bytes extra en el chunk.
       versiones          cuántas veces se ha reescrito el proceso (adendas)
       cierre_prorrogado  el cierre se movió HACIA ADELANTE en alguna versión.
     La prórroga del cierre es la única señal de competencia observable ANTES
     del cierre que hay en el corpus: una entidad mueve el cierre casi siempre
     porque no llegaron ofertas suficientes. El contador de oferentes, en
     cambio, es ex-post — en un proceso abierto vale 0 por construcción.
     Se activa bajo bandera para no tocar a /api/resumen ni al histórico. */
  const traza = senales ? new Map() : null;
  for (let i = 0; i < claves.length; i += lote) {
    const paquetes = await redis.mget(claves.slice(i, i + lote));
    for (let j = 0; j < paquetes.length; j++) {
      const b = paquetes[j];
      const filas = descomprimir(b);
      // un chunk corrupto no puede tumbar la lectura entera: se omite y, si
      // alguien quiere saberlo, se avisa (nunca en silencio)
      if (filas == null && b != null && onCorrupto) onCorrupto(claves[i + j]);
      for (const r of (filas || [])) {
        if (traza) {
          const t = traza.get(r._k) || { n: 0, cierres: new Set(), primera: null, ultima: null };
          t.n++;
          if (r.fecha_cierre) t.cierres.add(String(r.fecha_cierre));
          /* Fase 5 (vigía de adendas): se conservan la versión MÁS VIEJA y la
             MÁS NUEVA por `:updated_at` para derivar qué CAMBIÓ (cierre,
             presupuesto, plazo, objeto, modalidad) — son los campos del
             dataset que una adenda mueve. Solo se guardan cinco campos, no la
             fila entera. */
          const u = r[":updated_at"] || "";
          const foto = { u, fecha_cierre: r.fecha_cierre || null, precio_base: r.precio_base ?? null, duracion: r.duracion ?? null,
            unidad_de_duracion: r.unidad_de_duracion ?? null, objeto: r.nombre_del_procedimiento || null, modalidad: r.modalidad_de_contratacion || null };
          if (!t.primera || u < t.primera.u) t.primera = foto;
          if (!t.ultima || u >= t.ultima.u) t.ultima = foto;
          traza.set(r._k, t);
        }
        const prev = mapa.get(r._k);
        if (!prev || (r[":updated_at"] || "") >= (prev[":updated_at"] || "")) mapa.set(r._k, r);
      }
    }
  }
  const filas = [...mapa.values()];
  if (traza) {
    for (const r of filas) {
      const t = traza.get(r._k);
      if (!t) continue;
      r._versiones = t.n;
      // prorrogado ⇔ alguna versión anterior cerraba ANTES que la vigente.
      // Un año imposible (1970 de timestamp nulo) NO es una versión anterior:
      // fabricaba una «prórroga» que subía la probabilidad ×1,2 (1-sep-2026).
      const vigente = instanteOperable(r.fecha_cierre);
      r._cierre_prorrogado = Number.isFinite(vigente)
        && [...t.cierres].some((c) => { const v = instanteOperable(c); return Number.isFinite(v) && v < vigente; });
      // el cierre MÁS TEMPRANO visto (B3: lo que el delta persiste al histórico
      // para poder calibrar la prórroga algún día). null si ninguno es legible.
      let minC = null, minV = Infinity;
      for (const c of t.cierres) { const v = instanteOperable(c); if (Number.isFinite(v) && v < minV) { minV = v; minC = c; } }
      r._cierre_inicial = minC;
      // cambios entre la primera versión vista y la vigente (Fase 5)
      if (t.n > 1 && t.primera && t.ultima && t.primera !== t.ultima) {
        const cambios = [];
        for (const campo of ["fecha_cierre", "precio_base", "duracion", "unidad_de_duracion", "objeto", "modalidad"]) {
          const a = t.primera[campo], d = t.ultima[campo];
          if (String(a ?? "") !== String(d ?? "")) cambios.push({ campo, antes: a, despues: d });
        }
        if (cambios.length) r._cambios = cambios;
      }
    }
  }
  return filas;
}

async function leerJSON(redis, k) {
  const v = await redis.get(k);
  if (v == null) return null;
  try { return JSON.parse(v); } catch { return null; }
}
const escribirJSON = (redis, k, obj) => redis.set(k, JSON.stringify(obj));

/* JSON comprimido para valores grandes (acumulador del índice, caché del
   detalle de competencia): mismo formato que un chunk, así respeta el tope de
   1 MB por valor de Upstash. `ttl` en segundos cuando el valor caduca. */
const escribirJSONComprimido = (redis, k, obj, { ttl = 0 } = {}) =>
  redis.set(k, comprimir(obj), ttl > 0 ? { ex: ttl } : undefined);
async function leerJSONComprimido(redis, k) {
  const v = await redis.get(k);
  return v == null ? null : descomprimir(v);
}

module.exports = {
  PREFIJO, CLAVES, LOCK_TTL_SEG, LOCK_HISTORICO_TTL_SEG, RESUMEN_TTL_SEG, APU_TTL_SEG,
  PERFIL_DINAMICO_TTL_SEG, DICTAMEN_TTL_SEG, DICTAMEN_GRIS_TTL_SEG, CHUNK_MAX_COMPRIMIDO,
  comprimir, descomprimir, empaquetar,
  escribirChunks, leerChunksDedup,
  leerJSON, escribirJSON, escribirJSONComprimido, leerJSONComprimido,
};
