"use strict";
/* ============================================================================
   Plan x20 · la medición del mercado que sostiene docs/PLAN_X20.md (11-nov-2026)
   ----------------------------------------------------------------------------
   Solo MIDE, fuera de la aplicación: lee los JSON que bajó `descargar.sh` de
   datos.gov.co (p6dx-8zbt, procesos de SECOP II; wi7w-2nvm, ofertas por proceso)
   y escribe las cifras en `resultados_AAAA-MM-DD.json`. No toca Redis ni producción.

     bash tools/analisis/plan_x20/descargar.sh <carpeta>
     node tools/analisis/plan_x20/medir.js <carpeta> [AAAA-MM-DD de la consulta]

   Qué responde, sobre la selección abreviada de menor cuantía de OBRA:
     A · cuántas ofertas llegan a cada proceso adjudicado (por modalidad, tamaño y departamento);
     B · a cuánto se adjudica según cuántas ofertas llegaron;
     C · si el historial de la entidad anticipa la competencia (aprende < 2026, prueba 2026);
     D · quién gana cuando llega un oferente nuevo a una entidad con ganador «de casa»;
     E · dónde se agrupan las ofertas y qué opción tiene cada precio (inserción contrafáctica);
     F · la foto de los procesos que aún no cierran su manifestación de interés;
     G · los dos procesos del diagnóstico (Cali, Santa Elena; Universidad Pedagógica, 011).

   LÍMITES QUE VAN CON CADA CIFRA (no se quitan al citarla):
     · Solo procesos ADJUDICADOS (salvo F). Un desierto no cuenta.
     · «Ofertas» son las PUBLICADAS: los datos abiertos no dicen quién quedó hábil
       (docs/MEMORIA.md § «Fase 2: el piso se reproduce, el ganador no — los datos abiertos no dicen quién quedó hábil (17-oct-2026)»). Por eso E es
       una REFERENCIA «con todas hábiles», no una probabilidad de ganar ni una cota: si un rival no
       queda hábil la cifra sube, y si la oferta propia no queda hábil o pierde puntos fuera del precio, baja.
     · El presupuesto es `precio_base` de SECOP II, que puede diferir del pliego definitivo
       (en Santa Elena la fila de observaciones traía el del borrador, 10,3 % más alto; desde la
       manifestación SECOP II trae el definitivo). Se apartan los procesos con ofertas sobre el 100 % o bajo el 70 %.
     · «De casa» = el oferente ya había ganado en esa entidad desde 2024, emparejado por código
       de proveedor, NIT o nombre. Un consorcio con nombre nuevo no se reconoce: es cota inferior.
     · Los cuatro métodos se LLAMAN de scripts/base_obra/metodos.js (no se reescriben). Valen
       para los documentos tipo; un pliego de régimen especial puede traer otros.
   ============================================================================ */
const fs = require("fs");
const path = require("path");
const METODOS = require(path.join(__dirname, "..", "..", "..", "scripts", "base_obra", "metodos.js"));

const CORTE_PRUEBA = "2026-01-01";          // aprende antes, prueba después
const CORTE_ULTIMO_ANO = "2025-11-01";      // «el último año» de la medición
const K = 4;                                 // encogimiento: K procesos «virtuales» con la tasa del nivel de arriba
const MIN_PREVIOS = 4;                       // una entidad «con historial» tiene 4 o más adjudicados antes
const UMBRAL_POCA = 0.8, UMBRAL_MUCHA = 0.3;
const UMBRAL_MIPYME_2026 = 511708497;       // US$125.000 (umbrales de Colombia Compra Eficiente para 2026)
const DEPARTAMENTOS_EJEMPLO = ["Tolima"];  // el domicilio del dueño: sus entidades, una por una

const leer = (d, f) => JSON.parse(fs.readFileSync(path.join(d, f), "utf8"));
const soloDigitos = (s) => String(s == null ? "" : s).replace(/\D+/g, "");
const normal = (s) => String(s == null ? "" : s).normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase().replace(/[^A-Z0-9]+/g, " ").trim();
const media = (v) => (v.length ? v.reduce((a, b) => a + b, 0) / v.length : null);
const cuantil = (v, p) => { if (!v.length) return null; const a = v.slice().sort((x, y) => x - y); return a[Math.floor(p * (a.length - 1))]; };
const mediana = (v) => { if (!v.length) return null; const a = v.slice().sort((x, y) => x - y), n = a.length; return n % 2 ? a[(n - 1) / 2] : (a[n / 2 - 1] + a[n / 2]) / 2; };
const r2 = (x) => (x == null ? null : Math.round(x * 100) / 100);
const r1 = (x) => (x == null ? null : Math.round(x * 10) / 10);
const pct = (a, b) => (b ? r1(a * 100 / b) : null);
const tramoOfertas = (n) => (n === 1 ? "1" : n === 2 ? "2" : n <= 4 ? "3-4" : n <= 9 ? "5-9" : "10+");
const TRAMOS = ["1", "2", "3-4", "5-9", "10+"];
const tamano = (pb) => (pb < 150e6 ? "<150M" : pb < 300e6 ? "150-300M" : pb < 500e6 ? "300-500M" : pb < 1000e6 ? "500M-1000M" : ">1000M");
const TAMANOS = ["<150M", "150-300M", "300-500M", "500M-1000M", ">1000M"];
function meter(o, k, x) { if (!o[k]) o[k] = []; o[k].push(x); }

/* Una fila por portafolio: p6dx repite el proceso (una fila por fase o por republicación). Se
   queda la de más respuestas. Sin `respuestas_al_procedimiento` legible NO es «cero ofertas»:
   la fila se aparta y se cuenta. */
