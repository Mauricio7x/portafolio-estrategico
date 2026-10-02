#!/usr/bin/env node
/* research/muestra_secop/seleccionar.js · Muestra aleatoria DOCUMENTADA de procesos de SECOP II
   ─────────────────────────────────────────────────────────────────────────────
   Uso: node research/muestra_secop/seleccionar.js <N> <semilla> [desde=2026-01-01] [--salida=ruta.json]
   Universo: p6dx-8zbt, tipo_de_contrato en (Obra, Interventoría, Consultoría), publicados desde
   `desde`, modalidades del Estatuto con informe de evaluación (licitación, selección abreviada de
   menor cuantía, concurso de méritos, mínima cuantía; fuera régimen especial y contratación directa),
   estado en (Seleccionado, Evaluación, Adjudicado). Un expediente = un `id_del_portafolio`.
   Orden aleatorio REPRODUCIBLE: sha256(semilla + "|" + id_del_portafolio), ascendente. Se recorre en
   ese orden y se toma el expediente si el índice de documentos dmgg-8hin trae al menos un archivo cuyo
   nombre contenga INFORME y EVALUA (el informe de evaluación publicado). Estratos: se exige al menos
   1 interventoría y 1 consultoría cuando N ≥ 5 (el resto, obra), para que la muestra pruebe los tres
   tipos del alcance (decisión D3 del dueño, 2-oct-2026). Sin dependencias; solo lee. No guarda nombres
   de personas: solo el número de proceso, la entidad y los hechos del proceso. */
"use strict";
const crypto = require("crypto");
const fs = require("fs");
const [N0, SEMILLA, ...resto] = process.argv.slice(2);
const N = parseInt(N0, 10);
if (!Number.isInteger(N) || N < 1 || !SEMILLA) { console.error("uso: node seleccionar.js <N> <semilla> [desde] [--salida=ruta]"); process.exit(2); }
const desde = resto.find((a) => !a.startsWith("--")) || "2026-01-01";
const salida = (resto.find((a) => a.startsWith("--salida=")) || "").replace("--salida=", "") || null;
const P6DX = "https://www.datos.gov.co/resource/p6dx-8zbt.json";
const DMGG = "https://www.datos.gov.co/resource/dmgg-8hin.json";
const TIPOS = ["Obra", "Interventoría", "Consultoría"];
const MODALIDADES = ["Licitación pública Obra Publica", "Licitación pública", "Selección Abreviada de Menor Cuantía",
  "Seleccion Abreviada Menor Cuantia Sin Manifestacion Interes", "Concurso de méritos abierto", "Concurso de méritos con precalificación", "Mínima cuantía"];
