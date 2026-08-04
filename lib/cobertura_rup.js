/* ============================================================================
   lib/cobertura_rup · ¿Qué códigos UNSPSC le FALTAN al RUP?
   ----------------------------------------------------------------------------
   El RUP se renueva una vez al año y los códigos que no estén inscritos ese día
   no se pueden usar en doce meses. La pregunta que resuelve este módulo es la
   que hay que responder ANTES de esa renovación:

     de los procesos que el mercado ya ADJUDICÓ con objetos como los que este
     señor ejecuta, ¿con qué códigos los publicó — y cuáles de esos códigos no
     están en su RUP?

   La materia prima es `licitaciones:historico:mes:*`, el keyspace que ninguna
   purga toca: procesos cerrados con adjudicación. Es exactamente la «base de
   datos de la competencia» del manual (Cap. 17), usada aquí para lo que mejor
   sirve: saber qué se está contratando y bajo qué clasificación.

   DOS MODOS, y la diferencia entre ellos es toda la idea:

     con experiencia (default, si el dueño cargó sus contratos ejecutados)
       cada proceso del histórico se puntúa por SIMILITUD contra el vocabulario
       de lo que ya ejecutó (lib/experiencia). Por debajo de 0,15 ni se mira: un
       código muy usado en un nicho donde nunca se ha trabajado no es un hueco
       del RUP, es otro negocio.
     sin experiencia (respaldo)
       se cae al vocabulario de obra del proyecto (lib/filtros.hayVerboDeObra +
       WHITELIST_OBRA). Responde «esto es obra», que es mucho menos que «esto es
       TU obra», y por eso el score viaja en `null`: no se inventa una cifra de
       similitud contra una experiencia que nadie ha cargado.

   TRES REGLAS QUE SE HEREDAN, no se reinventan:

   · qué segmentos pueden ser un hueco → 70–95 MENOS
     `SEGMENTOS_SERVICIOS_NO_CONSTRUCTIVOS` de lib/filtros (80 gerencia, 84
     finanzas, 85 salud, 86 educación, 90-94 personales/sociales). Es la MISMA
     lista con la que la capa anti-suministro decide que un código no ancla
     obra: si no ancla obra allí, tampoco puede ser un hueco de obra aquí.
   · qué es «claramente obra civil» (requisito de CRÍTICO) → `SEGMENTOS_OBRA_PURA`
     (72, 77, 81, 95), la misma lista con la que la pertinencia acepta un objeto
     mudo por la solidez de su clase.
   · si el objeto es pertinente → `evaluarPertinencia` de lib/filtros, tal cual.
     Un código que solo aparece en procesos de alimentos o de internet no es un
     hueco del RUP por muchas veces que se repita.

   Un aviso sobre la CRITICIDAD: el encargo la describe con umbrales que se
   solapan («MEDIO: 2-4 procesos o score ≥ 0.1» y «BAJO: 1 proceso o score <
   0.1» clasifican de dos formas distintas el mismo código de 3 procesos con
   poca similitud). Se resuelve como CASCADA —el primer nivel que se cumple
   manda— y con la lectura que el propio encargo fija en sus casos de prueba: un
   código con 3 procesos y similitud floja es BAJO. La regla queda escrita abajo
   en una sola función para que se pueda discutir mirándola.
   ========================================================================== */
"use strict";

const { CLAVES, leerChunksDedup, leerJSONComprimido, escribirJSONComprimido } = require("./almacen.js");
const { norm, BLACKLIST_OBJETO, WHITELIST_OBRA } = require("./semantica.js");
const {
  evaluarPertinencia, hayVerboDeObra,
  SEGMENTOS_OBRA_PURA, SEGMENTOS_SERVICIOS_NO_CONSTRUCTIVOS,
} = require("./filtros.js");
const { codigosDeLicitacion, indiceDe } = require("./unspsc.js");
const { esAdjudicado } = require("./indice_competencia.js");
const { similitud, nivelRelevancia, UMBRAL_ALTA, UMBRAL_MODERADA } = require("./experiencia.js");

const TTL_CACHE_SEG = 3600;        // 1 hora
const MAX_FALTANTES = 100;         // filas de la tabla (se informa si se recortó)
const MAX_EXCLUIDOS = 50;          // ídem para las dos listas de excluidos
const MAX_EJEMPLOS = 5;            // ejemplos de objeto por código (encargo)
const MAX_ENTIDADES = 3;           // entidades top por código (encargo)
const LARGO_EJEMPLO = 220;

