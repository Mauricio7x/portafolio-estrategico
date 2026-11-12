"use strict";
/* ============================================================================
   lib/formulario_oferta · SU OFERTA ESCRITA EN EL FORMULARIO DE EXCEL QUE PUBLICÓ LA ENTIDAD (PLAN_X20, pieza 6.7, 12-nov-2026)
   ----------------------------------------------------------------------------
   Es la cifra que se radica: lo que este módulo no puede comprobar NO lo escribe. Toma el .xlsx del Formulario 1 tal como
   lo publicó la entidad, escribe el valor unitario de cada ítem con el precio de su análisis (Precios) y devuelve el MISMO
   libro —sus hojas, su formato, sus fórmulas— con los cálculos guardados al día. Lo que hace, en orden:

   1. LA PUERTA DE LECTURA. Solo un Formulario que pasa `lib/formulario_excel` (cuadra con su total y fila a fila, sin otra
      hoja de ítems que no sea copia de la elegida). Se llena la hoja del PROPONENTE si el libro la trae como copia de los
      ítems de la entidad (el documento tipo de Colombia Compra trae las dos: «PRESUPUESTO OFICIAL (Entidad)» y «PROPUESTA
      ECONOMICA(Proponente)»); si no la trae, o la trae vacía, la de la entidad, y se dice.
   2. EL UNITARIO. El del análisis con todo lo que el Formulario cobra dentro del unitario: costo directo ofertado × K, con
      K = (precio sin IVA de la oferta + IVA sobre la utilidad si el pliego lo cuenta) ÷ costo directo de la oferta. Es la
      misma cuenta que da `oferta.total_para_secop` (lib/apu/calculo), repartida por ítem. Se ajusta al peso como dice la
      nota 2 del Formulario 1 del documento tipo («Cuando la fracción decimal del peso sea igual o superior a 5 se
      aproximará por exceso…»). Solo si el AIU va sobre TODO el costo directo (`oferta.con_formulas`): con un AIU compuesto o
      subcontratos con su propio AIU, el reparto por ítem no es uno solo y no se adivina.
   3. CADA ÍTEM CON SU FILA. Por número de ítem y descripción, con la MISMA cantidad; lo que no casa uno a uno detiene todo.
   4. LAS FÓRMULAS DE LA HOJA. Se recalculan aquí (SUMA, REDONDEAR, REDONDEAR.MAS, REDONDEAR.MENOS, MIN, MAX, ABS, ENTERO,
      PRODUCTO y aritmética) y ANTES de escribir nada se comprueba que este cálculo reproduce cada valor que Excel guardó en
      la hoja original: si una sola fórmula no se sabe calcular o da otra cosa, no se llena. El libro sale además marcado para
      recalcular al abrirse (`fullCalcOnLoad`).
   5. LO QUE RECHAZA EL PLIEGO. El total no puede pasar del presupuesto oficial (causal de rechazo en todos los documentos
      tipo): no se entrega. Un unitario por encima del oficial se dice ítem por ítem y no se entrega salvo que el usuario
      confirme que su pliego no lo prohíbe (`aceptarSobreOficial`).
   6. UN FORMULARIO QUE SUMA EL AIU APARTE (filas de administración, imprevistos o utilidad con pesos después del total de
      los ítems) no se llena: ahí el unitario es costo directo y esta cuenta no sirve.
   PURO salvo zlib: sin red ni Redis. El handler (lib/apu_descargar, formato «oferta_excel») descarga el libro y lo devuelve.
   ============================================================================ */

const zlib = require("zlib");
const XL = require("../public/xlsx_lectura.js");
const FE = require("./formulario_excel.js");

/* ─────────────────────────── ZIP: leer las entradas en crudo y volver a escribir ─────────────────────────── */
function entradasZip(buf) {
  const u32 = (p) => buf.readUInt32LE(p), u16 = (p) => buf.readUInt16LE(p);
  let eocd = -1;
  for (let p = buf.length - 22; p >= Math.max(0, buf.length - 22 - 65535); p--) if (u32(p) === 0x06054b50) { eocd = p; break; }
  if (eocd < 0) throw new Error("no es un ZIP");
  const n = u16(eocd + 10);
  let p = u32(eocd + 16);
  const out = [];
  for (let i = 0; i < n; i++) {
    if (u32(p) !== 0x02014b50) throw new Error("directorio central dañado");
    const flags = u16(p + 8), metodo = u16(p + 10), hora = u16(p + 12), fecha = u16(p + 14), crc = u32(p + 16), tamC = u32(p + 20), tamR = u32(p + 24);
    const nLen = u16(p + 28), eLen = u16(p + 30), cLen = u16(p + 32), local = u32(p + 42);
    if (tamC === 0xffffffff || tamR === 0xffffffff || local === 0xffffffff) throw new Error("ZIP64 no soportado");
    const nombreBytes = buf.subarray(p + 46, p + 46 + nLen);
    if (u32(local) !== 0x04034b50) throw new Error("entrada dañada");
    const ini = local + 30 + u16(local + 26) + u16(local + 28);
    out.push({ nombre: nombreBytes.toString("utf8"), nombreBytes, flags, metodo, hora, fecha, crc, tamC, tamR, datos: buf.subarray(ini, ini + tamC) });
    p += 46 + nLen + eLen + cLen;
  }
  return out;
}
function zipDesde(entradas) {
  const partes = [], central = [];
  let off = 0;
  for (const e of entradas) {
    const flags = e.flags & 0x0800;   // sin descriptor de datos: tamaños y CRC van en la cabecera
    const h = Buffer.alloc(30);
    h.writeUInt32LE(0x04034b50, 0); h.writeUInt16LE(20, 4); h.writeUInt16LE(flags, 6); h.writeUInt16LE(e.metodo, 8);
    h.writeUInt16LE(e.hora, 10); h.writeUInt16LE(e.fecha, 12); h.writeUInt32LE(e.crc, 14); h.writeUInt32LE(e.tamC, 18); h.writeUInt32LE(e.tamR, 22);
    h.writeUInt16LE(e.nombreBytes.length, 26); h.writeUInt16LE(0, 28);
    partes.push(h, e.nombreBytes, e.datos);
    const c = Buffer.alloc(46);
    c.writeUInt32LE(0x02014b50, 0); c.writeUInt16LE(20, 4); c.writeUInt16LE(20, 6); c.writeUInt16LE(flags, 8); c.writeUInt16LE(e.metodo, 10);
    c.writeUInt16LE(e.hora, 12); c.writeUInt16LE(e.fecha, 14); c.writeUInt32LE(e.crc, 16); c.writeUInt32LE(e.tamC, 20); c.writeUInt32LE(e.tamR, 24);
    c.writeUInt16LE(e.nombreBytes.length, 28); c.writeUInt32LE(off, 42);
    central.push(c, e.nombreBytes);
    off += 30 + e.nombreBytes.length + e.datos.length;
  }
  const tamCentral = central.reduce((s, b) => s + b.length, 0);
  const fin = Buffer.alloc(22);
  fin.writeUInt32LE(0x06054b50, 0); fin.writeUInt16LE(entradas.length, 8); fin.writeUInt16LE(entradas.length, 10);
  fin.writeUInt32LE(tamCentral, 12); fin.writeUInt32LE(off, 16);
  return Buffer.concat([...partes, ...central, fin]);
}
const textoEntrada = (e) => (e.metodo === 0 ? Buffer.from(e.datos) : zlib.inflateRawSync(e.datos, { maxOutputLength: FE.MAX_PARTE })).toString("utf8");
function reemplazarEntrada(e, texto) {
  const crudo = Buffer.from(texto, "utf8");
  const datos = zlib.deflateRawSync(crudo);
  return { ...e, metodo: 8, crc: zlib.crc32(crudo) >>> 0, tamC: datos.length, tamR: crudo.length, datos };
}

