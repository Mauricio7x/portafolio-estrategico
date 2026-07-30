/* ============================================================================
   lib/perfiles · FUENTE ÚNICA DE VERDAD de los tres perfiles del negocio
   ----------------------------------------------------------------------------
   Datos REALES de los RUP (corte 31/12/2025; certificados en firmeza al
   07/05/2026), extraídos del index.html histórico del repositorio — aquí no
   hay placeholders ni datos inventados. Todo lo que la app sabe de Helder,
   Génesis y el consorcio sale de este archivo; nadie más duplica estas cifras.

   Notas de datos (limitaciones honestas, no supuestos silenciosos):
   · NIT: los archivos del repositorio NO transcriben el NIT de ninguno de los
     dos proponentes. Queda en null a propósito — completar desde el
     certificado RUP real; JAMÁS inventarlo.
   · Génesis Ingeniería y Construcción GIC SAS es PERSONA JURÍDICA (SAS),
     matriculada en Ibagué. (El error histórico de tratarla como persona
     natural queda corregido aquí, en la fuente.)
   · profesionales (insumo del factor CT): Helder = 1 (persona natural: él
     mismo, Ing. Civil — el histórico lo corrigió de 11 a 1). Génesis = 3
     (socios + profesionales de planta, "estimado conservador" según el
     histórico). Si la planta real de Génesis fuera ≥6, el factor CT subiría
     de 20 a 30 — CONFIRMAR con el dueño antes de cambiarlo.
   · ingresoOp: el RUP no reporta el ingreso operacional → null. Cuando es
     null, lib/capacidad.js ESTIMA CO = utilidadOp × 16.7 (margen típico de
     obra civil ≈ 6 %) y lo marca como estimación en logs y en la UI.
   · sce: contratos en ejecución que comprometen capacidad residual. Génesis
     no registra ninguno en el repositorio → lista vacía (lib/capacidad.js
     asume SCE = 0 y lo advierte en logs).

   Consorcio (perfil "juntos", alias "consorcio" en la API):
   · Indicadores financieros PONDERADOS por % de participación — exigencia de
     la Guía CCE / práctica del D.1082/2015 para proponentes plurales. El
     repositorio no fija participación → se asume 50/50 y se DOCUMENTA. Los
     ponderados se calculan aquí a partir de los integrantes (no se copian).
   · La capacidad residual (K) del plural NO usa estos ponderados: es la SUMA
     de las CRP de los integrantes (Guía CCE-EICP-GI-22) — ver lib/capacidad.js.
   · experiencia (expSMMLV) y profesionales del plural: suma de integrantes.
   ========================================================================== */
"use strict";

const { UNSPSC_HELDER, UNSPSC_GENESIS, UNSPSC_JUNTOS } = require("./unspsc.js");

const SMMLV = 1750905; // SMMLV 2026 (decreto del Gobierno Nacional)

const HELDER = {
  id: "helder",
  nombre: "Helder Gustavo Rodríguez Santana",
  naturaleza: "Persona natural",
  nit: null, // no consta en el repositorio — completar del certificado RUP
  rol: "Persona natural · Ing. Civil · Purificación (Tolima)",
  liquidez: 129.12, endeudamiento: 0.04, patrimonio: 1107252964,
  utilidadOp: 198810000,
  ingresoOp: null,        // el RUP no lo reporta → CO se estima (ver capacidad)
  expSMMLV: 6768.87,      // mayor contrato acreditado (Consorcio Infra. Boyacá)
  profesionales: 1,       // persona natural: él mismo (histórico: corregido de 11)
  topeSMMLV: 4000,        // apetito estratégico, no límite del RUP
  unspsc: new Set(UNSPSC_HELDER),
  sce: [ // contratos en ejecución (saldo × % participación compromete capacidad)
    { v: 443141528, pct: 60, plazoMeses: 12, restanMeses: 8, obra: true },
    { v: 379500000, pct: 100, plazoMeses: 8, restanMeses: 4, obra: false },
  ],
};

const GENESIS = {
  id: "genesis",
  nombre: "Génesis Ingeniería y Construcción GIC SAS",
  naturaleza: "Persona jurídica (SAS)",
  nit: null, // no consta en el repositorio — completar del certificado RUP
  rol: "Persona jurídica · SAS · Ibagué",
  liquidez: 6.98, endeudamiento: 0.13, patrimonio: 211340888,
  utilidadOp: 150244977,
  ingresoOp: null,
  expSMMLV: 31593.88,
  profesionales: 3,       // socios + planta, estimado conservador (ver cabecera)
  topeSMMLV: 2000,
  unspsc: new Set(UNSPSC_GENESIS),
  sce: [], // sin contratos en ejecución registrados → SCE = 0 (se advierte en logs)
};

/* ---------- consorcio: integrantes + ponderación 50/50 documentada ---------- */
const INTEGRANTES = [
  { perfil: HELDER, participacion: 0.5 },
  { perfil: GENESIS, participacion: 0.5 },
];
// Σ (indicador_i × participación_i): ponderación de indicadores habilitantes
// para proponentes plurales. 50/50 ASUMIDO (el repositorio no fija otra cosa).
const ponderado = (campo) =>
  INTEGRANTES.reduce((acc, i) => acc + i.perfil[campo] * i.participacion, 0);

const JUNTOS = {
  id: "juntos",
  nombre: "Helder + Génesis · Consorcio / Unión Temporal",
  naturaleza: "Proponente plural (figura asociativa)",
  nit: null, // el consorcio no existe aún como figura registrada
  rol: "Figura asociativa · participación asumida 50/50",
  integrantes: INTEGRANTES,
  // indicadores habilitantes ponderados por participación (calculados, no copiados)
  liquidez: ponderado("liquidez"),
  endeudamiento: ponderado("endeudamiento"),
  patrimonio: Math.round(ponderado("patrimonio")),
  utilidadOp: Math.round(ponderado("utilidadOp")),
  ingresoOp: null,
  // experiencia y equipo del plural: suma de los integrantes
  expSMMLV: HELDER.expSMMLV + GENESIS.expSMMLV,           // 38 362,75
  profesionales: HELDER.profesionales + GENESIS.profesionales, // 4
  topeSMMLV: 11000,
  unspsc: new Set(UNSPSC_JUNTOS), // 393 clases: unión calculada de ambos RUP
  sce: [], // la K del plural suma las CRP de los integrantes (cada una ya
           // descuenta su propio SCE) — no duplicar saldos aquí
};

const PERFILES = { helder: HELDER, genesis: GENESIS, juntos: JUNTOS };

// Alias aceptados por la API (?perfil=…) → id canónico del perfil.
const ALIAS_PERFIL = { consorcio: "juntos" };

module.exports = { PERFILES, ALIAS_PERFIL, SMMLV };
