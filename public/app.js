/* ============================================================================
   Detekta · Frontend unificado (una página, tres pestañas)
   ----------------------------------------------------------------------------
   ago 2026: index.html es la ÚNICA página. Este archivo consolida los tres
   módulos que antes vivían en páginas separadas — el tablero de oportunidades
   (app.js), el editor de APU (apu.js) y la administración (admin.js) — en un
   solo IIFE con tres pestañas. pliego.js y onboarding.js siguen siendo archivos
   propios (los cargan <script> de index.html) porque sus funciones están atadas
   por pruebas que las extraen por archivo.

   EL TOKEN VA INTEGRADO (decisión del dueño, ago 2026). `TOKEN` se inyecta en
   la cabecera `x-historico-token` de TODA llamada a la API y el usuario no ve
   ningún formulario de token. No es un secreto: la capa de seguridad real del
   despliegue es Vercel Password Protection, y el token queda como llave del
   servidor (las APIs NO se relajaron). Rotarlo = cambiar HISTORICO_TOKEN en
   Vercel y esta constante a la vez. Si no coinciden, la lista degrada a la
   vista pública (cifras redactadas) y los paneles lo dicen con esas palabras.

   Las lecciones caras siguen vigentes y las pruebas las vigilan aquí:
   · el arranque automático va AL FINAL del IIFE (zona muerta temporal);
   · ningún `|| 0` sobre una cifra del servidor;
   · el parseo del JSON va APARTE del fetch (el muro del edge responde HTML);
   · ninguna pulsación se queda sin respuesta visible.
   ========================================================================== */
"use strict";

(() => {
  const CLAVE = "231105";
  const MAX_INTENTOS_CLAVE = 3;
  const REINTENTO_SYNC_SEG = 20;   // espera entre reintentos tras un 503
  const MAX_REINTENTOS_SYNC = 30;  // ~10 min: suficiente para la carga inicial
  // encadenado de la sincronización (pestaña admin)
  const ESPERA_ENTRE_TANDAS_MS = 3000;   // {done:false} → siguiente tanda
  const ESPERA_CANDADO_MS = 10000;       // {enCurso:true} → otra tanda corre
  const BACKOFF_MS = [5000, 10000, 20000]; // red/5xx: 3 reintentos crecientes

  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  /* Solo http/https. `esc()` impide salir del atributo pero NO valida el
     ESQUEMA, y `urlproceso` y las URL de las fuentes externas las escribe un
     tercero: un `javascript:…` ahí sería un XSS de un clic en el origen de la
     aplicación, donde viven la sesión y el perfil guardado. Sin esquema válido
     no se pinta el enlace: la ausencia no se rellena. (La misma función vive en
     public/portada.js, que es un módulo independiente; la prueba las EXTRAE del
     fuente y ejecuta las dos sobre la misma batería de 16 casos, como las de
     `numeroLocal` y `parsearCsv` — comparar los textos no serviría.) */
  const urlSegura = (u) => (/^https?:\/\//i.test(String(u ?? "").trim()) ? String(u).trim() : null);
  /* EL MURO DEL EDGE NO ES «SIN CONEXIÓN» (ago 2026). Vercel Password
     Protection responde HTML, así que `r.json()` LANZA; con el parseo dentro
     del MISMO try del fetch, el catch se llevaba el control, la comprobación
     del 401 no se alcanzaba nunca y trece sitios decían «no se pudo contactar
     el servidor» — lo contrario de la verdad: hay conexión y lo que falta es
     iniciar sesión. Esta función NUNCA lanza: devuelve el JSON o un cuerpo con
     el motivo REAL, y el flujo de error de cada sitio lo pinta tal cual.
     (La regla ya estaba escrita en el proyecto y se cumplía en 5 de 18 sitios.) */
  const leerJson = async (r) => {
    try { return await r.json(); } catch {
      /* La REDACCIÓN sale de `fraseDeFallo` (una sola en toda la aplicación);
         aquí solo se decide QUÉ pasó. `status` viaja en el cuerpo para que
         quien lo reciba pueda volver a redactarlo sin adivinar el código. */
      return { ok: false, sinJson: true, status: r.status, error: fraseDeFallo({ status: r.status }) };
    }
  };
  /* UN 401 TIENE DOS CAUSAS Y SE DISTINGUEN POR EL CUERPO (ago 2026). El de la
     API significa que `HISTORICO_TOKEN` no coincide con el token integrado; el
     del EDGE (Vercel Password Protection) significa que hay que iniciar sesión,
     y responde HTML. Los sitios que miraban `r.status === 401` antes de mirar
     el cuerpo enseñaban el mensaje del token sobre el muro del edge: un
     diagnóstico tan falso como el «sin conexión» que se acaba de quitar, solo
     que distinto. `sinJson` lo marca `leerJson` y esta función es el único
     punto donde se decide cuál de los dos mensajes toca. */
  const msg401 = (cuerpo) => (cuerpo && cuerpo.sinJson ? cuerpo.error : MSG_401);
  /* ══════════ UN FALLO SE CUENTA EN CASTELLANO (5-sep-2026) ══════════
     La REDACCIÓN vive en public/glosario.js (`Glosario.mensajeDeFallo`), que es
     el módulo del lenguaje de pantalla y se carga ANTES que este: app.js,
     onboarding.js y pliego.js son IIFE separados y una copia por módulo serían
     tres textos «equivalentes hoy» que divergen a la primera corrección. Aquí
     solo quedan los dos atajos, con la búsqueda DIFERIDA (no al cargar) para
     que un glosario que no llegue no mate el módulo entero. */
  const fraseDeFallo = (e) => window.Glosario.fraseDeFallo(e);
  const mensajeDeFallo = (e, contexto) => window.Glosario.mensajeDeFallo(e, contexto);
  // el error del servidor CON su «qué hacer», en una frase (6-sep-2026, V-B2a-02)
  const errorDelServidor = (cuerpo) => window.Glosario.errorDelServidor(cuerpo);
  const fmtCOP = new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 });
  const fmtNum = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 1 });
  const fmt = new Intl.NumberFormat("es-CO");
  const fmt1 = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 1 });
  const nf = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 0 });
  const nf2 = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 2 });
  /* `pesos`/`num` reciben `null` cuando el servidor no tiene el dato y pintan
     «—». Es justo lo contrario de un `|| 0`: no inventan un cero creíble. */
  const pesos = (n) => (Number.isFinite(n) ? `$${nf.format(n)}` : "—");
  const num = (n) => (Number.isFinite(n) ? nf2.format(n) : "—");

  /* ══════════ Token integrado ══════════
     `tokenRechazado`: si el despliegue rechaza el token integrado (su
     HISTORICO_TOKEN es otro), la lista pública DEGRADA a la vista sin cifras en
     vez de entrar en bucle de 401 — el mismo contrato que tenía un token
     caducado guardado en la pestaña. */
  const TOKEN = "MiExtraccion2025";
  /* El 401 se explica como lo que ES —la clave interna del sitio no coincide
     con la del despliegue—, jamás como «token inválido, escriba otro»: no
     existe ningún formulario donde escribirlo. Pero se dice PRIMERO en
     lenguaje de personas: el usuario no puede arreglarlo y tiene que saber
     que no es culpa suya; el paréntesis es para quien administra. */
  const MSG_401 = "La aplicación no pudo autenticarse con el servidor. No es un problema suyo: es configuración "
    + "del sitio — avise a quien lo administra (HISTORICO_TOKEN no coincide con el token integrado).";
  let tokenRechazado = false;
  const tokenGuardado = () => (tokenRechazado ? "" : TOKEN);
  const leerToken = () => TOKEN;
  function olvidarToken() { tokenRechazado = true; }
  /* Las TRES llamadas del navegador a op=sync —el refresco tras la lista, la
     espera de la primera carga y el panel «Actualizar datos»— van con la misma
     llave que la lista (6-sep-2026, M-SEG-08): con CRON_SECRET en el
     despliegue, un sync sin llave responde 401. Una sola función: tres copias
     divergen a la primera corrección. */
  function opcionesSync(extra) {
    const headers = { ...(extra || {}) };
    const t = tokenGuardado();
    if (t) headers["x-historico-token"] = t;
    return Object.keys(headers).length ? { headers } : undefined;
  }

  /* ══════════ Gate (una sola copia para toda la página) ══════════ */
  let intentosClave = 0;
  /* abrirApp NO escribe `detecta-acceso`: esa marca significa «pasó el gate»
     y la pone el propio gate al validar la clave. */
  function abrirApp() {
    const onboarding = document.getElementById("onboarding");
    if (onboarding) onboarding.classList.add("hidden");
    const gate = $("gate");
    if (gate) gate.remove();
    $("app").classList.remove("hidden");
    let hash = "";
    try { hash = (location.hash.match(/^#\/([a-z-]+)/) || [])[1] || ""; } catch { hash = ""; }
    /* Sin hash se abre MI EMPRESA (la pestaña principal desde ago 2026): las
       cifras de esta empresa antes que la lista. Un enlace con filtros de la
       Fase 8 (`?cierre=7d`, `?dep=73`) es un enlace A LA LISTA y abre
       Licitaciones aunque no traiga hash — la puerta de entrada y la portada
       los generan así. */
    let conFiltros = false;
    try { conFiltros = [...new URLSearchParams(location.search).keys()].some((k) => k !== "perfil"); } catch { conFiltros = false; }
    activarPestana(hash || (conFiltros ? "licitaciones" : "admin"), { empujarHash: false });
    buscar();
    refrescarPulso();
    // los procesos guardados: un GET pequeño; pinta «Guardado ✓» en la lista y la sección de Mi empresa
    cargarSeguimiento();
  }
  /* ══════════ El PULSO personalizado (ago 2026) ══════════
     Nada más entrar, arriba de la lista: las cifras DE ESTE PERFIL (cuántas,
     cuánto dinero, cuántas cierran esta semana, dónde, quién). Lo pinta
     public/pulso.js con /api/perfil?op=pulso; aquí solo se decide CUÁNDO
     (al abrir la app y al cambiar de perfil) y se cablean sus enlaces para
     que filtren la lista EN LA MISMA PÁGINA en vez de recargarla. El mercado
     entero (la portada de la Fase 9) queda plegado debajo y se pide la
     primera vez que alguien lo abre: nadie paga por lo que no mira. */
  /* «Consorcio 1» se enseña tal cual; un nombre propio va con el prefijo. Sin
     nombre, el id (recortado): jamás «Consorcio · Consorcio 1». */
  function etiquetaConsorcio(nombre, id) {
    const n = String(nombre || "").trim();
    if (/^consorcio\b/i.test(n)) return n;
    return `Consorcio · ${n || String(id || "").slice(0, 12)}`;
  }
  /* ══════════ EL CORTE DE LOS DATOS, EN LA MARCA (31-ago-2026) ══════════
     La segunda línea del botón de la barra superior. Dice QUÉ hay («datos de
     hoy, 8:35 p. m.») y QUÉ pasa si se pulsa («Actualizar», en color de
     acento): sin las dos mitades, un logotipo pulsable es una adivinanza.

     LA FECHA LA FORMATEA `Portada.textoActualizado`, que ya existía y ya está
     probada con el «ahora» inyectado — dos cuentas del mismo corte discreparían
     entre la barra y la portada justo en la frontera de medianoche, que es
     donde este proyecto ya se quemó una vez. Aquí no se compara ni una fecha.

     `null` es un estado legítimo y NO se disfraza: sin corte conocido la línea
     invita a pulsar y no inventa una hora. */
  let corteActual = null;
  /* ⚠️ LA BANDERA SE DECLARA AQUÍ, NO JUNTO A SU USO (regla dura del proyecto).
     `botones()` la lee y vive 5 000 líneas más abajo; con la `let` declarada
     allí, cualquier llamada anterior a `botones` moriría en la zona muerta
     temporal — y ese fallo es MUDO. Es la misma lección que puso el arranque
     automático al final del IIFE. */
  let marcaEsperandoCorte = false;
  /* `ultimoError` viaja con `sincronizado` en el listado (6-sep-2026, M-INF-04):
     es el último intento de sincronizar que FALLÓ (sync.js lo escribe y la
     siguiente corrida buena lo borra). Con él la barra dice el HECHO —«hoy no
     se pudo actualizar; se reintenta con cada visita»— en vez de un ámbar que
     no distingue «el cron aún no corrió» de «lleva días fallando». Si el fallo
     es de otro día se dice sin «hoy»; la fecha la juzga `Portada.desactualizado`,
     el mismo reloj del corte. La clase ámbar y «Actualizar» se conservan. */
  function pintarCorte(iso, ultimoError, opciones = {}) {
    const s = document.getElementById("sello-sync");
    if (!s) return;
    if (iso) corteActual = iso;
    const b = document.getElementById("btn-marca");
    /* para el visitante la marca no es un control (6-sep-2026, M-SEG-02): ni
       «pulse aquí», ni «Actualizar»; solo el hecho: de cuándo son los datos */
    const informativa = !!(b && b.classList.contains("marca-informativa"));
    const P = window.Portada;
    const cuando = iso && P ? P.textoActualizado(iso, Date.now(), { corto: true }) : null;
    const fallo = ultimoError && ultimoError.ts && P
      ? (P.desactualizado(ultimoError.ts, Date.now()) ? "la última actualización no se pudo hacer" : "hoy no se pudo actualizar")
      : null;
    /* `falloAhora` (6-sep-2026, V-B3a-03): la pulsación desde la marca que acaba
       de terminar en error dice SU resultado y qué hacer, no la línea de antes
       del clic (que ya decía «hoy no se pudo actualizar» por el fallo del cron y
       dejaba la pulsación sin respuesta visible). Manda sobre `ultimoError`. */
    const ahora = opciones && opciones.falloAhora ? `no se pudo actualizar ahora: ${String(opciones.falloAhora)}` : null;
    const accion = informativa ? "" : ' · <span class="marca-accion">Actualizar</span>';
    s.innerHTML = cuando
      ? `Datos de ${esc(cuando)}${ahora ? ` · ${esc(ahora)}` : fallo ? ` · ${fallo}; se reintenta con cada visita` : ""}${accion}`
      : ahora ? `${esc(ahora[0].toUpperCase() + ahora.slice(1))}${accion}`
        : (informativa ? "Datos de SECOP II" : '<span class="marca-accion">Pulse aquí para traer lo último de SECOP II</span>');
    s.classList.toggle("corte-viejo", !!(ahora || fallo || (iso && P && P.desactualizado(iso, Date.now()))));
    // en el teléfono el corte va en una línea recortada; con fallo envuelve para que se LEA entero
    s.classList.toggle("corte-fallo", !!((fallo || ahora) && cuando));
    s.classList.remove("hidden");
    if (b) {
      const largo = iso && P ? P.textoActualizado(iso, Date.now()) : "Todavía no consta cuándo se trajeron los datos";
      const aviso = ahora ? ` ${ahora[0].toUpperCase()}${ahora.slice(1)}.` : fallo ? ` ${fallo[0].toUpperCase()}${fallo.slice(1)}; se reintenta con cada visita.` : "";
      b.title = informativa ? `${largo}.${aviso}` : `${largo}.${aviso} Pulse para traer de SECOP II lo publicado desde entonces.`;
      b.setAttribute("aria-label", informativa ? `${largo}.${aviso}` : `${largo}.${aviso} Actualizar los datos de SECOP II.`);
    }
  }
  /* Mientras corre, la marca ES el indicador: quien pulsa desde otra pestaña no
     ve el panel de «Actualizar datos», que vive en Mi empresa. Una pulsación sin
     respuesta visible es peor que un error. */
  function marcaTrabajando(texto) {
    const s = document.getElementById("sello-sync");
    if (s) { s.textContent = texto; s.classList.remove("corte-viejo"); }
  }
  function refrescarPulso(opciones = {}) {
    if (!window.Pulso) return;
    const sel = $("f-perfil");
    const perfil = sel ? sel.value : "";
    const nombre = sel && sel.selectedOptions[0] ? sel.selectedOptions[0].text.replace(/^Consorcio · /, "") : "";
    // con el token viajan las cifras del perfil (patrimonio, capacidad) para «Tu registro»
    const t = tokenGuardado();
    window.Pulso.arrancar(perfil, { nombre, headers: t ? { "x-historico-token": t } : null, forzar: !!opciones.forzar }).catch(() => {});
  }
  document.getElementById("pulso").addEventListener("click", (ev) => {
    const el = ev.target.closest("[data-filtro]");
    if (!el) return;
    ev.preventDefault();
    aplicarFiltroDelPulso(el.getAttribute("data-filtro"));
  });
  document.getElementById("pulso").addEventListener("keydown", (ev) => {
    if (ev.key !== "Enter" && ev.key !== " ") return;
    const el = ev.target.closest("[data-filtro]");
    if (!el) return;
    ev.preventDefault();
    aplicarFiltroDelPulso(el.getAttribute("data-filtro"));
  });
  function aplicarFiltroDelPulso(filtro) {
    /* el atributo es una QUERY de la Fase 8 («cierre=7d», «dep=TOLIMA»,
       «min=0&max=50000000», «entidad=899999081»; «todo» = sin filtros): la
       lee el MISMO `leerEstado` que lee la URL, así una barra del gráfico y un
       enlace pegado en Chrome significan exactamente lo mismo */
    const params = new URLSearchParams(String(filtro || "") === "todo" ? "" : String(filtro || ""));
    cambiarFiltros(window.Filtros.leerEstado(params));
    /* el pulso vive en Mi empresa y la lista en Licitaciones: la cifra LLEVA a la
       lista. Si hubo cambio de pestaña, basta el `scrollTo(0)` de activarPestana:
       la lista empieza bajo la barra; un scrollIntoView SUAVE encima de la
       animación de entrada del panel se pisaba con él y se veía como un salto. */
    const cambia = !!$("tab-licitaciones").classList.contains("hidden");
    activarPestana("licitaciones");
    if (cambia) return;
    const lista = $("lista");
    if (lista && lista.scrollIntoView) lista.scrollIntoView({ behavior: "smooth", block: "start" });
  }
  /* El pliegue «El mercado completo hoy» se retiró de Mi empresa (encargo del
     ingeniero): el agregado nacional no responde «¿a qué me presento YO hoy?».
     `Portada.teaser()` sigue vivo para las tres cifras de la landing. */
  /* EL BLOQUEO TAMBIÉN TIENE SALIDA (5-sep-2026). Decía «Acceso denegado / Este
     sitio es privado.» y ahí terminaba: sin instrucción y sin vuelta, solo
     recargar devolvía la portada. El bloqueo en sí y MAX_INTENTOS_CLAVE no
     cambian (son la seguridad); lo que se añade es qué hacer y por dónde. El
     enlace conserva el id #gate-volver: el oyente vive en #gate (onboarding.js)
     y sobrevive a este reemplazo. */
  function bloquear() {
    $("gate").innerHTML =
      '<div class="text-center"><p class="text-2xl font-semibold">Acceso denegado</p>' +
      '<p class="mt-2 text-sm text-gray-500">Este sitio es privado.</p>' +
      '<p class="mt-4 text-sm text-gray-500">Vuelva al inicio y suba su RUP o escriba tres datos.</p>' +
      '<p class="mt-4 text-sm"><a href="#" id="gate-volver" class="underline">Volver al inicio</a></p></div>';
  }
  $("gate-form").addEventListener("submit", (e) => {
    e.preventDefault();
    if ($("gate-clave").value === CLAVE) {
      // sessionStorage puede lanzar en modo restringido: la clave correcta
      // tiene que abrir la app igual, solo que sin recordar la sesión
      try { sessionStorage.setItem("detecta-acceso", "1"); } catch { /* sesión no recordada */ }
      return abrirApp();
    }
    intentosClave++;
    if (intentosClave >= MAX_INTENTOS_CLAVE) return bloquear();
    const err = $("gate-error");
    err.textContent = `Acceso denegado (${MAX_INTENTOS_CLAVE - intentosClave} intento${MAX_INTENTOS_CLAVE - intentosClave === 1 ? "" : "s"} restante${MAX_INTENTOS_CLAVE - intentosClave === 1 ? "" : "s"}).`;
    err.classList.remove("hidden");
    $("gate-clave").value = "";
    $("gate-clave").focus();
  });

  /* ══════════ Pestañas ══════════
     Tres secciones, una página. La pestaña viva se refleja en la URL (#/apu)
     para que recargar conserve el sitio; en móvil los mismos botones son la
     barra inferior (data-tab compartido). Cada pestaña arranca lo suyo la
     PRIMERA vez que se abre: abrir la app no dispara el panel de admin ni la
     carga del catálogo de APU si nadie los mira. */
  const PESTANAS = ["licitaciones", "seguimiento", "apu", "admin"];
  /* Alias legibles en la URL: la pestaña principal se llama «Mi empresa» y su
     panel sigue siendo #tab-admin (renombrar ids mataría media suite);
     «Mis procesos» es #tab-seguimiento (#/mis-procesos). */
  const ALIAS_PESTANA = { empresa: "admin", "mi-empresa": "admin", precios: "apu", "mis-procesos": "seguimiento", procesos: "seguimiento" };
  const arrancadas = { apu: false, admin: false, pliego: false, seguimiento: false };
  function activarPestana(nombre, { empujarHash = true } = {}) {
    const pedido = ALIAS_PESTANA[nombre] || nombre;
    const destino = PESTANAS.includes(pedido) ? pedido : "admin";
    for (const p of PESTANAS) {
      const seccion = $(`tab-${p}`);
      if (seccion) seccion.classList.toggle("hidden", p !== destino);
    }
    document.querySelectorAll("[data-tab]").forEach((b) => {
      const suya = b.getAttribute("data-tab") === destino;
      b.classList.toggle("activa", suya);
      /* `aria-selected` SOLO donde hay `role="tab"` (5-sep-2026): los ocho
         botones de las dos barras. `[data-tab]` también caza atajos que
         NAVEGAN a una pestaña sin ser una («Ir a Licitaciones» del vacío de
         Mis procesos), y marcarlos como pestaña seleccionada le mentiría al
         lector de pantalla. */
      if (b.getAttribute("role") === "tab") {
        b.setAttribute("aria-selected", suya ? "true" : "false");
        /* FOCO MÓVIL (5-sep-2026): en un control de pestañas el tabulador entra
           UNA vez —a la pestaña abierta— y dentro se mueve con las flechas. Sin
           esto, el tabulador recorría los OCHO botones de las dos barras y las
           flechas no hacían nada: se anunciaba «pestaña, 1 de 4» y el control no
           respondía como tal, que es peor que no anunciar nada. */
        b.tabIndex = suya ? 0 : -1;
      }
    });
    moverIndicadorPestanas();
    if (empujarHash) { try { history.replaceState(null, "", `#/${destino}`); } catch { /* entorno raro */ } }
    /* En CADA apertura posterior de Precios el perfil del borrador se vuelve a
       tomar de la barra (6-sep-2026, V-B2a-01): la barra cambia por código en
       más sitios que el evento `change` (guardar o borrar un consorcio, el
       arranque por URL) y un camino olvidado guardaba el borrador bajo «helder»
       con la barra en el consorcio. La primera apertura lo hace `arrancar()`,
       que además precarga el perfil de la tarjeta. */
    if (destino === "apu" && !arrancadas.apu) { arrancadas.apu = true; arrancar(); }
    else if (destino === "apu") sincronizarPerfilBorrador();
    if (destino === "apu" && !arrancadas.pliego && typeof window.__pliegoArrancar === "function") {
      arrancadas.pliego = true;
      window.__pliegoArrancar();
    }
    if (destino === "admin" && !arrancadas.admin) { arrancadas.admin = true; arrancarPaneles(); }
    /* Mis procesos: se pide FRESCO cada vez que se abre la pestaña (los cambios
       y las alertas dependen del corpus vivo y son baratos: un GET) */
    if (destino === "seguimiento") { arrancadas.seguimiento = true; cargarSeguimiento({ forzar: true }); }
    try { window.scrollTo({ top: 0 }); } catch { /* sin scroll */ }
  }
  /* ══════ LA PASTILLA QUE SE DESLIZA (piel v3, 4-sep-2026) ══════
     El control segmentado de escritorio dibuja la pestaña activa con un
     ::before del carril (.pestanas) que viaja de una sección a otra, como el
     indicador de Radix/iOS. Aquí solo se MIDE: dónde está la activa y cuánto
     mide, y se escribe en dos variables CSS; la curva y la duración viven en
     la hoja. Sin medida (carril oculto en móvil: ancho 0) no se enciende
     `con-indicador` y la activa se pinta a sí misma — la piel no depende del
     JS para decir qué pestaña está abierta. ResizeObserver cubre el momento
     en que #app deja de estar oculto (el carril nace con ancho 0) y los
     cambios de ancho de la ventana. */
  function moverIndicadorPestanas() {
    const carril = document.querySelector("nav.pestanas");
    const activa = carril && carril.querySelector(".pestana.activa");
    if (!carril || !activa || !activa.offsetWidth) return;
    carril.style.setProperty("--ind-x", activa.offsetLeft + "px");
    carril.style.setProperty("--ind-w", activa.offsetWidth + "px");
    carril.classList.add("con-indicador");
  }
  try {
    const carril = document.querySelector("nav.pestanas");
    if (carril && typeof ResizeObserver === "function") new ResizeObserver(moverIndicadorPestanas).observe(carril);
    window.addEventListener("resize", moverIndicadorPestanas);
  } catch { /* sin observador: la activa se pinta a sí misma */ }
  document.addEventListener("click", (e) => {
    const b = e.target.closest("[data-tab]");
    if (b) activarPestana(b.getAttribute("data-tab"));
  });
  /* Las FLECHAS mueven entre las pestañas de SU barra (WAI-ARIA: un tablist se
     recorre con ArrowLeft/ArrowRight/Home/End, no con el tabulador). Cada barra
     es un anillo cerrado: las dos pintan las mismas cuatro secciones, pero el
     foco no salta de la de escritorio a la del teléfono. */
  document.addEventListener("keydown", (e) => {
    const t = e.target && e.target.closest ? e.target.closest('[role="tab"]') : null;
    const barra = t && t.closest('[role="tablist"]');
    if (!barra) return;
    const tabs = [...barra.querySelectorAll('[role="tab"]')];
    const i = tabs.indexOf(t);
    const j = e.key === "ArrowRight" ? (i + 1) % tabs.length
      : e.key === "ArrowLeft" ? (i - 1 + tabs.length) % tabs.length
        : e.key === "Home" ? 0
          : e.key === "End" ? tabs.length - 1 : -1;
    if (j < 0 || i < 0) return;
    e.preventDefault();
    activarPestana(tabs[j].getAttribute("data-tab"));
    try { tabs[j].focus(); } catch { /* sin foco: la pestaña ya cambió */ }
  });
  window.addEventListener("hashchange", () => {
    let hash = "";
    try { hash = (location.hash.match(/^#\/([a-z-]+)/) || [])[1] || ""; } catch { hash = ""; }
    if (hash) activarPestana(hash, { empujarHash: false });
  });

  /* El botón «APU» de una tarjeta o de una fila del panel: precarga el proceso
     en el editor y cambia a su pestaña. Antes esto abría /apu.html con una
     querystring; la MISMA cadena de parámetros viaja ahora en memoria, así que
     `precargarDesdeURL` no cambió de contrato. */
  function abrirEditorConProceso(q) {
    paramsProceso = q instanceof URLSearchParams ? q : new URLSearchParams(String(q || ""));
    const yaArrancado = arrancadas.apu;
    activarPestana("apu");
    if (yaArrancado) precargarDesdeURL();
  }

  /* Competencia histórica de la entidad (índice sobre 2 años de adjudicaciones):
     es lo que decide el orden por defecto — primero donde menos gente compite. */
  const COMPETENCIA_ENTIDAD = {
    baja: { emoji: "●", titulo: "Poca competencia", clases: "bg-green-50 text-green-800 ring-green-600/20" },
    media: { emoji: "●", titulo: "Competencia media", clases: "bg-amber-50 text-amber-800 ring-amber-600/20" },
    alta: { emoji: "●", titulo: "Alta competencia", clases: "bg-red-50 text-red-700 ring-red-600/20" },
    sin_dato: { emoji: "●", titulo: "Sin datos históricos de esta entidad", clases: "bg-gray-50 text-gray-500 ring-gray-500/20" },
  };

  /* Baja de mercado de la entidad (lib/indice_baja): cuánto descuenta el
     ganador frente al presupuesto oficial. MENOS baja es MEJOR — se puede
     ofertar cerca del oficial y conservar margen— así que el verde es el 0 %.
     Al revés que el resto de badges, aquí el CERO es un dato y no una ausencia:
     una entidad que adjudica por el presupuesto es exactamente lo que se busca. */
  const BAJA_MERCADO = {
    bajo: { clases: "bg-green-100 text-green-800" },
    medio: { clases: "bg-amber-100 text-amber-800" },
    alto: { clases: "bg-red-100 text-red-700" },
    sin_dato: { clases: "bg-gray-100 text-gray-500" },
  };
  /* ══════════ Perfil de RUP subido (onboarding, ago 2026) ══════════
     onboarding.js guarda {id, nombre} en localStorage al terminar la subida y
     redirige a /?perfil=rup_…; aquí se decide la vista y se inyecta la opción
     en el selector. localStorage SIEMPRE dentro de try: en modo restringido
     lanza, y el arranque no puede morir por eso. */
  const CLAVE_PERFIL_RUP = "detecta_perfil_rup";
  const ID_RUP_RE = /^rup_[a-z0-9]{6,24}$/;
  function perfilRupGuardado() {
    try {
      const v = JSON.parse(localStorage.getItem(CLAVE_PERFIL_RUP) || "null");
      return v && typeof v.id === "string" && ID_RUP_RE.test(v.id) ? v : null;
    } catch { return null; }
  }
  function olvidarPerfilRup() {
    try { localStorage.removeItem(CLAVE_PERFIL_RUP); } catch { /* nada que borrar */ }
  }
  /* `soloEste`: quien entra por su RUP (sin pasar el gate) ve SOLO su perfil.
     Dejar los tres perfiles del dueño en el selector convertiría cualquier
     `/?perfil=rup_…` pegado en la barra en un salto del gate — el gate es una
     cortesía del cliente, pero no hay por qué regalarlo. Quien sí pasó el
     gate en esta pestaña conserva el selector completo. */
  function activarPerfilRup(p, { soloEste = false } = {}) {
    const sel = $("f-perfil");
    if (![...sel.options].some((o) => o.value === p.id)) {
      const opcion = document.createElement("option");
      opcion.value = p.id;
      opcion.textContent = p.nombre ? `Mi RUP · ${p.nombre}` : "Mi RUP (subido en PDF)";
      sel.insertBefore(opcion, sel.firstChild);
    }
    if (soloEste) {
      for (const o of [...sel.options]) { if (o.value !== p.id) o.remove(); }
    }
    fijarPerfilBarra(p.id);
  }

  /* ══════════ LA VISTA DE VISITANTE (6-sep-2026, M-SEG-02) ══════════
     Quien entra por su RUP subido (o por un consorcio a la medida) sin la clave
     del sitio ve SOLO lo suyo. Hasta hoy la única poda era la del selector de
     la barra: la pestaña abría con el tablero de los perfiles del dueño
     (op=resumen&perfil=helder), pedía el JSON de sus perfiles, sus contratos
     ejecutados y sus consorcios guardados —que además volvían a la barra como
     opciones— y enseñaba los botones que reescriben todo eso. Medido con el
     arranque real (Node y Chromium, 6-sep-2026): 9 bloques del dueño visibles y
     4 peticiones con sus datos.

     ES UN CENSO, NO UNA LISTA DE SITIOS: cada bloque de primer nivel de Mi
     empresa está en `soloDueno`, en `soloVisitante` o en `deTodos`, con su
     motivo, y la suite exige que el HTML no tenga ninguno fuera de las tres
     listas y que lo de `soloDueno` quede oculto al arrancar como visitante. Se aplica con
     `el.hidden`, no con clases (el CDN de Tailwind está bloqueado en la red del
     dueño). Lo que no se enseña tampoco se PIDE: los cargadores de esos bloques
     vuelven sin llamar al servidor.

     OCULTAR NO ES SEGURIDAD: el token va integrado y quien lea el fuente sigue
     pudiendo llamar op=experiencia o op=sync; la cerradura del servidor son
     las cuentas por usuario (otra mejora). Aquí se decide qué se ENSEÑA y qué
     se pide, y lo que queda dice a quién pertenece. */
  const VISTA_VISITANTE = {
    /* lo que solo ve quien pasó el gate: `hidden` para el visitante */
    soloDueno: {
      dashboard: "el tablero de los tres perfiles del dueño: op=resumen no admite otro perfil",
      actualizar: "«Actualizar datos» dispara op=sync sobre el corpus compartido",
      "rup-gestion-dueno": "subir, descargar y ver el JSON de los perfiles del dueño (op=rup)",
      "rup-gestion-titulo-dueno": "el rótulo del pliegue promete subir y descargar el registro",
      "seccion-sistema": "parámetros de costo, contratos ejecutados, auditoría, sincronización y reconstrucciones: configuración de la empresa que administra el sitio",
      "rastreo-wrap": "su selector de perfil solo conoce los tres perfiles del dueño",
      "btn-apu-cargar": "op=cargar-catalogo reescribe el catálogo de precios compartido (pestaña Precios)",
    },
    /* lo que solo ve el visitante */
    soloVisitante: {
      "aviso-visitante": "dice qué no se enseña, a quién pertenece y cómo entra quien sí administra el sitio",
      "rup-gestion-titulo-visitante": "el pliegue del visitante solo elimina su propio registro",
    },
    /* lo que ven los dos, con el motivo por el que no enseña nada del dueño */
    deTodos: {
      pulso: "cifras de SU perfil (op=pulso con el perfil de la barra, ya podada)",
      "pulso-repartos": "la otra mitad del pulso: mismo perfil",
      "seccion-rup": "su registro en cifras (op=pulso) y la eliminación de su propio perfil",
      calendario: "los cierres de sus procesos guardados (seguimiento del perfil de la barra)",
      "seccion-consorcio": "se oculta sola con menos de dos perfiles individuales en la barra, y la del visitante trae uno",
      "seccion-socio": "consulta fuentes públicas sobre un tercero; no lleva cifras del dueño",
    },
  };
  let vistaVisitanteActiva = false;
  function vistaDeVisitante(activa) {
    vistaVisitanteActiva = !!activa;
    for (const id of Object.keys(VISTA_VISITANTE.soloDueno)) { const el = $(id); if (el) el.hidden = vistaVisitanteActiva; }
    for (const id of Object.keys(VISTA_VISITANTE.soloVisitante)) { const el = $(id); if (el) el.hidden = !vistaVisitanteActiva; }
    /* la marca de la barra dispara la misma sincronización que «Actualizar
       datos»: para el visitante deja de ser un control (sin mano, sin flecha,
       sin «Actualizar»), y pintarCorte lo sabe por la clase */
    const marca = $("btn-marca");
    if (marca) {
      marca.classList.toggle("marca-informativa", vistaVisitanteActiva);
      marca.setAttribute("aria-disabled", vistaVisitanteActiva ? "true" : "false");
    }
    pintarCorte(corteActual);
  }
  /* «Ir a la pantalla de inicio»: la landing con sus tres puertas también para
     quien tiene un RUP guardado —sin esto el arranque lo devolvería a la
     aplicación—. Se RECARGA a propósito: cambiar solo el hash no vuelve a
     decidir la vista, y el arranque entiende «#/inicio». */
  const irAlInicio = $("aviso-visitante-inicio");
  if (irAlInicio) irAlInicio.addEventListener("click", () => {
    try { location.hash = "#/inicio"; location.reload(); } catch { /* entorno raro */ }
  });

  /* ══════════ Estados de la vista ══════════ */
  function mostrar(estado, msg) {
    for (const id of ["estado-carga", "estado-error", "estado-vacio", "resultados"]) $(id).classList.add("hidden");
    if (estado) $(estado).classList.remove("hidden");
    if (estado === "estado-carga" && msg) $("estado-carga-msg").textContent = msg;
    if (estado === "estado-error" && msg) $("estado-error-msg").textContent = msg;
    /* `aria-busy` mientras se busca: quien no ve el esqueleto tiene que saber
       que la lista está a medias y que lo que lea puede cambiar. */
    $("resultados").setAttribute("aria-busy", estado === "estado-carga" ? "true" : "false");
  }

  /* ══════════ Consulta ══════════ */
  let pagina = 1, reintentosSync = 0, timerReintento = null;
  let peticionActual = 0; // descarta respuestas fuera de orden (carrera de filtros)
  /* ¿Está encendido «Ver PAA»? Lo consulta `tarjeta()` para decidir si pinta el
     badge «Activo». Fuera de esa vista NO se pinta, y no es un olvido: un chip
     idéntico en las cien tarjetas no distingue nada —es el defecto del chip
     constante que `nivel_competencia` pintaba en todas— y solo significa algo
     cuando hay previsiones del PAA en la misma pantalla de las que separarlo. */
  let paaEncendido = false;
  let peticionPaa = 0;
  /* La última respuesta de /api/oportunidades ya pintada. Encender «Ver PAA»
     repinta las tarjetas para añadirles el badge «Activo» SIN volver a pedir la
     lista: gastar una invocación por un badge sería absurdo, y además la lista
     podría llegar distinta y parecería que el toggle filtra algo. */
  let ultimaBusqueda = null;

  /* ══════════ Fase 8 · LOS SIETE FILTROS ══════════
     El vocabulario vive en public/filtros.js (`window.Filtros`, el mismo
     archivo que aplica el servidor). Aquí: el estado (leído de la URL al
     arrancar y escrito en la URL en cada cambio, para que un enlace guardado
     conserve el filtro), los controles, las fichas removibles, el contador
     «23 de 312» y el callejón sin salida con salida («si quita el de zona,
     aparecen 11»). El estado se manda al servidor con `parametros()`: los
     filtros se aplican ALLÍ, no en el navegador sobre un volcado. */
  const FL = window.Filtros;
  let estadoFiltros = leerFiltrosDeURL();
  let ultimasFacetas = null;
  function leerFiltrosDeURL() {
    try { return FL.leerEstado(new URLSearchParams(location.search)); } catch { return FL.leerEstado({}); }
  }
  function escribirFiltrosEnURL() {
    try {
      const p = new URLSearchParams(location.search);
      FL.escribirEstado(estadoFiltros, p);
      const ord = $("f-ordenar").value;
      if (ord && ord !== "atractividad") p.set("ordenar_por", ord); else p.delete("ordenar_por");
      const qs = p.toString();
      history.replaceState(null, "", `${location.pathname}${qs ? "?" + qs : ""}${location.hash}`);
    } catch { /* entorno raro: la URL no se actualiza, la búsqueda sí */ }
  }
  /* Cambio de estado desde cualquier control: se escribe en la URL, se
     repintan fichas y controles y se busca de nuevo desde la página 1. */
  function cambiarFiltros(nuevo) {
    estadoFiltros = nuevo;
    escribirFiltrosEnURL();
    pintarControlesFiltros();
    pagina = 1;
    buscar();
  }
  const tiposActivos = () => estadoFiltros.tipo || [...FL.TIPOS_POR_DEFECTO];
  function conteo(faceta, id) {
    const f = ultimasFacetas && ultimasFacetas[faceta];
    return f && f[id] != null ? ` (${f[id]})` : "";
  }
  function chipToggle(activo, texto, titulo, attrs) {
    return `<button type="button" ${attrs} title="${esc(titulo || "")}"
      class="rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset transition ${activo
    ? "bg-gray-900 text-white ring-gray-900" : "bg-white text-gray-600 ring-gray-300 hover:bg-gray-50"}">${esc(texto)}</button>`;
  }
  /* El concepto del orden elegido, bajo la barra: qué hace y qué no promete.
     Las opciones del select llevan el mismo texto como `title`. */
  function pintarConceptoOrden() {
    const sel = $("f-ordenar"), p = $("orden-concepto");
    if (!sel || !p) return;
    for (const o of sel.options) { const c = FL.conceptoDe(o.value); if (c) o.title = c; }
    p.textContent = FL.conceptoDe(sel.value) || "";
  }
  function pintarControlesFiltros() {
    const e = estadoFiltros;
    // 1 · tipo de trabajo (chips que se encienden y apagan)
    const tipos = tiposActivos();
    $("fl-tipo").innerHTML = FL.TIPOS_TRABAJO.map((t) =>
      chipToggle(tipos.includes(t.id), t.etiqueta + conteo("tipo", t.id), t.ayuda, `data-fl-tipo="${t.id}"`)).join("");
    // 2 · modalidad (chips; ninguno encendido = todas)
    $("fl-modalidad").innerHTML = FL.MODALIDADES.map((m) =>
      chipToggle(!!(e.modalidad && e.modalidad.includes(m.id)), m.etiqueta + conteo("modalidad", m.id), m.ayuda, `data-fl-modalidad="${m.id}"`)).join("");
    // 3 · departamento (select que AÑADE; lo elegido se ve en las fichas)
    const dep = $("fl-dep");
    if (dep.options.length <= 1) {
      for (const d of FL.DEPARTAMENTOS) {
        const o = document.createElement("option"); o.value = d.codigo; o.textContent = d.nombre; dep.appendChild(o);
      }
    }
    for (const o of dep.options) if (o.value) o.textContent = (FL.DEPARTAMENTOS.find((d) => d.codigo === o.value) || {}).nombre + conteo("departamento", o.value);
    dep.value = "";
    // los departamentos elegidos, como chips con × DENTRO de la hoja (el select es un control que AÑADE)
    const elegidos = $("fl-dep-elegidos");
    if (elegidos) {
      elegidos.innerHTML = (e.dep || []).map((c) => {
        const d = FL.DEPARTAMENTOS.find((x) => x.codigo === c);
        return `<span class="inline-flex items-center gap-1 rounded-full bg-gray-900 px-2.5 py-1 text-xs font-medium text-white">${esc(d ? d.nombre : c)}
          <button type="button" data-fl-quitar-dep="${esc(c)}" class="ml-0.5 rounded-full px-1 leading-none text-white/80 hover:bg-white/20 hover:text-white" title="Quitar este departamento" aria-label="Quitar ${esc(d ? d.nombre : c)}">×</button></span>`;
      }).join("");
    }
    if (document.activeElement !== $("fl-ciudad")) $("fl-ciudad").value = e.ciudad || "";
    $("fl-zona-cerca").checked = $("f-zona").value === "facil";
    // 4 · cuantía
    const rango = $("fl-rango");
    if (rango.options.length <= 1) {
      for (const r of FL.RANGOS_CUANTIA) { const o = document.createElement("option"); o.value = r.id; o.textContent = r.etiqueta; rango.appendChild(o); }
      const libre = document.createElement("option"); libre.value = "libre"; libre.textContent = "Elegir el rango"; rango.appendChild(libre);
    }
    for (const o of rango.options) if (o.value && o.value !== "libre") o.textContent = FL.etiquetaDe(FL.RANGOS_CUANTIA, o.value) + conteo("cuantia", o.value);
    const rangoId = e.min ? (FL.RANGOS_CUANTIA.find((r) => r.min === (e.min.min ?? 0) && (r.max ?? null) === (e.min.max ?? null)) || { id: "libre" }).id : "";
    rango.value = rangoId;
    $("fl-rango-libre").classList.toggle("hidden", rangoId !== "libre");
    $("fl-rango-libre").classList.toggle("flex", rangoId === "libre");
    if (rangoId === "libre") { $("fl-min").value = e.min.min ?? ""; $("fl-max").value = e.min.max ?? ""; }
    // 5 · cierre
    const cierre = $("fl-cierre");
    if (cierre.options.length <= 1) {
      for (const v of FL.VENTANAS_CIERRE) { const o = document.createElement("option"); o.value = v.id; o.textContent = v.etiqueta; cierre.appendChild(o); }
      const fechas = document.createElement("option"); fechas.value = "fechas"; fechas.textContent = "Elegir fechas"; cierre.appendChild(fechas);
    }
    for (const o of cierre.options) if (o.value && o.value !== "fechas") o.textContent = FL.etiquetaDe(FL.VENTANAS_CIERRE, o.value) + conteo("cierre", o.value);
    const cierreId = e.cierre ? (e.cierre.ventana || "fechas") : "";
    cierre.value = cierreId;
    $("fl-cierre-fechas").classList.toggle("hidden", cierreId !== "fechas");
    $("fl-cierre-fechas").classList.toggle("flex", cierreId === "fechas");
    if (cierreId === "fechas") { $("fl-cierre-desde").value = e.cierre.desde || ""; $("fl-cierre-hasta").value = e.cierre.hasta || ""; }
    // 6 · manifestación de interés (casilla) + el aviso bajo la barra
    const fm = ultimasFacetas && ultimasFacetas.manifestacion;
    if ($("fl-manif")) {
      $("fl-manif").checked = e.manif === "abierta";
      $("fl-manif-n").textContent = fm ? `(${fm.abiertas})` : "";
    }
    pintarAvisoManifestacion(fm);
    // 7 · entidad y palabra
    if (document.activeElement !== $("fl-entidad")) $("fl-entidad").value = e.entidad || "";
    $("fl-entidad-historial").classList.toggle("hidden", !e.entidad);
    if (document.activeElement !== $("fl-q")) $("fl-q").value = e.q || "";
    // fichas removibles + «Quitar todos»
    const fichas = FL.fichas(e);
    $("fl-fichas").innerHTML = fichas.length
      ? fichas.map((f) => `<span class="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-1 text-gray-700 ring-1 ring-inset ring-gray-900/10">${esc(f.etiqueta)}
          <button type="button" data-fl-quitar="${f.filtro}" class="ml-0.5 rounded-full px-1 leading-none text-gray-500 hover:bg-gray-200 hover:text-gray-900" title="Quitar este filtro" aria-label="Quitar ${esc(f.etiqueta)}">×</button></span>`).join("")
        + `<button type="button" id="fl-quitar-todos" class="ml-1 font-medium hover:underline" style="color: var(--accent);">Quitar todos</button>`
      : "";
    /* el botón «Filtros» de la barra lleva el número de filtros activos: la hoja
       está cerrada casi siempre y sin la cifra no se sabría que hay algo puesto */
    const nBadge = $("btn-filtros-n");
    if (nBadge) { nBadge.textContent = String(fichas.length); nBadge.classList.toggle("hidden", !fichas.length); }
  }
  /* El aviso bajo la barra: en cuántos procesos pequeños todavía se puede
     avisar que le interesa y en cuántos el plazo puede estar cerrando hoy
     (`urgentes` ⊂ `abiertas`, del servidor). Nunca dice «vencen mañana»: la
     fecha exacta la fija el pliego, no la ley. Solo se enseña con datos; con el
     filtro ya puesto dice que se están viendo. */
  function pintarAvisoManifestacion(fm) {
    const caja = $("aviso-manifestacion");
    if (!caja) return;
    if (!fm || !fm.abiertas) { caja.classList.add("hidden"); caja.classList.remove("flex"); return; }
    const t = $("aviso-manifestacion-texto"), b = $("aviso-manifestacion-ver");
    const puesto = estadoFiltros.manif === "abierta";
    t.textContent = `Avisar que le interesa: ${fm.abiertas} proceso${fm.abiertas === 1 ? "" : "s"} pequeño${fm.abiertas === 1 ? "" : "s"} en los que todavía puede avisar`
      + (fm.urgentes ? ` — en ${fm.urgentes} el plazo puede estar cerrando hoy: verifíquelo en SECOP II` : "")
      + (puesto ? " (se muestran solo estos)." : ". Sin avisar que le interesa no se puede presentar oferta.");
    b.textContent = puesto ? "Ver todos" : "Ver solo estos";
    caja.classList.remove("hidden"); caja.classList.add("flex");
  }
  $("aviso-manifestacion-ver").addEventListener("click", () => {
    cambiarFiltros({ ...estadoFiltros, manif: estadoFiltros.manif === "abierta" ? null : "abierta" });
  });
  $("fl-manif").addEventListener("change", () => cambiarFiltros({ ...estadoFiltros, manif: $("fl-manif").checked ? "abierta" : null }));
  /* ── la HOJA de filtros: abrir/cerrar (botón, «Listo», velo, Esc) ── */
  function abrirPanelFiltros(abrir) {
    const panel = $("panel-filtros"), btn = $("btn-filtros");
    if (!panel || !btn) return;
    panel.classList.toggle("hidden", !abrir);
    btn.setAttribute("aria-expanded", abrir ? "true" : "false");
    document.body.style.overflow = abrir ? "hidden" : "";
    if (abrir) { const primero = panel.querySelector("button, select, input"); if (primero && primero.focus) primero.focus(); }
    else if (btn.focus) btn.focus();
  }
  $("btn-filtros").addEventListener("click", () => abrirPanelFiltros($("panel-filtros").classList.contains("hidden")));
  $("panel-filtros-listo").addEventListener("click", () => abrirPanelFiltros(false));
  $("panel-filtros-velo").addEventListener("click", () => abrirPanelFiltros(false));
  $("panel-filtros-limpiar").addEventListener("click", () => cambiarFiltros(FL.leerEstado({})));
  document.addEventListener("keydown", (ev) => { if (ev.key === "Escape" && !$("panel-filtros").classList.contains("hidden")) abrirPanelFiltros(false); });
  /* Delegación de clics de la barra: chips de tipo y modalidad, X de las
     fichas y «Quitar todos». */
  $("filtros-barra").addEventListener("click", (ev) => {
    const t = ev.target.closest("[data-fl-tipo]");
    if (t) {
      const id = t.getAttribute("data-fl-tipo");
      const activos = new Set(tiposActivos());
      if (activos.has(id)) activos.delete(id); else activos.add(id);
      if (!activos.size) return; // ningún tipo = nada que ver: no se permite
      const lista = FL.TIPOS_TRABAJO.map((x) => x.id).filter((x) => activos.has(x));
      const esDefecto = lista.length === FL.TIPOS_POR_DEFECTO.length && FL.TIPOS_POR_DEFECTO.every((x) => activos.has(x));
      return cambiarFiltros({ ...estadoFiltros, tipo: esDefecto ? null : lista });
    }
    const m = ev.target.closest("[data-fl-modalidad]");
    if (m) {
      const id = m.getAttribute("data-fl-modalidad");
      const activos = new Set(estadoFiltros.modalidad || []);
      if (activos.has(id)) activos.delete(id); else activos.add(id);
      return cambiarFiltros({ ...estadoFiltros, modalidad: activos.size ? [...activos] : null });
    }
    const xd = ev.target.closest("[data-fl-quitar-dep]");
    if (xd) {
      const resto = (estadoFiltros.dep || []).filter((c) => c !== xd.getAttribute("data-fl-quitar-dep"));
      return cambiarFiltros({ ...estadoFiltros, dep: resto.length ? resto : null });
    }
    const x = ev.target.closest("[data-fl-quitar]");
    if (x) return cambiarFiltros(FL.sinFiltro(estadoFiltros, x.getAttribute("data-fl-quitar")));
    if (ev.target.closest("#fl-quitar-todos")) return cambiarFiltros(FL.leerEstado({}));
    if (ev.target.closest("#fl-entidad-historial") && estadoFiltros.entidad) {
      abrirModal(estadoFiltros.entidad, "Historial de la entidad");
      cargarDetalle(estadoFiltros.entidad);
    }
  });
  $("fl-dep").addEventListener("change", () => {
    const v = $("fl-dep").value;
    if (!v) return;
    const dep = new Set(estadoFiltros.dep || []); dep.add(v);
    cambiarFiltros({ ...estadoFiltros, dep: [...dep] });
  });
  $("fl-ciudad").addEventListener("change", () => cambiarFiltros({ ...estadoFiltros, ciudad: $("fl-ciudad").value.trim() || null }));
  $("fl-zona-cerca").addEventListener("change", () => {
    // es el filtro `?zona=facil` de siempre (opt-in): un clic lo enciende y
    // otro devuelve todo — «Ver también fuera de mi zona»
    $("f-zona").value = $("fl-zona-cerca").checked ? "facil" : "";
    pagina = 1; buscar();
  });
  $("fl-rango").addEventListener("change", () => {
    const v = $("fl-rango").value;
    if (v === "libre") { $("fl-rango-libre").classList.remove("hidden"); $("fl-rango-libre").classList.add("flex"); $("fl-min").focus(); return; }
    const r = FL.RANGOS_CUANTIA.find((x) => x.id === v);
    cambiarFiltros({ ...estadoFiltros, min: r ? { min: r.min, max: r.max } : null });
  });
  for (const id of ["fl-min", "fl-max"]) {
    $(id).addEventListener("change", () => {
      const min = $("fl-min").value === "" ? null : Number($("fl-min").value);
      const max = $("fl-max").value === "" ? null : Number($("fl-max").value);
      cambiarFiltros({ ...estadoFiltros, min: min == null && max == null ? null : { min, max } });
    });
  }
  $("fl-cierre").addEventListener("change", () => {
    const v = $("fl-cierre").value;
    if (v === "fechas") { $("fl-cierre-fechas").classList.remove("hidden"); $("fl-cierre-fechas").classList.add("flex"); $("fl-cierre-desde").focus(); return; }
    cambiarFiltros({ ...estadoFiltros, cierre: v ? { ventana: v } : null });
  });
  for (const id of ["fl-cierre-desde", "fl-cierre-hasta"]) {
    $(id).addEventListener("change", () => {
      const desde = $("fl-cierre-desde").value || null, hasta = $("fl-cierre-hasta").value || null;
      cambiarFiltros({ ...estadoFiltros, cierre: desde || hasta ? { desde, hasta } : null });
    });
  }
  $("fl-entidad").addEventListener("change", () => cambiarFiltros({ ...estadoFiltros, entidad: $("fl-entidad").value.trim() || null }));
  $("fl-q").addEventListener("change", () => cambiarFiltros({ ...estadoFiltros, q: $("fl-q").value.trim() || null }));
  /* Sugerencias de entidad mientras se escribe: el catálogo REAL de entidades
     con procesos abiertos (/api/procesos?op=entidades), con espera de 250 ms
     para no pedir en cada tecla. */
  let timerEntidades = null, peticionEntidades = 0;
  $("fl-entidad").addEventListener("input", () => {
    clearTimeout(timerEntidades);
    const texto = $("fl-entidad").value.trim();
    if (texto.length < 3) return;
    timerEntidades = setTimeout(async () => {
      const mia = ++peticionEntidades;
      let cuerpo = null;
      try { const r = await fetch(`/api/procesos?op=entidades&q=${encodeURIComponent(texto)}`); cuerpo = await r.json(); } catch { return; }
      if (mia !== peticionEntidades || !cuerpo || !cuerpo.ok) return;
      $("fl-entidades").innerHTML = (cuerpo.entidades || []).map((e) =>
        `<option value="${esc(e.nombre)}">${e.procesosAbiertos} proceso${e.procesosAbiertos === 1 ? "" : "s"} abierto${e.procesosAbiertos === 1 ? "" : "s"}${e.valorAbierto ? " · " + fmtCOP.format(e.valorAbierto) : ""}</option>`).join("");
    }, 250);
  });
  /* Cero resultados CON filtros: nunca un callejón sin salida. El servidor ya
     contó qué filtro recupera más y cuántos; aquí solo se pinta con el botón. */
  function pintarVacio(cuerpo) {
    const fichas = FL.fichas(estadoFiltros);
    const n = fichas.length;
    let html = "";
    if (!n) html = "No se encontraron oportunidades. Pruebe con «Buscar oportunidades» más tarde: la lista se actualiza sola con cada sincronización.";
    else {
      const s = cuerpo && cuerpo.sugerencia;
      const nombre = s ? (fichas.find((f) => f.filtro === s.filtro) || {}).etiqueta || s.filtro : null;
      html = `Ningún proceso cumple ${n === 1 ? "el filtro" : `los ${n} filtros`}.`
        + (s ? ` Si quita <strong>${esc(nombre.split(":")[0].toLowerCase())}</strong>, aparece${s.siLoQuita === 1 ? "" : "n"} <strong>${s.siLoQuita}</strong>.
            <button type="button" data-fl-quitar-sugerido="${esc(s.filtro)}" class="ml-2 rounded-lg border border-gray-300 bg-white px-3 py-1 text-xs font-medium hover:bg-gray-50">Quitar ese filtro</button>`
          : " Ninguno de los filtros, quitado por separado, recupera procesos: pruebe «Quitar todos».")
        + ` <button type="button" id="fl-vacio-quitar-todos" class="ml-1 text-xs font-medium text-blue-600 hover:underline">Quitar todos</button>`;
    }
    $("estado-vacio").innerHTML = html;
    mostrar("estado-vacio");
  }
  $("estado-vacio").addEventListener("click", (ev) => {
    const b = ev.target.closest("[data-fl-quitar-sugerido]");
    if (b) return cambiarFiltros(FL.sinFiltro(estadoFiltros, b.getAttribute("data-fl-quitar-sugerido")));
    if (ev.target.closest("#fl-vacio-quitar-todos")) cambiarFiltros(FL.leerEstado({}));
  });
  /* Margen estimado en la tarjeta (solo con el orden «Dónde me queda más»):
     techo − piso, con las dos cifras; sin costo calculado, la frase de «Sin
     referencia» y nada de números. */
  /* Fase 5 · vigía de adendas (dataset): «la entidad cambió las reglas» con
     ● lo que le afecta y ○ lo que no. Sin cambios no se pinta nada. */
  function bloqueAdendas(a) {
    if (!a || !a.n) return "";
    return `<div class="mt-3 rounded-lg px-3 py-2 text-xs ring-1 ring-inset ${a.le_afecta ? "bg-amber-50 text-amber-900 ring-amber-600/20" : "bg-gray-50 text-gray-700 ring-gray-900/5"}">
      <p class="font-medium">${esc(a.resumen)}</p>
      <ul class="mt-1 space-y-0.5">${a.cambios.map((c) => `<li><span aria-hidden="true">${c.afecta ? "●" : "○"}</span> ${esc(c.mensaje)}</li>`).join("")}</ul>
    </div>`;
  }
  function lineaMargen(m) {
    if (!m) return "";
    if (m.valor == null) return `<p class="mt-3 text-xs text-gray-500">${esc(m.motivo || "Sin referencia")}</p>`;
    const signo = m.valor >= 0 ? "text-green-800 bg-green-50 ring-green-600/20" : "text-red-700 bg-red-50 ring-red-600/20";
    /* «Recorrido», no «le quedan»: esta cifra es la distancia entre dos PRECIOS
       (su mínimo y el del mercado), o sea margen de maniobra para ofertar. La
       plata que deja el contrato es otra —la de la franja de arriba, que ya
       descontó la contribución y las deducciones— y llamarlas igual es la
       confusión que el encargo del dueño vino a corregir. */
    return `<p class="mt-3 rounded-lg px-3 py-2 text-xs ring-1 ring-inset ${signo}">Puede mover el precio <strong>${fmtCOP.format(m.valor)}</strong> entre su precio mínimo (${fmtCOP.format(m.piso)}) y el precio al que suele adjudicar esta entidad (${fmtCOP.format(m.techo)}). No es lo que deja el contrato: eso es la cifra de arriba.${m.valor < 0 ? " El precio de mercado está POR DEBAJO de su mínimo: aquí no da." : ""}</p>`;
  }

  /* Al cargar: el orden pedido en la URL (`?ordenar_por=margen`) y los
     controles pintados desde el estado leído — así un enlace guardado se ve
     igual que cuando se guardó, antes incluso de la primera respuesta. */
  try {
    const ord = new URLSearchParams(location.search).get("ordenar_por");
    if (ord && [...$("f-ordenar").options].some((o) => o.value === ord)) $("f-ordenar").value = ord;
  } catch { /* sin URL legible */ }
  pintarControlesFiltros();
  pintarConceptoOrden();

  function parametros() {
    const p = new URLSearchParams({ perfil: $("f-perfil").value, pagina: String(pagina), por_pagina: "20" });
    // Fase 8: los siete filtros viajan al servidor (se aplican allí)
    FL.escribirEstado(estadoFiltros, p);
    const ant = $("f-anticipo").value;
    if (ant !== "") p.set("anticipo_min", ant);
    /* NO se envía `nivel_competencia` (ago 2026): ese campo sale de columnas
       EX-POST que SECOP II no publica mientras el proceso está abierto, así que
       en el corpus activo vale «baja» siempre. Quien responde esta pregunta con
       base es `competencia_entidad`, del histórico. Ver docs/AUDITORIA_INTEGRAL §4.1. */
    for (const [id, nombre] of [["f-cuantia", "cuantia_rango"],
      ["f-entidad", "competencia_entidad"], ["f-ubicacion", "ubicacion_valida"],
      ["f-zona", "zona"]]) {
      if ($(id).value) p.set(nombre, $(id).value);
    }
    p.set("ordenar_por", $("f-ordenar").value);
    p.set("orden", $("f-orden").value);
    // encendido por defecto: la lista es para decidir, y un proceso que no se
    // puede tomar estorba más de lo que informa. Apagarlo los devuelve
    // atenuados y con el motivo, nunca mezclados con los viables.
    if (!$("f-solo-viables").checked) p.set("solo_viables", "false");
    // apagado por defecto: sin código del RUP y sin vocabulario claro de obra,
    // el proceso es ruido (software, equipos, servicios de salud…). Encenderlo
    // los devuelve, siempre marcados como «Objeto sugiere obra».
    if ($("f-sin-unspsc").checked) p.set("incluir_sin_unspsc", "1");
    /* La estructura de precio que el usuario declaró en el detalle de «lo que
       deja este contrato» viaja al SERVIDOR, no se aplica en el navegador: así
       la cifra de la tarjeta y el orden «Lo que más deja» salen de la misma
       cuenta. Aplicarla solo aquí habría dejado la lista ordenada por unos
       números y pintada con otros. */
    const est = estructuraGuardada();
    if (est) {
      for (const [k, nombre] of [["administracion_pct", "administracion_pct"],
        ["imprevistos_pct", "imprevistos_pct"], ["utilidad_pct", "utilidad_pct"]]) {
        if (Number.isFinite(Number(est[k]))) p.set(nombre, String(est[k]));
      }
      if (est.declarada) p.set("contribucion_en_administracion", est.contribucion_en_administracion ? "1" : "0");
    }
    return p;
  }

  async function buscar() {
    clearTimeout(timerReintento);
    const peticion = ++peticionActual;
    /* SIN TOKEN (ago 2026). La lista es lo que vienen a ver los clientes, así
       que no se les pide credencial: el servidor responde 200 y redacta las
       cifras financieras (`finanzas_visibles:false`). Si el dueño ya guardó el
       token en esta pestaña —porque abrió el detalle de competencia— se manda
       y entonces sí vuelven las cifras; pero su AUSENCIA nunca bloquea nada ni
       abre un formulario. */
    mostrar("estado-carga", "Buscando oportunidades…");
    let r, cuerpo;
    try {
      const token = tokenGuardado();
      r = await fetch(`/api/procesos?op=listar&${parametros()}`,
        token ? { headers: { "x-historico-token": token } } : undefined);
    } catch (e) {
      if (peticion !== peticionActual) return; // llegó tarde: ya hay otra búsqueda
      // durante la sincronización inicial un fallo transitorio no debe cortar
      // la espera automática
      if (reintentosSync > 0) return esperarSincronizacion();
      return mostrar("estado-error", mensajeDeFallo(e, "buscar oportunidades"));
    }
    /* el parseo va APARTE del fetch (cuarta vez que se aplica la lección): el
       muro del edge (Vercel Password Protection) responde HTML, así que
       `r.json()` lanza — y con las dos cosas en el mismo try ese muro se
       diagnosticaba como «sin conexión», lo contrario de la verdad. */
    cuerpo = await leerJson(r);
    if (peticion !== peticionActual) return; // respuesta obsoleta: descartar

    if (r.status === 503 && cuerpo && cuerpo.sincronizando) return esperarSincronizacion();
    /* Un 401 aquí solo puede venir de un token GUARDADO que ya no vale (rotado
       o mal copiado). Se olvida y se reintenta SIN él: la lista pública sigue
       estando disponible, así que degradar es mejor que bloquear al cliente
       con un formulario que no necesita para nada. */
    if (r.status === 401) {
      olvidarToken();
      return buscar();
    }
    /* El perfil de un RUP subido CADUCA (TTL en el servidor). El 404 trae
       `perfil_caducado` para poder distinguirlo de cualquier otro error: se
       olvida el perfil guardado y se dice qué hacer — dejarlo puesto haría
       fallar todas las visitas siguientes con el mismo mensaje. Se olvida
       SOLO si el guardado es el que acaba de caducar: con `?perfil=rup_A`
       vencido en la URL y un rup_B válido guardado, borrar a ciegas se
       llevaría el perfil bueno por el malo. */
    if (r.status === 404 && cuerpo && cuerpo.perfil_caducado) {
      const guardado = perfilRupGuardado();
      if (guardado && guardado.id === $("f-perfil").value) olvidarPerfilRup();
      return mostrar("estado-error", cuerpo.error || "El perfil de su RUP caducó. Vuelva a la página de inicio y súbalo de nuevo.");
    }
    if (!r.ok || !cuerpo || !cuerpo.ok) {
      return mostrar("estado-error", (cuerpo && cuerpo.error)
        || (cuerpo === null
          ? fraseDeFallo({ status: r.status })
          : fraseDeFallo({ status: r.status })));
    }

    reintentosSync = 0;
    /* Refresco en segundo plano SOLO si el corte no es fresco (6-sep-2026,
       M-INF-10): con `sincronizado_fresco: true` el servidor respondería «al
       día» tras tomar y soltar el candado y correr el índice de baja —decenas
       de comandos de Redis por cada filtro pulsado; la suite imprime la
       cifra—. Con false, o sin el campo (respuesta de una versión
       vieja, o sin corte conocido porque la cadena de la full pudo morir), se
       dispara como hasta hoy: el umbral vive en el servidor, no aquí. */
    if (cuerpo.sincronizado_fresco !== true) fetch("/api/procesos?op=sync&modo=auto", opcionesSync()).catch(() => {});
    if (cuerpo.sincronizado) pintarCorte(cuerpo.sincronizado, cuerpo.ultimo_error || null);
    ultimasFacetas = cuerpo.facetas || ultimasFacetas;
    pintarControlesFiltros();
    if (!cuerpo.total) return pintarVacio(cuerpo);
    pintar(cuerpo);
  }

  /* Primera visita con Redis vacío: el backend ya disparó /api/sync. Aquí se
     refuerza (por si el fire-and-forget del servidor murió) y se reintenta. */
  function esperarSincronizacion() {
    reintentosSync++;
    if (reintentosSync > MAX_REINTENTOS_SYNC) {
      return mostrar("estado-error", "La sincronización con SECOP II está tardando más de lo normal. Intente de nuevo en unos minutos.");
    }
    fetch("/api/procesos?op=sync&modo=auto", opcionesSync()).catch(() => {});
    let restante = REINTENTO_SYNC_SEG;
    const tic = () => {
      mostrar("estado-carga",
        `Sincronizando datos de SECOP II por primera vez… reintento en ${restante} s (intento ${reintentosSync}/${MAX_REINTENTOS_SYNC}). Puede tardar unos minutos.`);
      if (restante-- <= 0) return buscar();
      timerReintento = setTimeout(tic, 1000);
    };
    tic();
  }

  /* ══════════ Pintado ══════════ */
  /* `esc` vive en la cabecera compartida */

  function chip(texto, clases, titulo) {
    const t = titulo ? ` title="${esc(titulo)}"` : "";
    return `<span${t} class="rounded-full px-2.5 py-0.5 text-xs font-medium ${clases}">${texto}</span>`;
  }

  /* ══════ EL RESUMEN DE UN PLIEGUE (5-sep-2026) ══════
     Un pliegue cuyo título solo dice «Ajustes» o «Trámites y fechas» obliga a
     abrirlo para saber si guarda algo. El patrón «Título (N)» ya existía en la
     guía de Mis procesos y en la cobertura de códigos, escrito dos veces: aquí
     se declara UNA y lo llaman los dos, más los pliegues de Precios.

     Tres cosas que no son de adorno:
     · el conteo sale SOLO si hay algo que contar — un «(0)» promete un cuadro
       vacío, que es justo lo que este proyecto retiró el 4-sep;
     · `extra` es un dato del contenido (la fecha más próxima, cuántos ajustes
       cambió) y va detrás de un punto medio; sin dato, no va;
     · todo cabe en UN solo `<span>`: el `summary` es flex por el chevrón y en
       390 px el texto suelto junto a un elemento se parte en dos columnas
       (decisión del 4-sep-2026, con su censo en la suite). */
  function sufijoResumen(n, extra) {
    return (Number.isFinite(n) && n > 0 ? ` (${n})` : "") + (extra ? ` · ${extra}` : "");
  }
  function resumenSummary(titulo, n, extra) {
    return `<span class="min-w-0 flex-1">${esc(titulo)}${esc(sufijoResumen(n, extra))}</span>`;
  }

  /* `cuantia` es el presupuesto oficial de ESTE proceso (`l.cuantia_cop`), que
     la tarjeta ya enseña dos filas más arriba. Con él, «Suelen bajar 8 %» se
     lee además en la unidad en la que se decide: «(unos $96M)».

     Tres cuidados, y los tres son reglas viejas de esta casa:
     · la cifra en pesos es APROXIMADA («unos») y solo SE MUESTRA: quien decide
       sigue siendo la mediana exacta, que viaja intacta en el `title`;
     · sin base (`procesos_contados` en 0 o mediana nula) no hay porcentaje que
       traducir, y el chip dice «sin datos» como siempre;
     · sin cuantía publicada NO sale ningún peso. `Number(null)` vale 0, así que
       la ausencia se descarta ANTES de convertir: un «(unos $0M)» sería una
       cifra creíble y falsa justo al lado de la que decide. */
  function chipBaja(b, cuantia) {
    const nivel = (b && b.nivel) || "sin_dato";
    const procesos = Number(b && b.procesos_contados) || 0;
    const mediana = b && b.baja_mediana != null ? Number(b.baja_mediana) : null;
    // misma invariante que la banda de competencia: sin base no se interpola
    // una cifra. `procesos_contados` sí viaja, es un hecho y explica el gris.
    const conBase = nivel !== "sin_dato" && mediana != null && !isNaN(mediana) && procesos > 0;
    const d = conBase ? (BAJA_MERCADO[nivel] || BAJA_MERCADO.sin_dato) : BAJA_MERCADO.sin_dato;
    if (!conBase) {
      return chip(`${window.Glosario.corto("baja_mercado")}: sin datos`, d.clases,
        (b && b.mensaje) || "No hay procesos adjudicados suficientes para estimar el descuento");
    }
    const base = cuantia == null || cuantia === "" ? null : Number(cuantia);
    const enPesos = base != null && Number.isFinite(base) && base > 0 && mediana > 0
      ? ` (unos ${fmtCorto(base * mediana / 100)})` : "";
    return chip(`${window.Glosario.corto("baja_mercado")} ${fmtNum.format(mediana)} %${enPesos}`, d.clases, b.mensaje);
  }

  /* Chip de zona (lib/accesibilidad, encargo ago 2026): la etiqueta y el
     mensaje llegan REDACTADOS del servidor — con «estimado» y «verificá la
     zona» donde tocan, porque las distancias son aproximadas y las alertas
     orientativas. El color dice lo que decide: verde cerca, gris medio o sin
     dato, ámbar lejos o por verificar, rojo acceso difícil. Sin campo `zona`
     (respuesta vieja) no se pinta nada: jamás se inventa. */
  function chipZona(z) {
    if (!z || !z.etiqueta) return "";
    const clases = z.dificil_acceso ? "bg-red-100 text-red-700"
      : z.verificar_orden_publico ? "bg-amber-100 text-amber-800"
        : z.nivel === "cerca" ? "bg-green-100 text-green-800"
          : z.nivel === "lejos" ? "bg-amber-100 text-amber-800"
            : "bg-gray-100 text-gray-600";
    /* Lo que DECIDE va en el texto, no en el `title` (en el teléfono no hay
       tooltip): el color ámbar por orden público no dice por qué es ámbar. Se
       usan las MISMAS palabras que la guía de Mis procesos ya pinta para la
       misma zona, no unas equivalentes. La redacción larga del servidor
       (`z.mensaje`, los kilómetros y de dónde salen) se queda en el `title`:
       la etiqueta ya lleva la distancia y la base. */
    return chip(esc(z.etiqueta) + alertasZona(z), clases, z.mensaje || "");
  }
  /* UNA alerta por chip, con las palabras de la guía (6-sep-2026, B2b-H6): las
     dos banderas del destino se ponen en texto AQUÍ, y el servidor ya no las
     repite en la etiqueta. «Acceso difícil» sí es la etiqueta entera cuando la
     zona es de difícil acceso (sustituye a la distancia, que allí no manda), y
     por eso no se le añade «· difícil acceso» detrás. Lo usan el chip de la
     tarjeta y la guía de Mis procesos; la suite recorre TODOS los departamentos
     con y sin base y exige que cada alerta salga exactamente una vez. */
  function alertasZona(z) {
    const etiqueta = String(z.etiqueta || "");
    return `${z.dificil_acceso && !/acceso difícil/i.test(etiqueta) ? " · difícil acceso" : ""}${z.verificar_orden_publico ? " · verifique la seguridad de la zona" : ""}`;
  }

  /* Cierre con CUENTA REGRESIVA: «Cierra 15 sept. 2026» obliga a calcular
     mentalmente cuánto falta, que es justo lo que decide si vale la pena
     empezar la carpeta. La resta usa `ahora − 5 h` (la regla del proyecto:
     el dataset publica hora Colombia flotante que Date.parse lee como UTC,
     adelantada 5 h — sin la resta, «cierra hoy» se diría un día antes). */
  function diasParaCierre(cierre) {
    if (!cierre || isNaN(cierre)) return null;
    const dias = Math.ceil((cierre.getTime() - (Date.now() - 5 * 3600 * 1000)) / 86400000);
    return Number.isFinite(dias) ? dias : null;
  }
  function chipCierre(cierre, cierreTxt, dias) {
    if (!cierreTxt) return "";
    if (dias == null || dias < 0) return chip(`Cierra ${cierreTxt}`, "bg-purple-100 text-purple-800");
    if (dias === 0) return chip(`Cierra HOY · ${cierreTxt}`, "bg-red-100 text-red-700", "Regla del oficio: la oferta se presenta el día ANTERIOR al cierre");
    if (dias <= 3) return chip(`Cierra en ${dias} día${dias === 1 ? "" : "s"} · ${cierreTxt}`, "bg-red-100 text-red-700",
      "Queda poco margen: la oferta se presenta el día anterior al cierre");
    if (dias <= 7) return chip(`Cierra en ${dias} días · ${cierreTxt}`, "bg-amber-100 text-amber-800");
    return chip(`Cierra en ${dias} días · ${cierreTxt}`, "bg-purple-100 text-purple-800");
  }

  /* La regla de las 24 horas, VISIBLE cuando decide. Vivía solo en el `title`
     del chip, que en móvil no existe y en escritorio exige pasar el mouse: el
     error #1 del país (presentar el día del cierre) merece una línea a la
     vista, no un secreto para quien sepa buscarlo. Solo aparece a ≤2 días —
     un aviso encendido en cada tarjeta se deja de leer. */
  /* LA SEÑAL #11 DEL MANUAL ES AMBIGUA, Y CALLARLO ES AFIRMAR (ago 2026).
     «Poca competencia» se pinta en VERDE, y con razón: el orden por defecto de
     la app (`atractividad`) es literalmente la Palanca 4 —donde compite menos
     gente se gana más—. Pero el MISMO hecho sostiene la lectura contraria del
     manual: la señal #11 de pliego sastre es «uno o dos oferentes en el
     histórico de esa entidad». Un pliego escrito para alguien ahuyenta a los
     demás y produce exactamente la cifra que la app premia. El dato no alcanza
     para decidir cuál de las dos es, así que se dicen las DOS. El modal «Quién
     gana aquí» ya lo hacía, pero eso exige un clic y lo que decide la mañana es
     el vistazo.
     NO se toca el color: cambiarlo a ámbar afirmaría la lectura mala con la
     misma falta de evidencia con la que hoy se afirma la buena.
     Y se avisa SOLO por debajo de 2 oferentes de media —el umbral LITERAL de la
     señal #11—, no en toda la banda «baja»: en un listado ordenado por
     atractividad la mayoría de las tarjetas de arriba son de competencia baja, y
     un aviso encendido en casi todas se deja de leer. Es la lección del chip
     constante que hubo que retirar. */
  const UMBRAL_SENAL_11 = 2;
  function avisoCompetencia(c) {
    if (!c) return "";
    const procesos = Number(c.total_procesos) || 0;
    const promedio = c.promedio_oferentes != null ? Number(c.promedio_oferentes) : null;
    const conBase = procesos > 0 && c.nivel !== "sin_dato" && promedio != null && !isNaN(promedio);
    if (!conBase || promedio >= UMBRAL_SENAL_11) return "";
    return `<p class="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900 ring-1 ring-inset ring-amber-600/20">`
      + `Atención: aquí se presentan ${esc(fmtNum.format(promedio))} oferentes en promedio. Puede ser un nicho suyo `
      + `—que es por lo que la aplicación se lo muestra primero— o un pliego escrito a la medida de otro. `
      + `El dato no distingue las dos: revise requisitos y plazos antes de invertir tiempo en la oferta.</p>`;
  }

  function avisoCierre(dias) {
    if (dias == null || dias < 0 || dias > 2) return "";
    const frase = dias === 0
      ? "Cierra HOY: solo cuenta la oferta en estado «Presentada» antes de la hora exacta — guardarla no basta."
      : dias === 1
        ? "Cierra mañana: presente la oferta HOY. El día del cierre es cuando más ofertas mueren."
        : "Presente la oferta a más tardar mañana: la regla del oficio es dejarla presentada el día ANTERIOR al cierre.";
    return `<p class="mt-3 rounded-lg bg-red-100 px-3 py-2 text-sm font-medium text-red-700">Atención: ${frase}</p>`;
  }

  /* AVISAR QUE LE INTERESA (menor cuantía) · CORREGIDO EL 20-AGO-2026.
     En esta modalidad no basta con ofertar: primero hay que avisar que le
     interesa, o el proceso se pierde antes de empezar.

     Lo que se enseñaba antes —«vence mañana, jueves 20»— era FALSO y costó un
     proceso: la ley fija un MÁXIMO de 3 días hábiles desde la apertura, no un
     plazo, y la entidad pone el suyo en el pliego (Motavita puso UNO). El
     servidor ya no manda una fecha de vencimiento: manda la VENTANA en la que
     el plazo puede cerrar y un estado de tres valores. Aquí solo se pinta lo
     que ese estado permite afirmar, y la cuenta atrás («vence mañana») EXIGE
     `confirmada`, que solo se pone con la fecha del cronograma del pliego. */
  function chipManifestacion(m) {
    if (!m || !m.aplica) return "";
    const nota = m.nota || "";
    const R = "bg-red-100 text-red-700", A = "bg-amber-100 text-amber-800", G = "bg-gray-100 text-gray-600";
    if (m.estado === "vencida") {
      return chip(`Avisar que le interesa · plazo vencido${m.confirmada ? ` el ${esc(m.fecha_limite_legible || "")}` : ""}`, G, nota);
    }
    if (m.estado === "sin_fecha") return chip("Avisar que le interesa · fecha por confirmar en SECOP II", A, nota);
    if (m.estado === "por_confirmar") {
      /* CON FECHA DEL PLIEGO, EL DÍA SÍ ESTÁ CONFIRMADO — lo que no consta es la
         HORA (el cronograma publica el día, nunca la hora, y una ventana de 4 u
         8 horas cierra a media jornada). Decir solo «verifique» tiraría un dato
         duro que el usuario ya tiene; decir solo «vence HOY» se lee como «tiene
         hasta medianoche». Se dicen las dos mitades. */
      if (m.confirmada) {
        return chip(`Avisar que le interesa · vence HOY (${esc(m.fecha_limite_legible || "")}) · puede haber cerrado ya`, R, nota);
      }
      // la ventana está corriendo: puede seguir abierto o haber cerrado ya
      return chip("Avisar que le interesa · verifique HOY si sigue abierto", R, nota);
    }
    // `abierta`: con certeza sigue abierta
    if (m.confirmada) {
      const d = m.dias_calendario, q = m.quedan_habiles;
      const cuando = d === 0 ? "vence HOY" : d === 1 ? "vence mañana" : `${q} día${q === 1 ? "" : "s"} de oficina`;
      return chip(`Avisar que le interesa · ${cuando} · hasta ${esc(m.fecha_limite_legible || "")}`, q != null && q <= 2 ? R : A, nota);
    }
    return chip(`Avisar que le interesa · el plazo puede cerrar el ${esc(m.puede_cerrar_desde_legible || "")}`, A, nota);
  }
  function avisoManifestacion(m) {
    if (!m || !m.aplica) return "";
    /* el TECHO viene del servidor (`plazo_maximo_habiles`): cablearlo aquí sería
       una segunda copia de la constante de lib/manifestacion */
    const tope = m.plazo_maximo_habiles || 3;
    let frase = "", rojo = true;
    if (m.estado === "por_confirmar" && m.confirmada) {
      frase = `el plazo para avisar que le interesa vence HOY (${esc(m.fecha_limite_legible || "")}), según el cronograma del pliego. El cronograma da el día, no la hora, así que puede haber cerrado ya: entre a SECOP II ahora. Sin eso no podrá presentar oferta a este proceso.`;
    } else if (m.estado === "por_confirmar") {
      frase = `el plazo para avisar que le interesa puede estar cerrando hoy o haber cerrado ya. La ley da un MÁXIMO de ${tope} días de oficina desde la apertura (${esc(m.apertura || "")}) y la entidad pudo poner menos en el pliego —a veces son solo unas horas—. Entre a SECOP II, mire el cronograma y avise antes de seguir: sin eso no podrá presentar oferta.`;
    } else if (m.estado === "abierta" && m.confirmada && m.dias_calendario != null && m.dias_calendario <= 1) {
      frase = m.dias_calendario === 0
        ? `el plazo para avisar que le interesa vence HOY (${esc(m.fecha_limite_legible || "")}). Sin eso no podrá presentar oferta a este proceso.`
        : `el plazo para avisar que le interesa vence mañana (${esc(m.fecha_limite_legible || "")}): hágalo hoy en SECOP II. Sin eso no podrá ofertar.`;
    } else if (m.estado === "abierta" && !m.confirmada) {
      frase = `en este proceso hay que avisar que le interesa antes de poder ofertar, y el plazo puede cerrar tan pronto como el ${esc(m.puede_cerrar_desde_legible || "")}. Hágalo hoy: la entidad fija el plazo en el pliego y suele ser más corto que el máximo de ley.`;
    } else if (m.estado === "sin_fecha") {
      /* NO SE PUEDE SITUAR EL PLAZO Y AUN ASÍ HAY QUE AVISARLO. Callarse aquí
         sería perder el proceso por un dato que falta, que es peor que un
         amarillo. Va en ÁMBAR y no en rojo: el rojo significa «actúe hoy» y
         aquí lo honesto es «verifíquelo», sin fingir una urgencia medida. */
      rojo = false;
      frase = `este proceso exige avisar que le interesa antes de poder ofertar y no se pudo situar el plazo con los datos publicados. Búsquelo en el cronograma del proceso en SECOP II antes de contar con él.`;
    } else return "";
    const pie = m.confirmada ? "Fecha tomada del cronograma del pliego."
      : "La ley fija un máximo, no un plazo: la fecha exacta está en el cronograma del proceso.";
    const piel = rojo ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-900";
    return `<p class="mt-3 rounded-lg ${piel} px-3 py-2 text-sm font-medium" title="${esc(m.nota || "")}">Atención: ${frase} <span class="font-normal">${pie}</span></p>`;
  }

  /* Veredicto GRADUADO del matching UNSPSC. Nunca es un sí/no: dice CON QUÉ
     FUERZA el proceso encaja en el RUP, y el detalle completo viaja en el
     title (por qué casó, con qué clase del RUP).
       clase       la clase del RUP contiene al código publicado → sólido
       familia     la entidad publicó a nivel de familia → amplio, ver pliego
       equivalente clase afín según el histórico de adjudicaciones
       texto       sin código utilizable; lo confirma el objeto */
  const MATCH_UNSPSC = {
    clase: { texto: "Encaja con su registro ✓", clases: "bg-green-100 text-green-800" },
    familia: { texto: "Encaja por familia ~ (verifique el pliego)", clases: "bg-lime-100 text-lime-800" },
    equivalente: { texto: "Encaja por afinidad ≈ (verifique el pliego)", clases: "bg-amber-100 text-amber-800" },
    texto: { texto: "Objeto sugiere obra", clases: "bg-amber-100 text-amber-800" },
    ninguno: { texto: "No encaja con su registro ✗", clases: "bg-red-100 text-red-700" },
  };
  /* Pertinencia del objeto: ¿es obra/consultoría o un servicio que se coló por
     tener un UNSPSC inscrito? Los rojos no deberían llegar nunca a la lista
     (se filtran en el servidor); el badge existe para que se note si uno pasa. */
  const PERTINENCIA = {
    verde: "bg-green-100 text-green-800",
    amarillo: "bg-amber-100 text-amber-800",
    rojo: "bg-red-100 text-red-700",
  };

  function badgesRup(rup) {
    const m = MATCH_UNSPSC[(rup && rup.tier) || "ninguno"] || MATCH_UNSPSC.ninguno;
    const u = (rup && rup.unspsc) || {};
    const detalle = [u.mensaje, u.codigo_proceso ? `Proceso: ${u.codigo_proceso}` : null,
      u.codigo_rup ? `RUP: ${u.codigo_rup}` : null].filter(Boolean).join(" · ");
    let salida = chip(m.texto, m.clases, detalle);
    const p = rup && rup.pertinencia;
    if (p) salida += chip(esc(p.etiqueta || ""), PERTINENCIA[p.nivel] || PERTINENCIA.amarillo, p.motivo || "");
    return salida;
  }

  /* Banda de competencia de la entidad. Sin índice construido todo cae en
     "sin_dato" y la tarjeta se ve igual que antes, sin líneas rotas.
     Es un BOTÓN: el promedio no puede ser una caja negra — al pulsarlo se
     abre el detalle con los procesos que lo sostienen. */
  /* REGLA (ago 2026, defecto de producción): el badge NUNCA enseña un número
     que no tenga detrás una clasificación real. Se vio «promedio 18.2 oferentes
     en 0 procesos» porque se pintaba el promedio del índice sin comprobar que
     hubiera base para él.

     Un promedio se pinta SOLO si se cumplen las tres cosas a la vez: hay
     procesos contados, el nivel está clasificado (baja/media/alta) y el
     promedio existe. En cualquier otro caso el badge dice «Sin datos
     históricos» y NO enseña ninguna cifra — el desglose (cuántos procesos hay y
     por qué no cuentan) está a un clic, en el modal, que es donde se puede
     explicar. El servidor ya impone la misma invariante en
     lib/indice_competencia.competenciaDe: esto es la segunda cerradura. */
  function bandaCompetencia(c, entidad) {
    const nivel = (c && c.nivel) || "sin_dato";
    const procesos = Number(c && c.total_procesos) || 0;
    const promedio = c && c.promedio_oferentes != null ? Number(c.promedio_oferentes) : null;
    const conBase = procesos > 0 && nivel !== "sin_dato" && promedio != null && !isNaN(promedio);
    const d = conBase ? (COMPETENCIA_ENTIDAD[nivel] || COMPETENCIA_ENTIDAD.sin_dato) : COMPETENCIA_ENTIDAD.sin_dato;
    const texto = conBase
      ? `${d.titulo} · ${fmtNum.format(promedio)} en ${procesos}`
      : d.titulo;
    return `<button type="button" data-entidad="${esc(entidad || "")}"
        title="${conBase ? "Ver los procesos que sostienen este promedio" : "Ver qué hay en el histórico de esta entidad"}"
        class="banda-competencia inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium ring-1 ring-inset transition hover:underline ${d.clases}">
        <span aria-hidden="true">${d.emoji}</span>${esc(texto)}
        <span aria-hidden="true" class="opacity-60">›</span>
      </button>`;
  }

  /* ══════════ Las cuatro puertas ══════════
     Sustituyen a la barra de puntaje 0-100. Un número sin unidades invitaba a
     leerse como probabilidad y su tercer componente era constante en todo lo
     servido (docs/ATRACTIVIDAD.md). Cada puerta enseña su veredicto Y la cifra
     que lo sostiene en el `title`: una puerta cerrada sin su número no se puede
     discutir ni corregir. */
  /* Los cuatro colores de los badges de puerta salen del ÚNICO semáforo de la
     aplicación (`Glosario.ESTADO`, 5-sep-2026): las mismas parejas fondo+texto
     de siempre, pero decididas en un solo sitio. Un quinto tono nuevo aquí
     volvería a partir el lenguaje de estado en dos. */
  /* SE BUSCA AL USARLO, NO AL CARGAR (5-sep-2026). Leer
     `window.Glosario.ESTADO.cumple.chip` a nivel de módulo hacía que un
     glosario que no llegara (404, red institucional que corta el archivo, un
     error de sintaxis) lanzara un TypeError MIENTRAS SE EVALÚA el IIFE: la
     aplicación entera moría con la pantalla limpia y la consola limpia. Es la
     misma clase de fallo mudo que costó el incidente del CDN, y contradecía el
     comentario que este mismo módulo lleva escrito arriba. Diferido, un
     glosario ausente rompe la función que lo necesita, no el módulo. */
  const EST_ = () => window.Glosario.ESTADO;

  /* El estado de una puerta se decide UNA sola vez: el chip de color y el
     renglón de texto lo LEEN de aquí. Dos escaleras «equivalentes hoy»
     divergen a la primera corrección (y esta ya tiene un `!pasa` que no es lo
     mismo que `pasa === false`). */
  function estadoPuerta(puerta) {
    const p = puerta || {};
    if (p.sin_dato) return "sin_dato";
    if (!p.pasa) return "no_cumple";
    if (p.advertencia) return "revisar";
    return "cumple";
  }
  function badgePuerta(etiqueta, puerta) {
    const p = puerta || {};
    const e = estadoPuerta(p);
    const EST = EST_();
    if (e === "sin_dato") return chip(`● ${etiqueta} ?`, EST.sin_dato.chip, p.mensaje || "Sin datos para evaluar este requisito");
    if (e === "no_cumple") return chip(`● ${etiqueta} ✗`, EST.no_cumple.chip, p.mensaje || "");
    if (e === "revisar") return chip(`● ${etiqueta} ~`, EST.revisar.chip, p.mensaje || "");
    return chip(`● ${etiqueta} ✓`, EST.cumple.chip, p.mensaje || "");
  }

  /* ══════════ El PORQUÉ de cada puerta, en texto (5-sep-2026) ══════════
     La cifra que sostiene el veredicto —«le quedan $1.200 M y la obra pide
     $980 M»— vivía SOLO en el `title` del chip, y en el teléfono no hay
     tooltip: la evidencia se perdía justo en el aparato donde más se consulta
     (la misma lección que la regla de las 24 horas y la de las variantes de
     precio). Ahora cada puerta es además un RENGLÓN con su mensaje entero,
     dentro del mismo pliegue «Más detalles»; el `title` del chip se queda como
     redundancia de escritorio.

     El mensaje ya viene REDACTADO de lib/puertas (`evaluarPuertas`): se llama,
     no se reescribe. Sin mensaje no hay renglón — jamás se inventa uno. */
  function badgesPuertas(puertas) {
    const g = puertas || {};
    const pares = [
      [window.Glosario.corto("rup"), g.p1_rup],
      [window.Glosario.corto("capacidad_contratacion"), g.p2_k],
      ["Caja", g.p3_caja],
      ["Competencia", g.p4_competencia],
    ];
    const chips = pares.map(([etiqueta, p]) => badgePuerta(etiqueta, p)).join("");
    const renglones = pares.map(([etiqueta, p]) => {
      if (!p || !p.mensaje) return "";
      const clr = window.Glosario.ESTADO[estadoPuerta(p)].clase;
      return `<li class="flex gap-2"><span class="${clr}" aria-hidden="true">●</span><span class="min-w-0"><span class="font-medium">${esc(etiqueta)}</span> · ${esc(p.mensaje)}</span></li>`;
    }).join("");
    return `<div class="mt-2 flex flex-wrap gap-2">${chips}</div>`
      + (renglones ? `<ul class="mt-2 space-y-1 text-xs text-gray-600">${renglones}</ul>` : "");
  }

  /* ══════════ Los requisitos, en UNA línea ══════════
     Cuatro chips «RUP ✓ · K ✓ · Caja ~ · Competencia ?» con tres símbolos
     distintos obligaban a un mapa mental que el contratista no tiene («K» no
     se explica en ninguna pantalla). La línea dice el VEREDICTO en palabras y
     conserva la evidencia: los cuatro badges siguen en «Más detalles» de la
     misma tarjeta, con sus cifras en el title.

     TRES estados, no dos: «viable pero con la caja ajustada» es una decisión
     de negocio (anticipo, crédito o consorcio), no un descarte — es la
     distinción pasa_rup_y_k / pasa_todas que el servidor publica aparte a
     propósito y que un booleano colapsaría. La P4 no entra en la línea:
     nunca bloquea, y la banda de competencia de arriba ya responde eso. */
  /* El veredicto de las cuatro puertas, en una línea. Dos cosas que costaron:
     · REGISTRO FORMAL (usted). El barrido de ago-2026 se saltó esta función y
       era la línea más visible de la aplicación: cada tarjeta decía «Cumplís
       los requisitos para presentarte». La prueba de registro solo miraba las
       frases de la portada; ahora mira también las de la tarjeta.
     · COHERENCIA CON EL PLAZO DE MANIFESTACIÓN. En la selección abreviada de
       menor cuantía, cumplir los requisitos NO basta si el plazo para avisar
       que le interesa ya venció: no se puede presentar. Decir «cumple los
       requisitos para presentarse» encima de un chip gris que dice «plazo
       vencido» son dos afirmaciones incompatibles en la misma tarjeta — el
       mismo defecto que costó el proceso de Motavita. NO se oculta el proceso
       (puede haber avisado a tiempo y la app no lo sabe: el falso negativo
       cuesta más), pero la línea lo dice y baja a ámbar. */
  function lineaRequisitos(puertas, manif, admiteOfertas) {
    const g = puertas || {};
    const detalle = [g.p1_rup, g.p2_k, g.p3_caja].map((p) => p && p.mensaje).filter(Boolean).join("\n");
    const linea = (clase, texto) =>
      `<p class="mt-3 text-sm font-medium ${clase}"${detalle ? ` title="${esc(detalle)}"` : ""}>● ${esc(texto)}</p>`;
    /* TODAVÍA NO ADMITE OFERTAS, y va lo PRIMERO: da igual que cumpla o no los
       requisitos si hoy no se le puede presentar nada. Solo con el literal
       «Borrador»; un estado ausente o desconocido nunca lo dispara. No se
       esconde el proceso: si es el proyecto de pliego, es la ventana para
       observar, que el manual llama la más desaprovechada del oficio. */
    if (admiteOfertas === false) {
      return linea("text-amber-700",
        "Todavía no admite ofertas: está en borrador. Es el momento de observar el pliego, no de preparar la oferta.");
    }
    if (g.p1_rup && g.p1_rup.pasa === false) return linea("text-red-700", "Esta obra no encaja con su RUP.");
    if (g.p2_k && g.p2_k.pasa === false) return linea("text-red-700", "Supera su capacidad de contratación.");
    const plazoIdo = !!(manif && manif.aplica && manif.estado === "vencida");
    if (g.p3_caja && g.p3_caja.pasa === false) {
      return linea("text-amber-700", plazoIdo
        ? "Financiarla está justo — y además el plazo para avisar que le interesa ya venció: solo puede presentarse si avisó a tiempo."
        : "Puede presentarse, pero financiarla está justo: considere anticipo, crédito o consorcio.");
    }
    if (plazoIdo) return linea("text-amber-700", "Cumple los requisitos, pero el plazo para avisar que le interesa ya venció: solo puede presentarse si avisó a tiempo.");
    const conAviso = [g.p1_rup, g.p2_k, g.p3_caja].some((p) => p && (p.sin_dato || (p.pasa && p.advertencia)));
    if (conAviso) return linea("text-amber-700", "Cumple los requisitos, con detalles por revisar.");
    return linea("text-green-700", "Cumple los requisitos para presentarse.");
  }

  /* Probabilidad y valor esperado. La probabilidad SIEMPRE viaja con su fuente:
     «histórico de la entidad» no es lo mismo que «supuesto conservador», y
     enseñar el 17 % sin decir de dónde sale es lo que convierte una estimación
     en una promesa. */
  const FUENTE_P = {
    entidad: "Basada en el histórico de oferentes de esta entidad",
    departamento: "La entidad no tiene histórico suficiente: se usa el promedio de su departamento",
    conservador: "Sin histórico de la entidad ni del departamento: supuesto conservador de 5 rivales",
  };

  /* ══════════ Probabilidad en LENGUAJE CLARO (encargo, ago 2026) ══════════
     El porcentaje seco («23 %») exigía saber si eso es bueno o malo en este
     mercado; la tarjeta lo traduce a una frase con semáforo. La CIFRA no se
     pierde: vive en el modal de desglose (seis pasos con fórmulas y fuentes),
     que se abre pulsando la frase. Los rangos son los del encargo, y `null` es
     «Sin información suficiente» — JAMÁS un 0 %, que afirmaría «imposible»
     sobre un proceso del que no se sabe nada (la regla de anticipo_pct = 0). */
  /* `clase` colorea el punto tipográfico: un ● idéntico en los cinco niveles
     no distingue nada (el defecto del chip constante, en miniatura). El color
     lo pone una utilidad del tema — el glifo lo hereda, nunca un emoji. */
  function fraseProbabilidad(p) {
    const n = Number(p);
    if (p == null || !Number.isFinite(n)) return { icono: "●", clase: "text-gray-400", frase: "Sin información suficiente" };
    if (n > 0.40) return { icono: "●", clase: "text-green-600", frase: "Probabilidad muy alta" };
    if (n >= 0.20) return { icono: "●", clase: "text-yellow-500", frase: "Buena probabilidad" };
    if (n >= 0.10) return { icono: "●", clase: "text-orange-500", frase: "Probabilidad media" };
    return { icono: "●", clase: "text-red-500", frase: "Poco probable" };
  }

  /* ══════════ FRECUENCIA NATURAL · «1 de cada N», no «17 %» ══════════════════
     EL PORCENTAJE SE LEE MAL, Y ES UN PROBLEMA DE SEGURIDAD DEL PRODUCTO, no de
     redacción. El dueño lo dijo con el caso exacto: «por el nombre un
     contratista piensa que si tiene un 60 % de probabilidad de ganar y se
     presenta con 5 empresas distintas, va a ganar». Un porcentaje invita a
     sumar; una frecuencia no. «De cada 6 procesos como este, gana 1» hace
     evidente que se pueden perder los seis, que es la verdad.

     Y hay una segunda mentira en la palabra: «probabilidad» suena a medición.
     No lo es. El motor calcula 1/(1+rivales) con ajustes que el propio código
     documenta como SUPUESTOS CON NOMBRE, sin etiqueta contra la cual
     calibrarlos. Lo único medido de verdad es CUÁNTA GENTE COMPITE, y eso un
     contratista lo entiende sin que nadie se lo explique.

     Por eso la tarjeta enseña el hecho medido primero y la frecuencia después,
     y el porcentaje deja de aparecer donde alguien pueda tomarlo por una
     promesa. La cifra NO desaparece del sistema: sigue en el desglose (para
     quien la quiera auditar) y en el editor de APU, donde multiplica al margen
     y es una cuenta, no un mensaje.

     `N = 1/p` es exacto: sobre N procesos, los aciertos esperados son N × p, y
     N × p = 1 ⟺ N = 1/p. Se redondea y se dice «aproximadamente». Con p = null
     devuelve `null` —«no hay con qué estimarlo»— y JAMÁS «0 de cada N», que
     afirmaría imposibilidad sobre un proceso del que no se sabe nada (R1). */
  function frecuenciaNatural(p) {
    const n = Number(p);
    if (p == null || !Number.isFinite(n) || n <= 0) return null;
    // el suelo de 2 evita «de cada 1 proceso gana 1», que prometería certeza
    const deCada = Math.max(2, Math.round(1 / n));
    return { de_cada: deCada, frase: `De cada ${deCada} procesos como este, gana 1 aproximadamente.` };
  }

  /* CUÁNTA GENTE COMPITE — el único dato medido de la cadena, y el que de
     verdad decide. Devuelve `null` cuando no hay base: inventar un promedio
     sería exactamente el defecto de producción que este proyecto ya pagó
     («18.2 oferentes» sin base debajo). */
  function cuantosCompiten(l) {
    const comp = l.competencia_entidad || {};
    const promedio = comp.promedio_oferentes == null ? null : Number(comp.promedio_oferentes);
    const procesos = Number(comp.total_procesos);
    if (promedio == null || !Number.isFinite(promedio) || !Number.isFinite(procesos) || procesos <= 0) return null;
    const redondeado = Math.max(1, Math.round(promedio));
    return {
      promedio, procesos,
      frase: `Aquí suelen competir ${redondeado} ${redondeado === 1 ? "empresa" : "empresas"}.`,
    };
  }

  /* UNA frase (≤12 palabras) con el factor principal, en orden de prioridad
     del encargo. Ninguna interpola una cifra sin base: es la invariante de
     `bandaCompetencia` aplicada al texto. */
  function motivoProbabilidad(l) {
    const comp = l.competencia_entidad || {};
    const baja = l.baja_mercado || {};
    const promedio = comp.promedio_oferentes == null ? null : Number(comp.promedio_oferentes);
    const procesos = Number(comp.total_procesos);
    const conComp = Number.isFinite(procesos) && procesos > 0 && promedio != null && !isNaN(promedio);
    if (comp.nivel === "baja" && conComp && promedio <= 2) {
      return `Poca competencia en esta entidad (~${fmtNum.format(promedio)} oferentes).`;
    }
    if (l._cierre_prorrogado) return "El cierre fue prorrogado: hay más tiempo.";
    const ajustes = (l.p_ganar_detalle || {}).ajustes || [];
    if (ajustes.some((a) => /colisi/i.test(a.nombre || "") && a.factor !== 1)) {
      return "Varios procesos cierran el mismo día.";
    }
    /* La BAJA de la entidad ya NO mueve la probabilidad por sí sola (A4, ago
       2026): lo que la mueve es hasta dónde puede bajar el dueño frente a ese
       centro, y solo cuando lo declaró. El chip «Suelen bajar N %» sigue en la
       tarjeta como instrucción de precio; aquí solo se nombra cuando de verdad
       restó. `baja` se conserva para el caso público (sin cifra). */
    void baja;
    const precio = ajustes.find((a) => a.nombre === "precio");
    if (precio && precio.factor != null && precio.factor < 1) return "Aquí suelen bajar más de lo que usted puede bajar.";
    const d = l.p_ganar_detalle || {};
    if (d.encogido && d.peso_datos != null && d.peso_datos < 0.5) {
      const apoyo = /^departamento:/.test(d.prior_origen || "") ? "el promedio de su departamento" : "el promedio general";
      return conComp
        ? `Pocos procesos de esta entidad (${fmt.format(procesos)}): la cifra se apoya en ${apoyo}.`
        : `Pocos procesos de esta entidad: la cifra se apoya en ${apoyo}.`;
    }
    if (conComp) return `Basado en ${fmt.format(procesos)} procesos históricos de esta entidad.`;
    if (d.encogido && Number.isFinite(procesos) && procesos > 0) return `Basado en ${fmt.format(procesos)} procesos históricos de esta entidad.`;
    return "Sin histórico de la entidad: supuesto conservador de 5 rivales.";
  }

  /* La frase es CLICABLE (ago 2026): abre el desglose paso a paso.
     El subrayado punteado es lo que anuncia que se puede pulsar — un texto que
     esconde un modal sin ninguna marca es un modal que nadie encuentra. El
     `title` con el resumen de los ajustes SE CONSERVA: sigue siendo la
     respuesta de 1 segundo, y el modal es la de 30. */
  /* La tercera celda de la franja: LO QUE DEJA EL CONTRATO. Recibe `celda` para
     no duplicar la plantilla — es la misma franja y tiene que verse igual. */
  function bloqueGanancia(l, celda) {
    const g = l.ganancia;
    /* Sin cifra de ganancia NO se resucita el valor esperado: era exactamente
       la cifra que el dueño reportó como leída al revés («el cliente asume que
       es lo que le queda de ganancia»), y devolverla por la puerta del
       respaldo convertiría este arreglo en la regresión que vino a corregir.
       `ve` sigue vivo: ordena la lista y tiene su propio orden con su nombre
       («Mayor contrato esperado»). Aquí se dice qué falta. */
    if (!g || g.valor == null) {
      const motivo = g && g.frase ? g.frase : "";
      return celda("—", "sin cifra de lo que deja", "",
        motivo || "Sin presupuesto oficial publicado no hay con qué calcular lo que deja este contrato.");
    }

    /* ⚠️ SIN COSTO MEDIDO NO HAY CIFRA DE GANANCIA, Y ESA ES LA CORRECCIÓN
       (24-ago-2026, reportada por el ingeniero: «no me gusta nada el valor
       aproximado de ganancia»).

       Lo que se pintaba era un rango —«−$32M a $257M · puede costarle o
       dejarle»— y el problema no era la redacción: era que el número no
       contenía ni un dato del proceso. Sin APU costeado, `lib/ganancia` cierra
       el costo por la identidad del precio (CD = V / (1 + (A+I+U)/100)), así
       que la cuenta se reduce algebraicamente a `V × k`, con
       `k = U/(1+A+I+U) − τ`: una CONSTANTE que sale de la estructura que
       tecleó el propio usuario y del tipo de trabajo. Medido: con la
       estructura de referencia el rango es EXACTAMENTE −1,00 % a +8,00 % del
       precio en todos los procesos —$50 M, $500 M, $3.216 M, $20.000 M—, con
       correlación −1,0000 entre el extremo malo y la cuantía. Era la cuantía
       reescalada, pintada al lado de la cuantía.

       Es el defecto del chip constante de `nivel_competencia` y el de «18,2
       oferentes sin base», en la tercera celda: una cifra idéntica en todas
       las tarjetas no distingue ninguna. Y el veredicto tampoco era del
       proceso: `depende` salía en toda obra con la estructura de referencia
       —el 74 % de la lista— porque la ganancia declarada del 5 % no cubre la
       contribución del 5 %.

       Con costo MEDIDO la misma cuenta sí informa: sobre la misma cuantía y
       costos directos de $2.000 M a $2.800 M el margen recorre +16,45 % →
       −14,97 % y el veredicto pasa de `deja` a `pierde`. Por eso la celda se
       parte por `base` y no por veredicto:
       · `apu` → UNA cifra, la del peor caso, que con costo medido es un suelo
         real y no un extremo retórico. El rango entero sigue en el detalle,
         que ya existe, ya cuadra al peso y se abre pulsando la propia cifra.
       · `estructura_de_precio` → la celda deja de fingir una medición y pide
         lo único que la convierte en una: el costo. Es además lo único que
         mejora la aplicación con el uso. */
    if (g.base !== "apu") {
      /* El hecho MEDIDO que sí es de este proceso viaja en el título: a qué
         precio suele adjudicar esta entidad y sobre cuántos contratos. La
         celda es el botón que abre el editor ya precargado con el proceso —el
         mismo camino del botón «APU», con la misma cadena de parámetros—, así
         que la acción está a un clic de la pregunta. */
      const refPrecio = g.origen_precio === "mercado"
        ? `Aquí se suele adjudicar a ${pesos(g.precio_esperado)}${g.baja_aplicada_pct != null ? ` (${nf2.format(g.baja_aplicada_pct)} % por debajo del presupuesto` : ""}${g.baja_procesos != null ? `, medido en ${fmt.format(g.baja_procesos)} contratos)` : g.baja_aplicada_pct != null ? ")" : ""}.`
        : `Sin historial suficiente de esta entidad para saber a qué precio suele adjudicar: la referencia es el presupuesto oficial (${pesos(g.precio_esperado)}).`;
      const titulo = [
        "Para saber cuánta plata deja este contrato hace falta su costo, y todavía no lo ha calculado.",
        refPrecio,
        "Sin el costo, la cuenta se cerraría con su propia estructura de precio y el resultado sería la cuantía multiplicada por una constante: el mismo porcentaje en todas las licitaciones. No es un dato de este proceso, así que no se enseña.",
        "Pulse para calcular el costo de este proceso en Precios.",
      ].join("\n");
      /* ⚠️ SIN COSTO, LA CELDA ENSEÑA EL HECHO MEDIDO EN VEZ DE UN HUECO
         (encargo del ingeniero, ago 2026: «datos reales siempre», y la decisión
         de qué poner aquí me la delegó). Lo único que se sabe de ESTE proceso y
         es una MEDICIÓN es a qué precio suele adjudicar esta entidad: sale de
         `lib/indice_baja` sobre contratos ya adjudicados, con mínimo de 5, y es
         además el número con el que se decide a cuánto ofertar.
         Solo se enseña con `origen_precio === "mercado"`. Con «oficial» no hay
         medición —la referencia sería el presupuesto, que ya está en la tarjeta
         dos centímetros más arriba— y repetirlo con otro rótulo sería fingir un
         segundo dato. Ahí la celda sigue pidiendo el costo, que es lo honesto.
         La cifra SIGUE siendo el botón que abre Precios con el proceso
         precargado: el dato y la acción, en el mismo sitio. */
      const hayMercado = g.origen_precio === "mercado" && g.precio_esperado != null;
      const etiqueta = hayMercado ? esc(fmtCorto(g.precio_esperado)) : "Calcular";
      const boton = `<button type="button" class="btn-apu cifra-pulsable" data-apu-q="${esc(qApu(l))}"
        aria-label="${hayMercado ? "Ver a qué precio suele adjudicar esta entidad y calcular su costo en Precios" : "Calcular en Precios cuánto cuesta este proceso"}">${etiqueta}</button>`;
      return hayMercado
        ? celda(boton, "es lo que suele pagar esta entidad",
          g.baja_procesos != null ? `medido en ${fmt.format(g.baja_procesos)} contratos` : "medido en contratos ya adjudicados", titulo)
        : celda(boton, "cuánto deja: falta su costo", "se calcula en Precios", titulo);
    }

    /* CON COSTO MEDIDO: una sola cifra. El peor caso es el suelo —la reserva
       de imprevistos gastada entera y la contribución descontada— y por eso es
       el que se puede afirmar sin condiciones. El mejor caso y la cascada
       completa viven en el detalle, a un clic. */
    const v = g.veredicto;
    /* ⚠️ EL RÓTULO SIGUE AL SIGNO DE LA CIFRA QUE SE PINTA, NO AL VEREDICTO
       (24-ago-2026). Se decidía por `v`, así que un presupuesto ya costeado con
       veredicto `depende` —peor caso negativo, mejor caso positivo: el caso
       normal cuando la reserva de imprevistos decide— salía como
       «−$10.000.000 · le quedan como mínimo si gana»: un número negativo bajo
       un rótulo que promete plata. Es exactamente la lectura invertida que esta
       celda existe para corregir, cometida dentro de la propia corrección. Lo
       cazó EJECUTAR la función con sus seis ramas, no leerla. */
    const cifra = v === "pierde" ? g.mejor : g.peor;
    /* `cifra` va ARRIBA a propósito: el rótulo la lee, y declararlo antes lo
       dejaba en la zona muerta temporal —`ReferenceError` dentro del renderizado
       de la tarjeta, o sea la lista entera rota—. La suite no lo habría visto:
       sus pruebas de esta celda miran el fuente con regex, no la ejecutan. */
    const rotulo = v === "pierde"
      ? "de pérdida aun en el mejor caso"
      : (Number(cifra) < 0 ? "podría perder, en el peor caso" : "le quedan como mínimo si gana");
    const lineas = [
      g.frase,
      `Precio de referencia: ${pesos(g.precio_esperado)}${g.origen_precio === "mercado"
        ? ` — al que suele adjudicar esta entidad${g.baja_procesos != null ? ` (${fmt.format(g.baja_procesos)} contratos${g.baja_aplicada_pct != null ? `, ${nf2.format(g.baja_aplicada_pct)} % por debajo del presupuesto` : ""})` : ""}.`
        : " — el presupuesto oficial: no hay historial suficiente de esta entidad para saber cuánto se suele bajar."}`,
      `Obra, administración e imprevistos: ${pesos(g.costo_sin_ganancia)} (con el costo que usted calculó en Precios).`,
      g.mejor != null && g.mejor !== g.peor ? `Si no gasta la reserva para imprevistos: ${copFirmado(g.mejor)}.` : null,
      g.tau_pct > 0 ? `Le descuentan de las actas: ${pesos(g.descuentos)} (${nf2.format(g.tau_pct)} %).` : null,
      g.por_intento != null ? `Ganancia media por intento: ${copFirmado(g.por_intento)}.` : null,
      ...(g.supuestos || []),
      `Es una cota superior: ${(g.cota_superior_por || []).join("; ")}.`,
      "Pulse la cifra para ver la cuenta completa.",
    ].filter(Boolean);
    const boton = `<button type="button" class="detalle-ganancia cifra-pulsable" data-id="${esc(l.id_del_proceso || "")}"
        data-objeto="${esc(l.nombre_del_procedimiento || l.id_del_proceso || "")}"
        aria-label="Ver cómo se calcula lo que deja este contrato">${esc(copFirmado(cifra))}</button>`;
    return celda(boton, rotulo, "con el costo que usted calculó", lineas.join("\n"),
      v === "pierde" ? "perdida" : "");
  }

  function bloqueProbabilidad(l) {
    const d = l.p_ganar_detalle || {};
    /* `a.factor` puede venir en `null`: sin token, lib/publico redacta el factor
       del ajuste por baja de mercado (es invertible y revelaría la mediana que
       `baja_mercado` acaba de ocultar). Sin esta guarda el cliente público —que
       es justo para quien se abrió el endpoint— leía «baja_mercado ×null: …».
       El ajuste SÍ se enseña: que exista es un hecho, y esconderlo sería otra
       forma de mentir. Lo que falta es la cifra, y el motivo ya lo explica. */
    const ajustes = (d.ajustes || [])
      .map((a) => `${a.nombre}${a.factor == null ? "" : ` ×${a.factor}`}: ${a.motivo}`).join("\n");
    // la BANDA (A6): con pocos datos la cifra se puede mover mucho, y se dice
    const banda = d.p_lo != null && d.p_hi != null
      ? `Banda del 90 %: ${Math.round(d.p_lo * 100)} %–${Math.round(d.p_hi * 100)} %` : "";
    const titulo = [FUENTE_P[d.fuente] || "", d.rivales_esperados != null ? `Rivales esperados: ${d.rivales_esperados}` : "", banda, ajustes,
      "Pulse para ver el desglose completo del cálculo"].filter(Boolean).join("\n");
    // sin id no hay nada que consultar: se pinta el texto de siempre, no un
    // botón que al pulsarlo tenga que disculparse
    const id = l.id_del_proceso || "";

    /* EL HECHO MEDIDO VA PRIMERO Y EN GRANDE; la frecuencia lo traduce a
       decisión. El porcentaje NO se pinta: ver «frecuenciaNatural».

       Y el VALOR ESPERADO se enuncia como lo que es: un promedio SOBRE
       INTENTOS, que ya lleva dentro las veces que no se gana. Decir «si te lo
       ganás, te quedan X» sería cometer, en la línea de abajo, el mismo error
       que las dos de arriba existen para corregir.

       (Los comentarios van AQUÍ y no dentro de la plantilla: un acento grave
       dentro de un template literal lo CIERRA, y app.js dejaba de compilar
       entero — la pestaña se moría en silencio, que es justo el modo de fallo
       que la suite vigila.) */
    const compiten = cuantosCompiten(l);
    const frec = frecuenciaNatural(l.p_ganar);
    /* El FACTOR PRINCIPAL (motivoProbabilidad) se pinta solo cuando trae una
       señal propia — poca competencia, prórroga, colisión de cierres, baja —:
       sus dos ramas de respaldo («Basado en…», «Sin histórico…») repiten lo
       que la fuente ya dice, y dos frases iguales enseñan menos que una. */
    const motivo = motivoProbabilidad(l);
    const motivoPropio = /^(Basado en|Sin histórico)/.test(motivo) ? "" : motivo;
    const fuente = compiten
      ? `Medido sobre ${fmt.format(compiten.procesos)} ${compiten.procesos === 1 ? "proceso" : "procesos"} de esta entidad.`
      : "Se asume la competencia típica de un proceso de obra (5 empresas), que es el supuesto prudente.";

    /* TRES CIFRAS EN UNA FRANJA, no tres párrafos (encargo del dueño, ago 2026:
       «demasiado texto»): cuántas compiten · de cada cuántos se gana uno ·
       cuánto deja por intento. Cada celda lleva su frase completa en el
       `title` (la que antes se leía) y la ausencia se pinta como «—» con su
       motivo, jamás como 0. El texto que quedaba explicando el valor esperado
       sigue ahí —«contando las veces que no se gana»— porque sin él la cifra se
       lee como ganancia condicional a ganar; ahora cabe en la nota. */
    const celda = (valor, rotulo, nota, titulo, extraCls = "") => `
        <div class="metrica ${extraCls}" title="${esc(titulo || "")}">
          <p class="metrica-valor">${valor}</p>
          <p class="metrica-rotulo">${esc(rotulo)}</p>
          ${nota ? `<p class="metrica-nota">${nota}</p>` : ""}
        </div>`;
    const cCompiten = compiten
      ? celda(`~${fmtNum.format(Math.max(1, Math.round(compiten.promedio)))}`, compiten.promedio >= 1.5 ? "empresas suelen competir" : "empresa suele competir", `en ${fmt.format(compiten.procesos)} procesos`, `${compiten.frase} ${fuente}`)
      : celda("—", "sin histórico de competencia", "supuesto: 5 rivales", fuente);
    const cGana = frec
      ? celda(`1 de ${frec.de_cada}`, "se gana, aproximadamente", motivoPropio ? esc(motivoPropio) : "", `${frec.frase}${motivoPropio ? " " + motivoPropio : ""}`)
      : celda("—", "sin datos para estimar", "", "Sin datos suficientes para estimar cuántas veces se gana algo así.");
    /* LA TERCERA CIFRA ES LA PLATA QUE QUEDA (ago 2026, encargo del dueño).
       Antes decía «$1.183M de contrato esperado por intento», que era el
       presupuesto oficial × la opción de ganar. Correcto y leído al revés: el
       dueño reportó que «el cliente asume que es lo que le queda de ganancia».
       Un número que se lee al contrario de lo que dice hace más daño que uno
       que falta, y este iba justo al lado de la cuantía, que es con lo que se
       confundía.

       Ahora la celda ES lo que el usuario creía estar leyendo: lo que le queda
       si gana el contrato (`lib/ganancia`, que lo calcula con la MISMA cuenta
       del panel Piso/Techo de Precios — la tarjeta y el editor no pueden decir
       dos cifras del mismo proceso). El valor esperado NO desaparece: sigue en
       `l.ve`, ordena la lista y se enuncia en el título como lo que es, un
       promedio por intento que cuenta las veces que no se gana.

       Tres estados y ninguno inventa nada: con plata a favor, en rojo cuando el
       contrato deja pérdida —con lo que habría que corregir, no un susto suelto—
       y «—» con su motivo cuando no hay con qué calcularlo. `l.ganancia` viaja
       en `null` sin credencial (sale de su costo y de su estructura de precio),
       y ahí también se dice. */
    const cDeja = bloqueGanancia(l, celda);
    return `
      <div class="metricas mt-4 grid grid-cols-3 rounded-xl" style="background: var(--bg-inset);">
        ${cCompiten}${cGana}${cDeja}
      </div>
      ${id
    ? `<p class="mt-1.5 text-right text-xs"><button type="button" class="detalle-probabilidad cursor-pointer underline decoration-dotted decoration-gray-400 underline-offset-4 transition hover:text-gray-900" style="color: var(--text-secondary);"
               data-id="${esc(id)}" data-objeto="${esc(l.nombre_del_procedimiento || id)}" title="${esc(titulo)}">Ver cómo se calcula</button></p>`
    : ""}`;
  }

  /* La querystring que antes viajaba a /apu.html: mismos nombres de parámetro
     (el editor los lee con el MISMO precargarDesdeURL de siempre). */
  function qApu(l) {
    const q = new URLSearchParams();
    if (l.nombre_del_procedimiento) q.set("objeto", l.nombre_del_procedimiento);
    if (l.entidad) q.set("entidad", l.entidad);
    if (l.nit_entidad) q.set("entidad_nit", String(l.nit_entidad));
    if (l.departamento_entidad) q.set("departamento", l.departamento_entidad);
    const unspsc = l.codigo_principal_de_categoria
      || (l.rup && l.rup.unspsc && l.rup.unspsc.codigo_proceso) || "";
    if (unspsc) q.set("unspsc", String(unspsc));
    if (l.cuantia_cop != null) q.set("cuantia", String(l.cuantia_cop));
    if (l.id_del_proceso != null) q.set("id_proceso", String(l.id_del_proceso));
    if (l.plazo_meses != null) q.set("plazo", String(l.plazo_meses));
    if (l.modalidad_de_contratacion) q.set("modalidad", l.modalidad_de_contratacion);
    if (l.filtro && l.filtro.tipo) q.set("tipo", l.filtro.tipo);
    q.set("perfil", $("f-perfil").value);
    return q.toString();
  }

  // el rango viaja en masculino del servidor («bajo/medio/alto» califica al
  // RANGO); en pantalla califica a «cuantía» y se concuerda
  const RANGO_CUANTIA = { bajo: "baja", medio: "media", alto: "alta" };

  function tarjeta(l) {
    const rup = l.rup || {};
    const cierre = l.fecha_cierre ? new Date(l.fecha_cierre) : null;
    const cierreTxt = cierre && !isNaN(cierre) ? cierre.toLocaleDateString("es-CO", { day: "numeric", month: "short", year: "numeric" }) : null;
    const diasCierre = diasParaCierre(cierre);
    const puertas = l.puertas || {};
    // «No viable» se ATENÚA, no se esconde (cuando el toggle lo permite): ver un
    // proceso grande caído por caja enseña más que su ausencia
    const noViable = l.viable === false;
    const motivos = (puertas.no_viable_por || []).join(" · ");

    return `
    <article class="tarjeta rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-900/5${noViable ? " opacity-50" : ""}">
      <div class="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between sm:gap-3">
        <div class="min-w-0 flex-1">
          <h3 class="titulo-tarjeta font-semibold leading-snug tracking-tight" title="${esc(l.nombre_del_procedimiento || "")}">${esc(l.nombre_del_procedimiento || l.id_del_proceso || "Proceso sin nombre")}</h3>
          <p class="mt-1 text-sm text-gray-500">${esc(l.entidad || "Entidad no informada")}${l.departamento_entidad && !/no definido/i.test(l.departamento_entidad) ? ` · ${esc(l.departamento_entidad)}` : ""}</p>
        </div>
        <div class="sm:text-right">
          ${l.cuantia_cop
    /* sin `|| 0`: un «$0» afirma que la obra vale cero pesos donde el dato no
       vino (R1, la invariante de la cabecera). El PAA ya lo decía bien. */
    ? `<p class="text-lg font-semibold tabular-nums">${fmtCOP.format(l.cuantia_cop)}</p>
          <p class="text-xs uppercase tracking-wide text-gray-400">cuantía ${esc(RANGO_CUANTIA[l.cuantia_rango] || l.cuantia_rango || "")}</p>`
    : '<p class="text-sm font-medium text-gray-400">Cuantía no publicada</p>'}
        </div>
      </div>

      ${noViable ? `<p class="mt-3">${chip(`No viable${motivos ? ` — ${esc(motivos)}` : ""}`, "bg-red-100 text-red-700 ring-1 ring-inset ring-red-600/20",
    "No cumple uno de sus requisitos: abra «Más detalles» para ver cuál")}</p>` : ""}

      ${lineaRequisitos(puertas, l.manifestacion, l.filtro && l.filtro.admite_ofertas)}

      ${bloqueProbabilidad(l)}

      <div class="mt-3 flex flex-wrap items-center gap-2">
        ${paaEncendido ? chip("Activo · abierto", "bg-green-100 text-green-800 ring-1 ring-inset ring-green-600/20",
    "Proceso PUBLICADO en SECOP II, con pliego y fecha de cierre — a diferencia de las previsiones del PAA") : ""}
        ${chipCierre(cierre, cierreTxt, diasCierre)}
        ${chipManifestacion(l.manifestacion)}
        ${bandaCompetencia(l.competencia_entidad, l.entidad)}
        ${chipZona(l.zona)}
        ${l._cierre_prorrogado ? chip("Cierre prorrogado", "bg-indigo-100 text-indigo-800", "El cierre se movió por adenda: suele indicar que no llegaron ofertas suficientes") : ""}
      </div>

      ${noViable ? "" : avisoCompetencia(l.competencia_entidad)}
      ${noViable ? "" : avisoCierre(diasCierre)}
      ${noViable ? "" : avisoManifestacion(l.manifestacion)}
      ${lineaMargen(l.margen_estimado)}
      ${bloqueAdendas(l.adendas)}

      <!-- Los chips de EVIDENCIA (puertas con sus cifras, anticipo, baja,
           ubicación, encaje del RUP, modalidad, tipo de precio) se conservan
           ENTEROS, plegados: quince chips visibles enterraban lo que decide.
           La información no se pierde — deja de estorbar. -->
      <details class="mt-3">
        <summary class="cursor-pointer text-xs text-gray-400 transition hover:text-gray-600">Más detalles</summary>
        ${badgesPuertas(puertas)}
        <div class="mt-2 flex flex-wrap gap-2">
          ${chip(l.anticipo_pct > 0 ? `Anticipo ${l.anticipo_pct}%` : "Anticipo no declarado", l.anticipo_pct > 0 ? "bg-blue-100 text-blue-800" : "bg-gray-100 text-gray-500")}
          ${chipBaja(l.baja_mercado, l.cuantia_cop)}
          ${chip(esc(`${l.ciudad_entidad || l.departamento_entidad || "Ubicación n/d"}`) + (l.ubicacion_valida ? " ✓" : ""), l.ubicacion_valida ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600")}
          ${badgesRup(rup)}
          ${rup.co_estimado ? chip("Capacidad calculada con ingreso estimado", "bg-gray-100 text-gray-500", "Cuánto puede facturar se calcula con un ingreso operacional estimado (no está en su registro): sirve para orientar, no para acreditar") : ""}
          ${l.modalidad_de_contratacion ? chip(esc(l.modalidad_de_contratacion), "bg-gray-100 text-gray-600") : ""}
          ${l.tipo_precio === "unitarios" ? chip("Precios unitarios", "bg-blue-100 text-blue-800",
    "Las cantidades del pliego son un estimativo: las mayores cantidades ordenadas deben reconocerse y pagarse") : ""}
          ${l.tipo_precio === "global" ? chip("Precio global", "bg-amber-100 text-amber-800",
    "El riesgo de cantidades es del contratista: no se reconocen mayores cantidades. Verifique el formulario del pliego antes de fijar el precio") : ""}
        </div>
      </details>

      <div class="mt-4 flex items-center justify-between gap-3 text-sm">
        <span class="text-gray-400">${esc(l.estado_del_procedimiento || "")}</span>
        <span class="flex items-center gap-3">
          ${botonGuardar(l)}
          <button type="button" class="btn-apu rounded-lg border border-gray-300 px-3 py-1 text-xs font-semibold transition hover:bg-gray-50"
                  data-apu-q="${esc(qApu(l))}" title="Calcular cuánto me cuesta y qué me deja este proceso, en la pestaña Precios">Calcular mi precio</button>
          ${urlSegura(l.urlproceso) ? `<a href="${esc(urlSegura(l.urlproceso))}" target="_blank" rel="noopener noreferrer" class="font-medium text-blue-600 hover:underline">Ver en SECOP II ↗</a>` : ""}
        </span>
      </div>
    </article>`;
  }

  /* El rótulo de «Solo cerca de mi zona» dice DESDE DÓNDE se midió (6-sep-2026,
     M-SEG-10): «(Bogotá / Ibagué)» solo cuando el servidor lo dice en
     `zona_base`; con null —un RUP subido o un consorcio a la medida no han
     dicho desde dónde operan— el filtro sigue retirando las alertas de acceso
     y el rótulo lo dice, en vez de prometer una cercanía que no se calculó. */
  function pintarBaseZona(zonaBase) {
    const rotulo = $("fl-zona-cerca-rotulo");
    if (!rotulo) return;
    rotulo.textContent = zonaBase
      ? `Solo cerca de mi zona (${zonaBase})`
      : "Solo zonas sin alertas de acceso — la distancia no se calcula porque no sabemos desde dónde opera su empresa";
  }

  function pintar(cuerpo) {
    ultimaBusqueda = cuerpo;
    mostrar("resultados");
    pintarBaseZona(cuerpo.zona_base == null ? null : String(cuerpo.zona_base));
    // el reparto por solidez del match dice de un vistazo cuántas son «RUP ✓»
    // y cuántas hay que verificar en el pliego
    const m = cuerpo.por_match || {};
    const porVerificar = (m.familia || 0) + (m.equivalente || 0) + (m.texto || 0);
    /* Contador siempre visible (Fase 8): «23 de 312 licitaciones» — el usuario
       tiene que ver cuánto está escondiendo con sus filtros. */
    /* la base es la lista POR DEFECTO (la misma N del pulso), no la anterior al
       filtro por defecto: «126 de 771», no «126 de 827» */
    const base = cuerpo.totalPorDefecto != null ? cuerpo.totalPorDefecto : (cuerpo.totalSinFiltros != null ? cuerpo.totalSinFiltros : cuerpo.total);
    const conFiltros = FL.fichas(estadoFiltros).length > 0;
    $("resumen-resultados").textContent =
      (conFiltros ? `${cuerpo.total} de ${base} licitaciones` : `${cuerpo.total} oportunidad${cuerpo.total === 1 ? "" : "es"}`)
      + ` para el perfil «${$("f-perfil").selectedOptions[0].text}»`
      + (cuerpo.ordenado_por === "margen" && cuerpo.margen
        ? ` · ordenadas por lo que le queda: ${cuerpo.margen.con_margen} con costo calculado${cuerpo.margen.borradores_sin_costo ? `, ${cuerpo.margen.borradores_sin_costo} borrador${cuerpo.margen.borradores_sin_costo === 1 ? "" : "es"} sin costo (vuelva a calcular y guardar)` : ""}; las demás sin referencia, abajo`
        : "")
      + (cuerpo.viables !== undefined ? ` · ${cuerpo.viables} cumplen sus requisitos` : "")
      + (cuerpo.no_viables ? `, ${cuerpo.no_viables} no viable${cuerpo.no_viables === 1 ? "" : "s"}` : "")
      + (m.clase !== undefined ? ` · ${m.clase} encajan con su registro de proponente${porVerificar ? `, ${porVerificar} por verificar en el pliego` : ""}` : "")
      + (cuerpo.incluye_sin_unspsc ? " · incluye procesos sin código de clasificación" : "");
    $("lista").innerHTML = cuerpo.resultados.map(tarjeta).join("");

    const totalPaginas = Math.max(1, Math.ceil(cuerpo.total / cuerpo.por_pagina));
    const pag = $("paginacion");
    if (totalPaginas <= 1) { pag.innerHTML = ""; return; }
    pag.innerHTML = `
      <button id="pag-ant" ${cuerpo.pagina <= 1 ? "disabled" : ""} class="rounded-lg border border-gray-300 bg-white px-3 py-1.5 disabled:opacity-40">← Anterior</button>
      <span class="text-gray-500">Página ${cuerpo.pagina} de ${totalPaginas}</span>
      <button id="pag-sig" ${cuerpo.pagina >= totalPaginas ? "disabled" : ""} class="rounded-lg border border-gray-300 bg-white px-3 py-1.5 disabled:opacity-40">Siguiente →</button>`;
    $("pag-ant")?.addEventListener("click", () => { pagina = Math.max(1, pagina - 1); buscar(); });
    $("pag-sig")?.addEventListener("click", () => { pagina++; buscar(); });
  }

  /* ══════════ Plan Anual de Adquisiciones ══════════
     Lo que la entidad PIENSA contratar en los próximos 12 meses. Va en su
     propia sección y con su propio badge: estos procesos NO existen todavía en
     SECOP II, no tienen pliego, no tienen fecha de cierre y no llevan
     probabilidad ni puertas — no hay nada que juzgar. Mezclarlos con la lista
     de procesos abiertos, aunque fuera con un badge distinto, los pondría en el
     mismo orden y los haría parecer comparables. */
  const MESES_ES = ["enero", "febrero", "marzo", "abril", "mayo", "junio",
    "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
  /* «2026-09-01» → «septiembre de 2026». Se formatea a mano y NO con `new
     Date(iso)`: esa cadena se interpreta como medianoche UTC y en Colombia
     (UTC-5) retrocede al mes anterior — el mes previsto saldría mal justo en
     los días 1, que es cuando cae la mayoría de las fechas del PAA. */
  function mesLegible(iso) {
    const m = String(iso || "").match(/^(\d{4})-(\d{2})/);
    if (!m) return null;
    return `${MESES_ES[Number(m[2]) - 1]} de ${m[1]}`;
  }

  function tarjetaPaa(p) {
    const mes = mesLegible(p.fecha_estimada_publicacion);
    /* `cuantia_estimada` llega en `null` cuando el PAA no trae el valor o lo
       trae en cero. NO se pinta un 0: eso diría «obra gratis» donde el dato es
       «sin diligenciar» (la regla de `anticipo_pct = 0`). */
    const valor = p.cuantia_estimada == null
      ? `<span class="text-sm text-gray-400">Valor estimado no publicado</span>`
      : `<span class="text-lg font-semibold tabular-nums">${fmtCOP.format(p.cuantia_estimada)}</span>`;
    return `
    <article class="rounded-xl bg-amber-50/60 p-4 ring-1 ring-inset ring-amber-600/20">
      <div class="flex flex-wrap items-start justify-between gap-3">
        <div class="min-w-0 flex-1">
          <h3 class="text-sm font-semibold leading-snug">${esc(p.objeto || "Objeto no informado")}</h3>
          <p class="mt-1 text-sm text-gray-500">${esc(p.entidad || "Entidad no informada")}</p>
        </div>
        <div class="text-right">${valor}</div>
      </div>
      <div class="mt-3 flex flex-wrap gap-2">
        ${chip("PAA · planeado", "bg-amber-100 text-amber-800 ring-1 ring-inset ring-amber-600/20",
    "Previsión del Plan Anual de Adquisiciones: la entidad piensa contratarlo, pero aún no lo ha publicado")}
        ${mes ? chip(`Previsto para ${mes}`, "bg-purple-100 text-purple-800",
    p.fecha_estimada_original ? `Dato de la fuente: ${p.fecha_estimada_original}` : "") : ""}
        ${p.modalidad ? chip(esc(p.modalidad), "bg-gray-100 text-gray-600") : chip("Modalidad no informada", "bg-gray-100 text-gray-400")}
        ${p.unspsc ? chip(`Código ${esc(p.unspsc)}`, "bg-gray-100 text-gray-600", "Código de clasificación del trabajo (el que trae el plan)") : ""}
        ${p.departamento_entidad ? chip(esc(p.departamento_entidad), "bg-gray-100 text-gray-600") : ""}
      </div>
    </article>`;
  }

  async function buscarPaa() {
    const seccion = $("paa");
    if (!paaEncendido) { seccion.classList.add("hidden"); return; }
    const peticion = ++peticionPaa;
    seccion.classList.remove("hidden");
    $("paa-resumen").textContent = "Consultando el Plan Anual de Adquisiciones…";
    $("paa-lista").innerHTML = "";
    $("paa-aviso").textContent = "";
    $("paa-censo").textContent = "";

    const qs = new URLSearchParams({ vista: "paa" });
    const ent = $("f-paa-entidad").value.trim();
    if (ent) qs.set("entidad", ent);
    let r, cuerpo;
    try {
      /* Se llama a la URL CANÓNICA del router (/api/inteligencia), no al alias
         `/api/paa` ni a la histórica /api/competencia-detalle: si el rewrite
         fallara, el PAA tiene que seguir funcionando. El token integrado viaja
         por cabecera y nunca en la URL. */
      r = await fetch(`/api/inteligencia?${qs}`, { headers: { "x-historico-token": leerToken() } });
    } catch {
      if (peticion !== peticionPaa) return;
      $("paa-resumen").textContent = "No se pudo contactar el servidor para consultar el PAA.";
      return;
    }
    // el parseo va aparte del fetch: el muro del edge responde HTML y `r.json()` lanza
    cuerpo = await leerJson(r);
    if (peticion !== peticionPaa) return;

    if (r.status === 401) {
      $("paa-resumen").textContent = msg401(cuerpo);
      return;
    }
    if (!r.ok || !cuerpo || !cuerpo.ok) {
      $("paa-resumen").textContent = (cuerpo && cuerpo.error)
        || (cuerpo === null
          ? fraseDeFallo({ status: r.status })
          : fraseDeFallo({ status: r.status }));
      return;
    }

    const v = cuerpo.ventana || {};
    const desde = mesLegible(v.desde), hasta = mesLegible(v.hasta);
    $("paa-resumen").textContent = cuerpo.total
      ? `${cuerpo.total} proceso${cuerpo.total === 1 ? "" : "s"} previsto${cuerpo.total === 1 ? "" : "s"}`
        + (desde && hasta ? ` entre ${desde} y ${hasta}` : "")
        + (ent ? ` · entidad «${ent}»` : "")
        + (cuerpo.recortados_en_la_respuesta ? ` · se muestran los ${cuerpo.max_resultados} más próximos` : "")
      : `Sin procesos previstos${ent ? ` para «${ent}»` : ""}${desde && hasta ? ` entre ${desde} y ${hasta}` : ""}.`;

    /* La advertencia se pinta SIEMPRE, también con la lista llena: es la mitad
       del significado de esta sección. Con la tasa MEDIDA se pinta la nota del
       SERVIDOR entera (cifra + vigencia + muestra + «cota inferior»): la cifra
       suelta sin su método diría más de lo que se midió. Sin medición se dice
       con esas palabras — un «alta» sin medición sería vender humo. */
    $("paa-aviso").textContent = cuerpo.tasa_de_acierto == null
      ? `${cuerpo.advertencia || ""} Tasa de acierto del PAA: sin medir por esta app.`
      : `${cuerpo.advertencia || ""} ${cuerpo.tasa_de_acierto_nota || `Tasa de acierto del PAA: ${cuerpo.tasa_de_acierto} %.`}`;
    $("paa-lista").innerHTML = cuerpo.resultados.map(tarjetaPaa).join("");

    /* Pie técnico: lo que el endpoint NO pudo hacer. Se pinta solo cuando hay
       algo que contar, pero `verificado:false` va siempre mientras nadie haya
       abierto el dataset contra la fuente real. */
    const censo = cuerpo.censo || {}, barrido = cuerpo.barrido || {}, desc = cuerpo.descartados || {};
    const notas = [];
    if (cuerpo.verificado === false) notas.push("nombres de columna sin verificar contra datos.gov.co");
    if ((censo.sin_resolver || []).length) notas.push(`sin reconocer: ${censo.sin_resolver.join(", ")}`);
    if (cuerpo.motivo_lista_vacia) notas.push(cuerpo.motivo_lista_vacia);
    if (barrido.truncado) notas.push(`barrido truncado en ${barrido.filas_leidas} filas: acote con una entidad`);
    if (desc.fecha_ilegible) notas.push(`${desc.fecha_ilegible} sin fecha legible (no se pueden situar en la ventana)`);
    $("paa-censo").textContent = notas.length ? `Dataset ${cuerpo.dataset} · ${notas.join(" · ")}.` : "";
  }

  /* ══════════ Detalle de competencia (modal) ══════════
     El badge afirma «promedio 3 oferentes en 12 procesos». Aquí se ven los 12,
     con los que quedaron fuera del promedio y POR QUÉ. El endpoint exige
     HISTORICO_TOKEN; el token integrado viaja por el header `x-historico-token`
     (nunca en la URL) y el usuario no ve ningún formulario. */
  /* el token va integrado (ver cabecera): las utilidades de sesión murieron
     con el formulario. `tokenGuardado`/`olvidarToken` viven arriba, junto a
     TOKEN, porque la degradación ante un 401 sigue siendo la misma. */

  const MOTIVO_EXCLUSION = {
    sin_dato_oferentes: "El proceso se adjudicó pero el dataset no dice cuántos se presentaron",
    sin_adjudicacion: "Cerrado sin adjudicación (desierto, cancelado o revocado)",
    insuficientes_datos: "La entidad no llega al mínimo de procesos para calcular un promedio fiable",
  };

  /* Cuantías compactas: $999K · $350M · $1.200M */
  function fmtCorto(cop) {
    const n = Number(cop) || 0;
    if (!n) return "No definida";
    if (n >= 1e9) return `$${fmtNum.format(Math.round(n / 1e6))}M`;
    if (n >= 1e6) return `$${Math.round(n / 1e6)}M`;
    if (n >= 1e3) return `$${Math.round(n / 1e3)}K`;
    return `$${n}`;
  }
  /* El MISMO recorte de `fmtCorto`, pero con SIGNO y con el cero como dato.
     `fmtCorto` responde «No definida» al 0 y `$-9500000` a un negativo, porque
     nació para cuantías, donde no hay signo y el 0 es una ausencia. La ganancia
     tiene las dos cosas: puede ser negativa (el contrato deja pérdida) y un 0
     medido es el punto de equilibrio, un HECHO, no un «no sé». Confundirlos
     sería la confusión entre «no sé» y «cero» que este proyecto ya pagó. */
  function copFirmado(n) {
    /* La AUSENCIA se descarta ANTES de tocar `Number`: `Number(null)` y
       `Number("")` valen 0 y son finitos, así que sin esta guarda un «no sé»
       saldría pintado como «$0», o sea como un punto de equilibrio medido. Es
       la misma trampa que `numero()` en lib/probabilidad. */
    if (n == null || n === "") return "—";
    const v = Number(n);
    if (!Number.isFinite(v)) return "—";
    const a = Math.abs(v), signo = v < 0 ? "−" : "";
    if (a >= 1e9) return `${signo}$${fmtNum.format(Math.round(a / 1e6))}M`;
    if (a >= 1e6) return `${signo}$${Math.round(a / 1e6)}M`;
    if (a >= 1e3) return `${signo}$${Math.round(a / 1e3)}K`;
    return `${signo}$${Math.round(a)}`;
  }
  const recorta = (s, n = 80) => (String(s || "").length > n ? `${String(s).slice(0, n)}…` : String(s || ""));

  /* Mostrar/ocultar toca las clases de Tailwind Y `style.display`. Las dos
     utilidades (`hidden` y `flex`) declaran la misma propiedad, así que cuál
     gana depende del orden del CSS generado, no del orden en que se añaden:
     el estilo en línea deja el resultado fuera de discusión (y el modal sigue
     funcionando aunque el CDN de Tailwind no cargue). */
  const $modal = () => $("modal-competencia");
  /* Lo que hay que copiar cuando se pulsa «Copiar justificación». Se guarda al
     pintar y se BORRA al abrir: si no, el botón de un desglose seguiría
     copiando el del proceso anterior. */
  let textoParaCopiar = "";
  function cerrarModal() {
    $modal().classList.add("hidden");
    $modal().classList.remove("flex");
    $modal().style.display = "none";
    document.removeEventListener("keydown", alPulsarTecla);
  }
  function alPulsarTecla(e) { if (e.key === "Escape") cerrarModal(); }
  /* Spinner mientras carga, no un «Cargando…» seco: la consulta recorre el
     corpus entero la primera vez (después la sirve la caché de 300 s). */
  const cargando = (msg) =>
    `<div class="py-10 text-center">
       <div class="spin mx-auto h-8 w-8 rounded-full border-2 border-gray-200 border-t-gray-900"></div>
       <p class="mt-3 text-sm text-gray-400">${esc(msg)}</p>
     </div>`;
  function abrirModal(titulo, rotulo = "Competencia histórica", msg = "Cargando…") {
    $("modal-rotulo").textContent = rotulo;
    $("modal-titulo").textContent = titulo || "Entidad no informada";
    $("modal-titulo").title = titulo || "";
    $("modal-cuerpo").innerHTML = cargando(msg);
    textoParaCopiar = "";
    $("modal-copiar").classList.add("hidden");
    $("modal-copiar").textContent = "Copiar justificación";
    $modal().classList.remove("hidden");
    $modal().classList.add("flex");
    $modal().style.display = "flex";
    document.addEventListener("keydown", alPulsarTecla);
  }

  /* ══════════════════════════════════════════════════════════════════════
     DETALLE DE «CUÁNTA PLATA DEJA ESTE CONTRATO»
     ----------------------------------------------------------------------
     Encargo del dueño: «que pueda dar clic encima de ese número y ver cómo se
     calculó, todo de manera simplificada, que lo pueda entender sin importar
     su profesión o edad». De ahí las tres decisiones de este bloque:

     1) NO REIMPLEMENTA LA CUENTA. Recalcula con `Ganancia.desglose`, que es el
        MISMO archivo que usa el servidor (`public/ganancia.js`, UMD, el patrón
        de `costos.js`). Una segunda aritmética en el navegador enseñaría un
        número distinto del que ordena la lista, y sería el defecto del
        presupuesto calculado dos veces otra vez.
     2) NO PIDE NADA A LA RED. Todo lo que hace falta ya viajó en la tarjeta.
     3) HABLA EN PESOS Y EN CASTELLANO LLANO: «le pagan», «hacer la obra le
        cuesta», «le descuentan de cada acta». Ni AIU, ni τ, ni cota superior.
     ══════════════════════════════════════════════════════════════════════ */
  const gPesos = (n) => (n == null || !Number.isFinite(Number(n))
    ? "—"
    : `${Number(n) < 0 ? "−" : ""}$${fmtNum.format(Math.abs(Math.round(Number(n))))}`);

  function filaCascada(rotulo, valor, explicacion, ancho, color) {
    return `<div class="cascada-fila">
        <div><p class="font-medium">${esc(rotulo)}</p><p class="text-xs" style="color: var(--text-secondary);">${esc(explicacion)}</p></div>
        <p class="tabular-nums font-semibold whitespace-nowrap">${esc(gPesos(valor))}</p>
        <div class="cascada-barra"><span style="width:${Math.max(1, Math.min(100, ancho))}%; background:${color};"></span></div>
      </div>`;
  }
  /* Las tintas de la cuenta: verde = lo que queda, rojo = lo que se va, gris =
     el punto de partida. Viven fuera de `pintarDetalleGanancia` porque la
     cascada y el veredicto las comparten. */
  const VERDE_CUENTA = "var(--ok, #34c759)", ROJO_CUENTA = "var(--danger)", GRIS_CUENTA = "var(--text-secondary)";

  /* LA CASCADA, COMO FUNCIÓN PURA DE LA CUENTA (M-DGF-11, 6-sep-2026). Recibe el
     desglose `d` que devuelve `Ganancia.desglose` —la MISMA aritmética del
     servidor— y el origen `g` de la tarjeta, y devuelve las filas: siete si hay
     contribución y estampillas, seis sin contribución, cinco sin ninguna de las
     dos. Vive aparte del pintado para que la suite la EJECUTE con un desglose
     real y compruebe que lo que se pinta son las cifras de `d` al peso, que las
     barras quedan entre 1 y 100 y que «Le queda» cierra la lista: es la
     pantalla que el dueño lee como «la plata que le queda», y antes ninguna
     prueba tocaba su HTML. La escala es el precio (tope 100 %, suelo 1 % para
     que una línea pequeña no desaparezca). */
  function htmlCascada(d, g) {
    const tope = Math.max(d.precio, 1);
    const barra = (n) => Math.round((Math.abs(n) / tope) * 100);
    return [
      filaCascada("Le pagan por la obra", d.precio,
        g.origen_precio === "mercado"
          ? "El precio al que esta entidad suele adjudicar (su presupuesto, menos lo que descontó quien ganó)."
          : "El presupuesto oficial publicado. No hay historial suficiente de esta entidad para saber cuánto se suele bajar.",
        100, GRIS_CUENTA),
      d.contribucion > 0 ? filaCascada("Le descuentan de cada acta", -d.contribucion,
        `Contribución de obra pública: ${nf2.format(d.contribucion_pct)} % de todo lo que le paguen. Es de ley y no se negocia.`,
        barra(d.contribucion), ROJO_CUENTA) : "",
      d.otras_deducciones > 0 ? filaCascada("Estampillas y retenciones", -d.otras_deducciones,
        "Las que usted cargó del pliego.", barra(d.otras_deducciones), ROJO_CUENTA) : "",
      filaCascada("Hacer la obra le cuesta", -d.obra,
        g.base === "apu"
          ? "El costo que usted mismo calculó para este proceso en Precios: materiales, mano de obra, equipo y transporte."
          : "Todavía no ha costeado este proceso. Se calcula al revés: del precio, quitando su administración, sus imprevistos y su ganancia.",
        barra(d.obra), ROJO_CUENTA),
      filaCascada("Manejar la obra le cuesta", -d.administracion,
        `Su administración: ${nf2.format(d.aiu.administracion_pct)} % — director, residente, oficina, pólizas.`,
        barra(d.administracion), ROJO_CUENTA),
      filaCascada("Reserva para imprevistos", -d.imprevistos,
        `${nf2.format(d.aiu.imprevistos_pct)} %. Es un seguro, no un gasto seguro: si la obra sale bien, esta plata se queda con usted.`,
        barra(d.imprevistos), "var(--warn, #ff9f0a)"),
      filaCascada("Le queda", d.valor,
        "Si gasta la reserva entera. Es la cuenta más prudente de las dos.",
        barra(d.valor), d.valor >= 0 ? VERDE_CUENTA : ROJO_CUENTA),
    ].filter(Boolean).join("");
  }

  /* La estructura de precio que el usuario haya declarado en este detalle. Vive
     en el navegador y viaja al servidor como parámetros de la búsqueda (el
     patrón de `?baja_max=`), así que NO hay una segunda fuente de verdad: la
     lista se recalcula entera con lo que el usuario acaba de responder. */
  /* La clave va LITERAL dentro de cada función y no como `const` del IIFE:
     `parametros()` está declarada mucho más arriba y la llama la primera
     búsqueda, así que una constante declarada aquí abajo la dejaría en la zona
     muerta temporal si algún día el arranque dejara de ir al final del IIFE —
     el fallo MUDO que este repositorio ya pagó tres veces (app.js, admin.js,
     apu.js). Un literal repetido dos veces no puede tener ese problema. */
  function estructuraGuardada() {
    try {
      const v = JSON.parse(localStorage.getItem("detecta_estructura_precio") || "null");
      return v && typeof v === "object" ? v : null;
    } catch (_) { return null; }
  }
  function guardarEstructura(v) {
    try { localStorage.setItem("detecta_estructura_precio", JSON.stringify(v)); } catch (_) { /* modo restringido */ }
  }

  let gananciaEnDetalle = null;   // { l, g, ajustes } del proceso abierto

  function pintarDetalleGanancia() {
    const st = gananciaEnDetalle;
    if (!st) return;
    const g = st.g, a = st.ajustes;
    const tauPct = g.tau_pct != null ? Number(g.tau_pct) : 0;
    const contribPct = g.contribucion_pct != null ? Number(g.contribucion_pct) : 0;
    /* MISMA función que el servidor. `costo_directo` y `precio` vienen ya
       resueltos en la tarjeta: aquí solo se mueve la estructura de precio. */
    /* SIN APU EL COSTO DIRECTO SE REHACE, no se congela: en esa vía el costo se
       cierra por la identidad precio = costo × (1 + A + I + U), así que subir
       la ganancia declarada BAJA el costo implícito. Congelar el `costo_directo`
       que vino en la tarjeta hacía que mover la ganancia no cambiara nada en el
       modal mientras el servidor sí lo cambiaba: el detalle habría prometido
       una cifra que la lista no confirmaba al aplicarla. Lo cazó abrir la
       página en un navegador real. Con APU el costo está MEDIDO y no se toca. */
    const cdVigente = g.base === "apu" ? g.costo_directo : window.Ganancia.costoDirectoImplicito(
      g.precio_esperado, a.administracion_pct, a.imprevistos_pct, a.utilidad_pct, (g.aiu && g.aiu.modo) || "aditivo");
    const d = window.Ganancia.desglose({
      precio: g.precio_esperado,
      costo_directo: cdVigente,
      administracion_pct: a.administracion_pct,
      imprevistos_pct: a.imprevistos_pct,
      utilidad_pct: a.utilidad_pct,
      modo: (g.aiu && g.aiu.modo) || "aditivo",
      /* Si declara que su administración ya paga los impuestos, la contribución
         no se descuenta OTRA VEZ: se le resta a τ, no se pone τ en cero (las
         estampillas del pliego, si están cargadas, siguen saliendo del acta). */
      /* Sin `|| 0` sobre las cifras: la ausencia se descarta explícitamente,
         que es la regla de todo el repositorio. Aquí las dos vienen siempre
         (`g.valor != null` lo garantiza), pero un `|| 0` escrito «por si
         acaso» es exactamente cómo se coló «en 0 procesos» en producción. */
      descuentos_pct: a.contribucion_en_administracion
        ? Math.max(0, tauPct - contribPct)
        : tauPct,
      contribucion_pct: a.contribucion_en_administracion ? 0 : contribPct,
      contribucion_declarada: a.declarada,
    });
    if (!d) return;

    /* Lo que está EN JUEGO en la casilla, que no es lo mismo que lo que se está
       descontando: con la casilla marcada `d.contribucion` vale 0 —correcto, no
       se cobra— y la etiqueta tiene que seguir diciendo de cuánto se habla. Se
       calcula explícitamente en vez de con un `||` sobre una cifra: ese `||`
       convierte un cero LEGÍTIMO en «no sé», que es la misma confusión de
       siempre por el otro lado. */
    const contribEnJuego = d.contribucion > 0 ? d.contribucion : Math.round(d.precio * contribPct / 100);

    const veredictoTxt = d.veredicto === "deja"
      ? `<p class="text-lg font-semibold" style="color: ${VERDE_CUENTA};">Le quedan ${esc(gPesos(d.valor))}</p>
         <p class="text-sm" style="color: var(--text-secondary);">Y hasta ${esc(gPesos(d.mejor))} si no gasta la reserva para imprevistos.</p>`
      : d.veredicto === "pierde"
        ? `<p class="text-lg font-semibold" style="color: ${ROJO_CUENTA};">Pierde ${esc(gPesos(-d.mejor))}, aun en el mejor de los casos</p>
           <p class="text-sm" style="color: var(--text-secondary);">Con este precio y este costo, no hay escenario en que este contrato deje plata.</p>`
        : `<p class="text-lg font-semibold">Entre ${esc(gPesos(d.peor))} y ${esc(gPesos(d.mejor))}</p>
           <p class="text-sm" style="color: var(--text-secondary);">Puede dejarle plata o costarle: depende de las dos cosas de abajo. Nadie lo sabe todavía, y por eso no le decimos un número solo.</p>`;

    /* las filas salen de la función pura de arriba: aquí solo se colocan */
    const cascada = htmlCascada(d, g);

    const pendientes = [];
    if (d.imprevistos > 0) {
      pendientes.push(`<li><b>¿Va a gastar la reserva para imprevistos?</b> Son ${esc(gPesos(d.imprevistos))}. Si la obra sale limpia, se queda con ellos y le quedan ${esc(gPesos(d.sin_gastar_imprevisto))}. Nadie puede saberlo antes de empezar.</li>`);
    }
    if (!a.contribucion_en_administracion && d.contribucion > 0 && !a.declarada) {
      pendientes.push(`<li><b>¿Su administración ya paga los impuestos del contrato?</b> Muchas empresas meten esa línea dentro de la administración. Si es su caso, esos ${esc(gPesos(d.contribucion))} ya están contados y no se descuentan otra vez. Respóndalo abajo: cambia el resultado.</li>`);
    }

    $("modal-cuerpo").innerHTML = `
      <div class="space-y-4">
        <div class="rounded-xl p-4" style="background: var(--bg-inset);">${veredictoTxt}</div>

        <div>
          <h3 class="mb-1 text-sm font-semibold">La cuenta, línea por línea</h3>
          <p class="mb-2 text-xs" style="color: var(--text-secondary);">Las barras están a escala: se ve cuánto pesa cada cosa dentro del contrato.</p>
          ${cascada}
        </div>

        ${pendientes.length ? `<div>
          <h3 class="mb-1 text-sm font-semibold">Lo que todavía no se sabe</h3>
          <ul class="ml-4 list-disc space-y-1 text-sm" style="color: var(--text-secondary);">${pendientes.join("")}</ul>
        </div>` : ""}

        <div class="rounded-xl p-4" style="background: var(--bg-inset);">
          <h3 class="mb-2 text-sm font-semibold">Ajuste la cuenta a su empresa</h3>
          <p class="mb-3 text-xs" style="color: var(--text-secondary);">Cambie estos números y la cuenta de arriba se rehace al instante. Son los suyos, no los de nadie más.</p>
          <div class="grid grid-cols-3 gap-2">
            <label class="text-xs">Administración
              <input id="gan-a" type="number" min="0" max="100" step="0.5" value="${esc(String(a.administracion_pct))}" class="control-campo mt-1 w-full" inputmode="decimal"> </label>
            <label class="text-xs">Imprevistos
              <input id="gan-i" type="number" min="0" max="100" step="0.5" value="${esc(String(a.imprevistos_pct))}" class="control-campo mt-1 w-full" inputmode="decimal"></label>
            <label class="text-xs">Ganancia
              <input id="gan-u" type="number" min="0" max="100" step="0.5" value="${esc(String(a.utilidad_pct))}" class="control-campo mt-1 w-full" inputmode="decimal"></label>
          </div>
          <label class="mt-3 flex items-start gap-2 text-sm">
            <input id="gan-contrib" type="checkbox" class="mt-0.5"${a.contribucion_en_administracion ? " checked" : ""}>
            <span>Mi administración <b>ya incluye</b> los impuestos del contrato (${esc(gPesos(contribEnJuego))})</span>
          </label>
          <div class="mt-3 flex flex-wrap items-center gap-2">
            <button id="gan-aplicar" type="button" class="rounded-lg bg-gray-900 px-3 py-2 text-sm font-medium text-white">Usar estos datos en toda la lista</button>
            <span id="gan-aviso" class="text-xs" style="color: var(--text-secondary);"></span>
          </div>
        </div>

        <div>
          <h3 class="mb-1 text-sm font-semibold">De dónde sale cada número</h3>
          <ul class="ml-4 list-disc space-y-1 text-xs" style="color: var(--text-secondary);">
            <li><b>El precio:</b> ${esc((g.fuentes && g.fuentes.precio) || "")}</li>
            <li><b>El costo:</b> ${esc((g.fuentes && g.fuentes.costo) || "")}</li>
            <li><b>Los descuentos:</b> ${esc((g.fuentes && g.fuentes.descuentos) || "")}</li>
          </ul>
        </div>

        <div>
          <h3 class="mb-1 text-sm font-semibold">Lo que esta cuenta NO alcanza a descontar</h3>
          <p class="text-xs" style="color: var(--text-secondary);">${esc((g.cota_superior_por || []).join("; "))}. Por eso lo que le quede de verdad puede ser menos, nunca más.</p>
        </div>
      </div>`;

    const leer = (id, porDefecto) => {
      const n = Number(String(($(id) || {}).value || "").replace(",", "."));
      return Number.isFinite(n) && n >= 0 && n <= 100 ? n : porDefecto;
    };
    const alCambiar = () => {
      st.ajustes = {
        administracion_pct: leer("gan-a", a.administracion_pct),
        imprevistos_pct: leer("gan-i", a.imprevistos_pct),
        utilidad_pct: leer("gan-u", a.utilidad_pct),
        contribucion_en_administracion: !!$("gan-contrib").checked,
        /* Tocar cualquiera de los controles YA es una respuesta: a partir de
           aquí la cuenta deja de estar «sin declarar» y el veredicto puede
           afirmar. Sin esto, responder que no seguiría dando «depende». */
        declarada: true,
      };
      pintarDetalleGanancia();
    };
    ["gan-a", "gan-i", "gan-u"].forEach((id) => { const n = $(id); if (n) n.addEventListener("change", alCambiar); });
    const chk = $("gan-contrib"); if (chk) chk.addEventListener("change", alCambiar);
    const btn = $("gan-aplicar");
    if (btn) btn.addEventListener("click", () => {
      guardarEstructura(st.ajustes);
      /* Ninguna pulsación sin respuesta visible (la lección del modal del
         token): se avisa, se cierra y se vuelve a buscar con los datos nuevos
         para que TODA la lista quede recalculada por el servidor con la misma
         cuenta — no solo esta tarjeta. */
      $("gan-aviso").textContent = "Guardado. Recalculando la lista…";
      setTimeout(() => { cerrarModal(); buscar(); }, 350);
    });
  }

  function abrirDetalleGanancia(l) {
    const g = l && l.ganancia;
    if (!g || g.valor == null) return;
    const guardada = estructuraGuardada();
    gananciaEnDetalle = {
      l, g,
      ajustes: {
        administracion_pct: (g.aiu && g.aiu.administracion_pct) != null ? g.aiu.administracion_pct : 15,
        imprevistos_pct: (g.aiu && g.aiu.imprevistos_pct) != null ? g.aiu.imprevistos_pct : 5,
        utilidad_pct: (g.aiu && g.aiu.utilidad_pct) != null ? g.aiu.utilidad_pct : 5,
        contribucion_en_administracion: !!(guardada && guardada.contribucion_en_administracion),
        declarada: !!(guardada && guardada.declarada) || !!g.contribucion_declarada,
      },
    };
    pintarDetalleGanancia();
  }

  function filaProceso(p, conMotivo) {
    const ofertas = p.numero_ofertas == null || p.numero_ofertas === 0
      ? '<span class="text-gray-400">sin dato</span>' : p.numero_ofertas;
    return `<tr class="border-t border-gray-100 align-top">
      <td class="py-2 pr-3" title="${esc(p.objeto)}">${esc(recorta(p.objeto))}
        <span class="block text-xs text-gray-400">${esc(p.modalidad || "")}${p.fecha_adjudicacion ? ` · ${esc(p.fecha_adjudicacion)}` : " · Sin fecha"}</span>
        ${conMotivo ? `<span class="block text-xs text-amber-700">${esc(MOTIVO_EXCLUSION[p.motivo_exclusion] || p.motivo_exclusion || "")}</span>` : ""}
      </td>
      <td class="py-2 pr-3 text-right tabular-nums">${ofertas}</td>
      <td class="py-2 text-right tabular-nums">${esc(fmtCorto(p.cuantia_cop))}</td>
    </tr>`;
  }

  const tabla = (titulo, filas, conMotivo, nota) => !filas.length ? "" : `
    <h3 class="mt-5 mb-1 text-sm font-semibold">${esc(titulo)} (${filas.length})</h3>
    ${nota ? `<p class="mb-2 text-xs text-gray-500">${esc(nota)}</p>` : ""}
    <div class="overflow-x-auto">
      <table class="w-full text-left text-sm">
        <thead class="text-xs uppercase tracking-wide text-gray-400">
          <tr><th class="pb-1">Objeto</th><th class="pb-1 text-right">Ofertas</th><th class="pb-1 text-right">Cuantía</th></tr>
        </thead>
        <tbody>${filas.map((p) => filaProceso(p, conMotivo)).join("")}</tbody>
      </table>
    </div>`;

  /* ══════════ Quién gana aquí ══════════
     El agregado de adjudicatarios del histórico de la entidad: la señal #11
     del manual (ganador recurrente) hecha dato. La CONCENTRACIÓN solo llega
     del servidor cuando hay base (mín. 5 procesos con ganador) y la LECTURA
     viaja con las DOS interpretaciones — nicho ganable O pliego a la medida —
     porque el dato no alcanza para decidir cuál de las dos es. */
  /* La fecha del último contrato adjudicado (encargo del dueño, ago 2026):
     dice si un ganador sigue ACTIVO o dejó de ganar hace un año. Se formatea
     el texto ISO directamente — parsear con `new Date("YYYY-MM-DD")` lo
     leería como UTC y lo mostraría un día antes en hora Colombia. Sin fecha
     legible: «sin dato», jamás una inventada. Compartida entre «Quién gana
     aquí» y el perfil del competidor: dos copias divergirían. */
  const MESES_CORTOS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
  const fmtUltima = (f) => {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(f || ""));
    return m ? `${Number(m[3])} ${MESES_CORTOS[Number(m[2]) - 1]} ${m[1]}` : null;
  };

  /* ══════════ Quiénes se presentan aquí ══════════
     El corpus dice quién GANA; el dataset de proponentes (hgi6-6wh3) dice
     quiénes SE PRESENTAN, ganen o no — contra quién se ha competido en esta
     entidad. Llega best-effort: si el dataset no respondió, el bloque lo dice
     en una línea y no inventa una lista. «No Definido» no es un NIT: se
     enseña «sin NIT», nunca un número. */
  function bloqueProponentes(p) {
    if (!p) return "";
    if (!p.ok) {
      return `<p class="mt-4 rounded-lg bg-gray-100 p-3 text-xs text-gray-600">Quiénes se presentan aquí: no se pudo consultar el
        dataset de proponentes de SECOP II en este momento${p.motivo ? ` (${esc(p.motivo)})` : ""}. Vuelva a abrir el detalle más tarde.</p>`;
    }
    const base = Number(p.procesos_con_proponentes);
    if (!Number.isFinite(base) || base === 0 || !(p.top || []).length) {
      return `<p class="mt-4 rounded-lg bg-gray-100 p-3 text-xs text-gray-600">SECOP II todavía no publica los proponentes de los
        ${p.procesos_consultados} procesos de esta entidad que están en el corpus.</p>`;
    }
    const filas = p.top.map((t) => `
      <tr class="border-t border-gray-100 align-top">
        <td class="py-2 pr-3">${esc(t.nombre)}${t.nit
    ? `<span class="block text-xs text-gray-400">NIT ${esc(t.nit)}</span>`
    : `<span class="block text-xs text-gray-400" title="El dataset publica «No Definido» en vez del NIT de esta empresa">sin NIT</span>`}</td>
        <td class="py-2 pr-3 text-right tabular-nums">${t.veces}</td>
        <td class="py-2 text-right tabular-nums whitespace-nowrap">${fmtUltima(t.ultima_vez) == null ? '<span class="text-gray-400">sin dato</span>' : esc(fmtUltima(t.ultima_vez))}</td>
      </tr>`).join("");
    return `
      <div class="mt-4">
        <p class="font-medium">Quiénes se presentan aquí</p>
        <p class="text-xs text-gray-500">Se presentaron a ${base} de los ${p.procesos_consultados} procesos de esta entidad que están en el corpus (obra ya cerrada);
          ${p.proponentes_distintos} empresas distintas. Es contra quién se ha competido: un proceso abierto no tiene proponentes publicados hasta la apertura de ofertas.</p>
        <div class="mt-2 overflow-x-auto"><table class="w-full text-sm">
          <thead><tr class="text-left text-xs text-gray-500"><th class="pb-1 pr-3 font-medium">Empresa</th><th class="pb-1 pr-3 text-right font-medium">Veces</th><th class="pb-1 text-right font-medium">Última vez</th></tr></thead>
          <tbody>${filas}</tbody></table></div>
      </div>`;
  }

  /* ══════════ Cómo ejecuta sus contratos ══════════
     Prórrogas, suspensiones y pagos de los contratos de obra ya firmados de la
     entidad (dataset de contratos electrónicos de SECOP II, en vivo). Es el
     flujo de caja del Cap. 11 —el Estado paga tarde—, no el precio. Un pago en
     0 en el dataset es «no lo registra», no «no ha pagado»: el bloque lo dice. */
  function bloqueEjecucion(e) {
    if (!e) return "";
    if (!e.ok) {
      return `<p class="mt-4 rounded-lg bg-gray-100 p-3 text-xs text-gray-600">Cómo ejecuta sus contratos: no se pudo consultar el
        dataset de contratos de SECOP II en este momento${e.motivo ? ` (${esc(e.motivo)})` : ""}.</p>`;
    }
    if (!e.contratos) {
      return `<p class="mt-4 rounded-lg bg-gray-100 p-3 text-xs text-gray-600">Cómo ejecuta sus contratos: ${esc(e.motivo || "sin contratos de obra de esta entidad en los últimos dos años")}.</p>`;
    }
    const pr = e.prorrogas || {}, su = e.suspendidos || {}, pg = e.pagos || {};
    const dato = (v, suf = "") => (v == null ? '<span class="text-gray-400">sin dato</span>' : `${esc(String(v))}${suf}`);
    return `
      <div class="mt-4">
        <p class="font-medium">Cómo ejecuta sus contratos</p>
        <p class="text-xs text-gray-500">${e.contratos} contratos de obra firmados desde ${esc(e.ventana && e.ventana.desde || "")}${e.valor_contratado_cop != null ? ` · ${esc(fmtCorto(e.valor_contratado_cop))} contratados` : ""}. Lo que pasó DESPUÉS de adjudicar: pesa en el flujo de caja, no en el precio.</p>
        <dl class="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-sm sm:grid-cols-4">
          <div><dt class="text-xs text-gray-500">Con prórroga</dt><dd class="tabular-nums">${dato(pr.pct, " %")}${pr.contratos ? ` <span class="text-xs text-gray-400">(${pr.contratos})</span>` : ""}</dd></div>
          <div><dt class="text-xs text-gray-500">Días de prórroga (mediana)</dt><dd class="tabular-nums">${dato(pr.mediana_dias)}</dd></div>
          <div><dt class="text-xs text-gray-500">Suspendidos</dt><dd class="tabular-nums">${dato(su.contratos)}</dd></div>
          <div><dt class="text-xs text-gray-500">Pagado en los terminados</dt><dd class="tabular-nums">${pg.registra ? dato(pg.pct_pagado_de_terminados, " %") : '<span class="text-gray-400" title="La entidad no registra pagos en SECOP II: un 0 en el dataset no significa que no haya pagado">no registra pagos</span>'}</dd></div>
        </dl>
        ${e.otros_nombres_con_este_nit && e.otros_nombres_con_este_nit.length ? `<p class="mt-2 text-xs text-gray-400">El mismo NIT firma también como ${esc(e.otros_nombres_con_este_nit.join(" · "))}: esos contratos no se cuentan aquí.</p>` : ""}
      </div>`;
  }

  function bloqueAdjudicatarios(a) {
    if (!a) return "";
    const base = Number(a.procesos_con_ganador);
    if (!Number.isFinite(base) || base === 0) {
      return Number(a.sin_adjudicatario) > 0
        ? `<p class="mt-4 rounded-lg bg-gray-100 p-3 text-xs text-gray-600">El dataset no trae el nombre del
             adjudicatario en los ${a.sin_adjudicatario} procesos adjudicados de esta entidad: no se puede decir quién gana aquí.</p>`
        : "";
    }
    /* Cada fila abre el PERFIL DEL COMPETIDOR (dónde más gana): la clave la
       publica el servidor y es la misma identidad del agregado. */
    const filas = (a.top || []).map((g) => `
      <tr class="border-t border-gray-100 align-top ${g.clave ? "cursor-pointer transition hover:bg-gray-50" : ""}"${g.clave ? ` data-adjudicatario="${esc(g.clave)}" data-nombre="${esc(g.nombre)}" title="Ver en qué otras entidades gana"` : ""}>
        <td class="py-2 pr-3">${esc(g.nombre)}${g.nit
    ? `<span class="block text-xs text-gray-400">NIT ${esc(g.nit)}</span>`
    : g.identificacion
      ? `<span class="block text-xs text-gray-400" title="${g.identificacion.tipo === "codigo_secop"
        ? "Código interno de proveedor en SECOP: el dataset no publica el NIT de esta empresa (llega como «No Definido»)"
        : "Documento del proveedor tal como lo publica el dataset"}">${g.identificacion.tipo === "codigo_secop" ? "Cód. SECOP" : "Doc."} ${esc(g.identificacion.valor)}</span>`
      : ""}</td>
        <td class="py-2 pr-3 text-right tabular-nums">${g.ganados}</td>
        <td class="py-2 pr-3 text-right tabular-nums">${g.valor_adjudicado_cop == null ? '<span class="text-gray-400">sin dato</span>' : esc(fmtCorto(g.valor_adjudicado_cop))}</td>
        <td class="py-2 text-right tabular-nums whitespace-nowrap">${fmtUltima(g.ultima_adjudicacion) == null ? '<span class="text-gray-400">sin dato</span>' : esc(fmtUltima(g.ultima_adjudicacion))}</td>
      </tr>`).join("");
    const conc = a.concentracion;
    return `
      <h3 class="mt-5 mb-1 text-sm font-semibold">Quién gana aquí (${base} proceso${base === 1 ? "" : "s"} con ganador identificado)</h3>
      ${conc ? `<p class="mb-2 text-xs text-gray-600">${esc(conc.lider)} se lleva ${conc.ganados} de ${conc.base} (${conc.pct} %).</p>` : ""}
      <div class="overflow-x-auto">
        <table class="w-full text-left text-sm">
          <thead class="text-xs uppercase tracking-wide text-gray-400">
            <tr><th class="pb-1">Adjudicatario</th><th class="pb-1 text-right">Ganados</th><th class="pb-1 text-right">Valor adjudicado</th><th class="pb-1 text-right">Último contrato</th></tr>
          </thead>
          <tbody>${filas}</tbody>
        </table>
      </div>
      ${Number(a.sin_adjudicatario) > 0 ? `<p class="mt-2 text-xs text-gray-400">${a.sin_adjudicatario} proceso(s) adjudicados sin nombre de ganador en el dataset.</p>` : ""}
      ${a.lectura ? `<p class="mt-3 rounded-lg bg-amber-50 p-3 text-xs text-amber-800"><strong>Atención:</strong> ${esc(a.lectura)}</p>` : ""}`;
  }

  function pintarDetalle(d) {
    const i = d.indice || {};
    const banda = COMPETENCIA_ENTIDAD[i.nivel] || COMPETENCIA_ENTIDAD.sin_dato;
    // misma regla que el badge: un promedio sin procesos contados detrás no se
    // pinta (el servidor ya lo anula; aquí no se vuelve a interpolar a ciegas)
    const resumen = i.promedio_oferentes != null && i.procesos_contados > 0
      ? `<p class="mt-1 text-gray-600">Promedio ${fmtNum.format(i.promedio_oferentes)} oferentes · ${i.procesos_contados} proceso${i.procesos_contados === 1 ? "" : "s"}</p>
         <p class="text-xs text-gray-500">Mediana ${i.mediana_oferentes ?? "?"} · Mín ${i.min_oferentes ?? "?"} · Máx ${i.max_oferentes ?? "?"}</p>`
      : "";
    /* Reparto POR AÑO (ago 2026): el promedio de dos años puede mezclar un
       período atípico (la ley de garantías 2026 obligó a competir entre nov-2025
       y may-2026). Se enseña el conteo de cada año siempre y el promedio solo
       cuando ese año tiene base (el servidor ya lo anula por debajo de 5). */
    const rep = i.reparto_por_anio && typeof i.reparto_por_anio === "object" ? Object.entries(i.reparto_por_anio) : [];
    const porAnio = rep.length
      ? `<p class="mt-1 text-xs text-gray-500">Por año: ${rep.map(([a, x]) => `${esc(a)} · ${x.procesos} proceso${x.procesos === 1 ? "" : "s"}${x.promedio_oferentes != null ? ` (promedio ${fmtNum.format(x.promedio_oferentes)})` : ""}`).join(" · ")}</p>`
      : "";
    /* Y cuánto pesan los datos propios en los rivales que usa la probabilidad
       (encogimiento): con pocos procesos manda el promedio general. */
    const enc = i.encogimiento && i.encogimiento.rivales_estimados != null
      ? `<p class="text-xs text-gray-500">Rivales esperados para la probabilidad: ${fmtNum.format(i.encogimiento.rivales_estimados)}${i.encogimiento.peso_datos != null ? ` (los datos propios pesan ${Math.round(i.encogimiento.peso_datos * 100)} %; el resto lo pone ${/^departamento:/.test(i.encogimiento.prior_origen || "") ? `el promedio de su departamento` : "el promedio general"}${i.encogimiento.prior != null ? `, ${fmtNum.format(i.encogimiento.prior)}` : ""})` : ""}</p>`
      : "";
    $("modal-cuerpo").innerHTML = `
      <p class="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${banda.clases}">
        <span aria-hidden="true">${banda.emoji}</span>${esc(banda.titulo)}
      </p>
      ${resumen}${porAnio}${enc}
      ${d.mensaje ? `<p class="mt-3 rounded-lg bg-amber-50 p-3 text-xs text-amber-800">${esc(d.mensaje)}</p>` : ""}
      ${bloqueAdjudicatarios(d.adjudicatarios)}
      ${bloqueProponentes(d.proponentes)}
      ${bloqueEjecucion(d.ejecucion)}
      ${tabla("Procesos incluidos", d.procesos || [], false)}
      ${tabla("Excluidos del promedio", d.excluidos || [], true,
    "Están cerrados o adjudicados, pero no cuentan para el promedio por el motivo indicado en cada uno.")}
      ${d.truncado ? `<p class="mt-3 text-xs text-gray-500">Se muestran los ${d.truncado.limite} más recientes de ${d.truncado.procesos || d.truncado.excluidos} procesos.</p>` : ""}
      ${(d.procesos || []).length || (d.excluidos || []).length ? "" : '<p class="mt-4 text-gray-500">No hay procesos históricos de esta entidad.</p>'}
      <p class="mt-4 text-xs text-gray-400">Datos del corpus histórico (procesos ya cerrados)${d.cache ? " · desde caché" : ""}.</p>`;
  }

  /* ══════════ Desglose de la probabilidad (modal) ══════════
     «Prob. estimada: 23 %» sin justificar es una caja negra: el contratista no
     sabe si es buena ni qué la causa. Aquí se abre en seis pasos con la
     fórmula, los datos con su fuente citada, la aritmética escrita y los puntos
     porcentuales que aporta cada uno — y la columna de aportes SUMA la cifra
     del encabezado, que es lo que la hace auditable.

     El endpoint exige el mismo HISTORICO_TOKEN que el detalle de competencia y
     se reutiliza su formulario tal cual: es otra acción explícita del dueño
     sobre el corpus, no algo que un cliente se encuentre al entrar.

     Se llama a la ruta CANÓNICA del router (/api/inteligencia?op=probabilidad) y
     no al alias /api/probabilidad-desglose ni a la URL histórica
     /api/competencia-detalle: los dos son rewrites de vercel.json y, si
     fallaran, el modal tiene que seguir funcionando. */
  const CONFIANZA = {
    Alta: "bg-green-100 text-green-800",
    Media: "bg-amber-100 text-amber-800",
    Baja: "bg-red-100 text-red-700",
    "Sin dato": "bg-gray-100 text-gray-500",
  };

  const signoPP = (n) => `${Number(n) > 0 ? "+" : Number(n) < 0 ? "−" : ""}${fmtNum.format(Math.abs(Number(n) || 0))} puntos`;

  function filaPaso(s) {
    const datos = Object.entries(s.datos_entrada || {})
      .filter(([k, v]) => k !== "fuente" && v !== null && v !== undefined && v !== "")
      .map(([k, v]) => `<span class="whitespace-nowrap"><span class="text-gray-400">${esc(k)}:</span> ${esc(typeof v === "object" ? JSON.stringify(v) : String(v))}</span>`)
      .join(" · ");
    return `<tr class="border-t border-gray-100 align-top">
      <td class="py-3 pr-3 text-right tabular-nums text-gray-400">${esc(s.paso)}</td>
      <td class="py-3 pr-3">
        <p class="font-medium">${esc(s.nombre)}</p>
        <p class="mt-1 font-mono text-[11px] leading-relaxed text-gray-500">${esc(s.formula)}</p>
        ${datos ? `<p class="mt-1 text-xs text-gray-600">${datos}</p>` : ""}
        <p class="mt-1 text-xs text-gray-400">Fuente: ${esc((s.datos_entrada || {}).fuente || "—")}</p>
        <p class="mt-1 font-mono text-[11px] text-gray-900">${esc(s.calculo)}</p>
        <p class="mt-1 text-xs italic text-gray-500">${esc(s.fundamento)}</p>
      </td>
      <td class="py-3 pr-3 text-right tabular-nums font-medium">${esc(s.resultado)}</td>
      <td class="py-3 pr-3 text-right tabular-nums ${Number(s.aporte_pp) < 0 ? "text-red-700" : "text-gray-900"}">${esc(signoPP(s.aporte_pp))}</td>
      <td class="py-3 text-right">
        <span class="inline-block rounded-md px-2 py-0.5 text-xs font-medium ${CONFIANZA[s.confianza] || CONFIANZA["Sin dato"]}">${esc(s.confianza)}</span>
      </td>
    </tr>`;
  }

  /* La EXPLICACIÓN EN SENCILLO va primero y la escribe el SERVIDOR
     (`explicacion_simple`): frases sin fórmulas, solo lo que movió la cifra,
     con el punto de color diciendo si suma o resta. La tabla técnica de seis
     pasos —la vista auditable— queda plegada en «Ver el cálculo completo». */
  const EXPLICACION_PUNTO = {
    base: "text-gray-400",
    sube: "text-green-600",
    baja: "text-red-600",
    tope: "text-gray-400",
    cierre: "text-blue-600",
  };
  function listaExplicacionSimple(d) {
    const lineas = Array.isArray(d.explicacion_simple) ? d.explicacion_simple : [];
    if (!lineas.length) return "";
    return `
      <ul class="mt-5 space-y-2.5">
        ${lineas.map((l) => `
          <li class="flex gap-2.5 text-sm leading-relaxed text-gray-800">
            <span class="${EXPLICACION_PUNTO[l.tipo] || "text-gray-400"} shrink-0" aria-hidden="true">●</span>
            <span class="${l.tipo === "cierre" ? "font-medium" : ""}">${esc(l.texto)}</span>
          </li>`).join("")}
      </ul>
      ${d.de_donde_salen_los_datos ? `<p class="mt-3 rounded-lg bg-gray-50 p-3 text-xs text-gray-500">${esc(d.de_donde_salen_los_datos)}</p>` : ""}`;
  }

  function pintarDesglose(d) {
    const pasos = d.desglose || [];
    const p = d.proceso || {};
    textoParaCopiar = d.justificacion_texto || "";
    $("modal-copiar").classList.toggle("hidden", !textoParaCopiar);
    const et = fraseProbabilidad(d.probabilidad_final);
    const frec = frecuenciaNatural(d.probabilidad_final);
    $("modal-cuerpo").innerHTML = `
      <div class="rounded-2xl bg-gray-50 px-5 py-4">
        <p class="text-xs font-medium uppercase tracking-wide text-gray-400">Sus opciones en este proceso</p>
        <p class="mt-1 text-2xl font-semibold tracking-tight">${frec ? esc(frec.frase) : `${fmtNum.format(d.probabilidad_final_pct)} %`}</p>
        <p class="mt-1 text-sm text-gray-600"><span class="${et.clase || ""}" aria-hidden="true">${et.icono}</span> ${esc(et.frase)}${frec ? ` <span class="text-gray-400">(${fmtNum.format(d.probabilidad_final_pct)} %)</span>` : ""}</p>
        ${d.banda_90 && d.banda_90.desde != null ? `<p class="mt-1 text-xs text-gray-500">Con la muestra que hay, la cifra puede moverse entre ${fmtNum.format(d.banda_90.desde * 100)} % y ${fmtNum.format(d.banda_90.hasta * 100)} %${d.peso_datos_entidad != null ? ` · los datos propios de la entidad pesan ${Math.round(d.peso_datos_entidad * 100)} %` : ""}.</p>` : ""}
        <p class="mt-1 text-xs text-gray-500">
          ${esc(p.entidad || "")}${p.departamento ? ` · ${esc(p.departamento)}` : ""}
          ${p.cuantia_cop ? ` · ${esc(fmtCorto(p.cuantia_cop))}` : ""}
          · ${esc(window.Glosario.corto("veg"))} ${esc(fmtCorto((d.contexto || {}).valor_esperado_cop))}
        </p>
      </div>

      ${listaExplicacionSimple(d)}

      <details class="mt-5">
      <summary class="cursor-pointer select-none text-sm font-medium text-gray-500">Ver el cálculo completo (auditable, paso a paso)</summary>
      <div class="mt-3 overflow-x-auto">
        <table class="w-full text-left text-sm">
          <thead class="text-xs uppercase tracking-wide text-gray-400">
            <tr>
              <th class="pb-1 text-right">#</th>
              <th class="pb-1">Paso, fórmula y datos</th>
              <th class="pb-1 text-right">Resultado</th>
              <th class="pb-1 text-right">Aporte</th>
              <th class="pb-1 text-right">Confianza</th>
            </tr>
          </thead>
          <tbody>${pasos.map(filaPaso).join("")}</tbody>
          <tfoot>
            <tr class="border-t-2 border-gray-200 font-medium">
              <td></td>
              <td class="py-2 text-gray-500">Suma de los aportes</td>
              <td></td>
              <td class="py-2 pr-3 text-right tabular-nums">${fmtNum.format(d.suma_aportes_pp)} puntos</td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div class="mt-5 rounded-xl border border-gray-900/10 bg-white p-4">
        <p class="text-xs font-medium uppercase tracking-wide text-gray-400">Resumen ejecutivo</p>
        <p class="mt-2 whitespace-pre-line leading-relaxed text-gray-800">${esc(d.resumen_ejecutivo || "")}</p>
      </div>

      <p class="mt-4 text-xs text-gray-400">${esc(d.como_leerlo || "")}
        ${d.corpus === "historico" ? " · Proceso del corpus histórico (ya cerrado)." : ""}${d.cache ? " · desde caché" : ""}</p>
      </details>`;
  }

  async function cargarDesglose(id) {
    const token = leerToken();
    $("modal-cuerpo").innerHTML = cargando("Reconstruyendo el cálculo…");
    let r, cuerpo;
    try {
      // el perfil viaja: la baja máxima del proceso sale de SUS borradores de APU (A4)
      r = await fetch(`/api/inteligencia?op=probabilidad&id_proceso=${encodeURIComponent(id)}&perfil=${encodeURIComponent($("f-perfil").value || "")}`,
        { headers: { "x-historico-token": token } });
    } catch {
      $("modal-cuerpo").innerHTML = '<p class="py-6 text-center text-red-600">No se pudo contactar el servidor. Intente de nuevo.</p>';
      return;
    }
    /* El parseo va APARTE del fetch: el muro del edge (Vercel Password
       Protection) responde HTML, así que `r.json()` LANZA y, con las dos cosas
       en el mismo `try`, ese muro se diagnosticaría como «sin conexión» —lo
       contrario de la verdad—. */
    try { cuerpo = await r.json(); } catch {
      $("modal-cuerpo").innerHTML = `<p class="py-6 text-center text-red-600">${esc(fraseDeFallo({ status: r.status }))}</p>`;
      return;
    }
    if (r.status === 401) {
      $("modal-cuerpo").innerHTML = `<p class="py-6 text-center text-red-600">${msg401(cuerpo)}</p>`;
      return;
    }
    if (!r.ok || !cuerpo || !cuerpo.ok) {
      $("modal-cuerpo").innerHTML = `<p class="py-6 text-center text-red-600">${esc((cuerpo && cuerpo.error) || fraseDeFallo({ status: r.status }))}</p>`;
      return;
    }
    pintarDesglose(cuerpo);
  }

  /* El detalle de competencia exige credencial en el servidor; el token
     integrado la aporta sin formulario. La lista nunca llega hasta aquí. */
  async function cargarDetalle(entidad) {
    const token = leerToken();
    $("modal-cuerpo").innerHTML = '<p class="py-8 text-center text-gray-400">Consultando el histórico…</p>';
    let r, cuerpo;
    try {
      r = await fetch(`/api/inteligencia?op=entidad&entidad=${encodeURIComponent(entidad)}`,
        { headers: { "x-historico-token": token } });
      cuerpo = await leerJson(r);
    } catch {
      $("modal-cuerpo").innerHTML = '<p class="py-6 text-center text-red-600">No se pudo contactar el servidor. Intente de nuevo.</p>';
      return;
    }
    if (r.status === 401) {
      $("modal-cuerpo").innerHTML = `<p class="py-6 text-center text-red-600">${msg401(cuerpo)}</p>`;
      return;
    }
    if (!r.ok || !cuerpo || !cuerpo.ok) {
      $("modal-cuerpo").innerHTML = `<p class="py-6 text-center text-red-600">${esc((cuerpo && cuerpo.error) || fraseDeFallo({ status: r.status }))}</p>`;
      return;
    }
    pintarDetalle(cuerpo);
  }

  /* ══════════ Perfil del competidor (vista adjudicatario) ══════════
     Desde la tabla «Quién gana aquí»: clic en un ganador → dónde más gana,
     cuántas veces, por cuánto y cuándo fue su último contrato. La «base de
     datos de la competencia» del manual, a un clic. */
  function pintarAdjudicatario(d) {
    if (!d.encontrado) {
      $("modal-cuerpo").innerHTML = '<p class="py-6 text-center text-gray-500">No hay adjudicaciones de este proveedor en el corpus (desde 2024).</p>';
      return;
    }
    const ident = d.identificacion
      ? (d.identificacion.tipo === "nit" ? `NIT ${d.identificacion.valor}`
        : d.identificacion.tipo === "codigo_secop" ? `Cód. SECOP ${d.identificacion.valor}`
          : `Doc. ${d.identificacion.valor}`)
      : "";
    const filas = (d.entidades || []).map((e) => `
      <tr class="border-t border-gray-100 align-top">
        <td class="py-2 pr-3">${esc(e.entidad)}</td>
        <td class="py-2 pr-3 text-right tabular-nums">${e.ganados}</td>
        <td class="py-2 pr-3 text-right tabular-nums">${e.valor_adjudicado_cop == null ? '<span class="text-gray-400">sin dato</span>' : esc(fmtCorto(e.valor_adjudicado_cop))}</td>
        <td class="py-2 text-right tabular-nums whitespace-nowrap">${fmtUltima(e.ultima_adjudicacion) == null ? '<span class="text-gray-400">sin dato</span>' : esc(fmtUltima(e.ultima_adjudicacion))}</td>
      </tr>`).join("");
    const nEnt = (d.entidades || []).length;
    $("modal-cuerpo").innerHTML = `
      <div class="rounded-2xl bg-gray-50 px-5 py-4">
        <p class="text-lg font-semibold">${esc(d.nombre)}</p>
        ${ident ? `<p class="text-xs text-gray-500">${esc(ident)}</p>` : ""}
        <p class="mt-1 text-sm text-gray-600">${d.total_ganados} contrato${d.total_ganados === 1 ? "" : "s"} en ${nEnt} entidad${nEnt === 1 ? "" : "es"}
          · ${d.valor_adjudicado_cop == null ? "valor sin dato" : esc(fmtCorto(d.valor_adjudicado_cop))}
          · último: ${fmtUltima(d.ultima_adjudicacion) || "sin fecha"}</p>
      </div>
      <div class="mt-4 overflow-x-auto">
        <table class="w-full text-left text-sm">
          <thead class="text-xs uppercase tracking-wide text-gray-400">
            <tr><th class="pb-1">Entidad</th><th class="pb-1 text-right">Ganados</th><th class="pb-1 text-right">Valor adjudicado</th><th class="pb-1 text-right">Último contrato</th></tr>
          </thead>
          <tbody>${filas}</tbody>
        </table>
      </div>
      <p class="mt-3 rounded-lg bg-gray-50 p-3 text-xs text-gray-500">${esc(d.que_es || "")}</p>`;
  }

  async function cargarAdjudicatario(clave, nombre) {
    abrirModal(nombre || "Competidor", "Dónde gana este competidor", "Buscando sus adjudicaciones…");
    const token = leerToken();
    let r;
    try {
      r = await fetch(`/api/inteligencia?op=competidor&adjudicatario=${encodeURIComponent(clave)}`,
        { headers: { "x-historico-token": token } });
    } catch {
      $("modal-cuerpo").innerHTML = '<p class="py-6 text-center text-red-600">No se pudo contactar el servidor. Intente de nuevo.</p>';
      return;
    }
    /* el parseo va APARTE del fetch: el muro del edge responde HTML y con las
       dos cosas en el mismo try se diagnosticaría como «sin conexión». Y va por
       `leerJson`, no por un `try/catch` propio: con el catch mudo, `cuerpo`
       quedaba en `null` y `msg401(null)` caía al mensaje del TOKEN sobre el
       muro del edge — el mismo diagnóstico equivocado que se acaba de quitar de
       los otros cinco sitios. `leerJson` marca `sinJson` y msg401 lo distingue. */
    const cuerpo = await leerJson(r);
    if (r.status === 401) {
      $("modal-cuerpo").innerHTML = `<p class="py-6 text-center text-red-600">${msg401(cuerpo)}</p>`;
      return;
    }
    if (!r.ok || !cuerpo || !cuerpo.ok) {
      $("modal-cuerpo").innerHTML = `<p class="py-6 text-center text-red-600">${esc((cuerpo && cuerpo.error) || fraseDeFallo({ status: r.status }))}</p>`;
      return;
    }
    pintarAdjudicatario(cuerpo);
  }

  /* delegación en el CUERPO del modal: la tabla «Quién gana aquí» se repinta
     con cada detalle, así que el listener vive en el contenedor */
  $("modal-cuerpo").addEventListener("click", (e) => {
    const fila = e.target.closest("[data-adjudicatario]");
    if (!fila) return;
    cargarAdjudicatario(fila.getAttribute("data-adjudicatario"), fila.getAttribute("data-nombre"));
  });

  // delegación: las tarjetas se repintan en cada búsqueda, así que el listener
  // vive en el contenedor y no en cada badge
  $("lista").addEventListener("click", (e) => {
    /* La probabilidad va PRIMERO: su botón vive dentro de la tarjeta y, si se
       resolviera después, un `closest` más laxo podría quedárselo antes. Son
       dos vistas del mismo modal y solo puede ganar una. */
    /* «Lo que deja» va ANTES que nada: es la CIFRA la que abre su cuenta (no un
       enlace aparte), así que el clic cae dentro de la franja de métricas y
       cualquier `closest` más laxo se lo quedaría. Es la misma regla de orden
       que ya protege al botón «APU» dentro de una fila que abre SECOP II. */
    const gan = e.target.closest(".detalle-ganancia");
    if (gan) {
      const idg = gan.getAttribute("data-id");
      const arr = (ultimaBusqueda && (ultimaBusqueda.resultados || ultimaBusqueda.oportunidades)) || [];
      const fila = arr.find((x) => String(x.id_del_proceso) === String(idg));
      if (!fila) return;
      abrirModal(gan.getAttribute("data-objeto") || idg, "Lo que deja este contrato", "Rehaciendo la cuenta…");
      abrirDetalleGanancia(fila);
      return;
    }
    const prob = e.target.closest(".detalle-probabilidad");
    if (prob) {
      const id = prob.getAttribute("data-id");
      abrirModal(prob.getAttribute("data-objeto") || id, "Desglose de la probabilidad", "Reconstruyendo el cálculo…");
      cargarDesglose(id);
      return;
    }
    const apuBtn = e.target.closest(".btn-apu");
    if (apuBtn) {
      abrirEditorConProceso(new URLSearchParams(apuBtn.getAttribute("data-apu-q") || ""));
      return;
    }
    const gBtn = e.target.closest(".btn-guardar");
    if (gBtn) { alternarGuardado(gBtn.getAttribute("data-id"), gBtn); return; }
    const b = e.target.closest(".banda-competencia");
    if (!b) return;
    const entidad = b.getAttribute("data-entidad");
    abrirModal(entidad, "Competencia histórica");
    cargarDetalle(entidad);
  });
  /* Copiar la justificación entera en texto plano, lista para pegar en un
     informe. `navigator.clipboard` no existe en contexto no seguro ni en
     navegadores viejos, así que hay respaldo con `execCommand` — y si las dos
     fallan se DICE, en vez de dejar el botón fingiendo que copió. */
  $("modal-copiar").addEventListener("click", async () => {
    const btn = $("modal-copiar");
    if (!textoParaCopiar) { btn.textContent = "Nada que copiar"; return; }
    let ok = false;
    try {
      await navigator.clipboard.writeText(textoParaCopiar);
      ok = true;
    } catch {
      try {
        const ta = document.createElement("textarea");
        ta.value = textoParaCopiar;
        ta.setAttribute("readonly", "");
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        ok = document.execCommand("copy");
        document.body.removeChild(ta);
      } catch { ok = false; }
    }
    btn.textContent = ok ? "Copiada ✓" : "No se pudo copiar — selecciónela a mano";
    setTimeout(() => { btn.textContent = "Copiar justificación"; }, 2500);
  });
  $("modal-cerrar").addEventListener("click", cerrarModal);
  $("modal-cerrar-pie").addEventListener("click", cerrarModal);
  $("modal-fondo").addEventListener("click", cerrarModal);

  /* ══════════ Eventos ══════════ */
  $("btn-buscar").addEventListener("click", () => { pagina = 1; reintentosSync = 0; buscar(); });
  $("btn-reintentar").addEventListener("click", () => { reintentosSync = 0; buscar(); });
  for (const id of ["f-perfil", "f-cuantia", "f-entidad", "f-ubicacion", "f-ordenar", "f-orden",
    "f-sin-unspsc", "f-solo-viables", "f-zona"]) {
    $(id).addEventListener("change", () => { pagina = 1; if (id === "f-ordenar" || id === "f-zona") { escribirFiltrosEnURL(); pintarControlesFiltros(); } if (id === "f-ordenar") pintarConceptoOrden(); buscar(); if (id === "f-perfil") { refrescarPulso(); sincronizarPerfilBorrador(); guardados.clear(); seguimientoCargadoPara = null; cargarSeguimiento({ forzar: true }); } });
  }
  /* «Ver PAA» NO re-consulta /api/oportunidades: son dos fuentes distintas y
     encender la previsión no puede cambiar la lista de lo que está abierto. Lo
     que sí hace es repintar las tarjetas activas, porque el badge «Activo»
     aparece solo mientras hay previsiones en pantalla de las que separarlas. */
  $("f-ver-paa").addEventListener("change", () => {
    paaEncendido = $("f-ver-paa").checked;
    $("f-paa-entidad-wrap").classList.toggle("hidden", !paaEncendido);
    buscarPaa();
    if (ultimaBusqueda) pintar(ultimaBusqueda);
  });
  /* Enter en el filtro de entidad del PAA re-consulta solo el PAA. Sin esto el
     campo parecería muerto: escribir y no ver nada es peor que un error. */
  $("f-paa-entidad").addEventListener("keydown", (ev) => {
    if (ev.key === "Enter") { ev.preventDefault(); buscarPaa(); }
  });
  $("f-paa-entidad").addEventListener("change", () => buscarPaa());


  /* Llamada autenticada del editor: el token integrado viaja en cabecera en
     todas las peticiones. Un 401 solo puede significar que HISTORICO_TOKEN del
     despliegue no coincide con el token integrado, y se dice con esas palabras
     — no hay formulario que abrir ni token que re-pedir. */
  async function api(ruta, opciones = {}) {
    const cfg = {
      method: opciones.method || "GET",
      headers: { "x-historico-token": leerToken() },
    };
    if (opciones.body !== undefined) {
      cfg.headers["Content-Type"] = "application/json";
      cfg.body = JSON.stringify(opciones.body);
    }
    let r;
    try {
      r = await fetch(ruta, cfg);
    } catch (e) {
      throw new Error(fraseDeFallo(e));
    }
    /* el parseo va APARTE del fetch: el muro del edge responde HTML */
    const cuerpo = await leerJson(r);
    if (r.status === 401) {
      throw new Error(msg401(cuerpo));
    }
    if (!r.ok) {
      // el «qué hacer» del servidor viaja con el error, como en pliego.js (6-sep-2026, V-B2a-02)
      throw new Error(errorDelServidor(cuerpo) || `El servidor respondió ${r.status}.`);
    }
    return cuerpo;
  }

  /* ══════════════════ MIS PROCESOS (seguimiento, ago 2026) ══════════════════
     Guardar desde la tarjeta, seguir en Mi empresa (estado, días para el
     cierre, avisos, .ics) y, cuando cierra, quiénes se presentaron con la
     ficha de cada uno. Todo sale de /api/perfil?op=seguimiento; la ficha del
     competidor NO se inventa: lo que la fuente no trae viaja null y se pinta «—». */
  const guardados = new Map();   // id → estado, del perfil activo
  let seguimientoCargadoPara = null;
  function botonGuardar(l) {
    const id = l.id_del_proceso || "";
    if (!id) return "";
    const est = guardados.get(id);
    return est
      ? `<button type="button" class="btn-guardar bg-gray-900 px-3 py-1 text-xs font-semibold transition" data-id="${esc(id)}" title="Guardado en Mis procesos (${esc(est === "presentado" ? "me presenté" : est === "descartado" ? "descartado" : "me interesa")}). Pulse para quitarlo.">Guardado ✓</button>`
      : `<button type="button" class="btn-guardar rounded-lg border border-gray-300 px-3 py-1 text-xs font-semibold transition hover:bg-gray-50" data-id="${esc(id)}" title="Guardar en Mis procesos para seguirle el cronograma y, cuando cierre, ver quiénes se presentaron">Guardar</button>`;
  }
  function filaDeLista(id) {
    const arr = (ultimaBusqueda && (ultimaBusqueda.resultados || ultimaBusqueda.oportunidades)) || [];
    return arr.find((x) => x.id_del_proceso === id) || null;
  }
  async function alternarGuardado(id, btn) {
    if (!id) return;
    const perfil = $("f-perfil").value;
    if (btn) btn.disabled = true;
    try {
      if (guardados.has(id)) {
        await api(`/api/perfil?op=seguimiento&perfil=${encodeURIComponent(perfil)}&id=${encodeURIComponent(id)}`, { method: "DELETE" });
        guardados.delete(id);
      } else {
        const l = filaDeLista(id);
        const r = await api("/api/perfil?op=seguimiento", { method: "POST", body: { perfil, id, estado: "interesa", foto: l || null } });
        guardados.set(id, (r && r.guardado && r.guardado.estado) || "interesa");
        /* al guardar, la plataforma le dice qué necesita para presentarse: la
           guía de ESE proceso se abre sola en Mis procesos (encargo del dueño:
           «automáticamente», no con una segunda pulsación) */
        segGuiaAbierta = id; segGuiaScroll = true;
        if (r && r.guia) {
          /* activar la pestaña YA recarga Mis procesos (`arrancadas`): una segunda
             carga aquí repintaría encima y cerraría el pliegue recién abierto */
          const l = filaDeLista(id);
          if (btn && l) btn.outerHTML = botonGuardar(l);
          seguimientoCargadoPara = null;
          activarPestana("seguimiento");
          /* y la plataforma empieza a bajar y leer los documentos de ESE proceso */
          encolarLecturaDocumentos(id, { manual: true });
          return;
        }
      }
      // repintar el botón de ESA tarjeta y la sección de Mi empresa (si ya arrancó;
      // si no, se invalida lo cargado para que la próxima apertura vuelva a pedir)
      const l = filaDeLista(id);
      if (btn && l) btn.outerHTML = botonGuardar(l);
      seguimientoCargadoPara = null;
      cargarSeguimiento({ forzar: true });
    } catch (e) {
      if (btn) { btn.disabled = false; btn.textContent = "No se pudo"; btn.title = mensajeDeFallo(e, "guardar el proceso"); }
    }
  }
  /* CARGANDO, FALLO Y VACÍO SON TRES ESTADOS Y SE DICEN DISTINTO (5-sep-2026).
     Mientras se pide, el esqueleto (solo la primera vez: en un refresco, vaciar
     la pantalla para repintar lo mismo es peor que no hacer nada) y el vacío
     TAPADO; si falla, habla solo #seg-mensaje. Destapar «Todavía no ha guardado
     ningún proceso» sobre un fallo era afirmarle al usuario algo FALSO sobre sus
     propios datos, bien maquetado. */
  function cargandoSeguimiento(v) {
    const esq = $("seg-skeleton"), vac = $("seg-vacio"), lista = $("seg-lista");
    if (esq) esq.classList.toggle("hidden", !(v && !ultimoSeguimiento));
    if (lista) lista.setAttribute("aria-busy", v ? "true" : "false");
    if (v) { if (vac) vac.classList.add("hidden"); mensajeSeg(null); }
  }
  async function cargarSeguimiento({ forzar = false } = {}) {
    const perfil = $("f-perfil").value;
    if (!forzar && seguimientoCargadoPara === perfil) return;
    let r = null;
    cargandoSeguimiento(true);
    try { r = await api(`/api/perfil?op=seguimiento&perfil=${encodeURIComponent(perfil)}`); }
    catch (e) {
      cargandoSeguimiento(false);
      $("seg-vacio").classList.add("hidden");
      mensajeSeg(mensajeDeFallo(e, "cargar sus procesos guardados"), "error");
      return;
    }
    cargandoSeguimiento(false);
    if (!r || !r.ok) {
      $("seg-vacio").classList.add("hidden");
      // El servidor RESPONDIÓ (hubo r) pero sin la lista: decir «revise su red» sería inventar el
      // diagnóstico, que es justo lo que M-IE-04 vino a quitar. Sin r sí es fallo de transporte.
      mensajeSeg((r && r.error)
        || (r ? "No se pudo cargar sus procesos guardados: el servidor respondió, pero sin la lista. Vuelva a intentar."
              : mensajeDeFallo(null, "cargar sus procesos guardados")), "error");
      return;
    }
    seguimientoCargadoPara = perfil;
    guardados.clear();
    /* `r.procesos` se RECORRE, así que un `ok:true` sin esa lista lanzaba y la
       pestaña entera moría EN SILENCIO — el modo de fallo que este proyecto
       persigue desde el arranque en la zona muerta temporal. Comprobar `ok` no
       basta: hay que comprobar lo que se va a iterar. */
    for (const p of Array.isArray(r.procesos) ? r.procesos : []) guardados.set(p.id, p.estado);
    pintarSeguimiento(r);
    // los botones «Guardar» de la lista tienen que reflejar lo guardado
    document.querySelectorAll("#lista .btn-guardar").forEach((b) => { const l = filaDeLista(b.getAttribute("data-id")); if (l) b.outerHTML = botonGuardar(l); });
  }
  function mensajeSeg(texto, tipo) {
    const m = $("seg-mensaje"); if (!m) return;
    // el botón de reintentar acompaña SOLO al error: un «Guardado» no se reintenta
    const rein = $("seg-reintentar");
    if (rein) rein.classList.toggle("hidden", !(texto && tipo === "error"));
    if (!texto) return m.classList.add("hidden");
    m.className = `mt-3 rounded-xl px-4 py-3 text-sm ${tipo === "error" ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-800"}`;
    m.textContent = texto; m.classList.remove("hidden");
  }
  const fechaCorta = (f) => { if (!f) return "—"; const d = new Date(String(f).slice(0, 10) + "T12:00:00"); return Number.isFinite(d.getTime()) ? d.toLocaleDateString("es-CO", { day: "numeric", month: "short", year: "numeric" }) : String(f).slice(0, 10); };
  /* ── Mis procesos: la pestaña ──
     Arriba, el CENTRO DE ALERTAS (lo que pide atención en 7 días); debajo, la
     lista con etapa por proceso, filtrable por etapa. La insignia de la
     pestaña lleva `resumen.atencion` (cambios sin ver + urgentes). Lo pintado
     sale ENTERO de la respuesta del servidor: aquí no se calcula ni un día. */
  let ultimoSeguimiento = null;
  let segFiltroEstado = "todos";
  let segGuiaAbierta = null; // id del proceso cuya guía va abierta (el último guardado; sobrevive a los repintados)
  let segGuiaScroll = false; // llevar la vista hasta ella UNA vez (no en cada repintado)
  /* ── La guía «Don Héctor» de un proceso guardado ──
     Todo sale de `p.guia` (lib/guia_proceso, servido por op=seguimiento): aquí
     no se calcula ni un peso ni un día. Cinco bloques: la obra en una mirada,
     lo que necesita (con el estado que la aplicación pudo verificar), el paso a
     paso con fechas, los consejos para ESTE proceso y la plata que nadie suma.
     El punto tipográfico hereda el color del tema; sin dato se dice, jamás 0. */
  /* UN SOLO SEMÁFORO (5-sep-2026): las cuatro tablas de esta pestaña ya no
     deciden ni el color ni la palabra — los leen de `Glosario.ESTADO`, que es
     el mismo que pintan los badges de la tarjeta de Licitaciones. Antes
     «revisar» era ámbar en ESTADO_REQ y en EXIG_CLR y AZUL en ESTADO_HECHO:
     el mismo estado, dos colores, en la misma pantalla.

     Las cuatro se ARMAN AL USARLAS, no al cargar el módulo (5-sep-2026):
     `const EST = window.Glosario.ESTADO` a nivel de IIFE mataba app.js entero
     —TypeError durante la evaluación, pantalla y consola limpias— si
     /glosario.js no llegaba. Se arman una vez y se recuerdan. */
  let _tablasSemaforo = null;
  function tablasDelSemaforo() {
    const EST = window.Glosario.ESTADO;
    const ESTADO_REQ = { cumple: [EST.cumple.clase, EST.cumple.largo], revisar: [EST.revisar.clase, EST.revisar.largo], no_cumple: [EST.no_cumple.clase, EST.no_cumple.largo], pendiente: [EST.pendiente.clase, EST.pendiente.largo], sin_dato: [EST.sin_dato.clase, EST.sin_dato.largo] };
    /* `riesgo` pinta el ÁMBAR de «confírmelo» con su propia palabra: es la misma
       señal de «mírelo antes de firmar», no un sexto color. `dato` es un hecho
       leído del pliego que no juzga nada: gris y sin etiqueta. */
    const ESTADO_HECHO = { cumple: [EST.cumple.clase, EST.cumple.largo], no_cumple: [EST.no_cumple.clase, EST.no_cumple.largo], riesgo: [EST.revisar.clase, "Riesgo"], revisar: [EST.revisar.clase, "Confírmelo"], dato: [EST.sin_dato.clase, ""] };
    const CHIP_ESTADO = { cumple: EST.cumple.corto, revisar: EST.revisar.corto, no_cumple: EST.no_cumple.corto, pendiente: EST.pendiente.corto, sin_dato: EST.sin_dato.corto };
    /* `dato` es una cifra leída que no juzga (azul, como «por conseguir»: hay que
       hacer algo con ella) y `por_leer` es «todavía no lo sé», o sea sin dato. */
    const EXIG_CLR = { cumple: EST.cumple.clase, no_cumple: EST.no_cumple.clase, revisar: EST.revisar.clase, dato: EST.pendiente.clase, por_leer: EST.sin_dato.clase, sin_dato: EST.sin_dato.clase };
    return { EST, ESTADO_REQ, ESTADO_HECHO, CHIP_ESTADO, EXIG_CLR };
  }
  const TSEM = () => (_tablasSemaforo || (_tablasSemaforo = tablasDelSemaforo()));
  /* ── Los documentos del proceso: en qué va la lectura, en una línea ──
     Lo que se lee sale de `g.documentos` (servidor); el progreso de la lectura
     en curso vive en `docsProgreso` (navegador) y sobrevive a los repintados. */
  function htmlDocs(p) {
    const d = (p.guia && p.guia.documentos) || null;
    if (!d) return "";
    const prog = docsProgreso.get(p.id);
    const boton = (texto, refrescar) => `<button type="button" data-seg-docs-leer="${esc(p.id)}" data-seg-docs-leer-refrescar="${refrescar ? "1" : "0"}" class="underline">${texto}</button>`;
    if (prog && !prog.error) return `<p class="text-xs text-gray-700">${esc(prog.texto)}</p>${prog.total ? `<div class="mt-1.5 h-1 w-full overflow-hidden rounded bg-gray-100"><div class="h-1 rounded" style="width:${Math.round(100 * prog.hecho / prog.total)}%; background: var(--accent);"></div></div>` : ""}`;
    const enCola = docsCola.some((x) => x.id === p.id);
    const accion = prog && prog.error ? boton("Reintentar", true) : enCola ? "en espera…" : d.estado === "sin_indice" || d.estado === "por_leer" ? boton("Leer los documentos ahora", false) : boton("Volver a buscar documentos (adendas nuevas)", true);
    const enlace = d.enlace_secop && urlSegura(d.enlace_secop) ? ` · <a href="${esc(urlSegura(d.enlace_secop))}" target="_blank" rel="noopener noreferrer" class="underline">Abrir en SECOP II</a>` : "";
    return `<p class="text-xs ${prog && prog.error ? "text-red-700" : "text-gray-700"}">${esc(prog && prog.error ? prog.texto : d.frase)}</p><p class="mt-1 text-[11px] text-gray-500">${accion}${enlace}${d.consultado_el ? ` · índice del ${esc(fechaCorta(d.consultado_el))}` : ""}</p>`;
  }
  function htmlListaDocs(d) {
    const li = (x, extra) => `<li class="flex gap-2"><span class="text-gray-400" aria-hidden="true">●</span><span class="min-w-0"><span class="text-gray-700">${esc(x.tipo_legible || "Documento")}</span> <span class="text-gray-500">· ${esc(x.nombre || "")}</span>${extra ? ` <span class="text-gray-400">· ${extra}</span>` : ""}</span></li>`;
    const bloque = (titulo, lista, extraDe) => (lista && lista.length ? `<p class="mt-2 text-[11px] uppercase tracking-wide text-gray-400">${titulo}</p><ul class="space-y-0.5 text-xs">${lista.map((x) => li(x, extraDe(x))).join("")}</ul>` : "");
    return bloque("Leídos", d.leidos, (x) => (x.paginas ? `${x.paginas} pág.` : ""))
      + bloque("Por leer", d.por_leer, () => "")
      + bloque("No se pudieron leer", d.ilegibles, (x) => esc(x.motivo || ""))
      + bloque("No legibles por la aplicación", d.no_legibles, (x) => `${esc(x.motivo || "")}${x.url && urlSegura(x.url) ? ` · <a href="${esc(urlSegura(x.url))}" target="_blank" rel="noopener noreferrer" class="underline">descargar</a>` : ""}`)
      + (d.de_proponentes ? `<p class="mt-2 text-[11px] text-gray-400">${d.de_proponentes} archivo${d.de_proponentes === 1 ? "" : "s"} más son ofertas de otros proponentes: no son reglas del proceso.</p>` : "");
  }
  /* ── La guía de un proceso guardado (rediseño 4-sep-2026, tercera pasada) ──
     Encargo del dueño: «lo que necesita ver el usuario es la experiencia
     específica y general, los estados financieros y si hay anticipo; cita qué
     dice el pliego, y que lo que cites sea real; no te compliques creando mil
     cosas». Así que la guía ABRE con eso y solo eso: cinco citas literales del
     pliego (`g.citas_pliego`, lib/documentos_proceso.citasDeTexto) con su
     documento y página, y debajo de cada una, si la aplicación además leyó la
     cifra, la comparación con la empresa. Después el dictamen. TODO lo demás
     (veredicto, documentos, ojo con, trámites, consejos, la plata, la obra) va
     en UN solo pliegue «Todo lo demás». Sin dato se dice, jamás 0. */
  const CITA_ESTADO = { citado: "", por_leer: "Se está leyendo el pliego", sin_mencion: "El pliego leído no lo menciona con esas palabras", sin_documentos: "No se ha leído ningún documento" };
  function htmlCitasPliego(g) {
    const lista = g.citas_pliego || [];
    if (!lista.length) return "";
    const docs = g.documentos || {};
    const enlace = docs.enlace_secop && urlSegura(docs.enlace_secop) ? `<a href="${esc(urlSegura(docs.enlace_secop))}" target="_blank" rel="noopener noreferrer" class="underline">Abrir en SECOP II</a>` : "";
    const bloque = (c) => {
      const T = TSEM(); const cifras = (c.cifras || []).map((x) => { const clr = T.EXIG_CLR[x.estado] || T.EST.sin_dato.clase; return `<li class="flex flex-wrap items-baseline gap-x-2"><span class="${clr}" aria-hidden="true">●</span><span class="text-gray-600">${esc(x.titulo)}:</span><span class="num font-medium">${esc(x.exige)}</span>${x.suyo ? `<span class="text-gray-500">· usted ${esc(x.suyo)}</span>` : ""}${x.estado_legible ? `<span class="text-[11px] ${clr}">${esc(x.estado_legible)}</span>` : ""}</li>`; }).join("");
      return `<div class="guia-caja p-3">
        <p class="text-xs font-medium uppercase tracking-wide text-gray-500">${esc(c.titulo)}</p>
        ${c.texto ? `<blockquote class="mt-1.5 text-sm leading-relaxed text-gray-800" style="border-left: 3px solid var(--accent); padding-left: 10px;">«${esc(c.texto)}»</blockquote><p class="mt-1.5 text-[11px] text-gray-400">${esc(c.documento || "")}${c.pagina != null ? `, pág. ${c.pagina}` : ""}</p>`
          : `<p class="mt-1.5 text-sm text-gray-500">${esc(c.nota || CITA_ESTADO[c.estado] || "")}${c.estado === "sin_mencion" && enlace ? ` · ${enlace}` : ""}</p>`}
        ${cifras ? `<ul class="mt-2 space-y-0.5 text-xs">${cifras}</ul>` : ""}
      </div>`;
    };
    return `<div class="space-y-2">${lista.map(bloque).join("")}</div>`;
  }
  const CHIP_REQ = { registro: "Registro", experiencia: "Experiencia", capacidad: "Capacidad", caja: "Caja", financieros: "Indicadores", manifestacion: "Aviso de interés" };
  function htmlVeredicto(g) {
    const chips = (g.requisitos || []).filter((q) => CHIP_REQ[q.clave]).map((q) => {
      const T = TSEM(); const [clr] = T.ESTADO_REQ[q.estado] || T.ESTADO_REQ.sin_dato;
      return `<span class="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs" style="background: var(--bg-card); border: 1px solid var(--border);" title="${esc(q.detalle || "")}"><span class="${clr}" aria-hidden="true">●</span>${esc(CHIP_REQ[q.clave])}: <span class="${clr}">${esc(T.CHIP_ESTADO[q.estado] || q.estado)}</span></span>`;
    });
    return chips.length ? `<div class="flex flex-wrap gap-1.5">${chips.join("")}</div>` : "";
  }
  function htmlCifrasPliego(g) {
    const lista = g.exigencias || [];
    if (!lista.length) return "";
    const con = lista.filter((x) => x.exige != null), sin = lista.filter((x) => x.exige == null);
    const porLeer = sin.length > 0 && sin.every((x) => x.estado === "por_leer");
    const docs = g.documentos || {};
    const enlace = docs.enlace_secop && urlSegura(docs.enlace_secop) ? ` <a href="${esc(urlSegura(docs.enlace_secop))}" target="_blank" rel="noopener noreferrer" class="underline">Abrir en SECOP II</a>` : "";
    const fila = (x) => {
      const T = TSEM(); const clr = T.EXIG_CLR[x.estado] || T.EST.sin_dato.clase;
      /* forma corta del dinero en la celda; la cifra exacta, en el título */
      const cifra = x.tipo_valor === "dinero" && Number.isFinite(Number(x.exige_valor)) ? fmtCorto(Number(x.exige_valor)) : x.exige;
      const titulo = [x.tipo_valor === "dinero" ? `Pide ${x.exige}.` : "", x.nota, x.cita ? `«${x.cita}»` : ""].filter(Boolean).join(" ");
      /* LA NOTA Y LA CITA SE VEN (5-sep-2026): eran el mejor argumento de esta
         tabla y vivían solo en el `title`, que en el teléfono no existe. Van en
         una segunda fila a todo el ancho —no en la celda del requisito, que
         estrujaría las cifras— y el `title` se queda de redundancia. */
      const secundaria = [x.nota, x.cita ? `«${x.cita}»` : ""].filter(Boolean).join(" ");
      return `<tr class="border-t border-gray-100" title="${esc(titulo)}"><td class="py-1.5 pr-3 text-gray-600">${esc(x.titulo)}</td><td class="py-1.5 pr-3 num font-semibold whitespace-nowrap">${esc(cifra)}</td><td class="py-1.5 pr-3 num whitespace-nowrap text-gray-500">${x.suyo ? esc(x.suyo) : "—"}</td><td class="py-1.5 pr-3 whitespace-nowrap ${clr}"><span aria-hidden="true">●</span> ${esc(x.estado_legible || "")}</td><td class="py-1.5 text-[11px] text-gray-400">${x.documento ? `${esc(x.documento)}${x.pagina != null ? `, pág. ${x.pagina}` : ""}` : ""}${x.cambiado_por_adenda ? " · cambió por adenda" : ""}</td></tr>`
        + (secundaria ? `<tr><td colspan="5" class="pb-1.5 text-xs text-gray-600">${esc(secundaria)}</td></tr>` : "");
    };
    const nombres = sin.map((x) => x.titulo.toLowerCase());
    const pie = !sin.length ? ""
      : porLeer ? `<p class="mt-2 text-xs text-gray-500">${con.length ? "Las demás cifras" : "Las cifras del pliego"} aparecen aquí cuando terminen de leerse los documentos.</p>`
        : `<p class="mt-2 text-xs text-gray-500">${con.length ? `Las otras ${sin.length}` : `Estas ${sin.length}`} (${nombres.length <= 3 ? nombres.join(", ") : `${nombres.slice(0, 3).join(", ")} y ${nombres.length - 3} más`}) no están en una línea legible de lo leído: búsquelas en el apartado de requisitos del pliego.${enlace}</p>`;
    return `<div>
      <div class="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1"><h4 class="font-semibold tracking-tight">Lo que fija el pliego</h4>${g.resumen && g.resumen.exigencias && con.length ? `<p class="text-xs text-gray-500">${esc(g.resumen.exigencias.frase)}</p>` : ""}</div>
      ${con.length ? `<div class="mt-2 overflow-x-auto"><table class="w-full text-sm"><thead class="text-left text-[11px] uppercase tracking-wide text-gray-400"><tr><th class="pb-1 pr-3 font-medium">Requisito</th><th class="pb-1 pr-3 font-medium">Pide el pliego</th><th class="pb-1 pr-3 font-medium">Usted</th><th class="pb-1 pr-3 font-medium">Estado</th><th class="pb-1 font-medium">Dónde</th></tr></thead><tbody>${con.map(fila).join("")}</tbody></table></div>` : ""}
      ${pie}
    </div>`;
  }
  function htmlGuia(p) {
    const g = p.guia;
    if (!g || !g.obra) return "";
    const o = g.obra, r = g.resumen || {}, z = (o.donde && o.donde.zona) || {};
    const donde = [o.donde && o.donde.entidad, [o.donde && o.donde.ciudad, o.donde && o.donde.departamento].filter(Boolean).join(", ")].filter(Boolean).join(" · ");
    const zona = z.etiqueta ? `${esc(z.etiqueta)}${z.km != null && z.km > 0 && !/km/.test(z.etiqueta) ? ` (unos ${z.km} km desde ${esc(z.desde || "su base")})` : ""}${alertasZona(z)}` : "";
    const cuanto = [o.cuanto && o.cuanto.legible ? `${esc(o.cuanto.legible)}${o.cuanto.tamano ? ` (${esc(o.cuanto.tamano)})` : ""}` : "Presupuesto no publicado", o.plazo && o.plazo.legible ? `plazo de ${esc(o.plazo.legible)}` : null].filter(Boolean).join(" · ");
    const pago = [o.pago && o.pago.anticipo_legible, o.pago && o.pago.forma_precio === "global" ? "a precio global (el riesgo de cantidades es suyo)" : o.pago && o.pago.forma_precio === "unitarios" ? "a precios unitarios (las cantidades son un estimativo)" : null].filter(Boolean).map(esc).join(" · ");
    const adj = o.como_lo_adjudican || {};
    const dato = (rotulo, valor) => `<div class="min-w-0"><span class="text-[11px] uppercase tracking-wide text-gray-400">${rotulo}</span><p class="text-xs text-gray-700">${valor || "—"}</p></div>`;
    /* «ojo con»: lo que el pliego exige o castiga, citado; los hechos que ya están en la tabla de cifras no se repiten */
    const enFicha = (h) => (g.exigencias || []).length > 0 && (/^requisito_/.test(h.clave) || h.clave === "anticipo");
    const ojo = (g.lo_que_dicen || []).filter((h) => !enFicha(h));
    /* EL HECHO Y SU CITA SE LEEN, NO SE PASAN CON EL RATÓN (5-sep-2026): hasta
       hoy solo las deducciones y las fechas enseñaban su texto y la cita vivía
       entera en el `title` — en el teléfono, donde más se consulta esta guía,
       eso es no tenerla. Ahora todos los hechos enseñan su texto y su cita
       literal; el `title` se conserva como redundancia de escritorio. */
    const liOjo = (h) => { const T = TSEM(); const [clr, eti] = T.ESTADO_HECHO[h.estado] || T.ESTADO_HECHO.dato; return `<li class="flex gap-2" title="${esc([h.texto, h.cita ? `«${h.cita}»` : ""].filter(Boolean).join(" "))}"><span class="${clr}" aria-hidden="true">●</span><span class="min-w-0"><span class="font-medium">${esc(h.titulo)}${h.valor_legible ? `: ${esc(h.valor_legible)}` : ""}</span>${eti ? ` <span class="text-[11px] ${clr}">${eti}</span>` : ""}${h.texto ? `<span class="block text-xs text-gray-600">${esc(h.texto)}</span>` : ""}${h.cita ? `<q class="block text-xs italic text-gray-500">${esc(h.cita)}</q>` : ""}<span class="block text-[11px] text-gray-400">${esc(h.documento || "")}${h.pagina != null ? `, pág. ${h.pagina}` : ""}</span></span></li>`; };
    const ojoVisible = ojo.slice(0, 5), ojoResto = ojo.slice(5);
    const ojoHtml = ojo.length ? `<div><h4 class="font-semibold tracking-tight">Ojo con lo que dice el pliego</h4><ul class="mt-1.5 space-y-1.5">${ojoVisible.map(liOjo).join("")}</ul>${ojoResto.length ? `<details class="mt-1.5"><summary class="cursor-pointer text-xs text-gray-500">${ojoResto.length} más</summary><ul class="mt-1.5 space-y-1.5">${ojoResto.map(liOjo).join("")}</ul></details>` : ""}</div>` : "";
    /* trámites y fechas: los pasos con fecha y, debajo, lo que hay que conseguir (lo que no está en los chips del veredicto) */
    const pasos = (g.pasos || []).map((s) => `<li class="flex gap-2"><span class="w-24 shrink-0 text-xs text-gray-500">${s.cuando_legible ? esc(s.cuando_legible) : "después"}</span><div class="min-w-0"><span class="font-medium">${esc(s.titulo)}</span><p class="text-xs text-gray-600">${esc(s.detalle)}</p></div></li>`).join("");
    const conseguir = (g.requisitos || []).filter((q) => !CHIP_REQ[q.clave]).map((q) => { const T = TSEM(); const [clr, eti] = T.ESTADO_REQ[q.estado] || T.ESTADO_REQ.sin_dato; return `<li class="flex gap-2"><span class="${clr}" aria-hidden="true">●</span><div class="min-w-0"><span class="font-medium">${esc(q.titulo)}</span> <span class="text-[11px] ${clr}">${eti}</span><p class="text-xs text-gray-600">${esc(q.detalle)}</p>${q.donde ? `<p class="text-[11px] text-gray-400">Dónde: ${esc(q.donde)}</p>` : ""}</div></li>`; }).join("");
    const verificados = (g.requisitos || []).filter((q) => CHIP_REQ[q.clave]).map((q) => { const T = TSEM(); const [clr, eti] = T.ESTADO_REQ[q.estado] || T.ESTADO_REQ.sin_dato; return `<li class="flex gap-2"><span class="${clr}" aria-hidden="true">●</span><div class="min-w-0"><span class="font-medium">${esc(q.titulo)}</span> <span class="text-[11px] ${clr}">${eti}</span><p class="text-xs text-gray-600">${esc(q.detalle)}</p>${q.donde ? `<p class="text-[11px] text-gray-400">Dónde: ${esc(q.donde)}</p>` : ""}</div></li>`; }).join("");
    const consejos = (g.consejos || []).map((c) => `<li><span class="font-medium">${esc(c.titulo)}</span>${c.por_que_aqui ? ` <span class="text-[11px] text-gray-400">(${esc(c.por_que_aqui)})</span>` : ""}<p class="text-xs text-gray-600">${esc(c.detalle)}</p></li>`).join("");
    const d = g.dinero || {};
    const fila = (k, v) => (v != null ? `<tr><td class="py-1 pr-3 text-gray-600">${k}</td><td class="py-1 text-right num">${esc(fmtCorto(v))}</td></tr>` : "");
    const dinero = `<table class="w-full text-xs"><tbody>${fila("Presupuesto oficial", d.presupuesto_oficial_cop)}${fila("Contribución de obra pública (5 %), descontada en cada pago", d.contribucion_obra_5pct_cop)}${fila("Garantía de seriedad: valor asegurado (10 %)", d.garantia_seriedad_asegurada_cop)}${fila("Anticipo (va a una fiducia)", d.anticipo_cop)}${fila("Plata suya antes del primer pago (estimado)", d.financiacion_antes_del_primer_pago_cop)}</tbody></table>
      <ul class="mt-2 space-y-0.5 text-[11px] text-gray-500">${(d.otros_que_nadie_suma || []).map((x) => `<li>${esc(x.concepto)}: ${esc(x.tipico)} <span class="text-gray-400">(${esc(x.nota)})</span></li>`).join("")}</ul>
      ${d.nota ? `<p class="mt-1 text-[11px] text-gray-400">${esc(d.nota)}</p>` : ""}`;
    const obraHtml = `<div class="grid gap-3 sm:grid-cols-2">
          ${dato("Qué es", o.que_es ? `${esc(o.que_es)}${o.tipo_trabajo_legible ? ` <span class="text-gray-400">· ${esc(o.tipo_trabajo_legible)}</span>` : ""}` : null)}
          ${dato("Dónde", donde ? `${esc(donde)}${zona ? `<br><span class="text-gray-500">${zona}</span>` : ""}` : null)}
          ${dato("Cuánto y por cuánto tiempo", cuanto)}
          ${dato("Cómo pagan", pago ? `${pago}${o.pago && o.pago.fuente_anticipo && /pág\./.test(o.pago.fuente_anticipo) ? ` <span class="text-gray-400">· ${esc(o.pago.fuente_anticipo)}</span>` : ""}` : null)}
          <div class="min-w-0 sm:col-span-2"><span class="text-[11px] uppercase tracking-wide text-gray-400">Cómo lo adjudican</span><p class="text-xs text-gray-700">${adj.nombre ? `<span class="font-medium">${esc(adj.nombre)}.</span> ` : ""}${esc(adj.explicacion || "")}</p></div>
        </div>`;
    const abierta = segGuiaAbierta === p.id;
    /* La caja del dictamen la pinta pliego.js (window.__pliegoDictamenEn) cuando el
       pliegue se abre (op=dictamen: el «Don Héctor» que lee el pliego completo, con
       el MISMO flujo del lector). Se pide al abrir, no al pintar: cada GET lee el
       texto guardado. «Cargar el pliego» abre Precios con ESTE proceso precargado
       (qApu desde la foto) para quien tenga un pliego que no se leyó solo. */
    const dictamen = `<div class="guia-caja p-3">
        <div data-seg-dictamen="${esc(p.id)}"><p class="text-xs font-medium uppercase tracking-wide text-gray-500">Dictamen del pliego</p>
        <p class="mt-1 text-xs text-gray-600">Si conviene presentarse y por qué, con citas por página del pliego leído.</p>
        <button type="button" data-seg-dictamen-ver="${esc(p.id)}" class="mt-2 bg-gray-900 px-3 py-1.5 text-xs font-medium transition">Ver el dictamen del pliego</button></div>
        <p class="mt-2 text-[13px] text-gray-500">¿El pliego no se leyó solo? <button type="button" data-seg-abrir-lector="${esc(p.id)}" class="underline">Cargar el pliego (PDF)</button> lo abre en Precios con el proceso ya puesto.</p>
      </div>`;
    const docs = g.documentos || null;
    const nDocs = docs ? (docs.leidos || []).length + (docs.por_leer || []).length + (docs.ilegibles || []).length + (docs.no_legibles || []).length : 0;
    const plegado = (titulo, cuerpo) => `<details class="guia-caja"><summary class="cursor-pointer px-3 py-2 text-sm font-semibold tracking-tight">${titulo}</summary><div class="px-3 pb-3">${cuerpo}</div></details>`;
    const nPasos = (g.pasos || []).length + (g.requisitos || []).filter((q) => !CHIP_REQ[q.clave]).length;
    /* «el más próximo» SOLO si el pliego trae la fecha: aquí no se inventa un
       día ni se deduce de un techo legal. Se toma la primera que no ha pasado;
       si todas quedaron atrás, el pliegue va sin fecha. */
    /* EL «HOY» ES EL DE COLOMBIA, NO EL DE GREENWICH (5-sep-2026). Con
       `toISOString()` la fecha UTC ya es la de mañana desde las 19:00 en Bogotá
       (UTC−5), que es justo cuando el dueño revisa: un trámite que vence HOY se
       descartaba por «pasado» y el pliegue anunciaba el siguiente, o ninguno.
       Es el mismo cuidado que `fechaCorta` toma con el `T12:00:00` y el que ya
       usa public/portada.js. «en-CA» da la fecha en YYYY-MM-DD, que es el
       formato con el que se comparan las del servidor. */
    const hoyCol = new Date().toLocaleDateString("en-CA", { timeZone: "America/Bogota" });
    const proximoPaso = (g.pasos || []).map((s) => s.cuando).filter(Boolean).map((f) => String(f).slice(0, 10)).sort()
      .find((f) => f >= hoyCol) || null;
    return `<details class="mt-3 rounded-xl ring-1 ring-inset ring-gray-900/5" data-seg-guia="${esc(p.id)}" style="background: var(--bg-inset);"${abierta ? " open" : ""}>
      <summary class="cursor-pointer px-3 py-2 text-sm font-medium"><span>Qué necesita para presentarse: lo que dice el pliego${r.frase ? ` <span class="text-xs font-normal text-gray-500">· ${esc(r.frase)}</span>` : ""}${g.completa === false ? ` <span class="text-[11px] font-normal text-amber-900">· guía parcial: el proceso ya no está en la lista viva</span>` : ""}</span></summary>
      <div class="space-y-4 px-3 pb-3 text-sm">
        ${htmlCitasPliego(g)}
        ${dictamen}
        ${plegado("Todo lo demás", `<div class="space-y-4 pt-1">
          ${htmlVeredicto(g)}
          ${docs ? `<div class="text-xs" data-seg-docs="${esc(p.id)}">${htmlDocs(p)}</div>` : ""}
          ${htmlCifrasPliego(g)}
          ${ojoHtml}
          ${plegado(resumenSummary("Trámites y fechas", nPasos, proximoPaso ? `el más próximo: ${fechaCorta(proximoPaso)}` : ""), `<ol class="space-y-2">${pasos}</ol>${conseguir ? `<p class="mt-3 text-[11px] uppercase tracking-wide text-gray-400">Lo que tiene que conseguir</p><ul class="mt-1.5 space-y-2">${conseguir}</ul>` : ""}${verificados ? `<p class="mt-3 text-[11px] uppercase tracking-wide text-gray-400">Lo que la aplicación verificó</p><ul class="mt-1.5 space-y-2">${verificados}</ul>` : ""}`)}
          ${plegado(resumenSummary("Consejos para este proceso", (g.consejos || []).length, ""), `<ul class="space-y-2">${consejos}</ul>`)}
          ${plegado("La plata que nadie suma", dinero)}
          ${plegado("La obra en una mirada", obraHtml)}
          ${nDocs ? plegado(resumenSummary("Documentos del proceso", nDocs, ""), htmlListaDocs(docs)) : ""}
          ${g.como_leerlo ? `<p class="text-[11px] text-gray-400">${esc(g.como_leerlo)}</p>` : ""}
        </div>`)}
      </div>
    </details>`;
  }
  function pintarInsigniaSeguimiento(n) {
    for (const id of ["seg-insignia", "seg-insignia-movil"]) {
      const el = $(id); if (!el) continue;
      el.textContent = n > 99 ? "99+" : String(n || 0);
      el.classList.toggle("hidden", !n);
    }
  }
  function pintarAlertasSeguimiento(r) {
    const sec = $("seg-alertas"), ul = $("seg-alertas-lista"), n = $("seg-alertas-n");
    if (!sec) return;
    const as = (r.alertas || []).filter((a) => segFiltroEstado === "todos" || (r.procesos.find((p) => p.id === a.id) || {}).estado === segFiltroEstado);
    sec.classList.toggle("hidden", !as.length);
    if (!as.length) return;
    n.textContent = `${as.length} en los próximos 7 días`;
    const clr = { alta: "bg-red-100 text-red-700", media: "bg-amber-100 text-amber-900", baja: "bg-gray-100 text-gray-700" };
    const tipo = { cambio: "Cambió", manifestacion: window.Glosario.corto("manifestacion_interes"), cierre: "Cierre", aviso: "Aviso" };
    ul.innerHTML = as.map((a) => `<li class="flex flex-wrap items-start gap-2 rounded-xl px-3 py-2 ring-1 ring-inset ring-gray-900/5" style="background: var(--bg-inset);">
        <span class="mt-0.5 rounded-full px-2 py-0.5 text-[11px] font-medium ${clr[a.urgencia] || clr.baja}">${esc(tipo[a.tipo] || a.tipo)}</span>
        <span class="min-w-0 flex-1"><button type="button" data-seg-ir="${esc(a.id)}" class="titulo-tarjeta font-medium hover:underline text-left" title="${esc(a.proceso)}">${esc(a.proceso)}</button><br><span class="text-xs text-gray-600">${esc(a.mensaje)}</span></span>
        ${a.tipo === "cambio" ? `<button type="button" data-seg-enterado="${esc(a.id)}" class="rounded-lg border border-gray-300 bg-white px-2 py-0.5 text-[11px] font-medium hover:bg-gray-50" title="Dar por visto: el próximo aviso será solo si vuelve a cambiar">Enterado</button>` : ""}
      </li>`).join("");
  }
  /* CÓMO LE VA DE VERDAD (M-DGF-09, 6-sep-2026). `resumen.por_estado` viajaba
     desde ago 2026 y la pestaña solo lo usaba en los chips-filtro: la persona
     nunca veía su resultado y no tenía motivo para registrar «Ganado» o
     «Perdido», que es la única etiqueta que le falta al dueño para calibrar.
     Aquí se enseña el HECHO —la barra de composición del pulso (`Pulso.apilada`)
     y la frase literal «Ganó 1 de 3 presentadas»— y solo con TRES o más
     presentadas (ganadas + perdidas + sin resultado): un porcentaje sobre uno o
     dos casos es ruido con aspecto de medición. Sin `por_estado`, o con un
     conteo ausente, no se pinta nada: «sin dato» no es «0 %». No pasa por
     `frecuenciaNatural`: aquella recibe una probabilidad y habla de «procesos
     como este»; esto es un conteo propio. Función pura: la suite la ejecuta. */
  function htmlDesenlaceSeguimiento(porEstado) {
    if (!porEstado || typeof porEstado !== "object" || !window.Pulso) return "";
    const conteo = (k) => {
      const v = porEstado[k];
      if (v === null || v === undefined || v === "") return null;
      const n = Number(v);
      return Number.isFinite(n) && n >= 0 ? n : null;
    };
    const g = conteo("ganado"), p = conteo("perdido"), s = conteo("presentado");
    if (g === null || p === null || s === null) return "";
    const total = g + p + s;
    if (total < 3) return "";
    const barra = window.Pulso.apilada([
      { etiqueta: "Ganadas", n: g }, { etiqueta: "Perdidas", n: p }, { etiqueta: "Sin resultado", n: s },
    ]);
    return `<p class="text-[11px] uppercase tracking-wide text-gray-400">Cómo le va</p>
      <p class="mt-1 text-sm font-semibold">Ganó ${g} de ${total} presentadas${s > 0 ? ` · ${s} sin resultado todavía` : ""}</p>${barra}`;
  }
  function pintarSeguimiento(r) {
    ultimoSeguimiento = r;
    const lista = $("seg-lista"), vacio = $("seg-vacio"), res = $("seg-resumen"), filtros = $("seg-filtros");
    if (!lista) return;
    const todos = r.procesos || [];
    pintarInsigniaSeguimiento(r.resumen ? r.resumen.atencion : 0);
    /* el resultado propio, arriba de los chips; sin tres presentadas la caja se esconde */
    const desenlace = $("seg-desenlace");
    if (desenlace) {
      desenlace.innerHTML = htmlDesenlaceSeguimiento(r.resumen ? r.resumen.por_estado : null);
      desenlace.classList.toggle("hidden", !desenlace.innerHTML);
    }
    /* «Todavía no ha guardado ningún proceso» es una AFIRMACIÓN sobre los datos
       del usuario: solo puede hacerse cuando la respuesta llegó BIEN y venía
       vacía. Con `todos.length > 0` a secas, cualquier ruta que llamara aquí sin
       respuesta válida la destapaba. */
    vacio.classList.toggle("hidden", !(r && r.ok === true && todos.length === 0));
    const esq = $("seg-skeleton"); if (esq) esq.classList.add("hidden");
    const rs = r.resumen || {};
    res.innerHTML = todos.length ? [
      `<span class="rounded-full bg-gray-100 px-2.5 py-1 text-gray-700">${todos.length} guardado${todos.length === 1 ? "" : "s"}</span>`,
      `<span class="rounded-full bg-gray-100 px-2.5 py-1 text-gray-700">${rs.abiertos} abierto${rs.abiertos === 1 ? "" : "s"}</span>`,
      rs.presentados ? `<span class="bg-gray-900 rounded-full px-2.5 py-1">${rs.presentados} presentado${rs.presentados === 1 ? "" : "s"}</span>` : "",
      rs.cambios_pendientes ? `<span class="rounded-full bg-red-100 px-2.5 py-1 text-red-700">${rs.cambios_pendientes} cambio${rs.cambios_pendientes === 1 ? "" : "s"} sin ver</span>` : "",
      rs.manifestaciones_abiertas ? `<span class="rounded-full bg-amber-100 px-2.5 py-1 text-amber-900">${rs.manifestaciones_abiertas} en los que todavía puede avisar que le interesa</span>` : "",
      rs.avisos_proximos ? `<span class="rounded-full bg-amber-100 px-2.5 py-1 text-amber-900">${rs.avisos_proximos} aviso${rs.avisos_proximos === 1 ? "" : "s"} esta semana</span>` : "",
    ].filter(Boolean).join("") : "";
    // filtros por etapa
    if (filtros) {
      const orden = ["todos", ...(r.orden_estados || Object.keys(r.estados || {}))];
      const cuenta = (e) => (e === "todos" ? todos.length : todos.filter((p) => p.estado === e).length);
      filtros.innerHTML = todos.length ? orden.filter((e) => e === "todos" || cuenta(e)).map((e) =>
        chipToggle(segFiltroEstado === e, `${e === "todos" ? "Todos" : (r.estados[e] || e)} (${cuenta(e)})`, "", `data-seg-filtro="${e}"`)).join("") : "";
    }
    pintarAlertasSeguimiento(r);
    const ps = segFiltroEstado === "todos" ? todos : todos.filter((p) => p.estado === segFiltroEstado);
    lista.innerHTML = ps.map((p) => {
      const pr = p.proceso || {};
      const dias = p.dias_para_cierre;
      const cierre = p.cerrado === true ? `<span class="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] text-gray-600">Cerró ${esc(fechaCorta(pr.fecha_cierre))}</span>`
        : dias == null ? `<span class="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] text-gray-600">Sin fecha de cierre publicada</span>`
          : `<span class="rounded-full px-2 py-0.5 text-[11px] ${dias <= 3 ? "bg-red-100 text-red-700" : dias <= 7 ? "bg-amber-100 text-amber-900" : "bg-emerald-50 text-emerald-800"}">${dias === 0 ? "Cierra HOY" : dias === 1 ? "Cierra mañana" : `Cierra en ${dias} días`} · ${esc(fechaCorta(pr.fecha_cierre))}</span>`;
      const m = p.manifestacion;
      /* mismo criterio que la tarjeta: sin fecha del cronograma no hay cuenta
         atrás, porque la ley fija un máximo y la entidad pone el suyo */
      const manif = !(m && m.aplica) ? ""
        : m.estado === "vencida" ? `<span class="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] text-gray-600" title="${esc(m.nota || "")}">Avisar que le interesa: plazo vencido</span>`
          : m.estado === "sin_fecha" ? `<span class="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] text-amber-900" title="${esc(m.nota || "")}">Avisar que le interesa: fecha por confirmar</span>`
            : m.estado === "por_confirmar" ? `<span class="rounded-full bg-red-100 px-2 py-0.5 text-[11px] text-red-700" title="${esc(m.nota || "")}">Avisar que le interesa: verifique HOY en SECOP II</span>`
              : m.confirmada ? `<span class="rounded-full px-2 py-0.5 text-[11px] ${m.quedan_habiles != null && m.quedan_habiles <= 2 ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-900"}" title="${esc(m.nota || "")}">Avisar que le interesa hasta ${esc(m.fecha_limite_legible || "")}${m.dias_calendario === 0 ? " · HOY" : m.dias_calendario === 1 ? " · mañana" : ` · ${m.quedan_habiles} días de oficina`}</span>`
                : `<span class="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] text-amber-900" title="${esc(m.nota || "")}">Avisar que le interesa: puede cerrar el ${esc(m.puede_cerrar_desde_legible || "")}</span>`;
      const aviso = p.proximo_aviso ? `<p class="mt-1 text-xs text-amber-900">Próximo aviso: ${esc(p.proximo_aviso.mensaje)}</p>` : "";
      const cambios = (p.cambios || []).length ? `<div class="mt-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-800 ring-1 ring-inset ring-red-600/10">
          <p class="font-medium">Cambió desde la última vez que lo vio${p.visto_el ? ` (${esc(fechaCorta(p.visto_el))})` : ""}:</p>
          <ul class="mt-1 space-y-0.5">${p.cambios.map((c) => `<li>${esc(c.mensaje)}</li>`).join("")}</ul>
          <button type="button" data-seg-enterado="${esc(p.id)}" class="mt-1.5 rounded-lg border border-red-200 bg-white px-2 py-0.5 text-[11px] font-medium hover:bg-red-50">Enterado</button>
        </div>` : "";
      const hitos = (p.hitos || []).map((h) => `<span class="rounded bg-gray-50 px-1.5 py-0.5 text-[11px] text-gray-600" title="${esc(h.evidencia || "")}">${esc(h.etiqueta.split(":")[0])}${h.origen === "calculado" ? " (calc.)" : ""}: ${esc(fechaCorta(h.fecha))}</span>`).join(" ");
      const estados = r.orden_estados || Object.keys(r.estados || {});
      return `<article class="rounded-xl border border-gray-100 p-4" data-seg-id="${esc(p.id)}">
        <div class="flex flex-wrap items-start justify-between gap-2">
          <div class="min-w-0">
            <p class="font-medium leading-snug">${urlSegura(pr.url) ? `<a href="${esc(urlSegura(pr.url))}" target="_blank" rel="noopener noreferrer" class="hover:underline">${esc(pr.nombre || p.id)}</a>` : esc(pr.nombre || p.id)}</p>
            <p class="text-xs text-gray-500">${esc(pr.entidad || "—")}${pr.departamento ? ` · ${esc(pr.departamento)}` : ""}${pr.presupuesto_cop ? ` · ${esc(fmtCorto(pr.presupuesto_cop))}` : ""}${p.estado_secop ? ` · ${esc(p.estado_secop)}` : ""}${p.adjudicado ? " · adjudicado" : ""}</p>
          </div>
          <select data-seg-estado="${esc(p.id)}" class="control-select rounded-lg" aria-label="Etapa de este proceso en su seguimiento" title="Etapa en su seguimiento">
            ${estados.map((e) => `<option value="${e}" ${p.estado === e ? "selected" : ""}>${esc(r.estados[e] || e)}</option>`).join("")}
          </select>
        </div>
        <div class="mt-2 flex flex-wrap items-center gap-2">${cierre}${manif}${hitos}</div>
        ${aviso}
        ${cambios}
        ${htmlGuia(p)}
        <div class="mt-3 flex flex-wrap items-center gap-2 text-xs">
          <button type="button" data-seg-ics="${esc(p.id)}" class="rounded-lg border border-gray-300 px-2.5 py-1 font-medium transition hover:bg-gray-50" title="Descargar el cronograma con alarmas a 7, 3 y 1 días (formato de calendario)">Calendario (.ics)</button>
          ${p.proponentes_disponibles ? `<button type="button" data-seg-detalle="${esc(p.id)}" class="bg-gray-900 px-2.5 py-1 font-medium transition">Quiénes se presentaron</button>` : `<span class="text-gray-400" title="Los proponentes solo aparecen en la fuente pública tras la apertura de ofertas">Los proponentes se conocen cuando cierra</span>`}
          <button type="button" data-seg-quitar="${esc(p.id)}" class="ml-auto text-gray-400 hover:text-red-600">Quitar</button>
        </div>
        <div data-seg-caja="${esc(p.id)}" class="mt-3 hidden"></div>
      </article>`;
    }).join("");
    if (!ps.length && todos.length) lista.innerHTML = `<p class="text-sm text-gray-500">Ningún proceso en esa etapa.</p>`;
    if (segGuiaAbierta && segGuiaScroll) {
      const art = lista.querySelector(`[data-seg-id="${CSS.escape(segGuiaAbierta)}"]`);
      segGuiaScroll = false;
      if (art) { art.scrollIntoView({ block: "start" }); art.classList.add("ring-2", "ring-blue-300"); setTimeout(() => art.classList.remove("ring-2", "ring-blue-300"), 1600); }
    }
    /* los procesos ABIERTOS con documentos por leer se leen solos (uno a la vez,
       como mucho una vez por carga de la página); los cerrados, al pulsar */
    for (const p of ps) {
      const de = p.guia && p.guia.documentos ? p.guia.documentos.estado : null;
      if ((de === "sin_indice" || de === "por_leer") && p.cerrado !== true) encolarLecturaDocumentos(p.id);
    }
  }
  /* Consulta el dictamen de un guardado en SU caja por el flujo de pliego.js.
     Se dispara al abrir el pliegue de la guía (una vez por pintado) y con el botón. */
  async function consultarDictamenGuardado(id) {
    const caja = secSeg.querySelector(`[data-seg-dictamen="${CSS.escape(id)}"]`);
    if (!caja || caja.dataset.consultado === "1") return;
    caja.dataset.consultado = "1";
    if (typeof window.__pliegoDictamenEn !== "function") { caja.innerHTML = `<p class="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">El lector de pliegos no cargó en esta página: recargue e intente de nuevo.</p>`; return; }
    await window.__pliegoDictamenEn(caja, id, $("f-perfil").value);
  }
  /* ── Los documentos del proceso se leen SOLOS (3-sep-2026) ──
     Al guardar (y al abrir Mis procesos con documentos por leer) el navegador pide
     el índice (op=documentos), baja cada PDF por el proxy (op=descargar), lo lee
     con el pdf.js del lector (window.__pliegoLeerPdf) y devuelve el texto
     (op=documentos POST); el servidor saca los hechos y rehace la guía. Un
     proceso a la vez (cola) y cada uno como mucho UNA vez por carga de la página
     salvo que el usuario lo pida (docsIntentados): un documento que falla siempre
     no puede dejar la pestaña leyendo en bucle. El progreso vive en
     `docsProgreso` y sobrevive a los repintados de la lista. */
  const docsCola = [];
  const docsIntentados = new Set();
  const docsProgreso = new Map();
  let docsEnCurso = null;
  function pintarProgresoDocs(id) {
    const c = secSeg && secSeg.querySelector(`[data-seg-docs="${CSS.escape(id)}"]`);
    const p = ((ultimoSeguimiento && ultimoSeguimiento.procesos) || []).find((x) => x.id === id);
    if (c && p) c.innerHTML = htmlDocs(p);
  }
  function encolarLecturaDocumentos(id, { manual = false, refrescar = false } = {}) {
    if (!id || docsEnCurso === id || docsCola.some((x) => x.id === id)) return;
    if (!manual && docsIntentados.has(id)) return;
    docsIntentados.add(id);
    docsProgreso.delete(id);
    docsCola.push({ id, refrescar });
    pintarProgresoDocs(id);
    bombearLecturaDocumentos();
  }
  function bombearLecturaDocumentos() {
    if (docsEnCurso || !docsCola.length) return;
    const { id, refrescar } = docsCola.shift();
    docsEnCurso = id;
    leerDocumentos(id, { refrescar }).catch(() => {}).finally(() => { docsEnCurso = null; bombearLecturaDocumentos(); });
  }
  function bytesDeBase64(b64) { const bin = atob(String(b64 || "")); const datos = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) datos[i] = bin.charCodeAt(i); return datos; }
  async function leerDocumentos(id, { refrescar = false } = {}) {
    const avanzar = (texto, hecho, total) => { docsProgreso.set(id, { texto, hecho, total }); pintarProgresoDocs(id); };
    const perfil = $("f-perfil").value;
    let leidos = 0, fallidos = 0, buscado = false;
    try {
      avanzar("Buscando los documentos del proceso en SECOP II…", 0, 0);
      const r = await api(`/api/pliego?op=documentos&id_proceso=${encodeURIComponent(id)}${refrescar ? "&refrescar=1" : ""}`);
      buscado = true;
      const pend = Array.isArray(r.pendientes) ? r.pendientes : [];
      for (let i = 0; i < pend.length; i++) {
        const a = pend[i];
        avanzar(`Leyendo ${i + 1} de ${pend.length}: ${a.tipo_legible || "documento"} (${a.nombre || ""})…`, i, pend.length);
        /* `definitivo` solo para el escaneo sin texto: una descarga que falla hoy se reintenta al «volver a buscar» */
        const marcarIlegible = (motivo, definitivo) => api("/api/pliego?op=documentos", { method: "POST", body: { id_proceso: id, id_documento: a.id_documento, ilegible: true, definitivo: definitivo === true, motivo: String(motivo).slice(0, 200) } });
        try {
          const d = await api("/api/pliego?op=descargar", { method: "POST", body: { url: a.url } });
          if (typeof window.__pliegoLeerPdf !== "function") throw new Error("el lector de pliegos no cargó en esta página");
          const lect = await window.__pliegoLeerPdf(bytesDeBase64(d.base64));
          if (lect.escaneado) { await marcarIlegible("sin capa de texto: parece un escaneo", true); fallidos++; continue; }
          await api("/api/pliego?op=documentos", { method: "POST", body: { id_proceso: id, id_documento: a.id_documento, texto: lect.texto, perfil } });
          leidos++;
        } catch (e) {
          fallidos++;
          try { await marcarIlegible(`no se pudo leer: ${fraseDeFallo(e)}`, false); } catch { /* se reintenta la próxima vez */ }
        }
      }
      docsProgreso.delete(id);
    } catch (e) {
      /* la búsqueda falló: se dice en la caja y queda el botón «Reintentar» */
      docsProgreso.set(id, { texto: mensajeDeFallo(e, "buscar los documentos de este proceso"), hecho: 0, total: 0, error: true });
    }
    /* la guía se rehace en el servidor con lo leído: repintar Mis procesos y, si
       esa guía está abierta, consultar el dictamen (ahora ya hay pliego) */
    if (buscado) {
      seguimientoCargadoPara = null;
      await cargarSeguimiento({ forzar: true });
      const det = secSeg && secSeg.querySelector(`details[data-seg-guia="${CSS.escape(id)}"]`);
      if (det && det.open && (leidos || fallidos)) consultarDictamenGuardado(id);
    } else pintarProgresoDocs(id);
  }
  function pintarDetalleCompetencia(caja, d) {
    if (!d || !d.ok) { caja.innerHTML = `<p class="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">${esc((d && d.motivo) || "No se pudo consultar.")}</p>`; return; }
    if (!d.proponentes.length) { caja.innerHTML = `<p class="rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-600">${esc(d.motivo || "Sin proponentes publicados.")}</p>`; return; }
    const filas = d.proponentes.map((c) => {
      const e = c.ante_esta_entidad || {}, v = c.contratos_vigentes;
      const firmas = v && v.firmas && v.firmas.length ? v.firmas.map((f) => `${esc(fechaCorta(f.fecha_firma))} · ${f.valor_cop != null ? esc(fmtCorto(f.valor_cop)) : "—"}${f.entidad ? ` · ${esc(f.entidad)}` : ""}`).join("<br>") : "";
      return `<tr class="align-top">
        <td class="py-2 pr-3"><span class="font-medium">${esc(c.nombre)}</span><br><span class="text-[11px] text-gray-500">${c.nit ? `NIT ${esc(c.nit)}` : "sin NIT publicado"}</span></td>
        <td class="py-2 pr-3 text-right num" title="Fuente: SECOP II, proponentes por proceso, por código de la entidad">${e.veces_presentado != null ? e.veces_presentado : "—"}${e.ultima_vez ? `<br><span class="text-[11px] text-gray-500">última ${esc(fechaCorta(e.ultima_vez))}</span>` : ""}</td>
        <td class="py-2 pr-3 text-right num" title="Fuente: SECOP II, procesos adjudicados, por NIT de la entidad">${e.veces_ganado != null ? e.veces_ganado : "—"}${e.ultimo_adjudicado ? `<br><span class="text-[11px] text-gray-500">último ${esc(fechaCorta(e.ultimo_adjudicado))}</span>` : ""}</td>
        <td class="py-2 pr-3 text-right num" title="Fuente: SECOP II, contratos electrónicos vigentes · es el valor que ya tiene comprometido, no la capacidad que le queda (eso exige su registro de proponente)">${v ? `${v.contratos}${v.valor_cop != null ? `<br><span class="text-[11px] text-gray-500">${esc(fmtCorto(v.valor_cop))}</span>` : ""}` : "—"}${firmas ? `<details class="mt-1 text-left"><summary class="cursor-pointer text-[11px] text-gray-500">firmas</summary><p class="text-[11px] text-gray-600">${firmas}</p></details>` : ""}</td>
        <td class="py-2 text-right">${c.nit ? `<button type="button" data-seg-verificar="${esc(c.nit)}" class="rounded-lg border border-gray-300 px-2 py-0.5 text-[11px] font-medium hover:bg-gray-50" title="Sanciones (Procuraduría) y multas de SECOP I, por NIT">Verificar</button>` : ""}</td>
      </tr>`;
    }).join("");
    caja.innerHTML = `
      <p class="text-xs text-gray-500">${esc(d.proponentes_totales)} proponente${d.proponentes_totales === 1 ? "" : "s"} en ${esc((d.entidad && d.entidad.nombre) || "la entidad")}${d.cache ? " · consultado hace menos de una hora" : ""}. ${esc(d.lectura || "")}</p>
      <div class="mt-2 overflow-x-auto"><table class="w-full text-xs">
        <thead class="text-left text-[11px] uppercase tracking-wide text-gray-400"><tr><th class="pb-1 pr-3">Proponente</th><th class="pb-1 pr-3 text-right">Veces ante esta entidad</th><th class="pb-1 pr-3 text-right">Ganadas · último</th><th class="pb-1 pr-3 text-right">Contratos vigentes</th><th class="pb-1"></th></tr></thead>
        <tbody class="divide-y divide-gray-100">${filas}</tbody></table></div>
      <p class="mt-2 text-[13px] text-gray-400">«Contratos vigentes» es el valor que ese competidor ya tiene comprometido, no la capacidad que le queda: calcularla exige su registro de proponente, que no es público. Las ganadas se cruzan por NIT de la entidad, que a veces se comparte entre regionales.</p>`;
  }
  /* «Reintentar» repite la MISMA carga, sin recargar la página: hasta hoy la
     única salida de un fallo en esta pestaña era el botón de recargar del
     navegador, que además pierde la pestaña abierta. */
  if ($("seg-reintentar")) $("seg-reintentar").addEventListener("click", () => cargarSeguimiento({ forzar: true }));
  const secSeg = document.getElementById("tab-seguimiento") || document.getElementById("seccion-seguimiento");
  if (secSeg) {
    /* al ABRIR la guía de un guardado se consulta su dictamen sin pulsar nada más */
    secSeg.addEventListener("toggle", (ev) => {
      const det = ev.target && ev.target.matches && ev.target.matches("details[data-seg-guia]") ? ev.target : null;
      if (det && det.open) consultarDictamenGuardado(det.getAttribute("data-seg-guia"));
    }, true);
    secSeg.addEventListener("change", async (ev) => {
      const sel = ev.target.closest("[data-seg-estado]");
      if (!sel) return;
      const id = sel.getAttribute("data-seg-estado");
      try { await api("/api/perfil?op=seguimiento", { method: "POST", body: { perfil: $("f-perfil").value, id, estado: sel.value } }); guardados.set(id, sel.value); mensajeSeg("Estado actualizado.", "ok"); setTimeout(() => mensajeSeg(""), 2000); cargarSeguimiento({ forzar: true }); }
      catch (e) { mensajeSeg(fraseDeFallo(e), "error"); }
    });
    secSeg.addEventListener("click", async (ev) => {
      const fe = ev.target.closest("[data-seg-filtro]");
      if (fe) { segFiltroEstado = fe.getAttribute("data-seg-filtro"); if (ultimoSeguimiento) pintarSeguimiento(ultimoSeguimiento); return; }
      const ir = ev.target.closest("[data-seg-ir]");
      if (ir) { const art = secSeg.querySelector(`[data-seg-id="${CSS.escape(ir.getAttribute("data-seg-ir"))}"]`); if (art) { art.scrollIntoView({ behavior: "smooth", block: "center" }); art.classList.add("ring-2", "ring-blue-300"); setTimeout(() => art.classList.remove("ring-2", "ring-blue-300"), 1600); } return; }
      const en = ev.target.closest("[data-seg-enterado]");
      if (en) {
        const id = en.getAttribute("data-seg-enterado"); en.disabled = true;
        try { await api("/api/perfil?op=seguimiento", { method: "POST", body: { perfil: $("f-perfil").value, id, enterado: true } }); await cargarSeguimiento({ forzar: true }); }
        catch (e) { en.disabled = false; mensajeSeg(fraseDeFallo(e), "error"); }
        return;
      }
      const q = ev.target.closest("[data-seg-quitar]");
      if (q) { if (segGuiaAbierta === q.getAttribute("data-seg-quitar")) segGuiaAbierta = null; await alternarGuardado(q.getAttribute("data-seg-quitar"), null); return; }
      const dl = ev.target.closest("[data-seg-docs-leer]");
      if (dl) { dl.disabled = true; encolarLecturaDocumentos(dl.getAttribute("data-seg-docs-leer"), { manual: true, refrescar: dl.getAttribute("data-seg-docs-leer-refrescar") === "1" }); return; }
      const dv = ev.target.closest("[data-seg-dictamen-ver]");
      if (dv) { dv.disabled = true; dv.textContent = "Consultando…"; await consultarDictamenGuardado(dv.getAttribute("data-seg-dictamen-ver")); return; }
      const al = ev.target.closest("[data-seg-abrir-lector]");
      if (al) {
        /* la MISMA cadena que el botón «Calcular mi precio» de la tarjeta, armada desde la foto del guardado */
        const id = al.getAttribute("data-seg-abrir-lector");
        const p = ((ultimoSeguimiento && ultimoSeguimiento.procesos) || []).find((x) => x.id === id) || {};
        const pr = p.proceso || {};
        abrirEditorConProceso(qApu({ nombre_del_procedimiento: pr.nombre, entidad: pr.entidad, nit_entidad: pr.nit_entidad, departamento_entidad: pr.departamento,
          cuantia_cop: pr.presupuesto_cop, id_del_proceso: id, modalidad_de_contratacion: pr.modalidad }));
        return;
      }
      const ics = ev.target.closest("[data-seg-ics]");
      if (ics) {
        const id = ics.getAttribute("data-seg-ics");
        try {
          const r = await fetch(`/api/perfil?op=seguimiento&perfil=${encodeURIComponent($("f-perfil").value)}&ics=${encodeURIComponent(id)}`, { headers: { "x-historico-token": leerToken() } });
          if (!r.ok) throw new Error(`El servidor respondió ${r.status}.`);
          const blob = await r.blob(); const url = URL.createObjectURL(blob);
          const a = document.createElement("a"); a.href = url; a.download = `detekta_${id.replace(/[^A-Za-z0-9._-]/g, "_")}.ics`; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 5000);
        } catch (e) { mensajeSeg(fraseDeFallo(e), "error"); }
        return;
      }
      const det = ev.target.closest("[data-seg-detalle]");
      if (det) {
        const id = det.getAttribute("data-seg-detalle");
        const caja = secSeg.querySelector(`[data-seg-caja="${CSS.escape(id)}"]`);
        if (!caja) return;
        caja.classList.remove("hidden"); caja.innerHTML = `<p class="text-xs text-gray-500">Consultando quiénes se presentaron y sus contratos…</p>`;
        det.disabled = true;
        try { const d = await api(`/api/perfil?op=seguimiento&perfil=${encodeURIComponent($("f-perfil").value)}&detalle=${encodeURIComponent(id)}`); pintarDetalleCompetencia(caja, d); }
        catch (e) { caja.innerHTML = `<p class="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">${esc(fraseDeFallo(e))}</p>`; }
        det.disabled = false;
        return;
      }
      const ver = ev.target.closest("[data-seg-verificar]");
      if (ver) {
        // reutiliza «Verifique a su socio»: mismo flujo, mismo NIT — vive en Mi empresa
        $("socio-id").value = ver.getAttribute("data-seg-verificar");
        $("socio-representante").value = "";
        activarPestana("admin");
        $("seccion-socio").scrollIntoView({ behavior: "smooth", block: "start" });
        verificarSocio();
      }
    });
  }

  /* ══════════════════════ EDITOR DE APU (pestaña 2) ══════════════════════ */
  function msgApu(texto, tipo = "info") {
    const el = $("accion-mensaje");
    const colores = { info: "text-gray-600", ok: "text-emerald-700", error: "text-red-600" };
    el.className = `mt-3 text-sm ${colores[tipo] || colores.info}`;
    // El nodo es role="status" (un éxito no interrumpe la lectura); solo el ERROR sube a assertive.
    el.setAttribute("aria-live", tipo === "error" ? "assertive" : "polite");
    el.textContent = texto;
    // «Reintentar» solo con el error, y repite lo que Precios necesita al entrar
    const rein = $("accion-reintentar");
    if (rein) rein.classList.toggle("hidden", !(texto && tipo === "error"));
  }

  /* ─────────────────────────── estado ──────────────────────────────── */
  let CATALOGO = null;      // respuesta de /api/apu/catalogo
  let PARAMETROS = null;    // respuesta de /api/apu?op=parametros (Fase 1: jornada, prestaciones, EPP)
  let filas = [];           // [{item_id, descripcion, unidad, cantidad, rendimiento_override}]
  let ultimoCalculo = null; // respuesta de /api/apu/calcular
  let idActual = null;      // id del presupuesto cargado/guardado
  // última respuesta de op=ia para idActual (los precios los busca una sesión de Claude Code)
  let iaEstado = null;
  let iaSondeo = null;      // temporizador del sondeo mientras la solicitud está en cola
  let iaSondeos = 0;        // cuántas veces se sondeó (tope: no se sondea para siempre)
  let ultimoOptimizador = null; // bloque `optimizador` de /api/apu/rentabilidad
  let ultimaRentabilidad = null; // respuesta ENTERA de /api/apu?op=rentabilidad (presupuesto + piso_techo): alimenta la justificación
  /* Guarda de reentrada: «Calcular APU» dispara la rentabilidad sola cuando hay
     proceso asociado, y aplicar un descuento vuelve a calcular el APU. Sin esto
     dos pulsaciones seguidas dejarían dos peticiones en vuelo pintando la misma
     caja en el orden en que respondan. */
  let rentabilidadEnVuelo = false;

  /* ─────────────────────── configuración de la UI ───────────────────── */
  function leerConfig() {
    const anticipoCrudo = $("anticipo").value.trim();
    const dedCrudo = $("deducciones").value.trim();
    return {
      modo_aiu: $("modo-aiu").value,
      aiu_pct: Number($("aiu").value),
      utilidad_pct: Number($("utilidad").value),
      imprevistos_pct: Number($("imprevistos").value),
      // vacío = SIN DATO, no cero. La diferencia la respeta el motor.
      anticipo_pct: anticipoCrudo === "" ? null : Number(anticipoCrudo),
      aplicar_ajuste_competitivo: $("ajuste-competitivo").checked,
      factor_baja: Number($("factor-baja").value),
      deducciones_pct: dedCrudo === "" ? null : Number(dedCrudo),
      /* ¿La administración declarada YA lleva dentro la contribución del 5 % y
         las estampillas? Cambia el signo de lo que deja el contrato —son 5
         puntos del valor, más que la ganancia entera—, así que no se adivina ni
         se promedia: lo declara el usuario. Sin marcar (el defecto) se
         descuentan aparte, que es lo que hace el panel «¿Me presento?» desde
         que existe. Viaja en el borrador y de ahí lo lee la tarjeta. */
      contribucion_en_administracion: !!($("contribucion-en-admin") && $("contribucion-en-admin").checked),
      // administración por tiempo (IDU): solo si el usuario la eligió y dio los dos datos
      metodo_administracion: $("metodo-admin") ? $("metodo-admin").value : "porcentaje",
      gastos_fijos_mensuales: $("gastos-fijos") && $("gastos-fijos").value.trim() !== "" ? Number($("gastos-fijos").value) : null,
      horas_proyecto: $("horas-proyecto") && $("horas-proyecto").value.trim() !== "" ? Number($("horas-proyecto").value) : null,
      /* Techo del proceso, para la validación G.5. Sale del MISMO campo que
         alimenta la rentabilidad: dos casillas para «cuánto vale el proceso»
         acabarían con dos cifras distintas. Vacío = sin dato y entonces no se
         compara contra nada, en vez de inventarle un techo al presupuesto. */
      cuantia_cop: $("cuantia").value.trim() === "" ? null : Number($("cuantia").value),
      /* Utilidad MÍNIMA aceptable (Fase 3): con ella se calcula el precio piso
         del panel «¿Me presento?». Vacío = sin declarar → el servidor usa la U
         del AIU y lo dice; NO se rellena aquí con la U para que el panel pueda
         distinguir «declarada» de «supuesta». */
      utilidad_minima_pct: $("utilidad-minima") && $("utilidad-minima").value.trim() !== "" ? Number($("utilidad-minima").value) : null,
    };
  }

  function aplicarConfig(c) {
    if (!c) return;
    if (c.modo_aiu) $("modo-aiu").value = c.modo_aiu;
    if (c.aiu_pct != null) $("aiu").value = c.aiu_pct;
    if (c.utilidad_pct != null) $("utilidad").value = c.utilidad_pct;
    if (c.imprevistos_pct != null) $("imprevistos").value = c.imprevistos_pct;
    if ($("contribucion-en-admin")) $("contribucion-en-admin").checked = !!c.contribucion_en_administracion;
    $("anticipo").value = c.anticipo_pct == null ? "" : c.anticipo_pct;
    $("ajuste-competitivo").checked = !!c.aplicar_ajuste_competitivo;
    if (c.factor_baja != null) $("factor-baja").value = c.factor_baja;
    $("deducciones").value = c.deducciones_pct == null ? "" : c.deducciones_pct;
    sincronizarBaja();
  }

  function sincronizarBaja() {
    const activo = $("ajuste-competitivo").checked;
    $("factor-baja").disabled = !activo;
    $("btn-sugerir-baja").disabled = !activo;
  }
  $("ajuste-competitivo").addEventListener("change", sincronizarBaja);

  /* ────────────────────────── catálogo ─────────────────────────────── */
  async function cargarCatalogo() {
    const r = await api("/api/apu?op=catalogo");
    if (!r) return;
    CATALOGO = r;
    /* Los 526 APU de referencia del INVIAS llegan APARTE (`items_invias`) y
       aquí se JUNTAN a los del catálogo: el buscador, la tabla y los borradores
       resuelven ítems por `CATALOGO.items.find(...)`, y un ítem INVIAS tiene
       que resolverse por el mismo camino. Van DESPUÉS de los del catálogo (el
       orden del buscador los enseña detrás). `items_invias` se conserva para
       poder distinguirlos. */
    if ((Array.isArray(r.items_invias) && r.items_invias.length)
      || (Array.isArray(r.items_epc) && r.items_epc.length)
      || (Array.isArray(r.items_idu) && r.items_idu.length)
      || (Array.isArray(r.items_ffie) && r.items_ffie.length)
      || (Array.isArray(r.items_iccu) && r.items_iccu.length)) {
      CATALOGO.items = (Array.isArray(r.items) ? r.items : [])
        .concat(r.items_invias || [], r.items_epc || [], r.items_idu || [], r.items_ffie || [], r.items_iccu || []);
    }

    $("aviso-precios").textContent = r.aviso
      || "Precios de referencia regionalizada, no cotizaciones: verifique contra cotización real antes de ofertar.";

    const dep = $("departamento");
    const conRegion = new Set(r.departamentos_con_region || []);
    /* El desplegable marca cuáles tienen precio de referencia y cuáles no. Sin
       la marca, elegir Chocó parecería exactamente igual de fiable que elegir
       Antioquia, y no lo es: uno se calcula con su región y el otro con la base. */
    dep.innerHTML = '<option value="">— Sin departamento —</option>'
      + (r.departamentos || []).map((d) => {
        const marca = conRegion.has(d) ? "" : " — sin región cotizada";
        return `<option value="${esc(d)}">${esc(d)}${esc(marca)}</option>`;
      }).join("");

    // la normativa viaja con el catálogo: se pinta en cuanto llega
    pintarNormativa(r.normativa);
    // y los parámetros de costo (jornada, prestaciones, EPP) se piden aparte:
    // son públicos, se editan en Mi empresa y tienen efecto inmediato
    cargarParametros();
  }

  /* ════════════════ Cómo calculamos: los parámetros del costo real ═══════════
     Vista PÚBLICA de la metodología (Fase 1). Todo sale de /api/apu?op=parametros
     —valores, estado de verificación y lo que el motor deriva—, y el EJEMPLO
     (costo por hora de un trabajador con salario mínimo) se rehace AQUÍ con
     `Costos` (public/costos.js), el MISMO módulo que usa el servidor: si las
     dos cuentas discreparan, la pantalla lo enseñaría. Ninguna tasa está escrita
     en este archivo. */
  async function cargarParametros() {
    const caja = $("metodologia");
    let r = null;
    try {
      const resp = await fetch("/api/apu?op=parametros", { cache: "no-store" });
      r = await resp.json();
    } catch { r = null; }
    if (!r || !r.ok) {
      if (caja) caja.innerHTML = '<p class="text-xs text-gray-400">No se pudieron leer los parámetros de costo. Se calcula con los valores de arranque.</p>';
      return;
    }
    PARAMETROS = r;
    pintarMetodologia(r);
  }

  const ETIQUETA_PARAMETRO = {
    smmlv: "Salario mínimo mensual", auxilioTransporte: "Auxilio de transporte", divisorAPU: "Horas pagadas al mes",
    jornadaLegalMes: "Jornada legal al mes (horas)", horasSemanaVigente: "Horas por semana (vigente)",
    horasSemanaCalibracion: "Horas por semana al calibrar el catálogo", diasLaboradosSemana: "Días trabajados por semana",
    prestaciones: "Prestaciones y aportes", exoneracionParafiscales: "Exoneración de aportes (art. 114-1)",
    arl: "Riesgos laborales", tpnl: "Tiempo pagado no trabajado", mvp: "Mayor valor prestacional",
    herramientaMenor: "Herramienta menor (sobre mano de obra)", epp: "Protección personal (sobre mano de obra)",
    ivaSobreUtilidad: "IVA sobre la utilidad",
  };
  const ESTADO_VERIFICACION = {
    verificado: { texto: "Verificado con la norma", clases: "bg-green-50 text-green-800 ring-green-600/20" },
    referencia: { texto: "Referencia sectorial, sin fuente oficial", clases: "bg-amber-50 text-amber-800 ring-amber-600/20" },
    supuesto: { texto: "Supuesto declarado", clases: "bg-gray-100 text-gray-600 ring-gray-500/20" },
  };
  function valorParametroLegible(id, p) {
    const v = p[id];
    if (id === "prestaciones") return Object.entries(v || {}).map(([k, f]) => `${k} ${num(f * 100)} %`).join(" · ");
    if (id === "arl") return `clase ${v.clase} · ${num((v.tarifas || {})[v.clase] * 100)} %`;
    if (typeof v === "boolean") return v ? "Sí" : "No";
    if (["tpnl", "mvp", "herramientaMenor", "epp", "ivaSobreUtilidad"].includes(id)) return `${num(v * 100)} %`;
    if (["smmlv", "auxilioTransporte"].includes(id)) return pesos(v);
    return String(v);
  }
  function pintarMetodologia(r) {
    const caja = $("metodologia");
    if (!caja) return;
    const p = r.parametros || {};
    const ver = r.verificacion || {};
    const motor = r.motor || {};
    const filas = Object.keys(ETIQUETA_PARAMETRO).filter((id) => id in p).map((id) => {
      const e = ESTADO_VERIFICACION[(ver[id] || {}).estado] || ESTADO_VERIFICACION.supuesto;
      return `<tr class="align-top">
        <td class="py-1 pr-2">${esc(ETIQUETA_PARAMETRO[id])}</td>
        <td class="py-1 pr-2 text-right num font-medium whitespace-nowrap">${esc(valorParametroLegible(id, p))}</td>
        <td class="py-1 pr-2"><span class="inline-flex rounded-full px-2 py-0.5 text-xs ring-1 ring-inset ${e.clases}">${e.texto}</span></td>
        <td class="py-1 text-xs text-gray-500">${esc((ver[id] || {}).fuente || "")}</td>
      </tr>`;
    }).join("");

    /* El ejemplo se calcula en el navegador con el módulo compartido; si el
       módulo no cargó, se enseña el del servidor y se dice. */
    let ejemploHtml = "";
    try {
      const C = window.Costos;
      const con = C.explicarCostoHora({ ...p, exoneracionParafiscales: true }, p.smmlv);
      const sin = C.explicarCostoHora({ ...p, exoneracionParafiscales: false }, p.smmlv);
      const hd = C.horasDia(p);
      ejemploHtml = `
        <p class="mt-4 font-medium">Ejemplo: cuánto cuesta una hora de un trabajador con salario mínimo</p>
        <ol class="mt-1 list-decimal space-y-0.5 pl-5 text-xs text-gray-600">${con.pasos.map((x) => `<li>${esc(x)}</li>`).join("")}</ol>
        <p class="mt-2 text-xs text-gray-600">Sin la exoneración del art. 114-1 sube a <b>${pesos(sin.costo_hora)}</b> por hora.
          Con ${num(hd)} horas por día, el día cuesta <b>${pesos(con.costo_dia || con.costo_hora * hd)}</b> (${pesos(sin.costo_hora * hd)} sin exoneración).</p>`;
    } catch (e) {
      const ej = r.ejemplo && r.ejemplo.con_exoneracion;
      ejemploHtml = ej ? `<p class="mt-4 text-xs text-gray-500">Ejemplo (calculado en el servidor): ${pesos(ej.costo_hora)} por hora para un salario mínimo.</p>` : "";
    }

    caja.innerHTML = `
      <p class="text-xs text-gray-500">${r.fuente === "redis" ? "Parámetros guardados por la empresa" : "Valores de arranque (todavía no se ha guardado ninguno)"}${r.guardado_el ? ` · ${esc(String(r.guardado_el).slice(0, 10))}` : ""}. Se editan en Mi empresa → Sistema.</p>
      <div class="mt-3 rounded-xl bg-white p-3 ring-1 ring-gray-900/5">
        <p class="font-medium">Cómo entra la jornada en el costo</p>
        <p class="mt-1 text-xs text-gray-600">La mano de obra del catálogo se cotiza por día con jornales de un contrato adjudicado (Bogotá, 2025, jornada de ${esc(motor.horas_semana_calibracion)} h).
          Desde el ${esc(motor.vigencia || "15-jul-2026")} rige la jornada de ${esc(motor.horas_semana_vigente)} h (Ley 2101 de 2021): el mismo día pagado rinde menos horas, así que los días de mano de obra por unidad
          se multiplican por <b>${num(motor.factor_jornada)}</b> (${num((motor.factor_jornada - 1) * 100)} % más). El jornal no cambia. La protección personal se suma como el ${num((motor.epp_pct || 0) * 100)} % de la mano de obra.</p>
      </div>
      <div class="mt-3 overflow-x-auto">
        <table class="w-full text-left text-xs">
          <thead><tr class="text-gray-500"><th class="py-1 pr-2">Parámetro</th><th class="py-1 pr-2 text-right">Valor</th><th class="py-1 pr-2">Estado</th><th class="py-1">De dónde sale</th></tr></thead>
          <tbody>${filas}</tbody>
        </table>
      </div>
      ${ejemploHtml}
      <p class="mt-3 text-[13px] text-gray-400">Los valores de tiempo pagado no trabajado y su mayor valor prestacional vienen de metodologías públicas del sector (IDU e INVIAS) por fuentes secundarias: son referencia mientras no se contrasten con el manual original.</p>`;
  }

  /* ════════════════ Normativa: qué hay detrás de los factores ════════════════
     El editor multiplicaba por 1,55 el jornal, por el AIU el costo directo y
     por 19 % la utilidad sin decir de dónde sale ninguno de los tres. Un número
     sin su norma no se puede defender ante un interventor.

     NINGUNA TASA SE ESCRIBE AQUÍ: todo sale del bloque `normativa` que sirve el
     servidor (`lib/apu/normativa.js`). Escribirlas en el frontend habría creado
     una segunda fuente de verdad de unas cifras que ya deciden pesos.

     Y lo que se pinta con más cuidado es lo que NO cuadra: la suma nominal de
     las tasas de ley (58,29 %) no es el factor que aplica el catálogo (55 %).
     Se enseñan las tres cifras y la brecha, porque afirmar que el 55 % «es la
     suma de la ley» sería falso y este es el módulo donde una cifra creíble y
     equivocada acaba en el precio de una oferta. */
  function pintarNormativa(n) {
    const caja = $("normativa");
    if (!caja) return;
    if (!n || !n.prestacional) {
      caja.innerHTML = '<p class="text-xs text-gray-400">El catálogo todavía no está cargado: sin él no hay factores que explicar.</p>';
      return;
    }
    const p = n.prestacional;
    const pct = (v) => (Number.isFinite(Number(v)) ? `${num(v)} %` : "—");

    const filas = (p.componentes || []).map((c) => `
      <tr class="align-top">
        <td class="py-1 pr-2">${esc(c.nombre)}${c.base === "cesantias" ? '<span class="block text-xs text-gray-400">12 % de las cesantías, ya convertido a % del salario</span>' : ""}</td>
        <td class="py-1 pr-2 text-right num font-medium">${pct(c.pct)}</td>
        <td class="py-1 pr-2 text-gray-500">${esc((p.grupos || {})[c.grupo] || c.grupo)}</td>
        <td class="py-1 text-gray-500">${esc(c.norma)}<span class="block text-xs text-gray-400">${esc(c.detalle || "")}</span></td>
      </tr>`).join("");

    /* Los tres totales van SIEMPRE los tres: enseñar solo el aplicado escondería
       que no se descompone, y enseñar solo el nominal sugeriría que es lo que
       se cobra. */
    const totales = [
      ["Suma nominal de las tasas de ley", p.suma_nominal_pct],
      ["Con exoneración de parafiscales (si aplica)", p.suma_exonerada_pct],
      ["FACTOR QUE APLICA EL CATÁLOGO", p.aplicado_pct],
    ].map(([k, v], i) => `<tr class="${i === 2 ? "font-semibold" : ""}">
        <td class="py-1 pr-2">${esc(k)}</td><td class="py-1 text-right num">${pct(v)}</td></tr>`).join("");

    caja.innerHTML = `
      <h3 class="text-xs font-semibold uppercase tracking-wide text-gray-500">Factor prestacional sobre el jornal</h3>
      <p class="mt-1 text-xs text-gray-500">
        ${p.aplicado_pct == null
    ? "Sin región resuelta no hay factor aplicado contra el que contrastar el desglose."
    : `El motor multiplica el jornal base por <strong class="num">${num(p.factor_aplicado)}</strong> antes de dividirlo por el rendimiento.`}
      </p>
      <div class="mt-2 overflow-x-auto">
        <table class="w-full text-xs">
          <thead class="text-left text-[11px] uppercase tracking-wide text-gray-400">
            <tr><th class="pb-1 pr-2">Componente</th><th class="pb-1 pr-2 text-right">Tasa</th>
                <th class="pb-1 pr-2">Grupo</th><th class="pb-1">Norma</th></tr>
          </thead>
          <tbody class="divide-y divide-gray-100">${filas}</tbody>
        </table>
      </div>
      <table class="mt-3 w-full max-w-md text-xs">
        <tbody class="divide-y divide-gray-100">${totales}</tbody>
      </table>
      <p class="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-[13px] text-amber-900">${esc(p.como_leerlo || "")}</p>
      <p class="mt-2 text-[11px] text-gray-500"><strong>Exoneración:</strong> ${esc(p.exoneracion.condicion)}
        <span class="block text-gray-400">${esc(p.exoneracion.norma)}</span></p>
      <p class="mt-2 text-[11px] text-gray-500"><strong>Procedencia del factor:</strong> ${esc(p.procedencia || "")}</p>
      <p class="mt-1 text-[11px] text-gray-500">${esc(p.atado_a_calibracion || "")}</p>

      <h3 class="mt-5 text-xs font-semibold uppercase tracking-wide text-gray-500">AIU · bandas típicas</h3>
      <table class="mt-1 w-full text-xs">
        <tbody class="divide-y divide-gray-100">
          ${Object.values(n.aiu || {}).map((a) => `<tr class="align-top">
            <td class="py-1 pr-2">${esc(a.nombre)}<span class="block text-xs text-gray-400">${esc(a.detalle)}</span></td>
            <td class="py-1 pr-2 text-right num whitespace-nowrap">${num(a.banda.min)} – ${num(a.banda.max)} %</td>
            <td class="py-1 text-gray-500">${esc(a.fuente)}</td>
          </tr>`).join("")}
        </tbody>
      </table>
      <p class="mt-1 text-[11px] text-gray-400">${esc(n.fuente_defaults || "")}</p>

      <h3 class="mt-5 text-xs font-semibold uppercase tracking-wide text-gray-500">IVA sobre la utilidad</h3>
      <p class="mt-1 text-xs"><strong class="num">${pct(n.iva_sobre_utilidad_pct)}</strong>
        <span class="text-gray-500">· ${esc(n.iva_norma || "")}</span></p>
      <p class="mt-1 text-[11px] text-gray-500">${esc(n.iva_nota || "")}</p>

      <h3 class="mt-5 text-xs font-semibold uppercase tracking-wide text-gray-500">Deducciones sobre el valor del contrato</h3>
      <table class="mt-1 w-full text-xs">
        <tbody class="divide-y divide-gray-100">
          ${(n.deducciones || []).map((d) => `<tr class="align-top">
            <td class="py-1 pr-2">${esc(d.nombre)}<span class="block text-xs text-gray-400">${esc(d.detalle)}</span></td>
            <td class="py-1 pr-2 text-right num whitespace-nowrap">${d.pct == null ? "según la entidad" : pct(d.pct)}</td>
            <td class="py-1 text-gray-500">${esc(d.norma)}</td>
          </tr>`).join("")}
        </tbody>
      </table>
      <p class="mt-3 rounded-lg bg-gray-100 px-3 py-2 text-[13px] text-gray-600"><strong>Atención:</strong> ${esc(p.advertencia || "")}</p>`;
  }

  /* ────────────────────────── inferencia ───────────────────────────── */
  /* Los ítems detectados llevan el marcador local `inferido`: es lo que permite
     MEZCLAR métodos (detectar unos, añadir otros por búsqueda o Excel) sin que
     una nueva detección arrase lo añadido a mano, y lo que ata cada checkbox a
     su fila de la tabla. El marcador NO viaja al servidor: `calcularApu`
     proyecta campos explícitos. */
  function quitarFilasInferidas() {
    filas = filas.filter((f) => !f.inferido);
  }

  $("btn-inferir").addEventListener("click", async () => {
    const objeto = $("objeto").value.trim();
    if (!objeto) {
      pintarInferencia({ estado: "no_determinada", mensaje: "Describa la obra antes de detectar los ítems." });
      return;
    }
    const btn = $("btn-inferir");
    btn.disabled = true;
    $("inferir-spin").classList.remove("hidden");
    $("inferir-texto").textContent = "Analizando…";
    try {
      const r = await api("/api/apu?op=inferir", {
        method: "POST",
        body: { objeto, codigos_unspsc: $("codigos-unspsc").value.trim() },
      });
      if (!r) return;
      /* Las filas inferidas del intento ANTERIOR se retiran SIEMPRE que llega
         una detección nueva: dejarlas cuando la nueva devuelve 0 ítems
         producía filas huérfanas —sin panel para desmarcarlas— que el mensaje
         «No se detectó ningún ítem» contradecía. En el catch NO se tocan: un
         fallo de red no puede borrar lo que ya estaba en la tabla. */
      const habiaInferidas = filas.some((f) => f.inferido);
      if (habiaInferidas || (r.items && r.items.length)) {
        quitarFilasInferidas();
        for (const i of (r.items || [])) {
          filas.push({
            item_id: i.codigo, descripcion: i.descripcion || i.codigo, unidad: i.unidad,
            cantidad: 0, rendimiento_override: null, inferido: true,
          });
        }
        ultimoCalculo = null;
        pintarTabla();
      }
      pintarInferencia(r);
    } catch (e) {
      pintarInferencia({ estado: "no_determinada", mensaje: mensajeDeFallo(e, "detectar el tipo de trabajo") });
    } finally {
      btn.disabled = false;
      $("inferir-spin").classList.add("hidden");
      $("inferir-texto").textContent = "Detectar ítems";
    }
  });

  function pintarInferencia(r) {
    const caja = $("inferencia");
    const estilos = {
      verde: "bg-emerald-50 text-emerald-900",
      amarillo: "bg-amber-50 text-amber-900",
      no_determinada: "bg-gray-100 text-gray-700",
    };
    caja.className = `mt-4 rounded-xl p-4 text-sm ${estilos[r.estado] || estilos.no_determinada}`;
    caja.classList.remove("hidden");

    let html = `<p class="font-medium">● ${esc(r.mensaje || "")}</p>`;
    if (r.tipologia) {
      html += `<p class="mt-1 text-xs opacity-80">Tipología <strong>${esc(r.tipologia.codigo)}</strong> · `
        + `${esc(r.tipologia.nombre)} · unidad dominante ${esc(r.tipologia.unidad_dominante || "—")} · `
        + `puntaje ${r.puntaje}, margen ${r.margen}</p>`;
      if (r.tipologia.sin_apu && r.tipologia.nota) {
        html += `<p class="mt-2 rounded-lg bg-white/60 p-2 text-xs"><strong>Atención:</strong> ${esc(r.tipologia.nota)}</p>`;
      }
    }
    if (r.items && r.items.length) {
      /* Checkboxes atados a la tabla EN TIEMPO REAL: desmarcar quita la fila,
         volver a marcar la devuelve. Nacen todos marcados porque la detección
         es una propuesta que se revisa quitando, no un formulario que rellenar. */
      html += `<p class="mt-3 text-xs font-medium">Ítems detectados — desmarque los que no apliquen; la tabla del paso 3 se actualiza sola:</p>`
        + `<div class="mt-2 space-y-1">`
        + r.items.map((i) => `<label class="flex cursor-pointer items-start gap-2 text-xs">
            <input type="checkbox" data-inf="${esc(i.codigo)}" checked class="mt-0.5 h-3.5 w-3.5 rounded border-gray-300">
            <span><strong>${esc(i.descripcion || i.codigo)}</strong>
              <span class="opacity-70">· ${esc(i.codigo)} · ${esc(i.unidad || "—")}</span></span>
          </label>`).join("")
        + `</div>`;
    } else if (Array.isArray(r.items)) {
      /* `items` vacío = el SERVIDOR respondió sin ítems (los avisos locales no
         traen el campo). Sin resultado, los otros dos métodos SON la salida —
         y ya están en la misma pantalla: solo hay que señalarlos. */
      html += `<p class="mt-2 text-xs">No se detectó ningún ítem con esta descripción. `
        + `Cargue un Excel con sus ítems o búsquelos por su nombre — los dos métodos están aquí debajo.</p>`;
    }
    if (r.cantidades && r.cantidades.length) {
      html += `<p class="mt-2 text-xs opacity-80">Magnitudes legibles en el objeto: `
        + r.cantidades.map((c) => `<strong>${num(c.valor)} ${esc(c.unidad)}</strong>`).join(" · ")
        + " — verifíquelas contra el formulario de cantidades del pliego.</p>";
    }
    if (r.unspsc && r.unspsc.presente) {
      html += `<p class="mt-1 text-xs opacity-70">Familias de trabajo leídas: ${r.unspsc.familias.map(esc).join(", ")}</p>`;
    }
    caja.innerHTML = html;
  }

  /* Desmarcar un ítem detectado lo quita de la tabla; volver a marcarlo lo
     devuelve. Delegado: el contenido de #inferencia se repinta entero. */
  $("inferencia").addEventListener("change", (e) => {
    const cod = e.target.getAttribute && e.target.getAttribute("data-inf");
    if (!cod) return;
    if (e.target.checked) {
      if (!filas.some((f) => f.inferido && f.item_id === cod)) {
        const def = CATALOGO ? CATALOGO.items.find((x) => x.codigo === cod) : null;
        filas.push({
          item_id: cod, descripcion: def ? def.descripcion : cod, unidad: def ? def.unidad : null,
          cantidad: 0, rendimiento_override: null, inferido: true,
        });
      }
    } else {
      const i = filas.findIndex((f) => f.inferido && f.item_id === cod);
      if (i >= 0) filas.splice(i, 1);
    }
    ultimoCalculo = null;
    pintarTabla();
  });

  /* ─────────────── búsqueda con autocompletar (sin desplegable) ───────────────
     El <select> con los 174 ítems del catálogo era inusable: nadie encuentra
     nada navegando 174 opciones. Un input que filtra en tiempo real (mínimo 2
     caracteres), resultados agrupados por capítulo, y elegir uno lo añade a la
     tabla. `btn-agregar` añade el primer resultado de la búsqueda vigente. */
  const normBusqueda = (x) => String(x || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  let resultadosBusqueda = [];

  function buscarEnCatalogo(q) {
    if (!CATALOGO || !Array.isArray(CATALOGO.items)) return [];
    const terminos = normBusqueda(q).split(/\s+/).filter(Boolean);
    if (!terminos.length) return [];
    return CATALOGO.items.filter((it) => {
      const pajar = normBusqueda(`${it.codigo} ${it.descripcion}`);
      return terminos.every((t) => pajar.includes(t));
    });
  }

  function pintarBusqueda() {
    const lista = $("buscar-lista");
    if (!resultadosBusqueda.length) {
      lista.innerHTML = `<p class="px-3 py-2 text-xs text-gray-400">Sin resultados en el catálogo ni en los APU de referencia del INVIAS o del IDU. Cargue un Excel o cree el ítem calculando con un precio manual.</p>`;
      lista.classList.remove("hidden");
      return;
    }
    let capAnterior = null;
    lista.innerHTML = resultadosBusqueda.map((it, n) => {
      const cap = it.capitulo || "Sin capítulo";
      /* divisor sutil por capítulo: el primero sin borde superior */
      const cabecera = cap !== capAnterior
        ? `<div class="${capAnterior == null ? "" : "mt-1 border-t border-gray-100 "}px-3 pb-0.5 pt-1.5 text-[11px] font-medium uppercase tracking-wide text-gray-400">${esc(cap)}</div>`
        : "";
      capAnterior = cap;
      return `${cabecera}<button type="button" data-cod="${esc(it.codigo)}" data-n="${n}"
          class="block w-full px-3 py-1.5 text-left text-xs transition hover:bg-gray-100">
          <span class="font-medium">${esc(it.es_invias ? String(it.descripcion).split("(")[0].trim() : it.descripcion)}</span>
          <span class="block text-xs text-gray-400">${it.es_invias ? `Ítem de pago INVIAS ${esc(it.item_de_pago)} · referencia oficial` : it.es_idu ? `APU IDU ${esc(it.codigo_idu)} · precio de referencia Bogotá` : esc(it.codigo)} · ${esc(it.unidad || "—")}</span>
        </button>`;
    }).join("");
    lista.classList.remove("hidden");
  }

  function ocultarBusqueda() {
    $("buscar-lista").classList.add("hidden");
  }

  function notaBusqueda(texto, tipo) {
    const el = $("buscar-nota");
    el.className = `mt-2 text-xs ${tipo === "ok" ? "text-emerald-700" : "text-gray-500"}`;
    el.textContent = texto;
    el.classList.remove("hidden");
  }

  function agregarItemCatalogo(codigo) {
    const def = CATALOGO ? CATALOGO.items.find((i) => i.codigo === codigo) : null;
    if (!def) return;
    filas.push({
      item_id: def.codigo, descripcion: def.descripcion, unidad: def.unidad,
      cantidad: 0, rendimiento_override: null,
    });
    ultimoCalculo = null;
    pintarTabla();
    notaBusqueda(`«${def.descripcion}» añadido a la tabla del paso 3. Escríbale la cantidad allí.`, "ok");
    $("buscar-item").value = "";
    resultadosBusqueda = [];
    ocultarBusqueda();
  }

  $("buscar-item").addEventListener("input", () => {
    const q = $("buscar-item").value.trim();
    $("buscar-nota").classList.add("hidden");
    if (q.length < 2) { resultadosBusqueda = []; ocultarBusqueda(); return; }
    resultadosBusqueda = buscarEnCatalogo(q);
    pintarBusqueda();
  });

  $("buscar-item").addEventListener("keydown", (e) => {
    if (e.key === "Escape") { ocultarBusqueda(); return; }
    if (e.key === "Enter") {
      e.preventDefault();
      if (resultadosBusqueda.length) agregarItemCatalogo(resultadosBusqueda[0].codigo);
    }
  });

  /* mousedown y no click a secas: el blur del input cerraría la lista antes de
     que el click llegara al botón de la sugerencia */
  $("buscar-lista").addEventListener("mousedown", (e) => e.preventDefault());
  $("buscar-lista").addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-cod]");
    if (btn) agregarItemCatalogo(btn.getAttribute("data-cod"));
  });
  document.addEventListener("click", (e) => {
    if (!e.target.closest("#buscar-item") && !e.target.closest("#buscar-lista")) ocultarBusqueda();
  });

  $("btn-agregar").addEventListener("click", () => {
    const q = $("buscar-item").value.trim();
    if (q.length < 2) {
      notaBusqueda("Escriba al menos 2 caracteres en el campo de búsqueda: filtra el catálogo mientras escribe.");
      return;
    }
    if (!resultadosBusqueda.length) resultadosBusqueda = buscarEnCatalogo(q);
    if (!resultadosBusqueda.length) {
      notaBusqueda(`Sin resultados para «${q}» en el catálogo.`);
      return;
    }
    agregarItemCatalogo(resultadosBusqueda[0].codigo);
  });

  /* ── La celda «Precio de tienda» de una fila ─────────────────────────────
     Encargo del dueño: que al pegar el Excel se VEA el precio de Homecenter (o
     de donde salió) con su fuente. `ref` es `referencia_tienda` del servidor
     (de la importación o del cálculo): precio + fuente + ámbito + fecha, y el
     producto literal en el `title` para poder auditarlo sin abrir nada. Es una
     REFERENCIA: no entra en el costo, y sin captura la celda dice «—». */
  function celdaTiendaHtml(ref) {
    if (!ref || !Array.isArray(ref.refs) || !ref.refs.length) return '<span class="text-gray-300">—</span>';
    const r = ref.refs[0];
    const precio = r.precio_sin_iva != null && r.precio_con_iva != null
      ? `${pesos(r.precio_con_iva)} <span class="text-xs text-gray-400">con IVA</span>`
      : `${pesos(r.precio)}${r.iva === "sin_iva" ? ' <span class="text-xs text-gray-400">sin IVA</span>' : ""}`;
    const norm = r.normalizado ? `<span class="text-xs text-gray-400"> (&asymp; ${pesos(r.normalizado.precio)}/${esc(r.normalizado.unidad)})</span>` : "";
    const titulo = `${r.producto || ""} · ${r.unidad_fuente || ""}${r.correspondencia === "aproximada" ? ` · producto similar: ${r.correspondencia_nota || "verificar equivalencia"}` : ""}`;
    return `<span class="block num text-sm font-medium text-blue-950" title="${esc(titulo)}">${precio}${norm}</span>
      <span class="block text-xs text-gray-500" title="${esc(titulo)}">${esc(r.fuente)} · ${esc(r.ambito)} · ${esc(r.vigencia_impresa ? `lista ${r.vigencia_impresa}` : r.capturado_el || "")}${
      ref.via === "insumo" ? ` · ${esc(ref.insumo)}` : ""}${r.correspondencia === "aproximada" ? ' · <span class="text-amber-700">similar</span>' : ""}</span>`;
  }

  function pintarTabla() {
    const cuerpo = $("tabla");
    $("tabla-vacia").classList.toggle("hidden", filas.length > 0);
    $("btn-calcular").disabled = filas.length === 0;
    $("btn-exportar").disabled = !ultimoCalculo;

    /* Una sola cadena y un solo innerHTML: con 200-300 ítems importados, armar
       nodos uno a uno congela la pestaña. Los manejadores van DELEGADOS, así
       que repintar entero no pierde ninguno. El desglose por componente vive en
       una fila de DETALLE plegada por ítem: la tabla enseña lo que se decide
       (cantidad, precio, total) y el porqué se abre al pulsar el ítem. */
    cuerpo.innerHTML = filas.map((f, i) => {
      const def = CATALOGO && f.item_id ? CATALOGO.items.find((x) => x.codigo === f.item_id) : null;
      const rendPorDefecto = def && Number.isFinite(def.rendimiento_dia) ? def.rendimiento_dia : null;
      const capitulo = f.capitulo
        ? `<span class="block text-[11px] uppercase tracking-wide text-gray-400">${esc(f.capitulo)}</span>` : "";
      const sugerencia = !f.item_id && f.sugerencia
        ? `<span class="block text-[11px] text-gray-400">Sugerencia del catálogo: ${esc(f.sugerencia)}</span>` : "";
      return `<tr data-fila="${i}" title="Pulse el ítem para abrir su desglose">
        <td class="cursor-pointer py-2 pr-3">
          ${capitulo}
          <span class="font-medium">${esc(f.descripcion || f.item_id || "—")}</span>
          <span class="block text-xs text-gray-400"><span aria-hidden="true">▸</span> ${esc(f.item_id || (f.codigo ? `fila ${f.codigo} del archivo` : "personalizado"))}</span>
          ${sugerencia}
        </td>
        <td class="py-2 pr-3 text-gray-500">${esc(f.unidad || "—")}</td>
        <td class="py-2 pr-3 text-right">
          <input type="number" min="0" step="any" data-campo="cantidad" data-fila="${i}"
                 value="${f.cantidad || ""}" placeholder="0"
                 aria-label="Cantidad de ${esc(f.descripcion || f.item_id || `la fila ${i + 1}`)}"
                 class="edit w-24 rounded border border-gray-200 px-2 py-1 text-right num">
        </td>
        <td class="py-2 pr-3 text-right">
          <input type="number" min="0" step="any" data-campo="precio" data-fila="${i}"
                 value="${f.precio_manual == null ? "" : f.precio_manual}"
                 aria-label="Precio unitario de ${esc(f.descripcion || f.item_id || `la fila ${i + 1}`)}"
                 placeholder="${f.item_id ? (/^INVIAS:/.test(f.item_id) ? "ref. INVIAS" : /^IDU:/.test(f.item_id) ? "ref. IDU" : "del catálogo") : "requerido"}"
                 class="edit w-28 rounded border border-gray-200 px-2 py-1 text-right num">
        </td>
        <td class="py-2 pr-3 text-right num font-medium" data-celda="unitario-${i}">—</td>
        <td class="py-2 pr-3 text-right num font-semibold" data-celda="total-${i}">—</td>
        <td class="py-2 pr-3" data-celda="tienda-${i}">${celdaTiendaHtml(f.referencia_tienda)}</td>
        <td class="py-2 pr-3" data-celda="origen-${i}"></td>
        <td class="py-2 text-right">
          <button type="button" data-quitar="${i}"
                  class="rounded px-2 py-1 text-xs text-gray-400 transition hover:bg-red-50 hover:text-red-600"
                  aria-label="Quitar ítem">✕</button>
        </td>
      </tr>
      <tr data-detalle="${i}" class="hidden bg-gray-50">
        <td colspan="9" class="px-3 py-3">
          <div class="grid gap-3 text-xs sm:grid-cols-5">
            <label class="block">
              <span class="text-[11px] uppercase tracking-wide text-gray-400">Rendim./día</span>
              <input type="number" min="0" step="any" data-campo="rendimiento" data-fila="${i}"
                     value="${f.rendimiento_override == null ? "" : f.rendimiento_override}"
                     placeholder="${rendPorDefecto == null ? "—" : num(rendPorDefecto)}"
                     class="edit mt-1 w-24 rounded border border-gray-200 px-2 py-1 text-right num">
            </label>
            <div><span class="text-[11px] uppercase tracking-wide text-gray-400">Material</span>
              <p class="mt-1 num" data-celda="material-${i}">—</p></div>
            <div><span class="text-[11px] uppercase tracking-wide text-gray-400">Mano de obra</span>
              <p class="mt-1 num" data-celda="mano_obra-${i}">—</p></div>
            <div><span class="text-[11px] uppercase tracking-wide text-gray-400">Equipo</span>
              <p class="mt-1 num" data-celda="equipo-${i}">—</p></div>
            <div><span class="text-[11px] uppercase tracking-wide text-gray-400">Transporte</span>
              <p class="mt-1 num" data-celda="transporte-${i}">—</p></div>
          </div>
          <p class="mt-2 text-[13px] text-gray-400">El rendimiento DIVIDE: bajarlo encarece la mano de obra sin tocar los materiales.</p>
          <!-- El APU insumo por insumo se pinta AL EXPANDIR (ver pintarInsumos):
               con 200-300 items, meter aqui ~10 filas por item son miles de nodos
               que nadie esta mirando. -->
          <div data-celda="insumos-${i}" class="mt-3"></div>
        </td>
      </tr>`;
    }).join("");

    if (ultimoCalculo) pintarCalculoEnTabla(ultimoCalculo);
    actualizarEstadoIa();
  }

  /* Delegación: la tabla se repinta entera y unos manejadores por fila se
     perderían en cada repintado. */
  $("tabla").addEventListener("input", (e) => {
    const campo = e.target.getAttribute("data-campo");
    if (!campo) return;
    const i = Number(e.target.getAttribute("data-fila"));
    if (!filas[i]) return;
    const crudo = e.target.value.trim();
    if (campo === "cantidad") {
      filas[i].cantidad = crudo === "" ? 0 : Number(crudo);
    } else if (campo === "precio") {
      /* vacío O cero = SIN precio manual, jamás «precio cero»: un 0 aquí sería
         un precio inventado (la regla de anticipo_pct = 0). Si la fila tiene
         ítem del catálogo, quitar el precio manual vuelve al precio calculado. */
      const n = Number(crudo);
      filas[i].precio_manual = crudo === "" || !Number.isFinite(n) || n <= 0 ? null : n;
      if (filas[i].precio_manual != null && filas[i].origen_precio !== "archivo") {
        filas[i].origen_precio = "manual";
        filas[i].ia_fuente = null;          // un precio tecleado encima ya no es el que buscó la IA
      }
      if (filas[i].precio_manual == null && (filas[i].origen_precio === "manual" || filas[i].origen_precio === "ia")) {
        filas[i].origen_precio = null;
        filas[i].ia_fuente = null;
      }
    } else {
      // vacío = usar el rendimiento del catálogo, no «rendimiento cero»
      filas[i].rendimiento_override = crudo === "" ? null : Number(crudo);
    }
  });

  /* ══════════ El APU insumo por insumo, dentro del desglose ══════════
     Cuatro columnas —MATERIALES · MANO DE OBRA · EQUIPO · TRANSPORTE— y dentro
     de cada una sus insumos con cantidad, unidad, precio unitario y subtotal.

     Las filas las LEE `APULibro.lineaLegible`, la misma función que escribe la
     hoja «APU» del Excel: así lo que el dueño ve en pantalla y lo que entrega a
     la entidad no pueden decir cosas distintas del mismo ítem. Es también lo
     que hace que cada fila CUADRE (cantidad × precio = subtotal), incluido el
     acarreo, cuya tarifa va por m³-km.

     La herramienta menor NO es un insumo: es un % de la mano de obra y no tiene
     precio propio, así que se pinta aparte y diciendo de qué es porcentaje. */
  const RUBROS_APU = [
    ["material", "Materiales"],
    ["mano_obra", "Mano de obra"],
    ["equipo", "Equipo"],
    ["transporte", "Transporte"],
  ];

  /* ══════════ DE DÓNDE SALIÓ EL PRECIO, Y POR QUÉ NO DE OTRA PARTE ══════════
     El badge de la fila dice la FUENTE; esto dice qué se miró ANTES y por qué no
     respondió. «Derivado regional» a secas se lee como un defecto del programa;
     «todavía no corregiste el precio de este ítem» es una INSTRUCCIÓN — y es
     además la que hace que el usuario corrija precios, que es lo único que
     mejora la aplicación con el uso.

     Una sola definición para las dos ramas de `pintarInsumos`: la del ítem con
     composición y la del que no la tiene. En la segunda es donde más falta
     hace, porque ahí no hay ninguna otra respuesta en pantalla. */
  function cascadaDe(casc) {
    if (!casc || !Array.isArray(casc.pasos)) return "";
    return `
      <div class="mt-4 border-t border-gray-200 pt-3">
        <p class="text-[11px] font-semibold uppercase tracking-wide text-gray-500">De dónde sale este precio</p>
        ${casc.corto_por ? `<p class="mt-1 text-[11px] text-gray-600">${esc(casc.motivo || "")}</p>` : ""}
        <ul class="mt-1.5 space-y-0.5">
          ${casc.pasos.map((p) => `
            <li class="flex gap-2 text-[11px] ${p.respondio ? "font-medium text-gray-900" : "text-gray-400"}">
              <span class="w-3 shrink-0">${p.respondio ? "\u2192" : "\u00b7"}</span>
              <span class="w-36 shrink-0">${esc(p.etiqueta)}</span>
              <span>${p.respondio ? "es el que se us\u00f3" : esc(p.motivo || "")}</span>
            </li>`).join("")}
        </ul>
      </div>`;
  }

  /* ── Techo retail del insumo (encargo del dueño, ago 2026) ────────────────
     Lo que ese insumo cuesta HOY en tienda o en lista de fabricante, con
     fuente, ámbito y fecha — el techo negociable. Es una REFERENCIA: nunca
     entra en el costo (retail = IVA + margen de mostrador) y no se pinta nada
     cuando no hay captura, porque la ausencia no se rellena. */
  function techoRetailHtml(l) {
    const refs = l && l.techo_retail;
    if (!Array.isArray(refs) || !refs.length) return "";
    return refs.map((r) => {
      const precio = r.iva === "sin_iva"
        ? `${pesos(r.precio)} <span class="text-gray-400">sin IVA</span>`
        : (r.precio_sin_iva != null && r.precio_con_iva != null
          ? `${pesos(r.precio_sin_iva)} <span class="text-gray-400">sin IVA</span> / ${pesos(r.precio_con_iva)} <span class="text-gray-400">con IVA</span>`
          : pesos(r.precio));
      const norm = r.normalizado ? ` <span class="text-gray-400">(&asymp; ${pesos(r.normalizado.precio)}/${esc(r.normalizado.unidad)})</span>` : "";
      const cuando = r.vigencia_impresa ? `lista ${esc(r.vigencia_impresa)}` : `capturado ${esc(r.capturado_el || "")}`;
      return `<span class="block text-xs text-blue-900/70">Techo ${esc(r.fuente)} · ${precio}${norm} · ${esc(r.unidad_fuente)} · ${esc(r.ambito)} · ${cuando}${
        r.correspondencia === "aproximada" ? ` · <span class="text-amber-700">producto similar: ${esc(r.correspondencia_nota || "verificar equivalencia")}</span>` : ""}</span>`;
    }).join("");
  }

  /* ── Referencia oficial INVIAS del insumo (capa 3, ago 2026) ──────────────
     El precio del banco de los APU Regionalizados para la(s) provincia(s) del
     departamento elegido, con código, vigencia y alcance. Es la cifra citable
     ante un interventor — y una REFERENCIA con rezago declarado, nunca parte
     del costo. El nombre oficial y el detalle por provincia viajan en el
     `title` para auditar sin abrir nada (el patrón de la columna de tienda). */
  function referenciaInviasHtml(l) {
    const r = l && l.referencia_invias;
    if (!r || !Number.isFinite(r.precio)) return "";
    const norm = r.normalizado ? ` <span class="text-gray-400">(&asymp; ${pesos(r.normalizado.precio)}/${esc(r.normalizado.unidad)})</span>` : "";
    const detalle = [r.codigo_invias + " · " + r.nombre_oficial]
      .concat((r.provincias || []).map((p) => `${p.provincia}: ${pesos(p.precio)}`))
      .join("\n");
    return `<span class="block text-xs text-emerald-900/70" title="${esc(detalle)}">Oficial INVIAS ${esc(r.vigencia)} · ${pesos(r.precio)}${norm} · ${esc(r.unidad_fuente)} · ${esc(r.alcance)}${
      r.correspondencia === "aproximada" ? ` · <span class="text-amber-700">insumo similar: ${esc(r.correspondencia_nota || "verificar equivalencia")}</span>` : ""}</span>`;
  }

  function pintarInsumos(i) {
    const caja = $("tabla").querySelector(`[data-celda="insumos-${i}"]`);
    if (!caja) return;
    const it = ultimoCalculo && ultimoCalculo.items ? ultimoCalculo.items[i] : null;
    const det = it && it.detalle;
    if (!det || !Array.isArray(det.insumos) || !det.insumos.length) {
      /* Se DICE cuál de los tres casos es. Una caja vacía haría pensar que el
         ítem no tiene composición cuando lo que falta es pulsar «Calcular APU».
         Y `incompleto` va ANTES que `sin_apu`: un ítem SIN PRECIO también lleva
         `sin_apu: true`, así que preguntando primero por `sin_apu` se le decía
         «lleva un precio escrito a mano» a un ítem que no tiene precio ninguno. */
      caja.innerHTML = `<p class="text-[11px] text-gray-400">${
        !ultimoCalculo ? "Pulse «Calcular cuánto me cuesta» para ver el desglose de este ítem."
          : it && it.incompleto ? esc(it.mensaje || "Este ítem no tiene precio: escriba uno o asígnele un ítem del catálogo. Sin precio NO suma al total.")
            : it && it.origen_precio === "idu" ? `Precio de referencia oficial del IDU ${esc((it.referencia_idu_apu || {}).vigencia || "")} para Bogotá (APU ${esc((it.referencia_idu_apu || {}).codigo_idu || "")}, publicado ${esc((it.referencia_idu_apu || {}).publicado || "")}): el visor del IDU no publica su composición.${(it.referencia_idu_apu || {}).ajuste_regional === "ninguno" ? " La obra no está en Bogotá y el precio va SIN ajuste regional." : ""} Es una referencia, no una cotización.`
            : it && it.sin_apu ? "Este ítem lleva un precio escrito a mano o traído del archivo: no tiene APU de respaldo en el catálogo."
              : "Este ítem no tiene composición en el catálogo."}</p>`;
      /* La cascada se pinta TAMBIÉN aquí, y es donde más falta hace: estos son
         justo los ítems sin composición —precio propio, del archivo, tecleado o
         ninguno—, o sea aquellos en los que la pregunta «¿por qué este precio y
         no otro?» no tiene ninguna otra respuesta en pantalla. */
      if (it && it.cascada) caja.innerHTML += cascadaDe(it.cascada);
      caja.setAttribute("data-pintado", "1");
      return;
    }

    const cuerpoRubro = (tipo) => {
      /* `lineaLegible` produce SOLO los campos de presentación: el techo
         retail se re-adjunta desde la línea original o se perdería aquí. */
      const lineas = det.insumos.filter((l) => l.tipo === tipo)
        .map((l) => ({ ...APULibro.lineaLegible(l), techo_retail: l.techo_retail || null, referencia_invias: l.referencia_invias || null }));
      const hm = tipo === "equipo" && det.herramienta_menor_pct > 0 ? det.herramienta_menor_unitario : null;
      if (!lineas.length && hm == null) return "";
      const subtotal = lineas.reduce((a, l) => a + (Number(l.valor) || 0), 0) + (hm || 0);
      const filasHtml = lineas.map((l) => `
        <tr class="align-top">
          <td class="py-1 pr-2">${esc(l.nombre)}${l.nota ? `<span class="block text-xs text-gray-400">${esc(l.nota)}</span>` : ""}${techoRetailHtml(l)}${referenciaInviasHtml(l)}</td>
          <td class="py-1 pr-2 text-gray-500">${esc(l.unidad)}</td>
          <td class="py-1 pr-2 text-right num">${l.cantidad == null ? "—" : num(l.cantidad)}</td>
          <td class="py-1 pr-2 text-right num">${pesos(l.precio)}</td>
          <td class="py-1 text-right num font-medium">${pesos(l.valor)}</td>
        </tr>`).join("")
        + (hm == null ? "" : `
        <tr class="align-top">
          <td class="py-1 pr-2">Herramienta menor<span class="block text-xs text-gray-400">${num(det.herramienta_menor_pct * 100)} % de la mano de obra</span></td>
          <td class="py-1 pr-2 text-gray-500">%</td>
          <td class="py-1 pr-2 text-right num">—</td>
          <td class="py-1 pr-2 text-right num">—</td>
          <td class="py-1 text-right num font-medium">${pesos(hm)}</td>
        </tr>`);
      return `
        <div>
          <p class="text-[11px] font-semibold uppercase tracking-wide text-gray-500">${esc(RUBROS_APU.find((x) => x[0] === tipo)[1])}</p>
          <table class="mt-1 w-full text-[11px]">
            <thead class="text-left text-[11px] uppercase tracking-wide text-gray-400">
              <tr><th class="pb-1 pr-2">Insumo</th><th class="pb-1 pr-2">Und.</th>
                  <th class="pb-1 pr-2 text-right">Cant.</th><th class="pb-1 pr-2 text-right">Vr. unit.</th>
                  <th class="pb-1 text-right">Subtotal</th></tr>
            </thead>
            <tbody class="divide-y divide-gray-100">${filasHtml}</tbody>
            <tfoot><tr class="border-t border-gray-200">
              <td colspan="4" class="py-1 pr-2 text-right font-medium text-gray-500">Subtotal</td>
              <td class="py-1 text-right num font-semibold">${pesos(Math.round(subtotal * 100) / 100)}</td>
            </tr></tfoot>
          </table>
        </div>`;
    };

    const rubros = RUBROS_APU.map(([t]) => cuerpoRubro(t)).filter(Boolean).join("");
    /* ══════════ DE DÓNDE SALIÓ EL PRECIO, Y POR QUÉ NO DE OTRA PARTE ══════
       El badge de la fila dice la fuente; esto dice qué se miró ANTES y por qué
       no respondió. «Derivado regional» a secas se lee como un defecto del
       programa; «todavía no corregiste el precio de este ítem» es una
       instrucción — y encima es la que hace que el usuario corrija precios, que
       es lo único que mejora la aplicación con el uso. */
    const cascadaHtml = it && it.cascada ? cascadaDe(it.cascada) : "";

    const ra = it && it.referencia_invias_apu;
    const notaInvias = ra
      ? `<p class="mb-3 rounded-lg bg-sky-50 px-3 py-2 text-[13px] text-sky-900">APU de referencia oficial INVIAS ${esc(ra.vigencia)} · ítem de pago ${esc(ra.item_de_pago)}${ra.articulo ? ` (${esc(ra.articulo)})` : ""}. `
        + `Costo directo de la provincia ${esc(ra.provincia_representativa.provincia)} (${esc(ra.provincia_representativa.departamento)}), la de precio mediano entre las ${ra.provincias_usadas} `
        + `${ra.nivel === "nacional" ? "del país (su departamento no tiene libro INVIAS)" : "de su departamento"}. `
        + `Las cantidades y rendimientos son los oficiales; los precios de las líneas son los de ${esc(ra.provincia_referencia_composicion || "la provincia de referencia")} llevados al nivel de esa provincia. Es una referencia, no una cotización.</p>`
      : "";

    const re = it && it.referencia_epc_apu;
    const notaEpc = re
      ? `<p class="mb-3 rounded-lg bg-sky-50 px-3 py-2 text-[13px] text-sky-900">APU de referencia oficial de Empresas Públicas de Cundinamarca ${esc(re.vigencia || "")} · actividad ${esc(re.numeral || "")}. `
        + `Costo directo con composición de la provincia ${esc(re.provincia || "—")}. `
        + `${re.ajuste_regional === "ninguno" ? "La obra no está en Cundinamarca y el precio va SIN ajuste regional. " : ""}`
        + "Es una referencia, no una cotización.</p>"
      : "";
    caja.innerHTML = `
      ${notaInvias}${notaEpc}
      <div class="grid gap-4 xl:grid-cols-2">${rubros}</div>
      ${cascadaHtml}
      <p class="mt-3 border-t border-gray-200 pt-2 text-right text-xs font-semibold">
        Total costo directo del ítem: <span class="num">${pesos(it.costo_directo_unitario)}</span>
        <span class="font-normal text-gray-400"> por ${esc(it.unidad || "unidad")}</span>
      </p>`;
    caja.setAttribute("data-pintado", "1");
  }

  $("tabla").addEventListener("click", (e) => {
    const quitar = e.target.getAttribute("data-quitar");
    if (quitar !== null) {
      const [quitada] = filas.splice(Number(quitar), 1);
      /* si la fila venía de la detección, su checkbox del paso 1 se desmarca:
         un checkbox marcado sobre una fila que ya no existe mentiría */
      if (quitada && quitada.inferido) {
        const chk = $("inferencia").querySelector(`input[data-inf="${quitada.item_id}"]`);
        if (chk) chk.checked = false;
      }
      ultimoCalculo = null;
      pintarTabla();
      return;
    }
    // clic en la fila, fuera de un control: abre/cierra el desglose del ítem
    if (e.target.closest("input,button,a")) return;
    const filaDom = e.target.closest("tr[data-fila]");
    if (!filaDom) return;
    const i = filaDom.getAttribute("data-fila");
    const det = $("tabla").querySelector(`tr[data-detalle="${i}"]`);
    if (!det) return;
    const abriendo = det.classList.contains("hidden");
    det.classList.toggle("hidden");
    // se pinta al ABRIR y solo una vez; `pintarCalculoEnTabla` borra la marca
    // cuando hay números nuevos, para que un desglose abierto no quede rancio
    if (abriendo) {
      const caja = $("tabla").querySelector(`[data-celda="insumos-${i}"]`);
      if (caja && caja.getAttribute("data-pintado") !== "1") pintarInsumos(Number(i));
    }
  });

  /* Origen del precio, en un badge que no puede mentir: VERDE solo cuando el
     precio sale de un contrato ADJUDICADO servido en su región de origen
     (Bogotá); referencia o derivado por factor regional → ÁMBAR; el precio del
     archivo/manual se declara como tal; sin precio → ROJO y NO suma. */
  /* El badge NO decide nada: la regla vive en `APULibro.clasificarOrigen`, que
     es la MISMA que marca las filas del Excel exportado. Cuando la decisión
     vivía aquí dentro, el Excel no podía consultarla y exportaba idénticos un
     precio de contrato adjudicado y uno derivado por factor regional. Aquí solo
     se traduce el estado a la paleta. */
  const CLASES_ORIGEN = {
    adjudicado: "bg-green-100 text-green-800",
    /* «Tu precio» (corregido a mano y recordado) es la fuente más fuerte de la
       cascada: sin esta clave caía al fallback ámbar y se veía igual que un
       derivado regional — el precio del propio usuario rotulado como dudoso. */
    propio: "bg-blue-100 text-blue-800",
    /* «Cotización de proveedor» comparte el amarillo con «derivado» a
       propósito: los dos significan «no es un contrato adjudicado». Lo que los
       separa es la ETIQUETA, que es lo que el auditor lee — pintarlos de verde
       sugeriría que el precio ya está probado en obra, y una cotización solo
       prueba que alguien la ofreció. */
    cotizado: "bg-amber-100 text-amber-800",
    /* APU de referencia oficial del INVIAS: no es un contrato adjudicado (no
       va en verde) ni un precio sin respaldo (no va en ámbar): es una
       referencia oficial con vigencia declarada, y su chip lo dice. */
    invias: "bg-sky-100 text-sky-800",
    epc: "bg-sky-100 text-sky-800",
    idu: "bg-sky-100 text-sky-800",
    ffie: "bg-sky-100 text-sky-800",
    iccu: "bg-sky-100 text-sky-800",
    derivado: "bg-amber-100 text-amber-800",
    archivo: "bg-amber-100 text-amber-800",
    manual: "bg-gray-100 text-gray-600",
    sin_referencia: "bg-red-100 text-red-700",
  };

  function badgeOrigen(it, r) {
    const o = APULibro.clasificarOrigen(it, r);
    /* `o.emoji` NO se pinta: esos marcadores son para el Excel exportado (otro
       medio, otra decisión — apu_libro.js está fuera de la prohibición). En
       pantalla el estado lo dicen la etiqueta y el color del chip. */
    return `<span title="${esc(o.motivo || "")}" class="whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-medium ${CLASES_ORIGEN[o.estado] || CLASES_ORIGEN.derivado}">`
      + `${esc(o.etiqueta)}</span>`;
  }

  /* ────────────────────────── cálculo ────────────────────────────────
     Extraído del listener para que «Aplicar este descuento al APU» pueda
     recalcular por el MISMO camino. Dos rutas de cálculo se desincronizan a la
     primera corrección que se aplique a una sola. */

  /* LA MISMA FILA PARA LAS DOS ACCIONES (ago 2026). `rentabilidad` mandaba solo
     `{item_id, cantidad, rendimiento_override}`, así que las filas importadas
     de Excel y los ítems personalizados —los que llevan su precio en
     `precio_manual`— valían CERO en el panel Piso/Techo y en el optimizador.
     Medido: un presupuesto mixto pasaba de $201.092.650 en pantalla a
     $32.712.650 en el panel, y el veredicto de «No se presente» a «Preséntese
     entre $43M y $260M». La proyección vive en un solo sitio para que no puedan
     volver a divergir. */
  const itemsParaElMotor = () => filas.map((f) => ({
    item_id: f.item_id,
    codigo: f.codigo || null,
    descripcion: f.descripcion || null,
    unidad: f.unidad || null,
    capitulo: f.capitulo || null,
    cantidad: f.cantidad,
    rendimiento_override: f.rendimiento_override,
    // null = sin precio manual; el motor distingue null de 0 a propósito
    precio_manual: f.precio_manual == null ? null : f.precio_manual,
    origen_precio: f.origen_precio || null,
    // «ia»: el precio lo encontró una sesión de Claude Code y el usuario lo aceptó; su fuente viaja con él
    ia_fuente: f.origen_precio === "ia" && f.ia_fuente ? f.ia_fuente : null,
    subcontratado: f.subcontratado || false,
    aiu_subcontratista_pct: f.aiu_subcontratista_pct == null ? null : f.aiu_subcontratista_pct,
  }));

  async function calcularApu() {
    const btn = $("btn-calcular");
    btn.disabled = true;
    btn.textContent = "Calculando…";
    try {
      const r = await api("/api/apu?op=calcular", {
        method: "POST",
        body: {
          items: itemsParaElMotor(),
          departamento: $("departamento").value,
          config: leerConfig(),
        },
      });
      if (!r) return false;
      ultimoCalculo = r;
      pintarCalculoEnTabla(r);
      pintarResumen(r);
      /* Repintar con la normativa del CÁLCULO: viene para la región que el
         motor usó de verdad, no para la región base del catálogo. */
      if (r.normativa) pintarNormativa(r.normativa);
      msgApu("Presupuesto calculado.", "ok");
      return true;
    } catch (e) {
      msgApu(mensajeDeFallo(e, "calcular el presupuesto"), "error");
      return false;
    } finally {
      btn.disabled = filas.length === 0;
      btn.textContent = window.Glosario.VERBOS.generar_apu;
      $("btn-exportar").disabled = !ultimoCalculo;
    }
  }

  $("btn-calcular").addEventListener("click", async () => {
    const ok = await calcularApu();
    /* EL PRECIO SUGERIDO SALE SOLO cuando el APU pertenece a un proceso. Es lo
       que pide el encargo y es lo que convierte el editor en una decisión: sin
       esto, el dueño calcula el costo y se queda otra vez mirando la baja
       mediana para decidir a ojo. Solo se dispara si el cálculo salió bien —
       recomendar un precio sobre un presupuesto que falló sería creíble y
       equivocado— y con proceso asociado, porque sin cuantía publicada no hay
       techo contra el que medir un descuento. */
    if (ok && $("id-proceso").value.trim()) await calcularRentabilidad({ auto: true });
  });

  function pintarCalculoEnTabla(r) {
    /* Las filas se resuelven UNA vez; las celdas del desglose viven en la fila
       de DETALLE, así que se buscan por su data-celda dentro de la tabla. */
    const filasDom = $("tabla").querySelectorAll("tr[data-fila]");
    const tabla = $("tabla");
    r.items.forEach((it, i) => {
      const fila = filasDom[i];
      if (!fila) return;
      fila.classList.toggle("bg-red-50", !!it.incompleto);
      // ámbar = suma al total con precio manual/del archivo, sin APU detrás
      // el precio de referencia IDU también va sin composición, pero es oficial: no se pinta como manual
      fila.classList.toggle("bg-amber-50", !it.incompleto && !!it.sin_apu && it.origen_precio !== "idu" && it.origen_precio !== "ffie" && it.origen_precio !== "iccu");
      const campos = [
        ["material", it.costo_material_unitario], ["mano_obra", it.costo_mano_obra_unitario],
        ["equipo", it.costo_equipo_unitario], ["transporte", it.costo_transporte_unitario],
        ["unitario", it.costo_directo_unitario], ["total", it.costo_total],
      ];
      for (const [nombre, valor] of campos) {
        const celda = tabla.querySelector(`[data-celda="${nombre}-${i}"]`);
        if (celda) celda.textContent = pesos(valor);   // `null` → «—», jamás «$0»
      }
      const org = tabla.querySelector(`[data-celda="origen-${i}"]`);
      if (org) org.innerHTML = badgeOrigen(it, r);

      /* El precio de tienda que resolvió el servidor se GUARDA en la fila:
         así sobrevive a los repintados de la tabla y a un cambio de pestaña
         sin volver a calcular. */
      if (filas[i]) filas[i].referencia_tienda = it.referencia_tienda || filas[i].referencia_tienda || null;
      const tnd = tabla.querySelector(`[data-celda="tienda-${i}"]`);
      if (tnd) tnd.innerHTML = celdaTiendaHtml(it.referencia_tienda || (filas[i] && filas[i].referencia_tienda));

      /* El desglose de insumos se INVALIDA con cada cálculo: si no, un ítem que
         quedó abierto seguiría enseñando los insumos del cálculo anterior —
         cifras viejas con aspecto de nuevas, que es la clase de error que este
         proyecto ya pagó. Se REPINTA en el acto solo si está abierto; si está
         plegado, se pintará al abrirlo. */
      const caja = tabla.querySelector(`[data-celda="insumos-${i}"]`);
      if (caja) {
        caja.removeAttribute("data-pintado");
        const det = tabla.querySelector(`tr[data-detalle="${i}"]`);
        if (det && !det.classList.contains("hidden")) pintarInsumos(i);
      }
    });
  }

  function pintarResumen(r) {
    $("paso-3-cabecera").classList.remove("hidden");
    $("seccion-resumen").classList.remove("hidden");
    const s = r.resumen;

    $("r-directo").textContent = pesos(s.costo_directo_total);
    /* Con qué jornada se costeó la mano de obra (Fase 1). Sin el bloque —cálculo
       sin parámetros— no se afirma nada: no se pinta «sin ajuste», que sería
       decir que se miró y no hacía falta. */
    const pj = $("r-jornada");
    if (pj) {
      const pc = r.parametros_costo;
      pj.textContent = pc && pc.mensaje ? pc.mensaje : "";
      pj.classList.toggle("hidden", !(pc && pc.mensaje));
    }
    /* Subcontratos: cuánto del costo directo es de terceros, si el AIU propio
       se les aplica y cuánto AIU ajeno va dentro (solo si se declaró el %). */
    const ps = $("r-subcontratado");
    if (ps) {
      const n = Number(s.items_subcontratados) || 0;
      if (n > 0) {
        ps.textContent = `Subcontratado: ${pesos(s.costo_directo_subcontratado)} en ${n} ítem${n === 1 ? "" : "s"}`
          + (r.configuracion.aiu_sobre_subcontratado ? " (con mi AIU encima)" : " (a costo, sin mi AIU)")
          + (s.aiu_subcontratista_incluido != null ? ` · AIU del subcontratista incluido: ${pesos(s.aiu_subcontratista_incluido)}` : "")
          + (s.subcontratados_sin_aiu_declarado ? ` · ${s.subcontratados_sin_aiu_declarado} sin el AIU del sub declarado` : "");
      }
      ps.classList.toggle("hidden", !(n > 0));
    }
    $("r-venta").textContent = pesos(s.precio_venta);
    $("r-aiu").textContent = `AIU ${num(r.configuracion.aiu_total_pct)} % (${r.configuracion.modo_aiu})`
      + (r.configuracion.metodo_administracion === "tiempo" && r.configuracion.administracion
        ? ` · administración por tiempo: ${pesos(r.configuracion.administracion.valor)} = A ${num(r.configuracion.aiu_pct)} %` : "");
    $("r-final").textContent = pesos(s.precio_final);
    $("r-baja").textContent = r.configuracion.aplicar_ajuste_competitivo
      ? `Baja aplicada: ${num(r.configuracion.factor_baja)} %`
      : "Sin ajuste competitivo";
    $("r-margen").textContent = pesos(s.margen_final);
    $("r-margen-pct").textContent = s.margen_pct == null
      ? "—" : `${num(s.margen_pct)} % sobre el costo directo`;

    // el color del margen es información, no decoración: en rojo cuando el
    // precio no cubre el costo directo
    const caja = $("r-margen-caja");
    const enPerdida = Number.isFinite(s.margen_final) && s.margen_final <= 0;
    caja.className = `rounded-2xl p-4 ${enPerdida ? "bg-red-50" : "bg-emerald-50"}`;
    $("r-margen").className = `mt-1 text-2xl font-semibold tabular-nums ${enPerdida ? "text-red-950" : "text-emerald-950"}`;

    const comp = s.por_componente;
    const totalCD = s.costo_directo_total;
    const parte = (v) => (Number.isFinite(v) && Number.isFinite(totalCD) && totalCD > 0
      ? `${num((v / totalCD) * 100)} %` : "—");
    $("r-componentes").innerHTML = [
      ["Materiales", comp.material], ["Mano de obra", comp.mano_obra],
      ["Equipo y herramienta", comp.equipo], ["Transporte", comp.transporte],
    ].map(([k, v]) => `<tr><td class="py-1.5">${k}</td>`
      + `<td class="py-1.5 text-right num">${pesos(v)}</td>`
      + `<td class="py-1.5 text-right num text-gray-400">${parte(v)}</td></tr>`).join("")
      + `<tr class="font-semibold"><td class="py-1.5">Costo directo</td>`
      + `<td class="py-1.5 text-right num">${pesos(totalCD)}</td><td></td></tr>`;

    const c = r.configuracion;
    $("r-aiu-detalle").innerHTML = [
      [`Administración (${num(c.aiu_pct)} %)`, s.administracion],
      [`Imprevistos (${num(c.imprevistos_pct)} %)`, s.imprevistos],
      [`Utilidad (${num(c.utilidad_pct)} %)`, s.utilidad],
      ["Precio de venta", s.precio_venta],
      ["Precio final", s.precio_final],
      ["Financiación requerida (20 %)", s.financiacion_requerida],
      ["IVA sobre la utilidad (informativo)", s.iva_sobre_utilidad],
      ["Contribución 5 % obra pública", s.contribucion_obra_publica],
      ["Margen tras deducciones", s.margen_despues_deducciones],
    ].map(([k, v]) => `<tr><td class="py-1.5">${esc(k)}</td>`
      + `<td class="py-1.5 text-right num">${pesos(v)}</td></tr>`).join("");

    pintarValidaciones(r);

    /* Las alertas que YA salieron como hallazgo estructurado no se repiten
       debajo. El motor las vuelca en `alertas` a propósito —es el canal que el
       exportador lee— pero en pantalla, donde sí existe el bloque de
       validaciones, verlas dos veces haría dudar de si son dos problemas. */
    const yaPintadas = new Set(((r.validaciones && r.validaciones.mensajes) || []));
    $("r-alertas").innerHTML = (r.alertas || []).filter((a) => !yaPintadas.has(a)).map((a) =>
      `<p class="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900">${esc(a)}</p>`).join("");

    const reg = r.ajuste_regional;
    const f = reg.factores;
    $("regional-nota").textContent = reg.estado === "mapeado" && f
      ? `● ${reg.region_nombre} · material ×${num(f.materiales)} · mano de obra ×${num(f.mano_obra)} · equipo ×${num(f.equipo)} · transporte ×${num(f.transporte)}`
      : `● Sin región cotizada: se calculó con la región base «${esc(reg.region_utilizada || "—")}».`;
  }

  /* ══════════════ Las cinco validaciones, en pantalla ══════════════════
     NINGUNA BLOQUEA (lib/apu/validaciones): el botón de exportar no se toca
     aquí. Un presupuesto con advertencias se entrega igual —quien decide es el
     ingeniero— y una herramienta que se niega a exportar acaba usándose por
     fuera, que es el peor final posible para el control.

     Dos severidades y dos tratamientos: «atención» en rojo (cantidad negativa,
     buena parte sin precio, oferta por encima del presupuesto oficial, jornal
     que no paga la nómina) y «aviso» en ámbar. La cabecera dice cuántas hay de
     cada una para que no haya que contarlas, y el bloque desaparece —no dice
     «0 hallazgos»— cuando el presupuesto está limpio: un recuadro vacío
     permanente se deja de mirar a la tercera vez. */
  const CLASES_SEVERIDAD = {
    atencion: "bg-red-50 text-red-900 ring-red-600/20",
    aviso: "bg-amber-50 text-amber-900 ring-amber-600/20",
  };

  function pintarValidaciones(r) {
    const caja = $("r-validaciones");
    if (!caja) return;
    const v = r && r.validaciones;
    const hallazgos = (v && v.hallazgos) || [];
    caja.classList.toggle("hidden", hallazgos.length === 0);
    if (!hallazgos.length) { caja.innerHTML = ""; return; }

    const res = v.resumen || {};
    const cuenta = [
      res.atencion ? `${res.atencion} de atención` : null,
      res.aviso ? `${res.aviso} aviso(s)` : null,
    ].filter(Boolean).join(" · ");

    caja.innerHTML = `
      <h3 class="text-xs font-semibold uppercase tracking-wide text-gray-500">
        Validaciones del presupuesto <span class="font-normal text-gray-400">· ${esc(cuenta)}</span>
      </h3>
      <p class="mt-1 text-[11px] text-gray-400">
        Ninguna impide exportar: el Excel se genera igual y las advertencias viajan en sus notas al pie.
      </p>
      <div class="mt-3 space-y-2">
        ${hallazgos.map((h) => `
          <div class="rounded-xl px-3 py-2 text-xs ring-1 ring-inset ${CLASES_SEVERIDAD[h.severidad] || CLASES_SEVERIDAD.aviso}">
            <p class="font-semibold">${h.severidad === "atencion" ? "▲" : "•"} ${esc(h.titulo)}</p>
            <p class="mt-0.5 opacity-90">${esc(h.mensaje)}</p>
          </div>`).join("")}
      </div>`;
  }

  /* ────────────── sugerencia del factor de baja (histórico) ─────────── */
  $("btn-sugerir-baja").addEventListener("click", async () => {
    const entidad = $("entidad").value.trim();
    if (!entidad) {
      $("baja-nota").textContent = "Escriba la entidad para consultar su histórico de adjudicaciones.";
      return;
    }
    $("baja-nota").textContent = "Consultando el índice de baja…";
    try {
      const r = await api(`/api/procesos?op=baja&entidad=${encodeURIComponent(entidad)}`);
      if (!r) { $("baja-nota").textContent = "Consulta cancelada."; return; }
      const e = (r.entidades && r.entidades[0]) || null;
      /* Se exige BASE antes de interpolar una cifra: mediana presente y
         procesos por encima del mínimo. Es la misma invariante que impuso
         `competenciaDe` tras el defecto de «18,2 oferentes en 0 procesos». */
      const procesos = e ? (e.procesos ?? e.procesos_contados) : null;
      if (!e || e.baja_mediana == null || !Number.isFinite(procesos) || procesos < r.min_procesos) {
        $("baja-nota").textContent = `● Sin base suficiente para «${entidad}»: hacen falta ${r.min_procesos} adjudicaciones con presupuesto y valor adjudicado.`;
        return;
      }
      $("factor-baja").value = e.baja_mediana;
      $("baja-nota").textContent = `Mediana histórica: ${num(e.baja_mediana)} % sobre ${procesos} procesos`
        + (e.nivel ? ` (nivel ${e.nivel})` : "") + ". Es el descuento típico, no una recomendación.";
    } catch (err) {
      $("baja-nota").textContent = mensajeDeFallo(err, "consultar cuánto suelen bajar el precio");
    }
  });

  /* ══════════ Fase 4 (plan v3) · GUARDIÁN DEL FORMULARIO 1 ══════════
     «Revisar antes de subir»: manda la oferta del paso 3 (ítems con precio
     unitario de venta y total, AIU, total), el Formulario 1 leído en el
     lector (window.__pliegoUltimo), el presupuesto oficial y —si se
     escribieron— el tope de AIU y el total tecleado en SECOP II. Pinta un
     SEMÁFORO con frases; los rechazos dicen «motivo de rechazo automático»,
     nunca «causal O». La justificación de precio sale del APU propio
     (mismo botón de siempre). */
  function ofertaParaRevision() {
    const r = ultimoCalculo && ultimoCalculo.resumen ? ultimoCalculo.resumen : null;
    const cd = r ? Number(r.costo_directo_total) : 0;
    const factor = r && cd > 0 && Number(r.precio_final) > 0 ? Number(r.precio_final) / cd : 1;
    const items = filas.map((f, i) => {
      const it = ultimoCalculo && ultimoCalculo.items ? ultimoCalculo.items[i] : null;
      const unitarioCD = it && Number.isFinite(Number(it.costo_directo_unitario)) ? Number(it.costo_directo_unitario) : null;
      const pu = unitarioCD == null ? null : Math.round(unitarioCD * factor);
      const cant = Number(f.cantidad);
      return { numeral: f.numeral || f.item || null, descripcion: f.descripcion, unidad: f.unidad, cantidad: Number.isFinite(cant) ? cant : null,
        precio_unitario: pu, total: pu == null || !Number.isFinite(cant) ? null : Math.round(pu * cant) };
    });
    const cfg = leerConfig();
    /* SE DECLARA LA BASE. El unitario que va arriba es el costo directo ESCALADO
       por precio_final/costo_directo_total, o sea CON AIU; y en la rama
       degenerada (sin costo o sin precio) el factor es 1 y viaja en costo
       directo. Son dos bases distintas y el servidor no puede adivinar cuál es:
       sin declararla comparaba contra los unitarios del pliego —que son costo
       directo— y le daba un «+25 % por encima» a quien costeó exactamente igual
       que la entidad. */
    return { items, aiu: { administracion_pct: cfg.aiu_pct, imprevistos_pct: cfg.imprevistos_pct, utilidad_pct: cfg.utilidad_pct },
      base_precio: factor === 1 ? "costo_directo" : "con_aiu",
      total: r ? Number(r.precio_final) : null };
  }
  async function revisarOferta() {
    const caja = $("revision-oferta");
    caja.classList.remove("hidden");
    if (!filas.length) { caja.innerHTML = `<p class="text-sm text-gray-600">No hay ítems en el paso 3: no hay oferta que revisar.</p>`; return; }
    if (!ultimoCalculo) { caja.innerHTML = `<p class="text-sm text-gray-600">Primero pulse «Calcular cuánto me cuesta»: la revisión necesita el precio de cada ítem y el total.</p>`; return; }
    caja.innerHTML = `<p class="text-sm text-gray-500">Revisando…</p>`;
    const formulario = window.__pliegoUltimo && Array.isArray(window.__pliegoUltimo.items) && window.__pliegoUltimo.items.length ? { items: window.__pliegoUltimo.items, base_precio: window.__pliegoUltimo.base_precio || null, aiu_total_pct: window.__pliegoUltimo.aiu_total_pct != null ? window.__pliegoUltimo.aiu_total_pct : null } : null;
    const tope = $("rev-tope-aiu").value.trim(), secopTotal = $("rev-secop-total").value.trim();
    let r;
    try {
      r = await api("/api/pliego?op=formulario1", { method: "POST", body: {
        oferta: ofertaParaRevision(), formulario, presupuesto_oficial: Number($("cuantia").value) || null,
        tope_aiu_pct: tope === "" ? null : Number(tope), secop: secopTotal === "" ? null : { total: Number(secopTotal) },
        id_proceso: $("id-proceso").value.trim() || null, perfil: $("perfil").value || null,
      } });
    } catch (e) { caja.innerHTML = `<p class="text-sm text-red-700">${esc(fraseDeFallo(e))}</p>`; return; }
    const color = { listo: "text-emerald-700", revisar: "text-red-700", precaucion: "text-amber-700" }[r.semaforo] || "text-gray-700";
    const punto = { listo: "bg-emerald-500", revisar: "bg-red-500", precaucion: "bg-amber-500" }[r.semaforo] || "bg-gray-400";
    const orden = { rechazo: 0, alerta: 1, informativo: 2, sin_referencia: 3, ok: 4 };
    const vs = [...(r.veredictos || [])].sort((a, b) => orden[a.nivel] - orden[b.nivel]);
    caja.innerHTML = `
      <p class="flex items-center gap-2 text-base font-medium ${color}"><span class="inline-block h-3 w-3 rounded-full ${punto}" aria-hidden="true"></span>${esc(r.frase)}</p>
      <ul class="mt-3 space-y-2 text-sm">${vs.map((v) => `<li class="rounded-lg px-3 py-2 ${v.nivel === "rechazo" ? "bg-red-50 text-red-800" : v.nivel === "alerta" ? "bg-amber-50 text-amber-900" : v.nivel === "informativo" ? "bg-blue-50 text-blue-900" : v.nivel === "sin_referencia" ? "bg-gray-50 text-gray-600" : "text-gray-600"}">
        <span class="font-medium">${esc(v.titulo)}${v.nivel === "sin_referencia" ? " · pendiente" : ""}:</span> ${esc(v.mensaje)}
        ${v.nivel !== "ok" ? `<span class="block text-xs opacity-80" title="${esc(v.fundamento)}">Fundamento: ${esc(v.fundamento.slice(0, 140))}${v.fundamento.length > 140 ? "…" : ""}</span>` : ""}
        ${v.id === "temeraria" && v.nivel === "alerta" ? `<button type="button" id="rev-btn-justificacion" class="mt-2 rounded-lg border border-amber-700/30 bg-white px-3 py-1 text-xs font-medium hover:bg-amber-100">Descargar mi justificación</button>` : ""}
      </li>`).join("")}</ul>
      <p class="mt-2 text-xs text-gray-500">${r.rechazos} motivo${r.rechazos === 1 ? "" : "s"} de rechazo automático · ${r.alertas} alerta${r.alertas === 1 ? "" : "s"} · ${r.informativos} para arreglar sin riesgo · ${(r.pendientes || []).length} sin referencia.${r.guardado ? " Revisión guardada para este proceso." : ""}</p>`;
    const bj = $("rev-btn-justificacion");
    if (bj) bj.addEventListener("click", () => { const b = $("btn-justificacion"); if (b && !b.disabled) b.click(); else msgApu("Para generar la justificación calcule primero la rentabilidad del proceso (sección de arriba).", "info"); });
  }
  $("btn-revisar-oferta").addEventListener("click", revisarOferta);

  /* ──────────────────────── guardar / cargar ───────────────────────── */
  /* Guardar el borrador: lo pulsa el usuario, y también lo llama «Pedir precios»
     (la solicitud necesita un borrador guardado donde dejar la respuesta). */
  async function guardarBorrador({ silencioso = false } = {}) {
    if (!filas.length) { msgApu("No hay ítems que guardar.", "error"); return null; }
    const btn = $("btn-guardar");
    btn.disabled = true;
    try {
      const r = await api("/api/apu?op=guardar", {
        method: "POST",
        body: {
          id: idActual || undefined,
          perfil: $("perfil").value,
          nombre: $("nombre-presupuesto").value.trim(),
          objeto: $("objeto").value.trim(),
          departamento: $("departamento").value,
          entidad: $("entidad").value.trim(),
          // el proceso de SECOP al que pertenece: es lo que enciende
          // «APU listo» en su fila del panel
          id_proceso: ($("id-proceso") && $("id-proceso").value.trim()) || null,
          items: filas,
          config: leerConfig(),
          total: ultimoCalculo ? ultimoCalculo.resumen.precio_final : null,
          // el costo directo viaja para que la lista pueda ordenar por
          // «Dónde me queda más» sin recalcular (Fase 8)
          costo_directo: ultimoCalculo ? ultimoCalculo.resumen.costo_directo_total : null,
        },
      });
      if (!r) return null;
      idActual = r.id;
      if (!silencioso) msgApu(`Guardado como «${r.nombre}» (id ${r.id}). ${r.nota}`, "ok");
      contarBorradores();   // el pliegue dice cuántos hay sin abrirlo: acaba de cambiar
      return r;
    } catch (e) {
      msgApu(mensajeDeFallo(e, "guardar el presupuesto"), "error");
      return null;
    } finally {
      btn.disabled = false;
    }
  }
  $("btn-guardar").addEventListener("click", () => guardarBorrador());

  /* ══════════ LOS APU GENERADOS POR UNA SESIÓN DE CLAUDE CODE (4-sep-2026, tercera pasada) ══════════
     Encargo del dueño: «paso 1 adjunta el APU; paso 2 un botón Buscar que le
     dé la orden a Claude con mi prompt de ingeniero de costos; en pantalla
     "buscando… completado x %"; después el análisis». El servidor no tiene
     clave de API: «Buscar» guarda el borrador y deja la SOLICITUD en cola
     (op=ia); una sesión de Claude Code (la skill /precios, a mano o como
     rutina en la nube cada hora) manda su PROGRESO y devuelve los APU por
     ítem, verificados por lib/apu/precios_ia. Aquí: el avance, el costo
     directo por ítem con su desglose, el análisis, y UN botón que aplica esos
     precios y calcula. Nada entra al costo sin ese clic. */
  const TIPO_COMP_LEGIBLE = { material: "Material", mano_obra: "Mano de obra", equipo: "Equipo", transporte: "Transporte", herramienta_menor: "Herramienta menor" };
  function msgIa(texto, tipo = "info") {
    const el = $("ia-estado"); if (!el) return;
    el.className = `text-sm ${tipo === "error" ? "text-red-600" : tipo === "ok" ? "text-emerald-700" : "text-gray-500"}`;
    el.textContent = texto;
  }
  function barraIa(pct) {
    const caja = $("ia-progreso"), barra = $("ia-progreso-barra"); if (!caja) return;
    if (pct == null) { caja.classList.add("hidden"); return; }
    caja.classList.remove("hidden"); barra.style.width = `${Math.max(2, Math.min(100, pct))}%`;
  }
  /* la fila de la tabla a la que corresponde un APU: por índice si la fila no cambió; si no, por descripción y unidad */
  function filaDePropuesta(p) {
    const igual = (x) => x && (x.descripcion || "") === (p.descripcion || "") && (x.unidad || "") === (p.unidad || "");
    if (igual(filas[p.fila])) return p.fila;
    const j = filas.findIndex(igual);
    return j >= 0 ? j : null;
  }
  function actualizarEstadoIa() {
    const btn = $("btn-ia-pedir"), caja = $("ia-propuesta");
    if (!btn || !caja) return;
    const ocupado = !!(iaEstado && iaEstado.id === idActual && (iaEstado.estado === "en_cola" || iaEstado.estado === "buscando"));
    btn.disabled = filas.length === 0 || ocupado;
    if (!filas.length) { msgIa("Añada ítems (suba el pliego o su análisis de precios) para poder buscar."); barraIa(null); caja.classList.add("hidden"); return; }
    if (!iaEstado || iaEstado.id !== idActual) { msgIa(`${filas.length} ${filas.length === 1 ? "ítem" : "ítems"} en la lista. Al pulsar Buscar, el presupuesto se guarda como borrador y la solicitud queda en cola.`); barraIa(null); caja.classList.add("hidden"); return; }
    pintarIa(iaEstado);
  }
  function htmlApuItem(p, cantidad) {
    const comps = (p.componentes || []).map((c) => `<tr><td class="py-1 pr-2 text-gray-500">${esc(TIPO_COMP_LEGIBLE[c.tipo] || c.tipo)}</td><td class="py-1 pr-2">${esc(c.insumo)}${c.observacion ? `<span class="block text-[11px] text-gray-400">${esc(c.observacion)}</span>` : ""}</td><td class="py-1 pr-2 text-gray-500">${esc(c.unidad || "")}</td><td class="py-1 pr-2 text-right num">${c.cantidad_total != null ? nf2.format(c.cantidad_total) : "—"}${c.desperdicio_pct ? `<span class="block text-xs text-gray-400">${nf2.format(c.desperdicio_pct)} % desp.</span>` : ""}</td><td class="py-1 pr-2 text-right num">${pesos(c.precio_unitario)}</td><td class="py-1 pr-2 text-right num font-medium">${pesos(c.valor_total)}</td><td class="py-1 text-[11px] text-gray-500">${c.fuente ? `${urlSegura(c.fuente.url) ? `<a href="${esc(urlSegura(c.fuente.url))}" target="_blank" rel="noopener noreferrer" class="underline">${esc(c.fuente.nombre)}</a>` : esc(c.fuente.nombre)}${c.fuente.fecha ? ` · ${esc(c.fuente.fecha)}` : ""}` : ""}</td></tr>`).join("");
    const r = p.resumen || {};
    const resumen = Object.keys(TIPO_COMP_LEGIBLE).map((k) => { const kk = k === "material" ? "materiales" : k; const v = r[kk]; return v ? `<span class="mr-3">${esc(TIPO_COMP_LEGIBLE[k])}: <span class="num font-medium">${pesos(v)}</span>${p.subtotal_directo ? ` <span class="text-gray-400">(${Math.round(100 * v / p.subtotal_directo)} %)</span>` : ""}</span>` : ""; }).join("");
    return `<div class="mt-2 overflow-x-auto rounded-lg bg-white p-3 ring-1 ring-inset ring-gray-900/5"><table class="w-full text-xs"><thead class="text-left text-[11px] uppercase tracking-wide text-gray-400"><tr><th class="pb-1 pr-2">Tipo</th><th class="pb-1 pr-2">Insumo o actividad</th><th class="pb-1 pr-2">Und.</th><th class="pb-1 pr-2 text-right">Cant. total</th><th class="pb-1 pr-2 text-right">Vr. unitario</th><th class="pb-1 pr-2 text-right">Valor</th><th class="pb-1">Fuente</th></tr></thead><tbody class="divide-y divide-gray-100">${comps}</tbody></table>
      <p class="mt-2 text-xs text-gray-600">${resumen}</p>
      ${p.rendimiento ? `<p class="mt-1 text-[11px] text-gray-500">Rendimiento: ${esc(p.rendimiento)}</p>` : ""}
      ${(p.supuestos || []).length ? `<ul class="mt-1 space-y-0.5 text-[11px] text-amber-900">${p.supuestos.map((s) => `<li>${esc(s)}</li>`).join("")}</ul>` : ""}
      ${p.incluye_iva_materiales != null ? `<p class="mt-1 text-[11px] text-gray-400">Materiales ${p.incluye_iva_materiales ? "con" : "sin"} IVA.</p>` : ""}
      ${cantidad != null && p.costo_directo_unitario != null ? `<p class="mt-1 text-[11px] text-gray-400">Costo directo por ${esc(p.unidad || "unidad")}: ${pesos(p.costo_directo_unitario)} × ${nf2.format(cantidad)} = ${pesos(p.costo_directo_unitario * cantidad)}.</p>` : ""}
    </div>`;
  }
  /* La edad de la solicitud, en palabras. Sin edad MEDIDA no se inventa una:
     `Number(null)` vale 0 y «hace 0 horas» sería una cifra creíble y falsa. */
  function edadEnPalabras(min) {
    const m = min == null ? null : Number(min);
    if (m == null || !Number.isFinite(m)) return null;
    const h = Math.floor(m / 60);
    if (h >= 1) return `${h} hora${h === 1 ? "" : "s"}`;
    const q = Math.max(1, Math.round(m));
    return `${q} minuto${q === 1 ? "" : "s"}`;
  }
  function pintarIa(r) {
    const caja = $("ia-propuesta");
    if (iaSondeo) { clearTimeout(iaSondeo); iaSondeo = null; }
    const s = r.solicitud || {};
    /* NI UN PLAZO QUE NADIE MIDIÓ NI EL VOCABULARIO DEL SISTEMA (5-sep-2026):
       este renglón decía «una sesión de Claude toma la solicitud (suele ser en
       menos de una hora)». «Menos de una hora» era el PERIODO con el que se
       revisa la cola, no un tiempo medido —no hay ni mediana ni percentil de
       lo que tarda—, y quién la atiende es cómo está hecha la aplicación, no
       lo que le pasa a su solicitud. Se dice el HECHO: quedó registrada, la
       cola se revisa cada hora, el resultado llega con su fuente. Cuando haya
       tiempos MEDIDOS, la cifra vuelve.

       Y la solicitud ya no envejece muda: el servidor la marca «sin_atender»
       cuando se salta tres revisiones, y entonces la pantalla lo dice y dice
       qué hacer. */
    if (r.estado === "en_cola" || r.estado === "sin_atender") {
      const guardado = `Puede cerrar esta página: el resultado queda guardado con el borrador${s.nombre ? ` «${s.nombre}»` : ""}.`;
      const edad = edadEnPalabras(r.edad_min);
      if (r.estado === "sin_atender") {
        msgIa(`Sin atender${edad ? ` desde hace ${edad}` : ""}: la cola se revisa cada hora y esta solicitud se saltó varias revisiones. `
          + `Vuelva a pulsar Buscar o avise a quien atiende la cola. ${guardado}`, "error");
      } else {
        msgIa(`Su solicitud quedó registrada${s.solicitado_el ? ` el ${fechaCorta(s.solicitado_el)}` : ""}. `
          + `Los precios llegan aquí con su fuente cuando se atiende la cola, que se revisa cada hora. ${guardado}`);
      }
      barraIa(2); caja.classList.add("hidden");
      if (iaSondeos < 240) iaSondeo = setTimeout(() => { iaSondeos++; consultarIa({ silencioso: true }); }, 60000);
      return;
    }
    if (r.estado === "buscando") {
      const p = s.progreso || {};
      msgIa(`Buscando… completado ${p.pct != null ? p.pct : 0} %${p.total ? ` (${p.hecho} de ${p.total} ítems)` : ""}${p.mensaje ? ` · ${p.mensaje}` : ""}`);
      barraIa(p.pct != null ? p.pct : 2); caja.classList.add("hidden");
      if (iaSondeos < 600) iaSondeo = setTimeout(() => { iaSondeos++; consultarIa({ silencioso: true }); }, 20000);
      return;
    }
    barraIa(null);
    if (r.estado !== "listo" || !r.propuesta) { msgIa("Todavía no se han buscado precios para este borrador."); caja.classList.add("hidden"); return; }
    const pr = r.propuesta, res = pr.resumen || {}, items = pr.items || [];
    /* un resultado guardado con el formato anterior (precio por fila, sin APU) no se pinta a medias: se pide de nuevo */
    if (!Array.isArray(pr.items) && Array.isArray(pr.precios)) { msgIa("El resultado guardado es de una versión anterior de la búsqueda: pulse «Buscar» otra vez para obtener los APU con su desglose."); caja.classList.add("hidden"); return; }
    const aplicables = items.filter((p) => p.costo_directo_unitario != null && filaDePropuesta(p) != null);
    msgIa(`Completado: ${res.con_precio != null ? res.con_precio : "—"} de ${res.filas_respondidas != null ? res.filas_respondidas : "—"} ítems con APU${res.sin_precio ? `, ${res.sin_precio} sin precio` : ""}${res.apartados ? `, ${res.apartados} ${res.apartados === 1 ? "apartado" : "apartados"} por no cuadrar` : ""} (${fechaCorta(pr.guardada_el || pr.generado_el)}).`, "ok");
    const filasHtml = items.map((p) => {
      const i = filaDePropuesta(p); const f = i != null ? filas[i] : null;
      const cant = f && Number.isFinite(Number(f.cantidad)) ? Number(f.cantidad) : null;
      const usado = !!(f && f.origen_precio === "ia" && f.precio_manual === p.costo_directo_unitario);
      const delArchivo = !!(f && f.origen_precio === "archivo" && f.precio_manual > 0);
      const cabeza = `<div class="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1"><span class="min-w-0 font-medium">${esc(p.descripcion || "—")} <span class="text-xs font-normal text-gray-400">${esc(p.unidad || "")}${cant != null ? ` · ${nf2.format(cant)}` : ""}</span></span><span class="min-w-0 text-right">${p.costo_directo_unitario != null ? `<span class="num font-semibold whitespace-nowrap">${pesos(p.costo_directo_unitario)}</span> <span class="text-[11px] text-gray-400">por ${esc(p.unidad || "und")}${p.confianza ? ` · ${esc(p.confianza)}` : ""}</span>` : `<span class="text-xs text-gray-400">${esc(p.motivo_sin_precio || "Sin precio")}</span>`}${usado ? ' <span class="ml-2 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-medium" style="background: var(--ok-light); color: var(--ok-texto);">En uso</span>' : delArchivo ? ` <span class="ml-2 text-[11px] text-gray-400" title="Su archivo traía ${pesos(f.precio_manual)}: se respeta">del archivo</span>` : ""}</span></div>`;
      return p.componentes && p.componentes.length ? `<details class="rounded-lg px-3 py-2"><summary class="cursor-pointer text-sm">${cabeza}</summary>${htmlApuItem(p, cant)}</details>` : `<div class="px-3 py-2 text-sm">${cabeza}</div>`;
    }).join("");
    const og = pr.observaciones_generales || {};
    const analisis = `<div class="mt-4 rounded-xl bg-gray-50 p-4 ring-1 ring-inset ring-gray-900/5 text-sm">
        <h3 class="font-semibold tracking-tight">Análisis</h3>
        ${res.costo_directo_total ? `<p class="mt-1">Costo directo estimado de los ítems con APU: <span class="num font-semibold">${pesos(res.costo_directo_total)}</span> <span class="text-xs text-gray-500">(sin AIU; el AIU y el precio final salen al aplicar y calcular)</span></p>` : ""}
        ${og.base_de_precios ? `<p class="mt-2 text-xs text-gray-600"><span class="font-medium">Base de precios:</span> ${esc(og.base_de_precios)}${og.fecha ? ` (${esc(og.fecha)})` : ""}</p>` : ""}
        ${og.criterios_rendimiento ? `<p class="mt-1 text-xs text-gray-600"><span class="font-medium">Rendimientos:</span> ${esc(og.criterios_rendimiento)}</p>` : ""}
        ${(og.alertas_mercado || []).length ? `<p class="mt-2 text-xs font-medium text-amber-900">Alertas de mercado</p><ul class="mt-0.5 space-y-0.5 text-xs text-amber-900">${og.alertas_mercado.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>` : ""}
        ${(og.fuentes || []).length ? `<p class="mt-2 text-xs font-medium text-gray-500">Fuentes</p><ul class="mt-0.5 space-y-0.5 text-[11px] text-gray-500">${og.fuentes.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>` : ""}
      </div>`;
    caja.innerHTML = `<div class="divide-y divide-gray-100 rounded-xl bg-gray-50 ring-1 ring-inset ring-gray-900/5">${filasHtml}</div>${analisis}
      <div class="mt-4 flex flex-wrap items-center gap-3">${aplicables.length ? `<button type="button" data-ia-aplicar="1" class="bg-gray-900 px-6 py-3 text-base font-semibold transition">Usar estos ${aplicables.length} precios y calcular</button>` : ""}<span class="text-xs text-gray-500">Los precios que ya traía su archivo se respetan. Cada precio aplicado se marca «Buscado por la IA» y, al guardar, queda como precio suyo.</span></div>`;
    caja.classList.remove("hidden");
  }
  async function consultarIa({ silencioso = false } = {}) {
    if (!idActual) { iaEstado = null; actualizarEstadoIa(); return; }
    try {
      const r = await api(`/api/apu?op=ia&id=${encodeURIComponent(idActual)}&perfil=${encodeURIComponent($("perfil").value)}`);
      if (!r) return;
      iaEstado = { ...r, id: idActual };
      actualizarEstadoIa();
    } catch (e) {
      if (!silencioso) msgIa(mensajeDeFallo(e, "consultar la solicitud"), "error");
    }
  }
  function usarPrecioIa(p) {
    const i = filaDePropuesta(p);
    if (i == null || p.costo_directo_unitario == null) return false;
    if (filas[i].origen_precio === "archivo" && filas[i].precio_manual > 0) return false;   // el precio del archivo manda
    filas[i].precio_manual = p.costo_directo_unitario;
    filas[i].origen_precio = "ia";
    filas[i].ia_fuente = { nombre: "APU generado por la IA", url: null, fecha: (iaEstado && iaEstado.propuesta && iaEstado.propuesta.generado_el) || null };
    return true;
  }
  $("btn-ia-pedir").addEventListener("click", async () => {
    const btn = $("btn-ia-pedir");
    if (!filas.length) { msgIa("No hay ítems en la lista: suba el pliego o su análisis de precios primero.", "error"); return; }
    btn.disabled = true;
    try {
      /* lo que el usuario escribió sobre la obra va al borrador: el expediente lo lee de ahí */
      if ($("ia-obra").value.trim()) $("objeto").value = $("ia-obra").value.trim();
      if (!$("nombre-presupuesto").value.trim()) $("nombre-presupuesto").value = ($("ia-obra").value.trim() || "Presupuesto").slice(0, 80);
      const g = await guardarBorrador({ silencioso: true });
      if (!g) { msgIa("No se pudo guardar el borrador, y sin él no hay dónde dejar los APU.", "error"); return; }
      const r = await api("/api/apu?op=ia", { method: "POST", body: { id: idActual, perfil: $("perfil").value, solicitar: true, ciudad: $("ia-ciudad").value.trim() || null, condiciones_sitio: $("ia-condiciones").value.trim() || null } });
      if (!r) return;
      iaSondeos = 0;
      iaEstado = { ...r, id: idActual };
      actualizarEstadoIa();
    } catch (e) {
      msgIa(mensajeDeFallo(e, "pedir los precios"), "error");
    } finally {
      actualizarEstadoIa();
    }
  });
  $("ia-propuesta").addEventListener("click", async (e) => {
    if (e.target.getAttribute("data-ia-aplicar") === null) return;
    const items = (iaEstado && iaEstado.propuesta && iaEstado.propuesta.items) || [];
    let n = 0;
    for (const p of items) if (usarPrecioIa(p)) n++;
    if (!n) { msgIa("Ningún APU corresponde ya a una fila de la lista.", "error"); return; }
    ultimoCalculo = null;
    pintarTabla();
    msgApu(`${n} ${n === 1 ? "precio de la IA puesto" : "precios de la IA puestos"} en la lista. Calculando el presupuesto…`, "ok");
    await calcularApu();
  });

  /* ══════════ UNA SOLA PUERTA PARA EL ARCHIVO (4-sep-2026) ══════════
     El usuario suelta lo que tenga —el PDF del pliego, su análisis de precios o
     el formulario en Excel, un CSV— y se enruta al lector que YA existe; no hay
     un segundo lector. PDF o texto → el lector de pliegos (pliego.js, «Cargar
     pliego»); Excel o CSV → la importación con vista previa. */
  function enrutarArchivoEntrada(archivo) {
    if (!archivo) return;
    const nombre = String(archivo.name || "").toLowerCase();
    const dt = new DataTransfer(); dt.items.add(archivo);
    if (/\.(xlsx|xls|csv)$/.test(nombre)) {
      const inp = $("archivo-importar"); inp.files = dt.files; inp.dispatchEvent(new Event("change", { bubbles: true }));
      return;
    }
    if (/\.(pdf|txt)$/.test(nombre)) {
      const inp = $("pliego-archivo"); inp.files = dt.files; inp.dispatchEvent(new Event("change", { bubbles: true }));
      $("btn-extraer").click();
      return;
    }
    msgApu(`No se reconoce «${archivo.name}»: suba un PDF, un Excel (.xlsx, .xls), un CSV o un archivo de texto (.txt).`, "error");
  }
  {
    const zona = $("entrada-archivo"), inp = $("entrada-archivo-input");
    if (zona && inp) {
      inp.addEventListener("change", () => { const a = inp.files && inp.files[0]; inp.value = ""; enrutarArchivoEntrada(a); });
      for (const ev of ["dragenter", "dragover"]) zona.addEventListener(ev, (e) => { e.preventDefault(); zona.classList.add("sobre"); });
      for (const ev of ["dragleave", "drop"]) zona.addEventListener(ev, (e) => { e.preventDefault(); zona.classList.remove("sobre"); });
      zona.addEventListener("drop", (e) => { const a = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]; enrutarArchivoEntrada(a); });
    }
  }

  $("btn-listar").addEventListener("click", async () => {
    const caja = $("lista-presupuestos");
    try {
      const r = await api(`/api/apu?op=listar&perfil=${encodeURIComponent($("perfil").value)}`);
      if (!r) return;
      caja.classList.remove("hidden");
      pintarResumenBorradores(r.presupuestos.length);
      if (!r.presupuestos.length) {
        caja.innerHTML = `<p class="text-sm text-gray-500">No hay presupuestos guardados para este perfil. Los borradores viven ${r.ttl_dias} días.</p>`;
        return;
      }
      caja.innerHTML = `<table class="w-full text-sm">
        <thead class="text-left text-xs uppercase tracking-wide text-gray-400"><tr>
          <th class="py-1 pr-2">Nombre</th><th class="py-1 pr-2">Departamento</th>
          <th class="py-1 pr-2 text-right">Ítems</th><th class="py-1 pr-2 text-right">Total</th>
          <th class="py-1 pr-2">Guardado</th><th class="py-1"></th>
        </tr></thead><tbody class="divide-y divide-gray-100">${
        r.presupuestos.map((p) => `<tr>
          <td class="py-2 pr-2 font-medium">${esc(p.nombre)}</td>
          <td class="py-2 pr-2 text-gray-500">${esc(p.departamento || "—")}</td>
          <td class="py-2 pr-2 text-right num">${p.items}</td>
          <td class="py-2 pr-2 text-right num">${pesos(p.total_guardado)}</td>
          <td class="py-2 pr-2 text-gray-500">${esc(String(p.guardado).slice(0, 16).replace("T", " "))}</td>
          <td class="py-2 text-right"><button type="button" data-cargar="${esc(p.id)}"
              class="rounded border border-gray-300 px-2 py-1 text-xs font-medium transition hover:bg-gray-50">Cargar</button></td>
        </tr>`).join("")}</tbody></table>`;
    } catch (e) {
      msgApu(mensajeDeFallo(e, "listar sus presupuestos guardados"), "error");
    }
  });

  $("lista-presupuestos").addEventListener("click", async (e) => {
    const id = e.target.getAttribute("data-cargar");
    if (!id) return;
    try {
      const r = await api(`/api/apu?op=cargar&id=${encodeURIComponent(id)}&perfil=${encodeURIComponent($("perfil").value)}`);
      if (!r) return;
      const p = r.presupuesto;
      idActual = p.id;
      $("nombre-presupuesto").value = p.nombre || "";
      $("objeto").value = p.objeto || "";
      $("departamento").value = p.departamento || "";
      $("entidad").value = p.entidad || "";
      aplicarConfig(p.config);
      /* escribir un campo desde el código NO dispara `input` ni `change`: sin
         esta llamada el resumen del pliegue seguiría diciendo lo de antes de
         abrir el borrador */
      pintarResumenAjustes();
      /* los NÚMEROS del borrador se COERCIONAN al cargar: van a parar dentro de
         atributos `value="…"` de la tabla, y un texto guardado a mano en el
         borrador no puede convertirse en marcado. Un valor ilegible cae a
         vacío/null, nunca a un cero inventado. */
      const numONull = (v) => (Number.isFinite(Number(v)) && v !== null && v !== "" ? Number(v) : null);
      filas = (p.items || []).map((f) => {
        const def = CATALOGO && f.item_id ? CATALOGO.items.find((x) => x.codigo === f.item_id) : null;
        const precioManual = numONull(f.precio_manual);
        return {
          item_id: f.item_id || null,
          codigo: f.codigo || null,
          capitulo: f.capitulo || null,
          descripcion: f.descripcion || (def ? def.descripcion : f.item_id),
          unidad: f.unidad || (def ? def.unidad : null),
          cantidad: numONull(f.cantidad) ?? 0,
          rendimiento_override: numONull(f.rendimiento_override),
          // los borradores guardados antes de la importación no traen estos
          // campos: `undefined` y `null` significan lo mismo aquí (sin precio manual)
          precio_manual: precioManual != null && precioManual > 0 ? precioManual : null,
          origen_precio: f.origen_precio === "archivo" || f.origen_precio === "manual" || f.origen_precio === "ia" ? f.origen_precio : null,
          ia_fuente: f.origen_precio === "ia" && f.ia_fuente && typeof f.ia_fuente === "object"
            ? { nombre: String(f.ia_fuente.nombre || "").slice(0, 120), url: String(f.ia_fuente.url || "").slice(0, 600), fecha: String(f.ia_fuente.fecha || "").slice(0, 10) } : null,
          subcontratado: f.subcontratado === true,
          aiu_subcontratista_pct: f.subcontratado === true ? numONull(f.aiu_subcontratista_pct) : null,
          sugerencia: f.sugerencia == null ? null : String(f.sugerencia).slice(0, 200),
        };
      });
      ultimoCalculo = null;
      pintarTabla();
      consultarIa({ silencioso: true });   // si este borrador ya pidió precios, se pintan
      $("seccion-resumen").classList.add("hidden");
      $("lista-presupuestos").classList.add("hidden");
      msgApu(r.catalogo_cambiado
        ? `Cargado «${p.nombre}». Atención: ${r.nota}`
        : `Cargado «${p.nombre}». Pulse «Calcular cuánto me cuesta» para ver los totales.`, r.catalogo_cambiado ? "error" : "ok");
    } catch (err) {
      msgApu(mensajeDeFallo(err, "cargar el presupuesto guardado"), "error");
    }
  });

  /* ─────────────────────── exportación a Excel ────────────────────────
     El formato lo arma `public/apu_libro.js` (formato del Presupuesto Nogal 4:
     capítulos, fórmulas =D×E, bloque A/I/U + IVA sobre la utilidad, firmas y
     hoja APU con el desglose por insumo). Vive fuera de este IIFE para que el
     generador de Node use EXACTAMENTE el mismo constructor: dos copias del
     formato divergen a la primera corrección. */
  $("btn-exportar").addEventListener("click", () => {
    if (!ultimoCalculo) { msgApu("Calcule el presupuesto antes de exportarlo.", "error"); return; }
    /* SE AVISA ANTES DE EXPORTAR, NO DESPUÉS. Un pliego exige el anexo de APU
       DESGLOSADO y la mayor parte de los bancos oficiales (IDU, FFIE, ICCU)
       publica precio total SIN composición: esos ítems se presupuestan bien
       —el precio es bueno— pero no producen hoja de APU. Quien entrega la
       oferta sin el anexo que el pliego exige se entera en la evaluación, así
       que el aviso tiene que llegar mientras todavía se puede hacer algo.
       NO bloquea: una herramienta que se niega a exportar acaba usándose por
       fuera (R6). */
    const comp = APULibro.resumenComposicion(ultimoCalculo.items || []);
    if (comp.solo_precio > 0) {
      msgApu(`Atención: ${comp.solo_precio} de ${comp.total} ítem${comp.total === 1 ? "" : "s"} llevan precio pero NO composición, así que no producen hoja de APU desglosada. Si el pliego exige el anexo, escriba su propio APU para esos ítems. Se exporta igual.`, "info");
    }
    try {
      const hojas = APULibro.construirLibroNogal(ultimoCalculo, {
        titulo: $("nombre-presupuesto").value.trim() || "Presupuesto de obra",
        objeto: $("objeto").value.trim().slice(0, 400) || null,
        entidad: $("entidad").value.trim() || null,
        departamento: $("departamento").value || null,
        fecha: new Date().toISOString().slice(0, 10),
      });
      const bytes = XLSXApu.construirLibro(hojas);
      /* El nombre lo decide `APULibro.nombreArchivo` —`APU_<proyecto>_<fecha>.xlsx`—
         y no esta línea: escrito aquí no se podía probar y el generador de Node
         producía un archivo con otro nombre que el de la aplicación. */
      XLSXApu.descargar(bytes, APULibro.nombreArchivo(
        $("nombre-presupuesto").value.trim(), new Date().toISOString().slice(0, 10)));
      msgApu("Excel generado (formato APU profesional: presupuesto + análisis por ítem).", "ok");
    } catch (e) {
      msgApu(mensajeDeFallo(e, "generar el Excel"), "error");
    }
  });


  /* ════════════════════ Importación desde Excel/CSV ════════════════════
     El archivo se lee EN EL NAVEGADOR (public/xlsx_lectura.js): al servidor
     viajan solo las filas estructuradas, que `/api/apu/importar` mapea contra
     el catálogo calibrado. La vista previa enseña el mapeo ANTES de tocar la
     tabla, y una sugerencia ÁMBAR («revisar») solo cobra precio del catálogo si su
     casilla queda marcada — nunca se usa automáticamente una lista a medias. */
  let importacion = null;

  /* El POST + la asignación que las TRES vías de importación comparten (archivo
     detectado, columnas mapeadas a mano y los ítems del lector de pliegos).
     Eran dos copias y con el cable habrían sido tres: divergen a la primera
     corrección que se aplique a una sola. Devuelve booleano y NO abre el modal —
     la vía del mapeo manual tiene que cerrar el suyo antes, y sólo si el POST
     salió bien. */
  async function mapearParaPrevisualizar(filas, meta) {
    const r = await api("/api/apu?op=importar", {
      method: "POST",
      body: { filas, departamento: $("departamento").value },
    });
    if (!r) return false;                   // canceló el diálogo del token
    importacion = { ...r, avisos_lectura: (meta && meta.avisos) || [], cuadre: (meta && meta.cuadre) || null, nombre_archivo: meta && meta.origen };
    return true;
  }

  /* ══════════════ A1 · EL CABLE: del pliego al presupuesto ══════════════
     El lector extrae ítem, unidad y cantidad, y hasta ahora ahí se acababa: su
     único botón de salida exportaba un .json que NINGÚN módulo del proyecto
     vuelve a leer (el importador acepta .xlsx/.xls/.csv). El usuario transcribía
     a mano — horas con un formulario de 150 filas, y una oportunidad de error
     por fila en el documento con el que se fija el precio de una oferta.

     POR QUÉ VALE, MEDIDO: **0 de 93** códigos del catálogo del lector resuelven
     en el catálogo de precios (todos `LOC-*`). No es que el lector se equivoque
     de precio: es que no puede dar NINGUNO — es un diccionario de
     reconocimiento, no una biblioteca de costeo. Pasando sus filas por
     `op=importar` el universo pasa a 6 588 ítems CON precio.
     Lo que NO se puede afirmar: que el importador «mapee mejor». Sobre 20 filas
     típicas el lector saca más firmes, y hay contraejemplos donde falla el
     importador y acierta el lector. Lo que cambia es que al otro lado hay precio.

     EL UNITARIO OFICIAL NO VIAJA COMO PRECIO, y es LA decisión de este cable.
     Con `precio_archivo`, `entrada_calculo` sale con `precio_manual` y
     `origen_precio: "archivo"`: el presupuesto del contratista sería el
     presupuesto de LA ENTIDAD, y la comparación pliego-vs-Detekta daría 0 % por
     construcción — la app comparándose consigo misma. El precio lo ponen los
     bancos; el del pliego se conserva en `window.__pliegoUltimo`, que es de
     donde ya lo lee el guardián del Formulario 1.

     Se reutiliza la vista previa con casillas (`abrirModalImportar`), que es la
     puerta anti-falso-positivo del módulo: el usuario ve el mapeo ANTES de que
     toque su tabla, así que un ítem mal casado no entra solo. */
  function filasDesdePliego(items) {
    return (Array.isArray(items) ? items : []).map((i) => ({
      codigo: i.numeral || null,
      descripcion: i.descripcion,
      unidad: i.unidad,
      cantidad: i.cantidad,
    }));
  }

  $("pl-btn-usar").addEventListener("click", async () => {
    const leido = window.__pliegoUltimo;
    const items = leido && Array.isArray(leido.items) ? leido.items : [];
    if (!items.length) { msgApu("Primero lea un pliego: no hay ítems que llevar al presupuesto.", "error"); return; }
    const btn = $("pl-btn-usar");
    btn.disabled = true;
    const antes = btn.textContent;
    btn.textContent = "Llevando…";
    try {
      const filas = filasDesdePliego(items);
      // el botón vive DENTRO de la pestaña APU, así que no hay que cambiar de pestaña
      if (await mapearParaPrevisualizar(filas, { avisos: [`${filas.length} ítem(s) leídos del pliego. El precio lo ponen los bancos: el del pliego se compara aparte, no se cobra.`], origen: "el pliego leído" })) abrirModalImportar();
    } catch (err) {
      msgApu(mensajeDeFallo(err, "llevar los ítems del pliego"), "error");
    } finally {
      btn.disabled = false;
      btn.textContent = antes;
    }
  });

  $("btn-importar").addEventListener("click", () => $("archivo-importar").click());

  $("archivo-importar").addEventListener("change", async (e) => {
    const archivo = e.target.files && e.target.files[0];
    e.target.value = "";                    // permite volver a elegir el mismo archivo
    if (!archivo) return;
    const btn = $("btn-importar");
    btn.disabled = true;
    const antes = btn.textContent;
    btn.textContent = "Leyendo…";
    try {
      const crudas = await leerArchivoImportado(archivo);
      if (!crudas.filas.length) {
        /* La detección automática no encontró la tabla. Si al menos hay una
           rejilla legible, el usuario puede mapear las columnas a mano; el
           error seco queda solo para archivos sin nada que mapear. */
        if (crudas.grid && crudas.grid.length) {
          abrirMapeo(crudas.grid, archivo.name, crudas.avisos || []);
        } else {
          msgApu(`No se encontraron ítems en «${archivo.name}». ${(crudas.avisos || []).join(" ")}`, "error");
        }
        return;
      }
      if (await mapearParaPrevisualizar(crudas.filas, { avisos: crudas.avisos, cuadre: crudas.cuadre, origen: archivo.name })) abrirModalImportar();
    } catch (err) {
      msgApu(mensajeDeFallo(err, "importar el archivo"), "error");
    } finally {
      btn.disabled = false;
      btn.textContent = antes;
    }
  });

  /* inflador para los .xlsx de Excel real (partes DEFLATE): el del navegador.
     Si no existe y el archivo lo necesita, xlsx_lectura responde con el error
     accionable («use un navegador reciente o exporte a CSV»). */
  async function inflarNavegador(u8) {
    const ds = new DecompressionStream("deflate-raw");
    const respuesta = new Response(new Blob([u8]).stream().pipeThrough(ds));
    return new Uint8Array(await respuesta.arrayBuffer());
  }

  async function leerArchivoImportado(archivo) {
    const bytes = new Uint8Array(await archivo.arrayBuffer());
    if (/\.csv$/i.test(archivo.name)) {
      /* Excel-Windows guarda «CSV» en ANSI (windows-1252): si el UTF-8 produce
         reemplazos se re-decodifica — la misma regla del CSV de experiencia */
      let texto = new TextDecoder("utf-8").decode(bytes);
      if (texto.includes("�")) texto = new TextDecoder("windows-1252").decode(bytes);
      const grid = XLSXLectura.parsearCsv(texto);
      // la rejilla cruda viaja también: es lo que permite el mapeo manual de
      // columnas cuando la detección automática no encuentra la cabecera
      return { ...XLSXLectura.detectarFilasApu(grid), grid };
    }
    const inflar = typeof DecompressionStream === "function" ? inflarNavegador : null;
    const libro = await XLSXLectura.leerLibro(bytes, { inflar });
    const mejor = XLSXLectura.elegirHoja(libro);
    if (!mejor) return { filas: [], avisos: ["El libro no trae hojas."], grid: null };
    return { ...mejor.resultado, grid: mejor.hoja.filas };
  }

  function abrirModalImportar() {
    const m = importacion.resumen_mapeo;
    const conTienda = importacion.filas.filter((f) => f.referencia_tienda).length;
    /* Cuadre de control (xlsx_lectura): si el archivo declara su total y los
       ítems leídos lo reproducen, se dice — es la señal de que la lectura no
       se dejó ni sobró nada. Si NO cuadra o no se puede comparar, el aviso
       ámbar ya viene en `avisos_lectura`; sin total declarado no se dice nada
       (no hay contra qué comparar y un «cuadra» sin referencia mentiría). */
    const cu = importacion.cuadre;
    const textoCuadre = cu && cu.estado === "cuadra"
      ? ` · la suma de los ítems cuadra con «${cu.etiqueta_total}» del archivo (${pesos(cu.total_declarado)})` : "";
    $("imp-resumen").textContent = `${importacion.nombre_archivo} · ${m.total} ítems · `
      + `${m.firmes} firmes · ${m.revisar} por revisar · ${m.personalizados} personalizados · `
      + `${m.con_precio_archivo} con precio del archivo · ${conTienda} con precio de tienda`
      + (m.mapeados_invias ? ` · ${m.mapeados_invias} con APU de referencia INVIAS` : "")
      + (m.mapeados_idu ? ` · ${m.mapeados_idu} con precio de referencia IDU` : "")
      + (m.mapeados_epc ? ` · ${m.mapeados_epc} con precio de referencia EPC` : "")
      + (m.mapeados_ffie ? ` · ${m.mapeados_ffie} con precio TOPE del FFIE` : "")
      + (m.mapeados_iccu ? ` · ${m.mapeados_iccu} con precio de referencia ICCU` : "") + textoCuadre;
    $("imp-avisos").innerHTML = (importacion.avisos_lectura || [])
      .map((a) => `<p class="rounded-lg bg-amber-50 px-3 py-1.5 text-xs text-amber-900">${esc(a)}</p>`).join("");

    /* De qué banco salió el candidato: el catálogo (contrato Nogal / semilla)
       o los APU de referencia del INVIAS. Se dice en el chip porque el precio
       que va a salir es de naturaleza distinta (contrato adjudicado frente a
       referencia oficial) y porque el INVIAS trae VARIANTES de la misma
       cabecera (gradación, método): se tomó la primera y se enseñan las otras. */
    const origenMapeo = (f) => {
      if (!f.item_id) return "";
      /* LOS CINCO BANCOS SE NOMBRAN, y el del FFIE dice «tope». Los tres
         añadidos después de INVIAS e IDU se rotulaban «catálogo», que aquí
         significa el contrato adjudicado del dueño: en la pantalla donde se
         ACEPTA el mapeo, un tope del FFIE o un precio de Cundinamarca sin
         ajuste no pueden presentarse como un precio propio verificado. */
      const BANCOS = {
        invias: "APU de referencia INVIAS",
        idu: "precio de referencia IDU (Bogotá)",
        epc: "precio de referencia EPC (Cundinamarca)",
        ffie: "precio TOPE del FFIE",
        iccu: "precio de referencia ICCU (Cundinamarca)",
      };
      const banco = BANCOS[f.fuente_mapeo] || "catálogo";
      const desc = f.fuente_mapeo === "invias" ? String(f.descripcion_catalogo || "").split("(")[0].trim() : (f.descripcion_catalogo || "");
      /* A4 · EL PRECIO DE LAS VARIANTES, A LA VISTA. Antes decía «hay 9
         variantes» y nada más: el usuario no podía saber que elegir otra cambia
         el precio 1,46× ($62.798.040 en una fila de 180 m³ para el concreto del
         ICCU, donde el paréntesis no es una gradación sino el ELEMENTO
         ESTRUCTURAL). El rango va en el TEXTO, no solo en el `title`: en móvil
         no hay tooltip, y esto es justo lo que hay que ver antes de aceptar.
         Solo se destaca cuando los precios DIFIEREN de verdad (>5 %): con
         precios iguales, elegir una u otra es indiferente y un aviso constante
         se deja de mirar. Un precio ausente es «—», nunca 0. */
      const vs = f.variantes || [];
      const precios = vs.map((v) => v.precio).concat([f.precio_item]).filter((p) => Number.isFinite(p) && p > 0);
      const vmin = precios.length ? Math.min(...precios) : null;
      const vmax = precios.length ? Math.max(...precios) : null;
      const difieren = vmin != null && vmax / vmin > 1.05;
      const tituloVs = vs.map((v) => `${v.codigo}: ${v.descripcion} — ${Number.isFinite(v.precio) ? pesos(v.precio) : "sin precio"}`).join("\n");
      const variantes = !vs.length ? ""
        : difieren
          ? ` <span class="text-xs text-amber-700" title="${esc(tituloVs)}">(+${vs.length} variante${vs.length === 1 ? "" : "s"} de la misma cabecera, de ${pesos(vmin)} a ${pesos(vmax)} · se tomó ${pesos(f.precio_item)})</span>`
          : ` <span class="text-xs text-gray-400" title="${esc(tituloVs)}">(+${vs.length} variante${vs.length === 1 ? "" : "s"} de la misma cabecera; se tomó la primera)</span>`;
      return `<span class="text-xs text-gray-600">${esc(desc)}</span> <span class="text-xs text-gray-400">· ${banco}</span>${variantes}`;
    };
    const chip = (f) => {
      if (f.nivel_mapeo === "firme") {
        return `<span class="rounded bg-emerald-100 px-1.5 py-0.5 text-[11px] text-emerald-900">● firme</span> ${origenMapeo(f)}`;
      }
      if (f.nivel_mapeo === "revisar") {
        const marcada = f.precio_archivo != null ? "checked" : "";
        return `<label class="flex items-start gap-1.5">
          <input type="checkbox" data-aceptar="${f.orden}" ${marcada} class="mt-0.5 h-3.5 w-3.5 rounded border-gray-300">
          <span class="text-xs"><span class="rounded bg-amber-100 px-1.5 py-0.5 text-[11px] text-amber-900">● revisar · ${Math.round((f.confianza ?? 0) * 100)} %</span>
          ${origenMapeo(f)}</span></label>`;
      }
      return `<span class="rounded bg-gray-100 px-1.5 py-0.5 text-[11px] text-gray-600">● personalizado</span>`
        + (f.precio_archivo == null ? ' <span class="text-[11px] font-medium text-red-600">sin precio: escríbalo en la tabla antes de calcular</span>' : "");
    };

    $("imp-tabla").innerHTML = importacion.filas.map((f) => `
      <tr class="${f.precio_archivo == null && !f.item_id ? "bg-red-50" : ""}">
        <td class="px-2 py-1.5 text-xs text-gray-500">${esc(f.codigo_archivo || "—")}</td>
        <td class="px-2 py-1.5">${f.capitulo ? `<span class="block text-[11px] uppercase text-gray-400">${esc(f.capitulo)}</span>` : ""}${esc(f.descripcion)}</td>
        <td class="px-2 py-1.5 text-gray-500">${esc(f.unidad || "—")}</td>
        <td class="px-2 py-1.5 text-right num">${f.cantidad == null ? "—" : num(f.cantidad)}</td>
        <td class="px-2 py-1.5 text-right num">${f.precio_archivo == null ? "—" : pesos(f.precio_archivo)}</td>
        <td class="px-2 py-1.5">${celdaTiendaHtml(f.referencia_tienda)}</td>
        <td class="px-2 py-1.5">${chip(f)}</td>
      </tr>`).join("");

    $("imp-nota").textContent = "El precio del archivo MANDA y queda declarado. Una sugerencia en ámbar sin precio solo usa el catálogo si su casilla queda marcada.";
    $("modal-importar").classList.remove("hidden");
    $("modal-importar").classList.add("flex");
  }

  /* ══════════ Mapeo manual de columnas (respaldo del método 2) ══════════
     Cuando `detectarFilasApu` no reconoce la cabecera, el archivo no se
     descarta: el usuario señala qué columna es qué sobre una vista previa y la
     importación sigue por el MISMO camino (/api/apu/importar). Un segundo
     parser «tolerante» aquí sería una segunda definición de la tabla. */
  let mapeoPendiente = null;

  function abrirMapeo(grid, nombre, avisos) {
    mapeoPendiente = { grid, nombre };
    const nCols = Math.min(12, grid.slice(0, 40).reduce((a, f) => Math.max(a, (f || []).length), 1));
    const letra = (j) => String.fromCharCode(65 + j); // A, B, C…
    const opciones = (defecto) => `<option value="">${defecto}</option>`
      + Array.from({ length: nCols }, (_, j) => `<option value="${j}">Columna ${letra(j)}</option>`).join("");
    $("mapeo-col-desc").innerHTML = opciones("— elija —");
    for (const id of ["mapeo-col-unidad", "mapeo-col-cant", "mapeo-col-precio", "mapeo-col-codigo"]) {
      $(id).innerHTML = opciones("— no viene —");
    }
    $("mapeo-tabla").innerHTML = `<tr class="bg-gray-50 text-[11px] uppercase tracking-wide text-gray-400">`
      + Array.from({ length: nCols }, (_, j) => `<th class="px-2 py-1 text-left font-medium">${letra(j)}</th>`).join("")
      + `</tr>`
      + grid.slice(0, 8).map((f) => `<tr>`
        + Array.from({ length: nCols }, (_, j) => `<td class="max-w-[180px] truncate px-2 py-1">${esc(String((f || [])[j] ?? ""))}</td>`).join("")
        + `</tr>`).join("");
    $("mapeo-aviso").classList.add("hidden");
    if (avisos.length) {
      $("mapeo-aviso").textContent = avisos.join(" ");
      $("mapeo-aviso").classList.remove("hidden");
    }
    $("mapeo-panel").classList.remove("hidden");
    $("mapeo-panel").scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  function cerrarMapeo() {
    mapeoPendiente = null;
    $("mapeo-panel").classList.add("hidden");
  }
  $("btn-mapeo-cancelar").addEventListener("click", cerrarMapeo);

  $("btn-mapeo-aplicar").addEventListener("click", async () => {
    if (!mapeoPendiente) return;
    const col = (id) => ($(id).value === "" ? -1 : Number($(id).value));
    const cDesc = col("mapeo-col-desc");
    const aviso = (t) => { $("mapeo-aviso").textContent = t; $("mapeo-aviso").classList.remove("hidden"); };
    if (cDesc < 0) { aviso("Señale al menos la columna de la descripción."); return; }
    const cUnidad = col("mapeo-col-unidad"), cCant = col("mapeo-col-cant");
    const cPrecio = col("mapeo-col-precio"), cCodigo = col("mapeo-col-codigo");
    // celda → número con la regla COLOMBIANA (punto = miles) para los textos;
    // un valor ya numérico del xlsx pasa tal cual. Ilegible = null, JAMÁS 0.
    const numero = (v) => (typeof v === "number" ? (Number.isFinite(v) ? v : null) : XLSXLectura.numeroLocal(v));
    const desde = $("mapeo-cabecera").checked ? 1 : 0;
    const filasMapeadas = [];
    for (const f of mapeoPendiente.grid.slice(desde)) {
      const desc = String((f || [])[cDesc] ?? "").trim();
      if (!desc) continue;
      const precio = cPrecio >= 0 ? numero(f[cPrecio]) : null;
      filasMapeadas.push({
        codigo: cCodigo >= 0 ? String(f[cCodigo] ?? "").trim() || null : null,
        capitulo: null,
        descripcion: desc,
        unidad: cUnidad >= 0 ? String(f[cUnidad] ?? "").trim() || null : null,
        cantidad: cCant >= 0 ? numero(f[cCant]) : null,
        // un precio en 0 no es un precio: es «sin dato» (regla de anticipo_pct)
        precio_archivo: precio != null && precio > 0 ? precio : null,
      });
    }
    if (!filasMapeadas.length) { aviso("Con ese mapeo ninguna fila trae descripción: revise la columna elegida."); return; }
    const btn = $("btn-mapeo-aplicar");
    btn.disabled = true;
    try {
      if (await mapearParaPrevisualizar(filasMapeadas, { avisos: [`Columnas mapeadas a mano sobre «${mapeoPendiente.nombre}».`], origen: mapeoPendiente.nombre })) { cerrarMapeo(); abrirModalImportar(); }
    } catch (err) {
      aviso(mensajeDeFallo(err, "importar con ese mapeo"));
    } finally {
      btn.disabled = false;
    }
  });

  function cerrarModalImportar() {
    $("modal-importar").classList.add("hidden");
    $("modal-importar").classList.remove("flex");
  }
  $("btn-imp-cancelar").addEventListener("click", cerrarModalImportar);
  $("modal-importar").addEventListener("click", (e) => {
    if (e.target === $("modal-importar")) cerrarModalImportar();
  });

  $("btn-imp-aplicar").addEventListener("click", async () => {
    if (!importacion) return;
    const aceptadas = new Set([...$("imp-tabla").querySelectorAll("input[data-aceptar]:checked")]
      .map((x) => Number(x.getAttribute("data-aceptar"))));
    const nuevas = importacion.filas.map((f) => {
      const base = f.entrada_calculo || {};
      // en «revisar» la casilla decide si el ítem del catálogo entra (como
      // precio cuando no hay precio del archivo; como referencia cuando sí)
      const itemId = f.nivel_mapeo === "revisar"
        ? (aceptadas.has(f.orden) ? f.item_id : null)
        : base.item_id || null;
      return {
        item_id: itemId,
        codigo: base.codigo || null,
        capitulo: base.capitulo || null,
        descripcion: base.descripcion || f.descripcion,
        unidad: base.unidad || f.unidad,
        cantidad: base.cantidad ?? 0,
        rendimiento_override: null,
        precio_manual: base.precio_manual ?? null,
        origen_precio: base.origen_precio || null,
        subcontratado: base.subcontratado === true,
        aiu_subcontratista_pct: base.subcontratado === true && base.aiu_subcontratista_pct != null ? base.aiu_subcontratista_pct : null,
        sugerencia: f.descripcion_catalogo || null,
        // el precio de tienda resuelto en la importación viaja a la tabla:
        // la columna se ve NADA MÁS pegar el Excel, sin esperar al cálculo
        referencia_tienda: f.referencia_tienda || null,
      };
    });
    filas = filas.concat(nuevas);
    ultimoCalculo = null;
    cerrarModalImportar();
    pintarTabla();
    msgApu(`${nuevas.length} ítem(s) añadidos desde «${importacion.nombre_archivo}». Calculando…`, "ok");
    await calcularApu();
  });

  /* ─────────────────────────── arranque ─────────────────────────────── */

  /* ════════════════════ Precarga desde el panel y rentabilidad ═══════════════
     El botón «APU» de una fila de /admin.html abre esta página con el proceso
     en la querystring. Sin esa precarga habría que copiar a mano el objeto, el
     departamento, la entidad y la cuantía de cada proceso, que es justo el
     trabajo que el botón existe para ahorrar. */
  let paramsProceso = null;   // los fija abrirEditorConProceso (botón APU de una tarjeta)

  /* ═══ ABRIR OTRO PROCESO REINICIA EL EDITOR ═══════════════════════════════
     Sin esto, pulsar «APU» en una segunda tarjeta ARRASTRABA las filas, el
     resumen, la rentabilidad y el precio sugerido del proceso anterior — y
     como `poner()` solo escribe cuando el parámetro viene, la entidad o la
     cuantía viejas sobrevivían si el proceso nuevo no las traía. Cifras
     viejas con aspecto de nuevas: el modo de fallo más caro de este módulo.

     La llave es `id_proceso`: si viene y NO es el que está cargado, se limpia
     lo derivado (filas, cálculo, optimizador) Y los campos que la precarga
     gobierna — lo que el proceso nuevo no traiga debe quedar VACÍO, no
     heredado. Si el id COINCIDE no se toca nada: la re-precarga tras cargar
     el catálogo (mismo id) y reabrir la misma tarjeta no pueden costar el
     trabajo hecho. El departamento y el perfil se conservan a propósito: son
     contexto del usuario («¿dónde?», «¿quién?»), no del proceso, y la
     precarga los sobreescribe cuando el proceso nuevo sí los trae. Los
     borradores guardados viven en Redis y no se tocan. */
  function reiniciarEditorParaProceso() {
    filas = [];
    ultimoCalculo = null;
    ultimoOptimizador = null;
    nitProceso = "";
    modalidadProceso = "";
    for (const id of ["objeto", "codigos-unspsc", "entidad", "id-proceso", "cuantia", "plazo-meses"]) {
      if ($(id)) $(id).value = "";
    }
    for (const id of ["paso-3-cabecera", "seccion-resumen", "seccion-rentabilidad", "seccion-precio-sugerido", "seccion-piso-techo", "r-validaciones"]) {
      if ($(id)) $(id).classList.add("hidden");
    }
    ultimaRentabilidad = null;
    const inf = $("inferencia");
    if (inf) { inf.classList.add("hidden"); inf.innerHTML = ""; }
    pintarTabla();
    msgApu("Se abrió otro proceso: el editor quedó limpio. Los borradores guardados no se tocan.", "info");
  }

  /* ══ EL PERFIL DEL BORRADOR ES EL DE LA BARRA (6-sep-2026) ══
     El selector «Perfil del borrador» traía tres nombres escritos en el HTML
     (Helder / Génesis / Consorcio): quien entraba con su RUP costeaba y guardaba
     como «helder», y sus precios corregidos caían en el perfil del dueño (medido
     en el servidor: apu:precios:helder con el precio del visitante). Ahora se
     alimenta del selector de la barra (#f-perfil, ya podado para el visitante),
     lo sigue cuando cambia, y un rótulo dice arriba para quién se guarda. Sin
     perfil en la barra el selector queda vacío: `.value` es "" y el servidor
     responde 400 diciendo qué falta — nunca un perfil ajeno por omisión. */
  function sincronizarPerfilBorrador() {
    const sel = $("perfil"), barra = $("f-perfil");
    if (!sel || !barra) return;
    sel.innerHTML = "";
    for (const o of [...barra.options]) {
      if (!o.value) continue;
      const op = document.createElement("option");
      op.value = o.value; op.textContent = o.textContent;
      sel.appendChild(op);
    }
    const quiere = barra.value;
    if ([...sel.options].some((o) => o.value === quiere)) sel.value = quiere;
    pintarRotuloPerfil();
  }
  /* TODA escritura del perfil de la barra por código pasa por aquí (6-sep-2026,
     V-B2a-01): asigna `#f-perfil` y arrastra al borrador, que es lo que el
     evento `change` hace cuando la cambia la persona. Cuatro caminos la
     cambiaban por código sin avisar (el RUP del arranque, el consorcio por URL,
     «Guardar consorcio» y borrar uno): medido en Chromium, tras «Guardar
     consorcio» la barra decía el consorcio y el borrador se guardaba como
     «helder». La suite censa que no quede ninguna otra asignación. */
  function fijarPerfilBarra(id) {
    const barra = $("f-perfil");
    if (!barra) return;
    barra.value = id;
    sincronizarPerfilBorrador();
  }
  /* El perfil que llega en la URL de la tarjeta (el de la barra al abrirla) se
     asigna aunque la opción no exista todavía: antes se copiaba «solo si la
     opción existe» y por eso el visitante quedaba en «helder». */
  function asegurarOpcionPerfil(id) {
    const sel = $("perfil");
    if (!sel || !id || [...sel.options].some((o) => o.value === id)) return;
    const enBarra = $("f-perfil") ? [...$("f-perfil").options].find((o) => o.value === id) : null;
    const op = document.createElement("option");
    op.value = id; op.textContent = enBarra ? enBarra.textContent : id;
    sel.appendChild(op);
  }
  function pintarRotuloPerfil() {
    const rotulo = $("perfil-borrador-rotulo"), sel = $("perfil");
    if (!rotulo) return;
    const o = sel && sel.selectedIndex >= 0 ? sel.options[sel.selectedIndex] : null;
    rotulo.textContent = o
      ? `Precios guardados para: ${String(o.textContent || o.value).trim()}`
      : "Precios guardados para: ningún perfil. Elija uno en la barra de Licitaciones o entre con su RUP.";
  }
  /* ── fin del perfil del borrador ── */

  function precargarDesdeURL() {
    let p = paramsProceso;
    if (!p) { try { p = new URLSearchParams(location.search); } catch { return false; } }
    const idEntrante = (p.get("id_proceso") || "").trim();
    const idCargado = $("id-proceso") ? $("id-proceso").value.trim() : "";
    if (idEntrante && idEntrante !== idCargado) reiniciarEditorParaProceso();
    const poner = (id, clave) => {
      const v = p.get(clave);
      if (v != null && v !== "" && $(id)) $(id).value = v;
    };
    poner("objeto", "objeto");
    poner("codigos-unspsc", "unspsc");
    poner("entidad", "entidad");
    poner("id-proceso", "id_proceso");
    poner("cuantia", "cuantia");
    modalidadProceso = p.get("modalidad") || "";
    tipoProceso = p.get("tipo") || "";
    poner("plazo-meses", "plazo");
    const perfil = p.get("perfil");
    if (perfil && $("perfil")) { asegurarOpcionPerfil(perfil); $("perfil").value = perfil; pintarRotuloPerfil(); }
    // el NIT viaja aparte: el índice de baja se consulta por NOMBRE, y el NIT
    // solo sirve de puente cuando la entidad no viene (ver /api/apu/rentabilidad)
    nitProceso = p.get("entidad_nit") || "";
    const dpto = p.get("departamento");
    if (dpto && $("departamento")) {
      const opciones = [...$("departamento").options];
      const hit = opciones.find((o) => norml(o.value) === norml(dpto) || norml(o.textContent) === norml(dpto));
      if (hit) $("departamento").value = hit.value;
    }
    const hayProceso = !!(p.get("id_proceso") || p.get("objeto"));
    if (hayProceso) $("seccion-proceso").classList.remove("hidden");
    return hayProceso;
  }
  const norml = (x) => String(x || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().trim();
  let nitProceso = "";
  let modalidadProceso = "";
  let tipoProceso = "";

  /* `Number.isFinite` y no `== null`: un NaN colado desde el servidor se
     pintaría como «NaN %», que es peor que un «—» porque parece una cifra. */
  const copRent = (n) => (Number.isFinite(n) ? `$${nf.format(Math.round(n))}` : "—");
  const pctRent = (n) => (Number.isFinite(n) ? `${nf2.format(n)} %` : "—");

  function tarjetaRent(titulo, valor, nota, tono) {
    const color = tono === "mal" ? "text-red-600" : tono === "bien" ? "text-green-700" : "text-gray-900";
    return `<div class="rounded-xl bg-gray-50 p-4">
      <p class="text-xs font-medium uppercase tracking-wide text-gray-500">${esc(titulo)}</p>
      <p class="mt-1 text-lg font-semibold num ${color}">${valor}</p>
      ${nota ? `<p class="mt-1 text-xs text-gray-500">${esc(nota)}</p>` : ""}
    </div>`;
  }

  async function calcularRentabilidad({ auto = false } = {}) {
    if (!filas.length) {
      if (!auto) msgApu("Agregue ítems antes de calcular la rentabilidad.", "error");
      return;
    }
    if (rentabilidadEnVuelo) return;
    rentabilidadEnVuelo = true;
    const btn = $("btn-rentabilidad");
    btn.disabled = true;
    const antes = btn.textContent;
    btn.textContent = "Calculando…";
    try {
      const cuerpo = {
        // LA MISMA proyección que «Calcular APU» (ver `itemsParaElMotor`): con
        // filas recortadas, el panel decidía sobre otro costo directo
        items: itemsParaElMotor(),
        departamento: $("departamento").value,
        config: leerConfig(),
        entidad: $("entidad").value.trim(),
        entidad_nit: nitProceso,
        // sin esto la rentabilidad usaría la baja MEZCLADA de la entidad y
        // discreparía de la tarjeta del panel para el mismo proceso
        modalidad: modalidadProceso,
        /* El TIPO DE TRABAJO viaja por el mismo motivo que la modalidad: la
           contribución del 5 % es de los contratos de obra pública, no de una
           interventoría, y sin este dato el piso del editor la cobraría donde
           la tarjeta no — dos cifras del mismo proceso. */
        tipo_trabajo: tipoProceso,
        unspsc: $("codigos-unspsc").value.trim(),
        cuantia: Number($("cuantia").value) || null,
        plazo_meses: Number($("plazo-meses").value) || 12,
        // etiqueta: viaja y vuelve, pero no condiciona el optimizador
        id_proceso: $("id-proceso").value.trim() || null,
        perfil: $("perfil").value,
      };
      const c = await api("/api/apu?op=rentabilidad", { method: "POST", body: cuerpo });
      if (!c) return; // el usuario canceló el diálogo del token
      ultimaRentabilidad = c;
      pintarPisoTecho(c);
      pintarRentabilidad(c);
      // el piso y el techo viajan en `piso_techo`, no en el optimizador: la curva los marca
      pintarPrecioSugerido(c.optimizador, c.piso_techo);
      msgApu(auto ? "Rentabilidad y precio sugerido actualizados." : "Rentabilidad actualizada.", "ok");
    } catch (e) {
      msgApu(mensajeDeFallo(e, "calcular la ganancia"), "error");
      /* También en automático hay que dejar rastro visible: si no, tras pulsar
         «Calcular APU» el recuadro simplemente no aparecería y el dueño no
         tendría forma de distinguir «falló» de «este proceso no da para
         sugerir un precio». */
      pintarPrecioSugerido({ aplicable: false, mensaje: mensajeDeFallo(e, "calcular el precio sugerido") });
    } finally {
      rentabilidadEnVuelo = false;
      btn.disabled = false;
      btn.textContent = antes;
    }
  }

  /* ════════════════════ Panel Piso / Techo (Fase 3) ════════════════════
     La respuesta de una frase a «¿me presento o no, y a cuánto?». Se pinta
     ANTES que la rentabilidad y el precio sugerido porque es la decisión; los
     otros dos son el detalle. Regla de la interfaz: punto de color + frase
     completa, nunca un porcentaje suelto; cada cifra con su origen debajo;
     «Sin referencia» cuando no hay 5 procesos — jamás un techo inventado ni
     un «0 oferentes». */
  const TONO_VEREDICTO = {
    presentarse: { punto: "bg-green-500", caja: "bg-green-50 ring-green-600/20 text-green-950" },
    no_presentarse: { punto: "bg-red-500", caja: "bg-red-50 ring-red-600/20 text-red-950" },
    no_presentarse_supera_presupuesto: { punto: "bg-red-500", caja: "bg-red-50 ring-red-600/20 text-red-950" },
    sin_referencia: { punto: "bg-gray-400", caja: "bg-gray-100 ring-gray-900/10 text-gray-900" },
  };
  /* NINGUNA PANTALLA VACÍA SIN EL PASO SIGUIENTE (5-sep-2026). Los dos recuadros
     de Precios que no se pueden armar decían QUÉ falta y ahí terminaban: el
     usuario tenía que deducir a dónde ir. Sin ítems cargados el paso que falta
     es el 1 (cargar el pliego); con ítems, el 2 (buscar los precios). */
  function botonPasoQueFalta() {
    const [paso, texto] = filas.length === 0 ? ["pliego", "Cargue el pliego"] : ["buscar", "Buscar los precios"];
    return `<button type="button" data-ir-paso="${paso}" class="mt-3 rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-medium transition hover:bg-gray-50">${texto}</button>`;
  }
  document.addEventListener("click", (ev) => {
    const b = ev.target.closest && ev.target.closest("[data-ir-paso]");
    if (!b) return;
    const aBuscar = b.getAttribute("data-ir-paso") === "buscar";
    const destino = aBuscar ? $("btn-ia-pedir") : $("seccion-pliego-wrap");
    if (destino && destino.scrollIntoView) destino.scrollIntoView({ behavior: "smooth", block: "center" });
    if (aBuscar && destino && destino.focus) destino.focus({ preventScroll: true });
  });
  function pintarPisoTecho(c) {
    const pt = c && c.piso_techo;
    const sec = $("seccion-piso-techo");
    if (!sec) return;
    sec.classList.remove("hidden");
    const sin = $("pt-sin-datos");
    const cuerpo = $("pt-cuerpo");
    if (!pt || !pt.aplicable) {
      cuerpo.classList.add("hidden");
      sin.classList.remove("hidden");
      // el veredicto del servidor se conserva LITERAL; debajo, el paso que falta
      sin.innerHTML = `<p>${esc(pt && pt.veredicto ? pt.veredicto : "No se pudo armar el panel: falta el presupuesto oficial del proceso o el costo.")}</p>${botonPasoQueFalta()}`;
      $("pt-origen").textContent = "";
      return;
    }
    sin.classList.add("hidden");
    cuerpo.classList.remove("hidden");
    const cf = pt.cifras;
    $("pt-origen").textContent = cf.modalidad ? cf.modalidad : "";
    $("pt-presupuesto").textContent = copRent(cf.presupuesto_oficial);
    $("pt-costo").textContent = copRent(cf.costo_total);
    $("pt-costo-nota").textContent = `Su APU · con A, I y utilidad mínima del ${pctRent(cf.utilidad_minima_pct)}`;
    if (cf.baja_esperada_pct != null) {
      /* Con mediana 0 no se dice «0 %» (se lee como «no hay dato»): se dice el
         HECHO, que aquí se adjudica por el presupuesto oficial. */
      $("pt-baja").textContent = cf.baja_esperada_pct === 0 ? "No baja el precio" : pctRent(cf.baja_esperada_pct);
      $("pt-baja-nota").textContent = `${cf.baja_procesos} procesos adjudicados${cf.baja_esperada_pct === 0 ? ": se adjudica por el presupuesto oficial" : ""}${cf.baja_modalidad ? " · " + cf.baja_modalidad : ""}`;
    } else {
      $("pt-baja").textContent = "Sin referencia";
      $("pt-baja-nota").textContent = cf.baja_procesos_vistos_sin_base > 0
        ? `Solo ${cf.baja_procesos_vistos_sin_base} comparables; hacen falta ${pt.minimo_procesos}`
        : "No hay procesos anteriores comparables";
    }
    // el conteo de oferentes NUNCA se pinta como 0: `null` es «sin referencia»
    if (cf.oferentes_promedio != null) {
      $("pt-oferentes").textContent = `${nf2.format(cf.oferentes_promedio)} por proceso`;
      $("pt-oferentes-nota").textContent = `Promedio de ${cf.oferentes_procesos} procesos de esta entidad`;
    } else {
      $("pt-oferentes").textContent = "Sin referencia";
      $("pt-oferentes-nota").textContent = "Menos de 5 procesos con oferentes contados";
    }
    $("pt-piso").textContent = copRent(cf.piso_rentable);
    $("pt-piso-nota").textContent = cf.piso_es_cota_inferior
      ? "Cota inferior: cargue las deducciones de acta en Ajustes"
      : "Incluye contribución del 5 % y deducciones de acta";
    if (cf.techo_competitivo != null) {
      $("pt-techo").textContent = copRent(cf.techo_competitivo);
      $("pt-techo-nota").textContent = cf.baja_esperada_pct === 0
        ? "El presupuesto oficial: aquí se gana sin bajar el precio"
        : `Presupuesto oficial menos lo que suele bajar aquí (${pctRent(cf.baja_esperada_pct)})`;
    } else {
      $("pt-techo").textContent = "Sin referencia";
      $("pt-techo-nota").textContent = "No hay historial suficiente para estimarlo";
    }
    const tono = TONO_VEREDICTO[pt.estado] || TONO_VEREDICTO.sin_referencia;
    const caja = $("pt-veredicto");
    caja.className = `mt-5 rounded-2xl p-5 ring-1 ring-inset ${tono.caja}`;
    $("pt-punto").className = `mt-1 inline-block h-3 w-3 shrink-0 rounded-full ${tono.punto}`;
    $("pt-frase").textContent = pt.veredicto || "";
    $("pt-detalle").textContent = pt.detalle || "";
    $("pt-detalle").classList.toggle("hidden", !pt.detalle);
    $("pt-precio-actual").textContent = pt.frase_precio_actual || "";
    $("pt-precio-actual").classList.toggle("hidden", !pt.frase_precio_actual);
    const fuentes = [];
    for (const [k, v] of Object.entries(pt.fuentes || {})) {
      fuentes.push(`<li><span class="font-medium">${esc(k.replace(/_/g, " "))}:</span> ${esc(v)}</li>`);
    }
    for (const sup of pt.supuestos || []) fuentes.push(`<li>Supuesto: ${esc(sup)}</li>`);
    $("pt-fuentes").innerHTML = fuentes.join("");
    $("btn-justificacion").disabled = false;
  }

  /* «Descargar mi justificación de precio»: el documento que sustenta la
     oferta cuando la entidad pide explicar un precio bajo, generado desde el
     MISMO presupuesto y el MISMO panel que se están viendo (la respuesta
     entera de rentabilidad), nunca desde texto genérico. El generador vive en
     public/justificacion.js (UMD) para que la suite lo ejecute. */
  function descargarJustificacion() {
    if (!ultimaRentabilidad || !window.Justificacion) {
      msgApu("Calcule primero el APU con el proceso asociado para poder generar la justificación.", "error");
      return;
    }
    const sel = $("perfil");
    const oferente = sel && sel.selectedIndex >= 0 ? sel.options[sel.selectedIndex].textContent.trim() : "";
    const doc = window.Justificacion.generar({
      calculo: ultimaRentabilidad.presupuesto,
      piso_techo: ultimaRentabilidad.piso_techo,
      contexto: {
        entidad: $("entidad").value.trim(),
        id_proceso: $("id-proceso").value.trim(),
        objeto: $("objeto").value.trim(),
        departamento: $("departamento").value,
        modalidad: modalidadProceso,
        oferente,
        presupuesto_oficial: Number($("cuantia").value) || null,
        fecha: new Date().toISOString().slice(0, 10),
      },
    });
    const blob = new Blob([doc.html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = doc.nombre;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
    msgApu(`Justificación descargada (${doc.nombre}). Ábrala en el navegador e imprímala a PDF para adjuntarla.`, "ok");
  }

  function pintarRentabilidad(c) {
    const r = c.rentabilidad;
    if (!r) return;
    $("seccion-rentabilidad").classList.remove("hidden");
    const t = [];
    t.push(tarjetaRent("Precio total calculado", copRent(r.precio_total),
      c.presupuesto && c.presupuesto.resumen ? `Costo directo ${copRent(r.costo_directo)}` : null));
    t.push(tarjetaRent("Costo directo total", copRent(r.costo_directo), "Sin AIU: va declarado aparte"));
    t.push(tarjetaRent("Margen bruto", pctRent(r.margen_bruto_pct), "(Precio − Costo directo) / Precio"));
    t.push(tarjetaRent("Margen neto esperado", pctRent(r.margen_neto_pct),
      r.margen_es_cota_superior ? "COTA SUPERIOR: faltan las deducciones del pliego" : "Antes de renta",
      r.margen_neto_pct != null && r.margen_neto_pct < 3 ? "mal" : "bien"));
    t.push(tarjetaRent("Probabilidad de ganar",
      r.p_ganar != null ? pctRent(r.p_ganar * 100) : "—",
      r.p_ganar_detalle && r.p_ganar_detalle.modulada
        ? `Base ${pctRent((r.p_ganar_detalle.p_base || 0) * 100)} × ${r.p_ganar_detalle.multiplicador} por precio`
        : "Sin baja histórica: no se modula por precio"));
    t.push(tarjetaRent(window.Glosario.traducir("veg"), copRent(r.veg),
      `P(ganar) × utilidad − ${copRent(r.costo_preparacion)} de preparar la oferta`,
      r.veg != null && r.veg <= 0 ? "mal" : "bien"));
    t.push(tarjetaRent("Utilidad esperada", copRent(r.utilidad_esperada), "Antes de impuesto de renta",
      // `null <= 0` es true: sin la guarda, un «—» (sin dato) se pintaba en rojo
      r.utilidad_esperada != null && r.utilidad_esperada <= 0 ? "mal" : null));
    t.push(tarjetaRent("Capital de trabajo máximo", copRent(r.k_max), "Decide si se PUEDE, no si vale la pena"));
    t.push(tarjetaRent("Payback",
      r.payback_meses != null ? `${r.payback_meses} ${r.payback_meses === 1 ? "mes" : "meses"}` : "no retorna",
      r.flujo && !r.flujo.anticipo_es_dato ? "Anticipo sin dato: es una cota" : "Hasta recuperar el capital expuesto"));
    $("rentabilidad").innerHTML = t.join("");

    const a = c.ajuste_competitivo || {};
    const piso = c.precio_piso || {};
    const partes = [];
    if (a.aplicable) {
      partes.push(`<p><strong>Baja mediana del mercado: ${pctRent(a.baja_mediana_pct)}</strong>
        <span class="text-gray-500">(${esc(a.granularidad_utilizada || "")}, ${a.procesos_contados} procesos)</span></p>
        <p class="mt-1">Precio sugerido: <strong>${copRent(a.precio_sugerido)}</strong>${a.baja_propia_pct != null
          ? ` · su oferta descuenta ${pctRent(a.baja_propia_pct)}` : ""}</p>`);
    } else {
      partes.push(`<p class="rounded-lg bg-gray-100 px-3 py-2">${esc(a.mensaje || "Sin índice de baja para esta entidad.")}</p>`);
    }
    if (piso.escenarios) {
      partes.push(`<p class="mt-3">Precio piso · σ 8 %: <strong>${copRent(piso.escenarios.sigma_8.precio_piso)}</strong>
        · σ 15 %: <strong>${copRent(piso.escenarios.sigma_15.precio_piso)}</strong></p>
        <p class="mt-1 text-xs text-gray-500">${esc(piso.nota || "")}</p>`);
    }
    if (r.p_ganar_detalle && r.p_ganar_detalle.mensaje) {
      partes.push(`<p class="mt-3 rounded-lg bg-blue-50 px-3 py-2 text-xs text-blue-900">${esc(r.p_ganar_detalle.mensaje)}
        <br><span class="opacity-80">${esc(r.p_ganar_detalle.supuesto || "")}</span></p>`);
    }
    $("rentabilidad-precio").innerHTML = partes.join("");
    $("rentabilidad-avisos").innerHTML = (r.advertencias || [])
      .map((x) => `<p class="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">${esc(x)}</p>`).join("");
  }

  /* ════════════════════ Precio sugerido (optimizador) ════════════════════
     DOS DESCUENTOS QUE NO SON EL MISMO NÚMERO, y es lo único que hay que tener
     claro para leer este bloque:
       · `descuento`          la baja contra el PRESUPUESTO OFICIAL. Es la que
                              ve el mercado y la que se compara con la mediana
                              histórica de la entidad.
       · `descuento_apu_pct`  lo que hay que escribir en la perilla «Factor de
                              baja», que se aplica sobre SU precio de venta.
     Coinciden solo si el APU da exactamente la cuantía publicada. El botón
     escribe SIEMPRE el segundo; escribir el primero produciría un precio
     distinto del recomendado sin que nada lo delatara. */
  /* ══════ EL PRECIO SUGERIDO, DICHO COMO HECHO (5-sep-2026) ══════
     La pantalla explicaba el MODELO —«bajar más allá del óptimo compra
     probabilidad en uno solo de los cuatro métodos de ponderación, que se
     sortean en la audiencia»—: para entender el número había que leerse un
     párrafo entero, que es exactamente la señal de que el número está mal
     elegido. Lo que decide es el HECHO, y el servidor ya lo calcula: la MESETA
     dice cuántos puntos de baja caben antes de que lo que deja por intento
     caiga más de su tolerancia. Se llama, no se reescribe.

     Sin meseta medida no hay frase — nunca un literal inventado —, y `null` no
     se convierte en 0: «bajar más de 0 puntos» sería una orden falsa. */
  function fraseMeseta(meseta) {
    const m = meseta || {};
    const ancho = m.ancho_pp == null ? null : Number(m.ancho_pp);
    if (ancho == null || !Number.isFinite(ancho) || ancho <= 0) return "";
    const tol = m.tolerancia_pct == null ? null : Number(m.tolerancia_pct);
    return `Bajar más de ${num(ancho)} puntos por debajo de este precio casi no sube su opción de ganar y sí le quita plata`
      + (tol != null && Number.isFinite(tol) ? ` (lo que deja por intento cae más del ${num(tol)} %)` : "") + ".";
  }

  function pintarPrecioSugerido(o, pisoTecho) {
    const sec = $("seccion-precio-sugerido");
    const sin = $("ps-sin-datos");
    const cuerpo = $("ps-cuerpo");
    sec.classList.remove("hidden");
    ultimoOptimizador = o && o.aplicable ? o : null;

    if (!o || !o.aplicable) {
      cuerpo.classList.add("hidden");
      sin.classList.remove("hidden");
      sin.innerHTML = `<p><span aria-hidden="true">●</span> ${esc((o && o.mensaje) || "No hay con qué sugerir un precio para este proceso.")}</p>${botonPasoQueFalta()}`;
      $("ps-origen").textContent = "";
      if ($("ps-hecho")) $("ps-hecho").textContent = "";
      return;
    }
    sin.classList.add("hidden");
    cuerpo.classList.remove("hidden");

    const centro = o.centro_mercado || {};
    $("ps-origen").textContent = `Centro del mercado: ${pctRent(centro.baja_mediana_pct)} de baja`
      + (centro.granularidad_utilizada ? ` · ${centro.granularidad_utilizada}` : "")
      + (centro.modalidad_utilizada ? ` · ${centro.modalidad_utilizada}` : "")
      + ` · ${centro.procesos_contados} procesos`;

    const op = o.optimo;
    $("ps-precio").textContent = copRent(op.precio);
    $("ps-precio-nota").textContent = `Presupuesto oficial ${copRent(o.presupuesto_oficial)}`;
    $("ps-descuento").textContent = pctRent(op.descuento);
    $("ps-veg").textContent = copRent(op.veg);
    $("ps-veg-nota").textContent = "P(ganar) × utilidad neta − costo de preparar la oferta";
    $("ps-prob").textContent = op.probabilidad == null ? "—" : pctRent(op.probabilidad * 100);
    const comp = o.comparacion_con_actual;
    $("ps-prob-nota").textContent = comp && comp.diferencia_veg != null
      ? (comp.ya_esta_en_el_optimo
        ? "Su precio actual YA está en el óptimo."
        : `Frente a su precio actual: ${copRent(comp.diferencia_veg)} de ${window.Glosario.traducir("veg").toLowerCase()}`)
      : "";

    // el color de lo que deja por intento es información: en rojo cuando ni el mejor precio del
    // rango cubre el costo de preparar la oferta
    $("ps-veg").className = `mt-1 text-2xl font-semibold tabular-nums ${o.sin_punto_rentable ? "text-red-700" : ""}`;

    /* ---- las tres opciones ----
       `opc` y `meseta` se declaran ANTES de `fila`, que las lee: declaradas
       después caerían en la zona muerta temporal en cuanto `fila` se llamara
       desde el `.map` de abajo. Es la misma lección del arranque automático,
       en pequeño y dentro de una función. */
    const opc = o.opciones || {};
    const meseta = opc.meseta || {};
    if ($("ps-hecho")) $("ps-hecho").textContent = fraseMeseta(meseta);
    const fila = (clave, p) => {
      if (!p) return "";
      const destacada = clave === "optimo";
      /* Cuando la meseta está pegada al máximo por un lado, esa opción ES el
         óptimo. Repetir la fila sin decirlo se lee como un fallo de pintado;
         decirlo es información: moverse en esa dirección ya cuesta caro. */
      const igual = !destacada && p.descuento === op.descuento;
      const nota = igual
        ? `Coincide con el óptimo: moverse hacia ahí ya cuesta más del ${num(meseta.tolerancia_pct)} % de ${window.Glosario.traducir("veg").toLowerCase()}.`
        : p.explicacion || "";
      return `<tr class="${destacada ? "bg-blue-50/60 font-medium" : igual ? "text-gray-400" : ""}">
        <td class="py-2 pr-3">${esc(p.etiqueta || clave)}
          <span class="block text-xs font-normal text-gray-400">${esc(nota)}</span></td>
        <td class="py-2 pr-3 text-right num">${pctRent(p.descuento)}</td>
        <td class="py-2 pr-3 text-right num">${copRent(p.precio)}</td>
        <td class="py-2 pr-3 text-right num">${p.probabilidad == null ? "—" : pctRent(p.probabilidad * 100)}</td>
        <td class="py-2 pr-3 text-right num">${copRent(p.margen)}</td>
        <td class="py-2 pr-3 text-right num">${copRent(p.veg)}</td>
        <td class="py-2 text-right">
          <button type="button" data-aplicar="${esc(clave)}" ${p.aplicable_al_apu ? "" : "disabled"}
                  title="${p.aplicable_al_apu ? `Escribe ${num(p.descuento_apu_pct)} % en el factor de baja` : "Ese precio está por encima de su precio de venta: no hay descuento que aplicar"}"
                  class="rounded border border-gray-300 px-2 py-1 text-xs font-medium transition hover:bg-gray-50 disabled:opacity-30">Aplicar</button>
        </td>
      </tr>`;
    };
    $("ps-opciones").innerHTML = ["conservador", "optimo", "agresivo"].map((k) => fila(k, opc[k])).join("");

    $("ps-meseta").textContent = meseta.colapsada
      ? `El óptimo es agudo: moverse un solo paso cuesta más del ${num(meseta.tolerancia_pct)} % de ${window.Glosario.traducir("veg").toLowerCase()}, `
        + "así que las tres opciones coinciden."
      : `Meseta: entre ${pctRent(meseta.desde_pct)} y ${pctRent(meseta.hasta_pct)} de baja `
        + `(${num(meseta.ancho_pp)} puntos) ${window.Glosario.traducir("veg").toLowerCase()} no cae más del ${num(meseta.tolerancia_pct)} %. Dentro de esa banda `
        + "la elección es de apetito de riesgo, no de aritmética.";

    /* ---- el botón principal ---- */
    const btn = $("btn-aplicar-descuento");
    btn.disabled = !op.aplicable_al_apu;
    $("ps-aplicar-nota").textContent = op.aplicable_al_apu
      ? `Escribe ${num(op.descuento_apu_pct)} % en «Factor de baja» (sobre su precio de venta) y recalcula: `
        + `el APU dará ${copRent(op.precio_apu_resultante)}.`
      : "No aplicable: el precio óptimo está por encima de su precio de venta. El ajuste competitivo solo baja.";

    $("ps-curva").innerHTML = curvaSVG(o, pisoTecho);
    $("ps-alertas").innerHTML = (o.alertas || [])
      .map((x) => `<p class="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900">${esc(x)}</p>`).join("");
  }

  /* Curva de lo que deja por intento frente al descuento, en SVG en línea. Sin librería: el proyecto no tiene
     dependencias y una polilínea no justifica la primera. Marca el óptimo y
     —cuando cae dentro del rango— el precio vigente, que es lo que convierte la
     gráfica en «dónde estoy y a dónde debería moverme». */
  function curvaSVG(o, pisoTecho) {
    const pts = (o.curva || []).filter((p) => Number.isFinite(p.veg) && Number.isFinite(p.descuento));
    if (pts.length < 2) return "";
    const W = 720, H = 180, mL = 92, mR = 14, mT = 16, mB = 30;
    const xs = pts.map((p) => p.descuento);
    const ys = pts.map((p) => p.veg);
    const x0 = Math.min(...xs), x1 = Math.max(...xs);
    const y0 = Math.min(...ys, 0);
    let y1 = Math.max(...ys, 0);
    if (y1 === y0) y1 = y0 + 1;
    const px = (d) => mL + (W - mL - mR) * (x1 === x0 ? 0.5 : (d - x0) / (x1 - x0));
    const py = (v) => mT + (H - mT - mB) * (1 - (v - y0) / (y1 - y0));

    const linea = pts.map((p) => `${px(p.descuento).toFixed(1)},${py(p.veg).toFixed(1)}`).join(" ");
    const cero = py(0);
    const op = o.optimo;
    const actual = o.punto_actual;
    const dentro = actual && Number.isFinite(actual.descuento) && actual.descuento >= x0 && actual.descuento <= x1;

    /* PISO Y TECHO EN LA CURVA (6-sep-2026, DV-R2): las dos cifras que el panel
       de arriba ya enseña —«su precio mínimo para no perder plata» y «el precio
       al que probablemente se gana»—, convertidas a descuento sobre el
       presupuesto oficial (1 − precio ÷ presupuesto). Viajan en `piso_techo`
       (lib/apu/piso_techo), no en el optimizador, y se pintan SOLO si existen y
       caen dentro del rango dibujado: una línea pegada al borde diría que el
       piso está donde no está. Sin dato, sin línea. */
    const cf = pisoTecho && pisoTecho.aplicable && pisoTecho.cifras ? pisoTecho.cifras : null;
    const po = Number(o.presupuesto_oficial);
    const refs = [];
    if (cf && Number.isFinite(po) && po > 0) {
      for (const [ref, valor, rotulo] of [["piso", cf.piso_rentable, "por debajo pierde plata"], ["techo", cf.techo_competitivo, "precio al que suele ganarse"]]) {
        if (!Number.isFinite(valor)) continue;
        const d = (1 - valor / po) * 100;
        if (d < x0 || d > x1) continue;
        refs.push({ ref, d, rotulo });
      }
    }
    /* el eje vertical se rotula con el glosario: el HECHO («lo que deja por
       intento»), nunca la sigla del modelo */
    const ejeY = window.Glosario.traducir("veg");
    const medioY = ((mT + H - mB) / 2).toFixed(1);
    const anclaRef = (x) => (x < mL + 90 ? "start" : x > W - mR - 90 ? "end" : "middle");

    /* colores del TEMA por variable (acento y gris secundario): el SVG en línea
       hereda las custom properties del tema, así que van literales */
    return `<svg viewBox="0 0 ${W} ${H}" class="h-44 w-full min-w-[560px]" role="img"
      aria-label="${esc(ejeY)} según el descuento sobre el presupuesto oficial${refs.length ? "; con las líneas de referencia " + esc(refs.map((r) => r.rotulo).join(" y ")) : ""}">
      <text transform="rotate(-90 12 ${medioY})" x="12" y="${medioY}" font-size="11" fill="var(--text-secondary)" text-anchor="middle">${esc(ejeY)}</text>
      <line x1="${mL}" y1="${cero.toFixed(1)}" x2="${W - mR}" y2="${cero.toFixed(1)}" stroke="var(--viz-grid)" stroke-dasharray="3 3"/>
      ${refs.map((r) => `<line data-ref="${r.ref}" x1="${px(r.d).toFixed(1)}" y1="${mT}" x2="${px(r.d).toFixed(1)}" y2="${H - mB}" stroke="var(--text-secondary)" stroke-width="1" stroke-dasharray="4 3"/>
      <text data-ref="${r.ref}" x="${px(r.d).toFixed(1)}" y="${mT - 4}" font-size="11" fill="var(--text-secondary)" text-anchor="${anclaRef(px(r.d))}">${esc(r.rotulo)}</text>`).join("\n      ")}
      <polyline points="${linea}" fill="none" stroke="var(--accent)" stroke-width="2"/>
      <line x1="${px(op.descuento).toFixed(1)}" y1="${mT}" x2="${px(op.descuento).toFixed(1)}" y2="${H - mB}"
            stroke="var(--accent)" stroke-width="1" stroke-dasharray="2 3"/>
      <circle cx="${px(op.descuento).toFixed(1)}" cy="${py(op.veg).toFixed(1)}" r="4" fill="var(--accent)"/>
      ${dentro ? `<circle cx="${px(actual.descuento).toFixed(1)}" cy="${py(actual.veg).toFixed(1)}" r="4"
            fill="none" stroke="var(--text-secondary)" stroke-width="2"/>` : ""}
      <text x="${mL}" y="${H - 10}" font-size="11" fill="var(--text-secondary)">${esc(nf2.format(x0))} %</text>
      <text x="${W - mR}" y="${H - 10}" font-size="11" fill="var(--text-secondary)" text-anchor="end">${esc(nf2.format(x1))} %</text>
      <text x="${px(op.descuento).toFixed(1)}" y="${H - 10}" font-size="11" fill="var(--accent)" text-anchor="middle">óptimo ${esc(nf2.format(op.descuento))} %</text>
      <text x="24" y="${(py(y1) + 4).toFixed(1)}" font-size="11" fill="var(--text-secondary)">${esc(copRent(y1))}</text>
      ${cero - py(y1) >= 14 ? `<text x="24" y="${(cero + 4).toFixed(1)}" font-size="11" fill="var(--text-secondary)">$0</text>` : ""}
    </svg>`;
  }

  /* ── «Aplicar este descuento al APU» ──────────────────────────────────
     Escribe la perilla, enciende el ajuste competitivo y RECALCULA por el mismo
     camino que el botón «Calcular APU». Una pulsación que solo rellenara el
     campo dejaría al resumen enseñando el precio anterior. */
  async function aplicarDescuentoApu(punto) {
    if (!punto) return;
    if (!punto.aplicable_al_apu) {
      $("ps-aplicar-nota").textContent = "No aplicable: ese precio está por encima de su precio de venta, "
        + "así que no es un descuento. Suba la utilidad o la administración si quiere que el APU lo refleje.";
      return;
    }
    /* El campo que se escribe vive dentro del <details> de Ajustes, que nace
       CERRADO: sin abrirlo, el usuario veía cambiar los totales sin ver qué se
       tocó — una acción invisible parece magia o parece un error. */
    const ajustes = document.getElementById("ajustes-wrap");
    if (ajustes) ajustes.open = true;
    $("ajuste-competitivo").checked = true;
    sincronizarBaja();
    $("factor-baja").value = punto.descuento_apu_pct;
    $("baja-nota").textContent = `Del precio sugerido: ${num(punto.descuento_apu_pct)} % sobre su precio de venta, `
      + `que equivale a ${num(punto.descuento)} % de baja contra el presupuesto oficial.`;
    msgApu(`Descuento aplicado (${num(punto.descuento_apu_pct)} %). Recalculando…`, "info");
    const ok = await calcularApu();
    if (ok && $("id-proceso").value.trim()) await calcularRentabilidad({ auto: true });
  }

  $("btn-aplicar-descuento").addEventListener("click", () => {
    if (!ultimoOptimizador) return;
    aplicarDescuentoApu(ultimoOptimizador.optimo);
  });

  // delegación: la tabla se repinta entera en cada cálculo
  $("ps-opciones").addEventListener("click", (e) => {
    const clave = e.target.getAttribute("data-aplicar");
    if (!clave || !ultimoOptimizador) return;
    aplicarDescuentoApu((ultimoOptimizador.opciones || {})[clave]);
  });

  /* ══════ QUÉ GUARDAN LOS DOS PLIEGUES DE PRECIOS (5-sep-2026) ══════
     «Ajustes» y «Guardar o abrir un borrador» no decían nada de su contenido:
     había que abrirlos para descubrir que estaban intactos o vacíos.

     Los ajustes se cuentan por CENSO, no por lista: se recorren TODOS los
     controles del pliegue y cada uno se compara con SU valor por defecto (el
     que trae el marcado). Una lista de campos a vigilar se queda coja en
     cuanto alguien añade una perilla nueva — y este pliegue ya lleva dieciséis. */
  function ajustesCambiados() {
    const caja = $("ajustes-wrap");
    if (!caja) return null;
    let n = 0;
    for (const el of caja.querySelectorAll("input, select, textarea")) {
      if (el.type === "checkbox" || el.type === "radio") { if (el.checked !== el.defaultChecked) n++; continue; }
      if (el.tagName === "SELECT") {
        const d = Array.from(el.options).find((o) => o.defaultSelected) || el.options[0];
        if (d && el.value !== d.value) n++;
        continue;
      }
      if (el.value !== el.defaultValue) n++;
    }
    return n;
  }
  function pintarResumenAjustes() {
    const nodo = $("ajustes-resumen"); if (!nodo) return;
    const n = ajustesCambiados();
    nodo.textContent = n == null ? "" : sufijoResumen(null, n > 0 ? `${n} cambiado${n === 1 ? "" : "s"}` : "");
  }
  /* «Sin dato» NO es «cero»: si la consulta de borradores falla, el pliegue se
     queda con su nombre y no promete un «(0)» que sería falso. */
  function pintarResumenBorradores(n) {
    const nodo = $("borradores-resumen"); if (!nodo) return;
    nodo.textContent = Number.isFinite(n) ? sufijoResumen(n, "") : "";
  }
  async function contarBorradores() {
    try {
      const r = await api(`/api/apu?op=listar&perfil=${encodeURIComponent($("perfil").value)}`);
      if (r && Array.isArray(r.presupuestos)) pintarResumenBorradores(r.presupuestos.length);
    } catch { /* sin dato: el pliegue se queda como estaba */ }
  }

  async function arrancar() {
    /* el selector del borrador nace vacío en el HTML: se llena desde la barra
       ANTES de leer la URL de la tarjeta, que puede traer el perfil */
    sincronizarPerfilBorrador();
    if ($("perfil")) $("perfil").addEventListener("change", () => { pintarRotuloPerfil(); contarBorradores(); });
    const hayProceso = precargarDesdeURL();
    // envuelto en una flecha a propósito: pasarla directa le entregaría el
    // MouseEvent como opciones y `{auto}` se leería de un objeto que no lo es
    $("btn-rentabilidad").addEventListener("click", () => calcularRentabilidad());
    if ($("btn-justificacion")) $("btn-justificacion").addEventListener("click", descargarJustificacion);
    sincronizarBaja();
    pintarTabla();
    /* LA ESPERA SE DICE (5-sep-2026): la primera vez que se abre Precios el
       catálogo tarda, y hasta hoy la pestaña se quedaba callada — igual que si
       ya hubiera terminado. */
    try {
      msgApu("Cargando su catálogo de precios…");
      await cargarCatalogo();
      pintarTabla(); // el catálogo aporta los rendimientos por defecto del placeholder
      msgApu("");
    } catch (e) {
      msgApu(mensajeDeFallo(e, "cargar su catálogo de precios"), "error");
    }
    // el departamento del proceso solo se puede fijar cuando el catálogo ya
    // llenó el desplegable: antes no existe la opción que hay que seleccionar
    if (hayProceso) precargarDesdeURL();
    /* los dos pliegues dicen qué guardan ANTES de abrirlos, y los ajustes se
       vuelven a contar en cuanto se toca cualquiera de sus controles */
    const cajaAj = $("ajustes-wrap");
    if (cajaAj) { for (const ev of ["input", "change"]) cajaAj.addEventListener(ev, pintarResumenAjustes); }
    pintarResumenAjustes();
    contarBorradores();
  }
  /* «Reintentar» de Precios: repite la carga del catálogo, que es de lo que
     cuelga toda la pestaña. Se registra aquí (no dentro de `arrancar`) para
     que exista aunque la primera carga sea la que falló. */
  if ($("accion-reintentar")) {
    $("accion-reintentar").addEventListener("click", async () => {
      try {
        msgApu("Cargando su catálogo de precios…");
        await cargarCatalogo();
        pintarTabla();
        msgApu("");
      } catch (e) {
        msgApu(mensajeDeFallo(e, "cargar su catálogo de precios"), "error");
      }
    });
  }


  /* ══════════ Estado del encadenado ══════════ */
  let activo = false;      // el bucle sigue vivo
  let tandas = 0;
  let timerEspera = null;

  function estado(texto, { girando = false } = {}) {
    $("chip-texto").textContent = texto;
    $("chip-spin").classList.toggle("hidden", !girando);
  }
  function mensaje(texto, tipo) {
    const p = $("mensaje");
    if (!texto) return p.classList.add("hidden");
    p.className = "mt-5 rounded-xl px-4 py-3 text-sm " + ({
      ok: "bg-green-50 text-green-800 ring-1 ring-inset ring-green-600/20",
      error: "bg-red-50 text-red-700 ring-1 ring-inset ring-red-600/20",
      aviso: "bg-amber-50 text-amber-800 ring-1 ring-inset ring-amber-600/20",
    }[tipo] || "bg-gray-50 text-gray-600 ring-1 ring-inset ring-gray-500/20");
    p.textContent = texto;
  }
  function bitacora(linea) {
    const li = document.createElement("li");
    const hora = new Date().toLocaleTimeString("es-CO", { hour12: false });
    li.innerHTML = `<span class="text-gray-400">${hora}</span> ${esc(linea)}`;
    $("bitacora").prepend(li);
    while ($("bitacora").children.length > 60) $("bitacora").lastChild.remove();
  }

  /* Porcentaje global: meses completos + fracción del mes en curso. */
  function pintarProgreso(p) {
    if (!p) return;
    // simétrico de `pintarAlDia`: cada modo repone SUS rótulos, así una full
    // después de un delta no hereda «Filas revisadas» sobre cifras del mes
    $("dt-mes").textContent = "Mes";
    $("dt-filas").textContent = "Filas del mes";
    const deMeses = p.deMeses || 1;
    const dentroDelMes = p.esperadosMes > 0 ? Math.min(p.leidasMes / p.esperadosMes, 1) : 0;
    const pct = Math.max(0, Math.min(100, ((p.mesIdx || 0) + dentroDelMes) / deMeses * 100));
    $("prog-barra").style.width = `${pct}%`;
    $("prog-pct").textContent = `${pct.toFixed(1)} %`;
    $("prog-mes").textContent = p.mes ? `Mes ${p.mes} · ${(p.mesIdx || 0) + 1} de ${deMeses}` : "—";
    $("m-mes").textContent = p.mes || "—";
    $("m-filas").textContent = p.esperadosMes > 0
      ? `${fmt.format(p.leidasMes || 0)} / ${fmt.format(p.esperadosMes)}`
      : fmt.format(p.leidasMes || 0);
  }
  /* Un conteo ausente se dice «—», jamás 0: es la regla del proyecto y aquí
     decide si el dueño cree que una tanda no guardó nada. */
  function cifra(n) { return Number.isFinite(n) ? fmt.format(n) : "—"; }

  /* El delta NO conoce su total (barre por `:updated_at`, no por meses con
     `count(*)` esperado), así que no hay porcentaje que pintar: inventarlo
     sería una barra sin base. Se enseña lo que sí viene medido y los rótulos
     cambian con el modo — «Filas del mes» no describe un ciclo de delta. */
  function pintarAlDia(d) {
    if (!d) return;
    $("prog-pct").textContent = "—";
    $("prog-mes").textContent = "Poniéndose al día";
    $("dt-mes").textContent = "Estado";
    $("dt-filas").textContent = "Filas revisadas";
    $("m-mes").textContent = d.parcial ? "Falta otra tanda" : "Al día";
    $("m-filas").textContent = cifra(d.ciclo_leidas);
    $("m-total").textContent = cifra(d.guardadas);
    /* EL PANEL SIMPLE (encargo del ingeniero): la sensación de «va cargando
       poco a poco» sale de los CONTEOS REALES que crecen tanda a tanda, no de
       un porcentaje — el delta no tiene denominador y fabricarlo sería inventar
       una medición en la pantalla que dice si los datos están al día. */
    const cif = document.getElementById("act-cifras");
    if (cif) {
      const leidas = Number(d.ciclo_leidas), guardadas = Number(d.guardadas);
      const partes = [];
      if (Number.isFinite(leidas)) partes.push(`${fmt.format(leidas)} ${leidas === 1 ? "proceso revisado" : "procesos revisados"}`);
      if (Number.isFinite(guardadas)) partes.push(`${fmt.format(guardadas)} ${guardadas === 1 ? "actualizado" : "actualizados"}`);
      cif.textContent = partes.join(" · ");
    }
    const est = document.getElementById("act-estado");
    if (est) est.textContent = d.parcial ? "Cargando datos de SECOP II…" : "Datos al día";
  }

  function completar(cuerpo) {
    const estA = document.getElementById("act-estado");
    if (estA) estA.textContent = "Datos al día";
    $("prog-barra").style.width = "100%";
    $("prog-pct").textContent = "100 %";
    $("prog-mes").textContent = "Carga completa";
    if (cuerpo && cuerpo.total != null) {
      $("m-total").textContent = fmt.format(cuerpo.total);
      $("m-filas").textContent = cuerpo.leidas != null ? fmt.format(cuerpo.leidas) : "—";
    }
  }

  /* Espera cancelable con cuenta regresiva; resuelve false si se detuvo. */
  function esperar(ms, etiqueta) {
    return new Promise((resolve) => {
      let restante = Math.round(ms / 1000);
      const tic = () => {
        if (!activo) return resolve(false);
        estado(`${etiqueta} (${restante} s)`, { girando: true });
        if (restante-- <= 0) return resolve(true);
        timerEspera = setTimeout(tic, 1000);
      };
      tic();
    });
  }

  /* Una llamada, con reintentos ante fallo de red o 5xx. Devuelve el cuerpo
     JSON, o null si se agotaron los reintentos (o se detuvo el bucle). */
  /* Lo que la pulsación desde la marca le dirá al sello si termina en error
     (6-sep-2026, V-B3a-03): la causa en palabras de persona y qué hacer. El
     detalle técnico sigue yendo a `mensaje()` en Mi empresa. */
  let falloPulsacion = null;
  async function llamarConReintentos(modo) {
    const presupuesto = $("f-presupuesto").value;
    falloPulsacion = null;
    for (let intento = 0; intento <= BACKOFF_MS.length; intento++) {
      if (!activo) return null;
      let r = null, cuerpo = null, fallo = null;
      try {
        r = await fetch(`/api/procesos?op=sync&modo=${modo}&presupuesto=${presupuesto}`, opcionesSync({ Accept: "application/json" }));
        cuerpo = await leerJson(r); // el muro del edge devuelve HTML
      } catch (e) {
        fallo = fraseDeFallo(e);
      }
      if (!activo) return null;

      if (r && (r.status === 401 || r.status === 403)) {
        mensaje(fraseDeFallo({ status: r.status }), "error");
        falloPulsacion = "la clave del servidor no coincide; el detalle está en Mi empresa";
        return null;
      }
      if (r && r.ok && cuerpo && cuerpo.ok) return cuerpo;

      // 4xx con cuerpo: error de uso, no se reintenta
      if (r && !r.ok && r.status < 500 && cuerpo && cuerpo.error) {
        mensaje(`El servidor rechazó la sincronización: ${cuerpo.error}`, "error");
        falloPulsacion = "el servidor no aceptó la petición; el detalle está en Mi empresa";
        return null;
      }

      const detalle = fallo || (cuerpo && cuerpo.error) || (r ? fraseDeFallo({ status: r.status }) : "respuesta ilegible");
      if (intento === BACKOFF_MS.length) {
        mensaje(`La sincronización falló tras ${BACKOFF_MS.length} reintentos: ${detalle}. El avance quedó guardado: puede volver a iniciar.`, "error");
        bitacora(`✘ ${detalle} — reintentos agotados`);
        falloPulsacion = "SECOP II no respondió; vuelva a intentarlo en unos minutos";
        return null;
      }
      bitacora(`⚠ ${detalle} — reintento ${intento + 1}/${BACKOFF_MS.length}`);
      if (!(await esperar(BACKOFF_MS[intento], "Reintentando"))) return null;
    }
    return null;
  }

  /* ══════════ Bucle principal ══════════ */
  async function encadenar(continuar) {
    // 1.ª tanda: full (reinicia). Siguientes: auto (continúa) — ver cabecera.
    let modo = "full";
    /* «Ponerse al día» REUTILIZA este mismo bucle y entra directo en auto. Dos
       motivos, y los dos costaron caro en este repositorio: (1) la full vuelve
       a enero, así que para cerrar el atraso de un delta partido en tandas
       sería releer el año entero; (2) un segundo bucle «equivalente hoy»
       —con sus reintentos, su candado y su botón de detener— diverge del
       primero a la primera corrección que se aplique a uno solo. */
    if (continuar) modo = "auto";
    while (activo) {
      estado(tandas === 0 ? "Ejecutando…" : `Ejecutando… (tanda ${tandas + 1})`, { girando: true });
      const cuerpo = await llamarConReintentos(modo);
      if (!activo) break;
      if (!cuerpo) { detener("error"); return; }

      if (cuerpo.enCurso) {
        // otra tanda tiene el candado: acompañarla, nunca reiniciarla
        modo = "auto";
        bitacora("• candado tomado por otra tanda — esperando");
        estado("Esperando candado…", { girando: true });
        if (!(await esperar(ESPERA_CANDADO_MS, "Esperando candado"))) break;
        continue;
      }

      tandas++;
      $("m-tandas").textContent = String(tandas);

      if (cuerpo.done === true) {
        completar(cuerpo);
        /* El cuerpo de un delta NO trae `total` ni `leidas`: son campos de la
           full. Reusar aquí su redacción anunciaría «0 procesos guardados»
           justo cuando acaba de guardar miles — un `|| 0` sobre un conteo
           convirtiendo un «no aplica» en un cero creíble. */
        const d = cuerpo.delta;
        if (d) { $("prog-mes").textContent = "Al día"; $("dt-mes").textContent = "Estado"; }
        bitacora(cuerpo.alDia
          ? "✔ los datos ya estaban al día"
          : d
            ? `✔ al día · ${cifra(d.ciclo_leidas)} filas revisadas en ${cifra(d.ciclo_invocaciones)} invocación(es)`
            : `✔ carga completa · ${fmt.format(cuerpo.total || 0)} guardadas de ${fmt.format(cuerpo.leidas || 0)} leídas`);
        estado("Completado");
        mensaje(cuerpo.alDia
          ? "Sincronización completada: los datos ya estaban al día."
          : d
            ? `Ya está al día: ${cifra(d.ciclo_leidas)} filas revisadas y las novedades guardadas, en ${tandas} tanda${tandas === 1 ? "" : "s"}. La lista de licitaciones ya refleja lo último de SECOP II.`
            : `Sincronización completada en ${tandas} tanda${tandas === 1 ? "" : "s"}. ${fmt.format(cuerpo.total || 0)} procesos guardados.`, "ok");
        activo = false;
        botones(false);
        return;
      }

      if (cuerpo.delta) {
        pintarAlDia(cuerpo.delta);
        const d = cuerpo.delta;
        bitacora(`tanda ${tandas} · ${cifra(d.ciclo_leidas)} revisadas · ${cifra(d.guardadas)} guardadas · ${cifra(d.historicas)} al histórico · ${Math.round((cuerpo.duracionMs || 0) / 1000)} s`);
      } else {
        pintarProgreso(cuerpo.progreso);
        const p = cuerpo.progreso || {};
        bitacora(`tanda ${tandas} · ${p.mes || "?"} (${(p.mesIdx || 0) + 1}/${p.deMeses || "?"}) · ${fmt.format(p.leidasMes || 0)} filas · ${Math.round((cuerpo.duracionMs || 0) / 1000)} s`);
      }
      modo = "auto"; // a partir de aquí SIEMPRE continuar, nunca reiniciar
      if (!(await esperar(ESPERA_ENTRE_TANDAS_MS, "Siguiente tanda"))) break;
    }
    if (!activo) return; // detenido por el usuario: el estado ya se pintó
  }

  function botones(corriendo) {
    $("btn-iniciar").disabled = corriendo;
    $("btn-al-dia").disabled = corriendo;
    $("btn-detener").disabled = !corriendo;
    $("f-presupuesto").disabled = corriendo;
    /* EL BOTÓN ÚNICO SE GOBIERNA DESDE AQUÍ, que es el punto por el que ya
       pasan las cinco transiciones (arranque, fin, detención, error, candado).
       Cablearlo en cada una habría dejado alguna sin cubrir —y ese es
       exactamente el botón que se queda deshabilitado para siempre—. Al
       terminar, el panel NO se esconde: se queda con la última cifra y sin
       giro, porque el resultado es la respuesta a la pulsación. */
    const bA = document.getElementById("btn-actualizar-datos");
    if (bA) bA.disabled = corriendo;
    /* LA MARCA DE LA BARRA SE GOBIERNA DESDE AQUÍ POR LA MISMA RAZÓN que el
       botón único: este es el punto por el que ya pasan las cinco transiciones
       (arranque, fin, detención, error, candado). Cablearla en cada una dejaría
       alguna sin cubrir, y esa es exactamente la que deja la flecha girando
       para siempre. Al TERMINAR se vuelve a pedir la lista y el pulso: el corte
       que se enseña sale del servidor, nunca del reloj del navegador — poner la
       hora local sería afirmar una sincronización que puede no haber traído
       nada. */
    const bM = document.getElementById("btn-marca");
    if (bM) { bM.disabled = corriendo; bM.classList.toggle("marca-girando", corriendo); }
    if (corriendo) marcaTrabajando("Trayendo datos de SECOP II…");
    else if (marcaEsperandoCorte) { marcaEsperandoCorte = false; refrescarTrasActualizar(); }
    const sp = document.getElementById("act-spin");
    if (sp) sp.hidden = !corriendo;
    const ba = document.getElementById("act-barra");
    if (ba) ba.classList.toggle("barra-indeterminada", corriendo);
  }

  function detener(motivo) {
    activo = false;
    clearTimeout(timerEspera);
    /* La pulsación desde la marca que termina en ERROR dice su resultado en el
       sello (6-sep-2026, V-B3a-03). Antes `botones(false)` mandaba a confirmar
       el corte y la barra volvía a la MISMA línea de antes del clic —36 s de
       giro sin respuesta visible— mientras el motivo iba a #mensaje, que vive
       en Mi empresa y no se ve desde Licitaciones ni Precios. Hay que hacerlo
       ANTES de botones(false), que es quien lanza la confirmación. */
    if (motivo === "error" && marcaEsperandoCorte) {
      marcaEsperandoCorte = false;
      pintarCorte(corteActual, null, { falloAhora: falloPulsacion || "vuelva a intentarlo en unos minutos" });
    }
    botones(false);
    if (motivo === "error") { estado("Error"); return; }
    estado("Detenido");
    bitacora("■ encadenado detenido por el usuario");
    mensaje("Encadenado detenido. El avance quedó guardado en Redis: al volver a iniciar, la carga continúa donde se quedó (la tanda que estuviera corriendo en el servidor termina sola).", "aviso");
  }

  /* Arranque de la full, con NOMBRE porque tiene dos disparadores: el botón de
     esta sección y el paso 3 de la puesta en producción de la experiencia.
     Extraerlo —en vez de que el otro simule un clic o repita el cuerpo— es lo
     que garantiza que la invariante «1.ª tanda full, siguientes auto» valga
     para los dos: repetir `full` volvería a enero para siempre, y una segunda
     copia de este arranque es exactamente donde eso se rompería sin que nadie
     lo notara.
     Devuelve `false` si no hizo nada (ya había un encadenado corriendo), para
     que quien lo llame no anuncie un paso que no ocurrió. */
  function iniciarFull() {
    if (activo) return false;
    activo = true;
    tandas = 0;
    $("m-tandas").textContent = "0";
    $("m-total").textContent = "—";
    $("prog-barra").style.width = "0%";
    $("prog-pct").textContent = "0 %";
    mensaje(null);
    bitacora("▶ iniciando carga completa");
    botones(true);
    encadenar();
    return true;
  }
  /* Hermano de `iniciarFull` y con la MISMA forma a propósito: nombre propio
     (para poder reutilizarse y probarse), guarda de reentrada y `false` si no
     hizo nada. Lo único que cambia es que arranca el bucle en `auto`: continúa
     el ciclo de delta que quedó a medias en vez de volver a enero. Es lo que
     el dueño necesita a diario; la full es la excepción anual. */
  function iniciarAlDia() {
    if (activo) return false;
    activo = true;
    tandas = 0;
    $("m-tandas").textContent = "0";
    $("m-total").textContent = "—";
    $("prog-barra").style.width = "0%";
    $("prog-pct").textContent = "—";
    $("prog-mes").textContent = "Poniéndose al día";
    mensaje(null);
    bitacora("▶ poniéndose al día (continúa, no reinicia)");
    botones(true);
    encadenar(true);
    return true;
  }
  /* EL BOTÓN ÚNICO LLAMA A `iniciarAlDia`, no reimplementa nada. El encadenado
     de tandas —candado, backoff, `let modo = "full"` una sola vez, la
     invariante «1.ª full, siguientes auto»— vive en `encadenar` y una segunda
     copia rompería justo lo que la suite vigila. Lo único propio del botón es
     enseñar y esconder su panel. */
  /* Tras una actualización, el corte nuevo se PIDE: `buscar()` lo trae en
     `sincronizado` y `pintarCorte` lo escribe; el pulso se refresca forzando la
     memoria del módulo, que si no se quedaría con el corpus anterior. Si algo
     falla, la barra dice que la lectura no se pudo confirmar en vez de dejar la
     hora vieja como si fuera nueva. */
  function refrescarTrasActualizar() {
    marcaTrabajando("Confirmando el corte…");
    Promise.resolve()
      .then(() => buscar())
      .then(() => { refrescarPulso({ forzar: true }); if (!corteActual) pintarCorte(null); })
      .catch(() => marcaTrabajando("No se pudo confirmar el corte: recargue la página."));
  }

  function actualizarDatos() {
    /* en la vista de visitante la sincronización no se dispara desde el
       navegador (M-SEG-02): la marca es un rótulo y el panel está oculto. La
       guarda va aquí, en el camino que comparten los dos, no en cada botón. */
    if (vistaVisitanteActiva) { marcaEsperandoCorte = false; return; }
    const panel = document.getElementById("act-panel");
    const est = document.getElementById("act-estado");
    const cif = document.getElementById("act-cifras");
    if (est) est.textContent = "Cargando datos de SECOP II…";
    if (cif) cif.textContent = "";
    if (panel) panel.hidden = false;
    $("btn-actualizar-datos").disabled = true;
    /* `iniciarAlDia` devuelve false si ya hay una tanda en curso: entonces no
       se ha empezado nada y el botón tiene que volver a estar disponible —una
       pulsación sin respuesta visible es peor que un error. */
    if (!iniciarAlDia()) {
      if (est) est.textContent = "Ya hay una actualización en curso.";
      $("btn-actualizar-datos").disabled = false;
    }
  }
  const btnAct = document.getElementById("btn-actualizar-datos");
  if (btnAct) btnAct.addEventListener("click", actualizarDatos);
  /* LA MARCA DISPARA LO MISMO, no una copia: `actualizarDatos` ya enseña el
     panel de Mi empresa y llama a `iniciarAlDia`. Lo único propio de la marca
     es su indicador en la barra, porque quien pulsa desde Licitaciones o
     Precios no ve aquel panel. */
  const btnMarca = document.getElementById("btn-marca");
  if (btnMarca) btnMarca.addEventListener("click", () => { marcaEsperandoCorte = true; actualizarDatos(); });
  $("btn-al-dia").addEventListener("click", iniciarAlDia);
  $("btn-iniciar").addEventListener("click", iniciarFull);
  $("btn-detener").addEventListener("click", () => detener("usuario"));

  /* ══════════ ¿Por qué no está este proceso? ══════════
     El dueño vio cuatro convocatorias de la UNIVERSIDAD PEDAGÓGICA NACIONAL en
     SECOP II y una sola aquí (20-ago-2026), y no había ninguna forma de
     averiguar dónde habían muerto las otras: el embudo del diagnóstico censa el
     corpus YA GUARDADO, así que lo descartado en la ingesta no figuraba en
     ningún sitio. Esta caja consulta `?buscar=` y traduce las cuatro respuestas
     posibles. NO reimplementa nada: el servidor decide y aquí solo se pinta.
     `no_consta` se dice como lo que es —la app no lo ha leído—, jamás como «ese
     proceso no existe»: nadie ha mirado SECOP II desde aquí. */
  const DONDE = {
    servido: ["✓", "text-emerald-700", "La aplicación lo está enseñando"],
    en_corpus: ["●", "text-amber-700", "Guardado, pero apartado por el juicio"],
    descartado_en_ingesta: ["●", "text-red-700", "Se descartó al leerlo de SECOP II"],
  };
  const MOTIVO_LEGIBLE = {
    modalidad_no_competitiva: "su modalidad no es de convocatoria abierta (no se compite)",
    estado_no_abierto: "el estado publicado no dice que esté abierto",
    cierre_vencido: "su fecha límite ya pasó",
    convenio: "el objeto es un convenio, no una licitación",
    blacklist_objeto: "el objeto está fuera de lo que hace su empresa",
    unspsc_fuera_de_la_union: "sus códigos de actividad no caen en las familias de obra",
    sin_unspsc_ni_obra: "no trae códigos y el objeto no habla de obra",
    mes_fuera_de_ventana: "su fecha de publicación cae fuera del año que la aplicación guarda",
  };
  async function rastrearProceso() {
    const consulta = String($("ra-consulta").value || "").trim();
    const caja = $("ra-resultado");
    caja.classList.remove("hidden");
    if (consulta.length < 3) { caja.innerHTML = '<p class="text-amber-700">Escriba al menos 3 caracteres.</p>'; return; }
    caja.innerHTML = '<p class="text-gray-500">Buscándolo…</p>';
    let r, cuerpo;
    try {
      /* El ámbito y la modalidad viajan solo si el usuario los eligió: mandar
         `campo=todo` y `modalidad=` sería ruido en la URL, y el servidor ya
         tiene esos defectos. Las opciones de modalidad se rellenan desde
         public/filtros.js — una segunda tabla de nombres se desincronizaría
         del selector de la hoja de filtros. */
      const campoRa = $("ra-campo").value, modRa = $("ra-modalidad").value;
      r = await fetch(`/api/perfil?op=diagnostico&perfil=${encodeURIComponent($("ra-perfil").value)}&buscar=${encodeURIComponent(consulta)}`
        + (campoRa && campoRa !== "todo" ? `&campo=${encodeURIComponent(campoRa)}` : "")
        + (modRa ? `&modalidad=${encodeURIComponent(modRa)}` : ""),
        { headers: { "x-historico-token": TOKEN } });
    } catch {
      caja.innerHTML = '<p class="text-red-700">No se pudo contactar el servidor.</p>'; return;
    }
    cuerpo = await leerJson(r);
    if (r.status === 401 || r.status === 403) { caja.innerHTML = `<p class="text-red-700">${esc(msg401(cuerpo))}</p>`; return; }
    if (!r.ok || !cuerpo.ok) { caja.innerHTML = `<p class="text-red-700">${esc(cuerpo.error || "No se pudo consultar.")}</p>`; return; }

    if (!cuerpo.encontrados) {
      caja.innerHTML = `<div class="rounded-xl bg-gray-50 p-4">
        <p class="font-medium">No consta en la aplicación</p>
        <p class="mt-1 text-gray-600">${esc(cuerpo.explicacion || "")}</p>
        <p class="mt-2 text-gray-600"><strong>Qué hacer:</strong> ${esc(cuerpo.siguiente_paso || "")}</p>
      </div>`;
      return;
    }
    caja.innerHTML = cuerpo.resultados.map((x) => {
      const [punto, clase, titulo] = DONDE[x.donde] || ["●", "text-gray-700", x.donde];
      const porque = x.donde === "descartado_en_ingesta"
        ? (MOTIVO_LEGIBLE[x.motivo] || x.motivo)
        : (x.explicacion || "");
      return `<div class="mb-3 rounded-xl bg-gray-50 p-4">
        <p class="font-medium ${clase}">${punto} ${esc(titulo)}</p>
        <p class="mt-1 font-medium">${esc(x.referencia || x.id_proceso || "")}</p>
        <p class="text-gray-600">${esc(x.entidad || "")}</p>
        ${x.objeto ? `<p class="mt-1 text-gray-600">${esc(x.objeto)}</p>` : ""}
        ${porque ? `<p class="mt-2 text-gray-700"><strong>Por qué:</strong> ${esc(porque)}</p>` : ""}
        ${x.estado || x.fase ? `<p class="mt-1 text-xs text-gray-500">Estado publicado: ${esc(x.estado || "—")} · Fase: ${esc(x.fase || "—")}</p>` : ""}
      </div>`;
    }).join("");
  }
  /* Las modalidades salen de public/filtros.js, la MISMA lista que alimenta la
     hoja de filtros del listado: escribirlas a mano aquí sería una segunda
     tabla de nombres que se desincroniza a la primera corrección. */
  (function poblarModalidadesRastreo() {
    const sel = document.getElementById("ra-modalidad");
    if (!sel || !window.Filtros) return;
    for (const m of window.Filtros.MODALIDADES || []) {
      const o = document.createElement("option");
      o.value = m.id; o.textContent = m.etiqueta; o.title = m.ayuda || "";
      sel.appendChild(o);
    }
  })();
  for (const id of ["ra-campo", "ra-modalidad"]) {
    const n = document.getElementById(id);
    /* Cambiar un filtro con un resultado en pantalla lo dejaría contradiciendo
       al selector: se invalida, como hace el panel de cobertura con su perfil. */
    if (n) n.addEventListener("change", () => { const res = $("ra-resultado"); if (res) res.classList.add("hidden"); });
  }
  $("btn-rastrear").addEventListener("click", rastrearProceso);
  $("ra-consulta").addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); rastrearProceso(); } });

  // cerrar la pestaña a mitad no rompe nada, pero conviene avisarlo
  window.addEventListener("beforeunload", (e) => {
    if (!activo) return;
    e.preventDefault();
    e.returnValue = "";
  });

  /* ══════════════════════════════════════════════════════════════════════════
     TOKEN de los endpoints protegidos
     --------------------------------------------------------------------------
     La MISMA clave de sesión que usa la app (`historico_token`): quien ya pidió
     un detalle de competencia no tiene que volver a pegarlo aquí. Las lecturas
     y escrituras van dentro de try porque en modo restringido sessionStorage
     LANZA, y un panel que muere en silencio es exactamente lo que no queremos.
     ══════════════════════════════════════════════════════════════════════════ */
  const CLAVE_PERFIL = "dashboard_perfil";
  const leerPerfil = () => { try { return sessionStorage.getItem(CLAVE_PERFIL) || "helder"; } catch { return "helder"; } };
  const guardarPerfil = (v) => { try { sessionStorage.setItem(CLAVE_PERFIL, v); } catch { /* sesión restringida */ } };

  /* El formulario del token del panel murió con el token integrado: los
     bloques que dependían de él (la puesta en producción de la experiencia)
     están siempre visibles y los 401 se explican como lo que son. */

  /* ══════════════════════════════════════════════════════════════════════════
     DASHBOARD de procesos (/api/resumen)
     ══════════════════════════════════════════════════════════════════════════ */
  const REFRESCO_MS = 300000;              // el mismo TTL de la caché del endpoint
  const BARRAS = [
    ["obra_civil", "Obra civil", "bg-green-500"],
    ["consultoria", "Consultoría", "bg-amber-500"],
    ["infraestructura", "Infraestructura", "bg-blue-500"],
    ["verificar_objeto", "Verificar objeto", "bg-gray-400"],
  ];
  /* `fmtCOP` vive en la cabecera compartida */
  const pct = (n, total) => (total > 0 ? Math.round((n / total) * 100) : 0);

  let dashboardCargando = false;
  let ultimoResumen = null;
  let timerRefresco = null, timerCuenta = null, proximoRefresco = 0;
  /* LO QUE SE MUEVE SOLO SE PUEDE PARAR (5-sep-2026). `#d-meta` se reescribía
     CADA SEGUNDO con «Próxima actualización en 04:37» y no había ningún control
     para detenerlo: una pantalla que parpadea sola, sin interruptor. Ahora dice
     el HECHO —cuándo se actualizó y cada cuánto se actualiza sola—, se repinta
     cada 60 s y la persona puede pararla. La preferencia se guarda en ESTE
     navegador; el almacenamiento puede lanzar (modo restringido) y entonces la
     preferencia sencillamente no se recuerda: nunca se cae la pestaña por eso. */
  const CLAVE_REFRESCO_PAUSADO = "detekta-refresco-pausado";
  let refrescoPausado = (() => { try { return localStorage.getItem(CLAVE_REFRESCO_PAUSADO) === "1"; } catch { return false; } })();
  let ultimaCargaMs = 0;
  let pendientePorVisibilidad = false;

  function avisoDashboard(texto, tipo) {
    const p = $("d-aviso");
    // «Reintentar» solo con el error: repetir un aviso de éxito no significa nada
    const rein = $("d-reintentar");
    if (rein) rein.classList.toggle("hidden", !(texto && tipo === "error"));
    if (!texto) return p.classList.add("hidden");
    p.className = "mt-5 rounded-xl px-4 py-3 text-sm " + ({
      ok: "bg-green-50 text-green-800 ring-1 ring-inset ring-green-600/20",
      error: "bg-red-50 text-red-700 ring-1 ring-inset ring-red-600/20",
      aviso: "bg-amber-50 text-amber-800 ring-1 ring-inset ring-amber-600/20",
    }[tipo] || "bg-gray-50 text-gray-600 ring-1 ring-inset ring-gray-500/20");
    p.innerHTML = texto;
  }

  function cargandoDashboard(v) {
    dashboardCargando = v;
    $("btn-actualizar").disabled = v;
    $("d-spin").classList.toggle("hidden", !v);
    // el esqueleto solo se enseña la PRIMERA vez: en los refrescos automáticos
    // vaciar la pantalla para volver a pintar lo mismo es peor que no hacer nada
    $("d-skeleton").classList.toggle("hidden", !(v && !ultimoResumen));
  }

  async function cargarDashboard({ forzar = false } = {}) {
    if (vistaVisitanteActiva) return;   // lo que no se enseña no se pide (M-SEG-02)
    if (dashboardCargando) return;
    const token = leerToken();
    const perfil = $("d-perfil").value;
    cargandoDashboard(true);
    let r = null, cuerpo = null;
    try {
      // cache_bust solo cambia la URL (el servidor lo ignora): impide que el
      // navegador reutilice su propia respuesta al pulsar «Actualizar ahora»
      const bust = forzar ? `&cache_bust=${Date.now()}` : "";
      r = await fetch(`/api/perfil?op=resumen&perfil=${encodeURIComponent(perfil)}${bust}`,
        { headers: { "x-historico-token": token, Accept: "application/json" }, cache: "no-store" });
      cuerpo = await leerJson(r);
    } catch (e) {
      cargandoDashboard(false);
      return avisoDashboard(esc(mensajeDeFallo(e, "actualizar el tablero")), "error");
    }
    cargandoDashboard(false);

    if (r.status === 401) {
      return avisoDashboard(msg401(cuerpo), "error");
    }
    if (r.status === 503) {
      return avisoDashboard(`${esc((cuerpo && cuerpo.error) || "Servicio no disponible")}. Puede iniciar una carga en la sección de sincronización, arriba.`, "error");
    }
    if (!r.ok || !cuerpo || !cuerpo.ok) {
      return avisoDashboard(esc((cuerpo && cuerpo.error) || fraseDeFallo({ status: r.status })), "error");
    }
    avisoDashboard(cuerpo.mensaje ? esc(cuerpo.mensaje) : null, "aviso");
    ultimoResumen = cuerpo;
    pintarDashboard(cuerpo, r.headers.get("X-Cache") || (cuerpo.cache ? "HIT" : "MISS"));
    programarRefresco();
  }

  /* Baja de mercado. Sin índice construido la tarjeta NO se pinta: enseñar
     «0 %» cuando lo que pasa es que nadie ha reconstruido el índice sería
     convertir «no sé» en «el mercado no descuenta», que es justo el error que
     este proyecto ya pagó con `i.total_procesos`. */
  function pintarBaja(b) {
    const box = $("d-baja-box");
    const cifras = $("d-baja-cifras");
    /* La caja se muestra SIEMPRE que haya panel: si se ocultara cuando no hay
       índice, el botón de reconstruir sería invisible justo cuando hace falta,
       que es el único momento en que sirve de algo. */
    box.classList.remove("hidden");
    if (!b || b.baja_mediana_global == null || !b.entidades_clasificadas) {
      cifras.classList.add("hidden");
      $("d-baja-actualizado").textContent = "sin construir";
      $("d-baja-meta").textContent =
        "El índice de baja no se ha construido todavía. Pulse «Reconstruir»: recorre el histórico ya "
        + "descargado y no vuelve a pedir nada a SECOP II.";
      return;
    }
    cifras.classList.remove("hidden");
    $("d-baja-actualizado").textContent = b.construido
      ? `actualizado ${new Date(b.construido).toLocaleString("es-CO")}`
      : "";
    $("d-baja-global").textContent = `${fmt1.format(b.baja_mediana_global)} %`;
    $("d-baja-rango").textContent = b.baja_p25_global != null && b.baja_p75_global != null
      ? `p25 ${fmt1.format(b.baja_p25_global)} % · p75 ${fmt1.format(b.baja_p75_global)} %`
      : "";
    $("d-baja-meta").textContent =
      `${fmt.format(b.entidades_clasificadas)} entidades con ≥ ${b.min_procesos} procesos · ${b.procesos_analizados != null ? fmt.format(b.procesos_analizados) : "—"} adjudicaciones analizadas`;
    const linea = (r) => {
      const li = document.createElement("li");
      li.className = "flex items-baseline justify-between gap-2";
      const n = document.createElement("span");
      n.className = "truncate text-gray-700";
      n.textContent = r.entidad;                       // textContent: nunca HTML de un dato
      n.title = `${r.entidad} · ${r.procesos} procesos`;
      const v = document.createElement("span");
      v.className = "shrink-0 tabular-nums font-medium";
      v.textContent = `${fmt1.format(r.baja_mediana)} %`;
      li.append(n, v);
      return li;
    };
    for (const [id, filas] of [["d-baja-mas", b.mas_descuentan], ["d-baja-menos", b.menos_descuentan]]) {
      const ul = $(id);
      ul.textContent = "";
      for (const r of filas || []) ul.appendChild(linea(r));
    }
  }

  /* Reconstrucción manual del índice de baja. Recorre el histórico entero, así
     que puede no terminar en una sola invocación: `done:false` NO es un error,
     es «sigue en marcha», y hay que decirlo con esas palabras — un botón que
     dijera «falló» cuando en realidad va por la mitad haría que el dueño lo
     pulsara una y otra vez. */
  async function reconstruirBaja() {
    const btn = $("d-baja-reconstruir");
    const msg = $("d-baja-msg");
    const token = leerToken();
    const decir = (texto, clases) => {
      msg.textContent = texto;
      msg.className = `mt-2 rounded-lg px-3 py-2 text-xs ${clases}`;
      msg.classList.remove("hidden");
    };
    btn.disabled = true;
    decir("Reconstruyendo sobre el histórico ya descargado…", "bg-gray-50 text-gray-600");
    try {
      const r = await fetch("/api/procesos?op=baja&reconstruir=true",
        { headers: { "x-historico-token": token, Accept: "application/json" }, cache: "no-store" });
      const c = await leerJson(r);
      if (!r.ok || !c.ok) {
        decir(r.status === 401 ? msg401(c) : (c.error || fraseDeFallo({ status: r.status })), "bg-red-50 text-red-700");
      } else if (c.reconstruido && c.reconstruido.enCurso) {
        decir("Ya hay una reconstrucción en curso: espere a que termine.", "bg-amber-50 text-amber-800");
      } else if (c.reconstruido && c.reconstruido.done === false) {
        decir("Reconstrucción a medias (presupuesto agotado). Vuelva a pulsar para continuar: "
          + "el avance queda guardado.", "bg-amber-50 text-amber-800");
      } else {
        const m = c.reconstruido || {};
        decir(`Listo: ${m.procesos_analizados != null ? fmt.format(m.procesos_analizados) : "—"} adjudicaciones · `
          + `${m.entidades_clasificadas != null ? fmt.format(m.entidades_clasificadas) : "—"} entidades clasificadas.`, "bg-green-50 text-green-800");
        cargarDashboard({ forzar: true });   // los números del panel acaban de cambiar
      }
    } catch (e) {
      decir(mensajeDeFallo(e, "rehacer el cálculo"), "bg-red-50 text-red-700");
    } finally {
      btn.disabled = false;
    }
  }

  /* ══════ LA CONCLUSIÓN DEL GRÁFICO, EN UNA FRASE (5-sep-2026) ══════
     Los dos gráficos del tablero se titulaban con la PREGUNTA («Cuándo hay que
     entregar la oferta», «Contra cuánta gente compite») y dejaban la respuesta
     dentro de las barras: había que contarlas. Ahora, debajo del título, va lo
     que el gráfico DEMUESTRA, con su base declarada.

     Tres cuidados:
     · la frase sale de las MISMAS cubetas que se dibujan (se llama, no se
       recalcula): dos cuentas «iguales hoy» divergen a la primera corrección;
     · la base NO es la del héroe («N cierran esta semana» cuenta sobre las
       viables) ni la de las visibles: es la suma de las cubetas, que aquí son
       las que tienen fecha de cierre publicada, y se dice con esas palabras;
     · sin cubetas no hay frase — jamás un «0 de 0». */
  const parrafoConclusion = (frase) => (frase
    ? `<p class="mb-1 text-xs" style="color: var(--text-secondary);">${esc(frase)}</p>` : "");
  const sumaCubetas = (cubetas, claves) => (cubetas || [])
    .filter((x) => !claves || claves.includes(x.clave))
    .reduce((a, x) => a + (Number.isFinite(x.n) ? x.n : 0), 0);
  /* LA FRASE DICE LO QUE LAS CUBETAS CUENTAN (corregido el 5-sep-2026). Decía
     «de las N con fecha de cierre publicada»: los procesos YA CERRADOS también
     la publican y viven en OTRA cubeta (`ya_cerro`), fuera de estas cuatro; la
     base es «las que todavía no han cerrado». Y decía «cierran este mes»
     sumando dos ventanas RODANTES (7 y 14 días) con una tercera topada por el
     fin de mes del CALENDARIO (lib/handlers/perfil/resumen.js): cerca de fin de
     mes contaba como «de este mes» cierres del siguiente. Se dicen ahora las
     dos ventanas que están definidas sin ambigüedad —los próximos 7 días y los
     7 que les siguen—, que además son las únicas urgentes. */
  function fraseUrgencia(cubetas) {
    const conFecha = sumaCubetas(cubetas);
    if (!conFecha) return "";
    const semana = sumaCubetas(cubetas, ["esta_semana"]);
    const dosSemanas = sumaCubetas(cubetas, ["dos_semanas"]);
    const base = `de las ${fmt.format(conFecha)} que todavía no han cerrado`;
    return (semana
      ? `${fmt.format(semana)} ${base} cierra${semana === 1 ? "" : "n"} en los próximos 7 días`
      : `Ninguna ${base} cierra en los próximos 7 días`)
      + (dosSemanas ? `; otras ${fmt.format(dosSemanas)}, en los 7 siguientes` : "") + ".";
  }
  function fraseCompetencia(cubetas) {
    const total = sumaCubetas(cubetas);
    if (!total) return "";
    const poca = sumaCubetas(cubetas, ["baja"]);
    const alta = sumaCubetas(cubetas, ["alta"]);
    const sin = sumaCubetas(cubetas, ["sin_dato"]);
    return (poca
      ? `En ${fmt.format(poca)} de las ${fmt.format(total)} compite poca gente`
      : `En ninguna de las ${fmt.format(total)} compite poca gente`)
      + (alta ? `; ${fmt.format(alta)} están muy peleadas` : "")
      + (sin ? `; de ${fmt.format(sin)} no hay histórico` : "") + ".";
  }

  function pintarDashboard(c, cache) {
    const t = c.totales || {};
    const per = t.por_pertinencia || {};
    const total = t.visibles || 0;
    $("d-contenido").classList.remove("hidden");

    pintarBaja(c.baja_mercado);

    $("d-visibles").textContent = fmt.format(total);
    $("d-obra").textContent = fmt.format(per.obra_civil || 0);
    $("d-obra-pct").textContent = `${pct(per.obra_civil || 0, total)} % del total`;
    $("d-consultoria").textContent = fmt.format(per.consultoria || 0);
    $("d-consultoria-pct").textContent = `${pct(per.consultoria || 0, total)} % del total`;
    /* ESTA CIFRA NO ES LA DEL PULSO, Y SE DICE (5-sep-2026): el pulso de arriba
       cuenta lo que cierra esta semana entre las licitaciones a las que usted
       PUEDE presentarse; `por_urgencia` cuenta sobre TODAS las visibles. Dos
       bases, dos números; el rótulo del tile ya no repite la frase del pulso y
       la nota declara de qué conjunto habla. Sin total conocido no se inventa
       una N: se dice el conjunto en palabras. */
    $("d-semana").textContent = fmt.format((t.por_urgencia || {}).cierra_esta_semana || 0);
    $("d-semana-base").textContent = total ? `de las ${fmt.format(total)} visibles` : "de todas las visibles";

    /* barras: divs con width en %, sin librerías */
    /* PARTE-TODO EN UNA SOLA BARRA, no cuatro filas: la pregunta es «de qué se
       compone mi lista», y cuatro barras sueltas obligan a sumar de cabeza. Es
       el único gráfico del tablero con paleta CATEGÓRICA —aquí las series SON el
       sujeto—, con leyenda siempre y etiquetas directas (la paleta clara avisa
       de contraste bajo 3:1, así que no son opcionales). */
    $("d-barras").innerHTML = window.Pulso
      ? window.Pulso.apilada(BARRAS.map(([clave, etiqueta]) => ({ etiqueta, n: per[clave] || 0 })))
      : "";

    /* CUÁNDO HAY QUE ENTREGAR · magnitud sobre una escala ORDENADA. El dato ya
       venía en `por_urgencia` y no se pintaba en ninguna pantalla. `ya_cerro` y
       `sin_fecha_cierre` se dejan FUERA del gráfico y se dicen aparte: no son
       ventanas de entrega y meterlos deformaría la escala de las que sí lo son. */
    const urg = c.totales.por_urgencia || {};
    const cubetasUrg = [
      { clave: "esta_semana", id: "7d", etiqueta: "Cierran esta semana", corto: "esta semana", n: urg.cierra_esta_semana || 0 },
      { clave: "dos_semanas", id: "15d", etiqueta: "Cierran en dos semanas", corto: "2 semanas", n: urg.cierra_proxima_semana || 0 },
      { clave: "este_mes", id: "", etiqueta: "Cierran este mes", corto: "este mes", n: urg.cierra_este_mes || 0 },
      { clave: "mas_adelante", id: "", etiqueta: "Más adelante", corto: "+ 1 mes", n: urg.mas_adelante || 0 },
    ];
    const sinVentana = (urg.sin_fecha_cierre || 0) + (urg.ya_cerro || 0);
    $("d-urgencia").innerHTML = parrafoConclusion(fraseUrgencia(cubetasUrg))
      + (window.Pulso
        ? window.Pulso.columnas(cubetasUrg, { filtroDe: (x) => (x.id ? `cierre=${x.id}` : null) })
        : "")
      + `<p class="mt-1 text-[11px]" style="color: var(--text-secondary);">Sobre ${total ? `las ${fmt.format(total)} licitaciones visibles` : "todas las licitaciones visibles"}, no solo las que cumplen sus requisitos.${sinVentana > 0 ? ` ${fmt.format(sinVentana)} sin fecha de cierre publicada o ya cerradas.` : ""}</p>`;

    /* CONTRA CUÁNTA GENTE COMPITE · la tesis del producto, que tampoco se
       pintaba. `sin_dato` se CONSERVA como su propio segmento: no saber cuánta
       gente compite no es lo mismo que saber que compite poca, y esconderlo
       inflaría la parte buena. */
    const comp = c.totales.por_nivel_competencia_entidad || {};
    /* Las cubetas se declaran UNA vez y las leen las dos cosas que hablan de
       ellas: el gráfico y la frase de arriba. Dos listas «iguales hoy»
       divergen a la primera corrección y la frase dejaría de sumar lo que el
       gráfico dibuja. */
    const cubetasComp = [
      { clave: "baja", etiqueta: "Poca competencia", n: comp.baja || 0 },
      { clave: "media", etiqueta: "Competencia media", n: comp.media || 0 },
      { clave: "alta", etiqueta: "Muy peleadas", n: comp.alta || 0 },
      { clave: "sin_dato", etiqueta: "Sin histórico", n: comp.sin_dato || 0 },
    ];
    $("d-competencia-mix").innerHTML = parrafoConclusion(fraseCompetencia(cubetasComp))
      + (window.Pulso ? window.Pulso.apilada(cubetasComp) : "");

    /* LAS TRES TABLAS DE ABAJO SE RETIRARON (encargo del ingeniero,
       31-ago-2026): «Quién publica más» (#d-entidades) con su detalle en línea,
       las barras «Dónde están» (#d-departamentos) y el «Top 10 procesos más
       atractivos» (#d-destacados). Las dos primeras repetían, en la MISMA
       pestaña, los dos repartos que el pulso ya publica sobre el mismo corpus;
       la tercera era una lista densa que nunca se leía. Lo que hacía falta —a
       qué proceso le doy clic para presentarme— lo resuelve el calendario, que
       ordena por la fecha de cierre. `top_entidades`, `por_departamento` y
       `procesos_destacados` siguen viniendo en /api/resumen: son parte de su
       contrato y otros consumidores los usan; aquí, sencillamente, no se
       pintan. */
    pintarMeta(c, cache);
  }

  function pintarMeta(c, cache) {
    const gen = new Date(c.generado);
    const partes = [
      `Última actualización: ${isNaN(gen) ? "—" : gen.toLocaleString("es-CO", { hour12: false })}`,
      `Perfil: ${$("d-perfil").selectedOptions[0].text}`,
      `Caché: ${cache}`,
    ];
    if (c.corpus && c.corpus.sincronizado) partes.push(`Corpus sincronizado: ${String(c.corpus.sincronizado).slice(0, 16).replace("T", " ")}`);
    $("d-meta").dataset.base = partes.join(" · ");
    ultimaCargaMs = Date.now();   // la marca de CUÁNDO llegó a esta pantalla
    pintarCuentaAtras();
  }

  /* El HECHO, no la cuenta atrás: cuánto hace que se actualizó y cada cuánto se
     actualiza sola. Sin redondear a cero — menos de un minuto es «hace un
     momento», no «hace 0 min»— y sin marca todavía no se inventa ninguna. */
  function fraseRefresco(pausado, desdeMs, ahoraMs) {
    const minutos = desdeMs ? Math.floor((ahoraMs - desdeMs) / 60000) : null;
    const cuando = desdeMs ? (minutos < 1 ? "Actualizado hace un momento" : `Actualizado hace ${minutos} min`) : "";
    const modo = pausado ? "la actualización automática está detenida" : "se actualiza solo cada 5 min";
    return cuando ? `${cuando} · ${modo}` : modo.charAt(0).toUpperCase() + modo.slice(1);
  }
  function pintarCuentaAtras() {
    const el = $("d-meta"); if (!el) return;
    const base = el.dataset.base || "";
    const frase = fraseRefresco(refrescoPausado, ultimaCargaMs, Date.now());
    el.textContent = base ? `${base} · ${frase}` : frase;
    const b = $("d-pausar");
    if (b) b.textContent = refrescoPausado ? "Volver a actualizar" : "Dejar de actualizar";
  }

  /* Refresco automático cada 5 min SOLO con la pestaña visible: refrescar en
     segundo plano gasta invocaciones de Vercel para que nadie lo mire. Si la
     pestaña estaba oculta cuando tocaba, se refresca al volver a ella. Y si la
     persona lo detuvo, no se programa NADA: ni el refresco ni el repintado. */
  function programarRefresco() {
    clearTimeout(timerRefresco);
    clearInterval(timerCuenta);
    timerRefresco = null; timerCuenta = null;
    if (refrescoPausado) { proximoRefresco = 0; pintarCuentaAtras(); return; }
    proximoRefresco = Date.now() + REFRESCO_MS;
    pintarCuentaAtras();
    timerCuenta = setInterval(pintarCuentaAtras, 60000);
    timerRefresco = setTimeout(() => {
      if (document.visibilityState === "visible") cargarDashboard();
      else pendientePorVisibilidad = true; // se hará al volver a la pestaña
    }, REFRESCO_MS);
  }
  if ($("d-pausar")) {
    $("d-pausar").addEventListener("click", () => {
      refrescoPausado = !refrescoPausado;
      try { localStorage.setItem(CLAVE_REFRESCO_PAUSADO, refrescoPausado ? "1" : "0"); } catch { /* preferencia no recordada */ }
      // ninguna pulsación sin respuesta visible: se reprograma Y se repinta el texto
      programarRefresco();
    });
  }
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState !== "visible") return;
    if (pendientePorVisibilidad || (proximoRefresco && Date.now() > proximoRefresco)) {
      pendientePorVisibilidad = false;
      cargarDashboard();
    }
  });

  $("btn-actualizar").addEventListener("click", () => cargarDashboard({ forzar: true }));
  if ($("d-reintentar")) $("d-reintentar").addEventListener("click", () => cargarDashboard({ forzar: true }));
  $("d-baja-reconstruir").addEventListener("click", reconstruirBaja);
  $("d-perfil").addEventListener("change", () => {
    guardarPerfil($("d-perfil").value);
    ultimoResumen = null;   // otro perfil: sí conviene el esqueleto
    cargarDashboard();
  });

  /* EL BOTÓN «Mi precio» DE LA TABLA DE DESTACADOS SE FUE CON ELLA
     (31-ago-2026), y con él su badge «APU listo» y el listado que lo alimentaba
     (`cargarApuListos` / `celdaApuProceso`, que no tenían ningún otro llamante:
     medido antes de borrarlos). La entrada a Precios por proceso NO se perdió —
     vive en cada tarjeta del listado y en la ficha ampliada, que es donde el
     ingeniero decide—; lo que desaparece es la copia que solo servía a diez
     filas de una tabla que ya no existe. */

  /* ══════════════════════════════════════════════════════════════════════════
     CARGA DE RUP (/api/admin/rup)
     ══════════════════════════════════════════════════════════════════════════ */
  let rupPendiente = null;
  const MAX_PREVIEW = 200000; // caracteres pintados en la vista previa

  function mensajeRup(texto, tipo) {
    const p = $("rup-json-mensaje");
    if (!texto) return p.classList.add("hidden");
    p.className = "mt-5 rounded-xl px-4 py-3 text-sm " + ({
      ok: "bg-green-50 text-green-800 ring-1 ring-inset ring-green-600/20",
      error: "bg-red-50 text-red-700 ring-1 ring-inset ring-red-600/20",
      aviso: "bg-amber-50 text-amber-800 ring-1 ring-inset ring-amber-600/20",
    }[tipo] || "bg-gray-50 text-gray-600 ring-1 ring-inset ring-gray-500/20");
    p.textContent = texto;
  }
  function erroresRup(lista) {
    const ul = $("rup-errores");
    if (!lista || !lista.length) return ul.classList.add("hidden");
    ul.classList.remove("hidden");
    ul.innerHTML = lista.map((e) => (typeof e === "string"
      ? `<li>• ${esc(e)}</li>`
      : `<li>• <code class="font-mono">${esc(e.campo)}</code>: ${esc(e.error)}${e.valor_recibido == null ? "" : ` (recibido: <code class="font-mono">${esc(JSON.stringify(e.valor_recibido))}</code>)`}</li>`)).join("");
  }

  function limpiarRup() {
    rupPendiente = null;
    $("rup-json-archivo").value = "";
    $("rup-vista").classList.add("hidden");
    $("rup-preview").textContent = "";
    $("rup-resumen").innerHTML = "";
    mensajeRup(null);
    erroresRup(null);
  }

  /* Validación de conveniencia, previa al envío: NO decide nada (la de verdad
     corre en el servidor, que es quien guarda) — solo evita un viaje de ida y
     vuelta por un archivo obviamente incompleto. */
  function revisarEnCliente(datos) {
    const avisos = [];
    const perfiles = (datos && datos.perfiles) || {};
    const claves = Object.keys(perfiles);
    if (!claves.length) avisos.push("El archivo no trae ningún perfil bajo «perfiles».");
    for (const k of claves) {
      const p = perfiles[k] || {};
      if (!Array.isArray(p.unspsc) || !p.unspsc.length) avisos.push(`${k}: la lista «unspsc» está vacía o no es un arreglo.`);
      const ind = p.indicadores || {};
      for (const campo of ["liquidez", "patrimonio", "utilidad_operacional"]) {
        if (!(typeof ind[campo] === "number" && ind[campo] > 0)) avisos.push(`${k}: «indicadores.${campo}» debe ser un número positivo.`);
      }
    }
    return avisos;
  }

  function resumirRup(datos) {
    const perfiles = (datos && datos.perfiles) || {};
    return Object.entries(perfiles).map(([clave, p]) => {
      const n = Array.isArray(p.unspsc) ? p.unspsc.length : 0;
      const ind = p.indicadores || {};
      // K aproximada, SOLO para la vista previa (se enseña como «aprox.»): la
      // fórmula real, con SCE y los factores E/CT/CF de la Guía CCE, corre en
      // el servidor — lib/capacidad.js es la única implementación que decide.
      const co = ind.ingreso_operacional || (ind.utilidad_operacional || 0) * 16.7;
      const kAprox = Math.round(co * 2 / 100);
      return `<li><span class="font-medium">${esc(p.nombre || clave)}</span>: ${n} tipos de trabajo inscritos · `
        + `${p.profesionales || 0} profesional(es) · tope ${fmt.format(p.tope_smmlv || 0)} salarios mínimos · `
        + `K aprox. ${fmtCOP.format(kAprox)}</li>`;
    }).join("");
  }

  $("rup-json-archivo").addEventListener("change", () => {
    const f = $("rup-json-archivo").files && $("rup-json-archivo").files[0];
    mensajeRup(null); erroresRup(null);
    if (!f) return limpiarRup();
    const lector = new FileReader();
    lector.onerror = () => mensajeRup("No se pudo leer el archivo.", "error");
    lector.onload = () => {
      let datos = null;
      try { datos = JSON.parse(String(lector.result)); } catch (e) {
        rupPendiente = null;
        $("rup-vista").classList.add("hidden");
        return mensajeRup("El archivo no tiene el formato que la aplicación guarda. Vuelva a descargarlo y súbalo de nuevo.", "error");
      }
      rupPendiente = datos;
      $("rup-vista").classList.remove("hidden");
      // la vista previa se RECORTA (el archivo puede llegar a 5 MB y pintar
      // eso en un <pre> congela la pestaña); lo que se sube es el JSON entero
      const bonito = JSON.stringify(datos, null, 2);
      $("rup-preview").textContent = bonito.length > MAX_PREVIEW
        ? `${bonito.slice(0, MAX_PREVIEW)}\n\n… (vista previa recortada: ${fmt.format(bonito.length)} caracteres en total; se subirá el archivo completo)`
        : bonito;
      $("rup-resumen").innerHTML = resumirRup(datos);
      $("btn-rup-cargar").disabled = false;
      const avisos = revisarEnCliente(datos);
      if (avisos.length) {
        mensajeRup("Revise estos puntos antes de confirmar (la validación definitiva la hace el servidor):", "aviso");
        erroresRup(avisos);
      }
    };
    lector.readAsText(f);
  });

  $("btn-rup-cancelar").addEventListener("click", limpiarRup);

  $("btn-rup-cargar").addEventListener("click", async () => {
    if (!rupPendiente) return mensajeRup("Seleccione primero un archivo JSON.", "aviso");
    const token = leerToken();
    // deshabilitar durante el envío: un doble clic cargaría dos veces
    $("btn-rup-cargar").disabled = true;
    const etiqueta = $("btn-rup-cargar").textContent;
    $("btn-rup-cargar").textContent = "Cargando…";
    erroresRup(null);
    let r = null, cuerpo = null;
    try {
      r = await fetch("/api/admin?op=rup", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-historico-token": token },
        body: JSON.stringify(rupPendiente),
      });
      cuerpo = await leerJson(r);
    } catch (e) {
      $("btn-rup-cargar").disabled = false;
      $("btn-rup-cargar").textContent = etiqueta;
      return mensajeRup(mensajeDeFallo(e, "guardar su registro de proponente"), "error");
    }
    $("btn-rup-cargar").disabled = false;
    $("btn-rup-cargar").textContent = etiqueta;

    if (r.status === 401) {
      return mensajeRup(msg401(cuerpo), "error");
    }
    if (r.status === 400 && cuerpo && cuerpo.errores) {
      mensajeRup(cuerpo.error || "El archivo no pasó la validación: no se guardó nada.", "error");
      return erroresRup(cuerpo.errores);
    }
    if (!r.ok || !cuerpo || !cuerpo.ok) {
      return mensajeRup((cuerpo && cuerpo.error) || fraseDeFallo({ status: r.status }), "error");
    }
    mensajeRup(`RUP cargado correctamente (${cuerpo.perfiles_cargados.join(", ")}). Los cambios surten efecto inmediato.`, "ok");
    // las advertencias NO bloquean: se enseñan y ya está
    erroresRup(cuerpo.advertencias && cuerpo.advertencias.length ? cuerpo.advertencias : null);
    rupPendiente = null;
    $("rup-json-archivo").value = "";
    $("rup-vista").classList.add("hidden");
    await cargarRupActual();
    ultimoResumen = null;
    cargarDashboard({ forzar: true }); // los totales dependen del RUP recién cargado
    /* la auditoría de cobertura mide contra la whitelist que acaba de cambiar:
       lo pintado ya no corresponde y dejarlo a la vista sería enseñar como
       «hueco» un código recién inscrito */
    ultimaCobertura = null;
    $("c-contenido").classList.add("hidden");
    $("btn-cobertura-exportar").disabled = true;
    avisoCobertura("RUP cargado: vuelva a ejecutar la auditoría para ver los huecos del RUP nuevo.", "aviso");
  });

  async function cargarRupActual() {
    if (vistaVisitanteActiva) return;   // el JSON de los perfiles es del dueño (M-SEG-02)
    const caja = $("rup-actual");
    const token = leerToken();
    let r = null, cuerpo = null;
    try {
      r = await fetch("/api/admin?op=rup", { headers: { "x-historico-token": token, Accept: "application/json" }, cache: "no-store" });
      cuerpo = await leerJson(r);
    } catch {
      caja.textContent = "No se pudo consultar el RUP vigente.";
      return;
    }
    if (!r.ok || !cuerpo || !cuerpo.ok) {
      caja.textContent = (cuerpo && cuerpo.error) || fraseDeFallo({ status: r.status });
      return;
    }
    const resumen = Object.entries(cuerpo.resumen || {})
      .map(([k, v]) => `<li><span class="font-medium">${esc(v.nombre || k)}</span>: ${v.clases} tipos de trabajo inscritos (${v.familias} familias) · tope ${fmt.format(v.tope_smmlv || 0)} salarios mínimos</li>`)
      .join("");
    caja.innerHTML =
      `<p>Fuente: <span class="font-medium">${cuerpo.fuente === "redis" ? "archivo cargado (Redis)" : "valores por defecto del repositorio"}</span>`
      + (cuerpo.cargado ? ` · Cargado: ${esc(String(cuerpo.cargado).slice(0, 19).replace("T", " "))}` : "") + "</p>"
      + (cuerpo.fuente === "hardcoded"
        ? '<p class="mt-2 rounded-xl bg-amber-50 px-4 py-3 text-amber-800 ring-1 ring-inset ring-amber-600/20">Usando perfiles por defecto. Cargue su RUP para mayor precisión.</p>'
        : "")
      + (resumen ? `<ul class="mt-2 space-y-1">${resumen}</ul>` : "");
  }

  $("btn-rup-descargar").addEventListener("click", async () => {
    const token = leerToken();
    let cuerpo = null;
    try {
      const r = await fetch("/api/admin?op=rup", { headers: { "x-historico-token": token }, cache: "no-store" });
      cuerpo = await leerJson(r);
      if (!r.ok || !cuerpo || !cuerpo.ok) throw new Error(errorDelServidor(cuerpo) || `El servidor respondió ${r.status}.`);
    } catch (e) {
      return mensajeRup(mensajeDeFallo(e, "descargar su RUP"), "error");
    }
    // `descargarJSON` está declarado más abajo (declaración de función: se
    // hoistea), y es el MISMO camino de descarga que usan la experiencia y la
    // auditoría — tres copias del Blob + <a> temporal era una de más
    descargarJSON({ perfiles: cuerpo.perfiles }, `rup_${new Date().toISOString().slice(0, 10)}.json`);
    mensajeRup("Archivo descargado. Edítelo y vuelva a subirlo para actualizar el RUP.", "ok");
  });

  /* ══════════════════════════════════════════════════════════════════════════
     ELIMINAR RUP (DELETE /api/admin/rup?perfil=…, ago 2026)
     --------------------------------------------------------------------------
     Un RUP equivocado dejaba la app inservible: no había cómo quitarlo. El
     botón vive en la sección «Perfiles y RUP» y opera sobre el PERFIL ACTIVO
     del selector de la cabecera. Dos semánticas, y el modal dice cuál aplica:
       · perfil `rup_…` (subido en PDF): el perfil DEJA DE EXISTIR — se olvida
         el guardado del navegador y se vuelve a la landing;
       · perfil del dueño: su entrada del archivo cargado se elimina y el
         perfil VUELVE a los valores del repositorio (no desaparece: quedarse
         sin perfiles dejaría la app muda, regla de lib/perfiles).
     La confirmación es un modal propio: un borrado con `confirm()` del
     navegador no puede explicar qué se pierde y qué se conserva. */
  let eliminarEnVuelo = false;

  function mensajeEliminar(texto, tipo) {
    const p = $("eliminar-rup-mensaje");
    if (!texto) return p.classList.add("hidden");
    p.className = "mt-3 rounded-xl px-4 py-3 text-sm " + ({
      ok: "bg-green-50 text-green-800 ring-1 ring-inset ring-green-600/20",
      error: "bg-red-50 text-red-700 ring-1 ring-inset ring-red-600/20",
      aviso: "bg-amber-50 text-amber-800 ring-1 ring-inset ring-amber-600/20",
    }[tipo] || "bg-gray-50 text-gray-600 ring-1 ring-inset ring-gray-500/20");
    p.textContent = texto;
  }

  /* mismo contrato de visibilidad que los otros modales: clases + display en
     línea, porque `hidden` y `flex` compiten por la misma propiedad CSS */
  function abrirModalEliminar() {
    const perfil = $("f-perfil").value;
    const nombre = $("f-perfil").selectedOptions[0] ? $("f-perfil").selectedOptions[0].text : perfil;
    $("modal-eliminar-texto").textContent = ID_RUP_RE.test(perfil)
      ? "Perderá los filtros, los presupuestos guardados y los datos asociados a su RUP subido. "
        + "Esta acción no se puede deshacer: para volver a usar la aplicación tendrá que subir el PDF de nuevo."
      : `El perfil «${nombre}» volverá a los valores del repositorio (RUP corte 31/12/2025): se pierde el `
        + "archivo cargado y sus filtros derivados. Esta acción no se puede deshacer. Los presupuestos "
        + "guardados y la experiencia cargada no se tocan.";
    $("modal-eliminar").classList.remove("hidden");
    $("modal-eliminar").classList.add("flex");
    $("modal-eliminar").style.display = "flex";
  }
  function cerrarModalEliminar() {
    $("modal-eliminar").classList.add("hidden");
    $("modal-eliminar").classList.remove("flex");
    $("modal-eliminar").style.display = "none";
  }

  async function eliminarRupActivo() {
    if (eliminarEnVuelo) return;
    eliminarEnVuelo = true;
    const btn = $("btn-eliminar-confirmar");
    btn.disabled = true;                       // un doble clic borraría dos veces
    const etiqueta = btn.textContent;
    btn.textContent = "Eliminando…";
    const perfil = $("f-perfil").value;
    let r = null, cuerpo = null;
    try {
      r = await fetch(`/api/admin?op=rup&perfil=${encodeURIComponent(perfil)}`, {
        method: "DELETE",
        headers: { "x-historico-token": leerToken(), Accept: "application/json" },
      });
    } catch (e) {
      eliminarEnVuelo = false;
      btn.disabled = false;
      btn.textContent = etiqueta;
      cerrarModalEliminar();
      return mensajeEliminar(mensajeDeFallo(e, "eliminar el perfil"), "error");
    }
    /* el parseo va APARTE del fetch: el muro del edge responde HTML */
    cuerpo = await leerJson(r);
    eliminarEnVuelo = false;
    btn.disabled = false;
    btn.textContent = etiqueta;
    cerrarModalEliminar();

    if (r.status === 401) {
      return mensajeEliminar(msg401(cuerpo), "error");
    }
    if (!r.ok || !cuerpo || !cuerpo.ok) {
      return mensajeEliminar((cuerpo && cuerpo.error)
        || (cuerpo === null
          ? fraseDeFallo({ status: r.status })
          : fraseDeFallo({ status: r.status })), "error");
    }

    if (cuerpo.tipo === "dinamico" || cuerpo.sin_perfiles) {
      /* el perfil dejó de existir: se olvida el guardado, se limpia la URL
         (dejar ?perfil=rup_… provocaría un 404 de caducado al recargar) y la
         vista vuelve a la LANDING, que es donde se sube un RUP nuevo */
      olvidarPerfilRup();
      try { history.replaceState(null, "", location.pathname); } catch { /* entorno raro */ }
      $("app").classList.add("hidden");
      const ob = document.getElementById("onboarding");
      if (ob) ob.classList.remove("hidden");
      if (window.Portada) window.Portada.teaser();
      if (window.Pulso) window.Pulso.olvidar();
      try { window.scrollTo({ top: 0 }); } catch { /* sin scroll */ }
      return;
    }

    /* perfil del dueño: sigue existiendo con el respaldo del repositorio.
       Todo lo pintado salía del RUP que acaba de desaparecer: se recarga. */
    mensajeEliminar(cuerpo.nota || "RUP eliminado: el perfil volvió a los valores del repositorio.", "ok");
    await cargarRupActual();
    ultimoResumen = null;
    cargarDashboard({ forzar: true });
    invalidarCoberturaPintada("RUP eliminado: vuelva a ejecutar la auditoría contra el RUP vigente.");
    buscar();
  }

  $("btn-eliminar-rup").addEventListener("click", abrirModalEliminar);
  $("btn-eliminar-cancelar").addEventListener("click", cerrarModalEliminar);
  $("btn-eliminar-confirmar").addEventListener("click", eliminarRupActivo);
  $("modal-eliminar").addEventListener("click", (e) => {
    if (e.target === $("modal-eliminar")) cerrarModalEliminar();
  });

  /* ══════════════════════════════════════════════════════════════════════════
     EXPERIENCIA EJECUTADA (/api/admin/experiencia)
     --------------------------------------------------------------------------
     El RUP dice a qué PUEDE presentarse el dueño; esta lista dice en qué SABE
     trabajar. Se pega como JSON, se previsualiza y se confirma — el mismo
     ritual de la carga de RUP, porque es el mismo tipo de dato: una fuente de
     verdad que cambia lo que la app recomienda.
     ══════════════════════════════════════════════════════════════════════════ */
  let expPendiente = null;
  const EXP_PREVIEW = 5;   // contratos que se enseñan antes de confirmar

  function mensajeExp(texto, tipo) {
    const p = $("exp-json-mensaje");
    if (!texto) return p.classList.add("hidden");
    p.className = "mt-5 rounded-xl px-4 py-3 text-sm " + ({
      ok: "bg-green-50 text-green-800 ring-1 ring-inset ring-green-600/20",
      error: "bg-red-50 text-red-700 ring-1 ring-inset ring-red-600/20",
      aviso: "bg-amber-50 text-amber-800 ring-1 ring-inset ring-amber-600/20",
    }[tipo] || "bg-gray-50 text-gray-600 ring-1 ring-inset ring-gray-500/20");
    p.textContent = texto;
  }
  function erroresExp(lista) {
    const ul = $("exp-errores");
    if (!lista || !lista.length) return ul.classList.add("hidden");
    ul.classList.remove("hidden");
    ul.innerHTML = lista.map((e) => (typeof e === "string"
      ? `<li>• ${esc(e)}</li>`
      : `<li>• <code class="font-mono">${esc(e.campo)}</code>: ${esc(e.error)}</li>`)).join("");
  }
  function limpiarExp() {
    expPendiente = null;
    $("exp-vista").classList.add("hidden");
    $("exp-preview").innerHTML = "";
    mensajeExp(null);
    erroresExp(null);
  }

  /* Vista previa: los primeros 5 contratos, con lo que se va a guardar de cada
     uno. Es la última oportunidad de ver que el pegado salió bien. */
  $("btn-exp-validar").addEventListener("click", () => {
    const crudo = $("exp-json").value.trim();
    erroresExp(null);
    if (!crudo) return mensajeExp("Pegue el JSON con sus contratos ejecutados antes de cargar.", "aviso");
    let datos = null;
    try { datos = JSON.parse(crudo); } catch (e) {
      $("exp-vista").classList.add("hidden");
      expPendiente = null;
      return mensajeExp("El texto pegado no tiene el formato que la aplicación espera. Revise que sea la lista de contratos completa, entre corchetes.", "error");
    }
    const lista = datos && Array.isArray(datos.contratos) ? datos.contratos
      : (Array.isArray(datos) ? datos : null);
    if (!lista || !lista.length) {
      $("exp-vista").classList.add("hidden");
      expPendiente = null;
      return mensajeExp('El JSON debe traer un arreglo «contratos» con al menos un contrato.', "error");
    }
    expPendiente = { contratos: lista };
    $("exp-vista").classList.remove("hidden");
    $("exp-vista-nota").textContent = lista.length > EXP_PREVIEW
      ? `Primeros ${EXP_PREVIEW} de ${fmt.format(lista.length)} contratos.`
      : `${fmt.format(lista.length)} contrato(s).`;
    $("exp-preview").innerHTML = lista.slice(0, EXP_PREVIEW).map((c) => `<tr class="align-top">
        <td class="py-2 pr-2 whitespace-nowrap">${esc(c.no_contrato || "—")}</td>
        <td class="py-2 pr-2 text-gray-500">${esc(c.entidad || "—")}</td>
        <td class="py-2 pr-2">${esc(String(c.objeto || "").slice(0, 160))}</td>
        <td class="py-2 pr-2 text-right tabular-nums">${c.valor_cop == null ? "—" : fmtCOP.format(Number(c.valor_cop))}</td>
        <td class="py-2 text-right tabular-nums">${c.valor_smmlv == null ? "—" : esc(String(c.valor_smmlv))}</td>
      </tr>`).join("");
    mensajeExp(`Revise la vista previa y confirme para guardar ${fmt.format(lista.length)} contrato(s).`, "aviso");
  });

  $("btn-exp-cancelar").addEventListener("click", limpiarExp);

  $("btn-exp-confirmar").addEventListener("click", async () => {
    if (!expPendiente) return mensajeExp("Pegue y revise primero el JSON de contratos.", "aviso");
    const token = leerToken();
    // un doble clic cargaría dos veces
    $("btn-exp-confirmar").disabled = true;
    const etiqueta = $("btn-exp-confirmar").textContent;
    $("btn-exp-confirmar").textContent = "Cargando…";
    erroresExp(null);
    let r = null, cuerpo = null;
    try {
      r = await fetch("/api/admin?op=experiencia", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-historico-token": token },
        body: JSON.stringify(expPendiente),
      });
      cuerpo = await leerJson(r);
    } catch (e) {
      $("btn-exp-confirmar").disabled = false;
      $("btn-exp-confirmar").textContent = etiqueta;
      return mensajeExp(mensajeDeFallo(e, "guardar su experiencia"), "error");
    }
    $("btn-exp-confirmar").disabled = false;
    $("btn-exp-confirmar").textContent = etiqueta;

    if (r.status === 401) {
      return mensajeExp(msg401(cuerpo), "error");
    }
    if (r.status === 400 && cuerpo && cuerpo.errores) {
      mensajeExp(cuerpo.error || "El JSON no pasó la validación: no se guardó nada.", "error");
      return erroresExp(cuerpo.errores);
    }
    if (!r.ok || !cuerpo || !cuerpo.ok) {
      return mensajeExp((cuerpo && cuerpo.error) || fraseDeFallo({ status: r.status }), "error");
    }
    const ejemplos = (cuerpo.ejemplos_terminos || []).slice(0, 12).join(", ");
    mensajeExp(`Experiencia cargada: ${fmt.format(cuerpo.contratos_cargados)} contratos, `
      + `${fmt.format(cuerpo.terminos_extraidos)} términos extraídos`
      + (ejemplos ? ` (${ejemplos}…). ` : ". ")
      + "Ejecute la auditoría de cobertura para ver qué códigos le faltan basados en su experiencia real.", "ok");
    expPendiente = null;
    $("exp-vista").classList.add("hidden");
    $("exp-json").value = "";
    await cargarExperienciaActual();
    // la auditoría cacheada se calculó con el vocabulario anterior
    $("c-usar-experiencia").checked = true;
    avisoCobertura("Experiencia cargada. Ejecute la auditoría de cobertura para ver qué códigos le faltan "
      + "basados en su experiencia real.", "ok");
  });

  async function cargarExperienciaActual() {
    if (vistaVisitanteActiva) return;   // los contratos ejecutados son del dueño (M-SEG-02)
    const caja = $("exp-actual");
    const token = leerToken();
    let r = null, cuerpo = null;
    try {
      r = await fetch("/api/admin?op=experiencia", { headers: { "x-historico-token": token, Accept: "application/json" }, cache: "no-store" });
      cuerpo = await leerJson(r);
    } catch {
      caja.textContent = "No se pudo consultar la experiencia cargada.";
      return;
    }
    if (!r.ok || !cuerpo || !cuerpo.ok) {
      caja.textContent = (cuerpo && cuerpo.error) || fraseDeFallo({ status: r.status });
      return;
    }
    if (!cuerpo.cargada) {
      caja.innerHTML = '<p class="rounded-xl bg-amber-50 px-4 py-3 text-amber-800 ring-1 ring-inset ring-amber-600/20">'
        + "No hay experiencia cargada. Cargue sus contratos ejecutados para auditar la cobertura de sus RUP.</p>";
      // el toggle de la auditoría arranca apagado si no hay nada que usar
      $("c-usar-experiencia").checked = false;
      return;
    }
    $("c-usar-experiencia").checked = true;
    const ejemplos = (cuerpo.ejemplos_terminos || []).slice(0, 15).map((t) => `<code class="rounded bg-gray-100 px-1">${esc(t)}</code>`).join(" ");
    caja.innerHTML =
      `<p><span class="font-medium">${fmt.format(cuerpo.contratos_cargados)} contratos</span> · `
      + `${fmt.format(cuerpo.terminos_extraidos)} términos del oficio`
      + (cuerpo.cargado ? ` · Cargado: ${esc(String(cuerpo.cargado).slice(0, 19).replace("T", " "))}` : "") + "</p>"
      + (ejemplos ? `<p class="mt-2 text-xs leading-6 text-gray-500">${ejemplos}</p>` : "");
  }

  /* ══════════════════════════════════════════════════════════════════════════
     PUESTA EN PRODUCCIÓN SIN TERMINAL
     --------------------------------------------------------------------------
     El dueño no tiene terminal: `cargar_experiencia.sh` no le sirve. Estos son
     sus tres pasos con clics, y ninguno reimplementa nada:

       1. POST /api/admin/experiencia?origen=repositorio — el MISMO endpoint de
          la carga manual, que lee los contratos del archivo del repositorio en
          vez del cuerpo. No hay una segunda ruta que pueda divergir.
       2. `ejecutarAuditoria()`, la que ya usa el botón de la sección de
          cobertura, con el selector puesto en «genesis».
       3. `iniciarFull()`, el arranque encadenado de la sección de
          sincronización. Se REUTILIZA para que la invariante «1.ª tanda full,
          siguientes auto» no tenga dos copias.

     Todo se narra en la bitácora del panel, que es donde el dueño ya mira el
     avance de la sincronización. */
  let cadenaCorriendo = false;

  function botonesProduccion(bloqueados) {
    for (const id of ["btn-exp-cadena", "btn-exp-repo", "btn-exp-cobertura", "btn-exp-full"]) {
      if ($(id)) $(id).disabled = bloqueados;
    }
  }

  /* Paso 1 · los contratos del repositorio. Devuelve true solo si se guardaron:
     la cadena no puede seguir anunciando pasos sobre una carga que falló. */
  async function cargarExperienciaDelRepositorio() {
    const token = leerToken();
    bitacora("▶ 1/3 cargando experiencia de Génesis desde el repositorio…");
    erroresExp(null);
    let r = null, cuerpo = null;
    try {
      r = await fetch("/api/admin?op=experiencia&origen=repositorio", {
        method: "POST",
        headers: { "x-historico-token": token, Accept: "application/json" },
      });
    } catch (e) {
      bitacora("✘ 1/3 sin conexión con el servidor");
      mensajeExp(mensajeDeFallo(e, "cargar la experiencia del repositorio"), "error");
      return false;
    }
    /* El parseo va APARTE del fetch: el muro del edge (Vercel Password
       Protection) responde HTML con 401/403, así que `r.json()` LANZA. Con las
       dos cosas en el mismo `try`, ese muro se diagnosticaba como «sin
       conexión» — y la respuesta es justo la contraria: hay conexión y hay que
       iniciar sesión. Es el mismo tratamiento que ya da el encadenado de la
       sincronización unas líneas más arriba. */
    cuerpo = await leerJson(r);
    /* `leerJson` NUNCA devuelve algo falsy —siempre da un objeto—, así que el
       guardián de antes (`!cuerpo`) quedó muerto al convertir este sitio y el
       muro del edge caía al mensaje del token. La señal correcta es `sinJson`,
       que es justo lo que marca cuando el cuerpo no era JSON. */
    if (cuerpo.sinJson && (r.status === 401 || r.status === 403)) {
      bitacora(`✘ 1/3 ${fraseDeFallo({ status: r.status })}`);
      mensajeExp(fraseDeFallo({ status: r.status }), "error");
      return false;
    }
    if (r.status === 401) {
      bitacora("✘ 1/3 el despliegue rechazó el token integrado");
      mensajeExp(msg401(cuerpo), "error");
      return false;
    }
    if (r.status === 400 && cuerpo && cuerpo.errores) {
      bitacora(`✘ 1/3 el archivo del repositorio no pasa la validación (${cuerpo.errores.length} errores)`);
      mensajeExp(cuerpo.nota || cuerpo.error || "El archivo del repositorio no pasó la validación.", "error");
      erroresExp(cuerpo.errores);
      return false;
    }
    if (!r.ok || !cuerpo || !cuerpo.ok) {
      bitacora(`✘ 1/3 ${fraseDeFallo({ status: r.status })}`);
      mensajeExp((cuerpo && cuerpo.error) || fraseDeFallo({ status: r.status }), "error");
      return false;
    }
    /* Los conteos se pintan como VIENEN. Un `|| 0` aquí convertiría un «no sé»
       del servidor en un cero creíble — el defecto que este panel ya pagó con
       «en 0 procesos». */
    const n = cuerpo.contratos_cargados;
    const t = cuerpo.terminos_extraidos;
    bitacora(`✔ 1/3 experiencia cargada · ${fmt.format(n)} contratos · ${fmt.format(t)} términos`
      + (cuerpo.archivo ? ` · ${cuerpo.archivo}` : ""));
    const ejemplos = (cuerpo.ejemplos_terminos || []).slice(0, 12).join(", ");
    mensajeExp(`Experiencia cargada desde el repositorio: ${fmt.format(n)} contratos, `
      + `${fmt.format(t)} términos extraídos${ejemplos ? ` (${ejemplos}…)` : ""}. `
      + "Ya puede auditar la cobertura del RUP.", "ok");
    await cargarExperienciaActual();
    /* Lo que hubiera pintado la auditoría se midió contra el vocabulario
       ANTERIOR: dejarlo en pantalla al lado de «106 contratos cargados» sería
       una cifra vieja con aspecto de nueva. El servidor ya invalida su caché;
       esto invalida lo que se está mirando. */
    invalidarCoberturaPintada("Experiencia recargada: vuelva a ejecutar la auditoría para medirla contra ella.");
    return true;
  }

  /* Paso 2 · la auditoría, con el perfil puesto en Génesis. NO se reimplementa:
     se pone el selector y se llama a la misma función del botón de su sección,
     que es la que sabe pintar la tabla, los excluidos y los avisos. */
  async function auditarCoberturaGenesis() {
    /* La guarda de «ya hay una auditoría en vuelo» va ANTES de tocar el
       selector, y merece su propio mensaje. Si se comprueba después —dentro de
       `ejecutarAuditoria`, que sale por ahí devolviendo `false`— el selector ya
       quedó en «genesis» y, cuando responda la auditoría que estaba corriendo
       (la de OTRO perfil), `pintarCobertura` estampa SUS cifras bajo un rótulo
       que dice Génesis. La cadena se detiene igual, pero la pantalla queda
       mintiendo: es «la peor forma de equivocarse» que este mismo paso
       documenta, por la puerta de atrás. */
    if (coberturaCargando) {
      bitacora("✘ 2/3 ya hay una auditoría en curso — no se toca nada");
      mensajeExp("Ya hay una auditoría de cobertura en curso. Espere a que termine y reintente: "
        + "cambiar el perfil ahora dejaría sus cifras rotuladas como Génesis.", "aviso");
      return false;
    }
    bitacora("▶ 2/3 auditando cobertura del RUP de Génesis…");
    /* Fijar `.value` desde código NO dispara `change`, que es quien esconde lo
       pintado: sin esto, la auditoría de OTRO perfil se quedaría en pantalla
       bajo un selector que dice «Génesis». Y NO se persiste el perfil: la clave
       la comparte el DASHBOARD, y este paso no tiene por qué decidir con qué
       perfil se abre el panel la próxima vez. */
    $("c-perfil").value = "genesis";
    invalidarCoberturaPintada(null);
    const s = $("seccion-cobertura");
    if (s && s.scrollIntoView) s.scrollIntoView({ behavior: "smooth", block: "start" });
    /* El resultado se PROPAGA. `ejecutarAuditoria` puede fallar por token, por
       red o por el servidor, y anunciar «✔ 2/3» sobre una auditoría que no
       corrió —y seguir al paso 3— es exactamente lo que la cadena existe para
       evitar. */
    const ok = await ejecutarAuditoria();
    bitacora(ok
      ? "✔ 2/3 auditoría de cobertura ejecutada — el detalle está en su sección"
      : "✘ 2/3 la auditoría de cobertura no se pudo ejecutar");
    return ok;
  }

  /* Paso 3 · la full. Reutiliza el arranque encadenado de arriba, que es quien
     sabe que la 1.ª tanda va en `full` y las siguientes en `auto`. */
  function sincronizacionFull() {
    bitacora("▶ 3/3 lanzando la sincronización completa…");
    const arrancada = iniciarFull();
    if (!arrancada) {
      bitacora("• 3/3 ya había un encadenado en curso — se deja terminar");
      mensajeExp("Ya hay una sincronización en curso: se deja terminar en vez de reiniciarla desde enero.", "aviso");
      return false;
    }
    const s = $("seccion-sync");
    if (s && s.scrollIntoView) s.scrollIntoView({ behavior: "smooth", block: "start" });
    return true;
  }

  $("btn-exp-repo").addEventListener("click", async () => {
    if (cadenaCorriendo) return;
    botonesProduccion(true);
    try { await cargarExperienciaDelRepositorio(); } finally { botonesProduccion(false); }
  });
  $("btn-exp-cobertura").addEventListener("click", async () => {
    if (cadenaCorriendo) return;
    botonesProduccion(true);
    try { await auditarCoberturaGenesis(); } finally { botonesProduccion(false); }
  });
  $("btn-exp-full").addEventListener("click", () => {
    if (cadenaCorriendo) return;
    sincronizacionFull();
  });

  /* Los tres en orden. Se PARA en el primer paso que falle: encadenar una
     auditoría sobre una carga que no ocurrió daría un resultado creíble y
     equivocado, que es peor que no darlo. */
  $("btn-exp-cadena").addEventListener("click", async () => {
    if (cadenaCorriendo) return;
    cadenaCorriendo = true;
    botonesProduccion(true);
    bitacora("▶ puesta en producción: 3 pasos");
    try {
      if (!(await cargarExperienciaDelRepositorio())) {
        bitacora("■ cadena detenida en el paso 1");
        return;
      }
      if (!(await auditarCoberturaGenesis())) {
        bitacora("■ cadena detenida en el paso 2");
        return;
      }
      sincronizacionFull();
    } finally {
      cadenaCorriendo = false;
      botonesProduccion(false);
    }
  });

  $("btn-exp-descargar").addEventListener("click", async () => {
    const token = leerToken();
    let cuerpo = null;
    try {
      const r = await fetch("/api/admin?op=experiencia", { headers: { "x-historico-token": token }, cache: "no-store" });
      cuerpo = await leerJson(r);
      if (!r.ok || !cuerpo || !cuerpo.ok) throw new Error(errorDelServidor(cuerpo) || `El servidor respondió ${r.status}.`);
    } catch (e) {
      return mensajeExp(mensajeDeFallo(e, "descargar su experiencia"), "error");
    }
    if (!cuerpo.cargada) return mensajeExp("No hay experiencia cargada todavía: no hay nada que descargar.", "aviso");
    descargarJSON({ contratos: cuerpo.contratos }, `experiencia_${new Date().toISOString().slice(0, 10)}.json`);
    mensajeExp("Archivo descargado. Edítelo y vuelva a pegarlo para actualizar la experiencia.", "ok");
  });

  /* Descarga común (experiencia y auditoría): un Blob y un <a> temporal. */
  function descargarJSON(objeto, nombre) {
    const blob = new Blob([JSON.stringify(objeto, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = nombre;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  /* ══════════════════════════════════════════════════════════════════════════
     AUDITORÍA DE COBERTURA RUP (/api/admin/cobertura-rup)
     --------------------------------------------------------------------------
     Recorre el histórico entero, así que NO se dispara sola: se ejecuta a
     petición y el servidor cachea el resultado una hora (la caché se invalida
     al cargar un RUP o una experiencia nuevos).
     ══════════════════════════════════════════════════════════════════════════ */
  const CRITICIDAD_UI = {
    "CRÍTICO": { emoji: "●", clases: "bg-red-50 text-red-700" },
    ALTO: { emoji: "●", clases: "bg-orange-50 text-orange-800" },
    MEDIO: { emoji: "●", clases: "bg-amber-50 text-amber-800" },
    BAJO: { emoji: "●", clases: "bg-gray-100 text-gray-600" },
  };
  let coberturaCargando = false;
  let ultimaCobertura = null;

  function avisoCobertura(texto, tipo) {
    const p = $("c-aviso");
    if (!texto) return p.classList.add("hidden");
    p.className = "mt-5 rounded-xl px-4 py-3 text-sm " + ({
      ok: "bg-green-50 text-green-800 ring-1 ring-inset ring-green-600/20",
      error: "bg-red-50 text-red-700 ring-1 ring-inset ring-red-600/20",
      aviso: "bg-amber-50 text-amber-800 ring-1 ring-inset ring-amber-600/20",
    }[tipo] || "bg-gray-50 text-gray-600 ring-1 ring-inset ring-gray-500/20");
    p.innerHTML = texto;
  }

  function cargandoCobertura(v) {
    coberturaCargando = v;
    $("btn-cobertura").disabled = v;
    $("c-spin").classList.toggle("hidden", !v);
    $("c-skeleton").classList.toggle("hidden", !v);
  }

  /* Devuelve `true` solo si la auditoría se pintó. La cadena de la puesta en
     producción lo necesita: sin un booleano, quien la encadena escribe «✔» y
     sigue al paso siguiente sobre una auditoría que nunca corrió. */
  async function ejecutarAuditoria() {
    if (coberturaCargando) return false;
    const token = leerToken();
    const perfil = $("c-perfil").value;
    const usar = $("c-usar-experiencia").checked ? "true" : "false";
    avisoCobertura(null);
    cargandoCobertura(true);
    let r = null, cuerpo = null;
    try {
      r = await fetch(`/api/admin?op=cobertura&perfil=${encodeURIComponent(perfil)}&usar_experiencia=${usar}`,
        { headers: { "x-historico-token": token, Accept: "application/json" }, cache: "no-store" });
      cuerpo = await leerJson(r);
    } catch (e) {
      cargandoCobertura(false);
      avisoCobertura(esc(mensajeDeFallo(e, "consultar a cuánto llega su experiencia")), "error");
      return false;
    }
    cargandoCobertura(false);

    if (r.status === 401) {
      avisoCobertura(msg401(cuerpo), "error");
      return false;
    }
    if (!r.ok || !cuerpo || !cuerpo.ok) {
      avisoCobertura(esc((cuerpo && cuerpo.error) || fraseDeFallo({ status: r.status })), "error");
      return false;
    }
    if (cuerpo.mensaje) avisoCobertura(esc(cuerpo.mensaje), "aviso");
    ultimaCobertura = cuerpo;
    $("btn-cobertura-exportar").disabled = false;
    pintarCobertura(cuerpo);
    return true;
  }

  function pintarCobertura(c) {
    const res = c.resumen || {};
    $("c-contenido").classList.remove("hidden");
    $("c-criticos").textContent = fmt.format(res.criticos);
    $("c-altos").textContent = fmt.format(res.altos);
    $("c-medios").textContent = fmt.format(res.medios);
    $("c-bajos").textContent = fmt.format(res.bajos);

    /* la alerta solo aparece si de verdad hay críticos: una alerta permanente
       deja de leerse a la semana */
    const alerta = $("c-alerta");
    alerta.classList.toggle("hidden", !res.criticos);
    if (res.criticos) {
      alerta.textContent = c.experiencia_utilizada
        ? `Detectados ${res.criticos} código(s) críticos que coinciden con su experiencia. `
          + "Debería inscribirlos en su próxima renovación de RUP."
        : `Detectados ${res.criticos} código(s) críticos de obra. Cargue su experiencia ejecutada para `
          + "priorizarlos por su nicho real.";
    }

    const relevantes = Number(res.procesos_relevantes), analizados = Number(res.procesos_analizados);
    const porcentaje = analizados > 0 ? Math.round((relevantes / analizados) * 100) : 0;
    $("c-cobertura-nota").textContent = c.experiencia_utilizada
      ? `Analizados ${fmt.format(relevantes)} procesos relevantes de ${fmt.format(analizados)} adjudicados `
        + `(${porcentaje} % coinciden con su experiencia · ${fmt.format(c.contratos_experiencia)} contratos, `
        + `${fmt.format(c.terminos_experiencia)} términos).`
      : `Analizados ${fmt.format(relevantes)} procesos de obra de ${fmt.format(analizados)} adjudicados. `
        + "Sin experiencia cargada, la similitud no se mide.";

    const filas = c.faltantes || [];
    $("c-faltantes").innerHTML = filas.length ? filas.map((f, i) => {
      const d = CRITICIDAD_UI[f.criticidad] || CRITICIDAD_UI.BAJO;
      const sim = f.score_similitud_promedio == null ? "—" : `${Math.round(f.score_similitud_promedio * 100)} %`;
      const media = (f.cuantia && f.cuantia.promedio != null) ? fmtCOP.format(f.cuantia.promedio) : "—";
      return `<tr class="fila-cobertura cursor-pointer align-top hover:bg-gray-50" data-idx="${i}">
          <td class="py-2 pr-2 font-mono">${esc(f.codigo)}</td>
          <td class="py-2 pr-2"><span class="rounded-lg px-2 py-0.5 text-xs font-medium ${d.clases}">${d.emoji} ${esc(f.criticidad)}</span></td>
          <td class="py-2 pr-2 text-right tabular-nums">${fmt.format(f.procesos_adjudicados)}</td>
          <td class="py-2 pr-2 text-right tabular-nums">${c.experiencia_utilizada ? fmt.format(f.procesos_altamente_relevantes) : "—"}</td>
          <td class="py-2 pr-2 text-right tabular-nums">${sim}</td>
          <td class="py-2 pr-2 text-right tabular-nums">${media}</td>
          <td class="py-2 text-gray-500">${esc(f.recomendacion || "")}</td>
        </tr>`;
    }).join("") : '<tr><td colspan="7" class="py-3 text-gray-400">Ningún código faltante con los criterios actuales.</td></tr>';

    /* lo excluido se enseña, nunca desaparece en silencio: es la mitad de la
       explicación de por qué la lista de arriba es corta */
    const noPert = c.excluidos_por_no_pertinentes || [];
    const bajaRel = c.excluidos_por_baja_relevancia || [];
    const bloque = (titulo, lista, texto) => (lista.length
      ? `<details class="mt-2"><summary class="cursor-pointer text-sm text-gray-500 hover:text-gray-700">${resumenSummary(titulo, lista.length, "")}</summary>`
        + `<ul class="mt-2 space-y-1 text-xs text-gray-500">`
        + lista.map((e) => `<li>· <code class="font-mono">${esc(e.codigo)}</code> — ${fmt.format(e.procesos)} proceso(s): ${esc(texto(e))}</li>`).join("")
        + "</ul></details>"
      : "");
    $("c-excluidos").innerHTML =
      bloque("Excluidos por objeto no pertinente", noPert, (e) => e.motivo || "")
      + bloque("Excluidos por baja relevancia frente a su experiencia", bajaRel, (e) => e.motivo || "");

    const partes = [
      `Perfil: ${esc(c.perfil_nombre || c.perfil)}`,
      `Generado: ${String(c.generado || "").slice(0, 19).replace("T", " ")}`,
      `Caché: ${c.cache ? "HIT" : "MISS"}`,
      `${fmt.format(c.resumen.codigos_en_rup)} códigos inscritos`,
    ];
    if (c.truncado) partes.push(`Mostrando ${c.faltantes.length} de ${fmt.format(c.truncado.faltantes)} códigos`);
    $("c-meta").textContent = partes.join(" · ");
  }

  /* detalle expandible: ejemplos de objeto y entidades que más usan el código */
  $("c-faltantes").addEventListener("click", (e) => {
    const fila = e.target.closest(".fila-cobertura");
    if (!fila || !ultimaCobertura) return;
    const abierta = fila.nextElementSibling;
    if (abierta && abierta.classList.contains("detalle-cobertura")) return abierta.remove();
    const f = (ultimaCobertura.faltantes || [])[Number(fila.getAttribute("data-idx"))];
    if (!f) return;
    const ejemplos = (f.ejemplos_objetos || []).map((x) => `<li class="truncate">· ${esc(x.objeto)}`
      + (x.similitud == null ? "" : ` <span class="text-gray-400">(similitud ${Math.round(x.similitud * 100)} %)</span>`)
      + `</li>`).join("");
    const entidades = (f.entidades_top || []).map((x) => `<li>· ${esc(x.entidad)} — ${fmt.format(x.procesos)} proceso(s)</li>`).join("");
    const tr = document.createElement("tr");
    tr.className = "detalle-cobertura bg-gray-50";
    tr.innerHTML = `<td colspan="7" class="px-2 py-3 text-xs text-gray-500">
        <p class="font-medium text-gray-700">Segmento ${esc(f.segmento)} · familia ${esc(f.familia)}
          · cuantías ${f.cuantia.min == null ? "—" : fmtCOP.format(f.cuantia.min)} a ${f.cuantia.max == null ? "—" : fmtCOP.format(f.cuantia.max)}</p>
        ${ejemplos ? `<p class="mt-2 font-medium text-gray-600">Objetos de ejemplo</p><ul class="mt-1 space-y-0.5">${ejemplos}</ul>` : ""}
        ${entidades ? `<p class="mt-2 font-medium text-gray-600">Entidades que más lo usan</p><ul class="mt-1 space-y-0.5">${entidades}</ul>` : ""}
      </td>`;
    fila.after(tr);
  });

  $("btn-cobertura").addEventListener("click", ejecutarAuditoria);
  $("btn-cobertura-exportar").addEventListener("click", () => {
    if (!ultimaCobertura) return;
    descargarJSON(ultimaCobertura, `cobertura_rup_${ultimaCobertura.perfil}_${new Date().toISOString().slice(0, 10)}.json`);
  });
  /* Otro perfil, otra whitelist: lo pintado ya no corresponde. Va con NOMBRE
     porque fijar `c-perfil.value` desde código NO dispara `change`, y el paso 2
     de la puesta en producción hace justo eso: sin llamarla, la auditoría de
     OTRO perfil se quedaría pintada debajo de un selector que dice «Génesis». */
  function invalidarCoberturaPintada(motivo) {
    $("c-contenido").classList.add("hidden");
    ultimaCobertura = null;
    $("btn-cobertura-exportar").disabled = true;
    if (motivo) avisoCobertura(motivo, "aviso");
  }
  $("c-perfil").addEventListener("change", () => {
    invalidarCoberturaPintada("Perfil cambiado: ejecute la auditoría para este perfil.");
  });

  /* ══════════════════════════════════════════════════════════════════════════
     CATÁLOGO DE PRECIOS APU (/api/apu/catalogo · /api/admin/apu/cargar-catalogo)
     --------------------------------------------------------------------------
     CONSULTAR el catálogo es público y barato (dos comandos de Redis), así que
     el estado se pinta al arrancar el panel. CARGARLO escribe ~70 claves y va
     con token: solo cuando alguien pulsa el botón.
     ══════════════════════════════════════════════════════════════════════════ */
  let apuCargando = false;

  function mensajeApu(texto, tipo) {
    const p = $("apu-mensaje");
    if (!texto) return p.classList.add("hidden");
    p.className = "mt-5 rounded-xl px-4 py-3 text-sm " + ({
      ok: "bg-green-50 text-green-800 ring-1 ring-inset ring-green-600/20",
      error: "bg-red-50 text-red-700 ring-1 ring-inset ring-red-600/20",
      aviso: "bg-amber-50 text-amber-800 ring-1 ring-inset ring-amber-600/20",
    }[tipo] || "bg-gray-50 text-gray-600 ring-1 ring-inset ring-gray-500/20");
    p.innerHTML = texto;
  }

  /* EL REAJUSTE DEL DANE DECLARA SU ALCANCE (M-DGF-15, 6-sep-2026). La línea
     decía «ICOCIV Marzo 2026 · +4.7 % anual» como si describiera el catálogo
     entero, y el factor se aplicó UNA vez, en la semilla, y SOLO a los insumos
     recuperados (13 de 437; los usan 15 de 174 ítems): los 389 precios del
     contrato adjudicado en 2025 no llevan reajuste. Se dice el hecho con las
     cifras que viajan en `_meta.icociv` (medidas por la suite contra el
     catálogo, no escritas a mano). Si la meta cargada en el servidor es anterior
     a esos campos, no se inventa el alcance: se dice qué hacer. */
  function textoIcociv(ic, totalItems) {
    if (!ic) return "sin ajuste sectorial";
    const n = Number(ic.insumos_reajustados), m = Number(ic.items_con_insumo_reajustado);
    /* el porcentaje sale del FACTOR aplicado (única fuente): tras una captura del
       número índice la variación anual del boletín viaja null y el factor va de
       marzo de 2025 al mes capturado, así que aquí no se dice «anual» */
    const factor = Number(ic.factor_aplicado);
    const pct = Number.isFinite(factor) && factor > 0 ? ` (${factor >= 1 ? "+" : "−"}${nf2.format(Math.abs(factor - 1) * 100)} %)` : "";
    const boletin = String(ic.boletin || "").toLowerCase().replace(/^(\S+) (\d{4})$/, "$1 de $2");
    if (!Number.isFinite(n) || !Number.isFinite(m) || ic.insumos_reajustados === null || ic.items_con_insumo_reajustado === null) {
      return `Índice del DANE ${boletin}${pct}: alcance por confirmar, vuelva a cargar el catálogo`;
    }
    const items = Number.isFinite(Number(totalItems)) ? `${m} de los ${fmt.format(Number(totalItems))} ítems` : `${m} ítems`;
    return `${n} insumos recuperados llevados de marzo de 2025 a ${boletin} con el índice del DANE${pct}; los usan ${items}. Los demás precios son de un contrato adjudicado en 2025, sin reajuste.`;
  }

  function pintarApu(c) {
    /* los conteos salen del payload del catálogo, NUNCA con `|| 0`: un
       «undefined || 0» convierte «no sé» en «cero» y lo hace creíble — es
       exactamente el defecto del «en 0 procesos» que costó caro. Sin dato, «—». */
    const num = (v) => (Number.isFinite(Number(v)) ? fmt.format(Number(v)) : "—");
    const t = c.totales || {};
    $("apu-insumos").textContent = num(t.insumos);
    $("apu-items").textContent = num(t.items);
    $("apu-regiones").textContent = num(t.regiones);
    $("apu-base").textContent = c.base_precios || "—";
    $("apu-icociv").textContent = textoIcociv(c.icociv, t.items);

    const regiones = c.regiones || [];
    $("apu-detalle").classList.toggle("hidden", !regiones.length);
    $("apu-regiones-tabla").innerHTML = regiones.map((r) => `<tr>
        <td class="py-2 pr-2 font-medium">${esc(r.nombre)}</td>
        <td class="py-2 pr-2 text-gray-500">${esc(r.ciudad_cabecera || "—")}</td>
        <td class="py-2 pr-2 text-right tabular-nums">${r.factor_materiales}</td>
        <td class="py-2 pr-2 text-right tabular-nums">${r.factor_mano_obra}</td>
        <td class="py-2 pr-2 text-right tabular-nums">${r.factor_equipo}</td>
        <td class="py-2 pr-2 text-right tabular-nums">${r.factor_transporte}</td>
        <td class="py-2 text-right tabular-nums">${Math.round(Number(r.aiu_tipico) * 100)} %</td>
      </tr>`).join("");

    $("apu-meta").textContent = [
      `Versión ${esc(c.version_catalogo || "—")}`,
      `Cargado: ${String(c.cargado_el || "").slice(0, 19).replace("T", " ") || "—"}`,
      `Lectura: ${c.via || "—"}`,
    ].join(" · ");
  }

  async function cargarEstadoApu() {
    let r = null;
    try {
      r = await fetch("/api/apu?op=catalogo", { headers: { Accept: "application/json" }, cache: "no-store" });
    } catch {
      return mensajeApu("No se pudo consultar el catálogo APU (sin red).", "error");
    }
    const c = await leerJson(r);
    if (!r.ok || !c || !c.ok) {
      $("apu-detalle").classList.add("hidden");
      // el visitante no ve el botón (M-SEG-02): no se le manda a pulsarlo
      return mensajeApu((c && c.error ? esc(c.error) : "El catálogo APU no está cargado.")
        + (vistaVisitanteActiva ? " Lo carga quien administra el sitio." : " Pulse «Cargar catálogo APU» para poblarlo."), "aviso");
    }
    mensajeApu("");
    pintarApu(c);
  }

  async function cargarCatalogoApu() {
    if (apuCargando) return;
    /* el visitante no ve este botón (VISTA_VISITANTE.soloDueno), y aunque un
       script lo pulsara, la reescritura del catálogo compartido no sale de su
       navegador: la guarda va en la FUENTE, no en el botón (6-sep-2026, B4a-H1) */
    if (vistaVisitanteActiva) return mensajeApu("El catálogo lo carga quien administra el sitio.", "aviso");
    const token = leerToken();
    apuCargando = true;
    // doble clic: el botón se deshabilita durante el envío o se carga dos veces
    $("btn-apu-cargar").disabled = true;
    $("apu-spin").classList.remove("hidden");
    mensajeApu("Cargando el catálogo en Redis…", "info");

    let r = null;
    try {
      r = await fetch("/api/admin?op=cargar-catalogo&forzar=true", {
        method: "POST",
        headers: { "x-historico-token": token, Accept: "application/json" },
      });
    } catch {
      apuCargando = false;
      $("btn-apu-cargar").disabled = false;
      $("apu-spin").classList.add("hidden");
      return mensajeApu("No se pudo contactar con el servidor. Reintente.", "error");
    }
    const c = await leerJson(r);
    apuCargando = false;
    $("btn-apu-cargar").disabled = false;
    $("apu-spin").classList.add("hidden");

    if (r.status === 401) return mensajeApu(msg401(c), "error");
    if (!r.ok || !c || !c.ok) {
      const errores = (c && c.errores || []).slice(0, 6)
        .map((e) => `<li>· <code class="font-mono">${esc(e.campo)}</code>: ${esc(e.error)}</li>`).join("");
      return mensajeApu((c && c.error ? esc(c.error) : "No se pudo cargar el catálogo.")
        + (errores ? `<ul class="mt-2 space-y-1 text-xs">${errores}</ul>` : ""), "error");
    }

    mensajeApu(c.escrito
      ? `Catálogo cargado: ${fmt.format(c.insumos)} insumos, ${fmt.format(c.items)} ítems y `
        + `${fmt.format(c.regiones)} regiones en ${fmt.format(c.comandos_redis)} comandos de Redis. `
        + "Los precios son de referencia: cotice antes de presentar oferta."
      : esc(c.nota || "El catálogo ya estaba cargado."), "ok");
    // repintar desde el endpoint público: así lo que se ve es lo que hay en
    // Redis, no lo que el POST dijo que iba a escribir
    await cargarEstadoApu();
  }

  $("btn-apu-cargar").addEventListener("click", cargarCatalogoApu);


  /* «Nuevo RUP (PDF)»: reutiliza el flujo del onboarding tal cual — el input
     del PDF vive en la landing (#rup-archivo) y onboarding.js hace el resto.
     Al elegir archivo se ENSEÑA la landing: el progreso y los errores se
     pintan allí, y dejarlos en una sección oculta sería un botón mudo. */
  $("btn-nuevo-rup").addEventListener("click", () => {
    const input = document.getElementById("rup-archivo");
    if (!input) return;
    input.addEventListener("change", () => {
      if (!input.files || !input.files.length) return;
      $("app").classList.add("hidden");
      const ob = document.getElementById("onboarding");
      if (ob) ob.classList.remove("hidden");
    }, { once: true });
    input.click();
  });

  /* Reconstrucción del índice de competencia: el mismo endpoint de siempre
     (/api/sync/historico?reconstruir_indice=true), ahora con botón. `done:false`
     no es un error: es «siga pulsando, el avance queda guardado». */
  $("d-comp-reconstruir").addEventListener("click", async () => {
    const btn = $("d-comp-reconstruir");
    const msg = $("d-comp-msg");
    btn.disabled = true;
    msg.textContent = "Reconstruyendo sobre el histórico ya descargado…";
    try {
      const r = await fetch("/api/procesos?op=historico&reconstruir_indice=true",
        { headers: { "x-historico-token": leerToken(), Accept: "application/json" }, cache: "no-store" });
      const c = await leerJson(r);
      if (r.status === 401) msg.textContent = msg401(c);
      else if (!r.ok || !c || !c.ok) msg.textContent = (c && c.error) || fraseDeFallo({ status: r.status });
      else if (c.indice && c.indice.done === false) msg.textContent = "Reconstrucción a medias (presupuesto agotado): vuelva a pulsar, el avance queda guardado.";
      else msg.textContent = "Índice de competencia reconstruido.";
    } catch (e) {
      msg.textContent = mensajeDeFallo(e, "rehacer el índice");
    } finally {
      btn.disabled = false;
    }
  });

  /* La alarma que faltaba en Mi empresa: el RUP se renueva cada año antes del
     QUINTO DÍA HÁBIL de abril y, si no se renueva, cesa sus efectos hasta el
     año siguiente — un año entero sin poder licitar. La fecha se calcula
     contando lunes a viernes SIN festivos: los festivos de Semana Santa solo
     pueden CORRER el plazo hacia adelante, así que el error cae del lado
     seguro (avisar unos días antes de lo estrictamente necesario). Por eso,
     pasada la fecha calculada, la frase dice «verificá en el RUES», nunca
     «ya no hay nada que hacer». Solo vive de febrero al 30 de abril: una
     alarma encendida todo el año se deja de mirar. El «ahora» se INYECTA
     (la regla de las pruebas de husos y fechas del proyecto). */
  function alertaVigenciaRup(ahora) {
    const mes = ahora.getMonth();
    if (mes < 1 || mes > 3) return null; // solo febrero, marzo y abril
    let habiles = 0, d = 0, fecha = null;
    while (habiles < 5) {
      d += 1;
      fecha = new Date(ahora.getFullYear(), 3, d);
      if (fecha.getDay() !== 0 && fecha.getDay() !== 6) habiles += 1;
    }
    const fechaTxt = fecha.toLocaleDateString("es-CO", { day: "numeric", month: "long" });
    if (ahora.getTime() <= fecha.getTime()) {
      const dias = Math.ceil((fecha.getTime() - ahora.getTime()) / 86400000);
      return {
        nivel: dias <= 15 ? "rojo" : "ambar",
        frase: `Atención: el RUP se renueva a más tardar el quinto día hábil de abril — este año, hacia el ${fechaTxt}`
          + (dias > 0 ? ` (faltan ${dias} día${dias === 1 ? "" : "s"})` : " (es HOY)")
          + ". Si no lo renueva a tiempo, pierde efectos hasta el año siguiente y no puede licitar.",
      };
    }
    return {
      nivel: "rojo",
      frase: "Atención: el plazo para renovar el RUP (quinto día hábil de abril) ya venció o está encima. "
        + "Si todavía no lo renovó, hágalo HOY y verifique su estado en el RUES: los festivos pueden "
        + "correr el plazo unos días, pero no cuente con eso.",
    };
  }
  function pintarAlertaVigencia() {
    const el = $("rup-alerta-vigencia");
    if (!el) return;
    const a = alertaVigenciaRup(new Date());
    if (!a) { el.classList.add("hidden"); return; }
    el.textContent = a.frase;
    el.className = "mt-4 rounded-xl px-4 py-3 text-sm font-medium "
      + (a.nivel === "rojo" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-800");
  }

  /* ════════════ Parámetros de costo (Mi empresa → Sistema) ════════════
     Formulario sobre /api/apu?op=parametros: GET (público) rellena; POST (token
     integrado por cabecera) guarda el objeto COMPLETO —el servidor valida y no
     rellena huecos por su cuenta— y deja una versión por fecha de vigencia. Al
     guardar se refresca también la vista «Cómo calculamos» de la pestaña
     Precios: efecto inmediato, sin caché. */
  const CAMPOS_PRESTACION = {
    cesantias: "Cesantías", interesesCesantias: "Intereses a las cesantías", prima: "Prima de servicios",
    vacaciones: "Vacaciones", salud: "Salud (empleador)", pension: "Pensión (empleador)",
    cajaCompensacion: "Caja de compensación", sena: "SENA", icbf: "ICBF",
  };
  function msgPar(texto, tipo) {
    const el = $("par-mensaje");
    if (!el) return;
    el.textContent = texto;
    el.className = "mt-4 rounded-xl px-4 py-3 text-sm "
      + (tipo === "error" ? "bg-red-50 text-red-700 ring-1 ring-red-600/20"
        : tipo === "ok" ? "bg-green-50 text-green-800 ring-1 ring-green-600/20"
          : "bg-gray-50 text-gray-700 ring-1 ring-gray-900/5");
    el.classList.remove("hidden");
  }
  function pintarParametrosForm(r) {
    const p = r.parametros || {};
    const pct = (f) => Math.round(f * 10000) / 100;
    $("par-vigencia").value = p.vigencia || "";
    $("par-smmlv").value = p.smmlv ?? "";
    $("par-auxilio").value = p.auxilioTransporte ?? "";
    $("par-divisor").value = p.divisorAPU ?? "";
    $("par-horas-vigente").value = p.horasSemanaVigente ?? "";
    $("par-horas-calibracion").value = p.horasSemanaCalibracion ?? "";
    $("par-dias-semana").value = p.diasLaboradosSemana ?? "";
    $("par-arl-clase").value = (p.arl && p.arl.clase) || "V";
    $("par-exoneracion").checked = !!p.exoneracionParafiscales;
    $("par-tpnl").value = pct(p.tpnl || 0);
    $("par-mvp").value = pct(p.mvp || 0);
    $("par-hm").value = pct(p.herramientaMenor || 0);
    $("par-epp").value = pct(p.epp || 0);
    $("par-iva").value = pct(p.ivaSobreUtilidad || 0);
    $("par-prestaciones").innerHTML = Object.keys(CAMPOS_PRESTACION).map((id) => `
      <label class="block">
        <span class="text-xs text-gray-500">${esc(CAMPOS_PRESTACION[id])}</span>
        <input id="par-prest-${id}" type="number" min="0" max="99" step="0.001" value="${pct((p.prestaciones || {})[id] || 0)}"
               class="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm num">
      </label>`).join("");
    $("par-fuente").textContent = r.fuente === "redis"
      ? `Guardados por la empresa${r.guardado_el ? ` el ${String(r.guardado_el).slice(0, 10)}` : ""}.`
      : "Todavía se usan los valores de arranque: no se ha guardado ninguno.";
    const h = $("par-historial");
    if (h) {
      const vs = r.historial || [];
      h.innerHTML = vs.length
        ? vs.map((v) => `<div>Vigente desde ${esc(v.vigencia)}${v.guardado_el ? ` · guardado el ${esc(String(v.guardado_el).slice(0, 10))}` : ""}${v.resumen ? ` · salario mínimo ${pesos(v.resumen.smmlv)} · ${esc(v.resumen.horasSemanaVigente)} h/semana · riesgo ${esc(v.resumen.arl)}` : " · ilegible"}</div>`).join("")
        : "Ninguna versión guardada todavía.";
    }
  }
  function leerParametrosForm() {
    const frac = (id) => Number($(id).value) / 100;
    const prestaciones = {};
    for (const id of Object.keys(CAMPOS_PRESTACION)) prestaciones[id] = Number($(`par-prest-${id}`).value) / 100;
    const base = (PARAMETROS && PARAMETROS.parametros) || {};
    return {
      vigencia: $("par-vigencia").value,
      smmlv: Number($("par-smmlv").value),
      auxilioTransporte: Number($("par-auxilio").value),
      divisorAPU: Number($("par-divisor").value),
      jornadaLegalMes: Number($("par-divisor").value),
      horasSemanaVigente: Number($("par-horas-vigente").value),
      horasSemanaCalibracion: Number($("par-horas-calibracion").value),
      diasLaboradosSemana: Number($("par-dias-semana").value),
      prestaciones,
      exoneracionParafiscales: $("par-exoneracion").checked,
      // las tarifas por clase son de ley y no se editan aquí: viajan las que
      // sirvió el servidor (ninguna tasa vive en este archivo)
      arl: { clase: $("par-arl-clase").value, tarifas: (base.arl && base.arl.tarifas) || null },
      tpnl: frac("par-tpnl"), mvp: frac("par-mvp"),
      herramientaMenor: frac("par-hm"), epp: frac("par-epp"), ivaSobreUtilidad: frac("par-iva"),
    };
  }
  async function cargarParametrosAdmin() {
    if (vistaVisitanteActiva) return;   // el formulario vive en «Sistema», oculto al visitante (M-SEG-02)
    if (!$("par-vigencia")) return;
    let r = null;
    try {
      const resp = await fetch("/api/apu?op=parametros&historial=1", { cache: "no-store" });
      r = await resp.json();
    } catch { r = null; }
    if (!r || !r.ok) { msgPar("No se pudieron leer los parámetros de costo.", "error"); return; }
    PARAMETROS = r;
    pintarParametrosForm(r);
  }
  async function guardarParametros() {
    if (!PARAMETROS || !PARAMETROS.parametros) { msgPar("Los parámetros todavía no cargaron: espere un momento e intente de nuevo.", "error"); return; }
    const btn = $("btn-par-guardar");
    btn.disabled = true; $("par-spin").classList.remove("hidden");
    let r = null, resp = null;
    try {
      resp = await fetch("/api/apu?op=parametros", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-historico-token": leerToken() },
        body: JSON.stringify({ parametros: leerParametrosForm() }),
      });
    } catch (e) {
      msgPar(mensajeDeFallo(e, "guardar los parámetros"), "error");
      btn.disabled = false; $("par-spin").classList.add("hidden");
      return;
    }
    try { r = await resp.json(); } catch { r = null; }
    btn.disabled = false; $("par-spin").classList.add("hidden");
    /* La redacción sale de la ÚNICA fuente (Glosario): decía «401 sin JSON
       (¿inicio de sesión de Vercel?)» —jerga de navegador y de infraestructura,
       y ninguna instrucción que el dueño pueda seguir. */
    if (!r) { msgPar(mensajeDeFallo({ status: resp.status }, "guardar los parámetros"), "error"); return; }
    if (!r.ok) {
      msgPar(r.errores ? `No se guardó: ${r.errores.join(" · ")}` : (r.error || "No se guardó."), "error");
      return;
    }
    PARAMETROS = r;
    msgPar(`Parámetros guardados (vigentes desde ${r.parametros.vigencia}). Los próximos cálculos ya los usan.`, "ok");
    pintarMetodologia(r);
    cargarParametrosAdmin();
  }
  document.addEventListener("click", (e) => {
    if (e.target && e.target.closest && e.target.closest("#btn-par-guardar")) guardarParametros();
  });

  /* ══════════ Fase 10 · CONSORCIO A LA MEDIDA ══════════
     Aparece SOLO con dos o más perfiles individuales cargados (los del
     selector menos «juntos», que ya es un consorcio). El usuario elige
     quiénes van y qué parte pone cada uno (deslizador + número); la suma
     tiene que dar EXACTAMENTE 100 o no hay simulación, y se dice en una
     línea. La simulación pide al servidor (con token: son cifras del perfil)
     los indicadores ponderados YA TRUNCADOS, la capacidad, la unión de lo que
     saben hacer y —lo que justifica todo esto— cuántas licitaciones más se
     abren frente al mejor de los dos solo. «Ver las N» guarda el consorcio y
     abre la lista con ese perfil. Aquí no entra ningún precio (art. 410A). */
  const cons = { integrantes: [], part: {}, timer: null, ultimo: null };
  function perfilesIndividuales() {
    return [...$("f-perfil").options].filter((o) => o.value && o.value !== "juntos" && !/^cons_/.test(o.value))
      .map((o) => ({ id: o.value, nombre: o.textContent.replace(/^Mi RUP · /, "") }));
  }
  function pintarConsorcio() {
    const perfiles = perfilesIndividuales();
    const sec = $("seccion-consorcio");
    if (perfiles.length < 2) { sec.classList.add("hidden"); return; }
    sec.classList.remove("hidden");
    $("cons-integrantes").innerHTML = perfiles.map((p) => `<label class="flex items-center gap-2 text-sm">
      <input type="checkbox" data-cons-perfil="${esc(p.id)}" ${cons.integrantes.includes(p.id) ? "checked" : ""} class="h-4 w-4 rounded border-gray-300 text-gray-900 focus:ring-gray-900/10">${esc(p.nombre)}</label>`).join("");
    const elegidos = perfiles.filter((p) => cons.integrantes.includes(p.id));
    $("cons-participaciones").innerHTML = elegidos.length < 2
      ? `<p class="text-sm text-gray-500">Marque al menos dos integrantes.</p>`
      : elegidos.map((p) => `<div class="grid grid-cols-[1fr_auto] items-center gap-3">
          <label class="text-sm text-gray-700">${esc(p.nombre)}
            <input type="range" min="1" max="99" step="1" value="${cons.part[p.id] ?? Math.floor(100 / elegidos.length)}" data-cons-rango="${esc(p.id)}" class="mt-1 w-full">
          </label>
          <span class="flex items-center gap-1 text-sm"><input type="number" min="0.01" max="100" step="0.01" value="${cons.part[p.id] ?? Math.floor(100 / elegidos.length)}" data-cons-num="${esc(p.id)}" aria-label="Participación de ${esc(p.nombre)} en porcentaje" class="w-20 rounded-lg border-gray-300 text-sm">%</span>
        </div>`).join("");
    pintarSumaConsorcio();
  }
  function participacionesActuales() {
    return cons.integrantes.map((id) => ({ perfilId: id, participacion: Number(cons.part[id] ?? 0) }));
  }
  function pintarSumaConsorcio() {
    const el = $("cons-suma");
    if (cons.integrantes.length < 2) { el.textContent = ""; return; }
    const suma = Math.round(participacionesActuales().reduce((a, x) => a + x.participacion, 0) * 100) / 100;
    if (Math.abs(suma - 100) < 1e-9) { el.className = "mt-2 text-sm text-emerald-700"; el.textContent = "100 % ● Correcto"; }
    else { el.className = "mt-2 text-sm text-red-700"; el.textContent = `${suma.toLocaleString("es-CO")} % — ${suma < 100 ? `falta ${(Math.round((100 - suma) * 100) / 100).toLocaleString("es-CO")} %` : `sobra ${(Math.round((suma - 100) * 100) / 100).toLocaleString("es-CO")} %`} para llegar a 100 %`; }
    return suma;
  }
  const dec2 = (v) => (v == null ? "Sin referencia" : Number(v).toLocaleString("es-CO", { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
  async function simularConsorcio() {
    if (cons.integrantes.length < 2) { $("cons-resultado").classList.add("hidden"); return; }
    const suma = participacionesActuales().reduce((a, x) => a + x.participacion, 0);
    if (Math.abs(suma - 100) > 1e-9) { $("cons-resultado").classList.add("hidden"); return; }
    const caja = $("cons-resultado");
    caja.classList.remove("hidden");
    caja.innerHTML = `<p class="text-sm text-gray-500">Calculando cuántas licitaciones se abren…</p>`;
    let r;
    try { r = await api("/api/perfil?op=consorcio-simular", { method: "POST", body: { integrantes: participacionesActuales() } }); }
    catch (e) { caja.innerHTML = `<p class="text-sm text-red-700">${esc(fraseDeFallo(e))}</p>`; return; }
    cons.ultimo = r;
    const ind = r.indicadores || {};
    const solo = r.capacidadMejorIntegrante;
    caja.innerHTML = `
      <p class="text-xs font-medium uppercase tracking-wide text-gray-500">Juntos quedan así</p>
      <dl class="mt-2 grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
        <dt class="text-gray-500">Puede facturar hasta</dt><dd class="font-medium">${r.capacidadContratacion == null ? "Sin referencia — falta la utilidad operacional de un integrante" : fmtCOP.format(r.capacidadContratacion)}${solo != null ? ` <span class="font-normal text-gray-500">(solo: ${fmtCOP.format(solo)})</span>` : ""}</dd>
        <dt class="text-gray-500">Sabe hacer</dt><dd class="font-medium">${r.clasesUnspsc} tipos de trabajo <span class="font-normal text-gray-500">(unión real, no la suma de ${r.clasesSumadas})</span></dd>
        <dt class="text-gray-500">Contratos acreditados</dt><dd class="font-medium">${r.contratos == null ? "Sin referencia" : r.contratos}</dd>
        <dt class="text-gray-500">Liquidez · endeudamiento · cobertura</dt><dd class="font-medium">${dec2(ind.liquidez)} · ${dec2(ind.endeudamiento)} · ${dec2(ind.cobertura)} <span class="font-normal text-gray-500">(ponderados por participación, truncados a 2 decimales)</span></dd>
        <dt class="text-gray-500">Patrimonio ponderado</dt><dd class="font-medium">${ind.patrimonio == null ? "Sin referencia" : fmtCOP.format(ind.patrimonio)}</dd>
      </dl>
      <p class="mt-4 text-base font-medium">${r.corpus_vacio ? "Todavía no hay licitaciones sincronizadas para contar."
    : r.procesosAdicionales > 0 ? `Con esto se abren ${r.procesosAdicionales} licitación${r.procesosAdicionales === 1 ? "" : "es"} más de las que alcanzaba solo (${r.procesosConsorcio} frente a ${r.procesosMejorIntegrante}).`
      : `Juntos alcanzan ${r.procesosConsorcio} licitaciones: las mismas que el mejor integrante solo (${r.procesosMejorIntegrante}). El consorcio no abre puertas nuevas hoy.`}</p>
      <div class="mt-3 flex flex-wrap items-center gap-3">
        <button id="cons-btn-ver" type="button" class="rounded-xl bg-gray-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-gray-700">${r.procesosConsorcio ? `Ver las ${r.procesosConsorcio}` : "Guardar consorcio"}</button>
        <span class="text-xs text-gray-500">Guarda el consorcio y abre la lista con ese perfil.</span>
      </div>
      <ul class="mt-3 space-y-1 text-xs text-gray-500">${(r.advertencias || []).map((a) => `<li>Atención: ${esc(a)}</li>`).join("")}<li>${esc(r.limite || "")}</li></ul>`;
  }
  function programarSimulacion() { clearTimeout(cons.timer); cons.timer = setTimeout(simularConsorcio, 500); }
  $("seccion-consorcio").addEventListener("change", (ev) => {
    const cb = ev.target.closest("[data-cons-perfil]");
    if (cb) {
      const id = cb.getAttribute("data-cons-perfil");
      cons.integrantes = cb.checked ? [...new Set([...cons.integrantes, id])] : cons.integrantes.filter((x) => x !== id);
      // reparto por defecto en partes iguales (con enteros que sumen 100)
      const n = cons.integrantes.length;
      if (n >= 2) { const base = Math.floor(100 / n); cons.integrantes.forEach((x, i) => { cons.part[x] = i === 0 ? 100 - base * (n - 1) : base; }); }
      pintarConsorcio(); programarSimulacion();
    }
  });
  $("seccion-consorcio").addEventListener("input", (ev) => {
    const r = ev.target.closest("[data-cons-rango]"), num = ev.target.closest("[data-cons-num]");
    if (!r && !num) return;
    const id = (r || num).getAttribute(r ? "data-cons-rango" : "data-cons-num");
    const v = Number((r || num).value);
    if (!Number.isFinite(v)) return;
    cons.part[id] = v;
    // con DOS integrantes el otro se completa solo (mover uno mueve al otro);
    // con más, el usuario reparte y la suma le dice cuánto falta
    if (cons.integrantes.length === 2) { const otro = cons.integrantes.find((x) => x !== id); cons.part[otro] = Math.round((100 - v) * 100) / 100; }
    for (const x of cons.integrantes) {
      const rr = $("seccion-consorcio").querySelector(`[data-cons-rango="${x}"]`), nn = $("seccion-consorcio").querySelector(`[data-cons-num="${x}"]`);
      if (rr && rr !== ev.target) rr.value = cons.part[x]; if (nn && nn !== ev.target) nn.value = cons.part[x];
    }
    pintarSumaConsorcio(); programarSimulacion();
  });
  $("seccion-consorcio").addEventListener("click", async (ev) => {
    if (ev.target.closest("#cons-btn-ver")) {
      const btn = ev.target.closest("#cons-btn-ver"); btn.disabled = true;
      try {
        /* El nombre viaja SOLO si el usuario escribió algo: el servidor cae a
           «Consorcio N» con `null`, y mandar una cadena vacía sería pedirle que
           guarde un nombre en blanco. Se recorta a los mismos 140 caracteres
           que valida el handler para que el tope no sorprenda al enviar. */
        const nombreCons = $("cons-nombre").value.trim().slice(0, 140);
        const g = await api("/api/perfil?op=consorcio", { method: "POST", body: { integrantes: participacionesActuales(), nombre: nombreCons || null } });
        const sel = $("f-perfil");
        if (![...sel.options].some((o) => o.value === g.id)) { const o = document.createElement("option"); o.value = g.id; o.textContent = etiquetaConsorcio(g.nombre, g.id); sel.appendChild(o); }
        fijarPerfilBarra(g.id); // y el borrador de Precios sigue a la barra (V-B2a-01)
        try { localStorage.setItem("detekta_consorcio", JSON.stringify({ id: g.id, nombre: g.nombre })); } catch { /* sin almacenamiento */ }
        pintarConsorciosGuardados();
        activarPestana("licitaciones");
        pagina = 1; buscar();
      } catch (e) { const m = $("cons-mensaje"); m.className = "mt-3 rounded-xl px-4 py-3 text-sm bg-red-50 text-red-700"; m.textContent = fraseDeFallo(e); m.classList.remove("hidden"); }
      finally { btn.disabled = false; }
      return;
    }
    const del = ev.target.closest("[data-cons-borrar]");
    if (del) {
      const id = del.getAttribute("data-cons-borrar");
      try { await api(`/api/perfil?op=consorcio&id=${encodeURIComponent(id)}`, { method: "DELETE" }); } catch { /* se repinta igual */ }
      const sel = $("f-perfil"); for (const o of [...sel.options]) if (o.value === id) o.remove();
      /* quitar la opción activa deja la barra en la primera SIN evento change:
         se fija por la vía única para que el borrador la siga (V-B2a-01) */
      fijarPerfilBarra(sel.value);
      pintarConsorciosGuardados();
    }
  });
  async function pintarConsorciosGuardados() {
    /* los consorcios guardados son del dueño y VOLVÍAN A LA BARRA como opciones:
       deshacían la poda del visitante por la puerta de atrás (M-SEG-02) */
    if (vistaVisitanteActiva) return;
    let r = null;
    try { r = await api("/api/perfil?op=consorcio"); } catch { r = null; }
    const lista = (r && r.consorcios) || [];
    $("cons-guardados").innerHTML = lista.length ? `<p class="text-xs font-medium uppercase tracking-wide text-gray-500">Consorcios guardados</p><ul class="mt-1 space-y-1">${lista.map((c) => `<li class="flex flex-wrap items-center gap-2"><span>${esc(c.nombre || c.id)} — ${c.integrantes.map((i) => `${esc(i.perfilId)} ${i.participacion} %`).join(" · ")}</span>
      <a class="text-blue-600 hover:underline" href="/?perfil=${esc(c.id)}#/licitaciones">Ver su lista</a>
      <button type="button" data-cons-borrar="${esc(c.id)}" class="text-red-600 hover:underline">Borrar</button></li>`).join("")}</ul>` : "";
    const sel = $("f-perfil");
    for (const c of lista) if (![...sel.options].some((o) => o.value === c.id)) { const o = document.createElement("option"); o.value = c.id; o.textContent = etiquetaConsorcio(c.nombre, c.id); sel.appendChild(o); }
  }

  /* ---- Verificá a tu socio (vista `socio` de /api/inteligencia) ----
     La due diligence de 20 minutos del manual. La respuesta ya viene con el
     semáforo, los hallazgos, las cuatro fuentes automáticas y el checklist de
     las cinco: acá solo se pinta. Nunca se escribe «limpio»: la app consulta
     datasets abiertos, no certificados, y el texto del servidor lo dice. */
  let socioEnVuelo = false;
  async function verificarSocio() {
    if (socioEnVuelo) return;
    const id = $("socio-id").value.trim();
    const rl = $("socio-representante").value.trim();
    const msg = $("socio-mensaje"), out = $("socio-resultado");
    const aviso = (texto, clase) => { msg.className = `mt-3 rounded-xl px-4 py-3 text-sm ${clase}`; msg.textContent = texto; msg.classList.remove("hidden"); };
    if (!id.replace(/\D/g, "")) { aviso("Escriba el NIT o la cédula del socio para poder verificarlo.", "bg-amber-50 text-amber-800"); return; }
    socioEnVuelo = true;
    $("btn-socio-verificar").disabled = true;
    aviso("Consultando la Procuraduría y SECOP…", "bg-gray-50 text-gray-600");
    out.classList.add("hidden");
    try {
      const qs = `op=socio&id=${encodeURIComponent(id)}${rl ? `&representante=${encodeURIComponent(rl)}` : ""}`;
      const r = await api(`/api/inteligencia?${qs}`);
      msg.classList.add("hidden");
      out.innerHTML = pintarSocio(r);
      out.classList.remove("hidden");
    } catch (e) {
      aviso(fraseDeFallo(e), "bg-red-50 text-red-700");
    } finally {
      socioEnVuelo = false;
      $("btn-socio-verificar").disabled = false;
    }
  }
  function pintarSocio(r) {
    const sem = r.semaforo || {};
    /* VERDE SOLO CON «sin_hallazgos» (6-sep-2026). El verde era la rama POR OMISIÓN, así que
       el cuarto nivel del servidor —«no_verificable», cuando una fuente no respondió— y
       cualquier nivel que esta pantalla no conozca salían verdes. Ámbar es la omisión:
       aquí el falso caro es dar verde sin datos. */
    const clr = sem.nivel === "rojo" ? "bg-red-50 text-red-800 ring-red-200"
      : sem.nivel === "sin_hallazgos" ? "bg-emerald-50 text-emerald-800 ring-emerald-200" : "bg-amber-50 text-amber-800 ring-amber-200";
    const punto = sem.nivel === "rojo" ? "text-red-500" : sem.nivel === "sin_hallazgos" ? "text-emerald-500" : "text-amber-500";
    const idn = r.identificacion || {};
    const f = r.fuentes || {};
    const fecha = (s) => (s ? String(s).slice(0, 10) : "—");
    const filaFuente = (titulo, ok, motivo, cuerpo) => `<div class="rounded-xl bg-gray-50 p-4 ring-1 ring-inset ring-gray-900/5">
      <p class="text-xs font-medium uppercase tracking-wide text-gray-500">${titulo}</p>
      ${ok ? cuerpo : `<p class="mt-1 text-sm text-gray-500">${esc(motivo || "no respondió")}</p>`}</div>`;
    const siri = f.siri || {};
    const mu = f.multas_secop1 || {};
    const co = f.contratos_secop2 || {};
    const ad = f.adjudicaciones_secop2 || {};
    const listaSiri = (siri.coincidencias || []).map((c) => `<li>${esc(c.sancion || "sanción")} · ${esc(c.nombre || c.identificacion)} (${esc(c.calidad || "—")}) · ${esc(c.fecha_efectos || "sin fecha")}${c.entidad ? ` · ${esc(c.entidad)}` : ""}</li>`).join("");
    const listaMultas = (mu.lista || []).slice(0, 8).map((m) => `<li>${fecha(m.firmeza)} · ${esc(m.entidad || "—")}${m.valor_cop ? ` · ${pesos(m.valor_cop)}` : " · sin valor"}${urlSegura(m.url) ? ` · <a class="text-blue-600 hover:underline" target="_blank" rel="noopener" href="${esc(urlSegura(m.url))}">ver</a>` : ""}</li>`).join("");
    const ir = mu.inhabilidad_reiterada || {};
    const estados = co.estados ? Object.entries(co.estados).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${esc(k)} ${v}`).join(" · ") : "";
    const rl = idn.representante_legal;
    const estadoTxt = { hallazgos: "con hallazgos", sin_hallazgos: "sin hallazgos en el dataset", pendiente_manual: "ábrala y consulte", no_consultada: "no respondió", falta_cedula: "falta la cédula del representante" };
    const estadoClr = { hallazgos: "text-red-700", sin_hallazgos: "text-emerald-700", pendiente_manual: "text-gray-700", no_consultada: "text-amber-700", falta_cedula: "text-amber-700" };
    return `
      <div class="rounded-xl p-4 ring-1 ring-inset ${clr}">
        <p class="text-sm font-semibold"><span class="${punto}">●</span> ${esc(sem.texto || "")}</p>
        ${(sem.hallazgos || []).length ? `<ul class="mt-2 list-disc pl-5 text-sm">${sem.hallazgos.map((h) => `<li>${esc(h.texto)}</li>`).join("")}</ul>` : ""}
        <p class="mt-2 text-xs opacity-80">${esc(sem.advertencia || "")}</p>
      </div>
      <p class="mt-3 text-sm text-gray-600">${idn.tipo === "cedula" ? "Cédula" : "NIT"} <strong>${esc(idn.valor || "")}</strong>${idn.nombre_en_secop ? ` · <strong>${esc(idn.nombre_en_secop)}</strong> (nombre según SECOP)` : " · sin nombre en SECOP"}${rl ? ` · representante legal según SECOP II: ${esc(rl.nombre || rl.identificacion)} (${esc(rl.identificacion)})` : ""} · consultado ${fecha(r.consultado_el)}</p>
      <div class="mt-3 grid gap-3 sm:grid-cols-2">
        ${filaFuente("Sanciones de la Procuraduría (SIRI)", siri.ok, siri.motivo, `<p class="mt-1 text-sm">${siri.n ? `<strong>${siri.n}</strong> sanción(es) sobre ${esc((siri.consultados || []).join(", "))}` : `Sin coincidencias para ${esc((siri.consultados || []).join(", ") || "—")}`}</p>${listaSiri ? `<ul class="mt-1 list-disc pl-5 text-xs text-gray-700">${listaSiri}</ul>` : ""}<p class="mt-2 text-xs text-gray-500">${esc(siri.nota || "")}</p>`)}
        ${filaFuente("Multas y sanciones (SECOP I)", mu.ok, mu.motivo, `<p class="mt-1 text-sm">${mu.multas ? `<strong>${mu.multas}</strong> multa(s)${mu.valor_total_cop ? ` · ${pesos(mu.valor_total_cop)} en total` : ""}` : "Sin multas registradas"}</p>${ir.lectura ? `<p class="mt-1 text-xs ${ir.senal === "posible_inhabilidad" ? "text-red-700" : ir.senal ? "text-amber-700" : "text-gray-600"}">${esc(ir.lectura)}</p>` : ""}${listaMultas ? `<ul class="mt-1 list-disc pl-5 text-xs text-gray-700">${listaMultas}</ul>` : ""}<p class="mt-2 text-xs text-gray-500">${esc(mu.nota || "")}</p>`)}
        ${filaFuente("Contratos firmados en SECOP II", co.ok, co.motivo, `<p class="mt-1 text-sm">${co.contratos ? `<strong>${co.contratos}</strong> contrato(s) con ${co.entidades_distintas} entidad(es) · ${fecha(co.primera_firma)} → ${fecha(co.ultima_firma)}` : "Sin contratos electrónicos"}</p>${co.contratos ? `<p class="mt-1 text-xs text-gray-700">${co.cancelados.contratos ? `<span class="text-amber-700">${co.cancelados.contratos} cancelado(s)</span> · ` : ""}${co.suspendidos.contratos ? `<span class="text-amber-700">${co.suspendidos.contratos} suspendido(s)</span> · ` : ""}${co.cedidos.contratos ? `<span class="text-amber-700">${co.cedidos.contratos} cedido(s)</span> · ` : ""}${co.prorrogas.contratos ? `${co.prorrogas.contratos} con prórroga (mediana ${co.prorrogas.mediana_dias} días)` : "ninguno con prórroga"}${co.pagos && co.pagos.registra && co.pagos.pct_pagado_de_terminados != null ? ` · ${co.pagos.pct_pagado_de_terminados} % pagado en los terminados con pago registrado` : ""}</p><p class="mt-1 text-xs text-gray-500">${esc(estados)}</p>` : ""}<p class="mt-2 text-xs text-gray-500">${esc(co.nota || "")}</p>`)}
        ${filaFuente("Procesos que ha ganado (SECOP II)", ad.ok, ad.motivo, `<p class="mt-1 text-sm">${ad.adjudicaciones ? `<strong>${ad.adjudicaciones}</strong> adjudicación(es)${ad.valor_total_cop ? ` · ${pesos(ad.valor_total_cop)}` : ""} · última ${fecha(ad.ultima_adjudicacion)}` : "Sin adjudicaciones registradas"}</p>${(ad.por_anio || []).length ? `<p class="mt-1 text-xs text-gray-700">${ad.por_anio.map((a) => `${esc(a.anio)}: ${a.procesos}`).join(" · ")}</p>` : ""}`)}
      </div>
      <p class="mt-4 text-xs font-medium uppercase tracking-wide text-gray-500">Las cinco fuentes antes de firmar</p>
      <ol class="mt-2 space-y-2 text-sm">
        ${(r.checklist || []).map((c, i) => `<li class="rounded-xl bg-gray-50 p-3 ring-1 ring-inset ring-gray-900/5"><span class="font-medium">${i + 1}. ${esc(c.nombre)}</span> — <span class="${estadoClr[c.estado] || "text-gray-700"}">${esc(estadoTxt[c.estado] || c.estado)}</span>${c.resumen ? ` · ${esc(c.resumen)}` : ""}<br><span class="text-xs text-gray-600">${esc(c.que_mirar)}</span> <a class="text-xs text-blue-600 hover:underline" target="_blank" rel="noopener" href="${esc(c.url)}">${c.automatica ? "Ver la fuente" : "Abrir el portal"} ↗</a></li>`).join("")}
      </ol>
      <p class="mt-3 text-xs text-gray-500">${esc((r.normas && r.normas.solidaridad && r.normas.solidaridad.regla) || "")}</p>`;
  }

  /* El perfil recordado se valida contra las opciones del selector: un valor que
     ya no existe («consorcio» fue el valor de estos selectores hasta el
     6-sep-2026; hoy es «juntos», el mismo id que la barra) es INERTE y cae al
     primero, nunca a un value vacío que el servidor rechazaría con 400. */
  function perfilRecordado() {
    const v = leerPerfil();
    const sel = $("d-perfil");
    return [...sel.options].some((o) => o.value === v) ? v : sel.options[0].value;
  }
  function arrancarPaneles() {
    pintarConsorcio();
    pintarConsorciosGuardados();
    $("btn-socio-verificar").addEventListener("click", verificarSocio);
    for (const id of ["socio-id", "socio-representante"]) $(id).addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); verificarSocio(); } });
    $("d-perfil").value = perfilRecordado();
    $("c-perfil").value = perfilRecordado();
    pintarAlertaVigencia();
    cargarDashboard();
    cargarRupActual();
    // la experiencia se consulta al arrancar (es barato y decide si el toggle
    // de la auditoría empieza encendido); la AUDITORÍA no, que recorre el
    // histórico entero y solo debe correr cuando alguien la pide
    cargarExperienciaActual();
    // consultar el catálogo APU es público y son dos comandos; CARGARLO escribe
    // ~70 claves y solo corre cuando alguien pulsa el botón
    cargarEstadoApu();
    // los parámetros de costo son públicos en lectura y son un GET pequeño
    cargarParametrosAdmin();
  }

  /* ══════════ Arranque ══════════ */
  /* Va AL FINAL a propósito. Estaba junto al gate, y en cada visita repetida
     de la misma pestaña (`detecta-acceso` ya en sessionStorage) llamaba a
     `buscar()` antes de que se inicializaran `pagina`/`timerReintento`: el
     `clearTimeout(timerReintento)` de la primera línea de `buscar` reventaba
     con «Cannot access 'timerReintento' before initialization». Como `buscar`
     es async, el error salía por una promesa rechazada —la consola lo mostraba
     y la app se quedaba sin resultados, en silencio— en vez de detener la
     carga. Aquí ya está todo declarado y cableado.

     Tres vistas posibles, en este orden de decisión (ago 2026):
       1. hay un perfil de RUP (en la URL `?perfil=rup_…` o guardado por el
          onboarding) → dashboard con ese perfil, sin gate: el gate protege el
          acceso a los perfiles del dueño, no el tablero del propio RUP;
       2. la pestaña ya pasó el gate → dashboard clásico;
       3. nada de lo anterior → la landing de onboarding (#onboarding, que
          nace visible en el HTML precisamente para este caso). */
  const perfilUrl = (() => {
    try { return new URLSearchParams(window.location.search).get("perfil") || ""; } catch { return ""; }
  })();
  const guardadoRup = perfilRupGuardado();
  const perfilRup = ID_RUP_RE.test(perfilUrl)
    ? { id: perfilUrl, nombre: guardadoRup && guardadoRup.id === perfilUrl ? guardadoRup.nombre : "" }
    : guardadoRup;
  /* sessionStorage puede lanzar en modo restringido: el arranque no puede
     morir por eso (la landing quedaría muda con la consola como único aviso) */
  let sesionConClave = false;
  try { sesionConClave = sessionStorage.getItem("detecta-acceso") === "1"; } catch { sesionConClave = false; }
  /* «#/inicio» pide la LANDING aunque haya un RUP guardado o sesión (6-sep-2026,
     M-SEG-02): es la salida de quien administra el sitio y entró por su RUP sin
     la clave —sin ella, el arranque lo devolvía a la aplicación una y otra vez—. */
  let pideInicio = false;
  try { pideInicio = location.hash === "#/inicio"; } catch { pideInicio = false; }
  if (pideInicio) {
    if (window.Portada) window.Portada.teaser();
    /* El hash se CONSUME al atenderlo (6-sep-2026, B4a-H2): quien entra con su
       clave desde esta landing se quedaba con «#/inicio» en la URL y cada
       recarga lo devolvía a la landing y al gate aunque la sesión ya estuviera
       puesta (medido en Chromium). Sin el hash, la siguiente recarga vuelve a
       decidir por sesión o por RUP, como siempre. */
    try { history.replaceState(null, "", `${location.pathname}${location.search}`); } catch { /* entorno raro */ }
  } else if (perfilRup) {
    // sin gate pasado, el selector queda SOLO con el perfil del RUP: entrar
    // por URL no puede regalar los perfiles del dueño — y la vista de
    // visitante oculta (y deja de pedir) lo que es del dueño
    activarPerfilRup(perfilRup, { soloEste: !sesionConClave });
    vistaDeVisitante(!sesionConClave);
    abrirApp();
  } else if (/^cons_[a-z0-9]{6,24}$/.test(perfilUrl)) {
    /* Fase 10 · un consorcio a la medida por URL («Ver su lista»): misma regla
       que el RUP subido — sin gate, el selector queda SOLO con él. */
    let nombreCons = "";
    try { const g = JSON.parse(localStorage.getItem("detekta_consorcio") || "null"); if (g && g.id === perfilUrl) nombreCons = g.nombre || ""; } catch { /* sin almacenamiento */ }
    const sel = $("f-perfil");
    if (![...sel.options].some((o) => o.value === perfilUrl)) { const o = document.createElement("option"); o.value = perfilUrl; o.textContent = etiquetaConsorcio(nombreCons, perfilUrl); sel.appendChild(o); }
    if (!sesionConClave) for (const o of [...sel.options]) { if (o.value !== perfilUrl) o.remove(); }
    fijarPerfilBarra(perfilUrl);
    vistaDeVisitante(!sesionConClave);
    abrirApp();
  } else if (sesionConClave) {
    abrirApp();
  } else if (window.Portada) {
    /* sin perfil y sin sesión: se queda la landing, que nace visible en el
       HTML. Sobre ella solo el TEASER (tres cifras del mercado, sin prosa):
       la portada entera vive ahora DENTRO del tablero, plegada bajo el pulso
       personalizado — el dueño pidió que los datos salieran DESPUÉS de elegir
       cómo entrar, personalizados al RUP. */
    window.Portada.teaser();
  }
})();
