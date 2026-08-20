/* ============================================================================
   lib/apu/rentabilidad · Precio competitivo, flujo de caja, VEG y payback
   ----------------------------------------------------------------------------
   Este módulo responde tres preguntas distintas que la app solía confundir:

     ¿Cuánto deja?      → margen (bruto y neto). Decide si VALE LA PENA.
     ¿Se puede?         → K_max, el capital de trabajo máximo expuesto.
                          Decide si la empresa PUEDE. No lo sustituye el margen.
     ¿Cuánto vale la    → VEG = P(ganar)·U_esperada − C_preparación.
      oportunidad?        Es el ORDEN PRIMARIO, no el margen.

   Un contrato puede tener utilidad contable positiva todo el tiempo y caja
   negativa todo el tiempo: se quiebra por caja. Por eso se publican por
   separado y ninguno se promedia con el otro.

   ── LA PIEZA DELICADA: P(ganar | precio) ───────────────────────────────────
   En obra pública colombiana EL MÉTODO DE PONDERACIÓN ECONÓMICA SE SORTEA en
   la audiencia (Ley 1882 de 2018): el proponente elige su precio SIN SABER si
   le tocará media geométrica o menor valor. La consecuencia es dura y va contra
   la intuición: **ofertar más barato NO maximiza la probabilidad de ganar**.
   Bajar el precio compra probabilidad SOLO en el escenario «menor valor»
   (≈25 % bajo el supuesto declarado de cuatro mecanismos equiprobables) y la
   DESTRUYE en los otros tres, mientras el margen cae linealmente.

   Por eso `pGanarPorPrecio` no es una sigmoide monótona sino una MEZCLA de los
   dos regímenes, que es lo que §1.E.5 del diseño prescribe («reportar la curva
   como mezcla, no como una sola»):

       P(b) = π · P_menor_valor(b)  +  (1 − π) · P_central(b)
       P_menor_valor(b) = Φ((b − μ)/σ)^(n̄−1)     ← ESTA es la sigmoide: crece
                                                     monótonamente con la baja
       P_central(b)     = exp(−(b − μ)² / 2σ²) / n̄ ← campana alrededor del centro

   La sigmoide sigue ahí y se publica aparte (`p_menor_valor`), para que se vea
   de dónde sale cada mitad. Y el resultado se aplica como MULTIPLICADOR sobre
   la `p` de lib/probabilidad, normalizado para valer 1 en la mediana del
   mercado: así ofertar al centro devuelve EXACTAMENTE la probabilidad que ya
   publica /api/oportunidades. Dos cálculos de la misma cifra que discrepan es
   el defecto que este repositorio ya ha pagado dos veces.

   `n̄` es una REFERENCIA FIJA, no el número de oferentes de la entidad: el
   efecto de nivel de la competencia ya lo lleva `p_base`. Ponerlo también en la
   forma lo contaba dos veces y hacía que, con una baja muy por encima de la
   mediana, catorce oferentes dieran más probabilidad que tres.

   `lib/probabilidad.js` NO toma el precio (se comprobó: solo lee
   `_cierre_prorrogado` y el contexto de competencia y baja). De ahí que la
   modulación por precio viva aquí y no allí.

   DÓNDE TERMINA ESTE MÓDULO. Aquí se responde «cuánto deja ESTE precio». La
   pregunta siguiente —«¿y cuál es el precio que más deja?»— vive en
   `lib/apu/optimizador`, que barre el rango de bajas plausibles llamando a
   `rentabilidad()` una vez por punto. No está aquí para no meter dentro del
   motor una función que itera sobre el motor, y sobre todo para que el precio
   recomendado y el margen que se enseña salgan literalmente de la misma cuenta.

   DÓNDE EMPIEZA ESTE MÓDULO. El presupuesto —ítems, costo directo, AIU, IVA y
   contribución— lo calcula `lib/apu/calculo.js`, y aquí no se recalcula nada de
   eso: `desdePresupuesto()` toma su `resumen` tal cual y le añade la capa que
   aquel no cubre —flujo de caja mes a mes, capital expuesto, payback, precio
   piso, maldición del ganador y VEG—. Un segundo cálculo del costo directo
   divergiría del primero a la primera corrección que se aplicara a uno solo.
   ========================================================================== */
"use strict";

const PI_MENOR_VALOR = 0.25;
const N_REFERENCIA_CURVA = 6;
const DISPERSION_DEFECTO = 4.0;
const LAMBDA_MALDICION = 0.21;
const SIGMA_EST_BAJO = 0.08;
const SIGMA_EST_ALTO = 0.15;
const C_PREPARACION_DEFECTO = 5000000;
const A_CURVA_S = 2.0;
const DSO_DIAS_DEFECTO = 60;
const L_MESES_DEFECTO = 3;
const I_EA_DEFECTO = 0.20;
const RETEGARANTIA_PCT = 5;
const U_MIN_DEFECTO = 5;
const INDIRECTO_PCT_DEFECTO = 12;
const PLAZO_REFERENCIA_MESES = 8;
const PRIMA_RIESGO_PCT_DEFECTO = 2.32;

