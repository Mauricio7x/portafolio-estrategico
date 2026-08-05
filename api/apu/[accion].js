/* ============================================================================
   /api/apu/[accion] · Editor de APU: catálogo, inferencia, cálculo y borradores
   ----------------------------------------------------------------------------
     GET  /api/apu/catalogo    ítems, insumos, tipologías y departamentos
     POST /api/apu/inferir     objeto del proceso → tipología + ítems sugeridos
     POST /api/apu/calcular    presupuesto completo con desglose por ítem
     POST /api/apu/guardar     guarda el borrador (TTL 30 días)
     GET  /api/apu/cargar?id=  recupera un borrador
     GET  /api/apu/listar      borradores vigentes del perfil

   POR QUÉ UNA SOLA FUNCIÓN Y NO CUATRO ARCHIVOS
   ---------------------------------------------
   El plan Hobby de Vercel admite **12 Serverless Functions por despliegue** y
   este repositorio ya declara 10. Cuatro archivos nuevos serían 14 y el
   despliegue falla entero — no el endpoint nuevo: el despliegue.

   Una ruta DINÁMICA (`[accion].js`) cuenta como UNA sola función y conserva
   exactamente las cuatro URL que pedía el encargo, sin reescrituras en
   `vercel.json`. El repositorio queda en 11, con margen para una más.

   `accion` se lee de `req.query` (que es de donde la saca Vercel) Y, si falta,
   del PATH. Lo segundo no es adorno: la suite de pruebas invoca los handlers
   directamente y no hay enrutador que rellene el parámetro. Un handler que
   solo funcione detrás del enrutador es un handler que no se puede probar.

   PROTEGIDO con el mismo `HISTORICO_TOKEN` que el resto (lib/auth: header
   `x-historico-token` o `?token=`, el header manda si vienen los dos). TODAS
   las acciones, incluidas `catalogo` e `inferir`: son la materia prima con la
   que se arma una oferta, y el gate 231105 de la web es una cortesía del
   navegador que no protege ninguna API. `/api/oportunidades` sigue siendo el
   único endpoint con el token opcional, y sigue siéndolo por su motivo propio
   (los clientes entran por ahí a ver a qué presentarse).
   ========================================================================== */
"use strict";

const { crearRedis, hayCredenciales } = require("../../lib/redis.js");
const { autorizarToken } = require("../../lib/auth.js");
const { CLAVES, APU_TTL_SEG, escribirJSONComprimido, leerJSONComprimido, descomprimir } = require("../../lib/almacen.js");
const { idCanonico, PERFILES } = require("../../lib/perfiles.js");
const catalogo = require("../../lib/apu/catalogo.js");
const { inferir } = require("../../lib/apu/inferencia.js");
const { calcularPresupuesto } = require("../../lib/apu/calculo.js");

const MAX_BYTES = 2 * 1024 * 1024;   // 2 MB de cuerpo; el tope de Vercel es 4,5
const MAX_ITEMS = 400;               // un presupuesto de obra menor no pasa de ~150
const MAX_PRESUPUESTOS = 100;        // tope del listado
const ACCIONES = ["catalogo", "inferir", "calcular", "guardar", "cargar", "listar"];

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

module.exports = async function handler(req, res) {
  const q = req.query || {};
  res.setHeader("Cache-Control", "no-store");

  const permiso = autorizarToken(req, q);
  if (!permiso.ok) {
    return res.status(permiso.status).json({ ok: false, error: permiso.error, como_autenticar: permiso.como_autenticar });
  }

  const accion = accionDe(req, q);
  if (!ACCIONES.includes(accion)) {
    return res.status(404).json({ ok: false, error: `Acción «${accion}» desconocida.`, acciones: ACCIONES });
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

  const cuerpo = esPost ? await leerCuerpo(req) : { ok: true, datos: {} };
  if (!cuerpo.ok) return res.status(cuerpo.status).json({ ok: false, error: cuerpo.error });
  const datos = cuerpo.datos || {};

  /* ══════════════════ catálogo (lo que puebla la UI) ══════════════════ */
  if (accion === "catalogo") {
    return res.status(200).json({
      ok: true,
      meta: catalogo.meta(),
      unidades: catalogo.UNIDADES,
      departamentos: catalogo.departamentosConocidos(),
      tipologias: catalogo.TIPOLOGIAS.map((t) => ({
        codigo: t.codigo, nombre: t.nombre, unidad_dominante: t.unidad_dominante,
        sin_apu: !!t.sin_apu, items: catalogo.itemsDeTipologia(t.codigo).length,
      })),
      items: catalogo.ITEMS.map((i) => ({
        codigo: i.codigo, descripcion: i.descripcion, unidad: i.unidad,
        rendimiento_dia: i.rendimiento_dia, tipologias: i.tipologias,
        articulo_invias: i.articulo_invias || null, verificacion: i.verificacion || null,
      })),
      advertencia: (catalogo.CATALOGO._meta || {}).advertencia || null,
    });
  }

  /* ══════════════════ inferir (objeto → ítems) ══════════════════ */
  if (accion === "inferir") {
    const objeto = String(datos.objeto || datos.descripcion || "");
    const r = inferir(objeto, { codigos_unspsc: String(datos.codigos_unspsc || "") });
    return res.status(200).json({ ok: true, ...r });
  }

  /* ══════════════════ calcular ══════════════════ */
  if (accion === "calcular") {
    const items = Array.isArray(datos.items) ? datos.items : [];
    if (items.length > MAX_ITEMS) {
      return res.status(400).json({ ok: false, error: `Demasiados ítems (${items.length}). El tope es ${MAX_ITEMS}.` });
    }
    try {
      const r = calcularPresupuesto({
        items,
        departamento: String(datos.departamento || ""),
        config: datos.config || {},
      });
      return res.status(200).json(r);
    } catch (e) {
      return res.status(500).json({ ok: false, error: `No se pudo calcular: ${e.message}` });
    }
  }

  /* ───────── de aquí en adelante hace falta Redis ───────── */
  if (!hayCredenciales()) {
    return res.status(503).json({ ok: false, error: "Faltan credenciales de Upstash Redis en el despliegue." });
  }
  const redis = crearRedis({});
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
    const registro = {
      id, perfil, nombre,
      objeto: String(datos.objeto || "").slice(0, 4000),
      departamento: String(datos.departamento || ""),
      entidad: String(datos.entidad || "").slice(0, 300),
      items,
      config: datos.config || {},
      guardado,
      // El TOTAL se guarda para que el listado no tenga que recalcular 40
      // presupuestos. Es una cifra DERIVADA y por eso viaja con su sello: si el
      // catálogo de precios cambia, el guardado deja de coincidir con el que
      // saldría hoy, y el listado lo dice en vez de fingir que sigue vigente.
      total_guardado: Number.isFinite(Number(datos.total)) ? Number(datos.total) : null,
      catalogo_version: (catalogo.CATALOGO._meta || {}).version || null,
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
    const vigente = (catalogo.CATALOGO._meta || {}).version || null;
    return res.status(200).json({
      ok: true,
      presupuesto: registro,
      catalogo_cambiado: !!(registro.catalogo_version && vigente && registro.catalogo_version !== vigente),
      nota: registro.catalogo_version && vigente && registro.catalogo_version !== vigente
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
      // `descomprimir` ya devuelve null ante un valor corrupto en vez de
      // lanzar: un borrador ilegible no puede tumbar el listado entero
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
