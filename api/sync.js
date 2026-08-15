/* ============================================================================
   /api/sync · Sincronización SECOP II → Upstash Redis (full + delta, reanudable)
   ----------------------------------------------------------------------------
   GET /api/sync?modo=full|delta|auto [&presupuesto=ms] [&chain=0]

     full   Recorre el año vigente mes a mes (paginación keyset por :id).
            REANUDABLE: cada invocación avanza hasta agotar su presupuesto de
            tiempo y persiste el cursor en licitaciones:progreso; la siguiente
            continúa donde quedó. Al agotar presupuesto se re-invoca sola
            (fire-and-forget a sí misma) hasta terminar.
     delta  Solo lo nuevo/modificado desde la última sincronización, por el
            metacampo :updated_at con solape de 48 h. Los cambios de estado
            (Publicado → Adjudicado) REEMPLAZAN el registro vía dedup en
            lectura (gana el :updated_at más reciente) Y se COPIAN al corpus
            histórico con sus datos de adjudicación.
     auto   Lo que toque: continuar una full inconclusa; full si nunca hubo;
            delta si los datos tienen >5 min; si no, no-op {alDia:true}.

   DOS KEYSPACES (ver lib/almacen.js):
     licitaciones:activo:mes:{YYYY-MM}:chunk:{i}     lo que sirve la app.
       Se purga: la full lo reescribe entero y la compactación retira lo cerrado.
     licitaciones:historico:mes:{YYYY-MM}:chunk:{i}  memoria de largo plazo.
       NUNCA se purga aquí. Es la materia prima del índice de competencia por
       entidad. El delta ES quien alimenta el histórico en el día a día: es el
       único que ve la transición abierto → cerrado. El backfill de años
       anteriores lo hace /api/sync/historico (manual, una vez).

   Cada licitación se ENRIQUECE (lib/negocio.enriquecer) ANTES de guardarse y
   pasa el PREFILTRO DE INGESTA (lib/proyeccion.transformar) antes de tocar
   Redis (guardar las ~500k filas/año del dataset completo reventaría Upstash y
   las consultas):
     1. modalidad_competitiva  (lib/filtros): fuera Contratación Directa,
        Régimen Especial sin ofertas, Licitación Privada, RFI.
     2. estado_abierto         (lib/filtros): fuera cerrados/desconocidos —
        SOLO en la carga full. El DELTA los CONSERVA a propósito (ver
        lib/proyeccion.repartirDelta).
     3. admisibleParaIngesta   (lib/filtros): ANCHO y sin perfiles — no es
        convenio, no está en la blacklist y trae un UNSPSC de servicios/obra
        (segmentos 70-95) o de una familia que algún RUP inscribe; o, sin
        código utilizable, un objeto textualmente de obra.

   Lo que este endpoint YA NO decide (jul 2026): el matching UNSPSC por perfil,
   la pertinencia del objeto, el anti-suministro y la capacidad. Todo eso corre
   en /api/oportunidades al servir, así que afinar esas reglas o cargar un RUP
   nuevo NO exige volver a bajar el año.

   El conteo de descartadas queda en meta para auditoría. Chunks mensuales
   comprimidos (zlib.deflate nivel 6, ≤500 KB).

   Candado: lock:sync con SET NX EX 300 — TTL SIEMPRE presente, así una
   función muerta jamás deja el candado atascado (la causa clásica del
   "enCurso:true eterno"); se libera en finally solo si el token coincide.
   Sin secretos: el endpoint es idempotente, barato cuando no hay nada que
   hacer, y el candado + presupuesto lo auto-limitan.
   ========================================================================== */
"use strict";

const { crearRedis, hayCredenciales } = require("../lib/redis.js");
const {
  CLAVES, LOCK_TTL_SEG, escribirChunks, leerChunksDedup, leerJSON, escribirJSON,
} = require("../lib/almacen.js");
const { crearCliente, anoVigente, mesesDelAno } = require("../lib/socrata.js");
const { transformar, repartirDelta } = require("../lib/proyeccion.js");
const { estado_abierto } = require("../lib/filtros.js");
const { construirIndiceBaja } = require("../lib/indice_baja.js");

