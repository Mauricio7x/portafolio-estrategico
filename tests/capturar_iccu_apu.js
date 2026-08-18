/* ============================================================================
   tests/capturar_iccu_apu.js · la lista de precios del ICCU (Cundinamarca)
   ----------------------------------------------------------------------------
   HERRAMIENTA MANUAL, como los otros `capturar_*.js`: la app nunca la ejecuta.
   Lee `docs/insumos_2026_pendiente/LISTA_DE_PRECIOS_ICCU_2026.pdf` (371 páginas
   con texto, extraídas con `tests/pdf_texto.js`) y produce
   `data/apu_iccu_items.json`.

   Es la fuente MÁS GRANULAR del repositorio: la Gobernación de Cundinamarca
   publica el precio POR MUNICIPIO (58 municipios en 15 provincias), donde el
   INVIAS llega a provincia y el IDU solo cubre Bogotá. Cubre construcción,
   urbanismo y vías: los capítulos de edificación completos (mampostería,
   pañetes, cubiertas, carpintería, pisos, cielo raso, pinturas) más acueducto,
   alcantarillado, andenes y sardineles.

   LAS DESCRIPCIONES VIENEN PARTIDAS EN DOS RENGLONES, y ese es el trabajo real
   de este capturador: el PDF corta el texto largo y deja la fila del ítem con
   numeral, unidad y precios pero SIN descripción, que quedó en la línea de
   arriba (y a veces sigue en la de abajo). Se recompone mirando las líneas
   vecinas que no son ni ítem ni capítulo. Lo que aun así queda sin descripción
   NO se inventa: se cuenta y se declara.

   EL NUMERAL NO IDENTIFICA UN ÍTEM: LA NUMERACIÓN REINICIA EN CADA CAPÍTULO.
   «1,9» es DEMOLICIÓN ESCALERAS EN CONCRETO en el capítulo PRELIMINARES y
   COLLAR DE DERIVACIÓN PVC en el de acueducto. Uniendo las provincias por
   numeral a secas se fusionan ítems distintos y cada uno acaba con el precio
   del otro — es el defecto de «dos capítulos con el mismo numeral» que el
   lector de pliegos ya documenta. La clave es CAPÍTULO + NUMERAL, y el
   capturador MIDE cuántas descripciones siguen discrepando con esa clave.

   El precio de la provincia es la MEDIANA de sus municipios, y los precios por
   municipio viajan enteros: son el dato más fino que tiene el proyecto y quien
   conozca el municipio de la obra puede usarlo.

   Uso:  node tests/capturar_iccu_apu.js [--salida data/apu_iccu_items.json]
   ========================================================================== */
"use strict";

const fs = require("fs");
const path = require("path");
const PDF = require("./pdf_texto.js");

const DIR = path.join(__dirname, "..", "docs", "insumos_2026_pendiente");
const ARCHIVO = "LISTA_DE_PRECIOS_ICCU_2026.pdf";
const SALIDA_DEF = path.join(__dirname, "..", "data", "apu_iccu_items.json");

/* Numeral del ICCU: «1,1», «2,10» — con COMA, no con punto. */
const RE_ITEM = /^(\d+,\d+)$/;
const RE_CAPITULO = /^(\d+)$/;
const RE_UNIDAD = /^(UN|ML|M2|M3|M|KG|GL|HR|DIA|LT|PAR|JGO|VJE|TON|CM|PZA|BTO|SC)$/i;

const limpio = (s) => String(s == null ? "" : s).trim();

/* El punto separa MILES en este documento («3.185.801»). Es la regla
   colombiana, al revés que en las cartillas de EPC: aplicar la otra dividiría
   la obra por mil. */
const pesos = (t) => {
  const s = limpio(t).replace(/\./g, "");
  return /^\d+$/.test(s) && s.length <= 12 ? Number(s) : null;
};

