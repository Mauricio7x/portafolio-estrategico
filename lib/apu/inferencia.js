/* ============================================================================
   lib/apu/inferencia · Del objeto del proceso a los ítems de obra
   ----------------------------------------------------------------------------
   Clasificador en CASCADA (§1.D.2 del informe), con el mismo criterio que ya
   rige toda la app: reglas auditables primero, nunca bloquear por falta de
   información, y poder decir «no sé».

     Nivel A · LÉXICO DETERMINISTA CON PUNTAJE, sobre `norm(objeto)`.
               P(t) = 3·|anclas ∩ obj| + 1·|apoyo ∩ obj| − 4·|excluye ∩ obj|
               Además se exige al menos un VERBO DE OBRA — reutilizando
               `VERBOS_DE_OBRA_FUERTES` de lib/semantica, no una lista nueva.

     Nivel B · UNSPSC COMO EVIDENCIA INDEPENDIENTE. No se mezcla con A: se
               calcula aparte y su valor real es VETAR. 7214 y 7215 son
               compatibles con casi todo, así que B rara vez decide solo; pero
               un objeto clasificado VIA-PH cuyo único código sea 4017/4018 es
               casi seguro una red, no una vía.

     Nivel C · LLM DE DESEMPATE — NO IMPLEMENTADO, y a propósito. El proyecto
               no tiene dependencias ni llamadas a APIs externas, y meter una
               en la ruta de una petición añadiría latencia y una fuente de
               fallo a un cálculo que hoy es determinista y auditable. La
               máquina de estados está escrita para funcionar SIN él: donde el
               informe manda invocar a C, aquí se cae a 🟡 o a ⚪, que es la
               degradación honesta. Si algún día se añade, su contrato ya está
               fijado en el informe: salida estructurada con `evidencia_textual`
               que debe ser subcadena LITERAL del objeto.

   ESTADOS DE SALIDA, exhaustivos a propósito — igual que en /api/diagnostico,
   el conteo por estado tiene que sumar EXACTAMENTE los objetos evaluados, y
   para eso ningún caso puede quedarse sin fila:

     🟢 verde           P1 ≥ 8  y  P1−P2 ≥ 4  y  B compatible
     🟡 amarillo        P1 ≥ 6 sin margen claro, o B ausente, o B incompatible
     ⚪ no_determinada  P1 < 6, sin verbo de obra, o cualquier caso restante

   El margen `P1−P2` es una condición DURA y no un promedio ponderado: dos
   tipologías empatadas nunca dan verde aunque su puntaje absoluto sea alto. El
   falso positivo caro es un 🟢 equivocado, porque es el único estado que
   genera un presupuesto completo sin pedir que se lea el pliego.

   ESTE MÓDULO ES HOJA salvo por `semantica` y `unspsc`, que también lo son.
   No importa perfiles ni filtros: inferir qué obra es NO es decidir si el
   proceso es del dueño.
   ========================================================================== */
"use strict";

const { norm, VERBOS_DE_OBRA_FUERTES, VERBOS_DE_OBRA_CONDICIONADOS } = require("../semantica.js");
const { extraerCodigos } = require("../unspsc.js");
const { TIPOLOGIAS, tipologiaPorCodigo, itemsDeTipologia, tipologiasDeFamilia } = require("./tipologias.js");

const PESO_ANCLA = 3;
const PESO_APOYO = 1;
const PESO_EXCLUYE = -4;

const UMBRAL_VERDE = 8;
const MARGEN_VERDE = 4;
const UMBRAL_AMARILLO = 6;

/* ───────────────────────────── Nivel A · léxico ───────────────────────────── */

function tieneVerboDeObra(objetoNorm) {
  if (VERBOS_DE_OBRA_FUERTES.test(objetoNorm)) return true;
  // los condicionados exigen su ancla de infraestructura cerca; la expresión
  // de semantica ya la lleva dentro, así que basta con probarla
  return VERBOS_DE_OBRA_CONDICIONADOS.test(objetoNorm);
}

