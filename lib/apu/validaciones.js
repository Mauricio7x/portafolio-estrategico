/* ============================================================================
   lib/apu/validaciones · Las cinco puertas de control del presupuesto
   ----------------------------------------------------------------------------
   Corre AL FINAL de `calcularPresupuesto` sobre el presupuesto ya calculado y
   devuelve una lista de hallazgos estructurados. NINGUNO BLOQUEA: un
   presupuesto con una advertencia se exporta igual, porque quien decide es el
   ingeniero y una herramienta que se niega a exportar acaba usándose por fuera
   (R6 — el falso negativo cuesta más que el amarillo). Lo que sí hace es que
   nada de esto se pueda pasar por alto SIN HABERLO VISTO.

   ══════════════ POR QUÉ NO ESTÁN LOS NÚMEROS DEL ENCARGO ════════════════════

   El encargo pide advertir «si Administración > 30 %, Imprevistos < 1 % o
   Utilidad > 10 %». Esas tres cifras YA VIVEN en este repositorio, mejor
   documentadas, en `lib/apu/normativa.AIU`: A 12–20 %, I 3–5 %, U 5–10 %,
   citadas al cap. 11 del Manual del Analista. Escribirlas otra vez aquí sería
   una SEGUNDA FUENTE DE VERDAD de tres números que deciden un precio, que es
   exactamente el defecto que este proyecto ya pagó caro (R2/R3).

   Y no se pierde nada: las bandas del manual son ESTRICTAMENTE MÁS ESTRECHAS
   que los cortes del encargo en los tres casos (A > 20 dispara antes que
   A > 30; I < 3 antes que I < 1; U > 10 es el MISMO corte). Todo lo que el
   encargo quería ver marcado queda marcado, y además queda marcado por una
   cifra que se puede rastrear hasta su fuente.

   Corolario que sí importa: las bandas son INDICATIVAS y `normativa.js` lo dice
   por escrito — el AIU real del contrato Nogal 4 fue 19,17 / 1,50 / 5,33, con
   su «I» POR DEBAJO de la banda. Un contrato adjudicado de verdad dispara esta
   validación. Por eso la severidad máxima aquí es «atención» y jamás «error»:
   pintar en rojo el AIU de un contrato que se ganó sería la herramienta
   contradiciendo a la realidad.

   ═══════ G.4 · LA REGLA DEL ENCARGO QUE NO SE PUEDE CALCULAR ════════════════

   El encargo pide advertir «si hay ítems sin precio (rojos) que representen más
   del 5 % del valor total del presupuesto». Ese porcentaje NO ES COMPUTABLE, y
   no por falta de código: un ítem sin precio no tiene valor POR DEFINICIÓN —es
   lo que significa «sin precio»— así que su participación en el total es
   justamente la cifra que no existe. Calcularla exigiría inventarles un precio,
   que es lo único que este módulo tiene prohibido (R1).

   Lo que se hace en su lugar, DECLARÁNDOLO: el umbral del 5 % se aplica a la
   participación por NÚMERO DE ÍTEMS, y el hallazgo dice con todas las letras
   que es una proporción de ítems y no de dinero, y que el dinero que falta es
   desconocido. Un umbral honesto sobre una cifra que existe vale más que un
   porcentaje exacto sobre una que no.
   ========================================================================== */
"use strict";

/* Severidades. `error` NO existe a propósito: ninguna de estas validaciones
   puede impedir exportar, así que un nivel que sugiera «esto no se puede
   entregar» mentiría sobre lo que el programa va a hacer a continuación. */
const SEVERIDADES = ["aviso", "atencion"];

/* Participación de ítems SIN PRECIO por encima de la cual se avisa. Es el 5 %
   del encargo, aplicado a la base que sí se puede medir (ver cabecera). */
const UMBRAL_SIN_PRECIO_PCT = 5;

const red2 = (n) => (Number.isFinite(n) ? Math.round((n + Number.EPSILON) * 100) / 100 : null);

const pesos = (n) => (Number.isFinite(n) ? `$${Math.round(n).toLocaleString("es-CO")}` : "—");

function hallazgo(codigo, severidad, titulo, mensaje, datos = {}) {
  return {
    codigo,
    severidad: SEVERIDADES.includes(severidad) ? severidad : "aviso",
    titulo,
    mensaje,
    ...datos,
  };
}

