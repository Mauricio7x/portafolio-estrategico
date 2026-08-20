"use strict";
/* Panel Piso / Techo — la única pregunta que importa: ¿me presento o no, y a cuánto?
   (Plan maestro Detekta v3, Fase 3, ago 2026.)

   Es una capa PURA sobre datos que la acción `rentabilidad` de /api/apu YA
   reúne: el resumen del presupuesto (costo directo, AIU), la baja histórica
   (`lib/indice_baja.bajaDeMercado`, cascada entidad+familia → entidad →
   departamento+familia con MÍNIMO 5 procesos), la competencia de la entidad
   (`lib/indice_competencia.competenciaDe`, mínimo 5) y la cuantía publicada.
   No lee Redis, no recalcula el costo directo, no reimplementa la cascada:
   un segundo cálculo de cualquiera de los tres divergiría del primero a la
   primera corrección (la lección de `total_procesos`/`procesos_contados`), y
   aquí la divergencia sería entre el precio que la app RECOMIENDA y el que
   enseña al lado.

   Tres reglas que no se negocian:
   · «Sin referencia» sin techo. Un techo calculado sobre tres procesos es peor
     que ningún techo, porque el usuario lo va a creer. Si la baja no tiene base
     (n < 5 en los tres niveles), el panel enseña el piso y lo dice. NUNCA se
     usa el índice por SEGMENTO (mínimo 3, último recurso de otra pantalla).
   · El número de oferentes de un proceso ABIERTO no existe: `hgi6-6wh3` (que
     lista los proponentes) responde 0 filas hasta la apertura de ofertas —
     medido 2026-08-15 sobre procesos reales, ver docs/datos.md §5. Lo que sí
     tiene base es CUÁNTOS SUELEN presentarse a esta entidad (histórico, n ≥ 5).
     Un conteo desconocido viaja en `null` y se dice «Sin referencia», jamás 0.
   · El veredicto es una FRASE completa con sus cifras, nunca un porcentaje
     suelto. La cifra que la sostiene viaja al lado con su fuente.

   FÓRMULAS (las del encargo, con una precisión):
     costo_total     = CD × (1 + A + I + U_min)          [aditivo, la convención de los pliegos tipo]
     piso_rentable   = costo_total ÷ (1 − τ)             τ = contribución 5 % + deducciones de acta declaradas
     techo           = presupuesto_oficial × (1 − baja_mediana)     solo con n ≥ 5
     umbral_temerario= presupuesto_oficial × 0,80        (referencia; la media−σ de las ofertas
                                                          no se conoce antes del cierre)
   La precisión es τ: el encargo escribe «costo_total con la utilidad mínima»,
   pero la contribución especial de obra pública (Ley 418/1997) y las estampillas
   se descuentan de cada acta y NO están dentro de la A del catálogo (el motor de
   rentabilidad las trata como línea aparte a propósito). Un piso que no las
   cubriera prometería «no perder plata» perdiéndola en cada pago. Sin las
   deducciones cargadas, τ solo lleva el 5 % y el piso se declara COTA INFERIOR. */

const CONTRIBUCION_PCT_DEFECTO = (() => {
  try { return require("./calculo.js").CONTRIBUCION_OBRA_PUBLICA; } catch (_) { return 5; }
})();
const MIN_PROCESOS_TECHO = 5;   // la regla sagrada del encargo: n ≥ 5 en los tres niveles
const TEMERARIO_PCT = 20;       // «por debajo del 80 % del presupuesto» — criterio de REFERENCIA (ver fuente abajo)

const numero = (v) => {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};
const red = (n) => Math.round(n);

