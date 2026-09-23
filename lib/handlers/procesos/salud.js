/* ============================================================================
   lib/handlers/procesos/salud.js · ¿La sincronización está viva? (GET /api/procesos?op=salud · público, solo lee)
   ----------------------------------------------------------------------------
   Existe para un monitor externo (6-sep-2026, M-INF-04): un GET cada 15 min
   con la palabra clave `"ok":true`. Producción estuvo 14 h sin sincronizar
   porque el único rastro del fallo era el 502 que recibe el cron de las 08:30
   —que nadie lee— y un registro que dura una hora.

   Contrato, y por qué es así:
   · SIN token: no publica ninguna cifra del perfil ni del corpus más allá de
     conteos (chunks, filas, duración). Lo que se publica es el HECHO: cuándo
     fue el último corte, si el último intento falló y con qué texto (pasado
     por tacharClave en sync.js), si hay una corrida en curso y hace cuánto se
     refrescó el histórico.
   · ≤ 2 COMANDOS de Redis por petición (MGET de meta + meta del histórico +
     meta del índice de competencia, y TTL del candado): 2 880 llamadas/mes
     del monitor × 2 = 5 760 comandos, el 1,2 % del cupo gratuito de Upstash. La suite lo mide con el mock.
     ÚNICA excepción, declarada (M-SEG-07, 6-sep-2026): con «&cuota=1» se lee
     además el máximo observado del límite por conexión (un comando más). El
     monitor no manda ese parámetro y sigue en 2; lo pide el dueño, a mano,
     cuando va a fijar el tope. La suite mide los dos casos.
   · NO toma el candado ni sincroniza: un latido no puede disparar trabajo
     contra SECOP (por eso el monitor tampoco se apunta a op=sync&modo=auto).
   · `ok` se decide sobre milisegundos crudos, nunca sobre `edad_horas`
     (redondeada para MOSTRAR); `edad_horas` es null sin corte, jamás 0.
   · Responde 200 con `ok:false` cuando Redis contestó: el diagnóstico va en
     el cuerpo y `motivo` dice por qué. 502 solo si Redis no respondió —que es
     también un fallo que el monitor tiene que ver—, 503 sin credenciales.
   ========================================================================== */
"use strict";

const { crearRedis, hayCredenciales } = require("../../redis.js");
const { CLAVES, leerVariosJSON } = require("../../almacen.js");
const { hayGuardaDeSincronizacion } = require("../../auth.js");
// M-SEG-07: la configuración del límite por conexión y dónde vive lo observado
const { configuracionDeCuota, CLAVE_CUOTA_OBSERVADO } = require("../../perfil_dinamico.js");

/* Más de 30 h sin corte nuevo = el cron diario (08:30 UTC) no corrió o no
   terminó y ninguna visita lo suplió: 24 h del cron más un margen de 6 h para
   una corrida larga. Es la señal del monitor, no un plazo del negocio. */
const EDAD_MAXIMA_HORAS = 30;

/* Cuánto tiempo cuenta para `ok` que la última lectura del índice de
   competencia de ESTA instancia fallara (23-sep-2026). Sin límite, UN fallo
   transitorio dejaba `ok:false` mientras la instancia siguiera viva y nadie
   cargara la lista en ella —el propio latido del monitor la mantiene
   caliente—, avisando por correo de un fallo ya curado. 30 min son dos
   latidos del monitor (cada 15 min): es la señal del monitor, no un plazo del
   negocio. Pasada la ventana la lectura sigue viajando como dato, con su ts,
   pero deja de tumbar `ok`. */
