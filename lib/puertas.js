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

   P3 NO CIERRA POR EL ANTICIPO QUE SECOP II NO PUBLICA: el dataset p6dx-8zbt no
   trae la columna, así que `anticipo_pct = 0` era a la vez «el pliego dice que
   no hay» y «no se sabe». Lo segundo sale con `sin_dato_de: "anticipo"`, pasa,
   y dice la cifra que habría que financiar si no hubiera ninguno.

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
const { crp } = require("./capacidad.js"); // `calcCRPC`/`plazoMesesDe` ya no se llaman aquí: los envuelve `cargaK`
const { evaluarRup, cargaK } = require("./rup.js");

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

/* ¿ALGUIEN DECLARÓ EL ANTICIPO, O ES QUE EL DATASET NO LO TRAE? Lo decide la
   MISMA cascada de lib/negocio que fija `anticipo_pct` (una segunda regla aquí
   divergiría a la primera corrección). `enriquecer` ya publica el campo; las
   filas guardadas en la caché ANTES de que existiera no lo llevan, así que se
   recalcula sobre el texto del objeto —que sí viaja con la fila— en vez de
   esperar una full. Require diferido: lib/negocio → lib/filtros → (diferido)
   lib/negocio ya es un ciclo vivo, y cargarlo aquí arriba lo tensaría sin
   necesidad. */
function anticipoDeclaradoEn(lic) {
  const { anticipoDeclarado } = require("./negocio.js");
  return anticipoDeclarado(lic); // él decide, incluida la lectura del campo ya resuelto
}

/* EL CÓDIGO CASA, PERO SOLO POR UNA CLASE DE SERVICIOS QUE NO SON OBRA
   (23-sep-2026). Mensajería, revisoría fiscal, gestión documental, primera
   infancia… entran por clases 80/84/85/86/91/93 que los RUP inscriben para la
   gerencia de proyectos y la interventoría. La pertinencia no los descarta
   —ninguna lista los alcanza a todos y esconder por la duda es el falso
   negativo caro—, pero P1 ya no pasa LIMPIO: «la clase está inscrita» era
   verdad y enterraba lo que importa. Frase llana, de usted, sin la sigla. */
const MENSAJE_CASA_SOLO_POR_SERVICIO = "Su registro tiene el código de este proceso, pero el objeto no describe una obra: confírmelo antes de contar con él.";

/* ── P1 · el objeto está en el RUP ───────────────────────────────────────── */
function p1Rup(rup) {
  const tier = (rup && rup.tier) || "ninguno";
  // `rup.paso` nombra la etapa de la cascada donde murió el objeto (convenio,
  // blacklist, pertinencia, anti-suministro…). Con `paso` no hay puerta que
  // valga: el proceso no es del negocio, aunque el código casara.
  const pasa = !rup.paso && TIERS_SOLIDOS.concat(TIERS_CON_ADVERTENCIA).includes(tier);
  // lo decide la pertinencia (lib/filtros, paso 4), no una segunda regla aquí
  const casaSoloPorServicio = pasa && TIERS_SOLIDOS.includes(tier)
    && !!(rup.pertinencia && rup.pertinencia.casa_solo_por_servicio);
  return {
    pasa,
    tier,
    advertencia: pasa && (TIERS_CON_ADVERTENCIA.includes(tier) || casaSoloPorServicio),
    casa_solo_por_servicio: casaSoloPorServicio,
    mensaje: rup.paso ? (rup.motivo || "El objeto no es de su especialidad.")
      : casaSoloPorServicio ? MENSAJE_CASA_SOLO_POR_SERVICIO
      : (MENSAJE_TIER[tier] || MENSAJE_TIER.ninguno),
  };
}

