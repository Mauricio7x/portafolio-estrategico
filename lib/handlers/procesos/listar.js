/* ============================================================================
   /api/oportunidades · Consulta de oportunidades viables desde la caché Redis
   ----------------------------------------------------------------------------
   TOKEN OPCIONAL (ago 2026), y es el único endpoint donde lo es. Los clientes
   entran por la web pública y solo necesitan ver a qué presentarse; exigirles
   una credencial dejaba la herramienta inservible para ellos.

     sin token   → 200 con todo, pero con las FINANZAS REDACTADAS: `k_cop`,
                   `crpc_cop`, `tope_cop`, `co_estimado`, `puertas.p2_k.{crp,
                   crpc,tope}` y `puertas.p3_caja.patrimonio` viajan en `null`,
                   y los MENSAJES de esas puertas se sustituyen por versiones
                   sin cifras (los originales las llevaban dentro del texto).
                   `finanzas_visibles:false` lo declara en la respuesta.
     con token    → 200 con las cifras. Un token presente pero inválido da 401,
                   en vez de degradar en silencio a modo público.

   Qué se conserva sin token y por qué: el VEREDICTO de cada puerta (es el
   producto) y los derivados de datos públicos (`financiacion_requerida` sale de
   la cuantía publicada). El límite de este enfoque —el booleano de P3 permite
   acotar el patrimonio por bisección con muchos procesos— está documentado en
   lib/publico.js; se acepta a cambio de que la app sirva para algo sin llave.

   Los demás endpoints NO cambian: /api/diagnostico, /api/resumen,
   /api/competencia-detalle, /api/admin/rup y /api/sync/historico siguen
   exigiendo HISTORICO_TOKEN. La clave del gate de public/app.js es del CLIENTE
   y nunca protegió nada.

   GET /api/oportunidades?perfil=helder|genesis|juntos   (alias: consorcio)
     &anticipo_min=20            (excluye anticipos DECLARADOS bajo el mínimo;
                                  0 = "sin dato" pasa el filtro y puntúa 0,
                                  porque p6dx-8zbt no trae columna de anticipo)
     &cuantia_rango=bajo|medio|alto
     &competencia_entidad=baja|media|alta|sin_dato  (histórico DE LA ENTIDAD)
     &ubicacion_valida=true|false
     &match=clase|familia|equivalente|texto    (solidez del match UNSPSC)
     &incluir_sin_unspsc=1       (abre la ruta de TEXTO cuando la pertinencia no
                                  llegó a verde; apagada por defecto)
     &incluir_cerradas=1         (por defecto solo procesos abiertos)
     &solo_viables=true|false    (default TRUE: oculta lo que no pasa P1-P3)
     &ordenar_por=atractividad|ve|ve_conservador|p_ganar|anticipo|cuantia|competencia|baja|puntaje
                                 (default ATRACTIVIDAD; `ve_conservador` ordena por
                                  la cota inferior de la banda de probabilidad, A6)
     &baja_max=8                 (A4: baja máxima en % que el dueño soporta sin
                                  perder plata; con ella el factor de precio de
                                  P(ganar) deja de ser neutro. Ilegible ⇒ inerte)
     &orden=asc|desc             (default desc)
     &pagina=1&por_pagina=20     (máx 100)

   → { ok:true, total, viables, no_viables, solo_viables, resultados, pagina,
       por_pagina, perfil, sincronizado, por_match, indice_competencia,
       conocimiento }
   Cada resultado lleva `rup` con el veredicto GRADUADO: rup.tier
   (clase|familia|equivalente|texto), rup.unspsc {codigo_proceso, codigo_rup,
   mensaje} y rup.pertinencia {nivel, etiqueta, motivo}.

   LAS CUATRO PUERTAS (ago 2026, docs/ATRACTIVIDAD.md). `puntaje_ponderado` ya
   no viaja en la respuesta: lo sustituyen tres campos con significado propio,
   que NO se promedian entre sí porque compensar aquí es un error de categoría
   (no poder financiar la obra no se compensa con cuantía alta):

     puertas   {p1_rup, p2_k, p3_caja, p4_competencia, pasa_todas, no_viable_por}
     p_ganar   probabilidad estimada 0-1, con su desglose y su FUENTE
     ve        valor esperado = p_ganar × cuantía

   ORDEN POR ATRACTIVIDAD (el default): primero lo que pasa las cuatro puertas
   y, dentro de cada grupo, por VALOR ESPERADO descendente. La viabilidad manda
   sobre `orden=asc|desc`: lo que no se puede tomar va al final, siempre.

   Lógica: SCAN licitaciones:activo:mes:*:chunk:* → MGET por lotes → inflate →
   dedup por _k (gana :updated_at) → filtros de negocio → rup_valido(perfil)
   → índice de competencia → orden → paginación. El corpus deduplicado, el
   índice y el conocimiento derivado se memoizan a nivel de módulo (instancia
   serverless caliente), sellados con meta.last_sync y con la fecha de
   construcción de cada artefacto.

   AQUÍ CORRE TODO EL JUICIO (jul 2026). /api/sync guarda ancho —cualquier
   proceso que PUEDA interesar— y es esta consulta la que aplica, por perfil:
   matching UNSPSC jerárquico, equivalencias funcionales, co-señal de texto,
   pertinencia del objeto, anti-suministro, capacidad K y tope. Consecuencia
   deliberada: afinar una regla o cargar un RUP nuevo tiene efecto inmediato,
   sin re-sincronizar nada.

   El corpus HISTÓRICO (licitaciones:historico:*) NO se lee aquí: de él solo
   llega el resumen AGREGADO por entidad (promedio y nº de procesos) y el
   conocimiento derivado (equivalencias entre clases, vocabulario por familia).
   Los datos de adjudicación —adjudicatario, NIT, valor adjudicado— nunca salen
   por este endpoint; ni siquiera se guardan en el corpus activo.

   Arranque en frío: si Redis no tiene chunks, dispara /api/sync?modo=auto en
   segundo plano (sin await) y responde 503 con mensaje claro — la web
   reintenta sola.
   ========================================================================== */
"use strict";

