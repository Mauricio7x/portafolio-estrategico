"use strict";
/* Base nacional de obra · cuántas ofertas GANARON a cada precio (28-oct-2026). Solo MIDE.
   Uso:  node scripts/base_obra/frecuencia_precio.js <carpeta_de_la_base> [salida.json]
         (lee base.jsonl.gz de scripts/base_obra/base.js; escribe data/frecuencia_precio.json)

   Por qué existe: el dueño pidió «el % de adjudicación según el precio que presente». Medido el
   28-oct-2026 (docs/MEMORIA.md, sección del mismo día): en licitación y en menor cuantía, el precio
   como % del presupuesto, solo, no predice quién gana mejor que el azar («1 de cada N oferentes»),
   aprendiendo con 2020-2025 y probando en 2026. Esta tabla es ese hecho, contado: por modalidad,
   por cuántos oferentes tuvo el proceso y por franja de 2 puntos del presupuesto, cuántas ofertas
   hubo, cuántas ganaron y cuántas habrían ganado si todas tuvieran la misma opción (la suma de
   1/n). La aplicación la lee (lib/frecuencia_precio) para decir el hecho junto al precio; no la
   convierte en una curva ni en una probabilidad.

   Población: la de la prueba del motor (`usableMotor` de tools/analisis/adjudicacion/fase0: 3 o
   más ofertas válidas, ganador emparejado, competencia de precio, sin inconsistencia), solo
   licitación y menor cuantía. La regla se LLAMA, no se copia. Sin red y sin azar: la misma base
   da la misma tabla, y la huella del archivo de entrada viaja dentro. */
const fs = require("fs");
const path = require("path");
const zlib = require("zlib");
const crypto = require("crypto");
const { usableMotor } = require("../../tools/analisis/adjudicacion/fase0");
// el tipo de obra por el objeto del proceso: la MISMA regla que usa Precios (28-oct-2026)
const { tipoDeObra, huellaVocabulario } = require("../../lib/frecuencia_precio.js");
const { nitSinDv } = require("../../lib/contratos_en_ejecucion.js");

const FORMATO = 1;
const MODALIDADES = ["licitacion", "menor_cuantia"];
const FRANJA_PP = 2;
const PCT_MIN = 50, PCT_MAX = 110;            // fuera de esto la oferta se cuenta en la franja del borde
const ANO_PRUEBA = "2026";                    // la verificación aprende con los años anteriores
const ENCOGER_K = 20;                         // la tabla de la verificación se encoge hacia 1/n con este peso

/* El tramo de oferentes: los mismos cortes del resto de la aplicación para «cuántos compiten». */
const grupoDe = (n) => (n <= 4 ? "3-4" : n <= 9 ? "5-9" : "10+");
const GRUPOS = Object.freeze(["3-4", "5-9", "10+"]);
/* La franja: el piso par en puntos porcentuales (0,951 → 94, que es «del 94 al 96 %»). */
function franjaDe(pct) {
  const p = Math.min(Math.max(100 * pct, PCT_MIN), PCT_MAX - 1e-9);
  return Math.floor(p / FRANJA_PP) * FRANJA_PP;
}

/* Cada oferta válida de cada proceso utilizable: su precio en % del presupuesto, si ganó, su 1/n y el tipo de obra
   de su proceso (null sin objeto o con un objeto que no se deja clasificar en uno solo). `objetos`: portafolio → texto
   del objeto (nombre y descripción del proceso de p6dx-8zbt). */
