/* lib/handlers/pliego/diff.js · /api/pliego?op=diff (Fase 5 · vigía del TEXTO del pliego)
     POST {id_proceso, texto, nombre_archivo, perfil?}  → registra la versión (hash + texto
          normalizado en pliego:{proceso}:v:{n}); si cambió, el diff por párrafos en
          pliego:{proceso}:diff:{n} y los habilitantes reevaluados contra el perfil.
          SOLO si el nombre del archivo dice que es el pliego (ver `queSeCargo`); si no,
          200 con {ok:false, no_es_el_pliego:true, motivo, error} y no se guarda nada.
     GET  ?id_proceso=…&perfil=…               → versiones y último diff (reevaluado).
   Con token (el texto de un pliego es público, pero la reevaluación habla del
   perfil). Cuerpo hasta 3 MB (el texto de un pliego de 120 páginas son ~0,34 MB). */
"use strict";

const { crearRedis, hayCredenciales } = require("../../redis.js");
const { autorizarToken } = require("../../auth.js");
const { leerCuerpo } = require("../../cuerpo.js");
const D = require("../../diff.js");
const Docs = require("../../documentos_proceso.js");

const MAX_BYTES = 3 * 1024 * 1024;
/* La forma de un id de proceso de SECOP II. La exporta (2-sep-2026) porque el
   dictamen del pliego valida el mismo id: dos regex «iguales» divergen. */
const ID_RE = /^[A-Za-z0-9._-]{3,120}$/;

/* LO QUE SE CARGA EN PRECIOS NO SIEMPRE ES EL PLIEGO (18-oct-2026). La pantalla pide también el
   Formulario 1 de cantidades, y TODO archivo leído con un proceso abierto entraba aquí como «versión
   del pliego»: el dictamen, el cronograma y los descuentos leían el formulario (main pasaba de «no
   conviene presentarse» a «falta información» y los descuentos del 4,5 % quedaban sin dato), y el
   vigía comparaba el pliego contra él. Ahora decide el NOMBRE del archivo, con la misma regla de la
   lectura automática (`Docs.clasificarArchivo` + `Docs.esVersionDelPliego`): pliego, borrador o
   documento base se guardan; lo demás no. Un nombre que no dice qué es (o que no llega) tampoco: ante
   la duda no se dictamina sobre un texto desconocido (decisión del dueño). Medido en 18.166 archivos
   reales de dmgg-8hin: los 40 nombres que juntan «presupuesto» y «pliego» son el Formulario 1; el
   único pliego que la regla rechaza es uno con «adenda» en el nombre, y el mensaje dice qué hacer. */
function queSeCargo(nombreDado) {
  const nombre = String(nombreDado || "").trim().slice(0, 160);
  if (!nombre) return { guardar: false, motivo: "sin_nombre", archivo: null };
  const archivo = Docs.clasificarArchivo({ nombre_archivo: nombre });
  if (Docs.esVersionDelPliego(archivo)) return { guardar: true, motivo: null, archivo };
  const motivo = archivo.tipo === "presupuesto" ? "formulario"
    : archivo.tipo === "adenda" ? "adenda"
      : archivo.tipo === "otro" ? "sin_nombre"
        : (archivo.tipo === "pliego" || archivo.tipo === "pliego_borrador" || archivo.tipo === "documento_base") ? "acompana_al_pliego"
          : "otro_documento";
  return { guardar: false, motivo, archivo };
}
const NO_SE_GUARDA = "no se guarda como versión del pliego, así que el dictamen, el cronograma y los descuentos siguen leyendo el pliego";
function fraseNoEsElPliego({ motivo, archivo }) {
  const comillas = archivo && archivo.nombre ? ` («${archivo.nombre}»)` : "";
  if (motivo === "formulario") return `Por su nombre${comillas}, este archivo es el formulario de cantidades (presupuesto oficial), no el pliego: sirve para el precio, pero ${NO_SE_GUARDA}`;
  if (motivo === "adenda") return `Por su nombre${comillas}, este archivo es una adenda, no el pliego completo: ${NO_SE_GUARDA}. Si es el pliego con la adenda ya incorporada, cárguelo con un nombre que no diga «adenda»`;
  if (motivo === "acompana_al_pliego") return `Por su nombre${comillas}, este archivo es un anexo, un formato o unas observaciones del pliego, no el pliego: ${NO_SE_GUARDA}`;
  if (motivo === "otro_documento") return `Por su nombre${comillas}, este archivo es «${String(archivo.tipo_legible || "otro documento").toLowerCase()}», no el pliego: ${NO_SE_GUARDA}`;
  return `Por el nombre del archivo${comillas} no se sabe si es el pliego, así que ${NO_SE_GUARDA}. Si es el pliego, descárguelo de SECOP II y cárguelo con su nombre original, el que dice «pliego» o «documento base»`;
}

