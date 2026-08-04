/* ============================================================================
   lib/apu/catalogo · Catálogo de precios APU en Redis
   ----------------------------------------------------------------------------
   La base de datos de precios con la que se puede costear un ítem de obra:
   INSUMOS (qué cuesta un saco de cemento), ÍTEMS (qué insumos y en qué
   cantidades lleva un metro cúbico de concreto) y FACTORES POR REGIÓN (cuánto
   se encarece cada capítulo fuera de Bogotá).

   La estructura de costo es la oficial INVIAS/IDU y no se discute:

     Costo Directo  = Mano de Obra + Materiales + Equipo/Herramienta + Transporte
     Precio Unitario = Costo Directo × (1 + AIU)

   DE DÓNDE SALEN LOS NÚMEROS. `data/apu_catalogo.json` es una SEMILLA CURADA —
   está escrito en el propio archivo y no debe presentarse de otro modo, igual
   que `data/vocabulario_unspsc.json`. Cada insumo declara su `fuente`:
   «recuperado» (estaba en `modulo_apu.html`, borrado en el commit d69cfe8, y se
   trajo a la base vigente con el ICOCIV del DANE), «derivado» (se calcula de
   otros insumos: las cuadrillas) o «estimado» (referencia razonada, NO una
   cotización). El método y la separación completa, en `docs/APU_Y_RENTABILIDAD.md`.

   Decisiones que no hay que re-aprender:

   · LOS PRECIOS REGIONALES SE DERIVAN, NO SE TRANSCRIBEN. La semilla trae UN
     precio base (Bogotá) por insumo y CUATRO factores por región; los cinco
     `precio_{region}` del hash salen de multiplicar el uno por el otro según el
     TIPO del insumo (un material no se encarece como un jornal). Transcribir a
     mano 5 × 48 números habría creado 240 sitios donde el catálogo puede
     desincronizarse de sus propios factores. Cuando exista una cotización real
     se pone en `precios_cotizados` y esa gana: la derivación es el DEFAULT, no
     un dogma, y el hash publica `precio_origen_{region}` para que se sepa cuál
     de las dos se está mirando.
   · UN CERO NO PUEDE SER UN PRECIO. La regla del proyecto («anticipo_pct = 0
     significa sin dato») aplica aquí entera: un insumo con precio 0 o negativo
     es un error de carga y `validarCatalogo` lo rechaza. Por eso la herramienta
     menor NO es un insumo —no tiene precio propio, es un porcentaje de la mano
     de obra— y vive como `herramienta_menor_pct` del ítem.
   · LA CARGA ES TODO O NADA. Se valida el catálogo entero ANTES de escribir el
     primer HSET: un catálogo a medias daría precios que parecen buenos. Mismo
     criterio que un POST de RUP rechazado, que no toca nada.
   · EL SELLO VA AL FINAL. `apu:catalogo:meta` se escribe después de los hashes
     y del snapshot, así que mientras no cambie nadie ve un estado a medias.
   · EL SNAPSHOT ES CACHÉ, LOS HASHES SON LA VERDAD. Servir el catálogo entero
     desde los hashes son ~70 comandos por petición; desde el snapshot son dos.
     Pero dos fuentes de verdad es exactamente el defecto que este proyecto ya
     pagó caro, así que el snapshot lleva dentro la MISMA `version` que la meta
     y quien lo lee la compara: si no casa, cae a los hashes y lo dice. Hay
     prueba de que las dos vías devuelven lo mismo.
   ========================================================================== */
"use strict";

const {
  CLAVES, comprimir, descomprimir, escribirChunks, leerJSON, escribirJSON,
} = require("../almacen.js");

const SEMILLA = require("../../data/apu_catalogo.json");

/* Los cuatro capítulos del costo directo. El `tipo` de cada insumo dice qué
   factor regional le toca y con qué fórmula se calcula su aporte. */
