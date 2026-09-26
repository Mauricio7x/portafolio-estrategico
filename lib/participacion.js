/* ============================================================================
   lib/participacion · Lo que el pliego dice del REPARTO de un consorcio
   ----------------------------------------------------------------------------
   Dos lecturas de un texto con marcadores de página (`\f<n>`), cada una con su
   cita literal y su página, para que lib/reparto no recomiende un reparto que
   deje al dueño INHABILITADO (encargo del dueño, 26-sep-2026: «lo importante es
   no quedar inhabilitado por error tuyo, eso jamás debería ocurrir»):

   1. LA CLÁUSULA DE PARTICIPACIÓN MÍNIMA. Ningún pliego tipo la trae, pero 21 de
      241 pliegos leídos el 25-sep-2026 sí (docs/PROPONENTE_PLURAL.md, apartado
      3.4), en tres formas principales y varias variantes, a veces solo en los
      estudios previos. Sus 21 citas literales son el banco de pruebas de este
      lector (tests/e2e.js, «unidad participación»). Las formas:
        cada_integrante      «ninguno de los miembros podrá tener una participación inferior al 30 %»
        aporta_experiencia   «el integrante que acredite la experiencia debe contar con una participación mínima del 40 %»
        unico_aportante      «si uno de los integrantes aporta la totalidad de la experiencia … como mínimo el 30 %»
        mayor_experiencia    «el integrante que aporte la mayor experiencia deberá tener una participación igual o superior al 30 %»
                             (sin cifra: «… deberá ostentar la participación mayoritaria» → `mayoritaria: true`)
        mayor_participacion  «el miembro con mayor participación deberá acreditar la experiencia … mínimo 40 %»
        uno_al_menos         «al menos uno de los integrantes deberá tener una participación mínima del 50 %»
        lider_mayoria        «uno debe tener las responsabilidades y así mismo la mayoría de la participación»
        otro                 lo que habla de participación mínima y no encaja (una sucursal en la ciudad…)
      LAS TRAMPAS, que NO son un mínimo de participación y se descartan: el tope
      del 10 % del pliego tipo para quien no aporta experiencia (es un MÁXIMO),
      las condiciones Mipyme o de mujeres para el sexto y séptimo contrato, y el
      40 % del puntaje por trabajadores con discapacidad (es PUNTAJE).

   2. LA FÓRMULA DE LOS INDICADORES DEL PLURAL. 149 de 241 pliegos suman los
      componentes (la del pliego tipo), 38 los ponderan por participación, 8
      ponderan los índices, y 44 son mixtos, ambiguos, contradictorios o no la
      traen. Solo se afirma un método cuando el texto lo dice sin contradecirse;
      si no, `null`, y lib/reparto exige que el reparto cumpla con LAS TRES
      fórmulas (no se puede quedar inhabilitado por haber supuesto la buena).

   Lector por reglas: no inventa nada. Lo que no sabe clasificar va a «otro»
   con su cita, para que el dueño lo lea; y «no la encontré» solo se dice cuando
   se leyeron documentos (lo decide quien llama, que sabe cuántos se leyeron). */
"use strict";

/* NFKC primero: los pliegos escriben las fórmulas con letras matemáticas de
   Unicode (𝐶𝑜𝑚𝑝𝑜𝑛𝑒𝑛𝑡𝑒), que sin normalizar no casan con nada. */
const plegar = (s) => String(s || "").normalize("NFKC").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, " ").trim();

/* Oraciones con su página. El texto de todas las páginas se une en un solo
   chorro (la cláusula de Medellín y la de la Región del Valle empiezan en una
   página y terminan en la siguiente) y cada oración lleva la página donde
   EMPIEZA. Se parte por el punto o el punto y coma seguidos de mayúscula o de un
   literal («i)», «b.»). */
