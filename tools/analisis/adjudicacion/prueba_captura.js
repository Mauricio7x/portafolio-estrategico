"use strict";
/* Probabilidad de adjudicación · NIVEL 3: la PRUEBA DE LA CAPTURA con los 30 procesos del piloto (26-oct-2026). Solo MIDE.
   Uso:  node tools/analisis/adjudicacion/prueba_captura.js <lectura.json> [salida.json]
   Lee tools/analisis/nivel3_piloto_lectura_2026-10-26.json (lo que se leyó en cada documento, con cita) y,
   con los hábiles reales, corre el motor de precio (`metodos.puntajes` y `metodos.primeros`, llamados, no
   copiados) para ver si pone primero al ganador real (diseño del Nivel 3, § 6.1). Tres clases de proceso:
   - con método conocido (lo dice el documento o sale de su TRM con `metodos.metodoPorTrm`): la prueba;
   - sin método: cuál de los 4 métodos cuadra con los puntajes publicados y a quién pone primero;
   - con un solo hábil: no prueba nada (cualquier método lo pone primero).
   Cuenta también qué trae cada documento (hábiles, puntajes, método o TRM), si la TRM del documento casa con
   su método y si los valores leídos casan al peso con wi7w. Sin red, sin azar. */
const fs = require("fs");
const M = require("../../../scripts/base_obra/metodos");

const CUADRA = 0.01;   // diferencia máxima de puntaje para decir que una fórmula reproduce lo publicado

/* Fórmula propia leída en el documento de la fila 30 (Registraduría): media aritmética de las hábiles con
   castigo doble por encima. Solo sirve para comprobar esa lectura; NO entra al motor. */
function mediaAritmeticaCastigoDoble(valores, max) {
  const x = valores.reduce((s, v) => s + v, 0) / valores.length;
  return valores.map((v) => max * (v <= x ? 1 - (x - v) / x : 1 - (2 * (v - x)) / x));
}

/* Diferencias entre los puntajes calculados y los publicados (lista vacía si el documento no publica ninguno). */
const difs = (calculados, habiles) => habiles.map((h, i) => (typeof h.puntaje_precio_documento === "number" ? Math.abs(calculados[i] - h.puntaje_precio_documento) : null)).filter((x) => x !== null);
const difMax = (calculados, habiles) => { const d = difs(calculados, habiles); return d.length ? Math.max(...d) : null; };
/* Cuántos puntajes publicados reproduce, de cuántos (un dígito mal leído en un escaneo descuadra uno solo). */
const cuadranOfertas = (calculados, habiles) => { const d = difs(calculados, habiles); return d.length ? `${d.filter((x) => x < CUADRA).length}/${d.length}` : null; };

/* Un proceso bajo un método: quién queda primero y si es el ganador real. */
function correr(habiles, metodo, max) {
  const v = habiles.map((h) => h.valor);
  const p = M.puntajes(v, metodo, max), pr = M.primeros(v, metodo, max);
  if (!p || !pr) return null;
  const orden = p.map((x, i) => [x, i]).sort((a, b) => b[0] - a[0]);
  const ig = habiles.findIndex((h) => h.ganador);
  return { primeros: pr.map((i) => habiles[i].nombre), reproduce: pr.length === 1 && habiles[pr[0]].ganador === true,
    puesto_del_ganador_por_precio: ig < 0 ? null : orden.findIndex(([, i]) => i === ig) + 1, dif_max_con_documento: difMax(p, habiles),
    cuadran_ofertas: cuadranOfertas(p, habiles), puntajes: p };
}

