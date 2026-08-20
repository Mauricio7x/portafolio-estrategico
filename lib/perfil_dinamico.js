/* ============================================================================
   lib/perfil_dinamico · Perfiles creados por onboarding (RUP subido en PDF)
   ----------------------------------------------------------------------------
   Los tres perfiles del negocio (helder/genesis/juntos) viven en lib/perfiles y
   son la configuración del DUEÑO. Los perfiles dinámicos son otra cosa: los
   crea cualquier contratista subiendo su RUP desde la landing, viven en Redis
   bajo `config:perfiles:rup_*` CON TTL (no son configuración permanente, son un
   onboarding renovable re-subiendo el PDF) y JAMÁS tocan ni los tres perfiles
   fijos ni su sello `config:perfiles:version`.

   CÓMO SE SIRVEN. Todo el juicio del repositorio (evaluarRup, evaluarPuertas,
   filtrarProcesosVisibles) resuelve el perfil con `PERFILES[perfilId]` sobre el
   objeto VIVO de lib/perfiles — media app lo capturó al requerir. Por eso aquí
   el perfil dinámico se INYECTA como una propiedad más de ese objeto antes de
   evaluar, en vez de enseñarle un segundo diccionario a cada consumidor: cero
   cambios de firma aguas abajo. La inyección se acota (tope de instancias
   calientes) y se puede deshacer (`olvidarPerfilesDinamicos`, que usan las
   pruebas para no contaminar bloques siguientes).

   CADA PETICIÓN RELEE LA CLAVE (un GET de un valor pequeño): es el mismo
   criterio que el sello de perfiles — sin TTL de memoria, el efecto de
   re-subir un RUP es inmediato y un perfil caducado deja de servirse en la
   siguiente petición, no «dentro de N minutos».
   ========================================================================== */
"use strict";

const { PERFILES, perfilDesdeConfig } = require("./perfiles.js");
const { CLAVES, leerJSONComprimido, escribirJSONComprimido, PERFIL_DINAMICO_TTL_SEG } = require("./almacen.js");

/* minúsculas y dígitos a propósito: el id viaja en URLs y en localStorage, y
   un id con mayúsculas se volvería dos ids según quién lo normalice */
const ID_DINAMICO_RE = /^rup_[a-z0-9]{6,24}$/;
/* Tope por instancia caliente: esto no es una caché infinita. Va holgado a
   propósito: la evicción borra `PERFILES[viejo]` y el juicio resuelve
   `PERFILES[perfilId]` POR FILA, así que evictar un perfil que otra petición
   concurrente de la misma instancia está usando lo dejaría a mitad de cascada
   juzgando «perfil desconocido» en silencio. Con 200 perfiles distintos
   simultáneos en UNA instancia (un perfil ≈ pocos KB) la carrera es teórica;
   el techo real de perfiles vivos lo pone MAX_PERFILES_DINAMICOS en la carga. */
const MAX_INYECTADOS = 200;

const _inyectados = new Set();

function esPerfilDinamico(id) {
  return ID_DINAMICO_RE.test(String(id || ""));
}

function generarIdDinamico() {
  const crypto = require("crypto");
  return `rup_${crypto.randomBytes(6).toString("hex")}`;
}

/* Carga el perfil dinámico desde Redis y lo inyecta en PERFILES.
   → el perfil, o null si no existe / caducó / el id no tiene el formato.
   Si Redis falla y la instancia caliente ya lo tenía, se sirve lo vigente
   (misma regla que recargarPerfiles: quedarse mudo es peor). Si la instancia
   está FRÍA, el error se PROPAGA: devolver null aquí haría que el endpoint
   respondiera «perfil caducado» por un Redis caído — y la web, obediente,
   BORRARÍA el perfil guardado del cliente. Un fallo transitorio no puede
   costarle el perfil a nadie: quien llama ya traduce el error a un 502. */
