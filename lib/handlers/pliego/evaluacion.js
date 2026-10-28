/* lib/handlers/pliego/evaluacion.js · /api/pliego?op=evaluacion (Nivel 3, 26-oct-2026)
   La CAPTURA de las evaluaciones de una entidad: quién quedó hábil en sus procesos ya cerrados, por qué
   rechazó, y si el ganador lo decidió el precio o los puntos fuera del precio. Tres actores, un contrato:
     · la PANTALLA (ventana de la entidad) pide el documento de cada proceso, lo baja por op=descargar, lo lee
       con pdf.js y OCR (solo las páginas con imagen) y manda el TEXTO aquí;
     · una SESIÓN de Claude Code (/evaluaciones, tarea diaria) pide los pendientes, lee cada expediente y
       devuelve la captura con una cita por dato;
     · aquí se VERIFICA cada dato contra el texto guardado (lib/evaluacion.js) y se guarda solo lo que se sostiene.
     GET  ?entidad=…[&nit=…]                → los hechos de la entidad (solo lo verificado) y qué procesos ya se leyeron.
     GET  ?documento=1&id_proceso=…         → qué documento leer de ese proceso (índice de datos.gov.co).
     GET  ?pendientes=1                     → los textos que esperan su lectura (para la sesión).
     GET  ?expediente=1&portafolio=…        → instrucciones, esquema y texto paginado de uno.
     POST {id_proceso, portafolio, entidad, nit?, documento, texto, paginas_ocr?, paginas_sin_leer?} → guarda el texto (la pantalla).
     POST {portafolio, motor:"sesion", captura}                               → verifica y guarda (la sesión).
   Con token o con la sesión del dueño, como el resto de op=pliego. Toda falla de Redis responde 503 con qué
   hacer; un dato que no se verifica no se guarda (y la respuesta dice por qué). */
"use strict";

const { crearRedis, hayCredenciales } = require("../../redis.js");
const { autorizarToken } = require("../../auth.js");
const { leerCuerpo } = require("../../cuerpo.js");
const { escribirJSONComprimido, leerJSONComprimido } = require("../../almacen.js");
const E = require("../../evaluacion.js");
const Dic = require("../../dictamen.js");
const D = require("../../diff.js");
const Docs = require("../../documentos_proceso.js");
const { ID_RE } = require("./diff.js");

const MAX_BYTES = 4 * 1024 * 1024;        // el texto de una evaluación con OCR cabe de sobra; la plataforma corta en 4,5 MB
const PORTAFOLIO_RE = /^CO1\.BDOS\.\d{3,12}$/;
const responder = (res, status, cuerpo) => res.status(status).json(cuerpo);
const ahora = () => new Date().toISOString();

/* LA ENTIDAD SE GUARDA POR SU NIT Y POR SU NOMBRE: la ventana de la entidad se abre desde tarjetas que a veces
   traen el NIT y a veces no; lo leído desde una se ve desde la otra. Un NIT ilegible es INERTE (se usa el nombre). */
/* el dígito de verificación («800.123.456-7») se quita: la misma entidad llega con él y sin él */
const nitDe = (v) => { const d = String(v == null ? "" : v).trim().replace(/-\s*\d\s*$/, "").replace(/\D/g, ""); return d.length >= 6 && d.length <= 15 ? d : null; };
const nombreDe = (v) => E.nombrePlegado(v).replace(/[^a-z0-9]+/g, " ").trim().slice(0, 200);
const clavesDeEntidad = (entidad, nit) => [nitDe(nit) && E.claveEntidad(`nit:${nitDe(nit)}`), nombreDe(entidad) && E.claveEntidad(`nombre:${nombreDe(entidad)}`)].filter(Boolean);

/* Dos entidades homónimas con NIT distinto comparten la clave por nombre: pedida con NIT, una entrada guardada con
   OTRO NIT no es de esta entidad y se descarta (la que no trae NIT se queda: no hay con qué separarla). */
async function procesosDeEntidad(redis, entidad, nit) {
  const todos = {}, n = nitDe(nit);
  for (const k of clavesDeEntidad(entidad, nit)) {
    const h = await redis.hgetall(k).catch(() => null);
    for (const [portafolio, v] of Object.entries(h || {})) {
      try { const e = JSON.parse(v); if (n && e && e.nit && e.nit !== n) continue; todos[portafolio] = { ...(todos[portafolio] || {}), ...e }; } catch { /* entrada ilegible: inerte */ }
    }
  }
  return todos;
}

