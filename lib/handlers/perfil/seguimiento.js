/* lib/handlers/perfil/seguimiento.js · /api/perfil?op=seguimiento (ago 2026)
   ─────────────────────────────────────────────────────────────────────────────
   MIS PROCESOS del perfil (token: es información del dueño):
     GET    ?perfil=X                → los guardados, enriquecidos con la fila
                                       VIVA del corpus (estado, hitos, avisos) y
                                       su GUÍA (lib/guia_proceso: qué es la obra,
                                       qué necesita, paso a paso, consejos)
     GET    ?perfil=X&detalle=<id>   → quiénes se presentaron a ESE proceso y la
                                       ficha de cada uno (veces ante la entidad,
                                       ganadas, último adjudicado, contratos
                                       vigentes con firmas y valor); caché 1 h
     GET    ?perfil=X&ics=<id>       → el cronograma del proceso en .ics
     POST   {perfil, id, estado, notas, foto?}   → guardar / actualizar
     DELETE ?perfil=X&id=<id>        → quitar
   Almacenamiento: `seguimiento:{perfil}` (un JSON por perfil, ≤ 200 procesos).
   Toda secuencia leer → modificar → escribir de ese JSON va bajo el candado
   corto lock:seguimiento:{perfil} (lib/almacen.conCandado, 6-sep-2026): dos
   guardados a la vez respondían «ok» los dos y sobrevivía uno. Lo PESADO
   (la fila viva del corpus, la predicción, la guía) se calcula FUERA del
   candado, que solo cubre dos comandos de Redis; si no se obtiene, 409 con
   qué hacer, jamás «guardado» sin escritura.
   La red (hgi6, p6dx, jbjy) va con tiempo acotado y NUNCA tumba la respuesta:
   una fuente caída viaja como `ok:false` con motivo. La lógica pura vive en
   lib/seguimiento.js. */
"use strict";

const { crearRedis, hayCredenciales } = require("../../redis.js");
const { autorizarToken } = require("../../auth.js");
const { leerCuerpo } = require("../../cuerpo.js");
const { CLAVES, leerJSON, escribirJSON, conCandado, esCandadoOcupado, cuerpoCandadoOcupado, CANDADO_CORTO_TTL_SEG } = require("../../almacen.js");
const { crearCliente, escSoQL } = require("../../socrata.js");
const S = require("../../seguimiento.js");
/* Los predicados de la manifestación salen de su módulo: dos definiciones de
   «todavía se puede avisar» divergirían a la primera corrección. */
const { sigueValiendoLaPena: manifVigente, esUrgente: manifUrgente, leerFechasCronograma } = require("../../manifestacion.js");
/* El «hoy» del casillero lo fija el SERVIDOR, en hora Colombia: es la misma
   doctrina del calendario de cierres (el reloj del aparato corre la fecha). */
const { hoyColombia } = require("../../habiles.js");
const { guiaDe } = require("../../guia_proceso.js");

const MAX_BYTES = 64 * 1024;
const PERFIL_RE = /^[a-z0-9_-]{2,60}$/i;
const ID_RE = /^[A-Za-z0-9._-]{3,60}$/;
const TIEMPO_MAX_MS = parseInt(process.env.SEGUIMIENTO_TIEMPO_MS, 10) || 6000;
const TTL_DETALLE_SEG = 3600;
const TOP_PROPONENTES = 12;
const clave = (perfil) => `seguimiento:${perfil}`;
const claveCandado = (perfil) => `lock:seguimiento:${perfil}`;
const claveDetalle = (id) => `seguimiento:detalle:v1:${id}`;
const BASES = {
  proponentes: () => process.env.PROPONENTES_BASE_URL || "https://www.datos.gov.co/resource/hgi6-6wh3.json",
  adjudicaciones: () => process.env.SECOP_BASE_URL || "https://www.datos.gov.co/resource/p6dx-8zbt.json",
  contratos: () => process.env.EJECUCION_BASE_URL || "https://www.datos.gov.co/resource/jbjy-vk9h.json",
};
const conTiempo = (p, ms) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error(`tiempo agotado (${ms} ms)`)), ms))]);
const num = (v) => { if (v === null || v === undefined || v === "") return null; const n = Number(v); return Number.isFinite(n) ? n : null; };
/* Contratos vigentes que se piden por NIT (los más recientes por fecha de firma);
   la consulta única de jbjy multiplica este tope por los NIT que pregunta. */
const TOPE_VIGENTES_POR_NIT = 200;
/* De las filas vigentes de UN NIT (ya ordenadas por firma, la más reciente
   primero) a lo que la ficha del competidor publica. */
function resumirVigentes(l) {
  let valor = 0, conValor = 0; const ents = new Set();
  for (const f of l) { const v = num(f.valor_del_contrato); if (v != null && v > 0) { valor += v; conValor++; } if (f.nombre_entidad) ents.add(String(f.nombre_entidad).trim()); }
  return { contratos: l.length, valor_cop: conValor ? Math.round(valor) : null, entidades: ents.size,
    firmas: l.slice(0, 5).map((f) => ({ fecha_firma: String(f.fecha_de_firma || "").slice(0, 10) || null, valor_cop: num(f.valor_del_contrato), entidad: String(f.nombre_entidad || "").slice(0, 80) || null, fin: String(f.fecha_de_fin_del_contrato || "").slice(0, 10) || null, estado: String(f.estado_contrato || "") })) };
}

async function leerGuardados(redis, perfil) {
  const j = await leerJSON(redis, clave(perfil));
  return j && typeof j === "object" && j.procesos && typeof j.procesos === "object" ? j : { procesos: {} };
}
/* Las carpetas del perfil, saneadas, SIEMPRE por aquí (7-sep-2026): un perfil de
   producción anterior al casillero no trae el campo y tiene que abrir igual. */
const carpetasDe = (g) => S.normalizarCarpetas(g && g.carpetas);
async function filaViva(redis, ids) {
  try {
    const { cargarCorpus } = require("../procesos/listar.js");
    const meta = await leerJSON(redis, CLAVES.meta);
    const filas = await cargarCorpus(redis, meta);
    const buscados = new Set(ids);
    const out = new Map();
    for (const l of filas || []) if (buscados.has(l.id_del_proceso)) out.set(l.id_del_proceso, l);
    return out;
  } catch { return new Map(); }
}

