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
   a más tardar» (apertura + 3 hábiles)— y por tanto el estado tiene VARIOS
   valores, no dos (la lista completa, que el propio código enumera):
     · `abierta`       hoy < el primer hábil: con certeza sigue abierta.
     · `por_confirmar` la ventana está corriendo: puede seguir abierta o haber
                       cerrado ya. Es el estado de MÁXIMA urgencia, no el de
                       menor: hay que ir a SECOP II AHORA.
     · `pudo_vencer`   pasó el techo legal CALCULADO y nadie ha publicado la
                       fecha: pudo vencer, y no consta. Se muestra en ámbar.
     · `vencida`       CONSTA que venció: hay fecha publicada y ya pasó, o la
                       fase publicada ya es posterior (`origen_vencimiento`).
     · `sin_fecha`     no se pudo situar (sin apertura legible, o incoherente).
     · `por_abrir`     la fase publicada es ANTERIOR a la manifestación: el
                       plazo todavía no ha abierto (22-sep-2026, ver senalSecop).
                       Con `secop_observaciones_cerradas` las observaciones ya
                       cerraron («Evaluación»): puede abrir en cualquier momento.

   ═══ «VENCIDA» ERA UNA DEDUCCIÓN VESTIDA DE CONSTATACIÓN (15-sep-2026) ═══════
   Encargo del dueño: «priorizar que aparezcan todos los procesos de
   manifestación de interés donde me pueda presentar; que únicamente se oculten
   cuando en SECOP II el "Plazo para manifestación de Interés" diga "x horas /
   días de tiempo TRANSCURRIDO"».

   Lo que hacía este módulo era lo contrario, y es el defecto de Motavita EN EL
   ESPEJO. Allí se tomó el techo legal (apertura + 3 hábiles) y se publicó como
   fecha de vencimiento para URGIR; aquí se tomaba el mismo techo y se publicaba
   como vencimiento para DAR POR MUERTO. Medido antes del arreglo: un proceso
   publicado el 10-sep con cierre de ofertas el 25 respondía `vencida` desde el
   16-sep —cuatro días de oficina después de la apertura, sin que nadie hubiera
   leído el pliego— y con `vencida` el proceso salía de `?manif=abierta`, de la
   portada, de los avisos de Mis procesos y del calendario, y la tarjeta pasaba
   a ámbar con «el plazo para avisar que le interesa ya venció». Mientras tanto
   SECOP II podía seguir enseñando el plazo corriendo. La memoria ya lo tenía
   medido sin sacar la consecuencia: «64 de 64 procesos de menor cuantía
   servidos tienen la ventana cerrada».

   LA REGLA, DESPUÉS: **`vencida` es una CONSTATACIÓN, nunca una deducción.**
   Solo sale del camino CONFIRMADO (fecha publicada en el cronograma del pliego,
   con su hora cuando la trae). La ventana CALCULADA ya no puede afirmar el
   vencimiento: cuando su techo pasa responde `pudo_vencer`, que en pantalla es
   ámbar y dice «no consta que haya vencido: verifíquelo en SECOP II». Nada se
   esconde por un cálculo; se esconde por un hecho publicado.

   ═══ LA HORA (15-sep-2026) ═══════════════════════════════════════════════════
   SECOP II publica el plazo CON HORA: «14/09/2026 6:00:00 PM(UTC-05:00)». Sin
   ella, el día del vencimiento era indistinguible a las 11 de la mañana —plazo
   abierto— y a las 11 de la noche —cinco horas transcurridas—, y por eso ese día
   tenía que caer en `por_confirmar` («vaya AHORA») aunque fuera de madrugada.
   Con la hora leída del cronograma, ese día se decide de verdad: `abierta`
   hasta el instante publicado y `vencida` después. Sin hora, NADA CAMBIA: sigue
   siendo `por_confirmar`, porque seguir sin saberlo no autoriza a afirmarlo.

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

const { norm, nucleoEstado, MANIFESTACION_INTERES_RE, FASE_ANTES_MANIFESTACION_RE, FASE_TRAS_MANIFESTACION_RE } = require("./semantica.js");
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
/* La HORA de un límite «YYYY-MM-DDTHH:MM…», o null. Se separa de la fecha
   —dos preguntas distintas— porque casi todo el módulo razona en días y solo
   el día del vencimiento necesita la hora. Una hora fuera de rango es null: la
   ausencia no se rellena con las 00:00, que afirmaría «a la medianoche». */
const soloHora = (v) => {
  const m = String(v || "").match(/^\d{4}-\d{2}-\d{2}T(\d{2}):(\d{2})/);
  if (!m) return null;
  return Number(m[1]) <= 23 && Number(m[2]) <= 59 ? `${m[1]}:${m[2]}` : null;
};

