"use strict";
/* Base nacional de obra · RETRO-PRUEBA de menor cuantía (25-oct-2026). Solo MIDE.
   Uso:  node scripts/base_obra/retroprueba.js            (imprime el resumen)
         node scripts/base_obra/retroprueba.js --escribir (además escribe resultado.json y
                                                           docs/RETROPRUEBA_MENOR_CUANTIA.md)
   Pregunta del dueño (25-oct-2026): con Santa Elena (CO1.REQ.10768540, perdida por precio,
   5.º de 5 hábiles) y con los procesos de menor cuantía ya adjudicados, ¿qué precio habría
   propuesto Detekta HOY, en qué puesto habría quedado con cada uno de los 4 métodos y bajaba
   del costo de sus APU?
   NADA SE REESCRIBE: el centro de mercado sale de `lib/indice_baja` (`indiceDesdeFilas` +
   `bajaDeMercado`, las mismas reglas y la misma cascada que la aplicación), el precio
   propuesto de `lib/apu/optimizador.optimizarPrecioOferta` (el mismo que enseña Precios), el
   piso de `lib/apu/rentabilidad.precioPiso`, los puntajes de `scripts/base_obra/metodos.js`
   (las 4 fórmulas del pliego, verificadas) y la curva de los 64 procesos del Valle de
   `scripts/base_obra/cifras.js` (`curvaSimulador`, la del simulador de la base nacional).
   LÍMITES, declarados en el informe: (1) el costo del APU real no está (vive en producción):
   se barren escenarios de costo directo sobre presupuesto; (2) en los 64 del Valle todas las
   ofertas publicadas se toman como hábiles (los datos abiertos no publican quién quedó hábil);
   (3) el centro de mercado se construye con las filas de p6dx que trae `historico_entidades.jsonl.gz`
   (adjudicados de obra de la entidad desde oct-2024), no con el histórico de producción;
   (4) `iva_utilidad` va en null: el descuento del optimizador es sobre el precio. */
const fs = require("fs");
const path = require("path");
const M = require("./metodos");
const CI = require("./cifras");
const IB = require("../../lib/indice_baja.js");
const { optimizarPrecioOferta } = require("../../lib/apu/optimizador.js");
const { precioPiso } = require("../../lib/apu/rentabilidad.js");
const { numCO, miles } = require("../../lib/lenguaje_pantalla.js");
const { claveCanonica } = require("../../lib/indice_competencia.js"); // la MISMA clave con la que el índice agrupa entidades

const CARPETA = path.join(__dirname, "retroprueba");
/* Escenarios de costo directo sobre el presupuesto oficial: DECLARADOS, no medidos. El APU
   real de cada oferta no está aquí; el barrido dice qué propondría Detekta con cada costo. */
const ESCENARIOS_COSTO = Object.freeze([0.70, 0.75, 0.80, 0.85, 0.90]);
/* AIU declarado para los escenarios (A 20 · I 5 · U 5 = 30 %, dentro de los topes de los cinco
   pliegos A–E: 30,95 % a 37,61 %). El AIU no mueve el descuento óptimo; mueve el precio de
   venta con el que se compara el precio propuesto («bajo el costo con AIU»). */
const AIU = Object.freeze({ a: 20, i: 5, u: 5 });
const PLAZO_MESES = 6;
const MODALIDAD_SAMC = "Selección Abreviada de Menor Cuantía";
/* Los 64 del Valle traen las ofertas en % del precio base, sin el precio base: se evalúan
   sobre un presupuesto SINTÉTICO de mil millones. Las cuatro fórmulas son homogéneas
   (metodos.js) y el optimizador barre descuentos: la escala no cambia el puesto ni el descuento. */
const PO_SINTETICO = 1e9;
/* Precios de CONTROL en los 64: la regla con la que el dueño ofertó en Santa Elena (96,75 %) y
   los centros medidos del simulador de la base nacional (el piso de menor cuantía, 93,4 %). */
const CONTROLES_PCT = Object.freeze([96.75, 95, 93.4]);

const num = (v) => { if (v == null || v === "") return null; const n = Number(v); return Number.isFinite(n) ? n : null; };
const red = (n, d) => (Number.isFinite(n) ? Math.round(n * 10 ** d) / 10 ** d : null);
const pctDe = (v, po) => (v != null && po > 0 ? red((v / po) * 100, 2) : null);

/* ── el puesto de UN precio entre los hábiles, con cada método ───────────────────────
   Puntaje con `metodos.puntajes` (séptimo decimal sobre el puntaje real, como el pliego).
   `gana` = primero SOLO; `empate` = comparte el máximo (lo deciden criterios que los datos
   abiertos no traen). Un valor no positivo deja el método en null. */
function puestoEntre(valores, precio, metodo, max = M.PUNTAJE_MAXIMO.menor_cuantia) {
  const rivales = (Array.isArray(valores) ? valores : []).map(num).filter((x) => x != null);
  const p0 = num(precio);
  if (p0 == null || !(p0 > 0)) return null;
  const todos = [...rivales, p0];
  const p = M.puntajes(todos, metodo, max);
  if (!p) return null;
  const mio = p[p.length - 1];
  const mejores = p.slice(0, -1).filter((x) => x > mio).length;
  const iguales = p.slice(0, -1).filter((x) => x === mio).length;
  return { puesto: mejores + 1, de: todos.length, puntaje: mio, empate: iguales > 0, gana: mejores === 0 && iguales === 0 };
}
function puestosPorMetodo(valores, precio, max) {
  const out = {};
  let gana = 0, conDato = 0;
  for (const m of M.METODOS) {
    const r = puestoEntre(valores, precio, m, max);
    out[m] = r;
    if (r) { conDato++; if (r.gana) gana++; }
  }
  /* «sorteado»: los centavos de la TRM reparten los 4 métodos parejo (cifras.js, 680 filas):
     la opción de quedar primero es la fracción de métodos en que gana */
  out.gana_en_de_4 = conDato === 4 ? gana : null;
  return out;
}

