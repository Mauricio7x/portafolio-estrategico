/* ============================================================================
   lib/experiencia · La experiencia REALMENTE ejecutada como vocabulario
   ----------------------------------------------------------------------------
   El RUP dice a qué PUEDE presentarse el dueño; sus contratos ejecutados dicen
   en qué SABE trabajar. Son dos cosas distintas y hasta ahora la app solo
   conocía la primera.

   Este módulo convierte una lista de contratos ya ejecutados (la que el dueño
   lleva en su hoja de vida: entidad, objeto, valor, fechas) en dos cosas:

     1. el CORPUS guardado tal cual         → `config:experiencia`
     2. un VOCABULARIO de términos del oficio → `config:experiencia:terminos`

   El vocabulario es lo que después usa lib/cobertura_rup para preguntarle al
   histórico de SECOP II: «¿con qué códigos UNSPSC publica el mercado los
   objetos que este señor YA ejecutó, y cuáles de esos códigos no están en su
   RUP?». Sin él, la auditoría de cobertura solo puede decir «esto es obra»;
   con él puede decir «esto es TU obra».

   Tres decisiones que conviene no re-discutir:

   · SE TOKENIZA SOBRE TEXTO NORMALIZADO (lib/semantica.norm): sin tildes,
     minúsculas, ñ→n. Es la misma base de comparación que usan los vocabularios
     nuevos del proyecto, así que «pavimentación» y «PAVIMENTACION» son el mismo
     término y no hay dos formas de escribir lo mismo en el índice.
   · LOS TOKENS CON DÍGITOS SE DESCARTAN. «2024», «cm001», «inv-03» son el
     número del proceso, no el trabajo — es la misma lección de
     `esObjetoGenerico` en lib/filtros: un objeto hecho de códigos no describe
     nada. Si entraran al vocabulario, cualquier proceso que mencione un año
     ganaría similitud gratis.
   · EL DENOMINADOR DE LA SIMILITUD SON LOS TOKENS ÚNICOS del objeto que se
     compara. Con los tokens repetidos, un objeto que dice «vía» cinco veces
     tendría el mismo peso que uno que describe cinco cosas distintas, y la
     similitud dejaría de significar «qué parte de este objeto reconozco».

   Guarda comprimido (mismo formato que los chunks): 500 contratos con objetos
   de 1 000 caracteres son ~500 KB en crudo y el tope de Upstash es 1 MB por
   valor.
   ========================================================================== */
"use strict";

const { norm } = require("./semantica.js");
const { CLAVES, escribirJSONComprimido, leerJSONComprimido, leerJSON, escribirJSON } = require("./almacen.js");

/* ══════════════════ 1 · Límites de la carga ══════════════════ */
const MAX_CONTRATOS = 500;        // tope razonable de una carga (encargo)
const MAX_OBJETO = 1000;          // caracteres del objeto
const MAX_TEXTO_CORTO = 300;      // entidad, modalidad, nº de contrato
const MIN_LARGO_TOKEN = 3;        // «de», «el», siglas de dos letras: fuera

/* Umbrales de similitud (encargo). Un objeto del histórico con ≥30 % de sus
   términos en el vocabulario del dueño es «altamente relevante»; por debajo de
   15 % no entra siquiera al análisis — no queremos códigos de nichos donde
   nunca se ha trabajado. */
const UMBRAL_ALTA = 0.30;
const UMBRAL_MODERADA = 0.15;

/* ══════════════════ 2 · Stopwords ══════════════════ */
/* Las del encargo más las palabras de trámite contractual que aparecen en
   TODOS los objetos («prestacion», «servicios», «contrato», «objeto»): un
   término que está en todos los contratos no distingue ninguno, y dejarlo
   dentro regalaría similitud a cualquier proceso del dataset.
   Van ya normalizadas (sin tildes) porque se comparan contra `norm`. */
const STOPWORDS = new Set((
  // conectores y determinantes (los del encargo)
  "para de la el los las del en con por que un una y e o a su al se lo como mas sus todo ya muy "
  + "este esta entre son fue era es ser sido esos esas estos estas otro otra otros otras cada "
  + "sobre hasta desde ante tras segun sin durante cuando donde quien cuyo cuya pero ni tambien "
  + "asi tal tanto cual cuales aunque mediante dicho dicha ello ella ellos ellas nos les le "
  // trámite contractual: están en todos los objetos, no distinguen ninguno
  + "prestacion prestar servicio servicios contrato contratos contratar contratacion objeto "
  + "realizar realizacion ejecutar ejecucion efectuar llevar cabo acuerdo convenio proceso "
  + "numero valor total vigencia año anio meses dias plazo"
).split(/\s+/).filter(Boolean));

/* ══════════════════ 3 · Tokenización ══════════════════ */
/* texto → términos significativos, en orden y con repeticiones (quien llama
   decide si quiere el conjunto o la frecuencia). */
