/* ============================================================================
   lib/compactar · La base de datos deja de llenarse (30-sep-2026)
   ----------------------------------------------------------------------------
   Por qué existe: del 28 al 30-sep-2026 Upstash pasó del tope del plan gratuito
   (256 MB) y rechazó toda escritura: la lista se quedó en el 27-sep. Medido en
   producción con `op=espacio` el 30-sep-2026: 257,2 MB de datos, de los que el
   HISTÓRICO eran 175,1 MB (1.327 bloques, con las versiones viejas que el delta le
   va añadiendo) y los procesos del año 39,5 MB.

   Dos piezas, en este orden:

   1. `liberarSiLlena` — SOLO si la base no acepta una escritura de prueba del tamaño
      de la holgura que necesita la compactación (HOLGURA_BYTES). Con la base llena
      no se puede escribir ni la copia nueva de un mes: hay que BORRAR primero, y
      solo lo que la aplicación rehace sola, en un orden declarado (`rehacibles`),
      volviendo a probar tras cada borrado. Lo que tiene una construcción o una
      carga en curso (su candado puesto) no se toca. Nunca corpus ni datos del
      usuario (la suite lo censa).
   2. `reempacarHistorico` — cada mes del histórico se reescribe en pocos bloques y
      SIN las versiones viejas de un proceso: se queda la de `:updated_at` más
      reciente, que es la que ven todos los lectores (`leerChunksDedup`). Si dos
      versiones EMPATAN en `:updated_at` se guardan LAS DOS: quién gana el empate lo
      sigue decidiendo el orden de lectura, como antes, y no se borra información
      (SECOP trae filas con el mismo proceso y el mismo sello y distinto
      adjudicatario: 92 de 9.474 en una muestra, revisión adversaria).
      Lo que SÍ cambia, dicho: el desglose de probabilidad de un proceso que ya solo
      está en el histórico cuenta sus versiones con `senales: true`
      (lib/probabilidad_desglose); tras compactar ve una. Es lo mismo que ya deja el
      refresco mensual al volver a bajar el mes; el corpus ACTIVO, donde esas señales
      deciden la tarjeta, no se toca.
      El orden no se negocia: se ESCRIBE lo nuevo, se VERIFICA leyéndolo de vuelta
      fila por fila, se mueve el manifiesto y lo viejo se BORRA EN UNA VUELTA
      POSTERIOR, pasada la GRACIA: un lector que listó los bloques (SCAN) antes de
      que existiera lo nuevo solo conoce lo viejo, y si se lo borraban a mitad de
      lectura leía el mes vacío en silencio (reproducido con el índice de baja: 392
      procesos analizados → 21). La gracia dura más que cualquier función de Vercel,
      así que cuando se borra ya no queda ningún lector así. Un corte a mitad deja
      duplicados (que la lectura resuelve), nunca pérdida.
   ========================================================================== */
"use strict";

const crypto = require("crypto");
const { relojDeTanda } = require("./presupuesto.js");

const CLAVE_SONDA = "espacio:sonda";   // la prueba de escritura: 60 s y se borra; no es dato de nadie
const HOLGURA_BYTES = 4 * 1024 * 1024; // lo que se prueba que cabe: la copia nueva de un mes pequeño
const LOTE_LECTURA = 8;                // claves por MGET: 8 bloques llenos ≈ 5,3 MB < 10 MB por petición
const GRACIA_MS = 6 * 60e3;            // > maxDuration de cualquier función (300 s): ningún lector lista y lee más que esto
const PRESUPUESTO_DEFECTO_MS = 150000;
/* Lo viejo de un mes ya compactado, esperando su gracia. En una clave APARTE y no en el
   manifiesto: el refresco mensual reescribe el manifiesto entero y se llevaría la lista. */
const clavePorBorrar = (mes) => `espacio:por_borrar:${mes}`;

/* Lo que se puede borrar cuando la base está llena, en ESTE orden: primero lo que
   nadie lee (avances y copias a medio construir de construcciones que no corren),
   al final la copia publicada del perfil de los competidores, que `rehacerIndice`
   vuelve a construir sola en cuanto hay sitio. */
