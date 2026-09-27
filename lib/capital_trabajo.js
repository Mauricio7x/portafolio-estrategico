/* lib/capital_trabajo.js · EL CAPITAL DE TRABAJO QUE EXIGE EL PLIEGO (27-sep-2026, N31)
   ─────────────────────────────────────────────────────────────────────────────
   Diez de diez pliegos de obra leídos por la investigación del 27-sep-2026
   (docs/INVESTIGACION_LICITANTE.md, §2 fila 3) exigen un capital de trabajo
   mínimo, y Detekta no lo miraba: Génesis salía en verde en una licitación de
   1.000 millones a 6 meses sin anticipo, donde le pedirían 330 millones y tiene
   193. El dueño costeaba una oferta que rechazarían por un habilitante.

   UNA SOLA COPIA DE LA FÓRMULA. La usan la tarjeta de Licitaciones (sin pliego
   leído: aviso ámbar con la fórmula del Documento Tipo) y la ficha de Mis
   procesos (con pliego leído: la fórmula que ESE pliego declara). No sabe nada
   de pantallas ni de Redis.

   LA FÓRMULA DEL DOCUMENTO TIPO, LITERAL (leída el 27-sep-2026 del .docx oficial
   de Colombia Compra, con la ecuación OMML que el texto plano pierde):
   Documento Tipo de licitación de obra pública de infraestructura de transporte,
   versión 4 (CCE-EICP-GI-01, 30-07-2024), numeral 3.7 «CAPITAL DE TRABAJO», y el
   de selección abreviada de menor cuantía, versión 3 (CCE-EICP-GI-02), mismo
   numeral y mismo texto:
     · «CT = AC - PC ≥ CTd»
     · plazo de 12 meses o más: «CTd = (POE - Anticipo y/o Pago anticipado) /
       Plazo estimado de ejecución del contrato (en meses) * n», con n de la
       tabla de meses de apalancamiento (≥12 <24 → 4 · ≥24 <36 → 8 · … · ≥120 → 40);
     · «Para procesos de selección cuyo plazo estimado de ejecución del contrato
       sea menor a doce (12) meses […] CTd = (POE - Anticipo o Pago anticipado) x 33%»;
     · «En ningún caso el capital de trabajo requerido excederá el valor del
       Presupuesto Oficial»;
     · plural: «CTProponente plural = ∑ CTi» (lo aplica lib/perfiles.derivarPlural,
       que es la regla del consorcio: aquí no se reimplementa).
   Los de infraestructura social (LP y SAMC) traen la misma. Hay al menos otras
   dos familias: la invitación de MÍNIMA CUANTÍA (CCE-EICP-GI-03 v3) pone
   «CTd = (PO-Anticipo o pago anticipado) x 15%» y además deja a la entidad
   exigir o no la capacidad financiera («La Entidad Estatal puede o no exigir la
   Capacidad Financiera mínima…»); y la licitación de AGUA POTABLE (CCE-EICP-GI-09
   v4) la fija por tramos del presupuesto (10 % hasta 10.000 millones, 20 %
   hasta 20.000, 30 % por encima). Fuera de los pliegos tipo hay de todo (Sucre,
   LP-008-2026: «CTd = 50% x (PO)»).

   Reglas que no hay que re-aprender:
   · EN LA TARJETA SOLO AVISA, EN ÁMBAR. Solo licitación y selección abreviada de
     menor cuantía de obra (donde rige esa fórmula), nunca mínima cuantía (15 %
     y opcional: avisar con el 33 % sería inventar) ni concurso de méritos. Solo
     con plazo publicado MENOR de doce meses (ver FORMULA_DOCUMENTO_TIPO): sin
     plazo, o con doce meses o más, no hay aviso. Con el anticipo
     sin publicar se calcula con anticipo 0, que es el peor caso, y la frase lo
     dice. Jamás rojo, jamás esconde: en oportunidades el falso negativo es el
     caro.
   · EN MIS PROCESOS MANDA EL PLIEGO. La cifra exacta sale de la fórmula que ESE
     pliego declara; si no la declara, «ningún documento leído la declara»; si
     la trae y no se lee (una imagen, varias fórmulas sin tramo), «no se pudo
     leer». Nunca un porcentaje supuesto. «Cumple» solo si alcanza también sin
     anticipo (el anticipo que no se sabe no puede aprobar); «no cumple» solo si
     el anticipo se sabe (el pliego dice que no hay) o la fórmula no lo resta.
   · «Sin dato» ≠ 0: sin capital de trabajo del perfil no hay aviso ni juicio,
     y la ausencia se descarta ANTES de convertir (Number(null) === 0).
   · La cifra que DECIDE va cruda; la redondeada es solo para mostrar. */
