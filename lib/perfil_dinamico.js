/* ============================================================================
   lib/perfil_dinamico · Perfiles creados por onboarding (RUP subido en PDF)
   ----------------------------------------------------------------------------
   Los perfiles fijos (el del dueño y los de sus socias) viven en lib/perfiles y
   son la configuración del DUEÑO. Los perfiles dinámicos son otra cosa: los
   crea cualquier contratista subiendo su RUP desde la landing, viven en Redis
   bajo `config:perfiles:rup_*` CON TTL (no son configuración permanente, son un
   onboarding renovable re-subiendo el PDF) y JAMÁS tocan ni los perfiles
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

/* ══════ CUOTA POR CONEXIÓN EN LAS DOS ALTAS PÚBLICAS (M-SEG-07, 6-sep-2026) ══════
   Las dos únicas escrituras sin credencial del repositorio —POST /api/perfil?op=entrada
   y POST /api/admin?op=rup&origen=pdf— crean un perfil dinámico cada una. Con el tope
   lleno, cada alta DESALOJA al visitante más viejo (arriba: «el tope no puede cerrar la
   puerta»), y esa decisión, que es la correcta, convierte una serie de altas en un ataque
   contra los visitantes legítimos. No existía ningún contador por conexión: 30 altas
   seguidas desde la misma dirección respondieron 200 las 30 (medido el 6-sep-2026 con los
   dos routers reales sobre un Upstash falso).

   LO QUE SE CUENTA ES EL INTENTO, NO EL PERFIL CREADO, y se cuenta ANTES de leer el
   cuerpo: quien ya está fuera de cuota no puede hacer que el servidor acepte 6 MB de
   imágenes ni que las mande al reconocimiento de imágenes de pago. Por eso un solo
   contador cubre también ese gasto y no hace falta un segundo por reconocimiento.

   DE DÓNDE SALE LA DIRECCIÓN. `x-real-ip` primero y, si no está, el PRIMER valor de
   `x-forwarded-for`. SUPUESTO declarado: que Vercel fija esas cabeceras y sobrescribe lo
   que mande el cliente no se pudo releer el 6-sep-2026 (vercel.com responde 403 al proxy
   de esta sesión). Si el supuesto fuera falso, el contador se falsifica y la cuota deja de
   morder — que es exactamente el estado de hoy, nunca peor. SIN cabecera legible la cuota
   es INERTE (no hay conexión que contar): meter a todo el mundo bajo una clave común
   cerraría la puerta de entrada para todos, que es justo lo que la decisión de ago-2026
   prohíbe.

   EL TOPE ES UNA CONSTANTE SUPUESTA, Y SE DICE. La ficha pedía medir una semana en
   producción antes de fijarlo; desde esta sesión no hay producción que medir. Se deriva de
   la única cifra medida que hay en el árbol, MAX_PERFILES_DINAMICOS = 300: doce altas por
   hora y conexión son 300 / 24 (redondeado a la baja), de modo que UNA sola conexión
   necesita más de un día para reciclar la puerta entera, mientras que un visitante legítimo
   (un alta; dos o tres si confirma lo leído por imagen o corrige un dato) no se acerca. La
   forma de reemplazarlo por una cifra MEDIDA está en op=salud (`&cuota=1`) y en MEMORIA.
   Con CUOTA_ALTAS_MODO=medir se cuenta y NO se bloquea: es la semana de medición.

   COSTE. Dos comandos en la primera alta de la hora (INCR + EXPIRE) y uno en las
   siguientes; dos más solo cuando una conexión pasa del piso de registro. */
const CUOTA_VENTANA_SEG = 3600;
const CUOTA_ALTAS_POR_HORA = 12;          // SUPUESTA: 300 perfiles / 24 h, ver arriba
const CUOTA_PISO_REGISTRO = 3;            // por debajo no se anota nada: es el uso normal
const CLAVE_CUOTA = (ip, ventana) => `cuota:alta:${ip}:${ventana}`;
const CLAVE_CUOTA_OBSERVADO = "cuota:alta:observado";
const OBSERVADO_DIAS = 14;
const OBSERVADO_TTL_SEG = 30 * 24 * 3600;

/* La dirección de la conexión, o null si no llega ninguna cabecera que la diga. */
function ipDePeticion(req) {
  const h = (req && req.headers) || {};
  const real = String(h["x-real-ip"] || "").trim();
  if (real) return real;
  const reenviada = String(h["x-forwarded-for"] || "").split(",")[0].trim();
  return reenviada || null;
}

/* El tope vigente y en qué modo está, leídos del entorno. Un valor que no sea un
   entero ≥ 1 es INERTE (se conserva la constante) y se DECLARA en `tope_del_entorno`:
   un CUOTA_ALTAS_HORA=0 mal escrito cerraría la puerta de entrada a todo el mundo. */
function configuracionDeCuota(env = process.env) {
  /* `tope_del_entorno` es el valor CRUDO, sin recortar: la variable puesta con un espacio
     de más existe y no vale, y decir null ahí sería mudo. null = la variable no existe. */
  const crudo = env.CUOTA_ALTAS_HORA === undefined || env.CUOTA_ALTAS_HORA === null ? null : String(env.CUOTA_ALTAS_HORA);
  const limpio = String(crudo ?? "").trim();
  const n = /^\d+$/.test(limpio) ? parseInt(limpio, 10) : NaN;
  const valido = Number.isInteger(n) && n >= 1;
  return {
    modo: String(env.CUOTA_ALTAS_MODO || "").trim().toLowerCase() === "medir" ? "medir" : "aplicar",
    tope: valido ? n : CUOTA_ALTAS_POR_HORA,
    tope_supuesto: !valido,                       // true = la constante derivada, no una medición
    tope_del_entorno: crudo,                      // lo que llegó, aunque no valga
    ventana_horas: CUOTA_VENTANA_SEG / 3600,
  };
}

