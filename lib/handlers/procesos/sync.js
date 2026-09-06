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
   Quién puede llamarlo (6-sep-2026, M-SEG-08): con CRON_SECRET en el entorno,
   solo el cron de Vercel (Authorization: Bearer), el dueño con la llave de la
   aplicación y la propia cadena (lib/auth.autorizarSincronizacion; 401 con
   qué hacer si no). Sin esa variable sigue siendo público como nació: el
   endpoint es idempotente, barato cuando no hay nada que hacer, y el candado
   + presupuesto lo auto-limitan.
   ========================================================================== */
"use strict";

const { crearRedis, hayCredenciales } = require("../../redis.js");
const {
  CLAVES, LOCK_TTL_SEG, escribirChunks, leerChunksDedup, leerJSON, escribirJSON,
} = require("../../almacen.js");
const { crearCliente, anoVigente, mesesDelAno } = require("../../socrata.js");
const { transformar, repartirDelta } = require("../../proyeccion.js");
const { estado_abierto } = require("../../filtros.js");
const { fechaOperable } = require("../../habiles.js");
const { crearCenso, fusionar: fusionarCenso } = require("../../censo_ingesta.js");
const { construirIndiceBaja } = require("../../indice_baja.js");
const { autorizarSincronizacion, cabecerasDeAutoLlamada } = require("../../auth.js");

const PAGE = parseInt(process.env.SECOP_PAGE, 10) || 5000;
/* PRESUPUESTO POR TANDA, documentado como está (6-sep-2026, M-INF-14): 45 s
   por invocación, full y delta. El comentario anterior decía «cabe en el plan
   Hobby (60 s)» y ese tope ya no existe: api/procesos.js declara maxDuration
   300 en vercel.json, y con Fluid Compute Vercel documenta 300 s en Hobby y
   800 s en Pro (25-jun-2025; no releído desde aquí el 6-sep-2026: proxy 403).
   Se CONSERVA en 45 s porque subirlo sin haber medido una tanda real en
   producción (M-INF-03, pendiente) es adivinar: la full de ~6 tandas
   encadenadas depende del secreto de bypass, y el valor por modo (full más
   larga, delta corto para no retener el candado en cada visita) se fija cuando
   exista esa medición. La suite fija DEFAULT ≤ MAX < candado ≤ maxDuration. */
const PRESUPUESTO_DEFAULT_MS = 45000;
// Máx < TTL del candado (300 s) con margen para la cadena de reintentos de la
// página en curso: la invocación siempre muere antes de que expire el lock.
const PRESUPUESTO_MAX_MS = 240000;
/* Presupuesto CORTO para el índice de baja al cerrar una full: no puede comerse
   el tiempo de la sincronización, y la construcción es reanudable. */
const PRESUPUESTO_BAJA_MS = 8000;
const SOLAPE_DELTA_MS = 48 * 3600e3;
const FRESCO_MS = 5 * 60e3;            // <5 min → no-op en modo auto
/* REFRESCO MENSUAL DEL HISTÓRICO (ago 2026). SECOP re-publica procesos de
   años pasados regenerando sus filas (:id y :updated_at nuevos), y el delta
   solo mira el año vigente: sin una re-pasada periódica, el corpus histórico
   DERIVA — se midió en producción (GPS S.A.S en Pereira: 8 ganados contados
   contra 11 reales; la entidad entera, 86 contra 183). El disparo vive aquí
   porque /api/sync corre con cada visita: cuando el corpus activo está al
   día y la última extracción histórica completa tiene más de un mes, se
   patea /api/sync/historico como fire-and-forget CON el token de la app —
   su cadena se auto-continúa e incluye la reconstrucción de índices. */
