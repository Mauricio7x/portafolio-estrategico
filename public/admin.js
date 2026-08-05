/* ============================================================================
   Detecta · Administración — encadenado de la sincronización desde el navegador
   ----------------------------------------------------------------------------
   La carga completa avanza en tandas: /api/sync trabaja hasta agotar su
   presupuesto (~45 s), persiste el cursor en Redis y responde {done:false}.
   El servidor intenta re-invocarse solo, pero ese fire-and-forget muere cuando
   Vercel Password Protection intercepta la llamada que la función se hace a sí
   misma (sin VERCEL_AUTOMATION_BYPASS_SECRET). Desde el navegador no pasa: la
   petición lleva la cookie de sesión. Este módulo hace de motor de arranque.

   SECUENCIA CORRECTA DE MODOS (importante):
     1.ª tanda → modo=full   reinicia la carga (reiniciar:true en api/sync.js)
     siguientes → modo=auto  CONTINÚA la full inconclusa desde el cursor
   Repetir modo=full en cada tanda reiniciaría el recorrido desde enero y la
   carga no terminaría jamás. Si la primera llamada encuentra el candado tomado
   (enCurso), también se pasa a `auto`: ya hay una carga en vuelo y lo correcto
   es acompañarla, no pisarle el avance.

   No se pasa `chain=0` a propósito: si la cadena del servidor SÍ funciona en
   este despliegue, ayuda — el candado impide que las dos se estorben (la que
   llega tarde recibe enCurso y este bucle simplemente espera).
   ========================================================================== */
"use strict";

