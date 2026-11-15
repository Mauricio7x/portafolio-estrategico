"use strict";
/* ============================================================================
   lib/invitados · ¿Cuántos proveedores fueron invitados a ofertar? (menor cuantía)
   ----------------------------------------------------------------------------
   docs/PLAN_PRECIO.md, tanda 1 (15-nov-2026). En selección abreviada de menor cuantía solo puede
   ofertar quien manifestó interés y, si hubo sorteo, quien salió sorteado. SECOP II publica ese
   número en los datos abiertos (`proveedores_invitados` de p6dx-8zbt) cuando la entidad publica la
   invitación, pocos días antes del cierre. Medido el 14-nov-2026: de 274 procesos abiertos solo lo
   traían los 15 con la invitación ya publicada; en los demás el campo viene en 0.

   Es un HECHO CONTADO, no una probabilidad ni un precio sugerido: dice cuántos fueron invitados y,
   con ese número de invitados, en cuántos de cada 100 procesos ya adjudicados llegaron una o dos
   ofertas (con dos invitados, una sola), con la cifra de todas las menores cuantías al lado. No mueve ningún precio, ninguna baja
   y ningún orden. La tabla NO se escribe a mano: vive en `data/invitados_menor_cuantia.json`, en
   conteos, y la regenera `tools/analisis/plan_precio/invitados_medir.js --data`.

   Reglas que no hay que deshacer:
   · Un 0 (o el campo vacío) es «todavía sin publicar», NO «cero invitados»: SECOP II deja el campo
     en 0 hasta que sale la invitación.
   · El expediente tiene una fila por fase (observaciones, manifestación, oferta), cada una con su
     propio `id_del_proceso` y todas con el mismo `id_del_portafolio`; el número está en la fila de la
     fase de oferta. Por eso se lee por portafolio y se toma el mayor.
   · Más respuestas que invitados es un campo que se contradice: no se dice nada (como
     scripts/base_obra/fila.js).
   · UNA INVITACIÓN CANCELADA NO CUENTA (revisión adversaria del 15-nov-2026, reproducido): el expediente
     CO1.BDOS.10090460 tiene una fase de oferta «Cancelado» con 269 invitados y la vigente, ya adjudicada,
     con 10; tomar el mayor decía 269. De 26 expedientes de obra con dos números, 15 daban el equivocado.
     Se descartan las filas canceladas; si solo hay canceladas, se dice que la invitación fue cancelada.
   · Solo menor cuantía CON manifestación de interés: en las demás modalidades no hay invitación.
   · Cuando el número aparece por primera vez se guarda con su fecha (`invitados:visto:<portafolio>`),
     para poder comprobar después que no cambia tras el cierre (pendiente del plan).
   ============================================================================ */

const TTL_SEG = 6 * 3600;                 // el número publicado se recuerda 6 h
const TTL_CORTO_SEG = 15 * 60;            // «sin publicar» y «cancelada», 15 minutos: puede cambiar pronto, pero no entre dos cálculos seguidos
const TTL_VISTO_SEG = 400 * 24 * 3600;    // la primera vez que se vio, 400 días (como las evaluaciones)
const TIEMPO_MS = 15000;
const MIN_PROCESOS_CLASE = 100;           // con menos procesos en la clase se dice el número, sin la cuenta
const BASE = () => process.env.SECOP_BASE_URL || "https://www.datos.gov.co/resource/p6dx-8zbt.json";
const RE_ID = /^CO1\.(REQ|BDOS)\.\d{3,12}$/;
const clave = (id) => `invitados:v1:${id}`;
const claveVisto = (portafolio) => `invitados:visto:${portafolio}`;

/* Entero ≥ 0 o null. La ausencia se descarta ANTES de convertir: Number(null) === 0. */
const entero = (v) => {
  if (v == null) return null;
  const t = String(v).trim();
  return /^\d{1,7}$/.test(t) ? Number(t) : null;   // solo dígitos: «1e2», «4.0» o «0x10» no son un conteo
};
const sinTildes = (s) => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/* ¿La fila es de menor cuantía CON manifestación de interés? La modalidad la decide la regla de la lista
   (lib/filtros_lista.modalidadDe, llamada: devuelve «abreviada»); la variante «sin manifestación» no invita. */
function conInvitacion(fila) {
  const { modalidadDe } = require("./filtros_lista.js");
  return !!fila && modalidadDe(fila) === "abreviada" && !/sin manifestacion/.test(sinTildes(fila.modalidad_de_contratacion));
}

const cancelada = (fila) => /cancelad/.test(sinTildes(fila.estado_del_procedimiento));

/* De las filas del expediente (una por fase) al hecho. Estados:
     no_encontrado   no hay filas
     no_aplica       ninguna fila es de menor cuantía con manifestación
     sin_publicar    el campo viene vacío o en 0 en todas: todavía no hay invitación publicada
     cancelada       hay número, pero solo en fases de oferta canceladas
     contradictorio  más respuestas que invitados en la invitación vigente
     publicado       {invitados}: el de la invitación vigente (el mayor, si hay más de una) */
