"use strict";
/* ============================================================================
   lib/recalculo_informe · ¿CALCULÓ BIEN LA ENTIDAD EL PUNTAJE DE PRECIO? (PLAN_X20, tanda 14, pieza 6.6, 12-nov-2026)
   ----------------------------------------------------------------------------
   Sobre la captura VERIFICADA de un informe de evaluación (lib/evaluacion.verificarCaptura: cada cifra está en su cita),
   recalcula el puntaje de precio de las ofertas hábiles con el motor de la aplicación (lib/metodos_ponderacion, la casa
   única de los cuatro métodos del documento tipo, con la regla D1) y dice:
   · si el puntaje publicado y el recalculado difieren en más de 0,01 (los informes publican dos decimales);
   · si, cambiando solo el puntaje de precio en el total publicado, cambiaría el primer lugar;
   · y un borrador de observación al informe, para revisarlo y radicarlo dentro del plazo de traslado.
   No recalcula (y dice por qué) si la captura no está completa, si hay menos de dos hábiles, si a un hábil le falta el
   valor o el puntaje de precio, o si no se sabe el método: ni el del informe ni el de la TRM que el informe cita. Con un
   método fuera de los cuatro del documento tipo («otro») no se calcula: la tabla de ese pliego la lee la guía (tanda 9).
   El puntaje máximo es el mayor publicado, si es uno de los del documento tipo: en los cuatro métodos la oferta mejor
   ubicada recibe el máximo (con D1, también en las medias). PURO: sin red ni Redis.
   ============================================================================ */

const ME = require("./metodos_ponderacion.js");

const TOL = 0.01 + 1e-9;
const MAXIMOS = Object.freeze([...Object.values(ME.PUNTAJE_MAXIMO), 49.75]);   // 49,75: tabla de la convocatoria limitada a Mipyme (lib/puntaje_pliego)
const NOMBRE = Object.freeze({ mediana: "mediana", geometrica: "media geométrica", aritmetica_baja: "media aritmética baja", menor_valor: "menor valor" });
const dec = (n, d = 2) => (Math.round(n * 10 ** d) / 10 ** d).toLocaleString("es-CO", { minimumFractionDigits: d, maximumFractionDigits: d });

