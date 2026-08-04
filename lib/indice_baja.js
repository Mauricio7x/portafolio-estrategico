/* ============================================================================
   lib/indice_baja · ¿Cuánto descuentan los ganadores frente al presupuesto?
   ----------------------------------------------------------------------------
   BAJA = (1 − valor_adjudicado / precio_base) · 100

   Responde, para cada entidad y tipo de obra, cuánto suele bajar quien gana.
   Es la otra mitad de la decisión de precio: el índice de competencia dice
   CUÁNTOS se presentan y este dice A CUÁNTO se adjudica. Sale entero del
   corpus histórico que ya está en Redis — no re-extrae nada de SECOP.

   ── TRES GRANULARIDADES, en cascada de más específica a más general ────────
     entidad_familia        «INVIAS baja 8 % en obra vial y 2 % en consultoría»
     entidad                «INVIAS baja 6 % en general»
     departamento_familia   respaldo cuando la entidad no tiene base propia
   `bajaDeMercado` las prueba en ese orden y SIEMPRE dice cuál usó: una cifra
   sin su origen no se puede auditar ni discutir (misma regla que lib/probabilidad).

   ── LO QUE EL CENSO DE PRODUCCIÓN OBLIGÓ A DECIDIR (ago 2026) ──────────────
   El censo (`columnas_historicas`) midió el corpus real y de ahí salen los dos
   filtros de higiene, que no son teoría:
     · 295 procesos con adjudicado < 30 % del oficial. Un contrato no se
       adjudica al 25 % del presupuesto: son lotes parciales o error de dato, y
       promediarlos hundiría la baja de su entidad. Fuera.
     · 221 procesos con adjudicado > 110 % del oficial. Adjudicar por encima
       del techo no es una baja negativa: es otro dato distinto (adiciones ya
       incorporadas, o la columna no es lo que se cree). Fuera.
   Entre −10 % y +70 % de baja SÍ se conserva todo, incluido el cero.

   ── EL CERO NO ES «SIN DATO» AQUÍ, Y ES IMPORTANTE ────────────────────────
   Al revés que `anticipo_pct = 0` o que el contador de oferentes, una baja de
   0 % es un HECHO perfectamente normal: la entidad adjudicó por el presupuesto
   oficial. En producción la MEDIANA de baja es exactamente 0 %, así que tratar
   el cero como ausencia vaciaría el índice. Lo que sí es «sin dato» es no tener
   los dos extremos (presupuesto Y adjudicado) en la MISMA fila, y eso se cuenta
   aparte en `descartados`.
   Como el cero es tan frecuente, `baja_exactamente_cero` viaja en la meta: si
   un día se dispara al 100 %, la explicación no es que el mercado no descuente
   sino que `valor_total_adjudicacion` está copiando a `precio_base`.

   ── HISTOGRAMA, NO LISTA DE VALORES ───────────────────────────────────────
   El acumulador que se persiste entre invocaciones es por GRUPO y guarda un
   histograma de puntos porcentuales enteros, no los procesos. Es lo que hace
   que la construcción sea reanudable sin reventar el tope de 1 MB por valor de
   Upstash — la misma decisión que `indice:competencia`. El precio es que las
   cifras se publican con resolución de 1 punto porcentual, que sobra: la
   diferencia entre «baja del 8 %» y «baja del 8,4 %» no cambia ninguna decisión.

   Las listas de columnas (`CAMPOS_VALOR_ADJUDICADO`, `CAMPOS_ADJUDICATARIO_NIT`)
   y la identidad de la entidad (`claveCanonica`) se IMPORTAN de
   lib/indice_competencia: dos definiciones de «entidad» conviviendo es
   exactamente el defecto que costó caro en ago 2026.
   ========================================================================== */
"use strict";

const crypto = require("crypto");

const {
  CLAVES, leerJSON, escribirJSON, leerJSONComprimido, escribirJSONComprimido, leerChunksDedup,
} = require("./almacen.js");
const {
  numero, primero, claveCanonica, claveEntidad, oferentesDe,
  CAMPOS_VALOR_ADJUDICADO, CAMPOS_ADJUDICATARIO_NIT,
} = require("./indice_competencia.js");
const { normalizarCodigo } = require("./unspsc.js");
const { norm } = require("./semantica.js");

