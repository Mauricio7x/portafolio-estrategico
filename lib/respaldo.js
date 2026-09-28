/* ============================================================================
   lib/respaldo · La copia nocturna, fuera de Upstash (27-sep-2026)
   ----------------------------------------------------------------------------
   Qué se copia, y por qué eso y no otra cosa:
     · el HISTÓRICO, mes por mes, EXACTAMENTE como está en Redis: el manifiesto
       y cada bloque tal cual (base64 de deflate), sin descomprimir ni volver a
       empaquetar. Una restauración tiene que devolver lo mismo que hoy leen los
       quince módulos que barren `licitaciones:historico:mes:*:chunk:*`; si la
       copia «interpretara» los bloques (quitar duplicados, reordenar) la
       restauración cambiaría las cifras. Y parte de esto NO vuelve de SECOP:
       las señales de prórroga que el delta estampa desde el 16-ago-2026.
     · los DATOS DEL USUARIO, con la MISMA exportación del botón «Copia de sus
       datos» (lib/copia_datos.exportarCopia, un censo por prefijos): no se
       escribe otra lista de claves que pudiera divergir.
   Lo demás (corpus activo, índices, catálogo) se reconstruye desde SECOP o
   desde el repositorio y no viaja.

   Dónde: en el almacén de archivos de lib/objetos (Cloudflare R2 u otro
   compatible con S3). Objetos:
     historico/{YYYY-MM}.json.gz   un mes: {manifiesto, bloques:[[clave,valor]…]}
     usuario/{YYYY-MM-DD}.detekta  la copia del día, el mismo formato del botón
     indice.json                   qué hay en la copia: huella SHA-256, bytes,
                                   bloques y filas de cada mes; sirve a la prueba

   Incremental: la huella de un mes es el SHA-256 de su manifiesto más la lista
   de sus claves de bloque. Si no cambió desde la última copia, el mes no se
   vuelve a subir: la primera noche copia los 33 meses (o los que quepan en el
   presupuesto, y sigue la noche siguiente), y después solo los que tocó el
   delta. `forzar` los sube todos.

   Coherencia: con la extracción del histórico o la sincronización en curso
   (sus candados vivos) la copia se APLAZA y lo dice; y dentro de un mes, si el
   manifiesto cambió mientras se leían sus bloques, ese mes se deja para la
   próxima vuelta en vez de guardar una foto mezclada.

   La prueba (`verificarRespaldo`) vuelve a bajar cada objeto, comprueba su
   huella y descomprime cada bloque para contar filas: una copia que nunca se
   leyó no es una copia. La restauración (`restaurarMes`) existe como función y
   la suite la ejecuta de ida y vuelta; NO hay una operación HTTP que escriba la
   copia sobre producción: eso se hace a propósito, con una sesión delante.
   ========================================================================== */
"use strict";

const zlib = require("zlib");
const { CLAVES, descomprimir, leerJSON, escribirJSON } = require("./almacen.js");
const { sha256 } = require("./objetos.js");

const FORMATO = 1;
const LOCK_RESPALDO_TTL_SEG = 300;
const MAX_CLAVES_MGET = 14;          // 14 × ~667 KB en base64 < 10 MB por petición de Upstash
const HORAS_COPIA_VIEJA = 48;        // dos noches sin copia completa = algo va mal
const OBJETO_INDICE = "indice.json";
const objetoMes = (mes) => `historico/${mes}.json.gz`;

/* El día en Colombia (UTC−5, sin horario de verano): la copia de la noche del
   27 se llama 27 aunque en UTC ya sea 28. */
function diaColombia(d = new Date()) {
  return new Date(d.getTime() - 5 * 3600e3).toISOString().slice(0, 10);
}
const objetoUsuario = (d) => `usuario/${diaColombia(d)}.detekta`;

const indiceBloque = (clave) => Number(String(clave).split(":chunk:")[1]);
const ordenarBloques = (claves) => [...claves].sort((a, b) => indiceBloque(a) - indiceBloque(b));
const huellaMes = (manifiesto, claves) => sha256(`${manifiesto == null ? "" : manifiesto}\n${ordenarBloques(claves).join(",")}`);

/* Meses del histórico y sus claves de bloque, con UN barrido del keyspace. */
async function inventarioHistorico(redis) {
  const claves = await redis.scan(CLAVES.patronMesesHist);
  const meses = new Map();
  for (const k of claves) {
    const mes = CLAVES.mesDeClaveHist(k);
    if (!mes) continue;
    if (!meses.has(mes)) meses.set(mes, []);
    if (/:chunk:\d+$/.test(k)) meses.get(mes).push(k);
  }
  return new Map([...meses.entries()].sort(([a], [b]) => a.localeCompare(b)));
}

