/* ============================================================================
   lib/socio_por_proceso · ¿Con cuál de mis socios conviene ESTE proceso?
   ----------------------------------------------------------------------------
   Todo se optimiza para EL DUEÑO —el perfil base— y solo para él. El socio no
   es un cliente de la aplicación: es un recurso. Se busca a quién necesita para
   poder presentarse, y que ceda lo menos posible al hacerlo.

   NO REIMPLEMENTA NINGÚN JUICIO. Llama a `evaluarRup` (lib/rup), a
   `evaluarPuertas` (lib/puertas) y al combinador único `derivarPlural`
   (lib/perfiles). Si esta capa calculara por su cuenta, acabaría contradiciendo
   a la tarjeta — el mismo error que la guía del proceso tiene prohibido.

   ── LO QUE SE MIDIÓ, Y POR QUÉ EL MÓDULO ES BARATO (11-sep-2026) ───────────
   La capacidad de contratación, la caja, el tope y las actividades de un
   proponente plural NO DEPENDEN DEL PORCENTAJE: son suma o unión de los
   integrantes. Ejecutado con Helder + Génesis al 10 %, 50 % y 90 %, las cuatro
   salen idénticas; lo único que se mueve son los indicadores que el pliego
   pondera (la liquidez pasó de 19,19 a 116,90). De ahí las dos preguntas
   separadas que responde este módulo:

     1. ¿CON QUIÉN se abre la puerta?  → una evaluación por socio, sin barrer
        porcentajes. Es lo que lo hace viable por fila.
     2. ¿EN QUÉ PORCENTAJE?            → no cambia qué puertas se abren; cambia
        cuánto se queda el dueño y qué indicadores pondera el pliego.

   ── LO QUE ESTE MÓDULO NUNCA DICE ─────────────────────────────────────────
   Que con un socio SE CUMPLE el pliego. El corpus no publica los requisitos
   del proceso (`cumple` es `null` por contrato, y hay prueba que lo fija).
   Aquí se dice qué abre el socio DE LO QUE LA APLICACIÓN PUEDE VERIFICAR, y se
   nombra lo que sigue sin verificarse. Prometerle al dueño una habilitación
   que el pliego no confirma es la única forma de perjudicarlo de verdad.

   ── UN SOCIO NO ARREGLA CUALQUIER COSA ────────────────────────────────────
   Si el objeto no es obra para NADIE (un convenio, una compra de dotación, un
   objeto genérico), sumar socios no lo convierte en obra. Solo se ofrece socio
   cuando lo que falta es algo que un socio aporta de verdad: actividades que él
   sí tiene registradas, capacidad, tope o caja.
   ========================================================================== */
"use strict";

const { PERFILES, derivarPlural } = require("./perfiles.js");
const { evaluarRup } = require("./rup.js");
const { evaluarPuertas } = require("./puertas.js");

/* Umbral para limitar una convocatoria a Mipyme en 2026 (equivalente a
   US$125.000 según MinCIT; ver docs/COMPLEMENTO_ANALISTA_LICITACIONES.md §V-12).
   Es una cifra CON FECHA: cambia cada año y hay que revisarla en enero. */
const UMBRAL_MIPYME_2026 = 511708497;

/* Los tamaños que NO son Mipyme. El dato sale del RUP («TAMAÑO DE EMPRESA»),
   no de un cálculo: un dato publicado gana a uno derivado. Sin dato → null, y
   entonces no se afirma nada. */
const NO_ES_MIPYME = new Set(["gran_empresa"]);

/* Qué carencias puede cubrir un socio, y cuáles no. `paso` lo nombra
   `lib/filtros.evaluarObjeto`; de todos sus valores, el único que un socio
   arregla es `unspsc`: el proceso es obra, pero de una actividad que el dueño
   no tiene registrada y el socio sí. Un convenio o una compra de dotación no se
   vuelven obra por añadir integrantes. */
