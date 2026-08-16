/* ============================================================================
   lib/indice_competencia · ¿En qué entidades se presenta menos gente?
   ----------------------------------------------------------------------------
   El puntaje ponderado dice «dónde mirar primero»; este índice dice «dónde es
   más PROBABLE GANAR». Se construye sobre el corpus HISTÓRICO
   (licitaciones:historico:mes:*:chunk:*, que jamás se purga) y responde, por
   entidad: cuántos oferentes se presentan en promedio a sus procesos.

     construirIndice(redis, {presupuestoMs})  → recorre el histórico mes a mes
                                                (REANUDABLE) y publica el hash
                                                indice:competencia
     competenciaDe(indice, licitacion)        → {nivel, promedio_oferentes, …}

   Clasificación en TERTILES sobre el promedio de oferentes:
     "baja"     tercio con MENOS oferentes → MÁS atractiva (más probable ganar)
     "media"    tercio intermedio
     "alta"     tercio con MÁS oferentes  → MENOS atractiva
     "sin_dato" entidad con menos de MIN_PROCESOS procesos útiles, o ausente

   Reglas de honestidad del dato (mismo criterio que `anticipo_pct = 0` en
   lib/negocio: si la fuente no lo dice, no se inventa):

   · Solo cuentan los procesos con evidencia de ADJUDICACIÓN y con un conteo de
     oferentes ≥ 1. Un «0 oferentes» en un proceso adjudicado es un hueco del
     dataset, no una subasta desierta: contarlo como 0 arrastraría el promedio
     de la entidad a cero y TODAS acabarían clasificadas como «baja». Los
     descartes quedan contados en la meta del índice para auditarlo.
   · MIN_PROCESOS = 5: por debajo de eso el promedio es ruido — la entidad se
     marca "sin_dato" y en el orden queda por delante de las de alta
     competencia (no sabemos, pero puede ser oportunidad).

   ── ENCOGIMIENTO (ago 2026 · docs/PROBABILIDAD_MEJORADA.md A2/A3) ─────────
   El mínimo de 5 es correcto PARA PUBLICAR un promedio (la lección de «18,2
   oferentes sin base»), pero como ESTIMADOR de rivales era un acantilado: una
   entidad con 4 procesos y promedio 2 caía al respaldo (5 rivales, p = 0,17) y
   con 5 procesos saltaba a p = 0,43 — ×2,60 por UN proceso más, sin que el
   mercado hubiera cambiado. Ahora cada entidad publica ADEMÁS:
     rivales_estimados  r̂ = w·r̄_e + (1−w)·μ     media posterior gamma-Poisson
     peso_datos         w = n_e / (n_e + m)     cuánto pesan sus propios datos
     rivales_desv       √Var(r̂) = √((n_e·r̄_e + m·μ) / (n_e+m)²)   la banda
   con μ = el PRIOR de la entidad — el promedio de SU departamento encogido a su
   vez hacia el nacional (B7, `estimarPriorDepartamental`), o el nacional si el
   departamento no se conoce — y
   m = max(μ, σ̂²_dentro)/τ̂², donde τ̂² es la varianza ENTRE entidades descontado
   el ruido muestral y σ̂²_dentro la varianza dentro de entidad medida (método de
   los momentos sobre este mismo acumulador; el doc pone μ, que es el caso
   Poisson — con conteos sobredispersos sería asumir menos ruido del que hay). Si τ̂² ≤ 0 la dimensión
   «entidad» no distingue nada: m = ∞, w = 0, todo se encoge a μ y la meta lo
   dice (`encogimiento.entidad_no_distingue`).
   `promedio`, `mediana` y `oferentes_total` SIGUEN en null bajo el mínimo:
   «¿cuál es el promedio medido de esta entidad?» y «¿cuántos rivales espero?»
   son dos preguntas distintas y el badge solo responde la primera. Un hash
   escrito por la versión anterior no trae estos campos y `competenciaDe`
   responde EXACTAMENTE como antes: desplegar no exige reconstruir.
   `por_anio` (procesos y oferentes por año de adjudicación) se acumula para
   poder VER si el promedio de dos años mezcla un período atípico (la ley de
   garantías 2026, B2 del mismo doc): todavía no segmenta, solo se publica.

   Nombres de columna: este entorno de desarrollo NO alcanza datos.gov.co
   (allowlist del proxy — verificado: CONNECT 403), así que las candidatas de
   oferentes/adjudicación están PENDIENTES DE VERIFICACIÓN contra el dataset
   real. Por eso se leen por LISTA DE CANDIDATAS en orden de preferencia y no
   por un nombre único: si p6dx-8zbt usa otro, basta añadirlo aquí y reconstruir
   el índice (GET /api/sync/historico?reconstruir_indice=true) — sin re-extraer.
   ========================================================================== */
"use strict";

const {
  CLAVES, leerChunksDedup, leerJSON, escribirJSON,
  leerJSONComprimido, escribirJSONComprimido,
} = require("./almacen.js");
/* `norm` se toma de lib/semantica (su casa desde jul 2026) y NO de lib/filtros,
   que la re-exporta: filtros ya depende de lib/equivalencias y esta de aquí —
   importarla de filtros cerraría un ciclo de requires y dejaría este módulo
   con un `norm` sin definir en tiempo de carga. */
const { norm } = require("./semantica.js");

const MIN_PROCESOS = 5;          // menos de 5 procesos útiles → "sin_dato"
const CAMPOS_POR_HSET = 200;     // campos por comando HSET (payload acotado)
const MAX_OFERENTES = 500;       // cota de cordura: valores mayores son basura

/* ---------- columnas del dataset (candidatas, pendiente verificación) ----------
   Nº de oferentes, de la más específica a la más genérica. `numero_de_ofertas`
   y `numero_proponentes` son las pedidas en el encargo; `proveedores_unicos_con`
   y `conteo_de_respuestas_a_ofertas` son las que p6dx-8zbt trae hoy (ya estaban
   en la proyección y en lib/negocio.COMPETENCIA_CAMPOS). */
const OFERENTES_CAMPOS = [
  "numero_de_ofertas", "numero_proponentes", "numero_de_proponentes", "numero_ofertas",
  "proveedores_unicos_con", "conteo_de_respuestas_a_ofertas",
  "respuestas_al_procedimiento", "respuestas_externas", "proponentes",
];

/* Datos de adjudicación. NO se guardan en el corpus activo (solo en el
   histórico) ni se exponen en /api/oportunidades: allí solo viaja el resumen
   agregado por entidad. */
const CAMPOS_ADJUDICATARIO = [
  "nombre_del_proveedor", "adjudicatario_nombre", "proveedor_adjudicado", "nombre_del_adjudicador",
];
const CAMPOS_ADJUDICATARIO_NIT = [
  "nit_del_proveedor_adjudicado", "adjudicatario_nit", "documento_proveedor", "codigoproveedor",
];
const CAMPOS_VALOR_ADJUDICADO = [
  "valor_total_adjudicacion", "valor_adjudicado", "valor_adjudicacion",
];
const CAMPOS_FECHA_ADJUDICACION = ["fecha_adjudicacion", "fecha_de_adjudicacion"];

