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
       sí 21 de 241 pliegos leídos: eso solo lo dice el pliego (pendiente C).

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
  const exigidaRef = exigidaSMMLV != null ? Math.min(exigidaSMMLV, proporcionExigida(1, tipoContrato) * presupuestoSMMLV) : proporcionExigida(1, tipoContrato) * presupuestoSMMLV;
  if (sinLimite) return { estado: "sin_limite", caso: sinLimite, exigida_de: exigidaSMMLV != null ? "pliego" : "pliego_tipo" };
  if (socioHasta10) return { estado: "socio_hasta_10", caso: socioHasta10, exigida_de: exigidaSMMLV != null ? "pliego" : "pliego_tipo" };
  if (duenoHasta10) return { estado: "dueno_hasta_10", caso: duenoHasta10, exigida_de: exigidaSMMLV != null ? "pliego" : "pliego_tipo" };
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
function fronteraReparto({ dueno, socio, presupuestoCOP, crpc = null, crpcMinimo = null, exigidaSMMLV = null, tipoContrato = null }) {
  const presupuestoSMMLV = presupuestoCOP > 0 ? presupuestoCOP / SMMLV : 0;
  const regla = reglaExperiencia({ dueno, socio, presupuestoSMMLV, exigidaSMMLV, tipoContrato });
  const kCon = (suya) => crp({ integrantes: [
    { perfil: dueno, perfilId: dueno.id, participacion: suya / 100 },
    { perfil: socio, perfilId: socio.id, participacion: (100 - suya) / 100 },
  ] }, presupuestoCOP);
  const midenK = crpc != null && presupuestoCOP > 0;
  const kSinDato = midenK && kCon(50) == null;
  const kOk = (s, umbral) => !midenK || kSinDato || kCon(s) >= umbral;
  const fallasEn = (s, umbral = crpc) => {
    const f = [];
    if (!kOk(s, umbral)) f.push({ clave: "capacidad", k: kCon(s), crpc: umbral });
    if (!experienciaPermite(regla, s)) f.push({ clave: "experiencia", regla: regla.estado });
    return f;
  };
  const validos = [];
  for (let s = 99; s >= 1; s--) if (!fallasEn(s).length) validos.push(s);
  const nadaMedido = (!midenK || kSinDato) && (regla.estado === "sin_dato" || regla.estado === "sin_limite");
  let suya = validos.length && !(nadaMedido && regla.estado === "sin_dato") ? validos[0] : null;
  const kEnSuya = suya != null && midenK && !kSinDato ? kCon(suya) : null;
  const deja = suya != null && suya < 99 ? fallasEn(suya + 1) : [];
  // ¿el conjunto válido tiene huecos por debajo de la recomendada? (la K no es monótona en el reparto)
  const hueco = [];
  if (suya != null) for (let s = suya - 1; s >= 1; s--) if (fallasEn(s).length) hueco.push(s);
  // con el anticipo supuesto por la puerta P2, ¿cuánto se podría quedar?
  let suyaConAnticipo = null;
  if (midenK && !kSinDato && crpcMinimo != null && crpcMinimo < crpc) {
    for (let s = 99; s >= 1; s--) if (!fallasEn(s, crpcMinimo).length) { suyaConAnticipo = s; break; }
  }
  const choque = suya == null && validos.length === 0 && regla.estado !== "imposible"
    && [...Array(99).keys()].some((x) => kOk(x + 1, crpc)) && [...Array(99).keys()].some((x) => experienciaPermite(regla, x + 1));
  return {
    suya_maxima: suya,
    del_socio: suya == null ? null : 100 - suya,
    capacidad: midenK ? { crpc, crpc_con_anticipo_supuesto: crpcMinimo, k_en_la_recomendada: kEnSuya, k_sin_dato: kSinDato } : { crpc: null, motivo: "sin presupuesto no hay capacidad que medir" },
    experiencia: regla,
    deja_en: suya != null && suya < 99 ? { suya: suya + 1, del_socio: 99 - suya, por: deja } : null,
    frase: fraseFrontera({ suya, deja, regla, socio, kEnSuya, crpc, midenK, choque, nadaMedido, validos }),
    avisos: avisosDe({ regla, midenK, kSinDato, hueco, suya, suyaConAnticipo }),
  };
}

