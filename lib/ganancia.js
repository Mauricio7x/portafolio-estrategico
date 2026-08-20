/* ============================================================================
   lib/ganancia · ¿CUÁNTA PLATA DEJA ESTE CONTRATO?
   ----------------------------------------------------------------------------
   La tarjeta enseñaba «$1.183M de contrato esperado por intento — presupuesto ×
   opción de ganar, contando las veces que no se gana · no es utilidad». Era
   correcto y NADIE lo entendía: el contratista lo leía como la plata que le
   queda (lo reportó el dueño con esas palabras). Un número que se lee al revés
   de lo que dice es peor que no tenerlo.

   Este módulo responde la pregunta que el usuario CREÍA estar leyendo: si gana
   este contrato, cuánta plata le queda. Y la responde con una sola aritmética,
   la que el panel Piso/Techo ya usa en producción, para que la tarjeta y
   «Precios» nunca digan dos cifras distintas del mismo proceso.

   ── LA CUENTA, ENTERA Y EN UNA LÍNEA ──────────────────────────────────────
       ganancia = V × (1 − τ)  −  CD × (1 + (A + I)/100)

     V   precio al que probablemente se adjudica  = presupuesto oficial × (1 − baja)
     CD  costo directo de la obra
     A,I administración e imprevistos, en % del costo directo
     τ   lo que le descuentan de cada acta: contribución de obra pública (5 %,
         Ley 418/1997) + estampillas/ReteICA declaradas

   Equivale EXACTAMENTE a `(V − piso_sin_utilidad) × (1 − τ)`, y por eso se
   calcula así: `piso_sin_utilidad` lo publica `lib/apu/piso_techo`, que es
   quien define en este repositorio qué es «no perder plata». Reimplementar la
   cuenta habría creado una segunda definición de punto de equilibrio, y la
   divergencia se vería en el peor sitio posible: la tarjeta diría que deja y el
   panel de Precios que no. Hay prueba de la identidad, en las dos direcciones.

   Corolario que la prueba fija: en `V = piso_rentable` la ganancia vale
   exactamente `CD × U_min/100`. Es la definición de piso rentable, y sirve de
   control cruzado de que las dos cuentas son la misma.

   ── DE DÓNDE SALE EL COSTO DIRECTO: DOS NIVELES, NUNCA UN INVENTO ──────────
   · `apu` — el usuario ya costeó ESTE proceso en Precios: el costo directo está
     MEDIDO (`costo_directo_guardado` del borrador). La cifra es suya.
   · `estructura_de_precio` — no lo ha costeado. El costo NO se adivina: se
     cierra por la IDENTIDAD con la que se arma cualquier oferta de obra en
     Colombia —precio = costo directo × (1 + A + I + U)—, así que suponer que
     arma la oferta con su estructura actual para llegar al precio de mercado
     fija `CD = V / (1 + (A+I+U)/100)`. Es un supuesto DECLARADO sobre CÓMO
     construye el precio, no una estimación de sus costos, y viaja escrito.
   · Sin presupuesto oficial no hay ninguna de las dos: `null` y su motivo.
     Jamás un 0 — la regla de `anticipo_pct = 0` de todo el repositorio.

   ── LA CONTRIBUCIÓN DEL 5 % NO SE LE APLICA A TODO, Y ESO MUEVE EL SIGNO ────
   El art. 120 de la Ley 418/1997 (mod. Ley 1106/2006 art. 6, permanente por
   Ley 1738/2014) grava «los contratos de OBRA PÚBLICA» y sus adiciones. Una
   interventoría o una consultoría son contratos de consultoría (Ley 80/1993
   art. 32 num. 2), no de obra: cobrarles el 5 % restaría ~5 puntos de un margen
   típico de 4 y pondría en rojo, en la tarjeta, contratos que dejan plata. Se
   aplica por TIPO DE TRABAJO (el que ya clasifica `lib/filtros_lista`), y ante
   un tipo desconocido se aplica —el error cae del lado de no prometer de más—.

   ── ¿Y SI SU ADMINISTRACIÓN YA INCLUYE LOS IMPUESTOS? ──────────────────────
   El desglose de AIU que se radica en una oferta suele llevar dentro de la «A»
   una línea de «impuestos, tasas y contribuciones». Si es el caso, descontar la
   contribución OTRA VEZ aquí la cobraría dos veces, y el error vale 5 puntos
   del valor del contrato: más que la utilidad entera. No se adivina y no se
   promedia: lo declara el usuario con `contribucion_en_administracion`. El
   defecto es `false` —la doctrina que Piso/Techo ya aplica en producción: la
   contribución se descuenta del acta y va aparte—, y cuando está en `false` la
   respuesta dice con cuánta ganancia declarada se dejaría de perder plata
   (`utilidad_minima_para_no_perder_pct`), que es la instrucción accionable.

   ── SIEMPRE AL PRECIO DE MERCADO, TAMBIÉN CUANDO SALE EN ROJO ──────────────
   La ganancia se evalúa al precio al que la entidad SUELE ADJUDICAR, no al que
   el usuario tenga escrito en su borrador. Consecuencia deliberada: si su costo
   es tan alto que su precio mínimo queda por encima de ese techo, la cifra sale
   NEGATIVA — y eso es exactamente el veredicto «no se presente» del panel
   Piso/Techo («el precio que necesita para ganar está por debajo del precio que
   necesita para no perder plata»), adelantado a la tarjeta sin abrir Precios.
   La alternativa —enseñar la utilidad que dejaría a SU precio— sería una cifra
   en verde sobre un proceso que casi con seguridad no va a ganar. Aquí el falso
   positivo es el caro, como en todo el módulo de precios.

   ── UNA ASIMETRÍA CON `b_max`, DICHA PARA QUE NADIE LA «ARREGLE» A CIEGAS ──
   `lib/baja_maxima` calcula la baja máxima que el dueño soporta con la MISMA
   `pisoTecho`, y ahí la contribución sigue cobrándose SIEMPRE, sin mirar el
   tipo de trabajo ni el interruptor. No es un descuido y tampoco es doctrina:
   ese piso alimenta `p_ganar`, cuya cadena está medida en producción y probada
   contra el desglose de `/api/inteligencia`, así que moverlo aquí cambiaría la
   probabilidad de todo el corpus por un encargo que era sobre otra cifra. Queda
   apuntado como lo que es —un pendiente separado, no una decisión— y afecta
   solo a interventorías y consultorías CON presupuesto guardado: ahí el piso
   sale ~5 puntos alto y la probabilidad, algo baja.

   ── LO QUE ESTA CIFRA NO DESCUENTA, DICHO Y NO DISIMULADO ──────────────────
   El costo de financiar la obra mientras la entidad paga (el manual lo estima
   en ~5 puntos de margen), los ensayos, el plan de manejo ambiental y la
   liquidación. Ninguno consta en el dataset y ninguno se inventa: por eso la
   ganancia viaja SIEMPRE con `es_cota_superior` y sus motivos. Quien quiera el
   número con caja, payback y maldición del ganador tiene `lib/apu/rentabilidad`
   —que exige un presupuesto de verdad, y por eso vive en Precios y no aquí—.
   ========================================================================== */
