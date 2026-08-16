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

   MODO XLSX (16-ago-2026): el INVIAS publica cada vigencia nueva PRIMERO en
   Excel (hermes2.invias.gov.co/APUs/Provincias/Territorio_APU_{año}_{sem}.xlsx,
   todo el país en un libro; hojas «INSUMO MATERIALES», «INSUMO_EQUIPO» e
   «INSUMO_TRANSPORTE» con una columna por provincia) y la API ArcGIS va por
   detrás (el 16-ago-2026 la API llegaba a 2025-2 y el Excel ya traía 2026-1).
     node tests/capturar_invias.js --xlsx Territorio_APU_2026_1.xlsx --vigencia 2026-1
   lee el libro con el lector del propio proyecto (public/xlsx_lectura.js) y
   produce EL MISMO JSON que la vía API: mismas correspondencias, mismas
   cerraduras (unidad esperada o se aborta, precio ≤ 0 se descarta y se cuenta)
   y la comparación de medianas contra la captura anterior IMPRESA Y GUARDADA
   en `_meta.contraste_vigencia_anterior`, que es lo que cazó la corrupción de
   2025-2. Los nombres de departamento y provincia se CANONIZAN a los de la
   captura anterior (los de la API): el Excel escribe «ARCHIPIÉLAGO DE SAN
   ANDRÉS, PROVIDENCIA Y SANTA CATALINA» donde la API dice «San Andrés», y
   lib/apu/invias agrupa por ese nombre. Un código que la vigencia nueva ya no
   trae NO se adapta por similitud: se declara un SUCESOR curado a mano
   (`sucesores`) o el código se aborta.

   ⚠️ LICENCIA INVIAS: los documentos del INVIAS declaran prohibido el uso
   comercial sin autorización. Para el uso actual (app privada, referencia
   citando la fuente) el riesgo es bajo; si Detekta se comercializa con estos
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
const PROVINCIAS_ESPERADAS = 140;

/* --xlsx <ruta> --vigencia AAAA-S  → modo Excel; sin argumentos → API 2025-1
   (ver cabecera: 2025-2 de la API está corrupta y 2026-1 solo está en Excel). */
const ARGS = (() => {
  const a = process.argv.slice(2);
  const leer = (k) => { const i = a.indexOf(k); return i >= 0 ? a[i + 1] : null; };
  return { xlsx: leer("--xlsx"), vigencia: leer("--vigencia") };
})();
const VIGENCIA = (() => {
  if (!ARGS.vigencia) return { anio: 2025, periodo: 1 };
  const m = /^(\d{4})-([12])$/.exec(ARGS.vigencia);
  if (!m) throw new Error("--vigencia debe ser AAAA-1 o AAAA-2");
  return { anio: Number(m[1]), periodo: Number(m[2]) };
})();
const ETIQUETA_VIGENCIA = `${VIGENCIA.anio}-${VIGENCIA.periodo}`;

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
    /* En 2026-1 el INVIAS renumeró los transportes: T0010025 desaparece y el
       genérico pasa a ser T0100034 «transporte de materiales excavación /
       prestamo» (m³-km). Curado leyendo el listado completo de transportes de
       2026-1 (45 códigos), no por similitud. */
    sucesores: {
      "2026-1": { codigo: "T0100034", nota: "«Transporte de materiales excavación / préstamo», el genérico del banco en 2026-1 (sucesor del T0010025 «Transporte de material de excavación» de 2025-1)." },
    },
  },
];

/* El código que vale para la vigencia que se captura: el curado, o su sucesor
   declarado. Sin sucesor y sin el código en la fuente, el código se aborta. */
