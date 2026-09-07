/* ============================================================================
   lib/socio · Verifique a su socio antes de firmar (due diligence de 20 minutos)
   ----------------------------------------------------------------------------
   El manual (truco #15 y Cap. Consorcios) lo dice sin rodeos: «un integrante
   inhabilitado contamina al consorcio completo» y antes de firmar hay que
   mirar CINCO fuentes públicas y gratuitas: SIRI (Procuraduría), boletín de
   responsables fiscales (Contraloría), antecedentes judiciales (Policía), RNMC
   y el histórico en SECOP (incumplimientos, multas, caducidades). CLAUDE.md
   tenía este punto en ⬜ con la nota «no es automatizable con datos abiertos:
   son portales con captcha». Era verdad a medias, y se midió el 17-ago-2026:

   · SIRI SÍ está en datos.gov.co: `iaeu-rcn6` «Antecedentes de SIRI»
     (Procuraduría, actualizado a diario, 43 k sanciones CERTIFICABLES). Solo
     cédulas (personas naturales), `numero_identificacion` viene RELLENO CON
     ESPACIOS a la derecha («7534386        ») → se consulta con `starts_with`
     y se confirma la igualdad recortada en el cliente. Es el DATASET, no el
     certificado: una consulta sin coincidencias no sustituye al certificado
     que pide el pliego, y así se dice.
   · Multas y sanciones SECOP I: `4n4q-k399` (CCE, 1 707 filas, `documento_
     contratista` A VECES con dígito de verificación pegado → `starts_with` +
     filtro por longitud). SECOP II NO publica un dataset equivalente: lo que
     no esté aquí hay que mirarlo en la ficha del proveedor en SECOP II, y se
     dice. Trae filas de «Z ENTIDAD DE PRUEBA»: se descartan y se cuentan.
   · SECOP II Contratos Electrónicos (`jbjy-vk9h`) por `documento_proveedor`:
     cuántos contratos, estados (Cancelado · cedido · Suspendido…), prórrogas y
     pagos con el MISMO agregador de lib/ejecucion (`agregarEjecucion`, puro:
     una segunda cuenta de prórrogas divergiría), MÁS el representante legal
     que el dataset publica: si trae una cédula distinta del NIT, se consulta
     TAMBIÉN en SIRI (la persona jurídica no aparece en SIRI; su representante,
     sí puede).
   · Adjudicaciones en `p6dx-8zbt` por `nit_del_proveedor_adjudicado`,
     agrupadas por año en el servidor (n, entidades, valor, última).

   Las otras TRES siguen siendo manuales (portales con captcha, sin dataset):
   viajan como checklist con el enlace verificado (200 el 17-ago-2026) y qué
   mirar en cada una. Y la regla que convierte «negociar una multa» en decisión
   estratégica —Ley 1474/2011 art. 90, inhabilidad por incumplimiento
   reiterado: 5 multas, o 2 incumplimientos, o 2 multas + 1 incumplimiento en
   la MISMA vigencia fiscal → 3 años— se aplica sobre lo visible y se declara
   como POSIBLE, nunca como veredicto: el dataset solo trae multas de SECOP I
   y no distingue una declaratoria de incumplimiento.

   Reglas del proyecto que rigen aquí:
   · Best-effort con TIEMPO ACOTADO por fuente, en PARALELO; una fuente caída
     → `ok:false` con motivo y las demás salen. Nunca lanza.
   · Ninguna cifra sin su fuente y su fecha; la ausencia es «sin coincidencia
     en el dataset», jamás «limpio».
   · Transporte: `lib/socrata.crearCliente({baseUrl})` — nada de un segundo
     cliente HTTP.
   ========================================================================== */
"use strict";

const { crearCliente, escSoQL } = require("./socrata.js");
const { agregarEjecucion } = require("./ejecucion.js");

