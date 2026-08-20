/* ============================================================================
   lib/censo_ingesta · Por qué NO entró un proceso al corpus
   ----------------------------------------------------------------------------
   EL PUNTO CIEGO QUE ESTE MÓDULO CIERRA (20-ago-2026, defecto de producción).
   El ingeniero reportó que la UNIVERSIDAD PEDAGÓGICA NACIONAL tenía cuatro
   convocatorias publicadas en SECOP II y la app enseñaba una. Al ir a mirar
   dónde habían muerto las otras tres, resultó que NO SE PODÍA MIRAR:

     · `/api/perfil?op=diagnostico` publica el EMBUDO, y el embudo censa el
       corpus YA GUARDADO. Un proceso descartado en la INGESTA no está en el
       corpus, así que no aparece en ninguna de sus cubetas: ni en `visibles`,
       ni en `fuera_unspsc`, ni en `fuera_sin_unspsc_ni_obra`. En ningún sitio.
     · La full publicaba UNA cifra agregada, `descartadas_prefiltro = leidas −
       guardadas`, sin un solo motivo. El delta no publicaba ni eso.

   O sea: la cascada de ingesta descartaba en silencio y la única herramienta de
   auditoría del proyecto era ciega justo donde hacía falta. Con eso, la
   pregunta del dueño —«¿está pasando con más procesos?»— no tenía respuesta
   posible, y una regla mal calibrada podía estar tirando miles de procesos sin
   que nadie se enterara nunca.

   Este módulo hace CONTABLE ese descarte: cada fila que la cascada tira se
   registra con su MOTIVO y, hasta un tope, con un ejemplo legible (referencia,
   entidad, objeto recortado). No cambia ni una decisión — solo mira.

   Reglas que no hay que re-aprender:
   · NO reimplementa ninguna regla. Los motivos los NOMBRA quien ya decidió
     (lib/proyeccion), y las sub-causas de `admisibleParaIngesta` se resuelven
     llamando a las MISMAS funciones de lib/filtros (`es_convenio`,
     `BLACKLIST_OBJETO`, `codigosDeLicitacion`). Una segunda cascada
     «equivalente hoy» divergiría a la primera corrección — la lección de
     `total_procesos`/`procesos_contados`, aquí aplicada a un diagnóstico: un
     censo que explica una decisión que no es la que se tomó es peor que
     ninguno.
   · Los ejemplos van con TOPE (`MAX_EJEMPLOS` por motivo) y con el objeto
     RECORTADO: el censo se guarda en Redis y un valor >1 MB no cabe.
   · Un motivo con 0 apariciones SE PUBLICA IGUAL (en cero). Que un motivo «no
     aparezca» y que «no descarte nada» son cosas distintas, y la primera se
     lee como la segunda — es el «sin dato vs cero» del proyecto aplicado a un
     contador.
   · Es HOJA salvo por `lib/filtros`, que se requiere DIFERIDO dentro de la
     función: `filtros` participa en dos ciclos que resuelve con esa misma
     técnica y pedirlo en tiempo de carga ataría este módulo a ese nudo.
   ========================================================================== */
"use strict";

const { BLACKLIST_OBJETO } = require("./semantica.js");
const { codigosDeLicitacion } = require("./unspsc.js");

/* Motivos, EN EL ORDEN DE LA CASCADA de lib/proyeccion.transformar. El orden
   importa: es el que hace legible el censo como un embudo. */
const MOTIVOS = [
  "modalidad_no_competitiva",   // no hay concurso abierto (directa, privada, régimen especial sin ofertas…)
  "estado_no_abierto",          // el estado declarado no dice que esté abierto
  "cierre_vencido",             // la fecha límite ya pasó (sub-caso del anterior, medido aparte)
  "convenio",                   // «aunar esfuerzos» / convenio interadministrativo
  "blacklist_objeto",           // objeto que ningún RUP de obra querría
  "unspsc_fuera_de_la_union",   // trae códigos y ninguno cae en las familias de los RUP
  "sin_unspsc_ni_obra",         // no trae código y el objeto no habla de obra
  "mes_fuera_de_ventana",       // se leyó y se aceptó, pero la fecha de publicación no cae en el año vigente
];

const MAX_EJEMPLOS = 5;
const MAX_OBJETO = 160;

function recortar(s, n) {
  const t = String(s == null ? "" : s).replace(/\s+/g, " ").trim();
  return t.length > n ? t.slice(0, n) + "…" : t;
}

/* Ficha mínima de una fila, para poder RECONOCER el proceso en pantalla sin
   guardar la fila entera. Nada de adjudicatarios ni valores adjudicados: el
   censo se publica en el diagnóstico y esas columnas no salen del histórico. */
function ficha(fila) {
  return {
    referencia: recortar(fila.referencia_del_proceso || fila.nombre_del_procedimiento || "", 60) || null,
    id_proceso: fila.id_del_proceso || fila[":id"] || null,
    entidad: recortar(fila.entidad, 80) || null,
    modalidad: recortar(fila.modalidad_de_contratacion || fila.tipo_de_proceso, 60) || null,
    estado: recortar(fila.estado_del_procedimiento, 40) || null,
    fase: recortar(fila.fase, 40) || null,
    publicado: fila.fecha_de_publicacion_del || null,
    objeto: recortar(fila.descripci_n_del_procedimiento, MAX_OBJETO) || null,
  };
}

