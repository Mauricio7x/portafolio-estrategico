/* ============================================================================
   lib/apu/precios_ia · Los APU generados por una SESIÓN de Claude Code (4-sep-2026)
   ----------------------------------------------------------------------------
   Encargo del dueño (segunda versión, la misma noche): «la interfaz de Precios
   muy simple: paso 1 el usuario adjunta el PDF o el Excel con el APU que
   necesita (algunos con precio, otros no); paso 2 un botón "Buscar" que le dé
   la orden a Claude como si un humano le hubiera pegado este prompt [el prompt
   de ingeniero de costos con 15 años de experiencia]; en pantalla "buscando…
   completado x %"; y después el análisis». El servidor NO tiene clave de API
   (el dueño paga la suscripción de Claude Code): el MISMO circuito del
   dictamen y de la primera versión de este módulo.

   EL CIRCUITO
     1. «Buscar» guarda el borrador y deja una SOLICITUD en cola.
     2. Una sesión de Claude Code (la skill /precios) pide la cola y, por
        solicitud, el EXPEDIENTE: las instrucciones —el prompt del dueño con el
        contexto ya puesto: obra, lugar, fecha, moneda, salario mínimo y factor
        prestacional de la aplicación—, el esquema JSON y las filas del
        presupuesto. QUIÉN ABRE ESA SESIÓN (13-sep-2026): «Buscar» DESPIERTA
        una rutina de Claude Code por HTTP (`despertarRutina`: el disparo
        `POST …/routines/<id>/fire` con el token de la rutina, que viven en
        `RUTINA_PRECIOS_URL` y `RUTINA_PRECIOS_TOKEN`); la rutina corre
        `/precios <id> <perfil>` con la suscripción del dueño, sin clave de API.
        Sin esas dos variables la solicitud queda en cola y la pantalla lo dice.
     2b. EL PUENTE POR CHAT, que funciona sin configurar nada: la pantalla copia
        el ENCARGO (`encargoDe`: el mismo prompt, los ítems y el esquema, en un
        solo texto para pegar en cualquier chat de IA) y admite PEGAR la
        respuesta (`extraerJSON`: saca el objeto de entre la prosa y las vallas
        de código); pasa por la MISMA verificación que la sesión.
     3. Mientras trabaja, la sesión manda PROGRESO (hecho/total) y la pantalla
        dice «Buscando… completado x %».
     4. Devuelve los APU por ítem (materiales, mano de obra, equipo, transporte,
        herramienta menor; subtotal directo; supuestos) y las observaciones
        generales. Este módulo VERIFICA la aritmética y la unidad de cada ítem;
        el que no cuadra se APARTA con su motivo, jamás se «arregla».
     5. En pantalla: costo directo por ítem con su desglose, el análisis, y un
        botón que aplica esos precios y calcula el presupuesto. Nada entra al
        costo sin ese clic.

   LO QUE NO HACE
   · No inventa: un ítem sin información suficiente vuelve con `supuestos`
     marcados o sin precio, y así se enseña.
   · No llama a ninguna fuente externa desde el servidor.
   ========================================================================== */
"use strict";

const VERSION = 2;
const MAX_FILAS = 400;
const MAX_COMPONENTES = 40;
const TOLERANCIA = 0.015;                 // 1,5 %: redondeos de la sesión
const TIPOS_COMPONENTE = Object.freeze(["material", "mano_obra", "equipo", "transporte", "herramienta_menor"]);
const CONFIANZAS = Object.freeze(["alta", "media", "baja"]);
const FECHA_RE = /^\d{4}-\d{2}-\d{2}$/;
const EMOJI_RE = /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}]/gu;
const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

const limpiar = (s, max) => (s == null ? null : String(s).replace(EMOJI_RE, "").replace(/\s+/g, " ").trim().slice(0, max) || null);
const num = (v) => { if (v == null || v === "") return null; const n = Number(v); return Number.isFinite(n) ? n : null; };
const cerca = (a, b) => Math.abs(a - b) <= Math.max(1, Math.abs(b)) * TOLERANCIA;

/* ── el contexto laboral y de lugar que la aplicación SÍ conoce ──────────── */
function contextoDe(presupuesto) {
  let smmlv = null, prestacional = null;
  try { smmlv = require("../perfiles.js").SMMLV; } catch { smmlv = null; }
  try { const d = require("./normativa.js").desglosePrestacional(1.55); prestacional = { nominal_pct: d.suma_nominal_pct, exonerado_pct: d.suma_exonerada_pct }; } catch { prestacional = null; }
  const hoy = new Date();
  return {
    pais: "Colombia", moneda: "COP",
    obra: String(presupuesto.objeto || presupuesto.nombre || "").slice(0, 600) || null,
    ciudad: presupuesto.ciudad || null, departamento: presupuesto.departamento || null, entidad: presupuesto.entidad || null,
    fecha_precios: `${MESES[hoy.getUTCMonth()]} de ${hoy.getUTCFullYear()}`,
    salario_minimo_cop: smmlv, factor_prestacional_pct: prestacional,
    tipo_contrato: presupuesto.id_proceso ? "público (SECOP II)" : "no indicado",
    condiciones_sitio: presupuesto.condiciones_sitio || null,
  };
}

