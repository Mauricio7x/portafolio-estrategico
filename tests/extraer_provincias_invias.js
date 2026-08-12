/* ============================================================================
   tests/extraer_provincias_invias.js · PDF del INVIAS → data/apu_invias_provincias.json
   ----------------------------------------------------------------------------
   HERRAMIENTA, no prueba: baja el PDF y regenera el archivo de datos. No corre
   en `tests/e2e.js` (necesita red); la suite verifica el JSON ya generado.

     node tests/extraer_provincias_invias.js            (baja el PDF y regenera)
     node tests/extraer_provincias_invias.js archivo.pdf

   POR QUÉ EXISTE UN EXTRACTOR DE PDF EN NODE, si el proyecto ya usa pdf.js:
   pdf.js corre en el NAVEGADOR y aquí hace falta reproducir el dato desde la
   línea de comandos, sin dependencias (regla del proyecto). Son ~120 líneas
   porque no es un lector de PDF general: solo saca texto con posición.

   LO QUE HACE FALTA Y NO ES OBVIO:

   1 · Las fuentes son Type0/CID: los códigos del stream NO son ASCII. Sin
       decodificar la CMap `/ToUnicode` el texto sale como basura — se probó, y
       devuelve 371.685 caracteres ilegibles.
   2 · El ORDEN DEL STREAM NO ES EL ORDEN VISUAL. En esta tabla las celdas de
       departamento vienen agrupadas aparte de sus filas de provincia, así que
       leer «en orden» asocia provincias al departamento equivocado. Se sigue el
       cursor de texto (Tm/Td/TD/T*) y se reconstruye la fila por COORDENADA,
       que es la misma técnica de `lib/apu_pliego.js` con los pliegos.
   3 · Hay que leer SOLO los streams referenciados por `/Contents` de cada
       página: barrer todos los streams mete los programas de fuente
       (`FontFile2`), que son binarios y traen `TJ` por casualidad.
   ========================================================================== */
"use strict";
const fs = require("fs");
const zlib = require("zlib");
const path = require("path");

const URL_PDF = "https://www.invias.gov.co/loader.php?lServicio=Tools2&lTipo=descargas&lFuncion=descargar&idFile=1019";
const SALIDA = path.join(__dirname, "..", "data", "apu_invias_provincias.json");

function leerObjetos(buf) {
  const s = buf.toString("latin1"), mapa = {};
  const re = /(\d+)\s+\d+\s+obj\b/g;
  let m;
  while ((m = re.exec(s))) {
    const ini = m.index + m[0].length;
    const fin = s.indexOf("endobj", ini);
    if (fin < 0) continue;
    const dict = s.slice(ini, Math.min(fin, ini + 3000));
    let stream = null;
    const ms = /stream\r?\n/.exec(s.slice(ini, fin));
    if (ms) {
      const a = ini + ms.index + ms[0].length;
      const b = s.indexOf("endstream", a);
      if (b > a) stream = buf.slice(a, b);
    }
    mapa[m[1]] = { dict, stream };
  }
  return mapa;
}

const inflar = (o) => {
  if (!o || !o.stream) return null;
  if (!/\/Flate/.test(o.dict)) return o.stream;
  try { return zlib.inflateSync(o.stream); } catch { return null; }
};

function leerCMap(txt) {
  const mapa = {};
  const hx = (h) => { let o = ""; for (let i = 0; i + 3 < h.length + 1; i += 4) o += String.fromCharCode(parseInt(h.slice(i, i + 4), 16)); return o; };
  for (const b of txt.match(/beginbfchar([\s\S]*?)endbfchar/g) || []) {
    const re = /<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>/g; let m;
    while ((m = re.exec(b))) mapa[parseInt(m[1], 16)] = hx(m[2]);
  }
  for (const b of txt.match(/beginbfrange([\s\S]*?)endbfrange/g) || []) {
    const re = /<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>/g; let m;
    while ((m = re.exec(b))) {
      const lo = parseInt(m[1], 16), hi = parseInt(m[2], 16), base = parseInt(m[3], 16);
      for (let c = lo; c <= hi && c - lo < 65536; c++) mapa[c] = String.fromCharCode(base + (c - lo));
    }
  }
  return mapa;
}

