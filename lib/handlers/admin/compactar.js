/* /api/admin?op=compactar · QUE LA BASE DE DATOS NO SE VUELVA A LLENAR (30-sep-2026)

   Lo dispara un cron de Vercel cada madrugada (/api/compactar) y se puede pegar a
   mano en Chrome con «&token=…». Hace, en orden (lib/compactar):
     1. si la base no tiene la holgura que necesita, libera SOLO lo que la
        aplicación rehace sola, en un orden declarado, volviendo a probar tras cada
        borrado;
     2. compacta el histórico mes a mes (escribe, verifica y mueve el manifiesto; lo
        viejo se borra en una vuelta posterior, pasada la gracia);
     2 bis. recomprime EN SU SITIO los bloques del corpus del año (misma clave, mismas
        filas, mismo orden: lib/compactar.recomprimirActivo explica por qué no se juntan);
     3. si se borró la copia publicada del perfil de los competidores, la vuelve a
        construir con la cadena del histórico (`reconstruir_indice`), en tramos, en
        cuanto no queda nada por compactar;
     4. mide cómo quedó la base (lib/espacio) y lo dice en megas.
   Si se acaba el tiempo, lo dice (`que_falta`) y la siguiente vuelta sigue.
   Autorización: el Bearer del cron o la llave de la aplicación. NUNCA abierta: la
   guarda de la sincronización queda abierta si falta CRON_SECRET, y esta operación
   borra; sin esa variable exige la llave (revisión adversaria, 30-sep-2026). */
"use strict";

const { crearRedis, hayCredenciales } = require("../../redis.js");
const { autorizarSincronizacion, hayGuardaDeSincronizacion, autorizarToken } = require("../../auth.js");

const PRESUPUESTO_MAX_MS = 180000;   // + un mes que se pase + reconstrucción + medición < maxDuration de api/admin.js (300 s)
const PRESUPUESTO_DEFECTO_MS = 150000;

/* Invoca un handler en este mismo proceso y devuelve {status, cuerpo}. */
function invocarAqui(handler, query, headers) {
  return new Promise((resolve, reject) => {
    const res = {
      _s: 200, setHeader() {},
      status(n) { this._s = n; return this; },
      json(o) { resolve({ status: this._s, cuerpo: o }); },
      send(b) { resolve({ status: this._s, cuerpo: b }); },
      end() { resolve({ status: this._s, cuerpo: null }); },
    };
    Promise.resolve(handler({ method: "GET", url: "/api/procesos", query, headers }, res)).catch(reject);
  });
}

/* ¿Hay que rehacer la copia publicada del perfil de los competidores? Solo si falta y el
   índice de competencia existe (se construyó alguna vez). Se rehace con la MISMA cadena del
   histórico, pedida a mano (`reconstruir_indice`), con el rango que guarda su progreso:
   otro rango la empezaría de cero. */
async function hayQueRehacerPerfil(redis) {
  const { CLAVES } = require("../../almacen.js");
  const [esta, hayIndice] = await Promise.all([redis.exists(CLAVES.indiceAdjudicatario), redis.exists(CLAVES.indiceMeta)]);
  return !Number(esta) && Number(hayIndice) > 0;
}
async function rehacerPerfilSiFalta(redis, presupuestoMs) {
  const { CLAVES, leerJSON } = require("../../almacen.js");
  if (!(await hayQueRehacerPerfil(redis))) return null;
  if (!process.env.HISTORICO_TOKEN) return { hecho: false, motivo: "falta la llave del histórico en el servidor: no se puede rehacer el perfil de los competidores" };
  const p = await leerJSON(redis, CLAVES.progresoHistorico);
  if (!p || !p.desde || !p.hasta) return { hecho: false, motivo: "no consta el rango de la extracción del histórico: no se rehace a ciegas" };
  const r = await invocarAqui(require("../procesos/historico.js"),
    { reconstruir_indice: "true", desde: p.desde, hasta: p.hasta, chain: "0", presupuesto: String(Math.max(10000, presupuestoMs)) },
    { "x-historico-token": process.env.HISTORICO_TOKEN });
  const c = r.cuerpo || {};
  return { hecho: r.status === 200 && c.done === true, status: r.status, ...(c.error ? { error: String(c.error).slice(0, 200) } : {}) };
}

