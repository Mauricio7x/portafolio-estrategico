/* ============================================================================
   /api/apu/[accion] · Editor de APU: catálogo, inferencia, cálculo y borradores
   ----------------------------------------------------------------------------
     GET  /api/apu/catalogo    ítems + insumos + regiones  (PÚBLICO)
       …?insumo=cemento_gris_50kg   los precios de UN insumo
       …?region=costa_atlantica     los factores de UNA región
       …?bloque=items|insumos|regiones
     POST /api/apu/inferir     objeto del proceso → tipología + ítems sugeridos
     POST /api/apu/calcular    presupuesto completo con desglose por ítem
     POST /api/apu/guardar     guarda el borrador (TTL 30 días)
     GET  /api/apu/cargar?id=  recupera un borrador
     GET  /api/apu/listar      borradores vigentes del perfil

   POR QUÉ UNA SOLA FUNCIÓN Y NO SEIS ARCHIVOS
   -------------------------------------------
   El plan Hobby de Vercel admite **12 Serverless Functions por despliegue** y
   el repositorio ya está en 12. Un archivo más y falla el despliegue ENTERO, no
   el endpoint nuevo. Una ruta DINÁMICA (`[accion].js`) cuenta como UNA sola y
   conserva exactamente las URL de todas las acciones, sin reescrituras en
   `vercel.json`.

   `/api/apu/catalogo` vivía en su propio archivo y se plegó aquí por eso mismo.
   **Su contrato no cambia**: misma URL, mismos parámetros, mismas respuestas y
   —lo importante— sigue siendo PÚBLICO.

   `accion` se lee de `req.query` (que es de donde la saca Vercel) Y, si falta,
   del PATH. Lo segundo no es adorno: la suite de pruebas invoca los handlers
   directamente y no hay enrutador que rellene el parámetro. Un handler que solo
   funcione detrás del enrutador es un handler que no se puede probar.

   ── AUTORIZACIÓN: `catalogo` PÚBLICO, el resto con token ──────────────────
   No es una excepción a la regla del proyecto, es la regla. Lo que no sale sin
   llave son las CIFRAS DEL PERFIL —patrimonio, K, CRPC, tope— y lo derivado del
   histórico del dueño. El catálogo son precios de referencia de mercado, los
   mismos que publica cualquier revista de construcción; escribirlos sí exige
   llave (`/api/admin/apu/cargar-catalogo`).

   Las otras cinco acciones sí la exigen: `inferir` y `calcular` son la máquina
   de armar una oferta, y `guardar`/`cargar`/`listar` tocan los borradores de un
   perfil concreto. El gate 231105 de la web es una cortesía del navegador y no
   protege ninguna API.
   ========================================================================== */
"use strict";

const { crearRedis, hayCredenciales } = require("../../lib/redis.js");
const { autorizarToken } = require("../../lib/auth.js");
const { CLAVES, APU_TTL_SEG, escribirJSONComprimido, leerJSONComprimido, descomprimir } = require("../../lib/almacen.js");
const { idCanonico, PERFILES } = require("../../lib/perfiles.js");
const {
  SEMILLA, obtenerCatalogo, obtenerPreciosInsumo, obtenerFactoresRegion,
} = require("../../lib/apu/catalogo.js");
const { inferir } = require("../../lib/apu/inferencia.js");
const { calcularPresupuesto, normalizarCatalogo } = require("../../lib/apu/calculo.js");
const {
  departamentosConocidos, departamentosConRegion, meta: metaTipologias,
} = require("../../lib/apu/tipologias.js");

const MAX_BYTES = 2 * 1024 * 1024;   // 2 MB de cuerpo; el tope de Vercel es 4,5
const MAX_ITEMS = 400;               // un presupuesto de obra menor no pasa de ~150
const MAX_PRESUPUESTOS = 100;        // tope del listado
const ACCIONES = ["catalogo", "inferir", "calcular", "guardar", "cargar", "listar"];
const PUBLICAS = ["catalogo"];

const AVISO = "Precios de REFERENCIA regionalizada, no cotizaciones. Verifique contra cotización real "
  + "antes de presentar oferta. El costo directo NO incluye AIU ni los costos ocultos "
  + "(contribución del 5 %, estampillas, pólizas, financiación): ver docs/APU_Y_RENTABILIDAD.md.";

const NO_CARGADO = {
  ok: false,
  cargado: false,
  error: "El catálogo APU no está cargado en Redis.",
  siguiente_paso: "Un administrador debe llamar POST /api/admin/apu/cargar-catalogo con el token, "
    + "o pulsar «Cargar catálogo APU» en /admin.html.",
};

/* El id lo propone el cliente; se sanea aquí porque forma parte de una clave de
   Redis. Sin esto, un id con «:» o «*» podría escribir fuera de su keyspace o
   hacer que el patrón del listado devuelva de más. */
