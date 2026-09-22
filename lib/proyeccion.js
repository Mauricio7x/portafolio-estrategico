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

   La cascada de INGESTA (modalidad competitiva → estado → admisibleParaIngesta)
   es la misma para los dos; cambia solo qué se conserva. Desde jul 2026 ese
   tercer paso ya NO evalúa los RUP: guarda ancho y deja el juicio fino
   (matching UNSPSC por perfil, pertinencia, capacidad) para la consulta. Así
   afinar el matching o cargar un RUP nuevo tiene efecto INMEDIATO, sin volver
   a bajar el año entero — ver lib/filtros.
   ========================================================================== */
"use strict";

const { enriquecer } = require("./negocio.js");
// prefiltro de INGESTA (ancho, sin perfiles): lib/filtros lo define y lib/rup
// solo lo reexporta. Se importa de filtros para no arrastrar todo el módulo
// de capacidad en la ruta de sincronización.
const { modalidad_competitiva, estado_abierto, admisibleParaIngesta } = require("./filtros.js");
const { CAMPOS_ADJUDICACION, oferentesDe, desenlaceDe } = require("./indice_competencia.js");

/* ---------- proyección activa: lo que la app necesita, nada más ---------- */
const CAMPOS = [
  ":id", ":updated_at",
  "id_del_proceso", "referencia_del_proceso", "nombre_del_procedimiento",
  "descripci_n_del_procedimiento", "entidad", "nit_entidad",
  "departamento_entidad", "ciudad_entidad", "modalidad_de_contratacion",
  "estado_del_procedimiento", "fase", "adjudicado", "fecha_de_publicacion_del", "precio_base",
  /* EL RESPALDO DE LA APERTURA, QUE ESTABA MUERTO (15-sep-2026).
     `manifestacion.aperturaDe` lee `fecha_de_publicacion_del || fecha_de_ultima_publicaci
     || fecha_publicacion`, pero la segunda no estaba aquí ni la caza la red de
     seguridad de abajo: sobre la fila que llega del corpus el respaldo no existía,
     y una fila sin la primera columna caía en `sin_fecha` con la apertura en null
     —se seguía viendo, pero sin ninguna fecha y fuera de la portada y de los
     avisos—. `docs/datos.md` §6 la mide al 100 % de cobertura. Desde el 22-sep-2026
     manda `fecha_de_publicacion` (la manifestación publicada) cuando viene; después,
     `fecha_de_publicacion_del` como supuesto declarado. */
  "fecha_de_ultima_publicaci",
  /* LA APERTURA DE LA MANIFESTACIÓN, PUBLICADA (22-sep-2026, dos filas enteras pegadas por el
     dueño). `fecha_de_publicacion` es «Fecha de Publicación (Manifestación de Interés)» y solo
     viene cuando SECOP II ya publicó esa fase (DIMAR 315-GINREDCE-2026: 18-sep; «OBRA PALACIO
     RIONEGRO», todavía en observaciones: ausente); `fecha_de_publicacion_fase_2` es la del BORRADOR
     (PALACIO: 7-sep, la misma que `fecha_de_publicacion_del`); `fecha_de_publicacion_fase_3`, la del
     pliego definitivo, ausente en las tres filas: se conserva por si viene. La red de seguridad de
     abajo no las caza (no llevan «apertura» ni «manifest» en el nombre) y `manifestacion.aperturaDe`
     prefiere la primera a `fecha_de_publicacion_del`: un publicado gana a un calculado. */
  "fecha_de_publicacion", "fecha_de_publicacion_fase_2", "fecha_de_publicacion_fase_3",
  "duracion", "unidad_de_duracion", "codigo_principal_de_categoria",
  "categorias_adicionales", "tipo_de_contrato",
  /* RESPALDO DECLARADO Y MUERTO (15-sep-2026). `lib/filtros.modalidad_competitiva`
     lee `modalidad_de_contratacion || tipo_de_proceso`, pero la segunda no
     estaba aquí: `proyectar` la borraba ANTES de que `transformar` llamara a esa
     función sobre la fila ya proyectada, así que una fila cuya modalidad viviera
     solo ahí se descartaba en la ingesta como «modalidad no competitiva» —un
     motivo falso— y no llegaba ni al embudo del diagnóstico. Mismo criterio que
     las candidatas de anticipo de abajo: si la fuente la trae, no puede morir
     en la proyección. */
  "tipo_de_proceso",
  /* LA LLAVE DE CRUCE CON LOS DATASETS SATÉLITE (M-DGF-05, 6-sep-2026). El
     `id_del_portafolio` (CO1.BDOS.…) es la columna con la que p6dx-8zbt se une a
     dmgg-8hin (los archivos del proceso), a jbjy-vk9h (la ejecución del contrato)
     y a lo que venga después: sin ella, cada lectura de documentos costaba una
     consulta previa a p6dx solo para traducir el id. Es un IDENTIFICADOR público,
     no un dato de adjudicación: entra en la proyección ACTIVA (y por eso también
     en la histórica) y `CAMPOS_SOLO_HISTORICO`, que se calcula por diferencia,
     no la toca. Los registros anteriores a la primera full no la traen y siguen
     resolviéndose por p6dx: desplegar no puede exigir reconstruir el corpus. */
  "id_del_portafolio",
  // candidatas de anticipo declarado (lib/negocio.ANTICIPO_CAMPOS): p6dx-8zbt
  // no las trae HOY, pero si la fuente las añade no pueden morir en la
  // proyección — sin esto el anticipo declarado jamás llegaría a enriquecer()
  "porcentaje_de_anticipo", "anticipo_porcentaje", "porcentaje_anticipo", "pct_anticipo", "anticipo",
  "respuestas_al_procedimiento", "conteo_de_respuestas_a_ofertas", "proveedores_unicos_con",
  /* EL «ABIERTO» PUBLICADO, guardado para poder MEDIRLO (15-sep-2026). Hoy
     `lib/filtros.estado_abierto` DEDUCE la apertura de `estado_del_procedimiento`
     y `fase`, y cuando ninguno de los dos dice algo reconocible responde
     «cerrado» — es decir, esconde por no saber. SECOP II publica estas dos
     columnas con el 100 % de cobertura (`docs/datos.md` §6) y un dato PUBLICADO
     gana a uno CALCULADO. NO se consultan todavía y eso es deliberado: sus
     literales no están medidos (datos.gov.co está bloqueado desde esta sesión
     por política del proxy: «connect_rejected … organization policy»), y el
     precedente de `proveedores_que_manifestaron` —que vino en 0 en las 2.000
     filas del censo— dice que primero se mide la cobertura y después se enseña.
     Guardarlas es lo que hace posible medirlas: el corpus se sincroniza cada
     noche y sin esto no habría contra qué contrastar. */
  "estado_de_apertura_del_proceso", "estado_resumen",
];

