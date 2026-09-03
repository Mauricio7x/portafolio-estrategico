/* lib/dictamen_reglas.js · EL DICTAMEN POR REGLAS, SIN MODELO (proyecto «Don Héctor», 3-sep-2026)
   ─────────────────────────────────────────────────────────────────────────────
   El dueño no va a pagar una clave de API aparte de su suscripción, y sin clave
   la op `dictamen` respondía 503 para siempre. Este módulo produce, a partir del
   TEXTO GUARDADO del pliego (con marcadores `\f<n>` de página) y de la MISMA
   `entrada` que recibe el modelo (`armarEntrada`), un objeto con la forma EXACTA
   de `ESQUEMA_SALIDA` de lib/dictamen.js. El handler lo pasa por la MISMA
   `verificarDictamen` (citas buscadas en su página, censo de cifras, acusaciones y
   lenguaje, rebaja del veredicto) y lo pinta la MISMA pantalla: no hay un segundo
   contrato ni una segunda verificación.

   Qué es y qué no es:
   · Es una LECTURA POR REGLAS: expresiones regulares por línea, con la página de
     la línea como cita. Encuentra lo que el pliego escribe con las palabras
     habituales; no entiende un pliego redactado de otra forma y no infiere.
   · NO inventa cifras: cada número que aparece en un texto sale de la cita (la
     línea del pliego) o de la entrada (el perfil), que son los dos respaldos que
     `verificarDictamen` admite. Los textos propios van SIN números.
   · «No encontrado en el pliego» es un RESULTADO con el nombre de lo buscado:
     el pliego puede decirlo con otras palabras. Por eso el veredicto solo baja a
     «no conviene presentarse» con un requisito NUMÉRICO incumplido y citado —la
     misma regla que la verificación impone al modelo— y todo lo demás deja el
     veredicto en «con reservas».
   · Registro de usted, sin siglas sueltas fuera de las citas, sin emojis: los
     textos pasan las cercas de lib/lenguaje_pantalla igual que los del modelo.
   · `REGLAS_VERSION` entra en la clave de caché como «modelo»: cambiar una regla
     invalida los dictámenes por reglas guardados y NUNCA se confunde con los del
     modelo ni con los de una sesión. */
"use strict";

const { lineasConPagina } = require("./paginas.js");

const REGLAS_VERSION = "reglas-2026-09-03.1";
const MOTOR = "reglas";
const CITA_MIN_CRUDA = 24;   // por debajo, la cita plegada no llega al mínimo de la verificación
const CITA_MAX_CRUDA = 190;

const plegar = (s) => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, " ").trim();

/* ── los detectores por tipo de requisito ────────────────────────────────────
   Cada uno: la regex sobre la línea PLEGADA, el `tipo` del esquema, el texto
   llano (sin cifras) y, para requisitos, el motivo del estado «sin dato». */
