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
   · Se enseña con TRES obras distintas o más (`MINIMO_PROCESOS`). Con menos
     se dice cuántas hay y no se da cifra.

   Reglas que no hay que re-aprender:
   · LOS DOS LADOS SE CASAN CON LA MISMA REGLA (revisión adversaria del
     1-nov-2026). La primera versión buscaba el `item_id` del editor, que es un
     código de los bancos de precios (INV-, INVIAS:, IDU:, EPC:…), en un índice
     armado con los códigos del lector de pliegos (LOC-…): no hay un solo código
     en común («0 de 93», medido en public/app.js), así que la referencia NO
     aparecía nunca y el servidor decía «ninguno de sus procesos trae este
     ítem» sobre procesos que sí lo traían. Ahora el renglón del Formulario y el
     ítem del editor pasan por `lib/apu_mapeo.mapearItem` sobre SU DESCRIPCIÓN y
     su unidad canónica, y solo cuenta el casado «firme» en los dos lados.
   · UNA OBSERVACIÓN POR OBRA. Un Formulario con el mismo ítem en tres
     capítulos no son tres entidades: dentro del proceso se toma la mediana de
     sus renglones. Y dos publicaciones de la MISMA obra (otro número de proceso
     del mismo portafolio con el mismo objeto) son una sola: se agrupan con la
     regla del listado (`lib/filtros.agruparVersionesDeObra`), no con otra.
   · Ante la duda el renglón NO entra: en precios el falso caro es el POSITIVO
     (CLAUDE.md). Un «revisar» es un casado dudoso.
   · LA UNIDAD NO SE CONVIERTE NUNCA (la regla de lib/apu_mapeo): mismo ítem en
     otra unidad canónica (`apu_pliego.unidadCanonica`) es otra clave. Una
     unidad ilegible no casa con nada.
   · LA MEDIANA ES LA ÚNICA DE LA APLICACIÓN (`lib/estadistica`).
   · «Sin dato» ≠ 0: un precio no finito o ≤ 0 no entra; una referencia sin
     obras suficientes es `hay: false` con su motivo, jamás un 0.
   · El proceso que se está cotizando se EXCLUYE si se sabe cuál es, y con él
     su obra: su propio unitario ya lo compara la validación 8 (lib/formulario1).
     El número se compara sin distinguir mayúsculas: el campo lo escribe el usuario.
   · EL TIEMPO SE PAGA UNA VEZ: `mapearItem` puntúa el catálogo completo por
     renglón (1,23 ms medidos). Lo mapeado se recuerda por texto y unidad, y lo
     que no cabe en el tope de una consulta (`MAX_RENGLONES`) queda PENDIENTE y
     se DICE: la siguiente consulta sigue donde quedó esta.

   Este módulo no toca la red: la lectura de Redis la inyecta quien llama
   (lib/handlers/apu/editor, acción `calcular`, solo con credencial).
   ========================================================================== */
"use strict";

const { mediana } = require("../estadistica.js");
const { unidadCanonica } = require("../apu_pliego.js");
const { mapearItem, MAX_FILAS_MAPEO } = require("../apu_mapeo.js");

const MINIMO_PROCESOS = 3;      // decisión del dueño, 1-nov-2026
/* RENGLONES NUEVOS QUE SE MAPEAN EN UNA CONSULTA. A 1,23 ms por renglón, 3.000
   son unos 3,7 s en el peor caso, y solo la primera vez: lo mapeado se recuerda.
   Lo que no cabe queda pendiente y se dice. */
const MAX_RENGLONES = 3000;
/* y por Formulario, el tope que ya tiene el lector para una tabla (lib/apu_mapeo) */
const MAX_RENGLONES_PROCESO = MAX_FILAS_MAPEO;

const finitoPositivo = (v) => typeof v === "number" && Number.isFinite(v) && v > 0;
const clave = (itemId, unidad) => `${itemId}|${unidad}`;
const mayus = (s) => String(s == null ? "" : s).trim().toUpperCase();

/* LO MAPEADO SE RECUERDA por texto y unidad: el resultado de `mapearItem` solo
   depende de esas dos cosas (sin tipologías). Con tope, para no crecer sin fin. */
