/* ============================================================================
   tests/generar_electrico_nogal · Genera tests/electrico_nogal_apu.xlsx
   ----------------------------------------------------------------------------
   Corre el MISMO flujo que la web («Cargar ítems desde Excel» del editor APU),
   pieza por pieza y sin atajos:

     1. public/xlsx_lectura.js  lee el Excel de ítems (aquí, el snapshot de
        filas `tests/electrico_nogal_filas.json`, extraído del archivo
        «electrico nogal.xlsx» que aportó el dueño — o el .xlsx original si se
        pasa como argumento).
     2. lib/apu/importar.js     mapea cada fila contra el catálogo calibrado.
     3. lib/apu/calculo.js      calcula el presupuesto (AIU real del contrato
        Nogal: A 19,17 % · I 1,5 % · U 5,33 %, IVA sobre la utilidad).
     4. public/apu_libro.js     arma las hojas con el formato del Presupuesto
        Nogal 4 y public/xlsx.js escribe los bytes.

   Uso:  node tests/generar_electrico_nogal.js [ruta_al_xlsx_original]

   El resultado es DETERMINISTA (misma entrada → mismos bytes: el escritor usa
   fecha ZIP fija y aquí no entra ningún reloj), así que el archivo generado se
   versiona y cualquier regeneración que cambie bytes es un cambio REAL de
   catálogo, de mapeo o de formato — no ruido.
   ========================================================================== */
"use strict";

const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

const XLSXLectura = require("../public/xlsx_lectura.js");
const XLSXApu = require("../public/xlsx.js");
const APULibro = require("../public/apu_libro.js");
const { mapearFilasImportadas } = require("../lib/apu/importar.js");
const { SEMILLA } = require("../lib/apu/catalogo.js");
const { calcularPresupuesto } = require("../lib/apu/calculo.js");

const RUTA_FILAS = path.join(__dirname, "electrico_nogal_filas.json");
const RUTA_SALIDA = path.join(__dirname, "electrico_nogal_apu.xlsx");

/* AIU real del contrato de referencia (Presupuesto Nogal 4, hoja «Cantidades»,
   filas 218-221): NO son los defaults del editor. Se usan aquí porque el
   entregable debe cerrar con la misma estructura del archivo adjudicado. */
const CONFIG_NOGAL = { aiu_pct: 19.17, imprevistos_pct: 1.5, utilidad_pct: 5.33 };

async function filasDeEntrada() {
  const rutaXlsx = process.argv[2];
  if (rutaXlsx) {
    const bytes = fs.readFileSync(rutaXlsx);
    const libro = await XLSXLectura.leerLibro(bytes, {
      inflar: async (u8) => zlib.inflateRawSync(Buffer.from(u8)),
    });
    const mejor = XLSXLectura.elegirHoja(libro);
    if (!mejor || !mejor.resultado.filas.length) {
      throw new Error("El .xlsx no trae ninguna fila de ítem reconocible.");
    }
    // se refresca el snapshot para que el repositorio quede reproducible
    fs.writeFileSync(RUTA_FILAS, `${JSON.stringify({
      origen: "electrico nogal.xlsx · hoja «" + mejor.hoja.nombre + "» · extraído con public/xlsx_lectura.js",
      avisos_lectura: mejor.resultado.avisos,
      filas: mejor.resultado.filas,
    }, null, 1)}\n`);
    return mejor.resultado.filas;
  }
  const snapshot = JSON.parse(fs.readFileSync(RUTA_FILAS, "utf8"));
  return snapshot.filas;
}

(async () => {
  const filas = await filasDeEntrada();

  const mapeo = mapearFilasImportadas(filas, SEMILLA);
  const r = calcularPresupuesto({
    items: mapeo.filas.map((f) => f.entrada_calculo),
    departamento: "BOGOTA D.C.",
    config: CONFIG_NOGAL,
    catalogo: null,                       // semilla del repositorio: el catálogo calibrado
  });

  const hojas = APULibro.construirLibroNogal(r, {
    titulo: "RED DE FUERZA E ILUMINACIÓN — SEDE EL NOGAL (UPN)",
    entidad: "UNIVERSIDAD PEDAGÓGICA NACIONAL",
    departamento: "BOGOTA D.C.",
    objeto: "CAFETERÍA · SALÓN 200 (SALÓN DE MÚSICA) · CASETA AIRE ACONDICIONADO · SALÓN 216 (SALA DE INSTRUMENTOS). "
      + "Cantidades y precios del archivo «electrico nogal.xlsx»; formato y AIU (A 19,17 · I 1,5 · U 5,33 + IVA sobre U) del Presupuesto Nogal 4 adjudicado (UPN-VAD-CP-009-2025).",
    fecha: "Base de precios: Presupuesto Nogal 4 · contrato adjudicado 2025 (Bogotá)",
  });
  const bytes = XLSXApu.construirLibro(hojas);
  fs.writeFileSync(RUTA_SALIDA, Buffer.from(bytes));

  const m = mapeo.resumen_mapeo;
  console.log(`filas leídas: ${m.total} · mapeo firme: ${m.firmes} · revisar: ${m.revisar} · personalizados: ${m.personalizados}`);
  console.log(`con precio del archivo: ${m.con_precio_archivo} · sin precio ni mapeo: ${m.sin_precio_ni_mapeo}`);
  console.log(`items costeados: ${r.resumen.items_costeados}/${r.resumen.items_totales} (sin precio: ${r.resumen.items_incompletos})`);
  console.log(`costo directo total: $${(r.resumen.costo_directo_total || 0).toLocaleString("es-CO")}`);
  console.log(`TOTAL con AIU e IVA(U): $${Math.round((r.resumen.precio_venta || 0) + (r.resumen.iva_sobre_utilidad || 0)).toLocaleString("es-CO")}`);
  console.log(`escrito: ${RUTA_SALIDA} (${bytes.length.toLocaleString("es-CO")} bytes)`);
})().catch((e) => { console.error(`FALLO: ${e.message}`); process.exit(1); });
