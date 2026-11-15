"use strict";
/* ============================================================================
   Plan precio · Mínima cuantía de OBRA: gana el menor precio. ¿A qué precio ofertar? (14-nov-2026)
   ----------------------------------------------------------------------------
   Solo MIDE, fuera de la aplicación. Lee lo que bajó `minima_descargar.js` de datos.gov.co
   (p6dx-8zbt, procesos de SECOP II; wi7w-2nvm, ofertas por proceso) y escribe las cifras en
   `resultados_minima_AAAA-MM-DD.json`. No toca Redis ni producción.

     node tools/analisis/plan_precio/minima_descargar.js <carpeta_de_datos>
     node tools/analisis/plan_precio/minima_medir.js     <carpeta_de_datos> [salida.json]

   Unidad: % del presupuesto oficial (`precio_base`). W = precio al que se adjudicó (valor_total_adjudicacion ÷ precio_base).
   Aprende con lo recibido antes de 2026 y prueba con 2026. Nada del futuro entra en una predicción: un proceso
   solo entra al historial cuando su ADJUDICACIÓN es anterior a la fecha de recepción del proceso que se anuncia
   (más estricto que plan_x20/aproximacion.js, que lo mete al día siguiente de recibirlo).

   Qué responde:
     control · las cifras del 11-nov (plan_x20/aproximacion_2026-11-11.json), LLAMANDO aproximacion.js sobre lo bajado hoy;
     A · hechos: procesos por número de ofertas, a cuánto se adjudicó en cada clase, en cuántos el adjudicado NO
         fue la oferta más baja, y la dispersión por tamaño y por departamento;
     B · la decisión: «ofertar una centésima por debajo del cuantil de W del grupo de referencia» para ganar 50, 70 y
         90 de cada 100; tasa REAL de ganar en 2026, precio medio, y el ahorro frente a un precio fijo que gana lo mismo
         (intervalo del 95 % por remuestreo de procesos, 2.000 réplicas, semilla fija);
     C · con dinero: valor esperado medio de [gana × (precio − costo)] para pisos de costo de 75, 80, 85 y 90 %;
     D · lo mismo separado por la competencia REAL (1, 2, 3 o más ofertas): techo, NO se conoce antes;
     E · cobertura: en qué parte de los procesos de prueba la entidad tiene historial suficiente, y B partido por ese historial;
     además · si el piso de 70 % de los scripts de plan_x20 recorta adjudicaciones reales (`piso_de_70`), tres variantes de B
         (con ese piso, aprendiendo solo 2025, y con la oferta del ganador como blanco) y un hallazgo lateral sobre
         lib/indice_baja.bajaDeFila, ejecutada sobre las filas crudas.

   Modelos (grupo de referencia de W; todos con respaldo hacia arriba si el grupo no alcanza):
     nacional · tramo (lib/competencia_por_tamano.tramoTamano) · cuartil_presupuesto · depto_tramo (20 o más) ·
     entidad (5 o más, si no el tramo) · competencia (tramo y clase ANUNCIADA: anunciarPoca ≥ 0,5) ·
     entidad_comp (entidad en esa clase, 5 o más) · mezcla (la entidad, con peso 1 por proceso, más el tramo con peso
     total K; K se elige en 2025) · mezcla_comp (lo mismo dentro de la clase anunciada) ·
     techo_* (con la clase REAL de ofertas: no se conoce antes).

   SUPUESTOS QUE VAN CON CADA CIFRA DE B, C Y D (no se quitan al citarla):
     · «La oferta propia queda hábil». Los datos abiertos no dicen quién quedó hábil; B y C son «si queda hábil».
     · «Gana quien oferta por debajo de W»: las ofertas más bajas que el ganador real fueron descartadas en la
       realidad. No mide que una oferta MUY baja abra el trámite de precio artificialmente bajo.
     · Los demás no cambian su precio porque usted se presente.
     · W es el valor ADJUDICADO. Cuando el contrato se adjudica por el presupuesto exacto y la oferta ganadora era
       más baja (monto agotable), W = 100 exagera el precio que había que batir: se mide aparte con las ofertas
       (variante `con_la_oferta_ganadora`), que solo existen desde 2025.
     · Solo procesos ADJUDICADOS. Un desierto no cuenta.
   Funciones de la aplicación que se LLAMAN (no se copian): modalidadDe y departamentoDe (lib/filtros_lista),
   tramoTamano y anunciarPoca (lib/competencia_por_tamano), tramoDeOferentes y CASI_CERO_PCT (lib/indice_baja).
   La agrupación de ofertas por proveedor repite la regla de plan_x20/medir.js `proveedoresDe` (allí no se exporta).
   ============================================================================ */
const fs = require("fs");
const path = require("path");
const RAIZ = path.join(__dirname, "..", "..", "..");
const CT = require(path.join(RAIZ, "lib", "competencia_por_tamano.js"));
const { modalidadDe, departamentoDe } = require(path.join(RAIZ, "lib", "filtros_lista.js"));
const IB = require(path.join(RAIZ, "lib", "indice_baja.js"));
const AP = require(path.join(RAIZ, "tools", "analisis", "plan_x20", "aproximacion.js"));

const CORTE_PRUEBA = "2026-01-01";     // aprende antes, prueba después
const CORTE_VALIDA = "2025-01-01";     // 2025 elige lo que haya que elegir (q, K, precio fijo); 2026 mide
const MIN_ENTIDAD = 5;                 // la entidad «tiene historial» con 5 o más adjudicados conocidos
const MIN_DEPTO = 20;                  // departamento y tramo, con 20 o más
const PISO = 30, TECHO = 100.0001;     // higiene de W: 30 % (el piso de lib/indice_baja.bajaDeFila) a 100 %
const DELTA = IB.CASI_CERO_PCT;        // se oferta una centésima de punto por debajo del cuantil
const METAS = [0.5, 0.7, 0.9];
const TAUS = [0.02, 0.05, 0.1, 0.15, 0.2, 0.25, 0.3, 0.35, 0.4, 0.45, 0.5, 0.55, 0.6, 0.65, 0.7, 0.75, 0.8, 0.85, 0.9, 0.95, 0.98];
const COSTOS = [75, 80, 85, 90];
const KS = [2, 5, 10, 20];
const REPLICAS = 2000, SEMILLA = 20261114;
const DIAS_SIN_FECHA_ADJ = 7;          // sin fecha de adjudicación: se da por conocida 7 días después de la recepción (la mediana medida)
const DEPTOS = [["73", "Tolima"], ["41", "Huila"], ["25", "Cundinamarca"], ["11", "Bogotá D.C."]];

