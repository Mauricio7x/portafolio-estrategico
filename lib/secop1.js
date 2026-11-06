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
const { norm } = require("./semantica.js");

const DATASET = "f789-7hwg";
const BASE = () => process.env.SECOP1_BASE_URL || `https://www.datos.gov.co/resource/${DATASET}.json`;
const DIAS_ATRAS = 60;
const MAX_FILAS = 400;
const TIEMPO_MAX_MS = parseInt(process.env.SECOP1_TIEMPO_MS, 10) || 12000;
const MAX_DEPARTAMENTOS = 6;
const DIA_MS = 86400e3;
/* el enlace se acepta SOLO del portal de SECOP I: un enlace de otro dominio no se pinta */
const URL_SECOP1_RE = /^https:\/\/(?:www\.)?contratos\.gov\.co\//;
/* LA VENTANA POR MODALIDAD (6-nov-2026, tarea 7; paso 7 del plan del 6-nov). f789-7hwg no publica el cierre, y un
   proceso sigue «Convocado» mucho después de cerrar: de las obras competitivas cargadas entre el 8 y el 22-ago-2026,
   el 6-nov seguían «Convocado» 28 de 111 de mínima cuantía, 17 de 129 de menor cuantía y 10 de 58 de licitación.
   Medido sobre f789-7hwg (tipo de contrato Obra, bajado el 6-nov-2026): entre las ya adjudicadas, celebradas o
   liquidadas de esa misma cohorte, días de la carga a la última actualización (la adjudicación es anterior o igual),
   percentil 90: mínima cuantía 22 días (80 procesos, mediana 8), menor cuantía 40 (105, mediana 27), licitación 58
   (45, mediana 38). La cohorte es la de los cargados hasta el 22-ago, con 76 días o más de seguimiento: con los 90
   días enteros salían 15, 36 y 57, sesgados hacia abajo porque los cargados hace poco todavía no podían tardar.
   Un proceso publicado hace más días que su ventana sale MARCADO, nunca escondido: «probablemente ya cerró» es una
   inferencia y la pantalla manda a confirmarlo. Sin ventana medida (subasta, concurso de méritos) no se marca nada:
   sin dato no es «abierto» ni «cerrado». */
const VENTANAS = Object.freeze([
  Object.freeze({ re: /\bminima\s+cuantia\b/, modalidad: "mínima cuantía", dias: 22 }),
  Object.freeze({ re: /\bmenor\s+cuantia\b/, modalidad: "menor cuantía", dias: 40 }),
  Object.freeze({ re: /\blicitacion\b/, modalidad: "licitación", dias: 58 }),
]);
function ventanaDe(modalidad) {
  const m = norm(String(modalidad || ""));
  const v = VENTANAS.find((x) => x.re.test(m));
  return v ? { modalidad: v.modalidad, dias: v.dias } : null;
}
/* días civiles entre la carga (AAAA-MM-DD) y hoy en Colombia; null sin fecha legible */
function diasDesde(fecha, hoy) {
  const a = Date.parse(`${fecha}T12:00:00Z`), b = Date.parse(`${hoy}T12:00:00Z`);
  return Number.isFinite(a) && Number.isFinite(b) ? Math.round((b - a) / DIA_MS) : null;
}

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
    const publicado = texto(f.fecha_de_cargue_en_el_secop).slice(0, 10) || null;
    const ventana = ventanaDe(f.modalidad_de_contratacion);
    const dias = publicado ? diasDesde(publicado, hoy) : null;
    procesos.push({
      constancia: id,
      entidad: texto(f.nombre_entidad) || null,
      departamento: texto(f.departamento_entidad) || null,
      municipio: texto(f.municipio_entidad) || null,
      modalidad: texto(f.modalidad_de_contratacion) || null,
      // 0 o ilegible = sin dato, nunca «$0»
      cuantia_cop: Number.isFinite(cuantia) && cuantia > 0 ? Math.round(cuantia) : null,
      publicado,
      objeto: objeto ? objeto.slice(0, 400) : null,
      url: URL_SECOP1_RE.test(url) ? url : null,
      dias_publicado: dias,
      // la ventana de su modalidad (null sin medir) y si ya la pasó (null sin ventana o sin fecha: sin dato)
      ventana_dias: ventana ? ventana.dias : null,
      ventana_modalidad: ventana ? ventana.modalidad : null,
      probablemente_cerro: ventana && dias != null ? dias > ventana.dias : null,
    });
  }
  // los que probablemente ya cerraron van DESPUÉS, en el mismo orden de fecha: abajo, no fuera
  const ordenados = [...procesos.filter((p) => p.probablemente_cerro !== true), ...procesos.filter((p) => p.probablemente_cerro === true)];
  return {
    ok: true, fuente: DATASET, departamentos: deps, desde, procesos: ordenados, no_competitivos: noCompetitivos,
    probablemente_cerrados: ordenados.filter((p) => p.probablemente_cerro === true).length,
    truncado: filas.length >= MAX_FILAS, consultado_el: new Date(ahora).toISOString(),
  };
}

module.exports = { convocadosSecopI, ventanaDe, VENTANAS, DATASET, DIAS_ATRAS, MAX_FILAS, MAX_DEPARTAMENTOS };
