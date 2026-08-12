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

   ── POR MODALIDAD (ago 2026) ──────────────────────────────────────────────
   La mediana global mezclaba Licitación Pública con Mínima Cuantía, y eso hace
   daño en una dirección concreta: la mínima cuantía se adjudica muchísimas
   veces por el presupuesto oficial, así que arrastra la mediana al 0 % y el
   panel acaba sugiriendo que NUNCA hay que descontar — justo en los procesos
   grandes, que son los que se ganan o se pierden por precio.

   PRECISIÓN QUE IMPORTA: el corpus histórico **ya está filtrado** a modalidades
   competitivas (`transformar` aplica `modalidad_competitiva` ANTES de guardar),
   así que aquí no entra Contratación Directa. Lo que se mezclaba no eran
   «todas las modalidades» sino las seis competitivas entre sí. Aun así la lista
   blanca hace un trabajo real al reagrupar: `licitaciones:historico:mes:*` NO
   SE PURGA NUNCA, de modo que siguen vivos registros ingeridos ANTES de que
   «Invitación Privada» y «Enajenación» pasaran a la lista de excluidas. Esos
   caen en `sin_modalidad` y se cuentan, en vez de contaminar una cubeta.

   Las cubetas se DERIVAN de `MODALIDADES_COMPETITIVAS` (lib/filtros), nunca se
   copian: una segunda lista de «qué es competitivo» divergiría de la que decide
   la ingesta a la primera corrección. El `require` va DIFERIDO dentro de la
   función, igual que en lib/apu/inferencia y por lo mismo: `filtros` resuelve
   con esa técnica sus dos ciclos (`→ rup →` y `→ negocio →`) y pedirlo en
   tiempo de carga ataría este módulo a ese nudo. Hoy no hay ciclo —nada de la
   cadena de `filtros` alcanza este archivo— y hay prueba que lo comprueba.

   `por_modalidad` va ANIDADO en cada registro, igual que `segmentos`: se
   resuelve con la misma lectura del hash y no cuesta un comando más de Redis.
   El mínimo es el MISMO de la entidad (5) y no el laxo del segmento (3), porque
   aquí sí hay a dónde caer —la cifra mezclada de la entidad— mientras que el
   segmento es el último recurso antes de no decir nada.

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

/* ══════════════════ Modalidad: las cubetas y su reconocedor ══════════════════
   Las cubetas se derivan de la lista blanca que ya decide la ingesta. Hay UNA
   cubeta que no sale de ella y conviene explicar por qué: «Contratación régimen
   especial (con ofertas)» SÍ es competitiva —`modalidad_competitiva` la acepta
   por su propia rama, antes de mirar la lista blanca— pero no figura en
   `MODALIDADES_COMPETITIVAS`. Sin esta cubeta, esos procesos caerían en
   `sin_modalidad` pese a estar legítimamente en el corpus. La prueba que ata las
   dos funciones lo vigila: todo lo que `modalidad_competitiva` acepta tiene que
   tener cubeta, y nada que rechace puede tenerla. */
const REGIMEN_ESPECIAL = norm("regimen especial (con ofertas)");

let _modalidades = null;
function tablaModalidades() {
  if (_modalidades) return _modalidades;
  // DIFERIDO a propósito (ver cabecera). `require` está memoizado por Node, así
  // que esto es una búsqueda en el caché de módulos; la tabla derivada se
  // memoiza aparte para no reconstruirla en cada uno de los ~48 000 procesos.
  const { MODALIDADES_COMPETITIVAS, MODALIDADES_EXCLUIDAS } = require("./filtros.js");
  _modalidades = {
    competitivas: MODALIDADES_COMPETITIVAS,
    excluidas: MODALIDADES_EXCLUIDAS,
    cubetas: [...MODALIDADES_COMPETITIVAS, REGIMEN_ESPECIAL],
  };
  return _modalidades;
}