const DETECTORES = [
  { tipo: "personal", re: /\b(?:director de obra|residente de obra|ingeniero residente|profesional(?:es)? (?:minimo|exigido|requerido)|personal minimo|equipo (?:minimo )?de trabajo|inspector (?:siso|sst)|profesional (?:siso|sst|ambiental))\b/,
    texto: "El pliego exige personal con perfil y experiencia determinados.", pendiente: "Confirme que cuenta con el personal exigido (hojas de vida, tarjeta profesional y cartas de compromiso): la aplicación no registra su equipo de trabajo." },
  { tipo: "equipos_o_laboratorio", re: /\b(?:equipo minimo|equipos minimos|maquinaria (?:minima|requerida|exigida)|laboratorio (?:de suelos|de materiales|certificado|acreditado)|planta de asfalto|planta de concreto|retroexcavadora|motoniveladora|vibrocompactador|volquetas?)\b/,
    texto: "El pliego exige equipos o laboratorio propios o disponibles.", pendiente: "Confirme la disponibilidad de los equipos o el laboratorio exigidos (propios o alquilados con carta de compromiso): la aplicación no registra sus equipos." },
  { tipo: "certificaciones", re: /\b(?:iso ?\d{4}|icontec|ntc ?\d{2,5}|retie|retilap|certificad[oa]s? (?:de|en) (?:calidad|gestion|sistemas)|sistema de gestion (?:de calidad|ambiental|de seguridad))\b/,
    texto: "El pliego menciona certificaciones o normas técnicas.", pendiente: "Confirme si la certificación se exige para participar, si da puntaje o si solo aplica a la ejecución: la aplicación no registra sus certificaciones." },
  { tipo: "garantias", re: /\bgarantia (?:unica |de )?(?:seriedad|cumplimiento|estabilidad|calidad|salarios|prestaciones|responsabilidad civil|buen manejo)\b/,
    texto: "El pliego fija las garantías que hay que constituir.", pendiente: "Cotice con su aseguradora las garantías exigidas con sus porcentajes y vigencias: el costo va en su administración." },
  { tipo: "multas", re: /\b(?:multas?|clausula penal|apremio)\b.*(?:%|por ciento|por mil|por cada dia|diario|diaria)/,
    texto: "El pliego fija multas o cláusula penal por atraso o incumplimiento.", pendiente: "Lea la cláusula de multas completa: el porcentaje, la base sobre la que se aplica y el procedimiento." },
  { tipo: "forma_de_pago", re: /\b(?:forma de pago|actas? parciales?|acta de recibo parcial|pago mensual|pagos mensuales|se pagara|se cancelara|contra (?:entrega|acta)|pago unico|un solo pago|pago final)\b/,
    texto: "El pliego describe cómo y cuándo paga la entidad.", pendiente: "Haga el flujo de caja mes a mes con esa forma de pago antes de fijar el precio." },
  { tipo: "anticipo_o_pago_anticipado", re: /\b(?:anticipo|pago anticipado)\b/,
    texto: "El pliego menciona anticipo o pago anticipado.", pendiente: "Confirme el porcentaje, si va a fiducia y cómo se amortiza en cada acta." },
  { tipo: "item_sin_valor", re: /\b(?:sin valor|no tendra costo|a cargo del contratista|sin costo (?:para|adicional)|no genera(?:ra)? costo|por cuenta del contratista|a su costa)\b/,
    texto: "El pliego pone actividades u obligaciones a cargo del contratista sin valor asignado.", pendiente: "Sume esas obligaciones a su administración: no están en el presupuesto oficial y se pagan de su ganancia." },
  { tipo: "subcontratista_o_proveedor_impuesto", re: /\b(?:subcontratista|subcontratacion|proveedor(?:es)?)\b.*\b(?:autorizad|aprobad|designad|unicamente|exclusiv|previa aprobacion|previa autorizacion)/,
    texto: "El pliego condiciona la subcontratación o los proveedores a la aprobación de la entidad.", pendiente: "Pregunte por escrito qué proveedores o subcontratistas admite la entidad y bajo qué criterio." },
  { tipo: "marca_sin_equivalente", re: /\b(?:marca|referencia comercial|fabricante)\b/, excluye: /\b(?:o equivalente|o similar|equivalentes|similares)\b/,
    texto: "El pliego nombra una marca o referencia comercial sin la fórmula «o equivalente».", pendiente: "Observe por escrito que se admita «o equivalente»: una marca única restringe la participación y encarece el ítem." },
  { tipo: "licencia_o_permiso", re: /\b(?:licencia (?:ambiental|de construccion|urbanistica|de intervencion|de ocupacion)|permiso (?:ambiental|de ocupacion|de intervencion|de vertimientos|de aprovechamiento)|plan de manejo de transito|\bpmt\b|concesion de aguas)\b/,
    texto: "El pliego menciona licencias o permisos para ejecutar la obra.", pendiente: "Confirme quién los tramita y si ya existen: sin licencia no hay acta de inicio y el plazo corre igual." },
  { tipo: "visita_obligatoria", re: /\bvisita (?:tecnica |de obra |al sitio |al lugar )?(?:obligatoria|de caracter obligatorio|es obligatoria)\b|asistencia obligatoria a la visita/,
    texto: "El pliego exige asistir a una visita de obra.", pendiente: "Anote la fecha y la hora de la visita en su calendario: sin el acta de visita la oferta se rechaza." },
  { tipo: "causal_de_rechazo", re: /\bcausal(?:es)? de rechazo\b|\bsera rechazada\b|\bse rechazara(?:n)?\b|\brechazo de la (?:oferta|propuesta)\b/,
    texto: "El pliego enumera causales de rechazo de la oferta.", pendiente: "Lea las causales completas antes que cualquier otra cosa: ahí está lo que lo deja por fuera." },
];
const MAX_POR_TIPO = 2;
/* la misma familia de negaciones que lib/negocio.SIN_ANTICIPO_RE, sobre texto plegado */
/* el futuro y «lugar a» entraron el 3-sep-2026: «No se entregará anticipo» (pliego real)
   salía como «hay anticipo». Cubre: no (se) contempla/contemplará, no habrá (lugar a),
   no hay (lugar a), no (se) otorga(rá), no aplica, no (se) pacta(rá), no (se) paga(rá),
   no (se) entrega(rá), no (se) reconoce(rá), no se ha previsto, no (se) da(rá)…
   seguido opcionalmente de «ningún», «el pago de» o «pago de» y «anticipo». */
