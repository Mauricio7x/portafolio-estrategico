/* ============================================================================
   lib/codigos_experiencia · Los CÓDIGOS con que el pliego pide la experiencia
   ----------------------------------------------------------------------------
   Encargo del dueño (26-sep-2026, tarea 2): la experiencia de cada integrante
   de un consorcio se medía con sus siete mayores contratos del segmento 72
   ENTERO, y el pliego pide códigos concretos («Los Contratos aportados para
   efectos de acreditación de la experiencia requerida deben estar clasificados
   en alguno de los siguientes códigos: 72141100 …»). Este lector saca esa
   lista del texto, con su regla, su cita y su página; lib/reparto la cruza con
   los contratos de cada empresa por código (data/contratos_rup.json).

   Qué devuelve `leerCodigosExperiencia(texto)`: una lista (vacía = se leyó y
   no hay) de lecturas
     { codigos: ["721411", "7214", …]   prefijos del clasificador (clase = 6
                                          dígitos, familia = 4, segmento = 2)
       crudos:  ["72141100", …]         tal como los escribe el pliego
       regla:   "alguno" | "al_menos_n" | "todos" | "solo_segmento" | null
       n, alcance ("cada_contrato" | "conjunto" | null), cita, pagina }

   LA TRAMPA PRINCIPAL es la tabla del OBJETO («La obra pública objeto del
   Proceso de Contratación está codificada en el Clasificador … como se indica
   en la siguiente tabla»): está en casi todos los pliegos, al principio, y NO
   es la de la experiencia aunque a menudo coincida. Sin una frase que ate los
   códigos a los CONTRATOS o a la EXPERIENCIA no hay lectura.

   Para qué sirve, y para qué no: un contrato que no tiene NINGUNO de los
   códigos no sirve para la experiencia, así que los contratos «con alguno» son
   una COTA SUPERIOR de lo que cada uno puede aportar, sea cual sea la regla
   (alguno, al menos seis, todos). Por eso quien la usa solo puede NEGAR con
   ella; la regla más exigente y el objeto de cada contrato se dicen en un
   aviso. Función pura (sin Redis ni red); la llama
   lib/documentos_proceso.hechosDeTexto. */
"use strict";

const NUMEROS = { un: 1, uno: 1, una: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7, ocho: 8, nueve: 9, diez: 10, once: 11, doce: 12 };

/* Un código del clasificador en el texto: ocho dígitos, juntos o de dos en dos
   («72 10 33 00», «72.10.33.00»). Los segmentos válidos van del 10 al 95. Un
   número de seis dígitos solo cuenta DENTRO de una tabla ya abierta (el
   «código postal 682011» del membrete no es una clase). */
const CODIGO8_RE = /(?<![\d$.,/-])([1-9]\d)[ .]?(\d\d)[ .]?(\d\d)[ .]?(\d\d)(?![\d,]|\.\d)/g;
const CODIGO6_RE = /(?<![\d$.,/-])([1-9]\d\d{4})(?![\d,]|\.\d)/g;
const segmentoValido = (s) => { const n = Number(s); return n >= 10 && n <= 95; };

/* El prefijo que ata: una clase se escribe «72141100» (tercer nivel), una
   familia «72140000» y un segmento «72000000». Un producto (cuarto nivel,
   «72141103») se lleva a su clase: el RUP clasifica los contratos hasta el
   tercer nivel. */
function prefijoDe(codigo) {
  const c = String(codigo || "").replace(/\D/g, "");
  if (c.length === 6) return c;
  if (c.length !== 8) return null;
  if (/000000$/.test(c)) return c.slice(0, 2);
  if (/0000$/.test(c)) return c.slice(0, 4);
  return c.slice(0, 6);
}

/* LA FRASE QUE ATA los códigos a la experiencia: habla de contratos o de
   experiencia, y de códigos o de clasificación, y ANUNCIA una lista («los
   siguientes», «a continuación», «así:», «en la siguiente tabla»). */
