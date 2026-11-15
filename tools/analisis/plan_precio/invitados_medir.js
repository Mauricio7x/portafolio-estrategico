"use strict";
/* ============================================================================
   Plan precio · ¿El número de INVITADOS anuncia cuántas ofertas llegan en menor cuantía? (14-nov-2026)
   ----------------------------------------------------------------------------
   En selección abreviada de menor cuantía solo puede ofertar quien manifestó interés (y, si hubo
   sorteo, quien salió sorteado). SECOP II publica en p6dx-8zbt el campo `proveedores_invitados`.
   Medido el 14-nov-2026: en los 14 procesos de obra que ese día estaban en «Presentación de oferta»
   (sin cerrar) el campo ya venía lleno y las respuestas en 0: se conoce ANTES de ofertar.
   Este script solo MIDE, fuera de la aplicación: cuántas ofertas llegaron según cuántos fueron
   invitados, y a cuánto se adjudicó. Aprende con lo recibido antes de 2026 y prueba con 2026.

   Datos (la carpeta no se versiona):
     curl -G 'https://www.datos.gov.co/resource/p6dx-8zbt.json' \
       --data-urlencode "$select=id_del_portafolio,nit_entidad,departamento_entidad,modalidad_de_contratacion,fase,precio_base,valor_total_adjudicacion,adjudicado,respuestas_al_procedimiento,proveedores_unicos_con,proveedores_invitados,proveedores_con_invitacion,visualizaciones_del,fecha_de_recepcion_de" \
       --data-urlencode "$where=tipo_de_contrato='Obra' and adjudicado='Si' and fecha_de_recepcion_de >= '2024-01-01T00:00:00'" \
       --data-urlencode "$order=id_del_portafolio" --data-urlencode "$limit=50000" -o <carpeta>/obra_0.json

     node tools/analisis/plan_precio/invitados_medir.js <carpeta> [AAAA-MM-DD] [--data]

   Con `--data` escribe además `data/invitados_menor_cuantia.json`, la tabla que lee la aplicación
   (lib/invitados.js) para decir el hecho en Precios: conteos por número de invitados, no porcentajes
   redondeados, con la fecha de la consulta y la verificación fuera de muestra. Esa tabla no se escribe a
   mano: se regenera con este comando.

   Población: solo filas ADJUDICADAS (la consulta de abajo). Una invitación cancelada no llega aquí; en la aplicación,
   que lee todas las filas del expediente, la regla las descarta por su estado (lib/invitados.invitadosDeFilas).

   Lo que NO mide: quiénes son los invitados (el dato abierto da el número, no los nombres) ni
   cuántos de ellos quedan hábiles. El campo tiene un techo en 10 cuando hubo sorteo, así que «10»
   mezcla «diez exactos» con «más de diez interesados, sorteados a diez» (scripts/base_obra/fila.js).
   ============================================================================ */
const fs = require("fs");
const path = require("path");
const RAIZ = path.join(__dirname, "..", "..", "..");
const { modalidadDe } = require(path.join(RAIZ, "lib", "filtros_lista.js"));
const CT = require(path.join(RAIZ, "lib", "competencia_por_tamano.js"));
// la regla del número de invitados es la de la aplicación, LLAMADA (lib/invitados.invitadosDeFilas): la tabla que se
// genera aquí y el número que Precios enseña salen de la misma lectura de las filas
const INV = require(path.join(RAIZ, "lib", "invitados.js"));

const CORTE = "2026-01-01";
const numero = (v) => { if (v == null || v === "") return null; const x = Number(v); return Number.isFinite(x) ? x : null; };
const mediana = (v) => { if (!v.length) return null; const a = v.slice().sort((x, y) => x - y), n = a.length; return n % 2 ? a[(n - 1) / 2] : (a[n / 2 - 1] + a[n / 2]) / 2; };
const cuantil = (v, q) => { if (!v.length) return null; const a = v.slice().sort((x, y) => x - y); const p = (a.length - 1) * q, i = Math.floor(p); return a[i] + (a[Math.min(i + 1, a.length - 1)] - a[i]) * (p - i); };
const r2 = (x) => (x == null ? null : Math.round(x * 100) / 100);
const pct = (a, b) => (b ? r2((a * 100) / b) : null);
const claseInv = (n) => (n === 1 ? "1" : n === 2 ? "2" : n === 3 ? "3" : n <= 5 ? "4-5" : n <= 9 ? "6-9" : n === 10 ? "10" : "11+");
const ORDEN = ["1", "2", "3", "4-5", "6-9", "10", "11+"];
// los límites de cada clase, para la tabla de la aplicación (hasta = null: sin tope)
const LIMITES = { "1": [1, 1], "2": [2, 2], "3": [3, 3], "4-5": [4, 5], "6-9": [6, 9], "10": [10, 10], "11+": [11, null] };