const DATASETS = {
  siri: "iaeu-rcn6",
  multas: "4n4q-k399",
  contratos: "jbjy-vk9h",
  adjudicaciones: "p6dx-8zbt",
};
const BASES = {
  siri: () => process.env.SIRI_BASE_URL || `https://www.datos.gov.co/resource/${DATASETS.siri}.json`,
  multas: () => process.env.MULTAS_BASE_URL || `https://www.datos.gov.co/resource/${DATASETS.multas}.json`,
  contratos: () => process.env.EJECUCION_BASE_URL || `https://www.datos.gov.co/resource/${DATASETS.contratos}.json`,
  adjudicaciones: () => process.env.SECOP_BASE_URL || `https://www.datos.gov.co/resource/${DATASETS.adjudicaciones}.json`,
};
const TIEMPO_MAX_MS = parseInt(process.env.SOCIO_TIEMPO_MS, 10) || 6000;
const MAX_FILAS = 1000;
const MAX_LISTA = 20;

/* Las CINCO fuentes del truco #15, con el enlace verificado (HTTP 200 el
   17-ago-2026 desde este entorno) y qué buscar. `automatica` dice si la app
   la consulta por sí sola (dataset abierto) o si hay que abrir el portal. */
const FUENTES_MANUAL = [
  {
    clave: "siri",
    nombre: "Antecedentes disciplinarios (SIRI · Procuraduría)",
    url: "https://www.procuraduria.gov.co/Pages/Consulta-de-Antecedentes.aspx",
    automatica: true,
    que_mirar: "Sanciones disciplinarias e inhabilidades vigentes de la persona natural o del representante legal. La app consulta el dataset abierto de la Procuraduría; el pliego pide el CERTIFICADO: descárguelo igual (es gratis y sale al instante).",
  },
  {
    clave: "contraloria",
    nombre: "Boletín de responsables fiscales (Contraloría)",
    url: "https://www.contraloria.gov.co/es/web/guest/control-fiscal/responsabilidad-fiscal/certificado-de-antecedentes-fiscales",
    automatica: false,
    que_mirar: "Que ni la empresa ni su representante legal figuren en el boletín. Quien figura NO puede contratar con el Estado (Ley 610/2000 art. 60) y arrastra al consorcio entero.",
  },
  {
    clave: "policia",
    nombre: "Antecedentes judiciales (Policía Nacional)",
    url: "https://antecedentes.policia.gov.co:7005/WebJudicial/",
    automatica: false,
    que_mirar: "Consulta por cédula del representante legal (y de los socios que firmen). Una condena vigente por delitos contra la administración pública es inhabilidad.",
  },
  {
    clave: "rnmc",
    nombre: "Registro Nacional de Medidas Correctivas (RNMC)",
    url: "https://srvcnpc.policia.gov.co/PSC/frm_cnp_consulta.aspx",
    automatica: false,
    que_mirar: "Multas del Código de Policía en mora: una medida correctiva sin pagar (más de 6 meses) impide contratar con el Estado (Ley 1801/2016 art. 183).",
  },
  {
    clave: "secop",
    nombre: "Histórico en SECOP (multas, incumplimientos, cómo ejecuta)",
    url: "https://www.datos.gov.co/resource/4n4q-k399.json",
    automatica: true,
    que_mirar: "Multas y sanciones registradas, contratos cancelados, cedidos o suspendidos, y cuántos contratos ha ganado. La app trae SECOP I (multas) y SECOP II (contratos); lo que no aparezca acá, confírmelo en la ficha del proveedor en SECOP II.",
  },
];

const NORMA = {
  inhabilidad_reiterada: {
    norma: "Ley 1474/2011 art. 90 (inhabilidad por incumplimiento reiterado)",
    regla: "En una MISMA vigencia fiscal: 5 o más multas, o 2 declaratorias de incumplimiento, o 2 multas + 1 incumplimiento → inhabilidad de 3 años desde la inscripción de la última en el RUP.",
    alcance: "La app solo ve las multas publicadas en SECOP I (dataset 4n4q-k399) y no distingue una declaratoria de incumplimiento: lo que resulte es una señal para verificar en el RUP y en SECOP II, no un veredicto.",
  },
  solidaridad: {
    norma: "Ley 80/1993 art. 7",
    regla: "Consorcio y unión temporal responden SOLIDARIAMENTE por el contrato; un integrante inhabilitado contamina al consorcio completo.",
  },
};

const digitos = (s) => String(s == null ? "" : s).replace(/\D/g, "");
const num = (v) => { if (v == null || v === "") return null; const n = Number(v); return Number.isFinite(n) ? n : null; };

