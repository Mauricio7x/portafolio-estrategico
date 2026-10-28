/* ============================================================================
   lib/frecuencia_precio · Cuántas ofertas ganaron a cada precio, dicho junto al precio
   ----------------------------------------------------------------------------
   Para qué existe (28-oct-2026, docs/MEMORIA.md, sección del mismo día): el dueño
   pidió «el % de adjudicación según el precio». Medido fuera de muestra (aprender
   con los años anteriores, probar con cada año de 2022 a 2026), en licitación y en
   menor cuantía el precio como % del presupuesto, solo, predice quién gana APENAS
   mejor que el azar («1 de cada N oferentes»): +0,5 % y +0,3 % de Brier, lejos del 3 %
   que exige la regla (corregido el 28-oct-2026: la primera verificación no normalizaba
   y daba negativo). El mecanismo de los 4 métodos con una tasa de hábiles supuesta
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
     (medido con el mismo número de oferentes: en licitación con 10 o más, de 94,3 % en agua a 95,5 % en edificaciones), así que la cifra es la de
     SU tipo cuando su tipo tiene 100 procesos en su tramo y hay 100 ofertas a ese precio; si no, la de todos los tipos,
     y la frase lo dice. Las dos franjas (la suya y 3 puntos abajo) van SIEMPRE de la
     misma población: por tipo las dos o de todos los tipos las dos. */
  const tipo = tipo_obra && nombreDeTipo(tipo_obra) ? tipo_obra : null;
  /* su tipo solo con 100 PROCESOS de su tipo en su tramo, la misma puerta que la referencia de dónde ofertaron los que
     ganaron: 214 ofertas de 18 licitaciones de estabilización con 10 o más oferentes pasaban la puerta de ofertas, y la
     pantalla decía esta frase de su tipo junto a la referencia de todos los tipos (dos poblaciones en el mismo recuadro) */
  const tipoBase = tipo ? tipoConBase(t, modalidad, tipo, grupo) : null;
  const elegir = (franjaPct, conTipo) => {
    const f = franjaDe(franjaPct);
    // la franja del borde de abajo junta todo lo que bajó más del 50 %: su «entre el 50 y el 52 %» no sería cierto
    if (f <= 50) return null;
    const c = celda(t, modalidad, grupo, f, conTipo);
    return c ? { ...c, grupo, tipo: conTipo } : null;
  };
  const delTipo = tipoBase ? elegir(pct, tipo) : null;
  /* CON SU TIPO CRUZANDO LA PUERTA, SU TIPO O NADA (cuarta revisión adversaria): caer a todos los tipos cuando su
     franja no tenía 100 ofertas ponía esta frase de todos los tipos junto a la referencia de SU tipo, con dos
     verificaciones distintas en el mismo recuadro */
  if (tipoBase && !delTipo) return { aplica: false, motivo: "franja_sin_base", pct_oferta: pct, tipo_obra: tipo, por_tipo: true };
  const usaTipo = delTipo ? tipo : null;
  // la cifra de todos los tipos de un tramo que reúne una sola entidad sería la de esa entidad: no se dice
  const concTodos = usaTipo ? null : tramoConcentrado(t, modalidad, "*", grupo);
  if (concTodos) return { aplica: false, motivo: "tramo_concentrado", pct_oferta: pct, concentracion: concTodos, frase_motivo: fraseTramoConcentrado(modalidad, grupo, concTodos) };
  const aqui = delTipo || elegir(pct, null);
  if (!aqui) return { aplica: false, motivo: "franja_sin_base", pct_oferta: pct };
  /* 3 puntos más abajo, en la MISMA población (el mismo tramo de oferentes y el mismo tipo): comparar dos franjas
     de poblaciones distintas haría pasar por efecto del precio lo que es efecto de cuántos compiten */
  const abajo = elegir(pct - PUNTOS_BAJAR, usaTipo);
  const po = numeroFinito(presupuesto_oficial);
  const costoBajar = po != null && po > 0 ? Math.round((po * PUNTOS_BAJAR) / 100) : null;
  const periodo = t.periodo ? `${t.periodo.desde}-${t.periodo.hasta}` : null;
  const periodoTxt = t.periodo ? `adjudicadas entre ${t.periodo.desde} y ${t.periodo.hasta}` : null;
  // la MISMA verificación que la referencia de dónde ofertaron los ganadores (una sola en la pantalla)
  const ver = verificacionDe(t, modalidad, usaTipo);

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
  if (ver) partes.push(`${fraseVerificacion(ver, "esta cuenta").replace(/^p/, "P")}`);

  // con tipo conocido y sin base a este precio, se dice por qué la cifra es la de todos los tipos
  const porQue = tipo && !usaTipo ? porQueSinTipo(t, modalidad, tipo, grupo) : null;
  if (porQue) partes.splice(1, 0, porQue);

  return {
    aplica: true, modalidad, pct_oferta: pct, oferentes: n, periodo, tipo_obra: tipo, por_tipo: !!usaTipo,
    franja: aqui, mas_abajo: abajo, puntos_bajar: PUNTOS_BAJAR, costo_bajar: costoBajar,
    verificacion: ver,
    generado: t.generado || null,
    frase: partes.join(" "),
    /* lo que cabe bajo la cifra de la tarjeta: el hecho de su franja con el azar al lado, y CON SU POBLACIÓN
       (al lado de la probabilidad de la entidad, «ganaron 4 de cada 100» sin decir de quién se leía como de ella) */
    corta: `En ${quien(aqui)}: a este precio ganaron ${deCada100(aqui.ganaron_de_100)} de cada 100; por azar, ${deCada100(aqui.azar_de_100)}`,
  };
}

