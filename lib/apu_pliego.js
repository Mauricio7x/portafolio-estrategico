/* ============================================================================
   lib/apu_pliego · Extraer ítem + unidad + cantidad de la tabla de un pliego
   ----------------------------------------------------------------------------
   QUÉ RESUELVE. El formulario de cantidades (Formulario 1 / presupuesto oficial)
   «vale más que todo lo demás junto»: con ítem + unidad + cantidad se puede
   valorar el proceso completo con precios propios, y sin él hay que inferir las
   cantidades del objeto, que es adivinar (docs/APU_Y_RENTABILIDAD.md §1.G.1).
   Este módulo recibe el TEXTO de ese documento y devuelve la tabla estructurada.

   POR QUÉ TEXTO Y NO EL PDF. `pdfjs-dist` en el runtime de Node «pesa decenas de
   MB; hay que sacarlo del request path» y el OCR «no cabe en el mismo proceso»
   (§1.G.3). La extracción del PDF corre en el NAVEGADOR (public/apu.js, pdf.js
   desde CDN) y aquí llega solo texto: la función serverless se queda con el
   trabajo barato —regex y aritmética— y ninguna dependencia npm entra al
   proyecto. Es la misma vía por la que `/admin.html` encadena la full desde el
   navegador en vez de pedirle una terminal al dueño.

   DOS FORMAS DE RECONOCER UNA FILA, y las dos hacen falta:

     (1) POSICIONAL. Si una línea trae ≥3 cabeceras conocidas
         (ITEM · DESCRIPCION · UNIDAD · CANTIDAD · VR UNITARIO · VR TOTAL), esa
         línea define las columnas y las siguientes se leen por posición. Es el
         camino preciso y el que da la aritmética.
     (2) POR FIRMA DE UNIDAD. «Una celda que es exactamente una de estas
         [M3, M2, ML, KG, UN, GL…] es la señal más barata y fiable de que la
         fila es un ítem de obra» (§1.G.4). Sirve cuando no hay cabecera, cuando
         la cabecera está partida en dos líneas, o cuando el texto llegó
         aplanado y las columnas se perdieron.

   El texto que manda el navegador conserva las columnas separándolas por
   TABULADOR (public/apu.js agrupa por coordenada Y para formar la fila y por
   hueco en X para separar las celdas). Pero un texto pegado a mano no las trae,
   así que (2) nunca se puede quitar «porque ya está (1)».

   EL CERO Y EL «NO SÉ» SON DISTINTOS, otra vez. Una cantidad ilegible es `null`,
   nunca 0 — misma regla que `anticipo_pct = 0` = «sin dato» y que el contador de
   oferentes. Un `|| 0` aquí produciría una cantidad de obra falsa y creíble, que
   en una licitación es plata.

   AQUÍ EL FALSO POSITIVO CUESTA MÁS QUE EL FALSO NEGATIVO — al revés que en el
   filtrado de oportunidades (§1.G.4). Un 🟡 en la lista de licitaciones se
   descarta en 5 s; un ítem inventado o una cantidad mal leída en el presupuesto
   es «un riesgo económico directo». De ahí la regla de uso: NUNCA se usa
   automáticamente una lista a medias, y el semáforo puede DESCARTAR el parseo
   entero.
   ========================================================================== */
"use strict";

const { norm } = require("./semantica.js");

/* ══════════════════ 1 · Unidades de obra ══════════════════ */
/* La lista de §1.G.4, ampliada con las variantes de escritura que aparecen en
   los formularios reales. Es el conjunto CANÓNICO: `unidad_texto_original`
   conserva siempre lo que decía el pliego, porque una unidad traducida sin
   registro no se puede auditar (mismo criterio que `granularidad_utilizada`). */
const UNIDADES_CANONICAS = new Set([
  "m", "m2", "m3", "ml", "km", "kg", "ton", "un", "gl", "ha", "lb",
  "viaje", "dia", "mes", "hr", "pulg", "vivienda", "aula",
]);

/* Sinónimos → unidad canónica. Se comparan sobre `norm` y sin caracteres de
   separación, así que «M³», «M3», «m 3», «MTS3» y «METRO CUBICO» son lo mismo.
   OJO con el orden de lectura: la clave es el texto YA normalizado. */
