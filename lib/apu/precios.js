/* ============================================================================
   lib/apu/precios · La cascada de fuentes de precio
   ----------------------------------------------------------------------------
   Un ítem se cotiza recorriendo fuentes de la más fuerte a la más débil y
   quedándose con la PRIMERA que responde. Cada respuesta viaja con su fuente y
   su confianza (R10): un precio sin origen no se puede discutir, y este es el
   módulo donde una cifra creíble y equivocada acaba en el precio de una oferta.

   ══════════════ LO QUE ESTE MÓDULO NO VA A HACER, Y POR QUÉ ═════════════════

   El encargo pide cinco niveles y pone en el tercero «precios estimados del
   SECOP II histórico por tipología y región». **Eso no puede producir el precio
   unitario de un ítem, y usarlo como tal sería inventar.**

   `p6dx-8zbt` publica el valor ADJUDICADO DEL CONTRATO ENTERO. De ahí sale, con
   suerte, cuánto costó un kilómetro de placa huella en Antioquia. NO sale
   cuánto cuesta el m³ de excavación que va dentro de esa placa huella: son
   preguntas de escalas distintas, y meter un promedio de contrato en la
   columna «valor unitario» de un ítem produce un número con cara de dato que
   nadie puede auditar. Es el error de categoría que este proyecto ya documentó
   («el SEGMENTO agrupa, nunca empareja»), aquí traducido a pesos.

   Lo que sí se puede hacer con el histórico, y se hace, es **contrastar el
   TOTAL**: «obras parecidas en este departamento se adjudicaron alrededor de
   $X». Va en un bloque aparte (`referenciaDeMercado`), rotulado como lo que es
   —una referencia sobre el contrato completo, no un precio de ítem— y NUNCA
   entra en la cascada de precios unitarios.

   ═════════════════════════ LOS CINCO NIVELES ════════════════════════════════

     1 · usuario     Precios que el contratista ya corrigió a mano. Mandan sobre
                     todo lo demás: son de SU mercado, SU proveedor y SU región.
                     Es la fuente más valiosa que puede tener la aplicación, y
                     la única que mejora sola con el uso.
     2 · pliego      Precios unitarios leídos de pliegos ya adjudicados.
                     NO DISPONIBLE hoy — ver `docs/APU_FUENTES.md`. El nivel
                     existe, se consulta y DECLARA por qué no respondió: un
                     hueco silencioso se confunde con «aquí no había nada».
     3 · mercado     Referencia de contrato del histórico SECOP. NO produce
                     precio unitario (ver arriba). Se consulta para el TOTAL.
     4 · catalogo    El catálogo base (contrato Nogal 4) con el factor de la
                     región. Es lo que había antes de este módulo.
     5 · sin_precio  No hay dato. El ítem NO suma al total y se pide el precio.
                     Un 0 aquí sería un precio inventado (R1).

   El orden NO es negociable y no depende de la confianza declarada: un precio
   del usuario, aunque sea viejo, describe su mercado mejor que una derivación
   por factor regional de un contrato de otra ciudad.
   ========================================================================== */
"use strict";

/* Confianza declarada por nivel. Es una ETIQUETA, no una probabilidad: no hay
   contra qué calibrarla, y fingir un número la volvería creíble. */
