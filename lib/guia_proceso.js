/* lib/guia_proceso.js · LA GUÍA «DON HÉCTOR» DE UN PROCESO GUARDADO (sep 2026)
   ─────────────────────────────────────────────────────────────────────────────
   Encargo del dueño: «cuando guardamos un proceso, automáticamente la plataforma
   le diga al usuario todo lo que necesita para presentarse: contexto general de
   qué es la obra, dónde está, si existe anticipo, tips o consejos que una
   persona novata desconoce, qué necesita para presentarse, qué tiene que tener
   en cuenta». Es el manual del analista (docs/GUIA_ANALISTA_LICITACIONES.md y
   su complemento) aplicado a UN proceso concreto y a UN perfil concreto, en el
   lenguaje de la filosofía del producto: el hecho, no el modelo.

   Capa PURA: recibe la fila (viva del corpus, o la foto guardada si el proceso
   ya no está), el id del perfil y un contexto opcional (competencia de la
   entidad, cuánto suelen bajar, «ahora» inyectado) y devuelve la guía. Ni red
   ni Redis: el handler de seguimiento la llama por cada guardado.

   Reglas que no hay que re-aprender:
   · NO REIMPLEMENTA NINGÚN JUICIO: el encaje del registro es `evaluarRup`, la
     capacidad y la caja son `evaluarPuertas` (lib/puertas), la zona es
     `evaluarZona`, la manifestación es `manifestacionDeFila`, el anticipo es
     `anticipoPct` de lib/negocio y el plazo `plazoMesesDe`. Una guía que
     calculara por su cuenta acabaría contradiciendo a la tarjeta que el usuario
     acaba de guardar, y entonces no se podría creer a ninguna de las dos.
   · LO QUE LA APP NO PUEDE VERIFICAR VIAJA COMO `pendiente` O `sin_dato`, jamás
     como «cumple». La garantía de seriedad, la firma digital, los antecedentes,
     la visita de obra y los mínimos financieros del pliego los fija el pliego,
     que el dataset no trae. Se dice qué es, dónde se consigue y cuándo hay que
     tenerlo — no se afirma que ya está.
   · `anticipo_pct = 0` sigue siendo SIN DATO (regla de lib/negocio): la guía
     dice «el proceso no publica si hay anticipo» y manda al pliego; solo afirma
     un anticipo cuando el texto lo trae. Y cuando lo trae, explica la fiducia.
   · Un proceso que ya no está en el corpus (solo foto) recibe una guía
     `completa:false`: las reglas que exigen el objeto y los códigos (registro,
     capacidad, caja) quedan en `sin_dato` en vez de fingir un veredicto sobre
     una fila que no existe.
   · Registro formal (usted) y sin jerga del glosario: «lo que le exigen para
     poder participar», «registro de proponente», «cuánto puede facturar»; nunca
     «habilitante», «RUP ✓», siglas de capacidad ni la sigla del salario mínimo.
     Hay prueba que barre la guía entera contra la lista de jerga.
   · Los `require` de rup/puertas/negocio/filtros_lista van DIFERIDOS dentro de
     la función: `filtros` participa en ciclos que resuelve con esa misma
     técnica y este módulo no puede atarse a ese nudo en tiempo de carga. */
"use strict";

const { hoyColombia, fechaLegible, sumarDias, esHabil, sumarHabiles } = require("./habiles.js");
const { evaluarZona } = require("./accesibilidad.js");
const { manifestacionDeFila, PLAZO_MANIFESTACION_HABILES } = require("./manifestacion.js");
const { plazoMesesDe } = require("./capacidad.js");

const VERSION = 1;
const CONTRIBUCION_OBRA_PCT = 5;        // Ley 418/1997 art. 120 (permanente: Ley 1738/2014 art. 8)
const GARANTIA_SERIEDAD_PCT = 10;       // documentos tipo: 10 % del presupuesto oficial, vigencia 3 meses desde el cierre
const FRACCION_FINANCIACION = 0.20;     // la misma de lib/puertas (P3): 20 % del valor a ejecutar antes del primer cobro
const REFERENCIA_FINANCIERA = Object.freeze({ liquidez_min: 1.2, endeudamiento_max: 0.65, cobertura_min: 2 }); // referencia de los documentos tipo (complemento del manual)
const TRASLADO_HABILES = Object.freeze({ licitacion: 5, seleccion_abreviada: 3, concurso: 3, minima: 1 });
const ESTADOS_REQUISITO = Object.freeze(["cumple", "revisar", "no_cumple", "pendiente", "sin_dato"]);
const OFFSET_COLOMBIA_MS = 5 * 3600 * 1000;

const num = (v) => { if (v === null || v === undefined || v === "") return null; const n = Number(v); return Number.isFinite(n) ? n : null; };
const cop = (n) => (n == null ? null : `$${Math.round(n).toLocaleString("es-CO")}`);
const norm = (s) => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const millones = (n) => {
  if (n == null) return null;
  if (n >= 1e9) return `$${(n / 1e9).toLocaleString("es-CO", { maximumFractionDigits: 1 })} mil millones`;
  if (n >= 1e6) return `$${Math.round(n / 1e6).toLocaleString("es-CO")} millones`;
  return cop(n);
};
const plural = (n, uno, varios) => (n === 1 ? uno : varios);

/* ── la modalidad, en llano ──────────────────────────────────────────────────
   Cómo se adjudica cada modalidad y qué le cambia al oferente. Se casa por
   RAÍZ normalizada (los literales de SECOP II varían). */
