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
/* ⚠️ 0, Y NO 1 (24-ago-2026) · EL SUELO TAMBIÉN ERA UNA INVENCIÓN.
   La corrección de Motavita quitó el TECHO inventado y dejó en pie el SUELO,
   que es el mismo error en espejo: la norma transcrita en `NORMA` dice «en un
   término NO MAYOR a tres (3) días hábiles» y NO FIJA NINGÚN MÍNIMO. Con el
   suelo en 1, el día de la apertura `estadoDeVentana` respondía `abierta` —que
   este módulo define como «con certeza sigue abierta»— y la nota afirmaba por
   escrito «el plazo puede cerrar en cualquier momento entre [mañana] y [el
   techo]». El ingeniero lo reportó desde el campo: «a veces solo abren 4
   horas, 8 horas». Una entidad que abre a las 8:00 y cierra a las 16:00 del
   MISMO día deja esa frase falsa y al contratista fuera del proceso creyendo
   que le sobraba un día.
   Con 0, la ventana empieza el día de la apertura y ese día cae en
   `por_confirmar`, que es el estado de MÁXIMA urgencia («vaya a SECOP II
   HOY»). `abierta` queda donde sí se puede afirmar: apertura futura, o fecha
   del cronograma del pliego. Se conserva la constante —en vez de borrarla— para
   que el suelo siga teniendo un nombre y una prueba que lo vigile. */
const PLAZO_MINIMO_HABILES = 0;                     // la norma NO fija un mínimo: puede cerrar el mismo día
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
/* El AÑO también se valida, no solo el formato (ago 2026). `lib/habiles.festivos`
   LANZA fuera de [1984, 2200] —el calendario colombiano no está definido más
   allá— y esta fecha viaja hasta `sumarHabiles` a través de `filaManifestacion`,
   que el clasificador del listado llama para CADA fila. El dataset trae años
   imposibles de verdad: un `1970-01-01` de timestamp nulo, o el `2202` que esta
   misma memoria documenta como anomalía de la fuente. Con una sola de esas filas
   en menor cuantía, `/api/procesos?op=listar` respondía 500 para todos los
   perfiles: la pantalla principal caída por un dato malo de una fila. Una fecha
   que no se puede situar es «sin fecha legible», que es una respuesta que el
   módulo ya sabe dar (`origenFecha: "desconocida"`).
   El rango se IMPORTA de `lib/habiles`, que es quien lanza: una copia local
   volvería a divergir. Y el techo de la APERTURA es un año MENOS, porque a esta
   fecha se le suman después los tres días hábiles del plazo: con la apertura el
   30 de diciembre del último año del calendario, el vencimiento cae ya fuera y
   `sumarHabiles` lanza igual — la primera versión de esta guarda validó la
   entrada y se olvidó de su propia aritmética. Perder el último año como
   apertura válida no cuesta nada: está a 174 años y cualquier fecha de ahí es
   un dato corrupto. */
const ANIO_MIN = habiles.ANIO_MIN, ANIO_MAX = habiles.ANIO_MAX - 1;

/* ⚠️ LA GUARDA DE AÑO VALE PARA LAS TRES FECHAS, NO SOLO PARA LA APERTURA
   (27-ago-2026). La corrección del 24-ago acotó `aperturaDe` y se olvidó de las
   otras dos fechas que entran a la MISMA aritmética de días hábiles:
   `fecha_cierre` (a `sumarHabiles(cierre, −1)` en `ventanaDe`) y la fecha del
   CRONOGRAMA (a `habilesEntre` vía `quedanHabiles`). El dataset trae años
   imposibles de verdad —`1970` de timestamp nulo, el `2202` documentado— y una
   sola fila así en menor cuantía tumbaba el clasificador del listado entero:
   500 para todos los perfiles, otra vez. Una fecha fuera del calendario se
   trata como AUSENTE (el módulo ya sabe responder sin ella); el margen de ±1
   año existe porque a estas fechas se les suma o resta hasta 3 hábiles. */
