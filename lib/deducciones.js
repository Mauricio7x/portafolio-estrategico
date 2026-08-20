/* lib/deducciones.js · Qué le van a descontar de cada pago, leído del PLIEGO
   ─────────────────────────────────────────────────────────────────────────────
   El motor de rentabilidad ya descuenta la contribución del 5 %, pero las
   ESTAMPILLAS, el ReteICA y las retenciones las fija cada ordenanza departamental
   o acuerdo municipal y cambian de un municipio a otro. Hasta ahora entraban como
   un solo porcentaje que el usuario teclea (`deducciones_pct`), y por defecto iba
   VACÍO: por eso todo presupuesto declara su margen como COTA SUPERIOR. Ese
   bloque puede rondar el 10 % del valor —más que el margen típico de obra—, así
   que su ausencia puede invertir el signo de la decisión.

   No hay tabla nacional que copiar y este entorno no alcanza los portales
   departamentales, así que el dato se saca de donde SIEMPRE está y es
   vinculante: la cláusula de deducciones del pliego del proceso al que uno se va
   a presentar. Es además la fuente que la doctrina del proyecto exige («sale del
   pliego, no se estima»).

   Mismo patrón que `lib/cronograma`: regex por LÍNEA sobre el texto ya extraído,
   y cada concepto viaja con su EVIDENCIA (la línea literal) y su PÁGINA, para
   que se pueda auditar sin volver a abrir el PDF.

   TRES REGLAS, y las tres son la doctrina de la casa:
   · Lo que el pliego no diga NO SE INVENTA: no aparece, y `total_pct` es la suma
     de lo LEÍDO, declarada como incompleta por construcción.
   · El porcentaje se busca JUNTO A SU CONCEPTO, no como «el primer % de la
     línea»: «la retención en la fuente del 2,5 % y la estampilla del 1 %» son
     dos datos, y tomar el primero se los atribuiría los dos al mismo. Es la
     lección de `leerAnticipo`, que declaraba un anticipo del 25 % leyendo el AIU.
   · La CONTRIBUCIÓN del 5 % se reconoce pero se marca `ya_en_el_motor`: el
     motor la aplica por su cuenta, así que sumarla otra vez la cobraría dos
     veces. Es `total_procesos`/`procesos_contados` en pesos.
   ========================================================================== */
"use strict";

const { lineasConPagina } = require("./paginas.js");

/* ORDEN IMPORTA: lo más específico primero. «retención de garantía» antes que
   «retención», «estampilla pro-…» antes que «estampilla» a secas. */
const CONCEPTOS = [
  { id: "contribucion_obra", etiqueta: "Contribución especial de obra pública (5 %)",
    re: /contribuci[oó]n\s+(?:especial\s+)?(?:de\s+)?obra|contribuci[oó]n\s+del?\s+cinco/i,
    ya_en_el_motor: true },
  /* La retegarantía NO es una deducción que se pierda: se devuelve al liquidar,
     y el motor ya la modela (`RETEGARANTIA_PCT`). Sumarla a `deducciones_pct`
     la cobraría dos veces Y como si no volviera. */
  { id: "retegarantia", etiqueta: "Retención de garantía (se devuelve al liquidar)",
    re: /retenci[oó]n\s+(?:en|de)\s+garant[ií]a|reteg[au]arant/i,
    ya_en_el_motor: true },
  { id: "reteica", etiqueta: "ReteICA (industria y comercio)",
    re: /reteica|retenci[oó]n\s+de\s+industria\s+y\s+comercio|\bica\b(?=[^%]{0,40}%)/i },
  { id: "reteiva", etiqueta: "Retención de IVA", re: /reteiva|retenci[oó]n\s+de\s+iva/i },
  { id: "retefuente", etiqueta: "Retención en la fuente",
    re: /retefuente|retenci[oó]n\s+en\s+la\s+fuente/i },
  { id: "estampilla", etiqueta: "Estampillas departamentales y municipales",
    re: /estampilla/i, multiple: true },
  { id: "tasa_prodeporte", etiqueta: "Tasa pro-deporte / pro-cultura",
    re: /pro\s*-?\s*(?:deporte|cultura|anciano|bienestar|hospital|universidad|electrificaci)/i, multiple: true },
];

/* El porcentaje ADYACENTE al concepto, no el primero de la línea. Se mira el
   tramo que empieza donde casó el concepto: así «retención en la fuente del
   2,5 % y estampilla del 1 %» da 2,5 a la retención, y la estampilla la lee su
   propia entrada con SU tramo. Se admite «2,5 %», «2.5%», «del 1 por ciento». */
