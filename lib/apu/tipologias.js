/* ============================================================================
   lib/apu/tipologias · Las 22 tipologías de obra y el mapa departamento→región
   ----------------------------------------------------------------------------
   Dos tablas del repositorio que el catálogo de precios NO cubre y que el
   clasificador y el motor de cálculo necesitan:

     data/apu_tipologias.json  las 22 tipologías cerradas, su léxico (anclas /
                               apoyo / excluye), sus familias UNSPSC y los
                               códigos de ítem que las componen.
     data/apu_regional.json    DEPARTAMENTO (como lo publica SECOP) → REGIÓN de
                               precios del catálogo.

   POR QUÉ ESTÁ SEPARADO DE `lib/apu/catalogo.js`. Aquel es el catálogo de
   PRECIOS: vive en Redis, lo carga un administrador y cambia cuando cambia el
   mercado. Esto es VOCABULARIO y TRADUCCIÓN: cambia cuando cambia el criterio
   de negocio, tiene que verse en un diff y no debe depender de que alguien haya
   corrido la carga. Mezclarlos habría atado el clasificador —que funciona sin
   Redis— al estado de una clave que puede no existir.

   ESTE MÓDULO ES HOJA salvo por `semantica`, que también lo es. No importa
   `perfiles`, ni `filtros`, ni el catálogo de precios: saber QUÉ obra es no
   depende de cuánto cuesta, ni de si el proceso es del dueño.

   LA REGLA QUE NO SE PUEDE RELAJAR: `regionDeDepartamento` es el punto único de
   paso de la traducción y **jamás devuelve la región base por defecto**. Las
   cinco regiones cotizadas cubren 14 departamentos; los otros 19 salen
   `sin_base`. Asignar Vaupés a «Costa Atlántica» porque no hay nada mejor sería
   inventarse un dato, y un factor 1,00 de relleno afirma «aquí construir cuesta
   lo mismo que en Bogotá», que es falso y creíble.
   ========================================================================== */
"use strict";

const { norm } = require("../semantica.js");

/* Los dos JSON se piden con `require` LITERAL (6-sep-2026, M-INF-14): es lo
   que hace que el trazador de Vercel los empaquete, como el resto de data/.
   Hasta hoy la ruta llegaba como variable (`cargar(ruta)`) y quien garantizaba
   que viajaran era SOLO `includeFiles: "data/**"` de vercel.json —que se
   conserva como cinturón declarado: la memoria advierte que ese fallo solo se
   ve en producción—. La suite censa que ningún módulo de lib/ ni api/ haga
   `require` con variable sin declararlo. Se degrada a vacío en vez de tumbar
   la consulta, y `meta()` publica el `_meta` de cada archivo (null = no se
   pudo cargar) para que no sea una degradación silenciosa. */
function cargar(leer) {
  try { return leer() || {}; } catch { return {}; }
}

const TIPOLOGIAS_RAW = cargar(() => require("../../data/apu_tipologias.json"));
const REGIONAL = cargar(() => require("../../data/apu_regional.json"));

const TIPOLOGIAS = Array.isArray(TIPOLOGIAS_RAW.tipologias) ? TIPOLOGIAS_RAW.tipologias : [];

/* ────────────────────────── índices en memoria ────────────────────────── */

const TIPOLOGIA_POR_CODIGO = new Map();
for (const t of TIPOLOGIAS) if (t && t.codigo) TIPOLOGIA_POR_CODIGO.set(String(t.codigo).toUpperCase(), t);

/* Mapa INVERSO familia UNSPSC → tipologías compatibles. Lo consume el Nivel B
   del clasificador, que usa el UNSPSC como evidencia INDEPENDIENTE del léxico
   —y sobre todo para VETAR: un objeto clasificado como placa huella cuyo único
   código sea 4017/4018 es casi seguro una red, no una vía. */
const TIPOLOGIAS_POR_FAMILIA = new Map();
for (const t of TIPOLOGIAS) {
  for (const fam of t.familias || []) {
    const k = String(fam);
    if (!TIPOLOGIAS_POR_FAMILIA.has(k)) TIPOLOGIAS_POR_FAMILIA.set(k, []);
    TIPOLOGIAS_POR_FAMILIA.get(k).push(t.codigo);
  }
}

