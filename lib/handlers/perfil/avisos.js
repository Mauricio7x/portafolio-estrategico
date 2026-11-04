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
const MOTIVO_VISITANTE = "es el perfil de un visitante que subió su registro de proponente desde la aplicación: su aviso no va al correo del dueño";
/* 48 h: si el cron de mañana se adelanta o se retrasa dentro de su hora, la
   marca de hoy sigue puesta y no se manda dos veces el mismo aviso. */
const TTL_MARCA_SEG = 48 * 3600;
const claveEnviado = (perfil, fecha) => `avisos:enviado:${perfil}:${fecha}`;
const ENLACE = `https://${MARCA.dominio}/#/mis-procesos`;

/* ═══ LA REVISIÓN DE ADENDAS DE CADA MAÑANA (4-nov-2026) ═══════════════════════
   Hasta hoy, una adenda nueva solo se veía cuando la pantalla volvía a pedir el
   índice de documentos de un proceso (al abrir Mis procesos, con el índice de
   12 h o más). Esta tarea lo pide ANTES del correo, para cada proceso guardado
   que lo amerita, con la MISMA regla del GET (`refrescarIndice` e `indiceViejo`,
   lib/handlers/pliego/documentos.js): el registro `cronograma:hitos` queda con la
   adenda nueva (su aviso y el «verifíquela» de las fechas anteriores) y el correo
   del mismo día la lleva.

   LOS TOPES DEL PLAN GRATIS MANDAN (decisión del dueño, 4-nov-2026: «ten mucho
   cuidado con los topes»). Upstash se llenó el 28-oct por ancho de banda, y lo
   caro era leer el corpus del año (22 MB por vez). Por eso:
   · NO se lee el corpus: la llave y el cierre salen de p6dx (`sinCorpus`), una
     consulta a datos.gov.co que no gasta Upstash;
   · se leen como mucho MAX_LECTURAS_REVISION registros (6 KB cada uno, medido)
     y se piden como mucho MAX_PROCESOS_REVISION índices: el tope cuenta lo que
     se pide, no lo que se salta (con el tope sobre lo leído, 30 procesos
     frescos dejaban sin pedir a los siguientes; revisión adversaria);
   · no se empieza ningún proceso pasados PRESUPUESTO_REVISION_MS: la función
     tiene 60 s, una consulta en curso puede tardar 16 s (dos de 8 s) y el
     correo necesita el resto (medido por la revisión: 35 s con 20 de presupuesto);
   · un índice de menos de 12 h solo cuesta leerlo;
   · un proceso con lecturas que las reglas de hoy ya no dan por leídas
     (`Docs.lecturasDeOtraVersion`, el censo de lo que `hitosDeDocumentos`
     descarta por versión: hechos y cronogramas en Excel) se SALTA: escribirlo
     borraría sus fechas del registro, y rehacerlas exige leer los textos;
   · al primer error de la base no se da un paso más;
   · el cron, una vez por día de Colombia: la marca se toma al EMPEZAR con NX
     (dos disparos a la vez revisaban los dos), y el resumen
     (`CLAVES.revisionAdendas`) se guarda al terminar, también si paró, para que
     op=salud lo diga. La prueba a mano con la llave («&adendas=1») no toma la
     marca ni escribe el resumen: si no, dejaba sin revisar la mañana entera y
     op=salud mostraba lo parcial como si fuera la revisión del día.
   QUÉ PROCESOS: los guardados de cada perfil del dueño (sin los de visitantes,
   la misma exclusión del correo) que no son historia y cuya foto más reciente
   cierra hoy, después o hace 30 días o menos. La foto puede ir atrasada (un
   cierre aplazado) y una adenda después del cierre puede mover la evaluación y
   la adjudicación; revisar uno de más cuesta unos KB. Sin repetidos entre
   perfiles; primero lo que cierra antes. */