/* E[Z_(n)] — esperanza del MÁXIMO de n normales estándar. Es la convención
   correcta aquí: condicionado a ser el más bajo entre n oferentes, el error de
   estimación propio se comporta como el mínimo de n extracciones, y por
   simetría de la normal su magnitud esperada es la del máximo. */
const TABLA_Z = [[1, 0], [2, 0.5642], [3, 0.8463], [4, 1.0294], [5, 1.1630], [6, 1.2672],
  [8, 1.4236], [10, 1.5388], [12, 1.6292], [15, 1.7359], [20, 1.8675]];

function esperanzaMaximoNormal(n) {
  const k = Math.max(1, Math.round(Number(n) || 1));
  if (k >= 20) return TABLA_Z[TABLA_Z.length - 1][1];
  for (let i = 0; i < TABLA_Z.length - 1; i++) {
    const [n0, z0] = TABLA_Z[i], [n1, z1] = TABLA_Z[i + 1];
    if (k === n0) return z0;
    if (k > n0 && k < n1) return z0 + (z1 - z0) * (k - n0) / (n1 - n0);
  }
  return TABLA_Z[TABLA_Z.length - 1][1];
}

/* Φ, con la aproximación de Abramowitz-Stegun para erf. Sin dependencias. */
function phi(x) {
  const t = 1 / (1 + 0.2316419 * Math.abs(x));
  const d = 0.3989422804014327 * Math.exp(-x * x / 2);
  const p = d * t * (0.319381530 + t * (-0.356563782 + t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))));
  return x >= 0 ? 1 - p : p;
}

/* ── La CURVA de precio, aislada (ago 2026 · A4) ───────────────────────────
   Multiplicador RELATIVO de la probabilidad por ofertar con una baja `b`
   cuando el centro del mercado está en `mu`: mezcla de «menor valor» (Φ^(n−1))
   y métodos centrales (campana /n), normalizada a EXACTAMENTE 1 en `mu`.
   Es la única implementación: la usa `pGanarPorPrecio` (el editor de APU) y la
   usa `lib/probabilidad` para el factor de precio del listado. Dos curvas
   «equivalentes hoy» divergirían a la primera corrección aplicada a una sola,
   y aquí la divergencia sería entre la probabilidad de la tarjeta y la del
   editor para el MISMO proceso. Devuelve `null` sin centro o sin oferta. */
function multiplicadorPrecio({
  baja_ofertada_pct = null, baja_mediana_pct = null, baja_p25 = null, baja_p75 = null,
  pi_menor_valor = PI_MENOR_VALOR,
} = {}) {
  const mu = numero(baja_mediana_pct);
  const b = numero(baja_ofertada_pct);
  if (mu == null || b == null) return null;
  const n = N_REFERENCIA_CURVA;
  // σ del IQR cuando el índice lo publica; si no, el defecto declarado
  let sigma = DISPERSION_DEFECTO;
  const p25 = numero(baja_p25), p75 = numero(baja_p75);
  if (p25 != null && p75 != null && p75 > p25) sigma = Math.max(0.5, (p75 - p25) / 1.349);
  const menorValor = (x) => Math.pow(phi((x - mu) / sigma), n - 1);
  const central = (x) => Math.exp(-((x - mu) ** 2) / (2 * sigma * sigma)) / n;
  const mezcla = (x) => pi_menor_valor * menorValor(x) + (1 - pi_menor_valor) * central(x);
  const enCentro = mezcla(mu);
  const enOferta = mezcla(b);
  return {
    multiplicador: enCentro > 0 ? enOferta / enCentro : 1,
    mu, b, sigma, n, pi_menor_valor,
    en_oferta: enOferta, menor_valor: menorValor(b), central: central(b),
  };
}

