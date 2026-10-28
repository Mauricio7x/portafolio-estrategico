/* ============================================================================
   lib/frecuencia_precio · Cuántas ofertas ganaron a cada precio, dicho junto al precio
   ----------------------------------------------------------------------------
   Para qué existe (28-oct-2026, docs/MEMORIA.md, sección del mismo día): el dueño
   pidió «el % de adjudicación según el precio». Medido fuera de muestra (aprender
   con 2020-2025, probar con 2026), en licitación y en menor cuantía el precio como
   % del presupuesto, solo, NO predice quién gana mejor que el azar («1 de cada N
   oferentes»), y el mecanismo de los 4 métodos con una tasa de hábiles supuesta
   predice PEOR. Un % por precio en pantalla sería una cifra creíble y falsa.

   Lo que sí se sabe es un hecho contado: en los procesos ya cerrados, cuántas
   ofertas a ese precio ganaron, cuántas 3 puntos más abajo, y cuántas habrían
   ganado si todas tuvieran la misma opción. Eso se dice, con su número de
   ofertas, y nada más: ni curva, ni probabilidad, ni recomendación de precio.

   La tabla la genera `scripts/base_obra/frecuencia_precio.js` desde la base
   nacional de obra y vive en `data/frecuencia_precio.json` (viaja con el
   despliegue: `includeFiles: data/**`). Lleva la fecha, la huella de la base y
   su propia verificación fuera de muestra.

   Reglas que no hay que deshacer:
     · una franja con menos de MIN_OFERTAS ofertas no se dice (es ruido);
     · sin tramo de oferentes conocido se usa el de todos los procesos, y se dice;
     · «bajar 3 puntos» cuesta el 3 % del presupuesto oficial, en pesos: es una
       resta exacta (el costo no cambia), no un modelo;
     · sin modalidad que la tabla cubra, `aplica: false` con su motivo: la
       mínima cuantía tiene su propia tabla medida (lib/indice_baja) y las demás
       modalidades no se midieron.
   ========================================================================== */
"use strict";

const MIN_OFERTAS = 100;
const PUNTOS_BAJAR = 3;
const MODALIDADES = Object.freeze({ licitacion: "licitaciones", menor_cuantia: "menores cuantías" });
const TEXTO_GRUPO = Object.freeze({ "3-4": "con 3 o 4 oferentes", "5-9": "con 5 a 9 oferentes", "10+": "con 10 o más oferentes", "*": "" });

let _tabla;
/* La tabla, leída UNA vez por instancia. Un archivo ilegible o con otro formato es «sin tabla», no un 500. */
function tabla() {
  if (_tabla !== undefined) return _tabla;
  try {
    const t = require("../data/frecuencia_precio.json");
    _tabla = t && t.formato === 1 && t.celdas ? t : null;
  } catch { _tabla = null; }
  return _tabla;
}

// el mismo corte de oferentes que la tabla (scripts/base_obra/frecuencia_precio.grupoDe)
const grupoDe = (n) => (n <= 4 ? "3-4" : n <= 9 ? "5-9" : "10+");
const FRANJA_PP = 2;
function franjaDe(pct100) {
  const p = Math.min(Math.max(pct100, 50), 110 - 1e-9);
  return Math.floor(p / FRANJA_PP) * FRANJA_PP;
}
const { numCO } = require("./lenguaje_pantalla.js");   // la coma decimal y los miles de la pantalla: una sola regla
const numeroFinito = (x) => (x == null || x === "" ? null : Number.isFinite(Number(x)) ? Number(x) : null);
// para LEER: «de cada 100» con un decimal y los conteos enteros. Ninguna de estas cifras decide nada.
const deCada100 = (x) => numCO(x, 1);
const entero = (x) => numCO(x, 0);

function celda(t, modalidad, grupo, franja) {
  const c = t.celdas[modalidad] && t.celdas[modalidad][grupo] && t.celdas[modalidad][grupo][franja];
  if (!c || !(c.ofertas >= MIN_OFERTAS)) return null;
  return {
    desde_pct: franja, hasta_pct: franja + FRANJA_PP, ofertas: c.ofertas,
    ganaron_de_100: (100 * c.ganaron) / c.ofertas, azar_de_100: (100 * c.azar) / c.ofertas,
  };
}

/* Lo medido para una oferta.
   `modalidad`: la clave de lib/guia_proceso (`licitacion`, `menor_cuantia`); `baja_ofertada_pct`:
   cuánto baja su oferta del presupuesto oficial (5 = el 95 %); `oferentes`: cuántos suele tener la
   entidad (null = no se sabe); `presupuesto_oficial`: en pesos, para lo que cuesta bajar. */