/* DÓNDE OFERTARON LOS QUE GANARON (28-oct-2026, decisión del dueño: «la referencia de % de precio a ofertar, dinámica,
   por tipo de obra y modalidad»). La mitad central y la mediana del precio ganador, en % del presupuesto, en obras de
   SU tipo, SU modalidad y SU tramo de oferentes cuando hay 100 procesos; si no, de todos los tipos en su tramo, dicho.
   Las mismas puertas que la frase de cuántas ganaron: sin los oferentes de la entidad, o con menos de 3, no se dice
   (revisión adversaria: la mediana cambia más con cuántos compiten que con el tipo de obra). Es una REFERENCIA medida,
   no una recomendación, y la frase cierra con la misma verificación que la de cuántas ganaron. Los cuartiles van a un
   decimal y solo se leen: ninguna cifra de aquí decide nada. `pct_oferta`: su oferta en % del presupuesto. */
function rangoGanadores({ modalidad = null, tipo_obra = null, pct_oferta = null, oferentes = null } = {}, { tabla: tablaDada } = {}) {
  const t = tablaDada !== undefined ? tablaDada : tabla();
  if (!t) return { aplica: false, motivo: "sin_tabla" };
  if (!cubreModalidad(modalidad)) return { aplica: false, motivo: "modalidad_sin_medir" };
  const n = numeroFinito(oferentes);
  const nr = n != null ? Math.round(n) : null;
  // el porqué va en la frase: el recuadro de «Precio de su oferta» no se queda callado sin decir por qué
  if (nr == null) return { aplica: false, motivo: "sin_oferentes",
    frase: "Dónde ofertaron los que ganaron: no se dice, porque no se sabe cuántos suelen presentarse a esta entidad y el precio ganador cambia con cuántos compiten." };
  if (nr < 3) return { aplica: false, motivo: "pocos_oferentes", oferentes: n,
    frase: "Dónde ofertaron los que ganaron: no se dice, porque a esta entidad suelen presentarse menos de 3 y la cuenta solo tiene procesos con 3 o más ofertas." };
  const grupo = grupoDe(nr);
  const tipo = tipo_obra && nombreDeTipo(tipo_obra) ? tipo_obra : null;
  const delTipoGrupo = tipo ? tipoConBase(t, modalidad, tipo, grupo) : null;
  const usaTipo = !!(delTipoGrupo && delTipoGrupo.ganador_pct);
  const general = t.resumen && t.resumen[modalidad] && t.resumen[modalidad].por_grupo && t.resumen[modalidad].por_grupo[grupo];
  const concTodos = usaTipo ? null : tramoConcentrado(t, modalidad, "*", grupo);
  if (concTodos) return { aplica: false, motivo: "tramo_concentrado", concentracion: concTodos,
    frase: `Dónde ofertaron los que ganaron: no se dice. ${fraseTramoConcentrado(modalidad, grupo, concTodos)}` };
  const r = usaTipo ? delTipoGrupo : general;
  if (!r || !r.ganador_pct || !Number.isSafeInteger(r.procesos) || r.procesos < MIN_PROCESOS_TIPO) return { aplica: false, motivo: "sin_base" };
  const g = r.ganador_pct;
  const quien = `${MODALIDADES[modalidad]} ${usaTipo ? `de ${nombreDeTipo(tipo)}` : "de todo tipo de obra"}${TEXTO_GRUPO[grupo] ? ` ${TEXTO_GRUPO[grupo]}` : ""}`;
  const periodo = t.periodo ? ` adjudicadas entre ${t.periodo.desde} y ${t.periodo.hasta}` : "";
  const partes = [`Dónde ofertaron los que ganaron: en ${entero(r.procesos)} ${quien}${periodo}, la mitad de los ganadores ofertó entre el `
    + `${deCada100(g.p25)} y el ${deCada100(g.p75)} % del presupuesto oficial, y la mediana fue el ${deCada100(g.p50)} %.`];
  const porQue = tipo && !usaTipo ? porQueSinTipo(t, modalidad, tipo, grupo) : null;
  if (porQue) partes.push(porQue);
  const pct = numeroFinito(pct_oferta);
  let puntos = null;
  /* se ubica una oferta entre el 50 y el 100 % del presupuesto, el mismo borde de abajo que la frase de cuántas
     ganaron: un presupuesto a medio costear (el 12 %) no es una oferta que se compare con los ganadores. La distancia
     se cuenta con las cifras que se MUESTRAN, a un decimal: «95,1 %, en esa mediana» del 95 % no puede salir */
  if (pct != null && pct > 50 && pct <= 100 + 1e-9) {
    const pct1 = Math.round(pct * 10) / 10;
    puntos = Math.round((pct1 - g.p50) * 10) / 10;
    partes.push(puntos === 0 ? `Su oferta va al ${deCada100(pct1)} %, en esa mediana.`
      : `Su oferta va al ${deCada100(pct1)} %: ${deCada100(Math.abs(puntos))} ${Math.abs(puntos) === 1 ? "punto" : "puntos"} ${puntos > 0 ? "por encima" : "por debajo"} de esa mediana.`);
  }
  const ver = verificacionDe(t, modalidad, usaTipo ? tipo : null);
  partes.push(`Es una referencia, no una recomendación: ${ver ? fraseVerificacion(ver, "el precio") : "no hay una prueba de que ofertar ahí suba la opción de ganar."}`);
  return {
    aplica: true, modalidad, tipo_obra: tipo, por_tipo: usaTipo, grupo, procesos: r.procesos,
    p25: g.p25, p50: g.p50, p75: g.p75, pct_oferta: pct, puntos_sobre_mediana: puntos,
    verificacion: ver,
    frase: partes.join(" "),
  };
}

