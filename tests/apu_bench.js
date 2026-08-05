/* ============================================================================
   tests/apu_bench · Tasa de acierto del parseo de tablas de pliego
   ----------------------------------------------------------------------------
   Uso:  node tests/apu_bench.js

   POR QUÉ EXISTE, SEPARADO DE tests/e2e.js. La suite responde «¿sigue
   funcionando?» con aserciones binarias. Esto responde «¿CUÁNTO acierta?», que
   es una cifra, no un sí/no — y una cifra que se cita en un informe tiene que
   poder rehacerse, o no es una medición: es una afirmación.

   LO QUE ESTA CIFRA NO ES. El corpus son 10 formularios SINTÉTICOS escritos a
   mano imitando las formas que toman los formularios de cantidades reales
   (documento tipo, sin cabecera, aplanado, ruido de OCR, descripciones partidas,
   subtotales por capítulo…). **No es una muestra de pliegos reales de SECOP II**,
   así que mide la ROBUSTEZ DEL PARSER ante variantes conocidas, no la cobertura
   del universo. La distribución real de formatos está sin medir —el documento de
   diseño la deja como vacío explícito (§1.G.7: «[SUPUESTO], no medidos»)— y esta
   cifra no la sustituye. Cualquiera que la cite sin esta advertencia está
   diciendo algo más fuerte de lo que aquí se probó.

   Cada caso declara su VERDAD (los ítems que un humano leería) y se mide:
     · recall de filas      filas detectadas / filas plantadas
     · exactitud de unidad   unidades correctas / filas emparejadas
     · exactitud de cantidad cantidades correctas / filas emparejadas
     · falsos positivos      filas detectadas que no existen en la verdad
   ========================================================================== */
"use strict";

const assert = require("assert");
const { parsearPliego } = require("../lib/apu_pliego.js");
const { mapearTabla } = require("../lib/apu_mapeo.js");

const TAB = "\t";
const fila = (...c) => c.join(TAB);

