/* ============================================================================
   lib/texto_unspsc · El OBJETO como co-señal cuando el código no alcanza
   ----------------------------------------------------------------------------
   Muchos procesos de obra llegan sin código UNSPSC útil: sin código, con el
   segmento suelto (72000000) o con una familia ajena mal digitada. Tirarlos
   por eso es un falso negativo puro — el pliego dice «CONSTRUCCIÓN DE PLACA
   HUELLA» en el título.

   Esta capa NO decide sola: es la ÚLTIMA del matching (después de la
   jerarquía y de las equivalencias) y produce el tier más débil, "texto",
   que la UI etiqueta como «verificar en el pliego».

   Dos formas de confirmar, de la más específica a la más genérica:

     1. VOCABULARIO POR FAMILIA. Si el objeto comparte ≥3 términos distintivos
        con una familia UNSPSC y esa familia tiene clases en el RUP del perfil
        → «Sin código UNSPSC específico — el objeto sugiere la familia FFFF».
     2. VERBO DE OBRA. Si no hay solapamiento pero el objeto es
        inequívocamente de obra → «Objeto de obra sin código UNSPSC —
        verificar en el pliego».

   DE DÓNDE SALE EL VOCABULARIO (dato honesto, no supuesto):
   `data/vocabulario_unspsc.json` viaja en el repositorio como SEMILLA CURADA
   a mano a partir del vocabulario real de la contratación de obra en Colombia
   — NO es el resultado de un cálculo sobre el histórico, porque este entorno
   de desarrollo no alcanza datos.gov.co. Cuando el dueño ya tiene su corpus
   histórico en Redis, `derivarVocabulario()` lo calcula DE VERDAD (TF-IDF
   simplificado sobre los objetos de los procesos adjudicados) y
   /api/sync/historico?reconstruir_vocabulario=true lo publica en Redis. A
   partir de ahí manda el derivado y la semilla solo es el respaldo.

   Sin dependencias: los conteos y el log son JavaScript plano.
   ========================================================================== */
"use strict";

const { norm } = require("./semantica.js");
const { codigosDeLicitacion, FAMILIAS_UNION } = require("./unspsc.js");
const {
  CLAVES, leerChunksDedup, escribirJSON, leerJSONComprimido, escribirJSONComprimido,
} = require("./almacen.js");

/* Semilla del repositorio. `require` de JSON es estático → Vercel lo traza y
   lo empaqueta con la función; si algún día faltara, se degrada a vacío en
   vez de tumbar la consulta. */
let SEMILLA = {};
try {
  const bruto = require("../data/vocabulario_unspsc.json");
  SEMILLA = (bruto && bruto.familias) || bruto || {};
} catch { SEMILLA = {}; }

const MIN_TERMINOS_COINCIDENTES = 3; // «solapamiento significativo» del encargo
const MIN_LARGO_TERMINO = 4;
const TERMINOS_POR_FAMILIA = 30;     // tope al derivar (el JSON no debe crecer sin freno)
const MIN_DOCS_FAMILIA = 20;         // familias con menos procesos no dan señal fiable
const MIN_DOCS_TERMINO = 3;          // un término que sale 2 veces es ruido

/* Palabras que aparecen en TODOS los objetos: no distinguen nada. Se excluyen
   al derivar (y da igual que aparezcan en la semilla: nunca suman 3). */
const VACIAS = new Set(("de del la las los el un una unos unas y o u en con para por que se su sus al lo "
  + "contrato contratar contratacion prestacion prestar servicio servicios objeto proceso procedimiento "
  + "municipio municipal departamento departamental entidad publica publico publicos publicas nacional "
  + "acuerdo convenio numero valor total anexo segun conforme mediante dentro sobre entre desde hasta "
  + "realizar realizacion ejecutar ejecucion desarrollo desarrollar suministro suministrar adquisicion "
  + "correspondiente correspondientes demas otros otras cual cuales aquellos vigencia ano anos vereda "
  + "sector zona area areas parte partes forma general generales todo toda todos todas mismo misma")
  .split(/\s+/));

/* ══════════════════ Lectura del vocabulario vigente ══════════════════ */
/* Normaliza cualquiera de las dos formas ({familias:{…}} o {…}) a
   Map<familia, Set<termino>>. Memoizado por identidad del objeto de origen:
   /api/oportunidades lo lee una vez por instancia caliente. */
