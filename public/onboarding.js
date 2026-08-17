/* ============================================================================
   Detekta · Onboarding — subir el RUP en PDF y salir con un perfil andando
   ----------------------------------------------------------------------------
   EL PDF SE LEE AQUÍ, EN EL NAVEGADOR — la misma decisión medida de
   public/pliego.js: pdf.js extrae el texto conservando las columnas por
   coordenadas (agrupar por Y forma la fila; el hueco en X decide TAB o
   espacio) y al servidor solo viaja texto. El servidor (lib/rup_pdf) no sabe
   leer un PDF binario a propósito: cero dependencias npm.

   LA VERSIÓN DE pdf.js VA CLAVADA Y ES LA MISMA DE pliego.js (hay una prueba
   que compara las dos): desde la v4 `pdfjs-dist` no publica build UMD y un
   `@latest` dejaría de definir `window.pdfjsLib` de golpe y en silencio.

   ESTE MÓDULO SOLO CABLEA LO QUE PASA DENTRO DE #onboarding. Quién ve qué
   pantalla al arrancar (onboarding / gate / app) lo decide app.js, que es el
   dueño de esas vistas; la única frontera compartida es localStorage
   (`detecta_perfil_rup`) y la redirección a `/?perfil=rup_…`.

   NINGUNA PULSACIÓN SIN RESPUESTA VISIBLE (la lección de app.js): el archivo
   que no es PDF avisa, el escaneado sin capa de texto explica qué hacer, y el
   muro del edge (Password Protection responde HTML) se diagnostica como lo
   que es — el parseo del JSON va APARTE del fetch.
   ========================================================================== */
"use strict";

