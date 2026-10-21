/* lib/auditoria_lectura.js · ¿LO QUE DETEKTA DICE HABER LEÍDO SE PUEDE LEER DE VERDAD? (20-oct-2026)
   ────────────────────────────────────────────────────────────────────────────────────────────────
   Capa PURA: sin red ni Redis. Recibe el texto que la aplicación GUARDÓ de un documento y mide, página por
   página, si ese texto parece lo que dice ser: cuántas páginas traen texto, cuánto, qué proporción son letras,
   si faltan páginas que el documento tiene, si el texto guardado es el mismo que se leyó (hash) y si aparecen
   las palabras que ese tipo de documento tiene que traer (un presupuesto: ítem, unidad, cantidad, valor).

   LO QUE ESTO NO ES. No dice que un documento esté «bien leído»: dice si hay INDICIOS de que no. «sin_indicios»
   no es «correcto» (un OCR puede equivocar una cifra y dejar todo esto en verde); solo se comprueba cifra por
   cifra contra el original en SECOP II. Por eso la salida nunca usa la palabra «correcto» ni «verificado».
   Tampoco decide nada en la aplicación: no alimenta el dictamen ni ninguna cifra. Mide, no filtra.

   LOS UMBRALES SON DE LA SESIÓN, NO DEL DUEÑO NI DE UNA NORMA: salen en cada respuesta (`umbrales`) para que se
   discutan con los datos delante. Una página en blanco en un documento de una oferta es una ALERTA (decisión del
   dueño, 20-oct-2026: todos los documentos de un proceso son formales), no algo normal.

   «Sin dato» ≠ «cero»: lo que no se puede medir (un documento sin marcadores de página, un tipo sin anclas
   definidas) sale `null`, jamás 0. */
"use strict";

const { numeroDeMarcador, siguientePagina } = require("./paginas.js");
const { plegar } = require("./documentos_proceso.js");

const UMBRALES = Object.freeze({
  min_letras_pagina: 20,          // por debajo, la página cuenta como «sin texto»
  poco_texto_pct_de_la_pagina_tipica: 10,   // una página con menos de este % de las letras de la página típica (percentil 75) de SU documento trae «muy poco texto»
  min_paginas_para_comparar: 4,   // con menos páginas no hay «página típica» que valga
  min_letras_pct: 35,             // % de letras entre los caracteres que no son espacio; un texto corrido da de 86 a 94 (medido el 20-oct-2026), y una tabla de cifras mucho menos: por eso los presupuestos están exentos
  max_reemplazo_pct: 1,           // % de caracteres de reemplazo («�») o de control: la señal de una codificación rota
  max_tokens_1_letra_pct: 30,     // % de «palabras» de una sola letra: el OCR que deshace las palabras («l i t r a»)
});
/* Los tipos que son TABLAS de cifras: la proporción de letras y las palabras de una letra no miden ahí lo que miden en un texto corrido (excepción DECLARADA, con su motivo y su medida).
   Siguen valiendo para ellos las páginas sin texto, las de poco texto, las anclas, las filas de partida y la huella. */
const TIPOS_TABULARES = Object.freeze({
  presupuesto: "es una tabla de cantidades y precios: las cifras pesan más que las letras (un presupuesto de 6 páginas con 74 filas reconocidas dio 32,1 % de letras el 20-oct-2026) y las unidades («m2», «m3») parecen palabras de una letra",
});
const MAX_PAGINAS_AUDITADAS = 100000;   // el mismo tope con que `op=documentos` acepta `paginas_total`: más es un dato que no se cree, no un arreglo de ese tamaño
const MAX_LARGO_FILA_PARTIDA = 600;     // una fila de partida es corta; una línea de decenas de miles de caracteres no es una fila y haría lenta la expresión (medido: 30.000 dígitos seguidos, 2,5 s)
const MAX_PAGINAS_LISTADAS = 40;
const MAX_PAGINAS_DETALLE = 600;

/* Las palabras que cada tipo de documento TIENE que traer, en minúsculas y sin tildes (se compara contra el texto
   plegado). Son indicios de lectura, no normas: un estudio previo sin la palabra «plazo» puede existir, y por eso
   faltar UNA ancla es una nota y faltar TODAS es una alerta. */
