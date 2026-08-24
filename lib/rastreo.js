/* ============================================================================
   lib/rastreo · «¿Por qué no está este proceso?»
   ----------------------------------------------------------------------------
   Nace del defecto de producción del 20-ago-2026: el ingeniero vio cuatro
   convocatorias de la UNIVERSIDAD PEDAGÓGICA NACIONAL en SECOP II y una sola
   en la app, y NO HABÍA FORMA DE AVERIGUAR POR QUÉ. El embudo de
   /api/diagnostico censa el corpus ya guardado, así que un proceso descartado
   en la INGESTA no figura en ninguna de sus cubetas; y la sincronización
   publicaba una cifra agregada sin motivos.

   Este módulo responde la pregunta EXACTA que hace quien echa algo en falta:
   se escribe la referencia (o parte del objeto, o el NIT de la entidad) y
   contesta en cuál de los cuatro sitios posibles murió:

     1. `servido`         está en el corpus y la app lo sirve a este perfil.
     2. `en_corpus`       está guardado, pero el JUICIO lo aparta — y se dice el
                          paso exacto y su explicación (la misma `evaluarRup`).
     3. `descartado_en_ingesta`  la cascada de ingesta lo tiró: se dice el
                          motivo, tomado del censo (lib/censo_ingesta).
     4. `no_consta`       ni guardado ni censado. Eso NO significa «no existe»:
                          significa que la app no lo ha LEÍDO de la fuente, y el
                          siguiente paso es una full — nunca se afirma que el
                          proceso no exista, porque este módulo no ha mirado
                          SECOP II, solo lo que la app tiene.

   Reglas que no hay que re-aprender:
   · NO reimplementa el juicio: llama a `evaluarRup`/`evaluarPuertas` que le
     INYECTAN. Un segundo juicio explicaría una decisión distinta de la tomada.
   · El censo guarda EJEMPLOS con tope, no el universo: si un proceso murió en
     la ingesta y no está entre los ejemplos, se dice `descartado_probablemente`
     con los motivos que SÍ dispararon — jamás se afirma un motivo que no
     conste. Distinguir «lo sé» de «es lo más probable» es la regla de la casa.
   · La búsqueda es por TEXTO NORMALIZADO sobre referencia, nombre, objeto,
     id y NIT. Sin acentos y sin distinguir mayúsculas, porque quien busca
     copia del portal.
   ========================================================================== */
"use strict";

const { norm } = require("./semantica.js");

const MAX_RESULTADOS = 20;

/* Las cubetas de descarte de `filtrarProcesosVisibles`, en lenguaje llano. Son
   nombres INTERNOS —«fuera_estado», «fuera_anti_suministro»— que ninguna
   pantalla puede enseñar tal cual, y sin traducirlos la herramienta responde el
   genérico «no pasa el juicio» al caso más frecuente de todos: que ya cerró. */
const MOTIVO_DE_CUBETA = Object.freeze({
  fuera_estado: "ya no admite ofertas: está cerrado, adjudicado o su fecha de cierre ya pasó",
  /* La MISMA cubeta con la otra causa: la fila se guardó marcada como cerrada
     aunque su estado vigente diga que sigue abierta. Ver `refinarEstado`. */
  fuera_estado_sellado: "la app lo tiene guardado como cerrado de una lectura anterior, pero su estado vigente dice que SIGUE ABIERTO. "
    + "Es el rezago que corrigió la carga completa de ago-2026: relance «Actualizar datos» (o una carga completa) y vuelva a consultar",
  fuera_modalidad: "su modalidad no abre concurso (contratación directa o similar), así que no hay a qué presentarse",
  fuera_convenio: "es un convenio entre entidades, no una licitación: no se compite por él",
  fuera_blacklist: "su objeto no es de obra civil",
  fuera_unspsc: "sus códigos de actividad no están en su registro de proponente y el objeto no confirma que sea obra",
  fuera_sin_unspsc_ni_obra: "no publica códigos de actividad y su objeto no dice que sea obra",
  fuera_objeto_generico: "el objeto publicado es solo el número del proceso, sin describir qué hay que hacer",
  fuera_no_pertinente: "su objeto no es obra pese a traer un código que sí lo parece",
  fuera_texto_debil: "sin códigos de su registro, el objeto no da evidencia suficiente de que sea obra",
  fuera_anti_suministro: "es una compra de bienes, no una obra",
  fuera_capacidad_k: "excede su capacidad de facturar",
  fuera_tope_estrategico: "supera el tope que usted mismo fijó para el tamaño de contrato",
  fuera_anticipo: "no cumple el mínimo de anticipo que pidió",
});

