/* lib/manifestacion.js · La MANIFESTACIÓN DE INTERÉS de la selección abreviada de
   menor cuantía, como HOJA del grafo (ago 2026 · corregido 20-ago-2026)
   ─────────────────────────────────────────────────────────────────────────────
   Vivía en lib/portada (Fase 9). Se extrajo aquí porque el aviso tiene que
   salir TAMBIÉN en el listado (lib/filtros_lista clasifica cada fila) y en
   Mis procesos (lib/seguimiento), y `portada` requiere a `filtros_lista`: un
   require de vuelta cerraría el ciclo.

   ═══ EL DEFECTO DE PRODUCCIÓN DEL 19-AGO-2026 Y POR QUÉ ESTE ARCHIVO CAMBIÓ ═══
   La app enseñó, en rojo y en imperativo, «El plazo para manifestar interés
   vence mañana (jueves 20 de agosto): hágalo hoy en SECOP II» sobre el proceso
   MM-SA-MC-008-2026 (MUNICIPIO DE MOTAVITA, Boyacá). En SECOP II ese plazo YA
   HABÍA CERRADO: el estado era `ClosedForReplies`, la lista de interesados
   estaba publicada con «¿Sorteo realizado? Sí» y la última manifestación era
   del martes 18 a las 11:24 AM.

   CAUSA RAÍZ: `PLAZO_MANIFESTACION_HABILES = 3` se aplicaba como si la norma
   fijara el plazo. NO LO FIJA. El D. 1082/2015 art. 2.2.1.2.1.2.20 num. 1 dice
   «en un término NO MAYOR a tres (3) días hábiles» — es un TECHO, y quien fija
   el plazo concreto es la entidad, en el pliego. Motavita fijó UNO: apertura
   viernes 14 → cierre el martes 18 (primer hábil; el 15 fue sábado y el 17 el
   festivo de la Asunción trasladado). La app tomó el extremo superior del rango
   y lo presentó como el único valor, dos días hábiles tarde.

   Es el error que esta memoria documenta una y otra vez —una INFERENCIA
   presentada como una MEDICIÓN— cometido en el sitio más caro que existe: un
   aviso rojo, imperativo, sobre el único trámite sin el cual no se puede
   ofertar. Un contratista que confía en él pierde el proceso creyendo que
   llegaba a tiempo.

   LA REGLA, DESPUÉS: lo que se deduce de la norma NO es una fecha, es una
   VENTANA con dos extremos —«puede cerrar desde» (apertura + 1 hábil) y «vence
   a más tardar» (apertura + 3 hábiles)— y por tanto el estado tiene TRES
   valores, no dos:
     · `abierta`       hoy < el primer hábil: con certeza sigue abierta.
     · `por_confirmar` la ventana está corriendo: puede seguir abierta o haber
                       cerrado ya. Es el estado de MÁXIMA urgencia, no el de
                       menor: hay que ir a SECOP II AHORA.
     · `vencida`       hoy > el techo legal: con certeza venció.
     · `sin_fecha`     no se pudo situar (sin apertura legible, o incoherente).

   TRES CERRADURAS que no pueden volver a caerse:
   (1) `vencida` como BOOLEANO no existe. Su `false` significaba «sigue
       abierta» y era justo la afirmación que la app no puede hacer. Lo
       sustituye `estado`, y hay prueba que prohíbe que el campo vuelva.
   (2) NO HAY CUENTA ATRÁS SIN FECHA CONFIRMADA. `quedan_habiles` y
       `dias_calendario` viajan en `null` salvo que la fecha venga del
       CRONOGRAMA del pliego (`origen: "cronograma"`, peldaño 1 del plan, que
       lib/cronograma ya sabe extraer). Un contador es una afirmación.
   (3) COHERENCIA CON EL CIERRE DE OFERTAS PUBLICADO. Por el num. 3 del mismo
       artículo, si hay sorteo el plazo de ofertas EMPIEZA el día hábil
       siguiente al informe del sorteo: entre la manifestación y el cierre de
       ofertas tiene que caber al menos un día hábil. El techo se recorta a
       `cierre_ofertas − 1 hábil`, y si con eso la ventana se vuelve imposible
       no se afirma nada y se dice por qué. Un dato CALCULADO que contradice a
       uno PUBLICADO pierde siempre. En la tarjeta de Motavita convivían
       «Cierra en 2 días · 21 de agosto» y «Manifestar interés · vence mañana ·
       20 de agosto»: la contradicción estaba a dos centímetros y nadie la
       miraba. */
