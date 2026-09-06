/* ============================================================================
   /api/sync/historico · Backfill del corpus histórico + índice de competencia
   ----------------------------------------------------------------------------
   GET /api/sync/historico?desde=2024-01&hasta=2025-12
       [&presupuesto=ms] [&chain=0] [&reiniciar=1]
       [&reconstruir_indice=true]         → solo el índice de competencia
       [&reconstruir_equivalencias=true]  → solo las equivalencias UNSPSC
       [&reconstruir_vocabulario=true]    → solo el vocabulario por familia
       [&reconstruir_baja=true]           → solo el índice de baja de mercado
       [&reconstruir_todo=true]           → los cuatro, sin re-extraer nada
       [&estado=true]  → solo diagnóstico, no toca nada
       [&reset=true]   → destraba candado y progreso (conserva lo ya bajado)

   PROTEGIDO: exige el token de HISTORICO_TOKEN, por header
   `x-historico-token` (preferido: no queda en los logs de acceso) o por
   `?token=` (para dispararlo desde el navegador, sin terminal); si vienen los
   dos, manda el header. Sin la variable de entorno el endpoint responde 503 y
   no hace nada — jamás hay un default que valga como llave (ver lib/auth.js).

   Qué hace, y por qué existe:
   La app borraba los procesos cerrados en cada full de higiene, así que no
   había forma de saber en qué entidades se presenta poca gente. Este endpoint
   baja DE UNA VEZ el histórico (2024-2025 por defecto) a
   licitaciones:historico:mes:{YYYY-MM}:chunk:{i} — keyspace que ninguna purga
   toca — y, al terminar, DESTILA de él las tres cosas que la app aprende:

     1. índice de competencia por entidad  (¿dónde se presenta menos gente?)
     2. equivalencias funcionales UNSPSC   (¿qué clases son afines en el
        mercado real? — los mismos contratistas ganan en ambas)
     3. vocabulario distintivo por familia (¿qué palabras identifican a cada
        familia? — co-señal para procesos mal codificados)

   Las tres se reconstruyen SIN volver a bajar nada, y las tres son opcionales:
   sin ellas la app funciona igual, con menos ayuda.

   NO se ejecuta solo: no hay cron ni auto-disparo. Se lanza a mano una vez
   desplegado. El día a día lo mantiene el delta de /api/sync (es quien ve la
   transición abierto → cerrado).

   Filtros: los MISMOS del sync normal (modalidad competitiva + RUP/unión de
   perfiles + capa anti-suministro), aplicados ANTES de guardar. Lo único que
   cambia es que aquí NO se descartan los cerrados: son justamente el objeto de
   estudio. La proyección incluye además las columnas de adjudicación
   (lib/indice_competencia.CAMPOS_ADJUDICACION).

   Reanudable como la full: presupuesto por invocación, cursor keyset por :id
   en sync:historico:progreso y auto-reinvocación (chain) hasta terminar.
   Candado propio lock:sync:historico (TTL 600 s), así jamás estorba ni es
   estorbado por /api/sync.

   Por mes se escribe APPEND-AND-FLIP: los chunks nuevos se escriben en índices
   libres y solo al cerrar el mes el manifest apunta al rango nuevo y se borran
   los viejos. Re-ejecutar el backfill REEMPLAZA el mes en vez de duplicarlo, y
   una invocación muerta a mitad nunca deja el mes vacío.
   ========================================================================== */
"use strict";

const crypto = require("crypto");
const { crearRedis, hayCredenciales } = require("../../redis.js");
const { autorizarToken, cabecerasDeAutoLlamada } = require("../../auth.js");
const {
  CLAVES, LOCK_HISTORICO_TTL_SEG, escribirChunks, leerJSON, escribirJSON,
} = require("../../almacen.js");
const { crearCliente, mesesEntre } = require("../../socrata.js");
const { transformar } = require("../../proyeccion.js");
const { construirIndice } = require("../../indice_competencia.js");
const { construirEquivalencias } = require("../../equivalencias.js");
const { construirVocabulario } = require("../../texto_unspsc.js");
const { construirIndiceBaja } = require("../../indice_baja.js");

