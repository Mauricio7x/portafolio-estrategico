/* ============================================================================
   tests/capturar_invias · Captura de la referencia oficial INVIAS por insumo
   ----------------------------------------------------------------------------
   HERRAMIENTA MANUAL CON RED, como tests/capturar_retail.js: se corre a mano
   (`node tests/capturar_invias.js`) desde un entorno con salida a internet y
   COMMITEA su resultado (`data/apu_invias.json`). No es parte de la suite ni de
   la app: la aplicación jamás llama al INVIAS en la ruta de una petición.

   FUENTE (verificada en vivo, docs/INVESTIGACION_COMPETENCIA_APU.md §4 y §11):
   API ArcGIS de los APU Regionalizados de Referencia del INVIAS —
   hermes2.invias.gov.co/server/rest/services/apu/APU/MapServer, tabla 1
   («Insumo», unión de Material + Equipo + Transporte: 183.010 registros,
   140 provincias × 32 departamentos, JSON sin token).

   ⚠️ POR QUÉ SE CAPTURA LA VIGENCIA 2025-1 Y NO LA 2025-2 (la más reciente):
   la vigencia 2025-2 de la API está CORRUPTA EN ORIGEN. Medido el 2026-08-14
   comparando las dos vigencias del mismo código en las 140 provincias:
     · Acero de refuerzo B0020003: 2025-1 mediana $3.280/kg (plausible) ·
       2025-2 mediana $122.000/kg (37× el mercado).
     · Agua B0063200: 2025-1 $110/L · 2025-2 $15.900/L (145×).
     · Emulsión CRL-0 B020011: 2025-1 $1.802/L · 2025-2 $52.048/L, IDÉNTICO
       en las 140 provincias (p10 = p90) — huella de un cruce de columnas.
     · MDC-19 B0014502: 2025-1 $738.232/m³ (plausible) · 2025-2 $214.200 (⅓).
   Publicar 2025-2 sería servir cifras creíbles y equivocadas — lo peor que
   este módulo puede producir. El rezago (2025-1) viaja DECLARADO en cada
   referencia. Antes de re-capturar con una vigencia nueva, repetir esta
   comparación: si la nueva vigencia vuelve a dar aberraciones, no se usa.

   ⚠️ LICENCIA INVIAS: los documentos del INVIAS declaran prohibido el uso
   comercial sin autorización. Para el uso actual (app privada, referencia
   citando la fuente) el riesgo es bajo; si Detecta se comercializa con estos
   datos hay que pedir autorización (preciosunitarios@invias.gov.co).

   LA CURADURÍA ES A MANO, código por código (la lección del retail: jamás
   casar por similitud automática un precio). Cada correspondencia declara si
   es exacta o aproximada Y POR QUÉ; la unidad de la fuente NO se convierte,
   salvo multiplicación exacta de la MISMA dimensión (kg → saco de 50 kg,
   L → m³), declarada en `normalizacion.nota`. Lo que no tiene correspondencia
   honesta queda escrito en `categorias_sin_invias` con su motivo — un hueco
   declarado vale más que un mapeo que «se parece».
   ========================================================================== */
"use strict";

const fs = require("fs");
const path = require("path");

const BASE = "https://hermes2.invias.gov.co/server/rest/services/apu/APU/MapServer/1/query";
const VIGENCIA = { anio: 2025, periodo: 1 }; // ver cabecera: 2025-2 está corrupta
const PROVINCIAS_ESPERADAS = 140;

/* ───────────────────────── correspondencias curadas ────────────────────────
   insumo_id = id del insumo BASE de data/apu_catalogo.json. `codigo` es el
   código oficial del banco INVIAS, elegido leyendo el censo completo de una
   provincia (Ibagué 7301, 647 filas) — no por similitud de texto. `unidad`
   es la que la fuente DEBE traer: si en una re-captura cambia, el script
   ABORTA ese código en vez de publicar un precio con otra unidad. */
