"use strict";
/* Base nacional de licitaciones de obra · capa PURA de limpieza (Fase 0, 17-oct-2026).
   Solo MIDE: nada de aquí lo llama la aplicación. Cada exclusión lleva su motivo y se
   cuenta; «sin dato» jamás se vuelve cero (la ausencia se descarta ANTES de convertir). */
const { norm } = require("../../lib/semantica");

/* Mapeo DECLARADO de modalidades de p6dx (inventario medido el 17-oct-2026). Mínima va
   aparte: se adjudica por menor precio, no por fórmula. Desconocida → «otra» (inerte). */
const MODALIDADES = {
  "licitacion publica": "licitacion",
  "licitacion publica obra publica": "licitacion",
  "seleccion abreviada de menor cuantia": "menor_cuantia",
  "seleccion abreviada menor cuantia sin manifestacion interes": "menor_cuantia",
  "minima cuantia": "minima",
};
function clasificarModalidad(m) {
  return MODALIDADES[norm(m || "").replace(/\s+/g, " ").trim()] || "otra";
}

/* Número o null. "", null, "No Definido", "abc" → null; jamás 0 por ausencia. */
function numeroONull(v) {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  if (!s || !/^-?\d+(\.\d+)?$/.test(s)) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

/* Un proceso (id_del_portafolio) puede traer varias filas en p6dx. Regla declarada:
   1) adjudicado «Si»; 2) con valor_total_adjudicacion > 0; 3) fecha_adjudicacion más
   reciente; 4) fecha_de_publicacion_del más reciente; 5) id_del_proceso mayor (desempate
   estable). :updated_at NO interviene: p6dx re-sella en masa. */
function elegirFila(filas) {
  const clave = (f) => [
    f.adjudicado === "Si" ? 1 : 0,
    (numeroONull(f.valor_total_adjudicacion) || 0) > 0 ? 1 : 0,
    String(f.fecha_adjudicacion || ""),
    String(f.fecha_de_publicacion_del || ""),
    Number((String(f.id_del_proceso || "").match(/(\d+)\s*$/) || [0, -1])[1]),
  ];
  const cmp = (a, b) => { const x = clave(a), y = clave(b);
    for (let i = 0; i < x.length; i++) { if (x[i] < y[i]) return -1; if (x[i] > y[i]) return 1; } return 0; };
  return filas.slice().sort(cmp).pop();
}

const NIT_VACIO = /^(0+|no definido|sin descripcion|)$/;
function claveProveedor(o) {
  const nit = String(o.nit_del_proveedor || "").trim();
  if (nit && !NIT_VACIO.test(norm(nit))) return "n:" + nit;
  const cod = String(o.c_digo_proveedor || "").trim();
  if (cod && !NIT_VACIO.test(norm(cod))) return "c:" + cod;
  const nom = norm(o.nombre_proveedor || "").trim();
  return nom ? "o:" + nom : null;
}

/* Ofertas de UN proceso → válidas + exclusiones contadas. precioBase null/≤0 → nada se
   puede juzgar en % y todas quedan «sin_precio_base». Duplicado = mismo (proveedor, valor).
   Lote sospechoso = un proveedor con ≥2 valores distintos DENTRO del rango admisible (no se elige cuál: el proceso se
   aparta entero). Fuera de rango: > precio base o < 50 % → marcadas, fuera del piso. */
function limpiarOfertas(ofertas, precioBase) {
  const ex = { confidencial: 0, cero: 0, no_numerico: 0, sin_proveedor: 0, duplicada: 0, duplicada_entre_datasets: 0,
    sobre_base: 0, bajo_50: 0, sin_precio_base: 0 };
  const vistos = new Map(), porProv = new Map(), validas = [];
  const base = numeroONull(precioBase);
  for (const o of ofertas || []) {
    if (/confidencial/.test(norm(o.nombre_proveedor || ""))) { ex.confidencial++; continue; }
    const v = numeroONull(o.valor_de_la_oferta);
    if (v === null) { ex.no_numerico++; continue; }
    if (v <= 0) { ex.cero++; continue; }
    const p = claveProveedor(o);
    if (!p) { ex.sin_proveedor++; continue; }
    const k = p + "|" + v;
    if (vistos.has(k)) { if (vistos.get(k) !== o._ds) ex.duplicada_entre_datasets++; else ex.duplicada++; continue; }
    vistos.set(k, o._ds);
    if (base === null || base <= 0) { ex.sin_precio_base++; continue; }
    if (v > base) { ex.sobre_base++; continue; }
    if (v < 0.5 * base) { ex.bajo_50++; continue; }
    if (!porProv.has(p)) porProv.set(p, new Set());
    porProv.get(p).add(v);
    validas.push({ proveedor: p, nombre: o.nombre_proveedor || null, valor: v, pct: v / base });
  }
  const lote_sospechoso = [...porProv.values()].some((s) => s.size > 1);
  return { validas, excluidas: ex, lote_sospechoso, proveedores: porProv.size };
}

function mediana(xs) {
  const a = xs.slice().sort((x, y) => x - y), n = a.length;
  if (!n) return null;
  return n % 2 ? a[(n - 1) / 2] : (a[n / 2 - 1] + a[n / 2]) / 2;
}
/* Las dos σ: los datos abiertos no dicen qué ofertas quedaron hábiles ni cuál usó la entidad. */
function estadisticas(xs) {
  const n = xs.length;
  if (!n) return { n: 0, mediana: null, media: null, sigma_pob: null, sigma_muestral: null };
  const media = xs.reduce((s, x) => s + x, 0) / n;
  const ss = xs.reduce((s, x) => s + (x - media) * (x - media), 0);
  return { n, mediana: mediana(xs), media, sigma_pob: Math.sqrt(ss / n),
    sigma_muestral: n > 1 ? Math.sqrt(ss / (n - 1)) : null };
}

/* Etiqueta de competencia: ≥3 válidas «real», 1–2 «baja», 0 → null (sin ofertas usables). */
function competencia(nValidas) {
  if (!(nValidas >= 1)) return null;
  return nValidas >= 3 ? "real" : "baja";
}

module.exports = { MODALIDADES, clasificarModalidad, numeroONull, elegirFila, claveProveedor,
  limpiarOfertas, mediana, estadisticas, competencia };
