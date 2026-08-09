/* ============================================================================
   lib/apu/normativa · Qué hay DETRÁS de los factores que multiplican el APU
   ----------------------------------------------------------------------------
   El motor aplica tres factores que un contratista tiene que poder discutir con
   su contador y con el interventor: el PRESTACIONAL sobre el jornal, el AIU
   sobre el costo directo y el IVA sobre la utilidad. Hasta ago 2026 los tres
   eran números sueltos en la pantalla: 1,55 · 15/5/5 · 19 %. Un número sin su
   norma no se puede defender en una audiencia.

   ESTE MÓDULO NO DECIDE NINGÚN PRECIO. El factor que se APLICA sigue saliendo
   del catálogo (`regiones[…].prestacional_tipico`, que carga un administrador y
   vive en Redis); aquí solo vive la EXPLICACIÓN — qué componentes lo forman y
   de qué norma sale cada uno. La separación es la misma que ya se decidió entre
   `lib/apu/tipologias.js` y el catálogo de precios: aquello es PRECIO (cambia
   con el mercado, lo carga alguien), esto es CRITERIO Y NORMA (cambia con la
   ley, tiene que verse en un diff y no puede depender de que alguien haya
   corrido la carga). Convertir este módulo en una segunda fuente del factor
   aplicado sería el defecto `total_procesos`/`procesos_contados` otra vez, y
   aquí serían pesos en un jornal.

   ══════════ EL 1,55 ES UN SUPUESTO, NO UN DATO ══════════
   Hay que decirlo con todas las letras porque el catálogo lo rotula
   «recuperado» y eso engaña: se recuperó de un comentario del `modulo_apu.html`
   borrado, que decía literalmente «Factor prestacional típico obra pública
   Colombia ≈ 1.55». Recuperar un supuesto no lo convierte en dato. El rango que
   el propio informe del proyecto reporta es 1,45–1,60 según qué prestaciones se
   incluyan (docs/APU_INFORME_COMPLETO.md), y lo correcto es liquidarlo con la
   nómina real del contratista.

   Y NO ES UNA PERILLA LIBRE: las nueve cuadrillas del Nogal se guardaron como
   `precio_dia_con_prestaciones ÷ 1,55` y el motor re-multiplica por 1,55, así
   que la calibración es CIRCULAR — reproduciría igual de bien el contrato con
   1,40 o con 1,70. Lo que sí rompe moverlo es el precio: subirlo a 1,60 desvía
   los 157 ítems `NOG-*` un 1 % de media y hasta un 2,89 % en el peor caso, en
   silencio. Quien cambie el factor tiene que saber eso.

   ══════════ LO QUE NO CUADRA, Y POR QUÉ SE PUBLICA EN VEZ DE TAPARSE ══════════
   La suma nominal de las tasas de ley da 58,29 % y el catálogo aplica 55,00 %.
   NO se ajustó ningún componente para que cuadre: hacerlo habría sido inventar
   una tasa para salvar una cifra, que es exactamente lo que este repositorio no
   hace.

   Y HAY QUE CONTAR LA BRECHA EXACTA, sin insinuar que las causas la cierran
   —una primera redacción de este mismo módulo lo insinuaba y la aritmética la
   desmintió—:
     · Con la ARL de clase V en su tarifa MÍNIMA (4,350 %) el nominal baja a
       55,68 %: sigue POR ENCIMA del 55,00 % aplicado. La banda de ARL sola no
       explica la brecha.
     · Con la exoneración de parafiscales (−13,5 pp) el nominal cae a 44,79 %:
       muy POR DEBAJO.
   O sea: **el 55 % no se descompone en ninguna combinación legal exacta**. Cae
   entre las dos cotas, que es donde debe caer un factor de referencia de
   mercado, y eso —y solo eso— es lo que se afirma.

   ══════════ ADVERTENCIA DE MÉTODO (la misma de docs/COMPLEMENTO) ══════════
   Este entorno NO alcanza las fuentes oficiales colombianas (403 verificado en
   funcionpublica.gov.co, colombiacompra.gov.co y datos.gov.co), así que las
   normas citadas salen de conocimiento estable y NO se pudieron abrir para
   confirmarlas. Por eso cada componente viaja con `verificado: false` y la
   respuesta lo declara. **Ninguna de estas cifras debe usarse en una oferta sin
   abrir la norma.** Y por eso mismo NO se cita ninguna «resolución del año»:
   una referencia normativa inventada en la herramienta con la que se fija un
   precio de oferta es el peor error que este módulo podría cometer.
   ========================================================================== */
"use strict";

