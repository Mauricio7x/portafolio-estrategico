"use strict";
/* ============================================================================
   lib/competencia_por_tamano · ¿Cuántas ofertas llegan a los procesos de este tamaño en esta entidad?
   ----------------------------------------------------------------------------
   PLAN_X20, tanda 1 (11-nov-2026). PURO: sin red ni Redis. Lo llaman el índice de competencia
   (lib/indice_competencia, que acumula y publica) y la medición del plan
   (tools/analisis/plan_x20/medir.js, que lo prueba fuera de muestra): la MISMA regla en los dos.

   Dos cosas distintas, con nombres distintos:
   · EL HECHO (`frasePorTamano`): de los procesos adjudicados de ESTA entidad, en esta modalidad y
     en este tamaño de presupuesto, cuántos tuvieron una sola oferta, cuántos una o dos. Es un
     conteo: «Una sola oferta en 9 de sus 11 procesos de menor cuantía de $150 a $300 millones».
   · EL ANUNCIO (`anunciarPoca`): la proporción ESPERADA de procesos con una o dos ofertas, con el
     historial de la entidad en ese tamaño encogido hacia la entidad entera, hacia su departamento en
     ese tamaño y hacia el país en ese tamaño (K = 4 procesos «virtuales» en cada nivel). No se
     enseña como cifra: solo ORDENA «Las menos peleadas». Medido el 11-nov-2026 en menor cuantía de
     obra (aprende con 2024-2025, prueba con 2026): donde anunció 80 % o más, en 760 procesos de
     entidades con 4 o más previos, el 90,7 % tuvo una o dos ofertas (docs/PLAN_X20.md § 2.3).
     Se publica solo donde se midió y resistió (`MODALIDADES_ANUNCIO`). Medido otra vez el
     11-nov-2026 con la población que cuenta Detekta (`cuentaParaCompetencia` y `oferentesDe`,
     tools/analisis/plan_x20/poblacion.js y poblacion_2026-11-11.json): donde dijo 80 % o más
     acertó en menor cuantía 89,9 % (907 procesos), en mínima cuantía 91,6 % (311) y en régimen
     especial 96,4 % (110); en licitación 72,7 % (44): NO se publica allí. Directa con ofertas
     acierta 98,3 %, pero sin regla ya es 98,8 %: no informa y tampoco se publica.
   Cortes de tamaño: los de la medición (menos de $150 millones, 150-300, 300-500, 500-1.000 y más
   de 1.000), en pesos del presupuesto publicado.
   ============================================================================ */

const CORTES_TAMANO = [150e6, 300e6, 500e6, 1000e6];
const ROTULOS_TAMANO = [
  "de menos de $150 millones", "de $150 a $300 millones", "de $300 a $500 millones",
  "de $500 a $1.000 millones", "de más de $1.000 millones",
];
const K = 4;                    // encogimiento: procesos «virtuales» con la tasa del nivel de arriba
const MIN_HISTORIAL = 4;        // la entidad «tiene historial» con 4 o más procesos contados (en la modalidad)
const UMBRAL_POCA = 0.8;        // anuncio de poca competencia (una o dos ofertas)
const UMBRAL_MUCHA = 0.3;       // anuncio de mucha competencia
const MODALIDADES_ANUNCIO = Object.freeze(["abreviada", "minima", "especial"]);
const MODALIDAD_EN_FRASE = Object.freeze({
  abreviada: "de menor cuantía", licitacion: "de licitación", minima: "de mínima cuantía",
  especial: "de régimen especial", meritos: "de concurso de méritos", subasta: "de subasta",
  directa: "de contratación directa",
});

/* Tramo del presupuesto (0..4), o null sin presupuesto: «sin dato» no es el tramo más chico. */
function tramoTamano(presupuesto) {
  if (presupuesto == null || presupuesto === "") return null;
  const v = Number(presupuesto);
  if (!Number.isFinite(v) || v <= 0) return null;
  let i = 0;
  while (i < CORTES_TAMANO.length && v >= CORTES_TAMANO[i]) i++;
  return i;
}