"use strict";

const { pisoTecho } = require("./apu/piso_techo.js");

/* La tarifa vive en `lib/apu/calculo` (que es quien la aplica a los pesos del
   editor). Se IMPORTA, no se copia: dos tarifas que se desincronicen serían dos
   contribuciones distintas para el mismo contrato. `require` diferido y con
   respaldo por el mismo motivo que en `piso_techo`. */
const CONTRIBUCION_PCT = (() => {
  try { return require("./apu/calculo.js").CONTRIBUCION_OBRA_PUBLICA; } catch (_) { return 5; }
})();

/* Estructura de precio por defecto: la MISMA que traen los campos de Ajustes en
   el editor (A 15 · I 5 · U 5, el default recuperado del catálogo, dentro de
   las bandas del manual: A 12-20, I 3-5, U 5-10). No es una medición y se
   declara como supuesto en cuanto se usa. */
const AIU_DEFECTO = Object.freeze({ administracion_pct: 15, imprevistos_pct: 5, utilidad_pct: 5, modo: "aditivo" });

/* Tipos de trabajo de `lib/filtros_lista` que NO son contrato de obra pública y
   por tanto no causan la contribución del 5 %. Un tipo que no esté en la lista
   —incluido «otra» y el desconocido— SÍ la causa: ante la duda, no prometer. */
