/* public/pulso.js · EL PULSO PERSONALIZADO del tablero (ago 2026)
   ─────────────────────────────────────────────────────────────────────────────
   Lo primero que ve el ingeniero al entrar: las cifras DE SU EMPRESA, no del
   mercado en general. «Para su empresa hoy: 47 licitaciones · $312.000
   millones en juego · 6 cierran esta semana», dónde están (barras por
   departamento) y quién las publica (entidades), cada una enlazando a la
   lista filtrada de la Fase 8. Encargo del dueño: la portada del mercado
   entero salía ANTES de que la persona eligiera cómo entrar; ahora primero se
   entra y después salen los datos, personalizados al RUP.

   Desde el 28-ago-2026 es LO PRIMERO de la pestaña y de la app (antes abría el
   tablero de procesos), con el titular remodelado: una cifra que manda —a
   cuántas puede presentarse— y dos de apoyo. Los cuatro repartos que llevaba
   debajo («Cuándo hay que entregar la oferta», «Cuánto valen», «Qué tipo de
   trabajo es», «Cómo lo adjudican») se retiraron por encargo del dueño: son el
   modelo, no el hecho. Quedan «Dónde están» y «Quién las publica», que dicen a
   qué puerta tocar.

   Todo sale de `/api/perfil?op=pulso&perfil=…` (lib/handlers/perfil/pulso),
   que llama a la MISMA cascada del listado: `total` es exactamente el total
   de la lista sin filtros. Reglas:
   · Máximo tres cifras arriba; cada visual es un enlace a la lista filtrada
     (`data-filtro` → app.js aplica el filtro EN LA MISMA PÁGINA, sin recargar).
   · El titular DICE DE QUIÉN son las cifras (nombre y naturaleza del perfil):
     con tres perfiles y un selector en la cabecera, un número sin dueño se lee
     como el de quien mira.
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

  /* ── plantillas del TITULAR (remodelado 28-ago-2026) ──
     Encargo del dueño: «lo que dice "para Helder (persona natural) hoy",
     remodélalo, y déjalo en la parte superior». Antes eran tres cifras del
     mismo tamaño en una rejilla de tres columnas, con el mismo peso visual que
     las seis tarjetas de debajo; en móvil las tres bajaban a 26 px y ninguna
     mandaba. Ahora hay UNA cifra que manda —a cuántas puede presentarse, que es
     la respuesta a «¿tengo trabajo hoy?»— y dos de apoyo; el tamaño lo pone
     `clamp` en una clase propia y no dos utilidades de Tailwind, porque el CDN
     está bloqueado en la red del dueño y allí las utilidades no existen (el
     precedente medido en Chromium).
     LO QUE ENLAZA SE VE QUE ENLAZA: `cifra-enlace` da cursor, realce y foco
     visible; la cifra que no lleva a ninguna lista —el dinero— no la lleva.
     Ninguna pulsación sin respuesta visible. */
  const cifraTitular = (v, rotulo, attrs = "") => `<div${attrs ? " " + attrs : ""}><p class="cifra-titular">${esc(v)}</p><p class="rotulo-cifra">${esc(rotulo)}</p></div>`;
  const cifraApoyo = (v, rotulo, attrs = "") => `<div${attrs ? " " + attrs : ""}><p class="cifra-apoyo">${esc(v)}</p><p class="rotulo-cifra">${esc(rotulo)}</p></div>`;

  /* DE QUIÉN SON ESTAS CIFRAS, DICHO ARRIBA (28-ago-2026). El dueño reportó que
     lo que enseñaba «Su registro de proponente» «es en general, de Génesis, no
     aplica a Helder»: la app trabaja con tres perfiles y ninguna pantalla decía
     con todas las letras a cuál corresponde lo que se está mirando. El nombre y
     la naturaleza YA viajaban en `empresa` y no se pintaban. Van aquí, en la
     primera línea de la primera tarjeta, porque el perfil se cambia en un
     selector de la cabecera y equivocarse de perfil es equivocarse de todo.
     Si el servidor no los manda (perfil sin resolver), no se inventa ninguno:
     manda el nombre del selector y punto. */
  function identidad(p) {
    const e = p && p.empresa;
    if (!e) return "";
    const partes = [e.nombre, e.naturaleza].filter((x) => x && String(x).trim());
    if (!partes.length) return "";
    return `<p class="rotulo-cifra hero-identidad">${esc(partes.join(" · "))}</p>`;
  }

  function htmlHero(p, nombrePerfil) {
    const quien = nombrePerfil ? `Para ${esc(nombrePerfil)}, hoy` : "Para su empresa, hoy";
    if (!p.total) {
      return `<p class="hero-titulo">${quien}: ninguna licitación abierta encaja con su perfil.</p>
        ${identidad(p)}
        <p class="hero-pie">${p.corpus_vacio ? "Todavía no hay licitaciones cargadas en el sistema." : `Hay ${num(p.visibles)} de su tipo de obra, pero ninguna cumple hoy sus requisitos (registro de proponente, capacidad de facturar y caja). Suba un RUP más completo o revise Mi empresa.`}</p>`;
    }
    const c = p.cierranEstaSemana || { n: 0, valor: null };
    return `
      <p class="hero-titulo">${quien}</p>
      ${identidad(p)}
      <div class="hero-cifras">
        ${cifraTitular(num(p.total), p.total === 1 ? "licitación a la que puede presentarse" : "licitaciones a las que puede presentarse", `class="cifra-enlace" data-filtro="todo" role="link" tabindex="0" title="Ver la lista completa"`)}
        ${cifraApoyo(pesosCortos(p.valorTotal) || "Sin referencia", "en juego (presupuestos oficiales)")}
        ${cifraApoyo(num(c.n), c.n === 1 ? "cierra esta semana" : "cierran esta semana", `class="cifra-enlace" data-filtro="cierre=7d" role="link" tabindex="0" title="Ver las que cierran en 7 días"`)}
      </div>
      ${c.n && c.valor ? `<p class="hero-pie">Las que cierran esta semana suman ${esc(pesosCortos(c.valor))}.</p>` : ""}`;
  }

  function htmlDepartamentos(p) {
    const lista = p.porDepartamento || [];
    if (!lista.length) return "";
    const g = barrasRank(lista, { filtroDe: (x) => `dep=${encodeURIComponent(x.nombre)}` });
    if (!g) return "";
    const extra = p.departamentosDistintos;
    return `<h2 class="text-sm font-semibold" style="color: var(--text-primary);">Dónde están</h2>${g}`
      + (extra > lista.length ? `<p class="mt-2 text-[11px]" style="color: var(--text-secondary);">${num(extra)} en total; ${lista.length === 1 ? "se muestra la que más procesos publica" : `se muestran las ${lista.length} con más procesos`}.</p>` : "");
  }

  function htmlEntidades(p) {
    const lista = p.topEntidades || [];
    if (!lista.length) return "";
    const g = barrasRank(lista, { filtroDe: (x) => x.nit ? `entidad=${encodeURIComponent(x.nit)}` : `entidad=${encodeURIComponent(x.nombre)}` });
    if (!g) return "";
    const extra = p.entidadesDistintas;
    return `<h2 class="text-sm font-semibold" style="color: var(--text-primary);">Quién las publica</h2>${g}`
      + (extra > lista.length ? `<p class="mt-2 text-[11px]" style="color: var(--text-secondary);">${num(extra)} en total; ${lista.length === 1 ? "se muestra la que más procesos publica" : `se muestran las ${lista.length} con más procesos`}.</p>` : "");
  }

  /* ── gráfico de barras (SVG en línea, sin dependencias) ──
     Cuatro o cinco cubetas con conteo encima y rótulo debajo; cada barra es
     un enlace a la lista filtrada por ESA cubeta (las cubetas son las mismas
     de los filtros: public/filtros.js). El color viene de las custom
     properties del tema (style="fill: var(--accent)"), así que respeta el
     modo oscuro y «aumentar contraste» sin una regla más. Sin datos (todas
     las cubetas en 0) no se dibuja: una gráfica de ceros no informa nada. */
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
  /* ⚠️ LA GEOMETRÍA DE ESTAS TRES PRIMITIVAS VIVE EN index.html, en clases
     propias (`viz-rank*`, `viz-apilada*`, `viz-leyenda*`), NO en utilidades de
     Tailwind. Medido en Chromium con el CDN caído —la red del dueño—: el riel
     de `barrasRank` medía `h-1.5` y los segmentos de `apilada` iban con
     `absolute top-0 h-full`; sin el CDN esas clases no existen, el alto queda
     en cero y el gráfico se dibuja VACÍO, que se lee como «no hay datos»
     habiéndolos. `columnas` no tenía el problema porque es SVG con estilos en
     línea. Lo que sigue en `style=` es DATO (el ancho, el color de la serie, el
     alto pedido por el llamador), no maquetación: eso es lo único que puede ir
     en línea. */
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

  /* ── COLUMNAS · magnitud sobre una escala ordenada ── */
  function columnas(cubetas, { ancho = 340, alto = VIZ.alto, filtroDe = () => null, conValor = true } = {}) {
    const n = (cubetas || []).length;
    if (!n) return "";
    const max = Math.max(...cubetas.map((c) => c.n || 0));
    if (!max) return "";
    const [ticks, tope] = ticksRedondos(max);
    const M = { arriba: 18, abajo: 30, izq: 34, der: 6 };
    const util = { w: ancho - M.izq - M.der, h: alto - M.arriba - M.abajo };
    const paso = util.w / n;
    const bw = Math.min(VIZ.barraMax, paso - VIZ.gap * 2);
    const y0 = M.arriba + util.h;
    const rejilla = ticks.map((t) => {
      const y = y0 - (t / tope) * util.h;
      return `<line x1="${M.izq}" y1="${y.toFixed(1)}" x2="${ancho - M.der}" y2="${y.toFixed(1)}" style="stroke: var(--viz-grid); stroke-width:1"></line>`
        + `<text x="${M.izq - 6}" y="${(y + 3.5).toFixed(1)}" text-anchor="end" font-size="10" style="fill: var(--text-secondary)">${miles(t)}</text>`;
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
      const cuerpo = h <= 0 ? "" : `<path d="M${x.toFixed(1)},${y0} L${x.toFixed(1)},${(y + VIZ.radio).toFixed(1)} Q${x.toFixed(1)},${y.toFixed(1)} ${(x + VIZ.radio).toFixed(1)},${y.toFixed(1)} L${(x + bw - VIZ.radio).toFixed(1)},${y.toFixed(1)} Q${(x + bw).toFixed(1)},${y.toFixed(1)} ${(x + bw).toFixed(1)},${(y + VIZ.radio).toFixed(1)} L${(x + bw).toFixed(1)},${y0} Z" style="fill: var(--accent)"></path>`;
      const valor = conValor && v > 0
        ? `<text x="${cx.toFixed(1)}" y="${(y - 5).toFixed(1)}" text-anchor="middle" font-size="11" font-weight="600" style="fill: var(--text-primary)">${miles(v)}</text>` : "";
      const rot = `<text x="${cx.toFixed(1)}" y="${alto - 9}" text-anchor="middle" font-size="10" style="fill: var(--text-secondary)">${esc(String(c.corto || c.etiqueta || ""))}</text>`;
      /* El área invisible ocupa la banda ENTERA: un objetivo de puntero del
         tamaño de la barra deja fuera las cubetas pequeñas, que son justo las
         que hay que poder consultar. */
      const zona = `<rect x="${(M.izq + paso * i).toFixed(1)}" y="${M.arriba}" width="${paso.toFixed(1)}" height="${util.h}" style="fill:transparent"></rect>`;
      const dinero = c.valor != null ? ` · ${pesosCortos(c.valor)}` : "";
      return envolver(filtroDe(c), `${c.titulo || c.etiqueta}: ${miles(v)}${dinero}`, zona + cuerpo + valor + rot);
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
  function barrasRank(items, { filtroDe = () => null, tope = 6, esCola = () => false } = {}) {
    const todos = items || [];
    const cola = todos.filter((x) => esCola(x));
    const lista = todos.filter((x) => !esCola(x)).slice(0, tope).concat(cola);
    if (!lista.length) return "";
    const max = Math.max(...lista.map((x) => x.n || 0));
    if (!max) return "";
    return `<ul class="viz-rank">${lista.map((x) => {
      const pct = Math.max(2, ((x.n || 0) / max) * 100);
      const filtro = filtroDe(x);
      const dinero = x.valor != null ? pesosCortos(x.valor) : null;
      const interior = `<div class="viz-rank-fila">
            <span class="viz-rank-nombre" title="${esc(x.nombre || "")}">${esc(x.nombre || "")}</span>
            <span class="viz-rank-cifra">${miles(x.n)}${dinero ? ` · ${esc(dinero)}` : ""}</span>
          </div>
          <div class="viz-rank-riel">
            <div class="viz-rank-barra" style="width:${pct.toFixed(1)}%"></div>
          </div>`;
      return `<li>${filtro
        ? `<a href="?${esc(filtro)}#/licitaciones" data-filtro="${esc(filtro)}" class="viz-rank-enlace">${interior}</a>`
        : interior}</li>`;
    }).join("")}</ul>`;
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
  const TONOS = 4;
  function plegarCola(vivos) {
    if (vivos.length <= TONOS) return vivos;
    const cabeza = vivos.slice(0, TONOS - 1);
    const cola = vivos.slice(TONOS - 1);
    return cabeza.concat([{ etiqueta: "Otros", n: cola.reduce((a, s) => a + s.n, 0), _cola: cola.length }]);
  }

  function apilada(segmentos, { alto = 26 } = {}) {
    const crudos = (segmentos || []).filter((s) => (s.n || 0) > 0).sort((a, b) => b.n - a.n);
    const vivos = plegarCola(crudos);
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
      return `<div class="viz-apilada-trozo" style="left:${izq.toFixed(2)}%; width:calc(${w.toFixed(2)}% - ${VIZ.gap}px); background: var(--viz-${i + 1}); border-radius: ${i === 0 ? "6px 0 0 6px" : x >= 99.99 ? "0 6px 6px 0" : "0"}"
          title="${esc(s.etiqueta)}: ${miles(s.n)} (${pct} %)"></div>`
        + (cabe ? `<span class="viz-apilada-rotulo" style="left:${izq.toFixed(2)}%; width:calc(${w.toFixed(2)}% - ${VIZ.gap}px); color:#000">${texto}</span>` : "");
    }).join("");
    const leyenda = vivos.map((s, i) => `<li>
        <span class="viz-leyenda-punto" style="background: var(--viz-${i + 1})"></span>
        <span class="viz-leyenda-texto">${esc(s.etiqueta)}${s._cola ? ` (${s._cola})` : ""} · ${miles(s.n)}</span></li>`).join("");
    return `<div class="viz-apilada" style="height:${alto}px">${trozos}</div>
      <ul class="viz-leyenda">${leyenda}</ul>`;
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
  /* ═══ LOS CUATRO REPARTOS SE RETIRARON (encargo del dueño, 28-ago-2026) ═══
     «La parte de "Cuándo hay que entregar la oferta", "Cuánto valen", "Qué tipo
     de trabajo es", "Cómo lo adjudican": elimínalo.» Aquí vivían `htmlCierre`,
     `htmlCuantia`, `htmlTipo` y `htmlModalidad`: cuatro gráficos que repartían
     el MISMO corpus del titular en cubetas. Repartir es describir el modelo; lo
     que decide ya está arriba —cuántas hay, cuánto valen en total y cuántas
     cierran esta semana— y cada una de esas tres cifras ES el enlace a su
     lista. Con los nodos (`#pu-cierre`, `#pu-cuantia`, `#pu-tipo`,
     `#pu-modalidad`) se fueron sus constructores: dejar funciones que ya no
     pinta nadie es la clase de duplicado que diverge a la primera corrección.
     LO QUE NO SE TOCÓ: `porCierre`, `porCuantia`, `porTipo` y `porModalidad`
     SIGUEN viajando en /api/perfil?op=pulso y siguen siendo filtros vivos del
     listado (public/filtros.js). Se dejó de PINTAR un reparto, no de medirlo, y
     la prueba que comprueba que las cubetas suman el total sigue en pie.
     `columnas` se conserva: es una de las tres primitivas del sistema visual
     (junto a `barrasRank` y `apilada`), está probada ejecutándola y la usaría
     cualquier gráfico de escala ordenada que vuelva; hoy no la llama nadie. */
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
  /* ⚠️ DE QUIÉN ES ESTE REGISTRO, DICHO CON SU NOMBRE (28-ago-2026).
     El dueño: «en "su registro de proponentes" la información que está dando es
     en general, de Génesis, no aplica a Helder». Estas seis cifras SÍ salían del
     perfil pedido —`empresaEnCifras` las lee de `PERFILES[perfil]`, hay prueba—,
     pero la tarjeta no decía de cuál: bajo un encabezado que dice «Su registro
     de proponente» y con un selector de perfil en la cabecera, seis números sin
     dueño se leen como los de quien mira. El nombre y la naturaleza YA viajaban
     en `empresa` y se estaban tirando. Van arriba de las cifras, con la fecha de
     corte cuando consta. Sin nombre no se inventa ninguno: la línea no se pinta.
     Y se dice de dónde salen: TODAS son del registro de proponente. Lo que no
     viene del RUP —los contratos ya ejecutados— vive en «Obra que ya ejecutó»,
     lleva el nombre de su dueño desde esta misma fecha y no se mezcla aquí. */
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
    const quien = [e.nombre, e.naturaleza].filter((x) => x && String(x).trim()).join(" · ");
    const corte = e.corte ? ` · corte ${esc(String(e.corte))}` : "";
    const cabecera = quien
      ? `<p class="text-sm font-medium" style="color: var(--text-primary);">${esc(quien)}</p>
         <p class="rotulo-cifra mt-0.5">Todas estas cifras salen de su registro de proponente${corte}.</p>`
      : "";
    return `${cabecera}<div class="${cabecera ? "mt-3 " : ""}grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">${partes.join("")}</div>`;
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
    const manif = d.getElementById("pu-manifestacion");
    if (manif) { manif.innerHTML = htmlManifestacion(p); manif.classList.toggle("hidden", !manif.innerHTML); }
    d.getElementById("pu-nota").textContent = htmlNota(p);
    // sin departamentos ni entidades (perfil sin licitaciones) las cajas se esconden
    d.getElementById("pu-departamentos").classList.toggle("hidden", !(p.porDepartamento || []).length);
    d.getElementById("pu-entidades").classList.toggle("hidden", !(p.topEntidades || []).length);
    raiz.classList.remove("hidden");
    perfilPintado = perfil;
    return true;
  }
  const olvidar = () => { perfilPintado = null; };

  return { arrancar, olvidar, pesosCortos, htmlHero, htmlEmpresa, htmlDepartamentos, htmlEntidades, htmlManifestacion, svgBarras, columnas, barrasRank, apilada, ticksRedondos, htmlNota };
});