"use strict";

const FUENTE_DOCUMENTO_TIPO = "Pliego tipo de licitación de obra pública de infraestructura de transporte, versión 4 (Colombia Compra Eficiente, CCE-EICP-GI-01, 30-07-2024), numeral 3.7, para plazos menores de doce meses: (presupuesto − anticipo) × 33 %; igual en el de menor cuantía (CCE-EICP-GI-02, versión 3) y en los de infraestructura social";
/* En la tarjeta solo la rama de MENOS DE DOCE MESES: para 12 o más, cada familia
   de pliego tipo trae su propia tabla de meses de apalancamiento (transporte v4:
   ≥12 <24 → 4, ≥24 <36 → 8…; infraestructura social: ≥12 <18 → 4, ≥18 <24 → 6…,
   medido el 27-sep-2026 en los dos .docx), y sin el pliego no se sabe cuál rige.
   El 33 % de menos de doce meses es el mismo en las cuatro (LP y SAMC de
   transporte y de infraestructura social). Con el pliego leído, la tabla la da él. */
const FORMULA_DOCUMENTO_TIPO = Object.freeze({
  pct: 33, resta_anticipo: true, pct_solo_menos_de_12: true, por_plazo: false,
  tabla: null, tramos: null, tope_presupuesto: true,
});
/* las modalidades (lib/filtros_lista.modalidadDe) donde rige la fórmula de arriba */
const MODALIDADES_TARJETA = Object.freeze(["licitacion", "abreviada"]);

const numONull = (v) => { if (v === null || v === undefined || v === "") return null; const n = Number(v); return Number.isFinite(n) ? n : null; };
const cop = (n) => `$${Math.round(n).toLocaleString("es-CO")}`;
const pctLegible = (p) => `${Number(p).toLocaleString("es-CO", { maximumFractionDigits: 2 })} %`;
const plano = (s) => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[ \t ]+/g, " ").trim();

function mesesDeApalancamiento(plazoMeses, tabla) {
  for (const [desde, hasta, n] of tabla || []) if (plazoMeses >= desde && (hasta == null || plazoMeses < hasta)) return n;
  return null;
}

/* CTd con una fórmula (la del Documento Tipo o la leída del pliego).
   Devuelve {valor, como, pct, n, motivo}; `valor` null con `motivo` cuando la
   fórmula no se puede aplicar a este proceso. `valor` va CRUDO. */
function calcularCtd(formula, { presupuesto, anticipoPct = 0, plazoMeses = null } = {}) {
  const f = formula || {};
  const poe = numONull(presupuesto);
  if (poe == null || poe <= 0) return { valor: null, motivo: "sin_presupuesto" };
  const a = Math.min(Math.max(numONull(anticipoPct) ?? 0, 0), 100);
  const base = f.resta_anticipo ? poe * (100 - a) / 100 : poe;
  const plazo = numONull(plazoMeses) != null && numONull(plazoMeses) > 0 ? numONull(plazoMeses) : null;
  const tope = (v) => (f.tope_presupuesto ? Math.min(v, poe) : v);
  if (Array.isArray(f.tramos) && f.tramos.length) {
    const t = f.tramos.find((x) => poe >= x.desde && (x.hasta == null || poe <= x.hasta));
    if (!t) return { valor: null, motivo: "sin_tramo" };
    return { valor: tope(base * t.pct / 100), como: "porcentaje", pct: t.pct };
  }
  const necesitaPlazo = f.por_plazo || f.pct_solo_menos_de_12;
  if (necesitaPlazo && plazo == null) return { valor: null, motivo: "sin_plazo" };
  if (f.por_plazo && plazo >= 12) {
    if (!Array.isArray(f.tabla) || !f.tabla.length) return { valor: null, motivo: "tabla_ilegible" };
    const n = mesesDeApalancamiento(plazo, f.tabla);
    if (n == null) return { valor: null, motivo: "tabla_ilegible" };
    return { valor: tope(base / plazo * n), como: "por_plazo", n };
  }
  if (f.pct != null) {
    if (f.pct_solo_menos_de_12 && plazo >= 12) return { valor: null, motivo: "plazo_fuera" };
    return { valor: tope(base * f.pct / 100), como: "porcentaje", pct: f.pct };
  }
  return { valor: null, motivo: f.por_plazo ? "sin_formula_menos_de_12" : "sin_formula" };
}

