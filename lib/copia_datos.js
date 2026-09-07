/* ============================================================================
   lib/copia_datos · Copia de los datos que introduce el usuario (6-sep-2026, M-INF-15)
   ----------------------------------------------------------------------------
   Todo lo que el contratista carga a mano vive fuera de `licitaciones:*` (ver el
   esquema de lib/almacen): su registro de proponente y los perfiles, los contratos
   ejecutados, los consorcios, los precios que corrigió, los borradores del editor,
   los procesos guardados y los parámetros de costo. El corpus se reconstruye desde
   SECOP; esto NO, y antes de hoy no había ninguna vía para sacarlo ni volverlo a
   meter. Aquí viven las dos:

     exportarCopia(redis)                 → la copia (un objeto JSON)
     empaquetar(copia) / desempaquetar    → deflate de zlib (sin dependencias)
     validarCopia(copia)                  → forma, antes de escribir nada
     restaurarCopia(redis, copia, {sobrescribir}) → qué se escribió, qué se saltó

   LO QUE VIAJA ES UN CENSO, NO UNA LISTA. `PATRONES` barre los prefijos enteros
   de usuario y `APARTADOS` les pone nombre de pantalla; una clave nueva bajo un
   prefijo de usuario viaja aunque nadie la haya listado (cae en «Otros datos de
   configuración»). Lo que se EXCLUYE se declara con motivo (`CACHES`): son
   valores que la aplicación rehace sola y restaurarlos sería restaurar basura
   con fecha vieja. Ninguna clave de `licitaciones:*`, de los índices, de los
   candados ni del catálogo de precios puede entrar ni salir por aquí: la
   validación rechaza el archivo ENTERO si trae una (un archivo así no salió de
   esta función; escribir «solo lo válido» sería adivinar).

   Tres reglas que la restauración conserva de los módulos dueños de cada clave:
     · los SELLOS (`config:perfiles:version`, `config:experiencia:version`) se
       escriben AL FINAL: son lo que hace recargar a las instancias calientes,
       y mientras no cambien nadie ve un estado a medias (lib/almacen);
     · `config:consorcios` y `seguimiento:{perfil}` se escriben bajo el mismo
       candado corto que usan sus handlers (`conCandado`): una restauración no
       puede pisar un guardado que está ocurriendo a la vez;
     · el TTL que tenía la clave al exportar se vuelve a poner tal cual (el
       borrador que caducaba en 20 días vuelve con 20 días; el perfil `rup_…`
       con lo que le quedaba). Se descartó descontar el tiempo transcurrido:
       una copia restaurada un mes después habría vuelto VACÍA de borradores y
       de perfiles, que es lo contrario de lo que se pide a una copia.

   «Sobrescribir» es explícito y por clave: sin él, lo que ya existe se salta y
   se dice; con él, se reemplaza (un hash se borra antes de volver a escribirse,
   para que no queden campos que la copia no traía).
   ========================================================================== */
"use strict";

const zlib = require("zlib");
const { conCandado, CANDADO_CORTO_TTL_SEG, esCandadoOcupado } = require("./almacen.js");

const APLICACION = "Detekta";
const FORMATO = 1;
const EXTENSION = ".detekta";

/* Los prefijos de usuario que se barren con SCAN. Juntos son el censo. */
const PATRONES = [
  "config:*",
  "apu:parametros", "apu:parametros:*",
  "apu:precios:*",
  "apu:presupuesto:*",
  "seguimiento:*",
];

/* Nombre de pantalla de cada grupo de claves. El primero que casa manda; el
   último es la cola de `config:*` para lo que ningún otro reconozca. */
const APARTADOS = [
  { id: "registro", nombre: "Registro de proponente y perfiles", casa: /^config:(?:perfiles(?::|$)|unspsc:)/ },
  { id: "experiencia", nombre: "Contratos ejecutados", casa: /^config:experiencia(?::|$)/ },
  { id: "consorcios", nombre: "Consorcios guardados", casa: /^config:consorcios$/ },
  { id: "parametros", nombre: "Parámetros de costo", casa: /^apu:parametros(?::|$)/ },
  { id: "precios", nombre: "Precios corregidos", casa: /^apu:precios:/, tipo: "hash" },
  { id: "borradores", nombre: "Borradores de precios", casa: /^apu:presupuesto:/ },
  { id: "procesos", nombre: "Mis procesos", casa: /^seguimiento:/ },
  { id: "configuracion", nombre: "Otros datos de configuración", casa: /^config:/ },
];