/* Sub-causa de un `admisibleParaIngesta` en falso. Llama a las MISMAS funciones
   que decidieron, en el MISMO orden: no es una segunda cascada. */
function motivoNoAdmisible(fila) {
  // cada regla se pide a SU dueño: `es_convenio` es de lib/filtros (require
  // DIFERIDO por el nudo de ciclos que ese módulo resuelve así), mientras que
  // la blacklist vive en lib/semantica y los códigos en lib/unspsc — las dos
  // son HOJAS del grafo y se importan arriba. Copiarlas aquí sería una segunda
  // definición de las mismas reglas.
  const { es_convenio } = require("./filtros.js");
  if (es_convenio(fila)) return "convenio";
  const texto = `${fila.nombre_del_procedimiento || ""} ${fila.descripci_n_del_procedimiento || ""}`;
  if (BLACKLIST_OBJETO.test(texto)) return "blacklist_objeto";
  const { codigos } = codigosDeLicitacion(fila);
  return codigos.length ? "unspsc_fuera_de_la_union" : "sin_unspsc_ni_obra";
}

/* Sub-causa de un `estado_abierto` en falso: distinguir «el reloj lo cerró» de
   «el estado declarado no dice que esté abierto» es lo que permite saber si una
   ausencia es normal (cerró) o sospechosa (sigue publicado en SECOP II). */
function motivoNoAbierto(fila, ahoraMs) {
  const { cierre_vencido } = require("./filtros.js");
  return cierre_vencido(fila, ahoraMs) ? "cierre_vencido" : "estado_no_abierto";
}

function crearCenso({ maxEjemplos = MAX_EJEMPLOS } = {}) {
  const cuenta = Object.fromEntries(MOTIVOS.map((m) => [m, 0]));
  const ejemplos = Object.fromEntries(MOTIVOS.map((m) => [m, []]));
  let leidas = 0, aceptadas = 0;

  function registrar(motivo, fila) {
    if (!Object.prototype.hasOwnProperty.call(cuenta, motivo)) return; // motivo desconocido: no se inventa una cubeta
    cuenta[motivo]++;
    if (ejemplos[motivo].length < maxEjemplos) ejemplos[motivo].push(ficha(fila));
  }

  return {
    leida() { leidas++; },
    aceptada() { aceptadas++; },
    registrar,
    /* Para un descarte POSTERIOR a la cascada: la fila ya se había contado como
       aceptada y hay que devolverla a la cubeta de descartes, o la invariante
       `leidas = aceptadas + descartadas` dejaría de cuadrar y con ella se
       perdería la única señal de que a algún `continue` le falta su registro.
       El caso real es `mes_fuera_de_ventana` en el delta (lib/handlers/
       procesos/sync): la fila pasa la cascada y aun así no se escribe. */
    reclasificar(motivo, fila) {
      if (!Object.prototype.hasOwnProperty.call(cuenta, motivo)) return;
      if (aceptadas > 0) aceptadas--;
      registrar(motivo, fila);
    },
    motivoNoAdmisible,
    motivoNoAbierto,
    resumen() {
      const descartadas = MOTIVOS.reduce((a, m) => a + cuenta[m], 0);
      return {
        leidas, aceptadas, descartadas,
        // INVARIANTE: nada se pierde entre las cubetas. Si dejara de cumplirse,
        // habría un `continue` sin registrar y volveríamos al punto ciego.
        cuadra: leidas === aceptadas + descartadas,
        por_motivo: { ...cuenta },
        ejemplos: Object.fromEntries(MOTIVOS.map((m) => [m, ejemplos[m]])),
      };
    },
  };
}

/* Fusión de dos resúmenes (la full corre en varias invocaciones y el delta
   escribe en cada visita: el censo publicado es el acumulado de la corrida). */
function fusionar(a, b) {
  if (!a) return b || null;
  if (!b) return a;
  const por_motivo = {}, ejemplos = {};
  for (const m of MOTIVOS) {
    por_motivo[m] = ((a.por_motivo || {})[m] || 0) + ((b.por_motivo || {})[m] || 0);
    ejemplos[m] = [...(((a.ejemplos || {})[m]) || []), ...(((b.ejemplos || {})[m]) || [])].slice(0, MAX_EJEMPLOS);
  }
  const leidas = (a.leidas || 0) + (b.leidas || 0);
  const aceptadas = (a.aceptadas || 0) + (b.aceptadas || 0);
  const descartadas = MOTIVOS.reduce((s, m) => s + por_motivo[m], 0);
  return { leidas, aceptadas, descartadas, cuadra: leidas === aceptadas + descartadas, por_motivo, ejemplos };
}

module.exports = { MOTIVOS, MAX_EJEMPLOS, crearCenso, fusionar, ficha, motivoNoAdmisible, motivoNoAbierto };
