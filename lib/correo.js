/* ============================================================================
   lib/correo · Transporte de correo por REST — sin SDK, sin dependencias
   ----------------------------------------------------------------------------
   Mismo patrón que lib/redis.js: `fetch` nativo, credencial y punto final en
   variables de entorno, el PARSEO DEL JSON APARTE DEL FETCH (el muro del edge y
   un proxy caído responden HTML con 200) y un tiempo de espera por llamada.

   Variables (docs/CONFIGURACION_TOKENS.md §3.8):
     CORREO_API_KEY     clave del proveedor de correo (obligatoria)
     CORREO_REMITENTE   dirección DESDE la que sale el aviso (obligatoria: el
                        proveedor solo deja enviar desde un dominio verificado
                        y esa dirección no se puede adivinar desde aquí)
     CORREO_DESTINO     dirección A LA QUE llega el aviso (obligatoria mientras
                        el perfil no tenga campo de correo)
     CORREO_API_URL     punto final del proveedor; por defecto el de Resend

   FALTA ≠ FALLO. Sin las tres variables no se lanza ninguna excepción y no se
   responde 500: `configuracionDeCorreo()` devuelve QUÉ falta y QUÉ HACER, y
   quien llama lo publica. Un aviso que no está configurado es una tarea
   pendiente del dueño, no un error del servidor.

   El cuerpo de error del proveedor se le enseña al dueño porque es el único
   diagnóstico útil cuando algo falla, pero lo escribe un tercero a partir de
   una petición que LLEVA la clave: pasa por `tacharClave` (el censo de secretos
   del entorno de lib/apu_ocr), como el registro de fallo de la sincronización.
   ========================================================================== */
"use strict";

/* Resend: POST con Authorization: Bearer y cuerpo {from,to,subject,text,html}.
   Se elige por tener el REST más corto de los proveedores transaccionales y un
   plan gratuito; el precio y el cupo NO se afirman aquí (no se pudo abrir
   ninguna página de precios desde este entorno el 6-sep-2026: el proxy responde
   403) — los confirma el dueño en la página del proveedor. */
const URL_DEFECTO = "https://api.resend.com/emails";
const TIMEOUT_MS = 10000;

const OBLIGATORIAS = ["CORREO_API_KEY", "CORREO_REMITENTE", "CORREO_DESTINO"];

const QUE_HACER = "Dé de alta un proveedor de correo, cree una clave de interfaz y añádala en Vercel "
  + "(Settings → Environment Variables → Add New) junto con la dirección desde la que sale el aviso y "
  + "la dirección a la que debe llegar; después vuelva a desplegar (Deployments → Redeploy), porque "
  + "las variables de entorno solo entran en despliegues nuevos. La guía de configuración de la "
  + "aplicación trae los pasos uno a uno.";

/* Lo que el despliegue tiene y lo que le falta. NUNCA devuelve la clave: esta
   respuesta viaja hasta la pantalla del dueño. */
function configuracionDeCorreo(env) {
  const e = env || process.env;
  const falta = OBLIGATORIAS.filter((n) => !String(e[n] || "").trim());
  return {
    configurado: falta.length === 0,
    falta,
    que_hacer: falta.length === 0 ? null : QUE_HACER,
    url: String(e.CORREO_API_URL || "").trim() || URL_DEFECTO,
    remitente: String(e.CORREO_REMITENTE || "").trim() || null,
    destino: String(e.CORREO_DESTINO || "").trim() || null,
  };
}

/* Envía UN correo. Devuelve siempre un objeto —jamás lanza— para que un
   proveedor caído sea un `fallo` con motivo en la respuesta de la op y no un
   500 sin cuerpo. `fetchImpl` se inyecta en las pruebas (patrón de lib/redis). */
async function enviarCorreo({ para, asunto, texto, html }, opciones = {}) {
  const env = opciones.env || process.env;
  const cfg = configuracionDeCorreo(env);
  if (!cfg.configurado) return { ok: false, motivo: `el aviso por correo no está configurado: falta ${cfg.falta.join(", ")}`, falta: cfg.falta, que_hacer: cfg.que_hacer };
  const destino = String(para || cfg.destino || "").trim();
  if (!destino) return { ok: false, motivo: "no hay dirección de destino", falta: ["CORREO_DESTINO"], que_hacer: cfg.que_hacer };

  const fetchImpl = opciones.fetchImpl || globalThis.fetch;
  const timeoutMs = opciones.timeoutMs || TIMEOUT_MS;
  /* require DIFERIDO: el tachado vive en el módulo del OCR y cargarlo en la
     cabecera arrastraría el lector de imágenes a cada envío. */
  const { tacharClave } = require("./apu_ocr.js");
  let r;
  try {
    r = await fetchImpl(cfg.url, {
      method: "POST",
      headers: { Authorization: `Bearer ${String(env.CORREO_API_KEY).trim()}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: cfg.remitente, to: [destino], subject: asunto, text: texto, ...(html ? { html } : {}) }),
      signal: AbortSignal.timeout ? AbortSignal.timeout(timeoutMs) : undefined,
    });
  } catch (e) {
    return { ok: false, motivo: `no se pudo hablar con el proveedor de correo: ${tacharClave((e && e.message) || String(e)).slice(0, 200)}` };
  }
  /* EL PARSEO VA APARTE DEL FETCH: un 200 con HTML no es un envío hecho. */
  let cuerpo = "";
  try { cuerpo = await r.text(); } catch { cuerpo = ""; }
  let j = null;
  try { j = JSON.parse(cuerpo); } catch { /* cuerpo no JSON: se reporta abajo */ }
  if (!r.ok) return { ok: false, motivo: `el proveedor de correo respondió ${r.status}: ${tacharClave(cuerpo).replace(/\s+/g, " ").slice(0, 200)}` };
  if (!j || typeof j !== "object") return { ok: false, motivo: `el proveedor de correo respondió ${r.status} y el cuerpo no es una respuesta legible (${tacharClave(cuerpo).replace(/\s+/g, " ").slice(0, 60)})` };
  /* El identificador del envío es lo único que se guarda del proveedor; si no
     lo manda, el envío igual salió y se dice `null`, jamás una cadena vacía
     que parezca un identificador. */
  return { ok: true, id: typeof j.id === "string" && j.id ? j.id : null };
}

module.exports = { configuracionDeCorreo, enviarCorreo, URL_DEFECTO, OBLIGATORIAS, QUE_HACER };
