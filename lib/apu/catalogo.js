/* ============================================================================
   lib/apu/catalogo · Biblioteca de APU parametrizados y matriz regional
   ----------------------------------------------------------------------------
   Carga y da acceso a los tres archivos de datos versionados del repositorio:

     data/apu_catalogo.json    insumos + ítems de obra (composición, cuadrilla,
                               equipo y rendimiento)
     data/apu_tipologias.json  las 22 tipologías cerradas con su léxico
     data/apu_regional.json    la matriz de ajuste por componente y departamento

   POR QUÉ EN EL REPOSITORIO Y NO EN REDIS (§1.H del informe): un precio mal
   puesto es un error de NEGOCIO, no de infraestructura, y tiene que verse en un
   diff, revisarse por PR y desplegarse atómicamente con el código. Cuesta cero
   comandos de Redis y cero ancho de banda — que es el presupuesto de Upstash
   que se agota primero. Precedente exacto: `data/vocabulario_unspsc.json`.

   ESTE MÓDULO ES HOJA del grafo de requires, a propósito. No importa
   `perfiles`, ni `filtros`, ni `rup`: el motor de APU calcula precios y no
   decide si un proceso es del dueño. Quien decide eso sigue siendo
   `lib/unspsc.js` contra la whitelist del perfil, y sigue siendo el único.

   TRES REGLAS QUE NO SE PUEDEN RELAJAR
   ------------------------------------
   1. `factorRegionalDe` es el PUNTO ÚNICO DE PASO de la matriz regional, igual
      que `competenciaDe` y `bajaDeMercado` lo son de sus índices. Un segundo
      lector que aplique el factor por su cuenta divergiría a la primera
      corrección.
   2. Un departamento sin factor NO recibe 1,00. Prohibido `|| 0` y prohibido
      `|| 1`: un F = 1 por defecto afirma «aquí construir cuesta lo mismo que el
      promedio nacional», que es falso y creíble sobre Vaupés. La ausencia se
      propaga como ausencia (`estado: "sin_base"`).
   3. `claveInsumo` es la ÚNICA definición de la clave de un insumo. Dos
      funciones que normalicen «CEMENTO GRIS» de dos maneras son dos insumos
      distintos que deberían ser uno (la lección de `claveCanonica`).
   ========================================================================== */
"use strict";

const { norm } = require("../semantica.js");

/* `require` de JSON es estático: Vercel lo traza y lo empaqueta con la función
   (`includeFiles: "data/**"` en vercel.json). Si algún día faltara, se degrada
   a vacío en vez de tumbar la consulta — igual que la semilla de vocabulario. */
function cargar(ruta) {
  try { return require(ruta) || {}; } catch { return {}; }
}

const CATALOGO = cargar("../../data/apu_catalogo.json");
const TIPOLOGIAS_RAW = cargar("../../data/apu_tipologias.json");
const REGIONAL = cargar("../../data/apu_regional.json");

const INSUMOS = CATALOGO.insumos || {};
const ITEMS = Array.isArray(CATALOGO.items) ? CATALOGO.items : [];
const TIPOLOGIAS = Array.isArray(TIPOLOGIAS_RAW.tipologias) ? TIPOLOGIAS_RAW.tipologias : [];
const UNIDADES = CATALOGO.unidades || ["m", "m2", "m3", "kg", "ton", "un", "gl", "ml", "dia", "mes"];

/* Jornada y días laborados: los DOS parámetros que convierten un salario
   mensual en un costo por hora de cuadrilla. Van juntos y explícitos porque
   confundir «factor sobre salario mensual» con «factor sobre jornal por día
   laborado» describe costos que difieren ~30 % — es la fuente número uno de
   APU incomparables entre sí (§1.C.4 del informe).

   `DIAS_LABORADOS_MES` es 23 y no 30: el mes tiene 30 días PAGADOS pero solo
   ~23 trabajados. Dividir un salario mensual entre 30 y llamarlo jornal
   subestima la cuadrilla en un 30 %. */
const JORNADA_HORAS = 8;
const DIAS_LABORADOS_MES = 23;

