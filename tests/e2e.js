/* ============================================================================
   tests/e2e · Ciclo completo sin red externa (este entorno no alcanza
   datos.gov.co): mock HTTP de Socrata + mock HTTP del REST de Upstash,
   ejercitando los HANDLERS REALES de /api de punta a punta.

     node tests/e2e.js            → 4 iteraciones (requisito del encargo)
     node tests/e2e.js 1          → 1 iteración (desarrollo)

   Cada iteración:
     a. Limpia Redis (SCAN licitaciones:* + lock:sync → DEL) y verifica vacío.
     a'. /api/oportunidades sobre Redis vacío → 503 con sincronización disparada.
     a''. Candado ocupado → /api/sync responde enCurso:true sin romper nada.
     b. /api/sync?modo=full con presupuesto CORTO (fuerza varias invocaciones
        reanudables) + fallos 429/500 inyectados en el mock → termina, crea
        chunks, audita conteos por mes y libera el candado.
     c. /api/oportunidades?perfil=helder → resultados con campos de negocio,
        filtro RUP, estado abierto y modalidad competitiva verificados.
     c-bis. Corpus completo Helder: sin Contratación Directa, sin Adjudicado,
        sin suministros puros (capa anti-suministro); la instalación/montaje
        (verbo de obra) y los Convocado sí aparecen.
     d. perfil=genesis&anticipo_min=25&cuantia_rango=medio&ordenar_por=puntaje
        → filtros aplicados y orden descendente verificado.
     d-bis. Consorcio: perfil=juntos y alias ?perfil=consorcio equivalentes;
        RUP del plural verificado (K = suma de integrantes).
     e. /api/sync/historico: protegido (sin token/token malo/sin variable),
        extracción reanudable de los 2 años anteriores con datos de
        adjudicación, y construcción automática del índice de competencia
        (tertiles verificados sobre 4 entidades mock: 5, 8, 12 y 3 procesos).
     f. Orden por atractividad: baja → media → sin_dato → alta (default de la
        app), desempate por puntaje, filtro competencia_entidad, y la garantía
        de que /api/oportunidades no lee del histórico ni expone adjudicaciones.
     g. Delta: fila nueva + cambio de estado a Adjudicado → la nueva aparece, la
        adjudicada desaparece del listado (reemplazo por :updated_at) y SE MUDA
        al histórico con su adjudicatario; la full de higiene no lo borra.
     h. La raíz sirve el HTML del frontend (gate + app) y app.js compila.
     i. (Documentado) Sin CLI de Vercel ni red: pruebas locales con mocks.
   ========================================================================== */
"use strict";

const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const assert = require("assert");

process.env.NODE_ENV = "production"; // silenciar logs de desarrollo en la corrida

/* ════════════════ dataset sintético determinista ════════════════ */
const ANO = new Date(Date.now() - 5 * 3600e3).getUTCFullYear();
const MESES = (() => {
  const mFin = new Date(Date.now() - 5 * 3600e3).getUTCMonth() + 1;
  return Array.from({ length: mFin }, (_, i) => `${ANO}-${String(i + 1).padStart(2, "0")}`);
})();

function generarDataset() {
  const filas = [];
  let n = 0;
  for (const mes of MESES) {
    for (let i = 0; i < 120; i++) {
      n++;
      const id = `row-${String(n).padStart(6, "0")}`;
      const tipo = i % 10;
      const f = {
        ":id": id,
        ":updated_at": `${mes}-05T12:00:00.000Z`, // viejo: no cae en el solape del delta
        id_del_proceso: `CO1.REQ.${n}`,
        referencia_del_proceso: `REF-${n}`,
        fecha_de_publicacion_del: `${mes}-10T08:00:00.000`,
        entidad: ["ALCALDÍA DE PURIFICACIÓN", "GOBERNACIÓN DEL TOLIMA", "IDU", "ALCALDÍA DE IBAGUÉ"][i % 4],
        ciudad_entidad: ["BOGOTÁ D.C.", "IBAGUÉ", "PURIFICACIÓN", "MEDELLÍN"][i % 4],
        departamento_entidad: ["Distrito Capital de Bogotá", "Tolima", "Tolima", "Antioquia"][i % 4],
        // modalidades: competitivas + no competitivas (deben filtrarse aunque
        // el objeto sea obra perfecta)
        modalidad_de_contratacion: i % 12 === 0 ? "Contratación directa"
          : i % 12 === 6 ? "Contratación régimen especial"
          : i % 3 ? "Licitación pública" : "Selección abreviada menor cuantía",
        // estados: cerrado (Adjudicado), abierto explícito (Convocado) y
        // Publicado. i%7 (coprimo con el i%4 de la cuantía): que los
        // Convocado caigan en cuantías variadas, no solo en las de 9 000 M
        estado_del_procedimiento: i % 8 === 7 ? "Adjudicado" : i % 7 === 3 ? "Convocado" : "Publicado",
        fase: "Presentación de ofertas",
        precio_base: String([60e6, 250e6, 800e6, 9e9][i % 4] + n),
        duracion: String(2 + (i % 6)), unidad_de_duracion: i % 2 ? "Meses" : "Días",
        respuestas_al_procedimiento: String(i % 20),
        urlproceso: { url: `https://community.secop.gov.co/Public/Tendering/OpportunityDetail/Index?noticeUID=CO1.NTC.${n}` },
        tipo_de_contrato: "Obra",
      };
      if (i % 5 === 0) f.fecha_de_recepcion_de = `${mes}-25T17:00:00.000`;
      else if (i % 5 === 1) f.fecha_limite_de_recepcion_respuestas = `${mes}-26T17:00:00.000`;
      // tipos de objeto: obra por código (helder/génesis/ambos), obra por texto,
      // blacklist y no-afines — para ejercitar todas las ramas del filtro RUP
      if (tipo <= 2) {
        f.nombre_del_procedimiento = `Construcción de placa huella sector ${n}`;
        f.descripci_n_del_procedimiento = `Obra civil de pavimentación rural, contempla anticipo del 30% del valor del contrato`;
        f.codigo_principal_de_categoria = "V1.72141000"; // en ambos RUP
      } else if (tipo === 3) {
        f.nombre_del_procedimiento = `Mantenimiento de vía terciaria tramo ${n}`;
        f.descripci_n_del_procedimiento = "Mejoramiento de la vía con placa huella. Sin anticipo.";
        f.codigo_principal_de_categoria = "V1.72154100"; // solo RUP Helder
      } else if (tipo === 4) {
        f.nombre_del_procedimiento = `Prestación de servicios de salud ocupacional ${n}`;
        f.descripci_n_del_procedimiento = "Servicios integrales de salud para funcionarios";
        f.codigo_principal_de_categoria = "V1.85101500"; // solo RUP Génesis
        // mitad con anticipo declarado BAJO el mínimo típico (10 < 25): el
        // filtro anticipo_min debe excluirlos de verdad, no vacuamente
        f.porcentaje_de_anticipo = i % 20 === 4 ? "10" : "25";
      } else if (tipo === 5) {
        f.nombre_del_procedimiento = `Adecuación de la sede educativa vereda ${n}`;
        f.descripci_n_del_procedimiento = "Remodelación y reforzamiento del aula múltiple"; // obra por TEXTO
        // sin código UNSPSC a propósito
      } else if (tipo === 6) {
        f.nombre_del_procedimiento = `Adquisición de caninos antinarcóticos lote ${n}`;
        f.descripci_n_del_procedimiento = "Compra de semovientes caninos con adiestramiento";
        f.codigo_principal_de_categoria = "V1.72141000"; // blacklist gana aunque el código sea de obra
      } else if (tipo === 7) {
        f.nombre_del_procedimiento = `Suministro de alimentación escolar PAE ${n}`;
        f.descripci_n_del_procedimiento = "Paquetes alimentarios para instituciones educativas";
      } else if (tipo === 8) {
        f.nombre_del_procedimiento = `Renovación de licencias de software ofimático ${n}`;
        f.descripci_n_del_procedimiento = "Adquisición de licencias microsoft para la entidad";
        f.codigo_principal_de_categoria = "V1.43231500"; // fuera de ambos RUP
      } else {
        // tipo 9: pareja ANTI-SUMINISTRO con el mismo código de mobiliario
        // (segmento 56, presente en el RUP de Helder): la compra pura debe
        // filtrarse; la instalación/montaje (verbo de obra) debe pasar.
        // Reparto por paridad de la DECENA de i → ambos casos existen en
        // TODOS los meses (también si la suite corre en enero). La compra
        // pura lleva cuantía 180 M a propósito: abierta, competitiva y
        // dentro del K de todos — si la capa fallara, SÍ se serviría (la
        // aserción negativa no puede pasar por razones ajenas a la capa).
        f.codigo_principal_de_categoria = "V1.56112000";
        if (Math.floor((i - 9) / 10) % 2 === 1) {
          f.nombre_del_procedimiento = `Suministro de mobiliario escolar ${n}`;
          f.descripci_n_del_procedimiento = "Compra de pupitres y sillas para sedes educativas";
          f.precio_base = "180000000";
        } else {
          f.nombre_del_procedimiento = `Instalación y montaje de mobiliario para aulas ${n}`;
          f.descripci_n_del_procedimiento = "Instalación de mobiliario escolar con obras de adecuación menores";
        }
      }
      filas.push(f);
    }
    filas.push(...extrasDelMes(mes));
  }
  return filas;
}

/* Casos que reproducen fallos reales de producción (una tanda por mes):
     1-2. CONVENIOS publicados bajo modalidad competitiva → NO deben salir.
     3.   Obra legítima que menciona un convenio de pasada → SÍ debe salir
          (guarda contra el falso positivo de excluir por la palabra suelta).
     4.   Obra con UNSPSC a nivel de PRODUCTO (72141015) dentro de una clase
          que sí está en el RUP (72141000) → SÍ debe salir. Con la comparación
          exacta de 8 dígitos anterior, este proceso era invisible. */
const EXTRAS_POR_MES = 4;
let _seqExtra = 0;
function extrasDelMes(mes) {
  const base = (n, extra) => ({
    ":id": `extra-${mes}-${n}`, ":updated_at": `${mes}-06T12:00:00.000Z`,
    id_del_proceso: `CO1.EXTRA.${mes}.${n}`, referencia_del_proceso: `REF-EXTRA-${mes}-${n}`,
    fecha_de_publicacion_del: `${mes}-12T08:00:00.000`,
    entidad: "ALCALDÍA DE PURIFICACIÓN", ciudad_entidad: "PURIFICACIÓN", departamento_entidad: "Tolima",
    modalidad_de_contratacion: "Licitación pública",
    estado_del_procedimiento: "Publicado", fase: "Presentación de ofertas",
    precio_base: "250000000", duracion: "6", unidad_de_duracion: "Meses",
    respuestas_al_procedimiento: "2", tipo_de_contrato: "Obra",
    urlproceso: { url: `https://community.secop.gov.co/extra/${mes}/${n}` },
    ...extra,
  });
  _seqExtra++;
  return [
    base(1, {
      // el caso del reporte: convenio colado por «Régimen Especial (con ofertas)»
      modalidad_de_contratacion: "Contratación régimen especial (con ofertas)",
      nombre_del_procedimiento: `AUNAR ESFUERZOS TÉCNICOS; ADMINISTRATIVOS Y FINANCIEROS PARA EL MEJORAMIENTO DE VÍAS ${_seqExtra}`,
      descripci_n_del_procedimiento: "Convenio para el mejoramiento de la malla vial del municipio",
      codigo_principal_de_categoria: "V1.72141000",
    }),
    base(2, {
      nombre_del_procedimiento: `CONVENIO INTERADMINISTRATIVO PARA LA CONSTRUCCIÓN DE PLACA HUELLA ${_seqExtra}`,
      descripci_n_del_procedimiento: "Construcción de placa huella en zona rural",
      codigo_principal_de_categoria: "V1.72141000",
    }),
    base(3, {
      nombre_del_procedimiento: `Construcción de placa huella vereda El Cairo ${_seqExtra}`,
      descripci_n_del_procedimiento: "Obra ejecutada en el marco del convenio interadministrativo 123 de 2025, incluye suministro de materiales",
      codigo_principal_de_categoria: "V1.72141000",
    }),
    base(4, {
      nombre_del_procedimiento: `Mejoramiento de vía terciaria con producto UNSPSC específico ${_seqExtra}`,
      descripci_n_del_procedimiento: "Obra civil de mejoramiento vial con pavimentación",
      codigo_principal_de_categoria: "V1.72141015", // producto de la clase 721410 (RUP: 72141000)
    }),
  ];
}

