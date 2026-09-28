/* ============================================================================
   lib/huella_fila · La huella por proceso: el delta no reescribe lo que no cambió (28-sep-2026)
   ----------------------------------------------------------------------------
   Por qué existe: el 26-sep SECOP II re-selló las 9.231.205 filas con un
   `:updated_at` nuevo y el delta tuvo que releer —y REESCRIBIR— el año entero
   (sección «La lista 35 horas sin datos…» de la memoria). Releerlo no se puede
   evitar: la consulta pide lo actualizado desde el último corte, y SECOP dice
   que todo lo está. Reescribirlo sí: cada fila re-sellada se añadía otra vez a
   los trozos del mes y del histórico, y esas escrituras en Upstash son las que
   cortaban la cadena.

   Qué hace: guarda, por proceso (`_k`), la huella de lo ÚLTIMO que el delta
   escribió —el registro activo y, si el proceso ya cerró, el del histórico—,
   sin `:id` ni `:updated_at` (lo que el re-sellado cambia sin cambiar nada).
   Si lo que llega da la misma huella, la fila no se vuelve a escribir.

   Por qué no puede esconder un proceso (el falso caro aquí es el negativo):
   - el destino entra en la huella: un proceso que pasa de abierto a cerrado,
     aunque nada más cambie, se escribe (su registro del histórico es nuevo);
   - las huellas pertenecen a la carga completa que las vio nacer
     (`__generacion` = `meta.last_full`): una recarga completa reescribe los
     meses y, con otra generación, todas se descartan y todo se escribe;
   - «no sé» no es «igual»: una huella ausente, ilegible o de otra generación,
     un fallo al leerlas o un proceso que llega dos veces en la misma tanda se
     escriben como siempre;
   - lo que se va a escribir pasa a «no sé» ANTES, y la huella nueva se anota
     DESPUÉS, solo de lo que se escribió de verdad (lo diferido por el backfill o
     fuera de la ventana queda en «no sé»); una carga completa nueva las borra.
   Restaurar un mes desde la copia (lib/respaldo.restaurarMes) borra las huellas.
   ========================================================================== */
"use strict";

const crypto = require("crypto");

const CAMPO_GENERACION = "__generacion";
const POR_COMANDO = 1000;
const SIN_HUELLA = "-";   // nunca es igual a una huella: se escribe
const VOLATILES = new Set([":id", ":updated_at"]);

/* JSON con las claves ordenadas: la misma información da la misma huella
   aunque el orden de los campos cambie. */
function canonico(v) {
  if (Array.isArray(v)) return `[${v.map(canonico).join(",")}]`;
  if (v && typeof v === "object") {
    return `{${Object.keys(v).filter((k) => !VOLATILES.has(k) && v[k] !== undefined).sort()
      .map((k) => `${JSON.stringify(k)}:${canonico(v[k])}`).join(",")}}`;
  }
  return JSON.stringify(v === undefined ? null : v);
}

/* La huella de un proceso: su registro activo y el del histórico (o la marca
   de que sigue abierto). Pura. */
function huellaDeProceso(activo, historico) {
  const texto = `${canonico(activo)}|${historico ? canonico(historico) : "abierto"}`;
  return crypto.createHash("sha256").update(texto).digest("hex").slice(0, 24);
}

/* Una generación solo vale si es una fecha legible: sin ella, nada se salta. */
const generacionValida = (g) => typeof g === "string" && Number.isFinite(Date.parse(g));

/* Lee las huellas guardadas de estos procesos. Devuelve {vigente, mapa}: con
   otra generación (o ninguna), `vigente: false` y el mapa vacío. Un fallo se
   propaga: quien llama escribe todo. */
async function leerHuellas(redis, generacion, claves) {
  const mapa = new Map();
  if (!generacionValida(generacion)) return { vigente: false, mapa };
  const [gen] = await redis.hmget(require("./almacen.js").CLAVES.huellasDelta, [CAMPO_GENERACION]);
  if (gen !== generacion) return { vigente: false, mapa };
  const unicas = [...new Set(claves.filter(Boolean))];
  for (let i = 0; i < unicas.length; i += POR_COMANDO) {
    const lote = unicas.slice(i, i + POR_COMANDO);
    const vals = await redis.hmget(require("./almacen.js").CLAVES.huellasDelta, lote);
    if (!Array.isArray(vals) || vals.length !== lote.length) throw new Error("HMGET devolvió una forma inesperada");
    lote.forEach((k, j) => { if (typeof vals[j] === "string") mapa.set(k, vals[j]); });
  }
  return { vigente: true, mapa };
}

/* Separa lo que no cambió. `activo` y `historico` salen de repartirDelta.
   Devuelve las listas a escribir, cuántos procesos se saltaron y la huella de
   cada proceso a escribir, para anotarla después de escribirlo. */
function apartarSinCambio({ activo, historico, guardadas }) {
  const histPorK = new Map();
  const vecesHist = new Map();
  for (const h of historico) { histPorK.set(h._k, h); vecesHist.set(h._k, (vecesHist.get(h._k) || 0) + 1); }
  const veces = new Map();
  for (const r of activo) veces.set(r._k, (veces.get(r._k) || 0) + 1);
  const sinCambio = new Set();
  const huellas = new Map();
  for (const r of activo) {
    const k = r._k;
    if (!k) continue;
    const h = huellaDeProceso(r, histPorK.get(k) || null);
    const repetido = veces.get(k) > 1 || (vecesHist.get(k) || 0) > 1;
    if (!repetido && guardadas && guardadas.get(k) === h) { sinCambio.add(k); continue; }
    // un proceso repetido en la tanda se escribe entero y su huella queda en
    // «no sé» (SIN_HUELLA): dejar la anterior haría saltar la próxima versión igual a ella
    huellas.set(k, repetido ? SIN_HUELLA : h);
  }
  return {
    activo: activo.filter((r) => !sinCambio.has(r._k)),
    historico: historico.filter((r) => !sinCambio.has(r._k)),
    sinCambio: sinCambio.size,
    huellas,
  };
}

/* Anota las huellas de lo que SE ESCRIBIÓ. Si las guardadas eran de otra
   generación, se borran primero: una huella vieja no puede sobrevivir a una
   recarga completa. */
async function anotarHuellas(redis, generacion, vigente, pares) {
  if (!generacionValida(generacion)) return 0;
  const clave = require("./almacen.js").CLAVES.huellasDelta;
  if (!vigente) await redis.del(clave);
  const entradas = [...pares];
  await redis.hset(clave, { [CAMPO_GENERACION]: generacion });
  for (let i = 0; i < entradas.length; i += POR_COMANDO) {
    await redis.hset(clave, Object.fromEntries(entradas.slice(i, i + POR_COMANDO)));
  }
  return entradas.length;
}

/* Pone en «no sé» las huellas de lo que se va a escribir. */
async function invalidar(redis, claves) {
  const clave = require("./almacen.js").CLAVES.huellasDelta;
  for (let i = 0; i < claves.length; i += POR_COMANDO) {
    await redis.hset(clave, Object.fromEntries(claves.slice(i, i + POR_COMANDO).map((k) => [k, SIN_HUELLA])));
  }
}

module.exports = { invalidar, huellaDeProceso, leerHuellas, apartarSinCambio, anotarHuellas, generacionValida, CAMPO_GENERACION, SIN_HUELLA };
