/* ============================================================================
   tests/capturar_epc_apu.js · los APU de Empresas Públicas de Cundinamarca
   ----------------------------------------------------------------------------
   HERRAMIENTA MANUAL, como los otros `capturar_*.js`: la app nunca la ejecuta.
   Lee los archivos que aportó el dueño en docs/insumos_2026_pendiente/ y produce
   `data/apu_epc_items.json`.

   Dos fuentes que se unen POR NUMERAL (censo y evidencia en docs/INSUMOS_2026.md):
     · `APUsEPC2026_Feb.xlsx` — 440 APU con COMPOSICIÓN completa (equipo,
       material, transporte, mano de obra) de la provincia ALMEIDAS.
     · las 12 cartillas provinciales en PDF — el mismo catálogo de ítems con su
       precio POR MUNICIPIO, que es lo que el Excel no trae.

   Por qué la unión es por numeral y no por texto: el ToUnicode de esas cartillas
   está MAL EN ORIGEN y sustituye letras (`LOCALIZACIÓN` → `LOYALIZAYIÓN`); las
   CIFRAS y los municipios salen correctos. La descripción se toma del Excel, que
   la tiene limpia, y el numeral casa 346/346. Casar por similitud de texto sobre
   descripciones corruptas sería fabricar emparejamientos.

   SOLO SE ACEPTAN LAS CARTILLAS QUE TRAEN EL NUMERAL EN LA FILA, y las demás se
   declaran. Se intentaron las otras dos vías y las dos se descartaron MIDIENDO:
     · Descifrar la sustitución (mapa derivado con Ubaté como piedra de Rosetta,
       200 pares alineados) NO funciona: no es biyectiva —`Y` viene de `C` y
       también de `Y`, `Ó` de `J` y de `Ó`— y hay un tercer alfabeto en las
       fuentes de otra página («UYMÍFIOIÓN» = DEMOLICIÓN). Aplicado a Alto
       Magdalena casa el 33 %: la corrupción PIERDE información.
     · Alinear por ORDEN es peor: las cartillas traen menos ítems que el libro
       (335-388 contra 440) y omiten distintos, así que un desfase de una fila
       asigna el precio de un ítem a otro. Un dato real en la fila EQUIVOCADA es
       peor que un hueco, porque parece dato bueno.
   Lo que se pierde es acotado y está medido: entre provincias los precios de EPC
   difieren ~1-2 % y muchos ítems son idénticos (18.315, 52.304, 130.468 en las
   tres cartillas leídas). El precio que se sirve es el del libro; la
   regionalización es un refinamiento, no la cifra.

   LA ARITMÉTICA NO SE SUPONE, SE MIDE. Cada línea declara si su rendimiento
   multiplica o divide comparando las dos hipótesis contra el VALOR TOTAL que
   imprime el propio archivo; las líneas que no cuadran por ninguna vía se
   cuentan y se declaran en `_meta`, nunca se ajustan a ojo.

   Uso:  node tests/capturar_epc_apu.js [--salida data/apu_epc_items.json]
   ========================================================================== */
"use strict";

const fs = require("fs");
const path = require("path");
const zlib = require("zlib");
const X = require("../public/xlsx_lectura.js");
const PDF = require("./pdf_texto.js");

const DIR = path.join(__dirname, "..", "docs", "insumos_2026_pendiente");
const SALIDA_DEF = path.join(__dirname, "..", "data", "apu_epc_items.json");
const LIBRO = "APUsEPC2026_Feb.xlsx";

/* Las 12 cartillas provinciales. El nombre del archivo NO es el de la provincia
   («CARTILLAUBATE» → UBATÉ), así que la correspondencia va declarada a mano. */
const CARTILLAS = [
  { archivo: "ALTOMAGDALENA.pdf", provincia: "ALTO MAGDALENA" },
  { archivo: "BAJOMAGDALENA.pdf", provincia: "BAJO MAGDALENA" },
  { archivo: "CARTILLAUBATE.pdf", provincia: "UBATÉ" },
  { archivo: "GUALIVA.pdf", provincia: "GUALIVÁ" },
  { archivo: "GUAVIO.pdf", provincia: "GUAVIO" },
  { archivo: "MAGDALENACENTRO.pdf", provincia: "MAGDALENA CENTRO" },
  { archivo: "MEDINA.pdf", provincia: "MEDINA" },
  { archivo: "RIONEGRO.pdf", provincia: "RIONEGRO" },
  { archivo: "SABANACENTRO.pdf", provincia: "SABANA CENTRO" },
  { archivo: "SOACHA.pdf", provincia: "SOACHA" },
  { archivo: "SUMAPAZ.pdf", provincia: "SUMAPAZ" },
  { archivo: "TEQUENDAMA.pdf", provincia: "TEQUENDAMA" },
];

