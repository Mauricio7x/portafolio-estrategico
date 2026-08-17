/* ============================================================================
   lib/apu_mapeo · De la descripción del pliego al ítem del catálogo APU
   ----------------------------------------------------------------------------
   La entidad escribe «SUMINISTRO E INSTALACION DE TUBERIA PVC RDE 21 DE 6"» y el
   catálogo tiene `LOC-RED-TUBPVC`. Este módulo decide si son el mismo ítem.

   CUATRO SEÑALES, y ninguna sola alcanza:

     1. SOLAPAMIENTO DE TÉRMINOS con los sinónimos del ítem (peso 0,55). Es la
        señal principal y la más auditable: se devuelven las palabras que
        sumaron, así que un mapeo se puede discutir. Es lo que el encargo llama
        «coincidencia de palabras clave» y lo que §1.D.6 llama la base
        obligatoria: «reglas + diccionario, coste ~0, verificabilidad total».
     2. LEVENSHTEIN sobre la descripción canónica (peso 0,22). Existe por el OCR:
        un texto reconocido de una imagen escribe «C0NCRET0» y «REFUERZ0», y el
        solapamiento de términos falla ENTERO ante un carácter cambiado mientras
        la distancia de edición apenas se mueve. Sin esta señal la vía de OCR
        mapearía casi nada.
     3. UNIDAD DE PAGO (peso 0,13). Un ítem cuya unidad canónica coincide con la
        del pliego es mucho más probable. Coincidir NO da vía libre y discrepar
        NO veta: «CONCRETO» medido en m2 puede ser una placa de espesor fijo.
     4. TIPOLOGÍA DEL PROCESO (peso 0,10). Que el ítem pertenezca a la tipología
        que el objeto sugiere lo hace más probable — y NADA MÁS. Esto empezó
        siendo un filtro del catálogo y estaba mal: en un proceso de placa huella
        la fila del cruce de drenaje («TUBERÍA PVC») caía a «personalizado»
        porque ese ítem no figura en VIA-PH. Un presupuesto de obra mezcla
        tipologías por construcción.

   LA UNIDAD NO SE CONVIERTE, NUNCA. Pasar m2 a m3 exige un espesor que el
   catálogo no conoce. Cuando la unidad del pliego difiere de la del catálogo se
   marca `unidad_discrepante` y se conserva la del PLIEGO: es la unidad con la
   que la entidad va a pagar, y es la única que no es una suposición nuestra.

   POR QUÉ NO SE REUTILIZA `experiencia.tokenizar`, que ya existe y que tokeniza
   sobre `norm` igual que esto. Porque DESCARTA los tokens con dígitos a
   propósito («2024», «cm001»: el número del proceso, no el trabajo) y aquí los
   dígitos son justo lo que distingue un ítem de su hermano: «21 MPa» frente a
   «28 MPa», «RDE 21» frente a «RDE 41», «Ø 36». §1.G.5 lo dice de otra forma —
   esas especificaciones «mueven el precio», y RDE 41→21 «puede duplicar el ml».
   Aplicar allí la regla de la experiencia borraría la señal más valiosa. Es la
   misma clase de decisión que separar `TERMINOS_BLOQUEANTES` de
   `TERMINOS_NO_PERTINENTES`: dos preguntas distintas, dos reglas distintas, y
   dicho en voz alta para que nadie las «unifique» más adelante.

   SIN MATCH SE CREA UN ÍTEM PERSONALIZADO, jamás se descarta la fila. El pliego
   manda: si la entidad va a pagar por ese ítem, tiene que estar en la lista
   aunque el catálogo no lo conozca. Un ítem personalizado se marca como tal y
   arrastra su descripción y su unidad tal como venían.
   ========================================================================== */
"use strict";

const { norm } = require("./semantica.js");
const { ITEMS, POR_CODIGO, itemEnTipologias, tipologiasProbables } = require("./apu_catalogo.js");

/* ══════════════════ 1 · Tokenización ══════════════════ */
const MIN_LARGO_TOKEN = 3;          // «de», «el»: fuera. Un token de 2 no distingue

