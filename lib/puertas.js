/* ============================================================================
   lib/puertas · Las cuatro puertas de viabilidad de un proceso
   ----------------------------------------------------------------------------
   Sustituye al `puntaje_ponderado` (0.4·anticipo + 0.3·cuantía + 0.3·competencia)
   como criterio de decisión. La razón está documentada en docs/ATRACTIVIDAD.md:
   una SUMA PONDERADA es compensatoria, y aquí compensar es un error de
   categoría. No poder financiar la obra no se compensa con cuantía alta; que el
   objeto no esté en el RUP no se compensa con nada. Lo que decide no es el
   orden: son las PUERTAS.

     P1 · RUP          ¿el objeto es de mi especialidad y está en mi RUP?
     P2 · K            ¿la capacidad residual alcanza para esta carga?
     P3 · CAJA         ¿puedo financiar la obra hasta que me paguen?   ← NUEVA
     P4 · COMPETENCIA  ¿cuánta gente se presenta históricamente aquí?

   Cada puerta devuelve `{pasa, …, mensaje}` con su propio dato a la vista: el
   número que sostiene el veredicto viaja SIEMPRE con él, porque una puerta
   cerrada sin la cifra que la cierra no se puede discutir ni corregir.

   P3 es la puerta que de verdad ata, y es información nueva sin un dato nuevo:
   sale de `precio_base` y `duracion`, que ya se proyectan, más el patrimonio
   que ya vive en lib/perfiles. El caso real que la motivó: Génesis (patrimonio
   $211 M) frente a un proceso de $3.100 M necesita financiar ~$620 M antes del
   primer cobro. Hoy la app lo muestra con «Capacidad K ✓» en verde, porque el K
   del RUP mide HABILITACIÓN, no si se puede construir y financiar.

   P4 NUNCA bloquea (ver REGLA DE FALTANTES). Informa y, si la competencia es
   alta, lo advierte — pero un proceso no es inviable por tener rivales.

   REGLA DE FALTANTES (docs/ATRACTIVIDAD.md §1): un dato ausente no vale 0 ni 1.
   Las puertas que dependen de un dato que el dataset no publica marcan
   `sin_dato: true` y DEJAN PASAR, porque cerrar por ignorancia esconde
   oportunidades reales y el usuario no puede ni enterarse. Lo que no se sabe se
   dice en el mensaje; no se convierte en un veredicto.

   Todo esto se calcula EN LA CONSULTA, con los parámetros del perfil
   consultado: el mismo proceso da puertas distintas para Helder, Génesis y el
   consorcio. Sellarlo en la ingesta (como hacía `puntaje_ponderado`) daba el
   mismo orden a los tres pese a topes de 4.000 / 2.000 / 11.000 SMMLV.
   ========================================================================== */
"use strict";

const { PERFILES, SMMLV } = require("./perfiles.js");
const { crp, calcCRPC, plazoMesesDe } = require("./capacidad.js");
const { evaluarRup } = require("./rup.js");

/* Fracción del valor a financiar que hay que tener en patrimonio. Es un
   criterio INTERNO del dueño (no una exigencia legal): con anticipos que el
   dataset no publica y ciclos de cobro de 60-90 días, entrar a una obra sin
   respaldo patrimonial por al menos esta fracción es lo que quiebra empresas
   pequeñas. Se deja como constante nombrada para poder subirla o bajarla en un
   solo sitio cuando el dueño aporte su línea de crédito real. */
const FRACCION_FINANCIACION = 0.20;

/* Tiers del matching UNSPSC (lib/unspsc) y su lectura como puerta.
     clase       la clase del RUP contiene al código publicado → sólido
     familia     la entidad publicó a nivel de familia → amplio, ver pliego
     equivalente clase afín aprendida del histórico de adjudicaciones
     texto       sin código utilizable; lo sostiene el objeto
     ninguno     no hay nada que lo ate al RUP → única causa de NO PASA */
const TIERS_SOLIDOS = ["clase", "familia"];
const TIERS_CON_ADVERTENCIA = ["equivalente", "texto"];

const MENSAJE_TIER = {
  clase: "La clase UNSPSC del proceso está inscrita en su RUP.",
  familia: "El proceso se publicó a nivel de familia UNSPSC: encaja, pero verifique el objeto en el pliego.",
  equivalente: "Encaja por una clase AFÍN aprendida del histórico de adjudicaciones, no por código inscrito. Verifíquelo en el pliego.",
  texto: "No hay código UNSPSC utilizable: solo lo sostiene el texto del objeto. Verifíquelo en el pliego.",
  ninguno: "Ni el código UNSPSC ni el objeto lo atan a su RUP.",
};

