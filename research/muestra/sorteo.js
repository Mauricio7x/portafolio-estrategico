/* research/muestra/sorteo.js · El sorteo reproducible de la muestra de SECOP II
   ----------------------------------------------------------------------------
   Base de conocimiento de contratación estatal (encargo del 2-oct-2026). Escoge
   procesos de OBRA con informe de evaluación publicado, al azar pero de forma
   que cualquiera pueda repetir el sorteo y obtener la misma lista:

     1. UNIVERSO. Filas de `p6dx-8zbt` con tipo_de_contrato = 'Obra', modalidad
        del Estatuto General con competencia (licitación de obra, selección
        abreviada de menor cuantía con y sin manifestación, mínima cuantía),
        aviso publicado entre DESDE y HASTA, y estado «Seleccionado» o
        «Evaluación» (ya pasaron por la evaluación). Se deduplica por
        `id_del_portafolio`: SECOP II publica una fila por fase del mismo expediente.
     2. ORDEN. SHA-256 de `semilla + "|" + id_del_portafolio`, de menor a mayor.
        La semilla se publica; cambiarla es otro sorteo.
     3. FILTRO EN ORDEN. Se recorre la lista ordenada y se pregunta a `dmgg-8hin`
        por los archivos de cada expediente; entra el primero que tenga un archivo
        cuyo nombre diga «informe» y «evaluación». Se para al llegar a K.
        Los saltados se cuentan, no se esconden.

   No guarda nombres de archivo (pueden traer nombres de personas naturales) ni
   datos de proponentes: solo el número del proceso, la entidad pública, la
   modalidad, el presupuesto publicado y el id del documento del informe.
   La muestra del piloto son los K primeros; la muestra N sigue el mismo orden.

   ESTRATIFICADO (Fase 2, N = 100, decisión del dueño en el PC1): con el cuarto argumento
   «estratificado», el cupo se reparte por modalidad en proporción al universo
   (licitación · menor cuantía · mínima cuantía) y el filtro de nombre se amplía: entra
   un archivo que diga «evaluación», o «informe» junto a «verificación», «habilitante»
   o «requisitos». El orden y la semilla son los mismos, así que el piloto queda dentro.

   Uso: node research/muestra/sorteo.js [K] [semilla] [-] [estratificado] > salida.json
   Sin dependencias: fetch, crypto. */
"use strict";
const crypto = require("crypto");

const K = parseInt(process.argv[2], 10) || 5;
const SEMILLA = process.argv[3] || "detekta-ce-2026-10-02";
const DESDE = "2026-01-01T00:00:00.000";
const HASTA = "2026-09-30T23:59:59.999";
const MODALIDADES = [
  "Licitación pública Obra Publica",
  "Licitación pública",
  "Selección Abreviada de Menor Cuantía",
  "Seleccion Abreviada Menor Cuantia Sin Manifestacion Interes",
  "Mínima cuantía",
];
const ESTADOS = ["Seleccionado", "Evaluación"];
const P6DX = "https://www.datos.gov.co/resource/p6dx-8zbt.json";
const DMGG = "https://www.datos.gov.co/resource/dmgg-8hin.json";
const ES_INFORME = /informe/i;
const ES_EVALUACION = /evaluaci[oó]n|evaluacion/i;
const ESTRATIFICADO = process.argv[5] === "estratificado";
const esInformeAncho = (n) => /evaluaci[oó]n/i.test(n) || (/informe/i.test(n) && /verificaci[oó]n|habilitante|requisitos/i.test(n));
const estratoDe = (m) => /licitaci/i.test(m) ? "licitacion" : /menor cuant/i.test(m) ? "menor_cuantia" : "minima_cuantia";

