/* lib/seguimiento.js · MIS PROCESOS: guardar, seguir y estudiar a la competencia (ago 2026)
   ─────────────────────────────────────────────────────────────────────────────
   Encargo del dueño (18-ago-2026): «un módulo que nos permita guardar procesos,
   ya sea porque nos interesa o porque nos presentamos; hacerle seguimiento:
   el cronograma de SECOP con avisos, y cuando se presenten ofertas saber, de
   cada proponente, cuántos contratos tiene vigentes, cuántas veces se ha
   presentado a la entidad y cuántas ha ganado, la fecha del último adjudicado,
   cuándo firmó los vigentes y por qué valor —para acercarse a su K residual—
   y si alguno está inhabilitado». Este módulo es la capa PURA: qué se guarda,
   cómo se enriquece una fila guardada con la versión viva del corpus, qué
   hitos y avisos salen de ella, y cómo se arma la ficha de un competidor con
   lo que las fuentes abiertas SÍ publican. La red y Redis viven en el handler.

   Reglas que no hay que re-aprender:
   · La foto que se guarda es MÍNIMA (id, entidad, nombre, presupuesto, cierre,
     url): el resto se lee VIVO del corpus en cada consulta, así el estado
     («cerró», «adjudicado a…») no se queda congelado en el día en que se guardó.
     Un proceso que ya no está en el corpus activo conserva la foto y lo dice.
   · Los hitos y avisos SON los de lib/cronograma (`hitosDeFila`, `avisosDe`,
     `ics`): una segunda cuenta de días divergiría de la del lector de pliegos.
     Aquí se añade la APERTURA de ofertas cuando el dataset la trae.
   · Del competidor se publica lo que las fuentes dicen, con su fuente:
     hgi6 (cuántas veces se presentó A ESTA ENTIDAD, por `codigo_entidad`, que
     a diferencia del NIT no se comparte entre regionales), p6dx (cuántas ganó
     y cuándo la última), jbjy (contratos VIGENTES: cuántos, valor, cuándo
     firmó cada uno). Lo que NO se sabe se dice: la K residual exige los
     indicadores del RUP del competidor, que no son públicos — se publica lo
     que sí (valor comprometido en contratos vigentes) y se rotula como cota,
     jamás como K. La inhabilidad la resuelve `op=socio` (SIRI + multas), que
     ya existe: aquí solo se enlaza el NIT.
   · «No Definido» no es un NIT (la trampa de siempre): viaja null. */
"use strict";

const { hitosDeFila, avisosDe, ics } = require("./cronograma.js");
const { hoyColombia, fechaLegible } = require("./habiles.js");
const { OFFSET_COLOMBIA_MS } = require("./filtros.js");
const { manifestacionDeFila, esUrgente: manifUrgente, sigueValiendoLaPena: manifVigente, PLAZO_MANIFESTACION_HABILES } = require("./manifestacion.js");

/* Los estados del seguimiento son un RECORRIDO (18-ago-2026), no tres casillas:
   me interesa → estoy preparando la oferta → me presenté → gané / perdí, y
   descartado en cualquier punto. Es la forma que tienen los rastreadores de
   licitaciones bien hechos (una lista de vigilancia con etapa por proceso), y
   lo que permite que la pestaña responda «¿en qué voy?» sin abrir nada. */
const ESTADOS = Object.freeze(["interesa", "preparando", "presentado", "ganado", "perdido", "descartado"]);
const ESTADO_ETIQUETA = Object.freeze({ interesa: "Me interesa", preparando: "Preparando la oferta", presentado: "Me presenté", ganado: "Ganado", perdido: "Perdido", descartado: "Descartado" });
/* Qué campos de la foto se VIGILAN: si el corpus vivo difiere de la última foto
   que el usuario dio por vista, la pestaña avisa «cambió el cronograma». */
const CAMPOS_VIGILADOS = Object.freeze([
  ["fecha_cierre", "Fecha de cierre (entrega de la oferta)"],
  ["fecha_apertura", "Fecha de apertura de ofertas"],
  ["presupuesto_cop", "Presupuesto oficial"],
  ["modalidad", "Modalidad"],
  ["estado_secop", "Estado en SECOP II"],
]);
const MAX_GUARDADOS = 200;
const MAX_NOTAS = 600;
const RELLENOS = new Set(["", "no definido", "null", "undefined", "n/a", "na", "-", "0"]);
const nitONull = (v) => { const s = String(v == null ? "" : v).trim(); return RELLENOS.has(s.toLowerCase()) ? null : s; };
const num = (v) => { if (v === null || v === undefined || v === "") return null; const n = Number(v); return Number.isFinite(n) ? n : null; };