/* ── El corpus. `verdad` es lo que un humano leería en esa tabla. ── */
const CASOS = [
  {
    nombre: "documento tipo · cabecera completa y precios",
    objeto: "CONSTRUCCION DE PLACA HUELLA EN VIA TERCIARIA",
    texto: [
      "ALCALDIA MUNICIPAL DE SANTA ROSA",
      "FORMULARIO 1 - PRESUPUESTO OFICIAL",
      "",
      fila("ITEM", "DESCRIPCION", "UNIDAD", "CANTIDAD", "VALOR UNITARIO", "VALOR TOTAL"),
      fila("1", "PRELIMINARES"),
      fila("1.1", "LOCALIZACION Y REPLANTEO", "M2", "1.250,00", "2.500", "3.125.000"),
      fila("1.2", "DESCAPOTE Y LIMPIEZA", "M2", "1.250,00", "3.200", "4.000.000"),
      fila("2", "ESTRUCTURA"),
      fila("2.1", "SUBBASE GRANULAR COMPACTADA", "M3", "375,00", "95.000", "35.625.000"),
      fila("2.2", "CONCRETO DE 21 MPA PARA HUELLAS", "M3", "180,50", "620.000", "111.910.000"),
      fila("2.3", "ACERO DE REFUERZO FIGURADO FY=420 MPA", "KG", "8.450,00", "6.800", "57.460.000"),
      fila("", "SUBTOTAL CAPITULO 2", "", "", "", "204.995.000"),
    ].join("\n"),
    verdad: [
      { d: "LOCALIZACION Y REPLANTEO", u: "m2", c: 1250 },
      { d: "DESCAPOTE Y LIMPIEZA", u: "m2", c: 1250 },
      { d: "SUBBASE GRANULAR COMPACTADA", u: "m3", c: 375 },
      { d: "CONCRETO DE 21 MPA PARA HUELLAS", u: "m3", c: 180.5 },
      { d: "ACERO DE REFUERZO FIGURADO FY=420 MPA", u: "kg", c: 8450 },
    ],
  },
  {
    nombre: "cabecera abreviada · «No.», «U.M.», «CANT.», «VR UNIT»",
    objeto: "MEJORAMIENTO DE ALCANTARILLADO SANITARIO",
    texto: [
      fila("No.", "ACTIVIDAD", "U.M.", "CANT.", "VR UNIT", "VR TOTAL"),
      fila("1", "EXCAVACION EN ZANJA H=1.5M", "M3", "840,00", "32.000", "26.880.000"),
      fila("2", "TUBERIA NOVAFORT 8 PULGADAS", "ML", "620,00", "78.000", "48.360.000"),
      fila("3", "POZO DE INSPECCION H=2.0M", "UND", "8,00", "3.200.000", "25.600.000"),
      fila("4", "PRUEBA DE ESTANQUEIDAD", "ML", "620,00", "4.500", "2.790.000"),
    ].join("\n"),
    verdad: [
      { d: "EXCAVACION EN ZANJA H=1.5M", u: "m3", c: 840 },
      { d: "TUBERIA NOVAFORT 8 PULGADAS", u: "ml", c: 620 },
      { d: "POZO DE INSPECCION H=2.0M", u: "un", c: 8 },
      { d: "PRUEBA DE ESTANQUEIDAD", u: "ml", c: 620 },
    ],
  },
  {
    nombre: "cantidades SIN precios (caso frecuente y benigno)",
    objeto: "CONSTRUCCION DE AULAS EN INSTITUCION EDUCATIVA",
    texto: [
      fila("ITEM", "DESCRIPCION", "UNIDAD", "CANTIDAD"),
      fila("1.1", "EXCAVACION MANUAL EN MATERIAL COMUN", "M3", "185,50"),
      fila("1.2", "CONCRETO ESTRUCTURAL 21 MPA", "M3", "96,20"),
      fila("1.3", "MAMPOSTERIA EN BLOQUE No 5", "M2", "420,00"),
      fila("1.4", "CUBIERTA EN TEJA TERMOACUSTICA", "M2", "310,00"),
      fila("1.5", "PINTURA SOBRE MURO", "M2", "840,00"),
    ].join("\n"),
    verdad: [
      { d: "EXCAVACION MANUAL EN MATERIAL COMUN", u: "m3", c: 185.5 },
      { d: "CONCRETO ESTRUCTURAL 21 MPA", u: "m3", c: 96.2 },
      { d: "MAMPOSTERIA EN BLOQUE No 5", u: "m2", c: 420 },
      { d: "CUBIERTA EN TEJA TERMOACUSTICA", u: "m2", c: 310 },
      { d: "PINTURA SOBRE MURO", u: "m2", c: 840 },
    ],
  },
  {
    nombre: "SIN cabecera · solo firma de unidad",
    objeto: "MANTENIMIENTO DE VIA TERCIARIA",
    texto: [
      fila("ROCERIA Y LIMPIEZA DE BERMAS", "M2", "3.400,00"),
      fila("CONFORMACION DE LA CALZADA EXISTENTE", "M2", "5.600,00"),
      fila("AFIRMADO E=0.15M", "M3", "840,00"),
      fila("LIMPIEZA DE CUNETAS", "ML", "1.200,00"),
    ].join("\n"),
    verdad: [
      { d: "ROCERIA Y LIMPIEZA DE BERMAS", u: "m2", c: 3400 },
      { d: "CONFORMACION DE LA CALZADA EXISTENTE", u: "m2", c: 5600 },
      { d: "AFIRMADO E=0.15M", u: "m3", c: 840 },
      { d: "LIMPIEZA DE CUNETAS", u: "ml", c: 1200 },
    ],
  },
  {
    nombre: "texto APLANADO (un solo espacio) · último recurso",
    objeto: "CONSTRUCCION DE MURO DE CONTENCION",
    texto: [
      "1.1 EXCAVACION MECANICA EN MATERIAL COMUN M3 620,00 28.000 17.360.000",
      "1.2 CONCRETO CICLOPEO M3 145,00 480.000 69.600.000",
      "1.3 FILTRO FRANCES CON GEOTEXTIL ML 85,00 120.000 10.200.000",
    ].join("\n"),
    verdad: [
      { d: "EXCAVACION MECANICA EN MATERIAL COMUN", u: "m3", c: 620 },
      { d: "CONCRETO CICLOPEO", u: "m3", c: 145 },
      { d: "FILTRO FRANCES CON GEOTEXTIL", u: "ml", c: 85 },
    ],
  },
  {
    nombre: "descripciones PARTIDAS en dos líneas",
    objeto: "CONSTRUCCION DE PUENTE PEATONAL",
    texto: [
      fila("ITEM", "DESCRIPCION", "UNIDAD", "CANTIDAD", "VALOR UNITARIO", "VALOR TOTAL"),
      fila("1.1", "CONCRETO ESTRUCTURAL DE 28 MPA PARA ESTRIBOS", "M3", "78,00", "720.000", "56.160.000"),
      "incluye formaleta metalica y curado",
      fila("1.2", "ACERO DE REFUERZO FIGURADO", "KG", "9.200,00", "6.900", "63.480.000"),
      "de 420 MPa segun NSR-10",
      fila("1.3", "BARANDA METALICA TUBULAR", "ML", "48,00", "185.000", "8.880.000"),
    ].join("\n"),
    verdad: [
      { d: "CONCRETO ESTRUCTURAL DE 28 MPA PARA ESTRIBOS incluye formaleta metalica y curado", u: "m3", c: 78 },
      { d: "ACERO DE REFUERZO FIGURADO de 420 MPa segun NSR-10", u: "kg", c: 9200 },
      { d: "BARANDA METALICA TUBULAR", u: "ml", c: 48 },
    ],
  },
  {
    nombre: "ruido de OCR · «0» por «O», «l» por «1», espacios sueltos",
    objeto: "CONSTRUCCION DE PLACA HUELLA",
    texto: [
      fila("ITEM", "DESCRIPCION", "UNIDAD", "CANTIDAD", "VALOR UNITARIO", "VALOR TOTAL"),
      fila("l.l", "L0CALIZACI0N Y REPLANTE0", "M2", "1.250,00", "2.500", "3.125.000"),
      fila("l.2", "C0NCRET0 DE 21 MPA PARA HUELLAS", "M3", "180,50", "620.000", "111.910.000"),
      fila("l.3", "ACER0 DE REFUERZ0 FIGURAD0", "KG", "8.450,00", "6.800", "57.460.000"),
    ].join("\n"),
    verdad: [
      { d: "L0CALIZACI0N Y REPLANTE0", u: "m2", c: 1250 },
      { d: "C0NCRET0 DE 21 MPA PARA HUELLAS", u: "m3", c: 180.5 },
      { d: "ACER0 DE REFUERZ0 FIGURAD0", u: "kg", c: 8450 },
    ],
  },
  {
    nombre: "unidades escritas en largo y con superíndices",
    objeto: "CONSTRUCCION DE PARQUE Y ESPACIO PUBLICO",
    texto: [
      fila("ITEM", "DESCRIPCION", "UNIDAD", "CANTIDAD"),
      fila("1", "ANDEN EN CONCRETO", "METROS CUADRADOS", "640,00"),
      fila("2", "SARDINEL PREFABRICADO A-10", "METRO LINEAL", "380,00"),
      fila("3", "EXCAVACION PARA ZONAS VERDES", "M³", "220,00"),
      fila("4", "MOBILIARIO URBANO", "UNIDADES", "24,00"),
      fila("5", "EMPRADIZACION", "M²", "1.500,00"),
    ].join("\n"),
    verdad: [
      { d: "ANDEN EN CONCRETO", u: "m2", c: 640 },
      { d: "SARDINEL PREFABRICADO A-10", u: "ml", c: 380 },
      { d: "EXCAVACION PARA ZONAS VERDES", u: "m3", c: 220 },
      { d: "MOBILIARIO URBANO", u: "un", c: 24 },
      { d: "EMPRADIZACION", u: "m2", c: 1500 },
    ],
  },
  {
    nombre: "ruido alrededor · pies de página, totales, AIU, anticipo",
    objeto: "CONSTRUCCION DE UNIDADES SANITARIAS RURALES",
    texto: [
      "DEPARTAMENTO DEL CAUCA - SECRETARIA DE INFRAESTRUCTURA",
      "PROCESO No LP-005-2026",
      fila("ITEM", "DESCRIPCION", "UNIDAD", "CANTIDAD", "VALOR UNITARIO", "VALOR TOTAL"),
      fila("1", "UNIDAD SANITARIA COMPLETA", "UND", "35,00", "12.500.000", "437.500.000"),
      fila("2", "POZO SEPTICO PREFABRICADO 1000 L", "UND", "35,00", "2.800.000", "98.000.000"),
      fila("3", "CAMPO DE INFILTRACION", "ML", "525,00", "95.000", "49.875.000"),
      fila("", "COSTO DIRECTO", "", "", "", "585.375.000"),
      "ADMINISTRACION (A) 18%",
      "IMPREVISTOS (I) 2%",
      "UTILIDAD (U) 5%",
      "ANTICIPO 30%",
      "Pagina 4 de 12",
      "Elaboro: Ing. Juan Perez - MP 12345",
    ].join("\n"),
    verdad: [
      { d: "UNIDAD SANITARIA COMPLETA", u: "un", c: 35 },
      { d: "POZO SEPTICO PREFABRICADO 1000 L", u: "un", c: 35 },
      { d: "CAMPO DE INFILTRACION", u: "ml", c: 525 },
    ],
  },
  {
    nombre: "columnas en otro orden · unidad al final",
    objeto: "CONSTRUCCION DE PAVIMENTO FLEXIBLE",
    texto: [
      fila("ITEM", "DESCRIPCION", "CANTIDAD", "UNIDAD", "VALOR UNITARIO", "VALOR TOTAL"),
      fila("1", "IMPRIMACION ASFALTICA", "4.200,00", "M2", "3.800", "15.960.000"),
      fila("2", "MEZCLA DENSA EN CALIENTE MDC-19", "620,00", "TON", "480.000", "297.600.000"),
      fila("3", "BASE GRANULAR BG-38", "840,00", "M3", "112.000", "94.080.000"),
    ].join("\n"),
    verdad: [
      { d: "IMPRIMACION ASFALTICA", u: "m2", c: 4200 },
      { d: "MEZCLA DENSA EN CALIENTE MDC-19", u: "ton", c: 620 },
      { d: "BASE GRANULAR BG-38", u: "m3", c: 840 },
    ],
  },
];

