/* ============================================================================
   /api/admin/experiencia · Los contratos que el dueño YA ejecutó
   ----------------------------------------------------------------------------
   GET  /api/admin/experiencia?token=…  → lo cargado (contratos + vocabulario)
   POST /api/admin/experiencia?token=…  → valida, guarda y extrae el vocabulario
   POST /api/admin/experiencia?origen=repositorio&token=…
                                        → lo MISMO, pero leyendo los contratos del
                                          archivo del repositorio en vez del cuerpo
        (alias literal: POST /api/admin/cargar-experiencia-genesis, un `rewrite`
         de vercel.json — no una función nueva; ver más abajo)

   ── POR QUÉ `?origen=repositorio` VIVE AQUÍ Y NO EN UN ARCHIVO PROPIO ──────
   El dueño no tiene terminal: `cargar_experiencia.sh` no le sirve y necesita
   hacerlo con un clic desde /admin.html. La reacción natural sería crear
   `api/admin/cargar-experiencia-genesis.js`, y **rompería el despliegue
   entero**: el plan Hobby de Vercel admite 12 funciones y el repositorio está
   exactamente en 12 (hay prueba que las cuenta). No fallaría el endpoint nuevo:
   fallaría el sitio.
   Plegarlo aquí además REGALA lo que el encargo pedía aparte — «reutiliza la
   función interna, sin duplicar código»—: no hay una segunda ruta que validar
   ni un segundo sitio donde invalidar la caché de cobertura. Lo único que
   cambia entre las dos formas es DE DÓNDE salen los contratos; desde
   `validarContratos` en adelante es literalmente el mismo camino, y por eso no
   pueden divergir.
   La URL que pidió el encargo existe igual, como `rewrite` en vercel.json. El
   panel llama a la canónica a propósito: si el rewrite fallara, el botón tiene
   que seguir funcionando.

   PROTEGIDO con el mismo HISTORICO_TOKEN que el resto de /api/admin y de los
   endpoints de mantenimiento (lib/auth: header `x-historico-token` o `?token=`,
   el header manda si vienen los dos).

   POR QUÉ EXISTE: el RUP dice a qué PUEDE presentarse el dueño; sus contratos
   ejecutados dicen en qué SABE trabajar, y hasta ahora la app solo conocía lo
   primero. Con esta lista, /api/admin/cobertura-rup puede responder la pregunta
   que importa antes de cada renovación del RUP: «¿con qué códigos publica el
   mercado los objetos que yo ya ejecuto, y cuáles no tengo inscritos?».

   Al guardar se invalida la caché de la auditoría de cobertura: sus números
   salen de este vocabulario y quedarían mintiendo una hora entera. (La caché
   además compara sellos, así que esto es la segunda cerradura, no la única —
   pero borrarla aquí es lo que hace que el dueño vea el efecto al instante.)

   NO requiere full ni backfill: la experiencia se compara al SERVIR la
   auditoría, exactamente igual que el juicio del RUP desde jul 2026.
   ========================================================================== */
"use strict";

const { crearRedis, hayCredenciales } = require("../../redis.js");
const { autorizarToken } = require("../../auth.js");
// el lector del cuerpo vive en lib/cuerpo: era la MISMA función copiada en tres
// endpoints y una de las copias ya había derivado (ver la cabecera de ese módulo)
const { leerCuerpo } = require("../../cuerpo.js");
const { CLAVES } = require("../../almacen.js");
const {
  MAX_CONTRATOS, MAX_OBJETO,
  validarContratos, guardarExperiencia, leerExperiencia, leerTerminos,
} = require("../../experiencia.js");

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB de cuerpo (mismo tope que el RUP)

/* ══════════════════ Los contratos que vienen del REPOSITORIO ══════════════════
   `require` ESTÁTICO, no `fs.readFileSync(process.cwd() + …)`, y no es un
   detalle de estilo:

     · es como este repositorio carga TODOS sus JSON en funciones serverless
       (lib/apu/catalogo, lib/apu_catalogo, lib/texto_unspsc): un solo patrón;
     · un `require` literal lo ve el tracer de Vercel y **mete el archivo en el
       bundle**. Con una ruta construida en tiempo de ejecución no lo ve, el
       archivo no viaja al despliegue y el endpoint respondería 500 SOLO EN
       PRODUCCIÓN — el peor sitio posible para enterarse, porque en local
       funciona. `includeFiles` de vercel.json apunta a `data/**` y este archivo
       está en la raíz, así que ahí tampoco entraría.

   Va dentro de una función y no en tiempo de carga para que la ausencia del
   archivo sea un error EXPLICADO del endpoint y no una caída del módulo entero
   que se llevaría por delante también el GET y la carga manual. */
