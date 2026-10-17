"use strict";
/* Base nacional de obra · FASE 1: una fila por proceso y sus señales (17-oct-2026). PURO.
   Las señales son para REVISAR, nunca acusan: se presentan partidas en «competencia real»
   (3+ ofertas válidas) y «baja competencia» (1–2). Umbrales MEDIDOS o DECLARADOS aquí, con su
   porqué; ninguno de memoria. */
const L = require("./limpieza");

/* Ganador repetido: el mismo adjudicatario gana ≥ N veces en la MISMA entidad (código de
   entidad, no NIT: los NIT se comparten entre regionales) dentro del corte. N declarado = 3. */
const N_GANADOR_REPETIDO = 3;
/* Plazo corto: por debajo del percentil 10 del plazo publicación → cierre de su modalidad,
   medido sobre los USABLES del corte (la misma población a la que se aplica; no un mínimo legal).
   UNA definición, la misma para cada proceso y para el umbral (revisión adversaria, 17-oct-2026):
   - licitación y menor cuantía: desde la publicación de la fila «Presentación de observaciones»
     (el prepliego) hasta el cierre; sin esa fila en p6dx el plazo es null (antes se medía desde la
     fase de ofertas y salía corto por construcción). Medir desde la fase de ofertas daba un P10 de
     1 día en menor cuantía: no distingue nada.
   - mínima cuantía: una sola fase; desde su publicación hasta el cierre.
   `plazo_oferta_dias` (publicación de la fase de ofertas → cierre) se guarda aparte, informativo.
   Con días enteros el percentil empata: la proporción REAL marcada se publica en el resumen. */
const PERCENTIL_PLAZO_CORTO = 0.10;
/* Mucho interés y pocas ofertas: solo menor cuantía, donde `proveedores_invitados` cuenta a
   quienes manifestaron interés [inferencia del flujo de la modalidad]; `proveedores_que_manifestaron`
   viene en 0 en el 100 % de los adjudicados (medido el 17-oct-2026) y no sirve. Umbral declarado:
   10 o más interesados y 2 o menos ofertas válidas. El campo tiene un TECHO en 10 (2.145 procesos
   lo marcan exacto) [inferencia: tope de invitados], así que «10» se lee «10 o más»; si los
   interesados son menos que las respuestas publicadas, el campo se contradice y la señal es null. */
const INTERES_MIN = 10, OFERTAS_MAX_CON_INTERES = 2;
const ADJ_CASI_TOTAL = 0.99;

/* Días entre dos fechas de SECOP (hora flotante): solo la parte de la fecha, en UTC, redondeado
   (con Date.parse local un cambio de horario daba 13,96 días). */
const diaUTC = (s) => { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(s || "")); return m ? Date.UTC(+m[1], +m[2] - 1, +m[3]) : null; };
const dias = (a, b) => { const x = diaUTC(a), y = diaUTC(b); return x === null || y === null ? null : Math.round((y - x) / 864e5); };

function identidadGanador(f) {
  const nit = L.nitValido(f.nit_del_proveedor_adjudicado);
  if (nit) return "n:" + nit;
  const nom = L.nombreComparable(f.nombre_del_proveedor);
  return nom && !/^(no definido|sin descripcion)$/.test(nom) ? "o:" + nom : null;
}

