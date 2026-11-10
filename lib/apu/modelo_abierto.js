/* ============================================================================
   lib/apu/modelo_abierto · El APU de un ítem NUEVO con un modelo abierto, sin Claude (10-nov-2026)
   ----------------------------------------------------------------------------
   Capa 6 del plan «APU propios de Detekta»: lo que no resuelven la biblioteca ni
   los bancos lo arma un modelo de lenguaje de pesos abiertos (p. ej. Qwen3,
   Apache-2.0) servido por un proveedor compatible con la API de chat de OpenAI
   (DeepInfra, Together, Groq…). APAGADO mientras no existan las tres variables:
     MODELO_APU_URL     la dirección de «chat/completions» del proveedor
     MODELO_APU_CLAVE   la clave del proveedor (va en Vercel; jamás sale en un mensaje)
     MODELO_APU_NOMBRE  el modelo, p. ej. «Qwen/Qwen3-32B»

   EL DISEÑO, Y POR QUÉ (medido el 10-nov-2026):
   · El modelo NO ESCRIBE PRECIOS NI INSUMOS LIBRES. Recibe los 5 APU REALES más
     parecidos (INVIAS, EPC, contrato Nogal) de la MISMA unidad, costeados por el
     motor de «Calcular» en el departamento de la obra, y un VOCABULARIO cerrado:
     las líneas de esos APU, cada una con un código, su unidad y su precio. Elige
     códigos y pone cantidades. El precio de cada línea es el del motor, con su
     fuente. Casar insumos libres por nombre contra las tablas con precio solo dio
     precio al 16 % de los insumos de EPC (error mediano 24 %): por eso la lista cerrada.
   · Lo que vuelve pasa por el MISMO juez de la sesión y del chat
     (`precios_ia.verificarPropuesta`): aritmética, unidad, fuente.
   · Una fila con el APU del usuario (`composicion_usuario`) no la toca: respetar
     sus insumos pide otro método (la sesión o el chat), y así se dice.
   · Sin vecinos de la misma unidad no hay vocabulario y no se pregunta: la fila
     queda sin precio, con el motivo. Ante la duda, no se presupuesta.
   ========================================================================== */
"use strict";

const K_VECINOS = 5;
const MAX_VOCABULARIO = 60;
const MAX_POR_LLAMADA = 6;           // filas por petición: la función de Vercel tiene 60 s
const TIEMPO_MS = 40000;

const hayModelo = () => Boolean(process.env.MODELO_APU_URL && process.env.MODELO_APU_CLAVE && process.env.MODELO_APU_NOMBRE);
const nombreModelo = () => String(process.env.MODELO_APU_NOMBRE || "").slice(0, 80) || null;

/* ── el corpus real, tokenizado una vez (el tokenizador de los mapeos: conserva los números) ── */
let _corpus = null;
function corpus() {
  if (_corpus) return _corpus;
  const { terminosItem } = require("../apu_mapeo.js");
  const { unidadCanonica } = require("./importar.js");
  const S = require("./catalogo.js").SEMILLA;
  const I = require("./invias_items.js"), E = require("./epc_items.js");
  const casos = [];
  const sumar = (codigo, fuente, descripcion, unidad) => {
    const cab = String(descripcion || "").split("(")[0];
    casos.push({ codigo, fuente, descripcion, unidad: unidadCanonica(unidad), _t: terminosItem(cab) });
  };
  for (const it of S.items) if (it.fuente === "adjudicado") sumar(it.codigo, "Contrato Nogal (Bogotá, adjudicado 2025)", it.descripcion, it.unidad);
  for (const it of I.comoItemsDeCatalogo()) sumar(it.codigo, "INVIAS 2026", it.descripcion, it.unidad);
  for (const it of E.comoItemsDeCatalogo()) sumar(it.codigo, "EPC 2026 (Cundinamarca)", it.descripcion, it.unidad);
  const df = new Map();
  for (const c of casos) for (const t of new Set(c._t)) df.set(t, (df.get(t) || 0) + 1);
  const N = casos.length;
  _corpus = { casos, idf: (t) => Math.log(1 + (N - (df.get(t) || 0) + 0.5) / ((df.get(t) || 0) + 0.5)) };
  return _corpus;
}