/* Palabras de trámite del formulario de cantidades. Deliberadamente MÁS CORTA
   que `experiencia.STOPWORDS`: allí se filtra el trámite CONTRACTUAL
   («prestacion», «contrato», «objeto»), que no aparece en la descripción de un
   ítem de obra. Lo que sobra aquí son los verbos de ejecución, que están en casi
   todas las filas y por tanto no distinguen ninguna. */
const STOPWORDS_ITEM = new Set((
  "para de la el los las del en con por que un una uno unos unas y e o a al se lo su sus "
  + "sobre entre segun tipo clase incluye incluido incluyendo incluida segun norma "
  + "suministro suministrar instalacion instalar construccion construir obra obras "
  + "elaboracion elaborar ejecucion ejecutar realizar aplicacion aplicar colocacion colocar "
  + "actividad item unidad cantidad valor total precio unitario descripcion"
).split(/\s+/).filter(Boolean));

/* Tokens que CONSERVAN los dígitos (ver cabecera). Se separa por cualquier cosa
   que no sea letra o dígito, así que «Ø36"» → «36» y «fy=420» → «420»: el
   símbolo de diámetro no sobrevive, el número sí, que es lo que importa. */
function tokenizarItem(texto) {
  const salida = [];
  /* «CLASE C», «TIPO B»: la letra sola no llega al mínimo de largo y «clase»/
     «tipo» son stopwords, así que «SUBBASE GRANULAR CLASE A/B/C» quedaban como
     el MISMO conjunto de tokens y el importador no podía separarlas (medido:
     tres candidatos a 0,90 con margen 0). Se funden en un solo token
     («clasec») ANTES de partir. Solo UN carácter: «TIPO A10» ya sobrevive solo. */
  const preparado = norm(texto).replace(/\b(clase|tipo)\s+([a-z0-9])\b/g, "$1$2");
  for (const bruto of preparado.replace(/[²³]/g, (c) => (c === "²" ? "2" : "3")).split(/[^a-z0-9ñ]+/)) {
    if (!bruto) continue;
    // un número suelto de 1-2 cifras sí entra (es «6» de Ø6", «21» de 21 MPa),
    // pero una palabra corta no: la longitud mínima solo aplica a las letras
    const esNumero = /^\d+$/.test(bruto);
    if (!esNumero && bruto.length < MIN_LARGO_TOKEN) continue;
    if (esNumero && bruto.length > 6) continue;          // «56250000»: es plata, no una especificación
    if (STOPWORDS_ITEM.has(bruto)) continue;
    salida.push(bruto);
  }
  return salida;
}

const terminosItem = (texto) => [...new Set(tokenizarItem(texto))];

/* ══════════════════ 2 · Levenshtein ══════════════════ */
/* Dos filas de DP, no la matriz completa: una descripción de pliego llega a 300
   caracteres y el catálogo tiene ~95 ítems, así que la matriz se calcularía
   ~95 veces por fila. El corte por longitud evita el caso patológico. */
const MAX_LARGO_LEVENSHTEIN = 200;

function levenshtein(a, b) {
  const s = String(a || "").slice(0, MAX_LARGO_LEVENSHTEIN);
  const t = String(b || "").slice(0, MAX_LARGO_LEVENSHTEIN);
  if (s === t) return 0;
  if (!s.length) return t.length;
  if (!t.length) return s.length;

  let previa = new Array(t.length + 1);
  let actual = new Array(t.length + 1);
  for (let j = 0; j <= t.length; j++) previa[j] = j;
  for (let i = 1; i <= s.length; i++) {
    actual[0] = i;
    const ci = s.charCodeAt(i - 1);
    for (let j = 1; j <= t.length; j++) {
      const coste = ci === t.charCodeAt(j - 1) ? 0 : 1;
      actual[j] = Math.min(actual[j - 1] + 1, previa[j] + 1, previa[j - 1] + coste);
    }
    const tmp = previa; previa = actual; actual = tmp;
  }
  return previa[t.length];
}

