/* ============================================================================
   pdf_texto · extractor de texto POSICIONAL de un PDF, en Node puro
   ----------------------------------------------------------------------------
   Sin dependencias (regla del proyecto): los streams se inflan con zlib nativo
   y los operadores de texto se leen a mano. Conserva las COLUMNAS por
   coordenada X, igual que hace public/pliego.js con pdf.js en el navegador —
   una lista de precios es una TABLA y aplanar el texto perdería el precio.

   Es una HERRAMIENTA MANUAL de análisis, como los `capturar_*.js`: la app NUNCA
   la llama. En el navegador el pliego se lee con pdf.js (`public/pliego.js`) y
   esa sigue siendo la vía del producto; esto existe para leer aquí, sin red y
   sin dependencias, las listas de precios en PDF que aporta el dueño.

   Lee fuentes SIMPLES (Type1/TrueType de un byte, vía WinAnsi) y también Type0
   /Identity-H resolviendo su CMap ToUnicode. El ToUnicode se resuelve POR
   PÁGINA Y POR RECURSO: `/F1` no es una identidad global —en los PDF del ICCU
   apunta a objetos distintos según la página— y un mapa unificado corrompe
   letras en silencio, que es el peor modo de fallo posible aquí.

   ⚠️ UN ToUnicode PUEDE ESTAR MAL EN ORIGEN, y entonces no hay nada que hacer
   desde este lado: las cartillas provinciales de EPC sustituyen letras de forma
   sistemática (C→Y, J→Ó) porque su propio CMap lo dice, así que cualquier lector
   copia lo mismo. Las CIFRAS salen correctas. Comprobado resolviendo las tablas
   de su propia página: el texto no cambia. Ver docs/INSUMOS_2026.md §5.
   ========================================================================== */
"use strict";
const zlib = require("zlib");

/* WinAnsiEncoding difiere de latin1 solo en 0x80-0x9F. */
const WINANSI_ALTO = {
  0x80: "€", 0x82: "‚", 0x83: "ƒ", 0x84: "„", 0x85: "…",
  0x86: "†", 0x87: "‡", 0x88: "ˆ", 0x89: "‰", 0x8a: "Š",
  0x8b: "‹", 0x8c: "Œ", 0x8e: "Ž", 0x91: "‘", 0x92: "’",
  0x93: "“", 0x94: "”", 0x95: "•", 0x96: "–", 0x97: "—",
  0x98: "˜", 0x99: "™", 0x9a: "š", 0x9b: "›", 0x9c: "œ",
  0x9e: "ž", 0x9f: "Ÿ",
};

function bytesATexto(bytes) {
  let s = "";
  for (const b of bytes) s += b >= 0x80 && b <= 0x9f ? (WINANSI_ALTO[b] || "") : String.fromCharCode(b);
  return s;
}

/* ─────────────────── objetos y streams del archivo ──────────────────────── */

function objetos(buf) {
  const crudo = buf.toString("latin1");
  const mapa = new Map();
  const re = /(\d+)\s+(\d+)\s+obj\b/g;
  let m;
  while ((m = re.exec(crudo))) {
    const num = Number(m[1]);
    const desde = m.index + m[0].length;
    const fin = crudo.indexOf("endobj", desde);
    if (fin < 0) continue;
    mapa.set(num, { desde, hasta: fin, cabecera: crudo.slice(desde, Math.min(desde + 900, fin)) });
  }
  return { crudo, mapa };
}

function inflarStream(buf, crudo, obj) {
  const marca = crudo.indexOf("stream", obj.desde);
  if (marca < 0 || marca > obj.hasta) return null;
  let ini = marca + 6;
  if (crudo[ini] === "\r") ini++;
  if (crudo[ini] === "\n") ini++;
  const fin = crudo.indexOf("endstream", ini);
  if (fin < 0) return null;
  const datos = buf.subarray(ini, fin);
  if (!/FlateDecode/.test(obj.cabecera)) return datos;
  try { return zlib.inflateSync(datos); } catch { /* algunos traen basura al final */ }
  try { return zlib.inflateSync(datos, { finishFlush: zlib.constants.Z_SYNC_FLUSH }); } catch { return null; }
}

/* ───────────────────── CMaps ToUnicode (fuentes Type0) ──────────────────── */

