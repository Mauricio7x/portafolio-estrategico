/* ============================================================================
   lib/negocio · Reglas de negocio: enriquecer(licitacion)
   ----------------------------------------------------------------------------
   Añade a cada licitación cruda de Socrata (dataset p6dx-8zbt) los campos:

     anticipo_pct      number   % de anticipo (0 si no se declara/detecta)
     cuantia_cop       number   valor en COP usado para el rango (auxiliar)
     cuantia_rango     string   "bajo" (<100M) | "medio" (100–500M) | "alto" (>500M)
     nivel_competencia string   "baja" (≤5 ofertas) | "media" (6–15) | "alta" (>15)
     ubicacion_valida  boolean  entidad en UBICACION_VALIDA (default "BOGOTÁ D.C.")
     puntaje_ponderado number   0.4·anticipo + 0.3·cuantía + 0.3·competencia (0–100)
     proceso_abierto   boolean  lib/filtros.estado_abierto: listas canónicas,
                                estado desconocido = CERRADO (sin optimismo)
     fecha_cierre      string?  fecha de cierre detectada (columna no garantizada)

   Umbrales como constantes del archivo (no variables de entorno), por diseño.

   Realidad del dato (documentada, no supuesta): p6dx-8zbt NO trae una columna
   de anticipo — el % solo existe si el pliego lo menciona en el texto del
   objeto, así que la mayoría de procesos queda en anticipo_pct = 0 = "sin
   dato". Por eso /api/oportunidades trata 0 como "no declarado" (pasa el
   filtro anticipo_min pero puntúa 0 en ese componente); excluirlo dejaría la
   app permanentemente vacía. La fecha de cierre tampoco tiene columna única:
   se detecta de forma defensiva sobre varios nombres candidatos.
   ========================================================================== */
"use strict";

const { fechaOperable } = require("./habiles.js"); // habiles no requiere nada: no cierra ciclo
const { estado_abierto } = require("./filtros.js");

/* ---------- umbrales (constantes por requerimiento) ---------- */
const CUANTIA_BAJO_MAX = 100e6;   // < 100 M COP  → "bajo"
const CUANTIA_MEDIO_MAX = 500e6;  // 100–500 M    → "medio"; > 500 M → "alto"
const COMPETENCIA_BAJA_MAX = 5;   // ≤ 5 oferentes  → "baja"
const COMPETENCIA_MEDIA_MAX = 15; // 6–15           → "media"; > 15 → "alta"
const ANTICIPO_PLENO_PCT = 20;    // ≥ 20 % de anticipo = score 100

const PESO_ANTICIPO = 0.4, PESO_CUANTIA = 0.3, PESO_COMPETENCIA = 0.3;
const SCORE_CUANTIA = { bajo: 30, medio: 60, alto: 100 };
const SCORE_COMPETENCIA = { baja: 100, media: 60, alta: 30 };

/* La fecha de cierre vive en columnas distintas según la modalidad. */
const CIERRE_CANDIDATOS = [
  "fecha_de_recepcion_de", "fecha_de_recepci_n_de", "fecha_l_mite_de_recepci",
  "fecha_de_cierre", "fecha_l_mite", "fecha_de_apertura_de_respuesta", "fecha_de_apertura_efectiva",
];

const DEV = !process.env.VERCEL && process.env.NODE_ENV !== "production";
const logDev = (...a) => { if (DEV) console.log("[negocio]", ...a); };

/* ---------- utilidades tolerantes ---------- */
function num(v) {
  if (v == null) return null;
  const n = parseFloat(String(v).replace(/[%$\s]/g, "").replace(",", "."));
  return isNaN(n) ? null : n;
}

function primerNumero(lic, candidatos) {
  for (const c of candidatos) {
    const n = num(lic[c]);
    if (n != null) return n;
  }
  return null;
}

const normaliza = (s) => String(s || "")
  .normalize("NFD").replace(/[̀-ͯ]/g, "")
  .toUpperCase().replace(/[^A-Z0-9Ñ ]+/g, " ").replace(/\s+/g, " ").trim();

/* ---------- anticipo ---------- */
const ANTICIPO_CAMPOS = ["anticipo_pct", "porcentaje_de_anticipo", "anticipo_porcentaje", "porcentaje_anticipo", "pct_anticipo", "anticipo"];
/* el futuro y «lugar a» entraron el 3-sep-2026, a la par de lib/dictamen_reglas (la
   gemela sobre texto plegado): «No se entregará anticipo» salía como «hay anticipo». */
