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
/* Las carencias del PLURAL, con la capacidad juzgada en CUALQUIER reparto y no
   solo al 50/50 (25-sep-2026): la K no es monótona en el reparto, y un hueco en
   el 50/50 retiraba de la lista procesos que el consorcio alcanza con otro
   reparto. El umbral es el de la puerta P2 (`crpc_minimo`): la lista no esconde
   por un anticipo que el proceso no publica. */
function carenciasConReparto(fila, rup, puertas, plural, opts) {
  const falta = carenciasDe(rup, puertas, opts);
  if (!falta.includes("capacidad") || !plural || !Array.isArray(plural.integrantes) || plural.integrantes.length !== 2) return falta;
  const { capacidadEnAlgunReparto } = require("./reparto.js");
  const { cargaK, presupuestoDe } = require("./rup.js");
  const presupuesto = presupuestoDe(fila);
  if (!(presupuesto > 0)) return falta;
  const [a, b] = plural.integrantes;
  const alcanza = capacidadEnAlgunReparto({ dueno: a.perfil, socio: b.perfil, presupuestoCOP: presupuesto, crpc: cargaK(fila, presupuesto).crpc_minimo });
  return alcanza === true ? falta.filter((c) => c !== "capacidad") : falta;
}

/* `opts.siLaPiden` (27-sep-2026, revisión adversaria): cuenta también la capacidad que
   no cabe donde no consta que el pliego la pida (`k_supera_si_la_piden`), para ofrecer
   el socio que la resolvería SI la piden. Sin esa opción, solo cuenta la que la ley pide. */
function carenciasDe(rup, puertas, opts) {
  const falta = [];
  if (rup.paso === PASO_QUE_UN_SOCIO_CUBRE) falta.push("actividad");
  if (rup.dentro_de_k === false || (opts && opts.siLaPiden && rup.k_supera_si_la_piden === true)) falta.push("capacidad");
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
    /* Con lo que SECOP II le registra en obra (27-sep-2026, lib/contratos_en_ejecucion) la
       capacidad YA descuenta esos contratos, también los de sus consorcios: decir «no descuenta
       la obra» sería falso. Lo que sigue sin descontarse es lo que tenga fuera de SECOP II. */
    const restados = socio.contratosSecop && Array.isArray(socio.contratosSecop.sce) ? socio.contratosSecop.sce.length : 0;
    avisos.push({
      clave: "carga_del_socio",
      frase: `${socio.nombre} tiene ${socio.contratosRup} contratos acreditados, pero el registro no dice cuáles sigue ejecutando.`,
      porque: restados
        ? `La capacidad que se muestra aquí ya descuenta ${restados === 1 ? "el contrato de obra" : `los ${restados} contratos de obra`} que SECOP II le registra en ejecución (a su nombre o en sus consorcios, por su parte), pero no lo que tenga fuera de SECOP II. `
          + "Pregúntele qué más está ejecutando antes de contar con toda esa capacidad."
        : "La capacidad que se muestra aquí no descuenta la obra que el socio ya tenga encima. "
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
    return `Esta obra pasa del tope que usted mismo se fijó para ir solo; en consorcio con ${socio.nombre} no hay tope: lo que cuenta es la capacidad de contratación y lo que pida el pliego.`;
  }
  if (clave === "caja") {
    const suma = (Number(base.patrimonio) || 0) + (Number(socio.patrimonio) || 0);
    return `${socio.nombre} aporta respaldo: entre los dos el patrimonio llega a ${pesos(suma)}.`;
  }
  return `${socio.nombre} cubre lo que le falta.`;
}

/* ── el reparto, resuelto A FAVOR DEL DUEÑO (25-sep-2026) ────────────────
   Ya no son dos cifras fijas (60/40 si el socio aportaba la experiencia, 80/20
   si solo respaldo), que salían de un «30 % al 40 %» que ningún pliego tipo
   exige y que además podían cerrar la capacidad que el socio abría. Ahora es la
   FRONTERA de lib/reparto: la mayor parte para el dueño que sostiene la
   capacidad de contratación (la misma `crp`, con el umbral de la puerta P2) y
   la regla de experiencia del pliego tipo (50/5/10), con lo que no se puede
   medir sin el pliego dicho en `avisos`. Aquí no hay pliego leído: la
   experiencia exigida es la del pliego tipo según el presupuesto; con el pliego
   leído la da lib/consorcio.recomendarReparto. */
function repartoDe({ perfilBase, socio, fila, puertas }) {
  const { fronteraReparto } = require("./reparto.js");
  const { cargaK, presupuestoDe } = require("./rup.js");
  const presupuesto = presupuestoDe(fila);
  const carga = presupuesto > 0 ? cargaK(fila, presupuesto) : null;
  // donde la ley no pide capacidad de contratación, no ata el reparto (la misma regla que la puerta P2)
  const exK = require("./requisitos_ley.js").requisitosQueAplican(fila).capacidad;
  const f = fronteraReparto({ dueno: perfilBase, socio, presupuestoCOP: presupuesto, crpc: carga ? carga.crpc : null, crpcMinimo: carga ? carga.crpc_minimo : null, tipoContrato: fila.tipo_de_contrato || null,
    capacidadNoExigida: exK.exigida === false ? exK.nota : null });
  return {
    suya: f.suya_maxima,
    del_socio: f.del_socio,
    porque: f.frase,
    avisos: f.avisos,
    frontera: { deja_en: f.deja_en, experiencia: f.experiencia.estado, capacidad: f.capacidad },
    /* solo es verdad con la fórmula del pliego tipo: 46 de 241 pliegos ponderan por la participación (27-sep-2026, N21) */
    nota: "Con el pliego tipo el reparto no mueve la liquidez ni el endeudamiento del consorcio (salen de sumar los balances), pero algunos pliegos los calculan según la parte de cada uno: con el pliego leído, «¿Y con un socio?» de Mis procesos lo revisa con su fórmula. Lo que ata este reparto son la capacidad de contratación y la experiencia.",
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
      if (!objetoPerdido(rup) && carenciasConReparto(fila, rup, puertas, p.perfil).length === 0) return { socioId: p.socioId, nombre: p.nombre };
    } finally {
      delete PERFILES[id];
    }
  }
  return null;
}