/* Cada componente: tasa sobre el salario base, norma que lo fija y por qué esa
   tasa. `base` distingue lo que se calcula sobre el salario de lo que se
   calcula sobre otra cosa (los intereses de cesantías son un 12 % DE LAS
   CESANTÍAS, no del salario) — sin ese campo la tabla parecería aritmética
   simple y no lo es. */
const COMPONENTES_PRESTACIONAL = Object.freeze([
  {
    id: "cesantias",
    nombre: "Cesantías",
    pct: 8.33,
    grupo: "prestaciones_sociales",
    base: "salario",
    norma: "CST art. 249",
    detalle: "Un mes de salario por año trabajado: 30/360 = 8,33 %.",
  },
  {
    id: "intereses_cesantias",
    nombre: "Intereses sobre las cesantías",
    pct: 1.00,
    grupo: "prestaciones_sociales",
    base: "cesantias",
    norma: "Ley 52/1975 art. 1",
    detalle: "12 % anual sobre las cesantías: 0,12 × 8,33 % = 1,00 % del salario.",
  },
  {
    id: "prima",
    nombre: "Prima de servicios",
    pct: 8.33,
    grupo: "prestaciones_sociales",
    base: "salario",
    norma: "CST art. 306",
    detalle: "30 días de salario por año: 30/360 = 8,33 %.",
  },
  {
    id: "vacaciones",
    nombre: "Vacaciones",
    pct: 4.17,
    grupo: "prestaciones_sociales",
    base: "salario",
    norma: "CST art. 186",
    detalle: "15 días hábiles de descanso remunerado por año: 15/360 = 4,17 %.",
  },
  {
    id: "salud",
    nombre: "Salud · aporte del empleador",
    pct: 8.5,
    grupo: "seguridad_social",
    base: "salario",
    /* La Ley 100/1993 art. 204 fijó la cotización ORIGINAL en 12 %, repartida
       2/3 empleador (8 %) y 1/3 trabajador. El 12,5 % con el reparto 8,5 / 4
       —que es el vigente y el que se aplica aquí— lo introdujo la Ley 1122/2007
       art. 10. Citar solo el 204 haría que la norma NO sostuviera la cifra que
       acompaña, y una norma mal atribuida se lee como verificada: es peor que
       una ausente. */
    norma: "Ley 100/1993 art. 204, modificado por la Ley 1122/2007 art. 10",
    detalle: "8,5 % del 12,5 % total; el 4 % restante lo aporta el trabajador.",
    exonerable: true,
  },
  {
    id: "pension",
    nombre: "Pensión · aporte del empleador",
    pct: 12.0,
    grupo: "seguridad_social",
    base: "salario",
    /* Mismo caso: el art. 20 original fijó 13,5 %. El 16 % con reparto 75/25
       (12 % empleador / 4 % trabajador) viene de la Ley 797/2003 art. 7 y del
       incremento posterior que esa misma ley autorizó. */
    norma: "Ley 100/1993 art. 20, modificado por la Ley 797/2003 art. 7",
    detalle: "12 % del 16 % total; el 4 % restante lo aporta el trabajador.",
  },
  {
    id: "arl",
    nombre: "ARL · riesgos laborales (construcción, clase V)",
    pct: 6.96,
    grupo: "seguridad_social",
    base: "salario",
    norma: "Decreto 1072/2015 · tabla de cotización",
    detalle: "Clase V (obra civil): tarifa inicial 6,960 %; banda 4,350 % – 8,700 % según siniestralidad.",
    banda: { min: 4.35, max: 8.7 },
  },
  {
    id: "sena",
    nombre: "SENA",
    pct: 2.0,
    grupo: "parafiscales",
    base: "salario",
    norma: "Ley 21/1982 art. 7",
    detalle: "Aporte parafiscal del 2 % sobre la nómina.",
    exonerable: true,
  },
  {
    id: "icbf",
    nombre: "ICBF",
    pct: 3.0,
    grupo: "parafiscales",
    base: "salario",
    /* La Ley 21/1982 regula el subsidio familiar y el aporte al SENA — NO el
       del ICBF, que nace de la Ley 27/1974; el 3 % lo fija la Ley 89/1988.
       Atribuirlo al art. 7 de la 21/1982 era directamente incorrecto. */
    norma: "Ley 27/1974, con la tarifa del 3 % fijada por la Ley 89/1988 art. 1",
    detalle: "Aporte parafiscal del 3 % sobre la nómina.",
    exonerable: true,
  },
  {
    id: "caja",
    nombre: "Caja de compensación familiar",
    pct: 4.0,
    grupo: "parafiscales",
    base: "salario",
    norma: "Ley 21/1982 art. 7",
    detalle: "Aporte parafiscal del 4 %; NO entra en la exoneración de la Ley 1607/2012.",
  },
]);