/* Similitud normalizada 0..1. Se compara sobre el texto ya tokenizado y
   reordenado alfabéticamente: así «TUBERIA PVC» y «PVC TUBERIA» no se penalizan
   por el orden, que en las descripciones de pliego es arbitrario. */
function similitudEdicion(terminosA, terminosB) {
  const a = [...terminosA].sort().join(" ");
  const b = [...terminosB].sort().join(" ");
  const largo = Math.max(a.length, b.length);
  if (!largo) return 0;
  return Math.max(0, 1 - levenshtein(a, b) / largo);
}

/* ══════════════════ 3 · Puntaje de un candidato ══════════════════ */
const PESO_TERMINOS = 0.55;
const PESO_EDICION = 0.22;
const PESO_UNIDAD = 0.13;
const PESO_TIPOLOGIA = 0.10;

/* Umbrales del mapeo. `UMBRAL_ACEPTAR` es el mínimo para atarse a un ítem del
   catálogo; por debajo nace un ítem PERSONALIZADO, que no es un fallo sino la
   respuesta correcta. `UMBRAL_FIRME` separa el mapeo que se puede dar por bueno
   del que hay que revisar: aquí el falso positivo cuesta más que el falso
   negativo (§1.G.4), así que la franja intermedia se marca, no se acepta en
   silencio. Son cortes FIJOS, no percentiles: con percentiles siempre habría un
   tercio «bueno» aunque nada casara — la misma razón por la que `lib/indice_baja`
   usa cortes fijos y no tertiles. */
const UMBRAL_ACEPTAR = 0.35;
const UMBRAL_FIRME = 0.60;

/* MARGEN MÍNIMO SOBRE EL SEGUNDO CANDIDATO para llamar «firme» a un mapeo.
   El solapamiento de términos se divide por los términos del PLIEGO, así que una
   descripción corta y genérica puede alcanzar 1,0 en la señal principal sin ser
   específica de nada: «CONCRETO 3000 PSI» casaba en firme con el concreto de
   placa huella, cuando podría ser igual de bien el estructural o el de pavimento
   rígido. El margen que separaba esos tres era 0,083 y el corte estaba en 0,08.

   0,12 es el corte, y con dos exigencias más: al menos DOS términos coincidentes
   —una sola palabra en común no es evidencia— y que el segundo candidato quede
   de verdad atrás. Un empate no da firme por alto que sea el puntaje absoluto:
   misma condición DURA que el `P1−P2` del clasificador de tipologías (§1.D.2). */
const MARGEN_FIRME = 0.12;
const MIN_COINCIDENCIAS_FIRME = 2;

function puntuarCandidato(item, { terminos, unidad, tipologias }) {
  const sinonimos = new Set(item.sinonimos);
  const propios = terminosItem(item.descripcion);
  for (const p of propios) sinonimos.add(p);

  const coincidencias = terminos.filter((t) => sinonimos.has(t));
  /* Denominador = términos ÚNICOS de la descripción del pliego, igual que
     `experiencia.similitud`: con los repetidos, una fila que dice «concreto»
     tres veces pesaría como una que describe tres cosas. */
  const porTerminos = terminos.length ? coincidencias.length / terminos.length : 0;
  const porEdicion = similitudEdicion(terminos, propios);
  const unidadIgual = unidad != null && unidad === item.unidad;
  const enTipologia = itemEnTipologias(item, tipologias);

  const score = PESO_TERMINOS * porTerminos
    + PESO_EDICION * porEdicion
    + PESO_UNIDAD * (unidadIgual ? 1 : 0)
    + PESO_TIPOLOGIA * (enTipologia ? 1 : 0);

  return {
    codigo_item: item.codigo_item,
    descripcion_catalogo: item.descripcion,
    unidad_catalogo: item.unidad,
    score,
    por_terminos: porTerminos,
    por_edicion: porEdicion,
    unidad_igual: unidadIgual,
    en_tipologia: enTipologia,
    coincidencias,
  };
}

