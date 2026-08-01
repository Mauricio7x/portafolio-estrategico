/* ============================================================================
   lib/competencia_detalle · Los procesos que SOSTIENEN el badge de competencia
   ----------------------------------------------------------------------------
   La tarjeta dice «🟢 Poca competencia — promedio 3 oferentes en 12 procesos».
   Este módulo responde la única pregunta que sigue: ¿CUÁLES 12?

   Regla de oro: esto NO es un segundo cálculo, es el MISMO. Se usan los
   predicados del índice —`esAdjudicado()` y `oferentesDe()` de
   lib/indice_competencia— y no una reimplementación parecida: si el detalle y
   el badge pudieran divergir, el detalle no serviría para verificar nada.
   Hay una prueba que compara el promedio reconstruido aquí contra el
   publicado en `indice:competencia`, entidad por entidad.

   Tres cubetas, y NADA se descarta en silencio (esa es la queja que originó
   el módulo: un ⚪ «sin dato» sin explicación):

     procesos   adjudicado + nº de oferentes ≥ 1 → los que forman el promedio.
     excluidos  · `sin_dato_oferentes`  adjudicado pero el dataset no dice
                  cuántos se presentaron (0 = SIN DATO, nunca «nadie vino»);
                · `sin_adjudicacion`    cerrado sin ganador (desierto,
                  cancelado, revocado): no aporta señal de competencia;
                · `insuficientes_datos` la entidad NO llega al mínimo de
                  MIN_PROCESOS, así que ni siquiera los que tienen oferentes
                  pueden sostener una clasificación. Es exactamente el «⚪ sin
                  datos suficientes» que se ve en la tarjeta, con nombre y
                  apellido.
     (abiertos) los procesos aún abiertos no entran: no hay competencia
                observada todavía.

   Rendimiento: la normalización del nombre de entidad se memoiza por nombre
   DISTINTO (las entidades se repiten miles de veces en el corpus), así que el
   coste por proceso es un lookup de Map, no un regex.
   ========================================================================== */
"use strict";

const { CLAVES, leerChunksDedup, leerJSON, comprimir, descomprimir } = require("./almacen.js");
const { norm } = require("./semantica.js");
const { estado_abierto } = require("./filtros.js");
const {
  MIN_PROCESOS, oferentesDe, esAdjudicado, medianaHistograma,
  CAMPOS_FECHA_ADJUDICACION,
} = require("./indice_competencia.js");

const MAX_PROCESOS_DETALLE = 200;   // tope por lista en la respuesta
const TTL_CACHE_SEG = 3600;         // 1 hora
const LARGO_MAX_ENTIDAD = 300;

/* ---------- normalización ----------
   Dos claves distintas, a propósito:
     claveIndice   `norm(nombre)`  — la que usó el índice al construirse. Es la
                   que hay que usar para leer `indice:competencia`, o el badge
                   y el detalle hablarían de entidades distintas.
     claveBusqueda además sin puntuación — para EMPAREJAR el texto que escribe
                   quien consulta con el que trae el dataset («… RÍOS NEGRO -
                   NARE» vs «… RIOS NEGRO NARE»). */
const claveIndice = (s) => norm(s);
const claveBusqueda = (s) => norm(s).replace(/[^a-z0-9ñ ]+/g, " ").replace(/\s+/g, " ").trim();

/* Memoiza por nombre crudo: el regex corre una vez por entidad DISTINTA. */
function memoNormalizador(fn) {
  const cache = new Map();
  return (crudo) => {
    const k = crudo == null ? "" : String(crudo);
    let v = cache.get(k);
    if (v === undefined) { v = fn(k); cache.set(k, v); }
    return v;
  };
}

/* ---------- proyección de un proceso para la respuesta ----------
   Lista BLANCA de campos: el adjudicatario y su NIT viven en el corpus
   histórico pero no salen de aquí (mismo criterio que /api/oportunidades). */
function primeraFecha(lic) {
  for (const c of CAMPOS_FECHA_ADJUDICACION) {
    const v = lic[c];
    if (v && !isNaN(Date.parse(v))) return String(v).slice(0, 10);
  }
  return null;
}

function proyectarProceso(lic, ofertas, extra = {}) {
  const cuantia = parseFloat(lic.cuantia_cop ?? lic.precio_base ?? 0);
  return {
    id: lic.id_del_proceso || lic[":id"] || null,
    objeto: String(lic.nombre_del_procedimiento || "").trim() || "(sin objeto)",
    numero_ofertas: ofertas,
    cuantia_cop: isNaN(cuantia) ? 0 : cuantia,
    modalidad: lic.modalidad_de_contratacion || null,
    fecha_adjudicacion: primeraFecha(lic),
    codigo_unspsc: lic.codigo_principal_de_categoria || null,
    ...extra,
  };
}

