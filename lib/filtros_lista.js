/* lib/filtros_lista.js · Aplicación en el SERVIDOR de los siete filtros del
   listado (Fase 8 · Detekta v4)
   ─────────────────────────────────────────────────────────────────────────────
   El VOCABULARIO (opciones, etiquetas, rangos, departamentos, estado de URL)
   vive en public/filtros.js y se RE-USA aquí: este módulo añade lo que exige
   el corpus —clasificar una fila por tipo de trabajo, modalidad, departamento,
   cuantía y días para el cierre— y lo que exige la petición: aplicar el estado
   a la lista, contar las facetas y, cuando el resultado es CERO, decir qué
   filtro aflojar y cuántos procesos aparecerían.

   No es la cascada de juicio (lib/filtros.js: modalidad competitiva → estado →
   objeto → capacidad): esa decide qué es VISIBLE para un perfil; esto decide
   qué quiere VER quien consulta, y por eso corre DESPUÉS y no toca
   `totales.visibles` (la regla de «los filtros que ELIGE quien consulta se
   quedan fuera de la cascada»).

   Reglas que no hay que re-aprender:
   · La clasificación por tipo de trabajo se apoya en `tipo_de_contrato` (100 %
     poblado en el censo real de 2026-08-16, docs/datos.md §6) y en la
     pertinencia YA calculada por la cascada (rup.pertinencia.tipo) más los
     verbos de obra de lib/semantica: no hay una segunda lista de «esto es
     obra». Un «Suministro» CON verbo de obra («suministro e instalación de
     tubería») es OBRA: la compra pura ya la sacó la capa anti-suministro.
   · La modalidad se lee de `modalidad_de_contratacion` normalizada; los
     literales de SECOP II varían («Selección Abreviada de Menor Cuantía»,
     «Seleccion Abreviada Menor Cuantia Sin Manifestacion Interes») y las
     expresiones los cubren por raíz. Lo que no case va a «otra» y se cuenta.
   · El departamento se resuelve con la MISMA normalización que
     lib/accesibilidad (`clave`), y «No Definido» (7,6 % del dataset) es
     `sin_dato`: un filtro por departamento NO lo incluye ni lo excluye a
     ciegas — se cuenta aparte y la sugerencia lo dice.
   · Los días para el cierre se calculan como en el frontend (hora Colombia:
     `ahora − 5 h`), con el «ahora» INYECTABLE para que la prueba no dependa
     del reloj.
   · Un valor desconocido en cualquier filtro se ignora (public/filtros.js ya
     lo depura al leer): un enlace guardado no puede vaciar la lista.
   · Cero resultados → `sugerencia`: se prueba QUITAR cada filtro activo por
     separado y se devuelve el que más procesos recupera, con la cifra REAL
     (contada, no estimada). Si ninguno recupera nada, `null` — no se
     inventa una salida. */
"use strict";

const Filtros = require("../public/filtros.js");
const { norm } = require("./semantica.js");
const habiles = require("./habiles.js");
const { manifestacionDeFila, sigueValiendoLaPena, esUrgente } = require("./manifestacion.js");
const { hayVerboDeObra, OFFSET_COLOMBIA_MS } = require("./filtros.js");

const DIA_MS = 86400000;

/* ─────────────────────── clasificación de una fila ─────────────────────── */
const INTERVENTORIA_RE = /\binterventoria\b/;
/* ═══ TRES PRECISIONES MEDIDAS SOBRE EL LISTADO REAL (18-ago-2026) ═══════════
   El dueño vio «SUMINISTRO DE PORCIONES PERSONALES DE COMIDA» bajo el filtro
   de obra. Bajando 726 procesos servidos (helder + genesis) la causa era
   sistemática, no un caso: bajo «obra» caían (a) COMPRAS con un verbo de obra
   detrás de «para» —«SUMINISTRO DE MATERIAL GRANULAR PARA EL MANTENIMIENTO DE
   VÍAS», «SUMINISTRO DE TUBERÍA PARA LA CONSTRUCCIÓN DE OBRAS DE DRENAJE»,
   «MATERIALES DE FERRETERÍA Y CONSTRUCCIÓN CON DESTINO A…»: el verbo dice qué
   hará la ENTIDAD con lo comprado, no qué se contrata—; (b) MANTENIMIENTO DE
   EQUIPOS —ascensores, aires acondicionados, extintores, vehículos, plantas
   eléctricas, UPS, calderas, equipos de laboratorio, licenciamiento— donde
   «mantenimiento» es el único verbo de obra y no hay infraestructura civil; y
   (c) ALQUILER de maquinaria («alquiler de maquinaria amarilla para el
   mantenimiento de vías»). Las tres son «servicios» o «suministro», no obra,
   y con «servicios» apagado por defecto (public/filtros.js) dejan de salir
   sin que nadie las apague. Nada de esto toca la cascada de juicio (lo que
   es VISIBLE): reclasifica lo que quien consulta VE bajo cada tipo. */
