/* ============================================================================
   lib/columnas_historicas · ¿Qué columnas trae DE VERDAD el corpus histórico?
   ----------------------------------------------------------------------------
   Censo de las columnas de adjudicación sobre `licitaciones:historico:mes:*`.
   Responde la pregunta que hoy bloquea el índice de baja de mercado:
   ¿existe el valor adjudicado en lo que ya está bajado, y con qué nombre exacto?

   Por qué hace falta. Los nombres de las columnas de adjudicación y de nº de
   oferentes NUNCA se verificaron contra la fuente (este entorno no alcanza
   datos.gov.co). `lib/indice_competencia` los sondea a ciegas por lista de
   candidatas, y el síntoma de que ninguna acertó es indirecto y silencioso:
   `indice:competencia:meta` con `clasificadas: 0`. Esto lo vuelve directo, sobre
   el corpus real y sin re-extraer nada.

   ── DOS LÍMITES QUE HAY QUE LEER ANTES DE CREERSE UN CERO ──────────────────
   1. El chunk histórico solo guarda lo que PROYECTÓ `lib/proyeccion` (CAMPOS +
      CAMPOS_ADJUDICACION). Una columna que la fuente sí publica pero que la
      proyección no conserva sale 0 aquí, y eso NO significa que SECOP no la
      traiga: significa que no la guardamos. Son dos causas distintas con el
      mismo síntoma, y un `0` no las distingue — la misma lección que
      `explicarEquivalencias`. Por eso se publica `claves_observadas` (la verdad
      literal del JSON almacenado) y por eso el veredicto nombra las dos causas.
   2. El censo mide el corpus YA BAJADO. Con el histórico vacío o con pocos
      meses, un 0 % es una afirmación sobre la extracción, no sobre el dataset.

   Las listas de candidatas NO se redefinen aquí: se importan de
   `lib/indice_competencia`, que es quien las usa para leer. Si divergieran, el
   diagnóstico informaría de una columna que el índice no mira, o al revés, y
   entonces no serviría para diagnosticar nada. Por el mismo motivo el parseo
   numérico (`numero`) y la resolución «primer candidato no vacío» (`primero`)
   son las funciones de ese módulo, no copias.

   Sobre `utiles` frente a `presentes`: un campo presente con valor 0 NO es un
   dato. Es la doctrina de siempre («0 oferentes = SIN DATO», `anticipo_pct = 0`
   = sin dato), aplicada al censo: se cuentan las dos cosas por separado para que
   «la columna existe pero viene en cero» no se pueda confundir con «la columna
   trae datos».
   ========================================================================== */
"use strict";

const { CLAVES, leerChunksDedup } = require("./almacen.js");
const {
  numero, primero, MIN_PROCESOS,
  OFERENTES_CAMPOS, CAMPOS_VALOR_ADJUDICADO,
  CAMPOS_ADJUDICATARIO, CAMPOS_ADJUDICATARIO_NIT, CAMPOS_FECHA_ADJUDICACION,
  esAdjudicado, esDesierto, plazoAdjudicacionDe,
} = require("./indice_competencia.js");
/* Las candidatas de FECHA DE CIERRE son las de `fechaCierre` (lib/negocio), que
   es quien las lee en toda la app: censar otra lista diría que hay cierre donde
   el índice no lo ve. `negocio` no depende de este módulo: no hay ciclo. */
const { CIERRE_CANDIDATOS } = require("./negocio.js");

const MUESTRAS = 3;          // valores reales por candidata (requisito del encargo)
const RECORTE = 120;         // los nombres de adjudicatario son largos
const RATIO_SOSPECHOSO = 0.3; // adjudicar por debajo del 30 % del oficial no es una baja normal

/* El presupuesto oficial no es un campo de adjudicación —lo proyecta
   `lib/proyeccion` desde el año uno— pero es la OTRA MITAD de la baja, así que
   sin él el censo no puede responder la pregunta que se le hace. */
const CAMPOS_PRESUPUESTO = ["precio_base"];

/* `oferentes` es el DERIVADO que escribe la proyección histórica cuando alguna
   candidata respondió. Va el último a propósito: si resultara ser el único con
   datos, el número existe pero viene de una corrida anterior y no identifica la
   columna de origen. */
const CAMPOS_OFERENTES = [...OFERENTES_CAMPOS, "oferentes"];

