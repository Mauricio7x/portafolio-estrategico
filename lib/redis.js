/* ============================================================================
   lib/redis · Cliente compartido de Upstash Redis (capa gratuita) — sin SDK
   ----------------------------------------------------------------------------
   Punto ÚNICO de acceso a Redis para toda la app (almacén del extractor,
   /api/sync, /api/procesos, api/cron, scripts/). Habla el protocolo REST de
   Upstash directamente (POST del comando como array JSON), que es el mismo
   que usaba "Vercel KV" (era Upstash por debajo): por eso NO hace falta el
   SDK @upstash/redis ni un package.json — el proyecto se mantiene sin
   dependencias ni paso de build, y el tier gratuito de Upstash funciona
   tal cual.

   Variables de entorno (en este orden de preferencia):
     UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN   ← canónicas (consola
                                                            gratuita de Upstash)
     KV_REST_API_URL / KV_REST_API_TOKEN                 ← respaldo (despliegues
                                                            antiguos con Vercel KV
                                                            o el marketplace)

   Límites del tier gratuito que esta capa respeta:
     · ≤ 1 MB por valor  → los chunks se comprimen gzip+base64 en lib/almacen.js
       y el empaquetador parte por debajo de 800 KB (margen de request REST).
     · ~10 000 comandos/día → cada instancia lleva un CONTADOR de comandos
       (`comandos()`) que /api/sync reporta en su respuesta para vigilar el
       consumo. Presupuesto real medido: carga completa ≈ cientos de comandos
       (una vez), delta ≈ decenas, radar frío ≈ 15-25 (MGET cuenta como 1).
   ========================================================================== */
"use strict";

function credenciales(env) {
  const e = env || process.env;
  const url = e.UPSTASH_REDIS_REST_URL || e.KV_REST_API_URL || "";
  const token = e.UPSTASH_REDIS_REST_TOKEN || e.KV_REST_API_TOKEN || "";
  return url && token ? { url, token } : null;
}

function hayCredenciales(env) { return credenciales(env) !== null; }

/* Cliente mínimo con la misma superficie que usaba la capa KV. Cada método
   ejecuta UN comando REST; no hay pipelines implícitos que multipliquen el
   consumo del tier gratuito. */
function crearRedis(opts = {}) {
  const cred = (opts.url && opts.token) ? { url: opts.url, token: opts.token } : credenciales(opts.env);
  if (!cred) throw new Error("Upstash Redis: faltan UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN (ver lib/README.md)");
  const fetchImpl = opts.fetchImpl || globalThis.fetch;
  let nComandos = 0;

  async function cmd(arr) {
    nComandos++;
    const r = await fetchImpl(cred.url, {
      method: "POST",
      headers: { Authorization: `Bearer ${cred.token}`, "Content-Type": "application/json" },
      body: JSON.stringify(arr),
    });
    if (!r.ok) {
      // incluir el cuerpo: Upstash explica ahí la causa real (p.ej.
      // "ERR max request size exceeded" o cuota de almacenamiento llena)
      let detalle = ""; try { detalle = (await r.text()).slice(0, 200); } catch (e) { /* sin cuerpo */ }
      throw new Error(`Upstash ${r.status}${detalle ? ": " + detalle : ""}`);
    }
    const j = await r.json();
    if (j && j.error) throw new Error(`Upstash: ${j.error}`);
    return j.result;
  }

  return {
    // básicos (los que usa el almacén del extractor)
    get: (k) => cmd(["GET", k]),
    set: (k, v, o = {}) => {
      const extra = [];
      if (o.nx) extra.push("NX");
      if (o.ex) extra.push("EX", String(o.ex));
      return cmd(["SET", k, String(v), ...extra]);
    },
    del: (...ks) => cmd(["DEL", ...ks]),
    mget: (ks) => (ks.length ? cmd(["MGET", ...ks]) : Promise.resolve([])),
    exists: (k) => cmd(["EXISTS", k]),
    expire: (k, seg) => cmd(["EXPIRE", k, String(seg)]),
    // sets (los que usa api/cron para los IDs ya avisados)
    sadd: (k, m) => cmd(["SADD", k, m]),
    sismember: (k, m) => cmd(["SISMEMBER", k, m]),
    // hashes (por compatibilidad de superficie; hoy sin uso interno)
    hset: (k, campo, v) => cmd(["HSET", k, campo, String(v)]),
    hget: (k, campo) => cmd(["HGET", k, campo]),
    hgetall: (k) => cmd(["HGETALL", k]),
    // telemetría del tier gratuito
    comandos: () => nComandos,
    _cmd: cmd, // escotilla para comandos no cubiertos
  };
}

module.exports = { credenciales, hayCredenciales, crearRedis };
