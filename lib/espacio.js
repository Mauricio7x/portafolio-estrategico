/* ============================================================================
   lib/espacio · Qué ocupa la base de datos, medido desde la aplicación (30-sep-2026)
   ----------------------------------------------------------------------------
   Por qué existe: del 28 al 30-sep-2026 la base de Upstash pasó del tope del plan
   gratuito (256 MB; Upstash midió 276.006.634 bytes) y rechazó toda escritura: la
   actualización no guardaba nada y la lista se quedó en el 27-sep. Qué ocupaba el
   espacio solo lo enseñaba la consola de Upstash, que el dueño no abre, y borrar
   sin saber qué ocupa es adivinar en producción.

   `medirEspacio` lo mide sin escribir nada:
     · CENSA todas las claves (SCAN «*»), no una lista de sitios: una familia
       nueva que crezca aparece sola, sin que nadie se acuerde de añadirla;
     · agrupa por FAMILIA —la clave con sus partes variables (fechas, números,
       identificadores, nombres) cambiadas por «*»—;
     · mide cada familia por MUESTRA acotada (STRLEN de un texto; HLEN y una
       página de HSCAN de un hash) y extrapola por el número de claves. Lo que se
       extrapola lleva `estimado: true`; un tipo que no se sabe medir va `null`
       («no sé»), jamás 0.
   Las cifras son de los DATOS (valor + nombre de la clave), no de la memoria que
   Upstash reserva por dentro: sirven para ordenar qué pesa, y el total medido se
   compara con el de Upstash, no lo sustituye.

   Coste acotado y declarado: 1 DBSIZE + las vueltas del SCAN + por familia 1 TYPE
   y hasta MUESTRA_POR_FAMILIA mediciones (2 por clave en los hashes).
   ========================================================================== */
"use strict";

const { relojDeTanda } = require("./presupuesto.js");

const MUESTRA_POR_FAMILIA = 150;
const CONCURRENCIA = 16;
const PAGINA_HSCAN = 100;
const PRESUPUESTO_DEFECTO_MS = 200000;   // < maxDuration de api/admin.js (300 s), con margen

/* La familia de una clave: cada parte que no es una palabra fija en minúsculas
   (fechas, números, NIT, REQ, nombres de entidad, identificadores) se vuelve «*»,
   y las «*» seguidas se funden. Así `licitaciones:historico:mes:2025-03:chunk:12`
   y `…:2024-11:chunk:3` son la misma familia, y un perfil fijo (`helder`) no. */
function familiaDe(clave) {
  const partes = String(clave).split(":").slice(0, 6).map((p) => (/^[a-z_]{1,24}$/.test(p) ? p : "*"));
  const fundidas = [];
  for (const p of partes) if (!(p === "*" && fundidas[fundidas.length - 1] === "*")) fundidas.push(p);
  if (String(clave).split(":").length > 6 && fundidas[fundidas.length - 1] !== "*") fundidas.push("*");
  return fundidas.join(":");
}

/* Qué es cada familia y qué pasa si se borra. Es la tabla que lee el dueño: una
   familia que no está aquí sale «sin clasificar» con su tamaño, nunca se esconde.
   `rehacible` dice si la aplicación la vuelve a construir sola (y cuánto cuesta);
   el orden importa: gana el PRIMER patrón que casa. */
