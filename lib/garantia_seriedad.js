/* lib/garantia_seriedad.js · EL PORCENTAJE DE LA GARANTÍA DE SERIEDAD QUE FIJA EL PLIEGO (28-sep-2026)
   ─────────────────────────────────────────────────────────────────────────────
   La guía decía siempre «normalmente el 10 % del presupuesto». Los pliegos fijan
   el suyo, y muchos traen OTRO para las Mipyme: el Decreto 1082 de 2015, art.
   2.2.1.2.4.2.18 (adicionado por el Decreto 1860 de 2021), tal como lo citan los
   propios pliegos, deja a cada entidad fijar un valor menor para ellas. Medido en
   pliegos reales: 5 % (Mosquera, CO1.REQ.11033801, frente al 10 % general), 8 %,
   10 % frente a 15 %, 10 % frente a 11 %. No hay una cifra que se pueda suponer:
   se LEE, con su página.

   Tres formas reales de escribirlo:
     · la cifra y DESPUÉS a quién aplica: «Quince por ciento (15%) del valor total
       del presupuesto oficial, para aquellos proponentes que no acrediten los
       criterios diferenciales… MiPymes. Diez por ciento (10%) … para aquellos que
       acrediten…»;
     · a quién aplica ANTES de la cifra: «…por el proponente que ostente la
       calidad de Mipyme: … Cuantía: Cinco por ciento (5%) del TOTAL DEL
       PRESUPUESTO OFICIAL ESTIMADO.»;
     · en tabla: «Para proponentes que sean … MiPymes. 10% del valor del
       presupuesto …  Para los demás proponentes … 11% …».
   Por eso cada porcentaje se clasifica con el resto de SU frase (hasta el punto o
   el porcentaje siguiente) y, si ahí no dice a quién aplica, con lo que va entre
   el porcentaje anterior y él.

   LO QUE NO SE HACE, a propósito:
     · el porcentaje de «emprendimientos y empresas de mujeres» (sin Mipyme en la
       misma frase) NO es el de las Mipyme: es otro criterio diferencial;
     · el 10 % de «participación igual o superior al diez por ciento (10%) en el
       consorcio» no es un valor asegurado: no va seguido del presupuesto
       (`ASEGURADO_RE`), y tampoco el de otros amparos («del valor del contrato»);
     · dos cifras distintas para la misma clase (por lotes, o el pliego se
       contradice) no se escogen: queda `null` con `ambiguo`.
   El falso caro es una garantía MENOR a la exigida (la oferta se rechaza y no se
   corrige): ante la duda, nada; quien lo use se queda con la general. */
"use strict";

const PCT_RE = /\(?\s*(\d{1,2}(?:[.,]\d{1,2})?)\s*%\s*\)?/g;
/* la seriedad se asegura sobre el PRESUPUESTO (o el valor de la oferta); «del valor del contrato»
   es de los otros amparos (cumplimiento, estabilidad, calidad, salarios) */
const ASEGURADO_RE = /^(?:[^%.;]|\.(?=\S)){0,40}?(?:presupuesto|valor\s+(?:total\s+)?(?:de\s+la|del?)\s+(?:oferta|propuesta)|valor\s+total\s+del\s+presupuesto)/i;
/* un umbral de corrección o de rechazo no es un valor asegurado: «la diferencia entre el valor inicial
   y el corregido supera el tres por ciento (3%) del valor original. 7) Cuando el valor de la oferta…»
   (CO1.REQ.8770163), «si al ser corregida varía en más del cinco por ciento (5%) del valor de la
   propuesta» (CO1.REQ.11081429) */
const UMBRAL_RE = /\b(?:errore?s?|sobrepas\w*|debajo|artificial\w*|reducci[oó]n|descuento|experiencia|facturaci[oó]n|destina[nr]?|supera[nr]?|exced\w*|var[ií]a[nr]?|variaci[oó]n|diferencia|desviaci[oó]n|correcci[oó]n|corregid[oa]s?)\b[^.;]{0,70}$/i;
const MIPYME_RE = /mi\s*pymes?\b|micro,?\s+pequeñ|mipyme/i;
/* los OTROS criterios diferenciales (D. 1860 de 2021: emprendimientos y empresas de mujeres; y las de
   personas con discapacidad, que citan los pliegos de 2026): su cifra no es la de todos ni la de las
   Mipyme (CO1.REQ.10262430: 9 % «EMPRESA DE PERSONAS CON DISCAPACIDAD» leído como general) */
