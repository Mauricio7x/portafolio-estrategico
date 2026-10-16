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

   Quién lo llama: cualquier reloj. Un flujo de GitHub
   (.github/workflows/latido.yml), gratis y sin tocar el plan de Vercel; con Vercel
   Pro, un cron por minuto a `/api/latido` (en Hobby un cron más frecuente que
   diario tumba el despliegue: la suite lo prohíbe mientras el plan no conste).

   La decisión es PURA (`decidirLatido`) y tiene prueba; cuesta un MGET.
   ========================================================================== */
"use strict";

/* INTERVALO_MS · red de seguridad, no horario (16-oct-2026). Era 30 min: el latido
   pedía una actualización cada media hora de 6 a 22 h (hasta 32 al día), y Vercel
   Hobby pausó el proyecto el 30-sep por CPU activa. Las actualizaciones las dan
   los dos crons de vercel.json (7:50 a. m. y 8:00 p. m., decisión del dueño del
   30-sep); el latido solo actúa si el dato pasa de 13 h, MÁS que el hueco mayor
   entre los dos crons (12 h 10 min), o sea cuando uno de ellos no llegó. */
const INTERVALO_MS = 13 * 3600e3;
const ESPERA_TRAS_FALLO_MS = 30 * 60e3;    // tras un fallo, no se reintenta antes de 30 min
const HORA_INICIO = 6, HORA_FIN = 22;      // horario de Colombia para la actualización programada

/* La hora en Colombia (UTC−5, sin horario de verano). */
const horaColombia = (ahora) => new Date(ahora - 5 * 3600e3).getUTCHours();

/* ¿Qué toca? `accion`: "nada" | "sync" | "historico", con su `motivo` en
   castellano. Lo que ya está a medias se retoma a cualquier hora; la
   actualización programada, solo en horario de trabajo. */
/* Los cuatro derivados que la extracción del histórico construye DESPUÉS de marcar
   su cursor `terminado` (lib/handlers/procesos/historico.js, memoria en
   `sync:historico:derivados`): si la cadena muere en esa fase, el cursor dice
   «terminado» y los índices quedan a medias. */
const DERIVADOS = ["indice", "baja", "equivalencias", "vocabulario"];

function decidirLatido({ meta, progreso, progresoHist, derivados, candadoSync, candadoHist, ahora = Date.now() } = {}) {
  if (candadoSync || candadoHist) return { accion: "nada", motivo: "hay una carga en curso: el latido no la interrumpe" };
  const m = meta || {};
  /* un fallo reciente frena el latido: reintentar en cada latido un fallo que no es
     pasajero es el bucle de agosto con otra cara (sección «La lista 35 horas…») */
  const falloTs = m.ultimo_error && Date.parse(m.ultimo_error.ts);
  const corte = Date.parse(m.last_sync);
  const falloVigente = Number.isFinite(falloTs) && ahora - falloTs < ESPERA_TRAS_FALLO_MS
    && !(Number.isFinite(corte) && corte > falloTs);
  if (falloVigente) return { accion: "nada", motivo: "la última sincronización falló hace menos de 30 minutos: se espera antes de reintentar" };
  if (progreso && progreso.tipo === "full" && !progreso.terminado) return { accion: "sync", motivo: "la carga completa quedó a medias" };
  // un fallo de hace más de 30 min sin actualización posterior se reintenta (16-oct-2026: con 13 h de
  // intervalo quedaba pegado y la pantalla decía «se reintenta» sin que nadie reintentara)
  if (Number.isFinite(falloTs) && !(Number.isFinite(corte) && corte > falloTs)) return { accion: "sync", motivo: "la última actualización falló: se reintenta" };
  if (m.delta_ciclo) return { accion: "sync", motivo: "la actualización quedó a medias" };
  if (progresoHist && progresoHist.tipo === "historico" && !progresoHist.terminado && progresoHist.desde && progresoHist.hasta) {
    return { accion: "historico", motivo: "la extracción del histórico quedó a medias", desde: progresoHist.desde, hasta: progresoHist.hasta };
  }
  if (progresoHist && progresoHist.tipo === "historico" && progresoHist.terminado && progresoHist.desde && progresoHist.hasta
    && DERIVADOS.some((n) => !(derivados && derivados[n]))) {
    // mismo rango: op=historico ve el cursor terminado y sigue a los derivados, sin volver a bajar nada
    return { accion: "historico", motivo: "los índices del histórico quedaron a medias", desde: progresoHist.desde, hasta: progresoHist.hasta };
  }
  // una fecha que no se puede leer es «no sé», y ante «no sé» se sincroniza (regla de decidirAuto)
  if (!Number.isFinite(corte)) return { accion: "sync", motivo: "no consta ninguna sincronización" };
  const h = horaColombia(ahora);
  if (h >= HORA_INICIO && h < HORA_FIN && ahora - corte > INTERVALO_MS) return { accion: "sync", motivo: "la actualización programada no llegó: el dato tiene más de 13 horas" };
  return { accion: "nada", motivo: "todo al día" };
}

module.exports = { decidirLatido, DERIVADOS, horaColombia, INTERVALO_MS, ESPERA_TRAS_FALLO_MS, HORA_INICIO, HORA_FIN };