const REFRESCO_HISTORICO_MS = 30 * 24 * 3600e3;
const DESDE_HISTORICO = "2024-01";     // decisión del dueño (2026-08-15): gerencias de gobiernos pasados no describen la competencia de hoy
const CLAVE_KICK_HISTORICO = "sync:kick:historico"; // throttle atómico del disparo (SET NX EX)
const COMPACTAR_TRAS_CHUNKS = 25;
// Full de higiene mensual: acota TODA deriva del corpus ACTIVO que el delta no
// puede reflejar — la limitación documentada de conservarCerradas (un proceso ya
// guardado cuya modalidad/objeto MUTA a inválido se descarta del delta y su
// versión vieja quedaría congelada) y los cambios de reglas tras un despliegue.
// El corpus HISTÓRICO no participa: esa purga es justo lo que hacía imposible
// cualquier análisis de competencia por entidad.
const FULL_HIGIENE_MS = 30 * 24 * 3600e3;

/* ---------- censo de descartes de la ingesta (lib/censo_ingesta) ----------
   Se guarda por TIPO de corrida (`full` / `delta`) bajo una sola clave, para
   que el diagnóstico pueda enseñar las dos: la full dice qué tira el año
   entero y el delta qué tira lo que acaba de publicarse — que es la pregunta
   del dueño cuando echa en falta un proceso de esta semana.
   Best-effort: un fallo escribiendo el censo NO puede tumbar una
   sincronización. Es un diagnóstico, no un dato del negocio. */
async function guardarCenso(redis, tipo, resumen, { acumular = false } = {}) {
  try {
    const guardado = (await leerJSON(redis, CLAVES.censoIngesta)) || {};
    const previo = acumular ? guardado[tipo] && guardado[tipo].censo : null;
    guardado[tipo] = { ts: new Date().toISOString(), censo: fusionarCenso(previo, resumen) };
    await escribirJSON(redis, CLAVES.censoIngesta, guardado);
  } catch { /* el censo es diagnóstico: nunca frena la sincronización */ }
}

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
/* Señales de cierre para los procesos que se cierran en este delta: se leen
   las versiones ya guardadas en el corpus ACTIVO (solo los meses de publicación
   afectados) con `leerChunksDedup({senales:true})` y se comparan con la fila
   nueva. prorrogado ⇔ alguna versión guardada cerraba ANTES que la vigente (la
   de la fila nueva) o ya lo era entre las guardadas. */
async function senalesDeCierre(redis, historico) {
  const meses = new Set();
  for (const r of historico) {
    const mes = String(r.fecha_de_publicacion_del || "").slice(0, 7);
    if (/^\d{4}-\d{2}$/.test(mes)) meses.add(mes);
  }
  const claves = [];
  for (const mes of meses) claves.push(...(await redis.scan(CLAVES.patronChunksMes(mes))));
  const salida = new Map();
  if (!claves.length) return salida;
  const guardadas = await leerChunksDedup(redis, claves, { senales: true });
  const porK = new Map(guardadas.map((g) => [g._k, g]));
  for (const r of historico) {
    const g = porK.get(r._k);
    if (!g) continue;
    // instantes solo de fechas OPERABLES: el 1970 de timestamp nulo no es un
    // cierre previo (misma guarda que lib/almacen, 1-sep-2026)
    const instante = (f) => (f && fechaOperable(String(f)) ? Date.parse(f) : NaN);
    const vigente = instante(r.fecha_cierre);
    const previo = instante(g.fecha_cierre);
    const inicial = instante(g._cierre_inicial);
    const prorrogado = !!g._cierre_prorrogado
      || (Number.isFinite(vigente) && Number.isFinite(previo) && previo < vigente)
      || (Number.isFinite(vigente) && Number.isFinite(inicial) && inicial < vigente);
    salida.set(r._k, {
      prorrogado,
      versiones: (g._versiones || 1) + 1,
      cierre_inicial: g._cierre_inicial || g.fecha_cierre || r.fecha_cierre || null,
    });
  }
  return salida;
}

