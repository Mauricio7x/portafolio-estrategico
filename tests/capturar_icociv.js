/* ============================================================================
   tests/capturar_icociv · el NÚMERO ÍNDICE del ICOCIV (DANE) para el catálogo APU
   ----------------------------------------------------------------------------
   HERRAMIENTA MANUAL, NO UNA PRUEBA (el patrón de los otros `capturar_*.js`):
   tests/e2e.js no la ejecuta; solo importa sus funciones puras y las prueba.
   La aplicación NUNCA llama al DANE: lo que aquí se escriba en
   `data/apu_catalogo.json` es lo que se sirve.

     node tests/capturar_icociv.js --mes 2026-06 --indice-base 118,43 --indice-vigente 124,11 \
          --url https://www.dane.gov.co/files/operaciones/ICOCIV/bol-ICOCIV-jun2026.pdf [--escribir]

   Sin `--escribir` solo ENSEÑA lo que cambiaría: en precios el falso caro es el
   POSITIVO (un precio reajustado con un índice mal tecleado se presupuesta), así
   que escribir exige pedirlo.

   QUÉ HACE Y POR QUÉ ASÍ (6-sep-2026, M-DGF-15):
   · La semilla llevó los precios recuperados de marzo de 2025 a la base vigente
     con la VARIACIÓN ANUAL del boletín (4,7 % → factor 1,047) y no guardó el
     número índice (base dic-2021 = 100). Sin los dos índices el factor no se
     puede recomponer como cociente ni discutir contra la fuente. Aquí se guardan
     los DOS índices, la URL del boletín y la fecha de captura, y el factor es
     `indice_vigente / indice_base` (cuatro decimales, declarados).
   · El factor se reaplica SOLO a los insumos `fuente="recuperado"` (13 de 437),
     y SIEMPRE desde su `precio_marzo_2025` —el precio del módulo recuperado,
     que cada uno conserva—, nunca sobre el ya reajustado (eso acumularía
     factores). Los 389 `adjudicado` (contrato Nogal 4, 2025) y los 34
     `estimado` no se tocan: reajustarlos es una decisión de negocio aparte.
   · Las cuadrillas son la SUMA de sus jornales (la regla del catálogo,
     `componentes`): se recomponen sumando los jornales ya reajustados en vez de
     redondear por su cuenta, para que `validarCatalogo` —que se llama ANTES de
     escribir— siga cuadrando al peso. Y se recomponen TODAS las que lleven un
     jornal reajustado, también la «derivada» `mo_cuadrilla_1of_5ay`: la
     primera corrida en seco abortó por ella.
   · NO DESCARGA EL BOLETÍN. El 6-sep-2026 dane.gov.co respondió 403 desde el
     entorno de desarrollo, así que el formato del PDF no pudo verse; un lector
     escrito a ciegas sobre un documento no visto produciría un número inventado
     con aspecto de medición. Los dos índices los teclea quien los lee del anexo
     del DANE, y quedan con su URL para que cualquiera los compruebe.
   · La fecha de captura va en HORA COLOMBIA (UTC−5), como en los demás
     capturadores.
   · Al escribir sube la versión menor de `_meta.version`: la carga del catálogo
     en Redis (`/api/admin?op=cargar-catalogo`) compara esa versión y sin cambio
     no reescribe. Node serializa los flotantes `1.0` como `1`, así que la
     primera escritura cambia también esas líneas del JSON: es formato, no dato.
   ========================================================================== */
"use strict";

const fs = require("fs");
const path = require("path");
const { validarCatalogo } = require("../lib/apu/catalogo.js");

const RUTA_CATALOGO = path.join(__dirname, "..", "data", "apu_catalogo.json");
/* el mes del que salen los precios recuperados: es el de `_meta.icociv.base_original_precios_recuperados` */
const MES_BASE = "2025-03";
const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
/* un cociente fuera de este rango no es un índice: es un dedo que resbaló */
const FACTOR_MINIMO = 0.5, FACTOR_MAXIMO = 2;

const hoyColombia = () => new Date(Date.now() - 5 * 3600e3).toISOString().slice(0, 10);

/* «118,43» y «118.43» valen; cualquier otra cosa es null (jamás 0) */
function numeroLocal(s) {
  if (s === null || s === undefined) return null;
  const t = String(s).trim().replace(/\./g, (m, i, str) => (str.includes(",") ? "" : m)).replace(",", ".");
  const n = Number(t);
  return t !== "" && Number.isFinite(n) ? n : null;
}