async function leerValores(redis, claves) {
  const valores = [];
  for (let i = 0; i < claves.length; i += MAX_CLAVES_MGET) {
    valores.push(...(await redis.mget(claves.slice(i, i + MAX_CLAVES_MGET))));
  }
  return valores;
}

/* Filas y bloques ilegibles de una lista de bloques. Un bloque que no
   descomprime se CUENTA aparte; nunca suma cero filas en silencio. */
function contarFilas(valores) {
  let filas = 0, ilegibles = 0;
  for (const v of valores) {
    const regs = descomprimir(v);
    if (Array.isArray(regs)) filas += regs.length; else ilegibles++;
  }
  return { filas, ilegibles };
}

function empaquetarMes(mes, manifiesto, claves, valores, ahora) {
  const cuerpo = {
    aplicacion: "Detekta", formato: FORMATO, tipo: "historico-mes", mes,
    copiado_el: ahora.toISOString(),
    manifiesto,
    bloques: claves.map((k, i) => [k, valores[i]]),
  };
  return zlib.gzipSync(Buffer.from(JSON.stringify(cuerpo), "utf8"), { level: 6 });
}

async function candadoAjeno(redis) {
  const [sync, hist] = await redis.mget([CLAVES.lock, CLAVES.lockHistorico]);
  if (hist) return "la extracción del histórico está en curso";
  if (sync) return "una sincronización está en curso";
  return null;
}

/* Una vuelta de copia dentro de `hasta` (instante en ms). Devuelve qué hizo.
   Lanza solo si el almacén o Redis fallan: quien llama lo convierte en 502. */
async function respaldar(redis, objetos, { hasta = Date.now() + 240e3, forzar = false, ahora = () => new Date() } = {}) {
  const ajeno = await candadoAjeno(redis);
  if (ajeno) return { aplazado: true, motivo: `${ajeno}: la copia se hace en la próxima vuelta para no guardar una foto a medias.` };
  const marca = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const tomado = await redis.set(CLAVES.lockRespaldo, marca, { nx: true, ex: LOCK_RESPALDO_TTL_SEG });
  if (!tomado) return { aplazado: true, motivo: "otra copia está en curso." };

  const inicio = ahora();
  const estado = (await leerJSON(redis, CLAVES.respaldoEstado)) || {};
  estado.meses = estado.meses || {};
  if (!estado.primer_intento) estado.primer_intento = inicio.toISOString();
  const vuelta = { inicio: inicio.toISOString(), fin: null, copiados: [], al_dia: 0, aplazados: [], pendientes: [], solo_en_copia: [], completa: false };
  try {
    /* 1 · los datos del usuario: pocos kilobytes y lo más difícil de rehacer */
    const { exportarCopia, empaquetar } = require("./copia_datos.js");
    const copia = await exportarCopia(redis);
    const archivo = empaquetar(copia);
    const claveUsuario = objetoUsuario(inicio);
    await objetos.poner(claveUsuario, archivo, "application/octet-stream");
    estado.usuario = { objeto: claveUsuario, sha256: sha256(archivo), bytes: archivo.length, elementos: copia.resumen.total, copiado_el: inicio.toISOString() };

    /* 2 · el histórico, mes por mes */
    const inventario = await inventarioHistorico(redis);
    for (const [mes, clavesMes] of inventario) {
      const claves = ordenarBloques(clavesMes);
      const manifiesto = await redis.get(CLAVES.histManifest(mes));
      const huella = huellaMes(manifiesto, claves);
      if (!forzar && estado.meses[mes] && estado.meses[mes].huella === huella) { vuelta.al_dia++; continue; }
      if (Date.now() >= hasta) { vuelta.pendientes.push(mes); continue; }

      const valores = await leerValores(redis, claves);
      const releido = await redis.get(CLAVES.histManifest(mes));
      /* el inventario salió de UN barrido al empezar: un delta pudo escribir un
         bloque Y el manifiesto antes de nuestro GET, y entonces manifiesto y
         relectura coinciden pero los bloques son los viejos. Se vuelve a barrir
         el mes DESPUÉS de leer: si el conjunto de claves cambió, se aplaza. */
      const ahoraClaves = ordenarBloques(await redis.scan(CLAVES.patronChunksHistMes(mes)));
      if (releido !== manifiesto || valores.some((v) => v == null) || ahoraClaves.join(",") !== claves.join(",")) {
        vuelta.aplazados.push(mes); // cambió mientras se leía: la próxima vuelta lo copia entero
        continue;
      }
      const { filas, ilegibles } = contarFilas(valores);
      const archivoMes = empaquetarMes(mes, manifiesto, claves, valores, inicio);
      await objetos.poner(objetoMes(mes), archivoMes, "application/gzip");
      estado.meses[mes] = {
        objeto: objetoMes(mes), huella, sha256: sha256(archivoMes), bytes: archivoMes.length,
        bloques: claves.length, filas, bloques_ilegibles: ilegibles, copiado_el: inicio.toISOString(),
      };
      vuelta.copiados.push(mes);
      await escribirJSON(redis, CLAVES.respaldoEstado, estado); // lo avanzado no se pierde si la función se corta
    }

    /* un mes que está en la copia y ya no en Redis se CONSERVA en la copia (es
       lo que se quiere salvar) y se DICE: es justo la pérdida para la que existe */
    vuelta.solo_en_copia = Object.keys(estado.meses).filter((m) => !inventario.has(m)).sort();
    vuelta.fin = ahora().toISOString();
    vuelta.completa = vuelta.pendientes.length === 0 && vuelta.aplazados.length === 0;
    if (vuelta.completa) estado.ultima_completa = vuelta.fin;
    estado.ultima_vuelta = vuelta;
    estado.ultimo_error = null;
    const indice = { aplicacion: "Detekta", formato: FORMATO, actualizado: vuelta.fin, completa_el: estado.ultima_completa || null, usuario: estado.usuario, meses: estado.meses };
    await objetos.poner(OBJETO_INDICE, JSON.stringify(indice, null, 1), "application/json");
    await escribirJSON(redis, CLAVES.respaldoEstado, estado);
    return { aplazado: false, ...vuelta, meses_en_copia: Object.keys(estado.meses).length };
  } catch (e) {
    estado.ultimo_error = { ts: ahora().toISOString(), mensaje: String(e && e.message).slice(0, 300) };
    estado.ultima_vuelta = { ...vuelta, fin: ahora().toISOString() };
    try { await escribirJSON(redis, CLAVES.respaldoEstado, estado); } catch { /* el error original es el que importa */ }
    throw e;
  } finally {
    // solo se suelta el candado PROPIO: si esta vuelta pasó de 300 s, ya es de otra
    try { if ((await redis.get(CLAVES.lockRespaldo)) === marca) await redis.del(CLAVES.lockRespaldo); } catch { /* caduca solo en 300 s */ }
  }
}