const VIGENCIA_FALLO_LECTURA_MS = 30 * 60e3;

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (!hayCredenciales()) {
    return res.status(503).json({
      ok: false,
      error: "Faltan credenciales de Upstash Redis en el despliegue.",
      que_hacer: "Revise UPSTASH_REDIS_REST_URL y UPSTASH_REDIS_REST_TOKEN en Vercel (Settings → Environment Variables) y vuelva a desplegar.",
    });
  }
  const redis = crearRedis({});
  let meta, metaHist, progresoHist, metaIndice, ttl;
  try {
    /* el progreso del histórico entra en el MISMO MGET: la cerradura de ≤ 2
       comandos se conserva (una clave más en un MGET no es un comando más).
       La meta del índice de competencia, igual (23-sep-2026). */
    [[meta, metaHist, progresoHist, metaIndice], ttl] = await Promise.all([
      leerVariosJSON(redis, [CLAVES.meta, CLAVES.metaHistorico, CLAVES.progresoHistorico, CLAVES.indiceMeta]),
      redis.ttl(CLAVES.lock),
    ]);
  } catch (e) {
    return res.status(502).json({
      ok: false,
      error: `Redis: ${e.message}`,
      que_hacer: "La base de datos no respondió. Si persiste en unos minutos, revise el estado de Upstash y el despliegue en Vercel.",
    });
  }

  /* Lo observado por el límite por conexión solo se lee si se pide (un comando más). */
  const pidioCuota = ["1", "true", "si", "sí"].includes(String((req.query || {}).cuota || "").toLowerCase());
  let observado = null;
  if (pidioCuota) {
    try {
      const crudo = await redis.get(CLAVE_CUOTA_OBSERVADO);
      observado = crudo ? JSON.parse(crudo) : {};
    } catch { observado = null; }   // ilegible es «no sé», jamás «ninguno»
  }

  const ahora = Date.now();
  const ultima = meta && meta.last_sync ? String(meta.last_sync) : null;
  const instante = ultima ? Date.parse(ultima) : NaN;
  const edadMs = Number.isFinite(instante) ? ahora - instante : null;
  const ultimoError = meta && meta.ultimo_error ? meta.ultimo_error : null;
  const histTs = metaHist && metaHist.ts ? Date.parse(metaHist.ts) : NaN;

  const motivos = [];
  if (edadMs === null) motivos.push("todavía no se ha completado ninguna sincronización");
  else if (edadMs > EDAD_MAXIMA_HORAS * 3600e3) motivos.push(`la última sincronización tiene más de ${EDAD_MAXIMA_HORAS} horas`);
  if (ultimoError) motivos.push(`la última sincronización falló (${ultimoError.ts})`);
  /* UN HISTÓRICO SIN SELLAR NO PUEDE PASAR MUDO (12-sep-2026). El backfill
     escribía `terminado: true` ANTES del sello (`sync:historico:meta`), así que
     un fallo entre los dos comandos dejaba un corpus histórico bajado y SIN
     resumen: la siguiente llamada respondía «ya estaba» sin reintentar y el
     refresco mensual no volvía a dispararse nunca. Aquí eso solo se veía como
     `historico_hace_dias: null`, que no cambiaba `ok`: el monitor no sonaba.
     El criterio es el mismo que el de los otros motivos —se nombra un HECHO
     medido, no una sospecha—: hay un progreso que SE DECLARA terminado y no hay
     sello legible que lo respalde. Deliberadamente NO suena cuando no hay
     progreso ninguno (el primer backfill es decisión manual del dueño y un
     despliegue recién hecho no es un fallo) ni cuando el progreso sigue abierto
     (esa cadena la reanuda `decidirRefrescoHistorico` sola). */
  const histSinSellar = !!(progresoHist && progresoHist.tipo === "historico"
    && progresoHist.terminado === true && !Number.isFinite(histTs));
  if (histSinSellar) motivos.push("la extracción histórica terminó sin dejar resumen: el refresco mensual no se volverá a disparar");

  // require DIFERIDO: el listado carga el motor del juicio y este latido no lo necesita
  const { ultimaMedicion, ultimaLecturaIndice } = require("./listar.js");

  /* ¿EXISTE EL ÍNDICE DE COMPETENCIA, CUÁNDO SE ARMÓ Y CUÁNTAS ENTIDADES
     CLASIFICA? (23-sep-2026). Todas las tarjetas decían «sin datos de cuántos
     compiten» y desde Chrome no había forma de saber si faltaba el índice, si
     estaba vacío o si no se podía leer. Sale de su META (una clave más en el
     MGET): no lee el hash —eso sería un HGETALL de megas en cada latido—.
     Cada cifra ausente es null, jamás 0. `hace_dias` es para MOSTRAR: no decide
     nada. Que no exista NO cambia `ok`: el primer índice lo arma el dueño a mano
     y un despliegue nuevo no es un fallo. */
  const conteo = (v) => (v == null || v === "" || !Number.isFinite(Number(v)) ? null : Number(v));
  const idxTs = metaIndice && metaIndice.construido ? Date.parse(metaIndice.construido) : NaN;
  const indiceCompetencia = metaIndice
    ? {
      construido: metaIndice.construido || null,
      hace_dias: Number.isFinite(idxTs) ? Math.round((ahora - idxTs) / 864e5) : null,
      clasificadas: conteo(metaIndice.clasificadas),
      entidades_con_procesos: conteo(metaIndice.entidades),
      sin_oferentes: conteo(metaIndice.descartados && metaIndice.descartados.sin_oferentes),
    }
    : null;
  /* LA ÚLTIMA LECTURA, POR INSTANCIA. El listado anota cómo le fue la última vez
     que necesitó el índice (cero comandos aquí, como `medicion_listado`). Si
     falló, las tarjetas de esa carga dijeron «no se pudo consultar la
     competencia»: es un fallo real y el monitor tiene que verlo. Con la
     advertencia de que vive en la memoria de UNA instancia del servidor: otra
     puede estar sana, y una instancia recién arrancada no sabe nada (null). */
  const lecturaIndice = ultimaLecturaIndice() || null;
  // la decisión va sobre milisegundos crudos; un ts ilegible cuenta como vigente (lado conservador)
  const tsFalloIndice = lecturaIndice && lecturaIndice.ok === false ? Date.parse(lecturaIndice.ts) : NaN;
  const falloIndiceVigente = !!lecturaIndice && lecturaIndice.ok === false
    && !(Number.isFinite(tsFalloIndice) && ahora - tsFalloIndice > VIGENCIA_FALLO_LECTURA_MS);
  if (falloIndiceVigente) {
    motivos.push(`en esta instancia del servidor, la última lectura del índice de competencia falló (${lecturaIndice.ts}): `
      + "las tarjetas de esa carga no pudieron decir cuántos compiten");
  }

  return res.status(200).json({
    ok: motivos.length === 0,
    motivo: motivos.length ? motivos.join("; ") : null,
    ultima_sincronizacion: ultima,
    // para MOSTRAR (dos decimales); la decisión de `ok` usa los milisegundos crudos
    edad_horas: edadMs === null ? null : Math.round(edadMs / 36e3) / 100,
    edad_maxima_horas: EDAD_MAXIMA_HORAS,
    ultimo_error: ultimoError,
    sincronizando: Number.isInteger(ttl) && ttl >= 0,
    candado_segundos: Number.isInteger(ttl) && ttl >= 0 ? ttl : null,
    historico_hace_dias: Number.isFinite(histTs) ? Math.round((ahora - histTs) / 864e5) : null,
    medicion_listado: ultimaMedicion() || null,
    indice_competencia: indiceCompetencia,
    lectura_indice_competencia: lecturaIndice
      ? {
        ...lecturaIndice,
        alcance: "solo esta instancia del servidor: otra puede haber leído bien o mal. Abrir la lista de oportunidades "
          + "vuelve a leer el índice en esta instancia y, si lo lee, apaga el aviso; un fallo de más de "
          + `${VIGENCIA_FALLO_LECTURA_MS / 60e3} minutos deja de contar para «ok» y se conserva aquí como dato`,
      }
      : null,
    /* ¿op=sync exige el Bearer del cron o la llave? (M-SEG-08): false = no
       hay CRON_SECRET en el despliegue y la sincronización sigue pública. No
       cambia `ok` —no es un fallo de la sincronización— pero deja de ser mudo. */
    sincronizacion_protegida: hayGuardaDeSincronizacion(),
    /* ¿El aviso diario por correo puede salir? (6-sep-2026, M-COMP-03). Su
       fallo sería MUDO: el cron de cada mañana recibiría 401 —sin CRON_SECRET
       no tiene cómo identificarse— o no encontraría el proveedor, y nadie lo
       vería nunca. Aquí se publica QUÉ FALTA, jamás el valor de nada; como
       `sincronizacion_protegida`, no cambia `ok` (no es un fallo de la
       sincronización y el monitor no debe sonar por ello). */
    /* EL LÍMITE DE REGISTROS POR CONEXIÓN (M-SEG-07, 6-sep-2026). La configuración
       es gratis (sale del entorno) y viaja SIEMPRE. Lo observado vive en Redis y
       cuesta un comando, así que solo se lee cuando se pide con «&cuota=1»: este
       latido lo llama un monitor 2.880 veces al mes y tiene una cerradura de ≤ 2
       comandos que la ficha no contemplaba. `maximo_por_dia` es null cuando no se
       pidió —«no se preguntó» no es «cero registros»— y `como_verlo` dice cómo. */
    limite_de_registros_por_conexion: {
      ...configuracionDeCuota(),
      maximo_por_dia: observado,
      como_verlo: pidioCuota ? null : "Añada «&cuota=1» al final de esta misma dirección para ver el máximo por día.",
      como_fijarlo: "El tope entró como cifra SUPUESTA (300 plazas / 24 horas). Cuando «maximo_por_dia» tenga una semana, "
        + "fije CUOTA_ALTAS_HORA en Vercel (Settings → Environment Variables) con esa cifra y vuelva a desplegar.",
    },
    aviso_por_correo: (() => {
      const { configuracionDeCorreo } = require("../../correo.js");
      const c = configuracionDeCorreo();
      const falta = [...c.falta, ...(hayGuardaDeSincronizacion() ? [] : ["CRON_SECRET"])];
      return { configurado: falta.length === 0, falta };
    })(),
  });
};

module.exports.EDAD_MAXIMA_HORAS = EDAD_MAXIMA_HORAS;
module.exports.VIGENCIA_FALLO_LECTURA_MS = VIGENCIA_FALLO_LECTURA_MS;