/* …y la cifra que solo dice «criterio (habilitante) diferencial», sin a quién: nunca es la de todos
   («…la entidad establece como criterio diferencial el valor de la garantía… Cinco por ciento (5%)»,
   segunda revisión adversaria) */
const MUJERES_RE = /mujeres|discapacidad|criterios?\s+(?:habilitantes?\s+)?diferencial/i;
/* «no ostente / no acrediten / no sean … Mipyme», «los demás proponentes» */
const NO_MIPYME_RE = /\b(?:no|ni)\s+(?:\S+\s+){0,3}?(?:(?:ostent|acredit|demuestr|sea|sean|tenga|tengan|cumpl)\S*|ser(?![\wáéíóúñ]))[^.;]{0,160}?(?:mi\s*pymes?|mipyme)|\bdem[aá]s\s+proponentes\b|\blos\s+dem[aá]s\b/i;
/* 1600 (medido contra el corpus, 28-sep-2026): en el pliego tipo, «Valor asegurado Diez por ciento
   (10%)» cae entre 1.200 y 1.600 caracteres después del título (la tabla de clase, beneficiario,
   amparos y vigencia va antes); con 1.200 salía sin cifra en ~80 pliegos. Con 2.000 entraban otras
   secciones (un 1 % y un 20 % ajenos en CO1.REQ.10418852) */
const VENTANA = 1600;
/* el título de la sección: «garantía de seriedad», y también «póliza de seriedad» o el rótulo suelto
   «Seriedad de la oferta 12% del presupuesto oficial» de una tabla (CO1.REQ.8967670) */
const TITULO_RE = /garant[ií]a\s+de\s+seriedad|p[oó]liza\s+de\s+seriedad|seriedad\s+de\s+la\s+(?:oferta|propuesta)/i;
const ANTES_DEL_TITULO = 160;
/* la sección de la seriedad acaba donde empieza OTRO amparo u otro requisito (medido contra el
   corpus: sin este corte se leían el 20 % de estabilidad, el 30 % de calidad y hasta «Capital de
   Trabajo Mayor o Igual al 5 % del Presupuesto Oficial») */
const FIN_SECCION_RE = /garant[ií]a\s+(?:[uú]nica|de\s+cumplimiento)|p[oó]liza\s+de\s+cumplimiento|\bcumplimiento\s+del\s+contrato|\bestabilidad\b|\bcalidad\s+(?:de|del)\s+(?:la\s+obra|las\s+obras|los\s+bienes|el\s+servicio|servicio)|\bsalarios\b|responsabilidad\s+civil|buen\s+manejo|capital\s+de\s+trabajo|[ií]ndice\s+de\s+liquidez|endeudamiento/i;

/* el texto de la página `\f<n>` marca; las líneas se unen con espacio para que una frase partida se lea entera */
function unirConPaginas(texto) {
  const t = String(texto || "");
  let pagina = null, plano = "";
  const marcas = [];                       // [{desde, pagina}]
  for (const linea of t.split("\n")) {
    const m = /^\f(\d+)\s*$/.exec(linea);
    if (m) { pagina = Number(m[1]); marcas.push({ desde: plano.length, pagina }); continue; }
    plano += `${linea.replace(/\f/g, "").trim()} `;
  }
  const paginaEn = (i) => { let p = null; for (const x of marcas) { if (x.desde <= i) p = x.pagina; else break; } return p; };
  return { plano: plano.replace(/[ \t]+/g, " "), paginaEn };
}

/* LA MENCIÓN MÁS CERCANA DECIDE (revisión propia contra el corpus, 28-sep-2026): una Mipyme
   nombrada párrafos atrás no vuelve Mipyme el «CINCO POR CIENTO» de «emprendimientos y
   empresas de mujeres» (CO1.REQ.9505039). Cada tramo se reduce a sus menciones —«no … Mipyme»
   / «los demás» (general), «Mipyme», «mujeres» (otro criterio; negado con «ni», general)— y
   decide la más cercana al porcentaje: la última del tramo de antes, la primera del de después.
   «mujeres y MiPymes» juntas son Mipyme: les aplica a ellas también. */