const ID_RE = /^[a-zA-Z0-9_-]{1,48}$/;

function accionDe(req, q) {
  if (q && q.accion) return String(q.accion).toLowerCase();
  const ruta = String((req && req.url) || "").split("?")[0].replace(/\/+$/, "");
  return ruta.slice(ruta.lastIndexOf("/") + 1).toLowerCase();
}

/* Vercel deja `req.body` parseado con Content-Type JSON, pero no siempre (ni en
   las pruebas): se cubren los tres casos —objeto, cadena y stream—. Es el mismo
   lector de /api/admin/rup y por el mismo motivo. */
async function leerCuerpo(req) {
  if (req.body !== undefined && req.body !== null && typeof req.body === "object") {
    return { ok: true, datos: req.body };
  }
  let crudo = typeof req.body === "string" ? req.body : null;
  if (crudo === null) {
    crudo = await new Promise((resolve, reject) => {
      let buf = "", exceso = false;
      if (typeof req.on !== "function") return resolve("");
      req.on("data", (c) => {
        if (exceso) return;
        buf += c;
        if (Buffer.byteLength(buf, "utf8") > MAX_BYTES) { exceso = true; buf = ""; }
      });
      req.on("end", () => resolve(exceso ? null : buf));
      req.on("error", reject);
    });
    if (crudo === null) return { ok: false, status: 413, error: "Body demasiado grande.", max_mb: 2 };
  }
  if (!String(crudo || "").trim()) return { ok: true, datos: {} };
  try { return { ok: true, datos: JSON.parse(crudo) }; }
  catch (e) { return { ok: false, status: 400, error: `Body no es JSON válido: ${e.message}` }; }
}

function perfilDe(q, cuerpo) {
  const crudo = String((cuerpo && cuerpo.perfil) || q.perfil || "helder").toLowerCase();
  const id = idCanonico(crudo);
  return PERFILES[id] ? id : null;
}

/* El catálogo con el que se calcula: Redis si está cargado, la semilla del
   repositorio si no. La VÍA viaja siempre en la respuesta — un precio sin su
   origen no se puede discutir, que es la misma regla de `granularidad_utilizada`
   del índice de baja. */
async function catalogoParaCalcular(redis) {
  try {
    const c = await obtenerCatalogo(redis);
    if (c && c.cargado) return normalizarCatalogo(c);
  } catch { /* Redis caído: la semilla sirve igual y la respuesta lo dirá */ }
  return null;
}

