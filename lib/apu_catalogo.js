/* ============================================================================
   lib/apu_catalogo · Tipologías de obra e ítems del catálogo APU
   ----------------------------------------------------------------------------
   DOS COSAS, y conviene no confundirlas:

     TIPOLOGIAS  el catálogo CERRADO de 22 tipos de obra de
                 docs/APU_INFORME_COMPLETO.md §1.D.1, con sus términos ancla.
                 Cerrado a propósito: «un catálogo abierto no se puede probar ni
                 auditar, y una tipología mal asignada produce un presupuesto
                 absurdo».
     ITEMS       los ítems de obra (data/catalogo_apu.json) a los que se mapean
                 las filas extraídas de un pliego. Cada uno con su unidad de
                 pago, las tipologías que lo usan y sus sinónimos.

   NINGÚN CÓDIGO «INV-» SE PUBLICA AQUÍ, y es una regla dura, no una omisión.
   §1.D.3: «nunca inventar un código INV que no exista; si no hay artículo, el
   ítem nace LOC-». El índice oficial de las Especificaciones INVÍAS 2022
   (Res. 4561/2022) nunca se pudo abrir desde el entorno de desarrollo (HTTP 403),
   así que la numeración de artículos y las unidades de pago están SIN VERIFICAR.
   El artículo que probablemente corresponde a cada ítem viaja aparte, en
   `articulo_invias_candidato`, marcado como hipótesis. `codigoInviasPropuesto()`
   compone el código que se EMITIRÍA al confirmarlo, y existe para dejar
   preparado ese paso sin publicar la clave hoy.

   AQUÍ NO HAY PRECIOS. Este módulo no es la «biblioteca de APU parametrizados»
   (§1.D.4): no hay rendimientos, ni composición de insumos, ni jornales. Esa
   capa exige precios verificados —INVÍAS, IDU, listas departamentales— y ninguna
   de esas fuentes es accesible desde aquí. Un precio inventado en un APU es
   plata, no un dato incómodo.

   ES UNA HOJA DEL GRAFO DE REQUIRES, igual que `lib/unspsc.js`: solo depende de
   `lib/semantica` (por `norm`). Hacer que importara los perfiles o los filtros
   cerraría un ciclo, que es la lección que ya costó cara con
   `filtros → rup → filtros` y `perfiles → unspsc → perfiles`.
   ========================================================================== */
"use strict";

const { norm } = require("./semantica.js");

/* ══════════════════ 1 · Catálogo cerrado de tipologías ══════════════════ */
/* Los términos ancla y las familias UNSPSC son los de la tabla de §1.D.1, que
   verificó las familias una a una contra `lib/unspsc.js`. Las familias 5510 y
   7213 NO están inscritas en ningún RUP y por eso NO aparecen: se citaban allí
   como contexto del clasificador, nunca como evidencia de habilitación, y
   meterlas aquí las convertiría en lo segundo. */
