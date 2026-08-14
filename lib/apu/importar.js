/* ============================================================================
   lib/apu/importar · Filas de un Excel importado → ítems del catálogo de PRECIOS
   ----------------------------------------------------------------------------
   El usuario sube su formulario de cantidades (xlsx/csv ya parseado en el
   NAVEGADOR: aquí llegan filas estructuradas, jamás el archivo). Este módulo
   decide, fila a fila, si esa descripción corresponde a un ítem del catálogo de
   precios (`data/apu_catalogo.json`, hoy con los 157 APU adjudicados del Nogal)
   y con qué confianza.

   NO ES UN SEGUNDO MAPEADOR. Las primitivas —tokenización que CONSERVA los
   dígitos, similitud de edición, umbrales, margen sobre el segundo candidato—
   se IMPORTAN de `lib/apu_mapeo`, que ya decidió todo eso para el lector de
   pliegos y documentó por qué («RDE 21 frente a RDE 41 mueve el precio»). Dos
   definiciones de «se parecen» divergirían a la primera corrección aplicada a
   una sola. Lo único propio de aquí es contra QUÉ catálogo se compara (el de
   precios, que no tiene sinónimos curados: se puntúa contra su descripción) y
   la política de PRECIOS:

   · Fila con precio EN EL ARCHIVO → ese precio manda SIEMPRE (`precio_manual`,
     `origen_precio: "archivo"`): es el dato del usuario. Si además casa con el
     catálogo, viaja `item_id` y el motor publicará `cd_catalogo` para que la
     diferencia SE VEA, no para pisarla.
   · Fila sin precio y con mapeo → el precio sale del catálogo (la razón de ser
     de la calibración).
   · Fila sin precio y sin mapeo → ítem personalizado SIN precio: el motor la
     deja en `incompleto` («sin dato»), jamás en 0, y el Excel la marca.

   El falso positivo cuesta más que el falso negativo (la regla del módulo APU):
   un mapeo que no llega a «firme» se marca `revisar` y la interfaz y el Excel
   lo enseñan en ámbar — se usa, pero nunca en silencio.
   ========================================================================== */
"use strict";

const { norm } = require("../semantica.js");
const {
  terminosItem, similitudEdicion,
  UMBRAL_ACEPTAR, UMBRAL_FIRME, MARGEN_FIRME, MIN_COINCIDENCIAS_FIRME,
  PESO_TERMINOS, PESO_EDICION, PESO_UNIDAD,
} = require("../apu_mapeo.js");

/* ══════════════════ 1 · Unidad canónica ══════════════════
   Los archivos escriben «UND», «Un», «M», «ML», «GBL», «global»… La unidad no
   se CONVIERTE jamás (m2→m3 exigiría un espesor); solo se normaliza la GRAFÍA
   para poder comparar. `m` y `ml` son la misma unidad de pago (metro lineal) en
   todo formulario de obra; `m2`/`m²` ídem. */
const UNIDAD_EQUIV = {
  m: "ml", ml: "ml", mt: "ml", mts: "ml", metro: "ml",
  m2: "m2", m3: "m3",
  und: "und", un: "und", u: "und", unidad: "und", unid: "und",
  glb: "glb", gbl: "glb", global: "glb", gl: "glb",
  dia: "dia", kg: "kg", kgs: "kg", ton: "ton", viaje: "viaje",
  pto: "pto", punto: "pto", hora: "hora", hr: "hora",
  gal: "gal", galon: "gal", saco: "saco", lb: "lb", l: "l", lt: "l", litro: "l",
};

function unidadCanonica(u) {
  if (u == null) return null;
  const t = norm(String(u)).replace(/²/g, "2").replace(/³/g, "3").replace(/[^a-z0-9]/g, "");
  if (!t) return null;
  if (UNIDAD_EQUIV[t]) return UNIDAD_EQUIV[t];
  // «saco 50 kg» → saco · «m2-dia» queda tal cual: no está en la tabla y no se inventa
  const primera = t.split(/\d/)[0];
  return UNIDAD_EQUIV[primera] || t;
}

