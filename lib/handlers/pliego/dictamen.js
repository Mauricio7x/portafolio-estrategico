/* lib/handlers/pliego/dictamen.js · /api/pliego?op=dictamen (proyecto «Don Héctor», 2-sep-2026)
     GET  ?id_proceso=…&perfil=…              → SOLO caché: el dictamen guardado para esta
                                                versión del pliego, del perfil y de la fila,
                                                o hay_dictamen:false. Nunca llama al modelo,
                                                nunca toma el candado, nunca gasta cuota.
     POST {id_proceso, perfil, refrescar?, esfuerzo?} → pide el dictamen al modelo (o lo
                                                sirve de caché), lo VERIFICA y lo guarda.
   Con token, OBLIGATORIO: viajan las cifras del perfil y cada llamada cuesta dinero.
   Orden fijo del handler (lib/handlers/pliego/diff.js es la receta): Cache-Control →
   token → método → credenciales de Redis → cuerpo → id → perfil (la MISMA vía que el
   listado) → clave del modelo → candado → caché → cuota → fila y texto → entrada →
   llamada → verificación → guardar → responder. Toda excepción termina en 503 con
   instrucción, nunca en 500 mudo. La clave del modelo solo vive en la cabecera
   x-api-key: jamás en cuerpo, URL, log ni respuesta; ningún texto remoto se reenvía. */
"use strict";

const crypto = require("crypto");
const { crearRedis, hayCredenciales } = require("../../redis.js");
const { autorizarToken } = require("../../auth.js");
const { leerCuerpo } = require("../../cuerpo.js");
const { recargarPerfiles } = require("../../perfiles.js");
const { validarIdPerfil, cargarPerfilResuelto } = require("../../perfil_resolver.js");
const { hoyColombia } = require("../../habiles.js");
const { leerJSON, escribirJSONComprimido, leerJSONComprimido, DICTAMEN_TTL_SEG, DICTAMEN_GRIS_TTL_SEG } = require("../../almacen.js");
const { textoGuardado, filaDe } = require("./cronograma.js");
const { ID_RE } = require("./diff.js");
const D = require("../../dictamen.js");

const MAX_BYTES = 8 * 1024;
const USO_TTL_SEG = 13 * 30 * 24 * 3600;
const CUOTA_TTL_SEG = 2 * 24 * 3600;

const esperar = (ms) => new Promise((r) => setTimeout(r, ms));
const responder = (res, status, cuerpo) => res.status(status).json(cuerpo);
const conQueHacer = (id, valores) => ({ error: D.mensaje(id, valores), que_hacer: D.mensaje(`${id}_QUE_HACER`, valores) });

/* Una llamada al modelo con reloj, y UN reintento solo cuando la respuesta lo
   admite (429/529/5xx/red), la espera cabe (≤ 20 s) y queda presupuesto
   (≥ 25 s). Un 4xx no se reintenta: repetirlo cuesta lo mismo y da lo mismo. */
async function llamarModelo(peticion, { t0, presupuesto, fetchImpl }) {
  let llamadas = 0;
  for (;;) {
    const restante = presupuesto - (Date.now() - t0);
    const limite = Math.max(50, restante - 2000);
    let r = null;
    llamadas++;
    try {
      r = await fetchImpl(peticion.url, {
        method: "POST", headers: peticion.headers, body: JSON.stringify(peticion.body),
        signal: AbortSignal.timeout ? AbortSignal.timeout(limite) : undefined,
      });
    } catch (e) {
      const nombre = e && e.name;
      if (nombre === "TimeoutError" || nombre === "AbortError") return { tipo: "tiempo", llamadas };
      const quedan = presupuesto - (Date.now() - t0);
      if (llamadas === 1 && quedan - 2000 >= D.REINTENTO_RESTANTE_MIN_MS) { await esperar(2000); continue; }
      return { tipo: "red", llamadas };
    }
    /* el parseo del JSON va APARTE del fetch: el muro del edge responde HTML */
    let json = null;
    try { json = await r.json(); } catch { json = null; }
    const retryAfter = r.headers && typeof r.headers.get === "function" ? r.headers.get("retry-after") : null;
    const c = D.interpretarRespuesta({ status: r.status, json, retryAfter });
    if (c.tipo === "reintentable") {
      const quedan = presupuesto - (Date.now() - t0);
      if (llamadas === 1 && c.esperaMs <= D.REINTENTO_ESPERA_MAX_MS && quedan - c.esperaMs >= D.REINTENTO_RESTANTE_MIN_MS) { await esperar(c.esperaMs); continue; }
      return { tipo: "saturado", status: c.status, llamadas };
    }
    return { ...c, llamadas };
  }
}

