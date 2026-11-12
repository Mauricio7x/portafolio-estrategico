"use strict";
/* ============================================================================
   lib/causales_rechazo · Las causales de rechazo de ESE pliego, y cuáles revisa la aplicación antes de radicar
   ----------------------------------------------------------------------------
   PLAN_X20, tanda 6 (12-nov-2026). PURO: sin red ni Redis. El documento tipo (DocBase de menor cuantía V3, numeral
   1.15, leído el 11-nov-2026 del paquete oficial de Colombia Compra) enumera las causales y dice que «Las entidades no
   podrán incluir causales de rechazo distintas a las señaladas»; cada pliego trae su lista, con las de corchete que
   aplican según la forma de pago o la convocatoria. Este módulo:
   · separa la lista del pliego en causales (una por renglón o por letra, uniendo los renglones partidos), sin las
     instrucciones de la plantilla entre corchetes;
   · a cada una le dice DÓNDE la revisa la aplicación (si la revisa) o que la comprueba usted; no juzga si la oferta
     la cumple: eso lo hacen «Revisar antes de subir», Precios y la guía, cada uno con su regla.
   Lo que no se reconoce va como «compruébela usted»: nunca se da por revisada una causal que nadie mira.
   ============================================================================ */

const plegar = (s) => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/* Dónde la revisa la aplicación, por lo que dice la causal (el primer patrón que casa). */
const DONDE = Object.freeze([
  { clave: "presupuesto", re: /exceda\s+el\s+presupuesto|supere\s+el\s+presupuesto/, revisa: "«Revisar antes de subir» compara su total con el presupuesto oficial" },
  { clave: "formulario", re: /formulario\s+1|items?,?\s+la\s+descripcion|unidades\s+o\s+cantidades/, revisa: "«Revisar antes de subir» compara ítems, unidades y cantidades con el Formulario 1" },
  { clave: "unitario_cero", re: /precio\s+unitario\s+u\s+ofrecerlo\s+en\s+cero|valor\s+de\s+un\s+precio\s+unitario/, revisa: "«Revisar antes de subir» avisa un ítem sin precio" },
  { clave: "unitario_tope", re: /superar\s+el\s+valor\s+unitario/, revisa: "«Revisar antes de subir» compara cada unitario con el oficial cuando se conoce la base" },
  { clave: "aiu", re: /\baiu\b/, revisa: "«Revisar antes de subir» compara su AIU con el tope que usted escriba" },
  { clave: "secop", re: /discrepancias?\s+entre\s+el\s+formulario|mas\s+de\s+una\s+oferta\s+economica/, revisa: "«Revisar antes de subir» compara el total con el que usted escribe para SECOP II" },
  { clave: "artificialmente_bajo", re: /artificialmente\s+bajo/, revisa: "Precios dice su mínimo y el umbral de precio artificialmente bajo" },
  { clave: "garantia", re: /garantia\s+de\s+seriedad/, revisa: "«Lo que tiene que entregar» lista la garantía de seriedad con su porcentaje" },
  { clave: "manifestacion", re: /manifestacion\s+de\s+interes|manifestaron\s+interes|manifiesta\s+interes/, revisa: null, usted: "avise que le interesa a tiempo y con la MISMA estructura (solo o en consorcio, y con quién) con que va a ofertar" },
  { clave: "doble_propuesta", re: /mas\s+de\s+una\s+propuesta/, revisa: null, usted: "no se presente con dos consorcios suyos al mismo proceso" },
  { clave: "contratos_ejecucion", re: /contratos\s+que\s+el\s+proponente\s+tenga\s+en\s+ejecucion|capacidad\s+residual/, revisa: null, usted: "informe TODOS los contratos en ejecución en el formato de capacidad residual" },
  { clave: "plazo", re: /plazo\s+superior/, revisa: null, usted: "no ofrezca un plazo mayor que el del anexo técnico" },
  { clave: "mipyme", re: /mipyme/, revisa: "La guía dice si la convocatoria quedó limitada a Mipyme", usted: "entregue el certificado del registro vigente y en firme con la oferta" },
  { clave: "rup", re: /registro\s+unico\s+de\s+proponentes|\brup\b/, revisa: null, usted: "tenga el registro de proponente en firme y renovado antes del cierre" },
  { clave: "extemporanea", re: /extemporane/, revisa: null, usted: "presente la oferta el día anterior al cierre: guardarla no basta" },
  { clave: "subsanar", re: /subsanar/, revisa: null, usted: "responda cada solicitud de subsanación dentro del plazo" },
]);