const PASO_QUE_UN_SOCIO_CUBRE = "unspsc";

const CARENCIAS = Object.freeze({
  actividad: "la actividad del proceso no está en su registro de proponente",
  capacidad: "la cuantía supera lo que usted puede facturar",
  tope: "la cuantía supera el tope que usted mismo se fijó",
  caja: "el patrimonio no alcanza para financiar la obra mientras le pagan",
});
/* La misma carencia en dos largos: la frase entera explica, el sustantivo se
   encadena («sigue faltando capacidad y respaldo»). Enumerar frases enteras
   producía líneas que no se pueden leer. */
const CARENCIAS_CORTAS = Object.freeze({
  actividad: "la actividad registrada",
  capacidad: "capacidad de facturar",
  tope: "tope",
  caja: "respaldo para financiar la obra",
});

/* ── qué le falta al dueño yendo solo ───────────────────────────────────── */
function carenciasDe(rup, puertas) {
  const falta = [];
  if (rup.paso === PASO_QUE_UN_SOCIO_CUBRE) falta.push("actividad");
  if (rup.dentro_de_k === false) falta.push("capacidad");
  if (rup.dentro_de_tope === false) falta.push("tope");
  if (puertas && puertas.p3_caja && puertas.p3_caja.pasa === false) falta.push("caja");
  return falta;
}

/* Lo que un socio NO puede arreglar: el objeto murió por otra causa. Se nombra
   para no ofrecer un socio que no serviría de nada. */
function objetoPerdido(rup) {
  return !!rup.paso && rup.paso !== PASO_QUE_UN_SOCIO_CUBRE;
}

/* ── el aviso de convocatoria limitada a Mipyme ─────────────────────────────
   Art. 2.2.1.2.4.2.2 del Decreto 1082 de 2015 (modificado por el Decreto 1860
   de 2021): en una convocatoria limitada solo se aceptan ofertas de Mipymes o
   de proponentes plurales integrados ÚNICAMENTE por Mipymes. Un socio que sea
   gran empresa deja al consorcio por fuera.

   La aplicación NO PUEDE SABER si la entidad limitó esta convocatoria: el
   corpus no publica ese dato. Así que esto es un AVISO y jamás una exclusión —
   en oportunidades el falso caro es el negativo, y ocultar un proceso por una
   sospecha cuesta una licitación que no se vio. */
function avisoMipyme(socio, cuantiaCop) {
  const tamano = socio.tamanoEmpresa == null ? null : String(socio.tamanoEmpresa);
  if (tamano == null) return null;                    // sin dato: no se afirma nada
  if (!NO_ES_MIPYME.has(tamano)) return null;
  const c = Number(cuantiaCop);
  if (!Number.isFinite(c) || c <= 0) return null;     // sin cuantía no hay sospecha que declarar
  if (c >= UMBRAL_MIPYME_2026) return null;
  return {
    clave: "mipyme",
    frase: `Si la entidad limita esta convocatoria a empresas pequeñas, ${socio.nombre} no cabe: es gran empresa, `
      + "y en una convocatoria limitada todos los integrantes tienen que ser pequeños.",
    porque: `La cuantía está por debajo de $${UMBRAL_MIPYME_2026.toLocaleString("es-CO")}, que es donde una entidad `
      + "puede limitar la convocatoria. No publican si la limitaron, así que es un riesgo que hay que mirar en el pliego, no un hecho.",
  };
}

/* ── indicadores que EMPEORAN al entrar el socio ────────────────────────────
   Los indicadores del plural se ponderan por participación: un socio con la
   cifra más baja BAJA la del conjunto. No se compara contra el pliego (no se
   conoce), se dice el hecho y con qué reparto mejora. */
const INDICADORES = Object.freeze([
  { campo: "liquidez", nombre: "liquidez", sentido: "min" },
  { campo: "coberturaIntereses", nombre: "cobertura de intereses", sentido: "min" },
  { campo: "endeudamiento", nombre: "endeudamiento", sentido: "max" },
]);

