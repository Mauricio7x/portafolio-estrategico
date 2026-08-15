/* ============================================================================
   lib/config_rup · Validación del RUP que sube el dueño (archivo JSON)
   ----------------------------------------------------------------------------
   Un RUP mal cargado no rompe la app: la deja MINTIENDO. Un endeudamiento
   escrito como 13 en vez de 0.13, un código UNSPSC de 7 dígitos o una utilidad
   con un cero de más cambian la capacidad K y, con ella, qué procesos se ven —
   sin que nada falle a la vista. Por eso la validación es estricta, campo por
   campo, y NO se detiene en el primer error: acumula todos y los devuelve
   juntos, porque quien corrige un archivo a mano quiere la lista completa, no
   diez viajes de ida y vuelta.

   Dos niveles, a propósito:

     ERRORES       bloquean la carga. Son cosas que harían mentir a la app: tipo
                   equivocado, número imposible, código que no es un UNSPSC.
     ADVERTENCIAS  no bloquean nada; se muestran y se guardan. Son cosas que
                   pueden ser perfectamente correctas y aun así conviene mirar
                   dos veces (un segmento UNSPSC inusual, un tope por debajo de
                   la experiencia acreditada).

   Sobre el tope: `tope_smmlv` es APETITO ESTRATÉGICO, no un límite del RUP —
   los datos reales del repositorio tienen a Helder con experiencia acreditada
   de 6 768 SMMLV y tope 4 000, y a Génesis con 31 594 y tope 2 000. Exigir
   tope ≥ experiencia como ERROR dejaría el RUP REAL del dueño imposible de
   cargar, así que va como ADVERTENCIA. Mismo criterio para el tope del plural
   frente al de sus integrantes.

   El esquema que se valida aquí es EXACTAMENTE el que devuelve
   GET /api/admin/rup: descargar, editar y volver a subir es un ciclo cerrado.
   ========================================================================== */
"use strict";

const { normalizarCodigo } = require("./unspsc.js");

const CLAVES_PERFIL = ["helder", "genesis", "consorcio", "juntos"];
const TIPOS = ["persona_natural", "persona_juridica", "consorcio", "union_temporal"];
const TIPOS_PLURAL = ["consorcio", "union_temporal"];

const MAX_NOMBRE = 200;
const MAX_LIQUIDEZ = 10000;
const MAX_PROFESIONALES = 500;
const MAX_EXPERIENCIA_SMMLV = 1000000;
const CODIGO_RE = /^\d{8}$/;
/* NIT colombiano: dígitos + guion + dígito de verificación. Se admiten los
   puntos de millar con que suele escribirse (900.123.456-7). */
const NIT_RE = /^\d{5,15}-\d$/;
/* Segmentos UNSPSC que existen de verdad (10–95, de dos en dos). Fuera de ese
   rango el código es sospechoso, pero no imposible: advertencia, no error. */
const SEGMENTO_MIN = 10, SEGMENTO_MAX = 95;

/* ---------- utilidades de validación ---------- */
const esNumero = (v) => typeof v === "number" && Number.isFinite(v);
const esEntero = (v) => esNumero(v) && Number.isInteger(v);

function crearAcumulador() {
  const errores = [], advertencias = [];
  return {
    errores, advertencias,
    error(campo, mensaje, valor) {
      errores.push({ campo, error: mensaje, valor_recibido: valor === undefined ? null : valor });
    },
    aviso(mensaje) { advertencias.push(mensaje); },
  };
}

/* Número con cota: devuelve true si validó (para poder encadenar reglas). */
function numero(acc, campo, v, { min = null, max = null, entero = false, exclusivoMin = false, exclusivoMax = false } = {}) {
  if (!esNumero(v)) { acc.error(campo, "debe ser un número", v); return false; }
  if (entero && !esEntero(v)) { acc.error(campo, "debe ser un número entero", v); return false; }
  if (min !== null && (exclusivoMin ? v <= min : v < min)) {
    acc.error(campo, `debe ser ${exclusivoMin ? "mayor que" : "mayor o igual que"} ${min}`, v); return false;
  }
  if (max !== null && (exclusivoMax ? v >= max : v > max)) {
    acc.error(campo, `debe ser ${exclusivoMax ? "menor que" : "menor o igual que"} ${max}`, v); return false;
  }
  return true;
}