/* ════════════════ dataset histórico (2 años anteriores) ════════════════
   Cuatro entidades con distinta presión competitiva, diseñadas para caer una
   en cada tertil (y una por debajo del mínimo de procesos):
     ALCALDÍA DE PURIFICACIÓN   5 procesos · promedio  3 oferentes → "baja"
     GOBERNACIÓN DEL TOLIMA     8 procesos · promedio  8 oferentes → "media"
     IDU                       12 procesos · promedio 18 oferentes → "alta"
     ALCALDÍA DE IBAGUÉ         3 procesos (<5)                    → "sin_dato"
   Las cuatro existen también en el dataset del año vigente, así que el orden
   por atractividad tiene los cuatro grupos. El nº de oferentes viaja SOLO en
   `numero_de_ofertas`: si la proyección histórica no conservara esa columna,
   el índice quedaría vacío y estas pruebas fallarían. */
const ANOS_HIST = [ANO - 2, ANO - 1];
const MESES_HIST = ANOS_HIST.flatMap((y) => Array.from({ length: 12 }, (_, i) => `${y}-${String(i + 1).padStart(2, "0")}`));
const ENTIDADES_HIST = [
  { entidad: "ALCALDÍA DE PURIFICACIÓN", nit: "800100001", ofertas: [2, 3, 3, 4, 3] },
  { entidad: "GOBERNACIÓN DEL TOLIMA", nit: "800100002", ofertas: [7, 8, 9, 8, 7, 9, 8, 8] },
  { entidad: "IDU", nit: "800100003", ofertas: [16, 17, 18, 19, 18, 17, 20, 18, 19, 17, 18, 19] },
  { entidad: "ALCALDÍA DE IBAGUÉ", nit: "800100004", ofertas: [1, 2, 1] },
];
const PROMEDIO_ESPERADO = { "ALCALDÍA DE PURIFICACIÓN": 3, "GOBERNACIÓN DEL TOLIMA": 8, "IDU": 18 };

function generarDatasetHistorico() {
  const filas = [];
  let n = 0;
  for (const e of ENTIDADES_HIST) {
    for (let i = 0; i < e.ofertas.length; i++) {
      n++;
      const mes = MESES_HIST[(n * 5) % MESES_HIST.length]; // repartidos por todo el rango
      filas.push({
        ":id": `hist-${String(n).padStart(4, "0")}`,
        ":updated_at": `${mes}-20T10:00:00.000Z`,
        id_del_proceso: `CO1.HIST.${n}`, referencia_del_proceso: `REF-HIST-${n}`,
        fecha_de_publicacion_del: `${mes}-05T08:00:00.000`,
        entidad: e.entidad, nit_entidad: e.nit,
        ciudad_entidad: "IBAGUÉ", departamento_entidad: "Tolima",
        modalidad_de_contratacion: "Licitación pública",
        estado_del_procedimiento: "Adjudicado", fase: "Adjudicación", adjudicado: "Si",
        precio_base: String(200e6 + n),
        duracion: "6", unidad_de_duracion: "Meses",
        nombre_del_procedimiento: `Construcción de placa huella histórica ${n}`,
        descripci_n_del_procedimiento: "Obra civil de pavimentación rural ya ejecutada",
        codigo_principal_de_categoria: "V1.72141000", tipo_de_contrato: "Obra",
        // columnas de adjudicación (nombres pendientes de verificación en vivo)
        numero_de_ofertas: String(e.ofertas[i]),
        nombre_del_proveedor: `CONSTRUCTORA HIST ${n} SAS`,
        nit_del_proveedor_adjudicado: `90010${String(n).padStart(4, "0")}`,
        valor_total_adjudicacion: String(190e6 + n),
        fecha_adjudicacion: `${mes}-25T10:00:00.000`,
        urlproceso: { url: `https://community.secop.gov.co/hist/${n}` },
      });
    }
  }
  return filas;
}

/* ════════════════ mock Socrata (SoQL mínimo) ════════════════ */
function crearMockSocrata() {
  let dataset = [];
  let contadorPeticiones = 0;
  let inyectarFallos = true;

  const cumple = (fila, clausula) => {
    const m = clausula.match(/^(\S+)\s*(>=|<=|>|<)\s*'(.*)'$/);
    if (!m) throw new Error(`mock: clausula no soportada: ${clausula}`);
    const [, campo, op, valor] = m;
    const v = String(fila[campo] ?? "");
    if (op === ">=") return v >= valor;
    if (op === "<=") return v <= valor;
    if (op === ">") return v > valor;
    return v < valor;
  };

  const server = http.createServer((req, res) => {
    setTimeout(() => { // latencia simulada: fuerza el corte por presupuesto
      contadorPeticiones++;
      if (inyectarFallos && contadorPeticiones % 29 === 3) {
        res.writeHead(429, { "Retry-After": "0.05" }); return res.end("rate limited");
      }
      if (inyectarFallos && contadorPeticiones % 37 === 5) {
        res.writeHead(500); return res.end("upstream error");
      }
      const u = new URL(req.url, "http://x");
      const q = Object.fromEntries(u.searchParams);
      let filas = dataset.slice();
      if (q.$where) filas = filas.filter((f) => q.$where.split(" AND ").every((c) => cumple(f, c.trim())));
      if ((q.$select || "").startsWith("count(*)")) {
        res.writeHead(200, { "Content-Type": "application/json" });
        return res.end(JSON.stringify([{ n: String(filas.length) }]));
      }
      filas.sort((a, b) => (a[":id"] < b[":id"] ? -1 : 1));
      const offset = parseInt(q.$offset, 10) || 0;
      const limit = parseInt(q.$limit, 10) || 1000;
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(filas.slice(offset, offset + limit)));
    }, 15);
  });

  return {
    server,
    setDataset: (d) => { dataset = d; },
    getDataset: () => dataset,
    setFallos: (v) => { inyectarFallos = v; },
    peticiones: () => contadorPeticiones,
  };
}

/* ════════════════ mock Upstash Redis REST ════════════════ */
function crearMockUpstash() {
  const datos = new Map();   // clave → valor
  const hashes = new Map();  // clave → Map(campo → valor)  (índice de competencia)
  const expiras = new Map(); // clave → ts de expiración
  const viva = (k) => {
    if (expiras.has(k) && Date.now() > expiras.get(k)) { datos.delete(k); expiras.delete(k); }
    return datos.has(k);
  };
  const globRe = (p) => new RegExp("^" + p.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*") + "$");

  function ejecutar(cmd) {
    const op = String(cmd[0]).toUpperCase();
    switch (op) {
      case "GET": return viva(cmd[1]) ? datos.get(cmd[1]) : null;
      case "SET": {
        const [, k, v, ...resto] = cmd;
        const nx = resto.map((x) => String(x).toUpperCase()).includes("NX");
        if (nx && viva(k)) return null;
        datos.set(k, String(v));
        const iEx = resto.map((x) => String(x).toUpperCase()).indexOf("EX");
        if (iEx >= 0) expiras.set(k, Date.now() + parseInt(resto[iEx + 1], 10) * 1000);
        else expiras.delete(k);
        return "OK";
      }
      case "DEL": {
        let borradas = 0;
        for (const k of cmd.slice(1)) {
          if (viva(k) || hashes.has(k)) borradas++;
          datos.delete(k); expiras.delete(k); hashes.delete(k);
        }
        return borradas;
      }
      case "MGET": return cmd.slice(1).map((k) => (viva(k) ? datos.get(k) : null));
      case "TTL": {
        const k = cmd[1];
        if (!viva(k) && !hashes.has(k)) return -2;          // no existe
        if (!expiras.has(k)) return -1;                      // sin expiración
        return Math.max(0, Math.ceil((expiras.get(k) - Date.now()) / 1000));
      }
      case "EXISTS": return viva(cmd[1]) || hashes.has(cmd[1]) ? 1 : 0;
      case "SCAN": {
        const iMatch = cmd.map((x) => String(x).toUpperCase()).indexOf("MATCH");
        const re = globRe(cmd[iMatch + 1]);
        const claves = [...datos.keys()].filter((k) => viva(k) && re.test(k))
          .concat([...hashes.keys()].filter((k) => re.test(k)));
        return ["0", claves];
      }
      /* ---- hashes: el índice de competencia por entidad ---- */
      case "HSET": {
        const [, k, ...resto] = cmd;
        const h = hashes.get(k) || new Map();
        for (let i = 0; i + 1 < resto.length; i += 2) h.set(String(resto[i]), String(resto[i + 1]));
        hashes.set(k, h);
        return Math.floor(resto.length / 2);
      }
      case "HGETALL": {
        const h = hashes.get(cmd[1]);
        if (!h) return [];
        const plano = [];
        for (const [f, v] of h) plano.push(f, v);
        return plano; // Upstash devuelve el array plano [campo, valor, …]
      }
      case "HGET": {
        const h = hashes.get(cmd[1]);
        return h && h.has(cmd[2]) ? h.get(cmd[2]) : null;
      }
      case "HLEN": return hashes.has(cmd[1]) ? hashes.get(cmd[1]).size : 0;
      case "RENAME": {
        const [, de, a] = cmd;
        if (hashes.has(de)) { hashes.set(a, hashes.get(de)); hashes.delete(de); return "OK"; }
        if (viva(de)) { datos.set(a, datos.get(de)); datos.delete(de); expiras.delete(de); return "OK"; }
        throw new Error("ERR no such key"); // como Redis: RENAME de clave inexistente falla
      }
      default: throw new Error(`mock redis: comando no soportado ${op}`);
    }
  }

  const server = http.createServer((req, res) => {
    let cuerpo = "";
    req.on("data", (c) => { cuerpo += c; });
    req.on("end", () => {
      try {
        const r = ejecutar(JSON.parse(cuerpo));
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ result: r }));
      } catch (e) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: String(e.message) }));
      }
    });
  });
  return { server, tamano: () => datos.size + hashes.size };
}