/* ── el prompt del dueño, con el contexto ya puesto ─────────────────────── */
function instruccionesDe(ctx, { canal = "sesion", conApuDelUsuario = false } = {}) {
  const v = (x, alt) => (x == null || x === "" ? alt : String(x));
  /* el mismo prompt por dos canales: la SESIÓN lee «entrada.filas» y «esquema» del
     expediente e informa el progreso; el CHAT (encargoDe) los lee de las listas
     que van debajo y solo puede responder con el objeto: nada de progreso */
  const chat = canal === "chat";
  const refFilas = chat ? "la lista «ÍTEMS» de abajo" : "«entrada.filas»";
  const refEsquema = chat ? "«ESQUEMA» de abajo" : "«esquema»";
  const prest = ctx.factor_prestacional_pct ? `${ctx.factor_prestacional_pct.nominal_pct} % nominal (${ctx.factor_prestacional_pct.exonerado_pct} % con exoneración de parafiscales del art. 114-1 del Estatuto Tributario)` : "según la legislación laboral colombiana vigente";
  return [
    `Actúe como un ingeniero civil o arquitecto especialista en costos y presupuestos de construcción, con al menos quince años de experiencia en elaboración de Análisis de Precios Unitarios (APU) para proyectos de edificación e infraestructura en ${ctx.pais}. Su tarea es generar APU técnicamente rigurosos, con precios reales promedio de mercado, priorizando la disponibilidad de insumos sobre el menor costo, y evitando errores de cálculo o supuestos sin fundamento.`,
    "",
    "CONTEXTO DEL PROYECTO:",
    `- Obra: ${v(ctx.obra, "[no indicada: dedúzcala de los ítems y márquelo como supuesto]")}`,
    `- Ubicación: ${[ctx.ciudad, ctx.departamento].filter(Boolean).join(", ") || "[no indicada: use precios promedio nacionales y márquelo como supuesto]"}, ${ctx.pais}`,
    `- Fecha de precios: ${ctx.fecha_precios}`,
    `- Moneda: ${ctx.moneda} (pesos colombianos)`,
    `- Salario mínimo legal vigente: ${ctx.salario_minimo_cop ? `$${ctx.salario_minimo_cop.toLocaleString("es-CO")} mensuales` : "[el de la ley vigente]"} + factor prestacional: ${prest}`,
    `- Condiciones de sitio: ${v(ctx.condiciones_sitio, "[no indicadas: suponga urbano con acceso normal y márquelo como supuesto]")}`,
    `- Tipo de contrato: ${ctx.tipo_contrato}${ctx.entidad ? ` · entidad: ${ctx.entidad}` : ""}`,
    "",
    `ÍTEMS A COTIZAR: los de ${refFilas} (descripción, unidad de pago, cantidad, y el precio que ya traía el archivo o la aplicación, si lo hay). Trabaje primero las filas con ${chat ? "«NECESITA PRECIO»" : "«necesita_precio: true»"}; para las demás, proponga su APU igualmente y contraste con el precio actual en «observacion».`,
    "",
    "METODOLOGÍA OBLIGATORIA PARA CADA APU:",
    "1. DESGLOSE POR COMPONENTES. Materiales: cada insumo con unidad, cantidad neta, porcentaje de desperdicio, cantidad total, precio unitario promedio del mercado local (no el más barato: el de distribuidores y ferreterías de fácil consecución) y valor total, con la fuente del precio (nombre y, si la tiene, dirección web y fecha de consulta). Mano de obra: cuadrilla (oficial, ayudante, operario), rendimiento (horas-hombre por unidad de obra), salario base por categoría, factor prestacional completo y costo por hora; valor por unidad de obra. Equipo: tipo, rendimiento, costo horario total; la herramienta menor como porcentaje de la mano de obra (3 % a 5 %). Transporte: distancia promedio, tarifa y costo por unidad de obra si aplica. Subtotal directo = materiales + mano de obra + equipo + transporte + herramienta menor.",
    "2. COSTOS INDIRECTOS. Entregue el APU a COSTO DIRECTO y separe el AIU: la aplicación lo aplica después con el porcentaje que el usuario fije. Diga si los precios de materiales incluyen IVA.",
    "3. VALIDACIÓN. Verifique toda la aritmética (cantidad total × precio unitario = valor total; la suma de valores = subtotal). Coherencia de unidades. Rendimientos dentro de los estándares de la región; si usa uno atípico, justifíquelo. Desperdicios realistas (concreto 5-10 %, mortero 10-15 %, acero 5-8 %, cerámica 10 %, tubería 3-5 %). Si un precio se aleja mucho del promedio, verifíquelo y explíquelo. Sin costos duplicados (el operador del equipo no va también en la cuadrilla). Si falta información crítica, no asuma en silencio: escríbalo en «supuestos» como «[SUPUESTO: …]» y continúe.",
    `4. FORMATO DE SALIDA: EXACTAMENTE el objeto de ${refEsquema} (JSON). Cada ítem con su lista de componentes, el resumen por componente, el subtotal directo, los supuestos, el rendimiento usado y las fuentes.`,
    "5. NOTAS. Priorice insumos genéricos y de fácil consecución en la zona; evite precios de tiendas en línea que no reflejen el mercado local; para acero, cemento, PVC y cobre use el promedio de las principales distribuidoras de la zona; en zona rural o de difícil acceso suba transporte y logística y dígalo; use los salarios y prestaciones legales vigentes en la fecha de precios.",
    ...(conApuDelUsuario ? ["", bloqueApuDelUsuario(chat)] : []),
    "",
    `ENTREGA: los APU de todas las filas, en el orden de la entrada, y al final «observaciones_generales» (base de precios, fecha, fuentes, criterios de rendimiento y alertas de mercado). Un ítem que no se pueda calcular con la información dada va con «subtotal_directo: null» y el motivo en «supuestos»: nunca una cifra inventada. Registro formal de usted; sin emojis. ${chat ? "Responda ÚNICAMENTE con el objeto JSON: sin texto antes ni después, sin comentarios y sin vallas de código." : "Mientras trabaja, informe el progreso a la aplicación (ver la skill)."}`,
  ].join("\n");
}

