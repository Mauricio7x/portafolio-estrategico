/* ============================================================================
   /api/admin/rup · Cargar, consultar y eliminar el RUP del dueño (archivo JSON)
   ----------------------------------------------------------------------------
   GET    /api/admin/rup?token=…            → el RUP VIGENTE, en el mismo esquema
                                              que se sube (descargar → editar →
                                              volver a subir).
   POST   /api/admin/rup?token=…            → valida y guarda un RUP nuevo.
   DELETE /api/admin/rup?perfil=…&token=…   → elimina un RUP cargado (ago 2026):
          · perfil `rup_…` (subido en PDF): borra su clave, sus whitelists
            derivadas, sus borradores de APU y sus cachés. El perfil DEJA DE
            EXISTIR: la web vuelve a la landing.
          · perfil del dueño (helder/genesis/consorcio): quita SU entrada del
            archivo cargado; ese perfil VUELVE al respaldo del repositorio
            (los perfiles del repositorio no se pueden borrar: quedarse sin
            perfiles dejaría la app muda, y esa regla es de lib/perfiles).
          Lo que NO borra, a propósito: `config:experiencia` es configuración
          COMPARTIDA (una sola clave para todo el negocio, no por perfil) y los
          borradores de APU de un perfil del dueño sobreviven porque el perfil
          sigue existiendo con los valores del repositorio.

   PROTEGIDO con el mismo HISTORICO_TOKEN que /api/sync/historico,
   /api/diagnostico, /api/competencia-detalle y /api/resumen (lib/auth: header
   `x-historico-token` o `?token=`, el header manda si vienen los dos).

   POR QUÉ EXISTE: los perfiles eran datos hardcodeados en lib/perfiles.js, así
   que actualizar un RUP —un código UNSPSC nuevo, un indicador del balance del
   año, un profesional más— exigía tocar código y desplegar. El dueño no tiene
   terminal. Ahora sube un archivo desde /admin.html y el cambio surte efecto en
   la siguiente consulta: el juicio (matching UNSPSC, capacidad K, tope) corre
   AL SERVIR desde jul 2026, así que no hace falta re-sincronizar nada.

   ORDEN DE ESCRITURA (lo único delicado): primero las whitelists derivadas,
   después la configuración, y el SELLO (`config:perfiles:version`) AL FINAL.
   El sello es lo que hace recargar a las instancias calientes; escribirlo el
   último garantiza que nadie lea un estado a medias si la función muere en
   mitad de la carga. Y al terminar se invalida la caché del dashboard: sus
   números salen de este RUP y quedarían mintiendo cinco minutos.

   La configuración se guarda COMPRIMIDA (mismo formato que los chunks): el
   tope real de Upstash es 1 MB por valor y un RUP con cientos de códigos cabe
   de sobra, pero un archivo grande sin comprimir no.
   ========================================================================== */
"use strict";

const { crearRedis, hayCredenciales } = require("../../lib/redis.js");
const { autorizarToken } = require("../../lib/auth.js");
// el lector del cuerpo vive en lib/cuerpo: era la MISMA función copiada en tres
// endpoints y una de las copias ya había derivado (ver la cabecera de ese módulo)
const { leerCuerpo } = require("../../lib/cuerpo.js");
const {
  CLAVES, escribirJSONComprimido, leerJSONComprimido, PERFIL_DINAMICO_TTL_SEG,
} = require("../../lib/almacen.js");
const { validarConfig, validarPerfilDinamico, derivarUnspsc } = require("../../lib/config_rup.js");
const {
  PERFILES, aplicarConfig, invalidarCachePerfiles, recargarPerfiles,
  fuentePerfiles, perfilesComoConfig, idCanonico, perfilDesdeConfig,
  restablecerPerfiles, IDS,
} = require("../../lib/perfiles.js");
const { extraerRupDeTexto } = require("../../lib/rup_pdf.js");
const { generarIdDinamico } = require("../../lib/perfil_dinamico.js");
const { crp } = require("../../lib/capacidad.js");

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB de cuerpo (requerimiento)
const { ID_DINAMICO_RE } = require("../../lib/perfil_dinamico.js");
// las cuatro whitelists derivadas que escribe cada carga (fija o dinámica)
const SUFIJOS_UNSPSC = ["clases", "familias", "segmentos", "completo"];
/* Tope de perfiles dinámicos vivos a la vez. La acción `?origen=pdf` es
   PÚBLICA (ver abajo), así que además del TTL hace falta un freno absoluto
   para que nadie llene el tier gratuito de Upstash a base de POSTs. 300
   perfiles × ~5 claves pequeñas queda lejísimos de cualquier límite real. */
