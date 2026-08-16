/* ============================================================================
   lib/ejecucion · Cómo EJECUTA sus contratos de obra una entidad (jbjy-vk9h)
   ----------------------------------------------------------------------------
   El corpus (p6dx-8zbt) termina en la adjudicación. Lo que pasa DESPUÉS —si el
   contrato se prorroga, se suspende, se modifica, si la entidad registra
   pagos— vive en `jbjy-vk9h` (SECOP II Contratos Electrónicos, verificado en
   docs/datos.md §5.2). Es el Cap. 11 del manual hecho dato: «el Estado paga
   tarde» y «la prórroga no tiene tope» pesan en el flujo de caja y en el due
   diligence de la entidad, no en el techo de precio (esa es la baja, que ya
   calcula lib/indice_baja desde p6dx y NO se duplica aquí).

   Decisiones (medidas en vivo el 16-ago-2026, obra firmada desde 2024):
   · Se consulta por `nit_entidad` y tipo «Obra» en la ventana de 2 años y se
     FILTRA por nombre canónico de la entidad: los NIT se comparten entre
     regionales y matrices (lección de identidad de ago 2026). Si el NIT solo
     aparece bajo OTROS nombres, no se atribuyen sus contratos: se dicen los
     nombres y no hay cifras.
   · `valor_pagado` es SIN DATO para media Colombia: solo 845 de 1 752 entidades
     registran algún pago; incluso en «terminado» solo el 64 % lo trae. Un 0
     ahí es «no lo registra», no «no ha pagado» (la regla de anticipo_pct = 0).
     Los pagos se publican SOLO cuando la entidad registra alguno, con su base.
   · `dias_adicionados` sí está poblado (75 % de los «Modificado») → prórrogas:
     cuántos contratos las tuvieron y la mediana de días. `estado_contrato` da
     el reparto (Modificado · En ejecución · terminado · Suspendido · Cerrado…).
   · No hay adición de VALOR en el dataset (`valor_del_contrato` es el vigente,
     sin el original): no se inventa.
   · Best-effort con TIEMPO ACOTADO y sin lanzar, como lib/proponentes.
   ========================================================================== */
"use strict";

const { crearCliente, escSoQL } = require("./socrata.js");

const DATASET = "jbjy-vk9h";
const BASE = () => process.env.EJECUCION_BASE_URL || `https://www.datos.gov.co/resource/${DATASET}.json`;
const VENTANA_MESES = 24;
const MAX_FILAS = 1000;
const TIEMPO_MAX_MS = parseInt(process.env.EJECUCION_TIEMPO_MS, 10) || 6000;

const claveNombre = (s) => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "")
  .toUpperCase().replace(/[^A-Z0-9]+/g, " ").trim();
const num = (v) => { if (v == null || v === "") return null; const n = Number(v); return Number.isFinite(n) ? n : null; };
const red = (n) => Math.round(n * 100) / 100;
const medianaDe = (a) => { const o = [...a].sort((x, y) => x - y); const m = Math.floor(o.length / 2); return o.length ? (o.length % 2 ? o[m] : (o[m - 1] + o[m]) / 2) : null; };

function conTiempo(promesa, ms) {
  let timer;
  const reloj = new Promise((_, rechazar) => { timer = setTimeout(() => rechazar(new Error(`tiempo agotado (${ms} ms)`)), ms); });
  return Promise.race([promesa, reloj]).finally(() => clearTimeout(timer));
}

/* Fecha de corte de la ventana, en hora Colombia (UTC-5) y como YYYY-MM-DD:
   `fecha_de_firma` es un calendar_date sin hora. `ahora` se inyecta en pruebas. */
function desdeVentana(ahora = Date.now()) {
  const d = new Date(ahora - 5 * 3600e3);
  d.setUTCMonth(d.getUTCMonth() - VENTANA_MESES);
  return d.toISOString().slice(0, 10);
}

/* Agrega la ejecución sobre filas YA filtradas por entidad. Puro: sin red. */
function agregarEjecucion(filas) {
  const contratos = filas.length;
  const estados = {};
  const dias = [];
  let valorContratado = 0, conValor = 0, suspendidos = 0, modificados = 0;
  const procesos = new Set();
  let conPago = 0, sumaPagoTerminados = 0, sumaContratoTerminados = 0, terminadosConPago = 0;
  for (const f of filas) {
    const est = String(f.estado_contrato || "").trim() || "sin estado";
    estados[est] = (estados[est] || 0) + 1;
    if (/suspend/i.test(est)) suspendidos++;
    if (/modific/i.test(est)) modificados++;
    if (f.proceso_de_compra) procesos.add(String(f.proceso_de_compra));
    const v = num(f.valor_del_contrato);
    if (v != null && v > 0) { valorContratado += v; conValor++; }
    const d = num(f.dias_adicionados);
    if (d != null && d > 0) dias.push(d);
    const pagado = num(f.valor_pagado);
    if (pagado != null && pagado > 0) {
      conPago++;
      if (/terminad|cerrad/i.test(est) && v != null && v > 0) { terminadosConPago++; sumaPagoTerminados += pagado; sumaContratoTerminados += v; }
    }
  }
  const pct = (n) => (contratos ? Math.round((n / contratos) * 100) : null);
  return {
    contratos,
    procesos_distintos: procesos.size,
    valor_contratado_cop: conValor ? Math.round(valorContratado) : null,
    contratos_con_valor: conValor,
    prorrogas: {
      contratos: dias.length,
      pct: pct(dias.length),
      mediana_dias: dias.length ? medianaDe(dias) : null,
      max_dias: dias.length ? Math.max(...dias) : null,
    },
    modificados: { contratos: modificados, pct: pct(modificados) },
    suspendidos: { contratos: suspendidos, pct: pct(suspendidos) },
    estados,
    /* Los pagos SOLO se afirman cuando la entidad registra alguno; el 0 del
       dataset es «no lo registra», no «no ha pagado». */
    pagos: conPago === 0
      ? { registra: false, contratos_con_pago: 0, nota: "La entidad no registra pagos en SECOP II para estos contratos: sin dato (un 0 en el dataset no significa que no haya pagado)." }
      : {
        registra: true, contratos_con_pago: conPago,
        terminados_con_pago: terminadosConPago,
        pct_pagado_de_terminados: terminadosConPago && sumaContratoTerminados > 0 ? Math.round((sumaPagoTerminados / sumaContratoTerminados) * 100) : null,
        nota: "Sobre los contratos terminados o cerrados CON pago registrado; los demás no dicen nada del pago.",
      },
  };
}

