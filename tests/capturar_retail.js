/* ============================================================================
   tests/capturar_retail · Captura de precios retail para el módulo APU
   ----------------------------------------------------------------------------
   HERRAMIENTA DE CAPTURA, NO UNA PRUEBA. Necesita RED y por eso NO corre en la
   suite (tests/e2e.js no la invoca). Se ejecuta a mano desde un entorno de
   desarrollo y escribe `data/apu_retail.json`, que es lo que la aplicación
   sirve: la app NUNCA llama a una tienda en la ruta de una petición.

     node tests/capturar_retail.js

   El encargo del dueño (2026-08-13): precios de TIENDA como referencia — le
   sirven como TECHO NEGOCIABLE; él sabe cuánto negociar. Requisito: 100 %
   trazables (fuente + ciudad + fecha de captura visibles).

   Método, verificado en vivo el 2026-08-14 (docs/INVESTIGACION_COMPETENCIA_APU.md
   §10 — códigos HTTP y evidencia literal allí):
   · Homecenter regionaliza EN EL SERVIDOR: la página del producto con cookies
     `usrLocation=<dpto>; comuna=<ciudad>` responde el precio de esa ciudad
     (el mismo saco de cemento va de $29.200 en Cúcuta a $37.900 en Ibagué).
     Los códigos de ubicación salen de `search-location-info`.
   · Easy NO regionaliza (precio único nacional): API VTEX pública, `sc=1`.
   · Las listas de fabricante (Gerfor, Eternit, Procables) van como CONSTANTES
     curadas a mano más abajo, con su vigencia impresa y su URL: extraerlas por
     regex en cada corrida sería frágil y un error aquí acaba en un precio.

   Reglas que este script hereda del proyecto:
   · Un precio 0 o ilegible es SIN DATO: se descarta Y SE CUENTA, jamás se
     escribe un 0 (un cero no puede ser un precio).
   · Un 4xx no se reintenta; un fallo de red se reintenta una vez.
   · Capital sin cobertura → va DECLARADA en `_meta.departamentos_sin_cobertura`
     con su motivo, no simplemente ausente.
   · La fecha de captura va en HORA COLOMBIA (UTC−5): el dueño ya cazó una
     fecha corrida por usar la hora del sistema.
   ========================================================================== */
"use strict";

const fs = require("fs");
const path = require("path");

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36";
const PAUSA_MS = 200;

/* Hora Colombia: UTC−5 fija, la misma resta que aplica la app a SECOP. */
const hoyColombia = () => new Date(Date.now() - 5 * 3600e3).toISOString().slice(0, 10);

/* ── Las 33 capitales, con el departamento EXACTO como lo escribe
      data/apu_regional.json (esa es la clave con la que la app consulta). ── */
