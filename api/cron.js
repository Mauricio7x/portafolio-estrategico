/* ============================================================================
   /api/cron  ·  Monitor autónomo de SECOP (Detecta)
   ----------------------------------------------------------------------------
   Lo dispara Vercel Cron (ver vercel.json) cada 3 horas. Hace lo que tú hoy
   haces a mano al abrir la página, pero solo y con memoria:

     1. Consulta SECOP II y SECOP I (datos abiertos) de los últimos N días.
     2. Calcula el encaje con los 3 perfiles (Helder / Génesis / Consorcio).
     3. Para los de encaje ≥ UMBRAL, intenta leer el % de anticipo del pliego.
     4. Compara contra los IDs ya avisados (Vercel KV) → solo alerta lo NUEVO.
     5. Envía a Telegram un mensaje por proceso, con resumen y "qué falta".

   Variables de entorno (Vercel → Settings → Environment Variables):
     SOCRATA_APP_TOKEN     token de Socrata (mismo del proxy)
     TELEGRAM_BOT_TOKEN    el que te da @BotFather
     TELEGRAM_CHAT_ID      tu chat id (ver README, paso 3)
     CRON_SECRET           cadena aleatoria; protege el endpoint
     KV_REST_API_URL       (auto al crear Vercel KV)
     KV_REST_API_TOKEN     (auto al crear Vercel KV)
   ========================================================================== */

const {
  profiles, SECOP_SOURCES, calcScore, mapProcess, faltaPara100,
} = require("../lib/engine.js");

const UMBRAL = 75;        // solo alerta encaje ≥ 75 (lo que pediste)
const DIAS_ATRAS = 4;     // ventana: corre cada 3h, 4 días cubre fines de semana
const MAX_POR_FUENTE = 400;
const KV_SEEN = "detecta:seen";       // set de IDs ya avisados
const KV_TTL_DIAS = 45;               // olvida IDs tras 45 días (ahorra memoria)

/* ---------- Vercel KV (REST) ---------- */
async function kv(cmd) {
  const r = await fetch(process.env.KV_REST_API_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.KV_REST_API_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify(cmd),
  });
  const j = await r.json();
  return j.result;
}
const yaVisto = id => kv(["SISMEMBER", KV_SEEN, id]).then(x => x === 1);
const marcarVisto = id => kv(["SADD", KV_SEEN, id]);

/* ---------- Socrata ---------- */
async function socrata(url) {
  const headers = { Accept: "application/json" };
  if (process.env.SOCRATA_APP_TOKEN) headers["X-App-Token"] = process.env.SOCRATA_APP_TOKEN;
  const r = await fetch(url, { headers });
  if (!r.ok) throw new Error(`Socrata ${r.status} en ${url}`);
  return r.json();
}

function fechaDesde(dias) {
  const d = new Date(Date.now() - dias * 864e5);
  return d.toISOString().slice(0, 10) + "T00:00:00.000";
}

/* ---------- Anticipo: leer el pliego del expediente ----------
   El dataset NO trae el % de anticipo. Está en el PDF/HTML del proceso.
   Replicamos los patrones que ya tiene tu index.html. */
const ANTI_PATTERNS = [
  /anticipo[^%]{0,120}?(\d{1,3}(?:[.,]\d+)?)\s*%/i,
  /(\d{1,3}(?:[.,]\d+)?)\s*%[^.]{0,60}?(?:de\s+|en\s+calidad\s+de\s+|por\s+concepto\s+de\s+|a\s+t[ií]tulo\s+de\s+)?anticipo/i,
  /porcentaje\s+de\s+anticipo[^0-9]{0,40}(\d{1,3}(?:[.,]\d+)?)/i,
  /anticipo[^0-9]{0,40}equivalente\s+al?\s+(\d{1,3}(?:[.,]\d+)?)/i,
];
function extraerAnticipo(txt) {
  const norm = (txt || "").replace(/\s+/g, " ");
  if (/no\s+(?:se\s+)?(?:contempla|habr[áa]|otorga|aplica|pacta)\s+anticipo|sin\s+anticipo/i.test(norm)) return 0;
  for (const re of ANTI_PATTERNS) {
    const m = norm.match(re);
    if (m) { const v = parseFloat(m[1].replace(",", ".")); if (v >= 0 && v <= 100) return v; }
  }
  return null;
}
async function verificarAnticipo(p) {
  if (!p.url) return null;
  try {
    const r = await fetch(p.url, { headers: { "User-Agent": "Mozilla/5.0" }, redirect: "follow" });
    if (!r.ok) return null;
    const html = await r.text();
    return extraerAnticipo(html.replace(/<[^>]+>/g, " "));
  } catch { return null; }
}

/* ---------- Resumen ejecutivo GRATIS (sin API de pago) ----------
   Se arma con los datos que ya tenemos del proceso. Mismo criterio que la web. */
