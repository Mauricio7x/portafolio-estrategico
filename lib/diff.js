/* lib/diff.js · Vigía de adendas · texto del pliego (Fase 5 del plan v3)
   ─────────────────────────────────────────────────────────────────────────────
   Guarda cada versión del texto de un pliego que el usuario abre en el lector
   (`pliego:{proceso}:v:{n}` = {hash, texto_normalizado, fecha, origen}), detecta
   si el hash cambió, hace un diff a nivel de PÁRRAFO
   (`pliego:{proceso}:diff:{n}`) y —lo único que le importa al usuario—
   extrae los REQUISITOS HABILITANTES numéricos de las dos versiones y los
   reevalúa contra su perfil: «Capital de trabajo exigido: subió de X a Y.
   Usted ya no cumple» / «Plazo: pasó de 10 a 12 meses. No le afecta».

   Reglas que no hay que re-aprender:
   · El texto lo extrae el NAVEGADOR (pdf.js), como en todo el módulo APU: el
     servidor no lee PDF. Por eso el vigía del TEXTO solo se dispara cuando
     alguien abre el pliego; el vigía del DATASET (lib/adendas) corre solo.
   · Se normaliza antes de comparar (espacios, mayúsculas, tildes NO —se
     conservan para leer—, saltos): dos descargas del mismo PDF tienen que dar
     el mismo hash o cada apertura sería una «adenda».
   · Se conservan como mucho MAX_VERSIONES; el texto se recorta a MAX_TEXTO
     (el diff se calcula sobre lo guardado, y se dice si está recortado).
   · El diff no se enseña crudo: viaja para quien lo quiera ver, pero la
     notificación son las líneas de habilitantes con «le afecta / no le
     afecta», reevaluadas contra `PERFILES[perfil]`. Sin perfil, se enseñan
     los cambios y se dice que no se pudo reevaluar (no se afirma nada).
   · Extraer un valor de un pliego es HEURÍSTICO (regex sobre texto): cada
     dato viaja con la línea de la que salió (`evidencia`) para poder
     comprobarlo, y lo que no case queda fuera —no se inventa un requisito. */
"use strict";

const crypto = require("crypto");
const { PERFILES } = require("./perfiles.js");
const { numeroColombiano } = require("./apu_pliego.js");
const { quitarMarcadores, lineasConPagina, numeroDeMarcador, marcador } = require("./paginas.js");

const MAX_VERSIONES = 5;
const MAX_TEXTO = 400 * 1024;
const claveVersion = (id, n) => `pliego:${id}:v:${n}`;
const claveDiff = (id, n) => `pliego:${id}:diff:${n}`;
const claveIndice = (id) => `pliego:${id}:versiones`;

/* LA PÁGINA (ago 2026): el navegador intercala marcadores `\f<n>` entre
   página y página (lib/paginas). Dos textos normalizados conviven aquí:
   · `normalizarTexto` = SIN marcadores. Es lo que se HASHEA y lo que se parte
     en párrafos: la misma descarga abierta antes y después de este cambio da
     el MISMO hash (los marcadores no son texto del pliego), así que las
     versiones ya guardadas en producción no salen como «adenda».
   · `normalizarConPaginas` = las mismas líneas, CON los marcadores. Es lo que
     se GUARDA (`texto_normalizado`) para que `extraerHabilitantes` pueda citar
     «pág. 14» al reevaluar una versión guardada. `String.prototype.trim`
     se lleva el `\f` por delante, así que se recorta a mano. */
