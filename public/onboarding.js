/* ============================================================================
   Detecta · Onboarding — subir el RUP en PDF y salir con un perfil andando
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

  /* ══════════ Flujo principal: PDF → perfil → dashboard ══════════ */
  /* Un solo camino de envío, usado por la primera carga y por el reintento con
     los datos tecleados: dos rutas se desincronizan a la primera corrección. */
  async function enviarRup(texto, nombreArchivo, completar) {
    let r = null;
    try {
      r = await fetch(CANONICA, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          texto_extraido: texto,
          nombre_archivo: nombreArchivo,
          // se reenvía el TEXTO, no el perfil: el cliente solo puede mover las
          // casillas que el servidor declaró faltantes (es la única escritura
          // sin token del proyecto)
          completar: completar || undefined,
        }),
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
      avisos((cuerpo && cuerpo.advertencias) || null);
      throw new Error((cuerpo && cuerpo.error) || `El servidor respondió ${r.status}.`);
    }
    return cuerpo;
  }

  /* El formulario de los datos que el certificado no trae. Se pinta DENTRO del
     cuadro de mensaje —no hay nodo nuevo en el HTML, así que no puede quedar
     una referencia a un id que no existe— y en tono de «ya casi», no de error:
     el certificado es válido y se leyó bien; solo faltan una o dos cifras que
     ese formato no imprime. */
  function pedirDatosFaltantes(texto, nombreArchivo, cuerpo) {
    const faltan = cuerpo.faltan || [];
    const leido = cuerpo.leido || {};
    const campos = faltan.map((f, i) => `
      <label class="mt-3 block">
        <span class="block text-sm font-medium">${esc(f.etiqueta)}</span>
        <span class="block text-xs opacity-70">${esc(f.donde)}</span>
        <input id="rup-falta-${i}" data-campo="${esc(f.campo)}" type="number" step="any" min="0"
               class="mt-1 w-full max-w-xs rounded-lg border border-gray-300 px-3 py-2 text-sm"
               placeholder="Escribí el valor">
      </label>`).join("");

    mensaje(
      `<strong>Leímos tu certificado.</strong> `
      + (leido.nombre ? `${esc(leido.nombre)} · ` : "")
      + `${esc(leido.codigos_unspsc || 0)} códigos UNSPSC reconocidos.`
      + `<p class="mt-2">Este formato de certificado no imprime `
      + `${faltan.length === 1 ? "un dato" : `${faltan.length} datos`}. `
      + `Escribilo${faltan.length === 1 ? "" : "s"} una vez y queda${faltan.length === 1 ? "" : "n"} guardado`
      + `${faltan.length === 1 ? "" : "s"} en tu perfil.</p>`
      + `<form id="rup-completar">${campos}
           <button type="submit" class="mt-4 rounded-xl bg-gray-900 px-5 py-2.5 text-sm font-medium text-white">
             Continuar
           </button>
           <span id="rup-completar-aviso" class="ml-3 text-xs"></span>
         </form>`,
      "aviso",
    );
    avisos(cuerpo.advertencias);

    const form = document.getElementById("rup-completar");
    if (!form) return;
    form.addEventListener("submit", async (ev) => {
      ev.preventDefault();
      const aviso = document.getElementById("rup-completar-aviso");
      const completar = {};
      let faltaAlguno = false;
      faltan.forEach((f, i) => {
        const el = document.getElementById(`rup-falta-${i}`);
        const n = el && el.value.trim() === "" ? null : Number(el.value);
        // vacío o 0 = SIN DATO, jamás «vale cero»: un patrimonio 0 calcularía
        // una capacidad de contratación de cero y cerraría puertas de verdad
        if (n == null || !Number.isFinite(n) || n <= 0) { faltaAlguno = true; return; }
        completar[f.campo] = n;
      });
      if (faltaAlguno) {
        if (aviso) { aviso.textContent = "Faltan casillas por llenar (un 0 no es un dato)."; aviso.className = "ml-3 text-xs text-red-600"; }
        return;
      }
      if (aviso) { aviso.textContent = "Guardando…"; aviso.className = "ml-3 text-xs opacity-70"; }
      ocupado(true);
      try {
        const c2 = await enviarRup(texto, nombreArchivo, completar);
        if (c2.completo === false) return pedirDatosFaltantes(texto, nombreArchivo, c2);
        finalizarRup(c2);
      } catch (e) {
        mensaje(esc((e && e.message) || "No se pudo guardar."), "error");
      } finally {
        ocupado(false);
      }
    });
  }

  /* Cierre común: lo hace la carga directa y el reintento tras completar. */
  function finalizarRup(cuerpo) {
    progreso(100, "Perfil creado.");
    const nombre = (cuerpo.resumen && cuerpo.resumen.nombre) || "";
    guardarPerfilRup({ id: cuerpo.perfil_id, nombre });
    const destino = cuerpo.url_dashboard || `/?perfil=${cuerpo.perfil_id}`;
    const vig = cuerpo.vigencia || {};
    mensaje(
      `<strong>Listo.</strong> Se leyeron <strong>${esc(cuerpo.unspsc_count)}</strong> códigos UNSPSC de tu RUP`
      + (nombre ? ` (${esc(nombre)})` : "")
      + `. Capacidad de contratación estimada: <strong>${esc(fmtCOP.format(cuerpo.k))}</strong>.`
      + (vig.fecha_renovacion ? ` Última renovación: ${esc(vig.fecha_renovacion)}.` : "")
      + " Abriendo tu tablero…",
      "ok",
    );
    avisos(cuerpo.advertencias);
    setTimeout(() => { window.location.href = destino; }, 1800);
  }

  async function procesarRup(archivo) {
    mensaje(null); avisos(null);
    ocupado(true);
    try {
      if (!/\.pdf$/i.test(archivo.name || "") && archivo.type !== "application/pdf") {
        throw new Error("El archivo no parece un PDF. Subí el certificado RUP tal como lo descargaste de la Cámara de Comercio.");
      }
      progreso(2, "Abriendo el PDF…");
      const pdfjs = await cargarPdfJs();
      const datos = new Uint8Array(await archivo.arrayBuffer());
      let doc = null;
      try {
        doc = await pdfjs.getDocument({ data: datos, isEvalSupported: false }).promise;
      } catch (e) {
        const m = String((e && e.message) || e);
        if (/password/i.test(m)) throw new Error("El PDF está protegido con contraseña: quitale la protección y volvé a subirlo.");
        throw new Error(`El PDF no se pudo abrir: puede estar corrupto o no ser un PDF. (${m})`);
      }
      if (!doc.numPages) throw new Error("El PDF no tiene páginas.");

      const texto = await textoDelPdf(doc);
      const porPagina = texto.trim().length / doc.numPages;
      if (porPagina < MIN_CARACTERES_POR_PAGINA) {
        progreso(null);
        throw new Error(`El PDF casi no tiene capa de texto (${Math.round(porPagina)} caracteres por página): parece un escaneo. `
          + "Descargá el certificado RUP en PDF directamente del portal de la Cámara de Comercio (RUES) — ese siempre trae texto — y volvé a intentarlo.");
      }

      progreso(75, "Armando tu perfil…");
      const cuerpo = await enviarRup(texto, archivo.name || null, null);

      /* ═══ FALTAN DATOS ≠ CERTIFICADO INVÁLIDO ══════════════════════════════
         El RUP de una PERSONA NATURAL sale de la Cámara con el mismo formato
         que el de una sociedad pero sin «Utilidad operacional»: quien no lleva
         libros no la reporta. Eso rechazaba el certificado ENTERO y echaba a la
         persona en la primera pantalla — el peor sitio posible para un «no».
         Ahora el servidor devuelve lo que leyó y pide SOLO lo que falta, aquí
         se pintan esas casillas, y al enviarlas se reintenta con el MISMO
         texto. Se teclea una vez y queda guardado en el perfil. */
      if (cuerpo.completo === false) {
        progreso(null);
        return pedirDatosFaltantes(texto, archivo.name || null, cuerpo);
      }

      finalizarRup(cuerpo);
    } catch (e) {
      progreso(null);
      mensaje(esc((e && e.message) || "Error desconocido al leer el RUP."), "error");
    } finally {
      ocupado(false);
      $("rup-archivo").value = ""; // volver a elegir el mismo archivo debe re-disparar `change`
    }
  }

  $("btn-subir-rup").addEventListener("click", () => $("rup-archivo").click());
  $("rup-archivo").addEventListener("change", () => {
    const archivo = $("rup-archivo").files && $("rup-archivo").files[0];
    if (archivo) procesarRup(archivo);
  });

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
