/* ============================================================================
   tests/capturar_ffie_apu.js · el precio TOPE de edificación del FFIE
   ----------------------------------------------------------------------------
   HERRAMIENTA MANUAL, como los otros `capturar_*.js`: la app nunca la ejecuta.
   Lee `docs/insumos_2026_pendiente/Listado_Precios_Tope_Dpto_Vigencia_2026.xlsx`
   y produce `data/apu_ffie_items.json`.

   Es el ÚNICO banco del repositorio con cobertura de los 33 departamentos —
   incluidos los 8 que no tienen captura retail y los 19 sin factor regional en
   el catálogo—, y su materia es EDIFICACIÓN (preliminares, demoliciones,
   cimientos, estructuras, mampostería, cubiertas, acabados), que hasta ahora
   solo cubrían los 157 ítems del contrato Nogal.

   ⚠️ ES UN PRECIO TOPE, NO UN PRECIO DE MERCADO, y de eso depende cómo se lee.
   El FFIE (Fondo de Financiamiento de la Infraestructura Educativa) publica el
   techo que reconoce en sus proyectos. Medido contra el contrato adjudicado del
   dueño: el pañete del Nogal cuesta $40 150 y el tope FFIE de Bogotá es
   $30 607 — el contrato real está POR ENCIMA del tope. Leerlo como cotización
   sería el mismo error de categoría que tomar el retail por precio de ítem, así
   que viaja con nivel propio y declarado.

   SIN COMPOSICIÓN: el listado publica el valor, no el APU. El ítem sale como
   precio sin desglose, igual que los del IDU; no se inventan componentes.

   Uso:  node tests/capturar_ffie_apu.js [--salida data/apu_ffie_items.json]
   ========================================================================== */
"use strict";

const fs = require("fs");
const path = require("path");
const zlib = require("zlib");
const X = require("../public/xlsx_lectura.js");

const DIR = path.join(__dirname, "..", "docs", "insumos_2026_pendiente");
const ARCHIVO = "Listado_Precios_Tope_Dpto_Vigencia_2026.xlsx";
const SALIDA_DEF = path.join(__dirname, "..", "data", "apu_ffie_items.json");

const txt = (c) => (c == null ? "" : String(c).trim());
const inflar = async (b) => new Uint8Array(zlib.inflateRawSync(Buffer.from(b)));

/* El FFIE escribe varios departamentos PEGADOS y sin tilde («VALLEDELCAUCA»,
   «NORTEDESANTANDER», «ARCHIPIELAGODESANANDRES»), que `Filtros.departamento` no
   reconoce. La correspondencia va DECLARADA A MANO —igual que las provincias en
   `capturar_invias.js`— y no se deja a una heurística: adivinar aquí devuelve el
   precio de OTRO departamento, que es la peor forma de equivocarse. El
   capturador ABORTA si algún literal del archivo no está en esta tabla. */
const DANE_POR_LITERAL = Object.freeze({
  ANTIOQUIA: "05", BOLÍVAR: "13", BOYACÁ: "15", CALDAS: "17", CAUCA: "19",
  CHOCO: "27", CÓRDOBA: "23", CUNDINAMARCA: "25", GUAINÍA: "94", HUILA: "41",
  NARIÑO: "52", QUINDÍO: "63", RISARALDA: "66", ARCHIPIELAGODESANANDRES: "88",
  SANTANDER: "68", TOLIMA: "73", VALLEDELCAUCA: "76", AMAZONAS: "91",
  ARAUCA: "81", ATLÁNTICO: "08", BOGOTÁ: "11", CAQUETÁ: "18", CASANARE: "85",
  CESAR: "20", GUAVIARE: "95", LAGUAJIRA: "44", MAGDALENA: "47", META: "50",
  NORTEDESANTANDER: "54", PUTUMAYO: "86", SUCRE: "70", VAUPÉS: "97", VICHADA: "99",
});

/* La columna del departamento es la del rótulo de la fila de cabecera; el
   «GRUPO No. N» de la fila de arriba es la nomenclatura interna del FFIE y se
   conserva aparte, porque es con la que el propio pliego los nombra. */
function leerCabecera(grid) {
  let filaGrupos = -1, filaCab = -1;
  for (let i = 0; i < Math.min(30, grid.length); i++) {
    const f = (grid[i] || []).map(txt);
    if (f.some((c) => /^GRUPO\s*No/i.test(c))) filaGrupos = i;
    if (f.includes("DESCRIPCIÓN") && f.includes("ITEM")) { filaCab = i; break; }
  }
  if (filaCab < 0) throw new Error("No se encontró la fila de cabecera (ITEM / DESCRIPCIÓN).");
  const cab = (grid[filaCab] || []).map(txt);
  const grupos = filaGrupos >= 0 ? (grid[filaGrupos] || []).map(txt) : [];
  const cols = {
    item: cab.indexOf("ITEM"),
    descripcion: cab.indexOf("DESCRIPCIÓN"),
    unidad: cab.findIndex((c) => /^UN\.?$/i.test(c)),
  };
  const departamentos = [];
  for (let c = Math.max(cols.item, cols.descripcion, cols.unidad) + 1; c < cab.length; c++) {
    if (!cab[c]) continue;
    departamentos.push({ nombre: cab[c], columna: c, grupo: grupos[c] || null });
  }
  return { filaCab, cols, departamentos };
}