const PAGE = parseInt(process.env.SECOP_PAGE, 10) || 5000;
const PRESUPUESTO_DEFAULT_MS = 45000;
const PRESUPUESTO_MAX_MS = 240000;   // < TTL del candado (600 s), con margen
const DESDE_DEFAULT = "2024-01";
const HASTA_DEFAULT = "2025-12";

/* Autorización: lib/auth.autorizarToken — el MISMO guardián que /api/diagnostico
   y /api/competencia-detalle (header `x-historico-token` o `?token=`; con los
   dos, manda el header).

   Advertencia consciente sobre `?token=`: una URL con el token queda escrita en
   los logs de acceso de Vercel, en el historial del navegador y en cualquier
   proxy intermedio. Es un intercambio aceptable para una operación MANUAL y de
   una sola vez; conviene rotar el token cuando el backfill termine. La
   auto-reinvocación de la cadena usa siempre el header, así que solo la primera
   petición deja rastro.

/* ============================ DIAGNÓSTICO Y RESCATE ============================
   Las dos escotillas para operar desde el navegador, sin terminal ni CLI de Redis.

   ?estado=true  SOLO LEE: candado (y cuántos segundos le quedan de TTL), avance
                 de la extracción, tamaño del corpus histórico y estado del
                 índice. Es lo primero que hay que mirar cuando «no avanza».
   ?reset=true   Destraba: borra el candado, el progreso de la extracción, su
                 meta y el acumulador a medias del índice. NO toca los chunks ya
                 guardados (licitaciones:historico:*) ni el índice publicado.

   Nota sobre el candado: NUNCA queda atascado para siempre — se toma con
   SET NX EX 600, así que una función muerta lo libera sola en 10 minutos. Y un
   token equivocado jamás lo deja puesto: autorizar() corre ANTES de tomarlo.
   Si algo «no avanza» y el candado está libre, la causa suele ser otra: la
   cadena de auto-reinvocación murió (p. ej. Password Protection interceptando
   la llamada que la función se hace a sí misma sin
   VERCEL_AUTOMATION_BYPASS_SECRET). En ese caso NO hace falta resetear nada:
   basta volver a llamar la misma URL y la extracción CONTINÚA donde quedó. */

async function inventarioHistorico(redis) {
  const claves = await redis.scan(CLAVES.patronChunksHist);
  const meses = new Set();
  for (const k of claves) {
    const m = CLAVES.mesDeClaveHist(k);
    if (m) meses.add(m);
  }
  return { chunks: claves.length, meses: meses.size };
}

