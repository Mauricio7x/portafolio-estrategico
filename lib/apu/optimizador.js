/* ============================================================================
   lib/apu/optimizador · ¿A QUÉ PRECIO HAY QUE OFERTAR?
   ----------------------------------------------------------------------------
   El editor de APU responde «cuánto cuesta». `lib/apu/rentabilidad` responde
   «cuánto deja ESTE precio». Falta la pregunta que de verdad se hace el
   contratista delante del pliego: **de todos los precios que puedo ofertar,
   ¿cuál me deja más plata esperada?** Hasta hoy eso se decidía a ojo mirando la
   baja mediana de la entidad; aquí se barre el rango y se devuelve el máximo.

   NO REIMPLEMENTA NADA. Para cada precio candidato llama a
   `rentabilidad()` —el mismo motor que ya publica margen, utilidad, VEG, caja y
   P(ganar|precio)— y proyecta su salida. Un segundo cálculo del margen o de la
   probabilidad divergiría del primero a la primera corrección aplicada a uno
   solo, y aquí la divergencia sería entre el precio que la app RECOMIENDA y el
   margen que la app enseña para ese mismo precio. Es la lección de
   `total_procesos`/`procesos_contados`, y aquí serían pesos.
   Corolario probado: el punto de la curva evaluado en el precio VIGENTE
   reproduce EXACTAMENTE el bloque de rentabilidad (mismo VEG, misma P, mismo
   margen). Si divergieran, ninguno de los dos serviría para verificar al otro.

   ══════════════ TRES CORRECCIONES AL ENCARGO, las tres con prueba ═══════════

   1 · **EL DESCUENTO NO SE MIDE CONTRA EL PRECIO DE VENTA: SE MIDE CONTRA EL
       PRESUPUESTO OFICIAL.** El encargo pedía barrer «desde
       `baja_mediana_entidad − 10pp` hasta `+5pp`» y, en la misma frase,
       `precio_oferta = precio_venta × (1 − descuento/100)`. Las dos mitades no
       hablan de lo mismo: la baja de `lib/indice_baja` está DEFINIDA como
       `1 − adjudicado/precio_base`, o sea contra el PRESUPUESTO OFICIAL de la
       entidad, mientras que `precio_venta` es el costo directo del APU más el
       AIU — un número del contratista, no del pliego. Solo coinciden si el APU
       da exactamente el presupuesto oficial, que es justo lo que no pasa: en el
       corpus de prueba el precio de venta es el 69 % de la cuantía.
       Barrer la perilla del editor sobre ese rango habría situado toda la curva
       en una zona de baja real del 30 % —donde la probabilidad es residual— y
       el «óptimo» habría salido de un tramo que ningún oferente pisa.
       Aquí `descuento` es SIEMPRE la baja contra el presupuesto oficial, que es
       la única base en la que `baja_mediana_entidad` significa algo y la única
       que `pGanarPorPrecio` sabe consumir. La perilla del editor viaja aparte,
       por punto, como `descuento_apu_pct` — ver la corrección 3.

   2 · **EL VEG QUE DECIDE NO ES `P × margen bruto`.** El encargo pedía
       `VEG = P(ganar) × margen` con `margen = precio − costo_total`. Ese margen
       no ha pagado la contribución del 5 % (Ley 418/1997, «el olvido más caro
       del país»), ni las estampillas, ni las pólizas, ni el costo financiero de
       que el Estado pague a 60 días, ni la maldición del ganador. Llamar
       «ganancia esperada» a eso y encima usarlo para ELEGIR EL PRECIO es
       recomendar sobre una cifra que no existe.
       `veg` es, por tanto, el MISMO VEG que ya publica el bloque de
       rentabilidad —`P × utilidad_esperada − costo de preparar la oferta`— y es
       el que elige. La fórmula literal del encargo se publica al lado, en
       `veg_margen_bruto`, para que la diferencia se vea en vez de discutirse.
       Dos cifras con el mismo nombre y distinto significado es el defecto que
       este repositorio ya pagó dos veces (`cargado`/`cargado_el`).

   3 · **UN PRECIO POR ENCIMA DEL PRESUPUESTO OFICIAL NO ES UNA OPCIÓN.** Con
       una mediana del 7 %, el rango del encargo empieza en −3 % de baja, es
       decir un 3 % POR ENCIMA del techo de la entidad: eso no se evalúa, se
       rechaza. La rejilla se recorta en `descuento = 0` y se dice
       (`rango.recortado_en_cero`). Dejar esos puntos en la curva los ofrecería
       como alternativas, y la peor forma de equivocarse aquí es recomendar con
       confianza un precio que descalifica la oferta.

   ══════════════ LA DOBLE CUENTA DEL PRECIO, CERRADA (ago 2026 · A4/A5) ═══════
   `docs/PROBABILIDAD_MEJORADA.md` §2.5c documentaba que el precio se cobraba DOS
   VECES: `lib/probabilidad` multiplicaba por una rampa de baja de mercado y
   `pGanarPorPrecio` volvía a modular por precio sobre esa misma `p` como
   `p_base`. Hoy el handler pasa `p_sin_precio` (la cadena SIN factor de precio)
   y la rampa ya no existe: el precio entra UNA vez, aquí, con la baja que el
   dueño de verdad va a ofertar. Lo que ya se podía afirmar antes —y sigue con
   prueba— es que el defecto no movía el precio recomendado: un factor constante
   a lo largo del barrido no cambia el argmax; cambiaba el NIVEL del VEG, que es
   lo que ahora sale sin la penalización doble.

   ══════════════ POR QUÉ MÓDULO APARTE Y NO DENTRO DE rentabilidad.js ═════════
   Son dos preguntas distintas —«cuánto deja este precio» frente a «qué precio»—
   y esta DEPENDE de aquella: aquí se llama a `rentabilidad()` una vez por punto
   de la rejilla. Meterla en el mismo archivo habría puesto una función que
   itera 25 veces sobre el motor dentro del propio motor. No hay ciclo:
   `optimizador → rentabilidad` y nada vuelve.
   ========================================================================== */
