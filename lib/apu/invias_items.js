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
       el de la PROVINCIA REPRESENTATIVA —la de precio mediano entre las del
       departamento (o entre las 135 del país si el departamento no tiene
       libro: Bogotá no lo tiene)—, con sus cuatro componentes (equipo,
       materiales, transporte, mano de obra) y su composición (cantidades y
       rendimientos, que el INVIAS mantiene iguales en todo el país) para el
       desglose (`apuParaDepartamento`).
   Reglas que no hay que re-aprender:
   · Es una REFERENCIA OFICIAL, no una cotización, y viaja SIEMPRE con su
     vigencia, su nivel (departamento/nacional) y las provincias que la
     sostienen (`origen_precio: "invias"`). El precio del archivo o el que
     teclea el usuario MANDAN sobre ella (la política de precios de siempre).
   · UNA provincia real, no la mediana de cada componente por separado: la
     suma de medianas no es la mediana de las sumas (hasta 5,7 % medido) y un
     unitario que no es la suma de sus componentes es «la fila que no cuadra».
   · Los precios unitarios de las LÍNEAS de la composición son los de la
     provincia de referencia (Ibagué) LLEVADOS al nivel de la provincia
     representativa con un factor por componente (publicado en cada línea):
     así la hoja de APU cuadra al peso con el unitario. Un componente que la
     composición no desglosa se publica como línea de AJUSTE con nombre.
   · El APU oficial se toma TAL CUAL: sin factor de jornada ni EPP del motor y
     sin rendimiento propio (si lo mandan, se avisa; quien difiera corrige el
     precio). El unitario del motor es la suma de componentes redondeados
     (`unitarioMotor`, ±$2 del precio oficial) y lo comparten calcular y cotizar.
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
  const s = String(u || "").trim().toLowerCase().replace(/³/g, "3").replace(/²/g, "2").replace(/\s+/g, "");
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

/* Índices de las provincias que sostienen la referencia de un DEPARTAMENTO
   (o del país si el departamento no tiene provincia con precio para el ítem —
   Bogotá figura en el listado pero el INVIAS no publica su libro). */
/* UN CERO NO ES UN PRECIO, tampoco aquí (ago 2026). El filtro era
   `Number.isFinite`, y 0 es finito: los ítems de pago 650,5 y 650,9 (transporte
   MARÍTIMO Y/O FLUVIAL de estructura metálica) traen 0 en las 117 provincias sin
   acceso fluvial —ahí el 0 de la fuente significa «no aplica», no «gratis»— y
   entraban en la mediana. El ítem se servía con `precio: 0`, `incompleto: false`
   y sin una sola alerta: una partida real presupuestada en cero. Además
   `cotizar` ya lo rechazaba (`delInviasApu` exige > 0), así que las dos vías del
   mismo ítem discrepaban. Con `> 0`, las provincias que no lo cotizan dejan de
   contar, la cascada cae a nivel nacional como con cualquier hueco y, si nadie
   lo cotiza, el motor lo marca `incompleto` por el camino que ya existe. */
const conPrecio = (v) => Number.isFinite(v) && v > 0;

function provinciasPara(it, departamento) {
  const d = departamento ? Filtros.departamento(departamento) : null;
  let usadas = (d ? INDICES_POR_DEP.get(d.codigo) || [] : []).filter((i) => conPrecio(it.precios[i]));
  let nivel = "departamento";
  if (!usadas.length) {
    usadas = (DATOS.provincias || []).map((_, i) => i).filter((i) => conPrecio(it.precios[i]));
    nivel = "nacional";
  }
  return { d, usadas, nivel };
}

/* LA PROVINCIA REPRESENTATIVA es la del costo directo MEDIANO entre las que
   sostienen la referencia (con número par, la inferior de las dos centrales).
   Se toma UN APU real y coherente —sus cuatro componentes suman su precio al
   peso, verificado en las 71 010 celdas capturadas— en vez de la mediana de
   cada componente por separado, que no suma la mediana de los totales (hasta
   5,7 % de diferencia medida): un unitario que no es la suma de sus componentes
   es «la fila que no cuadra» del módulo APU. */
