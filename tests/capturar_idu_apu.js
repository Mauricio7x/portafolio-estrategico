#!/usr/bin/env node
/* tests/capturar_idu_apu.js · LOS PRECIOS DE REFERENCIA DEL IDU COMO ÍTEMS (ago 2026)
   ─────────────────────────────────────────────────────────────────────────────
   Herramienta MANUAL con red (como capturar_invias.js y capturar_invias_apu.js):
   la app jamás llama al IDU en la ruta de una petición. Baja el «Visor de
   Precios Unitarios de Referencia» del IDU (Bogotá) —un libro xlsx publicado en
   https://www.idu.gov.co/page/siipviales/economico/portafolio— y produce
   data/apu_idu_items.json con:
     · items    los APU de la hoja «APU» (código, capítulo, subcapítulo, nombre,
                unidad, valor = costo directo de referencia, fecha de la
                actualización de la que viene el precio). Se EXCLUYEN las hojas
                de proyecto específico (APU_Proy_Especif, Troncal Cll 13
                nocturno) y los valores estimativos de conservación: el propio
                visor dice que solo valen para su proyecto y vigencia.
     · insumos  la hoja «Inusmos» (sic) con su grupo, unidad y precio, para una
                referencia por insumo futura.
   Uso:
     node tests/capturar_idu_apu.js --xlsx <libro.xlsx> --vigencia 2026-I --publicado 2026-07-29 --url <url>
     node tests/capturar_idu_apu.js --url <url> --vigencia 2026-I --publicado 2026-07-29   (baja el libro)
   Reglas:
   · El precio es el que publica el IDU para BOGOTÁ; no se regionaliza (no hay
     componentes para aplicar los factores del catálogo, y un factor único sería
     inventado). La app lo declara.
   · Los precios de los insumos «como regla general tienen en cuenta el IVA»
     (texto del visor). Los APU son costo directo: sin AIU.
   · Un valor ≤ 0 o ilegible NO se escribe: se cuenta en `descartados`. */
"use strict";
const fs = require("fs");
const path = require("path");
const zlib = require("zlib");
const Le = require("../public/xlsx_lectura.js");

const args = process.argv.slice(2);
const opt = (k, d = null) => { const i = args.indexOf(`--${k}`); return i >= 0 ? args[i + 1] : d; };
const URL_DEF = "https://www.idu.gov.co/Archivos_Portal/2026/transparencia/inf-de-interes/siipviales/economico/07-julio/1A.%20Visor_BPR_2026-I_Fase_I_29-07-2026.xlsx";
const url = opt("url", URL_DEF);
const vigencia = opt("vigencia", "2026-I");
const publicado = opt("publicado", "2026-07-29");
const salida = path.join(__dirname, "..", "data", "apu_idu_items.json");

const unidad = (u) => {
  const s = String(u || "").trim().toLowerCase().replace(/³/g, "3").replace(/²/g, "2");
  const map = { m3: "m3", m2: "m2", ml: "ml", m: "ml", un: "und", und: "und", u: "und", kg: "kg", gl: "glb", glb: "glb", hr: "hora", h: "hora", ton: "ton", t: "ton", jr: "jornal", dia: "dia", km: "km", lt: "l", l: "l", mes: "mes", pto: "pto", vj: "viaje" };
  return map[s] || s || null;
};
const numero = (v) => (typeof v === "number" && Number.isFinite(v) ? v : (typeof v === "string" && /^\s*[\d.,]+\s*$/.test(v) ? Number(v.replace(/\./g, "").replace(",", ".")) : null));

