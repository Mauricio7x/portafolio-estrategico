/* ============================================================================
   Detekta · APU — lectura del formulario de cantidades de un pliego
   ----------------------------------------------------------------------------
   EL PDF SE LEE AQUÍ, EN EL NAVEGADOR. `pdfjs-dist` en Node pesa decenas de MB y
   hay que sacarlo del request path; el OCR «no cabe en el mismo proceso»
   (docs/APU_INFORME_COMPLETO.md §1.G.3). El navegador ya tiene un motor de PDF y
   tiempo de sobra, así que hace la parte cara y al servidor solo le manda TEXTO.
   Es la misma decisión que llevó el encadenado de la full a /admin.html: poner el
   trabajo donde hay recursos, no donde queda más elegante en el diagrama.

   CÓMO SE CONSERVAN LAS COLUMNAS, que es lo único que de verdad importa.
   `getTextContent()` devuelve fragmentos con su matriz de transformación, así que
   cada uno tiene coordenada X e Y. Se agrupa por Y (tolerancia ≈ ½ altura de
   línea) para formar la FILA y se mira el HUECO en X entre fragmento y fragmento
   para decidir el separador: hueco grande → TABULADOR (cambio de columna), hueco
   pequeño → espacio. `lib/apu_pliego.dividirCeldas` lee esos tabuladores. Si en
   vez de esto se mandara `str` concatenado, las columnas se perderían y el parseo
   dependería de heurísticas de último recurso.

   pdf.js SE CARGA CUANDO SE NECESITA, no al abrir la página: son ~1 MB de CDN y
   el dueño puede entrar solo a mirar lo que ya extrajo. Si el CDN no responde, se
   dice con esas palabras en vez de dejar un botón muerto.

   TRES VÍAS DE ENTRADA, y las tres acaban en el mismo endpoint:
     · archivo PDF        → pdf.js → texto
     · URL del PDF        → /api/apu/descargar (el navegador no puede: CORS) → pdf.js
     · PDF escaneado      → pdf.js no saca texto → se rasteriza cada página a JPEG
                            y se manda a OCR (/api/apu/extraer-texto lo reenvía a
                            OCR.space con la clave del servidor)

   NINGUNA PULSACIÓN SE QUEDA SIN RESPUESTA VISIBLE — lección que ya costó cara en
   app.js: el token vacío AVISA en vez de hacer `return` a secas, el formulario va
   cableado al `submit`, y `sessionStorage` se lee y se escribe dentro de `try`
   porque en modo restringido lanza.
   ========================================================================== */
"use strict";