/* ── la fila que la cascada del índice necesita de un caso ─────────────────────────── */
function filaDeIndice(caso) {
  return {
    entidad: caso.entidad || null,
    nit_entidad: caso.nit_entidad || null,
    departamento_entidad: caso.departamento || null,
    modalidad_de_contratacion: caso.modalidad || MODALIDAD_SAMC,
    codigo_principal_de_categoria: caso.codigo_principal_de_categoria || null,
  };
}

/* ── lo que Detekta propondría hoy para un caso, con UN escenario de costo ─────────── */
function propuestaDetekta({ presupuesto_oficial, modalidad, entidad, id_proceso, baja, cd_fraccion, p_base, aiu = AIU, plazo_meses = PLAZO_MESES, oferentes = null }) {
  const po = num(presupuesto_oficial);
  const cd = Math.round(po * cd_fraccion);
  const aiuTotal = (aiu.a + aiu.i + aiu.u) / 100;
  const precioVenta = Math.round(cd * (1 + aiuTotal));
  const o = optimizarPrecioOferta(
    { id_proceso, entidad, presupuesto_oficial: po, baja: baja || null, competencia: null, p_base, modalidad: modalidad || MODALIDAD_SAMC, precio_venta: precioVenta, precio_actual: null, plazo_meses },
    cd,
    { aiu: { valor_a: Math.round(cd * aiu.a / 100), valor_i: Math.round(cd * aiu.i / 100), valor_u: Math.round(cd * aiu.u / 100) }, plazo_meses, anticipo_pct: 0, anticipo_es_dato: true },
  );
  const piso = precioPiso({ costo_directo: cd, administracion_pct: aiu.a, imprevistos_pct: aiu.i, u_min_pct: aiu.u, presupuesto_oficial: po, oferentes });
  const precio = o.aplicable ? num(o.precio_optimo) : null;
  const op = o.opciones || {};
  return {
    cd_fraccion, costo_directo: cd, precio_venta: precioVenta,
    aplicable: !!o.aplicable, motivo: o.aplicable ? null : o.motivo, mensaje: o.aplicable ? null : o.mensaje,
    descuento_pct: o.aplicable ? red(o.descuento_optimo_pct, 2) : null,
    precio, pct_po: pctDe(precio, po),
    veg: o.aplicable ? o.veg_optimo : null, sin_punto_rentable: o.aplicable ? o.sin_punto_rentable : null,
    // la probabilidad que el MODELO le pone a ese precio (p_base × multiplicador): se compara con la frecuencia real
    probabilidad_modelo: o.aplicable ? num(o.probabilidad_optima) : null,
    en_el_borde: o.aplicable ? (o.alertas || []).some((a) => /extremo/.test(a)) : null,
    conservador: op.conservador ? { descuento_pct: red(op.conservador.descuento, 2), precio: op.conservador.precio, pct_po: pctDe(op.conservador.precio, po) } : null,
    agresivo: op.agresivo ? { descuento_pct: red(op.agresivo.descuento, 2), precio: op.agresivo.precio, pct_po: pctDe(op.agresivo.precio, po) } : null,
    meseta_colapsada: op.meseta ? !!op.meseta.colapsada : null,
    alertas: o.alertas || [],
    piso_decision: piso.precio_piso_decision,
    piso_pct_po: pctDe(piso.precio_piso_decision, po),
    // ¿propone bajar del costo? Dos lecturas: el costo con su AIU y el piso que decide (σ = 15 %)
    bajo_costo_con_aiu: precio == null ? null : precio < precioVenta,
    /* «pierde plata» es otra pregunta: por debajo de costo directo + administración (sin imprevistos ni
       utilidad) el precio no cubre lo que cuesta ejecutar (revisión adversaria, 25-oct-2026) */
    costo_mas_administracion: Math.round(cd * (1 + aiu.a / 100)),
    bajo_costo_mas_administracion: precio == null ? null : precio < Math.round(cd * (1 + aiu.a / 100)),
    bajo_piso_decision: precio == null || piso.precio_piso_decision == null ? null : precio < piso.precio_piso_decision,
  };
}

