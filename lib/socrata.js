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
/* TOPE POR INTENTO (6-sep-2026, M-INF-08). Sin `signal`, una conexión que
   Socrata acepta y nunca responde vivía hasta el maxDuration de la función
   (300 s): los presupuestos de los llamadores (sync 45 s, paa 20 s, socio 6 s)
   se miran ENTRE páginas, no dentro de la petición. Un intento que agota su
   tope cae en la misma rama de retroceso que un fallo de red (sin reintento
   nuevo); el llamador puede pedir menos con `opts.timeoutMs`, nunca más. */
const TIMEOUT_MS = 20000;
/* EL PLAZO DEL LLAMADOR MANDA SOBRE EL TOPE (remate V-B3a-01, 6-sep-2026). El
   tope de 20 s no sabía cuánto le quedaba a quien pedía: con Socrata colgado UNA
   página costaba 5 × 20 s + 24 s de retroceso = 124 s (medido) en sync (45 s de
   presupuesto), paa (20 s; maxDuration 60 s: la función moría sin responder),
   historico, documentos y seguimiento. Dos formas de decirlo: `opts.plazoDe()`
   —los milisegundos que le quedan al llamador, para los clientes que paginan— y
   `pedir(params, etiqueta, { plazoMs })` para una consulta suelta con su tiempo.
   Ningún intento ni retroceso dura más que lo que queda, y tras el último
   intento no se duerme (eran 12 s tirados). */
