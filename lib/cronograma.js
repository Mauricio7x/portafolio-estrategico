/* lib/cronograma.js · Cronograma del proceso con avisos T-7 / T-3 / T-1 (Fase 5)
   ─────────────────────────────────────────────────────────────────────────────
   Hitos oficiales del proceso —observaciones, cierre, adjudicación…— desde dos
   fuentes: el DATASET (publicación y cierre, siempre) y el TEXTO del pliego
   (el cronograma que trae casi todo pliego, leído con regex sobre las líneas
   que nombran un hito y traen una fecha). Cada hito viaja con su ORIGEN
   («dataset» / «pliego») y su línea de evidencia. Avisos a 7, 3 y 1 día
   (solo los futuros; el «hoy» se inyecta). Exportable a calendario (.ics,
   RFC 5545, todo el día en hora Colombia; VALARM a −7/−3/−1 días).
   Un hito sin fecha legible NO se inventa: se omite y se cuenta. */
"use strict";

const { hoyColombia, fechaLegible, sumarDias } = require("./habiles.js");
const { lineasConPagina } = require("./paginas.js");

/* ORDEN IMPORTA: lo más específico primero («observaciones al proyecto» antes que
   «proyecto de pliego»; «traslado del informe» antes que «informe de evaluación»).

   ══ LOS RÓTULOS DEL CRONOGRAMA TIPO, MEDIDOS (3-nov-2026) ══════════════════
   Medido con las celdas literales de cinco cronogramas reales de menor cuantía
   (detekta-lector, muestra/fichas_A-E; cuatro son el «Anexo2 Cronograma Menor
   Cuantia V3» de Colombia Compra): 30 fechas bien, 18 sin leer y 4 FALSAS. Las
   falsas, reproducidas:
   · «Plazo para manifestación de interés DE LIMITAR LA CONVOCATORIA A MIPYMES»
     va cuatro filas antes que la de la manifestación y casaba con ella: el plazo
     para avisar que le interesa salía 5 y 6 días antes del real (fichas D y E).
     Es el plazo que puede esconder un proceso: por eso va su propio hito ANTES;
   · «Respuesta a observaciones y sugerencias al proyecto de pliego» se leía como
     la publicación del proyecto (ficha C), y una «Respuesta a observaciones al
     pliego» anterior a su plazo se habría leído como el plazo mismo, con la fecha
     de la RESPUESTA, que es posterior: un plazo más tarde que el real es el error
     que hace llegar tarde. Las respuestas tienen hito propio, antes de los plazos;
   · el renglón revuelto «adjudicación o de declaratoria de desierto […] Firma
     del contrato 02 de octubre» daba la adjudicación con la fecha de la firma
     (ficha A): ver `hitoDelRenglon`.
   Los 18 sin leer eran rótulos que no existían: sorteo, informe PRELIMINAR,
   informe FINAL, respuesta a observaciones y limitación a Mipymes.

   Cada hito declara además:
   · `tipo`: «plazo» (una fecha límite: de un rango explícito vale el FIN) o
     «evento» (un día en que pasa algo: de un rango vale el INICIO, como siempre);
   · `accion`: si le pide algo al proponente (va al centro de alertas y a «lo
     próximo que vence»); los demás solo se ven en la línea de tiempo;
   · `etapa`: «antes» o «despues» del cierre. Lo de después solo le importa a
     quien presentó oferta (lib/seguimiento.hitoPide);
   · `corta`: el rótulo corto de la fila de Mis procesos. */
