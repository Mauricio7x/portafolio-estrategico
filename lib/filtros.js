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
  TERMINOS_NO_PERTINENTES, prestacionDeSalud, sinAparienciaDeObraEnSalud, TERMINOS_BLOQUEANTES, TERMINOS_ESTRUCTURACION,
  PALABRAS_TRAMITE, TOKEN_CODIGO_RE,
  TIPO_CONSULTORIA, TIPO_INFRAESTRUCTURA,
} = require("./semantica.js");
const {
  codigosDeLicitacion, indiceDe, emparejar, algunCodigoAdmisibleIngesta,
  claseDe, FAMILIAS_UNION, SEG_SERVICIOS_MIN, SEG_SERVICIOS_MAX,
} = require("./unspsc.js");
const { evaluarTexto } = require("./texto_unspsc.js");
// ¿la ley pide el registro en esta modalidad? (N06). Solo carga lib/semantica: no cierra ciclo
const { requisitosQueAplican } = require("./requisitos_ley.js");
const { equivalenteDe } = require("./equivalencias.js");

/* ══════════════════ 1 · Estado del proceso ══════════════════ */
/* Listas canónicas (normalizadas). El dataset varía sufijos («Presentación de
   oferta» vs «…de ofertas», «Borrador» vs «Borrador de pliegos»), por eso la
   coincidencia admite prefijos en ambos sentidos — con longitud mínima para
   que un valor basura corto no "coincida" con nada. */
/* «abierto» SIGUE AQUÍ, PERO YA SE SABE QUÉ ES (22-sep-2026, medición del dueño sobre menores
   cuantías): en la fase de ofertas, el estado «Abierto» es «ofertas ya abiertas» —las 387 filas
   llevan `estado_de_apertura_del_proceso: "Cerrado"` y ninguna tiene recepción futura—, no
   «recibiendo». No se saca de la lista porque el reloj (`cierre_vencido`, que va antes) ya las
   cierra a todas; lib/indice_competencia sí lee la columna publicada para contar sus ofertas.
   Medido también en licitación pública (23-sep-2026): con recepción futura no sale ninguna
   fila con estado «Abierto» ni ninguna «Cerrado» (295 de 295 «Abierto» en la columna
   publicada). Si una fila «Abierto» apareciera con recepción futura, este comentario es lo
   primero que hay que volver a medir. */
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
const { PREFIJO_ESTADO_RE, nucleoEstado } = require("./semantica.js");   // una sola copia del recorte (22-sep-2026)

function coincide(valor, lista) {
  const v = nucleoEstado(valor);
  if (v.length < 4) return false; // valores basura no coinciden con nada
  return lista.some((e) => v === e || v.startsWith(e) || e.startsWith(v));
}

/* ⚠️ «MANIFESTACIÓN DE INTERÉS» NO ES UN ESTADO DESCONOCIDO (15-sep-2026).
   `coincide` compara por PREFIJO en los dos sentidos, y esa comparación deja
   vivos a todos los hermanos del literal que sí está en la lista: medido,
   «Recepción de manifestaciones de interés» casa, pero «Manifestación de
   interés (Menor Cuantía)» —el rótulo REAL con el que SECOP II marca estos
   procesos, contado en 333 de 1.593 abiertos en `docs/datos.md §6`— no casa con
   él ni con ningún otro, y tampoco casa el singular, ni «Presentación de
   manifestación de interés». Como aquí lo desconocido vale CERRADO, esos
   procesos se descartaban EN LA INGESTA: no entraban a Redis, no salían en el
   listado y no aparecían en el embudo de /api/diagnostico, que solo censa lo
   guardado. Es, literalmente, el defecto de la fase rezagada de la UPN
   (20-ago-2026) repetido sobre el único grupo de procesos que el dueño pidió
   priorizar, y con `estado_cerrado` respondiendo `false` sobre la misma fila:
   NADA afirmaba que hubiera cerrado; se escondía por no saber leer un rótulo.

   Una lista de literales dejaría hermanos vivos otra vez —es la lección de
   «declarar el singular deja vivo el plural»—, así que la cerca es UNA
   expresión sobre el valor normalizado, que cubre singular, plural, con
   prefijo y con sufijo de una sola vez. No sustituye a `coincide` ni ensancha
   sus listas: se consulta SOLO donde hoy se respondía `false` por ignorancia,
   nunca por delante de `adjudicado="Si"`, del reloj ni de ESTADOS_CERRADOS —
   la precedencia del 20-ago-2026 no se toca. */
const { MANIFESTACION_INTERES_RE, FASE_ANTES_MANIFESTACION_RE, FASE_TRAS_MANIFESTACION_RE } = require("./semantica.js");   // una sola definición: las usa también lib/manifestacion

/* «EVALUACIÓN» ES EL ESTADO DE UNA FASE, NO DEL PROCESO (22-sep-2026, medición del
   dueño contra p6dx-8zbt: de las menores cuantías publicadas desde el 1-sep, 302
   están en «Presentación de observaciones» / «Publicado» y 265 en la MISMA fase /
   «Evaluación»). SECOP II marca «Evaluación» cuando cierra la ventana de la fase
   vigente: en la fase de observaciones significa «la entidad responde las
   observaciones y el pliego definitivo viene después», no «las ofertas cerraron».
   Con «evaluacion» en ESTADOS_CERRADOS por prefijo («en evaluacion», «evaluacion
   de ofertas»), esas 265 se descartaban EN LA INGESTA (`transformar` en la full,
   `proceso_abierto: false` en el delta): oportunidades que todavía no han abierto,
   escondidas como cerradas. Es el falso negativo —el caro— y el mismo punto ciego
   de la UPN: no salían en ningún embudo.
   La lectura: «Evaluación» con una fase ANTERIOR a la manifestación (la cerca de
   lib/semantica, sin el prefijo «Proceso ») es un proceso POR ABRIR. Solo puede
   DES-cerrar, nunca cerrar: es una EXCEPCIÓN declarada, en una sola dirección, al
   punto 4 de la precedencia del 20-ago («fase solo si el estado calla»): una
   fase POSTERIOR rezagada (la cicatriz de la UPN) no la alcanza, y una fase
   anterior rezagada solo daría un ámbar de más («puede abrir en cualquier
   momento», lib/manifestacion), el lado barato. `adjudicado="Si"` y el reloj
   siguen por delante; «Evaluación» con la fase de manifestación (562) o la de
   ofertas sigue cerrado (el dueño pidió no ver lo que ya no admite entrar). */