async function hechos(redis, q) {
  const entidad = String(q.entidad || "").trim();
  if (!entidad && !nitDe(q.nit)) return { status: 400, cuerpo: { ok: false, error: "Falta ?entidad= (el nombre de la entidad) o ?nit=." } };
  const procesos = await procesosDeEntidad(redis, entidad, q.nit);
  const portafolios = Object.keys(procesos).filter((p) => PORTAFOLIO_RE.test(p)).slice(0, 200);
  const capturas = [];
  for (const p of portafolios) {
    const c = await leerJSONComprimido(redis, E.claveCaptura(p)).catch(() => null);
    if (c && c.captura) { capturas.push(c); procesos[p].estado = c.captura.documento_util ? "leido" : "sin_evaluacion"; }
    /* sin captura, está en cola solo mientras su texto siga guardado: un texto que caducó sin leerse (30 días) vuelve a
       ser un proceso por leer, no un «en cola» para siempre */
    else procesos[p].estado = (await redis.exists(E.claveTexto(p)).catch(() => 1)) ? "en_cola" : "caducado";
  }
  return { status: 200, cuerpo: { ok: true, entidad: entidad || null, hechos: E.hechosDeEntidad(capturas), procesos,
    textos: { motivos: E.MOTIVO_TEXTO, criterios: E.CRITERIO_TEXTO }, max_por_lectura: E.MAX_POR_LECTURA } };
}

async function documento(redis, q) {
  const id = String(q.id_proceso || "").trim();
  if (!ID_RE.test(id)) return { status: 400, cuerpo: { ok: false, error: "Falta ?id_proceso= (el id del proceso en SECOP II)." } };
  const r = await require("./documentos.js").consultarIndice(redis, id);   // diferido: documentos.js carga lectores que viven en ciclos
  if (!r.ok) return { status: 200, cuerpo: { ok: true, id_proceso: id, documento: null, motivo: r.motivo } };
  const portafolio = r.indice && r.indice.id_del_portafolio;
  if (!portafolio) return { status: 200, cuerpo: { ok: true, id_proceso: id, documento: null, motivo: (r.indice && r.indice.motivo) || "Este proceso no tiene índice de archivos en datos.gov.co." } };
  const pdfs = (r.indice.archivos || []).filter((a) => a.extension === "pdf" && a.url);
  const doc = E.elegirDocumento(pdfs);
  if (!doc) return { status: 200, cuerpo: { ok: true, id_proceso: id, portafolio, documento: null, motivo: "La entidad no publicó informe de evaluación, resolución de adjudicación ni acta en PDF para este proceso." } };
  /* «ya leído» también si su texto ya espera la lectura automática: bajarlo y pasarlo por OCR otra vez gasta cupo sin cambiar nada */
  const ya = await leerJSONComprimido(redis, E.claveCaptura(portafolio)).catch(() => null);
  const enCola = !(ya && ya.captura) && !!(await redis.exists(E.claveTexto(portafolio)).catch(() => 0));
  return { status: 200, cuerpo: { ok: true, id_proceso: id, portafolio, ya_leido: !!(ya && ya.captura) || enCola, en_cola: enCola,
    documento: { papel: doc.papel, nombre: doc.nombre, url: doc.url, bytes: doc.bytes, id_documento: doc.id_documento, fecha_carga: doc.fecha_carga } } };
}

const MAX_PENDIENTES = 200;
async function pendientes(redis) {
  const prefijo = E.claveTexto("");
  const claves = await redis.scan(E.claveTexto("*"));
  const lista = [];
  /* un texto ya interpretado sigue guardado (hasta su TTL) para poder corregir y reenviar su captura, pero no es
     pendiente. Se descarta ANTES de recortar: con el tope primero, 200 textos ya interpretados escondían al pendiente. */
  for (const k of claves) {
    if (lista.length >= MAX_PENDIENTES) break;
    const p = k.startsWith(prefijo) ? k.slice(prefijo.length) : "";
    if (!PORTAFOLIO_RE.test(p) || await redis.exists(E.claveCaptura(p)).catch(() => 0)) continue;
    const t = await leerJSONComprimido(redis, k).catch(() => null);
    if (t && t.portafolio) lista.push({ portafolio: t.portafolio, id_proceso: t.id_proceso, entidad: t.entidad, documento: t.documento && t.documento.nombre, caracteres: String(t.texto || "").length, guardado_el: t.guardado_el });
  }
  return { status: 200, cuerpo: { ok: true, pendientes: lista, como_seguir: "Por cada uno: GET ?expediente=1&portafolio=…, lea y devuelva la captura con POST (motor «sesion»)." } };
}

