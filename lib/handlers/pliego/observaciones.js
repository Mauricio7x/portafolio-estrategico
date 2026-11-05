/* lib/handlers/pliego/observaciones.js · /api/pliego?op=observaciones (5-nov-2026)
     GET  ?id_proceso=…&perfil=…            → el borrador guardado para este proceso y perfil, o
                                              hay_observaciones:false. NO lee el texto del pliego
                                              (pesa megas): lo guardado trae la versión del texto con
                                              que se verificó, y la pantalla la compara con la del
                                              dictamen que ya tiene.
     GET  …&expediente=1                    → el expediente para que una sesión de Claude Code
                                              (/observaciones) las escriba: instrucciones, esquema,
                                              entrada y pliego paginado.
     POST {id_proceso, perfil, motor:"sesion", observaciones} → las VERIFICA (lib/observaciones,
                                              con las piezas del dictamen) y las guarda.
     POST {id_proceso, perfil, pedir_sesion:true} → despierta la rutina del dictamen con
                                              `tarea=observaciones` (la habilidad /dictamen la
                                              remite a /observaciones): ninguna rutina ni variable
                                              nueva que configurar. Una vez por media hora y con el
                                              tope de pedidos sin respuesta (lib/rutina.pedirUnaVez).
   Con token, OBLIGATORIO: viajan las cifras del perfil. Toda excepción termina en 503 con
   instrucción, nunca en 500 mudo. Nada de esto envía nada a la entidad: es un borrador. */
"use strict";

const { crearRedis, hayCredenciales } = require("../../redis.js");
const { autorizarToken } = require("../../auth.js");
const { leerCuerpo } = require("../../cuerpo.js");
const { recargarPerfiles } = require("../../perfiles.js");
const { validarIdPerfil, cargarPerfilResuelto } = require("../../perfil_resolver.js");
const { hoyColombia } = require("../../habiles.js");
const { leerJSON, escribirJSONComprimido, leerJSONComprimido } = require("../../almacen.js");
const { textoGuardado, filaDe } = require("./cronograma.js");
const { ID_RE } = require("./diff.js");
const D = require("../../dictamen.js");
const O = require("../../observaciones.js");
const Rutina = require("../../rutina.js");

const MAX_BYTES = 256 * 1024;
const hayRutina = () => Boolean(process.env.RUTINA_DICTAMEN_URL && process.env.RUTINA_DICTAMEN_TOKEN);
const responder = (res, status, cuerpo) => res.status(status).json(cuerpo);
const conQueHacer = (id, valores) => ({ error: O.mensaje(id, valores), que_hacer: O.mensaje(`${id}_QUE_HACER`, valores) });
const horaColombia = (iso) => {
  const d = new Date(iso || Date.now());
  try { return d.toLocaleTimeString("es-CO", { timeZone: "America/Bogota", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }); } catch { return d.toISOString().slice(11, 16); }
};