/* Un PDF con fuentes de subconjunto Identity-H codifica GLYPH IDs, no letras:
   sin el ToUnicode el texto sale como basura perfectamente creíble. Se parsean
   los bloques bfchar/bfrange de TODOS los CMaps del archivo y se unifican.
   Unificar es una aproximación declarada: si dos fuentes asignaran el mismo GID
   a letras distintas habría colisión — se cuenta y se informa. */
function cmapDeObjeto(buf, crudo, mapa, num) {
  const obj = mapa.get(num);
  if (!obj) return null;
  const datos = inflarStream(buf, crudo, obj);
  if (!datos) return null;
  return parsearCMap(datos.toString("latin1"));
}

/* Parsea los bloques bfchar/bfrange de UN CMap. */
function parsearCMap(t) {
  const tabla = new Map();
  const hexAChar = (h) => {
    const limpio = h.replace(/\s+/g, "");
    let s = "";
    for (let i = 0; i + 3 < limpio.length + 1; i += 4) {
      const cp = parseInt(limpio.slice(i, i + 4), 16);
      if (Number.isFinite(cp) && cp) s += String.fromCharCode(cp);
    }
    return s;
  };
  for (const bloque of t.matchAll(/beginbfchar([\s\S]*?)endbfchar/g))
    for (const par of bloque[1].matchAll(/<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>/g))
      tabla.set(parseInt(par[1], 16), hexAChar(par[2]));
  for (const bloque of t.matchAll(/beginbfrange([\s\S]*?)endbfrange/g)) {
    for (const r of bloque[1].matchAll(/<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>/g)) {
      const desde = parseInt(r[1], 16), hasta = parseInt(r[2], 16), base = parseInt(r[3], 16);
      for (let c = desde; c <= hasta && c - desde < 65535; c++) tabla.set(c, String.fromCharCode(base + (c - desde)));
    }
    for (const r of bloque[1].matchAll(/<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>\s*\[([\s\S]*?)\]/g)) {
      const desde = parseInt(r[1], 16);
      let i = 0;
      for (const it of r[3].matchAll(/<([0-9A-Fa-f]+)>/g)) tabla.set(desde + i++, hexAChar(it[1]));
    }
  }
  return tabla;
}

/* Resuelve, por PÁGINA, el mapa nombre-de-recurso → tabla ToUnicode.
   `/F1` NO es una identidad global: en estos PDFs apunta a objetos distintos
   según la página, así que un mapa unificado corrompe letras en silencio
   («LOCALIZACIÓN» salía «LOYALIZAYIÓN»). */
function fuentesPorPagina(buf, crudo, mapa) {
  const cache = new Map();
  const porContenido = new Map();
  for (const [, obj] of mapa) {
    const cab = crudo.slice(obj.desde, Math.min(obj.desde + 3000, obj.hasta));
    if (!/\/Type\s*\/Page\b/.test(cab)) continue;
    const mFuentes = /\/Font\s*<<([\s\S]*?)>>/.exec(cab);
    const tablas = {};
    if (mFuentes) {
      for (const f of mFuentes[1].matchAll(/\/(\w+)\s+(\d+)\s+0\s+R/g)) {
        const fuenteObj = mapa.get(Number(f[2]));
        if (!fuenteObj) continue;
        const cabF = crudo.slice(fuenteObj.desde, Math.min(fuenteObj.desde + 2000, fuenteObj.hasta));
        const mTU = /\/ToUnicode\s+(\d+)\s+0\s+R/.exec(cabF);
        if (!mTU) continue;
        const num = Number(mTU[1]);
        if (!cache.has(num)) cache.set(num, cmapDeObjeto(buf, crudo, mapa, num));
        if (cache.get(num)) tablas[f[1]] = cache.get(num);
      }
    }
    for (const c of cab.matchAll(/\/Contents\s+(\d+)\s+0\s+R/g)) porContenido.set(Number(c[1]), tablas);
    for (const c of cab.matchAll(/\/Contents\s*\[([^\]]*)\]/g))
      for (const r of c[1].matchAll(/(\d+)\s+0\s+R/g)) porContenido.set(Number(r[1]), tablas);
  }
  return porContenido;
}