/** Lee una página: devuelve provincia, municipios y filas reconocidas. */
function leerPagina(lineas, capituloInicial = null) {
  let provincia = null, municipios = null, capitulo = capituloInicial;
  const filas = [];
  const crudas = lineas.map((l) => l.replace(/\s+$/, "")).filter((l) => l.trim());

  for (let i = 0; i < crudas.length; i++) {
    const t = crudas[i].trim();
    const mProv = /^PROVINCIA:\s*(.+)$/i.exec(t);
    if (mProv) { provincia = mProv[1].trim(); continue; }
    if (/^ÍTEM\t/.test(crudas[i])) {
      municipios = crudas[i].split("\t").map(limpio).slice(3).filter(Boolean);
      continue;
    }
    const cols = crudas[i].split("\t").map(limpio);
    /* «N  NOMBRE» abre capítulo: es lo que hace único al numeral de sus hijas. */
    if (RE_CAPITULO.test(cols[0] || "") && cols[1]) { capitulo = cols[1]; continue; }
    const mCap = /^(\d+)\s+([A-ZÁÉÍÓÚÑ][^\t]{3,})$/.exec(t);
    if (mCap) { capitulo = mCap[2].trim(); continue; }
    if (!RE_ITEM.test(cols[0] || "")) continue;

    /* La fila del ítem puede venir de dos formas:
         numeral | descripción | unidad | precios…
         numeral | unidad | precios…            ← la descripción quedó arriba */
    let descripcion = null, unidad = null, resto = null;
    if (RE_UNIDAD.test(cols[1] || "")) { unidad = cols[1]; resto = cols.slice(2).join(" "); }
    else { descripcion = cols[1] || null; unidad = cols[2] || null; resto = cols.slice(3).join(" "); }

    const valores = resto.split(/\s+/).map(pesos).filter((n) => n != null && n > 0);
    if (!valores.length) continue;
    filas.push({ numeral: cols[0], capitulo, descripcion, unidad, precios: valores, linea: i });
  }
  return { provincia, municipios, filas, crudas, capitulo };
}

/* Recompone la descripción de una fila que no la traía: son las líneas vecinas
   que no son ítem, ni capítulo, ni cabecera. Se mira ARRIBA y luego ABAJO
   («PILOTE PRE EXCAVADO … (INCLUYE RETIRO DE SOBRANTES A UNA» / fila / «…
   DISTANCIA MENOR DE 5 KM), INC. BOMBA»). */
function esTextoSuelto(linea) {
  const t = limpio(linea);
  if (!t || t.includes("\t")) return false;
  if (RE_CAPITULO.test(t) || RE_ITEM.test(t)) return false;
  if (/^(PROVINCIA:|ÍTEM|GOBERNACIÓN|LISTA DE PRECIOS|ESTOS PRECIOS|CONSTRUCCIÓN$|URBANISMO$|VÍAS$)/i.test(t)) return false;
  return /[A-ZÁÉÍÓÚÑ]{3}/.test(t);
}

function recomponer(fila, crudas) {
  const partes = [];
  const arriba = crudas[fila.linea - 1];
  if (esTextoSuelto(arriba)) partes.push(limpio(arriba));
  const abajo = crudas[fila.linea + 1];
  if (esTextoSuelto(abajo)) partes.push(limpio(abajo));
  return partes.length ? partes.join(" ") : null;
}