function historialDe(dir) {
  const porId = {}, apartados = { sin_portafolio: 0, sin_ofertas_legibles: 0, sin_presupuesto: 0 };
  for (const r of leer(dir, "historial.json")) {
    const id = r.id_del_portafolio;
    if (!id) { apartados.sin_portafolio++; continue; }
    const n = parseInt(r.respuestas_al_procedimiento, 10);
    const ant = porId[id];
    if (!ant || (Number.isFinite(n) && n > (ant.n == null ? -1 : ant.n))) {
      porId[id] = {
        id, ent: r.nit_entidad, entidad: r.entidad, dep: r.departamento_entidad, f: r.fecha_de_recepcion_de,
        n: Number.isFinite(n) ? n : null, pb: Number(r.precio_base), va: Number(r.valor_total_adjudicacion),
        cod: normal(r.codigoproveedor) === "NO DEFINIDO" ? null : r.codigoproveedor, nitg: soloDigitos(r.nit_del_proveedor_adjudicado), nomg: normal(r.nombre_del_proveedor),
      };
    }
  }
  const filas = [];
  for (const x of Object.values(porId)) {
    if (x.n == null || x.n < 1) { apartados.sin_ofertas_legibles++; continue; }
    if (!(x.pb > 0)) { apartados.sin_presupuesto++; continue; }
    filas.push(x);
  }
  filas.sort((a, b) => (a.f < b.f ? -1 : a.f > b.f ? 1 : 0));
  return { filas, apartados };
}

/* ── modo «tandas»: los identificadores cuyas ofertas hay que bajar ───────── */
function escribirTandas(dir) {
  const { filas } = historialDe(dir);
  const prueba = filas.filter((x) => x.f >= CORTE_ULTIMO_ANO && x.n >= 2 && x.n <= 9).map((x) => x.id);
  const antes = filas.filter((x) => x.f < CORTE_ULTIMO_ANO && x.n >= 3 && x.n <= 30).map((x) => x.id);
  const trozos = (ids, t) => { const o = []; for (let i = 0; i < ids.length; i += t) o.push(ids.slice(i, i + t).map((x) => "'" + x + "'").join(",")); return o; };
  fs.writeFileSync(path.join(dir, "tandas_prueba.txt"), trozos(prueba, 50).join("\n") + "\n");
  fs.writeFileSync(path.join(dir, "tandas_antes.txt"), trozos(antes, 40).join("\n") + "\n");
  /* La muestra del contraste: 200 procesos con UNA respuesta, uno de cada k por orden de identificador
     (fija: dos corridas sobre el mismo historial dan la misma muestra). */
  const una = filas.filter((x) => x.f >= CORTE_ULTIMO_ANO && x.n === 1).map((x) => x.id).sort();
  const paso = Math.max(1, Math.floor(una.length / 200));
  const muestra = una.filter((_, i) => i % paso === 0).slice(0, 200);
  fs.writeFileSync(path.join(dir, "tandas_contraste.txt"), trozos(muestra, 50).join("\n") + "\n");
  fs.writeFileSync(path.join(dir, "contraste_muestra.json"), JSON.stringify(muestra));
  console.log("   tandas: " + prueba.length + " procesos de prueba (2 a 9 ofertas), " + antes.length + " anteriores (3 a 30 ofertas) y " + muestra.length + " del contraste (1 respuesta)");
}

/* ── C · el modelo de competencia: tasa de «1 o 2 ofertas», encogida por niveles ── */
function modeloCompetencia(filasAprende) {
  const poca = (r) => (r.n <= 2 ? 1 : 0);
  const tasa = (rs) => (rs.length ? rs.reduce((a, r) => a + poca(r), 0) / rs.length : null);
  const base = tasa(filasAprende), porTam = {}, porDepTam = {}, hist = {};
  for (const r of filasAprende) { meter(porTam, tamano(r.pb), r); meter(porDepTam, r.dep + "|" + tamano(r.pb), r); meter(hist, r.ent, r); }
  function anuncia(ent, dep, pb) {
    const tT = tasa(porTam[tamano(pb)] || []);
    const pTam = tT == null ? base : tT;
    const dt = porDepTam[dep + "|" + tamano(pb)] || [];
    const pDep = (dt.reduce((a, x) => a + poca(x), 0) + K * pTam) / (dt.length + K);
    const h = hist[ent] || [], hT = h.filter((x) => tamano(x.pb) === tamano(pb));
    const pEntGen = (h.reduce((a, x) => a + poca(x), 0) + K * pDep) / (h.length + K);
    const pEnt = (hT.reduce((a, x) => a + poca(x), 0) + K * pEntGen) / (hT.length + K);
    return { base, pTam, pDep, pEnt, previos: h.slice() };
  }
  return { anuncia, aprender: (r) => meter(hist, r.ent, r), poca };
}

function ofertasDe(dir, carpetas) {
  const porProceso = {};
  for (const c of carpetas) {
    const d = path.join(dir, c);
    if (!fs.existsSync(d)) continue;
    for (const f of fs.readdirSync(d)) for (const r of JSON.parse(fs.readFileSync(path.join(d, f), "utf8"))) meter(porProceso, r.id_del_proceso_de_compra, r);
  }
  return porProceso;
}

/* Las ofertas de un proceso, una entrada por proveedor. `varios` = algún proveedor trae más de un
   valor (lotes, o una oferta corregida): ese proceso no entra en las cuentas de precio.
   Dos trampas del conjunto wi7w-2nvm, medidas el 11-nov-2026 en 200 procesos que p6dx da con UNA
   respuesta (199 tienen un solo proveedor con nombre):
     · el MISMO proveedor sale a veces con y sin `c_digo_proveedor`: agrupar por código lo contaba
       dos veces. Se agrupa por el NOMBRE (el código y el NIT quedan como conjuntos para emparejar);
     · una fila «Confidencial» con valor 0 acompaña a veces a la oferta real (6 de 200) sin ser otra
       respuesta: no cuenta como proveedor. */