module.exports = async function handler(req, res) {
  const q = req.query || {};
  res.setHeader("Cache-Control", "no-store");
  const permiso = await autorizarToken(req, q);
  if (!permiso.ok) return res.status(permiso.status).json({ ok: false, error: permiso.error });
  if (!hayCredenciales()) return res.status(503).json({ ok: false, error: "Faltan credenciales de Upstash Redis." });
  const redis = crearRedis({});
  const metodo = String(req.method || "GET").toUpperCase();
  if (metodo === "GET") {
    const id = String(q.id_proceso || "").trim();
    if (!ID_RE.test(id)) return res.status(400).json({ ok: false, error: "Falta ?id_proceso= (el id del proceso en SECOP II)." });
    const r = await D.ultimoDiff(redis, id, String(q.perfil || "").trim() || null);
    return res.status(200).json({ ok: true, id_proceso: id, ...r, cambio: !!(r.diff), como_leerlo: "«diff.habilitantes.cambios» es lo que importa: cada requisito que cambió, con «le afecta» decidido contra el perfil. El diff de párrafos viaja para quien lo quiera ver." });
  }
  if (metodo !== "POST") { res.setHeader("Allow", "GET, POST"); return res.status(405).json({ ok: false, error: "Use POST {id_proceso, texto, perfil?}." }); }
  const cuerpo = await leerCuerpo(req, { maxBytes: MAX_BYTES });
  if (!cuerpo.ok) return res.status(cuerpo.status).json({ ok: false, error: cuerpo.error });
  const datos = cuerpo.datos || {};
  const id = String(datos.id_proceso || "").trim();
  if (!ID_RE.test(id)) return res.status(400).json({ ok: false, error: "Falta id_proceso (el id del proceso en SECOP II, p. ej. CO1.REQ.123)." });
  const texto = String(datos.texto || "");
  if (texto.trim().length < 50) return res.status(400).json({ ok: false, error: "El texto del pliego llegó vacío o demasiado corto para vigilarlo." });
  const que = queSeCargo(datos.nombre_archivo);
  /* 200 y no 4xx: no es un fallo, es una respuesta; `ok:false` hace que un navegador con el código
     de antes diga «No se pudo guardar la versión del pliego: <motivo>», que es la verdad */
  if (!que.guardar) return res.status(200).json({ ok: false, id_proceso: id, guardada: false, no_es_el_pliego: true, motivo: que.motivo, tipo: que.archivo ? que.archivo.tipo : null, error: fraseNoEsElPliego(que) });
  // el origen lleva el nombre: lo cargado a mano deja de ser anónimo (textoGuardado lo trata igual: no empieza por «documentos:»)
  const r = await D.registrarVersion(redis, { idProceso: id, texto, origen: `lector:${que.archivo.nombre}`.slice(0, 40), perfilId: String(datos.perfil || "").trim() || null });
  return res.status(200).json({
    ok: true, id_proceso: id, ...r,
    mensaje: r.cambio ? "La entidad cambió las reglas de este proceso desde la última vez que lo abrió." : (r.version === 1 ? "Primera vez que se guarda este pliego: a partir de ahora, cada vez que lo abra se comparará con esta versión." : "El pliego no cambió desde la última vez."),
  });
};
module.exports.ID_RE = ID_RE;
module.exports.queSeCargo = queSeCargo;