const MAX_PERFILES_DINAMICOS = 300;

/* Resumen legible de lo que quedó cargado (lo que enseña la UI). */
function resumenPerfiles() {
  const out = {};
  for (const clave of ["helder", "genesis", "consorcio"]) {
    const p = PERFILES[idCanonico(clave)];
    if (!p) continue;
    const d = derivarUnspsc([...p.unspsc]);
    out[clave] = {
      nombre: p.nombre,
      codigos: p.unspsc.size,
      clases: d.clases.length, familias: d.familias.length, segmentos: d.segmentos.length,
      profesionales: p.profesionales, tope_smmlv: p.topeSMMLV,
    };
  }
  return out;
}

/* ══════════════ POST /api/admin/rup?origen=pdf · onboarding ══════════════
   El contratista sube su certificado RUP desde la landing; el navegador lo lee
   con pdf.js (public/onboarding.js) y aquí llega SOLO el texto. Se extrae el
   perfil (lib/rup_pdf), se valida con el MISMO esquema de la carga manual
   (lib/config_rup.validarPerfilDinamico) y se guarda como perfil DINÁMICO
   (`config:perfiles:rup_*`, con TTL de 45 días).

   ES PÚBLICO A PROPÓSITO, y es la única escritura sin token del repositorio;
   el porqué y las cerraduras, para no re-litigarlo:
     · el onboarding ES el producto: pedir una credencial a quien llega a subir
       su RUP dejaría la landing inservible (la misma razón por la que
       /api/oportunidades tiene el token opcional);
     · SOLO escribe claves `config:perfiles:rup_*` / `config:unspsc:rup_*`
       (ids generados aquí, jamás del cliente): no puede tocar los tres
       perfiles del dueño, ni su sello `config:perfiles:version`, ni el corpus;
     · TTL de 45 días + tope absoluto de perfiles vivos (MAX_PERFILES_DINAMICOS)
       + tope de cuerpo de 5 MB: el abuso cuesta poco y caduca solo;
     · las cifras del perfil dinámico quedan bajo la MISMA redacción de
       lib/publico: sin token, /api/oportunidades las sirve en null.
   El alias literal /api/admin/rup-desde-pdf es un rewrite de vercel.json (el
   plan Hobby está en 12 funciones exactas y una más rompe el despliegue
   entero); la landing llama a la CANÓNICA por si el rewrite fallara. */