const ESTADOS = ["Seleccionado", "Evaluación", "Adjudicado"];
const lista = (xs) => xs.map((x) => `'${x.replace(/'/g, "''")}'`).join(",");
async function soql(base, params) {
  const u = new URL(base); for (const [k, v] of Object.entries(params)) u.searchParams.set(k, v);
  const r = await fetch(u, { headers: { accept: "application/json" }, signal: AbortSignal.timeout(90000) });
  if (!r.ok) throw new Error(`HTTP ${r.status} en ${u}`);
  return r.json();
}
(async () => {
  const where = `tipo_de_contrato in(${lista(TIPOS)}) AND modalidad_de_contratacion in(${lista(MODALIDADES)}) AND estado_del_procedimiento in(${lista(ESTADOS)}) AND fecha_de_publicacion_del >= '${desde}T00:00:00'`;
  const filas = await soql(P6DX, { $select: "id_del_portafolio,id_del_proceso,tipo_de_contrato,modalidad_de_contratacion,estado_del_procedimiento,entidad,nit_entidad,departamento_entidad,precio_base,fecha_de_publicacion_del,respuestas_al_procedimiento,urlproceso", $where: where, $limit: "50000", $order: "id_del_portafolio" });
  const porExpediente = new Map();
  for (const f of filas) { if (!f.id_del_portafolio) continue; const prev = porExpediente.get(f.id_del_portafolio); if (!prev || String(f.fecha_de_publicacion_del) > String(prev.fecha_de_publicacion_del)) porExpediente.set(f.id_del_portafolio, f); }
  const universo = [...porExpediente.values()];
  const hash = (id) => crypto.createHash("sha256").update(`${SEMILLA}|${id}`).digest("hex");
  universo.sort((a, b) => hash(a.id_del_portafolio).localeCompare(hash(b.id_del_portafolio)));
  /* Estratos (Fase 2, decisión D10 del dueño): cuatro grupos de modalidad a partes iguales y mínimos por
     tipo de contrato (interventoría y consultoría) que se llenan primero, en el mismo orden aleatorio. */
  const GRUPO = (m) => /Licitaci/i.test(m) ? "LP" : /Menor Cuantia|Menor Cuantía/i.test(m) ? "SAMC" : /M[ií]nima/i.test(m) ? "MC" : /m[eé]ritos/i.test(m) ? "CM" : "otro";
  const porGrupo = Math.floor(N / 4), resto = N - porGrupo * 4;
  const cupoGrupo = { LP: porGrupo + (resto > 0 ? 1 : 0), SAMC: porGrupo + (resto > 1 ? 1 : 0), MC: porGrupo + (resto > 2 ? 1 : 0), CM: porGrupo };
  const minimoTipo = N >= 20 ? { "Interventoría": Math.max(1, Math.round(N * 0.2)), "Consultoría": Math.max(1, Math.round(N * 0.2)) } : (N >= 5 ? { "Interventoría": 1, "Consultoría": 1 } : {});
  const tomados = []; const conteo = { Obra: 0, "Interventoría": 0, "Consultoría": 0 }; const porGrupoTomado = { LP: 0, SAMC: 0, MC: 0, CM: 0 }; let revisados = 0, sinInforme = 0;
  const verificados = new Map(); // id → docs (para no consultar dos veces en las dos pasadas)
  const informesDe = async (e) => {
    if (verificados.has(e.id_del_portafolio)) return verificados.get(e.id_del_portafolio);
    revisados++;
    const docs = await soql(DMGG, { $select: "id_documento,nombre_archivo,fecha_carga,url_descarga_documento", $where: `proceso='${e.id_del_portafolio}' AND upper(nombre_archivo) like '%INFORME%' AND upper(nombre_archivo) like '%EVALUA%'`, $limit: "20" });
    if (!docs.length) sinInforme++;
    verificados.set(e.id_del_portafolio, docs);
    return docs;
  };
  const tomar = (e, docs) => { conteo[e.tipo_de_contrato]++; porGrupoTomado[GRUPO(e.modalidad_de_contratacion)]++; tomados.push({ ...e, grupo_modalidad: GRUPO(e.modalidad_de_contratacion), informes_de_evaluacion: docs.map((d) => ({ id_documento: d.id_documento, nombre_archivo: d.nombre_archivo, fecha_carga: d.fecha_carga, url: d.url_descarga_documento })) }); };
  const tomadosIds = new Set();
  // pasada 1: mínimos por tipo
  for (const e of universo) {
    const faltan = Object.entries(minimoTipo).filter(([t, m]) => conteo[t] < m);
    if (!faltan.length || tomados.length >= N) break;
    const t = e.tipo_de_contrato, g = GRUPO(e.modalidad_de_contratacion);
    if (!(t in minimoTipo) || conteo[t] >= minimoTipo[t] || !(g in cupoGrupo) || porGrupoTomado[g] >= cupoGrupo[g]) continue;
    const docs = await informesDe(e); if (!docs.length) continue;
    tomar(e, docs); tomadosIds.add(e.id_del_portafolio);
  }
  // pasada 2: el resto, por grupo de modalidad
  for (const e of universo) {
    if (tomados.length >= N) break;
    if (tomadosIds.has(e.id_del_portafolio)) continue;
    const g = GRUPO(e.modalidad_de_contratacion);
    if (!(g in cupoGrupo) || porGrupoTomado[g] >= cupoGrupo[g]) continue;
    const docs = await informesDe(e); if (!docs.length) continue;
    tomar(e, docs); tomadosIds.add(e.id_del_portafolio);
  }
  if (false) {
    const e = null;
  }
  const res = { metodo: { fuente: P6DX, indice_documentos: DMGG, semilla: SEMILLA, desde, tipos: TIPOS, modalidades: MODALIDADES, estados: ESTADOS, orden: "sha256(semilla|id_del_portafolio) ascendente", estratos: { por_grupo_de_modalidad: cupoGrupo, minimo_por_tipo: minimoTipo }, fecha_consulta: new Date().toISOString() },
    universo: { filas: filas.length, expedientes: universo.length, por_grupo: universo.reduce((m, e) => (m[GRUPO(e.modalidad_de_contratacion)] = (m[GRUPO(e.modalidad_de_contratacion)] || 0) + 1, m), {}), por_tipo: universo.reduce((m, e) => (m[e.tipo_de_contrato] = (m[e.tipo_de_contrato] || 0) + 1, m), {}) },
    recorrido: { revisados, sin_informe_en_indice: sinInforme }, muestra: tomados };
  const texto = JSON.stringify(res, null, 2);
  if (salida) { fs.writeFileSync(salida, texto); console.log(`escrito ${salida}: ${tomados.length} procesos de ${universo.length} expedientes (revisados ${revisados}, sin informe ${sinInforme})`); }
  else console.log(texto);
})().catch((e) => { console.error("ERROR:", e.message); process.exit(1); });