const CORRESPONDENCIAS = [
  {
    insumo_id: "cemento_gris_50kg", codigo: "B0103564", unidad: "kg",
    correspondencia: "aproximada",
    nota: "La fuente cotiza cemento portland ASTM C150 tipo I por kg (granel); el catálogo, el saco de 50 kg.",
    normalizacion: { factor: 50, unidad: "saco 50 kg", nota: "precio por kg × 50 (multiplicación exacta de la misma dimensión)" },
  },
  {
    insumo_id: "arena_de_rio", codigo: "B0093350", unidad: "m3",
    correspondencia: "aproximada", nota: "«Arena lavada» de la fuente, sin especificar que sea de río.",
  },
  {
    insumo_id: "triturado_3_4", codigo: "B0053103", unidad: "m3",
    correspondencia: "aproximada", nota: "«Agregado grueso (grava, grava triturada y/o roca triturada)», sin granulometría 3/4\" declarada.",
  },
  {
    insumo_id: "acero_refuerzo_60000_psi", codigo: "B0020003", unidad: "kg",
    correspondencia: "exacta", nota: null, // Grado 60 = Fy 420 MPa = 60.000 PSI (NTC 2289)
  },
  {
    insumo_id: "agua", codigo: "B0063200", unidad: "L",
    correspondencia: "exacta", nota: null,
    normalizacion: { factor: 1000, unidad: "m3", nota: "precio por litro × 1.000 (multiplicación exacta de la misma dimensión)" },
  },
  {
    insumo_id: "asfalto_mdc_19", codigo: "B0014502", unidad: "m3",
    correspondencia: "aproximada",
    nota: "La fuente cotiza la MDC-19 por m³ y el catálogo por tonelada: NO se convierte — la densidad de la mezcla no es un dato del catálogo.",
  },
  {
    insumo_id: "cemento_asfaltico_ca_60_70", codigo: "B0103490", unidad: "kg",
    correspondencia: "exacta", nota: null,
  },
  {
    insumo_id: "emulsion_asfaltica_crl_1", codigo: "B020013", unidad: "L",
    correspondencia: "aproximada",
    nota: "Mismo grado (CRL-57, la CRL-1); la fuente cotiza por litro y el catálogo por kg: NO se convierte — la densidad no es un dato del catálogo.",
  },
  {
    insumo_id: "material_seleccionado_prestamo", codigo: "B0014410", unidad: "m3",
    correspondencia: "aproximada", nota: "«Material seleccionado para relleno» de la fuente; el catálogo lo llama «de préstamo para terraplén».",
  },
  {
    insumo_id: "material_base_bg_a", codigo: "B0014302", unidad: "m3",
    correspondencia: "aproximada", nota: "«Material de base clase A, gradación BG-38 y NT3» — la clase A del banco, gradación concreta.",
  },
  {
    insumo_id: "malla_electrosoldada_m_188", codigo: "B0033281", unidad: "kg",
    correspondencia: "aproximada",
    nota: "«Malla electrosoldada ASTM A1064» por kg, sin referencia M-188; el catálogo cotiza por m² y NO se convierte — el peso por m² no es un dato del catálogo.",
  },
  {
    insumo_id: "geotextil_no_tejido_2000", codigo: "B0033274", unidad: "m2",
    correspondencia: "aproximada", nota: "Geotextil no tejido con resistencia Grab mínima de 700 N — el rango del NT-2000, sin la referencia comercial.",
  },
  {
    insumo_id: "alambre_negro_18", codigo: "B0073230", unidad: "kg",
    correspondencia: "exacta", nota: null, // «Alambre negro para amarre calibre 18»
  },
  {
    insumo_id: "eq_mezcladora_1_saco", codigo: "C0010550", unidad: "h",
    correspondencia: "aproximada",
    nota: "«Mezcladora de concreto tipo trompo» por HORA; el catálogo tarifa por día y NO se convierte — no existe una jornada en el repositorio.",
  },
  {
    insumo_id: "eq_vibrador_concreto", codigo: "C0010922", unidad: "h",
    correspondencia: "aproximada", nota: "La fuente tarifa por hora; el catálogo por día. Sin convertir (no hay jornada en el repositorio).",
  },
  {
    insumo_id: "eq_retroexcavadora_oruga", codigo: "C0010790", unidad: "h",
    correspondencia: "aproximada", nota: "Retroexcavadora sobre oruga de 158 kW y balde de 1,5 m³ — clase mayor que la 320 del catálogo.",
  },
  {
    insumo_id: "eq_vibrocompactador_10ton", codigo: "C0010923", unidad: "h",
    correspondencia: "exacta", nota: null, // 153 HP, 10 ton
  },
  {
    insumo_id: "eq_motoniveladora_135hp", codigo: "C0010611", unidad: "h",
    correspondencia: "aproximada", nota: "Motoniveladora de 140 HP de la fuente frente a 135 HP del catálogo.",
  },
  {
    insumo_id: "eq_finisher_asfalto", codigo: "C0010910", unidad: "h",
    correspondencia: "exacta", nota: null,
  },
  {
    insumo_id: "eq_carrotanque_irrigador", codigo: "C0010160", unidad: "h",
    correspondencia: "exacta", nota: null, // irrigador de asfalto, 1000 gal
  },
  {
    insumo_id: "eq_rana_compactadora", codigo: "C0010190", unidad: "h",
    correspondencia: "aproximada", nota: "Rana de 6 hp de la fuente, por hora; el catálogo tarifa por día. Sin convertir.",
  },
  {
    insumo_id: "eq_cortadora_concreto", codigo: "C0011113", unidad: "h",
    correspondencia: "aproximada", nota: "«Cortadora manual para concreto y acero», por hora; el catálogo tarifa por día. Sin convertir.",
  },
  {
    insumo_id: "tr_acarreo_material", codigo: "T0010025", unidad: "m3-km",
    correspondencia: "aproximada",
    nota: "«Transporte de material de excavación», el genérico del banco: sus transportes de material van de ~$1.481 a ~$1.640 por m³-km (2025-1).",
  },
];