/* ══ LA SEÑAL PUBLICADA: SECOP II SÍ DICE SI EL PLAZO ESTÁ CORRIENDO ══════════
   (15-sep-2026, medido por el DUEÑO en datos.gov.co con la consulta que se le
   dejó, sobre las menores cuantías publicadas desde el 1-sep-2026)
   Esta memoria decía «ninguna columna trae la fecha límite de manifestación», y
   sigue siendo verdad; lo que nadie había mirado es la pareja `fase` ×
   `estado_del_procedimiento`. Contado por parejas en las tres fases que reciben
   algo:
     fase                          Publicado/Abierto   Evaluación
     Manifestación de interés            112              298
     Presentación de observaciones       262               45
     Presentación de oferta              398                7
   El patrón es el mismo en las tres: «Evaluación» = la ventana de ESA fase ya
   cerró y la entidad evalúa lo recibido; «Publicado» = sigue recibiendo. Y las
   proporciones cuadran con los plazos reales (la manifestación dura 1-3 días,
   las observaciones 5-10, las ofertas más). `fase` no es, pues, el rótulo del
   tipo de proceso —como dedujo el censo del 16-ago sobre filas viejas— sino la
   FASE VIGENTE, y la memoria de aquel día queda corregida en esto.
   Consecuencia: la fila de Redis lleva un hecho publicado sobre el plazo, con su
   fecha (`:updated_at`, la última vez que Socrata vio cambiar la fila), y un
   publicado gana a un calculado. Desde el 22-sep se usa en las DOS direcciones
   (`senalSecop`: «antes» · «recibiendo» · «cerrada»). «Evaluación» cierra por
   prefijo en `lib/filtros.estado_abierto` SALVO con una fase anterior a la
   manifestación (`evaluacionDeFaseAnterior`, medición del dueño del 22-sep):
   esas filas llegan al listado como «por abrir»; con la fase de manifestación o
   la de ofertas siguen sin llegar, que es lo que el dueño pidió no ver.
   Lo que la señal NO puede afirmar: que HOY siga abierto. La sincronización es
   diaria y una entidad cierra a media tarde, así que lo que se responde con ella
   es `por_confirmar` («vaya HOY»), nunca `abierta`. Y `fase` puede ir rezagada
   (la cicatriz de la UPN): si lo hace aquí, el error cae en un rojo de más sobre
   un proceso que ya está en ofertas —ruido—, nunca en esconder ni en prometer
   tiempo. */
/* ═══ LA POSICIÓN DEL PROCESO, EN LAS DOS DIRECCIONES (22-sep-2026) ═══════════
   La versión del 15-sep miraba la fase SOLO cuando era la de manifestación y
   fuera de ella callaba. Con eso, un proceso que SECOP II ya tenía en
   «Presentación de oferta» (la manifestación cerró y el sorteo pasó: 398 de las
   menores cuantías medidas) salía en ámbar con «pudo cerrarse ya · verifíquelo»,
   y uno en «Presentación de observaciones» (todavía no ha abierto: 262) salía
   igual, o en rojo con «vaya HOY» — dos afirmaciones calculadas que un dato
   PUBLICADO desmentía dos columnas más allá. La captura del dueño del 22-sep
   era exactamente eso. `fase` es la fase VIGENTE (medido el 15-sep) y solo
   avanza, así que:
     · `posicion: "antes"`      → el plazo para avisar NO HA ABIERTO.
     · `posicion: "recibiendo"` → SECOP II lo tenía recibiendo el día `fecha`.
     · `posicion: "cerrada"`    → la manifestación CERRÓ (la fase es la de
                                  manifestación en evaluación —el sorteo está
                                  por publicarse— o ya una posterior).
     · `posicion: null`         → la fase no dice nada reconocible.
   `recibiendo` se conserva (true/false/null) para los consumidores de antes.
   El riesgo declarado sigue siendo una fase rezagada (la cicatriz de la UPN):
   como la fase solo avanza, «cerrada» nunca esconde un plazo vivo; «antes»
   sobre una fase rezagada diría «todavía no abre» sobre un plazo corriendo, y
   por eso la pantalla dice la FECHA en que SECOP II lo vio así y manda al
   cronograma, sin esconder nada. */
function senalSecop(l) {
  // el mismo recorte del prefijo «Proceso » que se aplica al estado (por si la fase lo trae): lib/semantica.nucleoEstado
  const fase = nucleoEstado(norm(String((l && l.fase) || "")));
  const faseLegible = String((l && l.fase) || "").trim() || null;
  const estadoLegible = String((l && l.estado_del_procedimiento) || "").trim() || null;
  const estado = nucleoEstado(norm(estadoLegible || ""));
  const t = Date.parse(String((l && l[":updated_at"]) || ""));
  const fecha = Number.isFinite(t) ? habiles.hoyColombia(t) : null;
  if (MANIFESTACION_INTERES_RE.test(fase)) {
    if (/^(?:publicado|abierto|convocado)\b/.test(estado)) return { recibiendo: true, fecha, posicion: "recibiendo", fase: faseLegible, estado: estadoLegible };
    /* la fase sigue siendo la de manifestación pero ya no recibe: es la espera
       del sorteo o de la lista de interesados (298 de las 410 medidas) */
    if (/^(?:en\s+)?evaluacion\b/.test(estado)) return { recibiendo: false, fecha, posicion: "cerrada", fase: faseLegible, estado: estadoLegible, en_sorteo: true };
    return { recibiendo: null, fecha, posicion: null, fase: faseLegible, estado: estadoLegible };
  }
  if (FASE_TRAS_MANIFESTACION_RE.test(fase)) return { recibiendo: false, fecha, posicion: "cerrada", fase: faseLegible, estado: estadoLegible };
  /* «antes» con el estado que RECIBE («Publicado»/«Abierto») Y con «Evaluación»
     (medición del dueño de la noche del 22-sep: 302 y 265 de las menores cuantías
     publicadas desde el 1-sep). «Evaluación» en observaciones NO es «pasó de
     largo» —lo que decía la primera versión de hoy sobre 45 filas del 15-sep—:
     la entidad responde las observaciones y el pliego definitivo, que es el que
     abre el plazo para avisar, viene DESPUÉS. Es antes, y más cerca de abrir:
     `observaciones_cerradas` lo dice para que las pantallas manden a mirar el
     cronograma HOY. Cualquier otro estado (cancelado, suspendido…) no afirma nada. */
  if (FASE_ANTES_MANIFESTACION_RE.test(fase)) {
    /* LA FASE ANTERIOR REZAGADA, DESMENTIDA POR UN PUBLICADO (22-sep-2026): si SECOP II ya dio la
       fecha de publicación de la manifestación (no anterior a la publicación vigente), la fase
       «observaciones» es vieja y no se afirma «todavía no abre»: manda la ventana contada desde
       esa apertura publicada (`aperturaDe`). Guarda DEFENSIVA: medido el 22-sep, ninguna de las
       574 filas en observaciones trae `fecha_de_publicacion` (la columna describe la fase vigente). */
    const manifestacionPublicada = aperturaPublicadaDe(l);
    if (manifestacionPublicada) return { recibiendo: null, fecha, posicion: null, fase: faseLegible, estado: estadoLegible, manifestacion_publicada: manifestacionPublicada };
    if (/^(?:publicado|abierto|convocado)\b/.test(estado)) return { recibiendo: null, fecha, posicion: "antes", fase: faseLegible, estado: estadoLegible, observaciones_cerradas: false };
    if (/^(?:en\s+)?evaluacion\b/.test(estado)) return { recibiendo: null, fecha, posicion: "antes", fase: faseLegible, estado: estadoLegible, observaciones_cerradas: true };
    return { recibiendo: null, fecha, posicion: null, fase: faseLegible, estado: estadoLegible };
  }
  return { recibiendo: null, fecha: null, posicion: null, fase: faseLegible, estado: estadoLegible };
}