function probar(proc) {
  const pr = proc.prueba;
  if (!pr) return { clase: "sin_prueba" };
  if (pr.tipo === "un_habil") return { clase: "un_habil" };
  const max = pr.maximo || M.PUNTAJE_MAXIMO[proc.modalidad];
  if (pr.tipo === "metodo_conocido") {
    const r = { clase: "metodo_conocido", metodo: pr.metodo, metodo_fuente: pr.metodo_fuente, habiles: pr.habiles.length, ...correr(pr.habiles, pr.metodo, max) };
    delete r.puntajes;
    if (pr.variante) { const h = pr.habiles.filter((x) => !pr.variante.sin.includes(x.nombre)); const v = correr(h, pr.metodo, max); r.variante = { sin: pr.variante.sin, primeros: v.primeros, reproduce: v.reproduce }; }
    return r;
  }
  const por = {};
  for (const m of M.METODOS) { const c = correr(pr.habiles, m, max); por[m] = { primeros: c.primeros, reproduce: c.reproduce, dif_max_con_documento: c.dif_max_con_documento, cuadran_ofertas: c.cuadran_ofertas }; }
  const r = { clase: "sin_metodo", habiles: pr.habiles.length, por_metodo: por,
    cuadran: M.METODOS.filter((m) => por[m].dif_max_con_documento !== null && por[m].dif_max_con_documento < CUADRA) };
  if (pr.formula_documento && pr.formula_documento.nombre === "media_aritmetica_castigo_doble") {
    const p = mediaAritmeticaCastigoDoble(pr.habiles.map((h) => h.valor), pr.formula_documento.maximo);
    const mx = Math.max(...p);
    r.formula_documento = { dif_max_con_documento: difMax(p, pr.habiles), reproduce: p.filter((x) => x === mx).length === 1 && pr.habiles[p.indexOf(mx)].ganador === true };
  }
  return r;
}

/* ¿La TRM del documento lleva al método que el documento dice? */
function trm(proc) {
  const t = proc.metodo_trm;
  if (!t) return null;
  const valor = typeof t.trm_documento === "number" ? t.trm_documento : t.trm_oficial;
  const porTrm = typeof valor === "number" ? M.metodoPorTrm(valor) : null;
  const centavosOk = typeof t.centavos_documento === "number" && typeof t.trm_oficial === "number" ? Math.round(t.trm_oficial * 100) % 100 === t.centavos_documento : null;
  const enTabla = M.METODOS.includes(t.metodo_documento);
  return { trm: valor, en_serie_oficial: typeof t.trm_oficial === "number" && (t.trm_documento === null || t.trm_documento === t.trm_oficial), centavos_ok: centavosOk,
    metodo_por_trm: porTrm, metodo_documento: t.metodo_documento, coherente: porTrm && t.metodo_documento ? (enTabla ? porTrm === t.metodo_documento : false) : null };
}

/* LOS PUNTOS FUERA DEL PRECIO (fase 2 del Nivel 3, 26-oct-2026). Con el puntaje de precio y el total publicados para TODOS
   los hábiles de un proceso, lo de fuera del precio es total − precio. Se cuenta: en cuántos procesos no todos sacaron lo
   mismo, cuántas ofertas perdieron, si la de mejor precio perdió y si eso cambió al ganador, y —donde la tabla trae el
   desglose— en qué criterio. Un hábil sin alguno de los dos puntajes deja el proceso fuera de la cuenta. «Perdió» es
   quedar a más de 0,01 puntos del mejor: los totales se publican con dos decimales y el redondeo no es una pérdida. */
const PERDIO = 0.01;
function fueraDelPrecio(L) {
  const R = { procesos_con_dato: 0, con_diferencias: 0, ofertas: 0, ofertas_que_perdieron: 0, mejor_precio_perdio: 0, cambio_al_ganador: 0, criterios: {}, filas: [] };
  for (const p of L.procesos) {
    const h = p.prueba && Array.isArray(p.prueba.habiles) ? p.prueba.habiles : [];
    if (h.length < 2 || !h.every((x) => typeof x.puntaje_precio_documento === "number" && typeof x.puntaje_total_documento === "number")) continue;
    const fuera = h.map((x) => Math.round((x.puntaje_total_documento - x.puntaje_precio_documento) * 1e6) / 1e6);
    const max = Math.max(...fuera), mejorPrecio = Math.max(...h.map((x) => x.puntaje_precio_documento));
    const perdieron = h.filter((x, i) => fuera[i] < max - PERDIO);
    const iMejor = h.findIndex((x) => x.puntaje_precio_documento === mejorPrecio), ig = h.findIndex((x) => x.ganador);
    R.procesos_con_dato++; R.ofertas += h.length; R.ofertas_que_perdieron += perdieron.length;
    if (perdieron.length) R.con_diferencias++;
    const mejorPerdio = fuera[iMejor] < max - PERDIO;
    if (mejorPerdio) R.mejor_precio_perdio++;
    const cambio = ig >= 0 && h[ig].puntaje_precio_documento < mejorPrecio - 1e-9;
    if (cambio) R.cambio_al_ganador++;
    for (const x of perdieron) for (const [k, v] of Object.entries(x.otros_puntos || {})) {
      const mejor = Math.max(...h.map((y) => (y.otros_puntos && typeof y.otros_puntos[k] === "number" ? y.otros_puntos[k] : -Infinity)));
      if (typeof v === "number" && v < mejor - PERDIO) R.criterios[k] = (R.criterios[k] || 0) + 1;
    }
    R.filas.push({ fila: p.fila, habiles: h.length, perdieron: perdieron.length, mejor_precio_perdio: mejorPerdio, gano_sin_el_mejor_precio: cambio });
  }
  return R;
}