/* ══════════════════ 2 · Puntaje contra el catálogo de precios ══════════════
   PLURAL TOLERADO, aplicado a los DOS lados. `apu_mapeo` no lo necesita porque
   su catálogo de reconocimiento trae sinónimos curados (con singular y plural
   escritos a mano); el catálogo de precios no tiene sinónimos, y sin esta capa
   «Desmonte de Cielo Raso» no casaba con «DESMONTES DE CIELO RASOS» — el mismo
   motivo por el que el clasificador de tipologías compara con plural tolerado.
   Solo se recorta la S/ES final de tokens de letras (≥4): un número («350») no
   se toca. */
const singular = (t) => {
  if (/\d/.test(t) || t.length < 4) return t;
  if (t.endsWith("es") && t.length >= 5) return t.slice(0, -2);
  if (t.endsWith("s")) return t.slice(0, -1);
  return t;
};
const singularizar = (tokens) => [...new Set(tokens.map(singular))];

function puntuarContraCatalogo(terminos, unidadCan, itemCat) {
  const propios = itemCat._terminos || singularizar(terminosItem(itemCat.descripcion));
  const setPropios = itemCat._set || new Set(propios);
  const coincidencias = terminos.filter((t) => setPropios.has(t));
  const porTerminos = terminos.length ? coincidencias.length / terminos.length : 0;
  const porEdicion = similitudEdicion(terminos, propios);
  const unidadIgual = unidadCan != null && unidadCan === unidadCanonica(itemCat.unidad);
  const score = PESO_TERMINOS * porTerminos + PESO_EDICION * porEdicion
    + PESO_UNIDAD * (unidadIgual ? 1 : 0);
  return { score, coincidencias, unidadIgual, porTerminos, porEdicion };
}

/* ══════════════════ 3 · Mapeo de las filas importadas ══════════════════
   Un número que llega como TEXTO se lee con `numeroColombiano` (lib/apu_pliego,
   la única autoridad del formato: el punto separa MILES). El parser ingenuo
   `replace(",", ".")` leía «74.596» como 74,596 pesos — mil veces menos, la
   familia del defecto «375.0000» que este repo ya pagó. Por la interfaz las
   celdas llegan numéricas; esta puerta existe porque la acción es una API. */
const { numeroColombiano } = require("../apu_pliego.js");
const numeroONull = (v) => {
  if (v === null || v === undefined || v === "") return null;
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  return numeroColombiano(String(v));
};

/* Quita los avisos que la hoja «Presupuesto» exportada cuelga al final de la
   descripción. Se anclan a DOS espacios + el emoji, que es exactamente como los
   escribe `public/apu_libro.js`: una descripción real no lleva ese patrón, y
   exigir los dos espacios evita llevarse por delante un emoji que alguien haya
   escrito de verdad en el nombre de un ítem. */
const MARCADOR_EXPORTADO_RE = /\s{2,}(?:⛔|⚠️|⚠)[\s\S]*$/u;
const sinMarcadores = (texto) => String(texto || "").replace(MARCADOR_EXPORTADO_RE, "").trim();

/* ══════════════ 3-bis · Precio de tienda para la fila importada ═════════════
   Encargo del dueño (ago 2026): al pegar el Excel, una columna con el precio
   de Homecenter (o de donde salió) Y su fuente. La referencia es por INSUMO
   (lib/apu/retail): aquí se casa la DESCRIPCIÓN de la fila contra los insumos
   que tienen captura retail — «CEMENTO GRIS 50KG» → cemento_gris_50kg →
   Homecenter $32.500 (Bogotá, 14-ago). Es una REFERENCIA con su fuente pegada,
   jamás un precio que entre al cálculo, y por eso el umbral es el de ACEPTAR
   con el producto LITERAL visible: quien mira la columna ve exactamente qué
   producto de tienda es, y puede descartarlo en un segundo.

   Se puntúa con las MISMAS primitivas del mapeo (tokens con dígitos, similitud
   de edición, unidad canónica): una segunda definición de «se parecen» aquí
   divergiría de la del catálogo a la primera corrección. */