/* ── un caso real completo ─────────────────────────────────────────────────────────── */
function evaluarCaso(caso, indice, { escenarios = ESCENARIOS_COSTO, max: maxDefecto = M.PUNTAJE_MAXIMO.menor_cuantia } = {}) {
  const po = num(caso.presupuesto_oficial);
  // el puntaje máximo del precio lo fija el pliego (49,5; 49,75 cuando la convocatoria se limita a Mipyme, como en D)
  const max = num(caso.puntaje_maximo_precio) ?? maxDefecto;
  const ofertas = Array.isArray(caso.ofertas) ? caso.ofertas : [];
  const rivales = ofertas.filter((o) => o.habil && !o.nuestra).map((o) => num(o.valor_corregido ?? o.valor_publicado)).filter((x) => x != null);
  const nuestra = ofertas.find((o) => o.nuestra) || null;
  const baja = indice ? IB.bajaDeMercado(indice, filaDeIndice(caso)) : null;
  /* de qué está hecho el centro: cuántos contratos de cada modalidad trae el registro de la ENTIDAD
     (la cascada puede haber respondido con la cubeta de una modalidad o con todas: lo dice `modalidad_utilizada`) */
  const registroEntidad = indice && indice.entidad ? indice.entidad[claveCanonica(caso.entidad)] || null : null;
  const cubetas = registroEntidad && registroEntidad.por_modalidad
    ? Object.fromEntries(Object.entries(registroEntidad.por_modalidad).map(([m, x]) => [m, { procesos: x.procesos, baja_mediana: x.baja_mediana }])) : null;
  const pBase = 1 / (rivales.length + 1);
  /* control 1: la oferta real del dueño, si la hubo (Santa Elena): tiene que reproducir el 5.º de 5 */
  const control = nuestra ? (() => {
    const v = num(nuestra.valor_corregido ?? nuestra.valor_publicado);
    return { precio: v, pct_po: pctDe(v, po), puestos: puestosPorMetodo(rivales, v, max) };
  })() : null;
  /* control 2: el ganador real contra los demás hábiles, con el método real: tiene que ganar */
  let ganadorReal = null;
  if (caso.ganador && num(caso.ganador.valor) != null) {
    const vg = num(caso.ganador.valor);
    const otros = ofertas.filter((o) => o.habil && num(o.valor_corregido ?? o.valor_publicado) !== vg).map((o) => num(o.valor_corregido ?? o.valor_publicado));
    const p = caso.metodo_real ? puestoEntre(otros, vg, caso.metodo_real, max) : null;
    ganadorReal = { nombre: caso.ganador.nombre, valor: vg, pct_po: pctDe(vg, po), metodo_real: caso.metodo_real || null, reproduce: p ? p.gana || p.empate : null, puesto: p };
  }
  /* el costo directo REAL del APU propio, si el dueño lo pegó (apu_propio.costo_directo), va como primer
     escenario con su fuente: es la única forma de contestar «¿bajaba del costo de sus APU?» con el dato */
  const cdPropio = caso.apu_propio ? num(caso.apu_propio.costo_directo) : null;
  const lista = [...(cdPropio != null && cdPropio > 0 && po ? [{ f: cdPropio / po, fuente: "apu_propio" }] : []), ...escenarios.map((f) => ({ f, fuente: "escenario" }))];
  const escenariosOut = lista.map(({ f, fuente }) => {
    const prop = propuestaDetekta({ presupuesto_oficial: po, modalidad: caso.modalidad, entidad: caso.entidad, id_proceso: caso.id_req, baja, cd_fraccion: f, p_base: pBase, oferentes: rivales.length + 1 });
    const puestos = prop.precio != null ? puestosPorMetodo(rivales, prop.precio, max) : null;
    const sim = prop.precio != null && rivales.length ? CI.simularProceso(rivales.map((v) => v / po), prop.precio / po, max) : null;
    return { ...prop, fuente_costo: fuente, puestos, con_metodo_real: puestos && caso.metodo_real ? puestos[caso.metodo_real] : null, bajo_piso_de_las_ofertas: sim ? sim.bajo_piso : null };
  });
  return {
    clave: caso.clave, titulo: caso.titulo, id_req: caso.id_req, entidad: caso.entidad, departamento: caso.departamento,
    presupuesto_oficial: po, n_habiles_rivales: rivales.length, rivales_pct: rivales.map((v) => pctDe(v, po)),
    metodo_real: caso.metodo_real || null, trm: caso.trm || null,
    centro: baja, centro_cubetas: cubetas, p_base_declarado: red(pBase, 4),
    control_oferta_propia: control, ganador_real: ganadorReal,
    apu_propio: caso.apu_propio || null, nota: caso.nota || null,
    escenarios: escenariosOut,
  };
}

/* ── los 64 del Valle ───────────────────────────────────────────────────────────────
   Entidad de cada proceso: el nombre viene cortado a 40 caracteres; se casa por prefijo con las
   entidades del histórico y, si casa con ninguna o con varias, el proceso queda sin centro (se
   cuenta y se dice). */