/** Los APU reales más parecidos, de la MISMA unidad, por cobertura ponderada por rareza. */
function vecinosDe(descripcion, unidad, k = K_VECINOS) {
  const { terminosItem } = require("../apu_mapeo.js");
  const { unidadCanonica } = require("./importar.js");
  const u = unidadCanonica(unidad);
  const q = terminosItem(String(descripcion || "").split("(")[0]);
  if (!u || !q.length) return [];
  const { casos, idf } = corpus();
  const peso = q.reduce((a, t) => a + idf(t), 0);
  return casos.filter((c) => c.unidad === u)
    .map((c) => { const set = new Set(c._t); let comun = 0; for (const t of q) if (set.has(t)) comun += idf(t); return { c, s: peso ? comun / peso : 0 }; })
    .filter((x) => x.s > 0).sort((a, b) => b.s - a.s).slice(0, k)
    .map((x) => ({ codigo: x.c.codigo, fuente: x.c.fuente, descripcion: x.c.descripcion, similitud: Math.round(x.s * 1000) / 1000 }));
}

/* las líneas de un APU del banco tal como las costea «Calcular» en el departamento de la obra */
function lineasDelMotor(codigo, unidad, departamento) {
  try {
    const r = require("./calculo.js").calcularPresupuesto({ items: [{ item_id: codigo, cantidad: 1, unidad }], departamento: departamento || "", config: {} });
    const it = r && r.items && r.items[0];
    if (!it || it.incompleto || !it.detalle || !Array.isArray(it.detalle.insumos)) return null;
    return { lineas: it.detalle.insumos, hm_pct: Number(it.detalle.herramienta_menor_pct) || 0, cd: Number(it.costo_directo_unitario) || null };
  } catch { return null; }
}

/** El contexto de UNA fila: sus vecinos costeados y el vocabulario cerrado con código y precio. */
function contextoDeFila(fila, departamento) {
  const vecinos = [];
  const vocab = new Map();
  for (const v of vecinosDe(fila.descripcion, fila.unidad)) {
    const m = lineasDelMotor(v.codigo, fila.unidad, departamento);
    if (!m) continue;
    const lineas = [];
    for (const l of m.lineas) {
      const precio = Number(l.tipo === "mano_obra" ? l.precio_aplicado : (l.precio_aplicado || l.precio_region));
      const valor = Number(l.valor);
      if (!(precio > 0) || !(valor > 0) || !l.nombre) continue;
      const clave = `${l.insumo_id || l.nombre}|${l.unidad || ""}`;
      if (!vocab.has(clave) && vocab.size < MAX_VOCABULARIO) {
        vocab.set(clave, { codigo: `V${vocab.size + 1}`, tipo: ["material", "mano_obra", "equipo", "transporte"].includes(l.tipo) ? l.tipo : "material", nombre: String(l.nombre).slice(0, 160), unidad: l.unidad || null, precio: Math.round(precio * 100) / 100, fuente: `${v.fuente} · costeado por Detekta en ${departamento || "la región base"}` });
      }
      const voc = vocab.get(clave);
      if (voc) lineas.push({ codigo: voc.codigo, cantidad: Math.round((valor / precio) * 1e6) / 1e6 });
    }
    if (lineas.length) vecinos.push({ ...v, cd: m.cd, hm_pct: m.hm_pct, lineas });
  }
  return { vecinos, vocabulario: [...vocab.values()] };
}

const ESQUEMA_MODELO = {
  type: "object", additionalProperties: false,
  properties: {
    no_se_puede: { type: ["string", "null"] },
    lineas: { type: "array", items: { type: "object", additionalProperties: false, properties: { codigo: { type: "string" }, cantidad: { type: "number" }, desperdicio_pct: { type: "number" } }, required: ["codigo", "cantidad", "desperdicio_pct"] } },
    herramienta_menor_pct: { type: "number" },
    rendimiento: { type: "string" },
    supuestos: { type: "array", items: { type: "string" } },
  },
  required: ["no_se_puede", "lineas", "herramienta_menor_pct", "rendimiento", "supuestos"],
};

