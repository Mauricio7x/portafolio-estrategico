/* ============================================================================
   public/xlsx_lectura · Lector .xlsx / .csv propio, sin dependencias
   ----------------------------------------------------------------------------
   La otra mitad de `public/xlsx.js`: aquel ESCRIBE el libro y este lo LEE. Es lo
   que permite «Cargar ítems desde Excel» en el editor de APU sin SheetJS (las
   mismas dos razones documentadas en xlsx.js: 0.18.5 abandonada con advisories
   sin arreglo, y estrenaría el package.json que este repo no tiene a propósito).

   Corre en el NAVEGADOR (global `XLSXLectura`) y en Node (`module.exports`), a
   propósito y con la misma técnica UMD de xlsx.js: así la suite lee de verdad
   un libro generado y el generador del APU de prueba usa EXACTAMENTE el mismo
   lector que usará el dueño en su navegador.

   LA DESCOMPRESIÓN SE INYECTA. Un .xlsx de Excel real comprime sus partes con
   DEFLATE; los nuestros usan STORE. El ZIP se parsea aquí y el inflado lo pone
   quien llama: en el navegador `DecompressionStream("deflate-raw")`, en Node
   `zlib.inflateRawSync`. Sin inflador y con partes comprimidas se responde un
   error accionable («use un navegador reciente o exporte a CSV»), nunca una
   lista vacía con cara de éxito.

   Los TAMAÑOS se leen del DIRECTORIO CENTRAL, no del local header: un xlsx
   escrito en streaming pone los tamaños del local header en 0 y los deja en el
   data descriptor (bit 3 del flag) — leerlos de ahí devolvería 0 bytes de cada
   parte y un libro «vacío» perfectamente creíble.

   `numeroLocal` es la TERCERA copia de `lib/apu_pliego.numeroColombiano`
   (pliego.js tiene la segunda): un `<input>` y un lector de CSV no pueden
   requerir un módulo de Node. La prueba que ata las copias ejecuta las tres
   sobre la misma batería — si esta divergiera, una cantidad importada y la
   misma cantidad leída de un pliego significarían cosas distintas.
   ========================================================================== */
"use strict";