const CABEZA_SUMINISTRO_RE = /^\s*(?:[a-z0-9.\-\/]+\s+)?(?:contratar\s+(?:a\s+precio\s+unitario\s+fijo\s+)?(?:el\s+|la\s+)?)?(?:sumini?n?istro|suministrar|compra|compraventa|adquisicion|adquirir|venta)\b/;
const CORTE_DESTINO_RE = /\s(?:para|con\s+destino|destinad[oa]s?|en\s+apoyo|requerid[oa]s?\s+(?:en|para))\b/;
const EJECUCION_EN_CABEZA_RE = /\b(?:instalaci|montaje|construcci|ejecuci|obras?\b|adecuaci|mantenimiento|reparaci|puesta\s+en\s+(?:funcionamiento|marcha|operacion))/;
const MATERIAL_DE_OBRA_RE = /\b(?:materiales?|elementos?|insumos?|articulos?|productos?|herramientas?)\s+(?:de\s+|para\s+(?:la\s+)?)(?:construccion|ferreteria|obra)(?:\s+(?:y|e|,)\s+(?:de\s+)?(?:construccion|ferreteria|obra))?\b/g;
const ALQUILER_RE = /\b(?:alquiler|arrendamiento)\s+de\s+(?:maquinaria|equipos?\b|vehiculos?|un\s+vehiculo|volquetas?|excavadora|retroexcavadora|camion|motoniveladora)/;
const EQUIPOS_RE = /\b(?:ascensor(?:es)?|aires?\s+(?:acondicionad|marca|tipo|mini)|extintor(?:es)?|vehiculos?|motocicletas?|automotor|planta(?:s)?\s+electrica|ups\b|caldera|calderin|equipos?\s+de\s+(?:laboratorio|computo|comunicaci|rayos|refrigeraci|medicion|monitoreo|oficina|impresion|radiolog|biomedic)|servidor(?:es)?|licenciamiento|licencias?\b|software|infraestructura\s+tecnologica|plataforma\s+tecnologica|radar|radomo|cctv|camaras?\s+de\s+seguridad|purificador|cuarto\s+frio|embarcaci|puentes?\s+grua|impresoras?|fotocopiadoras?|kits?\s+de\s+carretera|metrolog|calibraci|equipos?\s+medicos?|equipos?\s+biomedicos?|electrodomestic|repuestos\s+(?:mecanicos|originales)|revision\s+tecnico|tecnico\s*mecanica|voz\s+y\s+datos|electrobombas?|sistema\s+de\s+presion|red\s+contra\s*incendios|equipos?\s+contra\s*incendios|generadores?\s+de\s+energia|subestaci(?:on|ones)\s+electric|circuito\s+cerrado|componente\s+tecnologico|soluciones?\s+de\s+infraestructura|puesta\s+en\s+funcionamiento\s+y\s+soporte)/;
/* Obra civil INEQUÍVOCA (verbos y objetos de obra). Sin sustantivos de LUGAR
   («sede», «escuela», «hospital», «edificio»): «mantenimiento de los ascensores
   de la ESCUELA» no es obra por estar en una escuela — costó la primera medición. */