const MAX_MEMO = 20000;
const memo = new Map();
function casadoFirme(descripcion, unidad, mapear) {
  const usar = typeof mapear === "function" ? mapear : mapearItem;
  if (usar !== mapearItem) {
    const m = usar({ descripcion_original: descripcion, unidad });
    return m && m.nivel === "firme" && m.item_id ? m.item_id : null;
  }
  const k = `${descripcion}\u0000${unidad}`;
  if (memo.has(k)) return memo.get(k);
  const m = mapearItem({ descripcion_original: descripcion, unidad });
  const id = m && m.nivel === "firme" && m.item_id ? m.item_id : null;
  if (memo.size >= MAX_MEMO) memo.clear();
  memo.set(k, id);
  return id;
}

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

/** Las observaciones de UN Formulario: por (ítem, unidad), la mediana de sus
    renglones casados en firme. No depende del perfil: es el contenido del archivo. */
function observacionesDeFormulario(f1, { mapear = mapearItem } = {}) {
  const { renglones, descartados } = renglonesDeFormulario(f1);
  const usados = renglones.slice(0, MAX_RENGLONES_PROCESO);
  const porClave = Object.create(null);
  let firmes = 0;
  for (const r of usados) {
    const id = casadoFirme(r.descripcion, r.unidad, mapear);
    if (!id) continue;
    firmes++;
    const k = clave(id, r.unidad);
    (porClave[k] = porClave[k] || []).push(r.precio);
  }
  const claves = Object.create(null);
  for (const [k, precios] of Object.entries(porClave)) claves[k] = { precio: mediana(precios), renglones: precios.length };
  return { claves, leidos: usados.length, descartados, firmes, sin_mapear: renglones.length - usados.length };
}

/**
 * Las observaciones de los procesos, con lo ya mapeado recordado y un tope de
 * renglones nuevos por consulta.
 * @param {Array} lista  [{ id_proceso, firma }] (firma = qué Formulario y cuándo se leyó)
 * @param {object} o     { cache: Map firma→observaciones, leerF1s: async (tanda) → f1[] en el mismo orden,
 *                         mapear, maxRenglones, tanda }
 * @returns {{ porProceso: Map, pendientes: number, renglones_nuevos: number }}
 */
async function observacionesDeProcesos(lista, { cache = null, leerF1s, mapear = mapearItem, maxRenglones = MAX_RENGLONES, tanda = 25 } = {}) {
  const porProceso = new Map();
  const faltan = [];
  for (const p of Array.isArray(lista) ? lista : []) {
    const o = cache && p.firma ? cache.get(p.firma) : null;
    if (o) porProceso.set(p.id_proceso, o); else faltan.push(p);
  }
  let gastado = 0, pendientes = 0;
  for (let i = 0; i < faltan.length; i += tanda) {
    if (gastado >= maxRenglones) { pendientes += faltan.length - i; break; }
    const t = faltan.slice(i, i + tanda);
    const f1s = await leerF1s(t);
    for (let j = 0; j < t.length; j++) {
      if (gastado >= maxRenglones) { pendientes++; continue; }
      const f1 = Array.isArray(f1s) ? f1s[j] : null;
      if (!f1) continue;           // vencido o ilegible: sin observación (puede volver; no se recuerda)
      const o = observacionesDeFormulario(f1, { mapear });
      gastado += o.leidos;
      porProceso.set(t[j].id_proceso, o);
      if (cache && t[j].firma) cache.set(t[j].firma, o);
    }
  }
  return { porProceso, pendientes, renglones_nuevos: gastado };
}

/** Qué procesos guardados son la MISMA obra: la regla del listado
    (`lib/filtros.agruparVersionesDeObra`: mismo portafolio y mismo objeto).
    `guardados` = [{ id, portafolio, nombre }] → Map(ID en mayúsculas → obra). */
function obrasDe(guardados) {
  const filas = (Array.isArray(guardados) ? guardados : []).filter((g) => g && g.id)
    .map((g) => ({ id_del_proceso: mayus(g.id), id_del_portafolio: g.portafolio || "", nombre_del_procedimiento: g.nombre || "" }));
  let grupoDe = new Map();
  // require DIFERIDO: lib/filtros participa en ciclos que el repositorio resuelve así
  try { grupoDe = require("../filtros.js").agruparVersionesDeObra(filas).grupoDe; } catch { /* sin la regla, cada proceso es su obra */ }
  return new Map(filas.map((f) => [f.id_del_proceso, grupoDe.get(f) || f.id_del_proceso]));
}

/**
 * Junta las observaciones en un índice por (ítem del catálogo, unidad), UNA por obra.
 * @param {Array} procesos [{ id_proceso, obra?, obs }]
 * @param {object} extra   { pendientes }: procesos guardados que faltan por leer
 */