/* ─────────────────────────── celdas ─────────────────────────── */
const colDe = (letras) => letras.split("").reduce((n, ch) => n * 26 + (ch.charCodeAt(0) - 64), 0) - 1;
const letrasDe = (c) => { let s = "", n = c + 1; while (n > 0) { const r = (n - 1) % 26; s = String.fromCharCode(65 + r) + s; n = Math.floor((n - 1) / 26); } return s; };
const des = (s) => XL.desescaparXml(String(s));

/* Las celdas de una hoja con su posición en el XML: {ref, col, fila, ini, fin, attrs, cuerpo, f:{texto, tipo, ref, si}|null, v} */
function celdasDeHoja(xml) {
  const celdas = new Map(), filas = new Map();
  for (const mf of xml.matchAll(/<row\b([^>]*?)(\/>|>([\s\S]*?)<\/row>)/g)) {
    const r = /\br="(\d+)"/.exec(mf[1]);
    if (!r) throw new Error("una fila sin número");
    const nFila = Number(r[1]);
    filas.set(nFila, { ini: mf.index, fin: mf.index + mf[0].length, autocierre: mf[2] === "/>", abre: mf.index + mf[0].indexOf(">") + 1 });
    if (!mf[3]) continue;
    const base = mf.index + mf[0].indexOf(">") + 1;
    for (const mc of mf[3].matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      const rr = /\br="([A-Z]+)(\d+)"/.exec(mc[1]);
      if (!rr) throw new Error("una celda sin referencia");
      const cuerpo = mc[2] || "";
      const mF = /<f\b([^>]*?)(?:\/>|>([\s\S]*?)<\/f>)/.exec(cuerpo);
      const mV = /<v(?:\s[^>]*)?>([\s\S]*?)<\/v>/.exec(cuerpo);
      const f = mF ? { texto: mF[2] != null ? des(mF[2]) : null, tipo: (/\bt="(\w+)"/.exec(mF[1]) || [])[1] || "normal", ref: (/\bref="([^"]+)"/.exec(mF[1]) || [])[1] || null, si: (/\bsi="(\d+)"/.exec(mF[1]) || [])[1] ?? null } : null;
      const ini = base + mc.index;
      celdas.set(rr[1] + rr[2], { ref: rr[1] + rr[2], col: colDe(rr[1]), fila: Number(rr[2]), ini, fin: ini + mc[0].length, attrs: mc[1], cuerpo, f, v: mV ? des(mV[1]) : null, t: (/(?:^|\s)t="(\w+)"/.exec(mc[1]) || [])[1] || "n" });
    }
  }
  return { celdas, filas };
}

