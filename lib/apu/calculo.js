/* ============================================================================
   lib/apu/calculo · Del costo directo al precio de oferta
   ----------------------------------------------------------------------------
   Toma el catálogo de precios (`lib/apu/catalogo`) y las cantidades de obra, y
   devuelve el presupuesto: desglose por ítem, AIU, ajuste competitivo, margen y
   alertas.

   NO REIMPLEMENTA EL COSTO DIRECTO: llama a `costoDirecto()` de
   `lib/apu/catalogo`, que ya es el punto único donde viven las cuatro fórmulas
   del APU (mano de obra ÷ rendimiento con factor prestacional, materiales con
   desperdicio, equipo ÷ rendimiento, transporte por distancia, más la
   herramienta menor como % de la mano de obra). Un segundo cálculo
   «equivalente hoy» diverge a la primera corrección que se aplique a uno solo —
   es la lección de `total_procesos`/`procesos_contados`, y aquí serían pesos.

   Lo que este módulo añade y aquel no tiene, porque son preguntas distintas:
   CUÁNTAS unidades (el catálogo cotiza el unitario, no la obra), el AIU, la
   baja de mercado, el margen y las alertas.

   ══════════════════ LAS DOS CORRECCIONES A LA FÓRMULA DEL ENCARGO ═══════════

   1 · EL ENCARGO DUPLICABA LA MANO DE OBRA Y EL EQUIPO. Pedía literalmente:

         costo_mano_obra        = (cantidad / rendimiento) · costo_hora · factor
         costo_directo_unitario = suma de los anteriores
         costo_total_item       = costo_directo_unitario · cantidad

       Pero `(cantidad / rendimiento) · costo_hora` ya es el costo TOTAL del
       ítem, no el unitario. Sumarlo a los materiales —que sí van por unidad— y
       volver a multiplicar por `cantidad` cobra la cuadrilla `cantidad` veces:
       en un ítem de 500 m², 500 cuadrillas.

       El APU clásico —y `costoDirecto` del catálogo— calculan el UNITARIO
       (`jornal · factor ÷ rendimiento`), y el total sale multiplicando por la
       cantidad UNA vez. Se obtiene el mismo número que pretendía el encargo
       para el total, y además se cumple la invariante 7 del informe:
       `cantidad × unitario = total` por fila.

   2 · EL AIU SE SUMA, NO SE COMPONE. El encargo pedía
       `CD · (1+aiu) · (1+utilidad) · (1+imprevistos)`, pero AIU **es** el
       acrónimo de Administración + Imprevistos + Utilidad: el parámetro que el
       encargo llama `aiu_pct` es la «A». La convención colombiana —y la de los
       pliegos tipo— es ADITIVA: `CD · (1 + A% + I% + U%)`. Componerlos infla el
       precio (20/5/3 da 29,78 % contra 28 % aditivo) y produce un AIU que no
       coincide con el que declara el formulario de la entidad.

       `modo_aiu: "aditivo"` es el DEFECTO. `"compuesto"` implementa la fórmula
       literal del encargo y sigue disponible: la decisión es del dueño, pero el
       defecto no puede ser el que descuadra contra el pliego.

   ═══════════════════════════ DEGRADACIÓN HONESTA ════════════════════════════

   · Un ítem que no está en el catálogo NO vale 0: sale con `incompleto: true`,
     sus componentes en `null` y el motivo. Un 0 se sumaría al total y lo haría
     creíble — es el `|| 0` sobre un conteo, otra vez.
   · Un departamento sin región cotizada NO recibe la región base en silencio:
     se usa, pero `ajuste_regional.estado` dice `sin_base` y la respuesta lo
     declara. Ver `lib/apu/tipologias.regionDeDepartamento`.
   · `anticipo_pct` aquí SÍ distingue: `null` es «sin dato» y `0` es «sin
     anticipo». Es lo contrario del campo homónimo del corpus de SECOP —donde 0
     significa sin dato— y la diferencia es legítima: aquí lo teclea una persona
     que sabe lo que está diciendo. Se declara en la respuesta.
   ========================================================================== */
"use strict";

const { SEMILLA, costoDirecto } = require("./catalogo.js");
const { regionDeDepartamento } = require("./tipologias.js");

const MODOS_AIU = ["aditivo", "compuesto"];
const IVA_TARIFA = 19;               // tarifa general; la base es la UTILIDAD, no el valor total
const CONTRIBUCION_OBRA_PUBLICA = 5; // Ley 418/1997 y prórrogas — «el olvido más caro del país»
const AIU_ALTO = 35;                 // por encima de esto la entidad suele observar
const FINANCIACION_PCT = 20;         // mismo 20 % de la puerta P3 (lib/puertas): misma pregunta, un solo coeficiente

/* Redondeo a 2 decimales, estable frente al error de coma flotante. Todo lo
   que se PUBLICA pasa por aquí; los intermedios se calculan sin redondear. */
const red = (n) => (Number.isFinite(n) ? Math.round((n + Number.EPSILON) * 100) / 100 : null);