function ofertasDe(base, objetos = null) {
  const out = [];
  for (const x of base) {
    if (!MODALIDADES.includes(x.modalidad) || !usableMotor(x)) continue;
    const v = x.ofertas_validas.map((o) => o.pct);
    const ig = v.findIndex((q) => Math.abs(q - x.oferta_ganadora.pct) < 1e-12);
    if (ig < 0) continue;                       // la ganadora no se encuentra entre las válidas: no se adivina
    const ano = String(x.fecha_adjudicacion || "").slice(0, 4);
    if (!/^\d{4}$/.test(ano)) continue;
    const tipo = objetos ? tipoDeObra(objetos.get(x.portafolio) || "") : null;
    /* la entidad, para el censo de concentración (una sola entidad no puede ser «el mercado» de un tipo): por su NIT SIN
       dígito de verificación (lib/contratos_en_ejecucion.nitSinDv, la regla del repositorio), porque la misma entidad
       llega «899999061» y «8999990619»; un NIT ilegible, tal cual; sin NIT, por su nombre. El nombre viaja para decirlo en pantalla. */
    const entidad = nitSinDv(x.nit_entidad) || String(x.nit_entidad || x.entidad || "").trim() || null;
    const nombreEntidad = String(x.entidad || "").trim() || null;
    v.forEach((pct, i) => out.push({ mod: x.modalidad, ano, n: v.length, pct, gano: i === ig ? 1 : 0, proceso: x.portafolio, tipo, entidad, nombre_entidad: nombreEntidad }));
  }
  return out;
}

function celdaVacia() { return { ofertas: 0, ganaron: 0, azar: 0 }; }
function sumar(c, o) { c.ofertas++; c.ganaron += o.gano; c.azar += 1 / o.n; }

/* La tabla: modalidad → tramo de oferentes («*» = todos) → franja → {ofertas, ganaron, azar}. */
function tabla(ofertas) {
  const t = {};
  for (const m of MODALIDADES) { t[m] = { "*": {} }; for (const g of GRUPOS) t[m][g] = {}; }
  for (const o of ofertas) {
    const f = franjaDe(o.pct);
    for (const g of [grupoDe(o.n), "*"]) { const c = t[o.mod][g][f] || (t[o.mod][g][f] = celdaVacia()); sumar(c, o); }
  }
  for (const m of MODALIDADES) for (const g of Object.keys(t[m])) for (const c of Object.values(t[m][g])) c.azar = +c.azar.toFixed(3);
  return t;
}

/* La misma tabla, abierta por tipo de obra: modalidad → tipo → tramo → franja. Las ofertas sin tipo no entran aquí:
   cuentan en la de todos los tipos. */
function tablaPorTipo(ofertas) {
  const t = {};
  for (const m of MODALIDADES) t[m] = {};
  for (const o of ofertas) {
    if (!o.tipo) continue;
    const porTipo = t[o.mod][o.tipo] || (t[o.mod][o.tipo] = { "*": {}, ...Object.fromEntries(GRUPOS.map((g) => [g, {}])) });
    const f = franjaDe(o.pct);
    for (const g of [grupoDe(o.n), "*"]) { const c = porTipo[g][f] || (porTipo[g][f] = celdaVacia()); sumar(c, o); }
  }
  for (const m of MODALIDADES) for (const tp of Object.values(t[m])) for (const g of Object.keys(tp)) for (const c of Object.values(tp[g])) c.azar = +c.azar.toFixed(3);
  return t;
}

/* Lo que se dice de los procesos de un grupo: cuántos, el precio de los ganadores (cuartiles, en % del presupuesto, a
   un decimal: es para LEER, no decide nada) y en cuántos ganó la oferta más baja frente al azar. */