async function expediente(redis, q) {
  const p = String(q.portafolio || "").trim();
  if (!PORTAFOLIO_RE.test(p)) return { status: 400, cuerpo: { ok: false, error: "Falta ?portafolio= (CO1.BDOS…)." } };
  const t = await leerJSONComprimido(redis, E.claveTexto(p)).catch(() => null);
  if (!t || !t.texto) return { status: 404, cuerpo: { ok: false, error: "No hay texto guardado para ese proceso (ya se leyó o caducó)." } };
  const tp = Dic.textoPaginado(t.texto);
  return { status: 200, cuerpo: { ok: true, portafolio: p, entrada: { entidad: t.entidad, id_proceso: t.id_proceso, documento: t.documento, paginas_ocr: t.paginas_ocr || 0, paginas_sin_leer: t.paginas_sin_leer || [], recortado: !!t.recortado },
    instrucciones: E.INSTRUCCIONES, esquema: E.ESQUEMA, texto_paginado: tp.texto, paginas_vacias: tp.paginas_vacias, como_devolver: E.COMO_DEVOLVER } };
}

async function guardarTexto(redis, d) {
  const id = String(d.id_proceso || "").trim(), p = String(d.portafolio || "").trim();
  if (!ID_RE.test(id) || !PORTAFOLIO_RE.test(p)) return { status: 400, cuerpo: { ok: false, error: "Faltan id_proceso (CO1.REQ…) y portafolio (CO1.BDOS…)." } };
  const entidad = String(d.entidad || "").trim().slice(0, 300);
  if (!clavesDeEntidad(entidad, d.nit).length) return { status: 400, cuerpo: { ok: false, error: "Falta la entidad (nombre o NIT)." } };
  const texto = String(d.texto || "");
  /* se mide SIN los marcadores de página: un escaneo que el OCR no leyó llega como «\f1 … \f30» y no es un documento leído */
  if (texto.replace(/^[ \t]*\f\d+[ \t]*$/gm, "").replace(/\s+/g, "").length < 50) return { status: 422, cuerpo: { ok: false, error: "El documento no trajo texto legible (no tiene texto con capa y el reconocimiento de imágenes no lo leyó): no se guardó. Inténtelo más tarde." } };
  const normalizado = D.normalizarConPaginas(texto);
  const guardable = normalizado.length > Docs.MAX_TEXTO_DOC ? normalizado.slice(0, Docs.MAX_TEXTO_DOC) : normalizado;
  const doc = d.documento && typeof d.documento === "object" ? { nombre: String(d.documento.nombre || "").slice(0, 160), papel: String(d.documento.papel || "").slice(0, 40), id_documento: String(d.documento.id_documento || "").slice(0, 20) } : null;
  const ocr = Number.isInteger(d.paginas_ocr) && d.paginas_ocr >= 0 && d.paginas_ocr <= 5000 ? d.paginas_ocr : 0;
  /* las páginas con imagen que el OCR no leyó: con alguna, el proceso no sirve para comparar ofertas entre sí */
  const sinLeer = (Array.isArray(d.paginas_sin_leer) ? d.paginas_sin_leer : []).filter((n) => Number.isInteger(n) && n > 0 && n <= 5000).slice(0, 5000);
  await escribirJSONComprimido(redis, E.claveTexto(p), { portafolio: p, id_proceso: id, entidad, nit: nitDe(d.nit), documento: doc, texto: guardable, recortado: guardable.length < normalizado.length, paginas_ocr: ocr, paginas_sin_leer: sinLeer, guardado_el: ahora() }, { ttl: E.TEXTO_TTL_SEG });
  for (const k of clavesDeEntidad(entidad, d.nit)) await redis.hset(k, { [p]: JSON.stringify({ id_proceso: id, nit: nitDe(d.nit), documento: doc && doc.nombre, estado: "texto", guardado_el: ahora() }) });
  return { status: 200, cuerpo: { ok: true, portafolio: p, estado: "en_cola", caracteres: guardable.length,
    mensaje: "Documento leído. Las tablas se interpretan en la próxima lectura automática y los resultados aparecen en esta ventana." } };
}

