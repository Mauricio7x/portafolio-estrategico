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
   · ≤ 2 COMANDOS de Redis por petición (MGET de meta + meta del histórico, y
     TTL del candado): 2 880 llamadas/mes del monitor × 2 = 5 760 comandos,
     el 1,2 % del cupo gratuito de Upstash. La suite lo mide con el mock.
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
  let meta, metaHist, ttl;
  try {
    [[meta, metaHist], ttl] = await Promise.all([
      leerVariosJSON(redis, [CLAVES.meta, CLAVES.metaHistorico]),
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

  // require DIFERIDO: el listado carga el motor del juicio y este latido no lo necesita
  const { ultimaMedicion } = require("./listar.js");

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