function codigoPara(c) {
  const suc = c.sucesores && c.sucesores[ETIQUETA_VIGENCIA];
  return suc ? { codigo: suc.codigo, nota: suc.nota || c.nota } : { codigo: c.codigo, nota: c.nota };
}

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
  const { codigo, nota } = codigoPara(c);
  const j = await consultar({
    where: `codigo='${codigo}' AND anio=${VIGENCIA.anio} AND periodo=${VIGENCIA.periodo}`,
    outFields: "precio,nombredepartamento,nombreprovincia,nombreinsumo,unidad",
    resultRecordCount: "2000",
  });
  const filas = (j.features || []).map((f) => f.attributes);
  if (!filas.length) throw new Error(`${codigo}: la fuente no devolvió filas`);

  /* La unidad del contrato curado: si la fuente cambió de unidad, publicar el
     precio con la vieja sería un dato falso — se aborta el código, no se adapta. */
  const unidades = [...new Set(filas.map((f) => String(f.unidad || "").trim()))];
  if (unidades.length !== 1 || unidades[0].toLowerCase() !== c.unidad.toLowerCase()) {
    throw new Error(`${codigo}: unidad de la fuente ${JSON.stringify(unidades)} ≠ esperada «${c.unidad}»`);
  }
  const nombres = [...new Set(filas.map((f) => f.nombreinsumo))];
  if (nombres.length !== 1) throw new Error(`${codigo}: ${nombres.length} nombres distintos para el mismo código`);

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
  if (!provincias.length) throw new Error(`${codigo}: todas las filas venían sin precio`);

  return armarReferencia(c, { codigo, nota, nombre: nombres[0], unidad: unidades[0], provincias, descartadas });
}

/* La forma del registro publicado es UNA, venga de la API o del Excel. */
function armarReferencia(c, r) {
  return {
    insumo_id: c.insumo_id,
    codigo_invias: r.codigo,
    nombre_oficial: r.nombre,
    unidad_fuente: r.unidad,
    correspondencia: c.correspondencia,
    correspondencia_nota: r.nota || null,
    normalizacion: c.normalizacion || null,
    vigencia: ETIQUETA_VIGENCIA,
    capturado_el: hoyColombia(),
    mediana_nacional: medianaDe(r.provincias.map((p) => p.precio)),
    provincias_descartadas: r.descartadas,
    provincias: r.provincias,
  };
}

/* ───────────────────────────── modo Excel ──────────────────────────────────
   Territorio_APU_{año}_{sem}.xlsx: «INSUMO MATERIALES» e «INSUMO_EQUIPO» traen
   código (A), nombre (B) y una columna por provincia desde C, con el
   DEPARTAMENTO en la fila 1, la PROVINCIA en la fila 2 y «DeptoProvincia» en
   la fila 4; sus unidades viven en las hojas-listado «MATERIALES» y «EQUIPO»
   (código en C, unidad en D). «INSUMO_TRANSPORTE» trae código (A), unidad (B),
   nombre (C) y las provincias desde D con la misma cabecera. */
async function leerLibroXlsx(ruta) {
  const zlib = require("zlib");
  const X = require("../public/xlsx_lectura.js");
  const bytes = new Uint8Array(fs.readFileSync(ruta));
  return X.leerLibro(bytes, { inflar: async (b) => new Uint8Array(zlib.inflateRawSync(Buffer.from(b))) });
}

const claveNombre = (s) => String(s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().replace(/[^A-Z]/g, "");

/* Nombres canónicos de departamento y provincia: los de la captura ANTERIOR
   (la API), que son los que lib/apu/invias agrupa; el Excel escribe otros. */
function canonizadorDeProvincias() {
  const pares = new Map();
  try {
    const previo = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "apu_invias.json"), "utf8"));
    for (const r of previo.referencias || []) for (const p of r.provincias || []) {
      pares.set(claveNombre(p.departamento + p.provincia), { departamento: p.departamento, provincia: p.provincia });
    }
  } catch (e) { /* sin captura previa: se usan los nombres del Excel y se avisa */ }
  const ALIAS = {
    /* Excel 2026-1 → API 2025-1, curados a mano */
    [claveNombre("ARCHIPIÉLAGO DE SAN ANDRÉS, PROVIDENCIA Y SANTA CATALINASAN ANDRES- PROVIDENCIA")]: { departamento: "San Andrés", provincia: "Archipiélago De San Andrés" },
    [claveNombre("SanAndrésyProvidenciaSan Andrés y Providencia")]: { departamento: "San Andrés", provincia: "Archipiélago De San Andrés" },
    [claveNombre("RisaraldaVertiente Occidental")]: { departamento: "Risaralda", provincia: "Vertiente Occidente" },
  };
  const sinCanon = new Set();
  return {
    canon(depto, prov, clave4) {
      const k1 = claveNombre(String(depto) + String(prov)), k4 = claveNombre(clave4);
      const c = pares.get(k1) || pares.get(k4) || ALIAS[k1] || ALIAS[k4];
      if (c) return c;
      sinCanon.add(`${depto} | ${prov}`);
      return { departamento: String(depto || "").trim(), provincia: String(prov || "").trim() };
    },
    sinCanon,
  };
}

