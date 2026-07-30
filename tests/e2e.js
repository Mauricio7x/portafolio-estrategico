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
     d'. Delta: fila nueva + cambio de estado a Adjudicado → la nueva aparece,
        la adjudicada desaparece del listado (reemplazo por :updated_at).
     e. La raíz sirve el HTML del frontend (gate + app) y app.js compila.
     f. (Documentado) Sin CLI de Vercel ni red: pruebas locales con mocks.
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
        f.porcentaje_de_anticipo = "25";
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
        // Reparto por paridad del MES (n siempre es múltiplo de 10 aquí, e
        // i ≡ 9 mod 10 fijaría la cuantía: el mes varía ambas cosas).
        f.codigo_principal_de_categoria = "V1.56112000";
        if (parseInt(mes.slice(5), 10) % 2 === 0) {
          f.nombre_del_procedimiento = `Suministro de mobiliario escolar ${n}`;
          f.descripci_n_del_procedimiento = "Compra de pupitres y sillas para sedes educativas";
        } else {
          f.nombre_del_procedimiento = `Instalación y montaje de mobiliario para aulas ${n}`;
          f.descripci_n_del_procedimiento = "Instalación de mobiliario escolar con obras de adecuación menores";
        }
      }
      filas.push(f);
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
        for (const k of cmd.slice(1)) { if (viva(k)) borradas++; datos.delete(k); expiras.delete(k); }
        return borradas;
      }
      case "MGET": return cmd.slice(1).map((k) => (viva(k) ? datos.get(k) : null));
      case "EXISTS": return viva(cmd[1]) ? 1 : 0;
      case "SCAN": {
        const iMatch = cmd.map((x) => String(x).toUpperCase()).indexOf("MATCH");
        const re = globRe(cmd[iMatch + 1]);
        const claves = [...datos.keys()].filter((k) => viva(k) && re.test(k));
        return ["0", claves];
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
  return { server, tamano: () => datos.size };
}