const SMMLV_CRON = 1750905;
function resumenLocal(p, best, anticipo) {
  const fmt = n => n ? "$" + Math.round(n).toLocaleString("es-CO") : "monto no declarado";
  const smmlv = p.valor ? Math.round(p.valor / SMMLV_CRON) : 0;
  const t = ((p.nombre || "") + " " + (p.descripcion || "")).toLowerCase();
  let tipoObra = "obra civil";
  if (/paviment|placa\s*huella|v[ií]a|carretera|malla\s*vial/.test(t)) tipoObra = "obra vial";
  else if (/acueducto|alcantarill|agua\s*potable|ptap|ptar/.test(t)) tipoObra = "obra de acueducto/alcantarillado";
  else if (/edificaci|sede|colegio|hospital/.test(t)) tipoObra = "obra de edificación";
  else if (/manteni|mejorami|adecuaci|reparaci/.test(t)) tipoObra = "obra de mantenimiento";
  else if (/interventor/.test(t)) tipoObra = "interventoría";

  const obj = (p.nombre || "Proceso").replace(/\s+/g, " ").trim();
  const objCorto = obj.length > 80 ? obj.slice(0, 80).replace(/\s+\S*$/, "") + "…" : obj;
  const f1 = `${p.entidad || "Entidad estatal"} abrió una ${tipoObra} por ${fmt(p.valor)}${smmlv ? ` (${smmlv} SMMLV)` : ""} en ${[p.ciudad, p.depto].filter(Boolean).join(", ") || "ubicación s/d"}.`;

  const antiTxt = anticipo == null ? "anticipo sin verificar (revisar pliego)"
    : anticipo >= 20 ? `anticipo ${anticipo}% (cumple ≥20%)` : `anticipo ${anticipo}% (bajo 20%)`;
  const kOk = best.k && best.k.crp >= best.crpc;
  const f2 = `Encaje ${best.score}/100 con perfil ${best.perfil}: ${kOk ? "K residual suficiente" : "revisar K residual"}, ${antiTxt}.`;
  return f1 + " " + f2;
}

/* ---------- Telegram ---------- */
async function telegram(text) {
  const url = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`;
  await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: process.env.TELEGRAM_CHAT_ID, text, parse_mode: "HTML", disable_web_page_preview: true }),
  });
}
const esc = s => (s || "").toString().replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const fmtCOP = n => n ? "$" + Math.round(n).toLocaleString("es-CO") : "—";

/* ---------- Handler ---------- */
export default async function handler(req, res) {
  // Protección: el header lo manda Vercel Cron; o pasa ?secret= para probar a mano.
  const auth = req.headers["authorization"] === `Bearer ${process.env.CRON_SECRET}`;
  const manual = req.query.secret === process.env.CRON_SECRET;
  if (!auth && !manual) return res.status(401).json({ error: "no autorizado" });

  const desde = fechaDesde(DIAS_ATRAS);
  let candidatos = [];

  // 1) Descargar de cada fuente
  for (const key of Object.keys(SECOP_SOURCES)) {
    const src = SECOP_SOURCES[key];
    try {
      const where = encodeURIComponent(`${src.f.fecha} >= '${desde}'`);
      const url = `${src.base}?$where=${where}&$order=${encodeURIComponent(src.f.fecha + " DESC")}&$limit=${MAX_POR_FUENTE}`;
      const rows = await socrata(url);
      candidatos.push(...rows.map(r => mapProcess(r, src)));
    } catch (e) { /* una fuente caída no debe tumbar el cron */ }
  }

  // 2) Puntuar con los 3 perfiles, quedarse con el mejor encaje ≥ UMBRAL
  const fuertes = [];
  for (const p of candidatos) {
    let best = null;
    for (const pk of ["helder", "genesis", "juntos"]) {
      const r = calcScore(p, profiles[pk]);
      if (!best || r.score > best.score) best = { ...r, perfil: pk };
    }
    if (best.score >= UMBRAL) fuertes.push({ p, best });
  }

  // 3) Filtrar los ya avisados
  const nuevos = [];
  for (const item of fuertes) {
    if (!item.p.id) continue;
    if (await yaVisto(item.p.id)) continue;
    nuevos.push(item);
  }

  // 4) Verificar anticipo + resumen IA + alertar (máx 15 por corrida)
  let enviados = 0;
  for (const { p, best } of nuevos.slice(0, 15)) {
    const anticipo = await verificarAnticipo(p);
    const gaps = faltaPara100(best);
    const resumen = resumenLocal(p, best, anticipo);

    const antiTxt = anticipo == null ? "no verificable (abrir pliego)"
      : anticipo >= 20 ? `${anticipo}% ✅` : `${anticipo}% ⚠️ (bajo 20%)`;

    let msg = `🎯 <b>Encaje ${best.score}/100</b> · ${best.perfil}\n`;
    msg += `<b>${esc(p.nombre)}</b>\n`;
    msg += `🏛 ${esc(p.entidad)}\n`;
    msg += `📍 ${esc([p.ciudad, p.depto].filter(Boolean).join(", "))} · ${esc(p.fuente)}\n`;
    msg += `💰 ${fmtCOP(p.valor)} · ⚓ Anticipo ${antiTxt}\n`;
    if (resumen) msg += `\n${esc(resumen)}\n`;
    if (gaps.length) msg += `\n📌 Para subir el encaje:\n` + gaps.slice(0, 3).map(g => "· " + esc(g)).join("\n") + "\n";
    if (p.url) msg += `\n↗ <a href="${esc(p.url)}">Ver en SECOP</a>`;

    await telegram(msg);
    await marcarVisto(p.id);
    enviados++;
  }

  // mantener el set acotado en el tiempo
  await kv(["EXPIRE", KV_SEEN, KV_TTL_DIAS * 86400]);

  return res.status(200).json({
    ok: true, revisados: candidatos.length, fuertes: fuertes.length,
    nuevos: nuevos.length, enviados, umbral: UMBRAL,
  });
}
