/* ============================================================================
   lib/apu/biblioteca · Los APU que el usuario ya aceptó vuelven solos (10-nov-2026)
   ----------------------------------------------------------------------------
   Capa 1 del plan «APU propios de Detekta». Hasta hoy, al guardar un borrador
   Detekta aprendía SOLO el precio de cada ítem (`apu:precios:{perfil}`, por
   código). Aquí aprende el APU ENTERO —insumos, cantidades, precios y de dónde
   salió— de cada fila que lo trae: el análisis que el usuario cargó en su Excel
   (`composicion_usuario`, completo y cuadrado) o el que buscó la IA y él aceptó
   (`composicion_aceptada`). La próxima vez que esa misma actividad aparezca en
   cualquier presupuesto suyo, «Calcular» la costea con ese APU, sin Claude.

   QUÉ ES «LA MISMA ACTIVIDAD»: la descripción normalizada (sin tildes, sin
   mayúsculas, espacios colapsados) y la unidad canónica, IGUALES. No hay
   parecido: «Enchape 50x100» no es «Enchape 60x60», y un APU pegado al ítem
   equivocado es un precio equivocado. Lo parecido es asunto de otras capas.

   LOS PRECIOS VIAJAN CON SU FECHA y no se reajustan solos: medido el 10-nov-2026,
   casar un insumo por su nombre contra las tablas con precio (catálogo, IDU)
   solo encontró precio para el 16 % de los insumos de EPC, con un error mediano
   de 24 %; reajustar así le metería ese ruido a precios que el usuario fijó. La
   pantalla dice de cuándo es el APU (`aprendido_el`) y avisa si es viejo.

   Se lee en `presupuestoDe` (lib/handlers/apu/editor), la misma función de
   «Calcular» y de Piso/Techo, y SOLO con credencial, como los precios
   corregidos: sin ella cualquiera podría pedir los APU de otro perfil.
   ========================================================================== */
"use strict";

const MAX_ENTRADAS = 3000;
const MAX_LINEAS = 40;
const TOLERANCIA = 0.015;

function claveDe(descripcion, unidad) {
  const { norm } = require("../semantica.js");
  const { unidadCanonica } = require("./importar.js");
  /* la descripción ENTERA: cortada a 300 caracteres juntaba la tubería de 150, 250 y 330 psi del IDU (revisión
     adversaria del 10-nov-2026). El motor le pasa la descripción completa de la entrada, no la recortada. */
  const d = norm(String(descripcion || "")).replace(/\s+/g, " ").trim();
  const u = unidadCanonica(unidad);
  return d && u ? `${d}|${u}` : null;
}

const num = (v) => { if (v == null || v === "") return null; const n = Number(v); return Number.isFinite(n) ? n : null; };

/* la entrada que se aprende de una fila guardada, o null si la fila no trae un APU completo que explique su precio */
function entradaDe(it, hoy) {
  if (!it || typeof it !== "object") return null;
  const precio = num(it.precio_manual);
  if (!(precio > 0)) return null;
  const clave = claveDe(it.descripcion, it.unidad);
  if (!clave) return null;
  let lineas = null, origen = null;
  const aceptada = Array.isArray(it.composicion_aceptada) ? it.composicion_aceptada : Array.isArray(it.ia_composicion) ? it.ia_composicion : null;
  if (it.origen_precio === "ia" && aceptada) {
    lineas = require("./calculo.js").composicionAceptadaDe(aceptada, precio);
    /* el del MODELO ABIERTO se distingue (confianza baja, sin medir): la etiqueta lo dice al volver */
    origen = it.ia_fuente && /modelo abierto/i.test(String(it.ia_fuente.nombre || "")) ? "modelo" : "ia";
  } else if (it.origen_precio === "biblioteca" && aceptada) {
    return null;   // ya viene de la biblioteca: no se reaprende a sí misma (y no se le renueva la fecha)
  } else if (it.composicion_usuario && (it.origen_precio === "archivo" || it.origen_precio == null)) {
    const comp = require("./precios_ia.js").composicionLimpia(it.composicion_usuario);
    if (!comp) return null;
    const crudas = comp.componentes.map((c) => ({
      tipo: c.tipo, insumo: c.insumo, unidad: c.unidad, cantidad_total: c.es_porcentaje ? c.fraccion : c.cantidad_total,
      precio_unitario: c.es_porcentaje ? null : c.precio_unitario, valor_total: c.valor_total, origen: "suyo", fuente: "APU del usuario",
    }));
    if (crudas.some((c) => c.valor_total == null)) return null;
    lineas = require("./calculo.js").composicionAceptadaDe(crudas, precio);
    origen = "archivo";
  }
  if (!lineas || !lineas.length) return null;
  return {
    clave,
    entrada: {
      descripcion: String(it.descripcion).slice(0, 400), unidad: String(it.unidad).slice(0, 30), total: Math.round(precio * 100) / 100,
      componentes: lineas.slice(0, MAX_LINEAS), origen, aprendido_el: hoy,
    },
  };
}

