/* ============================================================================
   public/xlsx · Escritor .xlsx (OOXML) propio, sin dependencias
   ----------------------------------------------------------------------------
   POR QUÉ NO SHEETJS. El encargo pedía `npm install xlsx`. Se probó y se
   descartó con dos hechos verificados, no con una opinión:

     1. SheetJS dejó de publicar en el registro de npm después de la 0.18.5
        (se mudó a su propio CDN). `npm install xlsx` instala esa 0.18.5, que
        arrastra DOS advisories «high» —prototype pollution GHSA-4r6h-8v6p-xvw6
        y ReDoS GHSA-5pgg-2g8v-p4x9— y `npm audit` responde literalmente
        «No fix available»: no hay versión a la que actualizar.
     2. La edición libre IGNORA los estilos de celda al ESCRIBIR. Se comprobó
        fijando `ws.A1.s = {font:{bold:true}, fill:{…}}`: el `xl/styles.xml`
        resultante sale con `<fonts count="1">` y ni rastro del formato. Los
        formatos numéricos (`z`) sí pasan; negritas, rellenos y bordes no.
        Un «formato profesional de APU» —franja de título, encabezados en
        negrita, bordes, moneda— no es alcanzable con esa librería.

   Y encima habría estrenado el `package.json` que este repositorio no tiene a
   propósito (CLAUDE.md: «sin build, sin package.json, sin dependencias»).

   Un .xlsx es un ZIP de XML, así que el escritor entero cabe aquí y da control
   TOTAL del formato. Se usa el método STORE (sin comprimir): es ZIP válido,
   Excel/LibreOffice/Numbers lo abren igual y evita depender de que el
   navegador traiga `CompressionStream`. Un presupuesto son decenas de filas:
   la compresión no compra nada y sí añade una rama que puede fallar.

   Las cadenas van como `inlineStr` en vez de una tabla `sharedStrings.xml`:
   una parte menos que mantener sincronizada, al coste de repetir texto que
   aquí no se repite.

   Corre en el navegador (global `XLSXApu`) y en Node (`module.exports`), a
   propósito: así la suite de pruebas puede generar un libro de verdad y
   auditar el ZIP resultante en vez de confiar en que el navegador lo haga.
   ========================================================================== */
"use strict";

