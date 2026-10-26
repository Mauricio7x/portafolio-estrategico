/* ============================================================================
   lib/formulario_excel · EL FORMULARIO 1 DE UN .xlsx, LEÍDO SOLO Y CON PUERTA (19-oct-2026)
   ----------------------------------------------------------------------------
   El Formulario 1 (presupuesto oficial) casi siempre se publica en Excel, y el
   plan de lectura marcaba todo .xlsx «hoja de cálculo: no se lee solo». Aquí se
   lee en el servidor con el MISMO lector que usa Precios en el navegador
   (public/xlsx_lectura.js, UMD): ni una regla nueva de «qué es un ítem» ni de
   «qué es el total». Este módulo solo aporta tres cosas que el lector no tiene:
   la descompresión de Node, los topes de un archivo que viene de fuera y la
   forma de la respuesta.

   LA PUERTA. `verificarFormulario` (en el lector) decide si el formulario se
   puede dar por leído sin que nadie lo mire: que cuadre con su propio total y
   que en cada fila cantidad × precio = total. Lo que no pasa NO entrega ítems,
   solo el motivo en palabras: «publicar solo lo que cuadra» (decisión del dueño,
   19-oct-2026). Un ítem leído que no se puede comprobar es la cifra equivocada
   y creíble que no puede llegar a pantalla.

   DEFENSAS. El .xlsx viene de SECOP II, o sea de fuera: es un ZIP, así que la
   descompresión lleva tope de salida (una «bomba zip» de pocos KB que se infla a
   GB se corta en MAX_PARTE), los ítems que se devuelven tienen tope (MAX_FILAS) y
   todo error es `{ ok:false, motivo }`, nunca una excepción. Sin red ni Redis:
   se prueba con libros generados.

   LA CITA. La rejilla del lector es densa: el índice + 1 es el número de fila de
   la hoja. Cada ítem y el total viajan con su fila (`fila_excel`, `fila_total`)
   y la hoja, que es lo que el usuario abre en Excel para comprobarlo. La columna
   no se cita: el total sale de la columna «VR TOTAL» o de la última celda con
   cifra de la fila.
   ========================================================================== */
"use strict";

const zlib = require("zlib");
const XL = require("../public/xlsx_lectura.js");
const { esZip } = require("./docx.js");

const MAX_PARTE = 80 * 1024 * 1024;   // una hoja de un presupuesto grande son pocos MB de XML
const MAX_FILAS = 1500;               // lo que se devuelve; un formulario de obra de verdad trae de decenas a pocos cientos
const MAX_DESCRIPCION = 300;
const MAX_HOJA = 80;                  // el nombre de una hoja de Excel no pasa de 31 caracteres: lo demás no es un nombre

const MAX_TOTAL_INFLADO = 160 * 1024 * 1024;   // todo el libro: el tope por parte solo no basta (340 partes de 60 MB caben en un zip de 20 MB)

/** Un inflador POR LIBRO: lleva la cuenta de lo descomprimido y corta al pasar el total. */
const inflador = () => {
  let total = 0;
  return async (u8) => {
    const salida = new Uint8Array(zlib.inflateRawSync(Buffer.from(u8), { maxOutputLength: MAX_PARTE }));
    total += salida.length;
    if (total > MAX_TOTAL_INFLADO) throw new Error(`el libro descomprimido pasa de ${Math.round(MAX_TOTAL_INFLADO / 1048576)} MB`);
    return salida;
  };
};

const texto = (v, n) => (typeof v === "string" ? v.slice(0, n) : typeof v === "number" && Number.isFinite(v) ? String(v).slice(0, n) : null);   // tipado, no convertido: un objeto con toString propio no puede lanzar
const cifra = (v) => (typeof v === "number" && Number.isFinite(v) ? v : null);