const num = (x) => { if (x == null || x === "") return null; const v = Number(x); return Number.isFinite(v) ? v : null; };
const normal = (s) => String(s == null ? "" : s).normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase().replace(/[^A-Z0-9]+/g, " ").trim();
const soloDigitos = (s) => String(s == null ? "" : s).replace(/\D+/g, "");
const r1 = (x) => (x == null || !Number.isFinite(x) ? null : Math.round(x * 10) / 10);
const r2 = (x) => (x == null || !Number.isFinite(x) ? null : Math.round(x * 100) / 100);
const r4 = (x) => (x == null || !Number.isFinite(x) ? null : Math.round(x * 1e4) / 1e4);
const media = (v) => (v.length ? v.reduce((a, b) => a + b, 0) / v.length : null);
const cuantil = (orden, p) => (orden.length ? orden[Math.min(orden.length - 1, Math.max(0, Math.ceil(p * orden.length - 1e-9) - 1))] : null);   // cuantil empírico (inverso de la acumulada)
const ordenar = (v) => v.slice().sort((a, b) => a - b);
const masDias = (iso, n) => new Date(Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10)) + n * 86400000).toISOString().slice(0, 10);
const claseReal = (n) => (n === 1 ? "1" : n === 2 ? "2" : "3+");
const claseOfertas = (n) => { const t = IB.tramoDeOferentes(n); return t ? t.clave : null; };
const CLASES = IB.TRAMOS_OFERENTES.map((t) => t.clave);
function semilla(a) { return function () { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const resumenW = (v) => { const o = ordenar(v); return o.length ? { procesos: o.length, p10: r2(cuantil(o, 0.1)), p25: r2(cuantil(o, 0.25)), mediana: r2(cuantil(o, 0.5)), p75: r2(cuantil(o, 0.75)), p90: r2(cuantil(o, 0.9)), media: r2(media(o)),
  entre_p25_y_p75: r2(cuantil(o, 0.75) - cuantil(o, 0.25)), entre_p10_y_p90: r2(cuantil(o, 0.9) - cuantil(o, 0.1)), al_presupuesto_exacto_pct: r1(100 * o.filter((x) => Math.abs(100 - x) < DELTA).length / o.length), bajo_70_pct: r1(100 * o.filter((x) => x < 70).length / o.length) } : { procesos: 0 }; };

/* ── lectura ─────────────────────────────────────────────────────────────── */
function leerProcesos(dir) { const o = []; for (const f of fs.readdirSync(dir).filter((x) => /^procesos_\d+\.json$/.test(x)).sort()) o.push(...JSON.parse(fs.readFileSync(path.join(dir, f), "utf8"))); return o; }
function leerOfertas(dir) { const por = new Map(); const d = path.join(dir, "ofertas"); for (const f of fs.readdirSync(d)) for (const r of JSON.parse(fs.readFileSync(path.join(d, f), "utf8"))) { const k = r.id_del_proceso_de_compra; if (!por.has(k)) por.set(k, []); por.get(k).push(r); } return por; }

/* Las ofertas de un proceso, una entrada por proveedor (la regla de plan_x20/medir.js `proveedoresDe`): se agrupa por el
   NOMBRE (el mismo proveedor sale con y sin código) y la fila «Confidencial» no es un proveedor. */
function proveedoresDe(filas, cuenta) {
  const por = new Map();
  for (const r of filas) {
    const nom = normal(r.nombre_proveedor);
    if (nom === "CONFIDENCIAL") { if (cuenta) cuenta.filas_confidencial++; continue; }
    const k = nom || r.c_digo_proveedor || soloDigitos(r.nit_del_proveedor);
    if (!por.has(k)) por.set(k, []); por.get(k).push(r);
  }
  return [...por.entries()].map(([k, rs]) => ({ k, nom: normal(rs[0].nombre_proveedor),
    cods: new Set(rs.map((r) => r.c_digo_proveedor).filter((c) => c && normal(c) !== "NO DEFINIDO")),
    nits: new Set(rs.map((r) => soloDigitos(r.nit_del_proveedor)).filter((x) => x.length >= 6)),
    valores: [...new Set(rs.map((r) => num(r.valor_de_la_oferta)).filter((x) => x != null && x > 0))], con_y_sin_codigo: new Set(rs.map((r) => r.c_digo_proveedor || "")).size > 1 }));
}
const esElMismo = (o, h) => (!!h.cod && o.cods.has(h.cod)) || (!!h.nitg && h.nitg.length >= 6 && o.nits.has(h.nitg)) || (!!h.nomg && h.nomg === o.nom);

/* ── población: una fila por portafolio, con lo apartado contado ─────────── */
function construir(crudas, ofertas, piso) {
  const ap = { sin_portafolio: 0, otra_modalidad: 0, varias_adjudicaciones_o_lotes: 0, con_lotes: 0, sin_presupuesto: 0, sin_valor_adjudicado: 0, sin_fecha_de_recepcion: 0, sin_ofertas_legibles: 0, sin_tramo: 0, bajo_el_piso: 0, sobre_100: 0 };
  const cuentaOf = { filas_confidencial: 0, procesos_con_ofertas: 0, procesos_con_proveedor_con_y_sin_codigo: 0 };
  const porId = new Map();
  for (const r of crudas) { if (!r.id_del_portafolio) { ap.sin_portafolio++; continue; } if (!porId.has(r.id_del_portafolio)) porId.set(r.id_del_portafolio, []); porId.get(r.id_del_portafolio).push(r); }
  const F = []; let sinFechaAdj = 0;
  for (const [id, rs] of porId) {
    if (rs.some((r) => modalidadDe(r) !== "minima" || String(r.adjudicado).toLowerCase() !== "si")) { ap.otra_modalidad++; continue; }
    if (new Set(rs.map((r) => String(r.valor_total_adjudicacion))).size > 1 || new Set(rs.map((r) => normal(r.nombre_del_proveedor))).size > 1) { ap.varias_adjudicaciones_o_lotes++; continue; }
    const r = rs[0];
    const lotes = num(r.numero_de_lotes); if (lotes != null && lotes > 0) { ap.con_lotes++; continue; }
    const pb = num(r.precio_base); if (pb == null || pb <= 0) { ap.sin_presupuesto++; continue; }
    const va = num(r.valor_total_adjudicacion); if (va == null || va <= 0) { ap.sin_valor_adjudicado++; continue; }
    const f = String(r.fecha_de_recepcion_de || "").slice(0, 10); if (!/^\d{4}-\d{2}-\d{2}$/.test(f)) { ap.sin_fecha_de_recepcion++; continue; }
    let n = null; for (const x of rs) { const k = parseInt(x.respuestas_al_procedimiento, 10); if (Number.isFinite(k) && (n == null || k > n)) n = k; }
    if (n == null || n < 1) { ap.sin_ofertas_legibles++; continue; }                  // 0 respuestas en un adjudicado es «sin dato», no «nadie»
    const t = CT.tramoTamano(pb); if (t == null) { ap.sin_tramo++; continue; }
    const W = va * 100 / pb;
    if (W < piso) { ap.bajo_el_piso++; continue; }
    if (W > TECHO) { ap.sobre_100++; continue; }
    const fa = String(r.fecha_adjudicacion || "").slice(0, 10);
    let con; if (/^\d{4}-\d{2}-\d{2}$/.test(fa) && fa >= f) con = fa; else { con = masDias(f, DIAS_SIN_FECHA_ADJ); sinFechaAdj++; }
    const dep = departamentoDe(r);
    const x = { id, ent: r.nit_entidad || normal(r.entidad), entidad: r.entidad, dep: dep ? dep.codigo : null, t, n, pb, va, W, f, con, Wc: undefined, of: null };
    /* las ofertas (solo existen para lo recibido desde 2025) */
    const filasOf = ofertas.get(id);
    if (filasOf) {
      cuentaOf.procesos_con_ofertas++;
      const provs = proveedoresDe(filasOf, cuentaOf);
      if (provs.some((o) => o.con_y_sin_codigo)) cuentaOf.procesos_con_proveedor_con_y_sin_codigo++;
      const h = { cod: normal(r.codigoproveedor) === "NO DEFINIDO" ? null : r.codigoproveedor, nitg: soloDigitos(r.nit_del_proveedor_adjudicado), nomg: normal(r.nombre_del_proveedor) };
      const g = provs.filter((o) => esElMismo(o, h));
      const pct = (o) => (o.valores.length === 1 ? o.valores[0] * 100 / pb : null);       // un solo valor por proveedor; si no, ilegible
      const gan = g.length === 1 ? pct(g[0]) : null;
      const otras = g.length === 1 ? provs.filter((o) => o !== g[0]).map(pct) : provs.map(pct);
      const todasIguales = provs.length >= 2 && provs.every((o) => o.valores.length === 1) && new Set(provs.map((o) => o.valores[0])).size === 1;
      x.of = { proveedores: provs.length, ganador_emparejado: g.length === 1, ganador_pct: gan, otras, todas_iguales: todasIguales };
      /* Wc = el precio que de verdad compitió: la oferta del ganador si se lee y es creíble; null si no se sabe */
      if (todasIguales) x.Wc = null;
      else if (gan != null && gan >= PISO && gan <= TECHO) x.Wc = gan;
      else x.Wc = null;
    } else if (f >= CORTE_VALIDA) x.Wc = null;        // recibido desde 2025 y sin filas de oferta: no se sabe
    F.push(x);
  }
  F.sort((a, b) => (a.f < b.f ? -1 : a.f > b.f ? 1 : a.id < b.id ? -1 : 1));
  return { F, apartados: ap, ofertas: cuentaOf, portafolios: porId.size, sin_fecha_de_adjudicacion_se_da_por_conocido_a_los_7_dias: sinFechaAdj };
}

/* ── grupos de referencia: arreglos ordenados que crecen con el tiempo ───── */
function insertar(a, x) { let lo = 0, hi = a.length; while (lo < hi) { const m = (lo + hi) >> 1; if (a[m] < x) lo = m + 1; else hi = m; } a.splice(lo, 0, x); }
const VACIO = [];
/* El perfil de un grupo (e, peso 1 cada uno) mezclado con una base (b, peso total K): para cada meta τ, el valor v más alto
   con P(W ≥ v) ≥ τ; y para cada costo c, el v que maximiza (v − δ − c) × P(W ≥ v). Sin mezcla: b = [] y K = 0. */
function perfil(e, b, K) {
  const total = e.length + (b.length ? K : 0), wb = b.length ? K / b.length : 0;
  const v = new Float64Array(TAUS.length).fill(NaN), opt = COSTOS.map(() => null), mejor = COSTOS.map(() => 0);
  let i = e.length - 1, j = b.length - 1, cum = 0, k = 0;
  while (i >= 0 || j >= 0) {
    let x;
    if (j < 0 || (i >= 0 && e[i] >= b[j])) { x = e[i--]; cum += 1; } else { x = b[j--]; cum += wb; }
    const sig = Math.max(i >= 0 ? e[i] : -Infinity, j >= 0 ? b[j] : -Infinity);
    if (sig === x) continue;                                  // se acumulan primero todos los iguales
    const p = cum / total;
    while (k < TAUS.length && p >= TAUS[k] - 1e-9) v[k++] = x;
    for (let c = 0; c < COSTOS.length; c++) { const g = (x - DELTA - COSTOS[c]) * p; if (g > mejor[c] + 1e-12) { mejor[c] = g; opt[c] = x; } }
  }
  return { v, opt };
}

/* ── el recorrido: anuncia cada proceso recibido desde `desdeEvalua` solo con lo adjudicado ANTES de su recepción ── */
function recorrer(F, campo, desdeAprende, desdeEvalua) {
  const D = F.filter((x) => x.f >= desdeAprende && x[campo] != null);
  const porConocido = D.slice().sort((a, b) => (a.con < b.con ? -1 : a.con > b.con ? 1 : 0));
  const G = new Map(); const g = (k) => G.get(k) || VACIO; const meter = (k, w) => { if (!G.has(k)) G.set(k, []); insertar(G.get(k), w); };
  const cuentas = { tot: [0, 0], tam: {}, dep: {}, ent: {}, entT: {} };
  const sumar = (o, k, x) => { const c = o[k] || (o[k] = [0, 0]); c[0]++; if (x.n <= 2) c[1]++; };
  /* cuartiles del presupuesto, fijados con lo recibido antes de evaluar (el presupuesto no es el blanco) */
  const pbs = ordenar(D.filter((x) => x.f < desdeEvalua).map((x) => x.pb)); const base = pbs.length >= 200 ? pbs : ordenar(D.filter((x) => x.f < CORTE_PRUEBA).map((x) => x.pb));
  const cortes = [cuantil(base, 0.25), cuantil(base, 0.5), cuantil(base, 0.75)];
  const cuartil = (pb) => (pb <= cortes[0] ? 0 : pb <= cortes[1] ? 1 : pb <= cortes[2] ? 2 : 3);
  let p = 0; const E = [];
  for (const x of D) {
    if (x.f < desdeEvalua) continue;
    while (p < porConocido.length && porConocido[p].con < x.f) {
      const h = porConocido[p++], w = h[campo], comp = h.n <= 2 ? "poca" : "mucha", cr = claseReal(h.n);
      meter("N", w); meter(`T|${h.t}`, w); meter(`Q|${cuartil(h.pb)}`, w); meter(`E|${h.ent}`, w); meter(`D|${h.dep}|${h.t}`, w);
      meter(`TC|${h.t}|${comp}`, w); meter(`EC|${h.ent}|${comp}`, w); meter(`TR|${h.t}|${cr}`, w); meter(`NR|${cr}`, w); meter(`ER|${h.ent}|${cr}`, w);
      cuentas.tot[0]++; if (h.n <= 2) cuentas.tot[1]++;
      sumar(cuentas.tam, h.t, h); sumar(cuentas.dep, `${h.dep}|${h.t}`, h); sumar(cuentas.ent, h.ent, h); sumar(cuentas.entT, `${h.ent}|${h.t}`, h);
    }
    const nac = g("N"); if (!nac.length) continue;                     // sin nada aprendido no hay anuncio
    const tam = g(`T|${x.t}`).length ? g(`T|${x.t}`) : nac;
    const a = CT.anunciarPoca({ modalidad: cuentas.tot, tamano: cuentas.tam[x.t], depto: cuentas.dep[`${x.dep}|${x.t}`], entidad: cuentas.ent[x.ent], entidadTam: cuentas.entT[`${x.ent}|${x.t}`] });
    const an = a && a.entidad != null && a.entidad >= 0.5 ? "poca" : "mucha";
    const e = g(`E|${x.ent}`), conHist = e.length >= MIN_ENTIDAD;
    const comp = g(`TC|${x.t}|${an}`).length >= MIN_ENTIDAD ? g(`TC|${x.t}|${an}`) : tam;
    const ec = g(`EC|${x.ent}|${an}`);
    const cr = claseReal(x.n);
    const techo = g(`TR|${x.t}|${cr}`).length >= MIN_ENTIDAD ? g(`TR|${x.t}|${cr}`) : g(`NR|${cr}`).length ? g(`NR|${cr}`) : tam;
    const m = {
      nacional: perfil(nac, VACIO, 0), tramo: perfil(tam, VACIO, 0),
      cuartil_presupuesto: perfil(g(`Q|${cuartil(x.pb)}`).length >= MIN_DEPTO ? g(`Q|${cuartil(x.pb)}`) : nac, VACIO, 0),
      entidad: perfil(conHist ? e : tam, VACIO, 0),
      competencia: perfil(comp, VACIO, 0),
      entidad_comp: perfil(ec.length >= MIN_ENTIDAD ? ec : comp, VACIO, 0),
      depto_tramo: perfil(g(`D|${x.dep}|${x.t}`).length >= MIN_DEPTO ? g(`D|${x.dep}|${x.t}`) : tam, VACIO, 0),
      techo_competencia_real: perfil(techo, VACIO, 0),
      techo_entidad_competencia_real: perfil(g(`ER|${x.ent}|${cr}`).length >= MIN_ENTIDAD ? g(`ER|${x.ent}|${cr}`) : techo, VACIO, 0),
    };
    for (const K of KS) { m[`mezcla_K${K}`] = perfil(e, tam, K); m[`mezcla_comp_K${K}`] = perfil(ec, comp, K); }
    E.push({ x, W: x[campo], m, previos_entidad: e.length, anuncio: a ? a.entidad : null, anunciada: an, depto_con_base: g(`D|${x.dep}|${x.t}`).length >= MIN_DEPTO });
  }
  return { E, cortes_cuartil_presupuesto: cortes };
}

/* ── métricas ────────────────────────────────────────────────────────────── */
const iTau = (t) => TAUS.findIndex((y) => Math.abs(y - t) < 1e-9);
/* el precio fijo que gana al menos `tasa` en la muestra ordenada `orden` (con pesos `cnt` o sin ellos) */
function fijoQueGana(orden, cnt, n, tasa) {
  let cum = 0; const meta = tasa * n - 1e-9;
  for (let i = orden.length - 1; i >= 0; i--) {
    cum += cnt ? cnt[i] : 1;
    if (cum < meta) continue;
    let j = i; while (j > 0 && orden[j - 1] === orden[i]) { j--; cum += cnt ? cnt[j] : 1; }      // los empatados con ese valor también se ganan
    return { v: orden[i], tasa: cum / n };
  }
  return { v: orden[0], tasa: 1 };
}
const ic = (v) => { const o = v.filter((x) => x != null && Number.isFinite(x)).sort((a, b) => a - b); return o.length ? [r2(o[Math.floor(0.025 * (o.length - 1))]), r2(o[Math.ceil(0.975 * (o.length - 1))])] : null; };

/* Las réplicas del remuestreo: cuántas veces cae cada proceso (semilla fija: dos corridas dan lo mismo). */
function replicasDe(n) { const rng = semilla(SEMILLA), cnts = []; for (let b = 0; b < REPLICAS; b++) { const c = new Uint16Array(n); for (let i = 0; i < n; i++) c[Math.floor(rng() * n)]++; cnts.push(c); } return cnts; }

/* B sobre un conjunto S de procesos de prueba: por modelo y meta, tasa real, precio y ahorro frente al precio fijo que gana lo mismo EN S. */
function tablaB(S, modelos, mod, conCalibracion) {
  const n = S.length, T = {};
  if (!n) return T;
  const idx = S.map((_, i) => i).sort((a, b) => S[a].W - S[b].W), Wo = idx.map((i) => S[i].W), cnts = replicasDe(n);
  for (const k of modelos) {
    T[k] = {};
    for (const t of METAS) {
      const j = iTau(t), v = idx.map((i) => S[i].m[mod(k)].v[j]), gana = v.map((z, i) => (Wo[i] >= z ? 1 : 0)), precio = v.map((z) => z - DELTA);
      const calc = (cnt) => { let g = 0, sp = 0, sg = 0; for (let i = 0; i < n; i++) { const w = cnt ? cnt[i] : 1; g += w * gana[i]; sp += w * precio[i]; sg += w * gana[i] * precio[i]; }
        const tasa = g / n, fj = fijoQueGana(Wo, cnt, n, tasa);
        return { tasa, precio: sp / n, precioG: g ? sg / g : null, fijo: fj.v - DELTA, tasaFijo: fj.tasa, ahorro: sp / n - (fj.v - DELTA), ahorroG: g ? sg / g - (fj.v - DELTA) : null }; };
      const o = calc(null), bs = cnts.map(calc);
      T[k][`meta_${Math.round(t * 100)}`] = { tasa_real_pct: r1(100 * o.tasa), tasa_real_ic95: ic(bs.map((z) => 100 * z.tasa)), precio_medio_ofertado: r2(o.precio), precio_medio_de_las_que_gana: r2(o.precioG),
        precio_fijo_que_gana_lo_mismo: r2(o.fijo), tasa_del_fijo_pct: r1(100 * o.tasaFijo),
        ahorro_puntos: r2(o.ahorro), ahorro_ic95: ic(bs.map((z) => z.ahorro)), ahorro_en_las_que_gana_puntos: r2(o.ahorroG), ahorro_en_las_que_gana_ic95: ic(bs.map((z) => z.ahorroG)) };
    }
    if (conCalibracion) T[k].calibracion = TAUS.map((t, j) => [Math.round(t * 100), r1(100 * S.filter((y) => y.W >= y.m[mod(k)].v[j]).length / n)]);
  }
  return T;
}
const exactitud = (S, modelos, mod, pinball) => Object.fromEntries(modelos.map((k) => { const e = S.map((y) => Math.abs(y.m[mod(k)].v[iTau(0.5)] - y.W)), o = ordenar(e), n = S.length;
  return [k, { procesos: n, error_medio: r2(media(e)), error_mediano: r2(cuantil(o, 0.5)), a_1_punto_pct: r1(100 * e.filter((z) => z <= 1).length / n), a_2_puntos_pct: r1(100 * e.filter((z) => z <= 2).length / n), a_5_puntos_pct: r1(100 * e.filter((z) => z <= 5).length / n), perdida_de_cuantil: r4(pinball(S, mod(k))) }]; }));

function evaluar(F, { campo = "W", desdeAprende = "2022-01-01", completo = true } = {}) {
  const { E, cortes_cuartil_presupuesto } = recorrer(F, campo, desdeAprende, completo ? CORTE_VALIDA : CORTE_PRUEBA);
  const V = E.filter((y) => y.x.f < CORTE_PRUEBA), P = E.filter((y) => y.x.f >= CORTE_PRUEBA);
  const n = P.length;
  const R = { aprende_desde: desdeAprende, blanco: campo === "W" ? "valor adjudicado ÷ presupuesto" : "oferta del ganador ÷ presupuesto (si se lee y es creíble)", prueba: n, valida_2025: V.length, cortes_cuartil_presupuesto };

  /* la mezcla: K se elige en 2025 por la pérdida de cuantil (pinball) sumada en las tres metas */
  const pinball = (S, mod) => { let s = 0; for (const y of S) for (const t of METAS) { const v = y.m[mod].v[iTau(t)], p = 1 - t; s += y.W >= v ? (y.W - v) * p : (v - y.W) * (1 - p); } return S.length ? s / (S.length * METAS.length) : null; };
  if (completo && V.length) {
    const elegir = (pref) => KS.map((K) => [K, pinball(V, `${pref}${K}`)]).sort((a, b) => a[1] - b[1])[0][0];
    R.K_elegido_en_2025 = { mezcla: elegir("mezcla_K"), mezcla_comp: elegir("mezcla_comp_K"), perdida_de_cuantil_2025: Object.fromEntries(KS.map((K) => [K, { mezcla: r4(pinball(V, `mezcla_K${K}`)), mezcla_comp: r4(pinball(V, `mezcla_comp_K${K}`)) }])) };
  } else R.K_elegido_en_2025 = { mezcla: 5, mezcla_comp: 5, nota: "sin 2025 para elegir: K = 5 fijo" };
  const alias = { mezcla: `mezcla_K${R.K_elegido_en_2025.mezcla}`, mezcla_comp: `mezcla_comp_K${R.K_elegido_en_2025.mezcla_comp}` };
  const PRINCIPALES = ["nacional", "tramo", "cuartil_presupuesto", "depto_tramo", "entidad", "competencia", "entidad_comp", "mezcla", "mezcla_comp", "techo_competencia_real", "techo_entidad_competencia_real"];
  const mod = (k) => alias[k] || k;

  /* exactitud del anuncio central (la mediana del grupo) */
  R.exactitud_mediana = exactitud(P, PRINCIPALES, mod, pinball);
  R.exactitud_mediana_con_3_o_mas_ofertas = exactitud(P.filter((y) => y.x.n >= 3), PRINCIPALES, mod, pinball);

  /* B · la decisión */
  const idx = P.map((_, i) => i).sort((a, b) => P[a].W - P[b].W), cnts = replicasDe(n);      // prueba ordenada por W, y sus réplicas (las de tablaB)
  R.B_decision = tablaB(P, PRINCIPALES, mod, true);
  R.B_notas = { ofertar: `una centésima de punto (${DELTA}) por debajo del cuantil del grupo: gana si W ≥ cuantil`, precio_fijo: "el precio único MÁS ALTO que, visto 2026 entero, gana al menos la misma tasa real (es un fijo elegido con ventaja: nadie lo conoce antes)",
    ahorro: "precio medio ofertado − precio fijo que gana lo mismo; positivo = el modelo deja ofertar más caro para ganar igual", ahorro_en_las_que_gana: "lo mismo con el precio medio de los procesos que el modelo GANA: es el que se cobra" };

  if (!completo) return R;

  /* C · con dinero */
  R.C_dinero = { unidad: "puntos del presupuesto por proceso al que se presenta (media sobre todos los de prueba)", regla: "se elige en 2025 (q del modelo, o el precio fijo) y se mide en 2026; si el precio queda en el costo o por debajo, no se presenta (0)", por_costo: {} };
  const valor = (y, v, c) => (v == null || Number.isNaN(v) || v - DELTA <= c ? 0 : y.W >= v ? v - DELTA - c : 0);
  for (let ci = 0; ci < COSTOS.length; ci++) {
    const c = COSTOS[ci], sal = { modelos: {} };
    /* el fijo: rejilla de 0,25 puntos */
    const rej = []; for (let v = c + 0.25; v <= 100 + 1e-9; v += 0.25) rej.push(v);
    const evFijo = (S, v) => media(S.map((y) => valor(y, v, c)));
    const vF = rej.map((v) => [v, evFijo(V, v)]).sort((a, b) => b[1] - a[1])[0][0], vFpost = rej.map((v) => [v, evFijo(P, v)]).sort((a, b) => b[1] - a[1])[0];
    const serieFijo = idx.map((i) => valor(P[i], vF, c));
    const boot = (serie, ref) => { const d = [], e = []; for (const cnt of cnts) { let s = 0, sr = 0; for (let i = 0; i < n; i++) { s += cnt[i] * serie[i]; if (ref) sr += cnt[i] * ref[i]; } e.push(s / n); d.push((s - sr) / n); } return { ev: ic(e), dif: ref ? ic(d) : null }; };
    sal.precio_fijo = { precio_elegido_en_2025: r2(vF - DELTA), valor_2026: r2(media(serieFijo)), ic95: boot(serieFijo).ev, gana_pct: r1(100 * serieFijo.filter((z) => z > 0).length / n) };
    sal.precio_fijo_elegido_viendo_2026 = { precio: r2(vFpost[0] - DELTA), valor_2026: r2(vFpost[1]), nota: "techo del precio fijo: nadie lo conoce antes" };
    const serieOraculo = idx.map((i) => Math.max(0, P[i].W - DELTA - c));
    sal.sabiendo_W = { valor_2026: r2(media(serieOraculo)), nota: "techo absoluto: ofertar una centésima bajo el precio ganador de cada proceso" };
    for (const k of PRINCIPALES) {
      const evQ = (S, j) => media(S.map((y) => valor(y, y.m[mod(k)].v[j], c)));
      const jq = TAUS.map((_, j) => [j, evQ(V, j)]).sort((a, b) => b[1] - a[1])[0][0];
      const sQ = idx.map((i) => valor(P[i], P[i].m[mod(k)].v[jq], c)), sO = idx.map((i) => valor(P[i], P[i].m[mod(k)].opt[ci], c));
      const bq = boot(sQ, serieFijo), bo = boot(sO, serieFijo);
      sal.modelos[k] = {
        con_q_elegido_en_2025: { meta_de_ganar_pct: Math.round(TAUS[jq] * 100), valor_2026: r2(media(sQ)), ic95: bq.ev, frente_al_fijo: r2(media(sQ) - media(serieFijo)), frente_al_fijo_ic95: bq.dif, gana_pct: r1(100 * sQ.filter((z) => z > 0).length / n) },
        con_el_precio_optimo_del_grupo: { valor_2026: r2(media(sO)), ic95: bo.ev, frente_al_fijo: r2(media(sO) - media(serieFijo)), frente_al_fijo_ic95: bo.dif, gana_pct: r1(100 * sO.filter((z) => z > 0).length / n), se_presenta_pct: r1(100 * P.filter((y) => y.m[mod(k)].opt[ci] != null).length / n) },
      };
    }
    R.C_dinero.por_costo[`costo_${c}`] = sal;
  }

  /* D · por la competencia REAL (no se conoce antes) */
  R.D_por_competencia_real = { aviso: "NO SE CONOCE ANTES: el número de ofertas se sabe al cierre. Es un techo, no una regla que se pueda aplicar.", clases: {} };
  for (const cl of ["1", "2", "3+"]) {
    const S = P.filter((y) => claseReal(y.x.n) === cl);
    R.D_por_competencia_real.clases[cl] = { pct_de_la_prueba: r1(100 * S.length / n), ...resumenW(S.map((y) => y.W)), nota_fijo: "el precio fijo se elige viendo SOLO esta clase: doble ventaja",
      modelos: tablaB(S, ["nacional", "entidad", "entidad_comp", "mezcla", "mezcla_comp", "techo_competencia_real", "techo_entidad_competencia_real"], mod, false) };
  }
  /* el anuncio de competencia (anunciarPoca ≥ 0,5, la clase que usa aproximacion.js) contra lo que pasó en 2026 */
  const anP = P.filter((y) => y.anunciada === "poca"), anM = P.filter((y) => y.anunciada === "mucha"), an8 = P.filter((y) => y.anuncio != null && y.anuncio >= CT.UMBRAL_POCA && y.previos_entidad >= CT.MIN_HISTORIAL);
  R.D_anuncio_de_competencia = { regla: "CT.anunciarPoca; clase «poca» si el anuncio ≥ 0,5 (corte de plan_x20/aproximacion.js, NO el 0,8 que publica la aplicación)",
    anunciados_poca: anP.length, poca_con_una_o_dos_pct: r1(100 * anP.filter((y) => y.x.n <= 2).length / anP.length), anunciados_mucha: anM.length, mucha_con_3_o_mas_pct: r1(100 * anM.filter((y) => y.x.n >= 3).length / anM.length),
    con_el_umbral_publicado_0_8_y_4_previos: { procesos: an8.length, con_una_o_dos_pct: an8.length ? r1(100 * an8.filter((y) => y.x.n <= 2).length / an8.length) : null },
    medida_antes_para_minima: "sí: lib/competencia_por_tamano.js (MODALIDADES_ANUNCIO incluye «minima») y plan_x20/poblacion_2026-11-11.json — 91,1 % en 280 procesos (población del plan) y 91,6 % en 311 (población de la aplicación), con anuncio ≥ 0,8" };

  /* E · cobertura */
  const cob = (S) => ({ procesos: S.length, entidad_con_5_o_mas_pct: r1(100 * S.filter((y) => y.previos_entidad >= MIN_ENTIDAD).length / S.length), con_1_o_mas_pct: r1(100 * S.filter((y) => y.previos_entidad >= 1).length / S.length),
    con_10_o_mas_pct: r1(100 * S.filter((y) => y.previos_entidad >= 10).length / S.length), con_20_o_mas_pct: r1(100 * S.filter((y) => y.previos_entidad >= 20).length / S.length), departamento_y_tramo_con_20_o_mas_pct: r1(100 * S.filter((y) => y.depto_con_base).length / S.length) });
  R.E_cobertura = { total: cob(P), ...Object.fromEntries(DEPTOS.map(([c, nom]) => [nom, cob(P.filter((y) => y.x.dep === c))]).filter(([, o]) => o.procesos > 0)),
    nota: "«previos» = adjudicados de la entidad en mínima cuantía de obra, recibidos desde 2022 y ya adjudicados antes de la recepción del proceso de prueba" };
  /* B solo donde la entidad tiene historial: ahí es donde el modelo por entidad dice algo propio */
  const conH = P.filter((y) => y.previos_entidad >= MIN_ENTIDAD), sinH = P.filter((y) => y.previos_entidad < MIN_ENTIDAD);
  const LISTA = ["nacional", "entidad", "entidad_comp", "mezcla", "mezcla_comp"];
  R.E_decision_segun_historial = { con_5_o_mas_previos: { procesos: conH.length, exactitud_mediana: exactitud(conH, LISTA, mod, pinball), modelos: tablaB(conH, LISTA, mod, false) },
    con_menos_de_5: { procesos: sinH.length, exactitud_mediana: exactitud(sinH, LISTA, mod, pinball), modelos: tablaB(sinH, LISTA, mod, false) } };
  return R;
}

/* ── A · hechos ──────────────────────────────────────────────────────────── */
function hechos(F) {
  const A = { poblacion: "todo lo recibido desde 2022 que pasa la higiene", por_numero_de_ofertas: {}, nota_ofertas: "número de ofertas = `respuestas_al_procedimiento` de p6dx-8zbt" };
  for (const cl of CLASES) { const S = F.filter((x) => claseOfertas(x.n) === cl); A.por_numero_de_ofertas[cl] = { pct_de_los_procesos: r1(100 * S.length / F.length), ...resumenW(S.map((x) => x.W)) }; }
  A.total = resumenW(F.map((x) => x.W));
  A.por_ano = Object.fromEntries([...new Set(F.map((x) => x.f.slice(0, 4)))].sort().map((a) => { const S = F.filter((x) => x.f.startsWith(a)); return [a, { ...resumenW(S.map((x) => x.W)), con_una_oferta_pct: r1(100 * S.filter((x) => x.n === 1).length / S.length), con_3_o_mas_pct: r1(100 * S.filter((x) => x.n >= 3).length / S.length) }]; }));
  A.solo_2026_por_numero_de_ofertas = Object.fromEntries(CLASES.map((cl) => { const S = F.filter((x) => x.f >= CORTE_PRUEBA && claseOfertas(x.n) === cl); return [cl, { pct_de_los_procesos: r1(100 * S.length / F.filter((x) => x.f >= CORTE_PRUEBA).length), ...resumenW(S.map((x) => x.W)) }]; }));

  /* ¿el adjudicado fue la oferta más baja? Solo donde hay ofertas (recibido desde 2025) y 2 o más proveedores */
  const con2 = F.filter((x) => x.of && x.of.proveedores >= 2);
  const c = { procesos_con_2_o_mas_ofertas_publicadas: con2.length, ganador_sin_emparejar: 0, ganador_sin_valor_creible: 0, todas_las_ofertas_iguales: 0, medibles: 0 };
  const filas = [];
  for (const x of con2) {
    if (x.of.todas_iguales) { c.todas_las_ofertas_iguales++; continue; }
    if (!x.of.ganador_emparejado) { c.ganador_sin_emparejar++; continue; }
    const g = x.of.ganador_pct; if (g == null || g < PISO || g > TECHO) { c.ganador_sin_valor_creible++; continue; }
    c.medibles++;
    const leg = x.of.otras.filter((o) => o != null);
    const bajoCre = leg.filter((o) => o >= PISO && o < g - DELTA), bajoTodo = leg.filter((o) => o < g - DELTA);
    filas.push({ x, g, debajo: bajoCre.length, debajoTodo: bajoTodo.length, masBaja: bajoCre.length ? Math.min(...bajoCre) : null, total: x.of.proveedores });
  }
  const dist = (S) => { const no = S.filter((y) => y.debajo > 0); const d = ordenar(no.map((y) => y.g - y.masBaja));
    return { procesos: S.length, adjudicado_no_fue_la_mas_baja: no.length, pct: S.length ? r1(100 * no.length / S.length) : null,
      contando_tambien_ofertas_bajo_30_pct: S.length ? r1(100 * S.filter((y) => y.debajoTodo > 0).length / S.length) : null,
      ofertas_por_debajo_del_ganador: { ninguna: S.filter((y) => y.debajo === 0).length, una: S.filter((y) => y.debajo === 1).length, dos: S.filter((y) => y.debajo === 2).length, tres_o_mas: S.filter((y) => y.debajo >= 3).length,
        media_por_proceso: r2(media(S.map((y) => y.debajo))), media_cuando_hay: r2(media(no.map((y) => y.debajo))), mediana_cuando_hay: no.length ? cuantil(ordenar(no.map((y) => y.debajo)), 0.5) : null,
        parte_de_las_ofertas_rivales_pct: r1(100 * S.reduce((s, y) => s + y.debajo, 0) / S.reduce((s, y) => s + (y.total - 1), 0)) },
      puntos_entre_el_ganador_y_la_mas_baja: no.length ? { p25: r2(cuantil(d, 0.25)), mediana: r2(cuantil(d, 0.5)), p75: r2(cuantil(d, 0.75)) } : null }; };
  A.adjudicado_y_oferta_mas_baja = { fuente: "wi7w-2nvm (solo trae ofertas de lo recibido desde 2025)", cuentas: c,
    regla: `se compara la oferta del ganador con las demás del mismo conjunto; «más baja» = al menos ${DELTA} puntos por debajo y ≥ ${PISO} % del presupuesto (una «oferta» del 2 % es un precio unitario mal digitado)`,
    lectura: "ofertas PUBLICADAS: los datos abiertos no dicen por qué se cayó la más baja (requisitos, precio artificialmente bajo, o un valor digitado que no era el total)",
    total: dist(filas), por_numero_de_ofertas: Object.fromEntries(["2", "3-4", "5-9", "10+"].map((cl) => [cl, dist(filas.filter((y) => claseOfertas(y.total) === cl))])),
    por_ano: { 2025: dist(filas.filter((y) => y.x.f < CORTE_PRUEBA)), 2026: dist(filas.filter((y) => y.x.f >= CORTE_PRUEBA)) },
    por_departamento: Object.fromEntries(DEPTOS.map(([cod, nom]) => { const d = dist(filas.filter((y) => y.x.dep === cod)); return [nom, { procesos: d.procesos, adjudicado_no_fue_la_mas_baja: d.adjudicado_no_fue_la_mas_baja, pct: d.pct }]; })),
    /* sensibilidad: un ganador que digitó el presupuesto exacto puede traer su oferta real en el PDF; y una diferencia de centésimas no es «otra oferta más baja» */
    sensibilidad: { sin_los_ganadores_que_ofertaron_el_presupuesto_exacto: (() => { const d = dist(filas.filter((y) => y.g < 100 - DELTA)); return { procesos: d.procesos, adjudicado_no_fue_la_mas_baja: d.adjudicado_no_fue_la_mas_baja, pct: d.pct }; })(),
      con_la_mas_baja_al_menos_1_punto_por_debajo_pct: r1(100 * filas.filter((y) => y.masBaja != null && y.g - y.masBaja >= 1).length / filas.length),
      con_la_mas_baja_al_menos_5_puntos_por_debajo_pct: r1(100 * filas.filter((y) => y.masBaja != null && y.g - y.masBaja >= 5).length / filas.length) },
    /* de las ofertas que la entidad tuvo que mirar por orden de precio hasta adjudicar (el ganador y las más bajas que él), cuántas se quedaron con el contrato */
    aceptadas_de_las_examinadas_por_precio: (() => { const caidas = filas.reduce((t, y) => t + y.debajo, 0); return { adjudicadas: filas.length, mas_bajas_que_no_ganaron: caidas, pct: r1(100 * filas.length / (filas.length + caidas)),
      lectura: "de cada 100 ofertas que quedaron de primeras por precio, cuántas se adjudicaron; es la única medida de «queda hábil» que dan los datos abiertos, y no separa la causa" }; })(),
    /* ¿la oferta más baja del proceso gana menos cuando es MUY baja? */
    gana_la_mas_baja_segun_su_nivel: Object.fromEntries([["menos de 70 %", 0, 70], ["70 a 80 %", 70, 80], ["80 a 90 %", 80, 90], ["90 a 100 %", 90, 100.01]].map(([rot, a, b]) => { const S2 = filas.filter((y) => { const m = y.masBaja == null ? y.g : y.masBaja; return m >= a && m < b; });
      return [rot, { procesos: S2.length, la_mas_baja_fue_la_adjudicada: S2.filter((y) => y.debajo === 0).length, pct: S2.length ? r1(100 * S2.filter((y) => y.debajo === 0).length / S2.length) : null }]; })) };

  /* el valor adjudicado contra la oferta del ganador (desde 2025) */
  const conG = F.filter((x) => x.of && x.of.ganador_emparejado && x.of.ganador_pct != null);
  const exacto = F.filter((x) => x.of && Math.abs(100 - x.W) < DELTA);
  A.adjudicado_contra_oferta_del_ganador = { procesos_con_ganador_y_valor: conG.length, coinciden: conG.filter((x) => Math.abs(x.of.ganador_pct - x.W) <= DELTA).length,
    oferta_mas_baja_que_lo_adjudicado: conG.filter((x) => x.of.ganador_pct < x.W - DELTA && x.of.ganador_pct >= PISO).length, oferta_no_creible_bajo_30_o_sobre_100: conG.filter((x) => x.of.ganador_pct < PISO || x.of.ganador_pct > TECHO).length,
    adjudicados_al_presupuesto_exacto_desde_2025: { procesos: exacto.length, una_sola_oferta: exacto.filter((x) => x.of.proveedores === 1).length,
      con_2_o_mas_y_todas_iguales: exacto.filter((x) => x.of.todas_iguales).length,
      con_2_o_mas_y_el_ganador_oferto_menos: exacto.filter((x) => x.of.proveedores >= 2 && x.of.ganador_pct != null && x.of.ganador_pct >= PISO && x.of.ganador_pct < 100 - DELTA).length,
      con_2_o_mas_y_el_ganador_oferto_el_presupuesto: exacto.filter((x) => x.of.proveedores >= 2 && !x.of.todas_iguales && x.of.ganador_pct != null && Math.abs(x.of.ganador_pct - 100) < DELTA).length,
      con_2_o_mas_y_valor_del_ganador_ilegible: exacto.filter((x) => x.of.proveedores >= 2 && !x.of.todas_iguales && (x.of.ganador_pct == null || x.of.ganador_pct < PISO || x.of.ganador_pct > TECHO)).length } };
  A.ofertas_publicadas_contra_respuestas = (() => { const S = F.filter((x) => x.of); return { procesos: S.length, coinciden: S.filter((x) => x.of.proveedores === x.n).length, mas_proveedores_que_respuestas: S.filter((x) => x.of.proveedores > x.n).length, menos: S.filter((x) => x.of.proveedores < x.n).length }; })();

  /* dispersión */
  A.dispersion_por_tramo_de_presupuesto = Object.fromEntries(CT.ROTULOS_TAMANO.map((rot, t) => [rot, resumenW(F.filter((x) => x.t === t).map((x) => x.W))]));
  const pbs = ordenar(F.map((x) => x.pb)); const q = [cuantil(pbs, 0.25), cuantil(pbs, 0.5), cuantil(pbs, 0.75)];
  A.dispersion_por_cuartil_de_presupuesto = { cortes_pesos: q, nota: "los cortes de lib/competencia_por_tamano dejan casi toda la mínima cuantía en el primer tramo; aquí, los cuartiles del propio presupuesto",
    cuartiles: Object.fromEntries(["primer cuartil (los más pequeños)", "segundo", "tercero", "cuarto (los más grandes)"].map((rot, i) => [rot, resumenW(F.filter((x) => (x.pb <= q[0] ? 0 : x.pb <= q[1] ? 1 : x.pb <= q[2] ? 2 : 3) === i).map((x) => x.W))])) };
  A.dispersion_por_departamento = Object.fromEntries([...DEPTOS.map(([cod, nom]) => { const S = F.filter((x) => x.dep === cod);
    return [nom, { ...resumenW(S.map((x) => x.W)), con_una_oferta_pct: S.length ? r1(100 * S.filter((x) => x.n === 1).length / S.length) : null, con_3_o_mas_pct: S.length ? r1(100 * S.filter((x) => x.n >= 3).length / S.length) : null, entidades: new Set(S.map((x) => x.ent)).size }]; }),
  ["total", { ...resumenW(F.map((x) => x.W)), con_una_oferta_pct: r1(100 * F.filter((x) => x.n === 1).length / F.length), con_3_o_mas_pct: r1(100 * F.filter((x) => x.n >= 3).length / F.length), entidades: new Set(F.map((x) => x.ent)).size }]]);
  A.sin_departamento_legible = F.filter((x) => x.dep == null).length;
  return A;
}

/* ── control: las cifras del 11-nov, con el MISMO código (aproximacion.js) sobre lo bajado hoy ── */
function control(dir, crudas) {
  const d = path.join(dir, "control"); fs.mkdirSync(d, { recursive: true });
  for (const f of fs.readdirSync(d)) fs.unlinkSync(path.join(d, f));
  fs.writeFileSync(path.join(d, "obra_0.json"), JSON.stringify(crudas.filter((r) => String(r.fecha_de_recepcion_de || "") >= "2024-01-01")));
  const hoy = AP.medir(AP.filas(d), "minima");
  let antes = null; try { antes = JSON.parse(fs.readFileSync(path.join(RAIZ, "tools", "analisis", "plan_x20", "aproximacion_2026-11-11.json"), "utf8")).por_modalidad.minima; } catch (e) { antes = { error: String(e.message) }; }
  const fila = (o) => (o && o.todas ? { aprende: o.aprende, prueba: o.prueba, entidad: o.todas.entidad, entidad_comp: o.todas.entidad_comp, oraculo: o.todas.oraculo } : o);
  return { como: "plan_x20/aproximacion.js (filas + medir, sin tocarlo) sobre las filas de mínima cuantía recibidas desde 2024-01-01 que se bajaron hoy; su filtro es 70 %–100 % y aprende al día siguiente de recibir", el_11_nov: fila(antes), hoy: fila(hoy) };
}

if (require.main === module) {
  const dir = process.argv[2];
  if (!dir) { console.error("uso: node tools/analisis/plan_precio/minima_medir.js <carpeta_de_datos> [salida.json]"); process.exit(2); }
  const meta = JSON.parse(fs.readFileSync(path.join(dir, "consulta.json"), "utf8"));
  const salida = process.argv[3] || path.join(__dirname, `resultados_minima_${meta.consulta}.json`);
  const guardar = (R) => fs.writeFileSync(salida, JSON.stringify(R, null, 1) + "\n");
  const crudas = leerProcesos(dir), ofertas = leerOfertas(dir);
  const pob = construir(crudas, ofertas, PISO);
  const F = pob.F;
  const R = {
    consulta: meta.consulta, consulta_utc: meta.consulta_inicio_utc,
    fuente: "datos.gov.co · p6dx-8zbt (procesos de SECOP II) y wi7w-2nvm (ofertas por proceso)", consulta_de_procesos: meta.donde,
    unidad: "% del presupuesto oficial (precio_base)", cortes: { aprende_antes_de: CORTE_PRUEBA, elige_en: "2025", prueba_desde: CORTE_PRUEBA, min_entidad: MIN_ENTIDAD, min_departamento_y_tramo: MIN_DEPTO, higiene_W: [PISO, 100], replicas: REPLICAS, semilla: SEMILLA },
    supuestos: ["la oferta propia queda hábil (los datos abiertos no dicen quién quedó hábil)", "gana quien oferta por debajo del precio al que se adjudicó: las más bajas que el ganador real fueron descartadas", "los demás no cambian su precio porque usted se presente",
      "W = valor adjudicado ÷ presupuesto; donde se adjudicó por el presupuesto exacto con una oferta ganadora más baja, W exagera (variante con_la_oferta_ganadora)", "solo procesos adjudicados: un desierto no cuenta", "no mide el trámite de precio artificialmente bajo que abre una oferta muy baja"],
    poblacion: { filas_bajadas: crudas.length, portafolios: pob.portafolios, procesos: F.length, apartados: pob.apartados, aprende: F.filter((x) => x.f < CORTE_PRUEBA).length, prueba_2026: F.filter((x) => x.f >= CORTE_PRUEBA).length,
      por_ano: Object.fromEntries([...new Set(F.map((x) => x.f.slice(0, 4)))].sort().map((a) => [a, F.filter((x) => x.f.startsWith(a)).length])), ultima_recepcion: F[F.length - 1].f,
      sin_fecha_de_adjudicacion: pob.sin_fecha_de_adjudicacion_se_da_por_conocido_a_los_7_dias, ofertas: pob.ofertas,
      ofertas_solo_desde_2025: "wi7w-2nvm devolvió 0 filas para los procesos recibidos en 2022, 2023 y 2024 (su `fecha_de_registro` más antigua es 2024-12-31)" },
  };
  guardar(R);
  /* el piso de 70 % de los scripts anteriores, ¿recorta ofertas reales? */
  const sinPiso = construir(crudas, ofertas, 0).F;
  const bajo70 = sinPiso.filter((x) => x.W < 70), bajo70of = bajo70.filter((x) => x.of && x.of.proveedores >= 2);
  const medOf = (x) => { const v = ordenar([x.of.ganador_pct, ...x.of.otras].filter((o) => o != null && o > 0 && o <= 200)); return v.length ? cuantil(v, 0.5) : null; };
  R.piso_de_70 = { adjudicados_bajo_70_pct_del_presupuesto: bajo70.length, de: sinPiso.length, pct: r1(100 * bajo70.length / sinPiso.length), entre_30_y_70: bajo70.filter((x) => x.W >= 30).length, bajo_30: bajo70.filter((x) => x.W < 30).length,
    con_ofertas_para_comprobar_desde_2025: bajo70of.length, la_mediana_de_las_ofertas_del_proceso_esta_sobre_70: bajo70of.filter((x) => { const m = medOf(x); return m != null && m >= 70; }).length,
    lectura: "si las demás ofertas del proceso están sobre el 70 %, el presupuesto no está desactualizado: el ganador de verdad ofertó bajo el 70 % y el piso de 70 % lo estaba recortando" };
  R.control_11_nov = control(dir, crudas);
  /* hallazgo lateral: la regla de higiene de la aplicación (lib/indice_baja.bajaDeFila) sobre las MISMAS filas crudas */
  const desc = {}; for (const r of crudas) { const d = IB.bajaDeFila(r).descarte || "aporta_baja"; desc[d] = (desc[d] || 0) + 1; }
  const nd = (r) => normal(r.nit_del_proveedor_adjudicado) === "NO DEFINIDO";
  R.hallazgo_lateral_indice_baja = { que: "lib/indice_baja.bajaDeFila (la regla que alimenta la tabla de mínima cuantía de la aplicación) llamada sobre las filas crudas de p6dx-8zbt bajadas hoy", filas: crudas.length, resultado: desc,
    filas_con_nit_no_definido_y_nombre_y_codigo: crudas.filter((r) => nd(r) && normal(r.nombre_del_proveedor) !== "NO DEFINIDO" && normal(r.codigoproveedor) !== "NO DEFINIDO" && r.codigoproveedor).length,
    lectura: "`adjudicatarioReal` lee el primer campo no vacío de [nit_del_proveedor_adjudicado, …, codigoproveedor]; «No Definido» no es vacío, así que la fila se descarta aunque traiga nombre y código de proveedor",
    sin_verificar: "que el histórico de producción guarde ese campo igual que la fila cruda; aquí solo se ejecutó la función sobre lo bajado" };
  guardar(R);
  R.A_hechos = hechos(F);
  guardar(R);
  const principal = evaluar(F, { campo: "W", desdeAprende: "2022-01-01", completo: true });
  Object.assign(R, { exactitud_mediana: principal.exactitud_mediana, exactitud_mediana_con_3_o_mas_ofertas: principal.exactitud_mediana_con_3_o_mas_ofertas, K_elegido_en_2025: principal.K_elegido_en_2025, cortes_cuartil_presupuesto: principal.cortes_cuartil_presupuesto, prueba_evaluada: principal.prueba, valida_2025: principal.valida_2025,
    B_decision: principal.B_decision, B_notas: principal.B_notas, C_dinero: principal.C_dinero, D_por_competencia_real: principal.D_por_competencia_real, D_anuncio_de_competencia: principal.D_anuncio_de_competencia, E_cobertura: principal.E_cobertura, E_decision_segun_historial: principal.E_decision_segun_historial });
  guardar(R);
  /* variantes: lo mismo con otra higiene, otro historial y otro blanco */
  const corta = (e) => ({ aprende_desde: e.aprende_desde, blanco: e.blanco, prueba: e.prueba, exactitud_mediana: e.exactitud_mediana, B_decision: Object.fromEntries(Object.entries(e.B_decision).map(([k, o]) => [k, Object.fromEntries(Object.entries(o).filter(([m]) => m !== "calibracion"))])) });
  const F70 = construir(crudas, ofertas, 70).F;
  R.variantes = {
    con_piso_de_70: { nota: "la higiene de plan_x20 (70 %–100 %): recorta la cola baja", procesos: F70.length, ...corta(evaluar(F70, { completo: false })) },
    aprendiendo_solo_2025: { nota: "mismo blanco, historial solo desde 2025 (para comparar con la variante de abajo)", ...corta(evaluar(F, { desdeAprende: CORTE_VALIDA, completo: false })) },
    con_la_oferta_ganadora: { nota: "blanco = la oferta del ganador (wi7w-2nvm), que es el precio que había que batir; fuera los procesos donde no se lee o donde todas las ofertas son iguales; historial solo desde 2025",
      procesos_2025_2026: F.filter((x) => x.f >= CORTE_VALIDA).length, con_blanco: F.filter((x) => x.f >= CORTE_VALIDA && x.Wc != null).length, blanco_distinto_del_adjudicado: F.filter((x) => x.f >= CORTE_VALIDA && x.Wc != null && Math.abs(x.Wc - x.W) > DELTA).length,
      ...corta(evaluar(F, { campo: "Wc", desdeAprende: CORTE_VALIDA, completo: false })) },
  };
  guardar(R);
  console.log("escrito " + salida);
}
module.exports = { construir, recorrer, evaluar, hechos, perfil, proveedoresDe, leerProcesos, leerOfertas };