function procesos(dir) {
  const porId = new Map();
  let filas = 0;
  for (const f of fs.readdirSync(dir).filter((x) => /^obra_\d+\.json$/.test(x))) {
    for (const r of JSON.parse(fs.readFileSync(path.join(dir, f), "utf8"))) {
      filas++;
      if (String(r.adjudicado).toLowerCase() !== "si" || !r.id_del_portafolio) continue;
      // modalidadDe devuelve «abreviada» para la menor cuantía (comprobado con las filas reales el 14-nov-2026);
      // la variante «sin manifestación de interés» no tiene invitación: fuera.
      if (modalidadDe(r) !== "abreviada" || /sin manifestaci/i.test(String(r.modalidad_de_contratacion || "").normalize("NFD").replace(/[\u0300-\u036f]/g, ""))) continue;
      const p = porId.get(r.id_del_portafolio) || { id: r.id_del_portafolio, ent: r.nit_entidad || null, dep: String(r.departamento_entidad || "").toUpperCase(), f: "", inv: null, contradice: false, filas: [], n: null, pb: null, va: null };
      p.filas.push(r);
      const n = numero(r.respuestas_al_procedimiento), pb = numero(r.precio_base), va = numero(r.valor_total_adjudicacion);
      if (n != null && n >= 1 && (p.n == null || n > p.n)) p.n = n;
      if (pb != null && pb > 0) p.pb = pb;
      if (va != null && va > 0) p.va = va;
      if (r.fecha_de_recepcion_de && r.fecha_de_recepcion_de > p.f) p.f = r.fecha_de_recepcion_de;
      porId.set(p.id, p);
    }
  }
  for (const p of porId.values()) {
    const h = INV.invitadosDeFilas(p.filas);
    p.inv = h.estado === "publicado" ? h.invitados : null;
    p.contradice = h.estado === "contradictorio";
    delete p.filas;
  }
  return { filas, lista: [...porId.values()].filter((p) => p.f && p.n != null) };
}

function tabla(P) {
  const out = {};
  for (const k of ORDEN) {
    const g = P.filter((p) => claseInv(p.inv) === k);
    if (!g.length) continue;
    const adj = g.filter((p) => p.pb && p.va && (p.va * 100) / p.pb >= 70 && (p.va * 100) / p.pb <= 100.0001).map((p) => (p.va * 100) / p.pb);
    out[k] = {
      procesos: g.length,
      una_oferta_pct: pct(g.filter((p) => p.n === 1).length, g.length),
      una_o_dos_pct: pct(g.filter((p) => p.n <= 2).length, g.length),
      tres_o_mas_pct: pct(g.filter((p) => p.n >= 3).length, g.length),
      ofertas_mediana: mediana(g.map((p) => p.n)),
      ofertas_por_invitado_mediana: r2(mediana(g.map((p) => p.n / p.inv))),
      adjudicado_pct_del_presupuesto: { procesos: adj.length, p25: r2(cuantil(adj, 0.25)), mediana: r2(mediana(adj)), p75: r2(cuantil(adj, 0.75)) },
    };
  }
  return out;
}