const SINONIMOS_UNIDAD = {
  m: "m", mt: "m", mts: "m", metro: "m", metros: "m", u: "un",
  m2: "m2", mt2: "m2", mts2: "m2", m22: "m2", metrocuadrado: "m2", metroscuadrados: "m2", metro2: "m2",
  m3: "m3", mt3: "m3", mts3: "m3", m33: "m3", metrocubico: "m3", metroscubicos: "m3", metro3: "m3",
  ml: "ml", mtl: "ml", mlin: "ml", metrolineal: "ml", metroslineales: "ml",
  km: "km", kms: "km", kilometro: "km", kilometros: "km",
  kg: "kg", kgs: "kg", kilo: "kg", kilos: "kg", kilogramo: "kg", kilogramos: "kg",
  ton: "ton", tons: "ton", tonelada: "ton", toneladas: "ton", tn: "ton",
  un: "un", und: "un", unds: "un", uni: "un", unid: "un", unidad: "un", unidades: "un", c: "un", cu: "un",
  gl: "gl", glb: "gl", global: "gl", gbl: "gl", glob: "gl",
  ha: "ha", has: "ha", hectarea: "ha", hectareas: "ha",
  lb: "lb", lbs: "lb", libra: "lb", libras: "lb",
  viaje: "viaje", viajes: "viaje",
  dia: "dia", dias: "dia", d: "dia",
  mes: "mes", meses: "mes",
  hr: "hr", hra: "hr", hrs: "hr", hora: "hr", horas: "hr", h: "hr",
  pulg: "pulg", pulgada: "pulg", pulgadas: "pulg", plg: "pulg",
  vivienda: "vivienda", viviendas: "vivienda", vis: "vivienda", sol: "vivienda", soluciones: "vivienda",
  aula: "aula", aulas: "aula",
};

/* «M³» → «m3»: los superíndices no sobreviven a `norm` de forma predecible, así
   que se traducen ANTES. `norm` no los toca (no son letras acentuadas). */
const SUPERINDICES = { "²": "2", "³": "3", "⁰": "0", "¹": "1" };

function limpiarUnidad(bruto) {
  return norm(String(bruto || "").replace(/[²³⁰¹]/g, (c) => SUPERINDICES[c] || ""))
    .replace(/[^a-z0-9]/g, "");
}

/* Devuelve la unidad canónica si la celda ES una unidad, `null` si no lo es.
   Exige coincidencia EXACTA de la celda entera, no que la contenga: si valiera
   «contiene», la descripción «SUMINISTRO DE TUBERIA» casaría con «un» dentro de
   «SUMINISTRO» y cualquier línea de prosa pasaría por fila de ítem. */
function unidadCanonica(celda) {
  const limpio = limpiarUnidad(celda);
  if (!limpio || limpio.length > 20) return null;
  return SINONIMOS_UNIDAD[limpio] || (UNIDADES_CANONICAS.has(limpio) ? limpio : null);
}

/* ══════════════════ 2 · Números en formato colombiano ══════════════════ */
/* Punto de miles, coma decimal (`1.234.567,89`), con `$` y espacios sueltos
   (§1.G.4). La regla, literal:

     · si hay COMA → la coma es el decimal y los puntos son miles;
     · si solo hay PUNTOS y el último grupo tiene EXACTAMENTE 3 dígitos → miles;
     · si el último grupo tiene 1-2 dígitos → ese punto es el decimal.

   Invertirlo multiplica por 1000, que es el error silencioso más caro de todo
   este módulo. La ambigüedad que queda («1.234» ¿mil doscientos treinta y
   cuatro, o 1,234?) se resuelve por la regla de los 3 dígitos y, cuando hay
   precios, la valida la aritmética de la fila. */
const SOLO_NUMERO_RE = /^[\s$€.,\-+0-9]+$/;

function numeroColombiano(bruto) {
  const txt = String(bruto == null ? "" : bruto).trim();
  if (!txt || !SOLO_NUMERO_RE.test(txt)) return null;

  let cuerpo = txt.replace(/[\s$€+]/g, "");
  let signo = 1;
  if (cuerpo.startsWith("-")) { signo = -1; cuerpo = cuerpo.slice(1); }
  if (cuerpo.includes("-")) return null;                 // «2024-350»: no es un número
  if (!/\d/.test(cuerpo)) return null;

  let entero, decimal = "";
  if (cuerpo.includes(",")) {
    // la coma es SIEMPRE el decimal; más de una coma es basura, no un número
    const trozos = cuerpo.split(",");
    if (trozos.length > 2) return null;
    entero = trozos[0].replace(/\./g, "");
    decimal = trozos[1] || "";
  } else if (cuerpo.includes(".")) {
    const grupos = cuerpo.split(".");
    const ultimo = grupos[grupos.length - 1];
    if (ultimo.length === 3 && grupos.length >= 2) {
      entero = grupos.join("");                          // todos los puntos son miles
    } else if (ultimo.length >= 1 && ultimo.length <= 2) {
      entero = grupos.slice(0, -1).join("");              // el último punto es el decimal
      decimal = ultimo;
    } else {
      entero = grupos.join("");                          // 4+ dígitos tras el punto: no es un separador de miles
    }
  } else {
    entero = cuerpo;
  }
  if (!/^\d*$/.test(entero) || !/^\d*$/.test(decimal)) return null;
  if (!entero && !decimal) return null;
  const n = parseFloat(`${entero || "0"}.${decimal || "0"}`);
  return Number.isFinite(n) ? signo * n : null;
}

/* ══════════════════ 3 · Cabeceras de tabla ══════════════════ */
/* Los seis grupos de §1.G.4. `ORDEN` importa: `unidad` se prueba antes que
   `item` porque «U.M.» y «UND» son cabecera de unidad, no de numeral. */