/* ── Casos ADVERSARIOS ──
   Formas que un pliego real trae y que este parser NO resuelve bien, o resuelve
   a medias. Se miden aparte y SIN suelos de regresión: su función es que el
   límite quede publicado y medido en vez de descubrirse en producción. Un
   benchmark que solo contiene los casos que su autor previó mide la habilidad
   del autor para inventar ejemplos, no la del parser para leer pliegos. */
const CASOS_DIFICILES = [
  {
    nombre: "cabecera REPETIDA al pasar de página",
    objeto: "CONSTRUCCION DE PLACA HUELLA",
    texto: [
      fila("ITEM", "DESCRIPCION", "UNIDAD", "CANTIDAD"),
      fila("1.1", "LOCALIZACION Y REPLANTEO", "M2", "1.250,00"),
      "Pagina 1 de 2",
      fila("ITEM", "DESCRIPCION", "UNIDAD", "CANTIDAD"),
      fila("1.2", "CONCRETO DE 21 MPA PARA HUELLAS", "M3", "180,50"),
    ].join("\n"),
    verdad: [
      { d: "LOCALIZACION Y REPLANTEO", u: "m2", c: 1250 },
      { d: "CONCRETO DE 21 MPA PARA HUELLAS", u: "m3", c: 180.5 },
    ],
  },
  {
    nombre: "numeral con LETRAS (A, B) en vez de dígitos",
    objeto: "CONSTRUCCION DE CUNETAS",
    texto: [
      fila("ITEM", "DESCRIPCION", "UNIDAD", "CANTIDAD"),
      fila("A", "CUNETA EN CONCRETO TRIANGULAR", "ML", "480,00"),
      fila("B", "SOLADO DE LIMPIEZA", "M2", "96,00"),
    ].join("\n"),
    verdad: [
      { d: "CUNETA EN CONCRETO TRIANGULAR", u: "ml", c: 480 },
      { d: "SOLADO DE LIMPIEZA", u: "m2", c: 96 },
    ],
  },
  {
    nombre: "APLANADO con la unidad DENTRO de la descripción",
    objeto: "SUMINISTRO DE AGUA POTABLE",
    texto: [
      "1.1 TANQUE DE ALMACENAMIENTO DE 50 M3 EN CONCRETO UND 2,00 45.000.000 90.000.000",
      "1.2 EXCAVACION MANUAL M3 120,00 28.000 3.360.000",
    ].join("\n"),
    verdad: [
      { d: "TANQUE DE ALMACENAMIENTO DE 50 M3 EN CONCRETO", u: "un", c: 2 },
      { d: "EXCAVACION MANUAL", u: "m3", c: 120 },
    ],
  },
  {
    nombre: "decimal AMBIGUO · «1.234» que significa 1,234 y no 1234",
    objeto: "CONSTRUCCION DE OBRA MENOR",
    texto: [
      fila("ITEM", "DESCRIPCION", "UNIDAD", "CANTIDAD"),
      fila("1", "ACERO DE REFUERZO FIGURADO", "TON", "1.234"),
    ].join("\n"),
    verdad: [{ d: "ACERO DE REFUERZO FIGURADO", u: "ton", c: 1.234 }],
  },
  {
    nombre: "celdas COMBINADAS · la unidad cae en la columna del precio",
    objeto: "CONSTRUCCION DE ANDENES",
    texto: [
      fila("ITEM", "DESCRIPCION", "UNIDAD", "CANTIDAD", "VALOR UNITARIO"),
      fila("1", "ANDEN EN CONCRETO", "", "640,00", "M2"),
    ].join("\n"),
    verdad: [{ d: "ANDEN EN CONCRETO", u: "m2", c: 640 }],
  },
];

