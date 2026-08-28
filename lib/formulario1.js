/* lib/formulario1.js · Guardián del Formulario 1 (Fase 4 del plan v3)
   ─────────────────────────────────────────────────────────────────────────────
   Que el usuario nunca pierda una licitación que ya ganó por un error de
   formato. Recibe la OFERTA del usuario (los ítems de su APU con precio
   unitario y total, su AIU y su total), el FORMULARIO 1 del pliego (los ítems
   que leyó el lector: numeral, descripción, unidad, cantidad), el presupuesto
   oficial y —opcionales— el tope de AIU del pliego y lo que escribió en SECOP
   II, y devuelve un SEMÁFORO con frases, no una lista de errores técnicos.

   Las OCHO validaciones, con su fundamento (viaja en cada veredicto):
     1 · total > presupuesto oficial                    → RECHAZO · insubsanable
     2 · ítems añadidos, suprimidos o modificados       → RECHAZO · «causal O» =
         (descripción, unidad, cantidad) del Formulario 1  motivo de rechazo automático
                                                          (Documento Base num. 1.15;
                                                          Concepto CCE C-549 de 2022)
     3 · lo escrito en SECOP II ≠ el anexo               → RECHAZO · insubsanable
     4 · AIU sin discriminar o por encima del tope       → RECHAZO · Documento Base num. 4.1
     5 · precio por debajo del umbral de baja temeraria  → ALERTA + justificación
                                                          (D. 1082/2015 art. 2.2.1.1.2.2.4)
     6 · error aritmético (cantidad × unitario ≠ total)  → INFORMATIVO · la entidad
                                                          lo corrige (Ley 1882/2018)
     7 · ajuste por redondeo de decimales                → INFORMATIVO · ídem
     8 · su precio unitario contra el del pliego         → ALERTA · el precio lo
                                                          pone el oferente; se
                                                          avisa y se ordena por
                                                          PLATA EN JUEGO

   Reglas que no hay que re-aprender:
   · La 3 y la 4 (tope) SOLO se evalúan si llegan los datos (`secop`,
     `tope_aiu_pct`); sin ellos el veredicto es «sin_referencia» y dice qué hace
     falta — no se afirma «cumple» sobre lo que no se miró.
   · La comparación de ítems casa por NUMERAL normalizado; sin numeral, por
     descripción normalizada. Modificación = descripción, unidad canónica o
     cantidad distintas (la unidad se canoniza con lib/apu_pliego: «M2» y «m²»
     son la misma). Sin formulario del pliego la 2 queda «sin_referencia»: no
     hay contra qué comparar.
   · La 6 y la 7 se separan por la TOLERANCIA de fila de lib/apu_pliego
     (`max(cantidad/2 + 1, $1)`, la del redondeo al peso): dentro de la
     tolerancia es redondeo (7); fuera, error aritmético (6). Ninguna de las
     dos rechaza: la Ley 1882 manda a la entidad a corregir.
   · La 5 usa el umbral TEMERARIO de lib/apu/piso_techo (80 % del presupuesto,
     referencia declarada) y NO decide por el usuario: alerta y ofrece la
     justificación, que se genera desde el APU propio (public/justificacion.js).
   · El semáforo es la peor severidad presente: rechazo → «Revise antes de
     subir», alerta → «Precaución», nada → «Su oferta está lista para presentar».
     Un «sin_referencia» no cambia el color: se lista aparte como pendiente.
   · Ninguna frase usa jerga: «causal O» se escribe «motivo de rechazo
     automático» (hay prueba).
   · La 8 NO rechaza y no inventa umbral: reutiliza el TEMERARIO de la 5. Ordena
     por PLATA EN JUEGO (|desvío| × cantidad DEL PLIEGO), no por porcentaje — un
     −84 % en un ítem de $2.500 pesa menos que un +23 % en 420 m³. Sus dos
     lecturas no son simétricas y el fundamento lo dice: por debajo el riesgo son
     las mayores cantidades (y SOLO a precios unitarios); por encima se manda a
     verificar el Documento Base, sin afirmar la norma. */
"use strict";

const { unidadCanonica, toleranciaFila } = require("./apu_pliego.js");
const { TEMERARIO_PCT } = require("./apu/piso_techo.js");
const { norm } = require("./semantica.js");

const NIVELES = Object.freeze({ rechazo: 3, alerta: 2, informativo: 1, ok: 0, sin_referencia: 0 });
const cop = (n) => `$${Math.round(Number(n) || 0).toLocaleString("es-CO")}`;
const num = (v) => { if (v == null || v === "") return null; const n = Number(v); return Number.isFinite(n) ? n : null; };
const pct = (v) => (v == null ? "—" : `${Number(v).toLocaleString("es-CO", { maximumFractionDigits: 2 })} %`);

