/* ============================================================================
   lib/rup · Perfiles RUP + capacidad financiera → rup_valido(licitacion, perfil)
   ----------------------------------------------------------------------------
   DATOS REALES tomados del repositorio (no placeholders): los perfiles vivían
   embebidos en el index.html histórico (rama main), con corte de RUP
   31/12/2025 (en firmeza al 07/05/2026):

   · Whitelists UNSPSC por perfil (lib/unspsc.js, generadas de los RUP):
     Helder 193 clases · Génesis 343 clases · consorcio = unión (393).
   · Estados financieros RUP: liquidez, endeudamiento, patrimonio, utilidad
     operacional, mayor contrato acreditado (SMMLV), contratos en ejecución.
   · K de contratación = capacidad residual CRP de la Guía CCE-EICP-GI-22:
       CRP  = CO × (E + CT + CF) / 100 − SCE
       CO   = ingreso operacional. El RUP no lo reporta → se ESTIMA desde la
              utilidad operacional × 16.7 (margen típico obra civil ≈ 6 %).
       E    = factor de experiencia (mayor contrato vs presupuesto del proceso)
       CT   = capacidad técnica (socios + profesionales de nómina)
       CF   = capacidad financiera (índice de liquidez)
       SCE  = saldos de contratos en ejecución (ponderados por participación)
     Y la carga del proceso se mide con la fórmula oficial (Decreto 1082/2015):
       CRPC = (Presupuesto − Anticipo); si plazo > 12 meses, × 12 / plazo.
   · Tope estratégico por cuantía (apetito de riesgo, no límite del RUP):
     Helder ~4.000 SMMLV · Génesis ~2.000 · consorcio ~11.000.

   rup_valido(l, perfilId) → true si:
     a. Alguna clase UNSPSC (8 dígitos) de la licitación está en el RUP del
        perfil; si la licitación NO declara UNSPSC, mapeo textual tolerante
        (WHITELIST_OBRA sobre nombre+descripción). La BLACKLIST semántica
        excluye siempre (caninos, PAE, dotación… nada de eso está en los RUP).
     b. La cuantía no supera el K del perfil: CRPC ≤ CRP y además
        presupuesto ≤ tope estratégico en SMMLV.
   ========================================================================== */
"use strict";

const { UNSPSC_HELDER, UNSPSC_GENESIS } = require("./unspsc.js");
const { BLACKLIST_OBJETO, WHITELIST_OBRA } = require("./semantica.js");

const SMMLV = 1750905; // SMMLV 2026 (decreto del Gobierno Nacional)
const MARGIN_MULTIPLIER = 16.7; // ingreso ≈ utilidad operacional / 6 % de margen

/* ---------- perfiles (datos reales de los RUP) ---------- */
const PERFILES = {
  helder: {
    id: "helder",
    nombre: "Helder Gustavo Rodríguez Santana",
    rol: "Persona natural · Ing. Civil · Purificación (Tolima)",
    liquidez: 129.12, endeudamiento: 0.04, patrimonio: 1107252964,
    utilidadOp: 198810000,
    expSMMLV: 6768.87,      // mayor contrato acreditado (Consorcio Infra. Boyacá)
    profesionales: 1,       // persona natural: él mismo
    topeSMMLV: 4000,
    unspsc: new Set(UNSPSC_HELDER),
    sce: [ // contratos en ejecución (saldos comprometen capacidad)
      { v: 443141528, pct: 60, plazoMeses: 12, restanMeses: 8, obra: true },
      { v: 379500000, pct: 100, plazoMeses: 8, restanMeses: 4, obra: false },
    ],
  },
  genesis: {
    id: "genesis",
    nombre: "Génesis Ingeniería y Construcción GIC SAS",
    rol: "Persona jurídica · SAS · Ibagué",
    liquidez: 6.98, endeudamiento: 0.13, patrimonio: 211340888,
    utilidadOp: 150244977,
    expSMMLV: 31593.88,
    profesionales: 3,
    topeSMMLV: 2000,
    unspsc: new Set(UNSPSC_GENESIS),
    sce: [],
  },
  juntos: {
    id: "juntos",
    nombre: "Helder + Génesis · Consorcio / Unión Temporal",
    rol: "Figura asociativa",
    liquidez: 6.98, endeudamiento: 0.13, patrimonio: 1318593852,
    utilidadOp: 349054977,  // suma de utilidades operacionales
    expSMMLV: 38362.75,     // suma de mayores contratos acreditados
    profesionales: 4,
    topeSMMLV: 11000,
    unspsc: new Set([...UNSPSC_HELDER, ...UNSPSC_GENESIS]), // 393 clases
    sce: [
      { v: 443141528, pct: 60, plazoMeses: 12, restanMeses: 8, obra: true },
    ],
  },
};
// CO (ingreso operacional) estimado — el RUP solo trae la utilidad.
for (const p of Object.values(PERFILES)) p.co = Math.round(p.utilidadOp * MARGIN_MULTIPLIER);

/* ---------- factores de la Guía CCE-EICP-GI-22 ---------- */
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
  if (!presupuestoSMMLV) return 120;
  const r = expSMMLV / presupuestoSMMLV;
  if (r >= 3) return 120;
  if (r >= 2) return 100;
  if (r >= 1) return 80;
  return 60;
}
function calcSCE(sceList) {
  let total = 0;
  for (const c of sceList || []) {
    if (!c.obra) continue; // solo obra compromete capacidad residual de obra
    const saldo = (c.v || 0) * ((c.pct || 100) / 100);
    const meses = Math.min(c.restanMeses || 0, 12);
    total += (c.plazoMeses ? saldo * meses / c.plazoMeses : saldo);
  }
  return total;
}