/* La fórmula en palabras, para la nota (sin «CTd» ni «POE»: jerga del pliego). */
function formulaLegible(f, calc) {
  const menos = f && f.resta_anticipo ? "(presupuesto − anticipo)" : "presupuesto";
  if (calc && calc.como === "por_plazo") return `${menos} ÷ plazo en meses × ${calc.n} meses`;
  if (calc && calc.pct != null) return `${menos} × ${pctLegible(calc.pct)}`;
  return null;
}

/* ── lo que el PLIEGO declara (Mis procesos) ─────────────────────────────── */
const MENOS_DE_12_RE = /menor(?:es)?\s+(?:a|de)\s+(?:doce|12)\b|inferior(?:es)?\s+a\s+(?:doce|12)\b/;
const MENCION_RE = /\bctd\b|capital\s+de\s+trabajo\s+(?:demandado|requerido|exigido|minimo)/;
const PROSA_RE = /capital\s+de\s+trabajo[^%]{0,120}?(?:mayor\s+o\s+igual|igual\s+o\s+(?:mayor|superior)|no\s+(?:sea\s+)?inferior|minimo|al\s+menos|>=|≥)\s*(?:a|al|del|de)?\s*(?:el\s+)?(\d{1,3}(?:[.,]\d+)?)\s*%\s*(?:del?\s+)?(?:valor\s+del?\s+)?(?:presupuesto|poe?\b)/;
const MUESTRA_RE = /\bmuestra\b|percentil|\bempresas\b|\bsector\b|\bpromedio\b|\bmediana\b/;
const BASE_RE = /\(\s*po|\bpoe?\b|presupuesto/;
const TOPE_RE = /en\s+ningun\s+caso\s+el\s+capital\s+de\s+trabajo\s+(?:requerido|demandado|exigido)\s+(?:excedera|sera\s+superior)/;
const RANGO_RE = [
  { re: /entre\s*\$?\s*([\d.,]{7,})\s*y\s*\$?\s*([\d.,]{7,})/, de: (m) => [m[1], m[2]] },
  { re: /(?:≤|<=|hasta|menor(?:es)?\s+o\s+igual(?:es)?\s+a)\s*\$?\s*([\d.,]{7,})/, de: (m) => [null, m[1]] },
  { re: /(?:≥|>=|mayor(?:es)?\s+(?:o\s+igual(?:es)?\s+)?a|superior(?:es)?\s+a|desde)\s*\$?\s*([\d.,]{7,})/, de: (m) => [m[1], null] },
];

function pesos(s) {
  if (s == null) return null;
  const { numeroColombiano } = require("./apu_pliego.js");
  const n = numeroColombiano(String(s).replace(/[.,]$/, ""));
  return Number.isFinite(n) && n >= 1e6 ? n : null;
}
function rangoDe(texto) {
  for (const r of RANGO_RE) {
    const m = texto.match(r.re);
    if (!m) continue;
    const [a, b] = r.de(m);
    const desde = a == null ? 0 : pesos(a), hasta = b == null ? null : pesos(b);
    if ((a != null && desde == null) || (b != null && hasta == null)) return null;
    return { desde, hasta };
  }
  return null;
}
/* La tabla de meses de apalancamiento: filas «12 24 4» o un número por línea
   (como sale del .docx). Se valida entera —contigua, creciente, solo la última
   abierta—: una tabla a medio leer no decide nada. */
function leerTabla(lineas, desde) {
  const tokens = [];
  for (let k = desde + 1; k < Math.min(lineas.length, desde + 45); k++) {
    const l = lineas[k].linea;
    if (/ctd|formula|calculo|donde/i.test(plano(l))) break;
    if (!/^[\s\d\-–]+$/.test(l)) continue;
    for (const t of l.trim().split(/\s+/)) tokens.push(t === "-" || t === "–" ? null : Number(t));
  }
  if (tokens.length < 6 || tokens.length % 3) return null;
  const filas = [];
  for (let i = 0; i < tokens.length; i += 3) filas.push([tokens[i], tokens[i + 1], tokens[i + 2]]);
  for (let i = 0; i < filas.length; i++) {
    const [d, h, n] = filas[i], ultima = i === filas.length - 1;
    if (!Number.isInteger(d) || !Number.isInteger(n) || n <= 0) return null;
    if (h == null ? !ultima : !(Number.isInteger(h) && h > d)) return null;
    if (i > 0 && (filas[i - 1][1] !== d || filas[i - 1][2] >= n)) return null;
  }
  return filas;
}

/** Lo que un documento dice del capital de trabajo exigido.
    {estado: "leida", formula, cita, pagina} · {estado: "ilegible", motivo, cita, pagina} · {estado: "no_declara"} */
function leerFormulaCapital(texto) {
  const { lineasConPagina } = require("./paginas.js");
  const lineas = lineasConPagina(texto).map((x) => ({ linea: String(x.linea).replace(/[ \t ]+/g, " ").trim(), pagina: x.pagina })).filter((x) => x.linea);
  const pl = lineas.map((x) => plano(x.linea));
  const hay = pl.some((p) => MENCION_RE.test(p)) || pl.some((p) => /capital\s+de\s+trabajo/.test(p) && /%/.test(p));
  if (!hay) return { estado: "no_declara" };
  const encontradas = [];
  let porPlazo = null, ultimaFormula = -1;
  for (let i = 0; i < lineas.length; i++) {
    const p = pl[i];
    const esCtd = /\bctd\b\s*=/.test(p);
    // la prosa del ANÁLISIS DEL SECTOR («el 80 % de las empresas de la muestra…») no es el requisito
    const prosa = !esCtd && !MUESTRA_RE.test(p) ? p.match(PROSA_RE) : null;
    if (!esCtd && !prosa) continue;
    const m = esCtd ? p.match(/(\d{1,3}(?:[.,]\d+)?)\s*%/) : prosa;
    if (esCtd && !m) {
      const junta = `${p} ${pl[i + 1] || ""}`;
      if (/plazo\s+estimado/.test(junta)) { porPlazo = porPlazo || { cita: `${lineas[i].linea} ${lineas[i + 1] ? lineas[i + 1].linea : ""}`.trim(), pagina: lineas[i].pagina }; ultimaFormula = i; }
      continue;
    }
    if (esCtd && !BASE_RE.test(p)) continue;
    const pct = Number(String(m[1]).replace(",", "."));
    if (!(pct > 0 && pct <= 100)) continue;
    const antes = pl.slice(Math.max(0, i - 5), i + 1).join(" ");
    const ventanaRango = pl.slice(Math.max(ultimaFormula + 1, i - 6), i + 1).map((x) => x.split(/\bctd\b\s*=/)[0]).join(" ");
    encontradas.push({ pct, resta_anticipo: /anticipo/.test(p), solo_menos_de_12: MENOS_DE_12_RE.test(antes), rango: rangoDe(ventanaRango), cita: lineas[i].linea, pagina: lineas[i].pagina });
    ultimaFormula = i;
  }
  // la misma fórmula repetida (la invitación de mínima cuantía la trae en la tabla y en el cuerpo) cuenta una vez
  const distintas = [];
  for (const e of encontradas) if (!distintas.some((d) => d.pct === e.pct && d.resta_anticipo === e.resta_anticipo && d.solo_menos_de_12 === e.solo_menos_de_12)) distintas.push(e);
  const tope = pl.some((p) => TOPE_RE.test(p));
  const iTabla = pl.findIndex((p) => /apalancamiento/.test(p));
  const tabla = porPlazo && iTabla >= 0 ? leerTabla(lineas, iTabla) : null;
  const primera = distintas[0] || porPlazo;
  if (!distintas.length && !porPlazo) {
    const l = lineas.find((x, k) => MENCION_RE.test(pl[k])) || null;
    return { estado: "ilegible", motivo: "sin_formula", cita: l ? l.linea : null, pagina: l ? l.pagina : null };
  }
  if (distintas.length > 1) {
    const conRango = distintas.every((d) => d.rango);
    if (!conRango) return { estado: "ilegible", motivo: "varias_formulas", cita: distintas.map((d) => d.cita).join(" · ").slice(0, 300), pagina: distintas[0].pagina };
    const tramos = distintas.map((d) => ({ desde: d.rango.desde, hasta: d.rango.hasta, pct: d.pct })).sort((a, b) => a.desde - b.desde);
    return { estado: "leida", formula: { pct: null, resta_anticipo: distintas.some((d) => d.resta_anticipo), pct_solo_menos_de_12: false, por_plazo: false, tabla: null, tramos, tope_presupuesto: tope }, cita: distintas.map((d) => d.cita).join(" · ").slice(0, 300), pagina: distintas[0].pagina };
  }
  const d = distintas[0] || null;
  return {
    estado: "leida",
    formula: { pct: d ? d.pct : null, resta_anticipo: d ? d.resta_anticipo : true, pct_solo_menos_de_12: d ? d.solo_menos_de_12 : false, por_plazo: !!porPlazo, tabla, tramos: null, tope_presupuesto: tope },
    cita: [porPlazo && porPlazo.cita, d && d.cita].filter(Boolean).join(" · ").slice(0, 300), pagina: primera.pagina,
  };
}

/* ── la ficha de Mis procesos: la cifra exacta con la fórmula del pliego ─────
   `lectura`: la de leerFormulaCapital del documento que manda. `anticipo`:
   {pliego: "no"|"si"|"mencion"|null, pctObjeto}. `propio`: el capital de
   trabajo del perfil (el del consorcio ya viene sumado por derivarPlural).
   Devuelve {estado: "calculado", valor, juicio, texto, …} o {estado:
   "sin_calculo"|"ilegible"|"no_declara", nota}. */
const NOTA_SIN_CALCULO = Object.freeze({
  sin_presupuesto: "El proceso no publica presupuesto: sin él no se puede calcular.",
  sin_plazo: "La fórmula del pliego depende del plazo y el proceso no lo publica: calcúlela con el plazo del pliego.",
  plazo_fuera: "El pliego solo trae la fórmula para plazos menores de doce meses y este proceso dura más: búsquela en el pliego.",
  tabla_ilegible: "La fórmula del pliego usa la tabla de meses de apalancamiento y la aplicación no pudo leerla: léala en el pliego.",
  sin_tramo: "El pliego fija el porcentaje por tramos de presupuesto y este proceso no cae en ninguno de los que se leyeron: léalo en el pliego.",
  sin_formula_menos_de_12: "El pliego trae la fórmula para plazos de doce meses o más y este proceso dura menos: búsquela en el pliego.",
  sin_formula: "La aplicación no pudo leer la fórmula del pliego: léala en el apartado de capacidad financiera.",
});
function capitalDelExpediente({ lectura, presupuesto, plazoMeses = null, anticipo = {}, propio = null } = {}) {
  if (!lectura || lectura.estado === "no_declara") return { estado: "no_declara", nota: "Ningún documento leído declara el capital de trabajo que exige: búsquelo en el apartado de capacidad financiera del pliego." };
  if (lectura.estado !== "leida") return { estado: "ilegible", nota: lectura.motivo === "varias_formulas"
    ? "Un documento leído trae varias fórmulas del capital de trabajo y la aplicación no sabe cuál le aplica: léalas en el apartado de capacidad financiera del pliego."
    : "Un documento leído habla del capital de trabajo exigido, pero la aplicación no pudo leer su fórmula (puede estar en una imagen): léala en el apartado de capacidad financiera del pliego.", cita: lectura.cita || null, pagina: lectura.pagina == null ? null : lectura.pagina };
  const f = lectura.formula;
  const pctObjeto = numONull(anticipo.pctObjeto);
  const anticipoCero = anticipo.pliego === "no";
  const conObjeto = !anticipoCero && pctObjeto != null && pctObjeto > 0 && f.resta_anticipo;
  const sin = calcularCtd(f, { presupuesto, anticipoPct: 0, plazoMeses });
  if (sin.valor == null) return { estado: "sin_calculo", motivo: sin.motivo, nota: NOTA_SIN_CALCULO[sin.motivo] || NOTA_SIN_CALCULO.sin_formula, cita: lectura.cita, pagina: lectura.pagina };
  const con = conObjeto ? calcularCtd(f, { presupuesto, anticipoPct: pctObjeto, plazoMeses }) : null;
  const formula = formulaLegible(f, sin);
  const exacto = anticipoCero || !f.resta_anticipo;
  const p = numONull(propio);
  const base = { estado: "calculado", valor: sin.valor, valor_sin_anticipo: sin.valor, valor_con_anticipo_del_objeto: con ? con.valor : null, formula_legible: formula, exacto, cita: lectura.cita, pagina: lectura.pagina };
  const cuando = !f.resta_anticipo ? "" : anticipoCero ? " y sin anticipo (el documento dice que no hay)" : " y sin contar anticipo";
  const pide = `Con la fórmula del pliego, ${formula}${cuando}, le piden ${cop(sin.valor)}.`;
  if (p == null) return { ...base, juicio: "sin_dato", texto: `${pide} La aplicación no tiene el capital de trabajo de su empresa: cárguelo en «Mi empresa» o compárelo con su registro.` };
  if (p >= sin.valor) return { ...base, juicio: "si", texto: `${pide} Su cifra (${cop(p)}) cumple${exacto ? "" : " aun sin anticipo"}.` };
  if (exacto) return { ...base, juicio: "no", texto: `${pide} Su cifra (${cop(p)}) no llega: verifíquelo en su registro de proponente y en el pliego antes de descartarse.` };
  if (con && p >= con.valor) return { ...base, juicio: "revisar", texto: `${pide} Su cifra (${cop(p)}) no llega sin anticipo; con el anticipo del ${pctLegible(pctObjeto)} que menciona el objeto serían ${cop(con.valor)} y sí llega: confirme el anticipo en el pliego.` };
  return { ...base, juicio: "revisar", texto: `${pide} Su cifra (${cop(p)}) no llega${con ? ` ni con el anticipo del ${pctLegible(pctObjeto)} que menciona el objeto (${cop(con.valor)})` : ""}; un anticipo mayor baja la cifra: confirme en el pliego si hay anticipo y de cuánto.` };
}

/* ── la tarjeta de Licitaciones: aviso ámbar con la fórmula del Documento Tipo ──
   `clasif`: {modalidad, tipo} de lib/filtros_lista (el MISMO clasificador del
   filtro). Devuelve {estado: "no_aplica"|"sin_dato"|"alcanza"|"no_alcanza", …};
   solo «no_alcanza» lleva frase. */
function avisoTarjeta(fila, perfil, clasif) {
  const l = fila || {};
  const c = clasif || {};
  if (!MODALIDADES_TARJETA.includes(c.modalidad) || c.tipo !== "obra") return { estado: "no_aplica", motivo: "modalidad" };
  const presupuesto = numONull(l.cuantia_cop) != null && numONull(l.cuantia_cop) > 0 ? numONull(l.cuantia_cop) : numONull(l.precio_base);
  if (presupuesto == null || presupuesto <= 0) return { estado: "no_aplica", motivo: "sin_presupuesto" };
  if (!(numONull(l.duracion) > 0)) return { estado: "no_aplica", motivo: "sin_plazo" };
  const plazoMeses = require("./capacidad.js").plazoMesesDe(l);
  let declarado = false;
  try { declarado = !!require("./negocio.js").anticipoDeclarado(l); } catch { declarado = false; }
  const pctDeclarado = declarado ? numONull(l.anticipo_pct) : null;
  const anticipoPct = pctDeclarado != null ? pctDeclarado : 0;
  const calc = calcularCtd(FORMULA_DOCUMENTO_TIPO, { presupuesto, anticipoPct, plazoMeses });
  if (calc.valor == null) return { estado: "no_aplica", motivo: calc.motivo };
  const propio = perfil ? numONull(perfil.capitalTrabajo) : null;
  const comun = { exigido: calc.valor, anticipo_pct: anticipoPct, anticipo_supuesto: pctDeclarado == null, plazo_meses: plazoMeses, fuente: FUENTE_DOCUMENTO_TIPO };
  if (propio == null) return { estado: "sin_dato", ...comun, suyo: null };
  if (propio >= calc.valor) return { estado: "alcanza", ...comun, suyo: propio };
  return { estado: "no_alcanza", ...comun, suyo: propio, frase: fraseTarjeta(comun, propio) };
}
/* la frase de la tarjeta; sin `propio` (sin credencial) no lleva la cifra de la empresa */
function fraseTarjeta(a, propio) {
  const ant = a.anticipo_supuesto ? " (sin contar anticipo: el proceso no lo publica)" : a.anticipo_pct > 0 ? ` (con el anticipo del ${pctLegible(a.anticipo_pct)} que dice el proceso)` : " (sin anticipo, como dice el proceso)";
  const suyo = propio == null ? ", más de lo que registra su empresa" : ` y el suyo es ${cop(propio)}`;
  return `Con la fórmula de los pliegos tipo le pedirían unos ${cop(a.exigido)} de capital de trabajo${ant}${suyo}: confírmelo en el pliego.`;
}

module.exports = {
  FUENTE_DOCUMENTO_TIPO, FORMULA_DOCUMENTO_TIPO, MODALIDADES_TARJETA,
  calcularCtd, mesesDeApalancamiento, formulaLegible, leerFormulaCapital, capitalDelExpediente, avisoTarjeta, fraseTarjeta,
};