const { crearRedis, hayCredenciales } = require("../../redis.js");
const { CLAVES, leerChunksDedup, leerJSON, leerJSONComprimido, descomprimir } = require("../../almacen.js");
const { autorizarToken } = require("../../auth.js");
const { sinFinanzas } = require("../../publico.js");
const { PERFILES, ALIAS_PERFIL, evaluarRup } = require("../../rup.js");
const { recargarPerfiles } = require("../../perfiles.js");
const { esPerfilDinamico, cargarPerfilDinamico } = require("../../perfil_dinamico.js");
const { filtrarProcesosVisibles, ANTICIPO_MIN_DEFAULT } = require("../../filtros.js");
const { leerIndice, leerIndiceMeta, competenciaDe } = require("../../indice_competencia.js");
const { leerIndiceBaja, leerIndiceBajaMeta, bajaDeMercado, bajaSegmentoDe, encogerBaja } = require("../../indice_baja.js");
const { leerEquivalencias, leerEquivalenciasMeta } = require("../../equivalencias.js");
const { vocabularioActivo } = require("../../texto_unspsc.js");
const { sinAdjudicacion } = require("../../proyeccion.js");
const { tipoPrecio } = require("../../negocio.js");
const { evaluarZona } = require("../../accesibilidad.js");
const { evaluarPuertas } = require("../../puertas.js");
const {
  estimarPDetalle, valorEsperado, promediosPorDepartamento, indiceColisionCierres, claveColision,
} = require("../../probabilidad.js");
/* Los SIETE filtros del listado (Fase 8, plan v4): vocabulario compartido con
   el navegador (public/filtros.js) y aplicación en el servidor
   (lib/filtros_lista.js). Corren DESPUÉS de la cascada y de las puertas: son
   lo que ELIGE quien consulta, no parte del juicio. */
const FiltrosLista = require("../../filtros_lista.js");
const Filtros = require("../../../public/filtros.js");
const { cargarCostosPorProceso, pisoTechoDeBorrador, bajaMaximaDesdePisoTecho } = require("../../baja_maxima.js");
const { evaluarAdendas } = require("../../adendas.js");

const POR_PAGINA_DEFAULT = 20, POR_PAGINA_MAX = 100;
// ANTICIPO_MIN_DEFAULT vive en lib/filtros con el resto de la cascada: el panel
// tiene que aplicar EXACTAMENTE el mismo default o sus totales no coincidirían.
/* ORDEN POR ATRACTIVIDAD (el default, reescrito en ago 2026): primero lo que
   PASA LAS CUATRO PUERTAS y, dentro de cada grupo, por VALOR ESPERADO
   descendente. El criterio anterior —agrupar por banda de competencia de la
   entidad y desempatar por `puntaje_ponderado`— se retiró porque ese puntaje
   tenía su tercer componente constante en todo lo servido: el desempate real lo
   acababa haciendo la fecha de publicación (docs/ATRACTIVIDAD.md §0).
   La viabilidad manda SIEMPRE sobre `orden=asc|desc`: un proceso que no se
   puede tomar no encabeza la lista ni pidiéndolo al revés. */
const ORDEN_CAMPOS = {
  atractividad: (l, ctx) => ctx.ve || 0,
  anticipo: (l) => l.anticipo_pct || 0,
  cuantia: (l) => l.cuantia_cop || 0,
  /* Competencia: el nivel de la ENTIDAD (histórico), no el `nivel_competencia`
     de la fila. Aquel sale de columnas EX-POST que SECOP II no publica mientras
     el proceso está abierto, así que en el corpus activo vale «baja» para todo y
     ordenar por él no ordenaba nada. Es el mismo campo que ya filtra
     `?competencia_entidad=` y el que pinta el badge, que es lo que README y
     CLAUDE.md decían que ordenaba aquí desde el principio. */
  competencia: (l, ctx) => ({ baja: 1, media: 2, alta: 3 }[ctx.competencia_nivel] || 0),
  ve: (l, ctx) => ctx.ve || 0,
  p_ganar: (l, ctx) => ctx.p_ganar || 0,
  /* VE CONSERVADOR (A6, ago 2026): cuantía × cota INFERIOR de la banda de la
     probabilidad (`p_lo`). Ordena de modo que la incertidumbre PENALICE en vez
     de premiar: una entidad con 2 procesos y promedio 1 no puede subir por
     encima de una con 40 procesos y promedio 1,5. Sin banda (hash anterior al
     encogimiento) cae al VE de siempre — es una OPCIÓN, no el default. */
  ve_conservador: (l, ctx) => ctx.ve_conservador != null ? ctx.ve_conservador : (ctx.ve || 0),
  // legado: `puntaje_ponderado` ya no viaja en la respuesta (lo sustituyen
  // puertas/p_ganar/ve), pero el campo sigue existiendo en la fila y el orden
  // se conserva para no romper enlaces guardados
  puntaje: (l) => l.puntaje_ponderado || 0,
  /* Baja de mercado: MENOS descuento es MEJOR, porque se puede ofertar más
     cerca del presupuesto. El orden por defecto es descendente, así que el
     campo devuelve `100 − baja` para que la entidad que menos descuenta quede
     arriba. Y `sin_dato` vale −1, nunca 0: si valiera 0 se colaría en el primer
     puesto haciéndose pasar por «no descuenta nada», que es justo la confusión
     entre «no sé» y «cero» que este proyecto ya pagó una vez. */
  baja: (l, ctx) => (ctx.baja && ctx.baja.baja_mediana != null ? 100 - ctx.baja.baja_mediana : -1),
  /* Fase 8 · «Las que cierran antes»: menos días = más arriba. Sin fecha de
     cierre legible va al FINAL (−1e9), nunca disfrazado de «cierra hoy». */
  cierre: (l, ctx) => (ctx.dias_cierre == null ? -1e9 : -ctx.dias_cierre),
  /* Fase 8 · «Dónde me queda más»: margen estimado = techo competitivo − piso
     rentable (Fase 3), SOLO para procesos con costo calculado (un borrador de
     APU guardado con su costo directo). Sin costo → «Sin referencia» y al
     final: jamás se asume margen cero, y jamás se ordena por la cuantía
     haciéndola pasar por margen. */
  margen: (l, ctx) => (ctx.margen && ctx.margen.valor != null ? ctx.margen.valor : -1e18),
};
const ORDEN_DEFAULT = "atractividad";
const NIVELES_ENTIDAD = ["baja", "media", "alta", "sin_dato"];