/* Umbrales de criticidad (encargo). Separados de la función para que se puedan
   leer —y discutir— sin desenterrarlos del código. */
const UMBRALES = {
  critico_procesos: 10,
  alto_procesos: 5,
  alto_score: 0.20,
  medio_procesos: 2,
};

const SEGMENTO_MIN = "70", SEGMENTO_MAX = "95";

/* ¿Puede un código de este segmento ser un hueco del RUP de obra? */
function segmentoAdmisible(segmento) {
  if (!enRango(segmento)) return false;
  return !SEGMENTOS_SERVICIOS_NO_CONSTRUCTIVOS.has(segmento);
}

/* Las dos listas de EXCLUIDOS usan el rango a secas, sin quitar los segmentos
   de servicios no constructivos. Es deliberado: esas listas existen para
   enseñar lo que la auditoría dejó fuera y por qué, y un «85121700 · 24
   procesos · fuera de su nicho» es información útil. Filtrarlo también ahí
   sería esconder la mitad de la explicación. */
const enRango = (segmento) => segmento >= SEGMENTO_MIN && segmento <= SEGMENTO_MAX;

/* ---------- criticidad ----------
   CASCADA: el primer nivel que se cumple manda.

     CRÍTICO  ≥10 procesos adjudicados, al menos uno ALTAMENTE similar a lo que
              el dueño ya ejecuta, y en un segmento de obra pura. Los tres a la
              vez: 10 procesos de un código que ni es obra ni se parece a nada
              suyo no obligan a inscribir nada.
     ALTO     ≥5 procesos, o ≥2 con una similitud media alta (≥0,20 — bastante
              por encima del 0,15 con el que se entra al análisis).
     MEDIO    ≥2 procesos y al menos uno altamente similar.
     BAJO     el resto: un solo proceso, o unos pocos que solo rozan el umbral.

   UN SOLO PROCESO NUNCA PASA DE BAJO, por perfecta que sea la similitud: un
   contrato no es una tendencia del mercado, y lo que está en juego es un código
   que hay que sostener un año entero en el RUP.

   Sin experiencia cargada no hay score, así que los dos peldaños que dependen
   de él caen a los conteos: ≥10 y obra pura → CRÍTICO, ≥5 → ALTO, ≥2 → MEDIO.
   Es menos fino a propósito; el `null` del score lo declara. */
function clasificar({ procesos, altamente, scorePromedio, obraClara, conExperiencia }) {
  if (conExperiencia) {
    if (procesos >= UMBRALES.critico_procesos && altamente >= 1 && obraClara) return "CRÍTICO";
    if (procesos >= UMBRALES.alto_procesos
      || (procesos >= UMBRALES.medio_procesos && scorePromedio >= UMBRALES.alto_score)) return "ALTO";
    if (procesos >= UMBRALES.medio_procesos && altamente >= 1) return "MEDIO";
    return "BAJO";
  }
  if (procesos >= UMBRALES.critico_procesos && obraClara) return "CRÍTICO";
  if (procesos >= UMBRALES.alto_procesos) return "ALTO";
  if (procesos >= UMBRALES.medio_procesos) return "MEDIO";
  return "BAJO";
}

/* Puntaje combinado del encargo: el volumen manda (0.6) pero la similitud con
   lo que el dueño ya hace pesa lo suficiente (0.4 sobre 100) para adelantar a
   un código muy publicado en el que nunca ha trabajado. */
const puntajeCombinado = (procesos, scorePromedio) =>
  Math.round((procesos * 0.6 + (scorePromedio || 0) * 100 * 0.4) * 100) / 100;

const redondear = (n, d = 3) => Math.round(n * 10 ** d) / 10 ** d;
const recortar = (s, n = LARGO_EJEMPLO) => String(s || "").trim().slice(0, n);

