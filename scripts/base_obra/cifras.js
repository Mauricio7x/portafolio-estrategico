"use strict";
/* Base nacional de obra · FASE 2: las cifras (17-oct-2026). Solo MIDE.
   Uso:  node scripts/base_obra/cifras.js <carpeta>    (lee base.jsonl.gz, escribe cifras.json)
   a) piso por proceso (mediana − σ, las dos σ) con 3+ ofertas válidas, en % del precio base;
   d) distribuciones por grupo modalidad × departamento × tamaño (terciles medidos, decisión del
      dueño) con P10/25/50/75/90, intervalo por remuestreo y N; mínimo 30 o se apoya en el
      departamento y luego en el país, diciendo cuál; estabilidad 2024 frente a 2025;
   c) competencia por entidad y rivales frecuentes (sin documentos; persona natural sin nombre);
   f) umbral para la alerta de precio bajo: cuántas ofertas que GANARON habrían recibido la alerta.
   Todo partido en competencia real (3+) y baja (1–2). Ninguna cifra dice «probabilidad». */
const fs = require("fs");
const path = require("path");
const zlib = require("zlib");
const L = require("./limpieza");
const { percentil } = require("./fila");
const { norm } = require("../../lib/semantica");

const MIN_GRUPO = 30;
const REPLICAS = 2000;
const PERCENTILES = [0.10, 0.25, 0.50, 0.75, 0.90];