function oraciones(texto) {
  let chorro = "";
  const inicios = []; // [desde, página]
  let pagina = null;
  const partes = String(texto || "").split(/^[ \t]*\f(\d*)[ \t]*$/m);
  // split con grupo: [texto antes de la primera marca, n1, texto1, n2, texto2, …]
  for (let i = 0; i < partes.length; i++) {
    if (i % 2 === 1) { pagina = partes[i] === "" ? (pagina == null ? 1 : pagina + 1) : Number(partes[i]); continue; }
    const cuerpo = partes[i].normalize("NFKC").replace(/\s+/g, " ").trim();
    if (!cuerpo) continue;
    inicios.push([chorro.length, pagina]);
    chorro += cuerpo + " ";
  }
  const paginaEn = (pos) => { let pg = null; for (const [d, n] of inicios) { if (d > pos) break; pg = n; } return pg; };
  const salida = [];
  // tras punto o punto y coma: mayúscula, viñeta, literal («i)», «b.») o numeral («9.32.2 »)
  const re = /(?<=[.;])\s+(?=[A-ZÁÉÍÓÚÑ¿(«"•●▪-]|[ivx]+\)|[a-hA-H][).]\s|\d+(?:\.\d+)+\.?\s)/g;
  let desde = 0, m;
  const empujar = (a, b) => { const t = chorro.slice(a, b).trim(); if (t.length >= 20) salida.push({ texto: t, pagina: paginaEn(a), desde: a }); };
  while ((m = re.exec(chorro))) { empujar(desde, m.index); desde = m.index + m[0].length; }
  empujar(desde, chorro.length);
  // la página de un punto CUALQUIERA del chorro: una oración larga puede cruzar páginas
  Object.defineProperty(salida, "paginaEn", { value: paginaEn });
  return salida;
}

/* EL ANCLA: la palabra «participación» con una exigencia de MÍNIMO a su lado
   (antes o después) y una cifra, o la exigencia de la participación MAYORITARIA
   sin cifra. Sin ancla no hay cláusula: una oración que solo nombra la
   participación (cómo se cuenta la experiencia de un contrato en consorcio, la
   fórmula de un indicador) no es una regla de reparto. */
const MINIMO_RE = /minim[oa]|no (?:podra|podran|puede|pueden|debe|deberan?|sera|sea) (?:ser |tener )?[^.;]{0,30}?(?:inferior|menor|menos)|(?:inferior|menor) (?:al?|del?)\b|menos del?\b|igual o superior|superior o igual|mayor o igual|igual o mayor|de por lo menos|de al menos|no menor/;
/* la mayoritaria sin cifra, siempre como EXIGENCIA («deberá tener», «ostente»):
   «el integrante con mayor participación» a secas describe, no exige */
const MAYORITARIA_RE = /(?:debe|debera|deberan|tenga|tener|ostente|ostentar)\b[^.;]{0,50}?(?:participacion mayoritaria|participacion mayor (?:dentro|en)|mayoria de la participacion)/;
/* LAS TRAMPAS: participación que NO es un mínimo para habilitarse. El tope del
   10 % del pliego tipo (un MÁXIMO), los criterios diferenciales y desempates
   (Mipyme, mujeres, madres cabeza de familia, reincorporados, jóvenes, nómina
   con discapacidad), el puntaje, y la participación que el proponente TUVO en
   un contrato pasado (cómo se cuenta su experiencia, no cómo se reparte hoy). */
const TRAMPA_RE = /no (?:podra|puede|podran|pueden) (?:ser )?(?:superar|superior|mayor)|podra no acreditar|no (?:aporte|aporta|acredite|acredita) experiencia|mipyme|mujer(?:es)?|discapacidad|puntaje|\bpuntos\b|desempate|empate|emprendimiento|factor de calidad|pfmt|incentivo|preferir|preferira|reincorporacion|reintegracion|madre cabeza|jovenes|criterios? diferencial|2\.2\.1\.2\.4\.2|ostentar dicha calidad|bastara con|(?:anexo|formato) lo podra|composicion accionaria|(?:contratos?|experiencia) (?:celebrad|ejecutad|obtenid)|hay(?:a|an) (?:tenido|sido ejecutad)|hubier(?:e|en) tenido|haber tenido|\btuvo\b|en dicho contrato|en los cuales|en el (?:respectivo )?contrato|hay(?:a|an) contado|contratos donde|participacion como/;
/* una oración que remite a la anterior («este integrante debe tener…»): su
   sentido (y su trampa) está en la anterior */
const ANAFORA_RE = /^(?:\W*)(?:este|esta|dicho|dicha|el citado|el mencionado|tal|el cual|quien)\s+(?:integrante|miembro|socio)|^(?:\W*)(?:\d+[\s)]*)*(?:debera|deberan|debe)\b/;
/* empieza en minúscula (sin ser un literal «f)»): es la cola de una oración que
   el salto de página o la tabla partió */
/* el contexto de un desempate o de un criterio diferencial, que se mira también
   en las dos oraciones anteriores cuando la oración no tiene sujeto propio
   («Este integrante debe tener… 25 %», «Documento de conformación…, en el que
   se evidencia su participación de por lo menos el 25 %») */
const DESEMPATE_RE = /preferir|preferira|desempate|madre cabeza|mujer(?:es)? cabeza|reincorporacion|reintegracion|nomina|discapacidad|mipyme|emprendimiento|criterios? diferencial/;
const esCola = (original) => /^[a-zñáéíóú]/.test(original) && !/^[a-z][).]\s/.test(original);

const PALABRAS = { diez: 10, quince: 15, veinte: 20, veinticinco: 25, treinta: 30, cuarenta: 40, cincuenta: 50, sesenta: 60, setenta: 70, ochenta: 80, noventa: 90 };
/* El primer porcentaje de un tramo: «30 %», «33.33%», «30,5 %», «treinta por
   ciento», «cuarenta (40)%». */
function porcentajeDe(s) {
  const t = plegar(s);
  const m = /(\d{1,2}(?:[.,]\d{1,2})?)\s*\)?\s*(?:%|por\s*ciento)/.exec(t);
  const w = new RegExp(`\\b(${Object.keys(PALABRAS).join("|")})\\b\\s*(?:\\(|por\\s*ciento|%)`).exec(t);
  // el que aparezca PRIMERO («treinta por ciento (30 %)» es uno solo)
  if (m && (!w || m.index <= w.index)) return Number(m[1].replace(",", "."));
  return w ? PALABRAS[w[1]] : null;
}

