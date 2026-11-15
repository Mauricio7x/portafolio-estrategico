"use strict";
/* ============================================================================
   Plan precio · descarga de la mínima cuantía de OBRA adjudicada y de sus ofertas (14-nov-2026)
   ----------------------------------------------------------------------------
   Solo LEE datos.gov.co (GET, sin token). No escribe en ningún servicio ni toca la aplicación.

     node tools/analisis/plan_precio/minima_descargar.js <carpeta_de_datos>
     node tools/analisis/plan_precio/minima_medir.js     <carpeta_de_datos>

   Qué baja (la carpeta NO se versiona; las cifras van a resultados_minima_AAAA-MM-DD.json):
     1 · procesos_N.json   p6dx-8zbt (procesos de SECOP II): tipo_de_contrato = «Obra», modalidad
                           «Mínima cuantía», adjudicado = «Si», recepción desde 2022-01-01. Paginado con
                           $limit/$offset/$order (id_del_portafolio, :id).
     2 · ofertas/tN.json   wi7w-2nvm (ofertas por proceso), por tandas de 50 `id_del_proceso_de_compra`
                           (= `id_del_portafolio`), agrupadas por proveedor y valor como el paso 5 de
                           tools/analisis/plan_x20/descargar.sh.
     3 · consulta.json     la fecha y hora de la consulta y los conteos de lo bajado.
   Reanudable: una página o tanda ya bajada y legible no se vuelve a pedir (borre la carpeta para
   repetir desde cero). p6dx-8zbt se reemplaza entero en cada carga de SECOP II: dos corridas en días
   distintos dan cifras parecidas, no idénticas.
   Usa `curl` del sistema (respeta el proxy del entorno); reintenta con espera ante error o 429.
   ============================================================================ */
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const P = "https://www.datos.gov.co/resource/p6dx-8zbt.json";
const O = "https://www.datos.gov.co/resource/wi7w-2nvm.json";
const DESDE = "2022-01-01";
const DONDE = `tipo_de_contrato='Obra' and modalidad_de_contratacion='Mínima cuantía' and adjudicado='Si' and fecha_de_recepcion_de >= '${DESDE}T00:00:00'`;
const CAMPOS = ["id_del_portafolio", "id_del_proceso", "referencia_del_proceso", "entidad", "nit_entidad", "departamento_entidad", "ciudad_entidad", "ordenentidad",
  "modalidad_de_contratacion", "precio_base", "fecha_de_recepcion_de", "fecha_de_publicacion_del", "fecha_adjudicacion", "fase", "estado_del_procedimiento",
  "estado_de_apertura_del_proceso", "adjudicado", "respuestas_al_procedimiento", "proveedores_unicos_con", "conteo_de_respuestas_a_ofertas", "numero_de_lotes",
  "nombre_del_proveedor", "nit_del_proveedor_adjudicado", "codigoproveedor", "valor_total_adjudicacion", "codigo_principal_de_categoria"].join(",");
const PAGINA = 5000, TANDA = 50, INTENTOS = 6;

const dormir = (ms) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
const listaLegible = (f) => { try { const j = JSON.parse(fs.readFileSync(f, "utf8")); return Array.isArray(j) ? j : null; } catch (_) { return null; } };

