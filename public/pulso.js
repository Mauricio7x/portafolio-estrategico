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

  /* ── gráfico de barras (SVG en línea, sin dependencias) ──
     Cuatro o cinco cubetas con conteo encima y rótulo debajo; cada barra es
     un enlace a la lista filtrada por ESA cubeta (las cubetas son las mismas
     de los filtros: public/filtros.js). El color viene de las custom
     properties del tema (style="fill: var(--accent)"), así que respeta el
     modo oscuro y «aumentar contraste» sin una regla más. Sin datos (todas
     las cubetas en 0) no se dibuja: una gráfica de ceros no informa nada. */
  /* public/filtros.js es UMD igual que este módulo: en el navegador vive en
     `window.Filtros` y en Node se requiere. Se resuelve en cada llamada y no en
     tiempo de carga porque este archivo se carga ANTES en index.html. */
  function raizFiltros() {
    if (typeof window !== "undefined" && window.Filtros) return window.Filtros;
    try { return require("./filtros.js"); } catch { return null; }
  }
  function svgBarras(cubetas, { ancho = 320, alto = 150, filtroDe = () => null } = {}) {
    const n = cubetas.length;
    if (!n) return "";
    const max = Math.max(...cubetas.map((c) => c.n || 0));
    if (!max) return "";
    const margen = { arriba: 22, abajo: 26, lados: 8 };
    const anchoUtil = ancho - margen.lados * 2;
    const paso = anchoUtil / n;
    const anchoBarra = Math.min(48, paso * 0.62);
    const altoUtil = alto - margen.arriba - margen.abajo;
    const barras = cubetas.map((c, i) => {
      const h = Math.max(c.n ? 3 : 0, Math.round(altoUtil * (c.n || 0) / max));
      const x = margen.lados + paso * i + (paso - anchoBarra) / 2;
      const y = margen.arriba + altoUtil - h;
      const cx = margen.lados + paso * i + paso / 2;
      const filtro = filtroDe(c);
      const abre = filtro ? `<a href="?${esc(filtro)}#/licitaciones" data-filtro="${esc(filtro)}" role="link" tabindex="0" title="${esc(c.titulo || c.etiqueta)}: ${num(c.n)} · ${esc(pesosCortos(c.valor) || "sin valor publicado")}. Ver la lista.">` : "<g>";
      const cierra = filtro ? "</a>" : "</g>";
      const rotulo = String(c.corto || c.etiqueta || "");
      return `${abre}
        <rect x="${x.toFixed(1)}" y="${margen.arriba}" width="${anchoBarra.toFixed(1)}" height="${altoUtil}" rx="6" style="fill: transparent;"></rect>
        <rect x="${x.toFixed(1)}" y="${y}" width="${anchoBarra.toFixed(1)}" height="${h}" rx="6" style="fill: var(--accent); opacity: ${c.n ? 0.9 : 0.25};"></rect>
        <text x="${cx.toFixed(1)}" y="${y - 6}" text-anchor="middle" font-size="12" font-weight="600" style="fill: var(--text-primary);">${num(c.n)}</text>
        <text x="${cx.toFixed(1)}" y="${alto - 12}" text-anchor="middle" font-size="10" style="fill: var(--text-secondary);">${esc(rotulo)}</text>
      ${cierra}`;
    }).join("");
    const linea = `<line x1="${margen.lados}" y1="${margen.arriba + altoUtil + 0.5}" x2="${ancho - margen.lados}" y2="${margen.arriba + altoUtil + 0.5}" style="stroke: var(--border); stroke-width: 1;"></line>`;
    return `<svg viewBox="0 0 ${ancho} ${alto}" role="img" aria-label="Distribución" style="display:block; width:100%; height:auto; max-height: ${alto + 40}px; font-family: inherit;">${linea}${barras}</svg>`;
  }
  const ROTULO_CIERRE = { "3d": "≤ 3 días", "7d": "esta semana", "15d": "≤ 15 días", "+15d": "+ 15 días" };
  const ROTULO_CUANTIA = { hasta_50m: "≤ $50 M", "50_200m": "$50–200 M", "200_1000m": "$200–1.000 M", mas_1000m: "> $1.000 M" };
  function htmlCierre(p) {
    const cubetas = (p.porCierre || []).map((c) => ({ ...c, corto: ROTULO_CIERRE[c.id] || c.etiqueta, titulo: c.etiqueta }));
    const svg = svgBarras(cubetas, { filtroDe: (c) => `cierre=${c.id}` });
    if (!svg) return "";
    return `<h2 class="text-sm font-semibold" style="color: var(--text-primary);">Cuándo hay que entregar la oferta</h2>${svg}${p.cierreSinFecha ? `<p class="text-[11px]" style="color: var(--text-secondary);">${num(p.cierreSinFecha)} sin fecha de cierre publicada.</p>` : ""}`;
  }
  function htmlCuantia(p) {
    const cubetas = (p.porCuantia || []).map((c) => ({ ...c, corto: ROTULO_CUANTIA[c.id] || c.etiqueta, titulo: c.etiqueta }));
    const svg = svgBarras(cubetas, { filtroDe: (c) => `min=${c.min || 0}${c.max != null ? `&max=${c.max}` : ""}` });
    if (!svg) return "";
    return `<h2 class="text-sm font-semibold" style="color: var(--text-primary);">Cuánto valen</h2>${svg}${p.cuantiaSinDato ? `<p class="text-[11px]" style="color: var(--text-secondary);">${num(p.cuantiaSinDato)} sin presupuesto publicado.</p>` : ""}`;
  }

  /* ═══ QUÉ TIPO DE TRABAJO Y CÓMO LO ADJUDICAN (encargo del ingeniero, ago
     2026) ═══ Los repartos llegan de `FiltrosLista.facetas`, la MISMA función
     que cuenta las facetas del listado, así que el pulso y la lista no pueden
     discrepar sobre el mismo corpus. Las etiquetas salen de public/filtros.js
     —una segunda tabla de nombres se desincronizaría del selector— y cada barra
     es literalmente su filtro. Las cubetas en cero se conservan: que una
     modalidad no aparezca y que no tenga procesos son cosas distintas, y la
     primera se lee como la segunda. `sin_dato` NO se grafica: no es un filtro
     al que se pueda ir, y se declara aparte. */
  function repartoAcubetas(reparto, catalogo, campo) {
    if (!reparto) return { cubetas: [], sinDato: 0 };
    const cubetas = catalogo
      .filter((t) => Object.prototype.hasOwnProperty.call(reparto, t.id))
      .map((t) => ({ id: t.id, etiqueta: t.etiqueta, corto: t.corto || t.etiqueta, titulo: t.ayuda || t.etiqueta, n: reparto[t.id] || 0, valor: null }));
    return { cubetas, sinDato: reparto.sin_dato || 0, campo };
  }
  const CORTO_TIPO = { obra: "Obra", consultoria: "Consultoría", interventoria: "Interventoría", suministro: "Suministro", servicios: "Servicios" };
  const CORTO_MODALIDAD = { licitacion: "Licitación", abreviada: "Menor cuantía", subasta: "Subasta", meritos: "Méritos", minima: "Mínima", directa: "Directa", especial: "Especial", otra: "Otra" };
  function htmlTipo(p) {
    const F = raizFiltros();
    if (!F || !p.porTipo) return "";
    const cat = (F.TIPOS_TRABAJO || []).map((t) => ({ ...t, corto: CORTO_TIPO[t.id] || t.etiqueta }));
    const { cubetas, sinDato } = repartoAcubetas(p.porTipo, cat, "tipo");
    const svg = svgBarras(cubetas, { filtroDe: (c) => `tipo=${c.id}` });
    if (!svg) return "";
    return `<h2 class="text-sm font-semibold" style="color: var(--text-primary);">Qué tipo de trabajo es</h2>${svg}${sinDato ? `<p class="text-[11px]" style="color: var(--text-secondary);">${num(sinDato)} sin clasificar.</p>` : ""}`;
  }
  function htmlModalidad(p) {
    const F = raizFiltros();
    if (!F || !p.porModalidad) return "";
    const cat = (F.MODALIDADES || []).map((t) => ({ ...t, corto: CORTO_MODALIDAD[t.id] || t.etiqueta }));
    const { cubetas, sinDato } = repartoAcubetas(p.porModalidad, cat, "modalidad");
    const svg = svgBarras(cubetas, { filtroDe: (c) => `modalidad=${c.id}` });
    if (!svg) return "";
    return `<h2 class="text-sm font-semibold" style="color: var(--text-primary);">Cómo lo adjudican</h2>${svg}${sinDato ? `<p class="text-[11px]" style="color: var(--text-secondary);">${num(sinDato)} sin modalidad publicada.</p>` : ""}`;
  }
  /* EL AVISO MÁS ACCIONABLE DEL SISTEMA, y no estaba en la pestaña: en la
     selección abreviada de menor cuantía no se puede ofertar sin avisar antes,
     y el plazo lo fija la entidad —a veces son horas—. Se pinta SOLO si hay
     alguno: un recuadro que dice «0» se deja de mirar. */
  function htmlManifestacion(p) {
    const m = p.manifestacion;
    if (!m || !m.urgentes) return "";
    const n = m.urgentes;
    return `<a href="?manif=abierta#/licitaciones" data-filtro="manif=abierta" class="block rounded-xl px-4 py-3"
      style="background: var(--danger-light); color: var(--text-primary);"
      title="Selección abreviada de menor cuantía: primero hay que avisar que le interesa y después se oferta. El plazo lo fija la entidad en el pliego y puede ser de solo unas horas. Ver la lista.">
      <span class="text-sm font-semibold">${num(n)} ${n === 1 ? "proceso donde hay que avisar HOY" : "procesos donde hay que avisar HOY"} que le interesa</span>
      <span class="mt-0.5 block text-[11px]" style="color: var(--text-secondary);">Sin esa manifestación no puede presentar oferta. El plazo puede ser de unas horas.</span></a>`;
  }

  function htmlNota(p) {
    const cuando = p.generado ? new Date(p.generado).toLocaleTimeString("es-CO", { hour: "numeric", minute: "2-digit", timeZone: "America/Bogota" }) : "";
    return `Calculado para su perfil sobre el SECOP II${cuando ? ` a las ${cuando.replace(/\.$/, "")}` : ""}. Cada cifra lleva a su lista.`;
  }

  /* ── arranque ── */
  let perfilPintado = null;
  let peticion = 0;   // secuencia para descartar respuestas que llegan tarde
  /* ═══ LA EMPRESA EN CIFRAS (Mi empresa como pestaña principal, ago 2026) ═══
     El registro de proponente en números, bajo el pulso: tipos de trabajo,
     familias, experiencia acreditada, contratos, tope; patrimonio y capacidad
     solo cuando el servidor las mandó (token válido o perfil propio). «—» con
     motivo cuando falta el dato: jamás un 0 (R1). */
  const cifra = (v, rotulo, titulo = "") => `<div class="min-w-0"${titulo ? ` title="${esc(titulo)}"` : ""}><p class="text-[22px] font-semibold tracking-tight sm:text-[26px]" style="color: var(--text-primary); letter-spacing: -0.5px;">${esc(v)}</p><p class="text-[11px] uppercase tracking-wide" style="color: var(--text-secondary);">${esc(rotulo)}</p></div>`;
  function htmlEmpresa(e) {
    if (!e) return "";
    const partes = [];
    if (Number.isFinite(e.tipos_de_trabajo)) partes.push(cifra(num(e.tipos_de_trabajo), e.tipos_de_trabajo === 1 ? "tipo de trabajo inscrito" : "tipos de trabajo inscritos", Number.isFinite(e.familias) ? `${num(e.familias)} familias` : ""));
    partes.push(e.experiencia_smmlv != null ? cifra(num(e.experiencia_smmlv), "salarios mínimos de experiencia acreditada", "Mayor contrato acreditado en el registro") : cifra("—", "experiencia acreditada", "Sin dato en el registro"));
    partes.push(e.contratos_acreditados != null ? cifra(num(e.contratos_acreditados), e.contratos_acreditados === 1 ? "contrato acreditado" : "contratos acreditados") : cifra("—", "contratos acreditados", "Sin dato en el registro"));
    if (e.finanzas_visibles) {
      partes.push(e.patrimonio != null ? cifra(pesosCortos(e.patrimonio) || "—", "de patrimonio", "Patrimonio del registro") : cifra("—", "de patrimonio", "Sin dato"));
      partes.push(e.capacidad_contratacion != null ? cifra(pesosCortos(e.capacidad_contratacion) || "—", "capacidad de contratación", "Capacidad residual estimada con el registro") : cifra("—", "capacidad de contratación", "Falta la utilidad o el ingreso operacional"));
    }
    if (e.tope_smmlv != null) partes.push(cifra(num(e.tope_smmlv), "salarios mínimos de tope", "Hasta dónde le interesa presentarse (apetito, no límite del registro)"));
    return `<div class="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">${partes.join("")}</div>`;
  }

  async function arrancar(perfil, opciones = {}) {
    const d = opciones.doc || (typeof document !== "undefined" ? document : null);
    if (!d) return false;
    const raiz = d.getElementById("pulso");
    if (!raiz || !perfil) return false;
    if (perfilPintado === perfil && !opciones.forzar) return true;
    let p = null;
    /* con token viajan también las cifras del perfil (patrimonio, capacidad);
       si el servidor lo rechaza (401), se reintenta SIN token: el pulso no
       puede quedarse mudo por una credencial mal puesta */
    const url = `/api/perfil?op=pulso&perfil=${encodeURIComponent(perfil)}`;
    /* GUARDA DE CARRERA (ago 2026). No había ninguna, y el selector de perfil
       llama aquí en cada `change`: con dos cambios rápidos ganaba la respuesta
       que llegara la última, así que el bloque podía quedar diciendo «Para
       Génesis, hoy» —con SU patrimonio y SU capacidad— bajo un selector que
       decía «Juntos», y `perfilPintado` se quedaba anclado al perfil
       equivocado. Es la lección de la guarda de «auditoría EN VUELO»: la
       comprobación va ANTES de tocar un solo nodo. */
    const mio = ++peticion;
    try {
      let r = await fetch(url, opciones.headers ? { headers: opciones.headers } : undefined);
      if (r.status === 401 && opciones.headers) r = await fetch(url);
      p = await r.json();
    } catch { p = null; }
    if (mio !== peticion) return false;                                        // llegó tarde: no pinta
    if (!p || !p.ok) { raiz.classList.add("hidden"); perfilPintado = null; return false; }   // vacía y honesta
    const rc = d.getElementById("rup-cifras");
    if (rc) { rc.innerHTML = htmlEmpresa(p.empresa); rc.classList.toggle("hidden", !rc.innerHTML); }
    d.getElementById("pu-hero").innerHTML = htmlHero(p, opciones.nombre || "");
    d.getElementById("pu-departamentos").innerHTML = htmlDepartamentos(p);
    d.getElementById("pu-entidades").innerHTML = htmlEntidades(p);
    const cierre = d.getElementById("pu-cierre"), cuantia = d.getElementById("pu-cuantia");
    if (cierre) { cierre.innerHTML = htmlCierre(p); cierre.classList.toggle("hidden", !cierre.innerHTML); }
    if (cuantia) { cuantia.innerHTML = htmlCuantia(p); cuantia.classList.toggle("hidden", !cuantia.innerHTML); }
    for (const [id, fn] of [["pu-tipo", htmlTipo], ["pu-modalidad", htmlModalidad], ["pu-manifestacion", htmlManifestacion]]) {
      const nodo = d.getElementById(id);
      if (nodo) { nodo.innerHTML = fn(p); nodo.classList.toggle("hidden", !nodo.innerHTML); }
    }
    d.getElementById("pu-nota").textContent = htmlNota(p);
    // sin departamentos ni entidades (perfil sin licitaciones) las cajas se esconden
    d.getElementById("pu-departamentos").classList.toggle("hidden", !(p.porDepartamento || []).length);
    d.getElementById("pu-entidades").classList.toggle("hidden", !(p.topEntidades || []).length);
    raiz.classList.remove("hidden");
    perfilPintado = perfil;
    return true;
  }
  const olvidar = () => { perfilPintado = null; };

  return { arrancar, olvidar, pesosCortos, htmlHero, htmlEmpresa, htmlDepartamentos, htmlEntidades, htmlCierre, htmlCuantia, htmlTipo, htmlModalidad, htmlManifestacion, svgBarras, htmlNota };
});