const TIPOLOGIAS = {
  "VIA-PH": { nombre: "Placa huella", anclas: ["placa huella", "placahuella", "huella", "riel", "via terciaria"], familias: ["7214", "7215", "9512"], unidad_dominante: "ml" },
  "VIA-FLEX": { nombre: "Pavimento flexible", anclas: ["pavimentacion", "asfalto", "asfaltico", "asfaltica", "mezcla densa", "mdc", "imprimacion"], familias: ["7214", "7215", "9512"], unidad_dominante: "m2" },
  "VIA-RIG": { nombre: "Pavimento rígido", anclas: ["pavimento rigido", "concreto hidraulico", "losa", "placa de concreto"], familias: ["7214", "7215", "9512"], unidad_dominante: "m2" },
  "VIA-MANT": { nombre: "Mantenimiento y rehabilitación vial", anclas: ["parcheo", "afirmado", "roceria", "conformacion", "repavimentacion", "mantenimiento de via", "mantenimiento vial", "rehabilitacion de via"], familias: ["7215", "9512", "7212"], unidad_dominante: "ml" },
  "VIA-SEN": { nombre: "Señalización vial", anclas: ["senalizacion vial", "demarcacion", "senal vertical", "tachas"], familias: ["7215", "9512"], unidad_dominante: "ml" },
  "DRE-OBR": { nombre: "Drenaje y alcantarillas", anclas: ["alcantarilla", "box culvert", "box coulvert", "cuneta", "filtro", "descole", "encole", "sumidero"], familias: ["7214", "7215", "4017"], unidad_dominante: "ml" },
  "EST-MUR": { nombre: "Muros de contención y gaviones", anclas: ["muro de contencion", "gavion", "pantalla anclada", "tierra reforzada"], familias: ["7214", "7215", "3010"], unidad_dominante: "m3" },
  "EST-PTE": { nombre: "Puentes menores y pontones", anclas: ["puente vehicular", "puente peatonal", "ponton", "estribo", "viga"], familias: ["7214", "7215", "9512"], unidad_dominante: "m2" },
  "MIT-GEO": { nombre: "Mitigación y estabilización", anclas: ["mitigacion", "estabilizacion", "talud", "jarillon", "socavacion", "obras de proteccion"], familias: ["7214", "7712", "8115"], unidad_dominante: "m3" },
  "AGU-RED": { nombre: "Acueducto — redes", anclas: ["acueducto", "red de acueducto", "aduccion", "conduccion", "domiciliaria"], familias: ["7215", "4017", "4018", "8110"], unidad_dominante: "ml" },
  "ALC-RED": { nombre: "Alcantarillado — redes", anclas: ["alcantarillado", "red sanitaria", "pluvial", "pozo de inspeccion", "colector"], familias: ["7215", "4017", "4018", "8110"], unidad_dominante: "ml" },
  "AGU-PTAP": { nombre: "PTAP y almacenamiento", anclas: ["ptap", "planta de tratamiento de agua potable", "tanque", "bocatoma", "desarenador"], familias: ["7215", "8110", "4015"], unidad_dominante: "gl" },
  "ALC-PTAR": { nombre: "PTAR", anclas: ["ptar", "aguas residuales", "laguna de oxidacion", "lodos activados"], familias: ["7215", "7712", "8110"], unidad_dominante: "gl" },
  "SAN-BAS": { nombre: "Saneamiento básico rural", anclas: ["unidad sanitaria", "bateria sanitaria", "pozo septico", "sistema individual"], familias: ["7214", "7215", "4017"], unidad_dominante: "un" },
  "EDI-EDU": { nombre: "Aulas y colegios", anclas: ["aula", "colegio", "institucion educativa", "sede educativa", "restaurante escolar"], familias: ["7212", "7214", "7215"], unidad_dominante: "m2" },
  "EDI-INST": { nombre: "Edificaciones institucionales", anclas: ["alcaldia", "cdi", "casa de la cultura", "puesto de salud", "estacion de bomberos"], familias: ["7212", "7214", "7215"], unidad_dominante: "m2" },
  "EDI-VIS": { nombre: "Vivienda VIS y mejoramiento", anclas: ["vivienda", "vis", "vip", "mejoramiento de vivienda", "unidad habitacional"], familias: ["7214", "7215"], unidad_dominante: "vivienda" },
  "DEP-POL": { nombre: "Polideportivos y canchas", anclas: ["polideportivo", "cancha", "coliseo", "cubierta metalica", "placa polideportiva"], familias: ["7212", "7214", "7215"], unidad_dominante: "m2" },
  "URB-PAR": { nombre: "Parques y espacio público", anclas: ["parque", "espacio publico", "anden", "plazoleta", "biosaludable", "ciclorruta"], familias: ["7214", "7215", "9512"], unidad_dominante: "m2" },
  "ELE-RED": { nombre: "Redes eléctricas y alumbrado", anclas: ["electrificacion", "alumbrado publico", "luminaria", "subestacion", "red de media tension"], familias: ["7215", "3911", "3912", "8110"], unidad_dominante: "ml" },
  "DRA-CAU": { nombre: "Dragado y limpieza de cauces", anclas: ["dragado", "limpieza de cauce", "canal", "rectificacion"], familias: ["7215", "7712"], unidad_dominante: "m3" },
  "CON-EST": { nombre: "Consultoría, estudios y diseños", anclas: ["interventoria", "estudios y disenos", "consultoria", "supervision tecnica"], familias: ["8110", "8114", "8115", "8010"], unidad_dominante: "mes" },
};