/* Remuestreo con semilla fija (mulberry32): la misma base da el mismo intervalo. */
function azar(semilla) {
  let a = semilla >>> 0;
  return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
function intervaloMediana(xs, replicas = REPLICAS, semilla = 20261017) {
  if (xs.length < 2) return null;
  const r = azar(semilla), meds = [];
  for (let i = 0; i < replicas; i++) {
    const m = new Array(xs.length);
    for (let j = 0; j < xs.length; j++) m[j] = xs[Math.floor(r() * xs.length)];
    meds.push(percentil(m, 0.5));
  }
  return [percentil(meds, 0.025), percentil(meds, 0.975)];
}
function resumenDistribucion(xs) {
  const v = xs.filter((x) => typeof x === "number" && Number.isFinite(x));
  if (!v.length) return { n: 0 };
  const o = { n: v.length };
  for (const p of PERCENTILES) o["p" + Math.round(p * 100)] = +(100 * percentil(v, p)).toFixed(2);
  const ic = intervaloMediana(v);
  o.ic95_mediana = ic ? ic.map((x) => +(100 * x).toFixed(2)) : null;
  return o;
}

/* Piso de UN proceso con sus ofertas válidas (en fracción del precio base). */
/* Sin competencia de precio: todas las válidas al MISMO valor (ver main). */
function sinPrecio(x) { const v = (x.ofertas_validas || []).map((o) => o.pct); return v.length >= 2 && Math.max(...v) - Math.min(...v) < 1e-9; }

function pisoDeProceso(fila) {
  if (!fila.ofertas_validas || fila.ofertas_validas.length < 3) return null;
  const st = L.estadisticas(fila.ofertas_validas.map((o) => o.pct));
  const pob = st.mediana - st.sigma_pob, mue = st.mediana - st.sigma_muestral;
  const g = fila.oferta_ganadora ? fila.oferta_ganadora.pct : null;
  return { n: st.n, mediana: st.mediana, piso_pob: pob, piso_muestral: mue,
    ganador_pct: g, ganador_bajo_piso_pob: g === null ? null : g < pob, ganador_bajo_piso_muestral: g === null ? null : g < mue };
}

/* Terciles del precio base por modalidad, medidos sobre los usables. */
function cortesTerciles(filas) {
  const out = {};
  for (const m of ["licitacion", "menor_cuantia", "minima"]) {
    const v = filas.filter((x) => x.modalidad === m).map((x) => x.precio_base);
    out[m] = [percentil(v, 1 / 3), percentil(v, 2 / 3)];
  }
  return out;
}
const tercil = (cortes, x) => { const c = cortes[x.modalidad]; return !c || c[0] === null ? null : x.precio_base <= c[0] ? "pequeño" : x.precio_base <= c[1] ? "mediano" : "grande"; };
const deptoDe = (x) => x.departamento_ejecucion || x.departamento_entidad || null;
const deptoClave = (d) => { const n = norm(d || "").replace(/[.,]/g, " ").replace(/\s+/g, " ").trim();
  return /^(bogota( d ?c)?|distrito capital( de bogota)?|bogota distrito capital)$/.test(n) ? "Bogotá D.C." : d || "(sin dato)"; };
const ano = (x) => (x.fecha_adjudicacion || "").slice(0, 4) || null;

/* Distribución de una medida por grupo, con respaldo cuando el grupo tiene menos de 30. */
function porGrupo(filas, medida, cortes) {
  const grupos = new Map(), deptos = new Map(), pais = new Map();
  const add = (mp, k, v) => { if (!mp.has(k)) mp.set(k, []); mp.get(k).push(v); };
  for (const x of filas) {
    const v = medida(x); if (typeof v !== "number" || !Number.isFinite(v)) continue;
    const d = deptoClave(deptoDe(x)), t = tercil(cortes, x);
    add(grupos, `${x.modalidad}|${d}|${t}`, v); add(deptos, `${x.modalidad}|${d}`, v); add(pais, x.modalidad, v);
  }
  const out = {}, memo = new Map();   // el respaldo (departamento / país) se calcula una vez
  const resumenDe = (clave, datos) => { if (!memo.has(clave)) memo.set(clave, resumenDistribucion(datos)); return memo.get(clave); };
  for (const [k, v] of grupos) {
    const [m, d, t] = k.split("|");
    let base = "grupo", datos = v, clave = "g:" + k;
    if (v.length < MIN_GRUPO) {
      const vd = deptos.get(`${m}|${d}`) || [];
      if (vd.length >= MIN_GRUPO) { base = "departamento"; datos = vd; clave = `d:${m}|${d}`; } else { base = "pais"; datos = pais.get(m) || []; clave = "p:" + m; }
    }
    out[k] = { modalidad: m, departamento: d, tamano: t, n_grupo: v.length, se_apoya_en: base, ...resumenDe(clave, datos) };
  }
  const paisOut = {}; for (const [m, v] of pais) paisOut[m] = resumenDe("p:" + m, v);
  return { grupos: out, pais: paisOut };
}

/* ¿Es una persona natural? Sin marcas de sociedad ni de figura asociativa [inferencia por el
   nombre: los datos abiertos no traen el tipo de proponente]. Su nombre NO sale del cálculo. */
/* Solo FORMAS JURÍDICAS: «ingeniería», «construcciones», «grupo» o «inversiones» no lo son
   («JUAN PEREZ INGENIERIA» se mostraba). Ocultar de más es el lado seguro. */
const SOCIEDAD = /\b(sas|s a s|ltda|limitada|s a|sa|consorcio|union temporal|u t|ut|e u|eu|sociedad|cia|compania|corporacion|fundacion|cooperativa|asociacion|s en c|sca)\b/;
const esPersonaNatural = (nombre) => !SOCIEDAD.test(L.nombreComparable(nombre || ""));

function competencia(filas) {
  const porEntidad = new Map(), rivales = new Map();
  for (const x of filas) {
    const e = porEntidad.get(x.codigo_entidad) || { entidad: x.entidad, departamento: deptoClave(x.departamento_entidad), procesos: 0, ofertas: 0, proveedores: new Set(), real: 0, baja: 0 };
    e.procesos++; e.ofertas += x.n_validas; e[x.competencia]++;
    for (const o of x.ofertas_validas) {
      e.proveedores.add(o.proveedor);
      const r = rivales.get(o.proveedor) || { nombre: o.nombre, ofertas: 0, pcts: [], ganadas_con_oferta_emparejada: 0, entidades: new Set(), deptos: new Map() };
      r.ofertas++; r.pcts.push(o.pct); r.entidades.add(x.codigo_entidad);
      const dk = deptoClave(deptoDe(x)); r.deptos.set(dk, (r.deptos.get(dk) || 0) + 1);
      // ganada = este proveedor ES el ganador emparejado (por identidad, no por igualdad de valor:
      // el valor ganador repetido por otros oferentes sumaba 5.167 «ganadas» de más)
      if (x.oferta_ganadora && x.oferta_ganadora.proveedor === o.proveedor) r.ganadas_con_oferta_emparejada++;
      rivales.set(o.proveedor, r);
    }
    porEntidad.set(x.codigo_entidad, e);
  }
  const entidades = [...porEntidad.entries()].map(([k, e]) => ({ codigo_entidad: k, entidad: e.entidad, departamento: e.departamento, procesos: e.procesos,
    oferentes_distintos: e.proveedores.size, ofertas_por_proceso: +(e.ofertas / e.procesos).toFixed(2), real: e.real, baja: e.baja }))
    .sort((a, b) => b.procesos - a.procesos);
  const frecuentes = [...rivales.values()].filter((r) => r.ofertas >= 10).map((r) => ({
    nombre: esPersonaNatural(r.nombre) ? "(persona natural)" : r.nombre, ofertas: r.ofertas,
    // solo las victorias cuya oferta se emparejó: es un PISO, no el total (389 procesos tienen ganador sin oferta emparejada)
    ganadas_con_oferta_emparejada: r.ganadas_con_oferta_emparejada,
    descuento_tipico_pct: +(100 - 100 * percentil(r.pcts, 0.5)).toFixed(2), entidades: r.entidades.size, departamentos: [...r.deptos].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([d]) => d) }))
    .sort((a, b) => b.ofertas - a.ofertas);
  return { entidades, rivales_frecuentes: frecuentes, n_rivales_10_o_mas: frecuentes.length };
}