/* Modalidad de un proceso → su cubeta canónica, o `null` si no la tiene.
   Reproduce RAMA POR RAMA la cascada de `modalidad_competitiva` (régimen
   especial → excluidas → lista blanca) en vez de inventarse un criterio: si las
   dos divergieran, el índice agruparía procesos que la ingesta no habría dejado
   entrar, o al revés. `null` NO es «no competitiva»: es «sin cubeta», y se
   cuenta aparte. */
function modalidadCanonica(lic) {
  const n = norm((lic && (lic.modalidad_de_contratacion || lic.tipo_de_proceso)) || "");
  if (!n) return null;
  const { competitivas, excluidas } = tablaModalidades();
  if (n.includes("regimen especial")) return n.includes("con ofertas") ? REGIMEN_ESPECIAL : null;
  if (excluidas.some((e) => n.includes(e))) return null;
  return competitivas.find((e) => n.includes(e)) || null;
}

const modalidadesConocidas = () => [...tablaModalidades().cubetas];

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
/* Un sub-acumulador (segmento o modalidad) dentro de un grupo: misma forma que
   el grupo mismo —`n`, `suma` sin redondear, histograma de puntos enteros— para
   que `percentilHistograma` y el promedio se calculen igual en los tres sitios
   y no haya tres aritméticas que mantener sincronizadas. */
function sumarEn(contenedor, clave, bajaPct, cubeta, etiqueta) {
  let s = contenedor[clave];
  if (!s) s = contenedor[clave] = { n: 0, suma: 0, hist: {} };
  /* Etiqueta = cómo lo escribe el dataset («Licitación pública»), frente a la
     clave canónica, que es normalizada («licitacion publica»). Mismo reparto que
     `claveCanonica`/`nombre` en las entidades: se AGRUPA por la canónica y se
     MUESTRA la original, porque una cifra escrita «en licitacion publica» en un
     mensaje al dueño se lee como un error tipográfico de la app. Se queda la
     primera vista; da igual cuál, todas son la misma modalidad. */
  if (etiqueta && !s.etiqueta) s.etiqueta = etiqueta;
  s.hist[cubeta] = (s.hist[cubeta] || 0) + 1;
  s.suma += bajaPct;
  s.n++;
  return s;
}

function sumar(grupo, clave, bajaPct, extra, modalidad, etiquetaModalidad) {
  let g = grupo[clave];
  if (!g) { g = grupo[clave] = { n: 0, suma: 0, hist: {}, ...extra }; }
  const cubeta = Math.round(bajaPct);
  g.hist[cubeta] = (g.hist[cubeta] || 0) + 1;
  // `suma` lleva la baja SIN redondear: el promedio se calcula sobre el valor
  // real y solo el histograma (percentiles) trabaja con cubetas enteras
  g.suma += bajaPct;
  g.n++;
  /* Modalidad ANIDADA en TODAS las granularidades, no solo en la entidad: la
     cascada de `bajaDeMercado` refina por modalidad en cada nivel que visita, y
     si un nivel no la trajera, el refinamiento aparecería y desaparecería según
     por dónde hubiera caído la cascada. */
  if (modalidad) {
    if (!g.mod) g.mod = {};
    sumarEn(g.mod, modalidad, bajaPct, cubeta, etiquetaModalidad);
  }
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

  /* Histograma global POR MODALIDAD, en la misma pasada y por el mismo motivo
     que el global: promediar después las medianas por entidad pesaría igual a
     una alcaldía con 5 procesos que a una gobernación con 500.
     `sin_modalidad` cuenta los que no casan con ninguna cubeta —los registros
     viejos del histórico, que nunca se purga— porque un descarte silencioso
     haría que las cubetas no sumaran los analizados y nadie lo notaría. */
  const mod = modalidadCanonica(lic);
  const modEtiqueta = mod
    ? String(lic.modalidad_de_contratacion || lic.tipo_de_proceso || "").trim() || null
    : null;
  if (mod) sumarEn(stats.hist_modalidad, mod, baja, Math.round(baja), modEtiqueta);
  else stats.sin_modalidad++;

  const { clave: ent, nombre, nit } = claveEntidad(lic);
  const depto = String(lic.departamento_entidad || "").trim().toUpperCase();
  const fam = familiaDe(lic);
  const seg = segmentoDe(lic);
  // nº de oferentes por la MISMA lectura que el índice de competencia: 0 es
  // «sin dato» allí y tiene que seguir siéndolo aquí
  const oferentes = oferentesDe(lic);

  if (ent) {
    const g = sumar(acc.entidad, ent, baja, { nombre, nit }, mod, modEtiqueta);
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
      sumarEn(g.seg, seg, baja, Math.round(baja));
    }
    if (fam) sumar(acc.entidad_familia, `${ent}|${fam}`, baja, { nombre, familia: fam }, mod, modEtiqueta);
  }
  if (depto) {
    sumar(acc.departamento, depto, baja, { departamento: depto }, mod, modEtiqueta);
    if (fam) sumar(acc.departamento_familia, `${depto}|${fam}`, baja, { departamento: depto, familia: fam }, mod, modEtiqueta);
  }
}