/* Todo lo que la proyección histórica debe conservar (lib/proyeccion.js). */
const CAMPOS_ADJUDICACION = [...new Set([
  ...CAMPOS_ADJUDICATARIO, ...CAMPOS_ADJUDICATARIO_NIT,
  ...CAMPOS_VALOR_ADJUDICADO, ...CAMPOS_FECHA_ADJUDICACION,
  ...OFERENTES_CAMPOS,
  "id_adjudicacion", "departamento_proveedor", "ciudad_proveedor",
  "proveedores_invitados", "proveedores_que_manifestaron", "numero_de_lotes",
])];

/* Estados que evidencian que el proceso YA tuvo ganador (normalizados). */
const ESTADOS_ADJUDICADOS = [
  "adjudicado", "celebrado", "en ejecucion", "ejecucion", "terminado",
  "liquidado", "adjudicacion",
].map(norm);

/* ---------- lectura tolerante ---------- */
function numero(v) {
  if (v == null || v === "") return null;
  const n = parseFloat(String(v).replace(/[^\d.,-]/g, "").replace(/\.(?=\d{3}\b)/g, "").replace(",", "."));
  return isNaN(n) ? null : n;
}
const primero = (lic, campos) => {
  for (const c of campos) {
    const v = lic[c];
    if (v != null && String(v).trim() !== "") return v;
  }
  return null;
};

/* Nº de oferentes del proceso, o null si la fuente no lo dice. El 0 es «sin
   dato» a propósito (ver cabecera), nunca «nadie se presentó». */
function oferentesDe(lic) {
  for (const c of OFERENTES_CAMPOS) {
    const n = numero(lic[c]);
    if (n != null && n >= 1 && n <= MAX_OFERENTES) return Math.round(n);
  }
  const propio = numero(lic.oferentes); // derivado guardado por la proyección histórica
  return propio != null && propio >= 1 && propio <= MAX_OFERENTES ? Math.round(propio) : null;
}

/* ¿El proceso llegó a tener ganador? Señales, de la más dura a la más blanda. */
function esAdjudicado(lic) {
  if (norm(lic.adjudicado) === "si") return true;
  if (primero(lic, CAMPOS_ADJUDICATARIO) || primero(lic, CAMPOS_ADJUDICATARIO_NIT)) return true;
  if (primero(lic, CAMPOS_FECHA_ADJUDICACION)) return true;
  const valor = numero(primero(lic, CAMPOS_VALOR_ADJUDICADO));
  if (valor != null && valor > 0) return true;
  for (const v of [lic.estado_del_procedimiento, lic.fase]) {
    const n = norm(v);
    if (n && ESTADOS_ADJUDICADOS.some((e) => n === e || n.startsWith(e))) return true;
  }
  return false;
}

/* ---------- identidad de la entidad: UNA sola definición ----------
   `claveCanonica` es la ÚNICA forma de decir «estas dos filas son la misma
   entidad» en todo el proyecto: `norm` (sin acentos, minúsculas, espacios
   colapsados) MÁS el descarte de la puntuación.

   Por qué la puntuación (ago 2026, defecto real): el mismo organismo aparece en
   el dataset como «… RIOS NEGRO - NARE» y «… RIOS NEGRO NARE». Con `norm` a
   secas son DOS entidades: el índice les partía el historial en dos registros
   de 2 y 3 procesos —ninguno llegaba al mínimo— mientras
   /api/competencia-detalle, que sí quitaba la puntuación, los contaba juntos y
   veía 5. El badge decía ⚪ y el detalle enseñaba un promedio de 5 procesos, y
   los dos tenían razón según su propia definición de «entidad». El problema no
   era el cálculo: eran dos identidades distintas para la misma cosa.

   `claveLegado` es la clave ANTERIOR (`norm` sin más). Se conserva SOLO para
   leer: `indice:competencia` no se purga nunca, así que el hash que hay hoy en
   producción está escrito con ella y tiene que seguir resolviéndose hasta que
   alguien reconstruya el índice. No se escribe jamás. */
const claveCanonica = (s) => norm(s).replace(/[^a-z0-9ñ ]+/g, " ").replace(/\s+/g, " ").trim();

/* Clave de entidad: el nombre canónico manda (siempre viene) y el NIT entra
   como alias, para que un cambio de razón social no parta el historial. */
function claveEntidad(lic) {
  const nit = String(lic.nit_entidad || "").replace(/\D/g, "");
  const canonica = claveCanonica(lic.entidad);
  const legado = norm(lic.entidad);
  return {
    clave: canonica || (nit ? `nit:${nit}` : ""),
    claveLegado: legado || (nit ? `nit:${nit}` : ""),
    aliasNit: nit ? `nit:${nit}` : null,
    nombre: String(lic.entidad || "").trim() || (nit ? `NIT ${nit}` : "Entidad no informada"),
    nit: nit || null,
  };
}

/* ---------- tertiles ---------- */
/* Cortes en los promedios ORDENADOS. Se comparan con `<=` para que entidades
   con el mismo promedio caigan siempre en el mismo nivel. */
function cortesTertiles(promediosOrdenados) {
  const n = promediosOrdenados.length;
  if (!n) return null;
  const min = promediosOrdenados[0], max = promediosOrdenados[n - 1];
  if (min === max) return { c1: null, c2: null, degenerado: true }; // sin poder discriminante
  const idx = (frac) => Math.min(n - 1, Math.max(0, Math.ceil(n * frac) - 1));
  return { c1: promediosOrdenados[idx(1 / 3)], c2: promediosOrdenados[idx(2 / 3)], degenerado: false };
}
function nivelPorCortes(promedio, cortes) {
  if (!cortes || cortes.degenerado) return "media"; // todas iguales: ninguna destaca
  if (promedio <= cortes.c1) return "baja";
  if (promedio <= cortes.c2) return "media";
  return "alta";
}

/* Mediana a partir del histograma {oferentes: veces} (sin guardar la muestra). */
function medianaHistograma(histograma, n) {
  if (!n) return null;
  const valores = Object.keys(histograma).map(Number).sort((a, b) => a - b);
  const i1 = Math.floor((n - 1) / 2), i2 = Math.ceil((n - 1) / 2);
  let acumulado = 0, lo = null, hi = null;
  for (const v of valores) {
    acumulado += histograma[v];
    if (lo === null && i1 < acumulado) lo = v;
    if (hi === null && i2 < acumulado) { hi = v; break; }
  }
  return lo == null || hi == null ? null : (lo + hi) / 2;
}

const redondear = (n) => Math.round(n * 10) / 10;

