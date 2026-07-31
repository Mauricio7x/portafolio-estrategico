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
            lectura (gana el :updated_at más reciente).
     auto   Lo que toque: continuar una full inconclusa; full si nunca hubo;
            delta si los datos tienen >5 min; si no, no-op {alDia:true}.

   Cada licitación se ENRIQUECE (lib/negocio.enriquecer) ANTES de guardarse —
   nunca se persiste sin los campos de negocio — y pasa la CASCADA DE FILTROS
   antes de tocar Redis (guardar las ~500k filas/año del dataset completo
   reventaría el tier gratuito de Upstash y las consultas):
     1. modalidad_competitiva  (lib/filtros): fuera Contratación Directa,
        Régimen Especial sin ofertas, Licitación Privada, RFI.
     2. estado_abierto         (lib/filtros): fuera cerrados/desconocidos —
        SOLO en la carga full. El DELTA los CONSERVA a propósito: un proceso
        guardado como abierto que pasa a Adjudicado debe entrar al chunk para
        que el dedup por :updated_at lo REEMPLACE y salga del listado; si el
        delta lo descartara, la versión abierta quedaría congelada para
        siempre. La consulta filtra los cerrados al servir.
     3. compatibleConAlgunPerfil (lib/rup): objeto dentro de la unión de los
        RUP, blacklist semántica y capa anti-suministro.
   El conteo de descartadas queda en meta para auditoría. Chunks mensuales
   comprimidos (zlib.deflate nivel 6, ≤500 KB) en licitaciones:mes:{…}:chunk:{i}.

   Candado: lock:sync con SET NX EX 300 — TTL SIEMPRE presente, así una
   función muerta jamás deja el candado atascado (la causa clásica del
   "enCurso:true eterno"); se libera en finally solo si el token coincide.
   Sin secretos: el endpoint es idempotente, barato cuando no hay nada que
   hacer, y el candado + presupuesto lo auto-limitan.
   ========================================================================== */
"use strict";

const { crearRedis, hayCredenciales } = require("../lib/redis.js");
const { CLAVES, LOCK_TTL_SEG, empaquetar, descomprimir, leerJSON, escribirJSON } = require("../lib/almacen.js");
const { crearCliente, anoVigente, mesesDelAno } = require("../lib/socrata.js");
const { enriquecer } = require("../lib/negocio.js");
const { compatibleConAlgunPerfil } = require("../lib/rup.js");
const { modalidad_competitiva, estado_abierto } = require("../lib/filtros.js");

const PAGE = parseInt(process.env.SECOP_PAGE, 10) || 5000;
const PRESUPUESTO_DEFAULT_MS = 45000;  // cabe en el plan Hobby (60 s)
// Máx < TTL del candado (300 s) con margen para la cadena de reintentos de la
// página en curso: la invocación siempre muere antes de que expire el lock.
const PRESUPUESTO_MAX_MS = 240000;
const SOLAPE_DELTA_MS = 48 * 3600e3;
const FRESCO_MS = 5 * 60e3;            // <5 min → no-op en modo auto
const COMPACTAR_TRAS_CHUNKS = 25;
// Full de higiene mensual: acota TODA deriva del corpus que el delta no puede
// reflejar — la limitación documentada de conservarCerradas (un proceso ya
// guardado cuya modalidad/objeto MUTA a inválido se descarta del delta y su
// versión vieja quedaría congelada) y los cambios de reglas tras un despliegue.
const FULL_HIGIENE_MS = 30 * 24 * 3600e3;