const TIPOS = {
  material: { factor: "factor_materiales", capitulo: "materiales" },
  mano_obra: { factor: "factor_mano_obra", capitulo: "mano_obra" },
  equipo: { factor: "factor_equipo", capitulo: "equipo" },
  transporte: { factor: "factor_transporte", capitulo: "transporte" },
};

/* ══════════════════ 1 · Validación ══════════════════ */
/* Todo o nada: si algo de esto falla no se escribe ni un byte. El catálogo se
   consulta para fijar precio de oferta, así que un ítem que referencia un
   insumo inexistente no es un aviso, es un precio mal calculado. */
function validarCatalogo(cat = SEMILLA) {
  const errores = [];
  const err = (donde, que, valor) => errores.push({ campo: donde, error: que, valor });

  const regiones = Array.isArray(cat.regiones) ? cat.regiones : [];
  const insumos = Array.isArray(cat.insumos) ? cat.insumos : [];
  const items = Array.isArray(cat.items) ? cat.items : [];
  if (!regiones.length) err("regiones", "el catálogo no trae ninguna región", null);
  if (!insumos.length) err("insumos", "el catálogo no trae ningún insumo", null);
  if (!items.length) err("items", "el catálogo no trae ningún ítem", null);

  const idsRegion = new Set();
  for (const r of regiones) {
    const id = String(r.id || "");
    if (!id) { err("regiones[].id", "es obligatorio", r); continue; }
    if (idsRegion.has(id)) err(`regiones.${id}`, "región duplicada", id);
    idsRegion.add(id);
    for (const f of ["factor_materiales", "factor_mano_obra", "factor_equipo", "factor_transporte"]) {
      const v = Number(r[f]);
      // un factor de 0 dejaría un capítulo entero en cero sin que nadie lo note
      if (!Number.isFinite(v) || v <= 0) err(`regiones.${id}.${f}`, "debe ser un número mayor que 0", r[f]);
    }
    const p = Number(r.prestacional_tipico);
    if (!Number.isFinite(p) || p < 1) err(`regiones.${id}.prestacional_tipico`, "debe ser ≥ 1 (es un multiplicador del jornal)", r.prestacional_tipico);
  }

  const idsInsumo = new Map();
  for (const i of insumos) {
    const id = String(i.id || "");
    if (!id) { err("insumos[].id", "es obligatorio", i); continue; }
    if (idsInsumo.has(id)) err(`insumos.${id}`, "insumo duplicado", id);
    if (!TIPOS[i.tipo]) err(`insumos.${id}.tipo`, `tipo desconocido: use ${Object.keys(TIPOS).join(", ")}`, i.tipo);
    if (!String(i.unidad || "").trim()) err(`insumos.${id}.unidad`, "es obligatoria", i.unidad);
    const precio = Number(i.precio_base);
    // el cero es la trampa: «sin dato» disfrazado de gratis
    if (!Number.isFinite(precio) || precio <= 0) {
      err(`insumos.${id}.precio_base`, "debe ser un número mayor que 0 (un 0 sería «sin dato» disfrazado de gratis)", i.precio_base);
    }
    idsInsumo.set(id, i);
  }

  /* las cuadrillas declaran de quién se componen: si alguien sube el jornal del
     ayudante y no la cuadrilla, el catálogo queda diciendo dos cosas distintas
     sobre el mismo día de trabajo */
  for (const i of insumos) {
    if (!i.componentes) continue;
    let suma = 0, completo = true;
    for (const [ref, n] of Object.entries(i.componentes)) {
      const base = idsInsumo.get(ref);
      if (!base) { err(`insumos.${i.id}.componentes.${ref}`, "componente inexistente", ref); completo = false; continue; }
      suma += Number(base.precio_base) * Number(n);
    }
    if (completo && Math.round(suma) !== Math.round(Number(i.precio_base))) {
      err(`insumos.${i.id}.precio_base`, `no coincide con la suma de sus componentes (${Math.round(suma)})`, i.precio_base);
    }
  }

  const codigos = new Set();
  for (const it of items) {
    const cod = String(it.codigo || "");
    if (!cod) { err("items[].codigo", "es obligatorio", it); continue; }
    if (codigos.has(cod)) err(`items.${cod}`, "código de ítem duplicado", cod);
    codigos.add(cod);
    if (!String(it.descripcion || "").trim()) err(`items.${cod}.descripcion`, "es obligatoria", it.descripcion);
    if (!String(it.unidad || "").trim()) err(`items.${cod}.unidad`, "es obligatoria", it.unidad);
    if (!/^\d{2}$/.test(String(it.unspsc_segmento || ""))) {
      err(`items.${cod}.unspsc_segmento`, "debe ser el segmento UNSPSC de dos dígitos", it.unspsc_segmento);
    }
    const comp = Array.isArray(it.insumos) ? it.insumos : null;
    if (!comp || !comp.length) { err(`items.${cod}.insumos`, "debe traer al menos un insumo", it.insumos); continue; }
    for (const [n, linea] of comp.entries()) {
      const base = `items.${cod}.insumos[${n}]`;
      const ins = idsInsumo.get(String(linea.insumo_id || ""));
      if (!ins) { err(`${base}.insumo_id`, "referencia un insumo que no existe en el catálogo", linea.insumo_id); continue; }
      const tipo = ins.tipo;
      if (tipo === "mano_obra" || tipo === "equipo") {
        const r = Number(linea.rendimiento);
        // rendimiento 0 sería una división por cero: precio infinito, no «gratis»
        if (!Number.isFinite(r) || r <= 0) err(`${base}.rendimiento`, `un insumo de tipo «${tipo}» exige rendimiento > 0`, linea.rendimiento);
      } else {
        const c = Number(linea.cantidad_por_unidad);
        if (!Number.isFinite(c) || c <= 0) err(`${base}.cantidad_por_unidad`, `un insumo de tipo «${tipo}» exige cantidad_por_unidad > 0`, linea.cantidad_por_unidad);
        const d = Number(linea.desperdicio);
        if (!Number.isFinite(d) || d < 0 || d > 1) err(`${base}.desperdicio`, "es una fracción entre 0 y 1 (0.05 = 5 %)", linea.desperdicio);
        if (tipo === "transporte") {
          const km = Number(linea.distancia_km);
          if (!Number.isFinite(km) || km <= 0) err(`${base}.distancia_km`, "una línea de transporte exige distancia_km > 0", linea.distancia_km);
        }
      }
    }
  }

  /* y la comprobación de que el catálogo SIRVE: cada ítem tiene que producir un
     costo directo positivo en todas las regiones. Un ítem que cuesta 0 pasaría
     todas las validaciones de campo de arriba y sería inservible. */
  if (!errores.length) {
    for (const it of items) {
      for (const r of regiones) {
        const cd = costoDirecto(it, cat, r.id);
        if (!(cd.total > 0)) err(`items.${it.codigo}`, `costo directo no positivo en la región ${r.id}`, cd.total);
      }
    }
  }

  return { ok: errores.length === 0, errores };
}

