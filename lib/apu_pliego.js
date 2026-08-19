/* ============================================================================
   lib/apu_pliego · Extraer ítem + unidad + cantidad de la tabla de un pliego
   ----------------------------------------------------------------------------
   QUÉ RESUELVE. El formulario de cantidades (Formulario 1 / presupuesto oficial)
   «vale más que todo lo demás junto»: con ítem + unidad + cantidad se puede
   valorar el proceso completo con precios propios, y sin él hay que inferir las
   cantidades del objeto, que es adivinar (docs/APU_INFORME_COMPLETO.md §1.G.1).
   Este módulo recibe el TEXTO de ese documento y devuelve la tabla estructurada.

   POR QUÉ TEXTO Y NO EL PDF. `pdfjs-dist` en el runtime de Node «pesa decenas de
   MB; hay que sacarlo del request path» y el OCR «no cabe en el mismo proceso»
   (§1.G.3). La extracción del PDF corre en el NAVEGADOR (public/pliego.js, pdf.js
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
   TABULADOR (public/pliego.js agrupa por coordenada Y para formar la fila y por
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
    } else if (grupos.length === 2) {
      /* UN solo punto y 4+ dígitos detrás: es un DECIMAL de muchas cifras, que
         es lo que produce un Excel exportado con 4 decimales («375.0000») o un
         número con precisión («3.14159»). Antes se hacía `grupos.join("")` con el
         comentario «no es un separador de miles» y acto seguido se trataba como
         si lo fuera: «375.0000» devolvía 3 750 000, mil veces la cantidad real. */
      entero = grupos[0];
      decimal = ultimo;
    } else {
      /* VARIOS puntos y el último grupo con 4+ dígitos: no encaja en ninguna
         convención. `null` —«no sé»— y no un número inventado. */
      return null;
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
   porque partiría «SUB BASE GRANULAR» en tres celdas.

   LAS CELDAS VACÍAS SE CONSERVAN CUANDO EL SEPARADOR ES TABULADOR, y filtrarlas
   era un defecto de los caros: descolocaba TODO el mapa de columnas. Con la
   cabecera `ITEM|DESCRIPCION|UNIDAD|CANTIDAD|VR UNITARIO|VR TOTAL` y la fila
   `2.1|SUBBASE|M3||95.000|35.625.000` —la celda de cantidad en blanco, que es un
   caso frecuentísimo— cada columna a la derecha del hueco se corría una posición
   y `cantidad` acababa leyendo el PRECIO UNITARIO: una cantidad de obra
   equivocada y creíble, que es justo lo que este módulo no puede producir.

   Con espacios como separador no hay huecos que conservar (dos espacios seguidos
   son un separador, no una celda), así que ahí sí se filtran. */
function dividirCeldas(linea) {
  const bruto = String(linea == null ? "" : linea);
  if (bruto.includes("\t")) {
    return bruto.split("\t").map((c) => c.replace(/\s+/g, " ").trim());
  }
  return bruto.split(/[  ]{2,}/).map((c) => c.replace(/\s+/g, " ").trim()).filter((c) => c !== "");
}

/* Vista COMPACTA: sin huecos. La usa todo lo que razona por ADYACENCIA (la firma
   de unidad, los títulos de capítulo), frente a la vista POSICIONAL, que usa el
   mapa de columnas de la cabecera. Son dos preguntas distintas sobre la misma
   línea, y por eso hay dos vistas y no una con un parámetro. */
const compactar = (celdas) => celdas.filter((c) => c !== "");

const NUMERACION_RE = /^\d{1,3}(?:\.\d{1,3})*\.?$/;              // 1 · 1.2 · 3.4.5
const esNumeracionJerarquica = (t) => NUMERACION_RE.test(String(t || "").trim());
const profundidadNumeracion = (t) => String(t || "").trim().replace(/\.$/, "").split(".").length;

/* Ruido que nunca es una fila de ítem: pies de página, totales del documento y
   las líneas de AIU (que se leen aparte, en `leerAiu`).

   CON FRONTERA DE PALABRA, y hace falta: sin ella «hoja» hacía prefijo con
   «HOJALATA CALIBRE 26 PARA CANAL» y se llevaba por delante una fila de obra
   legítima. `TOTALES_RE` ya la llevaba; esta se había quedado sin. */
/* La PÁGINA de cada fila sale de los marcadores `\f<n>` que el navegador
   intercala entre página y página (lib/paginas): es un dato de la fila,
   `null` cuando el texto no los trae. */
const { numeroDeMarcador, siguientePagina } = require("./paginas.js");

const RUIDO_RE = /^(?:pagina|pag|folio|hoja|firma|elaboro|reviso|aprobo|nota|observacion)\b/;
const TOTALES_RE = /^(?:total|gran total|subtotal|costo directo|costos directos|valor total|presupuesto oficial|suma|total general)\b/;
const AIU_LINEA_RE = /\b(?:a\.?i\.?u\.?|administracion|imprevistos|utilidad)\b/;

/* Filas que ESTÁN dentro de la tabla, con unidad y cifras, pero que NO son costo
   directo: el AIU y el IVA desglosados como si fueran partidas. Se colaban como
   ítems y su valor entraba en la suma del documento —la cifra contra la que se
   valida el presupuesto entero—, así que inflaban el costo directo y rompían el
   nivel Documento precisamente en los pliegos mejor hechos, que son los que
   desglosan el AIU.

   Ancladas AL PRINCIPIO de la descripción a propósito: «ADMINISTRACION 15%» es
   AIU, pero «ADMINISTRACION DELEGADA DE OBRA» puede ser una partida real de
   consultoría, y un `includes` se la llevaría por delante. */
const NO_ES_COSTO_DIRECTO_RE = /^(?:a\.?i\.?u\.?|administracion|imprevistos|utilidad|iva|impuesto|retencion|estampilla|contribucion)\b/;

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

function filaPorPosicion(celdas, mapa, { conTab = true } = {}) {
  const de = (grupo) => {
    const i = mapa[grupo];
    return i == null || i >= celdas.length ? "" : celdas[i];
  };
  const unidad = unidadCanonica(de("unidad"));
  if (!unidad) return null;                       // sin unidad no hay ítem de obra
  const descripcion = de("descripcion");
  if (!descripcion) return null;
  /* LA MISMA CELDA VACÍA, PERO CON ESPACIOS COMO SEPARADOR (ago 2026). La
     cerradura de arriba solo alcanza al TAB, donde el hueco se conserva. Con
     espacios —lo que produce el OCR y lo que llega en un texto pegado a mano—
     el hueco desaparece, las celdas se corren y `cantidad` acababa leyendo el
     PRECIO UNITARIO: «SUBBASE GRANULAR · m3 · 95.000». Y sin total no había
     aritmética que lo desmintiera, así que la fila salía del denominador del
     ratio, no contaba como cantidad ilegible y el semáforo llegaba a VERDE, que
     es el estado que se usa AUTOMÁTICAMENTE.
     «Faltan celdas» NO BASTA como señal, y la primera versión de esta guarda se
     pasó de ancha: el caso «frecuente y benigno» que este módulo documenta —la
     entidad deja los precios EN BLANCO para que los ponga el oferente— produce
     exactamente el mismo síntoma (cabecera de 6 columnas, filas de 4), así que
     anulaba la cantidad de TODAS las filas y el lector se quedaba sin su
     entregable justo en el documento que más le importa. Contar celdas no
     distingue «huecos al final» de «hueco en medio».
     Lo que sí distingue es la FORMA: una entidad que publica el precio unitario
     publica también su total. Un unitario CON su total en blanco es la huella de
     la celda que se comió el separador —las cifras se corrieron una posición—, y
     solo entonces las cifras posicionales son ILEGIBLES (null, jamás el número
     de al lado). La fila se conserva siempre y el guardián de cantidades
     ilegibles hace su trabajo. Con TAB el hueco se conserva y nada de esto hace
     falta. */
  const anchoDeclarado = Math.max(...Object.values(mapa).filter((i) => Number.isInteger(i))) + 1;
  const hay = (grupo) => mapa[grupo] != null && String(de(grupo)).trim() !== "";
  const desalineada = !conTab && celdas.length < anchoDeclarado
    && mapa.total != null && hay("unitario") && !hay("total");
  return {
    numeral: de("item") || null,
    descripcion_original: descripcion,
    unidad,
    unidad_texto_original: de("unidad"),
    cantidad: desalineada ? null : numeroColombiano(de("cantidad")),
    unitario_oficial: desalineada ? null : numeroColombiano(de("unitario")),
    total_oficial: desalineada ? null : numeroColombiano(de("total")),
    via: "posicional",
    ...(desalineada ? { columnas_desalineadas: true } : {}),
  };
}

/* Sin cabecera: se busca la celda que ES una unidad. A su izquierda está la
   descripción (con el numeral delante si lo hay) y a su derecha los números.

   LA CANTIDAD ES EL NÚMERO ADYACENTE A LA UNIDAD, y el lado importa. En un
   formulario de cantidades la columna de cantidad va SIEMPRE pegada a la de
   unidad, a un lado o al otro:

     SUBBASE | M3 | 375,00 | 95.000 | 35.625.000     cantidad a la DERECHA
     SUBBASE | 375,00 | M3 | 95.000 | 35.625.000     cantidad a la IZQUIERDA
     ANDEN   |        | 640,00 | M2                  celdas combinadas

   Dar prioridad a la derecha «porque es el orden normal» leía el PRECIO UNITARIO
   como cantidad en el segundo caso —375 m³ se convertían en 95.000— y ese orden
   de columnas es tan corriente que el propio banco de pruebas lo tiene como caso.
   Así que: si hay número pegado por la izquierda, ese es la cantidad y los de la
   derecha son unitario y total; si no, el primero de la derecha es la cantidad.

   Con un solo número y ningún otro, ese número es la CANTIDAD: suponerlo un
   precio dejaría el ítem sin la única cifra que de verdad importa. */
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

  /* Cifras pegadas a la unidad por la IZQUIERDA. Una celda propia que es solo un
     número no forma parte de la descripción: ninguna descripción de obra termina
     en una celda numérica suelta. */
  const numerosIzquierda = [];
  while (izquierda.length > 1 && numeroColombiano(izquierda[izquierda.length - 1]) != null) {
    numerosIzquierda.unshift(numeroColombiano(izquierda.pop()));
  }

  const descripcion = izquierda.join(" ").replace(/\s+/g, " ").trim();
  if (!descripcion) return null;

  const derecha = [];
  for (const celda of celdas.slice(iUnidad + 1)) {
    const n = numeroColombiano(celda);
    if (n != null) derecha.push(n);
  }

  /* La cantidad es la cifra ADYACENTE a la unidad (ver cabecera). Si viene por la
     izquierda, es la última de ese grupo —la que toca la unidad— y las de la
     derecha son unitario y total. Si no hay nada a la izquierda, el orden es el
     de siempre: cantidad, unitario, total. */
  let cantidad = null, unitario = null, total = null;
  if (numerosIzquierda.length) {
    cantidad = numerosIzquierda[numerosIzquierda.length - 1];
    unitario = derecha.length >= 1 ? derecha[0] : null;
    total = derecha.length >= 2 ? derecha[1] : null;
  } else {
    cantidad = derecha.length >= 1 ? derecha[0] : null;
    unitario = derecha.length >= 2 ? derecha[1] : null;
    total = derecha.length >= 3 ? derecha[2] : null;
  }

  return {
    numeral,
    descripcion_original: descripcion,
    unidad,
    unidad_texto_original: celdas[iUnidad],
    cantidad, unitario_oficial: unitario, total_oficial: total,
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

/* Palabras con las que NINGUNA descripción de obra termina. Si la «descripción»
   acaba en una de estas, lo que se ha partido no es una fila: es una frase.
   Defecto medido: «SE PAGARA POR ML 1.000 METROS DE TUBERIA INSTALADA» producía
   el ítem «SE PAGARA POR», ml, 1.000 — un ítem que no existe, con cantidad y
   unidad inventadas, en la vía que más se usa con texto de OCR. */
const CORTE_PROSA_RE = /\b(?:de|del|la|el|los|las|en|por|con|para|a|al|y|o|u|que|se|un|una|unos|unas|sobre|entre|desde|hasta|segun|sera|es|son)$/;

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

  /* DOS EXIGENCIAS MÁS, y las dos son de PRECISIÓN, no de recall. Esta vía parte
     una línea por palabras, así que sin ellas convierte prosa de pliego en ítems.
     Aquí el falso positivo cuesta más que el falso negativo (§1.G.4), y una vía
     de último recurso es justo donde esa regla tiene que apretar más:

       (1) la descripción no puede terminar en una palabra de enlace;
       (2) o la línea empieza por un numeral jerárquico, o trae AL MENOS DOS
           cifras tras la unidad (cantidad y precio). Una frase suelta con una
           sola cifra —«…TIENE UNA LONGITUD DE 1.000 M»— ya no pasa. */
  if (CORTE_PROSA_RE.test(norm(descripcion))) return null;
  if (!numeral && numeros.length < 2) return null;

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
   diagnóstico nunca produce verde.

   DOS PRECISIONES QUE VENÍAN MAL, y las dos fabricaban un AIU falso:

   · LA INICIAL SUELTA EXIGE UN SEPARADOR. El patrón hacía OPCIONAL el cuerpo de
     la palabra (`\ba(?:dministracion)?`), así que una «a» de preposición seguida
     de un porcentaje bastaba: «IMPREVISTOS EQUIVALENTES A 3 %» fijaba A = 3 %
     cuando 3 % son los imprevistos. Ahora «A» sola necesita `:`/`=` o paréntesis
     —que es como se rotula una columna— y la palabra completa vale por sí sola.

   · EL PORCENTAJE ADMITE TRES CIFRAS. Con `\d{1,2}` un «100 %» no fallaba: el
     motor retrocedía y capturaba «00» → 0 %. Un 0 que aquí significa «no hay
     AIU» y que además pasaba cualquier validación.

   Se acepta el AIU repartido en varias líneas y también las tres componentes en
   UNA sola («A: 12%  I: 3%  U: 5%»). */
const PCT_RE = "(\\d{1,3}(?:[.,]\\d+)?)\\s*%";
const AIU_COMPONENTE_RE = (inicial, palabra) => new RegExp(
  // palabra completa (separador opcional) | inicial suelta (separador OBLIGATORIO)
  `(?:\\b${palabra}\\b\\s*\\)?\\s*[:=]?\\s*${PCT_RE})`
  + `|(?:\\(\\s*${inicial}\\s*\\)\\s*[:=]?\\s*${PCT_RE})`
  + `|(?:\\b${inicial}\\s*[:=]\\s*${PCT_RE})`,
);
const AIU_A = AIU_COMPONENTE_RE("a", "administracion");
const AIU_I = AIU_COMPONENTE_RE("i", "imprevistos");
const AIU_U = AIU_COMPONENTE_RE("u", "utilidad");
const AIU_JUNTO_RE = new RegExp(`\\ba\\.?i\\.?u\\.?\\b\\s*(?:de\\s*|del\\s*)?[:=]?\\s*${PCT_RE}`);

function leerAiu(lineas) {
  const salida = { A: null, I: null, U: null, total: null, literal: null };
  const pct = (s) => {
    const n = numeroColombiano(String(s).replace("%", ""));
    return n == null || n <= 0 || n > 100 ? null : n / 100;
  };
  // el grupo capturado puede ser cualquiera de las tres alternativas
  const primerGrupo = (m) => (m ? m.slice(1).find((g) => g != null) : null);

  for (const linea of lineas) {
    const t = norm(linea);
    /* El filtro admite también la forma abreviada «A: 12%  I: 3%  U: 5%», que no
       trae ninguna palabra completa y por tanto no pasaba el filtro aunque los
       patrones de componente sí la reconocen. Ese caso está anunciado en la
       cabecera de este bloque, así que dejarlo fuera era una promesa incumplida. */
    if (!AIU_LINEA_RE.test(t) && !/\b[aiu]\s*[:=]\s*\d/.test(t)) continue;
    if (salida.A == null) salida.A = pct(primerGrupo(AIU_A.exec(t)));
    if (salida.I == null) salida.I = pct(primerGrupo(AIU_I.exec(t)));
    if (salida.U == null) salida.U = pct(primerGrupo(AIU_U.exec(t)));
    const junto = AIU_JUNTO_RE.exec(t);
    if (junto && salida.total == null) salida.total = pct(junto[1]);
    if (!salida.literal) salida.literal = String(linea).replace(/\s+/g, " ").trim().slice(0, 200);
  }
  /* Las tres componentes MANDAN sobre el total suelto: son más específicas. */
  if (salida.A != null && salida.I != null && salida.U != null) {
    salida.total = salida.A + salida.I + salida.U;
  }
  return salida.total == null ? null : salida;
}

/* ---- Anticipo y pago anticipado ----
   «anticipo_pct + pago_anticipado_pct ≤ 50 %» es validación OBLIGATORIA de
   extracción: si el parseo produce más, el parseo está mal, no el pliego
   (§1.G.5.bis, tope del parágrafo del art. 40 de la Ley 80 de 1993). Y son dos
   campos DISTINTOS: el anticipo se amortiza y no ingresa al patrimonio; el pago
   anticipado sí. */
const TOPE_ANTICIPO_SUMA = 0.50;

/* EL PORCENTAJE SE BUSCA JUNTO A SU PALABRA, no al principio de la línea. Tomar
   el primer `%` de cualquier línea que mencionara «anticipo» producía tres
   errores distintos, los tres medidos:

     «EL AIU SERA DEL 25% Y EL ANTICIPO DEL 30%»  → anticipo 25 % (era el AIU)
     «ANTICIPO: 30%  PAGO ANTICIPADO: 10%»        → todo se clasificaba como pago
                                                     anticipado y valía 30 %
     «ANTICIPO: 100%»                             → 0 %, por el `\d{1,2}`

   Ahora se recorren las apariciones de cada concepto y se toma el porcentaje que
   viene DETRÁS, dentro de una ventana corta. «pago anticipado» se busca primero y
   su tramo se tacha, porque contiene la palabra «anticipado» y si no se apartara
   se contaría dos veces. */
const VENTANA_PCT = 60;   // caracteres tras la palabra donde se acepta el «%»

/* La ventana NO cruza un punto ni un punto y coma: son frases distintas. Sin ese
   corte, «NO SE PACTARA ANTICIPO. LA RETENCION EN GARANTIA SERA DEL 5%» declaraba
   un anticipo del 5 % en un pliego que dice literalmente que no hay anticipo. */
function porcentajeTras(texto, re) {
  const buscar = new RegExp(re.source, "g");
  let m = null;
  while ((m = buscar.exec(texto)) !== null) {
    const tras = m.index + m[0].length;
    const ventana = texto.slice(tras, tras + VENTANA_PCT);
    const p = new RegExp(`^[^%\\d.;:]{0,25}?:?[^%\\d.;]{0,6}?${PCT_RE}`).exec(ventana);
    if (!p) continue;
    const n = numeroColombiano(p[1]);
    if (n == null || n < 0 || n > 100) continue;
    return { valor: n / 100, desde: m.index, hasta: tras + (p.index + p[0].length) };
  }
  return null;
}

function leerAnticipo(lineas) {
  let anticipo = null, pagoAnticipado = null;
  for (const linea of lineas) {
    let t = norm(linea);
    /* El filtro va por la RAÍZ, no por «anticipo»: «anticipado» NO contiene la
       cadena «anticipo» (anticipa-do), así que un filtro por la palabra completa
       se saltaba entera la línea «PAGO ANTICIPADO: 20%». */
    if (!/anticip/.test(t)) continue;

    // «pago anticipado» PRIMERO: contiene «anticipado» y hay que apartarlo
    const pago = porcentajeTras(t, /\bpago\s+anticipado\b/);
    if (pago) {
      if (pagoAnticipado == null) pagoAnticipado = pago.valor;
      t = t.slice(0, pago.desde) + " ".repeat(pago.hasta - pago.desde) + t.slice(pago.hasta);
    }
    const ant = porcentajeTras(t, /\banticipo\b/);
    if (ant && anticipo == null) anticipo = ant.valor;
  }
  if (anticipo == null && pagoAnticipado == null) return null;

  /* NO se suma con `|| 0`: una mitad ausente es «no sé», y meterla como cero
     convertiría una suma desconocida en una suma afirmada — el defecto que este
     proyecto ya cerró dos veces. Lo que se publica es la suma de lo CONOCIDO,
     dicho con esas palabras, y el veredicto del tope legal solo se afirma cuando
     se puede: si lo conocido ya excede, excede pase lo que pase con el resto; si
     no excede pero falta una mitad, la respuesta honesta es `null`. */
  const conocidos = [anticipo, pagoAnticipado].filter((v) => v != null);
  const sumaConocida = conocidos.reduce((a, v) => a + v, 0);
  const completo = anticipo != null && pagoAnticipado != null;
  const excede = sumaConocida > TOPE_ANTICIPO_SUMA + 1e-9;

  return {
    anticipo_pct: anticipo,
    pago_anticipado_pct: pagoAnticipado,
    suma_conocida: sumaConocida,
    completo,
    excede_tope_legal: excede ? true : (completo ? false : null),
    tope_legal: TOPE_ANTICIPO_SUMA,
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

/* MÍNIMO DE MUESTRA para el verde. El ratio se calculaba sobre las filas que
   traen las tres cifras, así que «1 de 1 cuadra» daba 100 % y verde — con 40
   ítems más sin validar, incluidos los que habían perdido el precio por un
   corrimiento de columnas. Un verde apoyado en una fila no es una validación:
   verde significa «se usa automáticamente». Cinco es el mismo mínimo con el que
   el resto del proyecto se permite clasificar (`MIN_PROCESOS` del índice de
   competencia), y por la misma razón. */
const MIN_FILAS_VERDE = 5;
const MIN_COBERTURA_VERDE = 0.5;   // la mitad de los ítems tiene que estar validada

function semaforo({ filasConPrecio, filasCuadran, totalCuadraDeclarado, filasTotales, filasSinCantidad }) {
  const items = filasTotales == null ? filasConPrecio : filasTotales;
  const sinCantidad = filasSinCantidad == null ? 0 : filasSinCantidad;
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

  /* UNA CANTIDAD ILEGIBLE NO PUEDE PASAR DESAPERCIBIDA. Las filas sin cantidad no
     entran en el denominador del ratio (no hay aritmética que hacer), así que por
     sí solas no bajaban la confianza: se podía llegar a verde con la mayoría de
     las cantidades sin leer, que es exactamente lo que el usuario va a usar. */
  if (sinCantidad > 0) return { color: "amarillo", motivo: "cantidades_ilegibles" };

  if (ratio >= CORTE_FILAS_VERDE && totalCuadraDeclarado) {
    if (filasConPrecio < MIN_FILAS_VERDE) {
      return { color: "amarillo", motivo: "muestra_insuficiente" };
    }
    if (items > 0 && filasConPrecio / items < MIN_COBERTURA_VERDE) {
      return { color: "amarillo", motivo: "cobertura_insuficiente" };
    }
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
  /* `continuaciones` y `no_costo_directo` tienen cubeta propia porque el reparto
     del diagnóstico TIENE que sumar: sin ellas esas líneas hacían `continue` sin
     contarse en ninguna parte y los conteos dejaban de cuadrar con
     `lineas_leidas`. Misma invariante que los repartos de /api/resumen y el
     embudo de /api/diagnostico. */
  const descartadas = {
    ruido: 0, totales: 0, metadatos: 0, no_costo_directo: 0,
    continuaciones: 0, sin_unidad: 0, vacias: 0, cabeceras: 0,
    /* marcadores de página: no son texto del pliego, pero SON líneas leídas y
       el reparto tiene que seguir sumando `lineas_leidas` */
    marcadores_pagina: 0,
  };
  const ejemplosNoReconocidos = [];

  let mapa = null;                 // columnas vigentes (última cabecera vista)
  let capituloActual = null;       // ÍNDICE en `capitulos`, no el numeral
  let paginaActual = null;         // null hasta el primer marcador (o siempre, sin marcadores)
  let continuable = false;         // ¿la última línea útil admite continuación? (un \f la corta)

  for (const lineaCruda of lineas) {
    /* ANTES de recortar espacios: `\s` incluye al propio \f y el marcador se
       perdería como «línea vacía». */
    const marca = numeroDeMarcador(lineaCruda);
    if (marca !== undefined) {
      paginaActual = siguientePagina(paginaActual, marca);
      descartadas.marcadores_pagina++;
      /* UN SALTO DE PÁGINA CORTA LA CADENA DE CONTINUACIÓN (ago 2026). La regla
         de «descripción partida en dos líneas» cruzaba el salto y pegaba el
         ENCABEZADO o el pie de la página siguiente al último ítem de la
         anterior: «SUB BASE GRANULAR» pasaba a «SUB BASE GRANULAR FORMULARIO 1
         PRESUPUESTO OFICIAL CONSTRUCCION…», y con esa descripción el mapeo caía
         en otro ítem del catálogo — o sea, en otro precio. Es la familia del
         marcador del Excel que envenenaba la reimportación. Una descripción
         partida por un salto de página es rarísima; un encabezado repetido en
         cada página, constante. */
      continuable = false;
      continue;
    }
    const linea = String(lineaCruda).replace(/ /g, " ").replace(/\s+$/, "");
    if (!linea.trim()) { descartadas.vacias++; continue; }
    const celdas = dividirCeldas(linea);          // POSICIONAL: conserva huecos
    const compactas = compactar(celdas);          // por ADYACENCIA: sin huecos
    const tNorm = norm(linea).trim();

    /* ---- ¿fila de cabecera? define las columnas de aquí en adelante ---- */
    const grupos = celdas.map(grupoDeCabecera);
    const distintos = new Set(grupos.filter(Boolean));
    if (distintos.size >= MIN_CABECERAS) {
      /* UNA CABECERA PUEDE REPETIR UN GRUPO, y quedarse con la primera aparición
         anclaba `total` a la columna del precio unitario. Pasa siempre que la
         cabecera viene partida en dos líneas —el caso normal cuando pdf.js
         devuelve «VALOR | VALOR» arriba y «UNITARIO | TOTAL» debajo—: las dos
         celdas dicen «VALOR» y las dos mapean a `total`.

         Se resuelve por el ORDEN, que en un formulario de cantidades es
         invariable: … CANTIDAD, VR UNITARIO, VR TOTAL. Si `total` aparece dos
         veces y `unitario` no aparece, la PRIMERA es el unitario y la ÚLTIMA el
         total. */
      const indices = {};
      grupos.forEach((g, i) => { if (g) (indices[g] = indices[g] || []).push(i); });
      const nuevo = {};
      for (const [g, is] of Object.entries(indices)) nuevo[g] = is[0];
      if (indices.total && indices.total.length >= 2 && !indices.unitario) {
        nuevo.unitario = indices.total[0];
        nuevo.total = indices.total[indices.total.length - 1];
      }
      mapa = nuevo;
      descartadas.cabeceras++;
      continue;
    }

    if (RUIDO_RE.test(tNorm)) { descartadas.ruido++; continue; }

    /* ---- fila de ítem ---- */
    let fila = mapa ? filaPorPosicion(celdas, mapa, { conTab: linea.includes("\t") }) : null;
    if (!fila) fila = filaPorFirma(compactas);
    if (!fila && compactas.length <= 2) fila = filaAplanada(linea);

    if (fila) {
      /* Un total del documento puede traer unidad («GL») y colarse como ítem.
         Se descarta por su texto, no por su posición: los totales aparecen
         también a mitad de tabla, al cerrar cada capítulo. */
      const desc = norm(fila.descripcion_original).trim();
      if (TOTALES_RE.test(desc)) { descartadas.totales++; continue; }
      /* Y el AIU o el IVA desglosados como partidas: están DENTRO de la tabla,
         con unidad y cifras, pero no son costo directo. Sin este descarte su
         valor entraba en la suma del documento e inflaba el costo directo justo
         en los pliegos que mejor desglosan su AIU. */
      if (NO_ES_COSTO_DIRECTO_RE.test(desc)) { descartadas.no_costo_directo++; continue; }
      fila.capitulo = capituloActual == null ? null : capitulos[capituloActual];
      fila.capitulo_idx = capituloActual;
      fila.pagina = paginaActual;               // dónde está la fila en el PDF (null sin marcadores)
      fila.linea_original = linea.replace(/\s+/g, " ").trim().slice(0, 400);
      fila.validacion_fila = validarFila(fila);
      items.push(fila);
      continuable = true;   // dentro de la misma página, su descripción admite continuación
      continue;
    }

    /* ---- ¿título de capítulo? «Un ítem de un solo nivel SIN unidad ni
       cantidad es un título de capítulo; la profundidad reconstruye el
       árbol» (§1.G.4). ---- */
    const primera = compactas[0] || "";
    let numeralCap = null, tituloCap = null;
    if (esNumeracionJerarquica(primera) && compactas.length >= 2) {
      const resto = compactas.slice(1);
      if (!resto.every((c) => numeroColombiano(c) != null)) {
        numeralCap = primera;
        tituloCap = resto.join(" ").replace(/\s+/g, " ").trim();
      }
    } else if (compactas.length === 1) {
      /* Título en UNA sola celda («2 ESTRUCTURA DE PAVIMENTO»), que es la forma
         normal en texto aplanado — es decir, en todo lo que llega por OCR—.
         Exigir dos celdas dejaba esos documentos sin ningún capítulo Y pegaba el
         título a la descripción del ítem anterior. */
      const m = /^(\d{1,3}(?:\.\d{1,3})*)\.?\s+(.{2,120})$/.exec(compactas[0]);
      if (m && /[a-zñáéíóú]/i.test(m[2]) && numeroColombiano(m[2]) == null) {
        numeralCap = m[1];
        tituloCap = m[2].trim();
      }
    }
    if (numeralCap && tituloCap) {
      capitulos.push({
        numeral: numeralCap.replace(/\.$/, ""), titulo: tituloCap,
        profundidad: profundidadNumeracion(numeralCap), subtotal_declarado: null,
        pagina: paginaActual,
      });
      capituloActual = capitulos.length - 1;
      continue;
    }

    /* ---- subtotal de capítulo declarado ---- */
    if (TOTALES_RE.test(tNorm)) {
      /* Se asigna al capítulo que el TEXTO nombra («TOTAL CAPITULO 1»), no al
         último empujado. Con subcapítulos (1, 1.1, 1.2…) el último empujado al
         llegar el total del padre es 1.2, así que el subtotal del capítulo 1 se
         comparaba contra las hijas de 1.2 y las DOS entradas salían «no_cuadra». */
      const numeros = compactas.map(numeroColombiano).filter((n) => n != null);
      if (numeros.length && capitulos.length) {
        const nombrado = /\b(\d{1,3}(?:\.\d{1,3})*)\b/.exec(tNorm.replace(/[\d.,$\s]+$/, ""));
        let destino = -1;
        if (nombrado) {
          for (let i = capitulos.length - 1; i >= 0; i--) {
            if (capitulos[i].numeral === nombrado[1]) { destino = i; break; }
          }
        }
        if (destino < 0) destino = capituloActual == null ? capitulos.length - 1 : capituloActual;
        if (capitulos[destino] && capitulos[destino].subtotal_declarado == null) {
          capitulos[destino].subtotal_declarado = numeros[numeros.length - 1];
        }
      }
      descartadas.totales++;
      continue;
    }

    /* ---- línea de metadato: la lee otro lector, no es una fila ni prosa ---- */
    if (METADATOS_RE.test(tNorm)) { descartadas.metadatos++; continue; }

    /* ---- continuación de una descripción partida en dos líneas ---- */
    const esProsaCorta = items.length && continuable && compactas.length === 1
      && /[a-zñáéíóú]/i.test(linea) && linea.trim().length <= 120
      && numeroColombiano(linea) == null && !/%/.test(linea);
    if (esProsaCorta) {
      const ultimo = items[items.length - 1];
      if (ultimo.descripcion_original.length < 300) {
        ultimo.descripcion_original = `${ultimo.descripcion_original} ${linea.trim()}`.replace(/\s+/g, " ");
        descartadas.continuaciones++;
        continue;
      }
    }

    descartadas.sin_unidad++;
    if (ejemplosNoReconocidos.length < 12) ejemplosNoReconocidos.push(linea.trim().slice(0, 160));
  }

  /* ---- validación por capítulo ---- */
  /* Se acumula por ÍNDICE del capítulo, no por su numeral: dos grupos o dos
     anexos que reinician la numeración producen dos capítulos «1» distintos, y
     con el numeral como clave sus hijas se sumaban juntas y las dos entradas
     salían «no_cuadra» contra una suma que no era de ninguna de las dos. */
  const porCapitulo = new Map();
  for (const it of items) {
    if (it.capitulo_idx == null || it.total_oficial == null) continue;
    porCapitulo.set(it.capitulo_idx, (porCapitulo.get(it.capitulo_idx) || 0) + it.total_oficial);
  }
  const validacionCapitulos = capitulos.map((c, idx) => {
    const suma = porCapitulo.get(idx);
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
        /* Cuando el pliego declara el AIU JUNTO («AIU 25 %») no hay `U`, así que
           `t·U` vale 0 y las dos variantes dan el MISMO número: informar
           «con_iva» sería atribuir a la entidad una forma de presupuestar que el
           dato no distingue. */
        variante_que_cuadro: mejor.desviacion_rel > TOL_DOCUMENTO_REL ? null
          : (variantes.length > 1 && Math.abs(variantes[0].esperado - variantes[1].esperado) < 1e-6
            ? "indistinguible" : mejor.variante),
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
  const conCantidad = items.filter((it) => it.cantidad != null).length;
  const luz = semaforo({
    filasConPrecio, filasCuadran,
    filasTotales: items.length,
    filasSinCantidad: items.length - conCantidad,
    totalCuadraDeclarado: documento.estado === "cuadra" && documento.via === "aiu_declarado",
  });

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
  CORTE_FILAS_VERDE, CORTE_FILAS_ROJO, MIN_FILAS_VERDE, MIN_COBERTURA_VERDE,
  unidadCanonica, numeroColombiano, grupoDeCabecera, dividirCeldas,
  esNumeracionJerarquica, toleranciaFila, validarFila, costoDirectoEsperado,
  semaforo, leerAiu, leerAnticipo, parsearPliego,
};