function tipologiaPorCodigo(codigo) {
  return TIPOLOGIA_POR_CODIGO.get(String(codigo == null ? "" : codigo).trim().toUpperCase()) || null;
}

/* Los códigos de ítem que componen la tipología, en el orden constructivo del
   archivo. Una lista VACÍA es un dato —el catálogo aún no cubre esa tipología—
   y quien llama tiene que decirlo, no rellenarla con ítems de otra cosa. */
function itemsDeTipologia(codigo) {
  const t = tipologiaPorCodigo(codigo);
  return t && Array.isArray(t.items) ? t.items.slice() : [];
}

function tipologiasDeFamilia(familia) {
  return (TIPOLOGIAS_POR_FAMILIA.get(String(familia)) || []).slice();
}

/* ─────────────────── departamento → región de precios ──────────────────
   El nombre llega de `departamento_entidad` de SECOP, en mayúsculas y con
   tildes irregulares: se normaliza con la MISMA `norm` del resto de la app
   (sin tildes, ñ→n) para no inventar una segunda normalización. */

const DEPTOS = REGIONAL.departamentos || {};
const SIN_BASE_DECLARADO = REGIONAL.sin_base || {};
const ALIAS_DEPTO = REGIONAL.alias_departamentos || {};

const INDICE_DEPTO = new Map();
for (const [nombre, region] of Object.entries(DEPTOS)) INDICE_DEPTO.set(norm(nombre), { nombre, region });
const INDICE_SIN_BASE = new Map();
for (const [nombre, motivo] of Object.entries(SIN_BASE_DECLARADO)) INDICE_SIN_BASE.set(norm(nombre), { nombre, motivo });
const INDICE_ALIAS = new Map();
for (const [alias, real] of Object.entries(ALIAS_DEPTO)) INDICE_ALIAS.set(norm(alias), real);

/* ========================= regionDeDepartamento =========================
   PUNTO ÚNICO DE PASO. Devuelve SIEMPRE un objeto con `estado`; nunca un
   identificador de región desnudo y nunca la región base de relleno.

     "mapeado"  el departamento tiene región cotizada
     "sin_base" no la tiene (o no se indicó departamento). Quien calcula usa la
                región base del catálogo y LO DICE: el presupuesto sale, pero
                declarado como «sin referencia regional».
   ====================================================================== */
function regionDeDepartamento(departamento) {
  const crudo = String(departamento == null ? "" : departamento).trim();
  if (!crudo) {
    return {
      estado: "sin_base", departamento: null, region: null,
      mensaje: "No se indicó departamento: el presupuesto se calcula con la región base del catálogo, sin ajuste regional.",
    };
  }

  let clave = norm(crudo);
  if (INDICE_ALIAS.has(clave)) clave = norm(INDICE_ALIAS.get(clave));

  const mapeado = INDICE_DEPTO.get(clave);
  if (mapeado) {
    return {
      estado: "mapeado", departamento: mapeado.nombre, region: mapeado.region,
      mensaje: null,
    };
  }

  const declarado = INDICE_SIN_BASE.get(clave);
  return {
    estado: "sin_base",
    departamento: declarado ? declarado.nombre : crudo,
    region: null,
    mensaje: declarado
      ? declarado.motivo
      : `«${crudo}» no figura en el mapa de regiones del catálogo. El presupuesto se calcula con la región base y sin ajuste regional.`,
  };
}

/** Departamentos que la tabla conoce, con o sin región: puebla el desplegable. */
function departamentosConocidos() {
  return [...Object.keys(DEPTOS), ...Object.keys(SIN_BASE_DECLARADO)]
    .sort((a, b) => a.localeCompare(b, "es"));
}

/** Los que SÍ tienen región cotizada, para poder contarlos en el diagnóstico. */
function departamentosConRegion() { return Object.keys(DEPTOS).slice(); }

module.exports = {
  TIPOLOGIAS,
  tipologiaPorCodigo, itemsDeTipologia, tipologiasDeFamilia,
  regionDeDepartamento, departamentosConocidos, departamentosConRegion,
  meta: () => ({
    tipologias: TIPOLOGIAS_RAW._meta || null,
    regional: REGIONAL._meta || null,
    tipologias_n: TIPOLOGIAS.length,
    departamentos_con_region: Object.keys(DEPTOS).length,
    departamentos_sin_base: Object.keys(SIN_BASE_DECLARADO).length,
  }),
};