/* ── P2 · capacidad residual de contratación (K) ─────────────────────────── */
function p2K(lic, perfil) {
  const presupuesto = Number(lic.cuantia_cop ?? lic.precio_base) || 0;
  const crpVal = crp(perfil, presupuesto);
  /* EL ANTICIPO NO PUBLICADO, CON LA MISMA REGLA QUE LA CASCADA (13-sep-2026).
     `calcCRPC(presupuesto, lic.anticipo_pct || 0, …)` convertía aquí la misma
     ausencia en un 0 % medido que P3 dejó de convertir el 12-sep. La regla no
     se reescribe: la pone `lib/rup.cargaK` y la llaman los dos sitios, porque
     si la cascada retira una fila que P2 deja pasar (o al revés) hay dos
     cálculos de K y ninguno sirve para verificar al otro. */
  const { crpc: crpcVal, crpc_minimo, anticipo_sin_publicar } = cargaK(lic, presupuesto);
  const tope = perfil.topeSMMLV == null ? null : perfil.topeSMMLV * SMMLV;

  /* K SIN DATO: el perfil no trae utilidad ni ingreso operacional (perfil
     aproximado de la puerta de entrada). No es «capacidad cero»: es que no se
     puede calcular. Se deja pasar y se dice qué falta para calcularla. */
  if (crpVal == null) {
    /* ⚠️ EL MENSAJE NOMBRA LO QUE DE VERDAD FALTA (27-ago-2026). Con la regla
       de faltantes extendida a los tres indicadores, la K también sale null con
       la utilidad YA cargada y la liquidez (o la experiencia, o el personal)
       ilegible: el mensaje fijo «falta la utilidad operacional» le pedía al
       usuario cargar lo que ya cargó y callaba lo que falta — la familia de
       `msg401`: un diagnóstico falso es peor que uno genérico. Se enumera lo
       ausente mirando el perfil (los integrantes de un plural se recorren:
       la suma tampoco se conoce si a uno le falta algo). */
    const sinDato = (v) => v == null || v === "" || !Number.isFinite(Number(v));
    const faltantesDe = (p) => {
      if (p.integrantes) return [...new Set(p.integrantes.flatMap((i) => faltantesDe(i.perfil)))];
      const f = [];
      if (p.ingresoOp == null && sinDato(p.utilidadOp)) f.push("la utilidad (o el ingreso) operacional");
      if (sinDato(p.liquidez)) f.push("el índice de liquidez");
      if (sinDato(p.expSMMLV)) f.push("la experiencia acreditada");
      if (sinDato(p.profesionales)) f.push("el personal profesional");
      return f;
    };
    const faltan = faltantesDe(perfil);
    const lista = faltan.length ? faltan.join(", ") : "algún indicador del registro";
    return {
      pasa: true, sin_dato: true, crp: null, crpc: Math.round(crpcVal),
      dentro_de_tope: tope == null ? true : presupuesto <= tope, tope: tope == null ? null : Math.round(tope),
      mensaje: `Su capacidad de contratación no se puede calcular todavía: falta ${lista} de su empresa. `
        + "Cárguelo en «Mi empresa» para verificar este proceso.",
    };
  }

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

  const dentroDeK = crpc_minimo <= crpVal;
  const dentroDeTope = tope == null ? true : presupuesto <= tope;
  /* PASA SOLO PORQUE NO SE SABE, Y SE DICE. No es `sin_dato` —la K se calculó y
     la cuantía está publicada; quien lee ese campo (lib/publico,
     lib/guia_proceso, la puerta de entrada) diría «falta la utilidad
     operacional» o «el proceso no publica cuantía», que aquí son falsos—: es
     una tercera cosa y lleva su propio nombre. */
  const dependeDelAnticipo = anticipo_sin_publicar && dentroDeK && crpcVal > crpVal;
  /* EL ANTICIPO QUE HARÍA CABER EL PROCESO, redondeado HACIA ARRIBA: con ese
     porcentaje o más la carga cabe de verdad, así que la frase es cierta para
     cualquier anticipo que el pliego declare por encima. Solo se muestra; lo
     que decide es la comparación de arriba, no esta cifra. */
  const anticipoQueCabe = Math.ceil(100 * (1 - crpVal / (crpcVal || 1)));
  return {
    pasa: dentroDeK,
    crp: Math.round(crpVal),
    crpc: Math.round(crpcVal),
    dentro_de_tope: dentroDeTope,
    tope: tope == null ? null : Math.round(tope),
    depende_del_anticipo: dependeDelAnticipo,
    /* EL CANAL DE AVISO QUE YA EXISTE, NO UNO NUEVO: la tarjeta baja a ámbar
       con «Cumple los requisitos, con detalles por revisar» ante cualquier
       puerta con `pasa && advertencia` (public/app.js, el mismo camino de P1
       con tier débil), y el mensaje de aquí viaja en el detalle. Una fila que
       pasa solo porque no se sabe el anticipo no puede pintarse en verde. */
    advertencia: dependeDelAnticipo,
    mensaje: dependeDelAnticipo
      ? `SECOP II no publica el anticipo de este proceso. Sin anticipo la carga (CRPC ${cop(crpcVal)}) `
        + `supera su capacidad residual (K ${cop(crpVal)}): el proceso solo cabe si el pliego prevé un `
        + `anticipo del ${anticipoQueCabe} % o más. Confírmelo en el pliego antes de decidir.`
      : dentroDeK
        ? (dentroDeTope
          ? `Consume ${(100 * crpcVal / (crpVal || 1)).toFixed(0)} % de su capacidad residual (CRPC ${cop(crpcVal)} / K ${cop(crpVal)}).`
          : `Cabe en su K (${cop(crpVal)}) pero supera su tope estratégico de ${cop(tope)}.`)
        : `La carga del proceso (CRPC ${cop(crpcVal)}) supera su capacidad residual (K ${cop(crpVal)}).`,
  };
}