/* ---------- UNSPSC ---------- */
function validarUnspsc(acc, base, codigos) {
  if (!Array.isArray(codigos)) {
    acc.error(`${base}.unspsc`, "debe ser un arreglo de códigos UNSPSC de 8 dígitos", codigos);
    return [];
  }
  if (!codigos.length) {
    acc.error(`${base}.unspsc`, "debe tener al menos un código", codigos);
    return [];
  }
  const limpios = [];
  codigos.forEach((c, i) => {
    if (typeof c !== "string" || !CODIGO_RE.test(c)) {
      acc.error(`${base}.unspsc[${i}]`, "debe ser una cadena de exactamente 8 dígitos", c);
      return;
    }
    const seg = parseInt(c.slice(0, 2), 10);
    if (seg < SEGMENTO_MIN || seg > SEGMENTO_MAX) {
      acc.aviso(`${base}.unspsc[${i}] (${c}): el segmento ${c.slice(0, 2)} está fuera del rango habitual del clasificador (${SEGMENTO_MIN}–${SEGMENTO_MAX}). Verifique que no sea un error de transcripción.`);
    }
    limpios.push(c);
  });
  if (new Set(limpios).size !== limpios.length) {
    const vistos = new Set(), dup = new Set();
    for (const c of limpios) { if (vistos.has(c)) dup.add(c); else vistos.add(c); }
    acc.error(`${base}.unspsc`, "no puede tener códigos duplicados", [...dup].join(", "));
  }
  return limpios;
}

/* ---------- indicadores financieros ---------- */
function validarIndicadores(acc, base, ind, { aproximado = false } = {}) {
  if (!ind || typeof ind !== "object" || Array.isArray(ind)) {
    acc.error(`${base}.indicadores`, "es obligatorio y debe ser un objeto", ind);
    return;
  }
  const c = (k) => `${base}.indicadores.${k}`;
  /* Perfil APROXIMADO (puerta de entrada, Fase 2: tres datos tecleados): los
     indicadores que la persona no dio viajan en `null` = «sin dato», y la K
     queda sin dato (lib/capacidad). Fuera de ese modo siguen siendo
     obligatorios: un archivo del dueño con un hueco no puede pasar en silencio.
     El patrimonio es obligatorio SIEMPRE: sin él no hay puerta de caja. */
  const opcional = (k, v, reglas) => (aproximado && v == null ? true : numero(acc, c(k), v, reglas));
  opcional("liquidez", ind.liquidez, { min: 0, max: MAX_LIQUIDEZ, exclusivoMin: true });
  opcional("endeudamiento", ind.endeudamiento, { min: 0, max: 1, exclusivoMax: true });
  opcional("cobertura_intereses", ind.cobertura_intereses, { min: 0 });
  const patOk = numero(acc, c("patrimonio"), ind.patrimonio, { min: 0, entero: true, exclusivoMin: true });
  const utOk = aproximado && ind.utilidad_operacional == null
    ? true
    : numero(acc, c("utilidad_operacional"), ind.utilidad_operacional, { min: 0, entero: true, exclusivoMin: true });
  if (ind.ingreso_operacional != null) {
    const inOk = numero(acc, c("ingreso_operacional"), ind.ingreso_operacional, { min: 0, entero: true, exclusivoMin: true });
    if (inOk && utOk && ind.ingreso_operacional < ind.utilidad_operacional) {
      acc.error(c("ingreso_operacional"),
        "no puede ser menor que la utilidad operacional", ind.ingreso_operacional);
    }
  }
  return patOk && utOk;
}

/* ---------- contratos en ejecución (opcional; no está en el encargo pero el
   RUP real de Helder los tiene y perderlos inflaría su capacidad residual) --- */