function tokenizar(texto) {
  const salida = [];
  for (const bruto of norm(texto).split(/[^a-z0-9ñ]+/)) {
    if (!bruto || bruto.length < MIN_LARGO_TOKEN) continue;
    if (/\d/.test(bruto)) continue;          // «2024», «cm001»: código, no trabajo
    if (STOPWORDS.has(bruto)) continue;
    salida.push(bruto);
  }
  return salida;
}

const terminosUnicos = (texto) => [...new Set(tokenizar(texto))];

/* ══════════════════ 4 · Validación de la carga ══════════════════ */
/* Mismo criterio que lib/config_rup: NO se detiene en el primer error (quien
   corrige un archivo a mano quiere la lista completa) y cada error nombra su
   campo exacto. Un rechazo no guarda nada. */
function crearAcumulador() {
  const errores = [];
  return {
    errores,
    error(campo, mensaje, valor) {
      errores.push({ campo, error: mensaje, valor_recibido: valor === undefined ? null : valor });
    },
  };
}

const esNumero = (v) => typeof v === "number" && Number.isFinite(v);

/* Números que pueden llegar como cadena («350.000.000», «450,5»): se aceptan y
   se normalizan, porque el dueño arma este JSON copiando de una hoja de
   cálculo. Lo que NO se acepta es un texto que no sea un número. */
function numeroTolerante(v) {
  if (esNumero(v)) return v;
  if (typeof v !== "string" || !v.trim()) return null;
  const limpio = v.replace(/[^\d.,-]/g, "").replace(/\.(?=\d{3}\b)/g, "").replace(",", ".");
  const n = parseFloat(limpio);
  return Number.isFinite(n) ? n : null;
}

const texto = (v, max) => String(v == null ? "" : v).replace(/\s+/g, " ").trim().slice(0, max);

function validarContratos(datos) {
  const acc = crearAcumulador();
  if (!datos || typeof datos !== "object" || Array.isArray(datos)) {
    acc.error("contratos", "el cuerpo debe ser un objeto con la clave «contratos»", null);
    return { ok: false, errores: acc.errores, contratos: [] };
  }
  const lista = datos.contratos;
  if (!Array.isArray(lista)) {
    acc.error("contratos", "debe ser un arreglo de contratos ejecutados", lista);
    return { ok: false, errores: acc.errores, contratos: [] };
  }
  if (!lista.length) {
    acc.error("contratos", "el arreglo está vacío: no hay nada que cargar", []);
    return { ok: false, errores: acc.errores, contratos: [] };
  }
  if (lista.length > MAX_CONTRATOS) {
    acc.error("contratos", `máximo ${MAX_CONTRATOS} contratos por carga (llegaron ${lista.length})`, lista.length);
    return { ok: false, errores: acc.errores, contratos: [] };
  }

  const limpios = [];
  lista.forEach((c, i) => {
    const base = `contratos[${i}]`;
    if (!c || typeof c !== "object" || Array.isArray(c)) {
      acc.error(base, "cada contrato debe ser un objeto", c);
      return;
    }
    const objeto = texto(c.objeto, MAX_OBJETO + 1);
    if (!objeto) {
      acc.error(`${base}.objeto`, "es obligatorio y no puede estar vacío", c.objeto);
    } else if (objeto.length > MAX_OBJETO) {
      acc.error(`${base}.objeto`, `no puede superar ${MAX_OBJETO} caracteres`, objeto.length);
    }
    const smmlv = numeroTolerante(c.valor_smmlv);
    const cop = numeroTolerante(c.valor_cop);
    if ((smmlv == null || smmlv <= 0) && (cop == null || cop <= 0)) {
      acc.error(`${base}.valor_smmlv`, "debe venir «valor_smmlv» o «valor_cop» con un número positivo",
        { valor_smmlv: c.valor_smmlv, valor_cop: c.valor_cop });
    }
    const participacion = numeroTolerante(c.participacion);
    if (participacion != null && (participacion <= 0 || participacion > 100)) {
      acc.error(`${base}.participacion`, "el porcentaje de participación debe estar entre 0 y 100", c.participacion);
    }
    limpios.push({
      no_contrato: texto(c.no_contrato, MAX_TEXTO_CORTO) || null,
      entidad: texto(c.entidad, MAX_TEXTO_CORTO) || null,
      objeto: objeto.slice(0, MAX_OBJETO),
      modalidad: texto(c.modalidad, MAX_TEXTO_CORTO) || null,
      participacion: participacion,
      valor_cop: cop,
      valor_smmlv: smmlv,
      fecha_inicio: texto(c.fecha_inicio, 40) || null,
      fecha_fin: texto(c.fecha_fin, 40) || null,
    });
  });

  if (acc.errores.length) return { ok: false, errores: acc.errores, contratos: [] };
  return { ok: true, errores: [], contratos: limpios };
}