function normalizarEstado(e) {
  const s = String(e || "").trim().toLowerCase();
  return ESTADOS.includes(s) ? s : "interesa";
}

/* La foto MÍNIMA que se guarda del proceso (lo justo para pintarlo si el
   corpus ya no lo trae). */
function fotoDe(l) {
  if (!l) return null;
  /* la fila CRUDA del corpus no trae `fecha_cierre` resuelto (lo pone
     `enriquecer` al servir): se deriva con la MISMA `fechaCierre` de
     lib/negocio, con require diferido (negocio → filtros → … ciclo). */
  let cierre = String(l.fecha_cierre || "").slice(0, 19) || null;
  if (!cierre) { try { cierre = String(require("./negocio.js").fechaCierre(l) || "").slice(0, 19) || null; } catch { cierre = null; } }
  if (!cierre) cierre = String(l.fecha_de_recepcion_de || "").slice(0, 19) || null;
  return {
    id: String(l.id_del_proceso || l.id || "").trim() || null,
    nombre: String(l.nombre_del_procedimiento || l.nombre || "").slice(0, 200) || null,
    entidad: String(l.entidad || "").slice(0, 160) || null,
    nit_entidad: nitONull(l.nit_entidad),
    departamento: String(l.departamento_entidad || l.departamento || "").slice(0, 80) || null,
    modalidad: String(l.modalidad_de_contratacion || l.modalidad || "").slice(0, 120) || null,
    /* La cuantía 0 del dataset es SIN DATO (la regla que aplican los filtros y
       los destacados), así que en la foto va null: con el 0 crudo, un proceso
       republicado sin la columna de valor producía la alerta de urgencia alta
       «Presupuesto oficial: antes $850.000.000, ahora $0» — la entidad no bajó
       el presupuesto, dejó de publicarlo. Con null, la guarda de `cambiosDe`
       (un null en cualquiera de los dos lados no es cambio) hace el trabajo. */
    presupuesto_cop: num(l.cuantia_cop ?? l.precio_base) || null,
    fecha_publicacion: String(l.fecha_de_publicacion_del || l.fecha_publicacion || "").slice(0, 10) || null,
    fecha_cierre: cierre,
    fecha_apertura: String(l.fecha_de_apertura_de_respuesta || l.fecha_apertura || "").slice(0, 19) || null,
    url: String(l.urlproceso || l.url || "").slice(0, 400) || null,
  };
}

/* La foto de la fila VIVA con el estado de SECOP II: es lo que se guarda como
   `visto` al pulsar «Enterado» y lo que se compara para detectar cambios. */
function fotoViva(l) {
  if (!l) return null;
  return { ...fotoDe(l), estado_secop: String(l.estado_del_procedimiento || "").trim() || null };
}

/* Hitos = los del dataset (lib/cronograma) + la apertura de ofertas si viene
   + la MANIFESTACIÓN DE INTERÉS calculada cuando la modalidad la exige (menor
   cuantía): la VENTANA en la que el plazo puede cerrar (apertura + 1 a + 3
   hábiles; la ley fija el techo y la entidad el plazo), o la fecha REAL del
   cronograma del pliego cuando alguien ya lo leyó. Nunca se presenta una fecha
   calculada como publicada. */
function hitosDe(l, hoy, opciones) {
  const base = hitosDeFila(l);
  const ap = String((l && (l.fecha_de_apertura_de_respuesta || l.fecha_apertura)) || "").slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(ap) && !base.some((h) => h.id === "apertura")) {
    base.push({ id: "apertura", etiqueta: "Apertura de ofertas (se conocen los proponentes)", fecha: ap, origen: "dataset", evidencia: "fecha_de_apertura_de_respuesta" });
  }
  /* MANIFESTACIÓN DE INTERÉS. El recordatorio se ancla al PRIMER día en que el
     plazo puede cerrar (apertura + 1 hábil), no al techo legal de 3: la ley
     fija un máximo y la entidad pone el suyo, así que en un calendario el error
     tiene que caer del lado de avisar ANTES. Con fecha del cronograma del
     pliego manda esa, y el hito deja de ser «calculado». */
  const m = manifestacionDeFila(l || {}, hoy || hoyColombia(), opciones);
  if (m && (m.fecha_limite || m.puede_cerrar_desde) && !base.some((h) => h.id === "manifestacion")) {
    base.push(m.fecha_limite
      ? { id: "manifestacion", etiqueta: "Avisar que le interesa: último día (cronograma del pliego)", fecha: m.fecha_limite, origen: "pliego", evidencia: m.nota }
      : { id: "manifestacion", etiqueta: "Avisar que le interesa: el plazo puede cerrar este día (verifíquelo)", fecha: m.puede_cerrar_desde, origen: "calculado", evidencia: m.nota });
  }
  return base.sort((a, b) => a.fecha.localeCompare(b.fecha));
}