/* ---------- qué se PUBLICA por entidad ----------
   Una entidad por debajo de MIN_PROCESOS no se clasifica… pero hasta ago 2026
   SÍ se publicaba su `promedio`. El registro quedaba
   `{procesos: 3, promedio: 18.2, nivel: "sin_dato"}` y cualquier consumidor que
   pintara el promedio sin mirar el nivel enseñaba una cifra sin ninguna base
   («18.2 oferentes en 0 procesos» en producción). El promedio de 3 procesos no
   es un promedio: es ruido con dos decimales.

   Regla: por debajo del mínimo NO SE PUBLICA NINGUNA CIFRA DERIVADA (ni
   promedio, ni mediana, ni el total de oferentes con el que se podría
   recalcular). Solo el conteo —que es un hecho, y es lo que explica el ⚪— y el
   nivel "sin_dato".

   `procesos_contados` viaja como ALIAS de `procesos`: es el nombre con el que
   se pide el dato desde fuera, y tenerlo escrito evita que un consumidor lea
   `undefined` y lo interprete como cero. El lector acepta los dos nombres. */
function registroPublicado(e, encogimiento = null) {
  const comun = {
    nombre: e.nombre, nit: e.nit,
    procesos: e.procesos, procesos_contados: e.procesos,
    min_procesos: MIN_PROCESOS,
  };
  /* Los campos de ENCOGIMIENTO se publican para TODAS las entidades, también
     bajo el mínimo: son el estimador de rivales (otro objeto que el promedio,
     ver cabecera), no la cifra medida. Solo cuando se pudo estimar `m`. */
  const enc = encogerEntidad(e, encogimiento);
  const extra = enc ? { ...enc } : {};
  if (e.por_anio && typeof e.por_anio === "object") extra.por_anio = e.por_anio;
  if (e.procesos < MIN_PROCESOS) {
    return { ...comun, oferentes_total: null, promedio: null, mediana: null, nivel: "sin_dato", ...extra };
  }
  return { ...comun, oferentes_total: e.oferentes_total, promedio: e.promedio, mediana: e.mediana, nivel: e.nivel, ...extra };
}

/* ---------- acumulación ---------- */
function acumular(acc, stats, lic) {
  stats.filas++;
  if (!esAdjudicado(lic)) { stats.sin_adjudicacion++; return; }
  const oferentes = oferentesDe(lic);
  if (oferentes == null) { stats.sin_oferentes++; return; }
  const { clave, nombre, nit } = claveEntidad(lic);
  if (!clave) { stats.sin_entidad = (stats.sin_entidad || 0) + 1; return; }
  const e = acc[clave] || (acc[clave] = { nombre, nit, procesos: 0, suma: 0, histograma: {} });
  if (!e.nit && nit) e.nit = nit;
  // departamento de la entidad (B7: prior por departamento). Se queda el
  // primero visto no vacío; una entidad no cambia de departamento.
  if (!e.depto) { const d = String(lic.departamento_entidad || "").trim().toUpperCase(); if (d) e.depto = d; }
  e.procesos++;
  e.suma += oferentes;
  e.histograma[oferentes] = (e.histograma[oferentes] || 0) + 1;
  // Σx² para la varianza DENTRO de la entidad (el ruido muestral que hay que
  // descontar al estimar τ²) y el reparto por AÑO. Un progreso guardado por la
  // versión anterior no trae estos campos: se crean al vuelo.
  e.suma2 = (e.suma2 || 0) + oferentes * oferentes;
  const anio = anioDe(lic);
  if (!e.por_anio) e.por_anio = {};
  const a = e.por_anio[anio] || (e.por_anio[anio] = { n: 0, suma: 0 });
  a.n++; a.suma += oferentes;
  /* Día de CIERRE (A7 · docs/PROBABILIDAD_MEJORADA.md §9.3): para medir si los
     procesos que una entidad cierra el MISMO día reciben menos ofertas. Se
     guarda [n, suma] por día — compacto, y es lo único que la medición
     necesita. Sin fecha de cierre legible, no entra en la medición (se cuenta). */
  /* B3: prórroga del cierre, si el delta la estampó al cerrar el proceso
     (`cierre_prorrogado` true/false; ausente = no se sabe, no entra). Con esto
     el ×1,20 se podrá medir cuando haya acumulación. */
  if (lic.cierre_prorrogado === true || lic.cierre_prorrogado === false) {
    const k = lic.cierre_prorrogado ? "prorrogados" : "no_prorrogados";
    if (!e.prorroga) e.prorroga = { prorrogados: [0, 0], no_prorrogados: [0, 0] };
    e.prorroga[k][0]++; e.prorroga[k][1] += oferentes;
  } else {
    stats.sin_senal_prorroga = (stats.sin_senal_prorroga || 0) + 1;
  }
  const dia = diaCierreDe(lic);
  if (dia) {
    if (!e.dias) e.dias = {};
    const d = e.dias[dia] || (e.dias[dia] = [0, 0]);
    d[0]++; d[1] += oferentes;
  } else {
    stats.sin_dia_cierre = (stats.sin_dia_cierre || 0) + 1;
  }
  stats.contados++;
}

/* Día (YYYY-MM-DD) del cierre, con la MISMA `fechaCierre` de lib/negocio que usa
   la app para todo lo demás — require DIFERIDO: negocio → filtros → equivalencias
   → este módulo cerraría un ciclo en tiempo de carga (la misma técnica que
   `cierre_vencido` en lib/filtros). Misma clave de día que `claveColision` en
   lib/probabilidad (los 10 primeros caracteres tal como vienen). */
function diaCierreDe(lic) {
  const { fechaCierre } = require("./negocio.js");
  const f = fechaCierre(lic);
  if (!f) return null;
  const d = String(f).slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : null;
}

/* ---------- B2 (medición previa) · oferentes por PERÍODO ----------
   La ley de garantías 2026 bloqueó convenios interadministrativos desde el
   8-nov-2025 y la contratación directa desde el 31-ene-2026, ambos hasta el
   31-may-2026: las entidades TUVIERON que competir y el promedio de dos años lo
   mezcla sin saberlo (CLAUDE.md, «Investigación de contraste»). Antes de
   segmentar el estimador hay que MEDIR si la ventana cambió los oferentes: se
   agregan los días de cierre (los mismos de `medirColision`) dentro y fuera de
   la ventana, pooled y ESTRATIFICADO por entidad (solo entidades con procesos en
   los dos lados: comparar entidades distintas mediría otra cosa). */
const VENTANA_GARANTIAS_2026 = { desde: "2025-11-08", hasta: "2026-05-31" };
const lecturaVentana = (c) => (c == null ? "sin entidades con procesos a los dos lados de la ventana: no se puede comparar"
  : Math.abs(c - 1) < 0.03 ? `cociente ≈1 (${redondear2(c)}): la ventana no cambió los oferentes por proceso; el promedio de dos años no mezcla nada raro`
    : c > 1 ? `cociente ${redondear2(c)}: durante la ventana se presentaron MÁS oferentes por proceso que en el resto del período de la misma entidad`
      : `cociente ${redondear2(c)}: durante la ventana se presentaron MENOS oferentes por proceso — más procesos compitiendo diluyen a los oferentes; `
        + "el promedio de dos años lo mezcla y este es el tamaño del sesgo. Es medición, no corrección: el estimador no segmenta.");
