/* ============================================================================
   lib/apu/calculo · Motor de Análisis de Precios Unitarios
   ----------------------------------------------------------------------------
   PUNTO ÚNICO DE CÁLCULO del APU (invariante 13 del informe: «cada cifra tiene
   un único punto de cálculo; un segundo cálculo equivalente hoy diverge a la
   primera corrección que se aplique a uno solo»). Lo llaman el endpoint y las
   pruebas; nadie más recalcula un precio por su cuenta.

   Aritmética pura, sin Redis, sin red y sin estado global: se le pasan los
   ítems y la configuración, devuelve el desglose. Eso es lo que permite
   probarlo sin levantar nada.

   ══════════════════ LAS DOS CORRECCIONES A LA FÓRMULA DEL ENCARGO ═══════════

   1 · EL ENCARGO DUPLICABA LA MANO DE OBRA Y EL EQUIPO. Pedía literalmente:

         costo_mano_obra          = (cantidad / rendimiento) · costo_hora · factor
         costo_directo_unitario   = suma de los anteriores
         costo_total_item         = costo_directo_unitario · cantidad

       Pero `(cantidad / rendimiento) · costo_hora` ya es el costo TOTAL del
       ítem (horas totales × $/hora), no el unitario. Sumarlo a los materiales
       —que sí son por unidad— y volver a multiplicar por `cantidad` cobra la
       cuadrilla `cantidad` veces. En un ítem de 500 m² eso son 500 cuadrillas.

       Se conserva la fórmula del encargo TAL CUAL para el TOTAL, y el unitario
       se deriva dividiendo:

         mano_obra_total    = (cantidad / rendimiento_hora) · costo_hora · factor
         mano_obra_unitario = mano_obra_total / cantidad
                            = costo_hora · factor / rendimiento_hora     ← el APU clásico

       Así se cumple a la vez lo que pedía el encargo y la invariante 7 del
       informe: `cantidad × unitario = total` por fila.

   2 · EL AIU SE SUMA, NO SE COMPONE. El encargo pedía
       `CD · (1+aiu) · (1+utilidad) · (1+imprevistos)`, pero AIU **es** el
       acrónimo de Administración + Imprevistos + Utilidad: el parámetro que el
       encargo llama `aiu_pct` es la «A». La convención colombiana —y la que
       usan los pliegos tipo— es ADITIVA: `CD · (1 + A% + I% + U%)`.
       Componerlos infla el precio (20/5/3 da 29,78 % compuesto contra 28 %
       aditivo) y produce un AIU que no coincide con el que declara el
       formulario de la entidad.

       `modo_aiu: "aditivo"` es el DEFECTO. `modo_aiu: "compuesto"` implementa
       la fórmula literal del encargo y sigue disponible: la decisión es del
       dueño, pero el defecto no puede ser el que descuadra contra el pliego.

   ═══════════════════════════ DEGRADACIÓN HONESTA ════════════════════════════

   · Un insumo sin precio NO vale 0: el ítem sale con `incompleto: true`, sus
     componentes en `null` y el motivo. Un 0 se sumaría al total y lo haría
     creíble — es el `|| 0` sobre un conteo, otra vez.
   · Un departamento sin factor regional NO recibe 1,00. Ver `lib/apu/catalogo`.
   · `anticipo_pct` aquí SÍ distingue: `null` es «sin dato» y `0` es «sin
     anticipo». Es lo contrario del campo homónimo del corpus de SECOP —donde
     0 significa sin dato— y la diferencia es legítima: aquí lo teclea una
     persona que sabe lo que está diciendo. Se declara en la respuesta.
   ========================================================================== */
"use strict";

const {
  insumoPorCodigo, itemPorCodigo, factorRegionalDe, TRANSPORTE,
  JORNADA_HORAS, DIAS_LABORADOS_MES,
  FACTOR_PRESTACIONAL, FACTOR_PRESTACIONAL_MIN, FACTOR_PRESTACIONAL_MAX,
} = require("./catalogo.js");