const SIN_ANTICIPO_RE = /\bno (?:se )?(?:ha previsto|contempla|preve|habra|hay|otorga|aplica|pacta|paga|entrega|reconoce|da)(?:ra|ran|n)?(?: lugar a)? (?:ningun |el pago de |pago de )?anticipo\b|\bsin anticipo\b|\banticipo[:\s]+(?:0\b|cero|no aplica)/;

/* claves del perfil que compara la verificación, por id del requisito numérico de lib/diff */
const DATO_COMPARADO = Object.freeze({
  capital_trabajo: "capital_trabajo_cop", patrimonio: "patrimonio_cop", liquidez: "liquidez", endeudamiento: "endeudamiento",
  cobertura: "cobertura_intereses", experiencia_smmlv: "experiencia_mayor_contrato_smmlv", plazo_meses: null,
});
const TIPO_NUMERICO = Object.freeze({ experiencia_smmlv: "experiencia_especifica", plazo_meses: "plazo" });
const ETIQUETA_PERFIL = Object.freeze({
  capital_trabajo_cop: "capital de trabajo", patrimonio_cop: "patrimonio", liquidez: "índice de liquidez", endeudamiento: "nivel de endeudamiento",
  cobertura_intereses: "cobertura de intereses", experiencia_mayor_contrato_smmlv: "experiencia acreditada en salarios mínimos",
});

function citaDe(linea) {
  const s = String(linea || "").replace(/\s+/g, " ").trim();
  if (s.length < CITA_MIN_CRUDA) return null;
  return s.length <= CITA_MAX_CRUDA ? s : s.slice(0, CITA_MAX_CRUDA);
}
const cop = (n) => `$${Math.round(Number(n)).toLocaleString("es-CO")}`;
const cifra = (n) => Number(n).toLocaleString("es-CO", { maximumFractionDigits: 2 });

/* ── detección por línea, con página ─────────────────────────────────────── */
function detectar(texto) {
  const lineas = lineasConPagina(String(texto || ""));
  const hallazgos = new Map(); // tipo → [{linea, pagina}]
  for (const { linea, pagina } of lineas) {
    const p = plegar(linea);
    if (p.length < CITA_MIN_CRUDA) continue;
    for (const d of DETECTORES) {
      if (!d.re.test(p)) continue;
      if (d.excluye && d.excluye.test(p)) continue;
      const lista = hallazgos.get(d.tipo) || [];
      if (lista.length >= MAX_POR_TIPO) continue;
      const cita = citaDe(linea);
      if (!cita) continue;
      lista.push({ linea: cita, pagina: Number.isInteger(pagina) ? pagina : null });
      hallazgos.set(d.tipo, lista);
    }
  }
  return hallazgos;
}