function modalidadEnLlano(modalidad) {
  const m = norm(modalidad);
  if (!m) return { clave: "desconocida", nombre: null, explicacion: "El proceso no publica cómo lo adjudican: mírelo en el pliego.", traslado_habiles: null, precio_decide: null };
  if (m.includes("minima cuantia")) {
    return { clave: "minima", nombre: "Mínima cuantía", traslado_habiles: TRASLADO_HABILES.minima, precio_decide: true,
      explicacion: "Proceso pequeño: gana la oferta de MENOR precio entre las que cumplen los requisitos. Aquí el precio sí decide, pero una oferta muy por debajo del presupuesto le exige justificar sus costos." };
  }
  if (m.includes("menor cuantia")) {
    return { clave: "menor_cuantia", nombre: "Selección abreviada de menor cuantía", traslado_habiles: TRASLADO_HABILES.seleccion_abreviada, precio_decide: false,
      explicacion: `Antes de presentar oferta hay que AVISAR que le interesa (manifestación de interés) en el plazo que fije el pliego: la ley permite como máximo ${PLAZO_MANIFESTACION_HABILES} días hábiles desde la apertura, y suele ser menos. Si avisan más de 10, la entidad puede sortear quiénes siguen. Sin ese aviso no puede presentarse.` };
  }
  if (m.includes("subasta")) {
    return { clave: "subasta", nombre: "Subasta inversa", traslado_habiles: TRASLADO_HABILES.seleccion_abreviada, precio_decide: true,
      explicacion: "Los que cumplen los requisitos pujan hacia abajo en la plataforma: gana el menor precio al cierre de la subasta. Prepare su precio piso ANTES de entrar." };
  }
  if (m.includes("seleccion abreviada")) {
    return { clave: "seleccion_abreviada", nombre: "Selección abreviada", traslado_habiles: TRASLADO_HABILES.seleccion_abreviada, precio_decide: false,
      explicacion: "Proceso de trámite más corto que la licitación, con requisitos de participación y factores de puntaje. Los plazos son cortos: el cronograma manda." };
  }
  if (m.includes("concurso")) {
    return { clave: "concurso", nombre: "Concurso de méritos", traslado_habiles: TRASLADO_HABILES.concurso, precio_decide: false,
      explicacion: "Es para consultoría o interventoría: se compite por experiencia y equipo de trabajo, NO por precio (el precio se revisa después, contra el presupuesto oficial)." };
  }
  if (m.includes("licitacion")) {
    return { clave: "licitacion", nombre: "Licitación pública", traslado_habiles: TRASLADO_HABILES.licitacion, precio_decide: false,
      explicacion: "El proceso grande: requisitos para participar y puntaje por calidad, precio y apoyo a la industria nacional. El MÉTODO con el que puntúan el precio se sortea en la audiencia (con la TRM del día), así que tirar el precio al piso no garantiza nada." };
  }
  if (m.includes("regimen especial")) {
    return { clave: "regimen_especial", nombre: "Régimen especial con ofertas", traslado_habiles: null, precio_decide: null,
      explicacion: "La entidad tiene sus propias reglas de contratación (empresa de servicios públicos, universidad, entre otras): lea su manual de contratación, no el estatuto general." };
  }
  return { clave: "otra", nombre: String(modalidad).trim(), traslado_habiles: null, precio_decide: null, explicacion: "Modalidad poco frecuente: lea el pliego para saber cómo puntúan y qué exigen." };
}

/* ── el tamaño de la obra, en palabras ─────────────────────────────────── */
function tamanoDe(presupuesto) {
  if (presupuesto == null || presupuesto <= 0) return null;
  if (presupuesto < 150e6) return "obra pequeña";
  if (presupuesto < 1000e6) return "obra mediana";
  if (presupuesto < 5000e6) return "obra grande";
  return "obra muy grande";
}

/* ── la foto guardada, con los nombres de columna del corpus ───────────── */
function filaDesdeFoto(foto) {
  const f = foto || {};
  return {
    id_del_proceso: f.id || null, nombre_del_procedimiento: f.nombre || null, entidad: f.entidad || null, nit_entidad: f.nit_entidad || null,
    departamento_entidad: f.departamento || null, modalidad_de_contratacion: f.modalidad || null, precio_base: f.presupuesto_cop ?? null,
    fecha_de_publicacion_del: f.fecha_publicacion || null, fecha_cierre: f.fecha_cierre || null, fecha_de_apertura_de_respuesta: f.fecha_apertura || null,
    urlproceso: f.url || null,
  };
}

function anticipoDe(l) {
  const declarado = num(l.anticipo_pct);
  if (declarado != null && declarado > 0) return declarado;
  try {
    const { anticipoPct } = require("./negocio.js");
    return num(anticipoPct(l, `${l.nombre_del_procedimiento || ""} ${l.descripci_n_del_procedimiento || ""}`)) || 0;
  } catch { return declarado || 0; }
}

function cierreDe(l) {
  const c = String(l.fecha_cierre || "").slice(0, 19);
  if (c) return c;
  try { return String(require("./negocio.js").fechaCierre(l) || "").slice(0, 19) || null; } catch { return null; }
}

/* «Mes(es)» / «Dia(s)» del dataset → «meses» / «días» según la cantidad */
function unidadLegible(unidad, n) {
  const u = String(unidad || "meses").toLowerCase().replace("(es)", n === 1 ? "" : "es").replace("(s)", n === 1 ? "" : "s").trim();
  return u.replace(/^dias?$/, n === 1 ? "día" : "días").replace(/^anos?$/, n === 1 ? "año" : "años");
}

function smmlv() { try { return require("./perfiles.js").SMMLV; } catch { return 1750905; } }

/* ═══════════════════════════════ LA GUÍA ═══════════════════════════════════ */
/* `fila`: la fila VIVA del corpus, o null; `foto`: la foto guardada (siempre).
   `ctx`: {conocimiento, competencia, baja, ahoraMs, incluirTextoDebil}. */
