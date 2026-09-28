/* ============================================================================
   public/ganancia.js · LA CUENTA DE «CUÁNTA PLATA DEJA ESTE CONTRATO»
   ----------------------------------------------------------------------------
   UMD, y no por elegancia: el servidor la usa para servir la cifra de la
   tarjeta (`lib/ganancia` la re-exporta, el patrón de `costos.js` y
   `glosario.js`) y el navegador la usa para RECALCULARLA EN VIVO cuando el
   usuario corrige su estructura de precio en el detalle. Dos implementaciones
   —una para servir y otra para el modal— acabarían enseñando dos cifras del
   mismo contrato, que es exactamente el defecto que este repositorio ya pagó
   con `total_procesos`/`procesos_contados` y con el presupuesto que se
   calculaba dos veces.

   ── LA CUENTA, ENTERA ─────────────────────────────────────────────────────
       queda = precio − IVA de la utilidad − descuentos de acta − obra − administración − imprevistos

   Seis líneas y ninguna oculta (el IVA de la utilidad, desde el 27-sep-2026:
   ver `precioDentroDeTotal`). La suma CIERRA AL PESO por construcción: la
   administración y los imprevistos se DERIVAN restando totales ya redondeados
   una sola vez, en vez de redondear cada porcentaje por su cuenta. Una cascada
   que no cuadra al peso es «la fila que no cuadra» del módulo de precios, y
   aquí se le enseña al usuario.

   ── TRES CORRECCIONES SOBRE LA PRIMERA VERSIÓN, LAS TRES REPRODUCIDAS ──────

   1) EL IMPREVISTO NO ES UN COSTO CIERTO: ES UNA PROVISIÓN.
      La primera versión restaba `CD × (1 + (A+I)/100)` y presentaba el
      resultado como «la plata que le queda». Pero `lib/apu/rentabilidad` —el
      otro motor del repositorio, que responde esta misma pregunta— dice, con
      todas las letras: «La "I" del AIU no es un costo: es el INGRESO que
      financia la prima de riesgo. Restar las dos sería contar el imprevisto
      dos veces». Dos módulos con doctrinas opuestas sobre una línea que vale
      el 4 % del contrato ($128,6 M en el proceso con el que se cazó esto)
      producen dos cifras de signo distinto para el mismo proceso.
      Aquí no se elige una y se calla la otra: se publican LOS DOS EXTREMOS con
      su nombre en castellano —si se gasta la reserva y si no— porque cuánto se
      consume de un imprevisto no lo sabe nadie por adelantado. Inventar un
      porcentaje de consumo habría sido la tercera cifra falsa.

   2) LA CONTRIBUCIÓN DEL 5 % NO PUEDE COBRARSE DOS VECES SIN DECIRLO.
      `CLAUDE.md` ya lo tenía escrito para el otro motor: «su "A" cubre
      nominalmente dirección de obra, pólizas, ensayos e impuestos» y «usar la
      "A" declarada como si fuera el indirecto Y sumar aparte garantías e
      impuestos cobraba la administración dos veces y DEJABA EN ROJO
      PRESUPUESTOS SANOS». La primera versión hacía justo eso, con el
      interruptor en `false` por defecto. No se cambia el defecto —eso sería
      adivinar cómo arma su AIU el usuario, y son 5 puntos del contrato— pero
      MIENTRAS NO LO DECLARE, la cifra no puede afirmar una pérdida que
      desaparece bajo la otra lectura. Por eso existe `contribucion_declarada`.

   3) UNA PÉRDIDA SOLO SE AFIRMA SI SE SOSTIENE EN LOS DOS EXTREMOS.
      `veredicto` vale «deja» cuando el peor caso ya deja plata, «pierde»
      cuando ni el mejor la deja, y «depende» en medio — que es donde cae la
      mayoría de los procesos de obra mientras el usuario no haya costeado el
      APU. «Depende» no es una respuesta floja: es la única verdadera, y viene
      con los dos números y con los dos datos que la cierran.

   ── LO QUE ESTA CUENTA NO SABE ────────────────────────────────────────────
   El costo de financiar la obra mientras la entidad paga, los ensayos, el plan
   de manejo ambiental y la liquidación. Ninguno consta en el dataset y ninguno
   se inventa: por eso la cifra viaja siempre declarada como cota superior.
   ========================================================================== */
