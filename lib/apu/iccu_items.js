/* lib/apu/iccu_items.js · LA LISTA DE PRECIOS DEL ICCU (Cundinamarca, ago 2026)
   ─────────────────────────────────────────────────────────────────────────────
   Quinto banco oficial de ítems y el MÁS GRANULAR del proyecto: la Gobernación
   de Cundinamarca publica precio POR MUNICIPIO —58 municipios en 15 provincias—
   donde el INVIAS llega a provincia y el IDU solo cubre Bogotá. Cubre
   construcción, urbanismo y vías: los capítulos de edificación completos
   (mampostería, pañetes, cubiertas, carpintería, pisos, cielo raso, pinturas)
   más acueducto, alcantarillado, andenes y sardineles.

   Se contrasta con el FFIE 2026 —dos entidades independientes, misma vigencia,
   mismo departamento— y coinciden: pañete ×1,00, mampostería ×1,01, concreto
   ×0,92 (docs/INSUMOS_2026.md §3). Dos fuentes que no se copian y dan el mismo
   número es la mejor evidencia de que ambas están vivas.

   Reglas que no hay que re-aprender:
   · EL NUMERAL NO IDENTIFICA UN ÍTEM: la numeración REINICIA en cada capítulo
     («1,9» es DEMOLICIÓN ESCALERAS en preliminares y COLLAR DE DERIVACIÓN en
     acueducto). La clave es CAPÍTULO + NUMERAL, y el capturador descarta los 59
     ítems cuya descripción seguía discrepando entre provincias con esa clave:
     ahí no se sabe cuál de los dos es, y publicar uno con el precio del otro es
     el defecto que todo esto existe para evitar.
   · SIN COMPOSICIÓN: la lista publica el valor del ítem, no su APU. Sale con
     `sin_apu: true`, como los del IDU y el FFIE; no se inventan componentes.
   · El precio de una provincia es la MEDIANA de sus municipios, y los precios
     por municipio VIAJAN ENTEROS: son el dato más fino del proyecto y quien
     conozca el municipio de la obra puede usarlo. Sin municipio se responde la
     mediana del departamento y se DECLARA de dónde salió.
   · Es de Cundinamarca: fuera del departamento el precio viaja igual y se dice.
   Módulo HOJA (solo requiere el JSON). */
"use strict";

const DATOS = require("../../data/apu_iccu_items.json");

const PREFIJO = "ICCU:";
const esCodigoIccu = (id) => typeof id === "string" && id.startsWith(PREFIJO);
const codigoDe = (id) => (esCodigoIccu(id) ? id.slice(PREFIJO.length).trim() : String(id || "").trim());
const idDe = (clave) => `${PREFIJO}${clave}`;

const POR_CLAVE = new Map((DATOS.items || []).map((it) => [it.clave, it]));

/* municipio normalizado → provincia, para poder resolver por municipio */
const sinTildes = (s) => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase().replace(/[^A-Z0-9]/g, "");
const PROVINCIA_POR_MUNICIPIO = new Map();
for (const p of DATOS.provincias || []) {
  for (const m of p.municipios || []) {
    const k = sinTildes(m);
    if (k && !PROVINCIA_POR_MUNICIPIO.has(k)) PROVINCIA_POR_MUNICIPIO.set(k, { provincia: p.provincia, municipio: m });
  }
}

const esCundinamarca = (departamento) =>
  /cundinamarca/i.test(String(departamento || "").normalize("NFD").replace(/[̀-ͯ]/g, "")) ||
  String(departamento || "").trim() === "25";

function itemPorCodigo(codigoOId) {
  return POR_CLAVE.get(codigoDe(codigoOId)) || null;
}

let _comoCatalogo = null;
/** Ítems ICCU con la FORMA de un ítem del catálogo (buscador e importador). */
function comoItemsDeCatalogo() {
  if (!_comoCatalogo) {
    _comoCatalogo = (DATOS.items || []).map((it) => ({
      codigo: idDe(it.clave), descripcion: it.descripcion, unidad: it.unidad || null,
      capitulo: it.capitulo || null, subcapitulo: null,
      fuente: "iccu", es_iccu: true, numeral_iccu: it.numeral,
    }));
  }
  return _comoCatalogo;
}

/** El precio de referencia de un ítem, para un municipio o para el departamento.
    Sin municipio responde la mediana de TODAS las provincias y lo declara:
    elegir una por omisión sería servir el precio de otra sin decirlo. */