function conTiempo(promesa, ms) {
  let timer;
  const reloj = new Promise((_, rechazar) => { timer = setTimeout(() => rechazar(new Error(`tiempo agotado (${ms} ms)`)), ms); });
  return Promise.race([promesa, reloj]).finally(() => clearTimeout(timer));
}

/* Un NIT colombiano son 9 dígitos (10 con el de verificación); una cédula,
   entre 6 y 10. Se acepta cualquiera y se dice cuál se cree que es. */
function clasificarIdentificacion(cruda) {
  const d = digitos(cruda);
  if (!d) return { valor: null, tipo: null, dv: null, error: "identificación vacía" };
  if (d.length < 6 || d.length > 11) return { valor: d, tipo: null, dv: null, error: `«${d}» no parece ni un NIT (9-10 dígitos) ni una cédula (6-10 dígitos)` };
  /* Un NIT de persona jurídica empieza por 8 o 9 y tiene 9 dígitos (10 con DV).
     Todo lo demás se trata como cédula: la cédula de una persona natural ES su
     NIT, así que la consulta se hace igual en todas las fuentes. */
  const tipo = /^[89]\d{8}\d?$/.test(d) ? "nit" : "cedula";
  const conDv = tipo === "nit" && d.length === 10;
  return { valor: conDv ? d.slice(0, 9) : d, tipo, dv: conDv ? d.slice(9) : null, error: null };
}

/* ---------- SIRI ---------- */
function anioDe(fechaDMA) {
  const m = /(\d{4})/.exec(String(fechaDMA || ""));
  return m ? Number(m[1]) : null;
}

async function consultarSiri(ids, { fetchImpl, log, tiempoMs }) {
  const base = { ok: false, fuente: DATASETS.siri, consultados: ids, coincidencias: [], n: 0, motivo: null,
    nota: "Dataset abierto de la Procuraduría (sanciones certificables; solo personas naturales). NO sustituye al certificado SIRI que pide el pliego." };
  if (!ids.length) return { ...base, motivo: "sin cédula que consultar (SIRI solo registra personas naturales)" };
  const cliente = crearCliente({ baseUrl: BASES.siri(), fetchImpl, log });
  try {
    const filas = [];
    for (const id of ids) {
      const f = await conTiempo(cliente.pedir({
        "$select": "numero_siri,numero_identificacion,primer_nombre,segundo_nombre,primer_apellido,segundo_apellido,calidad_persona,sanciones,duracion_anos,duracion_mes,duracion_dias,fecha_efectos_juridicos,autoridad,entidad_sancionado,tipo_inhabilidad",
        "$where": `starts_with(numero_identificacion,'${escSoQL(id)}')`,
        "$limit": "200",
      }, "SIRI", { plazoMs: tiempoMs }), tiempoMs);
      for (const r of f || []) if (digitos(r.numero_identificacion) === id) filas.push(r);
    }
    const coincidencias = filas.map((r) => ({
      identificacion: digitos(r.numero_identificacion),
      nombre: [r.primer_nombre, r.segundo_nombre, r.primer_apellido, r.segundo_apellido].map((x) => String(x || "").trim()).filter(Boolean).join(" "),
      calidad: String(r.calidad_persona || "").trim() || null,
      sancion: String(r.sanciones || "").trim() || null,
      tipo: String(r.tipo_inhabilidad || "").trim() || null,
      duracion: { anos: num(r.duracion_anos), meses: num(r.duracion_mes), dias: num(r.duracion_dias) },
      fecha_efectos: String(r.fecha_efectos_juridicos || "").trim() || null,
      anio: anioDe(r.fecha_efectos_juridicos),
      autoridad: String(r.autoridad || "").trim() || null,
      entidad: String(r.entidad_sancionado || "").trim() || null,
    })).sort((a, b) => (b.anio || 0) - (a.anio || 0)).slice(0, MAX_LISTA);
    return { ...base, ok: true, coincidencias, n: filas.length,
      motivo: filas.length ? null : "sin coincidencias en el dataset abierto de SIRI para esta(s) cédula(s) — pida el certificado igual" };
  } catch (e) {
    log(`socio/siri: ${e && e.message}`);
    return { ...base, motivo: `no se pudo consultar el registro de sanciones (SIRI): ${String((e && e.message) || e)}` };
  }
}