module.exports = async function handler(req, res) {
  const q = req.query || {};
  const accion = accionDe(req, q);

  if (!ACCIONES.includes(accion)) {
    res.setHeader("Cache-Control", "no-store");
    return res.status(404).json({ ok: false, error: `Acción «${accion}» desconocida.`, acciones: ACCIONES });
  }

  const publica = PUBLICAS.includes(accion);
  if (publica) {
    // el catálogo solo cambia cuando alguien lo recarga: cachear es correcto
    res.setHeader("Cache-Control", "public, max-age=300, stale-while-revalidate=3600");
  } else {
    res.setHeader("Cache-Control", "no-store");
    const permiso = autorizarToken(req, q);
    if (!permiso.ok) {
      return res.status(permiso.status).json({
        ok: false, error: permiso.error, como_autenticar: permiso.como_autenticar,
      });
    }
  }

  const metodo = String(req.method || "GET").toUpperCase();
  const esPost = ["inferir", "calcular", "guardar"].includes(accion);
  if (esPost && metodo !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ ok: false, error: `«${accion}» exige POST.` });
  }
  if (!esPost && metodo !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ ok: false, error: `«${accion}» exige GET.` });
  }

  if (!hayCredenciales()) {
    return res.status(503).json({ ok: false, error: "Faltan credenciales de Upstash Redis en el despliegue." });
  }
  const redis = crearRedis({});

  const cuerpo = esPost ? await leerCuerpo(req) : { ok: true, datos: {} };
  if (!cuerpo.ok) return res.status(cuerpo.status).json({ ok: false, error: cuerpo.error });
  const datos = cuerpo.datos || {};

  /* ══════════════════ catálogo (PÚBLICO) ══════════════════
     Mismo contrato que tenía en su archivo propio: los tres cortes por
     parámetro y el catálogo entero. Un 503 con `siguiente_paso` cuando no está
     cargado, nunca un 200 con listas vacías — un `[]` afirmaría «no hay
     insumos», que es distinto de «no lo he cargado». */
  if (accion === "catalogo") {
    try {
      if (q.insumo) {
        const i = await obtenerPreciosInsumo(redis, q.insumo);
        if (!i) {
          return res.status(404).json({
            ok: false,
            error: `No existe el insumo «${q.insumo}» en el catálogo cargado.`,
            nota: "Consulte GET /api/apu/catalogo?bloque=insumos para ver los identificadores disponibles.",
          });
        }
        return res.status(200).json({ ok: true, insumo: i, aviso: AVISO });
      }

      if (q.region) {
        const r = await obtenerFactoresRegion(redis, q.region);
        if (!r) {
          return res.status(404).json({
            ok: false,
            error: `No existe la región «${q.region}» en el catálogo cargado.`,
            nota: "Consulte GET /api/apu/catalogo?bloque=regiones para ver las regiones disponibles.",
          });
        }
        return res.status(200).json({ ok: true, region: r, aviso: AVISO });
      }

      const cat = await obtenerCatalogo(redis);
      if (!cat || !cat.cargado) return res.status(503).json(NO_CARGADO);

      const base = {
        ok: true, cargado: true, via: cat.via,
        version: cat.meta ? cat.meta.version : null,
        generado: cat.meta ? cat.meta.generado : null,
        aviso: AVISO,
      };
      const bloque = String(q.bloque || "").toLowerCase();
      if (bloque === "items") return res.status(200).json({ ...base, items: cat.items });
      if (bloque === "insumos") return res.status(200).json({ ...base, insumos: cat.insumos });
      if (bloque === "regiones") return res.status(200).json({ ...base, regiones: cat.regiones });

      return res.status(200).json({
        ...base,
        regiones: cat.regiones, insumos: cat.insumos, items: cat.items,
        // lo que el editor necesita además del catálogo de precios y que no
        // vive en Redis: el vocabulario de tipologías y el mapa de departamentos
        tipologias: metaTipologias().tipologias_n,
        departamentos: departamentosConocidos(),
        departamentos_con_region: departamentosConRegion(),
      });
    } catch (e) {
      return res.status(503).json({ ok: false, error: `No se pudo leer el catálogo: ${e.message}` });
    }
  }

  /* ══════════════════ inferir (objeto → ítems) ══════════════════ */
  if (accion === "inferir") {
    const objeto = String(datos.objeto || datos.descripcion || "");
    const r = inferir(objeto, { codigos_unspsc: String(datos.codigos_unspsc || "") });

    // los códigos que devuelve la inferencia se enriquecen con el catálogo:
    // `lib/apu/inferencia` es hoja y no puede leer precios por su cuenta
    const cat = (await catalogoParaCalcular(redis)) || SEMILLA;
    const items = (r.items || []).map((codigo) => {
      const def = (cat.items || []).find((i) => String(i.codigo) === String(codigo)) || null;
      return {
        codigo,
        descripcion: def ? def.descripcion : null,
        unidad: def ? def.unidad : null,
        en_catalogo: !!def,
        cantidad: null,
      };
    });

    return res.status(200).json({ ...r, ok: true, items });
  }

  /* ══════════════════ calcular ══════════════════ */
  if (accion === "calcular") {
    const items = Array.isArray(datos.items) ? datos.items : [];
    if (items.length > MAX_ITEMS) {
      return res.status(400).json({ ok: false, error: `Demasiados ítems (${items.length}). El tope es ${MAX_ITEMS}.` });
    }
    try {
      const catalogo = await catalogoParaCalcular(redis);
      const r = calcularPresupuesto({
        items,
        departamento: String(datos.departamento || ""),
        config: datos.config || {},
        catalogo,
      });
      return res.status(200).json(r);
    } catch (e) {
      return res.status(500).json({ ok: false, error: `No se pudo calcular: ${e.message}` });
    }
  }

  /* ───────── de aquí en adelante, borradores por perfil ───────── */
  const perfil = perfilDe(q, datos);
  if (!perfil) {
    return res.status(400).json({ ok: false, error: "Perfil desconocido. Use helder, genesis o juntos." });
  }

  /* ══════════════════ guardar ══════════════════ */
  if (accion === "guardar") {
    const id = String(datos.id || "").trim() || `pre-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    if (!ID_RE.test(id)) {
      return res.status(400).json({ ok: false, error: "El identificador solo admite letras, números, guion y guion bajo (máx. 48)." });
    }
    const nombre = String(datos.nombre || "").trim().slice(0, 140) || "Presupuesto sin nombre";
    const items = Array.isArray(datos.items) ? datos.items : [];
    if (items.length > MAX_ITEMS) {
      return res.status(400).json({ ok: false, error: `Demasiados ítems (${items.length}). El tope es ${MAX_ITEMS}.` });
    }

    const guardado = new Date().toISOString();
    let versionCatalogo = null;
    try {
      const cat = await obtenerCatalogo(redis);
      versionCatalogo = cat && cat.meta ? cat.meta.version : null;
    } catch { /* sin catálogo el borrador se guarda igual; lo dirá al cargarlo */ }

    const registro = {
      id, perfil, nombre,
      objeto: String(datos.objeto || "").slice(0, 4000),
      departamento: String(datos.departamento || ""),
      entidad: String(datos.entidad || "").slice(0, 300),
      items,
      config: datos.config || {},
      guardado,
      /* El TOTAL se guarda para que el listado no tenga que recalcular 40
         presupuestos. Es una cifra DERIVADA y por eso viaja con el sello del
         catálogo: si los precios cambian, el guardado deja de coincidir con el
         que saldría hoy, y al cargarlo se dice en vez de fingir que sigue
         vigente. */
      total_guardado: Number.isFinite(Number(datos.total)) ? Number(datos.total) : null,
      catalogo_version: versionCatalogo,
    };

    try {
      await escribirJSONComprimido(redis, CLAVES.apuPresupuesto(perfil, id), registro, { ttl: APU_TTL_SEG });
    } catch (e) {
      return res.status(503).json({ ok: false, error: `No se pudo guardar. Reintente. (${e.message})` });
    }
    return res.status(200).json({
      ok: true, guardado: true, id, perfil, nombre,
      expira_en_dias: Math.round(APU_TTL_SEG / 86400),
      nota: `El borrador caduca en ${Math.round(APU_TTL_SEG / 86400)} días. Exporte a Excel lo que quiera conservar más tiempo.`,
    });
  }

  /* ══════════════════ cargar ══════════════════ */
  if (accion === "cargar") {
    const id = String(q.id || "").trim();
    if (!ID_RE.test(id)) {
      return res.status(400).json({ ok: false, error: "Falta el parámetro «id» o tiene caracteres no admitidos." });
    }
    let registro = null;
    try { registro = await leerJSONComprimido(redis, CLAVES.apuPresupuesto(perfil, id)); }
    catch (e) { return res.status(503).json({ ok: false, error: `No se pudo leer: ${e.message}` }); }

    if (!registro) {
      return res.status(404).json({
        ok: false,
        error: `No hay ningún presupuesto «${id}» para el perfil ${perfil}. Puede que haya caducado: los borradores viven ${Math.round(APU_TTL_SEG / 86400)} días.`,
      });
    }
    let vigente = null;
    try {
      const cat = await obtenerCatalogo(redis);
      vigente = cat && cat.meta ? cat.meta.version : null;
    } catch { /* ídem */ }
    const cambiado = !!(registro.catalogo_version && vigente && registro.catalogo_version !== vigente);
    return res.status(200).json({
      ok: true,
      presupuesto: registro,
      catalogo_cambiado: cambiado,
      nota: cambiado
        ? "El catálogo de precios cambió desde que se guardó este presupuesto: vuelva a calcular antes de usar los totales."
        : null,
    });
  }

  /* ══════════════════ listar ══════════════════
     SCAN + MGET sobre las propias claves, sin índice aparte: un índice con TTL
     se desincroniza en cuanto caduca un presupuesto y listaría borradores que
     ya no existen. La clave ES la fuente de verdad. */
  let claves = [];
  try { claves = await redis.scan(CLAVES.patronApuPerfil(perfil)); }
  catch (e) { return res.status(503).json({ ok: false, error: `No se pudo listar: ${e.message}` }); }

  const presupuestos = [];
  let ilegibles = 0;
  for (let i = 0; i < claves.length && presupuestos.length < MAX_PRESUPUESTOS; i += 8) {
    const lote = claves.slice(i, i + 8);
    let valores = [];
    try { valores = await redis.mget(lote); } catch { ilegibles += lote.length; continue; }
    for (const v of valores) {
      if (v == null) { ilegibles++; continue; }
      // `descomprimir` devuelve null ante un valor corrupto en vez de lanzar:
      // un borrador ilegible no puede tumbar el listado entero
      const r = descomprimir(v);
      if (!r || !r.id) { ilegibles++; continue; }
      presupuestos.push({
        id: r.id, nombre: r.nombre, objeto: String(r.objeto || "").slice(0, 160),
        departamento: r.departamento || null, entidad: r.entidad || null,
        items: Array.isArray(r.items) ? r.items.length : 0,
        total_guardado: r.total_guardado ?? null,
        guardado: r.guardado,
        catalogo_version: r.catalogo_version || null,
      });
    }
  }
  presupuestos.sort((a, b) => String(b.guardado).localeCompare(String(a.guardado)));

  return res.status(200).json({
    ok: true, perfil,
    total: presupuestos.length,
    truncado: claves.length > MAX_PRESUPUESTOS,
    ilegibles,
    presupuestos,
    ttl_dias: Math.round(APU_TTL_SEG / 86400),
  });
};