function medirPeriodos(entidades) {
  const porAnio = {};
  let dentroN = 0, dentroS = 0, fueraN = 0, fueraS = 0, esperadoDentro = 0, entsAmbos = 0;
  const cocientes = [];
  for (const e of entidades) {
    if (!e.dias) continue;
    let dN = 0, dS = 0, fN = 0, fS = 0;
    for (const [dia, d] of Object.entries(e.dias)) {
      const anio = dia.slice(0, 4);
      const a = porAnio[anio] || (porAnio[anio] = { procesos: 0, suma: 0 });
      a.procesos += d[0]; a.suma += d[1];
      if (dia >= VENTANA_GARANTIAS_2026.desde && dia <= VENTANA_GARANTIAS_2026.hasta) { dN += d[0]; dS += d[1]; }
      else { fN += d[0]; fS += d[1]; }
    }
    if (dN && fN) {
      entsAmbos++;
      dentroN += dN; dentroS += dS; fueraN += fN; fueraS += fS;
      esperadoDentro += dN * (fS / fN);   // lo que habrían recibido con el promedio de FUERA de su entidad
      if (dS > 0) cocientes.push((dS / dN) / (fS / fN));
    }
  }
  cocientes.sort((a, b) => a - b);
  const anios = Object.fromEntries(Object.entries(porAnio).sort().map(([a, x]) => [a, {
    procesos: x.procesos, promedio_oferentes: x.procesos ? redondear2(x.suma / x.procesos) : null,
  }]));
  return {
    por_anio: anios,
    ventana_garantias_2026: {
      ...VENTANA_GARANTIAS_2026,
      entidades_con_ambos_lados: entsAmbos,
      procesos_dentro: dentroN, procesos_fuera: fueraN,
      promedio_dentro: dentroN ? redondear2(dentroS / dentroN) : null,
      promedio_fuera_esperado: dentroN ? redondear2(esperadoDentro / dentroN) : null,
      // dentro ÷ fuera, estratificado por entidad: > 1 ⇒ en la ventana se presentó más gente
      cociente_pooled: dentroS > 0 && esperadoDentro > 0 ? redondear2(dentroS / esperadoDentro) : null,
      mediana_cocientes: cocientes.length ? redondear2(cocientes[Math.floor(cocientes.length / 2)]) : null,
      lectura: lecturaVentana(dentroS > 0 && esperadoDentro > 0 ? dentroS / esperadoDentro : null),
    },
    metodo: "días de cierre por entidad (los de medirColision); por año pooled; la ventana estratificada por entidad con los dos lados",
  };
}

/* ---------- B3 · efecto de la PRÓRROGA del cierre, medido cuando haya datos ----------
   Misma forma que la colisión: por entidad, prorrogados vs no prorrogados;
   pooled y estratificado. Solo cuentan los procesos que el delta estampó con
   `cierre_prorrogado` (los del backfill no lo traen: una sola versión). Hasta
   que haya ≥ COLISION_MIN_ENTIDADES (lib/probabilidad) entidades con los dos
   grupos, la meta dice «sin medición» y el 1,20 sigue como supuesto. */
function medirProrroga(entidades) {
  let ents = 0, nP = 0, nN = 0, sP = 0, esperadoP = 0, sumaP = 0, sumaPEsp = 0;
  const cocientes = [];
  for (const e of entidades) {
    const g = e.prorroga;
    if (!g || !g.prorrogados[0] || !g.no_prorrogados[0]) continue;
    ents++;
    const [np, sp] = g.prorrogados, [nn, sn] = g.no_prorrogados;
    const mP = sp / np, mN = sn / nn;
    nP += np; nN += nn; sP += sp; esperadoP += np * mN;
    sumaP += np / (1 + mP); sumaPEsp += np / (1 + mN);
    if (mP > 0) cocientes.push(mN / mP);
  }
  if (!ents) {
    return { entidades_con_ambos_grupos: 0, procesos_prorrogados: nP, procesos_no_prorrogados: nN,
      cociente_pooled: null, multiplicador_implicito: null, mediana_cocientes: null,
      mensaje: "sin entidades con procesos prorrogados y no prorrogados a la vez: la señal se acumula desde el 16-ago-2026 (delta); el backfill no la trae" };
  }
  cocientes.sort((a, b) => a - b);
  return {
    entidades_con_ambos_grupos: ents, procesos_prorrogados: nP, procesos_no_prorrogados: nN,
    promedio_oferentes_prorrogados: redondear2(sP / nP),
    promedio_oferentes_no_prorrogados_esperado: redondear2(esperadoP / nP),
    cociente_pooled: redondear2(esperadoP / sP),
    multiplicador_implicito: sumaPEsp > 0 ? redondear2(sumaP / sumaPEsp) : null,
    mediana_cocientes: redondear2(cocientes[Math.floor(cocientes.length / 2)]),
    metodo: "por entidad: prorrogados = procesos con cierre_prorrogado true, control = false; pooled entre entidades con los dos grupos (misma forma que la colisión)",
  };
}

/* ---------- A7 · efecto de la colisión de cierres, MEDIDO ----------
   §9.3 del doc: por entidad, «grupo colisión» = procesos cuyo día de cierre
   tiene ≥2 procesos de la MISMA entidad; «control» = el resto de la entidad.
   ESTRATIFICADO POR ENTIDAD, obligatorio: sin eso se mediría que las entidades
   grandes (que cierran muchos procesos el mismo día) reciben más ofertas, que
   es lo contrario de lo que se quiere medir. Solo entran entidades con los DOS
   grupos no vacíos.

   Estadístico pooled (Mantel-Haenszel sobre medias): oferentes que los procesos
   en colisión HABRÍAN recibido con el promedio de control de su entidad, dividido
   por los que recibieron. cociente ≈ 1 ⇒ el efecto no existe; ≈ 1,15 ⇒ el factor
   está bien puesto. Y `multiplicador_implicito` traduce ese cociente a lo que
   multiplica la probabilidad, que es 1/(1+r): (1 + r_ctrl)/(1 + r_col). Es lo
   que habría que comparar con FACTOR_COLISION_CIERRES. También la mediana de los
   cocientes por entidad, que no la arrastra ninguna gobernación. */
