/* ============================================================================
   lib/proyeccion · De fila cruda de Socrata a registro guardable
   ----------------------------------------------------------------------------
   Vivía dentro de api/sync.js; salió aquí porque ahora hay DOS consumidores
   (api/sync.js y api/sync/historico.js) y la proyección debe ser idéntica en
   ambos: el índice de competencia se calcula sobre lo que guarda uno y se
   aplica a lo que guarda el otro.

   Dos proyecciones, a propósito:

     ACTIVA (default)     lo que la app necesita para decidir a qué presentarse.
                          SIN datos de adjudicación: el corpus activo lo sirve
                          /api/oportunidades y ahí solo debe viajar el resumen
                          agregado de competencia, nunca adjudicatarios, NIT ni
                          valores adjudicados (requisito de seguridad).
     HISTÓRICA (conAdjudicacion:true)
                          la anterior + las columnas de adjudicación y de nº de
                          oferentes, que son la materia prima del índice. Solo
                          se escribe en licitaciones:historico:*.

   La cascada de filtros (modalidad competitiva → estado → objeto/RUP/
   anti-suministro) es la misma para los dos; cambia solo qué se conserva.
   ========================================================================== */
"use strict";

const { enriquecer } = require("./negocio.js");
const { compatibleConAlgunPerfil } = require("./rup.js");
const { modalidad_competitiva, estado_abierto } = require("./filtros.js");
const { CAMPOS_ADJUDICACION, oferentesDe, esAdjudicado } = require("./indice_competencia.js");

/* ---------- proyección activa: lo que la app necesita, nada más ---------- */
const CAMPOS = [
  ":id", ":updated_at",
  "id_del_proceso", "referencia_del_proceso", "nombre_del_procedimiento",
  "descripci_n_del_procedimiento", "entidad", "nit_entidad",
  "departamento_entidad", "ciudad_entidad", "modalidad_de_contratacion",
  "estado_del_procedimiento", "fase", "adjudicado", "fecha_de_publicacion_del", "precio_base",
  "duracion", "unidad_de_duracion", "codigo_principal_de_categoria",
  "categorias_adicionales", "tipo_de_contrato",
  // candidatas de anticipo declarado (lib/negocio.ANTICIPO_CAMPOS): p6dx-8zbt
  // no las trae HOY, pero si la fuente las añade no pueden morir en la
  // proyección — sin esto el anticipo declarado jamás llegaría a enriquecer()
  "porcentaje_de_anticipo", "anticipo_porcentaje", "porcentaje_anticipo", "pct_anticipo", "anticipo",
  "respuestas_al_procedimiento", "conteo_de_respuestas_a_ofertas", "proveedores_unicos_con",
];

/* Columnas que SOLO existen en el corpus histórico (lib/indice_competencia
   define la lista y su lectura). Se borran de cualquier registro que vaya al
   corpus activo — ver sinAdjudicacion(). */
const CAMPOS_SOLO_HISTORICO = [...new Set([...CAMPOS_ADJUDICACION, "oferentes", "fue_adjudicado"])]
  .filter((c) => !CAMPOS.includes(c));

function proyectar(fila, { conAdjudicacion = false } = {}) {
  const out = {};
  for (const c of CAMPOS) if (fila[c] !== undefined) out[c] = fila[c];
  if (conAdjudicacion) {
    for (const c of CAMPOS_ADJUDICACION) if (fila[c] !== undefined) out[c] = fila[c];
  }
  if (typeof out.descripci_n_del_procedimiento === "string" && out.descripci_n_del_procedimiento.length > 700) {
    out.descripci_n_del_procedimiento = out.descripci_n_del_procedimiento.slice(0, 700) + "…";
  }
  // urlproceso llega como objeto {url, description} desde Socrata
  const u = fila.urlproceso;
  out.urlproceso = (u && typeof u === "object" ? u.url : u) || null;
  // columnas de fecha de cierre: nombre no garantizado → conservar candidatas
  for (const k in fila) {
    if (out[k] === undefined && /fecha/i.test(k) && /(recep|cierre|l[ií]mit|plazo|apertura)/i.test(k)) out[k] = fila[k];
  }
  // clave de dedup: id de negocio primero (estable ante re-publicaciones que
  // regeneran los :id de Socrata), :id como respaldo
  out._k = fila.id_del_proceso || fila[":id"] || `${fila.fecha_de_publicacion_del}|${fila.referencia_del_proceso || ""}`;
  return out;
}

/* Copia sin NADA de adjudicación: lo que puede entrar al corpus activo (y, por
   defensa en profundidad, lo que /api/oportunidades sirve aunque el corpus
   traiga filas de una versión anterior). */
function sinAdjudicacion(registro) {
  const out = { ...registro };
  for (const c of CAMPOS_SOLO_HISTORICO) delete out[c];
  return out;
}

/* Derivados que solo tienen sentido en el histórico: dejan a la vista lo que el
   índice usará, sin obligar a re-extraer si mañana cambian las candidatas de
   columna (el índice re-deriva de las crudas y solo cae aquí como respaldo). */
function marcarHistorico(registro) {
  return { ...registro, oferentes: oferentesDe(registro), fue_adjudicado: esAdjudicado(registro) };
}

/* Cascada de filtros → enriquecimiento de negocio.
   conservarCerradas=true en el delta y en la extracción histórica: los cambios
   a estado cerrado deben guardarse para REEMPLAZAR (dedup por :updated_at) la
   versión abierta previa, y el histórico vive precisamente de los cerrados.
   Limitación asumida en el delta: si a un proceso YA guardado le muta la
   modalidad o el objeto hacia algo inválido (rarísimo en SECOP II: la modalidad
   es identidad del proceso y el objeto solo cambia por adenda), se descarta y
   la versión vieja persiste hasta la full de higiene mensual. */
function transformar(filas, { conservarCerradas = false, conAdjudicacion = false } = {}) {
  const out = [];
  for (const fila of filas) {
    const f = proyectar(fila, { conAdjudicacion });
    if (!modalidad_competitiva(f)) continue;                 // sin competencia, fuera
    if (!conservarCerradas && !estado_abierto(f)) continue;   // full: cerrados fuera de origen
    if (!compatibleConAlgunPerfil(f)) continue;               // objeto/RUP/anti-suministro
    const r = enriquecer(f);
    out.push(conAdjudicacion ? marcarHistorico(r) : r);
  }
  return out;
}

/* Reparto del DELTA en una sola pasada.
   · activo    TODO lo válido, con proyección activa. Los ya cerrados entran
     también aquí a propósito: su :updated_at más reciente REEMPLAZA en lectura
     a la versión abierta guardada (si no, quedaría congelada como abierta para
     siempre). La compactación del mes y la full de higiene los retiran después.
   · historico SOLO los cerrados, con proyección completa. Ahí es donde el
     proceso «se muda»: con adjudicatario, valor y nº de oferentes, para no
     volver a perder el dato histórico cuando el activo se purgue. */
function repartirDelta(filas) {
  const activo = [], historico = [];
  for (const fila of filas) {
    const f = proyectar(fila, { conAdjudicacion: true });
    if (!modalidad_competitiva(f)) continue;
    if (!compatibleConAlgunPerfil(f)) continue;
    const r = enriquecer(f);
    activo.push(sinAdjudicacion(r));
    if (!r.proceso_abierto) historico.push(marcarHistorico(r));
  }
  return { activo, historico };
}

module.exports = {
  CAMPOS, CAMPOS_SOLO_HISTORICO,
  proyectar, transformar, repartirDelta, sinAdjudicacion, marcarHistorico,
};