const _cache = new WeakMap();
let _cacheSemilla = null;

function indexar(vocab) {
  const m = new Map();
  for (const [familia, terminos] of Object.entries(vocab || {})) {
    if (!/^\d{4}$/.test(familia) || !Array.isArray(terminos)) continue;
    const set = new Set(terminos.map((t) => norm(t)).filter((t) => t.length >= MIN_LARGO_TERMINO));
    if (set.size) m.set(familia, set);
  }
  return m;
}

/* vocabDeRedis: lo publicado por reconstruir_vocabulario (o null).
   El derivado y la semilla se MEZCLAN, no se sustituyen: el histórico solo
   produce vocabulario para las familias que superan el mínimo de procesos, y
   una derivación flaca no puede dejar sin señal a las demás. Familia a
   familia manda el derivado (es dato real del mercado); donde no hay
   derivado, sigue la semilla curada. */
function vocabularioActivo(vocabDeRedis) {
  const bruto = (vocabDeRedis && (vocabDeRedis.familias || vocabDeRedis)) || null;
  if (!bruto || !Object.keys(bruto).length) {
    if (!_cacheSemilla) _cacheSemilla = { indice: indexar(SEMILLA), fuente: "semilla", derivadas: 0 };
    return _cacheSemilla;
  }
  let c = _cache.get(bruto);
  if (!c) {
    const indice = indexar(SEMILLA);
    const derivado = indexar(bruto);
    for (const [familia, terminos] of derivado) indice.set(familia, terminos);
    c = { indice, fuente: "historico+semilla", derivadas: derivado.size };
    _cache.set(bruto, c);
  }
  return c;
}

/* ══════════════════ Sugerencia de familia ══════════════════ */
/* Devuelve la familia con MÁS términos distintivos en común (≥3) que además
   esté en el RUP del perfil. `familiasPerfil` es el Set de 4 dígitos del
   índice del perfil (lib/unspsc.indiceDe). */
function sugerirFamilia(textoNorm, vocabulario, familiasPerfil) {
  const voc = vocabulario && vocabulario.indice ? vocabulario.indice : indexar(vocabulario);
  if (!voc || !voc.size) return null;
  const palabras = new Set(String(textoNorm || "").split(/[^a-z0-9ñ]+/).filter((p) => p.length >= MIN_LARGO_TERMINO));
  if (!palabras.size) return null;
  let mejor = null;
  for (const [familia, terminos] of voc) {
    if (familiasPerfil && !familiasPerfil.has(familia)) continue;
    const comunes = [];
    for (const p of palabras) if (terminos.has(p)) comunes.push(p);
    if (comunes.length >= MIN_TERMINOS_COINCIDENTES && (!mejor || comunes.length > mejor.terminos.length)) {
      mejor = { familia, terminos: comunes.sort() };
    }
  }
  return mejor;
}

/* ══════════════════ Veredicto de la capa ══════════════════ */
/* Se llama SOLO cuando la jerarquía y las equivalencias ya dijeron "ninguno".
   `hayVerboObra` lo calcula lib/filtros (la regla vive allí; aquí solo el
   vocabulario), y `segmentoAfin` viene del matching: un proceso que declara
   72000000 y habla de obra es exactamente el caso que esta capa rescata. */
function evaluarTexto(textoNorm, { vocabulario, familiasPerfil, hayVerboObra, segmentoAfin } = {}) {
  const sug = sugerirFamilia(textoNorm, vocabulario, familiasPerfil);
  if (sug) {
    return {
      tier: "texto", codigo_proceso: null, codigo_rup: `${sug.familia}0000`,
      familia_sugerida: sug.familia, terminos: sug.terminos,
      mensaje: `Sin código UNSPSC específico — el objeto sugiere la familia ${sug.familia}0000 (${sug.terminos.slice(0, 4).join(", ")})`,
    };
  }
  if (hayVerboObra) {
    return {
      tier: "texto", codigo_proceso: null, codigo_rup: null, familia_sugerida: null, terminos: [],
      mensaje: segmentoAfin
        ? "El proceso solo declara el segmento UNSPSC, pero el objeto es de obra — verificar en el pliego"
        : "Objeto de obra sin código UNSPSC — verificar en el pliego",
    };
  }
  return null;
}

