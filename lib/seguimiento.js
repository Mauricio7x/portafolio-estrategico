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
const { hoyColombia } = require("./habiles.js");
const { OFFSET_COLOMBIA_MS } = require("./filtros.js");

const ESTADOS = Object.freeze(["interesa", "presentado", "descartado"]);
const ESTADO_ETIQUETA = Object.freeze({ interesa: "Me interesa", presentado: "Me presenté", descartado: "Descartado" });
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
    presupuesto_cop: num(l.cuantia_cop ?? l.precio_base),
    fecha_publicacion: String(l.fecha_de_publicacion_del || l.fecha_publicacion || "").slice(0, 10) || null,
    fecha_cierre: cierre,
    fecha_apertura: String(l.fecha_de_apertura_de_respuesta || l.fecha_apertura || "").slice(0, 19) || null,
    url: String(l.urlproceso || l.url || "").slice(0, 400) || null,
  };
}

/* Hitos = los del dataset (lib/cronograma) + la apertura de ofertas si viene. */
function hitosDe(l) {
  const base = hitosDeFila(l);
  const ap = String((l && (l.fecha_de_apertura_de_respuesta || l.fecha_apertura)) || "").slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(ap) && !base.some((h) => h.id === "apertura")) {
    base.push({ id: "apertura", etiqueta: "Apertura de ofertas (se conocen los proponentes)", fecha: ap, origen: "dataset", evidencia: "fecha_de_apertura_de_respuesta" });
  }
  return base.sort((a, b) => a.fecha.localeCompare(b.fecha));
}

function diasHasta(fecha, ahoraMs) {
  const t = Date.parse(fecha);
  if (!Number.isFinite(t)) return null;
  return Math.ceil((t - (ahoraMs - OFFSET_COLOMBIA_MS)) / 86400000);
}

/* Enriquecer un guardado con la fila viva (o con la foto si no hay fila). */
function enriquecer(guardado, filaViva, ahoraMs = Date.now()) {
  const foto = guardado.foto || {};
  const l = filaViva || null;
  const fila = l ? { ...fotoDe(l), estado_secop: String(l.estado_del_procedimiento || "").trim() || null, fase: String(l.fase || "").trim() || null,
    adjudicado: /^si$/i.test(String(l.adjudicado || "").trim()) } : null;
  const datos = fila || foto;
  const hoy = hoyColombia(ahoraMs);
  // los hitos leen `fecha_cierre` RESUELTO (la fila cruda no lo trae): se le pasa la fila con el cierre de la foto viva
  const hitos = hitosDe(l ? { ...l, fecha_cierre: (fila && fila.fecha_cierre) || l.fecha_cierre || null } : { fecha_de_publicacion_del: foto.fecha_publicacion, fecha_cierre: foto.fecha_cierre, fecha_de_apertura_de_respuesta: foto.fecha_apertura });
  const avisos = avisosDe(hitos, hoy);
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

/* El .ics de un guardado: sus hitos, con el nombre del proceso y la entidad. */
function icsDe(enriquecido) {
  return ics(enriquecido.hitos || [], { proceso: enriquecido.proceso.nombre || enriquecido.id, entidad: enriquecido.proceso.entidad || "" });
}

module.exports = { ESTADOS, ESTADO_ETIQUETA, MAX_GUARDADOS, MAX_NOTAS, normalizarEstado, fotoDe, hitosDe, enriquecer, fichaCompetidor, icsDe, nitONull };