function representativa(it, usadas) {
  const orden = [...usadas].sort((a, b) => it.precios[a] - it.precios[b]);
  return orden[Math.floor((orden.length - 1) / 2)];
}

/** El costo directo de referencia para un DEPARTAMENTO (o nacional). */
function precioParaDepartamento(codigoOId, departamento) {
  const it = itemPorCodigo(codigoOId);
  if (!it) return null;
  const { d, usadas, nivel } = provinciasPara(it, departamento);
  if (!usadas.length) return null;
  const rep = representativa(it, usadas);
  const c = it.componentes[rep] || [null, null, null, null];
  const prov = DATOS.provincias[rep];
  return {
    precio: Math.round(it.precios[rep]),
    componentes: { equipo: r0(c[0]), materiales: r0(c[1]), transporte: r0(c[2]), mano_obra: r0(c[3]) },
    nivel, departamento: d ? d.nombre : null,
    provincia_representativa: { provincia: prov.provincia, departamento: prov.departamento, precio: it.precios[rep] },
    mediana_total: mediana(usadas.map((i) => it.precios[i])),
    provincias: usadas.map((i) => ({ provincia: DATOS.provincias[i].provincia, departamento: DATOS.provincias[i].departamento, precio: it.precios[i] })),
    provincias_usadas: usadas.length,
    vigencia: DATOS._meta.vigencia, capturado_el: DATOS._meta.capturado_el,
    provincia_referencia_composicion: DATOS._meta.provincia_referencia,
  };
}

/* ═══════ El APU COSTEABLE de un ítem INVIAS para un departamento ═══════════
   Devuelve lo que `lib/apu/calculo.calcularItem` necesita para publicar un
   ítem con la MISMA forma que uno del catálogo: unitario, cuatro capítulos,
   herramienta menor y las LÍNEAS del desglose. Regla que lo sostiene: las
   líneas de la composición traen los precios de la provincia de REFERENCIA
   (Ibagué); para que la hoja de APU CUADRE con el unitario del departamento,
   cada componente se lleva de la referencia a la provincia representativa con
   UN factor (`factor_provincia`, publicado por línea) —que es exactamente lo
   que hace el INVIAS: mismas cantidades y rendimientos, precios por provincia—.
   Si un componente vale en la provincia representativa y la composición de
   referencia no trae líneas de ese tipo (41 casos en 71 010), la diferencia se
   publica como una línea de AJUSTE con su nombre, nunca se reparte en silencio.
   El APU oficial se toma TAL CUAL: sin factor de jornada ni EPP del motor
   (la vigencia 2026-1 ya está en la jornada vigente y el factor 2,04 del
   INVIAS no desglosa la dotación), y sin `rendimiento_override` — es una
   referencia, no una composición propia; quien difiera corrige el precio. */
