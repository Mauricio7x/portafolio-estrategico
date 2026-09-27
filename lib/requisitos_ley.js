/* ============================================================================
   lib/requisitos_ley · Qué requisito pide la LEY según el tipo de contrato y la modalidad
   ----------------------------------------------------------------------------
   UNA SOLA PREGUNTA, UNA SOLA REGLA (27-sep-2026, N19 + N06 de
   docs/INVESTIGACION_LICITANTE.md): «¿este requisito aplica a este tipo de
   contrato y a esta modalidad?». Antes cada módulo lo daba por hecho: la
   capacidad residual se exigía a una interventoría igual que a una obra (con el
   filtro por defecto esos procesos ni se veían) y la guía pedía el registro de
   proponente en mínima cuantía, que la ley no exige. Tres parches habrían sido
   tres respuestas distintas a la misma pregunta; aquí hay una y la llaman todos
   (lib/rup, lib/puertas, lib/filtros, lib/guia_proceso, lib/reparto por sus
   llamadores, lib/dictamen).

   LA CAPACIDAD RESIDUAL, con orden explícito (el primero que casa decide):
     1. régimen especial            → null  (manda el manual de la entidad)
     2. modalidad sin registro      → null  (mínima cuantía, contratación directa:
                                             la capacidad se acredita con el
                                             registro y la invitación dice qué pide)
     3. tipo de contrato «Obra»     → true  (Decreto 1082 de 2015, art. 2.2.1.1.1.6.4)
     4. interventoría, consultoría  → false (la Guía CCE-EICP-GI-22: «únicamente es
                                             exigido para los contratos de obra pública»)
     5. concurso de méritos         → false (es la modalidad de los consultores)
     6. tipo sin dato u otro tipo   → null
   `null` NO es «no se pide»: es «no consta». En oportunidades el falso caro es
   ESCONDER, así que null nunca cierra una puerta: si la capacidad no alcanza,
   pasa con advertencia y manda a confirmarlo en el pliego. Un dato PUBLICADO
   (el tipo de contrato) gana a uno calculado: no se adivina la obra por el texto.

   EL REGISTRO DE PROPONENTE, declarado por modalidad con su fuente: la ley lo
   pide en todas salvo las excepciones del art. 6 de la Ley 1150 de 2007 (texto
   vigente, modificado por el art. 221 del Decreto Ley 19 de 2012), que nombran
   la mínima cuantía y la contratación directa. Régimen especial y modalidad
   desconocida: null. La pertinencia del OBJETO (¿es obra?) no se toca: solo
   cambia lo que el código del registro puede decidir.

   Capa PURA, sin red. La modalidad la clasifica `lib/filtros_lista.modalidadDe`
   (la regla que ya existe se LLAMA, con require diferido: filtros_lista carga
   lib/filtros, que llama a este módulo).
   ========================================================================== */
"use strict";

const { norm } = require("./semantica.js");

const FUENTE = Object.freeze({
  registro: "Ley 1150 de 2007, art. 6, modificado por el art. 221 del Decreto Ley 19 de 2012",
  capacidad: "Decreto 1082 de 2015, art. 2.2.1.1.1.6.4, y Guía CCE-EICP-GI-22 de Colombia Compra Eficiente",
  concurso: "Ley 1150 de 2007, art. 2, num. 3, modificado por el art. 219 del Decreto Ley 19 de 2012",
  minima: "Decreto 1082 de 2015, art. 2.2.1.2.1.5.2, modificado por el art. 2 del Decreto 1860 de 2021",
});

/* La frase de la mínima cuantía, UNA sola redacción: la dicen la puerta del
   registro, la tarjeta (vía `p1_rup.mensaje`) y la guía del proceso. */
const FRASE_REGISTRO_MINIMA = "En mínima cuantía la ley no exige registro de proponente; revise en la invitación qué experiencia o códigos pide.";
/* Lo que se hace con un «no consta»: confirmarlo, nunca descartarse por él. */
const FRASE_CONFIRME_CAPACIDAD = "Confirme en el pliego si pide capacidad de contratación antes de descartarlo.";

/* Cada modalidad (las claves de `modalidadDe`) declara si la ley pide el registro,
   con su fuente; `frase` es lo que se le dice al usuario cuando NO lo pide.
   Una clave que no esté aquí se trata como «otra»: inerte, jamás una excepción. */
/* `frase_objeto_dudoso`: cuando el código no casa y el objeto tampoco dice que sea una
   obra, lo que se dice ya no es «el código no está inscrito» (no importa aquí) sino eso. */