/* ═══ F0-7 · CONGELAR LA PREDICCIÓN QUE SE LE ENSEÑÓ ═══════════════════════
   `P(ganar)` no es falsable hoy: el corpus dice quién GANÓ, no a qué se
   presentó nadie. El estado del seguimiento (ganado/perdido) es justamente la
   etiqueta que falta — pero sin la predicción de AQUEL momento no hay nada
   contra qué compararla. Cada día sin guardarla es un día de datos que no
   vuelve, y es la ventaja defendible del producto: los datos de SECOP los baja
   cualquiera; el registro de qué decidió el contratista y cómo le fue, no.

   TRES DECISIONES QUE NO HAY QUE RE-APRENDER:

   · NO ES UN SEGUNDO CÁLCULO. Se llama a `desgloseDeProceso`, que ya arma el
     contexto (índices de competencia y de baja, promedios por departamento,
     colisiones, b_max de los borradores) y que YA tiene prueba de reproducir
     EXACTAMENTE el `p_ganar` del listado. Reconstruir aquí ese contexto sería
     una segunda derivación de la probabilidad: divergiría a la primera
     corrección aplicada a una sola — es `total_procesos`/`procesos_contados`
     otra vez, en la cifra con la que se decide a qué presentarse.
   · LA CALCULA EL SERVIDOR, jamás el cliente. La `foto` sí puede venir del
     cuerpo (es lo que el usuario tenía en pantalla), pero una `p` propuesta por
     el cliente envenenaría el único registro con el que se podrá validar el
     modelo, y un frontend viejo o cacheado mandaría la cifra de otro momento
     sin que nadie lo notara. Mismo criterio que `visto`, que se toma del corpus.
   · SOLO AL CREAR. Es la cifra del día en que DECIDIÓ, no la última: si se
     recalculara al actualizar el estado, cambiar «interesa» por «presentado»
     reescribiría la predicción con el modelo de hoy y se perdería justo lo que
     esto existe para conservar.

   Best-effort: si el desglose falla, se guarda `null` con su motivo y el guardado
   sigue. Perder el proceso guardado por no poder calcular una cifra de
   calibración sería cambiar el producto por su instrumentación. */
async function congelarPrediccion(redis, perfil, id) {
  const enBlanco = (motivo) => ({ p_ganar: null, motivo, congelada_el: new Date().toISOString(), desenlace: null });
  try {
    const { desgloseDeProceso } = require("../../probabilidad_desglose.js");
    const r = await desgloseDeProceso(redis, id, { perfil });
    if (!r || r.estado !== 200 || !r.cuerpo) return enBlanco("el proceso no está en el corpus");
    const c = r.cuerpo, ctx = c.contexto || {};
    if (c.probabilidad_final == null) return enBlanco("sin probabilidad calculable");
    return {
      p_ganar: c.probabilidad_final,
      /* A5: la cifra SIN el factor de precio viaja aparte — son dos preguntas
         («¿con qué opción salgo?» y «¿cuánto de eso lo pone mi precio?») y sin
         las dos no se puede diagnosticar POR QUÉ falló una predicción. */
      p_sin_precio: c.probabilidad_sin_precio == null ? null : c.probabilidad_sin_precio,
      banda_90: c.banda_90 || null,
      peso_datos_entidad: c.peso_datos_entidad == null ? null : c.peso_datos_entidad,
      rivales_esperados: ctx.rivales_esperados == null ? null : ctx.rivales_esperados,
      fuente_del_promedio: ctx.fuente_del_promedio || null,
      valor_esperado_cop: ctx.valor_esperado_cop == null ? null : ctx.valor_esperado_cop,
      baja_maxima: c.baja_maxima || null,
      congelada_el: new Date().toISOString(),
      /* El par (predicción, desenlace) es lo que hace falsable el modelo. Nace
         en null y solo lo fijan «ganado» y «perdido» (S.desenlaceDe): un
         guardado sin desenlace NO cuenta como derrota. */
      desenlace: null,
      motivo: null,
    };
  } catch (e) { return enBlanco(`no se pudo calcular: ${e.message}`); }
}

/* ═══ La guía «Don Héctor» de cada guardado ═══
   Todo lo que hace falta para presentarse a ESE proceso con ESTE perfil
   (lib/guia_proceso). El contexto —perfil dinámico o consorcio cargado en
   PERFILES, conocimiento del matching, índice de competencia y de baja— se
   arma UNA vez por petición con las MISMAS funciones memoizadas del listado, y
   todo es best-effort: si algo falla, la guía sale sin ese dato y lo dice
   (`completa`, `sin_dato`), nunca tumba la respuesta de Mis procesos. */
async function contextoGuia(redis, perfil) {
  const ctx = { conocimiento: {}, compDe: () => null, bajaDe: () => null };
  try {
    const { recargarPerfiles } = require("../../perfiles.js");
    await recargarPerfiles(redis);
    const { esPerfilDinamico, cargarPerfilDinamico } = require("../../perfil_dinamico.js");
    const { esConsorcio, cargarConsorcio } = require("../../consorcio.js");
    if (esPerfilDinamico(perfil)) await cargarPerfilDinamico(redis, perfil);
    else if (esConsorcio(perfil)) await cargarConsorcio(redis, perfil);
  } catch { /* sin perfil cargado la guía sale sin juicio del registro */ }
  try {
    const L = require("../procesos/listar.js");
    const { competenciaDe } = require("../../indice_competencia.js");
    const { bajaDeMercado } = require("../../indice_baja.js");
    const [{ conocimiento }, { indice }, { indice: indiceBaja }] = await Promise.all([L.cargarConocimiento(redis), L.cargarIndice(redis), L.cargarIndiceBaja(redis)]);
    ctx.conocimiento = conocimiento || {};
    ctx.compDe = (l) => { try { return competenciaDe(indice, l); } catch { return null; } };
    ctx.bajaDe = (l) => { try { return bajaDeMercado(indiceBaja, l); } catch { return null; } };
  } catch { /* sin índices: la guía no cita competencia ni cuánto suelen bajar */ }
  return ctx;
}
function guiaPara(guardado, fila, perfil, ctx, ahoraMs, fechaManifestacionCronograma = null, documentos = null) {
  try {
    return guiaDe({ fila: fila || null, foto: guardado.foto || null, perfil, ctx: { conocimiento: ctx.conocimiento, competencia: fila ? ctx.compDe(fila) : null, baja: fila ? ctx.bajaDe(fila) : null, ahoraMs, fechaManifestacionCronograma, documentos } });
  } catch (e) { return { version: null, completa: false, error: `no se pudo generar la guía: ${String((e && e.message) || e)}` }; }
}
/* Los documentos del proceso que el navegador ya leyó (op=documentos): el índice
   con los HECHOS de cada uno vive en pliego:{id}:docs (3-sep-2026). Es lo que
   convierte la guía en una guía de ESE proceso. Best-effort: sin índice, la
   guía dice que los documentos están por leer y el navegador los pide. */
