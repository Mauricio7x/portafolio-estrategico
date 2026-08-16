/* lib/handlers/procesos/entidades.js · GET /api/procesos?op=entidades&q=alcald
   ─────────────────────────────────────────────────────────────────────────────
   Catálogo REAL de entidades con procesos abiertos, para el filtro «Buscar
   entidad» de la Fase 8: sugerencias mientras se escribe, sobre el corpus ya
   sincronizado (no una lista escrita a mano). Devuelve como máximo 10:
     [ { nit, nombre, procesosAbiertos, valorAbierto } ]

   · PÚBLICO: nombres de entidades y conteos de procesos abiertos son datos
     públicos de SECOP II; no hay nada del perfil que redactar (la regla del
     token: lo que no sale sin llave son las CIFRAS DEL PERFIL).
   · Cuenta sobre los procesos ABIERTOS del corpus activo (estado abierto y
     cierre no vencido), sin perfil: la pregunta es «qué entidades están
     contratando», no «cuáles son las mías».
   · No escribe nada, no toma candados, no dispara sincronizaciones. Sin corpus
     responde una lista vacía y lo dice (`sincronizando:true`) — el buscador
     no puede quedarse pensando.
   · Reutiliza `cargarCorpus` del listado (misma memoización caliente): dos
     lecturas «equivalentes» del corpus divergirían en la primera corrección. */
"use strict";

const { crearRedis, hayCredenciales } = require("../../redis.js");
const { CLAVES, leerJSON } = require("../../almacen.js");
const { estado_abierto, cierre_vencido } = require("../../filtros.js");
const { buscarEntidades } = require("../../filtros_lista.js");

const MAX = 10;

module.exports = async function handler(req, res) {
  const q = req.query || {};
  res.setHeader("Cache-Control", "no-store");
  if (!hayCredenciales()) {
    return res.status(503).json({ ok: false, error: "Faltan credenciales de Upstash Redis en el despliegue." });
  }
  const consulta = String(q.q || "").trim().slice(0, 120);
  const max = Math.min(Math.max(parseInt(q.max, 10) || MAX, 1), MAX);
  const redis = crearRedis({});
  let filas;
  try {
    // require diferido: listar.js es pesado y solo hace falta su cargador
    const { cargarCorpus } = require("./listar.js");
    const meta = await leerJSON(redis, CLAVES.meta);
    filas = await cargarCorpus(redis, meta);
  } catch (e) {
    return res.status(502).json({ ok: false, error: `Redis: ${e.message}` });
  }
  if (!filas) {
    return res.status(200).json({ ok: true, entidades: [], total_entidades: 0, sincronizando: true,
      nota: "Todavía no hay corpus sincronizado: la lista de entidades se llena con la primera sincronización." });
  }
  const ahora = Date.now();
  const abiertas = filas.filter((l) => estado_abierto(l) && !cierre_vencido(l, ahora));
  const entidades = buscarEntidades(abiertas, consulta, { max });
  return res.status(200).json({
    ok: true, q: consulta || null, entidades,
    // cuántas entidades distintas hay en total (para «N entidades con procesos abiertos»)
    total_entidades: buscarEntidades(abiertas, "", { max: Number.MAX_SAFE_INTEGER }).length,
    procesos_abiertos: abiertas.length,
    fuente: "Corpus activo de SECOP II (p6dx-8zbt) sincronizado por la app: procesos abiertos con cierre no vencido.",
  });
};