/* ══════════════════ 2 · Precios por región ══════════════════ */
const regionDe = (cat, id) => (cat.regiones || []).find((r) => r.id === id) || null;
const insumoDe = (cat, id) => (cat.insumos || []).find((i) => i.id === id) || null;

/* precio del insumo en una región: cotización real si la hay, factor si no.
   Devuelve también DE DÓNDE sale — una cifra sin su origen no se puede
   discutir, que es la misma regla de `granularidad_utilizada` del índice de
   baja y de la `fuente` de la probabilidad. */
function precioEnRegion(insumo, region) {
  const cotizado = insumo.precios_cotizados && insumo.precios_cotizados[region.id];
  if (Number.isFinite(Number(cotizado)) && Number(cotizado) > 0) {
    return { precio: Math.round(Number(cotizado)), origen: "cotizado" };
  }
  const factor = Number(region[(TIPOS[insumo.tipo] || TIPOS.material).factor]);
  return { precio: Math.round(Number(insumo.precio_base) * factor), origen: "derivado" };
}

/* Todos los precios de un insumo, región por región. */
function preciosDeInsumo(insumo, cat = SEMILLA) {
  const precios = {};
  const origenes = {};
  for (const r of cat.regiones || []) {
    const { precio, origen } = precioEnRegion(insumo, r);
    precios[r.id] = precio;
    origenes[r.id] = origen;
  }
  return { precios, origenes };
}

