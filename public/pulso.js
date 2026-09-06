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
  /* EL PASO DE 26 A 40 px NECESITA UNA PARADA INTERMEDIA (31-ago-2026). Con
     `sm:text-[40px]` a secas, «$218.623 millones» cabe en una pantalla de 1727
     px pero PARTE EN DOS LÍNEAS en 1280, y entonces las tres cifras dejan de
     alinearse: la del medio baja y el bloque —que desde hoy abre la pestaña—
     se ve descuadrado. Medido en Chromium. Con la parada en 34 px cabe en una
     línea desde 640 px, y los 40 px vuelven en pantallas de 1536 en adelante,
     que es donde el ingeniero trabaja. */
  const cifraGrande = (v, rotulo, attrs = "") => `<div ${attrs}><p class="text-[26px] font-semibold tracking-tight sm:text-[34px] 2xl:text-[40px]" style="color: var(--text-primary); letter-spacing: -1px;">${esc(v)}</p><p class="text-[11px] uppercase tracking-wide sm:text-xs" style="color: var(--text-secondary);">${esc(rotulo)}</p></div>`;

  function htmlHero(p, nombrePerfil) {
    const quien = nombrePerfil ? `Para ${esc(nombrePerfil)}, hoy` : "Para su empresa, hoy";
    if (!p.total) {
      return `<p class="text-[20px] leading-tight sm:text-[26px]" style="color: var(--text-primary); font-weight: 300;">${quien}: ninguna licitación abierta encaja con su perfil.</p>
        <p class="mt-2 text-sm" style="color: var(--text-secondary);">${p.corpus_vacio ? "Todavía no hay licitaciones cargadas en el sistema." : `Hay ${num(p.visibles)} de su tipo de obra, pero ninguna cumple hoy sus requisitos (registro de proponente, capacidad de facturar y caja). Suba un RUP más completo o revise Mi empresa.`}</p>`;
    }
    const c = p.cierranEstaSemana || { n: 0, valor: null };
    return `
      <p class="text-[20px] leading-tight sm:text-[26px]" style="color: var(--text-primary); font-weight: 300;">${quien}</p>
      <div class="mt-4 grid grid-cols-3 gap-3">
        ${cifraGrande(num(p.total), p.total === 1 ? "licitación a la que puede presentarse" : "licitaciones a las que puede presentarse", `class="cursor-pointer" data-filtro="todo" role="link" tabindex="0" title="Ver la lista completa"`)}
        ${cifraGrande(pesosCortos(p.valorTotal) || "Sin referencia", "en juego (presupuestos oficiales)")}
        ${cifraGrande(num(c.n), c.n === 1 ? "cierra esta semana" : "cierran esta semana", `class="cursor-pointer" data-filtro="cierre=7d" role="link" tabindex="0" title="Ver las que cierran en 7 días"`)}
      </div>
      ${c.n && c.valor ? `<p class="mt-2 text-xs" style="color: var(--text-secondary);">Las que cierran esta semana suman ${esc(pesosCortos(c.valor))}.</p>` : ""}
      ${p.sinPresupuesto > 0 ? `<p class="mt-2 text-xs" style="color: var(--text-secondary);">${esc(fraseSinPresupuesto(p.sinPresupuesto))}</p>` : ""}`;
  }
  /* UNA redacción para «cuántas no publican presupuesto» (6-sep-2026, B4b-H2):
     la usa el hero del pulso y la pantalla de resultado del onboarding, que
     pinta «$X en juego» desde el MISMO agregarPulso y decía «Varias» donde ya
     había una cifra exacta. Sin cifra (0, null, undefined) devuelve "" — «0 no
     lo publican» es ruido y null jamás se pinta como 0. */
  function fraseSinPresupuesto(n) {
    if (!(n > 0)) return "";
    return `El dinero en juego cuenta las que publican presupuesto: ${num(n)} no lo ${n === 1 ? "publica" : "publican"}.`;
  }

  /* LA COBERTURA DE CADA REPARTO (6-sep-2026, M-DGF-03). Tres notas bajo las
     barras, y solo las que tienen algo que decir: cuántas categorías quedan
     fuera del top, cuántas licitaciones no traen el dato (viajaba en la
     respuesta y no se pintaba: repartirlas a ojo sería inventar) y qué mide
     la barra. Aquí las barras van por NÚMERO de licitaciones y el dinero al
     lado; en la portada del mercado van por dinero. No se unifica: el pulso
     responde «cuántas» y la portada «dónde hay más plata», y cada pantalla
     lo dice. Con 0 o sin dato no se escribe nada: «0 sin departamento» es
     ruido y null jamás se pinta como 0. */
  /* LA NOTA CUENTA LO QUE EL OJO VE, NO LO QUE VIAJA (6-sep-2026). Decía «573 en
     total; se muestran las 40 con más procesos» mientras a la vista había 8
     barras y 32 dentro del pliegue: la misma forma del defecto que este lote
     corrigió («pintaba 6 mientras la nota decía 8»). Ahora la nota recibe
     cuántas quedan A LA VISTA y dice las dos cifras, o ninguna cuando no hay
     pliegue. `visibles` es el tope real de `barrasRank`, no un número nuevo. */
  const notasReparto = (lista, extra, sinDato, ausencia, visibles) => {
    const notas = [];
    const aLaVista = Number.isInteger(visibles) && visibles > 0 ? Math.min(visibles, lista.length) : lista.length;
    const plegadas = lista.length - aLaVista;
    if (extra > lista.length) notas.push(`${num(extra)} en total; aquí ${lista.length === 1 ? "la que más procesos publica" : `las ${lista.length} con más procesos`}${plegadas > 0 ? `: ${num(aLaVista)} a la vista y ${num(plegadas)} plegada${plegadas === 1 ? "" : "s"}` : ""}.`);
    else if (plegadas > 0) notas.push(`${num(aLaVista)} a la vista y ${num(plegadas)} plegada${plegadas === 1 ? "" : "s"}.`);
    if (sinDato > 0) notas.push(`${num(sinDato)} ${ausencia}; no se reparten a ojo.`);
    notas.push("Barras por número de licitaciones; el dinero, al lado.");
    return `<p class="mt-2 text-[11px]" style="color: var(--text-secondary);">${notas.join(" ")}</p>`;
  };

  /* LA LISTA COMPLETA, LAS PRIMERAS A LA VISTA Y EL RESTO PLEGADO (6-sep-2026,
     M-DGF-13). El servidor publica todos los departamentos (y hasta 40
     entidades); aquí se pintan las `top` primeras —el servidor dice cuántas—
     y las demás van dentro de un <details> «Ver los N restantes» con la MISMA
     escala (la barra de un departamento con 3 licitaciones mide lo mismo
     arriba que plegada): lo que hay que VER arriba, lo que hay que TOCAR
     plegado. Antes la lista llegaba recortada a 8 y `barrasRank` —con su tope
     por defecto de 6— pintaba seis mientras la nota decía «se muestran las 8»:
     una cifra creíble y falsa. Cada barra sigue siendo un filtro. */
  const VISIBLES_REPARTO = 8;
  const visiblesDe = (p) => (Number.isInteger(p.top) && p.top > 0 ? p.top : VISIBLES_REPARTO);

  function htmlDepartamentos(p) {
    const lista = p.porDepartamento || [];
    if (!lista.length) return "";
    const g = barrasRank(lista, {
      filtroDe: (x) => `dep=${encodeURIComponent(x.nombre)}`, tope: visiblesDe(p),
      plegarResto: (n) => `Ver ${n === 1 ? "el departamento restante" : `los ${num(n)} departamentos restantes`}`,
    });
    if (!g) return "";
    return `<h2 class="text-sm font-semibold" style="color: var(--text-primary);">Dónde están</h2>${g}`
      + notasReparto(lista, p.departamentosDistintos, p.sinDepartamento, "sin departamento publicado", visiblesDe(p));
  }

  function htmlEntidades(p) {
    const lista = p.topEntidades || [];
    if (!lista.length) return "";
    const g = barrasRank(lista, {
      filtroDe: (x) => x.nit ? `entidad=${encodeURIComponent(x.nit)}` : `entidad=${encodeURIComponent(x.nombre)}`, tope: visiblesDe(p),
      plegarResto: (n) => `Ver ${n === 1 ? "la entidad restante" : `las ${num(n)} entidades restantes`}`,
    });
    if (!g) return "";
    return `<h2 class="text-sm font-semibold" style="color: var(--text-primary);">Quién las publica</h2>${g}`
      + notasReparto(lista, p.entidadesDistintas, p.sinEntidad, "sin entidad publicada", visiblesDe(p));
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
  function raizCalendario() {
    if (typeof window !== "undefined" && window.Calendario) return window.Calendario;
    try { return require("./calendario.js"); } catch { return null; }
  }
  /* ═══════════════════ GRÁFICOS DE VERDAD (ago 2026) ═══════════════════
     Encargo del ingeniero: «los gráficos están como si fueran de niños de
     primaria; tenemos todos los datos habidos y por haber para mostrar
     estadísticas increíbles y muestras unas súper básicas». Tenía razón: la
     versión anterior era una fila de rectángulos sin eje, sin valores fuera del
     tope, sin el DINERO (que ya viajaba en cada cubeta y no se pintaba) y sin
     nada al pasar el puntero.

     Tres formas, y cada una se elige por el TRABAJO del dato, no por gusto:
       · `columnas`  — magnitud sobre una escala ORDENADA (cuándo cierran,
                       cuánto valen). Una sola serie ⇒ un solo tono: la longitud
                       ya codifica la magnitud, el color no tiene que repetirlo.
       · `barrasRank`— magnitud sobre categorías con NOMBRE LARGO (entidades,
                       departamentos). Horizontal porque el nombre no cabe girado.
       · `apilada`   — PARTE-TODO en una sola barra (de qué se compone su lista).
                       Aquí sí hay identidad ⇒ paleta categórica, con leyenda
                       SIEMPRE y etiquetas directas.

     COLOR, VALIDADO CON EL SCRIPT Y NO A OJO (dataviz/scripts/validate_palette):
       · magnitud → `--accent` (#007AFF), 3,69:1 sobre #f5f5f7 y 5,23:1 sobre
         #000: pasa el suelo de 3:1 en LOS DOS temas.
       · composición → cuatro slots categóricos, escalonados aparte para cada
         tema (no es un volteo automático): claro #2a78d6/#eb6834/#1baf7a/#eda100,
         oscuro #3987e5/#d95926/#199e70/#c98500. Ambos pasan banda de luminosidad,
         suelo de croma, separación CVD (ΔE 9,1 claro / 8,4 oscuro) y suelo de
         visión normal (22,9 / 19,8). El claro avisa de contraste bajo 3:1, y por
         eso las etiquetas directas NO son opcionales aquí.
     Los tonos viven en custom properties (`--viz-1…4`) para que el tema los
     cambie en un solo sitio.

     REGLAS DE MARCA que se respetan y conviene no «simplificar»: barra ≤ 24 px,
     extremo redondeado 4 px y CUADRADO en la línea base, hueco de 2 px del color
     de la superficie entre marcas que se tocan, rejilla de 1 px sólida y
     recesiva, y EL TEXTO NUNCA LLEVA EL COLOR DE LA SERIE (va con los tokens de
     texto; el color lo carga la marca que tiene al lado). */
  const VIZ = { alto: 168, gap: 2, barraMax: 24, radio: 4 };
  const miles = (n) => num(n);

  /* Ticks REDONDOS: 0 / 50 / 100, nunca 0 / 37 / 74. Devuelve [valores, tope]. */
  function ticksRedondos(max, cuantos = 3) {
    if (!(max > 0)) return [[0], 1];
    const bruto = max / cuantos;
    const mag = Math.pow(10, Math.floor(Math.log10(bruto)));
    const paso = [1, 2, 2.5, 5, 10].map((k) => k * mag).find((k) => k >= bruto) || mag * 10;
    const tope = Math.ceil(max / paso) * paso;
    const out = [];
    for (let v = 0; v <= tope + 1e-9; v += paso) out.push(v);
    return [out, tope];
  }

  /* Una marca puede ser un ENLACE a su lista filtrada. `envolver` centraliza el
     patrón para que ninguna forma se olvide del `data-filtro`, que es lo que
     hace que cada barra lleve a alguna parte. */
  function envolver(filtro, titulo, dentro) {
    if (!filtro) return `<g><title>${esc(titulo)}</title>${dentro}</g>`;
    return `<a href="?${esc(filtro)}#/licitaciones" data-filtro="${esc(filtro)}" role="link" tabindex="0"><title>${esc(titulo)}</title>${dentro}</a>`;
  }

  /* ── COLUMNAS · magnitud sobre una escala ordenada ──
     `rotularCada` (6-sep-2026, M-DGF-20): con muchas columnas —la historia del
     mercado trae hasta 90, una por día— los rótulos se pisarían; se escribe uno
     cada N y siempre el último. Con pocas columnas (las cuatro de «cuándo hay
     que entregar») no cambia nada. Una cubeta con `n` en null es «sin dato»: no
     dibuja barra y su título lo dice, en vez de contar como 0. */
  function columnas(cubetas, { ancho = 340, alto = VIZ.alto, filtroDe = () => null, conValor = true, rotularCada = 1 } = {}) {
    const n = (cubetas || []).length;
    if (!n) return "";
    const max = Math.max(...cubetas.map((c) => c.n || 0));
    if (!max) return "";
    const [ticks, tope] = ticksRedondos(max);
    const M = { arriba: 18, abajo: 30, izq: 34, der: 6 };
    const util = { w: ancho - M.izq - M.der, h: alto - M.arriba - M.abajo };
    const paso = util.w / n;
    /* con 90 columnas el paso baja de 4 px: el hueco se encoge con él y la barra
       nunca queda por debajo de 1 px (antes el ancho salía NEGATIVO) */
    const gap = Math.min(VIZ.gap, paso / 4);
    const bw = Math.max(1, Math.min(VIZ.barraMax, paso - gap * 2));
    const radio = Math.min(VIZ.radio, bw / 2);
    const y0 = M.arriba + util.h;
    const rejilla = ticks.map((t) => {
      const y = y0 - (t / tope) * util.h;
      return `<line x1="${M.izq}" y1="${y.toFixed(1)}" x2="${ancho - M.der}" y2="${y.toFixed(1)}" style="stroke: var(--viz-grid); stroke-width:1"></line>`
        + `<text x="${M.izq - 6}" y="${(y + 3.5).toFixed(1)}" text-anchor="end" font-size="11" style="fill: var(--text-secondary)">${miles(t)}</text>`;
    }).join("");
    const barras = cubetas.map((c, i) => {
      const v = c.n || 0;
      const h = v > 0 ? Math.max(2, (v / tope) * util.h) : 0;
      const x = M.izq + paso * i + (paso - bw) / 2;
      const y = y0 - h;
      const cx = M.izq + paso * i + paso / 2;
      /* Extremo redondeado ARRIBA y cuadrado en la línea base: el `path` lo hace
         explícito (un `rect` con `rx` redondearía también la base, que es donde
         la barra tiene que apoyarse). */
      const cuerpo = h <= 0 ? "" : `<path d="M${x.toFixed(1)},${y0} L${x.toFixed(1)},${(y + radio).toFixed(1)} Q${x.toFixed(1)},${y.toFixed(1)} ${(x + radio).toFixed(1)},${y.toFixed(1)} L${(x + bw - radio).toFixed(1)},${y.toFixed(1)} Q${(x + bw).toFixed(1)},${y.toFixed(1)} ${(x + bw).toFixed(1)},${(y + radio).toFixed(1)} L${(x + bw).toFixed(1)},${y0} Z" style="fill: var(--accent)"></path>`;
      const valor = conValor && v > 0
        ? `<text x="${cx.toFixed(1)}" y="${(y - 5).toFixed(1)}" text-anchor="middle" font-size="11" font-weight="600" style="fill: var(--text-primary)">${miles(v)}</text>` : "";
      const conRotulo = rotularCada <= 1 || i % rotularCada === 0 || i === n - 1;
      /* con rótulos espaciados, el primero y el último se anclan al borde del
         área útil: centrados sobre una columna de 2 px se salían del lienzo
         («6 se» en vez de «6 sep», medido en Chromium a 390 px) */
      const ancla = rotularCada > 1 && i === n - 1 ? ["end", ancho - M.der] : rotularCada > 1 && i === 0 ? ["start", M.izq] : ["middle", cx];
      const rot = conRotulo ? `<text x="${ancla[1].toFixed(1)}" y="${alto - 9}" text-anchor="${ancla[0]}" font-size="11" style="fill: var(--text-secondary)">${esc(String(c.corto || c.etiqueta || ""))}</text>` : "";
      /* El área invisible ocupa la banda ENTERA: un objetivo de puntero del
         tamaño de la barra deja fuera las cubetas pequeñas, que son justo las
         que hay que poder consultar. */
      const zona = `<rect x="${(M.izq + paso * i).toFixed(1)}" y="${M.arriba}" width="${paso.toFixed(1)}" height="${util.h}" style="fill:transparent"></rect>`;
      const dinero = c.valor != null ? ` · ${pesosCortos(c.valor)}` : "";
      /* `nota` (6-sep-2026, M-DGF-06/10): lo que la cubeta quiera decir de sí
         misma en el título —«promedio 3,1 oferentes», «4 sin valor publicado»—
         sin que la primitiva tenga que saber de qué habla. `envolver` escapa. */
      const nota = c.nota ? ` · ${c.nota}` : "";
      return envolver(filtroDe(c), `${c.titulo || c.etiqueta}: ${c.n == null ? "sin dato" : miles(v)}${dinero}${nota}`, zona + cuerpo + valor + rot);
    }).join("");
    const base = `<line x1="${M.izq}" y1="${y0}" x2="${ancho - M.der}" y2="${y0}" style="stroke: var(--viz-grid); stroke-width:1"></line>`;
    return `<svg viewBox="0 0 ${ancho} ${alto}" role="img" style="display:block;width:100%;height:auto;font-family:inherit">${rejilla}${base}${barras}</svg>`;
  }

  /* ── BARRAS HORIZONTALES · categorías con nombre largo, rankeadas ──
     El nombre va ENCIMA de la barra y no en un eje lateral: «GOBERNACIÓN DEL
     TOLIMA» no cabe en una columna de eje sin recortarlo, y un rótulo recortado
     es peor que ninguno. El dinero viaja al lado del conteo porque ya está en el
     dato y es la mitad de la respuesta a «¿dónde está la plata?». */
  /* ⚠️ LA COLA NO COMPITE POR UN PUESTO DEL RANKING. Un cubo residual («OTROS»,
     «SIN DEPARTAMENTO») es la SUMA de muchas categorías, no una categoría: si se
     ordena junto a las demás y resulta ser la mayor —cosa corriente cuando se
     enseñan 3 de 24 departamentos— encabeza el gráfico y este pasa a AFIRMAR que
     el departamento más grande se llama «OTROS». Es la doctrina que el panel ya
     tenía escrita para `SIN_DEPARTAMENTO` («no compite por un puesto del top»),
     sin aplicar aquí. La cola se aparta ANTES de recortar por `tope` —si no,
     ocuparía un puesto que le quitaría a una categoría real— y se pinta AL FINAL.
     Su barra conserva su longitud verdadera: acortarla para que no destaque sería
     mentir sobre la magnitud, y lo que estaba mal era el ORDEN, no el tamaño.
     Vive en la primitiva y no en el llamador para que el próximo cubo residual no
     pueda olvidarse de la regla. */
  /* `plegarResto` (6-sep-2026, M-DGF-13): en vez de RECORTAR por `tope`, lo que
     queda detrás se pinta dentro de un <details> cuyo rótulo lo escribe el
     llamador con el número («Ver los 25 departamentos restantes»), con la MISMA
     escala que las de arriba —un `max` propio del resto haría que la última
     categoría pareciera tan grande como la primera—. La cola sigue apartada y
     al final de lo visible; sin `plegarResto` la primitiva recorta como siempre. */
  function barrasRank(items, { filtroDe = () => null, tope = 6, esCola = () => false, plegarResto = null } = {}) {
    const todos = items || [];
    const cola = todos.filter((x) => esCola(x));
    const reales = todos.filter((x) => !esCola(x));
    const lista = reales.slice(0, tope).concat(cola);
    const resto = plegarResto ? reales.slice(tope) : [];
    if (!lista.length) return "";
    const max = Math.max(...lista.concat(resto).map((x) => x.n || 0));
    if (!max) return "";
    const fila = (x) => {
      const pct = Math.max(2, ((x.n || 0) / max) * 100);
      const filtro = filtroDe(x);
      const dinero = x.valor != null ? pesosCortos(x.valor) : null;
      const interior = `<div class="flex items-baseline justify-between gap-3">
            <span class="truncate text-[13px]" style="color: var(--text-primary)" title="${esc(x.nombre || "")}">${esc(x.nombre || "")}</span>
            <span class="shrink-0 text-[12px] tabular-nums" style="color: var(--text-secondary)">${miles(x.n)}${dinero ? ` · ${esc(dinero)}` : ""}</span>
          </div>
          <div class="mt-1 h-1.5 overflow-hidden rounded-full" style="background: var(--bg-inset)">
            <div class="h-full rounded-full" style="width:${pct.toFixed(1)}%; background: var(--accent)"></div>
          </div>`;
      return `<li>${filtro
        ? `<a href="?${esc(filtro)}#/licitaciones" data-filtro="${esc(filtro)}" class="block rounded-lg px-1 py-0.5 transition hover:opacity-80">${interior}</a>`
        : interior}</li>`;
    };
    const plegado = resto.length
      ? `<details class="mt-2"><summary class="cursor-pointer text-[12px]" style="color: var(--text-secondary)">${esc(plegarResto(resto.length))}</summary><ul class="mt-2 space-y-2">${resto.map(fila).join("")}</ul></details>`
      : "";
    return `<ul class="mt-2 space-y-2">${lista.map(fila).join("")}</ul>${plegado}`;
  }

  /* ── APILADA · parte-todo en UNA barra ──
     Leyenda SIEMPRE (identidad nunca solo por color) y etiqueta directa cuando
     el segmento da de sí — MEDIDA antes de escribirla, no recortada con
     `overflow:hidden`, que cortaría las primeras letras y es peor que no
     ponerla. Los segmentos se separan con 2 px del color de la SUPERFICIE: es el
     hueco quien separa, nunca un borde (un borde añade tinta que no es dato). */
  /* ⚠️ LA PALETA NO SE CICLA NUNCA. Con `(i % 4) + 1` un quinto segmento
     recibía el tono del primero y la leyenda enseñaba DOS cuadros idénticos:
     la identidad, que es justo lo único que una paleta categórica aporta, se
     destruye. Es la regla dura de la guía —«un noveno tono nunca se genera: se
     pliega en Otros»— y hoy no mordía solo porque los dos llamadores pasan
     exactamente cuatro. Se pliega la cola: los tres primeros conservan su tono
     y el resto se suma en «Otros», que va SIEMPRE en el cuarto slot para que su
     color signifique lo mismo pase lo que pase. `TONOS` es el techo, no una
     sugerencia. */
  /* ⚠️ Y LA COLA DECLARADA NO COMPITE TAMPOCO AQUÍ (6-sep-2026, M-DGF-06). La
     apilada ordenaba TODOS los segmentos por tamaño, así que un «Otros» residual
     mayor que el líder —lo corriente en «quién gana aquí», donde el top son 5
     de 30 ganadores— habría encabezado la barra con el PRIMER tono: el defecto
     de «OTROS encabezaba el ranking» otra vez. La misma doctrina que en
     `barrasRank`: quien construye los datos declara la cola (`esCola: true` en
     el segmento, o la opción `esCola`; la primitiva no adivina por el nombre),
     la cola va AL FINAL y SIEMPRE en el cuarto tono, absorbe lo que se pliega
     por falta de tonos, y dice cuántas categorías suma solo si el llamador lo
     declaró (`cuantos`): un conteo a medias sería una cifra falsa. */
  const TONOS = 4;
  function plegarCola(reales, colas = []) {
    const declarada = colas.length
      ? {
        etiqueta: colas[0].etiqueta || "Otros",
        n: colas.reduce((a, s) => a + s.n, 0),
        _cola: colas.every((s) => Number.isFinite(s.cuantos)) ? colas.reduce((a, s) => a + s.cuantos, 0) : null,
        _tono: TONOS,
      }
      : null;
    const sitio = TONOS - (declarada ? 1 : 0);
    if (reales.length <= sitio) return declarada ? reales.concat([declarada]) : reales;
    const cabeza = reales.slice(0, TONOS - 1);
    const cola = reales.slice(TONOS - 1);
    return cabeza.concat([{
      etiqueta: declarada ? declarada.etiqueta : "Otros",
      n: cola.reduce((a, s) => a + s.n, 0) + (declarada ? declarada.n : 0),
      _cola: declarada ? (declarada._cola == null ? null : declarada._cola + cola.length) : cola.length,
      _tono: TONOS,
    }]);
  }

  function apilada(segmentos, { alto = 26, esCola = (s) => s.esCola === true } = {}) {
    const conDato = (segmentos || []).filter((s) => (s.n || 0) > 0);
    const reales = conDato.filter((s) => !esCola(s)).sort((a, b) => b.n - a.n);
    const vivos = plegarCola(reales, conDato.filter((s) => esCola(s)));
    const tono = (s, i) => s._tono || i + 1;
    const total = vivos.reduce((a, s) => a + s.n, 0);
    if (!total) return "";
    let x = 0;
    const trozos = vivos.map((s, i) => {
      const w = (s.n / total) * 100;
      const izq = x; x += w;
      const pct = Math.round((s.n / total) * 100);
      /* ~7 px por carácter a 11 px: el rótulo solo entra si cabe con aire a los
         dos lados. Si no cabe, lo llevan la leyenda y el `title`.
         ⚠️ LA TINTA ES OSCURA EN LOS DOS TEMAS, y no es una decisión estética.
         Medido: el texto BLANCO falla el suelo WCAG de 4,5:1 sobre LOS OCHO
         rellenos —peor caso 2,17:1 sobre el amarillo del slot 4—, mientras que
         el NEGRO pasa en los ocho (4,76:1 a 9,70:1). Y tiene que ser negro puro:
         `#1d1d1f` —el token de texto de la app— se queda en 3,81:1 y tampoco vale. Las etiquetas directas son
         obligatorias aquí precisamente porque la paleta clara avisa de contraste
         bajo 3:1 contra la superficie: una etiqueta obligatoria e ilegible es la
         regla de alivio incumplida por el propio alivio. Los rellenos son de
         tono medio en AMBOS temas, así que la tinta NO se invierte con el tema:
         invertirla a blanco en oscuro reabriría el defecto. */
      const texto = `${pct} %`;
      const cabe = (w / 100) * 320 > texto.length * 7 + 14;
      return `<div class="absolute top-0 h-full" style="left:${izq.toFixed(2)}%; width:calc(${w.toFixed(2)}% - ${VIZ.gap}px); background: var(--viz-${tono(s, i)}); border-radius: ${i === 0 ? "6px 0 0 6px" : x >= 99.99 ? "0 6px 6px 0" : "0"}"
          title="${esc(s.etiqueta)}: ${miles(s.n)} (${pct} %)"></div>`
        + (cabe ? `<span class="absolute top-0 flex h-full items-center justify-center text-[11px] font-semibold" style="left:${izq.toFixed(2)}%; width:calc(${w.toFixed(2)}% - ${VIZ.gap}px); color:#000">${texto}</span>` : "");
    }).join("");
    const leyenda = vivos.map((s, i) => `<li class="flex items-center gap-1.5">
        <span class="inline-block h-2.5 w-2.5 shrink-0 rounded-sm" style="background: var(--viz-${tono(s, i)})"></span>
        <span class="text-[11px]" style="color: var(--text-secondary)">${esc(s.etiqueta)}${s._cola ? ` (${s._cola})` : ""} · ${miles(s.n)}</span></li>`).join("");
    return `<div class="relative mt-2 overflow-hidden rounded-md" style="height:${alto}px; background: var(--bg-inset)">${trozos}</div>
      <ul class="mt-2 flex flex-wrap gap-x-4 gap-y-1">${leyenda}</ul>`;
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
        <text x="${cx.toFixed(1)}" y="${alto - 12}" text-anchor="middle" font-size="11" style="fill: var(--text-secondary);">${esc(rotulo)}</text>
      ${cierra}`;
    }).join("");
    const linea = `<line x1="${margen.lados}" y1="${margen.arriba + altoUtil + 0.5}" x2="${ancho - margen.lados}" y2="${margen.arriba + altoUtil + 0.5}" style="stroke: var(--border); stroke-width: 1;"></line>`;
    return `<svg viewBox="0 0 ${ancho} ${alto}" role="img" aria-label="Distribución" style="display:block; width:100%; height:auto; max-height: ${alto + 40}px; font-family: inherit;">${linea}${barras}</svg>`;
  }
  /* ⚠️ LOS CUATRO GRÁFICOS DE ESTA SECCIÓN SE RETIRARON (encargo del ingeniero,
     31-ago-2026). «Cuándo hay que entregar la oferta», «Cuánto valen», «Qué
     tipo de trabajo es» y «Cómo lo adjudican» eran cuatro rejillas de columnas
     apiladas en la primera pantalla: «no se ve estético, mucho texto que no
     hace nada, solo ruido visual». Las tres primeras repetían en forma de barra
     cifras que el tablero de arriba ya da en números, y la pregunta que sí
     importaba —«¿cuándo se me vence esto?»— la contestaban con una cubeta («≤
     15 días») cuando lo que el ingeniero necesita es el DÍA: eso lo hace ahora
     el calendario (public/calendario.js), con el proceso concreto y su plazo
     para avisar que le interesa. Con ellos se fueron del servidor los repartos
     que solo alimentaban estas barras (`porCierre`, `porCuantia`, `porTipo`,
     `porModalidad` en lib/handlers/perfil/entrada.agregarPulso): un agregado
     que nadie pinta es peso muerto en la caché y en la respuesta.
     `columnas`, `apilada` y `barrasRank` SE QUEDAN: los tres gráficos del
     tablero (public/app.js) los llaman. */
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
      partes.push(e.capacidad_contratacion != null ? cifra(pesosCortos(e.capacidad_contratacion) || "—", "capacidad de contratación", "Estimada con su registro de proponente") : cifra("—", "capacidad de contratación", "Falta la utilidad o el ingreso operacional"));
    }
    if (e.tope_smmlv != null) partes.push(cifra(num(e.tope_smmlv), "salarios mínimos de tope", "Hasta dónde le interesa presentarse (apetito, no límite del registro)"));
    return `<div class="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">${partes.join("")}</div>`;
  }

  async function arrancar(perfil, opciones = {}) {
    const d = opciones.doc || (typeof document !== "undefined" ? document : null);
    if (!d) return false;
    const raiz = d.getElementById("pulso");
    /* EL PULSO VIVE EN DOS SECCIONES DESDE EL 31-ago-2026: `#pulso` (el
       titular «Para Helder, hoy» y el aviso de manifestación) abre la pestaña,
       y `#pulso-repartos` (dónde están · quién las publica) va DESPUÉS del
       calendario. Se enseñan y se esconden JUNTAS: si una se quedara visible
       con la otra oculta, la pestaña enseñaría medio pulso sin decirlo. */
    const repartos = d.getElementById("pulso-repartos");
    const mostrar = (visible) => {
      for (const nodo of [raiz, repartos]) if (nodo) nodo.classList.toggle("hidden", !visible);
    };
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
    if (!p || !p.ok) { mostrar(false); perfilPintado = null; return false; }   // vacía y honesta
    const rc = d.getElementById("rup-cifras");
    if (rc) { rc.innerHTML = htmlEmpresa(p.empresa); rc.classList.toggle("hidden", !rc.innerHTML); }
    d.getElementById("pu-hero").innerHTML = htmlHero(p, opciones.nombre || "");
    d.getElementById("pu-departamentos").innerHTML = htmlDepartamentos(p);
    d.getElementById("pu-entidades").innerHTML = htmlEntidades(p);
    const manif = d.getElementById("pu-manifestacion");
    if (manif) { manif.innerHTML = htmlManifestacion(p); manif.classList.toggle("hidden", !manif.innerHTML); }
    /* ═══ EL CALENDARIO DE CIERRES ═══ Vive en su propia sección y en su propio
       módulo, pero se pinta desde AQUÍ y con el agregado que ya vino en esta
       misma respuesta: pedirlo por su cuenta serían dos peticiones al mismo
       endpoint —y dos cálculos completos del corpus si la caché estuviera
       fría—, y dos respuestas distintas podrían enseñar dos listas distintas de
       la misma pestaña. Si el módulo no cargó, la sección se queda oculta: el
       pulso no se cae por un gráfico. */
    const Cal = raizCalendario();
    const cuerpoCal = d.getElementById("cal-cuerpo"), seccionCal = d.getElementById("calendario");
    if (Cal && cuerpoCal) Cal.montar(cuerpoCal, p.calendario, { seccion: seccionCal });
    else if (seccionCal) seccionCal.classList.add("hidden");
    d.getElementById("pu-nota").textContent = htmlNota(p);
    // sin departamentos ni entidades (perfil sin licitaciones) las cajas se esconden
    d.getElementById("pu-departamentos").classList.toggle("hidden", !(p.porDepartamento || []).length);
    d.getElementById("pu-entidades").classList.toggle("hidden", !(p.topEntidades || []).length);
    mostrar(true);
    perfilPintado = perfil;
    return true;
  }
  const olvidar = () => { perfilPintado = null; };

  return { arrancar, olvidar, pesosCortos, htmlHero, htmlEmpresa, htmlDepartamentos, htmlEntidades, htmlManifestacion, svgBarras, columnas, barrasRank, apilada, ticksRedondos, htmlNota, fraseSinPresupuesto };
});