/* ── G.1 · AIU dentro de las bandas documentadas ─────────────────────────────
   Las bandas se IMPORTAN de `lib/apu/normativa` (R2). El require va DIFERIDO
   por la misma razón que allí: `normativa` importa las tarifas de `calculo` y
   `calculo` importa este módulo — cargarlo arriba cerraría el ciclo (R5). */
function validarAiu(cfg = {}) {
  const { AIU } = require("./normativa.js");
  const fuera = [];
  const pares = [
    ["administracion", Number(cfg.aiu_pct), "Administración (A)"],
    ["imprevistos", Number(cfg.imprevistos_pct), "Imprevistos (I)"],
    ["utilidad", Number(cfg.utilidad_pct), "Utilidad (U)"],
  ];
  for (const [clave, valor, rotulo] of pares) {
    const banda = AIU[clave] && AIU[clave].banda;
    if (!banda || !Number.isFinite(valor)) continue;
    if (valor < banda.min || valor > banda.max) {
      fuera.push({
        componente: clave,
        rotulo,
        valor,
        banda: { min: banda.min, max: banda.max },
        lado: valor < banda.min ? "por_debajo" : "por_encima",
      });
    }
  }
  if (!fuera.length) return null;

  const detalle = fuera
    .map((f) => `${f.rotulo} en ${f.valor} % (banda típica ${f.banda.min}–${f.banda.max} %)`)
    .join("; ");
  return hallazgo(
    "aiu_fuera_de_banda", "aviso",
    "AIU fuera de la banda típica",
    `${detalle}. Las bandas del cap. 11 del Manual del Analista son INDICATIVAS, no una regla: `
      + "el AIU real del contrato Nogal 4 (adjudicado) fue 19,17 / 1,50 / 5,33, con su «I» por debajo de la banda. "
      + "Verifique que el pliego no fije el AIU y que la oferta lo pueda sostener.",
    { componentes: fuera },
  );
}

/* ── G.2 · el factor prestacional aplicado contiene lo que la ley exige ──────
   No se reimplementa ningún componente: se llama a `desglosePrestacional`, que
   ya publica la suma NOMINAL de las 10 tasas y la suma EXONERADA, y se exige el
   ENCIERRO —la misma comprobación que ata el catálogo en la suite—. Un factor
   por DEBAJO de la suma exonerada no cubre ni las prestaciones que ninguna
   exoneración toca: eso sí es un jornal mal costeado. */
function validarPrestacional(factorAplicado) {
  const { desglosePrestacional } = require("./normativa.js");
  const d = desglosePrestacional(factorAplicado);
  if (d.aplicado_pct == null) {
    return hallazgo(
      "prestacional_sin_dato", "aviso",
      "Sin factor prestacional",
      "No se resolvió la región, así que no hay factor prestacional contra el que contrastar el desglose de ley. "
        + "La mano de obra se costeó con lo que trajera el catálogo, y eso no se pudo verificar.",
      { aplicado_pct: null },
    );
  }
  if (d.dentro_de_banda) return null;

  const porDebajo = d.aplicado_pct < d.suma_exonerada_pct;
  return hallazgo(
    "prestacional_fuera_de_banda", porDebajo ? "atencion" : "aviso",
    "Factor prestacional fuera de las cotas de ley",
    `El catálogo aplica ${d.aplicado_pct} % sobre el jornal. `
      + (porDebajo
        ? `Está POR DEBAJO del ${d.suma_exonerada_pct} % que suman las prestaciones que NINGUNA exoneración cubre `
          + "(cesantías, prima, vacaciones, intereses y ARL): con este factor el jornal no paga la nómina."
        : `Está POR ENCIMA del ${d.suma_nominal_pct} % que suman las 10 tasas nominales de ley: `
          + "el jornal lleva un recargo que el desglose no explica.")
      + " Vea el detalle componente por componente en «Normativa aplicada».",
    {
      aplicado_pct: d.aplicado_pct,
      suma_nominal_pct: d.suma_nominal_pct,
      suma_exonerada_pct: d.suma_exonerada_pct,
    },
  );
}