const FUNDAMENTO = Object.freeze({
  presupuesto: "Insubsanable: una oferta por encima del presupuesto oficial se rechaza sin posibilidad de corrección.",
  items: "Motivo de rechazo automático (Documento Base de obra pública, numeral 1.15; Concepto C-549 de 2022 de Colombia Compra Eficiente): el Formulario 1 es inalterable — no se pueden añadir, quitar ni modificar ítems, descripciones, unidades ni cantidades.",
  secop: "Insubsanable: la lista de precios cargada en la plataforma SECOP II debe coincidir exactamente con el anexo; si difieren, la oferta se rechaza.",
  aiu: "Documento Base de obra pública, numeral 4.1: el AIU debe estar discriminado (administración, imprevistos y utilidad) y no puede superar el tope que fija la entidad.",
  temeraria: "Decreto 1082 de 2015, art. 2.2.1.1.2.2.4: si el precio parece artificialmente bajo la entidad debe pedir explicaciones; sin una justificación sólida puede rechazar la oferta.",
  aritmetico: "Ley 1882 de 2018: los errores puramente aritméticos los corrige la entidad; no son causal de rechazo.",
  redondeo: "Ley 1882 de 2018: los ajustes por redondeo de decimales los corrige la entidad; no son causal de rechazo.",
  /* Las dos direcciones NO son simétricas, y la asimetría está verificada
     (docs/COMPLEMENTO_ANALISTA_LICITACIONES §V-03, Consejo de Estado): en un
     contrato a PRECIOS UNITARIOS las cantidades del pliego son un estimativo y
     las mayores cantidades ordenadas DEBEN reconocerse, así que un ítem por
     debajo del oficial se paga caro en cada unidad de más; en PRECIO GLOBAL «en
     principio no se reconocen» y el riesgo de cantidades es del contratista.
     Por encima se MANDA A VERIFICAR y no se afirma la norma: que un pliego fije
     precios unitarios máximos cuya superación sea causal de rechazo depende del
     Documento Base de cada proceso, y eso no se pudo contrastar. */
  unitarios: "Ofertar a un precio distinto del que estimó la entidad no es motivo de rechazo por sí solo: el precio lo pone el oferente. "
    + "Pero la lectura cambia según cómo se pague el contrato (Consejo de Estado, precio global frente a precios unitarios): "
    + "a PRECIOS UNITARIOS las cantidades del pliego son un estimativo y las mayores cantidades ordenadas deben reconocerse, "
    + "así que un ítem por debajo del oficial pierde plata en cada unidad de más; a PRECIO GLOBAL, en principio no se reconocen. "
    + "Por encima: en los Documentos Tipo de obra pública de infraestructura de transporte (versión 4, Resolución 465 de 2024, "
    + "Documento Base CCE-EICP-GI-01) EXISTE una causal de rechazo por superar el valor unitario oficial, y para esa comparación "
    + "el valor unitario del Formulario 1 se entiende CON AIU. Es FACULTATIVA —la entidad decide si la activa y sobre qué ítems— "
    + "y solo aplica si la forma de pago es por precios unitarios, así que hay que leerla EN EL DOCUMENTO BASE del proceso. "
    + "Búsquela por su TEXTO y no por su letra: en pliegos mal diligenciados aparece corrida.",
});

const claveNumeral = (n) => String(n ?? "").trim().replace(/\.$/, "").replace(/\s+/g, "").toLowerCase();
const claveDescripcion = (d) => norm(String(d ?? "")).replace(/[^a-z0-9ñ ]+/g, " ").replace(/\s+/g, " ").trim();
const unidadDe = (u) => unidadCanonica(String(u ?? "")) || norm(String(u ?? "")).replace(/\s+/g, "");
const cantidadesIguales = (a, b) => (a == null && b == null) || (a != null && b != null && Math.abs(Number(a) - Number(b)) < 1e-6);

/* Normaliza una lista de ítems de cualquiera de las dos fuentes (editor o
   lector) a {numeral, descripcion, unidad, cantidad, precio_unitario, total}. */
function normalizarItems(items) {
  return (Array.isArray(items) ? items : []).map((it, i) => ({
    indice: i,
    numeral: it.numeral != null && String(it.numeral).trim() !== "" ? String(it.numeral).trim() : (it.item != null ? String(it.item).trim() : null),
    descripcion: String(it.descripcion ?? it.descripcion_original ?? "").trim(),
    unidad: String(it.unidad ?? "").trim(),
    cantidad: num(it.cantidad),
    precio_unitario: num(it.precio_unitario ?? it.unitario ?? it.unitario_oficial),
    total: num(it.total ?? it.total_oficial ?? it.costo_total),
    /* página del PDF de la que salió la fila (solo los ítems del lector la
       traen; null si no se sabe): así una supresión o modificación se cita */
    pagina: Number.isFinite(Number(it.pagina)) && it.pagina != null ? Number(it.pagina) : null,
  }));
}