const PAGE = parseInt(process.env.SECOP_PAGE, 10) || 5000;
const PRESUPUESTO_DEFAULT_MS = 45000;  // cabe en el plan Hobby (60 s)
// Máx < TTL del candado (300 s) con margen para la cadena de reintentos de la
// página en curso: la invocación siempre muere antes de que expire el lock.
const PRESUPUESTO_MAX_MS = 240000;
/* Presupuesto CORTO para el índice de baja al cerrar una full: no puede comerse
   el tiempo de la sincronización, y la construcción es reanudable. */
const PRESUPUESTO_BAJA_MS = 8000;
const SOLAPE_DELTA_MS = 48 * 3600e3;
const FRESCO_MS = 5 * 60e3;            // <5 min → no-op en modo auto
const COMPACTAR_TRAS_CHUNKS = 25;
// Full de higiene mensual: acota TODA deriva del corpus ACTIVO que el delta no
// puede reflejar — la limitación documentada de conservarCerradas (un proceso ya
// guardado cuya modalidad/objeto MUTA a inválido se descarta del delta y su
// versión vieja quedaría congelada) y los cambios de reglas tras un despliegue.
// El corpus HISTÓRICO no participa: esa purga es justo lo que hacía imposible
// cualquier análisis de competencia por entidad.
const FULL_HIGIENE_MS = 30 * 24 * 3600e3;

/* ---------- escritura de chunks ---------- */
const chunksActivo = (redis, mes, desde, regs) => escribirChunks(redis, (i) => CLAVES.chunk(mes, i), desde, regs);
const chunksHistorico = (redis, mes, desde, regs) => escribirChunks(redis, (i) => CLAVES.histChunk(mes, i), desde, regs);

async function leerMes(redis, mes, manifest) {
  if (!manifest) return [];
  const ks = [];
  for (let i = manifest.base || 0; i < manifest.sig; i++) ks.push(CLAVES.chunk(mes, i));
  return leerChunksDedup(redis, ks);
}

/* Compactación de un mes tras muchos deltas append-only: reescribe el mes
   deduplicado en índices NUEVOS y solo después borra los viejos — un kill a
   mitad deja duplicados (que la lectura resuelve), nunca pérdida.
   Aquí se CONSUMA el traslado activo → histórico: lo que ya cerró sale del
   corpus activo (su copia con datos de adjudicación ya quedó en el histórico
   cuando el delta lo vio cerrar). Mientras tanto no se sirve: /api/oportunidades
   re-clasifica el estado al leer. */
async function compactarMes(redis, mes) {
  const manifest = await leerJSON(redis, CLAVES.manifest(mes));
  if (!manifest) return;
  const registros = (await leerMes(redis, mes, manifest)).filter((r) => estado_abierto(r));
  const sig = await chunksActivo(redis, mes, manifest.sig, registros);
  await escribirJSON(redis, CLAVES.manifest(mes), {
    base: manifest.sig, sig, count: registros.length, updatedAt: new Date().toISOString(),
  });
  const viejos = [];
  for (let i = manifest.base || 0; i < manifest.sig; i++) viejos.push(CLAVES.chunk(mes, i));
  if (viejos.length) await redis.del(...viejos);
}

/* Append al corpus histórico, agrupando por mes de publicación. Append-only:
   el índice de competencia deduplica por _k al construirse (gana el
   :updated_at más reciente), así que un proceso que cambie dos veces no cuenta
   dos veces. */
async function guardarHistorico(redis, registros) {
  const porMes = new Map();
  for (const r of registros) {
    const mes = String(r.fecha_de_publicacion_del || "").slice(0, 7);
    if (!/^\d{4}-\d{2}$/.test(mes)) continue;
    if (!porMes.has(mes)) porMes.set(mes, []);
    porMes.get(mes).push(r);
  }
  for (const [mes, regs] of porMes) {
    const man = (await leerJSON(redis, CLAVES.histManifest(mes))) || { base: 0, sig: 0, count: 0 };
    const sig = await chunksHistorico(redis, mes, man.sig, regs);
    await escribirJSON(redis, CLAVES.histManifest(mes), {
      ...man, sig, count: (man.count || 0) + regs.length, updatedAt: new Date().toISOString(),
    });
  }
  return porMes.size;
}