/* ---------- Multas y sanciones SECOP I ---------- */
function agregarMultas(filas, ahora = Date.now()) {
  const porAnio = {};
  let valor = 0, conValor = 0;
  const lista = [];
  for (const f of filas) {
    const firmeza = String(f.fecha_de_firmeza || f.fecha_de_publicacion || "").slice(0, 10) || null;
    const anio = firmeza ? Number(firmeza.slice(0, 4)) : null;
    const clave = anio != null && Number.isFinite(anio) ? String(anio) : "sin_fecha";
    porAnio[clave] = (porAnio[clave] || 0) + 1;
    const v = num(f.valor_sancion);
    if (v != null && v > 0) { valor += v; conValor++; }
    lista.push({
      entidad: String(f.nombre_entidad || "").trim() || null,
      resolucion: String(f.numero_de_resolucion || "").trim() || null,
      contrato: String(f.numero_de_contrato || "").trim() || null,
      valor_cop: v != null && v > 0 ? v : null,
      firmeza,
      url: String(f.ruta_de_proceso || "").trim() || null,
    });
  }
  lista.sort((a, b) => String(b.firmeza || "").localeCompare(String(a.firmeza || "")));
  /* Regla del art. 90 sobre lo VISIBLE: el máximo de multas en una misma
     vigencia fiscal. ≥ 5 → señal fuerte; ≥ 2 → conviene verificar si alguna
     fue declaratoria de incumplimiento (2 multas + 1 incumplimiento también
     inhabilita). La vigencia es el AÑO de la firmeza. */
  let anioMax = null, nMax = 0;
  for (const [a, n] of Object.entries(porAnio)) if (a !== "sin_fecha" && n > nMax) { nMax = n; anioMax = Number(a); }
  const anioActual = new Date(ahora - 5 * 3600e3).getUTCFullYear();
  const senal = nMax >= 5 ? "posible_inhabilidad"
    : nMax >= 2 ? "verificar_incumplimientos"
      : null;
  return {
    multas: filas.length,
    valor_total_cop: conValor ? Math.round(valor) : null,
    multas_con_valor: conValor,
    por_anio: porAnio,
    inhabilidad_reiterada: {
      ...NORMA.inhabilidad_reiterada,
      max_multas_en_una_vigencia: nMax || 0,
      vigencia: anioMax,
      senal,
      /* Una inhabilidad de 3 años desde la última multa: si la vigencia con ≥ 5
         multas está a más de 3 años, la señal es histórica, no vigente. */
      podria_estar_vigente: senal === "posible_inhabilidad" ? (anioActual - anioMax) <= 3 : null,
      lectura: senal === "posible_inhabilidad"
        ? `${nMax} multas en la vigencia ${anioMax}: con 5 o más en un mismo año fiscal la ley prevé 3 años de inhabilidad. Verifíquelo en el RUP (la inhabilidad se inscribe ahí) antes de firmar.`
        : senal === "verificar_incumplimientos"
          ? `${nMax} multas en la vigencia ${anioMax}: 2 multas + 1 declaratoria de incumplimiento en el mismo año ya inhabilitan. Confirme en SECOP II si además hubo incumplimientos declarados.`
          : (filas.length ? "Multas registradas, sin concentración que active la regla del art. 90 con lo visible." : "Sin multas registradas en SECOP I."),
    },
    lista: lista.slice(0, MAX_LISTA),
  };
}

