/* ============================================================================
   lib/capacidad · K de contratación (capacidad residual) — FÓRMULA ÚNICA
   ----------------------------------------------------------------------------
   Única implementación del cálculo de capacidad para TODA la app: tanto la
   sincronización (api/sync.js, que es el "cron" de Vercel) como la consulta
   (api/oportunidades.js) llegan aquí a través de lib/rup.js. La discrepancia
   histórica web-vs-cron (CO sin multiplicador, escalas CT distintas, SCE
   fijado en 0) desapareció por construcción: no hay segunda fórmula.

   Guía CCE-EICP-GI-22 (capacidad residual):
     CRP = CO × (E + CT + CF) / 100 − SCE
       CO  = ingreso operacional. El RUP no lo reporta (perfil.ingresoOp=null)
             → se ESTIMA utilidadOp × 16.7 (margen obra ≈ 6 %); la estimación
             se advierte una vez en logs y viaja a la UI como co_estimado.
       E   = factor de experiencia: mayor contrato acreditado (SMMLV) frente
             al presupuesto del proceso → ≥3: 120 · ≥2: 100 · ≥1: 80 · resto 60
       CT  = capacidad técnica (socios + profesionales de nómina)
             → ≥11: 40 · ≥6: 30 · ≥1: 20
       CF  = capacidad financiera (índice de liquidez)
             → ≥1.5: 40 · ≥1.2: 30 · ≥1.0: 20
       SCE = saldos de contratos en ejecución: saldo × % participación ×
             meses restantes / plazo (meses restantes con tope 12). Sin datos
             → 0, con advertencia en logs (una vez por perfil).
     (Todas las comparaciones con >=, como manda la guía.)

   Proponente plural (perfil con `integrantes`): la capacidad residual es la
   SUMA de las CRP de los integrantes — cada una con SUS indicadores y SU SCE
   (Guía CCE-EICP-GI-22). Los indicadores ponderados 50/50 que lleva el perfil
   del consorcio en lib/perfiles.js son para requisitos habilitantes, NO para
   esta suma.

   Carga del proceso (art. 2.2.1.1.1.6.4, D. 1082/2015):
     CRPC = Presupuesto − Anticipo; si el plazo > 12 meses, × 12 / plazo.
   ========================================================================== */
"use strict";

const { SMMLV } = require("./perfiles.js");

const MARGIN_MULTIPLIER = 16.7; // ingreso ≈ utilidad operacional / 6 % de margen

/* Advertencias de datos faltantes: una vez por perfil, no una por fila. */
const _advertidos = new Set();
function advertir(clave, msg) {
  if (_advertidos.has(clave)) return;
  _advertidos.add(clave);
  console.warn(`[capacidad] ${msg}`);
}

/* ---------- factores de la Guía CCE-EICP-GI-22 (siempre >=) ---------- */
function factorCF(liquidez) {
  if (liquidez >= 1.5) return 40;
  if (liquidez >= 1.2) return 30;
  if (liquidez >= 1.0) return 20;
  return 0;
}
function factorCT(profesionales) {
  if (profesionales >= 11) return 40;
  if (profesionales >= 6) return 30;
  if (profesionales >= 1) return 20;
  return 0;
}
function factorE(expSMMLV, presupuestoSMMLV) {
  if (!presupuestoSMMLV) return 120; // sin presupuesto no hay ratio que exigir
  const r = expSMMLV / presupuestoSMMLV;
  if (r >= 3) return 120;
  if (r >= 2) return 100;
  if (r >= 1) return 80;
  return 60;
}

/* SCE desde la lista de contratos en ejecución del perfil. Sin datos → 0
   con advertencia (la capacidad queda optimista y hay que saberlo). */
function calcSCE(sceList, perfilId) {
  if (!sceList || !sceList.length) {
    advertir(`sce:${perfilId}`, `SCE de "${perfilId}" sin contratos en ejecución registrados: se asume 0 (capacidad posiblemente optimista)`);
    return 0;
  }
  let total = 0;
  for (const c of sceList) {
    if (!c.obra) continue; // solo obra compromete capacidad residual de obra
    const saldo = (c.v || 0) * ((c.pct || 100) / 100);
    const meses = Math.min(c.restanMeses || 0, 12); // tope 12 meses
    total += (c.plazoMeses ? saldo * meses / c.plazoMeses : saldo);
  }
  return total;
}

/* CO del perfil: ingreso operacional real si existe; si no, estimación
   documentada (marcada en logs y expuesta a la UI vía coEstimado). */
function coDe(perfil) {
  if (perfil.ingresoOp != null) return perfil.ingresoOp;
  advertir(`co:${perfil.id}`, `CO de "${perfil.id}" estimado como utilidadOp × ${MARGIN_MULTIPLIER} (el RUP no reporta ingreso operacional)`);
  return Math.round(perfil.utilidadOp * MARGIN_MULTIPLIER);
}
function coEstimado(perfil) {
  if (perfil.integrantes) return perfil.integrantes.some((i) => coEstimado(i.perfil));
  return perfil.ingresoOp == null;
}

/* ---------- CRP: capacidad residual del proponente ---------- */
function crp(perfil, presupuestoCOP) {
  // proponente plural: SUMA de las capacidades residuales de los integrantes
  if (perfil.integrantes) {
    return perfil.integrantes.reduce((acc, i) => acc + crp(i.perfil, presupuestoCOP), 0);
  }
  const presupuestoSMMLV = (presupuestoCOP || 0) / SMMLV;
  const e = factorE(perfil.expSMMLV, presupuestoSMMLV);
  const ct = factorCT(perfil.profesionales);
  const cf = factorCF(perfil.liquidez);
  const sce = calcSCE(perfil.sce, perfil.id);
  return Math.max(coDe(perfil) * (e + ct + cf) / 100 - sce, 0);
}

/* ---------- CRPC: carga real del proceso (D. 1082/2015) ---------- */
function calcCRPC(presupuestoCOP, anticipoPct, plazoMeses) {
  const base = presupuestoCOP - presupuestoCOP * (anticipoPct || 0) / 100;
  if (!plazoMeses || plazoMeses <= 12) return base; // plazo corto: directo
  return base * 12 / plazoMeses;
}

/* Plazo en meses desde duracion + unidad_de_duracion (acentos normalizados —
   el bug histórico: "Días".includes("dia") era false por la í). Default 12. */
function plazoMesesDe(lic) {
  const n = parseFloat(lic.duracion);
  if (isNaN(n) || n <= 0) return 12;
  const u = String(lic.unidad_de_duracion || "meses")
    .normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  if (u.includes("dia")) return n / 30;
  if (u.includes("seman")) return n / 4.33;
  if (u.includes("hora")) return n / 720;
  if (u.includes("an")) return n * 12; // años
  return n; // meses
}

module.exports = {
  MARGIN_MULTIPLIER,
  crp, calcCRPC, plazoMesesDe,
  factorCF, factorCT, factorE, calcSCE, coDe, coEstimado,
};