function precioReferencia(codigoOId, { municipio = null, departamento = null } = {}) {
  const it = itemPorCodigo(codigoOId);
  if (!it) return null;

  const porProv = it.precios_por_provincia || {};
  let precio = null, nivel = null, provinciaUsada = null, municipioUsado = null;

  const hallado = municipio ? PROVINCIA_POR_MUNICIPIO.get(sinTildes(municipio)) : null;
  if (hallado && porProv[hallado.provincia]) {
    const reg = porProv[hallado.provincia];
    const idx = (DATOS.provincias.find((p) => p.provincia === hallado.provincia) || {}).municipios || [];
    const pos = idx.findIndex((m) => sinTildes(m) === sinTildes(municipio));
    /* el precio del municipio SOLO si la fila trae tantos precios como
       municipios tiene la provincia; si no, la mediana de la provincia */
    if (pos >= 0 && Array.isArray(reg.por_municipio) && reg.por_municipio.length === idx.length) {
      precio = reg.por_municipio[pos]; nivel = "municipio";
      provinciaUsada = hallado.provincia; municipioUsado = hallado.municipio;
    } else {
      precio = reg.mediana; nivel = "provincia"; provinciaUsada = hallado.provincia;
    }
  } else {
    const medianas = Object.values(porProv).map((r) => r.mediana).filter((n) => n > 0).sort((a, b) => a - b);
    if (!medianas.length) return null;
    const m = medianas.length >> 1;
    precio = medianas.length % 2 ? medianas[m] : Math.round((medianas[m - 1] + medianas[m]) / 2);
    nivel = "departamento";
  }
  if (!(precio > 0)) return null;

  const enCund = departamento ? esCundinamarca(departamento) : null;
  return {
    precio: Math.round(precio),
    clave: it.clave, numeral_iccu: it.numeral, descripcion: it.descripcion, unidad: it.unidad,
    capitulo: it.capitulo,
    nivel, provincia: provinciaUsada, municipio: municipioUsado,
    provincias_publicadas: Object.keys(porProv).length,
    vigencia: DATOS._meta.vigencia, capturado_el: DATOS._meta.capturado_el,
    departamento: departamento || null,
    ajuste_regional: enCund === false ? "ninguno" : (enCund ? "cundinamarca" : null),
    nota: nivel === "departamento"
      ? "No se indicó el municipio de la obra: se usó la MEDIANA de las 15 provincias de Cundinamarca y se declara."
      : (nivel === "provincia" ? `Se usó la mediana de la provincia ${provinciaUsada}: la fila no publica un precio por cada municipio.` : null),
    nota_regional: enCund === false
      ? "Precio de referencia del ICCU (Cundinamarca): fuera del departamento viaja SIN ajuste regional y se declara."
      : null,
    nota_fuente: DATOS._meta.nota_fuente,
  };
}

/* ══════ LA UNIDAD DE ESTE BANCO SE ROMPE POR CORRIMIENTO DE COLUMNAS ══════
   El PDF del ICCU alterna dos formas de fila («numeral | descripción | unidad |
   precios…» y «numeral | unidad | precios…», con la descripción en la línea de
   arriba) y el capturador toma la tercera columna como unidad SIN comprobar que
   lo sea. Cuando el corrimiento mete otra cosa ahí, se guarda tal cual: MEDIDO,
   141 de 1.234 ítems (11,4 %) traen como «unidad» un precio
   («1.222.065 1.225.019 …»), una descripción entera («DREN EN TUBERÍA PVC
   SANITARIA, D=4"») o texto pegado («CONSTRUCCIÓNML»).

   LO QUE **NO** SE HACE, Y POR QUÉ: no se excluyen del mapeo. Medido, 0 de 40
   descripciones de ítems con la unidad rota producen un mapeo FIRME — la unidad
   solo aporta 0,13 al puntaje, así que una unidad basura no CASA con nada y el
   ítem cae a «revisar»; no fabrica un mapeo falso. Excluirlos quitaría 141
   ítems cuyo PRECIO es bueno (lo roto es la unidad, no la cifra), y una guarda
   más ancha que el defecto cuesta más que el defecto.
   Lo que sí se hace es DECLARARLO, y que la próxima vigencia no lo cuele.

   Los otros cuatro bancos están sanos con el mismo criterio: IDU 1, FFIE 1,
   EPC 0, INVIAS 6 — y las 135 unidades «raras» del IDU (jornal, ml/mes, tramo,
   litro…) son legítimas y NO se marcan. */
const UNIDADES_LEGITIMAS_RARAS = Object.freeze(new Set(
  ["m3-km", "kg-km", "ton-m", "jornal", "tramo", "ficha", "litro", "glb", "jg", "cm"]
));
function unidadIlegible(u) {
  const s = String(u == null ? "" : u).trim();
  if (!s) return false;                       // ausencia no es rotura (R1)
  if (UNIDADES_LEGITIMAS_RARAS.has(s.toLowerCase())) return false;
  /* Las tres huellas del corrimiento, medidas sobre el banco real. */
  return /\d[.,]\d/.test(s)      // trae un precio
    || /^\d+$/.test(s)           // es solo dígitos
    || /\s/.test(s)              // trae espacios: es una descripción
    || s.length > 10;            // demasiado larga para ser una unidad
}
function censoUnidades() {
  const arr = Array.isArray(DATOS.items) ? DATOS.items : Object.values(DATOS.items || {});
  const malas = arr.filter((x) => unidadIlegible(x.unidad));
  return {
    items: arr.length,
    ilegibles: malas.length,
    pct: arr.length ? Math.round((malas.length / arr.length) * 1000) / 10 : null,
    ejemplos: malas.slice(0, 8).map((x) => ({ codigo: x.codigo || x.numeral, unidad: String(x.unidad).slice(0, 60) })),
    nota: "Unidad rota por corrimiento de columnas en el PDF de origen. El PRECIO no está afectado: "
      + "estos ítems se siguen ofreciendo, y la unidad rota no produce mapeos firmes (medido). "
      + "Se declara para que se pueda auditar y para que una vigencia nueva no lo cuele en silencio.",
  };
}

function meta() {
  return { ...DATOS._meta, provincias_detalle: DATOS.provincias || [], unidades: censoUnidades() };
}

module.exports = {
  PREFIJO, esCodigoIccu, codigoDe, idDe,
  itemPorCodigo, comoItemsDeCatalogo, precioReferencia, esCundinamarca, meta,
  unidadIlegible, censoUnidades,
};