(() => {
  /* la CANÓNICA del router (/api/admin?op=rup), no el alias
     /api/admin/rup-desde-pdf ni la histórica /api/admin/rup: los dos son
     rewrites de vercel.json y, si fallaran, el botón tiene que seguir funcionando */
  const CANONICA = "/api/admin?op=rup&origen=pdf";
  const CLAVE_PERFIL_RUP = "detecta_perfil_rup";
  // token integrado (decisión del dueño, ago 2026): la carga de experiencia
  // escribe configuración compartida y el servidor sigue exigiéndolo
  const TOKEN = "MiExtraccion2025";

  const PDFJS_VERSION = "3.11.174"; // misma que pliego.js — no «actualizar» sin build UMD
  const PDFJS_URL = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDFJS_VERSION}/pdf.min.js`;
  const PDFJS_WORKER = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDFJS_VERSION}/pdf.worker.min.js`;
  const MIN_CARACTERES_POR_PAGINA = 100; // por debajo parece escaneado (criterio POR PÁGINA, como pliego.js)

  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  /* ── EL TITULAR QUE MOTIVA (ago 2026) ──
     La primera pantalla no explica el programa: anima a licitar. Frases sobre
     lo público como bien común, la plata que se queda en el territorio y el
     derecho de la empresa pequeña a competir. La primera va también en el HTML
     (se ve sin JS); las demás rotan cada 7 s con un fundido, y la rotación se
     detiene en cuanto la landing deja de verse (nadie paga por lo que no mira).
     Sin emojis (regla del proyecto) y sin jerga: son frases, no cifras. */
  const FRASES_PORTADA = [
    "La obra pública es de todos. También de la empresa que la construye.",
    "Cada contrato que gana una empresa local es plata que se queda en el territorio.",
    "El Estado contrata billones cada año. Le toca a quien trabaja, no solo a quien ya tiene.",
    "Licitar no es privilegio de los grandes: es un derecho de quien sabe construir.",
    "Los datos son públicos. Que sirvan a quien pone la mano de obra.",
    "Hoy hay una licitación esperando a una empresa como la suya.",
  ];
  function rotarFrasePortada() {
    const h = document.getElementById("frase-portada");
    if (!h || FRASES_PORTADA.length < 2) return;
    let i = 0;
    const paso = () => {
      const landing = document.getElementById("onboarding");
      if (!landing || landing.classList.contains("hidden") || document.hidden) return; // se retoma en el próximo tic
      i = (i + 1) % FRASES_PORTADA.length;
      h.style.opacity = "0";
      setTimeout(() => { h.textContent = FRASES_PORTADA[i]; h.style.opacity = "1"; }, 450);
    };
    setInterval(paso, 7000);
  }
  rotarFrasePortada();
  const fmtCOP = new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 });

  function guardarPerfilRup(p) {
    try { localStorage.setItem(CLAVE_PERFIL_RUP, JSON.stringify(p)); return true; } catch { return false; }
  }

  /* ══════════ Mensajes y progreso ══════════ */
  function mensaje(html, tipo) {
    const caja = $("rup-mensaje");
    if (!html) return caja.classList.add("hidden");
    caja.className = "mt-6 w-full max-w-md rounded-xl px-4 py-3 text-left text-sm " + ({
      ok: "bg-emerald-50 text-emerald-800 ring-1 ring-inset ring-emerald-600/20",
      error: "bg-red-50 text-red-700 ring-1 ring-inset ring-red-600/20",
      aviso: "bg-amber-50 text-amber-800 ring-1 ring-inset ring-amber-600/20",
    }[tipo] || "bg-gray-50 text-gray-600 ring-1 ring-inset ring-gray-500/20");
    caja.innerHTML = html;
    caja.classList.remove("hidden");
  }
  function avisos(lista) {
    const ul = $("rup-avisos");
    if (!lista || !lista.length) return ul.classList.add("hidden");
    ul.innerHTML = lista.map((a) => `<li>• ${esc(a)}</li>`).join("");
    ul.classList.remove("hidden");
  }
  function progreso(pct, msg) {
    const caja = $("rup-progreso");
    if (pct == null) return caja.classList.add("hidden");
    caja.classList.remove("hidden");
    $("rup-barra").style.width = `${Math.max(0, Math.min(100, pct))}%`;
    if (msg) $("rup-progreso-msg").textContent = msg;
  }
  function ocupado(v) {
    $("btn-subir-rup").disabled = v;
    $("btn-subir-rup").classList.toggle("opacity-60", v);
  }

  /* ══════════ pdf.js (misma técnica que pliego.js) ══════════ */
  let pdfjsCargando = null;

  async function fijarWorker(lib) {
    /* el worker NO puede apuntar al CDN (`new Worker(url)` clásico no admite
       otro origen): se trae por fetch y se envuelve en un blob local */
    try {
      const r = await fetch(PDFJS_WORKER, { cache: "force-cache" });
      if (!r.ok) throw new Error(String(r.status));
      const blob = new Blob([await r.text()], { type: "application/javascript" });
      lib.GlobalWorkerOptions.workerSrc = URL.createObjectURL(blob);
      return "blob";
    } catch {
      try {
        lib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER;
        return "cdn";
      } catch {
        try { lib.GlobalWorkerOptions.workerSrc = ""; } catch { /* nada más que hacer */ }
        return "sin_worker";
      }
    }
  }

  function cargarPdfJs() {
    if (pdfjsCargando) return pdfjsCargando;
    pdfjsCargando = new Promise((resolve, reject) => {
      if (window.pdfjsLib) return resolve(window.pdfjsLib);
      const s = document.createElement("script");
      s.src = PDFJS_URL;
      s.async = true;
      s.onload = () => {
        if (!window.pdfjsLib) {
          return reject(new Error("pdf.js se cargó pero no expuso «pdfjsLib»: probablemente la versión del CDN ya no trae build UMD."));
        }
        resolve(window.pdfjsLib);
      };
      s.onerror = () => reject(new Error("No se pudo cargar pdf.js desde el CDN: sin él el PDF no se puede leer en el navegador. Revisá tu conexión y reintentá."));
      document.head.appendChild(s);
    }).then(async (lib) => {
      const modo = await fijarWorker(lib);
      if (modo === "sin_worker") {
        mensaje("pdf.js no pudo arrancar su worker: la lectura corre en el hilo principal y la pestaña se quedará quieta mientras trabaja. Es lento, no está roto.", "aviso");
      }
      return lib;
    }).catch((e) => { pdfjsCargando = null; throw e; });
    return pdfjsCargando;
  }

  /* Fragmentos de una página → líneas con las COLUMNAS separadas por TAB.
     Copia deliberada de pliego.js (dos páginas, dos IIFE): es la pieza de la
     que depende que lib/rup_pdf pueda leer tablas, no prosa aplanada. */
  function lineasDePagina(fragmentos) {
    const utiles = (fragmentos || []).filter((f) => f && typeof f.str === "string" && f.str.trim() !== ""
      && Array.isArray(f.transform) && f.transform.length >= 6);
    const ALTO_CUBETA = 3;
    const cubetas = new Map();
    const filas = [];
    for (const f of utiles) {
      const x = Number(f.transform[4]) || 0;
      const y = Number(f.transform[5]) || 0;
      const alto = Math.abs(Number(f.height) || Number(f.transform[3]) || 10) || 10;
      const tol = Math.max(alto * 0.5, 2);
      const base = Math.round(y / ALTO_CUBETA);
      let fila = null;
      for (const k of [base, base - 1, base + 1]) {
        const cand = cubetas.get(k);
        if (cand && Math.abs(cand.y - y) <= tol) { fila = cand; break; }
      }
      if (!fila) {
        fila = { y, alto, piezas: [] };
        filas.push(fila);
        cubetas.set(base, fila);
      }
      fila.alto = Math.max(fila.alto, alto);
      fila.piezas.push({ x, ancho: Math.abs(Number(f.width) || 0), texto: f.str });
    }
    filas.sort((a, b) => b.y - a.y);
    return filas.map((fila) => {
      fila.piezas.sort((a, b) => a.x - b.x);
      const umbralTab = Math.max(fila.alto * 1.0, 5);
      const umbralEspacio = Math.max(fila.alto * 0.18, 1);
      let salida = "";
      let previa = null;
      for (const p of fila.piezas) {
        if (previa) {
          const hueco = p.x - (previa.x + previa.ancho);
          if (hueco >= umbralTab) salida += "\t";
          else if (hueco >= umbralEspacio) salida += " ";
        }
        salida += p.texto;
        previa = p;
      }
      return salida.replace(/[ \t]+$/, "");
    }).filter((l) => l.trim() !== "").join("\n");
  }

  async function textoDelPdf(doc) {
    const trozos = [];
    for (let n = 1; n <= doc.numPages; n++) {
      progreso(5 + Math.round((n - 1) / doc.numPages * 60), `Leyendo página ${n} de ${doc.numPages}…`);
      await new Promise((r) => setTimeout(r, 0)); // ceder el hilo: la barra se repinta
      const pagina = await doc.getPage(n);
      const contenido = await pagina.getTextContent();
      const lineas = lineasDePagina(contenido.items);
      if (lineas) trozos.push(lineas);
    }
    return trozos.join("\n");
  }

  /* ══════════ Flujo principal · PUERTA DE ENTRADA DE 60 SEGUNDOS (Fase 2) ══════════
     Un solo destino en el servidor: POST /api/perfil?op=diagnostico (público).
     Tres caminos, y NINGUNO termina en una pantalla de error sin salida:
       1. PDF con capa de texto → pdf.js aquí → {texto}
       2. PDF escaneado, foto o ZIP de fotos → rasterizar/desempaquetar aquí →
          {imagenes_base64} → OCR en el servidor → CONFIRMAR lo leído
       3. Cualquier fallo → tres datos a mano → {manual}
     La respuesta trae el conteo, cinco licitaciones reales y el perfil creado;
     «Ver las N» abre el tablero con ese perfil. El documento no se guarda. */
  const ENTRADA = "/api/perfil?op=diagnostico";
  const MAX_PAGINAS_OCR = 6;     // las primeras páginas traen indicadores y códigos
  let ACTIVIDADES = null;

  async function enviarEntrada(cuerpoPeticion) {
    let r = null;
    try {
      r = await fetch(ENTRADA, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cuerpoPeticion),
      });
    } catch (e) {
      throw new Error(`No se pudo contactar el servidor: ${(e && e.message) || "sin conexión"}.`);
    }
    /* el parseo va APARTE del fetch: el muro del edge responde HTML y con
       los dos en el mismo try se diagnosticaría como «sin conexión» */
    let cuerpo = null;
    try { cuerpo = await r.json(); } catch {
      throw new Error(`El servidor respondió algo que no es JSON (${r.status}). Si el sitio tiene protección por contraseña, iniciá sesión y reintentá.`);
    }
    if (!r.ok || !cuerpo || !cuerpo.ok) {
      throw new Error((cuerpo && (cuerpo.error || (cuerpo.campos && cuerpo.campos.map((c) => c.error).join(" · ")))) || `El servidor respondió ${r.status}.`);
    }
    return cuerpo;
  }

  async function cargarActividades() {
    if (ACTIVIDADES) return ACTIVIDADES;
    try {
      const r = await fetch("/api/perfil?op=entrada", { cache: "no-store" });
      const j = await r.json();
      if (j && Array.isArray(j.actividades) && j.actividades.length) ACTIVIDADES = j.actividades;
    } catch { /* se pinta un selector con la opción de reintentar */ }
    return ACTIVIDADES;
  }

  function ocultarTodo() {
    for (const id of ["entrada-inicio", "completar-form", "manual-form", "resultado-entrada"]) {
      const el = $(id); if (el) el.classList.add("hidden");
    }
    progreso(null);
  }
  function mostrarInicio() { ocultarTodo(); $("entrada-inicio").classList.remove("hidden"); }

  /* ── camino 3 · tres datos ─────────────────────────────────────────────── */
  async function mostrarManual(motivo) {
    ocultarTodo();
    mensaje(null); avisos(null);
    const intro = $("manual-intro");
    intro.textContent = motivo
      ? `${motivo} Dígame tres datos y le muestro lo mismo en 30 segundos.`
      : "Dígame tres datos y le muestro a cuántas licitaciones puede presentarse hoy.";
    const sel = $("manual-actividad");
    const lista = await cargarActividades();
    sel.innerHTML = '<option value="">— Elija una —</option>'
      + (lista || []).map((a) => `<option value="${esc(a.id)}">${esc(a.etiqueta)}</option>`).join("");
    if (!lista) sel.innerHTML += '<option value="" disabled>No se pudo cargar la lista: revise su conexión y vuelva a abrir el formulario</option>';
    $("manual-form").classList.remove("hidden");
    $("manual-patrimonio").focus();
  }

  let enviando = false; // el submit y el click del botón no pueden mandar dos veces
  async function enviarManual(ev) {
    if (ev) ev.preventDefault();
    if (enviando) return;
    const patrimonio = Number($("manual-patrimonio").value);
    const mayor = Number($("manual-mayor").value);
    const actividad = $("manual-actividad").value;
    if (!(patrimonio > 0) || !(mayor > 0) || !actividad) {
      mensaje("Falta alguno de los tres datos (y un 0 no cuenta como dato).", "error");
      return;
    }
    enviando = true; ocupado(true); mensaje(null);
    try {
      progreso(40, "Buscando las licitaciones abiertas para su perfil…");
      const cuerpo = await enviarEntrada({ manual: { patrimonio, mayorContrato: mayor, unidad: $("manual-unidad").value === "salarios" ? "SMMLV" : "COP", actividad } });
      manejarRespuesta(cuerpo, null);
    } catch (e) {
      progreso(null);
      mensaje(esc((e && e.message) || "No se pudo completar. Intente de nuevo."), "error");
    } finally { enviando = false; ocupado(false); }
  }

  /* ── falta UN dato del certificado: se pide solo ese ───────────────────── */
  let contextoCompletar = null;   // { texto, origen, completar:{…} }
  function pedirCompletar(cuerpo, contexto) {
    ocultarTodo();
    const n = (cuerpo.necesita || [])[0];
    if (!n) return mostrarManual("Nos faltó un dato y no supimos cuál.");
    contextoCompletar = { ...contexto, campo: n.campo };
    const d = cuerpo.leido_detalle || {};
    $("completar-intro").innerHTML = `<strong>Leímos su certificado</strong>${d.nombre ? ` (${esc(d.nombre)})` : ""}: `
      + `${esc(d.codigos_unspsc ?? "varios")} tipos de obra inscritos. Solo falta un dato.`;
    $("completar-etiqueta").textContent = n.etiqueta || n.campo;
    $("completar-campo").value = "";
    $("completar-campo").placeholder = n.campo === "experiencia_smmlv" ? "En salarios mínimos (o pesos: lo convertimos)" : "Solo números, en pesos";
    $("completar-form").classList.remove("hidden");
    $("completar-campo").focus();
  }
  async function enviarCompletar(ev) {
    if (ev) ev.preventDefault();
    if (enviando) return;
    if (!contextoCompletar) return mostrarManual();
    let valor = Number($("completar-campo").value);
    if (!(valor > 0)) { mensaje("Escriba el dato: un 0 o un vacío no cuentan.", "error"); return; }
    // el contrato más grande se acepta en pesos: por encima de 100 000 no puede ser SMMLV
    if (contextoCompletar.campo === "experiencia_smmlv" && valor > 100000) valor = valor / SMMLV_2026;
    const completar = { ...(contextoCompletar.completar || {}), [contextoCompletar.campo]: valor };
    enviando = true; ocupado(true); mensaje(null);
    try {
      progreso(60, "Buscando las licitaciones abiertas para su perfil…");
      const cuerpo = await enviarEntrada({ texto: contextoCompletar.texto, origen: contextoCompletar.origen, completar });
      manejarRespuesta(cuerpo, { ...contextoCompletar, completar });
    } catch (e) {
      progreso(null);
      mensaje(esc((e && e.message) || "No se pudo completar. Intente de nuevo."), "error");
    } finally { enviando = false; ocupado(false); }
  }
  const SMMLV_2026 = 1750905; // solo para aceptar el contrato mayor en pesos en la casilla de salarios mínimos

  /* ── OCR: confirmar lo leído antes de crear nada ───────────────────────── */
  function pedirConfirmacionOcr(cuerpo) {
    ocultarTodo();
    const d = cuerpo.leido_detalle || {};
    mensaje(
      `<p><strong>Leímos su documento con reconocimiento de imágenes</strong>, que se equivoca a veces. Revise:</p>`
      + `<ul class="mt-2 list-disc pl-5">`
      + `<li>${esc(d.codigos_unspsc ?? 0)} tipos de obra inscritos</li>`
      + `<li>Patrimonio: ${d.patrimonio ? esc(fmtCOP.format(d.patrimonio)) : "no se leyó (lo pediremos)"}</li>`
      + `<li>Contrato más grande: ${d.experiencia_smmlv ? `${esc(d.experiencia_smmlv)} salarios mínimos` : "no se leyó (lo pediremos)"}</li>`
      + `</ul>`
      + `<div class="mt-3 flex flex-wrap gap-2">`
      + `<button id="btn-ocr-confirmar" type="button" class="btn-vidrio-acento">Está bien, ver mis licitaciones</button>`
      + `<button id="btn-ocr-manual" type="button" class="enlace-discreto underline decoration-dotted text-sm">Prefiero escribir tres datos</button>`
      + `</div>`, "ok",
    );
    $("btn-ocr-confirmar").addEventListener("click", async () => {
      ocupado(true);
      try {
        progreso(70, "Buscando las licitaciones abiertas para su perfil…");
        const r2 = await enviarEntrada({ texto: cuerpo.texto_ocr, origen: "ocr" });
        manejarRespuesta(r2, { texto: cuerpo.texto_ocr, origen: "ocr" });
      } catch (e) {
        progreso(null);
        mostrarManual("No se pudo continuar con lo leído.");
      } finally { ocupado(false); }
    });
    $("btn-ocr-manual").addEventListener("click", () => mostrarManual());
  }

  /* ── el despacho único de las respuestas del servidor ─────────────────── */
  function manejarRespuesta(cuerpo, contexto) {
    if (cuerpo.perfil_id && cuerpo.oportunidades) return pintarResultado(cuerpo);
    if (cuerpo.siguiente === "completar") return pedirCompletar(cuerpo, contexto || {});
    if (cuerpo.siguiente === "confirmar" && cuerpo.texto_ocr) return pedirConfirmacionOcr(cuerpo);
    // "manual", leido:false, ocr no disponible… — todo lo demás desemboca en los tres datos
    return mostrarManual(cuerpo.mensaje || "No pudimos leer su documento automáticamente.");
  }

  /* ── pantalla 2 · resultado ─────────────────────────────────────────────── */
  const fmtMillones = (n) => {
    if (!Number.isFinite(n) || n <= 0) return null;
    const m = n / 1e6;
    return m >= 1000 ? `${(m / 1000).toLocaleString("es-CO", { maximumFractionDigits: 1 })} mil millones` : `${Math.round(m).toLocaleString("es-CO")} millones`;
  };
  function pintarResultado(cuerpo) {
    ocultarTodo();
    mensaje(null);
    const o = cuerpo.oportunidades;
    const n = o.total;
    guardarPerfilRup({ id: cuerpo.perfil_id, nombre: (cuerpo.perfil && cuerpo.perfil.nombre) || "" });

    /* EN CIFRAS, no en frases (encargo del dueño, ago 2026): tres números
       grandes —cuántas, cuánto dinero, cuántas cierran esta semana— y debajo
       las que cierran antes. `agregados` viene del mismo conteo (contarOportunidades);
       si faltara (respuesta vieja en caché) solo se pintan las dos primeras. */
    const ag = o.agregados || null;
    const cifra = (v, r) => `<div><p class="text-[28px] font-semibold tracking-tight sm:text-[36px]" style="color: var(--text-primary); letter-spacing: -1px;">${esc(v)}</p><p class="text-[11px] uppercase tracking-wide" style="color: var(--text-secondary);">${esc(r)}</p></div>`;
    const nombre = (cuerpo.perfil && cuerpo.perfil.nombre) || "";
    $("res-total").textContent = n === 0
      ? `${nombre ? `Para ${nombre}, hoy` : "Hoy"} no hay licitaciones abiertas que encajen con este perfil.`
      : `${nombre ? `Para ${nombre}, hoy` : "Para su empresa, hoy"}:`;
    const cifras = $("res-cifras");
    if (cifras) {
      cifras.innerHTML = n === 0 ? "" : [
        cifra(n.toLocaleString("es-CO"), n === 1 ? "licitación a la que puede presentarse" : "licitaciones a las que puede presentarse"),
        cifra(o.valorTotal ? `$${fmtMillones(o.valorTotal)}` : "Sin referencia", "en juego"),
        ag && ag.cierranEstaSemana ? cifra(ag.cierranEstaSemana.n.toLocaleString("es-CO"), ag.cierranEstaSemana.n === 1 ? "cierra esta semana" : "cierran esta semana") : "",
      ].join("");
      cifras.classList.toggle("hidden", n === 0);
    }
    $("res-valor").textContent = n > 0 && !o.valorTotal ? "Varias no publican presupuesto." : "";
    $("res-sobra").textContent = n > 0
      ? (o.conCapacidadSuficiente > 0 ? `En ${o.conCapacidadSuficiente} le sobra capacidad.` : "")
      : (o.corpus_vacio ? "Todavía no hay licitaciones cargadas en el sistema." : "Con el RUP a mano la lista puede cambiar.");

    const ul = $("res-muestra");
    ul.innerHTML = (o.muestra || []).map((m) => `
      <li class="rounded-xl px-4 py-3 text-sm" style="background: var(--bg-inset); color: var(--text-primary);">
        <p class="font-medium">${esc(m.entidad || "Entidad sin nombre")}</p>
        <p class="mt-0.5 text-xs" style="color: var(--text-secondary);">${esc(m.objeto || "")}</p>
        <p class="mt-1 text-xs" style="color: var(--text-secondary);">
          ${m.valor ? esc(fmtCOP.format(m.valor)) : "Presupuesto no publicado"}
          ${m.diasRestantes == null ? "" : ` · cierra ${m.diasRestantes === 0 ? "hoy" : m.diasRestantes === 1 ? "mañana" : `en ${m.diasRestantes} días`}`}
        </p>
      </li>`).join("");

    const btn = $("btn-ver-todas");
    btn.textContent = n > 0 ? `Ver las ${n.toLocaleString("es-CO")}` : "Entrar de todos modos";
    btn.onclick = () => {
      /* Si llegó desde la portada con un filtro en la URL («Ver los 47»,
         una entidad, un departamento), el filtro VIAJA al tablero: la lista
         se abre ya filtrada. Sin filtro, igual que siempre. */
      let destino = cuerpo.url_dashboard || `/?perfil=${cuerpo.perfil_id}`;
      try {
        const u = new URL(destino, window.location.origin);
        for (const [k, v] of new URLSearchParams(window.location.search)) {
          if (k !== "perfil" && !u.searchParams.has(k)) u.searchParams.set(k, v);
        }
        if (!u.hash) u.hash = "#/licitaciones";
        destino = u.pathname + u.search + u.hash;
      } catch { /* URL rara: se va sin filtro */ }
      window.location.href = destino;
    };

    const origen = { texto: "Perfil leído de su RUP", ocr: "Perfil leído con reconocimiento de imágenes (confírmelo)", manual: "Perfil aproximado con tres datos" }[cuerpo.origen] || `Perfil ${cuerpo.origen}`;
    $("res-nota").textContent = `${origen}. El documento no se guardó; el perfil caduca en 45 días.`
      + (cuerpo.camposNoLeidos && cuerpo.camposNoLeidos.length && cuerpo.origen !== "manual" ? " Falta algún indicador financiero: la capacidad queda «sin dato» hasta que lo cargue en Mi empresa." : "");
    avisos(null);
    $("resultado-entrada").classList.remove("hidden");
    progreso(null);
  }

  /* ── camino 1 y 2 · el archivo ──────────────────────────────────────────── */
  async function rasterizarPaginas(doc, max) {
    const salida = [];
    const tope = Math.min(doc.numPages, max);
    for (let n = 1; n <= tope; n++) {
      progreso(20 + Math.round((n - 1) / tope * 40), `Preparando página ${n} de ${tope} para reconocerla…`);
      const pagina = await doc.getPage(n);
      const vista = pagina.getViewport({ scale: 1.6 });
      const lienzo = document.createElement("canvas");
      lienzo.width = Math.round(vista.width); lienzo.height = Math.round(vista.height);
      await pagina.render({ canvasContext: lienzo.getContext("2d"), viewport: vista }).promise;
      const url = lienzo.toDataURL("image/jpeg", 0.8);
      salida.push({ base64: url.split(",")[1], mime: "image/jpeg" });
    }
    return salida;
  }
  const aBase64 = (u8) => {
    let s = ""; const paso = 0x8000;
    for (let i = 0; i < u8.length; i += paso) s += String.fromCharCode.apply(null, u8.subarray(i, i + paso));
    return btoa(s);
  };
  async function imagenesDeZip(archivo) {
    if (!window.XLSXLectura || !window.XLSXLectura.leerZip) throw new Error("no hay lector ZIP");
    const zip = window.XLSXLectura.leerZip(new Uint8Array(await archivo.arrayBuffer()));
    const inflar = typeof DecompressionStream === "function"
      ? async (crudo) => new Uint8Array(await new Response(new Blob([crudo]).stream().pipeThrough(new DecompressionStream("deflate-raw"))).arrayBuffer())
      : null;
    const fotos = zip.entradas.filter((e) => /\.(jpe?g|png)$/i.test(e.nombre)).slice(0, MAX_PAGINAS_OCR);
    const salida = [];
    for (const e of fotos) {
      const bytes = await zip.extraer(e.nombre, inflar);
      salida.push({ base64: aBase64(bytes), mime: /png$/i.test(e.nombre) ? "image/png" : "image/jpeg" });
    }
    return salida;
  }

  async function procesarArchivo(archivo) {
    mensaje(null); avisos(null);
    ocupado(true);
    let contexto = null;
    try {
      const nombre = archivo.name || "";
      const esPdf = /\.pdf$/i.test(nombre) || archivo.type === "application/pdf";
      const esImagen = /\.(jpe?g|png)$/i.test(nombre) || /^image\/(jpeg|png)$/.test(archivo.type);
      const esZip = /\.zip$/i.test(nombre) || /zip/.test(archivo.type);
      let imagenes = null;

      if (esPdf) {
        progreso(2, "Abriendo el PDF…");
        const pdfjs = await cargarPdfJs();
        const datos = new Uint8Array(await archivo.arrayBuffer());
        let doc = null;
        try {
          doc = await pdfjs.getDocument({ data: datos, isEvalSupported: false }).promise;
        } catch (e) {
          const m = String((e && e.message) || e);
          throw new Error(/password/i.test(m) ? "El PDF está protegido con contraseña." : "El PDF no se pudo abrir.");
        }
        if (!doc.numPages) throw new Error("El PDF no tiene páginas.");
        const texto = await textoDelPdf(doc);
        const porPagina = texto.trim().length / doc.numPages;
        if (porPagina >= MIN_CARACTERES_POR_PAGINA) {
          progreso(75, "Buscando las licitaciones abiertas para su perfil…");
          contexto = { texto, origen: "texto" };
          const cuerpo = await enviarEntrada({ texto });
          return manejarRespuesta(cuerpo, contexto);
        }
        // escaneado: rasterizar y mandar a reconocer (camino 2)
        imagenes = await rasterizarPaginas(doc, MAX_PAGINAS_OCR);
      } else if (esImagen) {
        progreso(20, "Preparando la imagen…");
        imagenes = [{ base64: aBase64(new Uint8Array(await archivo.arrayBuffer())), mime: /png/i.test(archivo.type || nombre) ? "image/png" : "image/jpeg" }];
      } else if (esZip) {
        progreso(20, "Abriendo el ZIP…");
        imagenes = await imagenesDeZip(archivo);
        if (!imagenes.length) throw new Error("El ZIP no trae imágenes JPG o PNG.");
      } else {
        throw new Error("El archivo no es un PDF, una imagen ni un ZIP.");
      }

      progreso(65, "Reconociendo el documento (puede tardar un poco)…");
      const cuerpo = await enviarEntrada({ imagenes_base64: imagenes });
      return manejarRespuesta(cuerpo, { origen: "ocr" });
    } catch (e) {
      /* NUNCA una pantalla de error sin salida: lo que haya pasado desemboca en
         los tres datos, con el motivo en una línea. */
      progreso(null);
      return mostrarManual(`No pudimos leer su documento automáticamente (${(e && e.message) || "error desconocido"}).`);
    } finally {
      ocupado(false);
      $("rup-archivo").value = ""; // volver a elegir el mismo archivo debe re-disparar `change`
    }
  }

  $("btn-subir-rup").addEventListener("click", () => $("rup-archivo").click());
  $("rup-archivo").addEventListener("change", () => {
    const archivo = $("rup-archivo").files && $("rup-archivo").files[0];
    if (archivo) procesarArchivo(archivo);
  });
  $("btn-manual").addEventListener("click", () => mostrarManual());
  $("manual-form").addEventListener("submit", enviarManual);
  $("btn-manual-enviar").addEventListener("click", enviarManual);
  $("completar-form").addEventListener("submit", enviarCompletar);
  $("btn-completar-enviar").addEventListener("click", enviarCompletar);

  /* ══════════ Acceso con clave (perfiles existentes) ══════════ */
  $("btn-ir-gate").addEventListener("click", () => {
    $("onboarding").classList.add("hidden");
    const gate = $("gate");
    gate.classList.remove("hidden");
    gate.classList.add("flex");
    gate.style.display = "flex"; // hidden/flex declaran display: el inline decide (lección del modal)
    const clave = $("gate-clave");
    if (clave) clave.focus();
  });

  /* ══════════ Experiencia laboral OPCIONAL (CSV → JSON) ══════════
     El CSV es la comodidad; el endpoint sigue siendo el de siempre
     (POST /api/admin/experiencia, JSON {contratos}) y exige el token porque
     escribe configuración COMPARTIDA. La conversión corre aquí. */
  const COLUMNAS_OBLIGATORIAS = ["objeto", "valor_cop", "fecha_inicio", "fecha_fin", "entidad"];

  function parsearCsv(crudo) {
    const texto = String(crudo || "").replace(/^\uFEFF/, ""); // BOM del Excel
    const primeraUtil = texto.split(/\r\n|\r|\n/).find((l) => l.trim() && !l.trim().startsWith("#")) || "";
    // separador auto: el Excel colombiano exporta con «;» tan a menudo como con «,»
    const sep = primeraUtil.split(";").length > primeraUtil.split(",").length ? ";" : ",";
    const filas = [];
    let fila = [], celda = "", enComillas = false;
    const cerrarCelda = () => { fila.push(celda); celda = ""; };
    const cerrarFila = () => {
      cerrarCelda();
      const completa = fila;
      fila = [];
      const primera = String(completa[0] || "").trim();
      if (completa.length === 1 && !primera) return;   // línea vacía
      if (primera.startsWith("#")) return;             // comentario del formato
      filas.push(completa);
    };
    for (let i = 0; i < texto.length; i++) {
      const c = texto[i];
      if (enComillas) {
        if (c === '"') {
          if (texto[i + 1] === '"') { celda += '"'; i++; } else enComillas = false;
        } else celda += c;
      } else if (c === '"' && celda === "") {
        /* una comilla solo ABRE si la celda empieza ahí (RFC 4180). A mitad de
           celda es texto — «Tubería de 4" en PVC» — y tratarla como apertura se
           tragaba separadores y fusionaba filas enteras en un contrato falso */
        enComillas = true;
      } else if (c === sep) cerrarCelda();
      else if (c === "\n") cerrarFila();
      else if (c !== "\r") celda += c;
    }
    if (celda !== "" || fila.length) cerrarFila();
    return filas;
  }

  function csvAContratos(filas) {
    if (!filas.length) return { error: "El CSV está vacío." };
    const cabecera = filas[0].map((c) => String(c || "").trim().toLowerCase());
    for (const col of COLUMNAS_OBLIGATORIAS) {
      if (!cabecera.includes(col)) {
        return { error: `Falta la columna «${col}» en la cabecera del CSV. Descargá el formato de ejemplo y respetá los nombres de las columnas.` };
      }
    }
    const idx = {};
    cabecera.forEach((c, i) => { if (!(c in idx)) idx[c] = i; });
    const contratos = [];
    for (const f of filas.slice(1)) {
      const v = (col) => (idx[col] == null ? "" : String(f[idx[col]] == null ? "" : f[idx[col]]).trim());
      const c = {
        objeto: v("objeto"),
        valor_cop: v("valor_cop"),   // como CADENA: el servidor entiende «350.000.000»
        fecha_inicio: v("fecha_inicio"),
        fecha_fin: v("fecha_fin"),
        entidad: v("entidad"),
      };
      const u = v("unspsc");
      if (u) c.unspsc = u;           // opcional: solo viaja si viene
      if (c.objeto || c.entidad || c.valor_cop) contratos.push(c);
    }
    if (!contratos.length) return { error: "El CSV no trae ninguna fila de contrato debajo de la cabecera." };
    return { contratos };
  }

  function mensajeExp(texto, tipo) {
    const p = $("exp-mensaje");
    if (!texto) return p.classList.add("hidden");
    p.className = "mt-3 rounded-lg px-3 py-2 text-xs " + ({
      ok: "bg-emerald-50 text-emerald-800",
      error: "bg-red-50 text-red-700",
    }[tipo] || "bg-gray-50 text-gray-600");
    p.textContent = texto;
    p.classList.remove("hidden");
  }

  $("btn-exp-cargar").addEventListener("click", async () => {
    mensajeExp(null);
    const archivo = $("exp-archivo").files && $("exp-archivo").files[0];
    if (!archivo) return mensajeExp("Elegí primero el archivo CSV (podés partir del formato de ejemplo).", "error");
    const token = TOKEN;

    let convertido = null;
    try {
      /* Excel-Windows guarda «CSV» en ANSI (windows-1252): decodificarlo como
         UTF-8 mete � en cada tilde y el mojibake se guardaría sin aviso. Si la
         decodificación UTF-8 produce reemplazos, se reintenta como 1252. */
      const bytes = await archivo.arrayBuffer();
      let textoCsv = new TextDecoder("utf-8").decode(bytes);
      if (textoCsv.includes("�")) textoCsv = new TextDecoder("windows-1252").decode(bytes);
      convertido = csvAContratos(parsearCsv(textoCsv));
    } catch (e) { return mensajeExp(`No se pudo leer el CSV: ${(e && e.message) || "error desconocido"}.`, "error"); }
    if (convertido.error) return mensajeExp(convertido.error, "error");

    let r = null, cuerpo = null;
    try {
      r = await fetch("/api/admin?op=experiencia", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-historico-token": token },
        body: JSON.stringify({ contratos: convertido.contratos }),
      });
    } catch (e) {
      return mensajeExp(`No se pudo contactar el servidor: ${(e && e.message) || "sin conexión"}.`, "error");
    }
    try { cuerpo = await r.json(); } catch {
      return mensajeExp(`El servidor respondió algo que no es JSON (${r.status}). Si el sitio tiene protección por contraseña, iniciá sesión y reintentá.`, "error");
    }
    if (r.status === 401) {
      return mensajeExp("La aplicación no pudo autenticarse con el servidor. No es un problema tuyo: es configuración "
        + "del sitio — avisale a quien lo administra (HISTORICO_TOKEN no coincide con el token integrado).", "error");
    }
    if (!r.ok || !cuerpo.ok) {
      const detalle = cuerpo && cuerpo.errores && cuerpo.errores.length
        ? ` Primer error: ${cuerpo.errores[0].campo} — ${cuerpo.errores[0].error}.` : "";
      return mensajeExp(((cuerpo && cuerpo.error) || `Error del servidor (${r.status}).`) + detalle, "error");
    }
    mensajeExp(`Experiencia cargada: ${cuerpo.contratos_cargados} contratos, ${cuerpo.terminos_extraidos} términos extraídos. Se usará para afinar las recomendaciones.`, "ok");
  });

  /* ══════════ Arranque ══════════
     Nada corre solo: este módulo únicamente cablea sus controles. Qué vista se
     enseña al cargar la página lo decide app.js (dueño de #gate y #app). */
})();