function mensajesDe(fila, ctx, contexto) {
  const vecinosTxt = ctx.vecinos.map((v, i) => `${i + 1}. ${v.descripcion.split("(")[0].trim()} [${fila.unidad}] · ${v.fuente} · similitud ${v.similitud}\n   ${v.lineas.map((l) => `${l.codigo}×${l.cantidad}`).join(", ")}${v.hm_pct ? ` · herramienta menor ${Math.round(v.hm_pct * 100)} % de la mano de obra` : ""}`).join("\n");
  const vocabTxt = ctx.vocabulario.map((x) => `${x.codigo} · ${x.tipo} · ${x.nombre} · unidad ${x.unidad || "?"} · $${x.precio}`).join("\n");
  return [
    { role: "system", content: "Usted es un ingeniero de costos colombiano con quince años de experiencia en Análisis de Precios Unitarios (APU) de obra civil. Responde solo con el objeto JSON pedido." },
    { role: "user", content: [
      `ÍTEM A ANALIZAR: «${fila.descripcion}» · unidad de pago: ${fila.unidad}${fila.capitulo ? ` · capítulo: ${fila.capitulo}` : ""}`,
      `Obra: ${contexto.obra || "no indicada"} · ${[contexto.ciudad, contexto.departamento].filter(Boolean).join(", ") || "Colombia"}`,
      "",
      `APU REALES PARECIDOS (de la misma unidad; cantidades por unidad de obra):\n${vecinosTxt}`,
      "",
      `INSUMOS DISPONIBLES (use SOLO estos códigos; el precio lo pone la aplicación):\n${vocabTxt}`,
      "",
      "INSTRUCCIONES:",
      "- Arme el APU del ítem eligiendo códigos de la lista y la cantidad de cada uno por unidad de obra (para mano de obra y equipo, la fracción de jornal u hora por unidad).",
      "- Básese en los APU parecidos: ajuste cantidades a lo que el ítem pide (dimensión, espesor, diámetro), sin copiar a ciegas.",
      "- No invente insumos. Si con esta lista no se puede armar con sentido, responda «no_se_puede» con el motivo y «lineas» vacía.",
      "- «herramienta_menor_pct» como fracción de la mano de obra (0 a 0,1). Escriba en «supuestos» cada decisión que no salga de los APU parecidos.",
    ].join("\n") },
  ];
}

/* el item de la propuesta, en la forma EXACTA de precios_ia.ESQUEMA_SALIDA, con el precio del vocabulario */
function itemDePropuesta(filaIdx, fila, ctx, resp, modelo) {
  const base = { fila: filaIdx, unidad: fila.unidad, confianza: "baja", incluye_iva_materiales: null, rendimiento: String(resp && resp.rendimiento || "").slice(0, 400) || null };
  if (!resp || typeof resp !== "object") return { ...base, componentes: [], subtotal_directo: null, supuestos: ["El modelo no devolvió un objeto legible."] };
  if (resp.no_se_puede) return { ...base, componentes: [], subtotal_directo: null, supuestos: [`El modelo no lo armó: ${String(resp.no_se_puede).slice(0, 240)}`] };
  const porCodigo = new Map(ctx.vocabulario.map((x) => [x.codigo, x]));
  const componentes = [];
  for (const l of Array.isArray(resp.lineas) ? resp.lineas.slice(0, 30) : []) {
    const v = porCodigo.get(String(l && l.codigo));
    const cant = Number(l && l.cantidad), desp = Math.max(0, Math.min(30, Number(l && l.desperdicio_pct) || 0));
    if (!v || !(cant > 0)) return { ...base, componentes: [], subtotal_directo: null, supuestos: [`El modelo usó un insumo que no está en la lista o una cantidad no positiva («${l && l.codigo}»): no se presupuesta.`] };
    const ct = Math.round(cant * (1 + desp / 100) * 1e6) / 1e6;
    componentes.push({ tipo: v.tipo, insumo: v.nombre, unidad: v.unidad, cantidad: cant, desperdicio_pct: desp, cantidad_total: ct, precio_unitario: v.precio,
      valor_total: Math.round(ct * v.precio * 100) / 100, fuente: { nombre: v.fuente, url: null, fecha: null, cita: null }, observacion: null, ref_usuario: null });
  }
  if (!componentes.length) return { ...base, componentes: [], subtotal_directo: null, supuestos: ["El modelo no eligió ningún insumo."] };
  const mo = componentes.filter((c) => c.tipo === "mano_obra").reduce((a, c) => a + c.valor_total, 0);
  const hm = Number(resp.herramienta_menor_pct);
  if (mo > 0 && hm > 0 && hm <= 0.1) {
    componentes.push({ tipo: "herramienta_menor", insumo: "Herramienta menor", unidad: "%", cantidad: hm, desperdicio_pct: 0, cantidad_total: hm, precio_unitario: Math.round(mo * 100) / 100,
      valor_total: Math.round(hm * mo * 100) / 100, fuente: { nombre: "Porcentaje de la mano de obra", url: null, fecha: null, cita: null }, observacion: null, ref_usuario: null });
  }
  const resumen = { materiales: 0, mano_obra: 0, equipo: 0, transporte: 0, herramienta_menor: 0 };
  for (const c of componentes) resumen[c.tipo === "material" ? "materiales" : c.tipo] += c.valor_total;
  const subtotal = Math.round(componentes.reduce((a, c) => a + c.valor_total, 0) * 100) / 100;
  const supuestos = [`[SUPUESTO: APU armado por un modelo abierto (${modelo}) a partir de ${ctx.vecinos.length} APU reales parecidos (${ctx.vecinos.map((v) => v.codigo).join(", ")}); precios de esos APU costeados por Detekta. Verifíquelo antes de presentar.]`,
    ...(Array.isArray(resp.supuestos) ? resp.supuestos.map((s) => String(s).slice(0, 280)).slice(0, 8) : [])];
  return { ...base, componentes, resumen, subtotal_directo: subtotal, supuestos };
}