const CABECERAS = {
  unidad: ["unidad", "und", "un", "um", "u m", "unid", "unidades", "unidad de medida", "medida"],
  cantidad: ["cantidad", "cant", "ctd", "cantidades", "cantidad total", "cant."],
  unitario: ["valor unitario", "vr unitario", "precio unitario", "v unit", "vr unit", "valor unit",
    "unitario", "vlr unitario", "v/unit", "precio unit", "vr. unitario", "valor u"],
  total: ["valor total", "vr total", "valor parcial", "subtotal", "vr. total", "vlr total",
    "total", "valor", "importe", "parcial"],
  item: ["item", "items", "no", "n", "num", "numero", "numeral", "codigo", "cod", "ord", "no."],
  descripcion: ["descripcion", "actividad", "actividades", "concepto", "obra", "detalle",
    "descripcion del item", "item de pago", "descripcion de la actividad", "nombre"],
};
const ORDEN_CABECERAS = ["unidad", "cantidad", "unitario", "total", "item", "descripcion"];

/* Un mismo texto puede ser cabecera de dos grupos («TOTAL» es `total`, pero
   «CANTIDAD TOTAL» es `cantidad`): gana la coincidencia más ESPECÍFICA, es
   decir la más larga, y a igual longitud el orden de `ORDEN_CABECERAS`. */
function grupoDeCabecera(celda) {
  const base = norm(celda).replace(/[^a-z0-9. /]/g, " ").replace(/\s+/g, " ").trim();
  if (!base || base.length > 40) return null;
  /* Tres formas de la misma cabecera, porque los formularios abrevian con
     puntos de forma inconsistente: «U.M.», «U M» y «UM» son la misma columna, y
     «No.» conserva el punto en la lista de patrones. Se prueban las tres y gana
     la coincidencia más específica. */
  const formas = new Set([
    base,
    base.replace(/\./g, ""),
    base.replace(/\./g, " ").replace(/\s+/g, " ").trim(),
  ]);
  let mejor = null;
  for (const grupo of ORDEN_CABECERAS) {
    for (const patron of CABECERAS[grupo]) {
      if (!formas.has(patron) && !formas.has(`${patron}.`)) continue;
      if (!mejor || patron.length > mejor.largo) mejor = { grupo, largo: patron.length };
    }
  }
  return mejor && mejor.grupo;
}

const MIN_CABECERAS = 3;   // «Con ≥3 en una misma fila → fila de cabecera» (§1.G.4)

/* ══════════════════ 4 · Celdas de una línea ══════════════════ */
/* El navegador manda las columnas separadas por TABULADOR. Un texto pegado a
   mano suele traer varios espacios; uno solo NO se puede usar como separador
   porque partiría «SUB BASE GRANULAR» en tres celdas. */
function dividirCeldas(linea) {
  const bruto = String(linea == null ? "" : linea);
  const por = bruto.includes("\t") ? bruto.split("\t") : bruto.split(/ {2,}| {2,}/);
  return por.map((c) => c.replace(/\s+/g, " ").trim()).filter((c) => c !== "");
}

const NUMERACION_RE = /^\d{1,3}(?:\.\d{1,3})*\.?$/;              // 1 · 1.2 · 3.4.5
const esNumeracionJerarquica = (t) => NUMERACION_RE.test(String(t || "").trim());
const profundidadNumeracion = (t) => String(t || "").trim().replace(/\.$/, "").split(".").length;

/* Ruido que nunca es una fila de ítem: pies de página, totales del documento y
   las líneas de AIU (que se leen aparte, en `leerAiu`). */
const RUIDO_RE = /^(?:pagina|pag\.?|folio|hoja|firma|elaboro|reviso|aprobo|nota|observacion)/;
const TOTALES_RE = /^(?:total|gran total|subtotal|costo directo|costos directos|valor total|presupuesto oficial|suma|total general)\b/;
const AIU_LINEA_RE = /\b(?:a\.?i\.?u\.?|administracion|imprevistos|utilidad)\b/;

/* Líneas que OTRO lector de este módulo consume (`leerAiu`, `leerAnticipo`).
   Existen por una razón concreta: la regla de «continuación de descripción»
   pegaba «ANTICIPO: 30%» al final del último ítem de la tabla, inventando una
   descripción que no está en el pliego. Una línea de metadato no es prosa
   partida — es un dato con su propio lector — y contarla como «no reconocida»
   también sería falso, así que tiene su propia cubeta en el diagnóstico. */
const METADATOS_RE = /\b(?:a\.?i\.?u\.?|administracion|imprevistos|utilidad|anticipo|pago anticipado|iva|retencion|estampilla|plazo|contribucion)\b/;

/* ══════════════════ 5 · Parseo ══════════════════ */
/* Cada fila candidata se resuelve por POSICIÓN si hay cabecera vigente y, si
   eso no da una fila válida, POR FIRMA DE UNIDAD. Nunca al contrario: la
   posición es más precisa y es la única que sitúa `unitario` y `total` sin
   ambigüedad. */