async function consultarMultas(id, { fetchImpl, log, tiempoMs, ahora }) {
  const base = { ok: false, fuente: DATASETS.multas, consultado: id, motivo: null, filas_prueba_descartadas: 0,
    nota: "Multas y sanciones publicadas por las entidades en SECOP I. SECOP II NO publica un dataset equivalente: lo que no aparezca acá, confírmelo en la ficha del proveedor en SECOP II." };
  const cliente = crearCliente({ baseUrl: BASES.multas(), fetchImpl, log });
  try {
    const crudas = await conTiempo(cliente.pedir({
      "$select": "nombre_entidad,nit_entidad,numero_de_resolucion,documento_contratista,nombre_contratista,numero_de_contrato,valor_sancion,fecha_de_publicacion,fecha_de_firmeza,ruta_de_proceso",
      "$where": `starts_with(documento_contratista,'${escSoQL(id)}')`,
      "$order": "fecha_de_firmeza desc", "$limit": String(MAX_FILAS),
    }, "multas SECOP I", { plazoMs: tiempoMs }), tiempoMs);
    let prueba = 0;
    const filas = [];
    for (const f of crudas || []) {
      const d = digitos(f.documento_contratista);
      /* igual, o igual + UN dígito (el DV pegado): «8340014074» es 834001407-4 */
      if (!(d === id || (d.length === id.length + 1 && d.startsWith(id)))) continue;
      if (/ENTIDAD DE PRUEBA/i.test(String(f.nombre_entidad || ""))) { prueba++; continue; }
      filas.push(f);
    }
    const nombres = new Map();
    for (const f of filas) { const n = String(f.nombre_contratista || "").trim(); if (n) nombres.set(n, (nombres.get(n) || 0) + 1); }
    const nombre = [...nombres.entries()].sort((a, b) => b[1] - a[1]).map(([n]) => n)[0] || null;
    return { ...base, ok: true, nombre_en_dataset: nombre, filas_prueba_descartadas: prueba, ...agregarMultas(filas, ahora),
      motivo: filas.length ? null : "sin multas ni sanciones registradas en SECOP I para esta identificación" };
  } catch (e) {
    log(`socio/multas: ${e && e.message}`);
    return { ...base, motivo: `no se pudo consultar el registro de multas y sanciones de SECOP I: ${String((e && e.message) || e)}` };
  }
}

/* ---------- Contratos SECOP II (jbjy) por proveedor ---------- */
async function consultarContratos(id, { fetchImpl, log, tiempoMs }) {
  const base = { ok: false, fuente: DATASETS.contratos, consultado: id, contratos: null, motivo: null, representante_legal: null,
    nota: "Contratos electrónicos firmados en SECOP II por este proveedor (todos los tipos): estados, prórrogas y pagos registrados. Un pago en 0 es «no lo registra la entidad», no «no le han pagado»." };
  const cliente = crearCliente({ baseUrl: BASES.contratos(), fetchImpl, log });
  try {
    const filas = await conTiempo(cliente.pedir({
      "$select": "id_contrato,proceso_de_compra,nombre_entidad,proveedor_adjudicado,tipo_de_contrato,estado_contrato,valor_del_contrato,valor_pagado,dias_adicionados,fecha_de_firma,fecha_de_fin_del_contrato,nombre_representante_legal,identificaci_n_representante_legal,es_pyme",
      "$where": `documento_proveedor='${escSoQL(id)}'`,
      "$order": "fecha_de_firma desc", "$limit": String(MAX_FILAS),
    }, "contratos del proveedor", { plazoMs: tiempoMs }), tiempoMs);
    const lista = filas || [];
    const agregado = agregarEjecucion(lista);
    const nombres = new Map(), tipos = {}, entidades = new Set();
    let cancelados = 0, cedidos = 0, primera = null, ultima = null, pyme = null;
    const rl = new Map();
    for (const f of lista) {
      const n = String(f.proveedor_adjudicado || "").trim(); if (n) nombres.set(n, (nombres.get(n) || 0) + 1);
      const t = String(f.tipo_de_contrato || "").trim() || "sin tipo"; tipos[t] = (tipos[t] || 0) + 1;
      if (f.nombre_entidad) entidades.add(String(f.nombre_entidad).trim());
      const est = String(f.estado_contrato || "");
      if (/cancel/i.test(est)) cancelados++;
      if (/cedid/i.test(est)) cedidos++;
      const ff = String(f.fecha_de_firma || "").slice(0, 10);
      if (ff) { if (!primera || ff < primera) primera = ff; if (!ultima || ff > ultima) ultima = ff; }
      if (pyme == null && f.es_pyme) pyme = /^si$/i.test(String(f.es_pyme).trim());
      const idRl = digitos(f.identificaci_n_representante_legal);
      const nomRl = String(f.nombre_representante_legal || "").trim();
      /* Solo cuenta como representante legal una CÉDULA distinta del propio NIT:
         el dataset repite a veces el NIT de la empresa en ese campo. */
      if (idRl && idRl !== id && idRl.length >= 6 && idRl.length <= 10) {
        const g = rl.get(idRl) || { identificacion: idRl, nombre: nomRl || null, contratos: 0 };
        g.contratos++; if (!g.nombre && nomRl) g.nombre = nomRl;
        rl.set(idRl, g);
      }
    }
    const nombre = [...nombres.entries()].sort((a, b) => b[1] - a[1]).map(([n]) => n)[0] || null;
    const representantes = [...rl.values()].sort((a, b) => b.contratos - a.contratos);
    return {
      ...base, ok: true, ...agregado,
      nombre_en_dataset: nombre,
      entidades_distintas: entidades.size,
      por_tipo: tipos,
      cancelados: { contratos: cancelados, pct: lista.length ? Math.round((cancelados / lista.length) * 100) : null },
      cedidos: { contratos: cedidos, pct: lista.length ? Math.round((cedidos / lista.length) * 100) : null },
      primera_firma: primera, ultima_firma: ultima,
      es_pyme: pyme,
      truncado: lista.length >= MAX_FILAS,
      representante_legal: representantes[0] || null,
      otros_representantes: representantes.slice(1, 5),
      motivo: lista.length ? null : "sin contratos electrónicos en SECOP II con esta identificación",
    };
  } catch (e) {
    log(`socio/contratos: ${e && e.message}`);
    return { ...base, motivo: `no se pudo consultar el historial de contratos en SECOP II: ${String((e && e.message) || e)}` };
  }
}