function indicadoresQueEmpeoran(base, socio) {
  const peores = [];
  for (const ind of INDICADORES) {
    const a = base[ind.campo], b = socio[ind.campo];
    if (a == null || b == null) continue;             // sin dato no se compara
    const empeora = ind.sentido === "min" ? b < a : b > a;
    if (empeora) peores.push({ ...ind, suyo: a, del_socio: b });
  }
  return peores;
}

/* ── lo que la aplicación NO SABE del socio, dicho en voz alta ──────────────
   Un socio grande parece mejor de lo que es si se le mide solo por el RUP. El
   certificado publica los contratos ACREDITADOS, no los que tiene en ejecución:
   la capacidad que se calcula aquí NO descuenta la obra que ya lleve encima
   (`sce` vacío ⇒ la guía de capacidad residual asume 0, y lo advierte). Cuanta
   más experiencia acreditada tenga el socio, más probable es que esa resta
   importe. Declararlo es la diferencia entre una recomendación y una promesa. */
const CONTRATOS_QUE_PIDEN_MIRAR_LA_CARGA = 50;

function loQueNoSeSabe(socio) {
  const avisos = [];
  const sinSce = !socio.sce || socio.sce.length === 0;
  if (sinSce && (Number(socio.contratosRup) || 0) >= CONTRATOS_QUE_PIDEN_MIRAR_LA_CARGA) {
    avisos.push({
      clave: "carga_del_socio",
      frase: `${socio.nombre} tiene ${socio.contratosRup} contratos acreditados, pero el registro no dice cuáles sigue ejecutando.`,
      porque: "La capacidad que se muestra aquí no descuenta la obra que el socio ya tenga encima. "
        + "Pregúntele qué está ejecutando antes de contar con toda esa capacidad.",
    });
  }
  if (socio.nit) {
    avisos.push({
      clave: "verificar_socio",
      frase: `Verifique a ${socio.nombre} antes de firmar.`,
      porque: "En un consorcio la responsabilidad es solidaria: un integrante sancionado contamina a todos. "
        + `La aplicación puede revisarlo con su documento (${socio.nit}) en sanciones, multas y contratos.`,
    });
  }
  return avisos;
}

/* ── evaluación de una combinación ──────────────────────────────────────────
   Se inyecta el plural derivado bajo un id temporal para poder usar el MISMO
   motor por perfil (evaluarRup + evaluarPuertas) sin duplicar una línea de
   juicio. El id se retira siempre, pase lo que pase. */
let _contador = 0;
function conPlural(perfilBase, socio, fila, ctx) {
  const integrantes = [
    { perfil: perfilBase, perfilId: perfilBase.id, participacion: 0.5 },
    { perfil: socio, perfilId: socio.id, participacion: 0.5 },
  ];
  const plural = derivarPlural(integrantes, { nombre: `${perfilBase.nombre} + ${socio.nombre}` });
  /* El reparto da igual AQUÍ y está medido (ver la cabecera): capacidad, caja,
     tope y actividades del plural son suma o unión, no dependen del %. Se usa
     50/50 solo porque hay que pasar algo. */
  const id = `sim_socio_${++_contador}`;
  PERFILES[id] = { ...plural, id };
  try {
    const rup = evaluarRup(fila, id, ctx.conocimiento || {}, { incluirTextoDebil: !!ctx.incluirTextoDebil });
    const puertas = evaluarPuertas(fila, id, { rup, competencia: ctx.competencia || null, conocimiento: ctx.conocimiento || {} });
    return { rup, puertas, plural };
  } finally {
    delete PERFILES[id];
  }
}

/* ── frases: cortas, de usted, con la cifra detrás ─────────────────────────── */
const pesos = (n) => `$${Math.round(Number(n) || 0).toLocaleString("es-CO")}`;