/* Lo que vive bajo esos prefijos y NO es dato del usuario: se rehace solo. */
const CACHES = [
  { casa: /^seguimiento:detalle:/, motivo: "caché de la ficha del competidor (1 h)" },
];

/* Se escriben al final, en este orden. */
const SELLOS = ["config:perfiles:version", "config:experiencia:version"];

const esCache = (clave) => CACHES.some((c) => c.casa.test(clave));
function apartadoDe(clave) {
  if (typeof clave !== "string" || esCache(clave)) return null;
  return APARTADOS.find((a) => a.casa.test(clave)) || null;
}
const tipoDe = (clave) => { const a = apartadoDe(clave); return a && a.tipo === "hash" ? "hash" : "texto"; };
const esSello = (clave) => SELLOS.includes(clave);

/* El candado corto del handler dueño de la clave, o null. Requires diferidos:
   lib/consorcio carga perfiles y capacidad, y el handler de seguimiento medio
   proyecto; ninguno hace falta para exportar. */
function candadoDe(clave) {
  if (clave === "config:consorcios") return require("./consorcio.js").CLAVE_CANDADO_CONSORCIOS;
  const m = /^seguimiento:([^:]+)$/.exec(clave);
  if (m) return require("./handlers/perfil/seguimiento.js").claveCandado(m[1]);
  return null;
}

const nombreArchivo = (fechaIso) => `copia_detekta_${String(fechaIso || new Date().toISOString()).slice(0, 10)}${EXTENSION}`;

/* ══════════════════ exportar ══════════════════ */
const LOTE = 8; // MGET de 8, como lib/almacen

async function exportarCopia(redis) {
  const vistas = new Set();
  for (const patron of PATRONES) for (const k of await redis.scan(patron)) vistas.add(k);
  const claves = [...vistas].filter((k) => !esCache(k)).sort();
  const excluidas = [...vistas].filter((k) => esCache(k)).length;

  const textos = claves.filter((k) => tipoDe(k) === "texto");
  const hashes = claves.filter((k) => tipoDe(k) === "hash");
  const valores = new Map();
  for (let i = 0; i < textos.length; i += LOTE) {
    const lote = textos.slice(i, i + LOTE);
    const vs = await redis.mget(lote);
    lote.forEach((k, j) => valores.set(k, Array.isArray(vs) && vs[j] != null ? String(vs[j]) : null));
  }
  for (const k of hashes) {
    const h = await redis.hgetall(k);
    valores.set(k, h && Object.keys(h).length ? h : null);
  }
  const ttls = new Map();
  for (let i = 0; i < claves.length; i += LOTE) {
    const lote = claves.slice(i, i + LOTE);
    const ts = await Promise.all(lote.map((k) => redis.ttl(k)));
    lote.forEach((k, j) => ttls.set(k, Number(ts[j])));
  }

  const entradas = [], no_exportadas = [];
  for (const k of claves) {
    const valor = valores.get(k);
    const ttl = ttls.get(k);
    // una clave que desapareció entre el barrido y la lectura no es un dato vacío
    if (valor == null || ttl === -2) { no_exportadas.push({ clave: k, motivo: "desapareció entre el barrido y la lectura" }); continue; }
    entradas.push({ clave: k, apartado: apartadoDe(k).id, tipo: tipoDe(k), valor, ttl_seg: ttl > 0 ? ttl : null });
  }
  return {
    aplicacion: APLICACION,
    formato: FORMATO,
    exportado_el: new Date().toISOString(),
    claves: entradas,
    resumen: {
      total: entradas.length,
      por_apartado: APARTADOS.map((a) => ({ id: a.id, nombre: a.nombre, claves: entradas.filter((e) => e.apartado === a.id).length })).filter((a) => a.claves > 0),
      excluidas,
      no_exportadas,
    },
  };
}

