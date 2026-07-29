/* ============================================================================
   lib/almacen · Adaptadores de persistencia para la capa de extracción SECOP
   ----------------------------------------------------------------------------
   Tres implementaciones con la MISMA interfaz, para que el extractor no sepa
   dónde vive la caché:

     - AlmacenKV      → Upstash Redis (capa GRATUITA) vía el cliente REST
                        compartido lib/redis.js. Sin dependencias npm.
     - AlmacenArchivo → un único JSON en disco (desarrollo local / respaldo).
     - AlmacenMemoria → Map en memoria (tests).

   Esquema de claves (prefijo detecta:x:):
     detecta:x:meta                     JSON {last_sync,last_full,total,porMes,auditoria}
     detecta:x:progreso                 JSON progreso de paginación (reanudable)
     detecta:x:mes:{YYYY-MM}:manifest   JSON {chunks,count,updatedAt}
     detecta:x:mes:{YYYY-MM}:chunk:{i}  base64(gzip(JSON[registros]))
     detecta:x:incidencias              JSON [ {ts,nivel,msg,ctx} ] (cap 200)

   Los chunks van comprimidos porque el valor máximo de KV en el tier gratuito
   es 1 MB: un mes de SECOP II puede superar los 50 MB en JSON plano, pero
   gzip+base64 de la proyección de campos rinde ~8-12x, y el empaquetador
   parte cada chunk hasta quedar bajo el límite (ver extractor.empaquetar).
   ========================================================================== */
"use strict";

const zlib = require("zlib");

const PREFIJO = "detecta:x:";
const MAX_INCIDENCIAS = 200;

/* ---------- utilidades de compresión (compartidas) ---------- */
function comprimir(obj) {
  return zlib.gzipSync(Buffer.from(JSON.stringify(obj), "utf8")).toString("base64");
}
function descomprimir(b64) {
  if (b64 == null) return null;
  return JSON.parse(zlib.gunzipSync(Buffer.from(String(b64), "base64")).toString("utf8"));
}

/* ---------- interfaz común ----------
   get(k)/set(k,v)/del(k)/mget([k...]) trabajan con STRINGS (el llamador decide
   si el valor es JSON.stringify o base64-gzip). setNX(k,v,ttlSeg) para locks. */