"use strict";

const { norm } = require("./semantica.js");
const habiles = require("./habiles.js");

const PLAZO_MANIFESTACION_HABILES = 3;              // D. 1082/2015 art. 2.2.1.2.1.2.20 num. 1: TECHO («no mayor a»)
const PLAZO_MINIMO_HABILES = 1;                     // suelo: lo antes que la entidad puede cerrarlo
const MARGEN_ANTES_DEL_CIERRE_HABILES = 1;          // num. 3: las ofertas empiezan el día hábil siguiente al informe del sorteo
const MAX_MANIFESTACIONES_SIN_SORTEO = 10;          // num. 2: con más de diez, la entidad puede sortear
const NORMA = "Decreto 1082 de 2015, art. 2.2.1.2.1.2.20 (num. 1: manifestar interés en un término NO MAYOR a tres días hábiles contados a partir de la apertura —es un máximo: la entidad fija el plazo concreto en el pliego, y suele ser menor—; num. 2: con más de diez manifestaciones la entidad puede sortear máximo diez; num. 3: si hay sorteo, el plazo de ofertas empieza el día hábil siguiente al informe del sorteo). Verificado contra la transcripción literal del concepto CCE C-537 de 2025.";
const soloDigitos = (s) => String(s || "").replace(/\D/g, "");
const num = (v) => { const n = Number(v); return Number.isFinite(n) ? n : 0; };
const soloFecha = (v) => { const m = String(v || "").match(/^(\d{4}-\d{2}-\d{2})/); return m ? m[1] : null; };

/* ¿Es un proceso de menor cuantía CON manifestación de interés? La variante
   «Sin Manifestacion Interes» existe en el dataset y se excluye. */
function exigeManifestacion(l) {
  const m = norm(String((l && l.modalidad_de_contratacion) || ""));
  if (!m.includes("menor cuantia")) return false;
  return !m.includes("sin manifestacion");
}

/* Fecha de apertura tomada de la publicación (YYYY-MM-DD) — supuesto declarado. */
function aperturaDe(l) {
  return soloFecha(l && (l.fecha_de_publicacion_del || l.fecha_de_ultima_publicaci || l.fecha_publicacion));
}

/* LA VENTANA: entre qué dos fechas puede cerrar el plazo. Lo único deducible
   de la norma sin leer el pliego. `desde` = apertura + 1 hábil (lo antes que
   la entidad puede cerrarlo); `hasta` = apertura + 3 hábiles (el techo legal),
   recortado por el cierre de OFERTAS publicado si ese no deja sitio al
   trámite. `imposible` cuando el recorte deja la ventana al revés: entonces la
   apertura que se está usando no puede ser la buena y no se afirma nada. */
function ventanaDe(l) {
  const apertura = aperturaDe(l);
  if (!apertura) return { apertura: null, desde: null, hasta: null, recortePorCierre: null, imposible: false, motivo: "sin_apertura" };
  const desde = habiles.sumarHabiles(apertura, PLAZO_MINIMO_HABILES);
  const techoLegal = habiles.sumarHabiles(apertura, PLAZO_MANIFESTACION_HABILES);
  const cierreOfertas = soloFecha(l && l.fecha_cierre);
  const techoPorCierre = cierreOfertas ? habiles.sumarHabiles(cierreOfertas, -MARGEN_ANTES_DEL_CIERRE_HABILES) : null;
  const hasta = techoPorCierre && techoPorCierre < techoLegal ? techoPorCierre : techoLegal;
  const recortePorCierre = hasta === techoPorCierre && techoPorCierre < techoLegal ? cierreOfertas : null;
  if (hasta < desde) return { apertura, desde: null, hasta: null, recortePorCierre: cierreOfertas, imposible: true, motivo: "cierre_de_ofertas_no_deja_sitio" };
  return { apertura, desde, hasta, recortePorCierre, imposible: false, motivo: null };
}