/* Las opciones de socio para lo que falta (`falta`), sin ordenar: la llaman la rama
   general y la de «solo, si no la piden» (con `opts.siLaPiden`). */
/* LAS CONDICIONES DE UN «SOLO», EN UN SOLO SITIO (27-oct-2026). Las lee el recomendador
   para redactar su consejo y la lista para contar cuántos «solo» tienen condición sin
   correr el recomendador entero en cada fila: si la regla se escribiera dos veces, el
   conteo y la tarjeta dirían cifras distintas del mismo proceso.
   · anticipoK / anticipoCaja: la puerta pasa SOLO porque SECOP II no publica el anticipo
     (lib/puertas, `depende_del_anticipo` en P2 y en P3);
   · siNoLaPiden: la capacidad no alcanza pero no consta que la pidan. `!anticipoK` y no
     `!anticipo`: en P2 las dos ramas se excluyen, pero el anticipo de la CAJA y la
     capacidad que no consta que pidan pueden darse a la vez, y entonces se dicen las dos. */
/* · sinCuantia (revisión adversaria, 27-oct-2026): el proceso no publica cuantía y la
     capacidad y la caja pasan «sin dato» (lib/puertas): «le alcanza sin socio» sería una
     medida que nadie hizo. Excluye a las otras dos: sin cuantía no hay anticipo que mida. */
