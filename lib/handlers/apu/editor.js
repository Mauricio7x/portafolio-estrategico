/* ============================================================================
   /api/apu/[accion] · Editor de APU: catálogo, inferencia, cálculo y borradores
   ----------------------------------------------------------------------------
     GET  /api/apu/catalogo    ítems + insumos + regiones  (PÚBLICO)
       …?insumo=cemento_gris_50kg   los precios de UN insumo
       …?region=costa_atlantica     los factores de UNA región
       …?bloque=items|insumos|regiones
     POST /api/apu/inferir     objeto del proceso → tipología + ítems sugeridos
     POST /api/apu/calcular    presupuesto completo con desglose por ítem
     POST /api/apu/rentabilidad  margen, caja, VEG, payback **y el OPTIMIZADOR
                               DE PRECIO**: el precio que maximiza el valor
                               esperado, con la curva entera para graficar
     POST /api/apu/guardar     guarda el borrador (TTL 30 días)
     GET  /api/apu/cargar?id=  recupera un borrador
     GET  /api/apu/listar      borradores vigentes del perfil
     GET/POST /api/apu?op=ia   precios buscados por una SESIÓN de Claude Code
                               (lib/apu/precios_ia, 4-sep-2026): POST {solicitar}
                               encola el borrador; GET &pendientes=1 lista la
                               cola; GET &expediente=1&id= da el expediente a la
                               sesión; POST {motor:"sesion", propuesta} la
                               verifica y la guarda; GET &id= da el estado y la
                               propuesta para pintarla.

   POR QUÉ UNA SOLA FUNCIÓN Y NO SEIS ARCHIVOS
   -------------------------------------------
   El plan Hobby de Vercel admite **12 Serverless Functions por despliegue** y
   el repositorio ya está en 12. Un archivo más y falla el despliegue ENTERO, no
   el endpoint nuevo. Una ruta DINÁMICA (`[accion].js`) cuenta como UNA sola y
   conserva exactamente las URL de todas las acciones, sin reescrituras en
   `vercel.json`.

   `/api/apu/catalogo` vivía en su propio archivo y se plegó aquí por eso mismo.
   **Su contrato no cambia**: misma URL, mismos parámetros, mismas respuestas y
   —lo importante— sigue siendo PÚBLICO.

   `accion` se lee de `req.query` (que es de donde la saca Vercel) Y, si falta,
   del PATH. Lo segundo no es adorno: la suite de pruebas invoca los handlers
   directamente y no hay enrutador que rellene el parámetro. Un handler que solo
   funcione detrás del enrutador es un handler que no se puede probar.

   ── AUTORIZACIÓN: `catalogo` PÚBLICO, el resto con token ──────────────────
   No es una excepción a la regla del proyecto, es la regla. Lo que no sale sin
   llave son las CIFRAS DEL PERFIL —patrimonio, K, CRPC, tope— y lo derivado del
   histórico del dueño. El catálogo son precios de referencia de mercado, los
   mismos que publica cualquier revista de construcción; escribirlos sí exige
   llave (`/api/admin/apu/cargar-catalogo`).

   Las otras cinco acciones sí la exigen: `inferir` y `calcular` son la máquina
   de armar una oferta, y `guardar`/`cargar`/`listar` tocan los borradores de un
   perfil concreto. El gate 231105 de la web es una cortesía del navegador y no
   protege ninguna API.
   ========================================================================== */
"use strict";

const { crearRedis, hayCredenciales } = require("../../redis.js");
const { autorizarToken } = require("../../auth.js");
/* El lector del cuerpo vive en lib/cuerpo: era la MISMA función copiada en tres
   endpoints y ESTA era la copia que había derivado —le faltaba comprobar el tope
   en la rama de cuerpo ya parseado como cadena, así que su límite documentado de
   2 MB no se cumplía por ahí—. Aquí un cuerpo vacío sigue siendo `{}` y no un
   400: varias acciones se disparan con un POST sin cuerpo. */
const { leerCuerpo } = require("../../cuerpo.js");
const { CLAVES, APU_TTL_SEG, PERFIL_DINAMICO_TTL_SEG, escribirJSONComprimido, leerJSONComprimido, descomprimir } = require("../../almacen.js");
/* El perfil se resuelve por la MISMA vía que el listado y el dictamen (alias,
   fijos, rup_… dinámicos y cons_… consorcios): lib/perfil_resolver. Aquí no
   se copia ni la expresión del id ni la lectura de Redis. */
const { validarIdPerfil, cargarPerfilResuelto, perfilesFijos } = require("../../perfil_resolver.js");
const {
  SEMILLA, obtenerCatalogo, obtenerPreciosInsumo, obtenerFactoresRegion,
} = require("../../apu/catalogo.js");
const { inferir } = require("../../apu/inferencia.js");
const { mapearFilasImportadas } = require("../../apu/importar.js");
const { calcularPresupuesto, normalizarCatalogo } = require("../../apu/calculo.js");
/* UMD del navegador, requerido también aquí: `estadoComposicion` y
   `clasificarOrigen` tienen que ser LAS MISMAS en pantalla, en el Excel y en la
   respuesta de la API — el patrón de `lib/costos.js`. */
const APULibro = require("../../../public/apu_libro.js");
const {
  desdePresupuesto, contextoDePresupuesto, ajusteCompetitivo, precioPiso,
} = require("../../apu/rentabilidad.js");
const { optimizarPrecioOferta } = require("../../apu/optimizador.js");
const { pisoTecho } = require("../../apu/piso_techo.js");
const { aplicaContribucion, CONTRIBUCION_PCT } = require("../../ganancia.js");
const { leerIndiceBaja, bajaDeMercado } = require("../../indice_baja.js");
const { leerIndice: leerIndiceComp, competenciaDe } = require("../../indice_competencia.js");
const { estimarPDetalle } = require("../../probabilidad.js");
const {
  departamentosConocidos, departamentosConRegion, meta: metaTipologias,
} = require("../../apu/tipologias.js");
const { normativaAplicada } = require("../../apu/normativa.js");

const MAX_BYTES = 2 * 1024 * 1024;   // 2 MB de cuerpo; el tope de Vercel es 4,5
const MAX_ITEMS = 400;               // un presupuesto de obra menor no pasa de ~150
const MAX_PRESUPUESTOS = 100;        // tope del listado
/* «extraer-texto» y «descargar» son el LECTOR DE PLIEGOS y viven aquí por una
   razón dura, no estética: el plan Hobby de Vercel admite 12 funciones por
   despliegue y con dos ficheros propios eran 14 — el despliegue entero se
   rechazaba. Su lógica está en lib/apu_extraer.js y lib/apu_descargar.js; este
   despachador solo las llama. Las dos son AJENAS al catálogo de precios: no leen
   Redis ni el catálogo, así que se despachan ANTES de tocarlo. */
/* `cotizar` entra aquí y NO como `api/apu/cotizar.js`: el plan Hobby admite 12
   funciones serverless y el repositorio está EXACTAMENTE en 12. Un archivo más
   bajo `api/` no falla el endpoint nuevo — falla el sitio entero. */
const ACCIONES = ["catalogo", "inferir", "calcular", "cotizar", "rentabilidad", "guardar", "cargar", "listar",
  "importar", "extraer-texto", "descargar", "parametros", "ia"];
/* `parametros` es pública en LECTURA (son normas y porcentajes de ley, no cifras
   del perfil: la vista de metodología los enseña a cualquiera) y exige token
   para ESCRIBIR, como el catálogo. Se resuelve por método más abajo. */
/* `inferir` y `calcular` SON PÚBLICAS (ago 2026, decisión del dueño). Ninguna de
   las dos lee las finanzas del perfil ni el histórico: `inferir` clasifica el
   texto de un objeto y `calcular` es aritmética sobre el catálogo, que ya era
   público. Exigir credencial dejaba la parte más útil de Precios tras un muro
   para quien acaba de subir su RUP en la landing.
   CONDICIÓN DEL DUEÑO, cumplida en la respuesta: los precios se declaran DE
   REFERENCIA y se dice DE DÓNDE salen (`fuentes`, con la URL de cada banco
   oficial). Un precio sin su origen no se puede discutir — la misma regla que
   `granularidad_utilizada` en el índice de baja.
   LO QUE NO SE ABRE, y es la diferencia importante: los PRECIOS QUE EL DUEÑO YA
   CORRIGIÓ (`leerPreciosUsuario`). Eso no es «información del APU», es su
   trabajo acumulado —lo único que mejora la aplicación con el uso— y el `perfil`
   viaja en la petición, así que sin esta guarda cualquiera pediría
   `perfil=helder` y se llevaría sus correcciones dentro del costo. Sin token el
   cálculo sale con el catálogo a secas y la respuesta LO DICE. */
const PUBLICAS = ["catalogo", "inferir", "calcular"];

const AVISO = "Precios de REFERENCIA regionalizada, no cotizaciones. Verifique contra cotización real "
  + "antes de presentar oferta. El costo directo NO incluye AIU ni los costos ocultos "
  + "(contribución del 5 %, estampillas, pólizas, financiación).";

