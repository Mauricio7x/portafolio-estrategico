/* ============================================================================
   Detecta · Frontend (sin build, sin dependencias — Tailwind por CDN)
   ----------------------------------------------------------------------------
   1. Gate de clave (231105). Nota honesta: es una barrera de cortesía en el
      cliente; la protección real del despliegue es Vercel Password Protection
      (servidor), que puede activarse encima sin tocar este código.
   2. Consulta /api/oportunidades y pinta tarjetas. Si el backend responde 503
      (Redis vacío → sincronización recién disparada), reintenta solo con
      cuenta regresiva hasta que la carga inicial produzca datos.
   3. El orden por defecto es «Más atractivas» (ordenar_por=atractividad):
      primero las entidades donde históricamente se presentan menos oferentes
      —donde es más probable ganar—, y dentro de cada grupo por puntaje. Cada
      tarjeta muestra la banda de competencia de su entidad (🟢/🟡/🔴/⚪).
   ========================================================================== */
"use strict";

(() => {
  const CLAVE = "231105";
  const MAX_INTENTOS_CLAVE = 3;
  const REINTENTO_SYNC_SEG = 20;   // espera entre reintentos tras un 503
  const MAX_REINTENTOS_SYNC = 30;  // ~10 min: suficiente para la carga inicial

  const $ = (id) => document.getElementById(id);
  const fmtCOP = new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 });
  const fmtNum = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 1 });

  /* Competencia histórica de la entidad (índice sobre 2 años de adjudicaciones):
     es lo que decide el orden por defecto — primero donde menos gente compite. */
  const COMPETENCIA_ENTIDAD = {
    baja: { emoji: "🟢", titulo: "Poca competencia", clases: "bg-green-50 text-green-800 ring-green-600/20" },
    media: { emoji: "🟡", titulo: "Competencia media", clases: "bg-amber-50 text-amber-800 ring-amber-600/20" },
    alta: { emoji: "🔴", titulo: "Alta competencia", clases: "bg-red-50 text-red-700 ring-red-600/20" },
    sin_dato: { emoji: "⚪", titulo: "Sin datos históricos de esta entidad", clases: "bg-gray-50 text-gray-500 ring-gray-500/20" },
  };

  /* ══════════ Gate ══════════ */
  let intentosClave = 0;
  function abrirApp() {
    sessionStorage.setItem("detecta-acceso", "1");
    $("gate").remove();
    $("app").classList.remove("hidden");
    buscar();
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
    err.textContent = `Acceso denegado (${MAX_INTENTOS_CLAVE - intentosClave} intento${MAX_INTENTOS_CLAVE - intentosClave === 1 ? "" : "s"} restante${MAX_INTENTOS_CLAVE - intentosClave === 1 ? "" : "s"}).`;
    err.classList.remove("hidden");
    $("gate-clave").value = "";
    $("gate-clave").focus();
  });
  if (sessionStorage.getItem("detecta-acceso") === "1") abrirApp();

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

  function parametros() {
    const p = new URLSearchParams({ perfil: $("f-perfil").value, pagina: String(pagina), por_pagina: "20" });
    const ant = $("f-anticipo").value;
    if (ant !== "") p.set("anticipo_min", ant);
    for (const [id, nombre] of [["f-cuantia", "cuantia_rango"], ["f-competencia", "nivel_competencia"],
      ["f-entidad", "competencia_entidad"], ["f-ubicacion", "ubicacion_valida"]]) {
      if ($(id).value) p.set(nombre, $(id).value);
    }
    p.set("ordenar_por", $("f-ordenar").value);
    p.set("orden", $("f-orden").value);
    return p;
  }

  async function buscar() {
    clearTimeout(timerReintento);
    const peticion = ++peticionActual;
    mostrar("estado-carga", "Buscando oportunidades…");
    let r, cuerpo;
    try {
      r = await fetch(`/api/oportunidades?${parametros()}`);
      cuerpo = await r.json();
    } catch {
      if (peticion !== peticionActual) return; // llegó tarde: ya hay otra búsqueda
      // durante la sincronización inicial un fallo transitorio no debe cortar
      // la espera automática
      if (reintentosSync > 0) return esperarSincronizacion();
      return mostrar("estado-error", "No se pudo contactar el servidor. Revise su conexión e intente de nuevo.");
    }
    if (peticion !== peticionActual) return; // respuesta obsoleta: descartar

    if (r.status === 503 && cuerpo && cuerpo.sincronizando) return esperarSincronizacion();
    if (!r.ok || !cuerpo.ok) {
      return mostrar("estado-error", (cuerpo && cuerpo.error) || `Error del servidor (${r.status}). Intente de nuevo.`);
    }

    reintentosSync = 0;
    // refresco en segundo plano: con datos de >5 min el backend corre un
    // delta barato; si están frescos responde alDia sin tocar Socrata
    fetch("/api/sync?modo=auto").catch(() => {});
    if (cuerpo.sincronizado) {
      const s = $("sello-sync");
      s.textContent = `Datos: ${new Date(cuerpo.sincronizado).toLocaleString("es-CO", { dateStyle: "medium", timeStyle: "short" })}`;
      s.classList.remove("hidden");
    }
    if (!cuerpo.total) return mostrar("estado-vacio");
    pintar(cuerpo);
  }

  /* Primera visita con Redis vacío: el backend ya disparó /api/sync. Aquí se
     refuerza (por si el fire-and-forget del servidor murió) y se reintenta. */
  function esperarSincronizacion() {
    reintentosSync++;
    if (reintentosSync > MAX_REINTENTOS_SYNC) {
      return mostrar("estado-error", "La sincronización con SECOP II está tardando más de lo normal. Intente de nuevo en unos minutos.");
    }
    fetch("/api/sync?modo=auto").catch(() => {});
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
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  function chip(texto, clases) {
    return `<span class="rounded-full px-2.5 py-0.5 text-xs font-medium ${clases}">${texto}</span>`;
  }

  /* Banda de competencia de la entidad. Sin índice construido todo cae en
     "sin_dato" y la tarjeta se ve igual que antes, sin líneas rotas. */
  function bandaCompetencia(c) {
    const nivel = (c && c.nivel) || "sin_dato";
    const d = COMPETENCIA_ENTIDAD[nivel] || COMPETENCIA_ENTIDAD.sin_dato;
    let texto = d.titulo;
    if (nivel === "sin_dato") {
      if (c && c.total_procesos > 0) texto = `Sin datos suficientes de esta entidad (${c.total_procesos} proceso${c.total_procesos === 1 ? "" : "s"} en 2 años)`;
    } else {
      const prom = c.promedio_oferentes == null ? "?" : fmtNum.format(c.promedio_oferentes);
      texto += ` — promedio ${prom} oferentes en ${c.total_procesos} proceso${c.total_procesos === 1 ? "" : "s"}`;
    }
    return `<p class="mt-3 inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${d.clases}">
        <span aria-hidden="true">${d.emoji}</span>${esc(texto)}
      </p>`;
  }

  function tarjeta(l) {
    const rup = l.rup || {};
    const cierre = l.fecha_cierre ? new Date(l.fecha_cierre) : null;
    const cierreTxt = cierre && !isNaN(cierre) ? cierre.toLocaleDateString("es-CO", { day: "numeric", month: "short", year: "numeric" }) : null;
    const puntaje = Math.max(0, Math.min(100, l.puntaje_ponderado || 0));
    const compColor = { baja: "bg-green-100 text-green-800", media: "bg-amber-100 text-amber-800", alta: "bg-red-100 text-red-700" }[l.nivel_competencia] || "bg-gray-100 text-gray-600";

    return `
    <article class="tarjeta rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-900/5">
      <div class="flex flex-wrap items-start justify-between gap-3">
        <div class="min-w-0 flex-1">
          <h3 class="font-semibold leading-snug tracking-tight">${esc(l.nombre_del_procedimiento || l.id_del_proceso || "Proceso sin nombre")}</h3>
          <p class="mt-1 text-sm text-gray-500">${esc(l.entidad || "Entidad no informada")}</p>
          ${bandaCompetencia(l.competencia_entidad)}
        </div>
        <div class="text-right">
          <p class="text-lg font-semibold tabular-nums">${fmtCOP.format(l.cuantia_cop || 0)}</p>
          <p class="text-xs uppercase tracking-wide text-gray-400">cuantía ${esc(l.cuantia_rango || "")}</p>
        </div>
      </div>

      <div class="mt-4 flex items-center gap-3">
        <div class="h-2 flex-1 overflow-hidden rounded-full bg-gray-100">
          <div class="h-full rounded-full ${puntaje >= 75 ? "bg-green-500" : puntaje >= 50 ? "bg-amber-400" : "bg-gray-300"}" style="width:${puntaje}%"></div>
        </div>
        <span class="text-sm font-semibold tabular-nums">${puntaje}</span>
      </div>

      <div class="mt-4 flex flex-wrap gap-2">
        ${chip(l.anticipo_pct > 0 ? `Anticipo ${l.anticipo_pct}%` : "Anticipo no declarado", l.anticipo_pct > 0 ? "bg-blue-100 text-blue-800" : "bg-gray-100 text-gray-500")}
        ${chip(`Ofertas del proceso: ${esc(l.nivel_competencia || "?")}`, compColor)}
        ${chip(esc(`${l.ciudad_entidad || l.departamento_entidad || "Ubicación n/d"}`) + (l.ubicacion_valida ? " ✓" : ""), l.ubicacion_valida ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600")}
        ${chip(rup.unspsc_ok ? (rup.fuente_unspsc === "codigo" ? "RUP ✓ (UNSPSC)" : "RUP ✓ (objeto de obra)") : "RUP ✗", rup.unspsc_ok ? "bg-green-100 text-green-800" : "bg-red-100 text-red-700")}
        ${chip(rup.capacidad_ok ? (rup.co_estimado ? "Capacidad K ✓ (CO estimado)" : "Capacidad K ✓") : "Capacidad K ✗", rup.capacidad_ok ? "bg-green-100 text-green-800" : "bg-red-100 text-red-700")}
        ${cierreTxt ? chip(`Cierra ${cierreTxt}`, "bg-purple-100 text-purple-800") : ""}
        ${l.modalidad_de_contratacion ? chip(esc(l.modalidad_de_contratacion), "bg-gray-100 text-gray-600") : ""}
      </div>

      <div class="mt-4 flex items-center justify-between text-sm">
        <span class="text-gray-400">${esc(l.estado_del_procedimiento || "")}</span>
        ${l.urlproceso ? `<a href="${esc(l.urlproceso)}" target="_blank" rel="noopener noreferrer" class="font-medium text-blue-600 hover:underline">Ver en SECOP II ↗</a>` : ""}
      </div>
    </article>`;
  }

  function pintar(cuerpo) {
    mostrar("resultados");
    $("resumen-resultados").textContent =
      `${cuerpo.total} oportunidad${cuerpo.total === 1 ? "" : "es"} para el perfil «${$("f-perfil").selectedOptions[0].text}»`;
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

  /* ══════════ Eventos ══════════ */
  $("btn-buscar").addEventListener("click", () => { pagina = 1; reintentosSync = 0; buscar(); });
  $("btn-reintentar").addEventListener("click", () => { reintentosSync = 0; buscar(); });
  for (const id of ["f-perfil", "f-cuantia", "f-competencia", "f-entidad", "f-ubicacion", "f-ordenar", "f-orden"]) {
    $(id).addEventListener("change", () => { pagina = 1; buscar(); });
  }
})();