module.exports = async function handler(req, res) {
  const q = req.query || {};
  res.setHeader("Cache-Control", "no-store");
  const permiso = await autorizarToken(req, q);
  if (!permiso.ok) return responder(res, permiso.status, { ok: false, error: permiso.error, ...(permiso.como_autenticar ? { como_autenticar: permiso.como_autenticar } : {}) });
  const metodo = String(req.method || "GET").toUpperCase();
  if (metodo !== "GET" && metodo !== "POST") {
    res.setHeader("Allow", "GET, POST");
    return responder(res, 405, { ok: false, ...conQueHacer("METODO") });
  }
  if (!hayCredenciales()) return responder(res, 503, { ok: false, ...conQueHacer("SIN_REDIS") });
  let datos = {};
  if (metodo === "POST") {
    const cuerpo = await leerCuerpo(req, { maxBytes: MAX_BYTES, que: "id_proceso" });
    if (!cuerpo.ok) return responder(res, cuerpo.status, { ok: false, error: cuerpo.error, que_hacer: O.mensaje("ID_INVALIDO_QUE_HACER") });
    datos = cuerpo.datos || {};
  }
  const id = String((metodo === "POST" ? datos.id_proceso : q.id_proceso) || "").trim();
  if (!ID_RE.test(id)) return responder(res, 400, { ok: false, ...conQueHacer("ID_INVALIDO") });
  const perfilPedido = String((metodo === "POST" ? datos.perfil : q.perfil) || "").trim();
  const idPerfil = validarIdPerfil(perfilPedido);
  if (!idPerfil.ok) return responder(res, 400, { ok: false, perfiles: idPerfil.perfiles, error: O.mensaje("PERFIL_INVALIDO", { perfil: perfilPedido }), que_hacer: O.mensaje("PERFIL_INVALIDO_QUE_HACER", { lista: idPerfil.perfiles.join(", ") }) });
  const perfilId = idPerfil.perfil;
  const valores = { id, perfil: perfilId };

  let redis;
  try { redis = crearRedis({}); } catch { return responder(res, 503, { ok: false, ...conQueHacer("SIN_REDIS") }); }
  try {
    const clave = O.claveObservaciones(id, perfilId);
    const clavePedido = O.clavePedido(id, perfilId);
    /* `como_pedirlas`: sin la rutina, cómo pedirlas a mano; lo dice el servidor, como el dictamen (ninguna pantalla nombra con qué está hecha la aplicación) */
    const base = { ok: true, id_proceso: id, perfil: perfilId, rutina_disponible: hayRutina(), borrador: O.mensaje("BORRADOR"), orden_sesion: `/observaciones ${id} ${perfilId}`,
      como_pedirlas: hayRutina() ? null : O.mensaje("PEDIR_SIN_RUTINA_QUE_HACER", valores) };

    /* GET sin expediente: lo guardado y el pedido en curso; el texto del pliego no se lee */
    if (metodo === "GET" && String(q.expediente || "") !== "1") {
      const [guardado, pedido] = await Promise.all([leerJSONComprimido(redis, clave), leerJSON(redis, clavePedido)]);
      if (guardado) return responder(res, 200, { ...base, ...guardado, hay_observaciones: true, pedido_sesion: pedido || null });
      return responder(res, 200, { ...base, hay_observaciones: false, pedido_sesion: pedido || null, ...conQueHacer("SIN_OBSERVACIONES") });
    }

    /* lo demás necesita el texto del pliego y el perfil */
    const t = await textoGuardado(redis, id);
    const meta = { ...base, version_texto: t.version, documento_texto: t.documento || null, texto_id: t.texto_id || null, hay_texto: !!t.texto };
    if (!t.texto) return responder(res, 200, { ...meta, hay_observaciones: false, ...conQueHacer("SIN_TEXTO") });

    if (metodo === "POST" && datos.pedir_sesion === true) {
      if (!hayRutina()) return responder(res, 503, { ...meta, ok: false, ...conQueHacer("PEDIR_SIN_RUTINA", valores) });
      const p = await Rutina.pedirUnaVez({
        redis, clavePedido, claveSinRespuesta: O.claveSinRespuesta(id, perfilId), versionTexto: t.texto_id,
        ttlSeg: D.PEDIDO_TTL_SEG, tope: D.LECTURAS_TOPE_SIN_RESPUESTA, ventanaSeg: D.LECTURAS_VENTANA_SEG,
        disparar: () => Rutina.despertar({
          url: process.env.RUTINA_DICTAMEN_URL, token: process.env.RUTINA_DICTAMEN_TOKEN,
          /* SOLO valores ya validados: `tarea` es un valor fijo que la habilidad /dictamen lee para remitir a /observaciones */
          texto: `Solicitud de observaciones al pliego de Detekta: tarea=observaciones id_proceso=${id} perfil=${perfilId}. Ejecute /observaciones ${id} ${perfilId}.`,
          que: "la redacción automática", quePlural: "redacciones automáticas", varUrl: "RUTINA_DICTAMEN_URL", varToken: "RUTINA_DICTAMEN_TOKEN",
        }),
      });
      if (p.estado === "repetida") return responder(res, 200, { ...meta, pedido_sesion: p.previo, hay_observaciones: false, repetida: true, ...conQueHacer("YA_PEDIDA", { hora: horaColombia(p.previo.el) }) });
      if (p.estado === "tope") return responder(res, 200, { ...meta, pedido_sesion: null, hay_observaciones: false, tope_alcanzado: true, ...conQueHacer("TOPE", { veces: p.veces, ...valores }) });
      if (p.estado === "no_arranco") return responder(res, 200, { ...meta, pedido_sesion: p.registrado, hay_observaciones: false, ...conQueHacer("NO_ARRANCO", { motivo: p.motivo, ...valores }) });
      return responder(res, 200, { ...meta, pedido_sesion: p.registrado, hay_observaciones: false, ...conQueHacer(p.estado === "indeterminada" ? "INDETERMINADA" : "PEDIDA") });
    }

    await recargarPerfiles(redis);
    const cargado = await cargarPerfilResuelto(redis, idPerfil);
    if (!cargado.ok) return responder(res, cargado.status, { ok: false, perfil_caducado: true, error: cargado.error, que_hacer: cargado.error });
    let fila = null;
    try { fila = await filaDe(redis, id); } catch { fila = null; }
    /* la MISMA entrada del dictamen: las cifras que respaldan una observación salen de aquí o del pliego */
    const entrada = D.armarEntrada({ fila, perfil: cargado.perfil, perfilId, idProceso: id, texto: t.texto, version: t, hoy: hoyColombia(Date.now()) });
    const proceso = { id, entidad: fila && fila.entidad ? String(fila.entidad) : null, objeto: fila && fila.nombre_del_procedimiento ? String(fila.nombre_del_procedimiento).slice(0, 600) : null, modalidad: fila && fila.modalidad_de_contratacion ? String(fila.modalidad_de_contratacion) : null };

    if (metodo === "GET") {
      const paginado = D.textoPaginado(t.texto);
      return responder(res, 200, {
        ...meta, expediente: true, proceso, version_instrucciones: O.PROMPT_VERSION,
        instrucciones: O.PROMPT_SISTEMA, esquema: O.ESQUEMA_SALIDA, entrada, texto_paginado: paginado.texto, paginas: paginado.paginas_presentes,
        dictamen: { como_pedirlo: `GET /api/pliego?op=dictamen&id_proceso=${id}&perfil=${perfilId}`, nota: "Es el dictamen que la pantalla enseña para este proceso y perfil: el de la sesión si existe; si no, la lectura por reglas." },
        como_devolver: { metodo: "POST", url: "/api/pliego?op=observaciones", cuerpo: { id_proceso: id, perfil: perfilId, motor: "sesion", observaciones: "<el objeto con la forma de «esquema»>" }, cabecera: "x-historico-token" },
      });
    }

    if (String(datos.motor || "") !== "sesion" || !datos.observaciones || typeof datos.observaciones !== "object" || Array.isArray(datos.observaciones)) {
      return responder(res, 400, { ...meta, ok: false, ...conQueHacer("SESION_SIN_OBSERVACIONES") });
    }
    const v = O.verificarObservaciones(datos.observaciones, t.texto, entrada);
    if (!v.ok) return responder(res, 400, { ...meta, ok: false, motivo: "forma", detalle: v.detalle, ...conQueHacer("SESION_FORMA") });
    const resultado = {
      generado: new Date().toISOString(), version_instrucciones: O.PROMPT_VERSION, proceso,
      version_texto: t.version, documento_texto: t.documento || null, texto_id: t.texto_id || null,
      resumen: v.resumen, observaciones: v.observaciones, no_verificados: v.no_verificados, verificacion: v.verificacion,
    };
    await escribirJSONComprimido(redis, clave, resultado, { ttl: O.OBSERVACIONES_TTL_SEG });
    /* llegaron: el pedido de la pantalla queda atendido y la cuenta de pedidos sin respuesta vuelve a cero */
    await redis.del(clavePedido, O.claveSinRespuesta(id, perfilId));
    return responder(res, 200, { ...meta, ...resultado, hay_observaciones: true, pedido_sesion: null });
  } catch (e) {
    return responder(res, 503, { ok: false, ...conQueHacer("CAIDO"), detalle: String((e && e.message) || e).slice(0, 200) });
  }
};