/* Un grupo del acumulador → el registro que se publica. Por debajo del mínimo
   se conserva el CONTEO (es un hecho y explica el ⚪) y se anula todo lo
   derivado: la lección de «18.2 oferentes sin base», aplicada aquí desde el
   primer día. */
const red1 = (x) => (x == null ? null : Math.round(x * 10) / 10);

/* Sub-acumulador → registro publicable, con la MISMA regla de honestidad que el
   grupo: por debajo de su mínimo se conserva el CONTEO (es un hecho) y se anula
   todo lo derivado. `min_procesos` viaja siempre para que la cifra se lea
   sabiendo sobre cuánta muestra está construida. */
function subRegistro(s, minimo) {
  const base = { procesos: s.n, min_procesos: minimo, etiqueta: s.etiqueta || null };
  if (s.n < minimo) {
    return { ...base, baja_promedio: null, baja_mediana: null, baja_p25: null, baja_p75: null, nivel: "sin_dato" };
  }
  const m = percentilHistograma(s.hist, s.n, 0.5);
  return {
    ...base,
    baja_promedio: red1(s.suma / s.n),
    baja_mediana: m,
    baja_p25: percentilHistograma(s.hist, s.n, 0.25),
    baja_p75: percentilHistograma(s.hist, s.n, 0.75),
    nivel: nivelPorBaja(m),
  };
}

/* Las cubetas de modalidad de un grupo. Se publican TODAS las observadas,
   incluidas las que no llegan al mínimo: su conteo es lo que explica por qué la
   cascada no las usó, y ocultarlas dejaría al consumidor sin saber si la
   modalidad no existe en esa entidad o solo le falta muestra. */
function modalidadesPublicadas(g) {
  const out = {};
  for (const [m, s] of Object.entries(g.mod || {})) out[m] = subRegistro(s, MIN_PROCESOS);
  return out;
}

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
      // si el grupo entero no llega al mínimo, ninguna de sus cubetas puede
      // llegar tampoco; se publican igual con su conteo, que es lo que explica
      // el ⚪ en vez de dejar al lector sin saber si la modalidad ni siquiera
      // aparece en esta entidad
      por_modalidad: modalidadesPublicadas(g),
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
    por_modalidad: modalidadesPublicadas(g),
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
        hist_global: {}, hist_modalidad: {}, sin_modalidad: 0,
      },
    };
  }
  /* Un progreso a medias escrito por la versión ANTERIOR no trae los campos de
     modalidad, y `sumarEn(undefined, …)` reventaría la reanudación en vez de
     degradarse. Se normaliza en vez de reiniciar: tirar el avance de una
     construcción que recorre el histórico entero sería el peor arreglo posible.
     Los procesos ya acumulados en esa corrida quedan sin cubeta —es un hecho, y
     `sin_modalidad` no los contará porque nunca pasaron por aquí—, así que la
     primera reconstrucción completa es la que deja las cifras a cuadrar. */
  if (!p.stats.hist_modalidad) p.stats.hist_modalidad = {};
  if (typeof p.stats.sin_modalidad !== "number") p.stats.sin_modalidad = 0;
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
    /* LA MISMA CIFRA, ABIERTA POR MODALIDAD. Es el motivo de todo esto: la
       global mezcla mínima cuantía —que se adjudica una y otra vez por el
       presupuesto oficial— con licitación pública, donde sí se compite por
       precio, y el resultado sugiere que nunca hay que descontar.
       `sin_modalidad` + Σ procesos de las cubetas = `procesos_analizados`, y
       hay prueba de esa igualdad: sin ella una cubeta podría perderse sin que
       nadie lo notara. */
    por_modalidad: Object.fromEntries(
      Object.entries(p.stats.hist_modalidad || {})
        .sort((a, b) => b[1].n - a[1].n || a[0].localeCompare(b[0]))
        .map(([m, s]) => [m, subRegistro(s, MIN_PROCESOS)]),
    ),
    sin_modalidad: p.stats.sin_modalidad || 0,
    modalidades_conocidas: modalidadesConocidas(),
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
  // presente SIEMPRE, también aquí: si faltara, un consumidor no podría
  // distinguir «no se refinó por modalidad» de «este campo no existe» — es la
  // misma cerradura que `granularidad_utilizada`, que nunca viaja ausente
  modalidad_utilizada: null,
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