function normalizarTexto(t) {
  return quitarMarcadores(t)
    .replace(/[ \t ]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
function normalizarConPaginas(t) {
  return String(t || "")
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((l) => { const m = numeroDeMarcador(l); return m === undefined ? l.replace(/[ \t ]+/g, " ").trim() : marcador(m); })
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/^\n+|\n+$/g, "");
}
const hashDe = (t) => crypto.createHash("sha256").update(String(t)).digest("hex").slice(0, 24);
const parrafosDe = (t) => normalizarTexto(t).split(/\n\s*\n|\n/).map((p) => p.trim()).filter((p) => p.length > 0);

/* Diff a nivel de párrafo por conjunto (orden aparte): añadidos, quitados y
   los que cambiaron «un poco» (misma primera mitad, distinto resto) se
   marcan como modificados para no enseñar cada corrección como dos párrafos. */
function diffParrafos(antes, despues) {
  const a = parrafosDe(antes), b = parrafosDe(despues);
  const setA = new Set(a), setB = new Set(b);
  const quitados = a.filter((p) => !setB.has(p));
  const anadidos = b.filter((p) => !setA.has(p));
  const firma = (p) => p.toLowerCase().replace(/[\d.,%$]+/g, "#").slice(0, 60);
  const porFirmaQuitados = new Map();
  for (const p of quitados) { const f = firma(p); if (!porFirmaQuitados.has(f)) porFirmaQuitados.set(f, []); porFirmaQuitados.get(f).push(p); }
  const modificados = [], soloAnadidos = [];
  for (const p of anadidos) {
    const f = firma(p);
    const cola = porFirmaQuitados.get(f);
    if (cola && cola.length) modificados.push({ antes: cola.shift(), despues: p });
    else soloAnadidos.push(p);
  }
  const soloQuitados = [...porFirmaQuitados.values()].flat();
  return { anadidos: soloAnadidos, quitados: soloQuitados, modificados, parrafos_antes: a.length, parrafos_despues: b.length };
}

/* ─── requisitos habilitantes: extracción heurística ─── */
const DINERO_RE = /\$?\s*([\d]{1,3}(?:[.,]\d{3})+(?:[.,]\d+)?|\d{6,})/;
const RATIO_RE = /(?:>=|≥|mayor o igual a|mayor o igual|igual o superior a|superior o igual a|mínimo de|minimo de|mínimo|minimo|no inferior a|de al menos|por lo menos)\s*(?:a\s*)?([\d]+(?:[.,]\d+)?)/i;
const RATIO_MAX_RE = /(?:<=|≤|menor o igual a|menor o igual|igual o inferior a|inferior o igual a|máximo de|maximo de|máximo|maximo|no superior a|no mayor a|hasta)\s*(?:a\s*)?([\d]+(?:[.,]\d+)?)\s*%?/i;
const REQUISITOS = [
  { id: "capital_trabajo", etiqueta: "Capital de trabajo exigido", re: /capital\s+de\s+trabajo/i, tipo: "dinero", perfil: "capitalTrabajo", sentido: "min" },
  { id: "patrimonio", etiqueta: "Patrimonio exigido", re: /patrimonio/i, tipo: "dinero", perfil: "patrimonio", sentido: "min" },
  { id: "liquidez", etiqueta: "Índice de liquidez mínimo", re: /liquidez/i, tipo: "ratio", perfil: "liquidez", sentido: "min" },
  { id: "endeudamiento", etiqueta: "Nivel de endeudamiento máximo", re: /endeudamiento/i, tipo: "ratio_max", perfil: "endeudamiento", sentido: "max" },
  { id: "cobertura", etiqueta: "Cobertura de intereses mínima", re: /cobertura\s+de\s+intereses/i, tipo: "ratio", perfil: "coberturaIntereses", sentido: "min" },
  { id: "experiencia_smmlv", etiqueta: "Experiencia exigida (en salarios mínimos)", re: /experiencia/i, tipo: "smmlv", perfil: "expSMMLV", sentido: "min" },
  /* La GENERAL y la ESPECÍFICA por separado (4-sep-2026): son dos de las cinco
     cifras que cambian de un pliego a otro y la ficha de Mis procesos las enseña
     en dos casillas. `experiencia_smmlv` sigue leyendo CUALQUIER línea de
     experiencia con cifra (es lo que ya usaban el vigía, el dictamen y la guía);
     estas dos solo responden cuando la línea dice de cuál se trata. */
  { id: "experiencia_general", etiqueta: "Experiencia general exigida (en salarios mínimos)", re: /experiencia\s+general/i, tipo: "smmlv", perfil: "expSMMLV", sentido: "min" },
  { id: "experiencia_especifica", etiqueta: "Experiencia específica exigida (en salarios mínimos)", re: /experiencia\s+espec[ií]fica/i, tipo: "smmlv", perfil: "expSMMLV", sentido: "min" },
  { id: "plazo_meses", etiqueta: "Plazo de ejecución", re: /plazo\s+(?:de\s+)?ejecuci[oó]n/i, tipo: "meses", perfil: null, sentido: null },
];
const numeroDe = (s) => { const n = numeroColombiano(String(s)); return Number.isFinite(n) ? n : null; };

/* LAS DOS TABLAS DE INDICADORES (27-sep-2026). Los pliegos tipo traen una tabla de
   indicadores «para Mipyme» (liquidez ≥ 1,1 en la Matriz 2 de CO1.REQ.11042791) y
   otra «para los demás proponentes» (≥ 1,2). El lector tomaba la PRIMERA línea de
   cada indicador, que suele ser la de Mipyme: un «cumple» falso para quien no lo es.
   `tablasDeIndicadores` marca las líneas de cada bloque («mipyme» / «demas»):
     · un bloque empieza en su encabezado y acaba en el encabezado del otro, en un
       numeral de sección («3.7 CAPITAL DE TRABAJO», que es de TODOS) o a las 15 líneas,
       y solo cuenta si trae un indicador con cifra;
     · una mención de Mipyme cuenta como encabezado si el documento trae también la
       tabla de los demás, o si ella misma encabeza una tabla («Índices de capacidad
       financiera … para Mipyme»): una adenda que repite solo la tabla de Mipyme no
       puede pisar la cifra de todos (revisión adversaria, 27-sep-2026). Una mención
       suelta (desempate, puntaje) junto a la tabla única NO la aparta.
   Sin `mipyme`, `extraerHabilitantes` salta el bloque de Mipyme (lo que queda es la
   tabla de los demás, la más exigente); con `mipyme: true` lo prefiere. Cada cifra dice
   de qué tabla salió (`tabla`), y una fila con VARIAS cifras (los rangos de presupuesto
   de la Matriz 2: «Índice de liquidez ≥1,3 ≥1,4») las trae todas en `valores`: es
   ambigua y quien juzga la manda a confirmar, nunca a «cumple». */
const MIPYME_RE = /mipymes?\b/i;
const DEMAS_RE = /dem[aá]s\s+proponentes|no\s+(?:demuestren|acrediten|tengan|cumplan)(?:\s+o\s+(?:demuestren|acrediten|tengan|cumplan))?\s+(?:con\s+)?la\s+(?:condici[oó]n|calidad)\s+de\s+mipyme|que\s+no\s+(?:sean|son)\s+mipymes?/i;
const INDICADOR_RE = /liquidez|endeudamiento|cobertura\s+de\s+intereses|capital\s+de\s+trabajo|rentabilidad/i;
const ENCABEZADO_TABLA_RE = /indicador|[ií]ndices?\s+de\s+capacidad|capacidad\s+(?:financiera|organizacional)/i;
const SECCION_RE = /^\s*\d+(?:\.\d+)+\.?\s+\S/;
const VENTANA_TABLA = 15;
const MUESTRA_RE = /\bmuestra\b|percentil|\bempresas\s+(?:del\s+sector|analizadas|de\s+la)|\bpromedio\s+del\s+sector|\bmediana\s+(?:del\s+sector|de\s+(?:las|los)\s+(?:empresas|indicadores))/i;
function tablasDeIndicadores(lineas) {
  const out = new Map();
  const hayDemas = lineas.some((l) => DEMAS_RE.test(l.linea));
  for (let i = 0; i < lineas.length; i++) {
    const l = lineas[i].linea;
    const esDemas = DEMAS_RE.test(l);
    const esMipyme = !esDemas && MIPYME_RE.test(l) && (hayDemas || ENCABEZADO_TABLA_RE.test(l));
    if (!esDemas && !esMipyme) continue;
    const tabla = esDemas ? "demas" : "mipyme";
    const bloque = [];
    for (let k = i + 1; k < Math.min(lineas.length, i + 1 + VENTANA_TABLA); k++) {
      const lk = lineas[k].linea;
      if (SECCION_RE.test(lk) || DEMAS_RE.test(lk) || (tabla === "demas" && MIPYME_RE.test(lk))) break;
      bloque.push(k);
    }
    if (bloque.some((k) => INDICADOR_RE.test(lineas[k].linea) && /\d/.test(lineas[k].linea))) for (const k of bloque) out.set(k, tabla);
  }
  return out;
}
/* todas las cifras con comparación de una línea («≥1,3 ≥1,4»), en la escala del requisito */
function cifrasDe(req, linea) {
  const re = new RegExp((req.tipo === "ratio_max" ? RATIO_MAX_RE : RATIO_RE).source, "gi");
  const xs = [...linea.matchAll(re)].map((m) => Number(String(m[1]).replace(",", "."))).filter(Number.isFinite)
    .map((v) => (req.tipo === "ratio_max" && v > 1 && v <= 100 ? v / 100 : v));
  return [...new Set(xs.map((v) => Math.round(v * 10000) / 10000))];
}

/* LOS RANGOS DE PRESUPUESTO DE LA MATRIZ 2 (27-sep-2026, visto bueno del dueño). Las
   matrices de indicadores del pliego tipo traen dos columnas por fila («Índice de
   liquidez ≥1,3 ≥1,4») y un encabezado ÚNICO «Rango 1 Rango 2 / >0 <40.000 >= 40.000 -
   (Cifras expresadas en SMMLV)», con el límite en 1.000, 4.000 o 40.000 (medido en las
   20 matrices con rangos de la cosecha). `limiteDeRangos` lee ese límite; `valorSegunRango`
   elige la columna con el PRESUPUESTO publicado en salarios mínimos: menos del límite, la
   primera; el límite o más, la segunda. Sin presupuesto, sin encabezado, con otra forma
   o a menos del 2 % del límite, null: quien llama lo sigue mandando a confirmar. El 2 %
   NO cubre que la entidad haya expresado el presupuesto con el salario de otro año (de
   2025 a 2026 subió más del 20 %): la app usa el vigente, y un proceso estructurado con
   el del año anterior cerca del límite puede caer del otro lado (revisión adversaria).
   Y un proceso POR LOTES no se elige aquí: el rango lo fija el presupuesto del lote al que
   se presente (la cláusula de la propia matriz), que la app no sabe (`lotesDe`). */
const MARGEN_RANGO = 0.02;
function limiteDeRangos(lineas) {
  const limites = new Set();
  for (let i = 0; i < lineas.length; i++) {
    const m = /^\s*>\s*0\s+<\s*([\d.,]+)\s+>=?\s*([\d.,]+)\s*-?\s*$/.exec(lineas[i].linea);
    if (!m) continue;
    const a = numeroDe(m[1]), b = numeroDe(m[2]);
    const cerca = lineas.slice(Math.max(0, i - 2), i + 3).map((l) => l.linea).join(" ");
    if (a != null && a === b && /rango\s*1/i.test(cerca) && /rango\s*2/i.test(cerca) && /smmlv/i.test(cerca)) limites.add(a);
  }
  return limites.size === 1 ? [...limites][0] : null;
}
/* cuántos lotes numerados nombra un texto («Lote 1», «LOTE No. 2»): con dos o más, el
   proceso va por lotes y ni el rango ni el capital de trabajo se calculan con el total */
function lotesDe(texto) {
  return new Set([...String(texto || "").matchAll(/\blote\s*(?:n[°º.o]*\s*|n[uú]mero\s*)?([1-9])\b/gi)].map((m) => m[1])).size;
}
function valorSegunRango(h, presupuestoSMMLV) {
  if (!h || !Array.isArray(h.valores) || h.valores.length !== 2 || !(h.limite_rango_smmlv > 0)) return null;
  const p = Number(presupuestoSMMLV);
  if (!(p > 0)) return null;
  const x = h.limite_rango_smmlv;
  if (Math.abs(p - x) / x < MARGEN_RANGO) return null;
  const rango = p < x ? 1 : 2;
  return { valor: h.valores[rango - 1], rango, limite: x, presupuesto_smmlv: Math.round(p) };
}

function extraerHabilitantes(texto, { mipyme = false } = {}) {
  /* Cada línea viaja con su página (null si el texto no trae marcadores):
     la evidencia se cita como «pág. N» cuando se sabe, y no se inventa. */
  const todas = lineasConPagina(normalizarConPaginas(texto));
  const tablas = tablasDeIndicadores(todas);
  const limiteRango = limiteDeRangos(todas);
  const conTabla = todas.map((l, i) => ({ ...l, tabla: tablas.get(i) || null }));
  const resto = conTabla.filter((l) => l.tabla !== "mipyme");
  const lineas = mipyme ? [...conTabla.filter((l) => l.tabla === "mipyme"), ...resto] : resto;
  const salida = {};
  for (const req of REQUISITOS) {
    for (const l of lineas) {
      const { linea, pagina } = l;
      if (!req.re.test(linea)) continue;
      /* el ANÁLISIS DEL SECTOR de los estudios previos no es el requisito: «el 80 % de las
         empresas de la muestra tienen una liquidez mayor o igual a 1» (CO1.REQ.10130899) */
      if ((req.tipo === "ratio" || req.tipo === "ratio_max") && MUESTRA_RE.test(linea)) continue;
      let valor = null;
      if (req.tipo === "dinero") { const m = linea.match(DINERO_RE); if (m) valor = numeroDe(m[1]); if (valor != null && valor < 1e6) valor = null; }
      else if (req.tipo === "ratio") { const m = linea.match(RATIO_RE); if (m) valor = Number(String(m[1]).replace(",", ".")); }
      else if (req.tipo === "ratio_max") { const m = linea.match(RATIO_MAX_RE) || linea.match(RATIO_RE); if (m) { valor = Number(String(m[1]).replace(",", ".")); if (valor > 1 && valor <= 100) valor = valor / 100; } }
      else if (req.tipo === "smmlv") { const m = linea.match(/([\d]+(?:[.,]\d+)?)\s*(?:smmlv|smlmv|salarios?\s+m[ií]nimos?)/i); if (m) valor = numeroDe(m[1]); }
      else if (req.tipo === "meses") { const m = linea.match(/(\d{1,3})\s*\)?\s*meses/i); if (m) valor = Number(m[1]); }
      if (valor == null || !Number.isFinite(valor)) continue;
      const varias = req.tipo === "ratio" || req.tipo === "ratio_max" ? cifrasDe(req, linea) : [];
      if (!salida[req.id]) salida[req.id] = { id: req.id, etiqueta: req.etiqueta, valor, tipo: req.tipo, evidencia: linea.slice(0, 200), pagina: pagina == null ? null : pagina, tabla: l.tabla || null, ...(varias.length > 1 ? { valores: varias } : {}), ...(varias.length === 2 && limiteRango != null ? { limite_rango_smmlv: limiteRango } : {}) };
      break;
    }
  }
  return salida;
}