function condicionesDeSolo(puertas) {
  const p2 = puertas && puertas.p2_k, p3 = puertas && puertas.p3_caja;
  const anticipoK = !!(p2 && p2.pasa && p2.depende_del_anticipo);
  const anticipoCaja = !!(p3 && p3.pasa && p3.depende_del_anticipo);
  const siNoLaPiden = !anticipoK && !!(p2 && p2.pasa && p2.supera_si_la_piden);
  const sinCuantia = !!(p3 && p3.pasa && p3.sin_dato && p3.sin_dato_de === "cuantia");
  return { anticipoK, anticipoCaja, siNoLaPiden, sinCuantia, alguna: anticipoK || anticipoCaja || siNoLaPiden || sinCuantia };
}

/* «PRODIAC LTDA, reparto sugerido 99 % usted, 1 % PRODIAC LTDA»: la MISMA redacción en las
   dos condiciones del «solo» (si no hay anticipo, si piden capacidad). */
function fraseReparto(op) {
  return `${op.nombre}, reparto sugerido ${op.reparto.suya} % usted, ${op.reparto.del_socio} % ${op.nombre}`;
}

/* EL PLAN B DEL «SOLO CON ANTICIPO» (27-oct-2026): con quién iría si el pliego NO trae
   anticipo. No reescribe ninguna regla: es la MISMA cadena —`evaluarRup`, `evaluarPuertas`,
   `carenciasDe`, `opcionesDeSocio`— sobre la fila con el anticipo declarado en 0, que es
   exactamente lo que diría un pliego que lo niega. Solo corre en las filas que dependen del
   anticipo, así que no encarece la lista. Devuelve la mejor opción si cierra todo, o null. */
function socioSinAnticipo({ fila, base, perfilBase, candidatos, ctx, cuantia }) {
  const filaSin = { ...fila, anticipo_pct: 0, anticipo_declarado: true };
  const rup = evaluarRup(filaSin, base, ctx.conocimiento || {}, { incluirTextoDebil: !!ctx.incluirTextoDebil });
  const puertas = evaluarPuertas(filaSin, base, { rup, competencia: ctx.competencia || null, conocimiento: ctx.conocimiento || {} });
  if (objetoPerdido(rup)) return null;
  const falta = carenciasDe(rup, puertas);
  if (!falta.length) return null;
  const opciones = opcionesDeSocio({ fila: filaSin, base, perfilBase, candidatos, ctx: { ...ctx, rup, puertas }, cuantia, falta });
  return opciones.length && opciones[0].cierra_todo ? opciones[0] : null;
}

function opcionesDeSocio({ fila, base, perfilBase, candidatos, ctx, cuantia, falta, opts }) {
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
    const sigueFaltando = carenciasConReparto(fila, rup, puertas, plural, opts);
    /* UNA SOCIA SIN PATRIMONIO EN SU REGISTRO NO ABRE LA CAJA (27-oct-2026, revisión
       adversaria). La caja del plural pasa «sin dato» (lib/puertas: sin dato no es cero)
       y la opción decía «aporta respaldo: entre los dos el patrimonio llega a…» con la
       cifra del dueño solo, y «cierra todo, usted hasta el 99 %». Si al dueño solo NO le
       alcanzaba la caja, que la socia la cubra es justo lo que no se sabe: sigue faltando.
       La cascada (`socioQueAlcanza`) no lo aplica a propósito: allí el falso caro es
       esconder el proceso, y la tarjeta ya dice lo que falta. */
    if (falta.includes("caja") && !sigueFaltando.includes("caja")
      && puertas.p3_caja && puertas.p3_caja.patrimonio_conocido === false) sigueFaltando.push("caja");
    const abre = falta.filter((c) => !sigueFaltando.includes(c));
    if (!abre.length) continue;                       // este socio no aporta nada aquí

    /* El código casa con el socio, pero solo por una clase de servicios que no
       son obra y el objeto no dice que lo sea: lo que la aplicación mide se
       abre, y aun así no se puede prometer «con un socio, sí» (lib/puertas). */
    const objetoPorConfirmar = !!(puertas.p1_rup && puertas.p1_rup.casa_solo_por_servicio);
    const mipyme = avisoMipyme(socio, cuantia);
    const reparto = repartoDe({ perfilBase, socio, fila, puertas });
    opciones.push({
      socioId,
      nombre: socio.nombre,
      abre,
      sigue_faltando: sigueFaltando,
      objeto_por_confirmar: objetoPorConfirmar,
      // sin ningún reparto que sostenga la capacidad y la experiencia, no «cierra todo» (revisión adversaria)
      cierra_todo: sigueFaltando.length === 0 && !objetoPorConfirmar && reparto.suya != null,
      aviso_mipyme: mipyme,
      lo_que_no_se_sabe: loQueNoSeSabe(socio),
      indicadores_que_empeoran: indicadoresQueEmpeoran(perfilBase, socio),
      capacidad_juntos: rup.k_cop,
      patrimonio_juntos: (Number(perfilBase.patrimonio) || 0) + (Number(socio.patrimonio) || 0),
      actividades_juntos: plural.unspsc.size,
      reparto,
      frase: frasePorCarencia(abre[0], socio, plural, perfilBase),
    });
  }

  return ordenarOpciones(opciones);
}