/* Factor prestacional por defecto: Génesis SAS, exonerada del art. 114-1 ET,
   ARL IV, CON auxilio de transporte incluido → 1,59 (§1.C.4, tabla del informe:
   $2.782.522 / $1.750.905). Es un DEFECTO EDITABLE, no una constante: Helder,
   persona natural con un solo empleado, NO está exonerado y su factor sube a
   ~1,76 con auxilio. La UI lo expone y el endpoint lo acepta. */
const FACTOR_PRESTACIONAL = 1.59;
const FACTOR_PRESTACIONAL_MIN = 1.0;
const FACTOR_PRESTACIONAL_MAX = 2.5;

/* ────────────────────────── índices en memoria ───────────────────────────
   Se construyen una vez por instancia caliente. Son pequeños (decenas de
   entradas) y evitan recorrer el catálogo en cada petición. */

const ITEM_POR_CODIGO = new Map();
for (const it of ITEMS) if (it && it.codigo) ITEM_POR_CODIGO.set(String(it.codigo).toUpperCase(), it);

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

/* Ítems por tipología, en el orden del catálogo (que es el orden constructivo:
   localización → excavación → estructura → acabado). Ese orden es lo que hace
   que el presupuesto sugerido se lea como un presupuesto y no como una lista. */
const ITEMS_POR_TIPOLOGIA = new Map();
for (const it of ITEMS) {
  for (const tip of it.tipologias || []) {
    const k = String(tip).toUpperCase();
    if (!ITEMS_POR_TIPOLOGIA.has(k)) ITEMS_POR_TIPOLOGIA.set(k, []);
    ITEMS_POR_TIPOLOGIA.get(k).push(it.codigo);
  }
}

/* ────────────────────────────── accesores ────────────────────────────────── */

/** ÚNICA definición de la clave de un insumo. Ver regla 3 de la cabecera. */
function claveInsumo(codigo) {
  return String(codigo == null ? "" : codigo).trim().toUpperCase();
}

function insumoPorCodigo(codigo) {
  const k = claveInsumo(codigo);
  return INSUMOS[k] ? { codigo: k, ...INSUMOS[k] } : null;
}

function itemPorCodigo(codigo) {
  return ITEM_POR_CODIGO.get(String(codigo == null ? "" : codigo).trim().toUpperCase()) || null;
}

function tipologiaPorCodigo(codigo) {
  return TIPOLOGIA_POR_CODIGO.get(String(codigo == null ? "" : codigo).trim().toUpperCase()) || null;
}

function itemsDeTipologia(codigo) {
  const k = String(codigo == null ? "" : codigo).trim().toUpperCase();
  return (ITEMS_POR_TIPOLOGIA.get(k) || []).slice();
}

function tipologiasDeFamilia(familia) {
  return (TIPOLOGIAS_POR_FAMILIA.get(String(familia)) || []).slice();
}

/* ─────────────────────── matriz de ajuste regional ────────────────────────
   El nombre del departamento llega de `departamento_entidad` de SECOP, que
   viene en mayúsculas y con tildes irregulares: se normaliza con la MISMA
   `norm` del resto de la app (sin tildes, ñ→n) para no inventar una segunda
   normalización. */

const DEPTOS = REGIONAL.departamentos || {};
const CATEGORIAS = REGIONAL.categorias || {};
const SIN_BASE_DECLARADO = REGIONAL.sin_base || {};
const ALIAS_DEPTO = REGIONAL.alias_departamentos || {};

const INDICE_DEPTO = new Map();
for (const [nombre, cat] of Object.entries(DEPTOS)) INDICE_DEPTO.set(norm(nombre), cat);
const INDICE_SIN_BASE = new Map();
for (const [nombre, motivo] of Object.entries(SIN_BASE_DECLARADO)) INDICE_SIN_BASE.set(norm(nombre), { nombre, motivo });
const INDICE_ALIAS = new Map();
for (const [alias, real] of Object.entries(ALIAS_DEPTO)) INDICE_ALIAS.set(norm(alias), real);