const GRUPOS = Object.freeze({
  prestaciones_sociales: "Prestaciones sociales",
  seguridad_social: "Seguridad social",
  parafiscales: "Parafiscales",
});

const red2 = (n) => Math.round(n * 100) / 100;

/* `Number(null)` y `Number("")` son 0, y los dos son finitos: usar
   `Number.isFinite(Number(x))` como guarda de «sin dato» convierte la AUSENCIA
   del factor en un −100 % perfectamente creíble. Es el defecto que este
   repositorio ya documentó en `lib/probabilidad` («numero() no sirve de guarda»)
   y lo cazó la primera verificación de este módulo. La ausencia se descarta
   ANTES de tocar Number. */
function factorONull(v) {
  if (v === null || v === undefined || v === "" || typeof v === "boolean") return null;
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/**
 * El desglose del factor prestacional, contrastado contra el factor que de
 * verdad APLICA el motor.
 *
 * @param {number} factorAplicado  el `prestacional_tipico` de la región (p. ej. 1.55).
 *   Se recibe, NO se importa: el catálogo es la única fuente del factor aplicado
 *   y este módulo solo lo explica. Sin él la respuesta lo dice en vez de
 *   suponer uno — un factor por defecto aquí sería una segunda fuente de verdad.
 */
function desglosePrestacional(factorAplicado) {
  const componentes = COMPONENTES_PRESTACIONAL.map((c) => ({ ...c, verificado: false }));
  const sumaNominal = red2(componentes.reduce((a, c) => a + c.pct, 0));
  const exonerables = red2(componentes.filter((c) => c.exonerable).reduce((a, c) => a + c.pct, 0));
  const sumaExonerada = red2(sumaNominal - exonerables);

  // `factorAplicado` llega como multiplicador (1,55) y se compara en puntos (55)
  const factor = factorONull(factorAplicado);
  const aplicadoPct = factor == null ? null : red2((factor - 1) * 100);

  const porGrupo = {};
  for (const c of componentes) {
    porGrupo[c.grupo] = red2((porGrupo[c.grupo] || 0) + c.pct);
  }

  return {
    factor_aplicado: factor,
    // «no sé» jamás se pinta como cero: sin factor del catálogo, null
    aplicado_pct: aplicadoPct,
    componentes,
    grupos: GRUPOS,
    por_grupo: porGrupo,
    suma_nominal_pct: sumaNominal,
    suma_exonerada_pct: sumaExonerada,
    exonerables_pct: exonerables,
    /* LA BRECHA ES EL DATO, no el error. Se publica con signo: positivo =
       el catálogo aplica MENOS que la suma nominal de la ley. */
    brecha_pp: aplicadoPct == null ? null : red2(sumaNominal - aplicadoPct),
    dentro_de_banda: aplicadoPct == null ? null : (aplicadoPct <= sumaNominal && aplicadoPct >= sumaExonerada),
    /* LA EXONERACIÓN NO ES AUTOMÁTICA, y aquí eso decide un precio. La condición
       SUBJETIVA es lo que faltaba: una persona natural solo queda exonerada si
       ocupa DOS O MÁS trabajadores, y el perfil «Helder» de este repositorio es
       persona natural con UN profesional. Ofrecerle «−13,5 pp» sin la condición
       lo induciría a restarse algo a lo que probablemente no tiene derecho — y
       eso viaja directo al precio de la oferta. */
    exoneracion: {
      norma: "Estatuto Tributario art. 114-1 (introducido por la Ley 1607/2012 art. 25 y reformado por la Ley 1819/2016 art. 65)",
      alcance: "SENA, ICBF y salud del empleador, sobre los trabajadores que devenguen menos de 10 SMMLV.",
      condicion: "Aplica a personas jurídicas contribuyentes del impuesto de renta, y a personas naturales "
        + "empleadoras SOLO si ocupan dos o más trabajadores. Un contratista persona natural con un solo "
        + "empleado NO queda exonerado.",
      automatica: false,
      efecto_pp: exonerables,
    },
    /* La calibración vive atada a este factor: se dice aquí, donde alguien
       podría tener la tentación de moverlo. */
    atado_a_calibracion: "Las nueve cuadrillas del contrato Nogal se guardaron como «día con prestaciones ÷ 1,55» "
      + "y el motor re-multiplica por el factor de la región: cambiarlo desvía los 157 ítems NOG-* "
      + "(≈1 % de media, 2,89 % en el peor caso) sin que ninguna cifra lo delate.",
    procedencia: "Supuesto de mercado redondo, heredado del módulo original del proyecto («factor prestacional "
      + "típico obra pública Colombia ≈ 1,55»). El rango que se reporta habitualmente es 1,45–1,60 según qué "
      + "prestaciones y seguridad social se incluyan. Liquide el suyo con su nómina real antes de ofertar.",
    verificado: false,
    advertencia: "Tasas citadas de conocimiento normativo estable: este entorno no alcanza las fuentes "
      + "oficiales (403 en funcionpublica.gov.co y colombiacompra.gov.co), así que NO se pudieron abrir para "
      + "confirmarlas. Verifíquelas con su contador antes de usarlas en una oferta.",
    /* El texto NO puede contradecir a las cifras que lo acompañan (la regla que
       el censo de columnas históricas ya dejó escrita), y por eso NO dice que
       las causas cierren la brecha: se comprobó que no la cierran. */
    como_leerlo: aplicadoPct == null
      ? "El catálogo no publicó un factor prestacional para esta región: no hay contra qué contrastar el desglose."
      : `El catálogo aplica ${aplicadoPct} %. La suma nominal de las tasas de ley da ${sumaNominal} %; `
        + `con la exoneración de parafiscales (si aplica) baja a ${sumaExonerada} %. El ${aplicadoPct} % está entre las dos `
        + `y NO es la suma exacta de ninguna combinación de estos ${componentes.length} componentes: es un valor de `
        + "referencia de mercado, redondo, dentro del rango 1,45–1,60 que se reporta habitualmente. No se ajustó "
        + "ningún componente para hacerlo cuadrar. Y quedan FUERA de esta tabla dos costos reales de nómina que no "
        + "son salario —dotación (Ley 11/1984) y auxilio de transporte—, así que un empleador exonerado que los "
        + "pague puede superar el 44,79 % sin ninguna incoherencia. Liquide el suyo con su nómina real antes de ofertar.",
  };
}

/* ─────────────────────────── AIU e IVA ───────────────────────────────────
   Las bandas salen del Manual del Analista (docs/GUIA_ANALISTA_LICITACIONES.md,
   cap. 11) y los defaults del contrato Nogal 4, que es el que calibró el
   catálogo. El IVA del 19 % es sobre la UTILIDAD, no sobre el contrato: es como
   cierra el formulario de la referencia y por eso el exportador lo reproduce. */
const AIU = Object.freeze({
  administracion: {
    nombre: "Administración (A)",
    banda: { min: 12, max: 20 },
    detalle: "Dirección de obra, oficina, pólizas, ensayos e impuestos de la oferta.",
    fuente: "Manual del analista, cap. 11 · banda típica en obra pública",
  },
  imprevistos: {
    nombre: "Imprevistos (I)",
    banda: { min: 3, max: 5 },
    detalle: "Es una PRIMA DE RIESGO, no utilidad: financia lo que no se pudo prever, y si no ocurre no es ganancia contable.",
    fuente: "Manual del analista, cap. 11",
  },
  utilidad: {
    nombre: "Utilidad (U)",
    banda: { min: 5, max: 10 },
    detalle: "La ganancia esperada del contratista. Es la base del IVA del 19 %.",
    fuente: "Manual del analista, cap. 11",
  },
});

/* LAS TARIFAS SE IMPORTAN DEL MOTOR, no se vuelven a escribir. Tenerlas aquí
   como literales las convertía en una segunda fuente de verdad de dos cifras
   que ya decidían pesos en `lib/apu/calculo.js` — y dos constantes «iguales
   hoy» divergen a la primera corrección que se aplique a una sola. El `require`
   va DIFERIDO dentro de las funciones que lo necesitan por la misma razón que
   en `lib/apu/inferencia`: en tiempo de carga ataría este módulo al grafo del
   motor, y la normativa tiene que poder leerse sin él. */
function tarifasDelMotor() {
  const { IVA_TARIFA, CONTRIBUCION_OBRA_PUBLICA } = require("./calculo.js");
  return { iva: IVA_TARIFA, contribucion: CONTRIBUCION_OBRA_PUBLICA };
}

/* Los tres impuestos que se olvidan y que NO están en el AIU: van sobre el
   valor del contrato y se cargan aparte (`deducciones_pct`). Se publican aquí
   porque el panel de normativa es donde el dueño los va a buscar. */
function deducciones() {
  return Object.freeze([
    {
      id: "contribucion_obra_publica",
      nombre: "Contribución especial de obra pública",
      pct: tarifasDelMotor().contribucion,
      norma: "Ley 418/1997 art. 120, modificada por la Ley 1106/2006 y hecha permanente por la Ley 1738/2014 art. 8",
      detalle: "Del valor total del contrato SIN impuestos. Aplica también a las adiciones. Es el olvido más caro del país.",
    },
    {
      id: "estampillas",
      nombre: "Estampillas departamentales y municipales",
      // `null`, no 0: no hay tasa nacional y un 0 se leería como «no se paga»
      pct: null,
      norma: "Ordenanzas y acuerdos de cada entidad territorial",
      detalle: "0,5 % – 5 % acumulado según la entidad. NO tiene una tasa nacional: hay que leerla en el pliego de cada proceso.",
    },
    {
      id: "reteica",
      nombre: "ReteICA",
      pct: null,
      norma: "Acuerdo municipal de cada municipio",
      detalle: "0,4 % – 1,4 % según el municipio y la actividad.",
    },
  ]);
}

/**
 * El bloque completo que consume la UI. `catalogo` es OPCIONAL y solo se usa
 * para leer el factor que se aplica de verdad; sin él, el desglose viaja sin
 * contraste en vez de inventarse un factor.
 */
function normativaAplicada(catalogo, regionId) {
  let factor = null;
  try {
    const regiones = (catalogo && catalogo.regiones) || [];
    const lista = Array.isArray(regiones) ? regiones : Object.values(regiones);
    /* SOLO la región pedida. Caer a `lista[0]` cuando no se encuentra parecía
       inofensivo y no lo es: por la vía de los hashes ese orden es el del SCAN,
       o sea una región ARBITRARIA, y el panel publicaría el factor de una
       región que nadie pidió como si fuera el aplicado. Sin región, el desglose
       viaja sin contraste y lo declara — que es lo que significa «no sé». */
    const region = regionId ? lista.find((r) => r && r.id === regionId) : null;
    factor = region ? factorONull(region.prestacional_tipico) : null;
  } catch { factor = null; }

  const t = tarifasDelMotor();
  return {
    prestacional: desglosePrestacional(factor),
    aiu: AIU,
    iva_sobre_utilidad_pct: t.iva,
    /* LA MEJOR CITA NORMATIVA DEL MÓDULO VIVE AQUÍ desde ago 2026. Estaba en
       `como_leerlo.iva` de `lib/apu/calculo.js`, un campo que el frontend de la
       pestaña APU no pinta: el módulo que existe para ser el hogar de las
       normas carecía de la única cita bien sostenida, y la cita estaba atrapada
       donde nadie la lee. */
    iva_norma: "art. 3 del D. 1372/1992, hoy art. 1.3.1.7.9 del D. 1625/2016",
    /* LAS DOS MITADES, porque cada artefacto hace una cosa distinta y cada
       media verdad es falsa del otro: el motor NO suma el IVA al precio y la
       hoja de Excel SÍ lo suma a su TOTAL (reproduce el cierre del formulario
       de referencia, y publica al lado la fila «PRECIO FINAL OFERTADO (sin IVA
       de utilidad)»). Decir solo una de las dos deja al dueño creyendo que su
       precio incluye —o no incluye— algo que en el otro sitio es al revés. */
    iva_nota: `El ${t.iva} % se causa sobre la UTILIDAD del constructor (la «U» del AIU), no sobre el valor `
      + "del contrato. NO está sumado al «precio final» que calcula el editor; SÍ está sumado al TOTAL de la hoja "
      + "de Excel exportada, que reproduce el cierre del formulario de referencia y publica además la fila "
      + "«PRECIO FINAL OFERTADO (sin IVA de utilidad)».",
    deducciones: deducciones(),
    region_utilizada: regionId || null,
    /* Los defaults 15/5/5 NO son del Nogal: salen del módulo original y de las
       bandas del manual. El AIU real del contrato adjudicado fue 19,17/1,50/5,33
       — y su «I» queda POR DEBAJO de la banda típica, que es la prueba de que
       las bandas son indicativas y no una validación: pintar en rojo el AIU de
       un contrato realmente adjudicado sería el error. */
    fuente_defaults: "Los defaults 15/5/5 salen del módulo original del proyecto y de las bandas del manual "
      + "(cap. 11), no del contrato Nogal, cuyo AIU real fue 19,17 / 1,50 / 5,33. Las bandas son indicativas: "
      + "el AIU lo fija cada pliego.",
  };
}

module.exports = {
  COMPONENTES_PRESTACIONAL, GRUPOS, AIU, deducciones, tarifasDelMotor,
  desglosePrestacional, normativaAplicada,
};
