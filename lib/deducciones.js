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

   ── LO QUE SE PIERDE Y LO QUE VUELVE SON DOS COSAS (ago 2026) ─────────────
   Un booleano `ya_en_el_motor` mezclaba DOS razones distintas para no sumar un
   concepto —«el motor ya lo aplica» y «vuelve, no es pérdida»— y dejaba en la
   cubeta de pérdida real dos retenciones que NO lo son:

   · RETENCIÓN EN LA FUENTE (2 % en construcción, art. 1.2.4.9.1 D. 1625/2016):
     es un ANTICIPO del impuesto de RENTA, que grava la UTILIDAD y no el
     ingreso. Se cruza contra el impuesto del año en la declaración. Restarla
     del margen de la obra la cobra como si fuera un costo Y deja al contribuyente
     pagando renta dos veces sobre lo mismo. Sobre un contrato de $3.216 M son
     $64,3 M — el DOBLE de la cifra que abrió esta auditoría.
   · RETENCIÓN DE IVA: el IVA no es plata del contratista en ningún momento, y
     lo retenido se cruza en su propia declaración. Cero pérdida.

   Se conserva como COSTO REAL el ReteICA, y la razón es distinta a las dos de
   arriba: el ICA se debe igual sobre el ingreso de esa actividad en ese
   municipio, así que la retención es el cobro anticipado de un impuesto que sí
   se pierde. La aproximación (tarifa de retención ≈ tarifa de ICA) se declara.

   Por eso `naturaleza` («costo» | «caja») es el eje principal y
   `ya_en_el_motor` queda como nota ortogonal. `total_aplicable_pct` suma solo
   los COSTOS que el motor no aplica ya; `total_caja_pct` viaja aparte para que
   la interfaz pueda enseñarlo como impacto de CAJA, jamás restado de la
   utilidad. Es «sin dato vs cero» aplicado a la naturaleza de un descuento.
   ========================================================================== */
"use strict";

const { lineasConPagina } = require("./paginas.js");

/* ORDEN IMPORTA: lo más específico primero. «retención de garantía» antes que
   «retención», «estampilla pro-…» antes que «estampilla» a secas. */