/* El resumen de su tipo en su tramo de oferentes, si tiene MIN_PROCESOS_TIPO procesos; si no, null. Es la puerta ÚNICA
   para usar el tipo de obra: la cruzan las dos frases de la pantalla (cuántas ganaron y dónde ofertaron los que ganaron). */
function tipoConBase(t, modalidad, tipo, grupo) {
  if (tramoConcentrado(t, modalidad, tipo, grupo)) return null;
  const r = t.resumen_tipo && t.resumen_tipo[modalidad] && t.resumen_tipo[modalidad][tipo];
  const g = r && r.por_grupo && r.por_grupo[grupo];
  return g && Number.isSafeInteger(g.procesos) && g.procesos >= MIN_PROCESOS_TIPO ? g : null;
}

/* EL CENSO DE CADA TRAMO (cuarta revisión adversaria, 28-oct-2026; lo hace el generador): {entidad, procesos, de, pct}
   si una sola entidad reúne más de `concentracion_max` de los procesos de ese tipo («*» = todos) en ese tramo. Medido:
   en menor cuantía con 10 o más oferentes, la Aerocivil reunía el 51,5 %. */
function tramoConcentrado(t, modalidad, tipo, grupo) {
  const c = t.tramos_concentrados && t.tramos_concentrados[modalidad] && t.tramos_concentrados[modalidad][tipo] && t.tramos_concentrados[modalidad][tipo][grupo];
  return c && Number.isFinite(c.pct) ? c : null;
}
const fraseTramoConcentrado = (modalidad, grupo, c) =>
  `En ${MODALIDADES[modalidad]}${TEXTO_GRUPO[grupo] ? ` ${TEXTO_GRUPO[grupo]}` : ""} una sola entidad reúne el ${deCada100(c.pct)} % de los procesos, y la cifra sería sobre todo la de esa entidad.`;