/* Patrimonio que respalda la FINANCIACIÓN. Para un proponente plural NO es el
   ponderado 50/50 de lib/perfiles (ese es para indicadores habilitantes, D.1082):
   es la SUMA de los patrimonios de los integrantes, porque quien pone la caja
   son ellos. Y en consorcio cada integrante responde por el 100 % del contrato
   (Ley 80/1993 art. 7), no por su porcentaje. */
function patrimonioFinanciero(perfil) {
  if (perfil.integrantes && perfil.integrantes.length) {
    return perfil.integrantes.reduce((a, i) => a + (Number(i.perfil.patrimonio) || 0), 0);
  }
  return Number(perfil.patrimonio) || 0;
}

const cop = (n) => `$${Math.round(Number(n) || 0).toLocaleString("es-CO")}`;

/* ── P1 · el objeto está en el RUP ───────────────────────────────────────── */
function p1Rup(rup) {
  const tier = (rup && rup.tier) || "ninguno";
  // `rup.paso` nombra la etapa de la cascada donde murió el objeto (convenio,
  // blacklist, pertinencia, anti-suministro…). Con `paso` no hay puerta que
  // valga: el proceso no es del negocio, aunque el código casara.
  const pasa = !rup.paso && TIERS_SOLIDOS.concat(TIERS_CON_ADVERTENCIA).includes(tier);
  return {
    pasa,
    tier,
    advertencia: pasa && TIERS_CON_ADVERTENCIA.includes(tier),
    mensaje: rup.paso ? (rup.motivo || "El objeto no es de su especialidad.") : (MENSAJE_TIER[tier] || MENSAJE_TIER.ninguno),
  };
}

/* ── P2 · capacidad residual de contratación (K) ─────────────────────────── */
function p2K(lic, perfil) {
  const presupuesto = Number(lic.cuantia_cop ?? lic.precio_base) || 0;
  const crpVal = crp(perfil, presupuesto);
  const crpcVal = calcCRPC(presupuesto, lic.anticipo_pct || 0, plazoMesesDe(lic));
  const tope = perfil.topeSMMLV * SMMLV;

  // Sin cuantía publicada el K no dice nada: `factorE` devuelve 120 «sin
  // presupuesto no hay ratio» y CRPC = 0 ≤ K, así que la puerta se abriría
  // sobre la nada. Se marca y se deja pasar (regla de faltantes), pero jamás
  // se presenta como capacidad verificada.
  if (presupuesto <= 0) {
    return {
      pasa: true, sin_dato: true, crp: Math.round(crpVal), crpc: 0,
      dentro_de_tope: true,
      mensaje: "El proceso no publica cuantía: la capacidad K no se puede verificar. Confírmela en el pliego.",
    };
  }

  const dentroDeK = crpcVal <= crpVal;
  const dentroDeTope = presupuesto <= tope;
  return {
    pasa: dentroDeK,
    crp: Math.round(crpVal),
    crpc: Math.round(crpcVal),
    dentro_de_tope: dentroDeTope,
    tope: Math.round(tope),
    mensaje: dentroDeK
      ? (dentroDeTope
        ? `Consume ${(100 * crpcVal / (crpVal || 1)).toFixed(0)} % de su capacidad residual (CRPC ${cop(crpcVal)} / K ${cop(crpVal)}).`
        : `Cabe en su K (${cop(crpVal)}) pero supera su tope estratégico de ${cop(tope)}.`)
      : `La carga del proceso (CRPC ${cop(crpcVal)}) supera su capacidad residual (K ${cop(crpVal)}).`,
  };
}

/* ── P3 · caja: ¿puede financiar la obra hasta que le paguen? ────────────── */
function p3Caja(lic, perfil) {
  const cuantia = Number(lic.cuantia_cop ?? lic.precio_base) || 0;
  const patrimonio = patrimonioFinanciero(perfil);
  const anticipoPct = Math.min(Math.max(Number(lic.anticipo_pct) || 0, 0), 100);
  const anticipo = cuantia * anticipoPct / 100;
  const financiacion = Math.max(0, (cuantia - anticipo) * FRACCION_FINANCIACION);

  if (cuantia <= 0) {
    return {
      pasa: true, sin_dato: true, patrimonio: Math.round(patrimonio), financiacion_requerida: 0,
      mensaje: "El proceso no publica cuantía: no se puede estimar cuánto habría que financiar.",
    };
  }

  const pasa = patrimonio >= financiacion;
  return {
    pasa,
    patrimonio: Math.round(patrimonio),
    financiacion_requerida: Math.round(financiacion),
    anticipo_pct: anticipoPct,
    mensaje: pasa
      ? `Necesitaría financiar ≈ ${cop(financiacion)} (${(100 * FRACCION_FINANCIACION).toFixed(0)} % del valor a ejecutar) y su patrimonio es ${cop(patrimonio)}.`
      : `Necesitaría financiar ≈ ${cop(financiacion)} antes del primer cobro y su patrimonio es ${cop(patrimonio)}.`
        + (anticipoPct === 0 ? " El dataset no publica el anticipo: se asume 0 %, que es el supuesto conservador — verifíquelo en el pliego." : ""),
  };
}

