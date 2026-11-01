/* ============================================================================
   lib/apu/referencia_entidades · Lo que presupuestaron las entidades por ítem, en los procesos guardados (1-nov-2026)
   ----------------------------------------------------------------------------
   Encargo del dueño (1-nov-2026), tras el estudio de la competencia: Licitarus
   ya enseña «a qué precio unitario lo calculó la entidad» leyendo el
   presupuesto oficial de los procesos. Detekta YA guarda esos renglones: cada
   Formulario 1 en Excel que pasa la puerta queda bajo `pliego:{id}:f1:{doc}`
   (lib/handlers/pliego/documentos, 90 días). Faltaba juntarlos por ítem.

   DECISIONES DEL DUEÑO (1-nov-2026, preguntadas antes de tocar código):
   · Es una REFERENCIA AL LADO del ítem. NO entra en la cascada de precios
     (lib/apu/precios) y NO cambia ninguna cifra del presupuesto: el nivel 2
     «pliego» de la cascada sigue declarando «no disponible», porque lo que
     aquí se junta es lo que ESTIMÓ cada entidad, no lo que cuesta ejecutar ni
     lo que se adjudicó. Un techo de la entidad leído como costo es el error de
     categoría del retail y del FFIE.
   · Se enseña con TRES procesos distintos o más (`MINIMO_PROCESOS`). Con menos
     se dice cuántos hay y no se da cifra.

   Reglas que no hay que re-aprender:
   · UNA OBSERVACIÓN POR PROCESO. Un Formulario con el mismo ítem en tres
     capítulos no son tres entidades: dentro del proceso se toma la mediana de
     sus renglones y el proceso cuenta una vez. Sin esto, un solo pliego largo
     «llegaba» al mínimo él solo.
   · EL MAPEO VA CON LA REGLA QUE YA EXISTE (`lib/apu_mapeo.mapearItem`) y SOLO
     el nivel «firme». Un «revisar» es un casado dudoso: en precios el falso
     caro es el POSITIVO (CLAUDE.md), así que ante la duda el renglón no entra.
   · LA UNIDAD NO SE CONVIERTE NUNCA (la regla de lib/apu_mapeo): el renglón
     entra solo si su unidad canónica (`apu_pliego.unidadCanonica`) es la MISMA
     que la del ítem que se consulta. Una unidad ilegible no casa con nada.
   · LA MEDIANA ES LA ÚNICA DE LA APLICACIÓN (`lib/estadistica`).
   · «Sin dato» ≠ 0: un precio no finito o ≤ 0 no entra; una referencia sin
     procesos suficientes es `hay: false` con su motivo, jamás un 0.
   · El proceso que se está cotizando se EXCLUYE si se sabe cuál es: su propio
     unitario ya lo compara la validación 8 (lib/formulario1), y contarlo aquí
     sería compararse consigo mismo.

   Este módulo es PURO (ni red ni Redis). La lectura de los Formularios vive en
   lib/handlers/apu/editor (acción `calcular`, solo con credencial).
   ========================================================================== */
"use strict";

const { mediana } = require("../estadistica.js");
const { unidadCanonica } = require("../apu_pliego.js");
const { mapearItem } = require("../apu_mapeo.js");

const MINIMO_PROCESOS = 3;      // decisión del dueño, 1-nov-2026
/* TOPE DE RENGLONES MAPEADOS. `mapearItem` puntúa el catálogo COMPLETO por
   renglón (~1 ms × ítems del catálogo, medido en lib/apu_mapeo): doscientos
   procesos guardados con Formularios largos se comerían el reloj de la función.
   Lo que pase del tope no se mapea y SE DICE en `recortado`. */
const MAX_RENGLONES = 6000;

const finitoPositivo = (v) => typeof v === "number" && Number.isFinite(v) && v > 0;
const clave = (itemId, unidad) => `${itemId}|${unidad}`;

/** Los renglones utilizables de UN Formulario guardado: descripción, unidad
    canónica y precio unitario del archivo. Lo ilegible se cuenta, no se rellena. */
function renglonesDeFormulario(f1) {
  const filas = f1 && Array.isArray(f1.filas) ? f1.filas : [];
  const out = [];
  let descartados = 0;
  for (const f of filas) {
    const descripcion = f && typeof f.descripcion === "string" ? f.descripcion.trim() : "";
    const unidad = f ? unidadCanonica(f.unidad) : null;
    const precio = f ? f.precio_archivo : null;
    if (!descripcion || !unidad || !finitoPositivo(precio)) { descartados++; continue; }
    out.push({ descripcion, unidad, precio });
  }
  return { renglones: out, descartados };
}

