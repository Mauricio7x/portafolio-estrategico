/* ============================================================================
   /api/resumen · El dashboard: ¿qué SON los procesos que hoy se ven?
   ----------------------------------------------------------------------------
   GET /api/resumen?perfil=helder|genesis|consorcio|juntos&token=…

   PROTEGIDO con el mismo HISTORICO_TOKEN de /api/sync/historico,
   /api/diagnostico y /api/competencia-detalle (lib/auth): agrega el contenido
   del corpus, igual que el diagnóstico.

   La pregunta que responde no es «¿cuántos hay?» sino «¿dónde me concentro
   hoy?»: cuántos son obra y cuántos consultoría, cuáles cierran esta semana,
   qué entidades acumulan procesos y con cuánta competencia histórica, en qué
   departamentos están, cuántos se caen por capacidad K.

   REGLA DE ORO — los números tienen que ser LOS MISMOS que ve la app.
   Por eso este endpoint NO reimplementa la cascada ni la copia: llama a la
   MISMA función que /api/oportunidades, `lib/filtros.filtrarProcesosVisibles`.
   Hasta ago 2026 eran dos copias idénticas —con pruebas de que los totales
   coincidían—, pero «idénticas hoy» no es una garantía: dos copias divergen a
   la primera corrección que se aplique a una sola, y el día que divergieran el
   panel y la app se contradirían sin que nada fallara. Con una sola
   implementación no hay nada que sincronizar.

   Hay una prueba que compara `totales.visibles` contra el `total` de
   /api/oportunidades y contra el `embudo.visibles` de /api/diagnostico; y el
   propio endpoint publica su verificación cruzada en `integridad`.

   LOS DESTACADOS son otra cosa: sobre los visibles aplican CUATRO filtros más
   (cerrado explícito, «Verificar objeto», objetos de estructuración y cuantía
   cero). La lista corta es una RECOMENDACIÓN —«empiece por aquí»— y puede ser
   más exigente que el listado; lo que aparta lo CUENTA en
   `destacados_descartados` y nunca toca `totales.visibles`.

   Diferencia con /api/diagnostico, que también recorre el embudo: el
   diagnóstico responde «¿POR QUÉ no salen más?» (contrafactuales, ejemplos,
   distribuciones de columnas) y es una herramienta de depuración; esto
   responde «¿QUÉ tengo delante hoy?» y es una herramienta de decisión diaria.
   Por eso este cachea 5 minutos y aquel no cachea nunca.

   CACHÉ: `resumen:{perfil}` con TTL 300 s. La respuesta lleva `cache:true` y
   la cabecera `X-Cache: HIT|MISS` para que se pueda verificar desde el
   navegador. La invalida cualquier carga de RUP (/api/admin/rup): sus números
   dependen del RUP y quedarían mintiendo cinco minutos.

   `superan_k` / `no_superan_k` se cuentan sobre los procesos que PASARON el
   juicio del objeto (`base_capacidad`), no sobre los visibles: entre los
   visibles todos superan la K por construcción, y un contador que siempre vale
   «todos» no informa de nada.
   ========================================================================== */
"use strict";

const { crearRedis, hayCredenciales } = require("../lib/redis.js");
const { autorizarToken } = require("../lib/auth.js");
const { CLAVES, RESUMEN_TTL_SEG, leerChunksDedup, leerJSON, leerJSONComprimido } = require("../lib/almacen.js");
const { PERFILES, ALIAS_PERFIL, recargarPerfiles } = require("../lib/perfiles.js");
const {
  filtrarProcesosVisibles, descartesVacios, estado_cerrado,
  TERMINOS_ESTRUCTURACION, norm,
} = require("../lib/filtros.js");
const { leerIndice, leerIndiceMeta, competenciaDe } = require("../lib/indice_competencia.js");
const { leerIndiceBaja, leerIndiceBajaMeta } = require("../lib/indice_baja.js");
const { leerEquivalencias, leerEquivalenciasMeta } = require("../lib/equivalencias.js");
const { vocabularioActivo } = require("../lib/texto_unspsc.js");