function ordenarOpciones(opciones) {
  /* ORDEN, en el interés del dueño y en este orden:
       1. que pueda presentarse (cierra todo lo que falta),
       2. menos riesgo para él (sin el aviso de convocatoria limitada, y con
          menos indicadores empeorados: son los que el evaluador lee),
       3. más respaldo, como desempate.
     El porcentaje no entra en el orden porque casi nunca cambia qué puertas se
     abren (medido, ver la cabecera): entra en el consejo de reparto, más abajo. */
  return opciones.sort((a, b) =>
    (b.cierra_todo - a.cierra_todo)
    || ((a.aviso_mipyme ? 1 : 0) - (b.aviso_mipyme ? 1 : 0))
    || (a.indicadores_que_empeoran.length - b.indicadores_que_empeoran.length)
    || (b.patrimonio_juntos - a.patrimonio_juntos));
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
    /* SOLO, PERO CON ANTICIPO (26-sep-2026, revisión adversaria): la capacidad solo
       alcanza si el pliego da un anticipo que SECOP II no publica; «le alcanza sin
       socio» afirmaba de más. La recomendación no cambia —con anticipo va solo—,
       pero la frase dice la condición con la cifra de la puerta.
       Y LA CAJA TAMBIÉN (27-oct-2026): P3 publica ahora el mismo hecho
       (`depende_del_anticipo`); medido ese día, 20 «solo» de producción dependían del
       anticipo por la caja y no lo decía nadie. La cifra es la MAYOR de las dos
       puertas: con la menor, la otra podría seguir sin alcanzar. Y se calcula el plan
       B —con quién, si el pliego no trae anticipo— con las mismas puertas y el mismo
       recomendador sobre la fila con el anticipo declarado en 0. */
    const p2b = puertasBase && puertasBase.p2_k;
    const p3b = puertasBase && puertasBase.p3_caja;
    const { anticipoK, anticipoCaja, siNoLaPiden, sinCuantia } = condicionesDeSolo(puertasBase);
    const conAnticipo = anticipoK || anticipoCaja;
    const minimos = [anticipoK ? p2b.anticipo_minimo_pct : null, anticipoCaja ? p3b.anticipo_minimo_pct : null]
      .filter((x) => x != null && Number.isFinite(Number(x))).map(Number);
    const anticipoMinimo = minimos.length ? Math.max(...minimos) : null;
    const loQueFalta = anticipoK && anticipoCaja ? "ni la capacidad de contratación ni la caja para financiar la obra"
      : anticipoK ? "la capacidad de contratación" : "la caja para financiar la obra";
    const mejorSinAnticipo = conAnticipo ? socioSinAnticipo({ fila, base, perfilBase, candidatos, ctx, cuantia }) : null;
    /* SOLO, SI EL PLIEGO NO PIDE CAPACIDAD (27-sep-2026, el hermano del anticipo): la
       capacidad no alcanza, pero no consta que este proceso la pida (lib/requisitos_ley:
       régimen especial, mínima cuantía, un tipo que no es obra). «Le alcanza sin socio»
       afirmaría de más; se dice la condición. */

    /* Y SI LA PIDEN, CON QUIÉN (27-sep-2026, revisión adversaria): «solo, si no la
       piden» dejaba sin el socio que antes resolvía la capacidad —en régimen especial
       o con un tipo que no dice obra, el pliego a menudo sí la pide—. Se buscan las
       mismas opciones contando la capacidad como carencia condicional. */
    const siLaPiden = siNoLaPiden
      ? opcionesDeSocio({ fila, base, perfilBase, candidatos, ctx, cuantia, falta: carenciasDe(rupBase, puertasBase, { siLaPiden: true }), opts: { siLaPiden: true } })
      : [];
    const mejorSiLaPiden = siLaPiden.length && siLaPiden[0].cierra_todo ? siLaPiden[0] : null;
    return {
      base: { perfilId: base, falta: [] },
      recomendacion: { tipo: "solo", participacion_suya: 100,
        ...(conAnticipo ? { solo_con_anticipo: true, anticipo_minimo_pct: anticipoMinimo } : {}), ...(siNoLaPiden ? { solo_si_no_la_piden: true } : {}),
        ...(sinCuantia ? { solo_sin_cuantia: true } : {}),
        ...(mejorSinAnticipo ? { si_no_trae_anticipo: { socio: mejorSinAnticipo.socioId, nombre: mejorSinAnticipo.nombre, cierra_todo: true, reparto: mejorSinAnticipo.reparto } } : {}),
        ...(mejorSiLaPiden ? { si_la_piden: { socio: mejorSiLaPiden.socioId, nombre: mejorSiLaPiden.nombre, cierra_todo: true, reparto: mejorSiLaPiden.reparto } } : {}) },
      opciones: siLaPiden,
      avisos: [],
      frase: conAnticipo
        ? `Solo, si el pliego da un anticipo${anticipoMinimo != null ? ` del ${anticipoMinimo} % o más` : " alto"}${siNoLaPiden ? " y no pide capacidad de contratación" : ""}: `
          + `sin ${siNoLaPiden ? "anticipo" : "él"} no le alcanza ${loQueFalta}`
          + (mejorSinAnticipo ? ` y necesitaría un socio (${fraseReparto(mejorSinAnticipo)})` : ", y ninguno de sus socios lo cubre")
          // «; si la pide»: con dos «y» seguidos la frase no se dejaba leer
          + (siNoLaPiden ? `; si la pide necesitaría un socio${mejorSiLaPiden ? ` (${fraseReparto(mejorSiLaPiden)})` : ""}.${p2b.exigencia && p2b.exigencia.nota ? ` ${p2b.exigencia.nota}` : ""}` : ".")
          + " Confírmelo en el pliego."
        : siNoLaPiden
          ? `Solo, si el pliego no pide capacidad de contratación: no le alcanza, y si la pide necesitaría un socio${mejorSiLaPiden ? ` (${fraseReparto(mejorSiLaPiden)})` : ""}.${p2b.exigencia && p2b.exigencia.nota ? ` ${p2b.exigencia.nota}` : ""} Confírmelo en el pliego.`
          : sinCuantia
            ? "Solo, si la cuantía le cabe: el proceso no la publica, así que su capacidad y su caja no se pudieron medir. Confírmela en el pliego."
            : "Solo. Esta le alcanza sin socio: se queda con todo.",
    };
  }

  const opciones = opcionesDeSocio({ fila, base, perfilBase, candidatos, ctx, cuantia, falta });

  if (!opciones.length) {
    return {
      base: { perfilId: base, falta },
      recomendacion: { tipo: "ninguna_sirve", motivo: "socios" },
      opciones: [],
      avisos: [],
      frase: `Ninguno de sus socios cubre lo que falta aquí: ${CARENCIAS[falta[0]]}.`,
    };
  }


  const mejor = opciones[0];
  /* La frase de arriba dice la verdad completa: si el socio mejora pero NO
     alcanza, se dice, porque lo contrario es prometer una habilitación que no
     existe. Si alcanza, se dice con qué reparto — y el reparto se resuelve a
     favor del dueño: cede lo menos posible. El objeto por confirmar se dice con
     la MISMA frase que P1 (lib/puertas), con el socio de sujeto: una sola
     redacción del hecho. */
  const frase = mejor.cierra_todo
    ? `${mejor.frase} Reparto sugerido: ${mejor.reparto.suya} % usted, ${mejor.reparto.del_socio} % ${mejor.nombre}.`
    : mejor.reparto && mejor.reparto.suya == null && !mejor.sigue_faltando.length
      ? `${mejor.frase} ${mejor.reparto.porque}`
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

