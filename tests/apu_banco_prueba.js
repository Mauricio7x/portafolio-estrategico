/* ============================================================================
   tests/apu_banco_prueba · ¿Qué tan bien arma Detekta el APU de un ítem que NO
   tiene en sus bancos? Medido sin Claude (10-nov-2026)
   ----------------------------------------------------------------------------
   HERRAMIENTA DE MEDICIÓN, NO UNA PRUEBA DE LA SUITE (como tests/apu_bench.js).
     node tests/apu_banco_prueba.js            → resumen en la consola
     node tests/apu_banco_prueba.js --escribir → además reescribe docs/APU_BANCO_PRUEBA.md

   EL MÉTODO («dejar uno fuera»). Por cada APU REAL con composición —los 526 del
   INVIAS, los 440 de EPC y los 157 del contrato Nogal adjudicado—:
     1. se ESCONDE ese ítem y sus gemelos (otro código, misma descripción y unidad);
     2. se le pasa su descripción y su unidad a la regla de mapeo de SIEMPRE
        (`lib/apu/importar.mapearFilasImportadas`, con `excluir`), que busca el
        vecino entre los demás bancos — es exactamente lo que le pasaría a un ítem
        nuevo que el usuario carga en Precios;
     3. se calcula con el MOTOR real («Calcular», lib/apu/calculo) el costo
        directo del vecino y el del ítem escondido, en el MISMO departamento;
     4. el error es |vecino − real| ÷ real.
   No se escribe ninguna cifra a mano: el informe sale de esta corrida.

   LO QUE MIDE Y LO QUE NO. Mide la capa «APU parecido» de hoy (sin IA): cuántos
   ítems encuentran vecino, con qué nivel (firme / revisar / ninguno) y cuánto se
   equivoca el precio del vecino. No mide la calidad de la composición línea por
   línea (eso pide casar insumos entre bancos distintos), ni ítems que no se
   parecen a nada del corpus (no hay contra qué compararlos). Los APU generados
   por Claude NO entran: el banco es solo de APU reales.
   ========================================================================== */
"use strict";

const fs = require("fs");
const path = require("path");

const DEPARTAMENTO = "CUNDINAMARCA";   // el único con los tres bancos (INVIAS, EPC y el Nogal llevado por región)

function corpusReal() {
  const S = require("../lib/apu/catalogo.js").SEMILLA;
  const I = require("../lib/apu/invias_items.js");
  const E = require("../lib/apu/epc_items.js");
  const casos = [];
  for (const it of S.items) if (it.fuente === "adjudicado") casos.push({ codigo: it.codigo, fuente: "nogal", descripcion: it.descripcion, unidad: it.unidad, capitulo: it.capitulo || null });
  for (const it of I.comoItemsDeCatalogo()) casos.push({ codigo: it.codigo, fuente: "invias", descripcion: it.descripcion, unidad: it.unidad, capitulo: it.capitulo || null });
  for (const it of E.comoItemsDeCatalogo()) casos.push({ codigo: it.codigo, fuente: "epc", descripcion: it.descripcion, unidad: it.unidad, capitulo: it.capitulo || null });
  return { S, casos };
}

/* el costo directo que da «Calcular» para un ítem del banco, con la unidad de la fila; null si el motor no lo costea */
function costoDirecto(calc, S, itemId, unidad) {
  try {
    const r = calc.calcularPresupuesto({ items: [{ item_id: itemId, cantidad: 1, unidad }], departamento: DEPARTAMENTO, config: {} }, S);
    const it = r && r.items && r.items[0];
    const v = it && !it.incompleto ? Number(it.costo_directo_unitario) : null;
    return Number.isFinite(v) && v > 0 ? v : null;
  } catch { return null; }
}

const mediana = (xs) => { if (!xs.length) return null; const a = [...xs].sort((x, y) => x - y); const m = Math.floor(a.length / 2); return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2; };
const percentil = (xs, p) => { if (!xs.length) return null; const a = [...xs].sort((x, y) => x - y); return a[Math.min(a.length - 1, Math.floor(p * (a.length - 1) + 0.5))]; };

function medir({ limite = null } = {}) {
  const { S, casos } = corpusReal();
  const { mapearFilasImportadas, unidadCanonica } = require("../lib/apu/importar.js");
  const calc = require("../lib/apu/calculo.js");
  const lista = limite ? casos.slice(0, limite) : casos;
  /* LOS GEMELOS SE ESCONDEN TAMBIÉN (revisión adversaria del 10-nov-2026): 59 ítems tienen otro código con la
     MISMA descripción y unidad (Nogal A2 y B5…), y escondiendo solo el medido el banco encontraba a su gemelo con
     error 0: medía «el ítem ya está», no «el ítem es nuevo». */
  const { norm } = require("../lib/semantica.js");
  const claveDe = (c) => `${norm(String(c.descripcion || "")).replace(/\s+/g, " ").trim()}|${unidadCanonica(c.unidad) || ""}`;
  const gemelos = new Map();
  for (const c of casos) { const k = claveDe(c); if (!gemelos.has(k)) gemelos.set(k, new Set()); gemelos.get(k).add(c.codigo); }
  const filas = [];
  for (const c of lista) {
    const real = costoDirecto(calc, S, c.codigo, c.unidad);
    const m = mapearFilasImportadas([{ descripcion: c.descripcion, unidad: c.unidad, capitulo: c.capitulo }], S, { departamento: DEPARTAMENTO, excluir: gemelos.get(claveDe(c)) }).filas[0];
    const vecino = m && m.item_id ? m.item_id : null;
    const misma = vecino ? unidadCanonica(m.unidad_catalogo) === unidadCanonica(c.unidad) : null;
    const precioVecino = vecino ? costoDirecto(calc, S, vecino, c.unidad) : null;
    const error = real != null && precioVecino != null ? Math.abs(precioVecino - real) / real : null;
    filas.push({ codigo: c.codigo, fuente: c.fuente, nivel: m ? m.nivel_mapeo : "personalizado", confianza: m ? m.confianza : 0, vecino, fuente_vecino: vecino ? String(vecino).split(":")[0].replace(/^NOG-.*/, "NOG") : null, misma_unidad: misma, real, precio_vecino: precioVecino, error });
  }
  return filas;
}

