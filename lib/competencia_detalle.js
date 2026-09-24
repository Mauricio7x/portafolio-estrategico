/* ============================================================================
   lib/competencia_detalle · Los procesos que SOSTIENEN el badge de competencia
   ----------------------------------------------------------------------------
   La tarjeta dice «🟢 Poca competencia — promedio 3 oferentes en 12 procesos».
   Este módulo responde la única pregunta que sigue: ¿CUÁLES 12?

   Regla de oro: esto NO es un segundo cálculo, es el MISMO. Se usan los
   predicados del índice —`esAdjudicado()` y `oferentesDe()` de
   lib/indice_competencia— y no una reimplementación parecida: si el detalle y
   el badge pudieran divergir, el detalle no serviría para verificar nada.
   Hay una prueba que compara el promedio reconstruido aquí contra el
   publicado en `indice:competencia`, entidad por entidad.

   Tres cubetas, y NADA se descarta en silencio (esa es la queja que originó
   el módulo: un ⚪ «sin dato» sin explicación):

     procesos   adjudicado + nº de oferentes ≥ 1 → los que forman el promedio.
     excluidos  · `sin_dato_oferentes`  adjudicado pero el dataset no dice
                  cuántos se presentaron (0 = SIN DATO, nunca «nadie vino»);
                · `sin_adjudicacion`    cerrado sin ganador (desierto,
                  cancelado, revocado): no aporta señal de competencia;
                · `insuficientes_datos` la entidad NO llega al mínimo de
                  MIN_PROCESOS, así que ni siquiera los que tienen oferentes
                  pueden sostener una clasificación. Es exactamente el «⚪ sin
                  datos suficientes» que se ve en la tarjeta, con nombre y
                  apellido.
     (abiertos) los procesos aún abiertos no entran: no hay competencia
                observada todavía.

   Rendimiento: la normalización del nombre de entidad se memoiza por nombre
   DISTINTO (las entidades se repiten miles de veces en el corpus), así que el
   coste por proceso es un lookup de Map, no un regex.
   ========================================================================== */
"use strict";

const { CLAVES, leerChunksDedup, leerJSON, comprimir, descomprimir } = require("./almacen.js");
const { norm } = require("./semantica.js");
const { estado_abierto } = require("./filtros.js");
const {
  MIN_PROCESOS, oferentesDe, esAdjudicado, cuentaParaCompetencia, medianaHistograma, anioDe,
  claveCanonica, hechosDeRegistro, primeraFecha,
  /* la búsqueda del registro publicado: el MISMO orden y la MISMA resolución del
     alias por NIT con los que el chip de la tarjeta encuentra la entidad (24-sep-2026) */
  clavesDeBusqueda, registroDe,
  /* «quién gana aquí» y el perfil del competidor: el MISMO cálculo con el que
     el índice los publica (23-sep-2026) — aquí se llaman, no se copian */
  nuevoAcumuladorGanadores, acumularGanador, ganadoresDe, nuevoAcumuladorPerfil, acumularPerfil, perfilDe, perfilExpandido,
} = require("./indice_competencia.js");
/* LA BAJA CON LA QUE GANA EL ADJUDICATARIO (M-COMP-01, 6-sep-2026) sale de la
   MISMA regla del índice de baja: `bajaDeFila` (misma exclusión: sin par, sin
   ganador real, lotes parciales, por encima del techo), `subRegistro` (mismo
   mínimo, misma anulación bajo él) y `encogerBaja` con la meta del índice
   (mismo encogimiento, que solo alimenta el factor de precio). Ninguna se
   copia: una segunda aritmética de «cuánto descontó» divergiría a la primera
   corrección de un umbral. */
const { bajaDeFila, subRegistro, encogerBaja, leerIndiceBajaMeta, MIN_PROCESOS: MIN_PROCESOS_BAJA } = require("./indice_baja.js");
/* Identidad del GANADOR: la misma que usan las equivalencias (NIT primero,
   nombre normalizado de respaldo; «No Definido» no es un NIT y cae al nombre).
   Una segunda definición de «quién ganó» divergiría a la primera corrección. */
const { claveAdjudicatario } = require("./equivalencias.js");
const { proponentesDeProcesos } = require("./proponentes.js");
const { ejecucionDeEntidad } = require("./ejecucion.js");

const MAX_PROCESOS_DETALLE = 200;   // tope por lista en la respuesta
const TTL_CACHE_SEG = 3600;         // 1 hora
const LARGO_MAX_ENTIDAD = 300;
/* Techo del barrido del histórico, en SEGUNDOS DE SEGURIDAD y no en el tiempo
   esperado: la cuenta se hace hacia atrás desde donde la plataforma corta.
   `api/inteligencia.js` vive con maxDuration 60 (vercel.json); de ahí salen
   hasta 10 s de la última lectura que ya estaba en vuelo cuando se agotó el
   techo (`TIMEOUT_MS` de lib/redis), 6 s de las dos fuentes vivas —que corren
   en paralelo y tienen su propio tope— y lo que tarde en viajar la respuesta.
   Treinta y cinco deja unos nueve segundos de margen y, sobre todo, deja que el
   caso normal TERMINE: medido el 14-sep-2026 sobre 150 000 procesos en chunks
   de 40 filas, el barrido entero cuesta 284 comandos y 15,9 s a 50 ms por
   comando. Un techo apretado convertiría en respuesta parcial lo que hoy se
   sirve completo, que sería cambiar un defecto por otro. */
const PRESUPUESTO_BARRIDO_MS = parseInt(process.env.DETALLE_PRESUPUESTO_MS, 10) || 35000;

/* ---------- normalización: UNA sola, la de lib/indice_competencia ----------
   Hasta ago 2026 aquí había DOS claves distintas y esa era la falla:
     claveIndice   `norm(nombre)` — para leer `indice:competencia`.
     claveBusqueda además sin puntuación — para EMPAREJAR el texto que escribe
                   quien consulta con el que trae el dataset.
   El recuento agrupaba con la segunda y el registro publicado se leía con la
   primera, así que «… RÍOS NEGRO - NARE» y «… RIOS NEGRO NARE» se sumaban al
   contar (5 procesos) pero no al leer (un registro de 3): el detalle enseñaba
   un promedio de 5 procesos bajo una banda ⚪ que salía de otro conjunto. No
   era un error de cálculo — eran dos definiciones de «entidad» conviviendo.

   Ahora las dos son `claveCanonica`, importada de lib/indice_competencia: la
   MISMA función con la que el índice agrupa al construirse. Los dos sentidos
   —agrupar el corpus y leer el hash— no pueden volver a separarse porque no hay
   dos funciones que mantener. Los dos nombres se conservan porque describen
   para qué se usa cada uno en el flujo, y las pruebas los importan. */
const claveIndice = claveCanonica;
const claveBusqueda = claveCanonica;

/* Memoiza por nombre crudo: el regex corre una vez por entidad DISTINTA. */
function memoNormalizador(fn) {
  const cache = new Map();
  return (crudo) => {
    const k = crudo == null ? "" : String(crudo);
    let v = cache.get(k);
    if (v === undefined) { v = fn(k); cache.set(k, v); }
    return v;
  };
}