function invitadosDeFilas(filas) {
  const v = Array.isArray(filas) ? filas.filter((f) => f && typeof f === "object") : [];
  if (!v.length) return { estado: "no_encontrado", invitados: null };
  const mias = v.filter(conInvitacion);
  if (!mias.length) return { estado: "no_aplica", invitados: null };
  const conNumero = mias.filter((f) => { const n = entero(f.proveedores_invitados); return n != null && n > 0; });
  if (!conNumero.length) return { estado: "sin_publicar", invitados: null };
  const vigentes = conNumero.filter((f) => !cancelada(f));
  if (!vigentes.length) return { estado: "cancelada", invitados: null };
  const n = Math.max(...vigentes.map((f) => entero(f.proveedores_invitados)));
  const resp = vigentes.map((f) => entero(f.respuestas_al_procedimiento)).filter((x) => x != null);
  if (resp.length && Math.max(...resp) > n) return { estado: "contradictorio", invitados: null };
  return { estado: "publicado", invitados: n };
}

let _tabla;
/* La tabla medida, leída UNA vez por instancia. Un archivo ilegible o de otro formato es «sin tabla», no un 500. */
function tabla() {
  if (_tabla !== undefined) return _tabla;
  try {
    const t = require("../data/invitados_menor_cuantia.json");
    _tabla = t && t.formato === 1 && Array.isArray(t.clases) && t.total && t.total.procesos > 0 ? t : null;
  } catch { _tabla = null; }
  return _tabla;
}

const ROTULO = Object.freeze({ "1": "1 invitado", "2": "2 invitados", "3": "3 invitados", "4-5": "4 o 5 invitados", "6-9": "6 a 9 invitados", "10": "10 invitados", "11+": "11 invitados o más" });
const deCada100 = (parte, total) => Math.round((parte * 100) / total);

/* La clase de la tabla para n invitados, o null (sin tabla, n ilegible o una clase con pocos procesos). */
function claseDe(n, t = tabla()) {
  if (!t || !Number.isInteger(n) || n < 1) return null;
  const c = t.clases.find((x) => n >= x.desde && (x.hasta == null || n <= x.hasta));
  return c && c.procesos >= MIN_PROCESOS_CLASE && ROTULO[c.clave] ? c : null;
}

/* EL HECHO en una frase corta (se lee en el teléfono: la primera versión ocupaba once renglones a 390 px, medido en
   Chromium el 15-nov-2026). Dice el número y UNA cuenta, con la general al lado:
     · 1 invitado: solo el número (que llegue una oferta es obvio);
     · 2 invitados: en cuántos de cada 100 llegó UNA sola («una o dos» sería decir nada);
     · 3 o más: en cuántos de cada 100 llegaron una o dos.
   Sin tabla, o con una clase de pocos procesos, solo el número y la regla. */
function fraseInvitados(n, t = tabla()) {
  if (!Number.isInteger(n) || n < 1) return null;
  const { numCO } = require("./lenguaje_pantalla.js");
  const quienes = n === 1
    ? "Invitados a ofertar: 1 (SECOP II). Solo ese proveedor puede presentar oferta."
    : `Invitados a ofertar: ${numCO(n, 0)} (SECOP II). Solo ellos pueden presentar oferta.`;
  const c = n === 1 ? null : claseDe(n, t);
  if (!c) return quienes;
  const desde = String(t.recepcion_desde || "").slice(0, 4);
  const base = `${numCO(c.procesos, 0)}${desde ? ` desde ${desde}` : ""}`;
  const cuenta = n === 2
    ? `Con ${ROTULO[c.clave]} llegó una sola oferta en ${deCada100(c.con_una, c.procesos)} de cada 100 procesos (${base}); en general, en ${deCada100(t.total.con_una, t.total.procesos)} de cada 100.`
    : `Con ${ROTULO[c.clave]} llegaron una o dos ofertas en ${deCada100(c.con_una_o_dos, c.procesos)} de cada 100 procesos (${base}); en general, en ${deCada100(t.total.con_una_o_dos, t.total.procesos)} de cada 100.`;
  const tope = c.clave === "10" ? " Diez es el tope si hubo sorteo." : "";
  return `${quienes} ${cuenta}${tope}`;
}

const MOTIVO_TEXTO = Object.freeze({
  sin_proceso: null,   // sin el número del proceso no hay nada que consultar, y no es un fallo que haya que contar
  no_respondio: "No se pudo consultar en SECOP II cuántos proveedores fueron invitados a ofertar: datos.gov.co no respondió a tiempo. Vuelva a calcular en unos minutos.",
});
const FRASE_CANCELADA = "SECOP II marca como cancelada la invitación a ofertar de este proceso: no hay un número de invitados vigente.";
const FRASE_SIN_PUBLICAR = "SECOP II todavía no publica cuántos fueron invitados a ofertar en este proceso: el número sale con la invitación, después de la manifestación de interés.";