/* Desde el 1-sep-2026 la guarda es `habiles.fechaOperable` (una sola
   definición: la misma que usan `fechaCierre` y las señales de prórroga). */
const fechaOperable = habiles.fechaOperable;

function aperturaDe(l) {
  const f = soloFecha(l && (l.fecha_de_publicacion_del || l.fecha_de_ultima_publicaci || l.fecha_publicacion));
  if (!f) return null;
  /* La fecha se PARSEA con `soloFecha` (una sola definición para los ocho
     llamantes) y se ACOTA por año aparte: son dos preguntas distintas y la
     aritmética de días hábiles no soporta un año fuera de su tabla. */
  const anio = Number(f.slice(0, 4));
  if (anio < ANIO_MIN || anio > ANIO_MAX) return null;
  return f;
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
  const cierreOfertas = fechaOperable(soloFecha(l && l.fecha_cierre));
  const techoPorCierre = cierreOfertas ? habiles.sumarHabiles(cierreOfertas, -MARGEN_ANTES_DEL_CIERRE_HABILES) : null;
  const hasta = techoPorCierre && techoPorCierre < techoLegal ? techoPorCierre : techoLegal;
  const recortePorCierre = hasta === techoPorCierre && techoPorCierre < techoLegal ? cierreOfertas : null;
  /* ⚠️ LA INCOHERENCIA TIENE SU PROPIO UMBRAL, Y NO EL SUELO DE LA VENTANA
     (24-ago-2026). Son dos preguntas distintas y compartían constante: el suelo
     dice cuándo puede EMPEZAR a cerrar el plazo (la apertura misma, porque la
     norma no fija mínimo) y esto dice si el trámite CABE antes del cierre de
     ofertas publicado. Al bajar el suelo a 0, `hasta < desde` dejó de disparar
     en el caso que la guarda existía para cazar —apertura el 14, ofertas el 17—
     y el módulo pasó de decir «no se puede situar el plazo» a AFIRMAR
     «vencida»: un calculado que contradice a un publicado tiene que CALLARSE,
     nunca convertirse en una afirmación nueva. Lo cazó la revisión adversaria
     de esta misma corrección.
     La regla: si ni siquiera queda un día hábil después de la apertura para la
     manifestación, el sorteo, su informe y el plazo de ofertas (num. 3), la
     fecha de publicación que se está usando no puede ser la apertura. */
  const minimoParaQueQuepa = habiles.sumarHabiles(apertura, MARGEN_ANTES_DEL_CIERRE_HABILES);
  if (hasta < desde || (techoPorCierre != null && techoPorCierre < minimoParaQueQuepa)) {
    return { apertura, desde: null, hasta: null, recortePorCierre: cierreOfertas, imposible: true, motivo: "cierre_de_ofertas_no_deja_sitio" };
  }
  return { apertura, desde, hasta, recortePorCierre, imposible: false, motivo: null };
}

/* El ESTADO, derivado de la ventana y de hoy. Función PURA y ÚNICA: la usan
   `filaManifestacion` y el handler que refresca la ventana precalculada con la
   fecha del día. Dos derivaciones del mismo estado divergirían a la primera
   corrección aplicada a una sola — la lección de `total_procesos`. */