/* Orden: los procesos con MENOS oferentes primero (es lo que le interesa a
   quien va a decidir si presentarse); desempate por fecha más reciente. */
const porOfertasAsc = (a, b) => (a.numero_ofertas - b.numero_ofertas)
  || String(b.fecha_adjudicacion || "").localeCompare(String(a.fecha_adjudicacion || ""));
const porFechaDesc = (a, b) => String(b.fecha_adjudicacion || "").localeCompare(String(a.fecha_adjudicacion || ""));

/* ---------- caché ----------
   La clave lleva el nombre normalizado; el VALOR lleva el sello de
   construcción del índice. Reconstruir el índice invalida todos los detalles
   al instante, sin esperar al TTL ni borrar clave por clave. */
const claveCache = (buscada) => `${CLAVES.detalleCompetencia}${buscada}`;

async function leerCache(redis, buscada, sello) {
  const v = await redis.get(claveCache(buscada));
  if (v == null) return null;
  const obj = descomprimir(v);
  if (!obj || obj.sello !== sello) return null; // índice reconstruido: caché vieja
  return obj;
}
const guardarCache = (redis, buscada, obj) =>
  redis.set(claveCache(buscada), comprimir(obj), { ex: TTL_CACHE_SEG });

/* ============================ detalleEntidad ============================ */
/* Devuelve {estado, cuerpo}. `estado` es el HTTP que debe responder el
   handler; el módulo no toca `req`/`res` para poder probarlo suelto. */
/* `usarCache` controla solo la LECTURA: `?refrescar=1` recalcula, pero deja la
   caché al día (si no, refrescar dejaría la siguiente consulta igual de lenta). */