const ANCLAS_PLIEGO = Object.freeze([
  { id: "requisitos", etiqueta: "requisitos o capacidad", re: /requisitos habilitantes|capacidad (juridica|financiera|tecnica|organizacional)|experiencia/ },
  { id: "cronograma", etiqueta: "cronograma", re: /cronograma/ },
  { id: "garantias", etiqueta: "garantías", re: /garantia/ },
  { id: "rechazo", etiqueta: "causales de rechazo", re: /rechaz/ },
]);
const ANCLAS = Object.freeze({
  presupuesto: [
    { id: "item", etiqueta: "ítem", re: /\bitems?\b|^\s*\d+(\.\d+)+\s/m },
    { id: "descripcion", etiqueta: "descripción", re: /descripcion|actividad|concepto/ },
    { id: "unidad", etiqueta: "unidad", re: /\bunidad\b|\bund\b|\bm2\b|\bm3\b|\bml\b|\bkg\b|\bglb?\b|\bun\b/ },
    { id: "cantidad", etiqueta: "cantidad", re: /\bcant\b|cantidad/ },
    { id: "valor", etiqueta: "valor o precio", re: /valor|precio|\btotal\b|\bvr\b/ },
  ],
  estudio_previo: [
    { id: "objeto", etiqueta: "objeto", re: /\bobjeto\b/ },
    { id: "plazo", etiqueta: "plazo", re: /\bplazo\b/ },
    { id: "valor", etiqueta: "valor o presupuesto", re: /valor estimado|presupuesto|\bvalor\b/ },
    { id: "necesidad", etiqueta: "necesidad", re: /necesidad|justificacion/ },
  ],
  pliego: ANCLAS_PLIEGO,
  documento_base: ANCLAS_PLIEGO,
  pliego_borrador: ANCLAS_PLIEGO,
  matriz_indicadores: [
    { id: "liquidez", etiqueta: "índice de liquidez", re: /liquidez/ },
    { id: "endeudamiento", etiqueta: "endeudamiento", re: /endeudamiento/ },
    { id: "capital", etiqueta: "capital de trabajo", re: /capital de trabajo/ },
  ],
  cronograma: [
    { id: "fecha", etiqueta: "fechas", re: /\b20\d\d\b/ },
    { id: "hito", etiqueta: "hitos", re: /cierre|apertura|publicacion|observaciones|audiencia/ },
  ],
});
/* una fila de partida de un presupuesto: numeral, descripción y una cifra al final (columnas separadas por espacios o TAB) */
const FILA_PARTIDA_RE = /^\d+(?:\.\d+)*[\s.)-]+\D.*\d[\d.,]*\s*$/;

const nuevaPagina = () => ({ letras: 0, digitos: 0, otros: 0 });

/** Parte un texto con marcadores `\f<n>` en páginas y cuenta, por página, letras, dígitos y otros caracteres que no son
    espacio. Una página con marcador y sin líneas (una en blanco) EXISTE con todo en 0; el texto antes del primer
    marcador va aparte (`sinMarca`). Devuelve también cuántos marcadores repetidos trajo. */
function paginasDe(texto) {
  const paginas = new Map();
  const sinMarca = nuevaPagina();
  let actual = null, repetidos = 0;
  for (const linea of String(texto == null ? "" : texto).split(/\r\n|\r|\n/)) {
    const m = numeroDeMarcador(linea);
    if (m !== undefined) {
      actual = siguientePagina(actual, m);
      if (paginas.has(actual)) repetidos++; else paginas.set(actual, nuevaPagina());
      continue;
    }
    const p = actual == null ? sinMarca : paginas.get(actual);
    const letras = (linea.match(/\p{L}/gu) || []).length;
    const digitos = (linea.match(/\p{N}/gu) || []).length;
    const sinEspacios = linea.replace(/\s/g, "").length;
    p.letras += letras; p.digitos += digitos; p.otros += Math.max(0, sinEspacios - letras - digitos);
  }
  return { paginas, sinMarca, repetidos };
}

/* percentil 75 por rango más cercano: la «página típica» de un documento, que no se mueve porque unas pocas páginas estén vacías */
const percentil75 = (nums) => { if (!nums.length) return null; const o = [...nums].sort((a, b) => a - b); return o[Math.ceil(0.75 * o.length) - 1]; };
const mediana = (nums) => {
  if (!nums.length) return null;
  const o = [...nums].sort((a, b) => a - b), m = o.length >> 1;
  return o.length % 2 ? o[m] : Math.round((o[m - 1] + o[m]) / 2);
};
const lista = (nums) => (nums.length > MAX_PAGINAS_LISTADAS ? nums.slice(0, MAX_PAGINAS_LISTADAS) : nums);
const comoRango = (nums) => {
  const out = []; let i = 0;
  while (i < nums.length) { let j = i; while (j + 1 < nums.length && nums[j + 1] === nums[j] + 1) j++; out.push(j > i + 1 ? `${nums[i]}-${nums[j]}` : nums.slice(i, j + 1).join(", ")); i = j + 1; }
  return out.join(", ");
};