/* Fragmentos {pag, x, y, t} siguiendo el cursor de texto. Ver nota 2 arriba. */
function fragmentos(buf) {
  const objs = leerObjetos(buf);
  let cmap = {};
  for (const n of Object.keys(objs)) {
    const inf = inflar(objs[n]);
    if (inf && /beginbfchar|beginbfrange/.test(inf.toString("latin1"))) {
      cmap = { ...cmap, ...leerCMap(inf.toString("latin1")) };
    }
  }
  const conts = [];
  for (const p of Object.keys(objs).filter((n) => /\/Type\s*\/Page[^s]/.test(objs[n].dict))) {
    const m = /\/Contents\s+(?:(\d+)\s+\d+\s+R|\[([^\]]*)\])/.exec(objs[p].dict);
    if (!m) continue;
    if (m[1]) conts.push(m[1]);
    else for (const r of (m[2].match(/(\d+)\s+\d+\s+R/g) || [])) conts.push(/(\d+)/.exec(r)[1]);
  }
  const deHex = (h) => {
    h = h.replace(/\s/g, "");
    let s = "";
    for (let i = 0; i + 3 < h.length + 1; i += 4) {
      const c = parseInt(h.slice(i, i + 4), 16);
      s += cmap[c] !== undefined ? cmap[c] : "";
    }
    return s;
  };
  const N = "(-?[\\d.]+)";
  const TOK = new RegExp(`${N}\\s+${N}\\s+(?:Td|TD)`
    + `|${N}\\s+${N}\\s+${N}\\s+${N}\\s+${N}\\s+${N}\\s+Tm`
    + "|<([0-9A-Fa-f\\s]*)>|\\(((?:\\\\.|[^()\\\\])*)\\)|\\bT\\*|\\bBT\\b|\\bET\\b", "g");

  const out = [];
  conts.forEach((n, pag) => {
    const inf = inflar(objs[n]);
    if (!inf) return;
    const t = inf.toString("latin1");
    let x = 0, y = 0, lx = 0, ly = 0, acc = "";
    const volcar = () => { if (acc.trim()) out.push({ pag, x: Math.round(lx), y: Math.round(ly), t: acc }); acc = ""; };
    let m;
    while ((m = TOK.exec(t))) {
      if (m[1] !== undefined) { volcar(); x += +m[1]; y += +m[2]; lx = x; ly = y; }
      else if (m[3] !== undefined) { volcar(); x = +m[7]; y = +m[8]; lx = x; ly = y; }
      else if (m[9] !== undefined) acc += deHex(m[9]);
      else if (m[10] !== undefined) {
        acc += m[10].replace(/\\([0-7]{1,3})/g, (_, o) => String.fromCharCode(parseInt(o, 8))).replace(/\\(.)/g, "$1");
      } else if (m[0] === "T*") { volcar(); y -= 12; ly = y; }
      else volcar();
    }
    volcar();
  });
  return out;
}

/* ── la tabla ───────────────────────────────────────────────────────────────
   Columnas medidas en el documento: departamento x<200 · nº de provincia
   x≈214 · nombre de provincia x≈240-340 · municipios x≈369. */