const PROVINCIA_LIBRO = "ALMEIDAS";
const TOLERANCIA_LINEA = 2;   // pesos: el archivo redondea cada línea al peso

const txt = (c) => (c == null ? "" : String(c).trim());
const num = (c) => { const v = Number(c); return Number.isFinite(v) ? v : null; };
const inflar = async (b) => new Uint8Array(zlib.inflateRawSync(Buffer.from(b)));

/* ─────────────────────────── el libro de APU ────────────────────────────── */

const SECCIONES = { I: "equipo", II: "material", III: "transporte", IV: "mano_obra" };

/** Lee una hoja de APU: sus cuatro secciones, sus líneas y sus subtotales. */
function leerHojaApu(filas) {
  const cab = { numeral: null, descripcion: null, unidad: null };
  const lineas = [];
  const subtotales = {};
  let total = null, seccion = null;

  for (const cruda of filas) {
    const f = (cruda || []).map(txt);
    const c1 = f[1] || "";

    /* cabecera: la fila siguiente a «ITEM | DESCRIPCIÓN | UNIDAD» */
    if (/^\d+\.\d+\.\d+$/.test(c1) && !cab.numeral) {
      cab.numeral = c1; cab.descripcion = f[2] || null; cab.unidad = f[12] || null;
      continue;
    }
    const romano = c1.replace(/\.$/, "");
    if (SECCIONES[romano] && /^(EQUIPO|MATERIAL|TRANSPORTE|MANO DE OBRA)/i.test(f[2] || "")) {
      seccion = SECCIONES[romano]; continue;
    }
    if (/^SUBTOTAL$/i.test(c1)) { if (seccion) subtotales[seccion] = num(f[13]); continue; }
    if (/^TOTAL COSTO/i.test(c1)) { total = num(f[13]); continue; }
    if (!seccion || /^DESCRIPCI/i.test(c1) || !c1) continue;

    const valorUnitario = num(f[10]), factor = num(f[12]), valorTotal = num(f[13]);
    if (valorUnitario == null || factor == null) continue;
    lineas.push({
      seccion, codigo: f[0] || null, descripcion: c1, unidad: f[8] || null,
      valor_unitario: valorUnitario, factor, valor_total: valorTotal,
    });
  }
  return { ...cab, lineas, subtotales, total };
}

/** MIDE, línea a línea, si el factor multiplica o divide. */
function clasificarLineas(lineas, cuenta) {
  for (const l of lineas) {
    const porMult = l.valor_unitario * l.factor;
    const porDiv = l.factor ? l.valor_unitario / l.factor : null;
    const cuadraMult = l.valor_total != null && Math.abs(Math.round(porMult) - l.valor_total) <= TOLERANCIA_LINEA;
    const cuadraDiv = porDiv != null && l.valor_total != null && Math.abs(Math.round(porDiv) - l.valor_total) <= TOLERANCIA_LINEA;
    if (cuadraMult && !cuadraDiv) l.operacion = "multiplica";
    else if (cuadraDiv && !cuadraMult) l.operacion = "divide";
    else if (cuadraMult && cuadraDiv) l.operacion = "ambigua";   // factor 1: da igual
    else l.operacion = null;                                      // no cuadra por ninguna vía
    cuenta[l.operacion === null ? "sin_cuadrar" : l.operacion]++;
  }
}

