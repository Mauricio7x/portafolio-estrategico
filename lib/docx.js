/* ============================================================================
   lib/docx.js · El texto de un documento de Word (.docx), sin dependencias
   ----------------------------------------------------------------------------
   POR QUÉ EXISTE (27-sep-2026). Hay entidades que publican el pliego en Word
   («Condiciones generales.docx», CO1.REQ.11042791) y la aplicación lo listaba
   como «documento de Word: no se lee». Un .docx es un ZIP con el texto en
   `word/document.xml`: `zlib` nativo lo abre, sin librería.

   LO QUE DEVUELVE: líneas como las del lector de PDF (un párrafo por línea; una
   fila de tabla en UNA línea, con las celdas separadas por tabulador, que es lo
   que pdf.js da para una fila), para que los mismos lectores (requisitos,
   códigos, participación) lo lean igual.

   SIN PÁGINAS, a propósito. Word no guarda las páginas: las calcula al pintar.
   Las marcas que deja (`lastRenderedPageBreak`) son las de la última vez que
   alguien lo abrió con sus fuentes, y faltan en los documentos generados por
   programa (el pliego de CO1.REQ.11042791 trae 17 en un documento mucho más
   largo). Un «pág. 12» inventado manda al dueño a buscar donde no es: el texto
   va SIN marcadores `\f<n>` y la página de cada hecho queda `null`, que es lo
   que ya significa «no se sabe» (lib/paginas).

   DEFENSAS: el ZIP viene de fuera. Se lee el directorio central (no se confía
   en las cabeceras locales para los tamaños), solo se descomprime UNA entrada
   (`word/document.xml`), con tope de salida (una «bomba zip» de pocos KB que se
   infla a GB se corta en `MAX_XML`), y todo error es `{ ok:false, motivo }`,
   nunca una excepción.
   ========================================================================== */
"use strict";

const zlib = require("zlib");

const MAX_XML = 40 * 1024 * 1024;        // el document.xml de un pliego de 200 páginas son ~2 MB
const FIRMA_ZIP = 0x04034b50;
const FIRMA_CENTRAL = 0x02014b50;
const FIRMA_FIN = 0x06054b50;

const esZip = (buf) => Buffer.isBuffer(buf) && buf.length >= 4 && buf.readUInt32LE(0) === FIRMA_ZIP;

/* La entrada `nombre` del ZIP, descomprimida, o { motivo }. */
function entradaZip(buf, nombre) {
  // el registro de fin está en los últimos 22 bytes + un comentario de hasta 64 KB
  const desde = Math.max(0, buf.length - 22 - 0xffff);
  let fin = -1;
  for (let i = buf.length - 22; i >= desde; i--) { if (buf.readUInt32LE(i) === FIRMA_FIN) { fin = i; break; } }
  if (fin < 0) return { motivo: "el archivo no es un ZIP completo (¿descarga cortada?)" };
  const entradas = buf.readUInt16LE(fin + 10);
  let p = buf.readUInt32LE(fin + 16);
  for (let k = 0; k < entradas; k++) {
    if (p + 46 > buf.length || buf.readUInt32LE(p) !== FIRMA_CENTRAL) return { motivo: "el índice del ZIP está dañado" };
    const metodo = buf.readUInt16LE(p + 10);
    const comprimido = buf.readUInt32LE(p + 20);
    const largoNombre = buf.readUInt16LE(p + 28), largoExtra = buf.readUInt16LE(p + 30), largoComentario = buf.readUInt16LE(p + 32);
    const local = buf.readUInt32LE(p + 42);
    const este = buf.slice(p + 46, p + 46 + largoNombre).toString("utf8");
    p += 46 + largoNombre + largoExtra + largoComentario;
    if (este !== nombre) continue;
    if (local + 30 > buf.length || buf.readUInt32LE(local) !== FIRMA_ZIP) return { motivo: "el ZIP está dañado" };
    const datos = local + 30 + buf.readUInt16LE(local + 26) + buf.readUInt16LE(local + 28);
    if (datos + comprimido > buf.length) return { motivo: "el ZIP está cortado" };
    const crudo = buf.slice(datos, datos + comprimido);
    if (metodo === 0) return crudo.length > MAX_XML ? { motivo: "el texto del documento es demasiado grande" } : { datos: crudo };
    if (metodo !== 8) return { motivo: `el ZIP usa una compresión que no se lee (método ${metodo})` };
    try { return { datos: zlib.inflateRawSync(crudo, { maxOutputLength: MAX_XML }) }; }
    catch (e) { return { motivo: e && e.code === "ERR_BUFFER_TOO_LARGE" ? "el texto del documento es demasiado grande" : "el documento está dañado" }; }
  }
  return { motivo: `no trae «${nombre}»` };
}

