#!/usr/bin/env node
/* tests/cobertura.js · QUÉ DOCUMENTOS LEE Detekta Y CUÁLES NO, Y POR QUÉ (19-oct-2026)
   ─────────────────────────────────────────────────────────────────────────────────────
   Solo lectura: no escribe nada, no toca Redis ni producción. Usa la MISMA función que decide en la aplicación
   (`planDeLectura` de lib/documentos_proceso.js), no una copia: una medición con otra regla mediría otra cosa.

     node tests/cobertura.js --proceso CO1.REQ.11033801   la tabla de UN proceso, archivo por archivo
                                                          (consulta el índice público de datos.gov.co)
     node tests/cobertura.js indice.json                  el censo de muchos procesos; `indice.json` es
                                                          {portafolio: [filas del dataset dmgg-8hin]}
     node tests/cobertura.js --ayuda

   Nace del defecto de fondo del 19-oct-2026: lo que se lee se decidía por el nombre del archivo y por una lista cerrada de
   formatos, y lo que quedaba fuera salía en silencio. Esto lo hace visible; no lo arregla. Cada cifra es de la fecha en que se
   corre (el índice de SECOP II cambia cada día): no se copia a ningún documento sin su fecha. */
"use strict";
const fs = require("fs");
const D = require("../lib/documentos_proceso.js");

const MB = 1048576;
const ayuda = () => console.log("Uso: node tests/cobertura.js --proceso CO1.REQ.<n>   |   node tests/cobertura.js <indice.json>");
const mbDe = (b) => (b == null ? "?" : (b / MB).toFixed(1).replace(".", ",") + " MB");

/* el motivo sin la cifra, para agrupar: «pesa más de 20 MB…» y «pesa más de 20 MB…» son uno solo */
const motivoAgrupable = (m) => String(m || "sin motivo").replace(/\d+(?:[.,]\d+)? MB/g, "N MB");

/* Una fila por archivo con su decisión. Devuelve las líneas, para poder probarla sin imprimir. */
function tablaDeProceso(filas, opciones = {}) {
  const p = D.planDeLectura(filas, opciones);
  const lineas = [`archivos publicados: ${p.resumen.publicados} · distintos: ${p.resumen.distintos} · de la entidad: ${p.resumen.de_la_entidad} · de proponentes: ${p.resumen.de_proponentes} · en el plan de lectura: ${p.resumen.en_plan}`];
  for (const a of p.archivos) {
    const decision = !a.de_la_entidad ? "FUERA · lo subió un proponente" : a.en_plan ? "SE LEE" : `FUERA · ${a.motivo_omision}`;
    lineas.push(`${String(a.nombre || "").slice(0, 58).padEnd(58)} .${String(a.extension || "?").padEnd(4)} ${mbDe(a.bytes).padStart(9)}  ${a.tipo_legible}  →  ${decision}`);
  }
  return lineas;
}

/* El censo de un conjunto de procesos: cuántos archivos de la entidad quedan fuera y por qué. */
function censo(indice, opciones = {}) {
  const porMotivo = new Map();
  let procesos = 0, entidad = 0, enPlan = 0, sinPresupuesto = 0;
  for (const filas of Object.values(indice)) {
    const p = D.planDeLectura(filas, opciones);
    procesos++;
    let hayPresupuesto = false;
    for (const a of p.archivos) {
      if (!a.de_la_entidad) continue;
      entidad++;
      if (a.en_plan) { enPlan++; if (a.tipo === "presupuesto") hayPresupuesto = true; continue; }
      const k = motivoAgrupable(a.motivo_omision);
      const x = porMotivo.get(k) || { n: 0, ejemplos: [] };
      x.n++; if (x.ejemplos.length < 3) x.ejemplos.push(`${a.nombre} [${a.tipo}]`);
      porMotivo.set(k, x);
    }
    if (!hayPresupuesto) sinPresupuesto++;
  }
  return { procesos, entidad, enPlan, fuera: entidad - enPlan, sinPresupuesto, porMotivo: [...porMotivo].sort((a, b) => b[1].n - a[1].n) };
}

function lineasDeCenso(c) {
  const l = [`procesos: ${c.procesos} · archivos de la entidad: ${c.entidad} · en el plan de lectura: ${c.enPlan} · FUERA del plan: ${c.fuera}`,
    `procesos sin ningún presupuesto o cantidades en el plan de lectura: ${c.sinPresupuesto} de ${c.procesos}`, "", "FUERA DEL PLAN, por motivo:"];
  for (const [k, x] of c.porMotivo) l.push(`${String(x.n).padStart(6)}  ${k}`, `        ej: ${x.ejemplos.join(" ; ").slice(0, 200)}`);
  return l;
}

async function indiceDe(idProceso) {
  const pedir = async (url, params) => { const u = new URL(url); for (const [k, v] of Object.entries(params)) u.searchParams.set(k, v); const r = await fetch(u, { signal: AbortSignal.timeout(60000) }); if (!r.ok) throw new Error(`${u.hostname} respondió ${r.status}`); return r.json(); };
  const sql = (s) => String(s).replace(/'/g, "''");
  const p = await pedir("https://www.datos.gov.co/resource/p6dx-8zbt.json", { "$select": "id_del_proceso,id_del_portafolio", "$where": `id_del_proceso='${sql(idProceso)}'`, "$limit": "1" });
  const portafolio = p[0] && p[0].id_del_portafolio;
  if (!portafolio) throw new Error(`el proceso ${idProceso} no está en p6dx`);
  return pedir("https://www.datos.gov.co/resource/dmgg-8hin.json", { "$select": "id_documento,nombre_archivo,tamanno_archivo,extensi_n,fecha_carga,url_descarga_documento",
    "$where": `proceso='${sql(portafolio)}'`, "$order": "fecha_carga", "$limit": "2000" });
}

module.exports = { tablaDeProceso, censo, lineasDeCenso, motivoAgrupable };

if (require.main === module) {
  (async () => {
    const [a, b] = process.argv.slice(2);
    if (!a || a === "--ayuda" || a === "-h") return ayuda();
    if (a === "--proceso") {
      if (!/^CO1\.[A-Z]+\.\d+$/.test(String(b || ""))) return ayuda();
      const filas = await indiceDe(b);
      console.log(`${b} · consultado el ${new Date().toISOString().slice(0, 10)} en datos.gov.co (dmgg-8hin)`);
      console.log(tablaDeProceso(filas).join("\n"));
      return;
    }
    console.log(`censo de ${a} (la decisión es la de lib/documentos_proceso.planDeLectura)`);
    console.log(lineasDeCenso(censo(JSON.parse(fs.readFileSync(a, "utf8")))).join("\n"));
  })().catch((e) => { console.error("No se pudo:", e && e.message); process.exit(1); });
}