/* Los términos del catálogo son frases sobre texto normalizado. Se comparan con
   FRONTERA DE PALABRA y plural tolerado, palabra a palabra:

     "parque"      → /\bparques?\b/        y NO casa dentro de «parqueadero»
     "placa huella"→ /\bplacas?\W+huellas?\b/  casa «placa huella» y «placas huellas»
     "via terciaria"→ casa también «vias terciarias»

   Sin la tolerancia al plural, media tabla del catálogo no dispararía nunca
   (los objetos de SECOP dicen «vías terciarias», no «vía terciaria»); sin la
   frontera de palabra, «parque» clasificaría un mantenimiento de parqueadero
   como espacio público. Las dos cosas hacen falta, y por eso no se usa
   `includes` a secas.

   El caché es por término: el catálogo es cerrado, así que son ~250 expresiones
   compiladas una vez por instancia caliente. */
const RE_CACHE = new Map();
function regexTermino(termino) {
  const t = norm(termino);
  if (!t) return null;
  if (RE_CACHE.has(t)) return RE_CACHE.get(t);
  const cuerpo = t.split(/\s+/)
    .map((p) => `${p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?:e?s)?`)
    .join("\\W+");
  const re = new RegExp(`(?:^|\\W)${cuerpo}(?:$|\\W)`);
  RE_CACHE.set(t, re);
  return re;
}

function contiene(objetoNorm, termino) {
  const re = regexTermino(termino);
  return re ? re.test(objetoNorm) : false;
}

function puntuarTipologia(objetoNorm, tip) {
  const anclas = (tip.anclas || []).filter((t) => contiene(objetoNorm, t));
  const apoyo = (tip.apoyo || []).filter((t) => contiene(objetoNorm, t));
  const excluye = (tip.excluye || []).filter((t) => contiene(objetoNorm, t));
  const puntaje = PESO_ANCLA * anclas.length + PESO_APOYO * apoyo.length + PESO_EXCLUYE * excluye.length;
  return { codigo: tip.codigo, nombre: tip.nombre, puntaje, anclas, apoyo, excluye };
}

function nivelA(objetoNorm) {
  const ranking = TIPOLOGIAS
    .map((t) => puntuarTipologia(objetoNorm, t))
    .filter((r) => r.puntaje > 0)
    .sort((a, b) => b.puntaje - a.puntaje || a.codigo.localeCompare(b.codigo));
  return {
    ranking,
    p1: ranking.length ? ranking[0].puntaje : 0,
    p2: ranking.length > 1 ? ranking[1].puntaje : 0,
  };
}

/* ───────────────────────── Nivel B · UNSPSC (veto) ────────────────────────── */

function nivelB(codigosTexto) {
  const { codigos } = extraerCodigos(codigosTexto || "");
  if (!codigos.length) return { presente: false, familias: [], compatibles: [] };
  const familias = [...new Set(codigos.map((c) => c.familia))];
  const compatibles = [...new Set(familias.flatMap((f) => tipologiasDeFamilia(f)))];
  return { presente: true, familias, compatibles };
}

/* ─────────────────── cantidades desde el texto del objeto ─────────────────
   Tres detalles que NO son cosméticos (§1.D.5):
     · el lookbehind impide reenganchar a mitad de un número — sin él «1500 km»
       captura 500, un error de factor 3 y silencioso;
     · decimal COLOMBIANO: el punto separa miles y la coma decimales.
       Invertirlo multiplica por mil;
     · ATRIBUCIÓN: la magnitud solo vale si aparece a ≤ 6 palabras de un
       término ancla de la tipología. Sin esta regla «…PLACA HUELLA VEREDA X,
       CONTRATO 2024-350» produce 2024 km. */
const RE_MAGNITUD = new RegExp(
  "(?<![\\d.,])(\\d{1,3}(?:\\.\\d{3})+(?:,\\d+)?|\\d+(?:,\\d+)?)\\s*"
  + "(km|kms|kilometros?|ml|metros?\\s+lineales?|m2|mts2|metros?\\s+cuadrados?|"
  + "m3|metros?\\s+cubicos?|ha|hectareas?|und?|unidades?|viviendas?|aulas?)\\b",
  "g",
);