/* ---------- Adjudicaciones p6dx por NIT del proveedor ---------- */
async function consultarAdjudicaciones(id, { fetchImpl, log, tiempoMs }) {
  const base = { ok: false, fuente: DATASETS.adjudicaciones, consultado: id, adjudicaciones: null, motivo: null,
    nota: "Procesos adjudicados a esta identificación en SECOP II (todas las modalidades y tipos), agrupados por año." };
  const cliente = crearCliente({ baseUrl: BASES.adjudicaciones(), fetchImpl, log });
  try {
    const filas = await conTiempo(cliente.pedir({
      "$select": "date_trunc_y(fecha_adjudicacion) as anio,count(*) as n,count(distinct entidad) as entidades,sum(valor_total_adjudicacion) as valor,max(fecha_adjudicacion) as ultima",
      "$where": `nit_del_proveedor_adjudicado='${escSoQL(id)}' AND adjudicado='Si'`,
      "$group": "anio", "$order": "anio desc", "$limit": "50",
    }, "adjudicaciones del proveedor", { plazoMs: tiempoMs }), tiempoMs);
    const porAnio = [];
    let total = 0, valor = 0, ultima = null;
    for (const f of filas || []) {
      const n = num(f.n) || 0;
      const anio = String(f.anio || "").slice(0, 4) || "sin_fecha";
      const v = num(f.valor);
      porAnio.push({ anio, procesos: n, entidades: num(f.entidades), valor_cop: v != null && v > 0 ? Math.round(v) : null });
      total += n; if (v != null && v > 0) valor += v;
      const u = String(f.ultima || "").slice(0, 10);
      if (u && (!ultima || u > ultima)) ultima = u;
    }
    return { ...base, ok: true, adjudicaciones: total, valor_total_cop: valor > 0 ? Math.round(valor) : null, ultima_adjudicacion: ultima, por_anio: porAnio,
      motivo: total ? null : "sin adjudicaciones a esta identificación en SECOP II" };
  } catch (e) {
    log(`socio/adjudicaciones: ${e && e.message}`);
    return { ...base, motivo: `no se pudo consultar el historial de adjudicaciones en SECOP II: ${String((e && e.message) || e)}` };
  }
}

/* ---------- Semáforo ----------
   Cuatro estados y ninguno es «limpio»: lo máximo que la app puede decir es «sin
   hallazgos en las fuentes abiertas», porque tres de las cinco fuentes exigen
   abrir un portal. El cuarto, `no_verificable` (6-sep-2026), es «no hay hallazgos
   en lo que respondió, pero alguna fuente automática no respondió»: antes valía
   `sin_hallazgos` —el MISMO valor que una consulta limpia— y la pantalla lo
   pintaba en verde con SECOP caído. «No pude consultar» no es «no hay nada»
   (sin dato ≠ cero), y aquí el falso caro es dar verde sin datos: va en ámbar. */
