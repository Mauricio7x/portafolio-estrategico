/* ============================================================================
   /api/diagnostico · ¿En qué paso de la cascada se pierden los procesos?
   ----------------------------------------------------------------------------
   GET /api/diagnostico?token=…[&perfil=helder][&muestra=20][&anticipo_min=20]

   PROTEGIDO con el mismo HISTORICO_TOKEN (header `x-historico-token` o
   `?token=`), porque expone el contenido del corpus. SOLO LEE: no escribe, no
   toma candados, no dispara sincronizaciones.

   Responde el EMBUDO completo sobre el corpus activo, paso a paso y en el
   mismo orden en que corre la consulta real, con el conteo de bajas de cada
   filtro y el motivo. Es la herramienta para responder «¿por qué solo salen 5
   procesos?» con datos en vez de con intuiciones, y para volver a medir después
   de cada cambio de regla.

   Además de los conteos actuales calcula CONTRAFACTUALES: cuántos procesos
   pasarían si se relajara cada regla (match UNSPSC exacto vs por clase,
   anticipo mínimo, tope de capacidad…). Sin eso no se puede saber qué regla
   conviene tocar.

   Nota de granularidad UNSPSC (el hallazgo que motivó el endpoint): los 393
   códigos de los RUP terminan todos en "00" — están inscritos a nivel de CLASE.
   SECOP II publica muchas veces el PRODUCTO de esa clase. Por eso se reporta
   `unspsc.pasan_exacto` (comparación vieja, 8 dígitos) frente a
   `unspsc.pasan_por_clase` (la vigente, 6 dígitos): la diferencia es el número
   de procesos que la comparación exacta estaba tirando a la basura.
   ========================================================================== */
"use strict";

const crypto = require("crypto");
const { crearRedis, hayCredenciales } = require("../lib/redis.js");
const { CLAVES, leerChunksDedup, leerJSON } = require("../lib/almacen.js");
const { PERFILES, ALIAS_PERFIL, evaluarRup } = require("../lib/rup.js");
const {
  norm, modalidad_competitiva, estado_abierto, es_convenio,
  unspscClasesDe, claseDe, clasesDelRup, evaluarObjeto,
} = require("../lib/filtros.js");
const { SMMLV } = require("../lib/perfiles.js");

const MUESTRA_DEFAULT = 20, MUESTRA_MAX = 100;
const TOP = 25; // filas por tabla de distribución

function autorizar(req, q) {
  const esperado = process.env.HISTORICO_TOKEN || "";
  if (!esperado) return { ok: false, status: 503, error: "Defina HISTORICO_TOKEN para habilitar el diagnóstico." };
  const dado = String((req.headers && req.headers["x-historico-token"]) || q.token || "");
  const a = crypto.createHash("sha256").update(dado).digest();
  const b = crypto.createHash("sha256").update(esperado).digest();
  if (!crypto.timingSafeEqual(a, b)) return { ok: false, status: 401, error: "Token inválido o ausente (header «x-historico-token» o parámetro «token»)." };
  return { ok: true };
}

/* Conteo por valor, ordenado desc y recortado — para ver los valores REALES de
   las columnas del dataset, que es lo que nunca se pudo muestrear en vivo. */
function tabla(valores, tope = TOP) {
  const cuenta = new Map();
  for (const v of valores) {
    const k = (v === undefined || v === null || v === "") ? "(vacío)" : String(v);
    cuenta.set(k, (cuenta.get(k) || 0) + 1);
  }
  return Object.fromEntries([...cuenta.entries()].sort((a, b) => b[1] - a[1]).slice(0, tope));
}

const recortar = (s, n = 120) => (s ? String(s).slice(0, n) : "");

