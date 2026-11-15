"use strict";
/* ============================================================================
   Plan precio · los cuatro métodos · una fila limpia por proceso (14-nov-2026)
   ----------------------------------------------------------------------------
   Solo MIDE, fuera de la aplicación. Lee lo que bajó `cuatro_metodos_descargar.sh` de datos.gov.co
   (p6dx-8zbt, procesos de SECOP II; wi7w-2nvm, b28v-edj8 y bpan-xvj3, ofertas por proceso de
   2025-2026, 2023-2024 y hasta 2022) y escribe en la MISMA carpeta
   de datos (que no se versiona):
     · base_precio.jsonl    una fila por proceso de licitación, menor cuantía o régimen especial,
                            con sus ofertas válidas en % del presupuesto y la del adjudicatario;
     · resumen_base.json    el embudo: cuántos procesos quedan en cada paso y por qué se apartan.

     bash tools/analisis/plan_precio/cuatro_metodos_descargar.sh <carpeta>
     node tools/analisis/plan_precio/cuatro_metodos_base.js <carpeta>
     node tools/analisis/plan_precio/cuatro_metodos_medir.js <carpeta> [AAAA-MM-DD]

   (modo interno: `node cuatro_metodos_base.js tandas <carpeta>` escribe tandas.txt para la descarga.)

   NO reescribe ninguna regla: LLAMA las que ya existen.
     · la fila por proceso, la limpieza de ofertas y el emparejamiento del ganador son
       `filaDeProceso` (scripts/base_obra/fila.js) y `limpiarOfertas` / `proveedoresUnidos`
       (scripts/base_obra/limpieza.js): el mismo proponente con y sin código se une por NIT o
       nombre, la fila «Confidencial» y el valor cero no cuentan, lo que pasa del presupuesto o
       baja del 50 % se marca, y los lotes se apartan;
     · la población «3 o más válidas» y «usable por el motor» son `conTresValidas` y `usableMotor`
       de tools/analisis/adjudicacion/fase0.js;
     · la modalidad es `modalidadDe` (lib/filtros_lista.js) y el tramo de presupuesto, `tramoTamano`
       (lib/competencia_por_tamano.js).
   LO QUE ESTE ARCHIVO AÑADE Y DECLARA:
     · [supuesto] régimen especial no está en `clasificarModalidad` (queda «otra»): para aplicarle
       la MISMA limpieza se llama `filaDeProceso` con el literal de la modalidad sustituido por el
       de menor cuantía; solo se apaga la exclusión «modalidad no competitiva». Va como referencia.
     · «limpio» (como tools/analisis/plan_x20/medir.js): el `precio_base` de SECOP II puede no ser
       el del pliego definitivo, así que el proceso entra a las cuentas de precio solo si NINGUNA
       oferta se marcó sobre el presupuesto o bajo el 50 % y todas las válidas están entre 70 % y
       100,0001 % del presupuesto.
     · sin jbjy (contratos): `valoresContrato` va null, así que no hay rescate bajo el 50 %
       (medido el 17-oct-2026: 12 rescates, todos de mínima cuantía, que aquí no entra).
     · la descarga trae solo las filas ADJUDICADAS de p6dx: `lotePorPrecioBase` no ve las filas de
       otras fases sin adjudicar. Los lotes se apartan además por `numero_de_lotes` y por ofertas.
     · identidades de cada oferente para seguirlo ENTRE procesos: NIT válido («n:»), códigos de
       proveedor de SECOP («c:») y nombre comparable («o:»), tomados de las filas crudas que
       `proveedoresUnidos` junta en ese oferente. El código se guarda pero NO identifica (medido
       el 14-nov-2026 en wi7w-2nvm: cada código con NIT válido lleva a un solo NIT, así que no
       añade nada; y un código con NIT de relleno —«000000000», «N/A»— sale bajo 5 o más
       consorcios distintos en 6.574 de 17.420 códigos: es un cruce por NIT, no una identidad).
   ============================================================================ */
const fs = require("fs");
const path = require("path");
const RAIZ = path.join(__dirname, "..", "..", "..");
const L = require(path.join(RAIZ, "scripts", "base_obra", "limpieza.js"));
const F = require(path.join(RAIZ, "scripts", "base_obra", "fila.js"));
const { conTresValidas, usableMotor } = require(path.join(RAIZ, "tools", "analisis", "adjudicacion", "fase0.js"));
const { modalidadDe } = require(path.join(RAIZ, "lib", "filtros_lista.js"));
const CT = require(path.join(RAIZ, "lib", "competencia_por_tamano.js"));