/**
 * Junta los Formularios en un índice por (ítem del catálogo, unidad).
 * @param {Array} formularios [{ id_proceso, documento, f1 }]: un elemento por proceso
 * @param {object} opciones   { mapear } inyectable en las pruebas; por defecto `mapearItem`
 * @returns {{ claves: Object<string, Array<{id_proceso, documento, precio, renglones}>>,
 *             procesos_con_formulario, renglones_leidos, renglones_descartados,
 *             renglones_firmes, recortado }}
 */
function construirIndice(formularios, { mapear = mapearItem } = {}) {
  const claves = Object.create(null);
  let leidos = 0, descartados = 0, firmes = 0, recortado = false;
  const procesos = new Set();
  for (const x of Array.isArray(formularios) ? formularios : []) {
    if (!x || !x.id_proceso || !x.f1) continue;
    const { renglones, descartados: d } = renglonesDeFormulario(x.f1);
    descartados += d;
    if (!renglones.length) continue;
    procesos.add(x.id_proceso);
    const porClave = Object.create(null);
    for (const r of renglones) {
      if (leidos >= MAX_RENGLONES) { recortado = true; break; }
      leidos++;
      const m = mapear({ descripcion_original: r.descripcion, unidad: r.unidad });
      if (!m || m.nivel !== "firme" || !m.item_id) continue;
      firmes++;
      const k = clave(m.item_id, r.unidad);
      (porClave[k] = porClave[k] || []).push(r.precio);
    }
    for (const [k, precios] of Object.entries(porClave)) {
      (claves[k] = claves[k] || []).push({
        id_proceso: x.id_proceso, documento: x.documento || null,
        precio: mediana(precios), renglones: precios.length,
      });
    }
    if (recortado) break;
  }
  return {
    claves, procesos_con_formulario: procesos.size,
    renglones_leidos: leidos, renglones_descartados: descartados,
    renglones_firmes: firmes, recortado,
  };
}

/**
 * La referencia de UN ítem. `unidad` es la del ítem tal como viene del pliego
 * o del editor; se canoniza aquí con la misma regla que los renglones.
 * @returns {{hay:true, precio, desde, hasta, procesos, ids, unidad}}
 *        | {{hay:false, procesos, motivo}}
 */
function referenciaDe(indice, itemId, unidad, { excluir = null, minimo = MINIMO_PROCESOS } = {}) {
  const u = unidadCanonica(unidad);
  if (!indice || !itemId) return { hay: false, procesos: 0, motivo: "el ítem no está en el catálogo: no se puede comparar con otros presupuestos" };
  if (!u) return { hay: false, procesos: 0, motivo: "la unidad del ítem no se reconoce: no se compara con otra" };
  const obs = (indice.claves[clave(itemId, u)] || []).filter((o) => o.id_proceso !== excluir && finitoPositivo(o.precio));
  if (obs.length < minimo) {
    return {
      hay: false, procesos: obs.length,
      motivo: obs.length
        ? `solo ${obs.length} de sus procesos guardados ${obs.length === 1 ? "trae" : "traen"} este ítem en ${u}; hacen falta ${minimo}`
        : `ninguno de sus procesos guardados trae este ítem en ${u}`,
    };
  }
  const precios = obs.map((o) => o.precio);
  return {
    hay: true, unidad: u,
    precio: mediana(precios),
    desde: Math.min(...precios), hasta: Math.max(...precios),
    procesos: obs.length,
    ids: obs.map((o) => o.id_proceso),
  };
}

/** El formulario que vale de un proceso: el último publicable leído con las
    reglas vigentes. `formularios` = `docs.formularios` de lib/documentos_proceso;
    `vigente` = `formularioVigente`. Devuelve el id del documento o null. */
function formularioDelProceso(formularios, vigente) {
  const lista = Object.entries(formularios && typeof formularios === "object" ? formularios : {})
    .filter(([, f]) => f && f.publicable === true && (typeof vigente !== "function" || vigente(f)));
  if (!lista.length) return null;
  lista.sort(([ia, a], [ib, b]) => String(b.fecha_carga || "").localeCompare(String(a.fecha_carga || "")) || String(ib).localeCompare(String(ia)));
  return lista[0][0];
}

module.exports = { MINIMO_PROCESOS, MAX_RENGLONES, renglonesDeFormulario, construirIndice, referenciaDe, formularioDelProceso };