const normE = (s) => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^A-Za-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim().toUpperCase();
function entidadCompleta(ent40, entidadesHistorico) {
  const pref = normE(ent40);
  if (!pref) return null;
  const cas = [...new Set((entidadesHistorico || []).map((e) => String(e || "")))].filter((e) => normE(e).startsWith(pref));
  return cas.length === 1 ? cas[0] : null;
}
function evaluarValle(procesos, indice, entidadesHistorico, { escenarios = ESCENARIOS_COSTO, controles = CONTROLES_PCT, max = M.PUNTAJE_MAXIMO.menor_cuantia } = {}) {
  const filas = (Array.isArray(procesos) ? procesos : []).filter((p) => Array.isArray(p.pct) && p.pct.length >= 2);
  const porProceso = [];
  let sinCentro = 0, sinEntidad = 0;
  const agregado = (nombre) => ({ nombre, procesos: 0, gana: Object.fromEntries(M.METODOS.map((m) => [m, 0])), sorteado_suma: 0, bajo_piso: 0, bajo_costo_con_aiu: 0, pct_po: [] });
  const porEscenario = escenarios.map((f) => agregado(`costo ${red(f * 100, 0)} %`));
  const porControl = controles.map((c) => agregado(`control ${numCO(c, 2)} %`));
  for (const x of filas) {
    const entidad = entidadCompleta(x.ent, entidadesHistorico);
    const baja = entidad && indice ? IB.bajaDeMercado(indice, { entidad, departamento_entidad: "Valle del Cauca", modalidad_de_contratacion: MODALIDAD_SAMC }) : null;
    const rivales = x.pct.map((q) => Math.round(q / 100 * PO_SINTETICO));
    const fila = { id: x.id, entidad_40: x.ent, entidad, n_ofertas: x.pct.length, ganador_pct: red(x.gan, 2), centro: baja ? { nivel: baja.nivel, baja_mediana: baja.baja_mediana, procesos: baja.procesos_contados, granularidad: baja.granularidad_utilizada || null } : null, escenarios: [], controles: [] };
    // dos causas que no se mezclan: el nombre cortado a 40 caracteres no casó con ninguna entidad, o casó y no hay base
    if (!entidad) sinEntidad++;
    else if (!baja || baja.nivel === "sin_dato") sinCentro++;
    const pBase = 1 / (rivales.length + 1);
    escenarios.forEach((f, k) => {
      const prop = propuestaDetekta({ presupuesto_oficial: PO_SINTETICO, modalidad: MODALIDAD_SAMC, entidad, id_proceso: x.id, baja, cd_fraccion: f, p_base: pBase, oferentes: rivales.length + 1 });
      const puestos = prop.precio != null ? puestosPorMetodo(rivales, prop.precio, max) : null;
      const sim = prop.precio != null ? CI.simularProceso(x.pct.map((q) => q / 100), prop.precio / PO_SINTETICO, max) : null;
      fila.escenarios.push({ cd_fraccion: f, aplicable: prop.aplicable, motivo: prop.motivo, pct_po: prop.pct_po, gana_en_de_4: puestos ? puestos.gana_en_de_4 : null, bajo_piso: sim ? sim.bajo_piso : null, bajo_costo_con_aiu: prop.bajo_costo_con_aiu });
      if (puestos && puestos.gana_en_de_4 != null) {
        const a = porEscenario[k];
        a.procesos++; a.sorteado_suma += puestos.gana_en_de_4 / 4; a.pct_po.push(prop.pct_po);
        for (const m of M.METODOS) if (puestos[m] && puestos[m].gana) a.gana[m]++;
        if (sim && sim.bajo_piso) a.bajo_piso++;
        if (prop.bajo_costo_con_aiu) a.bajo_costo_con_aiu++;
      }
    });
    controles.forEach((c, k) => {
      const precio = Math.round(c / 100 * PO_SINTETICO);
      const puestos = puestosPorMetodo(rivales, precio, max);
      const sim = CI.simularProceso(x.pct.map((q) => q / 100), c / 100, max);
      fila.controles.push({ pct: c, gana_en_de_4: puestos.gana_en_de_4, bajo_piso: sim.bajo_piso });
      if (puestos.gana_en_de_4 != null) {
        const a = porControl[k];
        a.procesos++; a.sorteado_suma += puestos.gana_en_de_4 / 4; a.pct_po.push(c);
        for (const m of M.METODOS) if (puestos[m] && puestos[m].gana) a.gana[m]++;
        if (sim.bajo_piso) a.bajo_piso++;
      }
    });
    porProceso.push(fila);
  }
  const cerrar = (a) => ({
    nombre: a.nombre, procesos: a.procesos,
    gana_de_cada_100: Object.fromEntries(M.METODOS.map((m) => [m, a.procesos ? red(100 * a.gana[m] / a.procesos, 1) : null])),
    sorteado_de_cada_100: a.procesos ? red(100 * a.sorteado_suma / a.procesos, 1) : null,
    bajo_piso_de_cada_100: a.procesos ? red(100 * a.bajo_piso / a.procesos, 1) : null,
    bajo_costo_con_aiu: a.bajo_costo_con_aiu,
    pct_po_mediana: a.pct_po.length ? red(a.pct_po.slice().sort((p, q) => p - q)[Math.floor((a.pct_po.length - 1) / 2)], 2) : null,
  });
  /* la curva del simulador de la base nacional sobre estos 64 (la misma función de cifras.js) */
  const curva = CI.curvaSimulador(filas.map((x) => ({ modalidad: "menor_cuantia", ofertas_validas: x.pct.map((q, i) => ({ proveedor: `n:${i}`, pct: q / 100 })) })));
  return { procesos: filas.length, sin_centro: sinCentro, entidad_no_identificable: sinEntidad, por_escenario: porEscenario.map(cerrar), por_control: porControl.map(cerrar), por_proceso: porProceso, curva_simulador: curva.filter((f) => f.precio_pct >= 90) };
}

/* ── todo junto ───────────────────────────────────────────────────────────────────── */
function retroprueba({ casos, valle, historico }) {
  const { indice, stats } = IB.indiceDesdeFilas(historico || []);
  const entidades = [...new Set((historico || []).map((f) => f.entidad).filter(Boolean))];
  return {
    generado: new Date().toISOString(),
    escenarios_costo: ESCENARIOS_COSTO, aiu_declarado: AIU, plazo_meses_declarado: PLAZO_MESES,
    historico: { filas: stats.filas, analizados: stats.analizados, descartes: { sin_precio_base: stats.sin_precio_base, sin_adjudicado: stats.sin_adjudicado, adjudicatario_no_definido: stats.adjudicatario_no_definido, bajo_30_pct: stats.bajo_30_pct, sobre_110_pct: stats.sobre_110_pct }, entidades: entidades.length },
    casos: (casos || []).map((c) => evaluarCaso(c, indice)),
    valle: valle ? evaluarValle(valle, indice, entidades) : null,
  };
}