function argumentos(argv) {
  const a = Array.isArray(argv) ? argv : [];
  const leer = (k) => { const i = a.indexOf(k); return i >= 0 && i + 1 < a.length ? a[i + 1] : null; };
  return {
    mes: leer("--mes"),
    indice_base: numeroLocal(leer("--indice-base")),
    indice_vigente: numeroLocal(leer("--indice-vigente")),
    url: leer("--url"),
    escribir: a.includes("--escribir"),
  };
}

function mesLegible(aaaaMm) {
  const m = /^(\d{4})-(\d{2})$/.exec(String(aaaaMm || ""));
  if (!m || Number(m[2]) < 1 || Number(m[2]) > 12) return null;
  const nombre = MESES[Number(m[2]) - 1];
  return `${nombre[0].toUpperCase()}${nombre.slice(1)} ${m[1]}`;
}

/* el factor es el cociente de los dos índices, con cuatro decimales; null si
   alguno no es un número mayor que 0 (un índice en 0 no existe) */
function factorDe(indiceBase, indiceVigente) {
  const b = Number(indiceBase), v = Number(indiceVigente);
  if (!(b > 0) || !(v > 0) || !Number.isFinite(b) || !Number.isFinite(v)) return null;
  return Math.round((v / b) * 1e4) / 1e4;
}

function versionSiguiente(v) {
  const m = /^(\d+)\.(\d+)\.(\d+)$/.exec(String(v || ""));
  return m ? `${m[1]}.${Number(m[2]) + 1}.0` : "2.1.0";
}

/* Devuelve un catálogo NUEVO (el recibido no se toca) con el factor reaplicado
   a los recuperados y `_meta.icociv` con la captura entera. Lanza si falta
   algo: aquí no hay «más o menos». */
