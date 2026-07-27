/* ============================================================================
   lib/extractor · Extracción exhaustiva y verificable de SECOP II (Socrata)
   ----------------------------------------------------------------------------
   OBJETIVO: capturar el 100 % de los procesos del dataset p6dx-8zbt cuya fecha
   de publicación O de cierre caiga en el año vigente (hora Colombia, UTC-5),
   sin filtros tempranos de modalidad/cuantía/entidad/estado, con:

     · Paginación KEYSET por :id ($order=:id + $where :id > 'último') — el
       orden por :id es ESTABLE aunque entren registros nuevos durante la
       corrida, cosa que el $order por fecha DESC del código viejo no
       garantizaba (los registros se corren entre páginas y se pierden filas).
       Si el backend rechazara :id (400), degrada a $offset con orden
       compuesto fecha+id y lo deja registrado (modo en el progreso).
     · Corridas REANUDABLES: el avance (mes en curso, último :id, chunks ya
       escritos) se persiste en el almacén; una función serverless con 60 s de
       tope procesa lo que alcance y la siguiente invocación continúa donde
       quedó, sin perder ni duplicar.
     · Reintentos con backoff exponencial + jitter ante 429/5xx/red, honrando
       Retry-After. Tras N intentos, el lote queda en `incidencias` y la
       corrida continúa en la siguiente invocación (no se da nada por bueno).
     · Verificación de completitud: count(1) por mes ANTES de paginar
       (esperados) y auditoría final esperados vs almacenados.
     · Delta: tras la carga inicial, solo baja lo nuevo/modificado usando el
       campo de sistema :updated_at (con ventana de solape de 48 h por si el
       reloj de la fuente y el nuestro difieren); si el backend no expone
       :updated_at, degrada a la fecha de última publicación del dataset y,
       en el peor caso, a re-descargar la ventana reciente. Los cambios de
       estado (Convocado→Adjudicado) entran por aquí y REEMPLAZAN el registro
       (dedup por identificador, gana el :updated_at más reciente).

   POR QUÉ EL RANGO SE CONSULTA POR FECHA DE PUBLICACIÓN CON SOLAPE:
   "publicado O cierra este año" no se puede expresar de forma fiable en un
   solo $where: la fecha de cierre vive en columnas distintas según la
   modalidad (ver CIERRE_CANDIDATOS en la app). En su lugar bajamos TODO lo
   publicado desde (1-ene − SOLAPE_PUBLICACION_DIAS): cualquier proceso cuyo
   cierre caiga este año fue publicado dentro de esa ventana. El que consume
   la caché decide qué mostrar; aquí no se descarta nada.

   PROYECCIÓN DE CAMPOS: se SOLICITAN todos los campos (*) y se ALMACENA la
   proyección CAMPOS_PROYECCION (los que usa la app + los exigidos por el
   requerimiento + candidatos de cierre + campos de sistema). Guardar la fila
   completa (~2 KB × cientos de miles) rebasaría el tier gratuito de KV; la
   proyección conserva todo lo que la app y la auditoría necesitan. Carencia
   documentada: p6dx-8zbt NO trae municipio/departamento de EJECUCIÓN (solo
   los de la ENTIDAD); la app lo mitiga con inferUbicacion sobre el objeto.
   ========================================================================== */
"use strict";

const {
  claves, comprimir, descomprimir, leerJSON, escribirJSON, registrarIncidencia,
} = require("./almacen.js");

