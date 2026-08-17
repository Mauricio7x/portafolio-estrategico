#!/usr/bin/env node
/* tests/capturar_invias_apu.js · LOS APU COMPLETOS DEL INVIAS, provincia a provincia (ago 2026)
   ─────────────────────────────────────────────────────────────────────────────
   Herramienta MANUAL con red (la app nunca llama al INVIAS en la ruta de una
   petición). Baja los libros «APU Regionalizados de Referencia» de cada
   provincia (hermes2.invias.gov.co/APUs/Provincias/{año}_{sem}/APU_{cod}_{DPTO}__{PROV}_{año}_{sem}.xlsx,
   ~13 MB cada uno, 141 provincias incluida Bogotá si publica), lee con el
   lector del proyecto (public/xlsx_lectura.js) la hoja «ÍNDICE» (526 ítems de
   pago con unidad, subtotales por componente y COSTO DIRECTO) y, de UNA
   provincia de referencia, la COMPOSICIÓN de cada APU (equipo · materiales ·
   transporte · mano de obra, con cantidades y rendimientos — que son los
   mismos en todas las provincias: solo cambian los precios de los insumos).
   Escribe data/apu_invias_items.json:
     { _meta, provincias:[{cod, departamento, provincia}], items:[{codigo, capitulo,
       articulo, descripcion, unidad, precios:[uno por provincia, null si falta],
       componentes:[[equipo, materiales, transporte, mano_obra] por provincia], composicion:{…}}] }

   POR QUÉ EXISTE (encargo del dueño, 17-ago-2026): «no sabemos los precios de
   los ítems… básicamente no sirve». El catálogo propio trae 174 ítems (17
   genéricos + 157 de un contrato adjudicado); cualquier presupuesto real cae en
   su mayoría en «personalizado, sin precio». El INVIAS publica 526 APU
   oficiales por provincia, semestre a semestre: es la base de precios de
   referencia más grande y mejor documentada del país para obra vial. Se
   integra como REFERENCIA OFICIAL con su vigencia y su provincia declaradas.

   LICENCIA: los documentos del INVIAS prohíben el uso comercial sin
   autorización. Si Detekta se comercializa con estos datos, pedirla
   (preciosunitarios@invias.gov.co). Queda dicho en `_meta.licencia`.

   Uso:  node tests/capturar_invias_apu.js [--vigencia 2026-1] [--ref 7301] [--solo 7301,0501] [--concurrencia 4]
   Reintenta 429/5xx con backoff; un 404 (nombre de provincia que no casa) prueba
   las variantes de nombre y, si ninguna existe, lo DECLARA en `provincias_fallidas`. */
"use strict";

const fs = require("fs");
const path = require("path");
const zlib = require("zlib");
const XLSXLectura = require("../public/xlsx_lectura.js");

const args = process.argv.slice(2);
const arg = (k, def) => { const i = args.indexOf(k); return i >= 0 && args[i + 1] ? args[i + 1] : def; };
const VIGENCIA = arg("--vigencia", "2026-1");
const [ANIO, PERIODO] = VIGENCIA.split("-");
const REF = arg("--ref", "7301");
const SOLO = arg("--solo", "") ? new Set(arg("--solo", "").split(",")) : null;
const CONCURRENCIA = Number(arg("--concurrencia", "4")) || 4;
const SALIDA = path.join(__dirname, "..", "data", "apu_invias_items.json");
const BASE = `https://hermes2.invias.gov.co/APUs/Provincias/${ANIO}_${PERIODO}/`;

const sinAcentos = (s) => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "");
/* «SELVA AMAZÓNICA» → «SELVA_AMAZONICA» (verificado); «SAN ANDRÉS, PROVIDENCIA» y
   «NORTE / CENTRO» se prueban en varias variantes porque el patrón no está
   documentado y el 404 no distingue «no existe» de «se llama distinto». */
function variantesNombre(s) {
  const b = sinAcentos(s).toUpperCase().trim();
  const v = new Set([
    b.replace(/[^A-Z0-9]+/g, "_").replace(/^_|_$/g, ""),
    b.replace(/\s+/g, "_"),
    b.replace(/[,/]/g, "").replace(/\s+/g, "_"),
    b.replace(/\s*[,/]\s*/g, "_").replace(/\s+/g, "_"),
    b.replace(/[,/]/g, "_").replace(/\s+/g, "_"),
    encodeURIComponent(b),
  ]);
  return [...v];
}