async function leerLibro() {
  const bytes = new Uint8Array(fs.readFileSync(path.join(DIR, LIBRO)));
  const libro = await X.leerLibro(bytes, { inflar });
  const hojas = new Map(libro.hojas.map((h) => [h.nombre, h.filas || []]));

  /* «ACTIVIDADES» da el catálogo: numeral, descripción, unidad, precio y capítulo. */
  const actividades = new Map();
  let capitulo = null, subcapitulo = null;
  for (const cruda of hojas.get("ACTIVIDADES") || []) {
    const f = (cruda || []).map(txt);
    const cod = f[4], desc = f[5];
    if (!cod || !desc) continue;
    if (/^\d+$/.test(cod)) { capitulo = desc; subcapitulo = null; continue; }
    if (/^\d+\.\d+$/.test(cod)) { subcapitulo = desc; continue; }
    if (/^\d+\.\d+\.\d+$/.test(cod)) {
      actividades.set(cod, { descripcion: desc, unidad: f[6] || null, precio: num(f[7]), capitulo, subcapitulo });
    }
  }

  const cuenta = { multiplica: 0, divide: 0, ambigua: 0, sin_cuadrar: 0 };
  const apus = new Map();
  const numeralDiscrepante = [];
  let cuadran = 0, noCuadran = 0, totalDiscrepante = 0;

  for (const [nombre, filas] of hojas) {
    if (!/^\d+\.\d+\.\d+$/.test(nombre)) continue;
    const apu = leerHojaApu(filas);
    if (!apu.lineas.length) continue;

    /* LA IDENTIDAD DE LA HOJA ES SU NOMBRE, no el numeral que trae dentro.
       Medido: la hoja «7.15.13» declara internamente «7.15.3» —copiaron la hoja
       y no actualizaron la celda— y son dos ítems distintos con la misma
       descripción. Indexando por el numeral interno, la composición de una pisa
       la de la otra en silencio y el ítem sale con un precio que no es el suyo
       (aquí, $5,5 M contra $3,9 M). El nombre de hoja es el correcto y lo
       confirma el control de abajo: su TOTAL COSTO es el precio que
       «ACTIVIDADES» da para 7.15.13. */
    if (apu.numeral && apu.numeral !== nombre) {
      numeralDiscrepante.push({ hoja: nombre, declara: apu.numeral });
    }
    apu.numeral = nombre;

    clasificarLineas(apu.lineas, cuenta);
    /* control 1: ¿la suma de subtotales reproduce el TOTAL COSTO del archivo? */
    const suma = Object.values(apu.subtotales).reduce((a, b) => a + (b || 0), 0);
    apu.cuadra = apu.total != null && Math.abs(suma - apu.total) <= TOLERANCIA_LINEA;
    apu.cuadra ? cuadran++ : noCuadran++;
    /* control 2 (el que caza el cruce de hojas): ¿el total del APU es el precio
       que el catálogo publica para ESE numeral? */
    const act = actividades.get(nombre);
    apu.coincide_con_actividades = act && act.precio != null && apu.total != null
      ? Math.abs(act.precio - apu.total) <= TOLERANCIA_LINEA
      : null;
    if (apu.coincide_con_actividades === false) totalDiscrepante++;
    apus.set(nombre, apu);
  }
  return { actividades, apus, cuenta, cuadran, noCuadran, numeralDiscrepante, totalDiscrepante };
}

/* ──────────────────── las cartillas provinciales (PDF) ──────────────────── */

/* Las cartillas escriben el peso a la ANGLOSAJONA («12,225.00»): la coma separa
   miles y el punto es decimal — al revés que `numeroColombiano`, que lee texto
   de pliegos. Confundirlos multiplicaría o dividiría por mil. */
const numeroPesos = (t) => {
  const s = String(t).replace(/[$\s]/g, "").replace(/,/g, "");
  if (/^\d+\.\d{1,2}$/.test(s)) return Math.round(Number(s));
  return /^\d+$/.test(s) ? Number(s) : null;
};

const preciosDeLinea = (resto) =>
  (resto.match(/\$\s*[\d.,]+|[\d.,]+\s*\$/g) || [])
    .map((s) => numeroPesos(s.replace("$", "")))
    .filter((n) => n != null && n > 0);

/** Precio por municipio de una cartilla, indexado por numeral.
    Devuelve `numerada:false` cuando sus filas no traen numeral: esa cartilla no
    se usa (ver cabecera), pero se cuenta para poder declararlo. */