/* ── el dictamen ─────────────────────────────────────────────────────────── */
function generarDictamenPorReglas({ entrada, texto }) {
  const e = entrada || {};
  const perfil = e.perfil || {};
  const lecturas = e.lecturas_de_la_app || {};
  const numericos = lecturas.requisitos_numericos || {};
  const hallazgos = detectar(texto);
  const versionTexto = e.texto || {};

  const requisitos = [];
  const motivos = [];
  const riesgos = [];
  const puntos = [];
  const pendientes = [];
  const preguntas = [];
  const noEncontrado = [];

  /* 1 · requisitos NUMÉRICOS: los que la app ya compara con el perfil, con la
     línea del pliego como cita (la evidencia que guarda extraerHabilitantes) */
  let noCumpleCitado = 0;
  for (const h of Object.values(numericos)) {
    if (!h || h.valor == null) continue;
    const dato = DATO_COMPARADO[h.id] || null;
    const cita = citaDe(h.evidencia);
    const pagina = Number.isInteger(h.pagina) ? h.pagina : null;
    const cumple = h.cumple_segun_la_app;
    const estado = cumple === "si" ? "cumple" : cumple === "no" ? "no_cumple" : "sin_dato_del_perfil";
    const propio = dato ? perfil[dato] : null;
    const propioLegible = propio == null ? null : (/_cop$/.test(dato) ? cop(propio) : cifra(propio));
    const motivo = estado === "cumple" ? `Su ${ETIQUETA_PERFIL[dato]} (${propioLegible}) cumple lo exigido en esa línea.`
      : estado === "no_cumple" ? `Su ${ETIQUETA_PERFIL[dato]} (${propioLegible}) no llega a lo exigido en esa línea. Verifique el valor en el pliego y en su registro.`
        : dato ? "La aplicación no tiene esa cifra de su empresa: compárela usted con el certificado del registro de proponentes."
          : "Es un dato del contrato, no de su empresa: úselo para el flujo de caja.";
    requisitos.push({ texto: `${h.etiqueta}: lo que el pliego fija en esa línea.`, pagina, cita, tipo: TIPO_NUMERICO[h.id] || "financiero", estado, dato_comparado: dato, motivo_estado: motivo });
    if (estado === "no_cumple" && cita && pagina != null) { noCumpleCitado++; motivos.push({ texto: `No cumple lo exigido en ${h.etiqueta.toLowerCase()}.`, pagina, cita }); }
    else if (estado === "cumple" && cita) puntos.push({ texto: `Cumple lo exigido en ${h.etiqueta.toLowerCase()}.`, pagina, cita });
  }

  /* 2 · requisitos y riesgos por DETECCIÓN, cada uno con su línea y su página */
  const primero = (tipo) => (hallazgos.get(tipo) || [])[0] || null;
  for (const d of DETECTORES) {
    const lista = hallazgos.get(d.tipo) || [];
    if (!lista.length) { noEncontrado.push(d.texto.replace(/^El pliego (?:exige|menciona|fija|describe|pone|condiciona|nombra|enumera) /, "").replace(/\.$/, "")); continue; }
    const h = lista[0];
    requisitos.push({ texto: d.texto, pagina: h.pagina, cita: h.linea, tipo: d.tipo, estado: "sin_dato_del_perfil", dato_comparado: null, motivo_estado: d.pendiente });
    pendientes.push({ texto: d.pendiente, pagina: h.pagina, cita: h.linea });
  }
  const riesgo = (tipo, gravedad, texto, que_hacer) => { const h = primero(tipo); if (h) riesgos.push({ texto, pagina: h.pagina, cita: h.linea, gravedad, base: "pliego", referencia: null, que_hacer }); };
  riesgo("multas", "alta", "Hay multas o cláusula penal por atraso: un retraso se descuenta de cada pago.", "Cotice el plazo con holgura y deje por escrito cada causa de retraso ajena a usted el día que ocurra.");
  riesgo("subcontratista_o_proveedor_impuesto", "alta", "La entidad se reserva la aprobación de proveedores o subcontratistas.", "Pregunte por escrito los criterios de aprobación antes de ofertar; un proveedor impuesto es un precio que usted no controla.");
  riesgo("marca_sin_equivalente", "media", "Se nombra una marca o referencia comercial sin admitir equivalentes.", "Observe el pliego pidiendo la fórmula «o equivalente» con el argumento de pluralidad de oferentes.");
  riesgo("item_sin_valor", "media", "Hay obligaciones a cargo del contratista sin valor en el presupuesto.", "Cuantifíquelas y súmelas a su administración antes de fijar el precio.");
  riesgo("licencia_o_permiso", "media", "La obra depende de licencias o permisos.", "Confirme quién los tramita y en qué estado están; sin ellos no firme el acta de inicio.");
  riesgo("garantias", "baja", "El pliego fija garantías con porcentajes y vigencias propias.", "Cotícelas con su aseguradora antes de ofertar: la de seriedad se necesita para presentar la oferta.");
  riesgo("visita_obligatoria", "media", "La visita de obra es obligatoria.", "Asista y conserve el acta: sin ella la oferta se rechaza.");
  const ant = primero("anticipo_o_pago_anticipado");
  if (!ant) {
    riesgos.push({ texto: "El pliego no menciona anticipo con las palabras habituales: cuente con financiar el arranque de la obra usted.", pagina: null, cita: null, gravedad: "media", base: "datos_de_la_app", referencia: null, que_hacer: "Haga el flujo de caja mes a mes sin anticipo; si no cierra, suba el precio o no se presente." });
  } else if (SIN_ANTICIPO_RE.test(plegar(ant.linea))) {
    /* «no se contempla anticipo» menciona el anticipo para negarlo: es un riesgo citado, no un punto a favor */
    riesgos.push({ texto: "El pliego dice que no hay anticipo: usted financia el arranque de la obra.", pagina: ant.pagina, cita: ant.linea, gravedad: "media", base: "pliego", referencia: null, que_hacer: "Haga el flujo de caja mes a mes sin anticipo; si no cierra, suba el precio o no se presente." });
  } else {
    puntos.push({ texto: "El pliego contempla anticipo o pago anticipado.", pagina: ant.pagina, cita: ant.linea });
  }
  const pago = primero("forma_de_pago");
  if (pago && /\b(?:pago unico|un solo pago|pago final|contra entrega)\b/.test(plegar(pago.linea))) riesgos.push({ texto: "La entidad paga al final o contra entrega: usted financia la obra completa.", pagina: pago.pagina, cita: pago.linea, gravedad: "alta", base: "pliego", referencia: null, que_hacer: "Calcule el costo financiero de toda la obra y súmelo al precio, o no se presente." });
  else if (pago) puntos.push({ texto: "La entidad paga por actas parciales o de forma periódica.", pagina: pago.pagina, cita: pago.linea });

  /* 3 · lo que la app ya sabe del proceso (base «datos de la app», sin cita) */
  const cambios = Array.isArray(lecturas.cambios_de_habilitantes) ? lecturas.cambios_de_habilitantes : [];
  if (cambios.some((c) => c && c.afecta)) riesgos.push({ texto: "Una versión nueva del pliego cambió requisitos que le afectan.", pagina: null, cita: null, gravedad: "alta", base: "datos_de_la_app", referencia: null, que_hacer: "Revise el vigía de adendas del lector de pliegos y vuelva a comprobar cada requisito cambiado." });
  const adendas = Array.isArray(lecturas.adendas_del_dataset) ? lecturas.adendas_del_dataset : [];
  if (adendas.length) riesgos.push({ texto: "La entidad publicó cambios en el proceso después de la publicación inicial.", pagina: null, cita: null, gravedad: "media", base: "datos_de_la_app", referencia: null, que_hacer: "Mire qué cambió (cierre, presupuesto, plazo u objeto) en la tarjeta del proceso antes de seguir." });
  if (versionTexto.recortado) riesgos.push({ texto: "El texto guardado del pliego está recortado: esta lectura no vio el final del documento.", pagina: null, cita: null, gravedad: "media", base: "datos_de_la_app", referencia: null, que_hacer: "Lea usted las últimas secciones del pliego (anexos y formatos)." });
  if (perfil.capacidad_de_contratacion_disponible_cop == null) pendientes.push({ texto: "La capacidad de contratación disponible no se pudo calcular con su perfil: verifíquela con su registro de proponentes.", pagina: null, cita: null });

  /* 4 · preguntas para la entidad, sin cifras */
  if (!primero("forma_de_pago")) preguntas.push("¿La forma de pago es por actas parciales mensuales o contra entrega final?");
  if (!ant) preguntas.push("¿El contrato contempla anticipo o pago anticipado y en qué porcentaje?");
  if (primero("marca_sin_equivalente")) preguntas.push("¿Se admiten productos equivalentes a la marca o referencia nombrada en el pliego?");
  if (primero("licencia_o_permiso")) preguntas.push("¿Las licencias y permisos de la obra ya están expedidos, y a cargo de quién está su trámite?");
  if (!primero("visita_obligatoria")) preguntas.push("¿Hay visita de obra y es obligatoria para presentar oferta?");

  /* 5 · veredicto, con la misma regla que la verificación impone al modelo */
  const hayAlta = riesgos.some((r) => r.gravedad === "alta");
  const veredicto = noCumpleCitado > 0 ? "no_presentarse" : (hayAlta || requisitos.some((r) => r.estado === "sin_dato_del_perfil") || pendientes.length) ? "presentarse_con_reservas" : "presentarse";
  const frase = veredicto === "no_presentarse" ? "No conviene presentarse: hay un requisito numérico del pliego que su empresa no cumple."
    : veredicto === "presentarse_con_reservas" ? "Puede presentarse, con reservas: hay exigencias del pliego que usted debe confirmar antes de invertir tiempo."
      : "Puede presentarse: lo que el pliego fija con cifras lo cumple y no aparecen riesgos altos.";
  if (!motivos.length) {
    for (const r of riesgos.filter((x) => x.cita).slice(0, 2)) motivos.push({ texto: r.texto, pagina: r.pagina, cita: r.cita });
    for (const p of puntos.filter((x) => x.cita).slice(0, 3 - motivos.length)) motivos.push({ texto: p.texto, pagina: p.pagina, cita: p.cita });
  }
  const citados = requisitos.filter((r) => r.cita).length;
  const confianza = versionTexto.recortado || !versionTexto.paginas_presentes ? "baja" : citados >= 4 ? "media" : "baja";
  const confianzaMotivo = "Lectura por reglas de la aplicación, sin inteligencia artificial: encuentra lo que el pliego escribe con las palabras habituales y no interpreta el resto. Lo no encontrado puede estar dicho de otra forma.";

  return {
    veredicto, veredicto_frase: frase, motivos, requisitos_para_participar: requisitos, riesgos, puntos_a_favor: puntos,
    pendientes_de_verificar: pendientes, preguntas_para_la_entidad: preguntas, no_encontrado_en_el_pliego: noEncontrado,
    confianza, confianza_motivo: confianzaMotivo,
  };
}

/* `SIN_ANTICIPO_RE` la usa lib/documentos_proceso para leer el anticipo de CADA
   documento con la misma negación (3-sep-2026): dos regex divergirían. */
module.exports = { generarDictamenPorReglas, detectar, DETECTORES, REGLAS_VERSION, MOTOR, DATO_COMPARADO, SIN_ANTICIPO_RE };