async function bajar(url, intentos = 4) {
  for (let i = 1; i <= intentos; i++) {
    let r;
    try { r = await fetch(url, { headers: { "User-Agent": "Detekta/1 (captura manual de APU de referencia)" } }); }
    catch (e) { if (i === intentos) throw e; await new Promise((ok) => setTimeout(ok, 1500 * i)); continue; }
    if (r.status === 404 || r.status === 403) return { status: r.status, bytes: null };
    if (r.status === 429 || r.status >= 500) { await new Promise((ok) => setTimeout(ok, 2000 * i + Math.random() * 500)); continue; }
    if (!r.ok) return { status: r.status, bytes: null };
    return { status: 200, bytes: new Uint8Array(await r.arrayBuffer()) };
  }
  return { status: 599, bytes: null };
}

const inflar = (u8) => zlib.inflateRawSync(Buffer.from(u8));
const num = (v) => { const n = Number(v); return Number.isFinite(n) ? n : null; };
const txt = (v) => String(v == null ? "" : v).replace(/\s+/g, " ").trim();

/* ÍNDICE: fila de cabecera «#, CAPÍTULO CONSTRUCTIVO, ARTÍCULO, CLASIFICACIÓN…,
   ÍTEM DE PAGO, DESCRIPCIÓN ACTIVIDAD, UNIDAD, SUBTOTAL EQUIPOS, SUBTOTAL
   MATERIALES, SUBTOTAL TRANSPORTE, SUBTOTAL MANO DE OBRA, COSTO DIRECTO». */
function leerIndice(libro) {
  const h = libro.hojas.find((x) => sinAcentos(x.nombre).trim().toUpperCase() === "INDICE");
  if (!h) throw new Error("el libro no trae la hoja ÍNDICE");
  const iCab = h.filas.findIndex((f) => f && f.some((c) => /ÍTEM DE PAGO|ITEM DE PAGO/i.test(String(c || ""))));
  if (iCab < 0) throw new Error("ÍNDICE sin cabecera «ÍTEM DE PAGO»");
  const cab = h.filas[iCab].map((c) => sinAcentos(txt(c)).toUpperCase());
  const col = (re) => cab.findIndex((c) => re.test(c));
  const ci = { codigo: col(/^ITEM DE PAGO/), capitulo: col(/^CAPITULO/), articulo: col(/^ARTICULO/), descripcion: col(/^DESCRIPCION/), unidad: col(/^UNIDAD/),
    equipo: col(/EQUIPOS?/), materiales: col(/MATERIALES/), transporte: col(/TRANSPORTE/), mo: col(/MANO DE OBRA/), total: col(/COSTO DIRECTO/) };
  for (const [k, v] of Object.entries(ci)) if (v < 0) throw new Error(`ÍNDICE sin columna ${k}`);
  const items = [];
  for (const f of h.filas.slice(iCab + 1)) {
    const codigo = txt(f[ci.codigo]);
    if (!codigo || !/^\d/.test(codigo)) continue;
    items.push({
      codigo, capitulo: txt(f[ci.capitulo]).replace(/^Capitulo\s+\d+\s*/i, ""), articulo: txt(f[ci.articulo]).replace(/^Art[ií]culo\s+/i, ""),
      descripcion: txt(f[ci.descripcion]), unidad: txt(f[ci.unidad]),
      equipo: num(f[ci.equipo]), materiales: num(f[ci.materiales]), transporte: num(f[ci.transporte]), mano_obra: num(f[ci.mo]), total: num(f[ci.total]),
    });
  }
  return items;
}

/* La composición de UNA hoja APU («200,1,1»…): secciones I. EQUIPO · II.
   MATERIALES · III. TRANSPORTES · IV. MANO DE OBRA, cada una con su cabecera
   y su «SUBTOTAL $». Se lee por POSICIÓN de cabecera (columnas fijas: código
   en 1, descripción en 2, valor en 13). */