async function cargarPerfilDinamico(redis, id) {
  if (!esPerfilDinamico(id)) return null;
  let guardado = null;
  try {
    guardado = await leerJSONComprimido(redis, CLAVES.configPerfilDinamico(id));
  } catch (e) {
    if (Object.prototype.hasOwnProperty.call(PERFILES, id)) return PERFILES[id];
    throw e;
  }
  if (!guardado || !guardado.perfil) {
    // caducó o nunca existió: si estaba inyectado se retira — servir un perfil
    // fantasma desde la memoria caliente sería mentirle a quien ya lo perdió
    if (_inyectados.has(id)) { delete PERFILES[id]; _inyectados.delete(id); }
    return null;
  }
  const perfil = perfilDesdeConfig(id, guardado.perfil, null);
  PERFILES[id] = perfil;
  _inyectados.add(id);
  if (_inyectados.size > MAX_INYECTADOS) {
    for (const viejo of _inyectados) {
      if (viejo === id) continue;
      delete PERFILES[viejo];
      _inyectados.delete(viejo);
      break;
    }
  }
  return perfil;
}

/* Tope de perfiles dinámicos vivos a la vez. Las escrituras que crean perfiles
   son PÚBLICAS (RUP por PDF, diagnóstico de entrada), así que además del TTL
   hace falta un freno absoluto para que nadie llene el tier gratuito de
   Upstash a base de POSTs. 300 perfiles × ~5 claves pequeñas queda lejísimos
   de cualquier límite real. */
const MAX_PERFILES_DINAMICOS = 300;

/* TODAS las claves que componen UN perfil dinámico, en un solo sitio. La lista
   vivía escrita a mano dentro del DELETE de `/api/admin/rup`, y el desalojo de
   abajo necesita exactamente la misma: dos listas divergen a la primera clave
   que alguien añada, y la que se quedara corta dejaría basura huérfana en Redis
   con el perfil ya borrado. */
const SUFIJOS_UNSPSC = ["clases", "familias", "segmentos", "completo"];
function clavesDePerfilDinamico(id) {
  return [
    CLAVES.configPerfilDinamico(id),
    ...SUFIJOS_UNSPSC.map((s) => CLAVES.configUnspsc(id, s)),
    CLAVES.resumen(id), CLAVES.cobertura(id, "exp"), CLAVES.cobertura(id, "base"), `pulso:${id}`,
  ];
}

/* EL TOPE NO PUEDE CERRAR LA PUERTA DE ENTRADA (ago 2026). Con el tope lleno,
   `crearPerfilDinamico` respondía 503 y la landing —que ES el producto— dejaba
   de aceptar RUP nuevos hasta que algo caducara: hasta 45 días. Y como la
   escritura es PÚBLICA, cualquiera podía dejarla así a propósito. El freno
   sigue existiendo (nadie puede llenar Upstash sin límite), pero ahora DESALOJA
   en vez de rechazar: se tira el perfil MÁS VIEJO, que es el de menor TTL
   restante —todos nacen con el mismo TTL, así que el que menos le queda es el
   que antes se creó—. Es la opción menos destructiva y la única cuyo efecto ya
   está contemplado: un perfil que desaparece responde 404 `perfil_caducado`, y
   la web sabe olvidarlo y volver a la landing. Un visitante nuevo que no puede
   entrar no tiene ninguna salida; uno viejo vuelve a subir su PDF.
   El TTL se pide en LOTES: con el tope lleno son 300 comandos y solo ocurre en
   ese caso. Si Redis no deja leer los TTL no se adivina a quién desalojar: se
   conserva el 503, que es la respuesta honesta. */
const LOTE_TTL = 16;
async function desalojarMasViejos(redis, vivos, cuantos) {
  const conTtl = [];
  for (let i = 0; i < vivos.length; i += LOTE_TTL) {
    const lote = vivos.slice(i, i + LOTE_TTL);
    const ttls = await Promise.all(lote.map((k) => redis.ttl(k)));
    lote.forEach((k, j) => {
      const t = Number(ttls[j]);
      // TTL negativo = sin caducidad o clave ausente: no se desaloja a ciegas
      if (Number.isFinite(t) && t >= 0) conTtl.push({ clave: k, ttl: t });
    });
  }
  if (!conTtl.length) return { desalojados: 0, ids: [] };
  conTtl.sort((a, b) => a.ttl - b.ttl);
  const victimas = conTtl.slice(0, Math.max(0, cuantos));
  const ids = victimas.map((v) => {
    const m = String(v.clave).match(/([a-z0-9_]*rup_[a-z0-9]+)$/i);
    return m ? m[1] : null;
  }).filter(Boolean);
  if (!ids.length) return { desalojados: 0, ids: [] };
  const claves = ids.flatMap((id) => clavesDePerfilDinamico(id));
  let borradores = [];
  for (const id of ids) {
    try { borradores = borradores.concat(await redis.scan(CLAVES.patronApuPerfil(id))); } catch { /* sin borradores */ }
  }
  await redis.del(...claves, ...borradores);
  return { desalojados: ids.length, ids };
}

