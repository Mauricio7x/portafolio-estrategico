/* ============================================================================
   tests/servidor_local · PLAN B DE PLATAFORMA: los seis routers reales, fuera
   de Vercel, con el http nativo
   ----------------------------------------------------------------------------
   QUÉ DEMUESTRA Y QUÉ NO. Demuestra que el código de este repositorio no está
   atado a Vercel: los seis routers de `api/` corren tal cual sobre
   `http.createServer`, y lo único que Vercel aporta a la petición son cuatro
   cosas que caben aquí — `req.query` (la URL parseada), `res.status(n)`
   encadenable, `res.json(objeto)` y `res.send(texto)`—. NO cambia el
   despliegue: producción sigue en Vercel. Es un ensayo con fecha, para que el
   día de un corte largo del proveedor la respuesta sea «se levanta con esto»
   y no «habría que ver».
   Vive en `tests/` y NO en `api/`: la suite fija en SEIS el número de archivos
   de `api/`, y un séptimo —aunque fuera una herramienta— rompería esa cuenta y
   además Vercel lo desplegaría como una función más.

   LO QUE SÍ HACE
   · Despacha `/api/<dominio>` a `require("../api/<dominio>.js")` con la MISMA
     firma (`handler(req, res)`): ni un cambio en los handlers.
   · Aplica los rewrites LEÍDOS DE `vercel.json`, no una copia: dos listas
     «iguales hoy» divergen a la primera corrección, y aquí la que manda es la
     del despliegue. Soporta el comodín `:parametro` que usan `/api/apu/:accion`
     y compañía.
   · Sirve `public/` como sitio estático, con la raíz en `index.html`.

   LO QUE NO HACE, Y HAY QUE SABERLO ANTES DE LEVANTARLO EN UN APURO
   · No hay CRON: los dos de `vercel.json` (`/api/sync` a las 8:30 y
     `/api/avisos` a las 11:00, hora de Vercel) hay que dispararlos desde
     fuera con las mismas URL. Sin eso el corpus no se actualiza solo.
   · No hay protección por contraseña del proveedor ni cabeceras de seguridad:
     las de `vercel.json` (`headers`) no se aplican aquí.
   · Las variables de entorno son las mismas (Upstash, HISTORICO_TOKEN…): sin
     ellas los routers responden 503 con su instrucción, como en producción.
   ========================================================================== */
"use strict";

const http = require("http");
const fs = require("fs");
const path = require("path");

const RAIZ = path.join(__dirname, "..");
const DOMINIOS = ["procesos", "inteligencia", "perfil", "admin", "apu", "pliego"];
const MIME = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8", ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml", ".png": "image/png", ".ico": "image/x-icon",
  ".woff2": "font/woff2", ".txt": "text/plain; charset=utf-8",
};

/* Los rewrites del despliegue, tal como están escritos en vercel.json. Cada
   `source` puede llevar `:parametro`, que se sustituye en el `destination`. */
function rewritesDeVercel(archivo = path.join(RAIZ, "vercel.json")) {
  const j = JSON.parse(fs.readFileSync(archivo, "utf8"));
  return (j.rewrites || []).map((r) => {
    const nombres = [];
    const patron = String(r.source).replace(/[.+*?^${}()|[\]\\]/g, "\\$&")
      .replace(/:([A-Za-z_][\w]*)/g, (_, n) => { nombres.push(n); return "([^/]+)"; });
    return { re: new RegExp(`^${patron}$`), nombres, destino: String(r.destination) };
  });
}

/* Devuelve la URL de destino (con su query) o null si ningún rewrite casa. */
function aplicarRewrites(ruta, rewrites) {
  for (const r of rewrites) {
    const m = r.re.exec(ruta);
    if (!m) continue;
    let destino = r.destino;
    r.nombres.forEach((n, i) => { destino = destino.split(`:${n}`).join(m[i + 1]); });
    return destino;
  }
  return null;
}

/* Lo único que Vercel añade al `res` de Node. `req` se deja INTACTO (es un
   stream de verdad, que es lo que `lib/cuerpo.leerCuerpo` sabe leer) y solo
   se le cuelga `query`. */