/* ═══ DÓNDE BUSCAR (encargo del ingeniero, 24-ago-2026) ═══
   «Es excelente idea pero necesito una forma de poder filtrar, no sé, por
   entidad, objeto contractual, nº de proceso, modalidad».

   La búsqueda libre YA miraba los cuatro campos, pero todos revueltos en un
   solo bloque: escribir «MOTAVITA» casaba también con un objeto que mencionara
   Motavita de pasada, y no había forma de acotar. `CAMPOS` da el ámbito.
   `todo` se conserva como defecto: quien no elige nada busca donde antes.

   Un ámbito desconocido cae a `todo`, JAMÁS a una lista vacía —que devolvería
   «no consta» sobre un proceso que sí está—: es la regla de `?zona=` y de
   `?tipo=zzz`, un valor que no se reconoce es INERTE. */
const CAMPOS = Object.freeze({
  todo: (r) => [r.referencia_del_proceso, r.nombre_del_procedimiento, r.descripci_n_del_procedimiento,
    r.entidad, r.nit_entidad, r.id_del_proceso, r[":id"]],
  entidad: (r) => [r.entidad, r.nit_entidad],
  objeto: (r) => [r.descripci_n_del_procedimiento, r.nombre_del_procedimiento],
  proceso: (r) => [r.referencia_del_proceso, r.id_del_proceso, r[":id"]],
});
const CAMPOS_FICHA = Object.freeze({
  todo: (f) => [f.referencia, f.id_proceso, f.entidad, f.objeto],
  entidad: (f) => [f.entidad],
  objeto: (f) => [f.objeto],
  proceso: (f) => [f.referencia, f.id_proceso],
});
const campoValido = (c) => (Object.prototype.hasOwnProperty.call(CAMPOS, String(c || "")) ? String(c) : "todo");

function textoBuscable(r, campo = "todo") {
  return norm((CAMPOS[campoValido(campo)](r) || []).filter(Boolean).join(" "));
}

function textoBuscableFicha(f, campo = "todo") {
  return norm((CAMPOS_FICHA[campoValido(campo)](f) || []).filter(Boolean).join(" "));
}

/* LA MODALIDAD SE RESUELVE CON LA REGLA QUE YA EXISTE, no con una segunda.
   `FiltrosLista.modalidadDe` es la que clasifica el listado y la que alimenta
   el selector de la hoja de filtros; escribir aquí otro emparejamiento de
   literales de SECOP II sería una tercera definición de «esta modalidad»
   —después de la del listado y la del pulso— y divergirían a la primera
   corrección. El require va DIFERIDO: `filtros_lista` arrastra `filtros`, que
   participa en dos ciclos que este repositorio resuelve con esa misma técnica,
   y `rastreo` es hoja. Si no se puede resolver, el filtro no se aplica y se
   DICE (nunca se descarta un proceso por no poder clasificarlo). */
/* ⚠️ `fuera_estado` DISPARA POR DOS CAUSAS DISTINTAS Y SOLO UNA ES «YA CERRÓ».
   La cascada exige `l.proceso_abierto && estado_abierto(l)`: el primero es un
   SELLO que puso la sincronización al guardar, el segundo se re-clasifica al
   servir. Cuando falla el sello pero el estado vigente dice ABIERTO, decir «ya
   no admite ofertas» es FALSO — y manda al usuario lejos de un proceso que
   todavía puede ganar. Es exactamente el rezago de la `fase` que el ingeniero
   vivió con las convocatorias de la UPN, así que la herramienta que existe para
   diagnosticar ausencias daría la respuesta equivocada justo en su caso.
   El require va DIFERIDO: `filtros` participa en dos ciclos que este
   repositorio resuelve con esa misma técnica, y `rastreo` es hoja. */
function refinarEstado(cubeta, fila) {
  if (cubeta !== "fuera_estado") return cubeta;
  try {
    const { estado_abierto } = require("./filtros.js");
    return estado_abierto(fila) ? "fuera_estado_sellado" : "fuera_estado";
  } catch { return cubeta; }        // sin poder resolverlo, el mensaje general
}

function modalidadDeFila(r) {
  try { return require("./filtros_lista.js").modalidadDe(r); } catch { return null; }
}