function estadoDeVentana({ desde = null, hasta = null, confirmada = null } = {}, hoy) {
  /* EL DÍA DEL VENCIMIENTO NO SE PUEDE CERTIFICAR ABIERTO (24-ago-2026). Ni
     siquiera con la fecha del pliego: el cronograma da el DÍA, nunca la hora, y
     una ventana de 4 u 8 horas cierra a media jornada. `abierta` significa en
     este módulo «con certeza sigue abierta», así que el día del vencimiento cae
     en `por_confirmar` —máxima urgencia, vaya AHORA— y solo un vencimiento
     FUTURO se certifica. Es la misma frontera que el suelo de la ventana. */
  if (confirmada) {
    if (hoy > confirmada) return { estado: "vencida", accion: "ninguna" };
    return hoy === confirmada
      ? { estado: "por_confirmar", accion: "verifique_ya" }
      : { estado: "abierta", accion: "avise_hoy" };
  }
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
  /* Sin un «hoy» legible la máquina de estados respondería «por_confirmar» en
     silencio (hoy > hasta y hoy < desde son los dos false con undefined), que es
     inventar un estado. Se cae al día de Colombia, que es lo que pasan todos
     los llamadores. */
  const dia = /^\d{4}-\d{2}-\d{2}$/.test(String(hoy)) ? String(hoy) : habiles.hoyColombia();
  const legible = (iso) => (iso ? habiles.fechaLegible(iso) : null);

  /* LA FECHA DEL CRONOGRAMA ES EL CAMINO «CONFIRMADO», así que necesita su
     propia cerradura o repite el defecto que este módulo existe para cerrar,
     con otra etiqueta. `lib/cronograma` extrae hitos por REGEX de línea y un
     pliego puede llamar «manifestación de interés» a la línea de PUBLICACIÓN
     (SECOP II rotula «publicación del pliego definitivo y demostración de
     interés»): eso daría una fecha límite anterior a la apertura, o muy
     posterior al techo legal. Solo se acepta dentro del rango que la norma
     permite; fuera, se descarta Y SE DICE, y manda la ventana. Sin apertura
     legible no hay con qué contrastar y se acepta: viene del pliego, que es
     mejor evidencia que nada. */
  const propuesta = soloFecha(fechaCronograma);
  /* Un año fuera del calendario no puede confirmarse NI contarse (entraría a
     `habilesEntre`, que lanza): se descarta como las fechas fuera de rango. */
  const anioImposible = !!(propuesta && !fechaOperable(propuesta));
  const techoLegal = v.apertura ? habiles.sumarHabiles(v.apertura, PLAZO_MANIFESTACION_HABILES) : null;
  /* `<` y NO `<=`: una entidad puede fijar en el pliego una ventana de horas que
     cierra el MISMO día de la apertura, y con `<=` se descartaba justo esa fecha
     —la única afirmable— para caer a la ventana calculada. Es el suelo inventado
     colándose por la puerta de atrás. Anterior a la apertura sí se descarta. */
  const fueraDeRango = anioImposible
    || !!(propuesta && v.apertura && (propuesta < v.apertura || propuesta > techoLegal));
  const confirmada = fueraDeRango ? null : propuesta;

  const { estado, accion } = estadoDeVentana({ desde: v.desde, hasta: v.hasta, confirmada }, dia);
  const motivoSinFecha = estado === "sin_fecha" ? v.motivo : null;

  /* CUENTA ATRÁS SOLO CON FECHA CONFIRMADA. Sin ella, contar días sería volver
     a afirmar el vencimiento por la puerta de atrás. `habilesHastaElTecho` NO
     es una cuenta atrás: es solo para ORDENAR por urgencia, y se llama así. */
  const quedanHabiles = confirmada && estado !== "vencida"
    ? habiles.habilesEntre(dia, confirmada) + (habiles.esHabil(dia) ? 1 : 0) : null;
  const diasCalendario = confirmada && estado !== "vencida"
    ? Math.max(0, Math.round((Date.parse(confirmada + "T00:00:00Z") - Date.parse(dia + "T00:00:00Z")) / 86400000)) : null;
  const habilesHastaElTecho = v.hasta && dia <= v.hasta ? habiles.habilesEntre(dia, v.hasta) + (habiles.esHabil(dia) ? 1 : 0) : null;

  const avisoDescarte = !fueraDeRango ? ""
    : anioImposible
      ? ` En el pliego se leyó «${propuesta}» como fecha límite, pero su año no es de este calendario: es un dato corrupto y se descarta.`
      : ` En el pliego se leyó «${propuesta}» como fecha límite, pero no puede serlo: la ley la sitúa entre el día de la apertura (${v.apertura}) y el ${techoLegal}. Se descarta: no se usa como fecha límite.`;
  const nota = confirmada
    ? `Fecha límite tomada del cronograma del pliego (${confirmada}).`
    : v.imposible
      ? `No se puede situar el plazo: el cierre de ofertas publicado (${v.recortePorCierre}) no deja sitio para la manifestación, el sorteo y el plazo de ofertas, así que la fecha de publicación no es la apertura del proceso. Consulte el cronograma en SECOP II.`
      : !v.desde
        ? "El dataset no trae fecha de apertura legible: consulte el cronograma en el SECOP II."
        : `La ley fija un MÁXIMO de ${PLAZO_MANIFESTACION_HABILES} días hábiles desde la apertura (${v.apertura}), no un plazo fijo: la entidad puede haber puesto menos en el pliego, y a veces son solo unas horas del mismo día. El plazo puede cerrar en cualquier momento entre el ${legible(v.desde)} y el ${legible(v.hasta)}${v.recortePorCierre ? ` (recortado porque las ofertas cierran el ${legible(soloFecha(v.recortePorCierre))})` : ""}. Confírmelo en el cronograma del proceso en SECOP II.`;

  const notaFinal = nota + avisoDescarte;   // el descarte viaja pase lo que pase con la ventana

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
    fechaCronogramaDescartada: fueraDeRango ? propuesta : null,
    plazoMaximoHabiles: PLAZO_MANIFESTACION_HABILES,
    motivoSinFecha,
    nota: notaFinal, norma: NORMA,
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
    /* la fecha del pliego que se leyó y NO se pudo aceptar (fuera del rango que
       la norma permite): viaja para que el descarte sea auditable, jamás se usa */
    fecha_cronograma_descartada: f.fechaCronogramaDescartada,
    /* el TECHO legal, para que ninguna pantalla lo cablee a mano */
    plazo_maximo_habiles: f.plazoMaximoHabiles,
    motivo_sin_fecha: f.motivoSinFecha,
    nota: f.nota, norma: NORMA,
  };
}