function validarSce(acc, base, sce) {
  if (sce === undefined || sce === null) return;
  if (!Array.isArray(sce)) { acc.error(`${base}.sce`, "debe ser un arreglo de contratos en ejecución", sce); return; }
  sce.forEach((c, i) => {
    const b = `${base}.sce[${i}]`;
    if (!c || typeof c !== "object") { acc.error(b, "debe ser un objeto {v, pct, plazoMeses, restanMeses, obra}", c); return; }
    numero(acc, `${b}.v`, c.v, { min: 0, exclusivoMin: true });
    if (c.pct !== undefined) numero(acc, `${b}.pct`, c.pct, { min: 0, max: 100, exclusivoMin: true });
    if (c.plazoMeses !== undefined) numero(acc, `${b}.plazoMeses`, c.plazoMeses, { min: 0, exclusivoMin: true });
    if (c.restanMeses !== undefined) numero(acc, `${b}.restanMeses`, c.restanMeses, { min: 0 });
    if (c.obra !== undefined && typeof c.obra !== "boolean") acc.error(`${b}.obra`, "debe ser true o false", c.obra);
  });
}

/* ---------- un perfil ---------- */
function validarPerfil(acc, clave, p, opciones = {}) {
  const base = `perfiles.${clave}`;
  if (!p || typeof p !== "object" || Array.isArray(p)) {
    acc.error(base, "debe ser un objeto con los datos del perfil", p);
    return null;
  }

  if (typeof p.nombre !== "string" || !p.nombre.trim()) {
    acc.error(`${base}.nombre`, "es obligatorio y no puede estar vacío", p.nombre);
  } else if (p.nombre.length > MAX_NOMBRE) {
    acc.error(`${base}.nombre`, `no puede superar ${MAX_NOMBRE} caracteres`, p.nombre.length);
  }

  if (!TIPOS.includes(p.tipo)) {
    acc.error(`${base}.tipo`, `debe ser uno de: ${TIPOS.join(" | ")}`, p.tipo);
  } else if ((clave === "consorcio" || clave === "juntos") && !TIPOS_PLURAL.includes(p.tipo)) {
    acc.error(`${base}.tipo`, `el perfil plural debe ser ${TIPOS_PLURAL.join(" o ")}`, p.tipo);
  }

  if (p.nit != null) {
    if (typeof p.nit !== "string" || !NIT_RE.test(p.nit.replace(/[.\s]/g, ""))) {
      acc.error(`${base}.nit`, "debe tener formato de NIT colombiano (dígitos, guion y dígito de verificación) o ser null", p.nit);
    }
  }

  validarUnspsc(acc, base, p.unspsc);
  validarIndicadores(acc, base, p.indicadores, { aproximado: !!(opciones && opciones.aproximado) });
  validarSce(acc, base, p.sce);

  numero(acc, `${base}.profesionales`, p.profesionales, { min: 1, max: MAX_PROFESIONALES, entero: true });
  const expOk = numero(acc, `${base}.experiencia_smmlv`, p.experiencia_smmlv, { min: 0, max: MAX_EXPERIENCIA_SMMLV, exclusivoMin: true });
  const topeOk = numero(acc, `${base}.tope_smmlv`, p.tope_smmlv, { min: 0, exclusivoMin: true });
  if (expOk && topeOk && p.tope_smmlv < p.experiencia_smmlv) {
    // ADVERTENCIA, no error: el tope es apetito estratégico (ver cabecera)
    acc.aviso(`${base}.tope_smmlv (${p.tope_smmlv}) es menor que ${base}.experiencia_smmlv (${p.experiencia_smmlv}). Es válido —el tope es apetito estratégico, no un límite del RUP—, pero confirme que es lo que quiere: por encima de ese valor no se le mostrará ningún proceso.`);
  }
  return p;
}

/* ============================ validarConfig ============================
   body → { ok, errores, advertencias, config, perfiles_cargados }
   `config` es lo que se guarda en Redis: el objeto ya normalizado. */
