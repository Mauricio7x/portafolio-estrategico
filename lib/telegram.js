/* ============================================================================
   lib/telegram · El aviso al teléfono por Telegram — sin SDK, sin dependencias
   (5-nov-2026)
   ----------------------------------------------------------------------------
   POR QUÉ TELEGRAM Y NO WHATSAPP. Detekta es de uso propio y el dueño opera
   desde el teléfono. La Bot API de Telegram envía «at no cost» y pide solo un
   POST (core.telegram.org/bots/faq, leído el 5-nov-2026); la API de WhatsApp
   cobra «on a per-message basis» y los mensajes que inicia la empresa exigen
   plantilla aprobada (developers.facebook.com/docs/whatsapp/pricing, leído el
   5-nov-2026). Decisión del plan «Plan Detekta a otro nivel», proceso 11.

   EL MISMO CONTRATO QUE lib/correo (y por el mismo motivo):
   · FALTA ≠ FALLO: sin las dos variables no se lanza nada; se dice qué falta
     y qué hacer, y quien llama lo publica.
   · El PARSEO DEL JSON VA APARTE DEL FETCH: un muro que responde HTML con 200
     no es un envío hecho; Telegram responde `{ok:true, result:{message_id}}`.
   · Nunca lanza: un Telegram caído es un `fallo` con motivo, no un 500.

   Variables (docs/CONFIGURACION_TOKENS.md § «3.12 · `TELEGRAM_BOT_TOKEN` y `TELEGRAM_CHAT_ID` — el aviso al teléfono por Telegram (opcional, recomendado)»):
     TELEGRAM_BOT_TOKEN  la llave del bot que da @BotFather (obligatoria)
     TELEGRAM_CHAT_ID    el chat del dueño, a donde llegan los avisos (obligatoria)
     TELEGRAM_API_URL    punto final; por defecto el oficial (solo para pruebas)

   LA LLAVE VA EN LA RUTA (`/bot<llave>/sendMessage`), no en una cabecera: así
   la define Telegram. Por eso ningún texto de error lleva la URL, y todo texto
   que viene de fuera pasa por `tacharClave` (el censo de secretos de lib/apu_ocr,
   que ahora incluye TELEGRAM_BOT_TOKEN).

   UN MENSAJE ADMITE 1 A 4.096 CARACTERES (sendMessage, core.telegram.org/bots/api,
   leído el 5-nov-2026). Un aviso más largo se parte en renglones enteros bajo
   MAX_CARACTERES y sale en varios mensajes, en orden; jamás se corta una frase.
   Sin parse_mode: el texto sale tal cual, sin escapar nada que un nombre de
   proceso pudiera romper.
   ========================================================================== */
"use strict";

const URL_DEFECTO = "https://api.telegram.org";
const TIMEOUT_MS = 10000;
/* 4.096 es el tope de Telegram; se deja margen para no rozarlo con caracteres
   que Telegram cuente distinto. */
const MAX_CARACTERES = 4000;
const OBLIGATORIAS = ["TELEGRAM_BOT_TOKEN", "TELEGRAM_CHAT_ID"];

const QUE_HACER = "Cree un bot en Telegram con @BotFather, escríbale un mensaje desde su teléfono y añada en Vercel "
  + "(Settings → Environment Variables → Add New) la llave del bot y el número de su chat; después vuelva a "
  + "desplegar (Deployments → Redeploy), porque las variables de entorno solo entran en despliegues nuevos. "
  + "La guía de configuración de la aplicación trae los pasos uno a uno.";

/* Lo que el despliegue tiene y lo que le falta. NUNCA devuelve la llave: esta
   respuesta viaja hasta la pantalla del dueño. */
function configuracionDeTelegram(env) {
  const e = env || process.env;
  const falta = OBLIGATORIAS.filter((n) => !String(e[n] || "").trim());
  return {
    configurado: falta.length === 0,
    falta,
    que_hacer: falta.length === 0 ? null : QUE_HACER,
  };
}

