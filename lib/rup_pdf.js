/* ============================================================================
   lib/rup_pdf · Extraer un perfil de RUP del TEXTO de un certificado en PDF
   ----------------------------------------------------------------------------
   QUÉ RESUELVE. El onboarding de la landing: un contratista sube su certificado
   RUP y en segundos tiene un perfil con el que la app filtra oportunidades.
   Aquí llega el TEXTO del PDF (con las columnas separadas por TABULADOR) y sale
   un objeto en el MISMO esquema que valida lib/config_rup — el de la carga
   manual de /api/admin/rup —, así que aguas abajo no existe un «RUP de PDF»
   distinto de un «RUP de archivo»: es el mismo contrato validado por el mismo
   validador.

   POR QUÉ TEXTO Y NO EL PDF. La misma decisión medida de lib/apu_pliego: el
   PDF se lee en el NAVEGADOR (public/onboarding.js, pdf.js clavado en 3.11.174,
   columnas conservadas por coordenadas) y a la función serverless solo viaja
   texto — sin dependencias npm, sin rasterizador nativo, y un certificado de
   30 páginas son ~100 KB contra el tope de 4,5 MB del cuerpo.

   TRES REGLAS HEREDADAS QUE AQUÍ NO SE PUEDEN AFLOJAR:

   · LOS CÓDIGOS SE TOKENIZAN POR RUNS DE DÍGITOS, jamás con un \d{8} suelto
     (fabricaría códigos a partir de un NIT o un teléfono). A diferencia de
     lib/unspsc.extraerCodigos —que acepta runs de 2/4/6/8 porque lee el campo
     de categoría de SECOP—, aquí un run de 2 dígitos suelto sería ruido puro:
     solo cuentan runs de EXACTAMENTE 8, más las filas Segmento|Familia|Clase|
     Producto (pares de 2) DENTRO de la sección del clasificador. Fuera de esa
     sección, un run de 8 solo se acepta si termina en «00» (inscripción por
     clase, la premisa documentada de los RUP): eso descarta fechas compactas
     tipo «20240315» sin descartar códigos reales. Lo descartado SE CUENTA
     (`codigos_ilegibles`), nunca se tira en silencio.
   · LOS NÚMEROS SON COLOMBIANOS: la misma `numeroColombiano` de lib/apu_pliego,
     no una segunda implementación (dos reglas para el mismo número es el
     defecto que este proyecto ya pagó).
   · UN DATO QUE NO SE PUDO LEER ES «NO SÉ», NUNCA UN CERO INVENTADO. Lo único
     que se DERIVA es la utilidad operacional desde la rentabilidad del
     patrimonio (identidad aritmética del D. 1082: rentabilidad = utilidad /
     patrimonio), y viaja declarado en `advertencias`. Los dos supuestos que sí
     se ponen —profesionales = 1 (el suelo del factor CT) y tope estratégico =
     2 × la experiencia acreditada— van declarados con su porqué.
   ========================================================================== */
"use strict";

const { norm } = require("./semantica.js");
const { numeroColombiano } = require("./apu_pliego.js");
const { MAX_EXPERIENCIA_SMMLV } = require("./config_rup.js");

const MIN_TEXTO = 200;               // por debajo no hay certificado que leer
const MAX_LINEAS = 20000;            // corte de seguridad (mismo que apu_pliego)
const SEGMENTO_MIN = 10, SEGMENTO_MAX = 95;

/* ══════════════════ 1 · Números y fechas ══════════════════ */
const RE_TOKEN_NUMERO = /-?\$?\s?\d[\d.,]*\s*%?/g;

/* tokens numéricos de un tramo de línea → [{valor, pct, colgante}].
   `colgante` es el separador («.» o «,») con el que el token TERMINA cuando
   además es lo último de la línea: la huella de un número partido en el salto
   de línea que no se pudo unir (ver unirNumerosPartidos). null si no cuelga. */
function numerosDe(tramo) {
  const salida = [];
  const texto = String(tramo || "");
  const finUtil = texto.replace(/\s+$/, "").length;
  for (const m of texto.matchAll(RE_TOKEN_NUMERO)) {
    const bruto = m[0];
    const pct = bruto.includes("%");
    const recortado = bruto.replace(/%/g, "").trim();
    const sep = /[.,]$/.test(recortado) ? recortado.slice(-1) : null;
    // el punto final de frase no es un separador: «850.000.000.» → «850.000.000»
    const limpio = recortado.replace(/[.,]$/, "");
    const n = numeroColombiano(limpio);
    if (n == null) continue;
    const alFinal = m.index + bruto.replace(/\s+$/, "").length >= finUtil;
    salida.push({ valor: n, pct, colgante: sep && alFinal ? sep : null });
  }
  return salida;
}

