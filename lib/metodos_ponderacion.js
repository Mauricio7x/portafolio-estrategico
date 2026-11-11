"use strict";
/* ============================================================================
   lib/metodos_ponderacion · Los 4 métodos de ponderación económica del documento tipo
   ----------------------------------------------------------------------------
   Casa ÚNICA del motor (desde el 11-nov-2026; antes vivía en scripts/base_obra/metodos.js,
   que ahora solo lo re-exporta para el análisis de la base nacional). PURO: sin red ni Redis.

   Fuentes:
   - Pliego definitivo SAMC-SI-020-2026 (Gobernación de Caldas), Documento Base de Selección
     Abreviada de Menor Cuantía de Infraestructura de Transporte V3, CCE-EICP-GI-02, numeral 4.1.4,
     pp. 53–56 (leído el 17-oct-2026). El de licitación V4 (CCE-EICP-GI-01, 4.1.4) trae las MISMAS
     cuatro fórmulas; cambia la fecha de la TRM.
   - «DocBase_MenorC_TMenCV3.docx» del paquete oficial de Colombia Compra Eficiente
     (colombiacompra.gov.co/documentos-tipo/descarga/29950), releído el 11-nov-2026 para la media
     geométrica: «se otorgará el máximo puntaje al valor de la propuesta que se encuentre más cerca
     (por exceso o por defecto) al valor de la media geométrica […] Las demás propuestas recibirán
     puntaje de acuerdo con la siguiente ecuación». Hasta el 11-nov-2026 el motor aplicaba la
     ecuación también a la más cercana (49,1854 en vez de 49,5 en el caso de Cali, defecto D1 de
     docs/PLAN_X20.md). El ORDEN por precio no cambia (la ecuación ya decrece con la distancia);
     cambia el puntaje de la más cercana, que se suma a los puntos fuera del precio.
   Reglas comunes (p. 53): centavos de la TRM → método («Rango (inclusive)»): 0,00–0,24 mediana con
   valor absoluto · 0,25–0,49 media geométrica · 0,50–0,74 media aritmética baja · 0,75–0,99 menor
   valor; «hasta el séptimo (7°) decimal del valor obtenido como puntaje»; negativos «obtienen cero
   (0) puntos» (p. 54). El séptimo decimal se aplica al PUNTAJE (49,5 en menor cuantía, 48,5 en
   licitación), no al normalizado (revisión adversaria, 17-oct-2026).
   Los valores pueden ser pesos o fracciones del precio base: todas las fórmulas son homogéneas.
   ============================================================================ */

const METODOS = ["mediana", "geometrica", "aritmetica_baja", "menor_valor"];
const PUNTAJE_MAXIMO = { menor_cuantia: 49.5, licitacion: 48.5 };

/* Centavos de la TRM → método (p. 53). Los centavos se toman como entero para no depender de la
   coma flotante (3209.78 → 78). */
function metodoPorTrm(trm) {
  if (typeof trm !== "number" || !Number.isFinite(trm) || trm <= 0) return null;
  const c = Math.round(trm * 100) % 100;
  return c <= 24 ? "mediana" : c <= 49 ? "geometrica" : c <= 74 ? "aritmetica_baja" : "menor_valor";
}

const noNeg = (x) => (x < 0 ? 0 : x);                    // negativos a cero (p. 54)

/* Puntaje de cada valor bajo un método; con `max` = 1 sale normalizado. */
function puntajes(valores, metodo, max = 1) {
  const v = valores.slice(), n = v.length;
  const r7 = (x) => Math.round(x * max * 1e7) / 1e7;    // séptimo decimal del PUNTAJE (p. 53)
  if (!n || v.some((x) => !(x > 0))) return null;
  if (metodo === "mediana") {
    // p. 54: impar → máximo a la mediana; par → máximo a la «inmediatamente por debajo de la
    // mediana» y las demás contra ese valor (VMe). Con número par se toma como VMe el central
    // inferior [interpretación declarada]. Si los dos centrales son IGUALES, una lectura estricta
    // tomaría la primera oferta por debajo de ese valor; pasa en 259 procesos y en 51 de 55 con
    // dato el ganador real fue el central: se deja el central inferior.
    const a = v.slice().sort((x, y) => x - y);
    const ref = n % 2 ? a[(n - 1) / 2] : a[n / 2 - 1];
    return v.map((x) => r7(noNeg(1 - Math.abs((ref - x) / ref))));
  }
  if (metodo === "geometrica") {
    // p. 55: MG = raíz n-ésima del producto de las propuestas habilitadas (sin el presupuesto
    // oficial). La más cercana a MG, por exceso o por defecto, recibe el MÁXIMO; las demás, la
    // ecuación. Dos a la misma distancia (una arriba y otra abajo, o el mismo valor) reciben las
    // dos el máximo: el empate lo resuelven los criterios de desempate, no este motor.
    const mg = Math.exp(v.reduce((s, x) => s + Math.log(x), 0) / n);
    const d = v.map((x) => Math.abs(mg - x));
    const dmin = Math.min(...d);
    // la tolerancia relativa absorbe solo el ruido de la coma flotante del producto (1e-12 de MG)
    const cerca = (i) => d[i] - dmin <= mg * 1e-12;
    return v.map((x, i) => (cerca(i) ? r7(1) : r7(noNeg(1 - d[i] / mg))));
  }
  if (metodo === "aritmetica_baja") {
    // pp. 55–56: X̄B = (Vmin + X̄)/2; menores o iguales: 1 − (X̄B − Vi)/X̄B; mayores: 1 − |X̄B − Vi|/X̄B
    const xb = (Math.min(...v) + v.reduce((s, x) => s + x, 0) / n) / 2;
    return v.map((x) => r7(noNeg(x <= xb ? 1 - (xb - x) / xb : 1 - Math.abs(xb - x) / xb)));
  }
  if (metodo === "menor_valor") {
    // p. 56: Puntaje = Puntaje máximo × Vmin / Vi
    const mn = Math.min(...v);
    return v.map((x) => r7(noNeg(mn / x)));
  }
  return null;
}

/* Índices con el puntaje máximo. Más de uno = empate: lo resuelven criterios que los datos
   abiertos no traen (nacional, mujer, Mipyme… y sorteo con la TRM del cierre, pp. 64–71). */
function primeros(valores, metodo, max = 1) {
  const p = puntajes(valores, metodo, max);
  if (!p) return null;
  const mx = Math.max(...p);
  return p.map((x, i) => (x === mx ? i : -1)).filter((i) => i >= 0);
}

module.exports = { METODOS, PUNTAJE_MAXIMO, metodoPorTrm, puntajes, primeros };