/* ── P4 · competencia histórica de la entidad ────────────────────────────── */
/* NUNCA bloquea: informa. Un proceso con 20 oferentes sigue siendo viable —
   solo es menos probable, y de eso ya se encarga P(ganar) (lib/probabilidad). */
function p4Competencia(competencia) {
  const c = competencia || {};
  const nivel = c.nivel || "sin_dato";
  const promedio = c.promedio_oferentes != null ? Number(c.promedio_oferentes) : null;
  const procesos = Number(c.total_procesos) || 0;
  const conBase = procesos > 0 && nivel !== "sin_dato" && promedio != null && !isNaN(promedio);

  return {
    pasa: true, // por diseño: la competencia no hace inviable un proceso
    nivel: conBase ? nivel : "sin_dato",
    promedio_oferentes: conBase ? promedio : null,
    total_procesos: procesos,
    advertencia: conBase && nivel === "alta",
    mensaje: !conBase
      ? "No hay histórico suficiente de esta entidad para estimar cuánta gente se presenta."
      : nivel === "alta"
        ? `Competencia alta: promedio ${promedio} oferentes en ${procesos} proceso${procesos === 1 ? "" : "s"} del histórico.`
        : `Competencia ${nivel}: promedio ${promedio} oferentes en ${procesos} proceso${procesos === 1 ? "" : "s"} del histórico.`,
  };
}

/* ============================ evaluarPuertas ============================== */
/* `opciones`:
     rup           veredicto ya calculado por la cascada (lib/filtros lo memoiza
                   por fila: recalcularlo aquí duplicaría el trabajo caro)
     competencia   resultado de indice_competencia.competenciaDe(indice, lic)
     conocimiento  {equivalencias, vocabulario} — solo si hay que evaluar el RUP
     incluirTextoDebil  abre la ruta de texto sin pertinencia verde */
function evaluarPuertas(lic, perfilId, opciones = {}) {
  const perfil = Object.prototype.hasOwnProperty.call(PERFILES, perfilId) ? PERFILES[perfilId] : null;
  if (!perfil) {
    const cerrada = { pasa: false, mensaje: "perfil desconocido" };
    return {
      p1_rup: { ...cerrada, tier: "ninguno" },
      p2_k: { ...cerrada, crp: 0, crpc: 0 },
      p3_caja: { ...cerrada, patrimonio: 0, financiacion_requerida: 0 },
      p4_competencia: { ...cerrada, nivel: "sin_dato", promedio_oferentes: null },
      pasa_todas: false,
      no_viable_por: ["perfil desconocido"],
    };
  }

  const rup = opciones.rup
    || evaluarRup(lic, perfilId, opciones.conocimiento, { incluirTextoDebil: !!opciones.incluirTextoDebil });

  const p1_rup = p1Rup(rup);
  const p2_k = p2K(lic, perfil);
  const p3_caja = p3Caja(lic, perfil);
  const p4_competencia = p4Competencia(opciones.competencia);

  /* «Pasa todas» son las CUATRO, y P4 siempre pasa: en la práctica manda P1-P3.
     Se conserva P4 en la conjunción para que el día que se decida que la
     competencia alta sí cierre, el cambio sea de una línea y no de un rediseño. */
  const pasa_todas = p1_rup.pasa && p2_k.pasa && p3_caja.pasa && p4_competencia.pasa;

  const no_viable_por = [];
  if (!p1_rup.pasa) no_viable_por.push("RUP");
  if (!p2_k.pasa) no_viable_por.push("K");
  if (!p3_caja.pasa) no_viable_por.push("Caja");

  /* «Técnicamente viable aunque financieramente ajustado»: el objeto es suyo y
     la capacidad alcanza, pero la caja no llega. Se publica aparte de
     `pasa_todas` porque es una categoría de negocio distinta — no es un
     proceso que haya que descartar, es uno que habría que financiar (anticipo,
     línea de crédito o consorcio), y esa es una decisión, no un filtro. */
  const pasa_rup_y_k = p1_rup.pasa && p2_k.pasa;

  return { p1_rup, p2_k, p3_caja, p4_competencia, pasa_todas, pasa_rup_y_k, no_viable_por };
}

module.exports = {
  evaluarPuertas,
  FRACCION_FINANCIACION, TIERS_SOLIDOS, TIERS_CON_ADVERTENCIA,
  patrimonioFinanciero,
  // expuestas para pruebas de unidad
  p1Rup, p2K, p3Caja, p4Competencia,
};
