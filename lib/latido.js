/* ============================================================================
   lib/latido · El reloj que termina solas las cargas cortadas (27-sep-2026)
   ----------------------------------------------------------------------------
   Por qué existe: la carga completa, la actualización (delta) y la extracción
   del histórico avanzan por tramos que se llaman a sí mismos con un `fetch`
   suelto, y esa llamada se pierde (dos episodios con fecha: el histórico parado
   del 15 al 25-sep en el mes 17 de 33; la carga del 26-sep cortada en enero).
   El reintento tras un fallo (sección «La lista 35 horas sin datos…» de la
   memoria) cubre el corte que la propia invocación ve; no cubre la llamada que
   Vercel congela. Este latido es el relevo: alguien, desde fuera, pregunta con
   regularidad «¿quedó algo a medias?» y, si quedó, lanza UN tramo.

   No decide nada nuevo: la continuación la hacen los MISMOS handlers de siempre
   (`op=sync&modo=auto`, que ya sabe continuar una carga completa y un ciclo de
   delta; y `op=historico` con el rango EXACTO que guarda su cursor: pedirlo con
   otro rango lo reinicia desde cero, que es el defecto del 26-sep con modo=full).

   Quién lo llama: cualquier reloj. Hoy, un flujo de GitHub cada 10 min
   (.github/workflows/latido.yml), gratis y sin tocar el plan de Vercel; con Vercel
   Pro, un cron por minuto a `/api/latido` (en Hobby un cron más frecuente que
   diario tumba el despliegue: la suite lo prohíbe mientras el plan no conste).

   La decisión es PURA (`decidirLatido`) y tiene prueba; cuesta un MGET.
   ========================================================================== */
"use strict";

const INTERVALO_MS = 30 * 60e3;            // actualización programada: cada 30 min
const ESPERA_TRAS_FALLO_MS = 30 * 60e3;    // tras un fallo, no se reintenta antes de 30 min
const HORA_INICIO = 6, HORA_FIN = 22;      // horario de Colombia para la actualización programada

/* La hora en Colombia (UTC−5, sin horario de verano). */
const horaColombia = (ahora) => new Date(ahora - 5 * 3600e3).getUTCHours();

/* ¿Qué toca? `accion`: "nada" | "sync" | "historico", con su `motivo` en
   castellano. Lo que ya está a medias se retoma a cualquier hora; la
   actualización programada, solo en horario de trabajo. */
function decidirLatido({ meta, progreso, progresoHist, candadoSync, candadoHist, ahora = Date.now() } = {}) {
  if (candadoSync || candadoHist) return { accion: "nada", motivo: "hay una carga en curso: el latido no la interrumpe" };
  const m = meta || {};
  /* un fallo reciente frena el latido: reintentar cada 10 min un fallo que no es
     pasajero es el bucle de agosto con otra cara (sección «La lista 35 horas…») */
  const falloTs = m.ultimo_error && Date.parse(m.ultimo_error.ts);
  const corte = Date.parse(m.last_sync);
  const falloVigente = Number.isFinite(falloTs) && ahora - falloTs < ESPERA_TRAS_FALLO_MS
    && !(Number.isFinite(corte) && corte > falloTs);
  if (falloVigente) return { accion: "nada", motivo: "la última sincronización falló hace menos de 30 minutos: se espera antes de reintentar" };
  if (progreso && progreso.tipo === "full" && !progreso.terminado) return { accion: "sync", motivo: "la carga completa quedó a medias" };
  if (m.delta_ciclo) return { accion: "sync", motivo: "la actualización quedó a medias" };
  if (progresoHist && progresoHist.tipo === "historico" && !progresoHist.terminado && progresoHist.desde && progresoHist.hasta) {
    return { accion: "historico", motivo: "la extracción del histórico quedó a medias", desde: progresoHist.desde, hasta: progresoHist.hasta };
  }
  // una fecha que no se puede leer es «no sé», y ante «no sé» se sincroniza (regla de decidirAuto)
  if (!Number.isFinite(corte)) return { accion: "sync", motivo: "no consta ninguna sincronización" };
  const h = horaColombia(ahora);
  if (h >= HORA_INICIO && h < HORA_FIN && ahora - corte > INTERVALO_MS) return { accion: "sync", motivo: "actualización programada" };
  return { accion: "nada", motivo: "todo al día" };
}

module.exports = { decidirLatido, horaColombia, INTERVALO_MS, ESPERA_TRAS_FALLO_MS, HORA_INICIO, HORA_FIN };