/** Aprende los APU completos de las filas de un borrador. Devuelve { guardados }. */
async function aprender(redis, perfil, items, { ttl = 0, hoy = null } = {}) {
  if (!redis || !perfil || !Array.isArray(items)) return { guardados: 0 };
  const { CLAVES } = require("../almacen.js");
  const fecha = hoy || new Date(Date.now() - 5 * 3600e3).toISOString().slice(0, 10);
  const campos = {};
  for (const it of items) {
    const e = entradaDe(it, fecha);
    if (e) campos[e.clave] = JSON.stringify(e.entrada);
  }
  /* UNA CORRECCIÓN TECLEADA DESPLAZA AL APU GUARDADO (revisión adversaria del 10-nov-2026): si el usuario escribió
     a mano otro precio para esa actividad, el APU viejo deja de volver solo */
  const corregidas = [...new Set(items.filter((it) => it && num(it.precio_manual) > 0 && it.origen_precio === "manual").map((it) => claveDe(it.descripcion, it.unidad)).filter((k) => k && !campos[k]))];
  if (corregidas.length) await redis.hdel(CLAVES.apuBiblioteca(perfil), ...corregidas);
  const claves = Object.keys(campos);
  if (!claves.length) return { guardados: 0, retirados: corregidas.length };
  if (claves.length > MAX_ENTRADAS) return { guardados: 0, error: `Demasiados APU (${claves.length}).` };
  await redis.hset(CLAVES.apuBiblioteca(perfil), campos);
  if (ttl > 0) await redis.expire(CLAVES.apuBiblioteca(perfil), ttl);
  return { guardados: claves.length };
}

/** Los APU de la biblioteca para estas filas: Map(clave → entrada). Lee solo los campos que hacen falta. */
async function paraFilas(redis, perfil, items) {
  const mapa = new Map();
  if (!redis || !perfil || !Array.isArray(items) || !items.length) return mapa;
  /* ni las filas con precio (manda el suyo) ni las que traen su PROPIO APU (`con_apu_del_usuario`: el análisis nuevo
     manda sobre el viejo de la biblioteca; revisión adversaria del 10-nov-2026) */
  const claves = [...new Set(items.map((it) => (it && !(num(it.precio_manual) > 0) && !it.con_apu_del_usuario ? claveDe(it.descripcion, it.unidad) : null)).filter(Boolean))];
  if (!claves.length) return mapa;
  const { CLAVES } = require("../almacen.js");
  const vals = await redis.hmget(CLAVES.apuBiblioteca(perfil), claves);
  claves.forEach((k, i) => {
    const v = vals && vals[i];
    if (!v) return;
    try { const e = JSON.parse(v); if (e && num(e.total) > 0 && Array.isArray(e.componentes)) mapa.set(k, e); } catch { /* entrada ilegible: como si no estuviera */ }
  });
  return mapa;
}

module.exports = { claveDe, entradaDe, aprender, paraFilas, MAX_ENTRADAS, TOLERANCIA };