function leerComposicion(hoja) {
  const f = hoja.filas;
  const out = { equipo: [], materiales: [], transporte: [], mano_obra: [], herramienta_menor_pct: null };
  let seccion = null;
  for (const fila of f) {
    const c1 = txt(fila[1]);
    if (/^I\.\s*EQUIPO/i.test(c1)) { seccion = "equipo"; continue; }
    if (/^II\.\s*MATERIALES/i.test(c1)) { seccion = "materiales"; continue; }
    if (/^III\.\s*TRANSPORTE/i.test(c1)) { seccion = "transporte"; continue; }
    if (/^IV\.\s*MANO DE OBRA/i.test(c1)) { seccion = "mano_obra"; continue; }
    if (/^V\.\s*COSTOS INDIRECTOS|^TOTAL COSTO DIRECTO/i.test(c1)) { seccion = null; continue; }
    if (!seccion || !c1 || /^C[ÓO]DIGO$|^SUBTOTAL/i.test(c1)) continue;
    const desc = txt(fila[2]);
    if (seccion === "equipo") {
      if (/^HERMENINV$/i.test(c1)) { out.herramienta_menor_pct = num(fila[11]); continue; }
      out.equipo.push({ codigo: c1, descripcion: desc, tarifa_hora: num(fila[10]), rendimiento: num(fila[11]), valor: num(fila[13]) });
    } else if (seccion === "materiales") {
      out.materiales.push({ codigo: c1, descripcion: desc, unidad: txt(fila[9]), cantidad: num(fila[10]), precio: num(fila[11]), valor: num(fila[13]) });
    } else if (seccion === "transporte") {
      out.transporte.push({ codigo: c1, descripcion: desc, unidad: txt(fila[8]), cantidad: num(fila[9]), distancia_km: num(fila[10]), tarifa: num(fila[12]), valor: num(fila[13]) });
    } else if (seccion === "mano_obra") {
      out.mano_obra.push({ codigo: c1, descripcion: desc, jornal: num(fila[8]), prestaciones: num(fila[9]), jornal_total: num(fila[10]), rendimiento: num(fila[11]), valor: num(fila[13]) });
    }
  }
  return out;
}