/* ── P(ganar | precio) ────────────────────────────────────────────────────── */
function pGanarPorPrecio({
  p_base = null, baja_ofertada_pct = null, baja_mediana_pct = null,
  baja_p25 = null, baja_p75 = null, oferentes = null, pi_menor_valor = PI_MENOR_VALOR,
} = {}) {
  const sinDato = {
    p: p_base != null ? p_base : null, p_base,
    modulada: false, multiplicador: 1, p_menor_valor: null, p_central: null,
    supuesto: null,
    mensaje: "Sin baja histórica de la entidad no hay centro de mercado contra el que situar el precio: "
      + "se publica la probabilidad base, sin modular por precio.",
  };
  const c = multiplicadorPrecio({ baja_ofertada_pct, baja_mediana_pct, baja_p25, baja_p75, pi_menor_valor });
  if (!c) return sinDato;
  const { mu, b, sigma, n } = c;

  /* EL NÚMERO DE OFERENTES NO ENTRA EN LA CURVA, Y ES DELIBERADO. La FORMA se
     evalúa con un `n` de REFERENCIA fijo; el NIVEL lo pone `p_base`, que ya
     cae con los rivales (1/(1+rivales)) en lib/probabilidad.

     Meter `n` en las dos mitades lo contaba dos veces y rompía la invariante
     A.10 en el extremo: con una baja muy por encima de la mediana, el término
     central (1/n) del DENOMINADOR se encoge con `n` e infla el multiplicador,
     de modo que catorce oferentes acababan dando MÁS probabilidad que tres.
     Además no hay con qué calibrar esa dependencia —la curva se infiere, no se
     observa: el corpus no trae las ofertas perdedoras—, así que fijar la forma
     en una referencia declarada es lo honesto y lo que hace la monotonía
     demostrable en vez de afortunada. */
  const nDato = numero(oferentes);
  const estimadoN = nDato == null || nDato < 1;

  /* El multiplicador es el efecto RELATIVO del precio, normalizado a 1 en la
     mediana del mercado y —por lo de arriba— INDEPENDIENTE del número de
     oferentes. De ahí que la invariante «más oferentes ⇒ P(ganar) no sube» se
     cumpla por construcción sobre el producto `p_base × multiplicador`: el
     único factor que ve a `n` es `p_base`, y ese cae.
     `p_base` tiene que ser la probabilidad SIN precio (`p_sin_precio` de
     lib/probabilidad, A5): si llegara la `p` del listado ya modulada por precio,
     el precio se cobraría dos veces. */
  const mult = c.multiplicador;
  const base = p_base != null ? p_base : c.en_oferta;
  const p = Math.min(0.95, Math.max(0.01, base * (p_base != null ? mult : 1)));

  return {
    p: redondear(p, 4),
    p_base,
    modulada: true,
    multiplicador: redondear(mult, 3),
    p_menor_valor: redondear(c.menor_valor, 4),
    p_central: redondear(c.central, 4),
    baja_ofertada_pct: b, baja_mediana_pct: mu,
    oferentes_forma: n, oferentes_entidad: nDato, oferentes_estimados: estimadoN,
    dispersion_pp: redondear(sigma, 2),
    supuesto: `mezcla de ${Math.round(pi_menor_valor * 100)} % «menor valor» y `
      + `${Math.round((1 - pi_menor_valor) * 100)} % métodos centrales (sorteo uniforme de cuatro mecanismos, `
      + "Ley 1882 de 2018). El método NO se conoce al ofertar: se sortea en la audiencia.",
    mensaje: b > mu + sigma / 2
      ? "Está ofertando por DEBAJO del centro del mercado. Eso compra probabilidad solo en el escenario "
        + "«menor valor» (≈25 %) y la reduce en los otros tres, mientras el margen cae linealmente."
      : b < mu - sigma / 2
        ? "Está ofertando por ENCIMA del centro del mercado: más margen, menos probabilidad en todos los métodos."
        : "Está ofertando cerca del centro del mercado, que es la jugada dominante en tres de los cuatro métodos.",
  };
}

/* ── Ajuste competitivo sugerido a partir del índice de baja ───────────────── */
function ajusteCompetitivo({ baja = null, presupuesto_oficial = null, precio_oferta = null } = {}) {
  const po = numero(presupuesto_oficial);
  const mediana = baja && numero(baja.baja_mediana);
  if (mediana == null || baja.nivel === "sin_dato") {
    return {
      aplicable: false, nivel: (baja && baja.nivel) || "sin_dato",
      baja_mediana_pct: null, precio_sugerido: null, factor: null,
      granularidad_utilizada: (baja && baja.granularidad_utilizada) || null,
      procesos_contados: (baja && baja.procesos_contados) || 0,
      mensaje: (baja && baja.mensaje)
        || "Sin índice de baja para esta entidad: no hay recomendación de precio. Sin dato NO es «baja 0 %».",
    };
  }
  const factor = 1 - mediana / 100;
  const sugerido = po != null && po > 0 ? Math.round(po * factor) : null;
  const propio = numero(precio_oferta);
  return {
    aplicable: true,
    nivel: baja.nivel,
    baja_mediana_pct: mediana,
    baja_p25: numero(baja.baja_p25), baja_p75: numero(baja.baja_p75),
    granularidad_utilizada: baja.granularidad_utilizada,
    procesos_contados: baja.procesos_contados,
    factor: redondear(factor, 4),
    precio_sugerido: sugerido,
    baja_propia_pct: propio != null && po > 0 ? redondear((1 - propio / po) * 100, 2) : null,
    diferencia_cop: sugerido != null && propio != null ? sugerido - propio : null,
    mensaje: `${baja.mensaje} El precio sugerido es el presupuesto oficial descontado esa mediana. `
      + "NO es una recomendación de minimizar: sin conocer la fórmula de evaluación económica del pliego, "
      + "el centro del mercado es la jugada dominante en tres de los cuatro métodos.",
  };
}