const TIPOS_SIN_CONTRIBUCION = Object.freeze(["interventoria", "consultoria"]);

const numero = (v) => {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};
const cop = (n) => (n == null || !Number.isFinite(n)
  ? "—"
  : `${n < 0 ? "−" : ""}$${Math.abs(Math.round(n)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".")}`);
const pct = (n) => (n == null || !Number.isFinite(n) ? "—" : `${(Math.round(n * 10) / 10).toString().replace(".", ",")} %`);

function aplicaContribucion(tipoTrabajo) {
  return !TIPOS_SIN_CONTRIBUCION.includes(String(tipoTrabajo || "").trim().toLowerCase());
}

/* Ganancia mínima declarada (en % del costo directo) con la que el precio deja
   de perder plata, dados A, I y τ. Se despeja de la igualdad del punto de
   equilibrio, y el despeje NO es el mismo en los dos modos de AIU:

     aditivo    (1 + (A+I+u)/100)·(1−τ) = 1 + (A+I)/100
                ⇒ u = 100 · (1 + (A+I)/100) · (1/(1−τ) − 1)
     compuesto  (1+A/100)(1+I/100)(1+u/100)·(1−τ) = (1+A/100)(1+I/100)
                ⇒ u = 100 · (1/(1−τ) − 1)          ← A e I se cancelan

   Solo tiene sentido cuando el costo directo se cierra POR la estructura de
   precio (nivel `estructura_de_precio`): ahí subir la ganancia declarada baja
   el costo directo implícito y mueve el resultado. Con el costo MEDIDO de un
   APU, el precio de mercado no se mueve porque el usuario declare otra
   ganancia, y lo accionable es el piso del panel Piso/Techo, no esta cifra.
   Sin descuentos (τ = 0) no hay nada que despejar y devuelve 0. */
function utilidadMinimaParaNoPerder(aPct, iPct, tauPct, modo = "aditivo") {
  const tau = (numero(tauPct) || 0) / 100;
  if (!(tau > 0) || tau >= 1) return 0;
  const base = modo === "compuesto" ? 1 : 1 + ((numero(aPct) || 0) + (numero(iPct) || 0)) / 100;
  return Math.round(base * (1 / (1 - tau) - 1) * 10000) / 100;
}

/* ─────────────────────────────────────────────────────────────────────────
   `gananciaDeProceso` — la única definición. La llaman el listado (la tarjeta)
   y quien quiera auditarla; nunca se recalcula por fuera.
   ───────────────────────────────────────────────────────────────────────── */
