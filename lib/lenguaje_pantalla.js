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
     cambiarle la bandera cambiaría lo que caza. */
"use strict";

const RE_EMOJI_UI = new RegExp(
  "[\\u{1F300}-\\u{1FAFF}\\u{231A}\\u{231B}\\u{23E9}-\\u{23FA}\\u{25FD}\\u{25FE}"
  + "\\u{2614}\\u{2615}\\u{2648}-\\u{2653}\\u{267F}\\u{2693}\\u{26A1}\\u{26AA}\\u{26AB}"
  + "\\u{26BD}\\u{26BE}\\u{26C4}\\u{26C5}\\u{26CE}\\u{26D4}\\u{26EA}\\u{26F2}\\u{26F3}"
  + "\\u{26F5}\\u{26FA}\\u{26FD}\\u{2705}\\u{270A}\\u{270B}\\u{2728}\\u{274C}\\u{274E}"
  + "\\u{2753}-\\u{2755}\\u{2757}\\u{2795}-\\u{2797}\\u{27B0}\\u{27BF}\\u{2B1B}\\u{2B1C}"
  + "\\u{2B50}\\u{2B55}]", "gu");

const VOSEO_RE = /\b(Pod[ée]s|Cumpl[íi]s|Ten[ée]s|Quer[ée]s|Deb[ée]s|Sab[ée]s|presentarte|pensá|verificá|revisá|hacé|poné|fijate|and[aá]|dale|vas|ejecutaste|tendr[aá]s|Eliminar[aá]s|puedes|tienes|quieres|debes|hazlo)\b/;

module.exports = { RE_EMOJI_UI, VOSEO_RE };