function frasePorCarencia(clave, socio, plural, base) {
  if (clave === "actividad") {
    return `${socio.nombre} sí tiene registrada la actividad de este proceso.`;
  }
  if (clave === "capacidad") {
    return `${socio.nombre} suma capacidad: usted solo no llega a esta cuantía.`;
  }
  if (clave === "tope") {
    return `Esta obra pasa del tope que usted mismo se fijó; con ${socio.nombre} el tope combinado sí la cubre.`;
  }
  if (clave === "caja") {
    const suma = (Number(base.patrimonio) || 0) + (Number(socio.patrimonio) || 0);
    return `${socio.nombre} aporta respaldo: entre los dos el patrimonio llega a ${pesos(suma)}.`;
  }
  return `${socio.nombre} cubre lo que le falta.`;
}

/* ── el reparto, resuelto A FAVOR DEL DUEÑO ─────────────────────────────────
   El porcentaje NO cambia qué puertas se abren (medido, ver la cabecera).
   Cambia dos cosas, y las dos importan: cuánto se queda el dueño, y los
   indicadores que el pliego pondera por participación.

   Regla: ceder lo MENOS posible. El único suelo conocido es el del integrante
   que aporta la experiencia — varios Documentos Tipo le exigen un mínimo, que
   suele ir del 30 % al 40 %, y si se le da menos el pliego le desconoce la
   experiencia ENTERA. Ese umbral no está verificado contra el pliego de este
   proceso, así que viaja como consejo con su motivo, jamás como un «cumple». */
const PARTE_SI_APORTA_EXPERIENCIA = 40;   // el socio; el dueño se queda con 60
const PARTE_SI_SOLO_APORTA_RESPALDO = 20; // el socio; el dueño se queda con 80

function repartoSugerido(abre, socio) {
  const aportaExperiencia = abre.includes("actividad");
  const delSocio = aportaExperiencia ? PARTE_SI_APORTA_EXPERIENCIA : PARTE_SI_SOLO_APORTA_RESPALDO;
  return {
    suya: 100 - delSocio,
    del_socio: delSocio,
    porque: aportaExperiencia
      ? `Aquí ${socio.nombre} aporta la experiencia, y varios pliegos exigen que quien la aporta participe con un mínimo `
        + "(suele ser del 30 % al 40 %). Por debajo de ese mínimo el pliego le desconoce la experiencia entera. "
        + "Verifique el porcentaje exacto en el pliego antes de firmar."
      : `Aquí ${socio.nombre} aporta respaldo, no experiencia: nada le obliga a cederle más. `
        + "Por encima del 10 % el socio sigue contando para los criterios diferenciales, así que no hace falta bajar de ahí.",
    nota: "El reparto no cambia qué puertas se abren: cambia cuánto se queda usted y los indicadores que el pliego pondera.",
  };
}

/* ══════════════════════════════════════════════════════════════════════════
   ¿SE ALCANZA ESTA FILA CON ALGÚN SOCIO? — el predicado BARATO del listado.
   --------------------------------------------------------------------------
   La lista tiene que decidir, ANTES de paginar, si una fila que el dueño solo
   no alcanza se queda porque un socio la alcanza. Hacerlo con `socioPorProceso`
   entero sería caro: arma frases y ordena opciones para filas que quizá nadie
   mire. Aquí se responde lo mínimo —sí o no, y con quién— usando EL MISMO
   predicado (`carenciasDe`), para que la lista y la tarjeta jamás se
   contradigan: si el listado la deja pasar, la tarjeta dice por qué.

   Lo que lo hace barato está medido (ver la cabecera): el perfil del plural NO
   depende de la fila, así que se deriva UNA VEZ por socio y luego solo se
   evalúa. Derivarlo por fila costaría unir dos listas de cientos de
   actividades en cada una.
   ══════════════════════════════════════════════════════════════════════════ */
