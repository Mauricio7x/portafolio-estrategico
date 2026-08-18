/* lib/apu/epc_items.js · LOS APU DE EPC COMO ÍTEMS COSTEABLES (ago 2026)
   ─────────────────────────────────────────────────────────────────────────────
   Tercer banco oficial de ítems, después de los 526 APU del INVIAS
   (lib/apu/invias_items) y los 3 172 precios del IDU (lib/apu/idu_items).
   Empresas Públicas de Cundinamarca publica 440 actividades de ACUEDUCTO,
   ALCANTARILLADO y la obra civil asociada (zanjas, cauces, pozos, estructuras)
   con su APU completo. Es el hueco que ni el catálogo (edificación) ni el
   INVIAS (carreteras) ni el IDU (espacio público de Bogotá) cubrían.

   Lo que lo distingue de los otros dos bancos:
   · TRAE COMPOSICIÓN, como el INVIAS y al revés que el IDU: equipo, material,
     transporte y mano de obra, con el código de insumo, su valor unitario y su
     factor. Así el ítem reparte por componente en vez de caer a `sin_desglose`.
   · SU ARITMÉTICA ESTÁ MEDIDA, NO SUPUESTA. Cada línea declara si su factor
     multiplica (materiales, y la herramienta menor como % de la mano de obra) o
     divide (equipo y mano de obra, donde el factor es un rendimiento). El
     capturador lo dedujo comparando las dos hipótesis contra el VALOR TOTAL que
     imprime el propio archivo: 1 200 multiplican, 1 118 dividen, 144 son
     indiferentes (factor 1) y NINGUNA quedó sin explicar. Una línea sin
     `operacion` no se costea — no se elige una a ojo.
   · ES DE CUNDINAMARCA, y la composición es la de la provincia del libro
     (ALMEIDAS). Fuera de allí el precio viaja igual y se DECLARA, como hace el
     IDU fuera de Bogotá: sin más provincias capturadas no hay a qué aplicar un
     ajuste, y un factor inventado sería peor que decir de dónde es el precio.

   Referencia oficial, no cotización: el precio propio, el del archivo importado
   o el tecleado MANDAN sobre él (la política de precios de siempre) y este queda
   como `cd_catalogo` para que la diferencia se vea.
   Módulo HOJA (solo requiere el JSON). */
"use strict";

const DATOS = require("../../data/apu_epc_items.json");

const PREFIJO = "EPC:";
const esCodigoEpc = (id) => typeof id === "string" && id.startsWith(PREFIJO);
const codigoDe = (id) => (esCodigoEpc(id) ? id.slice(PREFIJO.length).trim() : String(id || "").trim());
const idDe = (numeral) => `${PREFIJO}${numeral}`;

const POR_NUMERAL = new Map((DATOS.items || []).map((it) => [it.numeral, it]));
const PROVINCIA_LIBRO = DATOS._meta.provincia_del_libro;

const red = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

function itemPorCodigo(codigoOId) {
  return POR_NUMERAL.get(codigoDe(codigoOId)) || null;
}

let _comoCatalogo = null;
/** Ítems EPC con la FORMA de un ítem del catálogo (buscador e importador). */
function comoItemsDeCatalogo() {
  if (!_comoCatalogo) {
    _comoCatalogo = (DATOS.items || []).map((it) => ({
      codigo: idDe(it.numeral), descripcion: it.descripcion, unidad: it.unidad || null,
      capitulo: it.capitulo || null, subcapitulo: it.subcapitulo || null,
      fuente: "epc", es_epc: true, numeral_epc: it.numeral,
    }));
  }
  return _comoCatalogo;
}

const esCundinamarca = (departamento) =>
  /cundinamarca/i.test(String(departamento || "").normalize("NFD").replace(/[̀-ͯ]/g, "")) ||
  String(departamento || "").trim() === "25";

/* El valor de UNA línea según la operación que el capturador MIDIÓ. Una línea
   sin operación conocida devuelve null y no se costea: inventarle una sería
   elegir entre multiplicar y dividir a ojo, que en un APU son dos precios
   distintos. */
function valorDeLinea(l) {
  if (!l || !Number.isFinite(l.valor_unitario) || !Number.isFinite(l.factor)) return null;
  if (l.operacion === "multiplica" || l.operacion === "ambigua") return l.valor_unitario * l.factor;
  if (l.operacion === "divide") return l.factor ? l.valor_unitario / l.factor : null;
  return null;
}

/** El APU de un ítem para un departamento: precio, componentes y líneas.
    `null` si el código no es de EPC o el banco no trae ese ítem. */
