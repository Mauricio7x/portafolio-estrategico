/* public/portada.js · La portada: el pulso del mercado (Fase 9 · Detekta v4)
   ─────────────────────────────────────────────────────────────────────────────
   Pinta, en la primera pantalla y SIN cuenta ni RUP, lo que está pasando en el
   mercado: procesos abiertos, dinero en juego, entidades, lo que cierra esta
   semana, lo que todavía admite manifestar interés, quién contrata y dónde.
   Todo sale de `/api/procesos?op=portada` (agregado precalculado con su fecha)
   y `op=manifestacion` (recalculado con la fecha de hoy). Reglas:
   · Cada bloque lleva su fuente y su hora; si el agregado tiene más de 24 h se
     dice («Última actualización: ayer …»). Nunca un número viejo como de hoy.
   · Máximo tres cifras por bloque; cada visual es un enlace a la lista
     filtrada (Fase 8): sin enlace, sobra.
   · «Suele bajar» solo con n ≥ 5 (lo decide el servidor: `baja:null` si no);
     aquí se pinta «Sin referencia».
   · Ninguna cuenta regresiva sobre una fecha calculada sin decir que lo es.
   · Sin datos (clave no calculada todavía) la sección queda OCULTA: portada
     vacía y honesta antes que portada bonita y falsa.
   Expone `window.Portada.arrancar()` (idempotente); app.js la llama cuando la
   landing es la vista. También sirve en Node para probar los formateadores. */