function main() {
  const args = process.argv.slice(2).filter((a) => a !== "--data");
  const escribirData = process.argv.includes("--data");
  const dir = args[0];
  if (!dir) { console.error("uso: node tools/analisis/plan_precio/invitados_medir.js <carpeta> [AAAA-MM-DD] [--data]"); process.exit(1); }
  const fecha = args[1] || new Date().toISOString().slice(0, 10);
  const { filas, lista } = procesos(dir);
  const contradice = lista.filter((p) => p.contradice);
  const buenos = lista.filter((p) => p.inv != null);
  const conInv = [...buenos, ...contradice];
  const A = buenos.filter((p) => p.f < CORTE), T = buenos.filter((p) => p.f >= CORTE);

  // La regla más simple, aprendida con el pasado y probada en 2026: «con K invitados o menos llegan una o dos ofertas».
  const regla = [];
  for (const k of [1, 2, 3, 4, 5, 6, 7, 8, 9]) {
    const a = A.filter((p) => p.inv <= k), t = T.filter((p) => p.inv <= k);
    regla.push({
      invitados_hasta: k,
      aprendizaje: { procesos: a.length, una_o_dos_pct: pct(a.filter((p) => p.n <= 2).length, a.length), una_pct: pct(a.filter((p) => p.n === 1).length, a.length) },
      prueba_2026: { procesos: t.length, parte_de_la_prueba_pct: pct(t.length, T.length), una_o_dos_pct: pct(t.filter((p) => p.n <= 2).length, t.length), una_pct: pct(t.filter((p) => p.n === 1).length, t.length) },
    });
  }
  /* JUNTO AL ANUNCIO QUE DETEKTA YA HACE (lib/competencia_por_tamano.anunciarPoca, la regla REAL, llamada):
     el historial se aprende con lo anterior a 2026 y se actualiza con cada proceso de prueba DESPUÉS de
     anunciarlo, como tools/analisis/plan_x20/aproximacion.js. «Anunciado por historial» = la entidad tiene
     MIN_HISTORIAL procesos previos o más en la modalidad y el anuncio es UMBRAL_POCA o más. */
  const cuentas = { tot: [0, 0], tam: {}, dep: {}, ent: {}, entT: {} };
  const sumar = (o, k, x) => { const c = o[k] || (o[k] = [0, 0]); c[0]++; if (x.n <= 2) c[1]++; };
  const aprender = (x) => { cuentas.tot[0]++; if (x.n <= 2) cuentas.tot[1]++; sumar(cuentas.tam, x.t, x); sumar(cuentas.dep, `${x.dep}|${x.t}`, x); sumar(cuentas.ent, x.ent, x); sumar(cuentas.entT, `${x.ent}|${x.t}`, x); };
  const conTramo = buenos.map((p) => ({ ...p, t: p.pb != null ? CT.tramoTamano(p.pb) : null })).filter((p) => p.t != null && p.ent).sort((a, b) => (a.f < b.f ? -1 : a.f > b.f ? 1 : 0));
  const grupos = { historial: [], invitados_9: [], los_dos: [], solo_historial: [], solo_invitados_9: [], alguno: [], ninguno: [], todos: [] };
  for (const x of conTramo) {
    if (x.f >= CORTE) {
      const e = cuentas.ent[x.ent];
      const a = CT.anunciarPoca({ modalidad: cuentas.tot, tamano: cuentas.tam[x.t], depto: cuentas.dep[`${x.dep}|${x.t}`], entidad: e, entidadTam: cuentas.entT[`${x.ent}|${x.t}`] });
      const h = !!(a && e && e[0] >= CT.MIN_HISTORIAL && a.entidad >= CT.UMBRAL_POCA), i = x.inv <= 9;
      grupos.todos.push(x);
      if (h) grupos.historial.push(x);
      if (i) grupos.invitados_9.push(x);
      if (h && i) grupos.los_dos.push(x);
      if (h && !i) grupos.solo_historial.push(x);
      if (!h && i) grupos.solo_invitados_9.push(x);
      if (h || i) grupos.alguno.push(x); else grupos.ninguno.push(x);
    }
    aprender(x);
  }
  const juntos = {};
  for (const [k, g] of Object.entries(grupos)) juntos[k] = { procesos: g.length, parte_de_la_prueba_pct: pct(g.length, grupos.todos.length), una_o_dos_pct: pct(g.filter((p) => p.n <= 2).length, g.length), una_pct: pct(g.filter((p) => p.n === 1).length, g.length) };

  const salida = {
    que_es: "Menor cuantía de obra adjudicada (recepción desde 2024-01-01): ofertas recibidas y precio de adjudicación según el número de invitados que publica SECOP II antes del cierre.",
    consulta: fecha, fuente: "datos.gov.co · p6dx-8zbt", corte_aprendizaje_prueba: CORTE,
    poblacion: {
      filas_leidas: filas, procesos_de_menor_cuantia_adjudicados: lista.length,
      con_invitados_publicados: conInv.length, con_invitados_publicados_pct: pct(conInv.length, lista.length),
      contradictorios_mas_ofertas_que_invitados: contradice.length, usados: buenos.length, aprendizaje: A.length, prueba_2026: T.length,
    },
    por_invitados_todo: tabla(buenos),
    por_invitados_prueba_2026: tabla(T),
    regla_una_o_dos_ofertas: regla,
    junto_al_anuncio_por_historial_prueba_2026: { min_historial: CT.MIN_HISTORIAL, umbral_poca: CT.UMBRAL_POCA, grupos: juntos },
    supuestos: ["«invitados» = quienes pudieron ofertar tras la manifestación de interés y el sorteo [inferencia del flujo de la modalidad, como en scripts/base_obra/fila.js]", "el campo no cambia después del cierre [sin verificar: se midió el valor que hoy publica un proceso ya adjudicado]"],
  };
  const destino = path.join(__dirname, `resultados_invitados_${fecha}.json`);
  fs.writeFileSync(destino, JSON.stringify(salida, null, 1) + "\n");
  console.log(JSON.stringify(salida.poblacion));
  console.log("invitados → procesos · 1 oferta % · 1-2 % · 3+ % · ofertas (mediana) · adjudicado mediana (P25–P75)");
  for (const [k, v] of Object.entries(salida.por_invitados_todo)) console.log(k.padEnd(5), String(v.procesos).padStart(5), String(v.una_oferta_pct).padStart(7), String(v.una_o_dos_pct).padStart(7), String(v.tres_o_mas_pct).padStart(7), String(v.ofertas_mediana).padStart(4), "  ", v.adjudicado_pct_del_presupuesto.mediana, `(${v.adjudicado_pct_del_presupuesto.p25}–${v.adjudicado_pct_del_presupuesto.p75})`);
  console.log("regla «K invitados o menos → una o dos ofertas», aprendida <2026 y probada en 2026:");
  for (const x of regla) console.log(`  K=${x.invitados_hasta}: aprendizaje ${x.aprendizaje.una_o_dos_pct} % (${x.aprendizaje.procesos}) · prueba ${x.prueba_2026.una_o_dos_pct} % una o dos, ${x.prueba_2026.una_pct} % una (${x.prueba_2026.procesos} procesos, ${x.prueba_2026.parte_de_la_prueba_pct} % de la prueba)`);
  console.log("junto al anuncio por historial (prueba 2026): grupo · procesos · parte % · una o dos % · una %");
  for (const [k, v] of Object.entries(juntos)) console.log("  " + k.padEnd(17), String(v.procesos).padStart(5), String(v.parte_de_la_prueba_pct).padStart(7), String(v.una_o_dos_pct).padStart(7), String(v.una_pct).padStart(7));
  console.log("escrito:", destino);
  if (escribirData) {
    const cuenta = (g) => ({ procesos: g.length, con_una: g.filter((p) => p.n === 1).length, con_una_o_dos: g.filter((p) => p.n <= 2).length });
    const data = {
      formato: 1,
      que_es: "Menor cuantía de obra adjudicada: cuántas ofertas llegaron según el número de proveedores invitados a ofertar que publica SECOP II. Conteos, no porcentajes. La lee lib/invitados.js.",
      generado: fecha, fuente: "datos.gov.co · p6dx-8zbt", recepcion_desde: "2024-01-01",
      generador: "node tools/analisis/plan_precio/invitados_medir.js <carpeta> AAAA-MM-DD --data",
      total: cuenta(buenos),
      clases: ORDEN.map((k) => ({ clave: k, desde: LIMITES[k][0], hasta: LIMITES[k][1], ...cuenta(buenos.filter((p) => claseInv(p.inv) === k)) })),
      verificacion: {
        que_es: "La regla «K invitados o menos → una o dos ofertas», con lo recibido desde el corte (no entró en ninguna decisión: la tabla cuenta todo el periodo).",
        prueba_desde: CORTE, prueba_procesos: T.length,
        reglas: [2, 5, 9].map((k) => ({ invitados_hasta: k, ...cuenta(T.filter((p) => p.inv <= k)) })),
      },
      descartados: { mas_ofertas_que_invitados: contradice.length },
    };
    const dData = path.join(RAIZ, "data", "invitados_menor_cuantia.json");
    fs.writeFileSync(dData, JSON.stringify(data, null, 1) + "\n");
    console.log("escrito:", dData);
  }
}
main();