const PRESUPUESTO_REVISION_MS = 15000;
const MAX_PROCESOS_REVISION = 30;
const MAX_LECTURAS_REVISION = 60;
const CONCURRENCIA_REVISION = 3;
const DIAS_TRAS_EL_CIERRE = 30;
const TTL_MARCA_REVISION_SEG = 36 * 3600;
const claveMarcaRevision = (fecha, perfil) => `avisos:adendas:hoy:${fecha}${perfil ? `:${perfil}` : ""}`;

const idsDeAdendas = (docs) => {
  try { return new Set((require("../../documentos_proceso.js").hitosDeDocumentos(docs).adendas || []).map((a) => String(a.id))); } catch { return new Set(); }
};

/* Los procesos que se revisan, en orden: abiertos (cierre más cercano primero), después los cerrados hace 30 días o
   menos (el más reciente primero) y al final los que no dicen cierre. */
function procesosARevisar(guardadosPorPerfil, hoy) {
  const S = require("../../seguimiento.js");
  const { sumarDias } = require("../../habiles.js");
  const corte = sumarDias(hoy, -DIAS_TRAS_EL_CIERRE);
  const vistos = new Map();
  for (const g of guardadosPorPerfil) {
    for (const [id, guardado] of Object.entries((g && g.procesos) || {})) {
      if (!guardado || typeof guardado !== "object" || vistos.has(id) || S.esHistoria(guardado.estado)) continue;
      const cierre = String(S.ultimaFotoDe(guardado).fecha_cierre || "").slice(0, 10);
      const dia = /^\d{4}-\d{2}-\d{2}$/.test(cierre) ? cierre : null;
      if (dia && dia < corte) continue;
      vistos.set(id, dia);
    }
  }
  const rango = ([, d]) => (d == null ? 2 : d >= hoy ? 0 : 1);
  return [...vistos.entries()].sort((a, b) => rango(a) - rango(b) || (rango(a) === 0 ? a[1].localeCompare(b[1]) : rango(a) === 1 ? b[1].localeCompare(a[1]) : 0)).map(([id]) => id);
}

/* El motivo de un fallo de datos.gov.co, dicho para quien lo lee: cuando el muro de un servidor responde una página en vez
   de datos, el texto de la máquina («Unexpected token '<'… is not valid JSON») no le dice nada al dueño (revisión
   adversaria, reproducido con el muro simulado). El texto original va al registro de la función. */
function motivoLegible(texto) {
  const t = String(texto || "");
  if (!/\bJSON\b|DOCTYPE|Unexpected token|<html/i.test(t)) return t;
  console.error("[avisos] motivo de datos.gov.co:", t.slice(0, 400));
  const guardado = (t.match(/^se usa el índice guardado el (\d{4}-\d{2}-\d{2})/) || [])[1];
  return `${guardado ? `se usa el índice guardado el ${guardado}: ` : ""}datos.gov.co respondió una página web en lugar de los datos`;
}