const UNIDAD_CANONICA = {
  km: "km", kms: "km", kilometro: "km", kilometros: "km",
  ml: "ml", "metro lineal": "ml", "metros lineales": "ml", "metro lineales": "ml",
  m2: "m2", mts2: "m2", "metro cuadrado": "m2", "metros cuadrados": "m2",
  m3: "m3", "metro cubico": "m3", "metros cubicos": "m3",
  ha: "ha", hectarea: "ha", hectareas: "ha",
  un: "un", und: "un", unidad: "un", unidades: "un",
  vivienda: "un", viviendas: "un", aula: "un", aulas: "un",
};

function aNumeroColombiano(s) {
  const limpio = String(s).replace(/\./g, "").replace(",", ".");
  const n = Number(limpio);
  return Number.isFinite(n) ? n : null;
}

const PALABRAS_DE_DISTANCIA = 6;

function extraerCantidades(objeto, tip) {
  const texto = norm(objeto);
  const anclas = tip ? [...(tip.anclas || []), ...(tip.apoyo || [])].map(norm).filter(Boolean) : [];
  const salida = [];
  RE_MAGNITUD.lastIndex = 0;
  let m;
  while ((m = RE_MAGNITUD.exec(texto)) !== null) {
    const valor = aNumeroColombiano(m[1]);
    if (valor == null || valor <= 0) continue;
    const unidad = UNIDAD_CANONICA[norm(m[2]).replace(/s$/, "")] || UNIDAD_CANONICA[norm(m[2])] || null;
    if (!unidad) continue;

    // regla de atribución: ¿hay un ancla a ≤ 6 palabras de distancia?
    let atribuida = anclas.length === 0;
    if (!atribuida) {
      const desde = Math.max(0, m.index - 120);
      const ventana = texto.slice(desde, m.index + m[0].length + 120);
      for (const a of anclas) {
        const iA = ventana.indexOf(a);
        if (iA < 0) continue;
        const iM = ventana.indexOf(m[0]);
        if (iM < 0) continue;
        const entre = ventana.slice(Math.min(iA + a.length, iM + m[0].length), Math.max(iA, iM));
        const palabras = entre.trim() ? entre.trim().split(/\s+/).length : 0;
        if (palabras <= PALABRAS_DE_DISTANCIA) { atribuida = true; break; }
      }
    }
    if (!atribuida) continue;
    salida.push({ valor, unidad, textual: m[0].trim() });
  }
  return salida;
}

/* ─────────────────────────── inferir (la cascada) ─────────────────────────── */

/**
 * @param {string} objeto  nombre + descripción del proceso
 * @param {object} opts    { codigos_unspsc?: string }
 * @returns estado 🟢/🟡/⚪, tipología, ítems sugeridos y las cantidades legibles.
 *          NUNCA lanza y NUNCA devuelve `null`: un objeto ilegible sale como
 *          ⚪ con su motivo, que es lo que permite contar los estados y exigir
 *          que sumen los evaluados.
 */