/* Se empareja por descripción normalizada: es lo que un humano compararía. */
const clave = (s) => String(s || "").toLowerCase().replace(/\s+/g, " ").trim();

let filasEsperadas = 0, filasDetectadas = 0, emparejadas = 0;
let unidadOk = 0, cantidadOk = 0, falsosPositivos = 0;
let mapeados = 0, firmes = 0, itemsMapeables = 0;
const detalle = [];

for (const caso of CASOS) {
  const r = parsearPliego(caso.texto);
  const m = mapearTabla(r.items, { objeto_proceso: caso.objeto, unspsc: [] });

  const porClave = new Map(r.items.map((i) => [clave(i.descripcion_original), i]));
  const usadas = new Set();
  let cRec = 0, cUni = 0, cCant = 0;

  for (const v of caso.verdad) {
    filasEsperadas++;
    const encontrada = porClave.get(clave(v.d));
    if (!encontrada) continue;
    usadas.add(clave(v.d));
    emparejadas++; cRec++;
    if (encontrada.unidad === v.u) { unidadOk++; cUni++; }
    if (encontrada.cantidad === v.c) { cantidadOk++; cCant++; }
  }
  filasDetectadas += r.items.length;
  const espurias = r.items.filter((i) => !usadas.has(clave(i.descripcion_original))).length;
  falsosPositivos += espurias;

  // el mapeo se mide solo sobre las filas que SÍ se detectaron
  for (const it of m.items) {
    itemsMapeables++;
    if (it.item_id) mapeados++;
    if (it.nivel_mapeo === "firme") firmes++;
  }

  detalle.push({
    nombre: caso.nombre,
    filas: `${cRec}/${caso.verdad.length}`,
    unidad: `${cUni}/${cRec}`,
    cantidad: `${cCant}/${cRec}`,
    espurias,
    semaforo: r.confianza.color,
    vias: Object.keys(r.diagnostico.vias_de_reconocimiento).join("+") || "—",
  });
}