function rehacibles() {
  const { CLAVES } = require("./almacen.js");
  const { GRANULARIDADES } = require("./indice_baja.js");
  const constructores = [CLAVES.lock, CLAVES.lockHistorico, CLAVES.lockIndiceBaja];
  return [
    { clave: CLAVES.indiceBajaProgreso, candados: constructores, que_es: "el avance guardado de una reconstrucción del índice de baja que no terminó",
      consecuencia: "la próxima reconstrucción de ese índice empieza de cero" },
    { clave: CLAVES.indiceProgreso, candados: constructores, que_es: "el avance guardado de una reconstrucción del índice de competencia que no terminó",
      consecuencia: "la próxima reconstrucción de ese índice empieza de cero" },
    ...[CLAVES.indiceNuevo, CLAVES.indiceGanadoresNuevo, CLAVES.indiceAdjudicatarioNuevo, ...GRANULARIDADES.map((g) => CLAVES.indiceBajaNuevo(g))]
      .map((clave) => ({ clave, candados: constructores, que_es: "la copia a medio construir de un índice", consecuencia: "ninguna: se descarta al publicar el índice" })),
    { clave: CLAVES.indiceAdjudicatario, candados: constructores, que_es: "la copia publicada del perfil de cada competidor",
      consecuencia: "mientras se reconstruye (lo hace sola la compactación en cuanto hay sitio), el perfil del competidor se calcula recorriendo el histórico, más lento" },
  ];
}

const baseLlenaDe = (e) => require("./error_interno.js").baseLlenaDe(e && e.message);

/* ¿Caben `bytes` más? Se escribe una sonda de ese tamaño y se borra enseguida. `llena`
   con las cifras de Upstash si la rechaza por estar llena (lib/error_interno: una sola
   lectura de ese texto). Otro fallo se lanza: no es «llena» y no se decide nada sobre él. */
async function pruebaEscritura(redis, { bytes = HOLGURA_BYTES } = {}) {
  try {
    await redis.set(CLAVE_SONDA, "x".repeat(Math.max(1, bytes)), { ex: 60 });
    try { await redis.del(CLAVE_SONDA); } catch { /* caduca sola */ }
    return { acepta: true, llena: null };
  } catch (e) {
    const llena = baseLlenaDe(e);
    if (llena) return { acepta: false, llena };
    throw e;
  }
}

async function liberarSiLlena(redis, { holguraBytes = HOLGURA_BYTES } = {}) {
  const inicial = await pruebaEscritura(redis, { bytes: holguraBytes });
  let prueba = inicial;
  const liberadas = [], respetadas = [];
  for (const r of rehacibles()) {
    if (prueba.acepta) break;
    if (!Number(await redis.exists(r.clave))) continue;
    const candados = await redis.mget(r.candados);
    if ((candados || []).some((v) => v != null)) { respetadas.push({ clave: r.clave, motivo: "hay una construcción o una carga en curso" }); continue; }
    await redis.del(r.clave);
    liberadas.push({ clave: r.clave, que_es: r.que_es, consecuencia: r.consecuencia });
    prueba = await pruebaEscritura(redis, { bytes: holguraBytes });
  }
  return {
    llena_al_empezar: !inicial.acepta,
    uso_bytes: inicial.llena ? inicial.llena.uso_bytes : null,
    limite_bytes: inicial.llena ? inicial.llena.limite_bytes : null,
    holgura_probada_bytes: holguraBytes,
    liberadas, respetadas, acepta_escrituras: prueba.acepta,
  };
}

const indiceDe = (clave) => { const m = /:chunk:(\d+)$/.exec(String(clave)); return m ? Number(m[1]) : -1; };
const bytesDe = (vs) => vs.reduce((s, v) => s + (v == null ? 0 : Buffer.byteLength(String(v))), 0);

async function leerValores(redis, claves) {
  const valores = [];
  for (let i = 0; i < claves.length; i += LOTE_LECTURA) valores.push(...(await redis.mget(claves.slice(i, i + LOTE_LECTURA))));
  return valores;
}

/* Las filas que se guardan: por cada proceso (`_k`), TODAS las versiones con el
   `:updated_at` más alto —la que ve un lector, y las que empatan con ella— sin
   duplicados exactos. Las filas sin `_k` se guardan todas. */
function versionesVigentes(filas) {
  const maxPorK = new Map();
  for (const r of filas) {
    if (r == null || r._k == null) continue;
    const u = String(r[":updated_at"] || "");
    if (!maxPorK.has(r._k) || u > maxPorK.get(r._k)) maxPorK.set(r._k, u);
  }
  const vistas = new Set();
  const salida = [];
  for (const r of filas) {
    if (r == null) continue;
    if (r._k != null && String(r[":updated_at"] || "") !== maxPorK.get(r._k)) continue;
    const firma = JSON.stringify(r);
    if (vistas.has(firma)) continue;
    vistas.add(firma);
    salida.push(r);
  }
  return salida;
}
const firmas = (filas) => filas.map((r) => JSON.stringify(r)).sort();

/* Un mes. Devuelve su estado: «compactado» (lo viejo queda por borrar), «viejos_borrados»,
   «esperando» (lo viejo aún en su gracia), «ya_compacto», «no_se_toca» (con el motivo) o
   «base_llena» (lo nuevo se borró; lo viejo quedó intacto). */
