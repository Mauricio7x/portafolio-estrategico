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
  CAMPOS_FECHA_ADJUDICACION, CAMPOS_ADJUDICATARIO, CAMPOS_VALOR_ADJUDICADO, claveCanonica,
} = require("./indice_competencia.js");
/* Identidad del GANADOR: la misma que usan las equivalencias (NIT primero,
   nombre normalizado de respaldo; «No Definido» no es un NIT y cae al nombre).
   Una segunda definición de «quién ganó» divergiría a la primera corrección. */
const { claveAdjudicatario } = require("./equivalencias.js");
const { proponentesDeProcesos } = require("./proponentes.js");
const { ejecucionDeEntidad } = require("./ejecucion.js");

const MAX_PROCESOS_DETALLE = 200;   // tope por lista en la respuesta
const TTL_CACHE_SEG = 3600;         // 1 hora
const LARGO_MAX_ENTIDAD = 300;

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
   histórico pero no salen de aquí (mismo criterio que /api/oportunidades). */
function primeraFecha(lic) {
  for (const c of CAMPOS_FECHA_ADJUDICACION) {
    const v = lic[c];
    if (v && !isNaN(Date.parse(v))) return String(v).slice(0, 10);
  }
  return null;
}

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
const claveCache = (buscada) => `${CLAVES.detalleCompetencia}v5:${buscada}`; // v4: + proponentes (hgi6) · v5: + ejecucion (jbjy)

async function leerCache(redis, buscada, sello) {
  const v = await redis.get(claveCache(buscada));
  if (v == null) return null;
  const obj = descomprimir(v);
  if (!obj || obj.sello !== sello) return null; // índice reconstruido: caché vieja
  return obj;
}
const guardarCache = (redis, buscada, obj) =>
  redis.set(claveCache(buscada), comprimir(obj), { ex: TTL_CACHE_SEG });

/* ============================ detalleEntidad ============================ */
/* Devuelve {estado, cuerpo}. `estado` es el HTTP que debe responder el
   handler; el módulo no toca `req`/`res` para poder probarlo suelto. */
/* `usarCache` controla solo la LECTURA: `?refrescar=1` recalcula, pero deja la
   caché al día (si no, refrescar dejaría la siguiente consulta igual de lenta). */