function inferir(objeto, opts = {}) {
  const texto = String(objeto == null ? "" : objeto);
  const objetoNorm = norm(texto);
  const b = nivelB(opts.codigos_unspsc || "");

  const base = {
    objeto: texto,
    unspsc: { presente: b.presente, familias: b.familias, tipologias_compatibles: b.compatibles },
    ranking: [], tipologia: null, items: [], cantidades: [],
    puntaje: 0, margen: 0,
  };

  if (!objetoNorm.trim()) {
    return { ...base, estado: "no_determinada", motivo: "objeto_vacio",
      mensaje: "No se indicó el objeto del proceso: no hay nada que clasificar." };
  }
  if (!tieneVerboDeObra(objetoNorm)) {
    return { ...base, estado: "no_determinada", motivo: "sin_verbo_obra",
      mensaje: "El objeto no contiene ningún verbo de obra civil. No se presupuesta: revise el pliego." };
  }

  const a = nivelA(objetoNorm);
  if (!a.ranking.length) {
    return { ...base, estado: "no_determinada", motivo: "sin_tipologia",
      mensaje: "El objeto es de obra pero no casa con ninguna de las 22 tipologías del catálogo. No se presupuesta: revise el pliego." };
  }

  const mejor = a.ranking[0];
  const margen = a.p1 - a.p2;
  const compatibleB = !b.presente || b.compatibles.includes(mejor.codigo);

  let estado, motivo, mensaje;
  if (a.p1 >= UMBRAL_VERDE && margen >= MARGEN_VERDE && compatibleB) {
    estado = "verde"; motivo = "lexico_y_unspsc";
    mensaje = `Tipología «${mejor.nombre}» identificada con margen claro. Los ítems sugeridos son un punto de partida: las cantidades hay que tomarlas del formulario del pliego.`;
  } else if (a.p1 >= UMBRAL_AMARILLO) {
    estado = "amarillo";
    if (!compatibleB) {
      motivo = "unspsc_incompatible";
      mensaje = `El texto apunta a «${mejor.nombre}» pero los códigos UNSPSC publicados (familias ${b.familias.join(", ")}) no son compatibles con esa tipología. VERIFICAR EL PLIEGO antes de presupuestar.`;
    } else if (!b.presente) {
      motivo = "sin_unspsc";
      mensaje = `Tipología «${mejor.nombre}» por texto, sin código UNSPSC que la confirme. Verificar el pliego.`;
    } else if (a.ranking.length > 1 && margen < MARGEN_VERDE) {
      motivo = "margen_estrecho";
      mensaje = `Tipología «${mejor.nombre}», pero «${a.ranking[1].nombre}» puntúa casi igual. Verificar el pliego antes de presupuestar.`;
    } else {
      // candidata única (o con margen de sobra) pero por debajo del umbral de
      // 🟢: hay señal, no hay evidencia suficiente. No es lo mismo que un
      // empate y decirlo así ahorra buscar un segundo candidato que no existe.
      motivo = "puntaje_insuficiente";
      mensaje = `Tipología «${mejor.nombre}» con señal débil (${a.p1} puntos; hacen falta ${UMBRAL_VERDE} para presupuestar sin reservas). Verificar el pliego.`;
    }
  } else {
    return {
      ...base, ranking: a.ranking, puntaje: a.p1, margen,
      estado: "no_determinada", motivo: "puntaje_bajo",
      mensaje: "Las señales del objeto no alcanzan para fijar una tipología. No se presupuesta: hace falta el pliego.",
    };
  }

  const tip = tipologiaPorCodigo(mejor.codigo);
  /* Solo los CÓDIGOS. La descripción, la unidad y el precio los pone quien
     tenga el catálogo delante (el endpoint, que lo lee de Redis): este módulo
     es hoja y no puede depender del catálogo de precios — saber QUÉ obra es no
     depende de cuánto cuesta, ni de si alguien corrió la carga.
     Una lista vacía significa que el catálogo aún no cubre esa tipología, y el
     mensaje lo dice en vez de proponer ítems de otra cosa. */
  const items = itemsDeTipologia(mejor.codigo);
  if (!items.length) {
    mensaje += ` El catálogo todavía no tiene ítems para «${mejor.nombre}»: la tipología se identificó, pero hay que armar el presupuesto a mano.`;
  }

  return {
    ...base,
    ranking: a.ranking.slice(0, 5),
    tipologia: {
      codigo: mejor.codigo, nombre: mejor.nombre,
      unidad_dominante: tip ? tip.unidad_dominante : null,
      sin_apu: !!(tip && tip.sin_apu),
      nota: (tip && tip.nota) || null,
    },
    items,
    cantidades: extraerCantidades(texto, tip),
    puntaje: a.p1, margen, estado, motivo, mensaje,
  };
}

module.exports = {
  inferir, nivelA, nivelB, extraerCantidades, tieneVerboDeObra,
  PESO_ANCLA, PESO_APOYO, PESO_EXCLUYE,
  UMBRAL_VERDE, MARGEN_VERDE, UMBRAL_AMARILLO,
  ESTADOS: ["verde", "amarillo", "no_determinada"],
};