/* ---------------- configuración por defecto ---------------- */
const DEFAULTS = {
  // SECOP_BASE_URL permite apuntar a un mock en pruebas locales (sin red)
  base: process.env.SECOP_BASE_URL || "https://www.datos.gov.co/resource/p6dx-8zbt.json",
  campoFecha: "fecha_de_publicacion_del",
  campoId: "id_del_proceso",
  // candidatos para el delta, en orden de preferencia
  camposDelta: [":updated_at", "fecha_de_ultima_publicaci"],
  PAGE: parseInt(process.env.SECOP_PAGE, 10) || 5000, // filas por petición (2.1 admite >1000)
  SOLAPE_PUBLICACION_DIAS: 120,
  SOLAPE_DELTA_HORAS: 48,
  MAX_INTENTOS: 6,
  BACKOFF_BASE_MS: parseInt(process.env.SECOP_BACKOFF_MS, 10) || 1000,
  CHUNK_FILAS: 4000,          // filas por chunk antes de comprimir
  CHUNK_MAX_B64: 950000,      // límite duro del valor en KV (1 MB) con margen
  appToken: process.env.SOCRATA_APP_TOKEN || "",
};

const CIERRE_CANDIDATOS = [
  "fecha_de_recepcion_de", "fecha_de_recepci_n_de", "fecha_l_mite_de_recepci",
  "fecha_de_cierre", "fecha_l_mite", "fecha_de_apertura_de_respuesta", "fecha_de_apertura_efectiva",
];

/* Campos que persisten en la caché. Mapeo del requerimiento →
   id_proceso=id_del_proceso · fecha_publicacion=fecha_de_publicacion_del ·
   presupuesto_oficial=precio_base · modalidad=modalidad_de_contratacion ·
   estado=estado_del_procedimiento · entidad=entidad · objeto=nombre/descripcion ·
   duracion=duracion+unidad_de_duracion · url_pliegos=urlproceso ·
   municipio/departamento_ejecucion=NO EXISTEN en p6dx-8zbt (se guardan los de
   la entidad; carencia documentada en lib/README.md). */
const CAMPOS_PROYECCION = [
  ":id", ":created_at", ":updated_at",
  "id_del_proceso", "referencia_del_proceso", "nombre_del_procedimiento",
  "descripci_n_del_procedimiento", "entidad", "nit_entidad",
  "departamento_entidad", "ciudad_entidad", "modalidad_de_contratacion",
  "estado_del_procedimiento", "fase", "fecha_de_publicacion_del",
  "fecha_de_ultima_publicaci", "precio_base", "duracion", "unidad_de_duracion",
  "urlproceso", "codigo_principal_de_categoria", "tipo_de_contrato",
  "adjudicado", "nombre_del_adjudicador", "proveedores_invitados",
].concat(CIERRE_CANDIDATOS);

/* ---------------- fechas en hora Colombia (UTC-5 fija, sin DST) ------------ */
function ahoraColombia(now) {
  return new Date((now || Date.now()) - 5 * 3600e3); // usar getUTC* sobre esto
}
function anoVigente(now) { return ahoraColombia(now).getUTCFullYear(); }
function inicioAnoVigente(now) { return `${anoVigente(now)}-01-01T00:00:00.000`; }
function isoFlotante(d) { return d.toISOString().slice(0, 23); }

