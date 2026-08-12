/* ============================================================================
   lib/paa_acierto · ¿Cuánto de lo que el PAA anuncia acaba saliendo?
   ----------------------------------------------------------------------------
   La vista del PAA publicaba `tasa_de_acierto: null` con la advertencia de que
   medirla «es otro trabajo». Este es ese trabajo: cruza el PAA de una vigencia
   YA CERRADA contra el corpus de procesos realmente publicados
   (`licitaciones:historico:mes:*` ∪ activo, que el backfill y el delta ya
   mantienen) y guarda el resultado en `paa:acierto` para que la vista lo sirva.

   ── QUÉ MIDE EXACTAMENTE, porque la cifra solo vale con su método ────────────

   Universo: líneas del PAA de la vigencia con familia UNSPSC DE OBRA (las
   familias de los segmentos 72/77/81/95 inscritas en los RUP — derivadas de
   `FAMILIAS_UNION`, no una segunda lista) y cuya ENTIDAD tenga al menos un
   proceso en el corpus. Una línea CUMPLE si su entidad publicó ese año (con
   tolerancia de un trimestre del año siguiente: lo planeado para diciembre
   sale en enero) al menos un proceso cuya familia UNSPSC coincide con alguna
   de las de la línea.

   TRES límites, dichos en la respuesta y no solo aquí:
   · Es una COTA INFERIOR: el corpus solo guarda lo compatible con los RUP y
     las modalidades competitivas — un PAA cumplido por contratación directa no
     aparece y cuenta como «no salió».
   · La coincidencia es entidad+familia+año, no línea a línea: dos líneas
     parecidas de la misma entidad pueden «cumplirse» con el mismo proceso.
   · El barrido tiene presupuesto (`truncado` declarado): la muestra es la que
     cupo, no el PAA entero.

   La SEÑAL SECUNDARIA es `procesos_relacionados`: el propio SECOP enlaza a la
   línea el proceso que la materializó. Se publica aparte porque mide otra cosa
   (la diligencia del enlace, no la publicación real) y porque no depende del
   corpus de esta app.

   Las entidades se agrupan con `claveCanonica` (lib/indice_competencia), la
   MISMA definición de «entidad» del resto del proyecto; la familia sale de
   `codigosDeLicitacion`/`extraerCodigos` (lib/unspsc), jamás de un slice.
   ========================================================================== */
"use strict";

const { CLAVES, leerChunksDedup } = require("./almacen.js");
const { claveCanonica } = require("./indice_competencia.js");
const { codigosDeLicitacion, extraerCodigos, FAMILIAS_UNION } = require("./unspsc.js");
const { escSoQL, ahoraColombia } = require("./socrata.js");
const { resolverColumnas, crearClientePaa, DATASET } = require("./paa.js");

/* Familias de OBRA: las de los segmentos de obra pura y afines dentro de la
   unión de los RUP. DERIVADAS, no transcritas: si un RUP nuevo inscribe otra
   familia del 72, entra sola. */
const SEGMENTOS_OBRA_RE = /^(72|77|81|95)/;
const FAMILIAS_OBRA = [...FAMILIAS_UNION].filter((f) => SEGMENTOS_OBRA_RE.test(f)).sort();

const PAGINA = 1000;
const MAX_FILAS = parseInt(process.env.PAA_ACIERTO_MAX_FILAS, 10) || 4000;
const PRESUPUESTO_MS = parseInt(process.env.PAA_ACIERTO_PRESUPUESTO_MS, 10) || 25000;
/* Por debajo de esta muestra la tasa NO se publica: un porcentaje sobre 10
   líneas se lee igual de sólido que uno sobre 1.000, y no lo es. */
const MIN_EVALUADAS = 30;

/* Vigencia por defecto: el último año calendario COMPLETO (hora Colombia).
   Medir el año en curso compararía un plan a 12 meses contra 8 de realidad. */
const anioPorDefecto = (ahora) => ahoraColombia(ahora).getUTCFullYear() - 1;

/* ---------- corpus: entidad → familias publicadas en la vigencia ---------- */
/* [anio-01-01, (anio+1)-04-01): el trimestre extra es la tolerancia declarada
   para lo planeado a fin de año. Comparación de texto sobre el ISO ya
   almacenado — el corpus escribe `fecha_de_publicacion_del` normalizada. */
function ventanaCorpus(anio) {
  return { desde: `${anio}-01-01`, hasta: `${anio + 1}-04-01` };
}

function indiceCorpus(registros, anio) {
  const { desde, hasta } = ventanaCorpus(anio);
  const porEntidad = new Map(); // claveCanonica → Set(familias)
  let procesosVentana = 0;
  for (const lic of registros) {
    const fecha = String(lic.fecha_de_publicacion_del || "").slice(0, 10);
    if (!fecha || fecha < desde || fecha >= hasta) continue;
    const entidad = claveCanonica(lic.entidad);
    if (!entidad) continue;
    const familias = new Set();
    for (const c of codigosDeLicitacion(lic).codigos) {
      if (c.nivel >= 4 && c.familia) familias.add(c.familia);
    }
    if (!familias.size) continue;
    procesosVentana++;
    let set = porEntidad.get(entidad);
    if (!set) { set = new Set(); porEntidad.set(entidad, set); }
    for (const f of familias) set.add(f);
  }
  return { porEntidad, procesosVentana };
}

