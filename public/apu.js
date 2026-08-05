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
      factor_prestacional: Number($("factor-prestacional").value),
      distancia_acarreo_km: Number($("distancia").value),
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
    if (c.factor_prestacional != null) $("factor-prestacional").value = c.factor_prestacional;
    if (c.distancia_acarreo_km != null) $("distancia").value = c.distancia_acarreo_km;
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

    $("aviso-precios").textContent = r.advertencia
      || "Los precios del catálogo son ilustrativos y están pendientes de calibración.";

    const dep = $("departamento");
    dep.innerHTML = '<option value="">— Sin departamento —</option>'
      + r.departamentos.map((d) => `<option value="${esc(d)}">${esc(d)}</option>`).join("");

    const sel = $("item-nuevo");
    sel.innerHTML = r.items
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
          item_id: i.codigo, descripcion: i.descripcion, unidad: i.unidad,
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

    cuerpo.innerHTML = filas.map((f, i) => {
      const def = CATALOGO ? CATALOGO.items.find((x) => x.codigo === f.item_id) : null;
      const rendPorDefecto = def && Number.isFinite(def.rendimiento_dia) ? def.rendimiento_dia : null;
      return `<tr data-fila="${i}">
        <td class="py-2 pr-3">
          <span class="font-medium">${esc(f.descripcion || f.item_id)}</span>
          <span class="block text-xs text-gray-400">${esc(f.item_id)}</span>
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

  /* ────────────────────────── cálculo ──────────────────────────────── */
  $("btn-calcular").addEventListener("click", async () => {
    const btn = $("btn-calcular");
    btn.disabled = true;
    btn.textContent = "Calculando…";
    try {
      const r = await api("/api/apu/calcular", {
        method: "POST",
        body: {
          items: filas.map((f) => ({
            item_id: f.item_id,
            cantidad: f.cantidad,
            rendimiento_override: f.rendimiento_override,
          })),
          departamento: $("departamento").value,
          config: leerConfig(),
        },
      });
      if (!r) return;
      ultimoCalculo = r;
      pintarCalculoEnTabla(r);
      pintarResumen(r);
      mensaje("Presupuesto calculado.", "ok");
    } catch (e) {
      mensaje(`No se pudo calcular: ${e.message}`, "error");
    } finally {
      btn.disabled = filas.length === 0;
      btn.textContent = "Calcular APU";
      $("btn-exportar").disabled = !ultimoCalculo;
    }
  });

  function celda(nombre, i) { return document.querySelector(`[data-celda="${nombre}-${i}"]`); }

  function pintarCalculoEnTabla(r) {
    r.items.forEach((it, i) => {
      const fila = document.querySelector(`tr[data-fila="${i}"]`);
      if (fila) fila.classList.toggle("bg-red-50", !!it.incompleto);
      const campos = [
        ["material", it.costo_material_unitario], ["mano_obra", it.costo_mano_obra_unitario],
        ["equipo", it.costo_equipo_unitario], ["transporte", it.costo_transporte_unitario],
        ["unitario", it.costo_directo_unitario], ["total", it.costo_total],
      ];
      for (const [nombre, valor] of campos) {
        const c = celda(nombre, i);
        if (c) c.textContent = pesos(valor);   // `null` → «—», jamás «$0»
      }
      if (it.incompleto) {
        const c = celda("unitario", i);
        if (c) c.title = it.mensaje || `Sin precio: ${(it.insumos_sin_precio || []).join(", ")}`;
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
    $("regional-nota").textContent = reg.estado === "estimado"
      ? `🟡 Categoría ${reg.categoria} · material ×${num(reg.material)} · mano de obra ×${num(reg.mano_obra)} · equipo ×${num(reg.equipo)}`
      : "⚪ Sin base regional: sin ajuste.";
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
        const def = CATALOGO ? CATALOGO.items.find((x) => x.codigo === f.item_id) : null;
        return {
          item_id: f.item_id,
          descripcion: f.descripcion || (def ? def.descripcion : f.item_id),
          unidad: f.unidad || (def ? def.unidad : null),
          cantidad: f.cantidad,
          rendimiento_override: f.rendimiento_override == null ? null : f.rendimiento_override,
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

  /* ─────────────────────── exportación a Excel ──────────────────────── */
  $("btn-exportar").addEventListener("click", () => {
    if (!ultimoCalculo) { mensaje("Calcule el presupuesto antes de exportarlo.", "error"); return; }
    try {
      const bytes = XLSXApu.construirLibro(construirHojas(ultimoCalculo));
      const nombre = ($("nombre-presupuesto").value.trim() || "presupuesto-apu")
        .replace(/[^\w\s-]/g, "").trim().replace(/\s+/g, "-").toLowerCase();
      XLSXApu.descargar(bytes, `${nombre || "presupuesto-apu"}.xlsx`);
      mensaje("Excel generado.", "ok");
    } catch (e) {
      mensaje(`No se pudo generar el Excel: ${e.message}`, "error");
    }
  });

  /* Dos hojas: el presupuesto (lo que se entrega) y el desglose insumo a
     insumo (lo que permite defenderlo si la entidad lo pregunta). */
  function construirHojas(r) {
    const c = r.configuracion;
    const s = r.resumen;
    const hoy = new Date().toISOString().slice(0, 10);
    const titulo = $("nombre-presupuesto").value.trim() || "Presupuesto de obra";

    /* ---------- hoja 1 · presupuesto ---------- */
    const filasHoja = [
      [{ v: "ANÁLISIS DE PRECIOS UNITARIOS", s: "titulo" }],
      [{ v: titulo, s: "negrita" }],
      [{ v: `Fecha: ${hoy}   ·   Departamento: ${r.departamento || "—"}   ·   Entidad: ${$("entidad").value.trim() || "—"}`, s: "subtitulo" }],
      [{ v: $("objeto").value.trim().slice(0, 400), s: "subtitulo" }],
      [],
      [
        { v: "Ítem", s: "encabezado" }, { v: "Descripción", s: "encabezado" },
        { v: "Unidad", s: "encabezado" }, { v: "Cantidad", s: "encabezado" },
        { v: "Rendim./día", s: "encabezado" }, { v: "Material", s: "encabezado" },
        { v: "Mano de obra", s: "encabezado" }, { v: "Equipo", s: "encabezado" },
        { v: "Transporte", s: "encabezado" }, { v: "Vr. unitario", s: "encabezado" },
        { v: "Vr. total", s: "encabezado" },
      ],
    ];

    for (const it of r.items) {
      filasHoja.push([
        { v: it.item_id, s: "texto" },
        { v: it.descripcion || "—", s: "texto" },
        { v: it.unidad || "—", s: "texto" },
        { v: it.cantidad, s: "cantidad" },
        { v: it.rendimiento_dia, s: "cantidad" },
        { v: it.costo_material_unitario, s: "moneda" },
        { v: it.costo_mano_obra_unitario, s: "moneda" },
        { v: it.costo_equipo_unitario, s: "moneda" },
        { v: it.costo_transporte_unitario, s: "moneda" },
        { v: it.costo_directo_unitario, s: "moneda" },
        { v: it.costo_total, s: "moneda" },
      ]);
    }

    filasHoja.push([]);
    const resumenFilas = [
      ["COSTO DIRECTO TOTAL", s.costo_directo_total, "destacado"],
      [`Administración (A) ${c.aiu_pct} %`, s.administracion, "normal"],
      [`Imprevistos (I) ${c.imprevistos_pct} %`, s.imprevistos, "normal"],
      [`Utilidad (U) ${c.utilidad_pct} %`, s.utilidad, "normal"],
      [`AIU total ${c.aiu_total_pct} % (${c.modo_aiu})`, null, "normal"],
      ["PRECIO DE VENTA", s.precio_venta, "resumen"],
    ];
    if (c.aplicar_ajuste_competitivo) {
      resumenFilas.push([`Ajuste competitivo −${c.factor_baja} %`, null, "normal"]);
      resumenFilas.push(["PRECIO FINAL OFERTADO", s.precio_final, "destacado"]);
    }
    resumenFilas.push(["Margen sobre costo directo", s.margen_final, "resumen"]);
    resumenFilas.push(["Financiación requerida (20 %)", s.financiacion_requerida, "normal"]);
    resumenFilas.push(["Contribución 5 % obra pública (informativo)", s.contribucion_obra_publica, "normal"]);
    resumenFilas.push(["IVA sobre la utilidad (informativo)", s.iva_sobre_utilidad, "normal"]);

    for (const [etiqueta, valor, tipo] of resumenFilas) {
      const estiloTexto = tipo === "destacado" ? "destacadoTexto" : tipo === "resumen" ? "resumenTexto" : "totalTexto";
      const estiloValor = tipo === "destacado" ? "destacadoMoneda" : tipo === "resumen" ? "resumenMoneda" : "totalMoneda";
      filasHoja.push([
        { v: etiqueta, s: estiloTexto }, null, null, null, null, null, null, null, null,
        null, { v: valor, s: estiloValor },
      ]);
    }

    filasHoja.push([]);
    filasHoja.push([{ v: (r.como_leerlo && r.como_leerlo.precios) || "", s: "nota" }]);
    for (const a of r.alertas || []) filasHoja.push([{ v: a, s: "nota" }]);

    const nFilas = filasHoja.length;
    const hoja1 = {
      nombre: "Presupuesto",
      filas: filasHoja,
      anchos: [16, 46, 9, 12, 12, 14, 14, 14, 13, 15, 17],
      altos: { 0: 26 },
      congelar: 6,
      fusiones: ["A1:K1", "A2:K2", "A3:K3", "A4:K4",
        ...Array.from({ length: nFilas }, (_, i) => i)
          .filter((i) => filasHoja[i].length === 1 && filasHoja[i][0] && filasHoja[i][0].s === "nota")
          .map((i) => `A${i + 1}:K${i + 1}`)],
    };

    /* ---------- hoja 2 · desglose por insumo ---------- */
    const det = [
      [{ v: "DESGLOSE DE PRECIOS UNITARIOS", s: "titulo" }],
      [{ v: `${titulo} · ${hoy}`, s: "subtitulo" }],
      [],
    ];
    for (const it of r.items) {
      if (it.incompleto && !it.detalle) {
        det.push([{ v: `${it.item_id} — ${it.mensaje || "sin datos"}`, s: "negrita" }], []);
        continue;
      }
      det.push([{ v: `${it.item_id} · ${it.descripcion} · ${it.unidad}`, s: "negrita" }]);
      det.push([
        { v: "Insumo", s: "encabezado" }, { v: "Descripción", s: "encabezado" },
        { v: "Unidad", s: "encabezado" }, { v: "Cantidad", s: "encabezado" },
        { v: "Desperd. %", s: "encabezado" }, { v: "Vr. unitario", s: "encabezado" },
        { v: "Valor", s: "encabezado" },
      ]);
      for (const m of (it.detalle && it.detalle.materiales) || []) {
        det.push([
          { v: m.codigo, s: "texto" }, { v: m.descripcion, s: "texto" }, { v: m.unidad, s: "texto" },
          { v: m.cantidad_con_desperdicio, s: "cantidad" }, { v: m.desperdicio_pct, s: "cantidad" },
          { v: m.precio_unitario, s: "moneda" }, { v: m.valor, s: "moneda" },
        ]);
      }
      for (const o of (it.detalle && it.detalle.cuadrilla) || []) {
        det.push([
          { v: o.codigo, s: "texto" }, { v: o.descripcion, s: "texto" }, { v: "hora", s: "texto" },
          { v: o.cantidad, s: "cantidad" }, null,
          { v: o.costo_hora, s: "moneda2" }, null,
        ]);
      }
      for (const o of (it.detalle && it.detalle.equipo) || []) {
        det.push([
          { v: o.codigo, s: "texto" }, { v: o.descripcion, s: "texto" }, { v: "hora", s: "texto" },
          { v: o.cantidad, s: "cantidad" }, null,
          { v: o.costo_hora, s: "moneda2" }, null,
        ]);
      }
      det.push([
        { v: `Rendimiento ${it.rendimiento_dia}/día · factor prestacional ${c.factor_prestacional} · herramienta menor ${it.detalle ? it.detalle.herramienta_menor_pct : "—"} %`, s: "nota" },
      ]);
      det.push([
        { v: "Valor unitario", s: "resumenTexto" }, null, null, null, null, null,
        { v: it.costo_directo_unitario, s: "resumenMoneda" },
      ]);
      det.push([]);
    }

    const hoja2 = { nombre: "Desglose", filas: det, anchos: [16, 42, 10, 13, 12, 15, 16] };
    return [hoja1, hoja2];
  }

  /* ─────────────────────────── arranque ─────────────────────────────── */
  async function arrancar() {
    sincronizarBaja();
    pintarTabla();
    try {
      await cargarCatalogo();
      pintarTabla(); // el catálogo aporta los rendimientos por defecto del placeholder
    } catch (e) {
      mensaje(`No se pudo cargar el catálogo: ${e.message}`, "error");
    }
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