module.exports = async function handler(req, res) {
  const q = req.query || {};
  res.setHeader("Cache-Control", "no-store");
  const guarda = hayGuardaDeSincronizacion() ? autorizarSincronizacion(req, q) : autorizarToken(req, q);
  if (!guarda.ok) return res.status(guarda.status).json({ ok: false, error: guarda.error, como_autenticar: guarda.como_autenticar });
  if (String(req.method || "GET").toUpperCase() !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ ok: false, error: "Use GET (el cron y la dirección pegada en Chrome llaman así)." });
  }
  if (!hayCredenciales()) return res.status(503).json({ ok: false, error: "Faltan credenciales de Upstash Redis en el despliegue." });

  const { liberarSiLlena, reempacarHistorico, borrarViejosVencidos, recomprimirActivo } = require("../../compactar.js");
  const { tacharClave } = require("../../apu_ocr.js");
  const { relojDeTanda } = require("../../presupuesto.js");
  const redis = crearRedis({});
  const t0 = Date.now();
  const pedido = parseInt(q.presupuesto, 10);
  const presupuestoMs = Number.isFinite(pedido) && pedido > 0 ? Math.min(pedido, PRESUPUESTO_MAX_MS) : PRESUPUESTO_DEFECTO_MS;
  const mb = (b) => (b == null ? null : Math.round((b / 1048576) * 10) / 10);

  let viejos, liberado, reempaque, activo = null, perfil = null;
  try {
    // 0 · lo viejo vencido primero: borrar no necesita sitio, y es lo que devuelve la holgura
    viejos = await borrarViejosVencidos(redis);
    liberado = await liberarSiLlena(redis, { viejosEsperando: viejos.esperando });
    reempaque = liberado.acepta_escrituras
      ? await reempacarHistorico(redis, { presupuestoMs })
      : { ocupado: false, meses: [], pendientes: null, compactados: 0, meses_con_viejo_por_borrar: viejos.esperando,
        paro: viejos.esperando ? "la base no tiene sitio todavía: lo viejo de la vuelta anterior se borra al vencer su gracia" : "la base sigue sin sitio después de liberar lo que se rehace solo" };
    // con el histórico en orden y tiempo de sobra, el corpus del año se recomprime en su sitio;
    // si no se revisa, se dice por qué (un null se leería «nada que hacer»)
    const tanda = relojDeTanda(t0, presupuestoMs);
    tanda.avanzo();
    const noSeReviso = (paro) => ({ ocupado: false, revisado: false, paro });
    activo = !liberado.acepta_escrituras ? noSeReviso("la base no tiene sitio: el corpus del año se revisa cuando lo tenga")
      : reempaque.ocupado || reempaque.paro ? noSeReviso("el histórico no terminó en esta vuelta: el corpus del año se revisa después")
        : tanda.agotado() ? noSeReviso("no quedó tiempo en esta vuelta: el corpus del año se revisa en la siguiente")
          : await recomprimirActivo(redis, { presupuestoMs: Math.max(1, presupuestoMs - (Date.now() - t0)) });
    // con el histórico y el corpus del año al día, lo que se borró para hacer sitio se rehace;
    // si solo falta el tiempo, se mira si hacía falta y se dice (revisión adversaria, 30-sep-2026)
    if (liberado.acepta_escrituras && !reempaque.ocupado && !reempaque.paro && !reempaque.pendientes && !reempaque.compactados
      && activo.revisado !== false && !activo.ocupado && !activo.paro && !activo.pendientes && !activo.sin_revisar) {
      perfil = !tanda.agotado() ? await rehacerPerfilSiFalta(redis, presupuestoMs - (Date.now() - t0))
        : (await hayQueRehacerPerfil(redis)) ? { hecho: false, revisado: false, motivo: "no quedó tiempo en esta vuelta para reconstruirlo" } : null;
    }
  } catch (e) {
    return res.status(502).json({ ok: false, error: `No se pudo compactar: ${tacharClave(String((e && e.message) || e)).slice(0, 200)}`,
      que_hacer: "Vuelva a pegar esta misma dirección en unos minutos: lo ya compactado no se repite." });
  }

  let espacio = null;
  try {
    const m = await require("../../espacio.js").medirEspacio(redis, { presupuestoMs: 30000, muestra: 60, formatos: false });
    espacio = { total_mb: mb(m.bytes_total), medido: m.medido, familias: m.familias.slice(0, 6).map((f) => ({ familia: f.familia, mb: mb(f.bytes), que_es: f.que_es })) };
  } catch { espacio = null; }   // medir es un extra: sin medida se dice null, no se inventa

  const pendientes = reempaque.pendientes || 0;
  const porBorrar = reempaque.meses_con_viejo_por_borrar || 0;
  const noCupieron = (reempaque.meses || []).filter((m) => m.estado === "base_llena").length;
  const que_falta = !liberado.acepta_escrituras && viejos.esperando
    ? `La base todavía no tiene sitio: lo viejo de ${viejos.esperando} mes(es) ya compactado(s) se borra pasados 6 minutos. Vuelva a pegar esta dirección dentro de 6 minutos.`
    : !liberado.acepta_escrituras
    ? "La base sigue llena y no queda nada que la aplicación pueda rehacer sola: hay que ampliarla (upstash.com → la base → Upgrade) o decidir qué borrar."
    : reempaque.ocupado ? reempaque.motivo
      : pendientes || porBorrar || reempaque.paro
        // `pendientes` son meses que esta vuelta no alcanzó a MIRAR: pueden estar ya compactos, así que no se dice «por compactar»
        ? [reempaque.paro ? `El histórico se detuvo: ${reempaque.paro}.` : null,
          noCupieron ? `${noCupieron} mes(es) del histórico no cupieron.` : null,
          pendientes ? `Quedaron ${pendientes} mes(es) del histórico sin revisar.` : null,
          porBorrar ? `${porBorrar} mes(es) tienen lo viejo por borrar, que se borra pasados 6 minutos: vuelva a pegar esta dirección dentro de 6 minutos, o espere a la vuelta de la madrugada.`
            : "Vuelva a pegar esta dirección, o espere a la vuelta de la madrugada."].filter(Boolean).join(" ")
        : activo && activo.ocupado ? activo.motivo
        : activo && (activo.pendientes || activo.sin_revisar || activo.paro)
          ? `${activo.pendientes ? `Faltan ${activo.pendientes} bloque(s) del corpus del año por recomprimir` : "El corpus del año no terminó de revisarse"}${activo.sin_revisar ? ` y quedaron ${activo.sin_revisar} bloque(s) sin revisar` : ""} (${activo.paro || "sin motivo anotado"}). Vuelva a pegar esta dirección, o espere a la vuelta de la madrugada.`
        : perfil && perfil.revisado === false ? `Falta el perfil de los competidores y ${perfil.motivo}. Vuelva a pegar esta dirección para reconstruirlo.`
        : perfil && !perfil.hecho ? `El perfil de los competidores se está reconstruyendo${perfil.motivo ? `: ${perfil.motivo}` : ""}. Vuelva a pegar esta dirección para seguir.`
          : null;
  return res.status(200).json({
    ok: liberado.acepta_escrituras && !reempaque.ocupado && !que_falta,
    viejos_borrados: viejos,
    liberado: { ...liberado, uso_mb: mb(liberado.uso_bytes), limite_mb: mb(liberado.limite_bytes) },
    reempaque: { ...reempaque, mb_a_liberar: mb(reempaque.bytes_a_liberar) },
    corpus_del_ano: { ...activo, mb_liberados: activo.bytes_antes != null ? mb(activo.bytes_antes - activo.bytes_despues) : null },
    perfil_competidores: perfil,
    espacio,
    que_falta,
  });
};
