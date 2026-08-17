/* lib/apu/idu_items.js · LOS PRECIOS DE REFERENCIA DEL IDU COMO ÍTEMS COSTEABLES (ago 2026)
   ─────────────────────────────────────────────────────────────────────────────
   Segundo banco oficial de ítems, después de los 526 APU del INVIAS
   (lib/apu/invias_items). El IDU publica cada semestre su Base de Precios de
   Referencia para Bogotá: 3 172 APU valorados de infraestructura vial y espacio
   público (redes de acueducto, alcantarillado, eléctricas y de datos, andenes y
   sardineles, pavimentos, estructuras, mobiliario, señalización…). Bogotá es
   donde más licitaciones tiene el dueño y donde el catálogo (edificación) y el
   INVIAS (carreteras) dejaban sin precio a media obra urbana.
   Diferencias con el INVIAS que hay que tener presentes:
   · SOLO PRECIO: el visor publica el valor del APU, no su composición ni sus
     componentes. El ítem sale con la forma de un precio SIN desglose
     (`sin_apu: true`, va a `sin_desglose` del reparto), con `origen_precio:
     "idu"` y su referencia pegada. No se inventan componentes.
   · SOLO BOGOTÁ: no se regionaliza (sin componentes no hay a qué aplicar los
     factores del catálogo, y un factor único sería inventado). Fuera de
     Bogotá el precio viaja igual y se DECLARA (`ajuste_regional: "ninguno"`).
   · Referencia oficial, no cotización: precio propio, del archivo o tecleado
     MANDAN sobre él (la política de siempre) y queda como `cd_catalogo`.
   Módulo HOJA (solo requiere el JSON). */
"use strict";

const DATOS = require("../../data/apu_idu_items.json");

const PREFIJO = "IDU:";
const esCodigoIdu = (id) => typeof id === "string" && id.startsWith(PREFIJO);
const codigoDe = (id) => (esCodigoIdu(id) ? id.slice(PREFIJO.length).trim() : String(id || "").trim());
const idDe = (codigo) => `${PREFIJO}${codigo}`;
const POR_CODIGO = new Map((DATOS.items || []).map((it) => [it.codigo, it]));

function itemPorCodigo(codigoOId) {
  return POR_CODIGO.get(codigoDe(codigoOId)) || null;
}

let _comoCatalogo = null;
/** Ítems IDU con la FORMA de un ítem del catálogo (buscador e importador). */
function comoItemsDeCatalogo() {
  if (!_comoCatalogo) {
    _comoCatalogo = (DATOS.items || []).map((it) => ({
      codigo: idDe(it.codigo), descripcion: it.descripcion, unidad: it.unidad || null,
      capitulo: it.capitulo || null, subcapitulo: it.subcapitulo || null, fuente: "idu", es_idu: true,
      codigo_idu: it.codigo,
    }));
  }
  return _comoCatalogo;
}

const esBogota = (departamento) => /bogot/i.test(String(departamento || "").normalize("NFD").replace(/[̀-ͯ]/g, ""));

/** El precio de referencia de un ítem IDU (Bogotá) y su trazabilidad. */
function precioReferencia(codigoOId, departamento = null) {
  const it = itemPorCodigo(codigoOId);
  if (!it || !(it.precio > 0)) return null;
  const enBogota = departamento ? esBogota(departamento) : null;
  return {
    precio: Math.round(it.precio),
    codigo_idu: it.codigo, capitulo: it.capitulo, subcapitulo: it.subcapitulo, descripcion: it.descripcion, unidad: it.unidad,
    actualizacion: it.actualizacion,
    vigencia: DATOS._meta.vigencia, publicado: DATOS._meta.publicado, capturado_el: DATOS._meta.capturado_el,
    ciudad: DATOS._meta.ciudad,
    // fuera de Bogotá el precio es el mismo y se dice; `null` sin departamento (no se sabe)
    ajuste_regional: enBogota === null ? null : enBogota ? "bogota" : "ninguno",
    nota_regional: enBogota === false ? `Precio de referencia de ${DATOS._meta.ciudad} (IDU ${DATOS._meta.vigencia}), sin ajuste al departamento: el visor no publica componentes.` : null,
    iva_aiu: DATOS._meta.iva_aiu,
  };
}

function buscar(texto, { max = 12 } = {}) {
  const { terminosItem } = require("../apu_mapeo.js");
  const t = terminosItem(String(texto || ""));
  if (!t.length) return [];
  const out = [];
  for (const it of comoItemsDeCatalogo()) {
    const propios = new Set(terminosItem(it.descripcion));
    const c = t.filter((x) => propios.has(x)).length;
    if (c) out.push({ item: it, score: c / t.length, c });
  }
  return out.sort((a, b) => b.score - a.score || b.c - a.c || a.item.codigo_idu.localeCompare(b.item.codigo_idu, "es", { numeric: true })).slice(0, max)
    .map((p) => ({ codigo: p.item.codigo, descripcion: p.item.descripcion, unidad: p.item.unidad, capitulo: p.item.capitulo, codigo_idu: p.item.codigo_idu, fuente: "idu", score: Math.round(p.score * 100) / 100 }));
}

function meta() {
  const m = DATOS._meta;
  return { vigencia: m.vigencia, publicado: m.publicado, capturado_el: m.capturado_el, items: (DATOS.items || []).length, insumos: (DATOS.insumos || []).length, ciudad: m.ciudad, fuente: m.fuente, url: m.url, alcance: m.alcance, iva_aiu: m.iva_aiu };
}

module.exports = { PREFIJO, esCodigoIdu, codigoDe, idDe, itemPorCodigo, comoItemsDeCatalogo, precioReferencia, buscar, meta };
