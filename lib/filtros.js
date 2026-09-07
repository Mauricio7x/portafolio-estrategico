/* ============================================================================
   lib/filtros · Filtros canónicos: estado, modalidad, objeto y PERTINENCIA
   ----------------------------------------------------------------------------
   Aquí viven las REGLAS (los vocabularios están en lib/semantica y el motor de
   códigos en lib/unspsc). Dos clientes, dos exigencias distintas:

   ┌── INGESTA (api/sync, api/sync/historico) ────────────────────────────────┐
   │ admisibleParaIngesta(l)  ¿PUEDE llegar a interesarle a alguien?          │
   │ Barato, estable y deliberadamente ANCHO. No sabe de perfiles ni de       │
   │ capacidad. Afinar el matching ya NO exige una recarga completa.          │
   └──────────────────────────────────────────────────────────────────────────┘
   ┌── CONSULTA (api/oportunidades, api/diagnostico) ─────────────────────────┐
   │ evaluarObjeto(l, perfil, conocimiento, opciones)  el JUICIO FINO.        │
   │ Cascada: convenio → blacklist → UNSPSC jerárquico → equivalencias →      │
   │          texto → PERTINENCIA (bloqueantes · objeto genérico) →           │
   │          ruta de texto débil → anti-suministro.                          │
   └──────────────────────────────────────────────────────────────────────────┘

   Esa separación (jul 2026) es el cambio estructural: antes el matching UNSPSC
   corría en el prefiltro de ingesta, así que cada mejora del matching o cada
   RUP nuevo obligaba a volver a bajar el año entero — y los procesos que la
   regla vieja descartó no habían entrado nunca a Redis.

   `evaluarObjeto` devuelve `paso`, que nombra en cuál etapa murió el proceso;
   es lo que /api/diagnostico agrega para ver el embudo. Y devuelve SIEMPRE un
   veredicto GRADUADO (tier de UNSPSC + nivel de pertinencia), nunca un
   booleano suelto: la app es para decidir, no para obedecer.

   Realidad del dato: este entorno de desarrollo NO alcanza datos.gov.co
   (allowlist del proxy — verificado: CONNECT 403), así que los valores no se
   pudieron muestrear en vivo. Compensación: (a) los valores canónicos vienen
   del encargo + los documentados del dataset p6dx-8zbt, (b) TODO se normaliza
   (acentos, mayúsculas, espacios) antes de comparar, (c) se clasifican varias
   columnas, y (d) lo NO clasificable se considera CERRADO — sin fallbacks
   optimistas.
   ========================================================================== */
"use strict";

const {
  norm, BLACKLIST_OBJETO, WHITELIST_OBRA,
  VERBOS_DE_OBRA_FUERTES, VERBOS_DE_OBRA_CONDICIONADOS, VERBOS_DE_OBRA_CONDICIONADOS_INV,
  TERMINOS_NO_PERTINENTES, TERMINOS_BLOQUEANTES, TERMINOS_ESTRUCTURACION,
  PALABRAS_TRAMITE, TOKEN_CODIGO_RE,
  TIPO_CONSULTORIA, TIPO_INFRAESTRUCTURA,
} = require("./semantica.js");
const {
  codigosDeLicitacion, indiceDe, emparejar, algunCodigoAdmisibleIngesta,
  claseDe, FAMILIAS_UNION, SEG_SERVICIOS_MIN, SEG_SERVICIOS_MAX,
} = require("./unspsc.js");
const { evaluarTexto } = require("./texto_unspsc.js");
const { equivalenteDe } = require("./equivalencias.js");

/* ══════════════════ 1 · Estado del proceso ══════════════════ */
/* Listas canónicas (normalizadas). El dataset varía sufijos («Presentación de
   oferta» vs «…de ofertas», «Borrador» vs «Borrador de pliegos»), por eso la
   coincidencia admite prefijos en ambos sentidos — con longitud mínima para
   que un valor basura corto no "coincida" con nada. */