function menciones(s) {
  const ev = [];
  const add = (re, tipo) => { for (const m of s.matchAll(new RegExp(re.source, "gi"))) ev.push({ ini: m.index, fin: m.index + m[0].length, tipo }); };
  add(NO_MIPYME_RE, "general"); add(MIPYME_RE, "mipyme"); add(MUJERES_RE, "otro");
  const negaciones = ev.filter((e) => e.tipo === "general");
  const dentro = (e) => negaciones.some((n) => e.ini >= n.ini && e.ini < n.fin);
  /* la negación sigue a lo que la continúa con «ni»: «NO ostente la calidad de Mipyme, ni de
     emprendimientos y empresas de mujeres» es la cláusula de los demás (Mosquera, CO1.REQ.11033801) */
  /* …y a lo que sigue la MISMA enumeración: «que no sean emprendimientos y empresas de mujeres, MiPymes y
     emprendimientos y empresas de personas con discapacidad» (CO1.REQ.10257094: la «discapacidad» del
     final volvía Mipyme el 11 % de los demás). Solo palabras de la lista entre medias: «…no acrediten ser
     Mipyme y PARA las Mipyme…» no continúa */
  const ENUMERACION_RE = /^[\s,]*(?:(?:y\/o|y|o|e|ni|de|del|la|las|los|el|en|con|su|sus|emprendimientos?|empresas?|personas?|calidad|condici[oó]n)[\s,]+)*$/i;
  const continua = (e) => negaciones.some((n) => n.fin <= e.ini && e.ini - n.fin <= 70 && !/[.;:]/.test(s.slice(n.fin, e.ini)) && (/\bni\b/i.test(s.slice(n.fin, e.ini)) || (/[,a-záéíóúñ]/i.test(s.slice(n.fin, e.ini)) && ENUMERACION_RE.test(s.slice(n.fin, e.ini)))));
  return ev.filter((e) => e.tipo === "general" || !dentro(e)).map((e) => {
    if (e.tipo === "general") return e;
    if (continua(e)) return { ...e, tipo: "general" };
    if (e.tipo === "otro" && MIPYME_RE.test(s.slice(Math.max(0, e.ini - 60), e.fin + 70))) return { ...e, tipo: "mipyme" };
    return e;
  }).sort((a, b) => a.ini - b.ini);
}
/* lo de DESPUÉS cuenta solo si ARRANCA diciendo a quién aplica («…del presupuesto oficial, para
   aquellos proponentes que no acrediten…», «…, a los proponentes que acrediten su condición de
   Mipyme», «…PARA EMPRENDIMIENTOS, EMPRESAS DE MUJERES, MIPYMES»); si no, decide lo de ANTES
   («…que ostente la calidad de Mipyme: … Cuantía: 5 %»). En una tabla sin puntos la fila
   siguiente («…garantía Seriedad de la oferta para Mipymes») no le presta su mención a esta cifra
   (CO1.REQ.8967670: el 10 % de «emprendimiento de mujeres» salía como el de las Mipyme) */
const A_QUIEN = String.raw`\b(?:para|a)\s+(?:(?:aquell[oa]s|l[oa]s)\s+)?(?:proponentes|oferentes|emprendimientos|empresas|mi\s*pymes?|mipymes?|dem[aá]s|otros)`;
const INTRO_DESPUES_RE = new RegExp(`^[^.;]{0,90}?${A_QUIEN}`, "i");
/* EL RÓTULO DE LA FILA SIGUIENTE no es de esta cifra: en una tabla sin puntos, «Quince por ciento
   (15%) del presupuesto oficial del proceso de selección Criterio diferencial para MIPYMES y
   emprendimientos de mujeres: Diez por ciento (10%)» (CO1.REQ.10500349) hacía del 15 % el de las
   Mipyme. Si lo de después acaba en «…: <la cifra siguiente>», lo que va desde el último «;» —o, sin
   él, desde la última «para/a <quién>»— hasta los dos puntos es el rótulo de la otra cifra y se quita */
