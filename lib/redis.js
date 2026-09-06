/* ============================================================================
   lib/redis · Cliente mínimo de Upstash Redis vía API REST — sin SDK ni deps
   ----------------------------------------------------------------------------
   Un solo punto de acceso a Redis para toda la app. Habla el protocolo REST
   de Upstash directamente (POST del comando como array JSON con Bearer token),
   así el proyecto se mantiene sin package.json, sin dependencias y sin build.

   Variables de entorno (en orden de preferencia):
     UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN   ← canónicas
     KV_REST_API_URL / KV_REST_API_TOKEN                 ← respaldo legado

   Límites que esta capa respeta (corregidos el 6-sep-2026, M-INF-14: el
   «≤ 1 MB por valor» que decía aquí ya no existe):
     · Upstash admite 10 MB por petición y 100 MB por registro (documentación
       primaria leída en la consultoría del 4-sep-2026; no releída desde aquí
       el 6-sep: proxy 403). Los chunks se comprimen (zlib.deflate) y se parten
       a ≤ 500 KB comprimidos ANTES del base64 (≈ 667 KB en el request REST)
       porque lo que de verdad acota el chunk es la RESPUESTA de una función
       de Vercel, que se corta en 4,5 MB (lib/cuerpo.js): 500 KB deja margen.
     · Presupuesto de comandos → contador `comandos()` que /api/sync reporta;
       MGET/DEL de N claves cuentan como 1 comando cada uno.
   ========================================================================== */
"use strict";

/* Tope por comando: Upstash responde en decenas de ms; diez segundos es «algo
   está roto», no latencia. Se ajusta con la métrica de op=salud (M-INF-04). */
const TIMEOUT_MS = 10000;

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
  /* TIEMPO DE ESPERA POR COMANDO (6-sep-2026, M-INF-08). Sin `signal`, una
     conexión que Upstash acepta y nunca responde vivía hasta el maxDuration de
     la función (300 s en procesos y pliego): la lista tardaba cinco minutos y
     terminaba en el mensaje de la contraseña. El tope se anota aquí y no se
     reintenta: los llamadores ya tratan la excepción como «Redis: …» 502/503. */
  const timeoutMs = opts.timeoutMs || TIMEOUT_MS;
  let nComandos = 0;

  async function cmd(arr) {
    nComandos++;
    const r = await fetchImpl(cred.url, {
      method: "POST",
      headers: { Authorization: `Bearer ${cred.token}`, "Content-Type": "application/json" },
      body: JSON.stringify(arr.map(String)),
      signal: AbortSignal.timeout ? AbortSignal.timeout(timeoutMs) : undefined,
    });
    /* EL PARSEO VA APARTE DEL FETCH, y un 200 sin JSON NO es «clave inexistente».
       El muro del edge y un proxy caído responden HTML con 200: antes `get()`
       devolvía null («no hay meta» → una full innecesaria) y `scan()` lanzaba un
       TypeError sin decir qué llegó. El cuerpo se lee UNA vez como texto y se
       parsea aparte; lo que no es JSON se dice con sus primeros 40 caracteres. */
    let texto = "";
    try { texto = await r.text(); } catch { texto = ""; }
    let j = null, esJson = false;
    try { j = JSON.parse(texto); esJson = true; } catch { /* cuerpo no-JSON: se reporta abajo */ }
    if (!r.ok) throw new Error(`Upstash ${r.status}${j && j.error ? `: ${j.error}` : ""}`);
    if (!esJson || j === null || typeof j !== "object") {
      throw new Error(`Upstash: respuesta no JSON (${String(texto).replace(/\s+/g, " ").slice(0, 40)})`);
    }
    if (j.error) throw new Error(`Upstash: ${j.error}`);
    return j.result;
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
    /* TTL en segundos: -1 sin expiración, -2 si la clave no existe. Sirve para
       decir «el candado se libera solo en N s» sin tener que adivinarlo. */
    ttl: (k) => cmd(["TTL", k]),
    /* EXPIRE en segundos sobre una clave ya escrita: es la única forma de poner
       TTL a un HASH (HSET no admite EX). Devuelve 1 si la clave existía, 0 si no. */
    expire: (k, segundos) => cmd(["EXPIRE", k, String(segundos)]),
    /* HSET de un objeto {campo: valor} en un solo comando. Los valores no
       string se serializan a JSON (el índice de competencia guarda objetos). */
    hset: (k, pares) => {
      const plano = [];
      for (const [campo, valor] of Object.entries(pares)) {
        plano.push(campo, typeof valor === "string" ? valor : JSON.stringify(valor));
      }
      return plano.length ? cmd(["HSET", k, ...plano]) : Promise.resolve(0);
    },
    /* HGETALL normalizado a objeto: Upstash devuelve el array plano
       [campo, valor, campo, valor…] (algunos despliegues ya devuelven objeto). */
    hgetall: async (k) => {
      const r = await cmd(["HGETALL", k]);
      if (!r) return {};
      if (!Array.isArray(r)) return r;
      const o = {};
      for (let i = 0; i < r.length; i += 2) o[r[i]] = r[i + 1];
      return o;
    },
    hget: (k, campo) => cmd(["HGET", k, campo]),
    hlen: (k) => cmd(["HLEN", k]),
    /* Swap atómico: el índice se construye en una clave temporal y se renombra
       encima de la vigente, así jamás hay una ventana sin índice. */
    rename: (de, a) => cmd(["RENAME", de, a]),
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

module.exports = { credenciales, hayCredenciales, crearRedis, TIMEOUT_MS };
