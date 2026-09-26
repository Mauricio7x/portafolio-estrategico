/* ============================================================================
   lib/reparto · ¿Con qué porcentaje se queda el dueño en ESTE consorcio?
   ----------------------------------------------------------------------------
   El encargo (25-sep-2026): recomendar, por proceso y por socia, la
   participación que deja a Helder con el MAYOR porcentaje posible cumpliendo
   lo que se puede medir, y decir dónde se rompe («a 72/28 cumple; a 73/27
   deja de cumplir X»). La investigación de ese día (docs/PROPONENTE_PLURAL.md,
   apartados 2 a 4) dice qué ATA el reparto y qué no:

     · los indicadores financieros del pliego tipo NO dependen del reparto
       (se suman los balances, lib/perfiles.derivarPlural);
     · la CAPACIDAD DE CONTRATACIÓN sí: la experiencia de cada integrante se
       mide contra el presupuesto × SU participación (Guía CCE-EICP-GI-22,
       num. 9.2; lib/capacidad);
     · la regla de EXPERIENCIA del pliego tipo (transporte v4, num. 3.5.3 D, y
       sus iguales): uno aporta ≥ 50 % de la experiencia exigida, los demás
       ≥ 5 %, y solo uno puede no aportar nada, con participación ≤ 10 %;
     · un porcentaje MÍNIMO de participación no lo fija ningún pliego tipo, pero
       sí 21 de 241 pliegos leídos: eso solo lo dice el pliego, y lo lee
       lib/participacion (26-sep-2026, encargo C; más abajo, «LA CLÁUSULA»);
     · y los indicadores financieros SÍ dependen del reparto cuando el pliego
       pondera por participación (46 de 241): se exige que el reparto cumpla con
       las tres fórmulas (más abajo, «LOS INDICADORES»).

   NO REESCRIBE NINGUNA REGLA: la K es `lib/capacidad.crp`, la carga del
   proceso es `lib/rup.cargaK` (el mismo umbral que la puerta P2, con la banda
   del anticipo sin publicar) y el presupuesto es `lib/rup.presupuestoDe`.

   LA EXPERIENCIA SE MIDE POR ARRIBA, Y POR ESO SOLO NIEGA. Cada perfil trae
   sus siete mayores contratos del segmento 72 × porcentaje (lib/perfiles,
   `expSeg72MayoresSMMLV`). El pliego pide códigos concretos dentro del 72, así
   que esos valores son una COTA SUPERIOR de lo que cada uno puede aportar: si
   ni con ellos se llega, es imposible (seguro); si se llega, es POSIBLE y hay
   que verificar en el pliego que los contratos sean de los códigos exigidos.
   Se usan hasta siete contratos —el máximo que admite el pliego tipo con las
   condiciones Mipyme y de mujeres— para que un «imposible» no dependa de una
   condición que no se conoce.

   Función PURA (sin Redis ni red): la llaman lib/socio_por_proceso (la tarjeta,
   sin pliego leído) y lib/consorcio.recomendarReparto (con el pliego). */
"use strict";

const { SMMLV } = require("./perfiles.js");
const { crp } = require("./capacidad.js");

/* Valor mínimo a certificar del pliego tipo, en proporción del presupuesto en
   SMMLV, según cuántos contratos se aporten (obra: transporte v4 num. 3.5.1 y
   sus iguales; interventoría y consultoría: 100 %). docs/PROPONENTE_PLURAL.md,
   apartado 3.1. */
