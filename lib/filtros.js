/* ============================================================================
   lib/filtros · Filtros canónicos: estado, modalidad y objeto contractual
   ----------------------------------------------------------------------------
   Los filtros que deciden si un proceso puede interesar SIQUIERA:
     1. modalidad_competitiva(l)  — solo modalidades donde se puede competir
     2. estado_abierto(l)         — solo procesos aún abiertos a ofertas
     2-bis. es_convenio(l)        — fuera los convenios («aunar esfuerzos…»):
                                    se publican como competitivos pero no lo son
     3. objeto_valido(l, perfil)  — objeto dentro del RUP (match por CLASE
                                    UNSPSC, no por producto) + anti-suministro
   `evaluarObjeto` devuelve además `paso`, que nombra en cuál de estas etapas
   murió el proceso — es lo que /api/diagnostico agrega para ver el embudo.
   Se aplican en la sincronización (antes de guardar chunks) y de nuevo en la
   consulta (defensa en profundidad; el corpus previo al despliegue puede
   traer filas viejas sin filtrar hasta la próxima full).

   Realidad del dato: este entorno de desarrollo NO alcanza datos.gov.co
   (allowlist del proxy — verificado: CONNECT 403), así que los valores no se
   pudieron muestrear en vivo con un LIMIT 20. Compensación: (a) los valores
   canónicos vienen del encargo + los documentados del dataset p6dx-8zbt,
   (b) TODO se normaliza (acentos, mayúsculas, espacios) antes de comparar,
   (c) se clasifican varias columnas (estado_del_procedimiento, fase,
   adjudicado), y (d) lo NO clasificable se considera CERRADO — sin fallbacks
   optimistas (el "+5 para fases desconocidas" de la era anterior no existe).
   ========================================================================== */
"use strict";

const { BLACKLIST_OBJETO, WHITELIST_OBRA } = require("./semantica.js");

/* Normalización: sin acentos, minúsculas, espacios colapsados. */
const norm = (s) => String(s || "")
  .normalize("NFD").replace(/[̀-ͯ]/g, "")
  .toLowerCase().replace(/\s+/g, " ").trim();

/* ══════════════════ 1 · Estado del proceso ══════════════════ */
/* Listas canónicas (normalizadas). El dataset varía sufijos («Presentación de
   oferta» vs «…de ofertas», «Borrador» vs «Borrador de pliegos»), por eso la
   coincidencia admite prefijos en ambos sentidos — con longitud mínima para
   que un valor basura corto no "coincida" con nada. */
const ESTADOS_ABIERTOS = [
  "presentacion de oferta", "convocado", "publicado", "abierto",
  "recepcion de manifestaciones de interes", "presentacion de observaciones",
  "borrador de pliegos", "adenda", "modificado",
].map(norm);
const ESTADOS_CERRADOS = [
  "en evaluacion", "evaluacion de ofertas", "adjudicado", "celebrado",
  "en ejecucion", "terminado", "cancelado", "suspendido", "declarado desierto",
  "descartado", "liquidado",
  // variantes reales del dataset que significan lo mismo. OJO: aquí no puede
  // ir "seleccionado" — haría prefijo con la fase "Selección", que es
  // precisamente donde se reciben ofertas. "ejecucion" cubre la fase
  // "Ejecución" (el prefijo no la alcanza desde "en ejecucion").
  "desierto", "revocado", "anulado", "cerrado", "ejecucion", "adjudicacion",
].map(norm);

function coincide(valor, lista) {
  if (valor.length < 4) return false; // valores basura no coinciden con nada
  return lista.some((e) => valor === e || valor.startsWith(e) || e.startsWith(valor));
}

/* Abierto ⇔ alguna columna clasifica como abierto y NINGUNA como cerrado.
   Columna adjudicado="Si" es señal dura de cierre. Sin señal clasificable →
   CERRADO (regla del encargo: nada de fallbacks para estados desconocidos). */
function estado_abierto(lic) {
  if (norm(lic.adjudicado) === "si") return false;
  let abierto = false;
  for (const v of [lic.estado_del_procedimiento, lic.fase]) {
    const n = norm(v);
    if (!n) continue;
    if (coincide(n, ESTADOS_CERRADOS)) return false; // cerrado gana siempre
    if (coincide(n, ESTADOS_ABIERTOS)) abierto = true;
  }
  return abierto;
}

/* ══════════════════ 2 · Modalidad competitiva ══════════════════ */
/* Lista blanca: solo modalidades donde de verdad se compite. Se excluyen
   Contratación Directa (incluida su variante "(con ofertas)": sigue siendo
   directa), Licitación Privada y las solicitudes de información (RFI: no son
   procesos a los que uno se presente). Régimen especial se excluye SALVO la
   variante "(con ofertas)" — ahí sí hay convocatoria competitiva (p. ej.
   obras de entidades exceptuadas). Modalidad vacía o desconocida → false. */
