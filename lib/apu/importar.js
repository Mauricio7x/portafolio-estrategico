/* ============================================================================
   lib/apu/importar · Filas de un Excel importado → ítems del catálogo de PRECIOS
   ----------------------------------------------------------------------------
   El usuario sube su formulario de cantidades (xlsx/csv ya parseado en el
   NAVEGADOR: aquí llegan filas estructuradas, jamás el archivo). Este módulo
   decide, fila a fila, si esa descripción corresponde a un ítem del catálogo de
   precios (`data/apu_catalogo.json`, hoy con los 157 APU adjudicados del Nogal)
   y con qué confianza.

   NO ES UN SEGUNDO MAPEADOR. Las primitivas —tokenización que CONSERVA los
   dígitos, similitud de edición, umbrales, margen sobre el segundo candidato—
   se IMPORTAN de `lib/apu_mapeo`, que ya decidió todo eso para el lector de
   pliegos y documentó por qué («RDE 21 frente a RDE 41 mueve el precio»). Dos
   definiciones de «se parecen» divergirían a la primera corrección aplicada a
   una sola. Lo único propio de aquí es contra QUÉ catálogo se compara (el de
   precios, que no tiene sinónimos curados: se puntúa contra su descripción) y
   la política de PRECIOS:

   · Fila con precio EN EL ARCHIVO → ese precio manda SIEMPRE (`precio_manual`,
     `origen_precio: "archivo"`): es el dato del usuario. Si además casa con el
     catálogo, viaja `item_id` y el motor publicará `cd_catalogo` para que la
     diferencia SE VEA, no para pisarla.
   · Fila sin precio y con mapeo → el precio sale del catálogo (la razón de ser
     de la calibración).
   · Fila sin precio y sin mapeo → ítem personalizado SIN precio: el motor la
     deja en `incompleto` («sin dato»), jamás en 0, y el Excel la marca.

   El falso positivo cuesta más que el falso negativo (la regla del módulo APU):
   un mapeo que no llega a «firme» se marca `revisar` y la interfaz y el Excel
   lo enseñan en ámbar — se usa, pero nunca en silencio.
   ========================================================================== */
"use strict";

const { norm } = require("../semantica.js");
const {
  terminosItem, similitudEdicion,
  UMBRAL_ACEPTAR, UMBRAL_FIRME, MARGEN_FIRME, MIN_COINCIDENCIAS_FIRME,
  PESO_TERMINOS, PESO_EDICION, PESO_UNIDAD,
} = require("../apu_mapeo.js");

/* ══════════════════ 1 · Unidad canónica ══════════════════
   Los archivos escriben «UND», «Un», «M», «ML», «GBL», «global»… La unidad no
   se CONVIERTE jamás (m2→m3 exigiría un espesor); solo se normaliza la GRAFÍA
   para poder comparar. `m` y `ml` son la misma unidad de pago (metro lineal) en
   todo formulario de obra; `m2`/`m²` ídem. */
const UNIDAD_EQUIV = {
  m: "ml", ml: "ml", mt: "ml", mts: "ml", metro: "ml",
  m2: "m2", m3: "m3",
  und: "und", un: "und", u: "und", unidad: "und", unid: "und",
  glb: "glb", gbl: "glb", global: "glb", gl: "glb",
  dia: "dia", kg: "kg", kgs: "kg", ton: "ton", viaje: "viaje",
  pto: "pto", punto: "pto", hora: "hora", hr: "hora",
  gal: "gal", galon: "gal", saco: "saco", lb: "lb", l: "l", lt: "l", litro: "l",
  /* Unidades COMPUESTAS de los ítems de pago del INVIAS (transporte y
     estructuras): sin entrada propia, «m3-km» caía por la regla de «primera
     parte antes del dígito» en `m` → «ml», o sea, otra unidad. */
  m3km: "m3-km", kgkm: "kg-km", tfm: "tf-m", tonkm: "ton-km", m3e: "m3-e", ha: "ha",
};

function unidadCanonica(u) {
  if (u == null) return null;
  const t = norm(String(u)).replace(/²/g, "2").replace(/³/g, "3").replace(/[^a-z0-9]/g, "");
  if (!t) return null;
  if (UNIDAD_EQUIV[t]) return UNIDAD_EQUIV[t];
  /* «saco 50 kg» → saco. Pero el respaldo «lo que va antes del primer dígito»
     NO puede aplicarse cuando lo que sigue al dígito aporta DIMENSIÓN: «m2/mes»
     y «m2-dia» daban `m` → «ml», o sea metro lineal, y con ello la señal de
     unidad (0,13, por encima del margen de «firme») se otorgaba entre
     dimensiones distintas y `unidad_discrepante` salía false. No es hipotético:
     los ítems 10554-10557 del propio banco IDU se pagan por m²/mes y m²/día. Si
     tras el dígito queda más texto, la unidad es COMPUESTA y se conserva tal
     cual —no se inventa—, que es lo que ya se hizo a mano con «m3-km». */
  const m = /^([a-z]+)(\d+)(.+)$/.exec(t);
  if (m && UNIDAD_EQUIV[m[1] + m[2]]) return t;   // «m2»+«mes» → compuesta, no «m»
  const primera = t.split(/\d/)[0];
  return UNIDAD_EQUIV[primera] || t;              // «saco»+«50kg» → saco (especificación)
}