(async () => {
  const args = process.argv.slice(2);
  const salida = args.includes("--salida") ? args[args.indexOf("--salida") + 1] : SALIDA_DEF;

  const bytes = new Uint8Array(fs.readFileSync(path.join(DIR, ARCHIVO)));
  const libro = await X.leerLibro(bytes, { inflar });
  const hoja = libro.hojas[0];
  const grid = hoja.filas || [];
  const { filaCab, cols, departamentos } = leerCabecera(grid);
  console.log(`hoja «${hoja.nombre}» · ${grid.length} filas · ${departamentos.length} departamentos`);

  /* Todo literal del archivo tiene que estar en la tabla declarada: si el FFIE
     renombra una columna en la vigencia siguiente, el capturador ABORTA en vez
     de dejar un departamento sin código —que en el módulo se traduciría en
     servir la mediana nacional, o peor, el precio del vecino—. */
  const sinDane = departamentos.filter((d) => !DANE_POR_LITERAL[d.nombre]);
  if (sinDane.length) {
    throw new Error(`Departamentos del FFIE sin código DANE declarado: ${sinDane.map((d) => d.nombre).join(", ")}. Añádalos a DANE_POR_LITERAL.`);
  }

  const items = [];
  let capitulo = null, subcapitulo = null;
  let sinPrecio = 0, filasIgnoradas = 0;

  for (let i = filaCab + 1; i < grid.length; i++) {
    const f = (grid[i] || []).map(txt);
    const numeral = f[cols.item], descripcion = f[cols.descripcion], unidad = f[cols.unidad];
    if (!numeral || !descripcion) { filasIgnoradas++; continue; }

    /* Jerarquía por el numeral: «1» capítulo, «1.1» subcapítulo, «1.1.1» ítem.
       Los numerales del FFIE traen sufijos («1.1.4N»), así que se cuenta por
       PUNTOS y no por una forma exacta. */
    const niveles = numeral.split(".").length;
    if (niveles === 1) { capitulo = descripcion; subcapitulo = null; continue; }
    if (niveles === 2) { subcapitulo = descripcion; continue; }

    const precios = {};
    for (const d of departamentos) {
      const v = Number(f[d.columna]);
      if (Number.isFinite(v) && v > 0) precios[d.nombre] = Math.round(v);
    }
    /* Un ítem sin ningún precio NO entra con ceros: un 0 no es un precio, es
       «no sé», y sumaría al presupuesto haciéndose creíble. */
    if (!Object.keys(precios).length) { sinPrecio++; continue; }
    items.push({ numeral, descripcion, unidad: unidad || null, capitulo, subcapitulo, precios });
  }

  const cobertura = departamentos.map((d) => ({
    departamento: d.nombre, grupo: d.grupo, codigo_dane: DANE_POR_LITERAL[d.nombre],
    items_con_precio: items.filter((it) => it.precios[d.nombre] > 0).length,
  }));
  const completos = cobertura.filter((c) => c.items_con_precio === items.length).length;

  const doc = {
    _meta: {
      que_es: "Precio TOPE de referencia del FFIE para ítems de edificación, por departamento. Es el techo que el Fondo de Financiamiento de la Infraestructura Educativa reconoce en sus proyectos: NO es un precio de mercado ni una cotización.",
      fuente: "FFIE · Listado de precios tope por departamento, vigencia 2026",
      archivo: ARCHIVO,
      vigencia: "2026",
      capturado_el: new Date().toISOString().slice(0, 10),
      generado_por: "tests/capturar_ffie_apu.js (herramienta manual; la app nunca lee este archivo)",
      items: items.length,
      departamentos: departamentos.length,
      departamentos_con_todos_los_precios: completos,
      items_sin_ningun_precio: sinPrecio,
      sin_composicion: true,
      advertencias: [
        "PRECIO TOPE, no de mercado: el contrato adjudicado del propio dueño está POR ENCIMA (pañete Nogal $40.150 contra el tope de Bogotá $30.607). Sirve como referencia y como techo, no como cotización.",
        "Sin composición: el listado publica el valor del ítem, no su APU. No se inventan componentes.",
        "El precio ya es el del departamento: no se le aplica ningún factor regional del catálogo.",
        "El FFIE no declara licencia de uso comercial: verificar antes de comercializar.",
      ],
    },
    departamentos: cobertura,
    items,
  };

  fs.writeFileSync(salida, JSON.stringify(doc, null, 1));
  const kb = (fs.statSync(salida).size / 1024).toFixed(0);
  console.log(`ítems: ${items.length} · sin ningún precio: ${sinPrecio} · filas ignoradas: ${filasIgnoradas}`);
  console.log(`departamentos con precio en TODOS los ítems: ${completos}/${departamentos.length}`);
  console.log(`Escrito ${salida} · ${kb} KB`);
})().catch((e) => { console.error(e); process.exit(1); });