const OBRA_CIVIL_FUERTE_RE = /\b(?:construcci|pavimentaci|placa\s+huella|malla\s+vial|vias?\b|acueducto|alcantarillado|puentes?\b(?!\s+grua)|urbanismo|anden(?:es)?|sardinel|obras?\s+civil|cubiertas?\b|estructura\s+(?:metalica|de\s+concreto)|redes?\s+(?:hidraulica|sanitaria|de\s+acueducto|de\s+alcantarillado|electrica\s+de\s+media|electrica\s+de\s+baja)|infraestructura\s+(?:vial|educativa|hospitalaria|deportiva)|planta\s+de\s+tratamiento|ptap|ptar|canales?\s+de\s+aguas)/;

/* Servicios que no son obra por más código de obra que traigan (el dueño vio
   «SUMINISTRO DE PORCIONES PERSONALES DE COMIDA» bajo el filtro de obra): la
   lista es CORTA y literal — cada término salió del listado real. */
const SERVICIO_NO_OBRA_RE = /\b(?:apoyo\s+logistico|gestion\s+documental|atencion\s+integral|adultos?\s+mayores|encargo\s+fiduciario|seleccionar\s+(?:al?\s+|a\s+un\s+|a\s+los\s+)?(?:accionista|socio|oferentes)|analisis\s+(?:fisicoquimic|microbiolog|de\s+glifosato)|toma\s+de\s+muestras|caracterizacion\s+(?:fisicoquimica|microbiologica)|lavado\s+(?:y\s+desinfeccion\s+)?de\s+tanques|saneamiento\s+basico\s+ambiental|fumigaci|control\s+de\s+plagas|vigilancia\s+(?:privada|y\s+seguridad)|aseo\s+y\s+cafeteria|transporte\s+escolar|alimentacion\s+escolar|raciones|porciones|comidas?\b|alimentos|catering|refrigerios|servicios?\s+de\s+personal|personal\s+de\s+soporte|soporte\s+(?:tecnico\s+)?en\s+ti\b|seguridad\s+perimetral|hiperconvergencia|licenciamiento|licencias?\s+de\s+(?:software|uso)|garantias?\s+de\s+los\s+servidores|protocolo\s+ipv6)/;

/* ¿Es una COMPRA disfrazada de obra por el «para»? La cabeza del objeto (antes
   de «para / con destino / destinado / en apoyo») empieza por suministro/
   compra/adquisición y no tiene ningún verbo de EJECUCIÓN propio; «materiales
   de construcción» o «elementos de ferretería» no cuentan como verbo. */
function cabezaEsCompra(t) {
  if (!CABEZA_SUMINISTRO_RE.test(t)) return false;
  const corte = t.search(CORTE_DESTINO_RE);
  const cabeza = (corte >= 0 ? t.slice(0, corte) : t).replace(MATERIAL_DE_OBRA_RE, " ");
  return !EJECUCION_EN_CABEZA_RE.test(cabeza);
}
/* Se mira la DESCRIPCIÓN y el NOMBRE por separado: el nombre suele ser el
   número del proceso o la modalidad («SELECCIÓN ABREVIADA POR SUBASTA
   INVERSA») y taparía la cabeza real de la descripción. */
function esCompraPorLaCabeza(l) {
  return cabezaEsCompra(norm(String(l.descripci_n_del_procedimiento || ""))) || cabezaEsCompra(norm(String(l.nombre_del_procedimiento || "")));
}
/* ¿Es mantenimiento/servicio de EQUIPOS y no de infraestructura civil? */
function esServicioDeEquipos(t) {
  return EQUIPOS_RE.test(t) && !OBRA_CIVIL_FUERTE_RE.test(t);
}
const CONSULTORIA_RE = /\b(?:consultoria|estudios?\s+y\s+disenos?|disenos?\s+(?:tecnico|estructural|hidraulico|electrico|arquitectonico|de\s+obra)|asesoria\s+tecnica|estudios?\s+(?:tecnico|de\s+suelos|geotecnico|hidrologico|de\s+factibilidad))\b/;
const SUMINISTRO_CONTRATO_RE = /suministro|compraventa|arrendamiento de muebles/;

function textoDe(l) {
  return norm(`${l.nombre_del_procedimiento || ""} ${l.descripci_n_del_procedimiento || ""}`);
}

/* obra | consultoria | interventoria | suministro | servicios.
   `rup` es el veredicto ya calculado por la cascada (opcional): trae
   `pertinencia.tipo` (consultoria | infraestructura | obra_civil | …). */
