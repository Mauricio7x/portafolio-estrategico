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

  /* AIU DE SUBCONTRATISTA (Fase 1, pendiente 4 · ago 2026). Un ítem marcado
     `subcontratado` entra al costo directo por el precio del subcontratista,
     que YA lleva el AIU de aquel. `aiu_sobre_subcontratado` decide si el AIU
     PROPIO se aplica también sobre esos ítems (default true: el contratista
     principal los administra, responde por ellos y los financia; es la
     práctica corriente) o si entran al precio a costo, sin recargo propio. */
  const aiuSobreSub = !(c.aiu_sobre_subcontratado === false || c.aiu_sobre_subcontratado === "false");

  return {
    modo_aiu: modo,
    aiu_pct: aiu, utilidad_pct: utilidad, imprevistos_pct: imprevistos,
    aiu_sobre_subcontratado: aiuSobreSub,
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
    insumos: (bruto.insumos || []).map((i) => {
      const base = { ...i, id: i.id || i.insumo };
      if (i.precios_cotizados || !i.precios) return { ...base, precios_cotizados: i.precios_cotizados || {} };
      /* …PERO NO TODOS SON COTIZACIONES, y meterlos a todos en
         `precios_cotizados` invertía la trazabilidad (ago 2026). El hash guarda
         `precio_origen_{region}` y `insumoDeHash` lo conserva en
         `precio_origen`; al descartarlo aquí, `precioEnRegion` rotulaba
         «cotizado» hasta el último precio derivado por factor, así que con el
         catálogo cargado —el estado NORMAL de producción— la insignia decía
         «Cotización de proveedor» sobre precios NO verificados y
         `lineas_derivadas` valía 0 siempre. Es el falso positivo caro de este
         módulo, y al revés del defecto que ya se corrigió («decía SIN VERIFICAR
         sobre un precio verificado»). Se reparten por su origen REAL; los
         derivados van a `precios_regionales`, que `precioEnRegion` usa TAL CUAL
         (ya están regionalizados: volver a aplicar el factor los multiplicaría
         dos veces). Sin `precio_origen` —un hash escrito por una versión
         anterior— manda el DEFAULT documentado del catálogo: derivado. */
      const cotizados = {}, regionales = {};
      const origen = i.precio_origen || {};
      for (const [region, valor] of Object.entries(i.precios)) {
        if (origen[region] === "cotizado") cotizados[region] = valor;
        else regionales[region] = valor;
      }
      return { ...base, precios_cotizados: cotizados, precios_regionales: regionales };
    }),
    items: bruto.items || [],
  };
}

/* ───────────────────────────── un ítem del presupuesto ─────────────────── */

/* Lo que de un APU INVIAS viaja al cliente como TRAZABILIDAD (sin las líneas ni
   las 135 provincias enteras): vigencia, nivel, provincia representativa,
   cuántas provincias sostienen la referencia y el precio oficial. */
/* El unitario que el motor publica para un APU INVIAS: la SUMA de sus cuatro
   componentes ya redondeados (la misma regla que el catálogo, para que los
   cuatro números que se pintan sumen exactamente el quinto). Puede diferir del
   `precio` oficial en ±$2 de redondeo; `precio_oficial` viaja en la referencia. */
const unitarioInvias = (a) => require("./invias_items.js").unitarioMotor(a);
const unitarioEpc = (a) => require("./epc_items.js").unitarioMotor(a);
function resumenInvias(a) {
  return {
    item_de_pago: a.item_de_pago, articulo: a.articulo, vigencia: a.vigencia, capturado_el: a.capturado_el,
    nivel: a.nivel, departamento: a.departamento,
    provincia_representativa: a.provincia_representativa, provincias_usadas: a.provincias_usadas,
    mediana_total: a.mediana_total == null ? null : Math.round(a.mediana_total),
    precio_oficial: a.precio,
    provincia_referencia_composicion: a.provincia_referencia,
    ajustes: a.ajustes,
  };
}

/* Lo que el ítem publica de su origen EPC: vigencia, provincia del libro y si
   fuera de Cundinamarca va sin ajuste. Una cifra sin su origen no se discute. */
function resumenEpc(a) {
  return {
    numeral: a.numeral, vigencia: a.vigencia, capturado_el: a.capturado_el,
    provincia: a.provincia, departamento: a.departamento,
    ajuste_regional: a.ajuste_regional, nota_regional: a.nota_regional,
    precio_oficial: a.precio, cuadra: a.cuadra,
    precios_por_provincia: a.precios_por_provincia,
  };
}