const ANUNCIA_RE = /(?:siguientes|a continuacion|la siguiente tabla|la tabla|asi\s*:|relacionan|indican|descritos|:\s*$)/;
const HABLA_RE = /(?:c[oó]digos?|clasificad[oa]s?|codificad[oa]s?|clasificador|unspsc)/;
const ATA_RE = /(?:contratos?|experiencia)/;
/* La tabla del OBJETO: «la obra … está codificada», «el objeto … se clasifica» */
const OBJETO_RE = /(?:objeto|obra|proceso de contratacion|servicios? (?:a contratar|requeridos?))[^.:]{0,160}?(?:esta|se encuentra|fue|ha sido|queda|se clasifica|se codifica|estan)\s*(?:codificad|clasificad|identificad|enmarcad)|(?:clasificacion|codificacion) del (?:objeto|bien|servicio|proceso)/;

/* La regla, leída de la frase que ata */
function reglaDe(frase) {
  const f = frase;
  let n = null;
  const m = /(?:al menos|por lo menos|como minimo|minimo|mas de)\s+(?:(?:con|en)\s+)?(?:(\w+)\s*\(\s*0*(\d+)\s*\)|0*(\d+)|(\w+))\s*(?:\(\s*0*\d+\s*\)\s*)?(?:de\s+(?:los|las)\s+)?(?:siguientes\s+)?(?:c[oó]digos|clasificaciones|clases)/.exec(f)
    || /(\w+)\s*(?:\(\s*0*(\d+)\s*\))?\s+o\s+mas\s+(?:de\s+(?:los|las)\s+)?(?:siguientes\s+)?(?:c[oó]digos|clasificaciones|clases)/.exec(f);
  if (m) {
    const num = m[2] || m[3] || null;
    const pal = m[1] || m[4] || null;
    n = num != null ? Number(num) : pal != null && NUMEROS[pal] != null ? NUMEROS[pal] : null;
  }
  const alcance = /cada (?:uno de los )?contratos?|en cada contrato|cada uno de (?:los|dichos) contratos/.test(f) ? "cada_contrato"
    : /sumatoria|en conjunto|entre (?:todos )?los contratos|la suma de los contratos/.test(f) ? "conjunto" : null;
  if (/(?:tod[oa]s|la totalidad de|el 100 ?% de) (?:los|las) (?:siguientes )?(?:c[oó]digos|clasificaciones|clases)|(?:contener|contemplen?|contengan?) (?:todos )?los (?:siguientes )?c[oó]digos/.test(f)) return { regla: "todos", n: null, alcance };
  if (n != null && n > 1) return { regla: "al_menos_n", n, alcance };
  if (n === 1 || /\balguno\b|\balguna\b|uno o (?:mas|varios)|cualquiera de|uno de los siguientes/.test(f)) return { regla: "alguno", n: null, alcance };
  return { regla: null, n: null, alcance };
}

/* Dónde termina la tabla: 400 caracteres sin un código nuevo, o un numeral de
   sección («3.5.4. ACREDITACIÓN»; «81.10.15.00 INGENIERÍA» es un código, no un
   numeral), o el párrafo de los extranjeros que la sigue en el pliego tipo. */
const FIN_TABLA_RE = /(?<![\d.])(?!\d\d\.\d\d\.\d\d\.\d\d\b)\d{1,2}(?:\.\d{1,2}){1,4}\.?\s+[A-ZÁÉÍÓÚÑ]{4,}|personas naturales o jur[ií]dicas extranjeras|Las personas|NOTA\s*\d*\s*:|Nota\s*\d*\s*:/;
const HUECO_MAX = 400;
const MAX_CODIGOS = 80;

/* El segmento solo («el segmento correspondiente para la clasificación de la
   experiencia es el 72», pliego tipo 3.5.2 A): vale cuando no hay lista. */