/* ════════════════ invocador de handlers estilo Vercel ════════════════ */
function invocar(handler, urlStr, headers = {}) {
  const u = new URL(urlStr, "http://app.local");
  const req = {
    url: urlStr, method: "GET",
    headers: { host: "app.local", "x-forwarded-proto": "https", ...headers },
    query: Object.fromEntries(u.searchParams),
  };
  return new Promise((resolve, reject) => {
    const res = {
      _status: 200,
      setHeader() {},
      status(n) { this._status = n; return this; },
      json(o) { resolve({ status: this._status, cuerpo: o }); },
      send(b) { resolve({ status: this._status, cuerpo: b }); },
      end() { resolve({ status: this._status, cuerpo: null }); },
    };
    Promise.resolve(handler(req, res)).catch(reject);
  });
}

const escuchar = (server) => new Promise((r) => server.listen(0, "127.0.0.1", () => r(server.address().port)));

/* ════════════════ pruebas ════════════════ */
async function main() {
  const objetivo = parseInt(process.argv[2], 10) || 4;
  const socrata = crearMockSocrata();
  const upstash = crearMockUpstash();
  const puertoSocrata = await escuchar(socrata.server);
  const puertoUpstash = await escuchar(upstash.server);

  process.env.SECOP_BASE_URL = `http://127.0.0.1:${puertoSocrata}/resource/p6dx-8zbt.json`;
  process.env.UPSTASH_REDIS_REST_URL = `http://127.0.0.1:${puertoUpstash}`;
  process.env.UPSTASH_REDIS_REST_TOKEN = "token-de-prueba";
  process.env.SECOP_PAGE = "50";       // páginas chicas → ejercita keyset multi-página
  process.env.SECOP_BACKOFF_MS = "10"; // backoff rápido en el mock
  process.env.HISTORICO_TOKEN = "token-historico-de-prueba";

  // requerir DESPUÉS de fijar el entorno (PAGE/backoff se leen al cargar)
  const sync = require("../api/sync.js");
  const historico = require("../api/sync/historico.js");
  const diagnostico = require("../api/diagnostico.js");
  const oportunidades = require("../api/oportunidades.js");
  const { crearRedis } = require("../lib/redis.js");
  const { empaquetar, descomprimir, CHUNK_MAX_COMPRIMIDO, CLAVES } = require("../lib/almacen.js");
  const indiceComp = require("../lib/indice_competencia.js");
  const { rup_valido } = require("../lib/rup.js");
  const filtros = require("../lib/filtros.js");
  const capacidad = require("../lib/capacidad.js");
  const { PERFILES } = require("../lib/perfiles.js");
  const redis = crearRedis({});

  /* unidad: el empaquetador respeta los 500 KB comprimidos y no pierde filas */
  {
    const grandes = Array.from({ length: 9000 }, (_, i) => ({ _k: `k${i}`, blob: crypto.randomBytes(120).toString("hex") }));
    const paquetes = empaquetar(grandes);
    assert.ok(paquetes.length > 1, "empaquetar debe partir lotes grandes");
    for (const p of paquetes) assert.ok(Buffer.byteLength(p, "base64") <= CHUNK_MAX_COMPRIMIDO, "chunk sobre el límite de 500 KB");
    const vueltas = paquetes.flatMap((p) => descomprimir(p));
    assert.strictEqual(vueltas.length, grandes.length, "el empaquetador perdió filas");
    console.log(`· unidad empaquetar: ${paquetes.length} chunks ≤500 KB, ${vueltas.length} filas conservadas`);
  }

  /* unidad: la detección de anticipo no cruza frases ni ignora negaciones */
  {
    const { enriquecer } = require("../lib/negocio.js");
    const casos = [
      ["NO SE PAGARA ANTICIPO NI PAGO ANTICIPADO. FORMA DE PAGO: ACTAS PARCIALES DEL 90% del valor", 0],
      ["No se pagara anticipo. Garantia de cumplimiento del 10 % del valor", 0],
      ["No se contempla anticipo para este proceso", 0],
      ["El contrato contempla anticipo del 30% del valor", 30],
      ["Anticipo: 50% contra acta de inicio", 50],
      ["Se entregará un 20 % en calidad de anticipo", 20],
      ["Obra de pavimentación sin mención alguna", 0],
    ];
    for (const [texto, esperado] of casos) {
      const l = enriquecer({ nombre_del_procedimiento: "x", descripci_n_del_procedimiento: texto, precio_base: "1" });
      assert.strictEqual(l.anticipo_pct, esperado, `anticipo de «${texto}» → ${l.anticipo_pct}, esperaba ${esperado}`);
    }
    console.log(`· unidad anticipo: ${casos.length} casos de texto correctos (negaciones y cruces de frase)`);
  }

  /* unidad: estados canónicos — desconocido = CERRADO, sin fallback optimista */
  {
    const casos = [
      [{ estado_del_procedimiento: "Convocado" }, true],
      [{ estado_del_procedimiento: "Presentación de oferta" }, true],
      [{ estado_del_procedimiento: "Presentación de ofertas" }, true], // variante real
      [{ estado_del_procedimiento: "Borrador" }, true],                // prefijo de "Borrador de pliegos"
      [{ estado_del_procedimiento: "Publicado", fase: "Presentación de ofertas" }, true],
      [{ estado_del_procedimiento: "Adjudicado" }, false],
      [{ estado_del_procedimiento: "En evaluación" }, false],
      [{ estado_del_procedimiento: "Evaluación de ofertas" }, false],
      [{ estado_del_procedimiento: "Declarado desierto" }, false],
      [{ estado_del_procedimiento: "Publicado", adjudicado: "Si" }, false], // señal dura gana
      [{ estado_del_procedimiento: "Publicado", fase: "Ejecución" }, false], // cerrado gana
      [{ estado_del_procedimiento: "Estado rarísimo nuevo" }, false],  // desconocido = cerrado
      [{}, false],                                                     // sin dato = cerrado
    ];
    for (const [lic, esperado] of casos) {
      assert.strictEqual(filtros.estado_abierto(lic), esperado,
        `estado_abierto(${JSON.stringify(lic)}) esperaba ${esperado}`);
    }
    console.log(`· unidad estados: ${casos.length} clasificaciones correctas (desconocido = cerrado)`);
  }

  /* unidad: modalidades — solo lista blanca competitiva */
  {
    const casos = [
      ["Licitación pública", true],
      ["Licitación pública Obra Publica", true],
      ["Selección Abreviada de Menor Cuantía (Ley 1150 de 2007)", true],
      ["Mínima cuantía", true],
      ["Subasta", true],
      ["Concurso de méritos abierto", true],
      ["Licitación Pública Acuerdo Marco de Precios", true],
      ["Contratación régimen especial (con ofertas)", true], // hay convocatoria
      ["Contratación directa", false],
      ["Contratación directa (con ofertas)", false],         // sigue siendo directa
      ["Contratación régimen especial", false],
      ["Licitación privada", false],
      ["Solicitud de información a los Proveedores", false],
      ["Enajenación de bienes con Subasta", false], // venta de activos, no obra
      ["Enajenación de bienes con Sobre Cerrado", false],
      ["", false],                                           // sin dato = fuera
      ["Modalidad desconocida", false],
    ];
    for (const [m, esperado] of casos) {
      assert.strictEqual(filtros.modalidad_competitiva({ modalidad_de_contratacion: m }), esperado,
        `modalidad_competitiva(«${m}») esperaba ${esperado}`);
    }
    console.log(`· unidad modalidades: ${casos.length} clasificaciones correctas (lista blanca)`);
  }

  /* unidad: capa anti-suministro sobre segmentos de bienes. Cada caso se
     evalúa contra un perfil cuyo RUP SÍ contiene la clase — así el rechazo
     solo puede venir de la capa (se verifica anti_suministro como causa). */
  {
    const casos = [ // [licitación, perfil con la clase en su RUP, ¿pasa?]
      // compra pura con el quinteto vigilado histórico (56, 43) → fuera
      [{ nombre_del_procedimiento: "Suministro de mobiliario escolar", descripci_n_del_procedimiento: "Compra de pupitres", codigo_principal_de_categoria: "V1.56112000" }, "helder", false],
      [{ nombre_del_procedimiento: "Adquisición de equipos de cómputo", descripci_n_del_procedimiento: "Compra de estaciones", codigo_principal_de_categoria: "V1.43211700" }, "helder", false],
      // segmentos de bienes FUERA del quinteto histórico 30/39/43/48/56:
      // tubería (40, el bloque más grande del RUP de Génesis) y herramientas (27)
      [{ nombre_del_procedimiento: "Suministro de tubería y accesorios en PVC", descripci_n_del_procedimiento: "Para la red de acueducto municipal", codigo_principal_de_categoria: "V1.40171500" }, "genesis", false],
      [{ nombre_del_procedimiento: "Adquisición de herramientas menores", descripci_n_del_procedimiento: "Ferretería para la entidad", codigo_principal_de_categoria: "V1.27111500" }, "genesis", false],
      // redacciones reales de compra: "compraventa de" y plurales
      [{ nombre_del_procedimiento: "Compraventa de equipos de cómputo", descripci_n_del_procedimiento: "Para las sedes educativas", codigo_principal_de_categoria: "V1.43211700" }, "helder", false],
      [{ nombre_del_procedimiento: "Suministros de mobiliario escolar", descripci_n_del_procedimiento: "Pupitres y sillas", codigo_principal_de_categoria: "V1.56112000" }, "helder", false],
      // mismo segmento pero con verbo de obra → pasa
      [{ nombre_del_procedimiento: "Instalación y montaje de mobiliario", descripci_n_del_procedimiento: "Con obras de adecuación", codigo_principal_de_categoria: "V1.56112000" }, "helder", true],
      [{ nombre_del_procedimiento: "Suministro e instalación de tubería PVC", descripci_n_del_procedimiento: "Optimización de la red de acueducto", codigo_principal_de_categoria: "V1.40171500" }, "genesis", true],
      // código de obra (72) ancla el proceso aunque haya verbo de compra → pasa
      [{ nombre_del_procedimiento: "Construcción de aula y suministro de materiales", descripci_n_del_procedimiento: "Obra e insumos", codigo_principal_de_categoria: "V1.72141000 V1.30111500" }, "helder", true],
    ];
    for (const [lic, perfilId, esperado] of casos) {
      const ev = filtros.evaluarObjeto(lic, PERFILES[perfilId]);
      assert.strictEqual(ev.ok, esperado,
        `objeto_valido(«${lic.nombre_del_procedimiento}», ${perfilId}) esperaba ${esperado} (motivo: ${ev.motivo})`);
      if (!esperado) {
        assert.strictEqual(ev.anti_suministro, true,
          `«${lic.nombre_del_procedimiento}» debía caer por la CAPA anti-suministro, cayó por: ${ev.motivo}`);
      }
    }
    console.log(`· unidad anti-suministro: ${casos.length} casos correctos (segmentos de bienes, causa verificada)`);
  }

  /* unidad: convenios — «aunar esfuerzos» y compañía NO son licitaciones */
  {
    const convenios = [
      "AUNAR ESFUERZOS TÉCNICOS; ADMINISTRATIVOS Y FINANCIEROS PARA EL MEJORAMIENTO DE VÍAS",
      "AUNAR ESFUERZOS TECNICOS ADMINISTRATIVOS Y FINANCIEROS",
      "Aunar recursos para la construcción de un parque",
      "CONVENIO INTERADMINISTRATIVO PARA LA CONSTRUCCIÓN DE PLACA HUELLA",
      "Convenio de cooperación internacional para infraestructura educativa",
      "CONVENIO MARCO DE APOYO A LA GESTIÓN VIAL",
      "Contrato interadministrativo para la ejecución de obras",
      "Convenio de asociación con entidad sin ánimo de lucro para obras",
    ];
    for (const nombre of convenios) {
      assert.strictEqual(filtros.es_convenio({ nombre_del_procedimiento: nombre }), true,
        `«${nombre.slice(0, 50)}…» debía clasificarse como convenio`);
    }
    // …y la obra REAL que solo menciona un convenio de pasada NO es un convenio
    const obrasLegitimas = [
      { nombre_del_procedimiento: "Construcción de placa huella vereda El Cairo",
        descripci_n_del_procedimiento: "Obra ejecutada en el marco del convenio interadministrativo 123 de 2025" },
      { nombre_del_procedimiento: "Mejoramiento de vía terciaria",
        descripci_n_del_procedimiento: "Recursos provenientes del contrato interadministrativo suscrito con la gobernación" },
      { nombre_del_procedimiento: "Mantenimiento de la red de alcantarillado" },
    ];
    for (const l of obrasLegitimas) {
      assert.strictEqual(filtros.es_convenio(l), false,
        `«${l.nombre_del_procedimiento}» NO es un convenio: mencionarlo no lo convierte en uno`);
    }
    // el convenio muere en evaluarObjeto, con motivo propio y ANTES que todo
    const ev = filtros.evaluarObjeto({
      nombre_del_procedimiento: "AUNAR ESFUERZOS TÉCNICOS; ADMINISTRATIVOS Y FINANCIEROS",
      descripci_n_del_procedimiento: "Mejoramiento de vías",
      codigo_principal_de_categoria: "V1.72141000",
    }, PERFILES.helder);
    assert.strictEqual(ev.ok, false);
    assert.strictEqual(ev.paso, "convenio", `el convenio debía morir en el paso «convenio», murió en «${ev.paso}»`);
    console.log(`· unidad convenios: ${convenios.length} excluidos, ${obrasLegitimas.length} obras legítimas conservadas`);
  }

  /* unidad: UNSPSC por CLASE, no por producto. Los 393 códigos de los RUP
     terminan en "00" (nivel de clase); SECOP II publica muchas veces el
     producto. La comparación exacta de 8 dígitos los hacía invisibles. */
  {
    assert.ok([...PERFILES.juntos.unspsc].every((c) => c.endsWith("00")),
      "supuesto roto: los códigos del RUP ya no están a nivel de clase");
    const conProducto = {
      nombre_del_procedimiento: "Mejoramiento de vía terciaria",
      descripci_n_del_procedimiento: "Obra civil de pavimentación",
      codigo_principal_de_categoria: "V1.72141015", // producto de la clase 721410
    };
    assert.strictEqual(PERFILES.helder.unspsc.has("72141015"), false,
      "el código de producto NO está literalmente en el RUP (esa es la premisa)");
    assert.strictEqual(filtros.evaluarObjeto(conProducto, PERFILES.helder).ok, true,
      "un producto de una clase inscrita en el RUP debe quedar cubierto");
    // y una clase realmente ajena sigue fuera
    const ajeno = { ...conProducto, codigo_principal_de_categoria: "V1.53102700" }; // ropa
    assert.strictEqual(filtros.evaluarObjeto(ajeno, PERFILES.helder).ok, false,
      "una clase fuera del RUP no puede colarse por la comparación por clase");
    assert.strictEqual(filtros.claseDe("72141015"), "721410");
    console.log("· unidad UNSPSC: match por clase (6 díg) cubre productos; las clases ajenas siguen fuera");
  }

  /* unidad: anti-suministro — bloquea la compra pura, jamás la obra que
     además compra materiales (los dos casos exactos del encargo) */
  {
    const casos = [
      ["CONSTRUCCIÓN DE AULA ESCOLAR INCLUYENDO SUMINISTRO DE MOBILIARIO", "V1.56112000", true],
      ["SUMINISTRO DE MOBILIARIO ESCOLAR", "V1.56112000", false],
      ["Construcción de vía incluyendo suministro de materiales", "V1.30111500", true],
      ["Ejecución de obras de acueducto con suministro de tubería", "V1.40171500", true],
      ["Adecuación de sede con adquisición de equipos", "V1.43211700", true],
      ["Adquisición de equipos de cómputo", "V1.43211700", false],
    ];
    for (const [nombre, codigo, esperado] of casos) {
      const ev = filtros.evaluarObjeto(
        { nombre_del_procedimiento: nombre, descripci_n_del_procedimiento: "", codigo_principal_de_categoria: codigo },
        PERFILES.juntos);
      assert.strictEqual(ev.ok, esperado,
        `«${nombre}» esperaba ${esperado ? "PASAR" : "caer"}, motivo: ${ev.motivo}`);
      if (!esperado) assert.strictEqual(ev.paso, "anti_suministro", `«${nombre}» debía caer por la capa anti-suministro`);
    }
    console.log(`· unidad anti-suministro (obra vs compra pura): ${casos.length} casos correctos`);
  }

  /* unidad: capacidad — fórmula única, escalas de la Guía y consorcio */
  {
    // una sola implementación para toda la app (web y cron llegan a la misma función)
    assert.strictEqual(require("../lib/rup.js").kContratacion, capacidad.crp,
      "rup.kContratacion debe SER capacidad.crp (fórmula única)");
    // escalas con >= en los cortes exactos
    assert.strictEqual(capacidad.factorE(3, 1), 120);
    assert.strictEqual(capacidad.factorE(2, 1), 100);
    assert.strictEqual(capacidad.factorE(1, 1), 80);
    assert.strictEqual(capacidad.factorE(0.9, 1), 60);
    assert.strictEqual(capacidad.factorCT(11), 40);
    assert.strictEqual(capacidad.factorCT(6), 30);
    assert.strictEqual(capacidad.factorCT(1), 20);
    assert.strictEqual(capacidad.factorCF(1.5), 40);
    assert.strictEqual(capacidad.factorCF(1.2), 30);
    assert.strictEqual(capacidad.factorCF(1.0), 20);
    assert.strictEqual(capacidad.factorCF(0.9), 0);
    // CRPC oficial: directo con plazo ≤12, proporcional lineal si >12
    assert.strictEqual(capacidad.calcCRPC(1000e6, 30, 6), 700e6);
    assert.strictEqual(capacidad.calcCRPC(1000e6, 30, 24), 350e6);
    // CRP de Helder a mano: CO = 198 810 000 × 16.7 = 3 320 127 000;
    // presupuesto 300M → 171,34 SMMLV; exp 6768,87/171,34 ≥ 3 → E=120;
    // CT(1)=20, CF(129,12)=40; SCE = 443 141 528×0,6×8/12 = 177 256 611,2
    // → CRP = 3 320 127 000×1,80 − 177 256 611,2 = 5 798 971 988,8
    assert.strictEqual(Math.round(capacidad.crp(PERFILES.helder, 300e6)), 5798971989);
    // consorcio = SUMA de las CRP de los integrantes (Guía CCE), no ponderado
    const p = 300e6;
    assert.ok(Math.abs(capacidad.crp(PERFILES.juntos, p)
      - (capacidad.crp(PERFILES.helder, p) + capacidad.crp(PERFILES.genesis, p))) < 1e-6,
      "CRP del consorcio debe ser la suma de las CRP de los integrantes");
    // indicadores habilitantes del consorcio ponderados 50/50 (calculados)
    assert.ok(Math.abs(PERFILES.juntos.liquidez - 68.05) < 1e-9, "liquidez ponderada 50/50");
    assert.strictEqual(PERFILES.juntos.patrimonio, Math.round((1107252964 + 211340888) / 2));
    assert.strictEqual(PERFILES.juntos.utilidadOp, Math.round((198810000 + 150244977) / 2));
    // el CO estimado se declara (el RUP no trae ingreso operacional)
    assert.strictEqual(capacidad.coEstimado(PERFILES.helder), true);
    assert.strictEqual(capacidad.coEstimado(PERFILES.juntos), true);
    console.log("· unidad capacidad: fórmula única, escalas de la Guía, CRPC y consorcio (suma) correctos");
  }

  /* unidad: tertiles, mediana y lectura de oferentes/adjudicación del índice */
  {
    // seis entidades: los cortes deben repartirlas 2/2/2 y respetar empates
    const cortes = indiceComp.cortesTertiles([2, 3, 8, 8, 18, 20]);
    assert.strictEqual(indiceComp.nivelPorCortes(2, cortes), "baja");
    assert.strictEqual(indiceComp.nivelPorCortes(3, cortes), "baja");
    assert.strictEqual(indiceComp.nivelPorCortes(8, cortes), "media", "los empates deben caer en el mismo nivel");
    assert.strictEqual(indiceComp.nivelPorCortes(18, cortes), "alta");
    assert.strictEqual(indiceComp.nivelPorCortes(20, cortes), "alta");
    // tres entidades (el caso del encargo): una por tertil
    const c3 = indiceComp.cortesTertiles([3, 8, 18]);
    assert.deepStrictEqual([3, 8, 18].map((p) => indiceComp.nivelPorCortes(p, c3)), ["baja", "media", "alta"]);
    // todas iguales: ninguna destaca → "media" (jamás todas "baja")
    const cIguales = indiceComp.cortesTertiles([5, 5, 5]);
    assert.strictEqual(indiceComp.nivelPorCortes(5, cIguales), "media");
    // mediana desde histograma, par e impar
    assert.strictEqual(indiceComp.medianaHistograma({ 2: 1, 3: 3, 4: 1 }, 5), 3);
    assert.strictEqual(indiceComp.medianaHistograma({ 7: 2, 8: 4, 9: 2 }, 8), 8);
    assert.strictEqual(indiceComp.medianaHistograma({ 1: 1, 5: 1 }, 2), 3);
    // 0 oferentes = SIN DATO (hueco del dataset), no "nadie se presentó"
    assert.strictEqual(indiceComp.oferentesDe({ numero_de_ofertas: "0" }), null);
    assert.strictEqual(indiceComp.oferentesDe({ numero_de_ofertas: "4" }), 4);
    assert.strictEqual(indiceComp.oferentesDe({ proveedores_unicos_con: "9" }), 9);
    assert.strictEqual(indiceComp.oferentesDe({}), null);
    // evidencia de adjudicación
    assert.strictEqual(indiceComp.esAdjudicado({ adjudicado: "Si" }), true);
    assert.strictEqual(indiceComp.esAdjudicado({ nombre_del_proveedor: "X SAS" }), true);
    assert.strictEqual(indiceComp.esAdjudicado({ estado_del_procedimiento: "Celebrado" }), true);
    assert.strictEqual(indiceComp.esAdjudicado({ estado_del_procedimiento: "Publicado" }), false);
    // la entidad se identifica igual con y sin NIT
    assert.strictEqual(indiceComp.claveEntidad({ entidad: "ALCALDÍA DE PURIFICACIÓN" }).clave,
      indiceComp.claveEntidad({ entidad: "Alcaldia de Purificacion", nit_entidad: "800100001" }).clave);
    console.log("· unidad índice de competencia: tertiles con empates, mediana, oferentes 0 = sin dato");
  }

  async function limpiarRedis() {
    const claves = [
      ...(await redis.scan("licitaciones:*")), ...(await redis.scan("lock:sync*")),
      ...(await redis.scan("indice:*")), ...(await redis.scan("sync:historico:*")),
    ];
    if (claves.length) await redis.del(...claves);
    for (const patron of ["licitaciones:*", "indice:*", "sync:historico:*"]) {
      assert.strictEqual((await redis.scan(patron)).length, 0, `Redis no quedó limpio: ${patron}`);
    }
  }

  /* Todos los registros del corpus histórico, leídos como los leería el índice. */
  async function leerHistorico() {
    const claves = await redis.scan(CLAVES.patronChunksHist);
    const filas = [];
    for (const b of await redis.mget(claves)) for (const r of (descomprimir(b) || [])) filas.push(r);
    return filas;
  }
  async function leerActivo() {
    const claves = await redis.scan(CLAVES.patronChunks);
    const filas = [];
    for (const b of await redis.mget(claves)) for (const r of (descomprimir(b) || [])) filas.push(r);
    return filas;
  }

  async function todasLasOportunidades(params) {
    const filas = [];
    for (let pag = 1; pag < 50; pag++) {
      const r = await invocar(oportunidades, `/api/oportunidades?${params}&por_pagina=100&pagina=${pag}`);
      assert.strictEqual(r.status, 200, `esperaba 200, llegó ${r.status}: ${JSON.stringify(r.cuerpo).slice(0, 200)}`);
      filas.push(...r.cuerpo.resultados);
      if (filas.length >= r.cuerpo.total) break;
    }
    return filas;
  }

  async function iteracion(n) {
    const t0 = Date.now();
    // el dataset trae el año vigente Y los dos anteriores: la full solo debe
    // ver el vigente (consulta mes a mes del año en curso)
    socrata.setDataset([...generarDataset(), ...generarDatasetHistorico()]);
    socrata.setFallos(true);

    /* a. limpiar Redis */
    await limpiarRedis();

    /* a'. Redis vacío → 503 con mensaje de sincronización */
    {
      const r = await invocar(oportunidades, "/api/oportunidades?perfil=helder");
      assert.strictEqual(r.status, 503, "sin datos debía responder 503");
      assert.ok(/Sincronizaci[oó]n iniciada/.test(r.cuerpo.error), `mensaje 503 inesperado: ${r.cuerpo.error}`);
      assert.strictEqual(r.cuerpo.ok, false);
    }

    /* a''. candado ocupado → enCurso, sin tocar datos */
    {
      await redis.set("lock:sync", "otro-proceso", { nx: true, ex: 60 });
      const r = await invocar(sync, "/api/sync?modo=full&chain=0");
      assert.strictEqual(r.cuerpo.enCurso, true, "con candado ajeno debía responder enCurso");
      await redis.del("lock:sync");
    }

    /* b. carga completa con presupuesto corto (reanudable) + fallos inyectados */
    let r = await invocar(sync, "/api/sync?modo=full&presupuesto=150&chain=0");
    assert.strictEqual(r.status, 200);
    assert.strictEqual(r.cuerpo.ok, true, `sync full falló: ${JSON.stringify(r.cuerpo)}`);
    let invocaciones = 1;
    while (r.cuerpo.done === false) {
      r = await invocar(sync, "/api/sync?modo=auto&presupuesto=150&chain=0");
      assert.strictEqual(r.cuerpo.ok, true, `continuación falló: ${JSON.stringify(r.cuerpo)}`);
      if (++invocaciones > 400) throw new Error("la carga completa no converge");
    }
    assert.ok(invocaciones >= 2, "el presupuesto corto debía forzar varias invocaciones (reanudable)");
    const chunks = await redis.scan(CLAVES.patronChunks);
    assert.ok(chunks.length >= MESES.length, `esperaba ≥${MESES.length} chunks activos, hay ${chunks.length}`);
    assert.strictEqual((await redis.scan(CLAVES.patronChunksHist)).length, 0,
      "la full NO debe escribir en el corpus histórico");
    assert.ok(!chunks.some((k) => ANOS_HIST.some((y) => k.includes(`:mes:${y}-`))),
      "la full del año vigente se llevó meses de años anteriores");
    const meta = JSON.parse(await redis.get("licitaciones:meta"));
    assert.ok(meta.last_full && meta.last_sync, "meta sin sellos de sincronización");
    assert.strictEqual(Object.keys(meta.porMes).length, MESES.length, "faltan meses en la auditoría");
    const POR_MES = 120 + EXTRAS_POR_MES;
    for (const mes of MESES) {
      assert.strictEqual(meta.porMes[mes].leidas, POR_MES, `${mes}: leídas ${meta.porMes[mes].leidas} ≠ ${POR_MES} esperadas`);
      assert.strictEqual(meta.porMes[mes].esperados, POR_MES, `${mes}: count(*) no auditado`);
    }
    assert.ok(meta.total > 0 && meta.total < meta.leidas, "el prefiltro RUP debía descartar parte del dataset");
    assert.strictEqual(await redis.get("lock:sync"), null, "el candado no se liberó");

    /* c. oportunidades para Helder */
    const rHelder = await invocar(oportunidades, "/api/oportunidades?perfil=helder");
    assert.strictEqual(rHelder.status, 200);
    const cH = rHelder.cuerpo;
    assert.ok(cH.ok && cH.total > 0 && cH.resultados.length > 0, "helder sin resultados");
    assert.strictEqual(cH.perfil, "helder");
    for (const l of cH.resultados) {
      assert.strictEqual(typeof l.anticipo_pct, "number", "falta anticipo_pct");
      assert.ok(["bajo", "medio", "alto"].includes(l.cuantia_rango), "cuantia_rango inválido");
      assert.ok(["baja", "media", "alta"].includes(l.nivel_competencia), "nivel_competencia inválido");
      assert.strictEqual(typeof l.ubicacion_valida, "boolean", "falta ubicacion_valida");
      assert.ok(l.puntaje_ponderado >= 0 && l.puntaje_ponderado <= 100, "puntaje fuera de rango");
      assert.strictEqual(l.proceso_abierto, true, "apareció un proceso cerrado");
      assert.ok(filtros.estado_abierto(l), "estado no abierto servido");
      assert.ok(filtros.modalidad_competitiva(l), `modalidad no competitiva servida: ${l.modalidad_de_contratacion}`);
      assert.strictEqual(rup_valido(l, "helder"), true, `filtro RUP no aplicado: ${l.nombre_del_procedimiento}`);
      assert.ok(l.rup && l.rup.ok, "falta el detalle rup del resultado");
      assert.strictEqual(typeof l.rup.co_estimado, "boolean", "falta co_estimado en el detalle rup");
      assert.ok(!/canino|alimentaci/i.test(l.nombre_del_procedimiento), "se coló un objeto de blacklist");
    }

    /* c-bis. corpus completo de Helder: la cascada dejó fuera lo que debía */
    {
      const todasH = await todasLasOportunidades("perfil=helder");
      assert.ok(!todasH.some((l) => /directa|r[ée]gimen especial$/i.test(l.modalidad_de_contratacion)),
        "se sirvió un proceso de Contratación Directa o régimen especial sin ofertas");
      assert.ok(!todasH.some((l) => /Adjudicado/i.test(l.estado_del_procedimiento)),
        "se sirvió un proceso Adjudicado");
      assert.ok(!todasH.some((l) => /suministro de mobiliario/i.test(l.nombre_del_procedimiento)),
        "la capa anti-suministro dejó pasar una compra pura de mobiliario");
      assert.ok(todasH.some((l) => /Instalaci[oó]n y montaje de mobiliario/i.test(l.nombre_del_procedimiento)),
        "la instalación/montaje (verbo de obra, segmento 56) debía pasar y no aparece");
      assert.ok(todasH.some((l) => /Convocado/i.test(l.estado_del_procedimiento)),
        "los procesos Convocado (abiertos) debían aparecer");

      /* CONVENIOS: no son licitaciones y no pueden llegar a la pantalla */
      assert.ok(!todasH.some((l) => /aunar\s+esfuerzos/i.test(l.nombre_del_procedimiento)),
        "se sirvió un «AUNAR ESFUERZOS» (convenio interadministrativo)");
      assert.ok(!todasH.some((l) => /^convenio\s+interadministrativo/i.test(l.nombre_del_procedimiento)),
        "se sirvió un proceso cuyo objeto ES un convenio interadministrativo");
      // …pero la obra real que solo MENCIONA un convenio sí debe aparecer
      assert.ok(todasH.some((l) => /vereda El Cairo/i.test(l.nombre_del_procedimiento)),
        "el filtro de convenios se llevó por delante una obra que solo mencionaba uno");
      /* UNSPSC a nivel de PRODUCTO dentro de una clase del RUP: debe pasar
         (con la comparación exacta de 8 dígitos anterior era invisible) */
      assert.ok(todasH.some((l) => l.codigo_principal_de_categoria === "V1.72141015"),
        "un proceso con UNSPSC de producto (72141015) de una clase del RUP (72141000) no llegó a la pantalla");
    }

    /* c'. parámetros hostiles: claves del prototipo no tumban el endpoint */
    for (const url of [
      "/api/oportunidades?perfil=constructor",
      "/api/oportunidades?perfil=__proto__",
      "/api/oportunidades?perfil=hasownproperty",
    ]) {
      const r = await invocar(oportunidades, url);
      assert.strictEqual(r.status, 400, `${url} debía dar 400, dio ${r.status}`);
    }
    for (const url of [
      "/api/oportunidades?perfil=helder&ordenar_por=__proto__",
      "/api/oportunidades?perfil=helder&ordenar_por=hasOwnProperty",
      "/api/oportunidades?perfil=helder&anticipo_min=abc&pagina=-3&por_pagina=99999",
    ]) {
      const r = await invocar(oportunidades, url);
      assert.strictEqual(r.status, 200, `${url} debía degradar a 200, dio ${r.status}`);
      assert.ok(r.cuerpo.ok && r.cuerpo.resultados.length > 0, `${url} sin resultados`);
    }

    /* d. génesis con filtros y orden */
    const rGen = await invocar(oportunidades,
      "/api/oportunidades?perfil=genesis&anticipo_min=25&cuantia_rango=medio&ordenar_por=puntaje");
    assert.strictEqual(rGen.status, 200);
    const cG = rGen.cuerpo;
    assert.ok(cG.ok && cG.total > 0, "génesis sin resultados");
    for (const l of cG.resultados) {
      assert.strictEqual(l.cuantia_rango, "medio", "filtro de cuantía no aplicado");
      assert.ok(l.anticipo_pct === 0 || l.anticipo_pct >= 25, `anticipo declarado bajo el mínimo: ${l.anticipo_pct}`);
      assert.strictEqual(rup_valido(l, "genesis"), true, "filtro RUP génesis no aplicado");
    }
    // el filtro de anticipo muerde de verdad: los declarados al 10 % existen
    // en el corpus (visibles con mínimo 5) y desaparecen con mínimo 25
    {
      const conMin5 = await todasLasOportunidades("perfil=genesis&anticipo_min=5");
      assert.ok(conMin5.some((l) => l.anticipo_pct === 10), "faltan los anticipos del 10 % en el corpus");
      const conMin25 = await todasLasOportunidades("perfil=genesis&anticipo_min=25");
      assert.ok(!conMin25.some((l) => l.anticipo_pct === 10), "anticipo_min=25 no excluyó los declarados al 10 %");
      assert.ok(conMin25.length < conMin5.length, "anticipo_min=25 debía excluir filas frente a anticipo_min=5");
    }
    for (let i = 1; i < cG.resultados.length; i++) {
      assert.ok(cG.resultados[i - 1].puntaje_ponderado >= cG.resultados[i].puntaje_ponderado, "orden por puntaje roto");
    }

    /* d-bis. consorcio: perfil=juntos y su alias ?perfil=consorcio */
    {
      const rJ = await invocar(oportunidades, "/api/oportunidades?perfil=juntos");
      const rC = await invocar(oportunidades, "/api/oportunidades?perfil=consorcio");
      assert.strictEqual(rJ.status, 200, "perfil=juntos falló");
      assert.strictEqual(rC.status, 200, "alias perfil=consorcio falló");
      assert.ok(rJ.cuerpo.total > 0, "consorcio sin resultados");
      assert.strictEqual(rC.cuerpo.total, rJ.cuerpo.total, "el alias consorcio difiere de juntos");
      assert.strictEqual(rC.cuerpo.perfil, "juntos", "el alias no se canonicaliza");
      for (const l of rJ.cuerpo.resultados) {
        assert.strictEqual(rup_valido(l, "juntos"), true, "filtro RUP del consorcio no aplicado");
      }
      // el consorcio (K = suma de integrantes, tope 11 000 SMMLV) ALCANZA
      // procesos que NINGÚN integrante puede tomar solo: las obras de 9 000 M
      // superan el tope de Helder (7 004 M) y el de Génesis (3 502 M)
      const todasJ = await todasLasOportunidades("perfil=juntos");
      const soloConsorcio = todasJ.filter((l) => l.cuantia_cop > 7.1e9);
      assert.ok(soloConsorcio.length > 0, "faltan las obras grandes que solo el consorcio alcanza");
      for (const l of soloConsorcio.slice(0, 3)) {
        assert.strictEqual(rup_valido(l, "helder"), false, "una obra de 9 000 M no puede ser viable para Helder solo");
        assert.strictEqual(rup_valido(l, "genesis"), false, "una obra de 9 000 M no puede ser viable para Génesis sola");
      }
      assert.ok(todasJ.length >= cH.total, "el consorcio no puede ver menos que Helder");
    }

    /* e. extracción histórica de los 2 años anteriores + índice de competencia.
       Corre ANTES del delta a propósito: así el índice se verifica sobre un
       corpus histórico conocido (28 procesos), sin la adjudicación que el
       delta añadirá después. */
    {
      socrata.setFallos(false); // el histórico corre limpio; los fallos ya se probaron en la full
      const rango = `desde=${ANOS_HIST[0]}-01&hasta=${ANOS_HIST[1]}-12`;
      const TOKEN = { "x-historico-token": process.env.HISTORICO_TOKEN };

      /* protección: sin token, con token equivocado y sin la variable definida */
      assert.strictEqual((await invocar(historico, `/api/sync/historico?${rango}&chain=0`)).status, 401,
        "sin token debía responder 401");
      {
        const r401 = await invocar(historico, `/api/sync/historico?${rango}&token=equivocado&chain=0`);
        assert.strictEqual(r401.status, 401, "token equivocado por la URL debía responder 401");
        // el error explica LAS DOS formas de autenticarse (el dueño puede no tener terminal)
        assert.ok(r401.cuerpo.como_autenticar.header.includes("x-historico-token"), "el 401 no sugiere el header");
        assert.ok(r401.cuerpo.como_autenticar.url.includes("token"), "el 401 no sugiere el token por URL");
      }
      {
        const guardado = process.env.HISTORICO_TOKEN;
        delete process.env.HISTORICO_TOKEN;
        const r0 = await invocar(historico, `/api/sync/historico?${rango}&chain=0`, TOKEN);
        assert.strictEqual(r0.status, 503, "sin HISTORICO_TOKEN el endpoint debe negarse, nunca abrirse");
        process.env.HISTORICO_TOKEN = guardado;
      }
      assert.strictEqual((await invocar(historico, `/api/sync/historico?desde=${ANO}-13&hasta=${ANO}-12&chain=0`, TOKEN)).status, 400,
        "rango de meses inválido debía dar 400");
      assert.strictEqual((await redis.scan(CLAVES.patronChunksHist)).length, 0,
        "una petición rechazada no puede haber escrito nada");

      /* extracción reanudable con presupuesto corto (varias invocaciones) */
      let rh = await invocar(historico, `/api/sync/historico?${rango}&presupuesto=200&chain=0`, TOKEN);
      assert.strictEqual(rh.status, 200, `histórico falló: ${JSON.stringify(rh.cuerpo).slice(0, 300)}`);
      assert.strictEqual(rh.cuerpo.ok, true);
      let invHist = 1;
      while (rh.cuerpo.done === false) {
        rh = await invocar(historico, `/api/sync/historico?${rango}&presupuesto=200&chain=0`, TOKEN);
        assert.strictEqual(rh.cuerpo.ok, true, `continuación histórica falló: ${JSON.stringify(rh.cuerpo)}`);
        if (++invHist > 400) throw new Error("la extracción histórica no converge");
      }
      assert.ok(invHist >= 2, "el presupuesto corto debía forzar varias invocaciones reanudables");
      assert.strictEqual(await redis.get("lock:sync:historico"), null, "el candado del histórico no se liberó");
      assert.strictEqual(await redis.get("lock:sync"), null, "el histórico no debe tocar el candado del sync normal");

      /* el histórico guardó todo el rango CON datos de adjudicación */
      const hist = await leerHistorico();
      const totalHist = ENTIDADES_HIST.reduce((a, e) => a + e.ofertas.length, 0);
      assert.strictEqual(hist.length, totalHist, `histórico: ${hist.length} registros, esperaba ${totalHist}`);
      for (const r of hist) {
        assert.ok(r.nombre_del_proveedor && r.nit_del_proveedor_adjudicado, "falta el adjudicatario en el histórico");
        assert.ok(r.valor_total_adjudicacion && r.fecha_adjudicacion, "faltan valor/fecha de adjudicación");
        assert.strictEqual(r.fue_adjudicado, true, "el histórico no marcó la adjudicación");
        assert.ok(r.oferentes >= 1, "el histórico no derivó el nº de oferentes");
      }

      /* los dos corpus no se mezclan */
      const activo = await leerActivo();
      assert.ok(!activo.some((r) => String(r.id_del_proceso).startsWith("CO1.HIST.")),
        "el corpus activo se contaminó con procesos históricos");
      assert.ok(!activo.some((r) => "nombre_del_proveedor" in r),
        "el corpus activo guardó datos de adjudicación (solo deben vivir en el histórico)");

      /* índice construido automáticamente al terminar la extracción */
      const metaIdx = JSON.parse(await redis.get("indice:competencia:meta"));
      assert.ok(metaIdx && metaIdx.construido, "no se construyó el índice al terminar la extracción");
      assert.strictEqual(metaIdx.entidades, ENTIDADES_HIST.length, "faltan entidades en el índice");
      assert.strictEqual(metaIdx.clasificadas, 3, "solo las entidades con ≥5 procesos pueden clasificarse");
      assert.strictEqual(metaIdx.procesos_contados, totalHist, "el índice no contó todos los procesos");
      assert.strictEqual(metaIdx.min_procesos, 5);

      const hash = await redis.hgetall("indice:competencia");
      for (const e of ENTIDADES_HIST) {
        const m = JSON.parse(hash[filtros.norm(e.entidad)]);
        assert.strictEqual(m.procesos, e.ofertas.length, `${e.entidad}: nº de procesos`);
        assert.strictEqual(m.oferentes_total, e.ofertas.reduce((a, b) => a + b, 0), `${e.entidad}: suma de oferentes`);
        if (e.ofertas.length >= 5) {
          assert.strictEqual(m.promedio, PROMEDIO_ESPERADO[e.entidad], `${e.entidad}: promedio de oferentes`);
          assert.ok(m.mediana > 0, `${e.entidad}: mediana`);
        } else {
          assert.strictEqual(m.nivel, "sin_dato", "una entidad con <5 procesos no puede clasificarse");
        }
        // alias por NIT → mismo registro (una entidad que cambie de nombre no parte su historial)
        assert.deepStrictEqual(JSON.parse(hash[`nit:${e.nit}`]), { ref: filtros.norm(e.entidad) });
      }
      // TERTILES: 3 / 8 / 18 oferentes de promedio → baja / media / alta
      assert.strictEqual(JSON.parse(hash[filtros.norm("ALCALDÍA DE PURIFICACIÓN")]).nivel, "baja");
      assert.strictEqual(JSON.parse(hash[filtros.norm("GOBERNACIÓN DEL TOLIMA")]).nivel, "media");
      assert.strictEqual(JSON.parse(hash[filtros.norm("IDU")]).nivel, "alta");

      /* el token TAMBIÉN autentica por la URL: es la única vía del dueño, que
         dispara la carga pegando el enlace en Chrome (portátil sin terminal) */
      {
        const soloUrl = await invocar(historico,
          `/api/sync/historico?reconstruir_indice=true&presupuesto=20000&chain=0&token=${encodeURIComponent(process.env.HISTORICO_TOKEN)}`);
        assert.strictEqual(soloUrl.status, 200, "el token por URL debía autenticar igual que el header");
        assert.strictEqual(soloUrl.cuerpo.ok, true);
        assert.strictEqual(soloUrl.cuerpo.done, true, "la carga disparada desde el navegador no llegó a término");
        // y si vienen los dos, MANDA EL HEADER: header bueno + URL basura → autoriza
        const headerGana = await invocar(historico,
          "/api/sync/historico?reconstruir_indice=true&presupuesto=20000&chain=0&token=basura", TOKEN);
        assert.strictEqual(headerGana.status, 200, "con header válido, un token basura en la URL no debe estorbar");
      }

      /* escotillas de diagnóstico y rescate desde el navegador */
      {
        // ?estado=true SOLO LEE: ni candado, ni escrituras
        const est = await invocar(historico, "/api/sync/historico?estado=true", TOKEN);
        assert.strictEqual(est.status, 200);
        assert.strictEqual(est.cuerpo.estado.candado.tomado, false, "?estado no debe tomar el candado");
        assert.strictEqual(est.cuerpo.estado.extraccion.terminada, true);
        assert.strictEqual(est.cuerpo.estado.corpus_historico.chunks > 0, true);
        assert.ok(est.cuerpo.estado.indice.clasificadas === 3, "?estado no informa el índice");
        assert.strictEqual(await redis.get("lock:sync:historico"), null);
        // y está protegido igual que todo lo demás
        assert.strictEqual((await invocar(historico, "/api/sync/historico?estado=true")).status, 401);
        assert.strictEqual((await invocar(historico, "/api/sync/historico?reset=true")).status, 401,
          "?reset debe exigir token: destraba, no es público");

        // ?reset=true con un candado ajeno puesto a mano (el escenario a rescatar)
        await redis.set("lock:sync:historico", "tanda-muerta", { nx: true, ex: 600 });
        const conCandado = await invocar(historico, "/api/sync/historico?estado=true", TOKEN);
        assert.strictEqual(conCandado.cuerpo.estado.candado.tomado, true);
        assert.ok(conCandado.cuerpo.estado.candado.se_libera_solo_en_seg > 0,
          "el estado debe decir en cuántos segundos se libera solo el candado");

        const chunksAntes = (await redis.scan(CLAVES.patronChunksHist)).length;
        const rst = await invocar(historico, "/api/sync/historico?reset=true", TOKEN);
        assert.strictEqual(rst.status, 200);
        assert.deepStrictEqual(
          { ok: rst.cuerpo.ok, reset: rst.cuerpo.reset, msg: rst.cuerpo.msg },
          { ok: true, reset: true, msg: "Candado liberado. Vuelva a llamar sin ?reset para iniciar." });
        assert.strictEqual(await redis.get("lock:sync:historico"), null, "?reset no liberó el candado");
        assert.strictEqual(await redis.get("sync:historico:progreso"), null, "?reset no borró el progreso");
        assert.strictEqual(await redis.get("sync:historico:meta"), null, "?reset no borró la meta");
        // …y NO tocó lo ya bajado ni el índice publicado
        assert.strictEqual((await redis.scan(CLAVES.patronChunksHist)).length, chunksAntes,
          "?reset borró chunks del histórico");
        assert.strictEqual((await leerHistorico()).length, totalHist, "?reset perdió procesos históricos");
        assert.ok(JSON.parse(await redis.get("indice:competencia:meta")).clasificadas === 3,
          "?reset tumbó el índice publicado");

        // tras el reset se puede volver a lanzar y el resultado es el mismo
        // (la extracción REEMPLAZA los meses, no los duplica)
        let re = await invocar(historico, `/api/sync/historico?${rango}&presupuesto=20000&chain=0`, TOKEN);
        let vueltas = 1;
        while (re.cuerpo.done === false) {
          re = await invocar(historico, `/api/sync/historico?${rango}&presupuesto=20000&chain=0`, TOKEN);
          if (++vueltas > 50) throw new Error("la extracción tras ?reset no converge");
        }
        assert.strictEqual((await leerHistorico()).length, totalHist,
          "re-lanzar tras ?reset duplicó el corpus histórico");
      }

      /* reconstrucción del índice sin volver a bajar nada */
      const rr = await invocar(historico, "/api/sync/historico?reconstruir_indice=true&presupuesto=20000&chain=0", TOKEN);
      assert.strictEqual(rr.cuerpo.ok, true, `reconstrucción falló: ${JSON.stringify(rr.cuerpo).slice(0, 300)}`);
      assert.strictEqual(rr.cuerpo.done, true, "la reconstrucción del índice quedó a medias");
      assert.strictEqual(rr.cuerpo.extraccion, null, "reconstruir_indice no debe re-extraer");
      assert.strictEqual(rr.cuerpo.indice.clasificadas, 3, "la reconstrucción cambió la clasificación");
      assert.strictEqual((await leerHistorico()).length, totalHist, "la reconstrucción duplicó el histórico");
    }

    /* f. el índice se USA: orden por atractividad = dónde es más probable ganar */
    {
      // perfil=juntos: es el único que ve las CUATRO entidades del corpus (las
      // obras de 9 000 M de la Alcaldía de Ibagué superan el K de cada
      // integrante por separado), así que los cuatro grupos están presentes
      const RANGO_NIVEL = { baja: 0, media: 1, sin_dato: 2, alta: 3 };
      const todas = await todasLasOportunidades("perfil=juntos&ordenar_por=atractividad");
      assert.ok(todas.length > 0, "sin resultados que ordenar");

      let previo = -1;
      for (const l of todas) {
        assert.ok(l.competencia_entidad && RANGO_NIVEL[l.competencia_entidad.nivel] !== undefined,
          "falta competencia_entidad en el resultado");
        const r = RANGO_NIVEL[l.competencia_entidad.nivel];
        assert.ok(r >= previo,
          `orden por atractividad roto: ${l.entidad} (${l.competencia_entidad.nivel}) después de nivel ${previo}`);
        previo = r;
      }
      const niveles = new Set(todas.map((l) => l.competencia_entidad.nivel));
      for (const n of ["baja", "media", "alta", "sin_dato"]) assert.ok(niveles.has(n), `falta el grupo ${n} en el corpus`);
      assert.strictEqual(todas[0].competencia_entidad.nivel, "baja", "la primera no es de poca competencia");
      assert.strictEqual(todas[0].competencia_entidad.promedio_oferentes, 3);
      assert.ok(todas[0].competencia_entidad.total_procesos >= 5);
      assert.strictEqual(todas[todas.length - 1].competencia_entidad.nivel, "alta", "la última no es de alta competencia");

      // dentro del grupo, el criterio sigue siendo el puntaje descendente
      const soloBaja = todas.filter((l) => l.competencia_entidad.nivel === "baja");
      for (let i = 1; i < soloBaja.length; i++) {
        assert.ok(soloBaja[i - 1].puntaje_ponderado >= soloBaja[i].puntaje_ponderado,
          "el desempate por puntaje dentro del grupo se rompió");
      }

      // atractividad es el orden POR DEFECTO (lo que ve el dueño al abrir la app)
      const porDefecto = await invocar(oportunidades, "/api/oportunidades?perfil=juntos&por_pagina=100");
      assert.strictEqual(porDefecto.cuerpo.ordenado_por, "atractividad", "el orden por defecto no es atractividad");
      assert.strictEqual(porDefecto.cuerpo.resultados[0].id_del_proceso, todas[0].id_del_proceso);
      assert.ok(porDefecto.cuerpo.indice_competencia && porDefecto.cuerpo.indice_competencia.entidades === 3,
        "la respuesta no informa el estado del índice");

      // los órdenes anteriores siguen funcionando
      const porPuntaje = (await invocar(oportunidades, "/api/oportunidades?perfil=juntos&ordenar_por=puntaje&por_pagina=100")).cuerpo;
      for (let i = 1; i < porPuntaje.resultados.length; i++) {
        assert.ok(porPuntaje.resultados[i - 1].puntaje_ponderado >= porPuntaje.resultados[i].puntaje_ponderado,
          "orden por puntaje roto");
      }

      // filtro por competencia de la entidad
      const bajas = await todasLasOportunidades("perfil=juntos&competencia_entidad=baja");
      assert.ok(bajas.length > 0 && bajas.every((l) => l.competencia_entidad.nivel === "baja"),
        "el filtro competencia_entidad no se aplicó");
      assert.strictEqual(bajas.length, soloBaja.length);

      // /api/oportunidades NO lee del histórico NI expone datos de adjudicación
      for (const l of todas) {
        assert.ok(!String(l.id_del_proceso).startsWith("CO1.HIST."), "se sirvió un proceso del corpus histórico");
        assert.ok(!ANOS_HIST.some((y) => String(l.fecha_de_publicacion_del).startsWith(String(y))),
          "se sirvió un proceso de años anteriores (el histórico no se consulta aquí)");
        for (const c of ["nombre_del_proveedor", "nit_del_proveedor_adjudicado", "valor_total_adjudicacion",
          "fecha_adjudicacion", "numero_de_ofertas", "oferentes", "fue_adjudicado"]) {
          assert.ok(!(c in l), `/api/oportunidades expuso el campo de adjudicación «${c}»`);
        }
      }
    }

    /* g. delta: fila nueva + cambio de estado (reemplazo y traslado al histórico) */
    {
      socrata.setFallos(false); // el delta corre limpio; los fallos ya se probaron en la full
      const ds = socrata.getDataset();
      const mesActual = MESES[MESES.length - 1];
      const nuevaId = `CO1.REQ.NUEVA.${n}`;
      ds.push({
        ":id": `row-zz-${n}`, ":updated_at": new Date().toISOString(),
        id_del_proceso: nuevaId, referencia_del_proceso: `REF-NUEVA-${n}`,
        fecha_de_publicacion_del: `${mesActual}-11T09:00:00.000`,
        entidad: "ALCALDÍA DE PURIFICACIÓN", ciudad_entidad: "PURIFICACIÓN", departamento_entidad: "Tolima",
        modalidad_de_contratacion: "Licitación pública", estado_del_procedimiento: "Publicado",
        fase: "Presentación de ofertas", precio_base: "300000000",
        duracion: "5", unidad_de_duracion: "Meses", respuestas_al_procedimiento: "1",
        nombre_del_procedimiento: `Construcción de puente vehicular ${n}`,
        descripci_n_del_procedimiento: "Obra de puente en concreto con anticipo del 40%",
        codigo_principal_de_categoria: "V1.72141000",
        urlproceso: { url: "https://community.secop.gov.co/x" },
      });
      // elegir una fila que SÍ está guardada y listada (obra, competitiva,
      // sin blacklist, cuantía dentro del K de Helder) y VERIFICAR su
      // presencia ANTES del cambio — sin eso, la aserción de ausencia
      // posterior podría pasar vacuamente
      const abierta = ds.find((f) => f.estado_del_procedimiento === "Publicado"
        && f.codigo_principal_de_categoria === "V1.72141000"
        && /^Construcción/.test(f.nombre_del_procedimiento)
        && /Licitación pública/.test(f.modalidad_de_contratacion)
        && parseFloat(f.precio_base) < 1e9
        && !f.id_del_proceso.includes("NUEVA"));
      const antes = await todasLasOportunidades("perfil=helder");
      assert.ok(antes.some((l) => l.id_del_proceso === abierta.id_del_proceso),
        "la fila elegida para adjudicar debía estar listada ANTES del delta");
      const histAntes = (await leerHistorico()).length;
      abierta.estado_del_procedimiento = "Adjudicado";
      abierta.adjudicado = "Si";
      abierta.nombre_del_proveedor = "CONSTRUCTORA GANADORA SAS";
      abierta.nit_del_proveedor_adjudicado = "901234567";
      abierta.valor_total_adjudicacion = abierta.precio_base;
      abierta.fecha_adjudicacion = `${mesActual}-20T10:00:00.000`;
      abierta.numero_de_ofertas = "4";
      abierta[":updated_at"] = new Date().toISOString();

      const rd = await invocar(sync, "/api/sync?modo=delta&presupuesto=20000&chain=0");
      assert.strictEqual(rd.cuerpo.ok, true, `delta falló: ${JSON.stringify(rd.cuerpo)}`);
      assert.strictEqual(rd.cuerpo.done, true, "delta quedó parcial");
      assert.ok(rd.cuerpo.delta.guardadas >= 2, `delta debía guardar ≥2 filas, guardó ${rd.cuerpo.delta.guardadas}`);
      assert.ok(rd.cuerpo.delta.historicas >= 1, "el delta no reportó traslados al histórico");

      const todas = await todasLasOportunidades("perfil=helder");
      assert.ok(todas.some((l) => l.id_del_proceso === nuevaId), "la fila nueva del delta no aparece");
      assert.ok(!todas.some((l) => l.id_del_proceso === abierta.id_del_proceso), "la fila adjudicada sigue apareciendo");

      /* el proceso que cerró SE MUDÓ al histórico, con sus datos de adjudicación */
      const hist = await leerHistorico();
      assert.ok(hist.length > histAntes, "el delta no escribió nada en el histórico");
      const mudado = hist.find((r) => r.id_del_proceso === abierta.id_del_proceso);
      assert.ok(mudado, "el proceso adjudicado no llegó al corpus histórico");
      assert.strictEqual(mudado.nombre_del_proveedor, "CONSTRUCTORA GANADORA SAS");
      assert.strictEqual(mudado.oferentes, 4);
      assert.strictEqual(mudado.fue_adjudicado, true);
      assert.strictEqual(mudado.proceso_abierto, false);
      // …y su copia en el activo (que solo existe para REEMPLAZAR a la versión
      // abierta vía :updated_at) va sin un solo dato de adjudicación
      const enActivo = (await leerActivo()).filter((r) => r.id_del_proceso === abierta.id_del_proceso);
      assert.ok(enActivo.length > 0, "falta el reemplazo en el activo: la versión abierta quedaría congelada");
      for (const r of enActivo) {
        for (const c of ["nombre_del_proveedor", "nit_del_proveedor_adjudicado", "valor_total_adjudicacion", "numero_de_ofertas"]) {
          assert.ok(!(c in r), `el corpus activo guardó el campo de adjudicación «${c}»`);
        }
      }
      // y la purga del activo jamás toca el histórico
      const histFinal = (await leerHistorico()).length;
      const rFull = await invocar(sync, "/api/sync?modo=full&presupuesto=20000&chain=0");
      assert.strictEqual(rFull.cuerpo.done, true, "la full de higiene no terminó en una invocación");
      assert.strictEqual((await leerHistorico()).length, histFinal,
        "una full de higiene borró parte del corpus histórico");
      assert.ok(!(await leerActivo()).some((r) => r.id_del_proceso === abierta.id_del_proceso),
        "la full de higiene debía dejar fuera del activo el proceso ya adjudicado");
    }

    /* g-bis. /api/diagnostico: el embudo cuadra con lo que sirve la app */
    {
      assert.strictEqual((await invocar(diagnostico, "/api/diagnostico?perfil=helder")).status, 401,
        "el diagnóstico expone el corpus: debe exigir token");
      const d = await invocar(diagnostico, "/api/diagnostico?perfil=helder&muestra=20",
        { "x-historico-token": process.env.HISTORICO_TOKEN });
      assert.strictEqual(d.status, 200, `diagnóstico falló: ${JSON.stringify(d.cuerpo).slice(0, 300)}`);
      const c = d.cuerpo;
      assert.ok(c.corpus.activo.filas_unicas > 0, "el diagnóstico no ve el corpus activo");
      assert.ok(c.corpus.historico.chunks > 0, "el diagnóstico no ve el corpus histórico");

      // INVARIANTE FUERTE: lo que el embudo llama «visibles» es exactamente lo
      // que /api/oportunidades sirve. Si divergen, el diagnóstico miente.
      const real = await invocar(oportunidades, "/api/oportunidades?perfil=helder&por_pagina=1");
      assert.strictEqual(c.embudo.visibles, real.cuerpo.total,
        `el embudo dice ${c.embudo.visibles} visibles y la app sirve ${real.cuerpo.total}`);

      // el embudo suma: nadie se pierde sin quedar contado en algún paso
      const bajas = Object.entries(c.embudo)
        .filter(([k]) => k.startsWith("fuera_")).reduce((a, [, v]) => a + v, 0);
      assert.strictEqual(bajas + c.embudo.visibles, c.embudo.total_activo,
        "el embudo no cuadra: hay procesos que desaparecen sin motivo registrado");

      // el contrafactual de UNSPSC demuestra la ganancia del match por clase
      assert.ok(c.contrafactuales.ganancia_por_clase > 0,
        "el corpus de prueba trae códigos de producto: la ganancia por clase no puede ser 0");
      assert.ok(c.unspsc_cobertura.cubiertas_por_clase >= c.unspsc_cobertura.cubiertas_exacto_8_digitos,
        "el match por clase nunca puede cubrir menos que el exacto");
      // y las distribuciones traen los valores REALES de las columnas
      assert.ok(Object.keys(c.distribuciones.estado_del_procedimiento).length > 0, "sin distribución de estados");
      assert.ok(c.muestra.length > 0 && c.muestra[0].objeto, "sin muestra de procesos visibles");
      assert.ok(!c.muestra.some((m) => /aunar esfuerzos/i.test(m.objeto)), "un convenio llegó a la muestra de visibles");
    }

    /* h. la raíz sirve el frontend (Vercel: /public es el output estático) */
    {
      const html = fs.readFileSync(path.join(__dirname, "..", "public", "index.html"), "utf8");
      for (const debe of ['id="gate"', 'id="app"', "/app.js", "cdn.tailwindcss.com", 'id="btn-buscar"',
        'id="f-entidad"', '<option value="atractividad">']) {
        assert.ok(html.includes(debe), `index.html sin ${debe}`);
      }
      // el orden por defecto de la app debe ser el de atractividad: primera opción del selector
      const opciones = html.slice(html.indexOf('id="f-ordenar"')).match(/<option value="([^"]+)"/g) || [];
      assert.strictEqual(opciones[0], '<option value="atractividad"', "«Más atractivas» debe ser la opción por defecto");
      const js = fs.readFileSync(path.join(__dirname, "..", "public", "app.js"), "utf8");
      new Function(js); // valida sintaxis sin ejecutar
      assert.ok(js.includes('"231105"'), "app.js sin la clave de acceso");

      /* panel de administración: encadenado de la sincronización */
      const admHtml = fs.readFileSync(path.join(__dirname, "..", "public", "admin.html"), "utf8");
      for (const debe of ['id="gate"', 'id="app"', "/admin.js", "cdn.tailwindcss.com",
        'id="btn-iniciar"', 'id="btn-detener"', 'id="prog-barra"', 'id="m-tandas"', 'id="chip-texto"']) {
        assert.ok(admHtml.includes(debe), `admin.html sin ${debe}`);
      }
      const admJs = fs.readFileSync(path.join(__dirname, "..", "public", "admin.js"), "utf8");
      new Function(admJs); // valida sintaxis sin ejecutar
      assert.ok(admJs.includes('"231105"'), "admin.js sin la clave de acceso");
      // la secuencia de modos es lo único que puede colgar el encadenado
      assert.ok(/modo=\$\{modo\}/.test(admJs), "admin.js debe parametrizar el modo, no fijarlo");
      assert.ok(/let modo = "full"/.test(admJs), "la primera tanda debe ser modo=full");
      assert.ok((admJs.match(/modo = "auto"/g) || []).length >= 2,
        "las tandas siguientes deben pasar a modo=auto (si no, la carga se reinicia sin fin)");
      // esperas del encargo: 3 s entre tandas, 10 s con el candado tomado, backoff 5/10/20
      assert.ok(/ESPERA_ENTRE_TANDAS_MS = 3000/.test(admJs), "espera entre tandas ≠ 3 s");
      assert.ok(/ESPERA_CANDADO_MS = 10000/.test(admJs), "espera por candado ≠ 10 s");
      assert.ok(/BACKOFF_MS = \[5000, 10000, 20000\]/.test(admJs), "backoff de reintentos ≠ 5/10/20 s");
      for (const debe of ["bandaCompetencia", "competencia_entidad", "Poca competencia", "Alta competencia"]) {
        assert.ok(js.includes(debe), `app.js sin ${debe} (la tarjeta no muestra la competencia de la entidad)`);
      }
      const vercel = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "vercel.json"), "utf8"));
      for (const fn of Object.keys(vercel.functions)) {
        assert.ok(fs.existsSync(path.join(__dirname, "..", fn)), `vercel.json apunta a ${fn} inexistente`);
      }
      assert.ok(vercel.crons.some((c) => c.path === "/api/sync"), "falta el cron de /api/sync");
    }

    /* i. la INVARIANTE que sostiene el encadenado del panel de administración:
       modo=full REINICIA y modo=auto CONTINÚA. Si el botón repitiera modo=full
       en cada tanda, la carga volvería a enero para siempre y nunca terminaría.
       Se verifica contra el handler real, no contra el código del navegador. */
    {
      const progreso = async () => JSON.parse(await redis.get("licitaciones:progreso"));

      let r1 = await invocar(sync, "/api/sync?modo=full&presupuesto=1&chain=0");
      assert.strictEqual(r1.cuerpo.done, false, "con presupuesto de 1 ms la full no puede terminar");
      const p1 = await progreso();
      assert.strictEqual(p1.mesIdx, 0, "una full nueva arranca en el primer mes");

      // avanzar con AUTO hasta pasar de mes: eso demuestra que continúa
      let vueltas = 0;
      let p2 = p1;
      while (p2.mesIdx < 1 && !p2.terminado && vueltas < 60) {
        await invocar(sync, "/api/sync?modo=auto&presupuesto=150&chain=0");
        p2 = await progreso();
        vueltas++;
      }
      assert.ok(p2.mesIdx >= 1 || p2.terminado, "modo=auto no hizo avanzar la carga");
      assert.strictEqual(p2.iniciado, p1.iniciado, "modo=auto NO puede reiniciar la carga");

      // y ahora la prueba de por qué el botón no debe repetir modo=full
      await invocar(sync, "/api/sync?modo=full&presupuesto=1&chain=0");
      const p3 = await progreso();
      assert.strictEqual(p3.mesIdx, 0, "modo=full debe reiniciar desde el primer mes");
      assert.notStrictEqual(p3.iniciado, p1.iniciado, "modo=full debe empezar una corrida nueva");

      // dejar el corpus completo otra vez (como lo dejaría el botón real)
      let rf = { cuerpo: { done: false } };
      vueltas = 0;
      while (rf.cuerpo.done === false && vueltas < 200) {
        rf = await invocar(sync, "/api/sync?modo=auto&presupuesto=20000&chain=0");
        vueltas++;
      }
      assert.strictEqual(rf.cuerpo.done, true, "el encadenado full→auto debe converger");
    }

    const idx = JSON.parse(await redis.get("indice:competencia:meta"));
    return {
      invocaciones, chunks: chunks.length, corpus: meta.total, leidas: meta.leidas,
      historico: (await leerHistorico()).length, entidades: idx.clasificadas, ms: Date.now() - t0,
    };
  }

  /* i. contexto: sin CLI de Vercel ni salida a datos.gov.co en este entorno →
     las 4 iteraciones corren contra los mocks locales con los handlers reales. */
  console.log(`Mock Socrata en :${puertoSocrata} · mock Upstash en :${puertoUpstash} · ${MESES.length} meses × 120 filas`);
  const resultados = [];
  for (let i = 1; i <= objetivo; i++) {
    const r = await iteracion(i);
    resultados.push(r);
    console.log(`✔ iteración ${i}/${objetivo}: full en ${r.invocaciones} invocaciones reanudables · ${r.chunks} chunks · corpus ${r.corpus}/${r.leidas} filas · histórico ${r.historico} procesos → ${r.entidades} entidades clasificadas · ${r.ms} ms`);
  }
  console.log(`\nTODAS LAS ITERACIONES PASARON (${objetivo}/${objetivo}) · peticiones Socrata simuladas: ${socrata.peticiones()}`);
  socrata.server.close();
  upstash.server.close();
}

main().catch((e) => { console.error("\n✘ FALLO:", e.message); process.exit(1); });