const NO_CARGADO = {
  ok: false,
  cargado: false,
  error: "El catálogo APU no está cargado en Redis.",
  siguiente_paso: "Un administrador debe llamar POST /api/admin/apu/cargar-catalogo con el token, "
    + "o pulsar «Cargar catálogo APU» en Mi empresa.",
};

/* El id lo propone el cliente; se sanea aquí porque forma parte de una clave de
   Redis. Sin esto, un id con «:» o «*» podría escribir fuera de su keyspace o
   hacer que el patrón del listado devuelva de más. */
const ID_RE = /^[a-zA-Z0-9_-]{1,48}$/;

function accionDe(req, q) {
  if (q && q.accion) return String(q.accion).toLowerCase();
  const ruta = String((req && req.url) || "").split("?")[0].replace(/\/+$/, "");
  return ruta.slice(ruta.lastIndexOf("/") + 1).toLowerCase();
}

/* ══ EL PERFIL DEL EDITOR SE RESUELVE COMO EN EL LISTADO Y EL DICTAMEN (6-sep-2026) ══
   Hasta hoy `perfilDe` caía a «helder» sin perfil y devolvía null para todo id
   fuera de PERFILES. Medido con el handler real: quien entraba con su RUP
   (rup_…) guardaba sus borradores y sus precios corregidos BAJO EL PERFIL DEL
   DUEÑO (apu:precios:helder contenía el precio tecleado por el visitante, que
   es el nivel 1 de la cascada: «manda sobre todo lo demás»), y si el cliente
   mandaba el perfil correcto, la instancia fría respondía 400 «Perfil
   desconocido» y la caliente 200 según qué handler hubiera inyectado antes el
   perfil — no determinista. Ahora se LLAMA a lib/perfil_resolver
   (validarIdPerfil + cargarPerfilResuelto): la misma regla, por la misma vía,
   releída de Redis en cada petición como manda «Onboarding: RUP en PDF».

   · Las acciones que ESCRIBEN o leen borradores de un perfil (guardar, cargar,
     listar, cotizar, ia) exigen perfil EXPLÍCITO: sin él, 400 que dice qué
     mandar; con forma inválida, 400; caducado, 404 `perfil_caducado` con el
     mensaje de perfil_resolver (la web sabe olvidarlo).
   · EXCEPCIÓN DECLARADA: `calcular` y `rentabilidad` siguen cayendo a «helder»
     sin perfil y no van a Redis por él. No leen las finanzas del perfil
     (`grep -n perfil lib/apu/rentabilidad.js` → vacío): el perfil solo es la
     CLAVE de los precios corregidos, que sin credencial no se leen. Con un id
     de forma inválida se calcula con el catálogo a secas (un valor desconocido
     es inerte, la regla de `?zona=`), como hacía la versión anterior.
   · `fijo` distingue los tres perfiles del dueño de los que pueden desaparecer
     (rup_… caduca a los 45 días; cons_… se borra): sus precios corregidos
     llevan TTL (ver `guardar`). */
const ACCIONES_CON_DEFECTO_HELDER = ["calcular", "rentabilidad"];
const ERROR_SIN_PERFIL = "Falta el perfil con el que está trabajando: elija uno en la barra de Licitaciones "
  + "(o entre con su RUP) y vuelva a intentarlo.";
/* Cómo viaja el perfil va en un campo APARTE del texto de usuario (remate V-B2a-03,
   6-sep-2026): «cuerpo» y «dirección» son la petición HTTP, y quien opera pegando
   URL en Chrome no puede hacer nada con esa frase; quien llama a la API a mano (la
   skill /precios, un curl) la lee aquí. */
const COMO_MANDAR_PERFIL = "«perfil» en el cuerpo JSON de la petición o como ?perfil= en la dirección";
async function resolverPerfil(redis, q, cuerpo, accion) {
  const crudo = String((cuerpo && cuerpo.perfil) || (q && q.perfil) || "").trim();
  const conDefecto = ACCIONES_CON_DEFECTO_HELDER.includes(accion);
  if (!crudo) {
    if (conDefecto) return { ok: true, perfil: "helder", fijo: true };
    return { ok: false, status: 400, error: ERROR_SIN_PERFIL, como_mandar: COMO_MANDAR_PERFIL, perfiles: perfilesFijos() };
  }
  const info = validarIdPerfil(crudo);
  if (!info.ok) return conDefecto ? { ok: true, perfil: null, fijo: true } : info;
  const fijo = !info.dinamico && !info.consorcio;
  if (conDefecto) return { ok: true, perfil: info.perfil, fijo };
  const cargado = await cargarPerfilResuelto(redis, info);
  if (!cargado.ok) return cargado;
  return { ok: true, perfil: info.perfil, fijo };
}

/* El catálogo con el que se calcula: Redis si está cargado, la semilla del
   repositorio si no. La VÍA viaja siempre en la respuesta — un precio sin su
   origen no se puede discutir, que es la misma regla de `granularidad_utilizada`
   del índice de baja. */
async function catalogoParaCalcular(redis) {
  try {
    const c = await obtenerCatalogo(redis);
    if (c && c.cargado) return normalizarCatalogo(c);
  } catch { /* Redis caído: la semilla sirve igual y la respuesta lo dirá */ }
  return null;
}

/* EL PRESUPUESTO SE ARMA UNA SOLA VEZ, PARA LAS DOS ACCIONES (ago 2026).
   `calcular` lo hacía con precios propios y parámetros normativos y
   `rentabilidad` sin ellos, así que el panel Piso/Techo y el optimizador
   decidían sobre un costo directo que NO era el de la pantalla. Medido: un
   presupuesto mixto (3 ítems del catálogo + 3 filas importadas con precio del
   archivo) daba $201.092.650 en «Calcular APU» y $32.712.650 en el panel — el
   veredicto pasaba de «No se presente» a «Preséntese entre $43M y $260M», que
   es la peor forma posible de equivocarse en el único sitio donde se fija un
   precio de oferta. Es `total_procesos`/`procesos_contados` otra vez, en pesos:
   dos cálculos «equivalentes» divergen a la primera diferencia de entrada. */
async function presupuestoDe(redis, datos, perfil, { conCredencial = true } = {}) {
  const catalogo = await catalogoParaCalcular(redis);
  /* Los precios que este contratista ya corrigió. Se leen AQUÍ y no dentro del
     motor: el motor es aritmética pura y no toca la red.
     SIN CREDENCIAL NO SE LEEN: `perfil` llega en la petición, así que con
     `calcular` abierto cualquiera pediría `perfil=helder` y sus correcciones
     entrarían en el costo devuelto. El cálculo sale igual —con el catálogo, que
     es público— y `precios_propios` lo declara: quien vea otro número tiene que
     poder saber por qué. */
  const px = conCredencial
    ? await require("../../apu/precios.js").leerPreciosUsuario(redis, perfil)
    : { mapa: {}, sin_credencial: true };
  /* Los parámetros normativos (jornada, EPP): con Redis caído sirven los
     DEFAULTS y la respuesta lo declara en `parametros_costo.fuente`. */
  const par = await parametrosParaMotor(redis);
  const presupuesto = calcularPresupuesto({
    preciosUsuario: px.mapa,
    items: Array.isArray(datos.items) ? datos.items : [],
    departamento: String(datos.departamento || ""),
    config: datos.config || {},
    catalogo,
    parametros: par,
  });
  return { presupuesto, catalogo, px, par };
}

/* ══════════════════ parámetros normativos (Fase 1) ══════════════════ */
async function parametrosParaMotor(redis) {
  const P = require("../../parametros.js");
  const l = await P.leer(redis);
  return { ...P.paraMotor(l.parametros), fuente: l.fuente, error: l.error || null };
}

async function parametrosHandler(req, res, q, metodo) {
  const P = require("../../parametros.js");
  const C = require("../../costos.js");
  if (!hayCredenciales()) {
    if (metodo === "POST") return res.status(503).json({ ok: false, error: "Faltan credenciales de Upstash Redis en el despliegue." });
    // sin Redis la lectura sirve los defaults y LO DICE
    return res.status(200).json(respuestaParametros(P, C, { parametros: P.DEFAULTS, fuente: "defaults", error: "sin credenciales de Redis" }, null));
  }
  const redis = crearRedis({});
  if (metodo === "POST") {
    const cuerpo = await leerCuerpo(req, { maxBytes: MAX_BYTES });
    if (!cuerpo.ok) return res.status(cuerpo.status).json({ ok: false, error: cuerpo.error });
    const datos = cuerpo.datos || {};
    const entrada = datos.parametros && typeof datos.parametros === "object" ? datos.parametros : datos;
    let g;
    try { g = await P.guardar(redis, entrada); } catch (e) {
      return res.status(502).json({ ok: false, error: `No se pudieron guardar los parámetros: ${e.message}` });
    }
    if (!g.ok) return res.status(400).json({ ok: false, error: "Parámetros inválidos.", errores: g.errores });
    return res.status(200).json({ ok: true, guardado: true, version: g.version, guardado_el: g.guardado_el,
      ...respuestaParametros(P, C, { parametros: g.parametros, fuente: "redis", error: null }, null) });
  }
  const l = await P.leer(redis);
  const hist = q.historial ? await P.historial(redis) : null;
  return res.status(200).json(respuestaParametros(P, C, l, hist));
}