const CATALOGO = [
  [/^licitaciones:activo:mes:\*:chunk/, "Procesos que se muestran (el año en curso)", "Se vuelve a bajar de SECOP II con una carga completa (horas); perdería las señales de prórroga anotadas."],
  [/^licitaciones:historico:mes:\*:chunk/, "Histórico de procesos (de 2024 a hoy)", "No: una parte (las señales de prórroga desde el 16-ago-2026) no se puede volver a bajar."],
  [/^licitaciones:(activo|historico):mes:\*:manifest/, "Índices de los bloques del corpus", "No se borra: sin él los bloques no se leen."],
  [/^licitaciones:mes:/, "Corpus viejo, anterior a la separación activo/histórico", "Sí: la carga completa ya lo borra; es basura."],
  [/^licitaciones:/, "Estado de la sincronización", "No se borra."],
  [/^indice:(detalle|desglose_p):/, "Caché de detalles de competencia y probabilidad (1 h / 5 min)", "Sí: caduca sola y se rehace al pedirla."],
  [/^indice:baja:cache/, "Caché de la respuesta de la baja (1 h)", "Sí: caduca sola."],
  [/:nuevo$/, "Copia a medio construir de un índice", "Sí, si no hay una construcción en curso: se descarta al publicar el índice."],
  [/:progreso$/, "Avance guardado de una construcción o carga", "Solo si esa construcción ya no corre: sin él la próxima empieza de cero."],
  [/^(indice|equivalencias|vocabulario):/, "Índices aprendidos del histórico (competencia, baja, quién gana)", "Sí, reconstruyéndolos desde el histórico sin bajar nada (unos minutos)."],
  [/^sync:delta:huellas/, "Huellas de lo último escrito por la actualización", "Sí: sin ellas la próxima actualización reescribe todo una vez."],
  [/^(resumen|pulso|cobertura|portada):/, "Resúmenes precalculados y copias temporales del tablero", "Sí: se rehacen solos (la portada, en la próxima actualización)."],
  [/^apu:(catalogo|insumos|items|factores_region):/, "Catálogo de precios de referencia", "Se vuelve a cargar desde el repositorio."],
  [/^apu:/, "Presupuestos, precios corregidos y solicitudes del usuario", "No: es trabajo del usuario."],
  [/^(config|cuenta|sesion|seguimiento|expediente):/, "Configuración, cuentas y procesos guardados del usuario", "No: es del usuario."],
  [/^pliego:/, "Documentos, dictámenes y lectura de pliegos", "Parcial: el texto se vuelve a leer de SECOP II; los dictámenes no."],
  [/^espacio:/, "Compactación de la base: la sonda y la lista de bloques viejos por borrar", "No hace falta: son diminutos (la lista se borra sola al borrar lo viejo)."],
  [/^(lock|cuota|uso|latido|respaldo|aviso|salud):/, "Candados, contadores y relojes", "No hace falta: son diminutos."],
];

function describirFamilia(familia) {
  for (const [re, que, siSeBorra] of CATALOGO) if (re.test(familia)) return { que_es: que, si_se_borra: siSeBorra };
  return { que_es: "sin clasificar", si_se_borra: "No se sabe: revísela antes de tocarla." };
}

/* Muestra repartida por toda la familia (no las primeras N, que del SCAN suelen
   ser de un mismo mes): una de cada paso, en el orden en que llegaron. */
function muestraRepartida(claves, n = MUESTRA_POR_FAMILIA) {
  if (claves.length <= n) return claves.slice();
  const paso = claves.length / n;
  const salida = [];
  for (let i = 0; i < n; i++) salida.push(claves[Math.floor(i * paso)]);
  return salida;
}

/* Ejecuta `fn` sobre cada elemento con a lo sumo `n` a la vez; devuelve los
   resultados en el orden de entrada. */
async function enParalelo(elementos, n, fn) {
  const salida = new Array(elementos.length);
  let i = 0;
  const obrero = async () => { while (i < elementos.length) { const j = i++; salida[j] = await fn(elementos[j], j); } };
  await Promise.all(Array.from({ length: Math.min(n, elementos.length) }, obrero));
  return salida;
}

const numeroDe = (v) => { const n = Number(v); return Number.isFinite(n) ? n : null; };

/* Bytes de UNA clave según su tipo, o null si no se sabe medir. Un hash se mide
   por una página de HSCAN extrapolada por HLEN: `exacto` dice si la página lo
   trajo entero. */
async function medirClave(redis, clave, tipo, { conFormato = false } = {}) {
  const nombre = Buffer.byteLength(String(clave));
  if (tipo === "string") {
    const n = numeroDe(await redis._cmd(["STRLEN", clave]));
    if (n == null) return { bytes: null, exacto: false };
    /* en los bloques del corpus, en qué formato están (lib/almacen: «br1:» o zlib): dice
       cuánto queda por compactar sin leer el bloque entero (4 bytes por clave) */
    let formato = null;
    // una clave que desapareció entre el SCAN y la medida (STRLEN 0) no tiene formato: null, no «zlib»
    if (conFormato && n > 0) { try { formato = String(await redis._cmd(["GETRANGE", clave, "0", "3"])) === "br1:" ? "br1" : "zlib"; } catch { formato = null; } }
    return { bytes: n + nombre, exacto: true, formato };
  }
  if (tipo === "hash") {
    const campos = numeroDe(await redis.hlen(clave));
    if (campos == null) return { bytes: null, exacto: false };
    if (campos === 0) return { bytes: nombre, exacto: true };
    const r = await redis._cmd(["HSCAN", clave, "0", "COUNT", String(PAGINA_HSCAN)]);
    const plano = Array.isArray(r) && Array.isArray(r[1]) ? r[1] : [];
    const vistos = Math.floor(plano.length / 2);
    if (!vistos) return { bytes: null, exacto: false };
    let suma = 0;
    for (const x of plano) suma += Buffer.byteLength(String(x));
    const exacto = String(r[0]) === "0" && vistos >= campos;
    return { bytes: Math.round(nombre + (suma / vistos) * campos), exacto };
  }
  return { bytes: null, exacto: false };   // listas, conjuntos: no los usa la aplicación; «no sé»
}