/* ══════════════════ 2 · Puntaje contra el catálogo de precios ══════════════
   PLURAL TOLERADO, aplicado a los DOS lados. `apu_mapeo` no lo necesita porque
   su catálogo de reconocimiento trae sinónimos curados (con singular y plural
   escritos a mano); el catálogo de precios no tiene sinónimos, y sin esta capa
   «Desmonte de Cielo Raso» no casaba con «DESMONTES DE CIELO RASOS» — el mismo
   motivo por el que el clasificador de tipologías compara con plural tolerado.
   Solo se recorta la S/ES final de tokens de letras (≥4): un número («350») no
   se toca. */
const singular = (t) => {
  if (/\d/.test(t) || t.length < 4) return t;
  if (t.endsWith("es") && t.length >= 5) return t.slice(0, -2);
  if (t.endsWith("s")) return t.slice(0, -1);
  return t;
};
const singularizar = (tokens) => [...new Set(tokens.map(singular))];

function puntuarContraCatalogo(terminos, unidadCan, itemCat) {
  const propios = itemCat._terminos || singularizar(terminosItem(itemCat.descripcion));
  const setPropios = itemCat._set || new Set(propios);
  const coincidencias = terminos.filter((t) => setPropios.has(t));
  const porTerminos = terminos.length ? coincidencias.length / terminos.length : 0;
  const porEdicion = similitudEdicion(terminos, propios);
  const unidadIgual = unidadCan != null && unidadCan === unidadCanonica(itemCat.unidad);
  const score = PESO_TERMINOS * porTerminos + PESO_EDICION * porEdicion
    + PESO_UNIDAD * (unidadIgual ? 1 : 0);
  return { score, coincidencias, unidadIgual, porTerminos, porEdicion };
}

/* ══════════════════ 3 · Mapeo de las filas importadas ══════════════════
   Un número que llega como TEXTO se lee con `numeroColombiano` (lib/apu_pliego,
   la única autoridad del formato: el punto separa MILES). El parser ingenuo
   `replace(",", ".")` leía «74.596» como 74,596 pesos — mil veces menos, la
   familia del defecto «375.0000» que este repo ya pagó. Por la interfaz las
   celdas llegan numéricas; esta puerta existe porque la acción es una API. */
const { numeroColombiano } = require("../apu_pliego.js");
const numeroONull = (v) => {
  if (v === null || v === undefined || v === "") return null;
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  return numeroColombiano(String(v));
};

/* Quita los avisos que la hoja «Presupuesto» exportada cuelga al final de la
   descripción. Se anclan a DOS espacios + el emoji, que es exactamente como los
   escribe `public/apu_libro.js`: una descripción real no lleva ese patrón, y
   exigir los dos espacios evita llevarse por delante un emoji que alguien haya
   escrito de verdad en el nombre de un ítem. */
const MARCADOR_EXPORTADO_RE = /\s{2,}(?:⛔|⚠️|⚠|🔵)[\s\S]*$/u;
const sinMarcadores = (texto) => String(texto || "").replace(MARCADOR_EXPORTADO_RE, "").trim();

/* ══════════════ 3-bis · Precio de tienda para la fila importada ═════════════
   Encargo del dueño (ago 2026): al pegar el Excel, una columna con el precio
   de Homecenter (o de donde salió) Y su fuente. La referencia es por INSUMO
   (lib/apu/retail): aquí se casa la DESCRIPCIÓN de la fila contra los insumos
   que tienen captura retail — «CEMENTO GRIS 50KG» → cemento_gris_50kg →
   Homecenter $32.500 (Bogotá, 14-ago). Es una REFERENCIA con su fuente pegada,
   jamás un precio que entre al cálculo, y por eso el umbral es el de ACEPTAR
   con el producto LITERAL visible: quien mira la columna ve exactamente qué
   producto de tienda es, y puede descartarlo en un segundo.

   Se puntúa con las MISMAS primitivas del mapeo (tokens con dígitos, similitud
   de edición, unidad canónica): una segunda definición de «se parecen» aquí
   divergiría de la del catálogo a la primera corrección. */
function candidatosRetail(catalogo) {
  const retail = require("./retail.js");
  return ((catalogo && catalogo.insumos) || [])
    .map((ins) => ({ ins, refs: ins ? retail.referenciasRetail(ins.id) : null }))
    .filter(({ refs }) => refs !== null)
    .map(({ ins, refs }) => {
      /* El vocabulario del candidato incluye el NOMBRE DEL PRODUCTO de la
         tienda, no solo el del insumo: el catálogo dice «Acero de refuerzo
         60.000 PSI» y la fila del Excel dice «VARILLA CORRUGADA 1/2» — que es
         exactamente como se llama el producto en Homecenter. Sin esto la
         columna quedaba vacía justo en las filas escritas con el nombre
         comercial, que son la mayoría. */
      const textos = [ins.nombre, ...refs.map((r) => r.producto).filter(Boolean)].join(" ");
      const t = singularizar(terminosItem(textos));
      return { id: ins.id, nombre: ins.nombre, unidad: ins.unidad, _terminos: t, _set: new Set(t) };
    });
}