module.exports = async function handler(req, res) {
  const q = req.query || {};
  res.setHeader("Cache-Control", "no-store");
  const t0 = Date.now();
  const permiso = autorizarToken(req, q);
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
    if (!cuerpo.ok) return responder(res, cuerpo.status, { ok: false, error: cuerpo.error, que_hacer: D.mensaje("ID_INVALIDO_QUE_HACER") });
    datos = cuerpo.datos || {};
  }
  const id = String((metodo === "POST" ? datos.id_proceso : q.id_proceso) || "").trim();
  if (!ID_RE.test(id)) return responder(res, 400, { ok: false, ...conQueHacer("ID_INVALIDO") });
  const perfilPedido = String((metodo === "POST" ? datos.perfil : q.perfil) || "").trim();
  const idPerfil = validarIdPerfil(perfilPedido);
  if (!idPerfil.ok) {
    return responder(res, 400, { ok: false, perfiles: idPerfil.perfiles, error: D.mensaje("PERFIL_INVALIDO", { perfil: perfilPedido }), que_hacer: D.mensaje("PERFIL_INVALIDO_QUE_HACER", { lista: idPerfil.perfiles.join(", ") }) });
  }
  const perfilId = idPerfil.perfil;
  const esfuerzo = D.esfuerzoDe(metodo === "POST" ? datos.esfuerzo : q.esfuerzo);
  const refrescar = metodo === "POST" && datos.refrescar === true;
  const modelo = D.modeloDe();
  const respaldo = D.respaldoActivo();
  const presupuesto = D.presupuestoMs();

  let redis;
  try { redis = crearRedis({}); } catch (e) { return responder(res, 503, { ok: false, ...conQueHacer("SIN_REDIS") }); }

  const candado = D.claveCandado(id, perfilId);
  const testigo = crypto.randomBytes(8).toString("hex");
  let candadoTomado = false;
  try {
    await recargarPerfiles(redis);
    const cargado = await cargarPerfilResuelto(redis, idPerfil);
    if (!cargado.ok) return responder(res, cargado.status, { ok: false, perfil_caducado: true, error: cargado.error, que_hacer: cargado.error });
    const perfil = cargado.perfil;

    /* fila y texto: sin texto guardado no hay nada que leer, y es un RESULTADO */
    const t = await textoGuardado(redis, id);
    const hoy = hoyColombia(Date.now());
    const base = { ok: true, id_proceso: id, perfil: perfilId, version_texto: t.version, hay_texto: !!t.texto };
    if (!t.texto) return responder(res, 200, { ...base, hay_dictamen: false, en_curso: false, ...conQueHacer("SIN_TEXTO") });
    let fila = null;
    try { fila = await filaDe(redis, id); } catch { fila = null; }
    let cambiosHabilitantes = null;
    try {
      const diff = require("../../diff.js");
      const u = await diff.ultimoDiff(redis, id, perfilId);
      cambiosHabilitantes = u && u.diff && u.diff.habilitantes ? u.diff.habilitantes.cambios || null : null;
    } catch { cambiosHabilitantes = null; }
    const entrada = D.armarEntrada({ fila, perfil, perfilId, idProceso: id, texto: t.texto, version: t, hoy, cambiosHabilitantes });
    const h = D.claveCache({ hashTexto: t.hash, modelo, esfuerzo, perfilEntrada: entrada.perfil, fila });
    const clave = D.claveDictamen(id, perfilId, h);
    const paginado = D.textoPaginado(t.texto);
    const meta = {
      ...base, version_texto: t.version, paginas: paginado.paginas_presentes, paginas_vacias: paginado.paginas_vacias,
      recortado: !!t.recortado, modelo_pedido: modelo, esfuerzo, version_instrucciones: D.PROMPT_VERSION,
      advertencia: D.MENSAJES.ADVERTENCIA,
      /* lo que la app YA midió, para la franja de la pantalla: se pinta desde la
         entrada (fila y perfil), nunca desde el texto del modelo */
      lecturas: entrada.lecturas_de_la_app.requisitos_numericos,
      capacidad_disponible_cop: entrada.perfil.capacidad_de_contratacion_disponible_cop,
      capacidad_nota: entrada.perfil.nota_capacidad || null,
    };

    /* caché (GET y POST sin refrescar) */
    if (!refrescar) {
      const guardado = await leerJSONComprimido(redis, clave);
      if (guardado) return responder(res, 200, { ...guardado, ...meta, cache: true, duracionMs: Date.now() - t0 });
    }
    if (metodo === "GET") {
      const enCurso = !!(await redis.get(candado));
      return responder(res, 200, { ...meta, hay_dictamen: false, en_curso: enCurso, cache: false, ...(enCurso ? conQueHacer("EN_CURSO") : conQueHacer("SIN_DICTAMEN")) });
    }

    /* POST: clave del modelo ANTES de tocar la red o gastar cuota */
    if (!D.hayClaveIa()) return responder(res, 503, { ok: false, ia_configurada: false, ...meta, error: D.MENSAJE_SIN_CLAVE_IA, que_hacer: D.mensaje("SIN_CLAVE_IA_QUE_HACER") });

    /* candado atado al mismo reloj que la función */
    const ex = Math.ceil(presupuesto / 1000) + 10;
    const tomado = await redis.set(candado, testigo, { nx: true, ex });
    if (!tomado) return responder(res, 200, { ...meta, hay_dictamen: false, en_curso: true, cache: false, ...conQueHacer("EN_CURSO") });
    candadoTomado = true;

    /* cuota diaria: TODA llamada al modelo la consume, incluida la fallida */
    const cuota = D.cuotaDia();
    const claveCuota = D.claveCuota(hoy);
    const usados = Number(await redis.get(claveCuota)) || 0;
    if (usados >= cuota) return responder(res, 429, { ok: false, ...meta, cuota, usados, ...conQueHacer("CUOTA", { cuota, usados }) });
    await redis.set(claveCuota, String(usados + 1), { ex: CUOTA_TTL_SEG });

    const peticion = D.construirPeticion({ entrada, textoPaginado: paginado.texto, clave: process.env.ANTHROPIC_API_KEY, modelo, esfuerzo, respaldo });
    const r = await llamarModelo(peticion, { t0, presupuesto, fetchImpl: globalThis.fetch });
    const segundos = Math.round(presupuesto / 1000);
    if (r.tipo === "tiempo") return responder(res, 504, { ok: false, ...meta, motivo: "tiempo", ...conQueHacer("TIEMPO", { segundos }) });
    if (r.tipo === "red") return responder(res, 503, { ok: false, ...meta, motivo: "red", ...conQueHacer("RED") });
    if (r.tipo === "saturado") return responder(res, 503, { ok: false, ...meta, motivo: "saturado", ...conQueHacer("SATURADO") });
    if (r.tipo === "clave_rechazada") return responder(res, 502, { ok: false, ...meta, motivo: "clave_rechazada", ...conQueHacer("CLAVE_RECHAZADA") });
    if (r.tipo === "rechazada") return responder(res, 502, { ok: false, ...meta, motivo: "rechazada", tipo_remoto: r.tipo_remoto, ...conQueHacer("RECHAZADA_REMOTA", { tipo_remoto: r.tipo_remoto || "sin código" }) });
    if (r.tipo === "rechazado") return responder(res, 200, { ...meta, hay_dictamen: false, en_curso: false, cache: false, modelo: r.modelo, motivo: "rechazado_por_el_modelo", ...conQueHacer("RECHAZADO") });
    if (r.tipo === "incompleto") return responder(res, 502, { ok: false, ...meta, motivo: "incompleto", modelo: r.modelo, ...conQueHacer("INCOMPLETO") });
    if (r.tipo !== "ok") return responder(res, 502, { ok: false, ...meta, motivo: "ilegible", ...conQueHacer("ILEGIBLE") });

    const v = D.verificarDictamen(r.dictamen, t.texto, entrada);
    if (!v.ok) return responder(res, 502, { ok: false, ...meta, motivo: "ilegible", detalle: v.detalle, ...conQueHacer("ILEGIBLE") });

    const generado = new Date().toISOString();
    const resultado = {
      ok: true, hay_dictamen: true, en_curso: false, generado,
      modelo: r.modelo, dictamen: v.dictamen, no_verificados: v.no_verificados,
      verificacion: { ...v.verificacion, respaldo: r.respaldo || [] }, uso: r.uso, avisos: v.avisos,
      ...(v.gris ? { que_hacer: D.mensaje("GRIS_QUE_HACER") } : {}),
    };
    await escribirJSONComprimido(redis, clave, resultado, { ttl: v.gris ? DICTAMEN_GRIS_TTL_SEG : DICTAMEN_TTL_SEG });

    /* uso del mes: se acumula, nunca se sobrescribe */
    const mes = hoy.slice(0, 7);
    const claveUso = D.claveUso(mes);
    const uso = (await leerJSON(redis, claveUso)) || { dictamenes: 0, entrada_tokens: 0, salida_tokens: 0, lista: [] };
    uso.dictamenes += 1;
    uso.entrada_tokens += r.uso.entrada_tokens || 0;
    uso.salida_tokens += r.uso.salida_tokens || 0;
    uso.lista = [...(uso.lista || []), { id, perfil: perfilId, fecha_hora: generado, modelo: r.modelo, esfuerzo, entrada_tokens: r.uso.entrada_tokens, salida_tokens: r.uso.salida_tokens, duracionMs: Date.now() - t0 }].slice(-500);
    await redis.set(claveUso, JSON.stringify(uso), { ex: USO_TTL_SEG });

    return responder(res, 200, {
      ...resultado, ...meta, cache: false, duracionMs: Date.now() - t0,
      uso_mes: { dictamenes: uso.dictamenes, entrada_tokens: uso.entrada_tokens, salida_tokens: uso.salida_tokens },
    });
  } catch (e) {
    return responder(res, 503, { ok: false, ...conQueHacer("CAIDO"), detalle: String((e && e.message) || e).slice(0, 200) });
  } finally {
    if (candadoTomado) {
      try { if ((await redis.get(candado)) === testigo) await redis.del(candado); } catch { /* el candado caduca solo */ }
    }
  }
};