function recalcularInforme(captura) {
  const no = (motivo) => ({ recalculable: false, motivo });
  const k = captura && typeof captura === "object" ? captura : null;
  if (!k || k.documento_util !== true || !Array.isArray(k.ofertas)) return no("no hay una evaluación leída");
  if (k.completa !== true) return no("la lectura del informe no está completa: con una oferta de menos el recálculo saldría al revés");
  const habiles = k.ofertas.filter((o) => o && o.estado === "habil");
  if (habiles.length < 2) return no("hay menos de dos ofertas hábiles");
  if (!habiles.every((o) => typeof o.valor === "number" && o.valor > 0 && typeof o.puntaje_precio === "number")) return no("a una oferta hábil le falta el valor o el puntaje de precio en el informe");
  let metodo = ME.METODOS.includes(k.metodo) ? k.metodo : null, fuente = metodo ? "informe" : null;
  if (!metodo && k.trm && typeof k.trm.valor === "number") { metodo = ME.metodoPorTrm(k.trm.valor); fuente = metodo ? "trm" : null; }
  if (!metodo) return no(k.metodo === "otro" ? "el informe usa un método que no es de los cuatro del documento tipo" : "el informe no dice el método ni la TRM con que se eligió");
  /* el máximo: el mayor publicado, y solo si es uno de los del documento tipo (49,5 en menor cuantía, 48,5 en licitación, 49,75
     en la convocatoria limitada a Mipyme). Si la entidad no le dio el máximo a nadie, no se sabe cuál era: escalar con el
     mayor publicado marcaría como erradas todas las demás (un falso positivo en una observación) */
  const max = Math.max(...habiles.map((o) => o.puntaje_precio));
  if (!MAXIMOS.some((m) => Math.abs(m - max) <= 0.01)) return no(`el mayor puntaje de precio publicado (${dec(max)}) no es un máximo del documento tipo: no se sabe sobre cuántos puntos se calculó`);
  const calc = ME.puntajes(habiles.map((o) => o.valor), metodo, max);
  if (!calc) return no("el motor no pudo calcular con esos valores");
  const filas = habiles.map((o, i) => ({ oferente: o.oferente, valor: o.valor, publicado: o.puntaje_precio, calculado: calc[i], diferencia: Math.round((calc[i] - o.puntaje_precio) * 1e4) / 1e4 }));
  const difieren = filas.filter((f) => Math.abs(f.calculado - f.publicado) > TOL);
  // el orden: solo con el total publicado de TODOS los hábiles; se cambia solo el puntaje de precio
  let ordenPublicado = null, ordenRecalculado = null, cambiaElPrimero = null;
  if (habiles.every((o) => typeof o.puntaje_total === "number")) {
    const tot = habiles.map((o, i) => ({ oferente: o.oferente, publicado: o.puntaje_total, recalculado: Math.round((o.puntaje_total - o.puntaje_precio + calc[i]) * 1e6) / 1e6 }));
    ordenPublicado = tot.slice().sort((a, b) => b.publicado - a.publicado).map((x) => x.oferente);
    ordenRecalculado = tot.slice().sort((a, b) => b.recalculado - a.recalculado).map((x) => x.oferente);
    const topR = tot.slice().sort((a, b) => b.recalculado - a.recalculado);
    const empateArriba = topR.length > 1 && Math.abs(topR[0].recalculado - topR[1].recalculado) <= TOL;
    cambiaElPrimero = empateArriba ? null : ordenPublicado[0] !== ordenRecalculado[0];
  }
  const nombreM = NOMBRE[metodo];
  const deDonde = fuente === "trm" ? `el método que corresponde a la TRM que cita el informe (${nombreM})` : `el método del informe (${nombreM})`;
  const frase = !difieren.length
    ? `Con ${deDonde} y los valores publicados, el puntaje de precio de las ${habiles.length} ofertas hábiles da lo mismo que publicó la entidad.`
    : `Con ${deDonde} y los valores publicados, el puntaje de precio da distinto en ${difieren.length} de ${habiles.length} ofertas hábiles: ${difieren.slice(0, 4).map((f) => `${f.oferente}, publicado ${dec(f.publicado)} y recalculado ${dec(f.calculado)}`).join("; ")}.`
      + (cambiaElPrimero === true ? ` Con esa corrección el primer lugar pasaría de ${ordenPublicado[0]} a ${ordenRecalculado[0]}.` : cambiaElPrimero === false ? " El primer lugar no cambia." : "");
  /* el borrador: tercera persona, cifras en dígitos, sin citar normas; lo que no se sabe (el número del informe, la fecha) va entre corchetes */
  const observacion = difieren.length
    ? [`Se solicita a la entidad revisar el puntaje asignado al factor precio en el informe de evaluación [número y fecha del informe].`,
      `Aplicando ${fuente === "trm" ? `el método de ${nombreM}, que corresponde a la TRM citada en el informe,` : `el método de ${nombreM} señalado en el informe`} a los valores de las ${habiles.length} ofertas hábiles consignados en el mismo informe, ${difieren.map((f) => `a ${f.oferente} le corresponden ${dec(f.calculado, 4)} puntos y no ${dec(f.publicado, 2)}`).join("; ")}.`,
      cambiaElPrimero === true ? `Adicionalmente, con esa corrección el primer lugar del orden de elegibilidad corresponde a ${ordenRecalculado[0]} y no a ${ordenPublicado[0]}.` : null,
      `Se solicita publicar la memoria de cálculo del factor precio y ajustar el informe.`].filter(Boolean).join(" ")
    : null;
  return { recalculable: true, metodo, fuente_metodo: fuente, puntaje_maximo: max, filas, difieren: difieren.length, cambia_el_primero: cambiaElPrimero, orden_publicado: ordenPublicado, orden_recalculado: ordenRecalculado, frase, observacion };
}

module.exports = { recalcularInforme };