function adaptar(req, res, url) {
  req.query = Object.fromEntries(url.searchParams);
  let codigo = 200;
  res.status = (n) => { codigo = n; return res; };
  res.json = (o) => {
    const cuerpo = JSON.stringify(o);
    res.writeHead(codigo, { "Content-Type": "application/json; charset=utf-8" });
    res.end(cuerpo);
  };
  res.send = (cuerpo) => { res.writeHead(codigo); res.end(cuerpo); };
  return req.query;
}

function crearServidor({ raiz = RAIZ, rewrites = rewritesDeVercel() } = {}) {
  const publico = path.join(raiz, "public");
  return http.createServer(async (req, res) => {
    let url;
    try { url = new URL(req.url, "http://localhost"); } catch { res.writeHead(400); return res.end("URL inválida"); }
    let ruta = url.pathname;
    const reescrito = aplicarRewrites(ruta, rewrites);
    if (reescrito) {
      /* la query ORIGINAL se conserva y el destino solo AÑADE la suya: si se
         sustituyera la URL entera, `/api/oportunidades?perfil=…&pagina=2` —una
         ruta pública documentada— llegaría a op=listar sin un solo filtro. Lo
         que el rewrite fija (`op`) gana, como en el despliegue. */
      const destino = new URL(reescrito, "http://localhost");
      for (const [k, v] of url.searchParams) if (!destino.searchParams.has(k)) destino.searchParams.append(k, v);
      url = destino; ruta = url.pathname;
    }
    const m = /^\/api\/([a-z]+)(?:\/([a-z0-9-]+))?$/.exec(ruta);
    if (m && DOMINIOS.includes(m[1])) {
      const q = adaptar(req, res, url);
      // `/api/perfil/pulso` (sin ?op=) es la forma que los routers ya resuelven
      // por `req.url`; se conserva tal cual y solo se completa `op` si falta
      if (m[2] && !q.op) q.op = m[2];
      try {
        await require(path.join(raiz, "api", `${m[1]}.js`))(req, res);
      } catch (e) {
        if (!res.headersSent) { res.writeHead(500, { "Content-Type": "application/json; charset=utf-8" }); res.end(JSON.stringify({ ok: false, error: "Fallo del servidor local", detalle: String((e && e.message) || e).slice(0, 200) })); }
      }
      return;
    }
    if (ruta.startsWith("/api/")) { res.writeHead(404, { "Content-Type": "application/json; charset=utf-8" }); return res.end(JSON.stringify({ ok: false, error: `No hay ruta ${ruta}. Los dominios son: ${DOMINIOS.join(", ")}.` })); }
    /* estático: la raíz es index.html y ningún camino puede salir de public/.
       El camino se DECODIFICA antes de resolver (si no, un archivo con un
       espacio no se encontraría nunca) y por eso la guarda es imprescindible:
       decodificar es lo que vuelve alcanzable un `%2e%2e` de subida. */
    let pedido;
    try { pedido = decodeURIComponent(ruta); } catch { res.writeHead(400); return res.end("Camino inválido"); }
    const archivo = path.resolve(publico, `.${pedido === "/" ? "/index.html" : pedido}`);
    if (!archivo.startsWith(publico + path.sep) || !fs.existsSync(archivo) || fs.statSync(archivo).isDirectory()) { res.writeHead(404); return res.end("No encontrado"); }
    res.writeHead(200, { "Content-Type": MIME[path.extname(archivo)] || "application/octet-stream" });
    res.end(fs.readFileSync(archivo));
  });
}

module.exports = { crearServidor, rewritesDeVercel, aplicarRewrites, adaptar, DOMINIOS };

/* Como herramienta: `node tests/servidor_local.js` (PORT o 3000). */
if (require.main === module) {
  const puerto = Number(process.env.PORT || 3000);
  crearServidor().listen(puerto, () => {
    console.log(`Detekta en http://127.0.0.1:${puerto} · ${DOMINIOS.length} routers · sin cron: dispare /api/sync y /api/avisos desde fuera.`);
  });
}
