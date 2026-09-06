/* ============================================================================
   lib/proponentes · Quiénes se PRESENTAN a los procesos de una entidad
   ----------------------------------------------------------------------------
   El corpus histórico (p6dx-8zbt) dice cuántos oferentes hubo y quién GANÓ; no
   dice quiénes se presentaron y perdieron. Eso vive en OTRO dataset de la misma
   Socrata: `hgi6-6wh3` (Proponentes por Proceso SECOP II, una fila por
   proponente y proceso, verificado en docs/datos.md §5.1: `id_procedimiento`
   == `id_del_proceso` del corpus; 0 filas para procesos ABIERTOS —los
   proponentes solo aparecen tras la apertura—; en adjudicados su conteo
   coincide 8/8 con `respuestas_al_procedimiento`).

   Qué responde: para una lista de ids de proceso (los de la entidad que YA
   están en el corpus histórico: obra compatible con los RUP, ya cerrados), los
   proponentes que más veces se presentaron, con su NIT cuando el dataset lo
   trae y la última vez que se presentaron. Es la Fase 3 pendiente «hgi6 en
   vivo: contra quién compite», acotada a lo que el dato permite: contra quién
   SE HA competido en esta entidad — el proceso abierto no tiene proponentes en
   ninguna fuente pública hasta la apertura.

   Decisiones:
   · Se filtra por `id_procedimiento in (...)`, NUNCA por NIT de la entidad:
     los NIT se comparten entre regionales y matrices (lección de identidad de
     ago 2026) y el nombre varía en puntuación. Los ids del corpus son exactos
     y además acotan al universo que importa (obra que la app enseña).
   · Consulta agrupada en el servidor de Socrata (`$group`), no se bajan las
     filas: una entidad grande tiene miles de proponente×proceso.
   · `nit_proveedor` llega como «No Definido» (el mismo literal-trampa que
     `nit_del_proveedor_adjudicado`): eso NO es un NIT ni un null → viaja `null`
     y `identificacion` lo dice.
   · Best-effort con TIEMPO ACOTADO: la vista de entidad no puede quedarse
     colgada de un tercero. Fallo o tiempo agotado → `{ok:false, motivo}` con
     el cuerpo del detalle intacto; nunca lanza.
   · Transporte reutilizado: `lib/socrata.crearCliente({baseUrl})`, como el
     PAA — un segundo cliente HTTP «equivalente hoy» diverge a la primera
     corrección aplicada a uno solo.
   ========================================================================== */
"use strict";

const { crearCliente, escSoQL } = require("./socrata.js");

const DATASET = "hgi6-6wh3";
const BASE = () => process.env.PROPONENTES_BASE_URL || `https://www.datos.gov.co/resource/${DATASET}.json`;
const MAX_IDS = 300;            // los más recientes; la URL sigue por debajo de ~8 KB
const TOP = 8;
const TIEMPO_MAX_MS = parseInt(process.env.PROPONENTES_TIEMPO_MS, 10) || 6000;
const RELLENOS_SIN_VALOR = new Set(["", "no definido", "null", "undefined", "n/a", "na", "-", "0"]);

const limpiarNit = (v) => {
  const s = String(v == null ? "" : v).trim();
  return RELLENOS_SIN_VALOR.has(s.toLowerCase()) ? null : s;
};

function conTiempo(promesa, ms) {
  let timer;
  const reloj = new Promise((_, rechazar) => { timer = setTimeout(() => rechazar(new Error(`tiempo agotado (${ms} ms)`)), ms); });
  return Promise.race([promesa, reloj]).finally(() => clearTimeout(timer));
}

/* `ids`: ids de proceso (`CO1.REQ.…`) del corpus histórico de la entidad, los
   más recientes primero. Devuelve SIEMPRE un objeto; nunca lanza. */
async function proponentesDeProcesos(ids, { fetchImpl, log = () => {}, top = TOP, tiempoMs = TIEMPO_MAX_MS } = {}) {
  const lista = [...new Set((ids || []).map((x) => String(x || "").trim()).filter(Boolean))].slice(0, MAX_IDS);
  const base = {
    ok: false, fuente: DATASET, procesos_consultados: lista.length,
    procesos_con_proponentes: null, proponentes_distintos: null, top: [], motivo: null,
    lectura: "Quiénes se han presentado a los procesos de esta entidad que están en el corpus (obra ya cerrada). Un proceso abierto no tiene proponentes en ninguna fuente pública hasta la apertura de ofertas.",
  };
  if (!lista.length) return { ...base, motivo: "sin procesos del corpus que consultar" };

  const cliente = crearCliente({ baseUrl: BASE(), fetchImpl, log });
  const where = `id_procedimiento in (${lista.map((id) => `'${escSoQL(id)}'`).join(",")})`;
  try {
    const [grupos, conteo] = await conTiempo(Promise.all([
      cliente.pedir({
        "$select": "proveedor,nit_proveedor,count(*) as veces,max(fecha_publicaci_n) as ultima",
        "$where": where, "$group": "proveedor,nit_proveedor", "$order": "veces desc,proveedor asc", "$limit": "500",
      }, "proponentes por proceso", { plazoMs: tiempoMs }),
      cliente.pedir({ "$select": "count(distinct id_procedimiento) as procesos", "$where": where }, "procesos con proponentes", { plazoMs: tiempoMs }),
    ]), tiempoMs);

    /* Un mismo proveedor puede llegar con dos grafías o con NIT y sin él:
       se agrupa por NIT cuando lo hay y por nombre normalizado si no. */
    const acumulado = new Map();
    for (const g of grupos || []) {
      const nombre = String(g.proveedor || "").trim();
      if (!nombre) continue;
      const nit = limpiarNit(g.nit_proveedor);
      const clave = nit ? `nit:${nit}` : `n:${nombre.toUpperCase().replace(/\s+/g, " ")}`;
      const veces = Number(g.veces);
      const a = acumulado.get(clave) || { nombre, nit, veces: 0, ultima: null };
      if (Number.isFinite(veces)) a.veces += veces;
      const u = g.ultima ? String(g.ultima).slice(0, 10) : null;
      if (u && (!a.ultima || u > a.ultima)) a.ultima = u;
      acumulado.set(clave, a);
    }
    const ordenados = [...acumulado.values()].sort((a, b) => b.veces - a.veces || a.nombre.localeCompare(b.nombre));
    const procesos = conteo && conteo[0] ? Number(conteo[0].procesos) : NaN;
    return {
      ...base, ok: true,
      procesos_con_proponentes: Number.isFinite(procesos) ? procesos : null,
      proponentes_distintos: ordenados.length,
      top: ordenados.slice(0, top).map((p) => ({
        nombre: p.nombre, nit: p.nit,
        identificacion: p.nit ? { tipo: "nit", valor: p.nit } : { tipo: "sin_nit", valor: null, nota: "el dataset publica «No Definido» en vez del NIT" },
        veces: p.veces, ultima_vez: p.ultima,
      })),
    };
  } catch (e) {
    log(`proponentes: ${e && e.message}`);
    return { ...base, motivo: `no se pudo consultar la lista de proponentes: ${String((e && e.message) || e)}` };
  }
}

module.exports = { proponentesDeProcesos, DATASET, MAX_IDS };
