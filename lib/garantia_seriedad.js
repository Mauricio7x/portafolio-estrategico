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
const ASEGURADO_RE = /^[^%]{0,40}?(?:presupuesto|valor\s+(?:total\s+)?(?:de\s+la|del?)\s+(?:oferta|propuesta)|valor\s+total\s+del\s+presupuesto)/i;
const MIPYME_RE = /mi\s*pymes?\b|micro,?\s+pequeñ|mipyme/i;
const MUJERES_RE = /mujeres/i;
/* «no ostente / no acrediten / no sean … Mipyme», «los demás proponentes» */
const NO_MIPYME_RE = /\b(?:no|ni)\s+(?:\S+\s+){0,3}?(?:ostent|acredit|demuestr|sea|sean|tenga|tengan|cumpl)\S*[^.;]{0,160}?(?:mi\s*pymes?|mipyme)|\bdem[aá]s\s+proponentes\b|\blos\s+dem[aá]s\b/i;
const VENTANA = 1200;
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
  const continua = (e) => negaciones.some((n) => n.fin <= e.ini && e.ini - n.fin <= 70 && /\bni\b/i.test(s.slice(n.fin, e.ini)));
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
const INTRO_DESPUES_RE = /^[^.;]{0,90}?\b(?:para|a)\s+(?:(?:aquell[oa]s|l[oa]s)\s+)?(?:proponentes|oferentes|emprendimientos|empresas|mi\s*pymes?|mipymes?|dem[aá]s|otros)/i;
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

function leerGarantiaSeriedad(texto) {
  const { plano, paginaEn } = unirConPaginas(texto);
  const vistos = { general: [], mipyme: [] };
  const re = /garant[ií]a\s+de\s+seriedad/gi;
  let m, hasta = -1;
  while ((m = re.exec(plano))) {
    if (m.index < hasta) continue;           // la misma sección ya se leyó
    /* la ventana arranca un poco ANTES: «Si se trata de una Mipyme, la constitución de la garantía
       de seriedad… será… el cinco por ciento (5 %)» (CO1.REQ.8274512) salía como la cifra de TODOS
       —el error caro: una póliza menor a la exigida— porque la mención quedaba fuera */
    /* …pero solo lo de SU frase: «…limitados a MIPYMES… 2025. LAS GARANTÍAS EXIGIDAS SON: 1.Garantía
       de seriedad… 10 % del valor de la oferta» es la cifra de todos (CO1.REQ.8464273) */
    let desde = Math.max(0, hasta, m.index - ANTES_DEL_TITULO);
    // el punto y el punto y coma cortan; los dos puntos NO: «Para Mipymes: constituir la garantía…» es su rótulo
    const cortes = [...plano.slice(desde, m.index).matchAll(/[.;]\s+/g)];
    if (cortes.length) { const c = cortes[cortes.length - 1]; desde += c.index + c[0].length; }
    let w = plano.slice(desde, m.index + VENTANA);
    const cab = m.index - desde;
    const fin = w.slice(cab + 20).search(FIN_SECCION_RE);
    if (fin >= 0) w = w.slice(0, cab + fin + 20);
    hasta = desde + w.length;
    const pcts = [...w.matchAll(PCT_RE)];
    let finPrevio = 0;
    for (let k = 0; k < pcts.length; k++) {
      const p = pcts[k], ini = p.index, fin2 = ini + p[0].length;
      const sig = k + 1 < pcts.length ? pcts[k + 1].index : w.length;
      /* el resto de SU frase: hasta el punto (seguido de mayúscula o fin) o el porcentaje siguiente */
      let despues = w.slice(fin2, Math.min(sig, fin2 + 260));
      const punto = despues.search(/\.(?:\s+(?![a-záéíóúñ0-9])|$)/);
      if (punto >= 0) despues = despues.slice(0, punto);
      // 800: un encabezado de página entre la mención y la cifra (CO1.REQ.8647413, págs. 30-31)
      const antes = w.slice(Math.max(finPrevio, ini - 800), ini);
      finPrevio = fin2;
      const cerca = `${w.slice(Math.max(0, ini - 80), ini)}${p[0]}${w.slice(fin2, fin2 + 90)}`;
      if (!ASEGURADO_RE.test(w.slice(fin2, fin2 + 90).replace(/^\s*por\s+ciento/i, ""))) continue;
      const pct = Number(String(p[1]).replace(",", "."));
      if (!(pct >= 1 && pct <= 30)) continue;
      const clase = claseDe(despues, antes);
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

module.exports = { leerGarantiaSeriedad, claseDe, menciones };