(() => {
  const CLAVE = "231105";
  const MAX_INTENTOS_CLAVE = 3;
  const ESPERA_ENTRE_TANDAS_MS = 3000;   // {done:false} → siguiente tanda
  const ESPERA_CANDADO_MS = 10000;       // {enCurso:true} → otra tanda corre
  const BACKOFF_MS = [5000, 10000, 20000]; // red/5xx: 3 reintentos crecientes

  const $ = (id) => document.getElementById(id);
  const fmt = new Intl.NumberFormat("es-CO");
  const fmt1 = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 1 });
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  /* ══════════ Gate ══════════ */
  let intentosClave = 0;
  const accesoConcedido = () => { try { return sessionStorage.getItem("detecta-acceso") === "1"; } catch { return false; } };
  function abrirApp() {
    try { sessionStorage.setItem("detecta-acceso", "1"); } catch { /* sesión restringida */ }
    $("gate").remove();
    $("app").classList.remove("hidden");
    // el panel y la carga de RUP arrancan aquí, nunca antes: sus funciones
    // usan constantes declaradas al final del módulo (ver «Arranque»)
    arrancarPaneles();
  }
  function bloquear() {
    $("gate").innerHTML =
      '<div class="text-center"><p class="text-2xl font-semibold">Acceso denegado</p>' +
      '<p class="mt-2 text-sm text-gray-500">Este sitio es privado.</p></div>';
  }
  $("gate-form").addEventListener("submit", (e) => {
    e.preventDefault();
    if ($("gate-clave").value === CLAVE) return abrirApp();
    intentosClave++;
    if (intentosClave >= MAX_INTENTOS_CLAVE) return bloquear();
    const err = $("gate-error");
    const quedan = MAX_INTENTOS_CLAVE - intentosClave;
    err.textContent = `Acceso denegado (${quedan} intento${quedan === 1 ? "" : "s"} restante${quedan === 1 ? "" : "s"}).`;
    err.classList.remove("hidden");
    $("gate-clave").value = "";
    $("gate-clave").focus();
  });
  /* El arranque automático de la sesión ya validada va AL FINAL del módulo, no
     aquí: `abrirApp()` levanta el panel y la carga de RUP, cuyas funciones leen
     constantes (`let`/`const`) declaradas más abajo. Llamarlo desde este punto
     reventaría en la zona muerta temporal —y, al ir por una promesa rechazada,
     lo haría EN SILENCIO— exactamente como pasó en app.js. */

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
        r = await fetch(`/api/sync?modo=${modo}&presupuesto=${presupuesto}`, { headers: { Accept: "application/json" } });
        try { cuerpo = await r.json(); } catch { cuerpo = null; } // el muro del edge devuelve HTML
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

  $("btn-iniciar").addEventListener("click", () => {
    if (activo) return;
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
  });
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
  const CLAVE_TOKEN = "historico_token";
  const CLAVE_PERFIL = "dashboard_perfil";
  const leerToken = () => { try { return sessionStorage.getItem(CLAVE_TOKEN) || ""; } catch { return ""; } };
  const guardarToken = (v) => { try { sessionStorage.setItem(CLAVE_TOKEN, v); } catch { /* sesión restringida */ } };
  const olvidarToken = () => { try { sessionStorage.removeItem(CLAVE_TOKEN); } catch { /* sesión restringida */ } };
  const leerPerfil = () => { try { return sessionStorage.getItem(CLAVE_PERFIL) || "helder"; } catch { return "helder"; } };
  const guardarPerfil = (v) => { try { sessionStorage.setItem(CLAVE_PERFIL, v); } catch { /* sesión restringida */ } };

  function pintarEstadoToken() {
    const hay = !!leerToken();
    $("token-estado").textContent = hay
      ? "Token guardado en esta pestaña ✓"
      : "Sin token: el panel y la carga de RUP no pueden consultar el servidor.";
    $("token-estado").className = hay ? "text-sm text-green-700" : "text-sm text-amber-700";
  }

  function enviarToken(e) {
    if (e) e.preventDefault();
    const v = $("input-token-admin").value.trim();
    if (!v) { // nunca un camino mudo: el campo vacío avisa
      $("token-estado").textContent = "Pegue el token antes de guardar.";
      $("token-estado").className = "text-sm text-red-600";
      $("input-token-admin").focus();
      return;
    }
    guardarToken(v);
    $("input-token-admin").value = "";
    pintarEstadoToken();
    cargarDashboard();
    cargarRupActual();
    cargarExperienciaActual();
  }
  $("form-token-admin").addEventListener("submit", enviarToken);
  $("btn-token-admin").addEventListener("click", enviarToken);
  $("btn-token-olvidar").addEventListener("click", () => {
    olvidarToken();
    pintarEstadoToken();
    avisoDashboard("Token olvidado. Guárdelo de nuevo para ver el panel.", "aviso");
  });

  /* ══════════════════════════════════════════════════════════════════════════
     DASHBOARD de procesos (/api/resumen)
     ══════════════════════════════════════════════════════════════════════════ */
  const REFRESCO_MS = 300000;              // el mismo TTL de la caché del endpoint
  const COMPETENCIA_UI = {
    baja: { emoji: "🟢", texto: "Poca", clases: "bg-green-50 text-green-800" },
    media: { emoji: "🟡", texto: "Media", clases: "bg-amber-50 text-amber-800" },
    alta: { emoji: "🔴", texto: "Alta", clases: "bg-red-50 text-red-700" },
    sin_dato: { emoji: "⚪", texto: "Sin dato", clases: "bg-gray-50 text-gray-500" },
  };
  const BARRAS = [
    ["obra_civil", "Obra civil", "bg-green-500"],
    ["consultoria", "Consultoría", "bg-amber-500"],
    ["infraestructura", "Infraestructura", "bg-blue-500"],
    ["verificar_objeto", "Verificar objeto", "bg-gray-400"],
  ];
  const fmtCOP = new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 });
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
    if (!token) {
      $("d-contenido").classList.add("hidden");
      $("d-skeleton").classList.add("hidden");
      return avisoDashboard(
        'Configure su token de acceso en la sección <a href="#seccion-token" class="font-medium underline">Token de acceso</a> para ver el panel.',
        "aviso");
    }
    const perfil = $("d-perfil").value;
    cargandoDashboard(true);
    let r = null, cuerpo = null;
    try {
      // cache_bust solo cambia la URL (el servidor lo ignora): impide que el
      // navegador reutilice su propia respuesta al pulsar «Actualizar ahora»
      const bust = forzar ? `&cache_bust=${Date.now()}` : "";
      r = await fetch(`/api/resumen?perfil=${encodeURIComponent(perfil)}${bust}`,
        { headers: { "x-historico-token": token, Accept: "application/json" }, cache: "no-store" });
      cuerpo = await r.json();
    } catch (e) {
      cargandoDashboard(false);
      return avisoDashboard(`No se pudo contactar el servidor: ${esc((e && e.message) || "sin conexión")}.`, "error");
    }
    cargandoDashboard(false);

    if (r.status === 401) {
      olvidarToken();
      pintarEstadoToken();
      return avisoDashboard('Token inválido. Escriba uno nuevo en <a href="#seccion-token" class="font-medium underline">Token de acceso</a>.', "error");
    }
    if (r.status === 503) {
      return avisoDashboard(`${esc((cuerpo && cuerpo.error) || "Servicio no disponible")}. Puede iniciar una carga en la sección de sincronización, arriba.`, "error");
    }
    if (!r.ok || !cuerpo || !cuerpo.ok) {
      return avisoDashboard(esc((cuerpo && cuerpo.error) || `Error del servidor (${r.status}).`), "error");
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
      `${fmt.format(b.entidades_clasificadas)} entidades con ≥ ${b.min_procesos} procesos · ${fmt.format(b.procesos_analizados || 0)} adjudicaciones analizadas`;
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
    if (!token) return decir("Falta el token: guárdelo arriba antes de reconstruir.", "bg-amber-50 text-amber-800");

    btn.disabled = true;
    decir("Reconstruyendo sobre el histórico ya descargado…", "bg-gray-50 text-gray-600");
    try {
      const r = await fetch("/api/indice-baja?reconstruir=true",
        { headers: { "x-historico-token": token, Accept: "application/json" }, cache: "no-store" });
      const c = await r.json().catch(() => ({}));
      if (!r.ok || !c.ok) {
        decir(c.error || `Error ${r.status}`, "bg-red-50 text-red-700");
      } else if (c.reconstruido && c.reconstruido.enCurso) {
        decir("Ya hay una reconstrucción en curso: espere a que termine.", "bg-amber-50 text-amber-800");
      } else if (c.reconstruido && c.reconstruido.done === false) {
        decir("Reconstrucción a medias (presupuesto agotado). Vuelva a pulsar para continuar: "
          + "el avance queda guardado.", "bg-amber-50 text-amber-800");
      } else {
        const m = c.reconstruido || {};
        decir(`Listo: ${fmt.format(m.procesos_analizados || 0)} adjudicaciones · `
          + `${fmt.format(m.entidades_clasificadas || 0)} entidades clasificadas.`, "bg-green-50 text-green-800");
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
    $("d-obra-pct").textContent = `🏗️ ${pct(per.obra_civil || 0, total)} % del total`;
    $("d-consultoria").textContent = fmt.format(per.consultoria || 0);
    $("d-consultoria-pct").textContent = `📐 ${pct(per.consultoria || 0, total)} % del total`;
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
          <td class="py-2 text-gray-500">${esc(p.pertinencia || "")}</td>
        </tr>`;
    }).join("") : '<tr><td colspan="6" class="py-3 text-gray-400">Ningún proceso cumple los criterios de destacado.</td></tr>';

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
      r = await fetch(`/api/competencia-detalle?entidad=${encodeURIComponent(entidad)}`,
        { headers: { "x-historico-token": leerToken() } });
      cuerpo = await r.json();
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
    const fila = e.target.closest(".fila-proceso");
    if (!fila) return;
    const url = fila.getAttribute("data-url");
    if (url) window.open(url, "_blank", "noopener,noreferrer");
  });

  /* ══════════════════════════════════════════════════════════════════════════
     CARGA DE RUP (/api/admin/rup)
     ══════════════════════════════════════════════════════════════════════════ */
  let rupPendiente = null;
  const MAX_PREVIEW = 200000; // caracteres pintados en la vista previa

  function mensajeRup(texto, tipo) {
    const p = $("rup-mensaje");
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
    $("rup-archivo").value = "";
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
      return `<li><span class="font-medium">${esc(p.nombre || clave)}</span>: ${n} códigos UNSPSC · `
        + `${p.profesionales || 0} profesional(es) · tope ${fmt.format(p.tope_smmlv || 0)} SMMLV · `
        + `K aprox. ${fmtCOP.format(kAprox)}</li>`;
    }).join("");
  }

  $("rup-archivo").addEventListener("change", () => {
    const f = $("rup-archivo").files && $("rup-archivo").files[0];
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
    if (!token) return mensajeRup("Guarde antes el token de acceso, arriba.", "aviso");
    // deshabilitar durante el envío: un doble clic cargaría dos veces
    $("btn-rup-cargar").disabled = true;
    const etiqueta = $("btn-rup-cargar").textContent;
    $("btn-rup-cargar").textContent = "Cargando…";
    erroresRup(null);
    let r = null, cuerpo = null;
    try {
      r = await fetch("/api/admin/rup", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-historico-token": token },
        body: JSON.stringify(rupPendiente),
      });
      cuerpo = await r.json();
    } catch (e) {
      $("btn-rup-cargar").disabled = false;
      $("btn-rup-cargar").textContent = etiqueta;
      return mensajeRup(`No se pudo contactar el servidor: ${(e && e.message) || "sin conexión"}.`, "error");
    }
    $("btn-rup-cargar").disabled = false;
    $("btn-rup-cargar").textContent = etiqueta;

    if (r.status === 401) {
      olvidarToken(); pintarEstadoToken();
      return mensajeRup("Token inválido. Guárdelo de nuevo arriba y reintente.", "error");
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
    $("rup-archivo").value = "";
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
    if (!token) { caja.textContent = "Guarde el token de acceso para consultar el RUP vigente."; return; }
    let r = null, cuerpo = null;
    try {
      r = await fetch("/api/admin/rup", { headers: { "x-historico-token": token, Accept: "application/json" }, cache: "no-store" });
      cuerpo = await r.json();
    } catch {
      caja.textContent = "No se pudo consultar el RUP vigente.";
      return;
    }
    if (!r.ok || !cuerpo || !cuerpo.ok) {
      caja.textContent = (cuerpo && cuerpo.error) || `Error del servidor (${r.status}).`;
      return;
    }
    const resumen = Object.entries(cuerpo.resumen || {})
      .map(([k, v]) => `<li><span class="font-medium">${esc(v.nombre || k)}</span>: ${v.codigos} códigos UNSPSC · ${v.clases} clases · ${v.familias} familias · tope ${fmt.format(v.tope_smmlv || 0)} SMMLV</li>`)
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
    if (!token) return mensajeRup("Guarde antes el token de acceso, arriba.", "aviso");
    let cuerpo = null;
    try {
      const r = await fetch("/api/admin/rup", { headers: { "x-historico-token": token }, cache: "no-store" });
      cuerpo = await r.json();
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
    const p = $("exp-mensaje");
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
  $("btn-exp-cargar").addEventListener("click", () => {
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
    if (!token) return mensajeExp("Guarde antes el token de acceso, arriba.", "aviso");
    // un doble clic cargaría dos veces
    $("btn-exp-confirmar").disabled = true;
    const etiqueta = $("btn-exp-confirmar").textContent;
    $("btn-exp-confirmar").textContent = "Cargando…";
    erroresExp(null);
    let r = null, cuerpo = null;
    try {
      r = await fetch("/api/admin/experiencia", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-historico-token": token },
        body: JSON.stringify(expPendiente),
      });
      cuerpo = await r.json();
    } catch (e) {
      $("btn-exp-confirmar").disabled = false;
      $("btn-exp-confirmar").textContent = etiqueta;
      return mensajeExp(`No se pudo contactar el servidor: ${(e && e.message) || "sin conexión"}.`, "error");
    }
    $("btn-exp-confirmar").disabled = false;
    $("btn-exp-confirmar").textContent = etiqueta;

    if (r.status === 401) {
      olvidarToken(); pintarEstadoToken();
      return mensajeExp("Token inválido. Guárdelo de nuevo arriba y reintente.", "error");
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
    if (!token) { caja.textContent = "Guarde el token de acceso para consultar la experiencia cargada."; return; }
    let r = null, cuerpo = null;
    try {
      r = await fetch("/api/admin/experiencia", { headers: { "x-historico-token": token, Accept: "application/json" }, cache: "no-store" });
      cuerpo = await r.json();
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

  $("btn-exp-descargar").addEventListener("click", async () => {
    const token = leerToken();
    if (!token) return mensajeExp("Guarde antes el token de acceso, arriba.", "aviso");
    let cuerpo = null;
    try {
      const r = await fetch("/api/admin/experiencia", { headers: { "x-historico-token": token }, cache: "no-store" });
      cuerpo = await r.json();
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
    "CRÍTICO": { emoji: "🔴", clases: "bg-red-50 text-red-700" },
    ALTO: { emoji: "🟠", clases: "bg-orange-50 text-orange-800" },
    MEDIO: { emoji: "🟡", clases: "bg-amber-50 text-amber-800" },
    BAJO: { emoji: "⚪", clases: "bg-gray-100 text-gray-600" },
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

  async function ejecutarAuditoria() {
    if (coberturaCargando) return;
    const token = leerToken();
    if (!token) {
      return avisoCobertura(
        'Configure su token de acceso en la sección <a href="#seccion-token" class="font-medium underline">Token de acceso</a> para ejecutar la auditoría.',
        "aviso");
    }
    const perfil = $("c-perfil").value;
    const usar = $("c-usar-experiencia").checked ? "true" : "false";
    avisoCobertura(null);
    cargandoCobertura(true);
    let r = null, cuerpo = null;
    try {
      r = await fetch(`/api/admin/cobertura-rup?perfil=${encodeURIComponent(perfil)}&usar_experiencia=${usar}`,
        { headers: { "x-historico-token": token, Accept: "application/json" }, cache: "no-store" });
      cuerpo = await r.json();
    } catch (e) {
      cargandoCobertura(false);
      return avisoCobertura(`No se pudo contactar el servidor: ${esc((e && e.message) || "sin conexión")}.`, "error");
    }
    cargandoCobertura(false);

    if (r.status === 401) {
      olvidarToken(); pintarEstadoToken();
      return avisoCobertura('Token inválido. Escriba uno nuevo en <a href="#seccion-token" class="font-medium underline">Token de acceso</a>.', "error");
    }
    if (!r.ok || !cuerpo || !cuerpo.ok) {
      return avisoCobertura(esc((cuerpo && cuerpo.error) || `Error del servidor (${r.status}).`), "error");
    }
    if (cuerpo.mensaje) avisoCobertura(esc(cuerpo.mensaje), "aviso");
    ultimaCobertura = cuerpo;
    $("btn-cobertura-exportar").disabled = false;
    pintarCobertura(cuerpo);
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
  $("c-perfil").addEventListener("change", () => {
    // otro perfil, otra whitelist: lo pintado ya no corresponde
    $("c-contenido").classList.add("hidden");
    ultimaCobertura = null;
    $("btn-cobertura-exportar").disabled = true;
    avisoCobertura("Perfil cambiado: ejecute la auditoría para este perfil.", "aviso");
  });

  /* ══════════════════════════════════════════════════════════════════════════
     INFERENCIA DE ÍTEMS APU (/api/apu/inferir)
     --------------------------------------------------------------------------
     Del objeto de una licitación a los ítems que llevaría su APU. Tres cosas
     que este módulo hace a propósito y conviene no «simplificar»:

     · La SELECCIÓN vive en un Set de JavaScript, no en el DOM. La tabla se
       repinta con innerHTML —igual que la de cobertura— y eso borra el estado
       de cualquier <input> que estuviera dentro. Si las casillas fueran la
       única memoria de lo marcado, «Marcar todos» seguido de un repintado
       perdería la selección sin que nadie lo notase.
     · No hay handler de clic sobre la FILA. Las dos tablas que ya existen
       (cobertura y entidades) usan `closest()` sobre la fila entera; aquí eso
       chocaría con la casilla, que es un control con su propio clic. Se
       escucha «change» y solo sobre los <input>.
     · La CANTIDAD se pinta como «—» y nunca como 0. Es la misma regla que
       prohíbe `|| 0` sobre un conteo: un cero se lee como una medición.
     ══════════════════════════════════════════════════════════════════════════ */
  let apuCargando = false;
  let apuAccionEnCurso = false;
  let ultimaInferencia = null;
  const apuSeleccion = new Set();   // item_id marcados (sobrevive al repintado)

  function avisoApu(texto, tipo) {
    const p = $("apu-aviso");
    if (!texto) return p.classList.add("hidden");
    p.className = "mt-5 rounded-xl px-4 py-3 text-sm " + ({
      ok: "bg-green-50 text-green-800 ring-1 ring-inset ring-green-600/20",
      error: "bg-red-50 text-red-700 ring-1 ring-inset ring-red-600/20",
      aviso: "bg-amber-50 text-amber-800 ring-1 ring-inset ring-amber-600/20",
    }[tipo] || "bg-gray-50 text-gray-600 ring-1 ring-inset ring-gray-500/20");
    p.innerHTML = texto;
  }

  function cargandoApu(v) {
    apuCargando = v;
    $("btn-apu-inferir").disabled = v;
    $("apu-spin").classList.toggle("hidden", !v);
    $("apu-skeleton").classList.toggle("hidden", !v);
  }

  /* Retira lo pintado. Se llama en TRES situaciones distintas y por la misma
     razón: lo que hay en pantalla dejó de corresponder a lo que se preguntó.
       · una inferencia que falla (si no, el error convive con la tabla del
         objeto anterior y se lee como si fuera suya);
       · el objeto, el código o el departamento cambian sin volver a inferir;
       · se publica o se aprende conocimiento nuevo — el motor con el que se
         midió lo pintado acaba de cambiar, igual que cargar un RUP oculta la
         auditoría de cobertura. */
  function olvidarInferencia(aviso) {
    $("apu-contenido").classList.add("hidden");
    ultimaInferencia = null;
    apuSeleccion.clear();
    $("btn-apu-exportar").disabled = true;
    if (aviso) avisoApu(aviso, "aviso");
  }

  /* Confianza → banda de color. Los cortes son los del motor: 0.7 es lo que
     vale un código UNSPSC de clase por sí solo, y 0.3 el umbral de entrada. */
  function bandaApu(c) {
    if (c >= 0.7) return { clases: "bg-green-50 text-green-800", etiqueta: "alta" };
    if (c >= 0.5) return { clases: "bg-amber-50 text-amber-800", etiqueta: "media" };
    return { clases: "bg-gray-100 text-gray-600", etiqueta: "baja" };
  }

  async function inferirApu() {
    if (apuCargando) return;
    const token = leerToken();
    if (!token) {
      return avisoApu(
        'Configure su token de acceso en la sección <a href="#seccion-token" class="font-medium underline">Token de acceso</a> para inferir ítems.',
        "aviso");
    }
    const objeto = $("apu-objeto").value.trim();
    const unspsc = $("apu-unspsc").value.trim();
    const departamento = $("apu-departamento").value.trim();
    if (!objeto && !unspsc) {
      return avisoApu("Escriba el objeto de la licitación (o al menos un código UNSPSC): sin ninguno de los dos no hay nada de dónde inferir.", "aviso");
    }
    avisoApu(null);
    cargandoApu(true);
    let r = null, cuerpo = null;
    try {
      r = await fetch("/api/apu/inferir", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-historico-token": token },
        body: JSON.stringify({ objeto, unspsc: unspsc || null, departamento: departamento || null }),
      });
      cuerpo = await r.json();
    } catch (e) {
      cargandoApu(false);
      olvidarInferencia();
      return avisoApu(`No se pudo contactar el servidor: ${esc((e && e.message) || "sin conexión")}.`, "error");
    }
    cargandoApu(false);

    /* CUALQUIER fallo tiene que llevarse la tabla anterior. Si no, el error
       queda al lado de los ítems del objeto PREVIO y se leen como si fueran del
       que se acaba de escribir — que es la misma mentira que un veredicto
       contradiciendo a las cifras que lo acompañan. */
    if (r.status === 401) {
      olvidarToken(); pintarEstadoToken(); olvidarInferencia();
      return avisoApu('Token inválido. Escriba uno nuevo en <a href="#seccion-token" class="font-medium underline">Token de acceso</a>.', "error");
    }
    if (!r.ok || !cuerpo || !cuerpo.ok) {
      olvidarInferencia();
      return avisoApu(esc((cuerpo && cuerpo.error) || `Error del servidor (${r.status}).`), "error");
    }

    ultimaInferencia = cuerpo;
    // objeto nuevo, selección nueva: arrancan marcados los que el motor propuso
    apuSeleccion.clear();
    for (const it of cuerpo.items || []) apuSeleccion.add(it.item_id);
    pintarApu(cuerpo);
  }

  function pintarApu(c) {
    $("apu-contenido").classList.remove("hidden");
    const items = c.items || [];

    /* Una lista vacía tiene DOS causas y el servidor ya las distingue: o el
       objeto no es de obra (`no_pertinente`, con el término que lo veta), o es
       obra y nada llegó al umbral (`sin_sugerencias`, con qué hacer). Pintar
       aquí un texto genérico propio desperdiciaría la explicación exacta que
       viaja en la respuesta — y dejaría dos redacciones que se contradicen en
       cuanto una de las dos se corrija. */
    if (!items.length) {
      if (c.no_pertinente) {
        avisoApu(`Este objeto no es de obra civil: ${esc(c.no_pertinente.motivo)}. `
          + "No se sugiere ningún ítem aunque venga publicado con un código UNSPSC de construcción.", "aviso");
      } else if (c.sin_sugerencias) {
        avisoApu(esc(c.sin_sugerencias), "aviso");
      } else {
        avisoApu("Ningún ítem del catálogo supera el umbral para este objeto.", "aviso");
      }
    }

    const totalTexto = `${fmt.format(items.length)} ítem${items.length === 1 ? "" : "s"} sugerido${items.length === 1 ? "" : "s"}`;
    const recorte = c.recortados > 0 ? ` · se ocultaron ${fmt.format(c.recortados)} por debajo del tope` : "";
    $("apu-resumen").innerHTML = `${totalTexto}${recorte}. <span class="text-gray-400">Desmarque los que no apliquen.</span>`;

    $("apu-items").innerHTML = items.length ? items.map((it) => {
      const b = bandaApu(it.confianza);
      const marcado = apuSeleccion.has(it.item_id) ? " checked" : "";
      // la cantidad NO se estima: «—» y nunca un 0 que parezca medido
      const cantidad = it.cantidad_sugerida == null ? "—" : fmt.format(it.cantidad_sugerida);
      return `<tr class="align-top">
          <td class="py-2 pr-2">
            <input type="checkbox" data-item="${esc(it.item_id)}"${marcado}
                   class="h-4 w-4 rounded border-gray-300 text-gray-900 focus:ring-gray-900/10">
          </td>
          <td class="py-2 pr-2">${esc(it.descripcion)}
            <span class="block font-mono text-xs text-gray-400">${esc(it.item_id)}</span></td>
          <td class="py-2 pr-2 text-gray-500">${esc(it.capitulo_nombre || "")}</td>
          <td class="py-2 pr-2 text-center">${esc(it.unidad)}</td>
          <td class="py-2 pr-2 text-right tabular-nums text-gray-400">${cantidad}</td>
          <td class="py-2 pr-2 text-right">
            <span class="rounded-lg px-2 py-0.5 text-xs font-medium tabular-nums ${b.clases}">${Math.round(it.confianza * 100)} %</span></td>
          <td class="py-2 text-xs text-gray-500">${esc((it.motivos || []).join(" · "))}</td>
        </tr>`;
    }).join("") : '<tr><td colspan="7" class="py-3 text-gray-400">Ningún ítem supera el umbral para este objeto.</td></tr>';

    $("apu-cantidad-nota").textContent = c.cantidad_sugerida_motivo || "";

    const d = c.diagnostico || {};
    const partes = [];
    const reconocidos = (d.terminos_reconocidos || []).map((t) => t.termino);
    if (reconocidos.length) partes.push(`Términos reconocidos: ${reconocidos.join(", ")}`);
    const codigos = (d.codigos_leidos || []).map((x) => `${x.codigo} (${x.nivel})`);
    if (codigos.length) partes.push(`Códigos leídos: ${codigos.join(", ")}`);
    if (d.codigo_no_legible) partes.push(`Código no legible: ${d.codigo_no_legible}`);
    if (d.departamento) partes.push(`Departamento: ${d.departamento} (no altera los ítems)`);
    $("apu-meta").textContent = partes.join(" · ");

    $("btn-apu-exportar").disabled = apuSeleccion.size === 0;
  }

  /* Estado del conocimiento del motor (GET, solo lee). Es barato y es lo que
     hace descubrible el botón de sembrar: sin él, «semilla» y «publicado en
     Redis» se ven exactamente igual desde la pantalla. */
  async function cargarConocimientoApu() {
    const caja = $("apu-conocimiento");
    const token = leerToken();
    if (!token) { caja.textContent = "Guarde el token de acceso para consultar el estado del motor."; return; }
    let r = null, cuerpo = null;
    try {
      r = await fetch("/api/apu/inferir", { headers: { "x-historico-token": token, Accept: "application/json" }, cache: "no-store" });
      cuerpo = await r.json();
    } catch {
      caja.textContent = "No se pudo consultar el estado del motor.";
      return;
    }
    if (!r.ok || !cuerpo || !cuerpo.ok) {
      caja.textContent = (cuerpo && cuerpo.error) || `Error del servidor (${r.status}).`;
      return;
    }
    const k = cuerpo.conocimiento || {};
    const origen = k.origen || {};
    caja.textContent = `${fmt.format(cuerpo.catalogo.items)} ítems en el catálogo · `
      + `${fmt.format(k.terminos_en_diccionario)} términos · ${fmt.format(k.claves_en_mapeo)} claves UNSPSC · `
      + `mapeo: ${origen.mapeo}, diccionario: ${origen.diccionario}`
      + (k.version ? ` · versión ${String(k.version).slice(0, 19).replace("T", " ")}` : "");
  }

  /* Los motivos por los que una derivación no cambia nada llegan como slug —el
     servidor los publica así para poder compararlos—, pero un slug en pantalla
     no es una explicación: el dueño no tiene por qué saber qué es
     «sin_codigos_mapeados». El `siguiente_paso` del servidor viaja aparte y se
     enseña detrás. */
  const MOTIVO_APU = {
    sin_historico: "No hay corpus histórico todavía",
    sin_codigos_mapeados: "El histórico no trae códigos UNSPSC que el mapeo cubra",
    redis_inaccesible: "No se pudo leer el histórico en Redis",
  };

  /* Sembrar y derivar comparten forma: POST con un parámetro explícito, y el
     estado del motor se relee al terminar para que lo pintado no mienta. */
  async function accionApu(param, etiqueta) {
    const token = leerToken();
    if (!token) return avisoApu("Guarde antes el token de acceso, arriba.", "aviso");
    if (apuAccionEnCurso) return;
    /* «Aprender del histórico» lo recorre entero y publica al terminar: un
       doble clic lanzaría dos barridos y dos publicaciones que se pisan. Mismo
       blindaje que «Confirmar carga» del RUP y de la experiencia. */
    apuAccionEnCurso = true;
    $("btn-apu-sembrar").disabled = true;
    $("btn-apu-derivar").disabled = true;
    avisoApu(`${etiqueta}…`, null);
    let r = null, cuerpo = null;
    try {
      r = await fetch(`/api/apu/inferir?${param}=true`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-historico-token": token },
        body: "{}",
      });
      cuerpo = await r.json();
    } catch (e) {
      return avisoApu(`No se pudo contactar el servidor: ${esc((e && e.message) || "sin conexión")}.`, "error");
    } finally {
      apuAccionEnCurso = false;
      $("btn-apu-sembrar").disabled = false;
      $("btn-apu-derivar").disabled = false;
    }
    if (r.status === 401) {
      olvidarToken(); pintarEstadoToken();
      return avisoApu("Token inválido.", "error");
    }
    if (!r.ok) return avisoApu(esc((cuerpo && cuerpo.error) || `Error del servidor (${r.status}).`), "error");
    // `ok:false` con 200 es una respuesta con causa (p. ej. no hay histórico):
    // se enseña traducida y con su siguiente paso, en vez de decir «falló»
    if (cuerpo && cuerpo.ok === false) {
      const causa = MOTIVO_APU[cuerpo.motivo] || cuerpo.motivo || "Sin cambios";
      return avisoApu(esc([causa, cuerpo.siguiente_paso].filter(Boolean).join(". ")), "aviso");
    }
    const detalle = param === "derivar"
      ? `${fmt.format(cuerpo.terminos_nuevos)} términos nuevos y ${fmt.format(cuerpo.terminos_ampliados)} ampliados sobre ${fmt.format(cuerpo.procesos_historico)} procesos.`
      : `${fmt.format(cuerpo.terminos)} términos y ${fmt.format(cuerpo.claves_mapeo)} claves publicadas.`;
    cargarConocimientoApu();
    /* El conocimiento cambió: lo que estuviera pintado se midió con el motor
       ANTERIOR. Misma regla que ya aplica cargar un RUP sobre la auditoría. */
    if (ultimaInferencia) {
      return olvidarInferencia(`${esc(detalle)} El motor cambió: vuelva a inferir para ver los ítems con el conocimiento nuevo.`);
    }
    avisoApu(esc(detalle), "ok");
  }

  /* Delegación SOLO sobre las casillas (ver la nota de arriba: nada de
     `closest()` sobre la fila, que se comería el clic del control). */
  $("apu-items").addEventListener("change", (e) => {
    const caja = e.target.closest("input[type=checkbox][data-item]");
    if (!caja) return;
    const id = caja.getAttribute("data-item");
    if (caja.checked) apuSeleccion.add(id); else apuSeleccion.delete(id);
    $("btn-apu-exportar").disabled = apuSeleccion.size === 0;
  });

  function marcarTodosApu(valor) {
    if (!ultimaInferencia) return;
    apuSeleccion.clear();
    if (valor) for (const it of ultimaInferencia.items || []) apuSeleccion.add(it.item_id);
    for (const caja of $("apu-items").querySelectorAll("input[type=checkbox][data-item]")) caja.checked = valor;
    $("btn-apu-exportar").disabled = apuSeleccion.size === 0;
  }

  /* Cambiar el objeto (o el código, o el departamento) sin volver a inferir
     dejaría la tabla anterior debajo de un texto nuevo, y se leería como si le
     correspondiera. Mismo criterio que el `change` de `c-perfil`, que ya
     invalida la auditoría al cambiar de whitelist. */
  for (const id of ["apu-objeto", "apu-unspsc", "apu-departamento"]) {
    $(id).addEventListener("input", () => {
      if (!ultimaInferencia) return;
      olvidarInferencia("La consulta cambió: pulse «Inferir ítems» para actualizar la tabla.");
    });
  }

  $("btn-apu-inferir").addEventListener("click", inferirApu);
  $("btn-apu-todos").addEventListener("click", () => marcarTodosApu(true));
  $("btn-apu-ninguno").addEventListener("click", () => marcarTodosApu(false));
  $("btn-apu-sembrar").addEventListener("click", () => accionApu("sembrar", "Publicando la semilla"));
  $("btn-apu-derivar").addEventListener("click", () => accionApu("derivar", "Aprendiendo del histórico"));
  $("btn-apu-exportar").addEventListener("click", () => {
    if (!ultimaInferencia) return;
    const elegidos = (ultimaInferencia.items || []).filter((it) => apuSeleccion.has(it.item_id));
    descargarJSON({
      objeto: ultimaInferencia.objeto,
      unspsc: ultimaInferencia.unspsc,
      departamento: ultimaInferencia.departamento,
      items: elegidos,
      nota: ultimaInferencia.cantidad_sugerida_motivo,
    }, `apu_items_${new Date().toISOString().slice(0, 10)}.json`);
  });

  /* ══════════ Arranque ══════════
     AL FINAL del IIFE, después de declarar todo lo que estas funciones usan.
     `arrancarPaneles` es una declaración de función (se hoistea), así que
     `abrirApp` puede llamarla desde arriba: cuando de verdad se ejecute —al
     pasar el gate— ya estará todo inicializado. */
  function arrancarPaneles() {
    $("d-perfil").value = leerPerfil();
    $("c-perfil").value = leerPerfil();
    pintarEstadoToken();
    cargarDashboard();
    cargarRupActual();
    // la experiencia se consulta al arrancar (es barato y decide si el toggle
    // de la auditoría empieza encendido); la AUDITORÍA no, que recorre el
    // histórico entero y solo debe correr cuando alguien la pide
    cargarExperienciaActual();
    // ídem el estado del motor APU: un GET que solo lee dos claves y es lo que
    // distingue en pantalla «semilla en código» de «publicado en Redis». La
    // INFERENCIA no se dispara sola, y «aprender del histórico» menos aún
    cargarConocimientoApu();
  }
  if (accesoConcedido()) abrirApp();
})();