/* ── G.3 · cantidades ────────────────────────────────────────────────────────
   Cero y negativo son DOS defectos distintos y se cuentan aparte: una cantidad
   en 0 es casi siempre un ítem que se añadió y no se llenó (no cuesta nada y no
   suma), mientras que una negativa produce un total NEGATIVO que resta del
   presupuesto sin que nadie lo note. */
function validarCantidades(items = []) {
  const cero = [];
  const ilegible = [];
  const negativa = [];
  for (const it of items) {
    const c = Number(it.cantidad);
    const nombre = it.descripcion || it.item_id || it.codigo || "(sin descripción)";
    /* Cantidad ILEGIBLE y cantidad CERO se separan: un 0 es una decisión («este
       ítem no se ejecuta») y un valor que no es número es una AUSENCIA. Meterlos
       en la misma cubeta diría «está en cantidad 0» sobre algo que no se pudo
       leer, que es la ausencia disfrazada de cero (R1). Desde el motor esto no
       se cruza —`calcularItem` normaliza la cantidad a número— pero la función
       es pública y quien la llame directo merece la verdad. */
    /* `cantidad_ilegible` la estampa `calcularItem` cuando la entrada no era un
       número: el motor normaliza la cantidad a 0 para poder calcular, así que
       sin esa marca una celda «SEGÚN PLANOS» llegaba aquí indistinguible de un
       cero deliberado y se contaba en la cubeta equivocada. */
    if (!Number.isFinite(c) || it.cantidad_ilegible === true) ilegible.push(nombre);
    else if (c === 0) cero.push(nombre);
    else if (c < 0) negativa.push(nombre);
  }
  const muestra = (lista) => lista.slice(0, 3).map((n) => `«${String(n).slice(0, 60)}»`).join(", ")
    + (lista.length > 3 ? `, y ${lista.length - 3} más` : "");

  const salida = [];
  if (negativa.length) {
    salida.push(hallazgo(
      "cantidad_negativa", "atencion",
      "Cantidades negativas",
      `${negativa.length} ítem(s) tienen cantidad NEGATIVA, así que RESTAN del presupuesto: ${muestra(negativa)}. `
        + "Un total que baja al añadir obra es un error de digitación, no un descuento.",
      { items: negativa.slice(0, 20), total: negativa.length },
    ));
  }
  if (ilegible.length) {
    salida.push(hallazgo(
      "cantidad_ilegible", "atencion",
      "Cantidades que no son un número",
      `${ilegible.length} ítem(s) traen una cantidad que no se pudo leer: ${muestra(ilegible)}. `
        + "No es una cantidad de cero: es una cantidad DESCONOCIDA, y hasta que se escriba "
        + "el total no incluye esa obra.",
      { items: ilegible.slice(0, 20), total: ilegible.length },
    ));
  }
  if (cero.length) {
    salida.push(hallazgo(
      "cantidad_cero", "aviso",
      "Ítems sin cantidad",
      `${cero.length} ítem(s) están en cantidad 0 y por tanto no aportan nada al total: ${muestra(cero)}. `
        + "Si el pliego los pide, la oferta quedaría incompleta; si no, sobran en la lista.",
      { items: cero.slice(0, 20), total: cero.length },
    ));
  }
  return salida;
}

/* ── G.4 · ítems sin precio ──────────────────────────────────────────────────
   Ver la cabecera: la participación se mide en ÍTEMS, no en pesos, y el
   hallazgo lo dice. `valor_faltante` viaja explícitamente en `null` —jamás en
   0— porque es desconocido, y un 0 ahí significaría «no falta dinero», que es
   lo contrario de lo que pasa (R1). */