const ARCHIVO_REPOSITORIO = "experiencia_genesis_106.json";

function contratosDelRepositorio() {
  try {
    const datos = require("../../../experiencia_genesis_106.json");
    if (!datos || typeof datos !== "object" || !Array.isArray(datos.contratos)) {
      return {
        ok: false, status: 500,
        error: `«${ARCHIVO_REPOSITORIO}» no tiene la forma esperada: falta el arreglo «contratos».`,
      };
    }
    return { ok: true, datos };
  } catch (e) {
    return {
      ok: false, status: 500,
      error: `No se pudo leer «${ARCHIVO_REPOSITORIO}» del despliegue: ${e.message}`,
      pista: "El archivo vive en la raíz del repositorio. Si falta en el despliegue, use la carga "
        + "manual pegando el JSON en el panel: el resto del camino es exactamente el mismo.",
    };
  }
}

module.exports = async function handler(req, res) {
  const q = req.query || {};
  res.setHeader("Cache-Control", "no-store");

  const permiso = autorizarToken(req, q);
  if (!permiso.ok) return res.status(permiso.status).json({ ok: false, error: permiso.error });
  if (!hayCredenciales()) {
    return res.status(503).json({ ok: false, error: "Faltan credenciales de Upstash Redis en el despliegue." });
  }
  const metodo = String(req.method || "GET").toUpperCase();
  const redis = crearRedis({});

  /* El origen se resuelve ANTES de despachar por método, y no dentro del POST,
     por un defecto real: pegar el alias en la barra de Chrome es un GET, y la
     rama GET retornaba antes de llegar a mirarlo. Respondía
     `200 {ok:true, cargada:false, contratos_cargados:0}` — un «no hice nada»
     con cara de éxito, y encima con un cero que se lee como «cargué cero
     contratos». Es la misma familia que «en 0 procesos» y que `|| 0` sobre un
     conteo, y le tocaba justo al único usuario que existe: el dueño sin
     terminal, cuya vía documentada es pegar la URL en el navegador. */
  const desdeRepositorio = String(q.origen || "").toLowerCase() === "repositorio";

  if (metodo === "GET" && desdeRepositorio) {
    res.setHeader("Allow", "POST");
    return res.status(405).json({
      ok: false,
      origen: "repositorio",
      archivo: ARCHIVO_REPOSITORIO,
      error: "Esta carga solo se hace por POST: un GET no escribe nada.",
      /* Nada de «GET que escribe»: una URL así se dispara sola con cualquier
         prefetch del navegador. Se dice cómo hacerlo de verdad, que es lo que
         necesita quien acaba de pegar esto en Chrome. */
      como_hacerlo: "Abra Mi empresa y pulse «1 · Cargar Experiencia Génesis» (o «Hacer los tres pasos»). "
        + "Si prefiere la petición a mano: POST /api/admin/cargar-experiencia-genesis con la cabecera "
        + "x-historico-token, sin cuerpo.",
    });
  }

  /* ══════════════════ GET · la experiencia vigente ══════════════════ */
  if (metodo === "GET") {
    let guardada = null, vocab = null;
    try {
      guardada = await leerExperiencia(redis);
      vocab = await leerTerminos(redis);
    } catch (e) {
      return res.status(503).json({ ok: false, error: `No se pudo leer la experiencia: ${e.message}` });
    }
    if (!guardada || !Array.isArray(guardada.contratos) || !guardada.contratos.length) {
      return res.status(200).json({
        ok: true, cargada: false,
        contratos: [], contratos_cargados: 0,
        terminos_extraidos: 0, ejemplos_terminos: [],
        mensaje: "No hay experiencia cargada. Cargue sus contratos ejecutados para auditar la cobertura de sus RUP.",
      });
    }
    const meta = guardada._meta || {};
    return res.status(200).json({
      ok: true, cargada: true,
      version: meta.version || null,
      cargado: meta.cargado || null,
      contratos_cargados: guardada.contratos.length,
      terminos_extraidos: vocab ? vocab.total_terminos : 0,
      ejemplos_terminos: vocab ? vocab.ejemplos : [],
      contratos: guardada.contratos,
    });
  }

  if (metodo !== "POST") {
    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({ ok: false, error: "Método no permitido: use GET para consultar y POST para cargar." });
  }

  /* ══════════════════ POST · cargar la experiencia ══════════════════
     De aquí en adelante las dos formas comparten TODO. Lo único que decide
     `origen` es de dónde salen los contratos; el validador, el guardado, la
     invalidación de la caché de cobertura y la forma de la respuesta son los
     mismos objetos de código, así que no hay dos caminos que puedan divergir.

     El origen se lee de la QUERY y no del cuerpo a propósito: así la carga
     desde el repositorio es un POST **sin cuerpo**, que es lo que permite
     dispararla con un botón —y con el `rewrite` de vercel.json— sin fabricar
     un JSON que el servidor ya tiene. */
  let cuerpo;
  if (desdeRepositorio) {
    cuerpo = contratosDelRepositorio();
    if (!cuerpo.ok) {
      return res.status(cuerpo.status).json({
        ok: false, origen: "repositorio", archivo: ARCHIVO_REPOSITORIO,
        error: cuerpo.error, ...(cuerpo.pista ? { pista: cuerpo.pista } : {}),
      });
    }
  } else {
    cuerpo = await leerCuerpo(req, { maxBytes: MAX_BYTES, que: "contratos" });
    if (!cuerpo.ok) {
      const salida = { ok: false, origen: "cuerpo", error: cuerpo.error };
      if (cuerpo.max_mb) salida.max_mb = cuerpo.max_mb;
      return res.status(cuerpo.status).json(salida);
    }
  }
  const origen = desdeRepositorio ? "repositorio" : "cuerpo";

  const v = validarContratos(cuerpo.datos);
  if (!v.ok) {
    return res.status(400).json({
      ok: false,
      origen,
      ...(desdeRepositorio ? { archivo: ARCHIVO_REPOSITORIO } : {}),
      error: `El archivo tiene ${v.errores.length} error${v.errores.length === 1 ? "" : "es"} de validación: no se guardó nada.`,
      errores: v.errores,
      limites: { max_contratos: MAX_CONTRATOS, max_caracteres_objeto: MAX_OBJETO },
      /* Un 400 del repositorio NO es culpa de quien pulsó el botón: significa
         que el archivo versionado dejó de pasar su propio validador. Decirlo
         evita que el dueño se quede intentando arreglar «su» JSON. */
      ...(desdeRepositorio
        ? { nota: `«${ARCHIVO_REPOSITORIO}» del repositorio no pasa la validación. Es un defecto del archivo versionado, no de su envío.` }
        : {}),
    });
  }

  let guardado = null;
  try {
    guardado = await guardarExperiencia(redis, v.contratos);
  } catch (e) {
    return res.status(503).json({
      ok: false, origen, ...(desdeRepositorio ? { archivo: ARCHIVO_REPOSITORIO } : {}),
      error: `No se pudo guardar. Reintente. (${e.message})`,
    });
  }

  /* la auditoría de cobertura se calcula con ESTE vocabulario: dejar viva su
     caché enseñaría durante una hora los huecos de la experiencia anterior */
  let cacheBorrada = 0;
  try {
    const viejas = await redis.scan(CLAVES.patronCobertura);
    if (viejas.length) {
      await redis.del(...viejas);
      cacheBorrada = viejas.length;
    }
  } catch { /* la caché caduca sola en una hora: no vale un 500 */ }

  return res.status(200).json({
    ok: true,
    origen,
    ...(desdeRepositorio ? { archivo: ARCHIVO_REPOSITORIO } : {}),
    contratos_cargados: v.contratos.length,
    terminos_extraidos: guardado.vocabulario.total_terminos,
    ejemplos_terminos: guardado.vocabulario.ejemplos,
    version: guardado.version,
    cargado: guardado.cargado,
    cache_cobertura_invalidada: cacheBorrada,
    nota: desdeRepositorio
      ? `Experiencia cargada desde «${ARCHIVO_REPOSITORIO}» del repositorio. Ejecute la auditoría de cobertura para ver qué códigos le faltan basados en su experiencia real.`
      : "Experiencia cargada. Ejecute la auditoría de cobertura para ver qué códigos le faltan basados en su experiencia real.",
  });
};