function resumenDe(ofertas, { porGrupo = true } = {}) {
  const porProceso = new Map();
  for (const o of ofertas) { if (!porProceso.has(o.proceso)) porProceso.set(o.proceso, []); porProceso.get(o.proceso).push(o); }
  let ganoLaMasBaja = 0, azarLaMasBaja = 0;
  const ganadores = [];
  for (const ofs of porProceso.values()) {
    const min = Math.min(...ofs.map((o) => o.pct));
    if (ofs.some((o) => o.gano && Math.abs(o.pct - min) < 1e-12)) ganoLaMasBaja++;
    azarLaMasBaja += 1 / ofs.length;   // con la misma opción para todas, la más baja gana 1 de cada n
    const g = ofs.find((o) => o.gano);
    if (g) ganadores.push(g.pct);
  }
  ganadores.sort((a, b) => a - b);
  // el rango más cercano (nearest-rank): el valor de un ganador real, nunca una interpolación
  const cuartil = (q) => (ganadores.length ? +(100 * ganadores[Math.round(q * (ganadores.length - 1))]).toFixed(1) : null);
  /* POR TRAMO DE OFERENTES (revisión adversaria, 28-oct-2026): el precio ganador cambia más con cuántos compiten
     que con el tipo de obra (licitación de todo tipo de obra: 98,5 % con 3 o 4 oferentes, 95,0 % con 10 o más), así que la
     referencia se dice del tramo de la entidad, como la frase de cuántas ganaron */
  const grupos = porGrupo
    ? Object.fromEntries(GRUPOS.map((g) => [g, resumenDe(ofertas.filter((o) => grupoDe(o.n) === g), { porGrupo: false })]).filter(([, r]) => r.procesos > 0))
    : undefined;
  return {
    procesos: porProceso.size, ofertas: ofertas.length, gano_la_mas_baja: ganoLaMasBaja, azar_la_mas_baja: +azarLaMasBaja.toFixed(1),
    ganador_pct: ganadores.length ? { p25: cuartil(0.25), p50: cuartil(0.5), p75: cuartil(0.75) } : null,
    ...(grupos ? { por_grupo: grupos } : {}),
  };
}

/* EL CENSO DE CONCENTRACIÓN (revisión adversaria, 28-oct-2026): «estabilización y drenaje» en menor cuantía eran, con
   «canal» en el vocabulario, 144 de 186 procesos de la Aerocivil (limpieza de canales de aeropuertos), y aun sin esa
   palabra la Aerocivil reúne el 49,4 % de los 77 que quedan; su mediana no era la del tipo sino la de esa entidad. Un tipo de obra en una modalidad donde una sola entidad reúne más de CONCENTRACION_MAX de los procesos no
   se publica aparte: sus ofertas cuentan solo en la cifra de todos los tipos, y la tabla dice por qué. Se barre TODO
   par modalidad-tipo, no una lista. */
const CONCENTRACION_MAX = 0.25;
/* La entidad que más procesos reúne en cada grupo que da `claveDe(oferta)` (null = la oferta no entra), cuando pasa de
   CONCENTRACION_MAX: clave → {entidad, procesos, de, pct}. Una entidad que no se sabe no es «la misma entidad» que otra
   que tampoco se sabe: cuenta en el total, no junta. */
function concentradosPor(ofertas, claveDe) {
  const procesos = new Map();   // clave → Map(proceso → entidad)
  const nombres = new Map();    // entidad → Map(nombre → procesos), para decir cuál es
  for (const o of ofertas) {
    const k = claveDe(o);
    if (k == null) continue;
    if (!procesos.has(k)) procesos.set(k, new Map());
    if (!procesos.get(k).has(o.proceso) && o.entidad != null && o.nombre_entidad) {
      const ns = nombres.get(o.entidad) || new Map(); ns.set(o.nombre_entidad, (ns.get(o.nombre_entidad) || 0) + 1); nombres.set(o.entidad, ns);
    }
    procesos.get(k).set(o.proceso, o.entidad);
  }
  const out = new Map();
  for (const [k, m] of procesos) {
    const porEntidad = new Map();
    for (const e of m.values()) if (e != null) porEntidad.set(e, (porEntidad.get(e) || 0) + 1);
    if (!porEntidad.size) continue;
    const [entidad, n] = [...porEntidad.entries()].sort((a, b) => b[1] - a[1])[0];
    /* UN NOMBRE SOLO SI ES ÚNICO (revisión adversaria, 28-oct-2026): un NIT con varios nombres es una entidad con varias
       dependencias (el de Bogotá junta 34 alcaldías locales y secretarías); el más frecuente le pondría a un proceso de
       Suba el nombre de Engativá. Sin nombre único va null, y la pantalla dice el NIT. Los nombres se comparan plegados. */
    const ns = nombres.get(entidad);
    const plegado = (x) => String(x).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().replace(/\s+/g, " ").trim();
    const nombre = ns && new Set([...ns.keys()].map(plegado)).size === 1 ? [...ns.entries()].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1))[0][0] : null;
    if (n / m.size > CONCENTRACION_MAX) out.set(k, { entidad, nombre, procesos: n, de: m.size, pct: +(100 * n / m.size).toFixed(1) });
  }
  return out;
}
/* Las celdas de UNA población (un tramo): franja → {ofertas, ganaron, azar}, como las de `tabla`. */
function celdasDe(ofertas) {
  const c = {};
  for (const o of ofertas) { const f = franjaDe(o.pct); sumar(c[f] || (c[f] = celdaVacia()), o); }
  for (const x of Object.values(c)) x.azar = +x.azar.toFixed(3);
  return c;
}
// el tipo entero, por modalidad: {mod: {tipo: {...}}}
function concentraciones(ofertas) {
  const out = {};
  for (const [k, v] of concentradosPor(ofertas, (o) => (o.tipo ? `${o.mod}|${o.tipo}` : null))) {
    const [mod, tipo] = k.split("|");
    (out[mod] || (out[mod] = {}))[tipo] = v;
  }
  return out;
}
/* CADA TRAMO QUE SE PUBLICA (cuarta revisión adversaria, 28-oct-2026): el censo del tipo entero no veía que un tramo
   fuera de una sola entidad, y la cifra de todos los tipos no tenía censo. Medido: en menor cuantía con 10 o más
   oferentes la Aerocivil reunía 425 de 826 procesos (51,5 %), y en menor cuantía de vías con 5 a 9, el INVIAS el 29,1 %.
   {mod: {tipo | "*": {grupo: {...}}}}, donde "*" es la cifra de todos los tipos de ese tramo. */
