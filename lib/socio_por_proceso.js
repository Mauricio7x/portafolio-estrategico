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
   La caja, el tope y las actividades de un proponente plural NO DEPENDEN DEL
   PORCENTAJE: son suma o unión de los integrantes. Desde el 25-sep-2026 los
   indicadores tampoco (el pliego tipo suma los balances, lib/perfiles). La
   CAPACIDAD DE CONTRATACIÓN sí se mueve un poco: la Guía de capacidad residual
   mide la experiencia de cada integrante contra el presupuesto × SU
   participación, y en obras grandes el escalón cambia. Medido ese día con
   Helder y cada socia al 90/70/50/30/10: hasta 3.000 millones, nada; a 20.000
   millones, hasta un 20 % entre extremos. Aquí se evalúa al 50/50 y se DECLARA;
   la frontera por reparto es trabajo del recomendador. De ahí las dos preguntas
   separadas que responde este módulo:

     1. ¿CON QUIÉN se abre la puerta?  → una evaluación por socio, sin barrer
        porcentajes. Es lo que lo hace viable por fila.
     2. ¿EN QUÉ PORCENTAJE?            → casi nunca cambia qué puertas se abren;
        cambia cuánto se queda el dueño (y, en obras grandes, un poco la K).

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

const { PERFILES, derivarPlural, UMBRAL_MIPYME_COP } = require("./perfiles.js");
const { evaluarRup } = require("./rup.js");
const { evaluarPuertas, mensajeCasaSoloPorServicio } = require("./puertas.js");
const { crp } = require("./capacidad.js");

/* Umbral para limitar una convocatoria a Mipyme en 2026. La cifra vive en
   lib/perfiles (UMBRAL_MIPYME_COP) porque también es el piso de la capacidad de
   organización de la Guía de capacidad residual: una sola copia. */
