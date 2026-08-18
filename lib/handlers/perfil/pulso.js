/* lib/handlers/perfil/pulso.js · GET /api/perfil?op=pulso&perfil=… (ago 2026)
   ─────────────────────────────────────────────────────────────────────────────
   El PULSO PERSONALIZADO: lo que el tablero enseña arriba del todo nada más
   entrar — «para su empresa hoy: N licitaciones · $X en juego · N cierran esta
   semana», dónde están y quién las publica. Nació del encargo del dueño (ago
   2026): la portada del mercado entero salía ANTES de que la persona eligiera
   cómo entrar, y una vez dentro no había ninguna cifra SUYA a la vista. Ahora
   la primera pantalla es la puerta de entrada y las cifras aparecen DESPUÉS,
   personalizadas al RUP (o al perfil manual, o al del dueño, o al consorcio).

   Reglas:
   · NO reimplementa el conteo: llama a `contarOportunidades` (la misma
     cascada + puertas de la puerta de entrada y del listado). Hay prueba de
     que `total` es EXACTAMENTE el `total` de /api/procesos?op=listar para el
     mismo perfil.
   · Público, como la entrada: publica conteos y sumas de procesos PÚBLICOS
     agrupados; ninguna cifra del perfil (patrimonio, K…) sale por aquí. El
     canal de inferencia por P3 es el mismo ya aceptado para el listado.
   · Perfil dinámico (`rup_…`) y consorcio (`cons_…`) se resuelven como en el
     listado: caducado → 404 con `perfil_caducado:true` (la web olvida el
     guardado). Redis caído NO es «caducado» (502).
   · Caché `pulso:{perfil}` (TTL 10 min): el conteo recorre el corpus entero;
     una carga de RUP del dueño la borra junto con la del resumen. */
"use strict";

const { crearRedis, hayCredenciales } = require("../../redis.js");
const { PERFILES, recargarPerfiles } = require("../../perfiles.js");
const { esPerfilDinamico, cargarPerfilDinamico } = require("../../perfil_dinamico.js");
const { esConsorcio, cargarConsorcio } = require("../../consorcio.js");
const { contarOportunidades } = require("./entrada.js");
const { autorizarToken } = require("../../auth.js");
const { derivarUnspsc } = require("../../config_rup.js");
const { crp } = require("../../capacidad.js");

/* ═══ LA EMPRESA EN CIFRAS (Mi empresa como pestaña principal, ago 2026) ═══
   El registro de proponente resumido en números, para pintarlo bajo el pulso:
   tipos de trabajo inscritos, familias, experiencia acreditada (salarios
   mínimos), contratos acreditados y tope. Patrimonio y capacidad de
   contratación son CIFRAS DEL PERFIL (la regla del token): viajan solo con
   token válido, o para un perfil `rup_…` (quien tiene el id lo subió — la
   puerta de entrada ya se las devuelve); un `cons_…` mezcla perfiles del dueño
   y exige token. Se calcula FUERA de la
   caché `pulso:{perfil}`: la caché es por perfil, no por credencial, y un
   cuerpo cacheado con las finanzas se serviría a quien no mandó token. */
function empresaEnCifras(perfil, p, finanzasVisibles) {
  if (!p) return null;
  const codigos = p.unspsc instanceof Set ? [...p.unspsc] : Array.isArray(p.unspsc) ? p.unspsc : [];
  const d = derivarUnspsc(codigos);
  const k = finanzasVisibles ? crp(p, 0) : null;
  const numONull = (v) => (Number.isFinite(Number(v)) && v !== null && v !== "" ? Number(v) : null);
  return {
    id: perfil,
    nombre: p.nombre || null,
    naturaleza: p.naturaleza || null,
    tipos_de_trabajo: d.clases.length,
    familias: d.familias.length,
    experiencia_smmlv: numONull(p.expSMMLV),
    contratos_acreditados: numONull(p.contratosRup),
    tope_smmlv: numONull(p.topeSMMLV),
    finanzas_visibles: !!finanzasVisibles,
    patrimonio: finanzasVisibles ? numONull(p.patrimonio) : null,
    capacidad_contratacion: finanzasVisibles && k != null && Number.isFinite(k) ? Math.round(k) : null,
    // el corte del RUP no viaja en el perfil: se declara «sin dato», no se inventa
    corte: p.corte || null,
  };
}

const TTL_SEG = 600;
const clave = (perfil) => `pulso:${perfil}`;
const PERFIL_RE = /^[a-z0-9_-]{2,60}$/i;