/* La forma de la regla: el sujeto MÁS CERCANO a la «participación» que se lee
   (en «indicar la participación de cada uno de los integrantes…, quien aporta la
   experiencia no podrá tener una participación inferior al 30 %» manda «quien
   aporta la experiencia», no «cada uno»). Empate: gana la más específica, que
   va primero en la lista. */
const FORMAS = [
  ["otro", /sucursal|domicilio|\bsede\b/g],
  ["mayor_participacion", /(?:miembro|integrante) (?:con|que tenga) (?:la )?mayor participacion/g],
  ["mayor_experiencia", /mayor (?:cantidad de )?experiencia|mas del \d+ ?% de la experiencia/g],
  ["unico_aportante", /totalidad de la experiencia|toda la experiencia|uno solo de (?:los |sus )?(?:integrantes|miembros)|un solo integrante|uno \(1\) solo/g],
  ["aporta_experiencia", /(?:aport\w*|acredit\w*)[^.;]{0,60}?experiencia|experiencia[^.;]{0,40}?(?:aport\w*|acredit\w*)/g],
  ["lider_mayoria", /responsabilidades|\blider\b/g],
  ["cada_integrante", /ningun[oa]?\b|cada (?:uno|una) de (?:los |las |sus )?(?:integrantes|miembros)|cada integrante|todos (?:los|sus) integrantes|el porcentaje de participacion no podra|(?:los|sus) (?:miembros|integrantes) (?:del|de la) (?:consorcio|union|proponente|estructura)[^.;]{0,40}deberan tener/g],
  ["uno_al_menos", /\buno (?:\(1\) )?de (?:los |sus )?(?:integrantes|miembros)/g],
];
function forma(sujeto) {
  /* «el miembro con mayor participación deberá acreditar la experiencia» es una
     forma propia aunque la experiencia se nombre después: manda */
  if (/(?:miembro|integrante) (?:con|que tenga) (?:la )?mayor participacion/.test(sujeto)) return "mayor_participacion";
  let mejor = "otro", fin = -1;
  for (const [f, re] of FORMAS) {
    re.lastIndex = 0;
    let m, ultimo = -1;
    while ((m = re.exec(sujeto))) { ultimo = m.index + m[0].length; if (m[0].length === 0) re.lastIndex++; }
    if (ultimo > fin) { fin = ultimo; mejor = f; }
  }
  return mejor;
}

const MAX_CITA_PART = 500;
function citaDe(texto, pos) {
  if (texto.length <= MAX_CITA_PART) return texto;
  const a = Math.max(0, pos - 250), b = Math.min(texto.length, pos + 250);
  return `${a > 0 ? "…" : ""}${texto.slice(a, b).replace(/^\S*\s/, a > 0 ? "" : "$&").replace(/\s\S*$/, b < texto.length ? "" : "$&")}${b < texto.length ? "…" : ""}`;
}

/** Las cláusulas de participación mínima de un texto: [{forma, porcentaje, cita, pagina}].
    Una misma oración puede traer dos («uno ≥ 60 % y ninguno < 20 %», Yumbo). */
