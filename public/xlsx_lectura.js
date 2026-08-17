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
    if (!/^[\s$.,\-+0-9]+$/.test(t)) return null;
    let cuerpo = t.replace(/[\s$+]/g, "");
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

  function parsearHoja(xml, compartidas) {
    const filas = [];
    let maxCol = 0;
    for (const mFila of xml.matchAll(/<row\b[^>]*?(?:\/>|>([\s\S]*?)<\/row>)/g)) {
      const numFila = (() => {
        const r = /r="(\d+)"/.exec(mFila[0]);
        return r ? parseInt(r[1], 10) : filas.length + 1;
      })();
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
        celdas[col] = valor;
        if (col + 1 > maxCol) maxCol = col + 1;
      }
      if (celdas.length) filas[numFila - 1] = celdas;
    }
    // rejilla densa: toda fila existe (vacía si el XML la saltó) y con null en los huecos
    const salida = [];
    for (let i = 0; i < filas.length; i++) {
      const f = filas[i] || [];
      const densa = new Array(maxCol).fill(null);
      for (let c = 0; c < f.length; c++) densa[c] = f[c] === undefined ? null : f[c];
      salida.push(densa);
    }
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
    let indice = 0;
    for (const m of workbook.matchAll(/<sheet\b([^>]*?)\/>/g)) {
      indice++;
      const nombre = desescaparXml((/name="([^"]*)"/.exec(m[1]) || [])[1] || `Hoja${indice}`);
      const rid = (/r:id="([^"]+)"/.exec(m[1]) || [])[1];
      let destino = rid && relPorId[rid] ? relPorId[rid] : `worksheets/sheet${indice}.xml`;
      destino = destino.replace(/^\//, "").replace(/^xl\//, "");
      const xmlHoja = await texto(`xl/${destino}`);
      hojas.push({ nombre, filas: xmlHoja ? parsearHoja(xmlHoja, compartidas) : [] });
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
    let totalDeclarado = null, vistoAiu = false;
    const RE_COSTO_DIRECTO = /^(TOTAL\s+|SUBTOTAL\s+)?COSTOS?\s+DIRECTOS?\b/;
    const RE_TOTAL_SECO = /^TOTAL(\s+GENERAL|\s+PRESUPUESTO)?$/;
    const RE_AIU_FILA = /^(A\s?I\s?U|ADMINISTRACION|IMPREVISTOS|UTILIDAD|IVA)\b/;
    const valorTotalDeFila = (f) => {
      if (cab.total >= 0) { const v = numeroDeCelda(f[cab.total]); if (v != null && v > 0) return v; }
      for (let j = f.length - 1; j >= 0; j--) { const v = numeroDeCelda(f[j]); if (v != null && v > 0) return v; }
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
      const RE_TOTALES = /^(COSTOS?\s|TOTAL\b|SUBTOTAL\b|ADMINISTRACION\b|IMPREVISTOS\b|UTILIDAD\b|IVA\b|A\s?I\s?U\b|PRECIO\s+FINAL\b)/;
      const rotulo = desc || codigo;
      const tieneNumero = f.some((c, j) => j !== cab.codigo && j !== cab.descripcion && (numeroDeCelda(c) || 0) > 0);
      const esFilaTotal = !!rotulo && !unidad && RE_TOTALES.test(normCab(rotulo)) && (tieneNumero || cantidad != null);
      if (esFilaTotal) {
        const d = normCab(rotulo);
        if (RE_AIU_FILA.test(d)) vistoAiu = true;
        const esCostoDirecto = RE_COSTO_DIRECTO.test(d);
        if (esCostoDirecto || (RE_TOTAL_SECO.test(d) && !vistoAiu)) {
          const v = valorTotalDeFila(f);
          // el «COSTO DIRECTO» explícito reemplaza a un «TOTAL» seco leído antes; nunca al revés
          if (v != null && (totalDeclarado == null || (esCostoDirecto && !totalDeclarado.explicito))) {
            totalDeclarado = { valor: v, etiqueta: rotulo, fila: i, explicito: esCostoDirecto };
          }
        }
        continue;
      }
      // fila de sección/capítulo: texto sin unidad ni cantidad. El título
      // suelto en la primera columna («SALÓN 216…») es el nivel MAYOR y
      // reinicia el menor; la descripción sin unidad es el nivel MENOR
      const soloTitulo = !desc && codigo && !unidad && cantidad == null;
      if (soloTitulo) { capMayor = codigo; capMenor = null; continue; }
      if (desc && !unidad && cantidad == null) { capMenor = desc; continue; }
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
    const cuadre = cuadreDeControl(filas, totalDeclarado);
    if (cuadre.estado === "no_cuadra") {
      avisos.push(`Cuadre de control: los ${cuadre.filas_sumadas} ítems leídos suman ${pesos(cuadre.suma_items)} y el archivo declara «${totalDeclarado.etiqueta}» ${pesos(cuadre.total_declarado)} (diferencia ${pesos(cuadre.desviacion)}, ${cuadre.desviacion_pct.toFixed(2)} %). Revise si falta un capítulo, sobra una fila o una cantidad se leyó mal antes de calcular nada.`);
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
  function cuadreDeControl(filas, totalDeclarado) {
    let suma = 0, sumadas = 0, sinValor = 0;
    for (const f of filas) {
      let v = f.total_archivo != null ? f.total_archivo : null;
      if (v == null && f.cantidad != null && f.precio_archivo != null) v = f.cantidad * f.precio_archivo;
      if (v == null) { sinValor++; continue; }
      suma += v; sumadas++;
    }
    const base = { suma_items: sumadas ? suma : null, filas_sumadas: sumadas, filas_sin_valor: sinValor,
      total_declarado: totalDeclarado ? totalDeclarado.valor : null, etiqueta_total: totalDeclarado ? totalDeclarado.etiqueta : null,
      tolerancia_rel: TOL_CUADRE_REL };
    if (!totalDeclarado) return { ...base, estado: "sin_referencia", desviacion: null, desviacion_pct: null };
    if (sinValor > 0 || !sumadas) return { ...base, estado: "no_comparable", desviacion: null, desviacion_pct: null };
    const desviacion = Math.abs(suma - totalDeclarado.valor);
    const pct = totalDeclarado.valor > 0 ? (desviacion / totalDeclarado.valor) * 100 : null;
    return { ...base, estado: pct != null && pct / 100 <= TOL_CUADRE_REL ? "cuadra" : "no_cuadra", desviacion, desviacion_pct: pct };
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
    const puntaje = (r) => [(r.cuadre && r.cuadre.estado === "cuadra") ? 1 : 0, r.filas.length];
    for (const h of libro.hojas || []) {
      const r = detectarFilasApu(h.filas);
      if (!mejor) { mejor = { hoja: h, resultado: r }; continue; }
      const [a1, a2] = puntaje(r), [b1, b2] = puntaje(mejor.resultado);
      if (a1 > b1 || (a1 === b1 && a2 > b2)) mejor = { hoja: h, resultado: r };
    }
    return mejor;
  }

  return {
    leerLibro, leerZip, parsearCsv, detectarFilasApu, elegirHoja,
    numeroLocal, indiceColumna, desescaparXml,
  };
});