function evaluacionDeFaseAnterior(estado, fase) {
  // normaliza aquí mismo (idempotente): vale con el literal crudo y con el ya normalizado
  if (!/^(?:en\s+)?evaluacion\b/.test(nucleoEstado(norm(String(estado || ""))))) return false;
  const f = nucleoEstado(norm(String(fase || "")));
  return !!f && FASE_ANTES_MANIFESTACION_RE.test(f);
}

/* «SELECCIONADO» CIERRA, Y SOLO POR IGUALDAD EXACTA (15-sep-2026, decisión del
   dueño: «los que ya no se puedan presentar, ya no los muestres»). En la
   medición del dueño hay 12 menores cuantías con estado «Seleccionado» y fase
   «Presentación de oferta» / «Fase de ofertas»: el sorteo ya eligió y solo los
   elegidos ofertan, así que quien no manifestó no puede presentarse. Hasta hoy
   10 de esas 12 se SERVÍAN: «seleccionado» no está en ninguna lista, el estado
   caía en desconocido y hablaba la fase, que sí está en la de abiertos.
   No puede ir en ESTADOS_CERRADOS porque `coincide` casa por prefijo en los dos
   sentidos y «seleccionado» se tragaría la fase «Selección», que es justo donde
   se reciben ofertas (el comentario de esa lista ya lo avisa). Por eso es una
   lista aparte, comparada con `===` y SOLO sobre `estado_del_procedimiento`:
   la fase nunca la consulta. En cualquier otra modalidad «Seleccionado» es un
   adjudicatario elegido, o sea cerrado igual: la regla no distingue y no lo
   necesita. */
const ESTADOS_CERRADOS_EXACTOS = ["seleccionado"].map(norm);
const cerradoExacto = (nEstado) => ESTADOS_CERRADOS_EXACTOS.includes(nucleoEstado(nEstado));

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
  /* ⚠️ UN CIERRE SIN HORA VENCE AL FINAL DE SU DÍA, NO AL PRINCIPIO
     (15-sep-2026). `Date.parse` sitúa «2026-09-15» —y «2026-09-15T00:00:00.000»,
     que en esta fuente es indistinguible de «no publicaron la hora»— en la
     medianoche UTC, y al restarle las 5 h de Colombia el proceso quedaba
     VENCIDO desde las 5:00 de la mañana de su propio último día: se perdía
     entero el día del cierre, que es el más valioso que tiene un proceso.
     Medido antes del arreglo: con `fecha_cierre = "2026-09-15"`, a las 11:00 de
     la mañana de ese mismo 15 en Bogotá, `cierre_vencido` respondía `true`.
     Una hora ausente es «no sé a qué hora», y la regla del proyecto dice que
     ante la duda en oportunidades se muestra: se cuenta hasta el final del día.
     Un cierre CON hora no se toca — el que cierra a las 6:00 PM se sigue viendo
     a las 5:59 y desaparece a las 7. */
  const sinHora = !/T[0-2]\d:[0-5]\d/.test(String(cierre)) || /T00:00(?::00)?(?:\.0+)?(?:$|[^\d])/.test(String(cierre));
  const limite = sinHora ? t + 86400000 : t;
  const ahora = Number.isFinite(ahoraMs) ? ahoraMs : Date.now();
  return limite < ahora - OFFSET_COLOMBIA_MS;
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
  if (nEstado && cerradoExacto(nEstado)) return true;
  if (nEstado && evaluacionDeFaseAnterior(nEstado, norm(lic.fase))) return false;   // la gemela: misma lectura
  if (nEstado && (coincide(nEstado, ESTADOS_CERRADOS) || coincide(nEstado, ESTADOS_ABIERTOS))) {
    return coincide(nEstado, ESTADOS_CERRADOS);
  }
  /* EL HERMANO VIVO DE LA CERCA (15-sep-2026). La cerca de la manifestación se
     puso en `estado_abierto` y esta gemela se quedó sin ella: un proceso cuyo
     estado publicado es «Manifestación de interés (Menor Cuantía)» con una
     `fase` rezagada en un literal cerrado —el caso UPN— salía VISIBLE de la
     cascada y a la vez esta función respondía `true`, que es lo que mira el
     panel para sus destacados (`lib/handlers/perfil/resumen.js`): la lista lo
     enseñaba y el panel afirmaba que había cerrado. Dos respuestas sobre el
     mismo hecho. Se consulta la MISMA constante, no una regla nueva. */
  if (nEstado && MANIFESTACION_INTERES_RE.test(nucleoEstado(nEstado))) return false;
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
    if (cerradoExacto(nEstado)) return false;               // «Seleccionado»: el sorteo ya eligió
    if (evaluacionDeFaseAnterior(nEstado, norm(lic.fase))) return true;   // observaciones cerradas: por abrir, no cerrado
    if (coincide(nEstado, ESTADOS_CERRADOS)) return false;
    if (coincide(nEstado, ESTADOS_ABIERTOS)) return true;   // la fase ya no veta
    // recibir manifestaciones de interés es recibir, no cerrar (ver la cerca arriba)
    if (MANIFESTACION_INTERES_RE.test(nucleoEstado(nEstado))) return true;
  }
  // la columna autoritativa no dice nada reconocible: ahora sí habla `fase`
  const nFase = norm(lic.fase);
  if (!nFase) return false;
  if (coincide(nFase, ESTADOS_CERRADOS)) return false;
  if (coincide(nFase, ESTADOS_ABIERTOS)) return true;
  return MANIFESTACION_INTERES_RE.test(nucleoEstado(nFase));
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
     3-salud. ¿el objeto ES un servicio
        de salud: lo ENCABEZA?
        (23-sep-2026)                  → NO PERTINENTE (rojo); después del 1 y
                                         del 3 para no tumbar la obra de un hospital;
                                         como lugar o finalidad no descarta
     4. resto                          → PERTINENTE CON ADVERTENCIA (amarillo),
                                         marcado `casa_solo_por_servicio` si todo
                                         lo que casa es de servicios no constructivos

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