async function medirEspacio(redis, { presupuestoMs = PRESUPUESTO_DEFECTO_MS, muestra = MUESTRA_POR_FAMILIA, formatos = true } = {}) {
  const t0 = Date.now();
  const comandosAntes = typeof redis.comandos === "function" ? redis.comandos() : 0;
  let clavesTotales = null;
  try { clavesTotales = numeroDe(await redis._cmd(["DBSIZE"])); } catch { clavesTotales = null; }
  const claves = await redis.scan("*");
  const porFamilia = new Map();
  for (const k of claves) {
    const f = familiaDe(k);
    if (!porFamilia.has(f)) porFamilia.set(f, []);
    porFamilia.get(f).push(k);
  }
  // las familias grandes primero: si el presupuesto se acaba, lo que falta es lo pequeño
  const familias = [...porFamilia.entries()].sort((a, b) => b[1].length - a[1].length);
  const tanda = relojDeTanda(t0, presupuestoMs);
  const salida = [];
  let completo = true;
  for (const [familia, ks] of familias) {
    if (tanda.agotado()) { completo = false; salida.push({ familia, claves: ks.length, bytes: null, medido: false, ...describirFamilia(familia) }); continue; }
    const elegidas = muestraRepartida(ks, muestra);
    let tipo = null;
    try { tipo = String(await redis._cmd(["TYPE", elegidas[0]])); } catch { tipo = null; }
    const esBloque = formatos && /:chunk/.test(familia);   // `formatos: false` ahorra un comando por clave a quien no los muestra
    const medidas = await enParalelo(elegidas, CONCURRENCIA, async (k) => {
      try { return await medirClave(redis, k, tipo, { conFormato: esBloque }); } catch { return { bytes: null, exacto: false }; }
    });
    const legibles = medidas.filter((m) => m && m.bytes != null);
    const suma = legibles.reduce((s, m) => s + m.bytes, 0);
    const bytes = legibles.length ? Math.round((suma / legibles.length) * ks.length) : null;
    let ttl = null;
    try { ttl = numeroDe(await redis.ttl(elegidas[0])); } catch { ttl = null; }
    salida.push({
      familia, claves: ks.length, tipo, bytes,
      estimado: legibles.length < ks.length || legibles.some((m) => !m.exacto),
      medidas: legibles.length, caduca_en_segundos: ttl != null && ttl >= 0 ? ttl : null,
      // de la muestra: cuántos bloques ya están en el formato compacto (null: no es de bloques)
      ...(esBloque ? { formato_muestra: { br1: legibles.filter((m) => m.formato === "br1").length, zlib: legibles.filter((m) => m.formato === "zlib").length } } : {}),
      ejemplo: elegidas[0], ...describirFamilia(familia),
    });
    tanda.avanzo();
  }
  salida.sort((a, b) => (b.bytes || 0) - (a.bytes || 0));
  const conCifra = salida.filter((f) => f.bytes != null);
  return {
    medido: new Date().toISOString(),
    completo,
    claves_totales: clavesTotales,
    claves_vistas: claves.length,
    familias_sin_cifra: salida.length - conCifra.length,
    bytes_total: conCifra.reduce((s, f) => s + f.bytes, 0),
    familias: salida,
    duracion_ms: Date.now() - t0,
    comandos: typeof redis.comandos === "function" ? redis.comandos() - comandosAntes : null,
  };
}

module.exports = { medirEspacio, familiaDe, describirFamilia, muestraRepartida, MUESTRA_POR_FAMILIA, CATALOGO };