/* ══════════════════════════════════════════════════════════════════════════
   LO QUE LA FILA DE LA LISTA LLEVA DEL CONSEJO (27-oct-2026)
   --------------------------------------------------------------------------
   Encargo del dueño: «también se debe mostrar procesos en los que se puede
   presentar en consorcio y determinar qué % para cada proceso». Desde el
   11-sep-2026 la fila solo llevaba `{tipo, cierra_todo}` y el «con quién» se leía
   al guardar; el dueño lo pidió en la lista. Aquí se resume el MISMO veredicto
   —una sola fuente: la fila no puede nombrar otra socia ni otra parte que el
   recomendador— en lo que la tarjeta necesita:

     tipo, cierra_todo   como antes («solo», «con_socio», «ninguna_sirve»)
     con, con_nombre     la socia recomendada (id y nombre corto), o null
     parte_suya_max      la MAYOR parte del dueño que sostienen la capacidad y la
                         regla de experiencia (lib/reparto); 100 si va solo; null si
                         ninguna socia cierra. Es un techo provisional hasta leer el
                         pliego, nunca un reparto acordado
     condiciones         [] · "anticipo" · "capacidad_no_exigida" · "cuantia_sin_publicar"
     si_no_se_cumple     con quién y con qué parte si la condición falla, o null
     linea               la frase de la tarjeta, de 90 caracteres o menos

   `conCifras: false` (sin credencial): la parte sale de las finanzas del perfil y
   se tapa, y la línea va sin ella. */