/* ── EL APU QUE CARGÓ EL USUARIO (9-nov-2026) ─────────────────────────────
   Encargo del dueño: «cargarle un APU y que Detekta lo elabore». La fila trae
   `composicion_usuario` (la leyó `public/xlsx_lectura.leerApusDeHoja`): sus
   insumos numerados con `n`, con la cantidad que multiplica al precio cuando el
   archivo la deja saber, el rendimiento literal cuando no, y el precio si lo
   trae. El encargo pide RESPETAR esa composición y completar lo que falta; la
   verificación comprueba que se respetó (no se le cree al chat). El bloque va
   SOLO cuando alguna fila lo trae: el expediente de un presupuesto sin APU
   cargado no cambia ni una letra. */
function bloqueApuDelUsuario(chat) {
  const donde = chat ? "las líneas «APU DEL USUARIO» debajo de cada ítem" : "«composicion_usuario» de la fila";
  return [
    `APU DEL USUARIO: algunas filas traen el análisis que el usuario cargó (${donde}), con sus insumos numerados con «n». En esas filas:`,
    "a) Conserve TODOS sus insumos, con su cantidad y, si lo trae, su precio, copiados tal cual y con todos sus decimales. Cada línea que salga de un insumo suyo lleva «ref_usuario» con su «n»; si conserva su precio, la fuente es «APU del usuario».",
    "e0) Cuando el insumo trae la «cantidad que multiplica al precio», úsela como «cantidad_total» (con «desperdicio_pct» 0 si no trae otro).",
    "b) Ponga precio de mercado, con su fuente, solo a los insumos que no lo traen.",
    "c) Puede añadir lo que falte (herramienta menor, transporte, un insumo omitido) con «ref_usuario: null»: la aplicación lo marca como añadido.",
    "d) Si un rendimiento o una cantidad del usuario le parece fuera de rango, NO lo corrija: dígalo en «alertas_rendimiento».",
    "e) Cuando el insumo trae «rendimiento» sin «operacion» (el archivo no deja saber si multiplica o divide), decida según el tipo —en mano de obra y equipo suele ser unidades de obra por jornada u hora, y divide— y dígalo en «supuestos».",
    "f) La herramienta menor en «%» se conserva como fracción de la mano de obra: valor_total = fracción × la suma de la mano de obra del ítem. Si vale 0 porque el ítem no tiene mano de obra, omítala.",
    "La aplicación aparta el APU que quite un insumo del usuario o cambie en silencio su cantidad o su precio.",
  ].join("\n");
}

/* la composición que viaja con la fila, LIMPIA: viene del navegador y se guarda en el borrador tal cual llega */
function composicionLimpia(crudo) {
  if (!crudo || typeof crudo !== "object" || !Array.isArray(crudo.componentes)) return null;
  const vistos = new Set();
  const positivo = (v) => { const n = num(v); return n != null && n > 0 ? n : null; };
  const comps = [];
  for (const c of crudo.componentes.slice(0, MAX_COMPONENTES)) {
    if (!c || typeof c !== "object") continue;
    const tipo = TIPOS_COMPONENTE.includes(c.tipo) ? c.tipo : null;
    const insumo = limpiar(c.insumo, 200);
    if (!tipo || !insumo) continue;
    let n = num(c.n);
    if (n == null || !Number.isInteger(n) || n < 1 || vistos.has(n)) n = comps.length + 1;
    while (vistos.has(n)) n++;
    vistos.add(n);
    const porcentaje = c.es_porcentaje === true;
    const fraccion = (() => { const f = num(c.fraccion); return porcentaje && f != null && f > 0 && f <= 1 ? f : null; })();
    const desp = num(c.desperdicio_pct);
    const OPERACIONES = ["cantidad", "cantidad_con_desperdicio", "multiplica", "divide", "valor_entre_precio", "porcentaje"];
    comps.push({
      n, tipo, insumo, unidad: limpiar(c.unidad, 20),
      cantidad: positivo(c.cantidad), rendimiento: positivo(c.rendimiento),
      desperdicio_pct: desp != null && desp >= 0 && desp <= 100 ? desp : null,
      cantidad_total: porcentaje ? fraccion : positivo(c.cantidad_total),
      operacion: OPERACIONES.includes(c.operacion) ? c.operacion : null,
      precio_unitario: porcentaje ? null : positivo(c.precio_unitario),
      valor_total: (() => { const v = num(c.valor_total); return v != null && v >= 0 ? v : null; })(),
      es_porcentaje: porcentaje, fraccion,
    });
  }
  return comps.length ? { componentes: comps, total_declarado: positivo(crudo.total_declarado), hoja: limpiar(crudo.hoja, 80) } : null;
}
/* le faltan precios: algún insumo (que no sea «%») sin precio */
const composicionIncompleta = (comp) => !!comp && comp.componentes.some((c) => !c.es_porcentaje && c.precio_unitario == null);

const ESQUEMA_SALIDA = Object.freeze({
  version: "número: la versión de este esquema (viene en el expediente)",
  generado_el: "AAAA-MM-DD",
  moneda: "COP",
  items: [{
    fila: "entero: el número de la fila en la entrada",
    unidad: "la unidad de pago de la fila, tal como viene en la entrada",
    componentes: [{
      tipo: "material | mano_obra | equipo | transporte | herramienta_menor",
      insumo: "texto: el insumo, la cuadrilla, el equipo o el flete",
      unidad: "texto: kg, m3, hora, día, viaje, %…",
      cantidad: "número: cantidad neta por unidad de obra",
      desperdicio_pct: "número (0 si no aplica)",
      cantidad_total: "número: cantidad × (1 + desperdicio_pct/100)",
      precio_unitario: "número mayor que 0 en pesos",
      valor_total: "número: cantidad_total × precio_unitario",
      fuente: { nombre: "texto", url: "https://… o null", fecha: "AAAA-MM-DD o null", cita: "texto literal o null" },
      observacion: "texto corto o null",
      ref_usuario: "entero o null: el «n» del insumo del APU del usuario del que sale esta línea; null si la línea la añade usted o si la fila no trae APU del usuario",
    }],
    resumen: { materiales: "número", mano_obra: "número", equipo: "número", transporte: "número", herramienta_menor: "número" },
    subtotal_directo: "número: la suma de todos los valor_total, o null si no se pudo calcular",
    rendimiento: "texto: el rendimiento de mano de obra usado y su justificación",
    supuestos: ["texto, cada uno empezando por [SUPUESTO: …] cuando lo sea"],
    alertas_rendimiento: ["texto: un rendimiento o una cantidad del APU del usuario que parezca fuera de rango, dicho y SIN corregirlo (lista vacía si no hay)"],
    confianza: "alta | media | baja",
    incluye_iva_materiales: "true | false | null",
  }],
  observaciones_generales: { base_de_precios: "texto", fecha: "AAAA-MM-DD", fuentes: ["texto"], criterios_rendimiento: "texto", alertas_mercado: ["texto"] },
});