function tipoTrabajoDe(l, rup) {
  const t = textoDe(l);
  const contrato = norm(String(l.tipo_de_contrato || ""));
  const pert = rup && rup.pertinencia ? rup.pertinencia : null;
  if (INTERVENTORIA_RE.test(t) || contrato === "interventoria") return "interventoria";
  if (contrato === "consultoria" || CONSULTORIA_RE.test(t) || (pert && pert.tipo === "consultoria")) return "consultoria";
  const verboObra = hayVerboDeObra(t);
  const esCompra = SUMINISTRO_CONTRATO_RE.test(contrato);
  // servicios que no son obra por más código de obra que traigan (comida, logística, fiducia, licencias…)
  if (contrato !== "obra" && SERVICIO_NO_OBRA_RE.test(t)) return esCompra ? "suministro" : "servicios";
  if (contrato === "obra") return "obra";
  // compra por la cabeza del objeto: el verbo de obra que hay va después de «para»
  if (esCompraPorLaCabeza(l)) return "suministro";
  // alquiler de maquinaria y mantenimiento/compra de EQUIPOS no son obra, tengan el verbo que tengan
  if (ALQUILER_RE.test(t)) return "servicios";
  if (esServicioDeEquipos(t)) return esCompra ? "suministro" : "servicios";
  if (esCompra) return verboObra ? "obra" : "suministro";
  if (verboObra || (pert && (pert.tipo === "obra_civil" || pert.tipo === "infraestructura") && pert.nivel === "verde")) return "obra";
  return "servicios";
}

/* licitacion | abreviada | subasta | meritos | minima | directa | especial | otra */
function modalidadDe(l) {
  const m = norm(String(l.modalidad_de_contratacion || ""));
  if (!m) return "otra";
  if (m.includes("licitacion")) return "licitacion";
  if (m.includes("subasta")) return "subasta";
  if (m.includes("menor cuantia")) return "abreviada";
  if (m.includes("concurso de meritos")) return "meritos";
  if (m.includes("minima cuantia")) return "minima";
  if (m.includes("regimen especial")) return "especial";
  if (m.includes("directa")) return "directa";
  return "otra";
}

/* { codigo, nombre, clave } o null (sin dato / «No Definido»). */
function departamentoDe(l) {
  return Filtros.departamento(l.departamento_entidad || "");
}

/* Días que faltan para el cierre, con la hora Colombia (misma cuenta que
   `diasParaCierre` del frontend). null sin fecha legible. */
function diasParaCierre(l, ahoraMs) {
  const c = l.fecha_cierre;
  if (!c) return null;
  const t = Date.parse(c);
  if (!Number.isFinite(t)) return null;
  const ahora = Number.isFinite(ahoraMs) ? ahoraMs : Date.now();
  return Math.ceil((t - (ahora - OFFSET_COLOMBIA_MS)) / DIA_MS);
}

/* Fecha de cierre como YYYY-MM-DD (para el rango de fechas). */
function fechaCierreISO(l) {
  const c = l.fecha_cierre;
  if (!c) return null;
  const m = String(c).match(/^(\d{4}-\d{2}-\d{2})/);
  return m ? m[1] : null;
}

const soloDigitos = (s) => String(s || "").replace(/\D/g, "");

/* ¿La fila es de la entidad pedida? Se acepta NIT (solo dígitos, con o sin
   dígito de verificación) o nombre (subcadena normalizada). */
function esDeEntidad(l, entidad) {
  const e = String(entidad || "").trim();
  if (!e) return true;
  const nitPedido = soloDigitos(e);
  if (nitPedido && nitPedido.length >= 6 && /^[\d.\-\s]+$/.test(e)) {
    const nitFila = soloDigitos(l.nit_entidad);
    if (!nitFila) return false;
    return nitFila === nitPedido || nitFila.startsWith(nitPedido) || (nitPedido.startsWith(nitFila) && nitFila.length >= 8);
  }
  return norm(String(l.entidad || "")).includes(norm(e));
}

/* ─────────────────────── el estado, aplicado ─────────────────────── */
/* Contexto que la clasificación necesita y el handler ya tiene: `rupDe(l)`
   (veredicto memoizado) y `ahora`. Se memoiza la clasificación por fila. */