/* `cron`: la de la mañana (marca del día y resumen); sin él, la prueba a mano. `reloj` se inyecta en las pruebas. */
async function revisarAdendas(redis, { ahora = Date.now(), perfil = null, cron = true, reloj = Date.now } = {}) {
  const inicio = reloj();
  const fecha = hoyColombia(ahora);
  const { CLAVES, escribirJSON } = require("../../almacen.js");
  const DocsH = require("../pliego/documentos.js");
  const Docs = require("../../documentos_proceso.js");
  if (cron) {
    const tomada = await redis.set(claveMarcaRevision(fecha, perfil), new Date(ahora).toISOString(), { nx: true, ex: TTL_MARCA_REVISION_SEG });
    if (tomada !== "OK") return { ya_revisado_hoy: true, fecha };
  }
  const { perfilesGuardados, leerGuardados } = require("./seguimiento.js");
  const { esPerfilDinamico } = require("../../perfil_dinamico.js");
  const perfiles = (perfil ? [perfil] : await perfilesGuardados(redis)).filter((p) => !esPerfilDinamico(p));
  const guardados = [];
  for (const p of perfiles) guardados.push(await leerGuardados(redis, p));
  const candidatos = procesosARevisar(guardados, fecha);
  const cola = candidatos.slice(0, MAX_LECTURAS_REVISION);
  const r = { fecha, el: new Date(ahora).toISOString(), perfiles: perfiles.length, candidatos: candidatos.length, revisados: 0, refrescados: 0, adendas_nuevas: 0,
    con_adenda_nueva: [], saltados: [], fallos: [], fuera_del_tope: candidatos.length - cola.length, sin_tiempo: 0, detenida: null, ms: null };
  let base = null, pedidos = 0, lleno = false;
  const uno = async (id) => {
    const docs = await DocsH.leerDocs(redis, id);
    r.revisados++;
    if (!DocsH.indiceViejo(docs)) { r.saltados.push({ id, motivo: "su índice de documentos se consultó hace menos de 12 horas" }); return; }
    if (Docs.lecturasDeOtraVersion(docs) > 0) { r.saltados.push({ id, motivo: "tiene documentos leídos con reglas anteriores: se ponen al día la próxima vez que la pantalla pida sus documentos" }); return; }
    if (pedidos >= MAX_PROCESOS_REVISION) { r.fuera_del_tope++; lleno = true; return; }
    pedidos++;
    /* un primer índice, o uno planeado con otra versión, no trae adendas «nuevas»: trae las que ya había */
    const comparable = !!docs.indice && docs.indice.version === Docs.VERSION;
    const antes = idsDeAdendas(docs);
    const hecho = await DocsH.refrescarIndice(redis, id, docs, { sinCorpus: true, desatendido: true });
    if (hecho.otro) { r.saltados.push({ id, motivo: "la pantalla actualizó su índice mientras tanto" }); return; }
    if (!hecho.ok) { r.fallos.push({ id, motivo: motivoLegible(hecho.aviso) }); return; }
    r.refrescados++;
    const nuevas = comparable ? [...idsDeAdendas(hecho.docs)].filter((x) => !antes.has(x)).length : 0;
    if (nuevas) { r.adendas_nuevas += nuevas; r.con_adenda_nueva.push(id); }
  };
  let siguiente = 0;
  const trabajador = async () => {
    while (!base && !lleno && siguiente < cola.length) {
      if (reloj() - inicio >= PRESUPUESTO_REVISION_MS) { r.sin_tiempo += cola.length - siguiente; siguiente = cola.length; break; }
      const id = cola[siguiente++];
      try { await uno(id); } catch (e) { base = String((e && e.message) || e).slice(0, 300); }
    }
  };
  await Promise.all(Array.from({ length: Math.min(CONCURRENCIA_REVISION, cola.length) }, trabajador));
  if (lleno) { r.fuera_del_tope += cola.length - siguiente; siguiente = cola.length; }
  /* lo que dice la base va al registro de la función, no a la pantalla: trae jerga («respuesta no JSON», «ERR …») */
  if (base) { console.error("[avisos] la revisión de adendas paró por la base:", base); r.detenida = "la base de datos dejó de responder y la revisión paró en ese punto"; }
  r.ms = reloj() - inicio;
  /* el resumen del cron se guarda SIEMPRE, también si paró: op=salud tiene que poder decir «paró», y no «no corrió» */
  if (cron) { try { await escribirJSON(redis, CLAVES.revisionAdendas, resumenPublico(r)); } catch { /* con la base caída tampoco se puede: op=salud dirá la fecha de la anterior */ } }
  return r;
}
/* Lo que puede ver op=salud, que es pública: conteos y la fecha, ni un id de proceso. */
function resumenPublico(r) {
  return { fecha: r.fecha, el: r.el, candidatos: r.candidatos, revisados: r.revisados, refrescados: r.refrescados, adendas_nuevas: r.adendas_nuevas,
    saltados: r.saltados.length, fallos: r.fallos.length, fuera_del_tope: r.fuera_del_tope, sin_tiempo: r.sin_tiempo, detenida: r.detenida ? true : false, ms: r.ms };
}

