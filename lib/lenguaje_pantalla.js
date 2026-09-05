/* lib/lenguaje_pantalla.js · las DOS cercas de lenguaje de pantalla, en una sola copia
   ─────────────────────────────────────────────────────────────────────────────
   Hasta el 2-sep-2026 vivían como constantes locales de dos bloques de
   tests/e2e.js, que barren TODO public/*.js (emoji: censo con la única
   excepción declarada de apu_libro.js; voseo/tuteo: censo sin excepción). El
   dictamen del pliego (lib/dictamen.js) recibe texto de un modelo EN TIEMPO DE
   EJECUCIÓN, que esa cerca estática no ve, así que el servidor lo censa con las
   MISMAS expresiones. Para que sean las mismas de verdad —y no dos copias
   «equivalentes hoy» que divergen a la primera corrección— viven aquí y la suite
   comprueba la IDENTIDAD de la referencia. Módulo HOJA: no requiere nada.

   · RE_EMOJI_UI lleva la bandera `g`: con `.test()` sería stateful (lastIndex);
     úsese con `.match()` o `.replace()`, como hacen la suite y el censo.
   · VOSEO_RE no lleva `i` a propósito: la suite la usa así desde su origen y
     cambiarle la bandera cambiaría lo que caza.

   ══════ DE LISTA DE RAÍCES A CENSO DE TERMINACIONES (5-sep-2026) ══════
   `VOSEO_RE` enumera FORMAS («Podés», «revisá», «puedes»…) y la suite añadía
   aparte una lista de RAÍCES con «-aste» (calcul|guard|carg|…). Las dos son
   listas, y una lista deja huecos por definición: con la suite en 4/4 el
   servidor seguía sirviendo «Escribilo como porcentaje» e «…los contratos que
   inscribiste» (lib/rup_pdf), «el archivo que importaste» y «Escribiste este
   precio a mano» (lib/apu/precios) y la pantalla, «no contés con eso»
   (public/app, la alerta de vigencia del registro). Ninguna raíz de la lista
   casaba. Ahora se censa la TERMINACIÓN —que es lo que distingue al tuteo y al
   voseo del registro de usted— y lo que se enumera son las EXCEPCIONES, con su
   motivo: un sustantivo o un adverbio que acaba igual («además», «país»,
   «interés»), un presente de usted en -iste («existe», «persiste») o un nombre
   propio («Andrés», «Vaupés»). Añadir texto nuevo no puede volver a colar un
   tuteo; lo que puede es obligar a DECLARAR una palabra más, y eso se ve.
   El imperativo del voseo con pronombre pegado no tiene terminación de persona,
   así que va por su propia forma («Escribilo», «corregilo» — este último vivía
   en una advertencia de lib/rup_pdf que la primera versión de esta cerca aún no
   veía). `tuteoEn` devuelve la primera palabra no declarada (o `null`), para que
   la cerca sea la MISMA función en la suite y en cualquier censo futuro. */
"use strict";

const RE_EMOJI_UI = new RegExp(
  "[\\u{1F300}-\\u{1FAFF}\\u{231A}\\u{231B}\\u{23E9}-\\u{23FA}\\u{25FD}\\u{25FE}"
  + "\\u{2614}\\u{2615}\\u{2648}-\\u{2653}\\u{267F}\\u{2693}\\u{26A1}\\u{26AA}\\u{26AB}"
  + "\\u{26BD}\\u{26BE}\\u{26C4}\\u{26C5}\\u{26CE}\\u{26D4}\\u{26EA}\\u{26F2}\\u{26F3}"
  + "\\u{26F5}\\u{26FA}\\u{26FD}\\u{2705}\\u{270A}\\u{270B}\\u{2728}\\u{274C}\\u{274E}"
  + "\\u{2753}-\\u{2755}\\u{2757}\\u{2795}-\\u{2797}\\u{27B0}\\u{27BF}\\u{2B1B}\\u{2B1C}"
  + "\\u{2B50}\\u{2B55}]", "gu");

const VOSEO_RE = /\b(Pod[ée]s|Cumpl[íi]s|Ten[ée]s|Quer[ée]s|Deb[ée]s|Sab[ée]s|presentarte|pensá|verificá|revisá|hacé|poné|fijate|and[aá]|dale|vas|ejecutaste|tendr[aá]s|Eliminar[aá]s|puedes|tienes|quieres|debes|hazlo)\b/;

/* Terminaciones que solo existen en tuteo («escribiste», «calculaste») o en
   voseo («podés», «vivís», «tendrás»). Lleva `g` para poder usarse con
   `matchAll`: con `.test()` sería stateful, como RE_EMOJI_UI. */
const TUTEO_TERMINACIONES_RE = /\b\w+(?:aste|iste|ás|és|ís)\b/g;

/* El imperativo del voseo con pronombre pegado no tiene terminación de persona
   («Escribilo», «corregilo»): lo que lo delata es la `-i-` donde el registro de
   usted pone `-a-`/`-e-` («escríbalo», «corríjalo»). La expresión exige una
   palabra de PROSA —inicial suelta y el resto en minúscula— porque los
   identificadores del código acaban igual y no son texto: `cerrarFila`,
   `limite_filas`, `validacion_fila`, `htmlFila`… (medido sobre lib/, api/ y
   public/ el 5-sep-2026: con esta forma el censo solo deja tres candidatos, y
   dos son las excepciones declaradas abajo). */
const VOSEO_ENCLITICO_RE = /\b[A-Za-záéíóúñÁÉÍÓÚÑ][a-záéíóúñ]{3,}[ií]l[oa]s?\b/g;

/* EXCEPCIONES DECLARADAS, con su motivo (censo, no lista: quitar una palabra de
   aquí no abre un hueco, la añade a la cerca; añadir una obliga a justificarla).
   · sustantivos y adverbios que acaban igual: además, contraste, demás,
     después, detrás, estrés, interés, jamás, más, país, revés
   · presente de indicativo de usted/él en -iste: existe, insiste, persiste
   · nombres propios de Colombia: Andrés, Vaupés
   · adjetivos en -ilo/-ila que no vienen de ningún verbo: tranquilo, tranquila */
const EXCEPCIONES_TUTEO = Object.freeze([
  "además", "contraste", "demás", "después", "detrás", "estrés", "interés", "jamás", "más", "país", "revés",
  "existe", "insiste", "persiste",
  "andrés", "vaupés",
  "tranquilo", "tranquila",
]);
const EXCEPCIONES_TUTEO_SET = new Set(EXCEPCIONES_TUTEO);

/* Devuelve la PRIMERA palabra con terminación de tuteo/voseo que no esté
   declarada, o `null` si el texto está en registro de usted. */
function tuteoEn(texto) {
  const t = String(texto == null ? "" : texto);
  for (const re of [TUTEO_TERMINACIONES_RE, VOSEO_ENCLITICO_RE]) {
    for (const m of t.matchAll(re)) {
      if (!EXCEPCIONES_TUTEO_SET.has(m[0].toLowerCase())) return m[0];
    }
  }
  return null;
}

module.exports = { RE_EMOJI_UI, VOSEO_RE, TUTEO_TERMINACIONES_RE, VOSEO_ENCLITICO_RE, EXCEPCIONES_TUTEO, tuteoEn };
