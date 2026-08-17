/* lib/apu/invias_items.js · LOS APU DE REFERENCIA DEL INVIAS COMO ÍTEMS COSTEABLES (ago 2026)
   ─────────────────────────────────────────────────────────────────────────────
   Encargo del dueño (17-ago-2026): «no sabemos los precios de los ítems…
   básicamente no sirve». El catálogo propio (174 ítems) no alcanza a un
   presupuesto real: casi todo caía en «personalizado, sin precio». Este módulo
   sirve los 526 APU de referencia regionalizados del INVIAS
   (data/apu_invias_items.json, capturados con tests/capturar_invias_apu.js)
   como ítems del editor:
     · se BUSCAN por nombre y se MAPEAN desde un Excel importado, junto a los
       del catálogo (id `INVIAS:200,1,1`, con el ítem de pago del INVIAS);
     · se COSTEAN con el costo directo oficial del DEPARTAMENTO de la obra:
       la MEDIANA entre las provincias del departamento (o la nacional si el
       departamento no está en el banco — Bogotá no lo está), con las cuatro
       componentes (equipo, materiales, transporte, mano de obra) medianas de
       las mismas provincias, y su composición (cantidades y rendimientos, que
       el INVIAS mantiene iguales en todo el país) para el desglose.
   Reglas que no hay que re-aprender:
   · Es una REFERENCIA OFICIAL, no una cotización, y viaja SIEMPRE con su
     vigencia, su nivel (departamento/nacional) y las provincias que la
     sostienen (`origen_precio: "invias"`). El precio del archivo o el que
     teclea el usuario MANDAN sobre ella (la política de precios de siempre).
   · Los precios unitarios de las LÍNEAS de la composición son los de la
     provincia de referencia (Ibagué), no los del departamento: se declara en
     cada línea. Lo que sí es del departamento son las cuatro componentes.
   · El departamento se resuelve por CÓDIGO DANE con `Filtros.departamento`
     (la misma regla del listado): «TOLIMA», «Tolima» y «73» son lo mismo.
   · Módulo HOJA (solo requiere el JSON y public/filtros.js). */
"use strict";

const DATOS = require("../../data/apu_invias_items.json");
const Filtros = require("../../public/filtros.js");

const PREFIJO = "INVIAS:";
const esCodigoInvias = (id) => typeof id === "string" && id.startsWith(PREFIJO);
const codigoDe = (id) => (esCodigoInvias(id) ? id.slice(PREFIJO.length).trim() : String(id || "").trim());
const idDe = (codigo) => `${PREFIJO}${codigo}`;

const POR_CODIGO = new Map((DATOS.items || []).map((it) => [it.codigo, it]));
/* provincias por código DANE del departamento → índices en `precios` */
const INDICES_POR_DEP = new Map();
(DATOS.provincias || []).forEach((p, i) => {
  const d = Filtros.departamento(p.departamento);
  const k = d ? d.codigo : `?${p.departamento}`;
  if (!INDICES_POR_DEP.has(k)) INDICES_POR_DEP.set(k, []);
  INDICES_POR_DEP.get(k).push(i);
});

const mediana = (xs) => {
  const v = xs.filter((x) => Number.isFinite(x)).sort((a, b) => a - b);
  if (!v.length) return null;
  const m = Math.floor(v.length / 2);
  return v.length % 2 ? v[m] : (v[m - 1] + v[m]) / 2;
};
const r0 = (v) => (v == null ? null : Math.round(v));

function itemPorCodigo(codigoOId) {
  return POR_CODIGO.get(codigoDe(codigoOId)) || null;
}

/* «m2»/«m3» ya vienen así; «u» → «und» (la grafía del catálogo); «t» → «ton» */
function unidadCanonicaInvias(u) {
  const s = String(u || "").trim().toLowerCase();
  if (s === "u" || s === "un" || s === "und") return "und";
  if (s === "t" || s === "ton") return "ton";
  return s || null;
}

/** Ítems INVIAS con la FORMA de un ítem del catálogo (para el buscador y el
 *  importador): { codigo: "INVIAS:…", descripcion, unidad, capitulo, fuente }. */
let _comoCatalogo = null;
function comoItemsDeCatalogo() {
  if (!_comoCatalogo) {
    _comoCatalogo = (DATOS.items || []).map((it) => ({
      codigo: idDe(it.codigo), descripcion: it.descripcion, unidad: unidadCanonicaInvias(it.unidad),
      capitulo: it.capitulo || null, articulo: it.articulo || null, fuente: "invias", es_invias: true,
      item_de_pago: it.codigo,
    }));
  }
  return _comoCatalogo;
}