const MIN_PROCESOS = 5;            // mismo mínimo que el índice de competencia
const RATIO_MIN = 0.30;            // adjudicado < 30 % del oficial → lote parcial
const BAJA_MIN = -10;              // adjudicado > 110 % del oficial → dato malo
const CAMPOS_POR_HSET = 200;       // acota el tamaño del request REST de Upstash
const NIVELES_CLASIFICADOS = ["alto", "medio", "bajo"];
const GRANULARIDADES = ["entidad_familia", "entidad", "departamento_familia", "departamento"];
/* Segmento UNSPSC (2 dígitos) DENTRO de cada entidad, con mínimo propio de 3.
   Es más grueso que la familia a propósito: aquí no se está EMPAREJANDO nada
   —eso sigue prohibido por encima de familia, ver lib/unspsc— sino agrupando
   para una estadística de precio, donde más muestra por celda es mejor. El
   mínimo baja a 3 porque el segmento es el último recurso antes de no decir
   nada; va marcado en el registro para que se pueda leer con desconfianza. */
const MIN_SEGMENTO = 3;
const LOCK_TTL_SEG = 300;

/* Cortes FIJOS, no tertiles. El índice de competencia usa tertiles porque
   «muchos oferentes» solo significa algo comparado con el resto del mercado;
   la baja, en cambio, se lee en puntos de margen y tiene significado absoluto:
   un 8 % de descuento son 8 puntos que salen de la utilidad, compita quien
   compita. Con tertiles, además, siempre habría un tercio «alto» aunque nadie
   descontara. */
const CORTE_ALTO = 5;              // > 5 % de baja mediana
const CORTE_MEDIO = 2;             // 2–5 %

function nivelPorBaja(mediana) {
  if (mediana == null) return "sin_dato";
  if (mediana > CORTE_ALTO) return "alto";
  if (mediana >= CORTE_MEDIO) return "medio";
  return "bajo";                   // incluye el 0 % y las bajas negativas leves
}

/* ¿El adjudicatario es real? «No Definido» es el relleno que usa el dataset
   cuando el proceso no llegó a tener ganador: su valor adjudicado no es un
   precio de mercado. */
const NIT_VACIO = new Set(["no definido", "no aplica", "nd", "n/a", "0"]);
const adjudicatarioReal = (lic) => {
  const v = primero(lic, CAMPOS_ADJUDICATARIO_NIT);
  if (v == null) return false;
  const n = norm(v);
  return n !== "" && !NIT_VACIO.has(n);
};

/* Familia UNSPSC (4 dígitos) del código PRINCIPAL. Si no hay código principal
   legible el proceso no aporta a las granularidades por familia — pero sí a la
   de entidad: perder el proceso entero sería peor que perder su detalle. */
function familiaDe(lic) {
  // `normalizarCodigo` ya devuelve la familia calculada con la jerarquía real
  // (rellena a 8, descarta el segmento «00» y lee el nivel por los pares
  // finales). Recortar aquí los 4 primeros dígitos a mano sería una segunda
  // definición de «familia», y esa es exactamente la clase de duplicación que
  // este proyecto paga cara.
  const c = normalizarCodigo(lic && lic.codigo_principal_de_categoria);
  return c ? c.familia : null;
}

/* Segmento UNSPSC (2 dígitos) del código principal, por la misma vía que la
   familia: nunca un `slice` a mano. */
function segmentoDe(lic) {
  const c = normalizarCodigo(lic && lic.codigo_principal_de_categoria);
  return c ? c.segmento : null;
}

/* Percentil sobre el histograma {puntoPorcentual: nProcesos}. Genérico y propio
   (no `medianaHistograma`) porque hacen falta p25/p75 además de la mediana y
   porque aquí las cubetas pueden ser NEGATIVAS. */
function percentilHistograma(hist, total, p) {
  if (!total) return null;
  const cubetas = Object.keys(hist).map(Number).filter(Number.isFinite).sort((a, b) => a - b);
  if (!cubetas.length) return null;
  const objetivo = p * total;
  let acum = 0;
  for (const k of cubetas) {
    acum += hist[k];
    if (acum >= objetivo) return k;
  }
  return cubetas[cubetas.length - 1];
}