const pct = (a, b) => (b ? `${((a / b) * 100).toFixed(1)} %` : "—");

console.log("\n╔══ TASA DE ACIERTO · parseo de tablas de pliego ═══════════════════════════════╗");
console.log(`║ Corpus: ${CASOS.length} formularios SINTÉTICOS · ${filasEsperadas} filas de obra plantadas`.padEnd(79) + "║");
console.log("╚══════════════════════════════════════════════════════════════════════════════╝\n");

const anchoNombre = Math.max(...detalle.map((d) => d.nombre.length));
console.log(`${"CASO".padEnd(anchoNombre)}  FILAS  UNIDAD  CANT.  ESPUR  SEMÁFORO  VÍA`);
for (const d of detalle) {
  console.log(`${d.nombre.padEnd(anchoNombre)}  ${d.filas.padEnd(5)}  ${d.unidad.padEnd(6)}  `
    + `${d.cantidad.padEnd(5)}  ${String(d.espurias).padEnd(5)}  ${d.semaforo.padEnd(8)}  ${d.vias}`);
}

console.log("\n─── AGREGADO ───");
console.log(`Recall de filas          ${pct(emparejadas, filasEsperadas)}  (${emparejadas} de ${filasEsperadas} plantadas)`);
console.log(`Exactitud de unidad      ${pct(unidadOk, emparejadas)}  (sobre las filas emparejadas)`);
console.log(`Exactitud de cantidad    ${pct(cantidadOk, emparejadas)}  (igualdad exacta, no aproximada)`);
console.log(`Filas espurias           ${falsosPositivos}  (detectadas que no existen en la verdad)`);
console.log(`Mapeo al catálogo        ${pct(mapeados, itemsMapeables)} con código  ·  ${pct(firmes, itemsMapeables)} en firme`);
/* ── Los casos adversarios, medidos y publicados ── */
console.log("\n─── CASOS ADVERSARIOS (sin suelo de regresión: aquí se publica el LÍMITE) ───");
let advEsperadas = 0, advEmparejadas = 0, advUnidad = 0, advCantidad = 0, advEspurias = 0;
const anchoAdv = Math.max(...CASOS_DIFICILES.map((c) => c.nombre.length));
for (const caso of CASOS_DIFICILES) {
  const r = parsearPliego(caso.texto);
  const porClave = new Map(r.items.map((i) => [clave(i.descripcion_original), i]));
  const usadas = new Set();
  let cRec = 0, cUni = 0, cCant = 0;
  for (const v of caso.verdad) {
    advEsperadas++;
    const f = porClave.get(clave(v.d));
    if (!f) continue;
    usadas.add(clave(v.d));
    advEmparejadas++; cRec++;
    if (f.unidad === v.u) { advUnidad++; cUni++; }
    if (f.cantidad === v.c) { advCantidad++; cCant++; }
  }
  const espurias = r.items.filter((i) => !usadas.has(clave(i.descripcion_original))).length;
  advEspurias += espurias;
  const veredicto = cRec === caso.verdad.length && cUni === cRec && cCant === cRec
    ? "resuelto" : (cRec ? "PARCIAL" : "FALLA");
  console.log(`${caso.nombre.padEnd(anchoAdv)}  filas ${cRec}/${caso.verdad.length}  `
    + `uni ${cUni}/${cRec}  cant ${cCant}/${cRec}  espur ${espurias}  → ${veredicto}`);
}
console.log(`\nAdversarios: recall ${pct(advEmparejadas, advEsperadas)} · unidad ${pct(advUnidad, advEmparejadas)} `
  + `· cantidad ${pct(advCantidad, advEmparejadas)} · espurias ${advEspurias}`);