const MODALIDADES_COMPETITIVAS = [
  "licitacion publica", "seleccion abreviada", "subasta",
  "concurso de meritos", "minima cuantia", "acuerdo marco",
].map(norm);
const MODALIDADES_EXCLUIDAS = [
  "contratacion directa", "licitacion privada", "solicitud de informacion",
  // venta de activos del Estado ("Enajenación de bienes con Subasta"): trae
  // la palabra "subasta" pero no es un proceso al que uno se presente a
  // construir — debe caer ANTES de que la lista blanca vea "subasta"
  "enajenacion",
].map(norm);

function modalidad_competitiva(lic) {
  const n = norm(lic.modalidad_de_contratacion || lic.tipo_de_proceso);
  if (!n) return false;
  if (n.includes("regimen especial")) return n.includes("con ofertas");
  if (MODALIDADES_EXCLUIDAS.some((e) => n.includes(e))) return false;
  return MODALIDADES_COMPETITIVAS.some((e) => n.includes(e));
}

/* ══════════════════ 2-bis · Convenios (NO son licitaciones) ══════════════════ */
/* «AUNAR ESFUERZOS TÉCNICOS, ADMINISTRATIVOS Y FINANCIEROS…» es la fórmula de
   los CONVENIOS INTERADMINISTRATIVOS y de asociación (Ley 489/1998 art. 95-96,
   D. 1082 art. 2.2.1.2.1.4.4): no hay pliego, no hay oferta, no se compite —
   se pactan entre entidades o con ESAL. Se colaban porque muchas entidades los
   publican bajo «Régimen Especial (con ofertas)», que sí es modalidad
   competitiva. Fuera ANTES que cualquier otro filtro de objeto.

   Precisión deliberada, para no tirar obra real: «convenio interadministrativo»
   aparece a menudo de forma INCIDENTAL en la descripción de una obra legítima
   («construcción de placa huella EN EL MARCO DEL convenio interadministrativo
   123»). Por eso:
     · «aunar esfuerzos/recursos» descarta esté donde esté (nunca es incidental);
     · el resto solo descarta si ENCABEZA el objeto (el nombre del procedimiento
       o el arranque de la descripción), que es donde se declara la naturaleza. */
const AUNAR_RE = /\baunar\s+(?:esfuerzos|recursos)\b/;
const CONVENIO_ENCABEZA_RE = /^(?:el\s+|la\s+|los\s+|las\s+)?(?:presente\s+)?(?:aunar\s+(?:esfuerzos|recursos)|convenio\s+(?:interadministrativo|de\s+asociacion|de\s+cooperacion|marco|solidario)|contrato\s+interadministrativo|acuerdo\s+de\s+cooperacion)\b/;

function es_convenio(lic) {
  const nombre = norm(lic.nombre_del_procedimiento);
  const desc = norm(lic.descripci_n_del_procedimiento);
  if (AUNAR_RE.test(nombre) || AUNAR_RE.test(desc)) return true;
  return CONVENIO_ENCABEZA_RE.test(nombre) || CONVENIO_ENCABEZA_RE.test(desc);
}

/* ══════════════════ 3 · Objeto contractual válido ══════════════════ */
/* Clases UNSPSC de 8 dígitos declaradas ("V1.72141000" → "72141000"). */
function unspscClasesDe(lic) {
  const crudo = `${lic.codigo_principal_de_categoria || ""} ${lic.categorias_adicionales || ""}`;
  return [...new Set((crudo.match(/\d{8}/g) || []))];
}

/* ¿La clase declarada está cubierta por el RUP del perfil?
   UNSPSC es jerárquico: SS-FF-CC-PP (segmento, familia, clase, producto). Los
   393 códigos de los dos RUP terminan TODOS en "00" — están inscritos a nivel
   de CLASE, que es como el RUP clasifica. SECOP II, en cambio, publica muchas
   veces el producto específico (…10, …15) dentro de esa misma clase.
   Comparar los 8 dígitos con igualdad exacta descartaba TODO proceso que
   declarara producto: para casar hacía falta que la entidad hubiera publicado
   justo el "00". Se compara por CLASE (6 primeros dígitos), que es la
   granularidad real de la inscripción: 72141015 queda cubierto por 72141000.
   Es estrictamente más permisivo que antes y jamás al revés. */
const claseDe = (codigo) => String(codigo).slice(0, 6);
let _clasesPorSet = new WeakMap();
function clasesDelRup(setRup) {
  let s = _clasesPorSet.get(setRup);
  if (!s) {
    s = new Set([...setRup].map(claseDe));
    _clasesPorSet.set(setRup, s);
  }
  return s;
}
function unspscCubierto(clases, setRup) {
  const rup = clasesDelRup(setRup);
  return clases.some((c) => rup.has(claseDe(c)));
}