module.exports = async function handler(req, res) {
  const q = req.query || {};
  res.setHeader("Cache-Control", "no-store");

  const permiso = autorizar(req, q);
  if (!permiso.ok) return res.status(permiso.status).json({ ok: false, error: permiso.error });
  if (!hayCredenciales()) return res.status(503).json({ ok: false, error: "Faltan credenciales de Upstash Redis." });

  let perfilId = String(q.perfil || "helder").toLowerCase();
  if (Object.prototype.hasOwnProperty.call(ALIAS_PERFIL, perfilId)) perfilId = ALIAS_PERFIL[perfilId];
  if (!Object.prototype.hasOwnProperty.call(PERFILES, perfilId)) {
    return res.status(400).json({ ok: false, error: "perfil inválido: helder | genesis | juntos" });
  }
  const perfil = PERFILES[perfilId];
  const nMuestra = Math.min(Math.max(parseInt(q.muestra, 10) || MUESTRA_DEFAULT, 1), MUESTRA_MAX);
  const anticipoMin = q.anticipo_min !== undefined ? parseFloat(q.anticipo_min) || 0 : 20;

  const redis = crearRedis({});
  const t0 = Date.now();
  let filas, meta, clavesAct, clavesHist;
  try {
    meta = await leerJSON(redis, CLAVES.meta);
    clavesAct = await redis.scan(CLAVES.patronChunks);
    clavesHist = await redis.scan(CLAVES.patronChunksHist);
    filas = await leerChunksDedup(redis, clavesAct);
  } catch (e) {
    return res.status(502).json({ ok: false, error: `Redis: ${e.message}` });
  }

  const mesesDe = (claves, extraer) => new Set(claves.map(extraer).filter(Boolean)).size;

  /* ---------- embudo, en el mismo orden que la consulta real ---------- */
  const embudo = {
    total_activo: filas.length,
    fuera_modalidad: 0,
    fuera_estado: 0,
    fuera_convenio: 0,
    fuera_blacklist: 0,
    fuera_unspsc: 0,
    fuera_sin_unspsc_ni_obra: 0,
    fuera_anti_suministro: 0,
    fuera_capacidad_k: 0,
    fuera_tope_estrategico: 0,
    fuera_anticipo: 0,
    visibles: 0,
  };
  const contrafactuales = {
    pasarian_unspsc_exacto: 0,     // comparación vieja (8 dígitos)
    pasarian_unspsc_por_clase: 0,  // comparación vigente (6 dígitos)
    ganancia_por_clase: 0,
    visibles_sin_filtro_anticipo: 0,
    visibles_si_anticipo_10: 0,
    visibles_ignorando_capacidad: 0,
    visibles_incluyendo_cerradas: 0,
  };
  const motivosBlacklist = [];
  const clasesEnCorpus = [];
  const modalidadesFuera = [];
  const estadosFuera = [];
  const convenios = [];
  const muestra = [];
  const visibles = [];
  const rupClases = clasesDelRup(perfil.unspsc);

  for (const l of filas) {
    const paso = { objeto: recortar(l.nombre_del_procedimiento), entidad: l.entidad, unspsc: l.codigo_principal_de_categoria };
    for (const c of unspscClasesDe(l)) clasesEnCorpus.push(c);

    if (!modalidad_competitiva(l)) {
      embudo.fuera_modalidad++; modalidadesFuera.push(l.modalidad_de_contratacion); continue;
    }
    const abierta = l.proceso_abierto && estado_abierto(l);
    if (!abierta) {
      embudo.fuera_estado++;
      estadosFuera.push(`${l.estado_del_procedimiento || "(vacío)"} | ${l.fase || "(vacío)"}`);
    }

    // el objeto se evalúa aunque esté cerrada, para poder separar «la perdí por
    // estado» de «además la perdería por objeto»
    const ev = evaluarObjeto(l, perfil);
    if (!abierta) continue;

    if (ev.paso === "convenio") { embudo.fuera_convenio++; convenios.push(recortar(l.nombre_del_procedimiento, 90)); continue; }
    if (ev.paso === "blacklist") { embudo.fuera_blacklist++; motivosBlacklist.push(ev.termino); continue; }

    // contrafactual UNSPSC: exacto vs por clase, solo entre las que llegan aquí
    const clases = unspscClasesDe(l);
    if (clases.length) {
      const exacto = clases.some((c) => perfil.unspsc.has(c));
      const porClase = clases.some((c) => rupClases.has(claseDe(c)));
      if (exacto) contrafactuales.pasarian_unspsc_exacto++;
      if (porClase) contrafactuales.pasarian_unspsc_por_clase++;
      if (porClase && !exacto) contrafactuales.ganancia_por_clase++;
    }

    if (ev.paso === "unspsc") { embudo.fuera_unspsc++; continue; }
    if (ev.paso === "sin_unspsc_ni_obra") { embudo.fuera_sin_unspsc_ni_obra++; continue; }
    if (ev.paso === "anti_suministro") { embudo.fuera_anti_suministro++; continue; }

    // capacidad (K y tope estratégico), con el detalle del perfil consultado
    const rup = evaluarRup(l, perfilId);
    const dentroTope = (l.cuantia_cop || 0) <= perfil.topeSMMLV * SMMLV;
    if (!rup.capacidad_ok) {
      if (!dentroTope) embudo.fuera_tope_estrategico++; else embudo.fuera_capacidad_k++;
      contrafactuales.visibles_ignorando_capacidad++;
      continue;
    }
    contrafactuales.visibles_ignorando_capacidad++;
    contrafactuales.visibles_sin_filtro_anticipo++;
    if (!(l.anticipo_pct > 0 && l.anticipo_pct < 10)) contrafactuales.visibles_si_anticipo_10++;

    if (anticipoMin > 0 && l.anticipo_pct > 0 && l.anticipo_pct < anticipoMin) { embudo.fuera_anticipo++; continue; }

    embudo.visibles++;
    visibles.push(l);
    if (muestra.length < nMuestra) {
      muestra.push({
        ...paso,
        modalidad: l.modalidad_de_contratacion, estado: l.estado_del_procedimiento, fase: l.fase,
        cuantia_cop: l.cuantia_cop, anticipo_pct: l.anticipo_pct,
        k_cop: rup.k_cop, crpc_cop: rup.crpc_cop, fuente_unspsc: ev.fuente_unspsc,
      });
    }
  }

  // cerradas: cuántas se recuperarían al servirlas (solo para dimensionar)
  contrafactuales.visibles_incluyendo_cerradas = embudo.visibles + embudo.fuera_estado;

  /* ---------- distribuciones del corpus REAL ---------- */
  const distribuciones = {
    modalidad_de_contratacion: tabla(filas.map((l) => l.modalidad_de_contratacion)),
    estado_del_procedimiento: tabla(filas.map((l) => l.estado_del_procedimiento)),
    fase: tabla(filas.map((l) => l.fase)),
    modalidades_descartadas: tabla(modalidadesFuera),
    estado_fase_descartados: tabla(estadosFuera),
    blacklist_terminos_que_dispararon: tabla(motivosBlacklist),
    anticipo: {
      sin_dato_0: filas.filter((l) => !(l.anticipo_pct > 0)).length,
      entre_1_y_9: filas.filter((l) => l.anticipo_pct > 0 && l.anticipo_pct < 10).length,
      entre_10_y_19: filas.filter((l) => l.anticipo_pct >= 10 && l.anticipo_pct < 20).length,
      desde_20: filas.filter((l) => l.anticipo_pct >= 20).length,
    },
    cuantia_rango: tabla(filas.map((l) => l.cuantia_rango)),
  };

  /* ---------- cobertura UNSPSC ---------- */
  const cuentaClases = new Map();
  for (const c of clasesEnCorpus) cuentaClases.set(c, (cuentaClases.get(c) || 0) + 1);
  const distintas = [...cuentaClases.keys()];
  const cubiertasPorClase = distintas.filter((c) => rupClases.has(claseDe(c)));
  const cubiertasExacto = distintas.filter((c) => perfil.unspsc.has(c));
  const unspsc_cobertura = {
    clases_distintas_en_corpus: distintas.length,
    cubiertas_por_clase: cubiertasPorClase.length,
    cubiertas_exacto_8_digitos: cubiertasExacto.length,
    codigos_rup_del_perfil: perfil.unspsc.size,
    top_no_cubiertas: Object.fromEntries(
      [...cuentaClases.entries()].filter(([c]) => !rupClases.has(claseDe(c)))
        .sort((a, b) => b[1] - a[1]).slice(0, TOP)),
    top_cubiertas: Object.fromEntries(
      [...cuentaClases.entries()].filter(([c]) => rupClases.has(claseDe(c)))
        .sort((a, b) => b[1] - a[1]).slice(0, TOP)),
  };

  return res.status(200).json({
    ok: true,
    perfil: perfilId,
    generado: new Date().toISOString(),
    duracionMs: Date.now() - t0,
    corpus: {
      activo: { chunks: clavesAct.length, meses: mesesDe(clavesAct, CLAVES.mesDeClaveActiva), filas_unicas: filas.length },
      historico: { chunks: clavesHist.length, meses: mesesDe(clavesHist, CLAVES.mesDeClaveHist) },
      ultima_sincronizacion: meta ? meta.last_sync : null,
      ultima_full: meta ? meta.last_full : null,
      guardadas_por_la_full: meta ? meta.total : null,
      leidas_por_la_full: meta ? meta.leidas : null,
    },
    embudo,
    contrafactuales,
    distribuciones,
    unspsc_cobertura,
    convenios_detectados: convenios.slice(0, TOP),
    muestra,
    como_leerlo: "embudo va en orden: cada `fuera_*` son procesos que murieron en ESE paso y no llegaron al siguiente. "
      + "El paso con el número más alto es el que hay que revisar primero. "
      + "`contrafactuales` dice cuántos se recuperarían al relajar cada regla.",
  });
};