(function (raiz, fabrica) {
  const api = fabrica();
  if (typeof module === "object" && module.exports) module.exports = api;
  else raiz.XLSXLectura = api;
})(typeof self !== "undefined" ? self : this, function () {

  /* ─────────────────────────── utilidades ─────────────────────────────── */
  const decodificarUtf8 = (bytes) => new TextDecoder("utf-8").decode(bytes);

  function numeroLocal(bruto) {
    const t = String(bruto == null ? "" : bruto).trim();
    if (!t) return null;
    if (!/^[\s$€.,\-+0-9]+$/.test(t)) return null;   // el € va porque lo lleva la copia del servidor: las tres tienen que aceptar lo mismo
    let cuerpo = t.replace(/[\s$€+]/g, "");
    let signo = 1;
    if (cuerpo.startsWith("-")) { signo = -1; cuerpo = cuerpo.slice(1); }
    if (cuerpo.includes("-") || !/\d/.test(cuerpo)) return null;
    let entero = cuerpo, decimal = "";
    if (cuerpo.includes(",")) {
      const partes = cuerpo.split(",");
      if (partes.length > 2) return null;
      entero = partes[0].replace(/\./g, "");
      decimal = partes[1] || "";
    } else if (cuerpo.includes(".")) {
      const grupos = cuerpo.split(".");
      const ultimo = grupos[grupos.length - 1];
      if (ultimo.length === 3 && grupos.length >= 2) entero = grupos.join("");
      else if (ultimo.length >= 1 && ultimo.length <= 2) { entero = grupos.slice(0, -1).join(""); decimal = ultimo; }
      // UN solo punto y 4+ dígitos detrás es un DECIMAL de muchas cifras; con
      // varios puntos no encaja en ninguna convención y es `null`. Tiene que
      // decir lo MISMO que lib/apu_pliego.numeroColombiano — hay una prueba
      // que compara las copias.
      else if (grupos.length === 2) { entero = grupos[0]; decimal = ultimo; }
      else return null;
    }
    if (!/^\d*$/.test(entero) || !/^\d*$/.test(decimal)) return null;
    const n = parseFloat(`${entero || "0"}.${decimal || "0"}`);
    return Number.isFinite(n) ? signo * n : null;
  }

  /* entidades XML mínimas: las cinco nombradas y las numéricas */
  function desescaparXml(s) {
    return String(s == null ? "" : s)
      .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCodePoint(parseInt(h, 16)))
      .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(parseInt(d, 10)))
      .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'").replace(/&amp;/g, "&");
  }

  /* «B4» → columna 1 (base 0) */
  function indiceColumna(ref) {
    let n = 0;
    for (const ch of String(ref)) {
      const c = ch.charCodeAt(0);
      if (c >= 65 && c <= 90) n = n * 26 + (c - 64);
      else if (c >= 97 && c <= 122) n = n * 26 + (c - 96);
      else break;
    }
    return n - 1;
  }

  /* ─────────────────────────── ZIP (lectura) ──────────────────────────── */
  function leerZip(bytes) {
    const u8 = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
    const dv = new DataView(u8.buffer, u8.byteOffset, u8.byteLength);
    const u16 = (p) => dv.getUint16(p, true);
    const u32 = (p) => dv.getUint32(p, true);

    // EOCD: se busca desde el final (el comentario del ZIP puede empujarlo)
    let eocd = -1;
    const desde = Math.max(0, u8.length - 22 - 65535);
    for (let p = u8.length - 22; p >= desde; p--) {
      if (u32(p) === 0x06054b50) { eocd = p; break; }
    }
    if (eocd < 0) throw new Error("No es un archivo ZIP: falta el fin del directorio central.");

    const nEntradas = u16(eocd + 10);
    let p = u32(eocd + 16);              // inicio del directorio central
    const entradas = [];
    for (let i = 0; i < nEntradas && p + 46 <= u8.length; i++) {
      if (u32(p) !== 0x02014b50) break;
      const metodo = u16(p + 10);
      const tamComprimido = u32(p + 20); // del CENTRAL: fiable aun con data descriptor
      const tamReal = u32(p + 24);
      const nLen = u16(p + 28), eLen = u16(p + 30), cLen = u16(p + 32);
      const offsetLocal = u32(p + 42);
      const nombre = decodificarUtf8(u8.subarray(p + 46, p + 46 + nLen));
      entradas.push({ nombre, metodo, tamComprimido, tamReal, offsetLocal });
      p += 46 + nLen + eLen + cLen;
    }

    async function extraer(nombre, inflar) {
      const e = entradas.find((x) => x.nombre === nombre);
      if (!e) return null;
      if (u32(e.offsetLocal) !== 0x04034b50) throw new Error(`Entrada ZIP corrupta: ${nombre}`);
      const nLen = u16(e.offsetLocal + 26), eLen = u16(e.offsetLocal + 28);
      const ini = e.offsetLocal + 30 + nLen + eLen;
      const crudo = u8.subarray(ini, ini + e.tamComprimido);
      if (e.metodo === 0) return crudo;
      if (e.metodo === 8) {
        if (typeof inflar !== "function") {
          throw new Error("El .xlsx viene comprimido y este navegador no puede descomprimirlo: use un navegador reciente o exporte la hoja a CSV.");
        }
        return inflar(crudo);
      }
      throw new Error(`Método de compresión ZIP no soportado: ${e.metodo}`);
    }

    return { entradas, extraer };
  }

  /* ─────────────────────── partes XML del libro ───────────────────────── */
  function textoDeSi(xml) {
    // un <si> puede traer varios runs <r><t>…</t></r>: se concatenan
    let s = "";
    for (const m of xml.matchAll(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g)) s += desescaparXml(m[1]);
    return s;
  }

  function parsearSharedStrings(xml) {
    if (!xml) return [];
    const lista = [];
    for (const m of xml.matchAll(/<si(?:\s[^>]*)?>([\s\S]*?)<\/si>/g)) lista.push(textoDeSi(m[1]));
    return lista;
  }

  /* TOPES DE LECTURA (19-oct-2026, revisión adversaria; medido en 301 libros reales de SECOP II). Un libro viene de fuera y la rejilla es DENSA
     (toda fila con tantas celdas como la más ancha): una sola celda en la columna XFD (16.384) o en la fila 1.000.000 la inflaba a cientos de
     millones de celdas y reventaba la memoria (el archivo de 1 KB con una celda en XFD100000 tumbaba el proceso en 2 s; tres libros reales
     —0294 a 0296— tenían una celda de estilo en XFD y daban 112 millones). Lo real llega a 1,4 millones de celdas, 175 columnas y 10.378 filas:
     los topes dejan un margen de 5 a 6 veces. Una celda VACÍA (solo estilo) no ensancha la rejilla; una celda CON valor fuera de los topes se
     descarta y la hoja queda marcada `excede` (quien publica solo la trata como no comprobable); el presupuesto de celdas del libro entero
     corta con un error que dice qué hacer. */
  const MAX_COLUMNAS = 1024, MAX_FILA_NUM = 200000, MAX_CELDAS_LIBRO = 8000000;
  function parsearHoja(xml, compartidas, presupuesto) {
    const filas = [];
    let maxCol = 0, excede = false;
    for (const mFila of xml.matchAll(/<row\b[^>]*?(?:\/>|>([\s\S]*?)<\/row>)/g)) {
      const numFila = (() => {
        const r = /r="(\d+)"/.exec(mFila[0]);
        return r ? parseInt(r[1], 10) : filas.length + 1;
      })();
      if (numFila > MAX_FILA_NUM) { if (/<v[\s>]|<is[\s>]/.test(mFila[0])) excede = true; continue; }
      const celdas = [];
      for (const mCelda of (mFila[1] || "").matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
        const attrs = mCelda[1] || "";
        const cuerpo = mCelda[2] || "";
        const ref = /r="([A-Z]+)\d+"/.exec(attrs);
        const col = ref ? indiceColumna(ref[1]) : celdas.length;
        const tipo = (/(?:^|\s)t="([^"]+)"/.exec(attrs) || [])[1] || "n";
        let valor = null;
        if (tipo === "inlineStr") {
          valor = textoDeSi(cuerpo);
        } else {
          const v = /<v(?:\s[^>]*)?>([\s\S]*?)<\/v>/.exec(cuerpo);
          if (v) {
            const crudoV = desescaparXml(v[1]);
            if (tipo === "s") valor = compartidas[Number(crudoV)] ?? null;
            else if (tipo === "str") valor = crudoV;
            else if (tipo === "b") valor = crudoV === "1";
            else {
              const n = Number(crudoV);
              valor = Number.isFinite(n) ? n : crudoV;
            }
          }
        }
        if (valor === null) continue;   // celda vacía (solo estilo): no ensancha la rejilla
        if (col >= MAX_COLUMNAS) { excede = true; continue; }
        celdas[col] = valor;
        if (col + 1 > maxCol) maxCol = col + 1;
      }
      if (celdas.length) filas[numFila - 1] = celdas;
    }
    if (presupuesto) {
      presupuesto.celdas -= filas.length * maxCol;
      if (presupuesto.celdas < 0) throw new Error(`El libro es demasiado grande para leerlo aquí (más de ${MAX_CELDAS_LIBRO.toLocaleString("es-CO")} celdas): exporte la hoja que necesita a CSV o recórtela.`);
    }
    // rejilla densa: toda fila existe (vacía si el XML la saltó) y con null en los huecos
    const salida = [];
    for (let i = 0; i < filas.length; i++) {
      const f = filas[i] || [];
      const densa = new Array(maxCol).fill(null);
      for (let c = 0; c < f.length; c++) densa[c] = f[c] === undefined ? null : f[c];
      salida.push(densa);
    }
    salida.excede = excede;   // propiedad de la rejilla: leerLibro la pasa a la hoja
    return salida;
  }

  /**
   * Lee un .xlsx completo. `opciones.inflar`: async (Uint8Array) => Uint8Array
   * para las partes DEFLATE (ver cabecera).
   * @returns {Promise<{hojas: Array<{nombre: string, filas: Array<Array>}>}>}
   */
  async function leerLibro(bytes, opciones = {}) {
    const zip = leerZip(bytes);
    const inflar = opciones.inflar;
    const texto = async (nombre) => {
      const b = await zip.extraer(nombre, inflar);
      return b ? decodificarUtf8(b) : null;
    };

    const workbook = await texto("xl/workbook.xml");
    if (!workbook) throw new Error("El archivo no es un .xlsx: falta xl/workbook.xml.");
    const rels = (await texto("xl/_rels/workbook.xml.rels")) || "";
    const relPorId = {};
    for (const m of rels.matchAll(/<Relationship\b[^>]*Id="([^"]+)"[^>]*Target="([^"]+)"[^>]*\/>/g)) {
      relPorId[m[1]] = m[2];
    }
    // segundo intento con el orden de atributos invertido (Target antes de Id)
    for (const m of rels.matchAll(/<Relationship\b[^>]*Target="([^"]+)"[^>]*Id="([^"]+)"[^>]*\/>/g)) {
      if (!relPorId[m[2]]) relPorId[m[2]] = m[1];
    }

    const compartidas = parsearSharedStrings(await texto("xl/sharedStrings.xml"));

    const hojas = [];
    const presupuesto = { celdas: Number.isFinite(opciones.maxCeldas) ? opciones.maxCeldas : MAX_CELDAS_LIBRO };
    let indice = 0;
    for (const m of workbook.matchAll(/<sheet\b([^>]*?)\/>/g)) {
      indice++;
      const nombre = desescaparXml((/name="([^"]*)"/.exec(m[1]) || [])[1] || `Hoja${indice}`);
      const rid = (/r:id="([^"]+)"/.exec(m[1]) || [])[1];
      let destino = rid && relPorId[rid] ? relPorId[rid] : `worksheets/sheet${indice}.xml`;
      destino = destino.replace(/^\//, "").replace(/^xl\//, "");
      const xmlHoja = await texto(`xl/${destino}`);
      const rejilla = xmlHoja ? parsearHoja(xmlHoja, compartidas, presupuesto) : [];
      hojas.push({ nombre, filas: rejilla, excede: rejilla.excede === true });
    }
    if (!hojas.length) throw new Error("El libro no declara ninguna hoja.");
    return { hojas };
  }

  /* ─────────────────────────── CSV ─────────────────────────────────────
     MISMA semántica que `parsearCsv` de public/onboarding.js, incluida la regla
     que allí costó un defecto real: una comilla solo ABRE campo al PRINCIPIO de
     la celda (RFC 4180) — «Tubería de 4" en PVC» a mitad de celda es texto.
     Hay una prueba que ejecuta las dos copias sobre los mismos fragmentos. */
  function parsearCsv(crudo) {
    const texto = String(crudo || "").replace(/^﻿/, ""); // BOM del Excel
    const primeraUtil = texto.split(/\r\n|\r|\n/).find((l) => l.trim() && !l.trim().startsWith("#")) || "";
    const sep = primeraUtil.split(";").length > primeraUtil.split(",").length ? ";" : ",";
    const filas = [];
    let fila = [], celda = "", enComillas = false;
    const cerrarCelda = () => { fila.push(celda); celda = ""; };
    const cerrarFila = () => {
      cerrarCelda();
      const completa = fila;
      fila = [];
      const primera = String(completa[0] || "").trim();
      if (completa.length === 1 && !primera) return;   // línea vacía
      if (primera.startsWith("#")) return;             // comentario del formato
      filas.push(completa);
    };
    for (let i = 0; i < texto.length; i++) {
      const c = texto[i];
      if (enComillas) {
        if (c === '"') {
          if (texto[i + 1] === '"') { celda += '"'; i++; } else enComillas = false;
        } else celda += c;
      } else if (c === '"' && celda === "") {
        enComillas = true;
      } else if (c === sep) cerrarCelda();
      else if (c === "\n") cerrarFila();
      else if (c !== "\r") celda += c;
    }
    if (celda !== "" || fila.length) cerrarFila();
    return filas;
  }

  /* ──────────── detección de la tabla de ítems en una rejilla ──────────
     Sirve igual para la rejilla de un .xlsx y para la de un .csv. Devuelve
     SIEMPRE {filas, avisos, cabecera}: «no encontré tabla» es un resultado con
     filas vacías y el porqué en avisos, no una excepción. */
  const normCab = (s) => String(s == null ? "" : s)
    .normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase().replace(/[^A-Z0-9 ]/g, " ").trim();

  const RE_UNIDAD = /^UN[UI]DAD(ES)?$|^UND$|^UN$|^U M$|^UM$/;          // «UNUDAD»: errata real del corpus
  const RE_CANTIDAD = /^CANT(IDAD(ES)?)?$|^CANT\b/;
  const RE_PRECIO = /VALOR\s*UNIT|VR\s*UNIT|PRECIO\s*UNIT|^UNITARIO$/;
  const RE_TOTAL = /VALOR\s*TOTAL|VR\s*TOTAL|^TOTAL$/;
  const RE_DESC = /^DESCRIPCION|^ACTIVIDAD|^ITEM\b.*DESCRIP|^CONCEPTO$|^DETALLE$/;
  // columnas OPCIONALES de subcontrato: «SUBCONTRATADO» (Sí/X/1) y «AIU SUB» (%)
  const RE_SUB = /^SUBCONTRAT/;
  const RE_AIU_SUB = /AIU.*SUB|SUB.*AIU/;

  function buscarCabecera(grid) {
    for (let i = 0; i < Math.min(grid.length, 60); i++) {
      const fila = grid[i] || [];
      let cUnidad = -1, cCantidad = -1, cPrecio = -1, cTotal = -1, cDesc = -1, cSub = -1, cAiuSub = -1;
      fila.forEach((celda, j) => {
        const t = normCab(celda);
        if (!t) return;
        if (cUnidad < 0 && RE_UNIDAD.test(t)) cUnidad = j;
        if (cCantidad < 0 && RE_CANTIDAD.test(t)) cCantidad = j;
        if (cAiuSub < 0 && RE_AIU_SUB.test(t)) { cAiuSub = j; return; } // «AIU SUB» no es ni precio ni «subcontratado»
        if (cPrecio < 0 && RE_PRECIO.test(t)) cPrecio = j;
        if (cTotal < 0 && RE_TOTAL.test(t)) cTotal = j;
        if (cDesc < 0 && RE_DESC.test(t)) cDesc = j;
        if (cSub < 0 && RE_SUB.test(t)) cSub = j;
      });
      if (cUnidad >= 0 && cCantidad >= 0) {
        // sin columna rotulada de descripción, es la inmediatamente a la
        // izquierda de la unidad (el layout universal del formulario)
        if (cDesc < 0) cDesc = Math.max(0, cUnidad - 1);
        const cCodigo = cDesc > 0 ? 0 : -1;
        return { fila: i, codigo: cCodigo, descripcion: cDesc, unidad: cUnidad, cantidad: cCantidad, precio: cPrecio, total: cTotal, subcontratado: cSub, aiu_sub: cAiuSub };
      }
    }
    return null;
  }

  const esFilaDeCabecera = (fila, cab) => {
    const u = normCab(fila[cab.unidad]);
    const c = normCab(fila[cab.cantidad]);
    return (RE_UNIDAD.test(u) && RE_CANTIDAD.test(c));
  };

  function numeroDeCelda(v) {
    if (typeof v === "number") return Number.isFinite(v) ? v : null;
    return numeroLocal(v);
  }

  /* ══════════ QUÉ CLASE DE FILA DE TOTAL ES UN RÓTULO · REGLA ÚNICA ══════════
     La comparten los DOS lectores de formularios de cantidades del proyecto:
     este (celdas de una hoja) y `lib/apu_pliego.js` (líneas de texto de un PDF).
     Sustratos distintos, MISMA pregunta. Estaba solo aquí, enterrada en
     `detectarFilasApu`, y el lector de pliegos no la tenía: metía «COSTO
     DIRECTO 15.000.000» como SUBTOTAL del último capítulo, que salía
     «no_cuadra» por la diferencia con los demás capítulos, y de paso perdía el
     total del documento. Dos definiciones de «esta fila es el total» divergen
     a la primera corrección, y aquí serían pesos.

     Canoniza internamente porque los dos llamadores normalizan distinto
     (`normCab` sube a mayúsculas, el `norm` de lib/semantica baja a minúsculas):
     una función compartida no puede depender de cuál de los dos la llame.

     Devuelve:
       "costo_directo"     COSTO(S) DIRECTO(S) — es la suma de ítems POR
                           DEFINICIÓN, y manda sobre cualquier otro rótulo.
       "total_documento"   un TOTAL a secas ANTES de que aparezca el AIU.
       "precio_con_aiu"    ese mismo TOTAL pero DESPUÉS del AIU: ya no es la
                           suma de los ítems, así que no sirve de ancla.
       "subtotal_capitulo" SUBTOTAL, o un TOTAL que nombra su capítulo.
       "aiu"               la fila que enciende `vistoAiu`.
       null                no es una fila de total reconocible; el llamador
                           decide, y así los rótulos que hoy trata de otra
                           manera siguen tratándose igual. */
  function clasificarRotuloTotal(texto, opciones) {
    const d = String(texto == null ? "" : texto)
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase()
      .replace(/[^A-Z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
    if (!d) return null;
    if (/^(A ?I ?U|ADMINISTRACION|IMPREVISTOS|UTILIDAD|IVA)\b/.test(d)) return "aiu";
    if (/^(TOTAL |SUBTOTAL )?COSTOS? DIRECTOS?\b/.test(d)) return "costo_directo";
    if (/^SUBTOTAL\b/.test(d)) return "subtotal_capitulo";
    /* SIN «VALOR TOTAL» A PROPÓSITO (19-oct-2026). Esta función la comparte el lector de PDF (lib/apu_pliego) y allí un «VALOR TOTAL» al final de cada
       capítulo es el subtotal de ESE capítulo: reconocerlo como total del documento hacía que los capítulos quedaran «sin_datos» y que un pliego con
       solo esos totales diera un «no cuadra» falso. El Excel reconoce «VALOR TOTAL» en su propia detección (`RE_TOTAL_SECO`, más abajo), no aquí. */
    if (/^TOTAL(\s+GENERAL|\s+PRESUPUESTO)?$/.test(d)) {
      return opciones && opciones.vistoAiu ? "precio_con_aiu" : "total_documento";
    }
    if (/^TOTAL\b/.test(d)) return "subtotal_capitulo";
    return null;
  }

  function detectarFilasApu(grid) {
    const avisos = [];
    if (!Array.isArray(grid) || !grid.length) {
      return { filas: [], avisos: ["La hoja está vacía."], cabecera: null };
    }
    const cab = buscarCabecera(grid);
    if (!cab) {
      return {
        filas: [], cabecera: null,
        avisos: ["No se encontró la fila de cabecera (necesita al menos las columnas UNIDAD y CANTIDAD). Revise que la hoja sea el formulario de cantidades."],
      };
    }

    const filas = [];
    /* Capítulos a DOS niveles: los formularios reales anidan «SALÓN 216» (fila
       suelta en la primera columna) y dentro «SALIDAS ILUMINACIÓN» (fila con
       descripción sin unidad ni cantidad). Un solo nivel perdía el mayor de los
       dos en cuanto aparecía el menor, y el Excel exportado agrupaba «SALIDAS
       ILUMINACIÓN» de tres salones distintos como si fueran el mismo capítulo. */
    let capMayor = null, capMenor = null;
    /* El nivel mayor del PRIMER bloque suele ir justo ENCIMA de la cabecera
       («CAFETERÍA» y debajo la fila UNIDAD/CANTIDAD): se siembra con la fila de
       solo-texto ADYACENTE. Solo la adyacente — subir más agarraría el título
       del documento y todos los ítems del primer bloque nacerían con un
       capítulo que no es un capítulo. */
    if (cab.fila > 0) {
      const previa = grid[cab.fila - 1] || [];
      const textoPrevia = String(previa[0] ?? "").trim();
      const restoVacio = previa.slice(1).every((c) => c == null || String(c).trim() === "");
      if (textoPrevia && restoVacio) capMayor = textoPrevia;
    }
    let sinCantidad = 0, precioCero = 0;
    /* CUADRE DE CONTROL: el archivo suele declarar su propio total («COSTO
       DIRECTO», «TOTAL COSTOS DIRECTOS», o un «TOTAL» ANTES de las filas de
       AIU). Se captura para compararlo con la suma de los ítems leídos: un
       subtotal contado como ítem, un capítulo saltado o una cantidad mal
       leída inflan o encogen el presupuesto EN SILENCIO, y la comparación es
       la única señal barata de que la lectura se dejó algo. Reglas:
       · «COSTO(S) DIRECTO(S)» manda (es la suma de ítems por definición);
       · un «TOTAL» a secas solo vale si NO ha aparecido antes una fila de
         AIU/IVA (después de ellas, «TOTAL» es el precio con AIU, no la suma);
       · «SUBTOTAL» es de capítulo y NO es el total del archivo;
       · el valor sale de la columna VR TOTAL si existe; si no, de la última
         celda numérica de la fila. Sin valor legible → no hay referencia. */
    /* «VALOR TOTAL» ES EL TOTAL (19-oct-2026). El Formulario 1 del documento tipo de Colombia Compra lo
       rotula así («VALOR TOTAL» en la columna de descripción y la cifra varias columnas a la derecha), y
       sin este rótulo el cuadre salía «sin_referencia» en 201 de 325 Excel reales de procesos abiertos: se
       leían los ítems y no había con qué contrastarlos. Sigue valiendo todo lo de arriba: después de una
       fila de AIU/IVA es el precio con AIU y no sirve de ancla. */
    /* EL «VALOR TOTAL» CON SUFIJO Y LOS VALORES FIJOS FUERA DE LOS ÍTEMS (25-oct-2026, Fase 0 de detekta-lector sobre 9 Formularios
       reales de menor cuantía y 84 de procesos abiertos). Dos causas tapaban la mayoría de los «no se da por leído»:
       · la entidad rotula el total «VALOR TOTAL PROYECTOS», «VALOR TOTAL DE OBRA», «VALOR TOTAL CONTRATO…» y el lector no lo veía
         («sin total declarado», 19 de 25 Formularios de menor cuantía que no pasaban). Se acepta el sufijo salvo que nombre una PARTE
         (capítulo, ítem, lote, parcial, unitario, «sin IVA», AIU), y un «VALOR TOTAL» a secas que venga después lo reemplaza.
       · entre el subtotal de los ítems y el «VALOR TOTAL» va un VALOR FIJO que no es ítem —«VALOR PMT (INMODIFICABLE)», «PGIO»,
         «PLAN DE MANEJO DE TRÁNSITO»— y los ítems «no sumaban el total» (B, C, D y H de la Fase 0: 4 de 9). Esas filas se ANOTAN como
         candidatas y `cuadreDeControl` las acepta solo si van después del último ítem, antes del total, e ítems + fijos DA el total. */
    let totalDeclarado = null, vistoAiu = false;
    const candidatosFijos = [];
    /* un «VALOR TOTAL» que viene DESPUÉS de un COSTO DIRECTO explícito no lo reemplaza, pero se anota: si es mayor, entre los dos puede ir el
       valor fijo (PMT) que el costo directo no incluye y la oferta sí (revisión adversaria, 25-oct-2026: antes el PMT se callaba) */
    let totalPosterior = null;
    const totalesConSufijo = [];   // «VALOR TOTAL ZONA 1», «VALOR TOTAL ZONA 2»: dos cifras distintas y ninguna general no son un total
    const RE_COSTO_DIRECTO = /^(TOTAL\s+|SUBTOTAL\s+)?COSTOS?\s+DIRECTOS?\b/;
    const RE_TOTAL_SECO = /^(VALOR\s+)?TOTAL(\s+GENERAL|\s+PRESUPUESTO)?$/;
    const RE_VALOR_TOTAL_SUFIJO = /^VALOR\s+TOTAL\s+(?!.*\b(?:CAPITULOS?|CAP|ITEMS?|LOTES?|PARCIAL|UNITARIOS?|FILA|A\s?I\s?U|I\s?V\s?A|ANTES|ETAPAS?|FASES?|ZONAS?|GRUPOS?|TRAMOS?|SEDES?|FRENTES?|BLOQUES?|SECTOR(?:ES)?|MODULOS?|COMPONENTES?|ALTERNATIVAS?|INTERVENTORIA)\b)[A-Z0-9 ]+$/;
    /* la fila del AIU o del IVA, también escrita con puntos o abreviada («I.V.A. 19%», «VALOR A.I.U. 30%», «ADMON», «IMPREV», «UTIL»,
       «IMPREVISTO (I)»): normCab quita la puntuación y deja «I V A», que antes no casaba, y una fila de impuesto se publicaba como «valor
       fijo» con el aviso de sumarla a la oferta (revisión adversaria, 25-oct-2026) */
    const RE_AIU_FILA = /^(?:VALOR\s+|TOTAL\s+|PORCENTAJE\s+|MAS\s+)?(?:A\s?I\s?U|A\s?U|I\s?V\s?A|ADMON|ADMINISTRACION|IMPREV(?:ISTOS?)?|UTIL(?:IDAD(?:ES)?)?)\b/;
    const valorTotalDeFila = (f) => {
      if (cab.total >= 0) { const v = numeroDeCelda(f[cab.total]); if (v != null && v > 0) return v; }
      for (let j = f.length - 1; j >= 0; j--) { const v = numeroDeCelda(f[j]); if (v != null && v > 0) return v; }
      return null;
    };
    /* la cifra de un valor fijo: la columna VR TOTAL si la hoja la tiene; si no, la última celda numérica A LA DERECHA de la descripción
       (el «1» de la columna de código de un título de capítulo no es un valor fijo) */
    const valorFijoDeFila = (f) => {
      if (cab.total >= 0) { const v = numeroDeCelda(f[cab.total]); return v != null && v > 0 ? v : null; }
      for (let j = f.length - 1; j > cab.descripcion; j--) { const v = numeroDeCelda(f[j]); if (v != null && v > 0) return v; }
      return null;
    };
    for (let i = cab.fila + 1; i < grid.length; i++) {
      const f = grid[i] || [];
      if (esFilaDeCabecera(f, cab)) {
        // la cabecera repetida de una sección lleva a veces el TÍTULO de la
        // sección en la columna de descripción («1 | RED FUERZA | UNIDAD | …»)
        const titulo = String(f[cab.descripcion] ?? "").trim();
        if (titulo && !RE_DESC.test(normCab(titulo))) capMenor = titulo;
        continue;
      }
      const desc = String(f[cab.descripcion] ?? "").trim();
      const unidad = String(f[cab.unidad] ?? "").trim();
      const cantidad = numeroDeCelda(f[cab.cantidad]);
      const precio = cab.precio >= 0 ? numeroDeCelda(f[cab.precio]) : null;
      const totalFila = cab.total >= 0 ? numeroDeCelda(f[cab.total]) : null;
      const codigo = cab.codigo >= 0 ? String(f[cab.codigo] ?? "").trim() : "";

      /* Una fila de TOTAL («COSTO DIRECTO 300.000», «SUBTOTAL CAPÍTULO 1 …»,
         «AIU 25 % …») va SIN unidad, igual que un título de capítulo, y antes
         caía en la rama del título: «COSTO DIRECTO» se volvía capítulo de la
         nada. Se distingue por lo único que las separa: la fila de total trae
         un NÚMERO fuera de las columnas de código/descripción; el título, solo
         texto. El rótulo puede venir en la columna de descripción o en la de
         código («SUBTOTAL CAPITULO 1 | | | | | 100.000»). */
      const RE_TOTALES = /^(COSTOS?\s|VALOR\s+TOTAL\b|TOTAL\b|SUBTOTAL\b|ADMINISTRACION\b|IMPREVISTOS\b|UTILIDAD\b|IVA\b|A\s?I\s?U\b|PRECIO\s+FINAL\b|(?:VALOR\s+|TOTAL\s+|PORCENTAJE\s+|MAS\s+)?(?:A\s?I\s?U|A\s?U|I\s?V\s?A|ADMON|IMPREV(?:ISTOS?)?|UTIL(?:IDAD(?:ES)?)?)\b)/;
      const rotulo = desc || codigo;
      const tieneNumero = f.some((c, j) => j !== cab.codigo && j !== cab.descripcion && (numeroDeCelda(c) || 0) > 0);
      const esFilaTotal = !!rotulo && !unidad && RE_TOTALES.test(normCab(rotulo)) && (tieneNumero || cantidad != null);
      if (esFilaTotal) {
        const d = normCab(rotulo);
        if (RE_AIU_FILA.test(d)) vistoAiu = true;
        const esCostoDirecto = RE_COSTO_DIRECTO.test(d);
        const esSeco = RE_TOTAL_SECO.test(d), conSufijo = !esSeco && RE_VALOR_TOTAL_SUFIJO.test(d);
        if (esCostoDirecto || ((esSeco || conSufijo) && !vistoAiu)) {
          const v = valorTotalDeFila(f);
          if (v != null && conSufijo) totalesConSufijo.push(v);
          if (v != null && !esCostoDirecto && totalDeclarado && totalDeclarado.explicito && !totalPosterior && i > totalDeclarado.fila) totalPosterior = { valor: v, etiqueta: rotulo, fila: i };
          // el «COSTO DIRECTO» explícito reemplaza a un «TOTAL» seco leído antes, y un «VALOR TOTAL» a secas a uno con sufijo
          // («VALOR TOTAL ETAPA 1» no es el total del archivo si después viene el «VALOR TOTAL»); nunca al revés
          if (v != null && (totalDeclarado == null || (esCostoDirecto && !totalDeclarado.explicito) || (esSeco && totalDeclarado.sufijo))) {
            totalDeclarado = { valor: v, etiqueta: rotulo, fila: i, explicito: esCostoDirecto, sufijo: conSufijo };
          }
        }
        continue;
      }
      // fila de sección/capítulo: texto sin unidad ni cantidad. El título
      // suelto en la primera columna («SALÓN 216…») es el nivel MAYOR y
      // reinicia el menor; la descripción sin unidad es el nivel MENOR
      /* el rótulo del valor fijo fuera de la columna de descripción (censo del 25-oct-2026: «PMA | 29.406.605» con el rótulo en la columna
         del precio, «PLAN DE MANEJO AMBIENTAL PMA» en la del número): una fila sin descripción, sin unidad ni cantidad, con UN solo texto y
         la cifra en la columna VR TOTAL, se anota con ese texto como rótulo; decide `cuadreDeControl` (la lista de rótulos y la cuenta) */
      if (!desc && !unidad && cantidad == null) {
        const textos = f.map((c) => (typeof c === "string" ? c.trim() : "")).filter((t) => t && numeroDeCelda(t) == null);
        const vFijo = textos.length === 1 ? valorFijoDeFila(f) : null;
        if (vFijo != null) candidatosFijos.push({ fila: i, etiqueta: textos[0], valor: vFijo });
      }
      const soloTitulo = !desc && codigo && !unidad && cantidad == null;
      if (soloTitulo) { capMayor = codigo; capMenor = null; continue; }
      if (desc && !unidad && cantidad == null) {
        /* una fila con rótulo y cifra, sin unidad ni cantidad ni precio, que no es total: candidata a VALOR FIJO fuera de los ítems
           («VALOR PMT (INMODIFICABLE)», «PGIO»). Solo se anota con su fila; decide `cuadreDeControl`. Sigue siendo, como antes,
           el título del capítulo menor: una fila que no resulte fijo no cambia nada de lo que ya hacía. */
        const vFijo = valorFijoDeFila(f);
        // con columna VR TOTAL la cifra va ahí y la de precio tiene que estar vacía; sin esa columna, la única columna de dinero es la del precio
        // …salvo que lo que hay en la columna del precio sea una TASA («0,039» del PGIO como % del subtotal), que no es un precio (censo del 25-oct-2026)
        if (vFijo != null && (precio == null || cab.total < 0 || (precio > 0 && precio < 1))) candidatosFijos.push({ fila: i, etiqueta: desc, valor: vFijo });
        capMenor = desc; continue;
      }
      if (!desc) continue;
      // filas de totales sin número («COSTOS DIRECTOS», «TOTAL»… con la celda vacía) no son ítems
      if (RE_TOTALES.test(normCab(desc)) && !unidad) continue;

      if (cantidad == null) sinCantidad++;
      /* un precio en 0 NO es un precio: es «sin dato» (la regla de
         anticipo_pct = 0). La fila viaja sin precio y el que calcula decide. */
      const precioUtil = precio != null && precio > 0 ? precio : null;
      if (precio === 0) precioCero++;
      // subcontrato (columnas opcionales): «Sí»/«X»/«1»/«true» marca; el % del
      // AIU del sub va aparte y solo tiene sentido si la fila está marcada
      const subTxt = cab.subcontratado >= 0 ? normCab(f[cab.subcontratado]) : "";
      const subcontratado = cab.subcontratado >= 0 ? /^(SI|S|X|1|TRUE|SUB|SUBCONTRATADO)$/.test(subTxt) : false;
      const aiuSubCrudo = cab.aiu_sub >= 0 ? numeroDeCelda(f[cab.aiu_sub]) : null;
      const aiuSub = subcontratado && aiuSubCrudo != null && aiuSubCrudo >= 0 ? aiuSubCrudo : null;

      filas.push({
        fila_excel: i + 1,                              // la cita: la rejilla es densa, así que índice + 1 es el número de fila de la hoja
        codigo: codigo || null,
        capitulo: [capMayor, capMenor].filter(Boolean).join(" · ") || null,
        descripcion: desc,
        unidad: unidad || null,
        cantidad,                                       // null si ilegible: NUNCA 0
        precio_archivo: precioUtil,
        // VR TOTAL del archivo, solo para el cuadre de control (0 = sin dato)
        ...(totalFila != null && totalFila > 0 ? { total_archivo: totalFila } : {}),
        ...(subcontratado ? { subcontratado: true, aiu_subcontratista_pct: aiuSub } : {}),
      });
    }

    if (!filas.length) avisos.push("Se encontró la cabecera pero ninguna fila de ítem debajo.");
    if (sinCantidad) avisos.push(`${sinCantidad} fila(s) sin cantidad legible: viajan con cantidad vacía, nunca con 0.`);
    if (precioCero) avisos.push(`${precioCero} fila(s) traen precio 0 en el archivo: se tratan como SIN precio (un 0 no es un precio).`);
    /* dos o más «VALOR TOTAL <parte>» con cifras distintas y ningún total general (zonas, grupos, sedes): no se sabe cuál es el total
       del archivo, y quedarse con el primero publicaba la primera parte como si fuera todo (revisión adversaria, 25-oct-2026) */
    if (totalDeclarado && totalDeclarado.sufijo && new Set(totalesConSufijo).size >= 2) {
      avisos.push(`El archivo trae ${new Set(totalesConSufijo).size} filas «VALOR TOTAL …» con cifras distintas y ninguna general: no se sabe cuál es el total del documento.`);
      totalDeclarado = null;
    }
    const cuadre = cuadreDeControl(filas, totalDeclarado, candidatosFijos, totalPosterior);
    if (cuadre.estado === "no_cuadra" && cuadre.total_posterior) {
      avisos.push(`Cuadre de control: los ${cuadre.filas_sumadas} ítems leídos suman ${pesos(cuadre.suma_items)}, el costo directo, pero el archivo declara más abajo «${cuadre.total_posterior.etiqueta}» ${pesos(cuadre.total_posterior.valor)} y las filas intermedias no explican la diferencia${cuadre.fijos_no_reconocidos.length ? ` («${cuadre.fijos_no_reconocidos.join("», «")}» no son un valor fijo reconocido)` : ""}. Revise qué suma la entidad entre el costo directo y el total antes de calcular nada.`);
    } else if (cuadre.estado === "cuadra" && cuadre.valores_fijos.length) {
      avisos.push(`El archivo trae ${cuadre.valores_fijos.length} valor(es) fijo(s) fuera de los ítems (${cuadre.valores_fijos.map((x) => `${x.etiqueta} ${pesos(x.valor)}`).join("; ")}): los ítems suman ${pesos(cuadre.suma_items)} y con esos valores dan el total «${totalDeclarado.etiqueta}» ${pesos(cuadre.total_declarado)}. No son ítems y no entran a la tabla: súmelos tal cual a su oferta.`);
    } else if (cuadre.estado === "no_cuadra") {
      avisos.push(`Cuadre de control: los ${cuadre.filas_sumadas} ítems leídos suman ${pesos(cuadre.suma_items)} y el archivo declara «${totalDeclarado.etiqueta}» ${pesos(cuadre.total_declarado)} (diferencia ${pesos(cuadre.desviacion)}, ${cuadre.desviacion_pct.toFixed(2)} %)${cuadre.fijos_descartados ? `, ni sumando las ${cuadre.fijos_descartados} fila(s) con cifra que hay entre los ítems y el total${cuadre.fijos_no_reconocidos.length ? ` («${cuadre.fijos_no_reconocidos.join("», «")}» no son un valor fijo reconocido: PMT, PGIO, plan de manejo, provisión…)` : ""}` : ""}. Revise si falta un capítulo, sobra una fila o una cantidad se leyó mal antes de calcular nada.`);
    } else if (cuadre.estado === "no_comparable") {
      avisos.push(`Cuadre de control: el archivo declara «${totalDeclarado.etiqueta}» ${pesos(cuadre.total_declarado)} pero ${cuadre.filas_sin_valor} de ${filas.length} ítems no traen valor total legible: la suma no se puede comparar.`);
    }
    return { filas, avisos, cabecera: cab, cuadre };
  }

  const pesos = (n) => "$" + Math.round(n).toLocaleString("es-CO");
  /* Compara la suma de los ítems leídos con el total que declara el archivo.
     Suma la columna VR TOTAL cuando la fila la trae; si no, cantidad × precio.
     Estados: «cuadra» (dentro del 0,5 %, la misma tolerancia de documento de
     lib/apu_pliego), «no_cuadra», «no_comparable» (hay total declarado pero
     ítems sin valor: comparar sería mentir) y «sin_referencia» (el archivo no
     declara total). NUNCA bloquea: es un aviso, y una tabla que no cuadra
     puede importarse igual — lo que no puede es importarse sin decirlo. */
  const TOL_CUADRE_REL = 0.005;
  /* `fijos` (25-oct-2026): las filas candidatas a VALOR FIJO fuera de los ítems ({fila: índice en la rejilla, etiqueta, valor}).
     Cuentan SOLO si los ítems solos no cuadran, van DESPUÉS del último ítem y ANTES de la fila del total, y ítems + fijos da el total
     dentro de la misma tolerancia. Lo que no cierra la cuenta no se inventa: queda «no_cuadra» y se dice cuántas filas se descartaron.
     Sin la fila de cada ítem y del total (una lectura sin posiciones) no hay fijos: la posición es lo que los separa de un capítulo. */
  /* QUÉ RÓTULO ES UN VALOR FIJO (revisión adversaria, 25-oct-2026). La posición y la aritmética solas dejaban pasar cualquier renglón que la
     entidad sume al total —una INTERVENTORÍA (contrato aparte), un ANTICIPO (no es un costo), un rótulo numérico, un título de capítulo con
     cifra, un ítem perdido—, y la aplicación le decía al contratista «súmelo tal cual». Medido en los 20 Formularios reales que cerraron la
     cuenta (A–I y el censo del 25-oct), el vocabulario de los fijos legítimos es corto y estable: PMT, PMA, PAGA, PGIO, plan de manejo
     (ambiental, de tránsito o tráfico), gestión integral, seguridad y salud (SST), provisión, componente, certificación RETIE o RETILAP,
     diseños y legalización, mitigación. Una fila que no case queda fuera y la lectura dice su rótulo; una que nombre un impuesto, el AIU,
     un anticipo, una interventoría, un descuento o un total nunca es un fijo. Lista cerrada a propósito: ampliarla cuesta una línea y una
     prueba; abrirla cuesta una oferta. */
  const RE_FIJO = /\b(?:PMT|PMA|PAGA|PGIO|PLAN|MANEJO|AMBIENTAL|SOCIAL|TRANSITO|TRAFICO|SST|SEGURIDAD|SALUD|PROVISION(?:ES)?|COMPONENTE|CERTIFICACION(?:ES)?|RETIE|RETILAP|DISENOS?|MITIGACION|SENALIZACION|INMODIFICABLE|FIJOS?|GLOBAL|GESTION|IMPLEMENTACION|LEGALIZACION)\b/;
  const RE_NO_FIJO = /\b(?:I\s?V\s?A|A\s?I\s?U|A\s?U|ADMON|ADMINISTRACION|IMPREV(?:ISTOS?)?|UTILIDAD(?:ES)?|UTIL|IMPUESTOS?|ANTICIPOS?|INTERVENTORIA|DESCUENTOS?|RETENCION(?:ES)?|ESTAMPILLAS?|SUBTOTAL|TOTAL|CAPITULOS?|CAP|ITEMS?)\b/;
  const esFijoReconocido = (etiqueta) => { const d = normCab(etiqueta); return /[A-Z]/.test(d) && RE_FIJO.test(d) && !RE_NO_FIJO.test(d); };

  /* `fijos`: las filas candidatas a VALOR FIJO ({fila: índice en la rejilla, etiqueta, valor}). `totalPosterior`: un «VALOR TOTAL» que el
     archivo declara DESPUÉS de un COSTO DIRECTO explícito. Reglas: los ítems solos mandan si dan el total al 0,01 % (lo que se publica);
     si no, cuentan los fijos RECONOCIDOS que van después del último ítem y antes de la fila del total, y solo si ítems + fijos da el total
     (0,5 %) y mejor que los ítems solos. Con un costo directo explícito y un «VALOR TOTAL» mayor más abajo, el total del archivo es ese y la
     cuenta tiene que cerrar con los fijos del tramo; si no cierra, no cuadra (antes el PMT se callaba y la guía decía «la suma da el total»).
     Lo que no cierra no se inventa. Sin la fila de cada ítem y del total no hay fijos. */
  function cuadreDeControl(filas, totalDeclarado, fijos = [], totalPosterior = null) {
    let suma = 0, sumadas = 0, sinValor = 0, ultimaFilaItem = -1;
    for (const f of filas) {
      if (Number.isInteger(f.fila_excel)) ultimaFilaItem = Math.max(ultimaFilaItem, f.fila_excel - 1);
      let v = f.total_archivo != null ? f.total_archivo : null;
      if (v == null && f.cantidad != null && f.precio_archivo != null) v = f.cantidad * f.precio_archivo;
      if (v == null) { sinValor++; continue; }
      suma += v; sumadas++;
    }
    const base = { suma_items: sumadas ? suma : null, filas_sumadas: sumadas, filas_sin_valor: sinValor,
      total_declarado: totalDeclarado ? totalDeclarado.valor : null, etiqueta_total: totalDeclarado ? totalDeclarado.etiqueta : null,
      fila_total: totalDeclarado && Number.isInteger(totalDeclarado.fila) ? totalDeclarado.fila + 1 : null,
      tolerancia_rel: TOL_CUADRE_REL, valores_fijos: [], suma_fijos: 0, fijos_descartados: 0, fijos_no_reconocidos: [], total_posterior: null };
    if (!totalDeclarado) return { ...base, estado: "sin_referencia", desviacion: null, desviacion_pct: null };
    if (sinValor > 0 || !sumadas) return { ...base, estado: "no_comparable", desviacion: null, desviacion_pct: null };
    const candidatos = Array.isArray(fijos) ? fijos.filter((x) => x && Number.isInteger(x.fila) && typeof x.valor === "number" && Number.isFinite(x.valor) && x.valor > 0) : [];
    const etiquetaDe = (x) => String(x.etiqueta == null ? "" : x.etiqueta).slice(0, 120);
    const enTramo = (desde, hasta) => (Number.isInteger(desde) && desde >= 0 && Number.isInteger(hasta) ? candidatos.filter((x) => x.fila > desde && x.fila < hasta) : []);
    const pctDe = (s, t) => (t > 0 ? (Math.abs(s - t) / t) * 100 : null);
    const conFijos = (lista, objetivo) => {
      const reconocidos = lista.filter((x) => esFijoReconocido(x.etiqueta)), noReconocidos = lista.filter((x) => !esFijoReconocido(x.etiqueta));
      const sumaFijos = reconocidos.reduce((s, x) => s + x.valor, 0);
      return { reconocidos, noReconocidos, sumaFijos, pct: pctDe(suma + sumaFijos, objetivo), cierra: reconocidos.length > 0 && pctDe(suma + sumaFijos, objetivo) != null && pctDe(suma + sumaFijos, objetivo) / 100 <= TOL_CUADRE_REL };
    };
    const noRec = (c) => c.noReconocidos.map(etiquetaDe).map((e) => e.slice(0, 60)).slice(0, 5);
    const cuadraConFijos = (c, objetivo, etiqueta, fila) => ({ ...base, estado: "cuadra", total_declarado: objetivo, etiqueta_total: etiqueta, fila_total: fila + 1,
      desviacion: Math.abs(suma + c.sumaFijos - objetivo), desviacion_pct: c.pct, suma_fijos: c.sumaFijos, fijos_descartados: candidatos.length - c.reconocidos.length, fijos_no_reconocidos: noRec(c),
      valores_fijos: c.reconocidos.map((x) => ({ fila_excel: x.fila + 1, etiqueta: etiquetaDe(x), valor: x.valor })) });
    const t0 = totalDeclarado, pct0 = pctDe(suma, t0.valor), desv0 = Math.abs(suma - t0.valor);
    const exacto = pct0 != null && pct0 <= TOL_PUBLICAR_PCT, dentro = pct0 != null && pct0 / 100 <= TOL_CUADRE_REL;
    /* el hermano del costo directo: los ítems dan el COSTO DIRECTO, pero más abajo el archivo declara un «VALOR TOTAL» mayor (sin AIU en medio) */
    if ((exacto || dentro) && t0.explicito && totalPosterior && Number.isInteger(totalPosterior.fila) && totalPosterior.valor > t0.valor * (1 + TOL_CUADRE_REL)) {
      const c = conFijos(enTramo(t0.fila, totalPosterior.fila), totalPosterior.valor);
      if (c.cierra) return cuadraConFijos(c, totalPosterior.valor, totalPosterior.etiqueta, totalPosterior.fila);
      return { ...base, estado: "no_cuadra", desviacion: Math.abs(suma - totalPosterior.valor), desviacion_pct: pctDe(suma, totalPosterior.valor), fijos_descartados: candidatos.length, fijos_no_reconocidos: noRec(c),
        total_posterior: { valor: totalPosterior.valor, etiqueta: String(totalPosterior.etiqueta == null ? "" : totalPosterior.etiqueta).slice(0, 120), fila_excel: totalPosterior.fila + 1 } };
    }
    if (exacto) return { ...base, estado: "cuadra", desviacion: desv0, desviacion_pct: pct0 };
    const c = conFijos(enTramo(ultimaFilaItem, t0.fila), t0.valor);
    if (c.cierra && (pct0 == null || c.pct < pct0)) return cuadraConFijos(c, t0.valor, t0.etiqueta, t0.fila);
    if (dentro) return { ...base, estado: "cuadra", desviacion: desv0, desviacion_pct: pct0 };
    return { ...base, estado: "no_cuadra", desviacion: desv0, desviacion_pct: pct0, fijos_descartados: candidatos.length, fijos_no_reconocidos: noRec(c) };
  }

  /* la hoja con MÁS filas de ítem reconocibles gana; devolver la primera a
     ciegas fallaría con libros que traen una carátula antes del formulario */
  /* La hoja con MÁS filas de ítem reconocibles gana… salvo que otra CUADRE
     con su propio total declarado: el libro que exporta la app (y cualquier
     presupuesto profesional) trae la hoja «Presupuesto» (N ítems + COSTOS
     DIRECTOS) y una hoja «APU» con los insumos de cada ítem, que tiene MUCHAS
     más filas y ninguna es un ítem del presupuesto. Con «más filas gana», la
     app se reimportaba a sí misma leyendo la hoja equivocada. Una hoja cuya
     suma reproduce el total que declara es la tabla del presupuesto. */
  function elegirHoja(libro) {
    let mejor = null;
    /* …Y EL DESEMPATE NO PUEDE COLGAR SOLO DE «cuadra» (ago 2026). Basta con
       que UN ítem del presupuesto no traiga valor legible —estado normal y
       declarado: «con ítems sin valor no se compara, comparar sería mentir»—
       para que la hoja «Presupuesto» salga `no_comparable` y el desempate caiga
       otra vez en «más filas gana», que es exactamente como la hoja «APU» (una
       fila por INSUMO) volvía a ganar. La señal que de verdad separa las dos
       hojas es DECLARAR UN TOTAL: un presupuesto lo trae («COSTOS DIRECTOS»),
       una hoja de insumos no lo trae nunca. Se puntúa en tres escalones:
       cuadra > declara un total que sus filas no desmienten > número de filas.
       EL SEGUNDO ESCALÓN EXIGE QUE EL TOTAL NO ESTÉ DESMENTIDO (ago 2026):
       premiar el mero hecho de declarar un total dejaba que una hoja lateral de
       dos filas con un «COSTO DIRECTO» que NO cuadra le ganara a la hoja de
       presupuesto de doscientos ítems que no declara ninguno (gran total en
       celda combinada, que es corriente). Un total que sus propias filas
       contradicen es evidencia EN CONTRA de que esa hoja sea el presupuesto, no
       a favor; `no_cuadra` puntúa igual que no declarar nada y decide el número
       de filas. */
    const puntaje = (r) => [
      (r.cuadre && r.cuadre.estado === "cuadra") ? 1 : 0,
      (r.cuadre && r.cuadre.total_declarado != null && r.cuadre.estado !== "no_cuadra") ? 1 : 0,
      r.filas.length,
    ];
    const candidatas = [];   // TODAS las hojas con su lectura: quien publica solo (ambiguedadDelLibro) necesita saber qué más trae el libro
    for (const h of libro.hojas || []) {
      const r = detectarFilasApu(h.filas);
      candidatas.push({ hoja: h, resultado: r });
      if (!mejor) { mejor = { hoja: h, resultado: r }; continue; }
      const a = puntaje(r), b = puntaje(mejor.resultado);
      if (a[0] > b[0] || (a[0] === b[0] && (a[1] > b[1] || (a[1] === b[1] && a[2] > b[2])))) {
        mejor = { hoja: h, resultado: r };
      }
    }
    return mejor ? { ...mejor, candidatas } : mejor;
  }

  /* ══════════ ¿SE PUEDE DAR POR LEÍDO ESTE FORMULARIO? · LA PUERTA DE PUBLICAR ══════════
     (19-oct-2026, medido en 325 Excel reales de procesos abiertos: con «VALOR TOTAL» reconocido cuadran
     67, y de ellos 59 cumplen además la comprobación de fila). El cuadre de control suma la columna de
     TOTAL de cada fila contra el total que declara el archivo: prueba que no falta ni sobra una fila, pero
     NO que la cantidad leída sea la que paga la entidad. Para publicar un Formulario leído SOLO por la
     aplicación (sin que nadie lo mire) se exige además que en cada fila con cantidad, precio y total se
     cumpla cantidad × precio = total (1 %): una cantidad mal leída rompe esa igualdad y el cuadre no lo ve.
     Los 7 archivos que cuadran pero no pasan la fila son formularios cuyo total por fila lleva el AIU
     (el mismo 23,1 % o 25,7 % en todas): no son un error de lectura, pero no se pueden dar por buenos sin
     que alguien los mire, así que salen «sin verificar» y el usuario los carga en Precios, como hoy.
     Es una función pura: la llama el servidor sobre lo que leyó él y la prueba sobre cuadrículas. Nunca
     devuelve «publicable» con un motivo vacío para un caso dudoso: lo que no se pudo comprobar se dice. */
  const TOL_FILA_REL = 0.01;
  const MIN_FILAS_VERIFICABLES = 0.9;
  /* LA TOLERANCIA PARA PUBLICAR NO ES LA DEL AVISO (19-oct-2026). `cuadreDeControl` dice «cuadra» hasta el 0,5 % (la del PDF) porque
     es un aviso al usuario; publicar SIN que nadie lo mire exige más. Medido en los 67 Excel que cuadran: el ruido de redondeo llega a
     0,001 %, y el que dejaba un ítem fuera (archivo 0144: «CERTIFICACIÓN RETIE» y «RETILAP», leídos como título de capítulo) estaba en
     0,15 %. 0,01 % deja 10 veces de holgura sobre el redondeo y cierra ese caso. Lo que se escapa por debajo (un ítem de menos del 0,01 %
     del total) sigue sin verse: se dice en la memoria, no se esconde. */
  const TOL_PUBLICAR_PCT = 0.01;
  /* TOPE DE CORDURA (no es una norma): ninguna cifra de un presupuesto de obra pasa de un billón de billones de pesos mil veces; 1e15 deja
     un margen enorme sobre lo real y descarta lo fabricado («cantidad 1e300», que multiplicada por un precio «cuadra» con su total). */
  const CIFRA_MAX = 1e15;
  function verificarFormulario(lectura) {
    const filas = lectura && Array.isArray(lectura.filas) ? lectura.filas : [];
    const cuadre = lectura && lectura.cuadre ? lectura.cuadre : null;
    const no = (motivo) => ({ publicable: false, motivo, filas: filas.length, filas_verificadas: 0, total: cuadre ? cuadre.total_declarado : null });
    if (!filas.length || !cuadre) return no("no se leyó ninguna tabla de ítems");
    if (cuadre.estado !== "cuadra") {
      const porque = {
        sin_referencia: "el archivo no declara un total con el que contrastar la lectura",
        no_comparable: "hay ítems sin valor total legible: la suma no se puede comparar",
        no_cuadra: cuadre.total_posterior ? `los ítems suman el costo directo, pero el archivo declara más abajo «${cuadre.total_posterior.etiqueta}» ${pesos(cuadre.total_posterior.valor)} y las filas intermedias no explican la diferencia${cuadre.fijos_no_reconocidos && cuadre.fijos_no_reconocidos.length ? ` («${cuadre.fijos_no_reconocidos.join("», «")}» no son un valor fijo reconocido)` : ""}`
          : cuadre.fijos_descartados ? `los ítems leídos no suman el total que declara el archivo, ni sumándoles las ${cuadre.fijos_descartados} fila(s) con cifra que hay entre los ítems y el total${cuadre.fijos_no_reconocidos && cuadre.fijos_no_reconocidos.length ? ` («${cuadre.fijos_no_reconocidos.join("», «")}» no son un valor fijo reconocido: PMT, PGIO, plan de manejo, provisión…)` : ""}` : "los ítems leídos no suman el total que declara el archivo",
      };
      return no(porque[cuadre.estado] || "el cuadre de control no se pudo hacer");
    }
    if (!(cuadre.total_declarado > 0 && cuadre.total_declarado <= CIFRA_MAX)) return no("el total que declara el archivo no es una cifra positiva y razonable");
    let verificadas = 0, malas = 0;
    for (const f of filas) {
      /* una cantidad, un precio o un total NEGATIVO no es un presupuesto: (−2) × (−3) = 6 «cuadraría» y no lo es */
      if ((f.cantidad != null && (f.cantidad < 0 || f.cantidad > CIFRA_MAX)) || (f.precio_archivo != null && (f.precio_archivo < 0 || f.precio_archivo > CIFRA_MAX)) || (f.total_archivo != null && (f.total_archivo < 0 || f.total_archivo > CIFRA_MAX))) { verificadas++; malas++; continue; }
      if (f.cantidad == null || f.precio_archivo == null || f.total_archivo == null || !(f.total_archivo > 0)) continue;
      verificadas++;
      if (Math.abs(f.cantidad * f.precio_archivo - f.total_archivo) / f.total_archivo > TOL_FILA_REL) malas++;
    }
    const base = { filas: filas.length, filas_verificadas: verificadas, total: cuadre.total_declarado };
    if (!(cuadre.desviacion_pct != null && cuadre.desviacion_pct <= TOL_PUBLICAR_PCT)) return { ...base, publicable: false, motivo: `la suma de los ítems difiere del total del archivo en ${cuadre.desviacion_pct != null ? String(Number(cuadre.desviacion_pct.toFixed(4))).replace(".", ",") : "?"} %, más de lo que explica el redondeo (${String(TOL_PUBLICAR_PCT).replace(".", ",")} %): puede faltar un ítem` };
    if (!verificadas) return { ...base, publicable: false, motivo: "ninguna fila trae cantidad, precio y total para comprobar cantidad × precio" };
    if (verificadas < filas.length * MIN_FILAS_VERIFICABLES) return { ...base, publicable: false, motivo: `solo ${verificadas} de ${filas.length} filas traen cantidad, precio y total para comprobarlas` };
    if (malas) return { ...base, publicable: false, motivo: `${malas} de ${verificadas} filas no cumplen cantidad × precio = total (puede ser un total por fila con AIU): revíselo en el archivo` };
    return { ...base, publicable: true, motivo: null };
  }

  /* ══════════ ¿LA HOJA ELEGIDA ES TODO EL PRESUPUESTO? · LO QUE REVISÓ EL REVISOR ADVERSARIO (19-oct-2026) ══════════
     `elegirHoja` puntúa «cuadra» por delante de todo: una hoja pequeña con su propio total le gana a la hoja principal cuando el total
     de esta se llama «VALOR TOTAL PRESUPUESTO DE OBRA» y no lo reconoce. Medido en 325 Excel: el 0034 (hospital, 2.374 M) publicaba el plan
     de manejo ambiental (48 ítems, 5 %) y el 0100 (cinco entidades en cinco hojas) publicaba la de Cachipay. Para dar un Formulario por
     leído SIN que nadie lo mire, el libro no puede tener OTRA hoja con ítems que no sea una copia de la elegida:
       · una hoja con menos de 3 ítems no objeta (los análisis de un solo ítem, «1,1», «1,2»…: son el detalle de una fila);
       · una hoja con los MISMOS ítems en el mismo orden (y, donde ambas traen precio, el mismo precio) es una copia —la plantilla
         «PROPUESTA ECONOMICA» que el proponente llena— y no objeta;
       · lo demás objeta: otro frente, otro lote, un anexo con ítems distintos, o la misma lista con otros precios.
     Y la hoja elegida no puede llamarse como una del proponente: si el libro trae primero la «PROPUESTA ECONOMICA» llena, publicaría la
     oferta de un tercero como si fuera el presupuesto de la entidad. Devuelve null si no hay objeción, o el motivo en palabras. */
  const MIN_ITEMS_OTRA_HOJA = 3;
  const RE_HOJA_DEL_PROPONENTE = /\b(PROPUESTA|PROPONENTE|OFERENTE|OFERTA|OFERTADO)\b/;
  function ambiguedadDelLibro(elegida) {
    if (!elegida || !elegida.hoja || !elegida.resultado) return "el libro no tiene una hoja de ítems";
    const nombre = String(elegida.hoja.nombre || "");
    if (RE_HOJA_DEL_PROPONENTE.test(normCab(nombre))) return `la hoja con los ítems («${nombre}») parece del proponente y no de la entidad`;
    const excedidas = (elegida.candidatas || []).filter((c) => c.hoja && c.hoja.excede);
    if (excedidas.length) return `una hoja del libro («${excedidas[0].hoja.nombre}») trae celdas fuera de los límites de lectura: no se puede comprobar que el presupuesto esté completo`;
    const mias = elegida.resultado.filas || [];
    /* la plantilla del proponente TRUNCA las descripciones largas («…de oxidació»): una es prefijo de la otra y vale como la misma */
    const mismaDescripcion = (f, g) => { const a = normCab(f.descripcion), b = normCab(g.descripcion); return a === b || (Math.min(a.length, b.length) >= 20 && (a.startsWith(b) || b.startsWith(a))); };
    const mismoPrecio = (a, b) => a.precio_archivo == null || b.precio_archivo == null || Math.abs(a.precio_archivo - b.precio_archivo) <= 0.01 * Math.max(Math.abs(a.precio_archivo), Math.abs(b.precio_archivo));
    for (const c of elegida.candidatas || []) {
      if (c.hoja === elegida.hoja) continue;
      const otras = (c.resultado && c.resultado.filas) || [];
      if (otras.length < MIN_ITEMS_OTRA_HOJA) continue;
      const copia = otras.length === mias.length && otras.every((f, i) => mismaDescripcion(f, mias[i]) && mismoPrecio(f, mias[i]));
      if (!copia) return `el libro trae otra hoja con ítems («${c.hoja.nombre}», ${otras.length}) que no es copia de la elegida («${nombre}», ${mias.length}): no se sabe cuál es el presupuesto completo`;
    }
    return null;
  }

  return {
    leerLibro, leerZip, parsearCsv, detectarFilasApu, elegirHoja, clasificarRotuloTotal, verificarFormulario, cuadreDeControl, ambiguedadDelLibro,
    numeroLocal, indiceColumna, desescaparXml,
  };
});