/* ── el expediente ──────────────────────────────────────────────────────── */
function armarExpediente({ presupuesto, cotizacion = null } = {}) {
  const items = Array.isArray(presupuesto && presupuesto.items) ? presupuesto.items : [];
  const cot = cotizacion && Array.isArray(cotizacion.items) ? cotizacion.items : [];
  const ctx = contextoDe(presupuesto);
  const filas = items.slice(0, MAX_FILAS).map((it, i) => {
    const c = cot[i] || null;
    const manual = num(it.precio_manual);
    const delArchivo = manual != null && manual > 0 && it.origen_precio === "archivo";
    const precioActual = manual != null && manual > 0 ? manual : c && c.precio_unitario != null ? c.precio_unitario : null;
    const fuenteActual = manual != null && manual > 0 ? (delArchivo ? "precio del archivo del usuario" : it.origen_precio === "ia" ? "APU ya aceptado de una búsqueda anterior" : "precio escrito por el usuario") : c ? c.etiqueta : null;
    const composicion = composicionLimpia(it.composicion_usuario);
    return {
      fila: i, item_id: it.item_id || null, codigo: it.codigo || null, capitulo: it.capitulo || null,
      descripcion: String(it.descripcion || "").slice(0, 400) || null, unidad: it.unidad || null, cantidad: num(it.cantidad),
      precio_del_archivo: delArchivo ? manual : null,
      precio_actual: precioActual, fuente_actual: fuenteActual, confianza_actual: c ? c.confianza : null,
      /* sin unidad y sin cantidad es un título de capítulo del archivo: no se cotiza */
      es_titulo: !it.unidad && !(num(it.cantidad) > 0),
      necesita_precio: !!it.unidad && (precioActual == null || (c && c.confianza !== "alta" && !(manual > 0)) || (composicionIncompleta(composicion) && !delArchivo && it.origen_precio !== "ia")),
      /* el APU que cargó el usuario: solo si lo trae (la fila sin él no cambia de forma) */
      ...(composicion ? { composicion_usuario: composicion } : {}),
    };
  });
  const conApu = filas.filter((f) => f.composicion_usuario).length;
  return {
    version: VERSION,
    instrucciones: instruccionesDe(ctx, { conApuDelUsuario: conApu > 0 }),
    esquema: ESQUEMA_SALIDA,
    entrada: {
      id: presupuesto.id, nombre: presupuesto.nombre || null, contexto: ctx, id_proceso: presupuesto.id_proceso || null,
      filas,
      resumen: { filas: filas.length, titulos: filas.filter((f) => f.es_titulo).length, con_precio_del_archivo: filas.filter((f) => f.precio_del_archivo != null).length, necesitan_precio: filas.filter((f) => f.necesita_precio).length, ...(conApu ? { con_apu_del_usuario: conApu } : {}) },
    },
  };
}