const CODIGOS_TIPOLOGIA = Object.keys(TIPOLOGIAS);

/* ══════════════════ 2 · Ítems del catálogo ══════════════════ */
/* Se carga con `require` igual que `data/vocabulario_unspsc.json` en
   lib/texto_unspsc.js, y por el mismo motivo: viaja en el repositorio y no
   necesita ni Redis ni red para funcionar desde el primer despliegue. */
const CATALOGO = require("../data/catalogo_apu.json");

const ITEMS = Object.freeze((CATALOGO.items || []).map((it) => Object.freeze({
  codigo_item: it.codigo_item,
  descripcion: it.descripcion,
  unidad: it.unidad,
  tipologias: Object.freeze([...(it.tipologias || [])]),
  sinonimos: Object.freeze([...(it.sinonimos || [])]),
  articulo_invias_candidato: it.articulo_invias_candidato || null,
})));

const POR_CODIGO = new Map(ITEMS.map((it) => [it.codigo_item, it]));

/* ═══════════ EL CÓDIGO INV, YA CONTRASTADO CONTRA EL ÍNDICE OFICIAL ════════
   Durante meses esto devolvía `verificado: false` sobre TODOS los ítems, porque
   el índice de las Especificaciones (Res. 4561/2022) se daba por inalcanzable
   (403) y publicar un número de artículo sin confirmarlo es publicar una clave
   inventada. La resolución SÍ se puede abrir —la URL había cambiado— y sus 105
   artículos están en `data/invias_articulos.json`, así que ahora el candidato
   se CONTRASTA en vez de suponerse.

   QUÉ SIGNIFICA EXACTAMENTE `verificado: true`, porque es fácil leer de más:
   que ESE ARTÍCULO EXISTE en la norma vigente y que este es su TÍTULO OFICIAL.
   NO significa que la unidad de pago esté confirmada — el índice trae capítulo,
   número y título, y NADA MÁS. Las unidades siguen sin verificar y así lo dice
   `unidad_verificada: false`. Prometer más sería repetir, con una etiqueta
   nueva, el error que esta función existía para no cometer.

   Por eso el TÍTULO OFICIAL VIAJA PEGADO al código (R10): quien lo lea puede
   comprobar el encaje —«¿mi *Excavación manual en material común* es de verdad
   el 600, *Excavaciones varias*, o es el 210, *Excavación de la explanación*?»—
   sin abrir la resolución. Un puntaje de confianza inventado aquí sería PEOR
   que el título literal: se leería como una medición. */
let INDICE_INVIAS = null;
function indiceInvias() {
  if (INDICE_INVIAS) return INDICE_INVIAS;
  let arts = [];
  try { arts = require("../data/invias_articulos.json").articulos || []; } catch { arts = []; }
  INDICE_INVIAS = new Map(arts.map((a) => [Number(a.numero), a]));
  return INDICE_INVIAS;
}