function filaPorPosicion(celdas, mapa) {
  const de = (grupo) => {
    const i = mapa[grupo];
    return i == null || i >= celdas.length ? "" : celdas[i];
  };
  const unidad = unidadCanonica(de("unidad"));
  if (!unidad) return null;                       // sin unidad no hay ítem de obra
  const cantidad = numeroColombiano(de("cantidad"));
  const descripcion = de("descripcion");
  if (!descripcion) return null;
  return {
    numeral: de("item") || null,
    descripcion_original: descripcion,
    unidad,
    unidad_texto_original: de("unidad"),
    cantidad,
    unitario_oficial: numeroColombiano(de("unitario")),
    total_oficial: numeroColombiano(de("total")),
    via: "posicional",
  };
}

/* Sin cabecera: se busca la celda que ES una unidad. A su IZQUIERDA está la
   descripción (con el numeral delante si lo hay); a su DERECHA, los números —
   cantidad primero, luego unitario y total, que es el orden de todo formulario
   de cantidades. Con un solo número a la derecha, ese número es la CANTIDAD:
   suponerlo un precio dejaría el ítem sin la única cifra que de verdad importa. */
function filaPorFirma(celdas) {
  let iUnidad = -1, unidad = null;
  for (let i = celdas.length - 1; i >= 1; i--) {          // de derecha a izquierda: la unidad va tras la descripción
    const u = unidadCanonica(celdas[i]);
    if (u) { iUnidad = i; unidad = u; break; }
  }
  if (iUnidad < 1) return null;

  const izquierda = celdas.slice(0, iUnidad);
  let numeral = null;
  if (izquierda.length > 1 && esNumeracionJerarquica(izquierda[0])) numeral = izquierda.shift();

  /* CELDAS COMBINADAS: cuando la fila trae la unidad corrida a otra columna, las
     cifras se quedan a la IZQUIERDA de ella. Una celda propia que es solo un
     número no forma parte de la descripción —ninguna descripción de obra termina
     en una celda numérica suelta—, así que se rescatan de ahí. Sin esto, «ANDEN
     EN CONCRETO | | 640,00 | M2» producía la descripción «ANDEN EN CONCRETO
     640,00» y perdía la cantidad: un ítem inventado y una cifra menos. */
  const numerosIzquierda = [];
  while (izquierda.length > 1 && numeroColombiano(izquierda[izquierda.length - 1]) != null) {
    numerosIzquierda.unshift(numeroColombiano(izquierda.pop()));
  }

  const descripcion = izquierda.join(" ").replace(/\s+/g, " ").trim();
  if (!descripcion) return null;

  const numeros = [];
  for (const celda of celdas.slice(iUnidad + 1)) {
    const n = numeroColombiano(celda);
    if (n != null) numeros.push(n);
  }
  /* Manda lo que está a la DERECHA de la unidad: es el orden normal de todo
     formulario de cantidades. Lo de la izquierda solo entra si no había nada. */
  if (!numeros.length && numerosIzquierda.length) numeros.push(...numerosIzquierda);
  return {
    numeral,
    descripcion_original: descripcion,
    unidad,
    unidad_texto_original: celdas[iUnidad],
    cantidad: numeros.length ? numeros[0] : null,
    unitario_oficial: numeros.length >= 2 ? numeros[1] : null,
    total_oficial: numeros.length >= 3 ? numeros[2] : null,
    via: "firma_unidad",
  };
}

/* Cuando la línea llegó aplanada de verdad (un solo espacio entre celdas), las
   celdas no existen: hay que reconocer la unidad como PALABRA suelta dentro de
   la línea. Es el último recurso y se marca como tal, porque partir por
   palabras confunde una unidad con el final de la descripción. */
const PALABRA_UNIDAD_RE = /(^|\s)((?:m|m2|m3|ml|km|kg|ton|un|und|gl|glb|ha|lb|m²|m³|viaje|dia|mes|hr|pulg)\.?)(?=\s)/gi;

/* Se elige la ÚLTIMA palabra-unidad SEGUIDA DE UN NÚMERO, no la primera.
   Motivo medido: «TANQUE DE ALMACENAMIENTO DE 50 M3 EN CONCRETO UND 2,00 …»
   cortaba en el «M3» de la descripción y devolvía «TANQUE DE ALMACENAMIENTO DE
   50» con unidad m3 — un ítem que no existe y la cantidad perdida. En un
   formulario la unidad va SEGUIDA de la cantidad, así que exigir un número
   detrás distingue la columna de unidad de una unidad mencionada de pasada. */
function candidatosUnidad(linea) {
  const salida = [];
  PALABRA_UNIDAD_RE.lastIndex = 0;
  let m = null;
  while ((m = PALABRA_UNIDAD_RE.exec(linea)) !== null) {
    const inicio = m.index + m[1].length;
    const resto = linea.slice(inicio + m[2].length);
    salida.push({ inicio, texto: m[2], seguidoDeNumero: /^\s*-?\$?\s?\d/.test(resto) });
  }
  return salida;
}