/* ═══ UN NÚMERO PARTIDO EN DOS LÍNEAS NO ES UNA CIFRA (6-sep-2026, M-INF-01) ═══
   pdf.js entrega el certificado línea a línea, y una celda estrecha puede
   partir «1.234.567.890» en «1.234.» + «567.890». Leído tal cual, el
   patrimonio valía 1.234 pesos, la liquidez «2,» + «5» valía 2 y la
   experiencia «12.» + «500 SMMLV» valía 500: cifras equivocadas, creíbles y
   bien maquetadas, que deciden qué licitaciones pasan la puerta de capacidad
   (reproducido con esta función real el 6-sep-2026). Dos defensas, en orden:

   1. UNIR: si la línea i termina en un token numérico con separador colgando
      y la i+1 empieza por dígitos, se funden — pero SOLO si el resultado es un
      número colombiano bien formado (grupos de tres tras el punto, uno o dos
      decimales tras la coma o tras un punto sin grupos de miles). Así
      «850.000.000.» + «31/12/2025» NO se une (el 31 no es un grupo de miles y
      la fecha se quedaría dentro del número), y «2025.» + «31…» tampoco. La
      regla del punto final de frase de numerosDe no cambia.
   2. PEDIR lo que no se pudo unir: el token que sigue colgando tras la unión
      (`colgante` de numerosDe) es sospechoso. Con coma colgante SIEMPRE se
      pide (ninguna frase termina en coma); con punto colgante se pide si el
      valor queda por debajo del umbral de plausibilidad del campo
      (PLAUSIBLE_MIN) — un patrimonio de 1.234 pesos no existe — o si el campo
      es una razón sin umbral posible (una liquidez «2.» cortada era «2.50»).
      Un «850.000.000.» de frase completa pasa igual que antes.
   El modo de fallo es «faltan» con motivo, nunca un cero ni un ok:false: el
   usuario escribe la cifra una vez (la regla de la casa). Riesgo declarado:
   «artículo 5.» + «100 SMMLV» se uniría en 5.100 — una prosa que termina en
   un número corto seguida de una línea que empieza por un grupo de tres es
   rarísima en un RUP, y no hay forma sintáctica de distinguirla.

   EL SEPARADOR PUEDE CAER A CUALQUIER LADO DEL CORTE (remate B2b-H1, 6-sep-2026):
   colgando al final de la línea («1.234.» + «567.890») o encabezando la
   siguiente («1.234.567» + «.890», «2» + «,5», «12» + «.500 SMMLV»). El primer
   arreglo solo veía el primero, y los tres hermanos seguían dando 1.234.567 /
   2 / 500 sin aviso (medido con esta función). Ahora los dos lados se unen con
   la misma condición de número bien formado, y lo que no se pudo unir se pide
   igual que el colgante (leerIndicador y leerExperienciaYK miran la línea
   siguiente). Lo que NO se ve es el corte que se traga el separador («12» +
   «500 SMMLV»): una línea que termina en dígitos seguida de otra que empieza
   por un número es la forma normal de una tabla, y pdf.js no pierde glifos al
   partir —el separador cae a un lado o al otro—; queda declarado, como el
   «artículo 5.». */
const RE_COLA_PARTIDA = /(\d[\d.,]*?)([.,])\s*$/;    // «1.234.» → el separador cuelga al final
const RE_COLA_DIGITOS = /(\d[\d.,]*\d|\d)\s*$/;      // «1.234.567» → la línea termina en dígito
const RE_COLA_NUMERICA = /(\d[\d.,]*)\s*$/;           // el token numérico que cierra la línea, cuelgue o no
const RE_CABEZA_NUMERO = /^\s*(\d[\d.,]*)/;           // «567.890» → la siguiente empieza por dígito
const RE_CABEZA_SEPARADA = /^\s*([.,])(\d[\d.,]*)/;   // «.890» → la siguiente empieza por el separador
const RE_NUMERO_BIEN_FORMADO = /^\d{1,3}(?:\.\d{3})+(?:,\d{1,2})?$|^\d{1,3}(?:[.,]\d{1,2})$|^\d+,\d{1,2}$/;

/* → el número que formarían el final de `ln` y el principio de `sig` si es un
   número colombiano bien formado; null si no hay corte o la unión no lo es. */
function unionCandidata(ln, sig) {
  const cola = RE_COLA_PARTIDA.exec(ln);
  if (cola) {
    const cab = RE_CABEZA_NUMERO.exec(sig);
    if (!cab) return null;
    const u = `${cola[1]}${cola[2]}${cab[1].replace(/[.,]$/, "")}`;
    return RE_NUMERO_BIEN_FORMADO.test(u) ? u : null;
  }
  const colaD = RE_COLA_DIGITOS.exec(ln);
  const cabS = RE_CABEZA_SEPARADA.exec(sig);
  if (!colaD || !cabS) return null;
  const u = `${colaD[1]}${cabS[1]}${cabS[2].replace(/[.,]$/, "")}`;
  return RE_NUMERO_BIEN_FORMADO.test(u) ? u : null;
}

function unirNumerosPartidos(lineas) {
  const salida = [];
  for (let i = 0; i < lineas.length; i++) {
    let ln = String(lineas[i]);
    // un número partido en tres líneas se une en dos vueltas
    while (i + 1 < lineas.length && unionCandidata(ln, String(lineas[i + 1]))) {
      ln = ln.replace(/\s+$/, "") + String(lineas[i + 1]).replace(/^\s+/, "");
      i++;
    }
    salida.push(ln);
  }
  return salida;
}

/* Umbral de plausibilidad por campo. En pesos, un patrimonio o una utilidad
   positivos por debajo de un millón en un certificado RUP son, con casi toda
   seguridad, el trozo de un número partido (cuelgue o no: una unión falsa
   también deja un número corto); una cifra legítima menor se pide una vez —el
   fallo es pedir, no bloquear— y el usuario la escribe. Las razones (liquidez,
   endeudamiento, cobertura) no tienen umbral posible: colgante = se pide. */
const PLAUSIBLE_MIN = Object.freeze({ patrimonio: 1000000, utilidad_operacional: 1000000 });
/* Un trozo se cuenta en palabras de la pantalla (remate B2b-H4, 6-sep-2026): «la
   línea termina en «12.» y la siguiente empieza por «5000»», nunca «12. / 5000»
   —dos trozos con una barra que el contratista tenía que descifrar—. `p` es
   {leido, siguiente}: lo que cerraba la línea y, si lo hay, lo que abría la otra. */