/* ══════════ EL MISMO DATO, DICHO COMO INSTRUCCIÓN DE PRECIO ═════════════════
   «Descuento típico del 5 %» describe una PROPIEDAD DE LA ENTIDAD, y como tal
   es inútil: el dueño lo dijo con todas las letras — «¿de qué me sirve que me
   diga que la entidad adjudica el 95 % de su presupuesto?». Tiene razón sobre
   el síntoma, aunque la cifra no mide eso: NO mide si la entidad ejecuta su
   presupuesto (eso lo obliga la norma), mide CUÁNTO DESCONTÓ EL QUE GANÓ. Son
   dos cosas distintas y la redacción vieja las confundía. De ahí que sonara a
   trivia.

   Dicho como lo que de verdad decide —a qué precio hay que ofertar para tener
   opción—, el mismo número es de lo más accionable que tiene la aplicación. La
   cifra no cambia: cambia de quién habla la frase, de la entidad a QUIEN VA A
   OFERTAR. */
function mensajeDe(granularidad, mediana, procesos, m, modalidad) {
  const pct = `${mediana}%`;
  /* La modalidad, cuando se usó, va DELANTE: es la distinción que más cambia la
     decisión de precio, y una mediana de licitación pública leída como si fuera
     la de la entidad entera es exactamente el error que este refinamiento
     existe para evitar. */
  const enMod = modalidad ? ` en ${modalidad}` : "";
  const base = `${procesos} ${procesos === 1 ? "contrato ya adjudicado" : "contratos ya adjudicados"}`;

  /* Una mediana de 0 NO es «sin dato» aquí (excepción declarada de R1:
     adjudicar por el presupuesto oficial es la mediana real en mínima cuantía),
     pero «ofertá 0 % por debajo» sería una instrucción absurda. Se dice lo que
     de verdad pasa: aquí se gana sin descontar. */
  if (mediana <= 0) {
    return `Aquí se gana sin bajar el precio: los que ganaron${enMod} ofertaron prácticamente por el `
      + `presupuesto oficial (${base}).`;
  }

  const instruccion = `Para tener opción hay que ofertar cerca de ${pct} por debajo del presupuesto oficial`;
  if (granularidad === "entidad_familia") {
    return `${instruccion}: es lo que descontaron los que ganaron${enMod} en esta entidad para este tipo de obra (${base}).`;
  }
  if (granularidad === "entidad") {
    return modalidad
      ? `${instruccion}: es lo que descontaron los que ganaron en esta entidad en ${modalidad} (${base}).`
      : `${instruccion}: es lo que descontaron los que ganaron en esta entidad, en todos los tipos de obra (${base}).`;
  }
  const donde = (m && m.departamento) || "el departamento";
  return `${instruccion}. Esta entidad no tiene historial propio suficiente, así que sale de lo que `
    + `descontaron los que ganaron${enMod} en ${donde} para este tipo de obra (${base}).`;
}