function candidatosRetail(catalogo) {
  const retail = require("./retail.js");
  return ((catalogo && catalogo.insumos) || [])
    .map((ins) => ({ ins, refs: ins ? retail.referenciasRetail(ins.id) : null }))
    .filter(({ refs }) => refs !== null)
    .map(({ ins, refs }) => {
      /* El vocabulario del candidato incluye el NOMBRE DEL PRODUCTO de la
         tienda, no solo el del insumo: el catálogo dice «Acero de refuerzo
         60.000 PSI» y la fila del Excel dice «VARILLA CORRUGADA 1/2» — que es
         exactamente como se llama el producto en Homecenter. Sin esto la
         columna quedaba vacía justo en las filas escritas con el nombre
         comercial, que son la mayoría. */
      const textos = [ins.nombre, ...refs.map((r) => r.producto).filter(Boolean)].join(" ");
      const t = singularizar(terminosItem(textos));
      return { id: ins.id, nombre: ins.nombre, unidad: ins.unidad, _terminos: t, _set: new Set(t) };
    });
}

function referenciaTiendaDe(descripcion, unidad, catalogo, departamento, candidatos = null) {
  const retail = require("./retail.js");
  const lista = candidatos || candidatosRetail(catalogo);
  const terminos = singularizar(terminosItem(sinMarcadores(String(descripcion || ""))));
  if (!terminos.length || !lista.length) return null;
  const unidadCan = unidadCanonica(unidad);
  let mejor = null;
  for (const c of lista) {
    const p = puntuarContraCatalogo(terminos, unidadCan, { _terminos: c._terminos, _set: c._set, unidad: c.unidad });
    if (!mejor || p.score > mejor.score) mejor = { ...p, insumo: c };
  }
  if (!mejor || mejor.score < UMBRAL_ACEPTAR || !mejor.coincidencias.length) return null;
  const refs = retail.referenciasRetail(mejor.insumo.id, departamento);
  if (!refs) return null;
  return {
    via: "descripcion",                       // casó por el texto de la fila
    insumo_id: mejor.insumo.id,
    insumo: mejor.insumo.nombre,
    confianza: Math.round(mejor.score * 1000) / 1000,
    refs,
  };
}

/**
 * @param {Array}  filas    [{codigo?, descripcion, unidad?, cantidad?, precio_archivo?, capitulo?}]
 * @param {object} catalogo forma de la SEMILLA ({items:[{codigo, descripcion, unidad, …}]})
 * @param {object} opciones {departamento} — para resolver el precio de tienda de la capital
 */