function medirColision(entidades) {
  let entidadesConAmbos = 0, procCol = 0, procCtrl = 0, sumCol = 0, esperadoCol = 0, sumCtrl = 0;
  let sumaP = 0, sumaPEsperada = 0; // 1/(1+r) por proceso, para el multiplicador implícito pooled
  const cocientes = [];
  for (const e of entidades) {
    if (!e.dias) continue;
    let nCol = 0, sCol = 0, nCtrl = 0, sCtrl = 0;
    for (const d of Object.values(e.dias)) {
      if (d[0] >= 2) { nCol += d[0]; sCol += d[1]; } else { nCtrl += d[0]; sCtrl += d[1]; }
    }
    if (!nCol || !nCtrl) continue;
    entidadesConAmbos++;
    const mCol = sCol / nCol, mCtrl = sCtrl / nCtrl;
    procCol += nCol; procCtrl += nCtrl; sumCol += sCol; sumCtrl += sCtrl;
    esperadoCol += nCol * mCtrl;
    sumaP += nCol / (1 + mCol); sumaPEsperada += nCol / (1 + mCtrl);
    if (mCol > 0) cocientes.push(mCtrl / mCol);
  }
  if (!entidadesConAmbos) {
    return { entidades_con_ambos_grupos: 0, procesos_colision: procCol, procesos_control: procCtrl,
      cociente_pooled: null, multiplicador_implicito: null, mediana_cocientes: null, mensaje: "sin entidades con procesos en colisión y de control a la vez: no se puede medir" };
  }
  cocientes.sort((a, b) => a - b);
  const mediana = cocientes.length ? cocientes[Math.floor(cocientes.length / 2)] : null;
  return {
    entidades_con_ambos_grupos: entidadesConAmbos,
    procesos_colision: procCol,
    procesos_control: procCtrl,
    promedio_oferentes_colision: redondear2(sumCol / procCol),
    promedio_oferentes_control_esperado: redondear2(esperadoCol / procCol),
    promedio_oferentes_control: redondear2(sumCtrl / procCtrl),
    // cociente de promedios del §9.3, estratificado (control ÷ colisión, pooled)
    cociente_pooled: redondear2(esperadoCol / sumCol),
    // lo que de verdad multiplicaría 1/(1+r): P observada en colisión ÷ P esperada con el control
    multiplicador_implicito: sumaPEsperada > 0 ? redondear2(sumaP / sumaPEsperada) : null,
    mediana_cocientes: mediana != null ? redondear2(mediana) : null,
    metodo: "por entidad: colisión = procesos cuyo día de cierre tiene ≥2 de la misma entidad, control = el resto; pooled entre entidades con los dos grupos (docs/PROBABILIDAD_MEJORADA.md §9.3)",
  };
}

/* Año del proceso para el reparto temporal: el de la adjudicación si viene, si
   no el de la publicación. Sin fecha legible, "sin_fecha" — se cuenta, no se
   adivina. */
function anioDe(lic) {
  const f = primero(lic, CAMPOS_FECHA_ADJUDICACION) || lic.fecha_de_publicacion_del || null;
  const m = f ? /^(\d{4})-\d{2}/.exec(String(f)) : null;
  return m ? m[1] : "sin_fecha";
}

/* ---------- encogimiento: μ, τ̂², m (método de los momentos) ----------
   Sobre el acumulador por entidad, sin guardar la muestra:
     μ    = Σ suma / Σ procesos                    (promedio global, por proceso)
     s²_i = (Σx² − n·r̄²)/(n−1)                     varianza dentro de la entidad i
     τ̂²   = Var(r̄_i) − mean(s²_i / n_i)            entre entidades, menos el ruido
     m    = μ / τ̂²                                  fuerza del prior, en «procesos»
   LA HETEROGENEIDAD SE ESTIMA SOBRE LAS ENTIDADES CON BASE (n ≥ MIN_PROCESOS)
   y el encogimiento se APLICA a todas. Estimarla con las de 1-4 procesos
   también fue el primer intento y la suite lo cazó: en un corpus con muchas
   entidades pequeñas y conteos ruidosos, el ruido muestral (s²/n, con n de 2)
   supera la varianza entre entidades y τ̂² sale ≤ 0 aunque las entidades con
   base difieran de sobra (3, 8 y 18 oferentes de promedio) — o sea, el ruido de
   las pequeñas anulaba la señal de las grandes. Con menos de
   MIN_ENTIDADES_ESTIMACION entidades con base no se estima nada: `null`, y el
   lector se comporta como el hash viejo. */
const MIN_ENTIDADES_ESTIMACION = 3;
function estimarEncogimiento(entidades) {
  const total = entidades.reduce((a, e) => a + e.procesos, 0);
  const sumaTotal = entidades.reduce((a, e) => a + e.oferentes_total, 0);
  if (!total) return null;
  const mu = sumaTotal / total;
  const conVar = entidades.filter((e) => e.procesos >= MIN_PROCESOS && Number.isFinite(e.suma2));
  if (conVar.length < MIN_ENTIDADES_ESTIMACION) {
    return { mu_global: redondear2(mu), tau2: null, m: null, entidades_estimacion: conVar.length,
      entidad_no_distingue: null, procesos: total,
      motivo: `hacen falta ${MIN_ENTIDADES_ESTIMACION} entidades con ≥${MIN_PROCESOS} procesos para estimar la heterogeneidad` };
  }
  const medias = conVar.map((e) => e.oferentes_total / e.procesos);
  const mediaDeMedias = medias.reduce((a, b) => a + b, 0) / medias.length;
  const varEntre = medias.reduce((a, r) => a + (r - mediaDeMedias) ** 2, 0) / (medias.length - 1);
  const ruido = conVar.reduce((a, e) => {
    const n = e.procesos, r = e.oferentes_total / n;
    const s2 = Math.max(0, (e.suma2 - n * r * r) / (n - 1));
    return a + s2 / n;
  }, 0) / conVar.length;
  const tau2 = varEntre - ruido;
  const noDistingue = !(tau2 > 0);
  /* Varianza DENTRO de entidad, ponderada por grados de libertad. `m` es
     «cuántos procesos vale el prior»: σ²_dentro / τ². Con Poisson σ²_dentro = μ
     (la fórmula del doc); los conteos reales están SOBREDISPERSOS, y asumir
     menos ruido del observado sobrepesaría el dato propio de una entidad de
     dos procesos. Se toma el MAYOR de los dos: nunca menos ruido del que hay. */
  const gl = conVar.reduce((a, e) => a + (e.procesos - 1), 0);
  const sigma2Dentro = gl > 0 ? conVar.reduce((a, e) => {
    const n = e.procesos, r = e.oferentes_total / n;
    return a + Math.max(0, e.suma2 - n * r * r);
  }, 0) / gl : mu;
  const m = noDistingue ? Infinity : Math.max(mu, sigma2Dentro) / tau2;
  const departamentos = estimarPriorDepartamental(entidades, mu);
  return {
    mu_global: redondear2(mu),
    tau2: redondear2(tau2),
    m: Number.isFinite(m) ? redondear2(m) : null,
    entidad_no_distingue: noDistingue,
    entidades_estimacion: conVar.length,
    procesos: total,
    var_entre_entidades: redondear2(varEntre),
    ruido_muestral: redondear2(ruido),
    sigma2_dentro: redondear2(sigma2Dentro),
    // B7: el prior de cada entidad es el de SU departamento, encogido a su vez hacia μ
    departamentos,
    metodo: `gamma-Poisson · método de los momentos sobre las entidades con ≥${MIN_PROCESOS} procesos (docs/PROBABILIDAD_MEJORADA.md §3.1)`,
  };
}
const redondear2 = (n) => Math.round(n * 100) / 100;

