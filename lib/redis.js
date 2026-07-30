/* ============================================================================
   lib/redis · Cliente mínimo de Upstash Redis vía API REST — sin SDK ni deps
   ----------------------------------------------------------------------------
   Un solo punto de acceso a Redis para toda la app. Habla el protocolo REST
   de Upstash directamente (POST del comando como array JSON con Bearer token),
   así el proyecto se mantiene sin package.json, sin dependencias y sin build.

   Variables de entorno (en orden de preferencia):
     UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN   ← canónicas
     KV_REST_API_URL / KV_REST_API_TOKEN                 ← respaldo legado

   Límites del tier gratuito de Upstash que esta capa respeta:
     · ≤ 1 MB por valor → los chunks se comprimen (zlib.deflate) y se parten
       a ≤ 500 KB comprimidos ANTES del base64 (≈ 667 KB en el request REST).
     · Presupuesto de comandos → contador `comandos()` que /api/sync reporta;
       MGET/DEL de N claves cuentan como 1 comando cada uno.
   ========================================================================== */
"use strict";

function credenciales(env) {
  const e = env || process.env;
  const url = e.UPSTASH_REDIS_REST_URL || e.KV_REST_API_URL || "";
  const token = e.UPSTASH_REDIS_REST_TOKEN || e.KV_REST_API_TOKEN || "";
  return url && token ? { url: url.replace(/\/+$/, ""), token } : null;
}

function hayCredenciales(env) { return credenciales(env) !== null; }

function crearRedis(opts = {}) {
  const cred = (opts.url && opts.token) ? { url: opts.url.replace(/\/+$/, ""), token: opts.token } : credenciales(opts.env);
  if (!cred) throw new Error("Upstash Redis: faltan UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN");
  const fetchImpl = opts.fetchImpl || globalThis.fetch;
  let nComandos = 0;

  async function cmd(arr) {
    nComandos++;
    const r = await fetchImpl(cred.url, {
      method: "POST",
      headers: { Authorization: `Bearer ${cred.token}`, "Content-Type": "application/json" },
      body: JSON.stringify(arr.map(String)),
    });
    let j = null;
    try { j = await r.json(); } catch { /* cuerpo no-JSON: se reporta por status */ }
    if (!r.ok) throw new Error(`Upstash ${r.status}${j && j.error ? `: ${j.error}` : ""}`);
    if (j && j.error) throw new Error(`Upstash: ${j.error}`);
    return j ? j.result : null;
  }

  return {
    get: (k) => cmd(["GET", k]),
    /* set con opciones: { nx:true, ex:segundos } — SET k v NX EX n.
       Devuelve "OK" si escribió, null si NX no aplicó. */
    set: (k, v, o = {}) => {
      const extra = [];
      if (o.nx) extra.push("NX");
      if (o.ex) extra.push("EX", String(o.ex));
      return cmd(["SET", k, String(v), ...extra]);
    },
    del: (...ks) => (ks.length ? cmd(["DEL", ...ks]) : Promise.resolve(0)),
    mget: (ks) => (ks.length ? cmd(["MGET", ...ks]) : Promise.resolve([])),
    exists: (k) => cmd(["EXISTS", k]),
    /* SCAN completo: itera el cursor hasta agotarlo y devuelve TODAS las
       claves que casan con el patrón. COUNT alto para pocas rondas. */
    scan: async (patron) => {
      const claves = [];
      let cursor = "0";
      do {
        const r = await cmd(["SCAN", cursor, "MATCH", patron, "COUNT", "1000"]);
        cursor = String(r[0]);
        for (const k of r[1] || []) claves.push(k);
      } while (cursor !== "0");
      return claves;
    },
    comandos: () => nComandos,
    _cmd: cmd, // escotilla para comandos no cubiertos
  };
}

module.exports = { credenciales, hayCredenciales, crearRedis };