/* ══════════════════ 3 · Costo directo de un ítem ══════════════════ */
/* Las cuatro fórmulas del APU, en un solo sitio. No es la calculadora de
   rentabilidad (eso es la Fase 2: AIU, contribución del 5 %, estampillas y
   flujo de caja); es lo mínimo para poder AFIRMAR que el catálogo produce
   precios y no basura, y lo usa `validarCatalogo` antes de escribir nada. */
function costoDirecto(item, cat = SEMILLA, regionId = cat._meta.region_base) {
  const region = regionDe(cat, regionId);
  if (!region) return { total: 0, capitulos: {}, error: `región desconocida: ${regionId}` };
  const cap = { mano_obra: 0, materiales: 0, equipo: 0, transporte: 0, herramienta_menor: 0 };

  for (const linea of item.insumos || []) {
    const insumo = insumoDe(cat, linea.insumo_id);
    if (!insumo) continue;
    const { precio } = precioEnRegion(insumo, region);
    const t = TIPOS[insumo.tipo];
    if (!t) continue;
    if (insumo.tipo === "mano_obra") {
      // jornal TOTAL = jornal base × factor prestacional, y luego ÷ rendimiento
      cap.mano_obra += (precio * Number(region.prestacional_tipico)) / Number(linea.rendimiento);
    } else if (insumo.tipo === "equipo") {
      cap.equipo += precio / Number(linea.rendimiento);
    } else if (insumo.tipo === "transporte") {
      cap.transporte += precio * Number(linea.cantidad_por_unidad) * Number(linea.distancia_km);
    } else {
      cap.materiales += precio * Number(linea.cantidad_por_unidad) * (1 + Number(linea.desperdicio || 0));
    }
  }
  // la herramienta menor es un % de la mano de obra: no es un insumo con precio
  cap.herramienta_menor = cap.mano_obra * Number(item.herramienta_menor_pct || 0);

  const total = Object.values(cap).reduce((a, b) => a + b, 0);
  for (const k of Object.keys(cap)) cap[k] = Math.round(cap[k]);
  return { total: Math.round(total), capitulos: cap, region: regionId };
}

/* ══════════════════ 4 · Serialización a hash ══════════════════ */
/* Redis guarda cadenas: los campos compuestos van como JSON y quien lee los
   parsea. `insumos` del ítem es el que exige el encargo en JSON. */
function hashDeInsumo(insumo, cat) {
  const { precios, origenes } = preciosDeInsumo(insumo, cat);
  const h = {
    id: insumo.id,
    nombre: insumo.nombre,
    unidad: insumo.unidad,
    tipo: insumo.tipo,
    fuente: insumo.fuente || "estimado",
    precio_base: String(insumo.precio_base),
    fecha_actualizacion: cat._meta.base_precios,
  };
  for (const [region, precio] of Object.entries(precios)) {
    h[`precio_${region}`] = String(precio);
    h[`precio_origen_${region}`] = origenes[region];
  }
  return h;
}

function hashDeItem(item, cat) {
  return {
    codigo: item.codigo,
    descripcion: item.descripcion,
    unidad: item.unidad,
    capitulo: item.capitulo || "",
    unspsc_segmento: item.unspsc_segmento,
    unspsc_clases: JSON.stringify(item.unspsc_clases || []),
    herramienta_menor_pct: String(item.herramienta_menor_pct || 0),
    fuente: item.fuente || "estimado",
    insumos: JSON.stringify(item.insumos || []),
    fecha_actualizacion: cat._meta.base_precios,
  };
}