/* UNA SOLA APLICACIÓN DE LA SEÑAL, para la fila y para el refresco (22-sep-2026).
   `lib/handlers/procesos/manifestacion` recalculaba el estado de cada fila
   guardada con `estadoDeVentana` a secas y PERDÍA la señal: una fila guardada
   como `por_confirmar` porque SECOP II la tenía recibiendo se servía como
   `pudo_vencer` (reproducido el 22-sep). Dos derivaciones del mismo estado
   divergen a la primera corrección; desde hoy las dos llaman aquí.
   Recibe el estado de la VENTANA (o del cronograma), la señal y si la fecha
   viene confirmada del pliego, y devuelve el estado final:
     · "cerrada"    → `vencida`, siempre. Es una constatación de la plataforma
                      (la fase ya es posterior) y gana incluso a una fecha del
                      pliego futura: esa fecha sale de una regex sobre una
                      línea de texto; la fase es el estado del proceso.
     · "antes"      → `por_abrir` SOLO sobre lo calculado (pudo_vencer,
                      por_confirmar, sin_fecha y la `abierta` de la ventana):
                      con fecha del cronograma manda el cronograma.
     · "recibiendo" → lo del 15-sep: sube pudo_vencer/sin_fecha a por_confirmar
                      y desmiente una `vencida` del pliego anterior a la fecha
                      en que SECOP II lo vio recibiendo.
   `origen_vencimiento` dice de dónde salió una `vencida`: "cronograma" (fecha
   publicada en el pliego) o "fase_secop". */
function aplicarSenalSecop(ventana, secop, { confirmada = null } = {}) {
  const v = ventana || { estado: "sin_fecha", accion: "verifique" };
  const s = secop || {};
  /* LA FASE POSTERIOR NO ESCONDE MIENTRAS OTRO DATO DIGA QUE EL PLAZO SIGUE VIVO
     (revisión adversaria del 22-sep). La cicatriz de la UPN: una convocatoria
     REPUBLICADA conserva la fase «Presentación de oferta» o «Evaluación» del
     intento anterior mientras su estado dice «Publicado». Con la ventana
     calculada todavía corriendo (publicado hace menos del techo legal) o con
     una fecha del pliego futura, la fase sola no basta para esconder: se
     responde `por_confirmar` («verifique HOY») y la nota cita las dos fuentes.
     Cuando es el ESTADO —la columna autoritativa— el que dice «Evaluación» con
     la fase de manifestación (`en_sorteo`), sí consta: esa columna no arrastra
     el rezago de la fase. */
  const ventanaViva = v.estado === "abierta" || v.estado === "por_confirmar";
  if (s.posicion === "cerrada" && !s.en_sorteo && ventanaViva) return { estado: "por_confirmar", accion: "verifique_ya", origen_vencimiento: null, contradiccion: "fase_posterior_con_plazo_vivo" };
  if (s.posicion === "cerrada") return { estado: "vencida", accion: "ninguna", origen_vencimiento: "fase_secop" };
  /* y la simetría (revisión del 22-sep): si SECOP II lo vio todavía ANTES de la
     manifestación DESPUÉS de la fecha que el pliego daba como límite, esa fecha
     no es la buena (borrador, adenda o línea mal leída): no se esconde. */
  const pliegoDesmentido = confirmada && v.estado === "vencida" && s.fecha && s.fecha > confirmada;
  if (s.posicion === "antes" && (!confirmada || pliegoDesmentido)) return { estado: "por_abrir", accion: "siga_cronograma", origen_vencimiento: null };
  const contradice = s.recibiendo === true && (
    v.estado === "pudo_vencer" || v.estado === "sin_fecha"
    || (v.estado === "vencida" && confirmada && s.fecha && s.fecha > confirmada));
  if (contradice) return { estado: "por_confirmar", accion: "verifique_ya", origen_vencimiento: null };
  return { estado: v.estado, accion: v.accion, origen_vencimiento: v.estado === "vencida" ? "cronograma" : null };
}

