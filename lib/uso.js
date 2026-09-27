/* ============================================================================
   lib/uso · MEDIR EL USO, SIN ANALÍTICA DE TERCEROS (27-sep-2026)
   ----------------------------------------------------------------------------
   La investigación de mercado (docs/INVESTIGACION_MERCADO_LICITADOR.md, tabla
   de horas) dejó escrito que «el piso demostrable de todo ahorro es cero hasta
   medir el uso»: sin contar qué hace cada perfil, ningún «Detekta le ahorra N
   horas» se puede afirmar. Esto cuenta, y nada más:
     · CONTEOS por perfil y por mes (`uso:{perfil}:{YYYY-MM}`, un hash; el mes
       es el de Colombia), con un campo por acción de `EVENTOS`. Sin contenido:
       ni qué proceso, ni qué cifra, ni desde dónde.
     · El tiempo que tarda en DECIDIR y COSTEAR no se cuenta aquí: sale de lo
       que Mis procesos ya guarda (del día en que guardó el proceso al día en
       que anotó con cuánto ofertó, lib/seguimiento), y lo calcula quien lee.
   NUNCA ESTORBA: anotar es lo último que se le pide a una petición que ya
   hizo su trabajo. Espera como mucho `ESPERA_MS` (un Upstash lento no puede
   sumarle segundos a la lista) y un fallo se traga: devuelve false. La cifra
   que sale de aquí es por eso un PISO («al menos N»), y así se dice.
   ========================================================================== */
"use strict";

const EVENTOS = Object.freeze({
  lista: "Consultó la lista de procesos (cada página o filtro cuenta una)",
  guardar: "Guardó un proceso en Mis procesos",
  presentado: "Marcó que se presentó",
  oferta: "Anotó con cuánto ofertó",
  dictamen: "Pidió el dictamen de un pliego",
  calculo: "Calculó un precio",
  revision: "Revisó su oferta antes de subirla",
});
const TTL_SEG = 400 * 86400; // trece meses: se compara el mes contra el del año anterior
const ESPERA_MS = 400;
const PERFIL_RE = /^[a-z0-9_-]{2,60}$/i;
const OFFSET_COLOMBIA_MS = 5 * 3600e3;
const mesDe = (ms) => new Date(ms - OFFSET_COLOMBIA_MS).toISOString().slice(0, 7);
const claveUso = (perfil, mes) => `uso:${perfil}:${mes}`;
const esEvento = (e) => Object.prototype.hasOwnProperty.call(EVENTOS, e);

/* Suma 1 a `evento` del perfil en el mes de `ahora`. true si quedó anotado. */
async function anotarUso(redis, perfil, evento, { ahora = Date.now(), esperaMs = ESPERA_MS } = {}) {
  if (!redis || typeof redis.hincrby !== "function" || !esEvento(evento) || !PERFIL_RE.test(String(perfil || ""))) return false;
  const k = claveUso(String(perfil), mesDe(ahora));
  const trabajo = (async () => {
    const n = await redis.hincrby(k, evento, 1);
    if (Number(n) === 1 && typeof redis.expire === "function") await redis.expire(k, TTL_SEG);
    return true;
  })().catch(() => false);
  let reloj;
  const tope = new Promise((r) => { reloj = setTimeout(() => r(false), esperaMs); });
  try { return await Promise.race([trabajo, tope]); } finally { clearTimeout(reloj); }
}

/* Los conteos de los últimos `meses` meses (el actual incluido), del más
   reciente al más viejo. Un mes sin nada anotado viaja con sus eventos en 0:
   aquí el 0 SÍ es un dato (se contó y no hubo), a diferencia de un mes que no
   se pudo leer, que viaja con `leido: false` y conteos en null. */
async function leerUso(redis, perfil, { meses = 3, ahora = Date.now() } = {}) {
  const out = [];
  const d = new Date(ahora - OFFSET_COLOMBIA_MS);
  for (let i = 0; i < Math.max(1, Math.min(13, meses)); i++) {
    const m = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() - i, 1)).toISOString().slice(0, 7);
    try {
      const h = await redis.hgetall(claveUso(perfil, m));
      const conteos = Object.fromEntries(Object.keys(EVENTOS).map((e) => [e, Math.max(0, Math.trunc(Number(h && h[e]) || 0))]));
      out.push({ mes: m, leido: true, conteos });
    } catch {
      out.push({ mes: m, leido: false, conteos: Object.fromEntries(Object.keys(EVENTOS).map((e) => [e, null])) });
    }
  }
  return out;
}

/* Días de DECIDIR Y COSTEAR, de lo que Mis procesos ya guarda: del día en que
   guardó el proceso al día en que anotó con cuánto ofertó. Solo cuentan los
   procesos que tienen las dos fechas; sin ninguno, null (no 0). */
function diasHastaOfertar(procesos) {
  const dias = [];
  for (const p of Object.values(procesos || {})) {
    const g = p && Date.parse(p.guardado), o = p && p.oferta && Date.parse(p.oferta.anotada_el);
    if (Number.isFinite(g) && Number.isFinite(o) && o >= g) dias.push((o - g) / 86400e3);
  }
  if (!dias.length) return { procesos: 0, mediana_dias: null };
  dias.sort((a, b) => a - b);
  const mitad = Math.floor(dias.length / 2);
  const mediana = dias.length % 2 ? dias[mitad] : (dias[mitad - 1] + dias[mitad]) / 2;
  return { procesos: dias.length, mediana_dias: Math.round(mediana * 10) / 10 };
}

module.exports = { EVENTOS, TTL_SEG, ESPERA_MS, mesDe, claveUso, anotarUso, leerUso, diasHastaOfertar };