/* Parte un texto en trozos de como mucho `max` caracteres, por renglones
   enteros. Un renglón solo más largo que `max` (no debería existir: cada aviso
   es una frase) se corta por palabras, y una palabra sola más larga, a la
   fuerza: lo que no se puede es mandar un trozo que Telegram rechace. */
function partirTexto(texto, max = MAX_CARACTERES) {
  const s = String(texto == null ? "" : texto);
  if (s.length <= max) return s.trim() ? [s] : [];
  const trozos = [];
  let actual = "";
  const empujar = (t) => { if (t.trim()) trozos.push(t); };
  const renglones = [];
  for (const r of s.split("\n")) {
    if (r.length <= max) { renglones.push(r); continue; }
    let linea = "";
    for (const p of r.split(" ")) {
      if (p.length > max) {
        if (linea) { renglones.push(linea); linea = ""; }
        /* a la fuerza, pero sin partir un carácter doble (un emoji son dos unidades): si el corte cae entre las dos
           mitades, se corta una antes (revisión adversaria, 5-nov-2026) */
        for (let i = 0; i < p.length;) {
          let j = Math.min(i + max, p.length);
          if (j < p.length && /[\uDC00-\uDFFF]/.test(p[j]) && j - 1 > i) j--;
          renglones.push(p.slice(i, j)); i = j;
        }
        continue;
      }
      const cand = linea ? `${linea} ${p}` : p;
      if (cand.length > max) { renglones.push(linea); linea = p; } else linea = cand;
    }
    if (linea) renglones.push(linea);
  }
  for (const r of renglones) {
    const cand = actual ? `${actual}\n${r}` : r;
    if (cand.length > max) { empujar(actual); actual = r; } else actual = cand;
  }
  empujar(actual);
  return trozos;
}

/* Envía UN aviso (en uno o más mensajes si es largo). Devuelve siempre un objeto
   —jamás lanza—. `fetchImpl` se inyecta en las pruebas (patrón de lib/correo).
   Si un trozo falla, se para ahí y se dice cuántos salieron: el siguiente
   intento manda el aviso entero (quien llama libera la marca del día). */
async function enviarTelegram({ texto }, opciones = {}) {
  const env = opciones.env || process.env;
  const cfg = configuracionDeTelegram(env);
  if (!cfg.configurado) return { ok: false, motivo: `el aviso por Telegram no está configurado: falta ${cfg.falta.join(", ")}`, falta: cfg.falta, que_hacer: cfg.que_hacer };
  const trozos = partirTexto(texto);
  if (!trozos.length) return { ok: false, motivo: "no hay nada que enviar: el aviso está vacío" };

  const fetchImpl = opciones.fetchImpl || globalThis.fetch;
  const timeoutMs = opciones.timeoutMs || TIMEOUT_MS;
  const base = (String(env.TELEGRAM_API_URL || "").trim() || URL_DEFECTO).replace(/\/+$/, "");
  const url = `${base}/bot${String(env.TELEGRAM_BOT_TOKEN).trim()}/sendMessage`;
  const chat = String(env.TELEGRAM_CHAT_ID).trim();
  /* require DIFERIDO: el tachado vive en el módulo del OCR (mismo motivo que lib/correo). */
  const { tacharClave } = require("./apu_ocr.js");
  const ids = [];
  for (let i = 0; i < trozos.length; i++) {
    const enviados = i ? ` (salieron ${i} de ${trozos.length} partes del aviso)` : "";
    let r;
    try {
      r = await fetchImpl(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: chat, text: trozos[i], disable_web_page_preview: true }),
        signal: AbortSignal.timeout ? AbortSignal.timeout(timeoutMs) : undefined,
      });
    } catch (e) {
      return { ok: false, motivo: `no se pudo hablar con Telegram: ${tacharClave((e && e.message) || String(e)).slice(0, 200)}${enviados}`, enviados: i };
    }
    /* EL PARSEO VA APARTE DEL FETCH */
    let cuerpo = "";
    try { cuerpo = await r.text(); } catch { cuerpo = ""; }
    let j = null;
    try { j = JSON.parse(cuerpo); } catch { /* cuerpo no JSON: se reporta abajo */ }
    if (!r.ok) {
      const desc = j && typeof j.description === "string" ? j.description : cuerpo;
      return { ok: false, motivo: `Telegram respondió ${r.status}: ${tacharClave(desc).replace(/\s+/g, " ").slice(0, 200)}${enviados}`, enviados: i };
    }
    if (!j || typeof j !== "object" || j.ok !== true) {
      return { ok: false, motivo: `Telegram respondió ${r.status} y el cuerpo no confirma el envío (${tacharClave(cuerpo).replace(/\s+/g, " ").slice(0, 60)})${enviados}`, enviados: i };
    }
    /* El número del mensaje es lo único que se guarda; si no viene, el envío
       salió igual y se dice null, jamás una cadena vacía que parezca un número. */
    const mid = j.result && (typeof j.result.message_id === "number" || typeof j.result.message_id === "string") ? j.result.message_id : null;
    ids.push(mid);
  }
  return { ok: true, id: ids[0] ?? null, mensajes: trozos.length, ids };
}