function leerParticipacion(texto) {
  const os = oraciones(texto);
  const vistas = new Set();
  const out = [];
  for (let i = 0; i < os.length; i++) {
    const s = plegar(os[i].texto);
    if (!/particip/.test(s)) continue;
    const prev = i > 0 ? plegar(os[i - 1].texto) : "";
    const anafora = ANAFORA_RE.test(s) || /\b(?:este|esta|dicho|dicha) (?:integrante|miembro|socio)\b/.test(s.slice(0, 120)) || esCola(os[i].texto.trim());
    const contexto = anafora ? `${prev} ${s}` : s;
    if (!/(?:consorci|union temporal|plural|integrante|miembro|asociativ)/.test(contexto)) continue;
    if (TRAMPA_RE.test(s) || (anafora && TRAMPA_RE.test(prev))) continue;
    const sinSujeto = !/integrante|miembro|ningun|socio|quien|\buno\b/.test(s.slice(0, s.indexOf("participacion")));
    /* la anterior se mira siempre (un encabezado de página puede partir «Este
       integrante»); la de antes, solo si esta no tiene sujeto propio */
    if (DESEMPATE_RE.test(prev) || ((anafora || sinSujeto) && i > 1 && DESEMPATE_RE.test(plegar(os[i - 2].texto)))) continue;
    /* cada «participación» de la oración, con su tramo: desde el último «y»,
       «;» o «,» que abre una exigencia nueva hasta 170 caracteres después */
    const ocurrencias = [...s.matchAll(/participacion/g)].map((x) => x.index);
    for (let k = 0; k < ocurrencias.length; k++) {
      const p0 = ocurrencias[k];
      // cada exigencia se ata a la «participación» más cercana: el tramo no cruza la siguiente
      const fin = Math.min(p0 + 170, k + 1 < ocurrencias.length ? ocurrencias[k + 1] : Infinity);
      const ini = Math.max(p0 - 70, k > 0 ? ocurrencias[k - 1] + 13 : 0);
      const antes = s.slice(ini, p0), despues = s.slice(p0, fin);
      const tramo = `${antes}${despues}`;
      let pct = null;
      if (MAYORITARIA_RE.test(tramo)) pct = null;
      else {
        const mm = MINIMO_RE.exec(despues) || MINIMO_RE.exec(antes);
        if (!mm) continue;
        const desdeMin = (MINIMO_RE.exec(despues) ? despues : antes).slice(mm.index);
        pct = porcentajeDe(desdeMin) ?? porcentajeDe(tramo);
        if (pct == null || pct <= 0 || pct >= 100) continue;
        /* «… como mínimo el 30 % DE LA EXPERIENCIA»: la cifra es de experiencia, no
           de participación. Es una regla de reparto que la aplicación no modela:
           va a «otro» sin cifra, con su cita, para que usted la lea */
        if (/^[^.;%]{0,40}%?\)?\s*de (?:la|su) experiencia/.test(desdeMin.slice(desdeMin.search(/%|por ciento/) + 1))) pct = -1;
      }
      // el sujeto: de la última exigencia nueva («, y ninguno…») hasta la participación
      let corte = Math.max(s.lastIndexOf(", y ", p0), s.lastIndexOf("; ", p0), s.lastIndexOf(" y ningun", p0));
      // tras el corte solo hay un verbo («…(81 13 15); deberá tener…»): el sujeto está antes
      if (corte > 0 && /^[;,]?\s*(?:y\s+)?(?:debera|deberan|debe|deben|tenga|tener)\b/.test(s.slice(corte + 1).trim())) corte = 0;
      const sujeto = `${anafora ? prev + " " : ""}${s.slice(Math.max(corte > 0 ? corte : 0, k > 0 ? ocurrencias[k - 1] : 0), p0 + 40)}`;
      let f = forma(sujeto);
      if (pct === -1) { f = "otro"; pct = null; }
      /* sin cifra y con «mayoritaria»: más de la mitad (con dos integrantes, un
         50/50 no es mayoría) */
      const mayoritaria = pct == null && MAYORITARIA_RE.test(tramo);
      if (pct == null && !mayoritaria && f !== "otro") f = "otro";
      const clave = `${f}|${pct}|${mayoritaria}`;
      if (vistas.has(clave)) continue; // la misma regla repetida en otro numeral o en el estudio previo
      vistas.add(clave);
      // la página es la de la «participación» que se leyó, no la del comienzo de la oración
      const enTexto = Math.round(os[i].texto.length * (p0 / Math.max(1, s.length)));
      out.push({ forma: f, porcentaje: pct, mayoritaria, cita: citaDe(os[i].texto, enTexto), pagina: os.paginaEn(os[i].desde + enTexto) });
    }
  }
  return out;
}