const ENTIDADES = { amp: "&", lt: "<", gt: ">", quot: "\"", apos: "'" };
function desescapar(s) {
  return s.replace(/&(?:#x([0-9a-f]+)|#(\d+)|(amp|lt|gt|quot|apos));/gi, (m, hex, dec, nom) => {
    if (nom) return ENTIDADES[nom.toLowerCase()];
    const n = hex ? parseInt(hex, 16) : Number(dec);
    return n > 0 && n <= 0x10ffff ? String.fromCodePoint(n) : "";
  });
}

/* El XML de `word/document.xml`, en líneas. Se recorre etiqueta a etiqueta (no
   con una expresión por párrafo): un cuadro de texto mete párrafos DENTRO de
   otro párrafo, y una tabla, párrafos dentro de celdas. */
function lineasDeXml(xml) {
  const lineas = [];
  let parrafo = "";                 // el párrafo en curso
  const filas = [];                 // pila de filas de tabla abiertas (tablas anidadas)
  let enTexto = false;
  const re = /<(\/?)([a-zA-Z0-9]+:[a-zA-Z0-9]+)([^>]*)>|([^<]+)/g;
  let m;
  const cerrarParrafo = () => {
    const t = parrafo.replace(/[ \t]+/g, (x) => (x.includes("\t") ? "\t" : " ")).trim();
    parrafo = "";
    if (!t) return;
    if (filas.length) { const f = filas[filas.length - 1]; f.celda = f.celda ? `${f.celda} ${t}` : t; }
    else lineas.push(t);
  };
  while ((m = re.exec(xml))) {
    if (m[4] != null) { if (enTexto) parrafo += desescapar(m[4]); continue; }
    const cierra = m[1] === "/", etiqueta = m[2], autocierre = /\/\s*$/.test(m[3]);
    switch (etiqueta) {
      case "w:t": enTexto = !cierra && !autocierre; break;
      case "w:tab": if (!cierra) parrafo += "\t"; break;
      case "w:br": case "w:cr": if (!cierra) parrafo += " "; break;
      case "w:p": if (cierra || autocierre) cerrarParrafo(); else if (parrafo.trim()) cerrarParrafo(); break;
      case "w:tr": if (!cierra) filas.push({ celdas: [], celda: "" }); else if (filas.length) {
        const f = filas.pop();
        const t = f.celdas.filter(Boolean).join("\t");
        if (t) { if (filas.length) { const g = filas[filas.length - 1]; g.celda = g.celda ? `${g.celda} ${t}` : t; } else lineas.push(t); }
      } break;
      case "w:tc": if (cierra && filas.length) { cerrarParrafo(); const f = filas[filas.length - 1]; f.celdas.push(f.celda); f.celda = ""; } break;
      default: break;
    }
  }
  cerrarParrafo();
  return lineas;
}

/* `buf` (Buffer con el .docx) → { ok:true, texto, lineas } | { ok:false, motivo } */
function textoDeDocx(buf) {
  if (!esZip(buf)) return { ok: false, motivo: "no es un documento de Word (.docx): le falta la firma de un ZIP" };
  let e;
  try { e = entradaZip(buf, "word/document.xml"); } catch { e = { motivo: "el documento está dañado" }; }
  if (!e.datos) return { ok: false, motivo: e.motivo };
  const lineas = lineasDeXml(e.datos.toString("utf8"));
  return { ok: true, texto: lineas.join("\n"), lineas: lineas.length };
}

module.exports = { textoDeDocx, lineasDeXml, esZip, MAX_XML };
