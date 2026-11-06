/* ============================================================================
   lib/datos_publicos_empresa · Los datos de los formatos que ya son públicos, por NIT (6-nov-2026)
   ----------------------------------------------------------------------------
   POR QUÉ. Los formatos del pliego piden razón social, NIT con dígito de
   verificación, representante legal y su cédula, dirección, ciudad, teléfono y
   correo (lib/handlers/perfil/empresa_datos). El usuario los escribía a mano para
   su empresa y para cada integrante de un consorcio. Dos fuentes gratuitas de
   datos.gov.co ya los tienen (tarea 8 del plan del 6-nov-2026):
     · c82u-588k, el RUES de Confecámaras (registro mercantil): razón social, NIT,
       dígito de verificación, representante legal y su documento, estado y
       renovación de la matrícula, organización jurídica. 9.436.330 filas,
       actualizado al 2-oct-2026 (medido el 6-nov-2026).
     · qmzu-gj57, los proveedores registrados en SECOP II: dirección, municipio,
       teléfono y correo. Lo escribe la propia empresa al registrarse.

   QUÉ SE TOMA DE CADA UNA, Y POR QUÉ. La IDENTIDAD sale solo del RUES, que es el
   registro oficial: en SECOP II, ICARO CONSTRUCCIONES SAS (NIT 900865276), una
   S.A.S. de Bogotá, figura como «Persona Jurídica Extranjera sin domicilio en
   Colombia» y con la propia empresa como representante legal (medido el
   6-nov-2026). De SECOP II solo el CONTACTO (dirección, ciudad, teléfono, correo),
   que el RUES abierto no publica. «No Provisto» y «No Definido» son sin dato.

   NADA SE GUARDA AQUÍ: devuelve SUGERENCIAS, cada una con su fuente y su fecha, y
   la pantalla las pone solo en los campos vacíos para que el usuario las revise
   contra su certificado y guarde. Si una fuente no responde, se dice; lo que no
   está no se inventa. Función de red con `fetchImpl` inyectable (como lib/secop1).
   ========================================================================== */
"use strict";

const { crearCliente } = require("./socrata.js");
const { norm } = require("./semantica.js");

const RUES = "c82u-588k";
const PROVEEDORES = "qmzu-gj57";
const base = (ds) => `https://www.datos.gov.co/resource/${ds}.json`;
const TIEMPO_MAX_MS = parseInt(process.env.DATOS_PUBLICOS_TIEMPO_MS, 10) || 12000;
const SIN_DATO = new Set(["", "no provisto", "no definido", "no aplica", "n/a", "na", "0"]);
const texto = (v) => String(v == null ? "" : v).replace(/\s+/g, " ").trim();
const conDato = (v) => (SIN_DATO.has(norm(texto(v))) ? null : texto(v));

