/* lib/costos.js · el motor de costo real vive en public/costos.js (UMD) y aquí
   solo se RE-EXPORTA. No es una copia: es el mismo archivo, que el navegador
   carga como <script> y el servidor requiere. Dos implementaciones
   «equivalentes hoy» divergen a la primera corrección aplicada a una sola —
   la lección de total_procesos/procesos_contados—, y aquí serían pesos de
   nómina. La prueba de la suite comprueba la IDENTIDAD de objeto. */
module.exports = require("../public/costos.js");