const r2 = (v) => Math.round(v * 100) / 100;
function apuParaDepartamento(codigoOId, departamento) {
  const it = itemPorCodigo(codigoOId);
  if (!it) return null;
  const ref = precioParaDepartamento(codigoOId, departamento);
  if (!ref) return null;
  const idxRef = (DATOS.provincias || []).findIndex((p) => p.cod === DATOS._meta.provincia_referencia.cod);
  const compRef = (idxRef >= 0 && it.componentes[idxRef]) || [0, 0, 0, 0];
  const c = it.composicion || {};
  const hmPct = Number(c.herramienta_menor_pct) || 0;
  const target = ref.componentes; // {equipo, materiales, transporte, mano_obra} de la provincia representativa
  const hmRep = r2((target.mano_obra || 0) * hmPct);
  const pr = DATOS._meta.provincia_referencia;
  const nombreRef = pr ? `${pr.provincia} (${pr.departamento})` : "provincia de referencia";
  const nombreRep = `${ref.provincia_representativa.provincia} (${ref.provincia_representativa.departamento})`;

  const sumaValor = (arr) => (arr || []).reduce((a, l) => a + (Number(l.valor) || 0), 0);
  const factorDe = (objetivo, base) => (base > 0 ? objetivo / base : 1);
  const fEq = factorDe((target.equipo || 0) - hmRep, sumaValor(c.equipo));
  const fMat = factorDe(target.materiales || 0, sumaValor(c.materiales));
  const fTr = factorDe(target.transporte || 0, sumaValor(c.transporte));
  const fMo = factorDe(target.mano_obra || 0, sumaValor(c.mano_obra));
  const notaF = (f) => (Math.abs(f - 1) < 0.0005 ? `precio de ${nombreRef}` : `precio de ${nombreRef} × ${f.toFixed(3).replace(".", ",")} al nivel de ${nombreRep}`);

  const lineas = [];
  for (const l of c.equipo || []) {
    const horasPorUnidad = Number(l.rendimiento);   // INVIAS: valor = tarifa/hora × horas por unidad
    lineas.push({ insumo_id: l.codigo, nombre: l.descripcion, unidad: "hora", tipo: "equipo", origen_precio: "invias",
      precio_region: r2(l.tarifa_hora * fEq), precio_aplicado: r2(l.tarifa_hora * fEq),
      cantidad: Number.isFinite(horasPorUnidad) ? Math.round(horasPorUnidad * 1e6) / 1e6 : null, cantidad_base: null,
      rendimiento: Number.isFinite(horasPorUnidad) && horasPorUnidad > 0 ? Math.round((1 / horasPorUnidad) * 1e6) / 1e6 : null,
      factor_jornada: null, desperdicio: 0, distancia_km: null, valor: r2(l.valor * fEq), factor_provincia: r2(fEq), nota: `Tarifa/hora: ${notaF(fEq)}` });
  }
  for (const l of c.materiales || []) {
    lineas.push({ insumo_id: l.codigo, nombre: l.descripcion, unidad: l.unidad || null, tipo: "material", origen_precio: "invias",
      precio_region: r2(l.precio * fMat), precio_aplicado: r2(l.precio * fMat),
      cantidad: Number.isFinite(Number(l.cantidad)) ? Number(l.cantidad) : null, cantidad_base: Number.isFinite(Number(l.cantidad)) ? Number(l.cantidad) : null,
      rendimiento: null, factor_jornada: null, desperdicio: 0, distancia_km: null, valor: r2(l.valor * fMat), factor_provincia: r2(fMat), nota: notaF(fMat) });
  }
  for (const l of c.transporte || []) {
    lineas.push({ insumo_id: l.codigo, nombre: l.descripcion, unidad: l.unidad || null, tipo: "transporte", origen_precio: "invias",
      precio_region: r2(l.tarifa * fTr), precio_aplicado: r2(l.tarifa * fTr),
      cantidad: Number.isFinite(Number(l.cantidad)) ? Number(l.cantidad) : null, cantidad_base: Number.isFinite(Number(l.cantidad)) ? Number(l.cantidad) : null,
      rendimiento: null, factor_jornada: null, desperdicio: 0, distancia_km: Number.isFinite(Number(l.distancia_km)) ? Number(l.distancia_km) : null,
      valor: r2(l.valor * fTr), factor_provincia: r2(fTr), nota: `Tarifa: ${notaF(fTr)}` });
  }
  for (const l of c.mano_obra || []) {
    const rend = Number(l.rendimiento);             // INVIAS: valor = jornal con prestaciones ÷ rendimiento (unidades/día)
    lineas.push({ insumo_id: l.codigo, nombre: l.descripcion, unidad: "jornal", tipo: "mano_obra", origen_precio: "invias",
      precio_region: r2(l.jornal * fMo), precio_aplicado: r2(l.jornal_total * fMo),
      cantidad: Number.isFinite(rend) && rend > 0 ? Math.round((1 / rend) * 1e6) / 1e6 : null, cantidad_base: null,
      rendimiento: Number.isFinite(rend) ? rend : null, factor_jornada: null, desperdicio: 0, distancia_km: null,
      valor: r2(l.valor * fMo), factor_provincia: r2(fMo), prestaciones_invias: l.prestaciones ?? null,
      nota: `jornal ${notaF(fMo)}` });
  }
  /* Ajustes declarados: la diferencia entre lo que suman las líneas escaladas y
     el componente oficial de la provincia (redondeos, o un componente sin líneas
     en la composición de referencia). Solo cuando pasa de $1. */
  const objetivo = { equipo: (target.equipo || 0) - hmRep, material: target.materiales || 0, transporte: target.transporte || 0, mano_obra: target.mano_obra || 0 };
  for (const tipo of ["equipo", "material", "transporte", "mano_obra"]) {
    const suma = lineas.filter((l) => l.tipo === tipo).reduce((a, l) => a + l.valor, 0);
    const resto = r2(objetivo[tipo] - suma);
    if (Math.abs(resto) > 1) {
      lineas.push({ insumo_id: null, nombre: `Ajuste al costo directo oficial de ${nombreRep} (la composición de referencia no desglosa este valor)`,
        unidad: "und", tipo, origen_precio: "invias", precio_region: resto, precio_aplicado: resto, cantidad: 1, cantidad_base: null,
        rendimiento: null, factor_jornada: null, desperdicio: 0, distancia_km: null, valor: resto, factor_provincia: null, nota: "ajuste declarado" });
    }
  }
  return {
    ...ref,
    capitulos: {
      mano_obra: target.mano_obra || 0, materiales: target.materiales || 0,
      equipo: Math.max(0, (target.equipo || 0) - hmRep), transporte: target.transporte || 0,
      herramienta_menor: hmRep, epp: 0,
    },
    herramienta_menor_pct: hmPct,
    lineas,
    articulo: it.articulo || null, capitulo: it.capitulo || null, descripcion: it.descripcion, unidad: unidadCanonicaInvias(it.unidad),
    item_de_pago: it.codigo,
    provincia_referencia: nombreRef, provincia_representativa_nombre: nombreRep,
    ajustes: { factor_jornada: 1, epp_pct: 0, nota: "APU oficial tomado tal cual: sin factor de jornada ni EPP del motor y sin rendimiento propio." },
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
  // empate: por CÓDIGO (natural), no por descripción — «SBG-38» ordenaría 320,3,2 antes que 320,3,1
  return puntuados.sort((a, b) => b.score - a.score || b.coincidencias - a.coincidencias || a.item.item_de_pago.localeCompare(b.item.item_de_pago, "es", { numeric: true })).slice(0, max)
    .map((p) => ({ codigo: p.item.codigo, descripcion: p.item.descripcion, unidad: p.item.unidad, capitulo: p.item.capitulo, item_de_pago: p.item.item_de_pago, fuente: "invias", score: Math.round(p.score * 100) / 100 }));
}

/* El unitario que publica el MOTOR para un APU INVIAS: la SUMA de sus cuatro
   componentes ya redondeados (la regla del catálogo: los cuatro números que se
   pintan suman exactamente el quinto). Puede diferir del `precio` oficial en
   ±$2 de redondeo. Vive AQUÍ para que `calcular` y `cotizar` lean la misma
   cifra (R2): dos redondeos «equivalentes» dieron 16 537 frente a 16 536. */
function unitarioMotor(a) {
  const cap = a.capitulos;
  const r = (v) => Math.round(v * 100) / 100;
  return r(r(cap.materiales) + r(cap.mano_obra) + r(cap.equipo + cap.herramienta_menor) + r(cap.transporte));
}

function meta() {
  return {
    vigencia: DATOS._meta.vigencia, capturado_el: DATOS._meta.capturado_el, items: (DATOS.items || []).length,
    provincias: (DATOS.provincias || []).length, provincia_referencia: DATOS._meta.provincia_referencia, licencia: DATOS._meta.licencia,
    fuente: DATOS._meta.fuente,
    /* La URL de origen viaja en la meta para que `lib/apu/fuentes` pueda
       citar el documento SIN transcribirlo: una segunda lista de enlaces se
       desincroniza en cuanto se re-capture una vigencia. Es un patrón por
       provincia, no un enlace único: el banco son 135 libros. */
    url_patron: DATOS._meta.url_patron || null,
  };
}

module.exports = { PREFIJO, esCodigoInvias, codigoDe, idDe, itemPorCodigo, comoItemsDeCatalogo, precioParaDepartamento, apuParaDepartamento, unitarioMotor, lineasDeComposicion, buscar, meta, unidadCanonicaInvias };
