/* ============================================================================
   lib/apu/precios_ia · Precios buscados por una SESIÓN de Claude Code (4-sep-2026)
   ----------------------------------------------------------------------------
   Encargo del dueño: «que Precios funcione como cuando le pides a Claude que te
   genere un APU: subes tu APU, extrae el precio de la fuente que sea y te lo da,
   hecho por IA». El servidor NO tiene clave de API y no la va a tener (el dueño
   paga la suscripción de Claude Code): el MISMO camino que el dictamen del pliego
   (lib/handlers/pliego/dictamen.js, motor «sesion»).

   EL CIRCUITO
     1. El usuario pulsa «Pedir precios» en Precios → el borrador se guarda y
        queda una SOLICITUD en cola (apu:ia:solicitud:{perfil}:{id}).
     2. Una sesión de Claude Code (la skill /precios) pide las solicitudes en
        cola y, por cada una, el EXPEDIENTE: instrucciones, esquema, las filas del
        presupuesto con el precio que la aplicación YA tiene (la cascada de
        lib/apu/precios) y cuáles necesitan precio. Busca en la web (listas
        oficiales, tiendas, fabricantes) y devuelve la PROPUESTA por POST.
     3. Este módulo la VERIFICA fila por fila y la guarda. Lo que no pasa se
        APARTA con su motivo, jamás se rellena.
     4. En pantalla cada precio propuesto sale con su fuente, su fecha y su
        enlace, y el usuario lo ACEPTA fila a fila («Usar este precio»): entra
        como precio suyo (nivel 1 de la cascada), la única fuente que mejora sola.

   LO QUE NO HACE, POR DISEÑO
   · No mete un precio de la sesión en el costo sin que el usuario lo acepte:
     en APU el falso caro es el POSITIVO (CLAUDE.md), y un precio de vitrina con
     cara de cotización es exactamente eso.
   · No acepta un precio SIN URL, SIN FECHA o EN OTRA UNIDAD: se aparta y se
     dice por qué. «Nunca inventar un precio: sin fuente va null con su motivo».
   · No llama a ninguna fuente externa desde el servidor: la sesión es quien
     navega; aquí solo se verifica y se guarda.
   ========================================================================== */
"use strict";

const VERSION = 1;
const MAX_FILAS = 400;
const MAX_URL = 600;
const TIPOS_FUENTE = Object.freeze(["oficial", "tienda", "lista_fabricante", "contrato_adjudicado", "revista", "otro"]);
const CONFIANZAS = Object.freeze(["alta", "media", "baja"]);
const URL_RE = /^https?:\/\/[^\s"'<>]{4,}$/i;
const FECHA_RE = /^\d{4}-\d{2}-\d{2}$/;
const EMOJI_RE = /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}]/gu;

/* Lo que recibe la sesión: es el texto de sistema, en llano y sin jerga, con
   las reglas que la verificación de abajo impone. Si cambia una regla aquí,
   cambia allí: las dos viven en el mismo archivo a propósito. */
const INSTRUCCIONES = [
  "Usted busca precios unitarios de insumos y actividades de obra civil en Colombia para un presupuesto concreto.",
  "Reciba las filas de «entrada.filas». Cada una trae la descripción, la unidad de pago, la cantidad, y el precio que la aplicación ya tiene con su fuente (o ninguno). Trabaje PRIMERO las filas con «necesita_precio: true»; para las demás, proponga un precio solo si encuentra una fuente más fuerte que la actual (una lista oficial vigente o un contrato adjudicado frente a un catálogo de referencia).",
  "Fuentes, en este orden de preferencia: (1) listas oficiales de precios de referencia vigentes (Gobernación de Antioquia, IDU, INVIAS, Gobernación de Cundinamarca, Alcaldías, Empresas Públicas), (2) contratos ya adjudicados en SECOP con precios unitarios publicados, (3) listas de fabricantes, (4) tiendas (Homecenter, Easy, ferreterías con precio publicado), (5) revistas del sector. Busque siempre la fuente más cercana al departamento de la obra.",
  "Cada precio va con su fuente: nombre, dirección web completa (https://…), fecha de consulta (AAAA-MM-DD) y la cita literal de donde sale. Un precio sin dirección web no vale: deje «precio_unitario» en null y explique en «nota» qué buscó.",
  "El precio va en pesos colombianos, en la MISMA unidad de pago de la fila. No convierta unidades (m² a m³, saco a kg) salvo que la conversión sea exacta y la declare en «nota»; si la fuente cotiza en otra unidad, deje null y dígalo.",
  "Diga si el precio incluye IVA («incluye_iva»: true, false o null si la fuente no lo dice). Un precio de vitrina lleva IVA y margen de mostrador: es un techo para negociar, no un costo.",
  "Nunca invente ni redondee «para que cuadre»: si no encuentra el precio, null con su motivo. Es mejor una casilla vacía que una cifra creíble y equivocada: con ella se fija el precio de una oferta real.",
  "Registro formal de usted en todo texto; sin emojis; sin adjetivos. Las notas son cortas (una o dos frases).",
  "Devuelva EXACTAMENTE un objeto con la forma de «esquema»: todas las filas de entrada, en el mismo orden, con su «fila» (el número que viene en la entrada).",
].join("\n");