async function estadoActual(redis) {
  const [candado, ttl, progreso, metaHist, metaIndice, indiceParcial, historico, metaEquiv, metaVocab] = await Promise.all([
    redis.get(CLAVES.lockHistorico),
    redis.ttl(CLAVES.lockHistorico).catch(() => null),
    leerJSON(redis, CLAVES.progresoHistorico),
    leerJSON(redis, CLAVES.metaHistorico),
    leerJSON(redis, CLAVES.indiceMeta),
    redis.exists(CLAVES.indiceProgreso).catch(() => 0),
    inventarioHistorico(redis),
    leerJSON(redis, CLAVES.equivalenciasMeta),
    leerJSON(redis, CLAVES.vocabularioMeta),
  ]);
  return {
    candado: candado
      ? { tomado: true, se_libera_solo_en_seg: ttl, nota: "una extracción está corriendo ahora mismo, o murió hace poco y el TTL la limpiará" }
      : { tomado: false },
    extraccion: progreso ? {
      rango: `${progreso.desde}…${progreso.hasta}`,
      terminada: !!progreso.terminado,
      mes_en_curso: progreso.meses ? progreso.meses[progreso.mesIdx] || null : null,
      avance: progreso.meses ? `${progreso.mesIdx}/${progreso.meses.length} meses` : null,
      iniciada: progreso.iniciado,
    } : null,
    ultima_extraccion_completa: metaHist ? { ts: metaHist.ts, rango: `${metaHist.desde}…${metaHist.hasta}`, guardadas: metaHist.guardadas } : null,
    corpus_historico: historico,
    indice: metaIndice
      ? { construido: metaIndice.construido, entidades: metaIndice.entidades, clasificadas: metaIndice.clasificadas, descartados: metaIndice.descartados,
        // A2/A7 (ago 2026): el encogimiento y la medición de la colisión, tal como los publicó la última construcción
        encogimiento: metaIndice.encogimiento || null,
        colision: metaIndice.colision ? require("../../probabilidad.js").leerColision(metaIndice.colision) : null,
        periodos: metaIndice.periodos || null }
      : null,
    indice_a_medias: indiceParcial ? true : false,
    equivalencias: metaEquiv
      ? { construido: metaEquiv.construido, clases_con_equivalente: metaEquiv.clases_con_equivalente, pares: metaEquiv.pares, umbrales: metaEquiv.umbrales }
      : null,
    vocabulario: metaVocab
      ? { construido: metaVocab.construido, familias: metaVocab.familias, procesos: metaVocab.procesos }
      : { construido: null, familias: null, nota: "sin derivar: manda la semilla de data/vocabulario_unspsc.json" },
    siguiente_paso: progreso && !progreso.terminado && !candado
      ? "Vuelva a llamar esta URL sin ?estado: la extracción CONTINÚA donde quedó (no hace falta resetear)."
      : candado
        ? "Espere a que termine la tanda en curso (o a que expire el TTL) y vuelva a llamar."
        : "Llame sin parámetros de diagnóstico para iniciar la extracción.",
  };
}

async function resetear(redis) {
  const antes = await inventarioHistorico(redis);
  const borradas = await redis.del(
    CLAVES.lockHistorico,          // 1. candado
    CLAVES.progresoHistorico,      // 2. cursor de la extracción
    CLAVES.metaHistorico,          // 3. resumen de la última corrida
    // acumuladores a medias de los tres derivados (scratch, no dato): lo ya
    // PUBLICADO —índice, equivalencias, vocabulario— no se toca
    CLAVES.indiceProgreso,
    CLAVES.equivalenciasProgreso,
    CLAVES.vocabularioProgreso,
  );
  return {
    ok: true, reset: true,
    msg: "Candado liberado. Vuelva a llamar sin ?reset para iniciar.",
    claves_borradas: borradas,
    // lo que NO se tocó: los chunks ya bajados siguen ahí, así que re-lanzar la
    // extracción los REEMPLAZA mes a mes en vez de duplicarlos
    corpus_historico_intacto: antes,
    aviso: "Se descartó el progreso: la próxima corrida vuelve a recorrer el rango completo. "
      + "Los procesos ya guardados NO se borraron y el índice publicado sigue en pie.",
  };
}