/* ═══ EN QUÉ BASE VIENE CADA LADO · lo que hacía falsa la validación 8 ═══════
   Los dos lados de la comparación NO estaban en la misma base y nadie lo decía:
   · el lado OFERTA llega CON AIU — `public/app.js:ofertaParaRevision` escala el
     costo directo unitario por `precio_final / costo_directo_total`;
   · el lado PLIEGO es COSTO DIRECTO — la convención del lector, que solo da
     `documento.estado="cuadra"` cuando Σ total_oficial ≈ precio_base/(1+AIU).
   MEDIDO: un contratista que cuesta EXACTAMENTE lo que estimó la entidad salía
   con TODOS sus ítems «+25 % por encima» y la alerta de «puede costar el
   proceso» — en la misma respuesta en que la validación 1 decía que su total
   coincide AL PESO con el presupuesto oficial. Dos afirmaciones incompatibles
   en la misma pantalla. Y al revés: con una baja del 20 % (el oferente regala
   el AIU entero) el desvío daba 0 % y respondía «sus precios están cerca de los
   que estimó la entidad», callándose justo cuando debía gritar. El sesgo vale
   exactamente (AIU − baja) puntos, y con la banda del manual (A 12-20 · I 3-5 ·
   U 5-10) cruza el umbral del 20 % en casi toda ella.

   La base canónica es CON AIU: es la del valor unitario del Formulario 1 que se
   oferta. El lado del pliego se sube a esa base con el AIU que declara EL
   PLIEGO —no el de la oferta: es lo que la entidad estimó facturar—.

   SIN DECLARACIÓN SE ASUME LA MISMA BASE, y no es una concesión: un llamador
   que construye los dos lados a mano los construye coherentes, y es lo que
   hacen las pruebas que ya fijaban este contrato. Quien SÍ distingue es el
   editor, y por eso declara. Lo que no se hace nunca es comparar dos bases
   distintas sin poder convertirlas: eso responde `sin_referencia` con su motivo.
   La base usada viaja SIEMPRE: una cifra sin su base no se puede discutir. */
const BASES = Object.freeze(["con_aiu", "costo_directo"]);
function normalizacionDePrecios(opciones) {
  const o = opciones || {};
  const baseOferta = BASES.includes(o.base_oferta) ? o.base_oferta : null;
  const basePliego = BASES.includes(o.base_pliego) ? o.base_pliego : null;
  const aiu = num(o.aiu_pliego_pct);
  if (baseOferta == null || basePliego == null) {
    return { comparable: true, factor_pliego: 1, base: "asumida", declarada: false,
      nota: "Ninguno de los dos lados declaró su base de precio: se comparan tal cual, asumiendo que están en la misma." };
  }
  if (baseOferta === basePliego) {
    return { comparable: true, factor_pliego: 1, base: baseOferta, declarada: true, nota: null };
  }
  /* Bases distintas: hace falta el AIU del pliego para convertir. Sin él NO se
     compara — un desvío entre dos bases distintas es una cifra inventada. */
  if (aiu == null || !(aiu > 0)) {
    return { comparable: false, factor_pliego: null, base: null, declarada: true,
      motivo: `Sus precios vienen ${baseOferta === "con_aiu" ? "CON AIU" : "en costo directo"} y los del pliego ${basePliego === "con_aiu" ? "CON AIU" : "en costo directo"}, y el pliego no declara su AIU: compararlos daría un desvío que no significa nada. Cargue el AIU del pliego para poder contrastarlos.` };
  }
  /* Se sube el PLIEGO a «con AIU» o se baja, según dónde esté la oferta. */
  const f = basePliego === "costo_directo" ? 1 + aiu / 100 : 1 / (1 + aiu / 100);
  return { comparable: true, factor_pliego: f, base: baseOferta, declarada: true,
    aiu_pliego_pct: aiu,
    nota: `Los precios del pliego vienen en costo directo y los suyos con AIU: para compararlos se les aplicó el AIU que declara el pliego (${aiu} %).` };
}

