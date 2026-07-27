#!/usr/bin/env node
/* ============================================================================
   scripts/respaldo-csv · Respaldo/reconstrucción de emergencia de la caché
   ----------------------------------------------------------------------------
   Para cuando la API viva falle o la caché KV se corrompa. Corre en una
   máquina normal (NO serverless: necesita tiempo y disco).

   Modos:
     node scripts/respaldo-csv.js extraer
        Ejecuta la MISMA extracción exhaustiva del año (lib/extractor) pero
        contra un archivo local `.cache-secop.json` (AlmacenArchivo). Imprime
        la auditoría count(1) vs almacenados. Sirve además como prueba real
        end-to-end contra Socrata desde tu máquina.
        Variables útiles: SOCRATA_APP_TOKEN (recomendado), SECOP_BASE_URL.

     node scripts/respaldo-csv.js csv [salida.csv]
        Descarga masiva del dataset COMPLETO vía el endpoint de exportación
        de datos.gov.co (rows.csv, streaming a disco). Es la red de seguridad
        bruta: no filtra por año (el export no admite filtros) y puede pesar
        varios GB. Última línea de defensa para reconstruir todo offline.

     node scripts/respaldo-csv.js subir
        Copia el contenido de `.cache-secop.json` (extraído con `extraer`)
        a Vercel KV usando KV_REST_API_URL/KV_REST_API_TOKEN del entorno —
        reconstrucción de la caché de producción desde tu máquina.
   ========================================================================== */
"use strict";

const fs = require("fs");
const { crearExtractor } = require("../lib/extractor.js");
const { crearAlmacen, AlmacenArchivo, AlmacenKV } = require("../lib/almacen.js");

const RUTA = ".cache-secop.json";
const CSV_URL = "https://www.datos.gov.co/api/views/p6dx-8zbt/rows.csv?accessType=DOWNLOAD";

async function extraer() {
  const store = new AlmacenArchivo(RUTA);
  const x = crearExtractor({ store });
  let r;
  do {
    r = await x.extraerTodo({ presupuestoMs: 10 * 60e3 }); // tramos de 10 min
    if (!r.done) console.log("[respaldo] pausa programada, continuando…", r.progreso);
  } while (!r.done);
  console.log("[respaldo] auditoría:", JSON.stringify(r.auditoria, null, 2));
}

async function csv(salida) {
  const out = salida || `secop-p6dx-8zbt-${new Date().toISOString().slice(0, 10)}.csv`;
  console.log(`[respaldo] descargando export completo a ${out} (puede tardar y pesar GB)…`);
  const headers = {};
  if (process.env.SOCRATA_APP_TOKEN) headers["X-App-Token"] = process.env.SOCRATA_APP_TOKEN;
  const r = await fetch(CSV_URL, { headers });
  if (!r.ok || !r.body) throw new Error(`export CSV: HTTP ${r.status}`);
  const w = fs.createWriteStream(out);
  const reader = r.body.getReader();
  let bytes = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    w.write(Buffer.from(value)); bytes += value.length;
    if (bytes % (200 * 1024 * 1024) < value.length) console.log(`  …${(bytes / 1e9).toFixed(2)} GB`);
  }
  await new Promise((res) => w.end(res));
  console.log(`[respaldo] listo: ${out} (${(bytes / 1e6).toFixed(1)} MB)`);
}

async function subir() {
  if (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN) {
    throw new Error("faltan KV_REST_API_URL / KV_REST_API_TOKEN en el entorno");
  }
  const local = JSON.parse(fs.readFileSync(RUTA, "utf8"));
  const kv = new AlmacenKV(process.env.KV_REST_API_URL, process.env.KV_REST_API_TOKEN);
  const claves = Object.keys(local);
  let n = 0;
  for (const k of claves) { await kv.set(k, local[k]); n++; if (n % 25 === 0) console.log(`  …${n}/${claves.length}`); }
  console.log(`[respaldo] subidas ${n} claves a KV`);
}

const modo = process.argv[2] || "extraer";
({ extraer, csv: () => csv(process.argv[3]), subir }[modo] || (() => {
  console.error("modo desconocido; usa: extraer | csv [salida] | subir");
  process.exit(2);
}))().catch((e) => { console.error("[respaldo] ERROR:", e.message); process.exit(1); });