function leerCartilla(archivo) {
  const pgs = PDF.paginasDeTexto(fs.readFileSync(path.join(DIR, archivo)));
  const porNumeral = new Map();
  let cabeceraMunicipios = null, filasDeItem = 0, filasConNumeral = 0;

  for (const p of pgs) {
    for (let i = 0; i < p.lineas.length; i++) {
      const t = p.lineas[i].trim();
      if (!t) continue;
      /* La cabecera de municipios es la fila que empieza por DESCRIPCIÓN…UNIDAD,
         o la anterior a la de VR.TOTAL. Los nombres salen legibles, pero pueden
         venir pegados o partidos: se guarda cruda y el CONTEO real de municipios
         se toma de cuántos precios trae cada fila, que es un dato duro. */
      if (!cabeceraMunicipios && /^DESCRIPCI[ÓO]N\s+UNIDAD/i.test(t)) {
        cabeceraMunicipios = t.replace(/^DESCRIPCI[ÓO]N\s+UNIDAD\s*/i, "").trim();
      } else if (!cabeceraMunicipios && /VR\.?\s*TOTAL/i.test(t) && i > 0) {
        cabeceraMunicipios = p.lineas[i - 1].trim();
      }
      const conNumeral = /^(\d+\.\d+\.\d+)\s+(.*?)\t(.*)$/.exec(t);
      if (conNumeral) {
        filasDeItem++; filasConNumeral++;
        const precios = preciosDeLinea(conNumeral[3]);
        if (precios.length) porNumeral.set(conNumeral[1], precios);
        continue;
      }
      /* fila de ítem SIN numeral: «descripción \t UNIDAD \t $ … $ …» */
      if (/^(.*?)\t([A-Za-z0-9²³/%.]{1,6})\t/.test(t) && preciosDeLinea(t).length) filasDeItem++;
    }
  }
  const municipiosPorFila = [...porNumeral.values()].map((p) => p.length).sort((a, b) => a - b);
  return {
    porNumeral, cabeceraMunicipios, filasDeItem, filasConNumeral,
    numerada: filasDeItem > 0 && filasConNumeral / filasDeItem > 0.5,
    municipios: municipiosPorFila.length ? municipiosPorFila[municipiosPorFila.length >> 1] : 0,
  };
}

/* ──────────────────────────────── main ──────────────────────────────────── */