/* ══════════════════ Derivación (TF-IDF simplificado) ══════════════════ */
/* Núcleo compartido por las dos vías de derivación (offline sobre una lista de
   registros, o reanudable sobre Redis): de los conteos crudos a los términos
   distintivos de cada familia.
     score(t,f) = tf_normalizada(t,f) × log(F / familias_que_usan_t)
   Un término que sale en TODAS las familias no distingue nada y se descarta;
   uno que sale mucho en una y poco en el resto sube. Sin librerías: dos
   objetos y un sort. */
function tfidf(docs, cuenta, porFamilia = TERMINOS_POR_FAMILIA) {
  const familiasUtiles = Object.keys(docs).filter((f) => docs[f] >= MIN_DOCS_FAMILIA);
  const F = familiasUtiles.length;
  if (!F) return { familias: {}, familias_evaluadas: 0 };
  const enFamilias = new Map();
  for (const f of familiasUtiles) {
    for (const [t, n] of Object.entries(cuenta[f] || {})) {
      if (n >= MIN_DOCS_TERMINO) enFamilias.set(t, (enFamilias.get(t) || 0) + 1);
    }
  }
  const familias = {};
  for (const f of familiasUtiles) {
    const puntuados = [];
    for (const [t, n] of Object.entries(cuenta[f] || {})) {
      if (n < MIN_DOCS_TERMINO) continue;
      const k = enFamilias.get(t) || 1;
      if (k >= F) continue; // sale en todas: no distingue nada
      puntuados.push([t, (n / docs[f]) * Math.log(F / k)]);
    }
    puntuados.sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
    const terminos = puntuados.slice(0, porFamilia).map(([t]) => t);
    if (terminos.length >= MIN_TERMINOS_COINCIDENTES) familias[f] = terminos;
  }
  return { familias, familias_evaluadas: F };
}

/* Términos distintivos de un objeto, ya normalizados y sin palabras vacías. */
function terminosDe(texto) {
  return new Set(norm(texto).split(/[^a-z0-9ñ]+/)
    .filter((w) => w.length >= MIN_LARGO_TERMINO && !VACIAS.has(w) && !/^\d+$/.test(w)));
}

/* Vía OFFLINE: una lista de registros en memoria (la usan las pruebas y quien
   quiera regenerar `data/vocabulario_unspsc.json` con datos reales).
   `familiasDe` y `textoDe` los inyecta quien llama, para que este módulo no
   dependa del matching. */
function derivarVocabulario(registros, { familiasDe, textoDe, porFamilia = TERMINOS_POR_FAMILIA } = {}) {
  const docs = {}, cuenta = {};
  let procesos = 0;
  for (const r of registros || []) {
    const familias = familiasDe(r);
    if (!familias || !familias.length) continue;
    const palabras = terminosDe(textoDe(r));
    if (!palabras.size) continue;
    procesos++;
    for (const f of familias) {
      docs[f] = (docs[f] || 0) + 1;
      const m = cuenta[f] || (cuenta[f] = {});
      for (const w of palabras) m[w] = (m[w] || 0) + 1;
    }
  }
  const { familias, familias_evaluadas } = tfidf(docs, cuenta, porFamilia);
  return {
    familias,
    meta: {
      familias: Object.keys(familias).length, familias_evaluadas, procesos,
      min_docs_familia: MIN_DOCS_FAMILIA, terminos_por_familia: porFamilia,
    },
  };
}

/* ══════════════════ Construcción desde Redis (reanudable) ══════════════════ */
/* Recorre el corpus histórico mes a mes, como el índice de competencia, y
   publica `vocabulario:unspsc`. Dos acotaciones DELIBERADAS y documentadas
   (nada de topes silenciosos: las dos quedan en la meta):

     · solo se acumulan las familias que algún RUP inscribe. El resto no se
       usaría nunca —sugerirFamilia exige que la familia esté en el RUP del
       perfil— así que acumularlas sería pagar Redis por nada. NO es una
       muestra: dentro de esas familias se leen TODOS los procesos.
     · entre invocación e invocación el acumulador se poda a los
       TOP_ACUMULADOR términos más frecuentes por familia, para que quepa en
       un valor de Upstash (1 MB). Con 200 términos guardados y 30 publicados,
       la poda no cambia el resultado en la práctica. */
const TOP_ACUMULADOR = 200;