/* ---------- acumulación ---------- */
function sumar(grupo, clave, bajaPct, extra) {
  let g = grupo[clave];
  if (!g) { g = grupo[clave] = { n: 0, suma: 0, hist: {}, ...extra }; }
  const cubeta = Math.round(bajaPct);
  g.hist[cubeta] = (g.hist[cubeta] || 0) + 1;
  // `suma` lleva la baja SIN redondear: el promedio se calcula sobre el valor
  // real y solo el histograma (percentiles) trabaja con cubetas enteras
  g.suma += bajaPct;
  g.n++;
  return g;
}

function acumular(acc, stats, lic) {
  stats.filas++;

  const pb = numero(lic.precio_base);
  if (pb == null || pb <= 0) { stats.sin_precio_base++; return; }

  const va = numero(primero(lic, CAMPOS_VALOR_ADJUDICADO));
  if (va == null || va <= 0) { stats.sin_adjudicado++; return; }

  if (!adjudicatarioReal(lic)) { stats.adjudicatario_no_definido++; return; }

  if (va < pb * RATIO_MIN) { stats.bajo_30_pct++; return; }

  const baja = (1 - va / pb) * 100;
  if (baja < BAJA_MIN) { stats.sobre_110_pct++; return; }

  stats.analizados++;
  if (Math.round(baja) === 0) stats.baja_exactamente_cero++;
  // histograma GLOBAL: es la «baja del mercado» que pinta el panel, y sale de
  // esta misma pasada. Calcularla después promediando las medianas por entidad
  // daría otra cosa —cada entidad pesaría igual tenga 5 procesos o 500— y las
  // dos cifras acabarían discrepando sin que nadie supiera cuál mirar.
  stats.hist_global[Math.round(baja)] = (stats.hist_global[Math.round(baja)] || 0) + 1;

  const { clave: ent, nombre, nit } = claveEntidad(lic);
  const depto = String(lic.departamento_entidad || "").trim().toUpperCase();
  const fam = familiaDe(lic);
  const seg = segmentoDe(lic);
  // nº de oferentes por la MISMA lectura que el índice de competencia: 0 es
  // «sin dato» allí y tiene que seguir siéndolo aquí
  const oferentes = oferentesDe(lic);

  if (ent) {
    const g = sumar(acc.entidad, ent, baja, { nombre, nit });
    if (!g.nit && nit) g.nit = nit;
    /* Oferentes: se acumulan aparte porque NO todos los procesos con baja
       traen el conteo. Mezclarlos en `n` haría que el promedio de oferentes se
       calculara sobre una muestra distinta de la de la baja, y las dos cifras
       de la misma tarjeta describirían conjuntos diferentes. */
    if (oferentes != null) {
      g.of_n = (g.of_n || 0) + 1;
      g.of_suma = (g.of_suma || 0) + oferentes;
    }
    /* Segmentos ANIDADOS dentro de la entidad, como pide el encargo: así
       `baja_segmento` se resuelve con la misma lectura del hash de entidad, sin
       un cuarto comando de Redis por petición. */
    if (seg) {
      if (!g.seg) g.seg = {};
      let sg = g.seg[seg];
      if (!sg) sg = g.seg[seg] = { n: 0, suma: 0, hist: {} };
      const cubeta = Math.round(baja);
      sg.hist[cubeta] = (sg.hist[cubeta] || 0) + 1;
      sg.suma += baja;
      sg.n++;
    }
    if (fam) sumar(acc.entidad_familia, `${ent}|${fam}`, baja, { nombre, familia: fam });
  }
  if (depto) {
    sumar(acc.departamento, depto, baja, { departamento: depto });
    if (fam) sumar(acc.departamento_familia, `${depto}|${fam}`, baja, { departamento: depto, familia: fam });
  }
}

/* Un grupo del acumulador → el registro que se publica. Por debajo del mínimo
   se conserva el CONTEO (es un hecho y explica el ⚪) y se anula todo lo
   derivado: la lección de «18.2 oferentes sin base», aplicada aquí desde el
   primer día. */
const red1 = (x) => (x == null ? null : Math.round(x * 10) / 10);

