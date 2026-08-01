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
   4. Veredicto GRADUADO en cada tarjeta (jul 2026): el badge de matching dice
      con qué FUERZA encaja en el RUP (RUP ✓ por clase · RUP ~ por familia ·
      RUP ≈ por clase afín · «Objeto sugiere obra») y el de pertinencia qué
      TIPO de trabajo es (Obra civil · Infraestructura · Consultoría ·
      Verificar objeto). El detalle completo va en el `title` de cada badge.
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
    // apagado por defecto: sin código del RUP y sin vocabulario claro de obra,
    // el proceso es ruido (software, equipos, servicios de salud…). Encenderlo
    // los devuelve, siempre marcados como «Objeto sugiere obra».
    if ($("f-sin-unspsc").checked) p.set("incluir_sin_unspsc", "1");
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

  function chip(texto, clases, titulo) {
    const t = titulo ? ` title="${esc(titulo)}"` : "";
    return `<span${t} class="rounded-full px-2.5 py-0.5 text-xs font-medium ${clases}">${texto}</span>`;
  }

  /* Veredicto GRADUADO del matching UNSPSC. Nunca es un sí/no: dice CON QUÉ
     FUERZA el proceso encaja en el RUP, y el detalle completo viaja en el
     title (por qué casó, con qué clase del RUP).
       clase       la clase del RUP contiene al código publicado → sólido
       familia     la entidad publicó a nivel de familia → amplio, ver pliego
       equivalente clase afín según el histórico de adjudicaciones
       texto       sin código utilizable; lo confirma el objeto */
  const MATCH_UNSPSC = {
    clase: { texto: "RUP ✓", clases: "bg-green-100 text-green-800" },
    familia: { texto: "RUP ~ (familia)", clases: "bg-lime-100 text-lime-800" },
    equivalente: { texto: "RUP ≈ (clase afín)", clases: "bg-amber-100 text-amber-800" },
    texto: { texto: "Objeto sugiere obra", clases: "bg-amber-100 text-amber-800" },
    ninguno: { texto: "RUP ✗", clases: "bg-red-100 text-red-700" },
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
      ? `${d.titulo} — promedio ${fmtNum.format(promedio)} oferentes en ${procesos} proceso${procesos === 1 ? "" : "s"}`
      : d.titulo;
    return `<button type="button" data-entidad="${esc(entidad || "")}"
        title="${conBase ? "Ver los procesos que sostienen este promedio" : "Ver qué hay en el histórico de esta entidad"}"
        class="banda-competencia mt-3 inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium ring-1 ring-inset transition hover:underline ${d.clases}">
        <span aria-hidden="true">${d.emoji}</span>${esc(texto)}
        <span aria-hidden="true" class="opacity-60">›</span>
      </button>`;
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
          ${bandaCompetencia(l.competencia_entidad, l.entidad)}
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
        ${badgesRup(rup)}
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
    // el reparto por solidez del match dice de un vistazo cuántas son «RUP ✓»
    // y cuántas hay que verificar en el pliego
    const m = cuerpo.por_match || {};
    const porVerificar = (m.familia || 0) + (m.equivalente || 0) + (m.texto || 0);
    $("resumen-resultados").textContent =
      `${cuerpo.total} oportunidad${cuerpo.total === 1 ? "" : "es"} para el perfil «${$("f-perfil").selectedOptions[0].text}»`
      + (m.clase !== undefined ? ` · ${m.clase} con RUP ✓${porVerificar ? `, ${porVerificar} por verificar` : ""}` : "")
      + (cuerpo.incluye_sin_unspsc ? " · incluye procesos sin código UNSPSC" : "");
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

  /* ══════════ Detalle de competencia (modal) ══════════
     El badge afirma «promedio 3 oferentes en 12 procesos». Aquí se ven los 12,
     con los que quedaron fuera del promedio y POR QUÉ. El endpoint está
     protegido con el mismo HISTORICO_TOKEN que el diagnóstico, así que:
       · el token se guarda en sessionStorage (nunca en la URL, que quedaría en
         el historial del navegador y en los logs de acceso);
       · viaja por el header `x-historico-token`;
       · si falta, el propio modal lo pide; si el servidor lo rechaza, se borra
         y se vuelve a pedir. */
  const CLAVE_TOKEN = "historico_token";
  function tokenGuardado() {
    // sessionStorage puede lanzar (modo restringido / almacenamiento
    // particionado): sin este try el clic del badge moría en silencio
    try { return sessionStorage.getItem(CLAVE_TOKEN) || ""; } catch { return ""; }
  }
  function guardarToken(t) {
    try { sessionStorage.setItem(CLAVE_TOKEN, t); return true; } catch { return false; }
  }
  function olvidarToken() {
    try { sessionStorage.removeItem(CLAVE_TOKEN); } catch { /* nada que borrar */ }
  }

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
  function cerrarModal() {
    $modal().classList.add("hidden");
    $modal().classList.remove("flex");
    $modal().style.display = "none";
    document.removeEventListener("keydown", alPulsarTecla);
  }
  function alPulsarTecla(e) { if (e.key === "Escape") cerrarModal(); }
  function abrirModal(entidad) {
    $("modal-titulo").textContent = entidad || "Entidad no informada";
    $("modal-cuerpo").innerHTML = '<p class="py-8 text-center text-gray-400">Cargando…</p>';
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

  function pintarDetalle(d) {
    const i = d.indice || {};
    const banda = COMPETENCIA_ENTIDAD[i.nivel] || COMPETENCIA_ENTIDAD.sin_dato;
    // misma regla que el badge: un promedio sin procesos contados detrás no se
    // pinta (el servidor ya lo anula; aquí no se vuelve a interpolar a ciegas)
    const resumen = i.promedio_oferentes != null && i.procesos_contados > 0
      ? `<p class="mt-1 text-gray-600">Promedio ${fmtNum.format(i.promedio_oferentes)} oferentes · ${i.procesos_contados} proceso${i.procesos_contados === 1 ? "" : "s"}</p>
         <p class="text-xs text-gray-500">Mediana ${i.mediana_oferentes ?? "?"} · Mín ${i.min_oferentes ?? "?"} · Máx ${i.max_oferentes ?? "?"}</p>`
      : "";
    $("modal-cuerpo").innerHTML = `
      <p class="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${banda.clases}">
        <span aria-hidden="true">${banda.emoji}</span>${esc(banda.titulo)}
      </p>
      ${resumen}
      ${d.mensaje ? `<p class="mt-3 rounded-lg bg-amber-50 p-3 text-xs text-amber-800">${esc(d.mensaje)}</p>` : ""}
      ${tabla("Procesos incluidos", d.procesos || [], false)}
      ${tabla("Excluidos del promedio", d.excluidos || [], true,
    "Están cerrados o adjudicados, pero no cuentan para el promedio por el motivo indicado en cada uno.")}
      ${d.truncado ? `<p class="mt-3 text-xs text-gray-500">Se muestran los ${d.truncado.limite} más recientes de ${d.truncado.procesos || d.truncado.excluidos} procesos.</p>` : ""}
      ${(d.procesos || []).length || (d.excluidos || []).length ? "" : '<p class="mt-4 text-gray-500">No hay procesos históricos de esta entidad.</p>'}
      <p class="mt-4 text-xs text-gray-400">Datos del corpus histórico (procesos ya cerrados)${d.cache ? " · desde caché" : ""}.</p>`;
  }

  /* Formulario del token. REGLA: ninguna pulsación puede quedarse sin
     respuesta visible — un botón que «no hace nada» es peor que un error. Por
     eso el campo vacío avisa, el envío deshabilita el botón y muestra estado, y
     el fallo de almacenamiento se cuenta en vez de morir callado. */
  function pedirToken(entidad, aviso) {
    $("modal-cuerpo").innerHTML = `
      <div id="aviso-token" class="${aviso ? "" : "hidden "}mb-3 rounded-lg bg-red-50 p-3 text-sm font-medium text-red-700">${esc(aviso || "")}</div>
      <p class="text-gray-600">Este detalle sale del corpus histórico y está protegido con el mismo token que la
        extracción histórica (<code>HISTORICO_TOKEN</code>).</p>
      <form id="form-token" class="mt-3 flex flex-wrap gap-2">
        <input id="entrada-token" type="password" autocomplete="off" spellcheck="false" placeholder="Pegue aquí el token"
               class="min-w-0 flex-1 rounded-lg border-gray-300 text-sm focus:border-gray-900 focus:ring-gray-900/10">
        <button id="btn-token" type="submit"
                class="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-gray-700 disabled:opacity-50">
          Guardar y ver detalle
        </button>
      </form>
      <label class="mt-2 flex items-center gap-2 text-xs text-gray-500">
        <input id="ver-token" type="checkbox" class="h-3.5 w-3.5 rounded border-gray-300"> Mostrar el token
      </label>
      <p class="mt-2 text-xs text-gray-400">Se guarda solo en esta pestaña (sessionStorage) y viaja por cabecera,
        nunca en la URL.</p>`;

    const entrada = $("entrada-token");
    const aviso1 = (msg) => {
      const caja = $("aviso-token");
      caja.textContent = msg;
      caja.classList.remove("hidden");
    };
    const enviar = (e) => {
      if (e) e.preventDefault();
      const t = entrada.value.trim();
      if (!t) { aviso1("Pegue el token para poder consultar el detalle."); entrada.focus(); return; }
      if (!guardarToken(t)) { aviso1("Este navegador no permite guardar el token en la pestaña. Revise la configuración de almacenamiento."); return; }
      $("btn-token").disabled = true;
      cargarDetalle(entidad);
    };
    // submit del formulario Y clic del botón: si algo llegara a suprimir el
    // envío del formulario, el clic sigue funcionando
    $("form-token").addEventListener("submit", enviar);
    $("btn-token").addEventListener("click", enviar);
    $("ver-token").addEventListener("change", (e) => {
      entrada.type = e.target.checked ? "text" : "password";
    });
    entrada.focus();
  }

  async function cargarDetalle(entidad) {
    const token = tokenGuardado();
    if (!token) return pedirToken(entidad, null);
    $("modal-cuerpo").innerHTML = '<p class="py-8 text-center text-gray-400">Consultando el histórico…</p>';
    let r, cuerpo;
    try {
      r = await fetch(`/api/competencia-detalle?entidad=${encodeURIComponent(entidad)}`,
        { headers: { "x-historico-token": token } });
      cuerpo = await r.json();
    } catch {
      $("modal-cuerpo").innerHTML = '<p class="py-6 text-center text-red-600">No se pudo contactar el servidor. Intente de nuevo.</p>';
      return;
    }
    if (r.status === 401) {
      olvidarToken();
      return pedirToken(entidad, "Token inválido. Escriba uno nuevo y vuelva a intentarlo.");
    }
    if (!r.ok || !cuerpo || !cuerpo.ok) {
      $("modal-cuerpo").innerHTML = `<p class="py-6 text-center text-red-600">${esc((cuerpo && cuerpo.error) || `Error del servidor (${r.status}).`)}</p>`;
      return;
    }
    pintarDetalle(cuerpo);
  }

  // delegación: las tarjetas se repintan en cada búsqueda, así que el listener
  // vive en el contenedor y no en cada badge
  $("lista").addEventListener("click", (e) => {
    const b = e.target.closest(".banda-competencia");
    if (!b) return;
    const entidad = b.getAttribute("data-entidad");
    abrirModal(entidad);
    cargarDetalle(entidad);
  });
  $("modal-cerrar").addEventListener("click", cerrarModal);
  $("modal-cerrar-pie").addEventListener("click", cerrarModal);
  $("modal-fondo").addEventListener("click", cerrarModal);

  /* ══════════ Eventos ══════════ */
  $("btn-buscar").addEventListener("click", () => { pagina = 1; reintentosSync = 0; buscar(); });
  $("btn-reintentar").addEventListener("click", () => { reintentosSync = 0; buscar(); });
  for (const id of ["f-perfil", "f-cuantia", "f-competencia", "f-entidad", "f-ubicacion", "f-ordenar", "f-orden", "f-sin-unspsc"]) {
    $(id).addEventListener("change", () => { pagina = 1; buscar(); });
  }

  /* ══════════ Arranque ══════════ */
  /* Va AL FINAL a propósito. Estaba junto al gate, y en cada visita repetida
     de la misma pestaña (`detecta-acceso` ya en sessionStorage) llamaba a
     `buscar()` antes de que se inicializaran `pagina`/`timerReintento`: el
     `clearTimeout(timerReintento)` de la primera línea de `buscar` reventaba
     con «Cannot access 'timerReintento' before initialization». Como `buscar`
     es async, el error salía por una promesa rechazada —la consola lo mostraba
     y la app se quedaba sin resultados, en silencio— en vez de detener la
     carga. Aquí ya está todo declarado y cableado. */
  if (sessionStorage.getItem("detecta-acceso") === "1") abrirApp();
})();