const trozoLeido = (p) => (p.siguiente
  ? `la línea termina en «${p.leido}» y la siguiente empieza por «${p.siguiente}»`
  : `se leyó «${p.leido}», que no es una cifra completa`);
const MOTIVO_PARTIDO = (p) => "En el certificado la cifra aparece partida o incompleta "
  + `(${trozoLeido(p)}): escríbala usted tal como figura en el certificado.`;
/* Los nombres de los campos COMO LOS VE LA PERSONA: una sola copia, que usan el
   formulario de lo que falta (CAMPOS_PEDIBLES) y las advertencias — una clave
   interna («experiencia_smmlv») no es texto de pantalla (remate B2b-H4). */
const ETIQUETAS = Object.freeze({
  liquidez: "Índice de liquidez",
  endeudamiento: "Nivel de endeudamiento (%)",
  cobertura_intereses: "Razón de cobertura de intereses",
  patrimonio: "Patrimonio (pesos)",
  utilidad_operacional: "Utilidad operacional (pesos)",
  rentabilidad: "Rentabilidad del patrimonio",
  experiencia_smmlv: "Experiencia acreditada (SMMLV)",
});

const MESES_ES = {
  enero: 1, febrero: 2, marzo: 3, abril: 4, mayo: 5, junio: 6,
  julio: 7, agosto: 8, septiembre: 9, setiembre: 9, octubre: 10, noviembre: 11, diciembre: 12,
};
const RE_FECHA_NUM = /(\d{1,2})[/.\-](\d{1,2})[/.\-](\d{4})/;
const RE_FECHA_TXT = /(\d{1,2})\s+de\s+([a-z]+)\s+(?:de|del)\s+(\d{4})/;