/* ── Maldición del ganador ─────────────────────────────────────────────────── */
function primaMaldicion(costoDirecto, oferentes, { lambda = LAMBDA_MALDICION, sigma_est = SIGMA_EST_BAJO } = {}) {
  const nDato = numero(oferentes);
  const n = Math.max(1, Math.round(nDato != null && nDato >= 1 ? nDato : 6));
  const z = esperanzaMaximoNormal(n - 1);
  return {
    oferentes: n, estimado: nDato == null || nDato < 1,
    e_z: redondear(z, 4), lambda, sigma_est,
    valor: Math.round(lambda * sigma_est * z * (Number(costoDirecto) || 0)),
    pct: redondear(lambda * sigma_est * z * 100, 2),
  };
}

/* ── Precio piso ──────────────────────────────────────────────────────────
   La utilidad entra UNA sola vez, por `u_min` en el denominador. Los
   imprevistos entran UNA sola vez, por la «I». Si el APU que se usa ya trajera
   AIU completo, no se aplicarían ni `f_A` ni `u_min` — aquí el costo directo
   viene SIN AIU (se declara aparte), así que sí se aplican. */
function precioPiso({
  costo_directo = 0, administracion_pct = 20, imprevistos_pct = 4, u_min_pct = U_MIN_DEFECTO,
  tau_ingreso_pct = 0, garantias = 0, costo_financiero = 0, oferentes = null,
  lambda = LAMBDA_MALDICION, presupuesto_oficial = null,
} = {}) {
  const cd = Number(costo_directo) || 0;
  const cEsp = cd * (1 + administracion_pct / 100) + cd * (imprevistos_pct / 100)
    + (Number(garantias) || 0) + (Number(costo_financiero) || 0);
  const denominador = 1 - u_min_pct / 100 - tau_ingreso_pct / 100;

  const escenarios = {};
  for (const [nombre, sigma] of [["sigma_8", SIGMA_EST_BAJO], ["sigma_15", SIGMA_EST_ALTO]]) {
    const prima = primaMaldicion(cd, oferentes, { lambda, sigma_est: sigma });
    const piso = denominador > 0 ? Math.round((cEsp + prima.valor) / denominador) : null;
    const po = numero(presupuesto_oficial);
    escenarios[nombre] = {
      sigma_est: sigma, prima: prima.valor, precio_piso: piso,
      baja_maxima_admisible_pct: piso != null && po > 0 ? redondear((1 - piso / po) * 100, 2) : null,
    };
  }
  return {
    c_esperado: Math.round(cEsp),
    administracion_pct, imprevistos_pct, u_min_pct, tau_ingreso_pct,
    denominador: redondear(denominador, 4),
    sin_equilibrio: !(denominador > 0),
    escenarios,
    /* El escenario que decide es el ALTO. σ_est = 8 % es un valor de arranque
       SIN CALIBRAR y, como la prima CRECE con σ, es ANTI-conservador: subestimar
       σ produce un piso más bajo, que es exactamente el error caro. */
    precio_piso_decision: escenarios.sigma_15.precio_piso,
    nota: "El piso que decide es el del escenario σ = 15 %. σ = 8 % es un valor de arranque sin calibrar contra "
      + "ninguna obra propia y, al ser la prima creciente en σ, usarlo solo sería anti-conservador.",
  };
}

/* ── Flujo de caja mes a mes ──────────────────────────────────────────────
   Curva S: s(τ) = τ^a / (τ^a + (1−τ)^a). El acta del mes es V·Δs.
   El anticipo NO elimina el pico de caja: lo desplaza. Desde que empieza la
   amortización cada acta llega recortada, y el pico de exposición cae cerca del
   final de la obra, no al principio. */
/* COTA DEL PLAZO (ago 2026). `plazo_meses` lo teclea una persona y entraba sin
   límite en un bucle mes a mes: con 10 000 000 la función gastaba 15 SEGUNDOS
   —un cuarto del `maxDuration` de la petición— y acababa reventando la pila con
   un «Maximum call stack size exceeded», o sea un 500 opaco. 600 meses son 50
   años: por encima de eso no hay contrato de obra, solo un dato mal escrito. Se
   RECORTA y se DECLARA (`plazo_recortado`) en vez de calcular sobre un número
   que nadie quiso escribir; recortar en silencio sería cambiarle la cifra al
   usuario sin decírselo. */
const MAX_PLAZO_MESES = 600;
const acotarPlazo = (v, porDefecto = 12) => {
  const n = Math.round(Number(v));
  if (!Number.isFinite(n) || n < 1) return { meses: porDefecto, recortado: false };
  if (n > MAX_PLAZO_MESES) return { meses: MAX_PLAZO_MESES, recortado: true };
  return { meses: n, recortado: false };
};

