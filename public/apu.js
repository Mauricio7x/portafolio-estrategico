/* ============================================================================
   public/apu · Editor de Análisis de Precios Unitarios
   ----------------------------------------------------------------------------
   Cuatro cosas que no son adorno:

   1. EL ARRANQUE AUTOMÁTICO VA AL FINAL DEL IIFE. Es la lección que ya costó
      cara dos veces en este repositorio (`app.js` y `admin.js`): si `abrirApp()`
      se llama junto al gate, revienta en la zona muerta temporal de las
      constantes declaradas más abajo, y como todo es asíncrono el error sale
      por una promesa rechazada — la página se queda en blanco EN SILENCIO.

   2. NINGÚN `|| 0` SOBRE UNA CIFRA DEL SERVIDOR. Un `|| 0` convierte «no sé» en
      «cero» y lo hace creíble. Las cifras ausentes se pintan «—», que es lo que
      son. La suite tiene una prueba que lo prohíbe en los tres frontends.

   3. EL TOKEN VIAJA POR CABECERA, NUNCA EN LA URL. Queda fuera de los logs de
      acceso de Vercel y del historial del navegador. Se guarda en
      `sessionStorage` bajo la MISMA clave que usa el resto de la app
      (`historico_token`), así que quien ya lo escribió en el panel no lo repite.

   4. NINGUNA PULSACIÓN SE QUEDA SIN RESPUESTA VISIBLE. Un botón que no hace
      nada parece roto aunque el fallo sea del servidor.
   ========================================================================== */
