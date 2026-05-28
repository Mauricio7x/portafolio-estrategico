// ============================================================================
//  Detecta · Autenticación del lado servidor (Vercel)
//  Sustituye el "candado de cartón" del cliente. La contraseña vive en una
//  variable de entorno secreta; el navegador nunca la conoce ni la valida.
//
//  Configura en Vercel → Settings → Environment Variables:
//     APP_PASSWORD = <tu contraseña de acceso>
//     SESSION_SECRET = <cadena larga aleatoria, ej. 48+ caracteres>
//
//  Flujo:
//   POST /api/auth   { password }      → si ok, set-cookie de sesión firmada
//   GET  /api/auth                     → { authenticated: true|false }
// ============================================================================

import crypto from "crypto";

const COOKIE = "detecta_session";
const MAX_AGE = 60 * 60 * 8; // 8 horas

function sign(value, secret) {
  const h = crypto.createHmac("sha256", secret).update(value).digest("hex");
  return value + "." + h;
}
function verify(token, secret) {
  if (!token || token.indexOf(".") < 0) return false;
  const i = token.lastIndexOf(".");
  const value = token.slice(0, i);
  const expected = sign(value, secret);
  // comparación en tiempo constante
  const a = Buffer.from(token);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  if (!crypto.timingSafeEqual(a, b)) return false;
  const exp = parseInt(value.split("|")[1] || "0", 10);
  return Date.now() < exp;
}
function readCookie(req, name) {
  const raw = req.headers.cookie || "";
  const found = raw.split(";").map(c => c.trim()).find(c => c.startsWith(name + "="));
  return found ? decodeURIComponent(found.slice(name.length + 1)) : null;
}

export default async function handler(req, res) {
  const secret = process.env.SESSION_SECRET || "";
  const password = process.env.APP_PASSWORD || "";

  if (req.method === "GET") {
    const token = readCookie(req, COOKIE);
    const ok = !!secret && verify(token, secret);
    res.status(200).json({ authenticated: ok });
    return;
  }

  if (req.method === "POST") {
    if (!secret || !password) {
      res.status(500).json({ error: "Servidor sin APP_PASSWORD/SESSION_SECRET configurados" });
      return;
    }
    let body = req.body;
    if (typeof body === "string") { try { body = JSON.parse(body); } catch { body = {}; } }
    const attempt = (body && body.password) || "";

    // comparación en tiempo constante para no filtrar longitud por timing
    const a = Buffer.from(String(attempt));
    const b = Buffer.from(String(password));
    const match = a.length === b.length && crypto.timingSafeEqual(a, b);

    if (!match) {
      res.status(401).json({ authenticated: false });
      return;
    }
    const exp = Date.now() + MAX_AGE * 1000;
    const value = "ok|" + exp;
    const token = sign(value, secret);
    res.setHeader("Set-Cookie",
      `${COOKIE}=${encodeURIComponent(token)}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${MAX_AGE}`);
    res.status(200).json({ authenticated: true });
    return;
  }

  res.status(405).json({ error: "Método no permitido" });
}