(async () => {
  const args = process.argv.slice(2);
  const salida = args.includes("--salida") ? args[args.indexOf("--salida") + 1] : SALIDA_DEF;

  console.log("Leyendo el libro de APU de EPC…");
  const { actividades, apus, cuenta, cuadran, noCuadran, numeralDiscrepante, totalDiscrepante } = await leerLibro();
  console.log(`  · actividades: ${actividades.size} · APU con composición: ${apus.size}`);
  console.log(`  · APU cuyo TOTAL COSTO reproduce la suma de subtotales: ${cuadran} (no cuadran ${noCuadran})`);
  console.log(`  · APU cuyo total NO es el precio que «ACTIVIDADES» da para su numeral: ${totalDiscrepante}`);
  console.log(`  · hojas cuyo numeral interno ≠ nombre de hoja: ${numeralDiscrepante.length}` +
    (numeralDiscrepante.length ? ` (${numeralDiscrepante.map((d) => `${d.hoja}→declara ${d.declara}`).join(", ")}) · manda el NOMBRE` : ""));
  console.log(`  · líneas: multiplica ${cuenta.multiplica} · divide ${cuenta.divide} · indiferente ${cuenta.ambigua} · SIN CUADRAR ${cuenta.sin_cuadrar}`);

  console.log("Leyendo las cartillas provinciales…");
  const provincias = [];
  const descartadas = [];
  const preciosPorNumeral = new Map();   // numeral -> { provincia -> [precios por municipio] }
  let casados = 0, huerfanos = 0;

  for (const c of CARTILLAS) {
    let r;
    try { r = leerCartilla(c.archivo); }
    catch (e) { console.log(`  ! ${c.archivo}: ${e.message}`); continue; }
    if (!r.numerada) {
      descartadas.push({
        provincia: c.provincia, archivo: c.archivo, filas_de_item: r.filasDeItem,
        motivo: "sus filas no traen el numeral y su texto está corrupto en origen: casarlas exigiría alinear por orden, y las cartillas omiten ítems distintos del libro",
      });
      console.log(`  · ${c.provincia.padEnd(18)}    — sin numeral en las filas (${r.filasDeItem} filas de ítem): DESCARTADA`);
      continue;
    }
    const conApu = [...r.porNumeral.keys()].filter((n) => actividades.has(n)).length;
    casados += conApu;
    huerfanos += r.porNumeral.size - conApu;
    provincias.push({
      provincia: c.provincia, archivo: c.archivo, items: r.porNumeral.size,
      municipios: r.municipios, municipios_cabecera: r.cabeceraMunicipios || null,
    });
    for (const [numeral, precios] of r.porNumeral) {
      if (!preciosPorNumeral.has(numeral)) preciosPorNumeral.set(numeral, {});
      preciosPorNumeral.get(numeral)[c.provincia] = precios;
    }
    console.log(`  · ${c.provincia.padEnd(18)} ${String(r.porNumeral.size).padStart(4)} ítems · ${conApu} casan con el libro · ${r.municipios} municipios`);
  }
  console.log(`  · casan con el libro: ${casados} · sin correspondencia: ${huerfanos} · cartillas descartadas: ${descartadas.length}`);

  /* ── ensamblado ── */
  const items = [];
  for (const [numeral, act] of actividades) {
    const apu = apus.get(numeral) || null;
    const porProvincia = preciosPorNumeral.get(numeral) || {};
    const precios = { [PROVINCIA_LIBRO]: act.precio };
    for (const [prov, lista] of Object.entries(porProvincia)) {
      /* Un ítem tiene un precio por municipio; se guarda la MEDIANA de la
         provincia y el rango, no un municipio elegido a dedo. */
      const orden = lista.slice().sort((a, b) => a - b);
      const m = orden.length >> 1;
      precios[prov] = orden.length % 2 ? orden[m] : Math.round((orden[m - 1] + orden[m]) / 2);
    }
    items.push({
      numeral, descripcion: act.descripcion, unidad: act.unidad,
      capitulo: act.capitulo, subcapitulo: act.subcapitulo,
      precio_referencia: act.precio,
      precios_por_provincia: precios,
      composicion: apu ? {
        cuadra: apu.cuadra, coincide_con_actividades: apu.coincide_con_actividades,
        total: apu.total, subtotales: apu.subtotales,
        lineas: apu.lineas.map((l) => ({
          seccion: l.seccion, codigo: l.codigo, descripcion: l.descripcion, unidad: l.unidad,
          valor_unitario: l.valor_unitario, factor: l.factor, operacion: l.operacion, valor_total: l.valor_total,
        })),
      } : null,
    });
  }

  const conComposicion = items.filter((i) => i.composicion).length;
  const conRegional = items.filter((i) => Object.keys(i.precios_por_provincia).length > 1).length;

  const doc = {
    _meta: {
      que_es: "APU de referencia de Empresas Públicas de Cundinamarca (EPC): actividades de acueducto, alcantarillado y obra civil asociada, con su composición completa (equipo, material, transporte, mano de obra) y su precio por provincia. Es una REFERENCIA OFICIAL, no una cotización.",
      fuente: "Empresas Públicas de Cundinamarca S.A. E.S.P. · Listas de precios de referencia EPC",
      vigencia: "2026-02",
      archivos: [LIBRO, ...CARTILLAS.map((c) => c.archivo)],
      capturado_el: new Date().toISOString().slice(0, 10),
      generado_por: "tests/capturar_epc_apu.js (herramienta manual; la app nunca lee estos archivos)",
      provincia_del_libro: PROVINCIA_LIBRO,
      provincia_de_la_composicion: PROVINCIA_LIBRO,
      items: items.length,
      items_con_composicion: conComposicion,
      items_con_precio_regional: conRegional,
      provincias: provincias.length,
      municipios: provincias.reduce((a, p) => a + (p.municipios || 0), 0),
      cartillas_descartadas: descartadas,
      aritmetica_medida: cuenta,
      apus_que_cuadran: cuadran,
      apus_que_no_cuadran: noCuadran,
      apus_con_total_distinto_del_catalogo: totalDiscrepante,
      hojas_con_numeral_interno_erroneo: numeralDiscrepante,
      union_por_numeral: { casados, sin_correspondencia: huerfanos },
      advertencias: [
        "La COMPOSICIÓN es la de la provincia del libro (ALMEIDAS): EPC mantiene cantidades y rendimientos, y regionaliza el precio. Un presupuesto de otra provincia usa su propio precio y esta composición para el desglose, igual que el banco del INVIAS.",
        "Las descripciones salen del Excel: el texto de las cartillas en PDF tiene el ToUnicode dañado en origen y sustituye letras. Las cifras y los municipios de esas cartillas sí son correctos.",
        "Precio de REFERENCIA, no cotización: el precio propio, el del archivo importado o el tecleado mandan sobre este.",
        "Los documentos de EPC no declaran licencia de uso comercial: verificar antes de comercializar.",
      ],
    },
    provincias,
    items,
  };

  fs.writeFileSync(salida, JSON.stringify(doc, null, 1));
  const kb = (fs.statSync(salida).size / 1024).toFixed(0);
  console.log(`\nEscrito ${salida} · ${kb} KB · ${items.length} ítems (${conComposicion} con composición, ${conRegional} con precio regional)`);
})().catch((e) => { console.error(e); process.exit(1); });