/* Umbral de la alerta: de cada 100 ofertas que GANARON, ¿cuántas quedaban debajo del corte?
   POR MODALIDAD: mínima se adjudica por menor precio (P10 adjudicado ≈ 67 %) y mezclada con las
   demás inflaba la cifra. Cortes de 70 % a 95 % (paso 0,5). */
function umbralAlerta(filas) {
  const ganadoras = filas.filter((x) => x.oferta_ganadora && !x.inconsistencia).map((x) => ({ pct: x.oferta_ganadora.pct, comp: x.competencia, mod: x.modalidad }));
  const out = {};
  for (const m of ["licitacion", "menor_cuantia", "minima"]) {
    out[m] = [];
    for (let i = 0; i <= 50; i++) {
      const t = 0.70 + i * 0.005;
      const fila = { corte_pct: +(100 * t).toFixed(1) };
      for (const [k, sel] of [["todas", () => true], ["real", (g) => g.comp === "real"], ["baja", (g) => g.comp === "baja"]]) {
        const s = ganadoras.filter((g) => g.mod === m && sel(g)); const bajo = s.filter((g) => g.pct < t).length;
        fila[k] = { ganadoras: s.length, bajo_el_corte: bajo, de_cada_100: s.length ? +(100 * bajo / s.length).toFixed(1) : null };
      }
      out[m].push(fila);
    }
  }
  return out;
}

/* ---------- b) Simulador «¿habría ganado?» y acierto del método ---------- */
const M = require("./metodos");

/* Se agrega una oferta hipotética (fracción del precio base) a las válidas REALES y se mira si
   queda primera sola, empatada o no, con cada método. Los hábiles reales no se publican: el
   simulador supone que todas las válidas lo eran (aproximado, declarado). */
/* El pliego (p. 53) no considera las ofertas que la entidad declara artificialmente bajas. Sin esa
   regla la curva premiaba ofertar más bajo (revisión adversaria, 17-oct-2026: en los datos una
   oferta bajo el piso gana 10,6 de cada 100 en menor cuantía frente a 17,4 sobre el piso). Por eso
   se publica también `bajo_piso`: la oferta hipotética queda debajo de mediana − σ muestral de
   las válidas CON ella; en la curva «con piso» eso cuenta como rechazada. No es rechazo automático
   (el ganador de E estaba debajo): la verdad está entre las dos curvas. */