function fichaDeFila(r) {
  return {
    referencia: r.referencia_del_proceso || r.nombre_del_procedimiento || null,
    id_proceso: r.id_del_proceso || r[":id"] || null,
    entidad: r.entidad || null,
    modalidad: r.modalidad_de_contratacion || null,
    estado: r.estado_del_procedimiento || null,
    fase: r.fase || null,
    publicado: r.fecha_de_publicacion_del || null,
    cierre: r.fecha_cierre || null,
    cuantia_cop: r.cuantia_cop ?? null,
    objeto: r.descripci_n_del_procedimiento || null,
    url: r.urlproceso || null,
  };
}

/* `evaluar(fila)` → { rup, puertas, visible } lo inyecta quien llama (el
   handler ya tiene el perfil, el conocimiento y las opciones vigentes). */
/* `censos` = [{origen, censo}]. Son DOS —el de la full y el del delta— y hay
   que mirar los dos: un proceso que tiró la carga completa no tiene por qué
   estar en el censo del último delta, y quedarse con uno solo respondería
   «no consta» sobre un descarte que sí consta. `censo` suelto se admite por
   comodidad de las pruebas. */
function rastrear(consulta, { filas = [], censo = null, censos = null, evaluar = null, max = MAX_RESULTADOS, campo = "todo", modalidad = null } = {}) {
  const listaCensos = censos && censos.length ? censos : (censo ? [{ origen: null, censo }] : []);
  const q = norm(String(consulta || "")).trim();
  const dondeBuscar = campoValido(campo);
  if (q.length < 3) {
    return { ok: false, error: "escriba al menos 3 caracteres (referencia, entidad, NIT o parte del objeto)" };
  }
  /* Una modalidad que no se reconoce es INERTE, jamás un filtro que vacía la
     lista: quien pega un enlace guardado tiene que seguir obteniendo respuesta.
     Se declara en la salida para que la diferencia no sea silenciosa. */
  const modPedida = String(modalidad || "").trim() || null;
  const casaModalidad = (r) => {
    if (!modPedida) return true;
    const m = modalidadDeFila(r);
    return m == null ? true : m === modPedida;   // sin clasificar ⇒ no se descarta
  };

  /* ---- 1 y 2 · ¿está en el corpus? ---- */
  const casan = filas.filter((r) => textoBuscable(r, dondeBuscar).includes(q) && casaModalidad(r));
  const totalCorpus = casan.length;          // ANTES de recortar: es lo que se publica
  const enCorpus = casan.slice(0, max);
  const resultados = enCorpus.map((r) => {
    const ficha = fichaDeFila(r);
    if (!evaluar) return { ...ficha, donde: "en_corpus", explicacion: "está guardado; no se evaluó el juicio" };
    const v = evaluar(r);
    if (v && v.visible) {
      return { ...ficha, donde: "servido", explicacion: "la app lo sirve a este perfil" };
    }
    const rup = v && v.rup;
    const puertas = v && v.puertas;
    // el paso exacto en el que muere, con la MISMA explicación del juicio
    /* `evaluarRup` publica su explicación en `motivo` («UNSPSC fuera del RUP y
       el objeto no confirma que sea obra», «capacidad insuficiente»…). Se usa
       TAL CUAL: reescribirla aquí sería una segunda redacción de la misma
       decisión, y las dos divergirían. Si el objeto sí pasó y lo que falla es
       una puerta, se dice cuál — con el mensaje que la propia puerta publica. */
    /* ⚠️ EL MOTIVO MÁS FRECUENTE DE AUSENCIA SE RESPONDÍA CON EL GENÉRICO
       (24-ago-2026). Un proceso ya adjudicado o cerrado sale del listado por la
       cascada de ESTADO, no por el juicio del objeto: `evaluarRup` no publica
       `motivo` para eso y la respuesta acababa en «no pasa el juicio para este
       perfil», que además es FALSO —el objeto sí es suyo—. `filtrarProcesosVisibles`
       ya publica en qué cubeta murió (`descartes`) y se estaba tirando. Se
       traduce a lenguaje llano, y la traducción vive aquí porque las cubetas son
       nombres internos que ninguna pantalla puede enseñar. */
    let motivo = "no pasa el juicio para este perfil";
    const cubeta = refinarEstado(v && v.descarte, r);
    if (cubeta && MOTIVO_DE_CUBETA[cubeta]) motivo = MOTIVO_DE_CUBETA[cubeta];
    if (rup && rup.motivo) motivo = rup.motivo;
    if (puertas) {
      for (const [clave, etiqueta] of [["p1_rup", "registro de proponente"], ["p2_k", "capacidad de facturar"], ["p3_caja", "caja"]]) {
        const p = puertas[clave];
        if (p && p.pasa === false) { motivo = p.mensaje || `no pasa la puerta de ${etiqueta}`; break; }
      }
    }
    return {
      ...ficha, donde: "en_corpus", explicacion: motivo,
      tier: rup && rup.tier ? rup.tier : null,
      pertinencia: rup && rup.pertinencia ? rup.pertinencia.nivel : null,
    };
  });

  /* ---- 3 · ¿lo tiró la ingesta? ---- */
  const enCenso = [];
  const motivosVistos = new Set();
  for (const { origen, censo: c } of listaCensos) {
    if (!c || !c.ejemplos) continue;
    for (const [motivo, lista] of Object.entries(c.ejemplos)) {
      if (((c.por_motivo || {})[motivo] || 0) > 0) motivosVistos.add(motivo);
      for (const f of lista || []) {
        if (textoBuscableFicha(f, dondeBuscar).includes(q)) enCenso.push({ ...f, donde: "descartado_en_ingesta", motivo, origen });
      }
    }
  }

  /* El censo NO se recorta al recorrerlo (son ejemplos, ya vienen con tope),
     así que su total es su longitud; se nombra aparte para que la aritmética de
     `encontrados` se lea de un vistazo. */
  const totalCenso = enCenso.length;

  if (resultados.length || enCenso.length) {
    return {
      ok: true, buscado_en: dondeBuscar, modalidad_pedida: modPedida, consulta: String(consulta),
      /* ⚠️ `encontrados` SON LAS COINCIDENCIAS REALES, NO EL TAMAÑO DE PÁGINA
         (24-ago-2026). Decía `resultados.length + enCenso.length`, que ya venían
         recortados a `max`: con 120 filas que casaban respondía «encontrados:
         20». Una cifra que informa de sí misma en vez de del corpus es la
         familia de `total_procesos`/`procesos_contados`, y aquí es peor porque
         es la herramienta que existe para DIAGNOSTICAR: quien busca «MOTAVITA»
         y lee «20» no puede saber si son 20 o 300, y por eso pide filtros.
         `devueltos` dice cuántos se enseñan y `truncado` avisa de que hay más. */
      encontrados: totalCorpus + totalCenso,
      devueltos: resultados.length + Math.min(enCenso.length, max),
      truncado: (totalCorpus + totalCenso) > (resultados.length + Math.min(enCenso.length, max)),
      resultados: [...resultados, ...enCenso.slice(0, max)],
      // el censo guarda ejemplos con tope: lo que no está entre ellos no se
      // puede afirmar, y decirlo es parte de la respuesta
      nota_censo: listaCensos.length ? "los descartes de ingesta se buscan sobre los EJEMPLOS guardados, no sobre todo lo leído" : null,
    };
  }

  /* ---- 4 · no consta en ninguno de los dos sitios ---- */
  return {
    ok: true, buscado_en: dondeBuscar, modalidad_pedida: modPedida, consulta: String(consulta),
    encontrados: 0, devueltos: 0, truncado: false, resultados: [],
    donde: "no_consta",
    /* NO se afirma que el proceso no exista: este módulo no ha mirado SECOP II.
       Se afirma exactamente lo que se sabe —que la app no lo tiene— y se dice
       el siguiente paso. */
    /* ⚠️ SE ENUMERAN LAS CAUSAS, NO SE AFIRMA UNA (24-ago-2026). Decía «quiere
       decir que la app no lo ha leído todavía», y eso es FALSO para el caso más
       corriente: un proceso ya adjudicado sale del corpus ACTIVO —que es el
       único que mira esta búsqueda— y sigue guardado en el histórico, que
       ninguna purga toca. Afirmar «no lo ha leído» sobre algo que sí leyó es
       exactamente el error que esta herramienta existe para no cometer. */
    explicacion: "la app no lo tiene en el listado activo y tampoco figura entre los ejemplos de descarte de la ingesta. "
      + "Eso NO quiere decir que no exista en SECOP II. Puede ser: (a) que ya cerrara o se adjudicara —entonces salió "
      + "del listado activo y vive en el histórico, que esta búsqueda no mira—; (b) que la app todavía no lo haya "
      + "leído; o (c) que se descartara al leerlo y su ficha no quedara entre los ejemplos guardados.",
    siguiente_paso: "relanzar /api/procesos?op=sync&modo=full una vez y volver a consultar; "
      + "si sigue sin constar, mirar `censo_ingesta.por_motivo` para ver qué regla está tirando volumen.",
    motivos_activos_en_la_ingesta: [...motivosVistos],
  };
}

module.exports = { rastrear, fichaDeFila, textoBuscable, MAX_RESULTADOS };