function registroPublicado(g) {
  const comun = {
    nombre: g.nombre || null,
    nit: g.nit || null,
    familia: g.familia || null,
    departamento: g.departamento || null,
    procesos: g.n,
    procesos_contados: g.n,
    min_procesos: MIN_PROCESOS,
    /* Oferentes de los procesos que aportaron baja. Va con su PROPIO conteo:
       `oferentes_procesos` casi nunca es igual a `procesos`, y publicar el
       promedio sin él dejaría una cifra cuya muestra nadie puede comprobar. */
    oferentes_procesos: g.of_n || 0,
    oferentes_promedio: g.of_n ? red1(g.of_suma / g.of_n) : null,
  };
  if (g.n < MIN_PROCESOS) {
    return {
      ...comun, baja_promedio: null, baja_mediana: null,
      baja_p25: null, baja_p75: null, nivel: "sin_dato", segmentos: {},
    };
  }
  const mediana = percentilHistograma(g.hist, g.n, 0.5);
  /* Segmentos UNSPSC con su propio mínimo (3), más bajo que el de la entidad.
     Cada uno declara `procesos` y `min_procesos` para que se lea sabiendo sobre
     cuánta muestra está construido: una mediana de 3 procesos es orientativa,
     no una medición, y el consumidor tiene que poder distinguirla. */
  const segmentos = {};
  for (const [seg, sg] of Object.entries(g.seg || {})) {
    if (sg.n < MIN_SEGMENTO) continue;
    const m = percentilHistograma(sg.hist, sg.n, 0.5);
    segmentos[seg] = {
      procesos: sg.n,
      min_procesos: MIN_SEGMENTO,
      baja_promedio: red1(sg.suma / sg.n),
      baja_mediana: m,
      nivel: nivelPorBaja(m),
    };
  }
  return {
    ...comun,
    baja_promedio: red1(g.suma / g.n),
    baja_mediana: mediana,
    baja_p25: percentilHistograma(g.hist, g.n, 0.25),
    baja_p75: percentilHistograma(g.hist, g.n, 0.75),
    nivel: nivelPorBaja(mediana),
    segmentos,
  };
}

/* ========================= construirIndiceBaja =========================
   Recorre el histórico MES A MES y es reanudable, igual que el índice de
   competencia y por el mismo motivo: en producción son ~48 000 procesos y una
   función serverless tiene reloj. Devuelve `{done}` para encajar en el
   encadenamiento de /api/sync/historico. */
async function construirIndiceBaja(redis, { presupuestoMs = 40000, reiniciar = false, log = () => {} } = {}) {
  const t0 = Date.now();

  /* Candado CON TTL, liberado por token. Dos construcciones simultáneas no
     corromperían el resultado (el swap es atómico) pero sí duplicarían el
     trabajo caro sobre el histórico entero, y una podría publicar encima de la
     otra a mitad. El TTL es la garantía de que nunca se quede puesto: es la
     misma decisión que `lock:sync`. */
  const token = crypto.randomUUID();
  let tengoCandado = false;
  try {
    tengoCandado = (await redis.set(CLAVES.lockIndiceBaja, token, { nx: true, ex: LOCK_TTL_SEG })) === "OK";
  } catch { /* sin candado disponible se sigue: es optimización, no corrección */ tengoCandado = true; }
  if (!tengoCandado) {
    log("índice de baja: ya hay una construcción en curso");
    return { done: false, enCurso: true, msg: "ya hay una construcción del índice de baja en curso" };
  }
  try {
    return await construir(redis, { presupuestoMs, reiniciar, log, t0 });
  } finally {
    try { if ((await redis.get(CLAVES.lockIndiceBaja)) === token) await redis.del(CLAVES.lockIndiceBaja); }
    catch { /* el TTL lo limpia */ }
  }
}