const HITOS = [
  { id: "aviso", etiqueta: "Publicación del aviso de convocatoria", corta: "Aviso de convocatoria", tipo: "evento", accion: false, etapa: "antes", re: /aviso\s+de\s+convocatoria|publicaci[oó]n\s+del\s+aviso/i },
  { id: "respuesta_observaciones_proyecto", etiqueta: "Respuesta de la entidad a las observaciones al proyecto de pliego", corta: "Respuesta a las observaciones al proyecto", tipo: "evento", accion: false, etapa: "antes", re: /respuestas?\s+(?:a|de)\s+(?:las\s+)?observaciones[^\n]*proyecto/i },
  { id: "respuesta_observaciones_informe", etiqueta: "Respuesta de la entidad a las observaciones al informe de evaluación", corta: "Respuesta a las observaciones al informe", tipo: "evento", accion: false, etapa: "despues", re: /respuestas?\s+(?:a|de)\s+(?:las\s+)?observaciones[^\n]*informe/i },
  { id: "respuesta_observaciones_pliego", etiqueta: "Respuesta de la entidad a las observaciones al pliego", corta: "Respuesta a las observaciones al pliego", tipo: "evento", accion: false, etapa: "antes", re: /respuestas?\s+(?:a|de)\s+(?:las\s+)?observaciones/i },
  { id: "observaciones_proyecto", etiqueta: "Fecha límite de observaciones al proyecto de pliego", corta: "Observaciones al proyecto de pliego", tipo: "plazo", accion: true, etapa: "antes", re: /observaciones(?:\s+y\s+sugerencias)?\s+al\s+proyecto/i },
  { id: "proyecto_pliego", etiqueta: "Publicación del proyecto de pliego", corta: "Proyecto de pliego", tipo: "evento", accion: false, etapa: "antes", re: /proyecto\s+de\s+pliego/i },
  { id: "limitacion_mipyme", etiqueta: "Plazo para pedir que el proceso sea solo para Mipymes", corta: "Pedir que sea solo para Mipymes", tipo: "plazo", accion: true, etapa: "antes", re: /limit(?:ar|aci[oó]n)\s+(?:de\s+)?(?:la\s+)?convocatoria|solicitud(?:es)?\s+de\s+limitaci[oó]n/i },
  { id: "manifestacion", etiqueta: "Fecha límite para manifestar interés", corta: "Avisar que le interesa", tipo: "plazo", accion: true, etapa: "antes", re: /manifest(?:aci[oó]n|ar)\s+(?:de\s+)?inter[eé]s/i },
  { id: "sorteo", etiqueta: "Sorteo de los interesados", corta: "Sorteo", tipo: "evento", accion: false, etapa: "antes", re: /\bsorteo\b/i },
  { id: "observaciones_pliego", etiqueta: "Fecha límite de observaciones al pliego", corta: "Observaciones al pliego", tipo: "plazo", accion: true, etapa: "antes", re: /observaciones\s+(?:al\s+pliego|a\s+los\s+t[eé]rminos)|(?:plazo|fecha\s+l[ií]mite)\s+(?:m[aá]ximo\s+)?para\s+(?:la\s+)?(?:presentar|presentaci[oó]n\s+de)\s+(?:las\s+)?observaciones(?![^\n]*informe)/i },
  { id: "audiencia_riesgos", etiqueta: "Audiencia de aclaración del pliego y de riesgos", corta: "Audiencia de riesgos", tipo: "evento", accion: true, etapa: "antes", re: /audiencia[^\n]{0,60}(?:riesgos|aclaraci[oó]n)|(?:asignaci[oó]n|tipificaci[oó]n|estimaci[oó]n)[^\n]{0,40}riesgos/i },
  { id: "pliego_definitivo", etiqueta: "Publicación del pliego definitivo", corta: "Pliego definitivo", tipo: "evento", accion: false, etapa: "antes", re: /pliego\s+(?:de\s+condiciones\s+)?definitivo|apertura\s+del\s+proceso/i },
  { id: "adendas", etiqueta: "Fecha límite para expedir adendas", corta: "Último día para adendas", tipo: "plazo", accion: false, etapa: "antes", re: /(?:expedi(?:r|ci[oó]n)|publica(?:r|ci[oó]n)|emitir|emisi[oó]n)\s+(?:de\s+)?(?:las\s+|la\s+)?adendas?|^\W*adendas?\b/i },
  { id: "informe_final", etiqueta: "Publicación del informe final de evaluación", corta: "Informe final de evaluación", tipo: "evento", accion: false, etapa: "despues", re: /informe\s+(?:final|definitivo)\b|informe\s+de\s+evaluaci[oó]n\s+(?:final|definitivo)/i },
  { id: "traslado", etiqueta: "Traslado del informe (observaciones y subsanaciones)", corta: "Observaciones al informe y subsanación", tipo: "plazo", accion: true, etapa: "despues", re: /traslado\s+del\s+informe|observaciones\s+al\s+informe|traslado\s+(?:para|de)\s+(?:las\s+)?observaciones/i },
  { id: "subsanacion", etiqueta: "Plazo para subsanar lo que pida la entidad", corta: "Subsanar lo que le pidan", tipo: "plazo", accion: true, etapa: "despues", re: /subsan/i },
  { id: "informe_evaluacion", etiqueta: "Publicación del informe de evaluación", corta: "Informe de evaluación", tipo: "evento", accion: true, etapa: "despues", re: /informe\s+(?:preliminar\s+)?de\s+evaluaci[oó]n|informe\s+preliminar/i },
  { id: "cierre", etiqueta: "Cierre: entrega de la oferta", corta: "Entrega de la oferta", tipo: "plazo", accion: true, etapa: "antes", re: /cierre|presentaci[oó]n\s+de\s+(?:las\s+)?ofertas|recepci[oó]n\s+de\s+ofertas/i },
  { id: "adjudicacion", etiqueta: "Adjudicación", corta: "Adjudicación", tipo: "evento", accion: true, etapa: "despues", re: /audiencia\s+de\s+adjudicaci[oó]n|adjudicaci[oó]n/i },
  { id: "firma", etiqueta: "Firma del contrato", corta: "Firma del contrato", tipo: "evento", accion: false, etapa: "despues", re: /firma\s+del\s+contrato|suscripci[oó]n\s+del\s+contrato/i },
];
const HITO_POR_ID = Object.freeze(Object.fromEntries(HITOS.map((h) => [h.id, h])));
/* La versión de las reglas de ESTE lector: entra en la versión de los hechos guardados
   (lib/documentos_proceso.hechosVersion) para que op=documentos rehaga las fechas de lo
   ya leído desde el texto guardado, SIN volver a bajar nada y sin tocar la versión del
   plan de lectura (que relee los Formularios 1 en Excel). */
/* 5 (6-nov-2026): el hito «adendas» exige el acto (expedir, publicar, emitir) o un renglón que empiece por «Adendas»: con
   `/adendas?/` a secas, «Fecha de cierre (modificada por Adenda 1)» y «Plazo para subsanar (ampliado mediante Adenda 2)»
   salían como «Último día para adendas» y el cierre del documento se perdía (pendiente de la revisión del 4-nov, reproducido). */
