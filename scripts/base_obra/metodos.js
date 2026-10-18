"use strict";
/* Base nacional de obra · los 4 métodos de ponderación económica (17-oct-2026). PURO.
   Fuente, leída y verificada en esta sesión: pliego definitivo SAMC-SI-020-2026 (Gobernación de
   Caldas), Documento Base de Selección Abreviada de Menor Cuantía de Infraestructura de Transporte
   V3, código CCE-EICP-GI-02, versión 6, numeral 4.1.4, pp. 53–56. El Documento Tipo de licitación
   V4 (CCE-EICP-GI-01, numeral 4.1.4) trae las MISMAS cuatro fórmulas y la misma tabla; cambia la
   fecha de la TRM (día hábil siguiente o segundo, según la hora del pronunciamiento).
   - p. 53: «la entidad tomará los centavos de la Tasa de Cambio Representativa del Mercado (TRM)»
     — De 0.00 a 0.24 → 1 Mediana con valor absoluto · 0.25 a 0.49 → 2 Media geométrica ·
     0.50 a 0.74 → 3 Media aritmética baja · 0.75 a 0.99 → 4 Menor valor («Rango (inclusive)»).
   - p. 53: «hasta el séptimo (7°) decimal del valor obtenido como puntaje»; p. 54: puntajes
     negativos «obtienen cero (0) puntos».
   - El séptimo decimal se aplica al PUNTAJE (sobre 49,5 en menor cuantía, p. 50; 48,5 en licitación),
     no al normalizado: normalizar hacía el redondeo 49,5 veces más grueso y fabricaba empates
     (revisión adversaria, 17-oct-2026). `PUNTAJE_MAXIMO` por modalidad.
   Los valores pueden ser pesos o fracciones del precio base: todas las fórmulas son homogéneas. */

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

/* Puntaje normalizado de cada valor bajo un método. */
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
    // p. 55: MG = raíz n-ésima del producto de las propuestas habilitadas (sin el presupuesto oficial)
    const mg = Math.exp(v.reduce((s, x) => s + Math.log(x), 0) / n);
    return v.map((x) => r7(noNeg(1 - Math.abs(mg - x) / mg)));
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
