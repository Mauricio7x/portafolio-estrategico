/* ════════════════════════════════════════════════════════════════
   Detecta · Service Worker (PWA) — capa aditiva, todo gratis.
   Objetivo: instalar "Detecta" como app y dejar el ÚLTIMO RADAR
   disponible sin conexión. El app-shell (index.html + ícono +
   manifest) se sirve desde caché; los datos de SECOP/GDELT siempre
   van a la red (el navegador guarda el último radar en localStorage,
   no aquí, para no cachear datos sensibles ni respuestas opacas).

   Estrategia:
   - navegación (HTML)        → network-first, con respaldo al shell.
   - estáticos same-origin    → stale-while-revalidate.
   - /api/* y orígenes cruzados (datos.gov.co, GDELT, unpkg, CDNs,
     fuentes de Google)       → solo red (sin cachear).
   Si algo falla, degrada con gracia: la app ya tolera la red caída.
   ════════════════════════════════════════════════════════════════ */
"use strict";

const VERSION = "detecta-v4-2026-06";
const SHELL_CACHE = "detecta-shell-" + VERSION;
const SHELL_ASSETS = ["./", "./index.html", "./manifest.webmanifest", "./icon.svg"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE)
      .then((cache) => cache.addAll(SHELL_ASSETS))
      .catch(() => {})           // un asset que falte no debe abortar la instalación
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((k) => k.startsWith("detecta-shell-") && k !== SHELL_CACHE)
            .map((k) => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

function isShellRequest(url) {
  // Mismo origen y ruta del propio app-shell (no /api/*).
  return url.origin === self.location.origin && !url.pathname.startsWith("/api/");
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;                 // POST a /api, etc.: directo a la red

  let url;
  try { url = new URL(req.url); } catch (e) { return; }

  // Solo gestionamos el app-shell same-origin. Lo demás (SECOP, GDELT,
  // CDNs) pasa a la red sin que el SW intervenga.
  if (!isShellRequest(url)) return;

  // Navegaciones (abrir la app): red primero, respaldo al shell cacheado.
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(SHELL_CACHE).then((c) => c.put("./index.html", copy)).catch(() => {});
          return res;
        })
        .catch(() => caches.match("./index.html").then((r) => r || caches.match("./")))
    );
    return;
  }

  // Estáticos del shell: responde de caché y refresca en segundo plano.
  event.respondWith(
    caches.match(req).then((cached) => {
      const network = fetch(req)
        .then((res) => {
          if (res && res.ok) {
            const copy = res.clone();
            caches.open(SHELL_CACHE).then((c) => c.put(req, copy)).catch(() => {});
          }
          return res;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});