const ESTADOS_ABIERTOS = [
  "presentacion de oferta", "convocado", "publicado", "abierto",
  "recepcion de manifestaciones de interes", "presentacion de observaciones",
  "borrador de pliegos", "adenda", "modificado",
  // "activo" es uno de los CUATRO valores documentados de `estado` en
  // p6dx-8zbt (Activo · Adjudicado · Desierto · Celebrado). Faltaba, y como
  // aquí un estado desconocido cuenta como CERRADO, todo proceso publicado con
  // ese literal se descartaba EN SILENCIO: la full lo excluía de origen y no
  // llegaba nunca al corpus. No lo salva la fase, porque "Selección" tampoco
  // está en ninguna de las dos listas. Ver docs/COMPLEMENTO_ANALISTA_LICITACIONES.md
  // (V-15). Es seguro añadirlo: en estado_abierto los cerrados ganan siempre,
  // así que "Activo" + fase "Adjudicación" o adjudicado="Si" sigue cerrado.
  "activo",
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

/* SECOP II antepone «Proceso » a varios literales en su propia interfaz — la
   captura del ingeniero (20-ago-2026) enseña «Proceso adjudicado y celebrado»
   en la columna Estado—, y con la coincidencia por PREFIJO ese literal no casa
   ni con «adjudicado» ni con nada: caía en «desconocido». Para `estado_abierto`
   daba el resultado correcto por accidente (desconocido = cerrado), pero
   `estado_cerrado` —que es quien AFIRMA el cierre— respondía `false` sobre un
   proceso adjudicado y celebrado. Se recorta el prefijo antes de comparar; no
   se pasa a coincidencia por SUBCADENA, que se tragaría «no adjudicado». */
const PREFIJO_ESTADO_RE = /^proceso(?:\s+de)?\s+/;
function nucleoEstado(valor) {
  return valor.replace(PREFIJO_ESTADO_RE, "");
}

function coincide(valor, lista) {
  const v = nucleoEstado(valor);
  if (v.length < 4) return false; // valores basura no coinciden con nada
  return lista.some((e) => v === e || v.startsWith(e) || e.startsWith(v));
}

/* ══════════════════ 1-bis · El reloj cierra procesos ══════════════════ */
/* Defecto de producción (ago 2026): «INVITACION PRIVADA EDUH-Turbo», con fecha
   límite del 20/02/2026, seguía sirviéndose como abierto SEIS MESES después.
   Ninguna columna de estado lo desmentía —el corpus conservaba «Publicado»— y
   hasta ahora la app no miraba el reloj: `estado_abierto` solo leía
   `estado_del_procedimiento` y `fase`. Un proceso cuya fecha de cierre ya pasó
   está cerrado por definición, diga lo que diga el estado declarado.

   HORA COLOMBIA, y no es un detalle. El dataset publica timestamps FLOTANTES
   en hora local (UTC-5) y sin zona: «2026-02-20T17:00:00.000». `Date.parse` los
   interpreta en la zona del runtime, que en Vercel es UTC, de modo que el
   instante que devuelve va 5 h ADELANTADO respecto del real. Comparar contra
   `Date.now()` a secas cerraría los procesos cinco horas antes de tiempo y
   borraría del listado los que cierran HOY a última hora. Por eso el «ahora»
   contra el que se compara retrocede 5 h: `parse(cierre) + 5 h < ahora` es lo
   mismo que `parse(cierre) < ahora − 5 h`, sin construir fechas con zona.

   Si algún día una columna llegara CON zona explícita, `Date.parse` ya la
   resolvería bien y esta resta la haría 5 h indulgente — es decir, el error
   caería del lado de dejar visible un proceso de más, nunca de esconder uno
   que sigue abierto. Es la dirección correcta para esta app: el falso negativo
   (una oportunidad que nunca se ve) cuesta más que un amarillo. */
const OFFSET_COLOMBIA_MS = 5 * 3600000;

function cierre_vencido(lic, ahoraMs) {
  if (!lic) return false;
  // en la INGESTA la fila aún no pasó por `enriquecer`, así que no trae
  // `fecha_cierre` resuelto: se deriva de las columnas candidatas con la MISMA
  // función que usa el enriquecimiento (require diferido: en tiempo de carga
  // cerraría el ciclo filtros → negocio → filtros)
  let cierre = lic.fecha_cierre;
  if (cierre === undefined) {
    const { fechaCierre } = require("./negocio.js");
    cierre = fechaCierre(lic);
  }
  if (!cierre) return false;
  const t = Date.parse(cierre);
  if (!Number.isFinite(t)) return false;
  const ahora = Number.isFinite(ahoraMs) ? ahoraMs : Date.now();
  return t < ahora - OFFSET_COLOMBIA_MS;
}

/* ¿Alguna columna dice explícitamente que el proceso YA CERRÓ?
   OJO: NO es la negación de `estado_abierto`. Un estado desconocido no está
   abierto (no se sirve) pero tampoco consta como cerrado — son tres estados,
   no dos, y confundirlos es lo que llevaría a afirmar «adjudicado» sobre un
   proceso del que no se sabe nada. Se usa como comprobación explícita allí
   donde afirmar el cierre importa (los destacados del panel). */
function estado_cerrado(lic, ahoraMs) {
  if (norm(lic.adjudicado) === "si") return true;
  // el reloj es un HECHO, no una inferencia: si la fecha límite pasó, la
  // ventana para presentarse se cerró — y es la señal más fiable que hay,
  // porque no depende de que la entidad actualice el estado en SECOP II
  if (cierre_vencido(lic, ahoraMs)) return true;
  // MISMA PRECEDENCIA que `estado_abierto` (ver allí): la columna autoritativa
  // manda y `fase` solo habla cuando aquella no dice nada reconocible. Sin esto
  // las dos funciones podrían afirmar cosas incompatibles sobre la misma fila.
  const nEstado = norm(lic.estado_del_procedimiento);
  if (nEstado && (coincide(nEstado, ESTADOS_CERRADOS) || coincide(nEstado, ESTADOS_ABIERTOS))) {
    return coincide(nEstado, ESTADOS_CERRADOS);
  }
  const nFase = norm(lic.fase);
  return !!(nFase && coincide(nFase, ESTADOS_CERRADOS));
}

/* Abierto ⇔ la columna AUTORITATIVA lo clasifica como abierto y ninguna señal
   DURA lo desmiente. Sin señal clasificable → CERRADO (regla del encargo: nada
   de fallbacks para estados desconocidos).

   ⚠️ UNA `fase` REZAGADA YA NO PUEDE MATAR UN PROCESO PUBLICADO (20-ago-2026).
   Defecto de producción reportado por el ingeniero: la UNIVERSIDAD PEDAGÓGICA
   NACIONAL tenía cuatro convocatorias en SECOP II y la app enseñaba una. Hasta
   hoy esta función recorría `estado_del_procedimiento` y `fase` EN PIE DE
   IGUALDAD con la regla «cerrado gana siempre», así que un valor rezagado en
   `fase` VETABA a la columna autoritativa. Y que `fase` va rezagada está
   PROBADO en la propia captura del ingeniero: el proceso UPN-VAD-CP-008-2026
   figura como «Proceso adjudicado y celebrado» y su Fase actual sigue diciendo
   «Presentación de oferta». Si retrasa en un sentido, retrasa en el otro: una
   convocatoria republicada conserva la fase «Evaluación» o «Adjudicación» del
   intento anterior mientras su estado dice «Publicado».

   El daño era del peor tipo posible: el filtro de estado corre en la INGESTA
   (lib/proyeccion.transformar), así que esos procesos NUNCA entraban a Redis y
   por tanto NO aparecían en el embudo de /api/diagnostico —que solo censa el
   corpus ya guardado—. Desaparecían sin dejar rastro en ningún sitio.

   La precedencia es la que CLAUDE.md ya declaraba y el código no cumplía:
     1. `adjudicado = "Si"`      señal dura, gana siempre
     2. reloj (`cierre_vencido`)  un hecho, no una inferencia
     3. `estado_del_procedimiento` (100 % poblado, docs/datos.md §6) — AUTORITATIVA
     4. `fase` (98,7 %)           SOLO si la anterior no dice nada reconocible
   Y el error cae del lado correcto: un proceso ya adjudicado que conservara un
   «Publicado» rezagado lo cierran igual el `adjudicado="Si"` y el reloj (las
   dos señales duras); en cambio una oportunidad de $1.348 M que la app nunca
   enseñó no se recupera. Es la doctrina del proyecto: el falso negativo cuesta
   más que el amarillo. */
function estado_abierto(lic, ahoraMs) {
  if (norm(lic.adjudicado) === "si") return false;
  // la fecha vencida gana a CUALQUIER estado declarado: es el defecto que se
  // corrige (ver `cierre_vencido`). Va antes que las listas para que un
  // «Publicado» congelado no pueda resucitar un proceso que cerró en febrero.
  if (cierre_vencido(lic, ahoraMs)) return false;
  const nEstado = norm(lic.estado_del_procedimiento);
  if (nEstado) {
    if (coincide(nEstado, ESTADOS_CERRADOS)) return false;
    if (coincide(nEstado, ESTADOS_ABIERTOS)) return true;   // la fase ya no veta
  }
  // la columna autoritativa no dice nada reconocible: ahora sí habla `fase`
  const nFase = norm(lic.fase);
  if (!nFase) return false;
  if (coincide(nFase, ESTADOS_CERRADOS)) return false;
  return coincide(nFase, ESTADOS_ABIERTOS);
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
  // «Invitación Privada» (ago 2026, defecto de producción): a una invitación
  // privada NO se presenta quien quiera — la entidad elige a quién invita, así
  // que no hay convocatoria pública ni concurso abierto. Se colaba porque
  // ninguna de sus palabras casaba con la lista de exclusiones y su objeto era
  // obra impecable («LA OPTIMIZACIÓN DE LOS SISTEMAS DE ALCANTARILLADO…»).
  // Va como subcadena, así que cubre las variantes con sufijo.
  "invitacion privada",
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

/* ══════════════════ 3 · Pertinencia del objeto ══════════════════ */
/* El problema que resuelve (medido sobre el corpus real): la whitelist de los
   RUP incluye clases de los segmentos 80 (gerencia y servicios de empresa),
   85 (salud) y 93 (servicios sociales) porque ahí viven la gerencia de
   proyectos y la interventoría. Esas mismas clases dejaban pasar
   «PRESTACIÓN DE SERVICIOS DE IMPRESIÓN Y FOTOCOPIA» (80101600),
   «SUMINISTRO DE ALIMENTOS PARA RACIONES» (80111600) o un «CUMPLEAÑOS»
   (80111623): el código estaba inscrito, pero el objeto no es obra ni
   consultoría. La capa anti-suministro no los veía porque solo mira segmentos
   de BIENES (<70).

   La regla corre DESPUÉS del matching (si el código ya falló, no hay nada que
   verificar) y NUNCA bloquea por falta de información:

     1. ¿hay verbo de obra?            → PERTINENTE (verde)
     2. ¿término no pertinente y CERO
        verbos de obra?                → NO PERTINENTE (rojo) ← el falso positivo
     3. ¿tier "clase" en un segmento
        de obra/ingeniería pura
        (72, 77, 81, 95)?              → PERTINENTE (verde): el código es sólido
     4. resto                          → PERTINENTE CON ADVERTENCIA (amarillo)

   El 4 es deliberado: un objeto corto o genérico («MEJORAMIENTO SEDE
   ADMINISTRATIVA FASE II») no da información suficiente para descartar, y en
   una app de oportunidades el coste de un falso negativo (no ver un contrato)
   es mayor que el de un amarillo que el dueño revisa en 5 segundos. */
const SEGMENTOS_OBRA_PURA = new Set(["72", "77", "81", "95"]);

/* ¿El objeto habla de obra? Fuerte (inequívoco) o condicionado (verbo ambiguo
   con un ancla de infraestructura cerca). */
function hayVerboDeObra(textoNorm) {
  return VERBOS_DE_OBRA_FUERTES.test(textoNorm)
    || VERBOS_DE_OBRA_CONDICIONADOS.test(textoNorm)
    || VERBOS_DE_OBRA_CONDICIONADOS_INV.test(textoNorm);
}

function tipoDeObjeto(textoNorm) {
  if (TIPO_CONSULTORIA.test(textoNorm)) return "consultoria";
  if (TIPO_INFRAESTRUCTURA.test(textoNorm)) return "infraestructura";
  return "obra_civil";
}

const ETIQUETA_TIPO = {
  consultoria: "Consultoría", infraestructura: "Infraestructura",
  obra_civil: "Obra civil", indeterminado: "Verificar objeto",
  objeto_generico: "Objeto genérico",
};

/* ¿El «objeto» es en realidad el número del proceso?
   «CONVOCATORIA PUBLICA», «CONCURSO DE MERITOS INV-CM-001-2026», «INFI
   CM001-2026»: ninguno describe un trabajo. Dos señales, las dos del
   diagnóstico real:
     · el objeto entero mide menos de MIN_LARGO_OBJETO caracteres — no cabe
       una descripción ahí;
     · o, al quitarle las palabras de TRÁMITE y los tokens que son códigos, no
       queda contenido (menos de 2 palabras con significado).
   La segunda regla exige además que NO haya verbo de obra: «CM-001-2026
   CONSTRUCCIÓN DE PLACA HUELLA» sí dice qué es y debe pasar. */
const MIN_LARGO_OBJETO = 15;
const MIN_PALABRAS_CONTENIDO = 2;

function palabrasDeContenido(textoNorm) {
  return textoNorm.split(/[^a-z0-9ñ]+/)
    .filter((p) => p && !PALABRAS_TRAMITE.has(p) && !TOKEN_CODIGO_RE.test(p));
}

function esObjetoGenerico(textoNorm) {
  const t = String(textoNorm || "").trim();
  if (t.length < MIN_LARGO_OBJETO) return { generico: true, motivo: `el objeto tiene ${t.length} caracteres: no describe nada` };
  if (hayVerboDeObra(t)) return { generico: false };
  const contenido = palabrasDeContenido(t);
  if (contenido.length < MIN_PALABRAS_CONTENIDO) {
    return {
      generico: true,
      motivo: contenido.length
        ? `el objeto es el número del proceso más «${contenido[0]}»: no describe el trabajo`
        : "el objeto es solo el nombre del trámite y su código: no describe el trabajo",
    };
  }
  return { generico: false };
}

/* textoNorm + resultado del matching → veredicto de pertinencia graduado. */
function evaluarPertinencia(textoNorm, { tier, codigos } = {}) {
  /* 0. términos BLOQUEANTES: descartan aunque el objeto tenga verbo de obra
     (un servicio de internet con «instalación de redes» sigue siendo internet) */
  const bloqueante = textoNorm.match(TERMINOS_BLOQUEANTES);
  if (bloqueante) {
    return {
      ok: false, nivel: "rojo", tipo: "no_pertinente", etiqueta: "No pertinente",
      termino: bloqueante[0], bloqueante: true,
      motivo: `servicio ajeno a la obra («${bloqueante[0]}»): descarta aunque el objeto mencione trabajos`,
    };
  }
  /* 0-bis. objeto genérico: sin descripción no hay nada que juzgar */
  const gen = esObjetoGenerico(textoNorm);
  if (gen.generico) {
    return {
      ok: false, nivel: "rojo", tipo: "objeto_generico", etiqueta: ETIQUETA_TIPO.objeto_generico,
      generico: true, motivo: gen.motivo,
    };
  }
  const verbo = textoNorm.match(VERBOS_DE_OBRA_FUERTES) || textoNorm.match(VERBOS_DE_OBRA_CONDICIONADOS)
    || textoNorm.match(VERBOS_DE_OBRA_CONDICIONADOS_INV);
  if (verbo) {
    const tipo = tipoDeObjeto(textoNorm);
    // el «verbo» de la forma condicionada es todo el tramo («mantenimiento de
    // la red de alcantarillado»): se recorta para que quepa en la tarjeta
    const señal = verbo[0].length > 60 ? `${verbo[0].slice(0, 60)}…` : verbo[0];
    return {
      ok: true, nivel: "verde", tipo, etiqueta: ETIQUETA_TIPO[tipo], verbo: señal,
      motivo: `el objeto es de obra/consultoría («${señal}»)`,
    };
  }
  const malo = textoNorm.match(TERMINOS_NO_PERTINENTES);
  if (malo) {
    return {
      ok: false, nivel: "rojo", tipo: "no_pertinente", etiqueta: "No pertinente",
      termino: malo[0],
      motivo: `objeto ajeno a obra/consultoría («${malo[0]}») y sin ningún verbo de obra, pese al UNSPSC inscrito`,
    };
  }
  if (tier === "clase" && (codigos || []).some((c) => SEGMENTOS_OBRA_PURA.has(c.segmento) && c.nivel >= 6)) {
    return {
      ok: true, nivel: "verde", tipo: "infraestructura", etiqueta: ETIQUETA_TIPO.infraestructura,
      motivo: "sin vocabulario de obra en el objeto, pero la clase UNSPSC es de obra/ingeniería pura",
    };
  }
  return {
    ok: true, nivel: "amarillo", tipo: "indeterminado", etiqueta: ETIQUETA_TIPO.indeterminado,
    motivo: "el objeto no dice explícitamente que sea obra: verificar en el pliego",
  };
}

/* ══════════════════ 4 · Anti-suministro (reforzada) ══════════════════ */
/* Los RUP incluyen clases de segmentos de BIENES (materiales, tubería,
   herramientas, eléctricos, TI, mobiliario…) porque instalarlos es obra —
   pero esas mismas clases dejan pasar compras puras disfrazadas.
   Regla: si NINGÚN código ANCLA el proceso como obra Y el objeto se redacta
   como compra (verbo de adquisición) SIN verbo de obra → descartar.

   Qué ancla (el refuerzo de jul 2026): un código de segmento ≥ 70 salvo los
   segmentos de servicios NO constructivos (80 gerencia, 84 finanzas, 85 salud,
   86 educación, 90 viajes, 91 personales, 92 defensa, 93 sociales, 94
   asociaciones). Antes bastaba con cualquier ≥70, así que una «ADQUISICIÓN DE
   MOBILIARIO» con un 80101600 de gerencia quedaba anclada y pasaba.
   En UNSPSC los segmentos 10–60 son BIENES y 70+ servicios/obra, así que el
   corte de bienes va en "70" — enumerar solo algunos (30/39/43/48/56) dejaba
   servida la "COMPRAVENTA DE TUBERÍA PVC" (40, el bloque de bienes más grande
   del RUP de Génesis) o la "ADQUISICIÓN DE HERRAMIENTAS" (27). */
const SEGMENTOS_SERVICIOS_NO_CONSTRUCTIVOS = new Set(["80", "84", "85", "86", "90", "91", "92", "93", "94"]);
const anclaObra = (c) => c.segmento >= "70" && !SEGMENTOS_SERVICIOS_NO_CONSTRUCTIVOS.has(c.segmento);

const VERBO_ADQUISICION_RE = /\b(?:suministros?|adquisicion(?:es)?|compra(?:venta)?s?|dotacion(?:es)?|entregas?|arrendamiento|alquiler)\s+de\b/;
/* Vocabulario que ANCLA el proceso como obra POR EL TEXTO: si aparece, el
   objeto no es una compra pura por más que también mencione un suministro.
   «CONSTRUCCIÓN DE AULA INCLUYENDO SUMINISTRO DE MOBILIARIO» pasa;
   «SUMINISTRO DE MOBILIARIO» no.
   Es una lista de ACCIONES, más corta que VERBOS_DE_OBRA_FUERTES (que incluye
   sustantivos como «acueducto»): «SUMINISTRO DE TUBERÍA PARA LA RED DE
   ACUEDUCTO» es una compra, no una obra, y debe seguir cayendo aquí. */
const VERBO_OBRA_RE = /\b(?:construccion|construir|rehabilitacion|mantenimiento|instalacion|instalar|montaje|(?<!mano\s+de\s+)obras?|adecuacion|adecuar|mejoramiento|mejorar|reparacion|ampliacion|remodelacion|demolicion|pavimentacion|ejecucion|ejecutar|reforzamiento|reposicion|optimizacion|canalizacion|urbanismo|intervencion|excavacion|cimentacion)\b/;

function esSuministroPuro(textoNorm, codigos) {
  if (!codigos.length) return false;            // sin códigos no hay nada que juzgar aquí
  if (codigos.some(anclaObra)) return false;    // un código de obra/ingeniería ancla el proceso
  return VERBO_ADQUISICION_RE.test(textoNorm) && !VERBO_OBRA_RE.test(textoNorm);
}

/* ══════════════════ 5 · Prefiltro de INGESTA ══════════════════ */
/* ¿Guardamos este proceso en Redis? Sin perfiles, sin capacidad, sin matching
   fino. Solo lo que NUNCA cambiará de opinión:

     a. modalidad competitiva     (la aplica api/sync antes de llamar aquí)
     b. NO es convenio
     c. tiene algún UNSPSC de los segmentos 70–95, o de una familia que algún
        RUP inscribe (así entran los bienes que los RUP sí tienen)
     d. o, sin códigos utilizables, el objeto es textualmente de obra
     +  blacklist semántica: se conserva en la ingesta a propósito. NO es
        juicio por perfil («ningún RUP de obra civil querrá jamás un contrato
        de caninos») y es lo que evita que el corpus del año pase de ~2 600
        procesos a las ~500 000 filas que revientan el tier gratuito de
        Upstash. Como el paso 4 de la consulta la vuelve a aplicar, quitarla
        de aquí no cambiaría ni un resultado: solo la factura. */
function admisibleParaIngesta(lic) {
  if (es_convenio(lic)) return false;
  const texto = `${lic.nombre_del_procedimiento || ""} ${lic.descripci_n_del_procedimiento || ""}`;
  if (BLACKLIST_OBJETO.test(texto)) return false;
  const { codigos } = codigosDeLicitacion(lic);
  if (codigos.length) return algunCodigoAdmisibleIngesta(codigos);
  const t = norm(texto);
  return WHITELIST_OBRA.test(texto) || hayVerboDeObra(t);
}

/* EL SELLO DE LA REGLA DE INGESTA (6-sep-2026, M-DGF-20). La portada guarda
   una historia diaria de «procesos abiertos», y una serie que se mueve porque
   CAMBIÓ LA REGLA que decide qué entra al corpus o qué cuenta como abierto no
   es el mercado. Cada punto lleva este sello y la vista calla si cambia dentro
   de la ventana. Es la huella de los DATOS de la regla —las listas y las
   expresiones que `modalidad_competitiva`, `es_convenio`, `admisibleParaIngesta`
   y `estado_abierto` consultan—, no de la fecha de la última carga completa
   (que la sincronización renueva cada 30 días y dejaría la tendencia muda para
   siempre) ni del fuente entero (un comentario nuevo no cambia la regla). Lo
   que no está aquí no mueve el sello: se declara en la memoria. */
const crypto = require("crypto");
function selloReglaIngesta() {
  const regla = JSON.stringify({
    modalidades: [MODALIDADES_COMPETITIVAS, MODALIDADES_EXCLUIDAS],
    estados: [ESTADOS_ABIERTOS, ESTADOS_CERRADOS],
    convenio: [AUNAR_RE.source, CONVENIO_ENCABEZA_RE.source],
    objeto: [BLACKLIST_OBJETO.source, WHITELIST_OBRA.source, VERBOS_DE_OBRA_FUERTES.source, VERBOS_DE_OBRA_CONDICIONADOS.source, VERBOS_DE_OBRA_CONDICIONADOS_INV.source],
    unspsc: [SEG_SERVICIOS_MIN, SEG_SERVICIOS_MAX, [...FAMILIAS_UNION].sort()],
  });
  return crypto.createHash("sha1").update(regla).digest("hex").slice(0, 12);
}

/* ══════════════════ 6 · Juicio fino por perfil (CONSULTA) ══════════════════ */
/* `conocimiento` = lo aprendido del corpus histórico, opcional:
     { equivalencias, vocabulario }
   Si falta (ingesta, pruebas, despliegue sin backfill), esas dos capas
   sencillamente no disparan y la cascada se comporta como sin ellas: la app
   nunca depende de tenerlo.

   `opciones.incluirTextoDebil` (default false) abre la ruta de TEXTO cuando la
   pertinencia no llegó a verde. Por qué está cerrada por defecto: en el
   diagnóstico real 1 077 procesos entraron por texto y buena parte eran
   software ERP, equipos tecnológicos y servicios de salud — objetos sin código
   del RUP cuya pertinencia se quedaba en el 🟡 «verificar». Un proceso que no
   tiene código del RUP Y tampoco dice claramente que sea obra no es una
   oportunidad, es ruido. Con código del RUP sí se conserva el amarillo (ahí el
   código es la evidencia); la ruta de texto no tiene esa red. */
function evaluarObjeto(lic, perfil, conocimiento = {}, opciones = {}) {
  const texto = `${lic.nombre_del_procedimiento || ""} ${lic.descripci_n_del_procedimiento || ""}`;
  const t = norm(texto);

  /* paso 3 · convenios: no son licitaciones, no se compite — fuera antes que nada */
  if (es_convenio(lic)) {
    return salida(false, "convenio", null, null, false,
      "convenio interadministrativo / de asociación (no es un proceso competitivo)");
  }
  /* paso 4 · blacklist semántica */
  if (BLACKLIST_OBJETO.test(texto)) {
    const m = texto.match(BLACKLIST_OBJETO);
    const r = salida(false, "blacklist", null, null, false,
      `objeto fuera de los RUP (blacklist semántica: «${m && m[0]}»)`);
    r.termino = m && m[0];
    return r;
  }

  const { codigos, invalidos } = codigosDeLicitacion(lic);
  const idx = indiceDe(perfil.unspsc);

  /* paso 5 · matching UNSPSC jerárquico */
  let unspsc = emparejar(codigos, idx);

  /* paso 6 · equivalencias funcionales aprendidas del histórico */
  if (unspsc.tier === "ninguno" && conocimiento.equivalencias) {
    const eq = equivalenteDe(conocimiento.equivalencias, codigos, idx);
    if (eq) unspsc = { ...eq, segmento_afin: unspsc.segmento_afin };
  }

  /* paso 7 · el objeto como co-señal (solo si aún no hay match: es la capa
     más débil y la más cara, no tiene sentido pagarla si el código ya casó) */
  if (unspsc.tier === "ninguno") {
    const porTexto = evaluarTexto(t, {
      vocabulario: conocimiento.vocabulario,
      familiasPerfil: idx.familias,
      hayVerboObra: hayVerboDeObra(t) || WHITELIST_OBRA.test(texto),
      segmentoAfin: unspsc.segmento_afin,
    });
    if (porTexto) unspsc = { ...porTexto, segmento_afin: unspsc.segmento_afin };
  }
  // los códigos leídos viajan en TODA respuesta a partir de aquí (el
  // diagnóstico los agrega y la UI los enseña)
  const conCodigos = (r) => {
    r.codigos = codigos;
    r.codigos_invalidos = invalidos;
    r.clases = codigos.map((c) => c.codigo);
    return r;
  };

  if (unspsc.tier === "ninguno") {
    return conCodigos(salida(false, codigos.length ? "unspsc" : "sin_unspsc_ni_obra", unspsc, null, false,
      codigos.length
        ? "UNSPSC fuera del RUP y el objeto no confirma que sea obra"
        : "sin UNSPSC utilizable y el objeto no es obra civil"));
  }

  /* paso 8 · pertinencia del objeto (solo si el matching pasó) */
  const pertinencia = evaluarPertinencia(t, { tier: unspsc.tier, codigos });
  if (!pertinencia.ok) {
    // el objeto genérico se cuenta aparte: no es un servicio ajeno, es un
    // objeto que no dice nada, y conviene poder medir cuántos son
    const paso = pertinencia.tipo === "objeto_generico" ? "objeto_generico" : "no_pertinente";
    const r = conCodigos(salida(false, paso, unspsc, pertinencia, false, pertinencia.motivo));
    r.termino = pertinencia.termino;
    return r;
  }

  /* paso 8-bis · la ruta de TEXTO exige pertinencia VERDE.
     Sin código del RUP, el objeto es la única evidencia: si además se queda en
     🟡 «verificar», no hay evidencia de nada. Se puede abrir con
     ?incluir_sin_unspsc=1 (toggle de la UI, apagado por defecto). */
  if (unspsc.tier === "texto" && pertinencia.nivel !== "verde" && !opciones.incluirTextoDebil) {
    return conCodigos(salida(false, "texto_debil", unspsc, pertinencia, false,
      "sin código UNSPSC del RUP y sin vocabulario claro de obra en el objeto"));
  }

  /* paso 9 · anti-suministro */
  if (esSuministroPuro(t, codigos)) {
    return conCodigos(salida(false, "anti_suministro", unspsc, pertinencia, true,
      "suministro puro (sin código que ancle obra + verbo de compra sin verbo de obra)"));
  }

  return conCodigos(salida(true, null, unspsc, pertinencia, false, null));
}

/* Forma única del veredicto. Los campos `unspsc_ok`/`fuente_unspsc`/`clases`
   se conservan porque la UI y las pruebas los leen desde la primera versión;
   `unspsc` y `pertinencia` son el detalle graduado nuevo. */
function salida(ok, paso, unspsc, pertinencia, anti, motivo) {
  const tier = unspsc ? unspsc.tier : "ninguno";
  return {
    ok, paso, motivo,
    unspsc: unspsc || { tier: "ninguno", codigo_proceso: null, codigo_rup: null, mensaje: motivo },
    tier,
    pertinencia: pertinencia || null,
    anti_suministro: anti,
    // compatibilidad
    unspsc_ok: tier !== "ninguno",
    fuente_unspsc: tier === "ninguno" ? null
      : tier === "texto" ? "texto" : tier === "equivalente" ? "equivalente" : "codigo",
    clases: [],
  };
}

function objeto_valido(lic, perfil, conocimiento, opciones) { return evaluarObjeto(lic, perfil, conocimiento, opciones).ok; }

/* ══════════════ 7 · LA CASCADA COMPLETA, UNA SOLA VEZ ══════════════ */
/* `evaluarObjeto` juzga el OBJETO; esto es la cascada ENTERA que decide qué se
   sirve: modalidad → estado → objeto (con todas sus capas) → capacidad K →
   tope estratégico → anticipo.
   ---------------------------------------------------------------------------
   POR QUÉ EXISTE (ago 2026): /api/oportunidades y /api/resumen la tenían
   escrita cada uno por su lado. Eran idénticas —hay pruebas de que los totales
   coinciden— pero «idénticas hoy» no es una garantía: dos copias divergen a la
   primera corrección que se aplique a una sola, y el día que diverjan el panel
   y la app se contradirán sin que nada falle. Ahora hay UNA implementación y
   las dos la llaman; una corrección aquí llega a los dos por construcción.

   Devuelve TAMBIÉN el veredicto de cada fila (`veredictos`) para que quien
   llama no tenga que volver a evaluar la cascada al pintar la tarjeta, y el
   embudo (`descartes`) para el panel y el diagnóstico.

   Lo que NO entra aquí a propósito: los filtros que ELIGE quien consulta
   (cuantía, nivel de competencia, ubicación, tier, ordenación). Esos son un
   estrechamiento posterior de la lista, no parte del juicio; mezclarlos haría
   que `visibles` dependiera de lo que el usuario tenga marcado en la pantalla.

   `require` DIFERIDO de lib/rup: en tiempo de carga cerraría el ciclo
   filtros → rup → filtros y dejaría medio módulo sin definir. Dentro de la
   función es seguro: cuando alguien la llama, los dos módulos están cargados.
   Es la única forma de tener la cascada donde vive el resto de las reglas. */
const ANTICIPO_MIN_DEFAULT = 20;

/* Nombre del paso de `evaluarObjeto` → contador del embudo. Fuera de la
   función para que /api/diagnostico y las pruebas puedan leer las claves. */
const DESCARTES_OBJETO = {
  convenio: "fuera_convenio",
  blacklist: "fuera_blacklist",
  unspsc: "fuera_unspsc",
  sin_unspsc_ni_obra: "fuera_sin_unspsc_ni_obra",
  objeto_generico: "fuera_objeto_generico",
  no_pertinente: "fuera_no_pertinente",
  texto_debil: "fuera_texto_debil",
  anti_suministro: "fuera_anti_suministro",
};

function descartesVacios() {
  return {
    fuera_modalidad: 0, fuera_estado: 0, fuera_convenio: 0, fuera_blacklist: 0,
    fuera_unspsc: 0, fuera_sin_unspsc_ni_obra: 0, fuera_objeto_generico: 0,
    fuera_no_pertinente: 0, fuera_texto_debil: 0, fuera_anti_suministro: 0,
    fuera_capacidad_k: 0, fuera_tope_estrategico: 0, fuera_anticipo: 0,
  };
}

function filtrarProcesosVisibles(filas, perfilId, conocimiento = {}, opciones = {}) {
  const { evaluarRup } = require("./rup.js"); // diferido a propósito (ver arriba)
  const soloAbiertas = opciones.soloAbiertas !== false;
  const anticipoMin = opciones.anticipoMin === undefined ? ANTICIPO_MIN_DEFAULT : opciones.anticipoMin;
  const opcionesObjeto = { incluirTextoDebil: !!opciones.incluirTextoDebil };

  const visibles = [];
  const veredictos = new Map();
  const descartes = descartesVacios();
  let base_capacidad = 0, superan_k = 0, no_superan_k = 0;

  /* `retenerNoViables` (ago 2026): /api/oportunidades?solo_viables=false quiere
     ENSEÑAR lo que no pasa, atenuado y con el motivo, en vez de hacerlo
     desaparecer. Pero «no viable» NO es «no es de este negocio»: se retiene
     solo lo que falla por una razón que el dueño puede leer y discutir —la
     clase UNSPSC no está en su RUP, o la capacidad no alcanza—. Un proceso de
     software, un convenio o una compra de dotación no vuelven: esos no fallan
     una puerta, es que no son suyos, y devolverlos inundaría la lista con
     exactamente el ruido que la cascada de pertinencia quitó. */
  const retenerNoViables = !!opciones.retenerNoViables;
  const MOTIVOS_RETENIBLES = new Set(["unspsc"]); // paso de evaluarObjeto
  const noViables = [];

  for (const l of filas || []) {
    /* 1 · modalidad competitiva (defensa: el corpus puede traer filas de una
       versión anterior del prefiltro de ingesta) */
    if (!modalidad_competitiva(l)) { descartes.fuera_modalidad++; continue; }

    /* 2 · abierto a ofertas. `proceso_abierto` viene sellado de la
       sincronización, pero se RE-CLASIFICA aquí: una fila guardada por una
       versión con clasificador optimista no puede servirse como abierta. */
    if (soloAbiertas && !(l.proceso_abierto && estado_abierto(l))) { descartes.fuera_estado++; continue; }

    /* 3 · el objeto, con todas sus capas (convenio, blacklist, UNSPSC
       jerárquico, equivalencias, texto, pertinencia, anti-suministro) */
    const rup = evaluarRup(l, perfilId, conocimiento, opcionesObjeto);
    veredictos.set(l, rup);
    if (rup.paso) {
      descartes[DESCARTES_OBJETO[rup.paso] || "fuera_unspsc"]++;
      if (retenerNoViables && MOTIVOS_RETENIBLES.has(rup.paso)) noViables.push({ fila: l, rup, motivo: "RUP" });
      continue;
    }

    /* 4 · capacidad: K de contratación y tope estratégico. Se cuentan aquí —
       sobre los que pasaron el juicio del objeto— porque entre los visibles
       todos superan la K por construcción y el contador no diría nada. */
    base_capacidad++;
    if (!rup.capacidad_ok) {
      if (!rup.dentro_de_tope) descartes.fuera_tope_estrategico++;
      else { descartes.fuera_capacidad_k++; no_superan_k++; }
      if (retenerNoViables) noViables.push({ fila: l, rup, motivo: rup.dentro_de_tope ? "K" : "Tope" });
      continue;
    }
    superan_k++;

    /* 5 · anticipo. 0 = «no declarado» (el dataset no trae la columna): pasa el
       filtro y puntúa 0. Solo se excluye el anticipo DECLARADO bajo el mínimo;
       excluir el 0 dejaría la app vacía para siempre. */
    if (anticipoMin > 0 && l.anticipo_pct > 0 && l.anticipo_pct < anticipoMin) { descartes.fuera_anticipo++; continue; }

    visibles.push(l);
  }

  return {
    visibles, veredictos, descartes, noViables,
    capacidad: { base: base_capacidad, superan_k, no_superan_k },
    opciones: { soloAbiertas, anticipoMin, incluirTextoDebil: opcionesObjeto.incluirTextoDebil, retenerNoViables },
  };
}

/* ---------- compatibilidad: helpers UNSPSC que otros módulos importaban ----------
   `unspscClasesDe` devolvía los códigos de 8 dígitos crudos; se mantiene sobre
   el tokenizador nuevo (sin códigos fabricados a partir de números largos). */
function unspscClasesDe(lic) { return codigosDeLicitacion(lic).codigos.map((c) => c.codigo); }

module.exports = {
  norm, // re-exportada desde lib/semantica: media app hace require("./filtros").norm
  TERMINOS_ESTRUCTURACION, // ídem: el panel la usa para no encabezar con una APP
  ESTADOS_ABIERTOS, ESTADOS_CERRADOS, estado_abierto, estado_cerrado,
  cierre_vencido, OFFSET_COLOMBIA_MS,
  ANTICIPO_MIN_DEFAULT, DESCARTES_OBJETO, descartesVacios, filtrarProcesosVisibles,
  MODALIDADES_COMPETITIVAS, MODALIDADES_EXCLUIDAS, modalidad_competitiva,
  es_convenio, AUNAR_RE, CONVENIO_ENCABEZA_RE,
  hayVerboDeObra, tipoDeObjeto, evaluarPertinencia, SEGMENTOS_OBRA_PURA, ETIQUETA_TIPO,
  esObjetoGenerico, palabrasDeContenido, MIN_LARGO_OBJETO, MIN_PALABRAS_CONTENIDO,
  anclaObra, esSuministroPuro, SEGMENTOS_SERVICIOS_NO_CONSTRUCTIVOS,
  VERBO_ADQUISICION_RE, VERBO_OBRA_RE,
  admisibleParaIngesta, selloReglaIngesta,
  evaluarObjeto, objeto_valido,
  unspscClasesDe, claseDe,
};