const fmt = (v, tipo) => (tipo === "dinero" ? `$${Math.round(v).toLocaleString("es-CO")}` : tipo === "smmlv" ? `${v.toLocaleString("es-CO")} salarios mínimos` : tipo === "meses" ? `${v} meses` : tipo === "ratio_max" ? `${(v * 100).toLocaleString("es-CO", { maximumFractionDigits: 2 })} %` : v.toLocaleString("es-CO", { maximumFractionDigits: 2 }));

/* LA REGLA DE CUMPLIMIENTO, EN UN SOLO SITIO (2-sep-2026). Devuelve "si", "no"
   o "sin_dato". La guarda de ausencia va ANTES de `Number(…)`: `Number(null)`
   es 0 y pasa `isFinite`, así que un perfil sin capital de trabajo salía «no
   cumple» en vez de «sin dato» —la cicatriz de CLAUDE.md, aquí en el vigía—.
   Un requisito sin valor exigido (`valorExigido == null`) se cumple: no hay
   nada que incumplir. El dictamen del pliego la LLAMA, no la copia.
   LA EXPERIENCIA NO SE JUZGA CON UN SOLO CONTRATO (27-sep-2026, R-02): el
   pliego deja sumar varios, así que el mayor por debajo de la cifra no es
   «no». Decide lib/reparto.experienciaSola con `contexto` ({perfil,
   presupuestoSMMLV, tipoContrato}); puede devolver además "revisar" (sumando
   podría llegar). Sin contexto, la experiencia nunca sale «no». */