const SIN_ANTICIPO_RE = /no\s+(?:se\s+)?(?:ha\s+previsto|contempla|prev[eé]|habr[aá]|hay|otorga|aplica|pacta|paga|entrega|reconoce|da)(?:r|r[aá]|r[aá]n|n)?(?:\s+lugar\s+a)?\s+(?:ning[uú]n\s+|el\s+pago\s+de\s+|pago\s+de\s+)?(?:anticipo|pago\s+anticipado)|sin\s+anticipo|anticipo[:\s]+(?:0\b|cero|no\s+aplica|n\/a)/i;
// [^%0-9.;] impide cruzar frases: "NO SE PAGARÁ ANTICIPO. … ACTAS DEL 90%"
// no debe leerse como anticipo del 90 % (falso positivo que además inflaría
// el puntaje y relajaría el chequeo de capacidad K).
const ANTICIPO_TEXTO_RE = [
  /anticipo[^%0-9.;]{0,120}?(\d{1,3}(?:[.,]\d+)?)\s*%/i,
  /(\d{1,3}(?:[.,]\d+)?)\s*%[^.;]{0,60}?(?:de\s+|en\s+calidad\s+de\s+|por\s+concepto\s+de\s+|a\s+t[ií]tulo\s+de\s+)?anticipo/i,
];

function anticipoPct(lic, texto) {
  const declarado = primerNumero(lic, ANTICIPO_CAMPOS);
  if (declarado != null && declarado >= 0 && declarado <= 100) return declarado;
  if (SIN_ANTICIPO_RE.test(texto)) return 0;
  for (const re of ANTICIPO_TEXTO_RE) {
    const m = texto.match(re);
    if (m) {
      const n = num(m[1]);
      if (n != null && n > 0 && n <= 100) return n;
    }
  }
  return 0; // sin dato: el requerimiento manda 0
}

/* ---------- cuantía ---------- */
const CUANTIA_CAMPOS = ["precio_base", "valor_total", "cuantia_definitiva", "cuantia_proceso", "valor_total_adjudicacion"];
function cuantiaRango(cop) {
  if (cop < CUANTIA_BAJO_MAX) return "bajo";
  if (cop <= CUANTIA_MEDIO_MAX) return "medio";
  return "alto";
}

/* ---------- competencia ---------- */
const COMPETENCIA_CAMPOS = [
  "respuestas_al_procedimiento", "conteo_de_respuestas_a_ofertas", "proveedores_unicos_con",
  "numero_de_ofertas", "numero_ofertas", "proponentes",
];
function nivelCompetencia(nOfertas) {
  if (nOfertas <= COMPETENCIA_BAJA_MAX) return "baja";
  if (nOfertas <= COMPETENCIA_MEDIA_MAX) return "media";
  return "alta";
}

/* ---------- ubicación ---------- */
function ubicacionesValidas() {
  return (process.env.UBICACION_VALIDA || "BOGOTÁ D.C.")
    .split(",").map(normaliza).filter(Boolean);
}
function ubicacionValida(lic) {
  const objetivo = ubicacionesValidas();
  const lugares = [normaliza(lic.ciudad_entidad), normaliza(lic.departamento_entidad)].filter(Boolean);
  if (!lugares.length) return false;
  return objetivo.some((o) => lugares.some((l) => l === o || l.includes(o) || o.includes(l)));
}

/* ---------- fecha de cierre (detección defensiva) ---------- */
/* Una fecha con año imposible (1970 de timestamp nulo, 2202) NO es un cierre:
   se salta y se sigue con la siguiente columna candidata — antes se elegía la
   PRIMERA que parseaba, aunque otra trajera la fecha real (1-sep-2026). */
function fechaCierre(lic) {
  const legible = (v) => v && !isNaN(Date.parse(v)) && fechaOperable(String(v));
  for (const c of CIERRE_CANDIDATOS) {
    const v = lic[c];
    if (legible(v)) return String(v);
  }
  // red de seguridad: cualquier columna fecha* de recepción/cierre/límite/plazo
  for (const k in lic) {
    if (/fecha/i.test(k) && /(recep|cierre|l[ií]mit|plazo)/i.test(k)) {
      const v = lic[k];
      if (legible(v)) return String(v);
    }
  }
  return null;
}

/* ---------- puntajes ---------- */
function anticipoScore(pct) {
  return pct >= ANTICIPO_PLENO_PCT ? 100 : (pct / ANTICIPO_PLENO_PCT) * 100;
}