async function cargarRupDesdePdf(req, res) {
  const metodo = String(req.method || "GET").toUpperCase();
  if (metodo !== "POST") {
    /* pegar el alias en Chrome es un GET: decir cómo hacerlo de verdad, nunca
       un «GET que escribe» (lo dispararía cualquier prefetch del navegador) */
    res.setHeader("Allow", "POST");
    return res.status(405).json({
      ok: false,
      origen: "pdf",
      error: "La carga de un RUP en PDF solo se hace por POST: un GET no escribe nada.",
      como_hacerlo: "Abrí la página de inicio y usá el botón «SUBIR RUP (PDF)»: el navegador extrae el texto "
        + "del certificado y lo envía solo. A mano: POST /api/admin/rup-desde-pdf con JSON {\"texto_extraido\": \"…\"}.",
    });
  }
  if (!hayCredenciales()) {
    return res.status(503).json({ ok: false, error: "Faltan credenciales de Upstash Redis en el despliegue." });
  }

  const cuerpo = await leerCuerpo(req, { maxBytes: MAX_BYTES, que: "texto_extraido" });
  if (!cuerpo.ok) {
    const salida = { ok: false, error: cuerpo.error };
    if (cuerpo.max_mb) salida.max_mb = cuerpo.max_mb;
    return res.status(cuerpo.status).json(salida);
  }
  const texto = cuerpo.datos && cuerpo.datos.texto_extraido;
  if (typeof texto !== "string" || !texto.trim()) {
    return res.status(400).json({
      ok: false,
      error: "Falta «texto_extraido»: el navegador debe extraer el texto del PDF (pdf.js) y enviarlo aquí. "
        + "El servidor no recibe el PDF binario a propósito — no tiene con qué leerlo.",
    });
  }

  const extraccion = extraerRupDeTexto(texto);
  if (!extraccion.ok) {
    return res.status(400).json({ ok: false, error: extraccion.error, diagnostico: extraccion.diagnostico || null });
  }

  /* ═══ EL CERTIFICADO SE ACEPTA AUNQUE LE FALTE UN NÚMERO ══════════════════
     Un RUP de PERSONA NATURAL sale de la Cámara con el mismo formato que el de
     una sociedad pero sin «Utilidad operacional» (quien no lleva libros no la
     reporta). Antes eso rechazaba el certificado ENTERO y expulsaba al usuario
     en la primera pantalla. Ahora `lib/rup_pdf` devuelve lo que leyó con
     `completo: false` y la lista de lo que falta, y aquí se cierra el circuito:

       1.ª llamada  · sin `completar` → 200 con `completo:false` + `faltan`.
                      NO SE GUARDA NADA: un perfil a medias calcularía una
                      capacidad de contratación con huecos, y eso decide a qué
                      se presenta una persona.
       2.ª llamada  · el navegador reenvía el MISMO texto y `completar` con los
                      números que la persona tecleó. Se fusionan sobre lo
                      extraído y sigue el camino normal.

     Se reenvía el TEXTO y no el perfil parcial a propósito: si el cliente
     mandara el perfil, podría mandar cualquier cosa —códigos UNSPSC incluidos—
     y esta es la ÚNICA escritura sin token de todo el proyecto. Con `completar`
     el cliente solo puede mover las casillas que el servidor declaró faltantes;
     todo lo demás lo sigue decidiendo el extractor. */
  const completar = (cuerpo.datos && cuerpo.datos.completar) || null;
  if (completar && typeof completar === "object" && !Array.isArray(completar)) {
    const permitidos = new Set(extraccion.faltan.map((f) => f.campo));
    for (const [campo, valor] of Object.entries(completar)) {
      if (!permitidos.has(campo)) continue;            // solo lo que el servidor pidió
      const n = Number(valor);
      if (!Number.isFinite(n) || n <= 0) continue;     // un 0 no es un dato (R1)
      if (campo === "experiencia_smmlv") {
        extraccion.config.experiencia_smmlv = n;
        // el tope sale del mismo supuesto declarado que usa el extractor
        if (extraccion.config.tope_smmlv == null) extraccion.config.tope_smmlv = Math.ceil(n * 2);
      } else if (campo === "endeudamiento") {
        // se teclea como PORCENTAJE (13 = 13 %); el esquema lo guarda como razón
        extraccion.config.indicadores.endeudamiento = n > 1 ? Math.round((n / 100) * 10000) / 10000 : n;
      } else {
        extraccion.config.indicadores[campo] = campo === "liquidez" ? n : Math.round(n);
      }
    }
    extraccion.faltan = extraccion.faltan.filter((f) => (
      (f.campo === "experiencia_smmlv"
        ? extraccion.config.experiencia_smmlv : extraccion.config.indicadores[f.campo]) == null
    ));
    extraccion.completo = extraccion.faltan.length === 0;
  }

  if (!extraccion.completo) {
    return res.status(200).json({
      ok: true,
      completo: false,
      faltan: extraccion.faltan,
      /* Lo leído viaja para que la web pueda enseñar «ya tengo esto» y pedir
         solo el resto: ver una pantalla que reconoce tu certificado es lo que
         hace que valga la pena teclear dos números. */
      leido: {
        nombre: extraccion.config.nombre,
        tipo: extraccion.config.tipo,
        codigos_unspsc: extraccion.config.unspsc.length,
        vigencia: extraccion.vigencia,
      },
      advertencias: extraccion.advertencias,
      como_seguir: "Escribí los datos que faltan y volvé a enviar el mismo certificado junto con «completar». "
        + "Quedan guardados en tu perfil: solo se piden una vez.",
    });
  }

  const id = generarIdDinamico();
  const v = validarPerfilDinamico(id, extraccion.config);
  if (!v.ok) {
    return res.status(400).json({
      ok: false,
      error: `Los datos extraídos del certificado no pasan la validación (${v.errores.length} error${v.errores.length === 1 ? "" : "es"}): no se guardó nada. `
        + "Revisá el PDF o cargá el RUP a mano desde /admin.html.",
      errores: v.errores,
      advertencias: [...extraccion.advertencias, ...v.advertencias],
      diagnostico: extraccion.diagnostico,
    });
  }

  const redis = crearRedis({});
  try {
    const vivos = await redis.scan(CLAVES.patronPerfilesDinamicos);
    if (vivos.length >= MAX_PERFILES_DINAMICOS) {
      return res.status(503).json({
        ok: false,
        error: "Se alcanzó el tope de perfiles creados por PDF. Intentá de nuevo en unos días (los perfiles "
          + "sin uso caducan solos) o contactá al administrador del sitio.",
      });
    }
  } catch (e) {
    return res.status(503).json({ ok: false, error: `No se pudo consultar Redis. Reintentá. (${e.message})` });
  }

  /* guardado con TTL. El perfil se escribe AL FINAL: es la única clave que
     mira lib/perfil_dinamico, así que nadie puede servir un estado a medias. */
  const cargado = new Date().toISOString();
  const d = derivarUnspsc(v.perfil.unspsc);
  const ttl = PERFIL_DINAMICO_TTL_SEG;
  try {
    await redis.set(CLAVES.configUnspsc(id, "clases"), JSON.stringify(d.clases), { ex: ttl });
    await redis.set(CLAVES.configUnspsc(id, "familias"), JSON.stringify(d.familias), { ex: ttl });
    await redis.set(CLAVES.configUnspsc(id, "segmentos"), JSON.stringify(d.segmentos), { ex: ttl });
    await redis.set(CLAVES.configUnspsc(id, "completo"), JSON.stringify(d), { ex: ttl });
    await escribirJSONComprimido(redis, CLAVES.configPerfilDinamico(id), {
      perfil: v.perfil,
      _meta: { cargado, origen: "pdf", vigencia: extraccion.vigencia },
    }, { ttl });
  } catch (e) {
    return res.status(503).json({ ok: false, error: `No se pudo guardar el perfil. Reintentá. (${e.message})` });
  }

  /* K estimada (techo): la CRP del perfil sin un proceso concreto (factor E en
     su máximo). La K frente a CADA proceso la calcula la app al servir. */
  const k = Math.round(crp(perfilDesdeConfig(id, v.perfil, null), 0));

  return res.status(200).json({
    ok: true,
    guardado: true,
    perfil_id: id,
    unspsc_count: v.perfil.unspsc.length,
    k,
    k_declarada_smmlv: extraccion.k_declarada_smmlv != null ? extraccion.k_declarada_smmlv : null,
    vigencia: extraccion.vigencia,
    resumen: {
      nombre: v.perfil.nombre,
      tipo: v.perfil.tipo,
      nit: v.perfil.nit != null ? v.perfil.nit : null,
      indicadores: v.perfil.indicadores,
      experiencia_smmlv: v.perfil.experiencia_smmlv,
      tope_smmlv: v.perfil.tope_smmlv,
      profesionales: v.perfil.profesionales,
      clases: d.clases.length, familias: d.familias.length, segmentos: d.segmentos.length,
    },
    advertencias: [...extraccion.advertencias, ...v.advertencias],
    diagnostico: extraccion.diagnostico,
    caducidad_dias: Math.round(PERFIL_DINAMICO_TTL_SEG / 86400),
    url_dashboard: `/?perfil=${id}`,
    nota: "El perfil quedó guardado con caducidad; re-subir el RUP lo renueva. Las cifras financieras del "
      + "perfil solo viajan redactadas en la consulta pública (lib/publico), igual que las de los perfiles del dueño.",
  });
}