async function construir(redis, { presupuestoMs, reiniciar, log, t0 }) {
  const claves = await redis.scan(CLAVES.patronChunksHist);
  const porMes = new Map();
  for (const k of claves) {
    const mes = CLAVES.mesDeClaveHist(k);
    if (!mes) continue;
    if (!porMes.has(mes)) porMes.set(mes, []);
    porMes.get(mes).push(k);
  }

  let p = reiniciar ? null : await leerJSONComprimido(redis, CLAVES.indiceBajaProgreso);
  if (!p || !Array.isArray(p.pendientes)) {
    p = {
      iniciado: new Date().toISOString(),
      pendientes: [...porMes.keys()].sort(),
      acc: { entidad: {}, entidad_familia: {}, departamento_familia: {}, departamento: {} },
      stats: {
        filas: 0, analizados: 0, baja_exactamente_cero: 0, meses: 0,
        sin_precio_base: 0, sin_adjudicado: 0, adjudicatario_no_definido: 0,
        bajo_30_pct: 0, sobre_110_pct: 0,
        hist_global: {},
      },
    };
  }
  if (!p.pendientes.length && !porMes.size) {
    return { done: true, vacio: true, grupos: 0, clasificados: 0, msg: "no hay corpus histórico todavía" };
  }

  while (p.pendientes.length) {
    if (Date.now() - t0 > presupuestoMs) {
      await escribirJSONComprimido(redis, CLAVES.indiceBajaProgreso, p);
      return { done: false, pendientes: p.pendientes.length, analizados: p.stats.analizados };
    }
    const mes = p.pendientes[0];
    const registros = await leerChunksDedup(redis, porMes.get(mes) || []);
    for (const r of registros) acumular(p.acc, p.stats, r);
    p.stats.meses++;
    p.pendientes.shift();
    await escribirJSONComprimido(redis, CLAVES.indiceBajaProgreso, p);
    log(`baja: ${mes} → ${registros.length} procesos (${p.stats.analizados} analizados)`);
  }

  /* ---------- publicación con swap atómico, una por granularidad ---------- */
  const resumen = {};
  for (const nivel of GRANULARIDADES) {
    const grupos = Object.entries(p.acc[nivel] || {});
    const destinoFinal = CLAVES.indiceBaja(nivel);
    const destinoNuevo = CLAVES.indiceBajaNuevo(nivel);

    const publicarEn = async (destino) => {
      let lote = {}, enLote = 0;
      for (const [clave, g] of grupos) {
        lote[clave] = registroPublicado(g);
        if (++enLote >= CAMPOS_POR_HSET) { await redis.hset(destino, lote); lote = {}; enLote = 0; }
      }
      if (enLote) await redis.hset(destino, lote);
    };

    if (!grupos.length) {
      // sin nada que publicar, el índice se deja VACÍO en vez de conservar uno
      // viejo: todo cae a "sin_dato" y la meta explica por qué en `descartados`
      await redis.del(destinoFinal, destinoNuevo);
    } else {
      await redis.del(destinoNuevo);
      await publicarEn(destinoNuevo);
      try {
        await redis.rename(destinoNuevo, destinoFinal);
      } catch {
        // sin RENAME: se publica sobre la vigente (ventana corta a medias, y
        // lo peor que puede pasar es que algún grupo caiga a "sin_dato")
        await redis.del(destinoFinal);
        await publicarEn(destinoFinal);
        await redis.del(destinoNuevo);
      }
    }

    const porNivel = { alto: 0, medio: 0, bajo: 0, sin_dato: 0 };
    for (const [, g] of grupos) porNivel[registroPublicado(g).nivel]++;
    resumen[nivel] = { grupos: grupos.length, clasificados: grupos.length - porNivel.sin_dato, por_nivel: porNivel };
  }

  const meta = {
    generado: new Date().toISOString(),
    min_procesos: MIN_PROCESOS,
    cortes: { alto_desde: CORTE_ALTO, medio_desde: CORTE_MEDIO },
    filtros: { ratio_min: RATIO_MIN, baja_min: BAJA_MIN },
    procesos_con_par: p.stats.analizados + p.stats.bajo_30_pct + p.stats.sobre_110_pct,
    procesos_analizados: p.stats.analizados,
    // en producción la mediana global es 0 %: si esto se acercara al total, la
    // causa sería que el valor adjudicado copia al presupuesto, no el mercado
    baja_exactamente_cero: p.stats.baja_exactamente_cero,
    // la baja del mercado entero, ponderada por proceso (no la media de las
    // medianas por entidad, que pesaría igual a una alcaldía con 5 procesos
    // que a una gobernación con 500)
    baja_mediana_global: percentilHistograma(p.stats.hist_global, p.stats.analizados, 0.5),
    baja_p25_global: percentilHistograma(p.stats.hist_global, p.stats.analizados, 0.25),
    baja_p75_global: percentilHistograma(p.stats.hist_global, p.stats.analizados, 0.75),
    descartados: {
      sin_precio_base: p.stats.sin_precio_base,
      sin_adjudicado: p.stats.sin_adjudicado,
      adjudicatario_no_definido: p.stats.adjudicatario_no_definido,
      bajo_30_pct: p.stats.bajo_30_pct,
      sobre_110_pct: p.stats.sobre_110_pct,
    },
    filas_leidas: p.stats.filas,
    meses: p.stats.meses,
    entidades_clasificadas: resumen.entidad ? resumen.entidad.clasificados : 0,
    entidades_sin_dato: resumen.entidad ? resumen.entidad.por_nivel.sin_dato : 0,
    por_granularidad: resumen,
  };
  await escribirJSON(redis, CLAVES.indiceBajaMeta, meta);
  await redis.del(CLAVES.indiceBajaProgreso);
  // la caché de /api/indice-baja lleva el sello del índice, pero se borra
  // igualmente aquí: una caché que solo caduca es una caché que miente una hora
  await redis.del(CLAVES.cacheIndiceBaja);
  log(`índice de baja publicado: ${meta.entidades_clasificadas} entidades clasificadas`);
  return { done: true, ...meta };
}