function cmapsToUnicode(buf, crudo, mapa) {
  const tabla = new Map();
  let colisiones = 0, cmaps = 0;
  const hexAChar = (h) => {
    const limpio = h.replace(/\s+/g, "");
    let s = "";
    for (let i = 0; i + 3 < limpio.length + 1; i += 4) {
      const cp = parseInt(limpio.slice(i, i + 4), 16);
      if (Number.isFinite(cp) && cp) s += String.fromCharCode(cp);
    }
    return s;
  };
  for (const [, obj] of mapa) {
    const datos = inflarStream(buf, crudo, obj);
    if (!datos) continue;
    const t = datos.toString("latin1");
    if (!/beginbfchar|beginbfrange/.test(t)) continue;
    cmaps++;
    for (const bloque of t.matchAll(/beginbfchar([\s\S]*?)endbfchar/g)) {
      for (const par of bloque[1].matchAll(/<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>/g)) {
        const cod = parseInt(par[1], 16), val = hexAChar(par[2]);
        if (tabla.has(cod) && tabla.get(cod) !== val) colisiones++;
        else tabla.set(cod, val);
      }
    }
    for (const bloque of t.matchAll(/beginbfrange([\s\S]*?)endbfrange/g)) {
      for (const r of bloque[1].matchAll(/<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>/g)) {
        const desde = parseInt(r[1], 16), hasta = parseInt(r[2], 16), base = parseInt(r[3], 16);
        for (let c = desde; c <= hasta && c - desde < 65535; c++) {
          const val = String.fromCharCode(base + (c - desde));
          if (tabla.has(c) && tabla.get(c) !== val) colisiones++;
          else tabla.set(c, val);
        }
      }
      for (const r of bloque[1].matchAll(/<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>\s*\[([\s\S]*?)\]/g)) {
        const desde = parseInt(r[1], 16);
        let i = 0;
        for (const it of r[3].matchAll(/<([0-9A-Fa-f]+)>/g)) {
          const cod = desde + i++, val = hexAChar(it[1]);
          if (tabla.has(cod) && tabla.get(cod) !== val) colisiones++;
          else tabla.set(cod, val);
        }
      }
    }
  }
  return { tabla, colisiones, cmaps };
}

/* ─────────────────────── operadores de texto ────────────────────────────── */

/* Regex «sticky»: sin ellas habría que hacer s.slice(i) en cada token, que
   sobre un content stream de 65 KB es cuadrático. */