module.exports = async function handler(req, res) {
  const q = req.query || {};
  res.setHeader("Cache-Control", "no-store");
  if (String(req.method || "GET").toUpperCase() !== "GET") { res.setHeader("Allow", "GET"); return res.status(405).json({ ok: false, error: "Use GET ?perfil=…" }); }
  const perfil = String(q.perfil || "").trim();
  if (!PERFIL_RE.test(perfil)) return res.status(400).json({ ok: false, error: "Falta ?perfil= (el perfil cuyas licitaciones se resumen)." });
  if (!hayCredenciales()) return res.status(503).json({ ok: false, error: "Faltan credenciales de Upstash Redis." });
  const redis = crearRedis({});
  const t0 = Date.now();
  /* token OPCIONAL, como en el listado: presente e inválido → 401 (quien lo
     mandó tiene que enterarse); ausente → sin las cifras del perfil */
  const tokenPresente = !!((req.headers && req.headers["x-historico-token"]) || q.token);
  let finanzasVisibles = false;
  if (tokenPresente) {
    const permiso = autorizarToken(req, q);
    if (!permiso.ok) return res.status(permiso.status).json({ ok: false, error: permiso.error, como_autenticar: permiso.como_autenticar });
    finanzasVisibles = true;
  }
  /* un perfil `rup_…` es de quien lo subió (la puerta de entrada ya le devolvió
     estas cifras); un consorcio `cons_…` mezcla perfiles del dueño → token */
  if (esPerfilDinamico(perfil)) finanzasVisibles = true;
  try {
    let cacheado = null;
    if (String(q.refrescar || "") !== "1") {
      const raw = await redis.get(clave(perfil));
      if (raw) {
        try {
          const j = typeof raw === "string" ? JSON.parse(raw) : raw;
          if (j && j.generado) cacheado = j;
        } catch { /* caché ilegible: se recalcula */ }
      }
    }
    await recargarPerfiles(redis);
    if (cacheado) {
      // la caché nunca lleva `empresa`: se resuelve por petición (depende del token) y no del corpus
      let perfilVivo = PERFILES[perfil] || null;
      if (!perfilVivo && esConsorcio(perfil) && (await cargarConsorcio(redis, perfil))) perfilVivo = PERFILES[perfil] || null;
      if (!perfilVivo && esPerfilDinamico(perfil) && (await cargarPerfilDinamico(redis, perfil))) perfilVivo = PERFILES[perfil] || null;
      const { empresa: _e, ...resto } = cacheado;
      return res.status(200).json({ ...resto, empresa: empresaEnCifras(perfil, perfilVivo, finanzasVisibles), cache: true, edad_segundos: Math.round((Date.now() - Date.parse(cacheado.generado)) / 1000) });
    }
    if (esConsorcio(perfil) && !(await cargarConsorcio(redis, perfil))) {
      return res.status(404).json({ ok: false, perfil_caducado: true, error: "Ese consorcio ya no existe (se borró o alguno de sus integrantes caducó)." });
    }
    if (esPerfilDinamico(perfil) && !(await cargarPerfilDinamico(redis, perfil))) {
      return res.status(404).json({ ok: false, perfil_caducado: true, error: "El perfil de este RUP no existe o ya caducó (los perfiles subidos por PDF duran 45 días). Suba su RUP de nuevo desde la página de inicio." });
    }
    if (!Object.prototype.hasOwnProperty.call(PERFILES, perfil)) return res.status(404).json({ ok: false, error: "Perfil no configurado." });
    const empresa = empresaEnCifras(perfil, PERFILES[perfil], finanzasVisibles);
    const r = await contarOportunidades(redis, perfil, PERFILES[perfil], Date.now());
    const salida = {
      ok: true, perfil, generado: new Date().toISOString(), ttl_segundos: TTL_SEG,
      corpus_vacio: !!r.corpus_vacio,
      total: r.total, valorTotal: r.valorTotal, conCapacidadSuficiente: r.conCapacidadSuficiente,
      visibles: r.visibles, muestra: r.muestra,
      // lo que el filtro por defecto del listado (suministro apagado) deja fuera: el usuario puede encenderlo en la lista
      ocultosPorFiltroDefecto: r.ocultosPorFiltroDefecto == null ? 0 : r.ocultosPorFiltroDefecto,
      ...(r.agregados || {}),
      duracion_ms: Date.now() - t0,
      como_leerlo: "Los procesos VIABLES para este perfil (pasan las cuatro puertas: registro de proponente, capacidad, caja y competencia), agrupados. «total» es exactamente el total del listado sin filtros; el dinero es la suma de los presupuestos oficiales publicados (una cuantía no publicada suma 0 y cuenta como proceso). Cada fila enlaza a la lista filtrada por ese departamento o entidad.",
    };
    try { await redis.set(clave(perfil), JSON.stringify(salida), { ex: TTL_SEG }); } catch { /* caché opcional */ }
    return res.status(200).json({ ...salida, empresa, cache: false });
  } catch (e) {
    return res.status(502).json({ ok: false, error: `No se pudo calcular el pulso: ${e.message}` });
  }
};
module.exports.CLAVE = clave;
module.exports.TTL_SEG = TTL_SEG;