/* ---------- proyección: lo que la app necesita, nada más ---------- */
const CAMPOS = [
  ":id", ":updated_at",
  "id_del_proceso", "referencia_del_proceso", "nombre_del_procedimiento",
  "descripci_n_del_procedimiento", "entidad", "nit_entidad",
  "departamento_entidad", "ciudad_entidad", "modalidad_de_contratacion",
  "estado_del_procedimiento", "fase", "adjudicado", "fecha_de_publicacion_del", "precio_base",
  "duracion", "unidad_de_duracion", "codigo_principal_de_categoria",
  "categorias_adicionales", "tipo_de_contrato",
  // candidatas de anticipo declarado (lib/negocio.ANTICIPO_CAMPOS): p6dx-8zbt
  // no las trae HOY, pero si la fuente las añade no pueden morir en la
  // proyección — sin esto el anticipo declarado jamás llegaría a enriquecer()
  "porcentaje_de_anticipo", "anticipo_porcentaje", "porcentaje_anticipo", "pct_anticipo", "anticipo",
  "respuestas_al_procedimiento", "conteo_de_respuestas_a_ofertas", "proveedores_unicos_con",
];
function proyectar(fila) {
  const out = {};
  for (const c of CAMPOS) if (fila[c] !== undefined) out[c] = fila[c];
  if (typeof out.descripci_n_del_procedimiento === "string" && out.descripci_n_del_procedimiento.length > 700) {
    out.descripci_n_del_procedimiento = out.descripci_n_del_procedimiento.slice(0, 700) + "…";
  }
  // urlproceso llega como objeto {url, description} desde Socrata
  const u = fila.urlproceso;
  out.urlproceso = (u && typeof u === "object" ? u.url : u) || null;
  // columnas de fecha de cierre: nombre no garantizado → conservar candidatas
  for (const k in fila) {
    if (out[k] === undefined && /fecha/i.test(k) && /(recep|cierre|l[ií]mit|plazo|apertura)/i.test(k)) out[k] = fila[k];
  }
  // clave de dedup: id de negocio primero (estable ante re-publicaciones que
  // regeneran los :id de Socrata), :id como respaldo
  out._k = fila.id_del_proceso || fila[":id"] || `${fila.fecha_de_publicacion_del}|${fila.referencia_del_proceso || ""}`;
  return out;
}

/* Cascada de filtros (ver cabecera) → enriquecimiento de negocio.
   conservarCerradas=true SOLO en el delta: los cambios a estado cerrado deben
   guardarse para REEMPLAZAR (dedup :updated_at) la versión abierta previa.
   Limitación asumida: si a un proceso YA guardado le muta la modalidad o el
   objeto hacia algo inválido (rarísimo en SECOP II: la modalidad es identidad
   del proceso y el objeto solo cambia por adenda), el delta lo descarta y la
   versión vieja persiste hasta la full de higiene mensual (FULL_HIGIENE_MS),
   que la purga. Guardar tumbas para todo descartado del delta (~miles/día)
   reventaría el presupuesto de Redis: decisión consciente, no descuido. */
function transformar(filas, { conservarCerradas = false } = {}) {
  const out = [];
  for (const fila of filas) {
    const f = proyectar(fila);
    if (!modalidad_competitiva(f)) continue;                 // sin competencia, fuera
    if (!conservarCerradas && !estado_abierto(f)) continue;  // full: cerrados fuera de origen
    if (!compatibleConAlgunPerfil(f)) continue;              // objeto/RUP/anti-suministro
    out.push(enriquecer(f));
  }
  return out;
}

/* ---------- escritura de chunks ---------- */
async function escribirChunks(redis, mes, desdeIndice, registros) {
  let i = desdeIndice;
  for (const paquete of empaquetar(registros)) {
    await redis.set(CLAVES.chunk(mes, i), paquete);
    i++;
  }
  return i; // siguiente índice libre
}

async function leerMes(redis, mes, manifest) {
  if (!manifest) return [];
  const ks = [];
  for (let i = manifest.base || 0; i < manifest.sig; i++) ks.push(CLAVES.chunk(mes, i));
  const registros = [];
  for (let i = 0; i < ks.length; i += 8) {
    const lote = await redis.mget(ks.slice(i, i + 8));
    for (const b of lote) for (const r of (descomprimir(b) || [])) registros.push(r);
  }
  // dedup por _k, gana el :updated_at más reciente
  const mapa = new Map();
  for (const r of registros) {
    const prev = mapa.get(r._k);
    if (!prev || (r[":updated_at"] || "") >= (prev[":updated_at"] || "")) mapa.set(r._k, r);
  }
  return [...mapa.values()];
}

/* Compactación de un mes tras muchos deltas append-only: reescribe el mes
   deduplicado en índices NUEVOS y solo después borra los viejos — un kill a
   mitad deja duplicados (que la lectura resuelve), nunca pérdida. */