/* La clave del segmento «modalidad|tramo», o null si falta cualquiera de las dos. */
function claveSegmento(modalidad, tramo) {
  return modalidad && modalidad !== "otra" && Number.isInteger(tramo) ? `${modalidad}|${tramo}` : null;
}

/* Suma un proceso con `ofertas` (entero ≥ 1) a un contador [procesos, una_o_dos, una]. */
function sumarOfertas(c, ofertas) {
  c[0]++;
  if (ofertas <= 2) c[1]++;
  if (ofertas === 1) c[2]++;
  return c;
}

/* (aciertos + K·previa) / (n + K); sin previa (null) no hay anuncio. */
const encoger = (n, poca, previa) => (previa == null ? null : (poca + K * previa) / (n + K));
const tasa = (c) => (c && c[0] > 0 ? c[1] / c[0] : null);

/* EL ANUNCIO, en cuatro niveles. Cada argumento es un contador [procesos, una_o_dos, …]:
     modalidad   todos los procesos de esa modalidad en el país
     tamano      los de esa modalidad y ese tramo en el país
     depto       los de esa modalidad y ese tramo en el departamento de la entidad
     entidad     los de la entidad en esa modalidad, de cualquier tamaño
     entidadTam  los de la entidad en esa modalidad y ese tramo
   Devuelve {base, tamano, depto, entidad} (las tasas de cada nivel; `entidad` es el anuncio), o
   null si no hay ni la base del país. Es la regla de `modeloCompetencia` de la medición del plan. */
function anunciarPoca({ modalidad, tamano, depto, entidad, entidadTam }) {
  const base = tasa(modalidad);
  if (base == null) return null;
  const pTam = tasa(tamano) ?? base;
  const d = depto || [0, 0];
  const pDep = encoger(d[0], d[1], pTam);
  const e = entidad || [0, 0];
  const pEntGen = encoger(e[0], e[1], pDep);
  const t = entidadTam || [0, 0];
  const pEnt = encoger(t[0], t[1], pEntGen);
  return { base, tamano: pTam, depto: pDep, entidad: pEnt };
}

/* EL HECHO en una frase, o null si la entidad tiene menos de MIN_HISTORIAL procesos de ese tamaño.
   Dice la clase que tiene MÁS de la mitad, con su conteo, sin porcentajes ni promedios. Sin clase
   mayoritaria (un empate a la mitad) dice el reparto entero: presentar como «lo que pasa aquí» una
   mitad, y siempre hacia la poca competencia, era cierto y engañoso (revisión adversaria del
   11-nov-2026: [6, 3, 3] decía «Una sola oferta en 3 de sus 6»). */
function frasePorTamano(contador, modalidad, tramo) {
  if (!Array.isArray(contador)) return null;
  const [n, poca, una] = contador;
  if (!(n >= MIN_HISTORIAL) || !Number.isInteger(tramo) || !ROTULOS_TAMANO[tramo]) return null;
  const donde = [MODALIDAD_EN_FRASE[modalidad], ROTULOS_TAMANO[tramo]].filter(Boolean).join(" ");
  const de = (k) => `en ${k} de sus ${n} procesos ${donde}`;
  if (una > n / 2) return `Una sola oferta ${de(una)}.`;
  if (poca > n / 2) return `Una o dos ofertas ${de(poca)}.`;
  if (n - poca > n / 2) return `Tres ofertas o más ${de(n - poca)}.`;
  const dos = poca - una, mas = n - poca;
  const partes = [[una, "con una sola oferta"], [dos, "con dos"], [mas, "con tres o más"]].filter(([k]) => k > 0).map(([k, t]) => `${k} ${t}`);
  return `De sus ${n} procesos ${donde}: ${partes.length > 1 ? `${partes.slice(0, -1).join(", ")} y ${partes[partes.length - 1]}` : partes[0]}.`;
}

module.exports = {
  CORTES_TAMANO, ROTULOS_TAMANO, K, MIN_HISTORIAL, UMBRAL_POCA, UMBRAL_MUCHA, MODALIDADES_ANUNCIO, MODALIDAD_EN_FRASE,
  tramoTamano, claveSegmento, sumarOfertas, anunciarPoca, frasePorTamano,
};