function medir(L) {
  const filas = L.procesos.map((p) => ({ fila: p.fila, entidad: p.entidad, clasificacion: p.clasificacion, prueba: probar(p), trm: trm(p),
    valores: p.valores_leidos ? { leidos: p.valores_leidos.length, al_peso: p.valores_leidos.filter((x) => Math.abs(x.valor_documento - x.valor_wi7w_mas_cercano) < 1).length } : null }));
  const cuenta = (f) => filas.filter(f).length;
  const conocidos = filas.filter((f) => f.prueba.clase === "metodo_conocido");
  const R = {
    documentos: filas.length,
    habiles: { explicitos: cuenta((f) => f.clasificacion.habiles === "explicitos"), deducidos: cuenta((f) => f.clasificacion.habiles === "deducidos"),
      parcial: cuenta((f) => f.clasificacion.habiles === "parcial"), sin_dato: cuenta((f) => f.clasificacion.habiles === "sin_dato") },
    puntaje_precio: { todos: cuenta((f) => f.clasificacion.puntaje_precio === "todos"), parcial: cuenta((f) => f.clasificacion.puntaje_precio === "parcial"),
      solo_total: cuenta((f) => f.clasificacion.puntaje_precio === "solo_total"), solo_ganador: cuenta((f) => f.clasificacion.puntaje_precio === "solo_ganador") },
    metodo_o_trm: cuenta((f) => f.trm !== null),
    trm: { con_valor: cuenta((f) => f.trm && typeof f.trm.trm === "number"), en_serie_oficial: cuenta((f) => f.trm && f.trm.en_serie_oficial),
      con_metodo_y_trm: cuenta((f) => f.trm && f.trm.coherente !== null), coherentes: cuenta((f) => f.trm && f.trm.coherente === true) },
    prueba: { con_metodo_conocido: conocidos.length, reproduce: conocidos.filter((f) => f.prueba.reproduce).length,
      no_reproduce: conocidos.filter((f) => !f.prueba.reproduce).map((f) => f.fila),
      sin_metodo: cuenta((f) => f.prueba.clase === "sin_metodo"), un_habil: cuenta((f) => f.prueba.clase === "un_habil"), sin_prueba: cuenta((f) => f.prueba.clase === "sin_prueba") },
    fuera_del_precio: fueraDelPrecio(L),
    valores_leidos: { leidos: filas.reduce((s, f) => s + (f.valores ? f.valores.leidos : 0), 0), al_peso: filas.reduce((s, f) => s + (f.valores ? f.valores.al_peso : 0), 0) },
    filas,
  };
  return R;
}