const MODOS_AIU = ["aditivo", "compuesto"];
const IVA_TARIFA = 19;              // tarifa general; la base es la UTILIDAD, no el valor total
const CONTRIBUCION_OBRA_PUBLICA = 5; // Ley 418/1997 y prórrogas — «el olvido más caro del país»
const AIU_ALTO = 35;                // por encima de esto la entidad suele observar

/* Redondeo a 2 decimales, estable frente al error de coma flotante. Todo lo
   que se PUBLICA pasa por aquí; los intermedios se calculan sin redondear. */
const red = (n) => (Number.isFinite(n) ? Math.round((n + Number.EPSILON) * 100) / 100 : null);

function numero(v, porDefecto = null) {
  if (v === null || v === undefined || v === "") return porDefecto;
  const n = typeof v === "number" ? v : Number(String(v).replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(n) ? n : porDefecto;
}

const acotar = (n, min, max) => Math.min(max, Math.max(min, n));

/* ─────────────────────── costos por hora de la cuadrilla ──────────────────
   El insumo de mano de obra se cotiza en SALARIO MENSUAL. Pasar de ahí a
   $/hora exige los dos parámetros que el informe insiste en no confundir:
   los días realmente LABORADOS (23, no los 30 pagados) y las horas de jornada.
   Dividir un salario mensual entre 30 y llamarlo jornal subestima la cuadrilla
   un 30 %. El factor prestacional se aplica DESPUÉS, una sola vez. */
function costoHoraCuadrilla(cuadrilla, cfg) {
  let total = 0;
  const detalle = [];
  const faltantes = [];
  for (const [codigo, n] of Object.entries(cuadrilla || {})) {
    const ins = insumoPorCodigo(codigo);
    const cantidad = numero(n, 0);
    if (!ins || !Number.isFinite(numero(ins.precio))) { faltantes.push(codigo); continue; }
    const horaBase = numero(ins.precio) / (cfg.dias_laborados_mes * cfg.jornada_horas);
    total += cantidad * horaBase;
    detalle.push({ codigo, descripcion: ins.descripcion, cantidad, costo_hora: red(horaBase) });
  }
  return { costo_hora: total, detalle, faltantes };
}

function costoHoraEquipo(equipo, cfg) {
  let total = 0;
  const detalle = [];
  const faltantes = [];
  for (const [codigo, n] of Object.entries(equipo || {})) {
    const ins = insumoPorCodigo(codigo);
    const cantidad = numero(n, 0);
    if (!ins || !Number.isFinite(numero(ins.precio))) { faltantes.push(codigo); continue; }
    const hora = numero(ins.precio) / cfg.jornada_horas; // el equipo se alquila por DÍA
    total += cantidad * hora;
    detalle.push({ codigo, descripcion: ins.descripcion, cantidad, costo_hora: red(hora) });
  }
  return { costo_hora: total, detalle, faltantes };
}

/* ───────────────────────────── un ítem del presupuesto ─────────────────── */

function calcularItem(entrada, cfg, regional) {
  const def = itemPorCodigo(entrada.item_id);
  const cantidad = numero(entrada.cantidad, 0);

  if (!def) {
    return {
      item_id: entrada.item_id, descripcion: null, unidad: null, cantidad,
      incompleto: true, motivo: "item_desconocido",
      mensaje: `El ítem «${entrada.item_id}» no existe en el catálogo.`,
      costo_directo_unitario: null, costo_total: null,
    };
  }

  const rendimientoDia = numero(entrada.rendimiento_override, null) ?? numero(def.rendimiento_dia, null);
  if (!rendimientoDia || rendimientoDia <= 0) {
    return {
      item_id: def.codigo, descripcion: def.descripcion, unidad: def.unidad, cantidad,
      incompleto: true, motivo: "sin_rendimiento",
      mensaje: `El ítem «${def.codigo}» no tiene rendimiento y el rendimiento DIVIDE: sin él no hay costo de mano de obra ni de equipo.`,
      costo_directo_unitario: null, costo_total: null,
    };
  }
  // El rendimiento del catálogo es por DÍA; la fórmula del encargo trabaja en
  // horas. La conversión vive aquí y solo aquí.
  const rendimientoHora = rendimientoDia / cfg.jornada_horas;

  /* ---------- materiales: por UNIDAD de obra, con desperdicio ---------- */
  let materialUnit = 0;
  let toneladasUnit = 0;
  const materiales = [];
  const faltantes = [];
  for (const m of def.materiales || []) {
    const ins = insumoPorCodigo(m.insumo);
    if (!ins || !Number.isFinite(numero(ins.precio))) { faltantes.push(m.insumo); continue; }
    const cant = numero(m.cantidad, 0);
    const desp = numero(m.desperdicio_pct, 0) / 100;
    const cantConDesperdicio = cant * (1 + desp);
    const parcial = cantConDesperdicio * numero(ins.precio);
    materialUnit += parcial;
    toneladasUnit += cantConDesperdicio * numero(ins.ton_por_unidad, 0);
    materiales.push({
      codigo: ins.codigo, descripcion: ins.descripcion, unidad: ins.unidad,
      cantidad: cant, desperdicio_pct: numero(m.desperdicio_pct, 0),
      cantidad_con_desperdicio: red(cantConDesperdicio),
      precio_unitario: numero(ins.precio), valor: red(parcial), fuente: ins.fuente || null,
    });
  }

  /* ---------- mano de obra: la fórmula del encargo, y el unitario derivado ---- */
  const cuad = costoHoraCuadrilla(def.cuadrilla, cfg);
  faltantes.push(...cuad.faltantes);
  const manoObraUnit = (cuad.costo_hora * cfg.factor_prestacional) / rendimientoHora;

  /* ---------- equipo (÷ rendimiento igual que la MO) + herramienta menor ----- */
  const eq = costoHoraEquipo(def.equipo, cfg);
  faltantes.push(...eq.faltantes);
  const equipoBaseUnit = eq.costo_hora / rendimientoHora;
  const herramientaPct = numero(def.herramienta_menor_pct, 0);
  const herramientaUnit = manoObraUnit * (herramientaPct / 100);
  const equipoUnit = equipoBaseUnit + herramientaUnit;

  /* ---------- transporte: ADITIVO, y solo si hay distancia declarada -------
     Con `distancia_acarreo_km = 0` se entiende que el precio del material ya
     está PUESTO EN OBRA: sumar flete ahí sería cobrarlo dos veces, que es el
     error contra el que advierte §1.B.2. */
  const distancia = numero(cfg.distancia_acarreo_km, 0);
  const kModo = regional && regional.flete_relativo ? regional.flete_relativo : 1;
  const tarifa = numero(TRANSPORTE.tarifa_troncal_ton_km, 0);
  const transporteUnit = distancia > 0 ? toneladasUnit * distancia * tarifa * kModo : 0;

  /* ---------- ajuste regional POR COMPONENTE (nunca un número por depto) --- */
  const aplicaRegional = !!(regional && regional.estado === "estimado");
  const fMat = aplicaRegional ? regional.material : 1;
  const fMo = aplicaRegional ? regional.mano_obra : 1;
  const fEq = aplicaRegional ? regional.equipo : 1;

  const uMat = red(materialUnit * fMat);
  const uMo = red(manoObraUnit * fMo);
  const uEq = red(equipoUnit * fEq);
  const uTr = red(transporteUnit);

  // el unitario es la SUMA de los componentes ya redondeados: así los cuatro
  // números que se pintan suman exactamente el quinto y la tabla cuadra a ojo
  const unitario = red(uMat + uMo + uEq + uTr);

  const tMat = red(uMat * cantidad);
  const tMo = red(uMo * cantidad);
  const tEq = red(uEq * cantidad);
  const tTr = red(uTr * cantidad);
  const total = red(tMat + tMo + tEq + tTr);

  return {
    item_id: def.codigo,
    articulo_invias: def.articulo_invias || null,
    verificacion: def.verificacion || null,
    descripcion: def.descripcion,
    unidad: def.unidad,
    cantidad,
    rendimiento_dia: rendimientoDia,
    rendimiento_hora: red(rendimientoHora),
    rendimiento_es_override: numero(entrada.rendimiento_override, null) != null,
    costo_material_unitario: uMat,
    costo_mano_obra_unitario: uMo,
    costo_equipo_unitario: uEq,
    costo_transporte_unitario: uTr,
    costo_directo_unitario: unitario,
    costo_material_total: tMat,
    costo_mano_obra_total: tMo,
    costo_equipo_total: tEq,
    costo_transporte_total: tTr,
    costo_total: total,
    incompleto: faltantes.length > 0,
    motivo: faltantes.length ? "insumos_sin_precio" : null,
    insumos_sin_precio: [...new Set(faltantes)],
    detalle: {
      materiales,
      cuadrilla: cuad.detalle,
      costo_hora_cuadrilla: red(cuad.costo_hora),
      factor_prestacional: cfg.factor_prestacional,
      equipo: eq.detalle,
      costo_hora_equipo: red(eq.costo_hora),
      herramienta_menor_pct: herramientaPct,
      herramienta_menor_unitario: red(herramientaUnit * fEq),
      toneladas_por_unidad: red(toneladasUnit),
      distancia_acarreo_km: distancia,
    },
  };
}

/* ───────────────────────── configuración normalizada ─────────────────────── */

function normalizarConfig(cruda = {}) {
  const c = cruda || {};
  const avisos = [];

  const modo = MODOS_AIU.includes(c.modo_aiu) ? c.modo_aiu : "aditivo";
  const aiu = acotar(numero(c.aiu_pct, 20), 0, 100);
  const utilidad = acotar(numero(c.utilidad_pct, 8), 0, 100);
  const imprevistos = acotar(numero(c.imprevistos_pct, 3), 0, 100);

  // `null` = sin dato · `0` = sin anticipo. La diferencia se declara.
  const anticipoCrudo = c.anticipo_pct;
  const anticipo = (anticipoCrudo === null || anticipoCrudo === undefined || anticipoCrudo === "")
    ? null : acotar(numero(anticipoCrudo, 0), 0, 50);
  if (anticipo !== null && numero(anticipoCrudo, 0) > 50) {
    avisos.push("El anticipo tiene techo legal del 50 % del valor del contrato: se acotó a 50 %.");
  }

  const factorCrudo = numero(c.factor_prestacional, FACTOR_PRESTACIONAL);
  const factor = acotar(factorCrudo, FACTOR_PRESTACIONAL_MIN, FACTOR_PRESTACIONAL_MAX);
  if (factor !== factorCrudo) {
    avisos.push(`El factor prestacional se acotó al rango ${FACTOR_PRESTACIONAL_MIN}–${FACTOR_PRESTACIONAL_MAX}.`);
  }

  const aplicarBaja = c.aplicar_ajuste_competitivo === true || c.aplicar_ajuste_competitivo === "true";
  const baja = acotar(numero(c.factor_baja, 0), 0, 60);

  return {
    modo_aiu: modo,
    aiu_pct: aiu, utilidad_pct: utilidad, imprevistos_pct: imprevistos,
    anticipo_pct: anticipo,
    factor_prestacional: factor,
    jornada_horas: acotar(numero(c.jornada_horas, JORNADA_HORAS), 1, 12),
    dias_laborados_mes: acotar(numero(c.dias_laborados_mes, DIAS_LABORADOS_MES), 1, 31),
    distancia_acarreo_km: Math.max(0, numero(c.distancia_acarreo_km, 0)),
    aplicar_ajuste_competitivo: aplicarBaja,
    factor_baja: baja,
    deducciones_pct: c.deducciones_pct === undefined || c.deducciones_pct === null || c.deducciones_pct === ""
      ? null : acotar(numero(c.deducciones_pct, 0), 0, 30),
    _avisos: avisos,
  };
}

/* ═════════════════════════════ calcularPresupuesto ═════════════════════════ */

function calcularPresupuesto({ items = [], departamento = "", config = {} } = {}) {
  const cfg = normalizarConfig(config);
  const regional = factorRegionalDe(departamento);

  const lista = Array.isArray(items) ? items : [];
  const calculados = lista.map((it) => calcularItem(it || {}, cfg, regional));

  const utiles = calculados.filter((i) => Number.isFinite(i.costo_total));
  const costoDirectoTotal = red(utiles.reduce((a, i) => a + i.costo_total, 0));

  const porComponente = {
    material: red(utiles.reduce((a, i) => a + (i.costo_material_total || 0), 0)),
    mano_obra: red(utiles.reduce((a, i) => a + (i.costo_mano_obra_total || 0), 0)),
    equipo: red(utiles.reduce((a, i) => a + (i.costo_equipo_total || 0), 0)),
    transporte: red(utiles.reduce((a, i) => a + (i.costo_transporte_total || 0), 0)),
  };

  /* ---------- AIU ---------- */
  const aiuTotalPct = red(cfg.aiu_pct + cfg.utilidad_pct + cfg.imprevistos_pct);
  const factorAiu = cfg.modo_aiu === "compuesto"
    ? (1 + cfg.aiu_pct / 100) * (1 + cfg.utilidad_pct / 100) * (1 + cfg.imprevistos_pct / 100)
    : 1 + aiuTotalPct / 100;

  const precioVenta = red(costoDirectoTotal * factorAiu);
  const valorAdministracion = red(costoDirectoTotal * (cfg.aiu_pct / 100));
  const valorImprevistos = red(costoDirectoTotal * (cfg.imprevistos_pct / 100));
  const valorUtilidad = red(costoDirectoTotal * (cfg.utilidad_pct / 100));

  /* ---------- ajuste competitivo ---------- */
  const precioFinal = cfg.aplicar_ajuste_competitivo
    ? red(precioVenta * (1 - cfg.factor_baja / 100))
    : precioVenta;
  const margenFinal = red(precioFinal - costoDirectoTotal);
  const margenPct = costoDirectoTotal > 0 ? red((margenFinal / costoDirectoTotal) * 100) : null;

  /* ---------- caja: anticipo y financiación ----------
     `financiacion_requerida` usa el mismo 20 % que la puerta P3 de la app
     (lib/puertas): es la misma pregunta —«¿puede el dueño poner la plata que
     el Estado no adelanta?»— y dos coeficientes distintos para la misma
     pregunta serían dos respuestas. */
  const anticipoCop = cfg.anticipo_pct === null ? null : red(precioFinal * (cfg.anticipo_pct / 100));
  const financiacion = anticipoCop === null
    ? red(precioFinal * 0.20)
    : red((precioFinal - anticipoCop) * 0.20);

  /* ---------- informativos: IVA sobre la utilidad y contribución del 5 % ---- */
  const ivaSobreUtilidad = red(valorUtilidad * (IVA_TARIFA / 100));
  const contribucion = red(precioFinal * (CONTRIBUCION_OBRA_PUBLICA / 100));
  const deducciones = cfg.deducciones_pct === null ? null : red(precioFinal * (cfg.deducciones_pct / 100));
  const margenDespuesDeducciones = deducciones === null ? null : red(margenFinal - deducciones);

  /* ---------- alertas ---------- */
  const alertas = [...cfg._avisos];
  const incompletos = calculados.filter((i) => i.incompleto);
  if (incompletos.length) {
    alertas.push(`${incompletos.length} ítem(s) no se pudieron costear por completo y NO suman al total. Se listan con su motivo: un ítem sin precio vale «sin dato», nunca cero.`);
  }
  if (regional.estado !== "estimado") {
    alertas.push(`Sin ajuste regional: ${regional.mensaje}`);
  }
  if (aiuTotalPct > AIU_ALTO) {
    alertas.push(`El AIU total es ${aiuTotalPct} %. Por encima del ${AIU_ALTO} % las entidades suelen observar la oferta.`);
  }
  if (cfg.aplicar_ajuste_competitivo && margenFinal <= 0) {
    alertas.push("⛔ Con esa baja el precio final NO cubre ni el costo directo: presentarse sería trabajar a pérdida.");
  } else if (cfg.aplicar_ajuste_competitivo && precioFinal < costoDirectoTotal * (1 + (cfg.aiu_pct + cfg.imprevistos_pct) / 100)) {
    alertas.push("⚠️ La baja se comió toda la utilidad y parte de la administración: el margen que queda no cubre los costos indirectos.");
  }
  if (cfg.aplicar_ajuste_competitivo && cfg.factor_baja > 15) {
    alertas.push(`Una baja del ${cfg.factor_baja} % está por encima de la banda típica de obra (5–12 %). Verifique que el margen sobrevive antes de ofertar.`);
  }
  if (cfg.deducciones_pct === null) {
    alertas.push(`El margen NO descuenta la contribución especial de obra pública (${CONTRIBUCION_OBRA_PUBLICA} % del valor del contrato, Ley 418/1997) ni las estampillas. Sobre este precio la contribución sola serían ${contribucion == null ? "—" : contribucion.toLocaleString("es-CO")} COP. Cárguelas en «deducciones de acta (%)» para ver el margen real.`);
  }
  if (cfg.anticipo_pct === null) {
    alertas.push("Anticipo sin dato: la financiación requerida se calculó como si NO hubiera anticipo, que es el escenario conservador.");
  }

  return {
    ok: true,
    departamento: departamento || null,
    ajuste_regional: regional,
    configuracion: {
      modo_aiu: cfg.modo_aiu,
      aiu_pct: cfg.aiu_pct, utilidad_pct: cfg.utilidad_pct, imprevistos_pct: cfg.imprevistos_pct,
      aiu_total_pct: aiuTotalPct,
      anticipo_pct: cfg.anticipo_pct,
      anticipo_es_sin_dato: cfg.anticipo_pct === null,
      factor_prestacional: cfg.factor_prestacional,
      jornada_horas: cfg.jornada_horas, dias_laborados_mes: cfg.dias_laborados_mes,
      distancia_acarreo_km: cfg.distancia_acarreo_km,
      aplicar_ajuste_competitivo: cfg.aplicar_ajuste_competitivo,
      factor_baja: cfg.factor_baja,
      deducciones_pct: cfg.deducciones_pct,
    },
    items: calculados,
    resumen: {
      items_totales: calculados.length,
      items_costeados: utiles.length,
      items_incompletos: incompletos.length,
      costo_directo_total: costoDirectoTotal,
      por_componente: porComponente,
      administracion: valorAdministracion,
      imprevistos: valorImprevistos,
      utilidad: valorUtilidad,
      factor_aiu: red(factorAiu * 1000) / 1000,
      precio_venta: precioVenta,
      precio_final: precioFinal,
      margen_final: margenFinal,
      margen_pct: margenPct,
      anticipo_cop: anticipoCop,
      financiacion_requerida: financiacion,
      iva_sobre_utilidad: ivaSobreUtilidad,
      contribucion_obra_publica: contribucion,
      deducciones_estimadas: deducciones,
      margen_despues_deducciones: margenDespuesDeducciones,
    },
    alertas,
    como_leerlo: {
      precios: "Los precios del catálogo son ILUSTRATIVOS y están pendientes de calibración (ver data/apu_catalogo.json). Este presupuesto es una AYUDA DE LECTURA para decidir a qué presentarse, no una oferta.",
      aiu: cfg.modo_aiu === "aditivo"
        ? "AIU aditivo: precio = costo directo × (1 + A% + I% + U%), que es la convención de los pliegos tipo."
        : "AIU compuesto: precio = CD × (1+A%) × (1+I%) × (1+U%). Da un AIU efectivo MAYOR que la suma de los tres porcentajes y no coincidirá con el que declare el formulario de la entidad.",
      iva: "El IVA en contratos de construcción de bien inmueble se causa sobre la UTILIDAD del constructor (art. 3 D. 1372/1992, hoy art. 1.3.1.7.9 D. 1625/2016), no sobre el valor total. Se muestra como informativo: no está sumado al precio.",
      margen: "«margen_final» es precio_final − costo_directo_total, tal como lo pidió el encargo. NO descuenta impuestos, estampillas ni la contribución del 5 %: para eso está «margen_despues_deducciones», que exige cargar el porcentaje real del municipio.",
    },
  };
}

module.exports = {
  calcularPresupuesto, calcularItem, normalizarConfig,
  costoHoraCuadrilla, costoHoraEquipo,
  MODOS_AIU, IVA_TARIFA, CONTRIBUCION_OBRA_PUBLICA, AIU_ALTO, red,
};
