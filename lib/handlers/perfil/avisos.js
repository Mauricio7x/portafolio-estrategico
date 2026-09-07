/* lib/handlers/perfil/avisos.js · /api/perfil?op=avisos (6-sep-2026, M-COMP-03)
   ─────────────────────────────────────────────────────────────────────────────
   EL AVISO DIARIO POR CORREO de lo que cierra y de lo que cambió. Lo dispara el
   segundo cron de vercel.json (por el rewrite /api/avisos, igual que /api/sync:
   una URL con «?» en el cron no aporta nada y arriesga el despliegue).

   NO ES UNA SEGUNDA LISTA DE ALERTAS. El centro de alertas sigue viviendo en la
   pestaña Mis procesos, que es donde se decide; el correo es su ESPEJO y sale
   del mismo camino: `alertasDelPerfil` (lib/handlers/perfil/seguimiento.js), que
   llama a `S.alertasDe` y a `avisosDe`. Aquí no se decide qué cierra ni qué
   tiene adenda: solo se redacta y se manda.

   CREDENCIAL SIEMPRE, a diferencia de op=sync. La sincronización sin CRON_SECRET
   sigue pública como nació (M-SEG-08) porque el cron de un despliegue sin la
   variable no manda cabecera; esta op, en cambio, MANDA CORREO y su respuesta
   lleva los nombres de los procesos guardados del dueño, así que sin credencial
   no responde nada. Las dos llaves son las que ya existen: el Bearer del cron
   cuando la guarda está puesta (`autorizarSincronizacion`) y la llave de la
   aplicación (`autorizarToken`, por cabecera o pegando `&token=` en el
   navegador). Sin CRON_SECRET el 401 lo DICE, para que la ausencia no sea muda.

   FALTA ≠ FALLO. Sin las variables del proveedor de correo la op responde 200
   diciendo qué falta, qué hacer y qué se habría enviado — nunca un 500, nunca un
   silencio.

   NO REPETIR. Antes de enviar se toma la marca `avisos:enviado:{perfil}:{fecha}`
   con NX (TTL 48 h): si el cron corre dos veces el mismo día civil de Colombia,
   el segundo no manda nada. Si el envío falla, la marca se borra para que el
   siguiente intento pueda hacerlo.

   LA FECHA, NUNCA LA HORA. «Cierra hoy / mañana» se calcula con la fecha civil
   de Bogotá (`hoyColombia`), no con la hora del disparo: en el plan Hobby el
   cron cae en cualquier minuto de la hora programada, así que el texto dice
   «cada mañana» y jamás promete un minuto. */
"use strict";

const { crearRedis, hayCredenciales } = require("../../redis.js");
const { autorizarToken, autorizarSincronizacion, hayGuardaDeSincronizacion } = require("../../auth.js");
const { configuracionDeCorreo, enviarCorreo } = require("../../correo.js");
const { hoyColombia, fechaLegible } = require("../../habiles.js");
const { MARCA } = require("../../glosario.js");

const PERFIL_RE = /^[a-z0-9_-]{2,60}$/i;
/* 48 h: si el cron de mañana se adelanta o se retrasa dentro de su hora, la
   marca de hoy sigue puesta y no se manda dos veces el mismo aviso. */
const TTL_MARCA_SEG = 48 * 3600;
const claveEnviado = (perfil, fecha) => `avisos:enviado:${perfil}:${fecha}`;
const ENLACE = `https://${MARCA.dominio}/#/mis-procesos`;

/* El nombre con el que el dueño reconoce el perfil; si no está cargado, su
   propio identificador — jamás una etiqueta inventada. */
function nombreDePerfil(id) {
  try {
    const { getPerfil } = require("../../perfiles.js");
    const p = getPerfil(id);
    return (p && p.nombre) || id;
  } catch { return id; }
}

