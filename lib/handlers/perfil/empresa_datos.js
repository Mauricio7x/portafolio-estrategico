/* ============================================================================
   /api/perfil?op=empresa-datos · LOS DATOS QUE VAN EN LOS FORMATOS (27-sep-2026)
   ----------------------------------------------------------------------------
   GET  ?perfil=X                 → { ok, perfil, datos, guardado_el }
   POST { perfil, datos: {…} }    → guarda; un campo vacío se borra
   Con credencial SIEMPRE: son datos de una persona (nombre y cédula del
   representante legal, teléfono, correo) y la regla del repositorio es que sin
   credencial no sale nada del perfil.

   POR QUÉ EXISTE. El dueño eligió que la aplicación llene el formato que
   publica la entidad (lib/formato_entidad). Esos formatos piden razón social,
   NIT, representante legal y su cédula, dirección, ciudad, teléfono y correo,
   y el árbol no tenía ninguno: el NIT es null en los perfiles del dueño
   (lib/perfiles.js) y del registro de proponente no se leen los demás. Lo que
   no existe no se inventa: lo escribe el usuario UNA vez aquí, y el llenado
   usa SOLO lo que él guardó.

   Clave `config:empresa:{perfil}`: cae bajo `config:*`, así que la copia de
   datos (lib/copia_datos) la exporta sin tocarla. Los perfiles dinámicos
   (`rup_…`, que caducan) la guardan con el MISMO TTL que su perfil: un dato de
   una persona no sobrevive al perfil que lo trajo.
   ========================================================================== */
"use strict";

const { crearRedis, hayCredenciales } = require("../../redis.js");
const { autorizarToken } = require("../../auth.js");
const { leerCuerpo } = require("../../cuerpo.js");
const { leerJSON, PERFIL_DINAMICO_TTL_SEG } = require("../../almacen.js");
const { esPerfilDinamico } = require("../../perfil_dinamico.js");

const PERFIL_RE = /^[a-z0-9_-]{2,60}$/i;
const clave = (perfil) => `config:empresa:${perfil}`;

/* Cada campo, con su largo máximo y la forma mínima que tiene que tener. La
   forma es un freno a lo evidente (un correo sin «@», un NIT con letras), no
   una verificación: quien confirma el dato es el usuario contra su certificado. */
const CAMPOS = {
  razon_social: { nombre: "Nombre o razón social", max: 160 },
  nit: { nombre: "NIT", max: 20, forma: /^[0-9][0-9.\- ]{4,18}[0-9]$/, que: "solo números, puntos y el guion del dígito de verificación" },
  representante_legal: { nombre: "Nombre del representante legal", max: 120 },
  representante_documento: { nombre: "Cédula del representante legal", max: 20, forma: /^[0-9A-Za-z][0-9A-Za-z.\- ]{3,18}$/, que: "el número del documento" },
  direccion: { nombre: "Dirección", max: 160 },
  ciudad: { nombre: "Ciudad", max: 80 },
  telefono: { nombre: "Teléfono", max: 40, forma: /^[0-9+][0-9 ()+\-.ext]{5,38}$/i, que: "solo números, espacios, «+», paréntesis o guiones" },
  correo: { nombre: "Correo electrónico", max: 120, forma: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, que: "una dirección de correo como nombre@empresa.co" },
};

/* { ok, datos } | { ok:false, error } — un campo vacío o ausente es null (se borra) */
function validarDatos(d) {
  if (!d || typeof d !== "object" || Array.isArray(d)) return { ok: false, error: "Falta «datos» con los campos de la empresa." };
  const out = {};
  for (const [k, c] of Object.entries(CAMPOS)) {
    const v = d[k] == null ? "" : String(d[k]).replace(/[\u0000-\u001f]/g, " ").replace(/\s+/g, " ").trim();
    if (!v) { out[k] = null; continue; }
    if (v.length > c.max) return { ok: false, error: `«${c.nombre}» es demasiado largo (máximo ${c.max} caracteres).`, campo: k };
    if (c.forma && !c.forma.test(v)) return { ok: false, error: `«${c.nombre}» no tiene la forma esperada: ${c.que}.`, campo: k };
    out[k] = v;
  }
  return { ok: true, datos: out };
}

async function leerDatos(redis, perfil) {
  const j = await leerJSON(redis, clave(perfil));
  return j && typeof j === "object" && j.datos ? j : null;
}

module.exports = async function empresaDatos(req, res) {
  res.setHeader("Cache-Control", "no-store");
  const q = req.query || {};
  const permiso = autorizarToken(req, q);
  if (!permiso.ok) return res.status(permiso.status).json({ ok: false, error: permiso.error, como_autenticar: permiso.como_autenticar });
  if (!hayCredenciales()) return res.status(503).json({ ok: false, error: "Faltan credenciales de Upstash Redis en el despliegue." });
  const redis = crearRedis({});
  const metodo = String(req.method || "GET").toUpperCase();
  if (metodo === "GET") {
    const perfil = String(q.perfil || "").trim();
    if (!PERFIL_RE.test(perfil)) return res.status(400).json({ ok: false, error: "Falta «perfil»." });
    const g = await leerDatos(redis, perfil);
    const vacio = Object.fromEntries(Object.keys(CAMPOS).map((k) => [k, null]));
    return res.status(200).json({ ok: true, perfil, datos: g ? { ...vacio, ...g.datos } : vacio, guardado_el: g ? g.guardado_el || null : null,
      campos: Object.fromEntries(Object.entries(CAMPOS).map(([k, c]) => [k, c.nombre])) });
  }
  if (metodo !== "POST") { res.setHeader("Allow", "GET, POST"); return res.status(405).json({ ok: false, error: "Use GET para leer o POST para guardar." }); }
  const cuerpo = await leerCuerpo(req, { maxBytes: 8 * 1024 });
  if (!cuerpo.ok) return res.status(cuerpo.status).json({ ok: false, error: cuerpo.error });
  const perfil = String((cuerpo.datos && cuerpo.datos.perfil) || q.perfil || "").trim();
  if (!PERFIL_RE.test(perfil)) return res.status(400).json({ ok: false, error: "Falta «perfil»." });
  const v = validarDatos(cuerpo.datos && cuerpo.datos.datos);
  if (!v.ok) return res.status(400).json(v);
  const guardado = { datos: v.datos, guardado_el: new Date().toISOString() };
  const opciones = esPerfilDinamico(perfil) ? { ex: PERFIL_DINAMICO_TTL_SEG } : undefined;
  await redis.set(clave(perfil), JSON.stringify(guardado), opciones);
  return res.status(200).json({ ok: true, perfil, ...guardado });
};
module.exports.CAMPOS = CAMPOS;
module.exports.validarDatos = validarDatos;
module.exports.leerDatos = leerDatos;
module.exports.clave = clave;
