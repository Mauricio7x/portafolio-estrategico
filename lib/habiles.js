/* lib/habiles.js · Días hábiles y festivos de Colombia (Fase 9 · Detekta v4)
   ─────────────────────────────────────────────────────────────────────────────
   Necesario para contar el plazo de manifestación de interés de la selección
   abreviada de menor cuantía —«no mayor a tres (3) días hábiles contados a
   partir de la fecha de apertura», D. 1082/2015 art. 2.2.1.2.1.2.20— y para
   cualquier plazo del oficio que corra en días de oficina.

   Festivos según la Ley 51 de 1983 (y la Ley 35 de 1985 para la Pascua):
   · FIJOS (no se trasladan): 1 ene · 1 may · 20 jul · 7 ago · 8 dic · 25 dic
   · TRASLADABLES al lunes siguiente cuando no caen en lunes: 6 ene (Reyes) ·
     19 mar (San José) · 29 jun (San Pedro y San Pablo) · 15 ago (Asunción) ·
     12 oct (Raza) · 1 nov (Todos los Santos) · 11 nov (Independencia de
     Cartagena)
   · DEPENDIENTES DE LA PASCUA: Jueves Santo (−3) y Viernes Santo (−2), fijos;
     Ascensión (+39), Corpus Christi (+60) y Sagrado Corazón (+68), que se
     trasladan al lunes siguiente (+43, +64, +71).
   La Pascua se calcula con el algoritmo de Meeus/Jones/Butcher (calendario
   gregoriano). Sábados y domingos no son hábiles.

   Todo es aritmética PURA sobre cadenas YYYY-MM-DD (fecha civil colombiana,
   sin husos ni horas: un plazo de días hábiles no tiene hora). La caché por
   año vive en memoria y, opcionalmente, en Redis (`calendario:festivos:{YYYY}`,
   como pide el plan) — leerla de Redis nunca es imprescindible: si falla se
   recalcula. */
"use strict";

const NOMBRES = {
  fijos: { "01-01": "Año Nuevo", "05-01": "Día del Trabajo", "07-20": "Independencia", "08-07": "Batalla de Boyacá", "12-08": "Inmaculada Concepción", "12-25": "Navidad" },
  trasladables: { "01-06": "Reyes Magos", "03-19": "San José", "06-29": "San Pedro y San Pablo", "08-15": "Asunción de la Virgen", "10-12": "Día de la Raza", "11-01": "Todos los Santos", "11-11": "Independencia de Cartagena" },
};

const DIA_MS = 86400000;
const aUTC = (iso) => { const [a, m, d] = String(iso).split("-").map(Number); return Date.UTC(a, m - 1, d); };
const aISO = (ms) => new Date(ms).toISOString().slice(0, 10);
const sumarDias = (iso, n) => aISO(aUTC(iso) + n * DIA_MS);
const diaSemana = (iso) => new Date(aUTC(iso)).getUTCDay(); // 0 dom … 6 sáb
const alLunesSiguiente = (iso) => { const d = diaSemana(iso); return d === 1 ? iso : sumarDias(iso, (8 - d) % 7); };

