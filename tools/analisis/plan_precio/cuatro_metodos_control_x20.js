"use strict";
/* ============================================================================
   Plan precio · control cruzado: el CÓDIGO de docs/PLAN_X20.md §2.5 con los datos de HOY (14-nov-2026)
   ----------------------------------------------------------------------------
   Solo MIDE. Separa dos causas cuando las cifras de `cuatro_metodos_medir.js` no calcan las publicadas:
   que los datos abiertos cambiaron desde el 11-nov-2026 (p6dx-8zbt se reemplaza entero en cada carga), o
   que la tubería nueva limpia distinto. Para eso corre `medir` de tools/analisis/plan_x20/medir.js TAL CUAL
   (se llama, no se copia ni se toca) sobre lo que bajó `cuatro_metodos_descargar.sh`, armando en
   <carpeta>/control_x20/ los archivos que ese script espera:
     · historial.json   las filas de p6dx con las condiciones del paso 3 de plan_x20/descargar.sh (menor
                        cuantía, adjudicado, recepción desde 2024, fase de ofertas);
     · of_prueba, of_antes   las ofertas de los procesos que `medir.js tandas` elige con SU regla, tomadas
                        solo de wi7w-2nvm (lo que bajó el plan);
     · modalidades.json, ultimo_ano.json, abiertos.json y casos.json van vacíos: las partes A, F y G del
       plan no se repiten aquí (salen vacías y no se leen).
   Escribe <carpeta>/control_x20_hoy.json, que `cuatro_metodos_medir.js` incluye en el resultado.

     node tools/analisis/plan_precio/cuatro_metodos_control_x20.js <carpeta> [AAAA-MM-DD]
   ============================================================================ */
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const RAIZ = path.join(__dirname, "..", "..", "..");
const RUTA_X20 = path.join(RAIZ, "tools", "analisis", "plan_x20", "medir.js");
const X20 = require(RUTA_X20);
const BASE = require(path.join(__dirname, "cuatro_metodos_base.js"));

function main() {
  const [dir, fechaArg] = process.argv.slice(2);
  if (!dir) { console.error("uso: node tools/analisis/plan_precio/cuatro_metodos_control_x20.js <carpeta_de_datos> [AAAA-MM-DD]"); process.exit(2); }
  const fecha = fechaArg || new Date().toISOString().slice(0, 10);
  const tmp = path.join(dir, "control_x20");
  fs.rmSync(tmp, { recursive: true, force: true });
  for (const d of ["of_prueba", "of_antes"]) fs.mkdirSync(path.join(tmp, d), { recursive: true });
  const { porId } = BASE.procesosDe(dir);
  const historial = [];
  for (const filas of porId.values()) for (const r of filas) {
    if (r.modalidad_de_contratacion === "Selección Abreviada de Menor Cuantía" && r.adjudicado === "Si" && String(r.fecha_de_recepcion_de || "") >= "2024-01-01T00:00:00"
      && (r.fase === "Presentación de oferta" || r.fase === "Fase de ofertas")) historial.push(r);
  }
  fs.writeFileSync(path.join(tmp, "historial.json"), JSON.stringify(historial));
  for (const f of ["modalidades.json", "ultimo_ano.json", "abiertos.json", "casos.json"]) fs.writeFileSync(path.join(tmp, f), "[]");
  execFileSync(process.execPath, [RUTA_X20, "tandas", tmp], { stdio: ["ignore", "ignore", "inherit"] });
  const idsDe = (f) => new Set(fs.readFileSync(path.join(tmp, f), "utf8").split("\n").flatMap((l) => l.split(",")).map((x) => x.replace(/'/g, "").trim()).filter(Boolean));
  const prueba = idsDe("tandas_prueba.txt"), antes = idsDe("tandas_antes.txt");
  const ofP = [], ofA = [];
  const dOf = path.join(dir, "ofertas_wi7w-2nvm");
  for (const f of fs.readdirSync(dOf).filter((x) => /\.json$/.test(x))) for (const o of JSON.parse(fs.readFileSync(path.join(dOf, f), "utf8"))) {
    if (prueba.has(o.id_del_proceso_de_compra)) ofP.push(o); else if (antes.has(o.id_del_proceso_de_compra)) ofA.push(o);
  }
  fs.writeFileSync(path.join(tmp, "of_prueba", "t1.json"), JSON.stringify(ofP));
  fs.writeFileSync(path.join(tmp, "of_antes", "t1.json"), JSON.stringify(ofA));
  const R = X20.medir(tmp, fecha);
  const publicado = JSON.parse(fs.readFileSync(path.join(RAIZ, "tools", "analisis", "plan_x20", "resultados_2026-11-11.json"), "utf8"));
  const cincoNueve = (X) => { const t = X.E_precios.por_ofertas.find((x) => x.ofertas === "5-9"); return { procesos: t.procesos, azar_pct: t.si_yo_entrara.azar_pct, por_precio: t.si_yo_entrara.por_precio.filter((q) => [92, 94, 95, 96, 96.75].includes(q.pct_del_presupuesto)) }; };
  const anticipar = (X) => { const e = X.E_anticipar_el_grupo; return { procesos_limpios: e.procesos_limpios, aprende: e.aprende, prueba: e.prueba, error_medio_pp: e.error_medio_pp, error_medio_pp_donde_hay_historial: e.error_medio_pp_donde_hay_historial, azar_pct: e.azar_pct, reglas: e.reglas }; };
  const salida = {
    nota: "El código de tools/analisis/plan_x20/medir.js, sin tocar, sobre los datos bajados en la consulta de hoy (ofertas solo de wi7w-2nvm, como el plan). Si calca lo publicado, la diferencia que quede con la tubería nueva es de limpieza y población, no de datos.",
    consulta_publicada: publicado.consulta, consulta_de_hoy: fecha,
    historial: { publicado: publicado.historial, hoy: R.historial },
    cinco_a_nueve_ofertas: { publicado: cincoNueve(publicado), hoy: cincoNueve(R) },
    anticipar_el_grupo: { publicado: anticipar(publicado), hoy: anticipar(R) },
  };
  fs.writeFileSync(path.join(dir, "control_x20_hoy.json"), JSON.stringify(salida, null, 1) + "\n");
  console.log(JSON.stringify(salida, null, 1));
}

if (require.main === module) main();