function concentracionesPorTramo(ofertas) {
  const out = {};
  const poner = (mod, tipo, grupo, v) => { ((out[mod] || (out[mod] = {}))[tipo] || (out[mod][tipo] = {}))[grupo] = v; };
  for (const [k, v] of concentradosPor(ofertas, (o) => (o.tipo ? `${o.mod}|${o.tipo}|${grupoDe(o.n)}` : null))) { const [m, t, g] = k.split("|"); poner(m, t, g, v); }
  for (const [k, v] of concentradosPor(ofertas, (o) => `${o.mod}|*|${grupoDe(o.n)}`)) { const [m, t, g] = k.split("|"); poner(m, t, g, v); }
  return out;
}

/* LA VERIFICACIÓN, fuera de muestra: la tabla aprendida con los años anteriores a 2026 (encogida hacia
   1/n con peso ENCOGER_K y normalizada en cada proceso) frente a «1 de cada N», en las ofertas de 2026. Brier por
   oferta; la mejora negativa quiere decir que la tabla predice PEOR que el azar. */
/* Una verificación: la celda que da `celdaDe` (aprendida con los años anteriores) frente a 1/n, en las ofertas `P`.
   NORMALIZADA EN CADA PROCESO (cuarta revisión adversaria, 28-oct-2026): en un proceso gana UNA oferta, así que las
   probabilidades de sus ofertas tienen que sumar 1, como las del azar. Sin normalizar, la tasa de cada franja —aprendida
   en años con otro número de oferentes dentro del mismo tramo— no sumaba 1 y el Brier castigaba ese descuadre, no al
   precio: daba −0,9 % en licitación donde, normalizada, la misma tabla da +0,5 %. `celdaDe` se llama una vez por oferta
   y en orden (verificarVentana depende de eso). */