/* ============================ lectura ============================ */
async function leerIndiceBajaMeta(redis) { return leerJSON(redis, CLAVES.indiceBajaMeta); }

/* Las tres granularidades de una vez: tres comandos, y /api/oportunidades lo
   memoiza por instancia caliente contra el sello de la meta. */
async function leerIndiceBaja(redis) {
  const out = {};
  for (const nivel of GRANULARIDADES) {
    const crudo = await redis.hgetall(CLAVES.indiceBaja(nivel));
    const mapa = {};
    for (const [k, v] of Object.entries(crudo || {})) {
      if (v == null) continue;
      if (typeof v === "object") { mapa[k] = v; continue; }
      try { mapa[k] = JSON.parse(v); } catch { /* campo corrupto: se ignora */ }
    }
    out[nivel] = mapa;
  }
  return out;
}

const SIN_DATO = Object.freeze({
  nivel: "sin_dato", baja_mediana: null, baja_promedio: null, baja_p25: null, baja_p75: null,
  procesos_contados: 0, granularidad_utilizada: null,
  mensaje: "Sin datos históricos de baja para esta entidad.",
});

/* Un registro solo cuenta si tiene base: mínimo de procesos, nivel clasificado
   y mediana presente. Es el MISMO contrato que `competenciaDe`, y existe por lo
   mismo: `indice:baja` tampoco se purga, así que un hash escrito por una
   versión anterior no puede colar una cifra sin base. */
function utilizable(m) {
  if (!m || m.ref) return null;
  const procesos = Math.max(0, Math.trunc(numero(m.procesos ?? m.procesos_contados) || 0));
  if (procesos < MIN_PROCESOS) return null;
  if (!NIVELES_CLASIFICADOS.includes(m.nivel)) return null;
  const mediana = numero(m.baja_mediana);
  if (mediana == null) return null;
  return { procesos, mediana, m };
}

function mensajeDe(granularidad, mediana, procesos, m) {
  const pct = `${mediana}%`;
  if (granularidad === "entidad_familia") {
    return `Descuento típico del ${pct} en esta entidad para este tipo de obra (${procesos} procesos).`;
  }
  if (granularidad === "entidad") {
    return `Descuento típico del ${pct} en esta entidad, todos los tipos de obra (${procesos} procesos).`;
  }
  const donde = (m && m.departamento) || "el departamento";
  return `Sin base propia de la entidad: descuento típico del ${pct} en ${donde} para este tipo de obra (${procesos} procesos).`;
}

/* ============================ bajaDeMercado ============================
   PUNTO ÚNICO DE PASO de los tres consumidores (tarjeta, /api/resumen,
   lib/probabilidad), igual que `competenciaDe`. Toma el índice como argumento
   —no lo cachea por dentro— para que no haya estado global escondido en una
   función serverless y para que las pruebas puedan construir uno a mano.

   `granularidad` fija DÓNDE EMPIEZA la cascada, no dónde termina: siempre se
   degrada hacia lo más general y `granularidad_utilizada` dice qué respondió. */