const MODALIDADES = ["licitacion", "abreviada", "especial"];   // claves de modalidadDe
const LITERAL_MENOR = "Selección Abreviada de Menor Cuantía";
const CONJUNTOS_OFERTAS = ["wi7w-2nvm", "b28v-edj8", "bpan-xvj3"];   // 2025-2026, 2023-2024 y hasta 2022 (ver cuatro_metodos_descargar.sh)
const TANDA = 40, TOPE_GRUPOS = 50000;
const RANGO_MIN = 70, RANGO_MAX = 100.0001;                    // % del presupuesto, como medir.js
const log = (m) => process.stderr.write(m + "\n");
const inc = (o, k, n = 1) => { o[k] = (o[k] || 0) + n; };

function procesosDe(dir) {
  const d = path.join(dir, "procesos"), porId = new Map();
  let filas = 0, sinPortafolio = 0;
  for (const f of fs.readdirSync(d).filter((x) => /^obra_\d+\.json$/.test(x))) {
    for (const r of JSON.parse(fs.readFileSync(path.join(d, f), "utf8"))) {
      filas++;
      if (!r.id_del_portafolio) { sinPortafolio++; continue; }
      if (!porId.has(r.id_del_portafolio)) porId.set(r.id_del_portafolio, []);
      porId.get(r.id_del_portafolio).push(r);
    }
  }
  return { porId, filas, sinPortafolio };
}

/* Los procesos cuyas ofertas se bajan: de las tres modalidades y con algún presupuesto legible. */
function elegibles(porId) {
  const out = [];
  for (const [id, fs_] of porId) {
    const f = L.elegirFila(fs_);
    if (!MODALIDADES.includes(modalidadDe(f))) continue;
    if (!fs_.some((r) => (L.numeroONull(r.precio_base) || 0) > 0)) continue;
    out.push(id);
  }
  return out.sort();
}