function brierDe(P, celdaDe) {
  const crudo = P.map((o) => {
    const c = celdaDe(o);
    const azar = 1 / o.n;
    return c ? (c.ganaron + ENCOGER_K * azar) / (c.ofertas + ENCOGER_K) : azar;
  });
  const suma = new Map();
  P.forEach((o, i) => suma.set(o.proceso, (suma.get(o.proceso) || 0) + crudo[i]));
  let s = 0, s0 = 0;
  P.forEach((o, i) => {
    const p = crudo[i] / suma.get(o.proceso);
    const azar = 1 / o.n;
    s += (p - o.gano) ** 2; s0 += (azar - o.gano) ** 2;
  });
  return P.length ? {
    ofertas_prueba: P.length, procesos_prueba: new Set(P.map((o) => o.proceso)).size,
    brier_tabla: +(s / P.length).toFixed(5), brier_azar: +(s0 / P.length).toFixed(5),
    mejora_pct: +(100 * (s0 - s) / s0).toFixed(1),
  } : null;
}
function verificar(ofertas) {
  const entrena = ofertas.filter((o) => o.ano < ANO_PRUEBA), prueba = ofertas.filter((o) => o.ano === ANO_PRUEBA);
  const t = tabla(entrena), tt = tablaPorTipo(entrena);
  const out = {}, porTipo = {};
  for (const m of MODALIDADES) {
    out[m] = brierDe(prueba.filter((o) => o.mod === m), (o) => t[m][grupoDe(o.n)][franjaDe(o.pct)]);
    // por tipo de obra, con la tabla de SU tipo: la que dice la frase cuando hay base
    porTipo[m] = {};
    for (const tipo of [...new Set(prueba.filter((o) => o.mod === m && o.tipo).map((o) => o.tipo))].sort()) {
      porTipo[m][tipo] = brierDe(prueba.filter((o) => o.mod === m && o.tipo === tipo),
        (o) => tt[m][tipo] && tt[m][tipo][grupoDe(o.n)][franjaDe(o.pct)]);
    }
  }
  return { aprende: `hasta ${Number(ANO_PRUEBA) - 1}`, prueba: ANO_PRUEBA, encoger_k: ENCOGER_K, por_modalidad: out, por_tipo: porTipo };
}

/* LA VERIFICACIÓN AÑO POR AÑO (28-oct-2026): para probar por tipo de obra, 2026 solo deja pocos procesos por tipo
   (41 de agua en licitación). Aquí cada año de 2022 a 2026 se predice con la tabla aprendida SOLO con los años
   anteriores (ventana creciente: nunca se mira el futuro), y se suman. Por tipo, con la tabla de su tipo. */
const ANOS_VENTANA = ["2022", "2023", "2024", "2025", "2026"];
// las ofertas de `ofertas` que pasan `filtro`, cada año con la celda que da `celdaDeAno` aprendida con los años anteriores
function ventanaDe(ofertas, filtro, celdaDeAno) {
  const P = [];
  const celdas = [];
  for (const y of ANOS_VENTANA) {
    const pr = ofertas.filter((o) => o.ano === y && filtro(o));
    if (!pr.length) continue;
    const cd = celdaDeAno(ofertas.filter((o) => o.ano < y));
    for (const o of pr) { P.push(o); celdas.push(cd(o)); }
  }
  let i = 0;
  return brierDe(P, () => celdas[i++]);
}
/* LA PRUEBA DE UNA SUBPOBLACIÓN (revisión adversaria, 28-oct-2026): la de un tramo sin la entidad que lo concentra, o la
   de ella sola, aprendida y probada SOLO con sus ofertas (un tramo: la celda es la franja). Junto a «vías … sin las de
   INVIAS» iba la prueba de vías, que no tiene ese tramo: sus ofertas salieron de su tipo por el censo. */
const verificarPoblacion = (ofertas) => ventanaDe(ofertas, () => true, (ent) => { const c = celdasDe(ent); return (o) => c[franjaDe(o.pct)]; });
function verificarVentana(ofertas) {
  const juntar = (filtro, celdaDeAno) => ventanaDe(ofertas, filtro, celdaDeAno);
  const porModalidad = {}, porTipo = {};
  for (const m of MODALIDADES) {
    porModalidad[m] = juntar((o) => o.mod === m, (ent) => { const t = tabla(ent); return (o) => t[m][grupoDe(o.n)][franjaDe(o.pct)]; });
    porTipo[m] = {};
    for (const tipo of [...new Set(ofertas.filter((o) => o.mod === m && o.tipo).map((o) => o.tipo))].sort()) {
      porTipo[m][tipo] = juntar((o) => o.mod === m && o.tipo === tipo,
        (ent) => { const tt = tablaPorTipo(ent); return (o) => tt[m][tipo] && tt[m][tipo][grupoDe(o.n)][franjaDe(o.pct)]; });
    }
  }
  return { anos: ANOS_VENTANA, encoger_k: ENCOGER_K, por_modalidad: porModalidad, por_tipo: porTipo };
}