function simularProceso(pcts, p, max = 1) {
  const out = {};
  const todos = [...pcts, p];
  const st = L.estadisticas(todos);
  out.bajo_piso = st.sigma_muestral === null ? false : p < st.mediana - st.sigma_muestral;
  for (const m of M.METODOS) {
    const g = M.primeros(todos, m, max);
    out[m] = !g ? null : g.includes(pcts.length) ? (g.length === 1 ? "gana" : "empata") : "pierde";
  }
  return out;
}
const PRECIOS = Array.from({ length: 41 }, (_, i) => +(0.80 + i * 0.005).toFixed(3));
function curvaSimulador(filas) {
  return PRECIOS.map((p) => {
    const fila = { precio_pct: +(100 * p).toFixed(1), procesos: filas.length, bajo_piso: 0 };
    for (const m of M.METODOS) fila[m] = { gana: 0, empata: 0, gana_sobre_piso: 0 };
    for (const x of filas) {
      const s = simularProceso(x.ofertas_validas.map((o) => o.pct), p, M.PUNTAJE_MAXIMO[x.modalidad] || 1);
      if (s.bajo_piso) fila.bajo_piso++;
      for (const m of M.METODOS) { if (s[m] === "gana") { fila[m].gana++; if (!s.bajo_piso) fila[m].gana_sobre_piso++; } else if (s[m] === "empata") fila[m].empata++; }
    }
    // Con el método sorteado: los centavos de la TRM se reparten parejo (680 filas desde dic-2023:
    // 26,3 / 22,8 / 27,4 / 23,5 %, chi² = 3,89 con 3 g. l.; no se rechaza el reparto parejo).
    const prom = (k) => (filas.length ? +(100 * M.METODOS.reduce((s, m) => s + fila[m][k], 0) / (4 * filas.length)).toFixed(1) : null);
    fila.sorteado_gana_de_cada_100 = prom("gana");
    fila.sorteado_gana_sobre_piso_de_cada_100 = prom("gana_sobre_piso");
    fila.bajo_piso_de_cada_100 = filas.length ? +(100 * fila.bajo_piso / filas.length).toFixed(1) : null;
    return fila;
  });
}

/* Fecha de la TRM estimada. Menor cuantía: 2 días HÁBILES antes de la fecha de adjudicación de
   p6dx (ajustada a mano con A, B, C y E, 4 de 4 [inferencia]; el pliego dice «segundo día hábil
   después de finalizado el periodo de traslado del informe»). Licitación: el Documento Tipo V4
   toma la TRM del día hábil SIGUIENTE (o el segundo) al pronunciamiento en la audiencia, o sea
   DESPUÉS: +1 día hábil [inferencia, sin caso validado]. Días hábiles = los días en que la serie
   32sa-8pi3 abre una vigencia (salta fines de semana y festivos); sin serie, lunes a viernes. */
function fechaTrmEstimada(fechaAdj, desplazamiento = -2, habiles = null) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(fechaAdj || "")); if (!m) return null;
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3])); let k = 0;
  const paso = desplazamiento < 0 ? -1 : 1, meta = Math.abs(desplazamiento);
  const esHabil = (x) => { const s = x.toISOString().slice(0, 10); if (habiles) return habiles.has(s); const w = x.getUTCDay(); return w !== 0 && w !== 6; };
  for (let guardia = 0; k < meta && guardia < 60; guardia++) { d.setUTCDate(d.getUTCDate() + paso); if (esHabil(d)) k++; }
  return k === meta ? d.toISOString().slice(0, 10) : null;
}
function trmVigente(serie, fecha) {
  if (!fecha) return null;
  for (const r of serie) if (r.desde <= fecha && fecha <= r.hasta) return r.valor;
  return null;
}
async function cargarTrm() {
  const { crearCliente } = require("../../lib/socrata");
  const C = crearCliente({ baseUrl: "https://www.datos.gov.co/resource/32sa-8pi3.json", log: (m) => process.stderr.write(m + "\n") });
  const filas = await C.pedir({ $select: "valor,vigenciadesde,vigenciahasta", $where: "vigenciadesde >= '2023-12-01T00:00:00'", $order: "vigenciadesde", $limit: 5000 }, "trm");
  return filas.map((r) => ({ desde: String(r.vigenciadesde).slice(0, 10), hasta: String(r.vigenciahasta).slice(0, 10), valor: L.numeroONull(r.valor) })).filter((r) => r.valor !== null);
}

/* ¿El método de la TRM estimada reproduce al ganador real? «Reproduce» = la oferta emparejada del
   ganador queda primera SOLA con ese método. Como referencia, el acierto de cada método fijo. */