async function documentosDe(redis, ids) {
  const out = new Map();
  try {
    const { leerDocs } = require("../pliego/documentos.js");
    await Promise.all(ids.map(async (id) => { try { const d = await leerDocs(redis, id); if (d && d.indice) out.set(id, d); } catch { /* sin documentos */ } }));
  } catch { /* sin módulo de documentos */ }
  return out;
}

/* Los perfiles que TIENEN procesos guardados (6-sep-2026, M-COMP-03). Es un
   CENSO por la clave, no la lista de los tres perfiles del negocio: un perfil
   creado por el onboarding también guarda procesos y una lista lo dejaría sin
   aviso. `seguimiento:detalle:…` es la caché de la ficha del competidor y no es
   un perfil — la misma frontera que ya declara lib/copia_datos. */
async function perfilesGuardados(redis) {
  const claves = await redis.scan(`${clave("")}*`);
  const out = new Set();
  for (const k of claves || []) {
    const m = new RegExp(`^${clave("([^:]+)")}$`).exec(String(k));
    if (m && PERFIL_RE.test(m[1])) out.add(m[1]);
  }
  return [...out].sort();
}

/* ═══ EL CAMINO «guardados → fila viva → enriquecido → alertas», UNA sola vez
   (6-sep-2026, M-COMP-03) ═══════════════════════════════════════════════════
   Lo recorren DOS llamadores: el GET de Mis procesos (esta misma pantalla) y el
   aviso diario por correo (lib/handlers/perfil/avisos.js). Copiarlo habría
   dejado dos derivaciones de lo que cierra y de lo que cambió, y el correo tiene
   que decir EXACTAMENTE lo que la pantalla dice: a la primera corrección de
   `alertasDe` una de las dos se quedaría atrás. `S.alertasDe` y `avisosDe` no se
   tocan: se llaman.
   · `ahora` se INYECTA (el correo lo necesita para poder probarse con una hora
     fija; la pantalla pasa Date.now()).
   · `conGuia` es lo caro (la guía de cada proceso, con índices y documentos) y
     solo lo pide la pantalla: el correo no la enseña.
   · `guardados` se pasa cuando el llamador ya los leyó, para no gastar un
     segundo GET de Redis en el mismo camino. */
async function alertasDelPerfil(redis, perfil, ahora, { conGuia = false, guardados = null, ligero = false, soloId = null } = {}) {
  const g = guardados || await leerGuardados(redis, perfil);
  const ids = Object.keys(g.procesos);
  const vivas = await filaViva(redis, ids);
  /* UN comando para todas las fechas límite leídas de pliegos (peldaño 1): con
     ella la alerta dice «vence el martes 18» en vez de «verifique HOY». */
  const cron = await leerFechasCronograma(redis);
  /* LO CARO SE PAGA UNA VEZ Y SOLO PARA QUIEN LO PIDE (7-sep-2026). La guía de
     un proceso cuesta los índices del listado, los documentos leídos y ~18 KiB
     de respuesta. Servirla para los 200 guardados en cada apertura de la
     pestaña era el grueso del gasto: `soloId` la calcula para UN proceso —el
     expediente que el usuario abrió— y la lista no la pide. */
  const idsGuia = conGuia ? (soloId ? ids.filter((x) => x === soloId) : ids) : [];
  const ctxG = idsGuia.length ? await contextoGuia(redis, perfil) : null;
  const docsPorId = idsGuia.length ? await documentosDe(redis, idsGuia) : new Map();
  const conGuiaDe = new Set(idsGuia);
  const carpetas = carpetasDe(g);
  const procesos = ids.map((id) => {
    const e = S.enriquecer(g.procesos[id], vivas.get(id) || null, ahora, { fechaManifestacionCronograma: cron[id] || null, carpetas });
    return conGuiaDe.has(id) ? { ...e, guia: guiaPara(g.procesos[id], vivas.get(id) || null, perfil, ctxG, ahora, cron[id] || null, docsPorId.get(id) || null) } : e;
  }).sort((a, b) => {
    // primero lo que cierra antes y sigue abierto; después lo cerrado (más reciente primero)
    const ca = a.dias_para_cierre, cb = b.dias_para_cierre;
    const aa = ca != null && ca >= 0, ab = cb != null && cb >= 0;
    if (aa !== ab) return aa ? -1 : 1;
    if (aa) return ca - cb;
    return String(b.actualizado || "").localeCompare(String(a.actualizado || ""));
  });
  const hoy = hoyColombia(ahora);
  const alertas = S.alertasDe(procesos, { dias: 7, hoy });
  const porEstado = Object.fromEntries(S.ESTADOS.map((e) => [e, procesos.filter((p) => p.estado === e).length]));
  /* Cuántos hay en cada carpeta, contados AQUÍ y no en el navegador: la carpeta
     borrada ya cayó a null en `enriquecer`, así que «Sin carpeta» es exacto. */
  const porCarpeta = Object.fromEntries(carpetas.map((c) => [c.id, procesos.filter((p) => p.carpeta === c.id).length]));
  porCarpeta.sin_carpeta = procesos.filter((p) => !p.carpeta).length;
  const resumen = { total: procesos.length, abiertos: procesos.filter((p) => p.cerrado === false).length, cerrados: procesos.filter((p) => p.cerrado === true).length,
    presentados: porEstado.presentado, por_estado: porEstado, por_carpeta: porCarpeta,
    tareas_pendientes: procesos.reduce((n, p) => n + ((p.tareas_resumen && p.tareas_resumen.pendientes) || 0), 0),
    tareas_vencidas: procesos.reduce((n, p) => n + ((p.tareas_resumen && p.tareas_resumen.vencidas) || 0), 0),
    /* el papeleo del expediente: lo que falta y lo que caduca antes del cierre */
    documentos_por_conseguir: procesos.reduce((n, p) => n + ((p.documentos_resumen && p.documentos_resumen.por_conseguir) || 0), 0),
    documentos_vencidos: procesos.reduce((n, p) => n + ((p.documentos_resumen && p.documentos_resumen.vencidos) || 0), 0),
    documentos_vencen_antes_del_cierre: procesos.reduce((n, p) => n + ((p.documentos_resumen && p.documentos_resumen.vencen_antes_del_cierre) || 0), 0),
    avisos_proximos: procesos.flatMap((p) => p.avisos).filter((a) => a.dias_antes <= 7).length,
    cambios_pendientes: procesos.reduce((n, p) => n + (p.cambios_pendientes || 0), 0),
    /* `abiertas` = todavía vale la pena avisar (con certeza abiertas + las que
       están dentro de la ventana); `urgentes` ⊂ `abiertas` = hay que entrar a
       SECOP II HOY. Los predicados salen de lib/manifestacion: dos definiciones
       de «todavía se puede» divergirían. */
    manifestaciones_abiertas: procesos.filter((p) => manifVigente(p.manifestacion)).length,
    manifestaciones_urgentes: procesos.filter((p) => manifUrgente(p.manifestacion)).length,
    /* lo que enciende la insignia de la pestaña: cambios sin ver + alertas de urgencia alta */
    atencion: alertas.filter((a) => a.urgencia === "alta").length };
  return { procesos, alertas, resumen, carpetas: carpetas.map((c) => ({ ...c, n_procesos: porCarpeta[c.id] || 0 })), hoy };
}