/* portafolio → texto con el que se clasifica su tipo de obra, desde las filas de p6dx-8zbt. Es el NOMBRE del proceso,
   que es lo que Precios recibe desde la lista (`objeto` de qApu): clasificar aquí también la descripción daba, con el
   vocabulario de hoy, a 462 licitaciones y 542 menores cuantías un tipo distinto del que vería la pantalla (revisión
   adversaria, 28-oct-2026). Manda la primera fila. */
function objetosDe(filas) {
  const objetos = new Map();
  for (const r of filas || []) if (r && r.id_del_portafolio && !objetos.has(r.id_del_portafolio)) objetos.set(r.id_del_portafolio, String(r.nombre_del_procedimiento || ""));
  return objetos;
}

function construir(base, { huella = null, generado = new Date().toISOString().slice(0, 10), objetos = null, huella_objetos = null } = {}) {
  const crudas = ofertasDe(base, objetos);
  // los tipos concentrados en una entidad no se publican aparte: sus ofertas quedan sin tipo (siguen en la de todos)
  const concentrados = concentraciones(crudas);
  const sinTipoEntero = crudas.map((o) => (o.tipo && concentrados[o.mod] && concentrados[o.mod][o.tipo] ? { ...o, tipo: null } : o));
  /* y por tramo, con lo que queda: el tramo de un tipo concentrado también sale de su tipo (sus ofertas siguen en la
     de todos); el de todos los tipos se publica, porque lo usa la verificación, y lib/frecuencia_precio no lo dice */
  const tramos = concentracionesPorTramo(sinTipoEntero);
  const tramoDe = (o) => o.tipo && tramos[o.mod] && tramos[o.mod][o.tipo] && tramos[o.mod][o.tipo][grupoDe(o.n)];
  const ofertas = sinTipoEntero.map((o) => (tramoDe(o) ? { ...o, tipo: null } : o));
  /* SIN LA ENTIDAD QUE CONCENTRA Y LA DE ELLA APARTE (28-oct-2026, encargo del dueño): callar un tramo concentrado dejaba
     sin cifra a todas las demás entidades (en menor cuantía con 10 o más oferentes, 401 procesos de otras entidades).
     Cada tramo concentrado lleva la misma población sin esa entidad —con su propio censo: si otra la reúne, tampoco se
     dice— y la de esa entidad sola; lib/frecuencia_precio elige por el NIT de la entidad del proceso. */
  for (const [m, porTipo] of Object.entries(tramos)) for (const [tipo, porGrupo] of Object.entries(porTipo)) for (const [g, rec] of Object.entries(porGrupo)) {
    const pool = sinTipoEntero.filter((o) => o.mod === m && grupoDe(o.n) === g && (tipo === "*" || o.tipo === tipo));
    const sin = pool.filter((o) => o.entidad !== rec.entidad), suyas = pool.filter((o) => o.entidad === rec.entidad);
    rec.sin_ella = { resumen: resumenDe(sin, { porGrupo: false }), celdas: celdasDe(sin), concentracion: concentradosPor(sin, () => "*").get("*") || null,
      verificacion: verificarPoblacion(sin) };
    rec.de_ella = { resumen: resumenDe(suyas, { porGrupo: false }), celdas: celdasDe(suyas), verificacion: verificarPoblacion(suyas) };
  }
  const anos = ofertas.map((o) => o.ano).sort();
  const resumen = {};
  const resumenTipo = {};
  for (const m of MODALIDADES) {
    const om = ofertas.filter((o) => o.mod === m);
    /* en cuántos procesos ganó la oferta MÁS BAJA (28-oct-2026): el hecho con el que la guía de Mis procesos dice
       «no tire el precio al piso», en vez de un mecanismo que, medido, predice peor que el azar; y a qué precio
       ganaron, que es la referencia de Precios */
    resumen[m] = resumenDe(om);
    resumenTipo[m] = {};
    const porTipo = new Map();
    for (const o of om) { const k = o.tipo || null; if (!porTipo.has(k)) porTipo.set(k, []); porTipo.get(k).push(o); }
    for (const [tipo, ofs] of porTipo) resumenTipo[m][tipo || "sin_tipo"] = resumenDe(ofs);
  }
  return {
    formato: FORMATO, generado, base_sha256: huella,
    fuente: "Base nacional de obra (scripts/base_obra), ofertas oferente por oferente de SECOP II (datos abiertos wi7w-2nvm y b28v-edj8) cruzadas con el proceso (p6dx-8zbt).",
    poblacion: "Licitaciones y menores cuantías de obra adjudicadas con 3 o más ofertas válidas, ganador emparejado y competencia de precio (usableMotor de tools/analisis/adjudicacion/fase0).",
    periodo: anos.length ? { desde: anos[0], hasta: anos[anos.length - 1] } : null,
    franja_pp: FRANJA_PP, grupos: GRUPOS,
    resumen, verificacion: verificar(ofertas), celdas: tabla(ofertas),
    /* por tipo de obra (lib/frecuencia_precio.tipoDeObra sobre el objeto del proceso); sin objetos, vacío */
    objetos_sha256: huella_objetos, resumen_tipo: objetos ? resumenTipo : null, celdas_tipo: objetos ? tablaPorTipo(ofertas) : null,
    tipos_concentrados: objetos ? concentrados : null, tramos_concentrados: tramos, concentracion_max: CONCENTRACION_MAX,
    /* la huella del vocabulario con que se clasificó (cuarta revisión adversaria): la suite exige que sea la de hoy */
    vocabulario_sha256: objetos ? huellaVocabulario() : null,
    verificacion_ventana: verificarVentana(ofertas),
  };
}