/* textoNorm + resultado del matching → veredicto de pertinencia graduado.
   `casados` (opcional) son los códigos del proceso que CASAN con el registro
   del perfil —solo los pasa evaluarObjeto, que es quien tiene el índice—: con
   ellos el ámbar dice si lo sostiene únicamente una clase de servicios que no
   son obra (ver el paso 4). */
function evaluarPertinencia(textoNorm, { tier, codigos, casados, descripcionNorm } = {}) {
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
  /* ¿Un servicio de salud ENCABEZA el objeto? Se pregunta al nombre + la
     descripción y, si viene, a la descripción sola: SECOP II titula a menudo con
     una etiqueta corta («REHABILITACIÓN INTEGRAL DESAN») y el objeto de verdad
     empieza en la descripción («PRESTACIÓN DE SERVICIOS DE SALUD EN…»). Siempre
     por prestacionDeSalud, la única entrada. */
  const salud = prestacionDeSalud(textoNorm) || (descripcionNorm ? prestacionDeSalud(descripcionNorm) : null);
  const verboEn = (t) => t.match(VERBOS_DE_OBRA_FUERTES) || t.match(VERBOS_DE_OBRA_CONDICIONADOS)
    || t.match(VERBOS_DE_OBRA_CONDICIONADOS_INV);
  /* Con la salud encabezando, el vocabulario de obra solo cuenta si sobrevive a
     quitar lo que solo LO PARECE («EN LAS INSTALACIONES DEL HOSPITAL» es el
     lugar; «REHABILITACIÓN INTEGRAL», la terapia): lib/semantica. Si sobrevive
     es verde como siempre —la guarda de obra no se toca—; si no, el objeto va
     a la regla de la salud de abajo, con la clase de obra pura por delante. */
  const verbo = salud ? verboEn(sinAparienciaDeObraEnSalud(textoNorm)) : verboEn(textoNorm);
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
  /* 3-salud (23-sep-2026). La PRESTACIÓN de servicios de salud no es obra. Va
     aquí, y no junto a TERMINOS_NO_PERTINENTES, por las dos guardas que exige no
     tumbar obra real: con vocabulario de obra en el objeto ya salió verde
     arriba, y una clase de obra pura inscrita (72/77/81/95) también — «PINTURA
     Y ARREGLOS LOCATIVOS DEL ÁREA DE GINECOLOGÍA» con 72101500 no es un servicio
     de salud. Y el término solo cuenta cuando ENCABEZA el objeto (lib/semantica):
     en medio del texto nombra el lugar o la finalidad de una obra, y ese objeto
     sigue al paso 4, en ámbar y visible; una etiqueta de área con dos puntos
     delante («SALUD: …») no es el objeto. Se LLAMA a prestacionDeSalud, la única
     entrada: la expresión suelta no sabe de etiquetas. Las demás listas
     conservan su orden. `salud` se calculó arriba, antes del verbo. */
  if (salud) {
    return {
      ok: false, nivel: "rojo", tipo: "no_pertinente", etiqueta: "No pertinente",
      termino: salud[0],
      motivo: `prestación de servicios de salud («${salud[0]}»), no obra ni consultoría de obra, pese al UNSPSC inscrito`,
    };
  }
  /* 4 · ámbar. EL HERMANO QUE NINGUNA LISTA ALCANZA (23-sep-2026): mensajería,
     revisoría fiscal, auditoría externa, primera infancia, gestión documental…
     entran por una clase de servicios que los RUP inscriben (80, 84, 85, 86, 90,
     91, 92, 93, 94) y ningún término los nombra. Una lista más no es la salida
     —siempre queda el de al lado—, y esconderlos por la duda sería el falso
     negativo caro. Se marca el ámbar: si TODOS los códigos que casan con el
     registro son de esos segmentos, el código no dice nada de obra y el objeto
     tampoco. La puerta P1 (lib/puertas) lo convierte en advertencia visible. */
  const casaSoloPorServicio = (tier === "clase" || tier === "familia")
    && Array.isArray(casados) && casados.length > 0
    && casados.every((c) => SEGMENTOS_SERVICIOS_NO_CONSTRUCTIVOS.has(c.segmento));
  return {
    ok: true, nivel: "amarillo", tipo: "indeterminado", etiqueta: ETIQUETA_TIPO.indeterminado,
    casa_solo_por_servicio: casaSoloPorServicio,
    motivo: casaSoloPorServicio
      ? "solo casa por una clase de servicios que no son obra y el objeto no dice que sea obra: confirmarlo en el pliego"
      : "el objeto no dice explícitamente que sea obra: verificar en el pliego",
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
    /* la lectura de «Evaluación» con la fase anterior (22-sep-2026) también cuenta: sin ella en el
       sello, la portada pintaba el salto de +265 «abiertos» como movimiento del mercado en vez de
       cortar la serie (M-DGF-20) */
    estados: [ESTADOS_ABIERTOS, ESTADOS_CERRADOS, ESTADOS_CERRADOS_EXACTOS, MANIFESTACION_INTERES_RE.source, FASE_ANTES_MANIFESTACION_RE.source, "evaluacion_de_fase_anterior:1"],
    convenio: [AUNAR_RE.source, CONVENIO_ENCABEZA_RE.source],
    objeto: [BLACKLIST_OBJETO.source, WHITELIST_OBRA.source, VERBOS_DE_OBRA_FUERTES.source, VERBOS_DE_OBRA_CONDICIONADOS.source, VERBOS_DE_OBRA_CONDICIONADOS_INV.source],
    unspsc: [SEG_SERVICIOS_MIN, SEG_SERVICIOS_MAX, [...FAMILIAS_UNION].sort()],
    /* la portada cuenta OBRAS, no publicaciones (27-sep-2026): con las 613 filas de producción,
       613 → 544 abiertos y −12 % de dinero en juego. Sin esto en el sello, `portada:historia`
       guardaba con la misma huella días contados de las dos maneras y la tendencia pintaba el
       cambio de conteo como una caída del mercado (la cicatriz de M-DGF-20). Van los DATOS que
       deciden qué publicaciones se funden (las cabezas del sufijo de fase y la fase posterior a la
       manifestación; las otras dos fases ya están en `estados`) y una marca de versión para lo que
       es código y no dato (`esPublica`, `mismoObjeto`, `compararVigencia`): quien cambie esa
       lógica sube el número. */
    obra: ["portada_una_por_obra:1", CABEZAS_SUFIJO_FASE, FASE_TRAS_MANIFESTACION_RE.source],
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
  /* paso 7-bis · DONDE LA LEY NO PIDE REGISTRO, EL CÓDIGO NO DECIDE (27-sep-2026, N06).
     En mínima cuantía (Ley 1150 de 2007, art. 6, modificado por el art. 221 del
     Decreto Ley 19 de 2012; lo declara lib/requisitos_ley) un código que no está
     en el registro no es causa de rechazo. Lo que sigue igual es la pregunta del
     OBJETO, con la MISMA vara que cualquier proceso sin código que case: el paso
     8-bis (verde, o el interruptor «incluir procesos sin código»). Si el objeto la
     pasa, el proceso entra por la ruta del texto y P1 lo dice en ámbar con la frase
     de la modalidad. Si no la pasa, se queda EXACTAMENTE como estaba (paso
     «unspsc»): mandarlo al 8-bis lo sacaría del todo, y hoy se retiene atenuado o
     lo rescata un socio que sí tiene el código (medido con las 613 filas del
     26-sep: dos de mínima cuantía, visibles para Helder por el socio, habrían
     desaparecido). Medido también: una obra con verbo de obra ya entraba por el
     paso 7, así que en mínima el código nunca escondió una obra que el objeto
     describa; esto cierra el caso del interruptor. */
  if (unspsc.tier === "ninguno" && codigos.length && requisitosQueAplican(lic).registro.pide === false) {
    const pertTexto = pertinenciaDeFila(lic, { tier: "texto", codigos, casados: [] });
    if (pertTexto.ok && (pertTexto.nivel === "verde" || opciones.incluirTextoDebil)) unspsc = {
      tier: "texto", codigo_proceso: null, codigo_rup: null, familia_sugerida: null, terminos: [],
      segmento_afin: unspsc.segmento_afin, sin_registro_exigido: true,
      mensaje: "La ley no exige registro de proponente en esta modalidad: lo sostiene el objeto, no el código",
    };
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

  /* paso 8 · pertinencia del objeto (solo si el matching pasó). `casados`: los
     códigos del proceso que casan con ESTE registro, cada uno juzgado por el
     MISMO `emparejar` (no una segunda regla de parentesco). `emparejar` devuelve
     solo el mejor, y la pregunta del ámbar es si TODOS los que casan son de
     servicios que no son obra. Solo con tier de código: en `equivalente` y
     `texto` la puerta ya advierte por su cuenta. */
  const casados = unspsc.tier === "clase" || unspsc.tier === "familia"
    ? codigos.filter((c) => emparejar([c], idx).tier !== "ninguno") : [];
  const pertinencia = pertinenciaDeFila(lic, { tier: unspsc.tier, codigos, casados });
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

/* La pertinencia de UNA fila, con el mismo texto que juzga `evaluarObjeto` (nombre +
   descripción) y la descripción aparte para la salud que la encabeza. Una sola forma de
   armar la llamada: la usan `evaluarObjeto` y la retención de no viables de la cascada. */
function pertinenciaDeFila(lic, { tier, codigos, casados } = {}) {
  const texto = `${lic.nombre_del_procedimiento || ""} ${lic.descripci_n_del_procedimiento || ""}`;
  return evaluarPertinencia(norm(texto), {
    tier, codigos, casados, descripcionNorm: norm(lic.descripci_n_del_procedimiento || ""),
  });
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
/* 0, Y NO 20 (decisión del dueño, 15-sep-2026): «omite el tema del anticipo».
   Con 20, el único proceso que se castigaba era el que DECLARABA un anticipo
   bajo en el objeto —el que no declara nada, que es casi todo el dataset, pasaba
   igual— y el dato del pliego no se puede leer para todos los procesos. Con 0
   el filtro es opt-in: quien lo quiera lo pide por `?anticipo_min=`. Vale para
   la cascada entera (listado, panel, entrada, pulso): una sola constante. */
const ANTICIPO_MIN_DEFAULT = 0;

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
    /* otra publicación (otro REQ) de una obra que la lista ya enseña: no es un
       descarte del juicio, pero tiene casilla para que descartes + visibles
       sigan agotando el corpus (ver `agruparVersionesDeObra`) */
    fuera_misma_obra: 0,
  };
}

/* ══════════════════ LA MISMA OBRA, UNA SOLA TARJETA (26-sep-2026) ══════════════════
   Decisión del dueño: «una tarjeta por obra». SECOP II abre un `id_del_proceso`
   (REQ) NUEVO en cada fase de una misma obra —el proyecto de pliego en
   «Presentación de observaciones», la manifestación de interés, las ofertas— y
   los dos quedan vivos en el dataset con el MISMO `id_del_portafolio`
   (CO1.BDOS.…). El corpus deduplica por `id_del_proceso` (lib/almacen,
   `leerChunksDedup`), así que la lista servía las dos: medido sobre las 613 filas
   del perfil helder el 26-sep-2026, 544 obras y 67 portafolios repetidos; en 35
   pares una tarjeta decía «todavía no abre» y la gemela «verifique HOY».

   Dónde, y por qué aquí: en la cascada compartida, que es lo que cuentan el
   listado, el panel (/api/resumen) y el pulso de la entrada; fundir en un solo
   consumidor volvería a dar tres cifras distintas de lo mismo. NO en el corpus
   (lib/almacen): Mis procesos, el cronograma y los documentos buscan la fila por
   su `id_del_proceso`, y quien guardó la versión de observaciones la perdería.
   Quien explica la lista —el rastreo y el embudo de /api/diagnostico— lee la
   fusión de AQUÍ (`fundidaEn`), no la recalcula.

   Reglas (el falso caro aquí es ESCONDER una obra real):
   · Solo se funden filas del MISMO portafolio con el MISMO objeto: nombre igual
     tras normalizar, o igual salvo el sufijo de fase que SECOP II le pega
     («… (Manifestación de interés (Menor Cuantía))», recortado a 200 caracteres
     en la fuente); y si las dos traen descripción, la descripción también. Dos
     lotes u objetos distintos bajo un portafolio NO se funden: se cuentan.
   · Se queda la versión VIGENTE: primero la que el público puede abrir (ver
     `esPublica`), después la de publicación más reciente (la mayor de
     `fecha_de_publicacion_del` y `fecha_de_ultima_publicaci`, la misma regla de
     lib/manifestacion), después la fase más avanzada (lib/semantica: antes de la
     manifestación < manifestación < posterior) y, al final, el REQ más alto. La
     fecha va antes que la fase porque la fase puede venir rezagada (la cicatriz
     de la UPN).
   · Se elige ENTRE LAS QUE PASAN EL JUICIO: si la vigente no pasa (cerrada,
     cancelada, fuera de su registro, capacidad…), la obra no desaparece: se
     queda la otra, como hasta hoy.
   · Cada tarjeta es la fila PUBLICADA de su REQ, sin mezclar datos de la gemela.
     Un primer arreglo le prestaba a la versión sin código («UNSPECIFIED») el
     código de su gemela; la revisión lo tumbó el mismo día: el código prestado
     entraba en la baja por tipo de contrato, la probabilidad y el orden, y la
     tarjeta contradecía a Mis procesos, que lee la fila por su REQ. Mover esas
     cifras es decisión del dueño y va a su plan, no aquí.
   Costo: una pasada por el corpus en memoria, cero comandos de Redis. */
/* Las cabezas de los sufijos de fase que SECOP II pega al nombre. La fuente recorta el
   nombre a 200 caracteres, así que el sufijo puede llegar cortado en cualquier letra
   («… LA GUAJIRA. (M», medido en CO1.BDOS.10805379): vale la cabeza entera o un
   trozo inicial de ella, siempre al FINAL del nombre y abierto con paréntesis. */
const CABEZAS_SUFIJO_FASE = ["manifestacion de interes", "presentacion de oferta", "presentacion de observaciones",
  "fase de seleccion", "seleccion", "borrador", "observaciones", "oferta", "recepcion de ofertas", "evaluacion",
  "precalificacion", "pre-calificacion", "pre calificacion", "clarification", "proyecto de pliego"];
function esSufijoDeFase(resto) {
  const m = String(resto).match(/^\s*\(\s*(.*)$/);
  if (!m) return false;
  const r = m[1];
  if (!r) return true; // «… (» cortado justo al abrir
  return CABEZAS_SUFIJO_FASE.some((h) => r.startsWith(h) || h.startsWith(r));
}
function mismoTexto(a, b) {
  if (!a || !b) return false;
  if (a === b) return true;
  const [corto, largo] = a.length <= b.length ? [a, b] : [b, a];
  return largo.startsWith(corto) && esSufijoDeFase(largo.slice(corto.length));
}
function mismoObjeto(a, b) {
  const na = norm(a.nombre_del_procedimiento), nb = norm(b.nombre_del_procedimiento);
  const da = norm(a.descripci_n_del_procedimiento), db = norm(b.descripci_n_del_procedimiento);
  // dos descripciones publicadas que no casan desmienten cualquier parecido del nombre
  if (da && db && !mismoTexto(da, db)) return false;
  if (na && nb) return mismoTexto(na, nb);
  // sin nombre en alguna, decide la descripción (las dos tienen que traerla)
  return !!(da && db);
}
/* ⚠️ UNA VERSIÓN QUE EL PÚBLICO NO PUEDE ABRIR NO GANA A UNA QUE SÍ (26-sep-2026,
   revisión del arreglo). Medido en las 613 filas de producción: 504 «Publicado» y 100
   «Evaluación», todas con enlace a /Public/…; las 9 «Borrador» llevan como enlace la
   página de inicio de sesión de SECOP II (/STS/Users/Login/Index), sin fase, y su
   referencia termina en «(Fase de Selección (Presentación de ofertas))»: es la fase de
   ofertas todavía sin publicar. Con la fecha por delante, CARDIQUE (CO1.BDOS.10798280)
   se quedaba con el Borrador del 23-sep y escondía la versión pública del 4-sep: el
   botón «Ver en SECOP II» de la única tarjeta no abría el proceso. Sin dato no es
   «no pública»: una fila sin enlace ni estado no se castiga. */
function esPublica(l) {
  if (nucleoEstado(norm(l.estado_del_procedimiento)) === "borrador") return false;
  const url = String(l.urlproceso || "").trim();
  if (url && /\/sts\/users\/login\//i.test(url)) return false;
  return true;
}
const fechaVigenteDe = (l) => [String(l.fecha_de_publicacion_del || "").slice(0, 10), String(l.fecha_de_ultima_publicaci || "").slice(0, 10)]
  .filter((f) => /^\d{4}-\d{2}-\d{2}$/.test(f)).sort().pop() || "";
function rangoDeFase(l) {
  const f = nucleoEstado(norm(l.fase));
  if (!f) return -1;
  if (FASE_ANTES_MANIFESTACION_RE.test(f)) return 0;
  if (MANIFESTACION_INTERES_RE.test(f)) return 1;
  if (FASE_TRAS_MANIFESTACION_RE.test(f)) return 2;
  return -1;
}
const numeroReq = (l) => { const m = String(l.id_del_proceso || "").match(/(\d+)\s*$/); return m ? Number(m[1]) : -1; };
/* negativo = `a` es más vigente que `b` */
function compararVigencia(a, b) {
  const qa = esPublica(a), qb = esPublica(b);
  if (qa !== qb) return qa ? -1 : 1;
  const fa = fechaVigenteDe(a), fb = fechaVigenteDe(b);
  if (fa !== fb) return fa > fb ? -1 : 1;
  const pa = rangoDeFase(a), pb = rangoDeFase(b);
  if (pa !== pb) return pb - pa;
  const ra = numeroReq(a), rb = numeroReq(b);
  if (ra !== rb) return rb - ra;
  return String(b[":updated_at"] || "").localeCompare(String(a[":updated_at"] || ""));
}

/* Agrupa las versiones de una misma obra. Devuelve el grupo y el puesto de vigencia
   de cada fila agrupada (0 = la más vigente) y qué portafolios tienen objetos
   distintos y no se funden. NO copia ni modifica filas: la fila del corpus está
   memoizada y la comparten otras peticiones y otros perfiles, y el rastreo busca
   por IDENTIDAD la fila que la cascada fundió. */
/* Memoizado por IDENTIDAD del arreglo: el listado recibe el corpus memoizado de la
   instancia caliente (el mismo arreglo hasta la siguiente sincronización), así que
   agrupar cuesta una vez por corpus y no una por petición. */
const _versionesMemo = new WeakMap();
function agruparVersionesDeObra(filas) {
  if (Array.isArray(filas) && _versionesMemo.has(filas)) return _versionesMemo.get(filas);
  const r = agruparSinMemo(filas);
  if (Array.isArray(filas)) _versionesMemo.set(filas, r);
  return r;
}
function agruparSinMemo(filas) {
  const porPortafolio = new Map();
  for (const l of filas || []) {
    const p = l && String(l.id_del_portafolio || "").trim();
    if (!p) continue;
    let g = porPortafolio.get(p);
    if (!g) { g = []; porPortafolio.set(p, g); }
    g.push(l);
  }
  const grupoDe = new Map(), puestoDe = new Map();
  const conObjetosDistintos = new Set();
  let grupos = 0;
  for (const [p, miembros] of porPortafolio) {
    if (miembros.length < 2) continue;
    const orden = miembros.slice().sort(compararVigencia);
    const racimos = [];
    for (const l of orden) {
      const r = racimos.find((x) => mismoObjeto(x[0], l));
      if (r) r.push(l); else racimos.push([l]);
    }
    if (racimos.length > 1) conObjetosDistintos.add(p);
    racimos.forEach((racimo, i) => {
      if (racimo.length < 2) return;
      grupos++;
      const clave = `${p}#${i}`;
      racimo.forEach((l, puesto) => { grupoDe.set(l, clave); puestoDe.set(l, puesto); });
    });
  }
  return { grupoDe, puestoDe, grupos, conObjetosDistintos };
}

/* De una lista YA juzgada, deja por obra la versión más vigente de las presentes.
   `fundidaEn`: cada fila apartada → la fila que la enseña en su lugar. */
function unaPorObra(lista, versiones) {
  if (!versiones || !versiones.grupoDe.size) return { filas: lista, fundidas: 0, mejor: new Map(), fundidaEn: new Map() };
  const mejor = new Map();
  for (const l of lista) {
    const g = versiones.grupoDe.get(l);
    if (g == null) continue;
    const m = mejor.get(g);
    if (!m || versiones.puestoDe.get(l) < versiones.puestoDe.get(m)) mejor.set(g, l);
  }
  const fundidaEn = new Map();
  const filas = lista.filter((l) => {
    const g = versiones.grupoDe.get(l);
    if (g == null || mejor.get(g) === l) return true;
    fundidaEn.set(l, mejor.get(g));
    return false;
  });
  return { filas, fundidas: lista.length - filas.length, mejor, fundidaEn };
}

/* Lo que viaja de cada publicación apartada en `otras_versiones` de la tarjeta que queda
   (contrato con la pantalla: estos seis campos y ninguno más). SIN cifras de dinero: la
   tarjeta decide con su propia fila. `publica` es la MISMA regla que elige la vigente
   (`esPublica`); `codigo` va crudo, como lo publicó SECOP II. Sin dato → null, jamás un
   valor de relleno. */
const textoONull = (v) => { const s = v == null ? "" : String(v).trim(); return s ? s : null; };
function fichaDeOtraVersion(l) {
  return {
    id_del_proceso: textoONull(l.id_del_proceso),
    fase: textoONull(l.fase),
    estado: textoONull(l.estado_del_procedimiento),
    fecha_cierre: textoONull(l.fecha_cierre),
    publica: esPublica(l),
    codigo: textoONull(l.codigo_principal_de_categoria),
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
  let rescatadas_capacidad = 0;
  /* UN PROCESO QUE SE ALCANZA CON SOCIO NO SE ESCONDE (11-sep-2026, encargo del
     dueño). La decisión vive AQUÍ y no en cada consumidor: esta cascada la
     llaman el listado, el panel y el conteo de la entrada y del pulso, y
     parchearla caller a caller fue lo primero que se intentó — el panel decía
     441 y la lista 585, «dos cálculos distintos», que es justo lo que esta
     función existe para impedir.
     `sinSocios: true` la apaga (lo usa quien mide qué alcanza el dueño SOLO). */
  const plurales = opciones.sinSocios ? [] : pluralesDeLaCascada(perfilId);
  const alcanzaConSocio = (l) => {
    if (!plurales.length) return null;
    const { socioQueAlcanza } = require("./socio_por_proceso.js");
    return socioQueAlcanza(l, plurales, { conocimiento, incluirTextoDebil: opcionesObjeto.incluirTextoDebil });
  };
  const conSocio = new Map();

  /* LA MISMA OBRA, UNA SOLA TARJETA: las versiones se agrupan antes (una vez por
     corpus) y la fusión va al final, entre las que pasaron (ver
     `agruparVersionesDeObra`). Cada fila se juzga con lo que publicó ella. */
  const versiones = agruparVersionesDeObra(filas);

  for (const l of filas || []) {
    /* 1 · modalidad competitiva (defensa: el corpus puede traer filas de una
       versión anterior del prefiltro de ingesta) */
    if (!modalidad_competitiva(l)) { descartes.fuera_modalidad++; continue; }

    /* 2 · abierto a ofertas. Se RE-CLASIFICA aquí con `estado_abierto`, que es
       la regla de HOY.
       ⚠️ EL SELLO DE LA INGESTA YA NO PUEDE VETAR (15-sep-2026). La condición
       era `l.proceso_abierto && estado_abierto(l)`, y un `&&` no re-clasifica:
       solo RESTA. `proceso_abierto` lo escribe `enriquecer` en el momento de la
       ingesta y no se vuelve a tocar mientras la fuente no modifique la fila,
       así que toda fila que entró al corpus con una regla de estado ANTERIOR
       quedaba invisible para siempre aunque `estado_abierto` dijera `true` hoy.
       Ya pasó una vez —el literal «Activo» se añadió a ESTADOS_ABIERTOS después
       de que hubiera filas selladas sin él— y volvería a pasar con la cerca de
       la manifestación de interés de este mismo commit: desplegar la corrección
       no puede exigir reconstruir el corpus (regla del proyecto).
       Quitarlo NO afloja el juicio: `estado_abierto` re-aplica aquí, en la
       petición, las tres señales duras que el sello ya tenía en cuenta
       —`adjudicado="Si"`, el reloj de `cierre_vencido` y las listas canónicas—
       y además con la fecha de HOY, que el sello no puede tener. El sello sigue
       escribiéndose y sirve para el rastreo y la salud de la sincronización. */
    if (soloAbiertas && !estado_abierto(l)) { descartes.fuera_estado++; continue; }

    /* 3 · el objeto, con todas sus capas (convenio, blacklist, UNSPSC
       jerárquico, equivalencias, texto, pertinencia, anti-suministro) */
    const rup = evaluarRup(l, perfilId, conocimiento, opcionesObjeto);
    veredictos.set(l, rup);
    /* Solo se rescata lo que un socio ARREGLA de verdad: que el objeto no esté
       en el registro del dueño, o que la capacidad no alcance. Un convenio o una
       compra de dotación no se vuelven obra por sumar integrantes.
       La fila rescatada NO se da por visible aquí: sigue el camino completo y
       todavía tiene que pasar el filtro de anticipo, como cualquier otra. Darla
       por visible en este punto la colaba saltándose un paso, y el panel y el
       diagnóstico dejaban de contar lo mismo. */
    let rescatada = null;
    if (rup.paso) {
      rescatada = MOTIVOS_RETENIBLES.has(rup.paso) ? alcanzaConSocio(l) : null;
      if (!rescatada) {
        descartes[DESCARTES_OBJETO[rup.paso] || "fuera_unspsc"]++;
        /* ⚠️ «NO ESTÁ EN SU REGISTRO» NO DICE QUE SEA OBRA (27-sep-2026, revisión adversaria).
           El paso UNSPSC muere ANTES de la pertinencia, así que un servicio de salud con un
           código fuera del registro («PN RASES… PRESTACIÓN DE SERVICIOS DE SALUD
           ESPECIALIZADOS…», 85121700) volvía atenuado con «Solo las que cumplen» apagado,
           contado como «no encaja con su registro». Antes de retenerlo se le pregunta a la
           MISMA pertinencia (sin código que case: tier «ninguno»): si dice rojo «No
           pertinente», no es de este negocio y no vuelve, igual que un convenio. Solo el
           rojo no_pertinente: un ámbar, o un objeto que no dice nada, se sigue enseñando. */
        const pert = retenerNoViables && MOTIVOS_RETENIBLES.has(rup.paso)
          ? pertinenciaDeFila(l, { tier: "ninguno", codigos: rup.codigos || [], casados: [] }) : null;
        if (pert && !(pert.nivel === "rojo" && pert.tipo === "no_pertinente")) noViables.push({ fila: l, rup, motivo: "RUP" });
        continue;
      }
    }

    /* 4 · capacidad: K de contratación y tope estratégico. Se cuentan aquí —
       sobre los que pasaron el juicio del objeto— porque entre los visibles
       todos superan la K por construcción y el contador no diría nada. */
    base_capacidad++;
    if (!rup.capacidad_ok) {
      if (!rescatada) rescatada = alcanzaConSocio(l);
      if (!rescatada) {
        if (!rup.dentro_de_tope) descartes.fuera_tope_estrategico++;
        else { descartes.fuera_capacidad_k++; no_superan_k++; }
        if (retenerNoViables) noViables.push({ fila: l, rup, motivo: rup.dentro_de_tope ? "K" : "Tope" });
        continue;
      }
      /* No supera la capacidad por sí sola, pero la alcanza con socio: no es un
         descarte, así que no puede contarse como tal — y tampoco como que la
         supera. Cuarto conjunto, para que la partición de `base_capacidad`
         siga sumando exactamente. */
      rescatadas_capacidad++;
    } else superan_k++;

    /* 5 · anticipo. 0 = «no declarado» (el dataset no trae la columna): pasa el
       filtro y puntúa 0. Solo se excluye el anticipo DECLARADO bajo el mínimo;
       excluir el 0 dejaría la app vacía para siempre. */
    /* Y si se pidió VER lo no viable, este descarte también se retiene: era el
       único de los tres que desaparecía del todo (15-sep-2026). Un anticipo
       declarado bajo es «no me conviene» —flujo de caja—, nunca «no me puedo
       presentar», y el castigo caía justo sobre los procesos que SÍ publicaron
       el dato: el que no declara nada (`anticipo_pct = 0`) pasa el filtro. */
    if (anticipoMin > 0 && l.anticipo_pct > 0 && l.anticipo_pct < anticipoMin) {
      descartes.fuera_anticipo++;
      if (retenerNoViables) noViables.push({ fila: l, rup, motivo: "Anticipo" });
      continue;
    }

    if (rescatada) conSocio.set(l, rescatada);
    visibles.push(l);
  }

  /* Una por obra, elegida ENTRE LAS QUE PASARON: si la vigente no pasó, se queda la
     otra. Lo fundido va a su casilla del embudo (descartes + visibles = corpus). Las
     no viables retenidas tampoco repiten obra: si una versión es visible, sus
     gemelas no vuelven atenuadas; si ninguna lo es, vuelve una sola. */
  const una = unaPorObra(visibles, versiones);
  descartes.fuera_misma_obra = una.fundidas;
  /* LAS OTRAS PUBLICACIONES DE LA OBRA, POR TARJETA (27-sep-2026): la fila que queda →
     las filas que la fusión apartó en su favor. Es lo que la tarjeta necesita para decir
     «esta obra tiene otra publicación» (su fase, su cierre, su código) y para reconocer
     como guardada una obra que el dueño guardó por su otra versión. Solo IDENTIFICA:
     no presta nada al juicio, a las puertas, a la probabilidad, al orden ni a los filtros. */
  const otrasVersiones = new Map();
  const anotar = (queda, apartada) => {
    if (!queda || !apartada || queda === apartada) return;
    const v = otrasVersiones.get(queda);
    if (v) v.push(apartada); else otrasVersiones.set(queda, [apartada]);
  };
  for (const [apartada, queda] of una.fundidaEn) anotar(queda, apartada);
  let noViablesUnicas = noViables;
  if (noViables.length && versiones.grupoDe.size) {
    const sinGemelaVisible = [];
    for (const n of noViables) {
      const g = versiones.grupoDe.get(n.fila);
      if (g != null && una.mejor && una.mejor.has(g)) anotar(una.mejor.get(g), n.fila); // su obra ya tiene tarjeta viable
      else sinGemelaVisible.push(n);
    }
    const unaNv = unaPorObra(sinGemelaVisible.map((n) => n.fila), versiones);
    for (const [apartada, queda] of unaNv.fundidaEn) anotar(queda, apartada);
    const quedan = new Set(unaNv.filas);
    noViablesUnicas = sinGemelaVisible.filter((n) => quedan.has(n.fila));
  }
  // solo los portafolios que la agrupación separó por objeto, y que siguen con más de una fila visible
  const portafoliosVisibles = new Map();
  for (const l of una.filas) {
    const p = String(l.id_del_portafolio || "").trim();
    if (p && versiones.conObjetosDistintos.has(p)) portafoliosVisibles.set(p, (portafoliosVisibles.get(p) || 0) + 1);
  }

  return {
    visibles: una.filas, veredictos, descartes, noViables: noViablesUnicas,
    /* Cuántas versiones de una misma obra se fundieron en otra (= descartes.fuera_misma_obra)
       y cuántos portafolios siguen con más de una fila visible porque sus objetos son
       distintos (lotes): no se funden. */
    misma_obra: {
      versiones_fundidas: una.fundidas,
      portafolios_con_objetos_distintos: [...portafoliosVisibles.values()].filter((n) => n > 1).length,
    },
    /* Para quien EXPLICA la lista (el rastreo y el embudo de /api/diagnostico): cada
       fila que pasó el juicio y se fundió → la fila que la enseña; y, para cualquier
       fila del corpus, la versión de su obra que la lista enseña (null si ninguna o
       si es ella misma). Leerlo de aquí evita una segunda regla de fusión. */
    fundidaEn: una.fundidaEn,
    // cada fila que la lista enseña → las otras publicaciones de su obra que la fusión apartó
    otrasVersiones,
    obraEnsenadaEn: (l) => {
      const g = versiones.grupoDe.get(l);
      const m = g == null ? null : una.mejor.get(g);
      return m && m !== l ? m : null;
    },
    // qué socio rescató cada fila que el dueño solo no alcanzaba (vacío si no hay socios)
    conSocio,
    capacidad: { base: base_capacidad, superan_k, no_superan_k, rescatadas_capacidad },
    opciones: { soloAbiertas, anticipoMin, incluirTextoDebil: opcionesObjeto.incluirTextoDebil, retenerNoViables, sinSocios: !!opciones.sinSocios },
  };
}

/* Las combinaciones posibles del dueño con sus socios. Se derivan UNA VEZ —no
   dependen de la fila— y se guardan colgadas del SELLO de la configuración de
   perfiles: subir un RUP cambia el sello y las vuelve a derivar. Los `require`
   van DIFERIDOS porque cerrarían un ciclo (perfiles → … → filtros). */
let _plurales = null, _selloPlurales = null;
function pluralesDeLaCascada(perfilId) {
  const { ID_DUENO, CANDIDATOS_CONSORCIO, fuentePerfiles } = require("./perfiles.js");
  if (perfilId !== ID_DUENO || !CANDIDATOS_CONSORCIO.length) return [];
  let sello = "respaldo";
  try { sello = String(fuentePerfiles().version || "respaldo"); } catch { /* sin Redis, el respaldo */ }
  if (_plurales && _selloPlurales === sello) return _plurales;
  const { pluralesDe } = require("./socio_por_proceso.js");
  _plurales = pluralesDe(perfilId, CANDIDATOS_CONSORCIO);
  _selloPlurales = sello;
  return _plurales;
}
function olvidarPluralesDeLaCascada() { _plurales = null; _selloPlurales = null; }

/* ---------- compatibilidad: helpers UNSPSC que otros módulos importaban ----------
   `unspscClasesDe` devolvía los códigos de 8 dígitos crudos; se mantiene sobre
   el tokenizador nuevo (sin códigos fabricados a partir de números largos). */
function unspscClasesDe(lic) { return codigosDeLicitacion(lic).codigos.map((c) => c.codigo); }

module.exports = {
  olvidarPluralesDeLaCascada,
  norm, // re-exportada desde lib/semantica: media app hace require("./filtros").norm
  TERMINOS_ESTRUCTURACION, // ídem: el panel la usa para no encabezar con una APP
  ESTADOS_ABIERTOS, ESTADOS_CERRADOS, ESTADOS_CERRADOS_EXACTOS, MANIFESTACION_INTERES_RE, estado_abierto, estado_cerrado, evaluacionDeFaseAnterior,
  cierre_vencido, OFFSET_COLOMBIA_MS,
  ANTICIPO_MIN_DEFAULT, DESCARTES_OBJETO, descartesVacios, filtrarProcesosVisibles,
  agruparVersionesDeObra, unaPorObra, mismoObjeto, compararVigencia, esPublica, fichaDeOtraVersion,
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