/* ── la fórmula de los indicadores del plural ── */
const METODO_RE = {
  suma_componentes: /componente 1 del indicador|sumatoria de (?:los )?componentes(?![^.]{0,80}particip)|sumando (?:los|cada uno de los) componentes(?![^.]{0,80}particip)/,
  componentes_ponderados: /componentes? (?:de los indicadores |del indicador )?(?:segun|de acuerdo (?:con|a)|multiplicad[oa]s? por) (?:el|su) (?:porcentaje de )?participacion|c1m1 ?\* ?%/,
  indices_ponderados: /(?:indicadores?|valores individuales|indices?)[^.]{0,120}(?:multiplicad[oa]s? por|se (?:le )?aplica) (?:el|su) porcentaje de participacion|por separado,? luego se aplica el porcentaje de participacion/,
};
/* «sin realizar alguna multiplicación por el porcentaje de participación»: la
   participación NO cuenta, que es la del pliego tipo (Tibasosa lo dice así) */
const SIN_PONDERAR_RE = /sin (?:realizar |hacer )?(?:ninguna |alguna )?(?:multiplicacion|ponderacion)|sin ponderar|no (?:se )?(?:tendra|tiene|toma|tomara) en cuenta (?:el|su) porcentaje/;
/** La fórmula que el texto declara para los indicadores del plural, o null. */
function leerMetodoPlural(texto) {
  const os = oraciones(texto);
  const hallados = {};
  const anotar = (metodo, o) => { if (!hallados[metodo]) hallados[metodo] = { metodo, cita: o.texto.slice(0, 600), pagina: o.pagina }; };
  for (let i = 0; i < os.length; i++) {
    const propia = plegar(os[i].texto);
    // la oración sola; si no dice nada, con la siguiente (la fórmula suele venir partida)
    for (const [s, o] of [[propia, os[i]], [plegar(`${os[i].texto} ${os[i + 1] ? os[i + 1].texto : ""}`), { texto: `${os[i].texto} ${os[i + 1] ? os[i + 1].texto : ""}`, pagina: os[i].pagina }]]) {
      if (!/(?:plural|consorci|union temporal)/.test(s) || !/(?:indicador|componente|capacidad financiera|liquidez|capital de trabajo)/.test(s)) continue;
      let alguno = false;
      if (SIN_PONDERAR_RE.test(s) && /particip/.test(s)) { anotar("suma_componentes", o); alguno = true; }
      else for (const [metodo, re] of Object.entries(METODO_RE)) if (re.test(s)) { anotar(metodo, o); alguno = true; }
      if (alguno) break;
    }
  }
  const lista = Object.values(hallados);
  if (lista.length === 1) return lista[0];
  // dos fórmulas en el mismo texto (mixto o contradictorio): no se afirma ninguna
  return lista.length > 1 ? { metodo: null, contradictorio: true, citas: lista } : null;
}

/* La regla de una cláusula, en una frase llana (la usan la guía y el reparto). */
function fraseClausula(c) {
  const cuanto = c.mayoritaria ? "más de la mitad" : `al menos el ${String(c.porcentaje).replace(".", ",")} %`;
  switch (c.forma) {
    case "cada_integrante": return `Cada integrante del consorcio con ${cuanto} de participación.`;
    case "uno_al_menos": return `Al menos uno de los integrantes con ${cuanto} de participación.`;
    case "aporta_experiencia": return `Quien aporte experiencia, con ${cuanto} de participación.`;
    case "unico_aportante": return `Si uno solo aporta la experiencia, ese con ${cuanto} de participación.`;
    case "mayor_experiencia": return `Quien aporte la mayor experiencia, con ${cuanto} de participación.`;
    case "mayor_participacion": return `El integrante con más participación debe acreditar la experiencia y tener ${cuanto}.`;
    case "lider_mayoria": return "Uno de los integrantes, el que asume las responsabilidades, con más de la mitad de la participación.";
    default: return "Una condición sobre la participación que la aplicación no sabe aplicar: léala en la cita.";
  }
}

module.exports = { leerParticipacion, leerMetodoPlural, fraseClausula, porcentajeDe, oraciones };