/* Lo que NO tiene correspondencia honesta, con su motivo. Se escribe en el
   JSON: un hueco declarado no es un olvido (la regla de categorias_sin_retail). */
const CATEGORIAS_SIN_INVIAS = {
  concreto_premezclado: "El banco INVIAS no cotiza concreto premezclado como insumo: sus APU lo producen desde agregados, cemento y agua (el mismo hueco que declara el retail).",
  subbase_granular: "Solo figura la subbase «con agregado siderúrgico», que es otro producto; mapearla a la SBG convencional sería el falso positivo caro.",
  tuberia_concreto_36: "El banco trae la tubería de 36\" en PVC (otro material y otro precio), no en concreto reforzado.",
  tuberia_pvc_presion: "Diámetros de red urbana (½\") que el banco vial no cotiza.",
  mamposteria_y_acabados: "Ladrillo, bloque, pintura, estuco, madera de formaleta, teja y perfil C no figuran: es un banco VIAL.",
  mano_de_obra: "Las tablas de la API no publican jornales; la mano de obra vive en los APU (Excel semestrales), no en el banco de insumos.",
  formaleta_metalica: "La fuente tarifa formaletas por hora con sufijos «(m)»/«(m2)» ambiguos: una unidad que no se entiende no se publica.",
  equipo_topografia: "No figura en el banco.",
  volqueta_viaje: "La fuente tarifa la volqueta por hora; el viaje cerrado no se convierte. El acarreo ya viaja como referencia en m³-km.",
};

/* ───────────────────────────── transporte HTTP ─────────────────────────────
   Un 400 no se reintenta (regla del proyecto); 429/5xx sí, con backoff. */
async function consultar(params, intento = 0) {
  const url = BASE + "?" + new URLSearchParams({ f: "json", ...params }).toString();
  const r = await fetch(url);
  if (r.status === 429 || r.status >= 500) {
    if (intento >= 3) throw new Error(`HTTP ${r.status} tras ${intento + 1} intentos`);
    await new Promise((ok) => setTimeout(ok, 1500 * 2 ** intento + Math.random() * 500));
    return consultar(params, intento + 1);
  }
  if (!r.ok) throw new Error(`HTTP ${r.status}: ${url}`);
  const j = await r.json();
  /* ArcGIS mete el fallo DENTRO del 200, como OCR.space */
  if (j.error) throw new Error(`ArcGIS ${j.error.code}: ${j.error.message}`);
  return j;
}

const medianaDe = (valores) => {
  const o = [...valores].sort((a, b) => a - b);
  const m = Math.floor(o.length / 2);
  return o.length % 2 ? o[m] : Math.round(((o[m - 1] + o[m]) / 2) * 100) / 100;
};

/* Fecha en hora Colombia (UTC-5 fija): el entorno corre en UTC. */
const hoyColombia = () => new Date(Date.now() - 5 * 3600e3).toISOString().slice(0, 10);