/* ═══ La ficha de los competidores de UN proceso ═══ */
async function detalleCompetencia(idProceso, guardado, { log = () => {} } = {}) {
  const base = { ok: false, id: idProceso, fuente: "hgi6-6wh3", proponentes: [], motivo: null };
  const cli = (b) => crearCliente({ baseUrl: b, log });
  let filas;
  try {
    filas = await conTiempo(cli(BASES.proponentes()).pedir({
      "$select": "proveedor,nit_proveedor,codigo_entidad,nit_entidad,entidad_compradora,fecha_publicaci_n",
      "$where": `id_procedimiento='${escSoQL(idProceso)}'`, "$limit": "200",
    }, "proponentes del proceso", { plazoMs: TIEMPO_MAX_MS }), TIEMPO_MAX_MS);
  } catch (e) { return { ...base, motivo: `no se pudo consultar la lista de proponentes del proceso: ${String((e && e.message) || e)}` }; }
  if (!filas || !filas.length) {
    return { ...base, ok: true, motivo: "datos.gov.co no publica proponentes para este proceso todavía (aparecen tras la apertura de ofertas; en procesos que no cierran en SECOP II, nunca)." };
  }
  const codigoEntidad = String(filas[0].codigo_entidad || "").trim() || null;
  const nitEntidad = S.nitONull(filas[0].nit_entidad);
  const props = new Map();
  for (const f of filas) {
    const nombre = String(f.proveedor || "").trim(); if (!nombre) continue;
    const nit = S.nitONull(f.nit_proveedor);
    const k = nit ? `nit:${nit}` : `n:${nombre.toUpperCase()}`;
    if (!props.has(k)) props.set(k, { nombre, nit });
  }
  const lista = [...props.values()].slice(0, TOP_PROPONENTES);
  const nits = lista.map((p) => p.nit).filter(Boolean);
  const enLista = nits.map((n) => `'${escSoQL(n)}'`).join(",");

  const veces = new Map(), ganadas = new Map(), vigentes = new Map();
  /* Si la consulta RESPONDIÓ, un proponente con NIT que no aparece en ella
     tiene CERO (veces / ganadas): la fuente lo dice. Si la consulta FALLÓ, no
     se sabe y viaja null. Son dos cosas distintas y se distinguen (R1). */
  const respondio = { veces: false, ganadas: false };
  const tareas = [];
  if (codigoEntidad && nits.length) {
    tareas.push(conTiempo(cli(BASES.proponentes()).pedir({
      "$select": "nit_proveedor,count(*) as veces,max(fecha_publicaci_n) as ultima",
      "$where": `codigo_entidad='${escSoQL(codigoEntidad)}' AND nit_proveedor in (${enLista})`,
      "$group": "nit_proveedor", "$limit": "100",
    }, "veces ante la entidad", { plazoMs: TIEMPO_MAX_MS }), TIEMPO_MAX_MS).then((r) => { respondio.veces = true; for (const g of r || []) veces.set(String(g.nit_proveedor), { veces: num(g.veces), ultima: String(g.ultima || "").slice(0, 10) || null }); })
      .catch((e) => log(`seguimiento/veces: ${e.message}`)));
  }
  if (nitEntidad && nits.length) {
    tareas.push(conTiempo(cli(BASES.adjudicaciones()).pedir({
      "$select": "nit_del_proveedor_adjudicado,count(*) as ganadas,max(fecha_adjudicacion) as ultima,sum(valor_total_adjudicacion) as valor",
      "$where": `nit_entidad='${escSoQL(nitEntidad)}' AND adjudicado='Si' AND nit_del_proveedor_adjudicado in (${enLista})`,
      "$group": "nit_del_proveedor_adjudicado", "$limit": "100",
    }, "ganadas ante la entidad", { plazoMs: TIEMPO_MAX_MS }), TIEMPO_MAX_MS).then((r) => { respondio.ganadas = true; for (const g of r || []) ganadas.set(String(g.nit_del_proveedor_adjudicado), { ganadas: num(g.ganadas), ultima: String(g.ultima || "").slice(0, 10) || null, valor: num(g.valor) != null && num(g.valor) > 0 ? Math.round(num(g.valor)) : null }); })
      .catch((e) => log(`seguimiento/ganadas: ${e.message}`)));
  }
  /* CONTRATOS VIGENTES EN UNA SOLA CONSULTA (6-sep-2026, M-DGF-04). Era un
     `pedir` por NIT: 3 + P peticiones a datos.gov.co por proceso guardado (con
     P = 8, once), y el cupo sin token —que Socrata no publica— se agota entre
     varias personas. Ahora una sola `documento_proveedor in (…)`, con el tope por
     NIT multiplicado por los NIT, y el reparto se hace aquí; la salida por NIT
     (cuántos, valor, entidades, las 5 firmas más recientes) no cambia. NO va con
     `$group`: el agregado del servidor no devuelve ni las firmas ni las entidades
     que la pantalla enseña. La regla «si la consulta respondió, el NIT que no
     aparece tiene cero» se conserva: todos los NIT reciben su entrada. */
  if (nits.length) {
    tareas.push(conTiempo(cli(BASES.contratos()).pedir({
      "$select": "documento_proveedor,nombre_entidad,valor_del_contrato,fecha_de_firma,fecha_de_fin_del_contrato,estado_contrato",
      "$where": `documento_proveedor in (${enLista}) AND estado_contrato in ('En ejecución','Modificado','Suspendido','Prorrogado')`,
      "$order": "fecha_de_firma desc", "$limit": String(TOPE_VIGENTES_POR_NIT * nits.length),
    }, "contratos vigentes", { plazoMs: TIEMPO_MAX_MS }), TIEMPO_MAX_MS).then((r) => {
      const porNit = new Map(nits.map((n) => [n, []]));
      for (const f of r || []) { const l = porNit.get(String(f.documento_proveedor ?? "").trim()); if (l) l.push(f); }
      for (const [nit, l] of porNit) vigentes.set(nit, resumirVigentes(l));
    }).catch((e) => log(`seguimiento/vigentes: ${e.message}`)));
  }
  await Promise.all(tareas);
  return {
    ...base, ok: true,
    entidad: { codigo: codigoEntidad, nit: nitEntidad, nombre: String(filas[0].entidad_compradora || (guardado && guardado.foto && guardado.foto.entidad) || "").trim() || null },
    proponentes_totales: props.size,
    proponentes: lista.map((p) => S.fichaCompetidor(p, {
      veces: p.nit ? (veces.get(p.nit) || (respondio.veces ? { veces: 0, ultima: null } : null)) : null,
      ganadas: p.nit ? (ganadas.get(p.nit) || (respondio.ganadas ? { ganadas: 0, ultima: null, valor: null } : null)) : null,
      vigentes: p.nit ? vigentes.get(p.nit) : null,
    })),
    fuentes_consultadas: { veces_ante_entidad: codigoEntidad ? "hgi6-6wh3 por codigo_entidad" : "sin código de entidad", ganadas: nitEntidad ? "p6dx-8zbt por nit_entidad (los NIT se comparten entre regionales: puede sumar hermanas)" : "sin NIT de entidad", vigentes: "jbjy-vk9h por documento_proveedor" },
    lectura: "Quiénes se presentaron a este proceso y qué dicen las fuentes abiertas de cada uno. La inhabilidad se verifica por NIT con «Verificar» (SIRI + multas). Lo que no está, no se inventa.",
    consultado_el: new Date().toISOString(),
  };
}