/* ════════════════ invocador de handlers estilo Vercel ════════════════ */
function invocar(handler, urlStr) {
  const u = new URL(urlStr, "http://app.local");
  const req = {
    url: urlStr, method: "GET",
    headers: { host: "app.local", "x-forwarded-proto": "https" },
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

  // requerir DESPUÉS de fijar el entorno (PAGE/backoff se leen al cargar)
  const sync = require("../api/sync.js");
  const oportunidades = require("../api/oportunidades.js");
  const { crearRedis } = require("../lib/redis.js");
  const { empaquetar, descomprimir, CHUNK_MAX_COMPRIMIDO } = require("../lib/almacen.js");
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
      ["", false],                                           // sin dato = fuera
      ["Modalidad desconocida", false],
    ];
    for (const [m, esperado] of casos) {
      assert.strictEqual(filtros.modalidad_competitiva({ modalidad_de_contratacion: m }), esperado,
        `modalidad_competitiva(«${m}») esperaba ${esperado}`);
    }
    console.log(`· unidad modalidades: ${casos.length} clasificaciones correctas (lista blanca)`);
  }

  /* unidad: capa anti-suministro sobre segmentos de bienes */
  {
    const H = PERFILES.helder;
    const casos = [
      // compra pura con código de mobiliario (segmento 56) → fuera
      [{ nombre_del_procedimiento: "Suministro de mobiliario escolar", descripci_n_del_procedimiento: "Compra de pupitres", codigo_principal_de_categoria: "V1.56112000" }, false],
      [{ nombre_del_procedimiento: "Adquisición de equipos de cómputo", descripci_n_del_procedimiento: "Compra de estaciones", codigo_principal_de_categoria: "V1.43211700" }, false],
      // mismo segmento pero con verbo de obra → pasa
      [{ nombre_del_procedimiento: "Instalación y montaje de mobiliario", descripci_n_del_procedimiento: "Con obras de adecuación", codigo_principal_de_categoria: "V1.56112000" }, true],
      // código de obra (72) ancla el proceso aunque haya verbo de compra → pasa
      [{ nombre_del_procedimiento: "Construcción de aula y suministro de materiales", descripci_n_del_procedimiento: "Obra e insumos", codigo_principal_de_categoria: "V1.72141000 V1.30111500" }, true],
    ];
    for (const [lic, esperado] of casos) {
      assert.strictEqual(filtros.objeto_valido(lic, H), esperado,
        `objeto_valido(«${lic.nombre_del_procedimiento}») esperaba ${esperado}`);
    }
    console.log(`· unidad anti-suministro: ${casos.length} casos correctos (segmentos de bienes)`);
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

  async function limpiarRedis() {
    const claves = [...(await redis.scan("licitaciones:*")), ...(await redis.scan("lock:sync"))];
    if (claves.length) await redis.del(...claves);
    assert.strictEqual((await redis.scan("licitaciones:*")).length, 0, "Redis no quedó limpio");
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
    socrata.setDataset(generarDataset());
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
    const chunks = await redis.scan("licitaciones:mes:*:chunk:*");
    assert.ok(chunks.length >= MESES.length, `esperaba ≥${MESES.length} chunks, hay ${chunks.length}`);
    const meta = JSON.parse(await redis.get("licitaciones:meta"));
    assert.ok(meta.last_full && meta.last_sync, "meta sin sellos de sincronización");
    assert.strictEqual(Object.keys(meta.porMes).length, MESES.length, "faltan meses en la auditoría");
    for (const mes of MESES) {
      assert.strictEqual(meta.porMes[mes].leidas, 120, `${mes}: leídas ${meta.porMes[mes].leidas} ≠ 120 esperadas`);
      assert.strictEqual(meta.porMes[mes].esperados, 120, `${mes}: count(*) no auditado`);
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
      // el consorcio (K = suma de integrantes) alcanza procesos que Helder solo no
      assert.ok(rJ.cuerpo.total >= cH.total, "el consorcio no puede ver menos que Helder");
    }

    /* d'. delta: fila nueva + cambio de estado (reemplazo) */
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
      // sin blacklist) — así el reemplazo por :updated_at se prueba de verdad
      const abierta = ds.find((f) => f.estado_del_procedimiento === "Publicado"
        && f.codigo_principal_de_categoria === "V1.72141000"
        && /^Construcción/.test(f.nombre_del_procedimiento)
        && /Licitación pública/.test(f.modalidad_de_contratacion)
        && !f.id_del_proceso.includes("NUEVA"));
      abierta.estado_del_procedimiento = "Adjudicado";
      abierta[":updated_at"] = new Date().toISOString();

      const rd = await invocar(sync, "/api/sync?modo=delta&presupuesto=20000&chain=0");
      assert.strictEqual(rd.cuerpo.ok, true, `delta falló: ${JSON.stringify(rd.cuerpo)}`);
      assert.strictEqual(rd.cuerpo.done, true, "delta quedó parcial");
      assert.ok(rd.cuerpo.delta.guardadas >= 2, `delta debía guardar ≥2 filas, guardó ${rd.cuerpo.delta.guardadas}`);

      const todas = await todasLasOportunidades("perfil=helder");
      assert.ok(todas.some((l) => l.id_del_proceso === nuevaId), "la fila nueva del delta no aparece");
      assert.ok(!todas.some((l) => l.id_del_proceso === abierta.id_del_proceso), "la fila adjudicada sigue apareciendo");
    }

    /* e. la raíz sirve el frontend (Vercel: /public es el output estático) */
    {
      const html = fs.readFileSync(path.join(__dirname, "..", "public", "index.html"), "utf8");
      for (const debe of ['id="gate"', 'id="app"', "/app.js", "cdn.tailwindcss.com", 'id="btn-buscar"']) {
        assert.ok(html.includes(debe), `index.html sin ${debe}`);
      }
      const js = fs.readFileSync(path.join(__dirname, "..", "public", "app.js"), "utf8");
      new Function(js); // valida sintaxis sin ejecutar
      assert.ok(js.includes('"231105"'), "app.js sin la clave de acceso");
      const vercel = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "vercel.json"), "utf8"));
      for (const fn of Object.keys(vercel.functions)) {
        assert.ok(fs.existsSync(path.join(__dirname, "..", fn)), `vercel.json apunta a ${fn} inexistente`);
      }
      assert.ok(vercel.crons.some((c) => c.path === "/api/sync"), "falta el cron de /api/sync");
    }

    return { invocaciones, chunks: chunks.length, corpus: meta.total, leidas: meta.leidas, ms: Date.now() - t0 };
  }

  /* f. contexto: sin CLI de Vercel ni salida a datos.gov.co en este entorno →
     las 4 iteraciones corren contra los mocks locales con los handlers reales. */
  console.log(`Mock Socrata en :${puertoSocrata} · mock Upstash en :${puertoUpstash} · ${MESES.length} meses × 120 filas`);
  const resultados = [];
  for (let i = 1; i <= objetivo; i++) {
    const r = await iteracion(i);
    resultados.push(r);
    console.log(`✔ iteración ${i}/${objetivo}: full en ${r.invocaciones} invocaciones reanudables · ${r.chunks} chunks · corpus ${r.corpus}/${r.leidas} filas · ${r.ms} ms`);
  }
  console.log(`\nTODAS LAS ITERACIONES PASARON (${objetivo}/${objetivo}) · peticiones Socrata simuladas: ${socrata.peticiones()}`);
  socrata.server.close();
  upstash.server.close();
}

main().catch((e) => { console.error("\n✘ FALLO:", e.message); process.exit(1); });
