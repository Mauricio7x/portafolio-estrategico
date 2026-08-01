/* ============================================================================
   lib/rup · Validación RUP por perfil → rup_valido(licitacion, perfil)
   ----------------------------------------------------------------------------
   Orquestador delgado sobre las fuentes únicas:
     lib/perfiles.js  → datos de los tres perfiles (RUP corte 31/12/2025)
     lib/unspsc.js    → whitelists + matching jerárquico por niveles
     lib/capacidad.js → K de contratación (CRP/CRPC, Guía CCE-EICP-GI-22)
     lib/filtros.js   → cascada del objeto (convenio, blacklist, UNSPSC,
                        equivalencias, texto, pertinencia, anti-suministro)

   rup_valido(l, perfilId, conocimiento) → true si:
     a. El OBJETO es del perfil: el matching UNSPSC da un tier distinto de
        "ninguno" (clase / familia / equivalente / texto), el objeto es
        PERTINENTE (obra, infraestructura o consultoría) y no es una compra
        pura disfrazada.
     b. La CAPACIDAD alcanza: CRPC ≤ CRP y presupuesto ≤ tope estratégico.

   `conocimiento` = {equivalencias, vocabulario} aprendidos del corpus
   histórico. Es OPCIONAL: sin él, las capas 6 y 7 de la cascada no disparan y
   todo lo demás funciona igual.
   `opciones` = {incluirTextoDebil} — abre la ruta de texto sin pertinencia
   verde (el toggle «Incluir procesos sin código UNSPSC» de la UI).

   compatibleConAlgunPerfil(l) queda como ALIAS de filtros.admisibleParaIngesta
   para no romper llamadas antiguas. Desde jul 2026 la ingesta no juzga por
   perfil: guarda ancho y el juicio corre al servir (ver lib/filtros).
   ========================================================================== */
"use strict";

const { PERFILES, ALIAS_PERFIL, SMMLV } = require("./perfiles.js");
const {
  MARGIN_MULTIPLIER, crp, calcCRPC, plazoMesesDe,
  factorCF, factorCT, factorE, calcSCE, coEstimado,
} = require("./capacidad.js");
const { evaluarObjeto, unspscClasesDe, admisibleParaIngesta } = require("./filtros.js");

function presupuestoDe(lic) {
  // cuantia_cop lo deja lib/negocio si la licitación ya está enriquecida
  const n = parseFloat(lic.cuantia_cop ?? lic.precio_base ?? lic.valor_total ?? lic.cuantia_definitiva);
  return isNaN(n) ? 0 : n;
}

/* ---------- validación por perfil ---------- */
function evaluarRup(lic, perfilId, conocimiento, opciones) {
  const perfil = Object.prototype.hasOwnProperty.call(PERFILES, perfilId) ? PERFILES[perfilId] : null;
  if (!perfil) return { ok: false, motivo: "perfil desconocido" };

  const objeto = evaluarObjeto(lic, perfil, conocimiento, opciones);

  const presupuesto = presupuestoDe(lic);
  const k_cop = crp(perfil, presupuesto);
  const crpc = calcCRPC(presupuesto, lic.anticipo_pct || 0, plazoMesesDe(lic));
  const dentroDeK = crpc <= k_cop;
  const dentroDeTope = presupuesto <= perfil.topeSMMLV * SMMLV;
  const capacidad_ok = dentroDeK && dentroDeTope;

  return {
    ok: objeto.ok && capacidad_ok,
    // veredicto GRADUADO del objeto: tier del matching + pertinencia. Nunca
    // un booleano suelto — es lo que la tarjeta enseña para poder decidir.
    tier: objeto.tier,
    unspsc: objeto.unspsc,
    pertinencia: objeto.pertinencia,
    paso: objeto.paso,
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

function rup_valido(lic, perfilId, conocimiento, opciones) { return evaluarRup(lic, perfilId, conocimiento, opciones).ok; }

/* Alias histórico del prefiltro de ingesta (ver lib/filtros.admisibleParaIngesta).
   Ya NO evalúa el RUP: la ingesta guarda ancho y el juicio corre al servir. */
const compatibleConAlgunPerfil = admisibleParaIngesta;

module.exports = {
  PERFILES, ALIAS_PERFIL, SMMLV, MARGIN_MULTIPLIER,
  rup_valido, evaluarRup, compatibleConAlgunPerfil, admisibleParaIngesta,
  // reexportados para pruebas y compatibilidad (fórmula única en lib/capacidad)
  kContratacion: crp, calcCRPC, unspscClasesDe, plazoMesesDe,
  factorCF, factorCT, factorE, calcSCE,
};