function proveedoresDe(filas) {
  const por = {};
  for (const r of filas) {
    const nom = normal(r.nombre_proveedor);
    if (nom === "CONFIDENCIAL") continue;
    meter(por, nom || r.c_digo_proveedor || soloDigitos(r.nit_del_proveedor), r);
  }
  return Object.entries(por).map(([k, rs]) => ({
    k, nom: normal(rs[0].nombre_proveedor), nombre: rs[0].nombre_proveedor,
    cods: new Set(rs.map((r) => r.c_digo_proveedor).filter((c) => c && normal(c) !== "NO DEFINIDO")),
    nits: new Set(rs.map((r) => soloDigitos(r.nit_del_proveedor)).filter((x) => x.length >= 6)),
    valores: [...new Set(rs.map((r) => Number(r.valor_de_la_oferta)).filter((x) => x > 0))],
  }));
}
/* ¿Este oferente es ese adjudicatario (o ese ganador anterior)? Por código, NIT o nombre. */
const esElMismo = (o, h) => (!!h.cod && o.cods.has(h.cod)) || (!!h.nitg && h.nitg.length >= 6 && o.nits.has(h.nitg)) || (!!h.nomg && h.nomg === o.nom);

/* E · entro como un oferente más a `x` % del presupuesto: fracción de los cuatro métodos (25 % cada
   uno) en que quedo primero; un empate en el primer puesto se reparte. Todas las ofertas se toman
   como hábiles e iguales fuera del precio: es una referencia, no una cota (ver la cabecera). */
function opcionAl(pcts, x) {
  const v = pcts.concat([x]);
  let t = 0;
  for (const m of METODOS.METODOS) {
    const primeros = METODOS.primeros(v, m, METODOS.PUNTAJE_MAXIMO.menor_cuantia);
    if (primeros && primeros.includes(v.length - 1)) t += 0.25 / primeros.length;
  }
  return t;
}