/* Domingo de Pascua (gregoriano) · Meeus/Jones/Butcher */
function pascua(anio) {
  const a = anio % 19, b = Math.floor(anio / 100), c = anio % 100;
  const d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mes = Math.floor((h + l - 7 * m + 114) / 31), dia = ((h + l - 7 * m + 114) % 31) + 1;
  return `${anio}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
}

const _memo = new Map();
/* Rango del calendario, EXPORTADO (ago 2026): `lib/manifestacion` tenía su
   propia copia de estos dos números para validar el año de la apertura antes de
   llamar aquí. Dos definiciones del mismo rango divergen a la primera vez que
   alguien amplíe una — y la que se quedara corta volvería a dejar pasar la fecha
   que hace LANZAR a `festivos`, que es el 500 que esa validación existe para
   evitar. */
const ANIO_MIN = 1984, ANIO_MAX = 2200;

/* Festivos del año: Map ISO → nombre (ordenado por fecha). */
function festivos(anio) {
  const y = Number(anio);
  if (!Number.isInteger(y) || y < ANIO_MIN || y > ANIO_MAX) throw new Error(`festivos: año fuera de rango (${anio})`);
  if (_memo.has(y)) return _memo.get(y);
  const f = new Map();
  for (const [md, nombre] of Object.entries(NOMBRES.fijos)) f.set(`${y}-${md}`, nombre);
  for (const [md, nombre] of Object.entries(NOMBRES.trasladables)) f.set(alLunesSiguiente(`${y}-${md}`), nombre);
  const p = pascua(y);
  f.set(sumarDias(p, -3), "Jueves Santo");
  f.set(sumarDias(p, -2), "Viernes Santo");
  f.set(alLunesSiguiente(sumarDias(p, 39)), "Ascensión del Señor");
  f.set(alLunesSiguiente(sumarDias(p, 60)), "Corpus Christi");
  f.set(alLunesSiguiente(sumarDias(p, 68)), "Sagrado Corazón");
  const ordenado = new Map([...f.entries()].sort((a, b) => a[0].localeCompare(b[0])));
  _memo.set(y, ordenado);
  return ordenado;
}

function esFestivo(iso) { return festivos(Number(String(iso).slice(0, 4))).has(String(iso).slice(0, 10)); }
function esHabil(iso) { const d = diaSemana(iso); return d !== 0 && d !== 6 && !esFestivo(iso); }

/* Fecha que resulta de contar `n` días hábiles a partir de `iso` (el día de
   partida NO cuenta, como en «contados a partir de la fecha de apertura»):
   sumarHabiles("2026-08-14", 3) → el tercer día hábil después del 14. */
function sumarHabiles(iso, n) {
  let f = String(iso).slice(0, 10), restan = Number(n) || 0;
  const paso = restan >= 0 ? 1 : -1;
  restan = Math.abs(restan);
  while (restan > 0) { f = sumarDias(f, paso); if (esHabil(f)) restan--; }
  return f;
}

/* Días hábiles ESTRICTAMENTE después de `desde` y hasta `hasta` inclusive
   (0 si hasta ≤ desde). Es lo que queda «para avisar» visto desde hoy. */
function habilesEntre(desde, hasta) {
  let a = String(desde).slice(0, 10); const b = String(hasta).slice(0, 10);
  if (b <= a) return 0;
  let n = 0;
  while (a < b) { a = sumarDias(a, 1); if (esHabil(a)) n++; }
  return n;
}

/* Fecha civil de HOY en Colombia (UTC−5) a partir de un instante en ms. */
function hoyColombia(ahoraMs) {
  const ms = Number.isFinite(ahoraMs) ? ahoraMs : Date.now();
  return aISO(ms - 5 * 3600 * 1000);
}

/* Caché opcional en Redis del calendario del año (`calendario:festivos:{YYYY}`).
   Es una comodidad para inspección, no una dependencia: si Redis falla se
   devuelve el cálculo igual. */
async function festivosConCache(redis, anio) {
  const clave = `calendario:festivos:${anio}`;
  const lista = [...festivos(anio).entries()].map(([fecha, nombre]) => ({ fecha, nombre }));
  if (redis && typeof redis.set === "function") {
    try { await redis.set(clave, JSON.stringify({ anio: Number(anio), festivos: lista, fuente: "Ley 51 de 1983 · calculado" })); } catch { /* opcional */ }
  }
  return lista;
}

const NOMBRE_DIA = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
const NOMBRE_MES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
/* «martes 18 de agosto» — para la frase de la portada. */
function fechaLegible(iso) {
  const s = String(iso).slice(0, 10);
  const [, m, d] = s.split("-").map(Number);
  return `${NOMBRE_DIA[diaSemana(s)]} ${d} de ${NOMBRE_MES[m - 1]}`;
}

/* ¿Es una fecha con la que se puede OPERAR? El dataset trae años imposibles de
   verdad (`1970` de timestamp nulo, el `2202` documentado). Vivía en
   lib/manifestacion y solo la llamaba `ventanaDe`: `fechaCierre` (lib/negocio),
   `cierre_vencido` y las señales de prórroga seguían tragándose el 1970 — el
   proceso se daba por VENCIDO en la ingesta y en la lectura, y si una versión
   posterior traía la fecha real, la «prórroga» inventada multiplicaba la
   probabilidad por 1,2 (1-sep-2026). Fuera del calendario = AUSENTE; el margen
   de ±1 año existe porque a estas fechas se les suma o resta hasta 3 hábiles. */
function fechaOperable(f) {
  if (!f) return null;
  const t = Date.parse(f);
  if (!Number.isFinite(t)) return null;
  const anio = new Date(t).getUTCFullYear();
  return anio >= ANIO_MIN + 1 && anio <= ANIO_MAX - 1 ? f : null;
}

module.exports = { pascua, festivos, esFestivo, esHabil, sumarHabiles, habilesEntre, hoyColombia, festivosConCache, fechaLegible, sumarDias, fechaOperable, NOMBRES, ANIO_MIN, ANIO_MAX };