async function capturarCodigo(c) {
  const j = await consultar({
    where: `codigo='${c.codigo}' AND anio=${VIGENCIA.anio} AND periodo=${VIGENCIA.periodo}`,
    outFields: "precio,nombredepartamento,nombreprovincia,nombreinsumo,unidad",
    resultRecordCount: "2000",
  });
  const filas = (j.features || []).map((f) => f.attributes);
  if (!filas.length) throw new Error(`${c.codigo}: la fuente no devolvió filas`);

  /* La unidad del contrato curado: si la fuente cambió de unidad, publicar el
     precio con la vieja sería un dato falso — se aborta el código, no se adapta. */
  const unidades = [...new Set(filas.map((f) => String(f.unidad || "").trim()))];
  if (unidades.length !== 1 || unidades[0].toLowerCase() !== c.unidad.toLowerCase()) {
    throw new Error(`${c.codigo}: unidad de la fuente ${JSON.stringify(unidades)} ≠ esperada «${c.unidad}»`);
  }
  const nombres = [...new Set(filas.map((f) => f.nombreinsumo))];
  if (nombres.length !== 1) throw new Error(`${c.codigo}: ${nombres.length} nombres distintos para el mismo código`);

  /* Un precio ≤ 0 no es un precio (R1): se descarta Y SE CUENTA. */
  const provincias = [];
  let descartadas = 0;
  for (const f of filas) {
    const p = Number(f.precio);
    if (!Number.isFinite(p) || p <= 0) { descartadas++; continue; }
    provincias.push({
      departamento: String(f.nombredepartamento || "").trim(),
      provincia: String(f.nombreprovincia || "").trim(),
      precio: Math.round(p * 100) / 100,
    });
  }
  if (!provincias.length) throw new Error(`${c.codigo}: todas las filas venían sin precio`);

  return {
    insumo_id: c.insumo_id,
    codigo_invias: c.codigo,
    nombre_oficial: nombres[0],
    unidad_fuente: unidades[0],
    correspondencia: c.correspondencia,
    correspondencia_nota: c.nota || null,
    normalizacion: c.normalizacion || null,
    vigencia: `${VIGENCIA.anio}-${VIGENCIA.periodo}`,
    capturado_el: hoyColombia(),
    mediana_nacional: medianaDe(provincias.map((p) => p.precio)),
    provincias_descartadas: descartadas,
    provincias,
  };
}

(async () => {
  console.log(`Capturando ${CORRESPONDENCIAS.length} códigos INVIAS · vigencia ${VIGENCIA.anio}-${VIGENCIA.periodo}\n`);
  const referencias = [];
  for (const c of CORRESPONDENCIAS) {
    const ref = await capturarCodigo(c);
    referencias.push(ref);
    const aviso = ref.provincias.length === PROVINCIAS_ESPERADAS ? "" : `  ⚠ ${ref.provincias.length}/${PROVINCIAS_ESPERADAS} provincias`;
    console.log(`  ${ref.codigo_invias} ${ref.insumo_id}: mediana $${ref.mediana_nacional} / ${ref.unidad_fuente} · ${ref.provincias.length} provincias${aviso}`);
  }

  const salida = {
    _meta: {
      que_es: "Precio oficial de REFERENCIA de cada insumo por provincia, del banco de insumos de los APU Regionalizados del INVIAS. Es una referencia para contrastar y negociar — jamás entra en el costo directo ni sustituye una cotización.",
      generado_por: "tests/capturar_invias.js (herramienta manual con red; la app nunca llama al INVIAS)",
      fuente: "INVIAS · API ArcGIS de los APU Regionalizados de Referencia, tabla «Insumo»",
      url: "https://hermes2.invias.gov.co/server/rest/services/apu/APU/MapServer/1",
      vigencia: `${VIGENCIA.anio}-${VIGENCIA.periodo}`,
      por_que_no_2025_2: "La vigencia 2025-2 de la API está corrupta en origen (medido 2026-08-14): acero de refuerzo a $122.000/kg (37× el mercado; 2025-1 da $3.280), agua a $15.900/L (145×), emulsión CRL-0 idéntica en las 140 provincias. Antes de re-capturar con una vigencia nueva, repetir la comparación entre vigencias — ver cabecera de tests/capturar_invias.js.",
      capturado_el: hoyColombia(),
      zona_horaria: "hora Colombia (UTC-5)",
      licencia: "Los documentos del INVIAS prohíben el uso comercial sin autorización. Uso actual: referencia privada citando la fuente. Si Detecta se comercializa con estos datos, pedir autorización a preciosunitarios@invias.gov.co.",
      advertencia: "Referencia oficial con rezago declarado (la vigencia viaja en cada registro). La unidad de la fuente NO se convierte salvo multiplicación exacta de la misma dimensión, declarada en normalizacion.nota. INVIAS no cotiza Bogotá D.C.: allí se responde la mediana nacional, declarada.",
      categorias_sin_invias: CATEGORIAS_SIN_INVIAS,
      departamentos: [...new Set(referencias.flatMap((r) => r.provincias.map((p) => p.departamento)))].length,
      provincias_esperadas: PROVINCIAS_ESPERADAS,
    },
    referencias,
  };

  const destino = path.join(__dirname, "..", "data", "apu_invias.json");
  fs.writeFileSync(destino, JSON.stringify(salida, null, 1) + "\n");
  const kb = Math.round(fs.statSync(destino).size / 1024);
  console.log(`\nEscrito ${destino} (${kb} KB) · ${referencias.length} referencias · ${salida._meta.departamentos} departamentos`);
  console.log("Revisar las medianas de arriba contra el mercado ANTES de commitear: la corrupción de 2025-2 se cazó mirando, no confiando.");
})().catch((e) => { console.error("FALLO:", e.message); process.exit(1); });