/* UNA SOLA VERIFICACIÓN para las dos frases de la pantalla (revisión adversaria, 28-oct-2026): la de año por año
   (2022-2026, cada año con la tabla de los anteriores), de SU tipo de obra si la cifra es de su tipo y la prueba tuvo
   100 procesos; si no, la de la modalidad. Con una tabla anterior sin ella, la de 2026. */
function verificacionDe(t, modalidad, tipoUsado) {
  const vv = t.verificacion_ventana;
  const dTipo = tipoUsado && vv && vv.por_tipo && vv.por_tipo[modalidad] && vv.por_tipo[modalidad][tipoUsado];
  if (dTipo && dTipo.procesos_prueba >= MIN_PROCESOS_TIPO && Number.isFinite(dTipo.mejora_pct)) {
    return { prueba: "año por año", procesos: dTipo.procesos_prueba, mejora_pct: dTipo.mejora_pct, poblacion: `${MODALIDADES[modalidad]} de ${nombreDeTipo(tipoUsado)}` };
  }
  const dMod = vv && vv.por_modalidad && vv.por_modalidad[modalidad];
  if (dMod && Number.isFinite(dMod.mejora_pct)) return { prueba: "año por año", procesos: dMod.procesos_prueba, mejora_pct: dMod.mejora_pct, poblacion: MODALIDADES[modalidad] };
  const d26 = t.verificacion && t.verificacion.por_modalidad && t.verificacion.por_modalidad[modalidad];
  if (d26 && Number.isFinite(d26.mejora_pct)) return { prueba: `con los procesos de ${t.verificacion.prueba}`, procesos: d26.procesos_prueba, mejora_pct: d26.mejora_pct, poblacion: MODALIDADES[modalidad] };
  return null;
}
/* La frase de la verificación: nombra la población probada y, por debajo de lo que se exige para dar un porcentaje
   (MEJORA_MINIMA_PCT, la regla escrita del 28-oct-2026), dice lo mismo para cualquier signo: entre −3 y +3 % la cifra
   es ruido o casi (−0,1 % en menor cuantía de edificaciones tiene un intervalo del 95 % de −0,6 a +0,3; revisión
   adversaria), y «no predijo» al lado de un «apenas predice» de la modalidad era un veredicto contra otro. */
const MEJORA_MINIMA_PCT = 3;
function fraseVerificacion(v, sujeto) {
  const donde = `probado ${v.prueba} en ${v.poblacion}`;
  const con = (x) => `${x > 0 ? "+" : x < 0 ? "−" : ""}${deCada100(Math.abs(x))}`;
  if (v.mejora_pct >= MEJORA_MINIMA_PCT) return `${donde}, ${sujeto} predijo al ganador un ${deCada100(v.mejora_pct)} % mejor que el azar.`;
  if (v.mejora_pct <= -MEJORA_MINIMA_PCT) return `${donde}, ${sujeto} predijo al ganador peor que el azar (${con(v.mejora_pct)} %).`;
  return `${donde}, ${sujeto} predijo al ganador casi igual que el azar (${con(v.mejora_pct)} %), lejos del ${MEJORA_MINIMA_PCT} % mejor que se exige para dar un porcentaje.`;
}
/* Por qué la cifra no es la de su tipo, dicho como es: concentrado en una entidad, o sin base suficiente. Con una
   tabla que no separa por tipo no se dice nada (sería un motivo falso). */