/* ── la verificación: aritmética y unidad, ítem por ítem ─────────────────── */
function verificarPropuesta(crudo, presupuesto) {
  const items = Array.isArray(presupuesto && presupuesto.items) ? presupuesto.items : [];
  if (!crudo || typeof crudo !== "object" || Array.isArray(crudo)) return { ok: false, detalle: ["La propuesta debe ser un objeto con «items»."] };
  if (!Array.isArray(crudo.items)) return { ok: false, detalle: ["Falta «items» (lista de APU)."] };
  if (crudo.items.length > MAX_FILAS) return { ok: false, detalle: [`Demasiados ítems (${crudo.items.length}); el tope es ${MAX_FILAS}.`] };
  const { unidadCanonica } = require("./importar.js");
  const salida = [], apartados = [];
  const vistas = new Set();
  for (const p of crudo.items) {
    const fila = num(p && p.fila);
    if (fila == null || !Number.isInteger(fila) || fila < 0 || fila >= items.length) { apartados.push({ fila: p && p.fila, motivo: "la fila no existe en el presupuesto" }); continue; }
    if (vistas.has(fila)) { apartados.push({ fila, motivo: "fila repetida" }); continue; }
    vistas.add(fila);
    const it = items[fila];
    const base = { fila, item_id: it.item_id || null, descripcion: String(it.descripcion || "").slice(0, 400) || null, unidad: it.unidad || null,
      componentes: [], resumen: null, subtotal_directo: null, costo_directo_unitario: null, rendimiento: limpiar(p.rendimiento, 400),
      supuestos: (Array.isArray(p.supuestos) ? p.supuestos : []).map((s) => limpiar(s, 300)).filter(Boolean).slice(0, 12),
      alertas_rendimiento: (Array.isArray(p.alertas_rendimiento) ? p.alertas_rendimiento : []).map((s) => limpiar(s, 300)).filter(Boolean).slice(0, 12),
      confianza: CONFIANZAS.includes(p.confianza) ? p.confianza : "baja", incluye_iva_materiales: p.incluye_iva_materiales === true ? true : p.incluye_iva_materiales === false ? false : null,
      motivo_sin_precio: null };
    const aparta = (motivo) => { apartados.push({ fila, motivo }); base.motivo_sin_precio = `APU apartado: ${motivo}`; base.subtotal_directo = null; base.costo_directo_unitario = null; salida.push(base); };
    const uProp = limpiar(p.unidad, 20), uItem = it.unidad ? String(it.unidad) : null;
    if (uItem && uProp && unidadCanonica(uProp) !== unidadCanonica(uItem)) { aparta(`la unidad del APU (${uProp}) no es la de la fila (${uItem})`); continue; }
    const comps = Array.isArray(p.componentes) ? p.componentes.slice(0, MAX_COMPONENTES) : [];
    /* el APU del usuario se lee ANTES del bucle: un material que trae SU precio, copiado tal cual, no pide fuente (la
       fuente es el usuario) — la regla de «material sin fuente» lo apartaba (revisión adversaria, 9-nov-2026) */
    const delUsuario = composicionLimpia(it.composicion_usuario);
    const conPrecioSuyo = new Set(delUsuario ? delUsuario.componentes.filter((u) => u.precio_unitario != null).map((u) => u.n) : []);
    if (num(p.subtotal_directo) == null) { base.motivo_sin_precio = base.supuestos[0] || "la sesión no pudo calcular este ítem"; salida.push(base); continue; }
    /* un título de capítulo (sin unidad y sin cantidad) no se cotiza: un APU con cifra
       sobre él entraría al presupuesto sin unidad de pago (revisión adversaria, 13-sep-2026) */
    if (!uItem && !(num(it.cantidad) > 0)) { aparta("la fila es un título de capítulo, sin unidad ni cantidad: no se cotiza"); continue; }
    if (!comps.length) { aparta("sin componentes"); continue; }
    let malo = null; const limpios = []; const resumen = { materiales: 0, mano_obra: 0, equipo: 0, transporte: 0, herramienta_menor: 0 };
    for (const c of comps) {
      const tipo = TIPOS_COMPONENTE.includes(c && c.tipo) ? c.tipo : null;
      const cant = num(c && c.cantidad), desp = num(c && c.desperdicio_pct) || 0, cantTotal = num(c && c.cantidad_total), precio = num(c && c.precio_unitario), valor = num(c && c.valor_total);
      const insumo = limpiar(c && c.insumo, 200);
      if (!tipo || !insumo) { malo = "componente sin tipo o sin nombre"; break; }
      /* Un valor total en CERO no es un valor: es «sin dato» con cara de cifra, y un
         APU con costo directo 0 entraría al presupuesto como precio 0 creíble (lo
         encontró la revisión adversaria del 13-sep-2026 por el camino de lo pegado). */
      if (precio == null || !(precio > 0) || valor == null || !(valor > 0)) { malo = `«${insumo}» sin precio unitario o con valor total en cero`; break; }
      const esperadoTotal = cantTotal != null ? cantTotal : cant != null ? cant * (1 + desp / 100) : null;
      if (esperadoTotal == null || !(esperadoTotal > 0)) { malo = `«${insumo}» sin cantidad o con cantidad en cero`; break; }
      if (cantTotal != null && cant != null && !cerca(cantTotal, cant * (1 + desp / 100))) { malo = `«${insumo}»: la cantidad total no es cantidad × (1 + desperdicio)`; break; }
      if (!cerca(valor, esperadoTotal * precio)) { malo = `«${insumo}»: cantidad total × precio unitario no da el valor total`; break; }
      const f = c.fuente && typeof c.fuente === "object" ? { nombre: limpiar(c.fuente.nombre, 120), url: (() => { const u = limpiar(c.fuente.url, 600); return u && /^https?:\/\/\S{4,}$/i.test(u) ? u : null; })(), fecha: (() => { const d = limpiar(c.fuente.fecha, 10); return d && FECHA_RE.test(d) ? d : null; })(), cita: limpiar(c.fuente.cita, 300) } : null;
      const refSuya = num(c.ref_usuario);
      const fuenteSuya = conPrecioSuyo.has(refSuya) && !(f && f.nombre);
      if (tipo === "material" && !(f && f.nombre) && !fuenteSuya) { malo = `«${insumo}» (material) sin fuente del precio`; break; }
      const clave = tipo === "material" ? "materiales" : tipo;
      resumen[clave] += valor;
      const ref = num(c.ref_usuario);
      limpios.push({ tipo, insumo, unidad: limpiar(c.unidad, 20), cantidad: cant, desperdicio_pct: desp, cantidad_total: Math.round(esperadoTotal * 10000) / 10000, precio_unitario: Math.round(precio * 100) / 100, valor_total: Math.round(valor * 100) / 100, fuente: f && f.nombre ? f : fuenteSuya ? { nombre: "APU del usuario", url: null, fecha: null, cita: null } : null, observacion: limpiar(c.observacion, 300),
        ref_usuario: ref != null && Number.isInteger(ref) && ref > 0 ? ref : null,
        /* sin cifras crudas: la comparación con el APU del usuario necesita la cantidad total SIN redondear */
        _cant_total: esperadoTotal, _precio: precio, _valor: valor });
    }
    if (malo) { aparta(malo); continue; }
    /* EL APU QUE CARGÓ EL USUARIO SE RESPETA, Y SE COMPRUEBA (9-nov-2026) */
    if (delUsuario) {
      const r = respetaApuDelUsuario(limpios, delUsuario);
      if (r.malo) { aparta(r.malo); continue; }
    } else {
      for (const l of limpios) { l.ref_usuario = null; l.origen = null; }
    }
    for (const l of limpios) { delete l._cant_total; delete l._precio; delete l._valor; }
    const suma = Object.values(resumen).reduce((a, b) => a + b, 0);
    const subtotal = num(p.subtotal_directo);
    if (!(subtotal > 0)) { aparta("el costo directo es cero: un APU sin costo no es un precio"); continue; }
    if (!cerca(subtotal, suma)) { aparta(`el subtotal directo (${subtotal}) no es la suma de los componentes (${Math.round(suma)})`); continue; }
    for (const k of Object.keys(resumen)) resumen[k] = Math.round(resumen[k] * 100) / 100;
    base.componentes = limpios; base.resumen = resumen; base.subtotal_directo = Math.round(suma * 100) / 100; base.costo_directo_unitario = base.subtotal_directo;
    salida.push(base);
  }
  salida.sort((a, b) => a.fila - b.fila);
  const og = crudo.observaciones_generales && typeof crudo.observaciones_generales === "object" ? crudo.observaciones_generales : {};
  const observaciones = {
    base_de_precios: limpiar(og.base_de_precios, 600), fecha: FECHA_RE.test(String(og.fecha || "")) ? og.fecha : null,
    fuentes: (Array.isArray(og.fuentes) ? og.fuentes : []).map((s) => limpiar(s, 300)).filter(Boolean).slice(0, 30),
    criterios_rendimiento: limpiar(og.criterios_rendimiento, 600),
    alertas_mercado: (Array.isArray(og.alertas_mercado) ? og.alertas_mercado : []).map((s) => limpiar(s, 300)).filter(Boolean).slice(0, 12),
  };
  const conPrecio = salida.filter((x) => x.costo_directo_unitario != null).length;
  return {
    ok: true,
    propuesta: { version: VERSION, generado_el: FECHA_RE.test(String(crudo.generado_el || "")) ? crudo.generado_el : new Date().toISOString().slice(0, 10), moneda: "COP", items: salida, observaciones_generales: observaciones },
    apartados,
    resumen: { filas_respondidas: salida.length, con_precio: conPrecio, sin_precio: salida.length - conPrecio, apartados: apartados.length, filas_del_presupuesto: items.length,
      costo_directo_total: salida.reduce((a, x) => (x.costo_directo_unitario != null && num(items[x.fila].cantidad) != null ? a + x.costo_directo_unitario * num(items[x.fila].cantidad) : a), 0) },
  };
}