function main() {
  const [entrada, salida] = process.argv.slice(2);
  if (!entrada) { process.stderr.write("uso: node tools/analisis/adjudicacion/prueba_captura.js <lectura.json> [salida.json]\n"); process.exit(2); }
  const R = medir(JSON.parse(fs.readFileSync(entrada, "utf8")));
  const f4 = (x) => (x === null || x === undefined ? "—" : x.toFixed(4));
  console.log(`Documentos: ${R.documentos}`);
  console.log(`Quién quedó hábil: ${R.habiles.explicitos} explícito, ${R.habiles.deducidos} deducido, ${R.habiles.parcial} parcial, ${R.habiles.sin_dato} sin dato`);
  console.log(`Puntaje del precio: ${R.puntaje_precio.todos} de todos los hábiles, ${R.puntaje_precio.parcial} parcial, ${R.puntaje_precio.solo_total} solo el total, ${R.puntaje_precio.solo_ganador} solo el del ganador`);
  console.log(`Método o TRM: ${R.metodo_o_trm} · TRM con valor ${R.trm.con_valor}, en la serie oficial ${R.trm.en_serie_oficial} · método y TRM coherentes ${R.trm.coherentes} de ${R.trm.con_metodo_y_trm}`);
  console.log(`Valores leídos que casan al peso con wi7w: ${R.valores_leidos.al_peso} de ${R.valores_leidos.leidos}`);
  const F = R.fuera_del_precio;
  console.log(`FUERA DEL PRECIO: ${F.procesos_con_dato} procesos con precio y total de todos los hábiles · en ${F.con_diferencias} no todos sacaron lo mismo · ${F.ofertas_que_perdieron} de ${F.ofertas} ofertas perdieron puntos · la de mejor precio perdió en ${F.mejor_precio_perdio} · ganó una sin el mejor precio en ${F.cambio_al_ganador} · criterios: ${Object.entries(F.criterios).map(([k, n]) => `${k} ${n}`).join(", ") || "—"}`);
  console.log(`  por proceso: ${F.filas.map((x) => `${x.fila} (${x.perdieron}/${x.habiles}${x.gano_sin_el_mejor_precio ? ", ganó sin el mejor precio" : ""})`).join(" · ")}`);
  console.log(`PRUEBA (método conocido): reproduce ${R.prueba.reproduce} de ${R.prueba.con_metodo_conocido} · no: filas ${R.prueba.no_reproduce.join(", ")} · sin método ${R.prueba.sin_metodo} · un solo hábil ${R.prueba.un_habil} · sin prueba ${R.prueba.sin_prueba}`);
  for (const f of R.filas) {
    const p = f.prueba;
    if (p.clase === "metodo_conocido") console.log(`  fila ${f.fila}: ${p.metodo} (${p.metodo_fuente}), ${p.habiles} hábiles → ${p.primeros.join(" + ")} · ${p.reproduce ? "REPRODUCE" : "no"} · ganador ${p.puesto_del_ganador_por_precio}º por precio · dif. con el documento ${f4(p.dif_max_con_documento)}${p.cuadran_ofertas ? ` (cuadran ${p.cuadran_ofertas})` : ""}${p.variante ? ` · sin ${p.variante.sin.join(", ")}: ${p.variante.primeros.join(" + ")} ${p.variante.reproduce ? "REPRODUCE" : "no"}` : ""}`);
    if (p.clase === "sin_metodo") console.log(`  fila ${f.fila}: sin método · ${M.METODOS.map((m) => `${m} ${p.por_metodo[m].reproduce ? "sí" : "no"} (dif ${f4(p.por_metodo[m].dif_max_con_documento)}${p.por_metodo[m].cuadran_ofertas ? `, cuadran ${p.por_metodo[m].cuadran_ofertas}` : ""})`).join(" · ")} · cuadran: ${p.cuadran.join(", ") || "ninguno"}${p.formula_documento ? ` · fórmula del documento: dif ${p.formula_documento.dif_max_con_documento.toExponential(1)}, ${p.formula_documento.reproduce ? "reproduce" : "no"}` : ""}`);
    if (f.trm && f.trm.coherente === false) console.log(`  fila ${f.fila}: TRM ${f.trm.trm} lleva a ${f.trm.metodo_por_trm} y el documento dice ${f.trm.metodo_documento}`);
  }
  if (salida) fs.writeFileSync(salida, JSON.stringify(R, null, 1) + "\n");
}

if (require.main === module) main();
module.exports = { medir, probar, trm, correr, fueraDelPrecio, mediaAritmeticaCastigoDoble };