function proporcionExigida(nContratos, tipoContrato) {
  const t = String(tipoContrato || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  if (/interventor|consultor/.test(t)) return 1;
  if (/obra/.test(t)) return nContratos <= 2 ? 0.75 : nContratos <= 4 ? 1.2 : 1.5;
  return null; // otro tipo de contrato: el pliego tipo de obra no aplica y no se inventa una regla
}

const MAX_CONTRATOS = 7;
const suma = (xs, n) => xs.slice(0, n).reduce((a, x) => a + x, 0);
const lista = (p) => (Array.isArray(p && p.expSeg72MayoresSMMLV) ? p.expSeg72MayoresSMMLV.filter((v) => Number.isFinite(Number(v))).map(Number).sort((a, b) => b - a).slice(0, MAX_CONTRATOS) : null);

/* La regla 50/5/10 para DOS integrantes. `exigidaSMMLV` es la cifra del pliego
   si se leyó (un dato publicado gana a uno calculado); si no, la del pliego tipo
   según el número de contratos. Devuelve qué repartos permite:
     sin_limite       → los dos pueden aportar (uno ≥ 50 %, el otro ≥ 5 %)
     socio_hasta_10   → solo funciona si la socia no aporta: su parte ≤ 10 %
     dueno_hasta_10   → solo funciona si el dueño no aporta: su parte ≤ 10 %
     imposible        → ni con los siete mayores de cada uno se llega
     sin_dato         → falta la lista de contratos o la regla no aplica */
function reglaExperiencia({ dueno, socio, presupuestoSMMLV, exigidaSMMLV = null, tipoContrato = null }) {
  const a = lista(dueno), b = lista(socio);
  if (!a || !b) return { estado: "sin_dato", motivo: "falta la lista de los mayores contratos de alguno de los dos" };
  /* La lista es del segmento 72 (construcción). La interventoría y la
     consultoría se acreditan con otros códigos (80-81, docs/PROPONENTE_PLURAL.md,
     apartado 4) que la lista no trae: ahí la «cota superior» sería falsa y un
     «imposible» un falso negativo (revisión adversaria del 25-sep-2026). */
  const tipo = String(tipoContrato || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  if (/interventor|consultor/.test(tipo)) return { estado: "sin_dato", motivo: "la experiencia de interventoría y consultoría se acredita con otros códigos, que aquí no están medidos" };
  if (!tipo.trim()) return { estado: "sin_dato", motivo: "el proceso no dice qué tipo de contrato es" };
  if (!/obra/.test(tipo)) return { estado: "sin_dato", motivo: "el proceso no es de obra, y la regla del pliego tipo de obra no aplica" };
  if (!(presupuestoSMMLV > 0)) return { estado: "sin_dato", motivo: "el proceso no publica presupuesto" };
  let sinLimite = null, socioHasta10 = null, duenoHasta10 = null;
  for (let i = 0; i <= Math.min(MAX_CONTRATOS, a.length); i++) {
    for (let j = 0; j <= Math.min(MAX_CONTRATOS - i, b.length); j++) {
      const n = i + j;
      if (!n) continue;
      /* La cifra LEÍDA del pliego no dice con cuántos contratos se exige (el
         lector toma la primera línea con «experiencia» y salarios mínimos, que
         puede ser la fila de cinco contratos): para NEGAR se usa la menor entre
         ella y la del pliego tipo con n contratos. Así una cifra leída nunca
         produce un «imposible» que la tabla del propio pliego no produciría. */
      const tabla = proporcionExigida(n, tipoContrato) * presupuestoSMMLV;
      const req = exigidaSMMLV != null ? Math.min(exigidaSMMLV, tabla) : tabla;
      const sa = suma(a, i), sb = suma(b, j);
      if (sa + sb < req) continue;
      const caso = { contratos_dueno: i, contratos_socio: j, aporta_dueno: sa, aporta_socio: sb, exigida: req };
      if (i && j && sa >= 0.05 * req && sb >= 0.05 * req && (sa >= 0.5 * req || sb >= 0.5 * req)) sinLimite = sinLimite || caso;
      if (!j && sa >= req) socioHasta10 = socioHasta10 || caso;
      if (!i && sb >= req) duenoHasta10 = duenoHasta10 || caso;
    }
  }
  /* las TRES maneras de aportar la experiencia, cada una por separado: la
     cláusula de participación de un pliego puede descartar una y dejar otra */
  const posibles = { ambos: !!sinLimite, solo_dueno: !!socioHasta10, solo_socio: !!duenoHasta10 };
  const exigidaRef = exigidaSMMLV != null ? Math.min(exigidaSMMLV, proporcionExigida(1, tipoContrato) * presupuestoSMMLV) : proporcionExigida(1, tipoContrato) * presupuestoSMMLV;
  if (sinLimite) return { estado: "sin_limite", caso: sinLimite, posibles, exigida_de: exigidaSMMLV != null ? "pliego" : "pliego_tipo" };
  if (socioHasta10) return { estado: "socio_hasta_10", caso: socioHasta10, posibles, exigida_de: exigidaSMMLV != null ? "pliego" : "pliego_tipo" };
  if (duenoHasta10) return { estado: "dueno_hasta_10", caso: duenoHasta10, posibles, exigida_de: exigidaSMMLV != null ? "pliego" : "pliego_tipo" };
  // lo más que llegan juntos: los siete mayores de los DOS, no siete de cada uno
  const maximoJuntos = suma([...a, ...b].sort((x, y) => y - x), MAX_CONTRATOS);
  return { estado: "imposible", exigida: exigidaRef, maximo_juntos: maximoJuntos, exigida_de: exigidaSMMLV != null ? "pliego" : "pliego_tipo" };
}
const experienciaPermite = (regla, suya) => {
  if (regla.estado === "sin_limite" || regla.estado === "sin_dato") return true;
  if (regla.estado === "socio_hasta_10") return 100 - suya <= 10;
  if (regla.estado === "dueno_hasta_10") return suya <= 10;
  return false;
};

/* ── LA CLÁUSULA DE PARTICIPACIÓN DEL PLIEGO (26-sep-2026, encargo C) ──
   Las lee lib/participacion y las junta lib/documentos_proceso.participacionDe.
   Encargo del dueño: «lo importante es no quedar inhabilitado por error tuyo,
   eso jamás debería ocurrir». Aquí el error caro es el FALSO POSITIVO (recomendar
   un reparto que el pliego rechaza), así que cada duda se resuelve hacia el lado
   estricto y se dice:
     · quién aporta la experiencia sale de la regla 50/5/10 (`posibles`): los dos,
       solo el dueño (la socia ≤ 10 %) o solo la socia (el dueño ≤ 10 %). Un
       reparto vale si ALGUNA de esas maneras cumple TODAS las cláusulas;
     · si no se sabe quién puede aportar (regla sin dato), la cláusula se exige a
       LOS DOS, que es lo que la cumple con cualquier manera de aportar;
     · «quien aporte la mayor experiencia»: con los dos aportando no se sabe cuál
       aporta más, así que se exige a los dos;
     · «el de mayor participación acredita la experiencia»: ese la tiene que
       cubrir SOLO (con los dos aportando, ninguno la acredita entera);
     · «mayoritaria» sin cifra es MÁS de la mitad: 50/50 no la cumple;
     · «otro» (una sucursal en Cali, una regla que no encaja) no se aplica: va
       como aviso con su cita, y la recomendación queda por verificar. */
const umbralOk = (c, v) => (c.mayoritaria ? v > 50 : c.porcentaje == null ? true : c.estricto ? v > Number(c.porcentaje) : v >= Number(c.porcentaje));
function clausulaCumple(c, suya, conf) {
  const d = suya, so = 100 - suya;
  // conf: {dueno, socio} = aporta experiencia (true/false) o null si no se sabe
  const aportan = [conf.dueno !== false ? d : null, conf.socio !== false ? so : null].filter((x) => x != null);
  const conocido = conf.dueno != null && conf.socio != null;
  switch (c.forma) {
    case "cada_integrante": return umbralOk(c, d) && umbralOk(c, so);
    case "uno_al_menos": return umbralOk(c, Math.max(d, so));
    // «el líder con al menos el 60 %» trae cifra y manda la cifra (revisión adversaria); sin ella, más de la mitad
    case "lider_mayoria": return c.porcentaje != null && !c.mayoritaria ? umbralOk(c, Math.max(d, so)) : Math.max(d, so) > 50;
    case "aporta_experiencia": return aportan.every((v) => umbralOk(c, v));
    case "unico_aportante": return conocido && aportan.length === 2 ? true : aportan.every((v) => umbralOk(c, v));
    case "mayor_experiencia": return aportan.every((v) => umbralOk(c, v));
    case "mayor_participacion": {
      if (d === so) return false; // con 50/50 no hay «el de mayor participación»
      const mayorEsDueno = d > so;
      const cubreSolo = conocido && (mayorEsDueno ? conf.dueno && !conf.socio : conf.socio && !conf.dueno);
      return cubreSolo && umbralOk(c, Math.max(d, so));
    }
    default: return true; // «otro»: aviso con cita, no se aplica
  }
}
/* las maneras de aportar la experiencia que la regla 50/5/10 deja en ESTE reparto */
function manerasDeAportar(regla, suya) {
  const p = regla && regla.posibles;
  if (!p) return [{ dueno: null, socio: null }];
  const m = [];
  if (p.ambos) m.push({ dueno: true, socio: true });
  if (p.solo_dueno && 100 - suya <= 10) m.push({ dueno: true, socio: false });
  if (p.solo_socio && suya <= 10) m.push({ dueno: false, socio: true });
  return m;
}
/* las maneras que la experiencia permite, SIN el tope del 10 % para quien no aporta */
function manerasSinTope(regla) {
  const p = regla && regla.posibles;
  if (!p) return [{ dueno: null, socio: null }];
  return [p.ambos && { dueno: true, socio: true }, p.solo_dueno && { dueno: true, socio: false }, p.solo_socio && { dueno: false, socio: true }].filter(Boolean);
}
/* las maneras de aportar que cumplen TODAS las cláusulas en este reparto */
function manerasValidas(clausulas, regla, suya) {
  const aplicables = (clausulas || []).filter((c) => c.forma !== "otro");
  return manerasDeAportar(regla, suya).filter((conf) => aplicables.every((c) => clausulaCumple(c, suya, conf)));
}
/** La primera cláusula que ningún modo de aportar cumple con este reparto, o null. */
function clausulaQueFalla(clausulas, regla, suya) {
  const aplicables = (clausulas || []).filter((c) => c.forma !== "otro");
  if (!aplicables.length) return null;
  const maneras = manerasDeAportar(regla, suya);
  if (maneras.some((conf) => aplicables.every((c) => clausulaCumple(c, suya, conf)))) return null;
  // para el mensaje: la que falla con la manera más favorable (la primera que falla en todas)
  return aplicables.find((c) => maneras.every((conf) => !clausulaCumple(c, suya, conf))) || aplicables[0];
}

/* ── LOS INDICADORES FINANCIEROS CON LAS TRES FÓRMULAS (26-sep-2026) ──
   El pliego tipo suma los balances y ahí el reparto no mueve nada; pero 38 de
   241 pliegos ponderan los componentes y 8 los índices, y el lector acierta la
   fórmula en 131 de 140 pliegos donde afirma una (medido contra la cosecha del
   25-sep; 130 de 141 antes de la revisión adversaria): un 6 % de error que el dueño no acepta («jamás»). Por eso un reparto
   se recomienda solo si cumple con LAS TRES fórmulas, y si la del pliego tipo
   dejaría quedarse con más, se dice aparte, con la cita de lo que se leyó. Las
   cifras las calcula `lib/perfiles.derivarPlural` (la misma que el simulador) y
   las compara `lib/diff.cumpleRequisito` (la misma que la ficha del pliego). */
const METODOS_TODOS = ["suma_componentes", "componentes_ponderados", "indices_ponderados"];
function financieroCon(dueno, socio, suya, metodo) {
  const { derivarPlural } = require("./perfiles.js");
  return derivarPlural([
    { perfil: dueno, perfilId: dueno.id, participacion: suya / 100 },
    { perfil: socio, perfilId: socio.id, participacion: (100 - suya) / 100 },
  ], { metodoIndicadores: metodo });
}
/* requisitos: [{clave, titulo, campo, sentido, exige_valor}] ya con cifra del pliego */
/* `cumpleRequisito` llega de quien llama (lib/consorcio, con el de lib/diff):
   este módulo está en la cadena de lib/filtros y lib/diff arrastra apu/, que
   esa cadena no carga (la cerca de tests/e2e.js, «NO HAY CICLO DE REQUIRES») */
function juicioFinanciero(requisitos, dueno, socio, suya, metodos, cumpleRequisito) {
  const fallas = [], sinDato = [];
  for (const metodo of metodos) {
    const plural = financieroCon(dueno, socio, suya, metodo);
    for (const r of requisitos) {
      const v = cumpleRequisito({ sentido: r.sentido }, plural[r.campo], r.exige_valor);
      if (v === "no") fallas.push({ ...r, metodo, valor: plural[r.campo] });
      else if (v === "sin_dato") sinDato.push({ ...r, metodo });
    }
  }
  return { fallas, sinDato };
}

const NOMBRE_FALLA = Object.freeze({ capacidad: "la capacidad de contratación", experiencia: "la regla de experiencia", participacion: "la participación mínima del pliego", financiero: "los indicadores financieros" });
const pesos = (n) => `$${Math.round(Number(n) || 0).toLocaleString("es-CO")}`;
const salarios = (n) => `${(Math.trunc(Number(n) * 100) / 100).toLocaleString("es-CO")} salarios mínimos`;

/* La FRONTERA. Barre la parte del dueño de 99 a 1 y se queda con la mayor que
   cumple lo que se puede medir; dice qué deja de cumplirse un punto más arriba.

   `crpc` es la CARGA REAL del proceso (sin anticipo supuesto). Un reparto se fija
   antes del cierre y no se puede cambiar después (C-695 de 2026), así que no se
   recomienda con el anticipo que el proceso NO publica: el umbral generoso de la
   puerta P2 (`crpcMinimo`, que supone el anticipo máximo para no esconder un
   proceso) solo da un aviso de «si el pliego trae anticipo, podría quedarse
   con más» (revisión adversaria del 25-sep-2026: con él recomendaba 99/1 donde
   la carga real pide 58/42). */
function fronteraReparto({ dueno, socio, presupuestoCOP, crpc = null, crpcMinimo = null, exigidaSMMLV = null, tipoContrato = null, pliego = null }) {
  /* `pliego` (opcional, solo con documentos leídos): {leidos, documentos,
     clausulas, metodo} de documentos_proceso.participacionDe, más
     `financieros`: los requisitos con cifra ([{clave, titulo, campo, sentido,
     exige_valor, documento, pagina, cita}]). Sin él, la recomendación es
     PROVISIONAL y lo dice. */
  /* una cláusula sin cifra que no es «mayoritaria» ni de líder no se puede aplicar:
     va como «otro» (aviso con su cita), jamás como «al menos el null %» cumplido */
  const clausulas = pliego && Array.isArray(pliego.clausulas)
    ? pliego.clausulas.map((c) => (c.forma !== "otro" && c.forma !== "lider_mayoria" && c.porcentaje == null && !c.mayoritaria ? { ...c, forma: "otro" } : c)) : null;
  /* documentos leídos con reglas viejas que faltan por volver a leer: lo leído
     se aplica, pero la recomendación sigue PROVISIONAL (revisión adversaria: un
     pliego viejo con «ninguno < 45 %» y un estudio previo nuevo sin cláusula
     daban «no se encontró» y 99/1) */
  const sinReleer = pliego && Number(pliego.sin_releer) > 0 ? Number(pliego.sin_releer) : 0;
  const completa = clausulas != null && !sinReleer;
  const financieros = pliego && Array.isArray(pliego.financieros) ? pliego.financieros : [];
  const presupuestoSMMLV = presupuestoCOP > 0 ? presupuestoCOP / SMMLV : 0;
  const regla = reglaExperiencia({ dueno, socio, presupuestoSMMLV, exigidaSMMLV, tipoContrato });
  const kCon = (suya) => crp({ integrantes: [
    { perfil: dueno, perfilId: dueno.id, participacion: suya / 100 },
    { perfil: socio, perfilId: socio.id, participacion: (100 - suya) / 100 },
  ] }, presupuestoCOP);
  const midenK = crpc != null && presupuestoCOP > 0;
  const kSinDato = midenK && kCon(50) == null;
  const kOk = (s, umbral) => !midenK || kSinDato || kCon(s) >= umbral;
  /* un requisito financiero que falla con TODO reparto (con alguna fórmula) no
     es una restricción del reparto: ningún porcentaje lo arregla, y va aparte */
  const juez = pliego && typeof pliego.cumpleRequisito === "function" ? pliego.cumpleRequisito : null;
  // sin el juez de lib/diff no se juzga nada financiero (jamás una comparación propia)
  const reqFin = juez ? financieros.filter((r) => r && r.campo && Number.isFinite(Number(r.exige_valor))) : [];
  const finEn = (s, metodos = METODOS_TODOS) => juicioFinanciero(reqFin, dueno, socio, s, metodos, juez);
  const siempreEnRojo = [];
  for (const r of reqFin) for (const metodo of METODOS_TODOS) {
    let alguno = false;
    for (let s = 1; s <= 99 && !alguno; s++) alguno = !juicioFinanciero([r], dueno, socio, s, [metodo], juez).fallas.length;
    if (!alguno) siempreEnRojo.push({ ...r, metodo });
  }
  const esSiempre = (x) => siempreEnRojo.some((y) => y.clave === x.clave && y.metodo === x.metodo);
  /* la fórmula que el pliego DICE (una sola, sin contradicción): si con ella un
     requisito falla con todo reparto, eso no es hipotético — el consorcio no
     queda habilitado, y se dice con su cita (revisión adversaria) */
  const metodoLeido = pliego && pliego.metodo && pliego.metodo.metodo ? pliego.metodo.metodo : null;
  const rojoLeido = metodoLeido ? siempreEnRojo.filter((r) => r.metodo === metodoLeido) : [];
  const fallasEn = (s, umbral = crpc, metodos = METODOS_TODOS) => {
    const f = [];
    if (!kOk(s, umbral)) f.push({ clave: "capacidad", k: kCon(s), crpc: umbral });
    if (!experienciaPermite(regla, s)) f.push({ clave: "experiencia", regla: regla.estado });
    const c = clausulaQueFalla(clausulas, regla, s);
    if (c) {
      // ¿la cumpliría alguna manera de aportar si no existiera el tope del 10 % a quien no aporta?
      const aplicables = clausulas.filter((x) => x.forma !== "otro");
      const por10 = !!(regla && regla.posibles) && manerasSinTope(regla).some((conf) => aplicables.every((x) => clausulaCumple(x, s, conf)));
      f.push({ clave: "participacion", clausula: c, por10 });
    }
    const fin = reqFin.length ? finEn(s, metodos).fallas.filter((x) => !esSiempre(x)) : [];
    if (fin.length) f.push({ clave: "financiero", fallas: fin });
    return f;
  };
  const validos = [];
  for (let s = 99; s >= 1; s--) if (!fallasEn(s).length) validos.push(s);
  const nadaMedido = (!midenK || kSinDato) && (regla.estado === "sin_dato" || regla.estado === "sin_limite") && !(clausulas && clausulas.some((c) => c.forma !== "otro")) && !reqFin.length;
  let suya = validos.length && !(nadaMedido && regla.estado === "sin_dato") ? validos[0] : null;
  const kEnSuya = suya != null && midenK && !kSinDato ? kCon(suya) : null;
  /* ¿qué manera de aportar la experiencia supone el reparto recomendado? Si los
     dos podrían aportar pero con este reparto solo vale que aporte uno, se dice:
     a 99/1, «quien aporte experiencia ≥ 40 %» solo se cumple si la socia NO pone
     contratos (revisión adversaria) */
  let soloAporta = null;
  if (suya != null && regla.posibles && regla.posibles.ambos && clausulas && clausulas.some((c) => c.forma !== "otro")) {
    const v = manerasValidas(clausulas, regla, suya);
    if (v.length && !v.some((x) => x.dueno && x.socio)) soloAporta = v.every((x) => x.dueno && !x.socio) ? "dueno" : v.every((x) => x.socio && !x.dueno) ? "socio" : null;
  }
  const deja = suya != null && suya < 99 ? fallasEn(suya + 1) : [];
  // ¿el conjunto válido tiene huecos por debajo de la recomendada? (la K no es monótona en el reparto)
  const hueco = [];
  if (suya != null) for (let s = suya - 1; s >= 1; s--) if (fallasEn(s).length) hueco.push(s);
  // con el anticipo supuesto por la puerta P2, ¿cuánto se podría quedar?
  let suyaConAnticipo = null;
  if (midenK && !kSinDato && crpcMinimo != null && crpcMinimo < crpc) {
    for (let s = 99; s >= 1; s--) if (!fallasEn(s, crpcMinimo).length) { suyaConAnticipo = s; break; }
  }
  /* con la fórmula del pliego tipo (sin ponderar), ¿cuánto se podría quedar? */
  let suyaSinPonderar = null;
  if (reqFin.length) for (let s = 99; s >= 1; s--) if (!fallasEn(s, crpc, ["suma_componentes"]).length) { suyaSinPonderar = s; break; }
  const unos = [...Array(99).keys()].map((x) => x + 1);
  /* ¿qué familia de reglas NO se cumple con NINGÚN reparto, por sí sola? */
  const familiaImposible = suya != null ? null
    : clausulas && unos.every((x) => clausulaQueFalla(clausulas, regla, x)) && regla.estado !== "imposible" ? "participacion"
      : reqFin.length && unos.every((x) => finEn(x).fallas.some((y) => !esSiempre(y))) ? "financiero" : null;
  const familias = suya == null ? [...new Set(unos.flatMap((x) => fallasEn(x).map((y) => y.clave)))] : [];
  const choque = suya == null && validos.length === 0 && regla.estado !== "imposible" && !familiaImposible
    && unos.some((x) => kOk(x, crpc)) && unos.some((x) => experienciaPermite(regla, x));
  return {
    suya_maxima: suya,
    del_socio: suya == null ? null : 100 - suya,
    capacidad: midenK ? { crpc, crpc_con_anticipo_supuesto: crpcMinimo, k_en_la_recomendada: kEnSuya, k_sin_dato: kSinDato } : { crpc: null, motivo: "sin presupuesto no hay capacidad que medir" },
    experiencia: regla,
    deja_en: suya != null && suya < 99 ? { suya: suya + 1, del_socio: 99 - suya, por: deja } : null,
    participacion: clausulas == null ? { leida: false } : { leida: completa, documentos_leidos: pliego.leidos || 0, sin_releer: sinReleer, clausulas, solo_aporta: soloAporta },
    financiero: reqFin.length ? { metodos: METODOS_TODOS, metodo_leido: pliego && pliego.metodo ? pliego.metodo : null, en_rojo_con_cualquier_reparto: siempreEnRojo, en_rojo_con_la_formula_del_pliego: rojoLeido, suya_sin_ponderar: suyaSinPonderar } : null,
    frase: fraseFrontera({ suya, deja, regla, socio, kEnSuya, crpc, midenK, choque, nadaMedido, validos, familiaImposible, clausulas, primeraFallaCon: (x) => fallasEn(x), familias, rojoLeido, metodoLeido: pliego ? pliego.metodo : null }),
    avisos: avisosDe({ regla, midenK, kSinDato, hueco, suya, suyaConAnticipo, pliego, clausulas, suyaSinPonderar, completa, sinReleer, soloAporta, socio,
      sinDatoFin: suya != null && reqFin.length ? finEn(suya).sinDato : [],
      financiero: reqFin.length ? { metodo_leido: pliego && pliego.metodo ? pliego.metodo : null, en_rojo_con_cualquier_reparto: siempreEnRojo, rojoLeido } : null }),
  };
}

/* Lo que la frontera NO puede medir, dicho siempre junto a ella: un reparto
   recomendado sin estas dos frases sería un «sí cumple» que nadie verificó. */
const AVISO_MINIMO = "El pliego tipo no fija un porcentaje mínimo de participación, pero algunos pliegos sí (21 de 241 leídos, del 10 % al 70 %; el más común, 30 %): léalo antes de acordar el reparto.";
const AVISO_CODIGOS = "La experiencia se midió con los siete mayores contratos de construcción de cada uno: verifique en el pliego que los que aporte cada uno sean de los códigos que pide.";
const AVISO_PROVISIONAL = "Recomendación provisional: la aplicación todavía no ha leído en los documentos de este proceso lo que dicen del consorcio (un mínimo de participación, la fórmula de los indicadores), y eso puede cambiar el reparto.";
const METODO_LLANO = Object.freeze({ suma_componentes: "sumando los balances de los dos", componentes_ponderados: "ponderando cada componente por la participación", indices_ponderados: "ponderando los índices por la participación" });
const dondeDe = (x) => `${x.documento ? `el documento «${x.documento}»` : "el pliego"}${x.pagina != null ? `, pág. ${x.pagina}` : ""}`;
const mayus = (t) => t.charAt(0).toUpperCase() + t.slice(1);
const minus = (t) => t.charAt(0).toLowerCase() + t.slice(1).replace(/\.$/, "");
const citaCorta = (t) => { const c = String(t || "").replace(/\s+/g, " ").trim(); return c.length > 220 ? `${c.slice(0, 220).replace(/\s+\S*$/, "")}…` : c; };
/* [95, 94, …, 81, 60, …, 49] → «49 a 60 % y 81 a 95 %» */
function tramos(lista) {
  const xs = [...lista].sort((a, b) => a - b);
  const t = [];
  for (const x of xs) { const u = t[t.length - 1]; if (u && x === u[1] + 1) u[1] = x; else t.push([x, x]); }
  const f = t.map(([a, b]) => (a === b ? `${a} %` : `${a} a ${b} %`));
  return f.length > 1 ? `${f.slice(0, -1).join(", ")} y ${f[f.length - 1]}` : f[0];
}
function avisosDe({ regla, midenK = true, kSinDato = false, hueco = [], suya = null, suyaConAnticipo = null, pliego = null, clausulas = null, suyaSinPonderar = null, financiero = null, completa = false, sinReleer = 0, soloAporta = null, socio = null, sinDatoFin = [] }) {
  const { fraseClausula } = require("./participacion.js");
  const a = [];
  if (clausulas == null) a.push(AVISO_PROVISIONAL, AVISO_MINIMO);
  else if (!completa) a.push(`Recomendación provisional: ${sinReleer === 1 ? "falta volver a leer 1 documento" : `faltan por volver a leer ${sinReleer} documentos`} del proceso con las reglas nuevas, y puede traer un mínimo de participación; mientras tanto se aplica lo que ya se leyó.`);
  if (clausulas == null) { /* ya dicho */ }
  else if (!clausulas.length) {
    if (!completa) { /* no se puede decir «no se encontró»: falta leer */ } else {
    const n = pliego.leidos || 0;
    a.push(`La aplicación leyó ${n} ${n === 1 ? "documento" : "documentos"} del proceso y no encontró un porcentaje mínimo de participación. Si el pliego lo trae en una tabla o en una imagen, la aplicación no lo ve: confírmelo en el capítulo del proponente plural antes de firmar el acuerdo.`);
    }
  } else {
    for (const c of clausulas) {
      a.push(c.forma === "otro"
        ? `${mayus(dondeDe(c))} trae una condición sobre la participación que la aplicación no sabe aplicar, y este reparto NO la tuvo en cuenta: léala antes de acordarlo («${citaCorta(c.cita)}»).`
        : suya != null ? `Esta recomendación ya cumple lo que exige ${dondeDe(c)}: ${minus(fraseClausula(c))}.` : `Lo que exige ${dondeDe(c)}: ${minus(fraseClausula(c))}.`);
    }
  }
  if (soloAporta && socio) {
    a.push(soloAporta === "dueno"
      ? `Ojo: con este reparto la experiencia la tiene que aportar usted solo. Si ${socio.nombre} pone contratos de experiencia, deja de cumplir lo que exige el pliego sobre la participación; si ella tiene que aportar, su parte tiene que subir.`
      : `Ojo: con este reparto la experiencia la tiene que aportar ${socio.nombre} sola. Si usted pone contratos de experiencia, deja de cumplir lo que exige el pliego sobre la participación.`);
  }
  if (financiero) {
    const leido = financiero.metodo_leido;
    const leidoPondera = !!(leido && leido.metodo && leido.metodo !== "suma_componentes");
    // si el pliego DICE que pondera, no se invita a subir con la fórmula del pliego tipo
    const conPliegoTipo = !leidoPondera && suyaSinPonderar != null && (suya == null || suyaSinPonderar > suya);
    if (conPliegoTipo) {
      const donde = leido && leido.metodo === "suma_componentes" ? ` Lo leído en ${dondeDe(leido)} parece sumar los balances: si lo confirma en el capítulo financiero del pliego, puede subir hasta el ${suyaSinPonderar} %.` : " Confirme en el capítulo financiero del pliego qué fórmula usa antes de subir.";
      a.push(`Con la fórmula del pliego tipo (${METODO_LLANO.suma_componentes}) podría quedarse hasta con el ${suyaSinPonderar} %. Se recomienda ${suya == null ? "no ir" : "menos"} porque con las fórmulas que ponderan por la participación no se cumplen los indicadores del pliego, y cuando la aplicación cree leer la fórmula de un pliego se equivoca en 9 de cada 140.${donde}`);
    }
    const ponderadasRojas = financiero.en_rojo_con_cualquier_reparto.filter((r) => r.metodo !== "suma_componentes" && !financiero.en_rojo_con_cualquier_reparto.some((y) => y.clave === r.clave && y.metodo === "suma_componentes"));
    const titulos = [...new Set(ponderadasRojas.map((r) => minus(r.titulo)))];
    if (titulos.length && !leidoPondera) a.push(`Si el pliego pondera por la participación, ${titulos.join(" y ")} no ${titulos.length > 1 ? "se cumplen" : "se cumple"} con ningún reparto: confirme en el capítulo financiero del pliego qué fórmula usa.`);
  }
  // sin dato ≠ cumple: lo que no se pudo verificar se dice
  const sinVerificar = [...new Set((sinDatoFin || []).map((r) => minus(r.titulo)))];
  if (sinVerificar.length) a.push(`No se pudo verificar ${sinVerificar.join(" ni ")} con todas las fórmulas: a alguno de los dos le falta el balance en el registro. Verifíquelo antes de acordar el reparto.`);
  if (regla.estado === "sin_limite" || regla.estado === "socio_hasta_10" || regla.estado === "dueno_hasta_10") a.push(AVISO_CODIGOS);
  if (regla.estado === "sin_dato") a.push(`La regla de experiencia del pliego tipo no se pudo medir: ${regla.motivo}.`);
  if (!midenK) a.push("La capacidad de contratación no se pudo medir: el proceso no publica presupuesto.");
  else if (kSinDato) a.push("La capacidad de contratación no se pudo medir: al registro de alguno de los dos le falta un dato (por ejemplo, el valor total de sus contratos de construcción).");
  if (hueco.length) a.push(`Ojo: no todo reparto por debajo sirve. Con una parte suya de ${tramos(hueco)} no se cumple lo que se midió.`);
  if (suyaConAnticipo != null && suya != null && suyaConAnticipo > suya) a.push(`El proceso no publica si hay anticipo. Esta recomendación supone que no hay; si el pliego da anticipo, la carga baja y podría quedarse con más (hasta el ${suyaConAnticipo} % con el anticipo más alto que se ve en los pliegos).`);
  return a;
}

function fraseFrontera({ suya, deja, regla, socio, kEnSuya, crpc, midenK, choque = false, nadaMedido = false, familiaImposible = null, clausulas = null, primeraFallaCon = null, familias = [], rojoLeido = [], metodoLeido = null }) {
  const nombre = socio.nombre;
  const { fraseClausula } = require("./participacion.js");
  const quien = regla.exigida_de === "pliego" ? "el pliego pide" : "el pliego tipo pide";
  if (suya == null) {
    if (nadaMedido) return `Con ${nombre} no hay nada medible para recomendar un reparto: ${regla.motivo || "falta el presupuesto del proceso"}.`;
    if (regla.estado === "imposible") {
      return regla.maximo_juntos < regla.exigida
        ? `Con ${nombre} no alcanza la experiencia con ningún reparto: con los siete mayores contratos de construcción de los dos juntos llegan como mucho a ${salarios(regla.maximo_juntos)} y ${quien} ${salarios(regla.exigida)}.`
        : `Con ${nombre} no hay forma de repartir la experiencia como pide el pliego tipo (uno con la mitad o más de lo exigido y el otro con al menos el 5 %) con hasta siete contratos entre los dos.`;
    }
    if (familiaImposible === "participacion") {
      const c = clausulaQueFalla(clausulas, regla, 50) || clausulas.find((x) => x.forma !== "otro");
      const sola = [...Array(99).keys()].every((x) => clausulaQueFalla(clausulas, { posibles: { ambos: true, solo_dueno: true, solo_socio: true } }, x + 1));
      if (!sola && regla.estado === "sin_dato") return `Con ${nombre}, sin saber quién aporta la experiencia (${regla.motivo}), ningún reparto asegura lo que exige ${dondeDe(c)}: ${minus(fraseClausula(c))}.`;
      return `Con ${nombre} ningún reparto cumple ${sola ? "" : "a la vez la regla de experiencia y "}lo que exige ${dondeDe(c)}: ${minus(fraseClausula(c))}.`;
    }
    if (familiaImposible === "financiero") {
      const f = (primeraFallaCon ? primeraFallaCon(50) : []).find((x) => x.clave === "financiero");
      const t = f ? [...new Set(f.fallas.map((x) => x.titulo))].join(" y ") : "los indicadores financieros";
      return `Con ${nombre} ningún reparto cumple ${t} con las tres fórmulas que usan los pliegos para un consorcio.`;
    }
    if (choque && (clausulas && clausulas.some((c) => c.forma !== "otro") || familias.includes("financiero"))) {
      const cl = (clausulas || []).find((c) => c.forma !== "otro");
      const nombres = familias.map((k) => (k === "participacion" && cl ? `lo que exige ${dondeDe(cl)} (${minus(fraseClausula(cl))})` : NOMBRE_FALLA[k]));
      return `Con ${nombre} no hay un reparto que cumpla a la vez ${nombres.slice(0, -1).join(", ")}${nombres.length > 1 ? " y " : ""}${nombres[nombres.length - 1]}.`;
    }
    if (choque) {
      return regla.estado === "socio_hasta_10"
        ? `Con ${nombre} chocan dos reglas: para la capacidad de contratación ${nombre} necesita más del 10 %, pero como no llega al 5 % de la experiencia exigida no puede pasar del 10 %.`
        : `Con ${nombre} chocan dos reglas: para la capacidad de contratación usted necesita más del 10 %, pero como no llega al 5 % de la experiencia exigida no puede pasar del 10 %.`;
    }
    return `Con ${nombre} ningún reparto alcanza la capacidad de contratación que pide este proceso (${pesos(crpc)}).`;
  }
  const partes = [`Puede quedarse hasta con el ${suya} % (${suya}/${100 - suya}).`];
  if (deja.length) {
    const porque = deja.map((d) => d.clave === "capacidad"
      ? `la capacidad de contratación (${pesos(d.k)} frente a ${pesos(d.crpc)} que pide el proceso)`
      : d.clave === "participacion" ? (d.por10
        ? `la regla de experiencia (quien no aporta experiencia no puede pasar del 10 %) junto con lo que exige ${dondeDe(d.clausula)}: ${minus(fraseClausula(d.clausula))}`
        : `lo que exige ${dondeDe(d.clausula)}: ${minus(fraseClausula(d.clausula))}`)
        : d.clave === "financiero" ? `${[...new Set(d.fallas.map((x) => minus(x.titulo)))].join(" y ")} ${d.fallas.every((x) => x.metodo !== "suma_componentes") ? "si el pliego pondera por la participación" : `con la fórmula ${[...new Set(d.fallas.map((x) => METODO_LLANO[x.metodo]))].join(" o ")}`}`
          : regla.estado === "socio_hasta_10" ? `la regla de experiencia: ${nombre} no llega al 5 % de la experiencia exigida, así que no puede tener más del 10 %`
            : "la regla de experiencia").join(" y ");
    partes.push(`A ${suya + 1}/${99 - suya} deja de cumplir ${porque}.`);
  }
  if (midenK && kEnSuya != null) partes.push(`Con ${suya}/${100 - suya} la capacidad juntos es ${pesos(kEnSuya)}.`);
  if (regla.estado === "dueno_hasta_10") partes.push(`Ojo: usted no llega al 5 % de la experiencia exigida, y quien no aporta experiencia no puede pasar del 10 %.`);
  if (rojoLeido.length) {
    const t = [...new Set(rojoLeido.map((r) => minus(r.titulo)))];
    partes.push(`Pero con la fórmula que trae el pliego (${metodoLeido ? dondeDe(metodoLeido) : "el pliego"}: ${METODO_LLANO[rojoLeido[0].metodo]}), ${t.join(" y ")} no ${t.length > 1 ? "se cumplen" : "se cumple"} con ningún reparto: así el consorcio no queda habilitado.`);
  }
  return partes.join(" ");
}

/* ¿Alcanza la capacidad con ALGÚN reparto? La K del plural no es monótona en
   el reparto (revisión adversaria: Helder + PICS ante 12.000 M cumplía de 1 a 47
   y de 54 a 94, y no a 50/50), así que juzgarla solo al 50/50 escondía procesos
   que sí se alcanzan. `crpc` aquí es el umbral de la PUERTA (no esconder);
   el reparto recomendado usa la carga real. true | false | null (sin dato). */
function capacidadEnAlgunReparto({ dueno, socio, presupuestoCOP, crpc }) {
  if (!(presupuestoCOP > 0) || crpc == null) return null;
  for (let s = 1; s <= 99; s++) {
    const k = crp({ integrantes: [
      { perfil: dueno, perfilId: dueno.id, participacion: s / 100 },
      { perfil: socio, perfilId: socio.id, participacion: (100 - s) / 100 },
    ] }, presupuestoCOP);
    if (k == null) return null;
    if (k >= crpc) return true;
  }
  return false;
}

module.exports = { fronteraReparto, capacidadEnAlgunReparto, reglaExperiencia, proporcionExigida, clausulaQueFalla, METODOS_TODOS, MAX_CONTRATOS, AVISO_MINIMO, AVISO_CODIGOS, AVISO_PROVISIONAL };
