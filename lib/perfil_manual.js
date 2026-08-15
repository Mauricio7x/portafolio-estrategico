/* lib/perfil_manual.js · Perfil APROXIMADO desde tres datos (Fase 2)
   ─────────────────────────────────────────────────────────────────────────────
   Cuando el RUP no se pudo leer —escaneado, ZIP de fotos, PDF roto— la puerta
   de entrada pide TRES cosas que un contratista sabe de memoria: patrimonio,
   contrato más grande ejecutado y a qué se dedica. Con eso se arma un perfil
   con el que la app puede contar y listar oportunidades. Es APROXIMADO y se
   presenta como tal: sirve para responder «¿a cuántas puedo presentarme hoy?»,
   no para sustituir el certificado.

   Reglas:
   · La actividad se traduce a familias UNSPSC a través de las TIPOLOGÍAS del
     módulo APU (`lib/apu/tipologias`), que ya llevan curadas sus familias, y de
     ahí a las CLASES de la unión de los RUP del repositorio que caen en esas
     familias. No es una segunda lista de «qué es obra»: reutiliza dos que ya
     existen (R2). El usuario nunca ve un código.
   · Lo que no se pide viaja en `null` («sin dato»): liquidez, endeudamiento,
     cobertura y utilidad operacional. La K queda sin dato (lib/capacidad) y
     la puerta P2 deja pasar declarándolo. Nada se rellena con un valor
     «razonable».
   · `tipo` = persona_natural es un SUPUESTO declarado (el esquema lo exige y
     no cambia ninguna puerta: el patrimonio manda en la caja); se puede
     corregir cargando el RUP real. */

const { UNSPSC_JUNTOS } = require("./unspsc.js");
const { SMMLV } = require("./perfiles.js");

/* Doce opciones en lenguaje llano → tipologías (o familias sueltas cuando la
   tipología no existe: mantenimiento de edificaciones = familia 7210). */
const ACTIVIDADES = Object.freeze([
  { id: "vias", etiqueta: "Vías, placa huella y pavimentos", tipologias: ["VIA-PH", "VIA-FLEX", "VIA-RIG", "VIA-MANT", "VIA-SEN"] },
  { id: "puentes_muros", etiqueta: "Puentes, muros de contención y estabilización de taludes", tipologias: ["EST-MUR", "EST-PTE", "MIT-GEO"] },
  { id: "acueducto", etiqueta: "Acueducto y alcantarillado (redes)", tipologias: ["AGU-RED", "ALC-RED", "SAN-BAS", "DRE-OBR"] },
  { id: "plantas", etiqueta: "Plantas de tratamiento de agua y tanques", tipologias: ["AGU-PTAP", "ALC-PTAR"] },
  { id: "edificaciones", etiqueta: "Edificaciones: colegios, oficinas, salones comunales", tipologias: ["EDI-EDU", "EDI-INST"] },
  { id: "vivienda", etiqueta: "Vivienda y mejoramientos de vivienda", tipologias: ["EDI-VIS"] },
  { id: "deportivo", etiqueta: "Escenarios deportivos, parques y espacio público", tipologias: ["DEP-POL", "URB-PAR"] },
  { id: "electricas", etiqueta: "Redes eléctricas y alumbrado público", tipologias: ["ELE-RED"] },
  { id: "ambiental", etiqueta: "Obras ambientales, cauces y drenajes", tipologias: ["DRA-CAU", "MIT-GEO", "DRE-OBR"] },
  { id: "mantenimiento", etiqueta: "Mantenimiento y adecuación de edificaciones", tipologias: ["VIA-MANT"], familias_extra: ["7210", "7212", "7215"] },
  { id: "consultoria", etiqueta: "Consultoría, estudios, diseños e interventoría", tipologias: ["CON-EST"] },
  { id: "obra_general", etiqueta: "Todo tipo de obra civil", tipologias: "*" },
]);

const IDS = ACTIVIDADES.map((a) => a.id);

