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
  { id: "liquidez", etiqueta: "Índice de liquidez mínimo", re: /(?:índice|indice|razón|razon)?\s*de?\s*liquidez/i, tipo: "ratio", perfil: "liquidez", sentido: "min" },
  { id: "endeudamiento", etiqueta: "Nivel de endeudamiento máximo", re: /(?:nivel|índice|indice)?\s*de?\s*endeudamiento/i, tipo: "ratio_max", perfil: "endeudamiento", sentido: "max" },
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

function extraerHabilitantes(texto) {
  /* Cada línea viaja con su página (null si el texto no trae marcadores):
     la evidencia se cita como «pág. N» cuando se sabe, y no se inventa. */
  const lineas = lineasConPagina(normalizarConPaginas(texto));
  const salida = {};
  for (const req of REQUISITOS) {
    for (const { linea, pagina } of lineas) {
      if (!req.re.test(linea)) continue;
      let valor = null;
      if (req.tipo === "dinero") { const m = linea.match(DINERO_RE); if (m) valor = numeroDe(m[1]); if (valor != null && valor < 1e6) valor = null; }
      else if (req.tipo === "ratio") { const m = linea.match(RATIO_RE); if (m) valor = Number(String(m[1]).replace(",", ".")); }
      else if (req.tipo === "ratio_max") { const m = linea.match(RATIO_MAX_RE) || linea.match(RATIO_RE); if (m) { valor = Number(String(m[1]).replace(",", ".")); if (valor > 1 && valor <= 100) valor = valor / 100; } }
      else if (req.tipo === "smmlv") { const m = linea.match(/([\d]+(?:[.,]\d+)?)\s*(?:smmlv|smlmv|salarios?\s+m[ií]nimos?)/i); if (m) valor = numeroDe(m[1]); }
      else if (req.tipo === "meses") { const m = linea.match(/(\d{1,3})\s*\)?\s*meses/i); if (m) valor = Number(m[1]); }
      if (valor == null || !Number.isFinite(valor)) continue;
      if (!salida[req.id]) salida[req.id] = { id: req.id, etiqueta: req.etiqueta, valor, tipo: req.tipo, evidencia: linea.slice(0, 200), pagina: pagina == null ? null : pagina };
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
   nada que incumplir. El dictamen del pliego la LLAMA, no la copia. */
function cumpleRequisito(req, valorDelPerfil, valorExigido) {
  if (valorDelPerfil == null || valorDelPerfil === "") return "sin_dato";
  const propio = Number(valorDelPerfil);
  if (!Number.isFinite(propio)) return "sin_dato";
  if (valorExigido == null) return "si";
  const v = Number(valorExigido);
  if (!Number.isFinite(v)) return "si";
  return (req && req.sentido === "max" ? propio <= v : propio >= v) ? "si" : "no";
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
    if (perfil && req.perfil && cumpleRequisito(req, propioCrudo, null) !== "sin_dato") {
      const cumple = (v) => cumpleRequisito(req, propioCrudo, v) === "si";
      cumpliaAntes = cumple(valorAntes); cumpleAhora = cumple(valorDespues);
      afecta = cumpliaAntes !== cumpleAhora || (!cumpleAhora);
    }
    const de = valorAntes == null ? "no se exigía" : fmt(valorAntes, req.tipo);
    const aTexto = valorDespues == null ? "ya no se exige" : fmt(valorDespues, req.tipo);
    const direccion = valorAntes != null && valorDespues != null ? (valorDespues > valorAntes ? "subió" : "bajó") : "cambió";
    mensaje = `${req.etiqueta}: ${direccion} de ${de} a ${aTexto}.`;
    if (afecta === null) mensaje += req.perfil ? " No se pudo comparar con su perfil." : " No le afecta.";
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
async function registrarVersion(redis, { idProceso, texto, origen = "lector", perfilId = null, ahora = Date.now() }) {
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
    return { cambio: false, version: ultima.n, hash, versiones: indice.versiones, diff: diffPrevio, habilitantes: extraerHabilitantes(guardable), recortado };
  }
  const n = ultima ? ultima.n + 1 : 1;
  const fecha = new Date(ahora).toISOString();
  await redis.set(claveVersion(idProceso, n), JSON.stringify({ hash, texto_normalizado: guardable, fecha, origen, recortado }));
  let diff = null;
  if (ultima) {
    const anterior = await leerVersion(redis, idProceso, ultima.n);
    if (anterior && anterior.texto_normalizado != null) {
      const habAntes = extraerHabilitantes(anterior.texto_normalizado), habDespues = extraerHabilitantes(guardable);
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
  return { cambio: !!ultima, version: n, hash, versiones: indice.versiones, diff, habilitantes: extraerHabilitantes(guardable), recortado };
}
async function leerJSONSeguro(redis, k) { const raw = await redis.get(k); if (!raw) return null; try { return typeof raw === "string" ? JSON.parse(raw) : raw; } catch { return null; } }

/* Reevalúa el último diff guardado contra otro perfil (sin reescribir). */
async function ultimoDiff(redis, idProceso, perfilId) {
  const indice = await leerIndice(redis, idProceso);
  const ultima = indice.versiones[indice.versiones.length - 1];
  if (!ultima || ultima.n < 2) return { versiones: indice.versiones, diff: null };
  const diff = await leerJSONSeguro(redis, claveDiff(idProceso, ultima.n));
  if (diff && diff.habilitantes && perfilId) diff.habilitantes.cambios = compararHabilitantes(diff.habilitantes.antes || {}, diff.habilitantes.despues || {}, perfilId);
  return { versiones: indice.versiones, diff };
}

module.exports = {
  normalizarTexto, normalizarConPaginas, hashDe, parrafosDe, diffParrafos, extraerHabilitantes, compararHabilitantes, cumpleRequisito,
  registrarVersion, ultimoDiff, leerIndice, leerVersion,
  REQUISITOS, MAX_VERSIONES, MAX_TEXTO, claveVersion, claveDiff, claveIndice,
  /* el formato de un valor exigido, en una sola copia (3-sep-2026): la guía de
     Mis procesos enseña las cifras leídas de los documentos con este mismo fmt */
  fmtValorRequisito: fmt,
};