const PCT_RE = /(\d{1,2}(?:[.,]\d{1,3})?)\s*(?:%|por\s+ciento)/i;

function porcentajeJuntoA(linea, desde) {
  const tramo = String(linea).slice(desde, desde + 120);
  const m = PCT_RE.exec(tramo);
  if (!m) return null;
  const n = Number(String(m[1]).replace(",", "."));
  /* Un 0 aquí es SIN DATO, no «no descuentan nada», y por encima de 30 no es un
     descuento de ley: es otra cifra de la línea (un plazo, un anticipo). */
  if (!Number.isFinite(n) || n <= 0 || n > 30) return null;
  /* La POSICIÓN del porcentaje dentro de la línea, para que dos conceptos que
     casen con el mismo texto no se lo apunten los dos. */
  return { pct: n, at: desde + m.index };
}

/* Lee la cláusula de deducciones del texto de un pliego.
   → { conceptos, total_pct, total_aplicable_pct, incompleto, lineas_sin_porcentaje } */
function leerDeducciones(texto) {
  const lineas = lineasConPagina(texto);
  const conceptos = [];
  const vistos = new Set();
  let sinPorcentaje = 0;
  for (const { linea, pagina } of lineas) {
    /* SE MIRAN TODOS LOS CONCEPTOS DE LA LÍNEA, no solo el primero. «la retención
       en la fuente del 2,5 % y la estampilla Pro-Cultura del 1 %» es una línea y
       son DOS datos: cortar en el primero perdía el segundo en silencio. Cada uno
       busca su porcentaje desde SU posición, así que no se roban la cifra. */
    /* UN MISMO PORCENTAJE NO PUEDE CONTARSE DOS VECES. «estampilla Pro-Cultura
       del 1 %» casa con `estampilla` Y con `tasa_prodeporte` —son la misma cosa
       dicha de dos maneras— y sin esta guarda el 1 % se sumaba dos veces: un
       descuento inflado da un margen falso, que es justo lo que este módulo
       existe para evitar. Se marca la POSICIÓN reclamada, así que la guarda vale
       para cualquier solape futuro entre conceptos, no solo para este par. Gana
       el primero de `CONCEPTOS`, que es el más específico (el orden importa). */
    const reclamados = new Set();
    for (const c of CONCEPTOS) {
      const m = c.re.exec(linea);
      if (!m) continue;
      if (vistos.has(c.id) && !c.multiple) continue;
      const hallado = porcentajeJuntoA(linea, m.index + m[0].length);
      if (hallado == null) { sinPorcentaje++; continue; }
      if (reclamados.has(hallado.at)) continue;
      reclamados.add(hallado.at);
      conceptos.push({
        id: c.id, etiqueta: c.etiqueta, pct: hallado.pct,
        ya_en_el_motor: !!c.ya_en_el_motor,
        evidencia: String(linea).trim().slice(0, 160),
        pagina: pagina == null ? null : pagina,
      });
      vistos.add(c.id);
    }
  }
  const red2 = (n) => Math.round(n * 100) / 100;
  const total = conceptos.reduce((a, c) => a + c.pct, 0);
  /* Lo que hay que TECLEAR en `deducciones_pct`: todo menos lo que el motor ya
     aplica solo. Sumar la contribución aquí la cobraría dos veces. */
  const aplicable = conceptos.filter((c) => !c.ya_en_el_motor).reduce((a, c) => a + c.pct, 0);
  return {
    conceptos,
    total_pct: conceptos.length ? red2(total) : null,
    total_aplicable_pct: conceptos.length ? red2(aplicable) : null,
    lineas_sin_porcentaje: sinPorcentaje,
    /* SIEMPRE incompleto por construcción: se lee lo que el pliego escribe, y un
       pliego puede callar una estampilla que igual le van a descontar. La cifra
       es una COTA INFERIOR de lo que le van a retener, y hay que decirlo. */
    incompleto: true,
    nota: conceptos.length
      ? "Leído del pliego: es lo que ESE documento declara. Puede faltar alguna estampilla que no aparezca "
        + "en el texto, así que tómelo como cota inferior y confírmelo en la minuta antes de firmar."
      : "El pliego no declara deducciones en un formato reconocible. No se inventa ninguna: el margen "
        + "seguirá viajando como cota superior hasta que las cargue a mano.",
  };
}

module.exports = { leerDeducciones, CONCEPTOS };