function juicioRequisito(req, valorDelPerfil, valorExigido, contexto = null) {
  if (valorDelPerfil == null || valorDelPerfil === "") return { estado: "sin_dato" };
  const propio = Number(valorDelPerfil);
  if (!Number.isFinite(propio)) return { estado: "sin_dato" };
  if (valorExigido == null) return { estado: "si" };
  const v = Number(valorExigido);
  if (!Number.isFinite(v)) return { estado: "si" };
  const base = (req && req.sentido === "max" ? propio <= v : propio >= v) ? "si" : "no";
  if (!req || req.perfil !== "expSMMLV") return { estado: base };
  const c = contexto || {};
  if (!c.perfil) return { estado: base === "no" ? "revisar" : base, medida: null };
  const { experienciaSola } = require("./reparto.js");
  return experienciaSola({ perfil: { ...c.perfil, expSMMLV: valorDelPerfil }, exigidaSMMLV: v, presupuestoSMMLV: c.presupuestoSMMLV, tipoContrato: c.tipoContrato, tabla: c.tablaExperiencia || null });
}
function cumpleRequisito(req, valorDelPerfil, valorExigido, contexto = null) {
  return juicioRequisito(req, valorDelPerfil, valorExigido, contexto).estado;
}
/* Lo que la experiencia suma, con los MISMOS nombres en el dictamen y en la
   ficha, redondeado a centésimas (la verificación del dictamen exige que cada
   cifra de un texto esté tal cual en su entrada). null si no se midió. */