/* ══════════════════ 4 · Mapeo de una fila ══════════════════ */
/**
 * @param {object} fila       { descripcion_original, unidad, ... } de lib/apu_pliego
 * @param {object} opciones   { tipologias: string[] } para acotar los candidatos
 */
function mapearItem(fila, opciones = {}) {
  const descripcion = String((fila && fila.descripcion_original) || "");
  const unidad = (fila && fila.unidad) || null;
  const terminos = terminosItem(descripcion);

  /* Se puntúa el catálogo COMPLETO. La tipología entra como peso dentro de
     `puntuarCandidato`, no acotando esta lista (ver cabecera). */
  const tipologias = opciones.tipologias || [];
  const candidatos = ITEMS
    .map((it) => puntuarCandidato(it, { terminos, unidad, tipologias }))
    .sort((a, b) => b.score - a.score || a.codigo_item.localeCompare(b.codigo_item));

  const mejor = candidatos[0] || null;
  const segundo = candidatos[1] || null;

  /* Sin términos utilizables no se puede mapear nada, y forzar el mejor
     candidato de una descripción vacía sería inventar. */
  if (!terminos.length || !mejor || mejor.score < UMBRAL_ACEPTAR) {
    return {
      item_id: null,
      personalizado: true,
      descripcion_original: descripcion,
      unidad,
      unidad_catalogo: null,
      unidad_discrepante: false,
      confianza: mejor ? Math.round(mejor.score * 1000) / 1000 : 0,
      nivel: "personalizado",
      motivo: !terminos.length
        ? "La descripción no tiene términos utilizables: no se puede mapear."
        : `Ningún ítem del catálogo alcanza el umbral de ${UMBRAL_ACEPTAR}.`,
      mejor_descartado: mejor ? { codigo_item: mejor.codigo_item, score: Math.round(mejor.score * 1000) / 1000 } : null,
      coincidencias: [],
      candidatos: candidatos.slice(0, 3).map(resumirCandidato),
    };
  }

  const item = POR_CODIGO.get(mejor.codigo_item);
  /* Margen sobre el segundo: dos ítems empatados no dan un mapeo firme, aunque
     el puntaje absoluto sea alto. Es la misma condición DURA que el `P1−P2` del
     clasificador de tipologías (§1.D.2), y por el mismo motivo. */
  const margen = segundo ? mejor.score - segundo.score : mejor.score;
  const firme = mejor.score >= UMBRAL_FIRME
    && margen >= MARGEN_FIRME
    && mejor.coincidencias.length >= MIN_COINCIDENCIAS_FIRME;

  return {
    item_id: mejor.codigo_item,
    personalizado: false,
    descripcion_original: descripcion,
    descripcion_catalogo: mejor.descripcion_catalogo,
    // la unidad que viaja es la DEL PLIEGO: es la que se va a pagar
    unidad,
    unidad_catalogo: mejor.unidad_catalogo,
    unidad_discrepante: unidad != null && unidad !== mejor.unidad_catalogo,
    articulo_invias_candidato: (item && item.articulo_invias_candidato) || null,
    confianza: Math.round(mejor.score * 1000) / 1000,
    margen: Math.round(margen * 1000) / 1000,
    nivel: firme ? "firme" : "revisar",
    coincidencias: mejor.coincidencias,
    candidatos: candidatos.slice(0, 3).map(resumirCandidato),
  };
}

const resumirCandidato = (c) => ({
  codigo_item: c.codigo_item,
  descripcion: c.descripcion_catalogo,
  score: Math.round(c.score * 1000) / 1000,
  unidad_igual: c.unidad_igual,
  en_tipologia: c.en_tipologia,
});

/* ══════════════════ 5 · Mapeo de una tabla completa ══════════════════ */
/**
 * @param {Array}  filas    salida de `parsearPliego().items`
 * @param {object} contexto { objeto_proceso, unspsc }
 */