const PERFILES_VALIDOS = ["helder", "genesis", "consorcio", "juntos"];
const ANTICIPO_MIN_DEFAULT = 20;   // el mismo default de /api/oportunidades
const ANTICIPO_PLENO = 20;         // ≥20 % = anticipo que sirve (lib/negocio)
const TOP_ENTIDADES = 15, TOP_DEPARTAMENTOS = 15, TOP_MUNICIPIOS = 10, TOP_DESTACADOS = 10;
const DIA_MS = 86400000;

/* Orden de atractividad: el mismo criterio del default de /api/oportunidades
   («sin_dato» por delante de «alta»: no saber no es saber que hay 20). */
const ATRACTIVIDAD = { baja: 3, media: 2, sin_dato: 1, alta: 0 };

/* Los 32 departamentos + Bogotá, normalizados. Se usan SOLO como respaldo:
   primero manda la columna `departamento_entidad` del dataset y solo si viene
   vacía se intenta leer el departamento del nombre de la entidad («ALCALDÍA
   MUNICIPAL DE X - BOYACÁ»). Sin ninguna de las dos → SIN_DEPARTAMENTO, que se
   cuenta aparte y jamás se reparte a ojo. */
const DEPARTAMENTOS = [
  "AMAZONAS", "ANTIOQUIA", "ARAUCA", "ATLANTICO", "BOLIVAR", "BOYACA", "CALDAS",
  "CAQUETA", "CASANARE", "CAUCA", "CESAR", "CHOCO", "CORDOBA", "CUNDINAMARCA",
  "GUAINIA", "GUAVIARE", "HUILA", "LA GUAJIRA", "MAGDALENA", "META", "NARINO",
  "NORTE DE SANTANDER", "PUTUMAYO", "QUINDIO", "RISARALDA", "SAN ANDRES",
  "SANTANDER", "SUCRE", "TOLIMA", "VALLE DEL CAUCA", "VAUPES", "VICHADA",
  "BOGOTA", "DISTRITO CAPITAL",
];
const SIN_DEPARTAMENTO = "SIN_DEPARTAMENTO";

/* Etiquetas de la banda de competencia, EXACTAMENTE las de public/app.js: el
   dashboard y la tarjeta tienen que decir lo mismo con las mismas palabras. */
const COMPETENCIA = {
  baja: { emoji: "🟢", titulo: "Poca competencia" },
  media: { emoji: "🟡", titulo: "Competencia media" },
  alta: { emoji: "🔴", titulo: "Alta competencia" },
  sin_dato: { emoji: "⚪", titulo: "Sin datos históricos de esta entidad" },
};
/* es-CO usa coma decimal. Se formatea a mano y no con Intl para no depender
   de que el runtime traiga la ICU completa. */
const numEs = (n) => (n == null ? "?" : String(n).replace(".", ","));

/* MISMA REGLA que public/app.js.bandaCompetencia: un promedio solo se escribe
   si hay procesos contados, nivel clasificado y promedio. En cualquier otro
   caso, «Sin datos históricos» y NINGUNA cifra — el conteo sigue disponible
   como dato (`top_entidades[].procesos_historicos`) y explicado en el modal,
   pero no dentro de una frase que parece una medición. */
function badgeCompetencia(c) {
  const nivel = (c && c.nivel) || "sin_dato";
  const procesos = Number(c && c.total_procesos) || 0;
  const promedio = c && c.promedio_oferentes != null ? Number(c.promedio_oferentes) : null;
  const conBase = procesos > 0 && nivel !== "sin_dato" && promedio != null && !isNaN(promedio);
  const d = conBase ? (COMPETENCIA[nivel] || COMPETENCIA.sin_dato) : COMPETENCIA.sin_dato;
  if (!conBase) return `${d.emoji} ${d.titulo}`;
  return `${d.emoji} ${d.titulo} — promedio ${numEs(promedio)} oferentes en ${procesos} proceso${procesos === 1 ? "" : "s"}`;
}

/* ---------- normalización de valores del dataset ---------- */
const enMayusculas = (s) => String(s || "")
  .normalize("NFD").replace(/[̀-ͯ]/g, "")
  .toUpperCase().replace(/[^A-Z0-9Ñ ]+/g, " ").replace(/\s+/g, " ").trim();

