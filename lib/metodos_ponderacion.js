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
/* Los métodos del documento tipo V1 de licitación (2019-2020) que siguen usando pliegos que no son del documento tipo
   vigente (régimen especial: la Universidad Pedagógica los usó en 2026). Fórmulas leídas el 12-nov-2026 en «Documento
   Base o Pliegos Tipo.docx» del paquete oficial de Colombia Compra (descarga 29961, ZIP 04DT_Licitacion_TLV1_NV):
   · media geométrica con presupuesto oficial: el presupuesto entra nv veces según el número de propuestas válidas
     (1-3 → 1, 4-6 → 2, 7-9 → 3, «y así sucesivamente»); MGPO = raíz (n+m)-ésima del producto; puntaje = máx × (1 −
     (MGPO − Vi)/MGPO) para Vi ≤ MGPO y máx × (1 − 2 × |MGPO − Vi|/MGPO) para Vi > MGPO;
   · media aritmética alta: XA = (Vmax + X̄)/2, con las mismas dos ramas (la de arriba con el 2×).
   La «media aritmética» simple NO está en ningún documento tipo leído: no se implementa (sin fuente no hay fórmula). */
const METODOS_OTROS = ["geometrica_po", "aritmetica_alta"];
const PUNTAJE_MAXIMO = { menor_cuantia: 49.5, licitacion: 48.5 };

/* Centavos de la TRM → método (p. 53). Los centavos se toman como entero para no depender de la
   coma flotante (3209.78 → 78). */
function metodoPorTrm(trm) {
  if (typeof trm !== "number" || !Number.isFinite(trm) || trm <= 0) return null;
  const c = Math.round(trm * 100) % 100;
  return c <= 24 ? "mediana" : c <= 49 ? "geometrica" : c <= 74 ? "aritmetica_baja" : "menor_valor";
}

const noNeg = (x) => (x < 0 ? 0 : x);                    // negativos a cero (p. 54)

/* Puntaje de cada valor bajo un método; con `max` = 1 sale normalizado. `presupuesto` solo lo usa «geometrica_po». */
function puntajes(valores, metodo, max = 1, { presupuesto = null } = {}) {
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
  if (metodo === "geometrica_po") {
    const po = Number(presupuesto);
    if (!(po > 0)) return null;   // sin presupuesto oficial no hay MGPO (no se inventa)
    const nv = Math.ceil(n / 3);
    const mg = Math.exp((nv * Math.log(po) + v.reduce((s, x) => s + Math.log(x), 0)) / (nv + n));
    return v.map((x) => r7(noNeg(x <= mg ? 1 - (mg - x) / mg : 1 - (2 * Math.abs(mg - x)) / mg)));
  }
  if (metodo === "aritmetica_alta") {
    const xa = (Math.max(...v) + v.reduce((s, x) => s + x, 0) / n) / 2;
    return v.map((x) => r7(noNeg(x <= xa ? 1 - (xa - x) / xa : 1 - (2 * Math.abs(xa - x)) / xa)));
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
function primeros(valores, metodo, max = 1, opciones = {}) {
  const p = puntajes(valores, metodo, max, opciones);
  if (!p) return null;
  const mx = Math.max(...p);
  return p.map((x, i) => (x === mx ? i : -1)).filter((i) => i >= 0);
}

/* LA TABLA DE MÉTODOS DE UN PLIEGO (PLAN_X20, tanda 9): los rangos de centavos de la TRM y el método de cada uno,
   como los escribe el pliego («De 0.00 a 0.24 / 1 / Mediana con valor absoluto»). [{desde, hasta, nombre, metodo}]:
   `metodo` es la clave del motor o null si el motor no lo conoce (la «media aritmética» simple, u otro). [] sin tabla. */
const plegarM = (s) => String(s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
const NOMBRES_METODO = [
  [/geometrica\s+con\s+(?:el\s+)?presupuesto\s+oficial/, "geometrica_po"], [/media\s+geometrica/, "geometrica"], [/mediana/, "mediana"],
  [/aritmetica\s+alta/, "aritmetica_alta"], [/aritmetica\s+baja/, "aritmetica_baja"], [/menor\s+valor|menor\s+precio/, "menor_valor"], [/media\s+aritmetica/, null],
];
function leerTablaMetodos(texto) {
  const lineas = String(texto || "").replace(/\r\n?/g, "\n").split("\n").map((l) => l.replace(/\f/g, "").replace(/\s+/g, " ").trim()).filter(Boolean);
  const out = [];
  for (let i = 0; i < lineas.length; i++) {
    const m = lineas[i].match(/^de\s+(0[.,]\d{2})\s+a\s+(0[.,]\d{2})\b(.*)$/i);
    if (!m) continue;
    if (out.some((x) => x.desde === Number(m[1].replace(",", ".")))) break;   // la tabla repetida (otro capítulo, un anexo): basta la primera
    // el método es el PRIMER nombre que aparece después del rango (en el mismo renglón o en los dos siguientes): la
    // ventana puede alcanzar el renglón del rango siguiente y no se escoge por el orden de la lista de patrones
    const RANGO = /^de\s+0[.,]\d{2}\s+a\s+0[.,]\d{2}\b/i;
    const sig = [lineas[i + 1] || "", lineas[i + 2] || ""];
    const corte = sig.findIndex((l) => RANGO.test(l));   // la fila siguiente no presta su método
    const ventana = [m[3], ...(corte < 0 ? sig : sig.slice(0, corte))].join(" ");
    const nm = ventana.match(/(mediana(?:\s+con\s+valor\s+absoluto)?|media\s+geom[ée]trica(?:\s+con\s+(?:el\s+)?presupuesto\s+oficial)?|media\s+aritm[ée]tica(?:\s+(?:alta|baja))?|menor\s+(?:valor|precio))/i);
    if (!nm) continue;
    const casa = NOMBRES_METODO.find(([re]) => re.test(plegarM(nm[1])));
    out.push({ desde: Number(m[1].replace(",", ".")), hasta: Number(m[2].replace(",", ".")), nombre: nm[1].trim(), metodo: casa ? casa[1] : null });
    if (out.length >= 8) break;
  }
  return out;
}

module.exports = { METODOS, METODOS_OTROS, PUNTAJE_MAXIMO, metodoPorTrm, puntajes, primeros, leerTablaMetodos };