/* Columnas que SOLO existen en el corpus histórico (lib/indice_competencia
   define la lista y su lectura). Se borran de cualquier registro que vaya al
   corpus activo — ver sinAdjudicacion(). */
const CAMPOS_SOLO_HISTORICO = [...new Set([...CAMPOS_ADJUDICACION, "oferentes", "fue_adjudicado"])]
  .filter((c) => !CAMPOS.includes(c));

/* SOCRATA PUBLICA `urlproceso` COMO OBJETO `{url, description}`, no como texto.
   Aplanarlo vive AQUÍ y en un solo sitio porque hay dos caminos que leen una
   fila —la ingesta y la foto que se guarda en Mis procesos— y el que no lo
   aplanaba escribía `String({})`, o sea el literal «[object Object]», en el
   perfil del usuario: un texto creíble donde la respuesta correcta es «no hay
   enlace». `urlSegura` lo rechazaba después, así que no llegó a pintarse un
   enlace roto, pero el dato guardado era basura. Un valor que no es ni objeto
   con `url` ni texto sale null: la ausencia no se rellena. */
function urlDeFila(fila) {
  const u = fila && fila.urlproceso !== undefined ? fila.urlproceso : (fila && fila.url);
  const s = u && typeof u === "object" ? u.url : u;
  return typeof s === "string" && s.trim() ? s.trim() : null;
}