/* Las causales del texto: [{texto, pagina, clave, revisa, usted}] o [] si no hay sección. Toma la PRIMERA sección
   «CAUSALES DE RECHAZO» que no sea una línea de índice, hasta «CAUSALES PARA DECLARAR DESIERTO» o la siguiente sección. */
function leerCausales(texto) {
  const lineas = [];
  let pagina = null;
  for (const cruda of String(texto || "").replace(/\r\n?/g, "\n").split("\n")) {
    const m = cruda.match(/^[ \t]*\f(\d*)[ \t]*$/);
    if (m) { pagina = m[1] ? Number(m[1]) : (pagina == null ? 1 : pagina + 1); continue; }
    const l = cruda.replace(/\f/g, "").replace(/\s+/g, " ").trim();
    if (l) lineas.push({ l, pagina });
  }
  const ini = lineas.findIndex((x) => /^(?:\d+(?:\.\d+)*\.?\s*)?causales\s+de\s+rechazo\b/.test(plegar(x.l)) && !/\.{4,}|\bpageref\b|\s\d{1,3}$/.test(plegar(x.l)));
  if (ini < 0) return [];
  const items = [];
  const ARRANQUE = /^(?:[a-z]{1,2}[.)]\s+|\(?[a-z]{1,2}\)\s+|\d{1,2}[.)]\s+)?(?:que\s|cuando\s|no\s|presentar\s|ofrecer\s|superar\s|las\s+demas\s|el\s+proponente\s|la\s+oferta\s|si\s)/;
  for (let i = ini + 1; i < lineas.length && i < ini + 120; i++) {
    let l = lineas[i].l;
    const pl = plegar(l);
    if (/^(?:\d+(?:\.\d+)*\.?\s*)?causales\s+para\s+declarar\s+desierto|^(?:\d+(?:\.\d+)*\.?\s+)[a-z]/.test(pl) && !ARRANQUE.test(pl)) break;
    if (/^son\s+causales\s+de\s+rechazo/.test(pl)) continue;
    // la instrucción de plantilla que va DELANTE de la causal se quita; un renglón que es SOLO instrucción se salta
    l = l.replace(/^\[[^\]]*\]\s*/, "").trim();
    if (!l || /^\[/.test(l)) continue;
    const plL = plegar(l);
    if (ARRANQUE.test(plL) || !items.length) items.push({ texto: l, pagina: lineas[i].pagina });
    else items[items.length - 1].texto += ` ${l}`;
  }
  return items.map((c) => {
    const t = c.texto.replace(/\s*\[[^\]]*\]\s*/g, " ").replace(/\s+/g, " ").trim();
    const d = DONDE.find((x) => x.re.test(plegar(t)));
    return { texto: t.slice(0, 400), pagina: c.pagina, clave: d ? d.clave : "otra", revisa: d ? d.revisa || null : null, usted: d ? d.usted || null : null };
  });
}

/* La frase para la guía: cuántas, cuáles revisa la aplicación y cuáles comprueba usted (las de «usted» con su consejo). */
const NOMBRE = Object.freeze({ presupuesto: "presupuesto", formulario: "Formulario 1", unitario_cero: "ítems sin precio", unitario_tope: "unitarios sobre el oficial",
  aiu: "AIU", secop: "total de SECOP II", artificialmente_bajo: "precio artificialmente bajo", garantia: "garantía de seriedad", mipyme: "convocatoria limitada a Mipyme" });
function fraseCausales(causales) {
  if (!Array.isArray(causales) || !causales.length) return null;
  const revisadas = causales.filter((c) => c.revisa);
  const ustedConConsejo = causales.filter((c) => !c.revisa && c.usted);
  const resto = causales.length - revisadas.length - ustedConConsejo.length;
  const consejos = [...new Set(causales.filter((c) => c.usted).map((c) => c.usted))];
  const nombres = [...new Set(revisadas.map((c) => NOMBRE[c.clave]).filter(Boolean))];
  const n = (k, uno, varios) => `${k} ${k === 1 ? uno : varios}`;
  return `El pliego trae ${n(causales.length, "causal de rechazo", "causales de rechazo")}.`
    + (revisadas.length ? ` La aplicación le ayuda a revisar ${revisadas.length}${nombres.length ? ` (${nombres.join(", ")})` : ""}.` : " La aplicación no revisa ninguna de ellas por usted.")
    + (consejos.length ? ` Antes de radicar compruebe usted: ${consejos.join("; ")}.` : "")
    + (resto > 0 ? (resto === 1 ? " Y lea la otra en el pliego." : ` Y lea las otras ${resto} en el pliego.`) : "");
}

module.exports = { leerCausales, fraseCausales, DONDE };