const NIVELES = Object.freeze([
  {
    id: "usuario",
    etiqueta: "Tu precio",
    confianza: "alta",
    porque: "Lo corregiste vos para este ítem: es de tu mercado y de tu proveedor.",
  },
  {
    id: "pliego",
    etiqueta: "Pliego adjudicado",
    confianza: "alta",
    porque: "Precio unitario leído del pliego de un proceso ya adjudicado.",
  },
  {
    id: "mercado",
    etiqueta: "Referencia de mercado (SECOP)",
    confianza: "baja",
    porque: "Valor de contratos parecidos ya adjudicados. Sirve para contrastar el TOTAL, no un ítem.",
  },
  {
    /* Encargo del dueño (ago 2026): precios de tienda como TECHO NEGOCIABLE.
       Mismo patrón que `mercado`: el nivel existe, se consulta y DECLARA por
       qué no produce el precio del ítem — una tienda cotiza el saco de cemento
       y el metro de cable, no el m³ de excavación. El techo por INSUMO viaja
       en `detalle.insumos[].techo_retail` (lib/apu/retail). */
    id: "retail",
    etiqueta: "Techo de tienda / lista de fabricante",
    confianza: "baja",
    porque: "Precio de vitrina o de lista, con IVA y margen de mostrador: sirve para negociar un insumo, no para costear un ítem.",
  },
  {
    /* Capa 3 del plan nacional (ago 2026): el banco de insumos de los APU
       Regionalizados del INVIAS, capturado por provincia. Mismo patrón que
       `retail`: el nivel existe, se consulta y DECLARA por qué no produce el
       precio del ítem — el banco cotiza el kilo de acero y la hora de
       motoniveladora, no el m³ de excavación. La referencia por INSUMO viaja
       en `detalle.insumos[].referencia_invias` (lib/apu/invias). */
    id: "invias",
    etiqueta: "Referencia oficial INVIAS",
    confianza: "media",
    porque: "Precio oficial de referencia del insumo en tu provincia (banco INVIAS, con rezago declarado): sirve para contrastar y negociar insumos, no para costear un ítem de obra.",
  },
  {
    id: "catalogo",
    etiqueta: "Catálogo de referencia",
    confianza: "media",
    porque: "Precio del contrato Nogal 4 (Bogotá 2025) ajustado por el factor de tu región.",
  },
  {
    /* Los 526 APU de REFERENCIA regionalizados del INVIAS (ago 2026): el costo
       directo oficial de la provincia representativa de tu departamento, con su
       composición. Es la respuesta al «no sabemos los precios de los ítems»: un
       presupuesto de obra vial casi entero cae aquí. Va DESPUÉS del catálogo
       porque los dos son espacios de códigos distintos (`NOG-`/`LOC-`/`INV-`
       frente a `INVIAS:`): para un ítem dado solo responde uno, y el orden entre
       ellos no decide nada; lo que sí decide es que un precio propio o del
       pliego siga por encima. */
    id: "invias_apu",
    etiqueta: "APU de referencia INVIAS",
    confianza: "media",
    porque: "Costo directo oficial del INVIAS para ese ítem de pago en la provincia representativa de tu departamento (vigencia declarada). Es una referencia, no una cotización.",
  },
  {
    /* Los 3 172 APU de referencia del IDU (Bogotá, ago 2026): precio SIN
       composición. Después de `invias_apu` por la misma razón que aquel va
       después del catálogo: espacios de códigos distintos (`IDU:`), para un
       ítem dado solo responde uno. */
    id: "idu_apu",
    etiqueta: "Precio de referencia IDU (Bogotá)",
    confianza: "media",
    porque: "Costo directo de referencia del IDU para ese APU en Bogotá (vigencia declarada; sin composición). Referencia, no cotización; fuera de Bogotá va sin ajuste y se dice.",
  },
  {
    id: "sin_precio",
    etiqueta: "Sin precio",
    confianza: null,
    porque: "No hay dato en ninguna fuente. No suma al total: un $0 sería un precio inventado.",
  },
]);

const nivelPorId = (id) => NIVELES.find((n) => n.id === id) || null;

/* Motivos por los que un nivel puede no responder. Se PUBLICAN: «no respondió»
   y «no existe» son cosas distintas, y confundirlas es lo que hace que nadie
   sepa si la fuente falló o si simplemente no había dato (R10). */
const MOTIVOS = Object.freeze({
  sin_perfil: "No hay perfil: los precios propios se guardan por contratista.",
  no_cargado: "Todavía no corregiste el precio de este ítem.",
  fuente_no_disponible: "Fuente no disponible en este despliegue (ver docs/APU_FUENTES.md).",
  no_aplica_a_item: "Esta fuente da valores de contrato completo, no precios unitarios de ítem.",
  techo_de_insumo: "El retail cotiza INSUMOS (el saco de cemento, el metro de cable), no ítems de obra: su techo se enseña en el desglose por insumo, nunca como precio del ítem.",
  referencia_oficial_insumo: "El banco INVIAS cotiza INSUMOS por provincia (el kilo de acero, la hora de motoniveladora), no ítems de obra: su referencia se enseña en el desglose por insumo, nunca como precio del ítem.",
  no_esta_en_catalogo: "El ítem no está en el catálogo de referencia.",
  no_es_item_invias: "No es un ítem de pago del INVIAS: los APU de referencia oficiales solo cubren los 526 ítems de las Especificaciones Generales de Carreteras.",
  no_es_item_idu: "No es un APU de la base de precios de referencia del IDU (Bogotá).",
  invias_sin_departamento: "El banco INVIAS no publica libro para ese departamento: se usó la mediana nacional y se declara.",
});