/* ── el informe que lee el dueño ───────────────────────────────────────────────────── */
const cop = (n) => (n == null ? "—" : `$${miles(n)}`);
const pz = (n, d = 2) => (n == null ? "—" : `${numCO(n, d)} %`);
const puestoTxt = (p) => (!p ? "—" : p.gana ? "**1.º**" : p.empate ? `${p.puesto}.º (empate)` : `${p.puesto}.º de ${p.de}`);
const siNo = (v) => (v == null ? "—" : v ? "sí" : "no");
function informe(R, fecha) {
  const L = [];
  L.push("# Retro-prueba de menor cuantía: qué precio habría propuesto Detekta y en qué puesto habría quedado", "");
  L.push(`> Para: dueño · Estado: informe fechado (${fecha}) · Sustituido por: —`, "");
  L.push("Generado por `node scripts/base_obra/retroprueba.js --escribir`: no se edita a mano. Las cifras de las secciones 1, 2, 3 y 5 salen de llamar a las funciones que la aplicación usa (el centro de mercado de `lib/indice_baja`, el precio sugerido de `lib/apu/optimizador`, el piso de `lib/apu/rentabilidad`, las cuatro fórmulas del pliego de `scripts/base_obra/metodos.js`); la sección 4 es texto fijo con lo que midió otro subagente sobre datos que no están en este repositorio, y se rotula así.", "");
  L.push("Vocabulario: **VEG** es «lo que deja por intento» (probabilidad de ganar × utilidad − costo de preparar); **p_base** es la probabilidad declarada antes del precio (1 entre los hábiles); **σ** es la dispersión de las ofertas; **P25/P75** son los cuartos de la baja histórica; la **cascada** es el orden en que la aplicación busca el centro (entidad y familia → entidad → departamento y familia); **p6dx** es el conjunto de datos abiertos de SECOP II con los procesos; **TRM** es la tasa de cambio con cuyos centavos el pliego sortea el método.", "");
  L.push("## 1. Qué se midió", "");
  L.push("- **Qué precio propondría Detekta hoy** para cada proceso: el óptimo de Precios con el centro de mercado de la entidad construido con las mismas reglas del índice de baja sobre las adjudicaciones de obra de esa entidad desde octubre de 2024 (`historico_entidades.jsonl.gz`, una fila por proceso: `indiceDesdeFilas` deduplica por `id_del_proceso` como la aplicación, con la última fila vista por proceso; producción conserva la de sello de actualización más reciente, que no siempre es la última del archivo). El costo del APU real no está (vive en producción), así que se barren cinco escenarios de costo directo sobre el presupuesto oficial: " + ESCENARIOS_COSTO.map((f) => `${red(f * 100, 0)} %`).join(", ") + `, con AIU ${AIU.a}/${AIU.i}/${AIU.u} y ${PLAZO_MESES} meses de plazo, los tres declarados.`);
  L.push("- **En qué puesto quedaría** ese precio entre los hábiles reales con cada uno de los 4 métodos del pliego (mediana, media geométrica, media aritmética baja, menor valor), con el método que de verdad se sorteó, y «gana en k de 4»: la opción de quedar primero si el método sale al azar.");
  L.push("- **Si baja del costo**, con dos preguntas distintas: «bajo el precio con AIU completo» (gana menos que su AIU) y «bajo costo directo + administración» (pierde plata: no cubre lo que cuesta ejecutar); y el piso que decide (`precioPiso`, σ = 15 %), impreso en % del presupuesto.");
  L.push("- **Controles**: los dos de Santa Elena tienen que reproducirse (la oferta real del dueño 5.º de 5 y el ganador real primero con la geométrica); en los demás casos el ganador real se contrasta con el método real y, cuando no queda primero por precio (puntos de calidad, un error de la entidad), se dice como hecho: el puesto por precio de la propuesta sigue valiendo, porque mide la misma fórmula.", "");
  L.push(`Histórico con el que se construyó el centro: ${miles(R.historico.filas)} filas de p6dx, ${miles(R.historico.analizados)} con baja medible (descartes: ${Object.entries(R.historico.descartes).map(([k, v]) => `${k} ${v}`).join(", ")}), ${R.historico.entidades} entidades.`, "");
  L.push("## 2. Los casos reales", "");
  R.casos.forEach((c, i) => {
    L.push(`### 2.${i + 1}. ${c.titulo}`, "");
    L.push(`Presupuesto oficial ${cop(c.presupuesto_oficial)} · ${c.n_habiles_rivales === 1 ? "1 rival hábil" : `${c.n_habiles_rivales} rivales hábiles`} (${c.rivales_pct.map((p) => pz(p)).join(", ")}) · método real: ${c.metodo_real || "sin dato"}${c.trm ? ` (TRM ${numCO(c.trm, 2)})` : ""}.`, "");
    const cubetasTxt = c.centro_cubetas ? Object.entries(c.centro_cubetas).map(([m, x]) => `${m} ${x.procesos}${x.baja_mediana != null ? ` (mediana ${pz(x.baja_mediana, 0)})` : ""}`).join(" · ") : null;
    if (c.centro && c.centro.nivel !== "sin_dato") L.push(`Centro de mercado que usaría Detekta: baja mediana ${pz(c.centro.baja_mediana, 1)} (P25 ${pz(c.centro.baja_p25, 1)} · P75 ${pz(c.centro.baja_p75, 1)}), ${c.centro.procesos_contados} contratos, nivel «${c.centro.nivel}», medido en ${c.centro.granularidad_utilizada}${c.centro.modalidad_utilizada ? ` (${c.centro.modalidad_utilizada})` : " (todas las modalidades)"}.${cubetasTxt ? ` La entidad entera trae: ${cubetasTxt}.` : ""}`, "");
    else L.push(`Centro de mercado: **sin dato** (${c.centro ? c.centro.mensaje : "sin histórico"}). Sin centro, Detekta no sugiere precio: la fila de abajo lo dice tal cual.`, "");
    if (c.control_oferta_propia) {
      const k = c.control_oferta_propia;
      L.push(`Control — la oferta real del dueño (${cop(k.precio)}, ${pz(k.pct_po)}): ${M.METODOS.map((m) => `${m} ${puestoTxt(k.puestos[m])}`).join(" · ")}; con el método real (${c.metodo_real}) ${puestoTxt(k.puestos[c.metodo_real])}.`, "");
    }
    if (c.ganador_real) L.push(`Control — el ganador real (${c.ganador_real.nombre}, ${pz(c.ganador_real.pct_po)}) con el método real: ${c.ganador_real.reproduce == null ? "sin método real" : c.ganador_real.reproduce ? "queda primero por precio (reproducido)" : "**no queda primero por precio**"}.${c.nota ? ` ${c.nota}` : ""}`, "");
    if (c.apu_propio && c.apu_propio.costo_directo == null) L.push(`APU propio: **sin dato** (${c.apu_propio.motivo}). Si el dueño pega su costo directo en \`apu_propio.costo_directo\`, sale como primera fila.`, "");
    L.push("| Costo directo / presupuesto | Precio propuesto | % del presupuesto | Mediana | Geométrica | Aritm. baja | Menor valor | Gana en k de 4 | Con el método real | Bajo el precio con AIU completo | Bajo costo + administración (pierde plata) | Bajo el piso (σ 15 %) | Bajo mediana − σ de las ofertas |");
    L.push("|---|---|---|---|---|---|---|---|---|---|---|---|---|");
    for (const e of c.escenarios) {
      const rot = e.fuente_costo === "apu_propio" ? `APU propio (${pz(e.cd_fraccion * 100, 1)})` : pz(e.cd_fraccion * 100, 0);
      if (!e.aplicable) { L.push(`| ${rot} | no sugiere | — | — | — | — | — | — | — | — | — | — | — |`); L.push(`| | *${e.mensaje || e.motivo}* | | | | | | | | | | | |`); continue; }
      const p = e.puestos || {};
      // un «óptimo» sin punto rentable es la pérdida menor, no una propuesta: se marca en la celda
      const precioTxt = e.sin_punto_rentable ? `${cop(e.precio)} (pérdida en todo el rango)` : cop(e.precio);
      L.push(`| ${rot} | ${precioTxt} | ${pz(e.pct_po)} | ${puestoTxt(p.mediana)} | ${puestoTxt(p.geometrica)} | ${puestoTxt(p.aritmetica_baja)} | ${puestoTxt(p.menor_valor)} | ${p.gana_en_de_4 == null ? "—" : `${p.gana_en_de_4} de 4`} | ${puestoTxt(e.con_metodo_real)} | ${siNo(e.bajo_costo_con_aiu)} | ${siNo(e.bajo_costo_mas_administracion)} | ${siNo(e.bajo_piso_decision)} (piso ${pz(e.piso_pct_po, 0)}) | ${siNo(e.bajo_piso_de_las_ofertas)} |`);
    }
    L.push("");
    const ap = c.escenarios.filter((e) => e.aplicable);
    if (ap.length) {
      const ds = [...new Set(ap.map((e) => e.descuento_pct))];
      L.push(`Lectura: el descuento óptimo ${ds.length === 1 ? `es el mismo en los cinco escenarios (${pz(ds[0])})` : `va de ${pz(Math.min(...ds))} a ${pz(Math.max(...ds))}`}; la banda conservador–agresivo del primer escenario va de ${pz(ap[0].conservador && ap[0].conservador.pct_po)} a ${pz(ap[0].agresivo && ap[0].agresivo.pct_po)} del presupuesto${ap[0].meseta_colapsada ? " (meseta colapsada: el óptimo es agudo)" : ""}. La probabilidad que el modelo le pone al precio propuesto es ${ap.map((e) => (e.probabilidad_modelo == null ? "—" : `${numCO(e.probabilidad_modelo * 100, 1)} %`)).join(" / ")} (p_base declarado ${numCO(c.p_base_declarado * 100, 1)} % × el multiplicador de precio).`, "");
    }
  });
  /* lo que dicen los casos juntos, CONTADO (no escrito a mano): en los procesos con competencia real
     (3 o más rivales hábiles), cuántos precios propuestos quedan primeros con algún método */
  {
    const conComp = R.casos.filter((c) => c.n_habiles_rivales >= 3);
    const props = conComp.flatMap((c) => c.escenarios.filter((e) => e.aplicable));
    const ganan = props.filter((e) => e.puestos && e.puestos.gana_en_de_4 > 0).length;
    const conReal = props.filter((e) => e.con_metodo_real && e.con_metodo_real.gana).length;
    const ganadores = conComp.map((c) => c.ganador_real && c.ganador_real.pct_po).filter((x) => x != null);
    const propuestos = props.map((e) => e.pct_po).filter((x) => x != null);
    L.push(`### 2.${R.casos.length + 1}. Lo que dicen los casos juntos`, "");
    const sinRentable = props.filter((e) => e.sin_punto_rentable).length;
    const conRentable = props.filter((e) => !e.sin_punto_rentable);
    const bordeRentable = conRentable.filter((e) => e.en_el_borde).length;
    const bordeTodos = props.filter((e) => e.en_el_borde).length;
    L.push(`En los ${conComp.length} procesos con competencia real (3 o más rivales hábiles) hay ${props.length} filas con precio: ${sinRentable} son escenarios donde ningún precio es rentable (el costo con su AIU supera el presupuesto y el «óptimo» es la pérdida menor, marcadas en la tabla) y ${conRentable.length} son propuestas con punto rentable. De las ${conRentable.length} propuestas ${conRentable.filter((e) => e.puestos && e.puestos.gana_en_de_4 > 0).length === 0 ? "**ninguna** queda primera con ningún método" : `${conRentable.filter((e) => e.puestos && e.puestos.gana_en_de_4 > 0).length} quedan primeras con algún método`}, y de las ${props.length} filas ${ganan === 0 ? "ninguna" : ganan} con algún método y ${conReal} con el método que de verdad se sorteó. Los ganadores reales de esos procesos ofertaron entre ${pz(Math.min(...ganadores))} y ${pz(Math.max(...ganadores))} del presupuesto; las filas con precio van de ${pz(Math.min(...propuestos))} a ${pz(Math.max(...propuestos))}. El descuento óptimo cae en el borde de menos descuento en ${bordeRentable} de las ${conRentable.length} propuestas con punto rentable (${bordeTodos} de las ${props.length} filas): la probabilidad del modelo cambia tan poco a lo largo del barrido que el margen decide la mayoría de las veces, no siempre.`, "");
  }
  if (R.valle) {
    const V = R.valle;
    L.push("## 3. Los 64 procesos de menor cuantía del Valle (2024–2026)", "");
    L.push(`${V.procesos} procesos con 3 o más ofertas publicadas (detekta-lector, \`valle_samc_64.json\`); ${V.entidad_no_identificable} sin entidad identificable (el origen corta el nombre a 40 caracteres y no casa con ninguna del histórico, o casa con varias) y ${V.sin_centro} con entidad pero sin centro de mercado en el histórico (menos de 5 contratos con baja medible); sin centro Detekta no sugiere precio y el proceso no entra en la fila. Todas las ofertas publicadas se toman como hábiles: es el límite de los datos abiertos, declarado. Presupuesto sintético de ${cop(PO_SINTETICO)} (las fórmulas del pliego comparan porcentajes, así que el valor no cambia los puestos).`, "");
    L.push("| Precio evaluado | Procesos con precio | % del presupuesto (mediana) | Gana con mediana | Con geométrica | Con aritm. baja | Con menor valor | Primero si el método se sortea | Bajo mediana − σ de las ofertas | Bajo costo + AIU |");
    L.push("|---|---|---|---|---|---|---|---|---|---|");
    for (const a of [...V.por_escenario, ...V.por_control]) {
      L.push(`| ${a.nombre} | ${a.procesos} | ${pz(a.pct_po_mediana)} | ${a.gana_de_cada_100.mediana == null ? "—" : `${pz(a.gana_de_cada_100.mediana, 1)}`} | ${pz(a.gana_de_cada_100.geometrica, 1)} | ${pz(a.gana_de_cada_100.aritmetica_baja, 1)} | ${pz(a.gana_de_cada_100.menor_valor, 1)} | ${a.sorteado_de_cada_100 == null ? "—" : `${pz(a.sorteado_de_cada_100, 1)} de cada 100`} | ${pz(a.bajo_piso_de_cada_100, 1)} | ${a.bajo_costo_con_aiu == null ? "—" : a.bajo_costo_con_aiu} |`);
    }
    L.push("", "Las filas «control» no son propuestas de Detekta: son precios fijos para comparar: 96,75 % (la regla con la que se ofertó Santa Elena), 95 % (un valor redondo entre los ganadores de los casos) y 93,4 % (el arranque del tramo con el que la aritmética baja ganaba en Santa Elena según `caso_santa_elena/LECCIONES.md` del lector).", "");
    L.push("### 3.1. La curva del simulador de la base nacional sobre estos 64", "");
    L.push("La misma función con la que la base nacional publica «de cada 100 procesos, en cuántos un precio queda primero» (`cifras.curvaSimulador`): con el método sorteado, y contando solo los que además no quedan bajo mediana − σ de las ofertas.", "");
    L.push("| Precio (% del presupuesto) | Primero (sorteado) de cada 100 | Primero y sobre el piso de cada 100 | Bajo el piso de cada 100 |", "|---|---|---|---|");
    for (const f of V.curva_simulador) L.push(`| ${pz(f.precio_pct, 1)} | ${pz(f.sorteado_gana_de_cada_100, 1)} | ${pz(f.sorteado_gana_sobre_piso_de_cada_100, 1)} | ${pz(f.bajo_piso_de_cada_100, 1)} |`);
    L.push("");
  }
  L.push("## 4. Lo que la Fase 1 midió sobre el centro de mercado (25-oct-2026) — texto fijo, no regenerado", "");
  L.push("Hechos medidos por un subagente el 25-oct-2026 con las funciones reales de `lib/indice_baja` sobre las filas CRUDAS de p6dx (datos.gov.co, con lotes), que NO están en este repositorio: estas viñetas no se recalculan con el script y se copian aquí con esa salvedad. Explican por qué el centro de la entidad no sirve para fijar el precio de una menor cuantía con competencia:", "");
  L.push("- **Los lotes envenenan el centro.** p6dx publica cada proceso de k lotes como filas proveedor × lote con el `precio_base` del proceso ENTERO: en la Secretaría de Infraestructura de Cali, 499 de 516 filas crudas son de 7 procesos con lotes, y un lote de 2 o 3 pasa la guarda del 30 % del índice (ratio adjudicado/base: lotes de 2, mediana 0,465; de 3, 0,292; de 4, 0,216). Sin deduplicar, el centro de Cali sale en 53 % de baja (77 contratos) y Detekta propondría el 57 % del presupuesto, por debajo del costo directo, con el valor esperado negativo en todo el rango. Deduplicado por proceso, como hace la aplicación, el centro queda entre 9 % y 20 % según qué fila de lote sobreviva: inestable. Sin los procesos con lotes: 9 % con 5 contratos.");
  L.push("- **El índice descarta a los consorcios que ganan.** `adjudicatarioReal` exige un NIT y p6dx publica «No Definido» en el NIT de los consorcios y uniones temporales: en Cali se descarta el 55 %–59 % de las filas que traen un nombre real de proveedor. Santa Elena está adjudicado en p6dx bajo otro identificador del mismo expediente (CO1.REQ.11022478: $1.488.426.655 a CONCRETAR 2026, NIT «No Definido», 24-sep-2026) y el índice lo descarta por eso.");
  L.push("- **No hay cubeta de menor cuantía.** La modalidad canónica agrupa toda «selección abreviada» (con y sin manifestación); en Cali esa cubeta tiene 3 procesos con baja medible y no llega al mínimo de 5: el refinamiento por modalidad no actúa y la cascada responde con la entidad entera, mezclando licitaciones por lotes y mínimas cuantías.");
  L.push("- **Con un centro limpio la propuesta cambia de signo.** Con el centro de Cali sin lotes (9 %, 5 contratos) y costo directo del 70 % del presupuesto, el optimizador habría dado el 91,5 % (primero con menor valor, 5.º con mediana y geométrica); con el 75 %, el 94 % (primero con la mediana). Medido con el P25/P75 de ese centro limpio, que no está en el árbol: con otros cuartos salen otros valores. El centro decide la propuesta más que el costo.");
  {
    const conComp = R.casos.filter((c) => c.n_habiles_rivales >= 3);
    const filas = conComp.flatMap((c) => c.escenarios.filter((e) => e.aplicable && e.pct_po != null && e.probabilidad_modelo != null));
    const rango = (xs) => (xs.length ? `${pz(Math.min(...xs) * 100, 1)}–${pz(Math.max(...xs) * 100, 1)}` : "—");
    const p95a99 = filas.filter((e) => e.pct_po >= 95 && e.pct_po < 100).map((e) => e.probabilidad_modelo);
    const p100 = filas.filter((e) => e.pct_po >= 100).map((e) => e.probabilidad_modelo);
    const valle99 = R.valle ? (R.valle.curva_simulador.find((f) => f.precio_pct === 99) || {}).sorteado_gana_de_cada_100 : null;
    const valle100 = R.valle ? (R.valle.curva_simulador.find((f) => f.precio_pct === 100) || {}).sorteado_gana_de_cada_100 : null;
    L.push(`- **La probabilidad del modelo es plana donde la real cae** (esta viñeta sí se cuenta desde el resultado). En los casos con competencia real, a las filas con precio entre el 95 % y el 99 % del presupuesto el modelo les pone ${rango(p95a99)} de opción y a las del 100 %, ${rango(p100)}; en los 64 del Valle el 99 % queda primero en ${valle99 == null ? "—" : numCO(valle99, 1)} de cada 100 y el 100 % en ${valle100 == null ? "—" : numCO(valle100, 1)}. Por eso el óptimo del valor esperado se va al borde de menos descuento: el margen manda y la probabilidad no lo frena.`, "");
  }
  L.push("## 5. Límites de esta medición", "");
  L.push("- El costo del APU real de cada oferta **no está**: Santa Elena vive en producción (Redis) y de A–E no hay APU propio. «Bajaba del costo» se responde por escenario de costo, no por la obra.");
  L.push("- El centro de mercado se construyó con las filas de p6dx de las entidades de los casos (adjudicados de obra con fecha de adjudicación desde oct-2024, una fila por proceso), con las reglas del índice; producción recorre su propio histórico (publicados desde ene-2024, todas las modalidades competitivas con objeto de obra, deduplicado por el sello de actualización) y puede tener otro conteo y otra fila de lote superviviente. La granularidad usada va dicha en cada caso. El registro real de producción no se consultó: el encargo no toca Redis.");
  L.push("- Los hábiles de los casos salen de los informes de evaluación; en los 64 del Valle no se sabe quién quedó hábil y se toman todas las publicadas.");
  L.push("- `p_base` es declarado (1 entre los hábiles): en el rango que aquí se usa (11 %–50 %) el descuento óptimo no cambia con él (la suite lo prueba para el optimizador en su rango); con valores extremos (0,8 o más) sí cambia. El VEG sí depende de él, y por eso no se publica aquí como cifra de decisión.");
  L.push("- El IVA sobre la utilidad va en null: el descuento se mide sobre el precio, no sobre el total con IVA que compara la entidad.", "");
  return L.join("\n");
}