/* La respuesta lleva, además de los valores, (1) el estado de verificación de
   cada parámetro, (2) lo que el motor deriva de ellos y (3) un ejemplo
   calculado con las MISMAS funciones que usa la pantalla (lib/costos.js): el
   costo-hora de un trabajador con salario mínimo, con y sin exoneración. Es
   la vista pública de la metodología (§6.1.4): quien reciba una objeción de
   un evaluador tiene con qué responder. */
function respuestaParametros(P, C, lectura, historial) {
  const p = lectura.parametros;
  let ejemplo = null;
  try {
    ejemplo = {
      salario: p.smmlv,
      con_exoneracion: C.explicarCostoHora({ ...p, exoneracionParafiscales: true }, p.smmlv),
      sin_exoneracion: C.explicarCostoHora({ ...p, exoneracionParafiscales: false }, p.smmlv),
      horas_dia: Math.round(C.horasDia(p) * 100) / 100,
    };
  } catch (e) { ejemplo = { error: e.message }; }
  return {
    ok: true,
    fuente: lectura.fuente,                 // "redis" | "defaults"
    guardado_el: lectura.guardado_el || null,
    aviso: lectura.error || null,
    parametros: p,
    verificacion: P.VERIFICACION,
    motor: P.paraMotor(p),
    ejemplo,
    historial: historial ? historial.versiones : undefined,
    como_leerlo: {
      motor: "El catálogo cotiza la mano de obra POR DÍA (jornales calibrados con un contrato adjudicado) y no divide "
        + "por ninguna jornada. La Ley 2101 entra como `factor_jornada` = horas de calibración ÷ horas vigentes sobre "
        + "los días de mano de obra por unidad; el EPP como % de la mano de obra.",
      verificacion: "«verificado» = contrastado con la norma o con la fuente primaria (Base de Precios del IDU, APU "
        + "Regionalizados del INVIAS, contraste del 16-ago-2026); «referencia» = metodología sectorial de fuentes "
        + "secundarias que NO aparece en esas fuentes primarias (TPNL, MVP, EPP); «supuesto» = decisión declarada.",
      exoneracion: "El E.T. art. 114-1 exonera de salud patronal, SENA e ICBF a las personas jurídicas y a las "
        + "naturales con dos o más trabajadores, para salarios inferiores a 10 salarios mínimos. Una persona natural "
        + "con un solo empleado NO está cobijada: desactive la casilla.",
    },
  };
}

/* La cascada de precios (lib/apu/precios) sobre una lista de ítems, con los
   precios propios del perfil y los parámetros del motor. UNA definición para
   `cotizar` y para el expediente de `ia`: dos unitarios distintos del mismo
   ítem es el defecto que este proyecto ya pagó. */
async function cotizacionDe(redis, perfil, items, departamento) {
  const precios = require("../../apu/precios.js");
  const { regionDeDepartamento } = require("../../apu/tipologias.js");
  let cat = null;
  try { cat = normalizarCatalogo(await obtenerCatalogo(redis)); } catch { /* la semilla responde igual */ }
  const reg = regionDeDepartamento(String(departamento || ""));
  const regionId = reg.estado === "mapeado" ? reg.region : null;
  const { mapa, ilegibles, error } = await precios.leerPreciosUsuario(redis, perfil);
  const par = await parametrosParaMotor(redis);
  const r = precios.cotizar({
    items, catalogo: cat, region: regionId, preciosUsuario: mapa,
    opcionesCosto: { factor_jornada: par.factor_jornada, epp_pct: par.epp_pct },
    // el APU de referencia INVIAS se resuelve por DEPARTAMENTO, no por región del catálogo
    departamento: String(departamento || "") || null,
  });
  return { r, reg, mapa, ilegibles, error, par };
}