const ESQUEMA_SALIDA = Object.freeze({
  version: "número: la versión de este esquema (viene en el expediente)",
  generado_el: "AAAA-MM-DD",
  moneda: "COP",
  precios: [{
    fila: "entero: el número de la fila en la entrada",
    precio_unitario: "número mayor que 0 en pesos, o null",
    unidad: "la unidad de pago de la fila, tal como viene en la entrada",
    incluye_iva: "true | false | null",
    fuente: { nombre: "texto (2 a 120 caracteres)", url: "https://… (obligatoria si hay precio)", fecha: "AAAA-MM-DD (fecha de consulta)", cita: "texto literal de la fuente, hasta 300 caracteres" },
    tipo_fuente: "oficial | tienda | lista_fabricante | contrato_adjudicado | revista | otro",
    confianza: "alta | media | baja",
    nota: "texto corto (hasta 300 caracteres) o null",
  }],
});

const limpiar = (s, max) => (s == null ? null : String(s).replace(EMOJI_RE, "").replace(/\s+/g, " ").trim().slice(0, max) || null);
const num = (v) => { if (v == null || v === "") return null; const n = Number(v); return Number.isFinite(n) ? n : null; };

/* ── el expediente: lo que la sesión necesita para trabajar ──────────────── */
function armarExpediente({ presupuesto, cotizacion = null } = {}) {
  const items = Array.isArray(presupuesto && presupuesto.items) ? presupuesto.items : [];
  const cot = cotizacion && Array.isArray(cotizacion.items) ? cotizacion.items : [];
  const filas = items.slice(0, MAX_FILAS).map((it, i) => {
    const c = cot[i] || null;
    const manual = num(it.precio_manual);
    const precioActual = manual != null && manual > 0 ? manual : c && c.precio_unitario != null ? c.precio_unitario : null;
    const fuenteActual = manual != null && manual > 0 ? (it.origen_precio === "archivo" ? "precio del archivo importado" : it.origen_precio === "ia" ? "precio ya aceptado de una búsqueda anterior" : "precio escrito por el usuario") : c ? c.etiqueta : null;
    return {
      fila: i, item_id: it.item_id || null, codigo: it.codigo || null,
      descripcion: String(it.descripcion || "").slice(0, 400) || null, unidad: it.unidad || null,
      cantidad: num(it.cantidad),
      precio_actual: precioActual, fuente_actual: fuenteActual, confianza_actual: c ? c.confianza : null,
      /* necesita precio: no hay ninguno, o el que hay es solo una referencia débil */
      necesita_precio: precioActual == null || (c && c.confianza === "baja") || false,
    };
  });
  return {
    version: VERSION,
    instrucciones: INSTRUCCIONES,
    esquema: ESQUEMA_SALIDA,
    entrada: {
      id: presupuesto.id, nombre: presupuesto.nombre || null, objeto: String(presupuesto.objeto || "").slice(0, 1200) || null,
      departamento: presupuesto.departamento || null, entidad: presupuesto.entidad || null, id_proceso: presupuesto.id_proceso || null,
      filas,
      resumen: { filas: filas.length, sin_precio: filas.filter((f) => f.precio_actual == null).length, necesitan_precio: filas.filter((f) => f.necesita_precio).length },
    },
  };
}