/* TOPE DE FILAS MAPEADAS. El parseo de 20 000 líneas cuesta ~1 s, pero el mapeo
   puntúa el catálogo COMPLETO por fila (~1 ms × 93 ítems), así que 17 000 filas
   se comían el reloj entero de la función. Un formulario real no pasa de unos
   cientos de filas; lo que llegue por encima se PARSEA igual pero no se mapea, y
   se dice —un tope silencioso se lee como «se mapeó todo». */
const MAX_FILAS_MAPEO = 2000;

function mapearTabla(filas, contexto = {}) {
  const probables = tipologiasProbables(contexto.objeto_proceso || "", contexto.unspsc || []);
  /* Solo las tipologías que EMPATAN con la mejor reciben el peso: quedarse con
     la primera cuando hay empate la elegiría por orden alfabético, y dar el peso
     a todas las que puntúan lo volvería una constante que no inclina nada. */
  const tope = probables.length ? probables[0].puntaje : 0;
  const tipologias = probables.filter((p) => p.puntaje === tope).map((p) => p.tipologia);

  const todas = filas || [];
  const truncado = todas.length > MAX_FILAS_MAPEO;
  const items = todas.slice(0, MAX_FILAS_MAPEO).map((fila, i) => {
    const m = mapearItem(fila, { tipologias });
    return {
      orden: i + 1,
      numeral: fila.numeral || null,
      pagina: fila.pagina == null ? null : fila.pagina,   // página del PDF (lib/paginas); null sin marcadores
      capitulo: fila.capitulo ? fila.capitulo.titulo : null,
      item_id: m.item_id,
      descripcion_original: m.descripcion_original,
      unidad: m.unidad,
      cantidad: fila.cantidad,               // `null` si no se pudo leer: NUNCA 0
      unitario_oficial: fila.unitario_oficial == null ? null : fila.unitario_oficial,
      total_oficial: fila.total_oficial == null ? null : fila.total_oficial,
      confianza: m.confianza,
      nivel_mapeo: m.nivel,
      personalizado: m.personalizado,
      unidad_catalogo: m.unidad_catalogo,
      unidad_discrepante: m.unidad_discrepante,
      descripcion_catalogo: m.descripcion_catalogo || null,
      articulo_invias_candidato: m.articulo_invias_candidato || null,
      coincidencias: m.coincidencias,
      candidatos: m.candidatos,
      validacion_fila: fila.validacion_fila || null,
      via_reconocimiento: fila.via || null,
    };
  });

  const firmes = items.filter((i) => i.nivel_mapeo === "firme").length;
  const revisar = items.filter((i) => i.nivel_mapeo === "revisar").length;
  const personalizados = items.filter((i) => i.personalizado).length;

  return {
    items,
    tipologias_probables: probables.slice(0, 5),
    tipologias_usadas: tipologias,
    truncado_mapeo: truncado,
    filas_sin_mapear: truncado ? todas.length - MAX_FILAS_MAPEO : 0,
    max_filas_mapeo: MAX_FILAS_MAPEO,
    resumen_mapeo: {
      total: items.length,
      firmes, revisar, personalizados,
      // la suma tiene que dar el total: si un ítem se quedara sin categoría,
      // desaparecería del reparto sin que nadie lo notara (misma invariante que
      // los repartos de /api/resumen y el embudo de /api/diagnostico)
      con_unidad_discrepante: items.filter((i) => i.unidad_discrepante).length,
      sin_cantidad: items.filter((i) => i.cantidad == null).length,
      umbral_aceptar: UMBRAL_ACEPTAR, umbral_firme: UMBRAL_FIRME,
    },
  };
}

module.exports = {
  MIN_LARGO_TOKEN, STOPWORDS_ITEM, UMBRAL_ACEPTAR, UMBRAL_FIRME,
  MARGEN_FIRME, MIN_COINCIDENCIAS_FIRME,
  PESO_TERMINOS, PESO_EDICION, PESO_UNIDAD,
  tokenizarItem, terminosItem, levenshtein, similitudEdicion,
  puntuarCandidato, mapearItem, mapearTabla, MAX_FILAS_MAPEO,
};