function referenciaTiendaDe(descripcion, unidad, catalogo, departamento, candidatos = null) {
  const retail = require("./retail.js");
  const lista = candidatos || candidatosRetail(catalogo);
  const terminos = singularizar(terminosItem(sinMarcadores(String(descripcion || ""))));
  if (!terminos.length || !lista.length) return null;
  const unidadCan = unidadCanonica(unidad);
  let mejor = null;
  for (const c of lista) {
    const p = puntuarContraCatalogo(terminos, unidadCan, { _terminos: c._terminos, _set: c._set, unidad: c.unidad });
    if (!mejor || p.score > mejor.score) mejor = { ...p, insumo: c };
  }
  if (!mejor || mejor.score < UMBRAL_ACEPTAR || !mejor.coincidencias.length) return null;
  const refs = retail.referenciasRetail(mejor.insumo.id, departamento);
  if (!refs) return null;
  return {
    via: "descripcion",                       // casó por el texto de la fila
    insumo_id: mejor.insumo.id,
    insumo: mejor.insumo.nombre,
    confianza: Math.round(mejor.score * 1000) / 1000,
    refs,
  };
}

/* Los 526 APU de referencia del INVIAS, tokenizados UNA vez por proceso: su
   descripción no cambia (viene de un JSON del repositorio), y tokenizarlos en
   cada importación son 526 × N filas de trabajo repetido. */
let _inviasPreparados = null;
function candidatosInvias() {
  if (!_inviasPreparados) {
    const I = require("./invias_items.js");
    _inviasPreparados = I.comoItemsDeCatalogo().map((it) => {
      /* La descripción INVIAS es CABECERA + paréntesis explicativo largo
         («SUB-BASE GRANULAR CLASE A (Analizada para tipo de gradación SGB-50…,
         CBR ≥ 40 %, nivel de tránsito NT3, para capas compactas…)»). Los
         términos del paréntesis SÍ cuentan como coincidencias (`_set`: ahí
         viven los 28 MPa o el fy que distinguen dos ítems), pero la similitud
         de EDICIÓN se mide contra la cabecera (`_terminos`): medida contra el
         texto entero, un paréntesis largo penaliza al ítem correcto frente a
         un pariente de paréntesis corto —«SUB-BASE GRANULAR PARA BACHEO CLASE
         A» ganaba a «SUB-BASE GRANULAR CLASE A» solo por eso—. */
      const todos = singularizar(terminosItem(it.descripcion));
      const cabecera = singularizar(terminosItem(String(it.descripcion || "").split("(")[0]));
      return { ...it, _terminos: cabecera.length ? cabecera : todos, _set: new Set(todos) };
    });
  }
  return _inviasPreparados;
}

/* Los 440 APU de referencia de EPC (Cundinamarca), tokenizados una vez. */
let _epcPreparados = null;
function candidatosEpc() {
  if (!_epcPreparados) {
    const E = require("./epc_items.js");
    _epcPreparados = E.comoItemsDeCatalogo().map((it) => {
      const todos = singularizar(terminosItem(it.descripcion));
      const cabecera = singularizar(terminosItem(String(it.descripcion || "").split("(")[0]));
      return { ...it, _terminos: cabecera.length ? cabecera : todos, _set: new Set(todos) };
    });
  }
  return _epcPreparados;
}

/* Los 3 172 APU de referencia del IDU (Bogotá), tokenizados una vez. */
let _iduPreparados = null;
function candidatosIdu() {
  if (!_iduPreparados) {
    const I = require("./idu_items.js");
    _iduPreparados = I.comoItemsDeCatalogo().map((it) => {
      /* Como el INVIAS: cabecera para la similitud de edición, texto entero
         para las coincidencias («SARDINEL TIPO A10 (SUMINISTRO E INSTALACIÓN.
         INCLUYE 3CM MORTERO 1:5)» y sus dos hermanas comparten cabecera). */
      const todos = singularizar(terminosItem(it.descripcion));
      const cabecera = singularizar(terminosItem(String(it.descripcion || "").split("(")[0]));
      return { ...it, _terminos: cabecera.length ? cabecera : todos, _set: new Set(todos) };
    });
  }
  return _iduPreparados;
}

/* Los 1 042 ítems de edificación del FFIE, tokenizados una vez. */
let _ffiePreparados = null;
function candidatosFfie() {
  if (!_ffiePreparados) {
    const F = require("./ffie_items.js");
    _ffiePreparados = F.comoItemsDeCatalogo().map((it) => {
      const todos = singularizar(terminosItem(it.descripcion));
      const cabecera = singularizar(terminosItem(String(it.descripcion || "").split("(")[0]));
      return { ...it, _terminos: cabecera.length ? cabecera : todos, _set: new Set(todos) };
    });
  }
  return _ffiePreparados;
}