(() => {
  /* token integrado: la misma constante de app.js (decisión del dueño, ago
     2026 — la capa de seguridad real es Vercel Password Protection) */
  const TOKEN = "MiExtraccion2025";
  // el mismo texto que app.js: el 401 se explica como lo que es, en lenguaje
  // de personas primero y con el dato del administrador entre paréntesis
  const MSG_401 = "La aplicación no pudo autenticarse con el servidor. No es un problema suyo: es configuración "
    + "del sitio — avise a quien lo administra (HISTORICO_TOKEN no coincide con el token integrado).";
  const leerToken = () => TOKEN;

  /* pdf.js desde CDN, con la versión CLAVADA y por un motivo que no es
     cosmético: **desde la v4, `pdfjs-dist` ya no publica build UMD** — es ESM
     puro (`.mjs`), incluido `legacy/build/`. La 3.11.174 es la última que expone
     `window.pdfjsLib` con un `<script src>` clásico, que es lo que encaja con el
     patrón de IIFE de este proyecto. Un `@latest` rompería la carga de golpe y
     en silencio, así que la versión va en una constante y no se «actualiza»
     sin comprobar antes que siga existiendo un build UMD. */
  const PDFJS_VERSION = "3.11.174";
  const PDFJS_URL = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDFJS_VERSION}/pdf.min.js`;
  const PDFJS_WORKER = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDFJS_VERSION}/pdf.worker.min.js`;

  const MAX_PAGINAS_OCR = 5;              // el servidor topa igual: ver lib/apu_ocr
  const TOPE_BYTES_PAGINA = 1000 * 1024;  // margen bajo el ~1 MB del plan gratuito
  const MIN_TEXTO_UTIL = 40;              // suelo absoluto: por debajo no hay tabla que buscar
  /* Un PDF escaneado devuelve `items: []` por página. Pero un escaneo con
     cabecera vectorial devuelve unos pocos caracteres por página y pasaría el
     suelo absoluto, así que el criterio de verdad es POR PÁGINA. Y el diagnóstico
     que se muestra dice «parece escaneado», nunca «el pliego está vacío»:
     ausencia de capa de texto es SIN DATO, no un documento sin contenido — el
     mismo error de categoría que `anticipo_pct = 0`. */
  const MIN_CARACTERES_POR_PAGINA = 100;

  const $ = (id) => document.getElementById(id);
  const fmt = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 2 });
  const fmtCOP = new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 });
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  /* El gate y el formulario del token murieron con la página unificada: el
     gate es UNO y vive en app.js; el token va integrado y se inyecta en cada
     petición. Este módulo solo cablea su sección dentro de la pestaña APU. */

  /* ══════════ Mensajes, chip y progreso ══════════ */
  function mensaje(texto, tipo) {
    const p = $("pliego-mensaje");
    if (!texto) return p.classList.add("hidden");
    p.className = "mt-5 rounded-xl px-4 py-3 text-sm " + ({
      ok: "bg-green-50 text-green-800 ring-1 ring-inset ring-green-600/20",
      error: "bg-red-50 text-red-700 ring-1 ring-inset ring-red-600/20",
      aviso: "bg-amber-50 text-amber-800 ring-1 ring-inset ring-amber-600/20",
    }[tipo] || "bg-gray-50 text-gray-600 ring-1 ring-inset ring-gray-500/20");
    p.textContent = texto;
    p.classList.remove("hidden");
  }
  function avisos(lista) {
    const ul = $("pliego-avisos");
    if (!lista || !lista.length) return ul.classList.add("hidden");
    ul.classList.remove("hidden");
    ul.innerHTML = lista.map((a) => `<li>• ${esc(a)}</li>`).join("");
  }
  function chip(texto, { girando = false } = {}) {
    $("pl-chip-texto").textContent = texto;
    $("pl-chip-icono").textContent = girando ? "◔" : "•";
    $("pl-chip-icono").className = girando ? "spin inline-block" : "inline-block";
  }
  function progreso(hecho, total, etiqueta) {
    const caja = $("pl-prog-caja");
    if (total == null) return caja.classList.add("hidden");
    caja.classList.remove("hidden");
    const pct = total > 0 ? Math.round((hecho / total) * 100) : 0;
    $("pl-prog-barra").style.width = `${pct}%`;
    $("pl-prog-texto").textContent = etiqueta || `${hecho} de ${total} (${pct} %)`;
  }
  function ocupado(v) {
    for (const id of ["btn-extraer", "btn-ocr", "btn-limpiar"]) $(id).disabled = v;
    if (!v) $("btn-ocr").disabled = !docPdf;
  }

  /* ══════════ Número colombiano (SOLO para editar) ══════════
     El parseo que DECIDE vive en lib/apu_pliego.numeroColombiano, en el
     servidor. Esta copia existe porque un <input> del navegador no puede
     requerir un módulo de Node, y se limita a lo que necesita la edición
     manual: leer lo que el dueño escribe en una celda. Misma naturaleza que
     `revisarEnCliente` en admin.js — conveniencia, no autoridad. La regla es la
     misma a propósito (coma = decimal, punto = miles) porque tener dos reglas
     distintas para el mismo número sería peor que tener dos implementaciones. */
  function numeroLocal(bruto) {
    const t = String(bruto == null ? "" : bruto).trim();
    if (!t) return null;
    if (!/^[\s$€.,\-+0-9]+$/.test(t)) return null;   // el € va porque lo lleva la copia del servidor: las tres tienen que aceptar lo mismo
    let cuerpo = t.replace(/[\s$€+]/g, "");
    let signo = 1;
    if (cuerpo.startsWith("-")) { signo = -1; cuerpo = cuerpo.slice(1); }
    if (cuerpo.includes("-") || !/\d/.test(cuerpo)) return null;
    let entero = cuerpo, decimal = "";
    if (cuerpo.includes(",")) {
      const partes = cuerpo.split(",");
      if (partes.length > 2) return null;
      entero = partes[0].replace(/\./g, "");
      decimal = partes[1] || "";
    } else if (cuerpo.includes(".")) {
      const grupos = cuerpo.split(".");
      const ultimo = grupos[grupos.length - 1];
      if (ultimo.length === 3 && grupos.length >= 2) entero = grupos.join("");
      else if (ultimo.length >= 1 && ultimo.length <= 2) { entero = grupos.slice(0, -1).join(""); decimal = ultimo; }
      // UN solo punto y 4+ dígitos detrás es un DECIMAL de muchas cifras
      // («375.0000» de un Excel, «3.14159»); con varios puntos no encaja en
      // ninguna convención y es `null`. Tiene que decir lo MISMO que
      // lib/apu_pliego.numeroColombiano — hay una prueba que compara las dos.
      else if (grupos.length === 2) { entero = grupos[0]; decimal = ultimo; }
      else return null;
    }
    if (!/^\d*$/.test(entero) || !/^\d*$/.test(decimal)) return null;
    const n = parseFloat(`${entero || "0"}.${decimal || "0"}`);
    return Number.isFinite(n) ? signo * n : null;
  }

  /* ══════════ pdf.js ══════════ */
  /* EL WORKER NO PUEDE APUNTAR AL CDN, y esto es un defecto real, no una
     precaución: `new Worker(url)` clásico NO admite una URL de otro origen, así
     que `workerSrc = "https://cdnjs…/pdf.worker.min.js"` es el fallo
     intermitente típico de pdf.js — funciona en unos navegadores y en otros
     revienta al abrir el primer documento.

     La salida es traer el worker por `fetch` (cdnjs sí manda
     `Access-Control-Allow-Origin: *`) y construir un **blob del mismo origen**.
     Tres niveles, de mejor a peor, y ninguno silencioso:
       1. blob local  → worker de verdad, la pestaña no se congela;
       2. URL directa → puede fallar según el navegador, pero si funciona, mejor
          que nada;
       3. sin worker  → pdf.js corre en el hilo principal: FUNCIONA y congela la
          interfaz mientras lee. Se avisa en el chip, porque una pestaña que
          parece colgada sin explicación es peor que una lenta anunciada. */
  let pdfjsCargando = null;

  async function fijarWorker(lib) {
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
          return reject(new Error("pdf.js se cargó pero no expuso «pdfjsLib»: probablemente la versión "
            + "del CDN ya no trae build UMD. Fije una versión 3.x."));
        }
        resolve(window.pdfjsLib);
      };
      s.onerror = () => reject(new Error(
        "No se pudo cargar pdf.js desde el CDN. Sin él el PDF no se puede leer en el navegador. "
        + "Compruebe la conexión, o pegue la tabla en un archivo .txt y súbala."));
      document.head.appendChild(s);
    }).then(async (lib) => {
      const modo = await fijarWorker(lib);
      if (modo === "sin_worker") {
        mensaje("pdf.js no pudo arrancar su worker: la lectura corre en el hilo principal y la pestaña "
          + "se quedará quieta mientras trabaja. Es lento, no está roto.", "aviso");
      }
      return lib;
    }).catch((e) => { pdfjsCargando = null; throw e; });
    return pdfjsCargando;
  }

  /* Fragmentos de una página → líneas con las COLUMNAS separadas por TABULADOR.
     Es la pieza de la que depende todo el parseo del servidor. */
  function lineasDePagina(fragmentos) {
    const utiles = (fragmentos || []).filter((f) => f && typeof f.str === "string" && f.str.trim() !== ""
      && Array.isArray(f.transform) && f.transform.length >= 6);
    /* Se agrupa por CUBETAS de Y, no recorriendo las filas ya creadas. La
       búsqueda lineal era O(F²) sobre los fragmentos de la página: un PDF que
       ponga cada glifo en su propia coordenada Y —cosa que un documento hostil o
       simplemente raro puede hacer— congelaba la pestaña decenas de segundos por
       página, sin repintado y sin forma de cancelar. Con cubetas es O(F).

       Se prueban la cubeta propia y sus dos vecinas: un fragmento a un pelo del
       borde tiene que caer en la misma fila que el de al lado, y sin mirar las
       vecinas se partiría la fila en dos por un redondeo. */
    const ALTO_CUBETA = 3;              // unidades de PDF; ≈ media línea de 6-7 pt
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
    // en un PDF la Y crece HACIA ARRIBA: la primera línea es la de mayor Y
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

  let docPdf = null;          // documento pdf.js vivo (para el reintento por OCR)
  let nombrePdf = null;

  async function abrirPdf(datos, nombre) {
    const pdfjs = await cargarPdfJs();
    let doc = null;
    try {
      doc = await pdfjs.getDocument({ data: datos, isEvalSupported: false }).promise;
    } catch (e) {
      const m = String((e && e.message) || e);
      if (/password/i.test(m)) {
        throw new Error("El PDF está protegido con contraseña: pdf.js no puede abrirlo. "
          + "Quite la protección (es además una de las causas de rechazo en SECOP II) y reintente.");
      }
      throw new Error(`El PDF no se pudo abrir: puede estar corrupto o no ser un PDF. (${m})`);
    }
    if (!doc.numPages) throw new Error("El PDF no tiene páginas.");
    docPdf = doc;
    nombrePdf = nombre || null;
    return doc;
  }

  /* MARCADOR DE PÁGINA: cada página va precedida de una línea `\f<n>` (form
     feed + número; el mismo formato que entiende lib/paginas en el servidor:
     hay prueba que ejecuta las dos definiciones). Así la fila de la tabla, el
     requisito del vigía y el hito del cronograma pueden citar «pág. 14». Se
     emite TAMBIÉN para una página sin texto, para que la numeración no corra. */
  const marcadorPagina = (n) => "\f" + n;
  /* Renumera los marcadores relativos del OCR (`\f1`, `\f2`…) a los números
     REALES de página. Recibe la LISTA en el mismo orden en que se enviaron las
     imágenes, no la primera página: el bucle DESCARTA las que no se pueden
     rasterizar, así que un lote 21-30 con la 21 descartada manda 9 imágenes y
     el atajo aritmético citaba todo el lote una página por debajo. Un índice
     fuera de la lista se deja tal cual: inventarle un número sería el defecto
     que esto corrige. (La misma definición vive en lib/paginas.js y hay prueba
     que EJECUTA las dos sobre la misma batería.) */
  const renumerarMarcadores = (texto, numeros) => {
    const nums = Array.isArray(numeros) ? numeros : [];
    if (!nums.length) return String(texto || "");
    return String(texto || "").split(/\r\n|\r|\n/)
      .map((l) => {
        const m = /^[ \t]*\f(\d+)[ \t]*$/.exec(l);
        if (!m) return l;
        const real = nums[Number(m[1]) - 1];
        return Number.isFinite(Number(real)) ? marcadorPagina(Number(real)) : l;
      })
      .join("\n");
  };

  /* `avisar` es la barra del panel; la lectura SILENCIOSA de Mis procesos (los
     documentos del proceso, 3-sep-2026) pasa una función vacía: el MISMO bucle,
     las mismas líneas y los mismos marcadores, sin tocar la pantalla del lector. */
  async function textoDelPdf(doc, avisar = progreso) {
    const trozos = [];
    for (let n = 1; n <= doc.numPages; n++) {
      avisar(n - 1, doc.numPages, `Leyendo página ${n} de ${doc.numPages}…`);
      // ceder el hilo: sin esto la barra no se repinta en documentos largos
      await new Promise((r) => setTimeout(r, 0));
      const pagina = await doc.getPage(n);
      const contenido = await pagina.getTextContent();
      const lineas = lineasDePagina(contenido.items);
      trozos.push(marcadorPagina(n));
      if (lineas) trozos.push(lineas);
    }
    avisar(doc.numPages, doc.numPages, `${doc.numPages} página(s) leídas.`);
    return trozos.join("\n");
  }

  /* ── rasterizado para OCR ──
     Se baja la escala y la calidad hasta que la página cabe en el tope del plan
     gratuito. Si ni la más pequeña cabe, se dice: mandarla igual gastaría una
     petición para recibir un 413. */
  const bytesDeB64 = (b64) => {
    const s = String(b64 || "").replace(/\s+/g, "");
    const relleno = (s.match(/=+$/) || [""])[0].length;
    return Math.floor((s.length * 3) / 4) - relleno;
  };

  async function rasterizarPagina(doc, n) {
    const pagina = await doc.getPage(n);
    for (const escala of [2, 1.6, 1.3, 1, 0.8]) {
      const vista = pagina.getViewport({ scale: escala });
      const lienzo = document.createElement("canvas");
      lienzo.width = Math.max(1, Math.ceil(vista.width));
      lienzo.height = Math.max(1, Math.ceil(vista.height));
      const ctx = lienzo.getContext("2d");
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, lienzo.width, lienzo.height);
      await pagina.render({ canvasContext: ctx, viewport: vista }).promise;
      for (const calidad of [0.85, 0.7, 0.55]) {
        const url = lienzo.toDataURL("image/jpeg", calidad);
        const b64 = url.slice(url.indexOf(",") + 1);
        if (bytesDeB64(b64) <= TOPE_BYTES_PAGINA) return { base64: b64, mime: "image/jpeg" };
      }
    }
    return null;
  }

  /* ══════════ Llamadas al servidor ══════════ */
  async function pedir(ruta, cuerpo) {
    /* `leerToken()` devuelve el token integrado, una constante: la rama
       «sin token» era inalcanzable y sus mensajes («Guarde primero el token
       de acceso, arriba») apuntaban a un formulario retirado — documentación
       falsa dentro del fuente, la misma razón por la que se quitó la guarda
       muerta de celdaApuProceso. */
    const token = leerToken();
    let r = null, datos = null;
    try {
      r = await fetch(ruta, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-historico-token": token },
        body: JSON.stringify(cuerpo),
      });
    } catch (e) {
      return { estado: 0, cuerpo: null, red: window.Glosario.fraseDeFallo(e) };
    }
    try { datos = await r.json(); } catch { datos = null; }
    return { estado: r.status, cuerpo: datos };
  }

  let contrato = null;
  async function cargarContrato() {
    const token = leerToken(); // constante integrada: siempre presente
    try {
      const r = await fetch("/api/pliego?op=extraer-texto", {
        headers: { "x-historico-token": token, Accept: "application/json" }, cache: "no-store",
      });
      if (!r.ok) return;
      contrato = await r.json();
      pintarCatalogo();
    } catch { /* el contrato es una comodidad: sin él la extracción sigue funcionando */ }
  }

  function pintarCatalogo() {
    if (!contrato || !contrato.catalogo) return;
    const ocr = contrato.ocr && contrato.ocr.configurado;
    $("btn-ocr").title = ocr
      ? "Rasteriza las páginas y las manda a reconocer (OCR.space)."
      : (contrato.ocr && contrato.ocr.nota) || "OCR no configurado.";
  }

  /* ══════════ Estado de la tabla editable ══════════ */
  let filas = [];             // lo que se pinta y se edita
  let ultimaRespuesta = null;

  function nuevaFila(base = {}) {
    return {
      numeral: base.numeral == null ? "" : String(base.numeral),
      pagina: base.pagina == null ? null : Number(base.pagina),   // página del PDF; null si no se sabe
      descripcion_original: base.descripcion_original == null ? "" : String(base.descripcion_original),
      item_id: base.item_id == null ? "" : String(base.item_id),
      unidad: base.unidad == null ? "" : String(base.unidad),
      cantidad: base.cantidad == null ? null : Number(base.cantidad),
      unitario_oficial: base.unitario_oficial == null ? null : Number(base.unitario_oficial),
      total_oficial: base.total_oficial == null ? null : Number(base.total_oficial),
      nivel_mapeo: base.nivel_mapeo || "manual",
      personalizado: Boolean(base.personalizado),
      confianza: base.confianza == null ? null : Number(base.confianza),
      unidad_catalogo: base.unidad_catalogo == null ? null : String(base.unidad_catalogo),
      unidad_discrepante: Boolean(base.unidad_discrepante),
      descripcion_catalogo: base.descripcion_catalogo == null ? null : String(base.descripcion_catalogo),
      articulo_invias_candidato: base.articulo_invias_candidato == null ? null : String(base.articulo_invias_candidato),
      validacion_fila: base.validacion_fila || null,
      editada: false,
    };
  }

  const INSIGNIA = {
    firme: ["bg-green-50 text-green-800 ring-green-600/20", "Firme"],
    revisar: ["bg-amber-50 text-amber-800 ring-amber-600/20", "Revisar"],
    personalizado: ["bg-blue-50 text-blue-800 ring-blue-600/20", "Personalizado"],
    manual: ["bg-gray-100 text-gray-600 ring-gray-500/20", "Manual"],
  };

  /* El punto tipográfico ● hereda el color del chip; un emoji lo dibuja el
     sistema operativo con su propia paleta (la regla de toda la interfaz). */
  const SEMAFORO = {
    verde: ["bg-green-100 text-green-800", "● Verde · filas y total cuadran"],
    amarillo: ["bg-amber-100 text-amber-800", "● Amarillo · exige confirmación humana"],
    rojo: ["bg-red-100 text-red-800", "● Rojo · lectura poco fiable: verifique contra el PDF"],
  };

  /* «sin dato» NUNCA se pinta como 0: cero y «no sé» son cosas distintas, y es
     el defecto que este proyecto ya cerró dos veces. */
  const celdaNumero = (v) => (v == null ? "" : fmt.format(v));

  function pintarTabla() {
    const cuerpo = $("r-items");
    cuerpo.innerHTML = filas.map((f, i) => {
      const [clase, etiqueta] = INSIGNIA[f.nivel_mapeo] || INSIGNIA.manual;
      const cuadre = f.validacion_fila && f.validacion_fila.estado === "no_cuadra"
        ? '<span class="ml-1 text-red-600" title="cantidad × unitario ≠ total">≠</span>' : "";
      const disc = f.unidad_discrepante
        ? `<span class="ml-1 text-amber-600" title="El catálogo la mide en ${esc(f.unidad_catalogo)}; no se convierte">⚠</span>` : "";
      const sinCantidad = f.cantidad == null
        ? '<span class="text-xs text-amber-700">sin dato</span>' : "";
      /* CADA CELDA EDITABLE SE ANUNCIA POR SU NOMBRE (5-sep-2026): sin
         `aria-label` el lector de pantalla leía «cuadro de edición» seis veces
         por fila. El nombre lleva de qué fila es, que es lo que las distingue. */
      const deLaFila = esc(f.descripcion_original || f.numeral || `fila ${i + 1}`);
      return `<tr data-i="${i}" class="align-top">
        <td class="py-1.5 pr-2 text-xs text-gray-400">${esc(f.numeral || "")}${f.pagina != null ? `<br><span class="text-xs" title="Página del PDF de la que salió esta fila">pág. ${f.pagina}</span>` : ""}</td>
        <td class="py-1.5 pr-2"><input data-campo="descripcion_original" value="${esc(f.descripcion_original)}" aria-label="Descripción de la ${deLaFila}"
             class="celda-edit w-full min-w-[16rem] rounded-lg border border-transparent px-2 py-1 text-sm hover:border-gray-300 focus:border-gray-900 focus:outline-none"></td>
        <td class="py-1.5 pr-2"><input data-campo="item_id" list="catalogo-items" value="${esc(f.item_id)}" aria-label="Código del catálogo para ${deLaFila}"
             placeholder="(personalizado)"
             class="celda-edit w-40 rounded-lg border border-transparent px-2 py-1 font-mono text-xs hover:border-gray-300 focus:border-gray-900 focus:outline-none"></td>
        <td class="py-1.5 pr-2"><input data-campo="unidad" value="${esc(f.unidad)}" aria-label="Unidad de ${deLaFila}"
             class="celda-edit w-16 rounded-lg border border-transparent px-2 py-1 text-sm hover:border-gray-300 focus:border-gray-900 focus:outline-none">${disc}</td>
        <td class="py-1.5 pr-2 text-right"><input data-campo="cantidad" value="${esc(celdaNumero(f.cantidad))}" aria-label="Cantidad de ${deLaFila}"
             class="celda-edit w-24 rounded-lg border border-transparent px-2 py-1 text-right text-sm hover:border-gray-300 focus:border-gray-900 focus:outline-none">${sinCantidad}</td>
        <td class="py-1.5 pr-2 text-right"><input data-campo="unitario_oficial" value="${esc(celdaNumero(f.unitario_oficial))}" aria-label="Valor unitario del pliego para ${deLaFila}"
             class="celda-edit w-28 rounded-lg border border-transparent px-2 py-1 text-right text-sm hover:border-gray-300 focus:border-gray-900 focus:outline-none"></td>
        <td class="py-1.5 pr-2 text-right"><input data-campo="total_oficial" value="${esc(celdaNumero(f.total_oficial))}" aria-label="Valor total del pliego para ${deLaFila}"
             class="celda-edit w-32 rounded-lg border border-transparent px-2 py-1 text-right text-sm hover:border-gray-300 focus:border-gray-900 focus:outline-none">${cuadre}</td>
        <td class="py-1.5 pr-2"><span class="rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset ${clase}">${etiqueta}</span>
            ${f.editada ? '<span class="ml-1 text-[11px] text-gray-400">editada</span>' : ""}</td>
        <td class="py-1.5"><button data-borrar="${i}" type="button" title="Quitar la fila"
             class="rounded-lg px-2 py-1 text-xs text-gray-400 transition hover:bg-red-50 hover:text-red-600">✕</button></td>
      </tr>`;
    }).join("");
    pintarTarjetas();
  }

  function pintarTarjetas() {
    const conCantidad = filas.filter((f) => f.cantidad != null).length;
    const sumaTotales = filas.reduce((a, f) => a + (f.total_oficial == null ? 0 : f.total_oficial), 0);
    const conTotal = filas.filter((f) => f.total_oficial != null).length;
    const tarjeta = (titulo, valor, nota) => `<div class="rounded-xl bg-gray-50 p-4 ring-1 ring-inset ring-gray-900/5">
        <p class="text-xs uppercase tracking-wide text-gray-400">${esc(titulo)}</p>
        <p class="mt-1 text-lg font-semibold tracking-tight">${valor}</p>
        ${nota ? `<p class="mt-0.5 text-[11px] text-gray-400">${esc(nota)}</p>` : ""}
      </div>`;
    $("r-tarjetas").innerHTML = [
      tarjeta("Ítems", fmt.format(filas.length), `${filas.filter((f) => f.nivel_mapeo === "firme").length} mapeados en firme`),
      tarjeta("Con cantidad", fmt.format(conCantidad),
        filas.length - conCantidad ? `${filas.length - conCantidad} sin dato` : "todas legibles"),
      tarjeta("Suma de totales", conTotal ? fmtCOP.format(sumaTotales) : "sin dato",
        conTotal ? `sobre ${conTotal} de ${filas.length} filas` : "el pliego no trae precios"),
      tarjeta("Personalizados", fmt.format(filas.filter((f) => f.personalizado || !f.item_id).length),
        "fuera del catálogo: no es un error"),
    ].join("");
  }

  $("r-items").addEventListener("input", (e) => {
    const campo = e.target.getAttribute && e.target.getAttribute("data-campo");
    if (!campo) return;
    const tr = e.target.closest("tr");
    const i = Number(tr && tr.getAttribute("data-i"));
    if (!Number.isInteger(i) || !filas[i]) return;
    const bruto = e.target.value;
    if (campo === "cantidad" || campo === "unitario_oficial" || campo === "total_oficial") {
      // vacío = «sin dato» (null), no 0. Escribir 0 sí es escribir un cero.
      filas[i][campo] = bruto.trim() === "" ? null : numeroLocal(bruto);
    } else {
      filas[i][campo] = bruto;
    }
    filas[i].editada = true;
    if (campo === "item_id") {
      filas[i].personalizado = !bruto.trim();
      filas[i].nivel_mapeo = "manual";
    }
    pintarTarjetas();
  });

  $("r-items").addEventListener("click", (e) => {
    const idx = e.target.getAttribute && e.target.getAttribute("data-borrar");
    if (idx == null) return;
    const i = Number(idx);
    if (!Number.isInteger(i)) return;
    filas.splice(i, 1);
    pintarTabla();
  });

  $("pl-btn-agregar").addEventListener("click", () => {
    filas.push(nuevaFila({}));
    pintarTabla();
  });

  $("pl-btn-exportar").addEventListener("click", () => {
    const salida = {
      _meta: {
        generado: new Date().toISOString(),
        archivo: nombrePdf,
        advertencia: (ultimaRespuesta && ultimaRespuesta.advertencia)
          || "La extracción automática puede tener errores. Verifique los datos contra el pliego original.",
        confianza: ultimaRespuesta && ultimaRespuesta.confianza,
        editado_a_mano: filas.some((f) => f.editada),
      },
      objeto_proceso: $("pliego-objeto").value.trim() || null,
      unspsc: $("pliego-unspsc").value.trim() || null,
      precio_base: numeroLocal($("pliego-precio").value),
      items: filas.map((f, i) => ({
        orden: i + 1, numeral: f.numeral || null, item_id: f.item_id || null,
        descripcion_original: f.descripcion_original, unidad: f.unidad || null,
        cantidad: f.cantidad, unitario_oficial: f.unitario_oficial, total_oficial: f.total_oficial,
        personalizado: Boolean(f.personalizado || !f.item_id), editada: f.editada,
      })),
      validacion: ultimaRespuesta && ultimaRespuesta.validacion,
    };
    const blob = new Blob([JSON.stringify(salida, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `apu_items_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  });

  /* ══════════ Pintado del resultado ══════════ */
  function pintarResultado(cuerpo) {
    ultimaRespuesta = cuerpo;
    filas = (cuerpo.items || []).map(nuevaFila);
    // Fase 4 · el guardián del Formulario 1 (pestaña Precios) compara la oferta
    // con ESTOS ítems: se exponen tal cual salieron del lector
    /* LA BASE DE PRECIO VIAJA CON LOS ÍTEMS, y sin ella el guardián comparaba
       peras con manzanas: los unitarios del lector son COSTO DIRECTO cuando el
       pliego declara su AIU aparte (que es lo normal), mientras el editor manda
       los suyos CON AIU. Restarlos sin convertir daba a TODO ítem bien costeado
       un «+25 % por encima» y la alerta de «puede costar el proceso».
       Sin AIU declarado la base va en `null` —no se adivina—, y entonces el
       servidor responde «sin referencia» con el motivo en vez de una cifra. */
    const aiuDoc = cuerpo.aiu_declarado && typeof cuerpo.aiu_declarado.total === "number" ? cuerpo.aiu_declarado.total : null;
    try { window.__pliegoUltimo = { items: filas.map((f) => ({ numeral: f.numeral, pagina: f.pagina, descripcion: f.descripcion_original, unidad: f.unidad, cantidad: f.cantidad, unitario_oficial: f.unitario_oficial, total_oficial: f.total_oficial })), leido_el: new Date().toISOString(), id_proceso: idProcesoActual(), base_precio: aiuDoc != null ? "costo_directo" : null, aiu_total_pct: aiuDoc != null ? Math.round(aiuDoc * 1000) / 10 : null }; } catch { /* sin ventana */ }
    $("seccion-resultado").classList.remove("hidden");

    const [claseSem, textoSem] = SEMAFORO[(cuerpo.confianza && cuerpo.confianza.color) || "amarillo"] || SEMAFORO.amarillo;
    $("r-semaforo").className = `rounded-full px-3 py-1 text-xs font-semibold ${claseSem}`;
    $("r-semaforo").textContent = textoSem;

    // datalist del catálogo: los códigos que el servidor conoce
    const vistos = [...new Set((cuerpo.items || []).map((i) => i.item_id).filter(Boolean))];
    $("catalogo-items").innerHTML = vistos.map((c) => `<option value="${esc(c)}"></option>`).join("");

    pintarTabla();

    const v = cuerpo.validacion || {};
    const f = v.filas || {};
    const doc = v.documento || {};
    const partes = [];
    if (f.con_precio) {
      partes.push(`Filas con precio: ${f.cuadran} de ${f.con_precio} cuadran`
        + `${f.ratio == null ? "" : ` (${(f.ratio * 100).toFixed(1)} %)`}.`);
    } else {
      partes.push("El documento no trae precios unitarios: no hay aritmética de fila que validar.");
    }
    if (doc.estado === "cuadra") partes.push(`La suma cuadra con el presupuesto oficial usando el AIU declarado (variante ${esc(doc.variante_que_cuadro || "—")}).`);
    else if (doc.estado === "diagnostico") partes.push("Sin AIU declarado: el cuadre del documento es diagnóstico y no produce verde.");
    else if (doc.estado === "no_cuadra") partes.push("La suma NO cuadra con el presupuesto oficial.");
    if (cuerpo.fuente === "ocr") partes.push("Texto obtenido por OCR: la tasa de error es más alta que en un PDF nativo.");
    $("r-nota").textContent = partes.join(" ");

    const d = cuerpo.diagnostico || {};
    $("r-diagnostico").innerHTML = [
      `<p><strong>Líneas leídas:</strong> ${fmt.format(d.lineas_leidas == null ? 0 : d.lineas_leidas)}${d.truncado ? " (truncado)" : ""}</p>`,
      `<p><strong>Cabecera detectada:</strong> ${d.cabecera_detectada ? esc(d.cabecera_detectada.join(", ")) : "ninguna — se usó la firma de unidad"}</p>`,
      `<p><strong>Vías de reconocimiento:</strong> ${esc(JSON.stringify(d.vias_de_reconocimiento || {}))}</p>`,
      `<p><strong>Descartadas:</strong> ${esc(JSON.stringify(d.descartadas || {}))}</p>`,
      (d.ejemplos_no_reconocidos && d.ejemplos_no_reconocidos.length)
        ? `<div><strong>Líneas no reconocidas (muestra):</strong><ul class="mt-1 space-y-0.5 font-mono">${d.ejemplos_no_reconocidos.map((l) => `<li class="truncate">${esc(l)}</li>`).join("")}</ul></div>`
        : "",
      (cuerpo.tipologias_probables && cuerpo.tipologias_probables.length)
        ? `<p><strong>Tipología del objeto:</strong> ${cuerpo.tipologias_probables.map((t) => `${esc(t.nombre)} (${t.puntaje})`).join(" · ")}</p>`
        : "<p><strong>Tipología del objeto:</strong> no determinada (sin objeto o sin términos ancla)</p>",
    ].filter(Boolean).join("");

    avisos(cuerpo.avisos);
  }

  /* ══════════ Flujo principal ══════════ */
  function contexto() {
    return {
      objeto_proceso: $("pliego-objeto").value.trim(),
      unspsc: $("pliego-unspsc").value.trim(),
      precio_base: numeroLocal($("pliego-precio").value),
    };
  }

  async function bytesDeEntrada() {
    const archivo = $("pliego-archivo").files && $("pliego-archivo").files[0];
    const url = $("pliego-url").value.trim();

    if (archivo) {
      const nombre = archivo.name || "documento";
      if (/\.txt$/i.test(nombre) || archivo.type === "text/plain") {
        const texto = await archivo.text();
        return { texto, nombre };
      }
      const buffer = await archivo.arrayBuffer();
      return { datos: new Uint8Array(buffer), nombre };
    }
    if (url) {
      chip("Descargando el PDF…", { girando: true });
      const r = await pedir("/api/pliego?op=descargar", { url });
      if (r.red) throw new Error(r.red);   // `red` ya viene redactado (Glosario.fraseDeFallo)
      if (r.estado !== 200 || !r.cuerpo || !r.cuerpo.ok) {
        throw new Error((r.cuerpo && r.cuerpo.error) || `El servidor respondió ${r.estado}.`);
      }
      const bin = atob(r.cuerpo.base64);
      const datos = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) datos[i] = bin.charCodeAt(i);
      return { datos, nombre: url.split("/").pop() || "documento.pdf" };
    }
    throw new Error("Seleccione un archivo PDF o pegue la URL del pliego.");
  }

  async function extraer() {
    mensaje(null); avisos(null);
    ocupado(true);
    docPdf = null;
    $("btn-ocr").disabled = true;
    try {
      const entrada = await bytesDeEntrada();
      let texto = entrada.texto || "";
      if (!texto) {
        chip("Abriendo el PDF…", { girando: true });
        const doc = await abrirPdf(entrada.datos, entrada.nombre);
        chip(`Leyendo ${doc.numPages} página(s)…`, { girando: true });
        texto = await textoDelPdf(doc);
        $("btn-ocr").disabled = false;
      } else {
        nombrePdf = entrada.nombre;
      }
      progreso(null);

      const largo = texto.trim().length;
      const paginas = docPdf ? docPdf.numPages : 1;
      const porPagina = largo / paginas;
      if (largo < MIN_TEXTO_UTIL || (docPdf && porPagina < MIN_CARACTERES_POR_PAGINA)) {
        chip("Sin capa de texto: parece escaneado", {});
        mensaje(`pdf.js extrajo ${largo} caracteres en ${paginas} página(s) (${porPagina.toFixed(0)} por página): `
          + "este PDF no tiene capa de texto utilizable, casi seguro es un escaneo. Eso no significa que el "
          + "documento esté vacío. Pulse «Reintentar con OCR» para rasterizar las páginas y mandarlas a reconocer.",
        "aviso");
        return;
      }

      chip("Analizando la tabla…", { girando: true });
      await enviarTexto(texto);
    } catch (e) {
      progreso(null);
      chip("Error", {});
      mensaje((e && e.message) || "Error desconocido al leer el pliego.", "error");
    } finally {
      ocupado(false);
    }
  }

  async function enviarTexto(texto) {
    const ctx = contexto();
    const r = await pedir("/api/pliego?op=extraer-texto", {
      texto_extraido: texto,
      objeto_proceso: ctx.objeto_proceso,
      unspsc: ctx.unspsc,
      precio_base: ctx.precio_base,
    });
    manejarRespuesta(r);
    /* Fase 5 · vigía de adendas + cronograma: con el texto ya en la mano se
       registra la versión del pliego (si el editor tiene un proceso abierto)
       y se pintan «la entidad cambió las reglas» y el cronograma. Nunca
       bloquea la extracción: falla en silencio hacia un aviso. */
    vigilarPliego(texto).catch(() => {});
  }

  /* El id del proceso lo tiene el editor de APU (campo id-proceso) cuando se
     llegó desde una tarjeta; sin él, el vigía no puede guardar versiones y lo
     dice. El perfil es el del selector del tablero. */
  function idProcesoActual() { const el = document.getElementById("id-proceso"); return el ? el.value.trim() : ""; }
  function perfilActual() { const el = document.getElementById("f-perfil"); return el ? el.value : ""; }
  async function vigilarPliego(texto) {
    const caja = document.getElementById("pl-vigia");
    if (!caja) return;
    const id = idProcesoActual();
    let html = "";
    /* el dictamen del pliego cuelga de aquí con su PROPIO try/catch: nada suyo
       puede romper el pintado del vigía ni del cronograma */
    let dictamenArgs = { id: "", cambio: false, falloVigia: null };
    if (!id) {
      html += `<p class="text-gray-600">Para vigilar las adendas de este pliego abra el proceso desde su tarjeta («Calcular mi precio»): así el lector sabe de qué proceso es el pliego y guarda cada versión.</p>`;
    } else {
      const r = await pedir("/api/pliego?op=diff", { id_proceso: id, texto, perfil: perfilActual(), origen: "lector" });
      const c = r.cuerpo || {};
      dictamenArgs = { id, cambio: !!c.cambio, falloVigia: c.ok ? null : (c.error || `respuesta ${r.estado}`) };
      if (!c.ok) html += `<p class="text-gray-600">No se pudo guardar la versión del pliego: ${esc(c.error || `respuesta ${r.estado}`)}.</p>`;
      else {
        html += `<p class="font-medium" style="color: var(--text-primary);">${esc(c.mensaje || "")}</p>`;
        const cambios = (c.diff && c.diff.habilitantes && c.diff.habilitantes.cambios) || [];
        if (c.cambio) {
          html += cambios.length
            ? `<ul class="mt-2 space-y-1">${cambios.map((x) => `<li><span aria-hidden="true">${x.afecta ? "●" : "○"}</span> ${esc(x.mensaje)}${x.pagina != null ? ` <span class="text-xs text-gray-500">(pág. ${x.pagina})</span>` : ""}</li>`).join("")}</ul>`
            : `<p class="mt-1 text-gray-600">Cambió el texto, pero ninguno de los requisitos con cifra que la app sabe leer (capital de trabajo, patrimonio, liquidez, endeudamiento, experiencia, plazo)${c.diff && c.diff.parrafos ? ` (${c.diff.parrafos.modificados.length} párrafos modificados, ${c.diff.parrafos.anadidos.length} nuevos, ${c.diff.parrafos.quitados.length} retirados)` : ""}. Léalo: puede haber cambiado algo que no es una cifra.</p>`;
        }
        html += `<p class="mt-1 text-xs text-gray-500">Versión ${c.version} de este pliego guardada${c.recortado ? " (texto recortado)" : ""}. La comparación de requisitos es una lectura automática del texto: confírmela contra el pliego.</p>`;
      }
    }
    // cronograma (dataset + texto): siempre, con o sin id
    const rc = await pedir("/api/pliego?op=cronograma", { id_proceso: id || undefined, texto });
    const cc = rc.cuerpo || {};
    if (cc.ok && Array.isArray(cc.hitos) && cc.hitos.length) {
      html += `<p class="mt-3 text-xs font-medium uppercase tracking-wide text-gray-500">Cronograma</p>
        <ul class="mt-1 space-y-0.5">${cc.hitos.map((h) => `<li>${esc(h.fecha.split("-").reverse().join("/"))} — ${esc(h.etiqueta)} <span class="text-xs text-gray-400">(${h.origen === "pliego" ? `pliego${h.pagina != null ? `, pág. ${h.pagina}` : ""}` : "SECOP II"})</span></li>`).join("")}</ul>`;
      if (cc.avisos && cc.avisos.length) html += `<p class="mt-2 text-xs text-gray-500">Avisos a 7, 3 y 1 día: ${cc.avisos.slice(0, 3).map((a) => esc(a.aviso.split("-").reverse().join("/") + " · " + a.mensaje)).join(" · ")}${cc.avisos.length > 3 ? ` · y ${cc.avisos.length - 3} más` : ""}.</p>`;
      if (cc.ics_url) html += `<a class="mt-2 inline-block text-sm font-medium underline" style="color: var(--accent);" href="${esc(cc.ics_url)}">Descargar al calendario (.ics)</a>`;
    } else if (cc.ok) {
      html += `<p class="mt-3 text-xs text-gray-500">No se leyó ninguna fecha de cronograma en el pliego${cc.fuentes && cc.fuentes.lineas_hito_sin_fecha ? ` (${cc.fuentes.lineas_hito_sin_fecha} líneas de hito sin fecha legible)` : ""}.</p>`;
    }
    caja.innerHTML = html;
    caja.classList.remove("hidden");
    dictamenCaja = null; dictamenPerfil = null; // el lector pinta en su propia caja, con el perfil de la barra
    try { await cargarDictamen(dictamenArgs.id, { cambio: dictamenArgs.cambio, falloVigia: dictamenArgs.falloVigia }); } catch { /* el dictamen nunca tumba el vigía */ }
  }

  /* ══════════ Dictamen del pliego (proyecto «Don Héctor», 2-sep-2026) ══════════
     El texto que el vigía acaba de guardar se manda a un modelo de lenguaje y
     vuelve como HECHOS citados por página, verificados en el servidor
     (lib/dictamen.js). Aquí solo se pinta: nada de lo que se ve sale de un
     cálculo del navegador. `pintarDictamen` es una función AUTOCONTENIDA (recibe
     `esc` y `MARCA` por parámetro) para que la suite la EJECUTE sobre un fixture
     con `extraerFn`, igual que hace con `parsearCsv`. */
  let dictamenAbort = null;
  let dictamenReloj = null;
  let dictamenUltimo = null;
  /* Dónde se pinta el dictamen y con qué perfil. Por defecto, la caja del lector
     (#pl-dictamen) y el perfil de la barra; Mis procesos (app.js) puede pedir el
     MISMO flujo en otra caja con `window.__pliegoDictamenEn(caja, id, perfil)`
     — una segunda copia del flujo divergiría a la primera corrección. Los
     botones se buscan DENTRO de la caja, no en el documento: así dos cajas no
     se pisan los ids. */
  let dictamenCaja = null;
  let dictamenPerfil = null;
  const cajaDictamen = () => dictamenCaja || $("pl-dictamen");
  const enCaja = (id) => { const c = cajaDictamen(); return c ? c.querySelector(`#${id}`) : null; };
  const perfilDictamen = () => dictamenPerfil || perfilActual();

  async function pedirGet(ruta) {
    let r = null, datos = null;
    try {
      r = await fetch(ruta, { headers: { "x-historico-token": leerToken(), Accept: "application/json" }, cache: "no-store" });
    } catch (e) {
      return { estado: 0, cuerpo: null, red: window.Glosario.fraseDeFallo(e) };
    }
    try { datos = await r.json(); } catch { datos = null; }
    return { estado: r.status, cuerpo: datos };
  }

  function pintarDictamen(r, ctx) {
    const esc = ctx.esc;
    const MARCA = ctx.MARCA;
    const d = r.dictamen || {};
    const ver = r.verificacion || {};
    const apartadas = Array.isArray(r.no_verificados) ? r.no_verificados : [];
    const dinero = (n) => `$${Math.round(Number(n)).toLocaleString("es-CO")}`;
    const cifra = (n) => (Number.isFinite(Number(n)) ? Number(n).toLocaleString("es-CO", { maximumFractionDigits: 2 }) : "");
    const valorDe = (clave, v) => (v == null ? "" : /_cop$/.test(clave) ? dinero(v) : cifra(v));
    const fecha = (iso) => { const s = String(iso || "").slice(0, 10).split("-"); return s.length === 3 ? `${s[2]}/${s[1]}/${s[0]}` : ""; };
    const veredicto = String(d.veredicto || "sin_hechos_comprobados");
    /* LAS CUATRO CLASES VAN COMPLETAS (5-sep-2026). Antes esto guardaba solo el
       color («green») y la plantilla armaba `text-${color}-700`: una utilidad
       construida en tiempo de ejecución que el compilador de Tailwind NO puede
       ver. Desde que la hoja se compila fuera del navegador y se sirve desde
       public/tailwind.css, una clase armada por trozos es una clase que no
       existe — y el veredicto del pliego saldría en negro. La suite censa que
       ninguna clase se arme mezclando literal e interpolación. */
    const COLOR = { presentarse: "text-green-700", presentarse_con_reservas: "text-amber-700", no_presentarse: "text-red-700", sin_hechos_comprobados: "text-gray-700" };
    const TEXTO = { presentarse: "Puede presentarse", presentarse_con_reservas: "Puede presentarse, con reservas", no_presentarse: "No conviene presentarse", sin_hechos_comprobados: "Falta información para opinar" };
    const color = COLOR[veredicto] || "text-gray-700";
    const gris = veredicto === "sin_hechos_comprobados";
    const donde = (x) => {
      if (x.pagina_real != null && x.pagina != null && x.pagina_real !== x.pagina) return `está en la página ${x.pagina_real}`;
      if (x.pagina != null) return `pág. ${x.pagina}`;
      if (x.pagina_real != null) return `está en la página ${x.pagina_real}`;
      return "según los datos del proceso";
    };
    const item = (x) => `<li>${esc(x.texto)} <span class="text-xs text-gray-500">(${esc(donde(x))})</span>${x.cita ? `<br><span class="text-xs italic text-gray-500">«${esc(x.cita)}»</span>` : ""}</li>`;
    const ETIQUETA = {
      experiencia_especifica: "Experiencia específica", financiero: "Requisito financiero", capacidad_de_contratacion: "Capacidad de contratación",
      personal: "Personal exigido", equipos_o_laboratorio: "Equipos o laboratorio", certificaciones: "Certificaciones", garantias: "Garantías",
      forma_de_pago: "Forma de pago", anticipo_o_pago_anticipado: "Anticipo o pago anticipado", plazo: "Plazo", multas: "Multas",
      item_sin_valor: "Ítem sin valor", subcontratista_o_proveedor_impuesto: "Proveedor o subcontratista impuesto",
      marca_sin_equivalente: "Marca sin la fórmula “o equivalente”", licencia_o_permiso: "Licencia o permiso",
      visita_obligatoria: "Visita obligatoria", causal_de_rechazo: "Causal de rechazo", adenda: "Adenda", otro: "Otro",
    };
    const ESTADO = { cumple: "Cumple", no_cumple: "No cumple", sin_dato_del_perfil: "Sin dato en su perfil: verifíquelo" };
    const MOTIVO = {
      cita_no_encontrada: "no está en la página citada", cita_ambigua: "cita demasiado corta", pagina_ilegible: "página ilegible", sin_cita: "sin cita",
      cifra_sin_respaldo: "cifra sin respaldo", frase_de_acusacion: "atribuye intenciones", registro_informal: "redacción no admitida", referencia_desconocida: "norma no reconocida",
    };
    const requisitos = Array.isArray(d.requisitos_para_participar) ? d.requisitos_para_participar : [];
    const riesgos = Array.isArray(d.riesgos) ? d.riesgos : [];
    const motivos = Array.isArray(d.motivos) ? d.motivos : [];
    const faltan = requisitos.filter((x) => x.estado === "sin_dato_del_perfil").length;
    const lecturas = r.lecturas && typeof r.lecturas === "object" ? Object.values(r.lecturas) : [];
    const CUMPLE = { si: "Cumple", no: "No cumple", sin_dato: "Sin dato en su perfil" };
    let html = "";
    html += `<p class="mt-3 text-sm font-medium ${color}">● ${esc(TEXTO[veredicto] || TEXTO.sin_hechos_comprobados)} — ${esc(d.veredicto_frase || "")}</p>`;
    if (gris) html += `<p class="mt-1 text-sm text-gray-600">${esc(r.que_hacer || "")}</p>`;
    html += `<p class="mt-2 text-xs text-gray-500">${esc(r.advertencia || "")}</p>`;
    html += `<p class="mt-1 text-xs text-gray-500">Sobre la versión ${esc(r.version_texto)} del pliego${r.paginas != null ? ` (${esc(r.paginas)} páginas)` : ""}. Para el precio use “Calcular mi precio”.`
      + `${r.recortado ? " El texto guardado está recortado: el dictamen no vio el final del pliego." : ""}`
      + `${Array.isArray(r.paginas_vacias) && r.paginas_vacias.length ? ` Las páginas ${esc(r.paginas_vacias.join(", "))} no se pudieron leer del escaneado.` : ""}`
      + `${apartadas.length ? ` Se apartaron ${apartadas.length} frases que no se pudieron comprobar.` : ""}</p>`;
    html += `<p class="mt-1 text-xs text-gray-500">Se comprobaron ${esc(ver.citas_verificadas || 0)} de ${esc(ver.citas_total || 0)} citas${r.paginas != null ? ` · ${esc(r.paginas - (Array.isArray(r.paginas_vacias) ? r.paginas_vacias.length : 0))} páginas leídas de ${esc(r.paginas)}` : ""} · faltan ${faltan} datos de su empresa</p>`;
    if (motivos.length) html += `<p class="mt-3 text-xs font-medium uppercase tracking-wide text-gray-500">Por qué</p><ul class="mt-1 space-y-1">${motivos.map(item).join("")}</ul>`;
    if (lecturas.length || r.capacidad_disponible_cop != null) {
      html += `<p class="mt-3 text-xs font-medium uppercase tracking-wide text-gray-500">${esc(MARCA.nombre)} ya midió</p><ul class="mt-1 space-y-0.5 text-xs">`;
      for (const l of lecturas) {
        html += `<li>${esc(l.etiqueta)}: pide ${esc(l.tipo === "dinero" ? dinero(l.valor) : cifra(l.valor))}${l.valor_del_perfil != null ? ` · usted ${esc(l.tipo === "dinero" ? dinero(l.valor_del_perfil) : cifra(l.valor_del_perfil))}` : ""}${l.cumple_segun_la_app ? ` · ${esc(CUMPLE[l.cumple_segun_la_app] || "")}` : ""}${l.pagina != null ? ` <span class="text-gray-400">(pág. ${esc(l.pagina)})</span>` : ""}</li>`;
      }
      if (r.capacidad_disponible_cop != null) html += `<li>Capacidad de contratación disponible: ${esc(dinero(r.capacidad_disponible_cop))}${r.capacidad_nota ? ` <span class="text-gray-400">(${esc(r.capacidad_nota)})</span>` : ""}</li>`;
      html += "</ul>";
    }
    html += `<details class="mt-3"${gris ? " open" : ""}><summary class="cursor-pointer text-sm font-medium">Ver el dictamen completo</summary><div class="mt-2 space-y-3 text-sm">`;
    if (requisitos.length) {
      html += `<div><p class="text-xs font-medium uppercase tracking-wide text-gray-500">Requisitos para poder participar</p><ul class="mt-1 space-y-1">`;
      for (const x of requisitos) {
        html += `<li><span class="font-medium">${esc(ETIQUETA[x.tipo] || ETIQUETA.otro)}</span> · ${esc(ESTADO[x.estado] || ESTADO.sin_dato_del_perfil)}<br>${esc(x.texto)} <span class="text-xs text-gray-500">(${esc(donde(x))})</span>`
          + `${x.cita ? `<br><span class="text-xs italic text-gray-500">«${esc(x.cita)}»</span>` : ""}`
          + `<br><span class="text-xs text-gray-600">${x.dato_comparado && x.dato_comparado_valor != null ? `Comparado con: ${esc(x.dato_comparado_etiqueta || x.dato_comparado)} ${esc(valorDe(x.dato_comparado, x.dato_comparado_valor))}` : `${esc(MARCA.nombre)} no tiene esa cifra`}${x.motivo_estado ? ` · ${esc(x.motivo_estado)}` : ""}</span></li>`;
      }
      html += "</ul></div>";
    }
    if (riesgos.length) {
      html += `<div><p class="text-xs font-medium uppercase tracking-wide text-gray-500">Riesgos</p><ul class="mt-1 space-y-1">`;
      let sinFuente = false;
      for (const x of riesgos) {
        if (x.base === "sin_fuente" && !sinFuente) { sinFuente = true; html += `<li class="text-xs font-medium text-gray-500">Criterio general, sin respaldo en el pliego</li>`; }
        html += `<li><span class="font-medium">Gravedad ${esc(x.gravedad)}</span> · ${esc(x.texto)} <span class="text-xs text-gray-500">(${x.base === "datos_de_la_app" ? "Según los datos de la aplicación" : x.base === "norma" ? "Según la norma citada" : esc(donde(x))})</span>`
          + `${x.cita ? `<br><span class="text-xs italic text-gray-500">«${esc(x.cita)}»</span>` : ""}${x.que_hacer ? `<br><span class="text-xs text-gray-600">Qué hacer: ${esc(x.que_hacer)}</span>` : ""}</li>`;
      }
      html += "</ul></div>";
    }
    const bloque = (titulo, lista, pinta) => (Array.isArray(lista) && lista.length ? `<div><p class="text-xs font-medium uppercase tracking-wide text-gray-500">${esc(titulo)}</p><ul class="mt-1 space-y-1">${lista.map(pinta).join("")}</ul></div>` : "");
    html += bloque("A favor", d.puntos_a_favor, item);
    html += bloque("Pendiente de verificar", d.pendientes_de_verificar, item);
    html += bloque("Preguntas para la entidad (por escrito)", d.preguntas_para_la_entidad, (s) => `<li>${esc(s)}</li>`);
    html += bloque(r.recortado || (Array.isArray(r.paginas_vacias) && r.paginas_vacias.length) ? "No apareció en las páginas leídas" : "No encontrado en el pliego", d.no_encontrado_en_el_pliego, (s) => `<li>${esc(s)}</li>`);
    if (apartadas.length) {
      html += `<details${gris ? " open" : ""}><summary class="cursor-pointer text-xs font-medium uppercase tracking-wide text-gray-500">Frases que no se pudieron comprobar (${apartadas.length})</summary>`
        + `<p class="mt-1 text-xs text-gray-500">No las use como hechos.</p><ul class="mt-1 space-y-1 text-xs text-gray-500">`
        + apartadas.map((a) => `<li>${esc(a.texto)} <span class="italic">— ${esc(a.motivo === "registro_informal" ? "Redacción no admitida" : (MOTIVO[a.motivo] || a.motivo))}</span></li>`).join("") + "</ul></details>";
    }
    if (d.confianza_motivo) html += `<p class="text-xs text-gray-500">${esc(d.confianza_motivo)}</p>`;
    const seg = Number.isFinite(Number(r.duracionMs)) ? Math.round(Number(r.duracionMs) / 1000) : null;
    if (r.origen_legible) html += `<p class="text-xs text-gray-500">${esc(r.origen_legible)}</p>`;
    const versionInstr = String(r.version_instrucciones || "").slice(0, 10);
    html += `<p class="text-xs text-gray-400">Cómo se hizo: leído el ${esc(fecha(r.generado))}${r.paginas != null ? ` · ${esc(r.paginas)} páginas del pliego` : ""}, versión ${esc(r.version_texto)}${seg != null ? ` · ${seg} segundos` : ""}${versionInstr ? ` · instrucciones del ${esc(fecha(versionInstr))}` : ""}${r.uso_mes && r.uso_mes.dictamenes != null ? ` · este mes: ${esc(r.uso_mes.dictamenes)} dictámenes` : ""}${r.cache ? " · guardado" : ""}</p>`;
    html += "</div></details>";
    html += `<div class="mt-3 flex flex-wrap gap-2">`
      + `<button type="button" id="btn-dictamen-pedir" class="rounded-lg px-3 py-1.5 text-sm font-medium ring-1 ring-inset ring-gray-300">Volver a pedir el dictamen</button>`
      + `<button type="button" id="btn-dictamen-copiar" class="rounded-lg px-3 py-1.5 text-sm font-medium ring-1 ring-inset ring-gray-300">Copiar el dictamen</button>`
      + `<button type="button" id="btn-dictamen-cancelar" class="hidden rounded-lg px-3 py-1.5 text-sm font-medium ring-1 ring-inset ring-gray-300">Cancelar</button>`
      + `</div><p id="dictamen-estado" class="mt-2 text-xs text-gray-500"></p>`;
    return html;
  }

  function textoPlanoDictamen(r) {
    const d = r.dictamen || {};
    const TEXTO = { presentarse: "Puede presentarse", presentarse_con_reservas: "Puede presentarse, con reservas", no_presentarse: "No conviene presentarse", sin_hechos_comprobados: "Falta información para opinar" };
    const linea = (x) => `- ${x.texto}${x.pagina != null ? ` (pág. ${x.pagina})` : ""}${x.cita ? ` «${x.cita}»` : ""}`;
    const partes = [`${TEXTO[d.veredicto] || TEXTO.sin_hechos_comprobados} — ${d.veredicto_frase || ""}`, r.advertencia || ""];
    const seccion = (titulo, lista, f) => { if (Array.isArray(lista) && lista.length) partes.push(`\n${titulo}`, ...lista.map(f)); };
    seccion("Por qué", d.motivos, linea);
    seccion("Requisitos para poder participar", d.requisitos_para_participar, (x) => `${linea(x)} · ${x.estado === "cumple" ? "Cumple" : x.estado === "no_cumple" ? "No cumple" : "Sin dato en su perfil"}`);
    seccion("Riesgos", d.riesgos, (x) => `${linea(x)} · gravedad ${x.gravedad}${x.que_hacer ? ` · qué hacer: ${x.que_hacer}` : ""}`);
    seccion("A favor", d.puntos_a_favor, linea);
    seccion("Pendiente de verificar", d.pendientes_de_verificar, linea);
    seccion("Preguntas para la entidad (por escrito)", d.preguntas_para_la_entidad, (s) => `- ${s}`);
    seccion("No encontrado en el pliego", d.no_encontrado_en_el_pliego, (s) => `- ${s}`);
    return partes.join("\n");
  }

  function estadoDictamen(clase, texto, { boton = true, breve = false } = {}) {
    const caja = clase === "error" ? "bg-red-50 text-red-700 ring-red-600/20" : clase === "aviso" ? "bg-amber-50 text-amber-800 ring-amber-600/20" : "bg-gray-50 text-gray-600 ring-gray-500/20";
    return `<p class="rounded-lg px-3 py-2 text-sm ring-1 ring-inset ${caja}">${esc(texto)}</p>`
      + `<div class="mt-3 flex flex-wrap gap-2">`
      + `<button type="button" id="btn-dictamen-pedir" class="rounded-lg px-3 py-1.5 text-sm font-medium ring-1 ring-inset ring-gray-300"${boton ? "" : " disabled"}>Pedir el dictamen</button>`
      + `${breve ? `<button type="button" id="btn-dictamen-breve" class="rounded-lg px-3 py-1.5 text-sm font-medium ring-1 ring-inset ring-gray-300">Pedir un dictamen más breve</button>` : ""}`
      + `<button type="button" id="btn-dictamen-cancelar" class="hidden rounded-lg px-3 py-1.5 text-sm font-medium ring-1 ring-inset ring-gray-300">Cancelar</button>`
      + `</div><p id="dictamen-estado" class="mt-2 text-xs text-gray-500"></p>`;
  }

  function pintarCajaDictamen(html, id) {
    const caja = cajaDictamen();
    if (!caja) return;
    caja.innerHTML = `<p class="text-xs font-medium uppercase tracking-wide text-gray-500">Dictamen del pliego</p><div class="mt-2">${html}</div>`;
    caja.classList.remove("hidden");
    const bPedir = enCaja("btn-dictamen-pedir");
    if (bPedir) bPedir.addEventListener("click", () => pedirDictamenAlServidor(id, { refrescar: !!dictamenUltimo }));
    const bBreve = enCaja("btn-dictamen-breve");
    if (bBreve) bBreve.addEventListener("click", () => pedirDictamenAlServidor(id, { refrescar: true, esfuerzo: "low" }));
    const bCopiar = enCaja("btn-dictamen-copiar");
    if (bCopiar) bCopiar.addEventListener("click", async () => {
      const estado = enCaja("dictamen-estado");
      try { await navigator.clipboard.writeText(textoPlanoDictamen(dictamenUltimo || {})); if (estado) estado.textContent = "Dictamen copiado."; }
      catch { if (estado) estado.textContent = "No se pudo copiar: seleccione el texto y cópielo a mano."; }
    });
  }

  function mostrarDictamen(r, id) {
    dictamenUltimo = r;
    pintarCajaDictamen(pintarDictamen(r, { esc, MARCA: window.Glosario.MARCA }), id);
    const estado = enCaja("dictamen-estado");
    if (estado && r.cache && r.generado) estado.textContent = `Dictamen generado el ${String(r.generado).slice(0, 10).split("-").reverse().join("/")} (guardado)`;
  }

  /* La respuesta del servidor que no es un dictamen se traduce a un estado con
     qué hacer: ninguna pulsación se queda sin respuesta visible. */
  function respuestaDictamen(r, id, { cambio = false } = {}) {
    if (r.red) return pintarCajaDictamen(estadoDictamen("error", r.red), id);
    if (r.estado === 401) return pintarCajaDictamen(estadoDictamen("error", MSG_401, { boton: false }), id);
    const c = r.cuerpo || {};
    if (r.estado === 503 && c.ia_configurada === false) return pintarCajaDictamen(estadoDictamen("aviso", c.error || "", { boton: false }), id);
    if (r.estado === 400 && Array.isArray(c.perfiles)) return pintarCajaDictamen(estadoDictamen("error", `${c.error} ${c.que_hacer || ""}`, { boton: false }), id);
    if (r.estado === 429) return pintarCajaDictamen(estadoDictamen("aviso", `${c.error} ${c.que_hacer || ""}`, { boton: false }), id);
    if (c.ok && c.hay_dictamen) return mostrarDictamen(c, id);
    if (c.ok && c.hay_texto === false) return pintarCajaDictamen(estadoDictamen("aviso", `${c.error} ${c.que_hacer || ""}`, { boton: false }), id);
    if (c.ok && c.en_curso) return pintarCajaDictamen(estadoDictamen("aviso", `${c.error} ${c.que_hacer || ""}`), id);
    if (c.ok && c.hay_dictamen === false && c.motivo === "rechazado_por_el_modelo") return pintarCajaDictamen(estadoDictamen("error", `${c.error} ${c.que_hacer || ""}`), id);
    if (c.ok && c.hay_dictamen === false) {
      const texto = cambio
        ? "El pliego tiene una versión nueva y el dictamen guardado es de la anterior. Pulse «Pedir el dictamen» para leer la versión nueva."
        : c.ia_configurada === false
          ? "Todavía no hay una lectura guardada de esta versión del pliego. Pulse «Pedir el dictamen»: la lectura por reglas es inmediata."
          : "Todavía no hay un dictamen de esta versión del pliego. Pulse «Pedir el dictamen»: se lee el pliego completo y tarda entre uno y tres minutos.";
      return pintarCajaDictamen(estadoDictamen("info", texto), id);
    }
    const breve = c.motivo === "incompleto" || c.motivo === "tiempo";
    return pintarCajaDictamen(estadoDictamen("error", `${c.error || `El servidor respondió ${r.estado}.`} ${c.que_hacer || ""}`, { breve }), id);
  }

  async function cargarDictamen(id, { cambio = false, falloVigia = null } = {}) {
    if (!id) return pintarCajaDictamen(estadoDictamen("info", "Abra el pliego desde una tarjeta de proceso («Calcular mi precio») para poder pedir el dictamen.", { boton: false }), id);
    if (falloVigia) return pintarCajaDictamen(estadoDictamen("aviso", `Primero hay que guardar el texto del pliego: ${falloVigia}.`, { boton: false }), id);
    dictamenUltimo = null;
    const r = await pedirGet(`/api/pliego?op=dictamen&id_proceso=${encodeURIComponent(id)}&perfil=${encodeURIComponent(perfilDictamen())}`);
    respuestaDictamen(r, id, { cambio });
  }

  async function pedirDictamenAlServidor(id, { refrescar = false, esfuerzo = null } = {}) {
    if (dictamenAbort) return;
    const previo = dictamenUltimo;
    if (refrescar && previo) {
      const estado = enCaja("dictamen-estado");
      if (estado) estado.textContent = "Se pedirá un dictamen nuevo a la inteligencia artificial; el anterior se reemplaza.";
    }
    const boton = enCaja("btn-dictamen-pedir");
    const estado = enCaja("dictamen-estado");
    if (boton) { boton.disabled = true; boton.textContent = "Leyendo el pliego…"; }
    if (estado) estado.textContent = "Leyendo el pliego completo. Puede tardar entre uno y tres minutos.";
    /* el botón de cancelar vive en el marcado (oculto) y se enseña mientras dura la lectura */
    const cancelar = enCaja("btn-dictamen-cancelar");
    dictamenAbort = new AbortController();
    if (cancelar) {
      cancelar.classList.remove("hidden");
      if (!cancelar.dataset.cableado) { cancelar.dataset.cableado = "1"; cancelar.addEventListener("click", () => { if (dictamenAbort) dictamenAbort.abort(); }); }
    }
    const inicio = Date.now();
    dictamenReloj = setInterval(() => {
      const s = Math.round((Date.now() - inicio) / 1000);
      if (boton) boton.textContent = s >= 90 ? "Todavía en ello: un pliego largo tarda más." : s >= 30 ? "Sigue leyendo…" : "Leyendo el pliego…";
    }, 5000);
    let r;
    try {
      const resp = await fetch("/api/pliego?op=dictamen", {
        method: "POST", signal: dictamenAbort.signal,
        headers: { "Content-Type": "application/json", "x-historico-token": leerToken() },
        body: JSON.stringify({ id_proceso: id, perfil: perfilDictamen(), refrescar: !!refrescar, ...(esfuerzo ? { esfuerzo } : {}) }),
      });
      let datos = null;
      try { datos = await resp.json(); } catch { datos = null; }
      r = { estado: resp.status, cuerpo: datos };
    } catch (e) {
      r = e && e.name === "AbortError" ? null : { estado: 0, cuerpo: null, red: window.Glosario.fraseDeFallo(e) };
    } finally {
      clearInterval(dictamenReloj); dictamenReloj = null;
      dictamenAbort = null;
      if (cancelar) cancelar.classList.add("hidden");
    }
    if (!r) {
      if (previo) mostrarDictamen(previo, id);
      else pintarCajaDictamen(estadoDictamen("info", "Petición cancelada. Pulse «Pedir el dictamen» cuando quiera leer el pliego."), id);
      return;
    }
    respuestaDictamen(r, id);
  }

  function manejarRespuesta(r) {
    if (r.red) { chip("Sin conexión", {}); return mensaje(r.red, "error"); }
    if (r.estado === 401) { chip("Sin acceso", {}); return mensaje(MSG_401, "error"); }
    if (!r.cuerpo || !r.cuerpo.ok) {
      chip("Error", {});
      return mensaje((r.cuerpo && r.cuerpo.error) || `El servidor respondió ${r.estado}.`, "error");
    }
    if (!r.cuerpo.items || !r.cuerpo.items.length) {
      chip("Sin filas reconocidas", {});
      pintarResultado(r.cuerpo);
      return mensaje(r.cuerpo.mensaje || "No se reconoció ninguna fila de ítem.", "aviso");
    }
    chip(`${r.cuerpo.items.length} ítem(s) extraídos`, {});
    pintarResultado(r.cuerpo);
    mensaje(`Se extrajeron ${r.cuerpo.items.length} ítem(s). Revíselos antes de usarlos.`, "ok");
  }

  async function reintentarConOcr() {
    if (!docPdf) return mensaje("Cargue primero un PDF: el OCR trabaja sobre sus páginas.", "aviso");
    if (contrato && contrato.ocr && contrato.ocr.configurado === false) {
      return mensaje(contrato.ocr.nota || "El OCR no está configurado en este despliegue.", "aviso");
    }
    mensaje(null); avisos(null);
    ocupado(true);
    try {
      /* TANDAS ENCADENADAS. El servidor topa en MAX_PAGINAS_OCR por llamada
         —OCR.space tarda segundos por página y la función tiene 60 s—, así que un
         formulario escaneado de 40 páginas no cabe en una sola invocación. Se
         encadena: cada tanda pide `solo_reconocer` y devuelve su texto, se
         acumula todo, y al final se manda el texto COMPLETO a parsear. Parsear
         cada tanda por separado partiría la tabla y ni los capítulos ni la suma
         del documento cuadrarían. Mismo patrón que /admin.html con la full. */
      const total = docPdf.numPages;
      const tandas = Math.ceil(total / MAX_PAGINAS_OCR);
      const nolegibles = [];
      const fallos = [];
      const trozos = [];

      for (let tanda = 0; tanda < tandas; tanda++) {
        const desde = tanda * MAX_PAGINAS_OCR + 1;
        const hasta = Math.min(desde + MAX_PAGINAS_OCR - 1, total);
        const paginas = [];
        const numerosReales = [];   // el nº de página REAL de cada imagen enviada
        for (let n = desde; n <= hasta; n++) {
          chip(`Rasterizando página ${n} de ${total}…`, { girando: true });
          progreso(n - 1, total, `Preparando página ${n} de ${total} para OCR…`);
          await new Promise((r) => setTimeout(r, 0));
          const img = await rasterizarPagina(docPdf, n);
          if (img) { paginas.push(img); numerosReales.push(n); }
          else nolegibles.push(n);
        }
        if (!paginas.length) continue;

        chip(`Reconociendo páginas ${desde}-${hasta} de ${total} (tanda ${tanda + 1}/${tandas})…`, { girando: true });
        progreso(hasta, total, `Reconociendo páginas ${desde}-${hasta} de ${total}…`);
        const rt = await pedir("/api/pliego?op=extraer-texto", {
          texto_extraido: "", imagenes_base64: paginas, solo_reconocer: true,
        });
        if (rt.red) { progreso(null); chip("Sin conexión", {}); return mensaje(rt.red, "error"); }
        if (rt.estado === 401) { progreso(null); chip("Sin acceso", {}); return mensaje(MSG_401, "error"); }
        if (!rt.cuerpo || !rt.cuerpo.ok) {
          /* Una tanda que falla NO tira el documento entero: se registra y se
             sigue. 35 páginas leídas valen mucho más que un error global — y si
             el problema es la clave o la cuota, `pedir` ya habrá devuelto 401/503
             y se corta arriba. */
          fallos.push(`páginas ${desde}-${hasta}: ${(rt.cuerpo && rt.cuerpo.error) || `error ${rt.estado}`}`);
          continue;
        }
        // el servidor marca las páginas con su índice DENTRO del lote (\f1, \f2…):
        // aquí se re-basan al número real de página del PDF
        if (rt.cuerpo.texto_ocr) trozos.push(renumerarMarcadores(rt.cuerpo.texto_ocr, numerosReales));
        for (const f of (rt.cuerpo.ocr && rt.cuerpo.ocr.fallos) || []) {
          // el índice del fallo también es DENTRO del lote enviado: se traduce
          // por la misma lista, nunca sumando a `desde` (que ignora los descartes)
          const real = numerosReales[Number(f.pagina) - 1];
          fallos.push(`página ${real != null ? real : `? (índice ${f.pagina} del lote ${desde}-${hasta})`}: ${f.error}`);
        }
      }

      if (!trozos.length) {
        progreso(null);
        chip("El OCR no devolvió texto", {});
        avisos(fallos.length ? fallos : null);
        return mensaje(nolegibles.length === total
          ? "Ninguna página cabe en el límite de tamaño del OCR ni en la escala más baja. Extraiga la tabla a mano."
          : "El OCR no devolvió texto de ninguna página.", "error");
      }

      // ahora sí: el texto COMPLETO, parseado de una vez
      chip("Analizando la tabla reconocida…", { girando: true });
      progreso(total, total, "Analizando la tabla…");
      const ctx = contexto();
      const r = await pedir("/api/pliego?op=extraer-texto", {
        texto_extraido: trozos.join("\n"),
        objeto_proceso: ctx.objeto_proceso,
        unspsc: ctx.unspsc,
        precio_base: ctx.precio_base,
      });
      progreso(null);
      manejarRespuesta(r);
      // el texto vino de un OCR: la respuesta dirá `pdf_nativo` porque llegó como
      // texto, así que hay que decirlo aquí o el aviso sobre la tasa de error
      // del OCR no aparecería
      const extra = ["El texto se obtuvo por OCR: la tasa de error es más alta que en un PDF nativo."]
        .concat(nolegibles.length ? [`Páginas que no se pudieron preparar para OCR: ${nolegibles.join(", ")}.`] : [])
        .concat(fallos);
      avisos(extra.concat((r.cuerpo && r.cuerpo.avisos) || []));
    } catch (e) {
      progreso(null);
      chip("Error", {});
      mensaje((e && e.message) || "Error desconocido durante el OCR.", "error");
    } finally {
      ocupado(false);
    }
  }

  function limpiar() {
    filas = []; ultimaRespuesta = null; docPdf = null; nombrePdf = null;
    $("pliego-archivo").value = "";
    $("pliego-url").value = "";
    $("seccion-resultado").classList.add("hidden");
    $("r-items").innerHTML = "";
    $("btn-ocr").disabled = true;
    progreso(null);
    mensaje(null); avisos(null);
    chip("Sin pliego cargado", {});
  }

  $("btn-extraer").addEventListener("click", extraer);
  $("btn-ocr").addEventListener("click", reintentarConOcr);
  $("btn-limpiar").addEventListener("click", limpiar);
  // elegir un archivo descarta la URL y al revés: mezclar las dos vías es la
  // forma más fácil de leer un documento distinto del que se cree
  $("pliego-archivo").addEventListener("change", () => { if ($("pliego-archivo").files.length) $("pliego-url").value = ""; });
  $("pliego-url").addEventListener("input", () => { if ($("pliego-url").value.trim()) $("pliego-archivo").value = ""; });

  /* ══════════ Arranque ══════════
     AL FINAL del IIFE, después de declarar todo lo que estas funciones usan.
     `arrancarPanel` es una declaración de función (se hoistea), así que
     `abrirApp` puede llamarla desde arriba: cuando de verdad se ejecute —al
     pasar el gate— ya estará todo inicializado. Es la lección que costó cara en
     app.js, donde el arranque junto al gate reventaba en la zona muerta temporal
     y la app se quedaba en silencio. */
  function arrancarPanel() {
    chip("Sin pliego cargado", {});
    cargarContrato();
  }
  /* app.js lo llama al abrir la pestaña APU por PRIMERA vez: los elementos ya
     existen (la sección vive en index.html) y no se gasta una petición del
     contrato para quien nunca abre el lector. Va después de declarar todo lo
     que usa — la lección de la zona muerta temporal, intacta. */
  window.__pliegoArrancar = arrancarPanel;
  /* Gancho para la comprobación en navegador real (Chromium con un arnés que
     responde /api/*): permite disparar el vigía —y con él la caja del dictamen—
     sin cargar pdf.js desde un CDN que el arnés no alcanza. No lo usa la app. */
  window.__pliegoVigilar = vigilarPliego;
  /* Mis procesos pide el dictamen de un proceso guardado en SU caja (la guía),
     por el mismo flujo: GET de caché primero; «Pedir el dictamen» va al POST. */
  window.__pliegoDictamenEn = async (caja, id, perfil) => {
    dictamenCaja = caja || null; dictamenPerfil = perfil || null; dictamenUltimo = null;
    try { await cargarDictamen(id); } catch (e) { if (caja) caja.textContent = window.Glosario.mensajeDeFallo(e, "consultar el dictamen"); }
  };
  /* Mis procesos lee los documentos del proceso SIN pasar por el panel (3-sep-2026):
     el mismo pdf.js, el mismo bucle de páginas y los mismos marcadores `\f<n>`, sin
     tocar `docPdf`, el nombre ni la barra del lector. Devuelve el texto y si el
     PDF parece escaneado con los MISMOS umbrales que `extraer` (sin capa de texto
     útil): quien llama lo marca como ilegible en vez de mandar un texto vacío. */
  window.__pliegoLeerPdf = async (datos) => {
    const pdfjs = await cargarPdfJs();
    const doc = await pdfjs.getDocument({ data: datos, isEvalSupported: false }).promise;
    try {
      if (!doc.numPages) throw new Error("El PDF no tiene páginas.");
      const texto = await textoDelPdf(doc, () => {});
      const largo = texto.trim().length;
      const escaneado = largo < MIN_TEXTO_UTIL || largo / doc.numPages < MIN_CARACTERES_POR_PAGINA;
      return { texto, paginas: doc.numPages, escaneado };
    } finally { try { await doc.destroy(); } catch { /* ya liberado */ } }
  };
})();
