/* lib/glosario.js · la marca y el glosario viven en public/glosario.js (UMD) y
   aquí solo se RE-EXPORTAN. No es una copia: es el mismo archivo, que el
   navegador carga como <script> y el servidor requiere (el patrón de
   `lib/costos.js`). Dos listas «equivalentes hoy» divergen a la primera
   corrección aplicada a una sola — y aquí sería el NOMBRE DEL PRODUCTO
   escrito de dos formas. La suite comprueba la IDENTIDAD de objeto. */
module.exports = require("../public/glosario.js");