const num = (v) => {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

/* ─────────────────── nivel 1 · los precios del contratista ─────────────────
   `mapa` es lo que devuelve `leerPreciosUsuario`: { item_id: {precio, …} }.
   Un precio 0 o negativo NO es un precio (R1): se ignora en vez de cotizar en
   cero, que es lo mismo que regalar la obra. */
/* ── LA TRAMPA DE LA RENUMERACIÓN INVIAS, y cómo se desambigua ──────────────
   Los precios se guardan por `item_id` y nadie los purga, así que al corregir
   los códigos hay que traducirlos al leer (R11). Pero uno de los tres cambios
   fue un INTERCAMBIO y deja un código AMBIGUO:

     `INV-661.1` guardado ANTES de la corrección significaba «cuneta revestida»
     `INV-661.1` guardado DESPUÉS significa «alcantarilla en tubería»

   Aplicar el precio de una cuneta a una alcantarilla —o al revés— es
   exactamente el tipo de error que no se ve: sale un número plausible. Se
   desambigua con `guardado_el`, que ya viajaba en cada registro. Cuando la
   fecha falta, el registro NO se usa para el código ambiguo: preferir un precio
   posiblemente equivocado a no tener precio sería el peor canje de este módulo.

   Los otros dos cambios no son ambiguos (200 y 671 estaban libres), así que su
   alias vale con cualquier fecha. */
const FECHA_RENUMERACION_INVIAS = "2026-08-12";

function candidatosDePrecio(itemId) {
  const { CODIGOS_RENUMERADOS } = require("./catalogo.js");
  // el propio código: siempre, salvo que su significado haya cambiado
  const cambioDeSignificado = Object.prototype.hasOwnProperty.call(CODIGOS_RENUMERADOS, itemId);
  const out = [{ clave: itemId, desde: cambioDeSignificado ? FECHA_RENUMERACION_INVIAS : null }];
  // y el código VIEJO que hoy apunta aquí
  for (const [viejo, nuevo] of Object.entries(CODIGOS_RENUMERADOS)) {
    if (nuevo !== itemId) continue;
    /* El código viejo es AMBIGUO si además fue DESTINO de otro renombre: desde
       la corrección significa otra cosa, así que solo vale lo guardado ANTES.
       (`INV-661.1` es el caso: era la cuneta y hoy es la alcantarilla.) Mirar
       si el viejo es una CLAVE del mapa no basta — todos lo son por definición;
       lo que lo vuelve ambiguo es ser también un VALOR. */
    const reutilizado = Object.values(CODIGOS_RENUMERADOS).includes(viejo);
    out.push({ clave: viejo, hasta: reutilizado ? FECHA_RENUMERACION_INVIAS : null });
  }
  return out;
}

function delUsuario(itemId, mapa) {
  if (!mapa) return { hay: false, motivo: MOTIVOS.sin_perfil };
  let reg = null;
  for (const c of candidatosDePrecio(itemId)) {
    const r = mapa[c.clave];
    if (!r) continue;
    const f = typeof r.guardado_el === "string" ? r.guardado_el.slice(0, 10) : null;
    if (c.desde && (!f || f < c.desde)) continue;   // sin fecha no se arriesga
    if (c.hasta && (!f || f >= c.hasta)) continue;
    reg = r;
    break;
  }
  const precio = reg && num(reg.precio);
  if (precio == null || precio <= 0) return { hay: false, motivo: MOTIVOS.no_cargado };
  return {
    hay: true,
    precio,
    detalle: {
      guardado_el: reg.guardado_el || null,
      region: reg.region || null,
      // de dónde salió ese precio la primera vez: tecleado o traído de un Excel
      origen_original: reg.origen || null,
    },
  };
}

/* ─────────────────── nivel 4 · el catálogo con factor regional ─────────────
   NO reimplementa el costo directo: llama a `costoDirecto`, que es el punto
   único donde viven las cuatro fórmulas del APU (R2). Dos cálculos
   «equivalentes hoy» divergen a la primera corrección aplicada a uno solo, y
   aquí la divergencia sería entre el precio que la app cotiza y el que exporta.
   El require va DIFERIDO para no atar este módulo al grafo del catálogo en
   tiempo de carga (R5). */
function delCatalogo(itemId, cat, regionId, opcionesCosto = {}) {
  const { costoDirecto, itemPorCodigo } = require("./catalogo.js");
  /* Traduce los códigos INVIAS renumerados: los precios que el contratista
     corrigió (`apu:precios:*`) están guardados con el código VIEJO y nadie los
     purga, así que sin esto dejarían de encontrarse en silencio (R11). */
  const def = itemPorCodigo(cat, itemId);
  if (!def) return { hay: false, motivo: MOTIVOS.no_esta_en_catalogo };
  // las mismas opciones (jornada, EPP) que usa `calcular`: cotizar y calcular no pueden dar dos unitarios distintos
  const cd = costoDirecto(def, cat, regionId, opcionesCosto);
  if (cd.error || !Number.isFinite(cd.total) || cd.total <= 0) {
    return { hay: false, motivo: cd.error || MOTIVOS.no_esta_en_catalogo };
  }
  return {
    hay: true,
    precio: cd.total,
    detalle: { unidad: def.unidad || null, fuente_catalogo: def.fuente || null, region: regionId },
  };
}

/* ═══════════════════════ cotizar UN ítem ═══════════════════════════════════
   Devuelve SIEMPRE la cascada con lo que pasó en cada nivel. Publicar solo el
   que respondió impediría distinguir «esta fuente no tenía el dato» de «esta
   fuente ni se miró», que es la misma razón por la que el desglose de
   probabilidad publica sus seis pasos aunque no muerdan. */
/* ─────────────────── nivel 6 · el APU de referencia INVIAS ──────────────────
   Llama a `apuParaDepartamento`, la MISMA función que usa `calcular` (R2): la
   cotización y el cálculo no pueden dar dos unitarios distintos del mismo ítem.
   Sin departamento responde la mediana nacional y lo dice en el detalle. */
function delInviasApu(itemId, departamento) {
  const I = require("./invias_items.js");
  if (!I.esCodigoInvias(itemId)) return { hay: false, motivo: MOTIVOS.no_es_item_invias };
  const a = I.apuParaDepartamento(itemId, departamento || null);
  if (!a || !Number.isFinite(a.precio) || a.precio <= 0) return { hay: false, motivo: MOTIVOS.no_es_item_invias };
  return {
    hay: true,
    // el MISMO unitario que publica `calcular` (suma de componentes redondeados), no el `precio` oficial a ±$2
    precio: I.unitarioMotor(a),
    detalle: {
      unidad: a.unidad || null, vigencia: a.vigencia, nivel: a.nivel, departamento: a.departamento, precio_oficial: a.precio,
      provincia_representativa: a.provincia_representativa, provincias_usadas: a.provincias_usadas,
      nota: a.nivel === "nacional" ? MOTIVOS.invias_sin_departamento : null,
    },
  };
}

/* ─────────────────── nivel 7 · el precio de referencia IDU (Bogotá) ────────
   Llama a `precioReferencia`, la MISMA función que usa `calcular` (R2). */
function delIduApu(itemId, departamento) {
  const I = require("./idu_items.js");
  if (!I.esCodigoIdu(itemId)) return { hay: false, motivo: MOTIVOS.no_es_item_idu };
  const r = I.precioReferencia(itemId, departamento || null);
  if (!r || !Number.isFinite(r.precio) || r.precio <= 0) return { hay: false, motivo: MOTIVOS.no_es_item_idu };
  return {
    hay: true,
    precio: r.precio,
    detalle: { unidad: r.unidad || null, vigencia: r.vigencia, publicado: r.publicado, ciudad: r.ciudad, ajuste_regional: r.ajuste_regional, nota: r.nota_regional },
  };
}

function cotizarItem(item, { cat, regionId, preciosUsuario = null, opcionesCosto = {}, departamento = null } = {}) {
  const itemId = String((item && item.item_id) || "").trim();
  const cantidad = num(item && item.cantidad);

  const intentos = [];
  const registrar = (id, r) => {
    const n = nivelPorId(id);
    intentos.push({
      nivel: id,
      etiqueta: n.etiqueta,
      respondio: !!r.hay,
      precio: r.hay ? r.precio : null,       // null, jamás 0 (R1)
      motivo: r.hay ? null : r.motivo,
      ...(r.hay && r.detalle ? { detalle: r.detalle } : {}),
    });
    return r.hay ? { ...n, precio: r.precio, detalle: r.detalle || null } : null;
  };

  let elegido = registrar("usuario", delUsuario(itemId, preciosUsuario));

  if (!elegido) {
    registrar("pliego", { hay: false, motivo: MOTIVOS.fuente_no_disponible });
    /* El nivel de mercado se consulta y se declara SIEMPRE como no aplicable a
       un ítem. No es un hueco pendiente: es una decisión, y dejarla escrita
       aquí evita que alguien «complete la cascada» metiendo un promedio de
       contrato en la columna del valor unitario. */
    registrar("mercado", { hay: false, motivo: MOTIVOS.no_aplica_a_item });
    /* El retail se declara SIEMPRE como techo de insumo, igual que el mercado
       se declara como valor de contrato: las dos frases son cerraduras contra
       «completar la cascada» con un precio de otra categoría. */
    registrar("retail", { hay: false, motivo: MOTIVOS.techo_de_insumo });
    /* La referencia INVIAS se declara SIEMPRE como referencia de insumo, con
       la misma cerradura que el retail y el mercado: la frase impide
       «completar la cascada» con un precio de otra categoría. */
    registrar("invias", { hay: false, motivo: MOTIVOS.referencia_oficial_insumo });
    elegido = registrar("catalogo", delCatalogo(itemId, cat, regionId, opcionesCosto));
  }
  if (!elegido) {
    elegido = registrar("invias_apu", delInviasApu(itemId, departamento));
  }
  if (!elegido) {
    elegido = registrar("idu_apu", delIduApu(itemId, departamento));
  }

  if (!elegido) {
    const n = nivelPorId("sin_precio");
    return {
      item_id: itemId || null,
      cantidad,
      precio_unitario: null,
      total: null,
      fuente: n.id,
      etiqueta: n.etiqueta,
      confianza: null,
      porque: n.porque,
      suma_al_total: false,
      cascada: intentos,
    };
  }

  return {
    item_id: itemId || null,
    cantidad,
    precio_unitario: elegido.precio,
    // sin cantidad no hay total: `null × precio` daría 0, y 0 no es «gratis»
    total: cantidad == null ? null : Math.round(elegido.precio * cantidad * 100) / 100,
    fuente: elegido.id,
    etiqueta: elegido.etiqueta,
    confianza: elegido.confianza,
    porque: elegido.porque,
    detalle: elegido.detalle,
    suma_al_total: true,
    cascada: intentos,
  };
}

/* ═══════════════════════ cotizar una LISTA ════════════════════════════════ */
function cotizar({ items = [], catalogo = null, region = null, preciosUsuario = null, opcionesCosto = {}, departamento = null } = {}) {
  const { SEMILLA } = require("./catalogo.js");
  const cat = catalogo || SEMILLA;
  const regionId = region || (cat._meta && cat._meta.region_base) || "bogota_sabana";

  const lista = (Array.isArray(items) ? items : []).map((it) => cotizarItem(it || {}, {
    cat, regionId, preciosUsuario, opcionesCosto, departamento,
  }));

  const conPrecio = lista.filter((i) => i.suma_al_total && Number.isFinite(i.total));
  const porFuente = {};
  for (const i of lista) porFuente[i.fuente] = (porFuente[i.fuente] || 0) + 1;

  return {
    region: regionId,
    items: lista,
    resumen: {
      items_totales: lista.length,
      items_con_precio: lista.filter((i) => i.suma_al_total).length,
      items_sin_precio: lista.filter((i) => !i.suma_al_total).length,
      por_fuente: porFuente,
      /* COTA INFERIOR, y se dice: lo que falta es desconocido por definición,
         así que llamarlo «total» a secas afirmaría que está completo. */
      total_cota_inferior: conPrecio.length
        ? Math.round(conPrecio.reduce((a, i) => a + i.total, 0) * 100) / 100
        : null,
    },
    niveles: NIVELES,
  };
}

/* ═══════════ FUENTE A · referencia de mercado sobre el CONTRATO ════════════
   Lo único que el histórico de SECOP puede responder honestamente. NO es un
   precio unitario, y el nombre de cada campo lo dice.

   Se calcula sobre procesos YA ADJUDICADOS del corpus histórico, agrupando por
   FAMILIA UNSPSC (4 dígitos) y DEPARTAMENTO. La MEDIANA, no el promedio: un
   solo contrato de $40.000 M mueve un promedio y no mueve una mediana, y en
   obra pública esos contratos existen.

   El mínimo de 5 es el mismo del índice de competencia y por la misma razón:
   por debajo, la mediana describe a los tres procesos que había, no al
   mercado. */
const MIN_PROCESOS_MERCADO = 5;

function medianaDe(valores) {
  if (!valores.length) return null;
  const o = [...valores].sort((a, b) => a - b);
  const m = Math.floor(o.length / 2);
  return o.length % 2 ? o[m] : Math.round(((o[m - 1] + o[m]) / 2) * 100) / 100;
}

function referenciaDeMercado(procesos = [], { familia = null, departamento = null } = {}) {
  /* El valor adjudicado se lee con la MISMA función del índice de competencia
     (R2): las columnas de adjudicación de SECOP no tienen nombre garantizado y
     una segunda lista de candidatas se desincroniza en cuanto alguien añade un
     nombre a una sola. */
  const { numero, primero, esAdjudicado, CAMPOS_VALOR_ADJUDICADO } = require("../indice_competencia.js");
  const { norm } = require("../semantica.js");
  // la MISMA lista de candidatas que usa el índice, no una copia
  const valorAdjudicadoDe = (lic) => numero(primero(lic, CAMPOS_VALOR_ADJUDICADO));

  const depBuscado = departamento ? norm(departamento) : null;
  const famBuscada = familia ? String(familia).replace(/\D/g, "").slice(0, 4) : null;

  const valores = [];
  let mirados = 0, descartados = 0;
  for (const p of procesos) {
    if (!p) continue;
    mirados++;
    if (!esAdjudicado(p)) { descartados++; continue; }
    if (depBuscado && norm(p.departamento_entidad || "") !== depBuscado) continue;
    const cod = String(p.codigo_principal_de_categoria || "").replace(/\D/g, "");
    if (famBuscada && cod.slice(0, 4) !== famBuscada) continue;
    const v = valorAdjudicadoDe(p);
    if (v != null && v > 0) valores.push(v);
  }

  if (valores.length < MIN_PROCESOS_MERCADO) {
    return {
      aplicable: false,
      motivo: valores.length === 0
        ? "No hay contratos adjudicados con valor para esa familia y ese departamento."
        : `Solo ${valores.length} contratos: por debajo de ${MIN_PROCESOS_MERCADO} la mediana describe la muestra, no el mercado.`,
      procesos_analizados: valores.length,
      procesos_mirados: mirados,
      // jamás 0: la falta de base no es una mediana de cero (R1)
      valor_mediano_contrato: null,
    };
  }

  return {
    aplicable: true,
    familia: famBuscada,
    departamento: departamento || null,
    procesos_analizados: valores.length,
    procesos_mirados: mirados,
    valor_mediano_contrato: medianaDe(valores),
    rango: { min: Math.min(...valores), max: Math.max(...valores) },
    /* El rótulo va PEGADO al dato para que no se pueda citar sin él. */
    que_es: "Valor mediano del CONTRATO COMPLETO de obras parecidas ya adjudicadas en este departamento. "
      + "Sirve para contrastar el total de tu presupuesto — NO es el precio unitario de ningún ítem.",
  };
}

/* ═══════════ EL APRENDIZAJE · los precios del usuario en Redis ═════════════
   Cada vez que el contratista corrige un precio a mano, ese precio queda en su
   perfil y manda la próxima vez que el mismo ítem aparezca en cualquier
   presupuesto. Es lo que hace que la aplicación se vuelva más precisa con el
   uso sin que nadie tenga que administrar nada.

   Se guarda en un HASH (`apu:precios:{perfil}`) y no en una clave por ítem: son
   ~170 ítems posibles y un `hgetall` es UN comando, mientras que una clave por
   ítem serían N lecturas por cotización. Es la misma razón por la que el índice
   de baja usa tres hashes y no una clave por entidad.

   NO SE GUARDA TODO LO QUE EL USUARIO TECLEA. Solo lo que casa con un ítem del
   CATÁLOGO (`item_id`): un precio pegado a una fila suelta de un Excel
   importado no tiene a qué ítem volver, así que guardarlo crearía entradas
   basura que nadie podría corregir después. Se cuenta lo descartado. */
const MAX_PRECIOS_USUARIO = 2000;

function normalizarPreciosParaGuardar(items = [], { region = null, ahora = null } = {}) {
  const guardadoEl = ahora || new Date().toISOString();
  const nuevos = {};
  let descartados = 0;
  for (const it of Array.isArray(items) ? items : []) {
    if (!it) continue;
    const itemId = String(it.item_id || "").trim();
    const precio = num(it.precio_manual);
    /* Sin ítem del catálogo no hay a qué volver; un precio <= 0 no es un precio
       (R1) y guardarlo haría que la próxima cotización valiera cero. */
    if (!itemId || precio == null || precio <= 0) { if (precio != null && precio > 0) descartados++; continue; }
    nuevos[itemId] = {
      precio,
      guardado_el: guardadoEl,
      region: region || null,
      origen: it.origen_precio === "archivo" ? "archivo" : "manual",
    };
  }
  return { nuevos, descartados };
}

/* Lectura tolerante: un valor corrupto se CUENTA y se salta, no tumba la
   cotización entera — la misma regla que el listado de borradores. */
function interpretarHash(hash) {
  const mapa = {};
  let ilegibles = 0;
  for (const [k, v] of Object.entries(hash || {})) {
    try {
      const reg = typeof v === "string" ? JSON.parse(v) : v;
      if (reg && num(reg.precio) != null) mapa[k] = reg; else ilegibles++;
    } catch { ilegibles++; }
  }
  return { mapa, ilegibles };
}

async function leerPreciosUsuario(redis, perfil) {
  if (!redis || !perfil) return { mapa: null, ilegibles: 0 };
  const { CLAVES } = require("../almacen.js");
  try {
    const hash = await redis.hgetall(CLAVES.apuPreciosUsuario(perfil));
    if (!hash || !Object.keys(hash).length) return { mapa: {}, ilegibles: 0 };
    return interpretarHash(hash);
  } catch {
    /* Redis caído NO es «no tenés precios»: devolver un mapa vacío haría que la
       cotización cayera al catálogo en silencio y el usuario vería otro precio
       sin saber por qué. `null` significa «no se pudo consultar» y quien cotiza
       lo declara. */
    return { mapa: null, ilegibles: 0, error: true };
  }
}

async function guardarPreciosUsuario(redis, perfil, items, { region = null } = {}) {
  if (!redis || !perfil) return { guardados: 0, descartados: 0 };
  const { CLAVES } = require("../almacen.js");
  const { nuevos, descartados } = normalizarPreciosParaGuardar(items, { region });
  const claves = Object.keys(nuevos);
  if (!claves.length) return { guardados: 0, descartados };
  if (claves.length > MAX_PRECIOS_USUARIO) {
    return { guardados: 0, descartados, error: `Demasiados precios (${claves.length}).` };
  }
  const campos = {};
  for (const k of claves) campos[k] = JSON.stringify(nuevos[k]);
  await redis.hset(CLAVES.apuPreciosUsuario(perfil), campos);
  return { guardados: claves.length, descartados };
}

/* ═══════ LA CASCADA, EXPLICADA SIN VOLVER A CALCULARLA ═════════════════════
   `cotizarItem` produce la cascada como efecto de cotizar. Pero el presupuesto
   lo arma `calculo.js`, que ya sabe de dónde salió cada precio y no puede pagar
   un segundo `costoDirecto` por ítem solo para redactar la explicación — con
   200 ítems eso es el doble de trabajo para un texto.

   Esta función es PURA: recibe lo que ya se decidió y redacta por qué. Los
   niveles y los motivos salen de `NIVELES` y `MOTIVOS`, los mismos que usa la
   cotización (R2): dos listas de «fuentes de precio» divergirían a la primera
   que se añada, y la divergencia sería entre lo que la app hace y lo que dice
   que hace.

   POR QUÉ IMPORTA ENSEÑARLA: el badge dice DE DÓNDE vino el precio; la cascada
   dice POR QUÉ NO VINO DE UNA FUENTE MEJOR. «Derivado regional» sin más se lee
   como un defecto del programa; «no tenés precio propio para este ítem todavía»
   es una instrucción. */
function explicarCascada(itemId, { preciosUsuario = null, enCatalogo = false, enInvias = false, enIdu = false, elegido = null } = {}) {
  const usuario = delUsuario(itemId, preciosUsuario);
  const pasos = [];
  const push = (id, respondio, motivo) => {
    const n = nivelPorId(id);
    pasos.push({ nivel: id, etiqueta: n.etiqueta, respondio, motivo: respondio ? null : motivo });
  };

  push("usuario", elegido === "propio", usuario.hay ? null : usuario.motivo);
  push("pliego", false, MOTIVOS.fuente_no_disponible);
  push("mercado", false, MOTIVOS.no_aplica_a_item);
  push("retail", false, MOTIVOS.techo_de_insumo);
  push("invias", false, MOTIVOS.referencia_oficial_insumo);
  push("catalogo", elegido === "catalogo", enCatalogo
    ? "Hay precio en el catálogo, pero manda el que está por encima."
    : MOTIVOS.no_esta_en_catalogo);
  push("invias_apu", elegido === "invias_apu", enInvias
    ? "Hay APU de referencia INVIAS, pero manda el que está por encima."
    : MOTIVOS.no_es_item_invias);
  push("idu_apu", elegido === "idu_apu", enIdu
    ? "Hay precio de referencia IDU, pero manda el que está por encima."
    : MOTIVOS.no_es_item_idu);

  /* Los precios que la persona teclea AHORA —o que traía el Excel— no son un
     nivel de la cascada: son una decisión suya que la corta de raíz. Se dice,
     porque si no la cascada parecería no haberse recorrido. */
  if (elegido === "manual" || elegido === "archivo") {
    return {
      corto_por: elegido,
      motivo: elegido === "archivo"
        ? "El precio viene del archivo que importaste y manda sobre todas las fuentes."
        : "Escribiste este precio a mano, así que manda sobre todas las fuentes.",
      pasos,
    };
  }
  return { corto_por: null, motivo: null, pasos };
}

module.exports = {
  cotizar, cotizarItem, referenciaDeMercado, medianaDe, explicarCascada,
  /* `delUsuario` se exporta para que `lib/apu/calculo` consulte los precios
     propios con ESTA función y no con una copia (R2). No es un detalle de
     estilo: aquí vive la desambiguación por fecha del código INVIAS reutilizado
     (`INV-661.1` era la cuneta y hoy es la alcantarilla), y una segunda lectura
     que la ignorase aplicaría el precio de una cosa a la otra en silencio. */
  delUsuario, candidatosDePrecio, FECHA_RENUMERACION_INVIAS,
  leerPreciosUsuario, guardarPreciosUsuario, normalizarPreciosParaGuardar, interpretarHash,
  NIVELES, MOTIVOS, MIN_PROCESOS_MERCADO, MAX_PRECIOS_USUARIO,
};