/* Capa ANTI-SUMINISTRO: los RUP incluyen clases de segmentos de BIENES
   (materiales de construcción, tubería, herramientas, eléctricos, TI,
   mobiliario…) porque instalarlos es obra — pero esas mismas clases dejan
   pasar compras puras de materiales o muebles disfrazadas de proceso afín.
   Regla: si TODAS las clases declaradas son de segmentos de bienes Y el
   objeto se redacta como compra (verbo de adquisición) SIN ningún verbo de
   obra → descartar. Un solo código de un segmento de obra/servicios ancla el
   proceso y desactiva la capa.

   En UNSPSC los segmentos 10–60 son BIENES y 70+ son servicios/obra (72
   construcción, 77 ambiental, 81 ingeniería, 95 terrenos/edificios…), así que
   el corte va en "70" — enumerar solo algunos segmentos (30/39/43/48/56)
   dejaba servida la "COMPRAVENTA DE TUBERÍA PVC" (40, el bloque de bienes más
   grande del RUP de Génesis) o la "ADQUISICIÓN DE HERRAMIENTAS" (27). */
const esSegmentoDeBienes = (clase) => clase.slice(0, 2) < "70";
const VERBO_ADQUISICION_RE = /\b(?:suministros?|adquisicion(?:es)?|compra(?:venta)?s?|dotacion(?:es)?|entregas?)\s+de\b/;
/* Vocabulario que ANCLA el proceso como obra: si aparece, el objeto no es una
   compra pura por más que también mencione un suministro. «CONSTRUCCIÓN DE AULA
   INCLUYENDO SUMINISTRO DE MOBILIARIO» pasa; «SUMINISTRO DE MOBILIARIO» no. */
const VERBO_OBRA_RE = /\b(?:construccion|construir|rehabilitacion|mantenimiento|instalacion|instalar|montaje|obras?|adecuacion|adecuar|mejoramiento|mejorar|reparacion|ampliacion|remodelacion|demolicion|pavimentacion|ejecucion|ejecutar|reforzamiento|reposicion|optimizacion|canalizacion|urbanismo|intervencion|excavacion|cimentacion)\b/;

/* Evaluación completa del objeto frente a un perfil (detalle para la UI). */
function evaluarObjeto(lic, perfil) {
  const texto = `${lic.nombre_del_procedimiento || ""} ${lic.descripci_n_del_procedimiento || ""}`;
  // 0. convenios: no son licitaciones, no se compite — fuera antes que nada
  if (es_convenio(lic)) {
    return { ok: false, paso: "convenio", unspsc_ok: false, fuente_unspsc: null, anti_suministro: false, motivo: "convenio interadministrativo / de asociación (no es un proceso competitivo)" };
  }
  if (BLACKLIST_OBJETO.test(texto)) {
    const m = texto.match(BLACKLIST_OBJETO);
    return { ok: false, paso: "blacklist", unspsc_ok: false, fuente_unspsc: null, anti_suministro: false, termino: m && m[0], motivo: `objeto fuera de los RUP (blacklist semántica: «${m && m[0]}»)` };
  }
  const clases = unspscClasesDe(lic);
  let unspsc_ok, fuente_unspsc;
  if (clases.length) {
    unspsc_ok = unspscCubierto(clases, perfil.unspsc);
    fuente_unspsc = "codigo";
  } else {
    // sin UNSPSC declarado: mapeo semántico tolerante sobre el objeto
    unspsc_ok = WHITELIST_OBRA.test(texto);
    fuente_unspsc = "texto";
  }
  if (!unspsc_ok) {
    return {
      ok: false, paso: fuente_unspsc === "codigo" ? "unspsc" : "sin_unspsc_ni_obra",
      unspsc_ok, fuente_unspsc, anti_suministro: false, clases,
      motivo: fuente_unspsc === "codigo" ? "UNSPSC fuera del RUP" : "sin UNSPSC y el objeto no es obra civil",
    };
  }
  if (clases.length && clases.every(esSegmentoDeBienes)) {
    const tn = norm(texto);
    if (VERBO_ADQUISICION_RE.test(tn) && !VERBO_OBRA_RE.test(tn)) {
      return { ok: false, paso: "anti_suministro", unspsc_ok, fuente_unspsc, anti_suministro: true, motivo: "suministro puro (segmentos de bienes + verbo de compra sin verbo de obra)" };
    }
  }
  // (La ruta por texto no necesita la capa: WHITELIST_OBRA ya exige
  // vocabulario de obra, incompatible con una compra pura.)
  return { ok: true, paso: null, unspsc_ok: true, fuente_unspsc, anti_suministro: false, motivo: null };
}

function objeto_valido(lic, perfil) { return evaluarObjeto(lic, perfil).ok; }

module.exports = {
  norm,
  ESTADOS_ABIERTOS, ESTADOS_CERRADOS, estado_abierto,
  MODALIDADES_COMPETITIVAS, MODALIDADES_EXCLUIDAS, modalidad_competitiva,
  es_convenio, AUNAR_RE, CONVENIO_ENCABEZA_RE,
  esSegmentoDeBienes, unspscClasesDe, claseDe, clasesDelRup, unspscCubierto,
  evaluarObjeto, objeto_valido,
};