const LARGO_LINEA = 90; // lo que cabe en una línea de tarjeta en el teléfono
const APORTE = Object.freeze({
  capacidad: "suma la capacidad que le falta",
  caja: "aporta el respaldo para financiar la obra",
  actividad: "tiene la actividad que le falta en su registro",
  // la obra supera el tope que el dueño se fijó: con un socio la comparte (revisión adversaria)
  tope: "comparte una obra que supera su tope estratégico",
});
/* «PRODIAC», «Génesis», «PICS»: el nombre que se lee en una línea de tarjeta. Si el
   perfil trae `nombreCorto`, ese; si no, la primera palabra de su nombre. */
function nombreCortoDe(socioId, nombre) {
  const p = socioId && Object.prototype.hasOwnProperty.call(PERFILES, socioId) ? PERFILES[socioId] : null;
  if (p && p.nombreCorto) return String(p.nombreCorto);
  const primera = String((p && p.nombre) || nombre || "").trim().split(/\s+/)[0] || "";
  return primera.replace(/[.,;:]+$/, "") || null;
}
function resumenParaLista(v, { conCifras = true } = {}) {
  const r = v && v.recomendacion;
  if (!r) return null;
  const falta = (v.base && Array.isArray(v.base.falta)) ? v.base.falta : [];
  const parteDe = (x) => {
    const suya = conCifras && x && x.reparto ? x.reparto.suya : null;
    return suya == null || suya === "" || !Number.isFinite(Number(suya)) ? null : Number(suya);
  };
  const condiciones = [];
  if (r.tipo === "solo" && r.solo_con_anticipo) condiciones.push("anticipo");
  if (r.tipo === "solo" && r.solo_si_no_la_piden) condiciones.push("capacidad_no_exigida");
  if (r.tipo === "solo" && r.solo_sin_cuantia) condiciones.push("cuantia_sin_publicar");
  /* con UNA condición, su plan B; con las dos a la vez cada una tiene su socio y no
     se promete uno solo (el expediente dice las dos) */
  const planB = condiciones.length === 1 ? (condiciones[0] === "anticipo" ? r.si_no_trae_anticipo : r.si_la_piden) : null;
  const siNo = planB && planB.socio
    ? { con: planB.socio, con_nombre: nombreCortoDe(planB.socio, planB.nombre), parte_suya_max: parteDe(planB) } : null;
  const conSocio = r.tipo === "con_socio";
  const cierra = conSocio ? !!r.cierra_todo : null;
  const con = conSocio && r.socio ? r.socio : null;
  const conNombre = con ? nombreCortoDe(con, r.nombre) : null;
  const parteSuya = r.tipo === "solo" ? 100 : conSocio && cierra ? parteDe(r) : null;
  const hasta = (pct) => (pct != null ? ` (usted, hasta el ${pct} %)` : "");
  const mipyme = Array.isArray(v.avisos) && v.avisos.some((a) => a && a.clave === "mipyme");
  let linea = null;
  if (r.tipo === "solo") {
    if (!condiciones.length) linea = "Solo: le alcanza sin socio.";
    else if (condiciones[0] === "cuantia_sin_publicar") linea = "Solo, si la cuantía le cabe: el proceso no la publica.";
    else if (condiciones.length === 2) linea = "Solo si el pliego trae anticipo y no pide capacidad: confírmelo en el pliego.";
    else if (condiciones[0] === "anticipo") {
      linea = siNo ? `Solo si el pliego trae anticipo; sin él, con ${siNo.con_nombre}${hasta(siNo.parte_suya_max)}.`
        : "Solo si el pliego trae anticipo; sin él, ninguno de sus socios alcanza.";
    } else {
      linea = siNo ? `Solo si el pliego no pide capacidad; si la pide, con ${siNo.con_nombre}${hasta(siNo.parte_suya_max)}.`
        : "Solo si el pliego no pide capacidad; si la pide, ninguno de sus socios alcanza.";
    }
  } else if (conSocio && cierra) {
    /* lo que ABRE la socia recomendada (la misma `abre` de la que sale la frase del
       expediente); sin opciones, lo primero que le falta */
    const abre = Array.isArray(v.opciones) && v.opciones[0] && Array.isArray(v.opciones[0].abre) ? v.opciones[0].abre[0] : null;
    const aporte = APORTE[abre || falta[0]] || null;
    const parte = parteSuya != null ? `Usted, hasta el ${parteSuya} %.` : "";
    linea = mipyme
      ? `Con ${conNombre}, si no limitan a empresas pequeñas.${parte ? ` ${parte}` : ""}`
      : `Con ${conNombre}${aporte ? `: ${aporte}.` : "."}${parte ? ` ${parte}` : ""}`;
  } else if (conSocio) {
    linea = `Con ${conNombre || "un socio"} se acerca, pero puede no bastar. Guárdelo para ver qué falta.`;
  } else if (r.tipo === "ninguna_sirve" && r.motivo !== "objeto") {
    linea = "Ninguno de sus socios cubre lo que le falta.";
  }
  /* LA LÍNEA CABE EN 90, CON CUALQUIER NOMBRE (segunda revisión adversaria): con los nombres
     de hoy la más larga mide 85, y una socia futura de nombre corto largo la pasaría. Se cae
     a una versión más corta —primero sin el detalle, después sin el nombre, que sigue en
     `con_nombre`—, nunca se corta a media palabra. */
  if (linea && linea.length > LARGO_LINEA) {
    const nombre = (siNo && siNo.con_nombre) || conNombre;
    const parte = parteSuya != null && conSocio ? ` Usted, hasta el ${parteSuya} %.` : "";
    const candidatas = r.tipo === "solo"
      ? (condiciones[0] === "anticipo"
        ? [`Solo si el pliego trae anticipo; sin él, con ${nombre}.`, "Solo si el pliego trae anticipo; sin él, necesita un socio."]
        : [`Solo si el pliego no pide capacidad; si la pide, con ${nombre}.`, "Solo si el pliego no pide capacidad; si la pide, necesita un socio."])
      : conSocio && cierra
        ? [`Con ${nombre}.${parte}`, `Con un socio que cubre lo que le falta.${parte}`]
        : ["Con un socio se acerca, pero puede no bastar. Guárdelo para ver qué falta."];
    linea = candidatas.find((c) => c.length <= LARGO_LINEA) || candidatas[candidatas.length - 1];
  }
  return { tipo: r.tipo, cierra_todo: cierra, con, con_nombre: conNombre, parte_suya_max: parteSuya, condiciones, si_no_se_cumple: siNo, linea };
}