function fechaDe(tramo) {
  const t = String(tramo || "");
  let d = null, m = null, a = null;
  const num = RE_FECHA_NUM.exec(t);
  if (num) { d = +num[1]; m = +num[2]; a = +num[3]; }
  else {
    const txt = RE_FECHA_TXT.exec(t);
    if (txt && MESES_ES[txt[2]]) { d = +txt[1]; m = MESES_ES[txt[2]]; a = +txt[3]; }
  }
  if (d == null || m < 1 || m > 12 || d < 1 || d > 31 || a < 1990 || a > 2100) return null;
  return `${a}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

/* ══════════════════ 2 · Lectura por etiqueta ══════════════════ */
/* Busca la PRIMERA línea que casa `re` (y no casa `excluir`) y devuelve el
   primer número que aparece DESPUÉS de la etiqueta. Se trabaja sobre la línea
   normalizada entera (norm no toca dígitos ni puntuación), así que no hay que
   mapear índices contra el original. Si la línea que casa no trae número
   (una cabecera de sección), se sigue buscando: parar ahí dejaría el dato en
   «no leído» por culpa del formato, no del certificado.

   LAS FECHAS SE TACHAN ANTES DE BUSCAR EL NÚMERO: «PATRIMONIO A 31/12/2025
   $ 850.000.000» tiene como primer token el «31» del corte contable, y sin
   este borrado el patrimonio valdría 31 pesos — una cifra equivocada y
   creíble, que es justo lo que este módulo no puede producir. */
const RE_FECHA_G = /\d{1,2}[/.\-]\d{1,2}[/.\-]\d{4}|\d{1,2}\s+de\s+[a-z]+\s+(?:de|del)\s+\d{4}/g;
const sinFechas = (tramo) => String(tramo || "").replace(RE_FECHA_G, " ");

/* → {valor, pct, linea} · null si no se leyó · {partido:true, token, linea} si
   el número que tocaba está colgando en el salto de línea y no se pudo unir
   (con `minPlausible` solo cuando además queda por debajo del umbral, salvo
   coma colgante, que siempre es un corte). El que llama trata `partido`
   como «no leído» y lo pide con su motivo. */
function leerIndicador(lineasNorm, re, { excluir = null, minPlausible = null } = {}) {
  for (let i = 0; i < lineasNorm.length; i++) {
    const ln = lineasNorm[i];
    if (excluir && excluir.test(ln)) continue;
    const m = re.exec(ln);
    if (!m) continue;
    const tramo = sinFechas(ln.slice(m.index + m[0].length));
    const numeros = numerosDe(tramo);
    if (!numeros.length) continue;
    const n = numeros[0];
    /* «bajo» = positivo y por debajo del umbral del campo: la firma de un trozo
       aunque ya no cuelgue (una unión falsa «5.» + «12» daría 5.12). El 0 y los
       negativos NO son trozos —una pérdida operacional es un dato real y no se
       podría teclear después— y pasan como siempre. */
    const bajo = minPlausible != null && n.valor > 0 && n.valor < minPlausible;
    /* el hermano del corte (remate B2b-H1): la cifra cierra la línea SIN separador
       y la siguiente empieza por separador + dígitos («1.234.567» / «.89») sin que
       la unión haya sido un número bien formado: se pide, como el colgante */
    const cabezaSig = RE_CABEZA_SEPARADA.exec(lineasNorm[i + 1] || "");
    const cortadaDespues = !!cabezaSig && numeros.length === 1 && !n.colgante && RE_COLA_DIGITOS.test(tramo);
    if (n.colgante === "," || (n.colgante === "." && (minPlausible == null || bajo)) || bajo || cortadaDespues) {
      const token = (n.colgante || cortadaDespues) ? (RE_COLA_NUMERICA.exec(ln) || [])[1] : null;
      return {
        partido: true, token: token || String(n.valor),
        siguiente: cortadaDespues ? cabezaSig[1] + cabezaSig[2] : null,
        linea: ln.trim().slice(0, 160),
      };
    }
    return { valor: n.valor, pct: n.pct, linea: ln.trim().slice(0, 160) };
  }
  return null;
}

function leerFecha(lineasNorm, re) {
  for (const ln of lineasNorm) {
    const m = re.exec(ln);
    if (!m) continue;
    const f = fechaDe(ln.slice(m.index));
    if (f) return f;
  }
  return null;
}

/* Ratio que puede venir como porcentaje («35,00%», «13») o como razón («0,35»).
   Con «%» explícito o con valor > 1 se interpreta como porcentaje y se divide
   entre 100 — y se DECLARA en advertencias, porque es una interpretación. */
function comoRatio(leido, campo, advertencias) {
  if (!leido) return null;
  if (leido.pct || leido.valor > 1) {
    if (leido.pct === false && leido.valor > 1) {
      advertencias.push(`${campo}: el certificado trae ${leido.valor} (sin símbolo %); se interpretó como porcentaje → ${leido.valor / 100}.`);
    }
    return leido.valor / 100;
  }
  return leido.valor;
}

/* ══════════════════ 3 · Códigos UNSPSC ══════════════════ */
/* La detección de sección se hace con `includes`, no con una regex con
   comodín entre las dos mitades: `(clasificaci)[^]*?(bienes)` sobre una línea
   hostil de megabytes (el endpoint es público y admite 5 MB) reintenta el
   comodín desde cada aparición de «clasificaci» — cuadrático, y colgaría la
   función. Dos `includes` son lineales y dicen lo mismo sin exigir orden. */
function esCabeceraClasificacion(ln) {
  if ((ln.includes("clasificaci") || ln.includes("clasificador"))
    && (ln.includes("bienes") || ln.includes("servicios") || ln.includes("unspsc"))) return true;
  return /bienes y servicios|segmento\s+familia\s+clase|codigos?\s+unspsc/.test(ln);
}
const RE_SECCION_OFF = /informacion financiera|indicadores financieros|indicadores de capacidad|experiencia|capacidad residual|representante legal|el presente certificado/;
/* Un certificado real trae cientos de códigos (los RUP del repositorio, ≤393).
   Miles es un documento que no es un RUP — o un cuerpo hostil que busca
   fabricar un perfil enorme en Redis (la escritura es pública): error, no
   truncado silencioso. */
const MAX_CODIGOS = 2000;
const RE_PARES_EN_CELDA = /\b(\d{2})[ .\-](\d{2})[ .\-](\d{2})[ .\-](\d{2})\b/g;
/* Fuera de la sección del clasificador, una línea de dinero o de contacto no
   puede aportar códigos: «UTILIDAD OPERACIONAL 12000000» tiene un run de 8 que
   termina en 00 y segmento «12» válido — sería un código fabricado a partir de
   un peso sin separadores, el mismo error que el \d{8} sobre números largos. */
const RE_LINEA_SIN_CODIGOS = /\$|smmlv|salario|patrimonio|utilidad|activo|pasivo|\bvalor\b|capital|ingreso|telefono|\btel\b|celular|cuantia|presupuesto/;

function segmentoValido(codigo) {
  const seg = parseInt(codigo.slice(0, 2), 10);
  return seg >= SEGMENTO_MIN && seg <= SEGMENTO_MAX;
}

function extraerCodigosUnspsc(lineas) {
  const codigos = new Set();
  const ilegibles = [];
  let enSeccion = false;

  for (const linea of lineas) {
    const ln = norm(linea);
    if (esCabeceraClasificacion(ln)) enSeccion = true;
    else if (enSeccion && RE_SECCION_OFF.test(ln)) enSeccion = false;

    /* runs de EXACTAMENTE 8 dígitos. Fuera de la sección del clasificador se
       exige además terminar en «00» (nivel de clase): así una fecha compacta
       «20240315» no se convierte en código, y un código real de RUP —que por
       la premisa documentada termina en 00— no se pierde. */
    const lineaVetada = !enSeccion && RE_LINEA_SIN_CODIGOS.test(ln);
    for (const run of ln.match(/\d+/g) || []) {
      if (run.length !== 8) continue;
      if (lineaVetada || !segmentoValido(run) || (!enSeccion && !run.endsWith("00"))) {
        ilegibles.push(run);
        continue;
      }
      codigos.add(run);
    }

    if (!enSeccion) continue;

    /* filas Segmento | Familia | Clase | Producto: cuatro celdas de 2 dígitos
       consecutivas, o los cuatro pares dentro de una misma celda. Solo dentro
       de la sección: fuera, cuatro pares seguidos son un teléfono. */
    const celdas = linea.split("\t").map((c) => c.trim()).filter((c) => c !== "");
    for (let i = 0; i + 3 < celdas.length; i++) {
      if (!celdas.slice(i, i + 4).every((c) => /^\d{2}$/.test(c))) continue;
      const codigo = celdas.slice(i, i + 4).join("");
      if (segmentoValido(codigo)) codigos.add(codigo);
      else ilegibles.push(codigo);
      i += 3;
    }
    for (const celda of celdas) {
      RE_PARES_EN_CELDA.lastIndex = 0;
      let m = null;
      while ((m = RE_PARES_EN_CELDA.exec(norm(celda))) !== null) {
        const codigo = `${m[1]}${m[2]}${m[3]}${m[4]}`;
        if (segmentoValido(codigo)) codigos.add(codigo);
        else ilegibles.push(codigo);
      }
    }
  }
  return { codigos: [...codigos].sort(), ilegibles };
}

/* ══════════════════ 4 · Identidad del proponente ══════════════════ */
/* El valor de una etiqueta de texto se lee del ORIGINAL (conserva mayúsculas y
   tildes), partiendo por TAB o «:»: mapear índices entre norm y el original
   sería frágil con caracteres compuestos. */
function valorDeEtiqueta(lineas, re) {
  for (const linea of lineas) {
    const partes = String(linea).split(/\t|:/);
    for (let i = 0; i < partes.length; i++) {
      if (!re.test(norm(partes[i]))) continue;
      const valor = partes.slice(i + 1).join(" ").replace(/\s+/g, " ").trim();
      if (valor) return valor;
    }
  }
  return null;
}

function leerNit(lineas) {
  for (const linea of lineas) {
    const ln = norm(linea);
    const m = /\bnit\b/.exec(ln);
    if (!m) continue;
    const tras = ln.slice(m.index + m[0].length);
    /* el guion antes del dígito de verificación es OBLIGATORIO: sin él, un NIT
       impreso sin DV («NIT 900123456») se partiría inventándole el último
       dígito como verificación — y un NIT inventado es peor que un null */
    const nit = /(\d[\d.\s]{4,17})\s*-\s*(\d)\b/.exec(tras);
    if (!nit) continue;
    const cuerpo = nit[1].replace(/[.\s]/g, "");
    if (cuerpo.length >= 5 && cuerpo.length <= 15) return `${cuerpo}-${nit[2]}`;
  }
  return null; // jamás inventarlo (regla del proyecto)
}

function leerTipo(lineas, nombre, advertencias) {
  const todo = norm(lineas.join("\n"));
  // el sufijo societario se exige AL FINAL de la razón social: «obras s a
  // cargo…» en mitad de una frase no convierte a nadie en sociedad anónima
  if (/persona\s+juridica/.test(todo) || /\b(s\.?a\.?s|sas|ltda|s\.?\s?a|e\.?s\.?p)\.?\s*$/.test(norm(nombre || ""))) {
    return "persona_juridica";
  }
  if (/persona\s+natural/.test(todo)) return "persona_natural";
  advertencias.push("No se pudo determinar si el proponente es persona natural o jurídica: se asume persona natural. Solo afecta al rótulo, no al cálculo.");
  return "persona_natural";
}

/* ══════════════════ 5 · Experiencia y K declarada ══════════════════ */
const RE_K_DECLARADA = /capacidad\s+(maxima\s+)?de\s+contratacion/;
/* LA CIFRA EN SMMLV ES LA ADYACENTE A LA UNIDAD («1.250,50 SMMLV» o
   «SMMLV: 1.250,50»), la misma regla que la cantidad junto a la unidad en
   lib/apu_pliego. Tomar el máximo de TODOS los números de la línea convertía
   un año («CONTRATO EJECUTADO EN 2023 … 900 SMMLV») o un número de contrato
   en la experiencia acreditada: 2023 «SMMLV» inventados. Lo que la
   adyacencia no cubre —tablas con la unidad solo en la cabecera— cae al
   error accionable de «faltantes», no a un dato equivocado. */
/* La unidad admite las grafías reales de los certificados: «SMMLV»,
   «S.M.M.L.V.» (con puntos — `norm` no los quita) y la transposición
   «SMLMV», frecuente en certificados de Cámara. Las variantes con puntos
   opcionales cubren también la forma limpia. */
const UNIDAD_SMMLV = "(?:s\\.?m\\.?m\\.?l\\.?v\\.?|s\\.?m\\.?l\\.?m\\.?v\\.?|salarios?\\s+minimos?)";
const RE_SMMLV_ANTES = new RegExp(`(\\d[\\d.,]*)\\s*${UNIDAD_SMMLV}`, "g");
const RE_SMMLV_DESPUES = new RegExp(`${UNIDAD_SMMLV}\\s*[:=]?\\s*(\\d[\\d.,]*)`, "g");

/* → { experiencia_smmlv, k_declarada_smmlv, experiencia_partida }.
   `experiencia_partida` es {leido, siguiente}: una cifra que quedó partida sin
   poder unirse. Tres formas (la unión bien formada ya la hizo
   unirNumerosPartidos; llegar aquí es que no lo era): la línea con la unidad
   EMPIEZA por el número y la anterior termina con el separador colgando
   («12.» / «5000 SMMLV»); la anterior termina en dígitos y esta empieza por el
   separador («12» / «.5000 SMMLV», remate B2b-H1); o la cifra que va DESPUÉS
   de la unidad cierra la línea con el separador colgando («SMMLV: 12.» /
   «5000 …»). Ese contrato es el que decide el máximo y no se sabe cuánto
   valía: la experiencia se pide (con lo leído a la vista), no se guarda el
   trozo ni el máximo de los demás. */
const RE_CABEZA_CON_SEPARADOR = /^\s*([.,]?)(\d[\d.,]*)/;
function leerExperienciaYK(lineasNorm) {
  let maxSMMLV = null;
  let kDeclarada = null;
  let partida = null;
  for (let i = 0; i < lineasNorm.length; i++) {
    const ln = lineasNorm[i];
    const colaAnterior = i > 0 ? (RE_COLA_NUMERICA.exec(lineasNorm[i - 1]) || [])[1] : null;
    const cabeza = RE_CABEZA_CON_SEPARADOR.exec(ln);
    const cortadaAntes = !!(colaAnterior && cabeza && (/[.,]$/.test(colaAnterior) || cabeza[1] !== ""));
    if (RE_K_DECLARADA.test(ln)) {
      const m = RE_K_DECLARADA.exec(ln);
      const numeros = numerosDe(sinFechas(ln.slice(m.index + m[0].length)));
      // una K que cuelga en el salto de línea no es una K: se deja en null
      if (numeros.length && kDeclarada == null && !numeros[0].colgante) kDeclarada = numeros[0].valor;
      continue; // la K también se expresa en SMMLV: no es un contrato acreditado
    }
    for (const re of [RE_SMMLV_ANTES, RE_SMMLV_DESPUES]) {
      re.lastIndex = 0;
      let m = null;
      while ((m = re.exec(ln)) !== null) {
        // el número que abre la línea (solo espacios y, a lo sumo, el separador delante) viene partido
        if (re === RE_SMMLV_ANTES && cortadaAntes && /^\s*[.,]?$/.test(ln.slice(0, m.index))) {
          if (!partida) partida = { leido: colaAnterior, siguiente: cabeza[1] + cabeza[2] };
          continue;
        }
        /* tras la unidad, con el separador colgando al final de la línea: con coma
           siempre es un corte; con punto, solo si la línea siguiente empieza por
           dígitos (si no, es el punto final de una frase: la regla de numerosDe) */
        const cuelga = re === RE_SMMLV_DESPUES && /[.,]$/.test(m[1]) && m.index + m[0].length >= ln.replace(/\s+$/, "").length;
        if (cuelga) {
          const cabS = RE_CABEZA_NUMERO.exec(lineasNorm[i + 1] || "");
          if (m[1].endsWith(",") || cabS) {
            if (!partida) partida = { leido: m[1], siguiente: cabS ? cabS[1] : null };
            continue;
          }
        }
        const valor = numeroColombiano(m[1].replace(/[.,]$/, ""));
        if (valor != null && valor > 0 && valor <= MAX_EXPERIENCIA_SMMLV) {
          maxSMMLV = Math.max(maxSMMLV == null ? 0 : maxSMMLV, valor);
        }
      }
    }
  }
  return { experiencia_smmlv: partida ? null : maxSMMLV, k_declarada_smmlv: kDeclarada, experiencia_partida: partida };
}

/* ══════════════════ 6 · Entrada pública ══════════════════ */
function extraerRupDeTexto(texto) {
  const crudo = String(texto == null ? "" : texto);
  if (crudo.trim().length < MIN_TEXTO) {
    return {
      ok: false,
      error: "El texto extraído del PDF está vacío o es demasiado corto. Si el certificado es un escaneo "
        + "(imagen sin capa de texto), pdf.js no puede leerlo: descargue el RUP en PDF directamente del "
        + "portal de la Cámara de Comercio (RUES), que siempre trae capa de texto.",
      diagnostico: { caracteres: crudo.trim().length },
    };
  }

  const lineas = crudo.split(/\r\n|\r|\n/).slice(0, MAX_LINEAS);
  /* los números partidos en el salto de línea se unen ANTES de leer
     indicadores, experiencia y fechas; los códigos siguen leyéndose sobre las
     líneas crudas (un run de 8 no se parte y unir filas del clasificador
     fabricaría corridas) */
  const lineasNorm = unirNumerosPartidos(lineas.map((l) => norm(l)));
  const advertencias = [];

  /* ---- códigos ---- */
  const { codigos, ilegibles } = extraerCodigosUnspsc(lineas);
  if (codigos.length > MAX_CODIGOS) {
    return {
      ok: false,
      error: `Se detectaron ${codigos.length} códigos UNSPSC, muy por encima de lo que trae un certificado RUP real. `
        + "El documento no parece un RUP; verifique el PDF o cargue el perfil a mano desde la pestaña «Mi empresa».",
      diagnostico: { lineas_leidas: lineas.length, codigos_detectados: codigos.length, maximo: MAX_CODIGOS },
    };
  }
  if (!codigos.length) {
    return {
      ok: false,
      error: "No se pudo leer la columna de códigos UNSPSC. Verifique que el PDF sea su certificado RUP "
        + "vigente (el Registro Único de Proponentes que expide la Cámara de Comercio) y que incluya la "
        + "sección «Clasificación de bienes y servicios». Si el problema persiste, cargue el RUP a mano "
        + "desde la pestaña «Mi empresa».",
      diagnostico: { lineas_leidas: lineas.length, codigos_detectados: 0, codigos_ilegibles: ilegibles.length },
    };
  }

  /* ---- indicadores financieros ---- */
  /* «razón corriente» es el otro nombre de la liquidez y CAMPOS_PEDIBLES ya
     se lo prometía al usuario («también puede aparecer como Razón corriente»)
     sin que el extractor lo leyera: el mensaje y la regex tienen que decir lo
     mismo. Ídem «cobertura de gastos financieros», variante real del RUES. */
  /* un indicador `partido` (cifra colgando en el salto de línea que no se pudo
     unir) cuenta como NO leído y se pide con su motivo: `leido` separa lo que
     vale de lo que se descartó, y `partidos` guarda el token para decirlo */
  const partidos = {};
  const leido = (campo, x) => {
    if (x && x.partido) { partidos[campo] = { leido: x.token, siguiente: x.siguiente || null }; return null; }
    return x;
  };
  const liquidez = leido("liquidez", leerIndicador(lineasNorm, /(indice\s+de\s+)?liquidez|razon\s+corriente/));
  const endeudamiento = leido("endeudamiento", leerIndicador(lineasNorm, /(indice\s+de\s+|nivel\s+de\s+)?endeudamiento/));
  const cobertura = leido("cobertura_intereses", leerIndicador(lineasNorm, /(razon\s+(de\s+)?)?cobertura\s+de\s+(intereses|gastos\s+financieros)/));
  const patrimonio = leido("patrimonio", leerIndicador(lineasNorm, /\bpatrimonio\b/, { excluir: /rentabilidad/, minPlausible: PLAUSIBLE_MIN.patrimonio }));
  let utilidad = leido("utilidad_operacional", leerIndicador(lineasNorm, /utilidad\s+operacional/, { excluir: /rentabilidad/, minPlausible: PLAUSIBLE_MIN.utilidad_operacional }));

  /* utilidad DERIVADA de la rentabilidad del patrimonio cuando el certificado
     no la imprime: rentabilidad del patrimonio = utilidad operacional /
     patrimonio (D. 1082, art. 2.2.1.1.1.5.3). Es una identidad aritmética, no
     un supuesto — y aun así se declara. */
  if (!utilidad && patrimonio) {
    const rentabilidad = leido("rentabilidad", leerIndicador(lineasNorm, /rentabilidad\s+(sobre\s+|del\s+)?patrimonio/));
    const ratio = comoRatio(rentabilidad, "rentabilidad del patrimonio", advertencias);
    if (ratio != null && ratio > 0) {
      utilidad = { valor: Math.round(ratio * patrimonio.valor), pct: false, derivada: true };
      advertencias.push("La utilidad operacional no aparece en el certificado: se derivó de la rentabilidad "
        + `del patrimonio (${ratio} × patrimonio), que es la identidad con la que el RUP la calcula.`);
    }
  }

  /* ---- experiencia y K declarada ---- */
  const { experiencia_smmlv, k_declarada_smmlv, experiencia_partida } = leerExperienciaYK(lineasNorm);
  if (experiencia_partida) partidos.experiencia_smmlv = experiencia_partida;

  /* ---- lo que falta, dicho de una vez y en lenguaje de personas ---- */
  /* ═══ UN INDICADOR QUE FALTA NO INVALIDA EL CERTIFICADO ═══════════════════
     ESTO RECHAZABA EL RUP ENTERO, y era el defecto más caro de la aplicación:
     un certificado de PERSONA NATURAL sale de la Cámara de Comercio con el
     MISMO formato que el de una sociedad, pero sin la línea «Utilidad
     operacional» —quien no lleva libros no la reporta— y a veces sin la
     rentabilidad del patrimonio para derivarla. El lector leía bien los
     códigos, la liquidez, el endeudamiento, el patrimonio y la experiencia… y
     tiraba TODO porque faltaba un número. Reproducido: sobre el MISMO texto,
     quitando solo esa línea, el certificado pasa de aceptado a rechazado.

     Era además una violación de la regla R6 del propio proyecto («no bloquear
     por falta de información») en el único sitio donde bloquear expulsa a un
     usuario para siempre: la primera pantalla.

     LO QUE SE HACE EN SU LUGAR es lo que el dueño pidió por escrito: si no se
     puede automatizar, que la persona lo escriba UNA VEZ y el sistema lo
     recuerde. Se devuelve `ok: true` con lo leído, `completo: false` y la lista
     de lo que falta EN LENGUAJE DE PERSONAS —etiqueta, dónde mirarlo en el
     certificado y qué se rompe si no está—, para que la web pida dos números en
     un formulario de dos casillas en vez de mandar a nadie a «/admin.html».

     El valor que falta viaja en `null` y JAMÁS en 0 (R1): un patrimonio 0
     calcularía una capacidad de contratación de cero y cerraría puertas de
     verdad. Quien consuma esto trata `null` como «sin dato». */
  const CAMPOS_PEDIBLES = [
    { campo: "liquidez", ok: !!liquidez, etiqueta: ETIQUETAS.liquidez,
      donde: "En el certificado, sección «Información financiera» — también puede aparecer como «Razón corriente».",
      sin_el: "No se puede calcular su capacidad financiera (uno de los factores de la K)." },
    { campo: "endeudamiento", ok: !!endeudamiento, etiqueta: ETIQUETAS.endeudamiento,
      donde: "Sección «Información financiera». Escríbalo como porcentaje: 13 para 13 %.",
      sin_el: "No se puede comprobar el indicador de endeudamiento que exigen los pliegos." },
    { campo: "patrimonio", ok: !!patrimonio, etiqueta: ETIQUETAS.patrimonio,
      donde: "Sección «Información financiera», en pesos.",
      sin_el: "No se puede calcular ni su capacidad de contratación ni si puede financiar la obra." },
    { campo: "utilidad_operacional", ok: !!utilidad, etiqueta: ETIQUETAS.utilidad_operacional,
      donde: "Sección «Información financiera». Los certificados de persona natural muchas veces NO la traen: "
        + "tómela de su declaración de renta o de su estado de resultados del último año.",
      sin_el: "No se puede estimar su capacidad organizacional (el factor CO de la K)." },
    { campo: "experiencia_smmlv", ok: experiencia_smmlv != null, etiqueta: ETIQUETAS.experiencia_smmlv,
      donde: "Sección de experiencia del certificado: es el valor total en SMMLV de los contratos que usted inscribió.",
      sin_el: "No se puede comparar su experiencia contra la que pide cada proceso." },
  ];
  /* un campo descartado por cifra partida viaja con `motivo`: el formulario
     que lo pide dice POR QUÉ lo pide sobre un certificado que sí lo trae */
  const faltan = CAMPOS_PEDIBLES.filter((c) => !c.ok).map(({ ok: _ok, ...resto }) => (
    partidos[resto.campo] ? { ...resto, motivo: MOTIVO_PARTIDO(partidos[resto.campo]) } : resto
  ));
  const completo = faltan.length === 0;
  if (!completo) {
    advertencias.push(`Del certificado se leyeron ${codigos.length} códigos y el resto de los datos, pero `
      + `${faltan.length === 1 ? "falta 1 dato" : `faltan ${faltan.length} datos`}: `
      + `${faltan.map((f) => f.etiqueta).join(", ")}. Escríbalos una vez y quedan guardados en su perfil.`);
  }
  const cifrasPartidas = Object.keys(partidos);
  if (cifrasPartidas.length) {
    advertencias.push(`${cifrasPartidas.length === 1 ? "Una cifra del certificado aparece partida" : `${cifrasPartidas.length} cifras del certificado aparecen partidas`} `
      + `en un salto de línea y no se guardó el trozo (${cifrasPartidas.map((c) => `${ETIQUETAS[c] || c}: ${trozoLeido(partidos[c])}`).join("; ")}): `
      + "se pide el dato en vez de dar por buena una cifra incompleta.");
  }

  /* ---- cobertura de intereses: el esquema de carga usa 0 como «sin dato»
     (perfilComoConfig hace la misma traducción con el null del perfil) ---- */
  let coberturaValor = cobertura ? cobertura.valor : null;
  if (coberturaValor == null) {
    coberturaValor = 0;
    advertencias.push("La razón de cobertura de intereses no se pudo leer: se guarda 0, que en el esquema de carga significa «sin dato» (no participa del cálculo de la K).");
  }

  /* ---- identidad y vigencia ---- */
  const nombre = valorDeEtiqueta(lineas, /razon social|nombre del proponente|^proponente$|nombre o razon social/)
    || valorDeEtiqueta(lineas, /^nombre$/);
  const nit = leerNit(lineas);
  const tipo = leerTipo(lineas, nombre, advertencias);
  const fechaInscripcion = leerFecha(lineasNorm, /fecha\s+de\s+inscripcion|inscrito\s+el/);
  const fechaRenovacion = leerFecha(lineasNorm, /(fecha\s+de\s+)?(ultima\s+)?renovacion/);
  const anoVigente = new Date().getFullYear();
  const ultimaFecha = fechaRenovacion || fechaInscripcion;
  const vigencia = {
    fecha_inscripcion: fechaInscripcion,
    fecha_renovacion: fechaRenovacion,
    /* el RUP se renueva cada año antes del quinto día hábil de abril: una
       última fecha de un año anterior no PRUEBA que esté vencido (pudo
       renovarse después de emitirse este PDF), así que se AVISA, no se corta */
    verificar_vigencia: ultimaFecha ? parseInt(ultimaFecha.slice(0, 4), 10) < anoVigente : null,
  };
  if (vigencia.verificar_vigencia) {
    advertencias.push(`La última fecha del certificado (${ultimaFecha}) es de un año anterior: el RUP se renueva `
      + "cada año antes del quinto día hábil de abril. Verifique que esté vigente antes de presentarse.");
  }
  if (!nombre) advertencias.push("No se pudo leer la razón social: el perfil queda con un nombre genérico (editable desde la pestaña «Mi empresa»).");

  /* ---- los dos supuestos declarados ---- */
  advertencias.push("El RUP no publica la planta de profesionales: se asume 1 (el factor CT de la capacidad K queda en su mínimo, 20). Si su equipo es mayor, corríjalo cargando el RUP desde la pestaña «Mi empresa».");
  /* `null × 2` es 0, y un tope de 0 SMMLV no mostraría ni un proceso: sin
     experiencia leída el tope queda en `null` («sin dato»), no en cero (R1). */
  const topeSMMLV = experiencia_smmlv == null ? null : Math.ceil(experiencia_smmlv * 2);
  if (topeSMMLV != null) {
    advertencias.push(`Tope estratégico por defecto: ${topeSMMLV} SMMLV (2 × su mayor contrato acreditado). Por encima de esa cuantía no se le mostrarán procesos; ajústelo desde la pestaña «Mi empresa» si quiere ver contratos mayores.`);
  }

  const config = {
    // truncado al tope del esquema: una línea pegada del PDF no puede convertir
    // la razón social en un error de validación críptico
    nombre: (nombre || "Proponente RUP (sin razón social legible)").slice(0, 200),
    tipo,
    nit,
    unspsc: codigos,
    indicadores: {
      // lo que no se leyó viaja en null («sin dato»), nunca en 0: un patrimonio
      // 0 calcularía una capacidad de contratación de cero y cerraría puertas
      liquidez: liquidez ? liquidez.valor : null,
      endeudamiento: endeudamiento ? comoRatio(endeudamiento, "endeudamiento", advertencias) : null,
      cobertura_intereses: coberturaValor,
      patrimonio: patrimonio ? Math.round(patrimonio.valor) : null,
      utilidad_operacional: utilidad ? Math.round(utilidad.valor) : null,
      ingreso_operacional: null, // el RUP no lo reporta: la K estima CO (documentado en lib/capacidad)
    },
    profesionales: 1,
    experiencia_smmlv,
    tope_smmlv: topeSMMLV,
  };

  return {
    ok: true,
    /* `completo` separa «no pude leer el documento» de «leí el documento y me
       faltan dos números». Fundirlos en un `ok: false` era lo que expulsaba a
       las personas naturales en la primera pantalla. */
    completo,
    faltan,
    config,
    vigencia,
    k_declarada_smmlv,
    advertencias,
    diagnostico: {
      lineas_leidas: lineas.length,
      codigos_detectados: codigos.length,
      codigos_ilegibles: ilegibles.length,
      ejemplos_ilegibles: ilegibles.slice(0, 8),
      utilidad_derivada: Boolean(utilidad && utilidad.derivada),
      cifras_partidas: cifrasPartidas,
    },
  };
}

module.exports = { extraerRupDeTexto, extraerCodigosUnspsc, fechaDe, unirNumerosPartidos, numerosDe, PLAUSIBLE_MIN, MIN_TEXTO };