const GRUPOS = [
  { id: "presupuesto_oficial", campos: CAMPOS_PRESUPUESTO, numerico: true },
  { id: "valor_adjudicado", campos: CAMPOS_VALOR_ADJUDICADO, numerico: true },
  { id: "numero_ofertas", campos: CAMPOS_OFERENTES, numerico: true },
  { id: "adjudicatario_nombre", campos: CAMPOS_ADJUDICATARIO, numerico: false },
  { id: "adjudicatario_nit", campos: CAMPOS_ADJUDICATARIO_NIT, numerico: false },
  { id: "fecha_adjudicacion", campos: CAMPOS_FECHA_ADJUDICACION, numerico: false },
  // M-DGF-08 (6-sep-2026): la otra mitad del plazo de adjudicación
  { id: "fecha_cierre", campos: CIERRE_CANDIDATOS, numerico: false },
];

const pct = (n, d) => (d > 0 ? Math.round((n / d) * 1000) / 10 : null);
const recortar = (v) => String(v).slice(0, RECORTE);

/* Percentil sobre una lista YA ordenada; null si no hay muestra. */
function percentil(ordenados, p) {
  if (!ordenados.length) return null;
  const i = Math.min(ordenados.length - 1, Math.max(0, Math.round((ordenados.length - 1) * p)));
  return ordenados[i];
}