const CONCEPTOS = [
  { id: "contribucion_obra", etiqueta: "Contribución especial de obra pública (5 %)",
    re: /contribuci[oó]n\s+(?:especial\s+)?(?:de\s+)?obra|contribuci[oó]n\s+del?\s+cinco/i,
    naturaleza: "costo", ya_en_el_motor: true,
    nota: "Pérdida real. El motor ya la descuenta por su cuenta: no la escriba otra vez." },
  /* La retegarantía NO es una deducción que se pierda: se devuelve al liquidar,
     y el motor ya la modela (`RETEGARANTIA_PCT`). Sumarla a `deducciones_pct`
     la cobraría dos veces Y como si no volviera. */
  { id: "retegarantia", etiqueta: "Retención de garantía",
    re: /retenci[oó]n\s+(?:en|de)\s+garant[ií]a|reteg[au]arant/i,
    naturaleza: "caja", ya_en_el_motor: true,
    nota: "Se la devuelven al liquidar el contrato: aprieta la caja, no el margen." },
  { id: "reteica", etiqueta: "ReteICA (industria y comercio)",
    re: /reteica|retenci[oó]n\s+de\s+industria\s+y\s+comercio|\bica\b(?=[^%]{0,40}%)/i,
    naturaleza: "costo",
    nota: "Pérdida real: el ICA se debe igual sobre lo facturado en ese municipio, "
      + "así que la retención es el cobro anticipado de un impuesto que no vuelve." },
  /* SU PORCENTAJE NO ESTÁ SOBRE EL VALOR DEL CONTRATO: es un % del IVA
     facturado, y en construcción el IVA se causa solo sobre la utilidad (art. 3
     D. 1372/1992). Sumar ese 15 % junto a un 2 % de retefuente daría un «17 %»
     que no significa nada. Se lee y se publica, pero NO entra en ningún total:
     un total que mezcla dos bases es una cifra falsa con aspecto de suma. */
  { id: "reteiva", etiqueta: "Retención de IVA", re: /reteiva|retenci[oó]n\s+de\s+iva/i,
    naturaleza: "caja", base: "impuesto",
    nota: "El IVA nunca fue plata suya: lo retenido se cruza en su declaración de IVA. "
      + "Además su porcentaje va sobre el impuesto, no sobre el valor del contrato." },
  { id: "retefuente", etiqueta: "Retención en la fuente",
    re: /retefuente|retenci[oó]n\s+en\s+la\s+fuente/i,
    naturaleza: "caja",
    nota: "Es un anticipo del impuesto de renta, que se paga sobre la ganancia y no sobre "
      + "lo facturado: se lo cruzan en la declaración del año. Restarlo del margen de la obra "
      + "sería cobrarle la renta dos veces." },
  { id: "estampilla", etiqueta: "Estampillas departamentales y municipales",
    re: /estampilla/i, multiple: true, naturaleza: "costo",
    nota: "Pérdida real. Las fija cada ordenanza o acuerdo del lugar de ejecución." },
  { id: "tasa_prodeporte", etiqueta: "Tasa pro-deporte / pro-cultura",
    re: /pro\s*-?\s*(?:deporte|cultura|anciano|bienestar|hospital|universidad|electrificaci)/i,
    multiple: true, naturaleza: "costo", nota: "Pérdida real." },
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
        /* «costo» se pierde; «caja» vuelve o se cruza. Sin naturaleza declarada
           se asume COSTO: ante la duda no se promete de más. */
        naturaleza: c.naturaleza === "caja" ? "caja" : "costo",
        /* Sobre qué se aplica el porcentaje. Solo los de base «valor» pueden
           sumarse entre sí; los demás se publican y se dejan fuera de todo
           total. Sin base declarada se asume «valor», que es el caso normal. */
        base: c.base === "impuesto" ? "impuesto" : "valor",
        nota_naturaleza: c.nota || null,
        ya_en_el_motor: !!c.ya_en_el_motor,
        evidencia: String(linea).trim().slice(0, 160),
        pagina: pagina == null ? null : pagina,
      });
      vistos.add(c.id);
    }
  }
  const red2 = (n) => Math.round(n * 100) / 100;
  /* SOLO SE SUMA LO QUE COMPARTE BASE. Un total que mezcla «2 % del contrato»
     con «15 % del IVA» no es una suma: es un número inventado con forma de
     cifra. Los de otra base viajan en `conceptos` con su `base` para poder
     enseñarlos aparte, y se cuentan para que su ausencia del total no parezca
     un olvido. */
  const sobreValor = conceptos.filter((c) => c.base === "valor");
  const total = sobreValor.reduce((a, c) => a + c.pct, 0);
  /* Lo que hay que TECLEAR en `deducciones_pct`: solo lo que es PÉRDIDA REAL y
     que el motor no aplica ya. La contribución se cae por lo segundo; la
     retención en la fuente, la de IVA y la de garantía se caen por lo primero
     —vuelven o se cruzan— y meterlas aquí restaría del margen una plata que el
     contratista recupera. */
  const esCosto = (c) => c.naturaleza !== "caja";
  const aplicable = sobreValor.filter((c) => esCosto(c) && !c.ya_en_el_motor).reduce((a, c) => a + c.pct, 0);
  /* Aparte y con su nombre: aprieta la CAJA (hay que financiar la obra mientras
     vuelve), no el margen. Se publica para poder enseñarlo sin restarlo. */
  const caja = sobreValor.filter((c) => !esCosto(c)).reduce((a, c) => a + c.pct, 0);
  return {
    conceptos,
    total_pct: sobreValor.length ? red2(total) : null,
    conceptos_en_otra_base: conceptos.length - sobreValor.length,
    total_aplicable_pct: sobreValor.length ? red2(aplicable) : null,
    total_caja_pct: sobreValor.length ? red2(caja) : null,
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