"use strict";

const { rentabilidad, C_PREPARACION_DEFECTO } = require("./rentabilidad.js");
/* `red` es el redondeo con el que `calcularPresupuesto` fija el precio final.
   Se IMPORTA y no se reescribe porque `precio_apu_resultante` promete «esto es
   lo que va a salir del editor cuando pulse Aplicar»: con un redondeo propio la
   promesa se incumpliría por céntimos y nadie sabría por qué. No hay ciclo
   —`calculo` solo mira al catálogo y a las tipologías— y el único consumidor de
   este módulo, `/api/apu/rentabilidad`, ya carga `calculo` de todos modos. */
const { red: redPrecio } = require("./calculo.js");

/* La rejilla del encargo, literal: 0,5 pp de paso, 10 pp por debajo de la
   mediana y 5 por encima. La asimetría es suya y es razonable —hay más margen
   de maniobra subiendo el precio que hundiéndolo— y se conserva. */
const PASO_PP = 0.5;
const DESDE_PP = -10;
const HASTA_PP = 5;
/* MESETA: el 5 % del VEG máximo. Las tres opciones del encargo (conservador /
   óptimo / agresivo) no son tres puntos elegidos a ojo: son los DOS EXTREMOS y
   el máximo del tramo donde el valor esperado apenas cambia. Así la tabla
   responde lo único que hace falta para decidir con criterio propio —«dentro de
   esta banda da casi igual: elija por apetito de riesgo»— en vez de proponer un
   ±2 pp arbitrario que nadie podría discutir. */
const TOLERANCIA_MESETA_PCT = 5;
/* Guarda dura de tamaño: `paso_pp` es un parámetro y un 0,001 fabricaría
   quince mil puntos, cada uno con su flujo de caja mes a mes. */
const MAX_PUNTOS = 400;
/* Tope de la perilla `factor_baja` del editor (lib/apu/calculo.normalizarConfig
   la acota a [0, 60]). Un descuento por encima de eso NO se puede aplicar al
   APU, y decir que sí dejaría al botón produciendo un precio distinto del
   recomendado. */
const FACTOR_BAJA_MAX = 60;

const numero = (v) => {
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};
const red = (n, d) => (Number.isFinite(n) ? Math.round(n * 10 ** d) / 10 ** d : null);