/* ════════════════════════ censarColumnasHistoricas ════════════════════════ */
async function censarColumnasHistoricas(redis, { muestras = MUESTRAS } = {}) {
  const t0 = Date.now();

  const claves = await redis.scan(CLAVES.patronChunksHist);
  let chunksCorruptos = 0;
  // dedup por `_k`: se cuentan PROCESOS únicos, no versiones. Sin esto un
  // proceso republicado cinco veces inflaría la cobertura cinco veces.
  const filas = await leerChunksDedup(redis, claves, { onCorrupto: () => { chunksCorruptos++; } });
  const total = filas.length;

  const acc = GRUPOS.map((g) => ({
    ...g,
    presentes: 0,
    utiles: 0,
    porCandidata: new Map(g.campos.map((c) => [c, { presentes: 0, utiles: 0, muestra: [] }])),
  }));

  const clavesObservadas = new Map(); // campo → nº de filas donde viene no vacío
  const ratios = [];
  let ratiosSobre1 = 0, ratiosBajos = 0;
  /* M-DGF-08: la PAREJA de fechas (cierre Y adjudicación en la misma fila) y los
     desenlaces, con los MISMOS predicados del índice (`esAdjudicado`,
     `esDesierto`, `plazoAdjudicacionDe`): el censo dice para cuántos procesos
     puede existir un plazo, no cuántos traen cada fecha por separado. */
  const plazo = { adjudicados: 0, desiertos: 0, con_ambas_fechas: 0, sin_fecha_cierre: 0, sin_fecha_adjudicacion: 0, sin_ninguna_fecha: 0, no_posterior_al_cierre: 0 };

  for (const lic of filas) {
    /* a. verdad literal del JSON guardado: qué claves trae realmente */
    for (const k of Object.keys(lic)) {
      const v = lic[k];
      if (v == null || String(v).trim() === "") continue;
      clavesObservadas.set(k, (clavesObservadas.get(k) || 0) + 1);
    }

    /* b. censo por grupo y por candidata */
    for (const g of acc) {
      let grupoPresente = false, grupoUtil = false;
      for (const c of g.campos) {
        const v = lic[c];
        if (v == null || String(v).trim() === "") continue;
        const slot = g.porCandidata.get(c);
        slot.presentes++;
        grupoPresente = true;
        const n = g.numerico ? numero(v) : null;
        const util = g.numerico ? (n != null && n > 0) : true;
        if (util) {
          slot.utiles++;
          grupoUtil = true;
          if (slot.muestra.length < muestras) slot.muestra.push(recortar(v));
        }
      }
      if (grupoPresente) g.presentes++;
      if (grupoUtil) g.utiles++;
    }

    /* c. la baja exige las DOS mitades en la MISMA fila. Sumar coberturas por
       separado daría un número más bonito y falso: lo que hace falta es el par
       completo en el mismo proceso. */
    const pb = numero(primero(lic, CAMPOS_PRESUPUESTO));
    const va = numero(primero(lic, CAMPOS_VALOR_ADJUDICADO));
    if (pb != null && pb > 0 && va != null && va > 0) {
      const ratio = va / pb;
      ratios.push(ratio);
      if (ratio > 1) ratiosSobre1++;
      if (ratio < RATIO_SOSPECHOSO) ratiosBajos++;
    }

    /* d. el plazo de adjudicación exige las DOS fechas en la MISMA fila, y la
       tasa de desiertos exige un desenlace con nombre. */
    if (esAdjudicado(lic)) {
      plazo.adjudicados++;
      const pl = plazoAdjudicacionDe(lic);
      if (pl.dias != null) plazo.con_ambas_fechas++; else plazo[pl.motivo]++;
    } else if (esDesierto(lic)) {
      plazo.desiertos++;
    }
  }

  /* ---------- grupos ---------- */
  const grupos = {};
  for (const g of acc) {
    // el campo efectivo es el PRIMER candidato con datos útiles, en el mismo
    // orden en que `primero` los resuelve: es el que el índice acabará leyendo
    const efectivo = g.campos.find((c) => g.porCandidata.get(c).utiles > 0) || null;
    grupos[g.id] = {
      campo_efectivo: efectivo,
      con_dato: g.presentes,
      con_dato_util: g.utiles,
      cobertura_pct: pct(g.utiles, total),
      candidatas: Object.fromEntries(g.campos.map((c) => {
        const s = g.porCandidata.get(c);
        return [c, { presentes: s.presentes, utiles: s.utiles, muestra: s.muestra }];
      })),
    };
  }

  /* ---------- baja de mercado ---------- */
  ratios.sort((a, b) => a - b);
  const mediana = percentil(ratios, 0.5);
  const baja = {
    procesos_con_par_completo: ratios.length,
    cobertura_pct: pct(ratios.length, total),
    // se publica en BAJA (1 − ratio), que es como se lee en el negocio
    baja_mediana_pct: mediana == null ? null : Math.round((1 - mediana) * 1000) / 10,
    baja_p25_pct: percentil(ratios, 0.75) == null ? null : Math.round((1 - percentil(ratios, 0.75)) * 1000) / 10,
    baja_p75_pct: percentil(ratios, 0.25) == null ? null : Math.round((1 - percentil(ratios, 0.25)) * 1000) / 10,
    adjudicado_mayor_que_oficial: ratiosSobre1,
    ratio_bajo_0_3: ratiosBajos,
  };

  /* ---------- advertencias: lo que haría desconfiar del dato ---------- */
  const advertencias = [];
  if (chunksCorruptos > 0) {
    advertencias.push(`${chunksCorruptos} chunk(s) del histórico ilegibles: el censo se hizo sin ellos.`);
  }
  if (ratios.length > 0 && ratiosSobre1 / ratios.length > 0.1) {
    advertencias.push(
      `${ratiosSobre1} de ${ratios.length} procesos tienen valor adjudicado MAYOR que precio_base. `
      + "Si eso pasa a menudo, `precio_base` no es el presupuesto oficial (o el valor adjudicado "
      + "incluye adiciones): verificar antes de construir el índice de baja sobre él.");
  }
  if (ratiosBajos > 0) {
    advertencias.push(
      `${ratiosBajos} proceso(s) con adjudicado por debajo del 30 % del oficial: revisar si son lotes `
      + "parciales, otra unidad monetaria o un campo distinto del que se cree.");
  }
  if (grupos.numero_ofertas.campo_efectivo === "oferentes") {
    advertencias.push(
      "El único campo de nº de oferentes con datos es `oferentes`, que es el DERIVADO que guarda la "
      + "proyección, no una columna de la fuente. El dato sirve, pero no identifica la columna de origen.");
  }

  /* ---------- conclusión ---------- */
  /* OJO con el nombre del campo. `acc` cuenta en `utiles`, pero el objeto que se
     PUBLICA lo llama `con_dato_util`. Leer aquí `grupos.*.utiles` devuelve
     `undefined`, y `undefined > 0` es `false` sin avisar: el veredicto decía
     «ninguna candidata trae datos» mientras el mismo bloque publicaba el campo
     efectivo y calculaba la baja. Es la lección de `i.total_procesos` otra vez.
     Se deriva de `campo_efectivo` —que es la única fuente de esa verdad— para
     que no pueda volver a desincronizarse. */
  const existeValor = grupos.valor_adjudicado.campo_efectivo != null;
  const hayPresupuesto = grupos.presupuesto_oficial.campo_efectivo != null;
  const sePuede = ratios.length > 0;

  let veredicto, siguientePaso;
  if (total === 0) {
    veredicto = "El corpus histórico está VACÍO: no hay nada que censar. Esto no dice nada sobre el "
      + "dataset, solo que la extracción histórica todavía no se ha ejecutado.";
    siguientePaso = "Lanzar /api/sync/historico?desde=2024-01&hasta=2025-12 con el header x-historico-token.";
  } else if (!existeValor) {
    veredicto = `Ninguna de las ${CAMPOS_VALOR_ADJUDICADO.length} candidatas de valor adjudicado trae datos `
      + `en los ${total} procesos del histórico. DOS causas posibles, y este censo NO las distingue: `
      + "(a) la fuente no publica esa columna con ninguno de esos nombres, o (b) la proyección "
      + "(lib/proyeccion) no la conserva. Mirar `claves_observadas` para ver qué se guardó de verdad: "
      + "si ahí aparece un nombre parecido, la causa es (a) y basta con añadirlo a CAMPOS_VALOR_ADJUDICADO.";
    siguientePaso = "Resolver el nombre real contra la fuente: "
      + "https://api.us.socrata.com/api/catalog/v1?ids=p6dx-8zbt devuelve el listado de columnas del "
      + "dataset sin adivinar. Añadir el nombre a CAMPOS_VALOR_ADJUDICADO y llamar "
      + "/api/sync/historico?reconstruir_indice=true — no hay que re-extraer nada.";
  } else if (!hayPresupuesto) {
    veredicto = `Hay valor adjudicado en \`${grupos.valor_adjudicado.campo_efectivo}\` (${grupos.valor_adjudicado.con_dato_util} `
      + `procesos), pero NO hay presupuesto oficial: sin las dos mitades no hay baja que calcular.`;
    siguientePaso = "Comprobar que `precio_base` sobrevive a la proyección histórica en lib/proyeccion.";
  } else if (ratios.length < MIN_PROCESOS) {
    veredicto = `Existe el valor adjudicado en \`${grupos.valor_adjudicado.campo_efectivo}\`, pero solo `
      + `${ratios.length} proceso(s) tienen el par completo (presupuesto Y adjudicado). Es demasiado poco: `
      + `por debajo de ${MIN_PROCESOS} no se publica ninguna cifra derivada, igual que en el índice de competencia.`;
    siguientePaso = "Ampliar el rango de la extracción histórica y volver a censar.";
  } else {
    veredicto = `SÍ. El valor adjudicado vive en \`${grupos.valor_adjudicado.campo_efectivo}\` y ${ratios.length} `
      + `de ${total} procesos (${pct(ratios.length, total)} %) tienen el par completo, así que la baja de `
      + `mercado SE PUEDE calcular. Mediana observada: ${baja.baja_mediana_pct} % de baja.`;
    siguientePaso = "Construir `lib/indice_baja.js` con el mismo contrato que el índice de competencia: "
      + `mínimo de ${MIN_PROCESOS} procesos por celda, \`sin_dato\` explícito y ninguna cifra derivada por debajo del mínimo.`;
  }

  return {
    generado: new Date().toISOString(),
    duracion_ms: Date.now() - t0,
    corpus: {
      chunks: claves.length,
      meses: new Set(claves.map(CLAVES.mesDeClaveHist).filter(Boolean)).size,
      procesos_unicos: total,
      chunks_ilegibles: chunksCorruptos,
    },
    grupos,
    // la verdad literal de lo almacenado: si una columna esperada no está aquí,
    // no está en Redis, se llame como se llame
    claves_observadas: Object.fromEntries(
      [...clavesObservadas.entries()].sort((a, b) => b[1] - a[1])),
    baja_de_mercado: baja,
    /* M-DGF-08: cobertura de la pareja cierre + adjudicación y de los desenlaces.
       Si `desiertos` es 0, el denominador de la tasa de desiertos no existe en el
       corpus (o el histórico no los conserva) y se dice; si `con_ambas_fechas`
       es bajo, el plazo saldrá para pocas entidades: se dice «sin base», no se
       rellena. */
    plazo_adjudicacion: {
      ...plazo,
      cobertura_pct: pct(plazo.con_ambas_fechas, plazo.adjudicados),
      base_desiertos: plazo.adjudicados + plazo.desiertos,
      min_procesos: MIN_PROCESOS,
    },
    advertencias,
    conclusion: {
      existe_valor_adjudicado: existeValor,
      campo_valor_adjudicado: grupos.valor_adjudicado.campo_efectivo,
      campo_numero_ofertas: grupos.numero_ofertas.campo_efectivo,
      se_puede_calcular_baja: sePuede,
      veredicto,
      siguiente_paso: siguientePaso,
    },
    como_leerlo: "`grupos.*.candidatas` sondea TODOS los nombres posibles y dice cuántos respondieron: "
      + "un 0 en todos significa que ninguno existe en lo guardado. `campo_efectivo` es el nombre EXACTO "
      + "que el índice acabará leyendo. `con_dato` cuenta el campo presente y `con_dato_util` el que "
      + "además trae un número > 0 — un 0 es «sin dato», nunca «cero pesos». `claves_observadas` es la "
      + "lista literal de campos del JSON almacenado, y es la que distingue «la fuente no lo trae» de "
      + "«la proyección no lo guardó». `baja_de_mercado` solo cuenta procesos con AMBAS mitades. "
      + "`plazo_adjudicacion` cuenta los adjudicados con fecha de cierre Y de adjudicación en la misma fila "
      + "(la base del plazo por entidad) y los declarados desiertos (la base de la tasa de desiertos).",
  };
}

module.exports = { censarColumnasHistoricas, GRUPOS, CAMPOS_PRESUPUESTO, CAMPOS_OFERENTES };