/* ── ¿la respuesta respetó el APU del usuario? ───────────────────────────
   Cada línea que sale de un insumo suyo trae `ref_usuario` = su «n». Se aparta
   el APU que: quita un insumo del usuario; repite uno; señala uno que no existe
   o de otro tipo; cambia la cantidad (la que multiplica al precio, si el archivo
   la dejaba saber; la neta y su desperdicio, si venían; el rendimiento —en
   cualquiera de los dos sentidos— si venía solo); cambia un precio que el usuario
   ya traía; pone un precio buscado sin fuente; o cambia el porcentaje de la
   herramienta menor. El ORIGEN de cada línea lo decide esta función, no la
   respuesta: «suyo» (cantidad y precio del usuario), «precio_buscado» (su insumo
   y su cantidad, precio de mercado), «añadido» (no estaba en su APU). La
   tolerancia es la del redondeo (0,5 %), no la de la aritmética de la sesión. */
const TOL_USUARIO = 0.005;
const igualRel = (a, b, tol = TOL_USUARIO) => a != null && b != null && Math.abs(a - b) <= Math.abs(b) * tol + 1e-9;
const fmtPesos = (x) => (x == null ? "sin dato" : `$${(Math.round(Number(x) * 100) / 100).toLocaleString("es-CO")}`);
const fmtCifra = (x) => (x == null ? "sin dato" : String(Number(Number(x).toPrecision(10))).replace(".", ","));
function respetaApuDelUsuario(limpios, delUsuario) {
  const suyos = new Map(delUsuario.componentes.map((c) => [c.n, c]));
  const porRef = new Map();
  for (const l of limpios) {
    if (l.ref_usuario == null) continue;
    const u = suyos.get(l.ref_usuario);
    if (!u) return { malo: `la línea «${l.insumo}» dice venir del insumo ${l.ref_usuario} del APU del usuario, que no existe` };
    if (porRef.has(l.ref_usuario)) return { malo: `el insumo «${u.insumo}» del APU del usuario aparece dos veces` };
    if (u.tipo !== l.tipo && !(u.es_porcentaje && l.tipo === "herramienta_menor")) return { malo: `«${u.insumo}» es ${u.tipo.replace("_", " ")} en el APU del usuario y la respuesta lo pasa a ${l.tipo.replace("_", " ")}` };
    porRef.set(l.ref_usuario, l);
  }
  const manoDeObra = limpios.filter((l) => l.tipo === "mano_obra").reduce((a, l) => a + l._valor, 0);
  for (const u of delUsuario.componentes) {
    const l = porRef.get(u.n);
    /* la herramienta en % sobre una mano de obra que no existe vale 0 en el archivo: omitirla es conservarla */
    if (!l && u.es_porcentaje && u.valor_total === 0) continue;
    if (!l) return { malo: `la respuesta quitó «${u.insumo}» del APU del usuario` };
    if (u.es_porcentaje) {
      if (u.fraccion != null && !(manoDeObra > 0 && igualRel(l._valor, u.fraccion * manoDeObra, TOLERANCIA))) {
        return { malo: `«${u.insumo}»: el usuario la pone en ${fmtCifra(u.fraccion * 100)} % de la mano de obra y la respuesta no conserva ese porcentaje` };
      }
      l.origen = "suyo";
      continue;
    }
    if (u.cantidad_total != null) {
      if (!igualRel(l._cant_total, u.cantidad_total)) return { malo: `cambió la cantidad de «${u.insumo}»: el usuario trae ${fmtCifra(u.cantidad_total)} y la respuesta ${fmtCifra(l._cant_total)}` };
    } else if (u.cantidad != null) {
      if (!igualRel(l.cantidad, u.cantidad)) return { malo: `cambió la cantidad de «${u.insumo}»: el usuario trae ${fmtCifra(u.cantidad)} y la respuesta ${fmtCifra(l.cantidad)}` };
      if (u.desperdicio_pct != null && Math.abs((l.desperdicio_pct || 0) - u.desperdicio_pct) > 0.01) return { malo: `cambió el desperdicio de «${u.insumo}»: el usuario trae ${fmtCifra(u.desperdicio_pct)} % y la respuesta ${fmtCifra(l.desperdicio_pct || 0)} %` };
    } else if (u.rendimiento != null) {
      const r = u.rendimiento;
      /* el sentido inverso (1 ÷ r: unidades de obra por jornada u hora) solo existe en mano de obra y equipo; en un
         material o un flete, 350 kg no son 1/350 kg (revisión adversaria, 9-nov-2026) */
      const inverso = u.tipo === "mano_obra" || u.tipo === "equipo";
      const ok = [l._cant_total, l.cantidad].some((q) => igualRel(q, r) || (inverso && igualRel(q, 1 / r)));
      if (!ok) return { malo: `cambió el rendimiento de «${u.insumo}»: el usuario trae ${fmtCifra(r)} y la cantidad de la respuesta (${fmtCifra(l._cant_total)}) no es ${inverso ? `ni ${fmtCifra(r)} ni 1 ÷ ${fmtCifra(r)}` : fmtCifra(r)}` };
    }
    if (u.precio_unitario != null) {
      if (!igualRel(l._precio, u.precio_unitario)) return { malo: `cambió el precio de «${u.insumo}»: el usuario trae ${fmtPesos(u.precio_unitario)} y la respuesta ${fmtPesos(l._precio)}` };
      l.origen = "suyo";
    } else {
      if (!(l.fuente && l.fuente.nombre)) return { malo: `«${u.insumo}»: el precio buscado no trae fuente` };
      l.origen = "precio_buscado";
    }
  }
  for (const l of limpios) if (l.ref_usuario == null) l.origen = "añadido";
  return { malo: null };
}