/* EL MES QUE EL BACKFILL TIENE ABIERTO NO SE TOCA (ago 2026).
   `guardarHistorico` elige el índice de chunk leyendo `man.sig`, y el backfill
   (`handlers/procesos/historico.js`) fija su `baseNueva = viejoSig` al ABRIR el
   mes y escribe hacia arriba SIN actualizar el manifest hasta el flip del final.
   Los dos corren bajo candados DISTINTOS y la concurrencia es rutinaria por
   diseño (el propio sync auto-dispara el refresco mensual mientras las visitas
   siguen lanzando deltas), así que ambos escribían en el MISMO índice: el delta
   pisaba el chunk que el backfill acababa de escribir y, como su cursor ya había
   pasado, esos registros desaparecían del keyspace que «ninguna purga toca»
   hasta el siguiente refresco (≤30 días), con el `count` del manifest mintiendo.
   Reproducido con los dos handlers reales sobre mocks en memoria.
   La salida es la barata y sin claves nuevas: el backfill está RE-BAJANDO ese
   mes entero de la fuente (con `conservarCerradas`), así que sus datos mandan y
   el delta DIFIERE los suyos. No se pierde nada —el propio backfill guarda el
   proceso— y lo diferido se cuenta: nunca en silencio. */
async function mesesEnBackfill(redis) {
  try {
    const p = await leerJSON(redis, CLAVES.progresoHistorico);
    if (!p || p.terminado || !Array.isArray(p.meses)) return new Set();
    // el mes que está procesando ahora mismo (los ya cerrados hicieron flip)
    const actual = p.meses[p.mesIdx];
    return actual ? new Set([actual]) : new Set();
  } catch { return new Set(); }   // sin poder leer el progreso se escribe como siempre
}

async function guardarHistorico(redis, registros) {
  const porMes = new Map();
  for (const r of registros) {
    const mes = String(r.fecha_de_publicacion_del || "").slice(0, 7);
    if (!/^\d{4}-\d{2}$/.test(mes)) continue;
    if (!porMes.has(mes)) porMes.set(mes, []);
    porMes.get(mes).push(r);
  }
  const ocupados = porMes.size ? await mesesEnBackfill(redis) : new Set();
  let diferidos = 0;
  for (const [mes, regs] of porMes) {
    if (ocupados.has(mes)) { diferidos += regs.length; continue; }
    const man = (await leerJSON(redis, CLAVES.histManifest(mes))) || { base: 0, sig: 0, count: 0 };
    const sig = await chunksHistorico(redis, mes, man.sig, regs);
    await escribirJSON(redis, CLAVES.histManifest(mes), {
      ...man, sig, count: (man.count || 0) + regs.length, updatedAt: new Date().toISOString(),
    });
  }
  return { meses: porMes.size - ocupados.size, diferidos };
}