/* LOS CHATS QUE LE ESCRIBIERON AL BOT, para que el dueño copie el suyo sin armar
   a mano una dirección con su llave. Telegram guarda los mensajes que recibe el
   bot «not … longer than 24 hours» hasta que alguien los pide (getUpdates,
   core.telegram.org/bots/api, leído el 5-nov-2026): el dueño escribe al bot y
   en las 24 h siguientes pega `/api/avisos?telegram=chat`. Solo hace falta la
   llave. No marca nada como leído (sin `offset`): pedirlo dos veces da lo mismo.
   Devuelve {ok, chats:[{chat_id, nombre, tipo}]} o {ok:false, motivo}. */
async function chatsRecientes(opciones = {}) {
  const env = opciones.env || process.env;
  const llave = String(env.TELEGRAM_BOT_TOKEN || "").trim();
  if (!llave) return { ok: false, motivo: "falta TELEGRAM_BOT_TOKEN: sin la llave del bot no se puede preguntar quién le escribió", falta: ["TELEGRAM_BOT_TOKEN"], que_hacer: QUE_HACER };
  const fetchImpl = opciones.fetchImpl || globalThis.fetch;
  const base = (String(env.TELEGRAM_API_URL || "").trim() || URL_DEFECTO).replace(/\/+$/, "");
  const { tacharClave } = require("./apu_ocr.js");
  let r;
  try {
    r = await fetchImpl(`${base}/bot${llave}/getUpdates`, { method: "GET", signal: AbortSignal.timeout ? AbortSignal.timeout(opciones.timeoutMs || TIMEOUT_MS) : undefined });
  } catch (e) {
    return { ok: false, motivo: `no se pudo hablar con Telegram: ${tacharClave((e && e.message) || String(e)).slice(0, 200)}` };
  }
  let cuerpo = "";
  try { cuerpo = await r.text(); } catch { cuerpo = ""; }
  let j = null;
  try { j = JSON.parse(cuerpo); } catch { /* se reporta abajo */ }
  if (!r.ok) return { ok: false, motivo: `Telegram respondió ${r.status}: ${tacharClave(j && j.description ? j.description : cuerpo).replace(/\s+/g, " ").slice(0, 200)}` };
  if (!j || j.ok !== true || !Array.isArray(j.result)) return { ok: false, motivo: `Telegram respondió ${r.status} y el cuerpo no es la lista de mensajes (${tacharClave(cuerpo).replace(/\s+/g, " ").slice(0, 60)})` };
  const vistos = new Map();
  for (const u of j.result) {
    const m = u && (u.message || u.edited_message || u.channel_post);
    const c = m && m.chat;
    if (!c || (typeof c.id !== "number" && typeof c.id !== "string")) continue;
    const nombre = [c.first_name, c.last_name].filter(Boolean).join(" ") || c.title || c.username || null;
    vistos.set(String(c.id), { chat_id: String(c.id), nombre, tipo: c.type || null });
  }
  return { ok: true, chats: [...vistos.values()] };
}

module.exports = { configuracionDeTelegram, enviarTelegram, partirTexto, chatsRecientes, URL_DEFECTO, OBLIGATORIAS, QUE_HACER, MAX_CARACTERES };