console.log(`\nADVERTENCIA, y no es una fórmula de cortesía: el corpus es SINTÉTICO y lo`);
console.log(`escribió quien escribió el parser, así que la tanda principal mide sobre todo`);
console.log(`la robustez ante las variantes que su autor PREVIÓ. Los casos adversarios están`);
console.log(`para acotar eso. Ninguna de las dos cifras es la cobertura del universo real de`);
console.log(`pliegos de SECOP II, que sigue SIN MEDIR: docs/APU_Y_RENTABILIDAD.md §1.G.7 la`);
console.log(`deja como vacío explícito ("[SUPUESTO], no medidos") y esto no lo cierra.\n`);

/* Suelos de regresión: si el parser empeora por debajo de esto, esto falla. Son
   suelos sobre el corpus sintético, no una promesa sobre pliegos reales. */
assert.ok(emparejadas / filasEsperadas >= 0.90, `recall de filas por debajo del 90 %: ${pct(emparejadas, filasEsperadas)}`);
assert.ok(unidadOk / emparejadas >= 0.98, `exactitud de unidad por debajo del 98 %: ${pct(unidadOk, emparejadas)}`);
assert.ok(cantidadOk / emparejadas >= 0.98, `exactitud de cantidad por debajo del 98 %: ${pct(cantidadOk, emparejadas)}`);
assert.strictEqual(falsosPositivos, 0, `el parser inventó ${falsosPositivos} fila(s) que no existen`);
console.log("✔ suelos de regresión superados\n");