function departamentoDe(lic) {
  const columna = enMayusculas(lic.departamento_entidad || lic.entidad_departamento || lic.departamento);
  if (columna) return columna === "DISTRITO CAPITAL DE BOGOTA" ? "BOGOTA" : columna;
  // respaldo: muchas entidades llevan el departamento en el propio nombre
  const nombre = enMayusculas(lic.entidad);
  if (nombre) {
    const hallado = DEPARTAMENTOS.find((d) => nombre.includes(d));
    if (hallado) return hallado === "DISTRITO CAPITAL" ? "BOGOTA" : hallado;
  }
  return SIN_DEPARTAMENTO;
}

/* Modalidad agrupada. `norm` + includes porque el dataset trae decenas de
   sufijos («Selección Abreviada de Menor Cuantía», «… subasta inversa»). */
function modalidadAgrupada(lic) {
  const n = norm(lic.modalidad_de_contratacion || lic.tipo_de_proceso);
  if (n.includes("licitacion publica")) return "Licitación pública";
  if (n.includes("seleccion abreviada") || n.includes("subasta")) return "Selección Abreviada";
  if (n.includes("minima cuantia")) return "Mínima cuantía";
  if (n.includes("concurso de meritos")) return "Concurso de méritos";
  if (n.includes("acuerdo marco")) return "Acuerdo marco";
  if (n.includes("regimen especial")) return "Régimen especial";
  return "Otra";
}

/* Pertinencia → clave del reparto. Los cuatro tipos de lib/filtros; el rojo
   («no pertinente») no puede llegar aquí: muere antes en la cascada. */
const CLAVE_PERTINENCIA = {
  obra_civil: "obra_civil", consultoria: "consultoria",
  infraestructura: "infraestructura", indeterminado: "verificar_objeto",
};

/* Cuenta ordenada descendente → [{clave, n}] */
function ranking(mapa) {
  return [...mapa.entries()].sort((a, b) => b[1] - a[1] || String(a[0]).localeCompare(String(b[0])));
}

const fechaValida = (v) => {
  if (!v) return null;
  const t = Date.parse(v);
  return isNaN(t) ? null : new Date(t);
};

/* ---------- respuesta de corpus vacío ---------- */
/* Tarjeta de baja de mercado del panel. Se alimenta SOLO del índice publicado
   (lib/indice_baja): el panel no recalcula nada, igual que no recalcula la
   cascada. La cifra global sale del histograma ponderado por proceso que
   escribe el propio índice — promediar aquí las medianas por entidad daría otro
   número y el panel acabaría contradiciendo a la tarjeta. */
function bajaMercadoPanel(indiceBaja, bajaMeta) {
  if (!bajaMeta) return null;
  const porEntidad = (indiceBaja && indiceBaja.entidad) || {};
  const clasificadas = Object.entries(porEntidad)
    .map(([clave, m]) => ({ clave, ...m }))
    .filter((r) => r && !r.ref && r.baja_mediana != null && r.nivel && r.nivel !== "sin_dato");
  const fila = (r) => ({
    entidad: r.nombre || r.clave,
    baja_mediana: r.baja_mediana,
    procesos: r.procesos_contados ?? r.procesos,
    nivel: r.nivel,
  });
  const porBaja = clasificadas.slice().sort(
    (a, b) => b.baja_mediana - a.baja_mediana || String(a.clave).localeCompare(String(b.clave)));
  return {
    construido: bajaMeta.generado,
    min_procesos: bajaMeta.min_procesos,
    entidades_clasificadas: clasificadas.length,
    procesos_analizados: bajaMeta.procesos_analizados,
    // la baja del mercado entero, ponderada por proceso
    baja_mediana_global: bajaMeta.baja_mediana_global ?? null,
    baja_p25_global: bajaMeta.baja_p25_global ?? null,
    baja_p75_global: bajaMeta.baja_p75_global ?? null,
    mas_descuentan: porBaja.slice(0, 3).map(fila),
    menos_descuentan: porBaja.slice().reverse().slice(0, 3).map(fila),
  };
}

