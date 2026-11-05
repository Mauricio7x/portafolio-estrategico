/* ============================================================================
   lib/secop1 · Los procesos de obra que SECOP I tiene convocados (5-nov-2026)
   ----------------------------------------------------------------------------
   POR QUÉ. La fase 0 del plan «Detekta a otro nivel» (5-nov-2026, docs/MEMORIA.md)
   midió en f789-7hwg («SECOP I - Procesos de Compra Pública») 1.915 procesos de
   obra competitivos en 90 días frente a 2.298 portafolios de SECOP II: SECOP I es
   el 45 % de la suma, sobre todo alcaldías pequeñas (Nariño, Cauca, Chocó…).
   Detekta solo leía SECOP II.

   POR QUÉ CONSULTA EN VIVO Y NO SE GUARDA. Meterlo en el corpus costaría espacio
   y ancho de banda de Upstash cada día, y f789-7hwg no publica la fecha de cierre:
   las cuentas de la lista («días para cerrar», la manifestación) no tendrían con
   qué hacerse. Se consulta a pedido, por departamento, y se dice tal cual: lo que
   se publicó, cuándo y el enlace al proceso. Sin cifra que decida.

   QUÉ ES «CONVOCADO». El estado de SECOP I de un proceso publicado que todavía no
   se adjudica. Como la fuente no trae el cierre, puede estar cerrado ya: se dice.
   La modalidad competitiva es la MISMA regla de la lista (lib/filtros.modalidad_
   competitiva), llamada, no copiada.

   Función de red con `fetchImpl` inyectable (patrón de lib/contratos_en_ejecucion).
   ========================================================================== */
"use strict";

const { crearCliente, escSoQL } = require("./socrata.js");
const { hoyColombia } = require("./habiles.js");

const DATASET = "f789-7hwg";
const BASE = () => process.env.SECOP1_BASE_URL || `https://www.datos.gov.co/resource/${DATASET}.json`;
const DIAS_ATRAS = 60;
const MAX_FILAS = 400;
const TIEMPO_MAX_MS = parseInt(process.env.SECOP1_TIEMPO_MS, 10) || 12000;
const MAX_DEPARTAMENTOS = 6;
const DIA_MS = 86400e3;
/* el enlace se acepta SOLO del portal de SECOP I: un enlace de otro dominio no se pinta */
const URL_SECOP1_RE = /^https:\/\/(?:www\.)?contratos\.gov\.co\//;

const texto = (v) => String(v == null ? "" : v).trim();
function conTiempo(promesa, ms) {
  let t;
  return Promise.race([promesa, new Promise((_, no) => { t = setTimeout(() => no(new Error(`sin respuesta en ${ms} ms`)), ms); })]).finally(() => clearTimeout(t));
}

/* `departamentos`: los NOMBRES como los escribe la aplicación (public/filtros.DEPARTAMENTOS, con tildes: «Nariño»),
   que son los de `departamento_entidad` en f789-7hwg (medido el 5-nov-2026). */
async function convocadosSecopI({ departamentos = [], fetchImpl, log = () => {}, ahora = Date.now(), tiempoMs = TIEMPO_MAX_MS } = {}) {
  const deps = [...new Set((Array.isArray(departamentos) ? departamentos : []).map(texto).filter(Boolean))].slice(0, MAX_DEPARTAMENTOS);
  if (!deps.length) return { ok: false, motivo: "Elija uno o más departamentos en los filtros para buscar también en SECOP I." };
  const hoy = hoyColombia(ahora);
  const desde = new Date(Date.parse(`${hoy}T12:00:00Z`) - DIAS_ATRAS * DIA_MS).toISOString().slice(0, 10);
  let filas;
  try {
    const c = crearCliente({ baseUrl: BASE(), fetchImpl, log });
    filas = await conTiempo(c.pedir({
      "$select": "numero_de_constancia,nombre_entidad,departamento_entidad,municipio_entidad,modalidad_de_contratacion,cuantia_proceso,fecha_de_cargue_en_el_secop,detalle_del_objeto_a_contratar,ruta_proceso_en_secop_i",
      "$where": `tipo_de_contrato='Obra' AND estado_del_proceso='Convocado' AND fecha_de_cargue_en_el_secop >= '${desde}T00:00:00' AND departamento_entidad in (${deps.map((d) => `'${escSoQL(d)}'`).join(",")})`,
      "$order": "fecha_de_cargue_en_el_secop DESC", "$limit": String(MAX_FILAS),
    }, "procesos convocados en SECOP I", { plazoMs: tiempoMs }), tiempoMs);
  } catch (e) {
    log(`secop1: ${e && e.message}`);
    return { ok: false, motivo: `No se pudo consultar SECOP I en datos.gov.co: ${String((e && e.message) || e).slice(0, 200)}` };
  }
  if (!Array.isArray(filas)) return { ok: false, motivo: "datos.gov.co respondió algo que no es una lista de procesos." };
  const { modalidad_competitiva } = require("./filtros.js");
  const vistos = new Set();
  const procesos = [];
  let noCompetitivos = 0;
  for (const f of filas) {
    const id = texto(f.numero_de_constancia);
    if (!id || vistos.has(id)) continue;
    vistos.add(id);
    if (!modalidad_competitiva({ modalidad_de_contratacion: f.modalidad_de_contratacion })) { noCompetitivos++; continue; }
    const cuantia = Number(f.cuantia_proceso);
    const url = f.ruta_proceso_en_secop_i && typeof f.ruta_proceso_en_secop_i === "object" ? texto(f.ruta_proceso_en_secop_i.url) : texto(f.ruta_proceso_en_secop_i);
    const objeto = texto(f.detalle_del_objeto_a_contratar);
    procesos.push({
      constancia: id,
      entidad: texto(f.nombre_entidad) || null,
      departamento: texto(f.departamento_entidad) || null,
      municipio: texto(f.municipio_entidad) || null,
      modalidad: texto(f.modalidad_de_contratacion) || null,
      // 0 o ilegible = sin dato, nunca «$0»
      cuantia_cop: Number.isFinite(cuantia) && cuantia > 0 ? Math.round(cuantia) : null,
      publicado: texto(f.fecha_de_cargue_en_el_secop).slice(0, 10) || null,
      objeto: objeto ? objeto.slice(0, 400) : null,
      url: URL_SECOP1_RE.test(url) ? url : null,
    });
  }
  return { ok: true, fuente: DATASET, departamentos: deps, desde, procesos, no_competitivos: noCompetitivos, truncado: filas.length >= MAX_FILAS, consultado_el: new Date(ahora).toISOString() };
}

module.exports = { convocadosSecopI, DATASET, DIAS_ATRAS, MAX_FILAS, MAX_DEPARTAMENTOS };