/* ══════════════════ DELETE /api/admin/rup?perfil=… ══════════════════
   `perfil` es OBLIGATORIO, sin default: «eliminar el RUP» sin decir cuál
   borraría el de otro, que es la peor forma posible de equivocarse (la misma
   regla que el perfil de la auditoría de cobertura).

   Dos casos con semántica distinta y hay que decirla:
   · DINÁMICO (`rup_…`): el perfil deja de existir. Se borran su clave, sus
     cuatro whitelists, sus borradores de APU y sus cachés — todo en UN solo
     DEL (una orden REST: no puede quedar a medias entre claves).
   · FIJO (helder/genesis/consorcio): se quita SU entrada del archivo cargado
     y ese perfil vuelve al respaldo del repositorio. Si era la última entrada,
     se borra el archivo Y el sello — `recargarPerfiles` ve el sello ausente y
     restablece el respaldo en TODAS las instancias, no solo en esta. Si quedan
     entradas, se reescribe el archivo y el sello va AL FINAL, igual que en la
     carga. Ojo a la instancia caliente: `aplicarConfig` es parcial a propósito
     («quien no venga conserva lo que tenía»), así que antes de re-aplicar hay
     que RESTABLECER — si no, el perfil recién borrado seguiría sirviéndose
     desde la memoria de esta instancia. */