(async () => {
  const args = process.argv.slice(2);
  const salida = args.includes("--salida") ? args[args.indexOf("--salida") + 1] : SALIDA_DEF;

  const paginas = PDF.paginasDeTexto(fs.readFileSync(path.join(DIR, ARCHIVO)));
  console.log(`${ARCHIVO}: ${paginas.length} páginas con texto`);

  /* provincia -> { municipios, items: Map(numeral -> {descripcion, unidad, precios[]}) } */
  const provincias = new Map();
  let filasLeidas = 0, sinDescripcion = 0, recompuestas = 0, descartadas = 0;

  let capituloArrastrado = null;
  for (const p of paginas) {
    const { provincia, municipios, filas, crudas, capitulo } = leerPagina(p.lineas, capituloArrastrado);
    capituloArrastrado = capitulo || capituloArrastrado;
    if (!provincia) continue;
    if (!provincias.has(provincia)) provincias.set(provincia, { municipios: [], items: new Map() });
    const reg = provincias.get(provincia);
    if (municipios && municipios.length > reg.municipios.length) reg.municipios = municipios;

    for (const f of filas) {
      filasLeidas++;
      let desc = f.descripcion;
      if (!desc) { desc = recomponer(f, crudas); if (desc) recompuestas++; }
      if (!desc) { sinDescripcion++; }
      const clave = `${f.capitulo || "?"}|${f.numeral}`;
      const previo = reg.items.get(clave);
      /* Un numeral repetido dentro del mismo capítulo y provincia se queda con
         la PRIMERA lectura que traiga descripción: reemplazarla a ciegas
         dejaría el ítem con el texto de otra página. */
      if (previo && previo.descripcion) continue;
      reg.items.set(clave, { numeral: f.numeral, capitulo: f.capitulo, descripcion: desc, unidad: f.unidad, precios: f.precios });
    }
  }

  /* ── ensamblado: un ítem por numeral, con su precio por provincia ── */
  const porNumeral = new Map();
  const discrepan = new Set();
  for (const [provincia, reg] of provincias) {
    for (const [clave, it] of reg.items) {
      if (!porNumeral.has(clave)) porNumeral.set(clave, { clave, numeral: it.numeral, capitulo: it.capitulo, descripcion: null, unidad: null, precios_por_provincia: {} });
      const item = porNumeral.get(clave);
      /* control: con la clave correcta, la descripción del mismo ítem tiene que
         ser la misma en todas las provincias (salvo truncamientos del PDF). */
      if (item.descripcion && it.descripcion) {
        const a = item.descripcion.toUpperCase(), b = it.descripcion.toUpperCase();
        if (!a.startsWith(b.slice(0, 20)) && !b.startsWith(a.slice(0, 20))) discrepan.add(clave);
      }
      if (!item.descripcion && it.descripcion) item.descripcion = it.descripcion;
      if (!item.unidad && it.unidad) item.unidad = it.unidad;
      const orden = it.precios.slice().sort((a, b) => a - b);
      const m = orden.length >> 1;
      item.precios_por_provincia[provincia] = {
        mediana: orden.length % 2 ? orden[m] : Math.round((orden[m - 1] + orden[m]) / 2),
        municipios: it.precios.length,
        min: orden[0], max: orden[orden.length - 1],
        por_municipio: it.precios,
      };
    }
  }

  /* Un ítem sin descripción NO entra: su numeral no dice nada por sí solo y
     mapearlo sería imposible. Tampoco entra uno cuya descripción DISCREPA entre
     provincias con la clave capítulo+numeral: ahí no se sabe cuál de los dos
     ítems es, y publicar uno con el precio del otro es justo el defecto que
     este capturador existe para evitar. Los dos casos se cuentan. */
  const items = [];
  let porDiscrepancia = 0;
  for (const it of porNumeral.values()) {
    if (!it.descripcion) { descartadas++; continue; }
    if (discrepan.has(it.clave)) { porDiscrepancia++; continue; }
    items.push(it);
  }

  const detalleProvincias = [...provincias].map(([nombre, r]) => ({
    provincia: nombre, municipios: r.municipios, items: r.items.size,
  }));

  const doc = {
    _meta: {
      que_es: "Lista de precios de construcción, urbanismo y vías del ICCU (Gobernación de Cundinamarca), vigencia 2026, con precio POR MUNICIPIO. Es una referencia oficial, no una cotización.",
      fuente: "Gobernación de Cundinamarca · ICCU · Lista de precios construcción, urbanismo y vías (2026)",
      archivo: ARCHIVO,
      vigencia: "2026",
      capturado_el: new Date().toISOString().slice(0, 10),
      generado_por: "tests/capturar_iccu_apu.js (herramienta manual; la app nunca lee este PDF)",
      nota_fuente: "La cabecera del documento declara que «estos precios contemplan suministro, instalación y transporte».",
      items: items.length,
      provincias: detalleProvincias.length,
      municipios: detalleProvincias.reduce((a, p) => a + p.municipios.length, 0),
      filas_leidas: filasLeidas,
      descripciones_recompuestas: recompuestas,
      filas_sin_descripcion: sinDescripcion,
      items_descartados_sin_descripcion: descartadas,
      items_descartados_por_descripcion_discrepante: porDiscrepancia,
      sin_composicion: true,
      advertencias: [
        "El precio de una provincia es la MEDIANA de sus municipios; los precios por municipio viajan enteros para quien conozca el municipio de la obra.",
        "Sin composición: la lista publica el valor del ítem, no su APU. No se inventan componentes.",
        "Es de Cundinamarca: fuera del departamento el precio viaja igual y se declara.",
        "El ICCU no declara licencia de uso comercial: verificar antes de comercializar.",
      ],
    },
    provincias: detalleProvincias,
    items,
  };

  fs.writeFileSync(salida, JSON.stringify(doc, null, 1));
  const kb = (fs.statSync(salida).size / 1024).toFixed(0);
  console.log(`provincias: ${detalleProvincias.length} · municipios: ${doc._meta.municipios}`);
  console.log(`filas leídas: ${filasLeidas} · descripciones recompuestas: ${recompuestas} · sin descripción: ${sinDescripcion}`);
  console.log(`ítems: ${items.length} · descartados por no tener descripción: ${descartadas}`);
  console.log(`descartados por descripción discrepante entre provincias: ${porDiscrepancia}`);
  console.log(`Escrito ${salida} · ${kb} KB`);
})().catch((e) => { console.error(e); process.exit(1); });