/** El costo directo de referencia para un DEPARTAMENTO (o nacional). */
function precioParaDepartamento(codigoOId, departamento) {
  const it = itemPorCodigo(codigoOId);
  if (!it) return null;
  const d = departamento ? Filtros.departamento(departamento) : null;
  let indices = d ? INDICES_POR_DEP.get(d.codigo) || [] : [];
  let nivel = "departamento";
  let usadas = indices.filter((i) => Number.isFinite(it.precios[i]));
  /* sin provincia CON PRECIO en el departamento (Bogotá figura en el listado pero
     el INVIAS no publica su libro) → mediana nacional, y se dice */
  if (!usadas.length) { indices = (DATOS.provincias || []).map((_, i) => i); nivel = "nacional"; usadas = indices.filter((i) => Number.isFinite(it.precios[i])); }
  const precio = mediana(usadas.map((i) => it.precios[i]));
  if (precio == null) return null;
  const comp = [0, 1, 2, 3].map((k) => mediana(usadas.map((i) => (it.componentes[i] || [])[k])));
  return {
    precio: Math.round(precio),
    componentes: { equipo: r0(comp[0]), materiales: r0(comp[1]), transporte: r0(comp[2]), mano_obra: r0(comp[3]) },
    nivel, departamento: d ? d.nombre : null,
    provincias: usadas.map((i) => ({ provincia: DATOS.provincias[i].provincia, departamento: DATOS.provincias[i].departamento, precio: it.precios[i] })),
    provincias_usadas: usadas.length,
    vigencia: DATOS._meta.vigencia, capturado_el: DATOS._meta.capturado_el,
    provincia_referencia_composicion: DATOS._meta.provincia_referencia,
  };
}

/** Las líneas del desglose (composición de la provincia de referencia). */
function lineasDeComposicion(codigoOId) {
  const it = itemPorCodigo(codigoOId);
  const c = it && it.composicion;
  if (!c) return [];
  const pr = DATOS._meta.provincia_referencia;
  const ref = pr ? `${pr.provincia} (${pr.departamento})` : "provincia de referencia";
  const out = [];
  for (const l of c.equipo || []) out.push({ insumo_id: l.codigo, nombre: l.descripcion, unidad: "hora", tipo: "equipo", origen_precio: "invias_referencia", precio_region: l.tarifa_hora, precio_aplicado: l.tarifa_hora, rendimiento: l.rendimiento, valor: l.valor, nota: `Tarifa/hora de ${ref}` });
  for (const l of c.materiales || []) out.push({ insumo_id: l.codigo, nombre: l.descripcion, unidad: l.unidad, tipo: "material", origen_precio: "invias_referencia", precio_region: l.precio, precio_aplicado: l.precio, cantidad: l.cantidad, cantidad_base: l.cantidad, valor: l.valor, nota: `Precio de ${ref}` });
  for (const l of c.transporte || []) out.push({ insumo_id: l.codigo, nombre: l.descripcion, unidad: l.unidad, tipo: "transporte", origen_precio: "invias_referencia", precio_region: l.tarifa, precio_aplicado: l.tarifa, cantidad: l.cantidad, distancia_km: l.distancia_km, valor: l.valor, nota: `Tarifa de ${ref}` });
  for (const l of c.mano_obra || []) out.push({ insumo_id: l.codigo, nombre: l.descripcion, unidad: "jornal", tipo: "mano_obra", origen_precio: "invias_referencia", precio_region: l.jornal_total, precio_aplicado: l.jornal_total, rendimiento: l.rendimiento, valor: l.valor, nota: `Jornal con prestaciones de ${ref}` });
  return out;
}

/** Búsqueda por nombre (tokens del mapeo: conservan dígitos), para el buscador
 *  del editor. Devuelve como mucho `max` ítems ordenados por coincidencias. */
function buscar(texto, { max = 12 } = {}) {
  const { terminosItem } = require("../apu_mapeo.js");
  const t = terminosItem(String(texto || ""));
  if (!t.length) return [];
  const puntuados = [];
  for (const it of comoItemsDeCatalogo()) {
    const propios = new Set(terminosItem(it.descripcion));
    const coincidencias = t.filter((x) => propios.has(x)).length;
    if (!coincidencias) continue;
    puntuados.push({ item: it, score: coincidencias / t.length, coincidencias });
  }
  return puntuados.sort((a, b) => b.score - a.score || b.coincidencias - a.coincidencias || a.item.descripcion.localeCompare(b.item.descripcion)).slice(0, max)
    .map((p) => ({ codigo: p.item.codigo, descripcion: p.item.descripcion, unidad: p.item.unidad, capitulo: p.item.capitulo, item_de_pago: p.item.item_de_pago, fuente: "invias", score: Math.round(p.score * 100) / 100 }));
}

function meta() {
  return {
    vigencia: DATOS._meta.vigencia, capturado_el: DATOS._meta.capturado_el, items: (DATOS.items || []).length,
    provincias: (DATOS.provincias || []).length, provincia_referencia: DATOS._meta.provincia_referencia, licencia: DATOS._meta.licencia,
    fuente: DATOS._meta.fuente,
  };
}

module.exports = { PREFIJO, esCodigoInvias, codigoDe, idDe, itemPorCodigo, comoItemsDeCatalogo, precioParaDepartamento, lineasDeComposicion, buscar, meta, unidadCanonicaInvias };