function totalesVacios() {
  return {
    visibles: 0,
    por_pertinencia: { obra_civil: 0, consultoria: 0, infraestructura: 0, verificar_objeto: 0 },
    por_tier_unspsc: { clase: 0, familia: 0, equivalente: 0, texto: 0 },
    por_modalidad: {},
    por_rango_cuantia: { bajo: 0, medio: 0, alto: 0 },
    por_nivel_competencia_entidad: { baja: 0, media: 0, alta: 0, sin_dato: 0 },
    por_departamento: {},
    por_urgencia: { cierra_esta_semana: 0, cierra_proxima_semana: 0, cierra_este_mes: 0, mas_adelante: 0, ya_cerro: 0, sin_fecha_cierre: 0 },
    por_anticipo: { con_anticipo_20_o_mas: 0, sin_dato_anticipo: 0, anticipo_insuficiente: 0 },
    base_capacidad: 0, superan_k: 0, no_superan_k: 0,
  };
}

module.exports = async function handler(req, res) {
  const q = req.query || {};
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Cache-Control", "no-store"); // el cliente no cachea: la caché es de servidor

  /* ---------- paso 0 · autenticación ---------- */
  const permiso = autorizarToken(req, q);
  if (!permiso.ok) {
    res.setHeader("X-Cache", "MISS");
    return res.status(permiso.status).json({ ok: false, error: permiso.error });
  }

  const pedido = String(q.perfil || "").toLowerCase();
  if (!PERFILES_VALIDOS.includes(pedido)) {
    res.setHeader("X-Cache", "MISS");
    return res.status(400).json({ ok: false, error: "perfil inválido", valores_validos: PERFILES_VALIDOS });
  }
  const perfilId = Object.prototype.hasOwnProperty.call(ALIAS_PERFIL, pedido) ? ALIAS_PERFIL[pedido] : pedido;

  if (!hayCredenciales()) {
    res.setHeader("X-Cache", "MISS");
    return res.status(503).json({ ok: false, error: "Servicio de caché no disponible", retry_en_segundos: 60 });
  }
  const redis = crearRedis({});
  const t0 = Date.now();

  /* ---------- paso 1 · caché ---------- */
  try {
    // el RUP cargado manda: si cambió, los perfiles se recargan antes de nada
    await recargarPerfiles(redis);
    const cacheado = await leerJSON(redis, CLAVES.resumen(perfilId));
    const edad = cacheado && cacheado.generado ? (Date.now() - Date.parse(cacheado.generado)) / 1000 : Infinity;
    if (cacheado && edad >= 0 && edad < RESUMEN_TTL_SEG) {
      res.setHeader("X-Cache", "HIT");
      return res.status(200).json({ ...cacheado, cache: true, edad_segundos: Math.round(edad) });
    }
  } catch (e) {
    res.setHeader("X-Cache", "MISS");
    return res.status(503).json({ ok: false, error: "Servicio de caché no disponible", retry_en_segundos: 60, detalle: e.message });
  }
  res.setHeader("X-Cache", "MISS");

  if (!Object.prototype.hasOwnProperty.call(PERFILES, perfilId)) {
    return res.status(400).json({ ok: false, error: "Perfil no configurado" });
  }
  const perfil = PERFILES[perfilId];

  /* ---------- paso 2 · corpus activo ---------- */
  let meta = null, filas = null, indice = null, indiceMeta = null, conocimiento = {};
  let indiceBaja = null, bajaMeta = null;
  try {
    meta = await leerJSON(redis, CLAVES.meta);
    const claves = await redis.scan(CLAVES.patronChunks);
    if (!claves.length) {
      return res.status(200).json({
        ok: true, perfil: perfilId, generado: new Date().toISOString(), ttl_segundos: RESUMEN_TTL_SEG,
        mensaje: "Sin datos. Ejecute /api/sync?modo=full primero.",
        // la MISMA forma que la respuesta normal, con ceros: el panel no tiene
        // que distinguir dos contratos según haya corpus o no
        totales: totalesVacios(), descartes: descartesVacios(),
        top_entidades: [], procesos_destacados: [],
        destacados_descartados: { cerrados: 0, verificar_objeto: 0, estructuracion: 0, sin_cuantia: 0 },
        integridad: { ok: true, avisos: [] },
        sincronizado: meta ? meta.last_sync : null, cache: false, duracion_ms: Date.now() - t0,
      });
    }
    filas = await leerChunksDedup(redis, claves);
    // el índice de competencia y el conocimiento derivado son OPCIONALES: sin
    // backfill histórico todo queda en "sin_dato" y el dashboard sigue sirviendo
    try {
      indiceMeta = await leerIndiceMeta(redis);
      if (indiceMeta) indice = await leerIndice(redis);
    } catch { /* opcional */ }
    try {
      bajaMeta = await leerIndiceBajaMeta(redis);
      if (bajaMeta) indiceBaja = await leerIndiceBaja(redis);
    } catch { /* opcional */ }
    let equivalencias = null, vocabRedis = null;
    try {
      const metaEq = await leerEquivalenciasMeta(redis);
      if (metaEq && !metaEq.vacio) equivalencias = await leerEquivalencias(redis);
    } catch { /* opcional */ }
    try {
      if (await leerJSON(redis, CLAVES.vocabularioMeta)) vocabRedis = await leerJSONComprimido(redis, CLAVES.vocabulario);
    } catch { /* opcional */ }
    conocimiento = { equivalencias, vocabulario: vocabularioActivo(vocabRedis) };
  } catch (e) {
    return res.status(503).json({ ok: false, error: "Servicio de caché no disponible", retry_en_segundos: 60, detalle: e.message });
  }

  /* ---------- paso 3 · LA CASCADA ----------
     ES LA MISMA FUNCIÓN que llama /api/oportunidades, no una copia:
     lib/filtros.filtrarProcesosVisibles. Los defaults (solo abiertas,
     anticipo_min = 20, ruta de texto débil cerrada) son los del endpoint de
     consulta sin ningún filtro marcado, que es justamente el conjunto que el
     panel debe describir. Mientras las dos llamadas usen esta función, los
     números NO PUEDEN divergir: no hay dos implementaciones que mantener. */
  const cascada = filtrarProcesosVisibles(filas, perfilId, conocimiento);
  const descartes = cascada.descartes;
  const baseCapacidad = cascada.capacidad.base;
  const superanK = cascada.capacidad.superan_k;
  const noSuperanK = cascada.capacidad.no_superan_k;

  const visibles = cascada.visibles.map((l) => ({
    l, rup: cascada.veredictos.get(l), comp: competenciaDe(indice, l),
  }));

  /* ---------- paso 4 · agregaciones (una sola pasada) ---------- */
  const totales = totalesVacios();
  totales.visibles = visibles.length;
  totales.base_capacidad = baseCapacidad;
  totales.superan_k = superanK;
  totales.no_superan_k = noSuperanK;

  const porModalidad = new Map();
  const porDepartamento = new Map();
  const porEntidad = new Map();
  const porMunicipio = new Map();

  const ahora = new Date();
  const en7 = new Date(ahora.getTime() + 7 * DIA_MS);
  const en14 = new Date(ahora.getTime() + 14 * DIA_MS);
  const finDeMes = new Date(Date.UTC(ahora.getUTCFullYear(), ahora.getUTCMonth() + 1, 0, 23, 59, 59));

  for (const v of visibles) {
    const { l, rup, comp } = v;

    const tipo = (rup.pertinencia && rup.pertinencia.tipo) || "indeterminado";
    totales.por_pertinencia[CLAVE_PERTINENCIA[tipo] || "verificar_objeto"]++;

    if (rup.tier in totales.por_tier_unspsc) totales.por_tier_unspsc[rup.tier]++;

    const mod = modalidadAgrupada(l);
    porModalidad.set(mod, (porModalidad.get(mod) || 0) + 1);

    const rango = ["bajo", "medio", "alto"].includes(l.cuantia_rango) ? l.cuantia_rango : "bajo";
    totales.por_rango_cuantia[rango]++;

    const nivel = comp && comp.nivel ? comp.nivel : "sin_dato";
    totales.por_nivel_competencia_entidad[nivel]++;

    const dep = departamentoDe(l);
    porDepartamento.set(dep, (porDepartamento.get(dep) || 0) + 1);

    const cierre = fechaValida(l.fecha_cierre);
    v.cierre = cierre;
    if (!cierre) totales.por_urgencia.sin_fecha_cierre++;
    else if (cierre < ahora) totales.por_urgencia.ya_cerro++;
    else if (cierre <= en7) totales.por_urgencia.cierra_esta_semana++;
    else if (cierre <= en14) totales.por_urgencia.cierra_proxima_semana++;
    else if (cierre <= finDeMes) totales.por_urgencia.cierra_este_mes++;
    else totales.por_urgencia.mas_adelante++;

    const pct = l.anticipo_pct || 0;
    if (pct >= ANTICIPO_PLENO) totales.por_anticipo.con_anticipo_20_o_mas++;
    else if (pct > 0) totales.por_anticipo.anticipo_insuficiente++;
    else totales.por_anticipo.sin_dato_anticipo++;

    const entidad = String(l.entidad || "").trim() || "Entidad no informada";
    let e = porEntidad.get(entidad);
    if (!e) { e = { procesos: 0, comp }; porEntidad.set(entidad, e); }
    e.procesos++;

    const municipio = String(l.ciudad_entidad || l.entidad_municipio || l.ubicacion_municipio || "").trim();
    if (municipio) {
      const k = enMayusculas(municipio);
      let m = porMunicipio.get(k);
      if (!m) { m = { municipio: k, departamento: dep === SIN_DEPARTAMENTO ? null : dep, procesos: 0 }; porMunicipio.set(k, m); }
      m.procesos++;
    }
  }

  totales.por_modalidad = Object.fromEntries(ranking(porModalidad));

  /* departamentos: top 15 + OTROS. SIN_DEPARTAMENTO se cuenta aparte y NO
     compite por un puesto del ranking (repartirlo a ojo sería inventar). */
  const sinDepartamento = porDepartamento.get(SIN_DEPARTAMENTO) || 0;
  porDepartamento.delete(SIN_DEPARTAMENTO);
  const depsOrdenados = ranking(porDepartamento);
  const depsTop = depsOrdenados.slice(0, TOP_DEPARTAMENTOS);
  const otros = depsOrdenados.slice(TOP_DEPARTAMENTOS).reduce((a, [, n]) => a + n, 0);
  totales.por_departamento = Object.fromEntries(depsTop);
  if (otros) totales.por_departamento.OTROS = otros;
  if (sinDepartamento) totales.por_departamento[SIN_DEPARTAMENTO] = sinDepartamento;

  /* ---------- paso 5 · top de entidades ---------- */
  const top_entidades = [...porEntidad.entries()]
    .sort((a, b) => b[1].procesos - a[1].procesos || a[0].localeCompare(b[0]))
    .slice(0, TOP_ENTIDADES)
    .map(([entidad, e]) => ({
      entidad,
      procesos: e.procesos,
      competencia: (e.comp && e.comp.nivel) || "sin_dato",
      promedio_oferentes: (e.comp && e.comp.promedio_oferentes) != null ? e.comp.promedio_oferentes : null,
      procesos_historicos: (e.comp && e.comp.total_procesos) || 0,
      badge: badgeCompetencia(e.comp),
    }));

  /* ---------- paso 6 · top de municipios (si el dataset trae la columna) ---------- */
  const top_municipios = [...porMunicipio.values()]
    .sort((a, b) => b.procesos - a.procesos || a.municipio.localeCompare(b.municipio))
    .slice(0, TOP_MUNICIPIOS);

  /* ---------- paso 7 · procesos destacados ----------
     Primero los de entidades con POCA competencia (ahí es donde se gana). Si el
     histórico aún no se ha descargado NADIE tiene nivel "baja", y una tabla
     vacía para siempre no informa: en ese caso se cae al mismo orden por
     atractividad que usa la app y se DICE cuál de los dos criterios se aplicó.

     CUATRO FILTROS ADICIONALES sobre los visibles (ago 2026, defecto real: el
     panel encabezaba con «seleccionar accionista para constituir una sociedad
     de economía mixta» y con procesos ya adjudicados). Esta lista es una
     RECOMENDACIÓN —«empiece por aquí»— y por eso puede ser más exigente que el
     listado completo: un falso positivo en el puesto 1 del panel cuesta más que
     uno en la página 4 de la app. Ninguno de los cuatro toca `totales.visibles`:
     los procesos siguen estando en /api/oportunidades, con su tarjeta y su
     veredicto delante, que es donde el dueño puede juzgarlos.

       a. estado explícitamente CERRADO (adjudicado, desierto, cancelado…).
          La cascada ya exige `estado_abierto`, así que esto no debería llegar a
          disparar nunca; se comprueba igual porque es la afirmación más fuerte
          que hace el panel («preséntese a esto») y porque una fila del corpus
          puede haber cerrado en SECOP II sin que el delta lo haya traído aún.
          OJO: si la fuente todavía dice «Presentación de ofertas», NINGÚN
          filtro puede saberlo — eso solo lo arregla una sincronización.
       b. pertinencia «Verificar objeto»: un 🟡 no puede encabezar nada.
       c. objeto de ESTRUCTURACIÓN (accionista, socio estratégico, APP,
          concesión…): son procesos reales y competitivos, pero lo que buscan es
          un socio que ponga capital, no un constructor.
       d. cuantía > 0: sin cifra no hay nada que ordenar ni que decidir. */
  const descartadosDestacados = { cerrados: 0, verificar_objeto: 0, estructuracion: 0, sin_cuantia: 0 };
  const conCuantia = visibles.filter((v) => {
    if (estado_cerrado(v.l)) { descartadosDestacados.cerrados++; return false; }
    if ((v.rup.pertinencia && v.rup.pertinencia.tipo) === "indeterminado") { descartadosDestacados.verificar_objeto++; return false; }
    if (TERMINOS_ESTRUCTURACION.test(norm(`${v.l.nombre_del_procedimiento || ""} ${v.l.descripci_n_del_procedimiento || ""}`))) {
      descartadosDestacados.estructuracion++; return false;
    }
    if (!((v.l.cuantia_cop || 0) > 0)) { descartadosDestacados.sin_cuantia++; return false; }
    return true;
  });
  const baja = conCuantia.filter((v) => v.comp && v.comp.nivel === "baja");
  const desde = baja.length ? "competencia_baja" : "atractividad";
  const candidatos = baja.length ? baja : conCuantia;
  const destacados = candidatos.slice().sort((a, b) => {
    const at = (ATRACTIVIDAD[(b.comp && b.comp.nivel) || "sin_dato"] ?? 1)
      - (ATRACTIVIDAD[(a.comp && a.comp.nivel) || "sin_dato"] ?? 1);
    if (at) return at;
    const c = (b.l.cuantia_cop || 0) - (a.l.cuantia_cop || 0);
    if (c) return c;
    // los que cierran antes, primero; los que no tienen fecha, al final
    const fa = a.cierre ? a.cierre.getTime() : Infinity;
    const fb = b.cierre ? b.cierre.getTime() : Infinity;
    return fa - fb;
  }).slice(0, TOP_DESTACADOS);

  const procesos_destacados = destacados.map(({ l, rup, comp, cierre }) => ({
    id_del_proceso: l.id_del_proceso || null,
    objeto: String(l.nombre_del_procedimiento || l.descripci_n_del_procedimiento || "").slice(0, 100),
    entidad: String(l.entidad || "").trim() || "Entidad no informada",
    cuantia_cop: l.cuantia_cop || 0,
    cierre: cierre ? cierre.toISOString() : null,
    competencia: (comp && comp.nivel) || "sin_dato",
    promedio_oferentes: (comp && comp.promedio_oferentes) != null ? comp.promedio_oferentes : null,
    pertinencia: (rup.pertinencia && rup.pertinencia.etiqueta) || "Verificar objeto",
    match_tier: rup.tier,
    badge: badgeCompetencia(comp),
    url: l.urlproceso || null,
  }));

  /* ---------- paso 8 · VERIFICACIÓN CRUZADA ----------
     Comprobación de integridad antes de publicar nada. Con la cascada
     compartida, `visibles` es por construcción lo que devolvería
     /api/oportunidades para este perfil sin filtros marcados — pero eso es una
     afirmación sobre el código, y lo que se publica son NÚMEROS. Aquí se
     verifican los invariantes que harían falsos esos números:

       · el conteo publicado es exactamente el de la cascada compartida;
       · cada reparto suma los visibles (nadie se pierde entre cubetas);
       · descartes + visibles agotan el corpus activo.

     Si algo no cuadra se grita por consola Y viaja en la respuesta: un
     `console.error` en Vercel lo lee quien mira los logs, y el dueño no mira
     logs. `integridad.ok=false` es visible desde el propio panel. */
  const totalDesdeOportunidades = cascada.visibles.length;
  const avisos = [];
  if (totales.visibles !== totalDesdeOportunidades) {
    avisos.push(`INCONSISTENCIA: /api/resumen visibles=${totales.visibles} pero /api/oportunidades devolvería ${totalDesdeOportunidades}`);
  }
  const sumaDe = (o) => Object.values(o).reduce((a, b) => a + b, 0);
  for (const [nombre, reparto] of [
    ["por_pertinencia", totales.por_pertinencia], ["por_tier_unspsc", totales.por_tier_unspsc],
    ["por_modalidad", totales.por_modalidad], ["por_rango_cuantia", totales.por_rango_cuantia],
    ["por_nivel_competencia_entidad", totales.por_nivel_competencia_entidad],
    ["por_departamento", totales.por_departamento], ["por_urgencia", totales.por_urgencia],
    ["por_anticipo", totales.por_anticipo],
  ]) {
    const s = sumaDe(reparto);
    if (s !== totales.visibles) avisos.push(`INCONSISTENCIA: totales.${nombre} suma ${s} y los visibles son ${totales.visibles}`);
  }
  const cubiertos = sumaDe(descartes) + totales.visibles;
  if (cubiertos !== filas.length) {
    avisos.push(`INCONSISTENCIA: descartes + visibles = ${cubiertos} pero el corpus activo tiene ${filas.length} filas`);
  }
  for (const a of avisos) console.error(`[resumen] ${a}`);

  /* ---------- paso 9 · respuesta ---------- */
  const cuerpo = {
    ok: true,
    perfil: perfilId,
    perfil_nombre: perfil.nombre,
    generado: new Date().toISOString(),
    ttl_segundos: RESUMEN_TTL_SEG,
    corpus: { filas_unicas: filas.length, sincronizado: meta ? meta.last_sync : null },
    totales,
    descartes,
    top_entidades,
    ...(top_municipios.length ? { top_municipios } : {}),
    procesos_destacados,
    destacados_desde: desde,
    // por qué un visible no llegó a la lista corta: sin esto, «faltan procesos
    // en los destacados» solo se puede responder a ojo
    destacados_descartados: descartadosDestacados,
    integridad: { ok: avisos.length === 0, avisos },
    indice_competencia: indiceMeta
      ? { construido: indiceMeta.construido, entidades: indiceMeta.clasificadas, min_procesos: indiceMeta.min_procesos }
      : null,
    baja_mercado: bajaMercadoPanel(indiceBaja, bajaMeta),
    duracion_ms: Date.now() - t0,
    como_leerlo: "`totales.visibles` es el `total` de /api/oportunidades con este perfil y `solo_viables=false`: "
      + "los dos endpoints llaman a la MISMA función (lib/filtros.filtrarProcesosVisibles), no a dos copias. "
      + "Con `solo_viables=true` (su default) el listado sirve MENOS: la puerta de caja (lib/puertas, P3) es "
      + "posterior a la cascada y retira los procesos que la empresa no podría financiar. "
      + "`descartes` dice en qué paso murió cada proceso del corpus activo (suman el corpus entero con los visibles). "
      + "`superan_k`/`no_superan_k` se cuentan sobre `base_capacidad` (los que pasaron el juicio del objeto), no sobre los visibles. "
      + "`procesos_destacados` es una recomendación y aplica cuatro filtros MÁS que el listado (cerrados, «Verificar objeto», "
      + "objetos de estructuración y cuantía 0): por eso `destacados_descartados` existe. "
      + "`integridad.ok=false` significa que los números de esta respuesta no cuadran entre sí y no hay que creerlos.",
  };

  /* ---------- paso 9 · guardar en caché (TTL 300 s) ---------- */
  try {
    await redis.set(CLAVES.resumen(perfilId), JSON.stringify(cuerpo), { ex: RESUMEN_TTL_SEG });
  } catch { /* sin caché el dashboard sigue funcionando: solo cuesta más */ }

  return res.status(200).json({ ...cuerpo, cache: false });
};