function guiaDe({ fila = null, foto = null, perfil, ctx = {} } = {}) {
  const completa = !!fila;
  const l = fila || filaDesdeFoto(foto);
  const ahoraMs = ctx.ahoraMs || Date.now();
  const hoy = hoyColombia(ahoraMs);
  const objeto = String(l.nombre_del_procedimiento || "").trim() || null;
  const descripcion = String(l.descripci_n_del_procedimiento || "").trim() || null;
  const presupuesto = num(l.cuantia_cop) || num(l.precio_base) || null;
  const anticipo = anticipoDe(l);
  const cierre = cierreDe(l);
  const modalidad = modalidadEnLlano(l.modalidad_de_contratacion);
  const zona = evaluarZona(l);
  /* la fecha límite REAL, si alguien ya leyó el pliego (peldaño 1 de lib/manifestacion):
     un dato publicado gana a la ventana calculada, y un techo legal no es un plazo */
  const manif = manifestacionDeFila(l, hoy, { fechaCronograma: ctx.fechaManifestacionCronograma || null });
  const plazoMeses = l.duracion && num(l.duracion) > 0 ? plazoMesesDe(l) : null;
  let formaPrecio = null;
  try { formaPrecio = require("./negocio.js").tipoPrecio(`${objeto || ""} ${descripcion || ""}`); } catch { formaPrecio = null; }

  /* el juicio del perfil: SOLO con la fila viva (sin objeto ni códigos no hay
     nada que juzgar) — y solo si el perfil existe en PERFILES */
  let rup = null, puertas = null, perfilObj = null, tipoTrabajo = null;
  if (perfil) {
    try {
      const { PERFILES, evaluarRup } = require("./rup.js");
      const { evaluarPuertas } = require("./puertas.js");
      /* el perfil (indicadores, experiencia) se lee SIEMPRE que exista: la foto
         de un proceso que ya no está en el corpus sigue pudiendo compararse con
         los indicadores del registro; lo que exige la fila viva es el juicio */
      if (Object.prototype.hasOwnProperty.call(PERFILES, perfil)) perfilObj = PERFILES[perfil];
      if (completa && perfilObj) {
        rup = evaluarRup(l, perfil, ctx.conocimiento || {}, { incluirTextoDebil: !!ctx.incluirTextoDebil });
        puertas = evaluarPuertas(l, perfil, { rup, competencia: ctx.competencia || null, conocimiento: ctx.conocimiento || {} });
        try { tipoTrabajo = require("./filtros_lista.js").tipoTrabajoDe(l, rup); } catch { tipoTrabajo = null; }
      }
    } catch { rup = null; puertas = null; }
  }

  const TIPO_LEGIBLE = { obra: "obra civil", consultoria: "consultoría o diseño", interventoria: "interventoría", suministro: "compra o suministro", servicios: "servicio" };
  const dias = cierre ? Math.ceil((Date.parse(cierre) - (ahoraMs - OFFSET_COLOMBIA_MS)) / 86400000) : null;
  const cerrado = dias != null ? dias < 0 : null;
  const esObra = !tipoTrabajo || tipoTrabajo === "obra";

  /* ── 1 · LA OBRA EN UNA MIRADA ─────────────────────────────────────────── */
  const obra = {
    que_es: objeto,
    descripcion: descripcion ? descripcion.slice(0, 600) : null,
    tipo_trabajo: tipoTrabajo, tipo_trabajo_legible: tipoTrabajo ? TIPO_LEGIBLE[tipoTrabajo] || tipoTrabajo : null,
    contrato_declarado: String(l.tipo_de_contrato || "").trim() || null,
    donde: { entidad: l.entidad || null, departamento: l.departamento_entidad || null, ciudad: String(l.ciudad_entidad || "").trim() || null,
      zona: { nivel: zona.nivel, etiqueta: zona.etiqueta, km: zona.km, desde: zona.base || null, dificil_acceso: !!zona.dificil_acceso, verificar_orden_publico: !!zona.verificar_orden_publico, mensaje: zona.mensaje } },
    cuanto: { presupuesto_cop: presupuesto, legible: millones(presupuesto), tamano: tamanoDe(presupuesto) },
    plazo: { meses: plazoMeses != null ? Math.round(plazoMeses * 10) / 10 : null, legible: plazoMeses == null ? null : `${l.duracion} ${unidadLegible(l.unidad_de_duracion, num(l.duracion))}`, cruza_diciembre: null },
    pago: {
      anticipo_pct: anticipo > 0 ? anticipo : null,
      anticipo_legible: anticipo > 0 ? `Anticipo del ${anticipo} %` : "El proceso no publica si hay anticipo",
      fuente_anticipo: anticipo > 0 ? "texto del objeto" : "sin dato en la fuente pública",
      forma_precio: formaPrecio, // unitarios | global | null
    },
    como_lo_adjudican: { modalidad: l.modalidad_de_contratacion || null, ...modalidad, manifestacion: manif },
    cierre: { fecha: cierre, legible: cierre ? fechaLegible(cierre.slice(0, 10)) : null, dias_para_cierre: dias, cerrado },
    enlace_secop: l.urlproceso || null,
  };
  if (plazoMeses != null && cierre) {
    const inicio = new Date(Date.parse(cierre.slice(0, 10) + "T12:00:00Z"));
    const fin = new Date(inicio.getTime() + plazoMeses * 30 * 86400000);
    obra.plazo.cruza_diciembre = fin.getUTCFullYear() > inicio.getUTCFullYear();
  }

  /* ── 2 · LO QUE NECESITA PARA PRESENTARSE ─────────────────────────────── */
  const req = [];
  const add = (r) => { if (!ESTADOS_REQUISITO.includes(r.estado)) throw new Error(`estado de requisito desconocido: ${r.estado}`); req.push(r); };

  // registro de proponente: el encaje del objeto y los códigos (evaluarRup)
  if (!completa || !rup) {
    add({ clave: "registro", titulo: "Registro de proponente vigente, con este tipo de trabajo inscrito", estado: "sin_dato",
      detalle: completa ? "Su perfil no se pudo evaluar contra este proceso." : "El proceso ya no está en la lista viva: no se puede comprobar si el trabajo encaja con lo que tiene inscrito.",
      donde: "Cámara de Comercio (renovación antes del quinto día hábil de abril de cada año)." });
  } else {
    const tier = rup.tier || "ninguno";
    const solido = ["exacto", "producto", "clase"].includes(tier);
    const flojo = ["familia", "equivalente", "texto"].includes(tier);
    const codigo = String(l.codigo_principal_de_categoria || "").trim() || null;
    add({ clave: "registro", titulo: "Registro de proponente vigente, con este tipo de trabajo inscrito",
      estado: solido ? "cumple" : flojo ? "revisar" : "no_cumple",
      detalle: solido ? "Este trabajo encaja con lo que usted tiene inscrito." + (codigo ? ` Código del proceso: ${codigo}.` : "")
        : flojo ? "Encaja solo por parecido (familia o descripción): confirme en el pliego el código exacto que exigen y que lo tenga inscrito." + (codigo ? ` Código del proceso: ${codigo}.` : "")
          : "El trabajo NO encaja con lo que tiene inscrito. Sin el código en el registro, la oferta se rechaza aunque todo lo demás esté bien.",
      donde: "Certificado del registro de proponente (Cámara de Comercio), en firme, con menos de 30 días." });
  }

  // experiencia acreditada: el pliego fija cuánta; aquí solo se compara el mayor contrato acreditado con el valor del proceso
  {
    const mayor = perfilObj && num(perfilObj.expSMMLV) != null ? num(perfilObj.expSMMLV) * smmlv() : null;
    const detalle = mayor == null ? "El pliego dice cuánta experiencia exige (contratos terminados de este mismo tipo, sumados en salarios mínimos). Compárela con la que tiene acreditada en su registro."
      : presupuesto ? (mayor >= presupuesto
        ? `Su contrato acreditado más grande (${millones(mayor)}) supera el valor de este proceso (${millones(presupuesto)}): buena señal, pero el pliego suele pedir experiencia del MISMO tipo de obra y con condiciones propias. Léalo.`
        : `Su contrato acreditado más grande (${millones(mayor)}) es menor que el valor de este proceso (${millones(presupuesto)}): revise si el pliego permite sumar varios contratos o si necesita un socio que aporte la experiencia.`)
        : "El proceso no publica cuantía: la experiencia exigida la fija el pliego.";
    add({ clave: "experiencia", titulo: "Experiencia acreditada del mismo tipo de obra", estado: "revisar", detalle,
      donde: "Registro de proponente (los contratos inscritos) más las certificaciones de cada contrato, firmadas por la entidad contratante." });
  }

  // capacidad de contratación (P2) y caja (P3), de lib/puertas
  if (puertas) {
    const p2 = puertas.p2_k || {};
    const pctK = p2.crp && p2.crpc != null ? Math.round(100 * p2.crpc / p2.crp) : null;
    add({ clave: "capacidad", titulo: "Capacidad para facturar este contrato sin pasarse",
      estado: p2.sin_dato ? "sin_dato" : p2.pasa ? "cumple" : "no_cumple",
      detalle: p2.sin_dato ? "No se puede calcular todavía: cargue en «Mi empresa» la utilidad operacional de su empresa (o el proceso no publica cuantía)."
        : p2.pasa ? `Este contrato consume ${pctK != null ? pctK : "—"} % de lo que puede facturar hoy con sus contratos en curso.`
          : "Este contrato supera lo que puede facturar hoy con sus contratos en curso: la entidad hace la misma cuenta con su registro y lo rechaza. La salida es un consorcio con quien tenga capacidad libre.",
      donde: "Se calcula con su registro de proponente y sus contratos en ejecución; la entidad hace la misma cuenta." });
    const p3 = puertas.p3_caja || {};
    add({ clave: "caja", titulo: "Plata para arrancar la obra antes del primer pago",
      estado: p3.sin_dato ? "sin_dato" : p3.pasa ? "cumple" : "revisar",
      detalle: p3.sin_dato ? "El proceso no publica cuantía: no se puede estimar cuánto tendría que financiar."
        : `Tendría que financiar cerca de ${millones(p3.financiacion_requerida)} antes del primer cobro (el Estado paga contra acta, semanas o meses después)` + (p3.pasa ? ", y su patrimonio alcanza." : ", y su patrimonio queda corto: piense en anticipo, línea de crédito o un socio."),
      donde: "Su flujo de caja mes a mes (hágalo ANTES de fijar el precio)." });
  } else {
    add({ clave: "capacidad", titulo: "Capacidad para facturar este contrato sin pasarse", estado: "sin_dato", detalle: "Se evalúa con la fila viva del proceso y su perfil.", donde: "Su registro de proponente." });
    add({ clave: "caja", titulo: "Plata para arrancar la obra antes del primer pago", estado: "sin_dato", detalle: presupuesto ? `Con el presupuesto publicado tendría que financiar cerca de ${millones(presupuesto * (1 - anticipo / 100) * FRACCION_FINANCIACION)} antes del primer cobro; si alcanza o no depende de su patrimonio.` : "El proceso no publica cuantía.", donde: "Su flujo de caja mes a mes (hágalo ANTES de fijar el precio)." });
  }

  // indicadores financieros: el pliego los fija; los de referencia de los documentos tipo se comparan
  {
    const liq = perfilObj ? num(perfilObj.liquidez) : null, end = perfilObj ? num(perfilObj.endeudamiento) : null, cob = perfilObj ? num(perfilObj.coberturaIntereses) : null;
    const conDato = liq != null && end != null;
    const ok = conDato && liq >= REFERENCIA_FINANCIERA.liquidez_min && end <= REFERENCIA_FINANCIERA.endeudamiento_max && (cob == null || cob >= REFERENCIA_FINANCIERA.cobertura_min);
    add({ clave: "financieros", titulo: "Indicadores financieros del registro (liquidez, endeudamiento, cobertura de intereses)",
      estado: !conDato ? "sin_dato" : ok ? "revisar" : "no_cumple",
      detalle: !conDato ? "Su perfil no trae los indicadores: están en el certificado del registro de proponente."
        : ok ? `Sus indicadores (liquidez ${liq.toLocaleString("es-CO")}, endeudamiento ${(end * 100).toFixed(0)} %${cob != null ? `, cobertura ${cob.toLocaleString("es-CO")}` : ""}) cumplen los de referencia de los pliegos tipo (liquidez ≥ ${REFERENCIA_FINANCIERA.liquidez_min}, endeudamiento ≤ ${Math.round(REFERENCIA_FINANCIERA.endeudamiento_max * 100)} %, cobertura ≥ ${REFERENCIA_FINANCIERA.cobertura_min}). Confirme los del pliego: si piden cifras raras (liquidez ≥ 3,7) es señal de pliego hecho a la medida de alguien.`
          : `Sus indicadores (liquidez ${liq.toLocaleString("es-CO")}, endeudamiento ${(end * 100).toFixed(0)} %) no llegan a los de referencia de los pliegos tipo. Revise los que exige este pliego: puede que sí, puede que no.`,
      donde: "Certificado del registro de proponente (la entidad los lee de ahí, con dos decimales truncados)." });
  }

  // manifestación de interés (solo menor cuantía; lib/manifestacion)
  if (manif && manif.aplica) {
    const m = manif;
    const estadoM = m.estado === "vencida" ? "no_cumple" : m.estado === "abierta" ? "pendiente" : "revisar";
    const detalleM = m.estado === "vencida"
      ? `El plazo venció${m.confirmada && m.fecha_limite_legible ? ` el ${m.fecha_limite_legible} (fecha del pliego)` : m.vence_a_mas_tardar_legible ? ` (a más tardar el ${m.vence_a_mas_tardar_legible}, techo legal)` : ""}. Si no avisó a tiempo, ya no puede presentarse: confírmelo en el cronograma del proceso.`
      : m.estado === "abierta"
        ? `Tiene hasta el ${m.fecha_limite_legible}${m.quedan_habiles != null ? ` (${m.quedan_habiles} ${plural(m.quedan_habiles, "día hábil", "días hábiles")})` : ""}, fecha leída del pliego. Sin este aviso no puede presentar oferta.`
        : m.estado === "por_confirmar"
          ? `El plazo lo fija el pliego y puede cerrar en cualquier momento entre el ${m.puede_cerrar_desde_legible} y el ${m.vence_a_mas_tardar_legible} (la ley permite como máximo ${m.plazo_maximo_habiles} días hábiles desde la apertura; a veces son horas). Confírmelo HOY en el cronograma de SECOP II y avise cuanto antes.`
          : `La fecha no se pudo situar${m.motivo_sin_fecha ? ` (${m.motivo_sin_fecha})` : ""}: mire el cronograma del proceso en SECOP II hoy mismo.`;
    add({ clave: "manifestacion", titulo: "Avisar que le interesa (manifestación de interés) en SECOP II", estado: estadoM, detalle: detalleM,
      donde: "Botón «Manifestar interés» dentro del proceso en SECOP II. Es gratis y toma cinco minutos." });
  }

  // lo que la app no puede verificar y el usuario tiene que conseguir
  add({ clave: "garantia_seriedad", titulo: `Garantía de seriedad de la oferta (póliza, normalmente el ${GARANTIA_SERIEDAD_PCT} % del presupuesto)`, estado: "pendiente",
    detalle: (presupuesto ? `Para este proceso serían cerca de ${millones(presupuesto * GARANTIA_SERIEDAD_PCT / 100)} asegurados; la prima es una fracción de eso. ` : "") + "Sin la póliza NO hay oferta (no se puede corregir después); un defecto de forma en ella sí se corrige.",
    donde: "Su aseguradora, con al menos cinco días hábiles de anticipación: la primera vez piden estados financieros y la vigencia debe cubrir tres meses desde el cierre." });
  add({ clave: "firma_digital", titulo: "Usuario en SECOP II y certificado de firma digital vigente", estado: "pendiente",
    detalle: "La oferta se firma en la plataforma; un certificado vencido el día del cierre es una oferta que no existe. Verifique la fecha de vencimiento hoy.",
    donde: "Entidad certificadora (Certicámara, GSE, Andes SCD u otra)." });
  add({ clave: "antecedentes", titulo: "Certificados de antecedentes y paz y salvo de seguridad social", estado: "pendiente",
    detalle: "Procuraduría (disciplinarios), Contraloría (fiscales), Policía (judiciales), medidas correctivas, y el pago de salud, pensión y parafiscales de los últimos seis meses, firmado por el revisor fiscal o el representante legal.",
    donde: "Todos son gratis y en línea; el de seguridad social lo firma usted (o su revisor fiscal)." });
  if (esObra) {
    add({ clave: "personal_y_visita", titulo: "Equipo de trabajo mínimo y visita de obra (si el pliego los exige)", estado: "pendiente",
      detalle: "Director e ingeniero residente con la experiencia que pida el pliego, con cartas de compromiso firmadas. NUNCA prometa personal que no está vinculado: si gana, tiene que presentarlo. Si hay visita de obra obligatoria, la fecha va en el cronograma.",
      donde: "Hojas de vida, tarjetas profesionales y cartas de compromiso; el acta de visita la expide la entidad." });
  }
  add({ clave: "carpeta", titulo: "Los formularios del pliego, diligenciados y en la sección correcta de SECOP II", estado: "pendiente",
    detalle: "Carta de presentación, formulario de experiencia, oferta económica en el formato EXACTO que exigen, apoyo a la industria nacional y los anexos de desempate (empresa pequeña, personas con discapacidad, mujeres, entre otros). El formulario de la plataforma prevalece sobre el PDF: no deje campos vacíos «porque ya está en el PDF».",
    donde: "El pliego trae los formatos; cada uno se carga en su carpeta en SECOP II (el precio jamás en la carpeta técnica)." });

  /* ── 3 · PASO A PASO, CON FECHAS ──────────────────────────────────────── */
  const pasos = [];
  const paso = (titulo, cuando, detalle) => pasos.push({ orden: pasos.length + 1, titulo, cuando: cuando || null, cuando_legible: cuando ? fechaLegible(String(cuando).slice(0, 10)) : null, detalle });
  paso("Lea primero las causales de rechazo y el cronograma del pliego", hoy, "Es lo primero que se lee, antes que el objeto: ahí está lo que lo deja por fuera. Anote cada fecha en su calendario (descargue el archivo de calendario de este proceso).");
  if (manif && manif.aplica && manif.estado !== "vencida") {
    /* con fecha del pliego, ese día; sin ella, HOY: la ventana calculada es un techo, no un plazo */
    if (manif.confirmada && manif.fecha_limite) paso("Avise que le interesa en SECOP II", manif.fecha_limite, "Fecha límite leída del pliego. Sin este aviso no hay oferta.");
    else paso("Avise que le interesa en SECOP II (hoy mismo)", hoy, `El plazo lo fija el pliego y puede cerrar en cualquier momento${manif.vence_a_mas_tardar_legible ? `, a más tardar el ${manif.vence_a_mas_tardar_legible}` : ""}: confírmelo en el cronograma y avise ya. Sin este aviso no hay oferta.`);
  }
  if (cierre && !cerrado) {
    const cierreDia = cierre.slice(0, 10);
    const observaciones = sumarDias(cierreDia, -7);
    if (observaciones >= hoy) paso("Envíe observaciones al pliego si algo lo deja por fuera", observaciones, "Si un requisito parece hecho a la medida de otro, obsérvelo con la redacción alternativa lista para pegar y el argumento de que restringe la participación. La fecha exacta está en el cronograma; esta es orientativa.");
    let seriedad = sumarHabiles(cierreDia, -5);
    if (seriedad < hoy) seriedad = hoy;
    paso("Pida la garantía de seriedad a su aseguradora", seriedad, "Al menos cinco días hábiles antes del cierre: la primera vez tardan.");
    let anterior = sumarDias(cierreDia, -1);
    while (!esHabil(anterior) && anterior > hoy) anterior = sumarDias(anterior, -1);
    if (anterior < hoy) anterior = hoy;
    paso("Cargue y PRESENTE la oferta completa", anterior, "El día ANTERIOR al cierre, nunca el mismo día: a la hora del cierre se cae la plataforma, la luz o el internet. Puede modificarla hasta la hora exacta del cierre sin revelar nada.");
    paso("Verifique que el estado diga «Presentada» y tome pantallazo con la hora", anterior, "«En creación» al cierre es lo mismo que no haber presentado: es el error número uno del país. Guarde la evidencia.");
    paso("Cierre del proceso", cierreDia, "Desde aquí puede descargar las ofertas de todos los competidores: precio, experiencia y consorcios. Es información pública y casi nadie la usa.");
    if (modalidad.traslado_habiles) paso("Revise el informe de evaluación y responda dentro del traslado", null, `Cuando publiquen el informe tiene ${modalidad.traslado_habiles} ${plural(modalidad.traslado_habiles, "día hábil", "días hábiles")} para: corregir lo suyo (con tabla de trazabilidad y ni una línea de más), revisar lo ajeno y observar el informe. Si le marcan «no cumple», corrija sin esperar a que se lo pidan.`);
    paso("Adjudicación, firma y acta de inicio", null, "Si gana: pólizas del contrato, firma, y NO firme el acta de inicio si la entidad no le ha entregado predio, diseños, licencias o permisos. El plazo corre desde el acta.");
  } else if (cerrado) {
    paso("El proceso ya cerró", cierre ? cierre.slice(0, 10) : null, "Si se presentó: revise el informe de evaluación y responda dentro del traslado. Si no: descargue las ofertas de los competidores y aprenda cuánto bajaron y con quién se juntaron.");
  }

  /* ── 4 · CONSEJOS PARA ESTE PROCESO ───────────────────────────────────── */
  const consejos = [];
  const consejo = (clave, titulo, detalle, por_que_aqui) => consejos.push({ clave, titulo, detalle, por_que_aqui: por_que_aqui || null });

  if (anticipo > 0) consejo("anticipo", `Hay anticipo del ${anticipo} %, pero no es plata suya todavía`,
    "El anticipo va a una fiducia (patrimonio autónomo) y se gasta solo con el plan de inversión aprobado por la interventoría; se descuenta de cada acta. Sirve para arrancar, no para financiar la empresa. Y exige una póliza de buen manejo del anticipo.", "el objeto del proceso menciona el anticipo");
  else consejo("sin_anticipo", "El proceso no publica si hay anticipo: búsquelo en el pliego",
    "Si no hay anticipo, usted paga los primeros meses de obra con su plata y cobra contra actas parciales (semanas o meses después). Haga el flujo de caja mes a mes antes de fijar el precio: si el acumulado se hunde, suba el precio o no se presente.", "la fuente pública no trae el anticipo de este proceso");
  if (esObra) consejo("contribucion_5", `Sume la contribución de obra pública del ${CONTRIBUCION_OBRA_PCT} %`,
    (presupuesto ? `Sobre el valor del contrato sin impuestos: aquí son cerca de ${millones(presupuesto * CONTRIBUCION_OBRA_PCT / 100)}, descontados en cada pago. ` : "Se descuenta del valor del contrato en cada pago. ") + "Es el olvido más caro del país y no está en ningún análisis de precios unitarios. Aplica también a las adiciones.", "es un contrato de obra");
  consejo("estampillas", "Pregunte por las estampillas del departamento y del municipio",
    "Cada departamento y municipio tiene las suyas (universidad, adulto mayor, cultura, entre otras): entre 0,5 % y 5 % acumulado, descontadas en cada pago. Están en el pliego o en el estatuto tributario de la entidad; si no las suma, las paga de su ganancia.", l.departamento_entidad ? `la obra es en ${l.departamento_entidad}` : null);
  consejo("regla_24h", "Presente la oferta el día ANTERIOR al cierre",
    "SECOP II permite retirar y modificar la oferta cuantas veces quiera hasta la hora exacta del cierre; presentar temprano no revela nada. La hora del cierre es la hora en que más ofertas mueren en Colombia.", null);
  consejo("errores_forma", "Los nueve errores de forma que descalifican, y todos dependen de usted",
    "Guardar sin dar «Presentar»; cargar el archivo en la carpeta equivocada (el precio en la técnica lo revela antes de tiempo); pasarse del peso máximo por archivo; PDF con contraseña o dañado; firma digital vencida; no responder un mensaje DENTRO de la plataforma (el correo no cuenta); dejar campos del formulario vacíos; oferta económica en otro formato; empezar a cargar el día del cierre.", null);
  if (modalidad.clave === "licitacion" || modalidad.clave === "seleccion_abreviada" || modalidad.clave === "menor_cuantia") {
    const b = ctx.baja && ctx.baja.baja_mediana != null && ctx.baja.granularidad_utilizada === "entidad" ? ctx.baja : null;
    consejo("precio_no_al_piso", "No tire el precio al piso: el método con el que puntúan el precio se sortea",
      (b ? `Los que ganaron en esta entidad ofertaron cerca de ${Math.round(b.baja_mediana)} % por debajo del presupuesto oficial (${b.procesos_contados} contratos ya adjudicados). ` : "")
      + "En tres de los cuatro métodos gana el que está cerca del PROMEDIO de las ofertas, no el más barato. Ubíquese donde gana bajo más métodos y compruebe que la ganancia sobreviva. Una oferta muy por debajo obliga a la entidad a pedirle explicaciones y, sin estructura de costos, a rechazarla.", "la modalidad puntúa el precio");
  } else if (modalidad.clave === "minima" || modalidad.clave === "subasta") {
    consejo("precio_minima", "Aquí sí gana el menor precio, pero no por debajo de su costo",
      "Calcule su costo real (con contribución, estampillas y pólizas) en la pestaña Precios y ponga el precio piso ANTES de ofertar. Una oferta por debajo del 80 % del presupuesto oficial le exige justificar sus costos y puede rechazarse.", "la modalidad adjudica al menor precio");
  } else if (modalidad.clave === "concurso") {
    consejo("concurso", "No compite por precio: compite por experiencia y equipo",
      "El puntaje sale de la experiencia de la empresa y de las hojas de vida del equipo. Cada certificación tiene que decir exactamente lo que el pliego pide (objeto, valor, fechas, entidad): una certificación incompleta vale cero puntos y no se puede corregir después.", "es un concurso de méritos");
  }
  if (manif && manif.aplica) consejo("manifestacion", "En este tipo de proceso hay que avisar ANTES de poder presentarse",
    `El interés se manifiesta en SECOP II en el plazo que fija el pliego (la ley permite como máximo ${PLAZO_MANIFESTACION_HABILES} días hábiles desde la apertura, y suele ser menos: a veces horas). Si avisan más de 10, la entidad puede sortear quiénes siguen. Avise aunque no esté seguro: no cuesta nada y sin el aviso no hay oferta.`, "selección abreviada de menor cuantía");
  if (zona.nivel === "lejos" || zona.dificil_acceso) consejo("zona_lejos", "La obra queda lejos: el costo de llegar no está en el presupuesto oficial",
    `${zona.km != null ? `Cerca de ${zona.km} km desde ${zona.base || "su base"}. ` : ""}Transporte de equipo, alojamiento del personal y visitas del director cuestan y no aparecen en el análisis de precios unitarios de la entidad. Súmelos en su administración.`, zona.etiqueta);
  if (zona.verificar_orden_publico) consejo("orden_publico", "Verifique la seguridad de la zona antes de ofertar",
    "El departamento tiene zonas donde las obras se paran por orden público. Pregunte en el municipio y a otros contratistas; una obra suspendida meses cuesta más que no haberse presentado.", zona.etiqueta);
  if (formaPrecio === "global") consejo("precio_global", "Es a precio global: el riesgo de las cantidades es suyo",
    "Si hay más cantidad de obra que la del presupuesto, no se la pagan aparte. Mida bien y ponga un colchón; en precio global, subestimar cantidades es perder plata sin remedio.", "el objeto dice «precio global»");
  else if (formaPrecio === "unitarios") consejo("precios_unitarios", "Es a precios unitarios: las cantidades del pliego son un estimativo",
    "Las mayores cantidades que la entidad ordene se deben pagar (y no cuentan como adición). Lo que sí es suyo es el precio de cada unidad: revise cada análisis, sobre todo los ítems que más pesan.", "el objeto dice «precios unitarios»");
  if (obra.plazo.cruza_diciembre || (plazoMeses != null && plazoMeses > 12)) consejo("reajuste", "El contrato cruza un cambio de año: pregunte si hay reajuste de precios",
    "En enero suben el salario mínimo y los materiales; si el contrato no tiene cláusula de reajuste, ese aumento sale de su ganancia. Si no la tiene, cotice los meses del año siguiente con el aumento incluido.", `plazo de ${obra.plazo.legible}`);
  if (puertas && puertas.p3_caja && puertas.p3_caja.pasa === false) consejo("consorcio", "Si la caja no alcanza, piense en un socio, y verifíquelo antes de firmar",
    "Un consorcio suma experiencia, capacidad y patrimonio, pero cada integrante responde por el 100 %. Antes de firmar: antecedentes del socio (Procuraduría, Contraloría, Policía, medidas correctivas) y su historial de multas. Esta aplicación lo hace en «Mi empresa» con el NIT. Y ojo: el que aporta la experiencia suele tener que participar con un mínimo (30 % a 40 %).", "el patrimonio queda corto para financiar la obra");
  if (ctx.competencia && ctx.competencia.promedio_oferentes != null) consejo("competencia", `En esta entidad suelen presentarse cerca de ${Math.round(ctx.competencia.promedio_oferentes)} empresas`,
    ctx.competencia.nivel === "baja" ? "Poca competencia puede ser un nicho ganable, o un pliego hecho a la medida de alguien: mire quién ganó antes y con qué requisitos. Si el histórico muestra siempre uno o dos oferentes, y uno sin capacidad, es la segunda." : "Cuando hay muchos oferentes, los empates son frecuentes: acredite TODOS los factores de desempate que legítimamente cumpla (empresa pequeña, personas con discapacidad en la nómina, mujeres cabeza de familia, entre otros). Es la póliza más barata del oficio.", `${ctx.competencia.total_procesos} procesos ya adjudicados de la entidad`);
  consejo("mensajes_plataforma", "Revise los mensajes DENTRO de SECOP II todos los días",
    "Las entidades piden aclaraciones por mensaje dentro del proceso y dan plazos cortos. No responder a tiempo equivale a no haber presentado. El correo externo no cuenta.", null);
  consejo("etica", "Canal formal siempre",
    "Ningún contacto con la entidad por fuera de la plataforma; ningún acuerdo con otro oferente. La regla de oro: si le incomodaría que se publicara, no se hace. La sanción es cárcel e inhabilidad de hasta 20 años.", null);

  /* ── 5 · LA PLATA QUE NADIE SUMA ──────────────────────────────────────── */
  const dinero = {
    presupuesto_oficial_cop: presupuesto,
    contribucion_obra_5pct_cop: presupuesto && esObra ? Math.round(presupuesto * CONTRIBUCION_OBRA_PCT / 100) : null,
    garantia_seriedad_asegurada_cop: presupuesto ? Math.round(presupuesto * GARANTIA_SERIEDAD_PCT / 100) : null,
    financiacion_antes_del_primer_pago_cop: presupuesto ? Math.round(Math.max(0, presupuesto * (1 - anticipo / 100)) * FRACCION_FINANCIACION) : null,
    anticipo_cop: presupuesto && anticipo > 0 ? Math.round(presupuesto * anticipo / 100) : null,
    otros_que_nadie_suma: [
      { concepto: "Estampillas del departamento y del municipio", tipico: "0,5 % a 5 % acumulado", nota: "varían por entidad: verifíquelas en el pliego" },
      { concepto: "Retención en la fuente y retención de industria y comercio", tipico: "1 % a 11 % / 0,4 % a 1,4 %", nota: "según concepto y municipio" },
      { concepto: "Pólizas del contrato (cumplimiento, salarios, estabilidad, responsabilidad civil)", tipico: "1 % a 3 %", nota: "según riesgo e historial con la aseguradora" },
      { concepto: "Costo financiero del capital de trabajo", tipico: "variable y grande", nota: "2 % mensual financiando el 40 % durante 6 meses son cerca de 5 puntos de ganancia" },
      { concepto: "Ensayos, laboratorio y certificaciones", tipico: "0,5 % a 2 %", nota: "no están en los análisis de precios" },
      { concepto: "Plan de manejo ambiental, señalización y seguridad en el trabajo", tipico: "1 % a 3 %", nota: "obligatorios y se olvidan" },
      { concepto: "Liquidación, actas y cierre", tipico: "0,5 %", nota: "el contrato no termina cuando termina la obra" },
    ],
    nota: "Cifras de referencia del manual del oficio (capítulo 11), no del pliego: confírmelas ahí antes de fijar el precio.",
  };

  const cuenta = (e) => req.filter((r) => r.estado === e).length;
  const nc = cuenta("no_cumple"), ok = cuenta("cumple");
  return {
    version: VERSION, completa, perfil: perfil || null, generada_el: new Date(ahoraMs).toISOString(),
    obra, requisitos: req, pasos, consejos, dinero,
    resumen: {
      requisitos_total: req.length, cumple: ok, revisar: cuenta("revisar"), no_cumple: nc, pendiente: cuenta("pendiente"), sin_dato: cuenta("sin_dato"),
      consejos: consejos.length, pasos: pasos.length,
      bloqueado_por: req.filter((r) => r.estado === "no_cumple").map((r) => r.titulo),
      frase: nc ? `Hay ${nc} ${plural(nc, "requisito", "requisitos")} que hoy no cumple: léalo antes de invertir tiempo.`
        : `${ok} de ${req.length} requisitos verificados por la aplicación; el resto lo consigue usted (${cuenta("pendiente")} por conseguir, ${cuenta("revisar")} por confirmar en el pliego).`,
    },
    como_leerlo: "Guía generada con las reglas de esta aplicación y el manual del oficio: lo verificado se dice «cumple» o «no cumple»; lo que solo el pliego puede confirmar, «revisar»; lo que usted tiene que conseguir, «pendiente». Ninguna cifra sustituye al pliego.",
  };
}

module.exports = { guiaDe, modalidadEnLlano, tamanoDe, filaDesdeFoto, ESTADOS_REQUISITO, CONTRIBUCION_OBRA_PCT, GARANTIA_SERIEDAD_PCT, REFERENCIA_FINANCIERA, VERSION };
