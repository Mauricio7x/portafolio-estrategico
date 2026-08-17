/* public/pulso.js · EL PULSO PERSONALIZADO del tablero (ago 2026)
   ─────────────────────────────────────────────────────────────────────────────
   Lo primero que ve el ingeniero al entrar: las cifras DE SU EMPRESA, no del
   mercado en general. «Para su empresa hoy: 47 licitaciones · $312.000
   millones en juego · 6 cierran esta semana», dónde están (barras por
   departamento) y quién las publica (entidades), cada una enlazando a la
   lista filtrada de la Fase 8. Encargo del dueño: la portada del mercado
   entero salía ANTES de que la persona eligiera cómo entrar; ahora primero se
   entra y después salen los datos, personalizados al RUP.

   Todo sale de `/api/perfil?op=pulso&perfil=…` (lib/handlers/perfil/pulso),
   que llama a la MISMA cascada del listado: `total` es exactamente el total
   de la lista sin filtros. Reglas:
   · Máximo tres cifras grandes; cada visual es un enlace a la lista filtrada
     (`data-filtro` → app.js aplica el filtro EN LA MISMA PÁGINA, sin recargar).
   · Sin datos (perfil sin corpus, error de red) la sección queda OCULTA:
     vacía y honesta antes que bonita y falsa. `null` jamás se pinta como 0.
   · Sin prosa: un rótulo por cifra y una línea de fuente. La explicación
     larga vive en «Más detalles» de cada tarjeta, no aquí.
   Expone `window.Pulso.arrancar(perfil)`; también sirve en Node (pruebas). */