/* ============================ CARGA COMPLETA ============================ */
async function extraerFull(redis, socrata, { presupuestoMs, reiniciar }) {
  const t0 = Date.now();
  let p = reiniciar ? null : await leerJSON(redis, CLAVES.progreso);
  if (!p || p.tipo !== "full" || p.terminado) {
    p = {
      tipo: "full", iniciado: new Date().toISOString(),
      meses: mesesDelAno(), mesIdx: 0,
      cursor: {}, keyset: true, chunkIdx: 0,
      leidasMes: 0, guardadasMes: 0, esperadosMes: null, viejoSig: null,
      porMes: {}, terminado: false,
    };
    await escribirJSON(redis, CLAVES.progreso, p);
  }

  while (p.mesIdx < p.meses.length) {
    const mes = p.meses[p.mesIdx];

    if (p.esperadosMes == null) {
      try { p.esperadosMes = await socrata.contarMes(mes); }
      catch { p.esperadosMes = -1; } // count caído no mata la carga; queda sin auditar
      const manViejo = await leerJSON(redis, CLAVES.manifest(mes));
      p.viejoSig = manViejo ? manViejo.sig : 0;
      await escribirJSON(redis, CLAVES.progreso, p);
    }

    let finDeMes = false;
    while (!finDeMes) {
      if (Date.now() - t0 > presupuestoMs) {
        await escribirJSON(redis, CLAVES.progreso, p);
        return { done: false, progreso: resumen(p) };
      }
      let filas;
      try {
        filas = await socrata.paginaMes(mes, p.cursor, { pagina: PAGE, keyset: p.keyset });
      } catch (e) {
        if (e && e.status === 400 && p.keyset) {
          // el backend rechazó el keyset: degradar a $offset y reiniciar el
          // mes (los chunks ya escritos no estorban: la lectura deduplica)
          p.keyset = false;
          p.cursor = { offset: 0 }; p.leidasMes = 0; p.guardadasMes = 0; p.chunkIdx = 0;
          await escribirJSON(redis, CLAVES.progreso, p);
          continue;
        }
        throw e;
      }
      if (filas.length) {
        if (p.keyset && filas[filas.length - 1][":id"] === undefined) {
          throw new Error(`${mes}: el backend no devolvió :id en modo keyset (sin avance posible)`);
        }
        const guardables = transformar(filas);
        if (guardables.length) p.chunkIdx = await chunksActivo(redis, mes, p.chunkIdx, guardables);
        p.leidasMes += filas.length;
        p.guardadasMes += guardables.length;
        if (p.keyset) p.cursor.lastId = filas[filas.length - 1][":id"];
        else p.cursor.offset = (p.cursor.offset || 0) + filas.length;
        await escribirJSON(redis, CLAVES.progreso, p); // reanudable página a página
      }
      finDeMes = filas.length < PAGE;
    }

    // cerrar el mes: manifest nuevo + poda de chunks sobrantes de corridas viejas
    await escribirJSON(redis, CLAVES.manifest(mes), {
      base: 0, sig: p.chunkIdx, count: p.guardadasMes,
      esperados: p.esperadosMes >= 0 ? p.esperadosMes : null,
      updatedAt: new Date().toISOString(),
    });
    const sobrantes = [];
    for (let i = p.chunkIdx; i < (p.viejoSig || 0); i++) sobrantes.push(CLAVES.chunk(mes, i));
    if (sobrantes.length) await redis.del(...sobrantes);

    p.porMes[mes] = { esperados: p.esperadosMes >= 0 ? p.esperadosMes : null, leidas: p.leidasMes, guardadas: p.guardadasMes };
    p.mesIdx++; p.cursor = {}; p.chunkIdx = 0; p.leidasMes = 0; p.guardadasMes = 0;
    p.esperadosMes = null; p.viejoSig = null;
    await escribirJSON(redis, CLAVES.progreso, p);
  }

  p.terminado = true;
  await escribirJSON(redis, CLAVES.progreso, p);

  // purgar TODO mes ACTIVO fuera de la ventana vigente, descubierto por SCAN —
  // no por meta.porMes: un mes creado solo por deltas (la full corrió en marzo y
  // el delta escribió abril) no figura en meta y sus chunks quedarían servidos
  // para siempre tras el cambio de año. El histórico NO se toca.
  const meta = (await leerJSON(redis, CLAVES.meta)) || {};
  const clavesMes = await redis.scan(CLAVES.patronMeses);
  const muertas = clavesMes.filter((k) => {
    const m = CLAVES.mesDeClaveActiva(k);
    return m && !(m in p.porMes);
  });
  // corpus legado (licitaciones:mes:*, anterior a la separación activo/histórico):
  // ya nadie lo lee — purgarlo evita pagar Redis por un corpus muerto
  muertas.push(...(await redis.scan(CLAVES.patronLegado)));
  for (let i = 0; i < muertas.length; i += 50) await redis.del(...muertas.slice(i, i + 50));

  const totalGuardadas = Object.values(p.porMes).reduce((a, m) => a + m.guardadas, 0);
  const totalLeidas = Object.values(p.porMes).reduce((a, m) => a + m.leidas, 0);
  await escribirJSON(redis, CLAVES.meta, {
    ...meta,
    ano: anoVigente(),
    last_full: new Date().toISOString(),
    // el primer delta se ancla al INICIO de la full: todo lo actualizado
    // mientras corría (pudo tardar varias invocaciones) entra después
    last_sync: p.iniciado,
    porMes: p.porMes,
    total: totalGuardadas,
    leidas: totalLeidas,
    descartadas_prefiltro: totalLeidas - totalGuardadas,
  });
  return { done: true, total: totalGuardadas, leidas: totalLeidas, porMes: p.porMes, purgadas: muertas.length };
}