function mapearFilasImportadas(filas, catalogo, opciones = {}) {
  const departamento = (opciones && opciones.departamento) || null;
  const candidatosTienda = candidatosRetail(catalogo);
  const items = (catalogo && catalogo.items) || [];
  // los términos del catálogo se calculan UNA vez, no una por fila × ítem
  const preparados = items.map((it) => {
    const t = singularizar(terminosItem(it.descripcion));
    return { ...it, _terminos: t, _set: new Set(t) };
  });

  const salida = (filas || []).map((cruda, i) => {
    const fila = cruda || {};
    const descripcion = String(fila.descripcion || "").slice(0, 400).trim();
    const unidad = String(fila.unidad || "").slice(0, 30).trim() || null;
    const unidadCan = unidadCanonica(unidad);
    const cantidad = numeroONull(fila.cantidad);
    const precioArchivo = numeroONull(fila.precio_archivo);
    /* EL MARCADOR DEL EXCEL EXPORTADO NO ES PARTE DE LA DESCRIPCIÓN, y colarlo
       en el tokenizador ENVENENA el mapeo. La hoja «Presupuesto» cuelga avisos
       al final de la descripción («⛔ SIN PRECIO…», «⚠️ Precio no verificado…»)
       y el libro exportado se puede volver a importar con el lector del propio
       proyecto. Medido sobre 60 ítems reales: con el aviso dentro,
       59/60 pierden confianza, 21/60 caen de «firme» a «revisar» y **2/60 se
       mapean a OTRO ítem del catálogo** — o sea, a otro precio. El marcador
       rojo ya lo hacía (3/60 de nivel); el amarillo, que cubre TODA la hoja
       fuera de Bogotá, lo multiplica. Se limpia aquí, en el único sitio donde
       se tokeniza, y no en el exportador: el aviso tiene que seguir viéndose en
       la hoja, que es para lo que existe. */
    const terminos = singularizar(terminosItem(sinMarcadores(descripcion)));

    let candidatos = [];
    if (terminos.length) {
      candidatos = preparados
        .map((it) => ({ codigo: it.codigo, descripcion: it.descripcion, unidad: it.unidad, ...puntuarContraCatalogo(terminos, unidadCan, it) }))
        .sort((a, b) => b.score - a.score || String(a.codigo).localeCompare(String(b.codigo)));
    }
    const mejor = candidatos[0] || null;
    const segundo = candidatos[1] || null;
    const acepta = mejor && mejor.score >= UMBRAL_ACEPTAR;
    const margen = mejor ? (segundo ? mejor.score - segundo.score : mejor.score) : 0;
    const firme = acepta && mejor.score >= UMBRAL_FIRME
      && margen >= MARGEN_FIRME && mejor.coincidencias.length >= MIN_COINCIDENCIAS_FIRME;

    const nivel = !acepta ? "personalizado" : firme ? "firme" : "revisar";
    const conPrecioArchivo = precioArchivo !== null && precioArchivo > 0;

    /* LA REGLA DEL PRECIO AUTOMÁTICO: un mapeo «revisar» SIN precio del archivo
       NO cobra el precio del catálogo por su cuenta. Medido con el caso real:
       la fila «PENDIENTE-POSIBLE USO DE RIEL Y LUMINARIA SYLVANIA» (cantidad
       24, sin precio) alcanzaba 0,37 contra una luminaria del catálogo y salía
       presupuestada en $2,9 M inventados. El ítem viaja como SUGERENCIA
       (`item_id` con su confianza) y el usuario lo acepta en la vista previa;
       mientras tanto la fila queda «sin precio», que es la verdad. Es la regla
       del lector de pliegos: nunca se usa automáticamente una lista a medias. */
    const mapeoAutomatico = acepta && (firme || conPrecioArchivo);

    return {
      orden: i + 1,
      codigo_archivo: String(fila.codigo || "").slice(0, 30) || null,
      capitulo: String(fila.capitulo || "").slice(0, 160) || null,
      descripcion,
      unidad,
      cantidad,                                  // null si no se pudo leer: NUNCA 0
      precio_archivo: conPrecioArchivo ? precioArchivo : null,
      item_id: acepta ? mejor.codigo : null,
      nivel_mapeo: nivel,
      confianza: mejor ? Math.round(mejor.score * 1000) / 1000 : 0,
      margen: Math.round(margen * 1000) / 1000,
      coincidencias: mejor && acepta ? mejor.coincidencias : [],
      descripcion_catalogo: acepta ? mejor.descripcion : null,
      unidad_catalogo: acepta ? mejor.unidad : null,
      /* El precio de tienda de la fila, con su fuente pegada (o null: la
         ausencia no se rellena). Es la columna que pidió el dueño. */
      referencia_tienda: referenciaTiendaDe(descripcion, unidad, catalogo, departamento, candidatosTienda),
      unidad_discrepante: !!(acepta && unidadCan != null && unidadCan !== unidadCanonica(mejor.unidad)),
      mapeo_automatico: mapeoAutomatico,
      /* la ENTRADA que el editor manda a `calcular`, ya resuelta con la política
         de precios de la cabecera — así el frontend no re-decide nada */
      entrada_calculo: {
        item_id: mapeoAutomatico ? mejor.codigo : null,
        codigo: String(fila.codigo || "").slice(0, 30) || null,   // numeral del archivo (1.1, 2,1,1…)
        descripcion,
        unidad,
        capitulo: String(fila.capitulo || "").slice(0, 160) || null,
        cantidad: cantidad ?? 0,
        precio_manual: conPrecioArchivo ? precioArchivo : null,
        origen_precio: conPrecioArchivo ? "archivo" : null,
      },
    };
  });

  const firmes = salida.filter((f) => f.nivel_mapeo === "firme").length;
  const revisar = salida.filter((f) => f.nivel_mapeo === "revisar").length;
  const personalizados = salida.filter((f) => f.nivel_mapeo === "personalizado").length;
  return {
    filas: salida,
    resumen_mapeo: {
      total: salida.length,
      firmes, revisar, personalizados,        // las tres categorías SUMAN el total
      con_precio_archivo: salida.filter((f) => f.precio_archivo != null).length,
      sin_precio_ni_mapeo: salida.filter((f) => f.precio_archivo == null && !f.item_id).length,
      sin_cantidad: salida.filter((f) => f.cantidad == null).length,
      umbral_aceptar: UMBRAL_ACEPTAR, umbral_firme: UMBRAL_FIRME,
    },
  };
}

module.exports = { mapearFilasImportadas, unidadCanonica, UNIDAD_EQUIV, referenciaTiendaDe };