/* Consulta el expediente en datos.gov.co (dos consultas chicas: la fila del proceso → su portafolio → sus fases).
   Devuelve {ok, estado, invitados, desde} o {ok:false, motivo}. Una fuente que no responde es ok:false, jamás
   «sin publicar»: «no se pudo consultar» y «todavía no hay invitación» son cosas distintas. */
async function leerInvitados(redis, { idProceso, log = () => {}, cliente = null, ahora = Date.now() } = {}) {
  const id = String(idProceso || "").trim().toUpperCase();
  if (!RE_ID.test(id)) return { ok: false, motivo: "sin_proceso" };
  if (redis) {
    try {
      const v = await redis.get(clave(id));
      const j = v ? (typeof v === "string" ? JSON.parse(v) : v) : null;
      if (j && j.estado === "publicado" && Number.isInteger(j.invitados) && j.invitados >= 1) return { ok: true, estado: "publicado", invitados: j.invitados, desde: "memoria" };
      if (j && (j.estado === "sin_publicar" || j.estado === "cancelada")) return { ok: true, estado: j.estado, invitados: null, desde: "memoria" };
    } catch { /* sin memoria se consulta */ }
  }
  const { crearCliente, escSoQL } = require("./socrata.js");
  const cli = cliente ? cliente(BASE()) : crearCliente({ baseUrl: BASE(), log });
  let filas, portafolio = /^CO1\.BDOS\./.test(id) ? id : null;
  try {
    if (!portafolio) {
      const f1 = await cli.pedir({ "$select": "id_del_portafolio", "$where": `id_del_proceso='${escSoQL(id)}'`, "$limit": "5" }, "el expediente del proceso", { plazoMs: TIEMPO_MS });
      const p = (Array.isArray(f1) ? f1 : []).map((f) => String((f && f.id_del_portafolio) || "").trim().toUpperCase()).find((x) => RE_ID.test(x));
      if (!p) return { ok: true, estado: "no_encontrado", invitados: null, desde: "datos.gov.co" };
      portafolio = p;
    }
    filas = await cli.pedir({
      "$select": "id_del_proceso,fase,estado_del_procedimiento,modalidad_de_contratacion,proveedores_invitados,respuestas_al_procedimiento",
      "$where": `id_del_portafolio='${escSoQL(portafolio)}'`, "$limit": "50",
    }, "las fases del expediente", { plazoMs: TIEMPO_MS });
  } catch (e) { log(`invitados/p6dx: ${e && e.message}`); return { ok: false, motivo: "no_respondio" }; }
  const hecho = invitadosDeFilas(filas);
  if (redis && hecho.estado === "publicado") {
    try {
      await redis.set(clave(id), JSON.stringify({ estado: "publicado", invitados: hecho.invitados, portafolio }), { ex: TTL_SEG });
      // la primera vez que se vio el número, con su fecha: NX, para que la siguiente lectura no la pise
      await redis.set(claveVisto(portafolio), JSON.stringify({ invitados: hecho.invitados, visto: new Date(ahora).toISOString().slice(0, 10) }), { nx: true, ex: TTL_VISTO_SEG });
    } catch (e) { log(`invitados: ${e && e.message}`); }
  } else if (redis && (hecho.estado === "sin_publicar" || hecho.estado === "cancelada")) {
    /* poco tiempo: la invitación puede salir en cualquier momento, pero cinco cálculos seguidos de Precios no tienen
       por qué preguntar diez veces a datos.gov.co (revisión adversaria del 15-nov-2026) */
    try { await redis.set(clave(id), JSON.stringify({ estado: hecho.estado, portafolio }), { ex: TTL_CORTO_SEG }); } catch (e) { log(`invitados: ${e && e.message}`); }
  }
  return { ok: true, ...hecho, desde: "datos.gov.co" };
}

/* Lo que viaja a la pantalla: el estado, el número y la frase ya escrita (o null si no hay nada que decir). */
function paraPantalla(r) {
  if (!r || !r.ok) {
    const motivo = (r && r.motivo) || "no_respondio";
    return { estado: null, invitados: null, frase: null, motivo, motivo_texto: MOTIVO_TEXTO[motivo] === undefined ? MOTIVO_TEXTO.no_respondio : MOTIVO_TEXTO[motivo] };
  }
  const frase = r.estado === "publicado" ? fraseInvitados(r.invitados) : r.estado === "sin_publicar" ? FRASE_SIN_PUBLICAR : r.estado === "cancelada" ? FRASE_CANCELADA : null;
  return { estado: r.estado, invitados: r.estado === "publicado" ? r.invitados : null, frase, desde: r.desde || null, motivo: null, motivo_texto: null };
}

module.exports = {
  invitadosDeFilas, conInvitacion, claseDe, fraseInvitados, leerInvitados, paraPantalla, tabla, clave, claveVisto,
  TTL_SEG, TTL_CORTO_SEG, TTL_VISTO_SEG, MIN_PROCESOS_CLASE, FRASE_SIN_PUBLICAR, FRASE_CANCELADA, MOTIVO_TEXTO,
};