(function () {
  "use strict";

  /* ─────────────────────────── gate del sitio ─────────────────────────── */
  const CLAVE = "231105";
  const $ = (id) => document.getElementById(id);

  const accesoConcedido = () => {
    try { return sessionStorage.getItem("detecta-acceso") === "1"; } catch { return false; }
  };

  function abrirApp() {
    try { sessionStorage.setItem("detecta-acceso", "1"); } catch { /* sesión restringida */ }
    $("gate").classList.add("hidden");
    $("app").classList.remove("hidden");
    arrancar();
  }

  $("gate-form").addEventListener("submit", (e) => {
    e.preventDefault();
    if ($("gate-clave").value === CLAVE) return abrirApp();
    const err = $("gate-error");
    err.textContent = "Clave incorrecta.";
    err.classList.remove("hidden");
    $("gate-clave").value = "";
    $("gate-clave").focus();
  });

  /* ──────────────────────────── token de la API ───────────────────────── */
  const CLAVE_TOKEN = "historico_token";
  let esperandoToken = null;

  const leerToken = () => { try { return sessionStorage.getItem(CLAVE_TOKEN) || ""; } catch { return ""; } };
  const guardarToken = (t) => { try { sessionStorage.setItem(CLAVE_TOKEN, t); } catch { /* modo restringido */ } };
  const olvidarToken = () => { try { sessionStorage.removeItem(CLAVE_TOKEN); } catch { /* ídem */ } };

  function pedirToken(motivo) {
    $("token-error").textContent = motivo || "";
    $("token-error").classList.toggle("hidden", !motivo);
    $("modal-token").classList.remove("hidden");
    $("modal-token").classList.add("flex");
    $("campo-token").value = "";
    $("campo-token").focus();
    return new Promise((resolve) => { esperandoToken = resolve; });
  }

  function cerrarModalToken(valor) {
    $("modal-token").classList.add("hidden");
    $("modal-token").classList.remove("flex");
    if (esperandoToken) { esperandoToken(valor); esperandoToken = null; }
  }

  $("form-token").addEventListener("submit", (e) => {
    e.preventDefault();
    const t = $("campo-token").value.trim();
    if (!t) {
      // AVISA en vez de hacer `return` a secas: un botón que no responde
      // parece roto y el dueño no tiene forma de saber que faltaba el campo
      $("token-error").textContent = "Escriba el token: el campo está vacío.";
      $("token-error").classList.remove("hidden");
      return;
    }
    guardarToken(t);
    cerrarModalToken(t);
  });
  $("btn-token-cancelar").addEventListener("click", () => cerrarModalToken(null));
  $("modal-token").addEventListener("click", (e) => { if (e.target === $("modal-token")) cerrarModalToken(null); });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !$("modal-token").classList.contains("hidden")) cerrarModalToken(null);
  });

  /* Llamada autenticada. Si el token falta o el servidor responde 401, lo pide
     UNA vez y reintenta; si el usuario cancela, devuelve null y quien llamó
     enseña el aviso. Nunca deja la interfaz girando para siempre. */
  async function api(ruta, opciones = {}, reintento = true) {
    let token = leerToken();
    if (!token) {
      token = await pedirToken("Esta acción necesita el token del despliegue.");
      if (!token) return null;
    }
    const cfg = {
      method: opciones.method || "GET",
      headers: { "x-historico-token": token },
    };
    if (opciones.body !== undefined) {
      cfg.headers["Content-Type"] = "application/json";
      cfg.body = JSON.stringify(opciones.body);
    }
    let r;
    try {
      r = await fetch(ruta, cfg);
    } catch (e) {
      throw new Error(`Sin conexión con el servidor (${e.message}).`);
    }
    if (r.status === 401 && reintento) {
      olvidarToken();
      const nuevo = await pedirToken("El token no es válido. Vuelva a escribirlo.");
      if (!nuevo) return null;
      return api(ruta, opciones, false);
    }
    let cuerpo = null;
    try { cuerpo = await r.json(); } catch { /* respuesta no-JSON */ }
    if (!r.ok) {
      throw new Error((cuerpo && cuerpo.error) || `El servidor respondió ${r.status}.`);
    }
    return cuerpo;
  }

  /* ─────────────────────────── formato ──────────────────────────────── */
  const nf = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 0 });
  const nf2 = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 2 });

  /* `pesos`/`num` reciben `null` cuando el servidor no tiene el dato y pintan
     «—». Es justo lo contrario de un `|| 0`: no inventan un cero creíble. */
  const pesos = (n) => (Number.isFinite(n) ? `$${nf.format(n)}` : "—");
  const num = (n) => (Number.isFinite(n) ? nf2.format(n) : "—");
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  function mensaje(texto, tipo = "info") {
    const el = $("accion-mensaje");
    const colores = { info: "text-gray-600", ok: "text-emerald-700", error: "text-red-600" };
    el.className = `mt-3 text-sm ${colores[tipo] || colores.info}`;
    el.textContent = texto;
  }

  /* ─────────────────────────── estado ──────────────────────────────── */
  let CATALOGO = null;      // respuesta de /api/apu/catalogo
  let filas = [];           // [{item_id, descripcion, unidad, cantidad, rendimiento_override}]
  let ultimoCalculo = null; // respuesta de /api/apu/calcular
  let idActual = null;      // id del presupuesto cargado/guardado
  let ultimoOptimizador = null; // bloque `optimizador` de /api/apu/rentabilidad
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
    const r = await api("/api/apu/catalogo");
    if (!r) return;
    CATALOGO = r;

    $("aviso-precios").textContent = r.aviso
      || "Precios de referencia regionalizada, no cotizaciones: verifique contra cotización real antes de ofertar.";

    const dep = $("departamento");
    const conRegion = new Set(r.departamentos_con_region || []);
    /* El desplegable marca cuáles tienen precio de referencia y cuáles no. Sin
       la marca, elegir Chocó parecería exactamente igual de fiable que elegir
       Antioquia, y no lo es: uno se calcula con su región y el otro con la base. */
    dep.innerHTML = '<option value="">— Sin departamento —</option>'
      + (r.departamentos || []).map((d) => {
        const marca = conRegion.has(d) ? "" : "  ⚪ sin región cotizada";
        return `<option value="${esc(d)}">${esc(d)}${esc(marca)}</option>`;
      }).join("");

    const sel = $("item-nuevo");
    sel.innerHTML = (r.items || [])
      .map((i) => `<option value="${esc(i.codigo)}">${esc(i.descripcion)} (${esc(i.unidad)})</option>`)
      .join("");
  }

  /* ────────────────────────── inferencia ───────────────────────────── */
  $("btn-inferir").addEventListener("click", async () => {
    const objeto = $("objeto").value.trim();
    if (!objeto) {
      pintarInferencia({ estado: "no_determinada", mensaje: "Escriba el objeto del proceso antes de inferir." });
      return;
    }
    const btn = $("btn-inferir");
    btn.disabled = true;
    btn.textContent = "Infiriendo…";
    try {
      const r = await api("/api/apu/inferir", {
        method: "POST",
        body: { objeto, codigos_unspsc: $("codigos-unspsc").value.trim() },
      });
      if (!r) return;
      pintarInferencia(r);
      if (r.items && r.items.length) {
        filas = r.items.map((i) => ({
          item_id: i.codigo, descripcion: i.descripcion || i.codigo, unidad: i.unidad,
          cantidad: 0, rendimiento_override: null,
        }));
        ultimoCalculo = null;
        pintarTabla();
      }
    } catch (e) {
      pintarInferencia({ estado: "no_determinada", mensaje: `No se pudo inferir: ${e.message}` });
    } finally {
      btn.disabled = false;
      btn.textContent = "Inferir ítems";
    }
  });

  function pintarInferencia(r) {
    const caja = $("inferencia");
    const estilos = {
      verde: "bg-emerald-50 text-emerald-900",
      amarillo: "bg-amber-50 text-amber-900",
      no_determinada: "bg-gray-100 text-gray-700",
    };
    const emoji = { verde: "🟢", amarillo: "🟡", no_determinada: "⚪" };
    caja.className = `mt-4 rounded-xl p-4 text-sm ${estilos[r.estado] || estilos.no_determinada}`;
    caja.classList.remove("hidden");

    let html = `<p class="font-medium">${emoji[r.estado] || "⚪"} ${esc(r.mensaje || "")}</p>`;
    if (r.tipologia) {
      html += `<p class="mt-1 text-xs opacity-80">Tipología <strong>${esc(r.tipologia.codigo)}</strong> · `
        + `${esc(r.tipologia.nombre)} · unidad dominante ${esc(r.tipologia.unidad_dominante || "—")} · `
        + `puntaje ${r.puntaje}, margen ${r.margen}</p>`;
      if (r.tipologia.sin_apu && r.tipologia.nota) {
        html += `<p class="mt-2 rounded-lg bg-white/60 p-2 text-xs">⚠️ ${esc(r.tipologia.nota)}</p>`;
      }
    }
    if (r.cantidades && r.cantidades.length) {
      html += `<p class="mt-2 text-xs opacity-80">Magnitudes legibles en el objeto: `
        + r.cantidades.map((c) => `<strong>${num(c.valor)} ${esc(c.unidad)}</strong>`).join(" · ")
        + " — verifíquelas contra el formulario de cantidades del pliego.</p>";
    }
    if (r.unspsc && r.unspsc.presente) {
      html += `<p class="mt-1 text-xs opacity-70">Familias UNSPSC leídas: ${r.unspsc.familias.map(esc).join(", ")}</p>`;
    }
    caja.innerHTML = html;
  }

  /* ────────────────────────── tabla de ítems ───────────────────────── */
  $("btn-agregar").addEventListener("click", () => {
    if (!CATALOGO) return;
    const codigo = $("item-nuevo").value;
    const def = CATALOGO.items.find((i) => i.codigo === codigo);
    if (!def) return;
    filas.push({
      item_id: def.codigo, descripcion: def.descripcion, unidad: def.unidad,
      cantidad: 0, rendimiento_override: null,
    });
    ultimoCalculo = null;
    pintarTabla();
  });

  function pintarTabla() {
    const cuerpo = $("tabla");
    $("tabla-vacia").classList.toggle("hidden", filas.length > 0);
    $("btn-calcular").disabled = filas.length === 0;
    $("btn-exportar").disabled = !ultimoCalculo;

    /* Una sola cadena y un solo innerHTML: con 200-300 ítems importados, armar
       nodos uno a uno congela la pestaña. Los manejadores van DELEGADOS (abajo),
       así que repintar entero no pierde ninguno. */
    cuerpo.innerHTML = filas.map((f, i) => {
      const def = CATALOGO && f.item_id ? CATALOGO.items.find((x) => x.codigo === f.item_id) : null;
      const rendPorDefecto = def && Number.isFinite(def.rendimiento_dia) ? def.rendimiento_dia : null;
      const capitulo = f.capitulo
        ? `<span class="block text-[11px] uppercase tracking-wide text-gray-400">${esc(f.capitulo)}</span>` : "";
      const chipManual = f.precio_manual != null
        ? `<span class="mt-0.5 inline-block rounded bg-amber-100 px-1.5 text-[11px] text-amber-900">precio ${f.origen_precio === "archivo" ? "del archivo" : "manual"}</span>` : "";
      const sugerencia = !f.item_id && f.sugerencia
        ? `<span class="block text-[11px] text-gray-400">Sugerencia del catálogo: ${esc(f.sugerencia)}</span>` : "";
      return `<tr data-fila="${i}">
        <td class="py-2 pr-3">
          ${capitulo}
          <span class="font-medium">${esc(f.descripcion || f.item_id || "—")}</span>
          <span class="block text-xs text-gray-400">${esc(f.item_id || (f.codigo ? `fila ${f.codigo} del archivo` : "personalizado"))}</span>
          ${sugerencia}${chipManual}
        </td>
        <td class="py-2 pr-3 text-gray-500">${esc(f.unidad || "—")}</td>
        <td class="py-2 pr-3 text-right">
          <input type="number" min="0" step="any" data-campo="cantidad" data-fila="${i}"
                 value="${f.cantidad || ""}" placeholder="0"
                 class="edit w-24 rounded border border-gray-200 px-2 py-1 text-right num">
        </td>
        <td class="py-2 pr-3 text-right">
          <input type="number" min="0" step="any" data-campo="rendimiento" data-fila="${i}"
                 value="${f.rendimiento_override == null ? "" : f.rendimiento_override}"
                 placeholder="${rendPorDefecto == null ? "—" : num(rendPorDefecto)}"
                 class="edit w-24 rounded border border-gray-200 px-2 py-1 text-right num">
        </td>
        <td class="py-2 pr-3 text-right">
          <input type="number" min="0" step="any" data-campo="precio" data-fila="${i}"
                 value="${f.precio_manual == null ? "" : f.precio_manual}"
                 placeholder="${f.item_id ? "del catálogo" : "requerido"}"
                 class="edit w-28 rounded border border-gray-200 px-2 py-1 text-right num">
        </td>
        <td class="py-2 pr-3 text-right num" data-celda="material-${i}">—</td>
        <td class="py-2 pr-3 text-right num" data-celda="mano_obra-${i}">—</td>
        <td class="py-2 pr-3 text-right num" data-celda="equipo-${i}">—</td>
        <td class="py-2 pr-3 text-right num" data-celda="transporte-${i}">—</td>
        <td class="py-2 pr-3 text-right num font-medium" data-celda="unitario-${i}">—</td>
        <td class="py-2 pr-3 text-right num font-semibold" data-celda="total-${i}">—</td>
        <td class="py-2 text-right">
          <button type="button" data-quitar="${i}"
                  class="rounded px-2 py-1 text-xs text-gray-400 transition hover:bg-red-50 hover:text-red-600"
                  aria-label="Quitar ítem">✕</button>
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

  $("tabla").addEventListener("click", (e) => {
    const quitar = e.target.getAttribute("data-quitar");
    if (quitar === null) return;
    filas.splice(Number(quitar), 1);
    ultimoCalculo = null;
    pintarTabla();
  });

  /* ────────────────────────── cálculo ────────────────────────────────
     Extraído del listener para que «Aplicar este descuento al APU» pueda
     recalcular por el MISMO camino. Dos rutas de cálculo se desincronizan a la
     primera corrección que se aplique a una sola. */
  async function calcularApu() {
    const btn = $("btn-calcular");
    btn.disabled = true;
    btn.textContent = "Calculando…";
    try {
      const r = await api("/api/apu/calcular", {
        method: "POST",
        body: {
          items: filas.map((f) => ({
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
          })),
          departamento: $("departamento").value,
          config: leerConfig(),
        },
      });
      if (!r) return false;
      ultimoCalculo = r;
      pintarCalculoEnTabla(r);
      pintarResumen(r);
      mensaje("Presupuesto calculado.", "ok");
      return true;
    } catch (e) {
      mensaje(`No se pudo calcular: ${e.message}`, "error");
      return false;
    } finally {
      btn.disabled = filas.length === 0;
      btn.textContent = "Calcular APU";
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
    /* Las filas se resuelven UNA vez y las celdas se buscan DENTRO de su fila:
       con 300 ítems, un querySelector global por celda (6 × 300 sobre el
       documento entero) tarda lo bastante como para sentirse. */
    const filasDom = $("tabla").querySelectorAll("tr[data-fila]");
    r.items.forEach((it, i) => {
      const fila = filasDom[i];
      if (!fila) return;
      fila.classList.toggle("bg-red-50", !!it.incompleto);
      // ámbar = suma al total con precio manual/del archivo, sin APU detrás
      fila.classList.toggle("bg-amber-50", !it.incompleto && !!it.sin_apu);
      const campos = [
        ["material", it.costo_material_unitario], ["mano_obra", it.costo_mano_obra_unitario],
        ["equipo", it.costo_equipo_unitario], ["transporte", it.costo_transporte_unitario],
        ["unitario", it.costo_directo_unitario], ["total", it.costo_total],
      ];
      for (const [nombre, valor] of campos) {
        const c = fila.querySelector(`[data-celda="${nombre}-${i}"]`);
        if (c) c.textContent = pesos(valor);   // `null` → «—», jamás «$0»
      }
      const cu = fila.querySelector(`[data-celda="unitario-${i}"]`);
      if (cu) {
        if (it.incompleto) cu.title = it.mensaje || "Sin precio";
        else if (it.sin_apu && Number.isFinite(it.cd_catalogo)) {
          cu.title = `Precio ${it.origen_precio === "archivo" ? "del archivo" : "manual"}. Referencia del catálogo: ${pesos(it.cd_catalogo)}`;
        } else cu.title = "";
      }
    });
  }

  function pintarResumen(r) {
    $("seccion-resumen").classList.remove("hidden");
    const s = r.resumen;

    $("r-directo").textContent = pesos(s.costo_directo_total);
    $("r-venta").textContent = pesos(s.precio_venta);
    $("r-aiu").textContent = `AIU ${num(r.configuracion.aiu_total_pct)} % (${r.configuracion.modo_aiu})`;
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

    $("r-alertas").innerHTML = (r.alertas || []).map((a) =>
      `<p class="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900">${esc(a)}</p>`).join("");

    const reg = r.ajuste_regional;
    const f = reg.factores;
    $("regional-nota").textContent = reg.estado === "mapeado" && f
      ? `🟢 ${reg.region_nombre} · material ×${num(f.materiales)} · mano de obra ×${num(f.mano_obra)} · equipo ×${num(f.equipo)} · transporte ×${num(f.transporte)}`
      : `⚪ Sin región cotizada: se calculó con la región base «${esc(reg.region_utilizada || "—")}».`;
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
      const r = await api(`/api/indice-baja?entidad=${encodeURIComponent(entidad)}`);
      if (!r) { $("baja-nota").textContent = "Consulta cancelada."; return; }
      const e = (r.entidades && r.entidades[0]) || null;
      /* Se exige BASE antes de interpolar una cifra: mediana presente y
         procesos por encima del mínimo. Es la misma invariante que impuso
         `competenciaDe` tras el defecto de «18,2 oferentes en 0 procesos». */
      const procesos = e ? (e.procesos ?? e.procesos_contados) : null;
      if (!e || e.baja_mediana == null || !Number.isFinite(procesos) || procesos < r.min_procesos) {
        $("baja-nota").textContent = `⚪ Sin base suficiente para «${entidad}»: hacen falta ${r.min_procesos} adjudicaciones con presupuesto y valor adjudicado.`;
        return;
      }
      $("factor-baja").value = e.baja_mediana;
      $("baja-nota").textContent = `Mediana histórica: ${num(e.baja_mediana)} % sobre ${procesos} procesos`
        + (e.nivel ? ` (nivel ${e.nivel})` : "") + ". Es el descuento típico, no una recomendación.";
    } catch (err) {
      $("baja-nota").textContent = `No se pudo consultar: ${err.message}`;
    }
  });

  /* ──────────────────────── guardar / cargar ───────────────────────── */
  $("btn-guardar").addEventListener("click", async () => {
    if (!filas.length) { mensaje("No hay ítems que guardar.", "error"); return; }
    const btn = $("btn-guardar");
    btn.disabled = true;
    try {
      const r = await api("/api/apu/guardar", {
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
        },
      });
      if (!r) return;
      idActual = r.id;
      mensaje(`Guardado como «${r.nombre}» (id ${r.id}). ${r.nota}`, "ok");
    } catch (e) {
      mensaje(`No se pudo guardar: ${e.message}`, "error");
    } finally {
      btn.disabled = false;
    }
  });

  $("btn-listar").addEventListener("click", async () => {
    const caja = $("lista-presupuestos");
    try {
      const r = await api(`/api/apu/listar?perfil=${encodeURIComponent($("perfil").value)}`);
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
      mensaje(`No se pudo listar: ${e.message}`, "error");
    }
  });

  $("lista-presupuestos").addEventListener("click", async (e) => {
    const id = e.target.getAttribute("data-cargar");
    if (!id) return;
    try {
      const r = await api(`/api/apu/cargar?id=${encodeURIComponent(id)}&perfil=${encodeURIComponent($("perfil").value)}`);
      if (!r) return;
      const p = r.presupuesto;
      idActual = p.id;
      $("nombre-presupuesto").value = p.nombre || "";
      $("objeto").value = p.objeto || "";
      $("departamento").value = p.departamento || "";
      $("entidad").value = p.entidad || "";
      aplicarConfig(p.config);
      filas = (p.items || []).map((f) => {
        const def = CATALOGO && f.item_id ? CATALOGO.items.find((x) => x.codigo === f.item_id) : null;
        return {
          item_id: f.item_id || null,
          codigo: f.codigo || null,
          capitulo: f.capitulo || null,
          descripcion: f.descripcion || (def ? def.descripcion : f.item_id),
          unidad: f.unidad || (def ? def.unidad : null),
          cantidad: f.cantidad,
          rendimiento_override: f.rendimiento_override == null ? null : f.rendimiento_override,
          // los borradores guardados antes de la importación no traen estos
          // campos: `undefined` y `null` significan lo mismo aquí (sin precio manual)
          precio_manual: f.precio_manual == null ? null : f.precio_manual,
          origen_precio: f.origen_precio || null,
          sugerencia: f.sugerencia || null,
        };
      });
      ultimoCalculo = null;
      pintarTabla();
      $("seccion-resumen").classList.add("hidden");
      $("lista-presupuestos").classList.add("hidden");
      mensaje(r.catalogo_cambiado
        ? `Cargado «${p.nombre}». ⚠️ ${r.nota}`
        : `Cargado «${p.nombre}». Pulse «Calcular APU» para ver los totales.`, r.catalogo_cambiado ? "error" : "ok");
    } catch (err) {
      mensaje(`No se pudo cargar: ${err.message}`, "error");
    }
  });

  /* ─────────────────────── exportación a Excel ────────────────────────
     El formato lo arma `public/apu_libro.js` (formato del Presupuesto Nogal 4:
     capítulos, fórmulas =D×E, bloque A/I/U + IVA sobre la utilidad, firmas y
     hoja APU con el desglose por insumo). Vive fuera de este IIFE para que el
     generador de Node use EXACTAMENTE el mismo constructor: dos copias del
     formato divergen a la primera corrección. */
  $("btn-exportar").addEventListener("click", () => {
    if (!ultimoCalculo) { mensaje("Calcule el presupuesto antes de exportarlo.", "error"); return; }
    try {
      const hojas = APULibro.construirLibroNogal(ultimoCalculo, {
        titulo: $("nombre-presupuesto").value.trim() || "Presupuesto de obra",
        objeto: $("objeto").value.trim().slice(0, 400) || null,
        entidad: $("entidad").value.trim() || null,
        departamento: $("departamento").value || null,
        fecha: new Date().toISOString().slice(0, 10),
      });
      const bytes = XLSXApu.construirLibro(hojas);
      const nombre = ($("nombre-presupuesto").value.trim() || "presupuesto-apu")
        .replace(/[^\w\s-]/g, "").trim().replace(/\s+/g, "-").toLowerCase();
      XLSXApu.descargar(bytes, `${nombre || "presupuesto-apu"}.xlsx`);
      mensaje("Excel generado (formato APU profesional: presupuesto + análisis por ítem).", "ok");
    } catch (e) {
      mensaje(`No se pudo generar el Excel: ${e.message}`, "error");
    }
  });


  /* ════════════════════ Importación desde Excel/CSV ════════════════════
     El archivo se lee EN EL NAVEGADOR (public/xlsx_lectura.js): al servidor
     viajan solo las filas estructuradas, que `/api/apu/importar` mapea contra
     el catálogo calibrado. La vista previa enseña el mapeo ANTES de tocar la
     tabla, y una sugerencia 🟡 («revisar») solo cobra precio del catálogo si su
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
        mensaje(`No se encontraron ítems en «${archivo.name}». ${(crudas.avisos || []).join(" ")}`, "error");
        return;
      }
      const r = await api("/api/apu/importar", {
        method: "POST",
        body: { filas: crudas.filas, departamento: $("departamento").value },
      });
      if (!r) return;                       // canceló el diálogo del token
      importacion = { ...r, avisos_lectura: crudas.avisos || [], nombre_archivo: archivo.name };
      abrirModalImportar();
    } catch (err) {
      mensaje(`No se pudo importar: ${err.message}`, "error");
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
      return XLSXLectura.detectarFilasApu(XLSXLectura.parsearCsv(texto));
    }
    const inflar = typeof DecompressionStream === "function" ? inflarNavegador : null;
    const libro = await XLSXLectura.leerLibro(bytes, { inflar });
    const mejor = XLSXLectura.elegirHoja(libro);
    if (!mejor) return { filas: [], avisos: ["El libro no trae hojas."] };
    return mejor.resultado;
  }

  function abrirModalImportar() {
    const m = importacion.resumen_mapeo;
    $("imp-resumen").textContent = `${importacion.nombre_archivo} · ${m.total} ítems · `
      + `${m.firmes} firmes · ${m.revisar} por revisar · ${m.personalizados} personalizados · `
      + `${m.con_precio_archivo} con precio del archivo`;
    $("imp-avisos").innerHTML = (importacion.avisos_lectura || [])
      .map((a) => `<p class="rounded-lg bg-amber-50 px-3 py-1.5 text-xs text-amber-900">${esc(a)}</p>`).join("");

    const chip = (f) => {
      if (f.nivel_mapeo === "firme") {
        return `<span class="rounded bg-emerald-100 px-1.5 py-0.5 text-[11px] text-emerald-900">🟢 firme</span> `
          + `<span class="text-xs text-gray-600">${esc(f.descripcion_catalogo || "")}</span>`;
      }
      if (f.nivel_mapeo === "revisar") {
        const marcada = f.precio_archivo != null ? "checked" : "";
        return `<label class="flex items-start gap-1.5">
          <input type="checkbox" data-aceptar="${f.orden}" ${marcada} class="mt-0.5 h-3.5 w-3.5 rounded border-gray-300">
          <span class="text-xs"><span class="rounded bg-amber-100 px-1.5 py-0.5 text-[11px] text-amber-900">🟡 revisar · ${Math.round((f.confianza ?? 0) * 100)} %</span>
          ${esc(f.descripcion_catalogo || "")}</span></label>`;
      }
      return `<span class="rounded bg-gray-100 px-1.5 py-0.5 text-[11px] text-gray-600">⚪ personalizado</span>`
        + (f.precio_archivo == null ? ' <span class="text-[11px] font-medium text-red-600">sin precio: escríbalo en la tabla antes de calcular</span>' : "");
    };

    $("imp-tabla").innerHTML = importacion.filas.map((f) => `
      <tr class="${f.precio_archivo == null && !f.item_id ? "bg-red-50" : ""}">
        <td class="px-2 py-1.5 text-xs text-gray-500">${esc(f.codigo_archivo || "—")}</td>
        <td class="px-2 py-1.5">${f.capitulo ? `<span class="block text-[10px] uppercase text-gray-400">${esc(f.capitulo)}</span>` : ""}${esc(f.descripcion)}</td>
        <td class="px-2 py-1.5 text-gray-500">${esc(f.unidad || "—")}</td>
        <td class="px-2 py-1.5 text-right num">${f.cantidad == null ? "—" : num(f.cantidad)}</td>
        <td class="px-2 py-1.5 text-right num">${f.precio_archivo == null ? "—" : pesos(f.precio_archivo)}</td>
        <td class="px-2 py-1.5">${chip(f)}</td>
      </tr>`).join("");

    $("imp-nota").textContent = "El precio del archivo MANDA y queda declarado. Una sugerencia 🟡 sin precio solo usa el catálogo si su casilla queda marcada.";
    $("modal-importar").classList.remove("hidden");
    $("modal-importar").classList.add("flex");
  }

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
        sugerencia: f.descripcion_catalogo || null,
      };
    });
    filas = filas.concat(nuevas);
    ultimoCalculo = null;
    cerrarModalImportar();
    pintarTabla();
    mensaje(`${nuevas.length} ítem(s) añadidos desde «${importacion.nombre_archivo}». Calculando…`, "ok");
    await calcularApu();
  });

  /* ─────────────────────────── arranque ─────────────────────────────── */

  /* ════════════════════ Precarga desde el panel y rentabilidad ═══════════════
     El botón «APU» de una fila de /admin.html abre esta página con el proceso
     en la querystring. Sin esa precarga habría que copiar a mano el objeto, el
     departamento, la entidad y la cuantía de cada proceso, que es justo el
     trabajo que el botón existe para ahorrar. */
  function precargarDesdeURL() {
    let p;
    try { p = new URLSearchParams(location.search); } catch { return false; }
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
      if (!auto) mensaje("Agregue ítems antes de calcular la rentabilidad.", "error");
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
        items: filas.map((f) => ({ item_id: f.item_id, cantidad: f.cantidad, rendimiento_override: f.rendimiento_override })),
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
      const c = await api("/api/apu/rentabilidad", { method: "POST", body: cuerpo });
      if (!c) return; // el usuario canceló el diálogo del token
      pintarRentabilidad(c);
      pintarPrecioSugerido(c.optimizador);
      mensaje(auto ? "Rentabilidad y precio sugerido actualizados." : "Rentabilidad actualizada.", "ok");
    } catch (e) {
      mensaje(`No se pudo calcular la rentabilidad: ${e.message}`, "error");
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
      r.utilidad_esperada <= 0 ? "mal" : null));
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
      partes.push(`<p class="rounded-lg bg-gray-100 px-3 py-2">⚪ ${esc(a.mensaje || "Sin índice de baja para esta entidad.")}</p>`);
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
      sin.textContent = `⚪ ${(o && o.mensaje) || "No hay con qué sugerir un precio para este proceso."}`;
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

    return `<svg viewBox="0 0 ${W} ${H}" class="h-44 w-full min-w-[560px]" role="img"
      aria-label="Valor esperado de la ganancia según el descuento sobre el presupuesto oficial">
      <line x1="${mL}" y1="${cero.toFixed(1)}" x2="${W - mR}" y2="${cero.toFixed(1)}" stroke="#d1d5db" stroke-dasharray="3 3"/>
      <polyline points="${linea}" fill="none" stroke="#2563eb" stroke-width="2"/>
      <line x1="${px(op.descuento).toFixed(1)}" y1="${mT}" x2="${px(op.descuento).toFixed(1)}" y2="${H - mB}"
            stroke="#2563eb" stroke-width="1" stroke-dasharray="2 3"/>
      <circle cx="${px(op.descuento).toFixed(1)}" cy="${py(op.veg).toFixed(1)}" r="4" fill="#2563eb"/>
      ${dentro ? `<circle cx="${px(actual.descuento).toFixed(1)}" cy="${py(actual.veg).toFixed(1)}" r="4"
            fill="none" stroke="#111827" stroke-width="2"/>` : ""}
      <text x="${mL}" y="${H - 10}" font-size="11" fill="#9ca3af">${esc(nf2.format(x0))} %</text>
      <text x="${W - mR}" y="${H - 10}" font-size="11" fill="#9ca3af" text-anchor="end">${esc(nf2.format(x1))} %</text>
      <text x="${px(op.descuento).toFixed(1)}" y="${H - 10}" font-size="11" fill="#2563eb" text-anchor="middle">óptimo ${esc(nf2.format(op.descuento))} %</text>
      <text x="4" y="${(py(y1) + 4).toFixed(1)}" font-size="11" fill="#9ca3af">${esc(copRent(y1))}</text>
      ${cero - py(y1) >= 14 ? `<text x="4" y="${(cero + 4).toFixed(1)}" font-size="11" fill="#9ca3af">$0</text>` : ""}
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
    $("ajuste-competitivo").checked = true;
    sincronizarBaja();
    $("factor-baja").value = punto.descuento_apu_pct;
    $("baja-nota").textContent = `Del precio sugerido: ${num(punto.descuento_apu_pct)} % sobre su precio de venta, `
      + `que equivale a ${num(punto.descuento)} % de baja contra el presupuesto oficial.`;
    mensaje(`Descuento aplicado (${num(punto.descuento_apu_pct)} %). Recalculando…`, "info");
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
    sincronizarBaja();
    pintarTabla();
    try {
      await cargarCatalogo();
      pintarTabla(); // el catálogo aporta los rendimientos por defecto del placeholder
    } catch (e) {
      mensaje(`No se pudo cargar el catálogo: ${e.message}`, "error");
    }
    // el departamento del proceso solo se puede fijar cuando el catálogo ya
    // llenó el desplegable: antes no existe la opción que hay que seleccionar
    if (hayProceso) precargarDesdeURL();
  }

  /* EL ARRANQUE AUTOMÁTICO VA AQUÍ, AL FINAL DEL IIFE, y no junto al gate:
     `abrirApp()` llama a `arrancar()`, que usa `CATALOGO`, `filas` y las
     funciones declaradas arriba. Colocado junto al gate, en la segunda visita
     de la MISMA pestaña (con `detecta-acceso` ya en sessionStorage) se
     ejecutaría antes de esas declaraciones y moriría en la zona muerta
     temporal — por una promesa rechazada, o sea EN SILENCIO. Es exactamente el
     bug que ya se pagó en app.js y en admin.js. */
  if (accesoConcedido()) abrirApp();
})();