const SEGMENTO_RE = /segmento (?:correspondiente )?(?:para|de) la clasificacion de la experiencia (?:es|sera) el (?:segmento )?\[?(\d{2})\]?/;

function leerCodigosExperiencia(texto) {
  const { chorroDe, plegar } = require("./participacion.js");
  const { chorro, paginaEn } = chorroDe(texto);
  // el mismo largo que el chorro, para que las posiciones sirvan en los dos
  let bajo = chorro.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  if (bajo.length !== chorro.length) bajo = chorro.toLowerCase();
  const lecturas = [];
  const vistas = new Set();
  /* Cada «:» o «siguiente tabla» abre una tabla posible: se mira la frase que
     la anuncia (hasta 420 caracteres atrás, cortando en el punto anterior) */
  const aperturas = /(?::|siguiente tabla|a continuacion)/g;
  let a;
  while ((a = aperturas.exec(bajo))) {
    const fin = a.index + a[0].length;
    let ini = Math.max(0, a.index - 420);
    const previo = bajo.slice(ini, a.index);
    const punto = Math.max(previo.lastIndexOf(". "), previo.lastIndexOf("; "));
    if (punto >= 0) ini += punto + 2;
    const frase = plegar(bajo.slice(ini, fin));
    /* «Código: F-GJC-84», «Pliego de Condiciones Código:»: el membrete de la
       página, no una tabla. La palabra que habla de códigos tiene que estar
       ANTES del rótulo final. */
    if (!HABLA_RE.test(frase.replace(/\bc[oó]digo\s*:?\s*$/, ""))) continue;
    if (!HABLA_RE.test(frase) || !ATA_RE.test(frase) || !ANUNCIA_RE.test(frase)) continue;
    /* la del objeto no ata, salvo que la MISMA frase nombre la experiencia */
    if (OBJETO_RE.test(frase) && !/experiencia/.test(frase)) continue;
    /* «contratos» sin experiencia puede ser «los contratos en ejecución»: se
       exige que la frase o las 300 posiciones anteriores hablen de experiencia */
    if (!/experiencia/.test(frase) && !/experiencia/.test(bajo.slice(Math.max(0, ini - 300), ini))) continue;
    // la tabla: códigos seguidos, con descripciones en medio
    const crudos = [];
    let ultimo = fin;
    let primeraPagina = null;
    const resto = chorro.slice(fin, fin + 12000);
    const corte = (() => { const m = FIN_TABLA_RE.exec(resto.slice(1)); return m ? m.index + 1 : resto.length; })();
    const zona = resto.slice(0, corte);
    const hallados = [];
    for (const re of [CODIGO8_RE, CODIGO6_RE]) {
      re.lastIndex = 0;
      let m;
      while ((m = re.exec(zona))) {
        const digitos = m[0].replace(/\D/g, "");
        if (!segmentoValido(digitos.slice(0, 2))) continue;
        hallados.push({ pos: m.index, codigo: digitos, largo: m[0].length });
      }
    }
    hallados.sort((x, y) => x.pos - y.pos);
    // sin solaparse (un 8 que contiene un 6)
    const limpios = [];
    for (const h of hallados) { const p = limpios[limpios.length - 1]; if (p && h.pos < p.pos + p.largo) continue; limpios.push(h); }
    for (const h of limpios) {
      if (fin + h.pos - ultimo > HUECO_MAX) break;
      if (crudos.length >= MAX_CODIGOS) break;
      // un número de seis dígitos: solo en una tabla ya empezada o pegado a la frase
      if (h.codigo.length === 6 && !crudos.length && h.pos > 200) continue;
      crudos.push(h.codigo);
      if (primeraPagina == null) primeraPagina = paginaEn(fin + h.pos);
      ultimo = fin + h.pos + h.largo;
    }
    if (!crudos.length) continue;
    const codigos = [...new Set(crudos.map(prefijoDe).filter(Boolean))];
    if (!codigos.length) continue;
    const clave = codigos.slice().sort().join(",");
    if (vistas.has(clave)) continue;
    vistas.add(clave);
    const { regla, n, alcance } = reglaDe(frase);
    lecturas.push({ codigos, crudos: [...new Set(crudos)], regla, n, alcance, cita: chorro.slice(ini, fin).trim().slice(0, 400), pagina: primeraPagina != null ? primeraPagina : paginaEn(ini) });
    aperturas.lastIndex = Math.max(aperturas.lastIndex, ultimo);
  }
  if (!lecturas.length) {
    const m = SEGMENTO_RE.exec(bajo);
    if (m && segmentoValido(m[1])) lecturas.push({ codigos: [m[1]], crudos: [m[1]], regla: "solo_segmento", n: null, alcance: null, cita: chorro.slice(m.index, m.index + m[0].length + 2).trim(), pagina: paginaEn(m.index) });
  }
  return lecturas;
}