const centesimas = (x) => (x == null || !Number.isFinite(Number(x)) ? null : Math.round(Number(x) * 100) / 100);
function experienciaSumadaDe(j) {
  if (!j || !j.medida) return null;
  return { medida: j.medida, contratos: j.contratos == null ? null : j.contratos, suman_smmlv: j.medida === "segmento72" ? centesimas(j.cota) : null,
    mayor_contrato_smmlv: centesimas(j.uno), mayor_por_su_porcentaje: !!j.uno_por_porcentaje,
    alcanza_con: j.alcanza_con == null ? null : j.alcanza_con, exigida_con_esos_smmlv: j.alcanza_con == null ? null : centesimas(j.exigida) };
}
/* La frase de la experiencia, UNA para el dictamen y la ficha (27-sep-2026, R-02).
   `estado` es el de juicioRequisito ("si" | "revisar" | "no"); `x`, experienciaSumadaDe;
   `exigida`, la cifra de la línea leída. Con la lista, las cifras son sumas reales;
   sin ella, solo se sabe el mayor contrato y se dice así. */
function fraseExperiencia(estado, x, exigida) {
  const s = (v) => fmt(v, "smmlv");
  const mayor = x.mayor_contrato_smmlv == null ? "" : ` (${s(x.mayor_contrato_smmlv)}${x.mayor_por_su_porcentaje ? ", por su porcentaje de participación" : ""})`;
  const suyos = x.contratos === 1 ? "su contrato" : `sus ${x.contratos} mayores contratos`;
  const suman = x.suman_smmlv == null ? null : `${suyos} ${x.contratos === 1 ? "es de" : "suman"} ${s(x.suman_smmlv)}`;
  /* con menos contratos el pliego tipo exige menos que la línea leída (la cifra
     leída puede ser la fila de cinco contratos): se dice, con la cifra */
  const tablaMenor = x.alcanza_con != null && x.exigida_con_esos_smmlv != null && exigida != null && x.exigida_con_esos_smmlv < exigida;
  const menos = tablaMenor ? ` Con ${x.alcanza_con === 1 ? "un contrato" : `${x.alcanza_con} contratos`} el pliego tipo exige ${s(x.exigida_con_esos_smmlv)}, menos que esa línea.` : "";
  if (estado === "si") return `Su contrato más grande${mayor} llega solo a la cifra de esa línea. Confirme en el pliego que sea del tipo de obra y de los códigos que pide.`;
  if (estado === "revisar") {
    if (tablaMenor && x.alcanza_con === 1) return `Su contrato más grande${mayor} no llega a la cifra de esa línea, pero con un solo contrato el pliego tipo exige ${s(x.exigida_con_esos_smmlv)}, y a eso sí llega. Confirme en el pliego cuántos contratos deja sumar y qué cifra exige con cada número.`;
    return suman
      ? `Su contrato más grande${mayor} no llega solo a la cifra de esa línea, pero ${suman}.${menos} Confirme en el pliego cuántos contratos deja sumar y de qué códigos.`
      : `Su contrato más grande${mayor} no llega solo a la cifra de esa línea; sumando varios podría llegar.${menos} Confirme en el pliego cuántos contratos deja sumar y compárelos con su registro.`;
  }
  if (estado === "no") return suman
    ? `${x.contratos === 1 ? `Su único contrato (${s(x.suman_smmlv)}) no llega` : `Ni sumando ${suyos} (${s(x.suman_smmlv)}) llega`} a la cifra de esa línea. Un socio puede aportar la experiencia que falta.`
    : `Ni con ${x.contratos === 1 ? "un contrato" : `${x.contratos} contratos`} del tamaño del más grande${mayor} llegaría a la cifra de esa línea. Un socio puede aportar la experiencia que falta.`;
  return null;
}