function flujoCaja({
  valor_contrato = 0, costo_total = 0, plazo_meses = 12, cola_liquidacion_meses = L_MESES_DEFECTO,
  anticipo_pct = 0, anticipo_es_dato = false, dso_dias = DSO_DIAS_DEFECTO,
  retenciones_pct = 0, retegarantia_pct = RETEGARANTIA_PCT, i_ea = I_EA_DEFECTO, a_curva = A_CURVA_S,
  costo_indirecto = 0, garantias = 0,
} = {}) {
  const V = Number(valor_contrato) || 0;
  const plazo = acotarPlazo(plazo_meses);
  const T = plazo.meses;
  const L = Math.min(MAX_PLAZO_MESES, Math.max(0, Math.round(Number(cola_liquidacion_meses) || 0)));
  const alfa = Math.min(0.5, Math.max(0, (Number(anticipo_pct) || 0) / 100));
  const dsoMeses = Math.max(0, Math.round((Number(dso_dias) || 0) / 30));
  const iMensual = Math.pow(1 + (Number(i_ea) || 0), 1 / 12) - 1;

  const s = (x) => {
    const tau = Math.min(1, Math.max(0, x));
    if (tau <= 0) return 0;
    if (tau >= 1) return 1;
    const p = Math.pow(tau, a_curva);
    return p / (p + Math.pow(1 - tau, a_curva));
  };

  const meses = [];
  let acumulado = 0;
  let financiero = 0;
  const retegarantiaTotal = V * (1 - alfa) * (retegarantia_pct / 100);

  /* EL HORIZONTE TIENE QUE ALCANZAR AL ÚLTIMO COBRO (ago 2026). Iba hasta
     `T + L`, pero el acta del mes k se cobra en `k + dsoMeses`: con un DSO mayor
     que la cola de liquidación, las actas de los últimos meses caían FUERA del
     bucle y su dinero no entraba en ningún mes. Medido con el propio `dso_dias`
     que usa la suite (150): se perdían $95 M de $1 000 M; con el P85 que
     recomienda el informe (195 días), $475 M — y con ellos `k_max` se inflaba y
     el payback salía «no retorna» sobre un contrato sano. El horizonte se
     extiende lo justo para que el último cobro tenga su mes. */
  const horizonte = Math.max(T + L, T + dsoMeses);
  for (let t = 1; t <= horizonte; t++) {
    const ds = t <= T ? s(t / T) - s((t - 1) / T) : 0;
    const actaBruta = V * ds;

    // egresos: el costo directo sigue la curva; el indirecto es lineal en el
    // plazo (por eso alargar el plazo sin obra adicional NUNCA sube la utilidad)
    const egresoObra = (Number(costo_total) || 0) * ds;
    const egresoIndirecto = t <= T ? (Number(costo_indirecto) || 0) / T : 0;
    const egresoGarantias = t === 1 ? (Number(garantias) || 0) : 0;

    // ingresos de caja: anticipo en t=1; el acta se cobra DSO meses después,
    // neta de amortización y retenciones; la retegarantía vuelve al final
    const tActa = t - dsoMeses;
    const dsCobrada = tActa >= 1 && tActa <= T ? s(tActa / T) - s((tActa - 1) / T) : 0;
    const actaCobrada = V * dsCobrada;
    const amortizacion = actaCobrada * alfa;
    const retenciones = actaCobrada * (retenciones_pct / 100);
    const retegarantia = actaCobrada * (1 - alfa) * (retegarantia_pct / 100);
    const cobro = actaCobrada - amortizacion - retenciones - retegarantia;

    // la retegarantía vuelve al cierre del horizonte (que con un DSO largo va
    // más allá de T + L: no puede devolverse antes del último cobro)
    const ingreso = (t === 1 ? V * alfa : 0) + cobro + (t === horizonte ? retegarantiaTotal : 0);
    const egreso = egresoObra + egresoIndirecto + egresoGarantias;

    acumulado += ingreso - egreso;
    if (acumulado < 0) financiero += -acumulado * iMensual;

    meses.push({
      mes: t,
      acta_bruta: Math.round(actaBruta),
      ingreso: Math.round(ingreso),
      egreso: Math.round(egreso),
      neto: Math.round(ingreso - egreso),
      acumulado: Math.round(acumulado),
    });
  }

  const kMax = Math.max(0, ...meses.map((m) => -m.acumulado));
  // payback: primer mes con acumulado ≥ 0 DESPUÉS de haberse puesto negativo.
  // Sin esa condición, un contrato con anticipo daría payback = 1 por el propio
  // anticipo, que es dinero de la entidad y no ha devuelto ningún capital.
  let payback = null;
  let huboExposicion = false;
  for (const m of meses) {
    if (m.acumulado < 0) huboExposicion = true;
    else if (huboExposicion && m.acumulado >= 0) { payback = m.mes; break; }
  }
  if (!huboExposicion) payback = 0;

  return {
    meses,
    k_max: Math.round(kMax),
    payback_meses: payback,
    payback_estado: payback === 0 ? "sin_exposicion" : payback == null ? "no_retorna_en_el_horizonte" : "ok",
    costo_financiero: Math.round(financiero),
    i_mensual: redondear(iMensual, 6),
    plazo_meses: T, plazo_recortado: plazo.recortado, cola_liquidacion_meses: L, dso_meses: dsoMeses,
    anticipo_pct: alfa * 100,
    anticipo_es_dato,
    descuento_acta_pct: redondear(alfa * 100 + retenciones_pct + (1 - alfa) * retegarantia_pct, 2),
    /* `anticipo_pct = 0` significa SIN DATO en este corpus, no «sin anticipo».
       Calcular la caja asumiendo 0 % infla el costo financiero, infla el piso y
       hace que la app diga «no presentarse» a procesos que sí lo eran. */
    nota_anticipo: anticipo_es_dato
      ? null
      : "El corpus NO trae el anticipo: `anticipo_pct = 0` es AUSENCIA DE DATO. Este flujo es el escenario SIN "
        + "anticipo, que es una COTA INFERIOR de la caja. El anticipo real se lee en el pliego.",
  };
}