(function (raiz, fabrica) {
  const api = fabrica();
  if (typeof module === "object" && module.exports) module.exports = api;
  else raiz.Portada = api;
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const num = (n, d = 0) => Number(n || 0).toLocaleString("es-CO", { maximumFractionDigits: d });
  /* $4,7 billones · $312.000 millones · $52 millones · $850.000. Un billón
     colombiano son 10¹². */
  function pesosCortos(n) {
    const v = Number(n);
    if (!Number.isFinite(v) || v <= 0) return null;
    if (v >= 1e12) return `$${num(v / 1e12, 1)} billones`;
    if (v >= 1e9) return `$${num(Math.round(v / 1e6))} millones`;
    if (v >= 1e6) return `$${num(v / 1e6, 1)} millones`;
    return `$${num(v)}`;
  }
  /* «Actualizado hoy a las 6:00 a. m.» / «Última actualización: ayer 6:00 a. m.» */
  function textoActualizado(iso, ahora = Date.now()) {
    const t = Date.parse(iso);
    if (!Number.isFinite(t)) return "Fecha de actualización desconocida";
    const hora = new Date(t).toLocaleTimeString("es-CO", { hour: "numeric", minute: "2-digit", timeZone: "America/Bogota" });
    const hoy = new Date(ahora).toLocaleDateString("es-CO", { timeZone: "America/Bogota" });
    const dia = new Date(t).toLocaleDateString("es-CO", { timeZone: "America/Bogota" });
    const ayer = new Date(ahora - 86400000).toLocaleDateString("es-CO", { timeZone: "America/Bogota" });
    if (dia === hoy) return `Actualizado hoy a las ${hora} desde el SECOP II`;
    if (dia === ayer) return `Última actualización: ayer ${hora} (SECOP II)`;
    return `Última actualización: ${new Date(t).toLocaleDateString("es-CO", { day: "numeric", month: "long", timeZone: "America/Bogota" })}, ${hora} (SECOP II)`;
  }
  const enlaceLista = (params) => `/?${params}#/licitaciones`;

  /* ── plantillas ── */
  /* `conBoton`: el botón «Ver a cuáles puedo presentarme» solo tiene sentido
     cuando la portada se ve ANTES de entrar (landing). Desde ago 2026 la
     portada vive DENTRO del tablero, plegada bajo el pulso personalizado, y
     ahí ese botón sobraría; queda como opción para conservar el contrato. */
  function htmlHero(p, { conBoton = true } = {}) {
    const cifra = (v, r) => `<div><p class="text-[24px] font-semibold tracking-tight sm:text-[40px]" style="color: var(--text-primary); letter-spacing: -1px;">${esc(v)}</p><p class="text-xs uppercase tracking-wide" style="color: var(--text-secondary);">${esc(r)}</p></div>`;
    return `
      <p class="text-[22px] leading-tight sm:text-[28px]" style="color: var(--text-primary); font-weight: 300;">Hoy hay dinero público esperando contratista.</p>
      <div class="mt-5 grid grid-cols-3 gap-3">
        ${cifra(num(p.procesosAbiertos), "procesos abiertos")}
        ${cifra(pesosCortos(p.valorTotal) || "Sin referencia", "en juego")}
        ${cifra(num(p.entidadesActivas), "entidades")}
      </div>
      <p class="mt-3 text-xs" style="color: var(--text-secondary);">${esc(textoActualizado(p.generado))}${p.desactualizada ? " — el dato tiene más de un día; la próxima sincronización lo renueva." : ""}</p>
      ${conBoton ? `<button id="pt-btn-cuales" type="button" class="btn-vidrio-acento mt-5 w-full sm:w-auto">Ver a cuáles puedo presentarme</button>
      <p class="mt-2 text-xs" style="color: var(--text-secondary);">Para eso hace falta su RUP o tres datos de su empresa: toma menos de un minuto y no guardamos el documento.</p>` : ""}`;
  }
  /* El TEASER de la landing (ago 2026): tres cifras del mercado entero y cero
     prosa, para que quien llega vea de entrada que hay datos detrás. Es lo
     ÚNICO «de fuera» que se enseña antes de elegir cómo entrar. */
  function htmlTeaser(p) {
    const cifra = (v, r) => `<div class="cifra"><b>${esc(v)}</b><span>${esc(r)}</span></div>`;
    return `${cifra(num(p.procesosAbiertos), "licitaciones abiertas hoy")}${cifra(pesosCortos(p.valorTotal) || "Sin referencia", "en juego")}${cifra(num(p.entidadesActivas), "entidades contratando")}`;
  }
  function htmlCierran(p) {
    const c = p.cierranEstaSemana || { n: 0, valor: 0, muestra: [] };
    if (!c.n) return `<h2 class="text-base font-semibold" style="color: var(--text-primary);">Cierran esta semana</h2><p class="mt-1 text-sm" style="color: var(--text-secondary);">Ningún proceso del corpus cierra en los próximos 7 días.</p>`;
    return `
      <h2 class="text-base font-semibold" style="color: var(--text-primary);">Cierran esta semana</h2>
      <p class="mt-1 text-sm" style="color: var(--text-secondary);">${num(c.n)} proceso${c.n === 1 ? "" : "s"}${c.valor ? ` · ${esc(pesosCortos(c.valor))}` : ""}</p>
      <ul class="mt-3 space-y-2">
        ${(c.muestra || []).map((m) => `<li class="rounded-xl px-4 py-3" style="background: var(--bg-inset);">
          <p class="text-xs uppercase tracking-wide" style="color: var(--text-secondary);">${esc(m.entidad || "Entidad no informada")}</p>
          <p class="mt-0.5 text-sm" style="color: var(--text-primary);">${esc(m.objeto || "")}</p>
          <p class="mt-1 text-xs" style="color: var(--text-secondary);">${m.valor ? esc(pesosCortos(m.valor)) : "Valor no publicado"} · ${m.dias === 0 ? "cierra hoy" : m.dias === 1 ? "cierra mañana" : `cierra en ${m.dias} días`}${m.enlaceSecop ? ` · <a class="underline" href="${esc(m.enlaceSecop)}" target="_blank" rel="noopener noreferrer">Ver en SECOP II</a>` : ""}</p>
        </li>`).join("")}
      </ul>
      <a class="mt-3 inline-block text-sm font-medium underline" style="color: var(--accent);" href="${enlaceLista("cierre=7d")}">Ver ${c.n === 1 ? "el proceso" : `los ${num(c.n)}`} →</a>`;
  }
  function htmlManifestacion(p, m) {
    const abiertos = (m && m.resultados) || [];
    const prox = p.manifestacion && p.manifestacion.proximos;
    const filas = abiertos.slice(0, 5).map((f) => {
      /* La ley fija un MÁXIMO de días de oficina, no un plazo: la entidad pone
         el suyo en el pliego. Sin la fecha del cronograma no hay cuenta atrás
         (defecto del 19-ago-2026: la app dijo «vence mañana» sobre un plazo
         cerrado dos días antes). Ver la cabecera de lib/manifestacion. */
      const d = f.diasHabilesRestantes;
      const quedan = f.estado === "por_confirmar"
        ? "El plazo puede estar cerrando hoy o haber cerrado: verifíquelo en SECOP II"
        : f.fechaLimiteISO && d != null
          ? (d === 0 ? "Vence hoy: avise HOY" : `Le queda${d === 1 ? "" : "n"} ${d} día${d === 1 ? "" : "s"} de oficina para avisar que le interesa`)
          : f.puedeCerrarDesdeLegible
            ? `El plazo puede cerrar el ${f.puedeCerrarDesdeLegible}: avise hoy`
            : "Plazo no calculable: consulte el cronograma en SECOP II";
      return `<li class="rounded-xl px-4 py-3" style="background: var(--bg-inset);">
        <p class="text-xs uppercase tracking-wide" style="color: var(--text-secondary);"><span aria-hidden="true">●</span> ${esc(f.entidad || "Entidad no informada")}</p>
        <p class="mt-0.5 text-sm" style="color: var(--text-primary);">${esc(f.objeto || "")}</p>
        <p class="mt-1 text-sm font-medium" style="color: var(--text-primary);">${f.valor ? esc(pesosCortos(f.valor)) + " · " : ""}${esc(quedan)}.</p>
        <p class="text-xs" style="color: var(--text-secondary);">Si no avisa, no puede presentarse aunque cumpla todo.${f.fechaLimiteLegible ? ` Vence el ${esc(f.fechaLimiteLegible)} (cronograma del pliego).`
          : f.puedeCerrarDesdeLegible ? ` El plazo puede cerrar entre el ${esc(f.puedeCerrarDesdeLegible)} y el ${esc(f.venceMaximoLegible || "")}.` : ""} <span title="${esc(f.nota || "")}">${f.fechaLimiteLegible ? "Fecha tomada del cronograma del pliego." : "La ley fija un máximo, no un plazo: la fecha exacta está en el cronograma del proceso."}</span>${f.enlaceSecop ? ` <a class="underline" href="${esc(f.enlaceSecop)}" target="_blank" rel="noopener noreferrer">Ver proceso</a>` : ""}</p>
      </li>`;
    }).join("");
    return `
      <h2 class="text-base font-semibold" style="color: var(--text-primary);">Todavía puede avisar que le interesa</h2>
      <p class="mt-1 text-sm" style="color: var(--text-secondary);">En los procesos pequeños (selección abreviada de menor cuantía) primero hay que avisar que le interesa. El plazo lo fija la entidad en el pliego y por ley no puede pasar de ${p.manifestacion ? p.manifestacion.plazoHabiles : 3} días de oficina desde la apertura, así que suele ser más corto: avise el mismo día. Si avisan más de ${p.manifestacion ? p.manifestacion.sorteoDesde : 10}, la entidad puede sortear.</p>
      <p class="mt-3 text-xs font-medium uppercase tracking-wide" style="color: var(--text-secondary);">Abierto ahora${abiertos.length ? ` · ${abiertos.length}` : ""}</p>
      ${abiertos.length ? `<ul class="mt-2 space-y-2">${filas}</ul>${abiertos.length > 5 ? `<p class="mt-2 text-xs" style="color: var(--text-secondary);">y ${abiertos.length - 5} más.</p>` : ""}` : `<p class="mt-1 text-sm" style="color: var(--text-secondary);">Ninguno con el plazo corriendo hoy.</p>`}
      <p class="mt-4 text-xs font-medium uppercase tracking-wide" style="color: var(--text-secondary);">Próximos a abrir</p>
      <p class="mt-1 text-sm" style="color: var(--text-secondary);">${prox == null ? "Sin referencia — el plan anual de las entidades no respondió al calcular la portada." : `${num(prox)} obra${prox === 1 ? "" : "s"} previstas en los planes anuales de las entidades para los próximos 12 meses. Un plan no es un compromiso.`}</p>
      <p class="mt-2 text-[11px]" style="color: var(--text-secondary);">Fuente: SECOP II (p6dx-8zbt) y Plan Anual de Adquisiciones (9sue-ezhx). Plazo: Decreto 1082 de 2015, art. 2.2.1.2.1.2.20.</p>`;
  }
  function htmlEntidades(p) {
    const filas = (p.topEntidades || []).slice(0, 8);
    if (!filas.length) return "";
    return `
      <h2 class="text-base font-semibold" style="color: var(--text-primary);">Quién está contratando</h2>
      <div class="mt-2 overflow-x-auto">
      <table class="w-full text-left text-sm">
        <thead><tr class="text-[11px] uppercase tracking-wide" style="color: var(--text-secondary);"><th class="py-1 pr-2 font-medium">Entidad</th><th class="py-1 pr-2 text-right font-medium">Abiertos</th><th class="py-1 pr-2 text-right font-medium">En juego</th><th class="py-1 text-right font-medium">Suele bajar</th></tr></thead>
        <tbody>${filas.map((e) => `<tr class="border-t" style="border-color: var(--border);">
          <td class="py-2 pr-2"><a class="underline-offset-2 hover:underline" style="color: var(--text-primary);" href="${enlaceLista("entidad=" + encodeURIComponent(e.nit || e.nombre))}">${esc(e.nombre)}</a></td>
          <td class="py-2 pr-2 text-right" style="color: var(--text-primary);">${num(e.abiertos)}</td>
          <td class="py-2 pr-2 text-right whitespace-nowrap" style="color: var(--text-primary);">${esc(pesosCortos(e.valor) || "Sin referencia")}</td>
          <td class="py-2 text-right whitespace-nowrap" style="color: var(--text-secondary);" title="${e.baja == null ? `Sin referencia: hacen falta ${p.bajaMinimoProcesos || 5} adjudicaciones conocidas de esta entidad${e.nBaja ? ` y hay ${e.nBaja}` : ""}` : `Mediana de lo que descontaron los ganadores en ${e.nBaja} contratos adjudicados de esta entidad`}">${e.baja == null ? "Sin referencia" : `${num(e.baja, 1)} %`}</td>
        </tr>`).join("")}</tbody>
      </table></div>
      <p class="mt-2 text-[11px]" style="color: var(--text-secondary);">«Suele bajar» = mediana del descuento de los ganadores frente al presupuesto, solo con 5 o más adjudicaciones conocidas. Cada fila lleva a su lista.</p>`;
  }
  function htmlDepartamentos(p) {
    const deps = (p.porDepartamento || []).filter((d) => d.cod !== "sin_dato").slice(0, 10);
    if (!deps.length) return "";
    const max = Math.max(...deps.map((d) => d.valor || 0), 1);
    return `
      <h2 class="text-base font-semibold" style="color: var(--text-primary);">Dónde hay más movimiento</h2>
      <ul class="mt-2 space-y-1.5">${deps.map((d) => `<li>
        <a class="block" href="${enlaceLista("dep=" + d.cod)}" title="${esc(d.nombre)}: ${num(d.n)} procesos abiertos, ${esc(pesosCortos(d.valor) || "sin valor publicado")}. Ver la lista.">
          <span class="flex justify-between text-xs" style="color: var(--text-primary);"><span>${esc(d.nombre)}</span><span style="color: var(--text-secondary);">${num(d.n)} · ${esc(pesosCortos(d.valor) || "—")}</span></span>
          <span class="mt-0.5 block h-1.5 rounded-full" style="background: var(--bg-inset-2);"><span class="block h-1.5 rounded-full" style="width:${Math.max(2, Math.round(100 * (d.valor || 0) / max))}%; background: var(--accent);"></span></span>
        </a></li>`).join("")}</ul>
      <p class="mt-2 text-[11px]" style="color: var(--text-secondary);">Barras por dinero en juego. Clic en un departamento para ver su lista.${(p.porDepartamento || []).some((d) => d.cod === "sin_dato") ? " Los procesos sin departamento publicado no se reparten a ojo." : ""}</p>`;
  }

  /* ── arranque ── */
  /* una sola petición del agregado por página, compartida por el teaser de la
     landing y la portada del tablero */
  let promesaAgregado = null;
  function agregado() {
    if (!promesaAgregado) {
      promesaAgregado = fetch("/api/procesos?op=portada").then((r) => r.json()).catch(() => null)
        .then((p) => { if (!p || !p.ok || !p.disponible) { promesaAgregado = null; return null; } return p; });
    }
    return promesaAgregado;
  }
  let teaserPintado = false;
  async function teaser(doc) {
    const d = doc || (typeof document !== "undefined" ? document : null);
    const caja = d && d.getElementById("pulso-global");
    if (!caja || teaserPintado) return false;
    const p = await agregado();
    if (!p) return false;                       // sin agregado, la franja sigue oculta
    caja.innerHTML = htmlTeaser(p);
    caja.title = textoActualizado(p.generado);
    caja.classList.remove("hidden");
    teaserPintado = true;
    return true;
  }
  let arrancada = false;
  async function arrancar(doc) {
    const d = doc || (typeof document !== "undefined" ? document : null);
    if (!d || arrancada) return false;
    const raizPortada = d.getElementById("portada");
    if (!raizPortada) return false;
    arrancada = true;
    let p = null, m = null;
    p = await agregado();
    const vacio = d.getElementById("pt-vacio");
    if (!p) { arrancada = false; if (vacio) vacio.textContent = "Todavía no hay un agregado del mercado calculado (lo escribe la primera sincronización con datos)."; return false; } // vacía y honesta: la sección sigue oculta
    try { const r = await fetch("/api/procesos?op=manifestacion&estado=abierto"); m = await r.json(); } catch { m = null; }
    // dentro del tablero el botón «Ver a cuáles puedo presentarme» sobra: ya entró
    d.getElementById("pt-hero").innerHTML = htmlHero(p, { conBoton: !!d.getElementById("entrada-inicio") && !d.getElementById("pulso") });
    if (vacio) vacio.classList.add("hidden");
    d.getElementById("pt-cierran").innerHTML = htmlCierran(p);
    d.getElementById("pt-manifestacion").innerHTML = htmlManifestacion(p, m && m.ok ? m : null);
    d.getElementById("pt-entidades").innerHTML = htmlEntidades(p);
    d.getElementById("pt-departamentos").innerHTML = htmlDepartamentos(p);
    d.getElementById("pt-fuente").textContent = p.fuente || "";
    raizPortada.classList.remove("hidden");
    const btn = d.getElementById("pt-btn-cuales");
    if (btn) btn.addEventListener("click", () => {
      const destino = d.getElementById("entrada-inicio") || d.getElementById("btn-subir-rup");
      if (destino && destino.scrollIntoView) destino.scrollIntoView({ behavior: "smooth", block: "center" });
      const b = d.getElementById("btn-subir-rup"); if (b && b.focus) setTimeout(() => b.focus(), 400);
    });
    return true;
  }

  return { arrancar, teaser, pesosCortos, textoActualizado, htmlHero, htmlTeaser, htmlCierran, htmlManifestacion, htmlEntidades, htmlDepartamentos, enlaceLista };
});