function numero(v, porDefecto = null) {
  if (v === null || v === undefined || v === "") return porDefecto;
  const n = typeof v === "number" ? v : Number(String(v).replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(n) ? n : porDefecto;
}

const acotar = (n, min, max) => Math.min(max, Math.max(min, n));

/* ─────────────────────── configuración normalizada ─────────────────────── */

function normalizarConfig(cruda = {}) {
  const c = cruda || {};
  const avisos = [];

  const modo = MODOS_AIU.includes(c.modo_aiu) ? c.modo_aiu : "aditivo";
  const aiu = acotar(numero(c.aiu_pct, 15), 0, 100);
  const utilidad = acotar(numero(c.utilidad_pct, 5), 0, 100);
  const imprevistos = acotar(numero(c.imprevistos_pct, 5), 0, 100);

  // `null` = sin dato · `0` = sin anticipo. La diferencia se declara.
  const anticipoCrudo = c.anticipo_pct;
  const anticipo = (anticipoCrudo === null || anticipoCrudo === undefined || anticipoCrudo === "")
    ? null : acotar(numero(anticipoCrudo, 0), 0, 50);
  if (anticipo !== null && numero(anticipoCrudo, 0) > 50) {
    avisos.push("El anticipo tiene techo legal del 50 % del valor del contrato: se acotó a 50 %.");
  }

  const aplicarBaja = c.aplicar_ajuste_competitivo === true || c.aplicar_ajuste_competitivo === "true";
  const baja = acotar(numero(c.factor_baja, 0), 0, 60);

  /* Administración por TIEMPO (Manual IDU 2.2.2, Fase 1): gastos fijos
     mensuales ÷ jornada legal × horas del proyecto. Es la OTRA metodología
     además del % sobre costos directos (INVIAS), que sigue siendo la
     predeterminada aquí porque no exige un dato que el usuario no tenga a
     mano: con «tiempo» y sin gastos fijos, la A quedaría en nada. Con
     `metodo_administracion: "tiempo"` la A se DERIVA (A% = admin ÷ CD) y así
     resumen, Excel y PDF —que leen `aiu_pct`— dicen lo mismo por construcción. */
  const metodoAdmin = c.metodo_administracion === "tiempo" ? "tiempo" : "porcentaje";
  const gastosFijos = numero(c.gastos_fijos_mensuales, null);
  const horasProyecto = numero(c.horas_proyecto, null);
  if (metodoAdmin === "tiempo" && !(gastosFijos > 0 && horasProyecto > 0)) {
    avisos.push("Administración por tiempo: faltan los gastos fijos mensuales o las horas del proyecto; se usó el % de administración.");
  }

  return {
    modo_aiu: modo,
    aiu_pct: aiu, utilidad_pct: utilidad, imprevistos_pct: imprevistos,
    metodo_administracion: metodoAdmin === "tiempo" && gastosFijos > 0 && horasProyecto > 0 ? "tiempo" : "porcentaje",
    gastos_fijos_mensuales: gastosFijos > 0 ? gastosFijos : null,
    horas_proyecto: horasProyecto > 0 ? horasProyecto : null,
    anticipo_pct: anticipo,
    aplicar_ajuste_competitivo: aplicarBaja,
    factor_baja: baja,
    deducciones_pct: c.deducciones_pct === undefined || c.deducciones_pct === null || c.deducciones_pct === ""
      ? null : acotar(numero(c.deducciones_pct, 0), 0, 30),
    /* Techo del proceso, para la validación G.5. `null` = no llegó, y entonces
       NO se compara contra nada: inventarle un techo al presupuesto sería
       fabricar el rechazo —o la tranquilidad— de una oferta. */
    cuantia_cop: (() => {
      const n = numero(c.cuantia_cop, null);
      return n != null && n > 0 ? n : null;
    })(),
    _avisos: avisos,
  };
}

/* ─────────────────────── normalización del catálogo ────────────────────
   `obtenerCatalogo(redis)` devuelve los bloques con los nombres del HASH
   (`region`, `insumo`, `precios`) y `costoDirecto` espera los de la SEMILLA
   (`id`, `precio_base`, `precios_cotizados`). Se traduce aquí, en un solo
   sitio, para que el motor no tenga que saber de dónde vino el catálogo.

   Detalle que importa: los `precios` del hash YA están regionalizados (precio
   base × factor, o la cotización real). Entran como `precios_cotizados`, que es
   la rama de `precioEnRegion` que NO vuelve a aplicar el factor — si entraran
   como `precio_base` se multiplicaría dos veces por la región. */
function normalizarCatalogo(bruto) {
  if (!bruto || !Array.isArray(bruto.items) || !bruto.items.length) return null;
  const yaEsSemilla = bruto.items[0] && !("insumo" in (bruto.insumos && bruto.insumos[0] ? bruto.insumos[0] : {}));
  if (yaEsSemilla && bruto.regiones && bruto.regiones[0] && "id" in bruto.regiones[0]) return bruto;

  return {
    _meta: bruto.meta || bruto._meta || {},
    regiones: (bruto.regiones || []).map((r) => ({
      ...r,
      id: r.id || r.region,
    })),
    insumos: (bruto.insumos || []).map((i) => ({
      ...i,
      id: i.id || i.insumo,
      precios_cotizados: i.precios_cotizados || i.precios || {},
    })),
    items: bruto.items || [],
  };
}

/* ───────────────────────────── un ítem del presupuesto ─────────────────── */

function calcularItem(entrada, cat, regionId, preciosUsuario = null, departamento = null, opcionesCosto = {}) {
  const codigo = String((entrada && entrada.item_id) || "").trim();
  /* `itemPorCodigo` y no un `.find()` suelto: traduce los códigos INVIAS
     renumerados, y sin eso un borrador guardado antes de la corrección perdería
     sus ítems en silencio (R11). El require va aquí para no reordenar el grafo
     del módulo. */
  const def = codigo ? require("./catalogo.js").itemPorCodigo(cat, codigo) : null;
  const cantidad = numero(entrada && entrada.cantidad, 0);

  /* ── precio manual: la vía de los ítems importados de un Excel ──────────
     Un presupuesto importado trae ítems que el catálogo no conoce, y a menudo
     su PROPIO precio unitario. Ese precio es un dato del usuario y se respeta
     TAL CUAL, pero se declara: `sin_apu: true` (no hay composición que lo
     respalde) y `origen_precio` («archivo» si vino en el Excel, «manual» si lo
     tecleó). Si además el ítem SÍ casa con el catálogo, `cd_catalogo` publica
     el costo directo de referencia para que la diferencia se VEA — dos precios
     del mismo ítem sin declarar cuál manda es el defecto `cargado`/`cargado_el`
     otra vez. Un precio manual en 0 NO es un precio (la regla de
     `anticipo_pct = 0`): cae a la rama de incompleto. */
  /* El precio manual puede llegar como texto («74.596» de un JSON armado a
     mano): se lee con la convención COLOMBIANA (lib/apu_pliego.numeroColombiano,
     punto = miles), no con `numero()` — que sirve para porcentajes y leería ese
     texto mil veces más pequeño. El require va aquí dentro para no cargar el
     lector de pliegos entero en cada import del módulo. */
  const manualCrudo = entrada && entrada.precio_manual;
  let manual = typeof manualCrudo === "string" && manualCrudo.trim() !== ""
    ? require("../apu_pliego.js").numeroColombiano(manualCrudo)
    : numero(manualCrudo, null);
  let origenManual = (entrada && entrada.origen_precio) === "archivo" ? "archivo" : "manual";

  /* ═══ EL PRECIO QUE ESTE CONTRATISTA YA CORRIGIÓ ANTES ═══════════════════
     `guardar` los aprende en `apu:precios:{perfil}` y le PROMETE al usuario que
     «la próxima vez que uses esos ítems, mandan sobre el catálogo». Esa promesa
     era FALSA: solo `/api/apu/cotizar` los consultaba, y la web llama a
     `calcular`. Un mensaje que anuncia un comportamiento que no ocurre es peor
     que no tener la función — el usuario deja de corregir precios creyendo que
     ya quedaron.

     El precio que se teclea AHORA gana sobre el guardado: es la corrección más
     reciente y el usuario la está viendo.

     Se consulta con `precios.delUsuario` y NO con una lectura propia (R2): ahí
     vive la desambiguación por fecha del código INVIAS reutilizado
     (`INV-661.1` era la cuneta y hoy es la alcantarilla), y una segunda lectura
     que la ignorara aplicaría el precio de una cosa a la otra en silencio. */
  if (manual === null && preciosUsuario && codigo) {
    const r = require("./precios.js").delUsuario(codigo, preciosUsuario);
    if (r.hay) { manual = r.precio; origenManual = "propio"; }
  }
  const descripcionEntrada = String((entrada && entrada.descripcion) || "").slice(0, 400).trim() || null;
  const unidadEntrada = String((entrada && entrada.unidad) || "").slice(0, 30).trim() || null;
  const capituloEntrada = String((entrada && entrada.capitulo) || "").slice(0, 160).trim() || null;

  const codigoArchivo = String((entrada && entrada.codigo) || "").slice(0, 30).trim() || null;

  /* ── EL PRECIO DE TIENDA DE LA FILA, con su fuente pegada ─────────────────
     Encargo del dueño (ago 2026): que la tabla enseñe en una columna cuánto
     vale eso en Homecenter (o de donde haya salido) y de dónde salió. Para un
     ítem del catálogo la referencia sale de su INSUMO de mayor peso con
     captura; para una fila manual o sin precio, del match de su DESCRIPCIÓN
     contra los insumos con captura (misma función que usa la importación —
     dos matchers divergirían). Es una REFERENCIA: jamás entra en el costo. */
  const referenciaTiendaDirecta = () => require("./importar.js")
    .referenciaTiendaDe(descripcionEntrada, unidadEntrada, cat, departamento);

  if (manual !== null && manual > 0) {
    const unit = red(manual);
    const cdCat = def ? costoDirecto(def, cat, regionId, opcionesCosto) : null;
    return {
      item_id: def ? def.codigo : (codigo || null),
      codigo: codigoArchivo,
      descripcion: descripcionEntrada || (def ? def.descripcion : null),
      unidad: unidadEntrada || (def ? def.unidad : null),
      capitulo: capituloEntrada || (def ? def.capitulo : null) || null,
      fuente: null,
      cantidad,
      sin_apu: true,
      // «propio» = precio que este contratista ya había corregido y quedó guardado
      origen_precio: origenManual,
      /* POR QUÉ el precio salió de ahí y no de una fuente mejor. El badge dice
         de dónde vino; esto dice qué se miró antes y por qué no respondió —
         «derivado regional» a secas se lee como un defecto del programa,
         mientras que «todavía no corregiste el precio de este ítem» es una
         instrucción. */
      cascada: require("./precios.js").explicarCascada(codigo, {
        preciosUsuario, enCatalogo: !!def, elegido: origenManual,
      }),
      referencia_tienda: referenciaTiendaDirecta(),
      cd_catalogo: cdCat && !cdCat.error ? cdCat.total : null,
      rendimiento_dia: null,
      rendimiento_es_override: false,
      costo_material_unitario: null,
      costo_mano_obra_unitario: null,
      costo_equipo_unitario: null,
      costo_transporte_unitario: null,
      costo_directo_unitario: unit,
      costo_material_total: null,
      costo_mano_obra_total: null,
      costo_equipo_total: null,
      costo_transporte_total: null,
      costo_total: red(unit * cantidad),
      incompleto: false,
      motivo: null,
      detalle: null,
    };
  }

  if (!def) {
    const tieneDescripcion = !!descripcionEntrada;
    return {
      item_id: codigo || null,
      codigo: codigoArchivo,
      descripcion: descripcionEntrada,
      unidad: unidadEntrada,
      capitulo: capituloEntrada,
      cantidad,
      sin_apu: true,
      origen_precio: null,
      incompleto: true,
      motivo: tieneDescripcion ? "sin_precio" : "item_desconocido",
      mensaje: tieneDescripcion
        ? `«${descripcionEntrada.slice(0, 80)}» no casa con ningún ítem del catálogo y no trae precio: escriba su precio unitario o asígnele un ítem. Sin precio NO suma al total — un 0 sería un precio inventado.`
        : `El ítem «${codigo}» no existe en el catálogo cargado.`,
      costo_directo_unitario: null, costo_total: null,
      /* La cascada va TAMBIÉN aquí, y es donde más falta hace: un ítem sin
         precio es justo aquel en el que «¿por qué no hay precio?» no tiene otra
         respuesta en pantalla. Se le negaba la explicación al único caso que la
         necesitaba entera. */
      cascada: require("./precios.js").explicarCascada(codigo, {
        preciosUsuario, enCatalogo: false, elegido: null,
      }),
      /* …y el precio de tienda también: una fila sin precio con un techo de
         Homecenter al lado es justo la que más agradece la referencia. */
      referencia_tienda: referenciaTiendaDirecta(),
    };
  }

  /* Override de rendimiento: se aplica a TODAS las líneas de mano de obra y
     equipo del ítem, que son las únicas donde el rendimiento divide. Se hace
     sobre una copia; el catálogo no se muta jamás (es compartido entre
     peticiones dentro de la misma instancia caliente). */
  const override = numero(entrada && entrada.rendimiento_override, null);
  const item = override && override > 0
    ? {
      ...def,
      insumos: (def.insumos || []).map((l) => (
        Number.isFinite(Number(l.rendimiento)) ? { ...l, rendimiento: override } : l
      )),
    }
    : def;

  const cd = costoDirecto(item, cat, regionId, opcionesCosto);
  if (cd.error) {
    return {
      item_id: def.codigo, descripcion: def.descripcion, unidad: def.unidad, cantidad,
      incompleto: true, motivo: "region_desconocida", mensaje: cd.error,
      costo_directo_unitario: null, costo_total: null,
    };
  }

  const cap = cd.capitulos;
  const uMat = red(cap.materiales);
  const uMo = red(cap.mano_obra);
  /* La herramienta menor y los EPP son % de la mano de obra sin precio propio;
     van con el equipo para que los cuatro componentes sigan sumando el
     unitario, y cada uno se publica aparte (`costo_herramienta_unitario`,
     `costo_epp_unitario`) para que el desglose los enseñe con nombre. */
  const uEq = red(cap.equipo + cap.herramienta_menor + (cap.epp || 0));
  const uTr = red(cap.transporte);
  // el unitario es la SUMA de los componentes ya redondeados: así los cuatro
  // números que se pintan suman exactamente el quinto y la tabla cuadra a ojo
  const unitario = red(uMat + uMo + uEq + uTr);

  const tMat = red(uMat * cantidad);
  const tMo = red(uMo * cantidad);
  const tEq = red(uEq * cantidad);
  const tTr = red(uTr * cantidad);
  const total = red(tMat + tMo + tEq + tTr);

  const rendimientos = (def.insumos || [])
    .map((l) => numero(l.rendimiento, null)).filter((r) => r != null);

  /* ── CENSO DEL ORIGEN DE LOS PRECIOS DEL ÍTEM ─────────────────────────────
     `precioEnRegion` ya decide, insumo por insumo, si el precio sale de una
     COTIZACIÓN REAL cargada en `precios_cotizados` o de DERIVAR el precio base
     por el factor de la región, y lo publica en `linea.origen_precio`. Ese dato
     moría en el desglose: el badge del ítem solo miraba `fuente`, así que un
     ítem cotizado de verdad salía rotulado «Derivado regional» — una etiqueta
     que dice que el precio NO está verificado sobre uno que sí lo está. Es la
     trazabilidad al revés, y en el módulo donde la trazabilidad es el producto.

     Se cuenta POR VALOR y no solo por número de líneas: nueve insumos cotizados
     que pesan el 3 % no hacen «cotizado» un ítem cuyo 97 % se derivó. El
     resumen viaja y quien clasifica es `APULibro.clasificarOrigen` (R2). */
  const censo = { cotizado: 0, derivado: 0, lineas_cotizadas: 0, lineas_derivadas: 0 };
  for (const l of cd.lineas) {
    const v = Math.abs(Number(l.valor) || 0);
    if (l.origen_precio === "cotizado") { censo.cotizado += v; censo.lineas_cotizadas++; } else { censo.derivado += v; censo.lineas_derivadas++; }
  }
  const valorLineas = censo.cotizado + censo.derivado;

  /* La referencia de tienda del ÍTEM: la de su insumo de MAYOR PESO en pesos
     entre los que tienen captura retail. Elegir por valor y no «el primero»
     importa: en un ítem de concreto, el cemento pesa 10 veces lo que el agua, y
     la referencia que se enseña en la tabla tiene que ser la que mueve el
     precio. `null` si ninguno tiene captura — la ausencia no se rellena. */
  let refTiendaItem = null;
  {
    const retail = require("./retail.js");
    let mayor = -1;
    for (const l of cd.lineas) {
      const refs = retail.referenciasRetail(l.insumo_id, departamento);
      if (!refs) continue;
      const v = Math.abs(Number(l.valor) || 0);
      if (v > mayor) { mayor = v; refTiendaItem = { via: "insumo", insumo_id: l.insumo_id, insumo: l.nombre, refs }; }
    }
  }

  return {
    item_id: def.codigo,
    codigo: codigoArchivo,
    descripcion: descripcionEntrada || def.descripcion,
    unidad: def.unidad,
    capitulo: capituloEntrada || def.capitulo || null,
    fuente: def.fuente || null,
    cantidad,
    sin_apu: false,
    origen_precio: "catalogo",
    cascada: require("./precios.js").explicarCascada(codigo, {
      preciosUsuario, enCatalogo: true, elegido: "catalogo",
    }),
    referencia_tienda: refTiendaItem,
    /* La participación en VALOR de los insumos con cotización real. `null` —no
       0— cuando el ítem no tiene ninguna línea con valor: sin base no hay
       participación que publicar, y un 0 se leería como «nada está cotizado»
       (R1).

       ⚠️ `cotizado_pct` va REDONDEADO a dos decimales y por tanto SOLO INFORMA:
       no sirve para decidir nada. Una línea derivada de $1 junto a una cotizada
       de $3.350.400 da 99,99997 %, que `red()` sube a un 100 exacto. Quien
       tenga que preguntar «¿está TODO cotizado?» mira `lineas_derivadas === 0`,
       que es la cuenta exacta — es lo que hace `APULibro.clasificarOrigen`. */
    origen_insumos: {
      lineas_cotizadas: censo.lineas_cotizadas,
      lineas_derivadas: censo.lineas_derivadas,
      valor_cotizado: red(censo.cotizado),
      valor_derivado: red(censo.derivado),
      cotizado_pct: valorLineas > 0 ? red((censo.cotizado / valorLineas) * 100) : null,
    },
    cd_catalogo: null,
    rendimiento_dia: override && override > 0
      ? override
      : (rendimientos.length ? Math.min(...rendimientos) : null),
    rendimiento_es_override: !!(override && override > 0),
    costo_material_unitario: uMat,
    costo_mano_obra_unitario: uMo,
    costo_equipo_unitario: uEq,
    costo_transporte_unitario: uTr,
    costo_directo_unitario: unitario,
    costo_material_total: tMat,
    costo_mano_obra_total: tMo,
    costo_equipo_total: tEq,
    costo_transporte_total: tTr,
    costo_total: total,
    incompleto: false,
    motivo: null,
    detalle: {
      capitulos: cap,
      herramienta_menor_pct: numero(def.herramienta_menor_pct, 0),
      herramienta_menor_unitario: red(cap.herramienta_menor),
      // elementos de protección personal (% de la mano de obra, de apu:parametros; 0 sin parámetros)
      epp_pct: cd.ajustes ? cd.ajustes.epp_pct : 0,
      epp_unitario: red(cap.epp || 0),
      factor_jornada: cd.ajustes ? cd.ajustes.factor_jornada : 1,
      /* Las líneas salen de `costoDirecto` TAL CUAL: son el mismo cálculo que
         produjo el total, con precio regional y origen por insumo. Antes este
         bloque las reconstruía buscando cada insumo por su cuenta y sin precio,
         que era un desglose que no podía respaldar la cifra que acompañaba. */
      insumos: cd.lineas.map((l) => ({
        insumo_id: l.insumo_id,
        nombre: l.nombre,
        unidad: l.unidad,
        tipo: l.tipo,
        origen_precio: l.origen_precio,
        precio_region: l.precio_region,
        precio_aplicado: l.precio_aplicado,
        cantidad: l.cantidad,
        /* `cantidad_base` es la del CATÁLOGO, antes del desperdicio. Sustituye
           a un `cantidad_por_unidad` que publicaba `l.cantidad` —o sea, la
           cantidad CON el desperdicio ya dentro— bajo el nombre del campo del
           catálogo, que vale otra cosa: para un material con 5 % el catálogo
           dice 1,30 y esto publicaba 1,365. Dos cosas distintas con el mismo
           nombre es el defecto `total_procesos`/`procesos_contados`, y aquí
           quien se fiara del nombre volvería a multiplicar por el desperdicio y
           lo cobraría dos veces. Nadie lo consumía todavía. */
        cantidad_base: l.cantidad_base,
        rendimiento: l.rendimiento,
        // factor de jornada de la línea de MO (Fase 1); null donde no aplica
        factor_jornada: l.factor_jornada ?? null,
        desperdicio: l.desperdicio,
        distancia_km: l.distancia_km,
        valor: l.valor,
        /* TECHO RETAIL del insumo (encargo del dueño, ago 2026): lo que ese
           insumo cuesta HOY en tienda o en lista de fabricante, con fuente,
           ciudad y fecha de captura. Es una REFERENCIA para negociar — jamás
           entra en el costo directo (retail = IVA + margen de mostrador) y
           `null` cuando no hay captura: la ausencia no se rellena. El require
           va diferido como los demás de este archivo. */
        techo_retail: require("./retail.js").referenciasRetail(l.insumo_id, departamento),
        /* REFERENCIA OFICIAL INVIAS del insumo (capa 3 del plan nacional): el
           precio del banco de los APU Regionalizados para la(s) provincia(s)
           del departamento, con código, vigencia y correspondencia declaradas.
           Igual que el techo retail: es una REFERENCIA para contrastar y
           negociar — jamás entra en el costo directo — y `null` sin
           correspondencia curada: la ausencia no se rellena. */
        referencia_invias: require("./invias.js").referenciaInvias(l.insumo_id, departamento),
      })),
    },
  };
}

/* ═════════════════════════════ calcularPresupuesto ═════════════════════════
   `catalogo` es opcional: sin él se usa la SEMILLA del repositorio, que es la
   misma que la carga escribe en Redis. Así el motor se puede probar sin Redis y
   el endpoint puede responder aunque nadie haya corrido la carga todavía — pero
   diciendo POR QUÉ VÍA salió el precio, que es lo que permite discutirlo. */
function calcularPresupuesto({ items = [], departamento = "", config = {}, catalogo = null, preciosUsuario = null, parametros = null } = {}) {
  const cfg = normalizarConfig(config);
  /* Parámetros normativos (Fase 1): llegan YA derivados por lib/parametros.paraMotor
     —factor de jornada y % de EPP— o no llegan. Sin ellos el motor calcula
     exactamente como antes: es lo que mantiene la calibración Nogal probada y lo
     que hace que el handler, que SIEMPRE los carga, sea quien decide. */
  const opcionesCosto = parametros
    ? { factor_jornada: Number(parametros.factor_jornada) || 1, epp_pct: Number(parametros.epp_pct) || 0 }
    : {};
  const cat = normalizarCatalogo(catalogo) || SEMILLA;
  const fuenteCatalogo = normalizarCatalogo(catalogo) ? "redis" : "semilla";

  const reg = regionDeDepartamento(departamento);
  const regionBase = (cat._meta && cat._meta.region_base) || "bogota_sabana";
  const regionUsada = reg.estado === "mapeado" ? reg.region : regionBase;
  const region = (cat.regiones || []).find((r) => r.id === regionUsada) || null;

  const lista = Array.isArray(items) ? items : [];
  const calculados = lista.map((it) => calcularItem(it || {}, cat, regionUsada, preciosUsuario, departamento, opcionesCosto));

  const utiles = calculados.filter((i) => Number.isFinite(i.costo_total));
  const costoDirectoTotal = red(utiles.reduce((a, i) => a + i.costo_total, 0));

  /* Administración por tiempo: la A del AIU se deriva con lib/costos (la única
     implementación) y sustituye al % tecleado. Se publica cómo salió. */
  let administracionDetalle = null;
  if (cfg.metodo_administracion === "tiempo" && costoDirectoTotal > 0) {
    const C = require("../costos.js");
    const jornadaMes = parametros && Number(parametros.jornada_legal_mes) > 0 ? Number(parametros.jornada_legal_mes) : null;
    if (jornadaMes) {
      const adm = C.administracion({ metodo: "tiempo", gastosFijosMensuales: cfg.gastos_fijos_mensuales,
        horasProyecto: cfg.horas_proyecto, costosDirectos: costoDirectoTotal }, { jornadaLegalMes: jornadaMes });
      cfg.aiu_pct = red(adm.porcentaje * 100);
      administracionDetalle = { metodo: "tiempo", valor: adm.valor, costo_hora_admin: adm.costo_hora_admin,
        horas: adm.horas, jornada_legal_mes: jornadaMes, aiu_pct_derivado: cfg.aiu_pct };
    } else {
      cfg._avisos.push("Administración por tiempo: sin jornada legal en los parámetros de costo; se usó el % de administración.");
      cfg.metodo_administracion = "porcentaje";
    }
  }

  /* `sin_desglose` recoge los ítems con precio manual/del archivo: su costo
     entra al total pero no hay composición que repartir. Sin esta cubeta, los
     cuatro componentes dejarían de sumar el total en cuanto hubiera un ítem
     importado — y un reparto que no suma es un peso que se pierde en silencio. */
  const manuales = utiles.filter((i) => i.sin_apu);
  const porComponente = {
    material: red(utiles.reduce((a, i) => a + (i.costo_material_total || 0), 0)),
    mano_obra: red(utiles.reduce((a, i) => a + (i.costo_mano_obra_total || 0), 0)),
    equipo: red(utiles.reduce((a, i) => a + (i.costo_equipo_total || 0), 0)),
    transporte: red(utiles.reduce((a, i) => a + (i.costo_transporte_total || 0), 0)),
    sin_desglose: red(manuales.reduce((a, i) => a + i.costo_total, 0)),
  };

  /* ---------- AIU ---------- */
  const aiuTotalPct = red(cfg.aiu_pct + cfg.utilidad_pct + cfg.imprevistos_pct);
  const factorAiu = cfg.modo_aiu === "compuesto"
    ? (1 + cfg.aiu_pct / 100) * (1 + cfg.utilidad_pct / 100) * (1 + cfg.imprevistos_pct / 100)
    : 1 + aiuTotalPct / 100;

  const precioVenta = red(costoDirectoTotal * factorAiu);
  const valorAdministracion = red(costoDirectoTotal * (cfg.aiu_pct / 100));
  const valorImprevistos = red(costoDirectoTotal * (cfg.imprevistos_pct / 100));
  const valorUtilidad = red(costoDirectoTotal * (cfg.utilidad_pct / 100));

  /* ---------- ajuste competitivo ---------- */
  const precioFinal = cfg.aplicar_ajuste_competitivo
    ? red(precioVenta * (1 - cfg.factor_baja / 100))
    : precioVenta;
  const margenFinal = red(precioFinal - costoDirectoTotal);
  const margenPct = costoDirectoTotal > 0 ? red((margenFinal / costoDirectoTotal) * 100) : null;

  /* ---------- caja ----------
     `financiacion_requerida` usa el mismo 20 % de la puerta P3 (lib/puertas):
     es la misma pregunta —«¿puede el dueño poner la plata que el Estado no
     adelanta?»— y dos coeficientes distintos para la misma pregunta serían dos
     respuestas. */
  const anticipoCop = cfg.anticipo_pct === null ? null : red(precioFinal * (cfg.anticipo_pct / 100));
  const financiacion = anticipoCop === null
    ? red(precioFinal * (FINANCIACION_PCT / 100))
    : red((precioFinal - anticipoCop) * (FINANCIACION_PCT / 100));

  /* ---------- informativos ---------- */
  const ivaSobreUtilidad = red(valorUtilidad * (IVA_TARIFA / 100));
  const contribucion = red(precioFinal * (CONTRIBUCION_OBRA_PUBLICA / 100));
  const deducciones = cfg.deducciones_pct === null ? null : red(precioFinal * (cfg.deducciones_pct / 100));
  const margenDespuesDeducciones = deducciones === null ? null : red(margenFinal - deducciones);

  /* ---------- alertas ---------- */
  const alertas = [...cfg._avisos];
  const incompletos = calculados.filter((i) => i.incompleto);
  if (incompletos.length) {
    alertas.push(`${incompletos.length} ítem(s) no se pudieron costear y NO suman al total. Se listan con su motivo: un ítem sin precio vale «sin dato», nunca cero.`);
  }
  if (manuales.length) {
    alertas.push(`${manuales.length} ítem(s) llevan precio del archivo importado o tecleado a mano, SIN composición de APU que lo respalde: suman al total pero no al reparto por componente, y en el Excel salen marcados.`);
  }
  if (reg.estado !== "mapeado") {
    alertas.push(`Sin referencia regional: ${reg.mensaje} Se usó la región base «${regionUsada}».`);
  }
  if (fuenteCatalogo === "semilla") {
    alertas.push("El catálogo de precios NO está cargado en Redis: se usó la semilla del repositorio. Cárguelo desde /admin.html para trabajar con la versión vigente.");
  }
  if (aiuTotalPct > AIU_ALTO) {
    alertas.push(`El AIU total es ${aiuTotalPct} %. Por encima del ${AIU_ALTO} % las entidades suelen observar la oferta.`);
  }
  if (cfg.aplicar_ajuste_competitivo && margenFinal <= 0) {
    alertas.push("⛔ Con esa baja el precio final NO cubre ni el costo directo: presentarse sería trabajar a pérdida.");
  } else if (cfg.aplicar_ajuste_competitivo
      && precioFinal < costoDirectoTotal * (1 + (cfg.aiu_pct + cfg.imprevistos_pct) / 100)) {
    alertas.push("⚠️ La baja se comió toda la utilidad y parte de la administración: el margen que queda no cubre los costos indirectos.");
  }
  if (cfg.aplicar_ajuste_competitivo && cfg.factor_baja > 15) {
    alertas.push(`Una baja del ${cfg.factor_baja} % está por encima de la banda típica de obra (5–12 %). Verifique que el margen sobrevive antes de ofertar.`);
  }
  if (cfg.deducciones_pct === null) {
    alertas.push(`El margen NO descuenta la contribución especial de obra pública (${CONTRIBUCION_OBRA_PUBLICA} % del valor del contrato, Ley 418/1997) ni las estampillas. Sobre este precio la contribución sola serían ${contribucion == null ? "—" : contribucion.toLocaleString("es-CO")} COP. Cárguelas en «deducciones de acta (%)» para ver el margen real.`);
  }
  if (cfg.anticipo_pct === null) {
    alertas.push("Anticipo sin dato: la financiación requerida se calculó como si NO hubiera anticipo, que es el escenario conservador.");
  }

  /* ── LAS CINCO VALIDACIONES (lib/apu/validaciones) ────────────────────────
     Corren AL FINAL, sobre el presupuesto ya cerrado, porque tres de las cinco
     necesitan el resumen y una necesita el factor prestacional de la región que
     de verdad se usó. NINGUNA bloquea (R6): se publican como `validaciones`
     —estructuradas, para que la UI las pinte con su severidad— y además se
     VUELCAN en `alertas`, que es el canal que el frontend y el exportador ya
     leen. Publicarlas solo en el campo nuevo las habría escondido justo en las
     dos superficies donde se miran (R11: manda quien LEE, no quien escribe). */
  const validaciones = require("./validaciones.js").validarPresupuesto({
    items: calculados,
    resumen: { precio_final: precioFinal },
    configuracion: cfg,
    prestacional: region ? region.prestacional_tipico : null,
    cuantia_cop: cfg.cuantia_cop,
  });
  alertas.push(...validaciones.mensajes);

  return {
    ok: true,
    departamento: departamento || null,
    ajuste_regional: {
      estado: reg.estado,
      departamento: reg.departamento,
      region: reg.region,
      region_utilizada: regionUsada,
      region_nombre: region ? region.nombre : null,
      factores: region ? {
        materiales: region.factor_materiales,
        mano_obra: region.factor_mano_obra,
        equipo: region.factor_equipo,
        transporte: region.factor_transporte,
      } : null,
      prestacional: region ? region.prestacional_tipico : null,
      mensaje: reg.mensaje,
    },
    catalogo: {
      fuente: fuenteCatalogo,
      version: (cat._meta && cat._meta.version) || null,
      base_precios: (cat._meta && cat._meta.base_precios) || null,
    },
    /* Cobertura retail del departamento: es lo que permite a la pantalla decir
       por qué un techo viene «de Bogotá» en vez de dejar la duda. `cubierto`
       en null cuando no hay departamento — no saber cuál es no es saber que
       no hay (R1). */
    retail: (() => {
      const rt = require("./retail.js");
      const cob = rt.coberturaRetail(departamento);
      const res = rt.resumenRetail();
      return { cubierto: cob.cubierto, motivo: cob.motivo, capturado_el: res.capturado_el, advertencia: res.advertencia };
    })(),
    /* Cobertura del banco INVIAS, hermana de la retail: dice por qué una
       referencia viene «mediana nacional» (Bogotá D.C. no está en el banco) y
       con qué vigencia se capturó — el rezago viaja declarado, no disimulado. */
    invias: (() => {
      const inv = require("./invias.js");
      const cob = inv.coberturaInvias(departamento);
      const res = inv.resumenInvias();
      return { cubierto: cob.cubierto, motivo: cob.motivo, vigencia: res.vigencia, capturado_el: res.capturado_el, advertencia: res.advertencia };
    })(),
    /* Con qué jornada y qué % de EPP se costeó la mano de obra, y de dónde
       salió. `null` = sin parámetros (cálculo de calibración): no es «factor 1
       verificado», es que nadie lo aplicó — la distinción de siempre entre «no
       sé» y «cero». */
    parametros_costo: parametros ? {
      vigencia: parametros.vigencia || null,
      factor_jornada: opcionesCosto.factor_jornada,
      horas_semana_vigente: parametros.horas_semana_vigente ?? null,
      horas_semana_calibracion: parametros.horas_semana_calibracion ?? null,
      epp_pct: opcionesCosto.epp_pct,
      fuente: parametros.fuente || null,
      mensaje: opcionesCosto.factor_jornada !== 1
        ? `La mano de obra por unidad se multiplicó por ${opcionesCosto.factor_jornada}: el catálogo se calibró con `
          + `jornada de ${parametros.horas_semana_calibracion} h y desde el ${parametros.vigencia || "15-jul-2026"} rige la de `
          + `${parametros.horas_semana_vigente} h (Ley 2101 de 2021). El jornal por día no cambia; rinde menos horas.`
        : "Sin ajuste de jornada: la jornada de calibración y la vigente coinciden.",
    } : null,
    configuracion: {
      modo_aiu: cfg.modo_aiu,
      aiu_pct: cfg.aiu_pct, utilidad_pct: cfg.utilidad_pct, imprevistos_pct: cfg.imprevistos_pct,
      metodo_administracion: cfg.metodo_administracion,
      administracion: administracionDetalle,
      aiu_total_pct: aiuTotalPct,
      anticipo_pct: cfg.anticipo_pct,
      anticipo_es_sin_dato: cfg.anticipo_pct === null,
      aplicar_ajuste_competitivo: cfg.aplicar_ajuste_competitivo,
      factor_baja: cfg.factor_baja,
      deducciones_pct: cfg.deducciones_pct,
      cuantia_cop: cfg.cuantia_cop,
    },
    validaciones,
    items: calculados,
    resumen: {
      items_totales: calculados.length,
      items_costeados: utiles.length,
      items_incompletos: incompletos.length,
      items_sin_apu: manuales.length,
      costo_directo_total: costoDirectoTotal,
      por_componente: porComponente,
      administracion: valorAdministracion,
      imprevistos: valorImprevistos,
      utilidad: valorUtilidad,
      factor_aiu: Math.round(factorAiu * 1000) / 1000,
      precio_venta: precioVenta,
      precio_final: precioFinal,
      margen_final: margenFinal,
      margen_pct: margenPct,
      anticipo_cop: anticipoCop,
      financiacion_requerida: financiacion,
      iva_sobre_utilidad: ivaSobreUtilidad,
      contribucion_obra_publica: contribucion,
      deducciones_estimadas: deducciones,
      margen_despues_deducciones: margenDespuesDeducciones,
    },
    alertas,
    como_leerlo: {
      precios: "Precios de REFERENCIA regionalizada, no cotizaciones. Este presupuesto es una AYUDA DE LECTURA para decidir a qué presentarse, no una oferta: verifique contra cotización real antes de presentar.",
      aiu: cfg.modo_aiu === "aditivo"
        ? "AIU aditivo: precio = costo directo × (1 + A% + I% + U%), que es la convención de los pliegos tipo."
        : "AIU compuesto: precio = CD × (1+A%) × (1+I%) × (1+U%). Da un AIU efectivo MAYOR que la suma de los tres porcentajes y no coincidirá con el que declare el formulario de la entidad.",
      iva: "El IVA en contratos de construcción de bien inmueble se causa sobre la UTILIDAD del constructor (art. 3 D. 1372/1992, hoy art. 1.3.1.7.9 D. 1625/2016), no sobre el valor total. Se muestra como informativo: no está sumado al precio.",
      margen: "«margen_final» es precio_final − costo_directo_total, tal como lo pidió el encargo. NO descuenta impuestos, estampillas ni la contribución del 5 %: para eso está «margen_despues_deducciones», que exige cargar el porcentaje real del municipio.",
    },
  };
}

module.exports = {
  calcularPresupuesto, calcularItem, normalizarConfig, normalizarCatalogo,
  MODOS_AIU, IVA_TARIFA, CONTRIBUCION_OBRA_PUBLICA, AIU_ALTO, FINANCIACION_PCT, red,
};