/* ¿Es un proceso de menor cuantía CON manifestación de interés? La variante
   «Sin Manifestacion Interes» existe en el dataset y se excluye. */
function exigeManifestacion(l) {
  const m = norm(String((l && l.modalidad_de_contratacion) || ""));
  if (!m.includes("menor cuantia")) return false;
  return !m.includes("sin manifestacion");
}

/* LA APERTURA PUBLICADA GANA A LA SUPUESTA (22-sep-2026, noche). `fecha_de_publicacion` es
   «Fecha de Publicación (Manifestación de Interés)» en p6dx-8zbt: viene MIENTRAS la fase
   vigente es la manifestación (medido el 22-sep sobre 1.948 menores cuantías: 661 de 661 en
   esa fase, 0 de 713 en la de ofertas; cada columna de fecha describe la fase vigente, no la
   historia). Cuando viene, ES la apertura del plazo, justo mientras el plazo importa. `fecha_de_publicacion_del` es la del PROCESO, que con borrador es la del
   borrador («OBRA PALACIO RIONEGRO»: 7-sep, y el techo calculado desde ahí, 10-sep, no significaba
   nada). Solo cuenta si no es anterior a la publicación vigente: una manifestación de un intento
   anterior (proceso republicado) no es la apertura de este. Sin ella, el supuesto de siempre,
   declarado (`apertura_publicada: false`). */
function aperturaPublicadaDe(l) {
  const f = soloFecha(l && l.fecha_de_publicacion);
  if (!f) return null;
  const anio = Number(f.slice(0, 4));
  if (anio < ANIO_MIN || anio > ANIO_MAX) return null;
  /* la publicación VIGENTE es la mayor de las dos (`fecha_de_ultima_publicaci` es «la última publicación
     hecha para el proceso», diccionario; las dos vienen al 100 %, así que un `||` la dejaría muda) */
  const vigente = [soloFecha(l && l.fecha_de_publicacion_del), soloFecha(l && l.fecha_de_ultima_publicaci)].filter(Boolean).sort().pop() || null;
  return vigente && f < vigente ? null : f;
}

/* Fecha de apertura: la publicada si SECOP II la dio; si no, la de la publicación del proceso (YYYY-MM-DD), supuesto declarado. */
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
  const publicada = aperturaPublicadaDe(l);
  if (publicada) return publicada;
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
function estadoDeVentana({ desde = null, hasta = null, confirmada = null, horaLimite = null } = {}, hoy, instante = null) {
  /* EL DÍA DEL VENCIMIENTO NO SE PUEDE CERTIFICAR ABIERTO SIN LA HORA
     (24-ago-2026; matizado el 15-sep-2026). El cronograma da casi siempre el
     DÍA y nada más, y una ventana de 4 u 8 horas cierra a media jornada: con
     solo el día, ese día cae en `por_confirmar` —máxima urgencia, vaya AHORA—.
     CUANDO EL PLIEGO SÍ PUBLICA LA HORA —la que SECOP II enseña en «Plazo para
     manifestación de Interés · … (14/09/2026 6:00:00 PM(UTC-05:00))»— ya no hay
     nada que adivinar: antes del instante publicado está abierta y después
     venció, y es la única forma de distinguir «faltan siete horas» de «17 horas
     de tiempo transcurrido», que era el encargo. Sin hora, o sin un instante
     contra el que comparar, se responde lo de siempre. */
  if (confirmada) {
    if (hoy > confirmada) return { estado: "vencida", accion: "ninguna" };
    if (hoy < confirmada) return { estado: "abierta", accion: "avise_hoy" };
    if (!horaLimite || !instante) return { estado: "por_confirmar", accion: "verifique_ya" };
    return instante > `${confirmada}T${horaLimite}`
      ? { estado: "vencida", accion: "ninguna" }
      : { estado: "abierta", accion: "avise_hoy" };
  }
  if (!desde || !hasta) return { estado: "sin_fecha", accion: "verifique" };
  /* ⚠️ AQUÍ NO PUEDE DECIR «vencida» (15-sep-2026). `hasta` es el techo LEGAL
     CALCULADO sobre una apertura SUPUESTA (la fecha de publicación), no una
     fecha publicada: pasarlo demuestra que el plazo PUDO cerrar, jamás que
     cerró. Decir «vencida» aquí es el defecto de Motavita en el espejo —una
     inferencia presentada como una medición— y su precio es esconder procesos
     a los que el dueño todavía podía presentarse. `pudo_vencer` dice la verdad
     entera y deja el proceso a la vista, en ámbar. */
  if (hoy > hasta) return { estado: "pudo_vencer", accion: "verifique" };
  if (hoy < desde) return { estado: "abierta", accion: "avise_hoy" };
  return { estado: "por_confirmar", accion: "verifique_ya" };
}

/* Fila de manifestación con su VENTANA. `hoy` (YYYY-MM-DD, Colombia)
   inyectable. `fechaCronograma` (YYYY-MM-DD) es la fecha límite REAL leída del
   cronograma del pliego (lib/cronograma, hito `manifestacion`): cuando existe
   manda sobre la ventana, es la única que se puede afirmar y es la única con
   la que se cuenta hacia atrás. */
