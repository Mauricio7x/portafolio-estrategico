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
  if (exigidaSMMLV == null && (!(presupuestoSMMLV > 0) || proporcionExigida(1, tipoContrato) == null)) {
    return { estado: "sin_dato", motivo: presupuestoSMMLV > 0 ? "el tipo de contrato no es obra, interventoría ni consultoría: la regla del pliego tipo de obra no aplica" : "el proceso no publica presupuesto" };
  }
  let sinLimite = null, socioHasta10 = null, duenoHasta10 = null;
  for (let i = 0; i <= Math.min(MAX_CONTRATOS, a.length); i++) {
    for (let j = 0; j <= Math.min(MAX_CONTRATOS - i, b.length); j++) {
      const n = i + j;
      if (!n) continue;
      const req = exigidaSMMLV != null ? exigidaSMMLV : proporcionExigida(n, tipoContrato) * presupuestoSMMLV;
      const sa = suma(a, i), sb = suma(b, j);
      if (sa + sb < req) continue;
      const caso = { contratos_dueno: i, contratos_socio: j, aporta_dueno: sa, aporta_socio: sb, exigida: req };
      if (i && j && sa >= 0.05 * req && sb >= 0.05 * req && (sa >= 0.5 * req || sb >= 0.5 * req)) sinLimite = sinLimite || caso;
      if (!j && sa >= req) socioHasta10 = socioHasta10 || caso;
      if (!i && sb >= req) duenoHasta10 = duenoHasta10 || caso;
    }
  }
  const exigidaRef = exigidaSMMLV != null ? exigidaSMMLV : proporcionExigida(5, tipoContrato) * presupuestoSMMLV;
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
   `crpc` es el umbral de la puerta P2 (`cargaK(...).crpc_minimo`). */
function fronteraReparto({ dueno, socio, presupuestoCOP, crpc = null, exigidaSMMLV = null, tipoContrato = null }) {
  const presupuestoSMMLV = presupuestoCOP > 0 ? presupuestoCOP / SMMLV : 0;
  const regla = reglaExperiencia({ dueno, socio, presupuestoSMMLV, exigidaSMMLV, tipoContrato });
  const kCon = (suya) => crp({ integrantes: [
    { perfil: dueno, perfilId: dueno.id, participacion: suya / 100 },
    { perfil: socio, perfilId: socio.id, participacion: (100 - suya) / 100 },
  ] }, presupuestoCOP);
  const midenK = crpc != null && presupuestoCOP > 0;
  const fallasEn = (suya) => {
    const f = [];
    if (midenK) {
      const k = kCon(suya);
      if (k != null && k < crpc) f.push({ clave: "capacidad", k, crpc });
    }
    if (!experienciaPermite(regla, suya)) f.push({ clave: "experiencia", regla: regla.estado });
    return f;
  };
  let suya = null;
  for (let s = 99; s >= 1; s--) { if (!fallasEn(s).length) { suya = s; break; } }
  const kEnSuya = suya != null && midenK ? kCon(suya) : null;
  const deja = suya != null && suya < 99 ? fallasEn(suya + 1) : [];
  return {
    suya_maxima: suya,
    del_socio: suya == null ? null : 100 - suya,
    capacidad: midenK ? { crpc, k_en_la_recomendada: kEnSuya, k_sin_dato: midenK && kCon(50) == null } : { crpc: null, motivo: "sin presupuesto no hay capacidad que medir" },
    experiencia: regla,
    deja_en: suya != null && suya < 99 ? { suya: suya + 1, del_socio: 99 - suya, por: deja } : null,
    frase: fraseFrontera({ suya, deja, regla, socio, kEnSuya, crpc, midenK }),
    avisos: avisosDe({ regla, pliegoLeido: exigidaSMMLV != null }),
  };
}

/* Lo que la frontera NO puede medir, dicho siempre junto a ella: un reparto
   recomendado sin estas dos frases sería un «sí cumple» que nadie verificó. */
const AVISO_MINIMO = "El pliego tipo no fija un porcentaje mínimo de participación, pero algunos pliegos sí (21 de 241 leídos, del 10 % al 70 %; el más común, 30 %): léalo antes de acordar el reparto.";
const AVISO_CODIGOS = "La experiencia se midió con los siete mayores contratos de construcción de cada uno: verifique en el pliego que los que aporte cada uno sean de los códigos que pide.";
function avisosDe({ regla }) {
  const a = [AVISO_MINIMO];
  if (regla.estado === "sin_limite" || regla.estado === "socio_hasta_10" || regla.estado === "dueno_hasta_10") a.push(AVISO_CODIGOS);
  if (regla.estado === "sin_dato") a.push(`La regla de experiencia del pliego tipo no se pudo medir: ${regla.motivo}.`);
  return a;
}

function fraseFrontera({ suya, deja, regla, socio, kEnSuya, crpc, midenK }) {
  const nombre = socio.nombre;
  if (suya == null) {
    if (regla.estado === "imposible") {
      return `Con ${nombre} no alcanza la experiencia con ningún reparto: con los siete mayores contratos de construcción de los dos juntos llegan como mucho a ${salarios(regla.maximo_juntos)} y el pliego tipo pide ${salarios(regla.exigida)}.`;
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

module.exports = { fronteraReparto, reglaExperiencia, proporcionExigida, MAX_CONTRATOS, AVISO_MINIMO, AVISO_CODIGOS };