/* Compara los habilitantes de dos versiones y los reevalúa contra el perfil.
   Devuelve solo lo que CAMBIÓ, con «le afecta» decidido: cumplía antes y ya no
   (o al revés), o el requisito no depende del perfil (plazo → no le afecta). */
function compararHabilitantes(antes, despues, perfilId) {
  const perfil = perfilId && Object.prototype.hasOwnProperty.call(PERFILES, perfilId) ? PERFILES[perfilId] : null;
  const cambios = [];
  for (const req of REQUISITOS) {
    const a = antes[req.id], d = despues[req.id];
    if (!a && !d) continue;
    if (a && d && Math.abs(a.valor - d.valor) < 1e-9) continue;
    const valorAntes = a ? a.valor : null, valorDespues = d ? d.valor : null;
    let cumpliaAntes = null, cumpleAhora = null, afecta = null, mensaje;
    /* `cumpleRequisito` decide; aquí solo se traduce «sin_dato» a «no se pudo
       comparar» (afecta = null), que es lo que ya hacía cuando el valor no era
       numérico — y ahora también cuando el perfil no tiene el dato. */
    const propioCrudo = perfil && req.perfil != null ? perfil[req.perfil] : null;
    /* una fila con varias cifras (rangos de presupuesto) no se juzga: no se sabe cuál aplica */
    const ambigua = !!((a && a.valores) || (d && d.valores));
    let porConfirmar = false;
    if (perfil && req.perfil && !ambigua && cumpleRequisito(req, propioCrudo, null) !== "sin_dato") {
      /* "revisar" (la experiencia que sumando podría llegar) no es ni «cumple» ni
         «no cumple»: se dice así, y la adenda le afecta porque hay que mirarla */
      const cumple = (v) => { const e = cumpleRequisito(req, propioCrudo, v, { perfil }); return e === "si" ? true : e === "no" ? false : null; };
      cumpliaAntes = cumple(valorAntes); cumpleAhora = cumple(valorDespues);
      if (cumpleAhora === null) { porConfirmar = true; afecta = true; }
      else afecta = cumpliaAntes !== cumpleAhora || (!cumpleAhora);
    }
    const de = valorAntes == null ? "no se exigía" : fmt(valorAntes, req.tipo);
    const aTexto = valorDespues == null ? "ya no se exige" : fmt(valorDespues, req.tipo);
    const direccion = valorAntes != null && valorDespues != null ? (valorDespues > valorAntes ? "subió" : "bajó") : "cambió";
    mensaje = `${req.etiqueta}: ${direccion} de ${de} a ${aTexto}.`;
    if (afecta === null) mensaje += ambigua ? " El documento fija varias cifras en esa fila (por rangos de presupuesto): confirme cuál le aplica." : req.perfil ? " No se pudo comparar con su perfil." : " No le afecta.";
    else if (porConfirmar) mensaje += " Su contrato más grande no llega solo; sumando varios podría llegar: confirme en el pliego cuántos contratos se suman.";
    else if (!cumpleAhora && cumpliaAntes) mensaje += " Usted ya no cumple.";
    else if (!cumpleAhora) mensaje += " Usted no cumple.";
    else if (cumpleAhora && cumpliaAntes === false) mensaje += " Ahora sí cumple.";
    else mensaje += " No le afecta.";
    cambios.push({ id: req.id, etiqueta: req.etiqueta, antes: valorAntes, despues: valorDespues, tipo: req.tipo, afecta: afecta === null ? (req.perfil ? null : false) : afecta, cumplia_antes: cumpliaAntes, cumple_ahora: cumpleAhora, mensaje, evidencia: (d && d.evidencia) || (a && a.evidencia) || null,
      /* la página de la versión NUEVA (donde hay que ir a leer); si el dato solo existía antes, la de antes; null si ninguna la trae */
      pagina: d && d.pagina != null ? d.pagina : (a && a.pagina != null ? a.pagina : null) });
  }
  return cambios;
}