async function main() {
  const escribir = process.argv.includes("--escribir");
  const leer = (f) => JSON.parse(fs.readFileSync(path.join(CARPETA, f), "utf8"));
  const casos = leer("casos_menor_cuantia.json");
  const valle = leer("valle_samc_64.json");
  const rutaHist = path.join(CARPETA, "historico_entidades.jsonl.gz");
  /* una fila por línea (la primera es la ficha `_meta`), comprimido como los demás insumos de la base */
  const filas = fs.existsSync(rutaHist)
    ? require("zlib").gunzipSync(fs.readFileSync(rutaHist)).toString("utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l)).filter((r) => !r._meta)
    : [];
  if (!filas.length) process.stderr.write("AVISO: sin historico_entidades.jsonl.gz no hay centro de mercado y Detekta no sugiere precio: la retro-prueba sale «no sugiere» en todos los casos.\n");
  const R = retroprueba({ casos: casos.casos, valle: valle.procesos, historico: filas });
  const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
  const hoy = new Date(Date.now() - 5 * 3600e3);   // la fecha de la ficha en hora de Colombia (UTC−5), no en UTC
  const fecha = `${hoy.getUTCDate()}-${MESES[hoy.getUTCMonth()]}-${hoy.getUTCFullYear()}`;
  for (const c of R.casos) {
    process.stdout.write(`\n${c.titulo}\n  centro: ${c.centro ? `${c.centro.nivel} mediana ${c.centro.baja_mediana} (${c.centro.procesos_contados}) ${c.centro.granularidad_utilizada || ""}` : "—"}\n`);
    if (c.control_oferta_propia) process.stdout.write(`  control oferta propia: ${JSON.stringify(Object.fromEntries(M.METODOS.map((m) => [m, c.control_oferta_propia.puestos[m] && c.control_oferta_propia.puestos[m].puesto])))}\n`);
    for (const e of c.escenarios) process.stdout.write(`  cd ${e.cd_fraccion}: ${e.aplicable ? `${e.pct_po} % · gana en ${e.puestos.gana_en_de_4} de 4 · real ${e.con_metodo_real ? e.con_metodo_real.puesto : "—"} · bajo costo ${e.bajo_costo_con_aiu}` : `no sugiere (${e.motivo})`}\n`);
  }
  if (R.valle) for (const a of [...R.valle.por_escenario, ...R.valle.por_control]) process.stdout.write(`valle ${a.nombre}: n=${a.procesos} sorteado ${a.sorteado_de_cada_100} de cada 100 · bajo piso ${a.bajo_piso_de_cada_100}\n`);
  if (escribir) {
    fs.writeFileSync(path.join(CARPETA, "resultado.json"), JSON.stringify(R, null, 1));
    fs.writeFileSync(path.join(__dirname, "..", "..", "docs", "RETROPRUEBA_MENOR_CUANTIA.md"), informe(R, fecha) + "\n");
    process.stderr.write("escritos: scripts/base_obra/retroprueba/resultado.json y docs/RETROPRUEBA_MENOR_CUANTIA.md\n");
  }
}

if (require.main === module) main().catch((e) => { process.stderr.write(`FALLO: ${e.stack || e.message}\n`); process.exit(1); });
module.exports = { puestoEntre, puestosPorMetodo, filaDeIndice, propuestaDetekta, evaluarCaso, entidadCompleta, evaluarValle, retroprueba, informe, ESCENARIOS_COSTO, AIU, PLAZO_MESES, PO_SINTETICO, CONTROLES_PCT };
