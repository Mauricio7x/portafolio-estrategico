/* ============================================================================
   lib/socrata · Acceso al dataset p6dx-8zbt de SECOP II (API Socrata / SoQL)
   ----------------------------------------------------------------------------
   Solo transporte: URLs SoQL, reintentos con backoff y helpers de calendario
   en hora Colombia. La lógica de qué bajar y dónde guardarlo vive en api/sync.

   Lecciones heredadas del código anterior (probadas en producción):
   · Paginación KEYSET por :id ($order=:id, $where :id > 'último'): estable
     aunque entren registros nuevos durante la corrida. $offset con orden por
     fecha pierde/duplica filas cuando el dataset se mueve entre páginas.
   · $select="*,:id,:updated_at" — se piden TODAS las columnas y se proyecta
     (el `*` va PRIMERO: desde ago 2026 Socrata rechaza con 400 «Star selections
     must come at the start of the select-list» el orden `:id,:updated_at,*` que
     valió durante meses — producción degradó a $offset y se quedó sin
     sincronizar; hay prueba que fija el orden)
     en cliente: la fecha de cierre vive en columnas distintas según la
     modalidad y un $select explícito con una columna inexistente da 400.
   · Un 400 NUNCA se reintenta (consulta malformada); 429/5xx/red sí, con
     backoff exponencial + jitter y respetando Retry-After.
   · El dataset usa timestamps flotantes en hora Colombia (UTC-5 fija, sin
     DST); :updated_at es UTC fijo. No mezclarlos sin convertir.
   ========================================================================== */
"use strict";

const BASE = () => process.env.SECOP_BASE_URL || "https://www.datos.gov.co/resource/p6dx-8zbt.json";
const MAX_INTENTOS = 5;
const BACKOFF_BASE_MS = parseInt(process.env.SECOP_BACKOFF_MS, 10) || 800;

/* ---------- calendario en hora Colombia (UTC-5 fija) ---------- */
function ahoraColombia(now) { return new Date((now || Date.now()) - 5 * 3600e3); }
function anoVigente(now) { return ahoraColombia(now).getUTCFullYear(); }

/* Meses YYYY-MM desde enero del año vigente hasta el mes actual (Colombia). */
function mesesDelAno(now) {
  const hoy = ahoraColombia(now);
  const y = hoy.getUTCFullYear(), mFin = hoy.getUTCMonth() + 1;
  const out = [];
  for (let m = 1; m <= mFin; m++) out.push(`${y}-${String(m).padStart(2, "0")}`);
  return out;
}

/* Meses YYYY-MM entre dos extremos, ambos inclusive (extracción histórica).
   No depende del calendario actual: el rango lo fija quien dispara la carga. */
function mesesEntre(desde, hasta) {
  const re = /^(\d{4})-(0[1-9]|1[0-2])$/;
  if (!re.test(desde) || !re.test(hasta)) throw new Error(`rango de meses inválido: ${desde}..${hasta}`);
  if (desde > hasta) throw new Error(`rango invertido: ${desde} > ${hasta}`);
  const out = [];
  let [y, m] = desde.split("-").map(Number);
  const [yF, mF] = hasta.split("-").map(Number);
  while (y < yF || (y === yF && m <= mF)) {
    out.push(`${y}-${String(m).padStart(2, "0")}`);
    if (++m > 12) { m = 1; y++; }
  }
  return out;
}