/** Audita UN documento guardado. `d` = { texto, tipo, origen, paginas_total, paginas_sin_texto, recortado, hash }
    (lo que guarda `op=documentos`). `detalle: true` añade la cuenta página por página. Nunca devuelve el texto. */
function auditarDocumento(d, { detalle = false } = {}) {
  const texto = String((d && d.texto) || "");
  const tipo = d && d.tipo ? String(d.tipo) : "otro";
  const motivos = [];
  const motivo = (nivel, codigo, texto_) => motivos.push({ nivel, codigo, texto: texto_ });
  const { paginas, sinMarca, repetidos } = paginasDe(texto);
  const numeros = [...paginas.keys()].sort((a, b) => a - b);
  const total = Number.isInteger(d && d.paginas_total) && d.paginas_total > 0 && d.paginas_total <= MAX_PAGINAS_AUDITADAS ? d.paginas_total : null;

  /* qué páginas hay y cuáles traen texto: con el total conocido, TODAS las de 1 a total (una sin marcador es una sin texto);
     sin él, solo las que tienen marcador */
  const universo = total != null ? Array.from({ length: total }, (_, i) => i + 1) : numeros;
  const conTexto = [], sinTexto = [];
  for (const n of universo) {
    const p = paginas.get(n);
    (p && p.letras >= UMBRALES.min_letras_pagina ? conTexto : sinTexto).push(n);
  }
  /* páginas con MUY POCO texto frente al resto del mismo documento (las de menos de min_letras_pagina ya son «sin texto») */
  /* solo las páginas que el documento TIENE (de 1 a su total): un marcador fuera de rango es un dato dudoso y no puede mover la «página típica» ni quedar en una lista de páginas que no existen */
  const fuera = total != null ? numeros.filter((n) => n < 1 || n > total) : [];
  const propias = numeros.filter((n) => n >= 1 && (total == null || n <= total));
  const letrasMarcadas = propias.map((n) => paginas.get(n).letras);
  const tipica = propias.length >= UMBRALES.min_paginas_para_comparar ? percentil75(letrasMarcadas) : null;
  /* el corte DECIDE, así que es exacto: con letras enteras, «letras < tipica × 10 / 100» es lo mismo que «letras < ceil(tipica × 10 / 100)»; el número que se muestra es ese mismo, no un redondeo (115 de 1.154 es 9,97 %: se marca) */
  const corte = tipica != null ? Math.ceil((tipica * UMBRALES.poco_texto_pct_de_la_pagina_tipica) / 100) : null;
  const pocoTexto = corte == null ? [] : propias.filter((n) => { const l = paginas.get(n).letras; return l >= UMBRALES.min_letras_pagina && l < corte; });

  const letras = [...paginas.values()].reduce((s, p) => s + p.letras, 0) + sinMarca.letras;
  const digitos = [...paginas.values()].reduce((s, p) => s + p.digitos, 0) + sinMarca.digitos;
  const otros = [...paginas.values()].reduce((s, p) => s + p.otros, 0) + sinMarca.otros;
  const noEspacio = letras + digitos + otros;
  const letrasPct = noEspacio > 0 ? Math.round((letras / noEspacio) * 1000) / 10 : null;
  const reemplazo = (texto.match(/[�\u0000-\u0008\u000B\u000E-\u001F]/g) || []).length;
  const reemplazoPct = noEspacio > 0 ? Math.round((reemplazo / noEspacio) * 1000) / 10 : null;
  const tokens = texto.match(/(?<![\p{L}\p{N}])\p{L}+(?![\p{L}\p{N}])/gu) || [];   // palabras sueltas: la «m» de «m3» no es una palabra
  const tokens1Pct = tokens.length >= 50 ? Math.round((tokens.filter((t) => t.length === 1).length / tokens.length) * 1000) / 10 : null;

  /* ── los indicios ── */
  if (!texto.trim()) motivo("revisar", "sin_texto", "el texto guardado está vacío");
  if (total != null && sinTexto.length) {
    motivo("revisar", "paginas_sin_texto", `${sinTexto.length} de ${total} páginas sin texto (pág. ${comoRango(sinTexto.slice(0, MAX_PAGINAS_LISTADAS))}${sinTexto.length > MAX_PAGINAS_LISTADAS ? "…" : ""})`);
  } else if (total == null && sinTexto.length) {
    motivo("revisar", "paginas_sin_texto", `${sinTexto.length} páginas con marcador y sin texto (pág. ${comoRango(sinTexto.slice(0, MAX_PAGINAS_LISTADAS))})`);
  }
  if (pocoTexto.length) motivo("revisar", "poco_texto", `${pocoTexto.length} ${pocoTexto.length === 1 ? "página con muy poco texto" : "páginas con muy poco texto"} frente al resto del documento (pág. ${comoRango(pocoTexto.slice(0, MAX_PAGINAS_LISTADAS))}${pocoTexto.length > MAX_PAGINAS_LISTADAS ? "…" : ""}: menos de ${corte} letras, cuando la página típica trae ${tipica})`);
  if (numeros.length === 0 && texto.trim()) motivo("nota", "sin_marcadores", "el texto no trae marcadores de página: no se puede citar la página ni saber cuáles faltan");
  if (total == null && numeros.length) motivo("nota", "total_desconocido", "no se guardó cuántas páginas tiene el documento: las que faltan sin marcador no se pueden contar");
  if (fuera.length) motivo("nota", "marcadores_fuera_de_rango", `hay marcadores de página fuera de 1 a ${total} (${fuera.slice(0, 5).join(", ")})`);
  if (repetidos) motivo("nota", "marcadores_repetidos", `${repetidos} marcadores de página repetidos`);
  const tabular = Object.prototype.hasOwnProperty.call(TIPOS_TABULARES, tipo) ? TIPOS_TABULARES[tipo] : null;
  if (!tabular && letrasPct != null && letrasPct < UMBRALES.min_letras_pct) motivo("revisar", "pocas_letras", `solo ${letrasPct} % de los caracteres son letras (el umbral es ${UMBRALES.min_letras_pct} %): puede ser una lectura ilegible`);
  if (reemplazoPct != null && reemplazoPct > UMBRALES.max_reemplazo_pct) motivo("revisar", "caracteres_rotos", `${reemplazoPct} % de caracteres de reemplazo o de control: la codificación del texto salió rota`);
  if (!tabular && tokens1Pct != null && tokens1Pct > UMBRALES.max_tokens_1_letra_pct) motivo("revisar", "palabras_deshechas", `${tokens1Pct} % de las palabras son de una sola letra: las palabras salieron deshechas`);

  /* las palabras que el tipo tiene que traer */
  let anclas = null;
  const definidas = Object.prototype.hasOwnProperty.call(ANCLAS, tipo) ? ANCLAS[tipo] : null;
  if (definidas && texto.trim()) {
    const plano = plegar(texto.replace(/[\f]/g, " ")), planoLineas = texto.split(/\r\n|\r|\n/).map(plegar);
    const halladas = definidas.filter((a) => a.re.test(plano) || planoLineas.some((l) => a.re.test(l))).map((a) => a.id);
    anclas = { definidas: definidas.map((a) => a.id), halladas, faltan: definidas.filter((a) => !halladas.includes(a.id)).map((a) => a.etiqueta) };
    if (!halladas.length) motivo("revisar", "anclas_ausentes", `no aparece ninguna de las palabras que trae un documento de este tipo (${definidas.map((a) => a.etiqueta).join(", ")})`);
    else if (anclas.faltan.length) motivo("nota", "anclas_incompletas", `no aparece: ${anclas.faltan.join(", ")}`);
    if (tipo === "presupuesto") {
      const filas = planoLineas.filter((l) => l.length <= MAX_LARGO_FILA_PARTIDA && FILA_PARTIDA_RE.test(l.trim())).length;
      anclas.filas_de_partida = filas;
      if (!filas) motivo("revisar", "presupuesto_sin_filas", "no se reconoce ninguna fila de partida (numeral, descripción y una cifra)");
    }
  }

  /* ¿el texto guardado es el que se leyó? el hash se calculó al guardar sobre el texto normalizado; un texto recortado ya no puede coincidir */
  let integridad = null;
  if (d && d.recortado === true) {
    integridad = "no_aplica_recortado";
    motivo("nota", "recortado", "el texto se guardó recortado por el tope de caracteres: lo último del documento no está");
  } else if (d && typeof d.hash === "string" && d.hash) {
    const Df = require("./diff.js");
    integridad = Df.hashDe(Df.normalizarTexto(texto)) === d.hash ? "coincide" : "no_coincide";
    if (integridad === "no_coincide") motivo("revisar", "integridad", "el texto guardado no es el mismo con que se calculó su huella al leerlo");
  }

  const revisar = motivos.some((m) => m.nivel === "revisar");
  const caracteresPorPagina = propias.map((n) => paginas.get(n)).map((p) => p.letras + p.digitos + p.otros);
  const salida = {
    origen: d && d.origen === "ocr" ? "ocr" : "texto",
    tipo,
    paginas_total: total,
    paginas_con_marcador: numeros.length,
    paginas_con_texto: numeros.length || total != null ? conTexto.length : null,
    paginas_sin_texto: lista(sinTexto),
    n_paginas_sin_texto: sinTexto.length,
    paginas_con_poco_texto: lista(pocoTexto),
    n_paginas_con_poco_texto: pocoTexto.length,
    letras_pagina_tipica: tipica,
    caracteres: noEspacio,
    caracteres_por_pagina: propias.length ? { mediana: mediana(caracteresPorPagina), min: caracteresPorPagina.reduce((a, b) => (b < a ? b : a)), max: caracteresPorPagina.reduce((a, b) => (b > a ? b : a)) } : null,
    letras_pct: letrasPct,
    reemplazo_pct: reemplazoPct,
    palabras_de_1_letra_pct: tokens1Pct,
    pruebas_omitidas: tabular ? [{ prueba: "proporcion_de_letras_y_palabras_de_una_letra", motivo: `el tipo «${tipo}» ${tabular}` }] : null,
    anclas,
    integridad,
    veredicto: revisar ? "revisar" : motivos.length ? "con_notas" : "sin_indicios",
    motivos,
  };
  if (detalle) salida.paginas = numeros.slice(0, MAX_PAGINAS_DETALLE).map((n) => { const p = paginas.get(n); return { n, letras: p.letras, digitos: p.digitos, otros: p.otros, con_texto: p.letras >= UMBRALES.min_letras_pagina, poco_texto: pocoTexto.includes(n) }; });
  return salida;
}