/* LÍMITE (revisión adversaria, 17-oct-2026): las ofertas publicadas NO son las hábiles y el precio
   pesa 49,5 de 100 puntos; con eso el ganador real queda primero con ALGÚN método solo en una parte
   de los procesos, y el acierto de la TRM no puede distinguirse del de una TRM al azar. Esta cifra
   dice cuánto explican los datos abiertos, NO qué método usó cada entidad. */
function aciertoMetodo(filas, serie, desplazamiento = -2) {
  const habiles = serie ? new Set(serie.map((r) => r.desde)) : null;
  const out = { procesos: filas.length, desplazamiento_dias_habiles: desplazamiento, sin_ganador_emparejado: 0, sin_trm: 0, con_dato: 0,
    algun_metodo_lo_pone_primero: 0, reproduce: 0, empate: 0, no_reproduce: 0, por_metodo_fijo: {}, por_metodo_trm: {} };
  for (const m of M.METODOS) { out.por_metodo_fijo[m] = 0; out.por_metodo_trm[m] = { procesos: 0, reproduce: 0 }; }
  for (const x of filas) {
    if (!x.oferta_ganadora) { out.sin_ganador_emparejado++; continue; }
    const v = x.ofertas_validas.map((o) => o.pct), ig = v.findIndex((q) => Math.abs(q - x.oferta_ganadora.pct) < 1e-12);
    if (ig < 0) { out.sin_ganador_emparejado++; continue; }
    const max = M.PUNTAJE_MAXIMO[x.modalidad] || 1;
    const met = serie ? M.metodoPorTrm(trmVigente(serie, fechaTrmEstimada(x.fecha_adjudicacion, desplazamiento, habiles))) : null;
    if (!met) { out.sin_trm++; continue; }   // mismo denominador para fijos y TRM
    out.con_dato++; out.por_metodo_trm[met].procesos++;
    let alguno = false;
    for (const m of M.METODOS) { const g = M.primeros(v, m, max); if (g && g.includes(ig)) alguno = true; if (g && g.length === 1 && g[0] === ig) out.por_metodo_fijo[m]++; }
    if (alguno) out.algun_metodo_lo_pone_primero++;
    const g = M.primeros(v, met, max);
    if (g.length > 1 && g.includes(ig)) out.empate++;
    else if (g.length === 1 && g[0] === ig) { out.reproduce++; out.por_metodo_trm[met].reproduce++; }
    else out.no_reproduce++;
  }
  return out;
}