module.exports = { FORMATO, MODALIDADES, FRANJA_PP, GRUPOS, CONCENTRACION_MAX, grupoDe, franjaDe, ofertasDe, objetosDe, tabla, tablaPorTipo, resumenDe, concentraciones, concentracionesPorTramo, celdasDe, huellaVocabulario, brierDe, verificar, verificarVentana, verificarPoblacion, construir };

if (require.main === module) {
  const [carpeta, salida = path.join(__dirname, "..", "..", "data", "frecuencia_precio.json")] = process.argv.slice(2);
  if (!carpeta) { console.error("Uso: node scripts/base_obra/frecuencia_precio.js <carpeta_de_la_base> [salida.json]"); process.exit(2); }
  const archivo = path.join(carpeta, "base.jsonl.gz");
  const crudo = fs.readFileSync(archivo);
  const base = zlib.gunzipSync(crudo).toString("utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l));
  /* el objeto de cada proceso, del mismo inventario que hizo la base; sin él, sin tipos */
  const { leerJson } = require("./base.js");
  const filas = leerJson(carpeta, "p6dx_obra.json");
  let objetos = null, huellaObjetos = null;
  if (Array.isArray(filas)) {
    objetos = objetosDe(filas);
    huellaObjetos = crypto.createHash("sha256").update(JSON.stringify([...objetos.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1)))).digest("hex");
  }
  const r = construir(base, { huella: crypto.createHash("sha256").update(crudo).digest("hex"), objetos, huella_objetos: huellaObjetos });
  fs.writeFileSync(salida, JSON.stringify(r) + "\n");
  console.log(JSON.stringify({ salida, periodo: r.periodo, resumen: r.resumen, verificacion: r.verificacion.por_modalidad, por_tipo: r.verificacion.por_tipo,
    tipos: r.resumen_tipo && Object.fromEntries(Object.entries(r.resumen_tipo).map(([m, x]) => [m, Object.fromEntries(Object.entries(x).map(([k, v]) => [k, [v.procesos, v.ganador_pct]]))])) }));
}