function capturarDesdeXlsx(libro) {
  const hoja = (n) => {
    const h = libro.hojas.find((x) => x.nombre.trim() === n.trim());
    if (!h) throw new Error(`el libro no trae la hoja «${n}»`);
    return h.filas;
  };
  const unidades = new Map();
  for (const n of ["MATERIALES", "EQUIPO", "TRANSPORTE"]) {
    for (const f of hoja(n)) if (f[2] && /^[BCT]\d/.test(String(f[2]))) unidades.set(String(f[2]).trim(), String(f[3] || "").trim());
  }
  const canon = canonizadorDeProvincias();
  const fuentes = [
    { hoja: "INSUMO MATERIALES", desde: 2, iCodigo: 0, iNombre: 1, iUnidad: null },
    { hoja: "INSUMO_EQUIPO", desde: 2, iCodigo: 0, iNombre: 1, iUnidad: null },
    { hoja: "INSUMO_TRANSPORTE", desde: 3, iCodigo: 0, iNombre: 2, iUnidad: 1 },
  ];
  const buscar = (codigo) => {
    for (const fu of fuentes) {
      const filas = hoja(fu.hoja);
      const cab = [filas[0], filas[1], filas[3]];
      for (const f of filas) {
        if (String(f[fu.iCodigo] || "").trim() !== codigo) continue;
        const provincias = []; let descartadas = 0;
        for (let c = fu.desde; c < f.length; c++) {
          if (cab[0][c] == null && cab[1][c] == null) continue; // columna sin provincia
          const p = Number(f[c]);
          if (!Number.isFinite(p) || p <= 0) { descartadas++; continue; }
          const nom = canon.canon(cab[0][c], cab[1][c], cab[2][c]);
          provincias.push({ departamento: nom.departamento, provincia: nom.provincia, precio: Math.round(p * 100) / 100 });
        }
        return {
          nombre: String(f[fu.iNombre] || "").trim(),
          unidad: fu.iUnidad != null ? String(f[fu.iUnidad] || "").trim() : (unidades.get(codigo) || ""),
          provincias, descartadas,
        };
      }
    }
    return null;
  };
  const referencias = [];
  for (const c of CORRESPONDENCIAS) {
    const { codigo, nota } = codigoPara(c);
    const r = buscar(codigo);
    if (!r) throw new Error(`${codigo} (${c.insumo_id}): no está en el libro ${ETIQUETA_VIGENCIA} — declarar un sucesor curado o abortar`);
    if (r.unidad.toLowerCase() !== c.unidad.toLowerCase()) {
      throw new Error(`${codigo}: unidad de la fuente «${r.unidad}» ≠ esperada «${c.unidad}»`);
    }
    if (!r.provincias.length) throw new Error(`${codigo}: todas las columnas venían sin precio`);
    referencias.push(armarReferencia(c, { codigo, nota, nombre: r.nombre, unidad: r.unidad, provincias: r.provincias, descartadas: r.descartadas }));
  }
  return { referencias, sinCanon: [...canon.sinCanon] };
}

/* Medianas de la captura anterior, por insumo: la comparación entre vigencias
   que cazó la corrupción de 2025-2, ahora impresa y GUARDADA en la meta. */
function contrasteConAnterior(referencias) {
  let previo;
  try { previo = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "apu_invias.json"), "utf8")); } catch (e) { return null; }
  const antes = new Map((previo.referencias || []).map((r) => [r.insumo_id, r]));
  const filas = referencias.map((r) => {
    const a = antes.get(r.insumo_id);
    const cociente = a && a.mediana_nacional > 0 ? Math.round((r.mediana_nacional / a.mediana_nacional) * 100) / 100 : null;
    return { insumo_id: r.insumo_id, vigencia_anterior: a ? a.vigencia : null, mediana_anterior: a ? a.mediana_nacional : null,
      mediana_nueva: r.mediana_nacional, cociente };
  });
  const cocientes = filas.map((f) => f.cociente).filter((x) => x != null);
  return {
    vigencia_anterior: previo._meta && previo._meta.vigencia || null,
    lectura: "cociente = mediana nueva ÷ mediana anterior; un cociente de 30× o 1/30 es la huella de la corrupción de 2025-2, no un movimiento de mercado",
    cociente_min: cocientes.length ? Math.min(...cocientes) : null,
    cociente_max: cocientes.length ? Math.max(...cocientes) : null,
    por_insumo: filas,
  };
}