function medir(dir, fechaConsulta) {
  const R = { consulta: fechaConsulta, fuente: "datos.gov.co · p6dx-8zbt (procesos de SECOP II) y wi7w-2nvm (ofertas por proceso)", poblacion: "Selección abreviada de menor cuantía, tipo de contrato «Obra», en fase de ofertas", cortes: { ultimo_ano_desde: CORTE_ULTIMO_ANO, prueba_desde: CORTE_PRUEBA, encogimiento_K: K, previos_minimos: MIN_PREVIOS } };
  const { filas: H, apartados } = historialDe(dir);
  R.historial = { adjudicados_desde_2024: H.length, apartados, por_ano: {} };
  for (const x of H) R.historial.por_ano[x.f.slice(0, 4)] = (R.historial.por_ano[x.f.slice(0, 4)] || 0) + 1;

  /* A · por modalidad (obra adjudicada, recepción desde el corte) */
  const mod = {};
  for (const r of leer(dir, "modalidades.json")) {
    const n = parseInt(r.respuestas_al_procedimiento, 10);
    if (!Number.isFinite(n) || n < 1) continue;
    const m = r.modalidad_de_contratacion;
    if (!mod[m]) mod[m] = { total: 0 };
    mod[m][tramoOfertas(n)] = (mod[m][tramoOfertas(n)] || 0) + Number(r.n);
    mod[m].total += Number(r.n);
  }
  R.A_por_modalidad = Object.entries(mod).sort((a, b) => b[1].total - a[1].total).map(([m, c]) => ({ modalidad: m, adjudicados: c.total, pct: Object.fromEntries(TRAMOS.map((t) => [t, pct(c[t] || 0, c.total)])) }));

  /* A · el último año de la menor cuantía de obra */
  const ua = {};
  for (const r of leer(dir, "ultimo_ano.json")) { if (!r.id_del_portafolio) continue; if (!ua[r.id_del_portafolio] || r.adjudicado === "Si") ua[r.id_del_portafolio] = r; }
  const uaL = Object.values(ua);
  const U = H.filter((x) => x.f >= CORTE_ULTIMO_ANO);
  R.A_ultimo_ano = {
    en_fase_de_ofertas: uaL.length, adjudicados: uaL.filter((r) => r.adjudicado === "Si").length, adjudicados_con_dato: U.length,
    ofertas_por_proceso: Object.fromEntries(TRAMOS.map((t) => [t, { n: U.filter((x) => tramoOfertas(x.n) === t).length, pct: pct(U.filter((x) => tramoOfertas(x.n) === t).length, U.length) }])),
    con_una_o_dos_pct: pct(U.filter((x) => x.n <= 2).length, U.length),
    presupuesto: { p25: cuantil(U.map((x) => x.pb), 0.25), mediana: cuantil(U.map((x) => x.pb), 0.5), p75: cuantil(U.map((x) => x.pb), 0.75), p90: cuantil(U.map((x) => x.pb), 0.9), suma: U.reduce((a, x) => a + x.pb, 0) },
  };
  R.A_por_tamano = TAMANOS.map((t) => { const s = U.filter((x) => tamano(x.pb) === t); return { tamano: t, n: s.length, una_pct: pct(s.filter((x) => x.n === 1).length, s.length), una_o_dos_pct: pct(s.filter((x) => x.n <= 2).length, s.length), tres_a_nueve_pct: pct(s.filter((x) => x.n >= 3 && x.n <= 9).length, s.length), diez_o_mas_pct: pct(s.filter((x) => x.n >= 10).length, s.length), mediana_ofertas: mediana(s.map((x) => x.n)) }; });
  const porDep = {};
  for (const x of U) meter(porDep, x.dep, x);
  R.A_por_departamento = Object.entries(porDep).sort((a, b) => b[1].length - a[1].length).slice(0, 18).map(([d, s]) => ({ departamento: d, n: s.length, una_pct: pct(s.filter((x) => x.n === 1).length, s.length), una_o_dos_pct: pct(s.filter((x) => x.n <= 2).length, s.length), mediana_presupuesto: cuantil(s.map((x) => x.pb), 0.5) }));

  /* A · ejemplos: las entidades del departamento del dueño con 5 o más adjudicados desde 2024 */
  const porEnt = {};
  for (const x of H) { if (DEPARTAMENTOS_EJEMPLO.includes(x.dep)) meter(porEnt, x.ent, x); }
  R.A_ejemplos_por_entidad = Object.values(porEnt).filter((s) => s.length >= 5).map((s) => ({ departamento: s[0].dep, entidad: s[0].entidad, adjudicados: s.length, con_una_oferta: s.filter((x) => x.n === 1).length, con_dos: s.filter((x) => x.n === 2).length, ganadores_distintos: new Set(s.map((x) => x.cod || x.nitg || x.nomg)).size, mediana_presupuesto: mediana(s.map((x) => x.pb)) })).sort((a, b) => b.con_una_oferta / b.adjudicados - a.con_una_oferta / a.adjudicados || b.adjudicados - a.adjudicados);

  /* B · a cuánto se adjudica según cuántas ofertas llegaron */
  const razonDe = (x) => (x.va > 0 ? x.va * 100 / x.pb : null);
  const enRango = (q) => q != null && q >= 70 && q <= 100.0001;
  R.B_adjudicado_sobre_presupuesto = { fuera_de_rango_o_sin_dato: U.filter((x) => !enRango(razonDe(x))).length, por_ofertas: TRAMOS.map((t) => { const v = U.filter((x) => tramoOfertas(x.n) === t).map(razonDe).filter(enRango); return { ofertas: t, n: v.length, p25: r2(cuantil(v, 0.25)), mediana: r2(mediana(v)), p75: r2(cuantil(v, 0.75)) }; }) };

  /* C · ¿el historial anticipa la competencia? aprende antes del corte, prueba después */
  const aprende = H.filter((x) => x.f < CORTE_PRUEBA), prueba = H.filter((x) => x.f >= CORTE_PRUEBA);
  const mc = modeloCompetencia(aprende);
  const perdida = (p, y) => { const q = Math.min(1 - 1e-6, Math.max(1e-6, p)); return -(y * Math.log(q) + (1 - y) * Math.log(1 - q)); };
  const L = { nacional: [], tamano: [], departamento_tamano: [], entidad: [] }, P = [];
  for (const r of prueba) {
    const a = mc.anuncia(r.ent, r.dep, r.pb), y = mc.poca(r);
    L.nacional.push(perdida(a.base, y)); L.tamano.push(perdida(a.pTam, y)); L.departamento_tamano.push(perdida(a.pDep, y)); L.entidad.push(perdida(a.pEnt, y));
    const repetido = a.previos.some((x) => (x.cod && x.cod === r.cod) || (x.nitg && x.nitg.length >= 6 && x.nitg === r.nitg) || (x.nomg && x.nomg === r.nomg));
    P.push(Object.assign({}, r, { p: a.pEnt, nh: a.previos.length, repetido, y }));
    mc.aprender(r);
  }
  const cubetas = [[0, 0.2], [0.2, 0.4], [0.4, 0.6], [0.6, 0.8], [0.8, 0.9], [0.9, 1.01]];
  const conH = P.filter((x) => x.nh >= MIN_PREVIOS);
  R.C_anticipar_competencia = {
    aprende: aprende.length, prueba: prueba.length,
    perdida_logaritmica: Object.fromEntries(Object.entries(L).map(([k, v]) => [k, Math.round(media(v) * 10000) / 10000])),
    mejora_entidad_frente_a_tamano_pct: r1((1 - media(L.entidad) / media(L.tamano)) * 100),
    calibracion: cubetas.map(([a, b]) => { const s = P.filter((x) => x.p >= a && x.p < b); return { dijo_entre: [a * 100, Math.min(b, 1) * 100], procesos: s.length, tuvieron_1_o_2_pct: pct(s.filter((x) => x.y).length, s.length), tuvieron_1_pct: pct(s.filter((x) => x.n === 1).length, s.length) }; }),
    con_historial: { procesos: conH.length, de: P.length, dijo_poca_80: (() => { const s = conH.filter((x) => x.p >= 0.8); return { procesos: s.length, acierto_pct: pct(s.filter((x) => x.y).length, s.length), una_sola_pct: pct(s.filter((x) => x.n === 1).length, s.length) }; })(), dijo_poca_90: (() => { const s = conH.filter((x) => x.p >= 0.9); return { procesos: s.length, acierto_pct: pct(s.filter((x) => x.y).length, s.length), una_sola_pct: pct(s.filter((x) => x.n === 1).length, s.length) }; })(), dijo_mucha_30: (() => { const s = conH.filter((x) => x.p <= 0.3); return { procesos: s.length, tuvieron_3_o_mas_pct: pct(s.filter((x) => !x.y).length, s.length) }; })() },
  };
  const meses = (new Date(fechaConsulta + "T00:00:00Z") - new Date(CORTE_PRUEBA + "T00:00:00Z")) / 86400000 / 30.4375;
  const anun = P.filter((x) => x.p >= UMBRAL_POCA && x.nh >= MIN_PREVIOS), mucha = P.filter((x) => x.p <= UMBRAL_MUCHA && x.nh >= MIN_PREVIOS);
  const una = anun.filter((x) => x.n === 1);
  const depA = {};
  for (const x of anun) meter(depA, x.dep, x);
  const depM = {};
  for (const x of mucha) depM[x.dep] = (depM[x.dep] || 0) + 1;
  R.C_anunciados_2026 = {
    meses_medidos: r1(meses),
    poca_competencia: { procesos: anun.length, al_mes: r1(anun.length / meses), entidades: new Set(anun.map((x) => x.ent)).size, bajo_umbral_mipyme_2026: anun.filter((x) => x.pb < UMBRAL_MIPYME_2026).length, una_sola_pct: pct(una.length, anun.length), una_o_dos_pct: pct(anun.filter((x) => x.n <= 2).length, anun.length), mediana_presupuesto: cuantil(anun.map((x) => x.pb), 0.5), suma_presupuesto: anun.reduce((a, x) => a + x.pb, 0), adjudicado_sobre_presupuesto_mediana: r2(mediana(anun.map(razonDe).filter(enRango))), de_una_sola: { procesos: una.length, ganador_ya_habia_ganado_alli: una.filter((x) => x.repetido).length, ganador_nuevo_alli: una.filter((x) => !x.repetido).length } },
    por_departamento: Object.entries(depA).sort((a, b) => b[1].length - a[1].length).slice(0, 20).map(([d, s]) => { const u = s.filter((x) => x.n === 1); return { departamento: d, procesos: s.length, al_mes: r1(s.length / meses), una_sola_pct: pct(u.length, s.length), ganador_repetido_pct: pct(u.filter((x) => x.repetido).length, u.length), mediana_presupuesto: cuantil(s.map((x) => x.pb), 0.5) }; }),
    mucha_competencia: { procesos: mucha.length, mediana_ofertas: mediana(mucha.map((x) => x.n)), adjudicado_sobre_presupuesto_mediana: r2(mediana(mucha.map(razonDe).filter(enRango))), donde: Object.entries(depM).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([d, n]) => ({ departamento: d, procesos: n })) },
  };

  /* D y E · con las ofertas de los procesos de 2 a 9 ofertas del último año */
  const porId = Object.fromEntries(H.map((x) => [x.id, x]));
  const ganadores = {};
  for (const x of H) meter(ganadores, x.ent, x);
  const ofP = ofertasDe(dir, ["of_prueba"]);
  const procs = [], concuerda = { procesos: 0, iguales: 0 };
  for (const [id, filas] of Object.entries(ofP)) {
    const p = porId[id];
    if (!p) continue;
    const provs = proveedoresDe(filas);
    concuerda.procesos++;
    if (provs.length === p.n) concuerda.iguales++;
    if (provs.length < 2 || provs.length > 9) continue;
    const g = provs.findIndex((o) => esElMismo(o, p));
    procs.push({ p, provs, n: provs.length, g, varios: provs.some((o) => o.valores.length !== 1) });
  }
  const t3 = (n) => (n === 2 ? "2" : n <= 4 ? "3-4" : "5-9");
  const T3 = ["2", "3-4", "5-9"];
  const casa = Object.fromEntries(T3.map((t) => [t, { procesos: 0, gano_uno_de_casa: 0, por_azar: 0 }]));
  let sinCasa = 0, todosCasa = 0;
  for (const x of procs) {
    if (x.g < 0) continue;
    const previos = (ganadores[x.p.ent] || []).filter((h) => h.f < x.p.f);
    const es = x.provs.map((o) => previos.some((h) => esElMismo(o, h)));
    const k = es.filter(Boolean).length;
    if (k === 0) { sinCasa++; continue; }
    if (k === x.n) { todosCasa++; continue; }
    const c = casa[t3(x.n)];
    c.procesos++; c.por_azar += k / x.n; if (es[x.g]) c.gano_uno_de_casa++;
  }
  /* Contraste de la columna que sostiene A, B y C: en una muestra fija de procesos que p6dx da con
     UNA respuesta, ¿cuántos proveedores con nombre trae wi7w-2nvm? (si `descargar.sh` la bajó) */
  const dirContraste = path.join(dir, "contraste");
  if (fs.existsSync(dirContraste)) {
    const porProc = ofertasDe(dir, ["contraste"]);
    const muestra = leer(dir, "contraste_muestra.json");
    const cuenta = {};
    for (const id of muestra) { const k = String(proveedoresDe(porProc[id] || []).length); cuenta[k] = (cuenta[k] || 0) + 1; }
    R.contraste_una_respuesta = { muestra: muestra.length, proveedores_con_nombre: cuenta };
  }
  R.contraste_dos_a_nueve = { procesos: concuerda.procesos, mismos_proveedores_que_respuestas: concuerda.iguales, pct: pct(concuerda.iguales, concuerda.procesos) };
  R.D_el_de_casa = { procesos_con_ofertas: procs.length, ganador_emparejado: procs.filter((x) => x.g >= 0).length, sin_ninguno_de_casa: sinCasa, todos_de_casa: todosCasa, por_ofertas: T3.map((t) => ({ ofertas: t, procesos: casa[t].procesos, gano_uno_de_casa: casa[t].gano_uno_de_casa, gano_uno_de_casa_pct: pct(casa[t].gano_uno_de_casa, casa[t].procesos), por_azar_pct: pct(casa[t].por_azar, casa[t].procesos) })) };

  const limpio = procs.filter((x) => !x.varios && x.g >= 0).map((x) => Object.assign({}, x, { pcts: x.provs.map((o) => o.valores[0] * 100 / x.p.pb) })).filter((x) => Math.max(...x.pcts) <= 100.0001 && Math.min(...x.pcts) >= 70);
  const rejilla = [88, 90, 92, 93, 94, 95, 96, 96.75, 97, 98, 99, 99.5, 100];
  R.E_precios = { procesos: limpio.length, por_ofertas: T3.map((t) => {
    const s = limpio.filter((x) => t3(x.n) === t);
    const centro = s.map((x) => mediana(x.pcts)), ancho = s.map((x) => Math.max(...x.pcts) - Math.min(...x.pcts));
    return {
      ofertas: t, procesos: s.length,
      centro_del_grupo: { p25: r2(cuantil(centro, 0.25)), mediana: r2(mediana(centro)), p75: r2(cuantil(centro, 0.75)) },
      ancho_del_grupo_pp: { mediana: r2(mediana(ancho)), p75: r2(cuantil(ancho, 0.75)) },
      ganador_mediana: r2(mediana(s.map((x) => x.pcts[x.g]))),
      gano_la_mas_baja_pct: pct(s.filter((x) => x.pcts[x.g] === Math.min(...x.pcts)).length, s.length),
      gano_la_mas_alta_pct: pct(s.filter((x) => x.pcts[x.g] === Math.max(...x.pcts)).length, s.length),
      /* los extremos SIN los procesos en que todas las ofertas valen lo mismo (allí «la más alta» y «la más baja» son la misma) */
      todas_iguales_pct: pct(s.filter((x) => Math.max(...x.pcts) === Math.min(...x.pcts)).length, s.length),
      gano_estrictamente_la_mas_baja_pct: pct(s.filter((x) => Math.max(...x.pcts) > Math.min(...x.pcts) && x.pcts[x.g] === Math.min(...x.pcts)).length, s.length),
      gano_estrictamente_la_mas_alta_pct: pct(s.filter((x) => Math.max(...x.pcts) > Math.min(...x.pcts) && x.pcts[x.g] === Math.max(...x.pcts)).length, s.length),
      azar_cada_extremo_pct: r1(media(s.map((x) => 100 / x.n))),
      si_yo_entrara: { azar_pct: r1(media(s.map((x) => 100 / (x.n + 1)))), por_precio: rejilla.map((q) => ({ pct_del_presupuesto: q, quedo_primero_pct: r1(media(s.map((x) => opcionAl(x.pcts, q))) * 100) })), con_el_centro_real_menos: [0, 0.25, 0.5, 1, 2].map((d) => ({ puntos: d, quedo_primero_pct: r1(media(s.map((x) => opcionAl(x.pcts, mediana(x.pcts) - d))) * 100) })) },
    };
  }) };

  /* E · ¿el historial dice dónde se agrupan? (3 a 9 ofertas; aprende antes del corte, prueba después) */
  const ofT = ofertasDe(dir, ["of_prueba", "of_antes"]);
  const G = [];
  for (const [id, filas] of Object.entries(ofT)) {
    const p = porId[id];
    if (!p) continue;
    const provs = proveedoresDe(filas);
    if (provs.length < 3 || provs.some((o) => o.valores.length !== 1)) continue;
    const pcts = provs.map((o) => o.valores[0] * 100 / p.pb);
    if (Math.max(...pcts) > 100.0001 || Math.min(...pcts) < 70) continue;
    G.push({ ent: p.ent, f: p.f, n: pcts.length, pcts, c: mediana(pcts) });
  }
  G.sort((a, b) => (a.f < b.f ? -1 : a.f > b.f ? 1 : 0));
  const tg = (n) => (n <= 4 ? "3-4" : n <= 9 ? "5-9" : "10+");
  const gA = G.filter((x) => x.f < CORTE_PRUEBA), gP = G.filter((x) => x.f >= CORTE_PRUEBA && x.n <= 9);
  const centroTramo = {};
  for (const t of ["3-4", "5-9", "10+"]) centroTramo[t] = mediana(gA.filter((x) => tg(x.n) === t).map((x) => x.c));
  const hEnt = {};
  for (const x of gA) meter(hEnt, x.ent, x);
  const err = { tramo: [], entidad: [], tramo_con_historial: [], entidad_con_historial: [] }, reglas = {}, reglasH = {};
  const anotar = (o, k, gana, precio) => { if (!o[k]) o[k] = { gana: 0, precio: 0, n: 0 }; o[k].gana += gana; o[k].precio += precio; o[k].n++; };
  for (const x of gP) {
    const a = centroTramo[tg(x.n)], h = (hEnt[x.ent] || []).slice(-6);
    const e = (h.reduce((s, y) => s + y.c, 0) + 2 * a) / (h.length + 2);
    const conHist = h.length >= 2;
    err.tramo.push(Math.abs(a - x.c)); err.entidad.push(Math.abs(e - x.c));
    if (conHist) { err.tramo_con_historial.push(Math.abs(a - x.c)); err.entidad_con_historial.push(Math.abs(e - x.c)); }
    const cand = { "fijo 97 %": 97, "fijo 96 %": 96, "fijo 95 %": 95, "fijo 94 %": 94, "centro según número de ofertas − 0,25": a - 0.25, "centro según historial de la entidad − 0,25": e - 0.25, "[solo se sabe después] centro real de los rivales − 0,25": x.c - 0.25 };
    for (const [k, b] of Object.entries(cand)) { const q = Math.min(b, 99.99), w = opcionAl(x.pcts, q); anotar(reglas, k, w, q); if (conHist) anotar(reglasH, k, w, q); }
    meter(hEnt, x.ent, x);
  }
  const tabla = (o) => Object.entries(o).map(([k, v]) => ({ regla: k, quedo_primero_pct: r1(v.gana * 100 / v.n), precio_medio_pct: r2(v.precio / v.n) }));
  R.E_anticipar_el_grupo = { procesos_limpios: G.length, aprende: gA.length, prueba: gP.length, centro_aprendido: Object.fromEntries(Object.entries(centroTramo).map(([k, v]) => [k, r2(v)])), error_medio_pp: { segun_numero_de_ofertas: r2(media(err.tramo)), con_historial_de_la_entidad: r2(media(err.entidad)) }, error_medio_pp_donde_hay_historial: { procesos: err.tramo_con_historial.length, segun_numero_de_ofertas: r2(media(err.tramo_con_historial)), con_historial_de_la_entidad: r2(media(err.entidad_con_historial)) }, azar_pct: r1(media(gP.map((x) => 100 / (x.n + 1)))), reglas: tabla(reglas), reglas_donde_hay_historial: tabla(reglasH) };

  /* F · la foto de hoy: procesos que aún no cierran su manifestación de interés */
  const mh = modeloCompetencia(H);
  const vivos = {};
  for (const r of leer(dir, "abiertos.json")) {
    const antes = (r.fase === "Presentación de observaciones" || r.fase === "Manifestación de interés (Menor Cuantía)") && r.estado_del_procedimiento === "Publicado";
    if (!antes || !(Number(r.precio_base) > 0)) continue;
    const k = r.id_del_portafolio || r.id_del_proceso;
    if (!vivos[k] || r.fase.indexOf("Manifestación") === 0) vivos[k] = r;
  }
  const V = Object.values(vivos).map((r) => { const a = mh.anuncia(r.nit_entidad, r.departamento_entidad, Number(r.precio_base)); return { dep: r.departamento_entidad, pb: Number(r.precio_base), fase: r.fase, p: a.pEnt, nh: a.previos.length }; });
  const vp = V.filter((x) => x.p >= UMBRAL_POCA && x.nh >= MIN_PREVIOS), dv = {}, tv = {};
  for (const x of vp) { dv[x.dep] = (dv[x.dep] || 0) + 1; tv[tamano(x.pb)] = (tv[tamano(x.pb)] || 0) + 1; }
  R.F_foto_de_hoy = { sin_cerrar_manifestacion: V.length, con_la_ventana_publicada: V.filter((x) => x.fase.indexOf("Manifestación") === 0).length, en_observaciones: V.filter((x) => x.fase.indexOf("Manifestación") !== 0).length, anunciados_poca_competencia: vp.length, de_ellos_en_observaciones: vp.filter((x) => x.fase.indexOf("Manifestación") !== 0).length, de_ellos_bajo_500_millones: vp.filter((x) => x.pb < 500e6).length, suma_presupuesto: vp.reduce((a, x) => a + x.pb, 0), anunciados_mucha_competencia: V.filter((x) => x.p <= UMBRAL_MUCHA && x.nh >= MIN_PREVIOS).length, entidad_sin_historial: V.filter((x) => x.nh < MIN_PREVIOS).length, donde: Object.entries(dv).sort((a, b) => b[1] - a[1]).slice(0, 14).map(([d, n]) => ({ departamento: d, procesos: n })), por_tamano: tv };

  /* G · los dos procesos del diagnóstico. El presupuesto es el del PLIEGO, no el de SECOP II:
     Cali, $1.581.425.810 (detekta-lector/caso_santa_elena/LECCIONES.md); Universidad Pedagógica,
     $1.348.958.930,99 (términos de referencia, numeral 1.13, pág. 7, leído el 11-nov-2026). */
  const CASOS = { "CO1.BDOS.10584652": { nombre: "Cali · 4151.010.32.1.1255-2026 (Santa Elena)", presupuesto_pliego: 1581425810, rechazadas: ["UT EMIMAJO INGENIERIA"] }, "CO1.BDOS.10691742": { nombre: "Universidad Pedagógica · UPN-VAD-CP-011-2026", presupuesto_pliego: 1348958930.99 } };
  R.G_casos = {};
  const porCaso = {};
  for (const r of leer(dir, "casos.json")) meter(porCaso, r.id_del_proceso_de_compra, r);
  for (const [id, c] of Object.entries(CASOS)) {
    const of = (porCaso[id] || []).map((r) => ({ proponente: r.nombre_proveedor, valor: Number(r.valor_de_la_oferta), pct_del_presupuesto: r2(Number(r.valor_de_la_oferta) * 100 / c.presupuesto_pliego) })).sort((a, b) => a.valor - b.valor);
    const caso = { nombre: c.nombre, presupuesto_pliego: c.presupuesto_pliego, ofertas_publicadas: of };
    if (c.rechazadas) {
      const hab = of.filter((o) => !c.rechazadas.includes(o.proponente));
      caso.puesto_por_metodo_entre_habiles = {};
      for (const m of METODOS.METODOS) {
        const pts = METODOS.puntajes(hab.map((o) => o.valor), m, METODOS.PUNTAJE_MAXIMO.menor_cuantia);
        caso.puesto_por_metodo_entre_habiles[m] = hab.map((o, i) => ({ proponente: o.proponente, puntaje: pts[i], puesto: 1 + pts.filter((q) => q > pts[i]).length })).sort((a, b) => a.puesto - b.puesto);
      }
    }
    R.G_casos[id] = caso;
  }
  return R;
}

