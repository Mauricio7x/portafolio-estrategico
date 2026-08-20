/* ============================================================================
   lib/apu/fuentes · De dónde sale cada precio, con su URL y su vigencia
   ----------------------------------------------------------------------------
   Existe por una CONDICIÓN EXPLÍCITA del dueño al abrir `calcular` e `inferir`
   sin credencial (ago 2026): «no hay problema en abrir la información del APU
   siempre y cuando se especifique que son precios de referencia y su fuente,
   que son páginas web». Un precio sin su origen no se puede discutir — la misma
   regla que `granularidad_utilizada` en el índice de baja o que
   `precio_origen_{region}` en el catálogo.

   Se ARMA desde el `meta()` de cada banco, jamás transcribiendo las URL aquí:
   una segunda lista de fuentes se desincroniza el día que se re-capture una
   vigencia, y entonces la app estaría citando un documento que ya no es el que
   usó para calcular. Los `require` van DIFERIDOS dentro de la función por la
   misma razón que en el resto de `apu/`: este módulo es hoja y no debe arrastrar
   los cinco bancos a quien solo quiera la lista.

   Un banco que no publique URL viaja con `url: null` — no se inventa un enlace,
   que sería peor que no darlo. La licencia del INVIAS se declara donde toca:
   sus documentos prohíben el uso comercial sin autorización.
   ========================================================================== */
"use strict";

const BANCOS = [
  { id: "catalogo", modulo: null,
    nombre: "Catálogo propio (contrato adjudicado + derivaciones regionales)",
    nota: "Precios calibrados contra un contrato REAL adjudicado y derivados por factor regional. Cada insumo declara si es adjudicado, recuperado, derivado o estimado." },
  { id: "invias", modulo: "./invias_items.js", nombre: "INVIAS · APU Regionalizados de Referencia" },
  { id: "idu", modulo: "./idu_items.js", nombre: "IDU · Visor de Precios Unitarios de Referencia (Bogotá)" },
  { id: "epc", modulo: "./epc_items.js", nombre: "Empresas Públicas de Cundinamarca (EPC)" },
  { id: "ffie", modulo: "./ffie_items.js", nombre: "FFIE · precios TOPE de edificación" },
  { id: "iccu", modulo: "./iccu_items.js", nombre: "ICCU · Gobernación de Cundinamarca" },
];

const texto = (v) => (typeof v === "string" && v.trim() ? v.trim() : null);

/* Lista de fuentes, una por banco disponible. Nunca lanza: un banco que no
   cargue se omite y se cuenta, porque una respuesta sin precios es un problema
   distinto de una respuesta sin su procedencia. */
function fuentes() {
  const lista = [];
  let ilegibles = 0;
  for (const b of BANCOS) {
    if (!b.modulo) { lista.push({ id: b.id, nombre: b.nombre, url: null, vigencia: null, nota: b.nota || null }); continue; }
    try {
      const m = require(b.modulo).meta() || {};
      lista.push({
        id: b.id,
        nombre: b.nombre,
        fuente: texto(m.fuente) || texto(m.que_es),
        url: texto(m.url) || texto(m.url_patron),
        vigencia: texto(m.vigencia),
        publicado: texto(m.publicado) || null,
        licencia: b.id === "invias"
          ? "Los documentos del INVIAS prohíben el uso comercial sin autorización (preciosunitarios@invias.gov.co)."
          : null,
      });
    } catch { ilegibles++; }
  }
  return {
    son_de_referencia: true,
    aviso: "Precios de REFERENCIA, no cotizaciones: verifíquelos contra una cotización real antes de presentar oferta. "
      + "El costo directo NO incluye AIU ni los costos ocultos (contribución del 5 %, estampillas, pólizas, financiación).",
    bancos: lista,
    bancos_ilegibles: ilegibles,
  };
}

module.exports = { fuentes, BANCOS };