function cuantiaDe(lic) {
  const n = parseFloat(lic.cuantia_cop ?? lic.precio_base ?? 0);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function textoDe(lic) {
  return `${lic.nombre_del_procedimiento || ""} ${lic.descripci_n_del_procedimiento || ""}`;
}

/* ---------- recomendación en prosa ----------
   La tabla la lee el dueño, no un programa: la frase tiene que decir qué hacer
   y con qué evidencia, sin obligarle a interpretar cuatro columnas. */
function recomendacion(g, conExperiencia) {
  const n = g.procesos_adjudicados;
  const proc = `${n} proceso${n === 1 ? "" : "s"} adjudicado${n === 1 ? "" : "s"}`;
  const similares = conExperiencia
    ? `, ${g.procesos_altamente_relevantes} altamente similar${g.procesos_altamente_relevantes === 1 ? "" : "es"} a su experiencia real`
    : " (sin experiencia cargada: la similitud no se midió)";
  switch (g.criticidad) {
    case "CRÍTICO":
      return `INSCRIBIR en el RUP en la próxima renovación. ${proc}${similares}.`;
    case "ALTO":
      return `Evaluar la inscripción: ${proc}${similares}.`;
    case "MEDIO":
      return `Vigilar. ${proc}${similares}: volumen bajo, pero dentro de su nicho.`;
    default:
      return `Sin urgencia. ${proc}${similares}.`;
  }
}

/* ════════════════════════ auditarCobertura ════════════════════════ */
/* `perfil` es el perfil VIGENTE (lo recarga el handler antes de llamar: la
   whitelist tiene que ser la del RUP cargado, no la del repositorio).
   `terminos` es lo que devuelve lib/experiencia.leerTerminos, o null. */
async function auditarCobertura(redis, perfil, { terminos = null, log = () => {} } = {}) {
  const t0 = Date.now();
  const conExperiencia = !!(terminos && terminos.set && terminos.set.size);
  const idx = indiceDe(perfil.unspsc);

  const claves = await redis.scan(CLAVES.patronChunksHist);
  let chunksCorruptos = 0;
  const filas = await leerChunksDedup(redis, claves, { onCorrupto: () => { chunksCorruptos++; } });

  /* contadores del embudo: nadie desaparece sin quedar contado (misma regla que
     /api/diagnostico — un proceso que se pierde en silencio es un número que
     nadie puede auditar) */
  const embudo = {
    procesos_historico: filas.length,
    sin_adjudicacion: 0,
    baja_relevancia: 0,
    no_pertinentes: 0,
    sin_codigo_utilizable: 0,
    // pasó todo el filtro y NO aportó ningún hueco: o sus clases ya están
    // inscritas, o viven en un segmento que no puede ser un hueco de obra
    sin_codigo_faltante: 0,
    con_codigo_faltante: 0,
  };

  const grupos = new Map();          // clase (6 dígitos) → acumulador
  const noPertinentes = new Map();   // clase → {procesos, motivo, ejemplo}
  const bajaRelevancia = new Map();  // clase → {procesos, suma_score, ejemplo}

  for (const lic of filas) {
    /* a. solo procesos ADJUDICADOS: un desierto no dice con qué código se
       contrata de verdad, dice que nadie llegó */
    if (!esAdjudicado(lic)) { embudo.sin_adjudicacion++; continue; }

    const texto = textoDe(lic);
    const t = norm(texto);

    /* b. relevancia frente a la experiencia REAL (o, sin ella, al vocabulario
       de obra del proyecto) */
    let score = null, nivel = null, sim = null;
    if (conExperiencia) {
      sim = similitud(texto, terminos.set);
      score = sim.score;
      nivel = nivelRelevancia(score);
      if (nivel === "baja") {
        embudo.baja_relevancia++;
        for (const c of codigosDeLicitacion(lic).codigos) {
          if (c.nivel < 6 || idx.clases.has(c.clase) || !enRango(c.segmento)) continue;
          const g = bajaRelevancia.get(c.clase) || { procesos: 0, suma: 0, ejemplo: null };
          g.procesos++; g.suma += score;
          if (!g.ejemplo) g.ejemplo = recortar(lic.nombre_del_procedimiento);
          bajaRelevancia.set(c.clase, g);
        }
        continue;
      }
    } else if (!hayVerboDeObra(t) && !WHITELIST_OBRA.test(texto)) {
      embudo.baja_relevancia++;
      continue;
    }

    const { codigos } = codigosDeLicitacion(lic);
    /* c. pertinencia del objeto: la MISMA función que decide qué se sirve en la
       app. Un código que solo vive en objetos de alimentos, eventos o internet
       no es un hueco del RUP de obra por mucho que se repita. */
    const pert = evaluarPertinencia(t, { tier: "clase", codigos });
    if (!pert.ok || BLACKLIST_OBJETO.test(texto)) {
      embudo.no_pertinentes++;
      for (const c of codigos) {
        if (c.nivel < 6 || idx.clases.has(c.clase) || !enRango(c.segmento)) continue;
        const g = noPertinentes.get(c.clase) || { procesos: 0, motivo: pert.motivo || "objeto en la blacklist semántica", ejemplo: null };
        g.procesos++;
        if (!g.ejemplo) g.ejemplo = recortar(lic.nombre_del_procedimiento);
        noPertinentes.set(c.clase, g);
      }
      continue;
    }

    /* d. códigos: solo los que el proceso declara a nivel de CLASE o PRODUCTO.
       Una familia suelta (7214 0000) no dice qué clase habría que inscribir, y
       recomendar «inscriba la familia» no es accionable en el RUP. */
    const clases = new Set();
    for (const c of codigos) if (c.nivel >= 6) clases.add(c.clase);
    if (!clases.size) { embudo.sin_codigo_utilizable++; continue; }

    let aporta = false;
    for (const clase of clases) {
      if (idx.clases.has(clase)) continue;                    // ya inscrito: no es hueco
      const segmento = clase.slice(0, 2);
      if (!segmentoAdmisible(segmento)) continue;             // no es un hueco de obra
      aporta = true;
      const g = grupos.get(clase) || {
        clase, segmento, familia: clase.slice(0, 4),
        procesos: 0, altamente: 0, moderadamente: 0, suma_score: 0,
        entidades: new Map(), cuantias: [], ejemplos: [],
      };
      g.procesos++;
      if (conExperiencia) {
        if (nivel === "alta") g.altamente++;
        else g.moderadamente++;
        g.suma_score += score;
      }
      const entidad = String(lic.entidad || "").trim() || "Entidad no informada";
      g.entidades.set(entidad, (g.entidades.get(entidad) || 0) + 1);
      const cuantia = cuantiaDe(lic);
      if (cuantia > 0) g.cuantias.push(cuantia);
      g.ejemplos.push({
        objeto: recortar(lic.nombre_del_procedimiento) || "(sin objeto)",
        similitud: score == null ? null : redondear(score),
        entidad,
        cuantia_cop: cuantia,
        terminos_en_comun: sim ? sim.coincidencias.slice(0, 8) : [],
      });
      grupos.set(clase, g);
    }
    if (aporta) embudo.con_codigo_faltante++;
    else embudo.sin_codigo_faltante++;
  }

  /* ---------- cierre de cada grupo ---------- */
  const faltantes = [];
  for (const g of grupos.values()) {
    const scorePromedio = conExperiencia && g.procesos ? g.suma_score / g.procesos : null;
    const obraClara = SEGMENTOS_OBRA_PURA.has(g.segmento);
    const criticidad = clasificar({
      procesos: g.procesos, altamente: g.altamente,
      scorePromedio: scorePromedio || 0, obraClara, conExperiencia,
    });
    const cuantias = g.cuantias.slice().sort((a, b) => a - b);
    const fila = {
      codigo: `${g.clase}00`,
      clase: g.clase,
      criticidad,
      procesos_adjudicados: g.procesos,
      procesos_altamente_relevantes: g.altamente,
      procesos_moderadamente_relevantes: g.moderadamente,
      score_similitud_promedio: scorePromedio == null ? null : redondear(scorePromedio),
      segmento: g.segmento,
      familia: g.familia,
      obra_civil_clara: obraClara,
      cuantia: cuantias.length
        ? {
          min: cuantias[0], max: cuantias[cuantias.length - 1],
          promedio: Math.round(cuantias.reduce((a, b) => a + b, 0) / cuantias.length),
        }
        : { min: null, max: null, promedio: null },
      entidades_top: [...g.entidades.entries()]
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
        .slice(0, MAX_ENTIDADES)
        .map(([entidad, procesos]) => ({ entidad, procesos })),
      // los más parecidos primero: son los que justifican la recomendación
      ejemplos_objetos: g.ejemplos
        .sort((a, b) => (b.similitud || 0) - (a.similitud || 0) || b.cuantia_cop - a.cuantia_cop)
        .slice(0, MAX_EJEMPLOS),
      puntaje: puntajeCombinado(g.procesos, scorePromedio),
    };
    fila.recomendacion = recomendacion(fila, conExperiencia);
    faltantes.push(fila);
  }
  faltantes.sort((a, b) => b.puntaje - a.puntaje || a.codigo.localeCompare(b.codigo));

  const porCriticidad = { CRÍTICO: 0, ALTO: 0, MEDIO: 0, BAJO: 0 };
  for (const f of faltantes) porCriticidad[f.criticidad]++;

  const listaExcluidos = (mapa, hacer) => [...mapa.entries()]
    .sort((a, b) => b[1].procesos - a[1].procesos || a[0].localeCompare(b[0]))
    .slice(0, MAX_EXCLUIDOS)
    .map(([clase, v]) => hacer(clase, v));

  log(`cobertura: ${filas.length} procesos históricos → ${faltantes.length} códigos faltantes (${Date.now() - t0} ms)`);

  return {
    experiencia_utilizada: conExperiencia,
    contratos_experiencia: conExperiencia ? terminos.contratos : 0,
    terminos_experiencia: conExperiencia ? terminos.total_terminos : 0,
    resumen: {
      codigos_en_rup: perfil.unspsc.size,
      clases_en_rup: idx.clases.size,
      procesos_analizados: filas.length,
      procesos_adjudicados: filas.length - embudo.sin_adjudicacion,
      // «relevante» = pasó el filtro de similitud (o, sin experiencia, el
      // vocabulario de obra). La pertinencia y los códigos vienen DESPUÉS.
      procesos_relevantes: filas.length - embudo.sin_adjudicacion - embudo.baja_relevancia,
      codigos_faltantes_detectados: faltantes.length,
      criticos: porCriticidad["CRÍTICO"],
      altos: porCriticidad.ALTO,
      medios: porCriticidad.MEDIO,
      bajos: porCriticidad.BAJO,
    },
    embudo,
    faltantes: faltantes.slice(0, MAX_FALTANTES),
    truncado: faltantes.length > MAX_FALTANTES
      ? { limite: MAX_FALTANTES, faltantes: faltantes.length }
      : null,
    excluidos_por_no_pertinentes: listaExcluidos(noPertinentes, (clase, v) => ({
      codigo: `${clase}00`, procesos: v.procesos,
      motivo: v.motivo, ejemplo: v.ejemplo,
    })),
    excluidos_por_baja_relevancia: listaExcluidos(bajaRelevancia, (clase, v) => ({
      codigo: `${clase}00`, procesos: v.procesos,
      motivo: `Score de similitud ${redondear(v.suma / v.procesos, 2)} — fuera del nicho de experiencia`,
    })),
    umbrales: {
      similitud_alta: UMBRAL_ALTA, similitud_moderada: UMBRAL_MODERADA, ...UMBRALES,
    },
    chunks_ilegibles: chunksCorruptos,
    duracion_ms: Date.now() - t0,
  };
}

/* ════════════════════════ caché ════════════════════════ */
/* El sello encadena las DOS entradas de las que depende el resultado: el RUP
   vigente (define la whitelist) y la experiencia cargada (define la similitud).
   Cargar cualquiera de los dos invalida la caché sin que nadie tenga que
   acordarse de borrarla — que es justo lo que se olvida. */
const selloCobertura = (versionPerfiles, versionExperiencia) =>
  `${versionPerfiles || "respaldo"}|${versionExperiencia || "sin-experiencia"}`;

async function leerCache(redis, clave, sello) {
  let v = null;
  try { v = await leerJSONComprimido(redis, clave); } catch { return null; }
  if (!v || v.sello !== sello) return null;
  return v.cuerpo;
}

const guardarCache = (redis, clave, sello, cuerpo) =>
  escribirJSONComprimido(redis, clave, { sello, cuerpo }, { ttl: TTL_CACHE_SEG });

module.exports = {
  TTL_CACHE_SEG, MAX_FALTANTES, MAX_EXCLUIDOS, MAX_EJEMPLOS, UMBRALES,
  segmentoAdmisible, clasificar, puntajeCombinado, recomendacion,
  auditarCobertura, selloCobertura, leerCache, guardarCache,
};
