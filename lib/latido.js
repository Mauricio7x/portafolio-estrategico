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
   regularidad «¿quedó algo a medias?» y, si quedó, lanza el tramo, y lo repite
   en el mismo proceso hasta 3 tandas (18-oct-2026, `otraTandaDelLatido`).

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

/* VARIAS TANDAS POR LATIDO (18-oct-2026). Medido ese día: con el muro de Vercel puesto la
   cadena de la sincronización no arrancó ninguna tanda más, y el ciclo de la mañana llevaba 3
   tandas en casi 3 horas, una por latido. El latido llama al handler EN ESTE PROCESO (no pasa
   por el muro ni por una llamada que Vercel pueda congelar), así que ahora repite el tramo
   mientras siga a medias, con dos topes: TANDAS_POR_LATIDO y no arrancar una tanda pasados
   ARRANCAR_TANDA_HASTA_MS (la función tiene 300 s y una tanda midió 57 a 62 s en producción).
   Para en cuanto el tramo falla, otro tiene el candado, termina, o no avanzó: un ciclo atascado
   no puede gastar tres veces la CPU de cada latido (la pausa del 30-sep por CPU activa). */
const TANDAS_POR_LATIDO = 3;
const ARRANCAR_TANDA_HASTA_MS = 170e3;
/* Y otra tanda solo si la más larga que ya se vio, con un 30 % de holgura, cabe antes de los
   280 s (la función tiene 300): una tanda lenta no puede dejar a la siguiente cortada a medias
   por Vercel (revisión adversaria del 18-oct, sin defecto reproducido: es la cota que faltaba). */
const LIMITE_DEL_LATIDO_MS = 280e3;

/* Lo que dice cuánto avanzó un tramo, o null si su respuesta no trae nada reconocible
   (null no se compara: «no sé si avanzó» no detiene, lo acotan los dos topes). */
function huellaDeAvance(cuerpo) {
  if (!cuerpo || typeof cuerpo !== "object") return null;
  const p = (x) => (x && x.progreso ? [x.progreso.mes, x.progreso.mesIdx, x.progreso.leidasMes] : null);
  const partes = {
    delta: cuerpo.delta ? cuerpo.delta.ciclo_leidas : null,
    full: p(cuerpo),
    extraccion: p(cuerpo.extraccion),
    /* los constructores de los derivados no traen `progreso`: devuelven `{ done, pendientes }`
       (meses que les faltan; revisión adversaria del 18-oct, que lo encontró muerto) */
    derivados: DERIVADOS.map((n) => (cuerpo[n] && typeof cuerpo[n] === "object"
      ? [cuerpo[n].done === true, Number.isInteger(cuerpo[n].pendientes) ? cuerpo[n].pendientes : null] : null)),
  };
  const algo = partes.delta != null || partes.full || partes.extraccion || partes.derivados.some((x) => x != null);
  return algo ? JSON.stringify(partes) : null;
}

/** ¿El latido lanza otra tanda? (pura, con prueba). `tandas` = las ya hechas en este latido. */
function otraTandaDelLatido({ tandas, transcurridoMs, status, cuerpo, huellaPrevia = null, tandaMasLargaMs = 0 } = {}) {
  const huella = huellaDeAvance(cuerpo);
  const no = (motivo) => ({ seguir: false, motivo, huella });
  if (!Number.isInteger(status) || status >= 400) return no("el tramo respondió con error");
  if (!cuerpo || cuerpo.ok === false) return no("el tramo no respondió bien");
  if (cuerpo.enCurso) return no("otra tanda tiene el candado");
  if (cuerpo.done === true) return no("terminó");
  if (cuerpo.done !== false) return no("el tramo no dijo si terminó");
  if (!Number.isInteger(tandas) || tandas >= TANDAS_POR_LATIDO) return no(`ya van ${TANDAS_POR_LATIDO} tandas en este latido`);
  if (!Number.isFinite(transcurridoMs) || transcurridoMs >= ARRANCAR_TANDA_HASTA_MS
    || transcurridoMs + 1.3 * (Number.isFinite(tandaMasLargaMs) ? tandaMasLargaMs : 0) > LIMITE_DEL_LATIDO_MS) return no("no queda tiempo para otra tanda en este latido");
  if (huella != null && huella === huellaPrevia) return no("la tanda no avanzó");
  return { seguir: true, motivo: null, huella };
}

module.exports = {
  decidirLatido, DERIVADOS, horaColombia, INTERVALO_MS, ESPERA_TRAS_FALLO_MS, HORA_INICIO, HORA_FIN,
  otraTandaDelLatido, huellaDeAvance, TANDAS_POR_LATIDO, ARRANCAR_TANDA_HASTA_MS, LIMITE_DEL_LATIDO_MS,
};