/* ── El indicador de decisión ─────────────────────────────────────────────── */
function rentabilidad(entrada = {}) {
  const {
    precio_oferta = 0, costo_directo = 0, presupuesto_oficial = null,
    aiu = null, fiscal = null, plazo_meses = 12, anticipo_pct = 0, anticipo_es_dato = false,
    p_base = null, competencia = null, baja = null,
    costo_preparacion = C_PREPARACION_DEFECTO, dso_dias = DSO_DIAS_DEFECTO, i_ea = I_EA_DEFECTO,
    garantias_pct = 2, costo_oculto_pct = 1.5,
    indirecto_pct = INDIRECTO_PCT_DEFECTO, prima_riesgo_pct = PRIMA_RIESGO_PCT_DEFECTO,
  } = entrada;

  const V = Number(precio_oferta) || 0;
  const CD = Number(costo_directo) || 0;
  const po = numero(presupuesto_oficial);
  const T = acotarPlazo(plazo_meses).meses;

  const margenBrutoPct = V > 0 ? redondear((V - CD) * 100 / V, 2) : null;

  /* DOS DESCOMPOSICIONES DISTINTAS DEL MISMO `V`, y confundirlas es contar dos
     veces. El AIU es la estructura de PRECIO que se declara en la oferta: su
     «A» cubre nominalmente dirección de obra, pólizas, ensayos e impuestos. Lo
     de abajo es la estructura de COSTO real, donde esas tres cosas son líneas
     separadas. Usar `valor_a` como si fuera el indirecto Y sumar aparte
     garantías e impuestos cobraba la administración dos veces y dejaba en rojo
     presupuestos sanos.

     `C_indirecto` es FUNCIÓN DEL PLAZO —dirección de obra, campamento y
     personal se pagan por mes— y por eso lleva el factor T/T_ref: sin él,
     alargar el plazo sin obra adicional no movería la utilidad, y la invariante
     dice que no puede SUBIRLA. El porcentaje está anclado a un plazo de
     referencia declarado, no suelto. */
  const indirecto = Math.round(CD * (indirecto_pct / 100) * (T / PLAZO_REFERENCIA_MESES));
  const garantias = Math.round(V * (garantias_pct / 100));
  const oculto = Math.round(V * (costo_oculto_pct / 100));
  const impuestos = fiscal ? fiscal.tau_costo_valor : 0;
  /* La «I» del AIU no es un costo: es el INGRESO que financia la prima de
     riesgo. Restar las dos sería contar el imprevisto dos veces. Se publican
     enfrentadas para que se vea si la I declarada cubre el riesgo estimado. */
  const primaRiesgo = Math.round(V * (prima_riesgo_pct / 100));

  const oferentes = competencia && competencia.promedio_oferentes != null && competencia.nivel !== "sin_dato"
    ? competencia.promedio_oferentes : null;

  // retenciones que salen del acta: definitivas + retefuente (anticipo de renta:
  // afecta caja, se recupera fuera del contrato) — sin la retegarantía, que el
  // flujo trata aparte porque vuelve en la liquidación
  const retencionesPct = (fiscal ? fiscal.tau_costo_pct : 0) + (fiscal ? fiscal.retefuente_obra_pct : 2);

  const flujo = flujoCaja({
    valor_contrato: V, costo_total: CD, plazo_meses, cola_liquidacion_meses: L_MESES_DEFECTO,
    anticipo_pct, anticipo_es_dato, dso_dias, retenciones_pct: retencionesPct, i_ea,
    costo_indirecto: indirecto, garantias,
  });

  const mg = primaMaldicion(CD, oferentes, { sigma_est: SIGMA_EST_ALTO });

  const utilidad = V - CD - indirecto - garantias - impuestos
    - flujo.costo_financiero - oculto - primaRiesgo - mg.valor;
  const margenNetoPct = V > 0 ? redondear(utilidad * 100 / V, 2) : null;

  const bajaOfertada = po != null && po > 0 ? redondear((1 - V / po) * 100, 2) : null;
  const pPrecio = pGanarPorPrecio({
    p_base,
    baja_ofertada_pct: bajaOfertada,
    baja_mediana_pct: baja ? baja.baja_mediana : null,
    baja_p25: baja ? baja.baja_p25 : null,
    baja_p75: baja ? baja.baja_p75 : null,
    oferentes,
  });

  const p = pPrecio.p;
  const cPrep = Number(costo_preparacion) || 0;
  const veg = p != null ? Math.round(p * utilidad - cPrep) : null;

  /* `Math.pow(negativo, fraccionario)` es NaN, y `JSON.stringify` lo serializa
     como null — que en este repositorio significa «sin dato» y aquí significaría
     lo contrario: la peor cifra posible. Ocurre cuando la pérdida supera el
     capital expuesto (anticipo alto + precio bajo el costo), que es alcanzable.
     Se publica null CON motivo, y la nota lo dice en vez de explicar un ROIC
     que no viene. */
  const baseRoic = flujo.k_max > 0 ? 1 + utilidad / flujo.k_max : null;
  const roic = baseRoic != null && baseRoic > 0
    ? redondear(Math.pow(baseRoic, 12 / (flujo.plazo_meses + flujo.cola_liquidacion_meses)) - 1, 4)
    : null;
  const roicEstado = flujo.k_max > 0
    ? (baseRoic > 0 ? "calculado" : "perdida_supera_el_capital")
    : "sin_capital_expuesto";

  return {
    precio_total: V,
    costo_directo: CD,
    margen_bruto_pct: margenBrutoPct,
    margen_bruto_cop: V - CD,
    utilidad_esperada: Math.round(utilidad),
    margen_neto_pct: margenNetoPct,
    costos: {
      indirecto, garantias, impuestos,
      financiero: flujo.costo_financiero, oculto,
      prima_riesgo: primaRiesgo, maldicion_ganador: mg.valor,
    },
    imprevistos: {
      declarado_en_aiu: aiu ? aiu.valor_i : null,
      prima_riesgo_estimada: primaRiesgo,
      cubre: aiu ? aiu.valor_i >= primaRiesgo : null,
      nota: "La «I» del AIU es el ingreso que financia el riesgo, no un costo aparte. Si la I declarada no cubre "
        + "la prima estimada, el imprevisto lo paga la utilidad.",
    },
    maldicion_ganador: mg,
    p_ganar: p,
    p_ganar_detalle: pPrecio,
    baja_ofertada_pct: bajaOfertada,
    costo_preparacion: cPrep,
    veg,
    veg_positivo: veg != null ? veg > 0 : null,
    k_max: flujo.k_max,
    payback_meses: flujo.payback_meses,
    payback_estado: flujo.payback_estado,
    roic_anual: roic,
    roic_estado: roicEstado,
    roic_nota: roicEstado === "calculado"
      ? "ROIC ANTES de renta y DESPUÉS de deuda (el costo financiero ya está dentro de la utilidad). "
        + "Se compara contra el retorno exigido al capital propio, NUNCA contra la tasa de la deuda: "
        + "eso cobraría el mismo capital dos veces."
      : roicEstado === "perdida_supera_el_capital"
        ? "ROIC no publicable: la pérdida esperada supera el capital expuesto, así que el retorno no "
          + "es un porcentaje interpretable. Mire la utilidad esperada y el margen, que sí lo dicen."
        : "ROIC indefinido: sin capital expuesto no hay retorno sobre capital que medir.",
    flujo,
    /* Filtros duros, ANTES del orden y nunca como penalización suave. */
    filtros_duros: {
      utilidad_no_positiva: utilidad <= 0,
      veg_no_positivo: veg != null ? veg <= 0 : null,
      supera_presupuesto_oficial: po != null && po > 0 ? V > po : null,
    },
    /* Honestidad del dato: si las deducciones del pliego no constan, todo lo de
       arriba es una COTA SUPERIOR del margen, no una estimación. */
    margen_es_cota_superior: fiscal ? !!fiscal.margen_es_cota_superior : true,
    advertencias: advertencias({ fiscal, flujo, po, V, utilidad, veg, p }),
  };
}