async function main() {
  console.log(`[capturar_invias_apu] vigencia ${VIGENCIA} · referencia ${REF}`);
  // 1 · el listado de provincias sale del libro de referencia
  const urlRef = `${BASE}APU_${REF}_TOLIMA__IBAGUE_${ANIO}_${PERIODO}.xlsx`;
  let refBytes = null;
  const cacheRef = path.join(require("os").tmpdir(), `APU_${REF}_${VIGENCIA}.xlsx`);
  if (fs.existsSync(cacheRef)) refBytes = new Uint8Array(fs.readFileSync(cacheRef));
  else {
    const r = await bajar(urlRef);
    if (!r.bytes) throw new Error(`no se pudo bajar el libro de referencia (${r.status}): ${urlRef}`);
    refBytes = r.bytes; fs.writeFileSync(cacheRef, Buffer.from(refBytes));
  }
  const libroRef = await XLSXLectura.leerLibro(refBytes, { inflar });
  const hProv = libroRef.hojas.find((x) => /LISTADO DE PROVINCIAS/i.test(x.nombre));
  if (!hProv) throw new Error("el libro de referencia no trae LISTADO DE PROVINCIAS");
  const provincias = [];
  let dep = null;
  for (const f of hProv.filas.slice(6)) {
    if (f[1]) dep = txt(f[1]);
    if (f[2] && f[4]) provincias.push({ cod: txt(f[4]), departamento: dep, provincia: txt(f[2]) });
  }
  console.log(`  provincias en el listado: ${provincias.length}`);
  const itemsRef = leerIndice(libroRef);
  console.log(`  ítems en el ÍNDICE de referencia: ${itemsRef.length}`);
  // composición desde la referencia
  const composicion = new Map();
  for (const it of itemsRef) {
    const h = libroRef.hojas.find((x) => x.nombre.trim() === it.codigo);
    if (h) composicion.set(it.codigo, leerComposicion(h));
  }
  console.log(`  composiciones leídas: ${composicion.size}`);

  // 2 · cada provincia: bajar, leer ÍNDICE, guardar totales
  const seleccion = SOLO ? provincias.filter((p) => SOLO.has(p.cod)) : provincias;
  const precios = new Map(itemsRef.map((it) => [it.codigo, new Array(seleccion.length).fill(null)]));
  const componentes = new Map(itemsRef.map((it) => [it.codigo, new Array(seleccion.length).fill(null)]));
  const fallidas = [], ok = [];
  let idx = 0;
  async function trabajador() {
    while (idx < seleccion.length) {
      const i = idx++;
      const p = seleccion[i];
      const depUrl = variantesNombre(p.departamento);
      const provUrl = variantesNombre(p.provincia);
      let bytes = null, usada = null;
      for (const d of depUrl) {
        for (const pv of provUrl) {
          const url = `${BASE}APU_${p.cod}_${d}__${pv}_${ANIO}_${PERIODO}.xlsx`;
          const r = (p.cod === REF && refBytes) ? { status: 200, bytes: refBytes } : await bajar(url);
          if (r.bytes) { bytes = r.bytes; usada = url; break; }
        }
        if (bytes) break;
      }
      if (!bytes) { fallidas.push({ ...p, motivo: "ninguna variante de nombre respondió 200" }); console.log(`  ✗ ${p.cod} ${p.departamento} / ${p.provincia}`); continue; }
      try {
        const libro = await XLSXLectura.leerLibro(bytes, { inflar });
        const items = leerIndice(libro);
        let n = 0;
        for (const it of items) {
          if (!precios.has(it.codigo)) continue;   // un código que la referencia no trae se declara al final
          precios.get(it.codigo)[i] = it.total == null ? null : Math.round(it.total);
          componentes.get(it.codigo)[i] = [it.equipo, it.materiales, it.transporte, it.mano_obra].map((v) => (v == null ? null : Math.round(v)));
          n++;
        }
        ok.push({ ...p, url: usada, items: n });
        console.log(`  ✓ ${p.cod} ${p.departamento} / ${p.provincia} · ${n} ítems`);
      } catch (e) {
        fallidas.push({ ...p, motivo: e.message });
        console.log(`  ✗ ${p.cod} ${p.departamento} / ${p.provincia}: ${e.message}`);
      }
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCIA }, trabajador));

  // 3 · escribir
  const iRef = seleccion.findIndex((p) => p.cod === REF);
  const salida = {
    _meta: {
      que_es: "APU de REFERENCIA regionalizados del INVIAS: 526 ítems de pago (Especificaciones Generales de Construcción de Carreteras) con su costo directo por provincia y, de la provincia de referencia, la composición completa (equipo, materiales, transporte, mano de obra). Es una referencia oficial para presupuestar obra vial — no una cotización — y viaja con su vigencia y su provincia declaradas.",
      fuente: "INVIAS · Análisis de Precios Unitarios de Referencia Regionalizados (libros Excel por provincia)",
      url_patron: `${BASE}APU_{cod}_{DEPARTAMENTO}__{PROVINCIA}_${ANIO}_${PERIODO}.xlsx`,
      vigencia: VIGENCIA, capturado_el: new Date().toISOString().slice(0, 10),
      generado_por: "tests/capturar_invias_apu.js (herramienta manual con red; la app nunca llama al INVIAS)",
      licencia: "Los documentos del INVIAS prohíben el uso comercial sin autorización previa. Si Detekta se comercializa con estos datos, pedirla a preciosunitarios@invias.gov.co.",
      provincia_referencia: iRef >= 0 ? { cod: seleccion[iRef].cod, departamento: seleccion[iRef].departamento, provincia: seleccion[iRef].provincia } : null,
      provincias_capturadas: ok.length, provincias_fallidas: fallidas,
      items: itemsRef.length, composiciones: composicion.size,
      componentes_orden: ["equipo", "materiales", "transporte", "mano_obra"],
      nota_composicion: "Las cantidades y rendimientos de la composición son los mismos en todas las provincias (así lo construye el INVIAS): lo que cambia por provincia es el precio de cada insumo. Los precios unitarios de las líneas son los de la provincia de referencia.",
    },
    provincias: seleccion.map((p) => ({ cod: p.cod, departamento: p.departamento, provincia: p.provincia })),
    items: itemsRef.map((it) => ({
      codigo: it.codigo, capitulo: it.capitulo, articulo: it.articulo, descripcion: it.descripcion, unidad: it.unidad,
      precios: precios.get(it.codigo),
      componentes: componentes.get(it.codigo),
      composicion: composicion.get(it.codigo) || null,
    })),
  };
  fs.writeFileSync(SALIDA, JSON.stringify(salida));
  const kb = Math.round(fs.statSync(SALIDA).size / 1024);
  console.log(`\n[capturar_invias_apu] ${ok.length} provincias · ${fallidas.length} fallidas · ${itemsRef.length} ítems → ${SALIDA} (${kb} KB)`);
  if (fallidas.length) console.log("  fallidas:", fallidas.map((f) => `${f.cod} ${f.departamento}/${f.provincia} (${f.motivo})`).join("; "));
}

main().catch((e) => { console.error(e); process.exit(1); });