(function (raiz, fabrica) {
  const api = fabrica();
  if (typeof module === "object" && module.exports) module.exports = api;
  else raiz.XLSXApu = api;
})(typeof self !== "undefined" ? self : this, function () {

  const codificar = (s) => new TextEncoder().encode(s);

  /* ───────────────────────── CRC-32 (tabla estándar) ───────────────────── */
  const TABLA_CRC = (() => {
    const t = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
      t[n] = c >>> 0;
    }
    return t;
  })();

  function crc32(bytes) {
    let c = 0xFFFFFFFF;
    for (let i = 0; i < bytes.length; i++) c = TABLA_CRC[(c ^ bytes[i]) & 0xFF] ^ (c >>> 8);
    return (c ^ 0xFFFFFFFF) >>> 0;
  }

  /* ───────────────────────── ZIP (solo método STORE) ────────────────────
     Sin descriptores de datos ni ZIP64: un presupuesto jamás se acerca a los
     4 GB ni a las 65 535 entradas donde ZIP64 empezaría a hacer falta. */
  function escribirZip(entradas) {
    const trozos = [];
    const central = [];
    let desplazamiento = 0;

    const u16 = (n) => [n & 0xFF, (n >>> 8) & 0xFF];
    const u32 = (n) => [n & 0xFF, (n >>> 8) & 0xFF, (n >>> 16) & 0xFF, (n >>> 24) & 0xFF];

    for (const { nombre, datos } of entradas) {
      const nombreBytes = codificar(nombre);
      const crc = crc32(datos);
      // fecha/hora MS-DOS fija (1980-01-01): un .xlsx no debe cambiar de bytes
      // por haberse generado un minuto más tarde — así el archivo es reproducible
      const cabecera = [
        ...u32(0x04034b50), ...u16(20), ...u16(0x0800), ...u16(0), // 0x0800 = nombres en UTF-8
        ...u16(0), ...u16(0x21),                                   // hora, fecha (1980-01-01)
        ...u32(crc), ...u32(datos.length), ...u32(datos.length),
        ...u16(nombreBytes.length), ...u16(0),
      ];
      trozos.push(new Uint8Array(cabecera), nombreBytes, datos);

      central.push([
        ...u32(0x02014b50), ...u16(20), ...u16(20), ...u16(0x0800), ...u16(0),
        ...u16(0), ...u16(0x21),
        ...u32(crc), ...u32(datos.length), ...u32(datos.length),
        ...u16(nombreBytes.length), ...u16(0), ...u16(0),
        ...u16(0), ...u16(0), ...u32(0), ...u32(desplazamiento),
      ]);
      central.push(nombreBytes);
      desplazamiento += cabecera.length + nombreBytes.length + datos.length;
    }

    const partesCentral = [];
    for (const c of central) partesCentral.push(c instanceof Uint8Array ? c : new Uint8Array(c));
    const tamanoCentral = partesCentral.reduce((a, b) => a + b.length, 0);
    const fin = new Uint8Array([
      ...u32(0x06054b50), ...u16(0), ...u16(0),
      ...u16(entradas.length), ...u16(entradas.length),
      ...u32(tamanoCentral), ...u32(desplazamiento), ...u16(0),
    ]);

    const todo = [...trozos, ...partesCentral, fin];
    const total = todo.reduce((a, b) => a + b.length, 0);
    const salida = new Uint8Array(total);
    let p = 0;
    for (const t of todo) { salida.set(t, p); p += t.length; }
    return salida;
  }

  /* ───────────────────────────── XML ───────────────────────────────────── */
  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&apos;")
      // los caracteres de control rompen el XML y Excel se niega a abrir el
      // archivo entero por uno solo; llegan desde objetos de SECOP copiados a mano
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, "");
  }

  /* Índice de columna (0) → «A», (26) → «AA» */
  function letraColumna(i) {
    let s = "";
    for (let n = i + 1; n > 0; n = Math.floor((n - 1) / 26)) {
      s = String.fromCharCode(65 + ((n - 1) % 26)) + s;
    }
    return s;
  }

  /* ─────────────────────────── Estilos ─────────────────────────────────
     Catálogo cerrado y pequeño. Cada estilo es un índice de `cellXfs`, que es
     lo que una celda referencia con su atributo `s`. El orden de este arreglo
     ES el contrato: cambiarlo renumera todas las celdas del libro. */
  const FUENTES = [
    { sz: 11, color: "FF111827", nombre: "Calibri" },                          // 0 normal
    { sz: 11, color: "FF111827", nombre: "Calibri", negrita: true },           // 1 negrita
    { sz: 16, color: "FFFFFFFF", nombre: "Calibri", negrita: true },           // 2 título
    { sz: 10, color: "FFFFFFFF", nombre: "Calibri", negrita: true },           // 3 encabezado de tabla
    { sz: 10, color: "FF6B7280", nombre: "Calibri" },                          // 4 nota al pie
    { sz: 12, color: "FF111827", nombre: "Calibri", negrita: true },           // 5 total
  ];
  const RELLENOS = [
    null, null,                       // 0 y 1 los reserva OOXML (none, gray125)
    "FF111827",                       // 2 franja de título (gris 900)
    "FF374151",                       // 3 encabezado de tabla (gris 700)
    "FFF3F4F6",                       // 4 fila de resumen (gris 100)
    "FFFEF3C7",                       // 5 destacado (ámbar 100) — precio sin APU de respaldo
    "FFFEE2E2",                       // 6 alerta (rojo 100) — fila sin precio: no suma y se ve
  ];
  const FORMATOS = {                  // numFmtId ≥ 164 = personalizado
    moneda: { id: 164, codigo: '"$"#,##0' },
    moneda2: { id: 165, codigo: '"$"#,##0.00' },
    cantidad: { id: 166, codigo: "#,##0.00" },
    porcentaje: { id: 167, codigo: '0.00"%"' },
  };

  /* estilo → [fuente, relleno, borde, numFmtId, alineación] */
  const ESTILOS = {
    normal: [0, 0, 0, 0, null],
    negrita: [1, 0, 0, 0, null],
    titulo: [2, 2, 0, 0, "left"],
    subtitulo: [4, 0, 0, 0, "left"],
    encabezado: [3, 3, 1, 0, "center"],
    texto: [0, 0, 1, 0, "left"],
    cantidad: [0, 0, 1, FORMATOS.cantidad.id, "right"],
    moneda: [0, 0, 1, FORMATOS.moneda.id, "right"],
    moneda2: [0, 0, 1, FORMATOS.moneda2.id, "right"],
    porcentaje: [0, 0, 1, FORMATOS.porcentaje.id, "right"],
    totalTexto: [5, 4, 1, 0, "left"],
    totalMoneda: [5, 4, 1, FORMATOS.moneda.id, "right"],
    resumenTexto: [1, 4, 1, 0, "left"],
    resumenMoneda: [1, 4, 1, FORMATOS.moneda.id, "right"],
    destacadoTexto: [1, 5, 1, 0, "left"],
    destacadoMoneda: [1, 5, 1, FORMATOS.moneda.id, "right"],
    nota: [4, 0, 0, 0, "left"],
    /* Estilos añadidos para el formato Nogal (ago 2026). Van AL FINAL a
       propósito: el orden de este objeto ES el contrato (renumera las celdas) y
       añadir por el final conserva los índices de todos los anteriores. Ningún
       formato numérico nuevo: los cuatro `numFmt` existentes son suficientes y
       hay una prueba que exige exactamente cuatro. */
    capituloTexto: [1, 4, 1, 0, "left"],                        // fila de capítulo del presupuesto
    alertaTexto: [1, 6, 1, 0, "left"],                          // fila SIN precio (rojo)
    alertaMoneda: [1, 6, 1, FORMATOS.moneda.id, "right"],
    destacadoCantidad: [1, 5, 1, FORMATOS.cantidad.id, "right"],
    moneda2Negrita: [1, 4, 1, FORMATOS.moneda2.id, "right"],    // subtotales de la hoja APU
  };
  const ORDEN_ESTILOS = Object.keys(ESTILOS);
  const indiceEstilo = (nombre) => Math.max(0, ORDEN_ESTILOS.indexOf(nombre)) + 1; // 0 = estilo por defecto

  function stylesXml() {
    const fuentes = FUENTES.map((f) =>
      `<font><sz val="${f.sz}"/><color rgb="${f.color}"/><name val="${f.nombre}"/>`
      + `${f.negrita ? "<b/>" : ""}</font>`).join("");

    const rellenos = RELLENOS.map((r, i) => {
      if (i === 0) return '<fill><patternFill patternType="none"/></fill>';
      if (i === 1) return '<fill><patternFill patternType="gray125"/></fill>';
      return `<fill><patternFill patternType="solid"><fgColor rgb="${r}"/><bgColor indexed="64"/></patternFill></fill>`;
    }).join("");

    const linea = '<left style="thin"><color rgb="FFD1D5DB"/></left><right style="thin"><color rgb="FFD1D5DB"/></right>'
      + '<top style="thin"><color rgb="FFD1D5DB"/></top><bottom style="thin"><color rgb="FFD1D5DB"/></bottom>';
    const bordes = `<border><left/><right/><top/><bottom/><diagonal/></border><border>${linea}<diagonal/></border>`;

    const numFmts = Object.values(FORMATOS)
      .map((f) => `<numFmt numFmtId="${f.id}" formatCode="${esc(f.codigo)}"/>`).join("");

    const xfs = ORDEN_ESTILOS.map((k) => {
      const [fuente, relleno, borde, numFmt, alineacion] = ESTILOS[k];
      const aplica = ` applyFont="1" applyFill="1" applyBorder="1"${numFmt ? ' applyNumberFormat="1"' : ""}`;
      const alin = alineacion
        ? `${" "}applyAlignment="1"><alignment horizontal="${alineacion}" vertical="center" wrapText="1"/></xf>`
        : "/>";
      return `<xf numFmtId="${numFmt}" fontId="${fuente}" fillId="${relleno}" borderId="${borde}" xfId="0"${aplica}${alin}`;
    }).join("");

    return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
      + '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
      + `<numFmts count="${Object.keys(FORMATOS).length}">${numFmts}</numFmts>`
      + `<fonts count="${FUENTES.length}">${fuentes}</fonts>`
      + `<fills count="${RELLENOS.length}">${rellenos}</fills>`
      + `<borders count="2">${bordes}</borders>`
      + '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>'
      + `<cellXfs count="${ORDEN_ESTILOS.length + 1}">`
      + '<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>'
      + xfs
      + "</cellXfs>"
      // `cellStyles` con el estilo «Normal» no es opcional: sin él los lectores
      // avisan de que el libro no declara estilo por defecto y algunos aplican
      // el suyo encima del nuestro
      + '<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>'
      + "</styleSheet>";
  }

  /* ─────────────────────────── Hoja ────────────────────────────────────
     `filas` es un arreglo de arreglos de celda. Una celda es:
       null | número | cadena | {v, t?: "n"|"s", s?: nombreDeEstilo, f?: fórmula}
     Se admite el atajo de valor suelto para que quien arma la tabla no tenga
     que envolver cada texto en un objeto. */
  function celdaNormalizada(c) {
    if (c === null || c === undefined || c === "") return null;
    if (typeof c === "number") return { v: c, t: "n", s: "normal" };
    if (typeof c === "string") return { v: c, t: "s", s: "normal" };
    const t = c.t || (typeof c.v === "number" ? "n" : "s");
    return { v: c.v, t, s: c.s || "normal", f: c.f };
  }

  function sheetXml(hoja) {
    const filas = hoja.filas || [];
    const anchos = (hoja.anchos || []).map((a, i) =>
      `<col min="${i + 1}" max="${i + 1}" width="${a}" customWidth="1"/>`).join("");

    const cuerpo = filas.map((fila, iFila) => {
      const n = iFila + 1;
      const celdas = (fila || []).map((cruda, iCol) => {
        const c = celdaNormalizada(cruda);
        if (!c) return "";
        const ref = `${letraColumna(iCol)}${n}`;
        const s = ` s="${indiceEstilo(c.s)}"`;
        /* Una fórmula viaja CON su valor cacheado cuando quien la escribe lo
           conoce: sin `<v>` algunos lectores enseñan la celda vacía hasta
           recalcular, y el número que se calculó aquí es exactamente el que la
           fórmula debe reproducir. El `=` inicial se QUITA: en OOXML el
           elemento <f> lo lleva implícito, y un `=` literal dentro produce
           `==D7*E7` — una fórmula rota en todas las celdas del libro. */
        if (c.f) {
          const formula = String(c.f).replace(/^=/, "");
          const cache = typeof c.v === "number" && Number.isFinite(c.v) ? `<v>${c.v}</v>` : "";
          return `<c r="${ref}"${s}><f>${esc(formula)}</f>${cache}</c>`;
        }
        if (c.t === "n") {
          const v = Number(c.v);
          if (!Number.isFinite(v)) return `<c r="${ref}"${s}/>`;
          return `<c r="${ref}"${s}><v>${v}</v></c>`;
        }
        return `<c r="${ref}"${s} t="inlineStr"><is><t xml:space="preserve">${esc(c.v)}</t></is></c>`;
      }).join("");
      const alto = (hoja.altos && hoja.altos[iFila])
        ? ` ht="${hoja.altos[iFila]}" customHeight="1"` : "";
      return `<row r="${n}"${alto}>${celdas}</row>`;
    }).join("");

    const fusiones = (hoja.fusiones || []).length
      ? `<mergeCells count="${hoja.fusiones.length}">`
        + hoja.fusiones.map((f) => `<mergeCell ref="${esc(f)}"/>`).join("")
        + "</mergeCells>"
      : "";

    return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
      + '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
      + '<sheetPr><pageSetUpPr fitToPage="1"/></sheetPr>'
      + (hoja.congelar ? `<sheetViews><sheetView workbookViewId="0" showGridLines="0"><pane ySplit="${hoja.congelar}" topLeftCell="A${hoja.congelar + 1}" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>`
        : '<sheetViews><sheetView workbookViewId="0" showGridLines="0"/></sheetViews>')
      + '<sheetFormatPr defaultRowHeight="15"/>'
      + (anchos ? `<cols>${anchos}</cols>` : "")
      + `<sheetData>${cuerpo}</sheetData>`
      + fusiones
      + '<pageMargins left="0.4" right="0.4" top="0.6" bottom="0.6" header="0.3" footer="0.3"/>'
      + '<pageSetup orientation="landscape" paperSize="9" fitToWidth="1" fitToHeight="0"/>'
      + "</worksheet>";
  }

  /* ──────────────────────── Libro completo ─────────────────────────────── */
  function construirLibro(hojas) {
    if (!Array.isArray(hojas) || !hojas.length) throw new Error("El libro necesita al menos una hoja.");

    // Excel rechaza el archivo entero si un nombre de hoja lleva : \ / ? * [ ]
    // o pasa de 31 caracteres. Se sanea aquí y no en quien llama: es una regla
    // del formato, no del contenido.
    const nombres = hojas.map((h, i) => {
      const limpio = String(h.nombre || `Hoja${i + 1}`).replace(/[:\\/?*[\]]/g, " ").slice(0, 31).trim();
      return limpio || `Hoja${i + 1}`;
    });

    const entradas = [];
    const anadir = (nombre, texto) => entradas.push({ nombre, datos: codificar(texto) });

    anadir("[Content_Types].xml",
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
      + '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
      + '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
      + '<Default Extension="xml" ContentType="application/xml"/>'
      + '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>'
      + hojas.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join("")
      + '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>'
      + '<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>'
      + '<Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>'
      + "</Types>");

    anadir("_rels/.rels",
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
      + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
      + '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>'
      + '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>'
      + '<Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>'
      + "</Relationships>");

    anadir("docProps/core.xml",
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
      + '<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" '
      + 'xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:title>Análisis de Precios Unitarios</dc:title>'
      + "<dc:creator>Detecta</dc:creator></cp:coreProperties>");

    anadir("docProps/app.xml",
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
      + '<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties">'
      + "<Application>Detecta</Application></Properties>");

    anadir("xl/workbook.xml",
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
      + '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" '
      + 'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>'
      + nombres.map((n, i) => `<sheet name="${esc(n)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join("")
      + "</sheets></workbook>");

    anadir("xl/_rels/workbook.xml.rels",
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
      + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
      + hojas.map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join("")
      + `<Relationship Id="rId${hojas.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>`
      + "</Relationships>");

    anadir("xl/styles.xml", stylesXml());
    hojas.forEach((h, i) => anadir(`xl/worksheets/sheet${i + 1}.xml`, sheetXml(h)));

    return escribirZip(entradas);
  }

  /* Descarga en el navegador. Separada de `construirLibro` para que la
     construcción se pueda probar en Node sin tocar el DOM. */
  function descargar(bytes, nombreArchivo) {
    const blob = new Blob([bytes], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = nombreArchivo;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    // el objeto URL se libera tarde a propósito: revocarlo en el mismo tick
    // cancela la descarga en Safari
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  }

  return { construirLibro, descargar, letraColumna, ESTILOS: ORDEN_ESTILOS };
});
