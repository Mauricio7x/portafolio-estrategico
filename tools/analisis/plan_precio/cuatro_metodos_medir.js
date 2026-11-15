"use strict";
/* ============================================================================
   Plan precio · los cuatro métodos · ¿cuánto se acerca una regla al mejor precio? (14-nov-2026)
   ----------------------------------------------------------------------------
   Solo MIDE, fuera de la aplicación y FUERA DE MUESTRA: lee `base_precio.jsonl` (lo escribe
   `cuatro_metodos_base.js` con lo que bajó `cuatro_metodos_descargar.sh` de datos.gov.co) y deja las
   cifras en `resultados_4metodos_AAAA-MM-DD.json`. No toca Redis, producción ni la aplicación.

     bash tools/analisis/plan_precio/cuatro_metodos_descargar.sh <carpeta>
     node tools/analisis/plan_precio/cuatro_metodos_base.js <carpeta>
     node tools/analisis/plan_precio/cuatro_metodos_control_x20.js <carpeta> [AAAA-MM-DD]   (opcional: control cruzado)
     node tools/analisis/plan_precio/cuatro_metodos_medir.js <carpeta> [AAAA-MM-DD de la consulta]

   Modalidades: selección abreviada de menor cuantía y licitación de obra pública (donde el puntaje
   económico sale de los cuatro métodos del documento tipo); régimen especial va solo como referencia.
   Unidad: % del presupuesto oficial (`precio_base` de SECOP II). Población de precio: procesos
   adjudicados con 3 o más ofertas válidas de proponentes distintos y «limpios» (ver la base).

   Qué responde:
     control · ¿esta tubería da las cifras ya publicadas en docs/PLAN_X20.md §2.5?
     A · ¿se anticipa el CENTRO del grupo (mediana de todas las ofertas del proceso)? Cinco referencias.
         Y la costumbre de cada oferente: ¿repite su porcentaje o sigue al grupo?
     B · si se hubiera entrado como un oferente más a un precio dado por cada regla, ¿en qué parte de
         los cuatro métodos se queda primero, frente a un precio FIJO del mismo precio medio? Y en dinero.
     C · los techos: el mejor precio único conociendo TODAS las ofertas rivales (pero no el método),
         y conociendo además el método; y qué pasa si un rival no queda hábil.
     D · en cuántos procesos cada método le habría dado el primer puesto a quien de verdad ganó.

   NADA DEL FUTURO ENTRA A UNA PREDICCIÓN. Se aprende con lo recibido antes de 2026 y se prueba con
   2026; el desplazamiento de cada familia se ELIGE con 2025 (aprendiendo con lo anterior a 2025).
   Un proceso entra al historial cuando ya se conoce: en el modo principal («estricto»), desde su
   FECHA DE ADJUDICACIÓN (en licitación de obra el sobre económico se abre en la audiencia; lo
   adjudicado no existe antes); un proceso anterior solo informa a uno cuya recepción es POSTERIOR
   a esa fecha. El modo «recepcion» (como tools/analisis/plan_x20/medir.js: el historial se
   actualiza con cada proceso por orden de recepción) va como sensibilidad y para el control.

   La VENTANA del historial (todo, dos años o un año antes del proceso) también se elige con 2025: el centro del
   grupo baja año tras año y una mediana de todo el historial llega alta. Lo que elige (ventana, desplazamiento,
   precio fijo) son los procesos recibidos en 2025 y YA adjudicados antes de 2026; la mezcla se ajusta con centros
   ya conocidos antes de su corte.
   Referencias: tamano_centro (centro por modalidad y tramo de presupuesto: la regla más simple), entidad_ganador
   (mediana de lo adjudicado en la entidad, 5 o más; si no, por tamaño: lo que hoy enseña Detekta), entidad_centro
   (mediana de los centros de la entidad, 3 o más; si no, por tamaño), identidad (mediana de la costumbre de quienes
   de verdad llegaron, 3 o más ofertas previas; si menos de la mitad la tiene, entidad_centro), identidad_3mas (la
   costumbre solo en procesos de 3 o más ofertas), identidad_relativa (el nivel anunciado más cuánto se aparta cada
   oferente de ese nivel en todo su historial), mezcla (mínimos cuadrados) y oraculo_n (la clase real de oferentes).

   SUPUESTOS (van con cada cifra; no se quitan al citarla):
     · NO se modela el rechazo por precio artificialmente bajo ni el piso del pliego: los precios muy bajos (fijos de
       90 a 92, desplazamientos de −3 o más) salen favorecidos de más. scripts/base_obra/cifras.js midió que una
       oferta bajo el piso gana menos en los datos reales.
     · [supuesto] todas las ofertas publicadas se toman como HÁBILES e iguales fuera del precio: los
       datos abiertos no dicen quién quedó hábil. B y C son referencias, no probabilidades de ganar.
     · [supuesto] los cuatro métodos al 25 % cada uno (el sorteo por los centavos de la TRM).
     · [supuesto] régimen especial usa el máximo de puntaje de menor cuantía (solo mueve el redondeo
       al séptimo decimal) y puede traer otros métodos: va como referencia.
     · [supuesto] la oferta propia no cambia lo que ofertan los demás.
     · El presupuesto es `precio_base` de SECOP II, que puede no ser el del pliego definitivo.
     · Solo procesos ADJUDICADOS; 2026 llega hasta la fecha de la consulta.
   El motor de los cuatro métodos se LLAMA (lib/metodos_ponderacion.js: METODOS, primeros); el azar
   con semilla es `azar` de scripts/base_obra/cifras.js; `opcionAl` de plan_x20/medir.js sirve de
   contraste de la envoltura de aquí.
   ============================================================================ */
const fs = require("fs");
const path = require("path");
const RAIZ = path.join(__dirname, "..", "..", "..");
const M = require(path.join(RAIZ, "lib", "metodos_ponderacion.js"));
const { azar } = require(path.join(RAIZ, "scripts", "base_obra", "cifras.js"));
const X20 = require(path.join(RAIZ, "tools", "analisis", "plan_x20", "medir.js"));

const CORTE_PRUEBA = "2026-01-01";     // se prueba con lo recibido desde aquí
const CORTE_ELEGIR = "2025-01-01";     // el desplazamiento se elige con 2025
const MODS = ["abreviada", "licitacion", "especial"];
const ROTULO = { abreviada: "Selección abreviada de menor cuantía", licitacion: "Licitación de obra pública", especial: "Régimen especial (solo referencia)" };
const MAXIMO = { abreviada: M.PUNTAJE_MAXIMO.menor_cuantia, licitacion: M.PUNTAJE_MAXIMO.licitacion, especial: M.PUNTAJE_MAXIMO.menor_cuantia };
const MIN_GANADOR = 5;      // adjudicados previos para usar la mediana de la entidad (como aproximacion.js)
const MIN_CENTROS = 3;      // centros previos de la entidad para usar su mediana
const MIN_N_ENTIDAD = 3;    // procesos previos de la entidad para anunciar cuántos oferentes llegan
const MIN_COSTUMBRE = 3;    // ofertas previas de un oferente para tener «costumbre»
const MIN_ESTABLE = 5;      // ofertas previas para medir qué tan fija es la costumbre
const DELTAS = [-2, -1.5, -1, -0.5, -0.25, 0, 0.25, 0.5];                                  // la rejilla del encargo
const DELTAS_AMPLIA = [-8, -7, -6, -5, -4, -3, -2.5, -2, -1.5, -1, -0.5, -0.25, 0, 0.25, 0.5];   // contraste para el dinero
const FIJOS = []; for (let k = 0; k <= 30; k++) FIJOS.push(85 + k * 0.5);                 // curva de precios fijos (85 a 100)
const FIJOS_TABLA = FIJOS.filter((p) => p >= 90 && p <= 99);                               // los del encargo
const PISOS = [85, 88, 90, 92];
const FAMILIAS = ["entidad_ganador", "entidad_centro", "identidad", "identidad_3mas", "identidad_relativa", "mezcla"];
const FAMILIAS_TODAS = ["tamano_centro", ...FAMILIAS, "oraculo_n", "centro_real"];
const NO_SE_CONOCE_ANTES = new Set(["identidad", "identidad_3mas", "identidad_relativa", "mezcla", "oraculo_n", "centro_real"]);
const SE_CONOCEN_ANTES = ["entidad_ganador", "entidad_centro"];   // las únicas reglas del encargo que no usan quién ni cuántos llegaron
const VENTANAS = [null, 730, 365];   // historial que cuenta: todo, dos años o un año antes del proceso (se elige con 2025)
const PERFIL = [-6, -5, -4, -3, -2.5, -2, -1.5, -1, -0.75, -0.5, -0.25, -0.1, 0, 0.1, 0.25, 0.5, 0.75, 1, 1.5, 2, 3];
const REPLICAS = 2000, SEMILLA = 20261114;
const P_QUITAR = 0.3, SORTEOS_HABILES = 20;
const EPS = 0.001;          // «justo debajo / encima»: una milésima de punto del presupuesto
const PRECIO_MAXIMO = 100;  // la oferta propia no pasa del presupuesto
const CLASES = ["3-4", "5-9", "10+"];

