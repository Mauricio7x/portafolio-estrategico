/* lib/apu/ffie_items.js · EL PRECIO TOPE DE EDIFICACIÓN DEL FFIE (ago 2026)
   ─────────────────────────────────────────────────────────────────────────────
   Cuarto banco oficial de ítems, y el único con COBERTURA NACIONAL: 1 042 ítems
   de edificación × los 33 departamentos, incluidos los 8 sin captura retail
   (Amazonas, Arauca, Caquetá, Guainía, Guaviare, San Andrés, Vaupés, Vichada) y
   los 19 que no tienen factor regional en el catálogo. Su materia —preliminares,
   demoliciones, cimientos, estructuras, mampostería, cubiertas, acabados— es la
   que hasta ahora solo cubrían los 157 ítems del contrato Nogal, y solo en
   Bogotá.

   ⚠️ ES UN PRECIO TOPE, NO UN PRECIO DE MERCADO. El FFIE publica el techo que
   reconoce en sus proyectos de infraestructura educativa. Medido contra el
   contrato adjudicado del dueño: el pañete del Nogal cuesta $40 150 y el tope
   de Bogotá es $30 607 — el contrato REAL está por encima del tope. Por eso:
   · tiene nivel PROPIO en la cascada (`ffie_apu`), después de los otros bancos;
   · su etiqueta y su motivo dicen «tope» en todas partes donde se enseña;
   · el precio propio, el del archivo o el tecleado MANDAN sobre él, como sobre
     cualquier referencia.
   Leerlo como cotización sería el mismo error de categoría que tomar el techo
   de una tienda por el precio de un ítem de obra.

   SIN COMPOSICIÓN, como el IDU: el listado publica el valor, no el APU. El ítem
   sale con `sin_apu: true` y va a `sin_desglose`; no se inventan componentes.
   A diferencia del IDU, SÍ está regionalizado: el precio es el del departamento
   de la obra, así que no se le aplica ningún factor del catálogo.
   Módulo HOJA (solo requiere el JSON y public/filtros.js). */
"use strict";

const DATOS = require("../../data/apu_ffie_items.json");
const Filtros = require("../../public/filtros.js");

const PREFIJO = "FFIE:";
const esCodigoFfie = (id) => typeof id === "string" && id.startsWith(PREFIJO);
const codigoDe = (id) => (esCodigoFfie(id) ? id.slice(PREFIJO.length).trim() : String(id || "").trim());
const idDe = (numeral) => `${PREFIJO}${numeral}`;

const POR_NUMERAL = new Map((DATOS.items || []).map((it) => [it.numeral, it]));

/* El nombre del departamento se resuelve por CÓDIGO DANE con la misma regla del
   listado (`Filtros.departamento`), igual que hace el banco del INVIAS: así
   «BOYACÁ», «Boyaca» y «15» son lo mismo. El FFIE escribe algunos sin tilde y
   pegados («VALLEDELCAUCA», «NORTEDESANTANDER»), así que el índice se arma con
   la clave canónica y con el literal del archivo. */
/* El índice se arma con el CÓDIGO DANE que el capturador declaró para cada
   literal del archivo, no adivinando: el FFIE escribe varios departamentos
   pegados («VALLEDELCAUCA») y `Filtros.departamento` devuelve null para ellos.
   El primer intento sí adivinaba y produjo el peor defecto posible — pedir el
   código 76 (Valle del Cauca) devolvía el precio de NORTE DE SANTANDER, porque
   la clave vacía de los que no resolvían se sobrescribía entre sí. Una clave
   vacía nunca es una clave: es la familia del `|| 0`. */
const POR_DANE = new Map();
for (const d of DATOS.departamentos || []) {
  if (d.codigo_dane) POR_DANE.set(String(d.codigo_dane).padStart(2, "0"), d.departamento);
}

/** El literal con el que el archivo del FFIE nombra a ese departamento. */
function literalDepartamento(departamento) {
  if (!departamento) return null;
  const canon = Filtros.departamento(departamento);
  if (canon) return POR_DANE.get(String(canon.codigo).padStart(2, "0")) || null;
  /* si no es un departamento reconocible, aún puede ser el literal del propio
     archivo («VALLEDELCAUCA»), que es exacto y no se adivina */
  const literal = String(departamento).trim().toUpperCase();
  for (const nombre of POR_DANE.values()) if (nombre.toUpperCase() === literal) return nombre;
  return null;
}

function itemPorCodigo(codigoOId) {
  return POR_NUMERAL.get(codigoDe(codigoOId)) || null;
}

let _comoCatalogo = null;
/** Ítems FFIE con la FORMA de un ítem del catálogo (buscador e importador). */
function comoItemsDeCatalogo() {
  if (!_comoCatalogo) {
    _comoCatalogo = (DATOS.items || []).map((it) => ({
      codigo: idDe(it.numeral), descripcion: it.descripcion, unidad: it.unidad || null,
      capitulo: it.capitulo || null, subcapitulo: it.subcapitulo || null,
      fuente: "ffie", es_ffie: true, numeral_ffie: it.numeral,
    }));
  }
  return _comoCatalogo;
}

/** El precio TOPE de un ítem en un departamento, y su trazabilidad.
    Sin departamento responde la MEDIANA nacional y lo declara: elegir uno por
    omisión sería servir el precio de otra región sin decirlo. */
function precioReferencia(codigoOId, departamento = null) {
  const it = itemPorCodigo(codigoOId);
  if (!it) return null;

  const literal = literalDepartamento(departamento);
  let precio = null, nivel = null, usado = null;
  if (literal && it.precios[literal] > 0) {
    precio = it.precios[literal]; nivel = "departamento"; usado = literal;
  } else {
    const todos = Object.values(it.precios).filter((n) => n > 0).sort((a, b) => a - b);
    if (!todos.length) return null;
    const m = todos.length >> 1;
    precio = todos.length % 2 ? todos[m] : Math.round((todos[m - 1] + todos[m]) / 2);
    nivel = "nacional";
  }

  return {
    precio: Math.round(precio),
    numeral_ffie: it.numeral, descripcion: it.descripcion, unidad: it.unidad,
    capitulo: it.capitulo, subcapitulo: it.subcapitulo,
    nivel, departamento: departamento || null, departamento_usado: usado,
    departamentos_publicados: Object.keys(it.precios).length,
    vigencia: DATOS._meta.vigencia, capturado_el: DATOS._meta.capturado_el,
    es_tope: true,
    nota: nivel === "nacional"
      ? "No se indicó el departamento de la obra (o el FFIE no lo publica): se usó la MEDIANA nacional y se declara."
      : null,
    nota_tope: "Es el precio TOPE que reconoce el FFIE, no un precio de mercado: un contrato real puede estar por encima. Sirve como referencia y como techo, no como cotización.",
  };
}

function meta() {
  return { ...DATOS._meta, departamentos_cobertura: DATOS.departamentos || [] };
}

module.exports = {
  PREFIJO, esCodigoFfie, codigoDe, idDe,
  itemPorCodigo, comoItemsDeCatalogo, precioReferencia, literalDepartamento, meta,
};