/* ============================ CARGA COMPLETA ============================ */
async function extraerFull(redis, socrata, { presupuestoMs, reiniciar }) {
  const t0 = Date.now();
  /* Un censo POR INVOCACIÓN, que se persiste una sola vez en cada una de las
     DOS salidas de esta función (presupuesto agotado y fin de la carga). La
     full se auto-encadena, así que las continuaciones ACUMULAN sobre lo ya
     guardado y solo una carga NUEVA lo reemplaza — ver `fullNueva`. */
  const censo = crearCenso();
  let p = reiniciar ? null : await leerJSON(redis, CLAVES.progreso);
  /* ¿Esta invocación EMPIEZA una carga nueva? Decide si el censo se acumula o
     se reemplaza: acumular siempre haría que el censo de la full anterior se
     sumara al de la nueva y «cuántos descartó ESTA carga» dejaría de tener
     respuesta. Las continuaciones sí acumulan (la full son varias tandas). */
  const fullNueva = !p || p.tipo !== "full" || p.terminado;
  if (fullNueva) {
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
      // count caído (throw) o ilegible (null, 6-sep-2026) no mata la carga: -1 = sin auditar,
      // y así no se vuelve a pedir el count en cada página del mes; se publica como null
      try { p.esperadosMes = (await socrata.contarMes(mes)) ?? -1; }
      catch { p.esperadosMes = -1; }
      const manViejo = await leerJSON(redis, CLAVES.manifest(mes));
      p.viejoSig = manViejo ? manViejo.sig : 0;
      await escribirJSON(redis, CLAVES.progreso, p);
    }

    let finDeMes = false;
    while (!finDeMes) {
      if (Date.now() - t0 > presupuestoMs) {
        await escribirJSON(redis, CLAVES.progreso, p);
        await guardarCenso(redis, "full", censo.resumen(), { acumular: !fullNueva });
        return { done: false, progreso: resumen(p), censo_ingesta: censo.resumen() };
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
        const guardables = transformar(filas, { censo });
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
    /* PODA POR LO QUE LOS LECTORES VEN, no por el rango que el manifest recuerda
       (ago 2026). El borrado iba de `chunkIdx` a `viejoSig`, así que los chunks
       de una corrida MUERTA —que nunca llegó a escribir su manifest— quedaban
       fuera de ese rango y sobrevivían; y como la app lee el corpus por SCAN
       (`patronChunks`), los servía como procesos que ya no existen en la fuente.
       Reproducido: full muerta tras escribir 0 y 1, relanzada con un solo
       proceso vivo → manifest {base:0,sig:1} y `chunk:1` sirviéndose igual.
       Ahora se escanea el mes y se borra TODO chunk cuyo índice caiga fuera de
       [0, chunkIdx): es exactamente el conjunto que los lectores verían de más. */
    let sobrantes = [];
    try {
      const vivos = await redis.scan(CLAVES.patronChunksMes(mes));
      sobrantes = vivos.filter((k) => {
        const i = parseInt(String(k).slice(String(k).lastIndexOf(":") + 1), 10);
        return !Number.isInteger(i) || i >= p.chunkIdx;
      });
    } catch {
      // sin SCAN se conserva el borrado por rango: peor, pero nunca menos
      for (let i = p.chunkIdx; i < (p.viejoSig || 0); i++) sobrantes.push(CLAVES.chunk(mes, i));
    }
    if (sobrantes.length) await redis.del(...sobrantes);

    /* OJO: aquí NO se persiste el censo. `censo` es acumulativo de la
       INVOCACIÓN, así que guardarlo con `acumular` al cerrar cada mes sumaría
       dos veces lo censado en el mes anterior (C1, luego C1+C2 → 2·C1+C2). Se
       persiste UNA sola vez por invocación, en sus dos salidas: presupuesto
       agotado y fin de la carga. Lo cazó la revisión del propio arreglo. */
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
  const fueraDeVentana = new Set(clavesMes.map((k) => CLAVES.mesDeClaveActiva(k)).filter((m) => m && !(m in p.porMes)));
  /* ⚠️ UN MES DEL AÑO ANTERIOR CON PROCESOS TODAVÍA ABIERTOS SE CONSERVA
     (1-sep-2026). La ventana del corpus activo es el año calendario de
     PUBLICACIÓN, así que la primera full de enero purgaba noviembre y
     diciembre enteros —el pico de publicación por ejecución de vigencia— con
     sus licitaciones abiertas hasta enero o febrero dentro, y el delta (que
     arrancaba el 1 de enero) no las volvía a leer jamás: desaparecían del
     listado, la portada y el calendario el 1 de enero sin rastro. Se leen los
     chunks del mes y, si alguno sigue abierto, el mes se queda; la siguiente
     full lo retira cuando ya no quede nada abierto. Los meses del año vigente
     que no están en `porMes` siguen siendo basura (los creó solo un delta). */
  const retenidos = [];
  for (const m of [...fueraDeVentana]) {
    if (m >= p.meses[0]) continue;
    const chunks = await redis.scan(CLAVES.patronChunksMes(m));
    if (!chunks.length) continue;
    const filas = await leerChunksDedup(redis, chunks);
    if (filas.some((r) => estado_abierto(r))) { fueraDeVentana.delete(m); retenidos.push(m); }
  }
  retenidos.sort();
  const muertas = clavesMes.filter((k) => fueraDeVentana.has(CLAVES.mesDeClaveActiva(k)));
  // corpus legado (licitaciones:mes:*, anterior a la separación activo/histórico):
  // ya nadie lo lee — purgarlo evita pagar Redis por un corpus muerto
  muertas.push(...(await redis.scan(CLAVES.patronLegado)));
  for (let i = 0; i < muertas.length; i += 50) await redis.del(...muertas.slice(i, i + 50));

  const totalGuardadas = Object.values(p.porMes).reduce((a, m) => a + m.guardadas, 0);
  const totalLeidas = Object.values(p.porMes).reduce((a, m) => a + m.leidas, 0);
  // la full terminó bien: el último intento ya no es un fallo (op=salud, M-INF-04)
  delete meta.ultimo_error;
  await escribirJSON(redis, CLAVES.meta, {
    ...meta,
    ano: anoVigente(),
    last_full: new Date().toISOString(),
    // el primer delta se ancla al INICIO de la full: todo lo actualizado
    // mientras corría (pudo tardar varias invocaciones) entra después
    last_sync: p.iniciado,
    porMes: p.porMes,
    meses_retenidos: retenidos, // del año anterior, con procesos aún abiertos (el delta los sigue leyendo)
    total: totalGuardadas,
    leidas: totalLeidas,
    descartadas_prefiltro: totalLeidas - totalGuardadas,
  });
  const censoFull = censo.resumen();
  await guardarCenso(redis, "full", censoFull, { acumular: !fullNueva });
  return {
    done: true, total: totalGuardadas, leidas: totalLeidas, porMes: p.porMes,
    purgadas: muertas.length, censo_ingesta: censoFull,
  };
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
async function inicioVentanaDelta(redis) {
  const enero = `${anoVigente()}-01-01T00:00:00.000`;
  const meses = (await redis.scan(CLAVES.patronMeses)).map((k) => CLAVES.mesDeClaveActiva(k)).filter(Boolean).sort();
  const primero = meses[0] ? `${meses[0]}-01T00:00:00.000` : null;
  return primero && primero < enero ? primero : enero;
}

async function extraerDelta(redis, socrata, { presupuestoMs }) {
  const t0 = Date.now();
  const meta = (await leerJSON(redis, CLAVES.meta)) || {};
  if (!meta.last_full) return extraerFull(redis, socrata, { presupuestoMs, reiniciar: false });

  const desdeEsperado = new Date(Date.parse(meta.last_sync || meta.last_full) - SOLAPE_DELTA_MS).toISOString();
  /* La ventana del delta arranca en enero del año vigente, o ANTES si la full
     retuvo meses del año anterior con procesos abiertos (1-sep-2026): sin esto
     el proceso de diciembre seguía en el corpus pero ninguna adenda ni cambio
     de estado le llegaba nunca. Manda el mes activo más antiguo presente en
     Redis; sin meses retenidos la ventana es la de siempre. */
  const inicioAno = await inicioVentanaDelta(redis);
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
  const censo = crearCenso();
  const { activo, historico } = repartirDelta(nuevos, { censo });
  /* B3 (ago 2026): antes de escribir el histórico se le ESTAMPA la señal de
     prórroga del cierre, que hasta hoy moría con el corpus activo (la full lo
     purga y el histórico guarda una sola versión: por eso el ×1,20 no se podía
     calibrar). Se leen SOLO los meses de publicación de los procesos que
     cierran en este delta. Un fallo aquí no puede frenar el delta: se sigue
     sin la señal y se cuenta. */
  let senalesEstampadas = 0;
  if (historico.length) {
    try {
      const sen = await senalesDeCierre(redis, historico);
      for (const r of historico) {
        const x = sen.get(r._k);
        if (!x) continue;
        r.cierre_prorrogado = x.prorrogado;
        r.versiones_vistas = x.versiones;
        r.fecha_cierre_inicial = x.cierre_inicial;
        senalesEstampadas++;
      }
    } catch { /* sin señal: el histórico se escribe igual */ }
  }

  // el HISTÓRICO se escribe PRIMERO: si algo falla, el registro cerrado aún no
  // ha reemplazado a la versión abierta en el activo y el próximo delta lo
  // vuelve a intentar. Al revés se perdería el dato histórico para siempre.
  const hist = historico.length ? await guardarHistorico(redis, historico) : { meses: 0, diferidos: 0 };
  const mesesHistorico = hist.meses;

  // aplicar APPEND-ONLY por mes: la lectura deduplica por _k (gana el
  // :updated_at más reciente) → el cambio de estado reemplaza de facto
  /* `guardadas` MENTÍA (ago 2026). Este bucle descarta con un `continue` toda
     fila cuya fecha de publicación no caiga en el año vigente —o no se pueda
     leer— y aun así la respuesta publicaba `guardadas: activo.length`, o sea
     contaba como guardado lo que nunca se escribió. Es el `|| 0` sobre un
     conteo en otra forma: un número que afirma más de lo que ocurrió. Ahora se
     cuenta en el censo (`mes_fuera_de_ventana`) y `guardadas` dice la verdad. */
  const porMes = new Map();
  let escritas = 0;
  for (const r of activo) {
    const mes = String(r.fecha_de_publicacion_del || "").slice(0, 7);
    if (!/^\d{4}-\d{2}$/.test(mes) || mes < inicioAno.slice(0, 7)) {
      censo.reclasificar("mes_fuera_de_ventana", r);
      continue;
    }
    if (!porMes.has(mes)) porMes.set(mes, []);
    porMes.get(mes).push(r);
    escritas++;
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
  const censoDelta = censo.resumen();
  // se acumula dentro del MISMO ciclo (un delta cortado se reanuda en la
  // siguiente visita) y se REEMPLAZA cuando arranca uno nuevo: si no, «cuántos
  // descartó el último delta» acabaría siendo el acumulado de la semana
  await guardarCenso(redis, "delta", censoDelta, { acumular: (ciclo.invocaciones || 0) > 0 });

  meta.ultimo_delta = {
    ts: new Date().toISOString(), filas: nuevos.length,
    // `guardadas` = lo que de verdad se ESCRIBIÓ (ver el bucle de `porMes`):
    // antes publicaba `activo.length`, que incluía filas nunca escritas
    guardadas: escritas, aceptadas_por_la_cascada: activo.length,
    censo_ingesta: censoDelta,
    meses: porMes.size, historicas: historico.length, meses_historico: mesesHistorico,
    /* Registros que NO se escribieron al histórico porque el backfill está
       re-bajando ese mes de la fuente: sus datos mandan y estos se descartan.
       Se publica para que nunca sea silencioso (0 = no había backfill abierto). */
    ...(hist.diferidos ? { historicas_diferidas_por_backfill: hist.diferidos } : {}),
    senales_cierre_estampadas: senalesEstampadas,
    parcial: !completo,
    // cuántas lleva el ciclo en total: es lo que permite ver AVANCE donde
    // antes solo se veía «parcial» repetido
    ciclo_leidas: (ciclo.leidas || 0) + nuevos.length,
    ciclo_invocaciones: (ciclo.invocaciones || 0) + 1,
  };
  // el delta corrió sin fallar (completo o cortado por presupuesto, que se reanuda):
  // el último intento ya no es un fallo (op=salud, M-INF-04)
  delete meta.ultimo_error;
  await escribirJSON(redis, CLAVES.meta, meta);
  return { done: completo, delta: meta.ultimo_delta };
}

const resumen = (p) => ({
  mes: p.meses[p.mesIdx] || null, mesIdx: p.mesIdx, deMeses: p.meses.length,
  leidasMes: p.leidasMes, esperadosMes: p.esperadosMes,
});

/* ─────────── ¿toca refrescar el histórico? (pura, con prueba) ───────────
   Reglas: jamás disparar el PRIMER backfill (es decisión manual del dueño —
   los pasos de despliegue lo dicen); una cadena muerta a medias se REANUDA
   con su propio rango y SIN reiniciar (reiniciar por encima tiraría el
   avance); y el refresco completo solo cuando la última extracción terminada
   tiene más de REFRESCO_HISTORICO_MS. `hasta` se calcula en hora Colombia:
   el mes del dataset es el mes colombiano, no el de UTC. */
function decidirRefrescoHistorico({ metaHist, progreso, candadoTomado, ahora = Date.now() } = {}) {
  if (candadoTomado) return null;
  if (progreso && progreso.tipo === "historico" && !progreso.terminado) {
    return { desde: progreso.desde, hasta: progreso.hasta, reiniciar: false, motivo: "reanudar_cadena_muerta" };
  }
  if (!metaHist || !metaHist.ts) return null;
  if (ahora - Date.parse(metaHist.ts) < REFRESCO_HISTORICO_MS) return null;
  const mesColombia = new Date(ahora - 5 * 3600e3).toISOString().slice(0, 7);
  return { desde: DESDE_HISTORICO, hasta: mesColombia, reiniciar: true, motivo: "refresco_mensual" };
}

/* ============================ HANDLER ============================ */
module.exports = async function handler(req, res) {
  const q = req.query || {};
  /* La guarda va ANTES del candado: un 401 jamás lo deja puesto (la misma
     regla que el histórico). Sin CRON_SECRET responde ok y el endpoint sigue
     público como hasta hoy (M-SEG-08, 6-sep-2026). */
  const guarda = autorizarSincronizacion(req, q);
  if (!guarda.ok) {
    return res.status(guarda.status).json({ ok: false, error: guarda.error, como_autenticar: guarda.como_autenticar });
  }
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
    /* EL FALLO SE GUARDA (6-sep-2026, M-INF-04). Antes vivía solo en el 502 de
       esta respuesta —que el cron de las 08:30 recibe y nadie lee— y en un
       registro que dura una hora: producción estuvo 14 h sin sincronizar y se
       supo por un cliente. Se escribe en `meta` para que op=salud (público, sin
       token) lo publique y la barra de la lista diga «hoy no se pudo actualizar»
       en vez de un ámbar mudo. Texto de terceros: pasa por tacharClave (censo
       de secretos del entorno) y se corta a 200 caracteres. Best-effort: si lo
       que falla es Redis, tampoco se podrá escribir y op=salud responderá 502,
       que es la señal que el monitor necesita. */
    try {
      const { tacharClave } = require("../../apu_ocr.js");
      const metaAhora = (await leerJSON(redis, CLAVES.meta)) || {};
      await escribirJSON(redis, CLAVES.meta, {
        ...metaAhora,
        ultimo_error: { ts: new Date().toISOString(), modo, texto: tacharClave(error).slice(0, 200) },
      });
    } catch { /* Redis caído: op=salud lo enseña como 502 */ }
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
      // ANTES de la función; el bypass de automatización lo salva. Y con la
      // guarda del cron activa, la cadena se identifica con el Bearer (lib/auth)
      const headers = cabecerasDeAutoLlamada();
      if (host) fetch(`${proto}://${host}/api/procesos?op=sync&modo=auto`, { headers }).catch(() => {});
    } catch { /* la siguiente visita o el cron continúan */ }
  }

  /* REFRESCO MENSUAL DEL HISTÓRICO: solo en modo auto, con el corpus al día
     (r.done) y con el token en el entorno — el endpoint del histórico lo
     exige y sin él el disparo solo generaría 401 en los logs. El throttle es
     un SET NX EX de 10 minutos: atómico, sin tocar `meta` (que fuera del
     candado podría pisar el cursor de un ciclo de delta). La decisión es
     `decidirRefrescoHistorico`, pura y con prueba. */
  if (modo === "auto" && r && r.done === true && process.env.HISTORICO_TOKEN && q.chain !== "0") {
    try {
      const [metaHist, progresoHist, candadoHist] = await Promise.all([
        leerJSON(redis, CLAVES.metaHistorico),
        leerJSON(redis, CLAVES.progresoHistorico),
        redis.get(CLAVES.lockHistorico),
      ]);
      const refresco = decidirRefrescoHistorico({ metaHist, progreso: progresoHist, candadoTomado: !!candadoHist });
      if (refresco && (await redis.set(CLAVE_KICK_HISTORICO, "1", { nx: true, ex: 600 })) === "OK") {
        const proto = req.headers["x-forwarded-proto"] || "https";
        const host = req.headers["x-forwarded-host"] || req.headers.host;
        const headers = cabecerasDeAutoLlamada({ "x-historico-token": process.env.HISTORICO_TOKEN });
        const qs = new URLSearchParams({ desde: refresco.desde, hasta: refresco.hasta });
        if (refresco.reiniciar) qs.set("reiniciar", "true");
        if (host) fetch(`${proto}://${host}/api/procesos?op=historico&${qs}`, { headers }).catch(() => {});
      }
    } catch { /* el refresco es best-effort: la próxima visita reintenta */ }
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

  /* Fase 9 · la PORTADA se precalcula aquí, al terminar una corrida que trajo
     datos (full o delta completos; `alDia` no cambia nada). Con `await` y con
     su propio try: en serverless una promesa suelta no tiene garantía de
     terminar, y un fallo al agregar no puede convertir una sincronización
     buena en un 502. La petición del usuario (`op=portada`) solo lee. */
  let portada = null;
  if (r && r.done && !r.alDia) {
    try {
      const { reconstruirPortada } = require("../../portada.js");
      const { cargarCorpus } = require("./listar.js");
      const { consultarPaa } = require("../../paa.js");
      const p = await reconstruirPortada(redis, { cargarCorpus, consultarPaa });
      portada = p ? { generado: p.generado, procesosAbiertos: p.procesosAbiertos, entidadesActivas: p.entidadesActivas } : null;
    } catch (e) {
      portada = { error: String((e && e.message) || e) };
    }
  }

  return res.status(200).json({
    ok: true, modo, duracionMs: Date.now() - t0, comandosRedis: redis.comandos(), ...r, baja, portada,
    // el token de datos.gov.co fue rechazado (403) y se siguió sin él: hay que corregir la variable
    ...(socrata.appTokenRechazado && socrata.appTokenRechazado()
      ? { app_token_rechazado: "SOCRATA_APP_TOKEN inválido (403 «Invalid app_token specified»): la sincronización siguió SIN token; corrija o borre la variable en Vercel" } : {}),
  });
};

/* La decisión del refresco se exporta para probarla SUELTA: el disparo real
   es un fire-and-forget que la suite no puede observar. */
module.exports.decidirRefrescoHistorico = decidirRefrescoHistorico;
module.exports.REFRESCO_HISTORICO_MS = REFRESCO_HISTORICO_MS;
// B3: la señal de prórroga que el delta estampa al histórico, probada suelta
module.exports.senalesDeCierre = senalesDeCierre;
/* Una sola constante del «dato fresco»: el listado la LLAMA para publicar
   `sincronizado_fresco` (M-INF-10) en vez de copiar los 5 minutos. Y los
   presupuestos, para que la suite fije DEFAULT ≤ MAX < candado ≤ maxDuration
   contra vercel.json (M-INF-14). */
module.exports.FRESCO_MS = FRESCO_MS;
module.exports.PRESUPUESTO_DEFAULT_MS = PRESUPUESTO_DEFAULT_MS;
module.exports.PRESUPUESTO_MAX_MS = PRESUPUESTO_MAX_MS;