const CAPITALES = [
  { departamento: "BOGOTA D.C.", capital: "Bogotá", buscar: null }, // default del sitio, sin cookies
  { departamento: "ANTIOQUIA", capital: "Medellín", buscar: "MEDELLIN" },
  { departamento: "VALLE DEL CAUCA", capital: "Cali", buscar: "CALI" },
  { departamento: "ATLANTICO", capital: "Barranquilla", buscar: "BARRANQUILLA" },
  { departamento: "BOLIVAR", capital: "Cartagena", buscar: "CARTAGENA" },
  { departamento: "NORTE DE SANTANDER", capital: "Cúcuta", buscar: "CUCUTA" },
  { departamento: "SANTANDER", capital: "Bucaramanga", buscar: "BUCARAMANGA" },
  { departamento: "RISARALDA", capital: "Pereira", buscar: "PEREIRA" },
  { departamento: "MAGDALENA", capital: "Santa Marta", buscar: "SANTA MARTA" },
  { departamento: "TOLIMA", capital: "Ibagué", buscar: "IBAGUE" },
  { departamento: "CALDAS", capital: "Manizales", buscar: "MANIZALES" },
  { departamento: "QUINDIO", capital: "Armenia", buscar: "ARMENIA" },
  { departamento: "HUILA", capital: "Neiva", buscar: "NEIVA" },
  { departamento: "META", capital: "Villavicencio", buscar: "VILLAVICENCIO" },
  { departamento: "CESAR", capital: "Valledupar", buscar: "VALLEDUPAR" },
  { departamento: "CORDOBA", capital: "Montería", buscar: "MONTERIA" },
  { departamento: "SUCRE", capital: "Sincelejo", buscar: "SINCELEJO" },
  { departamento: "BOYACA", capital: "Tunja", buscar: "TUNJA" },
  { departamento: "CASANARE", capital: "Yopal", buscar: "YOPAL" },
  { departamento: "NARINO", capital: "Pasto", buscar: "PASTO" },
  { departamento: "CAUCA", capital: "Popayán", buscar: "POPAYAN" },
  { departamento: "LA GUAJIRA", capital: "Riohacha", buscar: "RIOHACHA" },
  { departamento: "CHOCO", capital: "Quibdó", buscar: "QUIBDO" },
  { departamento: "PUTUMAYO", capital: "Mocoa", buscar: "MOCOA" },
  { departamento: "CAQUETA", capital: "Florencia", buscar: "FLORENCIA" },
  { departamento: "GUAVIARE", capital: "San José del Guaviare", buscar: "SAN JOSE DEL GUAVIARE" },
  { departamento: "ARAUCA", capital: "Arauca", buscar: "ARAUCA" },
  { departamento: "AMAZONAS", capital: "Leticia", buscar: "LETICIA" },
  { departamento: "GUAINIA", capital: "Inírida", buscar: "INIRIDA" },
  { departamento: "VAUPES", capital: "Mitú", buscar: "MITU" },
  { departamento: "VICHADA", capital: "Puerto Carreño", buscar: "PUERTO CARRENO" },
  { departamento: "SAN ANDRES Y PROVIDENCIA", capital: "San Andrés", buscar: "SAN ANDRES ISLA" },
];

/* ── Canasta Homecenter POR CAPITAL (los que más pesan en un APU de obra).
      `token` valida que la página respondida es la del producto pedido:
      un precio sin esa confirmación no se escribe. ── */