/* ============================ EXTRACCIÓN ============================ */
async function extraerHistorico(redis, socrata, { presupuestoMs, desde, hasta, reiniciar }) {
  const t0 = Date.now();
  let p = reiniciar ? null : await leerJSON(redis, CLAVES.progresoHistorico);
  if (!p || p.tipo !== "historico" || p.desde !== desde || p.hasta !== hasta) {
    p = {
      tipo: "historico", iniciado: new Date().toISOString(), desde, hasta,
      meses: mesesEntre(desde, hasta), mesIdx: 0,
      cursor: {}, keyset: true,
      chunkIdx: null, baseNueva: null, viejoBase: null, viejoSig: null,
      leidasMes: 0, guardadasMes: 0, esperadosMes: null,
      porMes: {}, terminado: false,
    };
    await escribirJSON(redis, CLAVES.progresoHistorico, p);
  }
  /* YA ESTABA BAJADO: no se re-extrae nada, y hay que DECIRLO con su salida.
     El corpus histórico no se purga nunca, así que lo guardado puede venir de
     una versión anterior de la proyección —en producción (24-ago-2026) el 100 %
     de los registros no traía `codigo_principal_de_categoria`, y por eso las
     granularidades por familia del índice de baja salían con cero grupos—.
     Reconstruir los derivados NO lo arregla: hay que volver a extraer. Sin esta
     instrucción, `yaEstaba: true` se lee como éxito y el intento se pierde, que
     es la «pulsación sin respuesta visible» que este proyecto ya pagó. */
  if (p.terminado) {
    return {
      done: true, yaEstaba: true, porMes: p.porMes,
      nota: "El rango ya estaba extraído: no se volvió a bajar nada. Si lo que quiere es REEMPLAZAR lo "
        + "guardado (por ejemplo porque le faltan columnas que la proyección de hoy sí conserva), "
        + "añada `&reiniciar=1` — eso vuelve a bajar el rango entero y tarda como una carga completa.",
      como_reextraer: `?desde=${p.desde}&hasta=${p.hasta}&reiniciar=1`,
    };
  }

  while (p.mesIdx < p.meses.length) {
    const mes = p.meses[p.mesIdx];

    if (p.chunkIdx == null) {
      // count caído (throw) o ilegible (null, 6-sep-2026) no mata la carga: -1 = sin auditar, publicado como null
      try { p.esperadosMes = (await socrata.contarMes(mes)) ?? -1; }
      catch { p.esperadosMes = -1; }
      const man = await leerJSON(redis, CLAVES.histManifest(mes));
      p.viejoBase = man ? (man.base || 0) : 0;
      p.viejoSig = man ? man.sig : 0;
      p.baseNueva = p.viejoSig || 0;   // append: el rango viejo sigue sirviendo
      p.chunkIdx = p.baseNueva;
      await escribirJSON(redis, CLAVES.progresoHistorico, p);
    }

    let finDeMes = false;
    while (!finDeMes) {
      if (Date.now() - t0 > presupuestoMs) {
        await escribirJSON(redis, CLAVES.progresoHistorico, p);
        return { done: false, progreso: resumen(p) };
      }
      let filas;
      try {
        filas = await socrata.paginaMes(mes, p.cursor, { pagina: PAGE, keyset: p.keyset });
      } catch (e) {
        if (e && e.status === 400 && p.keyset) {
          // el backend rechazó el keyset: degradar a $offset y reiniciar el mes
          p.keyset = false;
          p.cursor = { offset: 0 };
          p.leidasMes = 0; p.guardadasMes = 0; p.chunkIdx = p.baseNueva;
          await escribirJSON(redis, CLAVES.progresoHistorico, p);
          continue;
        }
        throw e;
      }
      if (filas.length) {
        if (p.keyset && filas[filas.length - 1][":id"] === undefined) {
          throw new Error(`${mes}: el backend no devolvió :id en modo keyset (sin avance posible)`);
        }
        // conservarCerradas: el histórico vive de los cerrados/adjudicados
        const guardables = transformar(filas, { conservarCerradas: true, conAdjudicacion: true });
        if (guardables.length) {
          p.chunkIdx = await escribirChunks(redis, (i) => CLAVES.histChunk(mes, i), p.chunkIdx, guardables);
        }
        p.leidasMes += filas.length;
        p.guardadasMes += guardables.length;
        if (p.keyset) p.cursor.lastId = filas[filas.length - 1][":id"];
        else p.cursor.offset = (p.cursor.offset || 0) + filas.length;
        await escribirJSON(redis, CLAVES.progresoHistorico, p); // reanudable página a página
      }
      finDeMes = filas.length < PAGE;
    }

    // FLIP del mes: el manifest pasa a apuntar al rango nuevo y recién ahí se
    // borra el viejo (un kill antes de esta línea deja el mes anterior intacto)
    await escribirJSON(redis, CLAVES.histManifest(mes), {
      base: p.baseNueva, sig: p.chunkIdx, count: p.guardadasMes,
      esperados: p.esperadosMes >= 0 ? p.esperadosMes : null,
      updatedAt: new Date().toISOString(),
    });
    /* PODA POR LO QUE LOS LECTORES VEN, no por el rango que el manifest
       recuerda (27-ago-2026 — el mismo patrón que la auditoría integral cerró
       en el corpus activo, vivo aquí). Los DIEZ consumidores del histórico
       leen por SCAN, así que un chunk de una corrida MUERTA —índice por encima
       del rango nuevo, que el borrado por [viejoBase, viejoSig) jamás
       alcanzaba— se servía para siempre a los índices de competencia, baja,
       equivalencias y cobertura, en el keyspace que ninguna purga toca. Tras
       el flip se borra TODO chunk del mes cuyo índice caiga fuera de
       [baseNueva, chunkIdx): exactamente el conjunto que los lectores verían
       de más. Sin SCAN se conserva el borrado por rango: peor, pero nunca
       menos. */
    let viejos = [];
    try {
      const vivos = await redis.scan(CLAVES.patronChunksHistMes(mes));
      /* ⚠️ EL DELTA PUEDE HABER APPENDEADO ENTRE EL FLIP Y ESTE SCAN (la
         revisión adversaria del propio arreglo, 27-ago-2026): `mesesEnBackfill`
         difiere solo el mes que el progreso señalaba en su snapshot, así que un
         delta que leyó antes escribe en `manifest.sig` — un índice ≥ chunkIdx
         que la cota fija habría BORRADO, destruyendo la versión de transición
         que el delta escribe una sola vez, en el keyspace que ninguna purga
         toca. La cota se toma del manifest RELEÍDO tras el scan: la unión de lo
         que el flip escribió y lo que el delta haya registrado. Queda una
         ventana mínima (chunk escrito y manifest aún no, entre dos comandos),
         dicha y no disimulada — el borrado por rango viejo tenía cero riesgo
         con el delta pero dejaba huérfanos PARA SIEMPRE. */
      const manTrasFlip = await leerJSON(redis, CLAVES.histManifest(mes));
      const cotaBase = Math.min(p.baseNueva, manTrasFlip ? (manTrasFlip.base || 0) : p.baseNueva);
      const cotaSig = Math.max(p.chunkIdx, manTrasFlip && Number.isInteger(manTrasFlip.sig) ? manTrasFlip.sig : p.chunkIdx);
      viejos = vivos.filter((k) => {
        const i = parseInt(String(k).slice(String(k).lastIndexOf(":") + 1), 10);
        return !Number.isInteger(i) || i < cotaBase || i >= cotaSig;
      });
    } catch {
      for (let i = p.viejoBase || 0; i < (p.viejoSig || 0); i++) viejos.push(CLAVES.histChunk(mes, i));
    }
    for (let i = 0; i < viejos.length; i += 50) await redis.del(...viejos.slice(i, i + 50));

    p.porMes[mes] = { esperados: p.esperadosMes >= 0 ? p.esperadosMes : null, leidas: p.leidasMes, guardadas: p.guardadasMes };
    p.mesIdx++; p.cursor = {}; p.keyset = true;
    p.chunkIdx = null; p.baseNueva = null; p.viejoBase = null; p.viejoSig = null;
    p.leidasMes = 0; p.guardadasMes = 0; p.esperadosMes = null;
    await escribirJSON(redis, CLAVES.progresoHistorico, p);
  }

  p.terminado = true;
  await escribirJSON(redis, CLAVES.progresoHistorico, p);

  const guardadas = Object.values(p.porMes).reduce((a, m) => a + m.guardadas, 0);
  const leidas = Object.values(p.porMes).reduce((a, m) => a + m.leidas, 0);
  await escribirJSON(redis, CLAVES.metaHistorico, {
    ts: new Date().toISOString(), desde, hasta, iniciado: p.iniciado,
    meses: p.meses.length, guardadas, leidas, descartadas_prefiltro: leidas - guardadas,
    porMes: p.porMes,
  });
  return { done: true, meses: p.meses.length, guardadas, leidas, porMes: p.porMes };
}