const UMBRAL_MIPYME_2026 = UMBRAL_MIPYME_COP;

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
   Los indicadores del plural salen de sumar los balances (pliego tipo): un
   socio con la cifra más baja BAJA la del conjunto, tanto más cuanto más grande
   sea su balance frente al del dueño. No se compara contra el pliego (no se
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
  /* 50/50 DECLARADO (ver la cabecera): caja, tope, actividades e indicadores
     no dependen del %; la capacidad sí, un poco y solo en obras grandes. */
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
   El porcentaje casi nunca cambia qué puertas se abren (medido, ver la
   cabecera): cambia sobre todo cuánto se queda el dueño.

   Regla: ceder lo MENOS posible. CORREGIDO el 25-sep-2026: aquí se decía que
   «varios Documentos Tipo» exigen al que aporta la experiencia un mínimo del
   30 % al 40 %, y ninguno lo hace (docs/PROPONENTE_PLURAL.md, apartado 3): el
   pliego tipo reparte la EXPERIENCIA (uno ≥ 50 % de la exigida, los demás ≥ 5 %)
   y 21 de 241 pliegos leídos añaden un mínimo de participación, el más repetido
   30 %. Las cifras de abajo siguen siendo un consejo prudente, no una regla, y
   el recomendador por proceso (docs/MEMORIA.md, pendiente del 25-sep-2026) las
   sustituirá por la frontera que dé el pliego leído. */
const PARTE_SI_APORTA_EXPERIENCIA = 40;   // el socio; el dueño se queda con 60
const PARTE_SI_SOLO_APORTA_RESPALDO = 20; // el socio; el dueño se queda con 80

function repartoSugerido(abre, socio) {
  const aportaExperiencia = abre.includes("actividad");
  const delSocio = aportaExperiencia ? PARTE_SI_APORTA_EXPERIENCIA : PARTE_SI_SOLO_APORTA_RESPALDO;
  return {
    suya: 100 - delSocio,
    del_socio: delSocio,
    porque: aportaExperiencia
      ? `Aquí ${socio.nombre} aporta la experiencia. El pliego tipo no exige un porcentaje mínimo de participación, `
        + "pero algunos pliegos sí (de 241 leídos, 21; el más repetido, 30 %). Por prudencia se le deja una parte que cubre ese caso. "
        + "Verifique en el pliego si fija un mínimo antes de firmar."
      : `Aquí ${socio.nombre} aporta respaldo, no experiencia: nada le obliga a cederle más. `
        + "Por encima del 10 % el socio sigue contando para los criterios diferenciales, así que no hace falta bajar de ahí.",
    nota: "El reparto casi nunca cambia a qué procesos se puede presentar: cambia cuánto se queda usted. Con el pliego tipo tampoco mueve la liquidez ni el endeudamiento del consorcio, que salen de sumar los balances de los dos.",
  };
}

/* ── el reparto sugerido NO puede cerrar la puerta que el socio abre ─────────
   (25-sep-2026, revisión adversaria). La capacidad se evalúa al 50/50, pero
   desde que lib/capacidad sigue la Guía la K del plural depende del reparto (la
   experiencia de cada uno se mide contra SU parte del presupuesto). Reproducido:
   Helder + Génesis ante 9.630 M abren la capacidad al 50/50 (K 9.651 M) y el
   consejo era 80/20, donde la K baja a 8.987 M y ya no cubre. Aquí se comprueba
   con la MISMA `crp` y, si hace falta, se sube la parte del socio de punto en
   punto hasta que cubra (como mucho al 50 %, donde se sabe que cubre). */
function repartoQueSostieneLaCapacidad(reparto, { perfilBase, base, socio, socioId, puertas, sigueFaltando, cuantia }) {
  const crpc = puertas && puertas.p2_k && Number.isFinite(Number(puertas.p2_k.crpc)) ? Number(puertas.p2_k.crpc) : null;
  if (crpc == null || !(cuantia > 0) || sigueFaltando.includes("capacidad") || !(puertas.p2_k && puertas.p2_k.pasa) || puertas.p2_k.sin_dato) return reparto;
  const kCon = (delSocio) => crp({ integrantes: [
    { perfil: perfilBase, perfilId: base, participacion: (100 - delSocio) / 100 },
    { perfil: socio, perfilId: socioId, participacion: delSocio / 100 },
  ] }, cuantia);
  let d = reparto.del_socio;
  while (d < 50 && !(kCon(d) >= crpc)) d++;
  if (d === reparto.del_socio) return reparto;
  return {
    ...reparto, suya: 100 - d, del_socio: d, ajustado_por_capacidad: true,
    porque: `${reparto.porque} Con menos del ${d} % para ${socio.nombre} la capacidad de contratación del consorcio no alcanza para este proceso: `
      + "la experiencia de cada uno se mide contra su parte del presupuesto, así que el reparto sube hasta donde alcanza.",
    nota: `Aquí el reparto sí importa: por debajo del ${d} % para ${socio.nombre} el consorcio deja de alcanzar esta cuantía.`,
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
    /* CON EL SOCIO, EL OBJETO TAMBIÉN TIENE QUE SOBREVIVIR (23-sep-2026). Con
       él dentro el código casa, pero la pertinencia puede tumbar el objeto
       (un servicio de salud con 85101500 de Génesis): `carenciasDe` no lo ve
       —su `paso` ya no es `unspsc`— y el socio «abría la actividad» de un
       proceso que no es obra para nadie. El predicado barato
       (`socioQueAlcanza`) ya lo exigía; esta rama no. */
    if (objetoPerdido(rup)) continue;
    const sigueFaltando = carenciasDe(rup, puertas);
    const abre = falta.filter((c) => !sigueFaltando.includes(c));
    if (!abre.length) continue;                       // este socio no aporta nada aquí

    /* El código casa con el socio, pero solo por una clase de servicios que no
       son obra y el objeto no dice que lo sea: lo que la aplicación mide se
       abre, y aun así no se puede prometer «con un socio, sí» (lib/puertas). */
    const objetoPorConfirmar = !!(puertas.p1_rup && puertas.p1_rup.casa_solo_por_servicio);
    const mipyme = avisoMipyme(socio, cuantia);
    opciones.push({
      socioId,
      nombre: socio.nombre,
      abre,
      sigue_faltando: sigueFaltando,
      objeto_por_confirmar: objetoPorConfirmar,
      cierra_todo: sigueFaltando.length === 0 && !objetoPorConfirmar,
      aviso_mipyme: mipyme,
      lo_que_no_se_sabe: loQueNoSeSabe(socio),
      indicadores_que_empeoran: indicadoresQueEmpeoran(perfilBase, socio),
      capacidad_juntos: rup.k_cop,
      patrimonio_juntos: (Number(perfilBase.patrimonio) || 0) + (Number(socio.patrimonio) || 0),
      actividades_juntos: plural.unspsc.size,
      reparto: repartoQueSostieneLaCapacidad(repartoSugerido(abre, socio), { perfilBase, base, socio, socioId, puertas, sigueFaltando, cuantia }),
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
          menos indicadores empeorados: son los que el evaluador lee),
       3. más respaldo, como desempate.
     El porcentaje no entra en el orden porque casi nunca cambia qué puertas se
     abren (medido, ver la cabecera): entra en el consejo de reparto, más abajo. */
  opciones.sort((a, b) =>
    (b.cierra_todo - a.cierra_todo)
    || ((a.aviso_mipyme ? 1 : 0) - (b.aviso_mipyme ? 1 : 0))
    || (a.indicadores_que_empeoran.length - b.indicadores_que_empeoran.length)
    || (b.patrimonio_juntos - a.patrimonio_juntos));

  const mejor = opciones[0];
  /* La frase de arriba dice la verdad completa: si el socio mejora pero NO
     alcanza, se dice, porque lo contrario es prometer una habilitación que no
     existe. Si alcanza, se dice con qué reparto — y el reparto se resuelve a
     favor del dueño: cede lo menos posible. El objeto por confirmar se dice con
     la MISMA frase que P1 (lib/puertas), con el socio de sujeto: una sola
     redacción del hecho. */
  const frase = mejor.cierra_todo
    ? `${mejor.frase} Reparto sugerido: ${mejor.reparto.suya} % usted, ${mejor.reparto.del_socio} % ${mejor.nombre}.`
    : mejor.sigue_faltando.length
      ? `${mejor.frase} Aun así no alcanza: sigue faltando ${mejor.sigue_faltando.map((c) => CARENCIAS_CORTAS[c]).join(" y ")}.`
      : mensajeCasaSoloPorServicio(mejor.nombre);
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