/* «900865276», «900.865.276-2» o «900865276-2» → { nit: "900865276", dv: "2"|null }; null si no es un NIT */
function leerNit(entrada) {
  const t = texto(entrada);
  const m = t.match(/^(\d[\d.\s]{4,14}\d)(?:\s*-\s*(\d))?$/);
  if (!m) return null;
  const nit = m[1].replace(/\D/g, "");
  return nit.length >= 6 && nit.length <= 12 ? { nit, dv: m[2] || null } : null;
}
/* 900865276 + 2 → «900.865.276-2» (como lo escribe el certificado) */
function nitConPuntos(nit, dv) {
  const conPuntos = nit.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return dv != null && dv !== "" ? `${conPuntos}-${dv}` : conPuntos;
}
/* «2024/04/01 23:51:37.370000000» o «20260325» → «2026-03-25»; null si no se lee */
function fechaDe(v) {
  const t = texto(v);
  let m = t.match(/^(\d{4})[/-](\d{2})[/-](\d{2})/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  m = t.match(/^(\d{4})(\d{2})(\d{2})$/);
  return m ? `${m[1]}-${m[2]}-${m[3]}` : null;
}

/* De varias matrículas con el mismo NIT: la ACTIVA, la renovada más tarde, la actualizada más tarde. */
function mejorMatricula(filas) {
  const activas = filas.filter((f) => norm(f.estado_matricula) === "activa");
  const pool = activas.length ? activas : filas;
  return [...pool].sort((a, b) => (Number(b.ultimo_ano_renovado) || 0) - (Number(a.ultimo_ano_renovado) || 0)
    || String(fechaDe(b.fecha_actualizacion) || "").localeCompare(String(fechaDe(a.fecha_actualizacion) || "")))[0] || null;
}
/* De varias cuentas de SECOP II: la activa con más datos de contacto. */
function mejorCuenta(filas) {
  const puntos = (f) => ["direccion", "municipio", "telefono", "correo"].filter((k) => conDato(f[k])).length + (norm(f.esta_activa) === "si" ? 10 : 0);
  return [...filas].sort((a, b) => puntos(b) - puntos(a) || String(b.fecha_creacion || "").localeCompare(String(a.fecha_creacion || "")))[0] || null;
}

function conTiempo(promesa, ms) {
  let t;
  return Promise.race([promesa, new Promise((_, no) => { t = setTimeout(() => no(new Error(`sin respuesta en ${ms} ms`)), ms); })]).finally(() => clearTimeout(t));
}
async function pedirPorNit(ds, nit, campos, { fetchImpl, log, tiempoMs }) {
  const c = crearCliente({ baseUrl: base(ds), fetchImpl, log });
  const filas = await conTiempo(c.pedir({ "$select": campos.join(","), "$where": `nit='${nit}'`, "$limit": "20" }, `${ds} por NIT`, { plazoMs: tiempoMs }), tiempoMs);
  if (!Array.isArray(filas)) throw new Error("la respuesta no es una lista");
  return filas;
}
const CAMPOS_RUES = ["camara_comercio", "matricula", "razon_social", "nit", "digito_verificacion", "estado_matricula", "ultimo_ano_renovado",
  "fecha_renovacion", "organizacion_juridica", "representante_legal", "num_identificacion_representante_legal", "clase_identificacion_rl", "fecha_actualizacion"];
const CAMPOS_PROVEEDORES = ["nombre", "nit", "esta_activa", "fecha_creacion", "direccion", "municipio", "departamento", "telefono", "correo"];

/* → { ok, nit, sugeridos: { campo: { valor, fuente } }, avisos: [], fuentes: { rues, secop } }
   ok:false solo si el NIT no se lee; una fuente caída va en `fuentes.*.error` y en `avisos`. */
async function datosPublicosPorNit(entrada, { fetchImpl, log = () => {}, ahora = Date.now(), tiempoMs = TIEMPO_MAX_MS } = {}) {
  const n = leerNit(entrada);
  if (!n) return { ok: false, motivo: "Escriba el NIT de la empresa (solo números; el dígito de verificación puede ir después del guion)." };
  const [rues, secop] = await Promise.allSettled([
    pedirPorNit(RUES, n.nit, CAMPOS_RUES, { fetchImpl, log, tiempoMs }),
    pedirPorNit(PROVEEDORES, n.nit, CAMPOS_PROVEEDORES, { fetchImpl, log, tiempoMs }),
  ]);
  const sugeridos = {};
  const avisos = [];
  const fuentes = {
    rues: { dataset: RUES, nombre: "RUES (Confecámaras)", filas: rues.status === "fulfilled" ? rues.value.length : null, error: rues.status === "rejected" ? String((rues.reason && rues.reason.message) || rues.reason).slice(0, 160) : null },
    secop: { dataset: PROVEEDORES, nombre: "Proveedores registrados en SECOP II", filas: secop.status === "fulfilled" ? secop.value.length : null, error: secop.status === "rejected" ? String((secop.reason && secop.reason.message) || secop.reason).slice(0, 160) : null },
  };
  const m = rues.status === "fulfilled" ? mejorMatricula(rues.value) : null;
  if (m) {
    const actualizado = fechaDe(m.fecha_actualizacion);
    const fuente = `RUES (Confecámaras), matrícula ${texto(m.matricula) || "sin número"} de la Cámara de Comercio de ${texto(m.camara_comercio) || "sin dato"}${actualizado ? `, dato actualizado el ${actualizado}` : ""}`;
    const pon = (campo, valor) => { if (valor) sugeridos[campo] = { valor, fuente }; };
    pon("razon_social", conDato(m.razon_social));
    // el dígito se lee aparte: «0» es un dígito de verificación real (PROYCON), no un «sin dato»
    const dv = /^\d$/.test(texto(m.digito_verificacion)) ? texto(m.digito_verificacion) : null;
    pon("nit", nitConPuntos(n.nit, dv));
    if (n.dv && dv && n.dv !== dv) avisos.push(`El dígito de verificación que escribió (${n.dv}) no es el del RUES (${dv}): confírmelo en el certificado.`);
    pon("representante_legal", conDato(m.representante_legal));
    pon("representante_documento", conDato(m.num_identificacion_representante_legal));
    const org = norm(m.organizacion_juridica);
    if (org) pon("tipo_proponente", /persona natural/.test(org) ? "persona_natural" : "persona_juridica");
    if (norm(m.estado_matricula) !== "activa") avisos.push(`El RUES tiene la matrícula ${texto(m.matricula)} en estado «${texto(m.estado_matricula) || "sin dato"}».`);
    const anoHoy = Number(new Date(ahora).toISOString().slice(0, 4));
    const ren = Number(m.ultimo_ano_renovado);
    if (Number.isFinite(ren) && ren > 0 && ren < anoHoy) avisos.push(`El RUES dice que la matrícula se renovó por última vez en ${ren}: confirme que esté renovada este año.`);
  } else if (rues.status === "fulfilled") {
    avisos.push("El RUES no tiene una matrícula con ese NIT.");
  }
  const s = secop.status === "fulfilled" ? mejorCuenta(secop.value) : null;
  if (s) {
    const creada = texto(s.fecha_creacion).slice(0, 10);
    const fuente = `registro de proveedores de SECOP II, escrito por la empresa${creada ? ` (cuenta creada el ${creada})` : ""}`;
    const pon = (campo, valor) => { if (valor) sugeridos[campo] = { valor, fuente }; };
    pon("direccion", conDato(s.direccion));
    pon("ciudad", conDato(s.municipio));
    pon("telefono", conDato(s.telefono));
    pon("correo", conDato(s.correo));
    // la razón social solo si el RUES no la dio (la identidad es del RUES)
    if (!sugeridos.razon_social) pon("razon_social", conDato(s.nombre));
  } else if (secop.status === "fulfilled") {
    avisos.push("SECOP II no tiene un proveedor registrado con ese NIT: la dirección, el teléfono y el correo no salen de ahí.");
  }
  if (fuentes.rues.error) avisos.push(`No se pudo consultar el RUES en datos.gov.co: ${fuentes.rues.error}`);
  if (fuentes.secop.error) avisos.push(`No se pudo consultar SECOP II en datos.gov.co: ${fuentes.secop.error}`);
  return { ok: true, nit: n.nit, sugeridos, avisos, fuentes, consultado_el: new Date(ahora).toISOString() };
}

module.exports = { datosPublicosPorNit, leerNit, nitConPuntos, mejorMatricula, mejorCuenta, RUES, PROVEEDORES };