/* Crea (persiste) un perfil dinámico ya VALIDADO. Vivía dentro del handler de
   RUP por PDF y se extrajo aquí para que la puerta de entrada (Fase 2) cree sus
   perfiles por el MISMO camino: ids del servidor, cuatro whitelists derivadas,
   TTL, tope de vivos, y el perfil escrito AL FINAL (es la única clave que mira
   `cargarPerfilDinamico`, así que nadie puede servir un estado a medias).
   Además INYECTA el perfil en PERFILES en esta instancia: quien lo acaba de
   crear puede evaluarlo sin volver a leerlo de Redis.
   → { ok, id, perfil } | { ok:false, status, error } */
async function crearPerfilDinamico(redis, { perfil, meta = {}, ttl = PERFIL_DINAMICO_TTL_SEG } = {}) {
  const { derivarUnspsc } = require("./config_rup.js");
  const id = generarIdDinamico();
  let desalojo = null;
  try {
    const vivos = await redis.scan(CLAVES.patronPerfilesDinamicos);
    if (vivos.length >= MAX_PERFILES_DINAMICOS) {
      desalojo = await desalojarMasViejos(redis, vivos, vivos.length - MAX_PERFILES_DINAMICOS + 1);
      if (!desalojo.desalojados) {
        return {
          ok: false, status: 503,
          error: "Se alcanzó el tope de perfiles creados sin cuenta y no se pudo liberar ninguno. Intente de nuevo "
            + "en unos minutos o contacte al administrador del sitio.",
        };
      }
    }
  } catch (e) {
    return { ok: false, status: 503, error: `No se pudo consultar Redis. Reintente. (${e.message})` };
  }
  const d = derivarUnspsc(perfil.unspsc);
  try {
    await redis.set(CLAVES.configUnspsc(id, "clases"), JSON.stringify(d.clases), { ex: ttl });
    await redis.set(CLAVES.configUnspsc(id, "familias"), JSON.stringify(d.familias), { ex: ttl });
    await redis.set(CLAVES.configUnspsc(id, "segmentos"), JSON.stringify(d.segmentos), { ex: ttl });
    await redis.set(CLAVES.configUnspsc(id, "completo"), JSON.stringify(d), { ex: ttl });
    await escribirJSONComprimido(redis, CLAVES.configPerfilDinamico(id), {
      perfil,
      _meta: { cargado: new Date().toISOString(), ...meta },
    }, { ttl });
  } catch (e) {
    return { ok: false, status: 503, error: `No se pudo guardar el perfil. Reintente. (${e.message})` };
  }
  const vivo = perfilDesdeConfig(id, perfil, null);
  PERFILES[id] = vivo;
  _inyectados.add(id);
  return { ok: true, id, perfil: vivo, derivado: d };
}

/* Retira TODOS los perfiles inyectados (pruebas e higiene). Los tres fijos no
   se tocan: no están en `_inyectados` por construcción. */
function olvidarPerfilesDinamicos() {
  for (const id of _inyectados) delete PERFILES[id];
  _inyectados.clear();
}

module.exports = {
  ID_DINAMICO_RE, MAX_INYECTADOS, MAX_PERFILES_DINAMICOS, SUFIJOS_UNSPSC, clavesDePerfilDinamico,
  esPerfilDinamico, generarIdDinamico, cargarPerfilDinamico, crearPerfilDinamico, olvidarPerfilesDinamicos,
};
