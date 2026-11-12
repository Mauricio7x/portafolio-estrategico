"use strict";
/* ============================================================================
   Plan x20 · ¿la regla del anuncio resiste con la población que cuenta Detekta y en las otras
   modalidades? (11-nov-2026, pendiente de «La competencia por tamaño ordena…» en docs/MEMORIA.md)
   ----------------------------------------------------------------------------
   Solo MIDE, fuera de la aplicación. Lee las filas de obra de p6dx-8zbt (todas las modalidades,
   recepción desde 2024) que baja este comando:

     curl -G 'https://www.datos.gov.co/resource/p6dx-8zbt.json' \
       --data-urlencode "$select=id_del_portafolio,id_del_proceso,entidad,nit_entidad,departamento_entidad,modalidad_de_contratacion,precio_base,fecha_de_recepcion_de,fecha_de_publicacion_del,fase,estado_del_procedimiento,estado_de_apertura_del_proceso,adjudicado,respuestas_al_procedimiento,proveedores_unicos_con,conteo_de_respuestas_a_ofertas,nombre_del_proveedor,nit_del_proveedor_adjudicado,valor_total_adjudicacion" \
       --data-urlencode "$where=tipo_de_contrato='Obra' and fecha_de_recepcion_de >= '2024-01-01T00:00:00'" \
       --data-urlencode "$order=id_del_portafolio" --data-urlencode "$limit=50000" -o <carpeta>/obra_0.json

     node tools/analisis/plan_x20/poblacion.js <carpeta>

   Dos poblaciones, con las funciones REALES de la aplicación donde aplica (se llaman, no se copian):
     · «plan»: la de la medición del plan — adjudicado = «Si» y `respuestas_al_procedimiento`;
     · «aplicacion»: la del índice de competencia — `cuentaParaCompetencia` (adjudicados y ofertas
       cerradas) y `oferentesDe` (que lee `proveedores_unicos_con` antes que las respuestas).
   Modalidad con `modalidadDe` de lib/filtros_lista; tramo y anuncio con lib/competencia_por_tamano.
   Aprende con lo recibido antes de 2026 y prueba con 2026, aprendiendo de cada proceso de prueba
   después de anunciarlo (como `medir.js`). Lo que NO replica: el índice real filtra el histórico por
   el perfil y la capa anti-suministro, y aquí es todo lo de tipo «Obra».
   ============================================================================ */
const fs = require("fs");
const path = require("path");
const RAIZ = path.join(__dirname, "..", "..", "..");
const CT = require(path.join(RAIZ, "lib", "competencia_por_tamano.js"));
const IC = require(path.join(RAIZ, "lib", "indice_competencia.js"));
const { modalidadDe } = require(path.join(RAIZ, "lib", "filtros_lista.js"));

const CORTE = "2026-01-01";
const MIN_PREVIOS = 4;

function filasDe(dir) {
  const out = [];
  for (const f of fs.readdirSync(dir).filter((x) => /^obra_\d+\.json$/.test(x))) out.push(...JSON.parse(fs.readFileSync(path.join(dir, f), "utf8")));
  return out;
}

/* una fila por portafolio: la de más ofertas legibles según el lector de la población */
function poblacion(crudas, lector) {
  const porId = new Map();
  for (const r of crudas) {
    const id = r.id_del_portafolio;
    if (!id) continue;
    const x = lector(r);
    if (!x) continue;
    const ant = porId.get(id);
    if (!ant || x.n > ant.n) porId.set(id, x);
  }
  return [...porId.values()].sort((a, b) => (a.f < b.f ? -1 : a.f > b.f ? 1 : 0));
}