function filaAplanada(linea) {
  const candidatos = candidatosUnidad(linea);
  if (!candidatos.length) return null;
  const conNumero = candidatos.filter((c) => c.seguidoDeNumero);
  const utiles = conNumero.length ? conNumero : candidatos;
  const elegido = utiles[utiles.length - 1];
  const unidad = unidadCanonica(elegido.texto);
  if (!unidad) return null;

  const izquierda = linea.slice(0, elegido.inicio).replace(/\s+/g, " ").trim();
  const derecha = linea.slice(elegido.inicio + elegido.texto.length);
  if (!izquierda) return null;

  const trozos = izquierda.split(/\s+/);
  let numeral = null;
  if (trozos.length > 1 && esNumeracionJerarquica(trozos[0])) numeral = trozos.shift();
  const descripcion = trozos.join(" ").trim();
  if (!descripcion || !/[a-zñáéíóú]/i.test(descripcion)) return null;

  const numeros = (derecha.match(/-?\$?\s?\d[\d.,]*/g) || [])
    .map((t) => numeroColombiano(t)).filter((n) => n != null);
  return {
    numeral,
    descripcion_original: descripcion,
    unidad,
    unidad_texto_original: elegido.texto,
    cantidad: numeros.length ? numeros[0] : null,
    unitario_oficial: numeros.length >= 2 ? numeros[1] : null,
    total_oficial: numeros.length >= 3 ? numeros[2] : null,
    via: "aplanada",
  };
}

/* ---- AIU declarado ----
   «El AIU se LEE, no se adivina» (§1.G.4). Si el pliego lo declara, el nivel
   Documento se verifica con ese valor fijo y PUEDE dar verde; si no, el barrido
   diagnóstico nunca produce verde. Se acepta tanto «A: 12%  I: 3%  U: 5%» como
   «AIU 25%». */
function leerAiu(lineas) {
  const salida = { A: null, I: null, U: null, total: null, literal: null };
  const pct = (s) => {
    const n = numeroColombiano(String(s).replace("%", ""));
    return n == null || n < 0 || n > 100 ? null : n / 100;
  };
  for (const linea of lineas) {
    const t = norm(linea);
    if (!AIU_LINEA_RE.test(t)) continue;
    const a = /\ba(?:dministracion)?\s*[:=]?\s*(\d{1,2}(?:[.,]\d+)?)\s*%/.exec(t);
    const i = /\bi(?:mprevistos)?\s*[:=]?\s*(\d{1,2}(?:[.,]\d+)?)\s*%/.exec(t);
    const u = /\bu(?:tilidad)?\s*[:=]?\s*(\d{1,2}(?:[.,]\d+)?)\s*%/.exec(t);
    if (a && salida.A == null) salida.A = pct(a[1]);
    if (i && salida.I == null) salida.I = pct(i[1]);
    if (u && salida.U == null) salida.U = pct(u[1]);
    const junto = /\ba\.?i\.?u\.?\s*(?:de\s*|del\s*)?[:=]?\s*(\d{1,2}(?:[.,]\d+)?)\s*%/.exec(t);
    if (junto && salida.total == null && !(a && i && u)) salida.total = pct(junto[1]);
    if (!salida.literal) salida.literal = String(linea).replace(/\s+/g, " ").trim().slice(0, 200);
  }
  if (salida.A != null && salida.I != null && salida.U != null) {
    salida.total = salida.A + salida.I + salida.U;
  }
  return salida.total == null && salida.A == null ? null : salida;
}

/* ---- Anticipo y pago anticipado ----
   «anticipo_pct + pago_anticipado_pct ≤ 50 %» es validación OBLIGATORIA de
   extracción: si el parseo produce más, el parseo está mal, no el pliego
   (§1.G.5.bis, tope del parágrafo del art. 40 de la Ley 80 de 1993). Y son dos
   campos DISTINTOS: el anticipo se amortiza y no ingresa al patrimonio; el pago
   anticipado sí. */
const TOPE_ANTICIPO_SUMA = 0.50;

function leerAnticipo(lineas) {
  let anticipo = null, pagoAnticipado = null;
  for (const linea of lineas) {
    const t = norm(linea);
    if (!/anticipo|pago anticipado/.test(t)) continue;
    const conPct = /(\d{1,2}(?:[.,]\d+)?)\s*%/.exec(t);
    if (!conPct) continue;
    const n = numeroColombiano(conPct[1]);
    if (n == null || n < 0 || n > 100) continue;
    if (/pago\s+anticipado/.test(t)) {
      if (pagoAnticipado == null) pagoAnticipado = n / 100;
    } else if (anticipo == null) {
      anticipo = n / 100;
    }
  }
  if (anticipo == null && pagoAnticipado == null) return null;
  const suma = (anticipo || 0) + (pagoAnticipado || 0);
  return {
    anticipo_pct: anticipo,
    pago_anticipado_pct: pagoAnticipado,
    suma,
    excede_tope_legal: suma > TOPE_ANTICIPO_SUMA + 1e-9,
  };
}