function frecuenciaPorPrecio({ modalidad = null, baja_ofertada_pct = null, oferentes = null, presupuesto_oficial = null } = {}, { tabla: tablaDada } = {}) {
  // `tablaDada`: la suite prueba con una tabla hecha a mano (la conclusión cambia si la verificación cambia)
  const t = tablaDada !== undefined ? tablaDada : tabla();
  if (!t) return { aplica: false, motivo: "sin_tabla" };
  if (!cubreModalidad(modalidad)) return { aplica: false, motivo: "modalidad_sin_medir" };
  const b = numeroFinito(baja_ofertada_pct);
  if (b == null) return { aplica: false, motivo: "sin_precio" };
  const n = numeroFinito(oferentes);
  const pct = 100 - b;
  const elegir = (franjaPct) => {
    const f = franjaDe(franjaPct);
    if (n != null && n >= 3) { const c = celda(t, modalidad, grupoDe(Math.round(n)), f); if (c) return { ...c, grupo: grupoDe(Math.round(n)) }; }
    const c = celda(t, modalidad, "*", f);
    return c ? { ...c, grupo: "*" } : null;
  };
  const aqui = elegir(pct);
  if (!aqui) return { aplica: false, motivo: "franja_sin_base", pct_oferta: pct };
  /* 3 puntos más abajo, en la MISMA población (el mismo tramo de oferentes): comparar dos franjas de
     poblaciones distintas haría pasar por efecto del precio lo que es efecto de cuántos compiten */
  const cAbajo = celda(t, modalidad, aqui.grupo, franjaDe(pct - PUNTOS_BAJAR));
  const abajo = cAbajo ? { ...cAbajo, grupo: aqui.grupo } : null;
  const po = numeroFinito(presupuesto_oficial);
  const costoBajar = po != null && po > 0 ? Math.round((po * PUNTOS_BAJAR) / 100) : null;
  const periodo = t.periodo ? `${t.periodo.desde}-${t.periodo.hasta}` : null;
  const periodoTxt = t.periodo ? `adjudicadas entre ${t.periodo.desde} y ${t.periodo.hasta}` : null;
  const ver = t.verificacion && t.verificacion.por_modalidad && t.verificacion.por_modalidad[modalidad];

  const quien = (c) => `${MODALIDADES[modalidad]}${TEXTO_GRUPO[c.grupo] ? ` ${TEXTO_GRUPO[c.grupo]}` : ""}`;
  const franjaTxt = (c) => `entre el ${c.desde_pct} y el ${c.hasta_pct} % del presupuesto`;
  const partes = [
    `En ${quien(aqui)}${periodoTxt ? ` ${periodoTxt}` : ""}, las ofertas ${franjaTxt(aqui)} ganaron ${deCada100(aqui.ganaron_de_100)} de cada 100 (${entero(aqui.ofertas)} ofertas).`,
  ];
  if (abajo && abajo.desde_pct !== aqui.desde_pct) {
    partes.push(`Las de ${PUNTOS_BAJAR} puntos más abajo, ${franjaTxt(abajo)}, ganaron ${deCada100(abajo.ganaron_de_100)} de cada 100 (${entero(abajo.ofertas)} ofertas).`);
    partes.push(`Si todas tuvieran la misma opción, serían ${deCada100(aqui.azar_de_100)} y ${deCada100(abajo.azar_de_100)}.`);
  } else {
    partes.push(`Si todas tuvieran la misma opción, serían ${deCada100(aqui.azar_de_100)}.`);
  }
  if (costoBajar != null) partes.push(`Bajar ${PUNTOS_BAJAR} puntos son $${entero(costoBajar)} menos en su oferta, que salen de su utilidad.`);
  /* La conclusión es la de la verificación fuera de muestra, no la de estas dos franjas: entre franjas
     vecinas la diferencia va para un lado o para el otro según el tramo, y decir «bajar no sube» al lado de
     una franja de abajo que ganó un poco más sería contradecirse en la misma pantalla. */
  if (ver && ver.mejora_pct != null && ver.mejora_pct <= 0) {
    partes.push(`Probada con los procesos de ${t.verificacion.prueba}, esta cuenta no predijo al ganador mejor que el azar.`);
  }

  return {
    aplica: true, modalidad, pct_oferta: pct, oferentes: n, periodo,
    franja: aqui, mas_abajo: abajo, puntos_bajar: PUNTOS_BAJAR, costo_bajar: costoBajar,
    verificacion: ver ? { procesos_2026: ver.procesos_prueba, mejora_pct: ver.mejora_pct } : null,
    generado: t.generado || null,
    frase: partes.join(" "),
    // lo que cabe bajo la cifra de la tarjeta: el hecho de su franja con el azar al lado
    corta: `A este precio ganaron ${deCada100(aqui.ganaron_de_100)} de cada 100; si todas tuvieran la misma opción, ${deCada100(aqui.azar_de_100)}`,
  };
}

/* ¿Esta modalidad (clave de lib/guia_proceso) está medida? La respuesta es UNA y la usan la lista
   (lib/probabilidad), Precios (lib/apu/rentabilidad) y el sugeridor (lib/apu/optimizador). */
const cubreModalidad = (clave) => Object.prototype.hasOwnProperty.call(MODALIDADES, clave);

module.exports = { MIN_OFERTAS, PUNTOS_BAJAR, MODALIDADES, cubreModalidad, frecuenciaPorPrecio, tabla, grupoDe, franjaDe,
  _olvidar: () => { _tabla = undefined; } };   // la suite: leer otra tabla
