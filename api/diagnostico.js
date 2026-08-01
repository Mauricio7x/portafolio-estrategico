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

   Dos invariantes que las pruebas fijan:
     · los pasos SUMAN el total (nadie desaparece sin quedar contado);
     · `embudo.visibles` == el `total` de /api/oportunidades con el mismo perfil.

   Además calcula CONTRAFACTUALES: cuánto aporta cada mecanismo nuevo frente a
   la regla vieja (prefijo de 6 dígitos) y cuántos procesos se recuperarían al
   relajar cada regla. Sin eso no se puede saber qué regla conviene tocar.

     ganancia_por_jerarquia    match jerárquico (familia↔clase, niveles bien
                               leídos) que el prefijo de 6 dígitos perdía
     ganancia_por_equivalencias clases afines aprendidas del histórico
     ganancia_por_texto        objetos de obra rescatados por la co-señal
     pasarian_unspsc_exacto    la comparación original de 8 dígitos
   ========================================================================== */
"use strict";

const crypto = require("crypto");
const { crearRedis, hayCredenciales } = require("../lib/redis.js");
const { CLAVES, leerChunksDedup, leerJSON, leerJSONComprimido } = require("../lib/almacen.js");
const { PERFILES, ALIAS_PERFIL, evaluarRup } = require("../lib/rup.js");
const { modalidad_competitiva, estado_abierto, evaluarObjeto } = require("../lib/filtros.js");
const {
  codigosDeLicitacion, normalizarCodigo, indiceDe, emparejar, cubiertoPorPrefijo, claseDe,
} = require("../lib/unspsc.js");
const { leerEquivalencias, leerEquivalenciasMeta, explicarEquivalencias } = require("../lib/equivalencias.js");
const { vocabularioActivo } = require("../lib/texto_unspsc.js");
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
  let filas, meta, clavesAct, clavesHist, equivalencias = null, eqMeta = null, vocabRedis = null, vocMeta = null;
  try {
    meta = await leerJSON(redis, CLAVES.meta);
    clavesAct = await redis.scan(CLAVES.patronChunks);
    clavesHist = await redis.scan(CLAVES.patronChunksHist);
    filas = await leerChunksDedup(redis, clavesAct);
    eqMeta = await leerEquivalenciasMeta(redis);
    if (eqMeta && !eqMeta.vacio) equivalencias = await leerEquivalencias(redis);
    vocMeta = await leerJSON(redis, CLAVES.vocabularioMeta);
    if (vocMeta) vocabRedis = await leerJSONComprimido(redis, CLAVES.vocabulario);
  } catch (e) {
    return res.status(502).json({ ok: false, error: `Redis: ${e.message}` });
  }
  const vocabulario = vocabularioActivo(vocabRedis);
  const conocimiento = { equivalencias, vocabulario };
  const idxPerfil = indiceDe(perfil.unspsc);

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
    fuera_objeto_generico: 0,
    fuera_no_pertinente: 0,
    fuera_texto_debil: 0,
    fuera_anti_suministro: 0,
    fuera_capacidad_k: 0,
    fuera_tope_estrategico: 0,
    fuera_anticipo: 0,
    visibles: 0,
  };
  const contrafactuales = {
    pasarian_unspsc_exacto: 0,       // comparación original (8 dígitos)
    pasarian_unspsc_prefijo: 0,      // la regla anterior (prefijo de 6 dígitos)
    pasarian_unspsc_jerarquico: 0,   // la vigente (niveles + bidireccional)
    ganancia_por_jerarquia: 0,       // jerárquico y NO prefijo
    ganancia_por_equivalencias: 0,   // rescatados por afinidad histórica
    ganancia_por_texto: 0,           // rescatados por la co-señal del objeto
    visibles_sin_filtro_anticipo: 0,
    visibles_si_anticipo_10: 0,
    visibles_ignorando_capacidad: 0,
    visibles_incluyendo_cerradas: 0,
    visibles_sin_capa_pertinencia: 0,
    visibles_incluyendo_texto_debil: 0,  // lo que aparecería con el toggle encendido
  };
  const porTier = { clase: 0, familia: 0, equivalente: 0, texto: 0 };
  const porPertinencia = { verde: 0, amarillo: 0, rojo: 0 };
  const motivosBlacklist = [];
  const terminosNoPertinentes = [];
  const noPertinentes = [];
  const genericos = [];
  const textoDebil = [];
  const clasesEnCorpus = [];
  const codigosInvalidos = [];
  const modalidadesFuera = [];
  const estadosFuera = [];
  const convenios = [];
  const muestra = [];
  const rescatados = [];
  const rupClases = idxPerfil.clases;

  for (const l of filas) {
    const paso = { objeto: recortar(l.nombre_del_procedimiento), entidad: l.entidad, unspsc: l.codigo_principal_de_categoria };
    const { codigos, invalidos } = codigosDeLicitacion(l);
    for (const c of codigos) clasesEnCorpus.push(c.codigo);
    for (const bruto of invalidos) codigosInvalidos.push(bruto);

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
    const ev = evaluarObjeto(l, perfil, conocimiento);
    if (!abierta) continue;

    if (ev.paso === "convenio") { embudo.fuera_convenio++; convenios.push(recortar(l.nombre_del_procedimiento, 90)); continue; }
    if (ev.paso === "blacklist") { embudo.fuera_blacklist++; motivosBlacklist.push(ev.termino); continue; }

    /* contrafactuales de UNSPSC, solo entre las que llegan aquí:
       exacto (8 díg) ⊂ prefijo (6 díg) ⊂ jerárquico (+ familia↔clase) */
    if (codigos.length) {
      const ocho = codigos.map((c) => c.codigo);
      const exacto = ocho.some((c) => perfil.unspsc.has(c));
      const prefijo = cubiertoPorPrefijo(ocho, idxPerfil);
      const jerarquico = emparejar(codigos, idxPerfil).tier !== "ninguno";
      if (exacto) contrafactuales.pasarian_unspsc_exacto++;
      if (prefijo) contrafactuales.pasarian_unspsc_prefijo++;
      if (jerarquico) contrafactuales.pasarian_unspsc_jerarquico++;
      if (jerarquico && !prefijo) {
        contrafactuales.ganancia_por_jerarquia++;
        if (rescatados.length < TOP) rescatados.push({ por: "jerarquia", codigo: ocho.join(" "), objeto: recortar(l.nombre_del_procedimiento, 80) });
      }
    }
    if (ev.tier === "equivalente") {
      contrafactuales.ganancia_por_equivalencias++;
      if (rescatados.length < TOP) rescatados.push({ por: "equivalencia", codigo: ev.unspsc.codigo_proceso, rup: ev.unspsc.codigo_rup, objeto: recortar(l.nombre_del_procedimiento, 80) });
    }
    if (ev.tier === "texto") {
      contrafactuales.ganancia_por_texto++;
      if (rescatados.length < TOP) rescatados.push({ por: "texto", familia: ev.unspsc.familia_sugerida || null, objeto: recortar(l.nombre_del_procedimiento, 80) });
    }

    if (ev.paso === "unspsc") { embudo.fuera_unspsc++; continue; }
    if (ev.paso === "sin_unspsc_ni_obra") { embudo.fuera_sin_unspsc_ni_obra++; continue; }
    if (ev.paso === "objeto_generico") {
      embudo.fuera_objeto_generico++;
      if (genericos.length < TOP) {
        genericos.push({ objeto: recortar(l.nombre_del_procedimiento, 90), unspsc: l.codigo_principal_de_categoria, motivo: ev.pertinencia && ev.pertinencia.motivo });
      }
      continue;
    }
    if (ev.paso === "texto_debil") {
      // no es un descarte «duro»: es lo que el toggle «Incluir procesos sin
      // código UNSPSC» vuelve a mostrar. Se cuenta aparte para poder medirlo.
      embudo.fuera_texto_debil++;
      contrafactuales.visibles_incluyendo_texto_debil++;
      if (textoDebil.length < TOP) {
        textoDebil.push({ objeto: recortar(l.nombre_del_procedimiento, 90), unspsc: l.codigo_principal_de_categoria || "(sin código)" });
      }
      continue;
    }
    if (ev.paso === "no_pertinente") {
      embudo.fuera_no_pertinente++;
      terminosNoPertinentes.push(ev.termino);
      if (noPertinentes.length < TOP) {
        noPertinentes.push({ objeto: recortar(l.nombre_del_procedimiento, 90), unspsc: l.codigo_principal_de_categoria, termino: ev.termino });
      }
      continue;
    }
    if (ev.paso === "anti_suministro") { embudo.fuera_anti_suministro++; continue; }

    // capacidad (K y tope estratégico), con el detalle del perfil consultado
    const rup = evaluarRup(l, perfilId, conocimiento);
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
    // los repartos describen EXACTAMENTE el conjunto visible: se cuentan aquí
    // (después de capacidad y anticipo), no antes
    if (ev.tier in porTier) porTier[ev.tier]++;
    if (ev.pertinencia && ev.pertinencia.nivel in porPertinencia) porPertinencia[ev.pertinencia.nivel]++;
    if (muestra.length < nMuestra) {
      muestra.push({
        ...paso,
        modalidad: l.modalidad_de_contratacion, estado: l.estado_del_procedimiento, fase: l.fase,
        cuantia_cop: l.cuantia_cop, anticipo_pct: l.anticipo_pct,
        k_cop: rup.k_cop, crpc_cop: rup.crpc_cop,
        match: ev.tier, match_msg: ev.unspsc && ev.unspsc.mensaje,
        pertinencia: ev.pertinencia && ev.pertinencia.etiqueta,
        fuente_unspsc: ev.fuente_unspsc,
      });
    }
  }

  // cerradas: cuántas se recuperarían al servirlas (solo para dimensionar)
  contrafactuales.visibles_incluyendo_cerradas = embudo.visibles + embudo.fuera_estado;
  // sin la capa de pertinencia volverían los falsos positivos de siempre
  contrafactuales.visibles_sin_capa_pertinencia = embudo.visibles + embudo.fuera_no_pertinente + embudo.fuera_objeto_generico;
  // el toggle de la UI: cuántos se sumarían al encenderlo (aproximado por
  // arriba — los que además pasarían capacidad y anticipo son ≤ este número)
  contrafactuales.visibles_incluyendo_texto_debil += embudo.visibles;

  /* ---------- distribuciones del corpus REAL ---------- */
  const distribuciones = {
    modalidad_de_contratacion: tabla(filas.map((l) => l.modalidad_de_contratacion)),
    estado_del_procedimiento: tabla(filas.map((l) => l.estado_del_procedimiento)),
    fase: tabla(filas.map((l) => l.fase)),
    modalidades_descartadas: tabla(modalidadesFuera),
    estado_fase_descartados: tabla(estadosFuera),
    blacklist_terminos_que_dispararon: tabla(motivosBlacklist),
    no_pertinente_terminos_que_dispararon: tabla(terminosNoPertinentes),
    anticipo: {
      sin_dato_0: filas.filter((l) => !(l.anticipo_pct > 0)).length,
      entre_1_y_9: filas.filter((l) => l.anticipo_pct > 0 && l.anticipo_pct < 10).length,
      entre_10_y_19: filas.filter((l) => l.anticipo_pct >= 10 && l.anticipo_pct < 20).length,
      desde_20: filas.filter((l) => l.anticipo_pct >= 20).length,
    },
    cuantia_rango: tabla(filas.map((l) => l.cuantia_rango)),
    codigos_unspsc_ilegibles: tabla(codigosInvalidos),
  };

  /* ---------- cobertura UNSPSC ---------- */
  const cuentaClases = new Map();
  for (const c of clasesEnCorpus) cuentaClases.set(c, (cuentaClases.get(c) || 0) + 1);
  const distintas = [...cuentaClases.keys()];
  // cobertura con la regla VIGENTE (jerárquica), código a código
  const cubre = (c) => emparejar([normalizarCodigo(c)].filter(Boolean), idxPerfil).tier !== "ninguno";
  const cubiertasJerarquico = distintas.filter(cubre);
  const cubiertasExacto = distintas.filter((c) => perfil.unspsc.has(c));
  const unspsc_cobertura = {
    clases_distintas_en_corpus: distintas.length,
    cubiertas_por_clase: cubiertasJerarquico.length,
    cubiertas_exacto_8_digitos: cubiertasExacto.length,
    codigos_rup_del_perfil: perfil.unspsc.size,
    familias_rup_del_perfil: idxPerfil.familias.size,
    codigos_ilegibles: codigosInvalidos.length,
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
    matching: {
      visibles_por_tier: porTier,
      visibles_por_pertinencia: porPertinencia,
      rescatados_ejemplos: rescatados,
      no_pertinentes_ejemplos: noPertinentes,
      objetos_genericos_ejemplos: genericos,
      texto_debil_ejemplos: textoDebil,
    },
    conocimiento: {
      equivalencias: eqMeta
        ? {
          construido: eqMeta.construido, clases_con_equivalente: eqMeta.clases_con_equivalente || 0,
          pares: eqMeta.pares || 0, umbrales: eqMeta.umbrales || null,
          adjudicatarios: eqMeta.adjudicatarios || 0, procesos_contados: eqMeta.procesos_contados || 0,
          pares_evaluados: eqMeta.pares_evaluados || 0,
          descartados: eqMeta.descartados || null, fallos_por_umbral: eqMeta.fallos_por_umbral || null,
        }
        : null,
      // por qué el índice está como está (vacío, lleno o sin construir):
      // cuatro causas posibles que un 0 no distingue
      equivalencias_por_que: explicarEquivalencias(eqMeta),
      vocabulario: { fuente: vocabulario.fuente, familias: vocabulario.indice.size, derivadas_del_historico: vocabulario.derivadas, construido: vocMeta ? vocMeta.construido : null },
    },
    distribuciones,
    unspsc_cobertura,
    convenios_detectados: convenios.slice(0, TOP),
    muestra,
    como_leerlo: "embudo va en orden: cada `fuera_*` son procesos que murieron en ESE paso y no llegaron al siguiente. "
      + "El paso con el número más alto es el que hay que revisar primero. "
      + "`contrafactuales` dice cuántos se recuperarían al relajar cada regla y cuánto aportó cada mecanismo nuevo. "
      + "`matching.no_pertinentes_ejemplos` son los falsos positivos que la capa de pertinencia acaba de sacar de la pantalla, "
      + "`matching.texto_debil_ejemplos` lo que volvería con el toggle «Incluir procesos sin código UNSPSC», "
      + "y `conocimiento.equivalencias_por_que` explica en castellano por qué el índice de equivalencias está como está.",
  });
};
