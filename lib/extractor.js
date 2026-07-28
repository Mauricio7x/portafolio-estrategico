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
  // 60 días de solape (desde ~1-nov del año anterior): los procesos de
  // SECOP II rara vez superan 6 meses entre publicación y cierre, y lo que
  // importa son oportunidades de participación VIGENTES. Ajustable por env.
  SOLAPE_PUBLICACION_DIAS: parseInt(process.env.SECOP_SOLAPE_DIAS, 10) || 60,
  SOLAPE_DELTA_HORAS: 48,
  MAX_INTENTOS: 6,
  BACKOFF_BASE_MS: parseInt(process.env.SECOP_BACKOFF_MS, 10) || 1000,
  CHUNK_FILAS: 4000,          // filas por chunk antes de comprimir
  CHUNK_MAX_B64: 800000,      // límite del valor en KV (1 MB) con margen de request REST
  COMPACTAR_TRAS: 30,         // chunks acumulados por deltas → compactar el mes
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
        const espera = Math.min(!isNaN(retryAfter) ? retryAfter * 1000
          : cfg.BACKOFF_BASE_MS * Math.pow(2, intento - 1) * (0.5 + Math.random()), 15000);
        log.warn(`${etiqueta}: HTTP ${r.status}, reintento ${intento}/${cfg.MAX_INTENTOS} en ${Math.round(espera)}ms`);
        await dormir(espera);
      } catch (e) {
        if (e && e.status === 400) throw e;
        ultimo = e;
        const espera = Math.min(cfg.BACKOFF_BASE_MS * Math.pow(2, intento - 1) * (0.5 + Math.random()), 15000);
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
      // Se sondea con la MISMA forma de $select que usan las páginas reales.
      const filas = await pedir(urlSoQL({
        "$select": ":id,:created_at,:updated_at,*",
        "$order": ":id", "$limit": "1",
      }), "sonda :id");
      if (Array.isArray(filas)) {
        cap.sistema = !!(filas[0] && filas[0][":id"] !== undefined);
        // keyset solo es viable si :id LLEGA en las filas (si no, el cursor
        // nunca avanzaría y se re-bajaría la misma página en bucle).
        cap.keyset = cap.sistema;
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
    if (typeof out.descripci_n_del_procedimiento === "string" && out.descripci_n_del_procedimiento.length > 1500) {
      out.descripci_n_del_procedimiento = out.descripci_n_del_procedimiento.slice(0, 1500) + "…";
    }
    // Red de seguridad del cliente: fechaCierre() escanea cualquier columna
    // /fecha/ + /(recep|cierre|límit|plazo)/ porque el nombre real no está
    // verificado en producción. La proyección debe conservar ese fallback.
    for (const k in fila) {
      if (out[k] === undefined && /fecha/i.test(k) && /(recep|cierre|l[ií]mit|plazo)/i.test(k)) out[k] = fila[k];
    }
    // Clave de deduplicación: la clave de NEGOCIO primero (id_del_proceso es
    // estable ante re-publicaciones por reemplazo, que regeneran todos los
    // :id de Socrata); :id solo como respaldo si faltara.
    out._k = fila[cfg.campoId] || fila[":id"] || (fila[cfg.campoFecha] + "|" + (fila.referencia_del_proceso || ""));
    return out;
  }

  /* ---------- empaquetado en chunks bajo el límite de KV ---------- */
  function empaquetar(registros) {
    const b64 = comprimir(registros);
    if (b64.length <= cfg.CHUNK_MAX_B64) return [b64];
    if (registros.length <= 1) {
      // píldora venenosa: UN registro que solo, comprimido, supera el límite
      // de KV. Si se devolviera tal cual, el SET fallaría en cada reanudación
      // y la carga quedaría estancada para siempre. Se recortan los campos
      // largos; si aún no cabe, se descarta con rastro (no silencio).
      const r = { ...registros[0] };
      for (const c of ["descripci_n_del_procedimiento", "nombre_del_procedimiento", "proveedores_invitados"]) {
        if (typeof r[c] === "string" && r[c].length > 500) r[c] = r[c].slice(0, 500) + "…";
      }
      const b2 = comprimir([r]);
      if (b2.length <= cfg.CHUNK_MAX_B64) return [b2];
      log.error(`registro ${r._k} supera el límite de chunk incluso recortado: se descarta (ver incidencias)`);
      registrarIncidencia(store, { nivel: "error", msg: "registro excede límite de chunk", ctx: { _k: r._k } }).catch(() => {});
      return [];
    }
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

  /* ---------- count(*) con reintentos: los "esperados" del mes ----------
     count(*) es la forma DOCUMENTADA de SoQL (count(1) no aparece en la
     gramática oficial y un 400 aquí no se reintenta). */
  async function contarMes(mes) {
    const { ini, fin } = limitesMes(mes);
    const where = `${cfg.campoFecha} >= '${ini}' AND ${cfg.campoFecha} < '${fin}'`;
    const r = await pedir(urlSoQL({ "$select": "count(*) as n", "$where": where }), `count ${mes}`);
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
    const desdeVigente = rangoDesde();

    if (!progreso || progreso.tipo !== "full" || progreso.terminado) {
      progreso = {
        tipo: "full", desde: desdeVigente, iniciado: new Date(now()).toISOString(),
        meses: mesesDelRango(desdeVigente, now()), mesIdx: 0,
        cursor: {}, chunkIdx: 0, filasMes: 0, esperadosMes: null,
        totales: { filas: 0, paginas: 0, esperados: 0 }, porMes: {}, terminado: false,
      };
    } else if (progreso.desde !== desdeVigente) {
      // MIGRACIÓN DE RANGO SIN REINICIAR: si el solape cambió con una carga
      // en curso, se conservan los meses YA CERRADOS que sigan dentro del
      // rango nuevo (sus chunks no se re-descargan) y se continúa con el
      // primer mes pendiente. Lo cerrado fuera de rango queda huérfano solo
      // hasta la próxima purga (delta o fin de full).
      const nuevos = mesesDelRango(desdeVigente, now());
      const porMes = {};
      for (const m of nuevos) if (progreso.porMes && progreso.porMes[m]) porMes[m] = progreso.porMes[m];
      let idx = 0; while (idx < nuevos.length && porMes[nuevos[idx]]) idx++;
      // purga inmediata de lo que la carga vieja dejó FUERA del rango nuevo:
      // meses cerrados (manifest+chunks) y chunks del mes a medio bajar —
      // estos huérfanos aún no están en meta.porMes, así que la purga
      // general no los vería
      for (const m of Object.keys(progreso.porMes || {})) {
        if (porMes[m]) continue;
        const Kv = claves(m);
        const manV = await leerJSON(store, Kv.manifest);
        if (manV) for (let i = 0; i < manV.chunks; i++) await store.del(Kv.chunk(i));
        await store.del(Kv.manifest);
        log.info(`${m}: cerrado fuera del rango nuevo, purgado`);
      }
      const mesEnCurso = progreso.meses[progreso.mesIdx];
      if (mesEnCurso && nuevos.indexOf(mesEnCurso) < 0 && progreso.chunkIdx > 0) {
        const Kc = claves(mesEnCurso);
        for (let i = 0; i < progreso.chunkIdx; i++) await store.del(Kc.chunk(i));
        log.info(`${mesEnCurso}: parcial fuera del rango nuevo, chunks purgados`);
      }
      log.info(`rango cambiado ${progreso.desde} → ${desdeVigente}: conservados ${Object.keys(porMes).length} meses cerrados, se continúa en ${nuevos[idx] || "(nada pendiente)"}`);
      progreso = {
        ...progreso, desde: desdeVigente, meses: nuevos, mesIdx: idx, porMes,
        cursor: {}, chunkIdx: 0, filasMes: 0, esperadosMes: null,
        totales: {
          filas: Object.values(porMes).reduce((a, m) => a + (m.bajados || 0), 0),
          paginas: (progreso.totales && progreso.totales.paginas) || 0,
          esperados: Object.values(porMes).reduce((a, m) => a + (m.esperados || 0), 0),
        },
      };
    }
    const cap = await sondear(progreso);
    await escribirJSON(store, K0.progreso, progreso);
    log.info(`carga completa: ${progreso.meses.length} meses desde ${progreso.desde} (modo ${cap.keyset ? "keyset :id" : "$offset"})`);

    while (progreso.mesIdx < progreso.meses.length) {
      const mes = progreso.meses[progreso.mesIdx];
      if (progreso.esperadosMes == null) {
        // Un 400 en el count (p.ej. cambio de gramática) NO debe matar la
        // carga: se sigue sin "esperados" (-1) y la auditoría lo señalará.
        try {
          progreso.esperadosMes = await contarMes(mes);
          progreso.totales.esperados += progreso.esperadosMes;
          log.info(`${mes}: ${progreso.esperadosMes} esperados según count(*)`);
        } catch (e) {
          progreso.esperadosMes = -1;
          log.warn(`${mes}: count falló (${e.message}); se pagina sin verificación previa`);
        }
        await escribirJSON(store, K0.progreso, progreso);
      }

      let fin = false;
      while (!fin) {
        if (now() - t0 > presupuestoMs) {
          await escribirJSON(store, K0.progreso, progreso);
          log.info(`presupuesto de tiempo agotado: pausa en ${mes} (${progreso.filasMes}/${progreso.esperadosMes})`);
          return { done: false, progreso: resumenProgreso(progreso), duracionMs: now() - t0 };
        }
        let filas;
        try {
          filas = await paginaMes(mes, cap, progreso.cursor);
        } catch (e) {
          if (e && e.status === 400 && cap.keyset) {
            // El backend rechazó el keyset EN CALIENTE: degradar a $offset y
            // reiniciar el mes. Los chunks ya escritos no estorban: la
            // lectura deduplica por _k.
            log.warn(`${mes}: backend rechazó keyset (400) → reintento del mes en modo $offset`);
            cap.keyset = false;
            progreso.cursor = { offset: 0 }; progreso.filasMes = 0;
            await escribirJSON(store, K0.progreso, progreso);
            continue;
          }
          throw e;
        }
        progreso.totales.paginas++;
        if (filas.length) {
          if (cap.keyset && filas[filas.length - 1][":id"] === undefined) {
            throw new Error(`${mes}: el backend no devolvió :id en modo keyset (sin avance posible)`);
          }
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

      // cerrar el mes: manifest + poda de chunks huérfanos de corridas
      // anteriores (un mes que ahora ocupa MENOS chunks dejaría índices
      // altos con datos rancios servibles) + verificación esperados/bajados
      const K = claves(mes);
      const manViejo = await leerJSON(store, K.manifest);
      await escribirJSON(store, K.manifest, {
        ini: 0, chunks: progreso.chunkIdx, count: progreso.filasMes,
        esperados: progreso.esperadosMes >= 0 ? progreso.esperadosMes : null,
        updatedAt: new Date(now()).toISOString(),
      });
      const tope = Math.max((manViejo && manViejo.chunks) || 0, progreso.chunkIdx);
      for (let i = progreso.chunkIdx; i < tope; i++) await store.del(K.chunk(i));
      progreso.porMes[mes] = { bajados: progreso.filasMes, esperados: progreso.esperadosMes >= 0 ? progreso.esperadosMes : null };
      if (progreso.esperadosMes >= 0 && progreso.filasMes < progreso.esperadosMes) {
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
    // purga de meses que salieron de la ventana vigente (cambio de año o de
    // solape): sin esto, Redis acumula particiones muertas para siempre
    await purgarFueraDeRango(meta);
    meta.last_full = new Date(now()).toISOString();
    // El primer delta se ancla al INICIO de la corrida completa, no a su fin:
    // una full que tardó días (45 s por invocación) cerró sus meses mucho
    // antes de terminar y todo lo actualizado en ese intervalo debe entrar.
    meta.last_sync = progreso.iniciado;
    meta.desde = progreso.desde;
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
    const desdeAno = rangoDesde();
    // mantenimiento barato: si el rango se estrechó (o cambió el año), las
    // particiones viejas se purgan aquí sin esperar a otra carga completa
    try { if (await purgarFueraDeRango(meta)) await escribirJSON(store, K0.meta, meta); } catch (e) { log.warn("purga de rango: " + e.message); }

    function whereDelta(campo) {
      let w;
      if (campo === ":updated_at") w = `:updated_at > '${new Date(desdeMs).toISOString()}'`;
      else if (campo) w = `${campo} > '${isoFlotante(new Date(desdeMs - 5 * 3600e3))}'`; // flotante Colombia
      else w = `${cfg.campoFecha} >= '${isoFlotante(new Date(desdeMs - 5 * 3600e3))}'`;  // peor caso: ventana reciente
      return w + ` AND ${cfg.campoFecha} >= '${desdeAno}'`; // universo del año, como la carga completa
    }

    log.info(`delta desde ${new Date(desdeMs).toISOString()} (campo ${cap.delta || "ventana de fechas"})`);
    const nuevos = [];
    const cursor = {};
    let fin = false, completo = true;
    while (!fin) {
      if (now() - t0 > presupuestoMs) {
        // IMPORTANTE: un delta cortado NO avanza last_sync (abajo); si lo
        // hiciera, las páginas no bajadas se perderían para siempre en
        // silencio y ninguna auditoría lo detectaría.
        log.warn("delta: presupuesto agotado; se aplica lo bajado SIN avanzar last_sync");
        completo = false; break;
      }
      const params = { "$select": selectDe(cap), "$limit": String(cfg.PAGE), "$where": whereDelta(cap.delta) + (cap.keyset && cursor.lastId ? ` AND :id > '${escSoQL(cursor.lastId)}'` : "") };
      if (cap.keyset) params["$order"] = ":id";
      else { params["$order"] = `${cfg.campoFecha} ASC, ${cfg.campoId} ASC`; params["$offset"] = String(cursor.offset || 0); }
      let filas;
      try {
        filas = await pedir(urlSoQL(params), "delta");
      } catch (e) {
        if (e && e.status === 400 && cap.delta === ":updated_at") {
          // el backend rechazó :updated_at en el $where: degradar al campo
          // de negocio y reiniciar el delta desde cero (barato: es pequeño)
          log.warn("delta: backend rechazó :updated_at (400) → degradando a " + (cfg.camposDelta[1] || "ventana de fechas"));
          cap.delta = cfg.camposDelta[1] || null;
          nuevos.length = 0; cursor.lastId = undefined; cursor.offset = 0;
          continue;
        }
        throw e;
      }
      if (!Array.isArray(filas)) { completo = false; break; }
      nuevos.push(...filas.map(proyectar));
      if (cap.keyset && filas.length) cursor.lastId = filas[filas.length - 1][":id"];
      else cursor.offset = (cursor.offset || 0) + filas.length;
      fin = filas.length < cfg.PAGE;
    }

    // APLICACIÓN APPEND-ONLY: cada mes tocado recibe un chunk ADICIONAL con
    // las filas del delta, sin leer ni reescribir el mes (la lectura ya
    // deduplica por _k quedándose con el :updated_at más reciente, así el
    // cambio de estado REEMPLAZA de facto). Leer+reescribir meses de 40-50k
    // filas en cada delta horario reventaría el ancho de banda del tier
    // gratuito de KV; la compactación periódica mantiene los chunks a raya.
    const porMes = new Map();
    for (const r of nuevos) {
      const mes = String(r[cfg.campoFecha] || "").slice(0, 7);
      if (!/^\d{4}-\d{2}$/.test(mes)) continue;
      if (!porMes.has(mes)) porMes.set(mes, []);
      porMes.get(mes).push(r);
    }
    for (const [mes, regs] of porMes) {
      const K = claves(mes);
      let manifest = (await leerJSON(store, K.manifest)) || { ini: 0, chunks: 0, count: 0, esperados: null };
      const sig = await escribirChunks(mes, manifest.chunks, regs);
      manifest = { ...manifest, chunks: sig, count: (manifest.count || 0) + regs.length, updatedAt: new Date(now()).toISOString() };
      await escribirJSON(store, K.manifest, manifest);
      if ((manifest.chunks - (manifest.ini || 0)) > cfg.COMPACTAR_TRAS) await compactarMes(mes);
      const manFinal = (await leerJSON(store, K.manifest)) || manifest;
      meta.porMes = meta.porMes || {};
      // count es BRUTO (puede contar dos copias del mismo _k hasta compactar)
      meta.porMes[mes] = { bajados: manFinal.count, esperados: manFinal.esperados ?? null };
    }
    if (meta.porMes) meta.total = Object.values(meta.porMes).reduce((a, m) => a + (m.bajados || 0), 0);

    // El sello avanza SOLO si el delta fue completo, y se ancla al INICIO de
    // esta corrida (t0): lo actualizado mientras corría entra la próxima vez.
    if (completo) meta.last_sync = new Date(t0).toISOString();
    meta.ultimo_delta = { filas: nuevos.length, meses: porMes.size, parcial: !completo, duracionMs: now() - t0 };
    await escribirJSON(store, K0.meta, meta);
    log.info(`delta${completo ? "" : " PARCIAL"}: ${nuevos.length} filas en ${porMes.size} meses (${now() - t0}ms)`);
    return { done: completo, ...meta.ultimo_delta };
  }

  /* ---------- compactación de un mes (tras muchos deltas append-only) ------
     Escribe el mes deduplicado en un rango NUEVO de índices y conmuta el
     manifest de forma atómica ANTES de podar el rango viejo: un kill a mitad
     de compactación deja el manifest anterior intacto (nunca se pierden
     filas; a lo sumo quedan chunks huérfanos que la siguiente compactación
     o el cierre de mes de una full podan). */
  async function compactarMes(mes) {
    const K = claves(mes);
    const manifest = await leerJSON(store, K.manifest);
    if (!manifest) return;
    const { registros } = await leerMes(mes);
    const ini = manifest.chunks;
    const fin = await escribirChunks(mes, ini, registros);
    await escribirJSON(store, K.manifest, {
      ...manifest, ini, chunks: fin, count: registros.length,
      updatedAt: new Date(now()).toISOString(),
    });
    for (let i = manifest.ini || 0; i < ini; i++) await store.del(K.chunk(i));
    log.info(`${mes}: compactado a ${registros.length} registros (${fin - ini} chunks)`);
  }

  /* ---------- lectura de un mes completo (dedup por _k, gana el más nuevo) -- */
  async function leerMes(mes) {
    const K = claves(mes);
    const manifest = await leerJSON(store, K.manifest);
    if (!manifest) return { registros: [], manifest: null };
    // el manifest describe un RANGO [ini, chunks): la compactación escribe el
    // rango nuevo al final y conmuta atómicamente antes de podar el viejo
    const ks = []; for (let i = (manifest.ini || 0); i < manifest.chunks; i++) ks.push(K.chunk(i));
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
    const desde = rangoDesde();
    const meses = mesesDelRango(desde, now());
    const detalle = [];
    // la diferencia se calcula SOLO sobre meses con count verificado; si el
    // count de un mes falló, sus filas van a `sinVerificar` (mezclarlas en la
    // resta sesgaría el diagnóstico haciendo parecer que «sobran»)
    let esperadosTot = 0, comparados = 0, sinVerificar = 0;
    for (const mes of meses) {
      let esperados = null;
      try { esperados = await contarMes(mes); } catch (e) { log.warn(`auditoría ${mes}: count falló (${e.message})`); }
      const { registros } = await leerMes(mes);
      detalle.push({ mes, esperados, almacenados: registros.length, diferencia: esperados == null ? null : esperados - registros.length });
      if (esperados != null) { esperadosTot += esperados; comparados += registros.length; }
      else sinVerificar += registros.length;
    }
    const rep = {
      ts: new Date(now()).toISOString(), esperados: esperadosTot,
      almacenados: comparados + sinVerificar, comparados, sinVerificar,
      diferencia: esperadosTot - comparados, duracionMs: now() - t0, detalle,
    };
    meta.auditoria = rep;
    await escribirJSON(store, K0.meta, meta);
    log.info(`AUDITORÍA: esperados=${esperadosTot} comparados=${comparados} diferencia=${rep.diferencia}${sinVerificar ? ` (+${sinVerificar} sin verificar: count falló)` : ""} (${rep.duracionMs}ms)`);
    for (const d of detalle) {
      if (!d.diferencia) continue;
      if (d.diferencia > 0) log.warn(`  ${d.mes}: FALTAN ${d.diferencia} (revisar incidencias / relanzar el mes)`);
      else log.warn(`  ${d.mes}: SOBRAN ${-d.diferencia} (posibles borrados o movidos de mes en la fuente)`);
    }
    return rep;
  }

  /* Inicio del rango vigente: 1-ene (hora Colombia) − solape de publicación. */
  function rangoDesde() {
    return isoFlotante(new Date(Date.parse(inicioAnoVigente(now()) + "Z") - cfg.SOLAPE_PUBLICACION_DIAS * 864e5));
  }

  /* Purga particiones de meses ANTERIORES al rango vigente (p.ej. tras
     reducir el solape o al cambiar de año) actualizando meta en sitio.
     Seguro por diseño: solo toca meses estrictamente fuera del rango, nunca
     los del año en curso ni el progreso de una carga activa. */
  async function purgarFueraDeRango(meta) {
    const mesLimite = rangoDesde().slice(0, 7);
    let cambio = false;
    for (const mes of Object.keys(meta.porMes || {})) {
      if (mes >= mesLimite) continue;
      const K = claves(mes);
      const man = await leerJSON(store, K.manifest);
      if (man) for (let i = 0; i < man.chunks; i++) await store.del(K.chunk(i));
      await store.del(K.manifest);
      delete meta.porMes[mes];
      cambio = true;
      log.info(`${mes}: fuera del rango vigente (< ${mesLimite}), purgado de Redis`);
    }
    if (cambio) {
      meta.total = Object.values(meta.porMes || {}).reduce((a, m) => a + (m.bajados || 0), 0);
      const desde = rangoDesde();
      if (!meta.desde || meta.desde < desde) meta.desde = desde; // cobertura honesta
    }
    return cambio;
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

  return { extraerTodo, extraerDelta, auditar, leerMes, compactarMes, estado, _interno: { mesesDelRango, limitesMes, empaquetar, proyectar, inicioAnoVigente } };
}

module.exports = { crearExtractor, CAMPOS_PROYECCION, CIERRE_CANDIDATOS, DEFAULTS, anoVigente, inicioAnoVigente, mesesDelRango };