(function (raiz, fabrica) {
  const api = fabrica();
  if (typeof module === "object" && module.exports) module.exports = api;
  else raiz.Pulso = api;
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const num = (n, d = 0) => Number(n || 0).toLocaleString("es-CO", { maximumFractionDigits: d });
  /* $4,7 billones · $312.000 millones · $52,4 millones — la misma escala que la
     portada (Portada.pesosCortos); duplicada aquí solo porque este módulo tiene
     que servir en Node sin cargar aquel, y hay prueba que compara las dos. */
  function pesosCortos(n) {
    const v = Number(n);
    if (!Number.isFinite(v) || v <= 0) return null;
    if (v >= 1e12) return `$${num(v / 1e12, 1)} billones`;
    if (v >= 1e9) return `$${num(Math.round(v / 1e6))} millones`;
    if (v >= 1e6) return `$${num(v / 1e6, 1)} millones`;
    return `$${num(v)}`;
  }

  /* ── plantillas ── */
  const cifraGrande = (v, rotulo, attrs = "") => `<div ${attrs}><p class="text-[26px] font-semibold tracking-tight sm:text-[40px]" style="color: var(--text-primary); letter-spacing: -1px;">${esc(v)}</p><p class="text-[11px] uppercase tracking-wide sm:text-xs" style="color: var(--text-secondary);">${esc(rotulo)}</p></div>`;

  function htmlHero(p, nombrePerfil) {
    const quien = nombrePerfil ? `Para ${esc(nombrePerfil)}, hoy` : "Para su empresa, hoy";
    if (!p.total) {
      return `<p class="text-[20px] leading-tight sm:text-[26px]" style="color: var(--text-primary); font-weight: 300;">${quien}: ninguna licitación abierta encaja con su perfil.</p>
        <p class="mt-2 text-sm" style="color: var(--text-secondary);">${p.corpus_vacio ? "Todavía no hay licitaciones cargadas en el sistema." : `Hay ${num(p.visibles)} de su tipo de obra, pero ninguna pasa las cuatro puertas (registro, capacidad, caja, competencia). Suba un RUP más completo o revise Mi empresa.`}</p>`;
    }
    const c = p.cierranEstaSemana || { n: 0, valor: null };
    return `
      <p class="text-[20px] leading-tight sm:text-[26px]" style="color: var(--text-primary); font-weight: 300;">${quien}</p>
      <div class="mt-4 grid grid-cols-3 gap-3">
        ${cifraGrande(num(p.total), p.total === 1 ? "licitación a la que puede presentarse" : "licitaciones a las que puede presentarse", `class="cursor-pointer" data-filtro="todo" role="link" tabindex="0" title="Ver la lista completa"`)}
        ${cifraGrande(pesosCortos(p.valorTotal) || "Sin referencia", "en juego (presupuestos oficiales)")}
        ${cifraGrande(num(c.n), c.n === 1 ? "cierra esta semana" : "cierran esta semana", `class="cursor-pointer" data-filtro="cierre=7d" role="link" tabindex="0" title="Ver las que cierran en 7 días"`)}
      </div>
      ${c.n && c.valor ? `<p class="mt-2 text-xs" style="color: var(--text-secondary);">Las que cierran esta semana suman ${esc(pesosCortos(c.valor))}.</p>` : ""}`;
  }

  function htmlDepartamentos(p) {
    const deps = (p.porDepartamento || []).slice(0, 8);
    if (!deps.length) return "";
    const max = Math.max(...deps.map((d) => d.n || 0), 1);
    return `
      <h2 class="text-sm font-semibold" style="color: var(--text-primary);">Dónde están</h2>
      <ul class="mt-2 space-y-1.5">${deps.map((d) => `<li>
        <a class="block" href="?dep=${encodeURIComponent(d.nombre)}#/licitaciones" data-filtro="dep=${esc(d.nombre)}" title="${esc(d.nombre)}: ${num(d.n)} para usted, ${esc(pesosCortos(d.valor) || "sin valor publicado")}. Ver la lista.">
          <span class="flex justify-between text-xs" style="color: var(--text-primary);"><span>${esc(d.nombre)}</span><span style="color: var(--text-secondary);">${num(d.n)} · ${esc(pesosCortos(d.valor) || "—")}</span></span>
          <span class="mt-0.5 block h-1.5 rounded-full" style="background: var(--bg-inset-2);"><span class="block h-1.5 rounded-full" style="width:${Math.max(3, Math.round(100 * (d.n || 0) / max))}%; background: var(--accent);"></span></span>
        </a></li>`).join("")}</ul>
      ${p.departamentosDistintos > deps.length ? `<p class="mt-2 text-[11px]" style="color: var(--text-secondary);">y ${num(p.departamentosDistintos - deps.length)} departamentos más.</p>` : ""}`;
  }

  function htmlEntidades(p) {
    const filas = (p.topEntidades || []).slice(0, 8);
    if (!filas.length) return "";
    return `
      <h2 class="text-sm font-semibold" style="color: var(--text-primary);">Quién las publica</h2>
      <ul class="mt-2 divide-y" style="border-color: var(--border);">${filas.map((e) => `<li class="flex items-baseline justify-between gap-3 py-1.5 text-xs">
        <a class="min-w-0 truncate underline-offset-2 hover:underline" style="color: var(--text-primary);" href="?entidad=${encodeURIComponent(e.nit || e.nombre)}#/licitaciones" data-filtro="entidad=${esc(e.nit || e.nombre)}" title="${esc(e.nombre)}">${esc(e.nombre)}</a>
        <span class="shrink-0 whitespace-nowrap" style="color: var(--text-secondary);">${num(e.n)} · ${esc(pesosCortos(e.valor) || "—")}</span>
      </li>`).join("")}</ul>
      ${p.entidadesDistintas > filas.length ? `<p class="mt-2 text-[11px]" style="color: var(--text-secondary);">y ${num(p.entidadesDistintas - filas.length)} entidades más.</p>` : ""}`;
  }

  function htmlNota(p) {
    const cuando = p.generado ? new Date(p.generado).toLocaleTimeString("es-CO", { hour: "numeric", minute: "2-digit", timeZone: "America/Bogota" }) : "";
    return `Calculado para su perfil sobre el SECOP II${cuando ? ` a las ${cuando.replace(/\.$/, "")}` : ""}. Cada cifra lleva a su lista.`;
  }

  /* ── arranque ── */
  let perfilPintado = null;
  async function arrancar(perfil, opciones = {}) {
    const d = opciones.doc || (typeof document !== "undefined" ? document : null);
    if (!d) return false;
    const raiz = d.getElementById("pulso");
    if (!raiz || !perfil) return false;
    if (perfilPintado === perfil && !opciones.forzar) return true;
    let p = null;
    try { const r = await fetch(`/api/perfil?op=pulso&perfil=${encodeURIComponent(perfil)}`); p = await r.json(); } catch { p = null; }
    if (!p || !p.ok) { raiz.classList.add("hidden"); perfilPintado = null; return false; }   // vacía y honesta
    d.getElementById("pu-hero").innerHTML = htmlHero(p, opciones.nombre || "");
    d.getElementById("pu-departamentos").innerHTML = htmlDepartamentos(p);
    d.getElementById("pu-entidades").innerHTML = htmlEntidades(p);
    d.getElementById("pu-nota").textContent = htmlNota(p);
    // sin departamentos ni entidades (perfil sin licitaciones) las dos cajas se esconden
    d.getElementById("pu-departamentos").classList.toggle("hidden", !(p.porDepartamento || []).length);
    d.getElementById("pu-entidades").classList.toggle("hidden", !(p.topEntidades || []).length);
    raiz.classList.remove("hidden");
    perfilPintado = perfil;
    return true;
  }
  const olvidar = () => { perfilPintado = null; };

  return { arrancar, olvidar, pesosCortos, htmlHero, htmlDepartamentos, htmlEntidades, htmlNota };
});