function pluralesDe(baseId, candidatos = []) {
  const base = Object.prototype.hasOwnProperty.call(PERFILES, baseId) ? PERFILES[baseId] : null;
  if (!base || base.integrantes) return [];
  const out = [];
  for (const socioId of candidatos) {
    if (socioId === baseId) continue;
    const socio = Object.prototype.hasOwnProperty.call(PERFILES, socioId) ? PERFILES[socioId] : null;
    if (!socio || socio.integrantes) continue;
    out.push({
      socioId,
      nombre: socio.nombre,
      perfil: derivarPlural([
        { perfil: base, perfilId: baseId, participacion: 0.5 },
        { perfil: socio, perfilId: socioId, participacion: 0.5 },
      ], { nombre: `${base.nombre} + ${socio.nombre}` }),
    });
  }
  return out;
}

/* Devuelve {socioId, nombre} del PRIMER socio que alcanza la fila, o null. */
function socioQueAlcanza(fila, plurales, ctx = {}) {
  for (const p of plurales || []) {
    const id = `sim_socio_${++_contador}`;
    PERFILES[id] = { ...p.perfil, id };
    try {
      const rup = evaluarRup(fila, id, ctx.conocimiento || {}, { incluirTextoDebil: !!ctx.incluirTextoDebil });
      const puertas = evaluarPuertas(fila, id, { rup, competencia: ctx.competencia || null, conocimiento: ctx.conocimiento || {} });
      if (!objetoPerdido(rup) && carenciasDe(rup, puertas).length === 0) return { socioId: p.socioId, nombre: p.nombre };
    } finally {
      delete PERFILES[id];
    }
  }
  return null;
}

/* ══════════════════════════════════════════════════════════════════════════
   socioPorProceso — la única función pública.
   ══════════════════════════════════════════════════════════════════════════ */