/* ══ EL PELDAÑO 1: LA FECHA REAL, LA QUE FIJA LA ENTIDAD EN EL PLIEGO ══
   `lib/cronograma` sabe extraer el hito `manifestacion` del texto del pliego
   desde la Fase 5, y esa es la ÚNICA fecha límite que se puede afirmar. Estaba
   construida y desconectada: el listado seguía calculando la ventana aunque el
   usuario ya hubiera abierto el pliego.

   No se puede releer el pliego por proceso en cada petición (son hasta 400 KB
   de texto por proceso), así que se PRECALCULA al leerlo —una escritura de un
   campo— y se consume con UN comando (`HGETALL`). Es el mismo criterio que la
   portada: la petición del usuario solo lee.

   El módulo sigue siendo HOJA: el cliente de Redis se INYECTA, no se importa
   (el patrón de lib/almacen). */
const CLAVE_CRONOGRAMA = "manifestacion:cronograma";
/* La fecha de ADJUDICACIÓN que trae el cronograma del pliego (M-DGF-08,
   6-sep-2026), guardada por la MISMA vía y con la misma poda: es lo que hace
   que el calendario enseñe la fecha publicada y no la estimada por el
   histórico cuando el pliego la trae (un publicado gana a un calculado). */
const CLAVE_CRONOGRAMA_ADJUDICACION = "cronograma:adjudicacion";
const MAX_FECHAS_CRONOGRAMA = 2000;         // cota dura del hash
const DIAS_VIDA_CRONOGRAMA = 120;           // más allá, el proceso cerró hace mucho