/* La prueba: baja cada objeto del índice, comprueba su huella y cuenta filas.
   `problemas` nombra el mes y qué le pasa; una lista vacía con `completa`
   es la única respuesta que dice «la copia sirve». */
async function verificarRespaldo(objetos, { hasta = Date.now() + 240e3 } = {}) {
  const crudo = await objetos.traer(OBJETO_INDICE);
  if (crudo == null) return { ok: false, completa: false, problemas: ["todavía no hay ninguna copia en el almacén"], meses_verificados: 0, filas: 0 };
  let indice;
  try { indice = JSON.parse(crudo.toString("utf8")); } catch { return { ok: false, completa: false, problemas: ["el índice de la copia no se puede leer"], meses_verificados: 0, filas: 0 }; }
  const problemas = [];
  let verificados = 0, filasTotal = 0;
  const meses = Object.keys(indice.meses || {}).sort();
  const sinVerificar = [];
  for (const mes of meses) {
    if (Date.now() >= hasta) { sinVerificar.push(mes); continue; }
    const esperado = indice.meses[mes];
    const archivo = await objetos.traer(esperado.objeto);
    if (archivo == null) { problemas.push(`${mes}: el archivo no está en el almacén`); continue; }
    if (sha256(archivo) !== esperado.sha256) { problemas.push(`${mes}: el archivo cambió desde que se copió (la huella no coincide)`); continue; }
    let cuerpo;
    try { cuerpo = JSON.parse(zlib.gunzipSync(archivo).toString("utf8")); } catch { problemas.push(`${mes}: el archivo no se puede abrir`); continue; }
    const valores = (cuerpo.bloques || []).map(([, v]) => v);
    const { filas, ilegibles } = contarFilas(valores);
    if (valores.length !== esperado.bloques) problemas.push(`${mes}: trae ${valores.length} bloques y se copiaron ${esperado.bloques}`);
    else if (filas !== esperado.filas || ilegibles !== esperado.bloques_ilegibles) problemas.push(`${mes}: trae ${filas} filas y se copiaron ${esperado.filas}`);
    else { verificados++; filasTotal += filas; }
  }
  if (indice.usuario) {
    const u = await objetos.traer(indice.usuario.objeto);
    if (u == null) problemas.push("la copia de sus datos no está en el almacén");
    else if (sha256(u) !== indice.usuario.sha256) problemas.push("la copia de sus datos cambió desde que se hizo (la huella no coincide)");
  } else problemas.push("la copia no trae sus datos");
  return {
    ok: problemas.length === 0 && sinVerificar.length === 0,
    completa: sinVerificar.length === 0,
    meses_verificados: verificados, meses_en_copia: meses.length, sin_verificar: sinVerificar,
    filas: filasTotal, problemas, copia_del: indice.actualizado || null,
  };
}