/* ============================ enriquecer ============================ */
function enriquecer(lic) {
  const texto = `${lic.nombre_del_procedimiento || ""} ${lic.descripci_n_del_procedimiento || ""}`;

  const anticipo_pct = anticipoPct(lic, texto);
  const cuantia_cop = primerNumero(lic, CUANTIA_CAMPOS) || 0;
  /* SIN CUANTÍA NO HAY RANGO (1-sep-2026): con el 0 de «no publicada» el rango
     salía «bajo» y `?cuantia_rango=bajo` mezclaba «sin presupuesto» con
     «menos de 100 M». Las puertas ya tratan el 0 como sin_dato; el rango se
     alinea: null, que el filtro no casa y la tarjeta no rotula. */
  const cuantia_rango = cuantia_cop > 0 ? cuantiaRango(cuantia_cop) : null;
  const ofertas = primerNumero(lic, COMPETENCIA_CAMPOS) ?? 0;
  const nivel_competencia = nivelCompetencia(ofertas);
  const ubicacion = ubicacionValida(lic);

  const puntaje = PESO_ANTICIPO * anticipoScore(anticipo_pct)
    + PESO_CUANTIA * SCORE_CUANTIA[cuantia_rango]
    + PESO_COMPETENCIA * SCORE_COMPETENCIA[nivel_competencia];

  const out = {
    ...lic,
    anticipo_pct,
    cuantia_cop,
    cuantia_rango,
    nivel_competencia,
    ubicacion_valida: ubicacion,
    puntaje_ponderado: Math.round(puntaje * 10) / 10,
    proceso_abierto: estado_abierto(lic),
    fecha_cierre: fechaCierre(lic),
  };
  logDev(`enriquecida ${lic.id_del_proceso || "?"}: puntaje=${out.puntaje_ponderado} rango=${cuantia_rango}`);
  return out;
}

/* EL PRESUPUESTO OFICIAL PUBLICADO, O null (2-sep-2026). `enriquecer` guarda
   `cuantia_cop` con `|| 0` (el 0 significa «no publicado»); quien necesita la
   cifra como DATO la pide aquí y recibe null cuando no la hay. Antes era un
   ternario en línea del listado; el dictamen del pliego lo necesitaba igual y
   dos copias divergen. */
function presupuestoOficialDe(l) {
  const n = Number(l && l.cuantia_cop);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/* ---------- forma de pago: precios unitarios vs precio global ----------
   La variable de riesgo que el manual omite y el complemento documenta: en
   GLOBAL el riesgo de cantidades es del contratista y no se reconocen mayores
   cantidades; en UNITARIOS las cantidades del pliego son un estimativo y las
   mayores cantidades ordenadas deben reconocerse (y una mayor cantidad NO es
   una adición: el tope del 50 % no la limita).

   Corre AL SERVIR, no en `enriquecer`: los campos de enriquecer se guardan en
   la ingesta y añadir uno ahí exigiría relanzar la full. Detección
   CONSERVADORA sobre el texto normalizado: solo las fórmulas explícitas
   («GLOBAL» suelto aparece en «cobertura global» y no dice nada del pago). Si
   el objeto menciona LAS DOS (pasa en contratos mixtos) no se afirma ninguna —
   null es «sin dato», nunca una adivinanza. */
const PRECIOS_UNITARIOS_RE = /\bPRECIOS? UNITARIOS?\b/;
const PRECIO_GLOBAL_RE = /\bPRECIOS? GLOBAL(?:ES)?\b/;

function tipoPrecio(texto) {
  const t = normaliza(texto);
  if (!t) return null;
  const unitarios = PRECIOS_UNITARIOS_RE.test(t);
  const global = PRECIO_GLOBAL_RE.test(t);
  if (unitarios === global) return null; // ninguno, o los dos: no se afirma
  return unitarios ? "unitarios" : "global";
}

module.exports = {
  enriquecer,
  tipoPrecio,
  presupuestoOficialDe,
  // `fechaCierre` la usa lib/filtros (con require diferido, para no cerrar el
  // ciclo negocio → filtros → negocio) porque la regla de «cierre vencido»
  // corre TAMBIÉN en la ingesta, donde la fila todavía no pasó por enriquecer
  // y no tiene el campo `fecha_cierre` resuelto.
  fechaCierre,
  // expuestos para pruebas y para /api/oportunidades
  CIERRE_CANDIDATOS,
  CUANTIA_BAJO_MAX, CUANTIA_MEDIO_MAX, COMPETENCIA_BAJA_MAX, COMPETENCIA_MEDIA_MAX,
  ANTICIPO_PLENO_PCT, normaliza, num,
  // lib/guia_proceso lee el anticipo de una FOTO guardada (sin `anticipo_pct`
  // resuelto) con la MISMA regla que la ingesta: una segunda regex divergiría
  anticipoPct,
};