/* ============================ bajaDeMercado ============================
   PUNTO ÚNICO DE PASO de los tres consumidores (tarjeta, /api/resumen,
   lib/probabilidad), igual que `competenciaDe`. Toma el índice como argumento
   —no lo cachea por dentro— para que no haya estado global escondido en una
   función serverless y para que las pruebas puedan construir uno a mano.

   `granularidad` fija DÓNDE EMPIEZA la cascada, no dónde termina: siempre se
   degrada hacia lo más general y `granularidad_utilizada` dice qué respondió.

   LA MODALIDAD REFINA DENTRO DE CADA NIVEL, NO ES UN NIVEL MÁS. Es una decisión
   deliberada: `GRANULARIDADES` es una cascada ORDENADA con la invariante de que
   solo baja en especificidad, y meter la modalidad como escalón obligaría a
   duplicar la lista y a decidir si «entidad+modalidad» es más o menos específico
   que «entidad+familia» — una pregunta que no tiene respuesta buena. Así, en
   cada nivel que la cascada visita se prueba primero la cubeta de la modalidad
   del proceso y, si no tiene base, la cifra mezclada de ese mismo nivel.
   `granularidad_utilizada` conserva EXACTAMENTE su significado anterior y
   `modalidad_utilizada` dice si hubo refinamiento: dos preguntas distintas, dos
   campos distintos.

   `modalidad` explícita gana sobre la del proceso; `modalidad: null` desactiva
   el refinamiento y devuelve la cifra mezclada, que es lo que necesita quien
   quiera comparar las dos.

   COMPATIBILIDAD: `indice:baja` NO SE PURGA NUNCA, así que en producción sigue
   vivo el hash escrito por la versión anterior, sin `por_modalidad`. Sin esa
   clave no hay cubeta que probar y la función se comporta EXACTAMENTE como
   antes — no hace falta reconstruir el índice para que la app siga sirviendo. */
function bajaDeMercado(indice, lic, { granularidad = "entidad_familia", modalidad } = {}) {
  if (!indice || !lic) return SIN_DATO;
  const mod = modalidad === undefined ? modalidadCanonica(lic) : (modalidad || null);

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
  const respuesta = (g, ok, usoMod, refMensaje) => ({
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
    // CANÓNICA en el campo (es con la que se agrupa y con la que se filtra por
    // `?modalidad=`), ORIGINAL en el mensaje (es la que lee una persona)
    modalidad_utilizada: usoMod,
    mensaje: mensajeDe(g, ok.mediana, ok.procesos, refMensaje, usoMod && ((ok.m && ok.m.etiqueta) || usoMod)),
  });

  for (const { g, clave } of orden) {
    if (!clave) continue;
    const m = (indice[g] || {})[clave];
    /* Refinamiento por modalidad DENTRO de este nivel, antes de la cifra
       mezclada. `utilizable` se reutiliza tal cual sobre la cubeta —tiene la
       misma forma que el registro— para que el umbral de «tiene base» sea uno
       solo y no dos que se puedan desincronizar. */
    if (mod && m && !m.ref && m.por_modalidad) {
      const okMod = utilizable(m.por_modalidad[mod]);
      if (okMod) return respuesta(g, okMod, mod, m);
    }
    const ok = utilizable(m);
    if (!ok) {
      const n = m ? Math.max(0, Math.trunc(numero(m.procesos ?? m.procesos_contados) || 0)) : 0;
      if (n > vistosSinBase) vistosSinBase = n;
      continue;
    }
    return respuesta(g, ok, null, ok.m);
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
  modalidadCanonica, modalidadesConocidas, REGIMEN_ESPECIAL, MIN_MODALIDAD: MIN_PROCESOS,
  nivelPorBaja, percentilHistograma, familiaDe, registroPublicado, adjudicatarioReal,
  MIN_PROCESOS, RATIO_MIN, BAJA_MIN, CORTE_ALTO, CORTE_MEDIO, GRANULARIDADES, NIVELES_CLASIFICADOS,
};