/* ── salida ───────────────────────────────────────────────────────────────── */
function imprimir(R) {
  const f = (x) => (x == null ? "sin dato" : String(x).replace(".", ","));
  const M = (x) => "$" + Math.round(x / 1e6).toLocaleString("es-CO") + " M";
  console.log("== PLAN X20 · MEDICIÓN DEL MERCADO · consulta del " + R.consulta + " ==");
  console.log("historial: " + R.historial.adjudicados_desde_2024 + " adjudicados desde 2024 · por año " + JSON.stringify(R.historial.por_ano) + " · apartados " + JSON.stringify(R.historial.apartados));
  console.log("\nA · ofertas por proceso adjudicado, obra, por modalidad (recepción desde " + CORTE_ULTIMO_ANO + ")");
  for (const m of R.A_por_modalidad) console.log("  " + m.modalidad.slice(0, 50).padEnd(50) + " n=" + String(m.adjudicados).padStart(5) + " | " + TRAMOS.map((t) => t + ": " + f(m.pct[t]) + " %").join(" · "));
  const a = R.A_ultimo_ano;
  console.log("  menor cuantía de obra: " + a.en_fase_de_ofertas + " en fase de ofertas · " + a.adjudicados + " adjudicados · con 1 o 2 ofertas " + f(a.con_una_o_dos_pct) + " % · presupuesto mediana " + M(a.presupuesto.mediana) + " (P25 " + M(a.presupuesto.p25) + ", P75 " + M(a.presupuesto.p75) + ") · suma " + M(a.presupuesto.suma));
  for (const t of R.A_por_tamano) console.log("    " + t.tamano.padStart(11) + ": n=" + String(t.n).padStart(4) + " · 1 oferta " + f(t.una_pct) + " % · 1 o 2 " + f(t.una_o_dos_pct) + " % · 3 a 9 " + f(t.tres_a_nueve_pct) + " % · 10+ " + f(t.diez_o_mas_pct) + " % · mediana " + f(t.mediana_ofertas));
  for (const d of R.A_por_departamento) console.log("    " + String(d.departamento).slice(0, 28).padEnd(28) + " n=" + String(d.n).padStart(4) + " · 1 oferta " + f(d.una_pct) + " % · 1 o 2 " + f(d.una_o_dos_pct) + " % · mediana " + M(d.mediana_presupuesto));
  console.log("\nB · adjudicado sobre presupuesto, según ofertas (apartados " + R.B_adjudicado_sobre_presupuesto.fuera_de_rango_o_sin_dato + ")");
  for (const t of R.B_adjudicado_sobre_presupuesto.por_ofertas) console.log("    " + t.ofertas.padStart(4) + " ofertas: n=" + String(t.n).padStart(4) + " · P25 " + f(t.p25) + " · mediana " + f(t.mediana) + " · P75 " + f(t.p75));
  const c = R.C_anticipar_competencia;
  console.log("\nC · ¿el historial anticipa la competencia? aprende " + c.aprende + " · prueba " + c.prueba);
  console.log("    pérdida logarítmica: " + JSON.stringify(c.perdida_logaritmica) + " · mejora de la entidad frente al tamaño " + f(c.mejora_entidad_frente_a_tamano_pct) + " %");
  for (const b of c.calibracion) console.log("    dijo " + b.dijo_entre[0] + "–" + b.dijo_entre[1] + " %: " + b.procesos + " procesos · tuvieron 1 o 2 ofertas " + f(b.tuvieron_1_o_2_pct) + " % · 1 sola " + f(b.tuvieron_1_pct) + " %");
  console.log("    con historial (" + c.con_historial.procesos + " de " + c.con_historial.de + "): " + JSON.stringify(c.con_historial));
  const an = R.C_anunciados_2026;
  console.log("    anunciados en 2026 con poca competencia: " + JSON.stringify(an.poca_competencia));
  for (const d of an.por_departamento) console.log("      " + String(d.departamento).slice(0, 26).padEnd(26) + String(d.procesos).padStart(4) + " · " + f(d.al_mes) + "/mes · 1 oferta " + f(d.una_sola_pct) + " % · ganador repetido " + f(d.ganador_repetido_pct) + " % · " + M(d.mediana_presupuesto));
  console.log("    anunciados con mucha competencia: " + JSON.stringify(an.mucha_competencia));
  console.log("\nD · ¿gana el de casa? " + JSON.stringify(R.D_el_de_casa));
  console.log("\nE · precios (" + R.E_precios.procesos + " procesos limpios)");
  for (const t of R.E_precios.por_ofertas) {
    console.log("    " + t.ofertas + " ofertas (n=" + t.procesos + "): centro " + JSON.stringify(t.centro_del_grupo) + " · ancho " + JSON.stringify(t.ancho_del_grupo_pp) + " · ganador mediana " + f(t.ganador_mediana) + " · ganó la más baja " + f(t.gano_la_mas_baja_pct) + " % · la más alta " + f(t.gano_la_mas_alta_pct) + " % · azar " + f(t.azar_cada_extremo_pct) + " %");
    console.log("      si yo entrara (azar " + f(t.si_yo_entrara.azar_pct) + " %): " + t.si_yo_entrara.por_precio.map((q) => q.pct_del_presupuesto + "→" + f(q.quedo_primero_pct)).join(" · "));
    console.log("      con el centro real menos: " + t.si_yo_entrara.con_el_centro_real_menos.map((q) => q.puntos + "→" + f(q.quedo_primero_pct)).join(" · "));
  }
  console.log("    anticipar el grupo: " + JSON.stringify(R.E_anticipar_el_grupo));
  console.log("\nF · foto de hoy: " + JSON.stringify(R.F_foto_de_hoy));
  console.log("\nG · casos");
  for (const caso of Object.values(R.G_casos)) {
    console.log("  " + caso.nombre + " · presupuesto del pliego $" + caso.presupuesto_pliego.toLocaleString("es-CO"));
    for (const o of caso.ofertas_publicadas) console.log("     " + f(o.pct_del_presupuesto).padStart(6) + " %  $" + Math.round(o.valor).toLocaleString("es-CO").padStart(15) + "  " + o.proponente);
    if (caso.puesto_por_metodo_entre_habiles) for (const [m, v] of Object.entries(caso.puesto_por_metodo_entre_habiles)) console.log("     " + m.padEnd(16) + v.map((x) => x.puesto + ".º " + x.proponente.slice(0, 22)).join(" · "));
  }
}

if (require.main === module) {
  const [a, b, c] = process.argv.slice(2);
  if (a === "tandas") { if (!b) { console.error("uso: node medir.js tandas <carpeta>"); process.exit(2); } escribirTandas(b); }
  else if (!a) { console.error("uso: node medir.js <carpeta_de_datos> [AAAA-MM-DD]"); process.exit(2); }
  else {
    const fecha = b || new Date().toISOString().slice(0, 10);
    const R = medir(a, fecha);
    imprimir(R);
    const salida = path.join(__dirname, "resultados_" + fecha + ".json");
    fs.writeFileSync(salida, JSON.stringify(R, null, 1) + "\n");
    console.log("\nescrito: " + path.relative(process.cwd(), salida));
  }
}

module.exports = { medir, historialDe, modeloCompetencia, opcionAl, tramoOfertas, tamano };