const DEV = !process.env.VERCEL && process.env.NODE_ENV !== "production";
const logDev = (...a) => { if (DEV) console.log("[oportunidades]", ...a); };

/* Corpus deduplicado memoizado por instancia caliente (sello = last_sync). */
let _mem = { sello: null, filas: null };
/* Índice de competencia memoizado (sello = fecha de construcción + nº entidades):
   evita un HGETALL del hash completo en cada petición de una instancia caliente. */
let _memIndice = { sello: null, indice: null, meta: null };
/* Índice de BAJA de mercado, memoizado igual y por lo mismo: son tres HGETALL
   (uno por granularidad) que no hace falta repetir en cada petición. */
let _memBaja = { sello: null, indice: null, meta: null };

async function cargarCorpus(redis, meta) {
  // el SCAN corre siempre (1 comando barato); el sello incluye el nº de
  // chunks para que una compactación/poda concurrente (que cambia el conteo)
  // invalide una memoización tomada a mitad de la maniobra
  const claves = await redis.scan(CLAVES.patronChunks);
  if (!claves.length) return null;
  const sello = meta && meta.last_sync ? `${meta.last_sync}|${meta.last_full}|${claves.length}` : null;
  if (sello && _mem.sello === sello && _mem.filas) {
    logDev(`corpus desde memoria caliente (${_mem.filas.length} filas)`);
    return _mem.filas;
  }
  // `senales`: el dedup deriva de paso, sin coste, lo que solo existe ENTRE
  // versiones — nº de reescrituras y si el cierre se prorrogó. La prórroga es
  // la única señal de competencia observable ANTES del cierre (lib/probabilidad).
  const filas = await leerChunksDedup(redis, claves, { senales: true });
  if (sello) _mem = { sello, filas };
  logDev(`corpus leído de Redis: ${claves.length} chunks → ${filas.length} filas únicas`);
  return filas;
}

/* Índice de competencia por entidad. Si nunca se construyó (no se ha corrido
   /api/sync/historico), se devuelve vacío: todas las entidades quedan en
   "sin_dato" y la app sigue funcionando exactamente como antes. */
async function cargarIndice(redis) {
  let meta = null;
  try { meta = await leerIndiceMeta(redis); } catch { /* índice opcional */ }
  if (!meta) { _memIndice = { sello: null, indice: null, meta: null }; return { indice: null, meta: null }; }
  const sello = `${meta.construido}|${meta.entidades}`;
  if (_memIndice.sello === sello && _memIndice.indice) {
    logDev(`índice desde memoria caliente (${Object.keys(_memIndice.indice).length} claves)`);
    return { indice: _memIndice.indice, meta };
  }
  let indice = null;
  try { indice = await leerIndice(redis); } catch { /* índice opcional */ }
  _memIndice = { sello, indice, meta };
  logDev(`índice leído de Redis: ${indice ? Object.keys(indice).length : 0} claves`);
  return { indice, meta };
}

/* Índice de baja de mercado. Mismo contrato que el de competencia: si no se ha
   construido, se devuelve vacío y todas las entidades quedan en "sin_dato" —
   la app sigue funcionando exactamente igual, solo sin el badge de baja. */
async function cargarIndiceBaja(redis) {
  let meta = null;
  try { meta = await leerIndiceBajaMeta(redis); } catch { /* índice opcional */ }
  if (!meta) { _memBaja = { sello: null, indice: null, meta: null }; return { indice: null, meta: null }; }
  const sello = `${meta.generado}|${meta.procesos_analizados}`;
  if (_memBaja.sello === sello && _memBaja.indice) return { indice: _memBaja.indice, meta };
  let indice = null;
  try { indice = await leerIndiceBaja(redis); } catch { /* índice opcional */ }
  _memBaja = { sello, indice, meta };
  logDev(`índice de baja leído de Redis: ${indice ? Object.keys(indice.entidad || {}).length : 0} entidades`);
  return { indice, meta };
}

/* Conocimiento aprendido del corpus histórico: equivalencias funcionales entre
   clases UNSPSC y vocabulario distintivo por familia. Los dos son OPCIONALES —
   sin backfill histórico no existen y la cascada simplemente no dispara esas
   dos capas. Memoizado por instancia caliente contra el sello de su meta.
   Dos GET por instancia fría, cero por petición caliente. */
let _memConocimiento = { sello: null, conocimiento: null, meta: null };
async function cargarConocimiento(redis) {
  let metaEq = null;
  try { metaEq = await leerEquivalenciasMeta(redis); } catch { /* opcional */ }
  let metaVoc = null;
  try { metaVoc = await leerJSON(redis, CLAVES.vocabularioMeta); } catch { /* opcional */ }
  const sello = `${(metaEq && metaEq.construido) || "-"}|${(metaVoc && metaVoc.construido) || "-"}`;
  if (_memConocimiento.sello === sello && _memConocimiento.conocimiento) {
    return { conocimiento: _memConocimiento.conocimiento, meta: _memConocimiento.meta };
  }
  let equivalencias = null, vocabRedis = null;
  if (metaEq && !metaEq.vacio) {
    try { equivalencias = await leerEquivalencias(redis); } catch { /* opcional */ }
  }
  if (metaVoc) {
    try { vocabRedis = await leerJSONComprimido(redis, CLAVES.vocabulario); } catch { /* opcional */ }
  }
  const vocabulario = vocabularioActivo(vocabRedis); // cae a la semilla del repo
  const conocimiento = { equivalencias, vocabulario };
  const meta = {
    equivalencias: metaEq
      ? { construido: metaEq.construido, clases_con_equivalente: metaEq.clases_con_equivalente || 0, pares: metaEq.pares || 0 }
      : null,
    vocabulario: { fuente: vocabulario.fuente, familias: vocabulario.indice.size, derivadas_del_historico: vocabulario.derivadas },
  };
  _memConocimiento = { sello, conocimiento, meta };
  logDev(`conocimiento: equivalencias=${equivalencias ? Object.keys(equivalencias).length : 0} vocabulario=${vocabulario.fuente}/${vocabulario.indice.size}`);
  return { conocimiento, meta };
}