(function (raiz, fabrica) {
  if (typeof module === "object" && module.exports) module.exports = fabrica();
  else raiz.Ganancia = fabrica();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  const red = (n) => Math.round(n);
  const num = (v) => {
    if (v === null || v === undefined || v === "") return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  };
  /* Acotado a [0, 100] como `lib/apu/calculo.normalizarConfig`: la
     configuración viaja VERBATIM dentro del borrador y nadie la valida al
     guardarla, así que un valor absurdo llegaría hasta aquí. */
  const acotar = (v, defecto) => Math.min(100, Math.max(0, num(v) ?? defecto));

  /* Estructura de precio de referencia: la MISMA que traen los campos de
     Ajustes en el editor (A 15 · I 5 · U 5, dentro de las bandas del manual:
     A 12-20, I 3-5, U 5-10). NO es una medición y quien la use lo declara. */
  const AIU_DEFECTO = { administracion_pct: 15, imprevistos_pct: 5, utilidad_pct: 5, modo: "aditivo" };

  /* ────────────────────────────────────────────────────────────────────────
     EL IVA DE LA UTILIDAD FRENTE AL PRESUPUESTO OFICIAL (R-01b, 27-sep-2026).
     La ÚNICA regla del repositorio para pasar de «su precio» (costo + AIU, lo
     que calcula Precios) a «lo que la entidad compara con su presupuesto», y
     de vuelta. Vive en este módulo UMD —y `lib/apu/calculo` la re-exporta—
     porque el detalle de la tarjeta la rehace EN VIVO al mover la utilidad, y
     el navegador no puede cargar `calculo.js`.

     El IVA de un contrato de obra se causa sobre la UTILIDAD (art. 3 D.
     1372/1992, hoy art. 1.3.1.7.9 D. 1625/2016), y si la entidad lo mete o no
     en su presupuesto lo decide ELLA: medido el 27-sep-2026, 11 de 22 procesos
     reales cierran su `precio_base` con esa fila y 11 sin ella (MEMORIA.md,
     «La revisión de la oferta suma como la entidad…»). Tres casos:
       · «con_iva»   el pliego cuadra con la fila: se suma a su precio;
       · «sin_iva»   el pliego cuadra sin ella: no se suma;
       · «no_se_sabe» (todo lo demás): SE SUMA, por prudencia. Decisión del
         dueño del 27-sep-2026: en precios cuesta el falso positivo, y prometer
         la plata del IVA —que es de la DIAN— como ganancia, o un precio que la
         entidad rechaza por pasarse, es el error caro.
     La fracción escala con el precio, como la baja del editor escala todo el
     anexo: el IVA es la tarifa por la parte de utilidad que lleva cada peso. */
  const IVA_TARIFA_PCT = 19;

  function casoIvaUtilidad(variante) {
    return variante === "con_iva" || variante === "sin_iva" ? variante : "no_se_sabe";
  }

  /* Qué parte de su precio (sin IVA) es IVA de la utilidad, desde el AIU:
       aditivo    0,19 · U ÷ (1 + A + I + U)
       compuesto  0,19 · U ÷ ((1 + U)(1 + I))   (la U va sobre CD·(1+A), como en calculo.js)
     Sin alguno de los tres porcentajes, null: no se sabe, y no es 0. */
  function fraccionIvaUtilidad(aPct, iPct, uPct, modo) {
    const A = num(aPct), I = num(iPct), U = num(uPct);
    if (A == null || I == null || U == null || U < 0) return null;
    const u = U / 100;
    const base = modo === "compuesto" ? (1 + u) * (1 + I / 100) : 1 + (A + I + U) / 100;
    return base > 0 ? (IVA_TARIFA_PCT / 100) * u / base : null;
  }

  /* De su precio a lo que compara la entidad: {caso, cuenta, precio, iva, total}.
     Sin fracción y con el IVA contando, total null: sin dato, jamás el precio solo. */
  function ivaSobrePrecio(precio, opciones) {
    const o = opciones || {};
    const caso = casoIvaUtilidad(o.variante);
    const cuenta = caso !== "sin_iva";
    const p = num(precio), f = num(o.fraccion);
    if (p == null) return { caso, cuenta, precio: null, iva: null, total: null };
    if (!cuenta) return { caso, cuenta, precio: p, iva: 0, total: p };
    if (f == null || f < 0) return { caso, cuenta, precio: p, iva: null, total: null };
    const iva = red(p * f);
    return { caso, cuenta, precio: p, iva, total: p + iva };
  }

  /* De un total (el presupuesto, o el presupuesto menos una baja) al precio que
     cabe dentro: {caso, cuenta, precio, iva, total}, con `precio + iva = total`
     AL PESO —el IVA sale por resta— para que la cuenta que se enseña cuadre. */
  function precioDentroDeTotal(total, opciones) {
    const o = opciones || {};
    const caso = casoIvaUtilidad(o.variante);
    const cuenta = caso !== "sin_iva";
    const T = num(total), f = num(o.fraccion);
    if (T == null) return { caso, cuenta, precio: null, iva: null, total: null };
    const t = red(T);
    if (!cuenta) return { caso, cuenta, precio: t, iva: 0, total: t };
    if (f == null || f < 0) return { caso, cuenta, precio: null, iva: null, total: t };
    /* hacia ABAJO y comprobado con `ivaSobrePrecio`: redondeado al peso más
       cercano, el precio de un total igual al presupuesto podía volver con un
       peso de más —«supera el presupuesto» en la frontera— */
    let precio = Math.floor(T / (1 + f));
    while (precio > 0 && precio + red(precio * f) > t) precio--;
    // …y el MÁS ALTO que cabe: sin esto el total salía un peso por debajo ($1.364.999.999)
    while (precio + 1 + red((precio + 1) * f) <= t) precio++;
    return { caso, cuenta, precio, iva: t - precio, total: t };
  }

  /* ────────────────────────────────────────────────────────────────────────
     `desglose` — la única definición de la cuenta. La llaman el servidor (para
     servir la tarjeta) y el navegador (para recalcular en el detalle).
     ──────────────────────────────────────────────────────────────────────── */
  function desglose(entrada) {
    const e = entrada || {};
    const V = num(e.precio);
    const CD = num(e.costo_directo);
    if (V == null || V <= 0 || CD == null || CD <= 0) return null;

    const A = acotar(e.administracion_pct, AIU_DEFECTO.administracion_pct);
    const I = acotar(e.imprevistos_pct, AIU_DEFECTO.imprevistos_pct);
    const U = acotar(e.utilidad_pct, AIU_DEFECTO.utilidad_pct);
    const modo = e.modo === "compuesto" ? "compuesto" : "aditivo";
    const tauPct = Math.min(100, Math.max(0, num(e.descuentos_pct) ?? 0));
    const contribucionPct = Math.min(tauPct, Math.max(0, num(e.contribucion_pct) ?? 0));
    const contribucionDeclarada = e.contribucion_declarada === true;

    /* Los mismos dos factores que `lib/apu/piso_techo`, para que
       `costo_sin_ganancia` sea EXACTAMENTE su `costo_sin_utilidad`: es la
       identidad que ata la tarjeta al panel Piso/Techo y hay prueba. */
    const factorCero = modo === "compuesto" ? (1 + A / 100) * (1 + I / 100) : 1 + (A + I) / 100;
    const factorSoloA = 1 + A / 100;   // idéntico en los dos modos

    const obra = red(CD);
    const costoSinImprevisto = red(CD * factorSoloA);
    const costoSinGanancia = red(CD * factorCero);
    /* DERIVADAS, no recalculadas: así `obra + administración + imprevistos`
       es exactamente `costo_sin_ganancia` al peso, y la cascada que ve el
       usuario cuadra sin residuos de redondeo. */
    const administracion = costoSinImprevisto - obra;
    const imprevistos = costoSinGanancia - costoSinImprevisto;

    /* EL IVA DE LA UTILIDAD SALE ANTES QUE TODO (R-01b, 27-sep-2026): `precio`
       es lo que paga la entidad —el presupuesto menos la baja—, y si su
       presupuesto lleva el IVA de la utilidad (o no se sabe: prudencia), esa
       parte es de la DIAN, no del contratista. Los descuentos de acta se
       calculan sobre el precio SIN ese IVA, la misma base de `lib/apu/calculo`
       (contribución = precio final × 5 %) y del piso de `lib/apu/piso_techo`:
       así en el piso la cuenta sigue dando exactamente la utilidad mínima. */
    const sinIva = precioDentroDeTotal(V, { fraccion: fraccionIvaUtilidad(A, I, U, modo), variante: e.variante_iva });
    const precio = red(V);
    const ivaUtilidad = sinIva.iva != null ? sinIva.iva : 0;
    const precioSinIva = precio - ivaUtilidad;

    const descuentos = red(precioSinIva * tauPct / 100);
    const contribucion = red(precioSinIva * contribucionPct / 100);
    const otrasDeducciones = descuentos - contribucion;

    const valor = precio - ivaUtilidad - descuentos - costoSinGanancia;
    const sinGastarImprevisto = valor + imprevistos;
    /* Si su administración ya paga los impuestos del contrato, la contribución
       no se descuenta OTRA VEZ. Solo se ofrece como escenario mientras el
       usuario no lo haya declarado: una vez declarado, `contribucion_pct` ya
       llega en 0 y este escenario coincide con el base. */
    const alivioContribucion = contribucionDeclarada ? 0 : contribucion;

    const peor = valor;
    const mejor = valor + imprevistos + alivioContribucion;
    const veredicto = peor > 0 ? "deja" : (mejor < 0 ? "pierde" : "depende");

    return {
      precio, iva_utilidad: ivaUtilidad, iva_caso: sinIva.caso, precio_sin_iva_utilidad: precioSinIva,
      descuentos, contribucion, otras_deducciones: otrasDeducciones,
      obra, administracion, imprevistos, costo_sin_ganancia: costoSinGanancia,
      valor, peor, mejor,
      sin_gastar_imprevisto: sinGastarImprevisto,
      alivio_contribucion: alivioContribucion,
      utilidad_declarada: red(CD * U / 100),
      veredicto,
      margen_pct: precio > 0 ? Math.round((valor / precio) * 10000) / 100 : null,
      aiu: { administracion_pct: A, imprevistos_pct: I, utilidad_pct: U, modo },
      descuentos_pct: tauPct, contribucion_pct: contribucionPct,
      contribucion_declarada: contribucionDeclarada,
    };
  }

  /* EL COSTO DIRECTO CUANDO EL USUARIO NO HA COSTEADO EL PROCESO.
     No se adivina: se cierra por la IDENTIDAD con la que se arma cualquier
     oferta de obra en Colombia —precio = costo directo × (1 + A + I + U)—, así
     que suponer que arma la oferta con SU estructura hasta el precio de mercado
     fija el costo. Es un supuesto declarado sobre CÓMO construye el precio, no
     una estimación de sus costos.

     Vive aquí y no en `lib/ganancia` porque el detalle del navegador la
     necesita: sin ella, subir la ganancia declarada en el modal no bajaba el
     costo implícito y el detalle enseñaba una cifra que el servidor NO iba a
     confirmar al aplicarla. Lo cazó abrir la página, no una prueba de Node. */
  /* El precio SUYO dentro de lo que paga la entidad, con la estructura de precio
     ACOTADA como en `desglose` (una casilla vacía usa el defecto, no cero): la
     llaman el servidor y el detalle del navegador antes de cerrar el costo
     implícito, para que los dos lo cierren con el mismo precio. */
  function precioSuyoDentroDe(total, aPct, iPct, uPct, modo, variante) {
    const A = acotar(aPct, AIU_DEFECTO.administracion_pct);
    const I = acotar(iPct, AIU_DEFECTO.imprevistos_pct);
    const U = acotar(uPct, AIU_DEFECTO.utilidad_pct);
    return precioDentroDeTotal(total, { fraccion: fraccionIvaUtilidad(A, I, U, modo), variante }).precio;
  }

  function costoDirectoImplicito(precio, aPct, iPct, uPct, modo) {
    const V = num(precio);
    if (V == null || V <= 0) return null;
    const A = acotar(aPct, AIU_DEFECTO.administracion_pct);
    const I = acotar(iPct, AIU_DEFECTO.imprevistos_pct);
    const U = acotar(uPct, AIU_DEFECTO.utilidad_pct);
    const factor = modo === "compuesto"
      ? (1 + A / 100) * (1 + I / 100) * (1 + U / 100)
      : 1 + (A + I + U) / 100;
    return factor > 0 ? V / factor : null;
  }

  /* Ganancia declarada (en % del costo directo) con la que el precio deja de
     perder plata, dados A, I y τ. Se despeja del punto de equilibrio, y el
     despeje NO es el mismo en los dos modos de AIU:
       aditivo    (1+(A+I+u)/100)(1−τ) = 1+(A+I)/100
                  ⇒ u = 100 · (1+(A+I)/100) · (1/(1−τ) − 1)
       compuesto  A e I se cancelan ⇒ u = 100 · (1/(1−τ) − 1)
     Sin descuentos no hay nada que despejar y vale 0. */
  function utilidadMinimaParaNoPerder(aPct, iPct, tauPct, modo) {
    const tau = (num(tauPct) || 0) / 100;
    if (!(tau > 0) || tau >= 1) return 0;
    const base = modo === "compuesto" ? 1 : 1 + ((num(aPct) || 0) + (num(iPct) || 0)) / 100;
    return Math.round(base * (1 / (1 - tau) - 1) * 10000) / 100;
  }

  return {
    desglose, costoDirectoImplicito, utilidadMinimaParaNoPerder, AIU_DEFECTO,
    IVA_TARIFA_PCT, casoIvaUtilidad, fraccionIvaUtilidad, ivaSobrePrecio, precioDentroDeTotal, precioSuyoDentroDe,
  };
});
