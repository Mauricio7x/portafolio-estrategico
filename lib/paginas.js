/* lib/paginas.js · la PÁGINA viaja con el texto del pliego (ago 2026)
   ─────────────────────────────────────────────────────────────────────────────
   El lector extrae el texto del PDF en el NAVEGADOR (pdf.js, por coordenadas) y
   lo manda al servidor como líneas; hasta ago 2026 las páginas se pegaban con
   `\n` y el número de página se perdía ANTES de llegar a ningún consumidor:
   ni la fila de la tabla de cantidades, ni el requisito habilitante que el
   vigía de adendas reevalúa, ni el hito del cronograma podían decir «pág. 14».
   Y «cítame la página» es lo que hace comprobable una lectura automática.

   FORMATO DEL MARCADOR: una línea que contiene SOLO `\f` (form feed, U+000C,
   el separador de página clásico de los volcados de PDF) seguido del número
   de página: `\f14`. Es deliberadamente distinto de un texto legible:
   · un pliego real trae pies como «PÁGINA 3 DE 20» (que `RUIDO_RE` ya
     descarta) y su número impreso NO es el índice del PDF —usar «PÁGINA n»
     como marcador los confundiría—;
   · `\f` no aparece en el `getTextContent` de pdf.js ni en la salida de OCR.
   Un `\f` SIN número significa «aquí empieza la página siguiente» (se cuenta
   desde 1). Lo emite `public/pliego.js` (pdf.js) y `lib/apu_ocr.ocrPaginas`
   (OCR, con el índice dentro del lote, que el navegador re-basa).

   Tres reglas:
   · La página es un DATO MÁS de la fila/evidencia (`pagina`), `null` cuando el
     texto no trae marcadores (texto pegado a mano, versiones guardadas antes
     de este cambio): la ausencia no se rellena.
   · El hash del vigía de adendas se calcula sobre el texto SIN marcadores
     (`quitarMarcadores`): la misma descarga abierta antes y después de este
     cambio tiene que dar el MISMO hash, o cada apertura sería una «adenda».
   · Este módulo es HOJA del grafo de requires (no importa nada del proyecto):
     lo usan apu_pliego, diff, cronograma y apu_ocr, y un ciclo aquí dejaría
     `undefined` en tiempo de carga (la lección de `norm`). */
"use strict";

/* Solo espacios/tabs alrededor: `\s` NO sirve porque incluye al propio \f. */
const MARCADOR_RE = /^[ \t]*\f(\d{0,6})[ \t]*$/;

/** Marcador de página para el número `n` (o «página siguiente» sin número). */
function marcador(n) {
  return "\f" + (n == null ? "" : String(Math.trunc(Number(n))));
}

/** `undefined` si la línea NO es un marcador; `null` si es un `\f` sin número
 *  («página siguiente»); el número si lo trae. */
function numeroDeMarcador(linea) {
  const m = MARCADOR_RE.exec(String(linea == null ? "" : linea));
  if (!m) return undefined;
  return m[1] === "" ? null : Number(m[1]);
}
const esMarcador = (linea) => numeroDeMarcador(linea) !== undefined;

/** Página que declara un marcador dado el estado anterior: numérico → esa;
 *  `\f` sin número → la siguiente (1 si es la primera). */
function siguientePagina(actual, marca) {
  if (marca === undefined) return actual;
  if (marca === null) return actual == null ? 1 : actual + 1;
  return marca;
}

/** Recorre el texto línea a línea y devuelve `[{linea, pagina}]` SIN los
 *  marcadores. `pagina` es `null` hasta el primer marcador (y siempre, si el
 *  texto no trae ninguno). */
function lineasConPagina(texto) {
  const salida = [];
  let pagina = null;
  for (const linea of String(texto == null ? "" : texto).split(/\r\n|\r|\n/)) {
    const marca = numeroDeMarcador(linea);
    if (marca !== undefined) { pagina = siguientePagina(pagina, marca); continue; }
    salida.push({ linea, pagina });
  }
  return salida;
}

/** El texto sin las líneas de marcador (con `\n` como salto). Es lo que se
 *  hashea en el vigía de adendas y lo que se parte en párrafos. */
function quitarMarcadores(texto) {
  return String(texto == null ? "" : texto)
    .split(/\r\n|\r|\n/)
    .filter((l) => !esMarcador(l))
    .join("\n");
}

/** Cuántos marcadores trae el texto (0 = «sin páginas»). */
function contarMarcadores(texto) {
  let n = 0;
  for (const l of String(texto == null ? "" : texto).split(/\r\n|\r|\n/)) if (esMarcador(l)) n++;
  return n;
}

/** Re-basa los marcadores relativos de un lote de OCR (`\f1`, `\f2`…) al
 *  número absoluto de la primera página del lote. */
function rebasarMarcadores(texto, primeraPagina) {
  const base = Number(primeraPagina);
  if (!Number.isFinite(base)) return String(texto == null ? "" : texto);
  return String(texto == null ? "" : texto)
    .split(/\r\n|\r|\n/)
    .map((l) => { const m = numeroDeMarcador(l); return m == null ? l : marcador(base + m - 1); })
    .join("\n");
}

module.exports = {
  MARCADOR_RE, marcador, numeroDeMarcador, esMarcador, siguientePagina,
  lineasConPagina, quitarMarcadores, contarMarcadores, rebasarMarcadores,
};