const SUPUESTOS = [
  "El descuento se mide contra el PRESUPUESTO OFICIAL de la entidad, que es la base en la que está "
  + "definida la baja histórica. No es el mismo número que la perilla «factor de baja» del editor, que "
  + "se aplica sobre su precio de venta: por eso cada punto publica los dos.",
  "P(ganar) es la del proceso (lib/probabilidad) modulada por precio con la MEZCLA de «menor valor» y "
  + "métodos centrales: el método de ponderación económica se SORTEA en la audiencia (Ley 1882 de 2018), "
  + "así que ofertar más barato no maximiza la probabilidad.",
  "El VEG que decide descuenta la utilidad NETA (indirectos, pólizas, contribución del 5 %, financiación, "
  + "prima de riesgo y maldición del ganador) y el costo de preparar la oferta, que se paga se gane o no.",
];

const COMO_LEERLO = {
  precio: "El precio óptimo es el que maximiza el VALOR ESPERADO, no el que maximiza la probabilidad ni "
    + "el que maximiza el margen. Bajar más allá del óptimo compra probabilidad solo en uno de los cuatro "
    + "métodos de ponderación y regala margen en los cuatro.",
  opciones: "Las tres opciones son los extremos y el máximo de la MESETA del VEG (±5 % del máximo). "
    + "Dentro de esa banda el valor esperado apenas cambia: la elección entre ellas es de apetito de riesgo, "
    + "no de aritmética.",
  aplicar: "«descuento» es la baja contra el presupuesto oficial; «descuento_apu_pct» es lo que hay que "
    + "escribir en la perilla del editor para que su APU dé ese precio. Si sale negativo, el precio "
    + "recomendado está POR ENCIMA de su precio de venta: no hay descuento que aplicar, hay margen de sobra.",
  limite: "El barrido NO corrige que el precio entre dos veces en la probabilidad "
    + "(docs/PROBABILIDAD_MEJORADA.md §2.5c). Ese defecto mueve el NIVEL del VEG, no el precio elegido: "
    + "el factor de baja de la entidad es constante a lo largo de la curva.",
};

/* ── Las deducciones ESCALAN con el precio ────────────────────────────────
   `fiscal.tau_costo_valor` llega en PESOS, calculado sobre el precio vigente,
   pero lo que hay debajo son PORCENTAJES del valor del contrato: la
   contribución del 5 % y las estampillas. Dejarlo fijo mientras se barre el
   precio haría que bajar la oferta no ahorrara ni un peso de contribución —y la
   contribución es justo el costo que el manual llama «el olvido más caro del
   país»—, así que el barrido se inclinaría a precios bajos por una razón falsa.
   En el precio de referencia se devuelve el objeto TAL CUAL, sin reescalar ni
   redondear: es lo que hace que el punto actual reproduzca al peso el bloque de
   rentabilidad en vez de parecerse mucho.
   Sin precio de referencia queda el porcentaje, que es lo que de verdad ata el
   valor al precio. Lo que NO puede pasar es devolverlo fijo: sería un impuesto
   que no depende del valor del contrato, y nadie lo notaría. */
function fiscalEn(precio, fiscal, precioRef) {
  if (!fiscal) return fiscal || null;
  if (precioRef > 0) {
    if (precio === precioRef) return fiscal;
    return { ...fiscal, tau_costo_valor: (Number(fiscal.tau_costo_valor) || 0) * (precio / precioRef) };
  }
  return { ...fiscal, tau_costo_valor: precio * (Number(fiscal.tau_costo_pct) || 0) / 100 };
}

/* ════════════════════════ optimizarPrecioOferta ════════════════════════
   `proceso`   presupuesto_oficial · baja (registro de bajaDeMercado) ·
               competencia (registro de competenciaDe) · p_base (la
               `p_sin_precio` de lib/probabilidad, A5) · precio_venta · precio_actual · plazo_meses ·
               entidad · id_proceso
   `costo_directo_total`  el del APU, en pesos. Entra como PARÁMETRO —y no se
               recalcula aquí— porque quien lo sabe es `lib/apu/calculo`.
   `config`    AIU (`aiu`), fiscal, anticipo, DSO, costo de preparación, precio
               piso y los tres mandos de la rejilla (`paso_pp`, `desde_pp`,
               `hasta_pp`, `tolerancia_pct`).

   Devuelve SIEMPRE la misma forma: `aplicable:false` con su `motivo` cuando no
   hay con qué barrer, nunca una curva vacía sin explicación ni —peor— una
   recomendación fabricada sobre un centro de mercado inventado. */