/* El ESTADO, derivado de la ventana y de hoy. Función PURA y ÚNICA: la usan
   `filaManifestacion` y el handler que refresca la ventana precalculada con la
   fecha del día. Dos derivaciones del mismo estado divergirían a la primera
   corrección aplicada a una sola — la lección de `total_procesos`. */
function estadoDeVentana({ desde = null, hasta = null, confirmada = null } = {}, hoy) {
  if (confirmada) return hoy > confirmada ? { estado: "vencida", accion: "ninguna" } : { estado: "abierta", accion: "avise_hoy" };
  if (!desde || !hasta) return { estado: "sin_fecha", accion: "verifique" };
  if (hoy > hasta) return { estado: "vencida", accion: "ninguna" };
  if (hoy < desde) return { estado: "abierta", accion: "avise_hoy" };
  return { estado: "por_confirmar", accion: "verifique_ya" };
}

/* Fila de manifestación con su VENTANA. `hoy` (YYYY-MM-DD, Colombia)
   inyectable. `fechaCronograma` (YYYY-MM-DD) es la fecha límite REAL leída del
   cronograma del pliego (lib/cronograma, hito `manifestacion`): cuando existe
   manda sobre la ventana, es la única que se puede afirmar y es la única con
   la que se cuenta hacia atrás. */
function filaManifestacion(l, hoy, { fechaCronograma = null } = {}) {
  const v = ventanaDe(l);
  const confirmada = soloFecha(fechaCronograma);
  const legible = (iso) => (iso ? habiles.fechaLegible(iso) : null);

  const { estado, accion } = estadoDeVentana({ desde: v.desde, hasta: v.hasta, confirmada }, hoy);
  const motivoSinFecha = estado === "sin_fecha" ? v.motivo : null;

  /* CUENTA ATRÁS SOLO CON FECHA CONFIRMADA. Sin ella, contar días sería volver
     a afirmar el vencimiento por la puerta de atrás. `habilesHastaElTecho` NO
     es una cuenta atrás: es solo para ORDENAR por urgencia, y se llama así. */
  const quedanHabiles = confirmada && estado !== "vencida"
    ? habiles.habilesEntre(hoy, confirmada) + (habiles.esHabil(hoy) ? 1 : 0) : null;
  const diasCalendario = confirmada && estado !== "vencida"
    ? Math.max(0, Math.round((Date.parse(confirmada + "T00:00:00Z") - Date.parse(hoy + "T00:00:00Z")) / 86400000)) : null;
  const habilesHastaElTecho = v.hasta && hoy <= v.hasta ? habiles.habilesEntre(hoy, v.hasta) + (habiles.esHabil(hoy) ? 1 : 0) : null;

  const nota = confirmada
    ? `Fecha límite tomada del cronograma del pliego (${confirmada}).`
    : v.imposible
      ? `No se puede situar el plazo: el cierre de ofertas publicado (${v.recortePorCierre}) no deja sitio para la manifestación, el sorteo y el plazo de ofertas, así que la fecha de publicación no es la apertura del proceso. Consulte el cronograma en SECOP II.`
      : !v.desde
        ? "El dataset no trae fecha de apertura legible: consulte el cronograma en el SECOP II."
        : `La ley fija un MÁXIMO de ${PLAZO_MANIFESTACION_HABILES} días hábiles desde la apertura (${v.apertura}), no un plazo fijo: la entidad puede haber puesto menos en el pliego. El plazo puede cerrar en cualquier momento entre el ${legible(v.desde)} y el ${legible(v.hasta)}${v.recortePorCierre ? ` (recortado porque las ofertas cierran el ${legible(soloFecha(v.recortePorCierre))})` : ""}. Confírmelo en el cronograma del proceso en SECOP II.`;

  return {
    proceso: (l && l.id_del_proceso) || null,
    entidad: (l && l.entidad) || null,
    nit_entidad: soloDigitos(l && l.nit_entidad) || null,
    objeto: (l && (l.nombre_del_procedimiento || l.descripci_n_del_procedimiento)) || null,
    valor: num(l && l.cuantia_cop) || null,           // 0 = sin dato → null
    modalidad: (l && l.modalidad_de_contratacion) || null,
    departamento: (l && l.departamento_entidad) || null,
    apertura: v.apertura,
    estado, accion,
    /* la ventana: dos extremos, JAMÁS un punto */
    puedeCerrarDesdeISO: v.desde, puedeCerrarDesdeLegible: legible(v.desde),
    venceMaximoISO: v.hasta, venceMaximoLegible: legible(v.hasta),
    /* la fecha afirmable, solo del cronograma del pliego */
    fechaLimiteISO: confirmada, fechaLimiteLegible: legible(confirmada),
    origenFecha: confirmada ? "cronograma" : v.desde ? "ventana_calculada" : "desconocida",
    confirmada: !!confirmada,
    diasHabilesRestantes: quedanHabiles,              // null sin fecha confirmada
    habilesHastaElTecho,                              // solo para ordenar por urgencia
    diasCalendario,
    recortePorCierreOfertas: v.recortePorCierre ? soloFecha(v.recortePorCierre) : null,
    motivoSinFecha,
    nota, norma: NORMA,
    cierreOfertas: (l && l.fecha_cierre) || null,     // el cierre de OFERTAS, del dataset (otra cosa)
    enlaceSecop: (l && l.urlproceso) || null,
  };
}