async function eliminarRup(res, redis, q) {
  const crudo = String(q.perfil || "").toLowerCase().trim();
  if (!crudo) {
    return res.status(400).json({
      ok: false,
      error: "«perfil» es obligatorio: DELETE /api/admin/rup?perfil=rup_… (perfil subido en PDF) o ?perfil=helder|genesis|consorcio (RUP cargado del dueño).",
    });
  }

  /* ---------- perfil dinámico (onboarding en PDF) ---------- */
  if (ID_DINAMICO_RE.test(crudo)) {
    let existia = null;
    try {
      existia = await redis.get(CLAVES.configPerfilDinamico(crudo));
    } catch (e) {
      return res.status(503).json({ ok: false, error: `No se pudo consultar Redis. Reintente. (${e.message})` });
    }
    if (existia == null) {
      return res.status(404).json({
        ok: false,
        error: `El perfil «${crudo}» no existe o ya caducó: no hay nada que eliminar.`,
        sin_perfiles: true,
        redirigir: "landing",
      });
    }
    const claves = [CLAVES.configPerfilDinamico(crudo), ...SUFIJOS_UNSPSC.map((s) => CLAVES.configUnspsc(crudo, s))];
    // cachés por clave LITERAL (borrar una clave ausente es un no-op): así no
    // se depende de la semántica de comodines de SCAN para un id conocido
    const caches = [CLAVES.resumen(crudo), CLAVES.cobertura(crudo, "exp"), CLAVES.cobertura(crudo, "base")];
    let borradores = [];
    try {
      borradores = await redis.scan(CLAVES.patronApuPerfil(crudo));
      await redis.del(...claves, ...borradores, ...caches);
    } catch (e) {
      return res.status(503).json({ ok: false, error: `No se pudo eliminar el perfil. Reintente. (${e.message})` });
    }
    /* la inyección en PERFILES se auto-sanea: la siguiente petición relee la
       clave, la encuentra ausente y retira el perfil de la instancia caliente
       (lib/perfil_dinamico.cargarPerfilDinamico) — no hay estado que limpiar */
    return res.status(200).json({
      ok: true,
      eliminado: true,
      perfil: crudo,
      tipo: "dinamico",
      claves_eliminadas: claves.length + borradores.length + caches.length,
      borradores_eliminados: borradores.length,
      sin_perfiles: true,
      redirigir: "landing",
      nota: "El perfil y sus datos asociados se eliminaron. Para volver a usar la aplicación hay que subir el RUP de nuevo.",
    });
  }

  /* ---------- perfil del dueño (archivo cargado en Redis) ---------- */
  const id = idCanonico(crudo);
  if (!IDS.includes(id)) {
    return res.status(400).json({ ok: false, error: `Perfil desconocido: «${crudo}». Valen helder, genesis, consorcio o un id rup_….` });
  }
  let version = null, config = null;
  try {
    version = await redis.get(CLAVES.configPerfilesVersion);
    if (version != null) config = await leerJSONComprimido(redis, CLAVES.configPerfiles);
  } catch (e) {
    return res.status(503).json({ ok: false, error: `No se pudo leer la configuración: ${e.message}` });
  }
  if (!config || !config.perfiles) {
    return res.status(404).json({
      ok: false,
      error: "No hay ningún RUP cargado: se está sirviendo el respaldo del repositorio, que no se puede eliminar (quedarse sin perfiles dejaría la app muda).",
      fuente: "hardcoded",
    });
  }
  // el plural puede venir en el archivo como «consorcio» o como «juntos»
  const clavesArchivo = id === "juntos" ? ["consorcio", "juntos"] : [id];
  const presentes = clavesArchivo.filter((k) => config.perfiles[k]);
  if (!presentes.length) {
    return res.status(404).json({
      ok: false,
      error: `El RUP cargado no trae el perfil «${crudo}»: ese perfil ya se sirve desde el respaldo del repositorio.`,
    });
  }
  for (const k of presentes) delete config.perfiles[k];
  const restantes = Object.keys(config.perfiles);
  const clavesUnspsc = restantes.length
    ? SUFIJOS_UNSPSC.map((s) => CLAVES.configUnspsc(id, s))
    // última entrada: barrer las whitelists de los TRES fijos (las dinámicas
    // llevan TTL propio y no se tocan)
    : IDS.flatMap((p) => SUFIJOS_UNSPSC.map((s) => CLAVES.configUnspsc(p, s)));

  const cargado = new Date().toISOString();
  const nuevaVersion = `${cargado}#${Math.random().toString(36).slice(2, 10)}`;
  try {
    if (restantes.length === 0) {
      // un solo DEL: archivo + sello + whitelists caen juntos, y el sello
      // ausente hace que TODAS las instancias vuelvan al respaldo
      await redis.del(CLAVES.configPerfiles, CLAVES.configPerfilesVersion, ...clavesUnspsc);
    } else {
      config._meta = { ...(config._meta || {}), version: nuevaVersion, cargado, perfiles: restantes, eliminado: crudo };
      await escribirJSONComprimido(redis, CLAVES.configPerfiles, config);
      await redis.del(...clavesUnspsc);
      // SELLO AL FINAL: es lo que hace recargar a las instancias calientes
      await redis.set(CLAVES.configPerfilesVersion, nuevaVersion);
    }
  } catch (e) {
    return res.status(503).json({ ok: false, error: `No se pudo eliminar. Reintente. (${e.message})` });
  }

  /* ---------- efecto inmediato en esta instancia ---------- */
  try {
    restablecerPerfiles();
    if (restantes.length) aplicarConfig(config, { version: nuevaVersion, cargado });
    invalidarCachePerfiles();
    await recargarPerfiles(redis, { forzar: true });
  } catch (e) {
    return res.status(500).json({ ok: false, error: `Eliminado, pero falló la recarga de perfiles: ${e.message}` });
  }

  /* el dashboard y la auditoría se calcularon contra el RUP que acaba de
     desaparecer: mismas cachés que invalida la carga */
  let cacheBorrada = 0;
  try {
    const viejas = [...await redis.scan(CLAVES.patronResumen), ...await redis.scan(CLAVES.patronCobertura)];
    if (viejas.length) {
      await redis.del(...viejas);
      cacheBorrada = viejas.length;
    }
  } catch { /* las dos cachés caducan solas: no valen un 500 */ }

  return res.status(200).json({
    ok: true,
    eliminado: true,
    perfil: crudo,
    tipo: "fijo",
    perfiles_restantes: restantes,
    // los perfiles del dueño no desaparecen: vuelven al respaldo del repositorio
    sin_perfiles: false,
    redirigir: "dashboard",
    siguiente_perfil: restantes[0] || id,
    fuente: fuentePerfiles(),
    cache_resumen_invalidada: cacheBorrada,
    nota: `El perfil «${crudo}» volvió a los valores del repositorio (RUP corte 31/12/2025). `
      + "Los borradores de APU y la experiencia cargada no se tocan: el perfil sigue existiendo.",
  });
}