function gananciaDeProceso(entrada = {}) {
  const {
    presupuesto_oficial = null,
    tipo_trabajo = null,
    baja = null,                     // registro de lib/indice_baja.bajaDeMercado
    competencia = null,              // registro de lib/indice_competencia.competenciaDe
    costo_directo = null,            // MEDIDO, del borrador de APU de este proceso
    borrador = null,                 // id del borrador del que salió, para poder auditarlo
    aiu = null,                      // {administracion_pct, imprevistos_pct, utilidad_pct, modo}
    aiu_origen = null,               // "suyo" (config del usuario) | null ⇒ se usa el defecto
    deducciones_pct = null,          // null = sin cargar ⇒ la cifra es COTA SUPERIOR
    contribucion_en_administracion = false,
    p_ganar = null,
  } = entrada;

  const po = numero(presupuesto_oficial);
  /* Se ACOTAN a [0, 100] como hace `lib/apu/calculo.normalizarConfig`: la
     configuración viaja VERBATIM dentro del borrador (nadie la valida al
     guardarla), así que un valor absurdo llegaría hasta aquí. Con A e I
     negativos el factor podría dar 0 y el costo directo saldría infinito. */
  const acotar = (n, d) => Math.min(100, Math.max(0, n ?? d));
  const A = acotar(numero(aiu && aiu.administracion_pct), AIU_DEFECTO.administracion_pct);
  const I = acotar(numero(aiu && aiu.imprevistos_pct), AIU_DEFECTO.imprevistos_pct);
  const U = acotar(numero(aiu && aiu.utilidad_pct), AIU_DEFECTO.utilidad_pct);
  const modo = (aiu && aiu.modo === "compuesto") ? "compuesto" : "aditivo";
  const origenAiu = aiu_origen === "suyo" ? "suyo" : "defecto";
  const ded = numero(deducciones_pct);
  const contribucionAplica = aplicaContribucion(tipo_trabajo) && !contribucion_en_administracion;
  const contribucionPct = contribucionAplica ? CONTRIBUCION_PCT : 0;

  const sinCifra = (motivo, frase) => ({
    valor: null, por_intento: null, base: null, motivo, frase,
    precio_esperado: null, origen_precio: null, costo_directo: null,
    descuentos: null, costo_sin_ganancia: null, utilidad_declarada: null, margen_pct: null,
    contribucion_aplica: contribucionAplica, contribucion_pct: contribucionPct, tau_pct: null,
    aiu: { administracion_pct: A, imprevistos_pct: I, utilidad_pct: U, modo, origen: origenAiu },
    utilidad_minima_para_no_perder_pct: null,
    es_cota_superior: true, cota_superior_por: [], supuestos: [], borrador: null,
  });

  if (po == null || po <= 0) {
    return sinCifra("sin_presupuesto_oficial",
      "Este proceso no publica presupuesto oficial: no hay contra qué calcular lo que deja.");
  }

  /* ── V: el precio al que probablemente se adjudica ──────────────────────
     La baja tiene que venir CON BASE (n ≥ 5 en la cascada de `bajaDeMercado`);
     `pisoTecho` ya lo exige y devuelve `techo_competitivo: null` si no. Sin
     base se usa el presupuesto oficial y se DECLARA: la mediana global medida
     del corpus es 0 % —adjudicar por el oficial es lo normal— así que es el
     supuesto neutro, no un optimismo. */

  /* ── CD: medido si hay APU de este proceso; si no, cerrado por la identidad
     de construcción de la oferta. Se resuelve DESPUÉS de V porque el segundo
     camino depende de V, y por eso V se calcula primero con un piso/techo de
     sondeo que solo usa la baja (el costo no interviene en el techo). */
  const factorAiuTotal = modo === "compuesto"
    ? (1 + A / 100) * (1 + I / 100) * (1 + U / 100)
    : 1 + (A + I + U) / 100;

  const cdMedido = numero(costo_directo);
  const conApu = cdMedido != null && cdMedido > 0;

  // sondeo: `techo_competitivo` NO depende del costo directo, así que un costo
  // cualquiera > 0 basta para leerlo; se usa el propio presupuesto oficial
  const sonda = pisoTecho({
    presupuesto_oficial: po, costo_directo: po,
    aiu: { administracion_pct: A, imprevistos_pct: I, utilidad_pct: U, modo },
    deducciones_pct: ded, contribucion_pct: contribucionPct, baja, competencia,
  });
  const techo = numero(sonda.cifras && sonda.cifras.techo_competitivo);
  const V = techo != null && techo > 0 ? techo : po;
  const origenPrecio = techo != null && techo > 0 ? "mercado" : "presupuesto_oficial";

  const CD = conApu ? cdMedido : V / factorAiuTotal;

  /* ── la cuenta, con la MISMA función del panel ─────────────────────────── */
  const pt = pisoTecho({
    presupuesto_oficial: po, costo_directo: CD,
    aiu: { administracion_pct: A, imprevistos_pct: I, utilidad_pct: U, modo },
    deducciones_pct: ded, contribucion_pct: contribucionPct,
    baja, competencia, modalidad: null,
  });
  if (!pt.aplicable) {
    return sinCifra(pt.motivo || "sin_costo", pt.veredicto);
  }
  const tauPct = numero(pt.cifras.tau_pct) || 0;
  /* LA RESTA QUE SE ENSEÑA TIENE QUE CUADRAR AL PESO: precio − descuentos −
     costo = lo que queda. Por eso el costo sale de `costo_sin_utilidad`, que
     `pisoTecho` redondea UNA vez, y no de `piso_sin_utilidad`, que además ya
     viene dividido por (1 − τ): dos redondeos encadenados pueden mover el
     resultado un peso justo en el borde del signo, y aquí el signo es lo que
     decide si el usuario se presenta.
     El nombre es `costo_sin_ganancia` y NO `costo_total` a propósito: el
     `costo_total` de `pisoTecho` lleva la utilidad mínima dentro. Dos cifras
     parecidas con nombres parecidos es `total_procesos`/`procesos_contados`. */
  const costoSinGanancia = numero(pt.cifras.costo_sin_utilidad);
  const descuentos = Math.round(V * tauPct / 100);
  const valor = Math.round(V) - descuentos - costoSinGanancia;
  const utilidadDeclarada = Math.round(CD * U / 100);
  const p = numero(p_ganar);
  const porIntento = p != null && p > 0 ? Math.round(valor * p) : null;

  /* ── por qué la cifra es una COTA SUPERIOR ──────────────────────────────
     Se enumera. «Cota superior» sin decir por qué es una etiqueta; con los
     motivos es una lista de lo que el usuario puede cargar para cerrarla. */
  const cotaPor = [];
  if (ded == null) cotaPor.push("no están cargadas las estampillas ni el ReteICA del pliego");
  cotaPor.push("no descuenta el costo de financiar la obra mientras la entidad paga");
  if (!conApu) cotaPor.push("no descuenta los ensayos, el plan de manejo ambiental ni la liquidación");

  const supuestos = [];
  if (origenPrecio === "presupuesto_oficial") {
    supuestos.push("No hay historial suficiente de esta entidad para saber cuánto se suele bajar: se supone que se adjudica por el presupuesto oficial.");
  }
  if (!conApu) {
    supuestos.push(`Todavía no ha costeado este proceso: se supone que arma la oferta con su estructura actual (administración ${pct(A)}, imprevistos ${pct(I)}, ganancia ${pct(U)}) hasta el precio de mercado. Calcúlelo en Precios para tener la cifra con su costo real.`);
  }
  if (origenAiu === "defecto") {
    supuestos.push(`Su administración, imprevistos y ganancia no están declarados: se usan los de referencia (${pct(A)} · ${pct(I)} · ${pct(U)}).`);
  }
  if (!aplicaContribucion(tipo_trabajo)) {
    supuestos.push("La contribución del 5 % es de los contratos de obra pública (Ley 418 de 1997, art. 120): a una interventoría o una consultoría no se le descuenta.");
  } else if (contribucion_en_administracion) {
    supuestos.push("Usted declaró que su administración ya incluye la contribución del 5 % y las estampillas: no se descuentan otra vez.");
  }

  /* La ganancia mínima que evitaría la pérdida solo se puede despejar cuando el
     costo se cierra por la estructura de precio: con el costo MEDIDO, subir la
     ganancia declarada no mueve el precio al que la entidad adjudica. */
  const uMinima = conApu ? null : utilidadMinimaParaNoPerder(A, I, tauPct, modo);

  /* ── la frase: el hecho, no el modelo ───────────────────────────────────
     En rojo NO se dice solo «pierde plata»: se dice qué hacer. Y qué hacer
     depende del nivel — con el costo medido lo que falta es precio; con el
     costo cerrado por la estructura, lo que falta es ganancia declarada. */
  let frase;
  if (valor > 0) {
    frase = `Si gana este contrato a ${cop(V)} le quedan ${cop(valor)} después de pagar la obra`
      + (tauPct > 0 ? ` y los ${cop(descuentos)} que le descuentan de las actas.` : ".");
  } else if (valor === 0) {
    frase = `A ${cop(V)} este contrato queda exactamente en el punto de equilibrio: no deja nada.`;
  } else if (conApu) {
    frase = `A ${cop(V)} este contrato deja una pérdida de ${cop(-valor)}: lo que usted costeó `
      + `(${cop(costoSinGanancia)} de obra, administración e imprevistos) no cabe en el precio al que aquí se adjudica`
      + (tauPct > 0 ? `, menos los ${cop(descuentos)} que le descuentan de las actas.` : ".");
  } else if (contribucionAplica) {
    frase = `A ${cop(V)} este contrato deja una pérdida de ${cop(-valor)}: con una ganancia declarada del ${pct(U)} `
      + `no alcanza para pagar la contribución del ${pct(CONTRIBUCION_PCT)} de obra pública. Necesitaría declarar al menos ${pct(uMinima)}.`;
  } else {
    frase = `A ${cop(V)} este contrato deja una pérdida de ${cop(-valor)}: `
      + `con una ganancia declarada del ${pct(U)} no alcanza para lo que le descuentan de las actas.`;
  }

  return {
    valor,
    por_intento: porIntento,
    base: conApu ? "apu" : "estructura_de_precio",
    motivo: null,
    frase,
    precio_esperado: Math.round(V),
    origen_precio: origenPrecio,
    baja_aplicada_pct: numero(pt.cifras.baja_esperada_pct),
    baja_procesos: numero(pt.cifras.baja_procesos),
    costo_directo: Math.round(CD),
    costo_sin_ganancia: costoSinGanancia,
    descuentos,
    utilidad_declarada: utilidadDeclarada,
    margen_pct: V > 0 ? Math.round((valor / V) * 10000) / 100 : null,
    contribucion_aplica: contribucionAplica,
    contribucion_pct: contribucionPct,
    tau_pct: tauPct,
    aiu: { administracion_pct: A, imprevistos_pct: I, utilidad_pct: U, modo, origen: origenAiu },
    utilidad_minima_para_no_perder_pct: uMinima,
    es_cota_superior: true,
    cota_superior_por: cotaPor,
    supuestos,
    borrador: conApu ? (borrador || null) : null,
    fuentes: {
      precio: "Histórico de adjudicaciones de SECOP II (`p6dx-8zbt`): presupuesto oficial menos lo que descontó quien ganó. Solo se usa con 5 o más procesos comparables.",
      costo: conApu
        ? "El costo directo que usted calculó para este proceso en Precios."
        : "Cerrado por la identidad con la que se arma una oferta de obra: precio = costo directo × (1 + administración + imprevistos + ganancia).",
      descuentos: `Contribución especial de obra pública, ${pct(CONTRIBUCION_PCT)} del valor del contrato (Ley 418 de 1997, art. 120; permanente por Ley 1738 de 2014)`
        + (ded != null ? ", más las estampillas y retenciones que usted cargó." : ". Las estampillas del pliego no están cargadas."),
    },
  };
}

module.exports = {
  gananciaDeProceso, aplicaContribucion, utilidadMinimaParaNoPerder,
  AIU_DEFECTO, TIPOS_SIN_CONTRIBUCION, CONTRIBUCION_PCT, cop, pct,
};