/* ── P3 · caja: ¿puede financiar la obra hasta que le paguen? ────────────── */
/* LA REGLA DE FALTANTES, ESCRITA UNA SOLA VEZ. P3 tiene DOS ausencias posibles
   —la cuantía que el proceso no publica y el anticipo que el dataset no trae— y
   las dos se resuelven igual: se marca, se dice lo que no se sabe y se DEJA
   PASAR. `sin_dato_de` nombra cuál de las dos es: sin él, quien redacta el
   mensaje aguas abajo (lib/publico, lib/guia_proceso) afirmaría «el proceso no
   publica cuantía» sobre uno que sí la publica. */
function p3SinDato(cual, datos, mensaje) {
  return { pasa: true, sin_dato: true, sin_dato_de: cual, ...datos, mensaje };
}

function p3Caja(lic, perfil) {
  const cuantia = Number(lic.cuantia_cop ?? lic.precio_base) || 0;
  const patrimonio = patrimonioFinanciero(perfil);
  const anticipoPct = Math.min(Math.max(Number(lic.anticipo_pct) || 0, 0), 100);
  const anticipo = cuantia * anticipoPct / 100;
  const financiacion = Math.max(0, (cuantia - anticipo) * FRACCION_FINANCIACION);

  if (cuantia <= 0) {
    return p3SinDato("cuantia",
      { patrimonio: Math.round(patrimonio), financiacion_requerida: 0 },
      "El proceso no publica cuantía: no se puede estimar cuánto habría que financiar.");
  }

  /* EL ANTICIPO NO DECLARADO NO PUEDE CERRAR LA PUERTA (12-sep-2026).
     `anticipo_pct = 0` significaba a la vez «el pliego dice que no hay
     anticipo» y «SECOP II no publica el anticipo». Con el segundo, P3 exigía
     financiar el 20 % del valor ENTERO, cerraba, tumbaba `pasa_todas` y —con
     `solo_viables` encendido, que es el DEFAULT— la fila desaparecía de la
     lista CON EL AVISO DENTRO: el falso NEGATIVO, que en oportunidades es el
     caro. La advertencia NO se pierde (la cifra a financiar viaja igual y el
     mensaje la dice); lo que se deja de hacer es BLOQUEAR con ella.
     Un «no se pagará anticipo» SÍ es un dato declarado y sigue cerrando. */
  if (!anticipoDeclaradoEn(lic)) {
    return p3SinDato("anticipo", {
      patrimonio: Math.round(patrimonio),
      financiacion_requerida: Math.round(financiacion),
      anticipo_pct: anticipoPct,
    }, `SECOP II no publica el anticipo de este proceso. Si no hubiera ninguno, necesitaría financiar `
      + `≈ ${cop(financiacion)} antes del primer cobro y su patrimonio es ${cop(patrimonio)}. `
      + "Confirme el anticipo en el pliego antes de decidir.");
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
        + (anticipoPct === 0 ? " El pliego declara que no habrá anticipo: la obra se financia entera hasta el primer cobro." : ""),
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
  FRACCION_FINANCIACION, TIERS_SOLIDOS, TIERS_CON_ADVERTENCIA, MENSAJE_CASA_SOLO_POR_SERVICIO,
  patrimonioFinanciero,
  // expuestas para pruebas de unidad
  p1Rup, p2K, p3Caja, p4Competencia,
};
