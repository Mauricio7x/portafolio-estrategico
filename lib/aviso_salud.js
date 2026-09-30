/* ============================================================================
   lib/aviso_salud · El correo cuando la salud se pone en rojo, y cuando vuelve (30-sep-2026)
   ----------------------------------------------------------------------------
   Por qué existe: `op=salud` sabe decir en rojo qué se paró (la sincronización,
   el reloj, la copia), pero nadie la miraba. El monitor externo de la
   consultoría (Better Stack) exige que el dueño cree una cuenta aparte; este
   aviso usa el correo que la aplicación YA tiene (lib/correo, el de la
   mañana) y el latido que YA corre cada 10 min (lib/handlers/procesos/latido).

   Reglas (decidirAvisoSalud, pura):
   - un rojo avisa solo si SIGUE rojo 20 min después (dos latidos): un fallo que
     se cura solo en el siguiente tramo no despierta a nadie;
   - avisado una vez, recuerda cada 24 h mientras siga rojo, no cada 10 min;
   - al volver a verde, avisa que se recuperó SOLO si antes avisó el rojo;
   - un envío que falla no cuenta como avisado: el siguiente latido lo reintenta.
   ========================================================================== */
"use strict";

const ESPERA_ANTES_DE_AVISAR_MS = 20 * 60e3;
const RECORDAR_CADA_MS = 24 * 3600e3;

/* estado guardado: null | { rojo: true, desde, avisado_ts, motivos } */
function decidirAvisoSalud({ previo, ok, motivos = [], ahora = Date.now() }) {
  const p = previo && typeof previo === "object" ? previo : null;
  if (ok === true) {
    if (p && p.rojo && p.avisado_ts) return { enviar: "recuperada", estado: null };
    return { enviar: null, estado: null };
  }
  if (ok !== false) return { enviar: null, estado: p }; // salud ilegible: «no sé», no se toca nada
  const desde = p && p.rojo && Number.isFinite(Date.parse(p.desde)) ? p.desde : new Date(ahora).toISOString();
  const base = { rojo: true, desde, avisado_ts: (p && p.rojo && p.avisado_ts) || null, motivos };
  const avisado = Date.parse(base.avisado_ts);
  const toca = Number.isFinite(avisado)
    ? ahora - avisado >= RECORDAR_CADA_MS
    : ahora - Date.parse(desde) >= ESPERA_ANTES_DE_AVISAR_MS;
  return { enviar: toca ? (Number.isFinite(avisado) ? "recordatorio" : "rojo") : null, estado: base };
}

const horaColombia = (iso) => {
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return "hora desconocida";
  const d = new Date(t - 5 * 3600e3);
  const dd = (n) => String(n).padStart(2, "0");
  return `${dd(d.getUTCDate())}/${dd(d.getUTCMonth() + 1)}/${d.getUTCFullYear()} ${dd(d.getUTCHours())}:${dd(d.getUTCMinutes())} (hora de Colombia)`;
};

/* El correo, en castellano llano: qué pasa, desde cuándo y dónde mirarlo. */
function plantillaAviso(tipo, { estado, motivos = [], url = null }) {
  const marca = require("./glosario.js").MARCA.nombre;   // la marca sale de un solo sitio
  const donde = url ? `\n\nEl detalle está en ${url}` : "";
  if (tipo === "recuperada") {
    return {
      asunto: `${marca}: el problema se resolvió`,
      texto: `Lo que le avisamos de ${marca} volvió a funcionar. No tiene que hacer nada.${donde}`,
    };
  }
  const lista = motivos.length ? motivos.map((m) => `- ${m}`).join("\n") : "- sin detalle";
  return {
    asunto: `${marca}: hay un problema que revisar${tipo === "recordatorio" ? " (sigue igual)" : ""}`,
    texto: `Desde el ${horaColombia(estado && estado.desde)}, ${marca} tiene esto sin resolver:\n\n${lista}\n\n`
      + "Si es la sincronización, la lista puede no mostrar lo último publicado en SECOP II. "
      + "Si no se resuelve solo, pida revisarlo." + donde,
  };
}

module.exports = { decidirAvisoSalud, plantillaAviso, ESPERA_ANTES_DE_AVISAR_MS, RECORDAR_CADA_MS };