/* Devuelve un mes de la copia a Redis tal cual: los bloques primero y el
   manifiesto AL FINAL (el orden del flip de lib/handlers/procesos/historico).
   Pensado para una base VACÍA; no borra claves que la copia no traiga. */
async function restaurarMes(redis, archivo) {
  const cuerpo = JSON.parse(zlib.gunzipSync(archivo).toString("utf8"));
  if (cuerpo.tipo !== "historico-mes" || cuerpo.formato !== FORMATO) throw new Error("El archivo no es la copia de un mes del histórico.");
  for (const [k, v] of cuerpo.bloques) {
    if (CLAVES.mesDeClaveHist(k) !== cuerpo.mes) throw new Error(`La clave «${k}» no es del mes ${cuerpo.mes}: no se restaura nada de este archivo.`);
    await redis.set(k, v);
  }
  if (cuerpo.manifiesto != null) await redis.set(CLAVES.histManifest(cuerpo.mes), cuerpo.manifiesto);
  // lo restaurado puede ser más viejo que lo que el delta anotó como escrito: sin huellas, se reescribe
  await redis.del(CLAVES.huellasDelta);
  return { mes: cuerpo.mes, bloques: cuerpo.bloques.length };
}

/* Lo que publica op=salud: si está configurada, de cuándo es la última copia
   completa y si ya es vieja. `vieja` decide `ok` con milisegundos crudos. */
function saludDelRespaldo(estado, { configurado, falta, configuradoDesde = null, ahora = Date.now() }) {
  const completa = estado && estado.ultima_completa ? Date.parse(estado.ultima_completa) : NaN;
  const primer = estado && estado.primer_intento ? Date.parse(estado.primer_intento) : NaN;
  /* sin ninguna copia completa, se cuenta desde el primer intento o, si la copia NUNCA
     corrió, desde que el latido vio el almacén configurado: una copia que jamás llega a
     correr (un cron que no dispara, un 401) es no tener copia, y antes era mudo */
  const desde = Number.isFinite(primer) ? primer : Date.parse(configuradoDesde);
  const limite = HORAS_COPIA_VIEJA * 3600e3;
  const vieja = configurado && (Number.isFinite(completa) ? ahora - completa > limite : Number.isFinite(desde) && ahora - desde > limite);
  return {
    configurado, falta,
    ultima_completa: Number.isFinite(completa) ? estado.ultima_completa : null,
    hace_horas: Number.isFinite(completa) ? Math.round((ahora - completa) / 36e3) / 100 : null,
    // sin estado no se sabe cuántos meses hay: null, jamás 0
    meses_en_copia: estado && estado.meses ? Object.keys(estado.meses).length : null,
    meses_solo_en_copia: estado && estado.ultima_vuelta && Array.isArray(estado.ultima_vuelta.solo_en_copia) ? estado.ultima_vuelta.solo_en_copia : null,
    /* op=salud es PÚBLICA: del último fallo solo la fecha. El cuerpo del almacén
       puede traer la llave de acceso; se lee con credencial en op=respaldo&estado=1 */
    ultimo_error: estado && estado.ultimo_error ? { ts: estado.ultimo_error.ts } : null,
    nunca_corrio: configurado && !Number.isFinite(primer),
    vieja,
  };
}

module.exports = {
  FORMATO, LOCK_RESPALDO_TTL_SEG, HORAS_COPIA_VIEJA, OBJETO_INDICE, objetoMes, objetoUsuario, diaColombia,
  huellaMes, inventarioHistorico, respaldar, verificarRespaldo, restaurarMes, saludDelRespaldo,
};