function reajustar(catalogo, captura) {
  const c = captura || {};
  const f = factorDe(c.indice_base, c.indice_vigente);
  if (f === null) throw new Error("los dos índices deben ser números mayores que 0 (--indice-base y --indice-vigente)");
  if (f < FACTOR_MINIMO || f > FACTOR_MAXIMO) throw new Error(`el cociente ${f} está fuera de toda razón para un índice de costos: revise los dos índices tecleados`);
  const boletin = mesLegible(c.mes);
  if (!boletin) throw new Error("--mes debe ser AAAA-MM (el mes del boletín del DANE)");
  if (!/^https?:\/\//.test(String(c.url || ""))) throw new Error("--url debe ser la dirección del boletín del DANE: una cifra sin su origen no se puede discutir");

  const nuevo = JSON.parse(JSON.stringify(catalogo));
  const porId = new Map(nuevo.insumos.map((i) => [i.id, i]));
  const recuperados = nuevo.insumos.filter((i) => i.fuente === "recuperado");
  const cambios = [];
  /* 1) los simples, desde su precio de marzo de 2025 */
  for (const i of recuperados) {
    if (i.componentes) continue;
    const base = Number(i.precio_marzo_2025);
    if (!(base > 0)) throw new Error(`${i.id}: sin precio_marzo_2025 no hay desde dónde reajustar (no se reajusta sobre el ya reajustado)`);
    const antes = i.precio_base;
    i.precio_base = Math.round(base * f);
    cambios.push({ id: i.id, antes, despues: i.precio_base });
  }
  /* 2) las cuadrillas: la suma de sus jornales, que es la regla del catálogo.
     TODAS las que se componen de un insumo cambiado, sea cual sea su fuente:
     `mo_cuadrilla_1of_5ay` es «derivado» y lleva dentro los dos jornales
     recuperados; dejarla quieta rompía el cuadre (lo cazó `validarCatalogo` en
     la primera corrida en seco, el 6-sep-2026). Se recorre hasta que nada
     cambie, por si una cuadrilla se compusiera de otra. */
  const cambiados = new Set(cambios.map((ch) => ch.id));
  const derivados = [];
  let hubo = true;
  while (hubo) {
    hubo = false;
    for (const i of nuevo.insumos) {
      if (!i.componentes || cambiados.has(i.id)) continue;
      if (!Object.keys(i.componentes).some((ref) => cambiados.has(ref))) continue;
      const antes = i.precio_base;
      i.precio_base = Object.entries(i.componentes).reduce((a, [ref, n]) => {
        const comp = porId.get(ref);
        if (!comp) throw new Error(`${i.id}: componente inexistente ${ref}`);
        return a + Number(comp.precio_base) * Number(n);
      }, 0);
      cambios.push({ id: i.id, antes, despues: i.precio_base, motivo: i.fuente === "recuperado" ? "recuperado" : "compuesto de recuperados" });
      cambiados.add(i.id);
      if (i.fuente !== "recuperado") derivados.push(i.id);
      hubo = true;
    }
  }
  const itemsQueLosUsan = nuevo.items.filter((it) => (it.insumos || []).some((l) => cambiados.has(l.insumo_id))).length;

  const previo = nuevo._meta.icociv || {};
  nuevo._meta.icociv = {
    boletin,
    fuente: previo.fuente || "DANE · Índice de Costos de la Construcción de Infraestructura de Ingeniería Civil",
    /* la variación anual del boletín ya no describe el factor: el factor va
       de marzo de 2025 al mes capturado, y se dice con ese nombre */
    variacion_anual_general_pct: null,
    variacion_pct_desde_marzo_2025: Math.round((f - 1) * 10000) / 100,
    factor_aplicado: f,
    base_original_precios_recuperados: MES_BASE,
    indice_base: Number(c.indice_base),
    indice_base_mes: MES_BASE,
    indice_vigente: Number(c.indice_vigente),
    indice_vigente_mes: String(c.mes),
    url: String(c.url),
    capturado_el: c.capturado_el || hoyColombia(),
    alcance: previo.alcance || "SOLO los insumos fuente=\"recuperado\" llevan el factor, aplicado sobre su precio_marzo_2025 (que cada uno conserva). Ningún módulo de lib/ reajusta en tiempo de ejecución.",
    insumos_reajustados: recuperados.length,
    derivados_de_recuperados: derivados,
    items_con_insumo_reajustado: itemsQueLosUsan,
    resto_del_catalogo: previo.resto_del_catalogo || "los insumos fuente=\"adjudicado\" y fuente=\"estimado\" NO llevan reajuste.",
    como_actualizar: previo.como_actualizar || "node tests/capturar_icociv.js --mes AAAA-MM --indice-base N --indice-vigente N --url <boletín del DANE> --escribir",
  };
  nuevo._meta.version = versionSiguiente(nuevo._meta.version);
  return Object.defineProperty(nuevo, "_cambios", { value: cambios, enumerable: false });
}

function main() {
  const args = argumentos(process.argv.slice(2));
  const catalogo = JSON.parse(fs.readFileSync(RUTA_CATALOGO, "utf8"));
  let nuevo;
  try {
    nuevo = reajustar(catalogo, args);
  } catch (e) {
    console.error(`No se puede reajustar: ${e.message}`);
    console.error("Uso: node tests/capturar_icociv.js --mes AAAA-MM --indice-base N --indice-vigente N --url <boletín> [--escribir]");
    process.exit(1);
  }
  const ic = nuevo._meta.icociv;
  console.log(`ICOCIV ${ic.boletin}: índice ${ic.indice_base} (${ic.indice_base_mes}) → ${ic.indice_vigente} (${ic.indice_vigente_mes}) · factor ${ic.factor_aplicado} (${ic.variacion_pct_desde_marzo_2025} % desde marzo de 2025)`);
  console.log(`Insumos reajustados: ${ic.insumos_reajustados} · ítems que los usan: ${ic.items_con_insumo_reajustado} de ${nuevo.items.length}`);
  for (const ch of nuevo._cambios) console.log(`  ${ch.id.padEnd(28)} ${String(ch.antes).padStart(9)} → ${String(ch.despues).padStart(9)}${ch.motivo === "compuesto de recuperados" ? "  (cuadrilla derivada: suma de jornales reajustados)" : ""}`);

  /* la validación va ANTES de escribir: un catálogo que no cuadra no llega al disco */
  const v = validarCatalogo(nuevo);
  if (!v.ok) {
    console.error(`ABORTA: el catálogo reajustado tiene ${v.errores.length} error(es) de validación; no se escribió nada.`);
    for (const e of v.errores.slice(0, 10)) console.error(`  ${e.campo}: ${e.error} (${JSON.stringify(e.valor)})`);
    process.exit(1);
  }
  if (!args.escribir) {
    console.log("Nada escrito: repita el comando con --escribir para guardar el catálogo (versión "
      + `${nuevo._meta.version}); después, en el panel de administración, «Cargar catálogo APU».`);
    return;
  }
  fs.writeFileSync(RUTA_CATALOGO, JSON.stringify(nuevo, null, 1) + "\n");
  console.log(`Escrito ${path.relative(process.cwd(), RUTA_CATALOGO)} (versión ${nuevo._meta.version}). Corra node tests/e2e.js y, tras desplegar, «Cargar catálogo APU» en el panel.`);
}

module.exports = { argumentos, numeroLocal, factorDe, mesLegible, reajustar, versionSiguiente, MES_BASE, FACTOR_MINIMO, FACTOR_MAXIMO };

if (require.main === module) main();