const VERSION_HITOS = 5;   // 3 (4-nov-2026): el rango «Desde: X Hasta: Y» (con dos puntos, o con punto tras la primera fecha) da el plazo Y. 4 (4-nov-2026): los hechos dicen si el documento habla de modificar el cronograma (`menciona_cronograma`, lib/documentos_proceso)
const MESES = { enero: 1, febrero: 2, marzo: 3, abril: 4, mayo: 5, junio: 6, julio: 7, agosto: 8, septiembre: 9, setiembre: 9, octubre: 10, noviembre: 11, diciembre: 12 };
const iso = (a, m, d) => `${a}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
/* El día se valida contra la LONGITUD REAL del mes: con `d <= 31`, un «31/02»
   producía `2026-02-31` y el .ics salía con `DTSTART;VALUE=DATE:20260231`, una
   fecha que no existe y que un cliente estricto puede rechazar — y con él,
   todas las alarmas del calendario. Una fecha imposible es un hito «sin fecha
   legible», que este módulo ya sabe contar sin inventarla. */
const diasDelMes = (a, m) => new Date(Date.UTC(a, m, 0)).getUTCDate();
const valida = (a, m, d) => m >= 1 && m <= 12 && a >= 2000 && a <= 2100 && d >= 1 && d <= diasDelMes(a, m);

/* ¿ES UN DÍA QUE EXISTE? Devuelve la fecha o null. Se EXPORTA (7-sep-2026)
   porque Mis procesos deja al usuario anotar sus propias fechas y esas caen en
   el MISMO .ics: es el hermano vivo de la guarda de arriba —`Date.parse` no
   sirve de filtro, acepta «2026-02-31» y lo corre al 3 de marzo (medido)— y una
   segunda cuenta de días del mes divergiría de esta a la primera corrección. */
function diaValido(f) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(f == null ? "" : f));
  if (!m) return null;
  return valida(+m[1], +m[2], +m[3]) ? `${m[1]}-${m[2]}-${m[3]}` : null;
}

/* Primera fecha legible en una línea: dd/mm/aaaa · dd-mm-aaaa · aaaa-mm-dd ·
   «12 de agosto de 2026». Devuelve YYYY-MM-DD o null. */
function fechaEnLinea(linea) {
  const s = String(linea || "");
  let m = s.match(/\b(\d{1,2})[/-](\d{1,2})[/-](\d{4})\b/);
  if (m) { const d = +m[1], mo = +m[2], a = +m[3]; if (valida(a, mo, d)) return iso(a, mo, d); }
  m = s.match(/\b(\d{4})-(\d{2})-(\d{2})\b/);
  if (m) { const a = +m[1], mo = +m[2], d = +m[3]; if (valida(a, mo, d)) return iso(a, mo, d); }
  m = s.match(/\b(\d{1,2})\s+de\s+([a-záéíóú]+)\s+(?:de\s+|del\s+)?(\d{4})\b/i);
  if (m) { const d = +m[1], mo = MESES[m[2].toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")] || MESES[m[2].toLowerCase()], a = +m[3]; if (mo && valida(a, mo, d)) return iso(a, mo, d); }
  return null;
}

/* ══ EL RENGLÓN DE UN CRONOGRAMA ES «HITO · INICIO · FIN» (15-sep-2026) ══════
   `fechaEnLinea` devuelve la PRIMERA fecha legible del renglón, y en un
   cronograma de SECOP II el renglón trae dos: «Manifestación de interés ·
   14/09/2026 8:00 a.m. · hasta 16/09/2026 5:00 p.m.». La primera es cuando
   ABRE; la fecha LÍMITE —la única que este proyecto puede afirmar— es la
   última. Medido: con ese renglón, Detekta guardaba el 14 como fecha límite y
   daba el proceso por vencido el 15, con el plazo real corriendo hasta el 16.
   Y como `vencida` es el ÚNICO estado que esconde un proceso, leer el pliego
   EMPEORABA la visibilidad: justo lo contrario de para lo que se leyó.

   Se corrige SOLO donde importa —el hito de la manifestación, que es el que
   puede esconder— y con la MISMA maquinaria: `ultimaFechaEnLinea` recorre las
   coincidencias que `fechaEnLinea` ya sabe reconocer y se queda con la última,
   en vez de estrenar un segundo parser de fechas. Los demás hitos conservan su
   comportamiento: cambiar los doce a la vez es una reforma que nadie ha medido,
   y aquí el error de tomar la primera no esconde nada.
   El error residual cae del lado bueno: si un renglón trajera la fecha de fin
   antes que la de inicio, se tomaría la más tardía y el proceso se vería de
   más, nunca de menos. */
function ultimaFechaEnLinea(linea) {
  const s = String(linea || "");
  let ultima = null;
  /* Se trocea por las fechas que `fechaEnLinea` reconoce y se le pregunta a
     ELLA por cada trozo: una sola definición de «qué es una fecha legible». */
  for (const m of s.matchAll(/\b\d{1,2}[/-]\d{1,2}[/-]\d{4}\b|\b\d{4}-\d{2}-\d{2}\b|\b\d{1,2}\s+de\s+[a-záéíóú]+\s+(?:de\s+|del\s+)?\d{4}\b/gi)) {
    const f = fechaEnLinea(m[0]);
    if (f) ultima = f;
  }
  return ultima || fechaEnLinea(s);
}

/* ══ LA HORA DE CORTE, CUANDO LA LÍNEA LA TRAE (15-sep-2026) ══════════════════
   SECOP II publica el plazo de manifestación de interés CON HORA —«Plazo para
   manifestación de Interés · 17 horas de tiempo transcurrido (14/09/2026
   6:00:00 PM(UTC-05:00) Bogotá, Lima, Quito)»— y los cronogramas de los pliegos
   suelen repetirla. Sin ella, el día del vencimiento es indistinguible a las
   11 de la mañana —plazo abierto— y a las 11 de la noche.

   UNA HORA AMBIGUA ES UNA HORA AUSENTE, y es la decisión que importa aquí:
   «5:00» sin marca puede ser las 5 de la mañana o las 5 de la tarde, y
   equivocarse hacia la mañana esconde un proceso que seguía abierto — el falso
   negativo que esta app paga más caro. Así que solo se acepta lo inequívoco:
   con marca a. m./p. m., o en formato de 24 horas con la hora ≥ 13. Todo lo
   demás devuelve null, y el módulo de la manifestación ya sabe responder sin
   hora (sigue diciendo «puede haber cerrado ya», como hasta hoy). */
const HORA_12_RE = /\b(\d{1,2})(?::([0-5]\d))?(?::[0-5]\d)?\s*([ap])\.?\s?m\.?/i;
const HORA_24_RE = /\b(1[3-9]|2[0-3]):([0-5]\d)(?::[0-5]\d)?\b/;
/* La hora que se busca es la del CORTE, así que se toma la ÚLTIMA del renglón
   por el mismo motivo que la fecha: «14/09/2026 8:00 a.m. · hasta 16/09/2026
   5:00 p.m.» cierra a las 5 de la tarde, no a las 8 de la mañana. */
function horaEnLinea(linea) {
  const s = String(linea || "");
  let ultima = null;
  for (const m of s.matchAll(new RegExp(HORA_12_RE.source, "gi"))) {
    const h = +m[1];
    if (h < 1 || h > 12) continue;
    const pm = m[3].toLowerCase() === "p";
    const hh = pm ? (h === 12 ? 12 : h + 12) : (h === 12 ? 0 : h);   // 12 a. m. es medianoche
    ultima = `${String(hh).padStart(2, "0")}:${m[2] || "00"}`;
  }
  if (ultima) return ultima;
  for (const m of s.matchAll(new RegExp(HORA_24_RE.source, "g"))) ultima = `${m[1]}:${m[2]}`;
  return ultima;
}

/* Hitos leídos del texto del pliego. Un hito solo entra si su línea trae fecha.
   Cada hito viaja con la PÁGINA de la que salió (marcadores de lib/paginas;
   `null` si el texto no los trae): «confirme en el cronograma» es más fácil
   con «pág. 12» delante. */
/* UN EJEMPLO ENTRE CORCHETES NO ES UN HITO (18-oct-2026, reproducido): la plantilla dice «[Por ejemplo, si
   la audiencia de adjudicación se realiza el 10 de febrero de 2020…]», y como cada hito se toma una sola
   vez, el ejemplo entraba como adjudicación Y tapaba la fecha real que venía después. Se quita del texto
   todo tramo entre corchetes que se anuncia como ejemplo; los saltos de línea del tramo se conservan para
   que las páginas no se corran. */
const EJEMPLO_ENTRE_CORCHETES_RE = /\[[^\]]{0,800}\]/g;
const ES_EJEMPLO_RE = /^\[\s*(?:por\s+ejemplo|ejemplo\s*[:,.]|ej\.\s)/i;
function sinEjemplos(texto) {
  return String(texto || "").replace(EJEMPLO_ENTRE_CORCHETES_RE, (tramo) => (ES_EJEMPLO_RE.test(tramo) ? tramo.replace(/[^\n]/g, " ") : tramo));
}

/* ══ UN RANGO EXPLÍCITO: «del X al Y», «desde X hasta Y», «X – Y» (3-nov-2026) ══
   Entre las dos fechas solo cabe el conector (y, si acaso, la hora de la primera):
   «Cierre 20/10/2026 · Informe 27/10/2026» NO es un rango, son dos filas pegadas,
   y tomar la última ahí daría un plazo MÁS TARDE que el real, que es el error que
   hace llegar tarde (la razón por la que el 15-sep no se tocaron los demás hitos).
   Devuelve {desde, hasta} o null. */
const FECHA_TOKEN_RE = /\b\d{1,2}[/-]\d{1,2}[/-]\d{4}\b|\b\d{4}-\d{2}-\d{2}\b|\b\d{1,2}\s+de\s+[a-záéíóú]+\s+(?:de\s+|del\s+)?\d{4}\b/gi;
/* «Desde: 21 de septiembre del 2026 Hasta: 23 de septiembre del 2026» (4-nov-2026, medido): es la fila del traslado del Anexo 2 de
   Colombia Compra en 19 de 38 anexos reales, y sin aceptar «Hasta:» con dos puntos —ni el punto que algunos ponen tras la primera
   fecha— el plazo salía el PRIMER día, dos a cinco días antes del que la entidad escribió. Sigue sin caber nada más entre las dos
   fechas: «Cierre 20/10/2026. Informe 27/10/2026» no es un rango. */
/* el punto, SOLO antes de «hasta» (revisión adversaria del 4-nov-2026): con él delante de cualquier conector, «Cierre del proceso
   20/10/2026. A 27/10/2026 se publica el informe» daba el cierre el 27 —un plazo MÁS TARDE que el real— */
const CONECTOR_RANGO_RE = /^\s*(?:,?\s*(?:a\s+las\s+)?\d{1,2}(?::[0-5]\d){1,2}\s*(?:[ap]\.?\s?m\.?)?)?\s*[·,;|]?\s*(?:\.?\s*hasta(?:\s+el)?\s*:?|al|a|–|—|-)\s*(?:el\s+)?$/i;
function fechasConPosicion(linea) {
  const out = [];
  for (const m of String(linea || "").matchAll(FECHA_TOKEN_RE)) {
    const f = fechaEnLinea(m[0]);
    if (f) out.push({ fecha: f, inicio: m.index, fin: m.index + m[0].length });
  }
  return out;
}
/* SOLO EL PAR QUE EMPIEZA EN LA PRIMERA FECHA (revisión adversaria del 3-nov-2026, reproducido): con
   dos filas pegadas —«Observaciones al pliego 10/10/2026 Audiencia de adjudicación del 20/10/2026 al
   21/10/2026»— el rango de la fila SIGUIENTE le daba a la primera un plazo once días más tarde. */
function rangoEnLinea(linea) {
  const s = String(linea || "");
  const fs = fechasConPosicion(s);
  if (fs.length < 2) return null;
  const entre = s.slice(fs[0].fin, fs[1].inicio);
  return CONECTOR_RANGO_RE.test(entre) && fs[1].fecha >= fs[0].fecha ? { desde: fs[0].fecha, hasta: fs[1].fecha } : null;
}
/* LA HORA DE UN HITO QUE NO ES LA MANIFESTACIÓN (revisión adversaria del 3-nov-2026, reproducido): con
   dos filas pegadas —«Cierre … 27/10/2026 a las 10:00 a.m. Audiencia de apertura 27/10/2026 a las
   10:30 a.m.»— la ÚLTIMA hora del renglón es la de la otra fila, y el cierre salía a las 10:30. Una
   hora ambigua es una hora ausente: con más fechas o más horas de las que el hito explica, null. */
function contarHoras(linea) {
  const s = String(linea || "");
  return [...s.matchAll(new RegExp(HORA_12_RE.source, "gi"))].length || [...s.matchAll(new RegExp(HORA_24_RE.source, "g"))].length;
}
function horaDelHito(linea, rango) {
  const tope = rango ? 2 : 1;
  if (fechasConPosicion(linea).length > tope || contarHoras(linea) > tope) return null;
  return horaEnLinea(linea);
}

/* ══ DE QUÉ HITO ES LA FECHA DEL RENGLÓN (3-nov-2026) ══════════════════════════
   Manda el ORDEN de HITOS (lo más específico primero). Con UNA excepción, medida
   en la ficha A: el lector de PDF pega dos filas de la tabla en un renglón —«…
   adjudicación o de declaratoria de desierto [Enlace SECOP II] Dto. 1082/15 art.
   2.2.1.1.1.7.1. Firma del contrato 02 de octubre de 2026»— y la fecha es de la
   fila que ABRE más cerca de ella. Solo se reasigna a un rótulo que empieza fila
   de verdad: sin solapar con el primero, antes de la fecha, en MAYÚSCULA y detrás
   de un punto, un corchete o un paréntesis que cierra. Un rótulo en minúscula
   dentro de la misma frase («traslado … (plazo máximo para presentación de
   subsanaciones)») es la misma fila y no mueve nada. */
function abreFila(linea, i) {
  const c = linea.charAt(i);
  if (!c || c === c.toLowerCase() || c !== c.toUpperCase()) return false;
  return /[.\])]\s*$/.test(linea.slice(0, i));
}
function hitoDelRenglon(linea, vistos) {
  const casan = [];
  HITOS.forEach((h, orden) => {
    if (vistos.has(h.id)) return;
    const m = h.re.exec(linea);
    if (m) casan.push({ h, orden, inicio: m.index, fin: m.index + m[0].length });
  });
  if (!casan.length) return null;
  const fs = fechasConPosicion(linea);
  const posFecha = fs.length ? fs[0].inicio : -1;
  /* el rótulo de la fecha va ANTES de ella (revisión adversaria del 3-nov-2026, reproducido): en
     «… observaciones al pliego 10/10/2026 Respuesta a observaciones 12/10/2026» la respuesta, que va
     antes en el ORDEN pero después de la fecha, se quedaba con el plazo de observaciones */
  const antes = posFecha >= 0 ? casan.filter((c) => c.inicio < posFecha) : casan;
  const candidatos = antes.length ? antes : casan;
  let elegido = candidatos[0];
  /* un PLAZO del proponente le gana a un EVENTO de la entidad cuando los dos rótulos, sin pisarse,
     preceden a la misma fecha: «Plazo para presentar observaciones al pliego … y respuesta a las
     observaciones 10/10/2026» es el plazo de observaciones (revisión adversaria, 3-nov-2026). Perder
     el plazo es el error caro; la respuesta de la entidad no le pide nada. */
  if (elegido.h.tipo === "evento") {
    const plazoAntes = candidatos.filter((c) => c.h.tipo === "plazo" && c.h.accion && c.fin <= elegido.inicio);
    if (plazoAntes.length) elegido = plazoAntes[0];
  }
  if (posFecha > elegido.fin) {
    const despues = candidatos.filter((c) => c.inicio >= elegido.fin && c.inicio < posFecha && abreFila(linea, c.inicio));
    if (despues.length) elegido = despues.sort((a, b) => b.inicio - a.inicio || a.orden - b.orden)[0];
  }
  return elegido.h;
}

/* ══ EL MISMO LECTOR PARA UN TEXTO Y PARA UNA HOJA DE CÁLCULO (3-nov-2026) ══════
   `extraerHitos` parte un TEXTO en renglones con su página; el cronograma en Excel
   (lib/cronograma_excel) ya llega en renglones —«rótulo + fecha» de cada fila— con
   su ancla (hoja y celda) en vez de página. Los dos pasan por ESTE recorrido: una
   sola regla de qué hito es cada renglón y qué fecha vale, no un segundo lector que
   divergiría a la primera corrección. Cada renglón: { linea, pagina?, hoja?, celda? }. */
const CELDA_RE = /^[A-Z]{1,3}[1-9]\d{0,6}$/;
const MAX_HOJA_NOMBRE = 31;   // Excel no deja nombrar una hoja con más de 31 caracteres
const hojaValida = (h) => (typeof h === "string" && h.trim() && h.length <= MAX_HOJA_NOMBRE && !/[\u0000-\u001f]/.test(h) ? h.trim() : null);
/* el ancla de una fecha leída de una celda: viaja COMPLETA (hoja y celda) o no viaja */
const anclaDe = (x) => (x && CELDA_RE.test(String(x.celda || "")) && hojaValida(x.hoja) ? { hoja: hojaValida(x.hoja), celda: String(x.celda) } : {});
function extraerHitos(texto) {
  return extraerHitosDeLineas(lineasConPagina(sinEjemplos(texto)));
}
function extraerHitosDeLineas(lineas) {
  const hitos = [];
  let sinFecha = 0;
  const vistos = new Set();
  for (const { linea, pagina, hoja, celda } of lineas || []) {
    const h = hitoDelRenglon(linea, vistos);
    if (!h) continue;
    /* La manifestación toma la ÚLTIMA fecha del renglón (es la fecha LÍMITE y es la
       única que puede esconder un proceso; ver `ultimaFechaEnLinea`). Los demás
       PLAZOS toman el fin de un rango EXPLÍCITO (3-nov-2026); sin rango, la primera,
       como siempre. Los EVENTOS, la primera: el día en que pasa. */
    const rango = rangoEnLinea(linea);
    const f = h.id === "manifestacion" ? ultimaFechaEnLinea(linea)
      : h.tipo === "plazo" && rango ? rango.hasta : fechaEnLinea(linea);
    if (!f) { sinFecha++; continue; }
    const extra = rango ? (h.tipo === "plazo" || h.id === "manifestacion" ? (rango.desde < f ? { desde: rango.desde } : {}) : (rango.hasta > f ? { hasta: rango.hasta } : {})) : {};
    hitos.push({ id: h.id, etiqueta: h.etiqueta, fecha: f, hora: h.id === "manifestacion" ? horaEnLinea(linea) : horaDelHito(linea, rango), origen: "pliego", evidencia: linea.trim().slice(0, 160), pagina: pagina == null ? null : pagina, ...anclaDe({ hoja, celda }), ...extra });
    vistos.add(h.id);
  }
  return { hitos, lineas_hito_sin_fecha: sinFecha };
}

/* Hitos que da el DATASET para una fila del corpus. */
function hitosDeFila(l) {
  const out = [];
  const pub = String((l && (l.fecha_de_publicacion_del || l.fecha_de_ultima_publicaci)) || "").slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(pub)) out.push({ id: "publicacion", etiqueta: "Publicación del proceso en SECOP II", fecha: pub, origen: "dataset", evidencia: "fecha_de_publicacion_del" });
  const cierre = String((l && l.fecha_cierre) || "").slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(cierre)) out.push({ id: "cierre", etiqueta: "Cierre: entrega de la oferta", fecha: cierre, origen: "dataset", evidencia: "fecha de recepción de ofertas (SECOP II)" });
  return out;
}

/* Une dataset + pliego y ordena por fecha.

   ══ SI LOS DOS TRAEN EL MISMO HITO, MANDA SECOP II (3-nov-2026) ════════════
   Hasta hoy mandaba el pliego («la fuente oficial más fina»). Pero el pliego tipo
   dice lo contrario, literal: «El cronograma del proceso es el contenido en el
   Anexo 2 – Cronograma. En caso de alguna inconsistencia prevale lo establecido en
   la plataforma» (ficha B de detekta-lector, pág. 6 del pliego). Y es lo que pasa:
   en la ficha D el anexo decía cierre el 15 de julio y el cierre se hizo el 16, y
   la plataforma es lo que se actualiza con cada adenda; el texto leído puede ser
   el de una versión vieja. Además el lector toma fechas por renglón, y una fecha
   leída mal no puede tapar la publicada. Lo del documento no se calla: viaja en
   `otra_fecha` para que la pantalla diga «el cronograma dice otra cosa: confírmelo
   en SECOP II». Con el MISMO día, el documento aporta su hora (el dato abierto no
   la publica: public/calendario.js). */
function combinarHitos(delDataset, delPliego) {
  const porId = new Map();
  for (const h of delDataset || []) porId.set(h.id, h);
  for (const h of delPliego || []) {
    const ya = porId.get(h.id);
    if (!ya) { porId.set(h.id, h); continue; }
    /* donde viaja la página viaja también el ANCLA de una hoja de cálculo (3-nov-2026): la hora, la
       confirmación y la otra fecha de un cronograma en Excel dicen su hoja y su celda, no «sin página» */
    if (ya.fecha === h.fecha) {
      porId.set(h.id, { ...ya, ...(h.hora && !ya.hora ? { hora: h.hora, hora_segun: { origen: h.origen, documento: h.documento || null, tipo_documento: h.tipo_documento || null, pagina: h.pagina == null ? null : h.pagina, ...anclaDe(h) } } : {}), confirmada_en: { origen: h.origen, documento: h.documento || null, pagina: h.pagina == null ? null : h.pagina, ...anclaDe(h), evidencia: h.evidencia || null } });
    } else {
      porId.set(h.id, { ...ya, otra_fecha: { fecha: h.fecha, hora: h.hora || null, origen: h.origen, documento: h.documento || null, tipo_documento: h.tipo_documento || null, pagina: h.pagina == null ? null : h.pagina, ...anclaDe(h), evidencia: h.evidencia || null } });
    }
  }
  return [...porId.values()].sort((a, b) => a.fecha.localeCompare(b.fecha));
}

/* La frase de «cuánto falta», en UN sitio: la usan la alarma del .ics, el recordatorio T-7/3/1 (con
   los días del escalón, que son los que faltarán EL DÍA DEL AVISO) y el centro de
   alertas (con los que faltan HOY). Dos redacciones del mismo aviso divergirían. */
const faltanPara = (dias, etiqueta) => (dias === 0 ? `Es hoy: ${etiqueta}` : `${dias === 1 ? "Falta 1 día" : `Faltan ${dias} días`} para: ${etiqueta}`);
function fraseFaltan(dias, etiqueta, fecha) {
  return `${faltanPara(dias, etiqueta)} (${fechaLegible(fecha)}).`;
}

/* ══ UNA FECHA QUE NO CUADRA CON LAS DEMÁS DE SU DOCUMENTO (4-nov-2026, encargo del dueño) ══════════
   En CO1.REQ.10974584 la entidad escribió «18 de diciembre del 2026» para el informe preliminar (celda
   D27), entre un cierre del 17-sep y una adjudicación del 25-sep: es lo que dice el documento, y salía
   así, citado con su celda. Aquí se miran SOLO las relaciones que ningún cronograma de obra rompe —lo de
   antes del cierre va antes del cierre, lo de después va después, y la evaluación va en su orden—; el
   orden entre las actividades previas al cierre cambia de plantilla a plantilla y no se mira. De cada
   choque se marca la fecha con MÁS choques (con empate, todas las empatadas), y se repite hasta que no
   quede ninguno: en el caso real sale solo el informe, no las cuatro fechas buenas que lo rodean. Se
   MARCA, no se esconde (lib/seguimiento lo dice como «verifíquela»): falta un dato cierto si se quita.
   Medido sobre los 38 anexos reales que pasan la puerta: 2 marcados, los dos errores de la entidad. */
const CADENA_EVALUACION = Object.freeze(["cierre", "informe_evaluacion", "traslado", "informe_final", "adjudicacion", "firma"]);
function fechasFueraDeOrden(hitos) {
  const hs = (hitos || []).filter((h) => h && HITO_POR_ID[h.id] && h.id !== "manifestacion" && diaValido(String(h.fecha).slice(0, 10)));
  const debeIrAntes = (a, b) => (b.id === "cierre" && a.id !== "cierre" && HITO_POR_ID[a.id].etapa === "antes")
    || (a.id === "cierre" && b.id !== "cierre" && HITO_POR_ID[b.id].etapa === "despues")
    || (CADENA_EVALUACION.indexOf(a.id) >= 0 && CADENA_EVALUACION.indexOf(b.id) > CADENA_EVALUACION.indexOf(a.id));
  let choques = [];
  for (const a of hs) for (const b of hs) if (a !== b && debeIrAntes(a, b) && String(a.fecha).slice(0, 10) > String(b.fecha).slice(0, 10)) choques.push([a.id, b.id]);
  const marcados = new Set();
  while (choques.length) {
    const cuenta = new Map();
    for (const [x, y] of choques) { cuenta.set(x, (cuenta.get(x) || 0) + 1); cuenta.set(y, (cuenta.get(y) || 0) + 1); }
    const mas = Math.max(...cuenta.values());
    /* EL CIERRE ES EL ANCLA (revisión adversaria del 4-nov-2026, reproducido): una línea mal leída que choca solo con el cierre
       empataba con él, se marcaban las dos y el documento perdía su cierre para compararlo con SECOP II —y con él el «verifíquela»
       de todas sus fechas—. Con empate se marca la OTRA; el cierre solo cae si choca con más fechas que ninguna. */
    let empatados = [...cuenta].filter(([, n]) => n === mas).map(([id]) => id);
    if (empatados.length > 1 && empatados.includes("cierre")) empatados = empatados.filter((id) => id !== "cierre");
    for (const id of empatados) marcados.add(id);
    choques = choques.filter(([x, y]) => !marcados.has(x) && !marcados.has(y));
  }
  return marcados;
}
/* LA FRASE DE UNA FECHA QUE HAY QUE CONFIRMAR (4-nov-2026), en UN sitio: la dicen el centro de alertas, el
   correo y el .ics; la pantalla pone la misma con su marca. `verificar` lo resuelve lib/seguimiento.hitosDe. */
const notaVerificar = (h) => (h && typeof h.verificar === "string" && h.verificar.trim() ? `Verifíquela en SECOP II: ${h.verificar.trim()}.` : "");

/* Avisos a T-7, T-3 y T-1 de cada hito FUTURO (o de hoy). Son RECORDATORIOS con su
   día (`aviso`): el mensaje es verdad ese día, no antes. Quien enseña una lista de
   «lo que viene» no repite este mensaje: cuenta lo que falta hoy (`alertasDe`). */
function avisosDe(hitos, hoy) {
  const h0 = hoy || hoyColombia();
  const out = [];
  for (const h of hitos) {
    if (h.fecha < h0) continue;
    for (const d of [7, 3, 1]) {
      const cuando = sumarDias(h.fecha, -d);
      if (cuando < h0) continue;
      /* `origen` viaja (3-nov-2026): el centro de alertas filtra por etapa solo las fechas leídas de los documentos */
      out.push({ hito: h.id, etiqueta: h.etiqueta, fecha_hito: h.fecha, aviso: cuando, dias_antes: d, mensaje: fraseFaltan(d, h.etiqueta, h.fecha), origen: h.origen || null,
        ...(notaVerificar(h) ? { verificar: h.verificar } : {}) });
    }
  }
  return out.sort((a, b) => a.aviso.localeCompare(b.aviso) || a.dias_antes - b.dias_antes);
}

/* OJO: `"\\;"` en JavaScript es solo `";"` — la barra hay que escaparla. El
   punto y coma quedaba CRUDO en la salida (RFC 5545 §3.3.11), y la DESCRIPTION
   lleva una línea literal del pliego, donde el «;» es frecuente. */
const escIcs = (s) => String(s || "").replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
const compacta = (isoFecha) => String(isoFecha).replace(/-/g, "");
/* DE DÓNDE SALE LA FECHA, DICHO DENTRO DEL PROPIO EVENTO (7-sep-2026).
   El «si no, SECOP II» de antes era cierto mientras los orígenes fueran
   dataset · pliego · calculado. Desde que el usuario puede anotar SUS PROPIAS
   fechas en Mis procesos (`origen: "usted"`), ese remate le habría estampado
   «Fuente: SECOP II» a una nota suya: una afirmación falsa, creíble y bien
   maquetada sobre el origen del dato — justo lo que este proyecto persigue. */
function fuenteDeHito(h) {
  /* desde el 3-nov-2026 las fechas también salen de los documentos leídos (adenda, anexo del cronograma,
     aviso…): se nombra el documento, que es lo que el usuario busca en SECOP II para confirmarla */
  /* una fecha leída de una hoja de cálculo dice su hoja y su celda: es lo que el usuario abre en Excel para comprobarla */
  const ancla = anclaDe(h);
  if (h.origen === "pliego" && h.documento && ancla.celda) return `${h.tipo_documento || "documento de la entidad"} «${h.documento}», hoja ${ancla.hoja}, celda ${ancla.celda}`;
  if (h.origen === "pliego" && h.documento) return `${h.tipo_documento || "documento de la entidad"} «${h.documento}»${h.pagina != null ? `, pág. ${h.pagina}` : ""}`;
  if (h.origen === "pliego") return `cronograma del pliego${h.pagina != null ? ` (pág. ${h.pagina})` : ""}`;
  if (h.origen === "calculado") return "fecha CALCULADA por Detekta, no publicada";
  if (h.origen === "usted") return "fecha que usted anotó en Detekta, no publicada por la entidad";
  return "SECOP II";
}

/* Calendario .ics de VARIOS procesos en un solo archivo (7-sep-2026): la agenda
   de Mis procesos se baja de una vez. Es el MISMO constructor de eventos que el
   de un proceso suelto —`ics()` es esta función con un grupo—, para que el .ics
   de una ficha y el de la agenda entera no puedan divergir a la primera
   corrección. Cada grupo trae su `uidBase` (el id del proceso): dos procesos
   pueden llamarse igual y el UID tiene que seguir siendo único. */
function icsDeGrupos(grupos) {
  const lineas = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Detekta//Cronograma//ES", "CALSCALE:GREGORIAN", "METHOD:PUBLISH"];
  const sello = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  for (const g of grupos || []) {
    const proceso = g.proceso || "", entidad = g.entidad || "", uidBase = g.uidBase || "detekta";
    for (const h of g.hitos || []) {
      const fin = sumarDias(h.fecha, 1);
      lineas.push("BEGIN:VEVENT",
        `UID:${uidBase}-${escIcs(proceso || "proceso")}-${h.id}-${compacta(h.fecha)}@detekta`,
        `DTSTAMP:${sello}`,
        `DTSTART;VALUE=DATE:${compacta(h.fecha)}`,
        `DTEND;VALUE=DATE:${compacta(fin)}`,
        `SUMMARY:${escIcs(`${h.etiqueta}${proceso ? ` · ${proceso}` : ""}`)}`,
        `DESCRIPTION:${escIcs(`${entidad ? entidad + ". " : ""}${notaVerificar(h) ? `${notaVerificar(h)} ` : ""}Fuente: ${fuenteDeHito(h)}. ${h.evidencia || ""}`)}`);
      /* `sin_alarma` (3-nov-2026): lo que no le pide nada en su etapa va al calendario como evento, sin
         alarmas —once fechas por proceso con tres alarmas cada una eran 33 recordatorios de ruido— */
      if (!h.sin_alarma) for (const d of [7, 3, 1]) {
        lineas.push("BEGIN:VALARM", "ACTION:DISPLAY", `DESCRIPTION:${escIcs(faltanPara(d, h.etiqueta))}`, `TRIGGER:-P${d}D`, "END:VALARM");
      }
      lineas.push("END:VEVENT");
    }
  }
  lineas.push("END:VCALENDAR");
  return lineas.join("\r\n") + "\r\n";
}

/* Calendario .ics: un VEVENT de todo el día por hito, con VALARM a −7/−3/−1. */
function ics(hitos, { proceso = "", entidad = "", uidBase = "detekta" } = {}) {
  return icsDeGrupos([{ hitos, proceso, entidad, uidBase }]);
}

/* LA FORMA EN QUE UNA FECHA LEÍDA SE GUARDA PARA MIS PROCESOS (3-nov-2026). Va en un
   hash que Mis procesos lee con UN comando por cada apertura (lib/manifestacion,
   `leerHitosCronograma`), así que el peso se acota AQUÍ, en la puerta: como mucho
   MAX_HITOS_GUARDADOS fechas por proceso, el renglón recortado a 120 caracteres y el
   nombre del documento a 80. Solo pasa lo que es un día que existe; nada se rellena. */
const MAX_HITOS_GUARDADOS = 20;
/* un texto recortado TERMINA en «…»: el renglón citado cortado a mitad de una fecha («… subsanaciones) 20»,
   visto en el navegador el 3-nov-2026) se leía como si la fecha fuera «20» */
const corta = (s, n) => { const t = String(s == null ? "" : s).replace(/\s+/g, " ").trim(); return !t ? null : t.length > n ? `${t.slice(0, n - 1)}…` : t; };
function compactarHitos(hitos) {
  const out = [];
  for (const h of hitos || []) {
    if (!h || !HITO_POR_ID[h.id] || !diaValido(h.fecha)) continue;
    const hora = /^([01]\d|2[0-3]):[0-5]\d$/.test(String(h.hora || "")) ? h.hora : null;
    out.push({ id: h.id, etiqueta: HITO_POR_ID[h.id].etiqueta, fecha: h.fecha, ...(hora ? { hora } : {}),
      ...(diaValido(h.desde) ? { desde: h.desde } : {}), ...(diaValido(h.hasta) ? { hasta: h.hasta } : {}),
      origen: "pliego", pagina: Number.isInteger(h.pagina) && h.pagina > 0 ? h.pagina : null, ...anclaDe(h), evidencia: corta(h.evidencia, 120),
      documento: corta(h.documento, 80), tipo_documento: corta(h.tipo_documento, 40), ...(diaValido(h.documento_fecha) ? { documento_fecha: h.documento_fecha } : {}),
      /* lo que el documento dice de sí mismo y que lib/seguimiento compara (4-nov-2026): su propio cierre y si esta fecha choca con las suyas */
      ...(diaValido(h.cierre_documento) ? { cierre_documento: h.cierre_documento } : {}), ...(h.fuera_de_orden === true ? { fuera_de_orden: true } : {}) });
    if (out.length >= MAX_HITOS_GUARDADOS) break;
  }
  return out;
}

module.exports = { HITOS, HITO_POR_ID, VERSION_HITOS, MAX_HITOS_GUARDADOS, CADENA_EVALUACION, fechasFueraDeOrden, notaVerificar, fechaEnLinea, ultimaFechaEnLinea, horaEnLinea, rangoEnLinea, extraerHitos, extraerHitosDeLineas, anclaDe, hitosDeFila, combinarHitos, compactarHitos, fraseFaltan, avisosDe, ics, icsDeGrupos, fuenteDeHito, diaValido };
