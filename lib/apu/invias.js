/* ============================================================================
   lib/apu/invias · Referencia oficial INVIAS por insumo, por provincia
   ----------------------------------------------------------------------------
   Responde, para un INSUMO del catálogo y un departamento, el precio oficial de
   referencia del banco de insumos de los APU Regionalizados del INVIAS (140
   provincias, 32 departamentos), con su código, vigencia y correspondencia
   declaradas. Es la capa 3 del plan de cobertura nacional
   (docs/INVESTIGACION_COMPETENCIA_APU.md §7): el dato oficial citable — «contra
   esto, "me parece caro" no es un argumento».

   LO QUE ESTE MÓDULO NO HACE, Y POR QUÉ (las mismas cerraduras del retail):
   · NO produce el precio de un ÍTEM de obra. El banco cotiza el kilo de acero y
     la hora de motoniveladora, no el m³ de excavación: meterlo en la cascada
     como precio del ítem sería el error de categoría de siempre.
   · NO entra en `costoDirecto`. El costo directo sale del catálogo calibrado
     con un contrato ADJUDICADO; esto es una REFERENCIA para contrastar y
     negociar, con rezago declarado (la vigencia viaja en cada referencia:
     2026-1 desde el 16-ago-2026, capturada del libro Excel oficial porque la
     API iba por detrás y su 2025-2 está corrupta en origen — ver
     tests/capturar_invias.js).
   · NO llama al INVIAS. Los datos vienen de `data/apu_invias.json`, capturado
     con `tests/capturar_invias.js` (herramienta manual con red): la app jamás
     depende de un tercero en la ruta de una petición.

   Reglas heredadas:
   · Cada referencia viaja con código oficial + provincia(s) + vigencia + fecha
     de captura: una cifra sin su origen no se puede discutir.
   · Sin correspondencia curada para un insumo → null, jamás un relleno.
   · La unidad de la fuente NO se convierte, salvo multiplicación exacta de la
     misma dimensión (kg → saco 50 kg, L → m³), declarada en `normalizado.nota`.
   · INVIAS no cotiza Bogotá D.C.: allí (y sin departamento) se responde la
     MEDIANA NACIONAL, declarada como tal — nunca disfrazada de precio local.
   · El municipio del proceso no se conoce, así que la provincia exacta tampoco:
     con varias provincias en el departamento se publica la MEDIANA
     departamental Y la lista completa de provincias con su precio, para que
     quien sabe dónde está la obra lea la suya.

   HOJA del grafo de requires, como lib/apu/retail: no importa nada de lib/.
   ========================================================================== */
"use strict";

/* require ESTÁTICO: es como el repositorio carga todos sus JSON y lo que hace
   que el tracer de Vercel lo meta en el bundle. */
const DATOS = require("../../data/apu_invias.json");

const norm = (s) => String(s || "")
  .normalize("NFD").replace(/[̀-ͯ]/g, "")
  .toUpperCase().replace(/\s+/g, " ").trim();

const red = (n) => Math.round(n * 100) / 100;

const medianaDe = (valores) => {
  const o = [...valores].sort((a, b) => a - b);
  const m = Math.floor(o.length / 2);
  return o.length % 2 ? o[m] : red((o[m - 1] + o[m]) / 2);
};

/* Índice por insumo, construido UNA vez (la consulta corre por cada línea del
   desglose). Dentro, las provincias van pre-agrupadas por departamento
   normalizado: el filtro por departamento corre en O(1) por línea. */
const POR_INSUMO = (() => {
  const m = new Map();
  for (const r of DATOS.referencias || []) {
    if (!r || !r.insumo_id) continue;
    const porDep = new Map();
    for (const p of r.provincias || []) {
      const k = norm(p.departamento);
      if (!porDep.has(k)) porDep.set(k, []);
      porDep.get(k).push(p);
    }
    m.set(r.insumo_id, { ref: r, porDep });
  }
  return m;
})();

/* La referencia de UN insumo para un departamento. `null` si el insumo no
   tiene correspondencia curada: la ausencia no se rellena. */
function referenciaInvias(insumoId, departamento = null) {
  const ent = POR_INSUMO.get(String(insumoId || ""));
  if (!ent) return null;
  const { ref, porDep } = ent;

  const dep = departamento ? norm(departamento) : null;
  const locales = dep ? porDep.get(dep) : null;

  let precio, alcance, provincias = null;
  if (locales && locales.length) {
    precio = medianaDe(locales.map((p) => p.precio));
    alcance = locales.length === 1
      ? `provincia ${locales[0].provincia} (${locales[0].departamento})`
      : `mediana de las ${locales.length} provincias de ${locales[0].departamento}`;
    provincias = locales.map((p) => ({ provincia: p.provincia, precio: p.precio }));
  } else {
    /* Bogotá D.C. no está en el banco; un departamento sin filas tampoco se
       inventa. La mediana nacional viaja DECLARADA como tal. */
    precio = ref.mediana_nacional;
    alcance = dep && dep.startsWith("BOGOTA")
      ? "mediana nacional — INVIAS no cotiza Bogotá D.C."
      : dep
        ? "mediana nacional — su departamento no está en la captura"
        : "mediana nacional";
  }
  if (!Number.isFinite(precio) || precio <= 0) return null; // 0 no es un precio (R1)

  const r = {
    fuente: "INVIAS",
    codigo_invias: ref.codigo_invias,
    nombre_oficial: ref.nombre_oficial,
    unidad_fuente: ref.unidad_fuente,
    correspondencia: ref.correspondencia,
    correspondencia_nota: ref.correspondencia_nota || null,
    vigencia: ref.vigencia,
    capturado_el: ref.capturado_el,
    precio: red(precio),
    alcance,
    provincias,
    normalizado: null,
  };
  if (ref.normalizacion && Number(ref.normalizacion.factor) > 0) {
    r.normalizado = {
      precio: red(precio * Number(ref.normalizacion.factor)),
      unidad: ref.normalizacion.unidad,
      nota: ref.normalizacion.nota,
    };
  }
  return r;
}

/* ¿Cubre el banco este departamento? `null` cuando ni se preguntó por uno —
   no saber cuál es no es lo mismo que saber que no hay (R1). */
function coberturaInvias(departamento) {
  if (!departamento) return { cubierto: null, motivo: null };
  const dep = norm(departamento);
  if (dep.startsWith("BOGOTA")) {
    return { cubierto: false, motivo: "INVIAS no cotiza Bogotá D.C.: la referencia que se enseña es la mediana nacional, declarada." };
  }
  for (const { porDep } of POR_INSUMO.values()) {
    if (porDep.has(dep)) return { cubierto: true, motivo: null };
  }
  return { cubierto: false, motivo: "Su departamento no está en la captura INVIAS: la referencia que se enseña es la mediana nacional, declarada." };
}

/* Resumen para quien pinta, con las palabras del propio JSON (una sola fuente
   de esa verdad). */
function resumenInvias() {
  const meta = DATOS._meta || {};
  return {
    vigencia: meta.vigencia || null,
    capturado_el: meta.capturado_el || null,
    advertencia: meta.advertencia || null,
    por_que_no_2025_2: meta.por_que_no_2025_2 || null,
    categorias_sin_invias: meta.categorias_sin_invias || {},
    insumos_con_referencia: POR_INSUMO.size,
  };
}

module.exports = { referenciaInvias, coberturaInvias, resumenInvias };