/* Los códigos que juntan varias lecturas (varios documentos, varias tablas):
   la UNIÓN. Con la unión, un contrato que sirve en alguna lista cuenta, y la
   cota sigue siendo una cota superior. Una lectura de solo el segmento no se
   une a una lista (la ensancharía al segmento entero): vale solo si no hay
   ninguna lista. */
function unirLecturas(lecturas) {
  const ls = (lecturas || []).filter((l) => l && Array.isArray(l.codigos) && l.codigos.length);
  if (!ls.length) return null;
  const listas = ls.filter((l) => l.regla !== "solo_segmento");
  const usadas = listas.length ? listas : ls;
  const codigos = [...new Set(usadas.flatMap((l) => l.codigos))];
  /* la regla más exigente que se leyó: se dice en el aviso (la cota usa «alguno») */
  const exigente = usadas.find((l) => l.regla === "todos") || usadas.filter((l) => l.regla === "al_menos_n").sort((x, y) => y.n - x.n)[0] || null;
  return { codigos, lecturas: usadas, solo_segmento: !listas.length, exigente };
}

/* La lista, legible: los códigos como los escribe el pliego, hasta doce. */
function listaLegible(crudos) {
  const xs = [...new Set(crudos || [])];
  return xs.length > 12 ? `${xs.slice(0, 12).join(", ")} y ${xs.length - 12} más` : xs.join(", ");
}
/* Lo que pide una lectura, en una frase llana (la guía y el reparto). */
function fraseCodigos(l) {
  if (!l) return null;
  if (l.regla === "solo_segmento") return `Los contratos con que acredite la experiencia deben estar en el segmento ${l.codigos[0]} del clasificador de bienes y servicios.`;
  const lista = listaLegible(l.crudos);
  if (l.regla === "alguno") return `Los contratos con que acredite la experiencia deben tener al menos uno de estos códigos: ${lista}.`;
  if (l.regla === "al_menos_n" || l.regla === "todos") {
    const cuantos = l.regla === "todos" ? "todos" : `al menos ${l.n}`;
    if (l.alcance === "cada_contrato") return `Cada contrato con que acredite la experiencia debe tener ${cuantos} de estos códigos: ${lista}.`;
    if (l.alcance === "conjunto") return `Entre todos los contratos con que acredite la experiencia deben reunir ${cuantos} de estos códigos: ${lista}.`;
    return `Los contratos con que acredite la experiencia deben tener ${cuantos} de estos códigos (la cita dice si es en cada contrato o entre todos): ${lista}.`;
  }
  return `Los contratos con que acredite la experiencia deben tener estos códigos (la regla exacta está en la cita): ${lista}.`;
}

/* ¿El contrato de clase `clase` (6 dígitos) sirve para el prefijo `p`? */
const casa = (clase, p) => String(clase).startsWith(p) || String(p).startsWith(clase);

module.exports = { leerCodigosExperiencia, unirLecturas, fraseCodigos, listaLegible, prefijoDe, reglaDe, casa, HUECO_MAX, MAX_CODIGOS };