/* ─── persistencia ─── */
async function leerIndice(redis, id) {
  const raw = await redis.get(claveIndice(id));
  if (!raw) return { versiones: [] };
  try { const j = typeof raw === "string" ? JSON.parse(raw) : raw; return j && Array.isArray(j.versiones) ? j : { versiones: [] }; } catch { return { versiones: [] }; }
}
async function leerVersion(redis, id, n) {
  const raw = await redis.get(claveVersion(id, n));
  if (!raw) return null;
  try { return typeof raw === "string" ? JSON.parse(raw) : raw; } catch { return null; }
}

/* Registra el texto: si el hash es nuevo crea la versión n+1 y el diff con la
   anterior; si es el mismo, no escribe nada y lo dice. */
/* la tabla de indicadores que le toca al perfil del vigía (revisión adversaria, 27-sep-2026:
   sin esto una Mipyme recibía «ya no cumple» por un cambio en la tabla de los demás) */
const opcionesDe = (perfilId) => ({ mipyme: !!perfilId && Object.prototype.hasOwnProperty.call(PERFILES, perfilId) && require("./perfiles.js").esMipyme(PERFILES[perfilId]) === true });
async function registrarVersion(redis, { idProceso, texto, origen = "lector", perfilId = null, ahora = Date.now() }) {
  const op = opcionesDe(perfilId);
  const normalizado = normalizarTexto(texto);            // SIN marcadores: es lo que se hashea
  const recortado = normalizado.length > MAX_TEXTO;
  const hash = hashDe(recortado ? normalizado.slice(0, MAX_TEXTO) : normalizado);
  /* Lo que se GUARDA lleva los marcadores de página (unos bytes más), para
     poder citar «pág. N» al reevaluar; el hash NO los ve. */
  const conPaginas = normalizarConPaginas(texto);
  const guardable = recortado ? conPaginas.slice(0, MAX_TEXTO) : conPaginas;
  const indice = await leerIndice(redis, idProceso);
  const ultima = indice.versiones.length ? indice.versiones[indice.versiones.length - 1] : null;
  if (ultima && ultima.hash === hash) {
    const diffPrevio = ultima.n > 1 ? await leerJSONSeguro(redis, claveDiff(idProceso, ultima.n)) : null;
    return { cambio: false, version: ultima.n, hash, versiones: indice.versiones, diff: diffPrevio, habilitantes: extraerHabilitantes(guardable, op), recortado };
  }
  const n = ultima ? ultima.n + 1 : 1;
  const fecha = new Date(ahora).toISOString();
  await redis.set(claveVersion(idProceso, n), JSON.stringify({ hash, texto_normalizado: guardable, fecha, origen, recortado }));
  let diff = null;
  if (ultima) {
    const anterior = await leerVersion(redis, idProceso, ultima.n);
    if (anterior && anterior.texto_normalizado != null) {
      const habAntes = extraerHabilitantes(anterior.texto_normalizado, op), habDespues = extraerHabilitantes(guardable, op);
      diff = {
        de: ultima.n, a: n, fecha,
        parrafos: diffParrafos(anterior.texto_normalizado, guardable),
        habilitantes: { antes: habAntes, despues: habDespues, cambios: compararHabilitantes(habAntes, habDespues, perfilId), perfil: perfilId || null },
      };
      await redis.set(claveDiff(idProceso, n), JSON.stringify(diff));
    }
  }
  indice.versiones.push({ n, hash, fecha, origen });
  // retención: como mucho MAX_VERSIONES (se borran las más viejas y sus diffs)
  while (indice.versiones.length > MAX_VERSIONES) {
    const vieja = indice.versiones.shift();
    try { await redis.del(claveVersion(idProceso, vieja.n), claveDiff(idProceso, vieja.n)); } catch { /* opcional */ }
  }
  await redis.set(claveIndice(idProceso), JSON.stringify(indice));
  return { cambio: !!ultima, version: n, hash, versiones: indice.versiones, diff, habilitantes: extraerHabilitantes(guardable, op), recortado };
}
async function leerJSONSeguro(redis, k) { const raw = await redis.get(k); if (!raw) return null; try { return typeof raw === "string" ? JSON.parse(raw) : raw; } catch { return null; } }