/* Límites [ini, fin) de un mes como timestamp flotante Colombia. */
function limitesMes(mes) {
  const [y, m] = mes.split("-").map(Number);
  const sig = m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, "0")}`;
  return { ini: `${mes}-01T00:00:00.000`, fin: `${sig}-01T00:00:00.000` };
}

const escSoQL = (s) => String(s).replace(/'/g, "''");

/* `baseUrl` es OPCIONAL y por omisión apunta a p6dx-8zbt, que es el dataset de
   este módulo. Existe porque el PAA (`9sue-ezhx`, lib/paa) vive en OTRO dataset
   del mismo Socrata y necesita exactamente el mismo transporte: keyset, backoff
   con jitter, `Retry-After` y la regla de que un 400 no se reintenta jamás.
   Escribir un segundo cliente HTTP «equivalente hoy» es la forma conocida de
   que diverjan a la primera corrección aplicada a uno solo. */
function urlSoQL(params, baseUrl) {
  const qs = Object.entries(params)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join("&");
  return `${baseUrl || BASE()}?${qs}`;
}

/* ---------- fetch JSON con reintentos ---------- */
function crearCliente(opts = {}) {
  const fetchImpl = opts.fetchImpl || globalThis.fetch;
  const baseUrl = opts.baseUrl || null; // null → p6dx-8zbt (ver urlSoQL)
  let appToken = opts.appToken !== undefined ? opts.appToken : (process.env.SOCRATA_APP_TOKEN || "");
  const dormir = opts.dormir || ((ms) => new Promise((r) => setTimeout(r, ms)));
  const log = opts.log || (() => {});
  /* UN APP TOKEN INVÁLIDO NO PUEDE PARAR LA SINCRONIZACIÓN (ago 2026). Socrata
     responde 403 «Invalid app_token specified» a cualquier token que no
     reconozca, y el 16-ago-2026 producción estuvo 14 h sin sincronizar porque
     el valor pegado en Vercel no era el correcto: cinco reintentos con backoff
     y «agotados» en cada delta. Ante un 403 CON token se reintenta UNA vez sin
     él; si sin token responde, el token se descarta para el resto de la
     instancia y `appTokenRechazado` lo cuenta (viaja en la respuesta del sync
     para que se vea en vez de adivinarse). Un 403 SIN token sigue siendo un
     403 de verdad (bloqueo) y se trata como antes. */
  let appTokenRechazado = false;

  async function pedir(params, etiqueta) {
    const url = urlSoQL(params, baseUrl);
    let ultimo;
    for (let intento = 1; intento <= MAX_INTENTOS; intento++) {
      try {
        const headers = { Accept: "application/json" };
        if (appToken) headers["X-App-Token"] = appToken;
        const r = await fetchImpl(url, { headers });
        if (r.ok) return await r.json();
        ultimo = new Error(`HTTP ${r.status} en ${etiqueta}`);
        ultimo.status = r.status;
        if (r.status === 400) {
          ultimo.cuerpo = await r.text().catch(() => "");
          throw ultimo; // malformada: que decida el llamador, sin reintentos
        }
        if (r.status === 403 && appToken) {
          const r2 = await fetchImpl(url, { headers: { Accept: "application/json" } });
          if (r2.ok) {
            appTokenRechazado = true;
            appToken = "";
            log(`${etiqueta}: HTTP 403 con app token y 200 sin él — SOCRATA_APP_TOKEN inválido; se sigue sin token`);
            return await r2.json();
          }
        }
        const retryAfter = parseFloat(r.headers && r.headers.get && r.headers.get("Retry-After"));
        const espera = Math.min(!isNaN(retryAfter) ? retryAfter * 1000
          : BACKOFF_BASE_MS * Math.pow(2, intento - 1) * (0.5 + Math.random()), 12000);
        log(`${etiqueta}: HTTP ${r.status}, reintento ${intento}/${MAX_INTENTOS} en ${Math.round(espera)}ms`);
        await dormir(espera);
      } catch (e) {
        if (e && e.status === 400) throw e;
        ultimo = e;
        const espera = Math.min(BACKOFF_BASE_MS * Math.pow(2, intento - 1) * (0.5 + Math.random()), 12000);
        log(`${etiqueta}: ${e.message}, reintento ${intento}/${MAX_INTENTOS} en ${Math.round(espera)}ms`);
        await dormir(espera);
      }
    }
    throw new Error(`${etiqueta}: agotados ${MAX_INTENTOS} intentos (${ultimo && ultimo.message})`);
  }

  /* EL SELLO DEL DEDUP TAMBIÉN EN MODO $offset (ago 2026). Al degradar por un
     400 del keyset, el `$select` se quedaba en `"*"`, que en SODA NO incluye los
     metacampos: las filas llegaban SIN `:updated_at` y el dedup de lectura
     —«gana el sello más reciente»— no puede dejar que una fila sin sello
     reemplace a una guardada con sello. Consecuencia medida: un proceso que pasó
     a Adjudicado durante una ventana degradada se seguía sirviendo como ABIERTO
     hasta la full de higiene (y entre dos filas sin sello ganaba el orden del
     SCAN, o sea nada determinista). Producción atravesó 14 h en ese modo en
     ago 2026, así que no es teórico.
     Se pide `*,:updated_at` (sin `:id`, que solo hace falta para el keyset) y,
     si ESE select también da 400 —el caso en que el backend no expone
     metacampos—, se cae UNA vez al mínimo y se anota: el mismo patrón del
     app_token rechazado, y el respaldo sigue existiendo. */
  let offsetSinMetacampos = false;
  const selectOffset = () => (offsetSinMetacampos ? "*" : "*,:updated_at");
  function degradarSelectOffset(etiqueta) {
    if (offsetSinMetacampos) return false;
    offsetSinMetacampos = true;
    log(`${etiqueta}: 400 pidiendo :updated_at en modo offset — se sigue sin metacampos (el dedup no podrá reemplazar versiones)`);
    return true;
  }

  /* count(*) de un mes por fecha de publicación — los "esperados" del mes. */
  async function contarMes(mes) {
    const { ini, fin } = limitesMes(mes);
    const r = await pedir({
      "$select": "count(*) as n",
      "$where": `fecha_de_publicacion_del >= '${ini}' AND fecha_de_publicacion_del < '${fin}'`,
    }, `count ${mes}`);
    return parseInt((r && r[0] && (r[0].n ?? r[0].count)) || "0", 10);
  }

  /* Una página del mes con keyset por :id (o $offset si keyset=false). */
  async function paginaMes(mes, cursor, { pagina, keyset }) {
    const { ini, fin } = limitesMes(mes);
    let where = `fecha_de_publicacion_del >= '${ini}' AND fecha_de_publicacion_del < '${fin}'`;
    const params = { "$select": keyset ? "*,:id,:updated_at" : selectOffset(), "$limit": String(pagina) };
    if (keyset) {
      if (cursor.lastId) where += ` AND :id > '${escSoQL(cursor.lastId)}'`;
      params["$order"] = ":id";
    } else {
      params["$order"] = "fecha_de_publicacion_del ASC, id_del_proceso ASC";
      params["$offset"] = String(cursor.offset || 0);
    }
    params["$where"] = where;
    let filas;
    try {
      filas = await pedir(params, `página ${mes}`);
    } catch (e) {
      // 400 pidiendo el sello en modo offset: se cae al mínimo UNA vez y se reintenta
      if (e && e.status === 400 && !keyset && degradarSelectOffset(`página ${mes}`)) {
        params["$select"] = selectOffset();
        filas = await pedir(params, `página ${mes}`);
      } else throw e;
    }
    if (!Array.isArray(filas)) throw new Error(`respuesta no-array en ${mes}`);
    return filas;
  }

  /* Una página del delta: :updated_at > desde (UTC) dentro del año vigente. */
  async function paginaDelta(desdeUTC, inicioAno, cursor, { pagina, keyset }) {
    let where = `:updated_at > '${desdeUTC}' AND fecha_de_publicacion_del >= '${inicioAno}'`;
    const params = { "$select": keyset ? "*,:id,:updated_at" : selectOffset(), "$limit": String(pagina) };
    if (keyset) {
      if (cursor.lastId) where += ` AND :id > '${escSoQL(cursor.lastId)}'`;
      params["$order"] = ":id";
    } else {
      params["$order"] = "fecha_de_publicacion_del ASC, id_del_proceso ASC";
      params["$offset"] = String(cursor.offset || 0);
    }
    params["$where"] = where;
    let filas;
    try {
      filas = await pedir(params, "delta");
    } catch (e) {
      if (e && e.status === 400 && !keyset && degradarSelectOffset("delta")) {
        params["$select"] = selectOffset();
        filas = await pedir(params, "delta");
      } else throw e;
    }
    if (!Array.isArray(filas)) throw new Error("respuesta no-array en delta");
    return filas;
  }

  return {
    pedir, contarMes, paginaMes, paginaDelta,
    appTokenRechazado: () => appTokenRechazado,
    // ¿el modo offset tuvo que renunciar al sello del dedup? (se publica en el sync)
    offsetSinSello: () => offsetSinMetacampos,
  };
}

module.exports = {
  crearCliente, urlSoQL, escSoQL,
  anoVigente, mesesDelAno, mesesEntre, limitesMes, ahoraColombia,
};