/* Cambios de cronograma: qué difiere entre la foto VIVA del corpus y la última
   que el usuario dio por vista (`visto`, o la foto guardada si nunca pulsó
   «Enterado»). Solo campos vigilados; null contra null no es cambio, y un
   campo que la fila viva no trae (null) frente a uno guardado tampoco se
   afirma como cambio: la ausencia no es un dato nuevo (R1). */
function cambiosDe(vista, viva) {
  if (!vista || !viva) return [];
  const out = [];
  const igual = (a, b) => String(a == null ? "" : a).slice(0, 19) === String(b == null ? "" : b).slice(0, 19);
  for (const [campo, etiqueta] of CAMPOS_VIGILADOS) {
    const antes = vista[campo] == null ? null : vista[campo], ahora = viva[campo] == null ? null : viva[campo];
    if (ahora == null || antes == null || igual(antes, ahora)) continue;
    const legible = (v) => (/^\d{4}-\d{2}-\d{2}/.test(String(v)) ? fechaLegible(String(v).slice(0, 10))
      : typeof v === "number" ? "$" + Math.round(v).toLocaleString("es-CO") : String(v));
    out.push({ campo, etiqueta, antes, ahora, mensaje: `${etiqueta}: antes ${legible(antes)}, ahora ${legible(ahora)}.` });
  }
  return out;
}

function diasHasta(fecha, ahoraMs) {
  const t = Date.parse(fecha);
  if (!Number.isFinite(t)) return null;
  return Math.ceil((t - (ahoraMs - OFFSET_COLOMBIA_MS)) / 86400000);
}

/* Enriquecer un guardado con la fila viva (o con la foto si no hay fila). */
function enriquecer(guardado, filaViva, ahoraMs = Date.now(), { fechaManifestacionCronograma = null } = {}) {
  const foto = guardado.foto || {};
  const l = filaViva || null;
  const fila = l ? { ...fotoDe(l), estado_secop: String(l.estado_del_procedimiento || "").trim() || null, fase: String(l.fase || "").trim() || null,
    adjudicado: /^si$/i.test(String(l.adjudicado || "").trim()) } : null;
  const datos = fila || foto;
  const hoy = hoyColombia(ahoraMs);
  // los hitos leen `fecha_cierre` RESUELTO (la fila cruda no lo trae): se le pasa la fila con el cierre de la foto viva
  const filaHitos = l ? { ...l, fecha_cierre: (fila && fila.fecha_cierre) || l.fecha_cierre || null }
    : { fecha_de_publicacion_del: foto.fecha_publicacion, fecha_cierre: foto.fecha_cierre, fecha_de_apertura_de_respuesta: foto.fecha_apertura, modalidad_de_contratacion: foto.modalidad };
  const opcManif = { fechaCronograma: fechaManifestacionCronograma };
  const hitos = hitosDe(filaHitos, hoy, opcManif);
  const avisos = avisosDe(hitos, hoy);
  const manifestacion = manifestacionDeFila(filaHitos, hoy, opcManif);
  /* la vista de referencia para «cambió»: lo último que el usuario dio por
     visto; si nunca lo hizo, la foto del día en que guardó */
  const vista = guardado.visto || foto;
  const cambios = fila ? cambiosDe({ ...vista, estado_secop: vista.estado_secop == null ? null : vista.estado_secop }, { ...fila }) : [];
  const dias = datos.fecha_cierre ? diasHasta(datos.fecha_cierre, ahoraMs) : null;
  const cerrado = dias != null ? dias < 0 : null;
  const proximo = avisos.length ? avisos[0] : null;
  return {
    id: guardado.id, estado: guardado.estado, estado_etiqueta: ESTADO_ETIQUETA[guardado.estado] || guardado.estado,
    notas: guardado.notas || null, guardado: guardado.guardado || null, actualizado: guardado.actualizado || null,
    en_corpus: !!l,
    proceso: { ...datos },
    estado_secop: fila ? fila.estado_secop : null, fase: fila ? fila.fase : null,
    adjudicado: fila ? fila.adjudicado : null,
    dias_para_cierre: dias, cerrado,
    hitos, avisos, proximo_aviso: proximo,
    /* manifestación de interés (menor cuantía): la VENTANA en la que el plazo
       puede cerrar y su estado (la ley fija un máximo, no un plazo); null si la
       modalidad no la exige. Ver la cabecera de lib/manifestacion. */
    manifestacion,
    /* cambios de cronograma frente a lo último que el usuario vio */
    cambios, cambios_pendientes: cambios.length,
    visto_el: guardado.visto_el || null,
    /* qué se puede hacer ya: los proponentes existen tras la apertura */
    proponentes_disponibles: cerrado === true,
    lectura: !l ? "El proceso ya no está en el corpus activo (cerró y se purgó, o se despublicó): se enseña la foto guardada."
      : cerrado ? "Cerró: los proponentes que se presentaron ya se pueden consultar (fuente hgi6-6wh3)."
        : dias === 0 ? "Cierra HOY. La regla del oficio es presentar el día ANTERIOR: solo cuenta el estado «Presentada»."
          : dias === 1 ? "Cierra mañana: presente la oferta HOY."
            : `Faltan ${dias} días para el cierre.`,
  };
}