function filaManifestacion(l, hoy, { fechaCronograma = null, ahora = null } = {}) {
  const v = ventanaDe(l);
  /* Sin un «hoy» legible la máquina de estados respondería «por_confirmar» en
     silencio (hoy > hasta y hoy < desde son los dos false con undefined), que es
     inventar un estado. Se cae al día de Colombia, que es lo que pasan todos
     los llamadores. */
  const dia = /^\d{4}-\d{2}-\d{2}$/.test(String(hoy)) ? String(hoy) : habiles.hoyColombia();
  const legible = (iso) => (iso ? habiles.fechaLegible(iso) : null);
  /* EL INSTANTE tiene que caer en el MISMO día que `hoy`, y esa condición es la
     que hace que el reloj por defecto sea seguro. `hoy` es inyectable —la suite
     lo mueve por catorce días, y `lib/seguimiento`, la entrada y la guía lo
     calculan cada uno por su lado—, así que un instante del reloj real sobre un
     `hoy` de otro día decidiría el vencimiento con la hora que no es: un cruce
     de fuentes que no se nota hasta que falla. Con la guarda, la hora solo entra
     cuando se está razonando sobre el día de HOY, que es el único en el que
     importa; cualquier otro día responde con el calendario, como siempre. Por
     eso NO hace falta que los seis llamadores se pasen un `ahora` entre ellos
     —ahí es donde dos módulos empiezan a dar respuestas distintas del mismo
     hecho— y sí puede pasarlo quien lo tiene inyectado (el listado). */
  const instanteCrudo = habiles.ahoraColombia(Number.isFinite(ahora) ? ahora : undefined);
  const instante = instanteCrudo.slice(0, 10) === dia ? instanteCrudo : null;

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
  /* La HORA viaja pegada a la fecha («2026-09-14T18:00») porque la escribe la
     misma lectura del pliego y se guarda en el mismo campo: un segundo mapa de
     horas se desincronizaría del de fechas a la primera poda. */
  const horaPropuesta = soloHora(fechaCronograma);
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

  /* La hora acompaña a la fecha o no existe: una hora sobre una fecha
     DESCARTADA sería la afirmación descartada volviendo por la puerta de atrás. */
  const horaLimite = confirmada ? horaPropuesta : null;
  const ventana = estadoDeVentana({ desde: v.desde, hasta: v.hasta, confirmada, horaLimite }, dia, instante);
  /* LA SEÑAL PUBLICADA CORRIGE HACIA ARRIBA, NUNCA HACIA ABAJO. Si SECOP II
     tenía el proceso recibiendo manifestaciones, no se puede decir «pudo
     vencer» (calculado) ni «sin fecha» (no situable): se dice `por_confirmar`
     con la fecha en que constaba abierto. Y si la fecha del PLIEGO ya pasó pero
     SECOP II lo vio recibiendo DESPUÉS de esa fecha, la fecha del pliego no es
     la buena (una adenda, o una línea mal leída): tampoco se esconde. Lo
     contrario —bajar un estado por la señal— no se hace aquí: eso lo decide
     `estado_abierto` en la cascada, con la precedencia de siempre. */
  const secop = senalSecop(l);
  const { estado, accion, origen_vencimiento: origenVencimiento, contradiccion } = aplicarSenalSecop(ventana, secop, { confirmada });
  const aperturaPublicada = !!aperturaPublicadaDe(l);   // la apertura es un dato de SECOP II, no el supuesto de la publicación
  const origenApertura = aperturaPublicada ? ", publicada por SECOP II" : "";
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
  /* LAS DOS FRASES DE LA FASE PUBLICADA van primero: son el hecho más nuevo y el
     que decide. Se cita el literal de la fase y la fecha en que SECOP II lo
     tenía así, sin interpretar más de lo que la columna dice. */
  const cuandoSecop = secop.fecha ? legible(secop.fecha) : "último día visto";
  /* «Evaluación» con la fase de manifestación sostiene que ya NO recibe avisos;
     que el sorteo esté PENDIENTE no lo sostiene (el rótulo puede quedarse pegado
     al proceso hasta la evaluación de ofertas: 1.929 de 2.000 filas viejas el
     16-ago). Se dice lo que consta y qué mirar. */
  const notaFase = estado === "vencida" && origenVencimiento === "fase_secop"
    ? (secop.en_sorteo
      ? `Según SECOP II, el ${cuandoSecop} este proceso ya no recibía avisos de interés (estado «${secop.estado || "Evaluación"}»): el plazo cerró. Mire en el proceso si ya salió la lista de interesados o el sorteo y si usted quedó. Solo pueden presentar oferta quienes avisaron a tiempo.`
      : `Según SECOP II, el ${cuandoSecop} este proceso ya estaba en la fase «${secop.fase || "posterior"}»: el plazo para avisar que le interesa cerró. Solo pueden presentar oferta quienes avisaron a tiempo (y salieron en el sorteo, si lo hubo).`)
    : contradiccion === "fase_posterior_con_plazo_vivo"
      ? `SECOP II tenía este proceso en la fase «${secop.fase || "posterior"}» el ${cuandoSecop}, pero se publicó el ${legible(v.apertura)} y el plazo para avisar todavía podría estar corriendo: la fase puede venir de una publicación anterior. Entre HOY a SECOP II, mire el «Plazo para manifestación de Interés» y avise si sigue abierto.`
    : estado === "por_abrir"
      ? (secop.observaciones_cerradas
        /* las observaciones ya cerraron: el pliego definitivo —y el plazo— pueden salir en cualquier momento (22-sep-2026) */
        ? `Según SECOP II, el ${cuandoSecop} las observaciones al pliego de este proceso ya habían cerrado (fase «${secop.fase || "anterior"}», estado «${secop.estado || "Evaluación"}») y el plazo para avisar que le interesa todavía no había abierto: abre con el pliego definitivo, puede abrir en cualquier momento y la ley le da como máximo ${PLAZO_MANIFESTACION_HABILES} días hábiles desde entonces. Mire HOY el cronograma del proceso en SECOP II y avise el mismo día que abra.`
        : `Según SECOP II, el ${cuandoSecop} este proceso estaba en la fase «${secop.fase || "anterior"}»: el plazo para avisar que le interesa todavía no ha abierto. Abre con el pliego definitivo y la ley le da como máximo ${PLAZO_MANIFESTACION_HABILES} días hábiles desde entonces, así que siga el cronograma del proceso en SECOP II.`)
      : null;
  const nota = notaFase ? notaFase : confirmada
    ? `Fecha límite tomada del cronograma del pliego (${confirmada}${horaLimite ? `, ${habiles.horaLegible(horaLimite)}` : ", sin hora publicada"}).`
    : v.imposible
      ? `No se puede situar el plazo: el cierre de ofertas publicado (${v.recortePorCierre}) no deja sitio para la manifestación, el sorteo y el plazo de ofertas, así que la fecha de publicación no es la apertura del proceso. Consulte el cronograma en SECOP II.`
      : !v.desde
        ? "El dataset no trae fecha de apertura legible: consulte el cronograma en el SECOP II."
        : estado === "pudo_vencer"
          /* LA FRASE DEL ESTADO NUEVO. Dice el HECHO —nadie publicó la fecha y
             el máximo de ley ya pasó— y no la deducción. Es lo contrario de la
             que costó Motavita: allí se afirmaba una fecha que no constaba; aquí
             se declara que no consta. */
          /* «Nadie ha publicado» SOLO si de verdad nadie publicó nada: cuando se
             leyó una fecha en el pliego y se descartó, decirlo sería contradecir
             al `avisoDescarte` que va pegado dos frases más abajo, dentro de la
             MISMA nota. Una nota que se desmiente a sí misma es peor que una
             corta. */
          ? `Ábralo en SECOP II y mire el «Plazo para manifestación de Interés»: si dice tiempo transcurrido, cerró; si no, todavía puede avisar. ${fueraDeRango ? "No hay ninguna fecha límite que se pueda afirmar" : "Nadie ha publicado la fecha límite de este proceso"} y el máximo que da la ley (${PLAZO_MANIFESTACION_HABILES} días hábiles desde la apertura del ${legible(v.apertura)}${origenApertura}) ya pasó, así que el plazo PUDO cerrarse y no consta que lo hiciera.`
          : `La ley fija un MÁXIMO de ${PLAZO_MANIFESTACION_HABILES} días hábiles desde la apertura (${v.apertura}${origenApertura}), no un plazo fijo: la entidad puede haber puesto menos en el pliego, y a veces son solo unas horas del mismo día. El plazo puede cerrar en cualquier momento entre el ${legible(v.desde)} y el ${legible(v.hasta)}${v.recortePorCierre ? ` (recortado porque las ofertas cierran el ${legible(soloFecha(v.recortePorCierre))})` : ""}. Confírmelo en el cronograma del proceso en SECOP II.`;

  const avisoSecop = secop.recibiendo === true && secop.fecha
    ? ` Según SECOP II, el ${legible(secop.fecha)} este proceso seguía recibiendo manifestaciones de interés; puede haber cerrado desde entonces.`
    : "";
  const notaFinal = nota + avisoDescarte + avisoSecop;   // el descarte y la señal viajan pase lo que pase con la ventana

  return {
    proceso: (l && l.id_del_proceso) || null,
    entidad: (l && l.entidad) || null,
    nit_entidad: soloDigitos(l && l.nit_entidad) || null,
    objeto: (l && (l.nombre_del_procedimiento || l.descripci_n_del_procedimiento)) || null,
    valor: num(l && l.cuantia_cop) || null,           // 0 = sin dato → null
    modalidad: (l && l.modalidad_de_contratacion) || null,
    departamento: (l && l.departamento_entidad) || null,
    apertura: v.apertura,
    aperturaPublicada,                                // true: `fecha_de_publicacion` (la fase de manifestación, publicada); false: supuesto desde la publicación del proceso
    estado, accion,
    /* la ventana: dos extremos, JAMÁS un punto */
    puedeCerrarDesdeISO: v.desde, puedeCerrarDesdeLegible: legible(v.desde),
    venceMaximoISO: v.hasta, venceMaximoLegible: legible(v.hasta),
    /* la fecha afirmable, solo del cronograma del pliego */
    fechaLimiteISO: confirmada, fechaLimiteLegible: legible(confirmada),
    /* y su HORA, cuando el pliego la publica: null es «no consta la hora», que
       NO es la medianoche */
    horaLimite, horaLimiteLegible: horaLimite ? habiles.horaLegible(horaLimite) : null,
    origenFecha: confirmada ? "cronograma" : v.desde ? "ventana_calculada" : "desconocida",
    confirmada: !!confirmada,
    diasHabilesRestantes: quedanHabiles,              // null sin fecha confirmada
    habilesHastaElTecho,                              // solo para ordenar por urgencia
    diasCalendario,
    recortePorCierreOfertas: v.recortePorCierre ? soloFecha(v.recortePorCierre) : null,
    fechaCronogramaDescartada: fueraDeRango ? propuesta : null,
    /* la señal publicada: true = SECOP II lo tenía recibiendo el día `secopFecha` */
    secopRecibia: secop.recibiendo, secopFecha: secop.fecha, secopFechaLegible: legible(secop.fecha),
    /* la POSICIÓN (antes · recibiendo · cerrada · null) y la fase literal, para que
       el refresco de la portada pueda volver a aplicar la señal sin rehacerla */
    secopPosicion: secop.posicion, secopFase: secop.fase, secopEstado: secop.estado, secopEnSorteo: secop.en_sorteo === true,
    secopObservacionesCerradas: secop.observaciones_cerradas === true,   // «antes» con las observaciones ya cerradas (22-sep-2026)
    /* de dónde salió una «vencida»: "cronograma" (pliego) o "fase_secop" */
    origenVencimiento: origenVencimiento,
    /* la fase posterior con la ventana viva: dos datos publicados que no cuadran */
    contradiccion: contradiccion || null,
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
    apertura_publicada: f.aperturaPublicada === true,
    estado: f.estado,                                 // abierta | por_confirmar | pudo_vencer | vencida | sin_fecha | por_abrir
    accion: f.accion,                                 // avise_hoy | verifique_ya | ninguna | verifique | siga_cronograma
    puede_cerrar_desde: f.puedeCerrarDesdeISO,
    puede_cerrar_desde_legible: f.puedeCerrarDesdeLegible,
    vence_a_mas_tardar: f.venceMaximoISO,
    vence_a_mas_tardar_legible: f.venceMaximoLegible,
    fecha_limite: f.fechaLimiteISO,                   // solo del cronograma del pliego
    fecha_limite_legible: f.fechaLimiteLegible,
    hora_limite: f.horaLimite,                        // «18:00» o null; null NO es medianoche
    hora_limite_legible: f.horaLimiteLegible,
    origen: f.origenFecha,
    confirmada: f.confirmada,
    quedan_habiles: f.diasHabilesRestantes,           // null sin fecha confirmada
    dias_calendario: f.diasCalendario,                // null sin fecha confirmada
    habiles_hasta_el_techo: f.habilesHastaElTecho,    // para ordenar, no para afirmar
    recorte_por_cierre_ofertas: f.recortePorCierreOfertas,
    /* la fecha del pliego que se leyó y NO se pudo aceptar (fuera del rango que
       la norma permite): viaja para que el descarte sea auditable, jamás se usa */
    fecha_cronograma_descartada: f.fechaCronogramaDescartada,
    /* lo que SECOP II publicaba sobre el plazo la última vez que vio la fila:
       true = seguía recibiendo el día `secop_fecha`; null = la fila no lo dice */
    secop_recibia: f.secopRecibia, secop_fecha: f.secopFecha, secop_fecha_legible: f.secopFechaLegible,
    /* dónde está el proceso según la fase publicada: "antes" (el plazo no ha
       abierto) · "recibiendo" · "cerrada" (ya pasó) · null (la fase no lo dice) */
    secop_posicion: f.secopPosicion, secop_fase: f.secopFase, secop_en_sorteo: f.secopEnSorteo,
    secop_observaciones_cerradas: f.secopObservacionesCerradas,   // por_abrir con las observaciones ya cerradas: puede abrir en cualquier momento
    origen_vencimiento: f.origenVencimiento,          // "cronograma" | "fase_secop" | null
    contradiccion: f.contradiccion,                   // "fase_posterior_con_plazo_vivo" | null
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
async function guardarFechaCronograma(redis, idProceso, fecha, { hoy = null, clave = CLAVE_CRONOGRAMA, hora = null } = {}) {
  const id = String(idProceso || "").trim();
  const f = soloFecha(fecha);
  if (!redis || !id || !f) return { guardada: false, podadas: 0 };
  /* La HORA se valida aquí y no donde se lee: es la puerta por la que entra al
     almacén, y una hora basura guardada hoy decide un vencimiento mañana. */
  const h = /^([01]\d|2[0-3]):([0-5]\d)$/.test(String(hora || "")) ? String(hora) : null;
  const dia = /^\d{4}-\d{2}-\d{2}$/.test(String(hoy)) ? String(hoy) : habiles.hoyColombia();
  try {
    await redis.hset(clave, { [id]: JSON.stringify(h ? { fecha: f, hora: h, escrito: dia } : { fecha: f, escrito: dia }) });
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
      /* SWAP ATÓMICO, no `del` + `hset`: son dos viajes REST y un corte entre
         ellos dejaba el cronograma ENTERO borrado (y el `catch` de abajo se lo
         tragaba). Mismo patrón que `lib/indice_competencia` y `lib/indice_baja`:
         lo que sobrevive se escribe completo en una clave de trabajo y un solo
         `rename` la pone encima. Si NO sobrevive nada no se puede renombrar
         desde una clave inexistente (RENAME falla en Redis), y ahí el `del` sí
         es correcto: no queda nada que perder. */
      if (podadas) {
        const trabajo = `${clave}:podando`;
        await redis.del(trabajo);
        if (Object.keys(vivos).length) {
          await redis.hset(trabajo, vivos);
          await redis.rename(trabajo, clave);
        } else {
          await redis.del(clave);
        }
      }
    }
    return { guardada: true, podadas };
  } catch { return { guardada: false, podadas: 0 }; }
}

/* Mapa {id_proceso: "YYYY-MM-DD"} —o "YYYY-MM-DDTHH:MM" cuando el pliego
   publicó la hora— con las fechas límite leídas de pliegos. UN comando. Un valor
   corrupto se ignora en silencio (no puede tumbar el listado) y el proceso cae a
   la ventana calculada, que es el comportamiento de siempre.
   La hora viaja DENTRO de la misma cadena, no en un segundo mapa: los registros
   escritos antes de que existiera la hora siguen siendo «YYYY-MM-DD» y se leen
   igual, así que desplegar no exige reconstruir nada. */
async function leerFechasCronograma(redis, { clave = CLAVE_CRONOGRAMA } = {}) {
  if (!redis) return {};
  try {
    const todo = await redis.hgetall(clave);
    const out = {};
    for (const [k, v] of Object.entries(todo || {})) {
      let e = null; try { e = typeof v === "string" && v.startsWith("{") ? JSON.parse(v) : { fecha: v }; } catch { e = null; }
      const f = e && soloFecha(e.fecha);
      if (!f) continue;
      const h = e && /^([01]\d|2[0-3]):([0-5]\d)$/.test(String(e.hora || "")) ? String(e.hora) : null;
      out[k] = h ? `${f}T${h}` : f;
    }
    return out;
  } catch { return {}; }
}

/* ¿Se puede AFIRMAR que todavía vale la pena ir a mirar? Incluye
   `por_confirmar`: excluirlo escondería justo las urgentes. NO incluye
   `pudo_vencer`, donde lo único que consta es que no se sabe: es el predicado
   de las pantallas que CUENTAN oportunidades vivas (la portada, los avisos), y
   ahí decir «todavía puede» sin saberlo sería inventar.  */
const sigueValiendoLaPena = (m) => !!m && (m.estado === "abierta" || m.estado === "por_confirmar");
/* ¿NO CONSTA que el plazo haya vencido? Es el predicado de lo que se ESCONDE, y
   por eso es distinto del anterior aunque se parezcan (encargo del dueño,
   15-sep-2026): se oculta solo lo que SECOP II da por transcurrido, y eso es
   exactamente `vencida`, que desde hoy solo sale de una fecha publicada. Todo lo
   demás —incluida la ventana calculada ya pasada y lo que no se pudo situar— se
   muestra. Dos preguntas distintas, dos nombres distintos: confundirlas era lo
   que escondía procesos vivos. */
const noConstaVencida = (m) => !!m && m.estado !== "vencida";
/* ¿El plazo todavía NO HA ABIERTO según la fase publicada? (22-sep-2026). Entra en
   lo que se ve (no consta vencido) y NO en lo que se afirma vivo hoy ni en lo
   urgente: nadie puede avisar todavía. Tiene nombre propio para que ninguna
   pantalla lo deduzca por descarte. */
const porAbrir = (m) => !!m && m.estado === "por_abrir";
/* todavía no abre, pero las observaciones ya cerraron: puede abrir en cualquier momento (22-sep-2026) */
const porAbrirInminente = (m) => porAbrir(m) && !!m.secop_observaciones_cerradas;
/* LO QUE CONSTA PUBLICADO DE LA FASE, para las pantallas de la espera del sorteo
   (revisión adversaria del 22-sep-2026). `secop_posicion === "cerrada"` NO basta:
   con la contradicción «fase posterior con plazo vivo» la posición es «cerrada»
   y el estado final es `por_confirmar`, y decir ahí «SECOP II ya recibe ofertas»
   es afirmar justo lo que la propia fila pone en duda. Se decide por el ESTADO
   final y su origen, que ya pasaron por `aplicarSenalSecop`; el casillero del
   navegador repite esta misma regla sobre los campos publicados. */
const yaRecibeOfertas = (m) => !!m && m.estado === "vencida" && m.origen_vencimiento === "fase_secop" && !m.secop_en_sorteo;
const enSorteo = (m) => !!m && m.estado === "vencida" && m.origen_vencimiento === "fase_secop" && !!m.secop_en_sorteo;
const faseEnDuda = (m) => !!m && m.contradiccion === "fase_posterior_con_plazo_vivo";
/* ¿Hay que ir a SECOP II HOY? (el rojo). `pudo_vencer` NO entra: el rojo
   significa «actúe hoy» y aquí lo honesto es «verifíquelo», sin fingir una
   urgencia medida — la misma frontera que `sin_fecha`. */
const esUrgente = (m) => !!m && (m.estado === "por_confirmar" || (m.estado === "abierta" && m.confirmada && m.dias_calendario != null && m.dias_calendario <= 1));

module.exports = {
  exigeManifestacion, senalSecop, aplicarSenalSecop, porAbrir, porAbrirInminente, yaRecibeOfertas, enSorteo, faseEnDuda, aperturaDe, aperturaPublicadaDe, ventanaDe, estadoDeVentana, filaManifestacion, manifestacionDeFila,
  guardarFechaCronograma, leerFechasCronograma, CLAVE_CRONOGRAMA, CLAVE_CRONOGRAMA_ADJUDICACION, MAX_FECHAS_CRONOGRAMA,
  sigueValiendoLaPena, noConstaVencida, esUrgente,
  PLAZO_MANIFESTACION_HABILES, PLAZO_MINIMO_HABILES, MARGEN_ANTES_DEL_CIERRE_HABILES,
  MAX_MANIFESTACIONES_SIN_SORTEO, NORMA,
};