async function preguntar(mensajes, { fetchImpl = null, tiempoMs = TIEMPO_MS } = {}) {
  const f = fetchImpl || fetch;
  let r;
  try {
    r = await f(process.env.MODELO_APU_URL, {
      method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.MODELO_APU_CLAVE}` },
      body: JSON.stringify({ model: process.env.MODELO_APU_NOMBRE, temperature: 0, messages: mensajes,
        response_format: { type: "json_schema", json_schema: { name: "apu", strict: true, schema: ESQUEMA_MODELO } } }),
      signal: AbortSignal.timeout(tiempoMs),
    });
  } catch (e) {
    const texto = String(e && e.message || e).split(String(process.env.MODELO_APU_CLAVE || "\u0000")).join("[clave]");
    return { ok: false, motivo: /abort|timeout/i.test(texto) ? "el modelo no respondió a tiempo" : "no se pudo llamar al modelo", detalle: texto.slice(0, 200) };
  }
  /* el parseo va APARTE del fetch */
  let cuerpo = null;
  try { cuerpo = await r.json(); } catch { cuerpo = null; }
  if (!r.ok) return { ok: false, motivo: r.status === 401 || r.status === 403 ? "el proveedor rechazó la clave (MODELO_APU_CLAVE)" : r.status === 429 ? "el proveedor pidió esperar (cuota o tope)" : `el proveedor respondió ${r.status}`, detalle: null };
  const texto = cuerpo && cuerpo.choices && cuerpo.choices[0] && cuerpo.choices[0].message && cuerpo.choices[0].message.content;
  const obj = require("./precios_ia.js").extraerJSON(texto);
  return obj ? { ok: true, respuesta: obj } : { ok: false, motivo: "la respuesta del modelo no es un objeto JSON", detalle: null };
}

/**
 * Atiende una tanda de filas del borrador. `previa`: la propuesta del modelo ya guardada (para seguir donde iba).
 * Devuelve { crudo, atendidas, quedan, omitidas_por_apu_del_usuario, fallos } — `crudo` va a precios_ia.verificarPropuesta.
 */
async function atender({ presupuesto, previa = null, fetchImpl = null, tope = MAX_POR_LLAMADA } = {}) {
  const IA = require("./precios_ia.js");
  const exp = IA.armarExpediente({ presupuesto });
  /* LO QUE SE CONSERVA DE LA TANDA ANTERIOR (revisión adversaria del 10-nov-2026): solo los ítems cuya fila SIGUE
     siendo la misma (descripción y unidad iguales: si el borrador cambió, el APU viejo no se le pega a otra fila) y
     que no fallaron por algo pasajero («No se pudo: …», un 429 o un tiempo agotado se vuelven a pedir). */
  const filasHoy = exp.entrada.filas;
  const mismaFila = (x) => { const f = filasHoy[x.fila]; return !!f && String(f.descripcion || "") === String(x.descripcion || "") && String(f.unidad || "") === String(x.unidad || ""); };
  const fallido = (x) => x.costo_directo_unitario == null && /^No se pudo:/.test(String(x.motivo_sin_precio || (x.supuestos || [])[0] || ""));
  const conservables = previa && Array.isArray(previa.items) ? previa.items.filter((x) => mismaFila(x) && !fallido(x)) : [];
  const ya = new Set(conservables.map((x) => x.fila));
  const pendientes = exp.entrada.filas.filter((f) => !f.es_titulo && f.necesita_precio && !f.composicion_usuario && !ya.has(f.fila));
  const omitidas = exp.entrada.filas.filter((f) => !f.es_titulo && f.necesita_precio && f.composicion_usuario).length;
  const tanda = pendientes.slice(0, tope);
  const modelo = nombreModelo() || "modelo abierto";
  const fallos = [];
  const items = await Promise.all(tanda.map(async (f) => {
    const ctx = contextoDeFila(f, exp.entrada.contexto.departamento);
    if (!ctx.vecinos.length) return { fila: f.fila, unidad: f.unidad, componentes: [], subtotal_directo: null, supuestos: [`No hay APU reales de la misma unidad (${f.unidad || "sin unidad"}) parecidos a este ítem: no se le pregunta al modelo y no se presupuesta.`], confianza: "baja" };
    const r = await preguntar(mensajesDe(f, ctx, exp.entrada.contexto), { fetchImpl });
    if (!r.ok) { fallos.push(r.motivo); return { fila: f.fila, unidad: f.unidad, componentes: [], subtotal_directo: null, supuestos: [`No se pudo: ${r.motivo}.`], confianza: "baja" }; }
    return dentroDeLosVecinos(itemDePropuesta(f.fila, f, ctx, r.respuesta, modelo), ctx);
  }));
  const previos = conservables.filter((x) => !tanda.some((t) => t.fila === x.fila));
  const hoy = new Date(Date.now() - 5 * 3600e3).toISOString().slice(0, 10);
  const crudo = { version: IA.VERSION, generado_el: hoy, moneda: "COP", items: [...previos.map(aCrudo), ...items],
    observaciones_generales: { base_de_precios: `Precios de los APU reales parecidos (INVIAS, EPC, contrato Nogal) costeados por Detekta en ${exp.entrada.contexto.departamento || "la región base"}; composición propuesta por ${modelo}.`, fecha: hoy, fuentes: ["APU reales de referencia: INVIAS 2026, EPC 2026, contrato Nogal 2025"], criterios_rendimiento: "Los de los APU reales parecidos, ajustados por el modelo y declarados en los supuestos de cada ítem.", alertas_mercado: [] } };
  return { crudo, atendidas: tanda.length, quedan: Math.max(0, pendientes.length - tanda.length), omitidas_por_apu_del_usuario: omitidas, fallos };
}

/* LA CANTIDAD QUE PONE EL MODELO NO ES LIBRE (revisión adversaria del 10-nov-2026): con todas las cantidades ÷ 50
   el juez aprobaba un APU de $15.782 frente a vecinos de $791.471 —la aritmética cuadra igual—. Un costo directo
   fuera de [el menor de los vecinos ÷ 3, el mayor × 3] queda sin precio, con el motivo. Ante la duda, no se presupuesta. */
function dentroDeLosVecinos(item, ctx) {
  const cds = ctx.vecinos.map((v) => Number(v.cd)).filter((x) => x > 0);
  if (item.subtotal_directo == null || !cds.length) return item;
  const min = Math.min(...cds) / 3, max = Math.max(...cds) * 3;
  if (item.subtotal_directo >= min && item.subtotal_directo <= max) return item;
  const pesos = (x) => `$${Math.round(x).toLocaleString("es-CO")}`;
  return { ...item, componentes: [], resumen: null, subtotal_directo: null,
    supuestos: [`El APU del modelo cuesta ${pesos(item.subtotal_directo)} y los APU reales parecidos van de ${pesos(Math.min(...cds))} a ${pesos(Math.max(...cds))}: fuera de ese rango (÷3 a ×3) no se presupuesta.`, ...item.supuestos] };
}

/* un item ya VERIFICADO (de la propuesta guardada) vuelve a la forma cruda para re-verificarse junto a la tanda nueva.
   `cantidad_total` va en null: la primera verificación la guardó redondeada a 4 decimales, y con ella «cantidad total ×
   precio» ya no daba el valor y la fila buena se apartaba en la tanda siguiente (revisión adversaria del 10-nov-2026). */
function aCrudo(x) {
  return { fila: x.fila, unidad: x.unidad, componentes: (x.componentes || []).map((c) => ({ ...c, cantidad_total: null, ref_usuario: null })), resumen: x.resumen, subtotal_directo: x.subtotal_directo,
    rendimiento: x.rendimiento, supuestos: x.supuestos, confianza: x.confianza, incluye_iva_materiales: x.incluye_iva_materiales };
}

module.exports = { hayModelo, nombreModelo, vecinosDe, contextoDeFila, mensajesDe, itemDePropuesta, dentroDeLosVecinos, aCrudo, atender, ESQUEMA_MODELO, MAX_POR_LLAMADA, K_VECINOS };