/* ═══ LA PLANTILLA ═══════════════════════════════════════════════════════════
   Texto plano y HTML mínimo con las MISMAS frases que la pantalla enseña (las
   escribe `alertasDe`): registro de usted, sin jerga y sin pictogramas. Ninguna
   cifra que no venga medida — el número de avisos es el largo de la lista, y una
   alerta sin fecha no lleva fecha en vez de llevar una inventada. */
const esc = (s) => String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function plantillaAviso({ perfil, alertas, fecha }) {
  const n = alertas.length;
  const quien = nombreDePerfil(perfil);
  const asunto = `${MARCA.nombre}: ${n} ${n === 1 ? "aviso" : "avisos"} de sus procesos guardados`;
  const entrada = `Esto es lo que hay hoy, ${fechaLegible(fecha)}, en los procesos que usted tiene guardados como ${quien}:`;
  const cierre = `Para decidir qué hacer, abra Mis procesos: ${ENLACE}`;
  const pie = "Este aviso sale cada mañana y solo cuando hay algo que avisar: un día sin correo es un día sin avisos.";
  const linea = (a) => `${a.proceso}: ${a.mensaje}${a.fecha ? ` (fecha: ${fechaLegible(a.fecha)})` : ""}`;
  const texto = ["Buenos días.", "", entrada, "", ...alertas.map((a) => `- ${linea(a)}`), "", cierre, "", pie].join("\n");
  const html = [
    '<div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;font-size:15px;line-height:1.5;color:#26231e">',
    "<p>Buenos días.</p>",
    `<p>${esc(entrada)}</p>`,
    "<ul>", ...alertas.map((a) => `<li>${esc(linea(a))}</li>`), "</ul>",
    `<p><a href="${esc(ENLACE)}">Abrir Mis procesos</a></p>`,
    `<p style="color:#5c5952;font-size:13px">${esc(pie)}</p>`,
    "</div>",
  ].join("\n");
  return { asunto, texto, html };
}