/* K de contratación (capacidad residual CRP) del perfil frente a un
   presupuesto dado. Depende del presupuesto por el factor de experiencia E. */
function kContratacion(perfil, presupuestoCOP) {
  const presupuestoSMMLV = (presupuestoCOP || 0) / SMMLV;
  const cf = factorCF(perfil.liquidez);
  const ct = factorCT(perfil.profesionales);
  const e = factorE(perfil.expSMMLV, presupuestoSMMLV);
  const sce = calcSCE(perfil.sce);
  return Math.max(perfil.co * (e + ct + cf) / 100 - sce, 0);
}

/* Carga real del proceso — fórmula oficial art. 2.2.1.1.1.6.4 D.1082/2015:
   CRPC = Presupuesto − Anticipo; si el plazo > 12 meses, proporción lineal. */
function calcCRPC(presupuestoCOP, anticipoPct, plazoMeses) {
  const base = presupuestoCOP - presupuestoCOP * (anticipoPct || 0) / 100;
  if (!plazoMeses || plazoMeses <= 12) return base;
  return base * 12 / plazoMeses;
}

/* ---------- lectura tolerante de la licitación ---------- */
const norm = (s) => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/* Clases UNSPSC de 8 dígitos declaradas ("V1.72141000" → "72141000"). */
function unspscClasesDe(lic) {
  const crudo = `${lic.codigo_principal_de_categoria || ""} ${lic.categorias_adicionales || ""}`;
  return [...new Set((crudo.match(/\d{8}/g) || []))];
}

/* Plazo en meses desde duracion + unidad_de_duracion (acentos normalizados —
   el bug histórico: "Días".includes("dia") era false por la í). Default 12. */
function plazoMesesDe(lic) {
  const n = parseFloat(lic.duracion);
  if (isNaN(n) || n <= 0) return 12;
  const u = norm(lic.unidad_de_duracion || "meses");
  if (u.includes("dia")) return n / 30;
  if (u.includes("seman")) return n / 4.33;
  if (u.includes("hora")) return n / 720;
  if (u.includes("an")) return n * 12; // años
  return n; // meses
}

function presupuestoDe(lic) {
  // cuantia_cop lo deja lib/negocio si la licitación ya está enriquecida
  const n = parseFloat(lic.cuantia_cop ?? lic.precio_base ?? lic.valor_total ?? lic.cuantia_definitiva);
  return isNaN(n) ? 0 : n;
}

/* ---------- validación por perfil ---------- */
function evaluarRup(lic, perfilId) {
  const perfil = Object.prototype.hasOwnProperty.call(PERFILES, perfilId) ? PERFILES[perfilId] : null;
  if (!perfil) return { ok: false, motivo: "perfil desconocido" };

  const texto = `${lic.nombre_del_procedimiento || ""} ${lic.descripci_n_del_procedimiento || ""}`;
  if (BLACKLIST_OBJETO.test(texto)) return { ok: false, motivo: "objeto fuera de los RUP (blacklist semántica)" };

  const clases = unspscClasesDe(lic);
  let unspsc_ok, fuente_unspsc;
  if (clases.length) {
    unspsc_ok = clases.some((c) => perfil.unspsc.has(c));
    fuente_unspsc = "codigo";
  } else {
    // sin UNSPSC declarado: mapeo textual tolerante por vocabulario de obra
    unspsc_ok = WHITELIST_OBRA.test(texto);
    fuente_unspsc = "texto";
  }

  const presupuesto = presupuestoDe(lic);
  const k_cop = kContratacion(perfil, presupuesto);
  const crpc = calcCRPC(presupuesto, lic.anticipo_pct || 0, plazoMesesDe(lic));
  const dentroDeK = crpc <= k_cop;
  const dentroDeTope = presupuesto <= perfil.topeSMMLV * SMMLV;
  const capacidad_ok = dentroDeK && dentroDeTope;

  return {
    ok: unspsc_ok && capacidad_ok,
    unspsc_ok, fuente_unspsc, capacidad_ok,
    k_cop: Math.round(k_cop), crpc_cop: Math.round(crpc),
    tope_cop: perfil.topeSMMLV * SMMLV,
    motivo: !unspsc_ok ? (fuente_unspsc === "codigo" ? "UNSPSC fuera del RUP" : "sin UNSPSC y el objeto no es obra civil")
      : !dentroDeTope ? "cuantía sobre el tope estratégico"
      : !dentroDeK ? "cuantía sobre el K de contratación (CRPC > CRP)"
      : null,
  };
}

function rup_valido(lic, perfilId) { return evaluarRup(lic, perfilId).ok; }

/* Prefiltro de compatibilidad usado por /api/sync: ¿puede interesarle a
   ALGÚN perfil por objeto/UNSPSC? (la cuantía NO entra aquí: es dinámica por
   perfil y se decide en la consulta). Guardar solo lo compatible reduce el
   corpus de ~500k filas/año a unas decenas de miles: menos Redis, menos
   ancho de banda y consultas en frío rápidas. Si cambian los RUP, relanzar
   /api/sync?modo=full. */
function compatibleConAlgunPerfil(lic) {
  const texto = `${lic.nombre_del_procedimiento || ""} ${lic.descripci_n_del_procedimiento || ""}`;
  if (BLACKLIST_OBJETO.test(texto)) return false;
  const clases = unspscClasesDe(lic);
  if (clases.length) return clases.some((c) => PERFILES.juntos.unspsc.has(c));
  return WHITELIST_OBRA.test(texto);
}

module.exports = {
  PERFILES, SMMLV, MARGIN_MULTIPLIER,
  rup_valido, evaluarRup, compatibleConAlgunPerfil,
  kContratacion, calcCRPC, unspscClasesDe, plazoMesesDe,
  factorCF, factorCT, factorE, calcSCE,
};
