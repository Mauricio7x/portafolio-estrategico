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

/* tokens numéricos de un tramo de línea → [{valor, pct}] */
function numerosDe(tramo) {
  const salida = [];
  for (const bruto of String(tramo || "").match(RE_TOKEN_NUMERO) || []) {
    const pct = bruto.includes("%");
    // el punto final de frase no es un separador: «850.000.000.» → «850.000.000»
    const limpio = bruto.replace(/%/g, "").trim().replace(/[.,]$/, "");
    const n = numeroColombiano(limpio);
    if (n != null) salida.push({ valor: n, pct });
  }
  return salida;
}

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

function leerIndicador(lineasNorm, re, { excluir = null } = {}) {
  for (const ln of lineasNorm) {
    if (excluir && excluir.test(ln)) continue;
    const m = re.exec(ln);
    if (!m) continue;
    const numeros = numerosDe(sinFechas(ln.slice(m.index + m[0].length)));
    if (numeros.length) return { ...numeros[0], linea: ln.trim().slice(0, 160) };
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

function leerExperienciaYK(lineasNorm) {
  let maxSMMLV = null;
  let kDeclarada = null;
  for (const ln of lineasNorm) {
    if (RE_K_DECLARADA.test(ln)) {
      const m = RE_K_DECLARADA.exec(ln);
      const numeros = numerosDe(sinFechas(ln.slice(m.index + m[0].length)));
      if (numeros.length && kDeclarada == null) kDeclarada = numeros[0].valor;
      continue; // la K también se expresa en SMMLV: no es un contrato acreditado
    }
    for (const re of [RE_SMMLV_ANTES, RE_SMMLV_DESPUES]) {
      re.lastIndex = 0;
      let m = null;
      while ((m = re.exec(ln)) !== null) {
        const valor = numeroColombiano(m[1].replace(/[.,]$/, ""));
        if (valor != null && valor > 0 && valor <= MAX_EXPERIENCIA_SMMLV) {
          maxSMMLV = Math.max(maxSMMLV == null ? 0 : maxSMMLV, valor);
        }
      }
    }
  }
  return { experiencia_smmlv: maxSMMLV, k_declarada_smmlv: kDeclarada };
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
  const lineasNorm = lineas.map((l) => norm(l));
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
  const liquidez = leerIndicador(lineasNorm, /(indice\s+de\s+)?liquidez|razon\s+corriente/);
  const endeudamiento = leerIndicador(lineasNorm, /(indice\s+de\s+|nivel\s+de\s+)?endeudamiento/);
  const cobertura = leerIndicador(lineasNorm, /(razon\s+(de\s+)?)?cobertura\s+de\s+(intereses|gastos\s+financieros)/);
  const patrimonio = leerIndicador(lineasNorm, /\bpatrimonio\b/, { excluir: /rentabilidad/ });
  let utilidad = leerIndicador(lineasNorm, /utilidad\s+operacional/, { excluir: /rentabilidad/ });

  /* utilidad DERIVADA de la rentabilidad del patrimonio cuando el certificado
     no la imprime: rentabilidad del patrimonio = utilidad operacional /
     patrimonio (D. 1082, art. 2.2.1.1.1.5.3). Es una identidad aritmética, no
     un supuesto — y aun así se declara. */
  if (!utilidad && patrimonio) {
    const rentabilidad = leerIndicador(lineasNorm, /rentabilidad\s+(sobre\s+|del\s+)?patrimonio/);
    const ratio = comoRatio(rentabilidad, "rentabilidad del patrimonio", advertencias);
    if (ratio != null && ratio > 0) {
      utilidad = { valor: Math.round(ratio * patrimonio.valor), pct: false, derivada: true };
      advertencias.push("La utilidad operacional no aparece en el certificado: se derivó de la rentabilidad "
        + `del patrimonio (${ratio} × patrimonio), que es la identidad con la que el RUP la calcula.`);
    }
  }

  /* ---- experiencia y K declarada ---- */
  const { experiencia_smmlv, k_declarada_smmlv } = leerExperienciaYK(lineasNorm);

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
    { campo: "liquidez", ok: !!liquidez, etiqueta: "Índice de liquidez",
      donde: "En el certificado, sección «Información financiera» — también puede aparecer como «Razón corriente».",
      sin_el: "No se puede calcular su capacidad financiera (uno de los factores de la K)." },
    { campo: "endeudamiento", ok: !!endeudamiento, etiqueta: "Nivel de endeudamiento (%)",
      donde: "Sección «Información financiera». Escríbalo como porcentaje: 13 para 13 %.",
      sin_el: "No se puede comprobar el indicador de endeudamiento que exigen los pliegos." },
    { campo: "patrimonio", ok: !!patrimonio, etiqueta: "Patrimonio (pesos)",
      donde: "Sección «Información financiera», en pesos.",
      sin_el: "No se puede calcular ni su capacidad de contratación ni si puede financiar la obra." },
    { campo: "utilidad_operacional", ok: !!utilidad, etiqueta: "Utilidad operacional (pesos)",
      donde: "Sección «Información financiera». Los certificados de persona natural muchas veces NO la traen: "
        + "tómela de su declaración de renta o de su estado de resultados del último año.",
      sin_el: "No se puede estimar su capacidad organizacional (el factor CO de la K)." },
    { campo: "experiencia_smmlv", ok: experiencia_smmlv != null, etiqueta: "Experiencia acreditada (SMMLV)",
      donde: "Sección de experiencia del certificado: es el valor total en SMMLV de los contratos que usted inscribió.",
      sin_el: "No se puede comparar su experiencia contra la que pide cada proceso." },
  ];
  const faltan = CAMPOS_PEDIBLES.filter((c) => !c.ok).map(({ ok: _ok, ...resto }) => resto);
  const completo = faltan.length === 0;
  if (!completo) {
    advertencias.push(`Del certificado se leyeron ${codigos.length} códigos y el resto de los datos, pero `
      + `${faltan.length === 1 ? "falta 1 dato" : `faltan ${faltan.length} datos`}: `
      + `${faltan.map((f) => f.etiqueta).join(", ")}. Escríbalos una vez y quedan guardados en su perfil.`);
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
    advertencias.push(`Tope estratégico por defecto: ${topeSMMLV} SMMLV (2 × su mayor contrato acreditado). Por encima de esa cuantía no se le mostrarán procesos; ajustalo si tu apetito es otro.`);
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
    },
  };
}

module.exports = { extraerRupDeTexto, extraerCodigosUnspsc, fechaDe, MIN_TEXTO };