/* ============================ DELTA ============================ */
/* EL DELTA ES REANUDABLE (ago 2026), y la causa fue un defecto de producción:
   SECOP re-publicó EN MASA el dataset (>1 M de filas con `:updated_at` nuevo
   en un día) y el delta —que aplica lo bajado pero no avanza el sello si lo
   corta el presupuesto (regla correcta: si no, se perderían páginas)— volvía a
   EMPEZAR DE CERO en cada invocación porque su cursor era local. Resultado: un
   bucle infinito re-leyendo las mismas primeras páginas, el candado siempre
   ocupado y el dueño viendo «ya hay una sincronización corriendo» para
   siempre. La salida es la MISMA técnica de la full: el ciclo persiste su
   cursor (`meta.delta_ciclo`) y el sello avanza SOLO al completarlo, anclado
   al INICIO de la primera invocación del ciclo — la invariante no cambió, lo
   que cambió es que el ciclo ahora puede terminar.

   El ciclo guarda su VENTANA congelada (`desdeUTC`, `inicioAno`) y se valida
   contra la que tocaría hoy: si una full corrió en medio (mueve `last_sync`) o
   cambió el año, el ciclo guardado queda obsoleto y se descarta solo — un
   cursor de otra ventana leería páginas de otra consulta. */
async function extraerDelta(redis, socrata, { presupuestoMs }) {
  const t0 = Date.now();
  const meta = (await leerJSON(redis, CLAVES.meta)) || {};
  if (!meta.last_full) return extraerFull(redis, socrata, { presupuestoMs, reiniciar: false });

  const desdeEsperado = new Date(Date.parse(meta.last_sync || meta.last_full) - SOLAPE_DELTA_MS).toISOString();
  const inicioAno = `${anoVigente()}-01-01T00:00:00.000`;
  let ciclo = meta.delta_ciclo;
  if (!ciclo || ciclo.desdeUTC !== desdeEsperado || ciclo.inicioAno !== inicioAno) {
    ciclo = {
      iniciado: new Date(t0).toISOString(), // el ancla del sello, congelada
      desdeUTC: desdeEsperado, inicioAno,
      cursor: {}, keyset: true, leidas: 0, invocaciones: 0,
    };
  }
  const desdeUTC = ciclo.desdeUTC;

  const nuevos = [];
  const cursor = { ...ciclo.cursor };
  let keyset = ciclo.keyset !== false, fin = false, completo = true;
  while (!fin) {
    if (Date.now() - t0 > presupuestoMs) { completo = false; break; }
    let filas;
    try {
      filas = await socrata.paginaDelta(desdeUTC, inicioAno, cursor, { pagina: PAGE, keyset });
    } catch (e) {
      if (e && e.status === 400 && keyset) {
        keyset = false; nuevos.length = 0; cursor.lastId = undefined; cursor.offset = 0;
        continue;
      }
      if (e && e.status === 400) {
        // el backend rechaza el $where del delta (:updated_at): mejor una
        // recarga completa que datos congelados con 502 permanente
        return extraerFull(redis, socrata, { presupuestoMs: presupuestoMs - (Date.now() - t0), reiniciar: true });
      }
      throw e;
    }
    if (keyset && filas.length && filas[filas.length - 1][":id"] === undefined) {
      // sin :id el cursor no avanzaría (bucle infinito): degradar a $offset
      keyset = false; nuevos.length = 0; cursor.lastId = undefined; cursor.offset = 0;
      continue;
    }
    nuevos.push(...filas);
    if (keyset && filas.length) cursor.lastId = filas[filas.length - 1][":id"];
    else cursor.offset = (cursor.offset || 0) + filas.length;
    fin = filas.length < PAGE;
  }

  // reparto activo/histórico en una pasada (ver lib/proyeccion.repartirDelta)
  const { activo, historico } = repartirDelta(nuevos);

  // el HISTÓRICO se escribe PRIMERO: si algo falla, el registro cerrado aún no
  // ha reemplazado a la versión abierta en el activo y el próximo delta lo
  // vuelve a intentar. Al revés se perdería el dato histórico para siempre.
  const mesesHistorico = historico.length ? await guardarHistorico(redis, historico) : 0;

  // aplicar APPEND-ONLY por mes: la lectura deduplica por _k (gana el
  // :updated_at más reciente) → el cambio de estado reemplaza de facto
  const porMes = new Map();
  for (const r of activo) {
    const mes = String(r.fecha_de_publicacion_del || "").slice(0, 7);
    if (!/^\d{4}-\d{2}$/.test(mes) || !mes.startsWith(String(anoVigente()))) continue;
    if (!porMes.has(mes)) porMes.set(mes, []);
    porMes.get(mes).push(r);
  }
  for (const [mes, regs] of porMes) {
    let man = (await leerJSON(redis, CLAVES.manifest(mes))) || { base: 0, sig: 0, count: 0 };
    const sig = await chunksActivo(redis, mes, man.sig, regs);
    man = { ...man, sig, count: (man.count || 0) + regs.length, updatedAt: new Date().toISOString() };
    await escribirJSON(redis, CLAVES.manifest(mes), man);
    if (sig - (man.base || 0) > COMPACTAR_TRAS_CHUNKS) await compactarMes(redis, mes);
  }

  // el sello avanza SOLO si el CICLO quedó completo, y se ancla al INICIO de
  // la primera invocación del ciclo: un delta cortado no pierde páginas en
  // silencio — pero ahora deja su cursor guardado y la siguiente invocación
  // CONTINÚA en vez de volver a empezar (el bucle infinito de ago 2026).
  if (completo) {
    meta.last_sync = ciclo.iniciado;
    delete meta.delta_ciclo;
  } else {
    meta.delta_ciclo = {
      ...ciclo, cursor, keyset,
      leidas: (ciclo.leidas || 0) + nuevos.length,
      invocaciones: (ciclo.invocaciones || 0) + 1,
    };
  }
  meta.ultimo_delta = {
    ts: new Date().toISOString(), filas: nuevos.length, guardadas: activo.length,
    meses: porMes.size, historicas: historico.length, meses_historico: mesesHistorico,
    parcial: !completo,
    // cuántas lleva el ciclo en total: es lo que permite ver AVANCE donde
    // antes solo se veía «parcial» repetido
    ciclo_leidas: (ciclo.leidas || 0) + nuevos.length,
    ciclo_invocaciones: (ciclo.invocaciones || 0) + 1,
  };
  await escribirJSON(redis, CLAVES.meta, meta);
  return { done: completo, delta: meta.ultimo_delta };
}