/* Contador por conexión y ventana. La ventana es FIJA (la hora del reloj) y va en la
   clave: así el «vuelva a intentarlo en N minutos» se calcula sin gastar un TTL más y
   no puede mentir. Si Redis no responde, la cuota NO bloquea: un fallo de la base no
   puede cerrar la puerta de entrada. */
async function cuotaPorIp(redis, { clave, ventanaSeg, tope, ahora = Date.now() }) {
  const restanteSeg = ventanaSeg - Math.floor((ahora / 1000) % ventanaSeg);
  let usadas;
  try {
    usadas = Number(await redis._cmd(["INCR", clave]));
    if (usadas === 1) await redis.expire(clave, ventanaSeg);
  } catch (e) {
    return { permitido: true, usadas: null, tope, reintentar_en_seg: null, motivo_sin_cuota: `contador ilegible (${e.message})` };
  }
  if (!Number.isFinite(usadas)) {
    return { permitido: true, usadas: null, tope, reintentar_en_seg: null, motivo_sin_cuota: "el contador no devolvió un número" };
  }
  return { permitido: usadas <= tope, usadas, tope, reintentar_en_seg: restanteSeg, motivo_sin_cuota: null };
}

/* Anota el máximo observado por día para que el tope se pueda FIJAR con una medida.
   Solo escribe cuando la conexión pasó del piso y bate el máximo del día: en el uso
   normal no gasta ni un comando. Nunca hace fallar el alta. */
async function anotarObservado(redis, usadas, ahora = Date.now()) {
  if (!Number.isFinite(usadas) || usadas <= CUOTA_PISO_REGISTRO) return null;
  const dia = new Date(ahora).toISOString().slice(0, 10);
  try {
    let mapa = {};
    const crudo = await redis.get(CLAVE_CUOTA_OBSERVADO);
    if (crudo) { try { mapa = JSON.parse(crudo) || {}; } catch { mapa = {}; } }
    if (Number(mapa[dia]) >= usadas) return mapa;
    mapa[dia] = usadas;
    const dias = Object.keys(mapa).sort().slice(-OBSERVADO_DIAS);
    const podado = {};
    for (const d of dias) podado[d] = mapa[d];
    await redis.set(CLAVE_CUOTA_OBSERVADO, JSON.stringify(podado), { ex: OBSERVADO_TTL_SEG });
    return podado;
  } catch { return null; }
}

/* LA PUERTA. La llaman las DOS altas públicas antes de leer el cuerpo.
   → { permitido, cuerpo429, status } · `cuerpo429` solo cuando se bloquea.
   El dueño con la llave válida queda exento y se declara; una llave PRESENTE que no
   vale no exime y tampoco cierra la puerta (seguiría siendo un visitante), pero si la
   cuota lo bloquea el 429 lo DICE, para que no se pregunte por qué no quedó exento. */
async function guardaDeAltaPublica(redis, req, q = {}, ahora = Date.now()) {
  const cfg = configuracionDeCuota();
  const hayLlave = Boolean((req && req.headers && req.headers["x-historico-token"]) || (q && q.token));
  let llaveValida = false;
  if (hayLlave) {
    const { autorizarToken } = require("./auth.js");
    llaveValida = autorizarToken(req, q).ok === true;
  }
  if (llaveValida) return { permitido: true, exento: "llave del dueño", cuota: null };

  const ip = ipDePeticion(req);
  if (!ip) return { permitido: true, exento: "sin dirección de conexión legible", cuota: null };

  const ventana = Math.floor(ahora / 1000 / CUOTA_VENTANA_SEG);
  const r = await cuotaPorIp(redis, { clave: CLAVE_CUOTA(ip, ventana), ventanaSeg: CUOTA_VENTANA_SEG, tope: cfg.tope, ahora });
  await anotarObservado(redis, r.usadas, ahora);

  if (r.permitido || cfg.modo === "medir") {
    return { permitido: true, exento: cfg.modo === "medir" && !r.permitido ? "semana de medición" : null, cuota: r };
  }
  const minutos = Math.max(1, Math.ceil(r.reintentar_en_seg / 60));
  return {
    permitido: false,
    status: 429,
    cuota: r,
    cuerpo429: {
      ok: false,
      /* NO es «no encontré su registro»: se encontró todo, lo que se agotó es el número
         de registros permitidos desde esta conexión. La frase lo dice en ese orden y
         nombra el tiempo de espera; el frontend la pinta tal cual con `que_hacer`. */
      error: `Su empresa no se registró: desde esta conexión ya se ${r.usadas - 1 === 1 ? "hizo 1 registro" : `hicieron ${r.usadas - 1} registros`} en la última hora, y ese es el máximo permitido. `
        + "No es que no encontráramos su certificado ni sus datos: llegaron bien.",
      que_hacer: `Vuelva a intentarlo en ${minutos} ${minutos === 1 ? "minuto" : "minutos"}. Si comparte la conexión con más gente de su oficina, es normal que el turno le toque un poco después.`,
      reintentar_en_seg: r.reintentar_en_seg,
      motivo: "limite_por_conexion",
      llave_recibida_no_valida: hayLlave ? true : undefined,
    },
  };
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
  // cuota por conexión de las dos altas públicas (M-SEG-07)
  CUOTA_ALTAS_POR_HORA, CUOTA_VENTANA_SEG, CLAVE_CUOTA, CLAVE_CUOTA_OBSERVADO,
  ipDePeticion, configuracionDeCuota, cuotaPorIp, guardaDeAltaPublica,
};