function advertencias({ fiscal, flujo, po, V, utilidad, veg, p }) {
  const a = [];
  if (fiscal && fiscal.margen_es_cota_superior) {
    a.push("Las estampillas no constan: el margen mostrado es una COTA SUPERIOR. Léalas en el pliego antes de fijar precio.");
  }
  if (fiscal && fiscal.contribucion_obra_publica && fiscal.contribucion_obra_publica.aplica) {
    a.push("La contribución especial del 5 % está contada como escenario conservador. Si la obra es vía terciaria "
      + "puede aplicar la excepción: se lee en el pliego, no se estima.");
  }
  if (!flujo.anticipo_es_dato) a.push(flujo.nota_anticipo);
  if (flujo.plazo_recortado) {
    a.push(`El plazo indicado supera los ${MAX_PLAZO_MESES} meses (50 años) y se recortó a ese máximo para el flujo `
      + "de caja: revise el dato, porque el payback y el capital máximo se calcularon sobre el plazo recortado.");
  }
  if (po != null && po > 0 && V > po) a.push("El precio calculado SUPERA el presupuesto oficial: presentarse implicaría "
    + "trabajar por debajo del costo estimado.");
  if (utilidad <= 0) a.push("Utilidad esperada no positiva: filtro duro, no penalización suave.");
  if (veg != null && veg <= 0) a.push("El valor esperado de la ganancia no cubre el costo de preparar la oferta.");
  if (p == null) a.push("Sin probabilidad de ganar: no hay base de competencia para esta entidad.");
  return a.filter(Boolean);
}

