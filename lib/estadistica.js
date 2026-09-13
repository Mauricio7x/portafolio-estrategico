/* ============================================================================
   lib/estadistica · La ÚNICA mediana de la aplicación
   ----------------------------------------------------------------------------
   Vivían cinco copias de la mediana (`lib/apu/precios`, `lib/apu/invias`,
   `lib/apu/invias_items`, `lib/ejecucion` y —disfrazada de percentil— la baja
   de `lib/columnas_historicas`), y para el 12-sep-2026 ya DIVERGÍAN: la misma
   entrada [10,001; 10,002] devolvía 10 · 10 · 10,0015 · 10,0015 · 10,002, y
   [1; 2] devolvía 1,5 en cuatro y 2 en la quinta. Es exactamente lo que la
   regla «no reescribir una regla que ya existe: llamarla» describe: dos
   cálculos «equivalentes hoy» divergen a la primera corrección.

   Tres cosas que esta función deja fijadas, y por qué cada una:

   1. NO SE REDONDEA AL CALCULAR. `precios` e `invias` promediaban el par
      central y lo redondeaban a 2 decimales ahí mismo. Una cifra redondeada
      para MOSTRAR no puede DECIDIR: en el banco INVIAS, redondear la mediana
      del agua del Tolima ANTES de convertirla a m³ (× 1000) publicaba
      $120.170/m³ donde la mediana vale $120.165/m³ — cinco pesos de más por
      redondear demasiado pronto. Quien muestre, que redondee al mostrar.

   2. LO NO FINITO SE DESCARTA, Y SI NO QUEDA NADA LA RESPUESTA ES `null`.
      Cuatro de las cinco copias devolvían `NaN` con un valor ilegible en la
      lista, y una devolvía `NaN` con la lista vacía. `NaN` es PEOR que un 0
      creíble: toda comparación con él es false y pasa MUDO por las guardas,
      que es la misma trampa que «`null >= 1` es false, no sin dato». Una lista
      sin valores legibles es «sin dato»: `null`.

   3. EL PAR CENTRAL SE PROMEDIA. La baja de mercado de `columnas_historicas`
      usaba `percentil(ratios, 0.5)` —rango MÁS CERCANO, `Math.round((n−1)·p)`—
      que en conjuntos pares devuelve el elemento SUPERIOR: con dos procesos al
      0,80 y al 0,90 publicaba una baja del 10 % donde la mediana dice 15 %.
      `percentil` sigue existiendo allí y sigue siendo rango más cercano —es una
      definición legítima para p25 y p75—; lo que se corrigió es su USO como
      mediana.

   Sin dependencias a propósito: es una hoja, así que cualquier módulo puede
   llamarla sin arrastrar nada ni cerrar un ciclo.
   ========================================================================== */
"use strict";

/** La mediana de `valores`. Descarta lo no finito; `null` si no queda nada.
    No redondea y no muta la lista de quien llama. */
function mediana(valores) {
  if (!Array.isArray(valores)) return null;
  const o = valores.filter((v) => typeof v === "number" && Number.isFinite(v)).sort((a, b) => a - b);
  if (!o.length) return null;
  const m = Math.floor(o.length / 2);
  return o.length % 2 ? o[m] : (o[m - 1] + o[m]) / 2;
}

module.exports = { mediana };