/* ---------- proyección de un proceso para la respuesta ----------
   Lista BLANCA de campos: el adjudicatario y su NIT viven en el corpus
   histórico pero no salen de aquí (mismo criterio que /api/oportunidades).
   `primeraFecha` vive en lib/indice_competencia desde el 23-sep-2026 (el
   índice la necesita para publicar «quién gana aquí»): se importa. */
function proyectarProceso(lic, ofertas, extra = {}) {
  const cuantia = parseFloat(lic.cuantia_cop ?? lic.precio_base ?? 0);
  return {
    id: lic.id_del_proceso || lic[":id"] || null,
    objeto: String(lic.nombre_del_procedimiento || "").trim() || "(sin objeto)",
    numero_ofertas: ofertas,
    cuantia_cop: isNaN(cuantia) ? 0 : cuantia,
    modalidad: lic.modalidad_de_contratacion || null,
    fecha_adjudicacion: primeraFecha(lic),
    codigo_unspsc: lic.codigo_principal_de_categoria || null,
    ...extra,
  };
}

/* Orden: los procesos con MENOS oferentes primero (es lo que le interesa a
   quien va a decidir si presentarse); desempate por fecha más reciente. */
const porOfertasAsc = (a, b) => (a.numero_ofertas - b.numero_ofertas)
  || String(b.fecha_adjudicacion || "").localeCompare(String(a.fecha_adjudicacion || ""));
const porFechaDesc = (a, b) => String(b.fecha_adjudicacion || "").localeCompare(String(a.fecha_adjudicacion || ""));

/* ---------- caché ----------
   La clave lleva el nombre normalizado; el VALOR lleva el sello de
   construcción del índice. Reconstruir el índice invalida todos los detalles
   al instante, sin esperar al TTL ni borrar clave por clave. */
/* `v2`: la respuesta ganó el bloque `adjudicatarios` (ago 2026). `v3`: el
   identificador del ganador viaja con su TIPO (`identificacion`) y `nit` dejó
   de llevar códigos internos de SECOP. Sin el sufijo, una caché escrita por la
   versión anterior serviría hasta 1 h de respuestas con el rótulo viejo
   después de desplegar — y desplegar nunca debe exigir reconstruir ni esperar
   (R11). Las claves viejas caducan solas. */
const claveCache = (buscada) => `${CLAVES.detalleCompetencia}v8:${buscada}`; // v4: + proponentes (hgi6) · v5: + ejecucion (jbjy) · v6: + prorroga (M-DGF-06) · v7: + plazo_adjudicacion/desiertos (M-DGF-08) y baja_media del adjudicatario (M-COMP-01) · v8: + adjudicatarios.origen y perfil.origen (quién gana publicado, 23-sep-2026)

async function leerCache(redis, buscada, sello) {
  const v = await redis.get(claveCache(buscada));
  if (v == null) return null;
  const obj = descomprimir(v);
  if (!obj || obj.sello !== sello) return null; // índice reconstruido: caché vieja
  return obj;
}
const guardarCache = (redis, buscada, obj) =>
  redis.set(claveCache(buscada), comprimir(obj), { ex: TTL_CACHE_SEG });

/* El par de la prórroga tal como lo publica el hash del índice, o null. La
   guarda descarta la ausencia ANTES de convertir (`Number(null) === 0`). */
function prorrogaPublicada(publicado) {
  const g = publicado && publicado.prorroga;
  if (!g || typeof g !== "object") return null;
  if (g.prorrogados == null || g.no_prorrogados == null) return null;
  const p = Number(g.prorrogados), n = Number(g.no_prorrogados);
  if (!Number.isFinite(p) || !Number.isFinite(n)) return null;
  return { prorrogados: p, no_prorrogados: n };
}

/* Número ESCRITO POR ESTE PROYECTO (JSON del hash): `Number` estricto, con la
   ausencia descartada ANTES de convertir (`Number(null) === 0`). No es `numero()`,
   que es el lector tolerante del dataset. */