async function detalleEntidad(redis, entidadCruda, {
  usarCache = true, log = () => {},
  // solo las pruebas lo bajan: así el tope se ejercita sin fabricar 200 filas
  maxProcesos = MAX_PROCESOS_DETALLE,
} = {}) {
  const pedida = String(entidadCruda == null ? "" : entidadCruda).replace(/\s+/g, " ").trim();
  if (!pedida) return { estado: 400, cuerpo: { ok: false, error: "entidad requerida" } };
  if (pedida.length > LARGO_MAX_ENTIDAD) {
    return { estado: 400, cuerpo: { ok: false, error: `entidad requerida (máximo ${LARGO_MAX_ENTIDAD} caracteres)` } };
  }
  const buscada = claveBusqueda(pedida);
  if (!buscada) return { estado: 400, cuerpo: { ok: false, error: "entidad requerida" } };

  const meta = await leerJSON(redis, CLAVES.indiceMeta);
  const sello = (meta && meta.construido) || "sin-indice";

  if (usarCache) {
    const enCache = await leerCache(redis, buscada, sello);
    if (enCache) {
      log(`detalle de «${pedida}» servido desde caché`);
      return { estado: 200, cuerpo: { ...enCache.cuerpo, cache: true } };
    }
  }

  /* ---------- barrido del corpus histórico ---------- */
  const claves = await redis.scan(CLAVES.patronChunksHist);
  let chunksCorruptos = 0;
  const registros = await leerChunksDedup(redis, claves, {
    onCorrupto: () => { chunksCorruptos++; },
  });

  const normalizar = memoNormalizador(claveBusqueda);
  const procesos = [], excluidos = [];
  const histograma = {};
  let suma = 0, contados = 0, adjudicados = 0, coincidencias = 0;
  let nombreOriginal = null;
  const nombresVistos = new Map(); // nombre crudo → veces (gana el más frecuente)

  for (const lic of registros) {
    if (normalizar(lic.entidad) !== buscada) continue;
    coincidencias++;
    const crudo = String(lic.entidad || "").trim();
    if (crudo) nombresVistos.set(crudo, (nombresVistos.get(crudo) || 0) + 1);

    const adjudicado = esAdjudicado(lic);
    if (!adjudicado) {
      // cerrado sin ganador (desierto, cancelado, revocado) → no dice nada de
      // competencia, pero se muestra para que el conteo cuadre a la vista
      if (!estado_abierto(lic)) {
        excluidos.push(proyectarProceso(lic, null, { motivo_exclusion: "sin_adjudicacion" }));
      }
      continue;
    }
    adjudicados++;
    const ofertas = oferentesDe(lic);
    if (ofertas == null) {
      excluidos.push(proyectarProceso(lic, 0, { motivo_exclusion: "sin_dato_oferentes" }));
      continue;
    }
    contados++;
    suma += ofertas;
    histograma[ofertas] = (histograma[ofertas] || 0) + 1;
    procesos.push(proyectarProceso(lic, ofertas, { incluido_en_promedio: true }));
  }

  for (const [nombre, veces] of nombresVistos) {
    if (!nombreOriginal || veces > nombresVistos.get(nombreOriginal)) nombreOriginal = nombre;
  }

  if (!coincidencias) {
    const cuerpo = {
      ok: true, encontrada: false,
      entidad: pedida, entidad_normalizada: buscada,
      indice: null, procesos: [], excluidos: [],
      mensaje: "No hay procesos de esta entidad en el corpus histórico. "
        + "Puede que el nombre no coincida con el del dataset, o que el backfill histórico aún no se haya ejecutado.",
      chunks_ilegibles: chunksCorruptos,
      cache: false, generado: new Date().toISOString(),
    };
    // se cachea también el «no hay»: repetir el barrido completo de 731 chunks
    // para volver a no encontrar nada es el peor uso posible del presupuesto
    if (!chunksCorruptos) await guardarCache(redis, buscada, { sello, cuerpo });
    return { estado: 200, cuerpo };
  }

  /* ---------- lo que dice el índice PUBLICADO (no un recálculo) ---------- */
  let publicado = null;
  try {
    const crudo = await redis.hget(CLAVES.indice, claveIndice(nombreOriginal || pedida));
    publicado = typeof crudo === "string" ? JSON.parse(crudo) : crudo;
    if (publicado && publicado.ref) {
      const ref = await redis.hget(CLAVES.indice, publicado.ref);
      publicado = typeof ref === "string" ? JSON.parse(ref) : ref;
    }
  } catch { publicado = null; } // índice sin construir: se informa igual

  /* ---------- por debajo del mínimo: TODO va a excluidos ----------
     Es la respuesta a «¿por qué esta entidad sale en ⚪?». Con menos de
     MIN_PROCESOS procesos útiles el promedio es ruido, así que no se presenta
     como si fuera un promedio: se muestran los procesos marcados y con el
     motivo escrito. */
  const suficientes = contados >= MIN_PROCESOS;
  if (!suficientes) {
    for (const p of procesos) {
      excluidos.push({ ...p, incluido_en_promedio: false, motivo_exclusion: "insuficientes_datos" });
    }
    procesos.length = 0;
  }

  const valores = Object.keys(histograma).map(Number);
  const promedio = contados ? Math.round((suma / contados) * 10) / 10 : null;
  const indice = {
    nivel: suficientes && publicado && ["baja", "media", "alta"].includes(publicado.nivel)
      ? publicado.nivel : "sin_dato",
    promedio_oferentes: suficientes ? promedio : null,
    mediana_oferentes: suficientes ? medianaHistograma(histograma, contados) : null,
    min_oferentes: valores.length ? Math.min(...valores) : null,
    max_oferentes: valores.length ? Math.max(...valores) : null,
    procesos_contados: contados,
    total_procesos_adjudicados: adjudicados,
    total_procesos_historico: coincidencias,
    min_procesos: MIN_PROCESOS,
    // lo que el índice publicó, para poder detectar una divergencia de un vistazo
    publicado: publicado ? { promedio: publicado.promedio ?? null, procesos: publicado.procesos ?? 0, nivel: publicado.nivel || null } : null,
  };

  procesos.sort(porOfertasAsc);
  excluidos.sort(porFechaDesc);
  const truncado = {
    limite: maxProcesos,
    procesos: procesos.length > maxProcesos ? procesos.length : 0,
    excluidos: excluidos.length > maxProcesos ? excluidos.length : 0,
  };

  const cuerpo = {
    ok: true, encontrada: true,
    entidad: nombreOriginal || pedida,   // el nombre TAL COMO viene en los datos
    entidad_normalizada: buscada,
    indice,
    // el tope corta por los más RECIENTES: si una entidad tiene 400 procesos,
    // los últimos son los que describen su competencia de hoy
    procesos: (truncado.procesos ? [...procesos].sort(porFechaDesc).slice(0, maxProcesos).sort(porOfertasAsc) : procesos),
    excluidos: excluidos.slice(0, maxProcesos),
    truncado: (truncado.procesos || truncado.excluidos) ? truncado : null,
    mensaje: suficientes ? null
      : `Esta entidad no tiene suficientes procesos adjudicados con dato de oferentes en el histórico (mínimo ${MIN_PROCESOS}); por eso aparece como «sin datos».`,
    chunks_ilegibles: chunksCorruptos,
    cache: false, generado: new Date().toISOString(),
  };
  // una respuesta calculada sobre un corpus incompleto NO se cachea: sería
  // congelar el error una hora
  if (chunksCorruptos) log(`aviso: ${chunksCorruptos} chunks del histórico ilegibles (se omitieron; sin cachear)`);
  else await guardarCache(redis, buscada, { sello, cuerpo });
  return { estado: 200, cuerpo };
}

module.exports = {
  MAX_PROCESOS_DETALLE, TTL_CACHE_SEG, LARGO_MAX_ENTIDAD,
  claveIndice, claveBusqueda, memoNormalizador, proyectarProceso,
  claveCache, detalleEntidad,
};