function hashDeRegion(region, cat) {
  const aiu = region.aiu_tipico || {};
  return {
    id: region.id,
    nombre: region.nombre,
    ciudad_cabecera: region.ciudad_cabecera || "",
    factor_materiales: String(region.factor_materiales),
    factor_mano_obra: String(region.factor_mano_obra),
    factor_equipo: String(region.factor_equipo),
    factor_transporte: String(region.factor_transporte),
    aiu_tipico: String(Number(aiu.a || 0) + Number(aiu.i || 0) + Number(aiu.u || 0)),
    aiu_detalle: JSON.stringify(aiu),
    prestacional_tipico: String(region.prestacional_tipico),
    indice_ciudad_recuperado: String(region.indice_ciudad_recuperado ?? ""),
    fecha_actualizacion: cat._meta.base_precios,
  };
}

/* ══════════════════ 5 · Carga ══════════════════ */
/* Sello con sufijo aleatorio además del ISO, por lo mismo que el del RUP y el
   de la experiencia: dos cargas en el mismo milisegundo darían el mismo sello y
   la segunda pasaría desapercibida para quien los compara (aquí, el snapshot). */
const sello = () => `${new Date().toISOString()}#${Math.random().toString(36).slice(2, 10)}`;

async function cargarCatalogo(redis, { forzar = false, catalogo = SEMILLA } = {}) {
  const v = validarCatalogo(catalogo);
  if (!v.ok) {
    return {
      ok: false, escrito: false,
      error: `El catálogo tiene ${v.errores.length} error${v.errores.length === 1 ? "" : "es"} de validación: no se escribió nada.`,
      errores: v.errores,
    };
  }

  /* «llena Redis si las claves no existen»: la meta es el sello de que la carga
     anterior terminó entera. Si está y la versión de la semilla no cambió, no
     se reescriben 70 claves para dejarlas igual. */
  const metaPrevia = await leerJSON(redis, CLAVES.apuMeta);
  if (metaPrevia && metaPrevia.version_catalogo === catalogo._meta.version && !forzar) {
    return {
      ok: true, escrito: false, ya_cargado: true,
      version: metaPrevia.version,
      version_catalogo: metaPrevia.version_catalogo,
      cargado_el: metaPrevia.cargado_el,
      insumos: metaPrevia.insumos, items: metaPrevia.items, regiones: metaPrevia.regiones,
      nota: "El catálogo ya estaba cargado con esta misma versión. Use forzar=true para reescribirlo.",
    };
  }

  const version = sello();
  /* `cargado_el`, NO `cargado`. La meta se esparce sobre la respuesta de los dos
     endpoints, y allí `cargado` es el BOOLEANO «¿está cargado?»: con el mismo
     nombre, la fecha pisaba al booleano en silencio y `cargado` pasaba a ser una
     cadena siempre veraz. Es `total_procesos`/`procesos_contados` otra vez —dos
     cosas distintas con nombres que colisionan— y hay prueba de que el booleano
     sigue siendo booleano. */
  const cargado_el = new Date().toISOString();

  for (const r of catalogo.regiones) await redis.hset(CLAVES.apuFactores(r.id), hashDeRegion(r, catalogo));
  for (const i of catalogo.insumos) await redis.hset(CLAVES.apuInsumo(i.id), hashDeInsumo(i, catalogo));
  for (const it of catalogo.items) await redis.hset(CLAVES.apuItem(it.codigo), hashDeItem(it, catalogo));

  /* snapshot comprimido (deflate nivel 6, partido a ≤500 KB por `empaquetar`,
     que es la misma maquinaria de los chunks del corpus). Lleva la `version`
     dentro para que quien lo lea pueda comprobar que no está rancio. */
  const registros = [
    ...catalogo.regiones.map((r) => ({ _k: `region:${r.id}`, t: "region", d: hashDeRegion(r, catalogo) })),
    ...catalogo.insumos.map((i) => ({ _k: `insumo:${i.id}`, t: "insumo", d: hashDeInsumo(i, catalogo) })),
    ...catalogo.items.map((it) => ({ _k: `item:${it.codigo}`, t: "item", d: hashDeItem(it, catalogo) })),
  ];
  const viejos = await redis.scan(CLAVES.patronApuChunks);
  if (viejos.length) await redis.del(...viejos);
  const nChunks = await escribirChunks(redis, CLAVES.apuChunk, 0, registros);
  await escribirJSON(redis, CLAVES.apuManifest, { version, chunks: nChunks, registros: registros.length });

  const meta = {
    version,
    version_catalogo: catalogo._meta.version,
    cargado_el,
    base_precios: catalogo._meta.base_precios,
    region_base: catalogo._meta.region_base,
    icociv: catalogo._meta.icociv,
    prestacional: catalogo._meta.prestacional,
    insumos: catalogo.insumos.length,
    items: catalogo.items.length,
    regiones: catalogo.regiones.length,
    chunks: nChunks,
    bytes_snapshot: Buffer.byteLength(comprimir(registros), "base64"),
  };
  // el sello, AL FINAL: mientras no cambie, nadie puede leer un catálogo a medias
  await escribirJSON(redis, CLAVES.apuMeta, meta);

  return { ok: true, escrito: true, ya_cargado: false, ...meta };
}