const resumen = (p) => ({
  mes: p.meses[p.mesIdx] || null, mesIdx: p.mesIdx, deMeses: p.meses.length,
  leidasMes: p.leidasMes, esperadosMes: p.esperadosMes,
});

/* ============================ HANDLER ============================ */
module.exports = async function handler(req, res) {
  const q = req.query || {};
  const modo = String(q.modo || "auto").toLowerCase();
  if (!["full", "delta", "auto"].includes(modo)) {
    return res.status(400).json({ ok: false, error: "modo inválido: use full | delta | auto" });
  }
  if (!hayCredenciales()) {
    return res.status(503).json({ ok: false, error: "Faltan UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN" });
  }
  const presupuestoMs = Math.min(parseInt(q.presupuesto, 10) || PRESUPUESTO_DEFAULT_MS, PRESUPUESTO_MAX_MS);
  const redis = crearRedis({});
  const socrata = crearCliente({});
  const t0 = Date.now();

  // candado con TTL: si otra sincronización corre, no estorbar
  const token = (globalThis.crypto && crypto.randomUUID) ? crypto.randomUUID() : `${Math.random()}${Date.now()}`;
  let lock;
  try { lock = (await redis.set(CLAVES.lock, token, { nx: true, ex: LOCK_TTL_SEG })) === "OK"; }
  catch (e) { return res.status(502).json({ ok: false, error: `Redis: ${e.message}` }); }
  if (!lock) return res.status(200).json({ ok: true, enCurso: true, msg: "ya hay una sincronización corriendo" });

  let r, error = null;
  try {
    if (modo === "full") {
      r = await extraerFull(redis, socrata, { presupuestoMs, reiniciar: true });
    } else if (modo === "delta") {
      r = await extraerDelta(redis, socrata, { presupuestoMs });
    } else { // auto
      const progreso = await leerJSON(redis, CLAVES.progreso);
      const meta = (await leerJSON(redis, CLAVES.meta)) || {};
      if (progreso && progreso.tipo === "full" && !progreso.terminado) {
        r = await extraerFull(redis, socrata, { presupuestoMs, reiniciar: false });
      } else if (!meta.last_full || meta.ano !== anoVigente()
          || Date.now() - Date.parse(meta.last_full) > FULL_HIGIENE_MS) {
        // sin carga inicial, cambio de año (la ventana vigente es otra) o
        // full con más de un mes: recarga completa (higiene del corpus activo)
        r = await extraerFull(redis, socrata, { presupuestoMs, reiniciar: true });
      } else if (Date.now() - Date.parse(meta.last_sync || 0) > FRESCO_MS) {
        r = await extraerDelta(redis, socrata, { presupuestoMs });
      } else {
        r = { done: true, alDia: true, last_sync: meta.last_sync };
      }
    }
  } catch (e) {
    error = String((e && e.message) || e);
  } finally {
    // liberar solo si el token sigue siendo nuestro (si la función murió
    // antes, el TTL de 300 s limpia solo — jamás un candado eterno)
    try { if ((await redis.get(CLAVES.lock)) === token) await redis.del(CLAVES.lock); } catch { /* TTL limpia */ }
  }

  if (error) return res.status(502).json({ ok: false, modo, error, duracionMs: Date.now() - t0 });

  // presupuesto agotado con trabajo pendiente → re-invocarse (fire-and-forget)
  // para que la carga completa termine sola; el candado ya quedó libre.
  if (r && r.done === false && q.chain !== "0") {
    try {
      const proto = req.headers["x-forwarded-proto"] || "https";
      const host = req.headers["x-forwarded-host"] || req.headers.host;
      // con Vercel Password Protection activa, el muro del edge intercepta
      // ANTES de la función; el bypass de automatización lo salva
      const headers = process.env.VERCEL_AUTOMATION_BYPASS_SECRET
        ? { "x-vercel-protection-bypass": process.env.VERCEL_AUTOMATION_BYPASS_SECRET } : undefined;
      if (host) fetch(`${proto}://${host}/api/sync?modo=auto`, { headers }).catch(() => {});
    } catch { /* la siguiente visita o el cron continúan */ }
  }

  /* Índice de baja: se reconstruye al TERMINAR una full, sin bloquear la
     respuesta. Por qué aquí y por qué así:
       · la full reescribe el corpus activo, pero el delta que corre dentro de
         ella es lo que alimenta el HISTÓRICO, así que tras una full completa
         hay adjudicaciones nuevas que el índice todavía no ha visto;
       · va con `await` sobre un presupuesto CORTO (no fire-and-forget a otra
         URL): en serverless la función se congela al responder, así que una
         promesa suelta no tiene ninguna garantía de terminar. Con presupuesto
         corto o bien acaba, o bien deja el progreso escrito y lo continúa la
         siguiente llamada — la construcción es reanudable;
       · si falla, NO tumba el sync: el índice es un derivado y su ausencia solo
         deja las tarjetas sin badge de baja. */
  let baja = null;
  if (r && r.done === true && q.baja !== "0") {
    try {
      baja = await construirIndiceBaja(redis, { presupuestoMs: PRESUPUESTO_BAJA_MS });
    } catch (e) {
      baja = { done: false, error: String((e && e.message) || e) };
    }
  }

  return res.status(200).json({ ok: true, modo, duracionMs: Date.now() - t0, comandosRedis: redis.comandos(), ...r, baja });
};