module.exports = async function handler(req, res) {
  const q = req.query || {};
  res.setHeader("Cache-Control", "no-store");

  /* El origen se resuelve ANTES de autorizar y de despachar por método (la
     lección de /api/admin/experiencia): la vía del PDF es pública y tiene su
     propio manejador; todo lo demás sigue exigiendo el token como siempre. */
  if (String(q.origen || "").toLowerCase() === "pdf") return cargarRupDesdePdf(req, res);

  const permiso = autorizarToken(req, q);
  if (!permiso.ok) return res.status(permiso.status).json({ ok: false, error: permiso.error });
  if (!hayCredenciales()) {
    return res.status(503).json({ ok: false, error: "Faltan credenciales de Upstash Redis en el despliegue." });
  }
  const metodo = String(req.method || "GET").toUpperCase();
  const redis = crearRedis({});

  /* ══════════════════ GET · el RUP vigente ══════════════════ */
  if (metodo === "GET") {
    let config = null, version = null;
    try {
      version = await redis.get(CLAVES.configPerfilesVersion);
      if (version != null) config = await leerJSONComprimido(redis, CLAVES.configPerfiles);
    } catch (e) {
      return res.status(503).json({ ok: false, error: `No se pudo leer la configuración: ${e.message}` });
    }
    if (config && config.perfiles) {
      return res.status(200).json({
        ok: true, fuente: "redis",
        version: String(version),
        cargado: (config._meta && config._meta.cargado) || String(version),
        perfiles: config.perfiles,
        resumen: resumenPerfiles(),
      });
    }
    // nada cargado (o valor ilegible): se devuelven los del repositorio, ya
    // traducidos al esquema de carga para poder editarlos y subirlos
    return res.status(200).json({
      ok: true, fuente: "hardcoded",
      advertencia: "No se ha cargado ningún RUP. Estos son los valores por defecto del repositorio (RUP corte 31/12/2025).",
      version: null, cargado: null,
      perfiles: perfilesComoConfig(),
      resumen: resumenPerfiles(),
    });
  }

  /* ══════════════════ DELETE · eliminar un RUP ══════════════════ */
  if (metodo === "DELETE") return eliminarRup(res, redis, q);

  if (metodo !== "POST") {
    res.setHeader("Allow", "GET, POST, DELETE");
    return res.status(405).json({ ok: false, error: "Método no permitido: GET consulta, POST carga y DELETE elimina (?perfil=…)." });
  }

  /* ══════════════════ POST · cargar un RUP ══════════════════ */
  const cuerpo = await leerCuerpo(req, { maxBytes: MAX_BYTES, que: "perfiles" });
  if (!cuerpo.ok) {
    const salida = { ok: false, error: cuerpo.error };
    if (cuerpo.max_mb) salida.max_mb = cuerpo.max_mb;
    return res.status(cuerpo.status).json(salida);
  }

  const v = validarConfig(cuerpo.datos);
  if (!v.ok) {
    return res.status(400).json({
      ok: false,
      error: `El archivo tiene ${v.errores.length} error${v.errores.length === 1 ? "" : "es"} de validación: no se guardó nada.`,
      errores: v.errores,
      advertencias: v.advertencias,
    });
  }

  /* El sello lleva un sufijo aleatorio además del instante: dos cargas dentro
     del mismo milisegundo (dos pestañas, un doble envío) producirían el mismo
     ISO y la segunda pasaría desapercibida para las instancias calientes, que
     comparan sellos. La fecha legible viaja aparte, en `_meta.cargado`. */
  const cargado = new Date().toISOString();
  const version = `${cargado}#${Math.random().toString(36).slice(2, 10)}`;
  const config = { ...v.config, _meta: { version, cargado, perfiles: v.perfiles_cargados } };

  /* ---------- guardado (todo o nada: el sello va al final) ---------- */
  const unspsc = {};
  try {
    for (const clave of v.perfiles_cargados) {
      const id = idCanonico(clave);
      const d = derivarUnspsc(v.config.perfiles[clave].unspsc);
      unspsc[clave] = { clases: d.clases.length, familias: d.familias.length, segmentos: d.segmentos.length };
      await redis.set(CLAVES.configUnspsc(id, "clases"), JSON.stringify(d.clases));
      await redis.set(CLAVES.configUnspsc(id, "familias"), JSON.stringify(d.familias));
      await redis.set(CLAVES.configUnspsc(id, "segmentos"), JSON.stringify(d.segmentos));
      await redis.set(CLAVES.configUnspsc(id, "completo"), JSON.stringify(d));
    }
    await escribirJSONComprimido(redis, CLAVES.configPerfiles, config);
    // SELLO AL FINAL: es lo que hace recargar a las instancias calientes
    await redis.set(CLAVES.configPerfilesVersion, version);
  } catch (e) {
    return res.status(503).json({ ok: false, error: `No se pudo guardar. Reintente. (${e.message})` });
  }

  /* ---------- efecto inmediato ---------- */
  let aplicado = null;
  try {
    aplicarConfig(config, { version, cargado });
    invalidarCachePerfiles();
    await recargarPerfiles(redis, { forzar: true });
    aplicado = fuentePerfiles();
  } catch (e) {
    return res.status(500).json({ ok: false, error: `Error interno al procesar UNSPSC: ${e.message}` });
  }

  /* el dashboard cachea sus totales 5 minutos y salen de ESTE RUP: dejarlos
     vivos enseñaría números de la configuración anterior. Lo mismo vale para la
     auditoría de cobertura (TTL 1 h): su lista de «códigos que te faltan» se
     calcula contra ESTA whitelist, así que un código recién inscrito seguiría
     apareciendo como hueco durante una hora. */
  let cacheBorrada = 0;
  try {
    const viejas = [...await redis.scan(CLAVES.patronResumen), ...await redis.scan(CLAVES.patronCobertura)];
    if (viejas.length) {
      await redis.del(...viejas);
      cacheBorrada = viejas.length;
    }
  } catch { /* las dos cachés caducan solas: no valen un 500 */ }

  /* el consorcio se REDERIVA de sus integrantes aunque no venga en el archivo
     (unión de UNSPSC, experiencia sumada, K = suma de CRP): hay que decirlo */
  const derivados = [];
  if (!v.perfiles_cargados.includes("consorcio") && !v.perfiles_cargados.includes("juntos")) {
    derivados.push("consorcio");
    const d = derivarUnspsc([...PERFILES.juntos.unspsc]);
    unspsc.consorcio = { clases: d.clases.length, familias: d.familias.length, segmentos: d.segmentos.length };
  }

  return res.status(200).json({
    ok: true,
    guardado: true,
    perfiles_cargados: v.perfiles_cargados,
    perfiles_derivados: derivados,
    unspsc,
    resumen: resumenPerfiles(),
    advertencias: v.advertencias,
    version,
    fuente: aplicado,
    cache_resumen_invalidada: cacheBorrada,
    nota: "Los cambios surten efecto en la siguiente consulta: el juicio (UNSPSC, pertinencia, capacidad K y tope) corre al servir, no al sincronizar. No hace falta relanzar /api/sync.",
  });
};
