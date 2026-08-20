/* ============================================================================
   lib/baja_maxima · hasta dónde puede bajar el dueño en CADA proceso (A4)
   ----------------------------------------------------------------------------
   El factor de precio de P(ganar) (lib/probabilidad.factorPrecio) necesita
   `b_max`: la baja máxima que el dueño soporta sin perder plata. Este módulo la
   resuelve, en orden:
     1. del PRESUPUESTO GUARDADO del proceso en el editor de APU (borrador con
        `costo_directo_guardado` e `id_proceso`): b_max = 1 − piso_rentable /
        presupuesto_oficial, con la MISMA `pisoTecho` del panel Piso/Techo —
        el piso ya lleva la contribución del 5 % y las deducciones cargadas;
     2. si no hay borrador, la DECLARADA (`?baja_max=`);
     3. si no hay ninguna, null ⇒ el factor de precio es neutro.
   La leen /api/procesos?op=listar (la tarjeta) y la vista `probabilidad` de
   /api/inteligencia (el desglose): si divergieran, el desglose explicaría una
   probabilidad que la lista no calculó, y hay prueba de que reproducen la
   misma `p`. Por eso vive en un módulo y no copiado en los dos handlers.

   Los borradores se leen con SCAN + MGET sobre las propias claves (la clave es
   la fuente de verdad: un índice aparte con TTL se desincroniza al caducar un
   borrador). Un borrador guardado antes de que se guardara el costo directo
   cuenta en `sin_costo` y no sirve. Si hay varios del mismo proceso manda el
   más reciente.
   ========================================================================== */
"use strict";

const { CLAVES, descomprimir } = require("./almacen.js");
const { pisoTecho } = require("./apu/piso_techo.js");

/* La CONFIGURACIÓN MÁS RECIENTE del usuario (administración, imprevistos,
   ganancia, deducciones de acta) sale del último borrador guardado — de
   CUALQUIERA, también de los que no tienen costo: la estructura de precio es
   suya y no del proceso. La usa `lib/ganancia` para estimar lo que deja un
   proceso que todavía no ha costeado, y sale gratis: los borradores ya están
   leídos aquí. Sin ningún borrador viaja `null` y quien la consuma usa el
   defecto documentado Y LO DECLARA — jamás se le atribuye al usuario una
   estructura de precio que nunca escribió. */
async function cargarCostosPorProceso(redis, perfil) {
  const porProceso = new Map();
  let claves = [];
  try { claves = await redis.scan(CLAVES.patronApuPerfil(perfil)); } catch { return { porProceso, borradores: 0, sin_costo: 0, config_reciente: null, config_guardado: null }; }
  let borradores = 0, sinCosto = 0;
  let configReciente = null, configGuardado = null;
  for (let i = 0; i < claves.length; i += 8) {
    let valores = [];
    try { valores = await redis.mget(claves.slice(i, i + 8)); } catch { continue; }
    for (const v of valores) {
      const r = v == null ? null : descomprimir(v);
      if (!r || !r.id) continue;
      borradores++;
      if (r.config && typeof r.config === "object" && (configGuardado == null || String(r.guardado) > String(configGuardado))) {
        configReciente = r.config; configGuardado = r.guardado || "";
      }
      const cd = Number(r.costo_directo_guardado);
      if (!r.id_proceso || !Number.isFinite(cd) || cd <= 0) { sinCosto++; continue; }
      const previo = porProceso.get(r.id_proceso);
      if (!previo || String(r.guardado) > String(previo.guardado)) {
        porProceso.set(r.id_proceso, {
          id: r.id, guardado: r.guardado, costo_directo: cd, config: r.config || {}, total_guardado: r.total_guardado ?? null,
        });
      }
    }
  }
  return { porProceso, borradores, sin_costo: sinCosto, config_reciente: configReciente, config_guardado: configGuardado };
}

/* Piso/techo del proceso con su borrador: la MISMA función pura del panel
   (lib/apu/piso_techo). `baja` y `competencia` son los registros que ya calculó
   quien llama (bajaDeMercado / competenciaDe). null sin borrador con costo. */
function pisoTechoDeBorrador(l, costos, { baja = null, competencia = null } = {}) {
  const idProc = l && l.id_del_proceso ? l.id_del_proceso : null;
  const c = costos && idProc ? costos.porProceso.get(idProc) : null;
  if (!c) return null;
  const cfg = c.config || {};
  const pt = pisoTecho({
    presupuesto_oficial: Number(l.cuantia_cop) > 0 ? Number(l.cuantia_cop) : null,
    costo_directo: c.costo_directo,
    aiu: { administracion_pct: cfg.aiu_pct, imprevistos_pct: cfg.imprevistos_pct, utilidad_pct: cfg.utilidad_pct, modo: cfg.modo_aiu },
    utilidad_minima_pct: cfg.utilidad_minima_pct ?? null,
    deducciones_pct: cfg.deducciones_pct ?? null,
    baja, competencia,
    precio_actual: c.total_guardado,
    modalidad: l.modalidad_de_contratacion || null,
  });
  return { borrador: c, pt };
}

/* b_max del proceso: {valor (%), origen: "apu"|"declarada"|null, borrador}.
   El APU manda sobre la declarada: es de ESTE proceso y está calculado; la
   declarada es una cifra general del dueño. */
function bajaMaximaDe(l, costos, { baja = null, competencia = null, bajaDeclarada = null } = {}) {
  return bajaMaximaDesdePisoTecho(l, pisoTechoDeBorrador(l, costos, { baja, competencia }), bajaDeclarada);
}
/* La misma resolución a partir de un piso/techo YA calculado (el listado lo
   memoiza por fila): una sola definición de «b_max = 1 − piso/PO». */
function bajaMaximaDesdePisoTecho(l, r, bajaDeclarada = null) {
  const po = Number(l && l.cuantia_cop);
  const piso = r && r.pt && r.pt.cifras ? Number(r.pt.cifras.piso_rentable) : NaN;
  if (Number.isFinite(piso) && piso > 0 && Number.isFinite(po) && po > 0) {
    return { valor: Math.max(0, Math.round((1 - piso / po) * 10000) / 100), origen: "apu", borrador: r.borrador.id, piso_techo: r };
  }
  const decl = bajaDeclarada == null || bajaDeclarada === "" ? null : Number(bajaDeclarada);
  if (Number.isFinite(decl) && decl >= 0 && decl <= 100) return { valor: decl, origen: "declarada", borrador: null, piso_techo: r };
  return { valor: null, origen: null, borrador: null, piso_techo: r };
}

module.exports = { cargarCostosPorProceso, pisoTechoDeBorrador, bajaMaximaDe, bajaMaximaDesdePisoTecho };