function bajaDeMercado(indice, lic, { granularidad = "entidad_familia" } = {}) {
  if (!indice || !lic) return SIN_DATO;

  const ent = claveCanonica(lic.entidad);
  const depto = String(lic.departamento_entidad || "").trim().toUpperCase();
  const fam = familiaDe(lic);

  const candidatas = [
    { g: "entidad_familia", clave: ent && fam ? `${ent}|${fam}` : null },
    { g: "entidad", clave: ent || null },
    { g: "departamento_familia", clave: depto && fam ? `${depto}|${fam}` : null },
  ];
  // `slice` y no una rotación: pedir `entidad` no puede acabar respondiendo con
  // `entidad_familia`, que es MÁS específica de lo que se pidió. La cascada solo
  // baja en especificidad, nunca sube.
  const desde = Math.max(0, GRANULARIDADES.indexOf(granularidad));
  const orden = candidatas.slice(desde);

  // se recuerda el mayor conteo visto aunque no alcance el mínimo: es un hecho,
  // y es lo que explica en la tarjeta por qué sale ⚪ en vez de un número
  let vistosSinBase = 0;
  for (const { g, clave } of orden) {
    if (!clave) continue;
    const m = (indice[g] || {})[clave];
    const ok = utilizable(m);
    if (!ok) {
      const n = m ? Math.max(0, Math.trunc(numero(m.procesos ?? m.procesos_contados) || 0)) : 0;
      if (n > vistosSinBase) vistosSinBase = n;
      continue;
    }
    return {
      nivel: ok.m.nivel,
      baja_mediana: ok.mediana,
      // el promedio acompaña a la mediana, nunca la sustituye: con la
      // distribución de baja tan sesgada hacia el 0 % que tiene el mercado
      // colombiano, la media sola daría una imagen equivocada
      baja_promedio: numero(ok.m.baja_promedio),
      baja_p25: numero(ok.m.baja_p25),
      baja_p75: numero(ok.m.baja_p75),
      procesos_contados: ok.procesos,
      granularidad_utilizada: g,
      mensaje: mensajeDe(g, ok.mediana, ok.procesos, ok.m),
    };
  }

  if (vistosSinBase > 0) {
    return {
      ...SIN_DATO,
      procesos_contados: vistosSinBase,
      mensaje: `Sin base suficiente: hacen falta ${MIN_PROCESOS} procesos adjudicados y hay ${vistosSinBase}.`,
    };
  }
  return SIN_DATO;
}

/* ============================ bajaSegmentoDe ============================
   Mediana de la entidad para el SEGMENTO UNSPSC del proceso. Se resuelve con la
   misma lectura del hash de entidad —los segmentos van anidados— así que no
   cuesta ningún comando extra de Redis.

   Devuelve `null` (no un objeto «sin dato») porque su consumidor es un campo
   de la respuesta pública que el encargo define como «null si no hay datos». */
function bajaSegmentoDe(indice, lic) {
  if (!indice || !lic) return null;
  const ent = claveCanonica(lic.entidad);
  const seg = segmentoDe(lic);
  if (!ent || !seg) return null;
  const m = (indice.entidad || {})[ent];
  if (!m || m.ref || !m.segmentos) return null;
  const sg = m.segmentos[seg];
  if (!sg || sg.baja_mediana == null) return null;
  const procesos = Math.max(0, Math.trunc(numero(sg.procesos) || 0));
  if (procesos < MIN_SEGMENTO) return null;
  return {
    segmento: seg,
    baja_mediana: numero(sg.baja_mediana),
    baja_promedio: numero(sg.baja_promedio),
    procesos,
    min_procesos: MIN_SEGMENTO,
    nivel: sg.nivel || nivelPorBaja(numero(sg.baja_mediana)),
  };
}

module.exports = {
  construirIndiceBaja, leerIndiceBaja, leerIndiceBajaMeta, bajaDeMercado, bajaSegmentoDe,
  segmentoDe, MIN_SEGMENTO,
  nivelPorBaja, percentilHistograma, familiaDe, registroPublicado, adjudicatarioReal,
  MIN_PROCESOS, RATIO_MIN, BAJA_MIN, CORTE_ALTO, CORTE_MEDIO, GRANULARIDADES, NIVELES_CLASIFICADOS,
};