/* Compara los ítems de la OFERTA con los del FORMULARIO 1 del pliego. */
function compararItems(oferta, formulario, opciones) {
  const o = normalizarItems(oferta), f = normalizarItems(formulario);
  const base = normalizacionDePrecios(opciones);
  const claveDe = (it) => (it.numeral ? `n:${claveNumeral(it.numeral)}` : `d:${claveDescripcion(it.descripcion)}`);
  const porClaveF = new Map(f.map((it) => [claveDe(it), it]));
  const porDescF = new Map(f.map((it) => [claveDescripcion(it.descripcion), it]));
  const usados = new Set();
  const adiciones = [], modificaciones = [], paresPrecio = [];
  const sinLeerDelPliego = [];
  for (const it of o) {
    let ref = porClaveF.get(claveDe(it));
    if (!ref && it.numeral) ref = porDescF.get(claveDescripcion(it.descripcion)); // numeral distinto pero misma descripción
    if (!ref || usados.has(ref)) { adiciones.push(it); continue; }
    usados.add(ref);
    const cambios = [];
    /* LO QUE EL LECTOR NO PUDO LEER NO ES UNA MODIFICACIÓN (ago 2026). Una
       cantidad `null` significa «no se pudo leer del pliego» —el propio
       extractor avisa «viajan en null, nunca en 0»— y se estaba tratando como un
       valor DISTINTO: el guardián denunciaba «1 ítem con la cantidad distinta a
       la del pliego» y lo declaraba motivo de rechazo automático. El riesgo real
       no es el susto: es que el oferente CAMBIE su cantidad correcta para cuadrar
       con una que nadie leyó. Va a una lista aparte que no cambia el color y
       manda a confirmar contra el PDF, que es lo que las validaciones 3 y 4 ya
       hacen con `sin_referencia`. */
    const noComparables = [];
    if (claveDescripcion(it.descripcion) !== claveDescripcion(ref.descripcion)) cambios.push({ campo: "descripcion", antes: ref.descripcion, despues: it.descripcion });
    if (!ref.unidad) noComparables.push("unidad");
    else if (unidadDe(it.unidad) !== unidadDe(ref.unidad)) cambios.push({ campo: "unidad", antes: ref.unidad, despues: it.unidad });
    if (ref.cantidad == null) noComparables.push("cantidad");
    else if (!cantidadesIguales(it.cantidad, ref.cantidad)) cambios.push({ campo: "cantidad", antes: ref.cantidad, despues: it.cantidad });
    if (noComparables.length) {
      sinLeerDelPliego.push({
        numeral: ref.numeral || it.numeral, descripcion: ref.descripcion, pagina: ref.pagina,
        campos: noComparables,
        nota: `No se pudo leer del pliego ${noComparables.join(" ni ")} de este ítem: confírmelo contra el PDF. No se compara con su oferta.`,
      });
    }
    if (cambios.length) modificaciones.push({ numeral: ref.numeral || it.numeral, descripcion: ref.descripcion, pagina: ref.pagina, cambios });
    if (base.comparable && it.precio_unitario != null && ref.precio_unitario != null && ref.precio_unitario > 0) {
      /* el unitario del pliego, LLEVADO a la base de la oferta */
      const refUnit = base.factor_pliego === 1 ? ref.precio_unitario
        : Math.round(ref.precio_unitario * base.factor_pliego);
      /* la cantidad con la que se pesa el desvío es la DEL PLIEGO: es la que la
         entidad va a pagar, y si la de la oferta difiere eso ya lo denuncia la
         validación 2 como modificación del Formulario 1. */
      const cant = ref.cantidad != null ? ref.cantidad : it.cantidad;
      const dif = it.precio_unitario - refUnit;
      paresPrecio.push({
        numeral: ref.numeral || it.numeral, descripcion: ref.descripcion, pagina: ref.pagina,
        cantidad: cant, unitario_pliego: refUnit, unitario_oferta: it.precio_unitario,
        /* el literal del pliego viaja al lado del convertido: sin él no se puede
           auditar la conversión que se acaba de aplicar */
        unitario_pliego_literal: ref.precio_unitario,
        desvio_pct: Math.round((dif / refUnit) * 1000) / 10,
        direccion: dif > 0 ? "por_encima" : dif < 0 ? "por_debajo" : "igual",
        // lo que de verdad decide la atención: pesos, no porcentaje
        plata_en_juego_cop: cant == null ? null : Math.round(Math.abs(dif) * cant),
      });
    }
  }
  const supresiones = f.filter((it) => !usados.has(it));
  return {
    adiciones, supresiones, modificaciones,
    /* A2 · los pares (oferta, pliego) con AMBOS unitarios: el casado ya lo hizo
       el bucle de arriba, y rehacerlo en la validación 8 sería una segunda
       definición de «este ítem de la oferta es este del pliego». Solo entran los
       que tienen las dos cifras: sin una de ellas no hay comparación, y un 0 del
       pliego es «no lo publica», no «cuesta cero». */
    precios: paresPrecio,
    /* la base en la que se compararon los precios, SIEMPRE: una cifra sin su
       base no se puede discutir (y sin ella el sesgo de 25 puntos era invisible) */
    base_comparacion: base,
    // ítems cuyo dato del PLIEGO no se pudo leer: ni cuadran ni discrepan
    sin_leer_del_pliego: sinLeerDelPliego,
    coinciden: o.length - adiciones.length - modificaciones.length,
    total_oferta: o.length, total_formulario: f.length,
  };
}

/* Las OCHO validaciones (la 8 la añadió A2: el precio unitario del pliego ya
   llegaba normalizado a `ref.precio_unitario` y nadie lo miraba). */
