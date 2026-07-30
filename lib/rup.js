/* ============================================================================
   lib/rup · Validación RUP por perfil → rup_valido(licitacion, perfil)
   ----------------------------------------------------------------------------
   Orquestador delgado sobre las fuentes únicas:
     lib/perfiles.js  → datos de los tres perfiles (RUP corte 31/12/2025)
     lib/unspsc.js    → whitelists UNSPSC (193 Helder · 343 Génesis · 393 unión)
     lib/capacidad.js → K de contratación (CRP/CRPC, Guía CCE-EICP-GI-22)
     lib/filtros.js   → objeto válido (blacklist, whitelist obra, anti-suministro)

   rup_valido(l, perfilId) → true si:
     a. El OBJETO es del perfil: alguna clase UNSPSC del proceso está en su
        RUP (o mapeo textual de obra si no declara UNSPSC), sin blacklist y
        sin caer en la capa anti-suministro (compra pura de bienes).
     b. La CAPACIDAD alcanza: CRPC ≤ CRP y presupuesto ≤ tope estratégico.

   compatibleConAlgunPerfil(l): prefiltro de /api/sync — ¿el objeto le sirve
   a ALGÚN perfil (unión de ambos RUP)? La cuantía NO entra aquí (es dinámica
   por perfil y se decide en la consulta); modalidad y estado tampoco (los
   aplica api/sync directamente, porque el delta debe conservar cerradas para
   que el reemplazo por :updated_at funcione — ver api/sync.js).
   ========================================================================== */
"use strict";

const { PERFILES, ALIAS_PERFIL, SMMLV } = require("./perfiles.js");
const {
  MARGIN_MULTIPLIER, crp, calcCRPC, plazoMesesDe,
  factorCF, factorCT, factorE, calcSCE, coEstimado,
} = require("./capacidad.js");
const { evaluarObjeto, unspscClasesDe } = require("./filtros.js");

function presupuestoDe(lic) {
  // cuantia_cop lo deja lib/negocio si la licitación ya está enriquecida
  const n = parseFloat(lic.cuantia_cop ?? lic.precio_base ?? lic.valor_total ?? lic.cuantia_definitiva);
  return isNaN(n) ? 0 : n;
}

/* ---------- validación por perfil ---------- */
function evaluarRup(lic, perfilId) {
  const perfil = Object.prototype.hasOwnProperty.call(PERFILES, perfilId) ? PERFILES[perfilId] : null;
  if (!perfil) return { ok: false, motivo: "perfil desconocido" };

  const objeto = evaluarObjeto(lic, perfil);

  const presupuesto = presupuestoDe(lic);
  const k_cop = crp(perfil, presupuesto);
  const crpc = calcCRPC(presupuesto, lic.anticipo_pct || 0, plazoMesesDe(lic));
  const dentroDeK = crpc <= k_cop;
  const dentroDeTope = presupuesto <= perfil.topeSMMLV * SMMLV;
  const capacidad_ok = dentroDeK && dentroDeTope;

  return {
    ok: objeto.ok && capacidad_ok,
    unspsc_ok: objeto.unspsc_ok, fuente_unspsc: objeto.fuente_unspsc,
    anti_suministro: objeto.anti_suministro,
    capacidad_ok,
    k_cop: Math.round(k_cop), crpc_cop: Math.round(crpc),
    tope_cop: perfil.topeSMMLV * SMMLV,
    co_estimado: coEstimado(perfil), // la UI lo señala: K sobre CO estimado
    motivo: !objeto.ok ? objeto.motivo
      : !dentroDeTope ? "cuantía sobre el tope estratégico"
      : !dentroDeK ? "cuantía sobre el K de contratación (CRPC > CRP)"
      : null,
  };
}

function rup_valido(lic, perfilId) { return evaluarRup(lic, perfilId).ok; }

/* Prefiltro de compatibilidad usado por /api/sync: ¿puede interesarle a
   ALGÚN perfil por objeto/UNSPSC? Guardar solo lo compatible reduce el
   corpus de ~500k filas/año a unas decenas de miles. Si cambian los RUP,
   relanzar /api/sync?modo=full. Incluye la capa anti-suministro (los
   suministros puros se descartan en origen). */
function compatibleConAlgunPerfil(lic) {
  return evaluarObjeto(lic, PERFILES.juntos).ok;
}

module.exports = {
  PERFILES, ALIAS_PERFIL, SMMLV, MARGIN_MULTIPLIER,
  rup_valido, evaluarRup, compatibleConAlgunPerfil,
  // reexportados para pruebas y compatibilidad (fórmula única en lib/capacidad)
  kContratacion: crp, calcCRPC, unspscClasesDe, plazoMesesDe,
  factorCF, factorCT, factorE, calcSCE,
};