/* ══════════════════ 6 · Validación aritmética ══════════════════ */
/* Tres niveles con tolerancias derivadas de la FUENTE del error (§1.G.4). Un
   porcentaje del total en el nivel Fila sería incorrecto en las dos
   direcciones: en una fila de $500 M un 0,5 % admite $2,5 M y esconde un dígito
   mal leído, y en una fila barata con cantidad enorme se queda corto. */
const TOL_CAPITULO_ABS = 10;        // $10
const TOL_CAPITULO_REL = 0.001;     // 0,1 % del subtotal
const TOL_DOCUMENTO_REL = 0.005;    // 0,5 %
const IVA_UTILIDAD = 0.19;          // sobre la UTILIDAD se causa IVA en construcción

/* tolerancia de fila = max(cantidad/2 + 1, $1). El error por redondear el
   unitario al peso es `cantidad × 0,5`; el `+1` cubre el redondeo del total. */
const toleranciaFila = (cantidad) => Math.max(Math.abs(cantidad) / 2 + 1, 1);

function validarFila(item) {
  if (item.cantidad == null || item.unitario_oficial == null || item.total_oficial == null) {
    return { estado: "sin_datos", desviacion: null, tolerancia: null };
  }
  const esperado = item.cantidad * item.unitario_oficial;
  const desviacion = Math.abs(esperado - item.total_oficial);
  const tolerancia = toleranciaFila(item.cantidad);
  return { estado: desviacion <= tolerancia ? "cuadra" : "no_cuadra", desviacion, tolerancia };
}

/* Costo directo esperado a partir del presupuesto oficial. Se prueban las DOS
   variantes y se registra CUÁL cuadró: es información sobre cómo presupuesta esa
   entidad. Ignorar `t·U` no es un detalle — con U = 10 % el IVA añade ≈1,9 pp,
   casi cuatro veces la tolerancia del 0,5 %. */
function costoDirectoEsperado(precioBase, aiu) {
  if (!precioBase || precioBase <= 0 || !aiu || aiu.total == null) return null;
  const u = aiu.U == null ? 0 : aiu.U;
  return {
    con_iva: precioBase / (1 + aiu.total + IVA_UTILIDAD * u),
    sin_iva: precioBase / (1 + aiu.total),
  };
}

/* ══════════════════ 7 · Semáforo de confianza ══════════════════ */
/* Matriz de DOS EJES, sin huecos (§1.G.4): filas que cuadran × total que cuadra
   con el AIU DECLARADO. Un total que solo cuadra por barrido diagnóstico NUNCA
   produce verde: con un parámetro libre continuo de 25 puntos, casi cualquier
   suma de costos directos encuentra un AIU que «cuadra», incluidas las tablas
   incompletas que este nivel debía cazar. */
const CORTE_FILAS_VERDE = 0.98;
const CORTE_FILAS_ROJO = 0.90;
const BARRIDO_AIU = { min: 0.10, max: 0.35, paso: 0.005 };

function semaforo({ filasConPrecio, filasCuadran, totalCuadraDeclarado }) {
  if (!filasConPrecio) {
    /* Caso frecuente y BENIGNO: la entidad publica cantidades sin precios
       unitarios. El nivel Fila no existe y el Documento tampoco, así que la
       única validación posible es estructural. No es rojo —«sigue siendo la
       mayor parte del valor»— pero tampoco puede ser verde: verde significa
       «se usa automáticamente», y sin aritmética no hay nada que respalde un
       ≥98 % de filas correctas. */
    return { color: "amarillo", motivo: "sin_precios_unitarios" };
  }
  const ratio = filasCuadran / filasConPrecio;
  if (ratio < CORTE_FILAS_ROJO) return { color: "rojo", motivo: "filas_no_cuadran" };
  if (ratio >= CORTE_FILAS_VERDE && totalCuadraDeclarado) {
    return { color: "verde", motivo: "filas_y_total_cuadran" };
  }
  return {
    color: "amarillo",
    motivo: ratio >= CORTE_FILAS_VERDE ? "total_no_cuadra" : "filas_parciales",
  };
}

/* ══════════════════ 8 · Entrada pública ══════════════════ */
/**
 * @param {string} texto  texto del formulario de cantidades (columnas por TAB)
 * @param {object} opciones
 *   - precio_base   presupuesto oficial del proceso, si se conoce (ancla externa)
 *   - max_lineas    corte de seguridad
 */