function crearClasificador({ rupDe = () => null, ahora = Date.now() } = {}) {
  const memo = new Map();
  const hoy = habiles.hoyColombia(ahora);
  return (l) => {
    let c = memo.get(l);
    if (c) return c;
    const dias = diasParaCierre(l, ahora);
    const manif = manifestacionDeFila(l, hoy);
    const depto = departamentoDe(l);
    c = {
      tipo: tipoTrabajoDe(l, rupDe(l)),
      modalidad: modalidadDe(l),
      departamento: depto ? depto.codigo : null,
      ciudad: norm(String(l.ciudad_entidad || "")),
      cuantia: Number(l.cuantia_cop) || 0,
      rango: Filtros.rangoCuantiaDe(l.cuantia_cop),
      dias,
      ventana: Filtros.ventanaCierreDe(dias),
      cierreISO: fechaCierreISO(l),
      /* Manifestación de interés (menor cuantía): null si la modalidad no la
         exige. Si la exige, la VENTANA en la que puede cerrar (la ley fija un
         máximo de 3 hábiles, no un plazo: la entidad pone el suyo) y el estado
         de tres valores. Nunca una fecha de vencimiento inventada. */
      manifestacion: manif,
      texto: null, // perezoso
    };
    memo.set(l, c);
    return c;
  };
}

/* ¿La fila cumple el estado? Cada campo del estado es una conjunción. */
function cumple(l, c, estado) {
  if (!estado) return true;
  const tipos = estado.tipo || Filtros.TIPOS_POR_DEFECTO;
  if (!tipos.includes(c.tipo)) return false;
  if (estado.modalidad && !estado.modalidad.includes(c.modalidad)) return false;
  if (estado.dep && (!c.departamento || !estado.dep.includes(c.departamento))) return false;
  if (estado.ciudad && !c.ciudad.includes(norm(estado.ciudad))) return false;
  if (estado.min) {
    // cuantía 0 = SIN DATO: no entra en ningún rango de pesos (no es «gratis»)
    if (!c.cuantia) return false;
    if (estado.min.min != null && c.cuantia < estado.min.min) return false;
    if (estado.min.max != null && c.cuantia > estado.min.max) return false;
  }
  if (estado.cierre) {
    if (estado.cierre.ventana) {
      if (!Filtros.cumpleVentana(c.dias, estado.cierre.ventana)) return false;
    } else {
      if (!c.cierreISO) return false;
      if (estado.cierre.desde && c.cierreISO < estado.cierre.desde) return false;
      if (estado.cierre.hasta && c.cierreISO > estado.cierre.hasta) return false;
    }
  }
  if (estado.entidad && !esDeEntidad(l, estado.entidad)) return false;
  if (estado.manif) {
    if (!c.manifestacion) return false;
    /* «abierta» = todavía vale la pena ir a mirar. INCLUYE `por_confirmar` (el
       plazo puede estar corriendo o haber cerrado): excluirlo escondería justo
       las urgentes, que es lo contrario de lo que pide quien marca la casilla.
       Lo que no se pudo situar (`sin_fecha`) no se afirma abierto: queda dentro
       de «todas». */
    if (estado.manif === "abierta" && !sigueValiendoLaPena(c.manifestacion)) return false;
  }
  if (estado.q) {
    if (c.texto == null) c.texto = `${textoDe(l)} ${norm(String(l.entidad || ""))}`;
    if (!c.texto.includes(norm(estado.q))) return false;
  }
  return true;
}

function aplicar(filas, estado, clasificar) {
  return filas.filter((l) => cumple(l, clasificar(l), estado));
}

/* Facetas: cuántas filas de la BASE (antes de los filtros del usuario) caen
   en cada opción. Es lo que permite pintar «Obra (312) · Consultoría (41)» y
   deshabilitar lo que daría cero. `sin_dato` se cuenta aparte, nunca se
   reparte a ojo. */