/* Lo que la frontera NO puede medir, dicho siempre junto a ella: un reparto
   recomendado sin estas dos frases sería un «sí cumple» que nadie verificó. */
const AVISO_MINIMO = "El pliego tipo no fija un porcentaje mínimo de participación, pero algunos pliegos sí (21 de 241 leídos, del 10 % al 70 %; el más común, 30 %): léalo antes de acordar el reparto.";
const AVISO_CODIGOS = "La experiencia se midió con los siete mayores contratos de construcción de cada uno: verifique en el pliego que los que aporte cada uno sean de los códigos que pide.";
/* [95, 94, …, 81, 60, …, 49] → «49 a 60 % y 81 a 95 %» */
function tramos(lista) {
  const xs = [...lista].sort((a, b) => a - b);
  const t = [];
  for (const x of xs) { const u = t[t.length - 1]; if (u && x === u[1] + 1) u[1] = x; else t.push([x, x]); }
  const f = t.map(([a, b]) => (a === b ? `${a} %` : `${a} a ${b} %`));
  return f.length > 1 ? `${f.slice(0, -1).join(", ")} y ${f[f.length - 1]}` : f[0];
}
function avisosDe({ regla, midenK = true, kSinDato = false, hueco = [], suya = null, suyaConAnticipo = null }) {
  const a = [AVISO_MINIMO];
  if (regla.estado === "sin_limite" || regla.estado === "socio_hasta_10" || regla.estado === "dueno_hasta_10") a.push(AVISO_CODIGOS);
  if (regla.estado === "sin_dato") a.push(`La regla de experiencia del pliego tipo no se pudo medir: ${regla.motivo}.`);
  if (!midenK) a.push("La capacidad de contratación no se pudo medir: el proceso no publica presupuesto.");
  else if (kSinDato) a.push("La capacidad de contratación no se pudo medir: al registro de alguno de los dos le falta un dato (por ejemplo, el valor total de sus contratos de construcción).");
  if (hueco.length) a.push(`Ojo: no todo reparto por debajo sirve. Con una parte suya de ${tramos(hueco)} no se cumple lo que se midió.`);
  if (suyaConAnticipo != null && suya != null && suyaConAnticipo > suya) a.push(`El proceso no publica si hay anticipo. Esta recomendación supone que no hay; si el pliego da anticipo, la carga baja y podría quedarse con más (hasta el ${suyaConAnticipo} % con el anticipo más alto que se ve en los pliegos).`);
  return a;
}

function fraseFrontera({ suya, deja, regla, socio, kEnSuya, crpc, midenK, choque = false, nadaMedido = false }) {
  const nombre = socio.nombre;
  const quien = regla.exigida_de === "pliego" ? "el pliego pide" : "el pliego tipo pide";
  if (suya == null) {
    if (nadaMedido) return `Con ${nombre} no hay nada medible para recomendar un reparto: ${regla.motivo || "falta el presupuesto del proceso"}.`;
    if (regla.estado === "imposible") {
      return regla.maximo_juntos < regla.exigida
        ? `Con ${nombre} no alcanza la experiencia con ningún reparto: con los siete mayores contratos de construcción de los dos juntos llegan como mucho a ${salarios(regla.maximo_juntos)} y ${quien} ${salarios(regla.exigida)}.`
        : `Con ${nombre} no hay forma de repartir la experiencia como pide el pliego tipo (uno con la mitad o más de lo exigido y el otro con al menos el 5 %) con hasta siete contratos entre los dos.`;
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
      : regla.estado === "socio_hasta_10" ? `la regla de experiencia: ${nombre} no llega al 5 % de la experiencia exigida, así que no puede tener más del 10 %`
        : "la regla de experiencia").join(" y ");
    partes.push(`A ${suya + 1}/${99 - suya} deja de cumplir ${porque}.`);
  }
  if (midenK && kEnSuya != null) partes.push(`Con ${suya}/${100 - suya} la capacidad juntos es ${pesos(kEnSuya)}.`);
  if (regla.estado === "dueno_hasta_10") partes.push(`Ojo: usted no llega al 5 % de la experiencia exigida, y quien no aporta experiencia no puede pasar del 10 %.`);
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

module.exports = { fronteraReparto, capacidadEnAlgunReparto, reglaExperiencia, proporcionExigida, MAX_CONTRATOS, AVISO_MINIMO, AVISO_CODIGOS };