/* Los 1 234 ítems del ICCU (Cundinamarca), tokenizados una vez. */
let _iccuPreparados = null;
function candidatosIccu() {
  if (!_iccuPreparados) {
    const I = require("./iccu_items.js");
    _iccuPreparados = I.comoItemsDeCatalogo().map((it) => {
      const todos = singularizar(terminosItem(it.descripcion));
      const cabecera = singularizar(terminosItem(String(it.descripcion || "").split("(")[0]));
      return { ...it, _terminos: cabecera.length ? cabecera : todos, _set: new Set(todos) };
    });
  }
  return _iccuPreparados;
}

/**
 * @param {Array}  filas    [{codigo?, descripcion, unidad?, cantidad?, precio_archivo?, capitulo?}]
 * @param {object} catalogo forma de la SEMILLA ({items:[{codigo, descripcion, unidad, …}]})
 * @param {object} opciones {departamento, sinInvias} — el departamento resuelve el precio de tienda de la capital;
 *                          `sinInvias` deja fuera los APU INVIAS (solo para medir/probar el mapeo contra el catálogo solo)
 */
function mapearFilasImportadas(filas, catalogo, opciones = {}) {
  const departamento = (opciones && opciones.departamento) || null;
  const candidatosTienda = candidatosRetail(catalogo);
  /* A4 · EL PRECIO DE CADA VARIANTE, para que el usuario pueda ver lo que se
     juega al elegir una u otra. «CONCRETO CLASE D 3000 PSI» empata EXACTAMENTE
     con sus 9 hermanos del ICCU y decide `localeCompare` sobre el código; con
     numerales de coma («4,10» < «4,6») gana el numeral alto, que en esa familia
     es *(vigas en puentes)*: $1.183.877 contra $834.999 de *(bases)*, +42 % y
     $62.798.040 en una fila de 180 m³. Hasta ahora las variantes se publicaban
     SIN precio, así que «hay 9 variantes» no decía nada de lo que estaba en juego.
     NO se toca el nivel de confianza ni el desempate: degradar por empate choca
     con una decisión ya tomada y medida («las variantes de la misma cabecera no
     degradan a revisar»), y un umbral de precio degradaría el 52,8 % de las
     familias INVIAS (medido). Lo que faltaba era INFORMACIÓN, no una regla.
     Se cotiza con `cotizarItem` —la definición ÚNICA de cómo se cotiza un ítem;
     un dispatcher propio por banco sería una segunda— con `require` diferido y
     memoizado por código: medido, 720 cotizaciones en caliente cuestan 29 ms
     frente a los ~2 800 ms que tarda el mapeo de 300 filas. Un precio 0 o
     ausente viaja como `null`, jamás como cero (R1). */
  const _precioCache = new Map();
  const precioDe = (codigo) => {
    const k = String(codigo || "");
    if (_precioCache.has(k)) return _precioCache.get(k);
    let p = null;
    try {
      const { cotizarItem } = require("./precios.js");
      const r = cotizarItem({ item_id: k, cantidad: 1 }, { cat: catalogo, departamento });
      p = r && Number.isFinite(r.precio_unitario) && r.precio_unitario > 0 ? r.precio_unitario : null;
    } catch { p = null; }
    _precioCache.set(k, p);
    return p;
  };
  const items = (catalogo && catalogo.items) || [];
  // los términos del catálogo se calculan UNA vez, no una por fila × ítem
  const preparados = items.map((it) => {
    const t = singularizar(terminosItem(it.descripcion));
    return { ...it, _terminos: t, _set: new Set(t) };
  });
  /* Los APU de referencia del INVIAS entran como candidatos JUNTO al catálogo
     (ago 2026): son los que dan precio a un presupuesto de obra vial que el
     catálogo (174 ítems) no alcanza. Van DESPUÉS en la lista y en un empate
     exacto de puntaje gana el catálogo —un precio de contrato adjudicado sobre
     una referencia oficial—; el orden se fija en el sort, no por casualidad. */
  const conInvias = !(opciones && opciones.sinInvias);
  const todos = conInvias ? preparados.concat(candidatosInvias(), candidatosEpc(), candidatosIdu(), candidatosFfie(), candidatosIccu()) : preparados;

  /* ═══ FAMILIA de un candidato, para el MARGEN sobre el segundo ═══════════
     El margen protege de elegir entre dos ítems DISTINTOS parecidos (RDE 21
     frente a RDE 41). El banco INVIAS trae 194 ítems que comparten CABECERA y
     solo difieren en el paréntesis (SUB-BASE GRANULAR CLASE A «gradación
     SBG-50» / «SBG-38»): entre esos, el margen sería siempre ~0 y todo lo
     vial caería a «revisar» aunque el ítem esté clarísimo. Y los 12 `INV-*` del
     catálogo son ESTIMACIONES hechas para el artículo INVIAS que llevan en el
     código, no un ítem distinto del oficial del mismo artículo. Por eso el
     «segundo» que mide el margen es el mejor candidato de OTRA familia:
       · INVIAS  → su cabecera normalizada (antes del paréntesis) + su artículo
       · INV-*   → su artículo (`INV-210.1` ↔ artículo 210)
       · resto   → su propia descripción
     Las variantes INVIAS de la misma cabecera se PUBLICAN (`variantes`) para
     que la vista previa las enseñe: se toma la primera por código, y se dice. */
  /* DE QUÉ BANCO SALE EL CANDIDATO, y son CINCO (ago 2026). Solo se nombraban
     INVIAS e IDU; EPC, FFIE e ICCU caían en «catalogo», que en la vista previa
     se lee «catálogo» — o sea, el contrato adjudicado del dueño. Con el FFIE es
     lo más grave: su precio es un TOPE que la memoria del proyecto exige rotular
     como tal EN TODAS PARTES donde se enseña, porque el contrato real del propio
     dueño está por encima. Aquí es donde la persona ACEPTA el mapeo. */
  const bancoDe = (it) => (it.es_invias ? "invias"
    : it.es_idu ? "idu"
      : it.es_epc ? "epc"
        : it.es_ffie ? "ffie"
          : it.es_iccu ? "iccu" : "catalogo");
  const BANCOS_OFICIALES = new Set(["invias", "idu", "epc", "ffie", "iccu"]);

  const familiaDe = (it) => {
    /* Los dos bancos OFICIALES comparten la clave de familia por cabecera: el
       mismo ítem existe en el INVIAS y en el IDU («SUBBASE GRANULAR CLASE C»)
       y no son dos ítems distintos entre los que haya que dudar, sino dos
       fuentes del mismo — cuál gana lo decide el departamento (`rango`). */
    if (it.es_idu || it.es_epc || it.es_ffie || it.es_iccu) return { clave: `oficial:${norm(String(it.descripcion || "").split("(")[0])}`, articulo: null };
    if (it.es_invias) {
      const cab = norm(String(it.descripcion || "").split("(")[0]);
      const art = String(it.item_de_pago || "").split(",")[0].trim();
      return { clave: `oficial:${cab}`, articulo: art || null };
    }
    const m = /^INV-(\d+)/.exec(String(it.codigo || ""));
    return { clave: `cat:${norm(String(it.descripcion || ""))}`, articulo: m ? m[1] : null };
  };
  const mismaFamilia = (a, b) => a.clave === b.clave || (!!a.articulo && a.articulo === b.articulo);
  /* desempate a puntaje IGUAL: catálogo (contrato/derivación) > banco oficial
     LOCAL > el otro banco oficial > estimación del catálogo. «Local» depende
     de la obra: en Bogotá manda el IDU (precio de la ciudad); fuera, el INVIAS
     (regionalizado por provincia; el IDU es precio de Bogotá sin ajuste). */
  const sinTildes = String(departamento || "").normalize("NFD").replace(/[̀-ͯ]/g, "");
  /* el nombre O el código DANE: el desplegable del editor manda el NOMBRE, pero
     ?departamento= es público y un cliente puede mandar el código — y
     `enCundinamarca` ya aceptaba «25», así que esto era una asimetría. */
  const enBogota = /bogot/i.test(sinTildes) || String(departamento || "").trim() === "11";
  const enCundinamarca = /cundinamarca/i.test(sinTildes) || String(departamento || "").trim() === "25";
  /* «Local» depende de la obra: en Bogotá manda el IDU (precio de la ciudad),
     en Cundinamarca el de EPC (su propio departamento) y en el resto el INVIAS
     (regionalizado por provincia). Los otros bancos oficiales quedan detrás. */
  const rango = (it) => {
    if (it.es_idu) return enBogota ? 1 : 2;
    if (it.es_epc) return enCundinamarca ? 1 : 2;
    /* EL INVIAS ES EL ÚLTIMO RECURSO ENTRE LOS BANCOS (ago 2026, encargo del
       dueño), y el motivo NO es de calidad: es de LICENCIA. Es el único banco
       cuyos documentos «prohíben el uso comercial sin autorización previa»
       (lib/apu/invias_items.meta().licencia), y esa autorización todavía no se
       ha pedido — es un BLOQUEADOR declarado del plan (F0-3). Detekta se va a
       comercializar, así que cuanto menos dependa de esa fuente, menos cuesta
       el día que haya que retirarla: si se cae, el presupuesto sigue saliendo
       por otro banco en vez de quedarse sin precio.
       Va DESPUÉS del FFIE (2,5) y ANTES de una estimación propia (3): sigue
       siendo un dato OFICIAL, y preferir una estimación sobre él sería cambiar
       un hecho por una conjetura, que es peor negocio que el riesgo de licencia.
       OJO CON LO QUE ESTE RANGO **NO** HACE: `rango` solo desempata a PUNTAJE
       IGUAL (ver el `sort`). Si el INVIAS es estrictamente mejor, gana igual —
       y debe ganar: servir a sabiendas un ítem PEOR para no usar una fuente
       sería el falso positivo caro de este módulo, que aquí se paga en pesos.
       «Solo cuando no hay más opciones» significa «cuando ninguna otra fuente
       es igual de buena», no «cuando no queda ninguna».
       Y CEDE SOLO DONDE HAY ALTERNATIVA LOCAL. Fuera de Bogotá y Cundinamarca
       el INVIAS es la ÚNICA fuente con precio regionalizado por provincia: el
       IDU sirve precio de Bogotá «sin ajuste» y el EPC/ICCU de Cundinamarca.
       Preferirlos allí para usar menos INVIAS sería servir el precio de OTRA
       ciudad como si fuera local — inventar el dato, que es justo lo que este
       módulo no puede hacer. Así que el rango baja a 2,8 donde hay con qué
       sustituirlo y se queda en 1 donde no. */
    if (it.es_invias) return enBogota || enCundinamarca ? 2.8 : 1;
    /* El FFIE va DETRÁS de los otros bancos aunque esté regionalizado: es un
       TECHO reconocido por una entidad, no un precio de mercado. */
    if (it.es_iccu) return enCundinamarca ? 1 : 2;
    if (it.es_ffie) return 2.5;
    return it.fuente === "estimado" ? 3 : 0;
  };

  const salida = (filas || []).map((cruda, i) => {
    const fila = cruda || {};
    const descripcion = String(fila.descripcion || "").slice(0, 400).trim();
    const unidad = String(fila.unidad || "").slice(0, 30).trim() || null;
    const unidadCan = unidadCanonica(unidad);
    const cantidad = numeroONull(fila.cantidad);
    const precioArchivo = numeroONull(fila.precio_archivo);
    /* EL MARCADOR DEL EXCEL EXPORTADO NO ES PARTE DE LA DESCRIPCIÓN, y colarlo
       en el tokenizador ENVENENA el mapeo. La hoja «Presupuesto» cuelga avisos
       al final de la descripción («⛔ SIN PRECIO…», «⚠️ Precio no verificado…»)
       y el libro exportado se puede volver a importar con el lector del propio
       proyecto. Medido sobre 60 ítems reales: con el aviso dentro,
       59/60 pierden confianza, 21/60 caen de «firme» a «revisar» y **2/60 se
       mapean a OTRO ítem del catálogo** — o sea, a otro precio. El marcador
       rojo ya lo hacía (3/60 de nivel); el amarillo, que cubre TODA la hoja
       fuera de Bogotá, lo multiplica. Se limpia aquí, en el único sitio donde
       se tokeniza, y no en el exportador: el aviso tiene que seguir viéndose en
       la hoja, que es para lo que existe. */
    const terminos = singularizar(terminosItem(sinMarcadores(descripcion)));

    /* ═══ EL CAPÍTULO DESEMPATA · T7 · herencia de contexto ══════════════════
       El capítulo de la fila YA VIAJABA hasta aquí y solo se copiaba a la
       salida: no entraba en ninguna decisión. Es el dato que la literatura de
       BoQ usa para lo que este mapeo hace peor — «Excavación» no significa lo
       mismo dentro de ALCANTARILLADO que dentro de VÍAS.

       ENTRA COMO DESEMPATE, NO COMO PUNTAJE, y la diferencia es toda la
       seguridad del cambio: concatenar el capítulo a la descripción SUBIRÍA
       puntajes y podría empujar a «firme» un candidato que no lo estaba, y en
       este módulo el falso positivo es el caro (un ítem mal casado es otro
       precio). Aquí solo se mira cuando el puntaje Y el rango de banco ya
       empataron, así que `confianza`, `margen` y `nivel_mapeo` no se mueven un
       dígito: lo único que cambia es CUÁL de los empatados se toma.

       Y ese empate no es teórico: medido sobre filas típicas, 4 de 10 traen
       variantes empatadas, y «CONCRETO CLASE D 3000 PSI» empata con sus 9
       hermanos del ICCU —donde el paréntesis es el ELEMENTO ESTRUCTURAL, con
       +42 % entre el más caro y el más barato (A4)—, así que hasta ahora lo
       decidía `localeCompare` sobre el código, o sea el azar alfabético. */
    const terminosCap = fila.capitulo ? new Set(singularizar(terminosItem(String(fila.capitulo)))) : null;
    const afinCap = (c) => {
      if (!terminosCap || !terminosCap.size || !c) return 0;
      let n = 0;
      for (const t of singularizar(terminosItem(String(c.descripcion || "")))) if (terminosCap.has(t)) n++;
      return n;
    };

    let candidatos = [];
    if (terminos.length) {
      /* Solo se puntúan (con la similitud de edición, que es lo caro) los
         candidatos con AL MENOS UN término en común. Un candidato sin ninguno
         no puede aceptarse (0,22 × edición + 0,13 × unidad ≤ 0,35 solo con
         edición = 1, que implica los mismos términos) ni mover el margen de un
         «firme» (mejor ≥ 0,60 contra un tope de 0,35). Con 3 900 candidatos
         (catálogo + INVIAS + IDU) × 300 filas, la poda baja de 29 s a ~4 s. */
      /* …Y CON DESCRIPCIONES LARGAS UN SOLO TÉRMINO NO PODA NADA (ago 2026).
         Una fila de 17 términos —el fraseo normal de un pliego: «SUMINISTRO,
         INSTALACIÓN Y TRANSPORTE DE … SEGÚN PLANOS Y ESPECIFICACIONES»— dejaba
         pasar cerca de un tercio de los 6 588 candidatos de los cinco bancos
         (media 29 %, hasta 50 % en el peor caso), y 400 filas así tardaban más
         de 60 s: el `maxDuration` de la función. Medido con descripciones
         REALES del propio banco IDU (mediana 113 caracteres, p90 238; 533 de
         sus 3 172 pasan de 200).
         A partir de tres términos se exigen DOS en común. Con una o dos
         palabras se conserva el criterio de siempre, porque ahí exigir dos
         dejaría filas legítimas sin candidato.
         QUÉ CAMBIA Y QUÉ NO, contado exacto: sobre corpus real no cambia NADA
         —300 descripciones de los cinco bancos y las 54 filas del Nogal dan el
         mismo mapeo, de 22,5 s a 8,1 s—, pero decir «no puede cambiar ninguna
         decisión» era falso y una revisión adversaria lo reprodujo: una fila de
         exactamente tres términos, dos de ellos marcas («CANALETA SYLVANIA
         LEGRAND», «PINTURA PINTUCO VINILTEX»), pasa de `revisar` con una
         sugerencia floja (~0,41) a `personalizado` sin ninguna. No hay error de
         dinero —esas nunca fueron `mapeo_automatico`, así que el precio no se
         tomaba solo— y lo que se pierde es la casilla que el usuario podía
         aceptar en la vista previa; a cambio, la acción no se cae por tiempo.
         Si algún día hay que recuperar esas sugerencias, lo que se acota es el
         Levenshtein, NO la poda.
         MEDIDO tras el cambio, con 400 filas (el tope de la acción): 12 s con la
         mezcla real de descripciones de los cinco bancos (mediana 82 caracteres,
         p90 216) y 47 s en el peor caso artificial —las 400 de 200+ caracteres—,
         contra los ~110 s de antes. El `maxDuration` son 60 s, así que ese peor
         caso sigue siendo estrecho y queda dicho: si un pliego real lo alcanza,
         lo que hay que acotar es el Levenshtein, que es quien domina (memoizar
         la cadena ordenada del candidato se probó y no movió la cifra), y NO
         volver a aflojar la poda. */
      const minComunes = terminos.length >= 3 ? 2 : 1;
      const comunes = (it) => {
        let n = 0;
        for (const x of terminos) { if (it._set.has(x) && ++n >= minComunes) return true; }
        return false;
      };
      candidatos = todos
        .filter(comunes)
        .map((it) => ({ codigo: it.codigo, descripcion: it.descripcion, unidad: it.unidad, fuente_mapeo: bancoDe(it),
          _familia: familiaDe(it), _rango: rango(it), ...puntuarContraCatalogo(terminos, unidadCan, it) }))
        .sort((a, b) => b.score - a.score || a._rango - b._rango
          || afinCap(b) - afinCap(a)
          || String(a.codigo).localeCompare(String(b.codigo)));
    }
    const mejor = candidatos[0] || null;
    // el segundo que mide el margen es el mejor de OTRA familia (ver arriba)
    const segundo = mejor ? (candidatos.slice(1).find((c) => !mismaFamilia(c._familia, mejor._familia)) || null) : null;
    // variantes INVIAS de la misma cabecera que el elegido, con la misma unidad: se publican, no se esconden
    const variantes = mejor && BANCOS_OFICIALES.has(mejor.fuente_mapeo)
      ? candidatos.slice(1).filter((c) => c.fuente_mapeo === mejor.fuente_mapeo && c._familia.clave === mejor._familia.clave)
        .map((c) => ({ codigo: c.codigo, descripcion: c.descripcion, unidad: c.unidad, precio: precioDe(c.codigo) }))
      : [];
    const acepta = mejor && mejor.score >= UMBRAL_ACEPTAR;
    const margen = mejor ? (segundo ? mejor.score - segundo.score : mejor.score) : 0;
    /* «Firme» por margen (la regla de siempre) O por COBERTURA TOTAL: si TODOS
       los términos de la fila (≥ 3) están en el candidato, la unidad coincide y
       el puntaje es ≥ 0,85, el segundo de otra familia solo puede ser un
       pariente que comparte casi todo («SUBBASE GRANULAR CLASE C» frente a
       «CLASE B»: 0,90 contra 0,795, margen 0,105 < 0,12) — y ese pariente
       PIERDE precisamente el término que la fila sí trae. Medido con los tres
       bancos juntos (catálogo + INVIAS + IDU); sin esta vía, todo ítem con
       hermanos por clase caía a «revisar» y quedaba sin precio hasta marcar la
       casilla. Sigue exigiendo ≥ 3 términos: una fila de dos palabras cabe en
       demasiadas descripciones. */
    const coberturaTotal = acepta && terminos.length >= 3 && mejor.coincidencias.length === terminos.length
      && mejor.unidadIgual && mejor.score >= 0.85;
    const firme = acepta && mejor.score >= UMBRAL_FIRME && mejor.coincidencias.length >= MIN_COINCIDENCIAS_FIRME
      && (margen >= MARGEN_FIRME || coberturaTotal);

    const nivel = !acepta ? "personalizado" : firme ? "firme" : "revisar";
    const conPrecioArchivo = precioArchivo !== null && precioArchivo > 0;

    /* LA REGLA DEL PRECIO AUTOMÁTICO: un mapeo «revisar» SIN precio del archivo
       NO cobra el precio del catálogo por su cuenta. Medido con el caso real:
       la fila «PENDIENTE-POSIBLE USO DE RIEL Y LUMINARIA SYLVANIA» (cantidad
       24, sin precio) alcanzaba 0,37 contra una luminaria del catálogo y salía
       presupuestada en $2,9 M inventados. El ítem viaja como SUGERENCIA
       (`item_id` con su confianza) y el usuario lo acepta en la vista previa;
       mientras tanto la fila queda «sin precio», que es la verdad. Es la regla
       del lector de pliegos: nunca se usa automáticamente una lista a medias. */
    const mapeoAutomatico = acepta && (firme || conPrecioArchivo);

    return {
      orden: i + 1,
      codigo_archivo: String(fila.codigo || "").slice(0, 30) || null,
      capitulo: String(fila.capitulo || "").slice(0, 160) || null,
      descripcion,
      unidad,
      cantidad,                                  // null si no se pudo leer: NUNCA 0
      precio_archivo: conPrecioArchivo ? precioArchivo : null,
      item_id: acepta ? mejor.codigo : null,
      // el precio del ítem ELEGIDO, para poder compararlo con el de sus variantes
      precio_item: acepta ? precioDe(mejor.codigo) : null,
      nivel_mapeo: nivel,
      confianza: mejor ? Math.round(mejor.score * 1000) / 1000 : 0,
      margen: Math.round(margen * 1000) / 1000,
      coincidencias: mejor && acepta ? mejor.coincidencias : [],
      descripcion_catalogo: acepta ? mejor.descripcion : null,
      unidad_catalogo: acepta ? mejor.unidad : null,
      // de qué banco salió el candidato: «catalogo» (Nogal/semilla) o «invias» (APU de referencia oficial)
      fuente_mapeo: acepta ? mejor.fuente_mapeo : null,
      // otras variantes INVIAS de la misma cabecera (gradación, método…): se tomó la primera por código y se dice
      variantes: acepta ? variantes : [],
      /* El precio de tienda de la fila, con su fuente pegada (o null: la
         ausencia no se rellena). Es la columna que pidió el dueño. */
      referencia_tienda: referenciaTiendaDe(descripcion, unidad, catalogo, departamento, candidatosTienda),
      unidad_discrepante: !!(acepta && unidadCan != null && unidadCan !== unidadCanonica(mejor.unidad)),
      mapeo_automatico: mapeoAutomatico,
      /* la ENTRADA que el editor manda a `calcular`, ya resuelta con la política
         de precios de la cabecera — así el frontend no re-decide nada */
      entrada_calculo: {
        item_id: mapeoAutomatico ? mejor.codigo : null,
        codigo: String(fila.codigo || "").slice(0, 30) || null,   // numeral del archivo (1.1, 2,1,1…)
        descripcion,
        unidad,
        capitulo: String(fila.capitulo || "").slice(0, 160) || null,
        /* La cantidad ILEGIBLE viaja como null, igual que en la fila. Con el
           `?? 0` de antes, una celda que decía «SEGÚN PLANOS» entraba al editor
           como un 0 escrito y el validador la clasificaba en `cantidad_cero`
           («no aportan nada», severidad aviso) en vez de `cantidad_ilegible`
           («una cantidad DESCONOCIDA», severidad atención) — las dos cubetas
           existen precisamente porque no significan lo mismo. */
        cantidad,
        precio_manual: conPrecioArchivo ? precioArchivo : null,
        origen_precio: conPrecioArchivo ? "archivo" : null,
        // subcontrato leído del archivo (columnas opcionales del lector), tal cual
        subcontratado: fila.subcontratado === true,
        aiu_subcontratista_pct: fila.subcontratado === true && numeroONull(fila.aiu_subcontratista_pct) != null ? numeroONull(fila.aiu_subcontratista_pct) : null,
      },
    };
  });

  const firmes = salida.filter((f) => f.nivel_mapeo === "firme").length;
  const revisar = salida.filter((f) => f.nivel_mapeo === "revisar").length;
  const personalizados = salida.filter((f) => f.nivel_mapeo === "personalizado").length;
  return {
    filas: salida,
    resumen_mapeo: {
      total: salida.length,
      firmes, revisar, personalizados,        // las tres categorías SUMAN el total
      mapeados_invias: salida.filter((f) => f.item_id && f.fuente_mapeo === "invias").length,
      mapeados_idu: salida.filter((f) => f.item_id && f.fuente_mapeo === "idu").length,
      // los tres bancos añadidos después también se cuentan: sin su contador
      // desaparecían de la línea de resumen del panel
      mapeados_epc: salida.filter((f) => f.item_id && f.fuente_mapeo === "epc").length,
      mapeados_ffie: salida.filter((f) => f.item_id && f.fuente_mapeo === "ffie").length,
      mapeados_iccu: salida.filter((f) => f.item_id && f.fuente_mapeo === "iccu").length,
      con_precio_archivo: salida.filter((f) => f.precio_archivo != null).length,
      sin_precio_ni_mapeo: salida.filter((f) => f.precio_archivo == null && !f.item_id).length,
      sin_cantidad: salida.filter((f) => f.cantidad == null).length,
      umbral_aceptar: UMBRAL_ACEPTAR, umbral_firme: UMBRAL_FIRME,
    },
  };
}

module.exports = { mapearFilasImportadas, unidadCanonica, UNIDAD_EQUIV, referenciaTiendaDe };