/* Meses (YYYY-MM) desde `desdeISO` (flotante Colombia) hasta hoy Colombia. */
function mesesDelRango(desdeISO, now) {
  const fin = ahoraColombia(now);
  const out = [];
  let y = parseInt(desdeISO.slice(0, 4), 10), m = parseInt(desdeISO.slice(5, 7), 10);
  const yF = fin.getUTCFullYear(), mF = fin.getUTCMonth() + 1;
  while (y < yF || (y === yF && m <= mF)) {
    out.push(`${y}-${String(m).padStart(2, "0")}`);
    m++; if (m > 12) { m = 1; y++; }
  }
  return out;
}
function limitesMes(mes) {
  const [y, m] = mes.split("-").map(Number);
  const ini = `${mes}-01T00:00:00.000`;
  const sig = m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, "0")}`;
  return { ini, fin: `${sig}-01T00:00:00.000` };
}
const escSoQL = (s) => String(s).replace(/'/g, "''");

/* ---------------- logger con niveles ---------------- */
function crearLog(sink) {
  const out = sink || ((nivel, msg) => console[nivel === "error" ? "error" : "log"](`[extractor][${nivel}] ${msg}`));
  return {
    info: (m) => out("info", m),
    warn: (m) => out("warn", m),
    error: (m) => out("error", m),
  };
}

/* ============================ EXTRACTOR ============================ */
function crearExtractor(opts = {}) {
  const cfg = { ...DEFAULTS, ...opts.config };
  const store = opts.store;
  const fetchImpl = opts.fetchImpl || globalThis.fetch;
  const log = crearLog(opts.logSink);
  const now = () => (opts.reloj ? opts.reloj() : Date.now());
  const dormir = opts.dormir || ((ms) => new Promise((r) => setTimeout(r, ms)));
  if (!store) throw new Error("extractor: falta store");

  /* ---------- HTTP con reintentos exponenciales + jitter ---------- */
  async function pedir(url, etiqueta) {
    let ultimo;
    for (let intento = 1; intento <= cfg.MAX_INTENTOS; intento++) {
      try {
        const headers = { Accept: "application/json" };
        if (cfg.appToken) headers["X-App-Token"] = cfg.appToken;
        const r = await fetchImpl(url, { headers });
        if (r.ok) return await r.json();
        ultimo = new Error(`HTTP ${r.status}`);
        ultimo.status = r.status;
        // 400 = consulta malformada: reintentar no sirve, que decida el llamador
        if (r.status === 400) { ultimo.cuerpo = await r.text().catch(() => ""); throw ultimo; }
        const retryAfter = parseFloat(r.headers && r.headers.get && r.headers.get("Retry-After"));
        const espera = !isNaN(retryAfter) ? retryAfter * 1000
          : cfg.BACKOFF_BASE_MS * Math.pow(2, intento - 1) * (0.5 + Math.random());
        log.warn(`${etiqueta}: HTTP ${r.status}, reintento ${intento}/${cfg.MAX_INTENTOS} en ${Math.round(espera)}ms`);
        await dormir(espera);
      } catch (e) {
        if (e && e.status === 400) throw e;
        ultimo = e;
        const espera = cfg.BACKOFF_BASE_MS * Math.pow(2, intento - 1) * (0.5 + Math.random());
        log.warn(`${etiqueta}: ${e.message}, reintento ${intento}/${cfg.MAX_INTENTOS} en ${Math.round(espera)}ms`);
        await dormir(espera);
      }
    }
    await registrarIncidencia(store, { nivel: "error", msg: `agotados ${cfg.MAX_INTENTOS} intentos`, ctx: { etiqueta, url, error: String(ultimo) } });
    throw new Error(`${etiqueta}: agotados los reintentos (${ultimo})`);
  }

  function urlSoQL(params) {
    const qs = Object.entries(params)
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join("&");
    return `${cfg.base}?${qs}`;
  }

  /* ---------- sondas de capacidades del backend (una vez por corrida) ------
     No podemos dar por hecho que :id/:updated_at sean consultables en este
     dataset: se prueba en vivo y el modo elegido queda en el progreso. */
  async function sondear(progreso) {
    if (progreso.capacidades) return progreso.capacidades;
    const cap = { keyset: false, sistema: false, delta: null };
    try {
      const filas = await pedir(urlSoQL({
        "$select": ":id,:updated_at," + cfg.campoId,
        "$order": ":id", "$limit": "1",
      }), "sonda :id");
      if (Array.isArray(filas)) {
        cap.keyset = true;
        cap.sistema = !!(filas[0] && filas[0][":id"] !== undefined);
      }
    } catch (e) {
      // Degradar SOLO si el backend rechazó la consulta (400: el dataset no
      // admite :id/:updated_at). Un fallo transitorio de red/5xx NO debe
      // degradar el modo de forma permanente: se propaga y la corrida se
      // reintenta después con la sonda intacta.
      if (e && e.status === 400) log.warn(`backend rechazó :id (400) → modo $offset y delta por fecha`);
      else throw e;
    }
    cap.delta = cap.sistema ? ":updated_at" : cfg.camposDelta[1] || null;
    progreso.capacidades = cap;
    return cap;
  }

  const selectDe = (cap) => cap.sistema ? ":id,:created_at,:updated_at,*" : "*";

  function proyectar(fila) {
    const out = {};
    for (const c of CAMPOS_PROYECCION) if (fila[c] !== undefined) out[c] = fila[c];
    // La descripción puede traer MILES de caracteres; 800 bastan para la
    // clasificación semántica y la tarjeta, y mantienen cada página servida
    // por /api/procesos bajo el límite de respuesta de Vercel (4.5 MB).
    if (typeof out.descripci_n_del_procedimiento === "string" && out.descripci_n_del_procedimiento.length > 800) {
      out.descripci_n_del_procedimiento = out.descripci_n_del_procedimiento.slice(0, 800) + "…";
    }
    // clave de deduplicación: :id de Socrata; si no existe, el id del proceso
    out._k = fila[":id"] || fila[cfg.campoId] || (fila[cfg.campoFecha] + "|" + (fila.referencia_del_proceso || ""));
    return out;
  }

  /* ---------- empaquetado en chunks bajo el límite de KV ---------- */
  function empaquetar(registros) {
    const b64 = comprimir(registros);
    if (b64.length <= cfg.CHUNK_MAX_B64 || registros.length <= 1) return [b64];
    const mitad = Math.ceil(registros.length / 2);
    return empaquetar(registros.slice(0, mitad)).concat(empaquetar(registros.slice(mitad)));
  }
  async function escribirChunks(mes, desdeIndice, registros) {
    const K = claves(mes);
    const paquetes = empaquetar(registros);
    let i = desdeIndice;
    for (const p of paquetes) { await store.set(K.chunk(i), p); i++; }
    return i; // siguiente índice libre
  }

  /* ---------- count(1) con reintentos: los "esperados" del mes ---------- */
  async function contarMes(mes) {
    const { ini, fin } = limitesMes(mes);
    const where = `${cfg.campoFecha} >= '${ini}' AND ${cfg.campoFecha} < '${fin}'`;
    const r = await pedir(urlSoQL({ "$select": "count(1) as n", "$where": where }), `count ${mes}`);
    return parseInt((r && r[0] && (r[0].n ?? r[0].count)) || "0", 10);
  }

  /* ---------- una página del mes (keyset u offset) ---------- */
  async function paginaMes(mes, cap, cursor) {
    const { ini, fin } = limitesMes(mes);
    let where = `${cfg.campoFecha} >= '${ini}' AND ${cfg.campoFecha} < '${fin}'`;
    const params = { "$select": selectDe(cap), "$limit": String(cfg.PAGE) };
    if (cap.keyset) {
      if (cursor.lastId) where += ` AND :id > '${escSoQL(cursor.lastId)}'`;
      params["$order"] = ":id";
    } else {
      params["$order"] = `${cfg.campoFecha} ASC, ${cfg.campoId} ASC`;
      params["$offset"] = String(cursor.offset || 0);
    }
    params["$where"] = where;
    const filas = await pedir(urlSoQL(params), `página ${mes}${cap.keyset ? " id>" + (cursor.lastId || "∅") : " off=" + (cursor.offset || 0)}`);
    if (!Array.isArray(filas)) throw new Error(`respuesta no-array en ${mes}`);
    return filas;
  }

  /* ================= CARGA COMPLETA (reanudable) =================
     Recorre mes a mes. El progreso persiste tras CADA página escrita, así una
     interrupción (tope de tiempo serverless, red, deploy) nunca pierde datos:
     la siguiente invocación retoma exactamente en el mismo cursor. */
  async function extraerTodo({ presupuestoMs = Infinity } = {}) {
    const t0 = now();
    const K0 = claves("");
    let progreso = (await leerJSON(store, K0.progreso)) || null;

    if (!progreso || progreso.tipo !== "full" || progreso.terminado) {
      const desde = isoFlotante(new Date(Date.parse(inicioAnoVigente(now()) + "Z") - cfg.SOLAPE_PUBLICACION_DIAS * 864e5));
      progreso = {
        tipo: "full", desde, iniciado: new Date(now()).toISOString(),
        meses: mesesDelRango(desde, now()), mesIdx: 0,
        cursor: {}, chunkIdx: 0, filasMes: 0, esperadosMes: null,
        totales: { filas: 0, paginas: 0, esperados: 0 }, porMes: {}, terminado: false,
      };
    }
    const cap = await sondear(progreso);
    await escribirJSON(store, K0.progreso, progreso);
    log.info(`carga completa: ${progreso.meses.length} meses desde ${progreso.desde} (modo ${cap.keyset ? "keyset :id" : "$offset"})`);

    while (progreso.mesIdx < progreso.meses.length) {
      const mes = progreso.meses[progreso.mesIdx];
      if (progreso.esperadosMes == null) {
        progreso.esperadosMes = await contarMes(mes);
        progreso.totales.esperados += progreso.esperadosMes;
        log.info(`${mes}: ${progreso.esperadosMes} esperados según count(1)`);
        await escribirJSON(store, K0.progreso, progreso);
      }

      let fin = false;
      while (!fin) {
        if (now() - t0 > presupuestoMs) {
          await escribirJSON(store, K0.progreso, progreso);
          log.info(`presupuesto de tiempo agotado: pausa en ${mes} (${progreso.filasMes}/${progreso.esperadosMes})`);
          return { done: false, progreso: resumenProgreso(progreso), duracionMs: now() - t0 };
        }
        const filas = await paginaMes(mes, cap, progreso.cursor);
        progreso.totales.paginas++;
        if (filas.length) {
          const proy = filas.map(proyectar);
          progreso.chunkIdx = await escribirChunks(mes, progreso.chunkIdx, proy);
          progreso.filasMes += filas.length;
          progreso.totales.filas += filas.length;
          if (cap.keyset) progreso.cursor.lastId = filas[filas.length - 1][":id"];
          else progreso.cursor.offset = (progreso.cursor.offset || 0) + filas.length;
          await escribirJSON(store, K0.progreso, progreso); // reanudable página a página
        }
        fin = filas.length < cfg.PAGE;
      }

      // cerrar el mes: manifest + verificación esperados vs bajados
      const K = claves(mes);
      await escribirJSON(store, K.manifest, {
        chunks: progreso.chunkIdx, count: progreso.filasMes,
        esperados: progreso.esperadosMes, updatedAt: new Date(now()).toISOString(),
      });
      progreso.porMes[mes] = { bajados: progreso.filasMes, esperados: progreso.esperadosMes };
      if (progreso.filasMes < progreso.esperadosMes) {
        log.warn(`${mes}: bajados ${progreso.filasMes} < esperados ${progreso.esperadosMes}`);
        await registrarIncidencia(store, { nivel: "warn", msg: "mes incompleto", ctx: { mes, ...progreso.porMes[mes] } });
      }
      progreso.mesIdx++; progreso.cursor = {}; progreso.chunkIdx = 0;
      progreso.filasMes = 0; progreso.esperadosMes = null;
      await escribirJSON(store, K0.progreso, progreso);
    }

    progreso.terminado = true;
    await escribirJSON(store, K0.progreso, progreso);
    const meta = (await leerJSON(store, K0.meta)) || {};
    meta.last_full = new Date(now()).toISOString();
    meta.last_sync = meta.last_full;
    meta.porMes = progreso.porMes;
    meta.total = Object.values(progreso.porMes).reduce((a, m) => a + m.bajados, 0);
    await escribirJSON(store, K0.meta, meta);
    const rep = await auditar();
    log.info(`carga completa TERMINADA: ${meta.total} filas en ${(now() - t0) / 1000 | 0}s`);
    return { done: true, auditoria: rep, duracionMs: now() - t0 };
  }

  /* ================= DELTA (nuevo + modificado) =================
     Filtra por el campo de actualización con SOLAPE hacia atrás y fusiona por
     _k quedándose con la versión más reciente. Un proceso que cambió de
     estado entra aquí y sustituye al viejo en su mes de publicación. */
  async function extraerDelta({ presupuestoMs = Infinity } = {}) {
    const t0 = now();
    const K0 = claves("");
    const meta = (await leerJSON(store, K0.meta)) || {};
    if (!meta.last_full) { log.warn("delta sin carga completa previa → derivando a extraerTodo"); return extraerTodo({ presupuestoMs }); }

    const progresoBase = (await leerJSON(store, K0.progreso)) || {};
    const cap = await sondear(progresoBase);
    const desdeMs = Date.parse(meta.last_sync || meta.last_full) - cfg.SOLAPE_DELTA_HORAS * 3600e3;

    let where;
    if (cap.delta === ":updated_at") {
      where = `:updated_at > '${new Date(desdeMs).toISOString()}'`;
    } else if (cap.delta) {
      where = `${cap.delta} > '${isoFlotante(new Date(desdeMs - 5 * 3600e3))}'`; // flotante Colombia
    } else {
      where = `${cfg.campoFecha} >= '${isoFlotante(new Date(desdeMs - 5 * 3600e3))}'`; // peor caso: ventana reciente
    }
    // limitar al universo del año (mismo criterio que la carga completa)
    const desdeAno = isoFlotante(new Date(Date.parse(inicioAnoVigente(now()) + "Z") - cfg.SOLAPE_PUBLICACION_DIAS * 864e5));
    where += ` AND ${cfg.campoFecha} >= '${desdeAno}'`;

    log.info(`delta desde ${new Date(desdeMs).toISOString()} (campo ${cap.delta || "ventana de fechas"})`);
    const nuevos = [];
    const cursor = {};
    let fin = false;
    while (!fin) {
      if (now() - t0 > presupuestoMs) { log.warn("delta: presupuesto agotado; se aplicará lo ya bajado"); break; }
      const params = { "$select": selectDe(cap), "$limit": String(cfg.PAGE), "$where": where + (cap.keyset && cursor.lastId ? ` AND :id > '${escSoQL(cursor.lastId)}'` : "") };
      if (cap.keyset) params["$order"] = ":id";
      else { params["$order"] = `${cfg.campoFecha} ASC, ${cfg.campoId} ASC`; params["$offset"] = String(cursor.offset || 0); }
      const filas = await pedir(urlSoQL(params), "delta");
      if (!Array.isArray(filas)) break;
      nuevos.push(...filas.map(proyectar));
      if (cap.keyset && filas.length) cursor.lastId = filas[filas.length - 1][":id"];
      else cursor.offset = (cursor.offset || 0) + filas.length;
      fin = filas.length < cfg.PAGE;
    }

    // fusionar por mes de publicación
    const porMes = new Map();
    for (const r of nuevos) {
      const mes = String(r[cfg.campoFecha] || "").slice(0, 7);
      if (!/^\d{4}-\d{2}$/.test(mes)) continue;
      if (!porMes.has(mes)) porMes.set(mes, []);
      porMes.get(mes).push(r);
    }
    let actualizados = 0, insertados = 0;
    for (const [mes, regs] of porMes) {
      const { registros, manifest } = await leerMes(mes);
      const idx = new Map(registros.map((r, i) => [r._k, i]));
      for (const r of regs) {
        const i = idx.get(r._k);
        if (i == null) { registros.push(r); insertados++; }
        else {
          const va = registros[i][":updated_at"] || "", vb = r[":updated_at"] || "";
          if (vb >= va) { registros[i] = r; actualizados++; }
        }
      }
      // reescritura del mes completo (los deltas por mes son pequeños; la
      // reescritura mantiene chunks compactos y sin duplicados)
      const K = claves(mes);
      const viejos = manifest ? manifest.chunks : 0;
      const sig = await escribirChunks(mes, 0, registros);
      for (let i = sig; i < viejos; i++) await store.del(K.chunk(i));
      await escribirJSON(store, K.manifest, { chunks: sig, count: registros.length, esperados: (manifest || {}).esperados ?? null, updatedAt: new Date(now()).toISOString() });
    }

    meta.last_sync = new Date(now()).toISOString();
    meta.ultimo_delta = { filas: nuevos.length, insertados, actualizados, duracionMs: now() - t0 };
    await escribirJSON(store, K0.meta, meta);
    log.info(`delta: ${nuevos.length} filas (${insertados} nuevas, ${actualizados} actualizadas) en ${now() - t0}ms`);
    return { done: true, ...meta.ultimo_delta };
  }

  /* ---------- lectura de un mes completo (dedup por _k, gana el más nuevo) -- */
  async function leerMes(mes) {
    const K = claves(mes);
    const manifest = await leerJSON(store, K.manifest);
    if (!manifest) return { registros: [], manifest: null };
    const ks = []; for (let i = 0; i < manifest.chunks; i++) ks.push(K.chunk(i));
    const brutos = await store.mget(ks);
    const mapa = new Map();
    for (const b of brutos) {
      const arr = descomprimir(b) || [];
      for (const r of arr) {
        const prev = mapa.get(r._k);
        if (!prev || (r[":updated_at"] || "") >= (prev[":updated_at"] || "")) mapa.set(r._k, r);
      }
    }
    return { registros: [...mapa.values()], manifest };
  }

  /* ================= AUDITORÍA DE COMPLETITUD =================
     count(1) fresco por mes vs lo almacenado. Reporte por consola y en meta. */
  async function auditar() {
    const t0 = now();
    const K0 = claves("");
    const meta = (await leerJSON(store, K0.meta)) || {};
    const desde = isoFlotante(new Date(Date.parse(inicioAnoVigente(now()) + "Z") - cfg.SOLAPE_PUBLICACION_DIAS * 864e5));
    const meses = mesesDelRango(desde, now());
    const detalle = [];
    let esperadosTot = 0, almacenadosTot = 0;
    for (const mes of meses) {
      let esperados = null;
      try { esperados = await contarMes(mes); } catch (e) { log.warn(`auditoría ${mes}: count falló (${e.message})`); }
      const { registros } = await leerMes(mes);
      detalle.push({ mes, esperados, almacenados: registros.length, diferencia: esperados == null ? null : esperados - registros.length });
      if (esperados != null) esperadosTot += esperados;
      almacenadosTot += registros.length;
    }
    const rep = {
      ts: new Date(now()).toISOString(), esperados: esperadosTot, almacenados: almacenadosTot,
      diferencia: esperadosTot - almacenadosTot, duracionMs: now() - t0, detalle,
    };
    meta.auditoria = rep;
    await escribirJSON(store, K0.meta, meta);
    log.info(`AUDITORÍA: esperados=${esperadosTot} almacenados=${almacenadosTot} diferencia=${rep.diferencia} (${rep.duracionMs}ms)`);
    for (const d of detalle) if (d.diferencia) log.warn(`  ${d.mes}: faltan ${d.diferencia}`);
    return rep;
  }

  function resumenProgreso(p) {
    return { mes: p.meses[p.mesIdx], mesIdx: p.mesIdx, deMeses: p.meses.length, filasMes: p.filasMes, esperadosMes: p.esperadosMes, totales: p.totales };
  }

  async function estado() {
    const K0 = claves("");
    return {
      meta: await leerJSON(store, K0.meta),
      progreso: await leerJSON(store, K0.progreso),
      incidencias: await leerJSON(store, K0.incidencias),
    };
  }

  return { extraerTodo, extraerDelta, auditar, leerMes, estado, _interno: { mesesDelRango, limitesMes, empaquetar, proyectar, inicioAnoVigente } };
}

module.exports = { crearExtractor, CAMPOS_PROYECCION, CIERRE_CANDIDATOS, DEFAULTS, anoVigente, inicioAnoVigente, mesesDelRango };