function validarConfig(body) {
  const acc = crearAcumulador();

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    acc.error("body", "debe ser un objeto JSON con la clave «perfiles»", body === undefined ? null : typeof body);
    return { ok: false, errores: acc.errores, advertencias: acc.advertencias, config: null, perfiles_cargados: [] };
  }
  const perfiles = body.perfiles;
  if (!perfiles || typeof perfiles !== "object" || Array.isArray(perfiles)) {
    acc.error("perfiles", "es obligatorio y debe ser un objeto {helder, genesis, consorcio}", perfiles);
    return { ok: false, errores: acc.errores, advertencias: acc.advertencias, config: null, perfiles_cargados: [] };
  }

  const presentes = CLAVES_PERFIL.filter((k) => Object.prototype.hasOwnProperty.call(perfiles, k));
  const desconocidos = Object.keys(perfiles).filter((k) => !CLAVES_PERFIL.includes(k));
  for (const k of desconocidos) {
    acc.error(`perfiles.${k}`, `perfil desconocido: solo se aceptan ${CLAVES_PERFIL.join(", ")}`, k);
  }
  if (!presentes.length) {
    acc.error("perfiles", `debe traer al menos uno de: ${CLAVES_PERFIL.join(", ")}`, Object.keys(perfiles));
    return { ok: false, errores: acc.errores, advertencias: acc.advertencias, config: null, perfiles_cargados: [] };
  }

  const limpios = {};
  for (const clave of presentes) {
    const p = validarPerfil(acc, clave, perfiles[clave]);
    if (p) limpios[clave] = p;
  }

  /* el plural suma capacidades: un tope por debajo del de un integrante es
     coherente si el dueño quiere, pero casi siempre es un descuido */
  const plural = limpios.consorcio || limpios.juntos;
  if (plural && esNumero(plural.tope_smmlv)) {
    for (const clave of ["helder", "genesis"]) {
      const ind = limpios[clave];
      if (ind && esNumero(ind.tope_smmlv) && plural.tope_smmlv < ind.tope_smmlv) {
        acc.aviso(`consorcio.tope_smmlv (${plural.tope_smmlv}) es menor que ${clave}.tope_smmlv (${ind.tope_smmlv}). El consorcio suma capacidades: debería poder aspirar al menos a lo mismo que sus integrantes.`);
      }
    }
  }

  const ok = acc.errores.length === 0;
  return {
    ok,
    errores: acc.errores,
    advertencias: acc.advertencias,
    perfiles_cargados: ok ? Object.keys(limpios) : [],
    config: ok ? { perfiles: limpios } : null,
  };
}

/* ==================== un perfil suelto (RUP subido en PDF) ====================
   El onboarding extrae UN perfil de un certificado y lo valida con EXACTAMENTE
   las mismas reglas de campo que la carga manual — `validarPerfil` es la misma
   función, no una copia. La diferencia es el envoltorio: no hay clave fija
   (helder/genesis/consorcio) sino un id dinámico, así que las comprobaciones
   del plural y del conjunto de perfiles no aplican. */
function validarPerfilDinamico(id, perfil, opciones = {}) {
  const acc = crearAcumulador();
  const limpio = validarPerfil(acc, String(id || "rup"), perfil, opciones);
  const ok = acc.errores.length === 0 && limpio != null;
  return { ok, errores: acc.errores, advertencias: acc.advertencias, perfil: ok ? limpio : null };
}

/* ============================ whitelists derivadas ============================
   Los códigos del RUP vienen a nivel de CLASE (terminan en «00»), que es la
   premisa del matching jerárquico. Aquí se precomputan las tres proyecciones
   que consulta el motor para no rehacerlas en cada petición. Se derivan con
   `normalizarCodigo` —el mismo lector de niveles de lib/unspsc— y no con
   `slice`, para que un código raro caiga igual que en el matching real. */
function derivarUnspsc(codigos) {
  const clases = new Set(), familias = new Set(), segmentos = new Set();
  for (const crudo of codigos || []) {
    const c = normalizarCodigo(crudo);
    if (!c) continue;
    clases.add(c.clase);
    familias.add(c.familia);
    segmentos.add(c.segmento);
  }
  return {
    clases: [...clases].sort(),
    familias: [...familias].sort(),
    segmentos: [...segmentos].sort(),
    total: (codigos || []).length,
  };
}

module.exports = {
  CLAVES_PERFIL, TIPOS, TIPOS_PLURAL, CODIGO_RE, NIT_RE,
  MAX_NOMBRE, MAX_LIQUIDEZ, MAX_PROFESIONALES, MAX_EXPERIENCIA_SMMLV,
  validarConfig, validarPerfilDinamico, derivarUnspsc,
};