/* La versión COMPACTA para una fila del listado o un proceso guardado. null si
   la modalidad no exige manifestación. NO trae `vencida` ni `vence`: los dos
   campos que afirmaban lo que no se sabía (ver la cabecera). */
function manifestacionDeFila(l, hoy, opciones) {
  if (!exigeManifestacion(l)) return null;
  const f = filaManifestacion(l, hoy, opciones);
  return {
    aplica: true,
    apertura: f.apertura,
    estado: f.estado,                                 // abierta | por_confirmar | vencida | sin_fecha
    accion: f.accion,                                 // avise_hoy | verifique_ya | ninguna | verifique
    puede_cerrar_desde: f.puedeCerrarDesdeISO,
    puede_cerrar_desde_legible: f.puedeCerrarDesdeLegible,
    vence_a_mas_tardar: f.venceMaximoISO,
    vence_a_mas_tardar_legible: f.venceMaximoLegible,
    fecha_limite: f.fechaLimiteISO,                   // solo del cronograma del pliego
    fecha_limite_legible: f.fechaLimiteLegible,
    origen: f.origenFecha,
    confirmada: f.confirmada,
    quedan_habiles: f.diasHabilesRestantes,           // null sin fecha confirmada
    dias_calendario: f.diasCalendario,                // null sin fecha confirmada
    habiles_hasta_el_techo: f.habilesHastaElTecho,    // para ordenar, no para afirmar
    recorte_por_cierre_ofertas: f.recortePorCierreOfertas,
    motivo_sin_fecha: f.motivoSinFecha,
    nota: f.nota, norma: NORMA,
  };
}

/* ¿Todavía vale la pena ir a mirar? (`?manif=abierta`). Incluye
   `por_confirmar`: excluirlo escondería justo las urgentes. */
const sigueValiendoLaPena = (m) => !!m && (m.estado === "abierta" || m.estado === "por_confirmar");
/* ¿Hay que ir a SECOP II HOY? */
const esUrgente = (m) => !!m && (m.estado === "por_confirmar" || (m.estado === "abierta" && m.confirmada && m.dias_calendario != null && m.dias_calendario <= 1));

module.exports = {
  exigeManifestacion, aperturaDe, ventanaDe, estadoDeVentana, filaManifestacion, manifestacionDeFila,
  sigueValiendoLaPena, esUrgente,
  PLAZO_MANIFESTACION_HABILES, PLAZO_MINIMO_HABILES, MARGEN_ANTES_DEL_CIERRE_HABILES,
  MAX_MANIFESTACIONES_SIN_SORTEO, NORMA,
};