function validarFormulario1(entrada = {}) {
  const oferta = entrada.oferta || {};
  const items = normalizarItems(oferta.items);
  const totalOferta = num(oferta.total) ?? (items.every((i) => i.total != null) && items.length ? items.reduce((a, i) => a + i.total, 0) : null);
  const presupuesto = num(entrada.presupuesto_oficial);
  const veredictos = [];
  const v = (id, nivel, titulo, mensaje, fundamento, extra = {}) => veredictos.push({ id, nivel, titulo, mensaje, fundamento, ...extra });

  /* 1 · total vs presupuesto */
  if (presupuesto == null || presupuesto <= 0) v("presupuesto", "sin_referencia", "Presupuesto oficial", "No hay presupuesto oficial contra el cual comparar el total: cargue la cuantía del proceso.", FUNDAMENTO.presupuesto);
  else if (totalOferta == null) v("presupuesto", "sin_referencia", "Total de la oferta", "No hay total de la oferta: calcule el APU antes de revisar.", FUNDAMENTO.presupuesto);
  else if (totalOferta > presupuesto + 0.5) v("presupuesto", "rechazo", "Su precio supera el presupuesto", `Su precio total (${cop(totalOferta)}) supera el presupuesto de la entidad (${cop(presupuesto)}) por ${cop(totalOferta - presupuesto)}. Esto es motivo de rechazo automático.`, FUNDAMENTO.presupuesto, { exceso: Math.round(totalOferta - presupuesto) });
  else v("presupuesto", "ok", "Presupuesto", `Su precio total (${cop(totalOferta)}) está dentro del presupuesto oficial (${cop(presupuesto)}).`, FUNDAMENTO.presupuesto);

  /* 2 · ítems del Formulario 1 */
  let comparacion = null;
  if (!Array.isArray(entrada.formulario && entrada.formulario.items) || !entrada.formulario.items.length) {
    v("items", "sin_referencia", "Ítems del Formulario 1", "No hay Formulario 1 del pliego contra el cual comparar: léalo con el lector de pliegos (pestaña Precios) y vuelva a revisar.", FUNDAMENTO.items);
  } else {
    comparacion = compararItems(items, entrada.formulario.items, {
      /* CADA LADO DECLARA SU BASE. La del pliego la sabe el lector (sus
         unitarios son costo directo y el AIU va aparte); la de la oferta la sabe
         el editor, que acaba de escalar por precio_final/costo_directo. */
      base_oferta: entrada.oferta && entrada.oferta.base_precio,
      base_pliego: entrada.formulario.base_precio,
      aiu_pliego_pct: entrada.formulario.aiu_total_pct,
    });
    const partes = [];
    if (comparacion.supresiones.length) partes.push(`faltan ${comparacion.supresiones.length} ítem${comparacion.supresiones.length === 1 ? "" : "s"} del pliego (${comparacion.supresiones.slice(0, 3).map((s) => (s.numeral || s.descripcion.slice(0, 40)) + (s.pagina != null ? ` (pág. ${s.pagina})` : "")).join(", ")}${comparacion.supresiones.length > 3 ? "…" : ""})`);
    if (comparacion.adiciones.length) partes.push(`hay ${comparacion.adiciones.length} ítem${comparacion.adiciones.length === 1 ? "" : "s"} que no están en el pliego (${comparacion.adiciones.slice(0, 3).map((s) => s.numeral || s.descripcion.slice(0, 40)).join(", ")}${comparacion.adiciones.length > 3 ? "…" : ""})`);
    if (comparacion.modificaciones.length) {
      const campos = [...new Set(comparacion.modificaciones.flatMap((m) => m.cambios.map((c) => ({ descripcion: "la descripción", unidad: "la unidad", cantidad: "la cantidad" }[c.campo]))))];
      partes.push(`${comparacion.modificaciones.length} ítem${comparacion.modificaciones.length === 1 ? "" : "s"} con ${campos.join(", ")} distinta${campos.length === 1 ? "" : "s"} a la del pliego (${comparacion.modificaciones.slice(0, 3).map((m) => (m.numeral || m.descripcion.slice(0, 40)) + (m.pagina != null ? ` (pág. ${m.pagina})` : "")).join(", ")}${comparacion.modificaciones.length > 3 ? "…" : ""})`);
    }
    if (partes.length) v("items", "rechazo", "El Formulario 1 no coincide con el pliego", `${partes.join("; ")}. El Formulario 1 no se puede tocar: esto es motivo de rechazo automático.`, FUNDAMENTO.items);
    else v("items", "ok", "Formulario 1", `Los ${comparacion.total_formulario} ítems coinciden con el pliego en descripción, unidad y cantidad.`, FUNDAMENTO.items);
  }

  /* 3 · lo escrito en SECOP II */
  const secop = entrada.secop || null;
  if (!secop || (num(secop.total) == null && !(Array.isArray(secop.items) && secop.items.length))) {
    v("secop", "sin_referencia", "Lo escrito en SECOP II", "No se pudo comparar con lo que escribió en SECOP II: pegue el total (y, si puede, los precios por ítem) tal como quedaron en la plataforma.", FUNDAMENTO.secop);
  } else {
    const dif = [];
    if (num(secop.total) != null && totalOferta != null && Math.abs(num(secop.total) - totalOferta) > 0.5) dif.push(`el total en SECOP II (${cop(secop.total)}) no es el del anexo (${cop(totalOferta)})`);
    if (Array.isArray(secop.items) && secop.items.length) {
      const sItems = normalizarItems(secop.items);
      const porNum = new Map(items.map((i) => [claveNumeral(i.numeral || i.indice), i]));
      /* ⚠️ EL PAR SE HACE numeral → DESCRIPCIÓN → posición (27-ago-2026). El
         respaldo posicional a secas bendecía precios INTERCAMBIADOS entre
         ítems —con SECOP en otro orden y los precios cruzados, cada par
         posicional «cuadraba» y salía «coincide con el anexo», un falso OK en
         la única validación insubsanable— y rechazaba el mismo contenido solo
         REORDENADO. La posición solo vale cuando la descripción no la
         desmiente (o cuando SECOP llegó sin descripciones, que es el pegado de
         solo-precios y ahí la posición es la única señal). */
      /* Una descripción DUPLICADA en el anexo (dos capítulos con el mismo ítem,
         corriente en pliegos) no puede entrar al mapa: el `Map` pisaría la
         primera con la última y el contenido IDÉNTICO en otro capítulo saldría
         «difiere» — un rechazo fabricado en la validación insubsanable (lo
         cazó la revisión adversaria del propio arreglo). Las duplicadas caen
         al posicional, que ahí es la única regla sana. */
      const vistasDesc = new Map();
      for (const i of items) {
        const d = claveDescripcion(i.descripcion);
        if (!d) continue;
        vistasDesc.set(d, vistasDesc.has(d) ? null : i); // duplicada → null = no casable por descripción
      }
      const porDesc = new Map([...vistasDesc].filter(([, v]) => v));
      let distintos = 0;
      for (const s of sItems) {
        let ref = s.numeral != null ? porNum.get(claveNumeral(s.numeral)) : null;
        const dS = claveDescripcion(s.descripcion);
        if (!ref && dS) ref = porDesc.get(dS) || null;
        if (!ref) {
          const pos = items[s.indice];
          /* la posición vale salvo que las DOS descripciones existan y se
             contradigan: una ausencia (en el anexo o en SECOP) no es un
             desmentido — «sin dato ≠ contradicción». */
          const dPos = pos ? claveDescripcion(pos.descripcion) : "";
          if (pos && (!dS || !dPos || dPos === dS)) ref = pos;
        }
        if (!ref) { distintos++; continue; }
        if (s.precio_unitario != null && ref.precio_unitario != null && Math.abs(s.precio_unitario - ref.precio_unitario) > 0.5) distintos++;
      }
      if (distintos) dif.push(`${distintos} precio${distintos === 1 ? "" : "s"} unitario${distintos === 1 ? "" : "s"} en SECOP II difiere${distintos === 1 ? "" : "n"} del anexo`);
    }
    if (dif.length) v("secop", "rechazo", "SECOP II no coincide con el anexo", `${dif.join("; ")}. Tienen que ser idénticos: esto es motivo de rechazo automático.`, FUNDAMENTO.secop);
    else v("secop", "ok", "SECOP II", "Lo escrito en SECOP II coincide con el anexo.", FUNDAMENTO.secop);
  }

  /* 4 · AIU discriminado y bajo el tope */
  const aiu = oferta.aiu || {};
  const A = num(aiu.administracion_pct ?? aiu.a), I = num(aiu.imprevistos_pct ?? aiu.i), U = num(aiu.utilidad_pct ?? aiu.u);
  const tope = num(entrada.tope_aiu_pct);
  if (A == null || I == null || U == null) v("aiu", "rechazo", "El AIU no está discriminado", "Su AIU tiene que ir separado en administración, imprevistos y utilidad; falta al menos uno de los tres. Esto es motivo de rechazo automático.", FUNDAMENTO.aiu);
  else {
    const suma = A + I + U;
    if (tope != null && suma > tope + 1e-9) v("aiu", "rechazo", "El AIU supera el tope de la entidad", `Su AIU suma ${pct(suma)} (A ${pct(A)} + I ${pct(I)} + U ${pct(U)}) y el tope del pliego es ${pct(tope)}. Esto es motivo de rechazo automático.`, FUNDAMENTO.aiu, { suma_aiu_pct: suma, tope_aiu_pct: tope });
    else if (tope == null) v("aiu", "sin_referencia", "AIU", `Su AIU está discriminado (A ${pct(A)} + I ${pct(I)} + U ${pct(U)} = ${pct(suma)}), pero no se cargó el tope que fija el pliego: revíselo en el numeral 4.1 del Documento Base y escríbalo para comprobarlo.`, FUNDAMENTO.aiu, { suma_aiu_pct: suma });
    else v("aiu", "ok", "AIU", `AIU discriminado (A ${pct(A)} + I ${pct(I)} + U ${pct(U)} = ${pct(suma)}) y dentro del tope de ${pct(tope)}.`, FUNDAMENTO.aiu, { suma_aiu_pct: suma, tope_aiu_pct: tope });
  }

  /* 5 · baja temeraria */
  /* `TEMERARIO_PCT` de piso_techo es la BAJA (20 = «por debajo del 80 % del
     presupuesto»); aquí se habla en la misma unidad: baja máxima antes de la
     alerta. */
  const bajaMaxPct = num(entrada.umbral_temerario_pct) ?? TEMERARIO_PCT;
  if (presupuesto != null && presupuesto > 0 && totalOferta != null) {
    const bajaPct = (1 - totalOferta / presupuesto) * 100;
    if (bajaPct > bajaMaxPct + 1e-9) {
      v("temeraria", "alerta", "Su precio puede parecer artificialmente bajo", `Su oferta está ${bajaPct.toLocaleString("es-CO", { maximumFractionDigits: 1 })} % por debajo de lo estimado por la entidad (más del ${pct(bajaMaxPct)} de descuento, la referencia de precio artificialmente bajo). La entidad puede pedirle que justifique el precio: tenga lista su justificación desde el APU.`, FUNDAMENTO.temeraria, { baja_pct: Math.round(bajaPct * 10) / 10, umbral_pct: bajaMaxPct, justificacion: true });
    } else if (bajaPct < 0) v("temeraria", "ok", "Precio frente al presupuesto", "Su oferta no está por debajo del presupuesto: no aplica la revisión de precio artificialmente bajo.", FUNDAMENTO.temeraria, { baja_pct: Math.round(bajaPct * 10) / 10, umbral_pct: bajaMaxPct });
    else v("temeraria", "ok", "Precio frente al presupuesto", `Su oferta está ${bajaPct.toLocaleString("es-CO", { maximumFractionDigits: 1 })} % por debajo del presupuesto: no llega al ${pct(bajaMaxPct)} de descuento que sirve de referencia de precio artificialmente bajo.`, FUNDAMENTO.temeraria, { baja_pct: Math.round(bajaPct * 10) / 10, umbral_pct: bajaMaxPct });
  } else v("temeraria", "sin_referencia", "Precio frente al presupuesto", "Sin presupuesto oficial o sin total no se puede medir si el precio parece artificialmente bajo.", FUNDAMENTO.temeraria);

  /* 6 y 7 · aritmética de fila */
  let aritmeticos = 0, redondeos = 0;
  const filasMal = [];
  for (const it of items) {
    if (it.cantidad == null || it.precio_unitario == null || it.total == null) continue;
    const esperado = it.cantidad * it.precio_unitario;
    const dif = Math.abs(esperado - it.total);
    if (dif <= 0.005) continue;
    if (dif <= toleranciaFila(it.cantidad)) redondeos++;
    else { aritmeticos++; if (filasMal.length < 5) filasMal.push({ numeral: it.numeral, descripcion: it.descripcion.slice(0, 60), cantidad: it.cantidad, precio_unitario: it.precio_unitario, total: it.total, esperado: Math.round(esperado) }); }
  }
  if (aritmeticos) v("aritmetico", "informativo", "Cuentas que no cuadran", `${aritmeticos} fila${aritmeticos === 1 ? "" : "s"} donde cantidad × precio unitario no da el total escrito. No es motivo de rechazo: la entidad corrige el error, pero conviene arreglarlo antes de subir.`, FUNDAMENTO.aritmetico, { filas: filasMal });
  else v("aritmetico", "ok", "Aritmética", "En todas las filas cantidad × precio unitario da el total.", FUNDAMENTO.aritmetico);
  if (redondeos) v("redondeo", "informativo", "Ajustes de redondeo", `${redondeos} fila${redondeos === 1 ? "" : "s"} con diferencias de centavos por redondeo. La entidad las ajusta; no es motivo de rechazo.`, FUNDAMENTO.redondeo);
  else v("redondeo", "ok", "Redondeo", "Sin diferencias de redondeo.", FUNDAMENTO.redondeo);

  /* 8 · su precio unitario contra el del pliego (A2) ───────────────────────
     Las siete anteriores comparaban descripción, unidad y cantidad contra el
     Formulario 1, y el TOTAL contra el presupuesto: el PRECIO POR ÍTEM no se
     miraba, así que un ítem a 2,74× el oficial salía «lista para presentar».
     NO es rechazo —ofertar a otro precio es lo que hace el oferente— y se ordena
     por PLATA EN JUEGO, no por porcentaje: un −84 % en un ítem de $2.500 pesa
     menos que un +23 % en 420 m³. El umbral es el TEMERARIO ya declarado
     (lib/apu/piso_techo), no una cifra nueva inventada para esto. */
  const pares = comparacion ? (comparacion.precios || []) : [];
  if (!comparacion) {
    v("unitarios", "sin_referencia", "Su precio por ítem", "No hay Formulario 1 del pliego contra el cual comparar sus precios: léalo con el lector de pliegos (pestaña Precios) y vuelva a revisar.", FUNDAMENTO.unitarios);
  } else if (comparacion.base_comparacion && comparacion.base_comparacion.comparable === false) {
    /* Dos bases distintas y sin AIU con el que convertirlas: el desvío sería
       una cifra inventada. Se DICE, y se dice qué falta para poder calcularla. */
    v("unitarios", "sin_referencia", "Su precio por ítem", comparacion.base_comparacion.motivo, FUNDAMENTO.unitarios);
  } else if (!pares.length) {
    v("unitarios", "sin_referencia", "Su precio por ítem", "El pliego no publica precios unitarios de referencia, así que no hay contra qué comparar los suyos. Reviselo en el Formulario 1 del Documento Base.", FUNDAMENTO.unitarios);
  } else {
    const fuera = pares.filter((p) => Math.abs(p.desvio_pct) > bajaMaxPct)
      .sort((a, b) => (b.plata_en_juego_cop || 0) - (a.plata_en_juego_cop || 0));
    const enJuego = fuera.reduce((a, p) => a + (p.plata_en_juego_cop || 0), 0);
    if (!fuera.length) {
      v("unitarios", "ok", "Su precio por ítem", `Sus ${pares.length} precio${pares.length === 1 ? "" : "s"} unitario${pares.length === 1 ? "" : "s"} están cerca de los que estimó la entidad (menos de ${pct(bajaMaxPct)} de diferencia).`, FUNDAMENTO.unitarios, { filas: [], comparados: pares.length });
    } else {
      const arriba = fuera.filter((p) => p.direccion === "por_encima"), abajo = fuera.filter((p) => p.direccion === "por_debajo");
      const cita = (p) => `${p.numeral || p.descripcion.slice(0, 30)} (${cop(p.unitario_oferta)} frente a ${cop(p.unitario_pliego)} del pliego${p.plata_en_juego_cop != null ? `, ${cop(p.plata_en_juego_cop)} en juego` : ""})`;
      const partes = [];
      /* NO SE AFIRMA LA CAUSAL, SE MANDA A LEERLA. Existe en los Documentos
         Tipo v4 (Res. 465/2024), pero es FACULTATIVA y solo aplica a precios
         unitarios: decir «esto le rechaza la oferta» sin haber leído ESE pliego
         sería denunciar como falta lo que muchas veces no lo es. Y la letra se
         lee del documento, nunca de la memoria: en pliegos mal diligenciados
         aparece corrida, así que se manda a buscar el TEXTO. */
      if (arriba.length) partes.push(`${arriba.length} por ENCIMA: ${arriba.slice(0, 2).map(cita).join("; ")}${arriba.length > 2 ? "…" : ""}. Busque en el Documento Base la causal de rechazo por superar el valor unitario oficial (existe en los Documentos Tipo v4, pero cada entidad decide si la activa): búsquela por su texto, no por su letra`);
      if (abajo.length) partes.push(`${abajo.length} por DEBAJO: ${abajo.slice(0, 2).map(cita).join("; ")}${abajo.length > 2 ? "…" : ""}. Si el contrato es a precios unitarios y la entidad ordena mayores cantidades de esos ítems, pierde plata en cada unidad de más`);
      v("unitarios", "alerta", "Su precio se aleja del que estimó la entidad",
        `${fuera.length} de ${pares.length} ítem${pares.length === 1 ? "" : "s"} se alejan más de ${pct(bajaMaxPct)} del precio del pliego, con ${cop(enJuego)} en juego. ${partes.join(". ")}.`,
        FUNDAMENTO.unitarios, { filas: fuera.slice(0, 10), comparados: pares.length, fuera_de_rango: fuera.length, plata_en_juego_cop: enJuego, umbral_pct: bajaMaxPct });
    }
  }

  const peor = veredictos.reduce((m, x) => Math.max(m, NIVELES[x.nivel] || 0), 0);
  const semaforo = peor >= 3 ? "revisar" : peor === 2 ? "precaucion" : "listo";
  const frase = { listo: "Su oferta está lista para presentar.", revisar: "Revise antes de subir: hay al menos un motivo de rechazo automático.", precaucion: "Precaución: la oferta puede presentarse, pero hay algo que conviene tener listo." }[semaforo];
  return {
    semaforo, frase,
    veredictos,
    rechazos: veredictos.filter((x) => x.nivel === "rechazo").length,
    alertas: veredictos.filter((x) => x.nivel === "alerta").length,
    informativos: veredictos.filter((x) => x.nivel === "informativo").length,
    pendientes: veredictos.filter((x) => x.nivel === "sin_referencia").map((x) => x.id),
    comparacion,
    total_oferta: totalOferta, presupuesto_oficial: presupuesto,
    genera_justificacion: veredictos.some((x) => x.id === "temeraria" && x.nivel === "alerta"),
  };
}

module.exports = { validarFormulario1, compararItems, normalizarItems, FUNDAMENTO, NIVELES };
