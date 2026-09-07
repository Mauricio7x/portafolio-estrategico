/* lib/presupuesto.js · El reloj de una tanda REANUDABLE (7-sep-2026)
   ─────────────────────────────────────────────────────────────────────────────
   Una tanda reanudable —la carga completa, el delta, el histórico y los cuatro
   constructores de derivados— trabaja con un presupuesto por invocación: cuando
   se acaba, guarda el cursor, responde `done:false` y la invocación siguiente
   sigue donde quedó. Toda la cadena descansa en una propiedad que nadie había
   escrito:

     **UNA INVOCACIÓN NUNCA RINDE SU PRESUPUESTO SIN HABER AVANZADO NADA.**

   Sin ella, la cadena no converge. El defecto, medido el 7-sep-2026: los siete
   bucles preguntaban `Date.now() - t0 > presupuestoMs` ANTES de traer la primera
   página, así que en una máquina donde la preparación (leer el progreso, el
   manifiesto, el candado) cuesta más que el presupuesto, cada invocación
   devolvía cero páginas y la siguiente repetía el cuadro. Lo cazó la suite en
   GitHub Actions —corredor más lento que la del desarrollo— con «la extracción
   histórica no converge» tras 400 invocaciones de 200 ms, mientras en local
   pasaba: el fallo era del RELOJ, no del corredor, y en producción deja quieta
   igual a cualquier invocación cuyo presupuesto se consuma en la preparación.

   El precio de la garantía es acotado y conocido: una invocación puede pasarse
   de su presupuesto lo que tarde UNA unidad de trabajo (una página, un mes), que
   es lo que el tope por intento de `lib/socrata` ya limita. Pasarse una vez es
   barato; no terminar nunca, no.

   Se usa así, y esta es la ÚNICA forma admitida (la suite censa que ningún
   módulo de `lib/` vuelva a escribir la comparación a mano):

     const tanda = relojDeTanda(t0, presupuestoMs);
     while (queda trabajo) {
       if (tanda.agotado()) { …guardar cursor…; return { done: false, … }; }
       …una unidad de trabajo…
       tanda.avanzo();
     }

   `avanzo()` se llama cuando la unidad ya está HECHA, no al empezarla: marcar
   antes convertiría un intento fallido en «progreso» y devolvería el estanque. */
"use strict";

function relojDeTanda(t0, presupuestoMs, { ahora = Date.now } = {}) {
  let avanzada = false;
  return {
    /* La unidad de trabajo terminó: a partir de aquí la tanda puede rendirse. */
    avanzo() { avanzada = true; },
    /* ¿Rendir el presupuesto? Solo si ya se avanzó algo en ESTA invocación. */
    agotado() { return avanzada && ahora() - t0 > presupuestoMs; },
    /* Para quien quiera decir por qué se rindió (o por qué no). */
    haAvanzado() { return avanzada; },
  };
}

module.exports = { relojDeTanda };