/* Formato colombiano sin depender del ICU del entorno: «$478.900.000». */
function cop(n) {
  if (n == null || !Number.isFinite(n)) return "—";
  const s = Math.abs(Math.round(n)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${n < 0 ? "−" : ""}$${s}`;
}
function pct(n) {
  if (n == null || !Number.isFinite(n)) return "—";
  return `${(Math.round(n * 10) / 10).toString().replace(".", ",")} %`;
}

/* La baja que sostiene el techo tiene que venir con base: n ≥ 5 y granularidad
   declarada. `bajaDeMercado` ya lo garantiza (devuelve `sin_dato` por debajo del
   mínimo), pero aquí se vuelve a exigir por si algún consumidor pasa un objeto
   armado a mano: la regla es del panel, no de quien lo alimenta. */
function bajaUtilizable(baja) {
  if (!baja || baja.nivel === "sin_dato") return null;
  const mediana = numero(baja.baja_mediana);
  const n = numero(baja.procesos_contados);
  if (mediana == null || n == null || n < MIN_PROCESOS_TECHO || !baja.granularidad_utilizada) return null;
  return { mediana, procesos: n, granularidad: baja.granularidad_utilizada, modalidad: baja.modalidad_utilizada || null };
}

/* Cómo se dice la baja según DE DÓNDE salió (la cascada solo baja en
   especificidad; el texto tiene que decir a qué nivel llegó). */
function fraseBaja(b) {
  const n = `${b.procesos} proceso${b.procesos === 1 ? "" : "s"}`;
  const mod = b.modalidad ? ` en ${b.modalidad}` : "";
  if (b.mediana === 0) {
    if (b.granularidad === "entidad_familia") return `En obras como esta, esta entidad suele adjudicar por el presupuesto oficial: quien ganó no bajó el precio (${n}${mod}).`;
    if (b.granularidad === "entidad") return `Esta entidad suele adjudicar por el presupuesto oficial: quien ganó no bajó el precio (${n}${mod}).`;
    return `En esta zona, en obras como esta, se suele adjudicar por el presupuesto oficial (${n}${mod}).`;
  }
  if (b.granularidad === "entidad_familia") return `En obras como esta, esta entidad suele bajar ${pct(b.mediana)} (${n}${mod}).`;
  if (b.granularidad === "entidad") return `Esta entidad suele bajar ${pct(b.mediana)} (${n}${mod}).`;
  return `En esta zona, en obras como esta, se suele bajar ${pct(b.mediana)} (${n}${mod}).`;
}

function competenciaUtilizable(c) {
  if (!c || c.nivel === "sin_dato") return null;
  const promedio = numero(c.promedio_oferentes);
  const n = numero(c.total_procesos ?? c.procesos_contados ?? c.procesos);
  if (promedio == null || n == null || n < MIN_PROCESOS_TECHO) return null;
  return { promedio, procesos: n };
}

function pisoTecho(entrada = {}) {
  const {
    presupuesto_oficial = null,
    costo_directo = null,
    aiu = {},                       // { administracion_pct, imprevistos_pct, utilidad_pct, modo }
    utilidad_minima_pct = null,     // la que el usuario declaró; sin ella, la U del AIU
    deducciones_pct = null,         // null = sin dato (el piso es cota inferior)
    contribucion_pct = CONTRIBUCION_PCT_DEFECTO,
    baja = null,
    competencia = null,
    precio_actual = null,
    modalidad = null,
    items_totales = null,
    items_costeados = null,
    temerario_pct = TEMERARIO_PCT,
  } = entrada;

  const po = numero(presupuesto_oficial);
  const cd = numero(costo_directo);
  const A = numero(aiu.administracion_pct) ?? 0;
  const I = numero(aiu.imprevistos_pct) ?? 0;
  const U = numero(aiu.utilidad_pct) ?? 0;
  const uMin = numero(utilidad_minima_pct) ?? U;
  const uMinEsDeclarada = numero(utilidad_minima_pct) != null;
  const ded = numero(deducciones_pct);
  const tauPct = (numero(contribucion_pct) ?? 0) + (ded ?? 0);
  const precioActual = numero(precio_actual);

  const fuentes = {
    presupuesto_oficial: "SECOP II (`p6dx-8zbt`, precio_base): lo que la entidad tiene presupuestado.",
    costo: items_totales != null
      ? `Su APU: ${items_costeados ?? "?"} de ${items_totales} ítems costeados con el catálogo (costo directo + A ${pct(A)} + I ${pct(I)} + U mínima ${pct(uMin)}).`
      : "Su APU (costo directo + AIU con la utilidad mínima).",
    piso: `Costo directo × (1 + A + I + U mínima) ÷ (1 − ${pct(tauPct)} de contribución de obra pública${ded != null ? " y deducciones de acta" : ""}). `
      + (ded == null ? "Las deducciones de acta (estampillas, ReteICA) NO están cargadas: el piso es una COTA INFERIOR." : "Deducciones de acta cargadas por el usuario."),
    baja: "Histórico de procesos ADJUDICADOS en SECOP II (`p6dx-8zbt`): 1 − valor adjudicado ÷ presupuesto oficial. "
      + "Cascada entidad+familia → entidad → departamento+familia; solo se usa un nivel con 5 o más procesos.",
    oferentes: "Histórico de la entidad (`p6dx-8zbt`, respuestas al procedimiento), promedio con 5 o más procesos. "
      + "El número de oferentes de ESTE proceso no se conoce hasta la apertura de ofertas (`hgi6-6wh3` lista los "
      + "proponentes solo después de cerrar).",
    umbral_temerario: `Referencia: ${100 - temerario_pct} % del presupuesto oficial. La media de las ofertas menos una desviación `
      + "no se conoce antes del cierre. Fundamento del riesgo: Decreto 1082 de 2015, art. 2.2.1.1.2.2.4 (oferta con "
      + "valor artificialmente bajo — la entidad debe pedir justificación y rechaza si no la sustenta).",
  };

  /* ── casos en que el panel no puede responder, dichos con su motivo ── */
  const base = { aplicable: false, estado: null, veredicto: null, cifras: {}, fuentes, supuestos: [] };
  if (cd == null || cd <= 0) {
    return { ...base, estado: "sin_costo", motivo: "sin_costo",
      veredicto: "Sin ítems costeados no hay costo con el que comparar: agregue las cantidades del pliego y calcule el APU." };
  }
  if (po == null || po <= 0) {
    return { ...base, estado: "sin_presupuesto", motivo: "sin_presupuesto_oficial",
      veredicto: "Este presupuesto no está asociado a un proceso con presupuesto oficial: no hay contra qué comparar el piso." };
  }
  if (tauPct >= 100) {
    return { ...base, estado: "sin_costo", motivo: "deducciones_invalidas",
      veredicto: "Las deducciones declaradas superan el 100 % del valor: revise el porcentaje." };
  }

  /* ── piso ── */
  const factorAiuMin = (aiu.modo === "compuesto")
    ? (1 + A / 100) * (1 + I / 100) * (1 + uMin / 100)
    : 1 + (A + I + uMin) / 100;
  const factorAiuCero = (aiu.modo === "compuesto")
    ? (1 + A / 100) * (1 + I / 100)
    : 1 + (A + I) / 100;
  const costoTotal = red(cd * factorAiuMin);
  const piso = red(costoTotal / (1 - tauPct / 100));
  const pisoCeroUtilidad = red((cd * factorAiuCero) / (1 - tauPct / 100));
  /* Lo que cuesta hacer la obra SIN un peso de ganancia: costo directo +
     administración + imprevistos. Se publica porque `lib/ganancia` lo necesita
     REDONDEADO UNA SOLA VEZ para que la resta que enseña la tarjeta cuadre al
     peso —precio − descuentos − esto = lo que queda—; deducirlo de
     `piso_sin_utilidad`, que ya está redondeado y además dividido por (1 − τ),
     acumula dos redondeos y puede mover el resultado un peso justo en el borde
     del signo. `costo_total` NO sirve: ese lleva la utilidad mínima dentro, y
     dos cifras parecidas con nombres parecidos es el defecto que este
     repositorio ya pagó con `total_procesos`/`procesos_contados`. */
  const costoSinUtilidad = red(cd * factorAiuCero);

  /* ── techo (solo con base) ── */
  const b = bajaUtilizable(baja);
  const techo = b ? red(po * (1 - b.mediana / 100)) : null;

  /* ── umbral temerario (referencia) ── */
  const umbral = red(po * (1 - temerario_pct / 100));

  /* ── oferentes ── */
  const comp = competenciaUtilizable(competencia);

  const cifras = {
    presupuesto_oficial: po,
    costo_total: costoTotal,
    costo_sin_utilidad: costoSinUtilidad,
    piso_rentable: piso,
    piso_sin_utilidad: pisoCeroUtilidad,
    piso_es_cota_inferior: ded == null,
    utilidad_minima_pct: uMin,
    utilidad_minima_declarada: uMinEsDeclarada,
    tau_pct: Math.round(tauPct * 100) / 100,
    baja_esperada_pct: b ? b.mediana : null,
    baja_procesos: b ? b.procesos : null,
    baja_granularidad: b ? b.granularidad : null,
    baja_modalidad: b ? b.modalidad : null,
    baja_procesos_vistos_sin_base: !b && baja ? (numero(baja.procesos_contados) || 0) : null,
    techo_competitivo: techo,
    umbral_temerario: umbral,
    oferentes_promedio: comp ? comp.promedio : null,
    oferentes_procesos: comp ? comp.procesos : null,
    precio_actual: precioActual,
    modalidad: modalidad || null,
  };

  const supuestos = [];
  if (!uMinEsDeclarada) supuestos.push(`La utilidad mínima aceptable no se declaró: se usó la U del AIU (${pct(U)}). Cámbiela en Ajustes.`);
  if (ded == null) supuestos.push("Las deducciones de acta (estampillas, ReteICA) no están cargadas: el piso solo descuenta la contribución del 5 %. Es una cota inferior.");
  supuestos.push(`El umbral de precio artificialmente bajo es de referencia (${100 - temerario_pct} % del presupuesto oficial): la media de las ofertas no se conoce antes del cierre.`);

  /* ── frases de contexto (siempre viajan, con o sin veredicto) ── */
  const vistos = cifras.baja_procesos_vistos_sin_base;
  const frases = {
    presupuesto: `Lo que la entidad tiene presupuestado: ${cop(po)}.`,
    costo: `Lo que a usted le cuesta hacerlo (con A, I y una utilidad mínima del ${pct(uMin)}): ${cop(costoTotal)}.`,
    piso: `Su precio mínimo para no perder plata: ${cop(piso)}${ded == null ? " (cota inferior: faltan las deducciones de acta)" : ""}.`,
    baja: b ? fraseBaja(b)
      : (vistos > 0
        ? `Sin referencia: solo hay ${vistos} proceso${vistos === 1 ? "" : "s"} adjudicado${vistos === 1 ? "" : "s"} comparable${vistos === 1 ? "" : "s"} y hacen falta ${MIN_PROCESOS_TECHO} para estimar cuánto se suele bajar.`
        : "Sin referencia: no hay procesos anteriores comparables con los que estimar cuánto se suele bajar."),
    techo: techo != null ? `El precio al que probablemente se gana: ${cop(techo)}.` : null,
    oferentes: comp
      ? `A esta entidad suelen presentarse ${comp.promedio.toString().replace(".", ",")} oferentes por proceso (${comp.procesos} procesos).`
      : "Cuántos se presentan aquí: sin referencia — no hay 5 procesos anteriores de esta entidad con oferentes contados.",
    umbral: `Por debajo de ${cop(umbral)} la entidad puede pedirle que justifique el precio.`,
  };

  /* ── veredicto ── */
  let estado, veredicto, detalle = null;
  if (piso > po) {
    estado = "no_presentarse_supera_presupuesto";
    veredicto = `No se presente. Su precio mínimo para no perder plata (${cop(piso)}) está por encima del presupuesto oficial (${cop(po)}): una oferta que lo supere se rechaza.`;
  } else if (techo == null) {
    estado = "sin_referencia";
    veredicto = `Su precio mínimo es ${cop(piso)}. No tenemos historial suficiente de esta entidad para estimar a cuánto se suele adjudicar.`;
    detalle = frases.baja;
  } else if (techo < piso) {
    estado = "no_presentarse";
    veredicto = "No se presente. El precio que necesita para ganar está por debajo del precio que necesita para no perder plata.";
    detalle = `Para ganar habría que ofertar cerca de ${cop(techo)} y su mínimo es ${cop(piso)}: le faltan ${cop(piso - techo)}.`;
  } else {
    estado = "presentarse";
    veredicto = `Preséntese entre ${cop(piso)} y ${cop(techo)}.`;
    if (piso < umbral) detalle = frases.umbral;
  }

  /* dónde está el precio ACTUAL del editor respecto al rango: es lo que hace
     accionable el veredicto (¿bajo, subo o dejo el precio como está?) */
  let precio_actual_estado = null;
  if (precioActual != null && precioActual > 0) {
    if (precioActual > po) precio_actual_estado = "supera_presupuesto";
    /* El caso NORMAL del APU con U = 5 %: el precio cubre CD + A + I + U pero
       no la contribución del 5 % (y las estampillas) que la entidad descuenta
       de cada acta. Decir solo «perdería plata» sería cierto y no accionable;
       hay que decir POR QUÉ y cuánto falta. */
    else if (precioActual < piso && precioActual >= costoTotal) precio_actual_estado = "bajo_el_piso_por_deducciones";
    else if (precioActual < piso) precio_actual_estado = "bajo_el_piso";
    else if (techo != null && precioActual > techo) precio_actual_estado = "sobre_el_techo";
    /* SIN TECHO NO HAY «RANGO» del que estar dentro. La cascada caía en
       «en_rango» siempre que el precio no superara el presupuesto ni bajara del
       piso, también cuando la baja no tiene base (`sin_referencia`, techo null):
       el panel decía «no tenemos historial suficiente de esta entidad» y, dos
       líneas más abajo, «su precio está dentro del rango recomendado» —una
       validación implícita sobre un dato que no existe, que es justo lo que la
       regla del techo (mínimo 5 adjudicaciones) existe para impedir. */
    else if (techo == null) precio_actual_estado = "sobre_el_piso_sin_referencia";
    else precio_actual_estado = "en_rango";
  }
  const frasePrecioActual = {
    supera_presupuesto: `Su precio actual (${cop(precioActual)}) supera el presupuesto oficial: así no se puede presentar.`,
    bajo_el_piso_por_deducciones: `Su precio actual (${cop(precioActual)}) cubre el costo y su administración, imprevistos y utilidad, pero no la contribución del 5 %${ded != null ? " ni las deducciones de acta" : ""} que le descuentan de cada pago: le faltan ${cop(piso - precioActual)} para no perder plata.`,
    bajo_el_piso: `Su precio actual (${cop(precioActual)}) está por debajo de su mínimo: perdería plata.`,
    sobre_el_techo: `Su precio actual (${cop(precioActual)}) está por encima de lo que suele ganar aquí: baje hasta ${cop(techo)} para tener opción.`,
    sobre_el_piso_sin_referencia: `Su precio actual (${cop(precioActual)}) cubre su mínimo. No hay historial suficiente de esta entidad para decir si es competitivo.`,
    en_rango: `Su precio actual (${cop(precioActual)}) está dentro del rango recomendado.`,
  }[precio_actual_estado] || null;

  return {
    aplicable: true,
    estado,
    veredicto,
    detalle,
    frases,
    cifras,
    precio_actual_estado,
    frase_precio_actual: frasePrecioActual,
    supuestos,
    fuentes,
    minimo_procesos: MIN_PROCESOS_TECHO,
    normativa: {
      precio_artificialmente_bajo: "Decreto 1082 de 2015, art. 2.2.1.1.2.2.4; Guía de Colombia Compra Eficiente para el manejo de ofertas con valor artificialmente bajo.",
      supera_presupuesto: "Rechazo por exceder el presupuesto oficial: causal de los Documentos Tipo (numeral 1.15 del Documento Base) y de los pliegos de las entidades.",
      contribucion: "Contribución especial de obra pública, 5 % (Ley 418 de 1997, art. 120; permanente por Ley 1738 de 2014).",
    },
  };
}

module.exports = { pisoTecho, bajaUtilizable, competenciaUtilizable, fraseBaja, cop, pct, MIN_PROCESOS_TECHO, TEMERARIO_PCT };
