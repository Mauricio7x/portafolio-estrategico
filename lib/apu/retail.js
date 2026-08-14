/* ============================================================================
   lib/apu/retail · Techo de tienda y de lista de fabricante, por insumo
   ----------------------------------------------------------------------------
   El encargo del dueño (2026-08-13): precios de TIENDA (Homecenter, Easy,
   listas de fabricante) como referencia — «le sirven como techo negociable; él
   sabe cuánto negociar». Este módulo responde, para un INSUMO del catálogo y un
   departamento, qué referencias retail existen y de dónde salen.

   LO QUE ESTE MÓDULO NO HACE, Y POR QUÉ:
   · NO produce el precio de un ÍTEM de obra. Una tienda cotiza el saco de
     cemento y el metro de cable, no el m³ de excavación: meter un techo retail
     como «precio unitario» del ítem sería el mismo error de categoría que el
     nivel `mercado` de la cascada declara («el SEGMENTO agrupa, nunca
     empareja», traducido a pesos).
   · NO entra en `costoDirecto`. El costo directo sale del catálogo (calibrado
     con un contrato ADJUDICADO); el retail es un TECHO con IVA y margen de
     mostrador. Sumarlo costearía la obra a precio de vitrina.
   · NO llama a ninguna tienda. Los datos vienen de `data/apu_retail.json`,
     capturado con `tests/capturar_retail.js` (herramienta manual con red): la
     app jamás depende de un tercero en la ruta de una petición.

   Reglas heredadas:
   · Cada referencia viaja con fuente + ciudad/alcance + fecha de captura: una
     cifra sin su origen no se puede discutir (la regla de
     `granularidad_utilizada`).
   · Sin referencia para un insumo → null, jamás un 0 ni un relleno.
   · La unidad de la fuente NO se convierte a la del catálogo, salvo división
     exacta de la MISMA dimensión (un tubo de 6 m → $/ml), y la división viaja
     declarada (`normalizacion.nota`). La densidad de la arena o el peso de una
     varilla NO son datos del catálogo: donde hacen falta, la referencia se
     queda en la unidad de la tienda y `correspondencia_nota` lo dice.
   · Departamento sin cobertura retail → se responde la referencia de Bogotá
     DECLARADA como tal, nunca disfrazada de precio local. Los 8 departamentos
     sin cobertura (Amazonía, Orinoquía lejana, San Andrés) quedan escritos en
     el propio JSON con su motivo.

   HOJA del grafo de requires, como lib/accesibilidad: no importa nada de lib/.
   ========================================================================== */
"use strict";

/* require ESTÁTICO: es como el repositorio carga todos sus JSON y lo que hace
   que el tracer de Vercel lo meta en el bundle (la lección de
   `?origen=repositorio`: con ruta dinámica funcionaría solo en local). */
const DATOS = require("../../data/apu_retail.json");

const norm = (s) => String(s || "")
  .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
  .toUpperCase().replace(/\s+/g, " ").trim();

const red = (n) => Math.round(n * 100) / 100;

/* Índice por insumo, construido UNA vez: la consulta corre por cada línea del
   desglose (200 ítems × ~10 insumos) y recorrer el arreglo cada vez sería
   O(n·m) para una tabla que no cambia en caliente. */
const POR_INSUMO = (() => {
  const m = new Map();
  for (const r of DATOS.referencias || []) {
    if (!r || !r.insumo_id) continue;
    if (!m.has(r.insumo_id)) m.set(r.insumo_id, []);
    m.get(r.insumo_id).push(r);
  }
  return m;
})();

const SIN_COBERTURA = (() => {
  const m = new Map();
  const src = (DATOS._meta && DATOS._meta.departamentos_sin_cobertura) || {};
  for (const [dep, motivo] of Object.entries(src)) m.set(norm(dep), motivo);
  return m;
})();

/* ¿Hay retail en este departamento? `null` cuando ni siquiera se preguntó por
   un departamento — no saber cuál es no es lo mismo que saber que no hay. */