const MAX_RETROCESO_MS = 12000;

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
  const timeoutMs = Math.min(TIMEOUT_MS, opts.timeoutMs || TIMEOUT_MS);
  const plazoDe = typeof opts.plazoDe === "function" ? opts.plazoDe : null;
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

  async function pedir(params, etiqueta, { plazoMs } = {}) {
    const url = urlSoQL(params, baseUrl);
    const tArranque = Date.now();
    // lo que le queda al llamador: el menor de su presupuesto (plazoDe) y el plazo de esta consulta
    const restante = () => {
      let r = Infinity;
      if (plazoDe) { const p = Number(plazoDe()); if (Number.isFinite(p)) r = Math.min(r, p); }
      if (Number.isFinite(plazoMs)) r = Math.min(r, plazoMs - (Date.now() - tArranque));
      return r;
    };
    const corte = () => {
      const ms = Math.max(1, Math.min(timeoutMs, restante()));
      return AbortSignal.timeout ? AbortSignal.timeout(ms) : undefined;
    };
    /* ¿Fue el presupuesto o fue la fuente? Si un intento arrancó con el tope ENTERO
       (le quedaba al llamador más que TIMEOUT_MS) y aun así falló, la fuente no
       responde: eso es un fallo y se publica (sync 45 s: dos intentos de 20 s y 502
       con rastro). Si TODOS los intentos iban recortados por lo que quedaba y el
       tiempo se acabó, el presupuesto cortó la consulta: `presupuesto_agotado` y
       los llamadores reanudables (full, delta, histórico) guardan el cursor y
       siguen en la siguiente invocación, igual que un corte entre páginas. Sin
       esta distinción, una fuente colgada era un «parcial» eterno sin error. */
    let ultimo, intentos = 0, hubo429 = false, sinTiempo = false, falloConTopeEntero = false;
    for (let intento = 1; intento <= MAX_INTENTOS; intento++) {
      intentos = intento;
      const topeEntero = restante() >= timeoutMs;
      let espera;
      try {
        const headers = { Accept: "application/json" };
        if (appToken) headers["X-App-Token"] = appToken;
        const r = await fetchImpl(url, { headers, signal: corte() });
        if (r.ok) return await r.json();
        ultimo = new Error(`HTTP ${r.status} en ${etiqueta}`);
        ultimo.status = r.status;
        if (r.status === 429) hubo429 = true;
        if (r.status === 400) {
          ultimo.cuerpo = await r.text().catch(() => "");
          throw ultimo; // malformada: que decida el llamador, sin reintentos
        }
        if (r.status === 403 && appToken) {
          const r2 = await fetchImpl(url, { headers: { Accept: "application/json" }, signal: corte() });
          if (r2.ok) {
            appTokenRechazado = true;
            appToken = "";
            log(`${etiqueta}: HTTP 403 con app token y 200 sin él — SOCRATA_APP_TOKEN inválido; se sigue sin token`);
            return await r2.json();
          }
        }
        const retryAfter = parseFloat(r.headers && r.headers.get && r.headers.get("Retry-After"));
        espera = Math.min(!isNaN(retryAfter) ? retryAfter * 1000
          : BACKOFF_BASE_MS * Math.pow(2, intento - 1) * (0.5 + Math.random()), MAX_RETROCESO_MS);
        log(`${etiqueta}: HTTP ${r.status}, reintento ${intento}/${MAX_INTENTOS} en ${Math.round(espera)}ms`);
      } catch (e) {
        if (e && e.status === 400) throw e;
        ultimo = e;
        espera = Math.min(BACKOFF_BASE_MS * Math.pow(2, intento - 1) * (0.5 + Math.random()), MAX_RETROCESO_MS);
        log(`${etiqueta}: ${e.message}, reintento ${intento}/${MAX_INTENTOS} en ${Math.round(espera)}ms`);
      }
      if (topeEntero) falloConTopeEntero = true;
      if (intento === MAX_INTENTOS) break;           // tras el último intento no hay nada que esperar
      if (espera >= restante()) { sinTiempo = true; break; } // un retroceso mayor que lo que queda no se duerme
      await dormir(espera);
    }
    /* AGOTADO, EN LENGUAJE DE USUARIO (6-sep-2026, M-DGF-04 y remate B4b-H1). Este
       texto lo pegan al `motivo` que ve la persona cinco módulos en nueve sitios
       (socio, ejecucion, proponentes, documentos, seguimiento): decía «{etiqueta}:
       agotados 5 intentos (HTTP 503 en {etiqueta})», o sea una etiqueta interna y un
       código HTTP donde hacía falta «vuelva a intentarlo». Cuando la culpa es de la
       fuente —cualquier 429 en la tanda, o un 5xx al final— el mensaje es de persona
       y se hereda sin tocar a los llamadores (una lista de sitios dejaría huecos).
       Un fallo de red o un tiempo de espera agotado siguen diciendo su causa técnica:
       pueden ser de este lado. `status` viaja para quien quiera distinguirlo y
       `detalle` conserva siempre el texto técnico para el registro. */
    const detalle = `${etiqueta}: agotados ${intentos} intentos (${ultimo && ultimo.message})${sinTiempo ? "; sin tiempo para reintentar" : ""}`;
    const st = ultimo && ultimo.status;
    const culpaDeLaFuente = hubo429 || (st >= 500 && st <= 599);
    const err = new Error(culpaDeLaFuente ? "datos.gov.co no respondió o limitó las consultas; vuelva a intentarlo en unos minutos" : detalle);
    if (st) err.status = st;
    err.detalle = detalle;
    err.presupuesto_agotado = sinTiempo && !falloConTopeEntero;
    throw err;
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
    /* «SIN DATO» ≠ 0 (6-sep-2026): con `parseInt(... || "0")` un cuerpo vacío, [{}]
       o HTML publicaba 0 esperados y un count no numérico publicaba NaN. Solo DOS
       formas son un count (remate H-03 del mismo día): un número entero ≥ 0 o una
       cadena de dígitos tras recortar espacios. Descartar solo undefined/null/"" y
       convertir el resto dejaba pasar Number(" ") === Number([]) === Number(false)
       === 0 y Number("0x10") === 16: ceros y cifras creíbles a partir de basura.
       Todo lo demás es null: «no auditado», que sync e historico publican como null. */
    const n = r && r[0] && (r[0].n ?? r[0].count);
    if (typeof n === "number") return Number.isInteger(n) && n >= 0 ? n : null;
    if (typeof n === "string" && /^\d+$/.test(n.trim())) return parseInt(n.trim(), 10);
    return null;
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
  crearCliente, urlSoQL, escSoQL, TIMEOUT_MS,
  anoVigente, mesesDelAno, mesesEntre, limitesMes, ahoraColombia,
};