/* filas: todas las de p6dx del portafolio · ofertas: grupos de wi7w/b28v · lugar: fila de jbjy o null */
function filaDeProceso({ portafolio, filas, ofertas, lugar, sinMedirOfertas = false }) {
  const f = L.elegirFila(filas);
  const mod = L.clasificarModalidad(f.modalidad_de_contratacion);
  const base = L.numeroONull(f.precio_base);
  const valorAdj = L.numeroONull(f.valor_total_adjudicacion);
  const nLotes = L.numeroONull(f.numero_de_lotes);
  const obs = filas.filter((x) => /observaciones/i.test(x.fase || "")).map((x) => x.fecha_de_publicacion_del).filter(Boolean).sort();
  const pub = mod === "minima" ? f.fecha_de_publicacion_del || null : obs[0] || null;   // ver PERCENTIL_PLAZO_CORTO
  const lu = lugar ? lugarDeDireccion(lugar.direcci_n_de_ejecuci_n_del_contrato) : null;
  const fila = {
    portafolio, id_proceso: f.id_del_proceso || null, codigo_entidad: f.codigo_entidad || null, entidad: f.entidad || null,
    nit_entidad: f.nit_entidad || null, departamento_entidad: f.departamento_entidad || null,
    ciudad_entidad: /^no definido$/i.test(f.ciudad_entidad || "") ? null : f.ciudad_entidad || null,
    departamento_ejecucion: lu ? lu.departamento : null, municipio_ejecucion: lu ? lu.municipio : null,
    ubicacion_fuente: lu ? "direccion_del_contrato" : null,
    modalidad: mod, modalidad_literal: f.modalidad_de_contratacion || null, precio_base: base,
    fecha_publicacion: pub, fecha_cierre: f.fecha_de_recepcion_de || null, fecha_adjudicacion: f.fecha_adjudicacion || null,
    plazo_dias: dias(pub, f.fecha_de_recepcion_de), plazo_oferta_dias: dias(f.fecha_de_publicacion_del, f.fecha_de_recepcion_de), estado: f.estado_del_procedimiento || null, adjudicado: f.adjudicado === "Si",
    ganador: null, ganador_id: null, ganador_nit: null, valor_adjudicado: valorAdj && valorAdj > 0 ? valorAdj : null, pct_adjudicado: null, inconsistencia: null,
    respuestas_publicadas: L.numeroONull(f.respuestas_al_procedimiento),
    interesados: mod === "menor_cuantia" ? Math.max(...filas.map((x) => L.numeroONull(x.proveedores_invitados) ?? -1)) : null,
    ofertas_validas: [], n_validas: null, oferta_ganadora: null, competencia: null, excluido: null, excluidas: null,
  };
  if (fila.interesados !== null && fila.interesados < 0) fila.interesados = null;
  if (fila.interesados !== null && fila.respuestas_publicadas !== null && fila.interesados < fila.respuestas_publicadas) fila.interesados_contradictorio = true;
  if (fila.adjudicado) {
    fila.ganador = f.nombre_del_proveedor && !/^no definido$/i.test(f.nombre_del_proveedor) ? f.nombre_del_proveedor : null;
    fila.ganador_id = identidadGanador(f);
    fila.ganador_nit = L.nitValido(f.nit_del_proveedor_adjudicado);
    if (fila.valor_adjudicado !== null && base > 0) {
      const p = fila.valor_adjudicado / base;
      // Adjudicar por encima del precio base es una inconsistencia (dos casos medidos eran ×1000): no se usa
      if (p > 1) fila.inconsistencia = "valor_adjudicado_sobre_precio_base"; else fila.pct_adjudicado = p;
    }
  }
  // Exclusiones, en orden, con su motivo (las mismas del embudo de la Fase 0 más numero_de_lotes)
  if (mod === "otra") fila.excluido = "modalidad_no_competitiva";
  else if (!fila.adjudicado) fila.excluido = "no_adjudicado";
  else if (base === null || base <= 0) fila.excluido = "sin_precio_base";
  else if (L.lotePorPrecioBase(filas)) fila.excluido = "lote_p6dx";
  else if (nLotes !== null && nLotes > 1) fila.excluido = "lote_numero_de_lotes";
  else if (sinMedirOfertas) fila.excluido = "sin_medir_ofertas";
  else if (!ofertas || !ofertas.length) fila.excluido = "sin_ofertas_en_datos_abiertos";
  if (!fila.excluido || fila.excluido === "lote_numero_de_lotes") {
    if (ofertas && ofertas.length && base > 0) {
      const r = L.limpiarOfertas(ofertas, base);
      fila.excluidas = r.excluidas;
      fila.ofertas_validas = r.validas.map((o) => ({ proveedor: o.proveedor, nombre: o.nombre, valor: o.valor, pct: o.pct }));
      fila.n_validas = r.validas.length;
      if (!fila.excluido) {
        if (r.lote_sospechoso) fila.excluido = "lote_por_ofertas";
        else if (!r.validas.length) fila.excluido = "cero_ofertas_validas";
      }
      // ¿cuál de las válidas es la del ganador? por NIT o por nombre (la identidad unida de limpieza)
      if (fila.ganador_id) {
        const prov = L.proveedoresUnidos([...ofertas, { nit_del_proveedor: f.nit_del_proveedor_adjudicado, nombre_proveedor: f.nombre_del_proveedor }]);
        const idG = prov({ nit_del_proveedor: f.nit_del_proveedor_adjudicado, nombre_proveedor: f.nombre_del_proveedor });
        const og = r.validas.filter((o) => prov(o.fila) === idG);
        fila.oferta_ganadora = og.length === 1 ? { valor: og[0].valor, pct: og[0].pct } : null;   // 0 o 2+: no se adivina
        // Un valor adjudicado que contradice a la oferta publicada del ganador (> 1 %) se manda a verificar
        if (fila.oferta_ganadora && fila.valor_adjudicado !== null && Math.abs(fila.valor_adjudicado - fila.oferta_ganadora.valor) / fila.oferta_ganadora.valor > 0.01)
          fila.inconsistencia = fila.inconsistencia || "valor_adjudicado_distinto_de_la_oferta_ganadora";
      }
    }
  }
  if (!fila.excluido) fila.competencia = L.competencia(fila.n_validas);
  return fila;
}