const ROTULO_FINAL_RE = /:\s*(?:[a-záéíóúñ]+\s+){0,4}\(?\s*\d*(?:[.,]\d+)?\s*$/i;
const INTRO_RE = new RegExp(A_QUIEN, "gi");
function sinRotuloSiguiente(despues) {
  const r = ROTULO_FINAL_RE.exec(despues);
  if (!r) return despues;
  const previo = despues.slice(0, r.index);
  const pc = previo.lastIndexOf(";");
  if (pc >= 0) return previo.slice(0, pc);
  /* el rótulo son las menciones pegadas a los dos puntos, del MISMO tipo y seguidas; una de otro tipo
     antes es la de ESTA cifra y se queda: «(15%) … para los proponentes que no acrediten la condición
     de Mipyme Criterio diferencial MIPYMES: Diez por ciento» perdía su «no acrediten» y el 15 % salía
     como de las Mipyme (revisión adversaria, 28-sep-2026) */
  const ms = menciones(previo);
  if (!ms.length || previo.length - ms[ms.length - 1].fin > 60) return previo;
  let k = ms.length - 1;
  while (k > 0 && ms[k - 1].tipo === ms[k].tipo && ms[k].ini - ms[k - 1].fin <= 40) k--;
  const propia = k > 0 ? ms[k - 1].fin : 0;
  const intros = [...previo.slice(propia, ms[k].ini).matchAll(INTRO_RE)];
  return previo.slice(0, intros.length ? propia + intros[intros.length - 1].index : ms[k].ini);
}
function claseDe(despues, antes) {
  const intro = INTRO_DESPUES_RE.exec(despues);
  if (intro) {
    const d = menciones(despues.slice(intro.index + intro[0].length - 30 > 0 ? intro.index : 0));
    if (d.length) return d[0].tipo;
  }
  const a = menciones(antes);
  if (a.length) return a[a.length - 1].tipo;
  return "general";
}

/* las ventanas de lectura: una por título, y la de un título que cae DENTRO de la anterior la
   ALARGA en vez de saltarse (CO1.REQ.10641849: el rótulo «VALOR DE LA GARANTÍA DE SERIEDAD DE LA
   OFERTA» de la tabla caía dentro de la ventana del título de la sección, que se cortaba a mitad de
   «…empresas de mujeres y/o d», antes de «MiPymes»: el 15 % se tiraba y el 10 % no se veía) */
function ventanasDe(plano) {
  const ventanas = [];
  const re = new RegExp(TITULO_RE.source, "gi");
  let m;
  while ((m = re.exec(plano))) {
    const previa = ventanas[ventanas.length - 1];
    /* la ventana arranca un poco ANTES: «Si se trata de una Mipyme, la constitución de la garantía
       de seriedad… será… el cinco por ciento (5 %)» (CO1.REQ.8274512) salía como la cifra de TODOS
       —el error caro: una póliza menor a la exigida— porque la mención quedaba fuera */
    /* …pero solo lo de SU frase: «…limitados a MIPYMES… 2025. LAS GARANTÍAS EXIGIDAS SON: 1.Garantía
       de seriedad… 10 % del valor de la oferta» es la cifra de todos (CO1.REQ.8464273) */
    let desde = Math.max(0, previa ? previa.hasta : 0, m.index - ANTES_DEL_TITULO);
    // el punto y el punto y coma cortan; los dos puntos NO: «Para Mipymes: constituir la garantía…» es su rótulo
    const cortes = [...plano.slice(desde, m.index).matchAll(/[.;]\s+/g)];
    if (cortes.length) { const c = cortes[cortes.length - 1]; desde += c.index + c[0].length; }
    let hasta = Math.min(plano.length, m.index + VENTANA);
    const fin = plano.slice(m.index + 20, hasta).search(FIN_SECCION_RE);
    if (fin >= 0) hasta = m.index + 20 + fin;
    /* …y la que empieza justo donde acabó la anterior sin que otro amparo las separe es la MISMA
       lectura: el borde partía «PARA MIPYMES | O EMPRENDIMIENTOS Y EMPRESAS DE MUJERES» y el 10 % de
       las Mipyme quedaba como de «mujeres» (CO1.REQ.8593060) */
    if (previa && (m.index < previa.hasta || (!previa.cortada && desde <= previa.hasta))) {
      if (hasta > previa.hasta) { previa.hasta = hasta; previa.cortada = fin >= 0; }
    } else if (hasta > desde) ventanas.push({ desde, hasta, cortada: fin >= 0, titulo: m.index });
  }
  return ventanas;
}

function leerGarantiaSeriedad(texto) {
  const { plano, paginaEn } = unirConPaginas(texto);
  const vistos = { general: [], mipyme: [] };
  for (const { desde, hasta, titulo } of ventanasDe(plano)) {
    const w = plano.slice(desde, hasta);
    /* lo que sigue al ÚLTIMO porcentaje puede pasar del borde: la frase que dice a quién aplica no se
       corta a la mitad (el mismo «…mujeres y/o d»), pero nunca entra en otro amparo ni en otra cifra */
    let cola = plano.slice(hasta, hasta + 260);
    const finCola = cola.search(new RegExp(`${FIN_SECCION_RE.source}|${TITULO_RE.source}|\\d\\s*%`, "i"));
    if (finCola >= 0) cola = cola.slice(0, finCola);
    const lectura = w + cola;
    const pcts = [...w.matchAll(PCT_RE)];
    let finPrevio = 0;
    for (let k = 0; k < pcts.length; k++) {
      const p = pcts[k], ini = p.index, fin2 = ini + p[0].length;
      const sig = k + 1 < pcts.length ? pcts[k + 1].index : lectura.length;
      /* el resto de SU frase: hasta el punto (seguido de mayúscula o fin) o el porcentaje siguiente */
      let despues = lectura.slice(fin2, Math.min(sig, fin2 + 260));
      const punto = despues.search(/\.(?:\s+(?![a-záéíóúñ0-9])|$)/);
      if (punto >= 0) despues = despues.slice(0, punto);
      else despues = sinRotuloSiguiente(despues);
      // 800: un encabezado de página entre la mención y la cifra (CO1.REQ.8647413, págs. 30-31)
      const antes = w.slice(Math.max(finPrevio, ini - 800), ini);
      finPrevio = fin2;
      const cerca = `${w.slice(Math.max(0, ini - 80), ini)}${p[0]}${lectura.slice(fin2, fin2 + 90)}`;
      if (!ASEGURADO_RE.test(lectura.slice(fin2, fin2 + 90).replace(/^\s*por\s+ciento/i, ""))) continue;
      /* lo que va antes de «valor asegurado / cuantía / garantía / póliza» es de otra frase de la tabla:
         «…se ampliará en caso de variación del cronograma Valor asegurado Quince por ciento (15%)» */
      const previoPct = w.slice(Math.max(0, ini - 90), ini);
      const rotuloPct = [...previoPct.matchAll(/asegurad|cuant[ií]a|garant[ií]a|p[oó]liza/gi)].pop();
      if (UMBRAL_RE.test(rotuloPct ? previoPct.slice(rotuloPct.index) : previoPct)) continue;
      const pct = Number(String(p[1]).replace(",", "."));
      if (!(pct >= 1 && pct <= 30)) continue;
      let clase = claseDe(despues, antes);
      /* …y la PRIMERA cifra de la ventana, si nada cerca dice a quién aplica, mira el título de su sección:
         «GARANTÍA DE SERIEDAD DE LA OFERTA COMO REQUISITO HABILITANTE DIFERENCIAL … empresas de mujeres»
         queda a 890 caracteres de su «Valor Asegurado 10 %» (CO1.REQ.7820922). El título solo puede
         DESCARTAR la cifra (otro criterio), nunca volverla de las Mipyme: «(el criterio diferencial para
         Mipymes está en el numeral 4.5)» en el título no hace de las Mipyme el 15 % de todos (segunda
         revisión adversaria, 28-sep-2026) */
      if (clase === "general" && k === 0 && !menciones(antes).length) {
        const delTitulo = menciones(w.slice(0, Math.min(ini, Math.max(0, titulo - desde) + 300)));
        if (delTitulo.length && delTitulo.every((e) => e.tipo === "otro")) clase = "otro";
      }
      if (clase === "otro") continue;
      vistos[clase].push({ pct, cita: cerca.replace(/\s+/g, " ").trim().slice(0, 220), pagina: paginaEn(desde + ini) });
    }
  }
  const uno = (lista) => {
    const distintos = [...new Set(lista.map((x) => x.pct))];
    return distintos.length === 1 ? lista[0] : null;
  };
  const general = uno(vistos.general), mipyme = uno(vistos.mipyme);
  const ambiguo = new Set(vistos.general.map((x) => x.pct)).size > 1 || new Set(vistos.mipyme.map((x) => x.pct)).size > 1;
  if (!general && !mipyme && !ambiguo) return null;
  // las cifras leídas por clase: con dos distintas, quien lo muestre puede decir cuáles
  return { general, mipyme, ambiguo, leidas: { general: [...new Set(vistos.general.map((x) => x.pct))], mipyme: [...new Set(vistos.mipyme.map((x) => x.pct))] } };
}

module.exports = { leerGarantiaSeriedad, claseDe, menciones, ventanasDe };