async function guardarCaptura(redis, d) {
  const p = String(d.portafolio || "").trim();
  if (!PORTAFOLIO_RE.test(p)) return { status: 400, cuerpo: { ok: false, error: "Falta portafolio (CO1.BDOS…)." } };
  if (String(d.motor || "") !== "sesion") return { status: 400, cuerpo: { ok: false, error: "La captura solo la manda una sesión (motor «sesion»)." } };
  const t = await leerJSONComprimido(redis, E.claveTexto(p)).catch(() => null);
  if (!t || !t.texto) return { status: 404, cuerpo: { ok: false, error: "No hay texto guardado para ese proceso: no hay contra qué verificar la captura." } };
  const v = E.verificarCaptura(d.captura, t.texto, { paginas_sin_leer: t.paginas_sin_leer || [], recortado: !!t.recortado });
  if (v.errores) return { status: 400, cuerpo: { ok: false, error: "La captura no tiene la forma del esquema.", detalle: v.errores } };
  const registro = { portafolio: p, id_proceso: t.id_proceso, entidad: t.entidad, nit: t.nit || null, documento: t.documento, captura: v.captura, verificacion: v.verificacion, paginas_ocr: t.paginas_ocr || 0, leido_el: ahora() };
  await escribirJSONComprimido(redis, E.claveCaptura(p), registro, { ttl: E.CAPTURA_TTL_SEG });
  for (const k of clavesDeEntidad(t.entidad, t.nit)) await redis.hset(k, { [p]: JSON.stringify({ id_proceso: t.id_proceso, documento: t.documento && t.documento.nombre, nit: t.nit || null, estado: v.captura.documento_util ? "leido" : "sin_evaluacion", leido_el: registro.leido_el }) });
  // el contador de Precios: entra la evaluación completa, sale la que dejó de estarlo (una relectura)
  if (v.captura.completa === true) await redis.hset(E.CLAVE_COMPLETAS, { [p]: registro.leido_el });
  else await redis.hdel(E.CLAVE_COMPLETAS, p);
  return { status: 200, cuerpo: { ok: true, portafolio: p, documento_util: v.captura.documento_util, verificacion: v.verificacion } };
}

module.exports = async function handler(req, res) {
  const q = req.query || {};
  res.setHeader("Cache-Control", "no-store");
  const permiso = await autorizarToken(req, q);
  if (!permiso.ok) return responder(res, permiso.status, { ok: false, error: permiso.error, como_autenticar: permiso.como_autenticar });
  if (!hayCredenciales()) return responder(res, 503, { ok: false, error: "Faltan credenciales de Upstash Redis en el despliegue." });
  const redis = crearRedis({});
  const metodo = String(req.method || "GET").toUpperCase();
  try {
    let r;
    if (metodo === "GET") {
      if (String(q.pendientes || "") === "1") r = await pendientes(redis);
      else if (String(q.expediente || "") === "1") r = await expediente(redis, q);
      else if (String(q.documento || "") === "1") r = await documento(redis, q);
      else r = await hechos(redis, q);
    } else if (metodo === "POST") {
      const cuerpo = await leerCuerpo(req, { maxBytes: MAX_BYTES, que: "texto o captura" });
      if (!cuerpo.ok) return responder(res, cuerpo.status, { ok: false, error: cuerpo.error });
      const d = cuerpo.datos;
      if (!d || typeof d !== "object" || Array.isArray(d)) return responder(res, 400, { ok: false, error: "El cuerpo debe ser un objeto JSON." });
      r = d.captura !== undefined ? await guardarCaptura(redis, d) : await guardarTexto(redis, d);
    } else return responder(res, 405, { ok: false, error: "Solo GET o POST." });
    return responder(res, r.status, r.cuerpo);
  } catch (e) {
    return responder(res, 503, { ok: false, error: "No se pudo consultar o guardar en el almacén. Intente de nuevo en un momento.", detalle: String((e && e.message) || e).slice(0, 200) });
  }
};
module.exports.clavesDeEntidad = clavesDeEntidad;