function porQueSinTipo(t, modalidad, tipo, grupo) {
  /* la concentración se dice solo si había base para contarlo aparte (`de`: los procesos antes de apartarlos); en un
     tramo de 5 procesos la razón es que son 5, no que 2 sean de una entidad (revisión adversaria) */
  const conc = t.tipos_concentrados && t.tipos_concentrados[modalidad] && t.tipos_concentrados[modalidad][tipo];
  if (conc && conc.de >= MIN_PROCESOS_TIPO) return `En ${nombreDeTipo(tipo)} una sola entidad reúne el ${deCada100(conc.pct)} % de los procesos: la cifra es la de todo tipo de obra.`;
  const concT = tramoConcentrado(t, modalidad, tipo, grupo);
  if (concT && concT.de >= MIN_PROCESOS_TIPO) return `En ${nombreDeTipo(tipo)} con ese número de oferentes una sola entidad reúne el ${deCada100(concT.pct)} % de los procesos: la cifra es la de todo tipo de obra.`;
  if (!t.celdas_tipo && !t.resumen_tipo) return null;
  return `En ${nombreDeTipo(tipo)} no hay ${MIN_PROCESOS_TIPO} procesos con ese número de oferentes para contarlo aparte.`;
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
/* La huella del vocabulario de tipos (cuarta revisión adversaria, 28-oct-2026): la tabla guarda la del vocabulario con
   que se clasificó y la suite exige que sea la de hoy; cambiar una palabra sin regenerar la tabla dejaría la pantalla
   llamando «vías» a lo que la tabla contó de otra manera. */
function huellaVocabulario() {
  const { TIPOS_DE_OBRA } = require("./semantica.js");
  return require("crypto").createHash("sha256").update(JSON.stringify(TIPOS_DE_OBRA.map((x) => [x.clave, x.nombre, x.re.source, x.re.flags]))).digest("hex");
}
const nombreDeTipo = (clave) => {
  const x = require("./semantica.js").TIPOS_DE_OBRA.find((y) => y.clave === clave);
  return x ? x.nombre : null;
};

/* La modalidad de una fila: el campo y su respaldo declarado (lib/proyeccion, `tipo_de_proceso`), como la leen
   lib/filtros y lib/probabilidad. Leer solo el primero hacía que la misma tarjeta dijera «no predijo» en la
   probabilidad y «aquí no da» en el margen (revisión adversaria, 28-oct-2026). */
const modalidadDeFila = (l) => (l && (l.modalidad_de_contratacion || l.tipo_de_proceso)) || null;
/* ¿En esta modalidad (el literal de SECOP) el precio, solo, apenas predice quién gana? La clave la da
   lib/guia_proceso (require diferido: cerraría un ciclo). Sin modalidad, no. */
function precioNoPrediceEn(modalidadLiteral) {
  if (!modalidadLiteral) return false;
  return cubreModalidad(require("./guia_proceso.js").modalidadEnLlano(String(modalidadLiteral)).clave);
}

module.exports = { MIN_OFERTAS, MIN_PROCESOS_TIPO, MEJORA_MINIMA_PCT, PUNTOS_BAJAR, MODALIDADES, cubreModalidad, modalidadDeFila, precioNoPrediceEn, tipoDeObra, nombreDeTipo, huellaVocabulario, frecuenciaPorPrecio, rangoGanadores, masBajaGano, tabla, grupoDe, franjaDe,
  _olvidar: () => { _tabla = undefined; } };   // la suite: leer otra tabla