/* ── Adaptador desde `lib/apu/calculo.calcularPresupuesto` ─────────────────
   Traduce SU vocabulario al de este módulo en un solo sitio. Si el presupuesto
   cambia de forma, se arregla aquí y no en cada consumidor.

   `contextoDePresupuesto` está EXTRAÍDO de `desdePresupuesto` y no duplicado:
   `lib/apu/optimizador` necesita exactamente estos mismos cuatro campos para
   evaluar la curva con el mismo motor, y dos traducciones del mismo presupuesto
   divergirían a la primera corrección aplicada a una sola — que es como decir
   que el precio recomendado se calcularía con una estructura fiscal distinta de
   la del margen que se enseña al lado. */
function contextoDePresupuesto(presupuesto) {
  const r = (presupuesto && presupuesto.resumen) || {};
  const cfg = (presupuesto && presupuesto.configuracion) || {};
  /* `deducciones_estimadas` es 0 cuando el municipio no se ha cargado, y ahí el
     margen es una COTA SUPERIOR: se propaga tal cual, no se rellena con un
     supuesto que lo haría parecer completo. */
  const deducciones = Number(r.deducciones_estimadas) || 0;
  const contribucion = Number(r.contribucion_obra_publica) || 0;
  const precio = Number(r.precio_final ?? r.precio_venta) || 0;
  return {
    precio,
    costo_directo: Number(r.costo_directo_total) || 0,
    aiu: {
      valor_a: Number(r.administracion) || 0,
      valor_i: Number(r.imprevistos) || 0,
      valor_u: Number(r.utilidad) || 0,
    },
    fiscal: {
      tau_costo_valor: deducciones + contribucion,
      tau_costo_pct: precio > 0 ? redondear((deducciones + contribucion) * 100 / precio, 2) : 0,
      retefuente_obra_pct: 2,
      margen_es_cota_superior: !(Number(cfg.deducciones_pct) > 0),
    },
    // `anticipo_pct = null` en la configuración significa SIN DATO, no 0 %
    anticipo_pct: cfg.anticipo_pct == null ? 0 : cfg.anticipo_pct,
    anticipo_es_dato: cfg.anticipo_pct != null,
  };
}

function desdePresupuesto(presupuesto, contexto = {}) {
  const t = contextoDePresupuesto(presupuesto);
  return rentabilidad({
    precio_oferta: t.precio,
    costo_directo: t.costo_directo,
    aiu: t.aiu,
    fiscal: t.fiscal,
    anticipo_pct: t.anticipo_pct,
    anticipo_es_dato: t.anticipo_es_dato,
    ...contexto,
  });
}

const numero = (v) => {
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};
const redondear = (n, d) => Math.round(n * 10 ** d) / 10 ** d;

module.exports = {
  MAX_PLAZO_MESES, acotarPlazo,
  rentabilidad, desdePresupuesto, contextoDePresupuesto,
  pGanarPorPrecio, multiplicadorPrecio, ajusteCompetitivo, precioPiso, primaMaldicion,
  flujoCaja, esperanzaMaximoNormal, phi,
  PI_MENOR_VALOR, N_REFERENCIA_CURVA, LAMBDA_MALDICION, SIGMA_EST_BAJO, SIGMA_EST_ALTO,
  C_PREPARACION_DEFECTO, DSO_DIAS_DEFECTO, L_MESES_DEFECTO, I_EA_DEFECTO, U_MIN_DEFECTO,
  INDIRECTO_PCT_DEFECTO, PLAZO_REFERENCIA_MESES, PRIMA_RIESGO_PCT_DEFECTO,
};
