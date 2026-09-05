/* public/glosario.js · Marca y glosario (Fase 7 · Detekta v4)
   ─────────────────────────────────────────────────────────────────────────────
   ÚNICA fuente de verdad del NOMBRE DEL PRODUCTO y de las traducciones de la
   jerga a lenguaje llano. `lib/glosario.js` re-exporta este mismo archivo para
   el servidor y el navegador lo carga como <script> ANTES que los módulos que
   lo consumen (xlsx.js, justificacion.js, app.js): no hay una copia «espejo»
   que pueda divergir (el patrón de `costos.js` y `apu_libro.js`).

   Regla de la Fase 7: NINGUNA cadena visible escribe el nombre a mano. Todas
   leen de `MARCA.nombre`. La única excepción, declarada y vigilada por la
   suite, son el `<title>` y las etiquetas <meta> de index.html —que el
   navegador y los rastreadores leen ANTES de que corra ningún script— y ahí la
   prueba exige que el literal sea EXACTAMENTE el que produce este módulo, para
   que los dos no puedan separarse.

   Qué NO cambia con la marca (renombrarlo rompería producción sin darle nada
   al usuario, ver docs/marca.md): el repositorio, la URL de producción, las
   claves de Redis, las variables de entorno, los nombres de archivos, funciones
   y endpoints, y las claves de almacenamiento del navegador (`detecta-acceso`,
   `detecta_perfil_rup`): cambiarlas cerraría la sesión de todos los usuarios y
   les borraría el perfil guardado. */