function calcularItem(entrada, cat, regionId, preciosUsuario = null, departamento = null, opcionesCosto = {}) {
  const codigo = String((entrada && entrada.item_id) || "").trim();
  /* `itemPorCodigo` y no un `.find()` suelto: traduce los códigos INVIAS
     renumerados, y sin eso un borrador guardado antes de la corrección perdería
     sus ítems en silencio (R11). El require va aquí para no reordenar el grafo
     del módulo. */
  const def = codigo ? require("./catalogo.js").itemPorCodigo(cat, codigo) : null;
  const cantidad = numero(entrada && entrada.cantidad, 0);
  /* …Y SI NO SE PUDO LEER, SE DICE. El motor normaliza a 0 para poder calcular,
     pero 0 y «no sé» no son lo mismo (R1) y `validarCantidades` tiene dos
     cubetas distintas justamente por eso: `cantidad_cero` es una decisión
     («este ítem no se ejecuta», aviso) y `cantidad_ilegible` una ausencia
     («SEGÚN PLANOS», atención). Sin esta marca, una celda ilegible de un Excel
     importado llegaba al validador indistinguible de un cero deliberado. */
  const cantidadIlegible = numero(entrada && entrada.cantidad, null) === null;

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
  /* «ia» (4-sep-2026): precio buscado por una sesión de Claude Code y ACEPTADO
     por el usuario fila a fila (lib/apu/precios_ia); viaja con `ia_fuente`
     (nombre, url, fecha) para que el badge y el Excel digan de dónde salió. */
  const origenEntrada = entrada && entrada.origen_precio;
  let origenManual = origenEntrada === "archivo" || origenEntrada === "ia" ? origenEntrada : "manual";
  /* Subcontrato: bandera y el AIU que el subcontratista lleva dentro de su
     precio (%). El % es un dato del contrato con el sub; sin él, `null` —se
     sabe que está subcontratado pero no cuánto AIU ajeno va dentro—. */
  const subcontratado = !!(entrada && (entrada.subcontratado === true || entrada.subcontratado === "true" || entrada.subcontratado === 1));
  const aiuSubCrudo = entrada ? entrada.aiu_subcontratista_pct : null;
  const aiuSubPct = subcontratado && aiuSubCrudo != null && aiuSubCrudo !== "" && Number.isFinite(Number(aiuSubCrudo)) && Number(aiuSubCrudo) >= 0
    ? Math.min(60, Number(aiuSubCrudo)) : null;
  const marcaSub = (costoTotal) => ({
    subcontratado,
    aiu_subcontratista_pct: aiuSubPct,
    // AIU ajeno INCLUIDO en el precio: costo × pct/(100+pct); null sin %
    aiu_subcontratista_incluido: subcontratado && aiuSubPct != null && Number.isFinite(costoTotal)
      ? red(costoTotal * (aiuSubPct / (100 + aiuSubPct))) : null,
  });

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

  /* ¿Es un ítem INVIAS? Se resuelve UNA vez y sirve a las tres ramas: como
     referencia (`cd_catalogo`) cuando manda un precio manual, como precio cuando
     no hay manual, y para explicar la cascada. `null` si el código no es INVIAS
     o el banco no trae ese ítem: la ausencia no se rellena. */
  const InviasItems = require("./invias_items.js");
  const apuInvias = !def && InviasItems.esCodigoInvias(codigo) ? InviasItems.apuParaDepartamento(codigo, departamento) : null;
  /* …el EPC (acueducto y alcantarillado de Cundinamarca): CON composición, como
     el INVIAS. `null` si no es EPC o el banco no trae ese ítem. */
  const EpcItems = require("./epc_items.js");
  const apuEpc = !def && !apuInvias && EpcItems.esCodigoEpc(codigo) ? EpcItems.apuParaDepartamento(codigo, departamento) : null;
  /* …y el IDU (Bogotá): SOLO precio, sin composición. `null` si no es IDU. */
  const IduItems = require("./idu_items.js");
  const refIdu = !def && !apuInvias && !apuEpc && IduItems.esCodigoIdu(codigo) ? IduItems.precioReferencia(codigo, departamento) : null;
  /* …y el FFIE (edificación, los 33 departamentos): SOLO precio y además TOPE,
     no de mercado. `null` si no es FFIE. */
  const FfieItems = require("./ffie_items.js");
  const refFfie = !def && !apuInvias && !apuEpc && !refIdu && FfieItems.esCodigoFfie(codigo) ? FfieItems.precioReferencia(codigo, departamento) : null;
  /* …y el ICCU (Cundinamarca, por municipio): SOLO precio. El motor conoce el
     DEPARTAMENTO de la obra, no el municipio, así que responde la mediana y lo
     declara; el municipio sigue disponible en el módulo para quien lo sepa. */
  const IccuItems = require("./iccu_items.js");
  const refIccu = !def && !apuInvias && !apuEpc && !refIdu && !refFfie && IccuItems.esCodigoIccu(codigo)
    ? IccuItems.precioReferencia(codigo, { departamento, municipio: entrada && entrada.municipio }) : null;

  if (manual !== null && manual > 0) {
    const unit = red(manual);
    const cdCat = def ? costoDirecto(def, cat, regionId, opcionesCosto) : null;
    return {
      item_id: def ? def.codigo : (codigo || null),
      codigo: codigoArchivo,
      // la descripción/unidad/capítulo del ítem de referencia (catálogo o INVIAS) cuando la entrada no las trae
      descripcion: descripcionEntrada || (def ? def.descripcion : null) || (apuInvias ? apuInvias.descripcion : null) || (apuEpc ? apuEpc.descripcion : null) || (refIdu ? refIdu.descripcion : null) || (refFfie ? refFfie.descripcion : null) || (refIccu ? refIccu.descripcion : null),
      unidad: unidadEntrada || (def ? def.unidad : null) || (apuInvias ? apuInvias.unidad : null) || (apuEpc ? apuEpc.unidad : null) || (refIdu ? refIdu.unidad : null) || (refFfie ? refFfie.unidad : null) || (refIccu ? refIccu.unidad : null),
      capitulo: capituloEntrada || (def ? def.capitulo : null) || (apuInvias ? apuInvias.capitulo : null) || (apuEpc ? apuEpc.capitulo : null) || (refIdu ? refIdu.capitulo : null) || (refFfie ? refFfie.capitulo : null) || (refIccu ? refIccu.capitulo : null) || null,
      fuente: null,
      cantidad,
      ...(cantidadIlegible ? { cantidad_ilegible: true } : {}),
      sin_apu: true,
      ...marcaSub(red(unit * cantidad)),
      // «propio» = precio que este contratista ya había corregido y quedó guardado
      origen_precio: origenManual,
      ...(origenManual === "ia" && entrada.ia_fuente && typeof entrada.ia_fuente === "object"
        ? { ia_fuente: { nombre: String(entrada.ia_fuente.nombre || "").slice(0, 120) || null, url: String(entrada.ia_fuente.url || "").slice(0, 600) || null, fecha: String(entrada.ia_fuente.fecha || "").slice(0, 10) || null } }
        : {}),
      /* POR QUÉ el precio salió de ahí y no de una fuente mejor. El badge dice
         de dónde vino; esto dice qué se miró antes y por qué no respondió —
         «derivado regional» a secas se lee como un defecto del programa,
         mientras que «todavía no corregiste el precio de este ítem» es una
         instrucción. */
      cascada: require("./precios.js").explicarCascada(codigo, {
        preciosUsuario, enCatalogo: !!def, enInvias: !!apuInvias, enEpc: !!apuEpc, enIdu: !!refIdu, enFfie: !!refFfie, enIccu: !!refIccu, elegido: origenManual,
      }),
      referencia_tienda: referenciaTiendaDirecta(),
      // la referencia que la diferencia deja ver: el catálogo, el APU oficial INVIAS del departamento o el precio IDU
      cd_catalogo: cdCat && !cdCat.error ? cdCat.total : (apuInvias ? unitarioInvias(apuInvias) : (apuEpc ? unitarioEpc(apuEpc) : (refIdu ? refIdu.precio : (refFfie ? refFfie.precio : (refIccu ? refIccu.precio : null))))),
      referencia_invias_apu: apuInvias ? resumenInvias(apuInvias) : null,
      referencia_epc_apu: apuEpc ? resumenEpc(apuEpc) : null,
      referencia_ffie_apu: refFfie || null,
      referencia_iccu_apu: refIccu || null,
      referencia_idu_apu: refIdu || null,
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

  /* ═══ APU DE REFERENCIA INVIAS (ago 2026) ═══════════════════════════════
     Los 526 ítems de pago del INVIAS (data/apu_invias_items.json) se costean
     con el costo directo OFICIAL de la provincia representativa del
     departamento de la obra (lib/apu/invias_items.apuParaDepartamento). Sale
     con la MISMA forma que un ítem del catálogo —cuatro componentes que suman
     el unitario, herramienta menor, líneas del desglose— para que la tabla, el
     Excel y las validaciones no distingan de dónde vino, y con
     `origen_precio: "invias"` + `referencia_invias_apu` para que SÍ se sepa. Es
     una referencia oficial, no una cotización: el badge lo dice, y el precio
     manual o del archivo (rama de arriba) manda sobre ella. */
  if (apuInvias) {
    const cap = apuInvias.capitulos;
    const uMat = red(cap.materiales);
    const uMo = red(cap.mano_obra);
    const uEq = red(cap.equipo + cap.herramienta_menor);
    const uTr = red(cap.transporte);
    const unitario = unitarioInvias(apuInvias);   // ≡ red(uMat + uMo + uEq + uTr), la misma cifra que cotizar
    const tMat = red(uMat * cantidad);
    const tMo = red(uMo * cantidad);
    const tEq = red(uEq * cantidad);
    const tTr = red(uTr * cantidad);
    const total = red(tMat + tMo + tEq + tTr);
    const override = numero(entrada && entrada.rendimiento_override, null);
    const rendimientos = apuInvias.lineas.filter((l) => l.tipo === "mano_obra").map((l) => numero(l.rendimiento, null)).filter((r) => r != null);
    return {
      item_id: codigo,
      codigo: codigoArchivo,
      descripcion: descripcionEntrada || apuInvias.descripcion,
      unidad: apuInvias.unidad || unidadEntrada,
      capitulo: capituloEntrada || apuInvias.capitulo || null,
      fuente: "invias",
      cantidad,
      ...(cantidadIlegible ? { cantidad_ilegible: true } : {}),
      sin_apu: false,
      origen_precio: "invias",
      referencia_invias_apu: resumenInvias(apuInvias),
      cascada: require("./precios.js").explicarCascada(codigo, {
        preciosUsuario, enCatalogo: false, enInvias: true, elegido: "invias_apu",
      }),
      referencia_tienda: null,
      origen_insumos: null,
      cd_catalogo: null,
      rendimiento_dia: rendimientos.length ? Math.min(...rendimientos) : null,
      rendimiento_es_override: false,
      /* el rendimiento propio NO se aplica a un APU de referencia; si lo
         mandaron, se dice en vez de ignorarlo en silencio */
      aviso: override && override > 0
        ? "El rendimiento propio no se aplica a un APU de referencia INVIAS (sus cantidades y rendimientos son los oficiales): si su rendimiento difiere, escriba su precio unitario."
        : null,
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
      ...marcaSub(total),
      incompleto: false,
      motivo: null,
      detalle: {
        capitulos: { mano_obra: uMo, materiales: uMat, equipo: red(cap.equipo), transporte: uTr, herramienta_menor: red(cap.herramienta_menor), epp: 0 },
        herramienta_menor_pct: apuInvias.herramienta_menor_pct,
        herramienta_menor_unitario: red(cap.herramienta_menor),
        epp_pct: 0,
        epp_unitario: 0,
        factor_jornada: 1,
        insumos: apuInvias.lineas.map((l) => ({ ...l, techo_retail: null, referencia_invias: null })),
      },
    };
  }

  /* ═══ APU DE REFERENCIA EPC (Cundinamarca, ago 2026) ════════════════════
     Los 440 APU de Empresas Públicas de Cundinamarca traen COMPOSICIÓN, como
     el INVIAS, así que el ítem sale con sus cuatro componentes y su desglose
     por insumo en vez de caer a `sin_desglose`. Dos diferencias que se
     declaran: la composición es la de la provincia del libro (ALMEIDAS) y
     fuera de Cundinamarca el precio va SIN ajuste regional. Referencia
     oficial, no cotización: el precio manual (rama de arriba) manda. */
  if (apuEpc) {
    const cap = apuEpc.capitulos;
    const uMat = red(cap.materiales);
    const uMo = red(cap.mano_obra);
    const uEq = red(cap.equipo + cap.herramienta_menor);
    const uTr = red(cap.transporte);
    const unitario = unitarioEpc(apuEpc);   // ≡ red(uMat + uMo + uEq + uTr): probado sobre los 440
    const tMat = red(uMat * cantidad);
    const tMo = red(uMo * cantidad);
    const tEq = red(uEq * cantidad);
    const tTr = red(uTr * cantidad);
    const total = red(tMat + tMo + tEq + tTr);
    const override = numero(entrada && entrada.rendimiento_override, null);
    const rendimientos = apuEpc.lineas.filter((l) => l.tipo === "mano_obra").map((l) => numero(l.rendimiento, null)).filter((r) => r != null);
    const avisos = [];
    if (override && override > 0) {
      avisos.push("El rendimiento propio no se aplica a un APU de referencia de EPC (sus cantidades y rendimientos son los oficiales): si su rendimiento difiere, escriba su precio unitario.");
    }
    if (apuEpc.nota_regional) avisos.push(apuEpc.nota_regional);
    return {
      item_id: codigo,
      codigo: codigoArchivo,
      descripcion: descripcionEntrada || apuEpc.descripcion,
      unidad: apuEpc.unidad || unidadEntrada,
      capitulo: capituloEntrada || apuEpc.capitulo || null,
      fuente: "epc",
      cantidad,
      ...(cantidadIlegible ? { cantidad_ilegible: true } : {}),
      sin_apu: false,
      origen_precio: "epc",
      referencia_epc_apu: resumenEpc(apuEpc),
      cascada: require("./precios.js").explicarCascada(codigo, {
        preciosUsuario, enCatalogo: false, enEpc: true, elegido: "epc_apu",
      }),
      referencia_tienda: null,
      origen_insumos: null,
      cd_catalogo: null,
      rendimiento_dia: rendimientos.length ? Math.min(...rendimientos) : null,
      rendimiento_es_override: false,
      aviso: avisos.length ? avisos.join(" ") : null,
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
      ...marcaSub(total),
      incompleto: false,
      motivo: null,
      detalle: {
        capitulos: { mano_obra: uMo, materiales: uMat, equipo: red(cap.equipo), transporte: uTr, herramienta_menor: red(cap.herramienta_menor), epp: 0 },
        herramienta_menor_pct: apuEpc.herramienta_menor_pct,
        herramienta_menor_unitario: red(cap.herramienta_menor),
        epp_pct: 0,
        epp_unitario: 0,
        factor_jornada: 1,
        insumos: apuEpc.lineas.map((l) => ({ ...l, techo_retail: null, referencia_invias: null })),
      },
    };
  }

  /* ═══ PRECIO DE REFERENCIA IDU (Bogotá, ago 2026) ═══════════════════════
     Los 3 172 APU del visor del IDU (data/apu_idu_items.json) traen PRECIO,
     no composición: el ítem sale como precio SIN desglose (`sin_apu: true`,
     va a `sin_desglose` del reparto), con `origen_precio: "idu"` y su
     referencia pegada. Es de Bogotá y fuera de Bogotá se declara: ni se
     regionaliza ni se inventan componentes. Referencia oficial, no
     cotización; el precio manual (rama de arriba) manda. */
  if (refIdu) {
    const unit = red(refIdu.precio);
    return {
      item_id: codigo,
      codigo: codigoArchivo,
      descripcion: descripcionEntrada || refIdu.descripcion,
      unidad: refIdu.unidad || unidadEntrada,
      capitulo: capituloEntrada || refIdu.capitulo || null,
      fuente: "idu",
      cantidad,
      ...(cantidadIlegible ? { cantidad_ilegible: true } : {}),
      sin_apu: true,
      ...marcaSub(red(unit * cantidad)),
      origen_precio: "idu",
      referencia_idu_apu: refIdu,
      cascada: require("./precios.js").explicarCascada(codigo, {
        preciosUsuario, enCatalogo: false, enIdu: true, elegido: "idu_apu",
      }),
      referencia_tienda: referenciaTiendaDirecta(),
      cd_catalogo: null,
      aviso: refIdu.ajuste_regional === "ninguno" ? refIdu.nota_regional : null,
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

  /* ═══ PRECIO TOPE FFIE (edificación, los 33 departamentos · ago 2026) ═══
     Como el IDU, SOLO precio: el ítem sale sin desglose. La diferencia es que
     este SÍ está regionalizado —el precio ya es el del departamento— y que es
     un TOPE, no un precio de mercado: el contrato adjudicado del propio dueño
     está por encima. El aviso lo dice SIEMPRE, no solo fuera de su región. */
  if (refFfie) {
    const unit = red(refFfie.precio);
    return {
      item_id: codigo,
      codigo: codigoArchivo,
      descripcion: descripcionEntrada || refFfie.descripcion,
      unidad: refFfie.unidad || unidadEntrada,
      capitulo: capituloEntrada || refFfie.capitulo || null,
      fuente: "ffie",
      cantidad,
      ...(cantidadIlegible ? { cantidad_ilegible: true } : {}),
      sin_apu: true,
      ...marcaSub(red(unit * cantidad)),
      origen_precio: "ffie",
      referencia_ffie_apu: refFfie,
      cascada: require("./precios.js").explicarCascada(codigo, {
        preciosUsuario, enCatalogo: false, enFfie: true, elegido: "ffie_apu",
      }),
      referencia_tienda: referenciaTiendaDirecta(),
      cd_catalogo: null,
      aviso: [refFfie.nota_tope, refFfie.nota].filter(Boolean).join(" "),
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

  /* ═══ PRECIO DE REFERENCIA ICCU (Cundinamarca · ago 2026) ═══════════════
     Como el IDU y el FFIE, solo precio. Su gracia es la GRANULARIDAD: publica
     por municipio, y el nivel que se usó (municipio / provincia / mediana del
     departamento) viaja declarado en cada respuesta. */
  if (refIccu) {
    const unit = red(refIccu.precio);
    return {
      item_id: codigo,
      codigo: codigoArchivo,
      descripcion: descripcionEntrada || refIccu.descripcion,
      unidad: refIccu.unidad || unidadEntrada,
      capitulo: capituloEntrada || refIccu.capitulo || null,
      fuente: "iccu",
      cantidad,
      ...(cantidadIlegible ? { cantidad_ilegible: true } : {}),
      sin_apu: true,
      ...marcaSub(red(unit * cantidad)),
      origen_precio: "iccu",
      referencia_iccu_apu: refIccu,
      cascada: require("./precios.js").explicarCascada(codigo, {
        preciosUsuario, enCatalogo: false, enIccu: true, elegido: "iccu_apu",
      }),
      referencia_tienda: referenciaTiendaDirecta(),
      cd_catalogo: null,
      aviso: [refIccu.nota, refIccu.nota_regional].filter(Boolean).join(" ") || null,
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
      ...(cantidadIlegible ? { cantidad_ilegible: true } : {}),
      sin_apu: true,
      origen_precio: null,
      incompleto: true,
      motivo: tieneDescripcion ? "sin_precio" : "item_desconocido",
      mensaje: tieneDescripcion
        ? `«${descripcionEntrada.slice(0, 80)}» no casa con ningún ítem del catálogo y no trae precio: escriba su precio unitario o asígnele un ítem. Sin precio NO suma al total — un 0 sería un precio inventado.`
        : `El ítem «${codigo}» no existe en el catálogo cargado.`,
      costo_directo_unitario: null, costo_total: null, ...marcaSub(NaN),
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
      ...(cantidadIlegible ? { cantidad_ilegible: true } : {}),
      incompleto: true, motivo: "region_desconocida", mensaje: cd.error,
      costo_directo_unitario: null, costo_total: null, ...marcaSub(NaN),
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
    ...(cantidadIlegible ? { cantidad_ilegible: true } : {}),
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
    ...marcaSub(total),
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
  // `sin_apu` = sin composición que repartir: manual/archivo/propio Y el precio de referencia IDU (solo precio)
  const manuales = utiles.filter((i) => i.sin_apu);
  const porComponente = {
    material: red(utiles.reduce((a, i) => a + (i.costo_material_total || 0), 0)),
    mano_obra: red(utiles.reduce((a, i) => a + (i.costo_mano_obra_total || 0), 0)),
    equipo: red(utiles.reduce((a, i) => a + (i.costo_equipo_total || 0), 0)),
    transporte: red(utiles.reduce((a, i) => a + (i.costo_transporte_total || 0), 0)),
    sin_desglose: red(manuales.reduce((a, i) => a + i.costo_total, 0)),
  };

  /* ---------- subcontratado ----------
     Lo subcontratado entra al costo directo por el precio del sub (con SU AIU
     dentro). `aiu_sobre_subcontratado` decide si el AIU propio se aplica
     también sobre eso (default) o solo sobre lo propio; en el segundo caso lo
     subcontratado va al precio de venta a costo. El AIU ajeno incluido se
     publica cuando se declaró el % — es información, no se descuenta sola. */
  const subcontratados = utiles.filter((i) => i.subcontratado);
  const costoSubcontratado = red(subcontratados.reduce((a, i) => a + (i.costo_total || 0), 0));
  const costoPropio = red(costoDirectoTotal - costoSubcontratado);
  const subSinPct = subcontratados.filter((i) => i.aiu_subcontratista_pct == null).length;
  const aiuSubIncluido = subcontratados.length && subSinPct < subcontratados.length
    ? red(subcontratados.reduce((a, i) => a + (i.aiu_subcontratista_incluido || 0), 0)) : null;
  const baseAiu = cfg.aiu_sobre_subcontratado ? costoDirectoTotal : costoPropio;

  /* ---------- AIU ---------- */
  const aiuTotalPct = red(cfg.aiu_pct + cfg.utilidad_pct + cfg.imprevistos_pct);
  const factorAiu = cfg.modo_aiu === "compuesto"
    ? (1 + cfg.aiu_pct / 100) * (1 + cfg.utilidad_pct / 100) * (1 + cfg.imprevistos_pct / 100)
    : 1 + aiuTotalPct / 100;

  // base × factor + lo que no lleva AIU propio (0 salvo casilla apagada con subcontratos)
  const precioVenta = red(baseAiu * factorAiu + (costoDirectoTotal - baseAiu));
  /* ⚠️ EN MODO COMPUESTO EL DESGLOSE SE DERIVA DEL FACTOR REAL (27-ago-2026).
     Con los tres valores calculados SIEMPRE aditivos, `precio_venta − CD`
     dejaba plata que ninguna línea explicaba (CD $2.468.000 con 15/5/5:
     $44.115,50 sin dueño — la «fila que no cuadra» que este módulo persigue) y
     el IVA sobre la utilidad se calculaba sobre una U que no era la aplicada.
     Cada componente se lleva su parte de la composición en el orden del factor
     (A → U → I) y la suma reproduce `base × (factor − 1)` al centavo. En modo
     aditivo —el default y el de los pliegos tipo— nada cambia. */
  let valorAdministracion, valorImprevistos, valorUtilidad;
  if (cfg.modo_aiu === "compuesto") {
    valorAdministracion = red(baseAiu * (cfg.aiu_pct / 100));
    valorUtilidad = red(baseAiu * (1 + cfg.aiu_pct / 100) * (cfg.utilidad_pct / 100));
    valorImprevistos = red(baseAiu * (1 + cfg.aiu_pct / 100) * (1 + cfg.utilidad_pct / 100) * (cfg.imprevistos_pct / 100));
  } else {
    valorAdministracion = red(baseAiu * (cfg.aiu_pct / 100));
    valorImprevistos = red(baseAiu * (cfg.imprevistos_pct / 100));
    valorUtilidad = red(baseAiu * (cfg.utilidad_pct / 100));
  }

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
  /* Los BANCOS OFICIALES sin composición (IDU, FFIE, ICCU) comparten la FORMA
     de un precio manual —suman al total y no al reparto por componente— pero no
     su SIGNIFICADO: son referencias publicadas por una entidad, no una cifra que
     escribió una persona. Contarlos aquí decía «tecleado a mano» de un precio
     oficial; cada uno tiene su propia alerta con su vigencia y su ámbito. */
  const BANCOS_SIN_COMPOSICION = new Set(["idu", "ffie", "iccu"]);
  const manualesPropios = manuales.filter((i) => !BANCOS_SIN_COMPOSICION.has(i.origen_precio));
  if (manualesPropios.length) {
    alertas.push(`${manualesPropios.length} ítem(s) llevan precio del archivo importado o tecleado a mano, SIN composición de APU que lo respalde: suman al total pero no al reparto por componente, y en el Excel salen marcados.`);
  }
  const deIdu = utiles.filter((i) => i.origen_precio === "idu");
  if (deIdu.length) {
    const vig = (deIdu[0].referencia_idu_apu && deIdu[0].referencia_idu_apu.vigencia) || "";
    const fuera = deIdu.filter((i) => i.referencia_idu_apu && i.referencia_idu_apu.ajuste_regional === "ninguno").length;
    alertas.push(`${deIdu.length} ítem(s) toman el precio de referencia del IDU ${vig} (Bogotá; solo precio, sin composición: suman al total pero no al reparto por componente)`
      + (fuera ? `; ${fuera} en una obra fuera de Bogotá, con el precio de Bogotá SIN ajuste regional` : "")
      + `. Es una referencia, no una cotización.`);
  }
  /* FFIE: cobertura nacional y precio TOPE, no de mercado — el contrato
     adjudicado del propio dueño está POR ENCIMA. Dejarlo dentro de la alerta de
     «tecleado a mano» borraba las dos cosas que hay que saber para usarlo. */
  const deFfie = utiles.filter((i) => i.origen_precio === "ffie");
  if (deFfie.length) {
    const ref = deFfie[0].referencia_ffie_apu || {};
    const fuera = deFfie.filter((i) => i.referencia_ffie_apu && i.referencia_ffie_apu.nivel === "nacional").length;
    alertas.push(`${deFfie.length} ítem(s) toman el precio TOPE del FFIE ${ref.vigencia || ""} (solo precio, sin composición: suman al total pero no al reparto por componente)`
      + (fuera ? `; ${fuera} sin precio para su departamento` : "")
      + `. Es el máximo que reconoce el FFIE, no un precio de mercado: un contrato real puede estar por encima.`);
  }
  /* ICCU: la fuente más granular (municipio o provincia de Cundinamarca).
     Fuera de su departamento el precio viaja igual y hay que decirlo. */
  const deIccu = utiles.filter((i) => i.origen_precio === "iccu");
  if (deIccu.length) {
    const ref = deIccu[0].referencia_iccu_apu || {};
    const fuera = deIccu.filter((i) => i.referencia_iccu_apu && i.referencia_iccu_apu.fuera_de_cundinamarca).length;
    alertas.push(`${deIccu.length} ítem(s) toman el precio de referencia del ICCU ${ref.vigencia || ""} (Cundinamarca; solo precio, sin composición: suman al total pero no al reparto por componente)`
      + (fuera ? `; ${fuera} en una obra fuera de Cundinamarca, con ese precio SIN ajuste regional` : "")
      + `. Es una referencia oficial, no una cotización.`);
  }
  /* Los APU de referencia INVIAS se declaran en las alertas: son una referencia
     oficial, no una cotización, y el rendimiento propio no les aplica. */
  const deInvias = utiles.filter((i) => i.origen_precio === "invias");
  if (deInvias.length) {
    const vig = (deInvias[0].referencia_invias_apu && deInvias[0].referencia_invias_apu.vigencia) || "";
    const nacionales = deInvias.filter((i) => i.referencia_invias_apu && i.referencia_invias_apu.nivel === "nacional").length;
    alertas.push(`${deInvias.length} ítem(s) toman el APU de referencia oficial del INVIAS ${vig} (costo directo de la provincia representativa de su departamento`
      + (nacionales ? `; ${nacionales} con la mediana nacional porque el departamento no tiene libro INVIAS` : "")
      + `). Es una referencia, no una cotización: verifique antes de presentar.`);
    const conOverride = deInvias.filter((i) => i.aviso).length;
    if (conOverride) alertas.push(`${conOverride} ítem(s) INVIAS traían un rendimiento propio que NO se aplicó: un APU de referencia conserva sus cantidades y rendimientos oficiales; si el suyo difiere, escriba el precio unitario.`);
  }
  if (subcontratados.length) {
    alertas.push(`${subcontratados.length} ítem(s) subcontratado(s) por ${costoSubcontratado.toLocaleString("es-CO")} COP`
      + (cfg.aiu_sobre_subcontratado ? " (su AIU propio SÍ se aplica sobre ellos)." : " (entran al precio A COSTO: su AIU propio NO se aplica sobre ellos).")
      + (subSinPct ? ` ${subSinPct} sin el AIU del subcontratista declarado: no se sabe cuánto AIU ajeno va dentro de su precio.` : ""));
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
    /* «Atención:» y no ⚠️ — la regla del proyecto: un emoji lo dibuja el sistema
       operativo y esta cadena viaja por la API hasta la pantalla (27-ago-2026). */
    alertas.push("Atención: la baja se comió toda la utilidad y parte de la administración: el margen que queda no cubre los costos indirectos.");
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
      aiu_sobre_subcontratado: cfg.aiu_sobre_subcontratado,
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
      // subcontratos: cuánto del CD es del sub, cuánto propio, base del AIU y AIU ajeno incluido (null sin %)
      costo_directo_subcontratado: costoSubcontratado,
      costo_directo_propio: costoPropio,
      items_subcontratados: subcontratados.length,
      subcontratados_sin_aiu_declarado: subSinPct,
      base_aiu: baseAiu,
      aiu_subcontratista_incluido: aiuSubIncluido,
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