(async () => {
  const modo = ARGS.xlsx ? `Excel ${path.basename(ARGS.xlsx)}` : "API ArcGIS";
  console.log(`Capturando ${CORRESPONDENCIAS.length} códigos INVIAS · vigencia ${ETIQUETA_VIGENCIA} · ${modo}\n`);
  /* El contraste se calcula ANTES de escribir: compara contra el archivo que
     está a punto de sustituirse. */
  let referencias = [], sinCanon = [];
  if (ARGS.xlsx) {
    ({ referencias, sinCanon } = capturarDesdeXlsx(await leerLibroXlsx(ARGS.xlsx)));
  } else {
    for (const c of CORRESPONDENCIAS) referencias.push(await capturarCodigo(c));
  }
  const contraste = contrasteConAnterior(referencias);
  for (const ref of referencias) {
    const aviso = ref.provincias.length === PROVINCIAS_ESPERADAS ? "" : `  ⚠ ${ref.provincias.length}/${PROVINCIAS_ESPERADAS} provincias`;
    const c = contraste && contraste.por_insumo.find((f) => f.insumo_id === ref.insumo_id);
    const vs = c && c.cociente != null ? ` · ×${c.cociente} vs ${c.vigencia_anterior}` : "";
    console.log(`  ${ref.codigo_invias} ${ref.insumo_id}: mediana $${ref.mediana_nacional} / ${ref.unidad_fuente} · ${ref.provincias.length} provincias${vs}${aviso}`);
  }
  if (sinCanon.length) console.log(`\n⚠ provincias del Excel sin nombre canónico (se publican como vienen): ${sinCanon.join(" · ")}`);

  const salida = {
    _meta: {
      que_es: "Precio oficial de REFERENCIA de cada insumo por provincia, del banco de insumos de los APU Regionalizados del INVIAS. Es una referencia para contrastar y negociar — jamás entra en el costo directo ni sustituye una cotización.",
      generado_por: `tests/capturar_invias.js (herramienta manual con red; la app nunca llama al INVIAS) · modo ${ARGS.xlsx ? "Excel" : "API"}`,
      fuente: ARGS.xlsx
        ? "INVIAS · APU Regionalizados de Referencia, libro Excel de todo el país (hojas INSUMO MATERIALES / INSUMO_EQUIPO / INSUMO_TRANSPORTE)"
        : "INVIAS · API ArcGIS de los APU Regionalizados de Referencia, tabla «Insumo»",
      url: ARGS.xlsx
        ? `https://hermes2.invias.gov.co/APUs/Provincias/Territorio_APU_${VIGENCIA.anio}_${VIGENCIA.periodo}.xlsx`
        : "https://hermes2.invias.gov.co/server/rest/services/apu/APU/MapServer/1",
      vigencia: ETIQUETA_VIGENCIA,
      por_que_no_2025_2: "La vigencia 2025-2 de la API está corrupta en origen (medido 2026-08-14): acero de refuerzo a $122.000/kg (37× el mercado; 2025-1 da $3.280), agua a $15.900/L (145×), emulsión CRL-0 idéntica en las 140 provincias. Por eso la 2025-1 se capturó de la API y la 2026-1 (16-ago-2026) del libro Excel oficial, que la API todavía no publicaba; en cada re-captura la comparación entre vigencias se imprime y queda en contraste_vigencia_anterior.",
      contraste_vigencia_anterior: contraste,
      capturado_el: hoyColombia(),
      zona_horaria: "hora Colombia (UTC-5)",
      licencia: "Los documentos del INVIAS prohíben el uso comercial sin autorización. Uso actual: referencia privada citando la fuente. Si Detekta se comercializa con estos datos, pedir autorización a preciosunitarios@invias.gov.co.",
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