const centro = (banda) => (Array.isArray(banda) && banda.length === 2
  ? Math.round(((banda[0] + banda[1]) / 2) * 1000) / 1000
  : null);

const SIN_BASE_REGIONAL = Object.freeze({
  estado: "sin_base",
  categoria: null, categoria_nombre: null,
  material: null, mano_obra: null, equipo: null, flete_relativo: null,
  bandas: null,
  mensaje: "Sin base para estimar el sobrecosto regional de este departamento. El presupuesto se calcula con los precios de referencia nacionales, sin ajuste.",
});

/* ============================ factorRegionalDe ============================
   PUNTO ÚNICO DE PASO. Devuelve SIEMPRE un objeto con `estado`; nunca un
   número desnudo y nunca un 1,00 de relleno.

   Los tres estados salen del §1.B.2:
     · "estimado"  (🟡) hay banda, pero la matriz está sin calibrar
     · "sin_base"  (⚪) el departamento no tiene fuente cargada (hoy: Bogotá)
     · "calibrado" (🟢) reservado: NINGÚN departamento lo alcanza todavía, y
                        eso se dice en vez de ensanchar el criterio para poder
                        pintar verde.
   ======================================================================== */
function factorRegionalDe(departamento) {
  const crudo = String(departamento == null ? "" : departamento).trim();
  if (!crudo) return { ...SIN_BASE_REGIONAL, mensaje: "No se indicó departamento: el presupuesto va sin ajuste regional." };

  let clave = norm(crudo);
  if (INDICE_ALIAS.has(clave)) clave = norm(INDICE_ALIAS.get(clave));

  const declarado = INDICE_SIN_BASE.get(clave);
  if (declarado) {
    return { ...SIN_BASE_REGIONAL, departamento: declarado.nombre, mensaje: declarado.motivo };
  }

  const cat = INDICE_DEPTO.get(clave);
  if (!cat || !CATEGORIAS[cat]) return { ...SIN_BASE_REGIONAL, departamento: crudo };

  const c = CATEGORIAS[cat];
  return {
    estado: "estimado",
    departamento: crudo,
    categoria: cat,
    categoria_nombre: c.nombre,
    material: centro(c.material),
    mano_obra: centro(c.mano_obra),
    equipo: centro(c.equipo),
    flete_relativo: centro(c.flete_relativo),
    bandas: {
      material: c.material || null,
      mano_obra: c.mano_obra || null,
      equipo: c.equipo || null,
      flete_relativo: c.flete_relativo || null,
    },
    mensaje: `Categoría ${cat} · ${c.nombre}. Factores PRELIMINARES, sin calibrar: se publica la banda junto al valor central para que se lea como estimación y no como medición.`,
  };
}

/** Departamentos que la matriz reconoce, para poblar el desplegable de la UI. */
function departamentosConocidos() {
  return [...Object.keys(DEPTOS), ...Object.keys(SIN_BASE_DECLARADO)].sort((a, b) => a.localeCompare(b, "es"));
}

const TRANSPORTE = REGIONAL.transporte || { tarifa_troncal_ton_km: 0 };

module.exports = {
  CATALOGO, INSUMOS, ITEMS, TIPOLOGIAS, UNIDADES, REGIONAL, TRANSPORTE,
  JORNADA_HORAS, DIAS_LABORADOS_MES,
  FACTOR_PRESTACIONAL, FACTOR_PRESTACIONAL_MIN, FACTOR_PRESTACIONAL_MAX,
  claveInsumo, insumoPorCodigo, itemPorCodigo, tipologiaPorCodigo,
  itemsDeTipologia, tipologiasDeFamilia,
  factorRegionalDe, departamentosConocidos,
  meta: () => ({
    catalogo: CATALOGO._meta || null,
    tipologias: TIPOLOGIAS_RAW._meta || null,
    regional: REGIONAL._meta || null,
    insumos: Object.keys(INSUMOS).length,
    items: ITEMS.length,
    tipologias_n: TIPOLOGIAS.length,
  }),
};
