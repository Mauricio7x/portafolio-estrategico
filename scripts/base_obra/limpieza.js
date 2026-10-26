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

/* Identidad del proveedor (medido el 17-oct-2026 en wi7w): `nit_del_proveedor` trae NIT, pero
   también «0000000», «No Definido», «Confidencial» o el NOMBRE del consorcio; y una misma empresa
   aparece con dos `c_digo_proveedor` (cuentas de SECOP) y el mismo valor. Por eso la identidad
   son el NIT válido (solo dígitos, ≥ 6, no todo ceros) y el nombre normalizado, UNIDOS dentro del
   proceso: dos filas que comparten uno de los dos son el mismo oferente. El código de SECOP solo
   identifica cuando no hay ninguno de los dos. */
const NO_ES_NOMBRE = /^(no definido|sin descripcion|confidencial|)$/;
/* NIT de relleno (revisión adversaria, 17-oct-2026): «900000000» aparecía con 9 consorcios
   distintos y «2222222222» / «11111111» juntaban oferentes distintos en un lote falso. Se
   rechazan: un dígito repetido, un dígito seguido de 5+ ceros y la secuencia 123456789… */
function nitValido(v) {
  const d = String(v || "").replace(/[\s.\-]/g, "");
  if (!/^\d{6,}$/.test(d) || /^(\d)\1+$/.test(d) || /^[1-9]0{5,}$/.test(d) || "1234567890".startsWith(d)) return null;
  return d;
}
/* Nombre comparable: sin acentos, sin puntuación y con «S.A.S.» = «SAS» (wi7w cambia comas por
   punto y coma; p6dx y wi7w escriben la sociedad distinto). */
