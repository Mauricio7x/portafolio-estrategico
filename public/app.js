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
      return {
        ok: false, sinJson: true,
        error: r.status === 401 || r.status === 403
          ? "El sitio pidió iniciar sesión (protección por contraseña). Inicie sesión y reintente."
          : `El servidor respondió algo que no es JSON (${r.status}). Si el sitio tiene protección por contraseña, inicie sesión y reintente.`,
      };
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
  function refrescarPulso() {
    if (!window.Pulso) return;
    const sel = $("f-perfil");
    const perfil = sel ? sel.value : "";
    const nombre = sel && sel.selectedOptions[0] ? sel.selectedOptions[0].text.replace(/^Consorcio · /, "") : "";
    // con el token viajan las cifras del perfil (patrimonio, capacidad) para «Tu registro»
    const t = tokenGuardado();
    window.Pulso.arrancar(perfil, { nombre, headers: t ? { "x-historico-token": t } : null }).catch(() => {});
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
  const mercadoCompleto = document.getElementById("mercado-completo");
  if (mercadoCompleto) mercadoCompleto.addEventListener("toggle", () => {
    if (mercadoCompleto.open && window.Portada) window.Portada.arrancar();
  });
  function bloquear() {
    $("gate").innerHTML =
      '<div class="text-center"><p class="text-2xl font-semibold">Acceso denegado</p>' +
      '<p class="mt-2 text-sm text-gray-500">Este sitio es privado.</p></div>';
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
      b.classList.toggle("activa", b.getAttribute("data-tab") === destino);
    });
    if (empujarHash) { try { history.replaceState(null, "", `#/${destino}`); } catch { /* entorno raro */ } }
    if (destino === "apu" && !arrancadas.apu) { arrancadas.apu = true; arrancar(); }
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
  document.addEventListener("click", (e) => {
    const b = e.target.closest("[data-tab]");
    if (b) activarPestana(b.getAttribute("data-tab"));
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
    sel.value = p.id;
  }

  /* ══════════ Estados de la vista ══════════ */
  function mostrar(estado, msg) {
    for (const id of ["estado-carga", "estado-error", "estado-vacio", "resultados"]) $(id).classList.add("hidden");
    if (estado) $(estado).classList.remove("hidden");
    if (estado === "estado-carga" && msg) $("estado-carga-msg").textContent = msg;
    if (estado === "estado-error" && msg) $("estado-error-msg").textContent = msg;
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
  /* El aviso de manifestación de interés bajo la barra: cuántos procesos de
     menor cuantía siguen con el plazo abierto y cuántos vencen hoy o mañana
     hábil. Solo se enseña con datos (facetas del servidor); con el filtro ya
     puesto dice que se están viendo. */
  function pintarAvisoManifestacion(fm) {
    const caja = $("aviso-manifestacion");
    if (!caja) return;
    if (!fm || !fm.abiertas) { caja.classList.add("hidden"); caja.classList.remove("flex"); return; }
    const t = $("aviso-manifestacion-texto"), b = $("aviso-manifestacion-ver");
    const puesto = estadoFiltros.manif === "abierta";
    t.textContent = `Manifestación de interés: ${fm.abiertas} proceso${fm.abiertas === 1 ? "" : "s"} de menor cuantía con el plazo abierto`
      + (fm.urgentes ? ` — ${fm.urgentes} vence${fm.urgentes === 1 ? "" : "n"} en los próximos 2 días hábiles` : "")
      + (puesto ? " (se muestran solo estos)." : ". Sin manifestar interés en SECOP II no se puede ofertar.");
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
    return `<p class="mt-3 rounded-lg px-3 py-2 text-xs ring-1 ring-inset ${signo}">Le quedan aprox. <strong>${fmtCOP.format(m.valor)}</strong> entre su piso rentable (${fmtCOP.format(m.piso)}) y el techo al que suele adjudicar esta entidad (${fmtCOP.format(m.techo)}).${m.valor < 0 ? " El techo está POR DEBAJO de su piso: aquí no da." : ""}</p>`;
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
    } catch {
      if (peticion !== peticionActual) return; // llegó tarde: ya hay otra búsqueda
      // durante la sincronización inicial un fallo transitorio no debe cortar
      // la espera automática
      if (reintentosSync > 0) return esperarSincronizacion();
      return mostrar("estado-error", "No se pudo contactar el servidor. Revise su conexión e intente de nuevo.");
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
          ? `El servidor respondió algo que no es JSON (${r.status}). Si el sitio tiene protección por contraseña, inicie sesión y reintente.`
          : `Error del servidor (${r.status}). Intente de nuevo.`));
    }

    reintentosSync = 0;
    // refresco en segundo plano: con datos de >5 min el backend corre un
    // delta barato; si están frescos responde alDia sin tocar Socrata
    fetch("/api/procesos?op=sync&modo=auto").catch(() => {});
    if (cuerpo.sincronizado) {
      const s = $("sello-sync");
      s.textContent = `Datos: ${new Date(cuerpo.sincronizado).toLocaleString("es-CO", { dateStyle: "medium", timeStyle: "short" })}`;
      s.classList.remove("hidden");
    }
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
    fetch("/api/procesos?op=sync&modo=auto").catch(() => {});
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

  function chipBaja(b) {
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
    return chip(`${window.Glosario.corto("baja_mercado")} ${fmtNum.format(mediana)} %`, d.clases, b.mensaje);
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
    return chip(esc(z.etiqueta), clases, z.mensaje || "");
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
  function avisoCierre(dias) {
    if (dias == null || dias < 0 || dias > 2) return "";
    const frase = dias === 0
      ? "Cierra HOY: solo cuenta la oferta en estado «Presentada» antes de la hora exacta — guardarla no basta."
      : dias === 1
        ? "Cierra mañana: presente la oferta HOY. El día del cierre es cuando más ofertas mueren."
        : "Presente la oferta a más tardar mañana: la regla del oficio es dejarla presentada el día ANTERIOR al cierre.";
    return `<p class="mt-3 rounded-lg bg-red-100 px-3 py-2 text-sm font-medium text-red-700">Atención: ${frase}</p>`;
  }

  /* MANIFESTACIÓN DE INTERÉS (menor cuantía, 18-ago-2026): en esta modalidad
     no basta con ofertar — primero hay que manifestar interés dentro de los
     3 días hábiles siguientes a la apertura, o el proceso se pierde antes de
     empezar. El servidor calcula la fecha (apertura + 3 hábiles, D. 1082/2015
     art. 2.2.1.2.1.2.20) y la declara CALCULADA; aquí se pinta un chip y, si
     vence hoy o mañana, una línea a la vista (como la regla de las 24 horas). */
  function chipManifestacion(m) {
    if (!m || !m.aplica) return "";
    const nota = m.nota || "";
    if (m.vencida === true) return chip(`Manifestación de interés · plazo vencido ${esc(m.vence_legible || "")}`, "bg-gray-100 text-gray-600", nota);
    if (m.vencida === false) {
      const q = m.quedan_habiles, d = m.dias_calendario;
      const cuando = d === 0 ? "vence HOY" : d === 1 ? "vence mañana" : `${q} día${q === 1 ? "" : "s"} hábil${q === 1 ? "" : "es"}`;
      return chip(`Manifestar interés · ${cuando} · hasta ${esc(m.vence_legible || "")}`, q != null && q <= 2 ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-800", nota);
    }
    return chip("Manifestación de interés · fecha por confirmar en SECOP II", "bg-amber-100 text-amber-800", nota);
  }
  function avisoManifestacion(m) {
    if (!m || !m.aplica || m.vencida !== false || m.quedan_habiles == null || m.quedan_habiles > 2) return "";
    const frase = m.dias_calendario === 0
      ? `El plazo para manifestar interés vence HOY (${esc(m.vence_legible || "")}). Sin la manifestación en SECOP II no podrá presentar oferta a este proceso.`
      : m.dias_calendario === 1
        ? `El plazo para manifestar interés vence mañana (${esc(m.vence_legible || "")}): hágalo hoy en SECOP II. Sin la manifestación no podrá ofertar.`
        : `Quedan ${m.quedan_habiles} días hábiles para manifestar interés (hasta ${esc(m.vence_legible || "")}). Sin la manifestación en SECOP II no podrá ofertar.`;
    return `<p class="mt-3 rounded-lg bg-red-100 px-3 py-2 text-sm font-medium text-red-700" title="${esc(m.nota || "")}">Atención: ${frase} <span class="font-normal">Fecha calculada desde la apertura; confírmela en el cronograma.</span></p>`;
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
  const VERDE = "bg-green-100 text-green-800";
  const AMBAR = "bg-amber-100 text-amber-800";
  const ROJO = "bg-red-100 text-red-700";
  const GRIS = "bg-gray-100 text-gray-500";

  function badgePuerta(etiqueta, puerta) {
    const p = puerta || {};
    if (p.sin_dato) return chip(`● ${etiqueta} ?`, GRIS, p.mensaje || "Sin datos para evaluar este requisito");
    if (!p.pasa) return chip(`● ${etiqueta} ✗`, ROJO, p.mensaje || "");
    if (p.advertencia) return chip(`● ${etiqueta} ~`, AMBAR, p.mensaje || "");
    return chip(`● ${etiqueta} ✓`, VERDE, p.mensaje || "");
  }

  function badgesPuertas(puertas) {
    const g = puertas || {};
    return [
      badgePuerta(window.Glosario.corto("rup"), g.p1_rup),
      badgePuerta(window.Glosario.corto("capacidad_contratacion"), g.p2_k),
      badgePuerta("Caja", g.p3_caja),
      badgePuerta("Competencia", g.p4_competencia),
    ].join("");
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
  function lineaRequisitos(puertas) {
    const g = puertas || {};
    const detalle = [g.p1_rup, g.p2_k, g.p3_caja].map((p) => p && p.mensaje).filter(Boolean).join("\n");
    const linea = (clase, texto) =>
      `<p class="mt-3 text-sm font-medium ${clase}"${detalle ? ` title="${esc(detalle)}"` : ""}>● ${esc(texto)}</p>`;
    if (g.p1_rup && g.p1_rup.pasa === false) return linea("text-red-700", "Esta obra no encaja con su RUP.");
    if (g.p2_k && g.p2_k.pasa === false) return linea("text-red-700", "Supera su capacidad de contratación.");
    if (g.p3_caja && g.p3_caja.pasa === false) {
      return linea("text-amber-700", "Puede presentarse, pero financiarla está justo: considere anticipo, crédito o consorcio.");
    }
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
    /* «contrato esperado», NO «deja»: `ve` es presupuesto oficial × opción de
       ganar (lib/probabilidad.valorEsperado), un promedio por intento que
       cuenta las veces que no se gana. No es utilidad —eso lo calcula el APU— y
       la nota anterior decía además que descontaba «el costo de ofertar», que
       el cálculo NO hace: era una promesa sin respaldo (18-ago-2026). */
    const cDeja = l.ve != null
      ? celda(esc(fmtCorto(l.ve)), "de contrato esperado por intento", "presupuesto × opción de ganar, contando las veces que no se gana · no es utilidad", "Presupuesto oficial multiplicado por la opción estimada de ganar: promedio por intento, contando las veces que no se gana. NO es utilidad ni descuenta el costo de preparar la oferta: la utilidad la calcula el análisis de precios en Precios.")
      : celda("—", "sin contrato esperado", "", "Sin presupuesto oficial publicado no hay contrato esperado que calcular.");
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

      ${lineaRequisitos(puertas)}

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
        <div class="mt-2 flex flex-wrap gap-2">
          ${badgesPuertas(puertas)}
          ${chip(l.anticipo_pct > 0 ? `Anticipo ${l.anticipo_pct}%` : "Anticipo no declarado", l.anticipo_pct > 0 ? "bg-blue-100 text-blue-800" : "bg-gray-100 text-gray-500")}
          ${chipBaja(l.baja_mercado)}
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

  function pintar(cuerpo) {
    ultimaBusqueda = cuerpo;
    mostrar("resultados");
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
          ? `El servidor respondió algo que no es JSON (${r.status}). Si el sitio tiene protección por contraseña, inicie sesión y reintente.`
          : `No se pudo consultar el PAA (${r.status}).`);
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

  const signoPP = (n) => `${Number(n) > 0 ? "+" : Number(n) < 0 ? "−" : ""}${fmtNum.format(Math.abs(Number(n) || 0))} pp`;

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
          · Valor esperado ${esc(fmtCorto((d.contexto || {}).valor_esperado_cop))}
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
              <td class="py-2 pr-3 text-right tabular-nums">${fmtNum.format(d.suma_aportes_pp)} pp</td>
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
      $("modal-cuerpo").innerHTML = `<p class="py-6 text-center text-red-600">El servidor respondió algo que no es JSON (${r.status}). Si el sitio tiene protección por contraseña, inicie sesión y reintente.</p>`;
      return;
    }
    if (r.status === 401) {
      $("modal-cuerpo").innerHTML = `<p class="py-6 text-center text-red-600">${msg401(cuerpo)}</p>`;
      return;
    }
    if (!r.ok || !cuerpo || !cuerpo.ok) {
      $("modal-cuerpo").innerHTML = `<p class="py-6 text-center text-red-600">${esc((cuerpo && cuerpo.error) || `Error del servidor (${r.status}).`)}</p>`;
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
      $("modal-cuerpo").innerHTML = `<p class="py-6 text-center text-red-600">${esc((cuerpo && cuerpo.error) || `Error del servidor (${r.status}).`)}</p>`;
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
      $("modal-cuerpo").innerHTML = `<p class="py-6 text-center text-red-600">${esc((cuerpo && cuerpo.error) || `Error del servidor (${r.status}).`)}</p>`;
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
    $(id).addEventListener("change", () => { pagina = 1; if (id === "f-ordenar" || id === "f-zona") { escribirFiltrosEnURL(); pintarControlesFiltros(); } if (id === "f-ordenar") pintarConceptoOrden(); buscar(); if (id === "f-perfil") { refrescarPulso(); guardados.clear(); seguimientoCargadoPara = null; cargarSeguimiento({ forzar: true }); } });
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
      throw new Error(`Sin conexión con el servidor: revise su conexión e intente de nuevo. (${e.message})`);
    }
    /* el parseo va APARTE del fetch: el muro del edge responde HTML */
    const cuerpo = await leerJson(r);
    if (r.status === 401) {
      throw new Error(msg401(cuerpo));
    }
    if (!r.ok) {
      throw new Error((cuerpo && cuerpo.error) || `El servidor respondió ${r.status}.`);
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
      ? `<button type="button" class="btn-guardar rounded-lg px-3 py-1 text-xs font-semibold text-white transition" style="background: var(--accent);" data-id="${esc(id)}" title="Guardado en Mis procesos (${esc(est === "presentado" ? "me presenté" : est === "descartado" ? "descartado" : "me interesa")}). Pulse para quitarlo.">Guardado ✓</button>`
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
      }
      // repintar el botón de ESA tarjeta y la sección de Mi empresa (si ya arrancó;
      // si no, se invalida lo cargado para que la próxima apertura vuelva a pedir)
      const l = filaDeLista(id);
      if (btn && l) btn.outerHTML = botonGuardar(l);
      seguimientoCargadoPara = null;
      cargarSeguimiento({ forzar: true });
    } catch (e) {
      if (btn) { btn.disabled = false; btn.textContent = "No se pudo"; btn.title = e.message; }
    }
  }
  async function cargarSeguimiento({ forzar = false } = {}) {
    const perfil = $("f-perfil").value;
    if (!forzar && seguimientoCargadoPara === perfil) return;
    let r = null;
    try { r = await api(`/api/perfil?op=seguimiento&perfil=${encodeURIComponent(perfil)}`); } catch (e) { mensajeSeg(e.message, "error"); return; }
    if (!r || !r.ok) return;
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
    const tipo = { cambio: "Cambió", manifestacion: "Manifestar interés", cierre: "Cierre", aviso: "Aviso" };
    ul.innerHTML = as.map((a) => `<li class="flex flex-wrap items-start gap-2 rounded-xl px-3 py-2 ring-1 ring-inset ring-gray-900/5" style="background: var(--bg-inset);">
        <span class="mt-0.5 rounded-full px-2 py-0.5 text-[11px] font-medium ${clr[a.urgencia] || clr.baja}">${esc(tipo[a.tipo] || a.tipo)}</span>
        <span class="min-w-0 flex-1"><button type="button" data-seg-ir="${esc(a.id)}" class="titulo-tarjeta font-medium hover:underline text-left" title="${esc(a.proceso)}">${esc(a.proceso)}</button><br><span class="text-xs text-gray-600">${esc(a.mensaje)}</span></span>
        ${a.tipo === "cambio" ? `<button type="button" data-seg-enterado="${esc(a.id)}" class="rounded-lg border border-gray-300 bg-white px-2 py-0.5 text-[11px] font-medium hover:bg-gray-50" title="Dar por visto: el próximo aviso será solo si vuelve a cambiar">Enterado</button>` : ""}
      </li>`).join("");
  }
  function pintarSeguimiento(r) {
    ultimoSeguimiento = r;
    const lista = $("seg-lista"), vacio = $("seg-vacio"), res = $("seg-resumen"), filtros = $("seg-filtros");
    if (!lista) return;
    const todos = r.procesos || [];
    pintarInsigniaSeguimiento(r.resumen ? r.resumen.atencion : 0);
    vacio.classList.toggle("hidden", todos.length > 0);
    const rs = r.resumen || {};
    res.innerHTML = todos.length ? [
      `<span class="rounded-full bg-gray-100 px-2.5 py-1 text-gray-700">${todos.length} guardado${todos.length === 1 ? "" : "s"}</span>`,
      `<span class="rounded-full bg-gray-100 px-2.5 py-1 text-gray-700">${rs.abiertos} abierto${rs.abiertos === 1 ? "" : "s"}</span>`,
      rs.presentados ? `<span class="rounded-full px-2.5 py-1 text-white" style="background: var(--accent);">${rs.presentados} presentado${rs.presentados === 1 ? "" : "s"}</span>` : "",
      rs.cambios_pendientes ? `<span class="rounded-full bg-red-100 px-2.5 py-1 text-red-700">${rs.cambios_pendientes} cambio${rs.cambios_pendientes === 1 ? "" : "s"} sin ver</span>` : "",
      rs.manifestaciones_abiertas ? `<span class="rounded-full bg-amber-100 px-2.5 py-1 text-amber-900">${rs.manifestaciones_abiertas} con manifestación de interés abierta</span>` : "",
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
      const manif = m && m.aplica ? (m.vencida === false
        ? `<span class="rounded-full px-2 py-0.5 text-[11px] ${m.quedan_habiles != null && m.quedan_habiles <= 2 ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-900"}" title="${esc(m.nota || "")}">Manifestar interés hasta ${esc(m.vence_legible || "")}${m.dias_calendario === 0 ? " · HOY" : m.dias_calendario === 1 ? " · mañana" : ` · ${m.quedan_habiles} días hábiles`}</span>`
        : m.vencida === true ? `<span class="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] text-gray-600" title="${esc(m.nota || "")}">Manifestación de interés: plazo vencido ${esc(m.vence_legible || "")}</span>`
          : `<span class="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] text-amber-900">Manifestación de interés: fecha por confirmar</span>`) : "";
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
          <select data-seg-estado="${esc(p.id)}" class="control-select rounded-lg text-xs" title="Etapa en su seguimiento">
            ${estados.map((e) => `<option value="${e}" ${p.estado === e ? "selected" : ""}>${esc(r.estados[e] || e)}</option>`).join("")}
          </select>
        </div>
        <div class="mt-2 flex flex-wrap items-center gap-2">${cierre}${manif}${hitos}</div>
        ${aviso}
        ${cambios}
        <div class="mt-3 flex flex-wrap items-center gap-2 text-xs">
          <button type="button" data-seg-ics="${esc(p.id)}" class="rounded-lg border border-gray-300 px-2.5 py-1 font-medium transition hover:bg-gray-50" title="Descargar el cronograma con alarmas a 7, 3 y 1 días (formato de calendario)">Calendario (.ics)</button>
          ${p.proponentes_disponibles ? `<button type="button" data-seg-detalle="${esc(p.id)}" class="rounded-lg px-2.5 py-1 font-medium text-white transition" style="background: var(--accent);">Quiénes se presentaron</button>` : `<span class="text-gray-400" title="Los proponentes solo aparecen en la fuente pública tras la apertura de ofertas">Los proponentes se conocen cuando cierra</span>`}
          <button type="button" data-seg-quitar="${esc(p.id)}" class="ml-auto text-gray-400 hover:text-red-600">Quitar</button>
        </div>
        <div data-seg-caja="${esc(p.id)}" class="mt-3 hidden"></div>
      </article>`;
    }).join("");
    if (!ps.length && todos.length) lista.innerHTML = `<p class="text-sm text-gray-500">Ningún proceso en esa etapa.</p>`;
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
        <thead class="text-left text-[10px] uppercase tracking-wide text-gray-400"><tr><th class="pb-1 pr-3">Proponente</th><th class="pb-1 pr-3 text-right">Veces ante esta entidad</th><th class="pb-1 pr-3 text-right">Ganadas · último</th><th class="pb-1 pr-3 text-right">Contratos vigentes</th><th class="pb-1"></th></tr></thead>
        <tbody class="divide-y divide-gray-100">${filas}</tbody></table></div>
      <p class="mt-2 text-[11px] text-gray-400">«Contratos vigentes» es el valor que ese competidor ya tiene comprometido, no la capacidad que le queda: calcularla exige su registro de proponente, que no es público. Las ganadas se cruzan por NIT de la entidad, que a veces se comparte entre regionales.</p>`;
  }
  const secSeg = document.getElementById("tab-seguimiento") || document.getElementById("seccion-seguimiento");
  if (secSeg) {
    secSeg.addEventListener("change", async (ev) => {
      const sel = ev.target.closest("[data-seg-estado]");
      if (!sel) return;
      const id = sel.getAttribute("data-seg-estado");
      try { await api("/api/perfil?op=seguimiento", { method: "POST", body: { perfil: $("f-perfil").value, id, estado: sel.value } }); guardados.set(id, sel.value); mensajeSeg("Estado actualizado.", "ok"); setTimeout(() => mensajeSeg(""), 2000); cargarSeguimiento({ forzar: true }); }
      catch (e) { mensajeSeg(e.message, "error"); }
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
        catch (e) { en.disabled = false; mensajeSeg(e.message, "error"); }
        return;
      }
      const q = ev.target.closest("[data-seg-quitar]");
      if (q) { await alternarGuardado(q.getAttribute("data-seg-quitar"), null); return; }
      const ics = ev.target.closest("[data-seg-ics]");
      if (ics) {
        const id = ics.getAttribute("data-seg-ics");
        try {
          const r = await fetch(`/api/perfil?op=seguimiento&perfil=${encodeURIComponent($("f-perfil").value)}&ics=${encodeURIComponent(id)}`, { headers: { "x-historico-token": leerToken() } });
          if (!r.ok) throw new Error(`El servidor respondió ${r.status}.`);
          const blob = await r.blob(); const url = URL.createObjectURL(blob);
          const a = document.createElement("a"); a.href = url; a.download = `detekta_${id.replace(/[^A-Za-z0-9._-]/g, "_")}.ics`; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 5000);
        } catch (e) { mensajeSeg(e.message, "error"); }
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
        catch (e) { caja.innerHTML = `<p class="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">${esc(e.message)}</p>`; }
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
    el.textContent = texto;
  }

  /* ─────────────────────────── estado ──────────────────────────────── */
  let CATALOGO = null;      // respuesta de /api/apu/catalogo
  let PARAMETROS = null;    // respuesta de /api/apu?op=parametros (Fase 1: jornada, prestaciones, EPP)
  let filas = [];           // [{item_id, descripcion, unidad, cantidad, rendimiento_override}]
  let ultimoCalculo = null; // respuesta de /api/apu/calcular
  let idActual = null;      // id del presupuesto cargado/guardado
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
        <td class="py-1 pr-2"><span class="inline-flex rounded-full px-2 py-0.5 text-[10px] ring-1 ring-inset ${e.clases}">${e.texto}</span></td>
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
      <p class="mt-3 text-[11px] text-gray-400">Fórmulas completas y estado de verificación en docs/metodologia.md. Los valores de tiempo pagado no trabajado y su mayor valor prestacional vienen de metodologías públicas del sector (IDU e INVIAS) por fuentes secundarias: son referencia mientras no se contrasten con el manual original.</p>`;
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
        <td class="py-1 pr-2">${esc(c.nombre)}${c.base === "cesantias" ? '<span class="block text-[10px] text-gray-400">12 % de las cesantías, ya convertido a % del salario</span>' : ""}</td>
        <td class="py-1 pr-2 text-right num font-medium">${pct(c.pct)}</td>
        <td class="py-1 pr-2 text-gray-500">${esc((p.grupos || {})[c.grupo] || c.grupo)}</td>
        <td class="py-1 text-gray-500">${esc(c.norma)}<span class="block text-[10px] text-gray-400">${esc(c.detalle || "")}</span></td>
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
          <thead class="text-left text-[10px] uppercase tracking-wide text-gray-400">
            <tr><th class="pb-1 pr-2">Componente</th><th class="pb-1 pr-2 text-right">Tasa</th>
                <th class="pb-1 pr-2">Grupo</th><th class="pb-1">Norma</th></tr>
          </thead>
          <tbody class="divide-y divide-gray-100">${filas}</tbody>
        </table>
      </div>
      <table class="mt-3 w-full max-w-md text-xs">
        <tbody class="divide-y divide-gray-100">${totales}</tbody>
      </table>
      <p class="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-[11px] text-amber-900">${esc(p.como_leerlo || "")}</p>
      <p class="mt-2 text-[11px] text-gray-500"><strong>Exoneración:</strong> ${esc(p.exoneracion.condicion)}
        <span class="block text-gray-400">${esc(p.exoneracion.norma)}</span></p>
      <p class="mt-2 text-[11px] text-gray-500"><strong>Procedencia del factor:</strong> ${esc(p.procedencia || "")}</p>
      <p class="mt-1 text-[11px] text-gray-500">${esc(p.atado_a_calibracion || "")}</p>

      <h3 class="mt-5 text-xs font-semibold uppercase tracking-wide text-gray-500">AIU · bandas típicas</h3>
      <table class="mt-1 w-full text-xs">
        <tbody class="divide-y divide-gray-100">
          ${Object.values(n.aiu || {}).map((a) => `<tr class="align-top">
            <td class="py-1 pr-2">${esc(a.nombre)}<span class="block text-[10px] text-gray-400">${esc(a.detalle)}</span></td>
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
            <td class="py-1 pr-2">${esc(d.nombre)}<span class="block text-[10px] text-gray-400">${esc(d.detalle)}</span></td>
            <td class="py-1 pr-2 text-right num whitespace-nowrap">${d.pct == null ? "según la entidad" : pct(d.pct)}</td>
            <td class="py-1 text-gray-500">${esc(d.norma)}</td>
          </tr>`).join("")}
        </tbody>
      </table>
      <p class="mt-3 rounded-lg bg-gray-100 px-3 py-2 text-[11px] text-gray-600"><strong>Atención:</strong> ${esc(p.advertencia || "")}</p>`;
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
      pintarInferencia({ estado: "no_determinada", mensaje: `No se pudo detectar: ${e.message}` });
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
        ? `<div class="${capAnterior == null ? "" : "mt-1 border-t border-gray-100 "}px-3 pb-0.5 pt-1.5 text-[10px] font-medium uppercase tracking-wide text-gray-400">${esc(cap)}</div>`
        : "";
      capAnterior = cap;
      return `${cabecera}<button type="button" data-cod="${esc(it.codigo)}" data-n="${n}"
          class="block w-full px-3 py-1.5 text-left text-xs transition hover:bg-gray-100">
          <span class="font-medium">${esc(it.es_invias ? String(it.descripcion).split("(")[0].trim() : it.descripcion)}</span>
          <span class="block text-[10px] text-gray-400">${it.es_invias ? `Ítem de pago INVIAS ${esc(it.item_de_pago)} · referencia oficial` : it.es_idu ? `APU IDU ${esc(it.codigo_idu)} · precio de referencia Bogotá` : esc(it.codigo)} · ${esc(it.unidad || "—")}</span>
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
      ? `${pesos(r.precio_con_iva)} <span class="text-[10px] text-gray-400">con IVA</span>`
      : `${pesos(r.precio)}${r.iva === "sin_iva" ? ' <span class="text-[10px] text-gray-400">sin IVA</span>' : ""}`;
    const norm = r.normalizado ? `<span class="text-[10px] text-gray-400"> (&asymp; ${pesos(r.normalizado.precio)}/${esc(r.normalizado.unidad)})</span>` : "";
    const titulo = `${r.producto || ""} · ${r.unidad_fuente || ""}${r.correspondencia === "aproximada" ? ` · producto similar: ${r.correspondencia_nota || "verificar equivalencia"}` : ""}`;
    return `<span class="block num text-sm font-medium text-blue-950" title="${esc(titulo)}">${precio}${norm}</span>
      <span class="block text-[10px] text-gray-500" title="${esc(titulo)}">${esc(r.fuente)} · ${esc(r.ambito)} · ${esc(r.vigencia_impresa ? `lista ${r.vigencia_impresa}` : r.capturado_el || "")}${
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
                 class="edit w-24 rounded border border-gray-200 px-2 py-1 text-right num">
        </td>
        <td class="py-2 pr-3 text-right">
          <input type="number" min="0" step="any" data-campo="precio" data-fila="${i}"
                 value="${f.precio_manual == null ? "" : f.precio_manual}"
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
          <p class="mt-2 text-[11px] text-gray-400">El rendimiento DIVIDE: bajarlo encarece la mano de obra sin tocar los materiales.</p>
          <!-- El APU insumo por insumo se pinta AL EXPANDIR (ver pintarInsumos):
               con 200-300 items, meter aqui ~10 filas por item son miles de nodos
               que nadie esta mirando. -->
          <div data-celda="insumos-${i}" class="mt-3"></div>
        </td>
      </tr>`;
    }).join("");

    if (ultimoCalculo) pintarCalculoEnTabla(ultimoCalculo);
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
      }
      if (filas[i].precio_manual == null && filas[i].origen_precio === "manual") {
        filas[i].origen_precio = null;
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
      return `<span class="block text-[10px] text-blue-900/70">Techo ${esc(r.fuente)} · ${precio}${norm} · ${esc(r.unidad_fuente)} · ${esc(r.ambito)} · ${cuando}${
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
    return `<span class="block text-[10px] text-emerald-900/70" title="${esc(detalle)}">Oficial INVIAS ${esc(r.vigencia)} · ${pesos(r.precio)}${norm} · ${esc(r.unidad_fuente)} · ${esc(r.alcance)}${
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
          <td class="py-1 pr-2">${esc(l.nombre)}${l.nota ? `<span class="block text-[10px] text-gray-400">${esc(l.nota)}</span>` : ""}${techoRetailHtml(l)}${referenciaInviasHtml(l)}</td>
          <td class="py-1 pr-2 text-gray-500">${esc(l.unidad)}</td>
          <td class="py-1 pr-2 text-right num">${l.cantidad == null ? "—" : num(l.cantidad)}</td>
          <td class="py-1 pr-2 text-right num">${pesos(l.precio)}</td>
          <td class="py-1 text-right num font-medium">${pesos(l.valor)}</td>
        </tr>`).join("")
        + (hm == null ? "" : `
        <tr class="align-top">
          <td class="py-1 pr-2">Herramienta menor<span class="block text-[10px] text-gray-400">${num(det.herramienta_menor_pct * 100)} % de la mano de obra</span></td>
          <td class="py-1 pr-2 text-gray-500">%</td>
          <td class="py-1 pr-2 text-right num">—</td>
          <td class="py-1 pr-2 text-right num">—</td>
          <td class="py-1 text-right num font-medium">${pesos(hm)}</td>
        </tr>`);
      return `
        <div>
          <p class="text-[11px] font-semibold uppercase tracking-wide text-gray-500">${esc(RUBROS_APU.find((x) => x[0] === tipo)[1])}</p>
          <table class="mt-1 w-full text-[11px]">
            <thead class="text-left text-[10px] uppercase tracking-wide text-gray-400">
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
      ? `<p class="mb-3 rounded-lg bg-sky-50 px-3 py-2 text-[11px] text-sky-900">APU de referencia oficial INVIAS ${esc(ra.vigencia)} · ítem de pago ${esc(ra.item_de_pago)}${ra.articulo ? ` (${esc(ra.articulo)})` : ""}. `
        + `Costo directo de la provincia ${esc(ra.provincia_representativa.provincia)} (${esc(ra.provincia_representativa.departamento)}), la de precio mediano entre las ${ra.provincias_usadas} `
        + `${ra.nivel === "nacional" ? "del país (su departamento no tiene libro INVIAS)" : "de su departamento"}. `
        + `Las cantidades y rendimientos son los oficiales; los precios de las líneas son los de ${esc(ra.provincia_referencia_composicion || "la provincia de referencia")} llevados al nivel de esa provincia. Es una referencia, no una cotización.</p>`
      : "";

    const re = it && it.referencia_epc_apu;
    const notaEpc = re
      ? `<p class="mb-3 rounded-lg bg-sky-50 px-3 py-2 text-[11px] text-sky-900">APU de referencia oficial de Empresas Públicas de Cundinamarca ${esc(re.vigencia || "")} · actividad ${esc(re.numeral || "")}. `
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
      msgApu(`No se pudo calcular: ${e.message}`, "error");
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
      $("baja-nota").textContent = `No se pudo consultar: ${err.message}`;
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
    return { items, aiu: { administracion_pct: cfg.aiu_pct, imprevistos_pct: cfg.imprevistos_pct, utilidad_pct: cfg.utilidad_pct }, total: r ? Number(r.precio_final) : null };
  }
  async function revisarOferta() {
    const caja = $("revision-oferta");
    caja.classList.remove("hidden");
    if (!filas.length) { caja.innerHTML = `<p class="text-sm text-gray-600">No hay ítems en el paso 3: no hay oferta que revisar.</p>`; return; }
    if (!ultimoCalculo) { caja.innerHTML = `<p class="text-sm text-gray-600">Primero pulse «Calcular cuánto me cuesta»: la revisión necesita el precio de cada ítem y el total.</p>`; return; }
    caja.innerHTML = `<p class="text-sm text-gray-500">Revisando…</p>`;
    const formulario = window.__pliegoUltimo && Array.isArray(window.__pliegoUltimo.items) && window.__pliegoUltimo.items.length ? { items: window.__pliegoUltimo.items } : null;
    const tope = $("rev-tope-aiu").value.trim(), secopTotal = $("rev-secop-total").value.trim();
    let r;
    try {
      r = await api("/api/pliego?op=formulario1", { method: "POST", body: {
        oferta: ofertaParaRevision(), formulario, presupuesto_oficial: Number($("cuantia").value) || null,
        tope_aiu_pct: tope === "" ? null : Number(tope), secop: secopTotal === "" ? null : { total: Number(secopTotal) },
        id_proceso: $("id-proceso").value.trim() || null, perfil: $("perfil").value || null,
      } });
    } catch (e) { caja.innerHTML = `<p class="text-sm text-red-700">${esc(e.message)}</p>`; return; }
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
  $("btn-guardar").addEventListener("click", async () => {
    if (!filas.length) { msgApu("No hay ítems que guardar.", "error"); return; }
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
      if (!r) return;
      idActual = r.id;
      msgApu(`Guardado como «${r.nombre}» (id ${r.id}). ${r.nota}`, "ok");
    } catch (e) {
      msgApu(`No se pudo guardar: ${e.message}`, "error");
    } finally {
      btn.disabled = false;
    }
  });

  $("btn-listar").addEventListener("click", async () => {
    const caja = $("lista-presupuestos");
    try {
      const r = await api(`/api/apu?op=listar&perfil=${encodeURIComponent($("perfil").value)}`);
      if (!r) return;
      caja.classList.remove("hidden");
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
      msgApu(`No se pudo listar: ${e.message}`, "error");
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
          origen_precio: f.origen_precio === "archivo" || f.origen_precio === "manual" ? f.origen_precio : null,
          subcontratado: f.subcontratado === true,
          aiu_subcontratista_pct: f.subcontratado === true ? numONull(f.aiu_subcontratista_pct) : null,
          sugerencia: f.sugerencia == null ? null : String(f.sugerencia).slice(0, 200),
        };
      });
      ultimoCalculo = null;
      pintarTabla();
      $("seccion-resumen").classList.add("hidden");
      $("lista-presupuestos").classList.add("hidden");
      msgApu(r.catalogo_cambiado
        ? `Cargado «${p.nombre}». Atención: ${r.nota}`
        : `Cargado «${p.nombre}». Pulse «Calcular cuánto me cuesta» para ver los totales.`, r.catalogo_cambiado ? "error" : "ok");
    } catch (err) {
      msgApu(`No se pudo cargar: ${err.message}`, "error");
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
      msgApu(`No se pudo generar el Excel: ${e.message}`, "error");
    }
  });


  /* ════════════════════ Importación desde Excel/CSV ════════════════════
     El archivo se lee EN EL NAVEGADOR (public/xlsx_lectura.js): al servidor
     viajan solo las filas estructuradas, que `/api/apu/importar` mapea contra
     el catálogo calibrado. La vista previa enseña el mapeo ANTES de tocar la
     tabla, y una sugerencia ÁMBAR («revisar») solo cobra precio del catálogo si su
     casilla queda marcada — nunca se usa automáticamente una lista a medias. */
  let importacion = null;

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
      const r = await api("/api/apu?op=importar", {
        method: "POST",
        body: { filas: crudas.filas, departamento: $("departamento").value },
      });
      if (!r) return;                       // canceló el diálogo del token
      importacion = { ...r, avisos_lectura: crudas.avisos || [], cuadre: crudas.cuadre || null, nombre_archivo: archivo.name };
      abrirModalImportar();
    } catch (err) {
      msgApu(`No se pudo importar: ${err.message}`, "error");
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
      const variantes = (f.variantes || []).length
        ? ` <span class="text-[10px] text-gray-400" title="${esc((f.variantes || []).map((v) => `${v.codigo}: ${v.descripcion}`).join("\n"))}">(+${f.variantes.length} variante${f.variantes.length === 1 ? "" : "s"} de la misma cabecera; se tomó la primera)</span>` : "";
      return `<span class="text-xs text-gray-600">${esc(desc)}</span> <span class="text-[10px] text-gray-400">· ${banco}</span>${variantes}`;
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
        <td class="px-2 py-1.5">${f.capitulo ? `<span class="block text-[10px] uppercase text-gray-400">${esc(f.capitulo)}</span>` : ""}${esc(f.descripcion)}</td>
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
    $("mapeo-tabla").innerHTML = `<tr class="bg-gray-50 text-[10px] uppercase tracking-wide text-gray-400">`
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
      const r = await api("/api/apu?op=importar", {
        method: "POST",
        body: { filas: filasMapeadas, departamento: $("departamento").value },
      });
      if (!r) return;
      importacion = { ...r, avisos_lectura: [`Columnas mapeadas a mano sobre «${mapeoPendiente.nombre}».`], nombre_archivo: mapeoPendiente.nombre };
      cerrarMapeo();
      abrirModalImportar();
    } catch (err) {
      aviso(`No se pudo importar con ese mapeo: ${err.message}`);
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
    for (const id of ["seccion-resumen", "seccion-rentabilidad", "seccion-precio-sugerido", "seccion-piso-techo", "r-validaciones"]) {
      if ($(id)) $(id).classList.add("hidden");
    }
    ultimaRentabilidad = null;
    const inf = $("inferencia");
    if (inf) { inf.classList.add("hidden"); inf.innerHTML = ""; }
    pintarTabla();
    msgApu("Se abrió otro proceso: el editor quedó limpio. Los borradores guardados no se tocan.", "info");
  }

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
    poner("plazo-meses", "plazo");
    const perfil = p.get("perfil");
    if (perfil && $("perfil") && [...$("perfil").options].some((o) => o.value === perfil)) $("perfil").value = perfil;
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
      pintarPrecioSugerido(c.optimizador);
      msgApu(auto ? "Rentabilidad y precio sugerido actualizados." : "Rentabilidad actualizada.", "ok");
    } catch (e) {
      msgApu(`No se pudo calcular la rentabilidad: ${e.message}`, "error");
      /* También en automático hay que dejar rastro visible: si no, tras pulsar
         «Calcular APU» el recuadro simplemente no aparecería y el dueño no
         tendría forma de distinguir «falló» de «este proceso no da para
         sugerir un precio». */
      pintarPrecioSugerido({ aplicable: false, mensaje: `No se pudo calcular el precio sugerido: ${e.message}` });
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
      sin.textContent = pt && pt.veredicto ? pt.veredicto : "No se pudo armar el panel: falta el presupuesto oficial del proceso o el costo.";
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
    t.push(tarjetaRent("Valor esperado de la ganancia", copRent(r.veg),
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
  function pintarPrecioSugerido(o) {
    const sec = $("seccion-precio-sugerido");
    const sin = $("ps-sin-datos");
    const cuerpo = $("ps-cuerpo");
    sec.classList.remove("hidden");
    ultimoOptimizador = o && o.aplicable ? o : null;

    if (!o || !o.aplicable) {
      cuerpo.classList.add("hidden");
      sin.classList.remove("hidden");
      sin.textContent = `● ${(o && o.mensaje) || "No hay con qué sugerir un precio para este proceso."}`;
      $("ps-origen").textContent = "";
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
        : `Frente a su precio actual: ${copRent(comp.diferencia_veg)} de VEG`)
      : "";

    // el color del VEG es información: en rojo cuando ni el mejor precio del
    // rango cubre el costo de preparar la oferta
    $("ps-veg").className = `mt-1 text-2xl font-semibold tabular-nums ${o.sin_punto_rentable ? "text-red-700" : ""}`;

    /* ---- las tres opciones ----
       `opc` y `meseta` se declaran ANTES de `fila`, que las lee: declaradas
       después caerían en la zona muerta temporal en cuanto `fila` se llamara
       desde el `.map` de abajo. Es la misma lección del arranque automático,
       en pequeño y dentro de una función. */
    const opc = o.opciones || {};
    const meseta = opc.meseta || {};
    const fila = (clave, p) => {
      if (!p) return "";
      const destacada = clave === "optimo";
      /* Cuando la meseta está pegada al máximo por un lado, esa opción ES el
         óptimo. Repetir la fila sin decirlo se lee como un fallo de pintado;
         decirlo es información: moverse en esa dirección ya cuesta caro. */
      const igual = !destacada && p.descuento === op.descuento;
      const nota = igual
        ? `Coincide con el óptimo: moverse hacia ahí ya cuesta más del ${num(meseta.tolerancia_pct)} % del valor esperado.`
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
      ? `El óptimo es agudo: moverse un solo paso cuesta más del ${num(meseta.tolerancia_pct)} % del valor esperado, `
        + "así que las tres opciones coinciden."
      : `Meseta del valor esperado: entre ${pctRent(meseta.desde_pct)} y ${pctRent(meseta.hasta_pct)} de baja `
        + `(${num(meseta.ancho_pp)} pp) el VEG no cae más del ${num(meseta.tolerancia_pct)} %. Dentro de esa banda `
        + "la elección es de apetito de riesgo, no de aritmética.";

    /* ---- el botón principal ---- */
    const btn = $("btn-aplicar-descuento");
    btn.disabled = !op.aplicable_al_apu;
    $("ps-aplicar-nota").textContent = op.aplicable_al_apu
      ? `Escribe ${num(op.descuento_apu_pct)} % en «Factor de baja» (sobre su precio de venta) y recalcula: `
        + `el APU dará ${copRent(op.precio_apu_resultante)}.`
      : "No aplicable: el precio óptimo está por encima de su precio de venta. El ajuste competitivo solo baja.";

    $("ps-curva").innerHTML = curvaSVG(o);
    $("ps-alertas").innerHTML = (o.alertas || [])
      .map((x) => `<p class="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900">${esc(x)}</p>`).join("");
  }

  /* Curva VEG vs descuento en SVG en línea. Sin librería: el proyecto no tiene
     dependencias y una polilínea no justifica la primera. Marca el óptimo y
     —cuando cae dentro del rango— el precio vigente, que es lo que convierte la
     gráfica en «dónde estoy y a dónde debería moverme». */
  function curvaSVG(o) {
    const pts = (o.curva || []).filter((p) => Number.isFinite(p.veg) && Number.isFinite(p.descuento));
    if (pts.length < 2) return "";
    const W = 720, H = 180, mL = 64, mR = 14, mT = 14, mB = 30;
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

    /* colores de la paleta Apple: acento #007AFF, textos #86868b — el SVG no
       hereda las custom properties del tema, así que van literales */
    return `<svg viewBox="0 0 ${W} ${H}" class="h-44 w-full min-w-[560px]" role="img"
      aria-label="Valor esperado de la ganancia según el descuento sobre el presupuesto oficial">
      <line x1="${mL}" y1="${cero.toFixed(1)}" x2="${W - mR}" y2="${cero.toFixed(1)}" stroke="rgba(134,134,139,0.45)" stroke-dasharray="3 3"/>
      <polyline points="${linea}" fill="none" stroke="#007AFF" stroke-width="2"/>
      <line x1="${px(op.descuento).toFixed(1)}" y1="${mT}" x2="${px(op.descuento).toFixed(1)}" y2="${H - mB}"
            stroke="#007AFF" stroke-width="1" stroke-dasharray="2 3"/>
      <circle cx="${px(op.descuento).toFixed(1)}" cy="${py(op.veg).toFixed(1)}" r="4" fill="#007AFF"/>
      ${dentro ? `<circle cx="${px(actual.descuento).toFixed(1)}" cy="${py(actual.veg).toFixed(1)}" r="4"
            fill="none" stroke="#86868b" stroke-width="2"/>` : ""}
      <text x="${mL}" y="${H - 10}" font-size="11" fill="#86868b">${esc(nf2.format(x0))} %</text>
      <text x="${W - mR}" y="${H - 10}" font-size="11" fill="#86868b" text-anchor="end">${esc(nf2.format(x1))} %</text>
      <text x="${px(op.descuento).toFixed(1)}" y="${H - 10}" font-size="11" fill="#007AFF" text-anchor="middle">óptimo ${esc(nf2.format(op.descuento))} %</text>
      <text x="4" y="${(py(y1) + 4).toFixed(1)}" font-size="11" fill="#86868b">${esc(copRent(y1))}</text>
      ${cero - py(y1) >= 14 ? `<text x="4" y="${(cero + 4).toFixed(1)}" font-size="11" fill="#86868b">$0</text>` : ""}
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

  async function arrancar() {
    const hayProceso = precargarDesdeURL();
    // envuelto en una flecha a propósito: pasarla directa le entregaría el
    // MouseEvent como opciones y `{auto}` se leería de un objeto que no lo es
    $("btn-rentabilidad").addEventListener("click", () => calcularRentabilidad());
    if ($("btn-justificacion")) $("btn-justificacion").addEventListener("click", descargarJustificacion);
    sincronizarBaja();
    pintarTabla();
    try {
      await cargarCatalogo();
      pintarTabla(); // el catálogo aporta los rendimientos por defecto del placeholder
    } catch (e) {
      msgApu(`No se pudo cargar el catálogo: ${e.message}`, "error");
    }
    // el departamento del proceso solo se puede fijar cuando el catálogo ya
    // llenó el desplegable: antes no existe la opción que hay que seleccionar
    if (hayProceso) precargarDesdeURL();
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
  function completar(cuerpo) {
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
  async function llamarConReintentos(modo) {
    const presupuesto = $("f-presupuesto").value;
    for (let intento = 0; intento <= BACKOFF_MS.length; intento++) {
      if (!activo) return null;
      let r = null, cuerpo = null, fallo = null;
      try {
        r = await fetch(`/api/procesos?op=sync&modo=${modo}&presupuesto=${presupuesto}`, { headers: { Accept: "application/json" } });
        cuerpo = await leerJson(r); // el muro del edge devuelve HTML
      } catch (e) {
        fallo = e && e.message ? e.message : "sin conexión";
      }
      if (!activo) return null;

      if (r && (r.status === 401 || r.status === 403)) {
        mensaje("El despliegue rechazó la petición (401/403). Si tiene Password Protection activa, inicie sesión en Vercel en esta misma pestaña y reintente.", "error");
        return null;
      }
      if (r && r.ok && cuerpo && cuerpo.ok) return cuerpo;

      // 4xx con cuerpo: error de uso, no se reintenta
      if (r && !r.ok && r.status < 500 && cuerpo && cuerpo.error) {
        mensaje(`El servidor rechazó la sincronización: ${cuerpo.error}`, "error");
        return null;
      }

      const detalle = fallo || (cuerpo && cuerpo.error) || (r ? `HTTP ${r.status}` : "respuesta ilegible");
      if (intento === BACKOFF_MS.length) {
        mensaje(`La sincronización falló tras ${BACKOFF_MS.length} reintentos: ${detalle}. El avance quedó guardado: puede volver a iniciar.`, "error");
        bitacora(`✘ ${detalle} — reintentos agotados`);
        return null;
      }
      bitacora(`⚠ ${detalle} — reintento ${intento + 1}/${BACKOFF_MS.length}`);
      if (!(await esperar(BACKOFF_MS[intento], "Reintentando"))) return null;
    }
    return null;
  }

  /* ══════════ Bucle principal ══════════ */
  async function encadenar() {
    // 1.ª tanda: full (reinicia). Siguientes: auto (continúa) — ver cabecera.
    let modo = "full";
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
        bitacora(cuerpo.alDia
          ? "✔ los datos ya estaban al día"
          : `✔ carga completa · ${fmt.format(cuerpo.total || 0)} guardadas de ${fmt.format(cuerpo.leidas || 0)} leídas`);
        estado("Completado");
        mensaje(cuerpo.alDia
          ? "Sincronización completada: los datos ya estaban al día."
          : `Sincronización completada en ${tandas} tanda${tandas === 1 ? "" : "s"}. ${fmt.format(cuerpo.total || 0)} procesos guardados.`, "ok");
        activo = false;
        botones(false);
        return;
      }

      pintarProgreso(cuerpo.progreso);
      const p = cuerpo.progreso || {};
      bitacora(`tanda ${tandas} · ${p.mes || "?"} (${(p.mesIdx || 0) + 1}/${p.deMeses || "?"}) · ${fmt.format(p.leidasMes || 0)} filas · ${Math.round((cuerpo.duracionMs || 0) / 1000)} s`);
      modo = "auto"; // a partir de aquí SIEMPRE continuar, nunca reiniciar
      if (!(await esperar(ESPERA_ENTRE_TANDAS_MS, "Siguiente tanda"))) break;
    }
    if (!activo) return; // detenido por el usuario: el estado ya se pintó
  }

  function botones(corriendo) {
    $("btn-iniciar").disabled = corriendo;
    $("btn-detener").disabled = !corriendo;
    $("f-presupuesto").disabled = corriendo;
  }

  function detener(motivo) {
    activo = false;
    clearTimeout(timerEspera);
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
  $("btn-iniciar").addEventListener("click", iniciarFull);
  $("btn-detener").addEventListener("click", () => detener("usuario"));

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
  const COMPETENCIA_UI = {
    baja: { emoji: "●", texto: "Poca", clases: "bg-green-50 text-green-800" },
    media: { emoji: "●", texto: "Media", clases: "bg-amber-50 text-amber-800" },
    alta: { emoji: "●", texto: "Alta", clases: "bg-red-50 text-red-700" },
    sin_dato: { emoji: "●", texto: "Sin dato", clases: "bg-gray-50 text-gray-500" },
  };
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
  let pendientePorVisibilidad = false;

  function avisoDashboard(texto, tipo) {
    const p = $("d-aviso");
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
      return avisoDashboard(`No se pudo contactar el servidor: ${esc((e && e.message) || "sin conexión")}.`, "error");
    }
    cargandoDashboard(false);

    if (r.status === 401) {
      return avisoDashboard(msg401(cuerpo), "error");
    }
    if (r.status === 503) {
      return avisoDashboard(`${esc((cuerpo && cuerpo.error) || "Servicio no disponible")}. Puede iniciar una carga en la sección de sincronización, arriba.`, "error");
    }
    if (!r.ok || !cuerpo || !cuerpo.ok) {
      return avisoDashboard(esc((cuerpo && cuerpo.error) || `Error del servidor (${r.status}).`), "error");
    }
    avisoDashboard(cuerpo.mensaje ? esc(cuerpo.mensaje) : null, "aviso");
    ultimoResumen = cuerpo;
    // ANTES de pintar: `celdaApuProceso` consulta `apuListos` al construir la
    // fila, y si el listado llegara después el badge saldría una pintada tarde
    await cargarApuListos(perfil);
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
        decir(r.status === 401 ? msg401(c) : (c.error || `Error ${r.status}`), "bg-red-50 text-red-700");
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
      decir(`Sin respuesta del servidor: ${e.message}`, "bg-red-50 text-red-700");
    } finally {
      btn.disabled = false;
    }
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
    $("d-semana").textContent = fmt.format((t.por_urgencia || {}).cierra_esta_semana || 0);

    /* barras: divs con width en %, sin librerías */
    $("d-barras").innerHTML = BARRAS.map(([clave, etiqueta, color]) => {
      const n = per[clave] || 0;
      const p = pct(n, total);
      return `<div class="flex items-center gap-3 text-sm">
          <span class="w-32 shrink-0 text-gray-600">${etiqueta}</span>
          <div class="h-3 flex-1 overflow-hidden rounded-full bg-gray-100">
            <div class="barra h-full rounded-full ${color}" style="width:${p}%"></div>
          </div>
          <span class="w-24 shrink-0 text-right tabular-nums text-gray-500">${p} % (${fmt.format(n)})</span>
        </div>`;
    }).join("");

    /* entidades */
    const ent = (c.top_entidades || []).slice(0, 10);
    $("d-entidades").innerHTML = ent.length ? ent.map((e) => {
      const d = COMPETENCIA_UI[e.competencia] || COMPETENCIA_UI.sin_dato;
      return `<tr class="fila-entidad cursor-pointer align-top hover:bg-gray-50" data-entidad="${esc(e.entidad)}" title="Ver los procesos que sostienen este promedio">
          <td class="py-2 pr-2">${esc(e.entidad)}</td>
          <td class="py-2 pr-2 text-right tabular-nums">${fmt.format(e.procesos)}</td>
          <td class="py-2 pr-2"><span class="rounded-lg px-2 py-0.5 text-xs font-medium ${d.clases}">${d.emoji} ${d.texto}</span></td>
          <td class="py-2 text-right tabular-nums">${e.promedio_oferentes == null ? "—" : String(e.promedio_oferentes).replace(".", ",")}</td>
        </tr>`;
    }).join("") : '<tr><td colspan="4" class="py-3 text-gray-400">Sin entidades que mostrar.</td></tr>';

    /* departamentos: si el dataset no trae la columna, la tabla se OCULTA
       entera (una tabla vacía no informa, confunde) */
    const deps = Object.entries(c.totales.por_departamento || {});
    const hayDeps = deps.some(([k, n]) => n > 0 && k !== "SIN_DEPARTAMENTO");
    $("d-departamentos-box").classList.toggle("hidden", !hayDeps);
    if (hayDeps) {
      $("d-departamentos").innerHTML = deps.map(([dep, n]) => `<tr>
          <td class="py-2 pr-2">${esc(dep)}</td>
          <td class="py-2 pr-2 text-right tabular-nums">${fmt.format(n)}</td>
          <td class="py-2 text-right tabular-nums text-gray-500">${pct(n, total)} %</td>
        </tr>`).join("");
    }

    /* destacados */
    $("d-destacados-titulo").textContent = c.destacados_desde === "competencia_baja"
      ? "Top 10 procesos más atractivos (entidades con poca competencia)"
      : "Top 10 procesos más atractivos (aún sin histórico de competencia)";
    const dest = c.procesos_destacados || [];
    $("d-destacados").innerHTML = dest.length ? dest.map((p) => {
      const d = COMPETENCIA_UI[p.competencia] || COMPETENCIA_UI.sin_dato;
      const cierre = p.cierre ? new Date(p.cierre) : null;
      return `<tr class="fila-proceso align-top ${p.url ? "cursor-pointer hover:bg-gray-50" : ""}" data-url="${esc(p.url || "")}" title="${esc(p.badge || "")}">
          <td class="py-2 pr-2">${esc(p.objeto)}</td>
          <td class="py-2 pr-2 text-gray-500">${esc(p.entidad)}</td>
          <td class="py-2 pr-2 text-right tabular-nums">${fmtCOP.format(p.cuantia_cop || 0)}</td>
          <td class="py-2 pr-2 text-gray-500">${cierre && !isNaN(cierre) ? cierre.toLocaleDateString("es-CO", { day: "numeric", month: "short" }) : "—"}</td>
          <td class="py-2 pr-2"><span class="rounded-lg px-2 py-0.5 text-xs font-medium ${d.clases}">${d.emoji} ${d.texto}</span></td>
          <td class="py-2 pr-2 text-gray-500">${esc(p.pertinencia || "")}</td>
          <td class="py-2 whitespace-nowrap">${celdaApuProceso(p)}</td>
        </tr>`;
    }).join("") : '<tr><td colspan="7" class="py-3 text-gray-400">Ningún proceso cumple los criterios de destacado.</td></tr>';

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
    pintarCuentaAtras();
  }

  function pintarCuentaAtras() {
    const base = $("d-meta").dataset.base || "";
    const restan = Math.max(0, Math.round((proximoRefresco - Date.now()) / 1000));
    const mm = String(Math.floor(restan / 60)), ss = String(restan % 60).padStart(2, "0");
    $("d-meta").textContent = proximoRefresco ? `${base} · Próxima actualización en ${mm}:${ss}` : base;
  }

  /* Refresco automático cada 5 min SOLO con la pestaña visible: refrescar en
     segundo plano gasta invocaciones de Vercel para que nadie lo mire. Si la
     pestaña estaba oculta cuando tocaba, se refresca al volver a ella. */
  function programarRefresco() {
    clearTimeout(timerRefresco);
    clearInterval(timerCuenta);
    proximoRefresco = Date.now() + REFRESCO_MS;
    pintarCuentaAtras();
    timerCuenta = setInterval(pintarCuentaAtras, 1000);
    timerRefresco = setTimeout(() => {
      if (document.visibilityState === "visible") cargarDashboard();
      else pendientePorVisibilidad = true; // se hará al volver a la pestaña
    }, REFRESCO_MS);
  }
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState !== "visible") return;
    if (pendientePorVisibilidad || (proximoRefresco && Date.now() > proximoRefresco)) {
      pendientePorVisibilidad = false;
      cargarDashboard();
    }
  });

  $("btn-actualizar").addEventListener("click", () => cargarDashboard({ forzar: true }));
  $("d-baja-reconstruir").addEventListener("click", reconstruirBaja);
  $("d-perfil").addEventListener("change", () => {
    guardarPerfil($("d-perfil").value);
    ultimoResumen = null;   // otro perfil: sí conviene el esqueleto
    cargarDashboard();
  });

  /* Detalle de competencia de una entidad, en línea bajo su fila (el mismo
     /api/competencia-detalle que abre el modal de la app; aquí se despliega en
     la propia tabla en vez de duplicar el modal). */
  $("d-entidades").addEventListener("click", async (e) => {
    const fila = e.target.closest(".fila-entidad");
    if (!fila) return;
    const abierta = fila.nextElementSibling;
    if (abierta && abierta.classList.contains("detalle-entidad")) return abierta.remove();
    const entidad = fila.getAttribute("data-entidad");
    const tr = document.createElement("tr");
    tr.className = "detalle-entidad bg-gray-50";
    tr.innerHTML = '<td colspan="4" class="px-2 py-3 text-xs text-gray-500">Cargando el detalle…</td>';
    fila.after(tr);
    const celda = tr.firstElementChild;
    let r = null, cuerpo = null;
    try {
      r = await fetch(`/api/inteligencia?op=entidad&entidad=${encodeURIComponent(entidad)}`,
        { headers: { "x-historico-token": leerToken() } });
      cuerpo = await leerJson(r);
    } catch {
      celda.textContent = "No se pudo contactar el servidor.";
      return;
    }
    if (!r.ok || !cuerpo || !cuerpo.ok) {
      celda.textContent = (cuerpo && cuerpo.error) || `Error del servidor (${r.status}).`;
      return;
    }
    if (!cuerpo.encontrada) { celda.textContent = cuerpo.mensaje || "Sin procesos históricos de esta entidad."; return; }
    const i = cuerpo.indice || {};
    /* EL CAMPO ES `procesos_contados`, NO `total_procesos`.
       Aquí nació el «promedio 18,2 oferentes en 0 procesos» que se vio en
       producción: `/api/competencia-detalle` NUNCA ha devuelto `total_procesos`
       —ese nombre pertenece al OTRO payload, el `competencia_entidad` que
       embebe /api/oportunidades— así que `i.total_procesos || 0` valía 0
       SIEMPRE, con cualquier dato y con cualquier entidad. No era un dato malo:
       era un campo inexistente leído con un `|| 0` que lo disfrazaba de cero.
       De ahí la regla: si el conteo no viene, NO se pinta un 0 — se dice que no
       se sabe. Un `|| 0` sobre un campo ausente convierte «no sé» en «cero», y
       ese es el error que hay que no repetir. */
    const contados = Number(i.procesos_contados);
    const promedio = i.promedio_oferentes == null ? null : Number(i.promedio_oferentes);
    const conBase = Number.isFinite(contados) && contados > 0 && promedio != null && !isNaN(promedio);
    const lista = (cuerpo.procesos || []).slice(0, 8)
      .map((p) => `<li class="truncate">· ${esc(p.objeto)} — <span class="tabular-nums">${p.numero_ofertas}</span> oferente${p.numero_ofertas === 1 ? "" : "s"}</li>`)
      .join("");
    celda.innerHTML =
      `<p class="font-medium text-gray-700">${esc(cuerpo.entidad)} · nivel ${esc(i.nivel || "sin_dato")}`
      + (conBase
        ? ` · promedio ${String(promedio).replace(".", ",")} oferentes en ${contados} proceso${contados === 1 ? "" : "s"}`
        : " · sin procesos que sostengan un promedio")
      + "</p>"
      + (cuerpo.mensaje ? `<p class="mt-1 text-amber-700">${esc(cuerpo.mensaje)}</p>` : "")
      + (lista ? `<ul class="mt-2 space-y-0.5">${lista}</ul>` : "")
      + `<p class="mt-2 text-gray-400">${(cuerpo.excluidos || []).length} proceso(s) excluidos del promedio, con su motivo, en /api/competencia-detalle.</p>`;
  });

  // una fila de destacados lleva al proceso en SECOP II (es la ficha real)
  $("d-destacados").addEventListener("click", (e) => {
    // el botón «APU» vive DENTRO de la fila, así que su clic burbujea hasta
    // aquí: la guarda va ANTES de resolver la fila — sin ella, pulsarlo
    // abriría además la ficha de SECOP II en otra pestaña
    const apuBtn = e.target.closest(".btn-apu");
    if (apuBtn) {
      abrirEditorConProceso(new URLSearchParams(apuBtn.getAttribute("data-apu-q") || ""));
      return;
    }
    const fila = e.target.closest(".fila-proceso");
    if (!fila) return;
    const url = fila.getAttribute("data-url");
    if (url) window.open(url, "_blank", "noopener,noreferrer");
  });


  /* ══════════════════════════════════════════════════════════════════════════
     APU por proceso · botón de la fila y badge «APU listo»
     ──────────────────────────────────────────────────────────────────────────
     El botón abre /apu.html con el proceso precargado; el badge dice si ese
     proceso ya tiene un borrador guardado para el perfil elegido.

     EL LISTADO SE PIDE APARTE DE /api/resumen, cuya respuesta se cachea 300 s:
     un presupuesto recién guardado no puede tardar cinco minutos en encender el
     badge — es la misma razón por la que una carga de RUP borra esa caché.
     Aquí no hace falta borrar nada, porque no se cachea.

     `procesos_con_presupuesto` es una lista de PERTENENCIA, no un conteo: la
     pregunta es «¿este proceso tiene borrador?», y así el frontend no puede
     convertir un «no sé» en un cero con un `|| 0`. */
  let apuListos = new Set();

  async function cargarApuListos(perfil) {
    apuListos = new Set();
    const token = leerToken();
    if (!token) return;
    try {
      const r = await fetch(`/api/apu?op=listar&perfil=${encodeURIComponent(perfil)}`, {
        headers: { "x-historico-token": token, Accept: "application/json" }, cache: "no-store",
      });
      if (!r.ok) return; // el panel no puede caerse porque el listado de APU falle
      const c = await r.json().catch(() => null);
      if (c && c.ok && Array.isArray(c.procesos_con_presupuesto)) apuListos = new Set(c.procesos_con_presupuesto);
    } catch { /* sin conexión: se pinta sin badges, no se rompe el panel */ }
  }

  function celdaApuProceso(p) {
    const id = p.id_del_proceso;
    const listo = id != null && apuListos.has(String(id));
    const q = new URLSearchParams();
    if (p.objeto) q.set("objeto", p.objeto);
    if (p.entidad) q.set("entidad", p.entidad);
    if (p.nit_entidad) q.set("entidad_nit", p.nit_entidad);
    if (p.departamento_entidad) q.set("departamento", p.departamento_entidad);
    if (p.unspsc) q.set("unspsc", p.unspsc);
    if (p.cuantia_cop != null) q.set("cuantia", String(p.cuantia_cop));
    if (id != null) q.set("id_proceso", String(id));
    if (p.plazo_meses != null) q.set("plazo", String(p.plazo_meses));
    // la modalidad decide QUÉ baja de mercado se usa para fijar el precio: sin
    // ella el editor cotizaría contra la mediana mezclada de la entidad
    if (p.modalidad) q.set("modalidad", p.modalidad);
    q.set("perfil", $("d-perfil").value);
    return `<button type="button" class="btn-apu rounded-lg border border-gray-300 px-2.5 py-1 text-xs font-medium transition hover:bg-gray-50"`
      + ` data-apu-q="${esc(q.toString())}" title="Calcular cuánto me cuesta y qué me deja este proceso, en la pestaña Precios">Mi precio</button>`
      + (listo
        ? ' <span class="rounded-lg px-2 py-0.5 text-xs font-medium bg-green-50 text-green-800"'
          + ' title="Ya hay un presupuesto guardado para este proceso y perfil">● APU listo</span>'
        : "");
  }

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
        return mensajeRup(`El archivo no es JSON válido: ${e.message}`, "error");
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
      return mensajeRup(`No se pudo contactar el servidor: ${(e && e.message) || "sin conexión"}.`, "error");
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
      return mensajeRup((cuerpo && cuerpo.error) || `Error del servidor (${r.status}).`, "error");
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
      caja.textContent = (cuerpo && cuerpo.error) || `Error del servidor (${r.status}).`;
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
      if (!r.ok || !cuerpo || !cuerpo.ok) throw new Error((cuerpo && cuerpo.error) || `HTTP ${r.status}`);
    } catch (e) {
      return mensajeRup(`No se pudo descargar el RUP: ${(e && e.message) || "sin conexión"}.`, "error");
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
        + "Esta acción no se puede deshacer: para volver a usar la aplicación tendrás que subir el PDF de nuevo."
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
      return mensajeEliminar(`No se pudo contactar el servidor: ${(e && e.message) || "sin conexión"}.`, "error");
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
          ? `El servidor respondió algo que no es JSON (${r.status}). Si el sitio tiene protección por contraseña, inicie sesión y reintente.`
          : `Error del servidor (${r.status}).`), "error");
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
      return mensajeExp(`El texto no es JSON válido: ${e.message}`, "error");
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
      return mensajeExp(`No se pudo contactar el servidor: ${(e && e.message) || "sin conexión"}.`, "error");
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
      return mensajeExp((cuerpo && cuerpo.error) || `Error del servidor (${r.status}).`, "error");
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
      caja.textContent = (cuerpo && cuerpo.error) || `Error del servidor (${r.status}).`;
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
      mensajeExp(`No se pudo contactar el servidor: ${(e && e.message) || "sin conexión"}.`, "error");
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
      bitacora(`✘ 1/3 el despliegue rechazó la petición (${r.status})`);
      mensajeExp("El despliegue rechazó la petición (401/403). Si tiene Password Protection activa, "
        + "inicie sesión en Vercel en esta misma pestaña y reintente.", "error");
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
      bitacora(`✘ 1/3 error del servidor (${r.status})`);
      mensajeExp((cuerpo && cuerpo.error) || `Error del servidor (${r.status}).`, "error");
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
      if (!r.ok || !cuerpo || !cuerpo.ok) throw new Error((cuerpo && cuerpo.error) || `HTTP ${r.status}`);
    } catch (e) {
      return mensajeExp(`No se pudo descargar la experiencia: ${(e && e.message) || "sin conexión"}.`, "error");
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
      avisoCobertura(`No se pudo contactar el servidor: ${esc((e && e.message) || "sin conexión")}.`, "error");
      return false;
    }
    cargandoCobertura(false);

    if (r.status === 401) {
      avisoCobertura(msg401(cuerpo), "error");
      return false;
    }
    if (!r.ok || !cuerpo || !cuerpo.ok) {
      avisoCobertura(esc((cuerpo && cuerpo.error) || `Error del servidor (${r.status}).`), "error");
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
      ? `<details class="mt-2"><summary class="cursor-pointer text-sm text-gray-500 hover:text-gray-700">${titulo} (${lista.length})</summary>`
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
    $("apu-icociv").textContent = c.icociv
      ? `ICOCIV ${c.icociv.boletin} · +${c.icociv.variacion_anual_general_pct} % anual`
      : "sin ajuste sectorial";

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
      return mensajeApu((c && c.error ? esc(c.error) : "El catálogo APU no está cargado.")
        + " Pulse «Cargar catálogo APU» para poblarlo.", "aviso");
    }
    mensajeApu("");
    pintarApu(c);
  }

  async function cargarCatalogoApu() {
    if (apuCargando) return;
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
      else if (!r.ok || !c || !c.ok) msg.textContent = (c && c.error) || `Error ${r.status}.`;
      else if (c.indice && c.indice.done === false) msg.textContent = "Reconstrucción a medias (presupuesto agotado): vuelva a pulsar, el avance queda guardado.";
      else msg.textContent = "Índice de competencia reconstruido.";
    } catch (e) {
      msg.textContent = `Sin respuesta del servidor: ${e.message}`;
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
        + "correr el plazo unos días, pero no contés con eso.",
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
      msgPar(`Sin conexión con el servidor: ${e.message}`, "error");
      btn.disabled = false; $("par-spin").classList.add("hidden");
      return;
    }
    try { r = await resp.json(); } catch { r = null; }
    btn.disabled = false; $("par-spin").classList.add("hidden");
    if (!r) { msgPar(`El servidor respondió ${resp.status} sin JSON (¿inicio de sesión de Vercel?).`, "error"); return; }
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
          <span class="flex items-center gap-1 text-sm"><input type="number" min="0.01" max="100" step="0.01" value="${cons.part[p.id] ?? Math.floor(100 / elegidos.length)}" data-cons-num="${esc(p.id)}" class="w-20 rounded-lg border-gray-300 text-sm">%</span>
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
    catch (e) { caja.innerHTML = `<p class="text-sm text-red-700">${esc(e.message)}</p>`; return; }
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
        const g = await api("/api/perfil?op=consorcio", { method: "POST", body: { integrantes: participacionesActuales() } });
        const sel = $("f-perfil");
        if (![...sel.options].some((o) => o.value === g.id)) { const o = document.createElement("option"); o.value = g.id; o.textContent = etiquetaConsorcio(g.nombre, g.id); sel.appendChild(o); }
        sel.value = g.id;
        try { localStorage.setItem("detekta_consorcio", JSON.stringify({ id: g.id, nombre: g.nombre })); } catch { /* sin almacenamiento */ }
        pintarConsorciosGuardados();
        activarPestana("licitaciones");
        pagina = 1; buscar();
      } catch (e) { const m = $("cons-mensaje"); m.className = "mt-3 rounded-xl px-4 py-3 text-sm bg-red-50 text-red-700"; m.textContent = e.message; m.classList.remove("hidden"); }
      finally { btn.disabled = false; }
      return;
    }
    const del = ev.target.closest("[data-cons-borrar]");
    if (del) {
      const id = del.getAttribute("data-cons-borrar");
      try { await api(`/api/perfil?op=consorcio&id=${encodeURIComponent(id)}`, { method: "DELETE" }); } catch { /* se repinta igual */ }
      const sel = $("f-perfil"); for (const o of [...sel.options]) if (o.value === id) o.remove();
      pintarConsorciosGuardados();
    }
  });
  async function pintarConsorciosGuardados() {
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
      aviso(e.message, "bg-red-50 text-red-700");
    } finally {
      socioEnVuelo = false;
      $("btn-socio-verificar").disabled = false;
    }
  }
  function pintarSocio(r) {
    const sem = r.semaforo || {};
    const clr = sem.nivel === "rojo" ? "bg-red-50 text-red-800 ring-red-200"
      : sem.nivel === "ambar" ? "bg-amber-50 text-amber-800 ring-amber-200" : "bg-emerald-50 text-emerald-800 ring-emerald-200";
    const punto = sem.nivel === "rojo" ? "text-red-500" : sem.nivel === "ambar" ? "text-amber-500" : "text-emerald-500";
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
    const estadoTxt = { hallazgos: "con hallazgos", sin_hallazgos: "sin hallazgos en el dataset", pendiente_manual: "ábrala y consulte", no_consultada: "no respondió" };
    const estadoClr = { hallazgos: "text-red-700", sin_hallazgos: "text-emerald-700", pendiente_manual: "text-gray-700", no_consultada: "text-amber-700" };
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

  function arrancarPaneles() {
    pintarConsorcio();
    pintarConsorciosGuardados();
    $("btn-socio-verificar").addEventListener("click", verificarSocio);
    for (const id of ["socio-id", "socio-representante"]) $(id).addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); verificarSocio(); } });
    $("d-perfil").value = leerPerfil();
    $("c-perfil").value = leerPerfil();
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
  if (perfilRup) {
    // sin gate pasado, el selector queda SOLO con el perfil del RUP: entrar
    // por URL no puede regalar los perfiles del dueño
    activarPerfilRup(perfilRup, { soloEste: !sesionConClave });
    abrirApp();
  } else if (/^cons_[a-z0-9]{6,24}$/.test(perfilUrl)) {
    /* Fase 10 · un consorcio a la medida por URL («Ver su lista»): misma regla
       que el RUP subido — sin gate, el selector queda SOLO con él. */
    let nombreCons = "";
    try { const g = JSON.parse(localStorage.getItem("detekta_consorcio") || "null"); if (g && g.id === perfilUrl) nombreCons = g.nombre || ""; } catch { /* sin almacenamiento */ }
    const sel = $("f-perfil");
    if (![...sel.options].some((o) => o.value === perfilUrl)) { const o = document.createElement("option"); o.value = perfilUrl; o.textContent = etiquetaConsorcio(nombreCons, perfilUrl); sel.appendChild(o); }
    if (!sesionConClave) for (const o of [...sel.options]) { if (o.value !== perfilUrl) o.remove(); }
    sel.value = perfilUrl;
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