function facetas(filas, clasificar) {
  const cuenta = (ids) => Object.fromEntries([...ids, "sin_dato"].map((k) => [k, 0]));
  const f = {
    tipo: cuenta(Filtros.TIPOS_TRABAJO.map((t) => t.id)),
    modalidad: cuenta([...Filtros.MODALIDADES.map((m) => m.id), "otra"]),
    departamento: {},
    cuantia: cuenta(Filtros.RANGOS_CUANTIA.map((r) => r.id)),
    cierre: cuenta(Filtros.VENTANAS_CIERRE.map((v) => v.id)),
    /* Manifestación de interés: cuántos procesos de menor cuantía hay.
       `abiertas` = en los que todavía vale la pena ir a mirar (con certeza
       abiertos + los que están dentro de la ventana). `urgentes` ⊂ `abiertas`
       = hay que entrar a SECOP II HOY, porque el plazo puede cerrar hoy o
       haber cerrado ya. `sin_fecha` = no se pudo situar la ventana. */
    manifestacion: { total: 0, abiertas: 0, urgentes: 0, vencidas: 0, sin_fecha: 0 },
  };
  for (const l of filas) {
    const c = clasificar(l);
    if (c.manifestacion) {
      const m = c.manifestacion, fm = f.manifestacion;
      fm.total++;
      if (m.estado === "vencida") fm.vencidas++;
      else if (m.estado === "sin_fecha") fm.sin_fecha++;
      else { fm.abiertas++; if (esUrgente(m)) fm.urgentes++; }
    }
    f.tipo[c.tipo] = (f.tipo[c.tipo] || 0) + 1;
    f.modalidad[c.modalidad] = (f.modalidad[c.modalidad] || 0) + 1;
    const d = c.departamento || "sin_dato";
    f.departamento[d] = (f.departamento[d] || 0) + 1;
    f.cuantia[c.rango || "sin_dato"]++;
    f.cierre[c.ventana && c.ventana !== "vencido" ? c.ventana : "sin_dato"]++;
  }
  return f;
}

/* Cero resultados → ¿qué filtro aflojar? Se quita cada filtro activo por
   separado y se cuenta de verdad; gana el que más recupera. */
function sugerirAflojar(filas, estado, clasificar) {
  const activos = Filtros.fichas(estado).map((x) => x.filtro);
  let mejor = null;
  for (const filtro of activos) {
    const sin = Filtros.sinFiltro(estado, filtro);
    const n = aplicar(filas, sin, clasificar).length;
    if (n > 0 && (!mejor || n > mejor.siLoQuita)) mejor = { filtro, siLoQuita: n };
  }
  return mejor;
}

/* Catálogo de entidades del corpus abierto para el buscador con sugerencias:
   [{ nit, nombre, procesosAbiertos, valorAbierto }] · máximo `max`. La
   coincidencia es por subcadena normalizada del nombre o prefijo del NIT. */
function buscarEntidades(filas, q, { max = 10 } = {}) {
  const consulta = norm(String(q || "").trim());
  const nitConsulta = soloDigitos(q);
  const porNit = new Map();
  for (const l of filas) {
    const nit = soloDigitos(l.nit_entidad) || `sin_nit:${norm(String(l.entidad || ""))}`;
    let e = porNit.get(nit);
    if (!e) { e = { nit: soloDigitos(l.nit_entidad) || null, nombre: String(l.entidad || "").trim(), nombreNorm: norm(String(l.entidad || "")), procesosAbiertos: 0, valorAbierto: 0 }; porNit.set(nit, e); }
    e.procesosAbiertos++;
    e.valorAbierto += Number(l.cuantia_cop) || 0;
  }
  const todas = [...porNit.values()];
  const filtradas = consulta
    ? todas.filter((e) => e.nombreNorm.includes(consulta) || (nitConsulta && e.nit && e.nit.startsWith(nitConsulta)))
    : todas;
  filtradas.sort((a, b) => b.procesosAbiertos - a.procesosAbiertos || b.valorAbierto - a.valorAbierto || a.nombre.localeCompare(b.nombre));
  return filtradas.slice(0, max).map(({ nit, nombre, procesosAbiertos, valorAbierto }) => ({ nit, nombre, procesosAbiertos, valorAbierto }));
}

module.exports = {
  tipoTrabajoDe, modalidadDe, departamentoDe, diasParaCierre, fechaCierreISO, esDeEntidad,
  crearClasificador, cumple, aplicar, facetas, sugerirAflojar, buscarEntidades,
  leerEstado: Filtros.leerEstado, fichas: Filtros.fichas,
};