function proyectar(fila, { conAdjudicacion = false } = {}) {
  const out = {};
  for (const c of CAMPOS) if (fila[c] !== undefined) out[c] = fila[c];
  if (conAdjudicacion) {
    for (const c of CAMPOS_ADJUDICACION) if (fila[c] !== undefined) out[c] = fila[c];
  }
  if (typeof out.descripci_n_del_procedimiento === "string" && out.descripci_n_del_procedimiento.length > 700) {
    out.descripci_n_del_procedimiento = out.descripci_n_del_procedimiento.slice(0, 700) + "…";
  }
  out.urlproceso = urlDeFila(fila);
  /* Columnas de fecha de cierre: nombre no garantizado → conservar candidatas.
     `l[ií_]mit` y `manifest` (15-sep-2026): la grafía de Socrata escribe la
     tilde como guión bajo (`fecha_l_mite_de_recepci`), así que `fecha_l_mite`
     —declarada en `negocio.CIERRE_CANDIDATOS`— se perdía aquí y el proceso
     llegaba a Redis sin cierre; y una fecha de manifestación publicada tenía que
     sobrevivir a la proyección para que `lib/manifestacion` pueda mirarla
     (quien NO puede tomarla es `fechaCierre`, que la excluye por su nombre).
     El primer test admite `plazo` además de `fecha` porque SECOP II rotula esto
     «Plazo para manifestación de Interés»: con solo `fecha`, una columna llamada
     `plazo_manifestacion_interes` moría en la puerta y la guarda de al lado no
     protegía nada. */
  for (const k in fila) {
    if (out[k] === undefined && /fecha|plazo/i.test(k) && /(recep|cierre|l[ií_]mit|plazo|apertura|manifest)/i.test(k)) out[k] = fila[k];
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
  /* `fue_adjudicado` sale de `desenlaceDe`, no de `esAdjudicado` a secas
     (hermano del remate B9b-H3, 6-sep-2026): un proceso declarado desierto que
     traiga la fecha en que se declaró quedaba marcado `true` en el corpus
     guardado —un «sí, hubo ganador» falso esperando a su primer lector—. */
  return { ...registro, oferentes: oferentesDe(registro), fue_adjudicado: desenlaceDe(registro) === "adjudicado" };
}

/* Cascada de filtros → enriquecimiento de negocio.
   conservarCerradas=true en el delta y en la extracción histórica: los cambios
   a estado cerrado deben guardarse para REEMPLAZAR (dedup por :updated_at) la
   versión abierta previa, y el histórico vive precisamente de los cerrados.
   Limitación asumida en el delta: si a un proceso YA guardado le muta la
   modalidad o el objeto hacia algo inválido (rarísimo en SECOP II: la modalidad
   es identidad del proceso y el objeto solo cambia por adenda), se descarta y
   la versión vieja persiste hasta la full de higiene mensual. */
/* `censo` es OPCIONAL (lib/censo_ingesta): cuando viene, cada fila descartada
   se registra con su MOTIVO. NO cambia ni una decisión — sin censo el bucle es
   exactamente el de siempre. Existe porque hasta ago 2026 estos `continue`
   eran el único punto del sistema que tiraba procesos SIN dejar rastro en
   ningún sitio (el embudo de /api/diagnostico solo censa lo ya guardado), y
   por eso el dueño no podía saber por qué faltaban tres convocatorias de la
   UNIVERSIDAD PEDAGÓGICA NACIONAL. */
function transformar(filas, { conservarCerradas = false, conAdjudicacion = false, censo = null } = {}) {
  const out = [];
  for (const fila of filas) {
    const f = proyectar(fila, { conAdjudicacion });
    if (censo) censo.leida();
    if (!modalidad_competitiva(f)) {                          // sin competencia, fuera
      if (censo) censo.registrar("modalidad_no_competitiva", f);
      continue;
    }
    if (!conservarCerradas && !estado_abierto(f)) {           // full: cerrados fuera de origen
      if (censo) censo.registrar(censo.motivoNoAbierto(f), f);
      continue;
    }
    if (!admisibleParaIngesta(f)) {                           // prefiltro ANCHO (sin perfiles)
      if (censo) censo.registrar(censo.motivoNoAdmisible(f), f);
      continue;
    }
    const r = enriquecer(f);
    if (censo) censo.aceptada();
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
function repartirDelta(filas, { censo = null } = {}) {
  const activo = [], historico = [];
  for (const fila of filas) {
    const f = proyectar(fila, { conAdjudicacion: true });
    if (censo) censo.leida();
    if (!modalidad_competitiva(f)) {
      if (censo) censo.registrar("modalidad_no_competitiva", f);
      continue;
    }
    if (!admisibleParaIngesta(f)) {
      if (censo) censo.registrar(censo.motivoNoAdmisible(f), f);
      continue;
    }
    const r = enriquecer(f);
    if (censo) censo.aceptada();
    activo.push(sinAdjudicacion(r));
    if (!r.proceso_abierto) historico.push(marcarHistorico(r));
  }
  return { activo, historico };
}

module.exports = {
  CAMPOS, CAMPOS_SOLO_HISTORICO,
  proyectar, transformar, repartirDelta, sinAdjudicacion, marcarHistorico, urlDeFila,
};