function apuParaDepartamento(codigoOId, departamento = null) {
  const it = itemPorCodigo(codigoOId);
  if (!it) return null;

  const comp = it.composicion;
  const componentes = { equipo: 0, material: 0, transporte: 0, mano_obra: 0 };
  const lineas = [];
  let herramientaMenor = 0, herramientaPct = null, sinOperacion = 0;

  for (const l of (comp && comp.lineas) || []) {
    const valor = valorDeLinea(l);
    if (valor == null) { sinOperacion++; continue; }
    const v = Math.round(valor);
    if (componentes[l.seccion] !== undefined) componentes[l.seccion] += v;

    /* La herramienta menor viene como una línea de EQUIPO con unidad «%» cuyo
       valor unitario es el subtotal de la mano de obra: se suma al equipo (que
       es donde el archivo la pone) y además se publica aparte, como hace el
       catálogo, para que el desglose la muestre por lo que es. */
    const esHerramienta = /^%$/.test(String(l.unidad || "").trim()) && /herramienta/i.test(l.descripcion || "");
    if (esHerramienta) { herramientaMenor += v; herramientaPct = l.factor; }

    /* `cantidad × precio = valor` es una invariante probada del proyecto, así
       que un factor que DIVIDE se publica como cantidad = 1/factor y el factor
       se conserva en `rendimiento`. Sin eso, la hoja de APU imprimiría una fila
       que no cuadra con una calculadora al lado. */
    const divide = l.operacion === "divide";
    const cantidad = divide ? (l.factor ? 1 / l.factor : null) : l.factor;
    lineas.push({
      insumo_id: l.codigo || null,
      nombre: l.descripcion,
      unidad: l.unidad || null,
      tipo: l.seccion,
      origen_precio: "epc",
      precio_region: l.valor_unitario,
      precio_aplicado: l.valor_unitario,
      cantidad,
      cantidad_base: divide ? null : l.factor,
      rendimiento: divide ? l.factor : null,
      factor_jornada: null,
      desperdicio: 0,
      distancia_km: null,
      valor: v,
      nota: esHerramienta
        ? `Herramienta menor: ${red((l.factor || 0) * 100)} % de la mano de obra (así lo calcula el APU oficial de EPC).`
        : null,
    });
  }

  /* El precio que se sirve es el del propio archivo; los componentes explican
     su reparto. Cuando el APU no cuadra en origen (1 de 440) se conserva el
     total oficial y se declara: reescribirlo sería corregir la fuente. */
  const sumaComponentes = Object.values(componentes).reduce((a, b) => a + b, 0);
  const precio = Number.isFinite(it.precio_referencia) && it.precio_referencia > 0
    ? Math.round(it.precio_referencia)
    : (sumaComponentes > 0 ? sumaComponentes : null);
  if (!precio) return null;

  const enCundinamarca = departamento ? esCundinamarca(departamento) : null;
  return {
    numeral: it.numeral, descripcion: it.descripcion, unidad: it.unidad,
    capitulo: it.capitulo, subcapitulo: it.subcapitulo,
    precio, componentes, lineas,
    /* misma forma que el banco INVIAS, para que `calcular`, la tabla y el Excel
       no tengan que distinguir de dónde vino el ítem (lo dice `origen_precio`) */
    capitulos: {
      mano_obra: componentes.mano_obra,
      materiales: componentes.material,
      equipo: componentes.equipo - herramientaMenor,
      transporte: componentes.transporte,
      herramienta_menor: herramientaMenor,
      epp: 0,
    },
    herramienta_menor_pct: herramientaPct,
    suma_componentes: sumaComponentes,
    cuadra: comp ? comp.cuadra !== false : false,
    lineas_sin_operacion: sinOperacion,
    provincia: PROVINCIA_LIBRO,
    precios_por_provincia: it.precios_por_provincia || null,
    vigencia: DATOS._meta.vigencia,
    capturado_el: DATOS._meta.capturado_el,
    departamento: departamento || null,
    ajuste_regional: enCundinamarca === false ? "ninguno" : (enCundinamarca ? "cundinamarca" : null),
    nota_regional: enCundinamarca === false
      ? `Precio de referencia de EPC (Cundinamarca, provincia ${PROVINCIA_LIBRO}): fuera de Cundinamarca viaja SIN ajuste regional y se declara.`
      : null,
  };
}

/* UN solo unitario para calcular y cotizar: la suma de los componentes ya
   redondeados cuando explica el precio oficial, y el precio oficial si no.
   Dos redondeos «equivalentes» dieron 16 537 frente a 16 536 en el banco del
   INVIAS: aquí se define una sola vez y lo comparten las dos vías. */
function unitarioMotor(apu) {
  if (!apu) return null;
  return red(apu.precio);
}

function meta() {
  return { ...DATOS._meta, provincias: DATOS.provincias || [] };
}

module.exports = {
  PREFIJO, esCodigoEpc, codigoDe, idDe,
  itemPorCodigo, comoItemsDeCatalogo, apuParaDepartamento, unitarioMotor,
  valorDeLinea, esCundinamarca, meta,
};