function coberturaRetail(departamento) {
  if (!departamento) return { cubierto: null, motivo: null };
  const motivo = SIN_COBERTURA.get(norm(departamento));
  return motivo
    ? { cubierto: false, motivo }
    : { cubierto: true, motivo: null };
}

/* El precio de UNA referencia para un departamento, con su ámbito declarado. */
function resolverPrecio(ref, departamento) {
  if (ref.alcance === "por_capital") {
    const mapa = ref.precios_por_departamento || {};
    const dep = departamento ? norm(departamento) : null;
    if (dep) {
      for (const [k, v] of Object.entries(mapa)) {
        if (norm(k) === dep) return { precio: v, ambito: `capital de ${k}` };
      }
    }
    const bogota = mapa["BOGOTA D.C."];
    if (!Number.isFinite(bogota) || bogota <= 0) return null; // 0 no es un precio
    return {
      precio: bogota,
      ambito: dep
        ? "Bogotá — sin captura retail en tu departamento"
        : "Bogotá (referencia)",
    };
  }
  if (ref.alcance === "bogota") {
    if (!Number.isFinite(ref.precio) || ref.precio <= 0) return null;
    return {
      precio: ref.precio,
      ambito: departamento && norm(departamento) !== "BOGOTA D.C." ? "Bogotá — precio de referencia" : "Bogotá",
    };
  }
  // nacional: retail sin regionalizar (Easy, verificado) o lista de fabricante
  const p = ref.precio != null ? ref.precio : (ref.precio_con_iva != null ? ref.precio_con_iva : ref.precio_sin_iva);
  if (!Number.isFinite(p) || p <= 0) return null;
  return { precio: p, ambito: "nacional" };
}

/* Todas las referencias de un insumo para un departamento. `null` si no hay
   ninguna: la ausencia NO se rellena. */
function referenciasRetail(insumoId, departamento = null) {
  const refs = POR_INSUMO.get(String(insumoId || ""));
  if (!refs || !refs.length) return null;

  const salida = [];
  for (const ref of refs) {
    const res = resolverPrecio(ref, departamento);
    if (!res) continue;
    const r = {
      fuente: ref.fuente,
      declaracion: ref.declaracion, // retail_con_iva | lista_fabricante
      producto: ref.producto,
      unidad_fuente: ref.unidad_fuente,
      correspondencia: ref.correspondencia,
      correspondencia_nota: ref.correspondencia_nota || null,
      iva: ref.iva, // incluido | sin_iva | ambos
      precio: res.precio,
      /* en las listas de fabricante viajan LAS DOS columnas cuando existen:
         cuál se compara depende de cómo compre el contratista */
      precio_sin_iva: ref.precio_sin_iva != null ? ref.precio_sin_iva : null,
      precio_con_iva: ref.precio_con_iva != null ? ref.precio_con_iva : null,
      ambito: res.ambito,
      capturado_el: ref.capturado_el,
      vigencia_impresa: ref.vigencia_impresa || null,
      url: ref.url || null,
      normalizado: null,
    };
    if (ref.normalizacion && Number(ref.normalizacion.divisor) > 0) {
      r.normalizado = {
        precio: red(res.precio / Number(ref.normalizacion.divisor)),
        unidad: ref.normalizacion.unidad,
        nota: ref.normalizacion.nota,
      };
    }
    salida.push(r);
  }
  return salida.length ? salida : null;
}

/* Resumen para quien pinta: qué es esto y qué NO cubre, con las palabras del
   propio JSON (una sola fuente de esa verdad). */
function resumenRetail() {
  const meta = DATOS._meta || {};
  return {
    capturado_el: meta.capturado_el || null,
    advertencia: meta.advertencia || null,
    categorias_sin_retail: meta.categorias_sin_retail || {},
    departamentos_sin_cobertura: meta.departamentos_sin_cobertura || {},
    insumos_con_referencia: POR_INSUMO.size,
  };
}

module.exports = { referenciasRetail, coberturaRetail, resumenRetail };