/* ---------- B7 · el prior por DEPARTAMENTO, «el mismo estimador un nivel arriba» ----------
   Los departamentos difieren de verdad (medido en producción: Bogotá 8,9
   oferentes por proceso, Boyacá 2,3, Arauca 1,5, Caldas 11,4), así que el
   prior de una entidad con pocos procesos es mejor si es el de SU departamento
   que el μ nacional. Pero un departamento con pocos procesos tampoco se toma al
   pie de la letra: μ̂_d = w_d·μ_d + (1−w_d)·μ, con w_d = n_d/(n_d + m_d) y m_d por
   método de los momentos ENTRE departamentos (τ_d² = Var(μ_d) − ruido;
   σ_d² = varianza dentro del departamento pooled; m_d = σ_d²/τ_d²). Solo entran
   en la estimación los departamentos con ≥ MIN_PROCESOS_DEPTO procesos. Con
   τ_d² ≤ 0 (los departamentos no distinguen) todo prior es μ y se declara. */
const MIN_PROCESOS_DEPTO = 30;
function estimarPriorDepartamental(entidades, mu) {
  const acc = {};
  for (const e of entidades) {
    if (!e.depto || !Number.isFinite(e.suma2)) continue;
    const d = acc[e.depto] || (acc[e.depto] = { procesos: 0, suma: 0, suma2: 0, entidades: 0 });
    d.procesos += e.procesos; d.suma += e.oferentes_total; d.suma2 += e.suma2; d.entidades++;
  }
  const conBase = Object.entries(acc).filter(([, d]) => d.procesos >= MIN_PROCESOS_DEPTO);
  const salida = { min_procesos: MIN_PROCESOS_DEPTO, con_base: conBase.length, total: Object.keys(acc).length,
    m: null, tau2: null, sigma2_dentro: null, no_distinguen: null, priors: {} };
  if (conBase.length < MIN_ENTIDADES_ESTIMACION) {
    salida.motivo = `hacen falta ${MIN_ENTIDADES_ESTIMACION} departamentos con ≥${MIN_PROCESOS_DEPTO} procesos`;
    return salida;
  }
  const medias = conBase.map(([, d]) => d.suma / d.procesos);
  const mm = medias.reduce((a, b) => a + b, 0) / medias.length;
  const varEntre = medias.reduce((a, r) => a + (r - mm) ** 2, 0) / (medias.length - 1);
  let ruido = 0, gl = 0, ss = 0;
  for (const [, d] of conBase) {
    const r = d.suma / d.procesos;
    const s2 = Math.max(0, (d.suma2 - d.procesos * r * r) / (d.procesos - 1));
    ruido += s2 / d.procesos; gl += d.procesos - 1; ss += (d.procesos - 1) * s2;
  }
  ruido /= conBase.length;
  const sigma2 = gl > 0 ? ss / gl : mu;
  const tau2 = varEntre - ruido;
  const noDistinguen = !(tau2 > 0);
  const m = noDistinguen ? Infinity : Math.max(mu, sigma2) / tau2;
  salida.tau2 = redondear2(tau2); salida.sigma2_dentro = redondear2(sigma2);
  salida.m = Number.isFinite(m) ? redondear2(m) : null; salida.no_distinguen = noDistinguen;
  salida.var_entre_departamentos = redondear2(varEntre); salida.ruido_muestral = redondear2(ruido);
  for (const [dep, d] of Object.entries(acc)) {
    const mud = d.suma / d.procesos;
    const w = noDistinguen ? 0 : d.procesos / (d.procesos + m);
    salida.priors[dep] = {
      procesos: d.procesos, entidades: d.entidades,
      promedio: redondear2(mud),
      prior: redondear2(w * mud + (1 - w) * mu),
      peso: Math.round(w * 1000) / 1000,
    };
  }
  return salida;
}

/* Prior de UNA entidad: el de su departamento (encogido) si existe, si no μ. */
function priorDe(e, enc) {
  const dep = e && e.depto ? e.depto : null;
  const pd = dep && enc && enc.departamentos && enc.departamentos.priors ? enc.departamentos.priors[dep] : null;
  if (pd && pd.prior != null) return { valor: pd.prior, origen: `departamento:${dep}` };
  return { valor: enc.mu_global, origen: "global" };
}

/* r̂, w y su desviación para UNA entidad, dados μ y m. Con m = null (no se pudo
   estimar) devuelve null: el lector cae al comportamiento de siempre. */
function encogerEntidad(e, enc) {
  if (!enc || enc.mu_global == null || (enc.m == null && !enc.entidad_no_distingue)) return null;
  const n = e.procesos;
  const prior = priorDe(e, enc);
  const mu = prior.valor;
  /* Con τ̂² ≤ 0 todo se encoge al prior y la posterior es degenerada: la
     desviación sería 0, y una banda de ancho CERO se leería como certeza
     absoluta justo donde MENOS información individualizada hay. `null`. */
  if (enc.entidad_no_distingue) return { rivales_estimados: redondear2(mu), peso_datos: 0, rivales_desv: null, prior: redondear2(mu), prior_origen: prior.origen };
  const m = enc.m;
  const rbar = e.oferentes_total / n;
  const w = n / (n + m);
  const rhat = w * rbar + (1 - w) * mu;
  const varianza = (n * rbar + m * mu) / ((n + m) ** 2);
  return {
    rivales_estimados: redondear2(rhat),
    peso_datos: Math.round(w * 1000) / 1000,
    rivales_desv: redondear2(Math.sqrt(Math.max(0, varianza))),
    prior: redondear2(mu),
    prior_origen: prior.origen,
  };
}

/* ============================ construirIndice ============================
   Recorre el histórico MES A MES (no chunk a chunk) porque un proceso vive en
   un solo mes: deduplicar por `_k` dentro del mes basta y el acumulador que se
   persiste entre invocaciones es por ENTIDAD (pequeño), no por proceso.
   Reanudable: progreso comprimido en indice:competencia:progreso. */
