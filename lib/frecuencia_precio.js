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
     · con los oferentes de la entidad conocidos, su tramo y ningún otro; sin ellos, o con menos de 3 (la tabla
       solo tiene procesos con 3 o más), no se dice;
     · por encima del presupuesto no se dice: esa oferta se rechaza;
     · «bajar 3 puntos» cuesta el 3 % del presupuesto oficial, en pesos: es una
       resta exacta (el costo no cambia), no un modelo;
     · sin modalidad que la tabla cubra, `aplica: false` con su motivo: la
       mínima cuantía tiene su propia tabla medida (lib/indice_baja) y las demás
       modalidades no se midieron.
   ========================================================================== */
"use strict";

const MIN_OFERTAS = 100;
// una verificación o una referencia por tipo de obra necesita al menos estos procesos; con menos, la de la modalidad
const MIN_PROCESOS_TIPO = 100;
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

function celda(t, modalidad, grupo, franja, tipo = null) {
  // con tipo de obra, la celda de su tipo (`celdas_tipo`); sin él, la de todos los tipos
  const raiz = tipo ? (t.celdas_tipo && t.celdas_tipo[modalidad] && t.celdas_tipo[modalidad][tipo]) : (t.celdas && t.celdas[modalidad]);
  const c = raiz && raiz[grupo] && raiz[grupo][franja];
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
function frecuenciaPorPrecio({ modalidad = null, baja_ofertada_pct = null, oferentes = null, presupuesto_oficial = null, tipo_obra = null } = {}, { tabla: tablaDada } = {}) {
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
  /* SIN OFERENTES CONOCIDOS, NO SE DICE (segunda revisión adversaria): el tramo de todos los procesos —casi todos
     de 10 o más— ponía «si todas tuvieran la misma opción, 3,7» junto a una probabilidad de 1 de cada 6 sacada
     del supuesto de cuántos compiten: dos «misma opción» distintas en la misma tarjeta */
  if (nr == null) return { aplica: false, motivo: "sin_oferentes", pct_oferta: pct };
  if (nr < 3) return { aplica: false, motivo: "pocos_oferentes", pct_oferta: pct, oferentes: n };
  const grupo = grupoDe(nr);
  /* EL TIPO DE OBRA (28-oct-2026, decisión del dueño): una vía y un acueducto se adjudican a precios distintos
     (medido: de 1 a 4 puntos de mediana), así que la cifra es la de SU tipo cuando hay 100 ofertas a ese precio;
     si no, la de todos los tipos, y la frase lo dice. Las dos franjas (la suya y 3 puntos abajo) van SIEMPRE de la
     misma población: por tipo las dos o de todos los tipos las dos. */
  const tipo = tipo_obra && nombreDeTipo(tipo_obra) ? tipo_obra : null;
  const elegir = (franjaPct, conTipo) => {
    const f = franjaDe(franjaPct);
    // la franja del borde de abajo junta todo lo que bajó más del 50 %: su «entre el 50 y el 52 %» no sería cierto
    if (f <= 50) return null;
    const c = celda(t, modalidad, grupo, f, conTipo);
    return c ? { ...c, grupo, tipo: conTipo } : null;
  };
  const delTipo = tipo ? elegir(pct, tipo) : null;
  const usaTipo = delTipo ? tipo : null;
  const aqui = delTipo || elegir(pct, null);
  if (!aqui) return { aplica: false, motivo: "franja_sin_base", pct_oferta: pct };
  /* 3 puntos más abajo, en la MISMA población (el mismo tramo de oferentes y el mismo tipo): comparar dos franjas
     de poblaciones distintas haría pasar por efecto del precio lo que es efecto de cuántos compiten */
  const abajo = elegir(pct - PUNTOS_BAJAR, usaTipo);
  const po = numeroFinito(presupuesto_oficial);
  const costoBajar = po != null && po > 0 ? Math.round((po * PUNTOS_BAJAR) / 100) : null;
  const periodo = t.periodo ? `${t.periodo.desde}-${t.periodo.hasta}` : null;
  const periodoTxt = t.periodo ? `adjudicadas entre ${t.periodo.desde} y ${t.periodo.hasta}` : null;
  /* la verificación de SU tipo cuando la cifra es de su tipo y la prueba tuvo 100 procesos; si no, la de la modalidad */
  const verTipo = usaTipo && t.verificacion && t.verificacion.por_tipo && t.verificacion.por_tipo[modalidad] && t.verificacion.por_tipo[modalidad][usaTipo];
  const ver = verTipo && verTipo.procesos_prueba >= MIN_PROCESOS_TIPO ? verTipo
    : t.verificacion && t.verificacion.por_modalidad && t.verificacion.por_modalidad[modalidad];

  /* de quién son las cifras: con tipo, «licitaciones de vías y puentes»; sin él, «de todo tipo de obra», dicho:
     la mezcla de tipos es lo que el dueño pidió ver (28-oct-2026) */
  const quien = (c) => `${MODALIDADES[modalidad]} ${c.tipo ? `de ${nombreDeTipo(c.tipo)}` : "de todo tipo de obra"}${TEXTO_GRUPO[c.grupo] ? ` ${TEXTO_GRUPO[c.grupo]}` : ""}`;
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

  // con tipo conocido y sin base a este precio, se dice por qué la cifra es la de todos los tipos
  if (tipo && !usaTipo) partes.splice(1, 0, `En ${nombreDeTipo(tipo)} no hay ${MIN_OFERTAS} ofertas a este precio para contarlas aparte.`);

  return {
    aplica: true, modalidad, pct_oferta: pct, oferentes: n, periodo, tipo_obra: tipo, por_tipo: !!usaTipo,
    franja: aqui, mas_abajo: abajo, puntos_bajar: PUNTOS_BAJAR, costo_bajar: costoBajar,
    verificacion: ver ? { procesos_2026: ver.procesos_prueba, mejora_pct: ver.mejora_pct } : null,
    generado: t.generado || null,
    frase: partes.join(" "),
    /* lo que cabe bajo la cifra de la tarjeta: el hecho de su franja con el azar al lado, y CON SU POBLACIÓN
       (al lado de la probabilidad de la entidad, «ganaron 4 de cada 100» sin decir de quién se leía como de ella) */
    corta: `En ${quien(aqui)}: a este precio ganaron ${deCada100(aqui.ganaron_de_100)} de cada 100; por azar, ${deCada100(aqui.azar_de_100)}`,
  };
}

/* DÓNDE OFERTARON LOS QUE GANARON (28-oct-2026, decisión del dueño: «la referencia de % de precio a ofertar, dinámica,
   por tipo de obra y modalidad»). La mitad central y la mediana del precio ganador, en % del presupuesto, en obras de
   SU tipo y SU modalidad cuando hay 100 procesos; si no, de todos los tipos, dicho. Es una REFERENCIA medida, no una
   recomendación: el precio, solo, no predijo quién gana (ni por modalidad ni por tipo), y la frase lo dice. Los
   cuartiles van a un decimal y solo se leen: ninguna cifra de aquí decide nada. `pct_oferta`: su oferta en % del
   presupuesto, para decir a cuántos puntos queda de la mediana. */
function rangoGanadores({ modalidad = null, tipo_obra = null, pct_oferta = null } = {}, { tabla: tablaDada } = {}) {
  const t = tablaDada !== undefined ? tablaDada : tabla();
  if (!t) return { aplica: false, motivo: "sin_tabla" };
  if (!cubreModalidad(modalidad)) return { aplica: false, motivo: "modalidad_sin_medir" };
  const tipo = tipo_obra && nombreDeTipo(tipo_obra) ? tipo_obra : null;
  const delTipo = tipo && t.resumen_tipo && t.resumen_tipo[modalidad] && t.resumen_tipo[modalidad][tipo];
  const usaTipo = !!(delTipo && delTipo.procesos >= MIN_PROCESOS_TIPO && delTipo.ganador_pct);
  const r = usaTipo ? delTipo : t.resumen && t.resumen[modalidad];
  if (!r || !r.ganador_pct || !Number.isSafeInteger(r.procesos) || r.procesos < MIN_PROCESOS_TIPO) return { aplica: false, motivo: "sin_base" };
  const g = r.ganador_pct;
  const quien = `${MODALIDADES[modalidad]} ${usaTipo ? `de ${nombreDeTipo(tipo)}` : "de todo tipo de obra"}`;
  const periodo = t.periodo ? ` adjudicadas entre ${t.periodo.desde} y ${t.periodo.hasta}` : "";
  const partes = [`Dónde ofertaron los que ganaron: en ${entero(r.procesos)} ${quien}${periodo}, la mitad de los ganadores ofertó entre el `
    + `${deCada100(g.p25)} y el ${deCada100(g.p75)} % del presupuesto oficial, y la mediana fue el ${deCada100(g.p50)} %.`];
  if (tipo && !usaTipo) partes.push(`En ${nombreDeTipo(tipo)} no hay ${MIN_PROCESOS_TIPO} procesos para contarlos aparte.`);
  const pct = numeroFinito(pct_oferta);
  let puntos = null;
  if (pct != null && pct > 0 && pct <= 100 + 1e-9) {
    puntos = pct - g.p50;
    partes.push(Math.abs(puntos) < 0.05 ? `Su oferta va al ${deCada100(pct)} %, en esa mediana.`
      : `Su oferta va al ${deCada100(pct)} %: ${deCada100(Math.abs(puntos))} puntos ${puntos > 0 ? "por encima" : "por debajo"} de esa mediana.`);
  }
  /* lo que dice de la recomendación sale de la verificación año por año de SU población (su tipo si la referencia es
     de su tipo; si no, la modalidad): una regeneración que diera otra cosa cambia la frase sola */
  const vv = t.verificacion_ventana;
  const ver = vv && (usaTipo ? vv.por_tipo && vv.por_tipo[modalidad] && vv.por_tipo[modalidad][tipo] : vv.por_modalidad && vv.por_modalidad[modalidad]);
  const sobre = usaTipo ? `en ${nombreDeTipo(tipo)}` : `en ${MODALIDADES[modalidad]}`;
  if (ver && Number.isFinite(ver.mejora_pct)) {
    partes.push(ver.mejora_pct <= 0
      ? `Es una referencia, no una recomendación: ${sobre}, probado año por año, el precio no predijo quién gana mejor que el azar.`
      : `Es una referencia, no una recomendación: ${sobre}, probado año por año, el precio apenas predijo quién gana (${deCada100(ver.mejora_pct)} % mejor que el azar), menos de lo que se exige para dar un porcentaje.`);
  } else {
    partes.push("Es una referencia, no una recomendación: no hay una prueba de que ofertar ahí suba la opción de ganar.");
  }
  return {
    aplica: true, modalidad, tipo_obra: tipo, por_tipo: usaTipo, procesos: r.procesos,
    p25: g.p25, p50: g.p50, p75: g.p75, pct_oferta: pct, puntos_sobre_mediana: puntos,
    verificacion: ver ? { procesos: ver.procesos_prueba, mejora_pct: ver.mejora_pct } : null,
    frase: partes.join(" "),
  };
}

/* En cuántos procesos de la tabla ganó la oferta más baja: {procesos, gano_la_mas_baja, periodo} o null (sin tabla,
   modalidad sin medir o una tabla anterior sin el campo). Lo dice la guía de Mis procesos. */
function masBajaGano(modalidad) {
  const t = tabla();
  const r = t && cubreModalidad(modalidad) && t.resumen && t.resumen[modalidad];
  if (!r || !Number.isSafeInteger(r.procesos) || r.procesos <= 0 || !Number.isSafeInteger(r.gano_la_mas_baja)) return null;
  // sin el azar al lado, «11 de cada 100» se lee como «la más barata casi nunca gana» (segunda revisión adversaria)
  if (!Number.isFinite(r.azar_la_mas_baja)) return null;
  return { procesos: r.procesos, gano_la_mas_baja: r.gano_la_mas_baja, periodo: t.periodo || null,
    de_cada_100: (100 * r.gano_la_mas_baja) / r.procesos, azar_de_100: (100 * r.azar_la_mas_baja) / r.procesos };
}

/* ¿Esta modalidad (clave de lib/guia_proceso) está medida? La respuesta es UNA y la usan la lista
   (lib/probabilidad), Precios (lib/apu/rentabilidad) y el sugeridor (lib/apu/optimizador). */
const cubreModalidad = (clave) => Object.prototype.hasOwnProperty.call(MODALIDADES, clave);
/* EL TIPO DE OBRA (28-oct-2026): la clave de lib/semantica.TIPOS_DE_OBRA cuyo vocabulario casa con el objeto del
   proceso, o null. Exige UNO solo: con dos («alcantarillado y pavimentación») o ninguno, null, y la referencia es la de
   todos los tipos de obra, dicho así. La misma regla la llaman el generador de la tabla y Precios. */
function tipoDeObra(texto) {
  const { norm, TIPOS_DE_OBRA } = require("./semantica.js");
  const t = norm(texto || "");
  if (!t) return null;
  const casan = TIPOS_DE_OBRA.filter((x) => x.re.test(t));
  return casan.length === 1 ? casan[0].clave : null;
}
const nombreDeTipo = (clave) => {
  const x = require("./semantica.js").TIPOS_DE_OBRA.find((y) => y.clave === clave);
  return x ? x.nombre : null;
};

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

module.exports = { MIN_OFERTAS, MIN_PROCESOS_TIPO, PUNTOS_BAJAR, MODALIDADES, cubreModalidad, modalidadDeFila, precioNoPrediceEn, tipoDeObra, nombreDeTipo, frecuenciaPorPrecio, rangoGanadores, masBajaGano, tabla, grupoDe, franjaDe,
  _olvidar: () => { _tabla = undefined; } };   // la suite: leer otra tabla