/** Cuánto tardó la lectura de los documentos y en qué, con lo que la aplicación guardó (`tiempos`, que mide el navegador). `docs` = [{ proceso, nombre, origen, paginas_total, tiempos }].
    Solo cuenta lo MEDIDO: un documento sin `total_ms` no suma ni se promedia (ausencia ≠ cero), y de cada etapa se dice con cuántos documentos se sumó. Las cifras por página son
    de los documentos de los que se sabe el total de páginas. Los redondeos son para mostrar; nada decide con ellos. */
function resumenTiempos(docs) {
  const lista = Array.isArray(docs) ? docs : [];
  const ETAPAS = ["descarga_ms", "lector_ms", "preparar_ms", "reconocer_ms", "espera_ms"];
  const entero = (v) => Number.isInteger(v) && v >= 0;
  const con = lista.filter((d) => d && d.tiempos && entero(d.tiempos.total_ms));
  const porOrigen = {};
  for (const d of con) {
    const k = d.origen === "ocr" ? "ocr" : "texto";
    const o = porOrigen[k] = porOrigen[k] || { documentos: 0, total_ms: 0, etapas: {}, con_paginas: { documentos: 0, paginas: 0, total_ms: 0, ms_por_pagina: null } };
    o.documentos++; o.total_ms += d.tiempos.total_ms;
    for (const e of ETAPAS) if (entero(d.tiempos[e])) { const x = o.etapas[e] = o.etapas[e] || { documentos: 0, ms: 0 }; x.documentos++; x.ms += d.tiempos[e]; }
    if (Number.isInteger(d.paginas_total) && d.paginas_total > 0) { o.con_paginas.documentos++; o.con_paginas.paginas += d.paginas_total; o.con_paginas.total_ms += d.tiempos.total_ms; }
  }
  for (const o of Object.values(porOrigen)) if (o.con_paginas.paginas > 0) o.con_paginas.ms_por_pagina = Math.round(o.con_paginas.total_ms / o.con_paginas.paginas);
  const masLentos = [...con].sort((a, b) => b.tiempos.total_ms - a.tiempos.total_ms).slice(0, 5).map((d) => ({
    proceso: d.proceso || null, nombre: d.nombre || null, origen: d.origen === "ocr" ? "ocr" : "texto", paginas_total: Number.isInteger(d.paginas_total) ? d.paginas_total : null, tiempos: d.tiempos }));
  return { documentos_con_tiempos: con.length, documentos_sin_tiempos: lista.length - con.length, por_origen: porOrigen, mas_lentos: masLentos };
}

module.exports = { resumenTiempos, auditarDocumento, paginasDe, UMBRALES, TIPOS_TABULARES, ANCLAS, FILA_PARTIDA_RE, comoRango, percentil75 };