const dia = (s) => (s ? String(s).slice(0, 10) : null);
const media = (v) => (v.length ? v.reduce((a, b) => a + b, 0) / v.length : null);
const mediana = (v) => { if (!v.length) return null; const a = v.slice().sort((x, y) => x - y), n = a.length; return n % 2 ? a[(n - 1) / 2] : (a[n / 2 - 1] + a[n / 2]) / 2; };
const desv = (v) => { if (v.length < 2) return null; const m = media(v); return Math.sqrt(v.reduce((s, x) => s + (x - m) * (x - m), 0) / (v.length - 1)); };
const cuantil = (ordenado, p) => (ordenado.length ? ordenado[Math.min(ordenado.length - 1, Math.max(0, Math.floor(p * (ordenado.length - 1) + 0.5)))] : null);
const r1 = (x) => (x == null || !Number.isFinite(x) ? null : Math.round(x * 10) / 10);
const r2 = (x) => (x == null || !Number.isFinite(x) ? null : Math.round(x * 100) / 100);
const r3 = (x) => (x == null || !Number.isFinite(x) ? null : Math.round(x * 1000) / 1000);
const pct = (a, b) => (b ? r1((a * 100) / b) : null);
const clase = (n) => (n <= 4 ? "3-4" : n <= 9 ? "5-9" : "10+");
function insOrd(a, x) { let lo = 0, hi = a.length; while (lo < hi) { const m = (lo + hi) >> 1; if (a[m] < x) lo = m + 1; else hi = m; } a.splice(lo, 0, x); }
const medOrd = (a) => (a && a.length ? (a.length % 2 ? a[(a.length - 1) / 2] : (a[a.length / 2 - 1] + a[a.length / 2]) / 2) : null);
/* Una serie de valores con la fecha de RECEPCIÓN del proceso del que salen: la mediana de todo lo conocido (`desde` null)
   o solo de lo recibido desde una fecha (la ventana). Menos de `min` valores → null («sin dato», jamás 0). */
class Serie {
  constructor() { this.ord = []; this.fechas = []; this.vals = []; }
  meter(d, v) { insOrd(this.ord, v); this.fechas.push(d); this.vals.push(v); }
  mediana(desde, min = 1) {
    if (!desde) return this.ord.length >= min ? medOrd(this.ord) : null;
    const a = []; for (let i = 0; i < this.vals.length; i++) if (this.fechas[i] >= desde) a.push(this.vals[i]);
    return a.length >= min ? mediana(a) : null;
  }
}
function meterSerie(mapa, k, d, v) { let a = mapa.get(k); if (!a) mapa.set(k, (a = new Serie())); a.meter(d, v); }
const restarDias = (d, dias) => new Date(Date.UTC(+d.slice(0, 4), +d.slice(5, 7) - 1, +d.slice(8, 10)) - dias * 864e5).toISOString().slice(0, 10);