/* ---------- familias de una línea del PAA ---------- */
/* `categorias_unspsc` trae códigos separados por «;». `extraerCodigos` ya
   tokeniza por runs de dígitos (2/4/6/8) y descarta lo ilegible. */
function familiasDeLinea(textoCodigos) {
  const familias = new Set();
  for (const c of extraerCodigos(textoCodigos || "").codigos) {
    if (c.nivel >= 4 && c.familia) familias.add(c.familia);
  }
  return familias;
}

/* ============================ medirAciertoPaa ============================ */
/**
 * Mide la tasa de acierto del PAA de una vigencia contra el corpus y guarda el
 * resultado en `paa:acierto`. Devuelve { estado, cuerpo } listo para el
 * handler. Solo LEE el corpus; lo único que escribe es la clave del resultado.
 */
async function medirAciertoPaa(redis, opciones = {}) {
  const t0 = Date.now();
  const anio = Number.isInteger(opciones.anio) ? opciones.anio : anioPorDefecto(opciones.ahora);
  const hoy = ahoraColombia(opciones.ahora).getUTCFullYear();
  if (anio < 2015 || anio >= hoy) {
    return {
      estado: 400,
      cuerpo: {
        ok: false,
        error: `La vigencia a medir debe ser un año CERRADO (2015–${hoy - 1}); se pidió «${opciones.anio}». `
          + "Medir el año en curso compararía un plan a 12 meses contra una realidad a medias.",
      },
    };
  }

  /* 1 · corpus (histórico ∪ activo): entidad → familias publicadas ese año.
     El activo entra porque la tolerancia del trimestre puede caer en meses que
     la compactación todavía no movió al histórico. */
  const clavesHist = await redis.scan(CLAVES.patronChunksHist);
  const clavesActivo = await redis.scan(CLAVES.patronChunks);
  let chunksCorruptos = 0;
  const onCorrupto = () => { chunksCorruptos++; };
  const registros = [
    ...(await leerChunksDedup(redis, clavesHist, { onCorrupto })),
    ...(await leerChunksDedup(redis, clavesActivo, { onCorrupto })),
  ];
  const { porEntidad, procesosVentana } = indiceCorpus(registros, anio);
  if (!porEntidad.size) {
    return {
      estado: 200,
      cuerpo: {
        ok: true, medido: false, anio,
        motivo: `El corpus no tiene ningún proceso publicado en la vigencia ${anio}: no hay contra qué medir. `
          + "Ejecute el backfill histórico de ese año primero (/api/sync/historico?desde=…).",
        chunks_ilegibles: chunksCorruptos,
      },
    };
  }

  /* 2 · barrido del PAA de la vigencia, acotado a familias de obra en el
     servidor (like por familia; quien decide es el cliente, con las familias
     bien extraídas). El grupo de ORs va en UNA cláusula parentizada. */
  const cliente = crearClientePaa(opciones);
  let sonda;
  try {
    sonda = await cliente.pedir({ "$limit": "5" }, "sonda PAA (medición)");
  } catch (e) {
    return { estado: 502, cuerpo: { ok: false, error: `No se pudo abrir el PAA (${DATASET}): ${e.message}` } };
  }
  const claves = new Set();
  for (const f of sonda || []) for (const k of Object.keys(f || {})) claves.add(k);
  const { columnas } = resolverColumnas([...claves]);
  for (const campo of ["entidad", "unspsc", "anio"]) {
    if (!columnas[campo]) {
      return {
        estado: 200,
        cuerpo: {
          ok: true, medido: false, anio,
          motivo: `El dataset del PAA no expone la columna de ${campo}: sin ella no se puede medir. `
            + "Añada el nombre real (censo de la vista) a CANDIDATAS en lib/paa.js.",
        },
      };
    }
  }

  const likes = FAMILIAS_OBRA.map((f) => `${columnas.unspsc} like '%${escSoQL(f)}%'`).join(" OR ");
  const whereBase = `${columnas.anio} >= '${anio}' AND ${columnas.anio} <= '${anio}' AND (${likes})`;

  const descartadas = { sin_entidad: 0, sin_codigo_legible: 0, familia_fuera_de_obra: 0, entidad_sin_corpus: 0 };
  let filasLeidas = 0, paginas = 0, truncado = false, lastId = null;
  let evaluadas = 0, cumplidas = 0, conEnlace = 0, conColumnaEnlace = 0;

  try {
    for (;;) {
      if (filasLeidas >= MAX_FILAS || Date.now() - t0 > PRESUPUESTO_MS) { truncado = true; break; }
      const clausulas = [whereBase];
      if (lastId) clausulas.push(`:id > '${escSoQL(lastId)}'`);
      const filas = await cliente.pedir({
        // `*,:id`: el backend de 9sue-ezhx exige el `*` al principio (ver lib/paa)
        "$select": "*,:id", "$order": ":id", "$limit": String(PAGINA),
        "$where": clausulas.join(" AND "),
      }, `PAA acierto página ${paginas + 1}`);
      if (!Array.isArray(filas)) throw new Error("respuesta no-array en el barrido de medición");
      paginas++;
      filasLeidas += filas.length;
      for (const f of filas) {
        lastId = f[":id"] || lastId;
        const entidad = claveCanonica(f[columnas.entidad]);
        if (!entidad) { descartadas.sin_entidad++; continue; }
        const familias = familiasDeLinea(f[columnas.unspsc]);
        if (!familias.size) { descartadas.sin_codigo_legible++; continue; }
        /* el like del servidor puede dejar pasar un falso positivo («7210»
           dentro de otro número): la pertenencia real se decide aquí */
        const deObra = [...familias].filter((fam) => SEGMENTOS_OBRA_RE.test(fam) && FAMILIAS_UNION.has(fam));
        if (!deObra.length) { descartadas.familia_fuera_de_obra++; continue; }
        const publicadas = porEntidad.get(entidad);
        if (!publicadas) { descartadas.entidad_sin_corpus++; continue; }
        evaluadas++;
        if (deObra.some((fam) => publicadas.has(fam))) cumplidas++;
        if (columnas.proceso_relacionado) {
          conColumnaEnlace++;
          const enlace = String(f[columnas.proceso_relacionado] || "").trim();
          if (enlace) conEnlace++;
        }
      }
      if (filas.length < PAGINA) break;
    }
  } catch (e) {
    return { estado: 502, cuerpo: { ok: false, error: `Falló el barrido de medición del PAA: ${e.message}` } };
  }

  const tasa = evaluadas >= MIN_EVALUADAS ? Math.round((cumplidas / evaluadas) * 100) : null;
  const resultado = {
    ok: true, medido: true, generado: new Date().toISOString(), anio,
    ventana_corpus: ventanaCorpus(anio),
    metodo: "Línea de obra del PAA (familias UNSPSC de los segmentos 72/77/81/95 inscritas en los RUP) de una "
      + "entidad presente en el corpus → CUMPLE si esa entidad publicó en la vigencia (más un trimestre del año "
      + "siguiente) al menos un proceso de alguna de sus familias. COTA INFERIOR: el corpus solo guarda lo "
      + "compatible con los RUP y las modalidades competitivas.",
    muestra: {
      filas_leidas: filasLeidas, paginas, truncado, limite_filas: MAX_FILAS,
      evaluadas, cumplidas, no_cumplidas: evaluadas - cumplidas,
    },
    descartadas,
    tasa_pct: tasa,
    ...(tasa == null ? {
      motivo_sin_tasa: `solo ${evaluadas} líneas evaluables (mínimo ${MIN_EVALUADAS}): un porcentaje sobre esa base `
        + "se leería igual de sólido que uno medido de verdad",
    } : {}),
    /* señal secundaria: el enlace lo escribe SECOP, no esta app. `null` cuando
       la columna no existe — no cuando nadie enlazó, que sería un 0 real. */
    senal_enlace: conColumnaEnlace
      ? { con_proceso_relacionado: conEnlace, sobre: conColumnaEnlace, pct: Math.round((conEnlace / conColumnaEnlace) * 100) }
      : null,
    corpus: { entidades: porEntidad.size, procesos_en_ventana: procesosVentana, chunks_ilegibles: chunksCorruptos },
    familias_obra: FAMILIAS_OBRA,
    duracionMs: Date.now() - t0,
  };

  /* Un resultado calculado sobre un corpus con chunks ilegibles NO se guarda:
     congelaría el hueco. Se devuelve igual, con el conteo, para que se vea. */
  if (!chunksCorruptos) await redis.set(CLAVES.paaAcierto, JSON.stringify(resultado));
  return { estado: 200, cuerpo: { ...resultado, guardado: !chunksCorruptos } };
}

/* Lectura best-effort del resultado guardado: un fallo de Redis devuelve null
   (la vista del PAA sirve igual, con la tasa sin medir) — jamás lanza. */
async function leerAciertoPaa(redis) {
  try {
    const v = await redis.get(CLAVES.paaAcierto);
    if (typeof v !== "string" || !v) return null;
    const obj = JSON.parse(v);
    return obj && obj.medido ? obj : null;
  } catch { return null; }
}

module.exports = {
  medirAciertoPaa, leerAciertoPaa, indiceCorpus, familiasDeLinea, ventanaCorpus,
  FAMILIAS_OBRA, MIN_EVALUADAS, anioPorDefecto,
};