module.exports = async function handler(req, res, opciones = {}) {
  const q = req.query || {};
  res.setHeader("Cache-Control", "no-store");
  /* Las dos llaves que YA existen, sin una tercera copia de ninguna
     comparación: con CRON_SECRET puesto vale el Bearer del cron o la llave;
     sin él, solo la llave (y el 401 dice que por eso el cron no puede pasar). */
  const permiso = hayGuardaDeSincronizacion() ? autorizarSincronizacion(req, q) : autorizarToken(req, q);
  if (!permiso.ok) {
    return res.status(permiso.status).json({
      ok: false,
      error: permiso.error + (hayGuardaDeSincronizacion() ? "" : " Y CRON_SECRET no está definida en este despliegue: sin ella el cron de cada mañana no tiene cómo identificarse, así que el aviso solo se puede disparar con la llave de la aplicación."),
      como_autenticar: permiso.como_autenticar,
    });
  }
  if (String(req.method || "GET").toUpperCase() !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ ok: false, error: "Use GET: el aviso diario solo se consulta y se dispara." });
  }
  if (!hayCredenciales()) return res.status(503).json({ ok: false, error: "Faltan credenciales de Upstash Redis en el despliegue." });

  /* Un solo cliente para todos los perfiles: `cargarCorpus` memoiza el corpus
     por sello en la instancia caliente, así que el segundo perfil ya no vuelve
     a leer los chunks (medido en lib/handlers/procesos/listar.js). */
  const redis = crearRedis({});
  const ahora = Number.isFinite(opciones.ahora) ? opciones.ahora : Date.now();
  const fecha = hoyColombia(ahora);
  const correo = configuracionDeCorreo();
  /* Un valor de filtro que no se puede leer es INERTE: se revisan todos los
     perfiles y la respuesta dice que el que se pidió no se entendió. */
  const pedido = String(q.perfil || "").trim();
  const filtro = PERFIL_RE.test(pedido) ? pedido : null;
  /* `enviar=0` o `enviar=no`: se calcula y se enseña lo que saldría, sin mandar
     nada y sin marcar el día. Cualquier otro valor es inerte (se envía). */
  const soloVer = /^(0|no)$/i.test(String(q.enviar || ""));

  const { alertasDelPerfil, perfilesGuardados } = require("./seguimiento.js");
  let perfiles;
  try {
    perfiles = filtro ? [filtro] : await perfilesGuardados(redis);
  } catch (e) {
    return res.status(502).json({ ok: false, error: `No se pudo leer qué perfiles tienen procesos guardados: ${String((e && e.message) || e)}`, que_hacer: "Vuelva a pegar esta misma dirección en unos minutos. Si sigue igual, mire /api/procesos?op=salud." });
  }

  const enviados = [], omitidos = [], fallos = [], vistaPrevia = [];
  for (const p of perfiles) {
    let alertas;
    try {
      ({ alertas } = await alertasDelPerfil(redis, p, ahora));
    } catch (e) {
      fallos.push({ perfil: p, motivo: `no se pudieron calcular los avisos: ${String((e && e.message) || e)}` });
      continue;
    }
    if (!alertas.length) { omitidos.push({ perfil: p, motivo: "hoy no hay nada que avisar de este perfil" }); continue; }
    const plantilla = plantillaAviso({ perfil: p, alertas, fecha });
    if (soloVer || !correo.configurado) {
      vistaPrevia.push({ perfil: p, avisos: alertas.length, asunto: plantilla.asunto, texto: plantilla.texto });
      omitidos.push({ perfil: p, motivo: soloVer ? "no se envió porque usted pidió ver el aviso sin mandarlo" : "no se envió porque el aviso por correo todavía no está configurado" });
      continue;
    }
    const marca = claveEnviado(p, fecha);
    let tomada = null;
    try { tomada = await redis.set(marca, new Date(ahora).toISOString(), { nx: true, ex: TTL_MARCA_SEG }); } catch (e) {
      fallos.push({ perfil: p, motivo: `no se pudo anotar que el aviso de hoy ya salió, así que no se envió para no repetirlo: ${String((e && e.message) || e)}` });
      continue;
    }
    if (tomada !== "OK") { omitidos.push({ perfil: p, motivo: "el aviso de hoy de este perfil ya se había enviado" }); continue; }
    const r = await enviarCorreo({ para: correo.destino, ...plantilla }, { fetchImpl: opciones.fetchImpl });
    if (!r.ok) {
      /* La marca se borra: si no, un fallo del proveedor dejaría el día
         quemado y el aviso no saldría hasta mañana. */
      try { await redis.del(marca); } catch { /* la marca caduca sola en 48 h */ }
      fallos.push({ perfil: p, motivo: r.motivo });
      continue;
    }
    enviados.push({ perfil: p, avisos: alertas.length, envio: r.id });
  }

  return res.status(200).json({
    ok: fallos.length === 0,
    fecha,
    dia: "fecha civil de Colombia, no la hora del disparo",
    perfil: filtro,
    nota: pedido && !filtro ? "El perfil que pidió no se pudo leer, así que se revisaron todos." : null,
    perfiles_revisados: perfiles.length,
    enviados: enviados.length,
    detalle_enviados: enviados,
    omitidos,
    fallos,
    correo: { configurado: correo.configurado, falta: correo.falta, que_hacer: correo.que_hacer, destino: correo.destino, remitente: correo.remitente },
    vista_previa: vistaPrevia,
    como_leerlo: "Un correo por perfil que tenga algo que avisar, con lo mismo que le enseña el centro de alertas de Mis procesos: lo que cierra hoy o mañana, lo que cambió en el pliego y el plazo para avisar que le interesa. Si un perfil no tiene nada, no sale correo. «enviados» son los que salieron; «omitidos» dice por qué no salió cada uno de los otros; «fallos» es lo que hay que arreglar. Añada «&enviar=no» a esta dirección para ver el aviso sin mandarlo.",
  });
};

module.exports.plantillaAviso = plantillaAviso;
module.exports.claveEnviado = claveEnviado;
module.exports.TTL_MARCA_SEG = TTL_MARCA_SEG;