/* ── la base ─────────────────────────────────────────────────────────────── */
function cargar(dir) {
  const filas = []; let sinFecha = 0;
  for (const l of fs.readFileSync(path.join(dir, "base_precio.jsonl"), "utf8").split("\n")) {
    if (!l) continue;
    const x = JSON.parse(l);
    x.d = dia(x.f); x.da = dia(x.fa);
    if (!x.d) { sinFecha++; continue; }
    x.pcts = x.ofertas.map((o) => o.pct); x.n = x.pcts.length;
    x.pp = !!(x.tres && x.limpio);                    // población de precio
    if (x.pp) { x.c = mediana(x.pcts); x.cl = clase(x.n); }
    filas.push(x);
  }
  filas.sort((a, b) => (a.d < b.d ? -1 : a.d > b.d ? 1 : a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  return { filas, sinFecha };
}

/* ── el motor: fracción de los cuatro métodos en que la oferta propia queda primera ──
   Entra como una oferta más a `p` % del presupuesto; un empate en el primer puesto se reparte (1/k). */
function fraccion(pcts, p, max) {
  const v = pcts.concat([p]);
  let t = 0;
  for (const m of M.METODOS) {
    const pr = M.primeros(v, m, max);
    if (pr && pr.includes(v.length - 1)) t += 0.25 / pr.length;
  }
  return t;
}

/* ── identidad del oferente ENTRE procesos ────────────────────────────────
   NIT válido; si no, nombre comparable. El código de proveedor de SECOP NO se usa (ver la base:
   con NIT de relleno el mismo código sale bajo consorcios distintos). Una oferta se guarda bajo
   TODAS sus llaves; al buscar, un oferente con NIT se busca por NIT y uno sin NIT, por nombre. */
const llavesGuardar = (o) => o.ids.filter((i) => i[0] === "n" || i[0] === "o");
const llavesBuscar = (o) => { const n = o.ids.filter((i) => i[0] === "n"); return n.length ? n : o.ids.filter((i) => i[0] === "o"); };
function previasDe(o, H, desde) {
  const vistos = new Set(), out = [];
  for (const k of llavesBuscar(o)) for (const b of H.ofertas.get(k) || []) if ((!desde || b.d >= desde) && !vistos.has(b.proc)) { vistos.add(b.proc); out.push(b); }
  return out;
}

/* ── A · las referencias, anunciadas proceso por proceso con lo que ya se conocía ────────────
   `ventana` (días, o null = todo el historial): solo cuenta lo RECIBIDO en ese lapso antes del proceso que se anuncia.
   El centro del grupo baja año tras año (menor cuantía: 97,7 en 2020, 95,0 en 2026), así que una mediana de todo el
   historial llega alta; la ventana se ELIGE con 2025 (ver elegirVentana). */
/* Desde qué día se CONOCE un proceso: su adjudicación («estricto») o su recepción («recepcion»). Sin fecha de
   adjudicación legible, en el modo estricto no se sabe cuándo se conoció: no entra a ningún historial (null). */
const disponibleEl = (x, modo) => (modo === "recepcion" ? x.d : x.da && x.da >= x.d ? x.da : null);
function anunciar(F, modo, ventana = null) {
  const cola = F.map((x) => ({ x, t: disponibleEl(x, modo) })).filter((e) => e.t != null)
    .sort((a, b) => (a.t < b.t ? -1 : a.t > b.t ? 1 : a.x.id < b.x.id ? -1 : a.x.id > b.x.id ? 1 : 0));
  const H = { gEnt: new Map(), gTam: new Map(), gMod: new Serie(), cEnt: new Map(), cTam: new Map(), cMod: new Serie(), cClase: new Map(),
    nEnt: new Map(), nTam: new Map(), nMod: new Serie(), ofertas: new Map() };
  /* el NIVEL del mercado que se anunciaba para cada proceso el día de su recepción (el centro de su modalidad y tamaño
     con lo conocido entonces): la costumbre RELATIVA de un oferente es cuánto se aparta de ese nivel */
  const nivel = new Map();
  const aprender = (x) => {
    if (x.pct_adj != null && x.n_resp != null && x.n_resp >= 1) { if (x.ent) meterSerie(H.gEnt, x.ent, x.d, x.pct_adj); meterSerie(H.gTam, x.t, x.d, x.pct_adj); H.gMod.meter(x.d, x.pct_adj); }
    if (x.n_resp != null && x.n_resp >= 1) { if (x.ent) meterSerie(H.nEnt, x.ent, x.d, x.n_resp); meterSerie(H.nTam, x.t, x.d, x.n_resp); H.nMod.meter(x.d, x.n_resp); }
    if (x.limpio) { const nv = nivel.get(x.id);
      for (const o of x.ofertas) { const b = { pct: o.pct, proc: x.id, tres: !!x.tres, d: x.d, rel: nv != null ? o.pct - nv : null }; for (const k of llavesGuardar(o)) { let a = H.ofertas.get(k); if (!a) H.ofertas.set(k, (a = [])); a.push(b); } } }
    if (x.pp) { if (x.ent) meterSerie(H.cEnt, x.ent, x.d, x.c); meterSerie(H.cTam, x.t, x.d, x.c); H.cMod.meter(x.d, x.c); meterSerie(H.cClase, x.cl, x.d, x.c); }
  };
  const refs = new Map();
  let j = 0;
  for (const T of F) {
    if (!T.pp && !T.limpio) continue;
    while (j < cola.length && cola[j].t < T.d) aprender(cola[j++].x);
    const desde = ventana ? restarDias(T.d, ventana) : null;
    const med = (mapa, k, min = 1) => { const a = mapa.get(k); return a ? a.mediana(desde, min) : null; };
    /* el respaldo: la ventana por tamaño; si está vacía, la modalidad en la ventana; si no, todo lo conocido */
    const cTam = med(H.cTam, T.t) ?? H.cMod.mediana(desde) ?? H.cMod.mediana(null);
    nivel.set(T.id, cTam);
    if (!T.pp) continue;
    const gTam = med(H.gTam, T.t) ?? H.gMod.mediana(desde) ?? H.gMod.mediana(null);
    const egEnt = T.ent ? med(H.gEnt, T.ent, MIN_GANADOR) : null, ecEnt = T.ent ? med(H.cEnt, T.ent, MIN_CENTROS) : null;
    const r = {
      entidad_ganador: egEnt ?? gTam, ganador_de_la_entidad: egEnt != null,
      entidad_centro: ecEnt ?? cTam, centro_de_la_entidad: ecEnt != null,
      tamano_centro: cTam,
      oraculo_n: med(H.cClase, T.cl) ?? cTam,
      n_anunciado: (T.ent ? med(H.nEnt, T.ent, MIN_N_ENTIDAD) : null) ?? med(H.nTam, T.t) ?? H.nMod.mediana(desde) ?? H.nMod.mediana(null),
      centro_real: T.c,
    };
    const cost = [], cost3 = [], costR = []; r.porOferta = [];
    for (const o of T.ofertas) {
      /* costumbre en % del presupuesto: sus ofertas previas DENTRO de la ventana; costumbre relativa: todas sus
         ofertas previas, cada una medida contra el nivel que se anunciaba para su proceso */
      const todasLasPrevias = previasDe(o, H, null), prev = desde ? todasLasPrevias.filter((b) => b.d >= desde) : todasLasPrevias;
      const todas = prev.map((b) => b.pct), en3 = prev.filter((b) => b.tres).map((b) => b.pct), rel = todasLasPrevias.filter((b) => b.rel != null).map((b) => b.rel);
      const c1 = todas.length >= MIN_COSTUMBRE ? mediana(todas) : null, c3 = en3.length >= MIN_COSTUMBRE ? mediana(en3) : null;
      const cR = rel.length >= MIN_COSTUMBRE && cTam != null ? cTam + mediana(rel) : null;
      if (c1 != null) cost.push(c1);
      if (c3 != null) cost3.push(c3);
      if (cR != null) costR.push(cR);
      r.porOferta.push({ pct: o.pct, previas: todas.length, costumbre: c1, costumbre_estable: todas.length >= MIN_ESTABLE ? c1 : null, relativa: cR, relativa_estable: rel.length >= MIN_ESTABLE ? cR : null,
        con_nit: o.ids.some((i) => i[0] === "n"), llave: llavesBuscar(o)[0] || null });
    }
    r.aplica = cost.length >= 1 && cost.length * 2 >= T.n;      // «si menos de la mitad tiene historial, cae a entidad_centro»
    r.aplica3 = cost3.length >= 1 && cost3.length * 2 >= T.n;
    r.aplicaR = costR.length >= 1 && costR.length * 2 >= T.n;
    r.identidad = r.aplica ? mediana(cost) : r.entidad_centro;
    r.identidad_3mas = r.aplica3 ? mediana(cost3) : r.entidad_centro;
    r.identidad_relativa = r.aplicaR ? mediana(costR) : r.entidad_centro;
    r.con_costumbre = cost.length;
    refs.set(T.id, r);
  }
  return { refs, sin_fecha_de_disponibilidad: F.length - cola.length };
}

/* ── la mezcla: mínimos cuadrados ajustados SOLO con lo anterior al corte ──────────────────── */
const NOMBRES_RASGOS = ["constante", "entidad_centro", "identidad_aplica", "identidad_menos_entidad_centro", "identidad_relativa_aplica", "identidad_relativa_menos_entidad_centro", "log_oferentes_anunciados", "tramo_de_tamano", "tamano_centro"];
const rasgos = (T, r) => [1, r.entidad_centro, r.aplica ? 1 : 0, r.aplica ? r.identidad - r.entidad_centro : 0, r.aplicaR ? 1 : 0, r.aplicaR ? r.identidad_relativa - r.entidad_centro : 0, Math.log(r.n_anunciado), T.t, r.tamano_centro];
const completo = (T, r) => r && r.entidad_centro != null && r.n_anunciado != null && r.n_anunciado > 0 && r.entidad_ganador != null && T.t != null;
function minimosCuadrados(X, y) {
  const k = X[0].length, A = Array.from({ length: k }, () => new Array(k + 1).fill(0));
  for (let i = 0; i < X.length; i++) for (let a = 0; a < k; a++) { for (let b = 0; b < k; b++) A[a][b] += X[i][a] * X[i][b]; A[a][k] += X[i][a] * y[i]; }
  for (let a = 1; a < k; a++) A[a][a] += 1e-8 * X.length;   // un pelo de regularización: un rasgo que nunca varía no rompe el ajuste
  for (let c = 0; c < k; c++) {
    let p = c; for (let f = c + 1; f < k; f++) if (Math.abs(A[f][c]) > Math.abs(A[p][c])) p = f;
    [A[c], A[p]] = [A[p], A[c]];
    if (Math.abs(A[c][c]) < 1e-12) return null;
    for (let f = 0; f < k; f++) if (f !== c) { const m = A[f][c] / A[c][c]; for (let b = c; b <= k; b++) A[f][b] -= m * A[c][b]; }
  }
  return A.map((fila, i) => fila[k] / fila[i]);
}
function ajustarMezcla(F, refs, corte, modo) {
  const X = [], y = [];
  for (const T of F) { const t = disponibleEl(T, modo); if (!T.pp || t == null || t >= corte) continue; const r = refs.get(T.id); if (!completo(T, r)) continue; X.push(rasgos(T, r)); y.push(T.c); }   // su centro ya se conocía antes del corte
  if (X.length < 30) return { beta: null, procesos: X.length };
  return { beta: minimosCuadrados(X, y), procesos: X.length };
}
const predecir = (beta, T, r) => (beta ? rasgos(T, r).reduce((s, x, i) => s + x * beta[i], 0) : null);

/* ── resumen del error de una referencia ──────────────────────────────────── */
function resumenError(errores) {   // errores: referencia − centro real
  if (!errores.length) return null;
  const a = errores.map(Math.abs);
  return { procesos: a.length, error_medio: r2(media(a)), error_mediano: r2(mediana(a)), a_1_punto_pct: pct(a.filter((e) => e <= 1).length, a.length), a_2_puntos_pct: pct(a.filter((e) => e <= 2).length, a.length), sesgo: r2(media(errores)) };
}

/* ── B · estrategias ─────────────────────────────────────────────────────── */
const interpolar = (curva, p) => { const q = Math.min(100, Math.max(85, p)), k = Math.min(FIJOS.length - 2, Math.floor((q - 85) / 0.5)), f = (q - FIJOS[k]) / 0.5; return curva[k] * (1 - f) + curva[k + 1] * f; };
const precioDe = (ref, delta) => Math.min(PRECIO_MAXIMO, ref + delta);

/* Para un conjunto de procesos: la curva de fijos por proceso y, por familia y desplazamiento, lo ganado y el precio. */
function tablero(S, refsDe, max, deltas) {
  const N = S.length, fijo = FIJOS.map(() => new Float64Array(N));
  const est = {};
  for (const fam of FAMILIAS_TODAS) est[fam] = deltas.map(() => ({ w: new Float64Array(N), p: new Float64Array(N) }));
  for (let i = 0; i < N; i++) {
    const T = S[i], r = refsDe(T);
    for (let k = 0; k < FIJOS.length; k++) fijo[k][i] = fraccion(T.pcts, FIJOS[k], max);
    for (const fam of FAMILIAS_TODAS) for (let d = 0; d < deltas.length; d++) {
      if (r[fam] == null || !Number.isFinite(r[fam])) throw new Error(`referencia «${fam}» sin dato en ${T.id}: una ausencia no puede volverse precio`);
      const p = precioDe(r[fam], deltas[d]);
      est[fam][d].p[i] = p; est[fam][d].w[i] = fraccion(T.pcts, p, max);
    }
  }
  return { N, fijo, est, deltas };
}
const mediaDe = (a, idx) => { let s = 0; if (idx) { for (let i = 0; i < idx.length; i++) s += a[idx[i]]; return s / idx.length; } for (let i = 0; i < a.length; i++) s += a[i]; return s / a.length; };
function resumenEstrategia(Tb, e, idx) {
  const gana = mediaDe(e.w, idx), precio = mediaDe(e.p, idx), curva = Tb.fijo.map((f) => mediaDe(f, idx));
  const eq = interpolar(curva, precio);
  return { gana, precio, eq, ventaja: gana - eq };
}
/* Intervalo del 95 % de la ventaja frente al fijo equivalente, remuestreando PROCESOS. */
function intervalos(Tb, lista, semilla, idxBase) {
  const base = idxBase || Array.from({ length: Tb.N }, (_, i) => i), n = base.length, rng = azar(semilla);
  const muestras = lista.map(() => new Float64Array(REPLICAS)), idx = new Int32Array(n);
  for (let b = 0; b < REPLICAS; b++) {
    for (let i = 0; i < n; i++) idx[i] = base[Math.floor(rng() * n)];
    const curva = Tb.fijo.map((f) => mediaDe(f, idx));
    for (let s = 0; s < lista.length; s++) muestras[s][b] = mediaDe(lista[s].w, idx) - interpolar(curva, mediaDe(lista[s].p, idx));
  }
  return muestras.map((m) => { const a = Array.from(m).sort((x, y) => x - y); return [cuantil(a, 0.025), cuantil(a, 0.975)]; });
}
const filaEstrategia = (n, r, ic) => ({ procesos: n, primero_pct: r1(r.gana * 100), precio_medio: r2(r.precio), fijo_del_mismo_precio_medio_pct: r1(r.eq * 100), ventaja_pp: r1(r.ventaja * 100), ...(ic ? { ic95_ventaja_pp: [r1(ic[0] * 100), r1(ic[1] * 100)] } : {}) });

/* valor esperado en puntos del presupuesto por proceso ofertado, con piso de costo c: si la regla pide un precio que
   no deja margen (p ≤ c) no se oferta y ese proceso aporta 0 [supuesto] */
const valorDe = (e, c, idx) => { let s = 0; const n = idx ? idx.length : e.w.length; for (let k = 0; k < n; k++) { const i = idx ? idx[k] : k; if (e.p[i] > c) s += e.w[i] * (e.p[i] - c); } return s / n; };

/* ── C · candidatos a «mejor precio único» conociendo las ofertas rivales ─────────────────── */
function candidatos(pcts, paso = 0.05) {
  const s = new Set();
  const pasos = Math.round(15 / paso);
  for (let k = 0; k <= pasos; k++) s.add(Math.round((85 + k * paso) * 1000) / 1000);
  const a = pcts.slice().sort((x, y) => x - y), n = a.length;
  const meter = (x) => { if (x > 0 && x <= PRECIO_MAXIMO) s.add(x); };
  for (const r of a) { meter(r - EPS); meter(r); meter(r + EPS); }
  for (let i = 0; i + 1 < n; i++) meter((a[i] + a[i + 1]) / 2);
  const suma = a.reduce((t, x) => t + x, 0), ma = suma / n, mg = Math.exp(a.reduce((t, x) => t + Math.log(x), 0) / n);
  /* «cada media»: mediana, media geométrica y aritmética de los rivales, la media aritmética baja de los rivales y el
     punto fijo de la media aritmética baja CON la oferta propia: p = (mín + (suma + p)/(n+1))/2 */
  for (const v of [mediana(a), mg, ma, (a[0] + ma) / 2, (a[0] * (n + 1) + suma) / (2 * n + 1)]) { meter(v - EPS); meter(v); meter(v + EPS); }
  return [...s].sort((x, y) => x - y);
}
function techosDe(pcts, max, paso) {
  const cs = candidatos(pcts, paso), mejorM = M.METODOS.map(() => 0);
  let mejor = -1, pMejor = null, nMejor = 0;
  for (const p of cs) {
    const v = pcts.concat([p]);
    let t = 0;
    M.METODOS.forEach((m, k) => { const pr = M.primeros(v, m, max); const w = pr && pr.includes(v.length - 1) ? 1 / pr.length : 0; if (w > mejorM[k]) mejorM[k] = w; t += 0.25 * w; });
    if (t > mejor + 1e-12) { mejor = t; pMejor = p; nMejor = 1; } else if (Math.abs(t - mejor) <= 1e-12) { pMejor = p; nMejor++; }   // a igual resultado, el precio MÁS ALTO
  }
  return { sorteo: mejor, precio: pMejor, total: media(mejorM), porMetodo: mejorM };
}

/* Las referencias de una modalidad con una ventana, y la mezcla encima: para elegir en 2025 se ajusta con lo anterior
   a 2025; para probar en 2026, con lo anterior a 2026. Sin ajuste posible la mezcla cae a entidad_centro (y se ve en
   `coeficientes: null`). */
function prepararReferencias(F, modo, ventana) {
  const { refs, sin_fecha_de_disponibilidad } = anunciar(F, modo, ventana);
  const PP = F.filter((x) => x.pp);
  const mA = ajustarMezcla(F, refs, CORTE_ELEGIR, modo), mB = ajustarMezcla(F, refs, CORTE_PRUEBA, modo);
  for (const T of PP) { const r = refs.get(T.id); r.mezcla = completo(T, r) ? predecir(T.d < CORTE_PRUEBA ? mA.beta : mB.beta, T, r) : null; if (r.mezcla == null && completo(T, r)) r.mezcla = r.entidad_centro; }
  return { refs, sin_fecha_de_disponibilidad, PP, mA, mB };
}
const REFS_A = ["tamano_centro", "entidad_ganador", "entidad_centro", "identidad", "identidad_3mas", "identidad_relativa", "mezcla", "oraculo_n"];

/* El conjunto con que se ELIGE (ventana, desplazamiento, precio fijo): recibido en 2025 y ya conocido antes de 2026.
   Un proceso de 2025 adjudicado en 2026 no puede decidir nada que se use desde el 1 de enero de 2026. */
const paraElegir = (T, modo) => { const t = disponibleEl(T, modo); return T.d >= CORTE_ELEGIR && T.d < CORTE_PRUEBA && t != null && t < CORTE_PRUEBA; };

/* ── la ventana del historial se ELIGE con 2025 (menor error medio de entidad_centro, que sí se conoce antes) ── */
function elegirVentana(F, modo) {
  const tabla = VENTANAS.map((v) => {
    const { refs, PP } = prepararReferencias(F, modo, v);
    const S25 = PP.filter((T) => paraElegir(T, modo) && completo(T, refs.get(T.id))), S26 = PP.filter((T) => T.d >= CORTE_PRUEBA && completo(T, refs.get(T.id)));
    const err = (S) => Object.fromEntries(REFS_A.map((k) => [k, S.length ? r2(media(S.map((T) => Math.abs(refs.get(T.id)[k] - T.c)))) : null]));
    const ses = (S) => Object.fromEntries(REFS_A.map((k) => [k, S.length ? r2(media(S.map((T) => refs.get(T.id)[k] - T.c))) : null]));
    return { ventana_dias: v, rotulo: v ? `lo recibido en los ${v} días anteriores` : "todo el historial", procesos_2025: S25.length, procesos_2026: S26.length,
      error_medio_2025: err(S25), error_medio_2026_no_elegida_fuera_de_muestra: err(S26), sesgo_2026: ses(S26),
      identidad_aplica_2026_pct: pct(S26.filter((T) => refs.get(T.id).aplica).length, S26.length), entidad_con_historial_2026_pct: pct(S26.filter((T) => refs.get(T.id).centro_de_la_entidad).length, S26.length) };
  });
  let k = 0; for (let i = 1; i < tabla.length; i++) { const a = tabla[i].error_medio_2025.entidad_centro, b = tabla[k].error_medio_2025.entidad_centro; if (a != null && (b == null || a < b - 1e-9)) k = i; }
  return { elegida_dias: tabla[k].ventana_dias, elegida: tabla[k].rotulo, criterio: "menor error medio de entidad_centro en 2025 (aprendiendo con lo anterior)", tabla };
}

/* ── todo, para una modalidad ────────────────────────────────────────────── */
function medirModalidad(F, mod, modo, completa, guardar, sinIguales = false, ventana = null) {
  const max = MAXIMO[mod], R = {};
  const { refs, sin_fecha_de_disponibilidad, PP, mA, mB } = prepararReferencias(F, modo, ventana);
  /* `sinIguales` (sensibilidad): fuera de la elección y de la prueba los procesos con todas las ofertas al mismo valor */
  const iguales = (T) => Math.max(...T.pcts) - Math.min(...T.pcts) < 1e-7;
  const usable = (T) => completo(T, refs.get(T.id)) && !(sinIguales && iguales(T));
  const elegir = PP.filter((T) => paraElegir(T, modo) && usable(T)), prueba = PP.filter((T) => T.d >= CORTE_PRUEBA && usable(T));
  R.poblacion = {
    procesos_de_la_modalidad: F.length, poblacion_de_precio: PP.length, sin_fecha_de_disponibilidad,
    aprendizaje_antes_de_2026: PP.filter((T) => T.d < CORTE_PRUEBA).length, de_ellos_antes_de_2025: PP.filter((T) => T.d < CORTE_ELEGIR).length,
    para_elegir_2025: elegir.length, recibidos_en_2025_y_adjudicados_despues_no_eligen: PP.filter((T) => T.d >= CORTE_ELEGIR && T.d < CORTE_PRUEBA).length - PP.filter((T) => paraElegir(T, modo)).length, prueba_2026: prueba.length, prueba_2026_sin_referencias: PP.filter((T) => T.d >= CORTE_PRUEBA).length - prueba.length,
    prueba_por_oferentes: Object.fromEntries(CLASES.map((c) => [c, prueba.filter((T) => T.cl === c).length])),
    ofertas_en_la_prueba: prueba.reduce((s, T) => s + T.n, 0), prueba_hasta: prueba.length ? prueba[prueba.length - 1].d : null,
    prueba_con_ganador_emparejado: prueba.filter((T) => T.usable && T.g >= 0).length,
    prueba_todas_al_mismo_valor: prueba.filter(iguales).length,
  };
  R.mezcla = { rasgos: NOMBRES_RASGOS, para_elegir_en_2025: { procesos: mA.procesos, coeficientes: mA.beta ? mA.beta.map(r3) : null }, para_probar_en_2026: { procesos: mB.procesos, coeficientes: mB.beta ? mB.beta.map(r3) : null } };

  /* A · el error de cada referencia en 2026 */
  const errDe = (S, k) => S.map((T) => refs.get(T.id)[k] - T.c);
  R.A_centro = { nota: "Error = referencia − centro real (mediana de todas las ofertas del proceso), en puntos del presupuesto. «identidad» y «mezcla» usan quién llegó de verdad: es el techo de saber quién llega, no algo que se conozca antes. «oraculo_n» usa cuántos llegaron de verdad.",
    todas: Object.fromEntries(REFS_A.map((k) => [k, resumenError(errDe(prueba, k))])),
    por_oferentes: Object.fromEntries(CLASES.map((c) => [c, Object.fromEntries(REFS_A.map((k) => [k, resumenError(errDe(prueba.filter((T) => T.cl === c), k))]))])) };
  const conId = prueba.filter((T) => refs.get(T.id).aplica), conId3 = prueba.filter((T) => refs.get(T.id).aplica3), conIdR = prueba.filter((T) => refs.get(T.id).aplicaR), conEnt = prueba.filter((T) => refs.get(T.id).centro_de_la_entidad);
  const ofertasPrueba = prueba.flatMap((T) => refs.get(T.id).porOferta);
  R.A_cobertura = {
    identidad_aplica: { procesos: conId.length, de: prueba.length, pct: pct(conId.length, prueba.length), por_oferentes: Object.fromEntries(CLASES.map((c) => [c, pct(conId.filter((T) => T.cl === c).length, prueba.filter((T) => T.cl === c).length)])) },
    identidad_3mas_aplica: { procesos: conId3.length, pct: pct(conId3.length, prueba.length) },
    identidad_relativa_aplica: { procesos: conIdR.length, de: prueba.length, pct: pct(conIdR.length, prueba.length), por_oferentes: Object.fromEntries(CLASES.map((c) => [c, pct(conIdR.filter((T) => T.cl === c).length, prueba.filter((T) => T.cl === c).length)])) },
    centro_de_la_entidad_con_historial: { procesos: conEnt.length, pct: pct(conEnt.length, prueba.length) },
    ganador_de_la_entidad_con_historial: { procesos: prueba.filter((T) => refs.get(T.id).ganador_de_la_entidad).length, pct: pct(prueba.filter((T) => refs.get(T.id).ganador_de_la_entidad).length, prueba.length) },
    ofertas: { total: ofertasPrueba.length, con_nit_pct: pct(ofertasPrueba.filter((o) => o.con_nit).length, ofertasPrueba.length), con_costumbre_pct: pct(ofertasPrueba.filter((o) => o.costumbre != null).length, ofertasPrueba.length),
      con_costumbre_relativa_pct: pct(ofertasPrueba.filter((o) => o.relativa != null).length, ofertasPrueba.length),
      con_costumbre_entre_las_de_nit_pct: pct(ofertasPrueba.filter((o) => o.con_nit && o.costumbre != null).length, ofertasPrueba.filter((o) => o.con_nit).length),
      con_costumbre_entre_las_de_solo_nombre_pct: pct(ofertasPrueba.filter((o) => !o.con_nit && o.costumbre != null).length, ofertasPrueba.filter((o) => !o.con_nit).length) },
    donde_aplica_identidad: Object.fromEntries(["tamano_centro", "entidad_centro", "identidad", "mezcla"].map((k) => [k, resumenError(errDe(conId, k))])),
    donde_aplica_identidad_relativa: Object.fromEntries(["tamano_centro", "entidad_centro", "identidad_relativa", "mezcla"].map((k) => [k, resumenError(errDe(conIdR, k))])),
    donde_la_entidad_tiene_historial: Object.fromEntries(["tamano_centro", "entidad_ganador", "entidad_centro"].map((k) => [k, resumenError(errDe(conEnt, k))])),
  };
  /* la costumbre: ¿repiten su porcentaje o siguen al grupo? (oferentes con 5 o más ofertas previas) */
  const costumbre = (S, campo) => {
    const propia = [], grupo = [], X = [], y = [], quien = new Set();
    for (const T of S) { const po = refs.get(T.id).porOferta; po.forEach((o, i) => {
      if (o[campo] == null) return;
      const otros = mediana(T.pcts.filter((_, k) => k !== i));
      propia.push(o.pct - o[campo]); grupo.push(o.pct - otros); X.push([1, o[campo], otros]); y.push(o.pct); quien.add(o.llave);
    }); }
    if (propia.length < 10) return { ofertas: propia.length, nota: "muy pocas para medir" };
    const b = minimosCuadrados(X, y);
    return { ofertas: propia.length, oferentes_distintos: quien.size,
      frente_a_su_costumbre: { desviacion: r2(desv(propia)), distancia_mediana: r2(mediana(propia.map(Math.abs))), a_1_punto_pct: pct(propia.filter((e) => Math.abs(e) <= 1).length, propia.length), sesgo: r2(media(propia)) },
      frente_al_centro_de_los_demas: { desviacion: r2(desv(grupo)), distancia_mediana: r2(mediana(grupo.map(Math.abs))), a_1_punto_pct: pct(grupo.filter((e) => Math.abs(e) <= 1).length, grupo.length), sesgo: r2(media(grupo)) },
      regresion_oferta: b ? { nota: "oferta = a + b1 × su costumbre + b2 × centro de los demás (mínimos cuadrados, descriptivo)", constante: r2(b[0]), peso_de_su_costumbre: r3(b[1]), peso_del_centro_de_los_demas: r3(b[2]) } : null };
  };
  R.A_costumbre = { nota: `Ofertas de oferentes con ${MIN_ESTABLE} o más ofertas previas conocidas en la modalidad. «Su costumbre» en % = mediana de sus ofertas previas dentro de la ventana del historial; «relativa» = el nivel que se anuncia para el proceso (centro de su modalidad y tamaño) más la mediana de cuánto se apartó ese oferente del nivel en TODAS sus ofertas previas. «Centro de los demás» = mediana de las otras ofertas del mismo proceso (sin la suya; no se conoce antes).`,
    en_2026: { costumbre_en_pct: costumbre(prueba, "costumbre_estable"), costumbre_relativa: costumbre(prueba, "relativa_estable") },
    en_2025: { costumbre_en_pct: costumbre(elegir, "costumbre_estable"), costumbre_relativa: costumbre(elegir, "relativa_estable") } };
  guardar();

  /* B · estrategias: el desplazamiento se elige en 2025 y se informa en 2026 */
  const refsDe = (T) => refs.get(T.id);
  const tE = tablero(elegir, refsDe, max, DELTAS_AMPLIA), tP = tablero(prueba, refsDe, max, DELTAS_AMPLIA);
  const iD = DELTAS.map((d) => DELTAS_AMPLIA.indexOf(d));
  const B = { nota: "Fracción de los cuatro métodos (25 % cada uno) en que la oferta propia queda primera entrando como una oferta más, con todas hábiles [supuesto]. «ventaja» = lo ganado menos lo que gana un precio FIJO del mismo precio medio (curva de fijos interpolada sobre los mismos procesos); intervalo del 95 % por remuestreo de procesos (" + REPLICAS + " réplicas, semilla " + SEMILLA + ").",
    procesos_para_elegir_2025: elegir.length, procesos_de_prueba_2026: prueba.length,
    azar_pct_2026: r1(media(prueba.map((T) => 100 / (T.n + 1)))),
    precio_fijo_2026: FIJOS_TABLA.map((p) => ({ precio: p, primero_pct: r1(mediaDe(tP.fijo[FIJOS.indexOf(p)]) * 100) })),
    precio_fijo_2025: FIJOS_TABLA.map((p) => ({ precio: p, primero_pct: r1(mediaDe(tE.fijo[FIJOS.indexOf(p)]) * 100) })),
    familias: {} };
  const listaIC = [], dondeIC = [];
  for (const fam of FAMILIAS_TODAS) {
    const enE = iD.map((d) => resumenEstrategia(tE, tE.est[fam][d])), enP = iD.map((d) => resumenEstrategia(tP, tP.est[fam][d]));
    let k = 0; for (let i = 1; i < enE.length; i++) if (enE[i].ventaja > enE[k].ventaja + 1e-12) k = i;
    B.familias[fam] = { se_conoce_antes: !NO_SE_CONOCE_ANTES.has(fam), delta_elegido_en_2025: DELTAS[k], criterio: "mayor ventaja en 2025 frente al fijo del mismo precio medio",
      en_2025_con_ese_delta: filaEstrategia(elegir.length, enE[k]), en_2026_con_ese_delta: filaEstrategia(prueba.length, enP[k]),
      rejilla_2026_no_elegida_fuera_de_muestra: DELTAS.map((d, i) => ({ delta: d, ...filaEstrategia(prueba.length, enP[i]) })),
      rejilla_2025: DELTAS.map((d, i) => ({ delta: d, ...filaEstrategia(elegir.length, enE[i]) })) };
    iD.forEach((d, i) => { listaIC.push(tP.est[fam][d]); dondeIC.push([fam, i, i === k]); });
  }
  if (prueba.length >= 20) {
    const ics = intervalos(tP, listaIC, SEMILLA);
    dondeIC.forEach(([fam, i, elegido], s) => {
      const ic = [r1(ics[s][0] * 100), r1(ics[s][1] * 100)];
      B.familias[fam].rejilla_2026_no_elegida_fuera_de_muestra[i].ic95_ventaja_pp = ic;
      if (elegido) B.familias[fam].en_2026_con_ese_delta.ic95_ventaja_pp = ic;
    });
  }
  /* por tramo de oferentes, con el desplazamiento elegido (el tramo no se conoce antes: es solo lectura) */
  B.elegidas_por_oferentes_2026 = Object.fromEntries(CLASES.map((c) => {
    const idx = []; prueba.forEach((T, i) => { if (T.cl === c) idx.push(i); });
    if (idx.length < 20) return [c, { procesos: idx.length, nota: "muy pocos" }];
    return [c, { procesos: idx.length, azar_pct: r1(media(idx.map((i) => 100 / (prueba[i].n + 1)))), precio_fijo: [92, 94, 95, 96, 97].map((p) => ({ precio: p, primero_pct: r1(mediaDe(tP.fijo[FIJOS.indexOf(p)], idx) * 100) })),
      familias: Object.fromEntries(FAMILIAS_TODAS.map((fam) => { const d = DELTAS_AMPLIA.indexOf(B.familias[fam].delta_elegido_en_2025); return [fam, filaEstrategia(idx.length, resumenEstrategia(tP, tP.est[fam][d], idx))]; })) }];
  }));
  /* donde la identidad aplica (la mitad o más de los oferentes con costumbre): el mismo desplazamiento elegido */
  for (const [campo, fam0, rotulo] of [["aplica", "identidad", "donde_aplica_identidad_2026"], ["aplicaR", "identidad_relativa", "donde_aplica_identidad_relativa_2026"]]) {
    const idx = []; prueba.forEach((T, i) => { if (refs.get(T.id)[campo]) idx.push(i); });
    if (idx.length >= 20) {
      const fams = ["tamano_centro", "entidad_centro", fam0, "mezcla", "centro_real"], lista = fams.map((fam) => tP.est[fam][DELTAS_AMPLIA.indexOf(B.familias[fam].delta_elegido_en_2025)]);
      const ics = intervalos(tP, lista, SEMILLA + 1, idx);
      B[rotulo] = { procesos: idx.length, familias: Object.fromEntries(fams.map((fam, s) => [fam, { delta: B.familias[fam].delta_elegido_en_2025, ...filaEstrategia(idx.length, resumenEstrategia(tP, lista[s], idx), ics[s]) }])) };
    } else B[rotulo] = { procesos: idx.length, nota: "muy pocos" };
  }
  /* el blanco: qué se gana según a cuánto del centro REAL se oferta (no se conoce antes; dice qué tan fino hay que acertar) */
  { const filas_ = prueba.map((T) => PERFIL.map((x) => fraccion(T.pcts, precioDe(T.c, x), max)));
    const col = (idx) => PERFIL.map((x, k) => ({ puntos_sobre_el_centro_real: x, primero_pct: r1(media(idx.map((i) => filas_[i][k])) * 100) }));
    const todos = prueba.map((_, i) => i);
    B.perfil_alrededor_del_centro_real_2026 = { nota: "Precio propio = centro real del proceso (mediana de las ofertas rivales) más los puntos indicados. El centro real no se conoce antes: la tabla dice cuánto vale acertarlo y qué tan rápido se pierde al errarlo.",
      todas: prueba.length ? col(todos) : [], por_oferentes: Object.fromEntries(CLASES.map((c) => { const idx = todos.filter((i) => prueba[i].cl === c); return [c, idx.length >= 20 ? col(idx) : { procesos: idx.length, nota: "muy pocos" }]; })) }; }
  R.B_estrategias = B;
  guardar();

  /* B · con dinero */
  const dinero = (deltas, fijos, rotulo) => {
    const out = { rejilla: rotulo, por_piso: {} };
    const iDs = deltas.map((d) => DELTAS_AMPLIA.indexOf(d));
    for (const c of PISOS) {
      const fj = fijos.filter((p) => p > c);
      const eFijo = (Tb, p) => ({ w: Tb.fijo[FIJOS.indexOf(p)], p: new Float64Array(Tb.N).fill(p) });
      let pf = fj[0], vf = -Infinity; for (const p of fj) { const v = valorDe(eFijo(tE, p), c); if (v > vf + 1e-12) { vf = v; pf = p; } }
      const fijoP = eFijo(tP, pf);
      const fam_ = {}; let mejor = null, mejorAntes = null;
      for (const fam of FAMILIAS_TODAS) {
        let k = 0, v = -Infinity; iDs.forEach((d, i) => { const x = valorDe(tE.est[fam][d], c); if (x > v + 1e-12) { v = x; k = i; } });
        const e = tP.est[fam][iDs[k]];
        fam_[fam] = { se_conoce_antes: !NO_SE_CONOCE_ANTES.has(fam), delta_elegido_en_2025: deltas[k], en_el_borde_de_la_rejilla: k === 0 || k === deltas.length - 1, valor_2025: r3(v), valor_2026: r3(valorDe(e, c)), primero_pct_2026: r1(mediaDe(e.w) * 100), precio_medio_2026: r2(mediaDe(e.p)), e };
        if (FAMILIAS.includes(fam) && (!mejor || v > mejor.v + 1e-12)) mejor = { fam, v };
        if (SE_CONOCEN_ANTES.includes(fam) && (!mejorAntes || v > mejorAntes.v + 1e-12)) mejorAntes = { fam, v };
      }
      /* intervalo de la diferencia en 2026 (misma elección de 2025), remuestreando procesos */
      const rng = azar(SEMILLA + Math.round(c)), n = tP.N, idx = new Int32Array(n), nombres = Object.keys(fam_), dif = nombres.map(() => new Float64Array(REPLICAS));
      if (n >= 20) for (let b = 0; b < REPLICAS; b++) { for (let i = 0; i < n; i++) idx[i] = Math.floor(rng() * n); const vfb = valorDe(fijoP, c, idx); nombres.forEach((fam, s) => { dif[s][b] = valorDe(fam_[fam].e, c, idx) - vfb; }); }
      const vfP = valorDe(fijoP, c);
      nombres.forEach((fam, s) => { const a = Array.from(dif[s]).sort((x, y) => x - y); fam_[fam].diferencia_con_el_mejor_fijo_2026 = r3(valorDe(fam_[fam].e, c) - vfP); if (n >= 20) fam_[fam].ic95_diferencia = [r3(cuantil(a, 0.025)), r3(cuantil(a, 0.975))]; delete fam_[fam].e; });
      out.por_piso[c] = { mejor_fijo: { precio_elegido_en_2025: pf, en_el_borde_de_la_rejilla: pf === fj[0] || pf === fj[fj.length - 1], valor_2025: r3(vf), valor_2026: r3(vfP), primero_pct_2026: r1(mediaDe(fijoP.w) * 100) },
        mejor_informada_elegida_en_2025: mejor ? { familia: mejor.fam, ...fam_[mejor.fam] } : null,
        mejor_que_se_conoce_antes_elegida_en_2025: mejorAntes ? { familia: mejorAntes.fam, ...fam_[mejorAntes.fam] } : null, por_familia: fam_ };
    }
    return out;
  };
  R.B_dinero = { nota: "Valor esperado = media de [fracción de métodos ganada × (precio − piso de costo)], en puntos del presupuesto por proceso ofertado; si la regla pide un precio que no supera el piso, no se oferta (aporta 0) [supuesto]. La regla y su desplazamiento, y el precio fijo, se eligen con 2025 y se informan en 2026. «mejor_informada» elige entre " + FAMILIAS.join(", ") + " (varias usan quién llegó: no se conocen antes); «mejor_que_se_conoce_antes», entre " + SE_CONOCEN_ANTES.join(" y ") + ".",
    rejilla_del_encargo: dinero(DELTAS, FIJOS_TABLA, "fijos de 90 a 99 de medio en medio; desplazamientos " + DELTAS.join(", ")),
    rejilla_ampliada: dinero(DELTAS_AMPLIA, FIJOS, "fijos de 85 a 100 de medio en medio; desplazamientos " + DELTAS_AMPLIA.join(", ")) };
  guardar();
  if (!completa) return R;

  /* C · los techos, y la sensibilidad a hábiles */
  const rngH = azar(SEMILLA + 7);
  const tech = prueba.map((T) => {
    const t = techosDe(T.pcts, max, 0.05);
    const sorteos = []; for (let s = 0; s < SORTEOS_HABILES; s++) sorteos.push(T.pcts.filter(() => rngH() >= P_QUITAR));
    const quitando = (p) => media(sorteos.map((v) => fraccion(v, p, max)));
    return { T, t, sorteos, sorteo_quitando: quitando(t.precio), quitando };
  });
  const elegidas = Object.fromEntries(FAMILIAS_TODAS.map((fam) => [fam, B.familias[fam].delta_elegido_en_2025]));
  const C = { nota: "techo_sorteo = el mejor precio ÚNICO conociendo todas las ofertas rivales pero no el método (rejilla de 0,05 entre 85 y 100, más los puntos justo debajo, encima y entre cada par de ofertas rivales y junto a cada media): fracción media de métodos ganados. Es una cota INFERIOR del máximo verdadero (conjunto finito de candidatos). techo_total = eligiendo además el precio para cada método. «quitando» = cada rival sale con probabilidad " + P_QUITAR + " DESPUÉS de fijar el precio (" + SORTEOS_HABILES + " sorteos por proceso, semilla fija).",
    por_oferentes: {} };
  const bloque = (S) => {
    if (!S.length) return { procesos: 0 };
    const o = { procesos: S.length, techo_sorteo_pct: r1(media(S.map((x) => x.t.sorteo)) * 100), techo_total_pct: r1(media(S.map((x) => x.t.total)) * 100),
      techo_sorteo_reparto_pct: { tres_de_cuatro_o_mas: pct(S.filter((x) => x.t.sorteo >= 0.75 - 1e-9).length, S.length), dos_de_cuatro: pct(S.filter((x) => x.t.sorteo >= 0.5 - 1e-9 && x.t.sorteo < 0.75 - 1e-9).length, S.length), menos_de_dos: pct(S.filter((x) => x.t.sorteo < 0.5 - 1e-9).length, S.length) },
      precio_del_techo_sorteo: { medio: r2(media(S.map((x) => x.t.precio))), menos_centro_real_medio: r2(media(S.map((x) => x.t.precio - x.T.c))) },
      techo_total_por_metodo_pct: Object.fromEntries(M.METODOS.map((m, k) => [m, r1(media(S.map((x) => x.t.porMetodo[k])) * 100)])),
      techo_total_no_llega_en: S.filter((x) => x.t.total < 1 - 1e-9).length,
      quitando_rivales: { techo_sorteo_pct: r1(media(S.map((x) => x.sorteo_quitando)) * 100),
        precio_fijo: [92, 94, 95, 96].map((p) => ({ precio: p, todas_habiles_pct: r1(media(S.map((x) => fraccion(x.T.pcts, p, max))) * 100), quitando_pct: r1(media(S.map((x) => x.quitando(p))) * 100) })),
        familias: Object.fromEntries(FAMILIAS_TODAS.map((fam) => [fam, { delta: elegidas[fam], todas_habiles_pct: r1(media(S.map((x) => fraccion(x.T.pcts, precioDe(refs.get(x.T.id)[fam], elegidas[fam]), max))) * 100), quitando_pct: r1(media(S.map((x) => x.quitando(precioDe(refs.get(x.T.id)[fam], elegidas[fam])))) * 100) }])) } };
    return o;
  };
  C.todas = bloque(tech);
  for (const c of CLASES) C.por_oferentes[c] = bloque(tech.filter((x) => x.T.cl === c));
  /* por qué el techo total no llega al 100 %: los casos, clasificados */
  const noLlega = tech.filter((x) => x.t.total < 1 - 1e-9);
  C.por_que_el_total_no_llega = { procesos: noLlega.length, con_todas_las_ofertas_al_mismo_valor: noLlega.filter((x) => Math.max(...x.T.pcts) - Math.min(...x.T.pcts) < 1e-7).length,
    con_ofertas_rivales_repetidas: noLlega.filter((x) => new Set(x.T.pcts.map((p) => p.toFixed(6))).size < x.T.n).length,
    por_metodo: Object.fromEntries(M.METODOS.map((m, k) => [m, noLlega.filter((x) => x.t.porMetodo[k] < 1 - 1e-9).length])) };
  /* ¿cuánto deja sin ver la rejilla de 0,05? en una muestra fija (uno de cada k) se repite con 0,01 */
  { const paso = Math.max(1, Math.floor(tech.length / 150)), muestra = tech.filter((_, i) => i % paso === 0);
    C.contraste_rejilla_fina = { procesos: muestra.length, techo_sorteo_con_0_05_pct: r1(media(muestra.map((x) => x.t.sorteo)) * 100), techo_sorteo_con_0_01_pct: r1(media(muestra.map((x) => techosDe(x.T.pcts, max, 0.01).sorteo)) * 100) }; }
  R.C_techos = C;
  guardar();

  /* D · ¿a quién le habría dado el primer puesto cada método? (ganador real emparejado) */
  const conG = prueba.filter((T) => T.usable && T.g >= 0);
  const D = { nota: "Procesos de prueba con la oferta del adjudicatario emparejada (usableMotor de fase0.js) y todas las ofertas publicadas tomadas como hábiles. «primero» incluye el empate en el primer puesto. «azar» = parte de las ofertas del proceso que quedan primeras con ese método (lo que acertaría un ganador tomado al azar).", por_oferentes: {} };
  const bloqueD = (S) => {
    if (!S.length) return { procesos: 0 };
    const cuenta = Object.fromEntries(M.METODOS.map((m) => [m, 0])), azarM = Object.fromEntries(M.METODOS.map((m) => [m, 0]));
    let alguno = 0, azarAlguno = 0, todos = 0;
    for (const T of S) {
      const union = new Set(); let n = 0;
      for (const m of M.METODOS) { const pr = M.primeros(T.pcts, m, max) || []; if (pr.includes(T.g)) { cuenta[m]++; n++; } azarM[m] += pr.length / T.n; pr.forEach((i) => union.add(i)); }
      if (n > 0) alguno++; if (n === 4) todos++; azarAlguno += union.size / T.n;
    }
    const dif = S.map((T) => T.pcts[T.g] - mediana(T.pcts.filter((_, i) => i !== T.g)));   // frente al centro de los DEMÁS
    const posicion = { nota: "Oferta del adjudicatario menos la mediana de las demás ofertas del proceso, en puntos del presupuesto.", por_debajo_pct: pct(dif.filter((x) => x < -0.05).length, S.length), a_menos_de_0_05_pct: pct(dif.filter((x) => Math.abs(x) <= 0.05).length, S.length), por_encima_pct: pct(dif.filter((x) => x > 0.05).length, S.length),
      mediana: r2(mediana(dif)), entre_menos_1_y_0_pct: pct(dif.filter((x) => x >= -1 && x <= 0).length, S.length), a_mas_de_2_por_debajo_pct: pct(dif.filter((x) => x < -2).length, S.length),
      fue_la_mas_baja_pct: pct(S.filter((T) => T.pcts[T.g] === Math.min(...T.pcts)).length, S.length), fue_la_mas_alta_pct: pct(S.filter((T) => T.pcts[T.g] === Math.max(...T.pcts)).length, S.length), azar_cada_extremo_pct: r1(media(S.map((T) => 100 / T.n))) };
    return { procesos: S.length, ganador_frente_al_centro: posicion, primero_por_metodo_pct: Object.fromEntries(M.METODOS.map((m) => [m, pct(cuenta[m], S.length)])), azar_por_metodo_pct: Object.fromEntries(M.METODOS.map((m) => [m, pct(azarM[m], S.length)])),
      primero_en_alguno_de_los_cuatro_pct: pct(alguno, S.length), azar_en_alguno_pct: pct(azarAlguno, S.length), primero_en_los_cuatro_pct: pct(todos, S.length),
      media_de_los_cuatro_pct: r1(media(M.METODOS.map((m) => (cuenta[m] * 100) / S.length))), azar_media_de_los_cuatro_pct: r1(media(M.METODOS.map((m) => (azarM[m] * 100) / S.length))) };
  };
  D.todas = bloqueD(conG);
  for (const c of CLASES) D.por_oferentes[c] = bloqueD(conG.filter((T) => T.cl === c));
  R.D_ganador_real = D;
  guardar();
  return R;
}

/* ── control contra docs/PLAN_X20.md §2.5 (menor cuantía) ───────────────────────────────────
   Se repite con ESTA base lo que publicó el plan: (1) 5 a 9 ofertas, recepción desde 2025-11-01, ganador
   emparejado; (2) prueba de 2026 con 3 a 9 ofertas y la regla «centro según el historial − 0,25» de medir.js,
   reescrita aquí SOLO para el contraste (medir.js no exporta ese tramo): centro por tramo aprendido antes de 2026,
   las 6 últimas del historial de la entidad por orden de recepción, encogidas con 2 «virtuales» del tramo. */
function controlPlanX20(F) {
  const PP = F.filter((x) => x.pp);
  const uno = PP.filter((x) => x.d >= "2025-11-01" && x.n >= 5 && x.n <= 9 && x.g >= 0);
  const fijo = (S, p) => (S.length ? r1(media(S.map((x) => X20.opcionAl(x.pcts, p))) * 100) : null);
  const publicado1 = { 96.75: 9.1, 96: 11.6, 95: 15.9, 94: 20.6, 92: 25.3 };
  const R1 = { procesos: { publicado: 276, aqui: uno.length }, azar_pct: { publicado: 14.0, aqui: uno.length ? r1(media(uno.map((x) => 100 / (x.n + 1)))) : null },
    quedo_primero_pct: [96.75, 96, 95, 94, 92].map((p) => ({ precio: p, publicado: publicado1[p], aqui: fijo(uno, p) })) };
  const gP = PP.filter((x) => x.d >= CORTE_PRUEBA && x.n <= 9);
  const regla = (gA) => {
    const centroTramo = {}; for (const t of CLASES) centroTramo[t] = mediana(gA.filter((x) => x.cl === t).map((x) => x.c));
    const hEnt = {}; for (const x of gA) (hEnt[x.ent] || (hEnt[x.ent] = [])).push(x);
    let gana = 0, precio = 0, errT = 0, errE = 0;
    for (const x of gP) {
      const a = centroTramo[x.cl], h = (hEnt[x.ent] || []).slice(-6);
      const e = (h.reduce((t, y) => t + y.c, 0) + 2 * a) / (h.length + 2), q = Math.min(e - 0.25, 99.99);
      gana += X20.opcionAl(x.pcts, q); precio += q; errT += Math.abs(a - x.c); errE += Math.abs(e - x.c);
      (hEnt[x.ent] || (hEnt[x.ent] = [])).push(x);
    }
    const n = gP.length;
    return { aprende: gA.length, centro_aprendido: Object.fromEntries(CLASES.map((t) => [t, r2(centroTramo[t])])), quedo_primero_pct: n ? r1((gana * 100) / n) : null, precio_medio: n ? r2(precio / n) : null, error_medio_pp: n ? { segun_numero_de_ofertas: r2(errT / n), con_historial_de_la_entidad: r2(errE / n) } : null };
  };
  const R2 = { procesos: { publicado: 513, aqui: gP.length },
    precio_fijo: [{ precio: 95, publicado: 25.2, aqui: fijo(gP, 95) }, { precio: 96, publicado: 21.0, aqui: fijo(gP, 96) }],
    centro_real_menos_0_25: { publicado: 35.9, aqui: gP.length ? r1(media(gP.map((x) => X20.opcionAl(x.pcts, Math.min(x.c - 0.25, 99.99)))) * 100) : null },
    centro_segun_historial_menos_0_25: {
      publicado: { aprende: 760, centro_aprendido: { "3-4": 96.83, "5-9": 95.38, "10+": 94.17 }, quedo_primero_pct: 23.8, precio_medio: 95.68, error_medio_pp: { segun_numero_de_ofertas: 2.22, con_historial_de_la_entidad: 1.93 } },
      aqui_aprendiendo_solo_con_2025_como_el_plan: regla(PP.filter((x) => x.d >= CORTE_ELEGIR && x.d < CORTE_PRUEBA)),
      aqui_aprendiendo_desde_2020: regla(PP.filter((x) => x.d < CORTE_PRUEBA)),
      nota: "El plan aprendió solo con 2025 (wi7w-2nvm empezaba ahí). Con el historial desde 2020 la misma regla oferta más alto y gana menos: el centro del grupo baja año tras año y una mediana de todo el historial llega alta." } };
  /* la envoltura de aquí (fraccion) y opcionAl de medir.js deben dar lo mismo en menor cuantía */
  let distintas = 0, vistas = 0;
  for (const x of gP.slice(0, 300)) for (const p of [92, 94.37, 95, 96.5, x.c]) { vistas++; if (Math.abs(fraccion(x.pcts, p, MAXIMO.abreviada) - X20.opcionAl(x.pcts, p)) > 1e-12) distintas++; }
  return { nota: "Mismo motor y mismas reglas; la población NO es idéntica: p6dx-8zbt se reemplaza entero en cada carga, la limpieza aquí es la de scripts/base_obra (identidad unida por NIT o nombre, proceso apartado si alguna oferta sale del rango) y no la de medir.js (agrupar por nombre), y medir.js solo bajó las ofertas de procesos con 2 a 9 respuestas en p6dx.",
    cinco_a_nueve_ofertas_desde_2025_11: R1, prueba_2026_de_3_a_9_ofertas: R2, envoltura_igual_a_opcionAl: { comparaciones: vistas, distintas } };
}

function main() {
  const [dir, fechaArg] = process.argv.slice(2);
  if (!dir) { console.error("uso: node tools/analisis/plan_precio/cuatro_metodos_medir.js <carpeta_de_datos> [AAAA-MM-DD]"); process.exit(2); }
  const leerJson = (f) => { try { return JSON.parse(fs.readFileSync(path.join(dir, f), "utf8")); } catch (e) { return null; } };
  const consulta = leerJson("consulta.json"), resumenBase = leerJson("resumen_base.json");
  const fecha = fechaArg || (consulta && consulta.inicio ? consulta.inicio.slice(0, 10) : new Date().toISOString().slice(0, 10));
  const salida = path.join(__dirname, "resultados_4metodos_" + fecha + ".json");
  const { filas, sinFecha } = cargar(dir);
  const R = {
    que_es: "Medición fuera de muestra de cuánto se acerca una regla al mejor precio de oferta donde el puntaje económico sale de los cuatro métodos del documento tipo. Alimenta una planeación; no cambia la aplicación.",
    consulta: { fecha, inicio: consulta ? consulta.inicio : null, fin: consulta ? consulta.fin : null, procesos: "datos.gov.co · p6dx-8zbt (tipo_de_contrato «Obra», adjudicado «Si», recepción desde 2020-01-01)", ofertas: "datos.gov.co · wi7w-2nvm (2025-2026), b28v-edj8 (2023-2024) y bpan-xvj3 (hasta 2022), agrupadas por proceso, NIT, código, nombre y valor" },
    como_repetir: ["bash tools/analisis/plan_precio/cuatro_metodos_descargar.sh <carpeta>", "node tools/analisis/plan_precio/cuatro_metodos_base.js <carpeta>", "node tools/analisis/plan_precio/cuatro_metodos_control_x20.js <carpeta> " + fecha, "node tools/analisis/plan_precio/cuatro_metodos_medir.js <carpeta> " + fecha],
    supuestos: [
      "[supuesto] Todas las ofertas publicadas se toman como hábiles e iguales fuera del precio: los datos abiertos no dicen quién quedó hábil. B y C son referencias «con todas hábiles», no probabilidades de ganar.",
      "[supuesto] Los cuatro métodos pesan 25 % cada uno (el sorteo por los centavos de la TRM).",
      "[supuesto] La oferta propia entra como una oferta más y no cambia lo que ofertan los demás.",
      "[supuesto] Régimen especial se evalúa con los mismos cuatro métodos y el máximo de menor cuantía; su pliego puede traer otros. Va solo como referencia.",
      "[supuesto] En dinero: si la regla pide un precio que no supera el piso de costo, no se oferta (aporta 0).",
      "El presupuesto es precio_base de SECOP II (puede no ser el del pliego definitivo): se apartan los procesos con alguna oferta sobre el presupuesto, bajo el 50 % o fuera de 70 % a 100,0001 %.",
      "Solo procesos adjudicados. 2026 llega hasta la fecha de la consulta: los recibidos en los últimos meses y aún sin adjudicar no están.",
      "No se modela el rechazo por precio artificialmente bajo: los precios muy bajos (fijos de 90 a 92, desplazamientos de −3 o más) salen favorecidos de más.",
    ],
    parametros: { corte_prueba: CORTE_PRUEBA, corte_para_elegir: CORTE_ELEGIR, min_adjudicados_entidad: MIN_GANADOR, min_centros_entidad: MIN_CENTROS, min_ofertas_previas_costumbre: MIN_COSTUMBRE, min_ofertas_previas_estabilidad: MIN_ESTABLE, ventanas_probadas_dias: VENTANAS, deltas: DELTAS, deltas_ampliados: DELTAS_AMPLIA, fijos: FIJOS_TABLA, pisos_de_costo: PISOS, replicas: REPLICAS, semilla: SEMILLA, probabilidad_de_quitar_un_rival: P_QUITAR, sorteos_por_proceso: SORTEOS_HABILES, justo_debajo_o_encima: EPS, precio_maximo: PRECIO_MAXIMO,
      identidad: "NIT válido; si no, nombre comparable. El código de proveedor no identifica (ver cuatro_metodos_base.js).",
      historial: "principal «estricto»: un proceso informa a otro solo si se ADJUDICÓ antes del día de recepción del otro; sensibilidad «recepcion»: informa si se RECIBIÓ antes (como plan_x20/medir.js)." },
    base: resumenBase ? { filas_p6dx: resumenBase.filas_p6dx, procesos_p6dx: resumenBase.procesos_p6dx, por_modalidad_todas: resumenBase.por_modalidad_todas, ofertas: resumenBase.ofertas, embudo: resumenBase.embudo, por_ano: resumenBase.por_ano, definiciones: resumenBase.definiciones, filas_sin_fecha_de_recepcion: sinFecha } : { sin_medir: true, motivo: "falta resumen_base.json" },
  };
  const guardar = () => fs.writeFileSync(salida, JSON.stringify(R, null, 1) + "\n");
  const de = (mod) => filas.filter((x) => x.mod === mod);
  const t0 = Date.now(), cron = (m) => process.stderr.write(`[${((Date.now() - t0) / 1000).toFixed(0)} s] ${m}\n`);
  R.control_plan_x20 = controlPlanX20(de("abreviada"));
  R.control_plan_x20.codigo_del_plan_con_los_datos_de_hoy = leerJson("control_x20_hoy.json") || { sin_medir: true, motivo: "falta control_x20_hoy.json (lo escribe cuatro_metodos_control_x20.js)" };
  guardar(); cron("control");
  R.por_modalidad = {};
  const ventanaDe = {};
  for (const mod of MODS) {
    const v = elegirVentana(de(mod), "estricto"); ventanaDe[mod] = v.elegida_dias;
    R.por_modalidad[mod] = { modalidad: ROTULO[mod], historial: "estricto (adjudicado antes de la recepción)", ventana_del_historial: v };
    guardar(); cron(mod + " · ventana elegida: " + v.elegida);
    Object.assign(R.por_modalidad[mod], medirModalidad(de(mod), mod, "estricto", true, guardar, false, ventanaDe[mod])); guardar(); cron(mod + " · estricto");
  }
  R.sensibilidad_historial_por_recepcion = { nota: "Lo mismo (A y B) dejando que un proceso informe a los que se RECIBEN después de él, aunque aún no esté adjudicado (como plan_x20/medir.js). En menor cuantía las ofertas se ven al cierre; en licitación de obra el sobre económico se abre en la audiencia, así que este modo sabe de más." };
  for (const mod of MODS) {
    const r = medirModalidad(de(mod), mod, "recepcion", false, () => {}, false, ventanaDe[mod]);
    R.sensibilidad_historial_por_recepcion[mod] = { poblacion: r.poblacion, A_centro_todas: r.A_centro.todas, A_cobertura: { identidad_aplica: r.A_cobertura.identidad_aplica, ofertas: r.A_cobertura.ofertas }, A_costumbre_2026: r.A_costumbre.en_2026,
      B_familias: Object.fromEntries(Object.entries(r.B_estrategias.familias).map(([k, v]) => [k, { delta_elegido_en_2025: v.delta_elegido_en_2025, en_2026_con_ese_delta: v.en_2026_con_ese_delta }])),
      B_dinero_rejilla_ampliada: Object.fromEntries(PISOS.map((c) => { const x = r.B_dinero.rejilla_ampliada.por_piso[c]; return [c, { mejor_fijo: x.mejor_fijo, mejor_informada_elegida_en_2025: x.mejor_informada_elegida_en_2025, mejor_que_se_conoce_antes_elegida_en_2025: x.mejor_que_se_conoce_antes_elegida_en_2025 }]; })) };
    guardar(); cron(mod + " · recepción");
  }
  R.sensibilidad_sin_procesos_de_un_solo_valor = { nota: "Lo mismo (B, historial estricto) sin los procesos en que todas las ofertas publicadas valen lo mismo: allí no hay competencia de precio visible y una oferta más baja gana la media aritmética baja y el menor valor por construcción." };
  for (const mod of MODS) {
    const r = medirModalidad(de(mod), mod, "estricto", false, () => {}, true, ventanaDe[mod]);
    R.sensibilidad_sin_procesos_de_un_solo_valor[mod] = { procesos_para_elegir_2025: r.B_estrategias.procesos_para_elegir_2025, procesos_de_prueba_2026: r.B_estrategias.procesos_de_prueba_2026, azar_pct_2026: r.B_estrategias.azar_pct_2026, precio_fijo_2026: r.B_estrategias.precio_fijo_2026,
      B_familias: Object.fromEntries(Object.entries(r.B_estrategias.familias).map(([k, v]) => [k, { delta_elegido_en_2025: v.delta_elegido_en_2025, en_2026_con_ese_delta: v.en_2026_con_ese_delta }])),
      B_dinero_rejilla_ampliada: Object.fromEntries(PISOS.map((c) => { const x = r.B_dinero.rejilla_ampliada.por_piso[c]; return [c, { mejor_fijo: x.mejor_fijo, mejor_informada_elegida_en_2025: x.mejor_informada_elegida_en_2025, mejor_que_se_conoce_antes_elegida_en_2025: x.mejor_que_se_conoce_antes_elegida_en_2025 }]; })) };
    guardar(); cron(mod + " · sin procesos de un solo valor");
  }
  guardar();
  console.log("escrito: " + path.relative(process.cwd(), salida));
}

if (require.main === module) main();
module.exports = { cargar, fraccion, anunciar, disponibleEl, elegirVentana, candidatos, techosDe, minimosCuadrados, interpolar, MAXIMO, CORTE_PRUEBA };