/* ── el ENCARGO para pegar en un chat (13-sep-2026) ───────────────────────
   El dueño saca los APU pegando su prompt en un chat; lo que le cuesta es
   reunir el contexto (obra, lugar, salario mínimo, factor prestacional), la
   lista de ítems y una forma de respuesta que la aplicación pueda VERIFICAR.
   Este texto lo reúne todo: el mismo prompt del expediente (canal «chat»), los
   ítems que no son título con su número de fila, y el esquema. Lo que vuelva
   pasa por `verificarPropuesta`: el chat no es fuente de confianza. */
function encargoDe(exp) {
  const ctx = exp && exp.entrada && exp.entrada.contexto ? exp.entrada.contexto : contextoDe({});
  const filas = (exp && exp.entrada && Array.isArray(exp.entrada.filas) ? exp.entrada.filas : []).filter((f) => !f.es_titulo);
  const linea = (f) => {
    const partes = [`${f.fila} · ${f.descripcion || "(sin descripción)"}`, `unidad: ${f.unidad || "(sin unidad)"}`, `cantidad: ${f.cantidad != null ? f.cantidad : "(sin cantidad)"}`];
    if (f.precio_del_archivo != null) partes.push(`precio que trae el archivo: ${f.precio_del_archivo}`);
    else if (f.precio_actual != null) partes.push(`precio actual en la aplicación: ${f.precio_actual}${f.fuente_actual ? ` (${f.fuente_actual})` : ""}`);
    if (f.necesita_precio) partes.push("NECESITA PRECIO");
    const comp = f.composicion_usuario;
    if (!comp) return partes.join(" · ");
    /* el APU del usuario, un insumo por línea, con lo que el archivo dice y nada más («sin dato» donde no dice) */
    const insumo = (c) => [`   APU DEL USUARIO n=${c.n}`, c.tipo, c.insumo, `unidad: ${c.unidad || "sin dato"}`,
      c.es_porcentaje ? `porcentaje de la mano de obra: ${c.fraccion != null ? fmtCifra(c.fraccion * 100) + " %" : "sin dato"}`
        : c.cantidad_total != null ? `cantidad que multiplica al precio: ${fmtCifra(c.cantidad_total)}`
          : c.cantidad != null ? `cantidad: ${fmtCifra(c.cantidad)}${c.desperdicio_pct != null ? ` · desperdicio: ${fmtCifra(c.desperdicio_pct)} %` : ""}`
            : c.rendimiento != null ? `rendimiento: ${fmtCifra(c.rendimiento)} (el archivo no dice si multiplica o divide)` : "cantidad: sin dato",
      c.es_porcentaje ? null : `precio: ${c.precio_unitario != null ? String(c.precio_unitario) : "SIN PRECIO"}`].filter(Boolean).join(" · ");
    return [partes.join(" · "), ...comp.componentes.map(insumo)].join("\n");
  };
  return [
    instruccionesDe(ctx, { canal: "chat", conApuDelUsuario: filas.some((f) => f.composicion_usuario) }),
    "",
    `ÍTEMS (${filas.length}; el primer número de cada línea es «fila»):`,
    ...filas.map(linea),
    "",
    `ESQUEMA (la forma EXACTA de la respuesta; «version» vale ${VERSION}; los números van sin separador de miles, con punto decimal; «fila» es el número de la lista de arriba):`,
    JSON.stringify(ESQUEMA_SALIDA, null, 1),
    "",
    "Recuerde: responda solo con el objeto JSON, con TODAS las filas de la lista.",
  ].join("\n");
}