/* ══════════════════════════════════════════════════════════════════════════
   EL RESCATE POR LA CAJA, EN UN SOLO SITIO (27-oct-2026)
   --------------------------------------------------------------------------
   La cascada compartida (lib/filtros) no conoce la caja: P3 se aplica después, en el
   listado y en el conteo del pulso. Desde que la caja cierra cuando ni con el anticipo
   máximo legal alcanza (lib/puertas), una obra que solo deja fuera la caja y que un socio
   cubre desaparecía. Se queda si el MISMO recomendador de la tarjeta la ve «con socio».
   La llaman el listado (con su veredicto memoizado) y `contarOportunidades` (el pulso y
   la entrada): la segunda revisión adversaria midió que con la regla solo en el listado
   la portada decía 755 y «Ver las N» abría 758. Solo corre el recomendador en las filas
   que únicamente deja fuera la caja, y solo para el perfil del dueño (los demás no tienen
   socias que ofrecerle).
   ══════════════════════════════════════════════════════════════════════════ */
function soloFallaLaCaja(puertas) {
  const p = puertas || {};
  return !!(p.p1_rup && p.p1_rup.pasa && p.p2_k && p.p2_k.pasa && p.p3_caja && p.p3_caja.pasa === false);
}
function rescatePorCaja(puertas, veredicto) {
  const r = veredicto && veredicto.recomendacion;
  return soloFallaLaCaja(puertas) && !!(r && r.tipo === "con_socio");
}
/* Devuelve el veredicto si la fila se rescata por la caja; null si no aplica. */
function rescateDeFilaPorCaja({ fila, base, rup, puertas, conocimiento = {}, competencia = null, incluirTextoDebil = false } = {}) {
  if (!soloFallaLaCaja(puertas)) return null;
  const { ID_DUENO, CANDIDATOS_CONSORCIO } = require("./perfiles.js");
  if (base !== ID_DUENO || !CANDIDATOS_CONSORCIO.length) return null;
  const v = socioPorProceso({ fila, base, candidatos: CANDIDATOS_CONSORCIO, ctx: { rup, puertas, conocimiento, competencia, incluirTextoDebil } });
  return rescatePorCaja(puertas, v) ? v : null;
}

module.exports = {
  socioPorProceso, pluralesDe, socioQueAlcanza, resumenParaLista, nombreCortoDe, condicionesDeSolo,
  soloFallaLaCaja, rescatePorCaja, rescateDeFilaPorCaja,
  // expuestas para las pruebas de unidad
  carenciasDe, carenciasConReparto, avisoMipyme, indicadoresQueEmpeoran, repartoDe, loQueNoSeSabe,
  UMBRAL_MIPYME_2026, CARENCIAS, CARENCIAS_CORTAS,
};