/* ══════════════════ el archivo ══════════════════ */
const empaquetar = (copia) => zlib.deflateSync(Buffer.from(JSON.stringify(copia), "utf8"), { level: 6 });

/* Nunca lanza: devuelve {ok, copia} o {ok:false, error} con la frase de pantalla. */
function desempaquetar(buffer) {
  let texto;
  try { texto = zlib.inflateSync(buffer).toString("utf8"); } catch {
    return { ok: false, error: "El archivo no es una copia de Detekta: no se pudo descomprimir." };
  }
  try { return { ok: true, copia: JSON.parse(texto) }; } catch {
    return { ok: false, error: "El archivo no es una copia de Detekta: el contenido no se pudo leer." };
  }
}

/* ══════════════════ validar ══════════════════ */
const esObjeto = (v) => v !== null && typeof v === "object" && !Array.isArray(v);
const TOPE_ERRORES = 20;

function validarCopia(copia) {
  const errores = [];
  if (!esObjeto(copia)) return { ok: false, errores: ["el contenido no es un objeto"] };
  if (copia.aplicacion !== APLICACION) errores.push(`«aplicacion» tiene que ser «${APLICACION}» (llegó ${JSON.stringify(copia.aplicacion ?? null)})`);
  if (copia.formato !== FORMATO) errores.push(`«formato» tiene que ser ${FORMATO} (llegó ${JSON.stringify(copia.formato ?? null)})`);
  if (!Array.isArray(copia.claves)) errores.push("«claves» tiene que ser una lista");
  if (errores.length) return { ok: false, errores };

  const vistas = new Set();
  copia.claves.forEach((e, i) => {
    if (errores.length >= TOPE_ERRORES) return;
    const donde = `claves[${i}]`;
    if (!esObjeto(e)) return errores.push(`${donde}: no es un objeto`);
    const k = e.clave;
    if (typeof k !== "string" || !k || k.length > 512) return errores.push(`${donde}: «clave» tiene que ser un texto de 1 a 512 caracteres`);
    if (vistas.has(k)) return errores.push(`${donde}: la clave «${k}» viene repetida`);
    vistas.add(k);
    const a = apartadoDe(k);
    if (!a) return errores.push(`${donde}: «${k}» no es un dato de usuario (no sale de esta aplicación por esta vía)`);
    const tipo = tipoDe(k);
    if (e.tipo !== tipo) return errores.push(`${donde}: «${k}» tiene que ser de tipo «${tipo}» (llegó ${JSON.stringify(e.tipo ?? null)})`);
    if (tipo === "texto") {
      if (typeof e.valor !== "string") errores.push(`${donde}: «${k}» tiene que traer «valor» como texto`);
    } else if (!esObjeto(e.valor) || !Object.keys(e.valor).length || Object.values(e.valor).some((v) => typeof v !== "string")) {
      errores.push(`${donde}: «${k}» tiene que traer «valor» como un objeto de textos, no vacío`);
    }
    if (!(e.ttl_seg === null || e.ttl_seg === undefined || (Number.isInteger(e.ttl_seg) && e.ttl_seg > 0))) {
      errores.push(`${donde}: «${k}» trae un «ttl_seg» que no es un entero positivo ni nulo`);
    }
  });
  return { ok: errores.length === 0, errores };
}

/* ══════════════════ restaurar ══════════════════ */
function ordenDeEscritura(entradas) {
  const normales = entradas.filter((e) => !esSello(e.clave));
  const sellos = SELLOS.map((s) => entradas.find((e) => e.clave === s)).filter(Boolean);
  return normales.concat(sellos);
}

async function escribirEntrada(redis, e, existia) {
  if (e.tipo === "hash") {
    if (existia) await redis.del(e.clave);
    await redis.hset(e.clave, e.valor);
    if (e.ttl_seg) await redis.expire(e.clave, e.ttl_seg);
    return;
  }
  await redis.set(e.clave, e.valor, e.ttl_seg ? { ex: e.ttl_seg } : {});
}