function semaforo({ siri, multas, contratos }) {
  const hallazgos = [];
  if (siri.ok && siri.n > 0) hallazgos.push({ nivel: "rojo", fuente: "siri", texto: `${siri.n} sanción(es) disciplinaria(s) en SIRI` });
  if (multas.ok && multas.multas > 0) {
    const ir = multas.inhabilidad_reiterada;
    /* Rojo SOLO si la posible inhabilidad puede estar vigente (3 años desde la
       última multa de esa vigencia); una concentración vieja es señal
       histórica: ámbar. */
    const vigente = ir.senal === "posible_inhabilidad" && ir.podria_estar_vigente === true;
    hallazgos.push({ nivel: vigente ? "rojo" : "ambar", fuente: "multas",
      texto: `${multas.multas} multa(s) en SECOP I${vigente ? " — posible inhabilidad vigente (art. 90 Ley 1474)" : ir.senal === "posible_inhabilidad" ? ` — ${ir.max_multas_en_una_vigencia} en ${ir.vigencia}: inhabilidad de entonces ya vencida, pero revise cómo ejecuta` : ""}` });
  }
  if (contratos.ok && contratos.contratos) {
    if (contratos.cancelados.contratos) hallazgos.push({ nivel: "ambar", fuente: "contratos", texto: `${contratos.cancelados.contratos} contrato(s) cancelado(s) en SECOP II` });
    if (contratos.suspendidos.contratos) hallazgos.push({ nivel: "ambar", fuente: "contratos", texto: `${contratos.suspendidos.contratos} contrato(s) suspendido(s)` });
    if (contratos.cedidos.contratos) hallazgos.push({ nivel: "ambar", fuente: "contratos", texto: `${contratos.cedidos.contratos} contrato(s) cedido(s)` });
  }
  const fuentesCaidas = [siri, multas, contratos].filter((f) => !f.ok && f.motivo && /no se pudo consultar/.test(f.motivo)).map((f) => f.fuente);
  const nivel = hallazgos.some((h) => h.nivel === "rojo") ? "rojo"
    : hallazgos.length ? "ambar"
      : fuentesCaidas.length ? "no_verificable"
        : "sin_hallazgos";
  return {
    nivel,
    hallazgos,
    fuentes_caidas: fuentesCaidas,
    texto: nivel === "rojo" ? "Hay hallazgos que pueden inhabilitar: no firme sin verificarlos en la fuente oficial."
      : nivel === "ambar" ? "Hay señales que conviene revisar antes de firmar (no son inhabilidades por sí solas)."
        : nivel === "no_verificable" ? `Sin hallazgos en lo consultado, pero ${fuentesCaidas.length} fuente(s) no respondieron: repita la consulta.`
          : "Sin hallazgos en las fuentes abiertas. Faltan las tres del checklist que hay que abrir a mano.",
    advertencia: "«Sin hallazgos» no es «limpio»: la app consulta datasets abiertos, no los certificados. Los certificados de Procuraduría, Contraloría y Policía se piden igual (gratis y al instante) y son los que van en la carpeta.",
  };
}