const CANASTA_CAPITAL = [
  {
    insumo_id: "cemento_gris_50kg", producto_id: "13846", token: "Cemento Argos Gris 50kg",
    producto: "Cemento Argos Gris 50kg", unidad_fuente: "saco 50 kg",
    correspondencia: "exacta",
  },
  {
    insumo_id: "acero_refuerzo_60000_psi", producto_id: "73637", token: "Varilla G-60",
    producto: "Varilla G-60 W 1/2\" × 6 m corrugada", unidad_fuente: "varilla 1/2\" × 6 m",
    correspondencia: "aproximada",
    correspondencia_nota: "El catálogo cotiza por kg; la tienda por varilla.",
    normalizacion: { divisor: 5.964, unidad: "kg", nota: "peso nominal NTC 2289: 0,994 kg/m × 6 m = 5,964 kg" },
  },
  {
    insumo_id: "arena_de_rio", producto_id: "297067", token: "Arena de Rio 40kg",
    producto: "Arena de río 40 kg (saco)", unidad_fuente: "saco 40 kg",
    correspondencia: "aproximada",
    correspondencia_nota: "El catálogo cotiza por m³ a granel; el retail solo vende por saco y el equivalente es un múltiplo del precio de cantera. Cota superior extrema — no se convierte (la densidad no es un dato del catálogo).",
  },
  {
    insumo_id: "triturado_3_4", producto_id: "297068", token: "Gravilla 40kg",
    producto: "Gravilla 40 kg (saco)", unidad_fuente: "saco 40 kg",
    correspondencia: "aproximada",
    correspondencia_nota: "Gravilla común de saco, no triturado clasificado de 3/4\". Misma advertencia de granel que la arena.",
  },
  {
    insumo_id: "nog_tubo_pvc_sanitario_4", producto_id: "373409", token: "Tubo 4X6 Metros Sanitaria",
    producto: "Tubo PVC sanitario 4\" × 6 m", unidad_fuente: "tubo 4\" × 6 m",
    correspondencia: "exacta",
    normalizacion: { divisor: 6, unidad: "ml", nota: "el tubo mide 6 m: dividir es exacto" },
  },
  {
    insumo_id: "nog_cable_cobre_no_12_awg_tc_ls_zh", producto_id: "120440", token: "Cable No12 1mt Negro THHN",
    producto: "Cable No. 12 THHN negro (por metro)", unidad_fuente: "m",
    correspondencia: "aproximada",
    correspondencia_nota: "La tienda vende THHN; el catálogo cotiza TC LS-ZH (baja emisión de humos), que es otro aislamiento y otro precio.",
  },
  /* ── Ascendidos de Bogotá a POR CAPITAL (encargo del dueño, ago 2026:
        el APU se apoya en los precios de tienda — más cobertura, misma
        curaduría). Los cinco venían capturándose sin cookies. ── */
  {
    insumo_id: "ladrillo_tolete_comun", producto_id: "63168", token: "Ladrillo Com",
    producto: "Ladrillo común recocido 20×10×6 cm", unidad_fuente: "und", correspondencia: "exacta",
  },
  {
    insumo_id: "bloque_concreto_15", producto_id: "103517", token: "Bloque liso #15",
    producto: "Bloque liso #15 (14×19×39 cm, 13 MPa)", unidad_fuente: "und",
    correspondencia: "exacta",
    correspondencia_nota: "La denominación comercial #15 corresponde a 14 cm de ancho real.",
  },
  {
    insumo_id: "malla_electrosoldada_m_188", producto_id: "43266", token: "Malla Electrosoldada",
    producto: "Malla electrosoldada 6×2,35 m, 15×15 cm, Ø4,0 mm", unidad_fuente: "plancha 6×2,35 m (14,1 m²)",
    correspondencia: "aproximada",
    correspondencia_nota: "El diámetro de la plancha de tienda (4,0 mm) puede no ser el de la M-188.",
    normalizacion: { divisor: 14.1, unidad: "m2", nota: "la plancha mide 6 × 2,35 m = 14,1 m²: dividir es exacto" },
  },
  {
    insumo_id: "pintura_vinilo_tipo_1", producto_id: "725625", token: "Viniltex",
    producto: "Pintura tipo 1 Viniltex Ultra lavable, 1 galón", unidad_fuente: "gal",
    correspondencia: "aproximada",
    correspondencia_nota: "Línea premium del tipo 1: techo alto dentro de la categoría.",
  },
  {
    insumo_id: "alambre_negro_18", producto_id: "02199", token: "Alambre Negro",
    producto: "Alambre negro calibre 18, rollo de 10 kg (aprox. según el empaque)", unidad_fuente: "rollo ~10 kg",
    correspondencia: "exacta",
    normalizacion: { divisor: 10, unidad: "kg", nota: "el empaque declara 10 kg APROX: la división hereda ese margen" },
  },
  /* ── Nuevos (ago 2026), curados a mano contra la búsqueda de la tienda. ── */
  {
    insumo_id: "estuco_plastico", producto_id: "202824", token: "Estuco Pl",
    producto: "Estuco Plástico Interior/Exterior 1 Galón Topex", unidad_fuente: "gal",
    correspondencia: "exacta",
  },
  {
    /* el tubo suelto (sku 65876) existe pero NO se vende en línea (la PDP no
       publica precio): se captura el Propack de 6, que es el MISMO RDE 9 */
    insumo_id: "tuberia_pvc_presion_1_2", producto_id: "85867", token: "Tubo 1/2X3M 6Und",
    producto: "Tubo PVC presión 1/2\" × 3 m RDE 9 (500 PSI) · Propack 6 unidades", unidad_fuente: "propack 6 tubos × 3 m (18 ml)",
    correspondencia: "exacta",
    correspondencia_nota: "Mismo RDE 9 del catálogo (500 PSI); el precio de tienda es por paquete de 6.",
    normalizacion: { divisor: 18, unidad: "ml", nota: "6 tubos × 3 m = 18 ml: dividir es exacto" },
  },
  {
    insumo_id: "madera_formaleta", producto_id: "274734", token: "Formaleta Pino 15 Usos",
    producto: "Formaleta de pino 15 usos, 18 mm, 1,22×2,44 m", unidad_fuente: "tablero 1,22×2,44 m (2,98 m²)",
    correspondencia: "aproximada",
    correspondencia_nota: "Tablero contrachapado de formaleta; el catálogo cotiza madera ordinaria — otro material para el mismo uso, y el tablero rinde varios usos.",
    normalizacion: { divisor: 2.9768, unidad: "m2", nota: "el tablero mide 1,22 × 2,44 m = 2,9768 m²: dividir es exacto" },
  },
];