class AlmacenMemoria {
  constructor() { this.m = new Map(); }
  async get(k) { return this.m.has(k) ? this.m.get(k) : null; }
  async set(k, v) { this.m.set(k, String(v)); return true; }
  async del(...ks) { let n = 0; for (const k of ks) if (this.m.delete(k)) n++; return n; }
  async mget(ks) { return ks.map(k => (this.m.has(k) ? this.m.get(k) : null)); }
  async scan(_cursor, match) {
    const re = new RegExp("^" + String(match || "*").replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*") + "$");
    return ["0", [...this.m.keys()].filter(k => re.test(k))];
  }
  async dbsize() { return this.m.size; }
  async setNX(k, v, ttlSeg) {
    if (this.m.has(k)) return false;
    this.m.set(k, String(v));
    if (ttlSeg) setTimeout(() => this.m.delete(k), ttlSeg * 1000).unref?.();
    return true;
  }
}

class AlmacenArchivo {
  /* Todo el estado en UN archivo JSON — suficiente para corridas locales y
     para el respaldo de emergencia (scripts/respaldo-csv.js). */
  constructor(ruta) {
    this.ruta = ruta;
    this.fs = require("fs");
    this._d = null;
  }
  _carga() {
    if (this._d) return this._d;
    try { this._d = JSON.parse(this.fs.readFileSync(this.ruta, "utf8")); }
    catch { this._d = {}; }
    return this._d;
  }
  _guarda() { this.fs.writeFileSync(this.ruta, JSON.stringify(this._d)); }
  async get(k) { const d = this._carga(); return k in d ? d[k] : null; }
  async set(k, v) { const d = this._carga(); d[k] = String(v); this._guarda(); return true; }
  async del(...ks) { const d = this._carga(); for (const k of ks) delete d[k]; this._guarda(); return ks.length; }
  async scan(_c, match) {
    const d = this._carga();
    const re = new RegExp("^" + String(match || "*").replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*") + "$");
    return ["0", Object.keys(d).filter(k => re.test(k))];
  }
  async dbsize() { return Object.keys(this._carga()).length; }
  async mget(ks) { const d = this._carga(); return ks.map(k => (k in d ? d[k] : null)); }
  async setNX(k, v, _ttl) { const d = this._carga(); if (k in d) return false; d[k] = String(v); this._guarda(); return true; }
}

class AlmacenKV {
  /* Upstash Redis gratuito, vía el cliente compartido lib/redis.js. */
  constructor(url, token, fetchImpl) {
    const { crearRedis } = require("./redis.js");
    this.redis = crearRedis({ url, token, fetchImpl });
  }
  async get(k) { return this.redis.get(k); }
  async set(k, v) { return this.redis.set(k, v); }
  async del(...ks) { return this.redis.del(...ks); }
  async mget(ks) { return this.redis.mget(ks); }
  async scan(cursor, match, count) { return this.redis.scan(cursor, match, count); }
  async dbsize() { return this.redis.dbsize(); }
  async setNX(k, v, ttlSeg) {
    const r = await this.redis.set(k, v, { nx: true, ex: ttlSeg || 60 });
    return r === "OK";
  }
  /* comandos consumidos por esta instancia (presupuesto diario del tier) */
  comandos() { return this.redis.comandos(); }
}

/* ---------- helpers de dominio sobre la interfaz cruda ---------- */
function claves(mes) {
  return {
    meta: PREFIJO + "meta",
    progreso: PREFIJO + "progreso",
    incidencias: PREFIJO + "incidencias",
    lock: PREFIJO + "lock",
    manifest: PREFIJO + "mes:" + mes + ":manifest",
    chunk: (i) => PREFIJO + "mes:" + mes + ":chunk:" + i,
  };
}

async function leerJSON(store, k) {
  const v = await store.get(k);
  if (v == null) return null;
  try { return JSON.parse(v); } catch { return null; }
}
async function escribirJSON(store, k, obj) { return store.set(k, JSON.stringify(obj)); }

/* ---------- valores grandes: fragmentado transparente en partes ----------
   Cinturón FINAL contra "ERR max request size exceeded": si un valor supera
   LIMITE_PARTE se guarda troceado en `clave:parte:{j}` (cada parte bajo el
   límite) y la clave principal queda como puntero {"__partes":n}. La lectura
   re-ensambla concatenando (base64 concatena sin pérdida). Las partes se
   escriben ANTES que el puntero: un fallo a mitad no deja punteros colgando
   (las partes huérfanas las recoge ?modo=purga). En el flujo normal esto no
   se activa nunca (el empaquetador ya corta a ≤500 KB): protege contra
   despliegues viejos, configuraciones erróneas y llamadores futuros. */
const LIMITE_PARTE = 500000;
const esPuntero = (v) => typeof v === "string" && v.startsWith('{"__partes"');

async function escribirValorGrande(store, clave, valor, limite = LIMITE_PARTE) {
  const v = String(valor);
  if (v.length <= limite) return store.set(clave, v);
  const n = Math.ceil(v.length / limite);
  console.log(`[almacen] ${clave}: ${(v.length / 1e3) | 0} KB > límite → ${n} partes de ≤${(limite / 1e3) | 0} KB`);
  for (let j = 0; j < n; j++) {
    const parte = v.slice(j * limite, (j + 1) * limite);
    console.log(`[almacen] guardando lote ${j + 1} de ${n} (~${(parte.length / 1e3) | 0} KB)`);
    await store.set(`${clave}:parte:${j}`, parte);
  }
  return store.set(clave, JSON.stringify({ __partes: n }));
}

/* Lectura por lotes tolerante: valores normales pasan tal cual; punteros se
   re-ensamblan; si falta una parte, ese chunk se descarta con aviso (la
   auditoría marcará el faltante) en vez de romper la lectura del mes. */
async function leerValoresGrandes(store, ks) {
  const base = await store.mget(ks);
  const out = [];
  for (let i = 0; i < base.length; i++) {
    const v = base[i];
    if (!esPuntero(v)) { out.push(v); continue; }
    let n = 0;
    try { n = JSON.parse(v).__partes || 0; } catch (e) { out.push(null); continue; }
    const partes = await store.mget(Array.from({ length: n }, (_, j) => `${ks[i]}:parte:${j}`));
    if (partes.some((p) => p == null)) {
      console.warn(`[almacen] ${ks[i]}: faltan ${partes.filter((p) => p == null).length}/${n} partes — chunk descartado`);
      out.push(null); continue;
    }
    out.push(partes.join(""));
  }
  return out;
}

async function registrarIncidencia(store, inc) {
  const k = PREFIJO + "incidencias";
  const lista = (await leerJSON(store, k)) || [];
  lista.push({ ts: new Date().toISOString(), ...inc });
  while (lista.length > MAX_INCIDENCIAS) lista.shift();
  await escribirJSON(store, k, lista);
}

/* Elige el almacén según el entorno: Upstash Redis si hay credenciales
   (UPSTASH_REDIS_REST_* o, como respaldo, las antiguas KV_REST_API_*);
   archivo local si se pide explícitamente; memoria como último recurso. */
function crearAlmacen(opts = {}) {
  if (opts.tipo === "memoria") return new AlmacenMemoria();
  if (opts.tipo === "archivo") return new AlmacenArchivo(opts.ruta || ".cache-secop.json");
  const { credenciales } = require("./redis.js");
  const cred = (opts.kvUrl && opts.kvToken) ? { url: opts.kvUrl, token: opts.kvToken } : credenciales();
  if (cred) return new AlmacenKV(cred.url, cred.token, opts.fetchImpl);
  if (opts.rutaFallback) return new AlmacenArchivo(opts.rutaFallback);
  return new AlmacenMemoria();
}

module.exports = {
  PREFIJO, claves, comprimir, descomprimir,
  leerJSON, escribirJSON, registrarIncidencia, crearAlmacen,
  escribirValorGrande, leerValoresGrandes, LIMITE_PARTE,
  AlmacenMemoria, AlmacenArchivo, AlmacenKV,
};
