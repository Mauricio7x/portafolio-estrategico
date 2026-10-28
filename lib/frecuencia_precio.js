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
     · sin tramo de oferentes conocido se usa el de todos los procesos, y se dice; con él conocido, su tramo
       y ningún otro, y con menos de 3 oferentes no se dice (la tabla solo tiene procesos con 3 o más);
     · por encima del presupuesto no se dice: esa oferta se rechaza;
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
  /* por encima del presupuesto la oferta se rechaza: decir «ganaron X de cada 100» al lado del aviso de rechazo
     sería un hecho medido para un precio que no compite (revisión adversaria, 28-oct-2026) */
  if (pct > 100 + 1e-9) return { aplica: false, motivo: "supera_presupuesto", pct_oferta: pct };
  /* CON LOS OFERENTES CONOCIDOS, SU TRAMO Y NINGÚN OTRO (revisión adversaria): caer al de todos los procesos
     —casi todos con 10 o más oferentes— ponía «ganaron 3,5 de cada 100» junto a la probabilidad de una entidad
     de 1 o 2 oferentes, y hacía leer como efecto del precio el salto de un tramo a otro. La tabla solo tiene
     procesos con 3 o más ofertas: con menos, no se dice. El redondeo es el mismo para la puerta y el tramo. */
  const nr = n != null ? Math.round(n) : null;
  if (nr != null && nr < 3) return { aplica: false, motivo: "pocos_oferentes", pct_oferta: pct, oferentes: n };
  const grupo = nr != null ? grupoDe(nr) : "*";
  const elegir = (franjaPct) => {
    const f = franjaDe(franjaPct);
    // la franja del borde de abajo junta todo lo que bajó más del 50 %: su «entre el 50 y el 52 %» no sería cierto
    if (f <= 50) return null;
    const c = celda(t, modalidad, grupo, f);
    return c ? { ...c, grupo } : null;
  };
  const aqui = elegir(pct);
  if (!aqui) return { aplica: false, motivo: "franja_sin_base", pct_oferta: pct };
  /* 3 puntos más abajo, en la MISMA población (el mismo tramo de oferentes): comparar dos franjas de
     poblaciones distintas haría pasar por efecto del precio lo que es efecto de cuántos compiten */
  const abajo = elegir(pct - PUNTOS_BAJAR);
  const po = numeroFinito(presupuesto_oficial);
  const costoBajar = po != null && po > 0 ? Math.round((po * PUNTOS_BAJAR) / 100) : null;
  const periodo = t.periodo ? `${t.periodo.desde}-${t.periodo.hasta}` : null;
  const periodoTxt = t.periodo ? `adjudicadas entre ${t.periodo.desde} y ${t.periodo.hasta}` : null;
  const ver = t.verificacion && t.verificacion.por_modalidad && t.verificacion.por_modalidad[modalidad];

  const quien = (c) => `${MODALIDADES[modalidad]}${TEXTO_GRUPO[c.grupo] ? ` ${TEXTO_GRUPO[c.grupo]}` : ""}`;
  /* la franja del 100 es, medido, la oferta POR el presupuesto: 8.604 de 8.618 en licitación (el resto, por un
     redondeo encima); «entre el 100 y el 102 %» describiría ofertas que se rechazan */
  const franjaTxt = (c) => (c.desde_pct >= 100 ? "por el valor del presupuesto oficial, sin descuento," : `entre el ${c.desde_pct} y el ${c.hasta_pct} % del presupuesto`);
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
    /* lo que cabe bajo la cifra de la tarjeta: el hecho de su franja con el azar al lado, y CON SU POBLACIÓN
       (al lado de la probabilidad de la entidad, «ganaron 4 de cada 100» sin decir de quién se leía como de ella) */
    corta: `A este precio, en ${quien(aqui)}, ganaron ${deCada100(aqui.ganaron_de_100)} de cada 100; si todas tuvieran la misma opción, ${deCada100(aqui.azar_de_100)}`,
  };
}

/* En cuántos procesos de la tabla ganó la oferta más baja: {procesos, gano_la_mas_baja, periodo} o null (sin tabla,
   modalidad sin medir o una tabla anterior sin el campo). Lo dice la guía de Mis procesos. */
function masBajaGano(modalidad) {
  const t = tabla();
  const r = t && cubreModalidad(modalidad) && t.resumen && t.resumen[modalidad];
  if (!r || !Number.isSafeInteger(r.procesos) || r.procesos <= 0 || !Number.isSafeInteger(r.gano_la_mas_baja)) return null;
  return { procesos: r.procesos, gano_la_mas_baja: r.gano_la_mas_baja, periodo: t.periodo || null, de_cada_100: (100 * r.gano_la_mas_baja) / r.procesos };
}

/* ¿Esta modalidad (clave de lib/guia_proceso) está medida? La respuesta es UNA y la usan la lista
   (lib/probabilidad), Precios (lib/apu/rentabilidad) y el sugeridor (lib/apu/optimizador). */
const cubreModalidad = (clave) => Object.prototype.hasOwnProperty.call(MODALIDADES, clave);
/* La modalidad de una fila: el campo y su respaldo declarado (lib/proyeccion, `tipo_de_proceso`), como la leen
   lib/filtros y lib/probabilidad. Leer solo el primero hacía que la misma tarjeta dijera «no predijo» en la
   probabilidad y «aquí no da» en el margen (revisión adversaria, 28-oct-2026). */
const modalidadDeFila = (l) => (l && (l.modalidad_de_contratacion || l.tipo_de_proceso)) || null;
/* ¿En esta modalidad (el literal de SECOP) el precio, solo, no predijo quién gana? La clave la da
   lib/guia_proceso (require diferido: cerraría un ciclo). Sin modalidad, no. */
function precioNoPrediceEn(modalidadLiteral) {
  if (!modalidadLiteral) return false;
  return cubreModalidad(require("./guia_proceso.js").modalidadEnLlano(String(modalidadLiteral)).clave);
}

module.exports = { MIN_OFERTAS, PUNTOS_BAJAR, MODALIDADES, cubreModalidad, modalidadDeFila, precioNoPrediceEn, frecuenciaPorPrecio, masBajaGano, tabla, grupoDe, franjaDe,
  _olvidar: () => { _tabla = undefined; } };   // la suite: leer otra tabla