function checklist({ siri, multas, contratos, adjudicaciones }) {
  return FUENTES_MANUAL.map((f) => {
    let estado = "pendiente_manual", resumen = null;
    if (f.clave === "siri") {
      /* NO CONSULTAR POR FALTA DE DATO NO ES QUE LA FUENTE FALLE. Con una persona
         jurídica cuyo representante legal SECOP no publica no hay ninguna cédula
         que preguntarle a SIRI, y decir «no respondió» culpa a la fuente de un
         hueco que resuelve quien consulta escribiendo la cédula. Es la regla de
         «sin dato» de siempre: se dice cuál es el dato que falta y cómo darlo. */
      const sinCedula = !(siri.consultados && siri.consultados.length);
      estado = siri.ok ? (siri.n ? "hallazgos" : "sin_hallazgos") : (sinCedula ? "falta_cedula" : "no_consultada");
      resumen = siri.ok ? (siri.n ? `${siri.n} sanción(es) sobre ${siri.consultados.join(", ")}` : `sin coincidencias para ${siri.consultados.join(", ") || "—"}`)
        : (sinCedula ? "SECOP no publica la cédula del representante legal de este NIT: escríbala arriba para consultarla" : siri.motivo);
    }
    if (f.clave === "secop") {
      const partes = [];
      if (multas.ok) partes.push(multas.multas ? `${multas.multas} multa(s) SECOP I` : "sin multas SECOP I");
      if (contratos.ok) partes.push(contratos.contratos ? `${contratos.contratos} contrato(s) SECOP II` : "sin contratos SECOP II");
      if (adjudicaciones.ok) partes.push(adjudicaciones.adjudicaciones ? `${adjudicaciones.adjudicaciones} adjudicación(es)` : "sin adjudicaciones");
      const hay = (multas.ok && multas.multas) || (contratos.ok && (contratos.cancelados.contratos || contratos.suspendidos.contratos || contratos.cedidos.contratos));
      estado = (multas.ok || contratos.ok) ? (hay ? "hallazgos" : "sin_hallazgos") : "no_consultada";
      resumen = partes.join(" · ") || [multas.motivo, contratos.motivo].filter(Boolean).join(" · ");
    }
    return { ...f, estado, resumen };
  });
}

/* Entrada: {identificacion, representante?} — la del socio (NIT o cédula) y,
   opcionalmente, la cédula de su representante legal. Devuelve SIEMPRE un
   objeto; nunca lanza. */
async function verificarSocio(entrada, { fetchImpl, log = () => {}, tiempoMs = TIEMPO_MAX_MS, ahora = Date.now() } = {}) {
  const idn = clasificarIdentificacion(entrada && entrada.identificacion);
  if (idn.error) return { ok: false, error: idn.error };
  const rlDeclarado = clasificarIdentificacion(entrada && entrada.representante);
  const representanteDeclarado = rlDeclarado.error ? null : rlDeclarado.valor;
  const opts = { fetchImpl, log, tiempoMs, ahora };
  const id = idn.valor;

  /* Contratos primero: de ahí sale el representante legal que publica SECOP
     II; después SIRI con la cédula (propia si el socio es persona natural, la
     del representante si es jurídica, y la declarada por quien consulta). Las
     otras dos fuentes van en paralelo desde el principio. */
  const [multas, adjudicaciones, contratos] = await Promise.all([
    consultarMultas(id, opts),
    consultarAdjudicaciones(id, opts),
    consultarContratos(id, opts),
  ]);
  const cedulas = new Set();
  if (idn.tipo === "cedula") cedulas.add(id);
  if (representanteDeclarado && representanteDeclarado !== id) cedulas.add(representanteDeclarado);
  if (contratos.ok && contratos.representante_legal) cedulas.add(contratos.representante_legal.identificacion);
  const siri = await consultarSiri([...cedulas], opts);

  const nombre = (contratos.ok && contratos.nombre_en_dataset) || (multas.ok && multas.nombre_en_dataset) || null;
  return {
    ok: true,
    consultado_el: new Date(ahora).toISOString(),
    identificacion: { valor: id, tipo: idn.tipo, dv: idn.dv || null, nombre_en_secop: nombre,
      representante_legal: contratos.ok ? contratos.representante_legal : null,
      representante_declarado: representanteDeclarado,
      cedulas_consultadas_en_siri: [...cedulas] },
    semaforo: semaforo({ siri, multas, contratos }),
    fuentes: { siri, multas_secop1: multas, contratos_secop2: contratos, adjudicaciones_secop2: adjudicaciones },
    checklist: checklist({ siri, multas, contratos, adjudicaciones }),
    normas: NORMA,
    lectura: "Due diligence de 20 minutos antes de firmar un consorcio (manual del analista, truco #15): dos de las cinco fuentes se consultan solas desde datos abiertos; las otras tres hay que abrirlas. La app no emite veredicto: reúne lo público y dice dónde mirar.",
  };
}

module.exports = { verificarSocio, clasificarIdentificacion, agregarMultas, semaforo, checklist, FUENTES_MANUAL, NORMA, DATASETS };