async function construirIndice(redis, { presupuestoMs = 40000, reiniciar = false, log = () => {} } = {}) {
  const t0 = Date.now();

  const claves = await redis.scan(CLAVES.patronChunksHist);
  const porMes = new Map();
  for (const k of claves) {
    const mes = CLAVES.mesDeClaveHist(k);
    if (!mes) continue;
    if (!porMes.has(mes)) porMes.set(mes, []);
    porMes.get(mes).push(k);
  }

  let p = reiniciar ? null : await leerJSONComprimido(redis, CLAVES.indiceProgreso);
  if (!p || !Array.isArray(p.pendientes)) {
    p = {
      iniciado: new Date().toISOString(),
      pendientes: [...porMes.keys()].sort(),
      acc: {},
      stats: { filas: 0, contados: 0, sin_adjudicacion: 0, sin_oferentes: 0, meses: 0 },
    };
  }
  if (!p.pendientes.length && !Object.keys(p.acc).length && !porMes.size) {
    return { done: true, vacio: true, entidades: 0, clasificadas: 0, msg: "no hay corpus histórico todavía" };
  }

  while (p.pendientes.length) {
    if (Date.now() - t0 > presupuestoMs) {
      await escribirJSONComprimido(redis, CLAVES.indiceProgreso, p);
      return { done: false, pendientes: p.pendientes.length, entidades: Object.keys(p.acc).length };
    }
    const mes = p.pendientes[0];
    const registros = await leerChunksDedup(redis, porMes.get(mes) || []);
    for (const r of registros) acumular(p.acc, p.stats, r);
    p.stats.meses++;
    p.pendientes.shift();
    await escribirJSONComprimido(redis, CLAVES.indiceProgreso, p);
    log(`índice: ${mes} → ${registros.length} procesos (${Object.keys(p.acc).length} entidades)`);
  }

  /* ---------- métricas por entidad + tertiles ---------- */
  const entidades = Object.entries(p.acc).map(([clave, a]) => ({
    clave,
    nombre: a.nombre,
    nit: a.nit || null,
    procesos: a.procesos,
    oferentes_total: a.suma,
    promedio: redondear(a.suma / a.procesos),
    mediana: medianaHistograma(a.histograma, a.procesos),
    suma2: Number.isFinite(a.suma2) ? a.suma2 : null,
    por_anio: a.por_anio || null,
    dias: a.dias || null,
    depto: a.depto || null,
    prorroga: a.prorroga || null,
  }));
  const encogimiento = estimarEncogimiento(entidades);
  /* La MEDICIÓN vive aquí; la comparación con el factor vigente
     (`FACTOR_COLISION_CIERRES`) vive en lib/probabilidad (`leerColision`), que es
     quien posee la constante: este módulo no la conoce ni la importa — la cadena
     filtros → equivalencias → indice_competencia no puede alcanzar apu/. */
  const colision = medirColision(entidades);
  colision.sin_dia_cierre = p.stats.sin_dia_cierre || 0;
  const periodos = medirPeriodos(entidades);
  const prorroga = medirProrroga(entidades);
  prorroga.sin_senal = p.stats.sin_senal_prorroga || 0;
  const clasificables = entidades.filter((e) => e.procesos >= MIN_PROCESOS)
    .sort((a, b) => a.promedio - b.promedio || a.clave.localeCompare(b.clave));
  const cortes = cortesTertiles(clasificables.map((e) => e.promedio));
  for (const e of entidades) {
    e.nivel = e.procesos >= MIN_PROCESOS ? nivelPorCortes(e.promedio, cortes) : "sin_dato";
  }

  /* ---------- NITs que NO pueden llevar alias ----------
     El alias `nit:{NIT}` → `{ref: entidad}` existe para que un cambio de razón
     social no parta el historial. Pero un NIT NO identifica a una entidad de
     forma única en este dataset: las regionales y unidades de un mismo
     organismo publican con el NIT de la matriz. Cuando dos entidades distintas
     lo comparten, el alias solo puede apuntar a UNA, y hasta ago 2026 ganaba
     «la última escrita»: la otra entidad heredaba en la tarjeta el nivel de
     competencia de su hermana, en silencio y sin forma de notarlo.

     Un alias ambiguo no es un alias: es una respuesta equivocada. Así que no se
     publica, y esas entidades se identifican SOLO por su nombre —que es exacto—
     La cuenta va a la meta: si un día son muchas, hay que saberlo. */
  const clavesReales = new Set(entidades.map((e) => e.clave));
  const clavesPorNit = new Map();
  for (const e of entidades) {
    if (!e.nit) continue;
    if (!clavesPorNit.has(e.nit)) clavesPorNit.set(e.nit, new Set());
    clavesPorNit.get(e.nit).add(e.clave);
  }
  const nitsAmbiguos = new Set();
  for (const [nit, claves] of clavesPorNit) {
    // dos entidades con el mismo NIT, o un NIT que YA es la clave real de una
    // entidad sin nombre (ahí el alias no sería ambiguo: sería destructivo)
    if (claves.size > 1 || clavesReales.has(`nit:${nit}`)) nitsAmbiguos.add(nit);
  }

  /* ---------- publicación con swap atómico ---------- */
  /* Escribe el hash completo en `destino`, por lotes de CAMPOS_POR_HSET campos:
     un HSET por lote acota el tamaño del request REST. Cada entidad va bajo su
     clave canónica y, si su NIT no es ambiguo, un alias que apunta al mismo
     registro (sin duplicar la carga útil). */
  async function publicarEn(destino) {
    let lote = {}, enLote = 0;
    for (const e of entidades) {
      lote[e.clave] = registroPublicado(e, encogimiento);
      enLote++;
      if (e.nit && !nitsAmbiguos.has(e.nit) && `nit:${e.nit}` !== e.clave) {
        lote[`nit:${e.nit}`] = { ref: e.clave };
        enLote++;
      }
      if (enLote >= CAMPOS_POR_HSET) { await redis.hset(destino, lote); lote = {}; enLote = 0; }
    }
    if (enLote) await redis.hset(destino, lote);
  }

  if (!entidades.length) {
    // hay corpus histórico pero NADA contable (p. ej. ninguna columna de
    // oferentes reconocida): dejar el índice vacío es coherente — todas las
    // entidades caen en "sin_dato" y la meta explica por qué en `descartados`
    await redis.del(CLAVES.indice, CLAVES.indiceNuevo);
  } else {
    await redis.del(CLAVES.indiceNuevo);
    await publicarEn(CLAVES.indiceNuevo);
    try {
      await redis.rename(CLAVES.indiceNuevo, CLAVES.indice);
    } catch {
      // sin RENAME disponible: publicar sobre la vigente (hay una ventana
      // corta con el índice a medias; los niveles solo caen a "sin_dato")
      await redis.del(CLAVES.indice);
      await publicarEn(CLAVES.indice);
      await redis.del(CLAVES.indiceNuevo);
    }
  }

  const porNivel = { baja: 0, media: 0, alta: 0, sin_dato: 0 };
  for (const e of entidades) porNivel[e.nivel]++;
  const meta = {
    construido: new Date().toISOString(),
    entidades: entidades.length,
    clasificadas: clasificables.length,
    min_procesos: MIN_PROCESOS,
    cortes: cortes ? { baja_hasta: cortes.c1, media_hasta: cortes.c2, degenerado: cortes.degenerado } : null,
    por_nivel: porNivel,
    // NITs compartidos por dos o más entidades: no se publica alias para ellos
    // (ver «NITs que no pueden llevar alias»). Si un día son muchos, se ve aquí.
    nits_ambiguos: nitsAmbiguos.size,
    procesos_contados: p.stats.contados,
    filas_leidas: p.stats.filas,
    descartados: { sin_adjudicacion: p.stats.sin_adjudicacion, sin_oferentes: p.stats.sin_oferentes },
    meses: p.stats.meses,
    // μ, τ̂², m del encogimiento (ver cabecera). Con m en null el índice se
    // comporta como antes; con `entidad_no_distingue` todo se encoge a μ.
    encogimiento,
    // A7: efecto MEDIDO de la colisión de cierres (no cambia ningún factor solo)
    colision,
    // B3: efecto de la prórroga, medido cuando la señal se haya acumulado
    prorroga,
    // B2 (medición previa): oferentes por año y dentro/fuera de la ventana de la
    // ley de garantías 2026 — para saber si el promedio de dos años mezcla un
    // período atípico ANTES de segmentar nada
    periodos,
  };
  await escribirJSON(redis, CLAVES.indiceMeta, meta);
  await redis.del(CLAVES.indiceProgreso);
  log(`índice publicado: ${entidades.length} entidades (${clasificables.length} clasificadas)`);
  return { done: true, ...meta };
}