function optimizarPrecioOferta(proceso = {}, costo_directo_total = 0, config = {}) {
  const p = proceso || {};
  const c = config || {};

  const cd = numero(costo_directo_total);
  const po = numero(p.presupuesto_oficial);
  const pv = numero(p.precio_venta);
  const precioActual = numero(p.precio_actual);
  const baja = p.baja || null;
  /* Se exige NIVEL clasificado antes de mirar la mediana, igual que
     `lib/probabilidad`: `bajaDeMercado` garantiza que una cifra sin base llega
     como `sin_dato` con la mediana en null, y comprobar las dos cosas hace que
     esto no dependa de que el otro módulo nunca falle. */
  const mediana = baja && baja.nivel && baja.nivel !== "sin_dato" ? numero(baja.baja_mediana) : null;

  const centro = {
    baja_mediana_pct: mediana,
    baja_p25: baja ? numero(baja.baja_p25) : null,
    baja_p75: baja ? numero(baja.baja_p75) : null,
    nivel: (baja && baja.nivel) || "sin_dato",
    granularidad_utilizada: (baja && baja.granularidad_utilizada) || null,
    modalidad_utilizada: (baja && baja.modalidad_utilizada) || null,
    procesos_contados: (baja && Number(baja.procesos_contados)) || 0,
    mensaje: (baja && baja.mensaje) || null,
  };

  const cabecera = {
    id_proceso: p.id_proceso || null,
    entidad: p.entidad || null,
    presupuesto_oficial: po,
    precio_venta: pv,
    costo_directo_total: cd,
    centro_mercado: centro,
  };

  const noAplicable = (motivo, mensaje) => ({
    aplicable: false, motivo, mensaje,
    ...cabecera,
    rango: null, curva: [],
    precio_optimo: null, descuento_optimo_pct: null, veg_optimo: null, probabilidad_optima: null,
    /* `null`, no `false`: no es que no haya precio rentable, es que no se
       miró ninguno. Es la regla de `anticipo_pct = 0`, aplicada al booleano. */
    sin_punto_rentable: null, alertas: [],
    optimo: null, opciones: null, punto_actual: null, comparacion_con_actual: null,
    supuestos: SUPUESTOS, como_leerlo: COMO_LEERLO,
  });

  if (cd == null || cd <= 0) {
    return noAplicable("sin_costo_directo",
      "Sin costo directo no hay margen que optimizar: calcule primero el APU.");
  }
  if (po == null || po <= 0) {
    return noAplicable("sin_presupuesto_oficial",
      "Sin el presupuesto oficial del proceso no hay techo contra el que medir la baja, y «descuento» "
      + "no significaría nada. Escriba la cuantía publicada por la entidad.");
  }
  if (mediana == null) {
    return noAplicable("sin_centro_de_mercado",
      `${centro.mensaje || "Sin baja histórica de esta entidad."} Sin centro de mercado la probabilidad `
      + "sería la misma a cualquier precio y el «óptimo» saldría siempre en «no descuente nada» — que no es "
      + "una recomendación, es la ausencia de una. SIN DATO no es «baja del 0 %».");
  }

  /* ---------- la rejilla ---------- */
  const paso = Math.min(5, Math.max(0.05, numero(c.paso_pp) ?? PASO_PP));
  const desdePP = numero(c.desde_pp) ?? DESDE_PP;
  const hastaPP = numero(c.hasta_pp) ?? HASTA_PP;
  const pedido = red(mediana + desdePP, 6);
  const desde = Math.max(0, pedido);
  const hasta = red(mediana + hastaPP, 6);
  if (hasta < desde) {
    return noAplicable("rango_sobre_el_presupuesto",
      `La baja mediana de esta entidad es ${mediana} %: el rango pedido queda entero por encima del `
      + "presupuesto oficial, y ofertar por encima del techo descalifica la oferta. No hay precio que barrer.");
  }
  const pasos = Math.max(0, Math.round((hasta - desde) / paso));
  const nPuntos = Math.min(MAX_PUNTOS, pasos + 1);

  const piso = numero(c.precio_piso);
  const cPrep = numero(c.costo_preparacion) ?? C_PREPARACION_DEFECTO;

  /* La entrada COMÚN a `rentabilidad()`: todo menos el precio y el fiscal, que
     son lo único que cambia de un punto a otro. */
  const base = {
    costo_directo: cd,
    presupuesto_oficial: po,
    aiu: c.aiu || null,
    plazo_meses: numero(c.plazo_meses) ?? numero(p.plazo_meses) ?? 12,
    anticipo_pct: numero(c.anticipo_pct) ?? 0,
    anticipo_es_dato: !!c.anticipo_es_dato,
    p_base: numero(p.p_base),
    competencia: p.competencia || null,
    baja,
    costo_preparacion: cPrep,
  };
  if (numero(c.dso_dias) != null) base.dso_dias = numero(c.dso_dias);
  if (numero(c.i_ea) != null) base.i_ea = numero(c.i_ea);

  const fiscal = c.fiscal || null;
  const refFiscal = precioActual != null && precioActual > 0 ? precioActual : null;

  /* Un punto de la curva. En la rejilla manda el DESCUENTO —el precio se deriva
     de él y se redondea al peso, porque un precio recomendado con céntimos no
     se puede ofertar— y para el punto vigente manda el PRECIO, que entra
     verbatim: `precio_final` sale de `calcularPresupuesto` con dos decimales, y
     redondearlo aquí bastaría para que el punto vigente dejara de reproducir el
     bloque de rentabilidad. La igualdad entre los dos es una invariante probada,
     no una casualidad que se pueda perder en un `Math.round`. */
  const evaluar = (descuento, { precio: precioDado = null, extra = null } = {}) => {
    const precio = precioDado != null ? precioDado : Math.round(po * (1 - descuento / 100));
    const r = rentabilidad({ ...base, precio_oferta: precio, fiscal: fiscalEn(precio, fiscal, refFiscal) });
    /* La perilla del editor. Va en el punto y no en la cabecera porque cambia
       con el precio, y redondeada a los dos decimales que se pueden teclear:
       `precio_apu_resultante` es el precio que SALDRÁ de aplicarla, que no es
       exactamente `precio`. Publicar solo el porcentaje dejaría al dueño
       creyendo que el APU va a dar el precio recomendado al peso. */
    const dApu = pv != null && pv > 0 ? red((1 - precio / pv) * 100, 2) : null;
    const aplicable = dApu != null && dApu >= 0 && dApu <= FACTOR_BAJA_MAX;
    return {
      descuento,
      precio,
      probabilidad: r.p_ganar,
      margen: r.margen_bruto_cop,
      veg: r.veg,
      /* La fórmula LITERAL del encargo, al lado de la que decide. No es la que
         elige: no ha pagado la contribución del 5 % ni la financiación. */
      veg_margen_bruto: Number.isFinite(r.p_ganar) ? Math.round(r.p_ganar * r.margen_bruto_cop) : null,
      utilidad_esperada: r.utilidad_esperada,
      margen_bruto_pct: r.margen_bruto_pct,
      margen_neto_pct: r.margen_neto_pct,
      k_max: r.k_max,
      payback_meses: r.payback_meses,
      utilidad_no_positiva: r.filtros_duros.utilidad_no_positiva,
      /* En la rejilla es SIEMPRE `false` (se recorta en descuento 0), pero el
         punto vigente sí puede estar por encima del techo —es exactamente lo
         que pasa cuando el APU sale más caro que la cuantía publicada— y ese es
         el hecho más importante que puede tener un precio. */
      supera_presupuesto_oficial: !!r.filtros_duros.supera_presupuesto_oficial,
      // `null` cuando no se conoce el piso: no es «no está por debajo»
      bajo_el_piso: piso != null && piso > 0 ? precio < piso : null,
      descuento_apu_pct: dApu,
      aplicable_al_apu: aplicable,
      precio_apu_resultante: aplicable ? redPrecio(pv * (1 - dApu / 100)) : null,
      ...extra,
    };
  };

  const curva = [];
  for (let i = 0; i < nPuntos; i++) curva.push(evaluar(red(desde + i * paso, 4)));

  /* ---------- el óptimo ----------
     `vegDe` manda un VEG ausente a −∞ en vez de compararlo tal cual: `null > x`
     y `null >= x` dan resultados opuestos y un punto sin VEG acabaría o ganando
     la meseta entera o pasando por empate. Un «no sé» no puede competir por el
     primer puesto — es la regla de siempre, aplicada a una comparación. */
  const vegDe = (x) => (Number.isFinite(x.veg) ? x.veg : -Infinity);
  let iOpt = 0;
  for (let i = 1; i < curva.length; i++) {
    // `>` estricto: ante un empate gana el de MENOS descuento, que es el de más
    // margen y el que menos depende de que la curva de probabilidad sea exacta
    if (vegDe(curva[i]) > vegDe(curva[iOpt])) iOpt = i;
  }
  const optimo = curva[iOpt];

  /* ---------- la meseta y las tres opciones ----------
     Se camina CONTIGUAMENTE desde el óptimo hacia los dos lados. La banda
     {veg ≥ umbral} puede estar partida —la curva es el producto de una mezcla
     de dos regímenes por un margen lineal, y no hay ninguna garantía de que sea
     unimodal—, y tomar el mínimo y el máximo de una banda partida saltaría un
     valle: se ofrecería como «casi igual de bueno» un precio separado del
     óptimo por una zona que no lo es. */
  const tol = Math.min(100, Math.max(0, numero(c.tolerancia_pct) ?? TOLERANCIA_MESETA_PCT));
  const vegOpt = vegDe(optimo);
  const umbral = Number.isFinite(vegOpt) ? vegOpt - Math.abs(vegOpt) * (tol / 100) : Infinity;
  let iCons = iOpt;
  while (iCons - 1 >= 0 && vegDe(curva[iCons - 1]) >= umbral) iCons--;
  let iAgr = iOpt;
  while (iAgr + 1 < curva.length && vegDe(curva[iAgr + 1]) >= umbral) iAgr++;

  const perdida = (punto) => (optimo.veg > 0 ? red((optimo.veg - punto.veg) * 100 / optimo.veg, 2) : null);
  const opcion = (punto, etiqueta, explicacion) => ({
    ...punto,
    etiqueta,
    explicacion,
    perdida_veg_pct: perdida(punto),
    diferencia_vs_optimo: {
      precio: punto.precio - optimo.precio,
      margen: punto.margen - optimo.margen,
      probabilidad_pp: punto.probabilidad != null && optimo.probabilidad != null
        ? red((punto.probabilidad - optimo.probabilidad) * 100, 2) : null,
      veg: punto.veg != null && optimo.veg != null ? punto.veg - optimo.veg : null,
    },
  });

  const opciones = {
    conservador: opcion(curva[iCons], "conservador",
      "Menos descuento: más margen por contrato y menos probabilidad de llevárselo."),
    optimo: opcion(optimo, "óptimo", "El máximo valor esperado de la ganancia."),
    agresivo: opcion(curva[iAgr], "agresivo",
      "Más descuento: más probabilidad en el escenario «menor valor» y menos margen en los cuatro."),
    meseta: {
      desde_pct: curva[iCons].descuento,
      hasta_pct: curva[iAgr].descuento,
      ancho_pp: red(curva[iAgr].descuento - curva[iCons].descuento, 2),
      tolerancia_pct: tol,
      /* Que las tres opciones coincidan NO es un fallo: significa que el óptimo
         es agudo y que moverse cuesta más del `tol %` del valor esperado. Se
         DICE, en vez de fabricar tres puntos distintos con un ±N pp inventado. */
      colapsada: iCons === iOpt && iAgr === iOpt,
    },
  };

  /* ---------- dónde está hoy ----------
     Se evalúa el precio VIGENTE del presupuesto, esté o no en la rejilla. Es lo
     que convierte la recomendación en accionable («mueva X pesos y gana Y de
     VEG») y, de paso, es la prueba viva de que esto no es un segundo cálculo:
     con `precio_actual` el fiscal viaja intacto y el punto reproduce al peso el
     bloque de rentabilidad. */
  let actual = null;
  if (precioActual != null && precioActual > 0) {
    actual = evaluar(red((1 - precioActual / po) * 100, 6),
      { precio: precioActual, extra: { es_precio_vigente: true } });
    actual.en_la_rejilla = curva.some((x) => x.descuento === actual.descuento);
  }

  /* ---------- lo que hay que decir aunque no lo hayan preguntado ----------
     Un máximo se puede publicar siempre; lo que no se puede es publicarlo como
     recomendación cuando el rango entero pierde plata, cuando el máximo cae en
     el borde (o sea, cuando el barrido se quedó corto) o cuando el precio que
     sale no se puede escribir en la perilla del editor. */
  const alertas = [];
  const sinPuntoRentable = !(optimo.veg > 0);
  if (sinPuntoRentable) {
    alertas.push("⛔ NINGÚN precio del rango tiene valor esperado positivo: con este costo directo y este "
      + "presupuesto oficial, el valor esperado de la ganancia no cubre el costo de preparar la oferta. "
      + "El «óptimo» de abajo es el menos malo, no una recomendación de presentarse.");
  }
  const enElBorde = iOpt === 0 ? "inferior" : iOpt === curva.length - 1 ? "superior" : null;
  if (enElBorde) {
    alertas.push(`El máximo cae en el extremo ${enElBorde} del rango (${optimo.descuento} % de baja): fuera de `
      + "él podría haber más valor esperado, pero el rango es el que el histórico de esta entidad hace "
      + "plausible. Ensancharlo por cuenta propia sería recomendar una baja que el mercado no respalda.");
  }
  if (!optimo.aplicable_al_apu) {
    alertas.push(optimo.descuento_apu_pct != null && optimo.descuento_apu_pct < 0
      ? `El precio óptimo está POR ENCIMA de su precio de venta (${optimo.descuento_apu_pct} % de «baja»): el `
        + "ajuste competitivo solo puede bajar el precio, así que no hay descuento que aplicar. Le sobra "
        + "margen: si quiere que el APU refleje ese precio, suba la utilidad o la administración."
      : "El descuento óptimo no se puede escribir en la perilla del editor (el ajuste competitivo admite "
        + "entre 0 % y 60 %).");
  }
  if (pasos + 1 > MAX_PUNTOS) {
    // «No silent caps»: un recorte que no se declara se lee como cobertura
    alertas.push(`El rango pedido daba ${pasos + 1} precios y se barrieron los primeros ${MAX_PUNTOS}: `
      + "la cola quedó sin explorar. Suba el paso si necesita el rango entero.");
  }
  if (optimo.bajo_el_piso) {
    alertas.push("El precio óptimo queda POR DEBAJO del precio piso: el valor esperado sale del volumen, no "
      + "del margen. Verifique el piso antes de ofertar ahí.");
  }

  const comparacion = actual
    ? {
      diferencia_precio: optimo.precio - actual.precio,
      diferencia_veg: optimo.veg != null && actual.veg != null ? optimo.veg - actual.veg : null,
      diferencia_margen: optimo.margen - actual.margen,
      diferencia_probabilidad_pp: optimo.probabilidad != null && actual.probabilidad != null
        ? red((optimo.probabilidad - actual.probabilidad) * 100, 2) : null,
      ya_esta_en_el_optimo: Math.abs(optimo.precio - actual.precio) <= 1,
    }
    : null;

  return {
    aplicable: true,
    motivo: null,
    mensaje: `Sobre ${curva.length} precios entre el ${curva[0].descuento} % y el `
      + `${curva[curva.length - 1].descuento} % de baja, el valor esperado de la ganancia es máximo ofertando `
      + `con un ${optimo.descuento} % de descuento sobre el presupuesto oficial.`,
    ...cabecera,
    rango: {
      /* Los extremos se leen de la CURVA, no de las variables con las que se
         pidió: si `MAX_PUNTOS` recortó la cola, publicar el `hasta` pedido
         describiría un dominio que la curva no cubre. `pedido_*` conserva lo
         que se pidió, para que el recorte se pueda ver. */
      desde_pct: curva[0].descuento,
      hasta_pct: curva[curva.length - 1].descuento,
      paso_pct: paso,
      puntos: curva.length,
      pedido_desde_pct: pedido,
      pedido_hasta_pct: hasta,
      /* El rango pedido empezaba por encima del presupuesto oficial y se
         recortó. Va dicho: una curva que empieza donde no la pidieron y no lo
         declara es una curva que miente sobre su propio dominio. */
      recortado_en_cero: pedido < 0,
      centro_en_la_curva: curva.some((x) => x.descuento === mediana),
      truncado: pasos + 1 > MAX_PUNTOS,
      optimo_en_el_borde: enElBorde,
    },
    precio_optimo: optimo.precio,
    descuento_optimo_pct: optimo.descuento,
    veg_optimo: optimo.veg,
    probabilidad_optima: optimo.probabilidad,
    sin_punto_rentable: sinPuntoRentable,
    alertas,
    optimo,
    opciones,
    punto_actual: actual,
    comparacion_con_actual: comparacion,
    curva,
    supuestos: SUPUESTOS,
    como_leerlo: COMO_LEERLO,
  };
}

module.exports = {
  optimizarPrecioOferta,
  PASO_PP, DESDE_PP, HASTA_PP, TOLERANCIA_MESETA_PCT, MAX_PUNTOS, FACTOR_BAJA_MAX,
};