async function reempacarMes(redis, mes, clavesMes, { ahora = Date.now } = {}) {
  const A = require("./almacen.js");
  const { CLAVES } = A;
  const claves = clavesMes.slice().sort((a, b) => indiceDe(a) - indiceDe(b));
  const man = (await A.leerJSON(redis, CLAVES.histManifest(mes))) || { base: 0, sig: 0, count: 0 };
  const base = man.base || 0, sig = man.sig || 0;
  const enRango = claves.filter((k) => indiceDe(k) >= base && indiceDe(k) < sig);
  const porBorrar = await A.leerJSON(redis, clavePorBorrar(mes));

  /* 1 · lo viejo de una vuelta anterior: se borra pasada la gracia, y SOLO lo que sigue
     por debajo del manifiesto (nadie vuelve a escribir por debajo de `base`) */
  if (porBorrar) {
    const desde = Date.parse(porBorrar.desde);
    if (!(Number.isFinite(desde) && ahora() - desde >= GRACIA_MS)) return { mes, estado: "esperando", motivo: "lo viejo se borra pasada la gracia, en la próxima vuelta" };
    const lista = Array.isArray(porBorrar.claves) ? porBorrar.claves : [];
    const viejas = lista.filter((k) => CLAVES.mesDeClaveHist(k) === mes && indiceDe(k) >= 0 && indiceDe(k) < base);
    for (let i = 0; i < viejas.length; i += 50) await redis.del(...viejas.slice(i, i + 50));
    await redis.del(clavePorBorrar(mes));
    return { mes, estado: "viejos_borrados", bloques: viejas.length };
  }
  if (man.compacto_bloques === enRango.length && enRango.length === claves.length && man.formato === A.FORMATO_ESCRITURA) {
    return { mes, estado: "ya_compacto", bloques: claves.length };
  }

  // 2 · leer UNA vez lo que ven los lectores (SCAN, no el rango del manifiesto)
  const valores = await leerValores(redis, claves);
  const enMemoria = new Map(claves.map((k, i) => [k, valores[i]]));
  let filasAntes = 0;
  const todas = [];
  for (const k of claves) {
    const v = enMemoria.get(k);
    if (v == null) continue;
    const f = A.descomprimir(v);
    if (!Array.isArray(f)) return { mes, estado: "no_se_toca", motivo: "hay un bloque que no se puede leer: no se reescribe lo que no se pudo verificar" };
    filasAntes += f.length;
    todas.push(...f);
  }
  const filas = versionesVigentes(todas);
  // la comprobación con la regla de los lectores: lo que verían antes y después es lo mismo
  const leido = await A.leerChunksDedup({ mget: async (ks) => ks.map((k) => enMemoria.get(k) ?? null) }, claves);
  const porK = new Set(leido.map((r) => r._k));
  if (filas.filter((r) => r._k != null).some((r) => !porK.has(r._k))) return { mes, estado: "no_se_toca", motivo: "lo que se guardaría no casa con lo que ven los lectores" };

  // 3 · escribir lo nuevo por encima de todo lo existente, verificarlo, y mover el manifiesto
  const desde = Math.max(claves.length ? indiceDe(claves[claves.length - 1]) + 1 : 0, sig);
  const borrarNuevas = async () => {
    try {
      const escritas = (await redis.scan(CLAVES.patronChunksHistMes(mes))).filter((k) => indiceDe(k) >= desde);
      for (let i = 0; i < escritas.length; i += 50) await redis.del(...escritas.slice(i, i + 50));
    } catch { /* quedan duplicados que la lectura resuelve y la próxima vuelta compacta */ }
  };
  let hasta;
  try {
    hasta = await A.escribirChunks(redis, (i) => CLAVES.histChunk(mes, i), desde, filas);
    const nuevas = Array.from({ length: hasta - desde }, (_, i) => CLAVES.histChunk(mes, desde + i));
    const valoresNuevos = await leerValores(redis, nuevas);
    const releidas = [];
    for (const v of valoresNuevos) { const f = v == null ? null : A.descomprimir(v); if (Array.isArray(f)) releidas.push(...f); }
    const igual = JSON.stringify(firmas(releidas)) === JSON.stringify(firmas(filas))
      && valoresNuevos.every((v) => v != null && A.formatoDe(v) === A.FORMATO_ESCRITURA);
    if (!igual) { await borrarNuevas(); return { mes, estado: "no_se_toca", motivo: "la copia nueva no coincidió al leerla de vuelta: se borró y lo de antes quedó igual" }; }
    await A.escribirJSON(redis, CLAVES.histManifest(mes), {
      ...man, base: desde, sig: hasta, count: filas.length, updatedAt: new Date(ahora()).toISOString(),
      compacto_bloques: hasta - desde, formato: A.FORMATO_ESCRITURA,
    });
    /* después del manifiesto: si esto no se escribe, lo viejo queda fuera del rango y la
       próxima vuelta lo vuelve a juntar (sin pérdida). Y aunque se escribiera sin que el
       manifiesto se moviera, al borrar solo cuenta lo que quedó POR DEBAJO de `base`. */
    try { await A.escribirJSON(redis, clavePorBorrar(mes), { claves, desde: new Date(ahora()).toISOString() }); } catch { /* ver arriba */ }
    return {
      mes, estado: "compactado", bloques_antes: claves.length, bloques_despues: hasta - desde,
      filas_antes: filasAntes, filas: filas.length, bytes_antes: bytesDe(valores), bytes_despues: bytesDe(valoresNuevos),
    };
  } catch (e) {
    await borrarNuevas();
    if (baseLlenaDe(e)) return { mes, estado: "base_llena" };
    throw e;
  }
}