/* La ficha de un competidor con lo que las fuentes dicen. `enEntidad` viene de
   hgi6 (veces) y p6dx (ganadas); `vigentes` de jbjy. Todo puede ser null:
   ausencia, no cero. */
function fichaCompetidor(p, { veces = null, ganadas = null, vigentes = null } = {}) {
  const nit = nitONull(p.nit);
  const v = vigentes || null;
  return {
    nombre: p.nombre, nit,
    identificacion: nit ? { tipo: "nit", valor: nit } : { tipo: "sin_nit", valor: null, nota: "el dataset publica «No Definido» en vez del NIT" },
    ante_esta_entidad: {
      veces_presentado: veces && veces.veces != null ? veces.veces : null,
      ultima_vez: veces && veces.ultima ? veces.ultima : null,
      veces_ganado: ganadas && ganadas.ganadas != null ? ganadas.ganadas : null,
      ultimo_adjudicado: ganadas && ganadas.ultima ? ganadas.ultima : null,
      valor_ganado_cop: ganadas && ganadas.valor != null ? ganadas.valor : null,
      fuente: "hgi6-6wh3 (presentaciones, por código de entidad) · p6dx-8zbt (adjudicaciones, por NIT de la entidad)",
      nota: nit ? null : "sin NIT no se puede cruzar con las adjudicaciones ni con los contratos",
    },
    contratos_vigentes: v ? {
      contratos: v.contratos, valor_cop: v.valor_cop, entidades: v.entidades,
      firmas: v.firmas,           // [{fecha_firma, valor_cop, entidad, fin}] los más recientes
      fuente: "jbjy-vk9h (estado En ejecución / Modificado / Suspendido / Prorrogado)",
      lectura: "Es el valor COMPROMETIDO en contratos vigentes, no su capacidad residual: la K exige los indicadores del RUP del competidor, que no son públicos. Sirve como cota de cuánto ya tiene entre manos.",
    } : null,
    verificar_inhabilidad: nit ? { op: "socio", id: nit, nota: "SIRI (Procuraduría) y multas SECOP I por NIT: botón «Verificar»." } : null,
  };
}

/* El CENTRO DE ALERTAS de la pestaña: una sola lista, ordenada por fecha, con
   lo que pide atención en los procesos guardados —
     · cambio      el cronograma/estado cambió desde la última vez que se miró
     · manifestacion  el plazo para manifestar interés vence en ≤ 2 días hábiles
     · aviso       T-7 / T-3 / T-1 de cualquier hito (los de lib/cronograma)
     · cierre      cierra hoy o mañana (la regla de las 24 horas)
   `urgencia`: alta (hoy/mañana o cambio) · media (≤3 días) · baja (≤7).
   Solo los próximos `dias` días; nada de lo pasado ni de lo lejano. */