/* ─────────────────────────── fórmulas ─────────────────────────── */
class NoSoportada extends Error {}
const RE_REF = /^(\$?)([A-Z]{1,3})(\$?)(\d+)/;
function fichas(t) {
  const out = [];
  let i = 0;
  const s = String(t || "").replace(/^=/, "");
  while (i < s.length) {
    const r = s.slice(i);
    let m;
    if (/^\s/.test(r)) { i++; continue; }
    if (r[0] === "\"") throw new NoSoportada("texto dentro de una fórmula");
    if (r[0] === "[") throw new NoSoportada("referencia a otro libro");
    if ((m = /^(?:'((?:[^']|'')+)'|([A-Za-z_\u00C0-\u024F][\w.\u00C0-\u024F]*))!/.exec(r))) {
      const hoja = m[1] != null ? m[1].replace(/''/g, "'") : m[2];
      i += m[0].length;
      const m2 = /^(\$?[A-Z]{1,3}\$?\d+)(?::(\$?[A-Z]{1,3}\$?\d+))?/.exec(s.slice(i));
      if (!m2) throw new NoSoportada("referencia a otra hoja que no es una celda");
      out.push({ k: "ref", hoja, a: m2[1], b: m2[2] || null }); i += m2[0].length; continue;
    }
    if ((m = /^([A-Z][A-Z0-9.]*)\(/i.exec(r))) { out.push({ k: "fn", v: m[1].toUpperCase() }); i += m[1].length; continue; }
    if ((m = /^(\$?[A-Z]{1,3}\$?\d+)(?::(\$?[A-Z]{1,3}\$?\d+))?(?![\w(])/.exec(r))) { out.push({ k: "ref", hoja: null, a: m[1], b: m[2] || null }); i += m[0].length; continue; }
    if ((m = /^(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?/.exec(r))) { out.push({ k: "num", v: Number(m[0]) }); i += m[0].length; continue; }
    if ((m = /^(<=|>=|<>|[-+*/^%(),:=<>&])/.exec(r))) { out.push({ k: "op", v: m[1] }); i += m[1].length; continue; }
    throw new NoSoportada(`no se reconoce «${r.slice(0, 12)}»`);
  }
  return out;
}
const FUNCIONES = new Set(["SUM", "PRODUCT", "MIN", "MAX", "ROUND", "ROUNDUP", "ROUNDDOWN", "ABS", "INT"]);
function analizar(fs) {
  let i = 0;
  const ver = () => fs[i], toma = () => fs[i++];
  const espera = (v) => { const x = toma(); if (!x || x.k !== "op" || x.v !== v) throw new NoSoportada(`se esperaba «${v}»`); };
  function expr() { let a = termino(); while (ver() && ver().k === "op" && (ver().v === "+" || ver().v === "-")) { const o = toma().v; a = { k: "bin", o, a, b: termino() }; } return a; }
  function termino() { let a = potencia(); while (ver() && ver().k === "op" && (ver().v === "*" || ver().v === "/")) { const o = toma().v; a = { k: "bin", o, a, b: potencia() }; } return a; }
  function potencia() { let a = unario(); while (ver() && ver().k === "op" && ver().v === "^") { toma(); a = { k: "bin", o: "^", a, b: unario() }; } return a; }
  function unario() { if (ver() && ver().k === "op" && (ver().v === "-" || ver().v === "+")) { const o = toma().v; const x = unario(); return o === "-" ? { k: "neg", x } : x; } return postfijo(); }
  function postfijo() { let x = primario(); while (ver() && ver().k === "op" && ver().v === "%") { toma(); x = { k: "bin", o: "/", a: x, b: { k: "num", v: 100 } }; } return x; }
  function primario() {
    const x = toma();
    if (!x) throw new NoSoportada("fórmula incompleta");
    if (x.k === "num") return x;
    if (x.k === "ref") return x;
    if (x.k === "fn") { if (!FUNCIONES.has(x.v)) throw new NoSoportada(`la función ${x.v}`); espera("("); const args = []; if (!(ver() && ver().k === "op" && ver().v === ")")) { args.push(expr()); while (ver() && ver().k === "op" && ver().v === ",") { toma(); args.push(expr()); } } espera(")"); return { k: "fn", v: x.v, args }; }
    if (x.k === "op" && x.v === "(") { const e = expr(); espera(")"); return e; }
    throw new NoSoportada(`no se sabe calcular «${x.v}»`);
  }
  const e = expr();
  if (i < fs.length) throw new NoSoportada(`sobra «${fs[i].v || fs[i].a}»`);
  return e;
}
/* Excel redondea sobre 15 cifras significativas: 2,675 se guarda 2,67499… y REDONDEAR(2,675;2) da 2,68 */
const quince = (x) => Number(x.toPrecision(15));
const redondear = (x, n, modo) => {
  const p = 10 ** n, y = quince(Math.abs(x) * p);
  const r = modo === "arriba" ? Math.ceil(y) : modo === "abajo" ? Math.floor(y) : Math.floor(y + 0.5);
  return (Math.sign(x) || 1) * r / p;
};
/* Corre una fórmula compartida desde su celda maestra: las referencias sin $ se mueven igual que la celda. */
function desplazar(texto, df, dc) {
  return String(texto).replace(/((?:'(?:[^']|'')+'|[A-Za-z_\u00C0-\u024F][\w.\u00C0-\u024F]*)!)?(\$?)([A-Z]{1,3})(\$?)(\d+)(?![\w(!])/g, (todo, hoja, d1, letras, d2, num, pos, s) => {
    const antes = s[pos - 1];
    if (antes && /[A-Za-z0-9_.$]/.test(antes) && !hoja) return todo;
    const c = d1 ? colDe(letras) : colDe(letras) + dc, f = d2 ? Number(num) : Number(num) + df;
    if (c < 0 || f < 1) throw new NoSoportada("una fórmula compartida sale de la hoja");
    return `${hoja || ""}${d1}${letrasDe(c)}${d2}${f}`;
  });
}

/* Las celdas que cita una fórmula, sin calcularla (para saber si depende de los precios): [{hoja|null, c1, f1, c2, f2}].
   null si la fórmula nombra algo que no es una celda (un nombre definido): entonces no se sabe de qué depende. */
function citasDe(texto) {
  const t = String(texto || "").replace(/\[\d+\][^!,()*+\-/^&=<>]*!\$?[A-Z]{1,3}\$?\d+(?::\$?[A-Z]{1,3}\$?\d+)?/g, "0")   // lo de otro libro no depende de esta hoja
    .replace(/#REF!/g, "0").replace(/"(?:[^"]|"")*"/g, "0");
  const out = [];
  const re = /(?:('(?:[^']|'')+'|[A-Za-z_\u00C0-\u024F][\w.\u00C0-\u024F]*)!)?(\$?[A-Z]{1,3}\$?\d+)(?::(\$?[A-Z]{1,3}\$?\d+))?(?![\w(!])/g;
  let resto = t;
  for (const m of t.matchAll(re)) {
    const antes = t[m.index - 1];
    if (antes && /[A-Za-z0-9_.$]/.test(antes) && !m[1]) continue;
    const a = RE_REF.exec(m[2]), b = m[3] ? RE_REF.exec(m[3]) : a;
    out.push({ hoja: m[1] ? m[1].replace(/^'|'$/g, "").replace(/''/g, "'") : null, c1: Math.min(colDe(a[2]), colDe(b[2])), c2: Math.max(colDe(a[2]), colDe(b[2])), f1: Math.min(+a[4], +b[4]), f2: Math.max(+a[4], +b[4]) });
    resto = resto.replace(m[0], " ");
  }
  // lo que queda no puede nombrar nada: solo funciones, números y operadores
  if (/[A-Za-z_][\w.]*(?![\w.]*\()/.test(resto.replace(/[A-Z][A-Z0-9.]*\(/gi, "(").replace(/\d+(?:\.\d+)?(?:[eE][+-]?\d+)?/g, " "))) return null;
  return out;
}

/* El libro como algo que se puede calcular: valor(hoja, col, fila). Las constantes salen de la rejilla del lector (las mismas
   cadenas compartidas y números); las fórmulas, de los XML. `sobre`: valores puestos encima (los unitarios nuevos). */
function calculadora({ hojasXml, rejillas, sobre = new Map() }) {
  const modelos = new Map();
  const modelo = (h) => {
    if (!modelos.has(h)) {
      const xml = hojasXml.get(h);
      if (xml == null) throw new NoSoportada(`la hoja «${h}» no existe`);
      const m = celdasDeHoja(xml);
      const maestras = new Map();
      for (const c of m.celdas.values()) if (c.f && c.f.tipo === "shared" && c.f.texto != null) maestras.set(c.f.si, c);
      for (const c of m.celdas.values()) {
        if (!c.f) continue;
        if (c.f.tipo === "array" || c.f.tipo === "dataTable") c.f.noSoportada = "fórmula de matriz";
        else if (c.f.tipo === "shared" && c.f.texto == null) {
          const ma = maestras.get(c.f.si);
          if (!ma) c.f.noSoportada = "fórmula compartida sin su celda maestra";
          else { try { c.f.texto = desplazar(ma.f.texto, c.fila - ma.fila, c.col - ma.col); } catch (e) { c.f.noSoportada = e.message; } }
        }
      }
      modelos.set(h, m);
    }
    return modelos.get(h);
  };
  const memo = new Map(), enCurso = new Set();
  function valor(h, col, fila) {
    const k = `${h}!${col},${fila}`;
    if (sobre.has(k)) return sobre.get(k);
    const c = modelo(h).celdas.get(letrasDe(col) + fila);
    if (c && c.f) {
      if (memo.has(k)) return memo.get(k);
      if (enCurso.has(k)) throw new NoSoportada("referencia circular");
      enCurso.add(k);
      try { const v = evaluar(c, h); memo.set(k, v); return v; } finally { enCurso.delete(k); }
    }
    const g = rejillas.get(h);
    const v = g && g[fila - 1] ? g[fila - 1][col] : null;
    return v === undefined ? null : v;
  }
  function evaluar(c, h) {
    if (c.f.noSoportada) throw new NoSoportada(c.f.noSoportada);
    return calc(analizar(fichas(c.f.texto)), h);
  }
  const num = (v) => { if (v == null || v === "") return 0; if (typeof v === "number") return v; throw new NoSoportada("una cuenta con texto"); };
  const celdaRef = (r) => { const m = RE_REF.exec(r); return { col: colDe(m[2]), fila: Number(m[4]) }; };
  function rango(x, h) {
    const hoja = x.hoja || h, a = celdaRef(x.a), b = x.b ? celdaRef(x.b) : a;
    const out = [];
    if ((Math.abs(b.fila - a.fila) + 1) * (Math.abs(b.col - a.col) + 1) > 20000) throw new NoSoportada("rango demasiado grande");
    for (let f = Math.min(a.fila, b.fila); f <= Math.max(a.fila, b.fila); f++) for (let c = Math.min(a.col, b.col); c <= Math.max(a.col, b.col); c++) out.push(valor(hoja, c, f));
    return out;
  }
  function calc(n, h) {
    if (n.k === "num") return n.v;
    if (n.k === "ref") { if (n.b) throw new NoSoportada("un rango fuera de una función"); const r = celdaRef(n.a); return valor(n.hoja || h, r.col, r.fila); }
    if (n.k === "neg") return -num(calc(n.x, h));
    if (n.k === "bin") {
      const a = num(calc(n.a, h)), b = num(calc(n.b, h));
      if (n.o === "+") return a + b; if (n.o === "-") return a - b; if (n.o === "*") return a * b;
      if (n.o === "/") { if (b === 0) throw new NoSoportada("división por cero"); return a / b; }
      if (n.o === "^") return a ** b;
    }
    if (n.k === "fn") {
      const lista = () => n.args.flatMap((x) => (x.k === "ref" && x.b ? rango(x, h).filter((v) => typeof v === "number") : [num(calc(x, h))]));
      const dos = () => { if (n.args.length !== 2) throw new NoSoportada(`${n.v} sin sus dos argumentos`); return [num(calc(n.args[0], h)), num(calc(n.args[1], h))]; };
      switch (n.v) {
        case "SUM": return lista().reduce((s, x) => s + x, 0);
        case "PRODUCT": return lista().reduce((s, x) => s * x, 1);
        case "MIN": { const l = lista(); return l.length ? Math.min(...l) : 0; }
        case "MAX": { const l = lista(); return l.length ? Math.max(...l) : 0; }
        case "ROUND": { const [x, d] = dos(); return redondear(x, Math.trunc(d)); }
        case "ROUNDUP": { const [x, d] = dos(); return redondear(x, Math.trunc(d), "arriba"); }
        case "ROUNDDOWN": { const [x, d] = dos(); return redondear(x, Math.trunc(d), "abajo"); }
        case "ABS": return Math.abs(num(calc(n.args[0], h)));
        case "INT": return Math.floor(num(calc(n.args[0], h)));
        default: throw new NoSoportada(`la función ${n.v}`);
      }
    }
    throw new NoSoportada("expresión desconocida");
  }
  return { valor, modelo, celda: (h, ref) => modelo(h).celdas.get(ref) };
}

/* ─────────────────────────── el unitario de la oferta ─────────────────────────── */
const redondeoPeso = (x) => Math.floor(quince(x) + 0.5);   // nota 2 del Formulario 1: desde ,5 por exceso
function unitariosOferta(items, oferta) {
  const o = oferta && typeof oferta === "object" ? oferta : null;
  if (!o || o.con_formulas !== true) return { ok: false, motivo: "Su AIU no va sobre todo el costo directo (AIU compuesto o subcontratos con su propio AIU): el reparto por ítem no es uno solo y el Formulario no se llena solo. Escriba los unitarios a mano." };
  const cd = Number(o.costo_directo), sinIva = Number(o.precio_sin_iva), iva = o.lleva_fila_iva ? Number(o.iva_sobre_utilidad) : 0;
  if (!(cd > 0) || !(sinIva > 0) || !Number.isFinite(iva) || iva < 0) return { ok: false, motivo: "Falta el cálculo de la oferta: pulse «Calcular cuánto me cuesta» y vuelva a intentarlo." };
  const K = (sinIva + iva) / cd;
  const sinPrecio = [];
  const lista = (Array.isArray(items) ? items : []).map((it, i) => {
    const u = it && typeof it.costo_directo_unitario_ofertado === "number" && Number.isFinite(it.costo_directo_unitario_ofertado) && it.costo_directo_unitario_ofertado > 0 ? it.costo_directo_unitario_ofertado : null;
    const cant = it && typeof it.cantidad === "number" && Number.isFinite(it.cantidad) ? it.cantidad : null;
    if (u == null || cant == null) sinPrecio.push(`${(it && (it.codigo || it.descripcion)) || `fila ${i + 1}`}`.slice(0, 60));
    return { codigo: it && typeof it.codigo === "string" ? it.codigo : it && typeof it.codigo === "number" ? String(it.codigo) : null,
      descripcion: it && typeof it.descripcion === "string" ? it.descripcion : "", unidad: it && typeof it.unidad === "string" ? it.unidad : null,
      cantidad: cant, unitario: u == null ? null : redondeoPeso(u * K) };
  });
  if (!lista.length) return { ok: false, motivo: "Su análisis no tiene ítems." };
  if (sinPrecio.length) return { ok: false, motivo: `${sinPrecio.length} ítem(s) de su análisis no tienen precio o cantidad (${sinPrecio.slice(0, 3).join("; ")}): sin precio no se escribe nada en el Formulario.` };
  return { ok: true, K, items: lista, incluye_iva: !!o.lleva_fila_iva && iva > 0 };
}

/* ─────────────────────────── casar los ítems con las filas ─────────────────────────── */
const plegar = (s) => String(s == null ? "" : s).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().replace(/[^A-Z0-9]+/g, " ").trim();
const codigoNorm = (s) => String(s == null ? "" : s).trim().replace(/,/g, ".").replace(/\.+$/, "").replace(/\s+/g, "");
const descCasa = (a, b) => { const x = plegar(a).slice(0, 60), y = plegar(b).slice(0, 60); return !!x && !!y && (x.startsWith(y) || y.startsWith(x)); };
const mismaCantidad = (a, b) => a != null && b != null && Math.abs(a - b) <= 1e-6 * Math.max(1, Math.abs(a));
function emparejar(filas, items) {
  /* lo de «Cotizar en Precios» llega en el MISMO orden del Formulario: si fila a fila casan descripción y cantidad, ese es el
     emparejamiento (un mismo «ESTUCO» en dos capítulos no se confunde) */
  if (filas.length === items.length && filas.every((f, i) => descCasa(f.descripcion, items[i].descripcion) && mismaCantidad(f.cantidad, items[i].cantidad)
    && (!f.codigo || !items[i].codigo || codigoNorm(f.codigo) === codigoNorm(items[i].codigo)))) return { pares: filas.map((f, i) => ({ fila: f, item: items[i] })), problemas: [] };
  const usados = new Set(), pares = [], problemas = [];
  for (const f of filas) {
    let cand = items.map((it, i) => ({ it, i })).filter((x) => !usados.has(x.i) && descCasa(f.descripcion, x.it.descripcion));
    if (f.codigo) { const porCodigo = cand.filter((x) => x.it.codigo && codigoNorm(x.it.codigo) === codigoNorm(f.codigo)); if (porCodigo.length) cand = porCodigo; }
    if (cand.length > 1) cand = cand.filter((x) => plegar(x.it.unidad) === plegar(f.unidad));
    if (cand.length !== 1) { problemas.push(`fila ${f.fila_excel} «${String(f.descripcion).slice(0, 50)}»: ${cand.length ? "casa con más de un ítem de su análisis" : "no está en su análisis"}`); continue; }
    if (!mismaCantidad(f.cantidad, cand[0].it.cantidad)) { problemas.push(`fila ${f.fila_excel} «${String(f.descripcion).slice(0, 50)}»: la cantidad del Formulario (${f.cantidad}) no es la de su análisis (${cand[0].it.cantidad})`); continue; }
    usados.add(cand[0].i); pares.push({ fila: f, item: cand[0].it });
  }
  items.forEach((it, i) => { if (!usados.has(i) && !problemas.length) problemas.push(`«${String(it.descripcion).slice(0, 50)}» de su análisis no está en el Formulario`); });
  return { pares, problemas };
}

/* ─────────────────────────── el libro: hojas, rutas, cálculo ─────────────────────────── */
function rutasDeHojas(wbXml, relsXml) {
  const rel = {};
  for (const m of relsXml.matchAll(/<Relationship\b[^>]*>/g)) { const id = /\bId="([^"]+)"/.exec(m[0]), t = /\bTarget="([^"]+)"/.exec(m[0]); if (id && t) rel[id[1]] = t[1]; }
  const out = new Map();
  let i = 0;
  for (const m of wbXml.matchAll(/<sheet\b([^>]*?)\/>/g)) {
    i++;
    const nombre = des((/\bname="([^"]*)"/.exec(m[1]) || [])[1] || `Hoja${i}`), rid = (/r:id="([^"]+)"/.exec(m[1]) || [])[1];
    const destino = (rid && rel[rid] ? rel[rid] : `worksheets/sheet${i}.xml`).replace(/^\//, "").replace(/^xl\//, "");
    out.set(nombre, `xl/${destino}`);
  }
  return out;
}
const textoFila = (g, fila) => ((g[fila - 1] || []).filter((x) => typeof x === "string").join(" "));
const RE_AIU_TEXTO = /\b(ADMINISTRACION|ADMON|IMPREVISTOS?|UTILIDAD(?:ES)?|A ?I ?U|I ?V ?A)\b/;

function esCopia(a, b) {
  if (!a || !b || a.length !== b.length || !a.length) return false;
  return a.every((f, i) => descCasa(f.descripcion, b[i].descripcion) && mismaCantidad(f.cantidad, b[i].cantidad));
}

/* ─────────────────────────── llenar ─────────────────────────── */
/** buf: el .xlsx tal cual lo publicó la entidad · items: los del cálculo de Precios (codigo, descripcion, unidad, cantidad,
    costo_directo_unitario_ofertado) · oferta: `resumen.oferta` del mismo cálculo.
    → { ok:false, motivo, problemas?, sobre_oficial? } | { ok:true, archivo:Buffer, … } */
async function llenarFormulario(buf, { items, oferta, aceptarSobreOficial = false, aiu = null } = {}) {
  const no = (motivo, extra = {}) => ({ ok: false, motivo, ...extra });
  const lectura = await FE.leerFormularioExcel(buf);
  if (!lectura.ok) return no(`El archivo no se pudo abrir como libro: ${lectura.motivo}`);
  if (!lectura.publicable) return no(`El Formulario no pasó la comprobación de lectura (${lectura.motivo}): sin eso no se escribe nada en él.`);
  const u = unitariosOferta(items, oferta);
  if (!u.ok) return no(u.motivo);

  let libro, ent;
  try { libro = await XL.leerLibro(new Uint8Array(buf), { inflar: FE.inflador() }); ent = XL.elegirHoja(libro); }
  catch (e) { return no(`No se pudo leer el libro: ${String((e && e.message) || e).slice(0, 160)}`); }
  const hojaEnt = ent.hoja.nombre, lEnt = ent.resultado;
  // la hoja del proponente, si es copia de los ítems de la entidad; dos copias = no se sabe cuál
  const copias = ent.candidatas.filter((c) => c.hoja !== ent.hoja && /PROPUEST|OFERTA|PROPONENTE/i.test(c.hoja.nombre) && esCopia(c.resultado.filas, lEnt.filas));
  if (copias.length > 1) return no(`El libro trae ${copias.length} hojas del proponente con los mismos ítems («${copias.map((c) => c.hoja.nombre).join("», «")}»): no se sabe cuál se radica.`);
  const destino = copias[0] || ent, hoja = destino.hoja.nombre, lDes = destino.resultado;
  const cab = lDes.cabecera;
  if (!cab || cab.precio < 0 || cab.total < 0) return no("La hoja no tiene columnas de valor unitario y valor total reconocibles.");

  const em = emparejar(lDes.filas, u.items);
  if (em.problemas.length) return no(`Los ítems de su análisis no casan uno a uno con el Formulario: ${em.problemas.slice(0, 4).join("; ")}${em.problemas.length > 4 ? ` (y ${em.problemas.length - 4} más)` : ""}. Cárguelos desde «Cotizar en Precios» de este mismo Formulario.`, { problemas: em.problemas.slice(0, 40) });

  // las partes del libro
  let entradas, wbXml, relsXml;
  try { entradas = entradasZip(buf); const porNombre = (n) => entradas.find((e) => e.nombre === n); wbXml = textoEntrada(porNombre("xl/workbook.xml")); relsXml = textoEntrada(porNombre("xl/_rels/workbook.xml.rels")); }
  catch (e) { return no(`No se pudo abrir el libro para escribir en él: ${String((e && e.message) || e).slice(0, 120)}`); }
  const rutas = rutasDeHojas(wbXml, relsXml);
  const hojasXml = new Map(), rejillas = new Map();
  for (const h of libro.hojas) rejillas.set(h.nombre, h.filas);
  for (const [n, ruta] of rutas) { const e = entradas.find((x) => x.nombre === ruta); if (e) hojasXml.set(n, textoEntrada(e)); }
  if (!hojasXml.has(hoja)) return no("No se encontró la hoja en el libro.");

  // 4 · ANTES de escribir: el cálculo de aquí reproduce lo que Excel guardó, en TODA celda que depende de los precios
  const original = calculadora({ hojasXml, rejillas });
  const mod = original.modelo(hoja);
  const tocadas = new Set();
  for (const p of em.pares) { tocadas.add(`${cab.precio},${p.fila.fila_excel}`); tocadas.add(`${cab.total},${p.fila.fila_excel}`); }
  const depende = new Set();   // refs de fórmulas de esta hoja que dependen (directa o indirectamente) de una celda tocada
  const formulas = [...mod.celdas.values()].filter((c) => c.f);
  const citas = new Map(formulas.map((c) => [c.ref, c.f.noSoportada ? null : citasDe(c.f.texto)]));
  const cae = (k, x) => { const [col, fila] = k.split(",").map(Number); return col >= x.c1 && col <= x.c2 && fila >= x.f1 && fila <= x.f2; };
  for (let cambio = true, vuelta = 0; cambio && vuelta < 200; vuelta++) {
    cambio = false;
    const claves = [...tocadas, ...[...depende].map((r) => { const c = mod.celdas.get(r); return `${c.col},${c.fila}`; })];
    for (const c of formulas) {
      if (depende.has(c.ref)) continue;
      const cs = citas.get(c.ref);
      if (cs === null || cs.some((x) => (x.hoja == null || x.hoja === hoja) && claves.some((k) => cae(k, x)))) { depende.add(c.ref); cambio = true; }
    }
  }
  for (const ref of depende) {
    const c = mod.celdas.get(ref);
    if (tocadas.has(`${c.col},${c.fila}`) && c.col === cab.precio) continue;   // el unitario que se reemplaza por su precio
    let v;
    try { v = original.valor(hoja, c.col, c.fila); }
    catch (e) { return no(`La hoja tiene una fórmula que depende de los precios y la aplicación no sabe recalcular (celda ${c.ref}: ${e instanceof NoSoportada ? e.message : "error"}): llénela a mano.`); }
    const guardadoNum = c.t === "n" && c.v != null && c.v !== "" ? Number(c.v) : null;
    const igual = typeof v === "number" ? guardadoNum != null && Number.isFinite(guardadoNum) && Math.abs(v - guardadoNum) <= Math.max(0.005, 1e-9 * Math.abs(guardadoNum)) : typeof v === "string" && c.t === "str" && v === c.v;
    if (!igual) return no(`El cálculo de la aplicación no reproduce el de Excel en la celda ${c.ref} (Excel guardó ${c.v == null ? "nada" : c.v}): no se escribe un total que no se puede comprobar. Llénela a mano.`);
  }

  // el total de los ítems en la hoja que se llena: la fila del total de la entidad, llevada a esta hoja por el desplazamiento de los ítems
  const desp = lDes.filas[0].fila_excel - lEnt.filas[0].fila_excel;
  const filaTotalEnt = lectura.fila_total;
  const gDes = rejillas.get(hoja), gEnt = rejillas.get(hojaEnt);
  const rotuloTotal = filaTotalEnt == null ? "" : plegar(textoFila(gEnt, filaTotalEnt));
  let filaTotal = filaTotalEnt == null ? null : filaTotalEnt + desp;
  if (filaTotal != null && plegar(textoFila(gDes, filaTotal)) !== rotuloTotal) {
    // la hoja del proponente no guarda el mismo espaciado: la fila con el MISMO rótulo, si es una sola y va después de los ítems
    const ultima = lDes.filas[lDes.filas.length - 1].fila_excel;
    const iguales = [];
    for (let f = ultima + 1; f <= gDes.length; f++) if (rotuloTotal && plegar(textoFila(gDes, f)) === rotuloTotal) iguales.push(f);
    filaTotal = iguales.length === 1 ? iguales[0] : null;
  }
  if (filaTotal == null || !rotuloTotal) return no("No se encontró en la hoja la fila del total del Formulario.");
  const refTotal = letrasDe(cab.total) + filaTotal;
  const celdaTotal = original.celda(hoja, refTotal);
  if (!celdaTotal || !celdaTotal.f || !depende.has(refTotal)) return no(`El total del Formulario (celda ${refTotal}) no es una fórmula: los subtotales no se recalcularían. Llénelo a mano.`);
  // 6 · un Formulario que suma el AIU aparte no se llena
  for (let f = filaTotalEnt + 1; f <= gEnt.length; f++) {
    if (!RE_AIU_TEXTO.test(plegar(textoFila(gEnt, f)))) continue;
    const pesos = (gEnt[f - 1] || []).some((v) => typeof v === "number" && v > Math.max(100, 0.001 * lectura.total));
    if (pesos) return no(`El Formulario suma el AIU aparte, después del total de los ítems (fila ${f}): ahí el unitario es costo directo y esta cuenta no aplica. Llénelo a mano.`);
  }

  // 5 · los unitarios y lo que el pliego rechaza
  const oficial = new Map(lEnt.filas.map((f, i) => [i, f]));
  const sobre = [];
  em.pares.forEach((p, i) => {
    const of = lDes === lEnt ? p.fila : oficial.get(lDes.filas.indexOf(p.fila));
    if (of && of.precio_archivo != null && p.item.unitario > of.precio_archivo) sobre.push({ fila_excel: p.fila.fila_excel, descripcion: String(p.fila.descripcion).slice(0, 80), unitario: p.item.unitario, oficial: of.precio_archivo });
    void i;
  });
  const sobre2 = new Map();
  const editar = [];   // {ref, fila, col, valor, formula?}
  for (const p of em.pares) {
    const refP = letrasDe(cab.precio) + p.fila.fila_excel, cP = mod.celdas.get(refP);
    if (cP && cP.f && cP.f.tipo === "shared" && cP.f.texto != null && cP.f.ref) return no(`El valor unitario de la fila ${p.fila.fila_excel} es la celda maestra de una fórmula compartida: no se puede reemplazar sin romper las demás. Llénelo a mano.`);
    sobre2.set(`${hoja}!${cab.precio},${p.fila.fila_excel}`, p.item.unitario);
    editar.push({ ref: refP, fila: p.fila.fila_excel, col: cab.precio, valor: p.item.unitario, constante: true, estilo: (mod.celdas.get(letrasDe(cab.total) + p.fila.fila_excel) || {}).attrs });
    const refT = letrasDe(cab.total) + p.fila.fila_excel, cT = mod.celdas.get(refT);
    if (!cT || !cT.f) {
      const t = redondeoPeso(p.item.unitario * p.item.cantidad);
      sobre2.set(`${hoja}!${cab.total},${p.fila.fila_excel}`, t);
      editar.push({ ref: refT, fila: p.fila.fila_excel, col: cab.total, valor: t, constante: true, estilo: cT ? cT.attrs : null });
    }
  }
  // recalcular con los unitarios nuevos
  const nuevo = calculadora({ hojasXml, rejillas, sobre: sobre2 });
  const cambios = new Map();
  for (const c of nuevo.modelo(hoja).celdas.values()) {
    if (!c.f || !depende.has(c.ref) || sobre2.has(`${hoja}!${c.col},${c.fila}`)) continue;
    try { cambios.set(c.ref, nuevo.valor(hoja, c.col, c.fila)); }
    catch (e) { return no(`Con sus precios, la celda ${c.ref} no se pudo recalcular (${e instanceof NoSoportada ? e.message : "error"}). Llénelo a mano.`); }
  }
  const totalFormulario = nuevo.valor(hoja, cab.total, filaTotal);
  // la cuenta cierra: ítems + valores fijos = total de la hoja
  const sumaItems = em.pares.reduce((s, p) => s + Number(nuevo.valor(hoja, cab.total, p.fila.fila_excel)), 0);
  const sumaFijos = (lectura.valores_fijos || []).reduce((s, x) => s + (x.valor || 0), 0);
  if (!(typeof totalFormulario === "number") || Math.abs(sumaItems + sumaFijos - totalFormulario) > 1) {
    return no(`Con sus precios, el total de la hoja (${Math.round(totalFormulario)}) no es la suma de los ítems${sumaFijos ? " más los valores fijos" : ""} (${Math.round(sumaItems + sumaFijos)}): la hoja suma algo que la aplicación no ve. Llénela a mano.`);
  }
  const totalOficial = lectura.total;
  if (totalFormulario > totalOficial) return no(`Con sus precios el Formulario suma ${totalFormulario}, más que el presupuesto oficial (${totalOficial}): esa oferta se rechaza. Baje sus precios antes de llenarlo.`, { total_formulario: totalFormulario, total_oficial: totalOficial });
  if (sobre.length && aceptarSobreOficial !== true) return no(`${sobre.length} ítem(s) quedan con un valor unitario por encima del oficial. Si su pliego prohíbe superar el unitario oficial, esa oferta se rechaza.`, { sobre_oficial: sobre.slice(0, 60) });

  // escribir: la hoja, las demás hojas que la citan, el libro (recalcular al abrir) y sin la cadena de cálculo
  const xml = hojasXml.get(hoja);
  const ediciones = [];
  const numero = (v) => (Number.isInteger(v) ? String(v) : String(quince(v)));
  const sinTipo = (attrs) => attrs.replace(/\s+t="[^"]*"/, "");
  const estiloDe = (attrs) => { const s = /\bs="(\d+)"/.exec(attrs || ""); return s ? ` s="${s[1]}"` : ""; };
  const insertar = new Map();   // fila → [celdas nuevas]
  for (const e of editar) {
    const c = mod.celdas.get(e.ref);
    const celda = (attrs) => `<c r="${e.ref}"${attrs}><v>${numero(e.valor)}</v></c>`;
    if (c) ediciones.push({ ini: c.ini, fin: c.fin, texto: celda(estiloDe(c.attrs) || estiloDe(e.estilo)) });
    else { if (!insertar.has(e.fila)) insertar.set(e.fila, []); insertar.get(e.fila).push({ col: e.col, texto: celda(estiloDe(e.estilo)) }); }
  }
  for (const [ref, v] of cambios) {
    const c = mod.celdas.get(ref);
    if (typeof v !== "number") continue;
    const cuerpo = /<v(?:\s[^>]*)?>[\s\S]*?<\/v>/.test(c.cuerpo) ? c.cuerpo.replace(/<v(?:\s[^>]*)?>[\s\S]*?<\/v>/, `<v>${numero(v)}</v>`) : `${c.cuerpo}<v>${numero(v)}</v>`;
    ediciones.push({ ini: c.ini, fin: c.fin, texto: `<c${sinTipo(c.attrs)}>${cuerpo}</c>` });
  }
  for (const [nFila, nuevas] of insertar) {
    const fi = mod.filas.get(nFila);
    if (!fi) return no(`La fila ${nFila} no existe en el XML de la hoja.`);
    nuevas.sort((a, b) => a.col - b.col);
    for (const n of nuevas) {
      if (fi.autocierre) return no(`La fila ${nFila} está vacía en el XML: no se puede escribir en ella con seguridad.`);
      const siguiente = [...mod.celdas.values()].filter((c) => c.fila === nFila && c.col > n.col).sort((a, b) => a.col - b.col)[0];
      const pos = siguiente ? siguiente.ini : xml.lastIndexOf("</row>", fi.fin);
      ediciones.push({ ini: pos, fin: pos, texto: n.texto });
    }
  }
  ediciones.sort((a, b) => b.ini - a.ini || b.fin - a.fin);
  let xmlNuevo = xml;
  for (const e of ediciones) xmlNuevo = xmlNuevo.slice(0, e.ini) + e.texto + xmlNuevo.slice(e.fin);

  // las otras hojas que citan esta: su valor guardado se quita (Excel lo calcula al abrir) en vez de dejarlo viejo
  const nombreEnFormula = new RegExp(`(?:'${hoja.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/'/g, "''")}'|\\b${hoja.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})!`);
  const otras = new Map();
  let citan = 0;
  for (const [n, x] of hojasXml) {
    if (n === hoja || !nombreEnFormula.test(des(x))) continue;
    const y = x.replace(/(<c\b[^>]*>)(<f\b[^>]*?(?:\/>|>[\s\S]*?<\/f>))<v(?:\s[^>]*)?>[\s\S]*?<\/v>/g, (todo, a, f) => { if (!nombreEnFormula.test(des(f))) return todo; citan++; return `${a}${f}`; });
    otras.set(n, y);
  }
  let wbNuevo = /<calcPr\b/.test(wbXml) ? wbXml.replace(/<calcPr\b([^>]*?)(\/?)>/, (t, a, cierre) => `<calcPr${a.replace(/\s+(?:fullCalcOnLoad|calcMode)="[^"]*"/g, "")} fullCalcOnLoad="1"${cierre}>`)
    : wbXml.replace(/(<\/sheets>(?:\s*<functionGroups[\s\S]*?(?:\/>|<\/functionGroups>))?(?:\s*<externalReferences>[\s\S]*?<\/externalReferences>)?(?:\s*<definedNames>[\s\S]*?<\/definedNames>)?)/, "$1<calcPr fullCalcOnLoad=\"1\"/>");
  if (!/fullCalcOnLoad="1"/.test(wbNuevo)) return no("No se pudo marcar el libro para recalcular al abrirse.");
  /* un libro guardado con el cálculo MANUAL no actualiza el total si el usuario cambia una cifra en Excel (870695577: LibreOffice
     lo abre con todo en 0): se deja automático y se dice */
  const calculoManual = /<calcPr\b[^>]*\bcalcMode="manual"/.test(wbXml);
  const rutaHoja = rutas.get(hoja);
  const salida = [];
  for (const e of entradas) {
    if (e.nombre === "xl/calcChain.xml") continue;   // Excel la rehace; con una fórmula cambiada por un número, la vieja pide «reparar»
    if (e.nombre === rutaHoja) salida.push(reemplazarEntrada(e, xmlNuevo));
    else if (e.nombre === "xl/workbook.xml") salida.push(reemplazarEntrada(e, wbNuevo));
    else if (e.nombre === "xl/_rels/workbook.xml.rels") salida.push(reemplazarEntrada(e, relsXml.replace(/<Relationship\b[^>]*Target="[^"]*calcChain\.xml"[^>]*\/>/g, "")));
    else if (e.nombre === "[Content_Types].xml") salida.push(reemplazarEntrada(e, textoEntrada(e).replace(/<Override\b[^>]*PartName="\/xl\/calcChain\.xml"[^>]*\/>/g, "")));
    else { const n = [...rutas].find(([, r]) => r === e.nombre); salida.push(n && otras.has(n[0]) ? reemplazarEntrada(e, otras.get(n[0])) : e); }
  }
  const archivo = zipDesde(salida);

  // lo que queda a mano: los porcentajes del AIU que el Formulario pide discriminar (nota 3 del documento tipo)
  const aMano = [];
  for (let f = filaTotal + 1; f <= gDes.length && aMano.length < 6; f++) {
    const t = plegar(textoFila(gDes, f));
    const cual = /\bADMINISTRACION\b/.test(t) ? "administracion_pct" : /\bIMPREVISTO/.test(t) ? "imprevistos_pct" : /\bUTILIDAD\b/.test(t) ? "utilidad_pct" : /\bTOTAL A ?I ?U\b/.test(t) ? "total" : null;
    if (!cual) continue;
    const pct = aiu && cual !== "total" && Number.isFinite(Number(aiu[cual])) ? Number(aiu[cual]) : aiu && cual === "total" ? ["administracion_pct", "imprevistos_pct", "utilidad_pct"].reduce((s, k) => s + (Number(aiu[k]) || 0), 0) : null;
    aMano.push({ fila_excel: f, rotulo: textoFila(gDes, f).replace(/\[[^\]]*\]/g, " ").replace(/\s+/g, " ").trim().slice(0, 60), porcentaje: pct == null ? null : Math.round(pct * 100) / 100 });
  }
  return {
    ok: true, archivo, hoja, hoja_de_la_entidad: destino === ent, filas_llenas: em.pares.length,
    total_formulario: totalFormulario, total_oficial: totalOficial, total_motor: Number.isFinite(Number(oferta.total_para_secop)) ? Number(oferta.total_para_secop) : null,
    valores_fijos: lectura.valores_fijos || [], factor: Math.round(u.K * 1e6) / 1e6, incluye_iva: u.incluye_iva,
    sobre_oficial: sobre.slice(0, 60), a_mano: aMano, otras_hojas_recalculan: citan, calculo_era_manual: calculoManual, fila_total: filaTotal, celda_total: refTotal,
    unitarios: em.pares.map((p) => ({ celda: letrasDe(cab.precio) + p.fila.fila_excel, valor: p.item.unitario })),
  };
}

/* Las frases para la pantalla: qué se hizo, qué cifra va a SECOP II y qué falta a mano. */
function frasesLlenado(r) {
  /* la cifra de SECOP II va EXACTA: un total con centavos (fórmulas sin redondear) se dice con sus centavos */
  const pesos = (n) => { const c = Math.round(n * 100) / 100; return `$${c.toLocaleString("es-CO", { minimumFractionDigits: Number.isInteger(c) ? 0 : 2, maximumFractionDigits: 2 })}`; };
  if (!r || !r.ok) return [r && r.motivo ? r.motivo : "No se llenó el Formulario."];
  const out = [`Se escribieron los ${r.filas_llenas} valores unitarios en la hoja «${r.hoja}»${r.hoja_de_la_entidad ? " (el libro no trae una hoja del proponente con los ítems: se llenó la de la entidad; cámbiele el título si el pliego lo pide)" : ""}.`];
  out.push(`El Formulario suma ${pesos(r.total_formulario)}: esa es la cifra que escribe en SECOP II${r.total_motor != null && Math.round(r.total_motor) !== Math.round(r.total_formulario) ? ` (su análisis decía ${pesos(r.total_motor)}; la diferencia es el ajuste al peso de cada unitario)` : ""}${Number.isInteger(Math.round(r.total_formulario * 100) / 100) ? "" : ". Lleva centavos porque las fórmulas de la entidad no redondean el total de cada ítem"}.`);
  if (r.valores_fijos && r.valores_fijos.length) out.push(`Incluye ${r.valores_fijos.length === 1 ? "el valor fijo" : "los valores fijos"} de la entidad tal cual (${r.valores_fijos.map((x) => `${x.etiqueta} ${pesos(x.valor)}`).join("; ")}).`);
  if (r.sobre_oficial && r.sobre_oficial.length) out.push(`${r.sobre_oficial.length} unitario(s) quedaron por encima del oficial, como usted confirmó.`);
  if (r.a_mano && r.a_mano.length) out.push(`Escriba a mano los porcentajes del AIU: ${r.a_mano.map((x) => `fila ${x.fila_excel} «${x.rotulo}»${x.porcentaje != null ? ` ${String(x.porcentaje).replace(".", ",")} %` : ""}`).join("; ")}.`);
  if (r.calculo_era_manual) out.push("El libro de la entidad venía con el cálculo en manual: se dejó automático para que el total cambie si usted cambia una cifra.");
  out.push("Ábralo en Excel antes de radicar: debe mostrar el mismo total.");
  return out;
}

module.exports = { llenarFormulario, frasesLlenado, unitariosOferta, emparejar, redondeoPeso, redondear, desplazar, fichas, analizar, calculadora, celdasDeHoja, entradasZip, zipDesde, NoSoportada };