function familiasDe(actividadId) {
  const { TIPOLOGIAS } = require("./apu/tipologias.js");
  const act = ACTIVIDADES.find((a) => a.id === actividadId);
  if (!act) return null;
  const lista = Array.isArray(TIPOLOGIAS) ? TIPOLOGIAS : Object.values(TIPOLOGIAS || {});
  const fam = new Set(act.familias_extra || []);
  const elegidas = act.tipologias === "*" ? lista : lista.filter((t) => act.tipologias.includes(t.codigo));
  for (const t of elegidas) for (const f of (t.unspsc_familias || t.familias || t.unspsc || [])) fam.add(String(f).slice(0, 4));
  return [...fam].sort();
}

/* Clases (códigos de 8 dígitos terminados en «00») de la unión de los RUP que
   caen en las familias de la actividad. Es la única forma de que el matching
   —que exige CLASES en el RUP— y la ingesta —admisible por FAMILIAS_UNION—
   hablen del mismo universo. */
function clasesDe(actividadId) {
  const fam = familiasDe(actividadId);
  if (!fam) return null;
  const set = new Set(fam);
  return UNSPSC_JUNTOS.filter((c) => set.has(String(c).slice(0, 4))).sort();
}

/* Tres datos → configuración de perfil (esquema de lib/config_rup, modo aproximado).
   → { ok, config, advertencias } | { ok:false, error, campos } */
function configDesdeManual(entrada) {
  const e = entrada && typeof entrada === "object" ? entrada : {};
  const errores = [];
  const patrimonio = Number(e.patrimonio);
  if (!Number.isFinite(patrimonio) || patrimonio <= 0) errores.push({ campo: "patrimonio", error: "el patrimonio debe ser un número mayor que 0 (en pesos)" });
  const mayorCrudo = Number(e.mayorContrato);
  const unidad = String(e.unidad || "COP").toUpperCase() === "SMMLV" ? "SMMLV" : "COP";
  const mayorSmmlv = Number.isFinite(mayorCrudo) && mayorCrudo > 0
    ? (unidad === "SMMLV" ? mayorCrudo : mayorCrudo / SMMLV)
    : null;
  if (mayorSmmlv == null) errores.push({ campo: "mayorContrato", error: "el contrato más grande debe ser un número mayor que 0" });
  const actividad = String(e.actividad || "").toLowerCase();
  if (!IDS.includes(actividad)) errores.push({ campo: "actividad", error: `la actividad debe ser una de: ${IDS.join(", ")}` });
  if (errores.length) return { ok: false, error: "Faltan datos o no son válidos.", campos: errores };

  const clases = clasesDe(actividad);
  const act = ACTIVIDADES.find((a) => a.id === actividad);
  const experiencia = Math.round(mayorSmmlv * 100) / 100;
  const config = {
    nombre: `Perfil aproximado · ${act.etiqueta}`,
    tipo: "persona_natural",
    nit: null,
    unspsc: clases,
    indicadores: {
      liquidez: null, endeudamiento: null, cobertura_intereses: null,
      patrimonio: Math.round(patrimonio),
      utilidad_operacional: null,
      ingreso_operacional: null,
    },
    profesionales: 1,
    experiencia_smmlv: experiencia,
    tope_smmlv: Math.ceil(experiencia * 2),
  };
  const advertencias = [
    "Perfil aproximado: se armó con tres datos, no con el certificado RUP. Sirve para saber a cuántas licitaciones podrías presentarte hoy; para verificar la capacidad de contratación hace falta el RUP.",
    "Sin utilidad operacional no se calcula la capacidad de contratación (K): esa puerta queda «sin dato» y no se cierra por falta de información.",
    `Se asume que hacés obra en «${act.etiqueta}»: ${clases.length} clases de obra de ese tipo. Con el RUP real la lista es la tuya, no la del tipo de obra.`,
    "Tope por defecto: 2 × tu contrato más grande. Por encima de esa cuantía no se te muestran procesos.",
  ];
  return { ok: true, config, advertencias, actividad: act, familias: familiasDe(actividad) };
}

module.exports = { ACTIVIDADES, IDS, familiasDe, clasesDe, configDesdeManual };