const maquina = (v) => {
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

/* ═════════ QUIÉN GANA AQUÍ, PUBLICADO (23-sep-2026) ═════════
   Lo acumula `construirIndice` con las MISMAS funciones que el recorrido de
   abajo (`acumularGanador` → `ganadoresDe`) y lo guarda en un hash aparte,
   una entrada por entidad. Se sirve cuando el recorrido del clic no cabe en su
   tiempo —antes el bloque desaparecía, mudo, en todas las entidades— y al
   instante con `publicado=1`. Va con `origen: "publicado"` y la fecha en que
   se armó (`construido`), que la pantalla dice como lo que es: la fecha del
   resumen, no «datos hasta». */
async function leerGanadoresPublicados(redis, buscada) {
  let g;
  try {
    const crudo = await redis.hget(CLAVES.indiceGanadores, buscada);
    g = typeof crudo === "string" ? JSON.parse(crudo) : crudo;
  } catch { return null; } // hash sin construir o ilegible: sin dato, no un error
  if (!g || typeof g !== "object" || !Array.isArray(g.top)) return null;
  const conGanador = maquina(g.procesos_con_ganador);
  if (conGanador == null || conGanador < 0) return null;
  return {
    top: g.top,
    distintos: maquina(g.distintos),
    procesos_con_ganador: conGanador,
    sin_adjudicatario: maquina(g.sin_adjudicatario),
    min_procesos: MIN_PROCESOS,
    // la guarda del lector, no solo la del escritor: sin base no hay concentración
    concentracion: conGanador >= MIN_PROCESOS && g.concentracion && typeof g.concentracion === "object" ? g.concentracion : null,
    construido: typeof g.construido === "string" ? g.construido : null,
  };
}
/* La LECTURA de la concentración lleva las DOS interpretaciones a la vez
   —nicho ganable O pliego sastre— porque el manual sostiene ambas y afirmar una
   sola sin evidencia sería decidir por el usuario con un dato que no alcanza
   para decidir. Una sola redacción para lo recorrido y lo publicado. */
function lecturaDe(concentracion) {
  return concentracion && concentracion.pct >= 50
    ? `${concentracion.lider} ganó ${concentracion.ganados} de los ${concentracion.base} procesos adjudicados con ganador identificado. Esto tiene dos lecturas y las dos son posibles: un nicho con poca competencia donde se puede entrar a ganar, o pliegos hechos a la medida de ese contratista (señal de alerta n.º 11 del manual). Antes de invertir en una oferta aquí, revise un pliego reciente: experiencia hiperespecífica, indicadores financieros raros o marca de un solo fabricante lo delatan.`
    : null;
}
const adjudicatariosPublicados = (pub) => (pub
  ? { ...pub, lectura: lecturaDe(pub.concentracion), origen: "publicado", construido: pub.construido }
  : null);

/* El bloque `indice` armado SOLO con lo que el índice publicó (sin recuento):
   lo sirven el recorrido que no cupo en su tiempo y la consulta `publicado=1`.
   Una sola copia para los dos caminos. */
function indiceDePublicado(publicado) {
  if (!publicado) return null;
  return {
    nivel: ["baja", "media", "alta"].includes(publicado.nivel) ? publicado.nivel : "sin_dato",
    promedio_oferentes: publicado.promedio ?? null,
    mediana_oferentes: publicado.mediana ?? null,
    min_oferentes: null, max_oferentes: null,
    /* del ÍNDICE, no de un recuento: por eso `publicado.procesos` */
    procesos_contados: publicado.procesos_contados ?? publicado.procesos ?? null,
    total_procesos_adjudicados: null,
    total_procesos_historico: null,
    min_procesos: MIN_PROCESOS,
    publicado: {
      promedio: publicado.promedio ?? null,
      procesos: publicado.procesos ?? publicado.procesos_contados ?? 0,
      nivel: publicado.nivel || null,
    },
    encogimiento: null,
    reparto_por_anio: {},
    prorroga: prorrogaPublicada(publicado),
    ...hechosDeRegistro(publicado),
  };
}

/* ============================ detalleEntidad ============================ */
/* Devuelve {estado, cuerpo}. `estado` es el HTTP que debe responder el
   handler; el módulo no toca `req`/`res` para poder probarlo suelto. */
/* `usarCache` controla solo la LECTURA: `?refrescar=1` recalcula, pero deja la
   caché al día (si no, refrescar dejaría la siguiente consulta igual de lenta). */
/* ---------- lo que dice el índice PUBLICADO (no un recálculo) ----------
   Se busca con la clave CANÓNICA —la misma con la que el detalle agrupa el
   corpus— y, si no está, con la clave LEGADO (`norm` a secas): el hash que hay
   hoy en producción se escribió así y no se purga nunca, de modo que sin este
   segundo intento el detalle diría «sin clasificar» para todo el mundo hasta
   que alguien reconstruyera el índice.
   Vive aparte desde el 14-sep-2026 porque la tienen que llamar DOS caminos: el
   normal y el del barrido que no cupo en su presupuesto, que sirve justamente
   esto —dato publicado y completo— en vez de las cifras a medias del recuento. */
/* EL MISMO ALIAS POR NIT QUE EL CHIP (24-sep-2026). Con el NIT de la entidad,
   la búsqueda sigue ENTERA la de la tarjeta (`registroDe`: clave canónica,
   legado y alias `nit:` con su `ref`). Antes solo buscaba por nombre, así que
   una entidad que cambió de razón social —«MUNICIPIO DE CHÍA» hoy, «ALCALDÍA
   MUNICIPAL DE CHÍA» en los procesos cerrados, mismo NIT— salía en la tarjeta
   con su competencia y en el modal con «No hay procesos», sin «Quién gana
   aquí». Aquí el hash se lee campo a campo (HGET, en el orden de
   `clavesDeBusqueda`, hasta el primero que exista, y su `ref`) y se resuelve con
   `registroDe` sobre lo leído: no hay una segunda copia del orden.
   Devuelve también `porNit`: la clave canónica del nombre con el que la
   entidad figura en el histórico, cuando se la encontró por el alias. */
async function resolverPublicado(redis, nombreParaIndice, nit = null) {
  const lic = { entidad: nombreParaIndice, nit_entidad: nit || "" };
  const leer = async (campo) => {
    const crudo = await redis.hget(CLAVES.indice, campo);
    return typeof crudo === "string" ? JSON.parse(crudo) : crudo;
  };
  const leidos = {};
  let primera = null;
  try {
    for (const k of clavesDeBusqueda(lic)) {
      const v = await leer(k);
      if (!v) continue;
      leidos[k] = v;
      primera = k;
      if (v.ref) { const destino = await leer(v.ref); if (destino) leidos[v.ref] = destino; }
      break;
    }
  } catch { return { publicado: null, porNit: null }; } // índice sin construir: se informa igual
  const publicado = registroDe(leidos, lic);
  const alias = primera && primera.startsWith("nit:") && leidos[primera] && leidos[primera].ref;
  const porNit = alias && publicado && publicado.nombre ? claveBusqueda(publicado.nombre) || null : null;
  return { publicado, porNit };
}
async function leerPublicado(redis, nombreParaIndice, nit = null) {
  return (await resolverPublicado(redis, nombreParaIndice, nit)).publicado;
}
/* Un NIT que llega por la URL: solo dígitos y de un largo razonable. Cualquier
   otra cosa es INERTE —se busca por el nombre, como siempre—, nunca un 400. */
const nitDePeticion = (v) => {
  const d = String(v == null ? "" : v).replace(/\D/g, "");
  return d.length >= 6 && d.length <= 15 ? d : null;
};

async function detalleEntidad(redis, entidadCruda, {
  usarCache = true, log = () => {},
  // solo las pruebas lo bajan: así el tope se ejercita sin fabricar 200 filas
  maxProcesos = MAX_PROCESOS_DETALLE,
  // techo del barrido; lo bajan las pruebas para ejercitar la respuesta parcial
  presupuestoMs = PRESUPUESTO_BARRIDO_MS,
  /* `?publicado=1` (23-sep-2026): NO recorre el histórico. Responde al instante
     con lo que el índice publicó —banda, hechos y «quién gana aquí»— para que
     la pantalla lo pinte mientras pide el recorrido completo por separado. */
  soloPublicado = false,
  /* El NIT de la entidad, el que lleva el chip de la tarjeta (24-sep-2026).
     Opcional: sin él —o ilegible— se busca por el nombre, como siempre. */
  nit = null,
} = {}) {
  const pedida = String(entidadCruda == null ? "" : entidadCruda).replace(/\s+/g, " ").trim();
  if (!pedida) return { estado: 400, cuerpo: { ok: false, error: "entidad requerida" } };
  if (pedida.length > LARGO_MAX_ENTIDAD) {
    return { estado: 400, cuerpo: { ok: false, error: `entidad requerida (máximo ${LARGO_MAX_ENTIDAD} caracteres)` } };
  }
  const buscada = claveBusqueda(pedida);
  if (!buscada) return { estado: 400, cuerpo: { ok: false, error: "entidad requerida" } };
  /* CON EL NIT, LA ENTIDAD SE BUSCA COMO LA BUSCA EL CHIP (24-sep-2026): si el
     alias `nit:` la lleva al nombre con el que figura en el histórico, ESE es
     el que se recorre, se cachea y se lee en «quién gana aquí» (`objetivo`). La
     respuesta lo declara (`identificada_por_nit`) para que la pantalla diga con
     qué nombre figura: las cifras son de esa entidad, no de un parecido. */
  const nitPedido = nitDePeticion(nit);
  const resuelto = nitPedido ? await resolverPublicado(redis, pedida, nitPedido) : null;
  const objetivo = (resuelto && resuelto.porNit) || buscada;
  const porNit = objetivo !== buscada ? { identificada_por_nit: nitPedido } : {};

  if (soloPublicado) {
    /* Dos a cuatro HGET y ni un SCAN ni un MGET de trozos: el coste no depende
       del corpus. `procesos` va vacío DECLARANDO por qué (`barrido.motivo`), así
       que la pantalla no puede leerlo como «no hay procesos». No se cachea:
       leer lo publicado ya es tan barato como leer la caché. */
    const [publicado, pub] = await Promise.all([
      resuelto ? resuelto.publicado : leerPublicado(redis, pedida), leerGanadoresPublicados(redis, objetivo),
    ]);
    return {
      estado: 200,
      cuerpo: {
        ok: true,
        // sin registro publicado no se sabe si la entidad existe en el corpus: sin dato, no «no»
        encontrada: publicado || pub ? true : null,
        entidad: (publicado && publicado.nombre) || pedida,
        entidad_normalizada: objetivo,
        ...porNit,
        indice: indiceDePublicado(publicado),
        adjudicatarios: adjudicatariosPublicados(pub),
        proponentes: null, ejecucion: null,
        procesos: [], excluidos: [], truncado: null,
        barrido: { completo: false, motivo: "solo_publicado" },
        mensaje: null,
        cache: false, generado: new Date().toISOString(),
      },
    };
  }

  const meta = await leerJSON(redis, CLAVES.indiceMeta);
  const sello = (meta && meta.construido) || "sin-indice";

  if (usarCache) {
    const enCache = await leerCache(redis, objetivo, sello);
    if (enCache) {
      log(`detalle de «${pedida}» servido desde caché`);
      return { estado: 200, cuerpo: { ...enCache.cuerpo, cache: true, ...porNit } };
    }
  }

  /* ---------- barrido del corpus histórico, CON TECHO ----------
     Este barrido lee el histórico ENTERO para quedarse con los procesos de UNA
     entidad, y su coste lo fija el corpus, que solo crece. El 14-sep-2026 eso
     se cobró en producción: el modal de «INSTITUTO DE VALORIZACION DE
     MANIZALES» murió con un 504 —Vercel corta la función a los 60 s
     (`vercel.json`, `api/inteligencia.js`)— y el usuario se quedó con un error
     que además hablaba de la sesión. El presupuesto no arregla el diseño (eso
     es un índice por entidad, `docs/PLAN_REFORMA_DATOS.md`); lo que hace es
     convertir un corte MUDO de la plataforma en una respuesta que dice la
     verdad y llega siempre. */
  const claves = await redis.scan(CLAVES.patronChunksHist);
  let chunksCorruptos = 0;
  let barridoParcial = null;
  const registros = await leerChunksDedup(redis, claves, {
    onCorrupto: () => { chunksCorruptos++; },
    hasta: Date.now() + presupuestoMs,
    onIncompleto: (d) => { barridoParcial = d; },
  });

  const normalizar = memoNormalizador(claveBusqueda);
  const procesos = [], excluidos = [];
  const histograma = {};
  const porAnio = {};
  let suma = 0, contados = 0, adjudicados = 0, coincidencias = 0;
  let nombreOriginal = null;
  const nombresVistos = new Map(); // nombre crudo → veces (gana el más frecuente)
  const nitsVistos = new Map();    // NIT → veces (el más frecuente identifica a la entidad en jbjy)
  /* ---------- quién gana aquí ----------
     La lista blanca de `proyectarProceso` NO cambia: las filas siguen sin
     adjudicatario. Lo que se publica es el AGREGADO —quién gana y cuántas
     veces—, que es la señal #11 del manual (histórico de 1-2 oferentes /
     ganador recurrente) hecha dato. Es información pública de SECOP y este
     endpoint ya exige token. Se acumula sobre TODOS los adjudicados con
     ganador identificado, tengan o no conteo de oferentes: un ganador es un
     hecho aunque el dataset calle cuántos compitieron. El acumulador y su
     resumen son los de lib/indice_competencia (`acumularGanador`,
     `ganadoresDe`): los MISMOS con los que el índice publica este bloque. */
  const ganadores = nuevoAcumuladorGanadores();

  for (const lic of registros) {
    if (normalizar(lic.entidad) !== objetivo) continue;
    coincidencias++;
    const crudo = String(lic.entidad || "").trim();
    if (crudo) nombresVistos.set(crudo, (nombresVistos.get(crudo) || 0) + 1);
    const nitCrudo = String(lic.nit_entidad || "").replace(/\D/g, "");
    if (nitCrudo) nitsVistos.set(nitCrudo, (nitsVistos.get(nitCrudo) || 0) + 1);

    // el MISMO predicado del índice (regla de oro: el detalle no es un segundo cálculo)
    const adjudicado = cuentaParaCompetencia(lic);
    if (!adjudicado) {
      // cerrado sin ganador (desierto, cancelado, revocado) → no dice nada de
      // competencia, pero se muestra para que el conteo cuadre a la vista
      if (!estado_abierto(lic)) {
        excluidos.push(proyectarProceso(lic, null, { motivo_exclusion: "sin_adjudicacion" }));
      }
      continue;
    }
    adjudicados++;
    acumularGanador(ganadores, lic, claveAdjudicatario(lic));
    const ofertas = oferentesDe(lic);
    if (ofertas == null) {
      /* La propia cubeta dice «el dataset no dice cuántos se presentaron»: el
         campo no puede afirmar 0. `null`, como su cubeta hermana
         `sin_adjudicacion` — el frontend ya lo trata igual (27-ago-2026). */
      excluidos.push(proyectarProceso(lic, null, { motivo_exclusion: "sin_dato_oferentes" }));
      continue;
    }
    contados++;
    suma += ofertas;
    histograma[ofertas] = (histograma[ofertas] || 0) + 1;
    procesos.push(proyectarProceso(lic, ofertas, { incluido_en_promedio: true }));
    // reparto TEMPORAL con la MISMA regla de año del índice (adjudicación →
    // publicación → "sin_fecha"): sirve para VER si el promedio de dos años
    // mezcla un período atípico (ley de garantías 2026) — todavía no segmenta
    const anio = anioDe(lic);
    const a = porAnio[anio] || (porAnio[anio] = { n: 0, suma: 0 });
    a.n++; a.suma += ofertas;
  }

  for (const [nombre, veces] of nombresVistos) {
    if (!nombreOriginal || veces > nombresVistos.get(nombreOriginal)) nombreOriginal = nombre;
  }

  /* ---------- el barrido no cupo en su presupuesto ----------
     TODO lo que el bucle de arriba acaba de contar es PARCIAL: se leyeron unos
     chunks y no otros, así que `contados`, `adjudicados`, el histograma y los
     ganadores describen un trozo del corpus elegido por el reloj. Publicarlos
     sería exactamente la cifra creíble y equivocada que esta aplicación no
     puede permitirse — peor que la que falta, porque nadie sabría que falta.
     Y `coincidencias === 0` tampoco puede leerse como «esta entidad no tiene
     procesos»: puede que sus chunks fueran los que no se alcanzaron.
     Así que se sirve lo ÚNICO completo que hay: lo que el índice PUBLICÓ para
     esta entidad —promedio, nivel, conteos y hechos, calculados en su día sobre
     el corpus entero—, la lista auditable se declara no disponible con su
     motivo, y no se cachea: la próxima pulsación vuelve a intentarlo.
     Desde el 23-sep-2026 lo publicado incluye «quién gana aquí» (hash aparte):
     antes este camino lo dejaba en null y el bloque desaparecía de la pantalla
     sin aviso, en todas las entidades a la vez. */
  if (barridoParcial) {
    const [publicadoParcial, pub] = await Promise.all([
      leerPublicado(redis, nombreOriginal || pedida, nitPedido), leerGanadoresPublicados(redis, objetivo),
    ]);
    log(`detalle de «${pedida}»: barrido incompleto (${barridoParcial.leidas}/${barridoParcial.totales} chunks en ${presupuestoMs} ms)`);
    /* SIN «QUIÉN GANA AQUÍ» PUBLICADO, REINTENTAR NO ES EL ARREGLO (24-sep-2026).
       Con la construcción vigente escrita por una versión anterior —desplegado
       y sin reconstruir—, el resumen no trae quién gana y la revisión de todos
       los procesos no cabe: el modal pedía «Vuelva a intentarlo» y el botón
       repetía el mismo recorrido que no cabe, sin decir qué lo arregla. Ahora
       lo dice, con los nombres de la pantalla donde se arregla, y la respuesta
       lo declara (`barrido.reintento_util: false`) para que la pantalla no
       ofrezca repetirlo. Cuándo: la meta de la última construcción no dice que
       se publicara quién gana (una anterior al cambio no lo dice nunca) y esta
       entidad no está en el resumen guardado. */
    const sinResumenGanadores = !pub && !(meta && meta.ganadores && meta.ganadores.publicado === true);
    /* El mensaje dice el HECHO, sin jerga («índice», «histórico demasiado
       grande», «son ciertas»): qué no alcanzó a armarse, de dónde sale lo que
       sí se ve y qué hacer. La fecha del resumen la pinta la pantalla. */
    const mensaje = sinResumenGanadores
      ? "La revisión de todos los procesos de esta entidad no alcanzó a terminar en el tiempo disponible, y el resumen guardado todavía no trae quién gana aquí. "
        + "Lo arregla armar ese resumen: pulse «Recalcular qué tan peleadas están» en Mi empresa (Tablero de procesos, apartado avanzado); tarda unos minutos. "
        + "Si nadie lo pulsa, se arma solo con la actualización mensual del histórico."
      : publicadoParcial || pub
        ? "La lista de procesos de esta entidad no alcanzó a armarse en el tiempo disponible. Lo demás que se ve en esta ventana sale del resumen guardado con todos los procesos ya cerrados. Vuelva a intentarlo para ver la lista."
        : "La lista de procesos de esta entidad no alcanzó a armarse en el tiempo disponible y el resumen guardado todavía no la incluye, así que no hay cifras que enseñar sin inventarlas. Vuelva a intentarlo en unos segundos.";
    return {
      estado: 200,
      cuerpo: {
        ok: true, encontrada: true,
        // con el recorrido cortado puede que no se haya leído ninguna fila: el nombre del resumen
        entidad: nombreOriginal || (publicadoParcial && publicadoParcial.nombre) || pedida,
        entidad_normalizada: objetivo,
        ...porNit,
        indice: indiceDePublicado(publicadoParcial),
        adjudicatarios: adjudicatariosPublicados(pub), proponentes: null, ejecucion: null,
        procesos: [], excluidos: [], truncado: null,
        /* El estado se DECLARA como un campo, no solo en la frase: la pantalla
           tiene que poder distinguir «no hay datos» de «no se pudieron leer». */
        barrido: {
          completo: false,
          motivo: "tiempo",
          chunks_leidos: barridoParcial.leidas,
          chunks_totales: barridoParcial.totales,
          presupuesto_ms: presupuestoMs,
          reintento_util: !sinResumenGanadores,
        },
        mensaje,
        chunks_ilegibles: chunksCorruptos,
        cache: false, generado: new Date().toISOString(),
      },
    };
  }

  if (!coincidencias) {
    const cuerpo = {
      ok: true, encontrada: false,
      entidad: pedida, entidad_normalizada: objetivo,
      indice: null, procesos: [], excluidos: [], adjudicatarios: null,
      mensaje: "No hay procesos de esta entidad en el corpus histórico. "
        + "Puede que el nombre no coincida con el del dataset, o que el backfill histórico aún no se haya ejecutado.",
      chunks_ilegibles: chunksCorruptos,
      cache: false, generado: new Date().toISOString(),
    };
    // se cachea también el «no hay»: repetir el barrido completo de 731 chunks
    // para volver a no encontrar nada es el peor uso posible del presupuesto
    if (!chunksCorruptos) await guardarCache(redis, objetivo, { sello, cuerpo });
    return { estado: 200, cuerpo: { ...cuerpo, ...porNit } };
  }

  /* ---------- lo que dice el índice PUBLICADO (no un recálculo) ----------
     Se busca con la clave CANÓNICA —la misma con la que se acaba de agrupar el
     corpus— y, si no está, con la clave LEGADO (`norm` a secas): el hash que
     hay hoy en producción se escribió así y no se purga nunca, de modo que sin
     este segundo intento el detalle diría «sin clasificar» para todo el mundo
     hasta que alguien reconstruyera el índice. */
  const nombreParaIndice = nombreOriginal || pedida;
  const publicado = await leerPublicado(redis, nombreParaIndice, nitPedido);

  /* ---------- por debajo del mínimo: TODO va a excluidos ----------
     Es la respuesta a «¿por qué esta entidad sale en ⚪?». Con menos de
     MIN_PROCESOS procesos útiles el promedio es ruido, así que no se presenta
     como si fuera un promedio: se muestran los procesos marcados y con el
     motivo escrito. */
  const suficientes = contados >= MIN_PROCESOS;
  if (!suficientes) {
    for (const p of procesos) {
      excluidos.push({ ...p, incluido_en_promedio: false, motivo_exclusion: "insuficientes_datos" });
    }
    procesos.length = 0;
  }

  const valores = Object.keys(histograma).map(Number);
  const promedio = contados ? Math.round((suma / contados) * 10) / 10 : null;
  /* NINGUNA cifra derivada sale de aquí sin el mínimo de procesos detrás —
     tampoco la del bloque `publicado`, que es un espejo del hash y en
     producción puede seguir trayendo el promedio que escribió la versión
     anterior para entidades de 3 procesos. El CONTEO publicado sí se conserva:
     es lo que permite ver de un vistazo si el índice y el recuento divergen,
     que es para lo que existe el bloque. */
  const indice = {
    nivel: suficientes && publicado && ["baja", "media", "alta"].includes(publicado.nivel)
      ? publicado.nivel : "sin_dato",
    promedio_oferentes: suficientes ? promedio : null,
    mediana_oferentes: suficientes ? medianaHistograma(histograma, contados) : null,
    min_oferentes: valores.length ? Math.min(...valores) : null,
    max_oferentes: valores.length ? Math.max(...valores) : null,
    procesos_contados: contados,
    total_procesos_adjudicados: adjudicados,
    total_procesos_historico: coincidencias,
    min_procesos: MIN_PROCESOS,
    // lo que el índice publicó, para poder detectar una divergencia de un vistazo
    publicado: publicado
      ? {
        promedio: suficientes ? (publicado.promedio ?? null) : null,
        procesos: publicado.procesos ?? publicado.procesos_contados ?? 0,
        nivel: suficientes ? (publicado.nivel || null) : "sin_dato",
      }
      : null,
    /* ENCOGIMIENTO (A2/A3, ago 2026): lo que el índice publicó como estimador
       de rivales — otro objeto que el promedio (ver lib/indice_competencia).
       Solo si el hash reconstruido lo trae; con el viejo, null. */
    encogimiento: publicado && publicado.rivales_estimados != null
      ? {
        rivales_estimados: publicado.rivales_estimados,
        peso_datos: publicado.peso_datos ?? null,
        rivales_desv: publicado.rivales_desv ?? null,
        prior: publicado.prior ?? null,
        prior_origen: publicado.prior_origen ?? null,
      }
      : null,
    /* REPARTO POR AÑO de los procesos contados: n siempre (es un hecho); el
       promedio del año solo con ≥ MIN_PROCESOS procesos en ESE año — la misma
       regla que el promedio de la entidad. La ley de garantías 2026 (convenios
       bloqueados desde el 8-nov-2025, contratación directa desde el 31-ene-2026,
       hasta el 31-may-2026) obligó a competir y el promedio de dos años lo
       mezcla sin saberlo: aquí se ve. */
    reparto_por_anio: Object.fromEntries(Object.entries(porAnio).sort().map(([anio, a]) => [anio, {
      procesos: a.n,
      promedio_oferentes: a.n >= MIN_PROCESOS ? Math.round((a.suma / a.n) * 10) / 10 : null,
    }])),
    /* PRÓRROGA DEL CIERRE (M-DGF-06, 6-sep-2026): los conteos que el ÍNDICE
       publicó por entidad (`registroPublicado`), espejados sin recontar — el
       dato publicado gana al calculado, y aquí no hay un segundo predicado que
       pudiera divergir. Null con un hash anterior a ese campo o sin señal
       acumulada: «sin dato», jamás un par de ceros. */
    prorroga: prorrogaPublicada(publicado),
    /* CUÁNTO TARDA EN ADJUDICAR y CUÁNTOS DECLARA DESIERTOS (M-DGF-08,
       6-sep-2026): espejo del hash con el lector ÚNICO del índice
       (`hechosDeRegistro`), sin recontar aquí — el dato publicado gana al
       calculado, y así no hay un segundo predicado de «desierto» ni una
       segunda cuenta de días hábiles. Null con un hash anterior al campo. */
    ...hechosDeRegistro(publicado),
  };

  /* ---------- el agregado de ganadores ----------
     `ganadoresDe` (lib/indice_competencia) es el resumen ÚNICO: top con el
     identificador rotulado por su tipo (un `codigoproveedor` no es un NIT),
     concentración solo con base suficiente (el mismo MIN_PROCESOS del índice)
     y los empates deshechos con una regla fija. Es la misma función con la que
     el índice publica este bloque: lo recorrido aquí y lo publicado cuadran. */
  const resumenGanadores = ganadoresDe(ganadores);
  const adjudicatarios = {
    ...resumenGanadores,
    lectura: lecturaDe(resumenGanadores.concentracion),
    origen: "barrido",   // contado ahora, sobre el corpus entero
  };

  procesos.sort(porOfertasAsc);
  excluidos.sort(porFechaDesc);
  const truncado = {
    limite: maxProcesos,
    procesos: procesos.length > maxProcesos ? procesos.length : 0,
    excluidos: excluidos.length > maxProcesos ? excluidos.length : 0,
  };

  /* ---------- contra quién se ha competido aquí (hgi6-6wh3, en vivo) ----------
     El corpus dice quién GANÓ; hgi6 dice quiénes SE PRESENTARON, ganaran o no.
     Se consulta por los ids de proceso de ESTA entidad que ya están en el
     corpus (los más recientes primero, tope en el módulo), nunca por NIT ni
     por nombre. Best-effort con tiempo acotado: si el dataset no responde, el
     detalle sale igual y el bloque dice por qué. Se cachea con el detalle. */
  const idsProponentes = [...procesos, ...excluidos].sort(porFechaDesc).map((p) => p.id).filter(Boolean);
  /* ---------- cómo ejecuta sus contratos (jbjy-vk9h, en vivo) ----------
     Prórrogas, suspensiones y pagos registrados de los contratos de obra ya
     firmados. Se consulta por el NIT más frecuente de la entidad en el corpus
     y se filtra por su NOMBRE canónico (los NIT se comparten). Las dos
     consultas externas corren EN PARALELO: cada una tiene su propio tiempo
     acotado y ninguna puede tumbar el detalle. */
  const nitEntidad = [...nitsVistos.entries()].sort((a, b) => b[1] - a[1]).map(([n]) => n)[0] || null;
  const [proponentes, ejecucion] = await Promise.all([
    proponentesDeProcesos(idsProponentes, { log }),
    ejecucionDeEntidad({ nit: nitEntidad, nombre: nombreOriginal || pedida }, { log }),
  ]);

  const cuerpo = {
    ok: true, encontrada: true,
    entidad: nombreOriginal || pedida,   // el nombre TAL COMO viene en los datos
    entidad_normalizada: objetivo,
    indice,
    adjudicatarios,
    proponentes,
    ejecucion,
    // el tope corta por los más RECIENTES: si una entidad tiene 400 procesos,
    // los últimos son los que describen su competencia de hoy
    procesos: (truncado.procesos ? [...procesos].sort(porFechaDesc).slice(0, maxProcesos).sort(porOfertasAsc) : procesos),
    excluidos: excluidos.slice(0, maxProcesos),
    truncado: (truncado.procesos || truncado.excluidos) ? truncado : null,
    /* El ⚪ NUNCA puede quedarse sin explicación, y son DOS causas distintas:
       · no hay base (menos de MIN_PROCESOS procesos contables);
       · sí la hay, pero el ÍNDICE no tiene clasificada a esta entidad. Pasa de
         verdad y de forma permanente: el índice solo se reconstruye a mano
         (/api/sync/historico?reconstruir_indice=true) mientras el delta sigue
         engordando el histórico en cada visita, así que el recuento adelanta al
         hash. Sin este mensaje, el modal enseñaba la banda ⚪ «Sin datos
         históricos» con un promedio de 8 procesos justo debajo, y las dos cosas
         no se podían conciliar mirando la pantalla. */
    mensaje: !suficientes
      ? `Esta entidad no tiene suficientes procesos adjudicados con dato de oferentes en el histórico (mínimo ${MIN_PROCESOS}); por eso aparece como «sin datos».`
      : indice.nivel === "sin_dato"
        ? `Hay ${contados} procesos con dato de oferentes —suficientes para un promedio—, pero el índice de competencia todavía no tiene clasificada a esta entidad: se construye a mano y el histórico ha crecido desde entonces. Reconstrúyalo con /api/sync/historico?reconstruir_indice=true para que la tarjeta deje de mostrarla como «sin datos».`
        : null,
    chunks_ilegibles: chunksCorruptos,
    cache: false, generado: new Date().toISOString(),
  };
  /* Una respuesta calculada sobre un corpus incompleto NO se cachea: sería
     congelar el error una hora. Y eso vale IGUAL para las dos fuentes VIVAS
     (ago 2026): si hgi6 o jbjy no respondieron —tiempo agotado, dataset
     caído—, su `ok:false` se guardaba con el resto y se servía 60 minutos sin
     reintentar, mientras la pantalla no manda `refrescar=1` por ningún camino.
     Un best-effort que no se puede reintentar deja de ser best-effort. */
  const fuentesVivasOk = (!proponentes || proponentes.ok !== false) && (!ejecucion || ejecucion.ok !== false);
  if (chunksCorruptos) log(`aviso: ${chunksCorruptos} chunks del histórico ilegibles (se omitieron; sin cachear)`);
  else if (!fuentesVivasOk) log("aviso: alguna fuente en vivo no respondió; no se cachea para poder reintentar");
  else await guardarCache(redis, objetivo, { sello, cuerpo });
  return { estado: 200, cuerpo: { ...cuerpo, ...porNit } };
}

/* ======================== detalleAdjudicatario ==========================
   La hoja de vida del COMPETIDOR: en qué entidades gana, cuántas veces, por
   cuánto y cuándo fue su último contrato — la «base de datos de la
   competencia» del manual (truco #17) hecha vista. Se llega desde la tabla
   «Quién gana aquí» con la `clave` que ese mismo agregado publica.

   Reglas que hereda enteras:
   · la identidad es `claveAdjudicatario` — LA MISMA función del agregado y de
     las equivalencias, jamás una segunda definición de «quién es quién»;
   · el identificador viaja con su TIPO (un codigoproveedor no es un NIT);
   · la ventana y el alcance van DECLARADOS en la respuesta: solo el corpus
     compatible (modalidades competitivas, obra y afines) desde 2024 — la
     decisión del dueño—, así que los conteos son una COTA INFERIOR de lo que
     el proveedor gana en todo SECOP;
   · si el dataset identificó al mismo proveedor a veces por NIT y a veces
     solo por nombre, cada identidad cuenta aparte — se dice, no se fusiona a
     ojo.
   · desde el 23-sep-2026 se sirve también PUBLICADO (sin recorrer) y el
     recorrido lleva el mismo techo que la vista de la entidad. */

/* ---------- el perfil PUBLICADO (23-sep-2026) ----------
   Lo acumula `construirIndice` con `acumularPerfil` → `perfilDe`, las MISMAS
   funciones del recorrido de abajo, y lo guarda en `indice:adjudicatario`, una
   entrada por clave de adjudicatario. Sin la baja con la que gana: esa solo la
   calcula el recorrido completo (ver `BAJA_SOLO_EN_REVISION`). */
async function leerPerfilPublicado(redis, clave) {
  let r;
  try {
    const crudo = await redis.hget(CLAVES.indiceAdjudicatario, clave);
    r = typeof crudo === "string" ? JSON.parse(crudo) : crudo;
  } catch { return null; }
  r = perfilExpandido(r); // en el hash las entidades van como filas compactas
  if (!r) return null;
  const ganados = maquina(r.total_ganados);
  if (ganados == null || ganados <= 0) return null;
  return { ...r, total_ganados: ganados, construido: typeof r.construido === "string" ? r.construido : null };
}

/* BAJA MEDIA CON LA QUE GANA (M-COMP-01): el registro publicable de la regla
   del índice (mínimo, anulación bajo él, nivel) y, aparte, la mediana ENCOGIDA
   hacia la referencia global con la meta del índice —solo para el factor de
   precio, como en la tarjeta: lo que se ENSEÑA es la medida—. Sin meta (índice
   de baja sin construir) la encogida es la medida con `peso_datos: 1`, que es
   lo que `encogerBaja` ya hace. Un ranking de adjudicatarios por baja no
   existe: cada cifra viaja con su n. Una sola copia para lo recorrido y lo
   publicado; una baja cruda ilegible es «sin dato» (null), jamás «hay 0». */
function bajaMediaDe(baja, bajaDescartes, metaBaja) {
  if (!baja || typeof baja !== "object" || maquina(baja.n) == null || !baja.hist || typeof baja.hist !== "object") return null;
  const descartes = bajaDescartes && typeof bajaDescartes === "object" ? bajaDescartes : {};
  const regBaja = subRegistro({ n: maquina(baja.n), suma: maquina(baja.suma) ?? 0, hist: baja.hist }, MIN_PROCESOS_BAJA);
  const enc = regBaja.baja_mediana != null
    ? encogerBaja({ ...regBaja, procesos_contados: regBaja.procesos, modalidad_utilizada: null }, metaBaja)
    : null;
  return {
    mediana_pct: regBaja.baja_mediana,
    promedio_pct: regBaja.baja_promedio,
    p25_pct: regBaja.baja_p25,
    p75_pct: regBaja.baja_p75,
    nivel: regBaja.nivel,
    n: regBaja.procesos,
    min_procesos: MIN_PROCESOS_BAJA,
    origen: regBaja.baja_mediana != null ? "medida" : null,
    /* EL MOTIVO TIENE QUE SER EL DE VERDAD (remate B9b-H2, 6-sep-2026 · defecto
       reproducido). Un competidor que SECOP identifica solo por nombre —sin NIT,
       que la app dice que es frecuente— salía con «hacen falta 5 procesos
       ganados con presupuesto y valor adjudicado; hay 0» justo debajo de «6
       contratos»: los seis traían presupuesto y valor, y lo que los deja fuera
       es la regla de identidad del índice de baja (`adjudicatarioReal` exige
       NIT), no la falta de cifras. Una razón creíble y falsa es peor que una
       ausencia: quien la lee cree que el competidor casi no gana. La regla del
       índice NO se toca —es el lado conservador del módulo de precios, decisión
       del 6-sep— ; lo que cambia es lo que se DICE, y el «hay 0» desaparece. */
    motivo: regBaja.baja_mediana != null ? null
      : (Number(descartes.adjudicatario_no_definido) || 0) > 0
        ? `SECOP no publica el NIT del ganador en ${descartes.adjudicatario_no_definido === 1 ? "1 de los procesos que ganó" : `${descartes.adjudicatario_no_definido} de los procesos que ganó`}, y esta medida solo cuenta los que sí lo traen`
          + (regBaja.procesos > 0 ? `; con los ${regBaja.procesos} restantes no se llega a los ${MIN_PROCESOS_BAJA} que hacen falta` : "")
        : `hacen falta ${MIN_PROCESOS_BAJA} procesos con presupuesto y valor adjudicado y hay ${regBaja.procesos}`,
    encogida: enc ? {
      mediana_pct: enc.baja_mediana, peso_datos: enc.peso_datos ?? null,
      referencia: enc.referencia ?? null, referencia_mediana: enc.referencia_mediana ?? null,
    } : null,
    descartados: descartes,
  };
}

const QUE_ES_PERFIL = "Adjudicaciones de este proveedor en el corpus de la aplicación: procesos competitivos de obra y "
  + "servicios afines adjudicados desde 2024. Es una COTA INFERIOR de lo que gana en todo SECOP — lo que el "
  + "corpus no cubre (otros rubros, otras modalidades, años anteriores) no aparece aquí. Si el dataset lo "
  + "identificó a veces por NIT y a veces solo por nombre, cada identidad se cuenta aparte. "
  + "`baja_media` es cuánto descontó frente al presupuesto oficial en los procesos que ganó con presupuesto y "
  + "valor adjudicado, con la misma regla del índice de baja (mínimo, exclusiones y encogimiento); "
  + "sin la base mínima viaja null con su motivo.";

/* La baja del perfil PUBLICADO es «sin dato» DECLARADO, con su motivo: su regla
   (`bajaDeFila`) vive en lib/indice_baja, que la pasada del índice de
   competencia no puede importar (la cadena de lib/filtros no puede alcanzarla:
   sería un ciclo de requires, y la suite lo vigila sobre el grafo real). Copiarla
   sería una segunda aritmética de «cuánto descontó». Así que la cifra sale solo
   de la revisión completa y, mientras tanto, se dice por qué falta — jamás «hay 0». */
const BAJA_SOLO_EN_REVISION = Object.freeze({
  mediana_pct: null, promedio_pct: null, p25_pct: null, p75_pct: null,
  nivel: "sin_dato", n: null, min_procesos: MIN_PROCESOS_BAJA, origen: null,
  motivo: "se calcula al revisar todos sus contratos; el resumen guardado no la incluye",
  encogida: null, descartados: null,
});

/* El cuerpo del perfil a partir de `perfilDe` (recorrido, con su baja) o del
   registro publicado (sin ella): una sola forma para los dos orígenes. */
async function cuerpoPerfil(redis, perfil, extra, baja = null) {
  let metaBaja = null;
  if (baja) { try { metaBaja = await leerIndiceBajaMeta(redis); } catch { metaBaja = null; } }
  return {
    ok: true,
    encontrado: perfil.total_ganados > 0,
    clave: perfil.clave,
    nombre: perfil.nombre,
    identificacion: perfil.identificacion || null,
    total_ganados: perfil.total_ganados,
    valor_adjudicado_cop: perfil.valor_adjudicado_cop ?? null,
    procesos_con_valor: perfil.procesos_con_valor ?? null,
    ultima_adjudicacion: perfil.ultima_adjudicacion || null,
    baja_media: baja ? bajaMediaDe(baja.cruda, baja.descartes, metaBaja) : { ...BAJA_SOLO_EN_REVISION },
    entidades: perfil.entidades,
    que_es: QUE_ES_PERFIL,
    ...extra,
    generado: new Date().toISOString(),
  };
}

/* Sin recorrido completo y sin registro publicado: nada que enseñar sin
   inventarlo. `encontrado: null` —no se sabe—, jamás `false` («no ha ganado
   nada» sería la afirmación que el recorrido no sostiene). */
const perfilSinDato = (clave, extra) => ({
  ok: true, encontrado: null, clave,
  nombre: null, identificacion: null,
  total_ganados: null, valor_adjudicado_cop: null, procesos_con_valor: null, ultima_adjudicacion: null,
  baja_media: null, entidades: [],
  que_es: QUE_ES_PERFIL,
  ...extra,
  generado: new Date().toISOString(),
});

async function detalleAdjudicatario(redis, claveCruda, {
  usarCache = true, log = () => {},
  /* 23-sep-2026: el MISMO techo que op=entidad. Sin él este recorrido tardó 82 s
     medidos contra un corte de 60 (diagnóstico «modal-entidad»). */
  presupuestoMs = PRESUPUESTO_BARRIDO_MS,
  // `?publicado=1`: sin recorrido, desde `indice:adjudicatario`
  soloPublicado = false,
} = {}) {
  const clave = String(claveCruda == null ? "" : claveCruda).replace(/\s+/g, " ").trim();
  if (!clave || clave.length > 200 || !/^(nit:|n:)/.test(clave)) {
    return {
      estado: 400,
      cuerpo: { ok: false, error: "adjudicatario requerido: pase la clave que publica el detalle de la entidad (adjudicatarios.top[].clave)" },
    };
  }

  if (soloPublicado) {
    const pub = await leerPerfilPublicado(redis, clave);
    const barrido = { completo: false, motivo: "solo_publicado" };
    return {
      estado: 200,
      cuerpo: pub
        ? await cuerpoPerfil(redis, pub, { origen: "publicado", construido: pub.construido, barrido, cache: false })
        : perfilSinDato(clave, { origen: null, barrido, mensaje: null, cache: false }),
    };
  }

  const meta = await leerJSON(redis, CLAVES.indiceMeta);
  const sello = (meta && meta.construido) || "sin-indice";
  const claveDeCache = `adj:${clave}`;
  if (usarCache) {
    const enCache = await leerCache(redis, claveDeCache, sello);
    if (enCache) {
      log(`perfil de «${clave}» servido desde caché`);
      return { estado: 200, cuerpo: { ...enCache.cuerpo, cache: true } };
    }
  }

  const clavesChunks = await redis.scan(CLAVES.patronChunksHist);
  let chunksCorruptos = 0;
  let barridoParcial = null;
  const registros = await leerChunksDedup(redis, clavesChunks, {
    onCorrupto: () => { chunksCorruptos++; },
    hasta: Date.now() + presupuestoMs,
    onIncompleto: (d) => { barridoParcial = d; },
  });

  /* El recorrido no cupo: lo contado describe un trozo del corpus elegido por
     el reloj y NO sale (sería la cifra creíble y equivocada). Se sirve el
     perfil publicado si lo hay; si no, nada. Y no se cachea. */
  if (barridoParcial) {
    log(`perfil de «${clave}»: barrido incompleto (${barridoParcial.leidas}/${barridoParcial.totales} chunks en ${presupuestoMs} ms)`);
    const pub = await leerPerfilPublicado(redis, clave);
    const barrido = {
      completo: false, motivo: "tiempo",
      chunks_leidos: barridoParcial.leidas, chunks_totales: barridoParcial.totales, presupuesto_ms: presupuestoMs,
    };
    const extra = { barrido, chunks_ilegibles: chunksCorruptos, cache: false };
    return {
      estado: 200,
      cuerpo: pub
        ? await cuerpoPerfil(redis, pub, {
          ...extra, origen: "publicado", construido: pub.construido,
          mensaje: "La revisión de todos los contratos no alcanzó a terminar en el tiempo disponible. Lo que se ve sale del resumen guardado. Vuelva a intentarlo para verlo al día de hoy.",
        })
        : perfilSinDato(clave, {
          ...extra, origen: null,
          mensaje: "La revisión de todos los contratos no alcanzó a terminar en el tiempo disponible y el resumen guardado todavía no incluye a este proveedor. Vuelva a intentarlo en unos segundos.",
        }),
    };
  }

  /* la acumulación y el resumen son los de lib/indice_competencia
     (`acumularPerfil`, `perfilDe`): los MISMOS con los que el índice publica el
     perfil, así que lo recorrido y lo publicado cuadran */
  const acc = nuevoAcumuladorPerfil();
  /* la baja por fila, con la regla del índice de baja; los descartes se cuentan
     con la MISMA clave que la meta del índice para que se lean igual */
  const cruda = { n: 0, suma: 0, hist: {} };
  const descartes = {};
  for (const lic of registros) {
    if (!esAdjudicado(lic)) continue; // aquí sí: quién GANÓ, no cuántos se presentaron
    const quien = claveAdjudicatario(lic);
    if (quien.clave !== clave) continue;
    acumularPerfil(acc, lic, quien);
    const fb = bajaDeFila(lic);
    if (fb.descarte) descartes[fb.descarte] = (descartes[fb.descarte] || 0) + 1;
    else { cruda.n++; cruda.suma += fb.baja; const c = Math.round(fb.baja); cruda.hist[c] = (cruda.hist[c] || 0) + 1; }
  }
  const cuerpo = await cuerpoPerfil(redis, perfilDe(clave, acc), {
    origen: "barrido", chunks_ilegibles: chunksCorruptos, cache: false,
  }, { cruda, descartes });
  if (chunksCorruptos) log(`aviso: ${chunksCorruptos} chunks ilegibles en el perfil de «${clave}» (sin cachear)`);
  else await guardarCache(redis, claveDeCache, { sello, cuerpo });
  return { estado: 200, cuerpo };
}

module.exports = {
  MAX_PROCESOS_DETALLE, TTL_CACHE_SEG, LARGO_MAX_ENTIDAD,
  claveIndice, claveBusqueda, memoNormalizador, proyectarProceso,
  claveCache, detalleEntidad, detalleAdjudicatario,
};