function departamentos(frag) {
  const col = frag.filter((r) => r.x < 200).sort((a, b) => a.pag - b.pag || a.y - b.y || a.x - b.x);
  const grupos = [];
  for (const r of col) {
    const g = grupos[grupos.length - 1];
    if (g && g.pag === r.pag && Math.abs(r.y - g.y) <= 8) g.rs.push(r);
    else grupos.push({ pag: r.pag, y: r.y, rs: [r] });
  }
  const d = new Map();
  for (const g of grupos) {
    const t = g.rs.sort((a, b) => a.x - b.x).map((r) => r.t).join("").trim();
    const m = /^(\d{1,2})\s*([A-Za-zÁÉÍÓÚÑáéíóúñ][A-Za-zÁÉÍÓÚÑáéíóúñ .]*?)\s*(\d*)$/.exec(t);
    if (m && +m[1] >= 1 && +m[1] <= 32 && m[2].trim().length > 2 && !d.has(+m[1])) {
      d.set(+m[1], { nombre: m[2].trim(), cola: m[3] });
    }
  }
  /* LA AUTOVERIFICACIÓN: la celda trae la CANTIDAD de provincias y, cuando esa
     cantidad es 1, lleva PEGADO el número global de la última provincia del
     departamento. Si la cola se puede partir en (c, p) con p == acumulado + c,
     el corte es el correcto — y que eso cuadre en los 32 es la prueba de que la
     asignación no es una conjetura. */
  let acc = 0;
  const filas = [];
  for (let n = 1; n <= 32; n++) {
    const e = d.get(n);
    if (!e) throw new Error(`falta el departamento ${n}: el PDF cambió de formato`);
    let c = null;
    for (let k = 1; k < e.cola.length; k++) {
      const ci = e.cola.slice(0, k), pi = e.cola.slice(k);
      if (pi.startsWith("0")) continue;
      if (+pi === acc + +ci) { c = +ci; break; }
    }
    if (c === null) c = +e.cola;
    if (!Number.isFinite(c) || c < 1) throw new Error(`cantidad ilegible en ${e.nombre}: «${e.cola}»`);
    filas.push({ n, departamento: e.nombre, provincias: c, desde: acc + 1, hasta: acc + c });
    acc += c;
  }
  return { filas, total: acc };
}

function nombresDeProvincia(frag) {
  const nums = frag.filter((r) => r.x >= 205 && r.x <= 225 && /^\d{1,3}$/.test(r.t.trim()));
  const noms = frag.filter((r) => r.x >= 240 && r.x <= 340);
  const prov = new Map();
  for (const r of nums) {
    const n = +r.t.trim();
    if (n < 1 || n > 140 || prov.has(n)) continue;
    const cerca = noms.filter((q) => q.pag === r.pag && Math.abs(q.y - r.y) <= 10);
    if (!cerca.length) continue;
    const nombre = cerca.sort((a, b) => a.x - b.x).map((q) => q.t.trim()).join(" ")
      .replace(/\s+/g, " ").replace(/^[ ,]+|[ ,]+$/g, "");
    if (nombre.length > 1) prov.set(n, nombre);
  }
  return prov;
}

async function bajar(url) {
  const r = await fetch(url, { redirect: "follow" });
  if (!r.ok) throw new Error(`el INVIAS respondió ${r.status}`);
  const b = Buffer.from(await r.arrayBuffer());
  // los portales sirven HTML de sesión con Content-Type de PDF: manda la FIRMA
  if (b.slice(0, 5).toString() !== "%PDF-") throw new Error("lo descargado no es un PDF");
  return b;
}

(async () => {
  const local = process.argv[2];
  const buf = local ? fs.readFileSync(local) : await bajar(URL_PDF);
  const frag = fragmentos(buf);
  const { filas, total } = departamentos(frag);
  const prov = nombresDeProvincia(frag);

  const provincias = [];
  for (const d of filas) {
    for (let n = d.desde; n <= d.hasta; n++) {
      /* `null` y no una conjetura: en los departamentos de UNA provincia la
         celda del número se fusiona con la del departamento en el PDF, así que
         el nombre no se puede leer. Un texto REAL en la fila EQUIVOCADA es peor
         que un hueco — la misma regla que rige la extracción de la experiencia. */
      provincias.push({ numero: n, provincia: prov.get(n) || null, departamento: d.departamento, departamento_n: d.n });
    }
  }
  const previo = JSON.parse(fs.readFileSync(SALIDA, "utf8"));
  const doc = { _meta: { ...previo._meta, departamentos: filas.length, provincias: total,
    con_nombre: provincias.filter((p) => p.provincia).length }, provincias };
  fs.writeFileSync(SALIDA, `${JSON.stringify(doc, null, 1)}\n`);
  console.log(`${filas.length} departamentos · ${total} provincias · ${doc._meta.con_nombre} con nombre → ${SALIDA}`);
})().catch((e) => { console.error("FALLÓ:", e.message); process.exit(1); });