/* ── Canasta Homecenter SOLO BOGOTÁ: VACÍA desde ago 2026 — los cinco que
      vivían aquí subieron a la canasta por capital. El mecanismo se conserva
      para el próximo producto que se quiera capturar rápido sin cookies. ── */
const CANASTA_BOGOTA = [];

/* ── Easy (precio único NACIONAL — verificado: no regionaliza). ── */
const CANASTA_EASY = [
  {
    insumo_id: "cemento_gris_50kg", ft: "cemento gris 50 kg", match: /cemento tipo i gris x?50/i,
    producto: null, unidad_fuente: "saco 50 kg", correspondencia: "exacta",
  },
  {
    insumo_id: "arena_de_rio", ft: "arena de rio 40", match: /arena de rio/i,
    producto: null, unidad_fuente: "saco 40 kg", correspondencia: "aproximada",
    correspondencia_nota: "Saco de 40 kg contra m³ a granel del catálogo — cota superior extrema, no se convierte.",
  },
  {
    insumo_id: "nog_tubo_pvc_presion_1_rde_21", ft: "tubo pvc presion 1", match: /tubo pvc presi.n 1"x3m/i,
    producto: null, unidad_fuente: "tubo 1\" × 3 m", correspondencia: "aproximada",
    correspondencia_nota: "La tienda vende RDE 13.5 (pared más gruesa); el catálogo cotiza RDE 21.",
  },
];

/* ── Listas de fabricante: CURADAS A MANO, verificadas con pdftotext.
      La vigencia es la IMPRESA en el PDF (o la fecha de descarga si el PDF no
      la trae, y se dice). Evidencia: docs/INVESTIGACION_COMPETENCIA_APU.md §9. ── */
const LISTAS_FABRICANTE = [
  {
    insumo_id: "nog_tubo_pvc_presion_1_rde_21",
    fuente: "Gerfor · lista de precios oficial", declaracion: "lista_fabricante",
    url: "https://www.gerfor.com/wp-content/uploads/2025/02/V1%2025_Lista%20de%20precios%20Gerfor%202025.pdf",
    vigencia_impresa: "Febrero 2025",
    producto: "Tubo presión liso 6 m · RDE 21 (200 PSI) · 1\" (cód. 100099)",
    unidad_fuente: "tubo 6 m", precio_sin_iva: 35865, precio_con_iva: 42679,
    correspondencia: "exacta", capturado_el: "2026-08-14",
  },
  {
    insumo_id: "nog_tubo_pvc_sanitario_4",
    fuente: "Gerfor · lista de precios oficial", declaracion: "lista_fabricante",
    url: "https://www.gerfor.com/wp-content/uploads/2025/02/V1%2025_Lista%20de%20precios%20Gerfor%202025.pdf",
    vigencia_impresa: "Febrero 2025",
    producto: "Tubería coextruida sanitaria 6 m · 4\" (cód. 100150)",
    unidad_fuente: "tubo 4\" × 6 m", precio_sin_iva: 194025, precio_con_iva: 230890,
    correspondencia: "exacta",
    normalizacion: { divisor: 6, unidad: "ml", nota: "el tubo mide 6 m: dividir es exacto" },
    capturado_el: "2026-08-14",
  },
  {
    insumo_id: "teja_fibrocemento_no_8",
    fuente: "Eternit · lista de precios (vía distribuidor Coval)", declaracion: "lista_fabricante",
    url: "https://coval.com.co/pdfs/listasprecios/ult_eternit.pdf",
    vigencia_impresa: "Febrero 2026",
    producto: "TEJA FLEXIFORTE P7 N 8 (ref. 1321788, 23,63 kg)",
    unidad_fuente: "und", precio_sin_iva: 64500, precio_con_iva: 76755,
    correspondencia: "exacta", capturado_el: "2026-08-14",
  },
  {
    insumo_id: "nog_cable_cobre_no_8_awg_tc_ls_zh",
    fuente: "Procables · lista de distribuidor (Interelectricas)", declaracion: "lista_fabricante",
    url: "https://interelectricas.com.co/lista/LISTA_PRECIOS_PROCABLES.pdf",
    vigencia_impresa: null, // el PDF no imprime fecha: la vigencia es la fecha de descarga
    producto: "Cable THHN 8 AWG",
    unidad_fuente: "m", precio_sin_iva: 3968, precio_con_iva: null,
    correspondencia: "aproximada",
    correspondencia_nota: "La lista trae THHN; el catálogo cotiza TC LS-ZH (otro aislamiento).",
    capturado_el: "2026-08-13",
  },
];