/* GET con reintentos: exige HTTP 200 y una lista JSON. Devuelve la lista. */
function bajar(salida, url, pares) {
  const ya = fs.existsSync(salida) ? listaLegible(salida) : null;
  if (ya) return ya;
  let ultimo = "";
  for (let i = 1; i <= INTENTOS; i++) {
    const args = ["-sS", "-m", "240", "-G", url, "-o", salida + ".tmp", "-w", "%{http_code}"];
    for (const [k, v] of pares) args.push("--data-urlencode", `${k}=${v}`);
    try {
      const codigo = execFileSync("curl", args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
      const j = codigo === "200" ? listaLegible(salida + ".tmp") : null;
      if (j) { fs.renameSync(salida + ".tmp", salida); return j; }
      ultimo = `HTTP ${codigo}`;
    } catch (e) { ultimo = String(e.stderr || e.message).trim().slice(0, 200); }
    process.stderr.write(`   reintento ${i}/${INTENTOS} de ${path.basename(salida)} (${ultimo})\n`);
    dormir(ultimo === "HTTP 429" ? 20000 * i : 4000 * i);
  }
  throw new Error(`FALLÓ la descarga de ${salida}: ${ultimo}`);
}

function main(dir) {
  fs.mkdirSync(path.join(dir, "ofertas"), { recursive: true });
  const inicio = new Date().toISOString();

  /* 1 · procesos */
  let filas = 0; const ids = new Set();
  for (let pag = 0; ; pag++) {
    const j = bajar(path.join(dir, `procesos_${pag}.json`), P, [["$select", CAMPOS], ["$where", DONDE], ["$order", "id_del_portafolio,:id"], ["$limit", PAGINA], ["$offset", pag * PAGINA]]);
    filas += j.length;
    for (const r of j) if (r.id_del_portafolio) ids.add(r.id_del_portafolio);
    console.log(`1 · procesos página ${pag}: ${j.length} filas`);
    if (j.length < PAGINA) break;
  }
  /* control: el conteo del servidor en el mismo momento */
  const c = bajar(path.join(dir, "conteo.json"), P, [["$select", "count(*) as filas,count(distinct id_del_portafolio) as portafolios"], ["$where", DONDE]]);
  console.log(`   bajado: ${filas} filas, ${ids.size} portafolios · servidor: ${JSON.stringify(c[0])}`);

  /* 2 · ofertas por tandas */
  const lista = [...ids].sort();
  let tandas = 0, filasOf = 0;
  for (let i = 0; i < lista.length; i += TANDA) {
    const dentro = lista.slice(i, i + TANDA).map((x) => `'${x}'`).join(",");
    const j = bajar(path.join(dir, "ofertas", `t${tandas}.json`), O, [
      ["$select", "id_del_proceso_de_compra,c_digo_proveedor,nit_del_proveedor,nombre_proveedor,valor_de_la_oferta,count(*) as filas,max(fecha_de_registro) as ultima"],
      ["$where", `id_del_proceso_de_compra in (${dentro})`],
      ["$group", "id_del_proceso_de_compra,c_digo_proveedor,nit_del_proveedor,nombre_proveedor,valor_de_la_oferta"], ["$limit", 30000]]);
    if (j.length >= 30000) throw new Error(`la tanda ${tandas} llegó al límite de 30000 filas: bajar TANDA`);
    filasOf += j.length; tandas++;
    if (tandas % 20 === 0) console.log(`2 · ofertas: ${tandas} tandas, ${filasOf} filas agrupadas`);
  }
  console.log(`2 · ofertas: ${tandas} tandas, ${filasOf} filas agrupadas`);

  const meta = { consulta_inicio_utc: inicio, consulta_fin_utc: new Date().toISOString(), consulta: inicio.slice(0, 10), fuente_procesos: P, fuente_ofertas: O, donde: DONDE,
    filas_procesos: filas, portafolios: ids.size, conteo_servidor: c[0], tandas_ofertas: tandas, filas_ofertas_agrupadas: filasOf };
  /* si la carpeta se reanudó, se conserva el inicio de la PRIMERA corrida */
  const fMeta = path.join(dir, "consulta.json");
  if (fs.existsSync(fMeta)) { try { const a = JSON.parse(fs.readFileSync(fMeta, "utf8")); if (a.consulta_inicio_utc) { meta.consulta_inicio_utc = a.consulta_inicio_utc; meta.consulta = a.consulta; } } catch (_) { /* se reescribe */ } }
  fs.writeFileSync(fMeta, JSON.stringify(meta, null, 1));
  console.log("listo: " + JSON.stringify(meta));
}

if (require.main === module) {
  const dir = process.argv[2];
  if (!dir) { console.error("uso: node tools/analisis/plan_precio/minima_descargar.js <carpeta_de_datos>"); process.exit(2); }
  main(dir);
}