function construirIndice(procesos, { pendientes = 0 } = {}) {
  const porObra = new Map();
  let conFormulario = 0, leidos = 0, descartados = 0, firmes = 0, sinMapear = 0;
  for (const p of Array.isArray(procesos) ? procesos : []) {
    if (!p || !p.id_proceso || !p.obs) continue;
    leidos += p.obs.leidos; descartados += p.obs.descartados; firmes += p.obs.firmes; sinMapear += p.obs.sin_mapear || 0;
    if (!p.obs.leidos) continue;
    conFormulario++;
    const obra = mayus(p.obra || p.id_proceso);
    let e = porObra.get(obra);
    if (!e) porObra.set(obra, (e = Object.create(null)));
    for (const [k, o] of Object.entries(p.obs.claves)) (e[k] = e[k] || []).push({ id: String(p.id_proceso), precio: o.precio });
  }
  const claves = Object.create(null);
  for (const [obra, e] of porObra) {
    for (const [k, lista] of Object.entries(e)) {
      (claves[k] = claves[k] || []).push({ obra, ids: lista.map((x) => x.id), precio: mediana(lista.map((x) => x.precio)) });
    }
  }
  return {
    claves, procesos_con_formulario: conFormulario, obras_con_formulario: porObra.size,
    renglones_leidos: leidos, renglones_descartados: descartados, renglones_firmes: firmes, renglones_sin_mapear: sinMapear,
    pendientes, recortado: pendientes > 0 || sinMapear > 0,
  };
}

/** El ítem del catálogo de UN ítem del editor, con la MISMA regla que los renglones. */
function itemDelCatalogo(descripcion, unidad, { mapear = mapearItem } = {}) {
  const d = String(descripcion || "").trim();
  const u = unidadCanonica(unidad);
  if (!d || !u) return null;
  return casadoFirme(d, u, mapear);
}

/**
 * La referencia de UN ítem.
 * @param {object} indice   salida de construirIndice
 * @param {string} itemId   el ítem del catálogo (itemDelCatalogo), o null
 * @param {string} unidad   la del ítem, tal como viene; se canoniza aquí
 * @param {object} o        { excluir: número(s) de proceso u obra, minimo }
 * @returns {{hay:true, precio, desde, hasta, procesos, ids, unidad}} | {{hay:false, procesos, motivo}}
 */
function referenciaDe(indice, itemId, unidad, { excluir = null, minimo = MINIMO_PROCESOS } = {}) {
  const u = unidadCanonica(unidad);
  if (!u) return { hay: false, procesos: 0, motivo: "la unidad del ítem no se reconoce: no se compara con otra" };
  if (!indice || !itemId) return { hay: false, procesos: 0, motivo: "la descripción del ítem no casa con seguridad con un ítem del catálogo: no se compara con otros presupuestos" };
  const fuera = new Set((Array.isArray(excluir) ? excluir : [excluir]).map(mayus).filter(Boolean));
  const obs = (indice.claves[clave(itemId, u)] || [])
    .filter((o) => finitoPositivo(o.precio) && !fuera.has(o.obra) && !o.ids.some((id) => fuera.has(mayus(id))));
  if (obs.length < minimo) {
    const faltan = indice.pendientes > 0 ? ` (faltan por leer ${indice.pendientes} de sus procesos guardados)` : "";
    return {
      hay: false, procesos: obs.length,
      motivo: (obs.length
        ? `solo ${obs.length} de sus procesos guardados ${obs.length === 1 ? "trae" : "traen"} este ítem en ${u}; hacen falta ${minimo}`
        : `ninguno de sus procesos guardados leídos trae este ítem en ${u}`) + faltan,
    };
  }
  const precios = obs.map((o) => o.precio);
  return {
    hay: true, unidad: u,
    precio: mediana(precios),
    desde: Math.min(...precios), hasta: Math.max(...precios),
    procesos: obs.length,
    ids: obs.flatMap((o) => o.ids),
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

/** Vacía lo recordado (las pruebas). */
const olvidar = () => memo.clear();

module.exports = {
  MINIMO_PROCESOS, MAX_RENGLONES, MAX_RENGLONES_PROCESO,
  renglonesDeFormulario, observacionesDeFormulario, observacionesDeProcesos, obrasDe,
  construirIndice, itemDelCatalogo, referenciaDe, formularioDelProceso, olvidar,
};