async function detalleEntidad(redis, entidadCruda, {
  usarCache = true, log = () => {},
  // solo las pruebas lo bajan: así el tope se ejercita sin fabricar 200 filas
  maxProcesos = MAX_PROCESOS_DETALLE,
} = {}) {
  const pedida = String(entidadCruda == null ? "" : entidadCruda).replace(/\s+/g, " ").trim();
  if (!pedida) return { estado: 400, cuerpo: { ok: false, error: "entidad requerida" } };
  if (pedida.length > LARGO_MAX_ENTIDAD) {
    return { estado: 400, cuerpo: { ok: false, error: `entidad requerida (máximo ${LARGO_MAX_ENTIDAD} caracteres)` } };
  }
  const buscada = claveBusqueda(pedida);
  if (!buscada) return { estado: 400, cuerpo: { ok: false, error: "entidad requerida" } };

  const meta = await leerJSON(redis, CLAVES.indiceMeta);
  const sello = (meta && meta.construido) || "sin-indice";

  if (usarCache) {
    const enCache = await leerCache(redis, buscada, sello);
    if (enCache) {
      log(`detalle de «${pedida}» servido desde caché`);
      return { estado: 200, cuerpo: { ...enCache.cuerpo, cache: true } };
    }
  }

  /* ---------- barrido del corpus histórico ---------- */
  const claves = await redis.scan(CLAVES.patronChunksHist);
  let chunksCorruptos = 0;
  const registros = await leerChunksDedup(redis, claves, {
    onCorrupto: () => { chunksCorruptos++; },
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
     hecho aunque el dataset calle cuántos compitieron. */
  const ganadores = new Map();   // claveAdjudicatario → acumulador
  let sinAdjudicatario = 0;      // adjudicados donde el dataset no dice quién ganó

  for (const lic of registros) {
    if (normalizar(lic.entidad) !== buscada) continue;
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
    const quien = claveAdjudicatario(lic);
    if (!quien.clave) {
      sinAdjudicatario++;
    } else {
      let g = ganadores.get(quien.clave);
      if (!g) {
        g = {
          nombres: new Map(),
          /* `valor` del identificador + `campo` de origen: los candidatos de
             CAMPOS_ADJUDICATARIO_NIT no son todos NITs (en producción GPS
             S.A.S llega con nit «No Definido» y solo el código interno
             `codigoproveedor`), así que el rótulo se decide al publicar. */
          id_valor: quien.clave.startsWith("nit:") ? quien.clave.slice(4) : null,
          id_campo: quien.campo || null,
          clave: quien.clave, // la llave del perfil del competidor (vista adjudicatario)
          ganados: 0, valor: 0, con_valor: 0, ultima: null,
        };
        ganadores.set(quien.clave, g);
      }
      g.ganados++;
      for (const c of CAMPOS_ADJUDICATARIO) {
        const v = String(lic[c] == null ? "" : lic[c]).trim();
        if (v) { g.nombres.set(v, (g.nombres.get(v) || 0) + 1); break; }
      }
      for (const c of CAMPOS_VALOR_ADJUDICADO) {
        const n = parseFloat(lic[c]);
        // un 0 no es un valor adjudicado: es «sin dato» (regla de anticipo_pct)
        if (Number.isFinite(n) && n > 0) { g.valor += n; g.con_valor++; break; }
      }
      const f = primeraFecha(lic);
      if (f && (!g.ultima || f > g.ultima)) g.ultima = f;
    }
    const ofertas = oferentesDe(lic);
    if (ofertas == null) {
      excluidos.push(proyectarProceso(lic, 0, { motivo_exclusion: "sin_dato_oferentes" }));
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

  if (!coincidencias) {
    const cuerpo = {
      ok: true, encontrada: false,
      entidad: pedida, entidad_normalizada: buscada,
      indice: null, procesos: [], excluidos: [], adjudicatarios: null,
      mensaje: "No hay procesos de esta entidad en el corpus histórico. "
        + "Puede que el nombre no coincida con el del dataset, o que el backfill histórico aún no se haya ejecutado.",
      chunks_ilegibles: chunksCorruptos,
      cache: false, generado: new Date().toISOString(),
    };
    // se cachea también el «no hay»: repetir el barrido completo de 731 chunks
    // para volver a no encontrar nada es el peor uso posible del presupuesto
    if (!chunksCorruptos) await guardarCache(redis, buscada, { sello, cuerpo });
    return { estado: 200, cuerpo };
  }

  /* ---------- lo que dice el índice PUBLICADO (no un recálculo) ----------
     Se busca con la clave CANÓNICA —la misma con la que se acaba de agrupar el
     corpus— y, si no está, con la clave LEGADO (`norm` a secas): el hash que
     hay hoy en producción se escribió así y no se purga nunca, de modo que sin
     este segundo intento el detalle diría «sin clasificar» para todo el mundo
     hasta que alguien reconstruyera el índice. */
  const nombreParaIndice = nombreOriginal || pedida;
  let publicado = null;
  try {
    const leer = async (campo) => {
      const crudo = await redis.hget(CLAVES.indice, campo);
      return typeof crudo === "string" ? JSON.parse(crudo) : crudo;
    };
    publicado = await leer(claveIndice(nombreParaIndice));
    if (!publicado) {
      const legado = norm(nombreParaIndice);
      if (legado !== claveIndice(nombreParaIndice)) publicado = await leer(legado);
    }
    if (publicado && publicado.ref) publicado = await leer(publicado.ref);
  } catch { publicado = null; } // índice sin construir: se informa igual

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
  };

  /* ---------- el agregado de ganadores ----------
     La concentración solo se publica con base suficiente (el mismo
     MIN_PROCESOS del índice): un «ganó el 100 %» sobre 2 procesos es la
     cifra sin base que este proyecto ya pagó («18.2 oferentes»). Y la
     LECTURA lleva las DOS interpretaciones a la vez — nicho ganable O pliego
     sastre — porque el manual sostiene ambas y afirmar una sola sin evidencia
     sería decidir por el usuario con un dato que no alcanza para decidir. */
  const conGanador = adjudicados - sinAdjudicatario;
  /* El identificador se publica CON SU TIPO. «NIT» solo cuando el dato salió
     de un campo de NIT del dataset; el `codigoproveedor` es el código interno
     de SECOP (aparece cuando el NIT llega como «No Definido») y rotularlo
     «NIT» sería una cifra con rótulo falso — la familia de `verificado: true`
     que no dice qué se verificó. */
  const CAMPOS_NIT_REAL = new Set(["nit_del_proveedor_adjudicado", "adjudicatario_nit"]);
  const tipoIdentificacion = (campo) => (CAMPOS_NIT_REAL.has(campo) ? "nit"
    : campo === "documento_proveedor" ? "documento" : "codigo_secop");
  const top = [...ganadores.values()]
    .map((g) => {
      let nombre = null, veces = 0;
      for (const [n, v] of g.nombres) if (v > veces) { nombre = n; veces = v; }
      const tipo = g.id_valor ? tipoIdentificacion(g.id_campo) : null;
      return {
        clave: g.clave,
        nombre: nombre || (g.id_valor
          ? (tipo === "nit" ? `NIT ${g.id_valor}` : `Proveedor ${g.id_valor}`)
          : "(sin nombre)"),
        // `nit` conserva su contrato: SOLO un NIT de verdad. Lo demás viaja
        // en `identificacion`, con el tipo dicho.
        nit: tipo === "nit" ? g.id_valor : null,
        identificacion: g.id_valor ? { tipo, valor: g.id_valor } : null,
        ganados: g.ganados,
        // suma solo de los procesos con valor legible; sin ninguno, null (no 0)
        valor_adjudicado_cop: g.con_valor ? Math.round(g.valor) : null,
        procesos_con_valor: g.con_valor,
        ultima_adjudicacion: g.ultima,
      };
    })
    .sort((a, b) => b.ganados - a.ganados
      || (b.valor_adjudicado_cop ?? -1) - (a.valor_adjudicado_cop ?? -1));
  const lider = top[0] || null;
  const concentracion = conGanador >= MIN_PROCESOS && lider
    ? {
      lider: lider.nombre,
      ganados: lider.ganados,
      base: conGanador,
      pct: Math.round((lider.ganados / conGanador) * 100),
    }
    : null;
  const adjudicatarios = {
    top: top.slice(0, 5),
    distintos: ganadores.size,
    procesos_con_ganador: conGanador,
    sin_adjudicatario: sinAdjudicatario,
    min_procesos: MIN_PROCESOS,
    concentracion,
    lectura: concentracion && concentracion.pct >= 50
      ? `${concentracion.lider} ganó ${concentracion.ganados} de los ${concentracion.base} procesos adjudicados con ganador identificado. Esto tiene dos lecturas y las dos son posibles: un nicho con poca competencia donde se puede entrar a ganar, o pliegos hechos a la medida de ese contratista (señal de alerta n.º 11 del manual). Antes de invertir en una oferta aquí, revise un pliego reciente: experiencia hiperespecífica, indicadores financieros raros o marca de un solo fabricante lo delatan.`
      : null,
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
    entidad_normalizada: buscada,
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
        ? `Hay ${contados} procesos con dato de oferentes —suficientes para un promedio—, pero el índice de competencia todavía no tiene clasificada a esta entidad: se construye a mano y el histórico ha crecido desde entonces. Reconstrúyalo con /api/sync/historico?reconstruir_indice=true para que la tarjeta deje de mostrarla en ⚪.`
        : null,
    chunks_ilegibles: chunksCorruptos,
    cache: false, generado: new Date().toISOString(),
  };
  // una respuesta calculada sobre un corpus incompleto NO se cachea: sería
  // congelar el error una hora
  if (chunksCorruptos) log(`aviso: ${chunksCorruptos} chunks del histórico ilegibles (se omitieron; sin cachear)`);
  else await guardarCache(redis, buscada, { sello, cuerpo });
  return { estado: 200, cuerpo };
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
     ojo. */
async function detalleAdjudicatario(redis, claveCruda, { usarCache = true, log = () => {} } = {}) {
  const clave = String(claveCruda == null ? "" : claveCruda).replace(/\s+/g, " ").trim();
  if (!clave || clave.length > 200 || !/^(nit:|n:)/.test(clave)) {
    return {
      estado: 400,
      cuerpo: { ok: false, error: "adjudicatario requerido: pase la clave que publica el detalle de la entidad (adjudicatarios.top[].clave)" },
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
  const registros = await leerChunksDedup(redis, clavesChunks, {
    onCorrupto: () => { chunksCorruptos++; },
  });

  const porEntidad = new Map();
  const nombresVistos = new Map();
  let ganados = 0, valorTotal = 0, conValor = 0, ultima = null, campo = null;
  for (const lic of registros) {
    if (!esAdjudicado(lic)) continue; // aquí sí: quién GANÓ, no cuántos se presentaron
    const quien = claveAdjudicatario(lic);
    if (quien.clave !== clave) continue;
    if (!campo) campo = quien.campo;
    ganados++;
    for (const c of CAMPOS_ADJUDICATARIO) {
      const v = String(lic[c] == null ? "" : lic[c]).trim();
      if (v) { nombresVistos.set(v, (nombresVistos.get(v) || 0) + 1); break; }
    }
    const ent = String(lic.entidad || "").trim() || "(entidad no informada)";
    let e = porEntidad.get(ent);
    if (!e) { e = { entidad: ent, ganados: 0, valor: 0, con_valor: 0, ultima: null }; porEntidad.set(ent, e); }
    e.ganados++;
    for (const c of CAMPOS_VALOR_ADJUDICADO) {
      const n = parseFloat(lic[c]);
      // un 0 no es un valor adjudicado: es «sin dato» (la regla de anticipo_pct)
      if (Number.isFinite(n) && n > 0) { e.valor += n; e.con_valor++; valorTotal += n; conValor++; break; }
    }
    const f = primeraFecha(lic);
    if (f) {
      if (!e.ultima || f > e.ultima) e.ultima = f;
      if (!ultima || f > ultima) ultima = f;
    }
  }

  let nombre = null, veces = 0;
  for (const [n, v] of nombresVistos) if (v > veces) { nombre = n; veces = v; }
  const idValor = clave.startsWith("nit:") ? clave.slice(4) : null;
  const NIT_REAL = new Set(["nit_del_proveedor_adjudicado", "adjudicatario_nit"]);
  const tipo = idValor
    ? (NIT_REAL.has(campo) ? "nit" : campo === "documento_proveedor" ? "documento" : campo === "codigoproveedor" ? "codigo_secop" : "nit")
    : null;

  const cuerpo = {
    ok: true,
    encontrado: ganados > 0,
    clave,
    nombre: nombre || (idValor ? (tipo === "nit" ? `NIT ${idValor}` : `Proveedor ${idValor}`) : "(sin nombre)"),
    identificacion: idValor && ganados > 0 ? { tipo, valor: idValor } : null,
    total_ganados: ganados,
    valor_adjudicado_cop: conValor ? Math.round(valorTotal) : null,
    procesos_con_valor: conValor,
    ultima_adjudicacion: ultima,
    entidades: [...porEntidad.values()]
      .map((e) => ({
        entidad: e.entidad,
        ganados: e.ganados,
        valor_adjudicado_cop: e.con_valor ? Math.round(e.valor) : null,
        procesos_con_valor: e.con_valor,
        ultima_adjudicacion: e.ultima,
      }))
      .sort((a, b) => b.ganados - a.ganados
        || (b.valor_adjudicado_cop ?? -1) - (a.valor_adjudicado_cop ?? -1)),
    que_es: "Adjudicaciones de este proveedor en el corpus de la aplicación: procesos competitivos de obra y "
      + "servicios afines adjudicados desde 2024. Es una COTA INFERIOR de lo que gana en todo SECOP — lo que el "
      + "corpus no cubre (otros rubros, otras modalidades, años anteriores) no aparece aquí. Si el dataset lo "
      + "identificó a veces por NIT y a veces solo por nombre, cada identidad se cuenta aparte.",
    chunks_ilegibles: chunksCorruptos,
    cache: false,
    generado: new Date().toISOString(),
  };
  if (chunksCorruptos) log(`aviso: ${chunksCorruptos} chunks ilegibles en el perfil de «${clave}» (sin cachear)`);
  else await guardarCache(redis, claveDeCache, { sello, cuerpo });
  return { estado: 200, cuerpo };
}

module.exports = {
  MAX_PROCESOS_DETALLE, TTL_CACHE_SEG, LARGO_MAX_ENTIDAD,
  claveIndice, claveBusqueda, memoNormalizador, proyectarProceso,
  claveCache, detalleEntidad, detalleAdjudicatario,
};