function escribirTandas(dir) {
  const { porId, filas } = procesosDe(dir);
  const ids = elegibles(porId);
  const lineas = [];
  for (let i = 0; i < ids.length; i += TANDA) lineas.push((lineas.length + 1) + "\t" + ids.slice(i, i + TANDA).map((x) => "'" + String(x).replace(/'/g, "''") + "'").join(","));
  fs.writeFileSync(path.join(dir, "tandas.txt"), lineas.join("\n") + "\n");
  console.log(`   ${filas} filas de p6dx · ${porId.size} procesos · ${ids.length} con ofertas por bajar en ${lineas.length} tandas de ${TANDA}`);
}

/* Las ofertas bajadas de los tres conjuntos, por proceso; y los procesos que NO se pudieron medir
   (una tanda que falta en cualquiera de los tres, o un proceso solo que llegó al tope de grupos):
   «sin medir», jamás «sin ofertas». `_ds` marca el conjunto: `limpiarOfertas` cuenta aparte la
   misma oferta repetida entre conjuntos. */
function ofertasDe(dir) {
  const porProceso = new Map(), sinMedir = new Set(), porConjunto = {};
  const pedidos = new Map();   // número de tanda → ids
  for (const l of fs.readFileSync(path.join(dir, "tandas.txt"), "utf8").split("\n")) {
    const [num, ids] = l.split("\t");
    if (num && ids) pedidos.set(num, ids.split(",").map((x) => x.replace(/^'|'$/g, "").replace(/''/g, "'")));
  }
  for (const ds of CONJUNTOS_OFERTAS) {
    const d = path.join(dir, "ofertas_" + ds), C = porConjunto[ds] = { grupos: 0, procesos: 0, tandas_sin_leer: 0 };
    const suyos_ = new Set();
    const leerUna = (archivo) => {
      const p = path.join(d, archivo);
      if (!fs.existsSync(p)) return null;
      try { const filas = JSON.parse(fs.readFileSync(p, "utf8")); return Array.isArray(filas) ? filas : null; } catch (e) { return null; }
    };
    for (const [num, ids] of pedidos) {
      const partida = ids.some((_, k) => fs.existsSync(path.join(d, `t${num}_${k + 1}.json`)));
      const trozos = partida ? ids.map((id, k) => [`t${num}_${k + 1}.json`, [id]]) : [[`t${num}.json`, ids]];
      for (const [archivo, suyos] of trozos) {
        const filas = leerUna(archivo);
        if (!filas || filas.length >= TOPE_GRUPOS) { C.tandas_sin_leer++; for (const id of suyos) sinMedir.add(id); continue; }   // falta, o pudo cortarse
        for (const o of filas) {
          const k = o.id_del_proceso_de_compra;
          if (!porProceso.has(k)) porProceso.set(k, []);
          porProceso.get(k).push({ ...o, _ds: ds }); C.grupos++; suyos_.add(k);
        }
      }
    }
    C.procesos = suyos_.size;
  }
  return { porProceso, sinMedir, porConjunto, pedidos: [...pedidos.values()].reduce((a, v) => a + v.length, 0) };
}

/* Identidades de cada oferente canónico (la clave de `proveedoresUnidos`) dentro de UN proceso. */
function identidadesPorOferente(ofertas) {
  const prov = L.proveedoresUnidos(ofertas);
  const amb = L.nitsAmbiguosDe(ofertas);
  const out = new Map();
  for (const o of ofertas) {
    if (/confidencial/i.test(String(o.nombre_proveedor || ""))) continue;
    const p = prov(o);
    if (!p) continue;
    if (!out.has(p)) out.set(p, new Set());
    const s = out.get(p);
    const nit = L.nitValido(o.nit_del_proveedor);
    if (nit && !amb.has(nit)) s.add("n:" + nit);
    const cod = String(o.c_digo_proveedor || "").trim();
    if (/^\d{4,}$/.test(cod) && !/^0+$/.test(cod)) s.add("c:" + cod);
    const nom = L.nombreComparable(o.nombre_proveedor);
    if (nom && !/^(no definido|sin descripcion|confidencial)$/.test(nom)) s.add("o:" + nom);
  }
  return out;
}

function construir(dir) {
  const { porId, filas, sinPortafolio } = procesosDe(dir);
  const { porProceso, sinMedir, porConjunto, pedidos } = ofertasDe(dir);
  const R = { generado: new Date().toISOString(), filas_p6dx: filas, filas_sin_portafolio: sinPortafolio, procesos_p6dx: porId.size,
    ofertas: { procesos_pedidos: pedidos, procesos_con_grupos: porProceso.size, por_conjunto: porConjunto, procesos_sin_medir: sinMedir.size },
    por_modalidad_todas: {}, embudo: {}, por_ano: {} };
  const salida = fs.createWriteStream(path.join(dir, "base_precio.jsonl"));
  let escritas = 0;
  for (const [id, fs_] of porId) {
    const f = L.elegirFila(fs_);
    const mod = modalidadDe(f);
    inc(R.por_modalidad_todas, mod);
    if (!MODALIDADES.includes(mod)) continue;
    const E = R.embudo[mod] || (R.embudo[mod] = { procesos: 0, excluidos: {}, con_ofertas_validas: 0, con_3_validas: 0, apartados_por_rango: 0, limpios_3_validas: 0, usable_motor: 0, usable_motor_limpio: 0, todas_al_mismo_valor: 0, ofertas_validas: 0, ofertas_con_nit: 0, ofertas_con_codigo_sin_nit: 0, ofertas_solo_nombre: 0 });
    E.procesos++;
    const ofertas = porProceso.get(id) || [];
    const filasRegla = mod === "especial" ? fs_.map((r) => ({ ...r, modalidad_de_contratacion: LITERAL_MENOR })) : fs_;
    const x = F.filaDeProceso({ portafolio: id, filas: filasRegla, ofertas, lugar: null, sinMedirOfertas: sinMedir.has(id), valoresContrato: null });
    if (x.excluido) inc(E.excluidos, x.excluido);
    const idsDe = ofertas.length ? identidadesPorOferente(ofertas) : new Map();
    const pb = x.precio_base;
    const validas = x.ofertas_validas.map((o) => ({ k: o.proveedor, ids: [...(idsDe.get(o.proveedor) || [])].sort(), nombre: o.nombre, pct: o.pct * 100 }));
    const ex = x.excluidas || {};
    const fueraDeRango = (ex.sobre_base || 0) + (ex.bajo_50 || 0) > 0 || validas.some((o) => o.pct < RANGO_MIN || o.pct > RANGO_MAX);
    const tres = conTresValidas(x);
    const limpio = !x.excluido && validas.length >= 1 && !fueraDeRango;
    const usable = usableMotor(x);
    const g = x.oferta_ganadora ? validas.findIndex((o) => o.k === x.oferta_ganadora.proveedor) : -1;
    if (!x.excluido && validas.length) {
      E.con_ofertas_validas++;
      for (const o of validas) { E.ofertas_validas++; if (o.ids.some((i) => i[0] === "n")) E.ofertas_con_nit++; else if (o.ids.some((i) => i[0] === "c")) E.ofertas_con_codigo_sin_nit++; else E.ofertas_solo_nombre++; }
    }
    if (tres) { E.con_3_validas++; if (fueraDeRango) E.apartados_por_rango++; else E.limpios_3_validas++; }
    /* el mismo embudo por año de RECEPCIÓN: dice de qué años hay ofertas en los datos abiertos */
    const ano = /^(\d{4})-/.test(String(x.fecha_cierre || "")) ? String(x.fecha_cierre).slice(0, 4) : "sin_fecha";
    const A = (R.por_ano[mod] || (R.por_ano[mod] = {}))[ano] || (R.por_ano[mod][ano] = { procesos: 0, sin_ofertas_en_datos_abiertos: 0, con_ofertas_validas: 0, limpios_3_validas: 0, usable_motor_limpio: 0, ofertas_validas_en_limpios: 0 });
    A.procesos++;
    if (x.excluido === "sin_ofertas_en_datos_abiertos") A.sin_ofertas_en_datos_abiertos++;
    if (!x.excluido && validas.length) A.con_ofertas_validas++;
    if (tres && !fueraDeRango) A.limpios_3_validas++;
    if (usable && limpio) A.usable_motor_limpio++;
    if (limpio) A.ofertas_validas_en_limpios += validas.length;
    if (usable) { E.usable_motor++; if (limpio) E.usable_motor_limpio++; }
    if (tres && validas.length && Math.max(...validas.map((o) => o.pct)) - Math.min(...validas.map((o) => o.pct)) < 1e-7) E.todas_al_mismo_valor++;
    /* lo adjudicado en % del presupuesto, con el rango de aproximacion.js (70 a 100,0001); fuera o sin dato, null */
    const pctAdj = x.valor_adjudicado != null && pb > 0 ? (x.valor_adjudicado * 100) / pb : null;
    salida.write(JSON.stringify({
      id, mod, ent: x.nit_entidad, entidad: x.entidad, dep: x.departamento_entidad, pb, t: CT.tramoTamano(pb),
      f: x.fecha_cierre, fa: x.fecha_adjudicacion, n_resp: x.respuestas_publicadas, lotes: L.numeroONull(f.numero_de_lotes),
      excluido: x.excluido, inconsistencia: x.inconsistencia, sobre_base: ex.sobre_base || 0, bajo_50: ex.bajo_50 || 0, oferta_doble: ex.oferta_doble || 0,
      pct_adj: pctAdj != null && pctAdj >= RANGO_MIN && pctAdj <= RANGO_MAX ? pctAdj : null,
      tres, limpio, usable, g, ganador_id: x.ganador_id, ofertas: validas,
    }) + "\n");
    escritas++;
  }
  salida.end();
  R.filas_escritas = escritas;
  R.definiciones = {
    con_3_validas: "conTresValidas de fase0.js: proceso sin exclusión y 3 o más ofertas válidas de proponentes distintos (limpiarOfertas).",
    limpio: `Sin ninguna oferta marcada sobre el presupuesto o bajo el 50 % y todas las válidas entre ${RANGO_MIN} % y ${RANGO_MAX} % del presupuesto (como medir.js).`,
    usable_motor: "usableMotor de fase0.js: 3 o más válidas, la oferta del adjudicatario emparejada (exactamente una), sin inconsistencia y no todas al mismo valor.",
  };
  fs.writeFileSync(path.join(dir, "resumen_base.json"), JSON.stringify(R, null, 1) + "\n");
  console.log(JSON.stringify(R, null, 1));
}

if (require.main === module) {
  const [a, b] = process.argv.slice(2);
  if (a === "tandas" && b) escribirTandas(b);
  else if (a && a !== "tandas") construir(a);
  else { console.error("uso: node tools/analisis/plan_precio/cuatro_metodos_base.js <carpeta_de_datos>"); process.exit(2); }
}
module.exports = { procesosDe, ofertasDe, identidadesPorOferente, MODALIDADES, CONJUNTOS_OFERTAS, RANGO_MIN, RANGO_MAX };