/* ═══════════════════ transporte ═══════════════════ */
const pausa = (ms) => new Promise((r) => setTimeout(r, ms));

async function traer(url, opciones = {}, intento = 0) {
  try {
    const r = await fetch(url, {
      redirect: "follow",
      ...opciones,
      headers: { "user-agent": UA, ...(opciones.headers || {}) },
      signal: AbortSignal.timeout(30000),
    });
    // Un 4xx es una respuesta, no una avería: no se reintenta (regla del proyecto).
    return r;
  } catch (e) {
    if (intento < 1) { await pausa(1000); return traer(url, opciones, intento + 1); }
    return { ok: false, status: 0, _error: e.message, text: async () => "", json: async () => null };
  }
}

/* Precio principal de una página de producto de Homecenter. La página trae
   EXACTAMENTE los precios del producto principal (verificado: 2 apariciones,
   la NORMAL y la por-unidad-de-medida), así que la primera es la buena — pero
   solo si el nombre del producto pedido aparece: sin esa confirmación, null. */
function precioDePdp(html, token) {
  if (!html || !html.includes(token)) return { precio: null, motivo: "producto_no_confirmado" };
  const m = html.match(/priceWithoutFormatting":(\d+(?:\.\d+)?)/);
  const n = m ? Number(m[1]) : null;
  if (!Number.isFinite(n) || n <= 0) return { precio: null, motivo: "precio_ilegible" }; // 0 no es un precio
  return { precio: n, motivo: null };
}

/* El DEPARTAMENTO esperado valida la ubicación. No es paranoia: la búsqueda
   por nombre devuelve BARRIOS homónimos primero — «ARAUCA» casa con el barrio
   ARAUCARIA-ITAGÜÍ (Envigado) y «FLORENCIA» con un barrio de Medellín — y sin
   este filtro se capturó el precio de Antioquia etiquetado como Arauca, que es
   exactamente el falso positivo que este módulo no puede producir. */
const normDep = (s) => String(s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().trim();

async function ubicacionDe(nombre, departamentoEsperado, intento = 0) {
  const r = await traer(
    `https://www.homecenter.com.co/s/account/v2/geo/search-location-info?locationName=${encodeURIComponent(nombre)}`,
    { headers: { "x-channel-id": "WEB", "x-ecomm-name": "homecenter-co" } },
  );
  /* Un 5xx sí se reintenta (es transitorio: Armenia y Pasto dieron 500 una
     corrida y 200 la siguiente); el 4xx no — regla del proyecto. */
  if (r.status >= 500 && intento < 2) { await pausa(1500); return ubicacionDe(nombre, departamentoEsperado, intento + 1); }
  if (!r.ok) return { error: `HTTP ${r.status}` };
  let d; try { d = await r.json(); } catch { return { error: "respuesta ilegible" }; }
  const locs = (d && Array.isArray(d.locations) ? d.locations : []).filter((l) => l && l.state && l.city);
  if (!locs.length) return { error: "sin cobertura geográfica (la búsqueda de ubicación no la conoce)" };
  const esperado = normDep(departamentoEsperado);
  const loc = locs.find((l) => {
    const estado = normDep(l.state.name);
    return estado === esperado || esperado.startsWith(estado) || estado.startsWith(esperado);
  });
  if (!loc) {
    return { error: `la búsqueda solo devuelve homónimos en otro departamento (${normDep(locs[0].state.name)})` };
  }
  return { estado: loc.state.code, ciudad: loc.city.code };
}

/* ═══════════════════ captura ═══════════════════ */
async function capturarHomecenterPorCapital() {
  const porInsumo = {}; // insumo_id -> { DEPARTAMENTO: precio }
  const sinCobertura = {};
  for (const c of CANASTA_CAPITAL) porInsumo[c.insumo_id] = {};

  for (const cap of CAPITALES) {
    let cookies = null;
    if (cap.buscar) {
      const u = await ubicacionDe(cap.buscar, cap.departamento);
      await pausa(PAUSA_MS);
      if (u.error) {
        sinCobertura[cap.departamento] = `${cap.capital}: ${u.error}`;
        console.log(`  ✗ ${cap.capital} — ${u.error}`);
        continue;
      }
      cookies = `usrLocation=${u.estado}; comuna=${u.ciudad}`;
    }
    let capturados = 0;
    for (const prod of CANASTA_CAPITAL) {
      const r = await traer(`https://www.homecenter.com.co/homecenter-co/product/${prod.producto_id}/`,
        cookies ? { headers: { cookie: cookies } } : {});
      const html = r.ok ? await r.text() : "";
      const { precio, motivo } = r.ok ? precioDePdp(html, prod.token) : { precio: null, motivo: `HTTP ${r.status}` };
      if (precio != null) { porInsumo[prod.insumo_id][cap.departamento] = precio; capturados++; }
      else console.log(`    · ${cap.capital} / ${prod.insumo_id}: sin precio (${motivo})`);
      await pausa(PAUSA_MS);
    }
    if (!capturados && cap.buscar) sinCobertura[cap.departamento] = `${cap.capital}: la tienda no responde precio para esta ubicación`;
    console.log(`  ✓ ${cap.capital}: ${capturados}/${CANASTA_CAPITAL.length}`);
  }
  return { porInsumo, sinCobertura };
}

async function capturarHomecenterBogota() {
  const refs = [];
  for (const prod of CANASTA_BOGOTA) {
    const r = await traer(`https://www.homecenter.com.co/homecenter-co/product/${prod.producto_id}/`);
    const html = r.ok ? await r.text() : "";
    const { precio, motivo } = r.ok ? precioDePdp(html, prod.token) : { precio: null, motivo: `HTTP ${r.status}` };
    if (precio != null) refs.push({ ...prod, precio });
    else console.log(`    · Bogotá / ${prod.insumo_id}: sin precio (${motivo})`);
    await pausa(PAUSA_MS);
  }
  return refs;
}

async function capturarEasy() {
  const refs = [];
  for (const prod of CANASTA_EASY) {
    const r = await traer(`https://www.easy.com.co/api/catalog_system/pub/products/search?ft=${encodeURIComponent(prod.ft)}&sc=1`);
    let lista = null; try { lista = r.ok !== false ? await r.json() : null; } catch { lista = null; }
    const p = Array.isArray(lista) ? lista.find((x) => prod.match.test(x.productName || "")) : null;
    const oferta = p && p.items && p.items[0] && p.items[0].sellers && p.items[0].sellers[0]
      && p.items[0].sellers[0].commertialOffer;
    const precio = oferta && Number(oferta.Price);
    if (Number.isFinite(precio) && precio > 0) {
      refs.push({ ...prod, producto: p.productName, precio, url: p.link || "https://www.easy.com.co" });
    } else {
      console.log(`    · Easy / ${prod.insumo_id}: sin precio (${p ? "oferta ilegible o en cero" : "producto no encontrado"})`);
    }
    await pausa(PAUSA_MS);
  }
  return refs;
}

/* ═══════════════════ main ═══════════════════ */
(async () => {
  const fecha = hoyColombia();
  console.log(`Captura retail · ${fecha} (hora Colombia)\n`);

  console.log("Homecenter por capital (SSR con cookies de ubicación):");
  const hc = await capturarHomecenterPorCapital();
  console.log("\nHomecenter · canasta Bogotá:");
  const hcBogota = await capturarHomecenterBogota();
  console.log("\nEasy (precio nacional):");
  const easy = await capturarEasy();

  const referencias = [];

  for (const prod of CANASTA_CAPITAL) {
    const precios = hc.porInsumo[prod.insumo_id];
    if (!Object.keys(precios).length) continue; // sin ni un precio no hay referencia
    const { producto_id, token, ...resto } = prod;
    referencias.push({
      ...resto,
      fuente: "Homecenter", declaracion: "retail_con_iva", iva: "incluido",
      producto_id,
      url: `https://www.homecenter.com.co/homecenter-co/product/${producto_id}/`,
      alcance: "por_capital",
      precios_por_departamento: precios,
      capturado_el: fecha,
    });
  }
  for (const r of hcBogota) {
    const { producto_id, token, precio, ...resto } = r;
    referencias.push({
      ...resto,
      fuente: "Homecenter", declaracion: "retail_con_iva", iva: "incluido",
      producto_id,
      url: `https://www.homecenter.com.co/homecenter-co/product/${producto_id}/`,
      alcance: "bogota",
      precio,
      capturado_el: fecha,
    });
  }
  for (const r of easy) {
    const { ft, match, precio, url, ...resto } = r;
    referencias.push({
      ...resto,
      fuente: "Easy", declaracion: "retail_con_iva", iva: "incluido",
      url,
      alcance: "nacional", // verificado: Easy no regionaliza
      precio,
      capturado_el: fecha,
    });
  }
  for (const r of LISTAS_FABRICANTE) referencias.push({ ...r, alcance: "nacional", iva: r.precio_con_iva != null ? "ambos" : "sin_iva" });

  const salida = {
    _meta: {
      generado_por: "tests/capturar_retail.js",
      capturado_el: fecha,
      zona_horaria: "hora Colombia (UTC-5)",
      advertencia: "Precios de tienda y de lista de fabricante: son un TECHO NEGOCIABLE de referencia, jamás un precio de obra. Cada referencia declara fuente, ciudad, unidad y fecha.",
      evidencia: "docs/INVESTIGACION_COMPETENCIA_APU.md §8-§10 (verificación en vivo con códigos HTTP)",
      homecenter: { regionaliza: true, metodo: "página de producto (SSR) con cookies usrLocation/comuna por capital" },
      easy: { regionaliza: false, metodo: "API VTEX pública sc=1; precio único nacional (verificado contra 9 códigos postales)" },
      categorias_sin_retail: {
        aridos_a_granel: "El retail solo vende por saco de 40 kg; el m³ a granel es de cantera y no se convierte.",
        concreto_premezclado: "No existe en retail: canal directo de las concreteras por cotización de obra.",
        acero_figurado: "No existe en retail: es servicio de figuradora.",
      },
      departamentos_sin_cobertura: hc.sinCobertura,
    },
    referencias,
  };

  const destino = path.join(__dirname, "..", "data", "apu_retail.json");
  fs.writeFileSync(destino, JSON.stringify(salida, null, 2) + "\n");
  console.log(`\nEscrito ${destino}`);
  console.log(`Referencias: ${referencias.length} · Departamentos sin cobertura: ${Object.keys(hc.sinCobertura).length}`);
})();