function alertasDe(procesos, { dias = 7 } = {}) {
  const out = [];
  for (const p of procesos || []) {
    if (p.estado === "descartado" || p.estado === "perdido" || p.estado === "ganado") continue;
    const nombre = (p.proceso && p.proceso.nombre) || p.id;
    for (const c of p.cambios || []) out.push({ tipo: "cambio", id: p.id, proceso: nombre, fecha: null, urgencia: "alta", mensaje: `Cambió: ${c.mensaje}`, campo: c.campo });
    const m = p.manifestacion;
    if (manifUrgente(m)) {
      /* Con fecha del cronograma se puede afirmar el día. Sin ella solo se
         puede decir que la ventana está corriendo — y eso ya obliga a entrar a
         SECOP II hoy, que es la acción. Nunca «vence mañana» sobre un plazo que
         la entidad pudo cerrar ayer (defecto de producción del 19-ago-2026). */
      out.push({ tipo: "manifestacion", id: p.id, proceso: nombre, fecha: m.fecha_limite || m.puede_cerrar_desde, urgencia: "alta",
        mensaje: m.confirmada
          ? (m.dias_calendario === 0 ? `Avisar que le interesa vence HOY (${m.fecha_limite_legible}); sin la manifestación en SECOP II no podrá ofertar. Fecha del cronograma del pliego.`
            : `Avisar que le interesa vence mañana (${m.fecha_limite_legible}): hágalo hoy en SECOP II. Fecha del cronograma del pliego.`)
          : `El plazo para avisar que le interesa puede estar cerrando o haber cerrado ya: la ley da un MÁXIMO de ${m.plazo_maximo_habiles || PLAZO_MANIFESTACION_HABILES} días de oficina desde la apertura (${m.apertura}) y la entidad pudo poner menos. Entre HOY a SECOP II, verifique el cronograma y manifieste. Sin la manifestación no podrá ofertar.` });
    }
    if (p.cerrado === false && p.dias_para_cierre != null && p.dias_para_cierre <= 1) {
      out.push({ tipo: "cierre", id: p.id, proceso: nombre, fecha: String(p.proceso.fecha_cierre || "").slice(0, 10) || null, urgencia: "alta",
        mensaje: p.dias_para_cierre === 0 ? "Cierra HOY: solo cuenta la oferta en estado «Presentada» antes de la hora exacta." : "Cierra mañana: presente la oferta HOY (el día del cierre es cuando más ofertas mueren)." });
    }
    /* UN aviso por hito: el más próximo (T-7, T-3 y T-1 caen los tres dentro
       de la semana y repetir tres veces el mismo hito es ruido, que es justo
       lo que el dueño pidió evitar) */
    const vistos = new Set();
    for (const a of p.avisos || []) {
      if (a.dias_antes > dias) continue;
      if (a.hito === "cierre" && a.dias_antes <= 1) continue;          // ya está como «cierre»
      if (a.hito === "manifestacion" && manifUrgente(m)) continue; // ya está arriba
      if (vistos.has(a.hito)) continue;
      vistos.add(a.hito);
      out.push({ tipo: "aviso", id: p.id, proceso: nombre, fecha: a.aviso, fecha_hito: a.fecha_hito, urgencia: a.dias_antes <= 1 ? "alta" : a.dias_antes <= 3 ? "media" : "baja", mensaje: a.mensaje, hito: a.hito });
    }
  }
  const peso = { alta: 0, media: 1, baja: 2 };
  return out.sort((a, b) => (peso[a.urgencia] - peso[b.urgencia]) || String(a.fecha || "").localeCompare(String(b.fecha || "")));
}

/* El .ics de un guardado: sus hitos, con el nombre del proceso y la entidad. */
function icsDe(enriquecido) {
  return ics(enriquecido.hitos || [], { proceso: enriquecido.proceso.nombre || enriquecido.id, entidad: enriquecido.proceso.entidad || "" });
}

module.exports = { ESTADOS, ESTADO_ETIQUETA, CAMPOS_VIGILADOS, MAX_GUARDADOS, MAX_NOTAS, normalizarEstado, fotoDe, fotoViva, hitosDe, cambiosDe, enriquecer, alertasDe, fichaCompetidor, icsDe, nitONull };
