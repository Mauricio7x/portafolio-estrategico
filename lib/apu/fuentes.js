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

/* ══ VIGENCIA CONTRA EL RELOJ · DOS HECHOS DERIVADOS, NINGÚN VEREDICTO ══════
   (12-sep-2026) Ningún módulo de `lib/apu/` comparaba nunca la vigencia de un
   banco con la fecha: el INVIAS 2026-1 se seguía ofreciendo el 12-sep-2026 sin
   que nada dijera que ese semestre cerró el 30-jun. Se publican DOS hechos y se
   para ahí:

     · `dias_desde_captura` — aritmética sobre el `capturado_el` que el propio
       `meta()` del banco ya publica.
     · `periodo` — el fin de la etiqueta de vigencia y si ya pasó.

   PROHIBIDO un umbral de caducidad: no existe una fuente que diga «un APU de
   referencia vence a los N días», así que escribir `vencido: true` sería
   inventarse un número en el único sitio donde se fija el precio de una oferta.
   Aquí se publican los hechos y decide quien los lea.

   EL «HOY» SE INYECTA. `lib/habiles.hoyColombia(ahoraMs)` es el único «hoy» de
   este repositorio (UTC−5) y acepta el instante por parámetro: sin eso, estos
   dos campos no se podrían probar más que el día que se escribieron. */
const { hoyColombia } = require("../habiles.js");

const DIA_MS = 86400000;
const dia = (iso) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso || ""));
  if (!m) return null;
  const ms = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return Number.isFinite(ms) ? ms : null;
};
const diasEntre = (desdeIso, hastaIso) => {
  const a = dia(desdeIso), b = dia(hastaIso);
  return a == null || b == null ? null : Math.round((b - a) / DIA_MS);
};
const finDeMes = (anio, mes) => {
  const d = new Date(Date.UTC(anio, mes, 0));   // día 0 del mes siguiente = último del mes
  return `${anio}-${String(mes).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
};

/* De la ETIQUETA de vigencia al último día que cubre. Solo tres formas, las que
   los cinco bancos usan de verdad; cualquier otra devuelve `null` en vez de una
   fecha adivinada.
     «2026-1» · «2026-I»   semestre (un solo dígito o número romano)
     «2026-02»             MES (dos dígitos con cero a la izquierda: EPC publica
                           por mes, y leerlo como «semestre 2» sería inventarse
                           medio año de vigencia)
     «2026»                año completo                                        */
function periodoDe(vigencia, hoy) {
  const v = String(vigencia || "").trim();
  let tipo = null, fin = null;
  let m;
  if ((m = /^(\d{4})-(I{1,2}|[12])$/i.exec(v))) {
    const sem = /^i$/i.test(m[2]) || m[2] === "1" ? 1 : 2;
    tipo = "semestre"; fin = sem === 1 ? `${m[1]}-06-30` : `${m[1]}-12-31`;
  } else if ((m = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(v))) {
    tipo = "mes"; fin = finDeMes(Number(m[1]), Number(m[2]));
  } else if ((m = /^(\d{4})$/.exec(v))) {
    tipo = "anual"; fin = `${m[1]}-12-31`;
  }
  if (!tipo) return null;
  const dias = diasEntre(fin, hoy);
  const cerrado = dias == null ? null : dias > 0;
  return {
    etiqueta: v, tipo, fin, cerrado,
    // solo tiene sentido cuando ya cerró; un periodo abierto no lleva un 0 creíble
    dias_desde_el_cierre: cerrado === true ? dias : null,
  };
}

/* Lista de fuentes, una por banco disponible. Nunca lanza: un banco que no
   cargue se omite y se cuenta, porque una respuesta sin precios es un problema
   distinto de una respuesta sin su procedencia. */
function fuentes({ ahora } = {}) {
  const hoy = hoyColombia(ahora);
  const lista = [];
  let ilegibles = 0;
  for (const b of BANCOS) {
    if (!b.modulo) {
      /* El catálogo propio no es una captura fechada de una página ajena: no
         tiene `capturado_el` ni etiqueta de vigencia, y viajan en `null` — jamás
         un 0 de días que pareciera «capturado hoy». */
      lista.push({ id: b.id, nombre: b.nombre, url: null, vigencia: null, nota: b.nota || null,
        capturado_el: null, dias_desde_captura: null, periodo: null });
      continue;
    }
    try {
      const m = require(b.modulo).meta() || {};
      lista.push({
        id: b.id,
        nombre: b.nombre,
        fuente: texto(m.fuente) || texto(m.que_es),
        url: texto(m.url) || texto(m.url_patron),
        vigencia: texto(m.vigencia),
        publicado: texto(m.publicado) || null,
        capturado_el: texto(m.capturado_el),
        dias_desde_captura: diasEntre(texto(m.capturado_el), hoy),
        periodo: periodoDe(texto(m.vigencia), hoy),
        licencia: b.id === "invias"
          ? "Los documentos del INVIAS prohíben el uso comercial sin autorización (preciosunitarios@invias.gov.co)."
          : null,
      });
    } catch { ilegibles++; }
  }
  return {
    son_de_referencia: true,
    /* Contra qué fecha se midieron `dias_desde_captura` y `periodo`: una
       antigüedad sin su fecha de corte no se puede discutir. */
    hoy,
    aviso: "Precios de REFERENCIA, no cotizaciones: verifíquelos contra una cotización real antes de presentar oferta. "
      + "El costo directo NO incluye AIU ni los costos ocultos (contribución del 5 %, estampillas, pólizas, financiación).",
    bancos: lista,
    bancos_ilegibles: ilegibles,
  };
}

module.exports = { fuentes, BANCOS };