async function compactarMes(redis, mes) {
  const manifest = await leerJSON(redis, CLAVES.manifest(mes));
  if (!manifest) return;
  const registros = await leerMes(redis, mes, manifest);
  const sig = await escribirChunks(redis, mes, manifest.sig, registros);
  await escribirJSON(redis, CLAVES.manifest(mes), {
    base: manifest.sig, sig, count: registros.length, updatedAt: new Date().toISOString(),
  });
  const viejos = [];
  for (let i = manifest.base || 0; i < manifest.sig; i++) viejos.push(CLAVES.chunk(mes, i));
  if (viejos.length) await redis.del(...viejos);
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
        if (guardables.length) p.chunkIdx = await escribirChunks(redis, mes, p.chunkIdx, guardables);
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

  // purgar TODO mes fuera de la ventana vigente, descubierto por SCAN — no
  // por meta.porMes: un mes creado solo por deltas (la full corrió en marzo y
  // el delta escribió abril) no figura en meta y sus chunks quedarían
  // servidos para siempre tras el cambio de año
  const meta = (await leerJSON(redis, CLAVES.meta)) || {};
  const clavesMes = await redis.scan(CLAVES.patronMeses);
  const muertas = clavesMes.filter((k) => {
    const m = k.match(/^licitaciones:mes:(\d{4}-\d{2}):/);
    return m && !(m[1] in p.porMes);
  });
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
  return { done: true, total: totalGuardadas, leidas: totalLeidas, porMes: p.porMes };
}

/* ============================ DELTA ============================ */
async function extraerDelta(redis, socrata, { presupuestoMs }) {
  const t0 = Date.now();
  const meta = (await leerJSON(redis, CLAVES.meta)) || {};
  if (!meta.last_full) return extraerFull(redis, socrata, { presupuestoMs, reiniciar: false });

  const desdeUTC = new Date(Date.parse(meta.last_sync || meta.last_full) - SOLAPE_DELTA_MS).toISOString();
  const inicioAno = `${anoVigente()}-01-01T00:00:00.000`;

  const nuevos = [];
  const cursor = {};
  let keyset = true, fin = false, completo = true;
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

  // aplicar APPEND-ONLY por mes: la lectura deduplica por _k (gana el
  // :updated_at más reciente) → el cambio de estado reemplaza de facto.
  // conservarCerradas: el delta GUARDA los procesos que pasaron a cerrado —
  // así la versión "Adjudicado" pisa a la "Publicado" y sale del listado.
  const guardables = transformar(nuevos, { conservarCerradas: true });
  const porMes = new Map();
  for (const r of guardables) {
    const mes = String(r.fecha_de_publicacion_del || "").slice(0, 7);
    if (!/^\d{4}-\d{2}$/.test(mes) || !mes.startsWith(String(anoVigente()))) continue;
    if (!porMes.has(mes)) porMes.set(mes, []);
    porMes.get(mes).push(r);
  }
  for (const [mes, regs] of porMes) {
    let man = (await leerJSON(redis, CLAVES.manifest(mes))) || { base: 0, sig: 0, count: 0 };
    const sig = await escribirChunks(redis, mes, man.sig, regs);
    man = { ...man, sig, count: (man.count || 0) + regs.length, updatedAt: new Date().toISOString() };
    await escribirJSON(redis, CLAVES.manifest(mes), man);
    if (sig - (man.base || 0) > COMPACTAR_TRAS_CHUNKS) await compactarMes(redis, mes);
  }

  // el sello avanza SOLO si el delta fue completo, y se ancla al INICIO de
  // esta corrida: un delta cortado no pierde páginas en silencio
  if (completo) meta.last_sync = new Date(t0).toISOString();
  meta.ultimo_delta = {
    ts: new Date().toISOString(), filas: nuevos.length, guardadas: guardables.length,
    meses: porMes.size, parcial: !completo,
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
        // full con más de un mes: recarga completa (higiene del corpus)
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

  return res.status(200).json({ ok: true, modo, duracionMs: Date.now() - t0, comandosRedis: redis.comandos(), ...r });
};