/* ══════════════════ 5 · Vocabulario ══════════════════ */
/* Contratos → {terminos:{término: nº de contratos en que aparece}, …}.
   La frecuencia se cuenta por CONTRATO, no por aparición: un objeto que repite
   «vía» ocho veces no convierte «vía» en el término más importante del oficio.

   El perfil por contrato se conserva (`perfiles`) porque es lo que permite
   explicar un match: «este proceso se parece al contrato 001-2024». */
function construirVocabulario(contratos) {
  const cuenta = new Map();
  const perfiles = [];
  for (const c of contratos) {
    const unicos = terminosUnicos(c.objeto);
    perfiles.push({ no_contrato: c.no_contrato, entidad: c.entidad, terminos: unicos });
    for (const t of unicos) cuenta.set(t, (cuenta.get(t) || 0) + 1);
  }
  // orden: los términos de más contratos primero (los que definen el oficio)
  const ordenados = [...cuenta.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  return {
    terminos: Object.fromEntries(ordenados),
    total_terminos: ordenados.length,
    contratos: contratos.length,
    ejemplos: ordenados.slice(0, 25).map(([t]) => t),
    perfiles,
    generado: new Date().toISOString(),
  };
}

/* ══════════════════ 6 · Similitud objeto ↔ experiencia ══════════════════ */
/* score = términos del objeto que el dueño ya conoce / términos del objeto.
   Devuelve SIEMPRE la lista de coincidencias: un score sin las palabras que lo
   sostienen no se puede auditar, y esta cifra decide qué códigos se le
   recomienda inscribir. */
function similitud(textoObjeto, terminos) {
  const unicos = terminosUnicos(textoObjeto);
  if (!unicos.length || !terminos || !terminos.size) {
    return { score: 0, tokens: unicos.length, coincidencias: [] };
  }
  const coincidencias = unicos.filter((t) => terminos.has(t));
  return {
    score: coincidencias.length / unicos.length,
    tokens: unicos.length,
    coincidencias,
  };
}

const nivelRelevancia = (score) => (score >= UMBRAL_ALTA ? "alta" : score >= UMBRAL_MODERADA ? "moderada" : "baja");

/* ══════════════════ 7 · Persistencia ══════════════════ */
/* El sello va con sufijo aleatorio además del ISO, por la misma razón que el de
   los perfiles: dos cargas en el mismo milisegundo producirían el mismo sello y
   la segunda pasaría desapercibida para quien compara sellos (aquí, la caché de
   la auditoría de cobertura). */
function sello() {
  return `${new Date().toISOString()}#${Math.random().toString(36).slice(2, 10)}`;
}

async function guardarExperiencia(redis, contratos) {
  const vocabulario = construirVocabulario(contratos);
  const version = sello();
  const cargado = new Date().toISOString();
  await escribirJSONComprimido(redis, CLAVES.configExperiencia, {
    contratos, _meta: { version, cargado, total: contratos.length },
  });
  await escribirJSONComprimido(redis, CLAVES.configExperienciaTerminos, { ...vocabulario, version, cargado });
  // el sello va AL FINAL, igual que en la carga de RUP: mientras no cambie,
  // nadie puede leer un estado a medias
  await escribirJSON(redis, CLAVES.configExperienciaVersion, { version, cargado, contratos: contratos.length });
  return { version, cargado, vocabulario };
}

async function leerExperiencia(redis) {
  try { return await leerJSONComprimido(redis, CLAVES.configExperiencia); } catch { return null; }
}

/* El vocabulario, listo para comparar. Devuelve null si nadie ha cargado nada
   —que es un estado normal, no un error: la auditoría cae entonces al método
   base (vocabulario de obra de lib/filtros)—. */
async function leerTerminos(redis) {
  let v = null;
  try { v = await leerJSONComprimido(redis, CLAVES.configExperienciaTerminos); } catch { return null; }
  if (!v || !v.terminos || typeof v.terminos !== "object") return null;
  const claves = Object.keys(v.terminos);
  if (!claves.length) return null;
  return {
    set: new Set(claves),
    terminos: v.terminos,
    total_terminos: v.total_terminos || claves.length,
    contratos: v.contratos || 0,
    ejemplos: v.ejemplos || claves.slice(0, 25),
    version: v.version || null,
    cargado: v.cargado || null,
  };
}

async function selloExperiencia(redis) {
  const s = await leerJSON(redis, CLAVES.configExperienciaVersion);
  return (s && s.version) || null;
}


module.exports = {
  MAX_CONTRATOS, MAX_OBJETO, MIN_LARGO_TOKEN, STOPWORDS,
  UMBRAL_ALTA, UMBRAL_MODERADA,
  tokenizar, terminosUnicos, validarContratos, construirVocabulario,
  similitud, nivelRelevancia, numeroTolerante,
  guardarExperiencia, leerExperiencia, leerTerminos, selloExperiencia,
};