/* Lo guardado, pasado otra vez por la lista de campos al servirlo en op=salud: un registro escrito por otra versión (o
   a mano) no puede colar un id ni un texto en una respuesta pública. Un conteo que no es un entero ≥ 0 es null. */
const CAMPOS_CONTEO_REVISION = ["candidatos", "revisados", "refrescados", "adendas_nuevas", "saltados", "fallos", "fuera_del_tope", "sin_tiempo", "ms"];
function resumenParaSalud(g) {
  if (!g || typeof g !== "object") return null;
  const out = { fecha: /^\d{4}-\d{2}-\d{2}$/.test(String(g.fecha || "")) ? String(g.fecha) : null, el: Number.isFinite(Date.parse(g.el)) ? new Date(Date.parse(g.el)).toISOString() : null };
  for (const k of CAMPOS_CONTEO_REVISION) out[k] = Number.isInteger(g[k]) && g[k] >= 0 ? g[k] : null;
  out.detenida = g.detenida === true;
  return out;
}

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
  /* La fecha se añade solo si la frase no la dice ya: «Faltan 5 días para: Cierre
     (domingo 1 de noviembre). (fecha: domingo 1 de noviembre)» es la misma fecha
     dos veces, y lo mismo pasaba con las notas y las vigencias. */
  const linea = (a) => {
    const f = a.fecha ? fechaLegible(a.fecha) : null;
    return `${a.proceso}: ${a.mensaje}${f && !String(a.mensaje || "").includes(f) ? ` (fecha: ${f})` : ""}`;
  };
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
  const permiso = await (hayGuardaDeSincronizacion() ? autorizarSincronizacion(req, q) : autorizarToken(req, q));
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

  /* LA REVISIÓN DE ADENDAS (4-nov-2026), ANTES del correo para que el aviso de hoy ya la lleve. La dispara el cron
     (una vez por día de Colombia) y, para probarla a mano, la llave con «&adendas=1» (sin la marca del día). Lo que
     pega el vigilante (`enviar=no`) no la dispara: solo mira. Una falla aquí no tumba el correo. */
  const pidioRevision = /^(1|si|sí)$/i.test(String(q.adendas || ""));
  let revision = null;
  if ((permiso.via === "cron" && !soloVer) || pidioRevision) {
    try { revision = await revisarAdendas(redis, { ahora, perfil: filtro, cron: permiso.via === "cron" && !pidioRevision }); }
    catch (e) { console.error("[avisos] la revisión de adendas no se pudo hacer:", (e && e.message) || e); revision = { fecha, detenida: "la base de datos no respondió y la revisión de adendas no se hizo" }; }
  }

  /* LA TAREA DE CADA MAÑANA, SIN CORREO, NO CALCULA NADA (2-nov-2026). Calcular los avisos lee el corpus del año
     (unos 22 MB de Upstash cada vez, 0,65 GB al mes) y sin el correo configurado no sale ninguno: la tarea de las
     11:00 UTC los calculaba para nada. Solo el cron se salta el cálculo; quien pega la dirección con la llave sigue
     viendo lo que habría salido, que es lo que pide la prueba «sin configurar se puede LEER lo que habría salido». */
  if (permiso.via === "cron" && !correo.configurado && !soloVer) {
    return res.status(200).json({
      ok: true, fecha, dia: "fecha civil de Colombia, no la hora del disparo", perfil: filtro,
      enviados: 0, detalle_enviados: [], omitidos: [], fallos: [], vista_previa: [],
      perfiles_revisados: null,
      revision_adendas: revision,
      nota: "La tarea de cada mañana no calcula los avisos mientras el correo no esté configurado: cada cálculo lee todos los procesos guardados de la base de datos y no saldría ningún correo. Para ver lo que habría salido, pegue esta dirección con «&enviar=no» y la llave de la aplicación.",
      correo: { configurado: correo.configurado, falta: correo.falta, que_hacer: correo.que_hacer, destino: correo.destino, remitente: correo.remitente },
    });
  }

  const { alertasDelPerfil, perfilesGuardados } = require("./seguimiento.js");
  let perfiles;
  try {
    perfiles = filtro ? [filtro] : await perfilesGuardados(redis);
  } catch (e) {
    return res.status(502).json({ ok: false, error: `No se pudo leer qué perfiles tienen procesos guardados: ${String((e && e.message) || e)}`, que_hacer: "Vuelva a pegar esta misma dirección en unos minutos. Si sigue igual, mire /api/procesos?op=salud." });
  }

  const enviados = [], omitidos = [], fallos = [], vistaPrevia = [];
  /* R-05 · EL CENSO CON SU EXCLUSIÓN DECLARADA (27-sep-2026). El correo va a UN
     destinatario (`CORREO_DESTINO`, el del dueño), y el censo por clave ve
     también los perfiles que crea un VISITANTE al subir su registro de
     proponente desde la aplicación (`rup_…`, lib/perfil_dinamico): encendido
     tal cual, el dueño recibiría cada mañana los procesos guardados de otros.
     Se sigue censando TODO (una lista de los perfiles del negocio dejaría sin
     aviso a uno nuevo) y la única clase excluida se DECLARA, perfil por perfil,
     en `omitidos` con su motivo. */
  const { esPerfilDinamico } = require("../../perfil_dinamico.js");
  const excluidos = perfiles.filter((p) => esPerfilDinamico(p));
  for (const p of excluidos) omitidos.push({ perfil: p, motivo: MOTIVO_VISITANTE });
  perfiles = perfiles.filter((p) => !esPerfilDinamico(p));
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
    perfiles_de_visitantes_excluidos: excluidos.length,
    enviados: enviados.length,
    detalle_enviados: enviados,
    omitidos,
    fallos,
    correo: { configurado: correo.configurado, falta: correo.falta, que_hacer: correo.que_hacer, destino: correo.destino, remitente: correo.remitente },
    vista_previa: vistaPrevia,
    // null = no se pidió (solo la dispara el cron, o la llave con «&adendas=1»)
    revision_adendas: revision,
    como_leerlo: "Un correo por perfil que tenga algo que avisar, con lo mismo que le enseña el centro de alertas de Mis procesos: lo que cierra hoy o mañana, lo que cambió en el pliego y el plazo para avisar que le interesa. Si un perfil no tiene nada, no sale correo. «enviados» son los que salieron; «omitidos» dice por qué no salió cada uno de los otros; «fallos» es lo que hay que arreglar. Añada «&enviar=no» a esta dirección para ver el aviso sin mandarlo.",
  });
};

module.exports.plantillaAviso = plantillaAviso;
module.exports.claveEnviado = claveEnviado;
module.exports.TTL_MARCA_SEG = TTL_MARCA_SEG;
module.exports.revisarAdendas = revisarAdendas;
module.exports.procesosARevisar = procesosARevisar;
module.exports.resumenPublico = resumenPublico;
module.exports.resumenParaSalud = resumenParaSalud;
module.exports.PRESUPUESTO_REVISION_MS = PRESUPUESTO_REVISION_MS;
module.exports.MAX_PROCESOS_REVISION = MAX_PROCESOS_REVISION;
module.exports.MAX_LECTURAS_REVISION = MAX_LECTURAS_REVISION;
module.exports.claveMarcaRevision = claveMarcaRevision;
module.exports.DIAS_TRAS_EL_CIERRE = DIAS_TRAS_EL_CIERRE;