/* El ítem tal como se guarda: solo lo que el lector leyó, con su fila de origen. */
function itemDe(f) {
  return {
    fila_excel: Number.isInteger(f.fila_excel) ? f.fila_excel : null,
    codigo: texto(f.codigo, 40), capitulo: texto(f.capitulo, MAX_DESCRIPCION), descripcion: texto(f.descripcion, MAX_DESCRIPCION),
    unidad: texto(f.unidad, 20), cantidad: cifra(f.cantidad), precio_archivo: cifra(f.precio_archivo), total_archivo: cifra(f.total_archivo),
  };
}

const MAX_FIJOS = 20;                 // valores fijos fuera de los ítems; un Formulario real trae uno o dos (PMT, PGIO)
/* Un valor fijo tal como se guarda: fila, rótulo y cifra, tipados y recortados igual que un ítem. */
function fijoDe(x) {
  const f = x && typeof x === "object" ? x : {};
  return { fila_excel: Number.isInteger(f.fila_excel) ? f.fila_excel : null, etiqueta: texto(f.etiqueta, 120), valor: cifra(f.valor) };
}

/** Lee un .xlsx (Buffer) y devuelve:
    { ok:false, motivo }                                  no es un libro legible
    { ok:true, publicable:false, motivo, hoja, … }        se leyó pero NO se da por bueno: sin ítems
    { ok:true, publicable:true,  motivo:null, hoja, filas:[ítem…], total, fila_total, … } */
async function leerFormularioExcel(buf) {
  if (!esZip(buf)) return { ok: false, motivo: "no es un libro de Excel .xlsx (puede ser un .xls antiguo o un archivo protegido)" };
  let libro;
  try { libro = await XL.leerLibro(new Uint8Array(buf), { inflar: inflador() }); }
  catch (e) { return { ok: false, motivo: `no se pudo abrir el libro: ${String((e && e.message) || e).slice(0, 160)}` }; }
  let elegida;
  try { elegida = XL.elegirHoja(libro); }
  catch (e) { return { ok: false, motivo: `no se pudo leer ninguna hoja: ${String((e && e.message) || e).slice(0, 160)}` }; }
  if (!elegida) return { ok: false, motivo: "el libro no tiene ninguna hoja" };
  const lectura = elegida.resultado;
  const v = XL.verificarFormulario(lectura);
  const ambigua = v.publicable ? XL.ambiguedadDelLibro(elegida) : null;   // solo cuenta si lo demás pasó: el motivo que se enseña es el primero que falla
  const base = {
    ok: true, hoja: texto(elegida.hoja.nombre, MAX_HOJA), n_hojas: libro.hojas.length, filas_n: v.filas, filas_verificadas: v.filas_verificadas,
    total: v.total, fila_total: lectura.cuadre ? lectura.cuadre.fila_total : null, cuadre: lectura.cuadre ? lectura.cuadre.estado : null,
    /* los VALORES FIJOS fuera de los ítems que cerraron la cuenta (PMT, PGIO…; 25-oct-2026): viajan con su fila, su rótulo y su cifra,
       porque no son ítems para cotizar y la oferta tiene que llevarlos tal cual. Vacío cuando los ítems solos dan el total. */
    valores_fijos: lectura.cuadre && Array.isArray(lectura.cuadre.valores_fijos) ? lectura.cuadre.valores_fijos.slice(0, MAX_FIJOS).map(fijoDe) : [],
  };
  if (!v.publicable) return { ...base, publicable: false, motivo: v.motivo };
  if (ambigua) return { ...base, publicable: false, motivo: ambigua.slice(0, 300) };
  if (lectura.filas.length > MAX_FILAS) return { ...base, publicable: false, motivo: `trae ${lectura.filas.length} ítems, más de los ${MAX_FILAS} que se guardan solos: cárguelo en Precios` };
  return { ...base, publicable: true, motivo: null, filas: lectura.filas.map(itemDe) };
}

module.exports = { leerFormularioExcel, itemDe, fijoDe, MAX_FILAS, MAX_FIJOS, MAX_PARTE, MAX_HOJA, MAX_TOTAL_INFLADO };