(function (raiz, fabrica) {
  const api = fabrica();
  if (typeof module === "object" && module.exports) module.exports = api;
  else raiz.Glosario = api;
  // En el navegador se estampa solo al cargar: el <script> va al final del
  // <body>, así que los nodos [data-marca] ya existen.
  if (typeof document !== "undefined") api.estampar(document);
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  const MARCA = Object.freeze({
    nombre: "Detekta",
    nombreLargo: "Detekta — inteligencia de licitaciones",
    lema: "Licitaciones de obra en Colombia",
    // Cambiar SOLO cuando se compre un dominio propio (docs/marca.md §4). La
    // aplicación no necesita ningún otro cambio de código.
    dominio: "portafolio-estrategico.vercel.app",
  });

  /* Título de la pestaña y descripción: los mismos literales que index.html
     lleva en <title> y <meta>. La suite compara los dos. */
  function titulo() { return `${MARCA.nombre} · ${MARCA.lema}`; }
  function descripcion() {
    return `${MARCA.nombreLargo}: a qué licitaciones de obra civil en Colombia puede presentarse, cuánto le cuesta ejecutarlas y a qué precio ofertar.`;
  }

  /* ─────────────── Glosario: concepto interno → lo que ve el usuario ───────
     Es la tabla del plan maestro (§8). `interno` es el término técnico que NO
     puede aparecer en pantalla; `visible` es lo que se escribe en su lugar. La
     traducción de las pantallas existentes es la Fase 6 (transversal); las
     fases 8-10 nacen leyendo de aquí. */
  const TERMINOS = Object.freeze({
    rup: { interno: "RUP", visible: "Su registro de proponente", corto: "Registro de proponente" },
    unspsc: { interno: "UNSPSC / clases", visible: "Lo que usted sabe hacer", corto: "Tipos de trabajo" },
    capacidad_contratacion: { interno: "Capacidad de contratación (K)", visible: "Cuánto puede facturar sin pasarse", corto: "Capacidad de facturar" },
    capacidad_residual: { interno: "Capacidad residual", visible: "Cuánto le queda disponible con sus contratos actuales" },
    baja_mercado: { interno: "Índice de baja de mercado", visible: "Cuánto suelen bajar el precio", corto: "Suelen bajar" },
    indice_competencia: { interno: "Índice de competencia", visible: "Qué tan peleada está", corto: "Competencia" },
    oferta_artificialmente_baja: { interno: "Oferta artificialmente baja", visible: "Precio tan bajo que le van a pedir explicaciones" },
    requisito_habilitante: { interno: "Requisito habilitante", visible: "Lo que le exigen para poder participar" },
    subsanable: { interno: "Subsanable", visible: "Se puede corregir después" },
    insubsanable: { interno: "Insubsanable", visible: "Si falla, queda por fuera de inmediato" },
    causal_o: { interno: "Causal O", visible: "Motivo de rechazo automático" },
    aiu: { interno: "AIU", visible: "Su administración, imprevistos y ganancia", corto: "Administración, imprevistos y ganancia" },
    apu: { interno: "APU", visible: "Cuánto le cuesta cada actividad" },
    smmlv: { interno: "SMMLV", visible: null, nota: "Convertir a pesos; la sigla no se muestra" },
    adenda: { interno: "Adenda", visible: "Cambio en las reglas del proceso" },
    estado_procedimiento: { interno: "Estado del procedimiento", visible: "En qué va el proceso" },
    manifestacion_interes: { interno: "Manifestación de interés", visible: "Avisar que le interesa" },
    /* Es el NOMBRE PROPIO de la modalidad: se conserva entero, como «Licitación
       pública» o «Mínima cuantía». El apodo «Proceso pequeño» se retiró en
       ago-2026 — lo confundía con la mínima cuantía y callaba lo único urgente. */
    seleccion_abreviada_menor_cuantia: { interno: "Selección abreviada de menor cuantía", visible: "Selección abreviada de menor cuantía · Manifestación de interés", corto: "Menor cuantía · avise antes" },
    modalidad: { interno: "Modalidad de contratación", visible: "Cómo lo adjudican" },
    cuantia: { interno: "Cuantía", visible: "Cuánto vale" },
    fecha_presentacion_ofertas: { interno: "Fecha de presentación de ofertas", visible: "Cuándo hay que entregar la oferta" },
    margen: { interno: "Margen", visible: "Cuánto le queda" },
    participacion_consorcio: { interno: "% de participación en consorcio", visible: "Qué parte pone cada uno" },
    dias_habiles: { interno: "Días hábiles", visible: "Días de oficina (sin fines de semana ni festivos)" },
    competitividad_media: { interno: "Competitividad: Media", visible: null, nota: "Prohibido solo — siempre con el requisito que la determina" },
  });

  /* Verbos en la voz del usuario (plan maestro §7): lo que dice el botón. */
  const VERBOS = Object.freeze({
    procesar: "Ver mis licitaciones",
    sincronizar: "Buscar nuevas",
    generar_apu: "Calcular cuánto me cuesta",
    exportar: "Descargar mi presupuesto",
    validar_propuesta: "Revisar antes de subir",
    aplicar_filtros: "Mostrar solo estas",
    manifestar_interes: "Avisar que me interesa",
    configurar_participacion: "¿Qué parte pone cada uno?",
  });

  /* Frase única para «no hay dato»: nunca cero, nunca vacío, nunca «N/A». */
  const SIN_REFERENCIA = "Sin referencia";
  function sinReferencia(motivo) {
    return motivo ? `${SIN_REFERENCIA} — ${motivo}` : SIN_REFERENCIA;
  }

  function traducir(clave) {
    const t = TERMINOS[clave];
    if (!t) throw new Error(`glosario: término desconocido «${clave}»`);
    return t.visible;
  }
  /* Forma CORTA para chips y cabeceras (cuando existe); si no, la visible. */
  function corto(clave) {
    const t = TERMINOS[clave];
    if (!t) throw new Error(`glosario: término desconocido «${clave}»`);
    return t.corto || t.visible;
  }

  /* Estampa la marca en el documento: cada nodo con `data-marca="nombre"` (o
     `nombreLargo`, `lema`) recibe el texto; el <title> se reafirma. Idempotente:
     llamarla dos veces deja lo mismo. Devuelve cuántos nodos tocó, para que la
     suite pueda ejecutarla contra un DOM mínimo. */
  function estampar(doc) {
    if (!doc || typeof doc.querySelectorAll !== "function") return 0;
    let n = 0;
    for (const el of doc.querySelectorAll("[data-marca]")) {
      const campo = el.getAttribute("data-marca");
      const valor = MARCA[campo];
      if (typeof valor !== "string") continue;
      if (el.textContent !== valor) el.textContent = valor;
      n++;
    }
    /* Fase 6 · los rótulos del glosario en el marcado estático: un nodo con
       data-glosario="clave" recibe la forma visible (o la corta con
       data-glosario-corto). Así el HTML no escribe la traducción a mano. */
    for (const el of doc.querySelectorAll("[data-glosario]")) {
      const clave = el.getAttribute("data-glosario");
      const t = TERMINOS[clave];
      if (!t) continue;
      const valor = el.hasAttribute("data-glosario-corto") ? (t.corto || t.visible) : t.visible;
      if (typeof valor !== "string") continue;
      if (el.textContent !== valor) el.textContent = valor;
      n++;
    }
    if ("title" in doc && doc.title !== titulo()) doc.title = titulo();
    return n;
  }

  /* ══════════ CÓMO SE CUENTA UN FALLO (5-sep-2026) ══════════
     Con la API caída la pantalla decía «No se pudo contactar el servidor:
     Failed to fetch.» y con un 500 en HTML, «El servidor respondió algo que no
     es JSON (500)». «JSON» y «fetch» son jerga de navegador: no dicen qué pasó
     ni qué hacer, y cada uno de los veintitrés sitios que interpolaban
     `e.message` decía lo suyo. Esta es la ÚNICA redacción de un fallo de la
     aplicación, y vive aquí —y no en app.js— porque los tres módulos del
     navegador que la necesitan (app.js, onboarding.js, pliego.js) son IIFE
     separados: una copia por módulo son tres textos «equivalentes hoy» que
     divergen a la primera corrección. glosario.js ya es el módulo del lenguaje
     de pantalla y se carga ANTES que los tres.

     NO cambia ninguna lógica: la distinción entre el MURO del edge (hay
     conexión y lo que falta es iniciar sesión) y la falta de conexión —la
     lección que este proyecto ha tenido que aprender cuatro veces— se conserva
     entera; lo que cambia son las palabras. El CÓDIGO de estado se conserva
     entre paréntesis: es el único dato del fallo que sirve para pedir ayuda.
     Acepta un Error, una Response o el cuerpo que devuelve `leerJson`. */
  const MSG_SIN_CONEXION = "Sin conexión con el servidor. Revise su red y vuelva a intentar.";
  const MSG_MURO = "El sitio pidió iniciar sesión (protección por contraseña). Inicie sesión y reintente.";
  function codigoDeFallo(e) {
    const st = Number(e && e.status);
    if (Number.isFinite(st) && st > 0) return st;
    const m = String((e && e.message) || "").match(/\((\d{3})\)|respondió (\d{3})/);
    return m ? Number(m[1] || m[2]) : null;
  }
  function fraseDeFallo(e) {
    const codigo = codigoDeFallo(e);
    if (codigo === 401 || codigo === 403) return MSG_MURO;
    const texto = String((e && e.message) || (typeof e === "string" ? e : "") || "");
    if (/iniciar sesión/i.test(texto)) return texto;   // el muro, ya redactado
    if (codigo) return `El servidor no respondió como se esperaba (código ${codigo}). Si acaba de iniciar sesión, vuelva a intentar.`;
    /* Sin código: o es el fallo de red del `fetch` (un TypeError cuyo texto
       escribe cada navegador en su idioma) o es un mensaje que YA viene
       redactado del servidor y se respeta tal cual. Un fallo sin texto no se
       rellena con un diagnóstico alegre: se dice lo único que se sabe. */
    if (!texto || e instanceof TypeError
      || /failed to fetch|networkerror|network request failed|load failed|conexi[óo]n/i.test(texto)) return MSG_SIN_CONEXION;
    return texto;
  }
  /* `contexto` es lo que se estaba intentando, en la voz del usuario y sin el
     «No se pudo» delante: mensajeDeFallo(e, "guardar el presupuesto"). */
  function mensajeDeFallo(e, contexto) {
    return contexto ? `No se pudo ${contexto}. ${fraseDeFallo(e)}` : fraseDeFallo(e);
  }

  return { MARCA, TERMINOS, VERBOS, SIN_REFERENCIA, sinReferencia, traducir, corto, titulo, descripcion, estampar,
    MSG_SIN_CONEXION, MSG_MURO, fraseDeFallo, mensajeDeFallo };
});