/* ── la verificación: fila por fila, y lo que no pasa se aparta con motivo ─── */
function verificarPropuesta(crudo, presupuesto) {
  const items = Array.isArray(presupuesto && presupuesto.items) ? presupuesto.items : [];
  if (!crudo || typeof crudo !== "object" || Array.isArray(crudo)) return { ok: false, detalle: ["La propuesta debe ser un objeto con «precios»."] };
  if (!Array.isArray(crudo.precios)) return { ok: false, detalle: ["Falta «precios» (lista)."] };
  if (crudo.precios.length > MAX_FILAS) return { ok: false, detalle: [`Demasiadas filas (${crudo.precios.length}); el tope es ${MAX_FILAS}.`] };
  const { unidadCanonica } = require("./importar.js");
  const precios = [], apartados = [];
  const vistas = new Set();
  for (const p of crudo.precios) {
    const fila = Number.isInteger(p && p.fila) ? p.fila : num(p && p.fila);
    if (fila == null || !Number.isInteger(fila) || fila < 0 || fila >= items.length) { apartados.push({ fila: p && p.fila, motivo: "la fila no existe en el presupuesto" }); continue; }
    if (vistas.has(fila)) { apartados.push({ fila, motivo: "fila repetida" }); continue; }
    vistas.add(fila);
    const it = items[fila];
    const base = {
      fila, item_id: it.item_id || null, descripcion: String(it.descripcion || "").slice(0, 400) || null, unidad: it.unidad || null,
      precio_unitario: null, incluye_iva: null, fuente: null, tipo_fuente: null, confianza: null, nota: limpiar(p.nota, 300), motivo_sin_precio: null,
    };
    const precio = num(p.precio_unitario);
    if (precio == null) { base.motivo_sin_precio = base.nota || "la sesión no encontró precio"; precios.push(base); continue; }
    const aparta = (motivo) => { apartados.push({ fila, motivo }); base.motivo_sin_precio = `precio apartado: ${motivo}`; precios.push(base); };
    if (!(precio > 0) || precio > 1e11) { aparta("el precio no es un número mayor que cero"); continue; }
    const f = p.fuente && typeof p.fuente === "object" ? p.fuente : null;
    const url = f ? limpiar(f.url, MAX_URL) : null;
    if (!f || !url || !URL_RE.test(url)) { aparta("sin dirección web de la fuente"); continue; }
    const nombre = limpiar(f.nombre, 120);
    if (!nombre || nombre.length < 2) { aparta("sin nombre de la fuente"); continue; }
    const fecha = limpiar(f.fecha, 10);
    if (!fecha || !FECHA_RE.test(fecha) || Number.isNaN(Date.parse(fecha))) { aparta("sin fecha de consulta (AAAA-MM-DD)"); continue; }
    const uProp = limpiar(p.unidad, 20), uItem = it.unidad ? String(it.unidad) : null;
    if (uItem && uProp && unidadCanonica(uProp) !== unidadCanonica(uItem)) { aparta(`la unidad de la fuente (${uProp}) no es la de la fila (${uItem})`); continue; }
    if (uItem && !uProp) { aparta("sin unidad"); continue; }
    base.precio_unitario = Math.round(precio * 100) / 100;
    base.incluye_iva = p.incluye_iva === true ? true : p.incluye_iva === false ? false : null;
    base.fuente = { nombre, url, fecha, cita: limpiar(f.cita, 300) };
    base.tipo_fuente = TIPOS_FUENTE.includes(p.tipo_fuente) ? p.tipo_fuente : "otro";
    base.confianza = CONFIANZAS.includes(p.confianza) ? p.confianza : "baja";
    precios.push(base);
  }
  precios.sort((a, b) => a.fila - b.fila);
  const conPrecio = precios.filter((x) => x.precio_unitario != null).length;
  return {
    ok: true,
    propuesta: { version: VERSION, generado_el: FECHA_RE.test(String(crudo.generado_el || "")) ? crudo.generado_el : new Date().toISOString().slice(0, 10), moneda: "COP", precios },
    apartados,
    resumen: { filas_respondidas: precios.length, con_precio: conPrecio, sin_precio: precios.length - conPrecio, apartados: apartados.length, filas_del_presupuesto: items.length },
  };
}

module.exports = { VERSION, MAX_FILAS, INSTRUCCIONES, ESQUEMA_SALIDA, TIPOS_FUENTE, CONFIANZAS, armarExpediente, verificarPropuesta };