function parsearPliego(texto, opciones = {}) {
  const crudo = String(texto == null ? "" : texto);
  const maxLineas = opciones.max_lineas || 20000;
  const lineas = crudo.split(/\r\n|\r|\n/).slice(0, maxLineas);

  const items = [];
  const capitulos = [];
  const descartadas = { ruido: 0, totales: 0, metadatos: 0, sin_unidad: 0, vacias: 0, cabeceras: 0 };
  const ejemplosNoReconocidos = [];

  let mapa = null;                 // columnas vigentes (última cabecera vista)
  let capituloActual = null;

  for (const lineaCruda of lineas) {
    const linea = String(lineaCruda).replace(/ /g, " ").replace(/\s+$/, "");
    if (!linea.trim()) { descartadas.vacias++; continue; }
    const celdas = dividirCeldas(linea);
    const tNorm = norm(linea).trim();

    /* ---- ¿fila de cabecera? define las columnas de aquí en adelante ---- */
    const grupos = celdas.map(grupoDeCabecera);
    const distintos = new Set(grupos.filter(Boolean));
    if (distintos.size >= MIN_CABECERAS) {
      const nuevo = {};
      grupos.forEach((g, i) => { if (g && nuevo[g] == null) nuevo[g] = i; });
      mapa = nuevo;
      descartadas.cabeceras++;
      continue;
    }

    if (RUIDO_RE.test(tNorm)) { descartadas.ruido++; continue; }

    /* ---- fila de ítem ---- */
    let fila = mapa ? filaPorPosicion(celdas, mapa) : null;
    if (!fila) fila = filaPorFirma(celdas);
    if (!fila && celdas.length <= 2) fila = filaAplanada(linea);

    if (fila) {
      /* Un total del documento puede traer unidad («GL») y colarse como ítem.
         Se descarta por su texto, no por su posición: los totales aparecen
         también a mitad de tabla, al cerrar cada capítulo. */
      if (TOTALES_RE.test(norm(fila.descripcion_original).trim())) { descartadas.totales++; continue; }
      fila.capitulo = capituloActual;
      fila.linea_original = linea.replace(/\s+/g, " ").trim().slice(0, 400);
      fila.validacion_fila = validarFila(fila);
      items.push(fila);
      continue;
    }

    /* ---- ¿título de capítulo? «Un ítem de un solo nivel SIN unidad ni
       cantidad es un título de capítulo; la profundidad reconstruye el
       árbol» (§1.G.4). ---- */
    const primera = celdas[0] || "";
    if (esNumeracionJerarquica(primera) && celdas.length >= 2) {
      const titulo = celdas.slice(1).join(" ").replace(/\s+/g, " ").trim();
      const soloNumeros = celdas.slice(1).every((c) => numeroColombiano(c) != null);
      if (titulo && !soloNumeros) {
        capituloActual = { numeral: primera.replace(/\.$/, ""), titulo, profundidad: profundidadNumeracion(primera) };
        capitulos.push({ ...capituloActual, subtotal_declarado: null });
        continue;
      }
    }

    /* ---- subtotal de capítulo declarado ---- */
    if (TOTALES_RE.test(tNorm)) {
      const numeros = celdas.map(numeroColombiano).filter((n) => n != null);
      if (numeros.length && capitulos.length) {
        const ultimo = capitulos[capitulos.length - 1];
        if (ultimo.subtotal_declarado == null) ultimo.subtotal_declarado = numeros[numeros.length - 1];
      }
      descartadas.totales++;
      continue;
    }

    /* ---- línea de metadato: la lee otro lector, no es una fila ni prosa ---- */
    if (METADATOS_RE.test(tNorm)) { descartadas.metadatos++; continue; }

    /* ---- continuación de una descripción partida en dos líneas ---- */
    const esProsaCorta = items.length && celdas.length === 1
      && /[a-zñáéíóú]/i.test(linea) && linea.trim().length <= 120
      && numeroColombiano(linea) == null && !/%/.test(linea);
    if (esProsaCorta) {
      const ultimo = items[items.length - 1];
      if (ultimo.descripcion_original.length < 300) {
        ultimo.descripcion_original = `${ultimo.descripcion_original} ${linea.trim()}`.replace(/\s+/g, " ");
        continue;
      }
    }

    descartadas.sin_unidad++;
    if (ejemplosNoReconocidos.length < 12) ejemplosNoReconocidos.push(linea.trim().slice(0, 160));
  }

  /* ---- validación por capítulo ---- */
  const porCapitulo = new Map();
  for (const it of items) {
    if (!it.capitulo || it.total_oficial == null) continue;
    const clave = it.capitulo.numeral;
    porCapitulo.set(clave, (porCapitulo.get(clave) || 0) + it.total_oficial);
  }
  const validacionCapitulos = capitulos.map((c) => {
    const suma = porCapitulo.get(c.numeral);
    if (c.subtotal_declarado == null || suma == null) {
      return { numeral: c.numeral, titulo: c.titulo, estado: "sin_datos", suma_hijas: suma == null ? null : suma, subtotal_declarado: c.subtotal_declarado };
    }
    const tolerancia = Math.max(TOL_CAPITULO_ABS, TOL_CAPITULO_REL * Math.abs(c.subtotal_declarado));
    const desviacion = Math.abs(suma - c.subtotal_declarado);
    return {
      numeral: c.numeral, titulo: c.titulo,
      estado: desviacion <= tolerancia ? "cuadra" : "no_cuadra",
      suma_hijas: suma, subtotal_declarado: c.subtotal_declarado, desviacion, tolerancia,
    };
  });

  /* ---- validación del documento ---- */
  const aiu = leerAiu(lineas);
  const anticipo = leerAnticipo(lineas);
  const sumaTotales = items.reduce((a, it) => a + (it.total_oficial == null ? 0 : it.total_oficial), 0);
  const conTotal = items.filter((it) => it.total_oficial != null).length;
  const precioBase = typeof opciones.precio_base === "number" && opciones.precio_base > 0 ? opciones.precio_base : null;

  let documento = { estado: "sin_datos", motivo: null, costo_directo_sumado: conTotal ? sumaTotales : null };
  if (precioBase && conTotal) {
    documento.precio_base = precioBase;
    const esperado = costoDirectoEsperado(precioBase, aiu);
    if (esperado) {
      const variantes = [["con_iva", esperado.con_iva], ["sin_iva", esperado.sin_iva]]
        .map(([nombre, valor]) => ({
          variante: nombre, esperado: valor,
          desviacion_rel: Math.abs(sumaTotales - valor) / valor,
        }))
        .sort((a, b) => a.desviacion_rel - b.desviacion_rel);
      const mejor = variantes[0];
      documento = {
        ...documento,
        estado: mejor.desviacion_rel <= TOL_DOCUMENTO_REL ? "cuadra" : "no_cuadra",
        via: "aiu_declarado",
        aiu_declarado: aiu,
        variante_que_cuadro: mejor.desviacion_rel <= TOL_DOCUMENTO_REL ? mejor.variante : null,
        desviacion_rel: mejor.desviacion_rel,
        tolerancia_rel: TOL_DOCUMENTO_REL,
        variantes,
      };
    } else {
      /* Barrido DIAGNÓSTICO. Nunca produce verde: con 25 puntos de parámetro
         libre casi cualquier suma encuentra un AIU que «cuadra». Solo dice
         «existe un AIU compatible», y eso únicamente es evidencia si coincide
         con el declarado en el pliego, que aquí no hay. */
      let compatible = null;
      for (let f = BARRIDO_AIU.min; f <= BARRIDO_AIU.max + 1e-9; f += BARRIDO_AIU.paso) {
        const esp = precioBase / (1 + f);
        if (Math.abs(sumaTotales - esp) / esp <= TOL_DOCUMENTO_REL) { compatible = Math.round(f * 1000) / 1000; break; }
      }
      documento = {
        ...documento,
        estado: "diagnostico",
        via: "barrido",
        motivo: "El pliego no declara AIU: el resultado es DIAGNÓSTICO y nunca produce verde. "
          + "Un parámetro libre de 25 puntos hace que casi cualquier suma encuentre un AIU que «cuadra».",
        aiu_compatible: compatible,
        rango_barrido: BARRIDO_AIU,
      };
    }
  }

  /* ---- semáforo ---- */
  const filasConPrecio = items.filter((it) => it.validacion_fila.estado !== "sin_datos").length;
  const filasCuadran = items.filter((it) => it.validacion_fila.estado === "cuadra").length;
  const luz = semaforo({
    filasConPrecio, filasCuadran,
    totalCuadraDeclarado: documento.estado === "cuadra" && documento.via === "aiu_declarado",
  });

  const conCantidad = items.filter((it) => it.cantidad != null).length;
  const vias = items.reduce((a, it) => { a[it.via] = (a[it.via] || 0) + 1; return a; }, {});

  return {
    items,
    capitulos,
    aiu_declarado: aiu,
    anticipo,
    confianza: luz,
    validacion: {
      filas: {
        total: items.length,
        con_precio: filasConPrecio,
        cuadran: filasCuadran,
        no_cuadran: filasConPrecio - filasCuadran,
        ratio: filasConPrecio ? filasCuadran / filasConPrecio : null,
        corte_verde: CORTE_FILAS_VERDE, corte_rojo: CORTE_FILAS_ROJO,
      },
      capitulos: validacionCapitulos,
      documento,
    },
    diagnostico: {
      lineas_leidas: lineas.length,
      truncado: crudo.split(/\r\n|\r|\n/).length > maxLineas,
      cabecera_detectada: mapa ? Object.keys(mapa) : null,
      items_con_cantidad: conCantidad,
      items_sin_cantidad: items.length - conCantidad,
      vias_de_reconocimiento: vias,
      descartadas,
      // se muestran para poder VIGILAR el parser: una regla que descarta sin
      // dejar ver qué descartó no se puede corregir (misma razón por la que
      // /api/diagnostico publica ejemplos de `esObjetoGenerico`)
      ejemplos_no_reconocidos: ejemplosNoReconocidos,
    },
  };
}

module.exports = {
  UNIDADES_CANONICAS, SINONIMOS_UNIDAD, CABECERAS, MIN_CABECERAS,
  TOPE_ANTICIPO_SUMA, TOL_DOCUMENTO_REL, IVA_UTILIDAD, BARRIDO_AIU,
  CORTE_FILAS_VERDE, CORTE_FILAS_ROJO,
  unidadCanonica, numeroColombiano, grupoDeCabecera, dividirCeldas,
  esNumeracionJerarquica, toleranciaFila, validarFila, costoDirectoEsperado,
  semaforo, leerAiu, leerAnticipo, parsearPliego,
};