/* Dispara la sincronización en segundo plano (mejor esfuerzo; la web también
   reintenta por su cuenta al recibir el 503). Si hay meta de una carga previa
   pero cero chunks, la caché quedó inconsistente → recarga full, no delta. */
/* Borradores de APU del perfil y la baja máxima por proceso viven en
   lib/baja_maxima (los comparte la vista `probabilidad` del desglose). */

function dispararSync(req, modo) {
  try {
    const proto = req.headers["x-forwarded-proto"] || "https";
    const host = req.headers["x-forwarded-host"] || req.headers.host;
    const headers = process.env.VERCEL_AUTOMATION_BYPASS_SECRET
      ? { "x-vercel-protection-bypass": process.env.VERCEL_AUTOMATION_BYPASS_SECRET } : undefined;
    if (host) fetch(`${proto}://${host}/api/procesos?op=sync&modo=${modo}`, { headers }).catch(() => {});
  } catch { /* la web reintenta */ }
}

module.exports = async function handler(req, res) {
  const q = req.query || {};
  res.setHeader("Cache-Control", "no-store");

  /* PROTEGIDO con el mismo HISTORICO_TOKEN que el resto de endpoints con datos
     sensibles (lib/auth). Va ANTES que cualquier otra comprobación: sin token
     no se confirma ni se niega nada, ni siquiera qué perfiles existen.
     Por qué: cada resultado lleva `rup` con k_cop, crpc_cop, tope_cop y
     co_estimado, que se derivan del patrimonio, la utilidad operacional y la
     liquidez de una PERSONA NATURAL identificada por nombre completo
     (lib/perfiles). La clave 231105 de public/app.js es una barrera de
     cortesía en el cliente: no protege la API, y quien conociera la ruta veía
     esas cifras sin credencial alguna. */
  /* EL TOKEN ES OPCIONAL AQUÍ (ago 2026), y solo aquí. Los clientes entran por
     la web pública y lo único que necesitan es ver a qué presentarse; exigirles
     una credencial convertía la herramienta en inservible para ellos. Lo que NO
     puede salir sin credencial son las cifras del perfil, así que:

       sin token   → se sirve todo, con las finanzas redactadas (lib/publico)
       con token   → se sirve todo, con las finanzas

     Un token PRESENTE pero inválido responde 401 en vez de degradar en
     silencio: quien se molestó en mandarlo tiene que enterarse de que está mal
     —normalmente es un error de copiado— y no quedarse creyendo que su
     despliegue sirve las finanzas cuando no lo hace.

     El resto de endpoints NO cambia: /api/diagnostico, /api/resumen,
     /api/competencia-detalle, /api/admin/rup y /api/sync/historico siguen
     exigiendo el token, porque exponen el corpus, el panel o la escritura. */
  const tokenPresente = !!((req.headers && req.headers["x-historico-token"]) || q.token);
  let conFinanzas = false;
  if (tokenPresente) {
    const permiso = autorizarToken(req, q);
    if (!permiso.ok) {
      return res.status(permiso.status).json({
        ok: false, error: permiso.error,
        ...(permiso.como_autenticar ? { como_autenticar: permiso.como_autenticar } : {}),
      });
    }
    conFinanzas = true;
  }

  let perfil = String(q.perfil || "").toLowerCase();
  // alias documentados (consorcio → juntos); hasOwnProperty en ambos mapas:
  // un ?perfil=constructor no debe pasar por el prototipo
  if (Object.prototype.hasOwnProperty.call(ALIAS_PERFIL, perfil)) perfil = ALIAS_PERFIL[perfil];
  /* perfiles DINÁMICOS (onboarding: RUP subido en PDF): un id `rup_…` se
     resuelve contra Redis MÁS ADELANTE, cuando ya hay cliente. Aquí solo se
     valida el FORMATO — un id malformado es un 400 como cualquier perfil
     inexistente, no un viaje a Redis. */
  const perfilDinamico = esPerfilDinamico(perfil);
  /* Fase 10 · un consorcio a la medida (`cons_…`) se resuelve como un perfil
     dinámico: se lee de config:consorcios y se deriva de sus integrantes vivos
     en CADA petición (así un RUP nuevo de un integrante lo cambia al instante). */
  const { esConsorcio, cargarConsorcio } = require("../../consorcio.js");
  const perfilConsorcio = esConsorcio(perfil);
  if (!perfilDinamico && !perfilConsorcio && !Object.prototype.hasOwnProperty.call(PERFILES, perfil)) {
    return res.status(400).json({
      ok: false,
      error: "falta ?perfil=helder | genesis | juntos (alias: consorcio) — o el id de un RUP subido (rup_…)",
    });
  }
  if (!hayCredenciales()) {
    return res.status(503).json({ ok: false, error: "Faltan credenciales de Upstash Redis en el despliegue." });
  }

  const redis = crearRedis({});
  let meta, filas, indice = null, indiceMeta = null, indiceBaja = null, indiceBajaMeta = null, conocimiento = {}, conocimientoMeta = null;
  try {
    // el RUP que el dueño haya cargado (POST /api/admin/rup) manda sobre los
    // datos del repositorio. Es UN GET del sello: solo si cambió se baja la
    // configuración entera. Va antes de evaluar nada — si no, esta petición
    // juzgaría con el RUP anterior y el «efecto inmediato» sería mentira.
    await recargarPerfiles(redis);
    /* el perfil dinámico se relee en CADA petición (un GET de un valor
       pequeño): así re-subir un RUP tiene efecto inmediato y un perfil
       caducado deja de servirse ya — con un 404 que dice qué hacer, no con
       una lista vacía inexplicable. */
    if (perfilConsorcio && !(await cargarConsorcio(redis, perfil))) {
      return res.status(404).json({
        ok: false, perfil_caducado: true,
        error: "Ese consorcio ya no existe (se borró o alguno de sus integrantes caducó). Volvé a Mi empresa y armalo de nuevo.",
      });
    }
    if (perfilDinamico && !(await cargarPerfilDinamico(redis, perfil))) {
      return res.status(404).json({
        ok: false,
        perfil_caducado: true,
        error: "El perfil de este RUP no existe o ya caducó (los perfiles subidos por PDF duran 45 días). "
          + "Volvé a la página de inicio y subí tu RUP de nuevo: toma menos de un minuto.",
      });
    }
    meta = await leerJSON(redis, CLAVES.meta);
    filas = await cargarCorpus(redis, meta);
    if (filas) {
      ({ indice, meta: indiceMeta } = await cargarIndice(redis));
      ({ indice: indiceBaja, meta: indiceBajaMeta } = await cargarIndiceBaja(redis));
      ({ conocimiento, meta: conocimientoMeta } = await cargarConocimiento(redis));
    }
  } catch (e) {
    return res.status(502).json({ ok: false, error: `Redis: ${e.message}` });
  }
  /* Borradores de APU del perfil (SCAN + MGET, unos pocos comandos): con TOKEN
     siempre —de ahí sale la baja máxima que el dueño soporta en cada proceso
     (A4: `b_max` del APU manda sobre la declarada)— y sin token solo si se pide
     el orden por margen (que igual exige token para servir cifras). Un fallo
     de lectura deja `costos` en null: la lista sirve igual, sin b_max del APU. */
  let costos = null;
  if (filas && (conFinanzas || q.ordenar_por === "margen")) {
    try { costos = await cargarCostosPorProceso(redis, perfil); } catch { costos = null; }
  }

  if (!filas) {
    dispararSync(req, meta && meta.last_full ? "full" : "auto");
    return res.status(503).json({
      ok: false,
      error: "Datos no disponibles. Sincronización iniciada. Intente en unos minutos.",
      sincronizando: true,
    });
  }

  /* competencia histórica de la entidad, memoizada por fila dentro de la
     petición (el orden consulta el nivel n·log n veces) */
  const _comp = new Map();
  const compDe = (l) => {
    let c = _comp.get(l);
    if (!c) { c = competenciaDe(indice, l); _comp.set(l, c); }
    return c;
  };

  /* baja de mercado de la entidad, memoizada igual: el orden `?ordenar_por=baja`
     la consulta n·log n veces */
  const _baja = new Map();
  const bajaDe = (l) => {
    let b = _baja.get(l);
    if (!b) { b = bajaDeMercado(indiceBaja, l); _baja.set(l, b); }
    return b;
  };

  /* ---------- filtros ---------- */
  const anticipoMin = q.anticipo_min !== undefined ? parseFloat(q.anticipo_min) : ANTICIPO_MIN_DEFAULT;
  /* `?baja_max=` (A4): baja máxima en % que el dueño puede aceptar sin perder
     plata. Opcional; un valor ilegible o negativo es INERTE (null), nunca 400 —
     un enlace guardado no puede vaciar la lista. */
  const bajaMaxCrudo = q.baja_max !== undefined && q.baja_max !== "" ? parseFloat(q.baja_max) : NaN;
  /* SOLO CON CREDENCIAL: la mediana de baja de la entidad es la cifra que
     `lib/publico` tapa, y un cliente sin token que pudiera mover `baja_max` y
     mirar dónde empieza a caer `p` la bisecaría en veinte peticiones. Sin token
     el parámetro es inerte y `baja_max_ignorada` lo dice. */
  const bajaMax = conFinanzas && Number.isFinite(bajaMaxCrudo) && bajaMaxCrudo >= 0 && bajaMaxCrudo <= 100
    ? bajaMaxCrudo : null;
  const bajaMaxIgnorada = !conFinanzas && Number.isFinite(bajaMaxCrudo);
  const fCuantia = ["bajo", "medio", "alto"].includes(q.cuantia_rango) ? q.cuantia_rango : null;
  const fEntidad = NIVELES_ENTIDAD.includes(q.competencia_entidad) ? q.competencia_entidad : null;
  const fUbicacion = q.ubicacion_valida === undefined ? null : ["true", "1"].includes(String(q.ubicacion_valida));
  // ?zona=facil → solo zonas de fácil acceso (cerca de la base o de un
  // aeropuerto, sin difícil acceso ni alertas). Cualquier otro valor es inerte:
  // un enlace guardado con un valor viejo no puede vaciarle la lista a nadie.
  const fZonaFacil = q.zona === "facil";
  const soloAbiertas = q.incluir_cerradas !== "1";
  // ?match=clase|familia|equivalente|texto → ver solo los de esa solidez
  const fTier = ["clase", "familia", "equivalente", "texto"].includes(q.match) ? q.match : null;
  /* Toggle «Incluir procesos sin código UNSPSC» (apagado por defecto). Sin él,
     un proceso rescatado SOLO por el objeto tiene que llegar a pertinencia
     VERDE para verse: sin código del RUP y sin vocabulario claro de obra no
     hay evidencia de nada (en el corpus real esa ruta metía software, equipos
     y servicios de salud). Ver lib/filtros.evaluarObjeto. */
  const opciones = { incluirTextoDebil: ["1", "true"].includes(String(q.incluir_sin_unspsc)) };
  /* ?solo_viables=false → enseña también lo que NO pasa las puertas, atenuado y
     con el motivo. Encendido por defecto: la lista es para decidir, y un
     proceso que no se puede tomar estorba más de lo que informa. */
  const soloViables = !["0", "false", "no"].includes(String(q.solo_viables || "").toLowerCase());

  /* ---------- LA CASCADA (una sola implementación, en lib/filtros) ----------
     Modalidad → estado → objeto → capacidad K → tope → anticipo. Vive en
     lib/filtros.filtrarProcesosVisibles y la llaman TAMBIÉN /api/resumen: si
     estuviera escrita aquí, el panel tendría que copiarla y las dos copias
     divergirían a la primera corrección que se aplicara solo a una.
     El veredicto de cada fila vuelve memoizado (`veredictos`): el filtro lo
     necesita para decidir y la tarjeta para pintarse; calcularlo dos veces
     duplicaría el trabajo caro de la cascada. */
  const { visibles, veredictos, noViables } = filtrarProcesosVisibles(filas, perfil, conocimiento, {
    soloAbiertas, anticipoMin, incluirTextoDebil: opciones.incluirTextoDebil,
    retenerNoViables: !soloViables,
  });
  const rupDe = (l) => veredictos.get(l) || evaluarRup(l, perfil, conocimiento, opciones);

  /* ---------- LAS CUATRO PUERTAS, P(ganar) y VALOR ESPERADO ----------
     Sustituyen al `puntaje_ponderado` como criterio de decisión (lib/puertas,
     lib/probabilidad, docs/ATRACTIVIDAD.md). Se calculan AQUÍ y no en la
     ingesta: dependen del perfil consultado y de los datos derivados del
     histórico, así que sellarlos en el chunk daba el mismo orden a los tres
     perfiles y hasta 30 días de deriva hasta la siguiente full.
     Los dos índices auxiliares se derivan del corpus que ya está en memoria:
     cero comandos de Redis, una pasada cada uno. */
  const promediosDepto = promediosPorDepartamento(filas, compDe);
  const colisiones = indiceColisionCierres(filas);
  /* Piso/techo del proceso con el APU guardado (lib/apu/piso_techo, la MISMA
     función del panel), memoizado por fila: lo consumen el orden por margen y
     la baja máxima del factor de precio. Sin borrador con costo, null. */
  const _pt = new Map();
  const pisoTechoDe = (l) => {
    if (_pt.has(l)) return _pt.get(l);
    const r = pisoTechoDeBorrador(l, costos, { baja: bajaDe(l), competencia: compDe(l) });
    _pt.set(l, r);
    return r;
  };
  /* Baja máxima que el dueño soporta en ESTE proceso (lib/baja_maxima): del
     APU guardado si lo hay, si no la declarada por `?baja_max=`; sin ninguna,
     null ⇒ factor de precio neutro. Reutiliza el piso/techo memoizado. */
  const bajaMaximaDe = (l) => bajaMaximaDesdePisoTecho(l, pisoTechoDe(l), bajaMax);
  const _eval = new Map(); // memo por fila dentro de la petición
  const evalDe = (l) => {
    let e = _eval.get(l);
    if (e) return e;
    const competencia = compDe(l);
    const baja = bajaDe(l);
    const bmax = bajaMaximaDe(l);
    const depto = String(l.departamento_entidad || "").trim().toUpperCase();
    const clave = claveColision(l);
    const detalle = estimarPDetalle(l, {
      competencia,
      baja,
      promedio_departamento: depto ? promediosDepto.get(depto) : null,
      colision_cierres: clave ? (colisiones.get(clave) || 0) : 0,
      /* A4: la baja máxima que el dueño soporta — del APU guardado de este
         proceso si lo hay, si no la DECLARADA (`?baja_max=`). Sin ninguna, el
         factor de precio es neutro: penalizar por no saber sería inventar. */
      baja_maxima_pct: bmax.valor,
      baja_maxima_origen: bmax.origen,
      /* §3.3: para el factor de precio la mediana de la celda va ENCOGIDA hacia
         la referencia de su modalidad (lib/indice_baja.encogerBaja); la tarjeta
         sigue enseñando la mediana medida (`baja`). Sin meta con encogimiento,
         la misma baja con peso 1. */
      baja_para_precio: encogerBaja(baja, indiceBajaMeta),
      // A7: el factor de colisión sale de la medición del índice (respaldo 1,15 sin ella)
      colision_medida: indiceMeta && indiceMeta.colision ? indiceMeta.colision : null,
    });
    const puertas = evaluarPuertas(l, perfil, {
      rup: rupDe(l), competencia, conocimiento, incluirTextoDebil: opciones.incluirTextoDebil,
    });
    e = {
      puertas, p_ganar: detalle.p, p_ganar_detalle: detalle, ve: valorEsperado(l, detalle.p), baja,
      // cota inferior del VE (A6): solo cuando hay banda; null, jamás 0
      ve_conservador: detalle.p_lo != null ? valorEsperado(l, detalle.p_lo) : null,
      baja_maxima: bmax,
      // el nivel de la entidad viaja en el contexto porque `?ordenar_por=competencia`
      // ordena por él (y no por el `nivel_competencia` de la fila, que es ex-post)
      competencia_nivel: (competencia && competencia.nivel) || "sin_dato",
      /* accesibilidad de la zona (lib/accesibilidad): corre al SERVIR — afinar
         la tabla tiene efecto inmediato, sin full. Alimenta la cubeta del
         orden por defecto, el filtro `?zona=facil` y el chip de la tarjeta. */
      zona: evaluarZona(l),
    };
    _eval.set(l, e);
    return e;
  };

  /* ---------- estrechamiento por lo que ELIGE quien consulta ----------
     Estos filtros NO son parte del juicio: son la pantalla del dueño. Por eso
     van aquí y no dentro de la cascada compartida — si entraran allí,
     `totales.visibles` del panel dependería de lo que hubiera marcado en los
     desplegables. Todos son conjunciones, así que el orden no altera el
     resultado. */
  const estrecha = (l) => {
    if (fCuantia && l.cuantia_rango !== fCuantia) return false;
    if (fUbicacion !== null && l.ubicacion_valida !== fUbicacion) return false;
    if (fEntidad && compDe(l).nivel !== fEntidad) return false;
    if (fTier && (rupDe(l).tier || "ninguno") !== fTier) return false;
    /* `zona=facil` retira lo lejano, lo de difícil acceso y lo de orden
       público por verificar (puntos < 2). El «sin dato» tiene puntos 2 y se
       QUEDA: no saber dónde es la obra no puede excluirla (R1). El filtro es
       OPT-IN: por defecto la zona solo ordena y etiqueta, jamás esconde. */
    if (fZonaFacil && evaluarZona(l).puntos < 2) return false;
    return true;
  };

  let lista = visibles.filter(estrecha);
  /* La caja (P3) es una puerta NUEVA: la cascada compartida no la conoce, así
     que un proceso que pasa objeto, K y tope puede seguir siendo inviable por
     no poder financiarlo. Con `solo_viables` encendido se retira aquí; apagado,
     se conserva y se marca — junto con los que la cascada apartó por RUP o por
     capacidad, que vuelven desde `noViables`. */
  if (soloViables) {
    lista = lista.filter((l) => evalDe(l).puertas.pasa_todas);
  } else {
    lista = lista.concat(noViables.map((n) => n.fila).filter(estrecha));
  }

  /* ---------- LOS SIETE FILTROS (Fase 8) ----------
     Corren sobre la lista que ya pasó la cascada, las puertas y los filtros
     de siempre: `totalSinFiltros` es esa base y `total` lo que queda tras lo
     que eligió el usuario — el contador «23 de 312» sale de aquí. Con cero
     resultados se prueba quitar cada filtro y se dice cuál recupera más y
     cuántos (contados de verdad). Las facetas se cuentan sobre la BASE para
     que el navegador pinte «Obra (312)» y no ofrezca opciones vacías. */
  const estadoFiltros = Filtros.leerEstado(q);
  const ahora = Date.now();
  const clasificar = FiltrosLista.crearClasificador({ rupDe, ahora });
  const base = lista;
  const totalSinFiltros = base.length;
  lista = FiltrosLista.aplicar(base, estadoFiltros, clasificar);
  const filtrosAplicados = Filtros.fichas(estadoFiltros);
  const sugerencia = lista.length === 0 && filtrosAplicados.length ? FiltrosLista.sugerirAflojar(base, estadoFiltros, clasificar) : null;
  const facetas = FiltrosLista.facetas(base, clasificar);

  /* ---------- orden ---------- */
  const ordenarPor = Object.prototype.hasOwnProperty.call(ORDEN_CAMPOS, q.ordenar_por) ? q.ordenar_por : ORDEN_DEFAULT;
  const campo = ORDEN_CAMPOS[ordenarPor];
  const dir = q.orden === "asc" ? 1 : -1;
  /* Margen estimado (solo con `ordenar_por=margen`): techo competitivo − piso
     rentable, con la MISMA función pura del panel Piso/Techo (lib/apu/
     piso_techo) sobre el costo directo del borrador guardado y la baja de la
     entidad. Nada de esto se recalcula: es la Fase 3 aplicada a la lista. */
  const margenDe = (l) => {
    if (!costos) return null;
    const r = pisoTechoDe(l);
    if (!r) {
      return { valor: null, piso: null, techo: null, motivo: "Sin referencia — todavía no calculaste el costo de este proceso en Precios." };
    }
    const c = r.borrador, pt = r.pt;
    const cif = (pt && pt.cifras) || {};
    const piso = Number.isFinite(Number(cif.piso_rentable)) ? Number(cif.piso_rentable) : null;
    const techo = Number.isFinite(Number(cif.techo_competitivo)) ? Number(cif.techo_competitivo) : null;
    if (piso == null || techo == null) {
      return { valor: null, piso, techo, borrador: c.id, motivo: techo == null
        ? "Sin referencia — no hay techo de mercado con base suficiente para esta entidad (hacen falta 5 adjudicaciones conocidas)."
        : "Sin referencia — el borrador no tiene costo directo calculado." };
    }
    return { valor: Math.round(techo - piso), piso, techo, borrador: c.id, motivo: null };
  };
  const _margen = new Map();
  const margenMemo = (l) => { if (!_margen.has(l)) _margen.set(l, margenDe(l)); return _margen.get(l); };
  const ctxDe = (l) => {
    const e = evalDe(l);
    if (ordenarPor === "cierre" && e.dias_cierre === undefined) e.dias_cierre = clasificar(l).dias;
    if (ordenarPor === "margen" && e.margen === undefined) e.margen = margenMemo(l);
    return e;
  };
  lista.sort((a, b) => {
    const ea = ctxDe(a), eb = ctxDe(b);
    // la viabilidad manda sobre cualquier criterio y sobre `orden`: lo que no
    // se puede tomar va al final, siempre
    const va = ea.puertas.pasa_todas ? 1 : 0, vb = eb.puertas.pasa_todas ? 1 : 0;
    if (va !== vb) return vb - va;
    /* En el orden POR DEFECTO, la ZONA es la segunda cubeta (encargo ago
       2026): entre dos viables gana el que queda cerca de la base o de un
       aeropuerto y sin alertas — el costo de LLEGAR es plata operativa que el
       valor esperado no modela. Dentro de cada cubeta sigue decidiendo el VE.
       Solo aplica a `atractividad`: quien pide otro orden pidió ESE orden. */
    if (ordenarPor === "atractividad" && ea.zona.puntos !== eb.zona.puntos) {
      return eb.zona.puntos - ea.zona.puntos;
    }
    const d = campo(a, ea) - campo(b, eb);
    if (d) return d * dir;
    const v = (ea.ve || 0) - (eb.ve || 0); // desempate estable por valor esperado
    if (v) return -v;
    return String(b.fecha_de_publicacion_del || "").localeCompare(String(a.fecha_de_publicacion_del || ""));
  });

  /* ---------- paginación ---------- */
  const porPagina = Math.min(Math.max(parseInt(q.por_pagina, 10) || POR_PAGINA_DEFAULT, 1), POR_PAGINA_MAX);
  const pagina = Math.max(parseInt(q.pagina, 10) || 1, 1);
  const total = lista.length;
  const resultados = lista.slice((pagina - 1) * porPagina, (pagina - 1) * porPagina + porPagina)
    // sinAdjudicacion: defensa en profundidad — el corpus activo no guarda
    // datos de adjudicación, y si una fila vieja los trajera, no salen de aquí
    .map((l) => {
      const e = evalDe(l);
      const fila = sinAdjudicacion(l);
      /* `puntaje_ponderado` SIGUE viajando, y a propósito. Ya no es criterio de
         decisión —lo sustituyen las puertas, la probabilidad y el valor
         esperado, y la tarjeta no lo pinta— pero retirarlo del contrato de la
         API cierra la puerta al A/B por URL (`ordenar_por=puntaje` contra el
         orden nuevo), que es justo lo que permite promover el orden nuevo con
         evidencia en vez de por decreto. Se conserva también porque
         /api/resumen lo calcula: dos consumidores del mismo campo no pueden
         discrepar sobre si existe. */
      const salida = {
        ...fila,
        rup: rupDe(l),
        competencia_entidad: compDe(l),
        /* Inteligencia de precio. `baja_mercado` es el objeto completo con su
           cascada y su origen; `baja_entidad` y `baja_segmento` son los dos
           escalares que pide el contrato del encargo. Los tres se anulan sin
           token en lib/publico. */
        baja_mercado: e.baja,
        baja_entidad: e.baja && e.baja.baja_mediana != null ? e.baja.baja_mediana : null,
        baja_segmento: bajaSegmentoDe(indiceBaja, l),
        puertas: e.puertas,
        p_ganar: e.p_ganar,
        p_ganar_detalle: e.p_ganar_detalle,
        ve: e.ve,
        viable: e.puertas.pasa_todas,
        /* Accesibilidad de la zona: etiqueta y mensaje ya redactados en
           lenguaje de personas (lib/accesibilidad declara estimaciones y
           advertencias como lo que son). Derivada de datos públicos: viaja
           también sin token. */
        zona: e.zona,
        /* Forma de pago detectada en el texto del objeto (lib/negocio):
           «unitarios» = las mayores cantidades se reconocen; «global» = el
           riesgo de cantidades es del contratista; null = el objeto no lo
           dice (o dice las dos) y no se adivina. Al SERVIR, no en ingesta:
           afinar la detección tiene efecto inmediato sin relanzar la full. */
        tipo_precio: tipoPrecio(`${l.nombre_del_procedimiento || ""} ${l.descripci_n_del_procedimiento || ""}`),
        /* Fase 8: la clasificación por la que filtra el usuario viaja en cada
           fila, para que el navegador pueda pintar la ficha sin re-clasificar
           (dos clasificadores divergirían). `dias_cierre` es la misma cuenta
           que el chip de la tarjeta. */
        filtro: (() => { const c = clasificar(l); return { tipo: c.tipo, modalidad: c.modalidad, departamento: c.departamento, rango: c.rango, dias_cierre: c.dias, ventana: c.ventana }; })(),
        ...(ordenarPor === "margen" ? { margen_estimado: margenMemo(l) } : {}),
        /* A4: la baja máxima con la que se calculó el factor de precio de esta
           fila (apu | declarada | null). Solo existe con token —los borradores
           solo se leen con credencial— así que sin token viaja null/null. */
        baja_maxima: { valor: e.baja_maxima.valor, origen: e.baja_maxima.origen, borrador: e.baja_maxima.borrador },
        /* Fase 5 · vigía de adendas (dataset): si el proceso se reescribió y
           cambió cierre, presupuesto, plazo, objeto o modalidad, viaja «la
           entidad cambió las reglas» con «le afecta / no le afecta»
           reevaluado contra ESTE perfil. Sin cambios no viaja. */
        ...(l._cambios ? { adendas: evaluarAdendas(l, perfil, { conocimiento, incluirTextoDebil: opciones.incluirTextoDebil }) } : {}),
      };
      // sin token, el veredicto viaja SIN las cifras que lo sostienen: el K, el
      // CRPC y el patrimonio derivan de las finanzas de una persona natural
      // identificada (lib/publico explica qué se redacta y qué no)
      return conFinanzas ? salida : sinFinanzas(salida);
    });

  // reparto por solidez del match: le dice al dueño cuántas de las que ve son
  // «RUP ✓» y cuántas hay que verificar en el pliego
  const por_match = { clase: 0, familia: 0, equivalente: 0, texto: 0 };
  for (const l of lista) {
    const t = rupDe(l).tier;
    if (t in por_match) por_match[t]++;
  }

  // cuántas de las servidas pasan las cuatro puertas: es la cifra que dice si
  // la lista es de trabajo o de lectura
  let viables = 0;
  for (const l of lista) if (evalDe(l).puertas.pasa_todas) viables++;

  logDev(`perfil=${perfil} corpus=${filas.length} filtradas=${total} viables=${viables} página=${pagina} orden=${ordenarPor}`);
  return res.status(200).json({
    ok: true, total, resultados, pagina, por_pagina: porPagina, perfil,
    sincronizado: meta ? meta.last_sync : null,
    ordenado_por: ordenarPor,
    /* Fase 8 · los siete filtros. `totalSinFiltros` es la base (cascada +
       puertas + filtros de siempre), `total` lo que queda; `filtrosAplicados`
       son las fichas legibles; `sugerencia` solo llega con cero resultados y
       dice qué filtro quitar y cuántos aparecerían (contados). `facetas` se
       cuenta sobre la base. Con `ordenar_por=margen`, `margen` dice cuántos
       borradores hay y cuántos no sirven porque se guardaron sin costo. */
    totalSinFiltros,
    filtrosAplicados,
    sugerencia,
    facetas,
    ...(costos ? { margen: { procesos_con_costo: costos.porProceso.size, borradores: costos.borradores, borradores_sin_costo: costos.sin_costo,
      con_margen: lista.filter((l) => margenMemo(l).valor != null).length } } : {}),
    solo_viables: soloViables, viables, no_viables: total - viables,
    // ¿se están sirviendo las cifras financieras? Sin token, no.
    finanzas_visibles: conFinanzas,
    // A4: la baja máxima aplicada al factor de precio (null = neutro)
    baja_max_aplicada: bajaMax,
    ...(bajaMaxIgnorada ? { baja_max_ignorada: "requiere credencial: sin ella el factor de precio es neutro" } : {}),
    por_match, incluye_sin_unspsc: opciones.incluirTextoDebil,
    indice_baja: _memBaja.meta
      ? {
        generado: _memBaja.meta.generado,
        entidades: _memBaja.meta.entidades_clasificadas,
        min_procesos: _memBaja.meta.min_procesos,
      }
      : null,
    indice_competencia: indiceMeta
      ? { construido: indiceMeta.construido, entidades: indiceMeta.clasificadas, min_procesos: indiceMeta.min_procesos }
      : null,
    conocimiento: conocimientoMeta,
  });
};

/* La puerta de entrada (lib/handlers/perfil/entrada) cuenta con el MISMO
   conocimiento (equivalencias + vocabulario) que el listado: si cargara otro,
   «hoy hay 47» y el «Ver las 47» servirían dos cifras distintas. */
module.exports.cargarConocimiento = cargarConocimiento;
module.exports.cargarCorpus = cargarCorpus;