function socioPorProceso({ fila, base = "helder", candidatos = [], ctx = {} } = {}) {
  const perfilBase = Object.prototype.hasOwnProperty.call(PERFILES, base) ? PERFILES[base] : null;
  if (!perfilBase || !fila) return null;

  const rupBase = ctx.rup || evaluarRup(fila, base, ctx.conocimiento || {}, { incluirTextoDebil: !!ctx.incluirTextoDebil });
  const puertasBase = ctx.puertas || evaluarPuertas(fila, base, {
    rup: rupBase, competencia: ctx.competencia || null, conocimiento: ctx.conocimiento || {},
  });

  const falta = carenciasDe(rupBase, puertasBase);
  const cuantia = Number(fila.cuantia_cop ?? fila.precio_base ?? 0) || 0;

  /* EL OBJETO PRIMERO. Si el proceso murió por algo que ningún socio arregla
     —un convenio, una compra de dotación, un objeto genérico— no es «solo»: es
     que no es obra para nadie. Preguntarlo DESPUÉS de «¿le falta algo?» lo
     daba por bueno, porque esas causas no son carencias que un socio cubra y
     dejaban la lista de faltantes vacía. */
  if (objetoPerdido(rupBase)) {
    return {
      base: { perfilId: base, falta },
      recomendacion: { tipo: "ninguna_sirve", motivo: "objeto" },
      opciones: [],
      avisos: [],
      frase: "Un socio no cambia esto: el objeto de este proceso no es obra.",
    };
  }

  /* SOLO. No es una preferencia moral: es que se queda con el 100 %. */
  if (!falta.length) {
    return {
      base: { perfilId: base, falta: [] },
      recomendacion: { tipo: "solo", participacion_suya: 100 },
      opciones: [],
      avisos: [],
      frase: "Solo. Esta le alcanza sin socio: se queda con todo.",
    };
  }

  const opciones = [];
  for (const socioId of candidatos) {
    if (socioId === base) continue;
    const socio = Object.prototype.hasOwnProperty.call(PERFILES, socioId) ? PERFILES[socioId] : null;
    if (!socio || socio.integrantes) continue;        // un plural no entra como integrante

    const { rup, puertas, plural } = conPlural(perfilBase, socio, fila, ctx);
    const sigueFaltando = carenciasDe(rup, puertas);
    const abre = falta.filter((c) => !sigueFaltando.includes(c));
    if (!abre.length) continue;                       // este socio no aporta nada aquí

    const mipyme = avisoMipyme(socio, cuantia);
    opciones.push({
      socioId,
      nombre: socio.nombre,
      abre,
      sigue_faltando: sigueFaltando,
      cierra_todo: sigueFaltando.length === 0,
      aviso_mipyme: mipyme,
      lo_que_no_se_sabe: loQueNoSeSabe(socio),
      indicadores_que_empeoran: indicadoresQueEmpeoran(perfilBase, socio),
      capacidad_juntos: rup.k_cop,
      patrimonio_juntos: (Number(perfilBase.patrimonio) || 0) + (Number(socio.patrimonio) || 0),
      actividades_juntos: plural.unspsc.size,
      reparto: repartoSugerido(abre, socio),
      frase: frasePorCarencia(abre[0], socio, plural, perfilBase),
    });
  }

  if (!opciones.length) {
    return {
      base: { perfilId: base, falta },
      recomendacion: { tipo: "ninguna_sirve", motivo: "socios" },
      opciones: [],
      avisos: [],
      frase: `Ninguno de sus socios cubre lo que falta aquí: ${CARENCIAS[falta[0]]}.`,
    };
  }

  /* ORDEN, en el interés del dueño y en este orden:
       1. que pueda presentarse (cierra todo lo que falta),
       2. menos riesgo para él (sin el aviso de convocatoria limitada, y con
          menos indicadores empeorados: son los que el pliego pondera),
       3. más respaldo, como desempate.
     El porcentaje no entra en el orden porque no cambia qué puertas se abren
     (medido): entra en el consejo de reparto, más abajo. */
  opciones.sort((a, b) =>
    (b.cierra_todo - a.cierra_todo)
    || ((a.aviso_mipyme ? 1 : 0) - (b.aviso_mipyme ? 1 : 0))
    || (a.indicadores_que_empeoran.length - b.indicadores_que_empeoran.length)
    || (b.patrimonio_juntos - a.patrimonio_juntos));

  const mejor = opciones[0];
  /* La frase de arriba dice la verdad completa: si el socio mejora pero NO
     alcanza, se dice, porque lo contrario es prometer una habilitación que no
     existe. Si alcanza, se dice con qué reparto — y el reparto se resuelve a
     favor del dueño: cede lo menos posible. */
  const frase = mejor.cierra_todo
    ? `${mejor.frase} Reparto sugerido: ${mejor.reparto.suya} % usted, ${mejor.reparto.del_socio} % ${mejor.nombre}.`
    : `${mejor.frase} Aun así no alcanza: sigue faltando ${mejor.sigue_faltando.map((c) => CARENCIAS_CORTAS[c]).join(" y ")}.`;
  return {
    base: { perfilId: base, falta },
    recomendacion: {
      tipo: "con_socio",
      socio: mejor.socioId,
      nombre: mejor.nombre,
      cierra_todo: mejor.cierra_todo,
      reparto: mejor.reparto,
    },
    opciones,
    /* Los avisos del socio RECOMENDADO, no de todos: enumerar las cautelas de
       opciones que no se van a tomar es ruido que tapa la que sí importa. */
    avisos: [mejor.aviso_mipyme, ...mejor.lo_que_no_se_sabe].filter(Boolean),
    frase,
  };
}

module.exports = {
  socioPorProceso, pluralesDe, socioQueAlcanza,
  // expuestas para las pruebas de unidad
  carenciasDe, avisoMipyme, indicadoresQueEmpeoran, repartoSugerido, loQueNoSeSabe,
  UMBRAL_MIPYME_2026, CARENCIAS, CARENCIAS_CORTAS,
};