/* Todos los meses del histórico, de los que tienen menos bloques a los que tienen más
   (con la base casi llena, cada mes pequeño deja sitio para el siguiente). Toma los DOS
   candados que escriben en el histórico —el de la actualización (el delta le añade
   filas) y el de la extracción— y no toca el mes que una extracción a medias tenga
   abierto; si eso no se puede saber, no toca ninguno. */
async function reempacarHistorico(redis, { presupuestoMs = PRESUPUESTO_DEFECTO_MS, ahora = Date.now } = {}) {
  const A = require("./almacen.js");
  const { CLAVES } = A;
  const t0 = ahora();
  const testigo = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
  const tomados = [];
  const soltar = async () => {
    for (const k of tomados) { try { if ((await redis.get(k)) === testigo) await redis.del(k); } catch { /* su caducidad lo suelta */ } }
  };
  try {
    for (const [clave, ttl] of [[CLAVES.lock, A.LOCK_TTL_SEG], [CLAVES.lockHistorico, A.LOCK_HISTORICO_TTL_SEG]]) {
      if ((await redis.set(clave, testigo, { nx: true, ex: ttl })) !== "OK") {
        return { ocupado: true, motivo: "hay una actualización o una extracción del histórico corriendo: se compacta en la próxima vuelta", meses: [], pendientes: null };
      }
      tomados.push(clave);
    }
    let abiertos;
    try { abiertos = await require("./handlers/procesos/sync.js").mesesEnBackfill(redis, { estricto: true }); }
    catch (e) {
      return { ocupado: true, motivo: `no se sabe qué mes tiene abierto la extracción del histórico (${String((e && e.message) || e).slice(0, 120)}): no se toca ninguno`, meses: [], pendientes: null };
    }
    const porMes = new Map();
    for (const k of await redis.scan(CLAVES.patronChunksHist)) {
      const mes = CLAVES.mesDeClaveHist(k);
      if (!mes) continue;
      if (!porMes.has(mes)) porMes.set(mes, []);
      porMes.get(mes).push(k);
    }
    const orden = [...porMes.entries()].sort((a, b) => a[1].length - b[1].length || (a[0] < b[0] ? -1 : 1));
    const tanda = relojDeTanda(t0, presupuestoMs, { ahora });
    const meses = [];
    let pendientes = 0, paro = null;
    for (const [mes, claves] of orden) {
      if (paro || tanda.agotado()) { pendientes++; continue; }
      if (abiertos.has(mes)) { meses.push({ mes, estado: "no_se_toca", motivo: "la extracción del histórico tiene este mes abierto" }); continue; }
      const r = await reempacarMes(redis, mes, claves, { ahora });
      meses.push(r);
      if (r.estado === "base_llena") paro = "la base se llenó: lo viejo de los meses ya compactados se borra en la próxima vuelta y deja sitio para el resto";
      tanda.avanzo();
    }
    const hechos = meses.filter((m) => m.estado === "compactado");
    const porBorrarDespues = meses.filter((m) => m.estado === "compactado" || m.estado === "esperando").length;
    return {
      ocupado: false, meses, pendientes, paro,
      compactados: hechos.length,
      viejos_borrados: meses.filter((m) => m.estado === "viejos_borrados").length,
      meses_con_viejo_por_borrar: porBorrarDespues,
      bytes_a_liberar: hechos.reduce((s, m) => s + (m.bytes_antes - m.bytes_despues), 0),
      filas_viejas_quitadas: hechos.reduce((s, m) => s + (m.filas_antes - m.filas), 0),
    };
  } finally {
    await soltar();
  }
}

module.exports = {
  liberarSiLlena, reempacarHistorico, reempacarMes, pruebaEscritura, rehacibles, versionesVigentes,
  CLAVE_SONDA, HOLGURA_BYTES, GRACIA_MS, clavePorBorrar,
};