module.exports = async function handler(req, res) {
  const q = req.query || {};
  res.setHeader("Cache-Control", "no-store");
  const permiso = autorizarToken(req, q);
  if (!permiso.ok) return res.status(permiso.status).json({ ok: false, error: permiso.error, como_autenticar: permiso.como_autenticar });
  if (!hayCredenciales()) return res.status(503).json({ ok: false, error: "Faltan credenciales de Upstash Redis en el despliegue." });
  const redis = crearRedis({});
  const metodo = String(req.method || "GET").toUpperCase();
  const perfil = String(q.perfil || "").trim();

  if (metodo === "POST") {
    const cuerpo = await leerCuerpo(req, { maxBytes: MAX_BYTES });
    if (!cuerpo.ok) return res.status(cuerpo.status).json({ ok: false, error: cuerpo.error });
    const d = cuerpo.datos || {};
    const p = String(d.perfil || perfil || "").trim();
    const id = String(d.id || "").trim();
    if (!PERFIL_RE.test(p)) return res.status(400).json({ ok: false, error: "Falta «perfil»." });

    /* ══ LAS CARPETAS DEL CASILLERO (7-sep-2026) ══════════════════════════════
       Tres acciones —crear, cambiar el nombre y quitar— plegadas en ESTE MISMO
       POST: un endpoint nuevo sería un archivo nuevo en `api/` y la suite fija
       ese conteo. Van ANTES de exigir `id` porque una carpeta no es un proceso.
       Todas dentro del candado corto del perfil: dos carpetas creadas a la vez
       dejaban una sola, que es el defecto que ya costó el candado de los
       guardados (M-INF, 6-sep-2026).
       QUITAR UNA CARPETA NO BORRA NI UN PROCESO: los suelta a «Sin carpeta» y la
       respuesta dice cuántos quedaron sueltos — una acción destructiva silenciosa
       sobre veinte procesos guardados es exactamente lo que esta pestaña no puede
       permitirse. */
    const accion = String(d.accion || "").trim();
    if (accion.startsWith("carpeta_")) {
      const ahoraC = new Date().toISOString();
      let rc;
      try {
        rc = await conCandado(redis, claveCandado(p), CANDADO_CORTO_TTL_SEG, async () => {
          const g = await leerGuardados(redis, p);
          const carpetas = carpetasDe(g);
          const mismoNombre = (a, b) => String(a).toLocaleLowerCase("es-CO") === String(b).toLocaleLowerCase("es-CO");
          if (accion === "carpeta_crear") {
            const nombre = S.textoLimpio(d.nombre, S.LARGO_CARPETA);
            if (!nombre) return { status: 400, cuerpo: { ok: false, error: "Escriba un nombre para la carpeta." } };
            /* Un nombre repetido no es un error que deje al usuario sin salida:
               se le devuelve la carpeta que ya tenía y la pantalla la abre. */
            const ya = carpetas.find((c) => mismoNombre(c.nombre, nombre));
            if (ya) return { status: 200, cuerpo: { ok: true, perfil: p, carpeta: ya, ya_existia: true, carpetas } };
            if (carpetas.length >= S.MAX_CARPETAS) return { status: 400, cuerpo: { ok: false, error: `Ya tiene ${S.MAX_CARPETAS} carpetas, que es el tope. Quite alguna que no use y vuelva a intentarlo.` } };
            const nueva = { id: S.idNuevo("c", new Set(carpetas.map((c) => c.id)), Date.parse(ahoraC) || Date.now()), nombre, creada: ahoraC };
            g.carpetas = [...carpetas, nueva];
            await escribirJSON(redis, clave(p), g);
            return { status: 200, cuerpo: { ok: true, perfil: p, carpeta: nueva, ya_existia: false, carpetas: g.carpetas } };
          }
          /* la acción se comprueba ANTES de buscar la carpeta: con una acción
             inventada el 404 «esa carpeta ya no existe» mandaba a mirar donde
             no estaba el problema */
          if (accion !== "carpeta_renombrar" && accion !== "carpeta_quitar") {
            return { status: 400, cuerpo: { ok: false, error: "Acción de carpeta desconocida: use carpeta_crear, carpeta_renombrar o carpeta_quitar." } };
          }
          const idC = S.textoLimpio(d.carpeta, 40);
          const cual = carpetas.find((c) => c.id === idC) || null;
          if (!cual) return { status: 404, cuerpo: { ok: false, error: "Esa carpeta ya no existe en este perfil." } };
          if (accion === "carpeta_renombrar") {
            const nombre = S.textoLimpio(d.nombre, S.LARGO_CARPETA);
            if (!nombre) return { status: 400, cuerpo: { ok: false, error: "Escriba un nombre para la carpeta." } };
            g.carpetas = carpetas.map((c) => (c.id === idC ? { ...c, nombre } : c));
            await escribirJSON(redis, clave(p), g);
            return { status: 200, cuerpo: { ok: true, perfil: p, carpeta: { ...cual, nombre }, carpetas: g.carpetas } };
          }
          let sueltos = 0;
          for (const k of Object.keys(g.procesos)) {
            if (g.procesos[k] && g.procesos[k].carpeta === idC) { g.procesos[k].carpeta = null; sueltos++; }
          }
          g.carpetas = carpetas.filter((c) => c.id !== idC);
          await escribirJSON(redis, clave(p), g);
          return { status: 200, cuerpo: { ok: true, perfil: p, quitada: cual, procesos_sueltos: sueltos, carpetas: g.carpetas } };
        }, { accion: "organizar las carpetas" });
      } catch (e) {
        if (esCandadoOcupado(e)) return res.status(409).json(cuerpoCandadoOcupado(e));
        throw e;
      }
      return res.status(rc.status).json(rc.cuerpo);
    }

    if (!ID_RE.test(id)) return res.status(400).json({ ok: false, error: "Falta «id» del proceso (id_del_proceso, p. ej. CO1.REQ.123)." });
    const ahora = new Date().toISOString();
    /* LO PESADO, FUERA DEL CANDADO: la fila viva del corpus (una vez, para todos
       los usos) y la predicción a congelar. Se lee el guardado una primera vez
       solo para saber si hay que calcularla; la decisión final la toma la
       lectura de DENTRO del candado, que es la que vale. */
    const vivas = await filaViva(redis, [id]);
    const viva = vivas.get(id) || null;
    const pre = d.enterado === true ? null : ((await leerGuardados(redis, p)).procesos[id] || null);
    const prediccionNueva = d.enterado === true || pre ? null : await congelarPrediccion(redis, p, id);
    let r;
    try {
      r = await conCandado(redis, claveCandado(p), CANDADO_CORTO_TTL_SEG, async () => {
        const g = await leerGuardados(redis, p);
        const existente = g.procesos[id] || null;
        if (!existente && Object.keys(g.procesos).length >= S.MAX_GUARDADOS) return { status: 400, cuerpo: { ok: false, error: `Tope de ${S.MAX_GUARDADOS} procesos guardados por perfil.` } };
        /* «Enterado»: el usuario vio los cambios → la foto VIVA del corpus pasa a
           ser la referencia (`visto`); no toca la foto original ni el estado. Se
           toma del SERVIDOR (corpus), no del cliente: es lo que se va a comparar. */
        if (d.enterado === true) {
          if (!existente) return { status: 404, cuerpo: { ok: false, error: "Ese proceso no está guardado en este perfil." } };
          const fotoViva = viva ? S.fotoViva(viva) : null;
          existente.visto = fotoViva || existente.visto || existente.foto;
          existente.visto_el = ahora;
          await escribirJSON(redis, clave(p), g);
          return { status: 200, cuerpo: { ok: true, perfil: p, id, enterado: true, visto_el: ahora, en_corpus: !!viva } };
        }
        // la foto viene del cliente (la fila que tenía en pantalla) o se toma del corpus
        let foto = d.foto && typeof d.foto === "object" ? S.fotoDe({ ...d.foto, id_del_proceso: id }) : (existente ? existente.foto : null);
        if (!existente && viva) {
          /* al guardar por primera vez, la referencia para «cambió» es la fila VIVA
             del corpus (con su estado en SECOP II), no la que el cliente tenía en
             pantalla: así un cambio de estado desde el día de guardar se detecta */
          const fv = S.fotoViva(viva);
          foto = { ...(foto && foto.nombre ? foto : fv), estado_secop: fv.estado_secop };
        }
        if ((!foto || !foto.nombre) && viva) foto = S.fotoDe(viva);
        const estado = S.normalizarEstado(d.estado || (existente && existente.estado) || "interesa");
        /* F0-7 · la predicción se congela al CREAR y NO se vuelve a calcular: es la
           cifra del día en que decidió. Lo único que se actualiza después es su
           DESENLACE, cuando el estado lo fija (ganado/perdido). Un guardado
           anterior a esta versión no tiene predicción y se queda sin ella:
           recalcularla hoy y etiquetarla con la fecha de entonces sería inventar el
           dato que esto existe para conservar. Una predicción que venga en el
           cuerpo se IGNORA: la calcula el servidor (ver congelarPrediccion). Si
           el guardado apareció entre la lectura previa y esta, manda la suya. */
        let prediccion = existente ? (existente.prediccion || null) : (prediccionNueva || await congelarPrediccion(redis, p, id));
        if (prediccion) {
          const des = S.desenlaceDe(estado);
          if (des !== prediccion.desenlace) prediccion = { ...prediccion, desenlace: des, desenlace_el: des == null ? null : ahora };
        }
        /* EL CASILLERO (7-sep-2026) · UNA SOLA REGLA PARA LOS TRES CAMPOS DEL
           USUARIO. Se toca lo que VIENE en el cuerpo: la clave PRESENTE fija el
           valor (y `null` significa «déjelo vacío»); la clave ausente conserva
           lo que había. Un POST que solo cambia la etapa no puede borrar las
           notas, la lista de verificación ni la carpeta.
           `notas` no seguía esa regla —`!= null` conservaba con `null` mientras
           `carpeta: null` tenía que vaciar—: dos campos hermanos en los que el
           mismo `null` significaba lo contrario. Es la regla de los hermanos
           vivos, y se unifica antes de que el tercero llegue.
           Una carpeta que ya no existe cae a null —el proceso sale en «Sin
           carpeta»— en vez de 400: es la regla del valor de filtro desconocido. */
        const trae = (k) => Object.prototype.hasOwnProperty.call(d, k);
        const carpetasG = carpetasDe(g);
        const carpeta = trae("carpeta")
          ? S.carpetaDe(carpetasG, d.carpeta)
          : (existente ? S.carpetaDe(carpetasG, existente.carpeta) : null);
        const tareasPedidas = trae("tareas") && Array.isArray(d.tareas) ? d.tareas.length : null;
        const tareas = trae("tareas") ? S.normalizarTareas(d.tareas, { ahora }) : S.normalizarTareas(existente && existente.tareas);
        const docsPedidos = trae("documentos") && Array.isArray(d.documentos) ? d.documentos.length : null;
        const documentos = trae("documentos") ? S.normalizarDocumentos(d.documentos, { ahora }) : S.normalizarDocumentos(existente && existente.documentos);
        g.procesos[id] = {
          id, estado,
          notas: trae("notas") ? (d.notas == null ? null : String(d.notas).slice(0, S.MAX_NOTAS) || null) : (existente ? existente.notas || null : null),
          foto: foto || { id }, guardado: existente ? existente.guardado : ahora, actualizado: ahora,
          visto: existente ? existente.visto || null : null, visto_el: existente ? existente.visto_el || null : null,
          prediccion, carpeta, tareas, documentos,
        };
        await escribirJSON(redis, clave(p), g);
        /* UN TOPE ALCANZADO SE DICE. Si la lista llegó con más de las que caben,
           o con alguna sin texto, se guarda lo que cabe y la respuesta lo dice:
           recortar en silencio le haría creer al usuario que apuntó algo que no
           está. La cifra sale de comparar lo pedido con lo guardado. */
        const cuerpoOk = { ok: true, perfil: p, id, guardado: g.procesos[id], total: Object.keys(g.procesos).length, guia: null };
        if (tareasPedidas != null && tareasPedidas > tareas.length) {
          cuerpoOk.tareas_no_guardadas = tareasPedidas - tareas.length;
          cuerpoOk.aviso = `Se guardaron ${tareas.length} de las ${tareasPedidas} anotaciones: el tope por proceso es ${S.MAX_TAREAS} y una anotación sin texto no se guarda.`;
        }
        if (docsPedidos != null && docsPedidos > documentos.length) {
          cuerpoOk.documentos_no_guardados = docsPedidos - documentos.length;
          cuerpoOk.aviso = `Se guardaron ${documentos.length} de los ${docsPedidos} documentos: el tope por proceso es ${S.MAX_DOCUMENTOS} y un documento sin nombre ni tipo no se guarda.`;
        }
        return { status: 200, creado: !existente, cuerpo: cuerpoOk };
      }, { accion: "guardar el proceso" });
    } catch (e) {
      if (esCandadoOcupado(e)) return res.status(409).json(cuerpoCandadoOcupado(e));
      throw e;
    }
    if (r.status !== 200 || !r.creado) return res.status(r.status).json(r.cuerpo);
    /* la guía viaja en la MISMA respuesta del guardado: es lo que hace que «al
       guardar, la plataforma le diga qué necesita» sea automático y no una
       segunda pulsación. Solo al crear (al cambiar de etapa no hace falta), y
       FUERA del candado: el guardado ya está escrito y la guía es lo pesado. */
    const ctxG = await contextoGuia(redis, p);
    let cronG = {}; try { cronG = await leerFechasCronograma(redis); } catch { cronG = {}; }
    const docsG = await documentosDe(redis, [id]);
    const guia = guiaPara(r.cuerpo.guardado, viva, p, ctxG, Date.now(), cronG[id] || null, docsG.get(id) || null);
    return res.status(200).json({ ...r.cuerpo, guia });
  }

  if (!PERFIL_RE.test(perfil)) return res.status(400).json({ ok: false, error: "Falta ?perfil=…" });

  if (metodo === "DELETE") {
    const id = String(q.id || "").trim();
    if (!ID_RE.test(id)) return res.status(400).json({ ok: false, error: "Falta ?id= del proceso a quitar." });
    let r;
    try {
      r = await conCandado(redis, claveCandado(perfil), CANDADO_CORTO_TTL_SEG, async () => {
        const g = await leerGuardados(redis, perfil);
        const habia = !!g.procesos[id];
        delete g.procesos[id];
        await escribirJSON(redis, clave(perfil), g);
        return { habia, total: Object.keys(g.procesos).length };
      }, { accion: "quitar el proceso" });
    } catch (e) {
      if (esCandadoOcupado(e)) return res.status(409).json(cuerpoCandadoOcupado(e));
      throw e;
    }
    return res.status(200).json({ ok: true, perfil, id, quitado: r.habia, total: r.total });
  }
  if (metodo !== "GET") { res.setHeader("Allow", "GET, POST, DELETE"); return res.status(405).json({ ok: false, error: "Use GET, POST o DELETE." }); }

  const g = await leerGuardados(redis, perfil);

  if (q.ics) {
    const id = String(q.ics).trim();
    /* TODA LA AGENDA EN UN ARCHIVO (`?ics=todos`, 7-sep-2026): con veinte
       procesos guardados, bajar veinte calendarios no es una agenda. Mismo
       constructor de eventos que el de uno solo (lib/cronograma.icsDeGrupos):
       dos armadores del .ics divergirían a la primera corrección. */
    if (id === "todos") {
      const { procesos } = await alertasDelPerfil(redis, perfil, Date.now(), { guardados: g });
      res.setHeader("Content-Type", "text/calendar; charset=utf-8");
      res.setHeader("Content-Disposition", 'attachment; filename="detekta_mis_procesos.ics"');
      return res.status(200).send(S.icsDeTodos(procesos));
    }
    const gu = g.procesos[id];
    if (!gu) return res.status(404).json({ ok: false, error: "Ese proceso no está guardado en este perfil." });
    const vivas = await filaViva(redis, [id]);
    /* la fecha límite REAL para avisar que le interesa, si alguien ya leyó el
       pliego de este proceso: manda sobre la ventana calculada (peldaño 1) */
    const cronIcs = await leerFechasCronograma(redis);
    const e = S.enriquecer(gu, vivas.get(id) || null, Date.now(), { fechaManifestacionCronograma: cronIcs[id] || null, carpetas: carpetasDe(g) });
    res.setHeader("Content-Type", "text/calendar; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="detekta_${id.replace(/[^A-Za-z0-9._-]/g, "_")}.ics"`);
    return res.status(200).send(S.icsDe(e));
  }
  if (q.detalle) {
    const id = String(q.detalle).trim();
    const gu = g.procesos[id];
    if (!gu) return res.status(404).json({ ok: false, error: "Ese proceso no está guardado en este perfil." });
    if (String(q.refrescar || "") !== "1") {
      try { const c = await leerJSON(redis, claveDetalle(id)); if (c && c.consultado_el) return res.status(200).json({ ...c, cache: true }); } catch { /* sin caché */ }
    }
    const det = await detalleCompetencia(id, gu, {});
    if (det.ok) { try { await redis.set(claveDetalle(id), JSON.stringify(det), { ex: TTL_DETALLE_SEG }); } catch { /* caché opcional */ } }
    return res.status(200).json({ ...det, cache: false });
  }

  /* ══ EL EXPEDIENTE DE UN PROCESO (7-sep-2026) ══════════════════════════════
     Encargo del dueño: «poder ENTRAR al proceso». Lo caro —la guía, con sus
     índices y los documentos leídos— se calcula para ESE proceso y para ninguno
     más: la lista ya no la pide. Medido con el perfil al tope: la lista pesaba
     7,85 MiB con la guía de cada uno y 0,47 MiB sin ella; un expediente
     completo, 0,04 MiB.
     La respuesta trae el proceso COMPLETO (cuaderno, papeleo, guía) y, al lado,
     lo que el expediente necesita para pintarse sin una segunda petición: las
     carpetas, los topes y el día de Colombia. */
  if (q.expediente) {
    const idExp = String(q.expediente).trim();
    if (!ID_RE.test(idExp)) return res.status(400).json({ ok: false, error: "Falta ?expediente= con el id del proceso." });
    if (!g.procesos[idExp]) return res.status(404).json({ ok: false, error: "Ese proceso no está guardado en este perfil." });
    const uno = await alertasDelPerfil(redis, perfil, Date.now(), { conGuia: true, guardados: g, soloId: idExp });
    const proceso = uno.procesos.find((p) => p.id === idExp) || null;
    return res.status(200).json({ ok: true, perfil, proceso, carpetas: uno.carpetas, hoy: uno.hoy,
      estados: S.ESTADO_ETIQUETA, orden_estados: S.ESTADOS, estados_documento: S.ESTADO_DOC_ETIQUETA,
      topes: { carpetas: S.MAX_CARPETAS, tareas: S.MAX_TAREAS, notas: S.MAX_NOTAS, procesos: S.MAX_GUARDADOS, documentos: S.MAX_DOCUMENTOS, nombre_carpeta: S.LARGO_CARPETA, texto_tarea: S.LARGO_TAREA, nombre_documento: S.LARGO_DOC },
      como_leerlo: "El expediente de UN proceso: todo lo que la aplicación sabe de esa contratación con este perfil. `guia` es qué necesita para presentarse; `documentos` es su papeleo (de cada uno se guarda su REGISTRO —qué es, cómo va, cuándo vence, cómo se llamaba el archivo, cuántas páginas tenía y si traía texto—: ni el archivo ni lo que dice salen del computador del usuario); `tareas` y `notas` son su cuaderno; `hitos` el cronograma y `fechas_suyas` las que puso usted." });
  }

  const { procesos, alertas, resumen, carpetas, hoy } = await alertasDelPerfil(redis, perfil, Date.now(), { conGuia: false, guardados: g });
  /* LA LISTA VIAJA LIGERA (7-sep-2026). Las alertas y el resumen se calculan con
     el proceso COMPLETO —si no, no verían ni un aviso ni una anotación— y solo
     al escribir la respuesta se quita lo que la FILA no pinta: el cuaderno, el
     papeleo, los avisos y la guía. Lo completo se pide al ENTRAR al expediente,
     y de un proceso. Es también el techo de Vercel resuelto en la raíz: la
     función corta en 4,5 MB y, medido con el perfil al tope (200 procesos, el
     cuaderno y el papeleo llenos), la respuesta pesaba 7,85 MiB con la guía
     dentro —se cortaba, y la pestaña moría entera y en silencio— y pesa
     0,47 MiB sin ella. La cifra la mide la suite, no este comentario. */
  return res.status(200).json({ ok: true, perfil, resumen, alertas, procesos: procesos.map(S.aLigero), carpetas, hoy,
    estados: S.ESTADO_ETIQUETA, orden_estados: S.ESTADOS, estados_documento: S.ESTADO_DOC_ETIQUETA,
    topes: { carpetas: S.MAX_CARPETAS, tareas: S.MAX_TAREAS, notas: S.MAX_NOTAS, procesos: S.MAX_GUARDADOS, documentos: S.MAX_DOCUMENTOS, nombre_carpeta: S.LARGO_CARPETA, texto_tarea: S.LARGO_TAREA, nombre_documento: S.LARGO_DOC },
    como_leerlo: "Sus procesos guardados con la versión VIVA del corpus, en la forma que pinta la LISTA: estado, días para el cierre, hitos del cronograma (incluida la manifestación de interés calculada en menor cuantía), lo que cambió desde la última vez que lo dio por visto (`cambios`; se cierra con POST {id, enterado:true}), en qué carpeta está y CUÁNTO hay en su cuaderno y en su papeleo (`tareas_resumen`, `documentos_resumen`) más las fechas que puso usted (`fechas_suyas`), que son las que el calendario de la pestaña sitúa. Lo pesado —la guía del pliego, el cuaderno entero y el papeleo entero— NO viaja aquí: se pide con `?expediente=<id>` al entrar a un proceso, que es cuando se mira. `alertas` es el centro de alertas de los próximos 7 días; `carpetas`, cómo tiene organizado el casillero; `hoy`, el día en Colombia según el servidor. Cuando el proceso cierra, «detalle» trae quiénes se presentaron." });
};
module.exports.detalleCompetencia = detalleCompetencia;
/* el aviso diario por correo (op=avisos, M-COMP-03) recorre EXACTAMENTE este
   camino: una sola definición de qué cierra y qué cambió */
module.exports.alertasDelPerfil = alertasDelPerfil;
module.exports.perfilesGuardados = perfilesGuardados;
/* la restauración de una copia (lib/copia_datos, 6-sep-2026) escribe
   `seguimiento:{perfil}` bajo ESTE candado: una sola fuente de la clave */
module.exports.claveCandado = claveCandado;