module.exports = async function handler(req, res) {
  const q = req.query || {};
  const accion = accionDe(req, q);

  if (!ACCIONES.includes(accion)) {
    res.setHeader("Cache-Control", "no-store");
    return res.status(404).json({ ok: false, error: `Acción «${accion}» desconocida.`, acciones: ACCIONES });
  }

  /* El lector de pliegos se despacha aquí, antes de cualquier cosa del catálogo:
     no toca Redis, no necesita el catálogo de precios y trae su propia
     autorización (el mismo HISTORICO_TOKEN, vía lib/auth). */
  if (accion === "extraer-texto") return require("../../apu_extraer.js")(req, res);
  if (accion === "descargar") return require("../../apu_descargar.js")(req, res);

  const metodoCrudo = String(req.method || "GET").toUpperCase();
  const publica = PUBLICAS.includes(accion) || (accion === "parametros" && metodoCrudo === "GET");
  if (accion === "parametros") {
    // los parámetros se editan y el efecto tiene que ser inmediato: sin caché
    res.setHeader("Cache-Control", "no-store");
    if (metodoCrudo === "POST") {
      const permiso = autorizarToken(req, q);
      if (!permiso.ok) {
        return res.status(permiso.status).json({ ok: false, error: permiso.error, como_autenticar: permiso.como_autenticar });
      }
    } else if (metodoCrudo !== "GET") {
      res.setHeader("Allow", "GET, POST");
      return res.status(405).json({ ok: false, error: "«parametros» se lee por GET y se guarda por POST." });
    }
    return parametrosHandler(req, res, q, metodoCrudo);
  }
  /* TOKEN OPCIONAL en las acciones públicas que pueden aprovecharlo. Es la MISMA
     regla que `/api/oportunidades`, y por los mismos motivos:
     · ausente        → modo público: el catálogo a secas, sin los precios que el
                        dueño ya corrigió, y la respuesta lo declara.
     · presente y OK  → además sus precios propios.
     · presente y MAL → 401, JAMÁS degradación silenciosa: quien se molestó en
                        mandarlo tiene que enterarse de que está mal.
     `catalogo` no lo necesita (no hay nada que enriquecer), pero pasar por aquí
     no le cuesta nada y evita una segunda regla de autorización. */
  let conCredencial = false;
  if (publica) {
    const hayToken = !!((req && req.headers && req.headers["x-historico-token"]) || q.token);
    if (hayToken) {
      const permiso = autorizarToken(req, q);
      if (!permiso.ok) {
        return res.status(permiso.status).json({
          ok: false, error: permiso.error, como_autenticar: permiso.como_autenticar,
        });
      }
      conCredencial = true;
      // con credencial la respuesta lleva datos del perfil: no se cachea
      res.setHeader("Cache-Control", "no-store");
    } else {
      // el catálogo solo cambia cuando alguien lo recarga: cachear es correcto
      res.setHeader("Cache-Control", "public, max-age=300, stale-while-revalidate=3600");
    }
  } else {
    res.setHeader("Cache-Control", "no-store");
    const permiso = autorizarToken(req, q);
    if (!permiso.ok) {
      return res.status(permiso.status).json({
        ok: false, error: permiso.error, como_autenticar: permiso.como_autenticar,
      });
    }
    conCredencial = true;
  }

  const metodo = String(req.method || "GET").toUpperCase();
  // `cotizar` recibe la lista de ítems en el cuerpo: una lista de 300 ítems no
  // cabe en una query, y además leería el perfil desde la URL
  const esPost = ["inferir", "calcular", "cotizar", "rentabilidad", "guardar", "importar"].includes(accion)
    || (accion === "ia" && metodo === "POST");   // «ia» se lee por GET y se escribe por POST
  if (esPost && metodo !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ ok: false, error: `«${accion}» exige POST.` });
  }
  if (!esPost && metodo !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ ok: false, error: `«${accion}» exige GET.` });
  }

  if (!hayCredenciales()) {
    return res.status(503).json({ ok: false, error: "Faltan credenciales de Upstash Redis en el despliegue." });
  }
  const redis = crearRedis({});

  const cuerpo = esPost ? await leerCuerpo(req, { maxBytes: MAX_BYTES }) : { ok: true, datos: {} };
  if (!cuerpo.ok) return res.status(cuerpo.status).json({ ok: false, error: cuerpo.error });
  const datos = cuerpo.datos || {};

  /* ══════════════════ catálogo (PÚBLICO) ══════════════════
     Mismo contrato que tenía en su archivo propio: los tres cortes por
     parámetro y el catálogo entero. Un 503 con `siguiente_paso` cuando no está
     cargado, nunca un 200 con listas vacías — un `[]` afirmaría «no hay
     insumos», que es distinto de «no lo he cargado». */
  if (accion === "catalogo") {
    try {
      if (q.insumo) {
        const i = await obtenerPreciosInsumo(redis, q.insumo);
        if (!i) {
          return res.status(404).json({
            ok: false,
            error: `No existe el insumo «${q.insumo}» en el catálogo cargado.`,
            nota: "Consulte GET /api/apu/catalogo?bloque=insumos para ver los identificadores disponibles.",
          });
        }
        return res.status(200).json({ ok: true, insumo: i, aviso: AVISO });
      }

      if (q.region) {
        const r = await obtenerFactoresRegion(redis, q.region);
        if (!r) {
          return res.status(404).json({
            ok: false,
            error: `No existe la región «${q.region}» en el catálogo cargado.`,
            nota: "Consulte GET /api/apu/catalogo?bloque=regiones para ver las regiones disponibles.",
          });
        }
        return res.status(200).json({ ok: true, region: r, aviso: AVISO });
      }

      const cat = await obtenerCatalogo(redis);
      if (!cat || !cat.cargado) return res.status(503).json(NO_CARGADO);

      /* LA META DEL CATÁLOGO VIAJA CON LOS PRECIOS (6-sep-2026, M-DGF-15). El
         panel «Catálogo de precios de referencia» pinta los tres conteos, la
         base de precios y el reajuste del DANE desde ESTA respuesta, y solo
         recibía `version` y `generado`: enseñaba «—» en los conteos y «sin
         ajuste sectorial» —una afirmación falsa con maquetación creíble—
         mientras el fuente parecía decir «ICOCIV Marzo 2026». Son datos del
         catálogo, no cifras del perfil: no hay nada que redactar. Sin meta
         (lectura por hashes de una carga vieja) viaja null, jamás 0. */
      const m = cat.meta || {};
      const entero = (v) => (Number.isInteger(v) ? v : null);
      const base = {
        ok: true, cargado: true, via: cat.via,
        version: m.version ?? null,
        generado: m.generado ?? null,
        version_catalogo: m.version_catalogo ?? null,
        cargado_el: m.cargado_el ?? null,
        base_precios: m.base_precios ?? null,
        icociv: m.icociv ?? null,
        totales: { insumos: entero(m.insumos), items: entero(m.items), regiones: entero(m.regiones) },
        aviso: AVISO,
        // la procedencia viaja CON los precios, no en otra petición
        fuentes: require("../../apu/fuentes.js").fuentes(),
      };
      const bloque = String(q.bloque || "").toLowerCase();
      if (bloque === "items") return res.status(200).json({ ...base, items: cat.items });
      if (bloque === "insumos") return res.status(200).json({ ...base, insumos: cat.insumos });
      if (bloque === "regiones") return res.status(200).json({ ...base, regiones: cat.regiones });

      const InviasItems = require("../../apu/invias_items.js");
      return res.status(200).json({
        ...base,
        regiones: cat.regiones, insumos: cat.insumos, items: cat.items,
        /* Los 526 APU de referencia del INVIAS con la forma de un ítem del
           catálogo (ago 2026): el buscador del editor los ofrece junto a los del
           catálogo y `calcular` los costea con el costo directo oficial del
           departamento. Van en un campo APARTE —`items` sigue siendo el catálogo
           de precios— y el navegador los junta para buscar. */
        items_invias: InviasItems.comoItemsDeCatalogo(),
        invias_apu: InviasItems.meta(),
        // …los 440 APU de EPC (acueducto y alcantarillado de Cundinamarca),
        // que traen composición como los del INVIAS, y…
        items_epc: require("../../apu/epc_items.js").comoItemsDeCatalogo(),
        epc_apu: require("../../apu/epc_items.js").meta(),
        // …los 3 172 precios de referencia del IDU (Bogotá), mismo criterio…
        items_idu: require("../../apu/idu_items.js").comoItemsDeCatalogo(),
        idu_apu: require("../../apu/idu_items.js").meta(),
        // …y los 1 042 precios TOPE de edificación del FFIE, que son los únicos
        // con cobertura de los 33 departamentos
        items_ffie: require("../../apu/ffie_items.js").comoItemsDeCatalogo(),
        ffie_apu: require("../../apu/ffie_items.js").meta(),
        // …y los 1 234 del ICCU (Cundinamarca), los más granulares: por municipio
        items_iccu: require("../../apu/iccu_items.js").comoItemsDeCatalogo(),
        iccu_apu: require("../../apu/iccu_items.js").meta(),
        // lo que el editor necesita además del catálogo de precios y que no
        // vive en Redis: el vocabulario de tipologías y el mapa de departamentos
        tipologias: metaTipologias().tipologias_n,
        departamentos: departamentosConocidos(),
        departamentos_con_region: departamentosConRegion(),
        /* La NORMATIVA que hay detrás de los factores (ago 2026). Viaja con el
           catálogo y no en una acción propia: es la explicación de unos números
           que ya van en esta respuesta, y son 12 funciones el tope del plan
           Hobby. El factor que se APLICA lo sigue poniendo el catálogo; este
           bloque solo lo desglosa y cita su norma — `lib/apu/normativa` recibe
           el catálogo, no lo importa, para no volverse una segunda fuente. */
        normativa: normativaAplicada(cat, cat.meta ? cat.meta.region_base : null),
      });
    } catch (e) {
      return res.status(503).json({ ok: false, error: `No se pudo leer el catálogo: ${e.message}` });
    }
  }

  /* ══════════════════ inferir (objeto → ítems) ══════════════════ */
  if (accion === "inferir") {
    const objeto = String(datos.objeto || datos.descripcion || "");
    const r = inferir(objeto, { codigos_unspsc: String(datos.codigos_unspsc || "") });

    // los códigos que devuelve la inferencia se enriquecen con el catálogo:
    // `lib/apu/inferencia` es hoja y no puede leer precios por su cuenta
    const cat = (await catalogoParaCalcular(redis)) || SEMILLA;
    const items = (r.items || []).map((codigo) => {
      const def = (cat.items || []).find((i) => String(i.codigo) === String(codigo)) || null;
      return {
        codigo,
        descripcion: def ? def.descripcion : null,
        unidad: def ? def.unidad : null,
        en_catalogo: !!def,
        cantidad: null,
      };
    });

    return res.status(200).json({ ...r, ok: true, items });
  }

  /* ══════════════════ importar (filas de un Excel → ítems mapeados) ═══════
     El archivo se parsea en el NAVEGADOR (public/xlsx_lectura.js): aquí llegan
     filas estructuradas {descripcion, unidad, cantidad, precio_archivo}. Este
     paso solo MAPEA contra el catálogo de precios y resuelve la política de
     precios (el del archivo manda y se declara); el cálculo lo dispara después
     el editor por el MISMO camino de siempre (`calcular`) — dos rutas de
     cálculo se desincronizan a la primera corrección que se aplique a una. */
  if (accion === "importar") {
    const filas = Array.isArray(datos.filas) ? datos.filas : [];
    if (!filas.length) {
      return res.status(400).json({ ok: false, error: "El cuerpo debe traer «filas»: [{descripcion, unidad, cantidad, precio_archivo?}]." });
    }
    if (filas.length > MAX_ITEMS) {
      return res.status(400).json({ ok: false, error: `Demasiadas filas (${filas.length}). El tope es ${MAX_ITEMS}.` });
    }
    try {
      const deRedis = await catalogoParaCalcular(redis);
      const cat = deRedis || SEMILLA;
      /* `departamento` afina el precio de tienda de cada fila a su capital
         (Homecenter regionaliza); sin él la referencia sale de Bogotá y lo
         declara en su `ambito` — jamás disfrazada de precio local. */
      const r = mapearFilasImportadas(filas, cat, { departamento: datos.departamento || null });
      return res.status(200).json({
        ok: true,
        ...r,
        catalogo: {
          fuente: deRedis ? "redis" : "semilla",
          items_en_catalogo: (cat.items || []).length,
        },
      });
    } catch (e) {
      return res.status(500).json({ ok: false, error: `No se pudo mapear: ${e.message}` });
    }
  }

  /* El PERFIL se resuelve aquí, ANTES del despacho de acciones. Vivía en el
     bloque de borradores —o sea DESPUÉS de `calcular`—, así que consultarlo
     desde el cálculo caía en la zona muerta temporal del `const` y devolvía un
     500 opaco. Es la lección de R4 («el arranque va AL FINAL») aplicada al
     revés: lo que TODOS necesitan va arriba. */
  /* La cola que atiende la sesión de Claude Code (`ia&pendientes=1`) es de TODOS
     los perfiles por diseño («Tercera pasada del 4-sep-2026»): no pide perfil y
     por eso se despacha ANTES de resolverlo — la skill /precios la llama sin él. */
  if (accion === "ia" && metodo === "GET" && String(q.pendientes || "") === "1") {
    let claves = [];
    try { claves = await redis.scan(CLAVES.patronApuIaSolicitudes); }
    catch (e) { return res.status(503).json({ ok: false, error: `No se pudo listar la cola: ${e.message}` }); }
    const solicitudes = [];
    for (let i = 0; i < claves.length; i += 8) {
      const lote = claves.slice(i, i + 8);
      let valores = [];
      try { valores = await redis.mget(lote); } catch { continue; }
      for (const v of valores) { const s = v == null ? null : descomprimir(v); if (s && s.id) solicitudes.push(s); }
    }
    solicitudes.sort((a, b) => String(a.solicitado_el).localeCompare(String(b.solicitado_el)));
    return res.status(200).json({ ok: true, total: solicitudes.length, en_cola: solicitudes.filter((s) => s.estado === "en_cola").length, solicitudes,
      como_atender: "Por cada solicitud «en_cola»: GET /api/apu?op=ia&expediente=1&perfil=<perfil>&id=<id>, buscar los precios y devolverlos con POST {perfil, id, motor:\"sesion\", propuesta}." });
  }

  let perfil = null, perfilFijo = true;
  {
    let r;
    /* un Redis caído en instancia fría NO es un perfil caducado (lib/perfil_dinamico
       propaga el error a propósito): se responde 502, no 404 */
    try { r = await resolverPerfil(redis, q, datos, accion); }
    catch (e) { return res.status(502).json({ ok: false, error: `No se pudo comprobar el perfil. Reintente. (${e.message})` }); }
    if (!r.ok) {
      return res.status(r.status).json({ ok: false, error: r.error, perfil_caducado: !!r.perfil_caducado, ...(r.como_mandar ? { como_mandar: r.como_mandar } : {}), ...(r.perfiles ? { perfiles: r.perfiles } : {}) });
    }
    perfil = r.perfil; perfilFijo = r.fijo !== false;
  }

  /* ══════════════════ calcular ══════════════════ */
  if (accion === "calcular") {
    const items = Array.isArray(datos.items) ? datos.items : [];
    if (items.length > MAX_ITEMS) {
      return res.status(400).json({ ok: false, error: `Demasiados ítems (${items.length}). El tope es ${MAX_ITEMS}.` });
    }
    try {
      /* El MISMO constructor que usa `rentabilidad` (ver `presupuestoDe`): si
         Redis falla, el cálculo sale igual con el catálogo — quedarse sin
         precios propios en SILENCIO haría que el usuario viera otro número sin
         saber por qué, así que la respuesta lo declara en `precios_propios`. */
      const { presupuesto: r, catalogo } = await presupuestoDe(redis, datos, perfil, { conCredencial });
      /* La normativa viaja con el cálculo y para la región QUE SE USÓ, no para
         la región base. Hoy las cinco regiones comparten el mismo factor
         prestacional y la diferencia no se nota; el día que se regionalicen, un
         panel cableado a la base diría «55 %» mientras el motor aplicó otro —
         dos payloads con nombres parecidos y cifras distintas, que es el
         defecto `total_procesos`/`procesos_contados` otra vez. */
      const region = (r.ajuste_regional && r.ajuste_regional.region_utilizada) || null;
      /* DE DÓNDE SALE CADA PRECIO, con su URL y su vigencia. Es la condición con
         la que se abrió esta acción sin credencial: los precios son DE
         REFERENCIA y hay que poder ver la página de la que salieron. Se arma
         desde el `meta()` de cada banco (`lib/apu/fuentes`), nunca con una lista
         de enlaces transcrita, que se desincronizaría al re-capturar una
         vigencia y acabaría citando un documento que no es el que se usó.
         `precios_propios_aplicados` distingue las dos formas del cálculo: sin
         token sale del catálogo a secas, y quien vea otro número tiene que poder
         saber por qué. */
      return res.status(200).json({
        ...r,
        normativa: normativaAplicada(catalogo, region),
        fuentes: require("../../apu/fuentes.js").fuentes(),
        precios_propios_aplicados: conCredencial,
        /* ¿QUÉ ÍTEMS PUEDEN LLEVAR HOJA DE APU? Un pliego exige el anexo
           DESGLOSADO, y medido sobre los seis orígenes solo 1.134 de 6.588
           ítems (17,2 %) pueden producirlo: IDU, FFIE e ICCU publican precio
           total sin composición. Se presupuesta igual —el precio es bueno, lo
           que falta es el desglose— pero hay que decirlo ANTES de exportar, no
           después: quien entrega una oferta sin el anexo que el pliego exige se
           entera en la evaluación.
           Se DERIVA de los campos que el propio cálculo ya publica, con la
           función que comparten pantalla y Excel (`public/apu_libro.js`), no
           con una segunda cuenta. */
        composicion: APULibro.resumenComposicion(r.items),
      });
    } catch (e) {
      return res.status(500).json({ ok: false, error: `No se pudo calcular: ${e.message}` });
    }
  }

  /* ══════════════════ rentabilidad ══════════════════
     Lo que `calcular` NO responde: cuánto vale la oportunidad y si la empresa
     puede ejecutarla. Va aparte y no dentro de `calcular` porque necesita
     RED —el índice de baja y el de competencia— mientras que `calcular` es
     aritmética pura: fundirlas obligaría a pagar dos lecturas de Redis en cada
     tecla del editor.

     EL PUENTE DEL NIT Y SU LÍMITE. El encargo pide que `entidad_nit` dispare la
     consulta del índice de baja, pero ese índice está indexado por NOMBRE
     canónico: la propia Colombia Compra Eficiente advierte que las entidades
     COMPARTEN NIT entre dependencias. Cuando solo llega el NIT se intenta
     resolver el nombre por el alias del índice de competencia, que únicamente
     publica alias para NITs NO ambiguos. Si el NIT está compartido no hay
     alias, no hay puente y sale `sin_dato` — que es la respuesta correcta:
     devolver la baja de la entidad hermana es el defecto que se corrigió en
     ago 2026. */
  if (accion === "rentabilidad") {
    const items = Array.isArray(datos.items) ? datos.items : [];
    if (items.length > MAX_ITEMS) {
      return res.status(400).json({ ok: false, error: `Demasiados ítems (${items.length}). El tope es ${MAX_ITEMS}.` });
    }
    let presupuesto;
    try {
      /* EL MISMO presupuesto que sirve `calcular` (precios propios y parámetros
         normativos incluidos). Ver `presupuestoDe`: calcularlo aquí con otra
         entrada ponía a decidir al panel Piso/Techo y al optimizador sobre un
         costo directo que no era el de la pantalla. */
      ({ presupuesto } = await presupuestoDe(redis, datos, perfil, { conCredencial }));
    } catch (e) {
      return res.status(500).json({ ok: false, error: `No se pudo calcular: ${e.message}` });
    }

    const lic = {
      entidad: String(datos.entidad || "").trim(),
      nit_entidad: String(datos.entidad_nit || "").replace(/\D/g, ""),
      departamento_entidad: String(datos.departamento || ""),
      codigo_principal_de_categoria: String(datos.unspsc || ""),
      /* La MODALIDAD viaja hasta aquí a propósito (ago 2026). Desde que el
         índice de baja se abre por modalidad, `bajaDeMercado` la lee del propio
         proceso: si este `lic` sintético no la trajera, /api/apu/rentabilidad
         respondería con la baja MEZCLADA de la entidad mientras
         /api/oportunidades responde con la de licitación pública para EL MISMO
         proceso — dos cifras distintas del mismo hecho, que es justo lo que la
         normalización del multiplicador existe para evitar. Sin ella (llamada a
         mano, sin el enlace del panel) se degrada a la mezclada, que es el
         comportamiento anterior. */
      modalidad_de_contratacion: String(datos.modalidad || "").trim(),
    };
    let baja = null, competencia = null, pBase = null, nombrePorNit = null;
    let mercado = { disponible: false, motivo: "sin credenciales de Redis" };
    if (redis) {
      try {
        const [iBaja, iComp] = await Promise.all([leerIndiceBaja(redis), leerIndiceComp(redis)]);
        if (!lic.entidad && lic.nit_entidad) {
          const alias = iComp[`nit:${lic.nit_entidad}`];
          const reg = alias && alias.ref ? iComp[alias.ref] : alias;
          if (reg && reg.nombre) { nombrePorNit = reg.nombre; lic.entidad = reg.nombre; }
        }
        baja = bajaDeMercado(iBaja, lic);
        competencia = competenciaDe(iComp, lic);
        pBase = estimarPDetalle(lic, { competencia, baja });
        mercado = {
          disponible: true, entidad_consultada: lic.entidad || null,
          nombre_resuelto_por_nit: nombrePorNit,
          nit_sin_puente: !!(lic.nit_entidad && !lic.entidad),
        };
      } catch (e) { mercado = { disponible: false, motivo: `Redis: ${e.message}` }; }
    }

    const cuantia = Number(datos.cuantia);
    const r = desdePresupuesto(presupuesto, {
      presupuesto_oficial: Number.isFinite(cuantia) && cuantia > 0 ? cuantia : null,
      plazo_meses: Number(datos.plazo_meses) || 12,
      dso_dias: Number(datos.dso_dias) || undefined,
      /* A5 (ago 2026): el editor consume `p_sin_precio`, NO `p`. `p` del
         listado ya lleva el factor de precio (neutro sin baja máxima
         declarada, pero factor al fin), y aquí `pGanarPorPrecio` vuelve a
         modular por el precio que el dueño está ofertando de verdad: con `p`
         el precio se cobraría DOS VECES (docs/PROBABILIDAD_MEJORADA.md §2.5c). */
      p_base: pBase ? pBase.p_sin_precio : null,
      competencia, baja,
    });
    const oferentes = competencia && competencia.nivel !== "sin_dato" ? competencia.promedio_oferentes : null;
    const piso = precioPiso({
      costo_directo: presupuesto.resumen.costo_directo_total,
      administracion_pct: presupuesto.configuracion.aiu_pct,
      imprevistos_pct: presupuesto.configuracion.imprevistos_pct,
      tau_ingreso_pct: r.costos.impuestos && presupuesto.resumen.precio_final
        ? Math.round(r.costos.impuestos * 1000 / presupuesto.resumen.precio_final) / 10 : 0,
      garantias: r.costos.garantias, costo_financiero: r.costos.financiero,
      oferentes, presupuesto_oficial: Number.isFinite(cuantia) && cuantia > 0 ? cuantia : null,
    });

    /* ── OPTIMIZADOR DE PRECIO ──────────────────────────────────────────
       El paso que faltaba: hasta aquí la app publicaba los datos (baja mediana,
       competencia, probabilidad, margen) y el contratista decidía a ojo cuánto
       descontar. Esto barre el rango de bajas plausibles y devuelve el precio
       que MAXIMIZA el valor esperado de la ganancia, con la curva entera para
       que la recomendación se pueda discutir en vez de creer.

       Va DENTRO de esta acción y no en una nueva: el plan Hobby de Vercel
       admite 12 funciones y el repositorio está exactamente en 12 (hay prueba
       que las cuenta). Además aquí ya están leídos el índice de baja, el de
       competencia y la `p` del proceso: en su propia acción habría que pagar
       otra vez esas dos lecturas de Redis para responder lo mismo.

       El contexto sale de `contextoDePresupuesto`, la MISMA traducción que usa
       `desdePresupuesto` para el bloque de rentabilidad de arriba. Copiarla
       aquí habría creado dos estructuras fiscales del mismo presupuesto, y la
       recomendación de precio se calcularía con una y el margen que se enseña
       al lado con la otra.

       `id_proceso` viaja y se devuelve, pero NO condiciona el cálculo: es una
       etiqueta. Lo que hace falta de verdad es la cuantía, el costo directo y
       un centro de mercado, y esconder la respuesta a quien escribió la cuantía
       pero no el id sería negarle el dato por no haber rellenado un rótulo. */
    const ctxPres = contextoDePresupuesto(presupuesto);
    const opt = datos.optimizador && typeof datos.optimizador === "object" ? datos.optimizador : {};
    const optimizador = optimizarPrecioOferta(
      {
        id_proceso: String(datos.id_proceso || "").slice(0, 120) || null,
        entidad: lic.entidad || null,
        presupuesto_oficial: Number.isFinite(cuantia) && cuantia > 0 ? cuantia : null,
        baja, competencia,
        p_base: pBase ? pBase.p_sin_precio : null, // la misma p SIN precio (A5)
        precio_venta: presupuesto.resumen.precio_venta,
        precio_actual: presupuesto.resumen.precio_final,
      },
      /* El costo directo entra como PARÁMETRO, salido del presupuesto que se
         acaba de calcular. El encargo admite recibirlo del cliente; aquí no se
         acepta, y es a propósito: un `costo_directo_total` del cuerpo sería una
         segunda fuente de verdad del costo y podría recomendar un precio que no
         corresponde a los ítems que se están viendo en pantalla. */
      presupuesto.resumen.costo_directo_total,
      {
        aiu: ctxPres.aiu,
        fiscal: ctxPres.fiscal,
        anticipo_pct: ctxPres.anticipo_pct,
        anticipo_es_dato: ctxPres.anticipo_es_dato,
        plazo_meses: Number(datos.plazo_meses) || 12,
        dso_dias: Number(datos.dso_dias) || undefined,
        precio_piso: piso.precio_piso_decision,
        paso_pp: opt.paso_pp, desde_pp: opt.desde_pp, hasta_pp: opt.hasta_pp,
        tolerancia_pct: opt.tolerancia_pct, costo_preparacion: opt.costo_preparacion,
      },
    );

    /* ── PANEL PISO / TECHO (Fase 3, ago 2026) ─────────────────────────
       La respuesta de una frase a «¿me presento o no, y a cuánto?». Es una
       capa PURA sobre lo que esta acción ya tiene en la mano: no reimplementa
       la cascada de baja (que exige 5 procesos y devuelve `sin_dato` por
       debajo), no recalcula el costo directo y no vuelve a leer Redis. Sin
       cuantía publicada responde `aplicable:false` con motivo; sin baja con
       base responde el piso y «Sin referencia», jamás un techo inventado. La
       utilidad mínima la declara el usuario (`config.utilidad_minima_pct`);
       sin declararla se usa la U del AIU y se dice. */
    const cfgPT = (datos.config && typeof datos.config === "object") ? datos.config : {};
    /* LA CONTRIBUCIÓN DEL 5 % NO SE LE COBRA A TODO, Y LA REGLA ES UNA SOLA.
       `lib/ganancia.aplicaContribucion` decide por TIPO DE TRABAJO (el art. 120
       de la Ley 418/1997 grava los contratos de OBRA PÚBLICA: una interventoría
       es consultoría) y el usuario puede declarar que su administración ya la
       lleva dentro. Se importa de allí en vez de repetirse aquí: dos reglas
       sobre el mismo impuesto pondrían a la tarjeta del listado y al piso del
       editor a decir dos cifras del mismo proceso, que es el defecto que este
       repositorio ya pagó. Sin `tipo_trabajo` (una llamada a mano, sin el
       enlace de la tarjeta) se degrada a cobrarla, que es el comportamiento
       anterior y el prudente. */
    const contribucionPct = (aplicaContribucion(datos.tipo_trabajo) && !cfgPT.contribucion_en_administracion)
      ? CONTRIBUCION_PCT : 0;
    const piso_techo = pisoTecho({
      contribucion_pct: contribucionPct,
      presupuesto_oficial: Number.isFinite(cuantia) && cuantia > 0 ? cuantia : null,
      costo_directo: presupuesto.resumen.costo_directo_total,
      aiu: {
        administracion_pct: presupuesto.configuracion.aiu_pct,
        imprevistos_pct: presupuesto.configuracion.imprevistos_pct,
        utilidad_pct: presupuesto.configuracion.utilidad_pct,
        modo: presupuesto.configuracion.modo_aiu,
      },
      utilidad_minima_pct: cfgPT.utilidad_minima_pct ?? datos.utilidad_minima_pct ?? null,
      deducciones_pct: presupuesto.configuracion.deducciones_pct,
      baja, competencia,
      precio_actual: presupuesto.resumen.precio_final,
      modalidad: lic.modalidad_de_contratacion || null,
      items_totales: presupuesto.resumen.items_totales,
      items_costeados: presupuesto.resumen.items_costeados,
    });

    return res.status(200).json({
      ok: true, perfil: perfil || null,
      presupuesto, rentabilidad: r, precio_piso: piso,
      piso_techo,
      mercado, baja_mercado: baja, competencia_entidad: competencia, p_ganar_base: pBase,
      ajuste_competitivo: ajusteCompetitivo({
        baja, presupuesto_oficial: Number.isFinite(cuantia) && cuantia > 0 ? cuantia : null,
        precio_oferta: presupuesto.resumen.precio_final,
      }),
      optimizador,
      como_leerlo: {
        piso_techo: "«piso_techo» es la respuesta de una frase: piso = costo directo × (1 + A + I + U mínima) ÷ (1 − "
          + "contribución y deducciones); techo = presupuesto oficial × (1 − baja mediana), SOLO con 5 o más procesos "
          + "adjudicados en la cascada entidad+familia → entidad → departamento+familia. Sin esa base no hay techo: "
          + "se dice «Sin referencia». El umbral de precio artificialmente bajo (80 % del presupuesto) es de referencia.",
        orden: "El indicador de decisión es el VEG, no el margen: es el único que descuenta el costo de "
          + "preparar una oferta, que se paga se gane o no.",
        caja: "K_max decide si la empresa PUEDE; el margen decide si VALE LA PENA. Son dos preguntas "
          + "distintas y ninguna sustituye a la otra.",
        precio: "El ajuste competitivo NO recomienda minimizar: el método de ponderación económica se "
          + "SORTEA en la audiencia, y el centro del mercado gana en tres de los cuatro métodos.",
        optimo: "«optimizador» va un paso más allá del ajuste competitivo: aquel dice dónde está el CENTRO "
          + "del mercado y este dice a qué precio el valor esperado es MÁXIMO, que casi nunca es el mismo "
          + "punto. El descuento del optimizador se mide contra el presupuesto oficial; para escribirlo en "
          + "la perilla del editor está «descuento_apu_pct» de cada punto.",
      },
    });
  }

  /* ══════════════════ guardar ══════════════════ */
  if (accion === "guardar") {
    const id = String(datos.id || "").trim() || `pre-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    if (!ID_RE.test(id)) {
      return res.status(400).json({ ok: false, error: "El identificador solo admite letras, números, guion y guion bajo (máx. 48)." });
    }
    const nombre = String(datos.nombre || "").trim().slice(0, 140) || "Presupuesto sin nombre";
    const items = Array.isArray(datos.items) ? datos.items : [];
    if (items.length > MAX_ITEMS) {
      return res.status(400).json({ ok: false, error: `Demasiados ítems (${items.length}). El tope es ${MAX_ITEMS}.` });
    }

    const guardado = new Date().toISOString();
    let versionCatalogo = null;
    try {
      const cat = await obtenerCatalogo(redis);
      versionCatalogo = cat && cat.meta ? cat.meta.version : null;
    } catch { /* sin catálogo el borrador se guarda igual; lo dirá al cargarlo */ }

    const registro = {
      id, perfil, nombre,
      objeto: String(datos.objeto || "").slice(0, 4000),
      departamento: String(datos.departamento || ""),
      entidad: String(datos.entidad || "").slice(0, 300),
      /* El proceso de SECOP al que pertenece el borrador. Es lo que permite al
         panel encender «APU listo» en su fila: el `id` del borrador lo propone
         el cliente y no tiene por qué parecerse al del proceso (de hecho no
         puede serlo — `id_del_proceso` trae puntos y ID_RE no los admite). */
      id_proceso: String(datos.id_proceso || "").slice(0, 120) || null,
      items,
      config: datos.config || {},
      guardado,
      /* El TOTAL se guarda para que el listado no tenga que recalcular 40
         presupuestos. Es una cifra DERIVADA y por eso viaja con el sello del
         catálogo: si los precios cambian, el guardado deja de coincidir con el
         que saldría hoy, y al cargarlo se dice en vez de fingir que sigue
         vigente. */
      total_guardado: Number.isFinite(Number(datos.total)) ? Number(datos.total) : null,
      /* El COSTO DIRECTO del último cálculo (Fase 8): es lo que permite al
         listado ordenar por «Dónde me queda más» (margen = techo − piso, con
         la misma función del panel Piso/Techo) sin recalcular 40 borradores en
         cada petición. Sin él el proceso queda «Sin referencia» en ese orden;
         un borrador viejo se arregla recalculando y guardando otra vez. */
      costo_directo_guardado: Number.isFinite(Number(datos.costo_directo)) && Number(datos.costo_directo) > 0 ? Number(datos.costo_directo) : null,
      catalogo_version: versionCatalogo,
    };

    try {
      await escribirJSONComprimido(redis, CLAVES.apuPresupuesto(perfil, id), registro, { ttl: APU_TTL_SEG });
    } catch (e) {
      return res.status(503).json({ ok: false, error: `No se pudo guardar. Reintente. (${e.message})` });
    }
    /* ═══ EL SISTEMA APRENDE DE LOS PRECIOS QUE VOS CORREGÍS ═════════════════
       Cada precio tecleado a mano queda en el perfil y MANDA la próxima vez que
       ese ítem aparezca en cualquier presupuesto (nivel 1 de la cascada, ver
       lib/apu/precios). Es la única fuente que mejora sola con el uso, y es
       mejor que cualquier referencia: son los precios de SU proveedor y SU
       región.

       Va DESPUÉS de guardar el borrador y en su propio try: si falla, el
       borrador ya está a salvo y lo único que se pierde es el aprendizaje de
       esta vez. Al revés —abortar el guardado porque no se pudo aprender—
       perdería el trabajo del usuario por un efecto secundario.

       Los precios de los tres perfiles del dueño NO llevan TTL aunque el
       borrador sí: un borrador es un trabajo en curso y un precio de mercado es
       conocimiento. Los de un perfil que puede desaparecer (rup_… caduca a los
       45 días, cons_… se borra) caducan con él —el TTL del perfil dinámico,
       renovado en cada guardado—: sin eso cada visitante dejaría un hash
       eterno en Redis (6-sep-2026). */
    let aprendidos = null;
    try {
      aprendidos = await require("../../apu/precios.js")
        .guardarPreciosUsuario(redis, perfil, items, { region: String(datos.departamento || "") || null, ttl: perfilFijo ? 0 : PERFIL_DINAMICO_TTL_SEG });
    } catch { /* el borrador ya está guardado: el aprendizaje se reintenta solo la próxima vez */ }

    return res.status(200).json({
      ok: true, guardado: true, id, perfil, nombre,
      expira_en_dias: Math.round(APU_TTL_SEG / 86400),
      precios_aprendidos: aprendidos ? aprendidos.guardados : null,
      nota: `El borrador caduca en ${Math.round(APU_TTL_SEG / 86400)} días. Exporte a Excel lo que quiera conservar más tiempo.`
        + (aprendidos && aprendidos.guardados
          ? ` Se guardaron ${aprendidos.guardados} precio(s) corregido(s) en su perfil: la próxima vez que use esos ítems, mandan sobre el catálogo.`
          : ""),
    });
  }

  /* ══════════════════ cotizar ══════════════════
     La cascada de fuentes de precio (lib/apu/precios), ítem por ítem. Va APARTE
     de `calcular` porque responden preguntas distintas: `calcular` arma el
     presupuesto entero (AIU, margen, alertas) y esto contesta «¿de dónde sale
     el precio de cada uno de estos ítems y qué tan firme es?». Fundirlas
     obligaría a pagar la lectura de los precios del usuario en cada tecla.

     La referencia de MERCADO (histórico SECOP) NO se calcula por defecto: exige
     recorrer el corpus histórico entero y es una respuesta sobre el CONTRATO,
     no sobre los ítems. Se pide con `?con_mercado=1`. */
  if (accion === "cotizar") {
    const items = Array.isArray(datos.items) ? datos.items : [];
    if (items.length > MAX_ITEMS) {
      return res.status(400).json({ ok: false, error: `Demasiados ítems (${items.length}). El tope es ${MAX_ITEMS}.` });
    }
    const { r, reg, mapa, ilegibles, error, par } = await cotizacionDe(redis, perfil, items, datos.departamento);

    return res.status(200).json({
      ok: true,
      perfil,
      ...r,
      parametros_costo: par,
      ajuste_regional: {
        estado: reg.estado, departamento: reg.departamento,
        region_utilizada: r.region, mensaje: reg.mensaje,
      },
      precios_propios: {
        /* «no se pudo consultar» ≠ «no tenés precios»: con Redis caído, un mapa
           vacío haría que la cotización cayera al catálogo EN SILENCIO y el
           usuario vería otro precio sin saber por qué. */
        consultados: !error,
        cargados: mapa ? Object.keys(mapa).length : null,
        ilegibles,
        mensaje: error
          ? "No se pudieron leer sus precios guardados: esta cotización salió del catálogo de referencia."
          : null,
      },
      como_leerlo: {
        cascada: "Cada ítem se cotiza recorriendo las fuentes de la más fuerte a la más débil y quedándose "
          + "con la primera que responde. Se publican TODAS, también las que no respondieron y por qué.",
        total: "«total_cota_inferior» es una COTA INFERIOR: los ítems sin precio no suman, y cuánto valen "
          + "es justamente lo que no se sabe.",
      },
      aviso: AVISO,
    });
  }

  /* ══════════════════ ia · precios buscados por una sesión de Claude Code ══════════════════
     El circuito entero está explicado en lib/apu/precios_ia. Aquí solo el
     cableado: cuatro entradas sobre un borrador GUARDADO (sin borrador no hay
     nada que buscar ni dónde dejar la respuesta). Exige token: la solicitud y
     la propuesta son de un perfil concreto. */
  if (accion === "ia") {
    const IA = require("../../apu/precios_ia.js");
    /* la cola de la sesión (`pendientes=1`) ya se despachó antes de resolver el perfil */
    const id = String((metodo === "POST" ? datos.id : q.id) || "").trim();
    if (!ID_RE.test(id)) return res.status(400).json({ ok: false, error: "Falta «id» (el del borrador guardado) o tiene caracteres no admitidos." });
    let registro = null;
    try { registro = await leerJSONComprimido(redis, CLAVES.apuPresupuesto(perfil, id)); }
    catch (e) { return res.status(503).json({ ok: false, error: `No se pudo leer el borrador: ${e.message}` }); }
    if (!registro) return res.status(404).json({ ok: false, error: `No hay ningún borrador «${id}» para el perfil ${perfil}: guarde el presupuesto antes de pedir precios.` });
    const claveSol = CLAVES.apuIaSolicitud(perfil, id), claveProp = CLAVES.apuIaPropuesta(perfil, id);
    const leer = async (k) => { try { return await leerJSONComprimido(redis, k); } catch { return null; } };

    if (metodo === "GET" && String(q.expediente || "") === "1") {
      const items = Array.isArray(registro.items) ? registro.items : [];
      const { r } = await cotizacionDe(redis, perfil, items, registro.departamento);
      const exp = IA.armarExpediente({ presupuesto: registro, cotizacion: r });
      return res.status(200).json({ ok: true, expediente: true, perfil, id, ...exp,
        como_devolver: { metodo: "POST", url: "/api/apu?op=ia", cuerpo: { perfil, id, motor: "sesion", propuesta: "<el objeto con la forma de «esquema»>" }, cabecera: "x-historico-token" } });
    }
    if (metodo === "GET") {
      const [sol, prop] = await Promise.all([leer(claveSol), leer(claveProp)]);
      /* ── La solicitud que ENVEJECE en silencio (5-sep-2026) ──
         La cola la vacía una rutina que corre CADA HORA. Hasta hoy una
         solicitud en cola se veía igual el primer minuto que el día siguiente:
         si la rutina se paraba (cuota, suscripción, un fallo), la solicitud
         envejecía muda y desaparecía a los 30 días con el borrador. Tres
         pasadas perdidas ya no son una espera normal, son un fallo que hay que
         VER: a partir de ahí el estado que se sirve es «sin_atender».

         Se calcula AQUÍ y no en el navegador porque el reloj que marca la edad
         tiene que ser el mismo que escribió `solicitado_el`. Y sin
         `solicitado_el` no hay edad: `null`, jamás 0 — un 0 diría «acaba de
         llegar» sobre una solicitud de fecha desconocida.

         `pendientes=1` (la cola que atiende la rutina) NO se toca: allí sigue
         valiendo «en_cola», que es lo que la rutina busca. */
      const UMBRAL_SIN_ATENDER_MIN = 180;   // tres pasadas de la rutina horaria
      const t0 = sol && sol.solicitado_el ? Date.parse(sol.solicitado_el) : NaN;
      const edadMin = Number.isFinite(t0) ? Math.max(0, Math.floor((Date.now() - t0) / 60000)) : null;
      const guardado = sol ? sol.estado : prop ? "listo" : "sin_solicitud";
      const estado = guardado === "en_cola" && edadMin != null && edadMin > UMBRAL_SIN_ATENDER_MIN
        ? "sin_atender" : guardado;
      return res.status(200).json({ ok: true, perfil, id, estado, edad_min: edadMin,
        umbral_sin_atender_min: UMBRAL_SIN_ATENDER_MIN, solicitud: sol, propuesta: prop,
        como_leerlo: "«en_cola»: la solicitud espera turno y los precios aparecerán aquí con su fuente; "
          + `«sin_atender»: lleva más de ${UMBRAL_SIN_ATENDER_MIN} minutos en cola (tres revisiones seguidas sin respuesta); `
          + "«listo»: la propuesta está y cada precio se acepta fila a fila." });
    }
    if (datos.solicitar === true) {
      /* la ciudad y las condiciones de sitio las escribe el usuario al pedir: van al
         borrador (el expediente las lee de ahí) y a la solicitud */
      const ciudad = String(datos.ciudad || "").slice(0, 120) || null, condiciones = String(datos.condiciones_sitio || "").slice(0, 300) || null;
      if (ciudad || condiciones) {
        try { await escribirJSONComprimido(redis, CLAVES.apuPresupuesto(perfil, id), { ...registro, ciudad: ciudad || registro.ciudad || null, condiciones_sitio: condiciones || registro.condiciones_sitio || null }, { ttl: APU_TTL_SEG }); } catch { /* el expediente saldrá sin ciudad */ }
      }
      const sol = { id, perfil, nombre: registro.nombre || null, objeto: String(registro.objeto || "").slice(0, 200) || null, departamento: registro.departamento || null, ciudad: ciudad || registro.ciudad || null,
        filas: Array.isArray(registro.items) ? registro.items.length : 0, estado: "en_cola", solicitado_el: new Date().toISOString(), respondida_el: null, progreso: null };
      try { await escribirJSONComprimido(redis, claveSol, sol, { ttl: APU_TTL_SEG }); }
      catch (e) { return res.status(503).json({ ok: false, error: `No se pudo encolar la solicitud. Reintente. (${e.message})` }); }
      return res.status(200).json({ ok: true, encolada: true, perfil, id, estado: "en_cola", solicitud: sol,
        nota: "La solicitud quedó en cola. Una sesión de Claude Code la atiende y los precios aparecen aquí con su fuente, su fecha y su enlace; usted decide cuáles usar." });
    }
    /* el progreso de la sesión mientras trabaja: «buscando… completado x %» */
    if (datos.motor === "sesion" && datos.progreso && !datos.propuesta) {
      const prog = IA.verificarProgreso(datos.progreso);
      if (!prog) return res.status(400).json({ ok: false, error: "«progreso» debe traer «hecho» y «total» numéricos." });
      const sol = (await leer(claveSol)) || { id, perfil, solicitado_el: null };
      try { await escribirJSONComprimido(redis, claveSol, { ...sol, estado: "buscando", progreso: prog }, { ttl: APU_TTL_SEG }); }
      catch (e) { return res.status(503).json({ ok: false, error: `No se pudo guardar el progreso. (${e.message})` }); }
      return res.status(200).json({ ok: true, perfil, id, estado: "buscando", progreso: prog });
    }
    if (datos.motor === "sesion") {
      const v = IA.verificarPropuesta(datos.propuesta, registro);
      if (!v.ok) return res.status(400).json({ ok: false, motivo: "forma", detalle: v.detalle, que_hacer: "Devuelva un objeto con la forma exacta de «esquema» del expediente." });
      const guardada = { ...v.propuesta, guardada_el: new Date().toISOString(), origen: "sesion:claude-code", apartados: v.apartados, resumen: v.resumen };
      try {
        await escribirJSONComprimido(redis, claveProp, guardada, { ttl: APU_TTL_SEG });
        const sol = (await leer(claveSol)) || { id, perfil, solicitado_el: null };
        await escribirJSONComprimido(redis, claveSol, { ...sol, estado: "listo", respondida_el: guardada.guardada_el }, { ttl: APU_TTL_SEG });
      } catch (e) { return res.status(503).json({ ok: false, error: `No se pudo guardar la propuesta. Reintente. (${e.message})` }); }
      return res.status(200).json({ ok: true, guardado: true, perfil, id, estado: "listo", resumen: v.resumen, apartados: v.apartados });
    }
    return res.status(400).json({ ok: false, error: "El cuerpo debe traer «solicitar: true» (encolar), o «motor: \"sesion\"» con «progreso» (avance) o con «propuesta» (los APU)." });
  }

  /* ══════════════════ cargar ══════════════════ */
  if (accion === "cargar") {
    const id = String(q.id || "").trim();
    if (!ID_RE.test(id)) {
      return res.status(400).json({ ok: false, error: "Falta el parámetro «id» o tiene caracteres no admitidos." });
    }
    let registro = null;
    try { registro = await leerJSONComprimido(redis, CLAVES.apuPresupuesto(perfil, id)); }
    catch (e) { return res.status(503).json({ ok: false, error: `No se pudo leer: ${e.message}` }); }

    if (!registro) {
      return res.status(404).json({
        ok: false,
        error: `No hay ningún presupuesto «${id}» para el perfil ${perfil}. Puede que haya caducado: los borradores viven ${Math.round(APU_TTL_SEG / 86400)} días.`,
      });
    }
    let vigente = null;
    try {
      const cat = await obtenerCatalogo(redis);
      vigente = cat && cat.meta ? cat.meta.version : null;
    } catch { /* ídem */ }
    const cambiado = !!(registro.catalogo_version && vigente && registro.catalogo_version !== vigente);
    return res.status(200).json({
      ok: true,
      presupuesto: registro,
      catalogo_cambiado: cambiado,
      nota: cambiado
        ? "El catálogo de precios cambió desde que se guardó este presupuesto: vuelva a calcular antes de usar los totales."
        : null,
    });
  }

  /* ══════════════════ listar ══════════════════
     SCAN + MGET sobre las propias claves, sin índice aparte: un índice con TTL
     se desincroniza en cuanto caduca un presupuesto y listaría borradores que
     ya no existen. La clave ES la fuente de verdad. */
  let claves = [];
  try { claves = await redis.scan(CLAVES.patronApuPerfil(perfil)); }
  catch (e) { return res.status(503).json({ ok: false, error: `No se pudo listar: ${e.message}` }); }

  const presupuestos = [];
  let ilegibles = 0;
  for (let i = 0; i < claves.length && presupuestos.length < MAX_PRESUPUESTOS; i += 8) {
    const lote = claves.slice(i, i + 8);
    let valores = [];
    try { valores = await redis.mget(lote); } catch { ilegibles += lote.length; continue; }
    for (const v of valores) {
      if (v == null) { ilegibles++; continue; }
      // `descomprimir` devuelve null ante un valor corrupto en vez de lanzar:
      // un borrador ilegible no puede tumbar el listado entero
      const r = descomprimir(v);
      if (!r || !r.id) { ilegibles++; continue; }
      presupuestos.push({
        id: r.id, nombre: r.nombre, objeto: String(r.objeto || "").slice(0, 160),
        departamento: r.departamento || null, entidad: r.entidad || null,
        id_proceso: r.id_proceso || null,
        items: Array.isArray(r.items) ? r.items.length : 0,
        total_guardado: r.total_guardado ?? null,
        guardado: r.guardado,
        catalogo_version: r.catalogo_version || null,
      });
    }
  }
  presupuestos.sort((a, b) => String(b.guardado).localeCompare(String(a.guardado)));

  return res.status(200).json({
    ok: true, perfil,
    total: presupuestos.length,
    truncado: claves.length > MAX_PRESUPUESTOS,
    ilegibles,
    presupuestos,
    /* Los procesos de SECOP con borrador, para el badge del panel. Es una lista
       de PERTENENCIA, no un conteo: así el frontend no puede convertir un «no
       sé» en un cero con un `|| 0`. */
    procesos_con_presupuesto: [...new Set(presupuestos.map((x) => x.id_proceso).filter(Boolean))],
    ttl_dias: Math.round(APU_TTL_SEG / 86400),
  });
};