function nombreComparable(s) {
  return norm(s || "").replace(/[.,;:()"'´`]/g, " ").replace(/\bs\s+a\s+s\b/g, "sas").replace(/\bs\s+a\b/g, "sa").replace(/\s+/g, " ").trim();
}
function identidades(o, nitsAmbiguos) {
  const ids = [];
  const nit = nitValido(o.nit_del_proveedor);
  if (nit && !(nitsAmbiguos && nitsAmbiguos.has(nit))) ids.push("n:" + nit);
  const nom = nombreComparable(o.nombre_proveedor);
  if (!NO_ES_NOMBRE.test(nom)) ids.push("o:" + nom);
  if (!ids.length) { const cod = String(o.c_digo_proveedor || "").trim(); if (cod && !/^0+$/.test(cod)) ids.push("c:" + cod); }
  return ids;
}
function claveProveedor(o) { return identidades(o)[0] || null; }

/* Unión de identidades dentro de UN proceso → proveedor canónico por oferta. */
/* Un NIT que dentro del MISMO proceso viene con 2+ nombres distintos no identifica a nadie
   (relleno o error de digitación): esas filas se identifican por su nombre. */
function nitsAmbiguosDe(ofertas) {
  const nombres = new Map();
  for (const o of ofertas) { const nit = nitValido(o.nit_del_proveedor), nom = nombreComparable(o.nombre_proveedor);
    if (!nit || NO_ES_NOMBRE.test(nom)) continue; if (!nombres.has(nit)) nombres.set(nit, new Set()); nombres.get(nit).add(nom); }
  return new Set([...nombres].filter(([, s]) => s.size > 1).map(([n]) => n));
}
function proveedoresUnidos(ofertas) {
  const amb = nitsAmbiguosDe(ofertas);
  const identidades_ = (o) => identidades(o, amb);
  const padre = new Map();
  const raiz = (x) => { while (padre.get(x) !== x) { padre.set(x, padre.get(padre.get(x))); x = padre.get(x); } return x; };
  const unir = (a, b) => { const x = raiz(a), y = raiz(b); if (x !== y) padre.set(x < y ? y : x, x < y ? x : y); };
  for (const o of ofertas) { const ids = identidades_(o); for (const i of ids) if (!padre.has(i)) padre.set(i, i); for (let k = 1; k < ids.length; k++) unir(ids[0], ids[k]); }
  return (o) => { const ids = identidades_(o); return ids.length ? raiz(ids[0]) : null; };
}

/* Lote según p6dx (26-oct-2026, decisión del dueño sobre el hallazgo 1 del auditor de la Fase 0): 2+ precios base
   positivos distintos DENTRO de una misma fase. Un precio distinto en OTRA fase es un AJUSTE del presupuesto: de
   947 portafolios con dos precios, solo 8 los tienen en la misma fase; CO1.BDOS.4866609 trae 1.488.813.904 en
   «Presentación de observaciones» y 1.491.889.110 en la de ofertas, `numero_de_lotes` 0 y un contrato. La regla
   de antes (dos precios en cualquier fila) apartaba así 390 de 508 licitaciones; de 692 procesos que libera,
   688 tienen un solo contrato en jbjy y ninguno contratistas distintos (revisión adversaria, en vivo).
   Los lotes reales repiten el precio (CO1.REQ.10672613: 11.362.204.912 en sus cuatro filas) y se apartan por
   `numero_de_lotes` en fila.js. NO se usa «dos adjudicaciones distintas»: se probó y apartaba 162 procesos
   buenos, 146 con un solo contrato (filas cruzadas de p6dx y valores a menos del 1 %; revisión adversaria). */
function lotePorPrecioBase(filas) {
  const porFase = new Map();
  for (const f of filas || []) {
    const v = numeroONull(f.precio_base);
    if (v === null || v <= 0) continue;
    const k = norm(f.fase || "");
    if (!porFase.has(k)) porFase.set(k, new Set());
    porFase.get(k).add(v);
  }
  return [...porFase.values()].some((s) => s.size > 1);
}

/* Ofertas de UN proceso → válidas + exclusiones contadas. precioBase null/≤0 → nada se
   puede juzgar en % y todas quedan «sin_precio_base». Duplicado = mismo (proveedor, valor).
   Lote sospechoso = la MITAD o más de los oferentes con 2+ valores distintos dentro del rango admisible (el proceso
   se aparta entero; ver «UN OFERENTE CON DOS VALORES» abajo). Fuera de rango: ≥ precio base + 1 o < 50 % → marcadas,
   fuera del piso.
   TOLERANCIA DE CENTAVOS (26-oct-2026, hallazgo 3 del auditor): p6dx publica el precio base SIN decimales
   (0 de 81.643 filas los traen), así que el precio real está entre `base` y `base + 1`. Una oferta queda
   «sobre el precio base» solo desde `base + 1`: CO1.BDOS.4451814 ofertó 25.374.652.092,71 sobre una base de
   25.374.652.092 y era lo adjudicado (1.620 ofertas así, 821 iguales a lo adjudicado).
   UN OFERENTE CON DOS VALORES NO VUELVE LOTE AL PROCESO (26-oct-2026, hallazgo 2). Lo que lo sostiene son los
   CONTRATOS: de 513 procesos que la regla vieja apartaba como lote y que pasan a usables, 500 tienen un solo
   contrato en jbjy y ninguno contratistas distintos, y su dispersión es la de los usables de siempre (revisión
   adversaria, en vivo). El `identificador_de_la_oferta` NO lo distingue: en los lotes reales cada valor también
   trae el suyo (CO1.BDOS.1298792, CO1.BDOS.10335265). Los dobles son menos de la mitad de los oferentes en 495 de
   496 procesos, y menos de la cuarta parte en 492 (`tools/analisis/adjudicacion/oferta_doble.js`); al ganador doble le adjudicaron la
   oferta más nueva en 23 de 52 y la más vieja en 29: el orden no dice cuál vale. Por eso:
   - si la MITAD o más de los oferentes traen dos valores, el proceso sigue siendo lote. Es una guarda casi
     inerte (1 de 496 procesos): los lotes se apartan por `numero_de_lotes`;
   - si no, del oferente doble se queda el ÚNICO valor más cercano a lo adjudicado si está a no más del 1 %
     (el mismo criterio de fila.js para emparejar al ganador: CO1.BDOS.8795032 ofertó 6.511.543.527,58 y le
     adjudicaron 6.511.543.530); de cualquier otro oferente doble no se sabe cuál vale y sale entero
     (`oferta_doble`, sin dato), y el proceso se queda.
   `rescate.valor_adjudicado` es el mismo dato que usa el rescate bajo el 50 %.
   RESCATE BAJO EL 50 % (18-oct-2026, decisión del dueño): una oferta bajo la mitad del precio base es
   casi siempre otra medida (un precio unitario, un valor en miles, un error de digitación) y se
   descarta. Se RESCATA solo si es igual, al peso, a lo adjudicado; si los contratos firmados en jbjy,
   SUMADOS, valen a lo más 1,5 veces lo adjudicado; y si en el mismo proceso hay al menos otra oferta
   válida (entre el 50 y el 100 %). Revisado a mano, 12 ganadoras de mínima pasan las tres (8 con el
   contrato igual a lo adjudicado, 4 entre 1,49 y 1,50 veces).
   - La SUMA y no cada contrato: Tibirita CO1.BDOS.8989826 son dos lotes de un mismo precio base («LOTE 1»
     $100.000.000 y «LOTE 2» $99.755.678, p6dx con numero_de_lotes 0); cada contrato cabía en el tope y
     la suma vale 2 veces lo adjudicado (revisión adversaria).
   - El tope: en los de otra medida el contrato vale de 3 a 1.500 veces lo adjudicado (Cúcuta
     CO1.BDOS.7050304, menor cuantía CO1.BDOS.7958348: $139.800 ofertados, $139.800.564 firmados). Con la
     oferta bajo el 50 %, el tope deja la suma bajo el 75 % del precio base.
   - Otra válida: si todas las ofertas están bajo la mitad (SENA CO1.BDOS.7102769: dos ofertas al 27,7 %),
     lo sospechoso es el precio base, no el precio.
   - «Sin dato» no rescata: sin contratos, o con uno ilegible o en cero, no se rescata (ante la duda, no
     se cuenta). `rescate` = { valor_adjudicado, valores_contrato: [número o null por cada contrato] }. */
const RESCATE_CONTRATO_MAX_VECES = 1.5;
function rescatable(v, base, rescate) {
  if (!rescate || !Array.isArray(rescate.valores_contrato) || !rescate.valores_contrato.length) return false;
  const adj = numeroONull(rescate.valor_adjudicado);
  const cs = rescate.valores_contrato.map(numeroONull);
  if (cs.some((c) => c === null || c <= 0)) return false;   // un contrato ilegible o en cero es «no sé»
  const suma = cs.reduce((a, c) => a + c, 0);
  return adj !== null && adj > 0 && Math.abs(v - adj) <= 1 && suma <= RESCATE_CONTRATO_MAX_VECES * adj + 1;
}
function limpiarOfertas(ofertas, precioBase, rescate = null) {
  const ex = { repetidas: 0, confidencial: 0, cero: 0, no_numerico: 0, sin_proveedor: 0, duplicada: 0, duplicada_entre_datasets: 0,
    sobre_base: 0, bajo_50: 0, rescatada_bajo_50: 0, sin_precio_base: 0, oferta_doble: 0 };
  const vistos = new Map(), porProv = new Map(), validas = [];
  const base = numeroONull(precioBase);
  const provDe = proveedoresUnidos(ofertas || []);
  /* `n` = filas crudas que la consulta agrupada juntó en esta (proveedor, valor): las réplicas
     exactas se cuentan en `repetidas` y no son ofertas nuevas. Sin `n`, la fila vale 1. */
  for (const o of ofertas || []) {
    const nFil = numeroONull(o.n);
    if (nFil !== null && nFil > 1) ex.repetidas += nFil - 1;
    if (/confidencial/.test(norm(o.nombre_proveedor || ""))) { ex.confidencial++; continue; }
    const v = numeroONull(o.valor_de_la_oferta);
    if (v === null) { ex.no_numerico++; continue; }
    if (v <= 0) { ex.cero++; continue; }
    const p = provDe(o);
    if (!p) { ex.sin_proveedor++; continue; }
    const k = p + "|" + v;
    if (vistos.has(k)) { if (vistos.get(k) !== o._ds) ex.duplicada_entre_datasets++; else ex.duplicada++; continue; }
    vistos.set(k, o._ds);
    if (base === null || base <= 0) { ex.sin_precio_base++; continue; }
    if (v >= base + 1) { ex.sobre_base++; continue; }   // tolerancia de centavos: ver arriba
    const rescatada = v < 0.5 * base;
    if (rescatada) { if (!rescatable(v, base, rescate)) { ex.bajo_50++; continue; } ex.rescatada_bajo_50++; }
    if (!porProv.has(p)) porProv.set(p, new Set());
    porProv.get(p).add(v);
    validas.push({ proveedor: p, nombre: o.nombre_proveedor || null, valor: v, pct: v / base, fila: o, ...(rescatada ? { rescatada: true } : {}) });
  }
  // sin otra válida en rango, la rescatada vuelve a descartarse: lo sospechoso es el precio base
  if (ex.rescatada_bajo_50 && !validas.some((o) => !o.rescatada)) {
    for (const o of validas.filter((x) => x.rescatada)) { porProv.get(o.proveedor).delete(o.valor); if (!porProv.get(o.proveedor).size) porProv.delete(o.proveedor); }
    ex.bajo_50 += ex.rescatada_bajo_50; ex.rescatada_bajo_50 = 0;
    validas.length = 0;
  }
  const dobles = [...porProv.entries()].filter(([, s]) => s.size > 1).map(([p]) => p);
  const lote_sospechoso = dobles.length > 0 && 2 * dobles.length >= porProv.size;
  if (dobles.length && !lote_sospechoso) {
    const adj = rescate ? numeroONull(rescate.valor_adjudicado) : null;
    for (const p of dobles) {
      const suyas = validas.filter((o) => o.proveedor === p);
      // el único valor más cercano a lo adjudicado, si está a no más del 1 % (dos a la misma distancia: ninguno)
      const dist = adj !== null && adj > 0 ? suyas.map((o) => Math.abs(o.valor - adj)) : [];
      const dMin = dist.length ? Math.min(...dist) : Infinity;
      const queda = dMin <= 0.01 * adj ? suyas.filter((o, i) => dist[i] === dMin) : [];
      for (const o of suyas) if (!(queda.length === 1 && o === queda[0])) { validas.splice(validas.indexOf(o), 1); ex.oferta_doble++; }
      if (queda.length === 1) porProv.set(p, new Set([queda[0].valor])); else porProv.delete(p);
    }
  }
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

module.exports = { MODALIDADES, clasificarModalidad, numeroONull, elegirFila, claveProveedor, nitValido, nombreComparable, nitsAmbiguosDe,
  proveedoresUnidos, lotePorPrecioBase,
  limpiarOfertas, mediana, estadisticas, competencia };