function resumir(filas) {
  const grupo = (sel) => {
    const g = filas.filter(sel);
    const conError = g.filter((f) => f.error != null).map((f) => f.error);
    return {
      casos: g.length,
      con_vecino: g.filter((f) => f.vecino).length,
      comparables: conError.length,
      mediana_error: mediana(conError),
      p90_error: percentil(conError, 0.9),
      dentro_10: conError.filter((e) => e <= 0.10).length,
      dentro_25: conError.filter((e) => e <= 0.25).length,
    };
  };
  const salida = { total: grupo(() => true), por_nivel: {}, por_fuente: {}, por_confianza: {} };
  for (const n of ["firme", "revisar", "personalizado"]) salida.por_nivel[n] = grupo((f) => f.nivel === n);
  for (const fu of ["nogal", "invias", "epc"]) salida.por_fuente[fu] = grupo((f) => f.fuente === fu);
  for (const [et, a, b] of [["0,80 o más", 0.8, 2], ["0,60 a 0,79", 0.6, 0.8], ["0,35 a 0,59", 0.35, 0.6], ["menos de 0,35", -1, 0.35]]) salida.por_confianza[et] = grupo((f) => f.vecino && f.confianza >= a && f.confianza < b);
  return salida;
}

const pct = (x, n) => (n ? `${Math.round((100 * x) / n)} %` : "—");
const pp = (x) => (x == null ? "—" : `${String(Math.round(x * 1000) / 10).replace(".", ",")} %`);
function tabla(titulo, mapa) {
  const lineas = [`| ${titulo} | Casos | Con vecino | Comparables | Error mediano | Error p90 | Dentro de ±10 % | Dentro de ±25 % |`, "|---|---:|---:|---:|---:|---:|---:|---:|"];
  for (const [k, g] of Object.entries(mapa)) lineas.push(`| ${k} | ${g.casos} | ${g.con_vecino} | ${g.comparables} | ${pp(g.mediana_error)} | ${pp(g.p90_error)} | ${pct(g.dentro_10, g.comparables)} | ${pct(g.dentro_25, g.comparables)} |`);
  return lineas.join("\n");
}

function informe(filas, r, fecha) {
  return [
    "# Banco de prueba · el APU parecido, medido sin Claude",
    "",
    "> Para: sesión · Estado: referencia (generado) · Sustituido por: —",
    "",
    `**Generado por** \`node tests/apu_banco_prueba.js --escribir\` el ${fecha}. Ninguna cifra de este documento se escribe a mano: si el código o los bancos cambian, se vuelve a generar.`,
    "",
    "**Qué mide.** Por cada uno de los APU reales con composición (contrato Nogal adjudicado, INVIAS, EPC) se esconde ese ítem, la regla de mapeo de la importación busca su vecino entre los demás bancos, y el motor de «Calcular» costea los dos en " + DEPARTAMENTO + ". El error es |vecino − real| ÷ real. Es lo que le pasaría hoy a un ítem que el usuario carga y que no está en los bancos.",
    "",
    "**Qué no mide.** La composición línea por línea, ni ítems que no se parecen a nada del corpus. Los APU generados por Claude no entran.",
    "",
    "## Total",
    "",
    tabla("Todo", { "Todos los casos": r.total }),
    "",
    "## Por nivel del mapeo",
    "",
    "«Firme» es lo que «Calcular» cobra solo; «revisar» espera la casilla del usuario; «personalizado» no tiene vecino.",
    "",
    tabla("Nivel", r.por_nivel),
    "",
    "## Por confianza del vecino",
    "",
    tabla("Confianza", r.por_confianza),
    "",
    "## Por banco del ítem escondido",
    "",
    tabla("Banco", r.por_fuente),
    "",
    "## Cómo leerlo",
    "",
    "- Un error mediano bajo con un p90 alto quiere decir que el vecino suele acertar pero a veces se equivoca mucho: por eso «revisar» no cobra solo.",
    "- Esta es la línea base de la capa «APU parecido». Una capa nueva (plantillas por familia, modelo abierto) se acepta solo si mejora estas cifras con el mismo banco.",
    "",
  ].join("\n");
}

if (require.main === module) {
  const t0 = Date.now();
  const filas = medir();
  const r = resumir(filas);
  console.log(tabla("Todo", { total: r.total }));
  console.log(tabla("Nivel", r.por_nivel));
  console.log(tabla("Confianza", r.por_confianza));
  console.log(tabla("Banco", r.por_fuente));
  console.log(`(${filas.length} casos en ${Math.round((Date.now() - t0) / 1000)} s)`);
  if (process.argv.includes("--escribir")) {
    const fecha = new Date(Date.now() - 5 * 3600e3).toISOString().slice(0, 10);
    fs.writeFileSync(path.join(__dirname, "..", "docs", "APU_BANCO_PRUEBA.md"), informe(filas, r, fecha));
    console.log("· escrito docs/APU_BANCO_PRUEBA.md");
  }
}

module.exports = { corpusReal, medir, resumir, informe, DEPARTAMENTO };
