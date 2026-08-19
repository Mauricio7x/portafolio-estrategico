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
   «proyecto de pliego»; «traslado del informe» antes que «informe de evaluación»). */
const HITOS = [
  { id: "aviso", etiqueta: "Publicación del aviso de convocatoria", re: /aviso\s+de\s+convocatoria|publicaci[oó]n\s+del\s+aviso/i },
  { id: "observaciones_proyecto", etiqueta: "Fecha límite de observaciones al proyecto de pliego", re: /observaciones\s+al\s+proyecto/i },
  { id: "proyecto_pliego", etiqueta: "Publicación del proyecto de pliego", re: /proyecto\s+de\s+pliego/i },
  { id: "manifestacion", etiqueta: "Fecha límite para manifestar interés", re: /manifest(?:aci[oó]n|ar)\s+(?:de\s+)?inter[eé]s/i },
  { id: "observaciones_pliego", etiqueta: "Fecha límite de observaciones al pliego", re: /observaciones\s+al\s+pliego|plazo\s+para\s+presentar\s+observaciones/i },
  { id: "pliego_definitivo", etiqueta: "Publicación del pliego definitivo", re: /pliego\s+(?:de\s+condiciones\s+)?definitivo|apertura\s+del\s+proceso/i },
  { id: "adendas", etiqueta: "Fecha límite para expedir adendas", re: /adendas?/i },
  { id: "traslado", etiqueta: "Traslado del informe (observaciones y subsanaciones)", re: /traslado\s+del\s+informe|observaciones\s+al\s+informe/i },
  { id: "informe_evaluacion", etiqueta: "Publicación del informe de evaluación", re: /informe\s+de\s+evaluaci[oó]n/i },
  { id: "cierre", etiqueta: "Cierre: entrega de la oferta", re: /cierre|presentaci[oó]n\s+de\s+(?:las\s+)?ofertas|recepci[oó]n\s+de\s+ofertas/i },
  { id: "adjudicacion", etiqueta: "Adjudicación", re: /audiencia\s+de\s+adjudicaci[oó]n|adjudicaci[oó]n/i },
  { id: "firma", etiqueta: "Firma del contrato", re: /firma\s+del\s+contrato|suscripci[oó]n\s+del\s+contrato/i },
];
const MESES = { enero: 1, febrero: 2, marzo: 3, abril: 4, mayo: 5, junio: 6, julio: 7, agosto: 8, septiembre: 9, setiembre: 9, octubre: 10, noviembre: 11, diciembre: 12 };
const iso = (a, m, d) => `${a}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
/* El día se valida contra la LONGITUD REAL del mes: con `d <= 31`, un «31/02»
   producía `2026-02-31` y el .ics salía con `DTSTART;VALUE=DATE:20260231`, una
   fecha que no existe y que un cliente estricto puede rechazar — y con él,
   todas las alarmas del calendario. Una fecha imposible es un hito «sin fecha
   legible», que este módulo ya sabe contar sin inventarla. */
const diasDelMes = (a, m) => new Date(Date.UTC(a, m, 0)).getUTCDate();
const valida = (a, m, d) => m >= 1 && m <= 12 && a >= 2000 && a <= 2100 && d >= 1 && d <= diasDelMes(a, m);

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

/* Hitos leídos del texto del pliego. Un hito solo entra si su línea trae fecha.
   Cada hito viaja con la PÁGINA de la que salió (marcadores de lib/paginas;
   `null` si el texto no los trae): «confirme en el cronograma» es más fácil
   con «pág. 12» delante. */
function extraerHitos(texto) {
  const lineas = lineasConPagina(texto);
  const hitos = [];
  let sinFecha = 0;
  const vistos = new Set();
  for (const { linea, pagina } of lineas) {
    for (const h of HITOS) {
      if (vistos.has(h.id) || !h.re.test(linea)) continue;
      const f = fechaEnLinea(linea);
      if (!f) { sinFecha++; break; }
      hitos.push({ id: h.id, etiqueta: h.etiqueta, fecha: f, origen: "pliego", evidencia: linea.trim().slice(0, 160), pagina: pagina == null ? null : pagina });
      vistos.add(h.id);
      break;
    }
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

/* Une dataset + pliego (el pliego manda si trae el mismo hito: es la fuente
   oficial más fina), ordena por fecha. */
function combinarHitos(delDataset, delPliego) {
  const porId = new Map();
  for (const h of delDataset || []) porId.set(h.id, h);
  for (const h of delPliego || []) porId.set(h.id, h);
  return [...porId.values()].sort((a, b) => a.fecha.localeCompare(b.fecha));
}

/* Avisos a T-7, T-3 y T-1 de cada hito FUTURO (o de hoy). */
function avisosDe(hitos, hoy) {
  const h0 = hoy || hoyColombia();
  const out = [];
  for (const h of hitos) {
    if (h.fecha < h0) continue;
    for (const d of [7, 3, 1]) {
      const cuando = sumarDias(h.fecha, -d);
      if (cuando < h0) continue;
      out.push({ hito: h.id, etiqueta: h.etiqueta, fecha_hito: h.fecha, aviso: cuando, dias_antes: d, mensaje: `${d === 1 ? "Falta 1 día" : `Faltan ${d} días`} para: ${h.etiqueta} (${fechaLegible(h.fecha)}).` });
    }
  }
  return out.sort((a, b) => a.aviso.localeCompare(b.aviso) || a.dias_antes - b.dias_antes);
}

/* OJO: `"\\;"` en JavaScript es solo `";"` — la barra hay que escaparla. El
   punto y coma quedaba CRUDO en la salida (RFC 5545 §3.3.11), y la DESCRIPTION
   lleva una línea literal del pliego, donde el «;» es frecuente. */
const escIcs = (s) => String(s || "").replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
const compacta = (isoFecha) => String(isoFecha).replace(/-/g, "");
/* Calendario .ics: un VEVENT de todo el día por hito, con VALARM a −7/−3/−1. */
function ics(hitos, { proceso = "", entidad = "", uidBase = "detekta" } = {}) {
  const lineas = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Detekta//Cronograma//ES", "CALSCALE:GREGORIAN", "METHOD:PUBLISH"];
  const sello = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  for (const h of hitos) {
    const fin = sumarDias(h.fecha, 1);
    lineas.push("BEGIN:VEVENT",
      `UID:${uidBase}-${escIcs(proceso || "proceso")}-${h.id}-${compacta(h.fecha)}@detekta`,
      `DTSTAMP:${sello}`,
      `DTSTART;VALUE=DATE:${compacta(h.fecha)}`,
      `DTEND;VALUE=DATE:${compacta(fin)}`,
      `SUMMARY:${escIcs(`${h.etiqueta}${proceso ? ` · ${proceso}` : ""}`)}`,
      `DESCRIPTION:${escIcs(`${entidad ? entidad + ". " : ""}Fuente: ${h.origen === "pliego" ? `cronograma del pliego${h.pagina != null ? ` (pág. ${h.pagina})` : ""}` : h.origen === "calculado" ? "fecha CALCULADA por Detekta, no publicada" : "SECOP II"}. ${h.evidencia || ""}`)}`);
    for (const d of [7, 3, 1]) {
      lineas.push("BEGIN:VALARM", "ACTION:DISPLAY", `DESCRIPTION:${escIcs(`${d === 1 ? "Falta 1 día" : `Faltan ${d} días`} para: ${h.etiqueta}`)}`, `TRIGGER:-P${d}D`, "END:VALARM");
    }
    lineas.push("END:VEVENT");
  }
  lineas.push("END:VCALENDAR");
  return lineas.join("\r\n") + "\r\n";
}

module.exports = { HITOS, fechaEnLinea, extraerHitos, hitosDeFila, combinarHitos, avisosDe, ics };