function podar(cuenta) {
  for (const [f, mapa] of Object.entries(cuenta)) {
    const pares = Object.entries(mapa);
    if (pares.length <= TOP_ACUMULADOR) continue;
    pares.sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
    cuenta[f] = Object.fromEntries(pares.slice(0, TOP_ACUMULADOR));
  }
}

async function construirVocabulario(redis, { presupuestoMs = 40000, reiniciar = false, log = () => {} } = {}) {
  const t0 = Date.now();

  const claves = await redis.scan(CLAVES.patronChunksHist);
  const porMes = new Map();
  for (const k of claves) {
    const mes = CLAVES.mesDeClaveHist(k);
    if (!mes) continue;
    if (!porMes.has(mes)) porMes.set(mes, []);
    porMes.get(mes).push(k);
  }

  let p = reiniciar ? null : await leerJSONComprimido(redis, CLAVES.vocabularioProgreso);
  if (!p || !Array.isArray(p.pendientes)) {
    p = { iniciado: new Date().toISOString(), pendientes: [...porMes.keys()].sort(), docs: {}, cuenta: {}, procesos: 0 };
  }
  if (!porMes.size && !p.procesos) {
    await redis.del(CLAVES.vocabulario, CLAVES.vocabularioProgreso, CLAVES.vocabularioMeta);
    return { done: true, vacio: true, familias: 0, msg: "no hay corpus histórico todavía: se usa la semilla del repositorio" };
  }

  while (p.pendientes.length) {
    if (Date.now() - t0 > presupuestoMs) {
      podar(p.cuenta);
      await escribirJSONComprimido(redis, CLAVES.vocabularioProgreso, p);
      return { done: false, pendientes: p.pendientes.length, procesos: p.procesos };
    }
    const mes = p.pendientes[0];
    for (const r of await leerChunksDedup(redis, porMes.get(mes) || [])) {
      const familias = [...new Set(codigosDeLicitacion(r).codigos
        .filter((c) => c.nivel >= 4 && FAMILIAS_UNION.has(c.familia)).map((c) => c.familia))];
      if (!familias.length) continue;
      const palabras = terminosDe(`${r.nombre_del_procedimiento || ""} ${r.descripci_n_del_procedimiento || ""}`);
      if (!palabras.size) continue;
      p.procesos++;
      for (const f of familias) {
        p.docs[f] = (p.docs[f] || 0) + 1;
        const m = p.cuenta[f] || (p.cuenta[f] = {});
        for (const w of palabras) m[w] = (m[w] || 0) + 1;
      }
    }
    p.pendientes.shift();
    podar(p.cuenta);
    await escribirJSONComprimido(redis, CLAVES.vocabularioProgreso, p);
    log(`vocabulario: ${mes} → ${p.procesos} procesos, ${Object.keys(p.docs).length} familias`);
  }

  const { familias, familias_evaluadas: F } = tfidf(p.docs, p.cuenta);

  const meta = {
    construido: new Date().toISOString(),
    familias: Object.keys(familias).length,
    familias_evaluadas: F,
    procesos: p.procesos,
    min_docs_familia: MIN_DOCS_FAMILIA,
    terminos_por_familia: TERMINOS_POR_FAMILIA,
    solo_familias_del_rup: true,
    poda_acumulador: TOP_ACUMULADOR,
  };
  if (Object.keys(familias).length) {
    await escribirJSONComprimido(redis, CLAVES.vocabulario, { familias });
    await escribirJSON(redis, CLAVES.vocabularioMeta, meta);
  } else {
    // sin señal suficiente: mejor la semilla del repositorio que un vocabulario
    // a medias (y queda dicho en el resultado, no en silencio)
    await redis.del(CLAVES.vocabulario, CLAVES.vocabularioMeta);
    meta.msg = `ninguna familia del RUP alcanza ${MIN_DOCS_FAMILIA} procesos históricos: sigue mandando la semilla del repositorio`;
  }
  await redis.del(CLAVES.vocabularioProgreso);
  log(`vocabulario publicado: ${meta.familias} familias sobre ${p.procesos} procesos`);
  return { done: true, ...meta };
}

module.exports = {
  SEMILLA, VACIAS,
  MIN_TERMINOS_COINCIDENTES, MIN_DOCS_FAMILIA, TERMINOS_POR_FAMILIA, TOP_ACUMULADOR,
  vocabularioActivo, sugerirFamilia, evaluarTexto, indexar,
  tfidf, terminosDe, derivarVocabulario, construirVocabulario,
};