function resumenPorApartado(r) {
  const cuenta = (lista, id) => lista.filter((x) => x.apartado === id).length;
  return APARTADOS
    .map((a) => ({ id: a.id, nombre: a.nombre, escritas: cuenta(r.escritas, a.id), saltadas: cuenta(r.saltadas, a.id), no_cargadas: cuenta(r.no_cargadas, a.id) }))
    .filter((a) => a.escritas + a.saltadas + a.no_cargadas > 0);
}

/* Valida ANTES (nada se escribe con un archivo mal formado). Un fallo de Redis
   a mitad lanza con `parcial` = lo hecho hasta ahí, para responderlo. */
async function restaurarCopia(redis, copia, { sobrescribir = false } = {}) {
  const v = validarCopia(copia);
  if (!v.ok) { const e = new Error("la copia no pasó la validación"); e.errores = v.errores; e.status = 400; throw e; }
  const r = { sobrescribir: sobrescribir === true, escritas: [], saltadas: [], no_cargadas: [] };
  const entradas = ordenDeEscritura(copia.claves).map((e) => ({ ...e, apartado: apartadoDe(e.clave).id }));
  try {
    for (const e of entradas) {
      const existia = Number(await redis.exists(e.clave)) > 0;
      if (existia && !r.sobrescribir) { r.saltadas.push({ clave: e.clave, apartado: e.apartado }); continue; }
      const candado = candadoDe(e.clave);
      try {
        if (candado) await conCandado(redis, candado, CANDADO_CORTO_TTL_SEG, () => escribirEntrada(redis, e, existia), { accion: "restaurar" });
        else await escribirEntrada(redis, e, existia);
        r.escritas.push({ clave: e.clave, apartado: e.apartado });
      } catch (err) {
        if (!esCandadoOcupado(err)) throw err;
        r.no_cargadas.push({ clave: e.clave, apartado: e.apartado, motivo: err.message, que_hacer: err.que_hacer });
      }
    }
  } catch (err) {
    err.parcial = { ...r, apartados: resumenPorApartado(r) };
    throw err;
  }
  r.apartados = resumenPorApartado(r);
  return r;
}

/* La frase de pantalla y el «qué hacer» salen de aquí: quien pega la URL en
   Chrome y quien pulsa el botón leen la misma redacción. Nombres de apartado,
   nunca claves. */
function fraseDeRestauracion(r) {
  const nombres = (campo) => r.apartados.filter((a) => a[campo] > 0).map((a) => a.nombre);
  const n = r.escritas.length, s = r.saltadas.length, x = r.no_cargadas.length;
  if (n === 0 && s === 0 && x === 0) {
    return { mensaje: "La copia no trae datos: no se cargó nada.", que_hacer: "Descargue la copia desde una aplicación que ya tenga datos cargados." };
  }
  const partes = [];
  if (n > 0) partes.push(`Se restauraron: ${nombres("escritas").join(", ")}.`);
  if (s > 0) partes.push(n > 0 ? `Ya existían y no se tocaron: ${nombres("saltadas").join(", ")}.` : "No se cargó nada: todo lo que trae la copia ya existe en la aplicación.");
  if (x > 0) partes.push(`No se pudieron cargar: ${nombres("no_cargadas").join(", ")}.`);
  let que_hacer = null;
  if (s > 0 && !r.sobrescribir) que_hacer = "Para reemplazar lo que ya existe por lo de la copia, marque «Reemplazar lo que ya existe» y vuelva a restaurar.";
  if (x > 0) que_hacer = [que_hacer, r.no_cargadas[0].que_hacer].filter(Boolean).join(" ");
  return { mensaje: partes.join(" "), que_hacer };
}

module.exports = {
  APLICACION, FORMATO, EXTENSION, PATRONES, APARTADOS, CACHES, SELLOS,
  apartadoDe, tipoDe, esSello, esCache, candadoDe, nombreArchivo,
  exportarCopia, empaquetar, desempaquetar, validarCopia, restaurarCopia, fraseDeRestauracion,
};