/* Guarda la fecha límite leída del pliego. `hoy` inyectable para poder podar y
   probar sin reloj. Devuelve {guardada, podadas}. Nunca lanza hacia arriba: es
   una mejora de la lectura, no puede tumbar la del pliego. `clave` elige el
   hash (por defecto el de la manifestación; el de la adjudicación es el otro
   uso): una segunda copia de esta función divergiría en la poda. */
async function guardarFechaCronograma(redis, idProceso, fecha, { hoy = null, clave = CLAVE_CRONOGRAMA } = {}) {
  const id = String(idProceso || "").trim();
  const f = soloFecha(fecha);
  if (!redis || !id || !f) return { guardada: false, podadas: 0 };
  const dia = /^\d{4}-\d{2}-\d{2}$/.test(String(hoy)) ? String(hoy) : habiles.hoyColombia();
  try {
    await redis.hset(clave, { [id]: JSON.stringify({ fecha: f, escrito: dia }) });
    /* Poda: nada purga esta clave, así que se acota aquí. Solo se mira el
       tamaño (1 comando barato) y solo se reescribe cuando de verdad crece. */
    let podadas = 0;
    const n = Number(await redis.hlen(clave)) || 0;
    if (n > MAX_FECHAS_CRONOGRAMA) {
      const todo = await redis.hgetall(clave);
      const corte = habiles.sumarDias(dia, -DIAS_VIDA_CRONOGRAMA);
      const vivos = {};
      for (const [k, v] of Object.entries(todo || {})) {
        let e = null; try { e = JSON.parse(v); } catch { e = null; }
        if (e && e.fecha && String(e.escrito || e.fecha) >= corte) vivos[k] = v; else podadas++;
      }
      if (podadas) { await redis.del(clave); await redis.hset(clave, vivos); }
    }
    return { guardada: true, podadas };
  } catch { return { guardada: false, podadas: 0 }; }
}

/* Mapa {id_proceso: "YYYY-MM-DD"} con las fechas límite leídas de pliegos. UN
   comando. Un valor corrupto se ignora en silencio (no puede tumbar el listado)
   y el proceso cae a la ventana calculada, que es el comportamiento de siempre. */
async function leerFechasCronograma(redis, { clave = CLAVE_CRONOGRAMA } = {}) {
  if (!redis) return {};
  try {
    const todo = await redis.hgetall(clave);
    const out = {};
    for (const [k, v] of Object.entries(todo || {})) {
      let e = null; try { e = typeof v === "string" && v.startsWith("{") ? JSON.parse(v) : { fecha: v }; } catch { e = null; }
      const f = e && soloFecha(e.fecha);
      if (f) out[k] = f;
    }
    return out;
  } catch { return {}; }
}

/* ¿Todavía vale la pena ir a mirar? (`?manif=abierta`). Incluye
   `por_confirmar`: excluirlo escondería justo las urgentes. */
const sigueValiendoLaPena = (m) => !!m && (m.estado === "abierta" || m.estado === "por_confirmar");
/* ¿Hay que ir a SECOP II HOY? */
const esUrgente = (m) => !!m && (m.estado === "por_confirmar" || (m.estado === "abierta" && m.confirmada && m.dias_calendario != null && m.dias_calendario <= 1));

module.exports = {
  exigeManifestacion, aperturaDe, ventanaDe, estadoDeVentana, filaManifestacion, manifestacionDeFila,
  guardarFechaCronograma, leerFechasCronograma, CLAVE_CRONOGRAMA, CLAVE_CRONOGRAMA_ADJUDICACION, MAX_FECHAS_CRONOGRAMA,
  sigueValiendoLaPena, esUrgente,
  PLAZO_MANIFESTACION_HABILES, PLAZO_MINIMO_HABILES, MARGEN_ANTES_DEL_CIERRE_HABILES,
  MAX_MANIFESTACIONES_SIN_SORTEO, NORMA,
};