function validarSinPrecio(items = []) {
  const sin = items.filter((i) => i.incompleto);
  if (!sin.length) return null;
  const pct = red2((sin.length / Math.max(items.length, 1)) * 100);
  const grave = pct > UMBRAL_SIN_PRECIO_PCT;

  return hallazgo(
    "items_sin_precio", grave ? "atencion" : "aviso",
    grave ? "Buena parte del presupuesto no tiene precio" : "Hay ítems sin precio",
    `${sin.length} de ${items.length} ítem(s) (${pct} %) no tienen precio: no suman al total y en el Excel `
      + "salen en ROJO con las celdas de valor VACÍAS. "
      + (grave
        ? `Por encima del ${UMBRAL_SIN_PRECIO_PCT} % el total deja de ser una oferta y pasa a ser un cálculo `
          + "parcial: cotícelos antes de presentar. "
        : "")
      + "El porcentaje es de ÍTEMS, no de dinero: cuánto valen es justamente lo que no se sabe, "
      + "así que el total de abajo es una COTA INFERIOR del presupuesto real.",
    {
      items_sin_precio: sin.length,
      items_totales: items.length,
      participacion_items_pct: pct,
      umbral_pct: UMBRAL_SIN_PRECIO_PCT,
      // no es 0: es desconocido, y la diferencia es el módulo entero
      valor_faltante: null,
      base_de_la_medida: "items",
    },
  );
}

/* ── G.5 · el total contra la cuantía del proceso ────────────────────────────
   La comparación es contra el PRECIO FINAL (lo que se ofertaría), no contra el
   costo directo. Y se hace SOLO si llega la cuantía: sin ella no hay nada que
   comparar y el hallazgo no aparece — no se inventa un techo. */
function validarContraCuantia(cuantia, resumen = {}, hayItemsSinPrecio = false) {
  const techo = Number(cuantia);
  if (!Number.isFinite(techo) || techo <= 0) return null;
  const precio = Number(resumen.precio_final);
  if (!Number.isFinite(precio) || precio <= 0) return null;
  if (precio <= techo) return null;

  const exceso = red2(precio - techo);
  const excesoPct = red2((exceso / techo) * 100);
  return hallazgo(
    "excede_la_cuantia", "atencion",
    "La oferta supera el presupuesto oficial",
    `El precio final (${pesos(precio)}) está ${excesoPct} % por encima de la cuantía del proceso `
      + `(${pesos(techo)}): son ${pesos(exceso)} de más. Una oferta por encima del presupuesto oficial se `
      + "RECHAZA, no se negocia. Baje el AIU, revise cantidades o no se presente."
      + (hayItemsSinPrecio
        ? " Y ojo: hay ítems sin precio, así que el exceso real es todavía mayor que este."
        : ""),
    { cuantia_cop: techo, precio_final: precio, exceso_cop: exceso, exceso_pct: excesoPct },
  );
}

/* ═══════════════════════════════ entrada única ═════════════════════════════
   Devuelve `{hallazgos, mensajes, resumen}`. `mensajes` son las mismas
   advertencias en texto plano, para el array `alertas` que YA leen el frontend
   y el exportador: estrenar un canal nuevo y dejar el viejo sin estos avisos los
   escondería justo en las dos superficies donde se miran (R11 — quien LEE
   manda, y hoy quien lee es `alertas`). */
function validarPresupuesto({
  items = [], resumen = {}, configuracion = {}, prestacional = null, cuantia_cop = null,
} = {}) {
  const hallazgos = [];

  const aiu = validarAiu(configuracion);
  if (aiu) hallazgos.push(aiu);

  const prest = validarPrestacional(prestacional);
  if (prest) hallazgos.push(prest);

  hallazgos.push(...validarCantidades(items));

  const sinPrecio = validarSinPrecio(items);
  if (sinPrecio) hallazgos.push(sinPrecio);

  const cuantia = validarContraCuantia(cuantia_cop, resumen, !!sinPrecio);
  if (cuantia) hallazgos.push(cuantia);

  return {
    hallazgos,
    mensajes: hallazgos.map((h) => `${h.severidad === "atencion" ? "⚠️" : "•"} ${h.titulo}: ${h.mensaje}`),
    resumen: {
      total: hallazgos.length,
      atencion: hallazgos.filter((h) => h.severidad === "atencion").length,
      aviso: hallazgos.filter((h) => h.severidad === "aviso").length,
      /* Ninguna validación bloquea. Se publica como booleano y no como frase
         para que el frontend no pueda «interpretarlo» de otra manera. */
      bloquea_exportacion: false,
    },
  };
}

module.exports = {
  validarPresupuesto,
  validarAiu, validarPrestacional, validarCantidades, validarSinPrecio, validarContraCuantia,
  SEVERIDADES, UMBRAL_SIN_PRECIO_PCT,
};