const LECTORES = {
  plan: (r) => {
    if (String(r.adjudicado).toLowerCase() !== "si") return null;
    const n = parseInt(r.respuestas_al_procedimiento, 10);
    const pb = Number(r.precio_base);
    if (!(n >= 1) || !(pb > 0)) return null;
    return { ent: r.nit_entidad, dep: String(r.departamento_entidad || "").toUpperCase(), mod: modalidadDe(r), t: CT.tramoTamano(pb), n, f: r.fecha_de_recepcion_de };
  },
  aplicacion: (r) => {
    if (!IC.cuentaParaCompetencia(r)) return null;
    const n = IC.oferentesDe(r);
    const pb = IC.presupuestoDeFila(r);
    if (n == null || pb == null) return null;
    return { ent: r.nit_entidad, dep: String(r.departamento_entidad || "").toUpperCase(), mod: modalidadDe(r), t: CT.tramoTamano(pb), n, f: r.fecha_de_recepcion_de };
  },
};

function medir(filas, modalidad) {
  const F = filas.filter((x) => x.mod === modalidad && x.t != null && x.f);
  const aprende = F.filter((x) => x.f < CORTE), prueba = F.filter((x) => x.f >= CORTE);
  const c = () => [0, 0];
  const sumar = (o, k, x) => { const a = o[k] || (o[k] = c()); a[0]++; if (x.n <= 2) a[1]++; };
  const tot = c(), tam = {}, dep = {}, ent = {}, entT = {};
  for (const x of aprende) { tot[0]++; if (x.n <= 2) tot[1]++; sumar(tam, x.t, x); sumar(dep, `${x.dep}|${x.t}`, x); sumar(ent, x.ent, x); sumar(entT, `${x.ent}|${x.t}`, x); }
  const P = [];
  for (const x of prueba) {
    const a = CT.anunciarPoca({ modalidad: tot, tamano: tam[x.t], depto: dep[`${x.dep}|${x.t}`], entidad: ent[x.ent], entidadTam: entT[`${x.ent}|${x.t}`] });
    P.push({ p: a ? a.entidad : null, nh: ent[x.ent] ? ent[x.ent][0] : 0, n: x.n });
    sumar(ent, x.ent, x); sumar(entT, `${x.ent}|${x.t}`, x);
  }
  const pct = (a, b) => (b ? Math.round((a * 1000) / b) / 10 : null);
  const conH = P.filter((x) => x.p != null && x.nh >= MIN_PREVIOS);
  const poca = conH.filter((x) => x.p >= CT.UMBRAL_POCA), mucha = conH.filter((x) => x.p <= CT.UMBRAL_MUCHA);
  return {
    aprende: aprende.length, prueba: prueba.length, prueba_una_o_dos_pct: pct(prueba.filter((x) => x.n <= 2).length, prueba.length),
    anunciados_poca: poca.length, acierto_una_o_dos_pct: pct(poca.filter((x) => x.n <= 2).length, poca.length), una_sola_pct: pct(poca.filter((x) => x.n === 1).length, poca.length),
    anunciados_mucha: mucha.length, mucha_con_3_o_mas_pct: pct(mucha.filter((x) => x.n >= 3).length, mucha.length),
  };
}

if (require.main === module) {
  const dir = process.argv[2];
  if (!dir) { console.error("uso: node tools/analisis/plan_x20/poblacion.js <carpeta con obra_*.json>"); process.exit(2); }
  const crudas = filasDe(dir);
  const R = { consulta: process.argv[3] || null, filas_leidas: crudas.length, corte_prueba: CORTE, umbral_poca: CT.UMBRAL_POCA, previos_minimos: MIN_PREVIOS, resultados: {} };
  for (const [nombre, lector] of Object.entries(LECTORES)) {
    const filas = poblacion(crudas, lector);
    R.resultados[nombre] = { procesos: filas.length };
    for (const m of ["abreviada", "licitacion", "minima", "especial", "directa"]) R.resultados[nombre][m] = medir(filas, m);
  }
  console.log(JSON.stringify(R, null, 1));
}

module.exports = { LECTORES, poblacion, medir };