const resumen = (p) => ({
  mes: p.meses[p.mesIdx] || null, mesIdx: p.mesIdx, deMeses: p.meses.length,
  leidasMes: p.leidasMes, guardadasMes: p.guardadasMes, esperadosMes: p.esperadosMes,
});

/* ============================ HANDLER ============================ */
module.exports = async function handler(req, res) {
  const q = req.query || {};
  res.setHeader("Cache-Control", "no-store");

  const permiso = autorizarToken(req, q);
  if (!permiso.ok) {
    return res.status(permiso.status).json({
      ok: false, error: permiso.error,
      ...(permiso.como_autenticar ? { como_autenticar: permiso.como_autenticar } : {}),
    });
  }
  if (!hayCredenciales()) {
    return res.status(503).json({ ok: false, error: "Faltan UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN" });
  }

  const desde = String(q.desde || DESDE_DEFAULT);
  const hasta = String(q.hasta || HASTA_DEFAULT);
  try { mesesEntre(desde, hasta); }
  catch (e) { return res.status(400).json({ ok: false, error: String(e.message) }); }

  const siNo = (v) => ["1", "true", "si", "sí"].includes(String(v).toLowerCase());
  /* Reconstrucciones a la carta: cada una lee el corpus histórico YA bajado y
     no re-extrae nada. `reconstruir_todo` es el atajo para después de un
     cambio de reglas. Si se pide alguna, NO se extrae. */
  const todo = siNo(q.reconstruir_todo);
  const pideIndice = todo || siNo(q.reconstruir_indice);
  const pideEquivalencias = todo || siNo(q.reconstruir_equivalencias);
  const pideVocabulario = todo || siNo(q.reconstruir_vocabulario);
  const pideBaja = todo || siNo(q.reconstruir_baja);
  const soloDerivados = pideIndice || pideEquivalencias || pideVocabulario || pideBaja;
  const reiniciar = siNo(q.reiniciar);
  const presupuestoMs = Math.min(parseInt(q.presupuesto, 10) || PRESUPUESTO_DEFAULT_MS, PRESUPUESTO_MAX_MS);

  const redis = crearRedis({});
  const socrata = crearCliente({});
  const t0 = Date.now();

  // diagnóstico y rescate: ANTES del candado (uno lo lee, el otro lo borra) y
  // detrás del mismo token que todo lo demás
  try {
    if (siNo(q.estado)) return res.status(200).json({ ok: true, estado: await estadoActual(redis) });
    if (siNo(q.reset)) return res.status(200).json(await resetear(redis));
  } catch (e) {
    return res.status(502).json({ ok: false, error: `Redis: ${e.message}` });
  }

  const token = crypto.randomUUID();
  let lock;
  try { lock = (await redis.set(CLAVES.lockHistorico, token, { nx: true, ex: LOCK_HISTORICO_TTL_SEG })) === "OK"; }
  catch (e) { return res.status(502).json({ ok: false, error: `Redis: ${e.message}` }); }
  if (!lock) return res.status(200).json({ ok: true, enCurso: true, msg: "ya hay una extracción histórica corriendo" });

  let extraccion = null, indice = null, equivalencias = null, vocabulario = null, baja = null, error = null;
  try {
    if (!soloDerivados) {
      extraccion = await extraerHistorico(redis, socrata, { presupuestoMs, desde, hasta, reiniciar });
    }
    /* Los derivados se construyen SOLO con la extracción terminada (o si se
       pidieron a secas). Los tres COMPARTEN el presupuesto de la invocación y
       los tres son reanudables, así que un corte aquí lo continúa la
       siguiente. El presupuesto nunca baja de 1 ms: cada constructor comprueba
       el reloj ANTES de cada mes, así que siempre avanza al menos un mes por
       invocación y la cadena termina.
       Orden: índice → baja → equivalencias → vocabulario. Los dos primeros
       alimentan la tarjeta y el orden por defecto, así que van delante si el
       tiempo aprieta. */
    const listo = soloDerivados || (extraccion && extraccion.done);
    const restante = () => Math.max(presupuestoMs - (Date.now() - t0), 1);
    if (listo && (!soloDerivados || pideIndice)) {
      indice = await construirIndice(redis, { presupuestoMs: restante(), reiniciar: pideIndice && reiniciar });
    }
    if (listo && (!soloDerivados || pideBaja) && (!indice || indice.done)) {
      baja = await construirIndiceBaja(redis, { presupuestoMs: restante(), reiniciar: pideBaja && reiniciar });
    }
    if (listo && (!soloDerivados || pideEquivalencias) && (!indice || indice.done) && (!baja || baja.done)) {
      equivalencias = await construirEquivalencias(redis, { presupuestoMs: restante(), reiniciar: pideEquivalencias && reiniciar });
    }
    if (listo && (!soloDerivados || pideVocabulario) && (!indice || indice.done) && (!baja || baja.done) && (!equivalencias || equivalencias.done)) {
      vocabulario = await construirVocabulario(redis, { presupuestoMs: restante(), reiniciar: pideVocabulario && reiniciar });
    }
  } catch (e) {
    error = String((e && e.message) || e);
  } finally {
    try { if ((await redis.get(CLAVES.lockHistorico)) === token) await redis.del(CLAVES.lockHistorico); } catch { /* TTL limpia */ }
  }

  if (error) return res.status(502).json({ ok: false, error, duracionMs: Date.now() - t0 });

  // `done` exige que TODO lo pedido esté terminado: lo que no se pidió no cuenta
  const hecho = (pedido, r) => !pedido || !!(r && r.done);
  const done = (soloDerivados || (extraccion && extraccion.done))
    && hecho(!soloDerivados || pideIndice, indice)
    && hecho(!soloDerivados || pideBaja, baja)
    && hecho(!soloDerivados || pideEquivalencias, equivalencias)
    && hecho(!soloDerivados || pideVocabulario, vocabulario);

  // presupuesto agotado con trabajo pendiente → re-invocarse (fire-and-forget).
  // El token viaja por HEADER: nunca queda escrito en los logs de acceso.
  if (!done && q.chain !== "0") {
    try {
      const proto = req.headers["x-forwarded-proto"] || "https";
      const host = req.headers["x-forwarded-host"] || req.headers.host;
      // la llave por header; el pase del muro y el Bearer del cron los pone lib/auth (una sola copia)
      const headers = cabecerasDeAutoLlamada({ "x-historico-token": process.env.HISTORICO_TOKEN });
      const sig = new URLSearchParams({ desde, hasta });
      if (todo) sig.set("reconstruir_todo", "true");
      else {
        if (pideIndice) sig.set("reconstruir_indice", "true");
        if (pideBaja) sig.set("reconstruir_baja", "true");
        if (pideEquivalencias) sig.set("reconstruir_equivalencias", "true");
        if (pideVocabulario) sig.set("reconstruir_vocabulario", "true");
      }
      if (host) fetch(`${proto}://${host}/api/procesos?op=historico&${sig}`, { headers }).catch(() => {});
    } catch { /* relanzar a mano */ }
  }

  return res.status(200).json({
    ok: true, done, rango: { desde, hasta },
    duracionMs: Date.now() - t0, comandosRedis: redis.comandos(),
    extraccion, indice, baja, equivalencias, vocabulario,
  });
};
/* la suite EJECUTA la extracción con un Socrata cuyo count es ilegible (remate H-01,
   6-sep-2026): la guarda por regex sobre el fuente dejaba revertir el -1 en verde */
module.exports.extraerHistorico = extraerHistorico;