/* Lugar de ejecución desde la dirección de jbjy: «…\nMunicipio\nDepartamento\nCOLOMBIA». */
function lugarDeDireccion(dir) {
  const ls = String(dir || "").split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
  if (ls.length < 3 || !/^colombia$/i.test(ls[ls.length - 1] || "")) return null;
  const d = ls[ls.length - 2];
  if (!d || /^no definido$/i.test(d)) return null;
  // Con 3 líneas no hay municipio («CALLE 4 CARRERA 3 ESQUINA\nTolima\nCOLOMBIA»): solo el departamento
  return { municipio: ls.length >= 4 ? ls[ls.length - 3] : null, departamento: d };
}

function percentil(xs, p) {
  const a = xs.filter((x) => typeof x === "number" && Number.isFinite(x)).sort((x, y) => x - y);
  if (!a.length) return null;
  const i = p * (a.length - 1), lo = Math.floor(i), hi = Math.ceil(i);
  return a[lo] + (a[hi] - a[lo]) * (i - lo);
}

/* Señales sobre la base entera (necesitan el conjunto: umbral de plazo y conteo por entidad). */
function senales(filas) {
  const usables = filas.filter((x) => x.competencia);
  const umbralPlazo = {};
  for (const m of ["licitacion", "menor_cuantia", "minima"])
    umbralPlazo[m] = percentil(usables.filter((x) => x.modalidad === m).map((x) => x.plazo_dias), PERCENTIL_PLAZO_CORTO);
  /* Victorias por entidad: TODA adjudicación cuenta (también las excluidas del piso, p. ej. lotes:
     declarado). Un NIT que en la misma entidad gana con 2+ nombres distintos no identifica: se
     cuenta por nombre (el «900000000» de nueve consorcios en la Aerocivil). */
  const adjs = filas.filter((x) => x.adjudicado && x.modalidad !== "otra" && x.codigo_entidad && x.ganador_id);
  const nombresPorNit = new Map();
  for (const x of adjs) if (x.ganador_nit && x.ganador) { const k = x.codigo_entidad + "|" + x.ganador_nit;
    if (!nombresPorNit.has(k)) nombresPorNit.set(k, new Set()); nombresPorNit.get(k).add(L.nombreComparable(x.ganador)); }
  const claveGanador = (x) => (x.ganador_nit && (nombresPorNit.get(x.codigo_entidad + "|" + x.ganador_nit) || new Set()).size > 1
    ? (x.ganador ? "o:" + L.nombreComparable(x.ganador) : null) : x.ganador_id);
  const victorias = new Map();
  for (const x of adjs) { const g = claveGanador(x); if (!g) continue; const k = x.codigo_entidad + "|" + g; victorias.set(k, (victorias.get(k) || 0) + 1); }
  for (const x of usables) {
    const s = {};
    // «Una sola oferta» con más respuestas publicadas que válidas no es un oferente único: null
    const conflicto = x.respuestas_publicadas !== null && x.respuestas_publicadas > x.n_validas;
    s.una_oferta = x.n_validas === 1 ? (conflicto ? null : true) : false;
    s.adjudicado_99_con_una = s.una_oferta === null ? null : x.n_validas !== 1 ? false
      : x.pct_adjudicado === null || x.inconsistencia ? null : x.pct_adjudicado >= ADJ_CASI_TOTAL;
    const u = umbralPlazo[x.modalidad];
    s.plazo_corto = x.plazo_dias === null || u === null ? null : x.plazo_dias < u;
    const g = claveGanador(x);
    s.ganador_repetido = g && x.codigo_entidad ? (victorias.get(x.codigo_entidad + "|" + g) || 0) >= N_GANADOR_REPETIDO : null;
    s.interes_sin_ofertas = x.modalidad !== "menor_cuantia" || x.interesados === null || x.interesados_contradictorio ? null
      : x.interesados >= INTERES_MIN && x.n_validas <= OFERTAS_MAX_CON_INTERES;
    x.senales = s;
  }
  return { umbralPlazo, victorias };
}

module.exports = { filaDeProceso, senales, lugarDeDireccion, identidadGanador, percentil,
  N_GANADOR_REPETIDO, PERCENTIL_PLAZO_CORTO, INTERES_MIN, OFERTAS_MAX_CON_INTERES, ADJ_CASI_TOTAL };