/* ══════════════════ 6 · Lectura ══════════════════ */
const numero = (v) => { const n = Number(v); return Number.isFinite(n) ? n : null; };
const jsonSeguro = (v, porDefecto) => { try { return JSON.parse(v); } catch { return porDefecto; } };

async function leerMeta(redis) { return leerJSON(redis, CLAVES.apuMeta); }

/* Los precios de un insumo, región por región. Lee el HASH, que es la fuente de
   verdad. Devuelve null si el insumo no está: no existe no es lo mismo que
   cuesta cero, y este proyecto ya sabe lo que cuesta confundirlos. */
async function obtenerPreciosInsumo(redis, insumo) {
  const id = String(insumo || "").trim();
  if (!id) return null;
  const h = await redis.hgetall(CLAVES.apuInsumo(id));
  if (!h || !h.id) return null;
  // UNA sola función traduce hash→insumo, la lea quien la lea: si hubiera dos,
  // `/api/apu/catalogo` y esta consulta podrían acabar discrepando del mismo dato
  return insumoDeHash(h);
}

/* Snapshot → objeto {regiones, insumos, items} o null si no está o está rancio.
   El sello del snapshot tiene que ser el MISMO de la meta: si no, el catálogo
   se recargó y este snapshot es de la versión anterior. */
async function leerSnapshot(redis, meta) {
  const man = await leerJSON(redis, CLAVES.apuManifest);
  if (!man || !man.chunks) return null;
  if (!meta || man.version !== meta.version) return null;
  const claves = Array.from({ length: man.chunks }, (_, i) => CLAVES.apuChunk(i));
  const salida = { regiones: [], insumos: [], items: [] };
  let leidos = 0;
  for (const b of await redis.mget(claves)) {
    const filas = descomprimir(b);
    if (filas == null) return null; // un chunk corrupto invalida el snapshot: se cae a los hashes
    for (const r of filas) {
      leidos++;
      if (r.t === "region") salida.regiones.push(r.d);
      else if (r.t === "insumo") salida.insumos.push(r.d);
      else if (r.t === "item") salida.items.push(r.d);
    }
  }
  return leidos === man.registros ? salida : null;
}

/* hash → insumo. La comparten la consulta de un insumo suelto y el catálogo
   entero; los campos `precio_{region}` se descubren por patrón, así que añadir
   una región no obliga a tocar el lector. */
function insumoDeHash(h) {
  const precios = {}, origenes = {};
  for (const [campo, valor] of Object.entries(h)) {
    const m = /^precio_(?!base$|origen_)(.+)$/.exec(campo);
    if (m) precios[m[1]] = numero(valor);
    const o = /^precio_origen_(.+)$/.exec(campo);
    if (o) origenes[o[1]] = valor;
  }
  return {
    insumo: h.id, nombre: h.nombre, unidad: h.unidad, tipo: h.tipo, fuente: h.fuente,
    precio_base: numero(h.precio_base), precios, precio_origen: origenes,
    fecha_actualizacion: h.fecha_actualizacion || null,
  };
}