const q = (s) => "'" + String(s).replace(/'/g, "''") + "'";

async function json(url) {
  for (let intento = 1; intento <= 4; intento++) {
    const r = await fetch(url);
    const texto = await r.text();                      // el parseo va aparte del fetch
    if (r.ok) { try { return JSON.parse(texto); } catch (e) { throw new Error(`respuesta no JSON de ${url.slice(0, 80)}: ${texto.slice(0, 120)}`); } }
    if (r.status === 400) throw new Error(`400 de ${url.slice(0, 120)}: ${texto.slice(0, 200)}`);
    await new Promise((res) => setTimeout(res, 1000 * 2 ** intento));
  }
  throw new Error(`sin respuesta tras 4 intentos: ${url.slice(0, 120)}`);
}

async function universo() {
  const where = [
    "tipo_de_contrato='Obra'",
    `modalidad_de_contratacion in (${MODALIDADES.map(q).join(",")})`,
    `estado_del_procedimiento in (${ESTADOS.map(q).join(",")})`,
    `fecha_de_publicacion_del between ${q(DESDE)} and ${q(HASTA)}`,
  ].join(" AND ");
  const campos = "id_del_portafolio,id_del_proceso,entidad,nit_entidad,departamento_entidad,modalidad_de_contratacion,estado_del_procedimiento,precio_base,fecha_de_publicacion_del,fecha_de_ultima_publicaci,:id";
  const filas = [];
  let ultimo = "";
  for (;;) {
    const w = ultimo ? `${where} AND :id > ${q(ultimo)}` : where;
    const url = `${P6DX}?$select=${encodeURIComponent(campos)}&$where=${encodeURIComponent(w)}&$order=:id&$limit=5000`;
    const lote = await json(url);
    filas.push(...lote);
    if (lote.length < 5000) break;
    ultimo = lote[lote.length - 1][":id"];
  }
  const porExpediente = new Map();
  for (const f of filas) {
    if (!f.id_del_portafolio) continue;
    const prev = porExpediente.get(f.id_del_portafolio);
    if (!prev || String(f.fecha_de_ultima_publicaci || "") > String(prev.fecha_de_ultima_publicaci || "")) porExpediente.set(f.id_del_portafolio, f);
  }
  return { filas: filas.length, expedientes: [...porExpediente.values()] };
}

async function main() {
  const { filas, expedientes } = await universo();
  const orden = expedientes
    .map((e) => ({ e, h: crypto.createHash("sha256").update(SEMILLA + "|" + e.id_del_portafolio).digest("hex") }))
    .sort((a, b) => (a.h < b.h ? -1 : a.h > b.h ? 1 : 0));
  const escogidos = [];
  let revisados = 0, sinInforme = 0;
  const tamEstrato = {};
  for (const e of expedientes) { const k = estratoDe(e.modalidad_de_contratacion); tamEstrato[k] = (tamEstrato[k] || 0) + 1; }
  const cupo = {};
  if (ESTRATIFICADO) { let asignado = 0; const ks = Object.keys(tamEstrato).sort(); for (const k of ks) { cupo[k] = Math.round(K * tamEstrato[k] / expedientes.length); asignado += cupo[k]; } const mayor = ks.sort((a, b) => tamEstrato[b] - tamEstrato[a])[0]; cupo[mayor] += K - asignado; }
  const llevados = {};
  for (const { e, h } of orden) {
    if (escogidos.length >= K) break;
    const est = estratoDe(e.modalidad_de_contratacion);
    if (ESTRATIFICADO && (llevados[est] || 0) >= cupo[est]) continue;
    revisados++;
    const url = `${DMGG}?$select=id_documento,nombre_archivo,fecha_carga&$where=${encodeURIComponent(`proceso=${q(e.id_del_portafolio)}`)}&$limit=2000`;
    const docs = await json(url);
    const informes = docs.filter((d) => ESTRATIFICADO ? esInformeAncho(d.nombre_archivo || "") : (ES_INFORME.test(d.nombre_archivo || "") && ES_EVALUACION.test(d.nombre_archivo || "")));
    if (!informes.length) { sinInforme++; continue; }
    llevados[est] = (llevados[est] || 0) + 1;
    escogidos.push({
      orden: escogidos.length + 1,
      estrato: est,
      hash: h.slice(0, 16),
      id_del_portafolio: e.id_del_portafolio,
      id_del_proceso: e.id_del_proceso,
      entidad: e.entidad,
      nit_entidad: e.nit_entidad,
      departamento_entidad: e.departamento_entidad,
      modalidad: e.modalidad_de_contratacion,
      estado: e.estado_del_procedimiento,
      precio_base: e.precio_base === undefined ? null : Number(e.precio_base),
      aviso: e.fecha_de_publicacion_del || null,
      archivos_del_expediente: docs.length,
      informes_de_evaluacion: informes.map((d) => ({ id_documento: d.id_documento, fecha_carga: d.fecha_carga })),
    });
  }
  const salida = {
    metodo: "SHA-256(semilla|id_del_portafolio) ascendente sobre el universo; entra el primero con informe de evaluación en dmgg-8hin",
    semilla: SEMILLA,
    consultado: new Date().toISOString(),
    universo: { desde: DESDE, hasta: HASTA, modalidades: MODALIDADES, estados: ESTADOS, filas_p6dx: filas, expedientes: expedientes.length },
    estratificado: ESTRATIFICADO, tam_estratos: tamEstrato, cupo: ESTRATIFICADO ? cupo : null, llevados,
    revisados_en_orden: revisados,
    saltados_sin_informe: sinInforme,
    escogidos,
  };
  process.stdout.write(JSON.stringify(salida, null, 2) + "\n");
}

main().catch((e) => { console.error("sorteo: " + e.message); process.exit(1); });