function frase(a, desde) {
  if (!a.contratos) return null;
  const partes = [`${a.contratos} contratos de obra firmados desde ${desde}`];
  if (a.prorrogas.contratos) partes.push(`${a.prorrogas.contratos} (${a.prorrogas.pct} %) tuvieron prórroga, mediana ${a.prorrogas.mediana_dias} días`);
  else partes.push("ninguno registra prórroga");
  if (a.suspendidos.contratos) partes.push(`${a.suspendidos.contratos} suspendidos`);
  partes.push(a.pagos.registra
    ? (a.pagos.pct_pagado_de_terminados != null ? `de los terminados con pago registrado lleva pagado el ${a.pagos.pct_pagado_de_terminados} %` : `registra pagos en ${a.pagos.contratos_con_pago}`)
    : "no registra pagos en SECOP II (sin dato)");
  return partes.join(" · ") + ".";
}

/* `entidad`: {nit, nombre}. Devuelve SIEMPRE un objeto; nunca lanza. */
async function ejecucionDeEntidad(entidad, { fetchImpl, log = () => {}, tiempoMs = TIEMPO_MAX_MS, ahora = Date.now() } = {}) {
  const nit = String((entidad && entidad.nit) || "").replace(/\D/g, "");
  const nombre = String((entidad && entidad.nombre) || "").trim();
  const desde = desdeVentana(ahora);
  const base = {
    ok: false, fuente: DATASET, ventana: { desde, meses: VENTANA_MESES }, nit_consultado: nit || null,
    contratos: null, motivo: null, otros_nombres_con_este_nit: [],
    lectura: "Cómo ejecuta esta entidad sus contratos de obra ya firmados: prórrogas, suspensiones y pagos registrados en SECOP II. Es el flujo de caja del Cap. 11 (el Estado paga tarde), no el precio.",
  };
  if (!nit) return { ...base, motivo: "la entidad no tiene NIT en el corpus: no se puede consultar" };
  if (!nombre) return { ...base, motivo: "sin nombre de entidad para confirmar la identidad del NIT" };
  const cliente = crearCliente({ baseUrl: BASE(), fetchImpl, log });
  try {
    const filas = await conTiempo(cliente.pedir({
      "$select": "id_contrato,proceso_de_compra,nombre_entidad,estado_contrato,valor_del_contrato,valor_pagado,valor_facturado,dias_adicionados,fecha_de_firma,fecha_de_fin_del_contrato",
      "$where": `nit_entidad='${escSoQL(nit)}' AND tipo_de_contrato='Obra' AND fecha_de_firma >= '${desde}'`,
      "$order": "fecha_de_firma desc", "$limit": String(MAX_FILAS),
    }, "contratos de la entidad"), tiempoMs);
    const objetivo = claveNombre(nombre);
    const propias = [], otros = new Map();
    for (const f of filas || []) {
      const n = String(f.nombre_entidad || "").trim();
      if (claveNombre(n) === objetivo) propias.push(f);
      else if (n) otros.set(n, (otros.get(n) || 0) + 1);
    }
    const otrosNombres = [...otros.entries()].sort((a, b) => b[1] - a[1]).map(([n]) => n).slice(0, 5);
    const agregado = agregarEjecucion(propias);
    return {
      ...base, ok: true, ...agregado,
      truncado: (filas || []).length >= MAX_FILAS,
      otros_nombres_con_este_nit: otrosNombres,
      motivo: !propias.length
        ? (otrosNombres.length
          ? `el NIT ${nit} solo aparece en el dataset bajo otros nombres (${otrosNombres.join(" · ")}): no se atribuyen esos contratos a esta entidad`
          : "sin contratos de obra de esta entidad en la ventana")
        : null,
      frase: frase(agregado, desde),
    };
  } catch (e) {
    log(`ejecucion: ${e && e.message}`);
    return { ...base, motivo: `no se pudo consultar ${DATASET}: ${String((e && e.message) || e)}` };
  }
}

module.exports = { ejecucionDeEntidad, agregarEjecucion, desdeVentana, DATASET, VENTANA_MESES };