const itemDeHash = (h) => ({
  codigo: h.codigo,
  descripcion: h.descripcion,
  unidad: h.unidad,
  capitulo: h.capitulo || null,
  unspsc_segmento: h.unspsc_segmento,
  unspsc_clases: jsonSeguro(h.unspsc_clases, []),
  herramienta_menor_pct: numero(h.herramienta_menor_pct),
  fuente: h.fuente,
  insumos: jsonSeguro(h.insumos, []),
  fecha_actualizacion: h.fecha_actualizacion || null,
});

/* La lista de ítems del catálogo. Prefiere el snapshot (dos comandos) y cae a
   los hashes cuando no lo hay o no corresponde a la versión vigente; la vía
   usada viaja en la respuesta para que nadie tenga que adivinarla. */
async function obtenerItems(redis) {
  const meta = await leerMeta(redis);
  const snap = await leerSnapshot(redis, meta);
  if (snap) return { items: snap.items.map(itemDeHash), via: "snapshot", version: meta.version };

  const claves = await redis.scan(CLAVES.patronApuItems);
  const items = [];
  for (const k of claves.sort()) {
    const h = await redis.hgetall(k);
    if (h && h.codigo) items.push(itemDeHash(h));
  }
  return { items, via: "hashes", version: meta ? meta.version : null };
}

const regionDeHash = (h) => ({
  region: h.id,
  nombre: h.nombre,
  ciudad_cabecera: h.ciudad_cabecera || null,
  factor_materiales: numero(h.factor_materiales),
  factor_mano_obra: numero(h.factor_mano_obra),
  factor_equipo: numero(h.factor_equipo),
  factor_transporte: numero(h.factor_transporte),
  aiu_tipico: numero(h.aiu_tipico),
  aiu_detalle: jsonSeguro(h.aiu_detalle, {}),
  prestacional_tipico: numero(h.prestacional_tipico),
  indice_ciudad_recuperado: numero(h.indice_ciudad_recuperado),
  fecha_actualizacion: h.fecha_actualizacion || null,
});

async function obtenerFactoresRegion(redis, region) {
  const id = String(region || "").trim();
  if (!id) return null;
  const h = await redis.hgetall(CLAVES.apuFactores(id));
  if (!h || !h.id) return null;
  return regionDeHash(h);
}

/* Catálogo completo para /api/apu/catalogo: los tres bloques de una vez. */
async function obtenerCatalogo(redis) {
  const meta = await leerMeta(redis);
  if (!meta) return { cargado: false, meta: null, regiones: [], insumos: [], items: [], via: null };
  const snap = await leerSnapshot(redis, meta);
  if (snap) {
    return {
      cargado: true, meta, via: "snapshot",
      regiones: snap.regiones.map(regionDeHash),
      insumos: snap.insumos.map(insumoDeHash),
      items: snap.items.map(itemDeHash),
    };
  }
  const regiones = [];
  for (const k of (await redis.scan(CLAVES.patronApuFactores)).sort()) {
    const h = await redis.hgetall(k);
    if (h && h.id) regiones.push(regionDeHash(h));
  }
  const insumos = [];
  for (const k of (await redis.scan(CLAVES.patronApuInsumos)).sort()) {
    const h = await redis.hgetall(k);
    if (h && h.id) insumos.push(insumoDeHash(h));
  }
  const { items } = await obtenerItems(redis);
  return { cargado: true, meta, via: "hashes", regiones, insumos, items };
}

module.exports = {
  SEMILLA, TIPOS,
  validarCatalogo, costoDirecto, preciosDeInsumo, precioEnRegion,
  cargarCatalogo, leerMeta,
  obtenerPreciosInsumo, obtenerItems, obtenerFactoresRegion, obtenerCatalogo,
};