async function main() {
  let buf;
  const local = opt("xlsx");
  if (local) buf = fs.readFileSync(local);
  else {
    const r = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0 (Detekta captura manual)" } });
    if (!r.ok) throw new Error(`HTTP ${r.status} al bajar el visor`);
    buf = Buffer.from(await r.arrayBuffer());
  }
  const libro = await Le.leerLibro(new Uint8Array(buf), { inflar: (u8) => zlib.inflateRawSync(Buffer.from(u8)) });
  const hojaApu = libro.hojas.find((h) => h.nombre === "APU");
  const hojaIns = libro.hojas.find((h) => /^ins?umos$/i.test(h.nombre.trim()) || h.nombre === "Inusmos");
  if (!hojaApu) throw new Error(`no hay hoja «APU»; hojas: ${libro.hojas.map((h) => h.nombre).join(", ")}`);
  const descartados = { sin_codigo: 0, sin_valor: 0, sin_nombre: 0 };
  const items = [];
  for (const f of hojaApu.filas) {
    // columnas: [null, Origen, Capítulo, Subcapítulo, Código, Nombre, UM, Valor, Fecha de actualización]
    const cod = f[4]; const nombre = f[5]; const val = numero(f[7]);
    if (!(typeof cod === "number" || /^\d+$/.test(String(cod || "")))) { if (f[5]) descartados.sin_codigo++; continue; }
    if (!nombre || typeof nombre !== "string") { descartados.sin_nombre++; continue; }
    if (val == null || val <= 0) { descartados.sin_valor++; continue; }
    items.push({ codigo: String(cod), origen: String(f[1] || "").trim() || null, capitulo: String(f[2] || "").trim() || null, subcapitulo: String(f[3] || "").trim() || null,
      descripcion: nombre.replace(/\s+/g, " ").trim(), unidad_fuente: String(f[6] || "").trim() || null, unidad: unidad(f[6]), precio: Math.round(val), actualizacion: String(f[8] || "").trim() || null });
  }
  const insumos = [];
  if (hojaIns) {
    for (const f of hojaIns.filas) {
      // [null, Origen, Grupo, Código, Nombre, UM, Precio, Fecha]
      const cod = f[3]; const val = numero(f[6]);
      if (!(typeof cod === "number" || /^\d+$/.test(String(cod || "")))) continue;
      if (!f[4] || val == null || val <= 0) continue;
      insumos.push({ codigo: String(cod), grupo: String(f[2] || "").trim() || null, nombre: String(f[4]).replace(/\s+/g, " ").trim(), unidad_fuente: String(f[5] || "").trim() || null, unidad: unidad(f[5]), precio: val, actualizacion: String(f[7] || "").trim() || null });
    }
  }
  const capitulos = {}; for (const it of items) capitulos[it.capitulo] = (capitulos[it.capitulo] || 0) + 1;
  const salidaJson = {
    _meta: {
      que_es: "Precios unitarios de REFERENCIA del IDU (Bogotá D.C.): los APU de la Base de Precios de Referencia (BPR) con su costo directo de referencia, y los insumos con precio. Es una referencia oficial para presupuestar obras de infraestructura vial y espacio público en Bogotá — no una cotización — y viaja con su vigencia y fecha de publicación.",
      fuente: "IDU · Dirección Técnica de Inteligencia de Negocio e Innovación (DTINI) · Visor de Precios Unitarios de Referencia",
      url, vigencia, publicado, capturado_el: new Date().toISOString().slice(0, 10),
      ciudad: "Bogotá D.C.", departamento: "BOGOTA D.C.",
      alcance: "Los precios son de Bogotá y NO se regionalizan: el visor no publica componentes por ítem y un factor único sería inventado. Fuera de Bogotá la app lo declara.",
      iva_aiu: "El visor declara que el registro de precios de insumos «como regla general tiene en cuenta el IVA». Los APU son costo directo: no incluyen AIU.",
      excluido: "Hojas «APU_Proy_Especif», «Insumos_Proy_Especif» y «Troncal Cll 13» (proyecto específico / horario nocturno: el visor dice que solo valen para su proyecto y vigencia) y «Valores de Refer_Conserva» (valores estimativos).",
      generado_por: "tests/capturar_idu_apu.js (herramienta manual con red; la app nunca llama al IDU)",
      licencia: "Información pública del IDU (portal de transparencia). Citar la fuente.",
      items: items.length, insumos: insumos.length, capitulos, descartados,
      por_actualizacion: items.reduce((a, it) => { a[it.actualizacion] = (a[it.actualizacion] || 0) + 1; return a; }, {}),
    },
    items, insumos,
  };
  fs.writeFileSync(salida, JSON.stringify(salidaJson));
  console.log(`✔ ${items.length} APU y ${insumos.length} insumos → ${path.relative(process.cwd(), salida)} (${(fs.statSync(salida).size / 1024).toFixed(0)} KB)`);
  console.log("  capítulos:", Object.entries(capitulos).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([k, v]) => `${k} ${v}`).join(" · "));
  console.log("  descartados:", descartados);
}
main().catch((e) => { console.error("✘", e.message); process.exit(1); });