/* ============================ lectura ============================ */
async function leerIndiceMeta(redis) { return leerJSON(redis, CLAVES.indiceMeta); }

/* Hash completo → objeto {clave: métricas}. Un solo comando; /api/oportunidades
   lo memoiza por instancia caliente contra el sello de indice:competencia:meta. */
async function leerIndice(redis) {
  const crudo = await redis.hgetall(CLAVES.indice);
  const out = {};
  for (const [k, v] of Object.entries(crudo || {})) {
    if (v == null) continue;
    if (typeof v === "object") { out[k] = v; continue; }
    try { out[k] = JSON.parse(v); } catch { /* campo corrupto: se ignora */ }
  }
  return out;
}

const SIN_DATO = Object.freeze({ nivel: "sin_dato", promedio_oferentes: null, mediana_oferentes: null, total_procesos: 0 });
const NIVELES_CLASIFICADOS = ["baja", "media", "alta"];

/* Un registro sin base suficiente: se conserva el CONTEO (es un hecho, y es lo
   que explica el ⚪ en la tarjeta) y se anulan todas las cifras derivadas. */
const sinDatoCon = (procesos, extra = null) => (procesos > 0 || extra
  ? { nivel: "sin_dato", promedio_oferentes: null, mediana_oferentes: null, total_procesos: procesos, ...(extra || {}) }
  : SIN_DATO);

/* Campos de ENCOGIMIENTO y reparto temporal del registro, SOLO si el hash los
   trae (un hash viejo no los tiene y la respuesta queda idéntica a la de
   siempre — sin claves nuevas, para que nadie lea `undefined` como dato). */
/* OJO: aquí NO se usa `numero()`, que es el lector TOLERANTE del dataset
   (punto = miles: leería «0.963» como 963). Estos campos los escribe este mismo
   módulo como números JSON; se leen con `Number` estricto y la ausencia se
   descarta ANTES (`Number(null)` es 0). */
const maquina = (v) => {
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};
function extraDe(m) {
  const r = maquina(m.rivales_estimados);
  if (r == null || r < 0) return null;
  const out = { rivales_estimados: r };
  const w = maquina(m.peso_datos);
  out.peso_datos = w != null && w >= 0 && w <= 1 ? w : null;
  const sd = maquina(m.rivales_desv);
  out.rivales_desv = sd != null && sd >= 0 ? sd : null;
  const pr = maquina(m.prior);
  if (pr != null) { out.prior = pr; out.prior_origen = typeof m.prior_origen === "string" ? m.prior_origen : null; }
  if (m.por_anio && typeof m.por_anio === "object") out.por_anio = m.por_anio;
  return out;
}

/* Resumen AGREGADO de la entidad de una licitación. Es lo único del histórico
   que /api/oportunidades expone: nunca adjudicatarios, NIT ni valores.
   ---------------------------------------------------------------------------
   ÚNICO PUNTO DE PASO de los tres consumidores (tarjeta, panel y detalle), y
   por eso es aquí donde se impone la invariante que faltaba:

     un promedio SOLO sale de aquí si la entidad tiene ≥ MIN_PROCESOS procesos
     contados Y un nivel clasificado. En cualquier otro caso, promedio null.

   No basta con arreglar el escritor: `indice:competencia` NO SE PURGA NUNCA
   (es su razón de ser), así que en producción sigue vivo el hash que escribió
   la versión anterior —con promedios publicados para entidades de 3 procesos—
   hasta que alguien reconstruya el índice. Esta guarda hace que ese hash viejo
   ya no pueda enseñar una cifra sin base, con reconstrucción o sin ella.
   Acepta `procesos` y `procesos_contados` por el mismo motivo. */
function competenciaDe(indice, lic) {
  if (!indice) return SIN_DATO;
  const { clave, claveLegado, aliasNit } = claveEntidad(lic);
  const en = (k) => (k && Object.prototype.hasOwnProperty.call(indice, k) ? indice[k] : null);
  /* ORDEN DE BÚSQUEDA, y este orden es la corrección (ago 2026):
       1. la clave canónica — el nombre es EXACTO y solo puede ser esta entidad;
       2. la clave legado — el hash que hay hoy en producción está escrito así y
          no se purga nunca: sin este paso, desplegar dejaría todo en ⚪ hasta
          que alguien reconstruyera el índice a mano;
       3. el alias por NIT, y solo entonces — es el más DÉBIL de los tres porque
          un NIT lo comparten las regionales de un mismo organismo. Antes iba
          PRIMERO, así que una entidad con el nombre bien escrito y su propio
          registro en el índice acababa enseñando las cifras de su hermana.
     El escritor ya no publica alias ambiguos; este orden protege además al hash
     viejo, que sí los tiene. */
  let m = en(clave) || en(claveLegado) || en(aliasNit);
  if (m && m.ref) m = en(m.ref);
  if (!m) return SIN_DATO;
  // `numero()` y no un `||`: un conteo que llegue como cadena ("3") o como
  // basura no puede colarse como truthy y arrastrar consigo un promedio
  const procesos = Math.max(0, Math.trunc(numero(m.procesos ?? m.procesos_contados) || 0));
  const extra = extraDe(m);
  if (procesos < MIN_PROCESOS) return sinDatoCon(procesos, extra);
  if (!NIVELES_CLASIFICADOS.includes(m.nivel)) return sinDatoCon(procesos, extra);
  const promedio = numero(m.promedio);
  if (promedio == null) return sinDatoCon(procesos, extra); // nivel sin promedio: no hay nada que enseñar
  return {
    nivel: m.nivel,
    promedio_oferentes: promedio,
    mediana_oferentes: numero(m.mediana),
    total_procesos: procesos,
    ...(extra || {}),
  };
}

module.exports = {
  // `numero` y `primero` se exportan para que el censo de columnas
  // (lib/columnas_historicas) resuelva los campos con las MISMAS reglas que usa
  // este módulo para leerlos: si divergieran, el diagnóstico informaría de una
  // columna que el índice no mira, o al revés.
  numero, primero,
  MIN_PROCESOS, OFERENTES_CAMPOS, CAMPOS_ADJUDICACION,
  CAMPOS_ADJUDICATARIO, CAMPOS_ADJUDICATARIO_NIT, CAMPOS_VALOR_ADJUDICADO, CAMPOS_FECHA_ADJUDICACION,
  oferentesDe, esAdjudicado, claveEntidad, claveCanonica,
  cortesTertiles, nivelPorCortes, medianaHistograma, registroPublicado,
  construirIndice, leerIndice, leerIndiceMeta, competenciaDe,
  // encogimiento (A2/A3): se exportan para poder probar el estimador aislado
  estimarEncogimiento, encogerEntidad, anioDe, MIN_ENTIDADES_ESTIMACION,
  medirColision, diaCierreDe, medirPeriodos, VENTANA_GARANTIAS_2026, medirProrroga,
  estimarPriorDepartamental, priorDe, MIN_PROCESOS_DEPTO,
};