async function main() {
  const dir = process.argv[2];
  if (!dir) { process.stderr.write("uso: node scripts/base_obra/cifras.js <carpeta>\n"); process.exit(2); }
  const base = zlib.gunzipSync(fs.readFileSync(path.join(dir, "base.jsonl.gz"))).toString("utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l));
  const usables = base.filter((x) => x.competencia);
  /* Sin competencia de precio: todas las válidas al MISMO valor (casi siempre el 100 %: IDARTES con
     80 ofertas al precio base). σ = 0 deja el piso en 100 % y en el simulador cualquier oferta
     más baja «gana»: salen del piso y del simulador con su motivo y se cuentan. */
  const conFormulaTodos = usables.filter((x) => x.modalidad === "licitacion" || x.modalidad === "menor_cuantia");
  const conFormula = conFormulaTodos.filter((x) => !sinPrecio(x));
  const cortes = cortesTerciles(usables);
  for (const x of conFormula) x.piso = pisoDeProceso(x);
  const conPiso = conFormula.filter((x) => x.piso);
  const sinFechaAdj = conPiso.filter((x) => !ano(x)).length;
  const R = { generado: new Date().toISOString(), cortes_terciles_cop: cortes, min_grupo: MIN_GRUPO, replicas: REPLICAS,
    sin_competencia_de_precio: { licitacion: conFormulaTodos.filter((x) => x.modalidad === "licitacion" && sinPrecio(x)).length, menor_cuantia: conFormulaTodos.filter((x) => x.modalidad === "menor_cuantia" && sinPrecio(x)).length },
    piso_sin_fecha_de_adjudicacion: sinFechaAdj };
  R.piso = {
    procesos: conPiso.length,
    ganador_bajo_piso_muestral: { si: conPiso.filter((x) => x.piso.ganador_bajo_piso_muestral === true).length, con_dato: conPiso.filter((x) => x.piso.ganador_bajo_piso_muestral !== null).length },
    ganador_bajo_piso_pob: { si: conPiso.filter((x) => x.piso.ganador_bajo_piso_pob === true).length, con_dato: conPiso.filter((x) => x.piso.ganador_bajo_piso_pob !== null).length },
    por_grupo_muestral: porGrupo(conPiso, (x) => x.piso.piso_muestral, cortes),
    por_grupo_pob: porGrupo(conPiso, (x) => x.piso.piso_pob, cortes),
    nota_estabilidad: "el piso de licitación baja cada año (P50 2024 → 2025 → 2026): la referencia para ofertar hoy es el año más reciente, no la mezcla",
    estabilidad: Object.fromEntries(["2024", "2025", "2026"].map((a) => [a, Object.fromEntries(["licitacion", "menor_cuantia"].map((m) =>
      [m, resumenDistribucion(conPiso.filter((x) => ano(x) === a && x.modalidad === m).map((x) => x.piso.piso_muestral))]))])),
  };
  R.adjudicado = {};
  for (const c of ["real", "baja"]) R.adjudicado[c] = porGrupo(usables.filter((x) => x.competencia === c && !x.inconsistencia), (x) => x.pct_adjudicado, cortes).pais;
  // b) Simulador por modalidad × competencia, para el país y para la zona del dueño
  const zona = { "Bogotá D.C.": 1, Cundinamarca: 1, Tolima: 1 };
  R.simulador = {};
  for (const m of ["licitacion", "menor_cuantia"]) for (const c of ["real", "baja"]) {
    const s = conFormula.filter((x) => x.modalidad === m && x.competencia === c);
    R.simulador[`${m}|${c}|pais`] = curvaSimulador(s);
    for (const d of Object.keys(zona)) { const sd = s.filter((x) => deptoClave(deptoDe(x)) === d); if (sd.length) R.simulador[`${m}|${c}|${d}`] = curvaSimulador(sd); }
  }
  // Acierto del método por TRM (fecha estimada). La serie que falta es «sin medir», nunca cero.
  let serie = null;
  try { serie = await cargarTrm(); R.trm = { dataset: "32sa-8pi3", filas: serie.length, corte: new Date().toISOString() }; }
  catch (e) { R.trm = { sin_medir: true, error: e.detalle || e.message, status: e.status || null }; }
  R.acierto = {};
  for (const m of ["licitacion", "menor_cuantia"]) for (const c of ["real", "baja"])
    R.acierto[`${m}|${c}`] = aciertoMetodo(conFormula.filter((x) => x.modalidad === m && x.competencia === c && x.n_validas >= 2), serie, m === "licitacion" ? 1 : -2);
  R.nota_acierto = "con 2 ofertas los 4 métodos eligen la más baja; con los datos abiertos no se puede saber qué método usó cada proceso ni qué ofertas quedaron hábiles: el acierto mide cuánto explican los datos, no el método";
  // Mínima: se adjudica a la de menor precio (Decreto 1082, art. 2.2.1.2.1.5.2 num. 7, texto del Decreto 1860 de 2021)
  const minimas = usables.filter((x) => x.modalidad === "minima" && x.oferta_ganadora && x.n_validas >= 2);
  R.minima_gana_la_mas_baja = { procesos: minimas.length, si: minimas.filter((x) => x.oferta_ganadora.pct <= Math.min(...x.ofertas_validas.map((o) => o.pct)) + 1e-12).length };
  R.competencia = competencia(usables);
  R.umbral_alerta = umbralAlerta(usables);
  fs.writeFileSync(path.join(dir, "cifras.json"), JSON.stringify(R, null, 1));
  process.stderr.write(`listo: ${path.join(dir, "cifras.json")}\n`);
}

if (require.main === module) main().catch((e) => { process.stderr.write(`FALLO: ${e.message}\n`); process.exit(1); });
module.exports = { pisoDeProceso, intervaloMediana, resumenDistribucion, cortesTerciles, tercil, porGrupo, esPersonaNatural, umbralAlerta, azar, deptoClave,
  simularProceso, curvaSimulador, fechaTrmEstimada, trmVigente, aciertoMetodo, PRECIOS, sinPrecio, competencia };