const pide = (valor, fuente, motivo = null, frase = null, fraseObjetoDudoso = null) => Object.freeze({ pide: valor, fuente, motivo, frase, frase_objeto_dudoso: fraseObjetoDudoso });
const REGISTRO_POR_MODALIDAD = Object.freeze({
  licitacion: pide(true, FUENTE.registro),
  abreviada: pide(true, FUENTE.registro),
  subasta: pide(true, FUENTE.registro),
  meritos: pide(true, FUENTE.registro),
  minima: pide(false, FUENTE.registro, "la ley no exige registro de proponente en los contratos de mínima cuantía", FRASE_REGISTRO_MINIMA,
    "En mínima cuantía la ley no exige registro de proponente, pero el objeto no dice que sea una obra: revise la invitación antes de contar con este proceso."),
  directa: pide(false, FUENTE.registro, "la ley no exige registro de proponente en la contratación directa",
    "En contratación directa la ley no exige registro de proponente; revise en la invitación qué experiencia o códigos pide.",
    "En contratación directa la ley no exige registro de proponente, pero el objeto no dice que sea una obra: revise la invitación antes de contar con este proceso."),
  especial: pide(null, null, "la entidad contrata con su propio manual (régimen especial), que decide qué pide"),
  otra: pide(null, null, "la modalidad no se publica o no se reconoce"),
});

function modalidadClave(lic) {
  const { modalidadDe } = require("./filtros_lista.js"); // diferido: ver cabecera
  return modalidadDe(lic || {});
}

function registroDe(clave) {
  return REGISTRO_POR_MODALIDAD[clave] || REGISTRO_POR_MODALIDAD.otra;
}

function capacidadDe(lic, clave, registro) {
  const tipoLiteral = String((lic && lic.tipo_de_contrato) || "").trim();
  const tipo = norm(tipoLiteral);
  const r = (exigida, motivo, nota, fuente) => ({ exigida, motivo, nota, fuente });
  if (clave === "especial") {
    return r(null, "regimen_especial", "La entidad contrata con su propio manual (régimen especial), que decide si pide capacidad de contratación.", null);
  }
  if (registro.pide === false) {
    return clave === "minima"
      ? r(null, "minima_cuantia", "En mínima cuantía no se exige registro de proponente, y la invitación dice qué capacidad pide.", FUENTE.minima)
      : r(null, "sin_registro", "En esta modalidad no se exige registro de proponente, y la invitación dice qué capacidad pide.", FUENTE.registro);
  }
  if (tipo === "obra") return r(true, "obra", null, FUENTE.capacidad);
  if (tipo === "interventoria") {
    return r(false, "interventoria", "En interventoría la ley no pide capacidad de contratación: solo se exige en contratos de obra.", FUENTE.capacidad);
  }
  if (tipo === "consultoria") {
    return r(false, "consultoria", "En consultoría la ley no pide capacidad de contratación: solo se exige en contratos de obra.", FUENTE.capacidad);
  }
  if (clave === "meritos") {
    return r(false, "concurso_de_meritos", "Un concurso de méritos es para consultoría o interventoría, y ahí la ley no pide capacidad de contratación: solo se exige en contratos de obra.", `${FUENTE.concurso}; ${FUENTE.capacidad}`);
  }
  if (!tipo || tipo === "no definido" || tipo === "no especificado") {
    return r(null, "tipo_sin_dato", "SECOP II no publica el tipo de contrato de este proceso, y la capacidad de contratación solo se exige en obra.", FUENTE.capacidad);
  }
  return r(null, "tipo_no_obra", `El contrato se publicó como «${tipoLiteral}», y la capacidad de contratación solo se exige en obra.`, FUENTE.capacidad);
}

/* ── la regla: qué pide la ley para ESTE proceso ─────────────────────────────
   → { modalidad, registro: {pide, fuente, motivo}, capacidad: {exigida, motivo, nota, fuente} }
   `pide` / `exigida`: true | false | null (no consta). */
function requisitosQueAplican(lic) {
  const clave = modalidadClave(lic);
  const registro = registroDe(clave);
  return { modalidad: clave, registro, capacidad: capacidadDe(lic, clave, registro) };
}

/* La nota con su norma, UNA redacción para la puerta, la respuesta sin credencial
   y la guía: «… solo se exige en contratos de obra (Decreto 1082 de 2015, …).» */
function notaConFuente(x) {
  if (!x || !x.nota) return null;
  return x.fuente ? `${String(x.nota).replace(/\.\s*$/, "")} (${x.fuente}).` : x.nota;
}

module.exports = {
  requisitosQueAplican, notaConFuente,
  REGISTRO_POR_MODALIDAD, FUENTE,
  FRASE_REGISTRO_MINIMA, FRASE_CONFIRME_CAPACIDAD,
};