const RE_NOMBRE = /\/[^\s/[\]()<>{}%]*/y;
const RE_NUM = /[-+]?(\d+\.?\d*|\.\d+)/y;
const RE_OP = /[A-Za-z'"*][A-Za-z0-9'"*]*/y;

/* Divide un content stream en tokens PDF conservando las cadenas literales. */
function tokenizar(s) {
  const salida = [];
  let i = 0;
  while (i < s.length) {
    const c = s[i];
    if (c === "(") {
      const bytes = [];
      let prof = 1;
      i++;
      while (i < s.length && prof > 0) {
        const ch = s[i];
        if (ch === "\\") {
          const sig = s[i + 1];
          const octal = /^[0-7]{1,3}/.exec(s.slice(i + 1, i + 4));
          if (octal) { bytes.push(parseInt(octal[0], 8) & 0xff); i += 1 + octal[0].length; continue; }
          const mapa = { n: 10, r: 13, t: 9, b: 8, f: 12 };
          if (sig in mapa) bytes.push(mapa[sig]);
          else if (sig === "\n") { /* continuación de línea */ }
          else bytes.push(sig.charCodeAt(0) & 0xff);
          i += 2; continue;
        }
        if (ch === "(") prof++;
        if (ch === ")") { prof--; if (!prof) { i++; break; } }
        bytes.push(ch.charCodeAt(0) & 0xff);
        i++;
      }
      salida.push({ tipo: "cadena", valor: bytesATexto(bytes), bytes });
      continue;
    }
    if (c === "<" && s[i + 1] !== "<") {
      const fin = s.indexOf(">", i);
      const hex = s.slice(i + 1, fin < 0 ? s.length : fin).replace(/\s+/g, "");
      const bytes = [];
      for (let k = 0; k + 1 < hex.length + 1; k += 2) bytes.push(parseInt((hex.slice(k, k + 2) + "0").slice(0, 2), 16) & 0xff);
      salida.push({ tipo: "cadena", valor: bytesATexto(bytes), bytes });
      i = fin < 0 ? s.length : fin + 1;
      continue;
    }
    /* Los corchetes de `[...] TJ` son DELIMITADORES, no operadores: tratarlos
       como operador vaciaba el búfer y el TJ llegaba sin sus cadenas. */
    if (c === "[" || c === "]") { salida.push({ tipo: "delim", valor: c }); i++; continue; }
    if (c === " " || c === "\n" || c === "\r" || c === "\t" || c === "\f" || c === "\0") { i++; continue; }
    if (c === "<" && s[i + 1] === "<") { salida.push({ tipo: "delim", valor: "<<" }); i += 2; continue; }
    if (c === ">" && s[i + 1] === ">") { salida.push({ tipo: "delim", valor: ">>" }); i += 2; continue; }
    if (c === "/") {
      RE_NOMBRE.lastIndex = i;
      const m = RE_NOMBRE.exec(s);
      salida.push({ tipo: "nombre", valor: m ? m[0].slice(1) : "" });
      i += m ? m[0].length : 1; continue;
    }
    RE_NUM.lastIndex = i;
    const num = RE_NUM.exec(s);
    if (num) { salida.push({ tipo: "num", valor: Number(num[0]) }); i += num[0].length; continue; }
    RE_OP.lastIndex = i;
    const op = RE_OP.exec(s);
    if (op) { salida.push({ tipo: "op", valor: op[0] }); i += op[0].length; continue; }
    i++;
  }
  return salida;
}

/* Recorre el content stream acumulando fragmentos {x, y, texto}. */
function fragmentos(contenido, cmap, tablasPorFuente) {
  const tk = tokenizar(contenido);
  let activa = cmap && cmap.size ? cmap : null;
  /* Con Identity-H cada carácter son DOS bytes que indexan el ToUnicode. */
  const leer = (tok) => {
    if (!activa || !activa.size || !tok.bytes) return tok.valor;
    let s = "";
    for (let i = 0; i + 1 < tok.bytes.length; i += 2) {
      const gid = (tok.bytes[i] << 8) | tok.bytes[i + 1];
      s += activa.has(gid) ? activa.get(gid) : "";
    }
    return s;
  };
  const frags = [];
  let tm = [1, 0, 0, 1, 0, 0], tlm = tm.slice();
  let cm = [1, 0, 0, 1, 0, 0];
  const pila = [];
  let leading = 0, tamano = 1, buffer = [];

  const mul = (a, b) => [
    a[0] * b[0] + a[1] * b[2], a[0] * b[1] + a[1] * b[3],
    a[2] * b[0] + a[3] * b[2], a[2] * b[1] + a[3] * b[3],
    a[4] * b[0] + a[5] * b[2] + b[4], a[4] * b[1] + a[5] * b[3] + b[5],
  ];
  const emitir = (texto) => {
    if (!texto) return;
    const m = mul(tm, cm);
    frags.push({ x: m[4], y: m[5], texto, escala: Math.abs(m[0]) * tamano });
  };
  const avanzar = (tx) => { tm = mul([1, 0, 0, 1, tx, 0], tm); };

  for (let i = 0; i < tk.length; i++) {
    const t = tk[i];
    if (t.tipo !== "op") { buffer.push(t); continue; }
    const nums = buffer.filter((b) => b.tipo === "num").map((b) => b.valor);
    switch (t.valor) {
      case "q": pila.push(cm.slice()); break;
      case "Q": cm = pila.pop() || [1, 0, 0, 1, 0, 0]; break;
      case "cm": if (nums.length >= 6) cm = mul(nums.slice(-6), cm); break;
      case "BT": tm = [1, 0, 0, 1, 0, 0]; tlm = tm.slice(); break;
      case "Tf": {
        if (nums.length) tamano = nums[nums.length - 1];
        const nom = [...buffer].reverse().find((b) => b.tipo === "nombre");
        if (nom && tablasPorFuente && tablasPorFuente[nom.valor]) activa = tablasPorFuente[nom.valor];
        break;
      }
      case "TL": if (nums.length) leading = nums[nums.length - 1]; break;
      case "Tm": if (nums.length >= 6) { tm = nums.slice(-6); tlm = tm.slice(); } break;
      case "Td": if (nums.length >= 2) { tlm = mul([1, 0, 0, 1, nums[nums.length - 2], nums[nums.length - 1]], tlm); tm = tlm.slice(); } break;
      case "TD": if (nums.length >= 2) { leading = -nums[nums.length - 1]; tlm = mul([1, 0, 0, 1, nums[nums.length - 2], nums[nums.length - 1]], tlm); tm = tlm.slice(); } break;
      case "T*": tlm = mul([1, 0, 0, 1, 0, -leading], tlm); tm = tlm.slice(); break;
      case "Tj": case "'": case '"': {
        if (t.valor !== "Tj") { tlm = mul([1, 0, 0, 1, 0, -leading], tlm); tm = tlm.slice(); }
        const cad = [...buffer].reverse().find((b) => b.tipo === "cadena");
        if (cad) emitir(leer(cad));
        break;
      }
      case "TJ": {
        let texto = "";
        for (const b of buffer) {
          if (b.tipo === "cadena") texto += leer(b);
          else if (b.tipo === "num" && b.valor <= -120) texto += " ";
        }
        emitir(texto);
        break;
      }
      default: break;
    }
    buffer = [];
  }
  return frags;
}

/* Agrupa fragmentos en líneas por Y y separa columnas por hueco en X. */
function lineasDePagina(frags, opciones = {}) {
  const tolY = opciones.tolY || 3;
  const huecoTab = opciones.huecoTab || 12;
  const orden = frags.slice().sort((a, b) => b.y - a.y || a.x - b.x);
  const filas = [];
  for (const f of orden) {
    const fila = filas.find((r) => Math.abs(r.y - f.y) <= tolY);
    if (fila) fila.piezas.push(f);
    else filas.push({ y: f.y, piezas: [f] });
  }
  return filas.map((r) => {
    const piezas = r.piezas.sort((a, b) => a.x - b.x);
    let salida = "", finAnterior = null;
    for (const p of piezas) {
      const ancho = p.texto.length * (p.escala || 5) * 0.5;
      if (finAnterior != null) {
        const hueco = p.x - finAnterior;
        if (hueco > huecoTab) salida += "\t";
        else if (hueco > 1 && !/\s$/.test(salida)) salida += " ";
      }
      salida += p.texto;
      finAnterior = p.x + ancho;
    }
    return salida.replace(/[ \t]+$/, "");
  });
}

/* ───────────────────────────── API ──────────────────────────────────────── */

function paginasDeTexto(buf, opciones = {}) {
  const { crudo, mapa } = objetos(buf);
  const hayType0 = /\/Type0/.test(crudo);
  if (hayType0 && !/ToUnicode/.test(crudo)) {
    throw new Error("El PDF usa fuentes Type0 sin ToUnicode: este extractor no puede leerlo.");
  }
  const cm = hayType0 ? cmapsToUnicode(buf, crudo, mapa) : { tabla: new Map(), colisiones: 0, cmaps: 0 };
  const porContenido = hayType0 ? fuentesPorPagina(buf, crudo, mapa) : new Map();
  const paginas = [];
  paginas.diagnostico = { type0: hayType0, cmaps: cm.cmaps, glifos: cm.tabla.size, colisiones: cm.colisiones, paginas_con_fuentes: porContenido.size };
  for (const [num, obj] of mapa) {
    if (/\/Type\s*\/(Page|Font|XObject|ObjStm|Metadata|Catalog|Pages)\b/.test(obj.cabecera) && !/\/Type\s*\/Page\b/.test(obj.cabecera)) {
      // objetos que no son contenido; los content streams no declaran /Type
    }
    if (!/stream/.test(crudo.slice(obj.desde, Math.min(obj.desde + 900, obj.hasta)))) continue;
    if (/\/Subtype\s*\/(Image|Form)\b/.test(obj.cabecera)) continue;
    if (/\/(ObjStm|XRef|Metadata|FontFile\d?)\b/.test(obj.cabecera)) continue;
    const datos = inflarStream(buf, crudo, obj);
    if (!datos || datos.length < 20) continue;
    const texto = datos.toString("latin1");
    if (!/\bBT\b/.test(texto) || !/\b(Tj|TJ)\b/.test(texto)) continue;
    const tablas = porContenido.get(num);
    /* Con las tablas de SU página el texto es exacto; el mapa unificado queda
       solo como respaldo para páginas cuyos recursos no se pudieron resolver. */
    const frags = fragmentos(texto, tablas && Object.keys(tablas).length ? null : cm.tabla, tablas);
    if (!frags.length) continue;
    paginas.push({ objeto: num, lineas: lineasDePagina(frags, opciones) });
  }
  return paginas;
}

module.exports = { paginasDeTexto, lineasDePagina, fragmentos, tokenizar, bytesATexto, parsearCMap, fuentesPorPagina };