function codigoInviasPropuesto(item) {
  if (!item || !item.articulo_invias_candidato) return null;
  const variante = String(item.codigo_item).replace(/^LOC-/, "").replace(/[^A-Z0-9]/gi, "").toUpperCase();
  const art = indiceInvias().get(Number(item.articulo_invias_candidato));
  if (!art) {
    /* El candidato NO está en la norma vigente: puede venir de una edición
       anterior o ser un error de transcripción. Se dice cuál es el problema en
       vez de emitir un código con un artículo que no existe. */
    return {
      codigo: null,
      articulo: null,
      verificado: false,
      motivo: `El artículo ${item.articulo_invias_candidato} no aparece en las Especificaciones vigentes `
        + "(Res. 4561/2022). Puede ser de una edición anterior: confirmarlo antes de citarlo.",
    };
  }
  return {
    // el artículo se cita como lo cita la norma: «630-22», no «630» a secas
    codigo: `INV-${art.articulo}-${variante}`,
    articulo: art.articulo,
    titulo_oficial: art.titulo,
    capitulo: art.capitulo,
    verificado: true,
    /* La NUMERACIÓN sí; la UNIDAD DE PAGO no — no está en el índice. */
    unidad_verificada: false,
    fuente: "INVIAS · Res. 4561 de 29/11/2022 (data/invias_articulos.json)",
  };
}

/* ¿Este ítem pertenece a alguna de estas tipologías?
   Se usa como PESO en el mapeo (lib/apu_mapeo), nunca como filtro. Filtrar el
   catálogo por la tipología del proceso parecía la opción precisa y es un error
   medido: en un proceso de placa huella (VIA-PH), la fila «SUMINISTRO E
   INSTALACIÓN DE TUBERÍA PVC» —el cruce de drenaje, que casi siempre está—
   caía a «personalizado» porque `LOC-RED-TUBPVC` no figura en VIA-PH. Un
   presupuesto de obra mezcla tipologías por construcción, así que la tipología
   es CONTEXTO que inclina, no una lista de materiales cerrada. */
function itemEnTipologias(item, codigos) {
  if (!item || !codigos || !codigos.length) return false;
  const set = new Set(codigos.filter((c) => TIPOLOGIAS[c]));
  if (!set.size) return false;
  return item.tipologias.some((t) => set.has(t));
}

/* ══════════════════ 3 · Tipología del proceso ══════════════════ */
/* Nivel A del clasificador de §1.D.2, en su forma mínima: léxico determinista
   con puntaje sobre `norm(objeto)`. NO se implementan aquí el Nivel B (UNSPSC
   como evidencia independiente, que «rara vez decide solo» y cuyo valor real es
   VETAR) ni el Nivel C (LLM de desempate): esta capa solo necesita ACOTAR los
   candidatos del mapeo, no producir un veredicto de tipología, y un clasificador
   a medias presentado como completo sería peor que ninguno.

   Las familias UNSPSC del proceso se usan como refuerzo suave —suman, nunca
   vetan— por la misma razón: 7215 y 7214 son compatibles con casi todo. */
function tipologiasProbables(objeto, codigosUnspsc = []) {
  const t = ` ${norm(objeto)} `;
  const familias = new Set((codigosUnspsc || [])
    .map((c) => String(c || "").replace(/\D/g, ""))
    .filter((c) => c.length >= 4)
    .map((c) => c.slice(0, 4)));

  const puntajes = [];
  for (const codigo of CODIGOS_TIPOLOGIA) {
    const tip = TIPOLOGIAS[codigo];
    let puntaje = 0;
    const evidencia = [];
    for (const ancla of tip.anclas) {
      if (t.includes(` ${ancla}`) || t.includes(`${ancla} `) || t.includes(ancla)) {
        puntaje += 3;
        evidencia.push(ancla);
      }
    }
    if (puntaje && tip.familias.some((f) => familias.has(f))) puntaje += 1;
    if (puntaje) puntajes.push({ tipologia: codigo, nombre: tip.nombre, puntaje, evidencia });
  }
  puntajes.sort((a, b) => b.puntaje - a.puntaje || a.tipologia.localeCompare(b.tipologia));
  return puntajes;
}

module.exports = {
  TIPOLOGIAS, CODIGOS_TIPOLOGIA, ITEMS, POR_CODIGO,
  META_CATALOGO: CATALOGO._meta,
  itemEnTipologias, tipologiasProbables, codigoInviasPropuesto,
};