/* Reevalúa el último diff guardado contra otro perfil (sin reescribir). */
async function ultimoDiff(redis, idProceso, perfilId) {
  const indice = await leerIndice(redis, idProceso);
  const ultima = indice.versiones[indice.versiones.length - 1];
  if (!ultima || ultima.n < 2) return { versiones: indice.versiones, diff: null };
  const diff = await leerJSONSeguro(redis, claveDiff(idProceso, ultima.n));
  if (diff && diff.habilitantes && perfilId) {
    /* las cifras guardadas se leyeron con la tabla del perfil que guardó: para otro perfil
       se vuelven a leer de los textos guardados con SU tabla (Mipyme o los demás) */
    const [va, vb] = await Promise.all([leerVersion(redis, idProceso, diff.de), leerVersion(redis, idProceso, diff.a)]).catch(() => [null, null]);
    if (va && vb && va.texto_normalizado != null && vb.texto_normalizado != null) {
      const op = opcionesDe(perfilId);
      diff.habilitantes.antes = extraerHabilitantes(va.texto_normalizado, op); diff.habilitantes.despues = extraerHabilitantes(vb.texto_normalizado, op);
    }
    diff.habilitantes.cambios = compararHabilitantes(diff.habilitantes.antes || {}, diff.habilitantes.despues || {}, perfilId);
  }
  return { versiones: indice.versiones, diff };
}

module.exports = {
  normalizarTexto, normalizarConPaginas, hashDe, parrafosDe, diffParrafos, extraerHabilitantes, compararHabilitantes, cumpleRequisito, juicioRequisito, experienciaSumadaDe, fraseExperiencia,
  registrarVersion, ultimoDiff, leerIndice, leerVersion,
  REQUISITOS, MAX_VERSIONES, MAX_TEXTO, tablasDeIndicadores, limiteDeRangos, valorSegunRango, lotesDe, claveVersion, claveDiff, claveIndice,
  /* el formato de un valor exigido, en una sola copia (3-sep-2026): la guía de
     Mis procesos enseña las cifras leídas de los documentos con este mismo fmt */
  fmtValorRequisito: fmt,
};