/* ── lo que el usuario PEGA: sacar el objeto de entre la prosa ───────────────
   Un chat contesta con saludo, vallas ```json``` y despedida; a veces con la
   lista de ítems suelta. Se intenta, en orden: el texto entero, la primera
   valla de código, y del primer «{» al último «}». Una lista se envuelve como
   `{ items }`. Nada legible → `null`, nunca un objeto a medias. */
function extraerJSON(texto) {
  const s = String(texto == null ? "" : texto);
  if (!s.trim()) return null;
  const intentos = [s.trim()];
  /* la valla se busca con indexOf, no con una expresión regular: una valla abierta
     sin cierre hacía retroceder al motor de forma cuadrática (200 KB → 6 s; lo
     midió la revisión adversaria del 13-sep-2026) */
  const v0 = s.indexOf("```");
  if (v0 >= 0) {
    const v1 = s.indexOf("```", v0 + 3);
    if (v1 > v0) intentos.push(s.slice(v0 + 3, v1).replace(/^json\b/i, "").trim());
  }
  const a = s.indexOf("{"), b = s.lastIndexOf("}");
  if (a >= 0 && b > a) intentos.push(s.slice(a, b + 1));
  const a2 = s.indexOf("["), b2 = s.lastIndexOf("]");
  if (a2 >= 0 && b2 > a2) intentos.push(s.slice(a2, b2 + 1));
  for (const t of intentos) {
    let o = null;
    try { o = JSON.parse(t); } catch { o = null; }
    if (Array.isArray(o)) return { items: o };
    if (o && typeof o === "object") return o;
  }
  return null;
}

/* ── despertar la rutina de Claude Code que atiende la cola (13-sep-2026) ───
   Las rutinas admiten un disparo por HTTP: `POST …/routines/<id>/fire` con el
   token de esa rutina (se genera en claude.ai/code/routines y solo sirve para
   dispararla). El texto que viaja es un identificador y un perfil —la rutina
   lo recibe marcado como dato, no como instrucción—. Lo que devuelve es
   OBSERVACIÓN, no promesa: `ok:false` con motivo cuando no se pudo, `null`
   cuando no hay rutina configurada; el token jamás sale en un mensaje. El
   parseo del JSON va APARTE del fetch. */
/* el disparo vive en lib/rutina.js (una copia para Precios y para el dictamen); aquí,
   solo lo que es de Precios: sus variables, su texto y sus palabras */
const Rutina = require("../rutina.js");
const RUTINA_BETA = Rutina.BETA;
const RUTINA_TIEMPO_MS = Rutina.TIEMPO_MS;
const RUTINA_REPETIR_MIN = 15;   // dentro de este plazo, un segundo «Buscar» sobre una solicitud despertada y aún en cola no dispara otra sesión
const SESION_VIVA_MIN = 120;     // una sesión «buscando» con progreso más reciente que esto está TRABAJANDO: no se dispara otra ni se da por perdida (la misma vara que la skill /precios)
/* El TOPE de despertares sin señal (17-oct-2026). Cada disparo gasta una corrida del día de
   la rutina; si la rutina está dañada, volver a pulsar «Buscar» no la arregla. A partir de
   RUTINA_TOPE_SIN_SENAL despertares seguidos sin ningún progreso ya no se despierta otra:
   la pantalla lo dice y ofrece el chat. Cualquier señal de una sesión pone la cuenta en cero,
   y pasadas RUTINA_TOPE_VENTANA_H horas desde la última solicitud se puede volver a intentar. */
const RUTINA_TOPE_SIN_SENAL = 3;
const RUTINA_TOPE_VENTANA_H = 24;
const hayRutina = () => Boolean(process.env.RUTINA_PRECIOS_URL && process.env.RUTINA_PRECIOS_TOKEN);
async function despertarRutina({ id, perfil, fetchImpl = null, tiempoMs = RUTINA_TIEMPO_MS } = {}) {
  if (!hayRutina()) return null;
  /* el texto lleva SOLO el identificador y el perfil: la sesión lee lo demás de la cola */
  return Rutina.despertar({
    url: process.env.RUTINA_PRECIOS_URL, token: process.env.RUTINA_PRECIOS_TOKEN,
    texto: `Solicitud de Precios de Detekta: id_borrador=${id} perfil=${perfil}. Ejecute /precios ${id} ${perfil}.`,
    que: "la búsqueda automática", quePlural: "búsquedas automáticas", varUrl: "RUTINA_PRECIOS_URL", varToken: "RUTINA_PRECIOS_TOKEN",
    fetchImpl, tiempoMs,
  });
}

/* ── el progreso que manda la sesión mientras trabaja ────────────────────── */
function verificarProgreso(crudo) {
  if (!crudo || typeof crudo !== "object") return null;
  const hecho = num(crudo.hecho), total = num(crudo.total);
  if (hecho == null || total == null || !(total > 0) || hecho < 0) return null;
  return { hecho: Math.min(Math.round(hecho), Math.round(total)), total: Math.round(total), pct: Math.min(100, Math.round(100 * hecho / total)), mensaje: limpiar(crudo.mensaje, 200), actualizado_el: new Date().toISOString() };
}

module.exports = { composicionLimpia, respetaApuDelUsuario, VERSION, MAX_FILAS, ESQUEMA_SALIDA, TIPOS_COMPONENTE, CONFIANZAS, RUTINA_BETA, RUTINA_REPETIR_MIN, SESION_VIVA_MIN, RUTINA_TOPE_SIN_SENAL, RUTINA_TOPE_VENTANA_H, contextoDe, instruccionesDe, armarExpediente, encargoDe, extraerJSON, hayRutina, despertarRutina, verificarPropuesta, verificarProgreso };
