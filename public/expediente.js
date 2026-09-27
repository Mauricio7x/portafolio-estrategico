/* public/expediente.js · EL EXPEDIENTE DE UN PROCESO (encargo del dueño, 7-sep-2026)
   ─────────────────────────────────────────────────────────────────────────────
   «Se ve muy feo el diseño, se siente barato, se siente una programación
   simple… la idea es que sea como un EXPEDIENTE: que puedas entrar al proceso y
   poder cargar información, organizar toda la información de la contratación,
   todos los documentos que necesitan; que se vea caro, bien producido, que cada
   uno de los pasos fueron probados y pensados en el usuario final.»

   Hasta hoy no había dónde ENTRAR: la pestaña aplanaba todo en una lista de
   tarjetas con tres niveles de pliegue, ocho fondos de color y la cifra con la
   que se fija un precio metida en una línea gris de 12 px. Este módulo pinta la
   pantalla que faltaba: el expediente de UN proceso.

   ═══ DE DÓNDE SALE LA FORMA (no es gusto: es el expediente que ya existe) ═══
   El expediente electrónico está normado, y su pieza central no son los
   archivos: es el ÍNDICE. En Colombia el Archivo General (Acuerdo 003 de 2015)
   y el formato de índice electrónico que publica la Rama Judicial fijan una
   tabla con folio consecutivo —número, nombre, fecha, páginas, formato, tamaño,
   origen y observaciones— ordenada cronológicamente. Esa tabla es exactamente
   la lista de documentos que hacía falta, y copiarla es lo que hace que la
   pantalla se sienta oficial sin inventar nada. El corte «de la entidad» /
   «suyos» es el mismo que hacen los tableros de licitación que atienden a este
   usuario.

   ═══ LAS SEIS DECISIONES QUE NO HAY QUE RE-APRENDER ═══

   1. EL EXPEDIENTE ES EL ÍNDICE, NO LOS BYTES. La aplicación NO se queda con el
      archivo: una función de Vercel corta en 4,5 MB y un pliego de obra pesa
      más. Se guarda el REGISTRO (qué es, en qué estado está, cuándo vence, cómo
      se llamaba, cuántas páginas tenía) y el TEXTO que se le pudo leer, que es
      lo que la aplicación sabe usar. **Y se le dice al usuario, en la pantalla,
      no en una nota al pie**: prometer un archivador que no existe sería la
      peor clase de mentira de este producto.
   2. UNA COSA GRANDE POR PANTALLA. El nombre del proceso, en el serif del
      sistema. Las cifras, jamás en serif y siempre tabulares.
   3. TRES COLORES Y UN SOLO RELLENO. La tinta, el acento y un semántico por
      elemento; el único fondo de color de la pantalla es la cuenta atrás del
      cierre a tres días o menos. El estado va como punto + palabra sobre
      superficie neutra. Cuando todo es de color, nada resalta.
   4. NINGUNA SECCIÓN A MÁS DE UN GESTO. La navegación interna sustituye a los
      pliegues anidados, y usa `aria-current`, nunca `role="tab"`: la aplicación
      ya tiene dos barras de pestañas y una tercera mentiría sobre lo que es.
   5. AQUÍ NO SE CALCULA NI UN DÍA NI UNA CIFRA. Todo —hitos, plazos, requisitos,
      la guía— llega resuelto del servidor. Este módulo ordena y pinta.
   6. LOS TIPOS DE DOCUMENTO NO SE INVENTAN. Los de la entidad son los que
      `lib/documentos_proceso` ya clasifica; los suyos son los requisitos que
      `lib/guia_proceso` ya sabe pedir para ESE proceso, más «otro documento»
      con el nombre que el usuario le ponga. Una taxonomía inventada nombraría
      papeles que nadie pidió.

   Expone `window.Expediente`; también sirve en Node (las pruebas lo requieren). */
(function (raiz, fabrica) {
  const api = fabrica();
  if (typeof module === "object" && module.exports) module.exports = api;
  else raiz.Expediente = api;
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const miles = (n) => Number(n || 0).toLocaleString("es-CO", { maximumFractionDigits: 0 });

  /* Solo http/https. `esc()` impide salir del atributo pero NO valida el
     ESQUEMA, y `urlproceso` la escribe QUIEN PUBLICA en SECOP II: un
     `javascript:…` ahí sería un XSS de un clic en el origen de la aplicación,
     donde viven la sesión y el perfil guardado. Sin esquema válido no se pinta
     el enlace: la ausencia no se rellena. Vive duplicada en app.js y
     portada.js porque son módulos de navegador independientes; la suite las
     EXTRAE del fuente —las tres— y las corre contra la misma batería, que es
     el censo que impide que una diverja. */
  const urlSegura = (u) => (/^https?:\/\//i.test(String(u ?? "").trim()) ? String(u).trim() : null);

  /* EL ENLACE AL PROCESO EN SECOP II. Dos orígenes y un orden que no es
     arbitrario: primero el de la guía, que sale de la fila VIVA del corpus, y
     si el proceso ya no está ahí, el de la foto que se guardó el día que el
     usuario lo guardó. Un dato PUBLICADO gana a uno viejo; ninguno de los dos
     se inventa a partir del id. */
  function enlaceSecop(p) {
    const o = (p && p.guia && p.guia.obra) || null;   // `guia.obra.enlace_secop`, no `guia.enlace_secop`
    const pr = (p && p.proceso) || {};
    return urlSegura((o && o.enlace_secop) || pr.url || null);
  }

  /* Los dos módulos vecinos se resuelven DIFERIDO, dentro de la función: un
     global en el nivel superior se evaluaría al cargar el archivo. */
  function raizCalendario() {
    if (typeof window !== "undefined" && window.Calendario) return window.Calendario;
    try { return require("./calendario.js"); } catch { return null; }
  }
  function raizCasillero() {
    if (typeof window !== "undefined" && window.Casillero) return window.Casillero;
    try { return require("./casillero.js"); } catch { return null; }
  }
  function raizGlosario() {
    if (typeof window !== "undefined" && window.Glosario) return window.Glosario;
    try { return require("./glosario.js"); } catch { return null; }
  }
  /* El nombre del proceso llega GRITADO de SECOP II casi siempre. No se
     reescribe (rompería siglas y códigos de abscisa); se marca para que el CSS
     le dé el interletraje que pide una versal. Si el glosario no cargó, se
     pinta como hasta hoy: esto es vestido, nunca dato. */
  function claseDeCaja(t) { const G = raizGlosario(); return G && G.claseDeCaja ? G.claseDeCaja(t) : ""; }

  /* ══════════════════════ LAS SECCIONES DEL EXPEDIENTE ══════════════════════
     El orden es el del trabajo: primero qué es y qué hay que hacer, después los
     papeles, después lo que el pliego exige, después las fechas, y al final lo
     que solo importa cuando ya cerró. */
  const SECCIONES = Object.freeze([
    Object.freeze({ id: "resumen", etiqueta: "Resumen" }),
    Object.freeze({ id: "documentos", etiqueta: "Documentos" }),
    Object.freeze({ id: "exige", etiqueta: "Lo que exige" }),
    Object.freeze({ id: "fechas", etiqueta: "Fechas" }),
    Object.freeze({ id: "cuaderno", etiqueta: "Cuaderno" }),
    Object.freeze({ id: "competencia", etiqueta: "Quiénes se presentaron" }),
  ]);
  const seccionValida = (s) => (SECCIONES.some((x) => x.id === s) ? s : "resumen");

  /* ══════════════════════ LA CABECERA ══════════════════════ */

  /* La cifra de la cabecera va EXACTA (23-sep-2026) y a menos de 640 px le toca
     un tercio de la fila: «$ 1.598.000» no cabe en 96 px y, como `overflow-wrap`
     se hereda de la pestaña, el navegador la partía donde se salía, a mitad de
     un grupo de miles («1.598.0» / «00», que se lee como un decimal; medido en
     Chromium a 390 px). Es el mismo remedio de la ganancia de la tarjeta
     (app.js, `cifraPartible`): se le ofrece dónde partir DESPUÉS de cada punto
     de miles, y baja de línea por grupos enteros. `<wbr>` no pinta nada ni
     cambia lo que se copia. Recibe el valor SIN escapar y lo escapa aquí. */
  const cifraPartible = (valor) => esc(valor).replace(/\./g, ".<wbr>");

  /* Las cifras de la cabecera son SIEMPRE las mismas tres, en el mismo sitio:
     con cuánto se compite, cuánto falta y cómo va su papeleo. Una cifra que
     cambia de sitio según el proceso obliga a buscarla cada vez. Sin dato se
     dice; nunca un cero que parezca una medición. */
  function cifrasDe(p) {
    const K = raizCasillero();
    const pr = p.proceso || {};
    const dinero = K ? K.presupuestoDelProceso(pr.presupuesto_cop) : { texto: "—", titulo: "" };
    const dr = p.documentos_resumen || {};
    const cierre = p.cerrado === true ? { valor: "Cerró", rotulo: "Entrega de la oferta", urgente: false }
      : p.dias_para_cierre == null ? { valor: "Sin fecha", rotulo: "Entrega de la oferta", urgente: false }
        : p.dias_para_cierre === 0 ? { valor: "Hoy", rotulo: "Entrega de la oferta", urgente: true }
          : p.dias_para_cierre === 1 ? { valor: "Mañana", rotulo: "Entrega de la oferta", urgente: true }
            : { valor: `${miles(p.dias_para_cierre)} días`, rotulo: "Para entregar la oferta", urgente: p.dias_para_cierre <= 3 };
    return [
      { valor: dinero.texto, rotulo: "Presupuesto oficial", titulo: dinero.titulo, urgente: false },
      { ...cierre, titulo: pr.fecha_cierre ? String(pr.fecha_cierre).slice(0, 10) : "" },
      dr.cuentan
        ? { valor: `${miles(dr.listos)} de ${miles(dr.cuentan)}`, rotulo: "Papeles listos", titulo: "Los documentos que marcó como listos", urgente: !!(dr.vencidos || dr.vencen_antes_del_cierre) }
        : { valor: "Sin abrir", rotulo: "Su papeleo", titulo: "Todavía no ha registrado ningún documento en este expediente", urgente: false },
    ];
  }

  function htmlCabecera(p, { estados = {}, seccion = "resumen", conteos = {}, carpetas = [] } = {}) {
    const pr = p.proceso || {};
    const etapa = estados[p.estado] || p.estado_etiqueta || "";
    const cifras = cifrasDe(p);
    const opciones = Object.keys(estados).length ? Object.entries(estados) : [];
    const secop = enlaceSecop(p);
    return `<div class="exp-cabecera">
      <button type="button" class="exp-volver" data-exp-volver="1">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m15 18-6-6 6-6"/></svg>
        Mis procesos
      </button>
      <h2 class="exp-nombre ${claseDeCaja(pr.nombre || p.id)}">${esc(pr.nombre || p.id)}</h2>
      <p class="exp-entidad">${esc(pr.entidad || "Entidad no publicada")}${pr.departamento ? ` &middot; ${esc(pr.departamento)}` : ""} &middot; ${esc(p.id)}</p>
      <div class="exp-acciones">
        ${opciones.length ? `<label class="cas-carpeta-sel"><span class="cas-carpeta-rotulo">Etapa</span>
          <select class="control-select cas-carpeta-select" data-seg-estado="${esc(p.id)}" aria-label="Etapa de este proceso en su seguimiento">
            ${opciones.map(([k, v]) => `<option value="${esc(k)}"${p.estado === k ? " selected" : ""}>${esc(v)}</option>`).join("")}
          </select></label>` : ""}
        ${etapa && !opciones.length ? `<span class="exp-estado"><span class="exp-punto" aria-hidden="true">&#9679;</span>${esc(etapa)}</span>` : ""}
        <label class="cas-carpeta-sel"><span class="cas-carpeta-rotulo">Carpeta</span>
          <select class="control-select cas-carpeta-select" data-seg-carpeta="${esc(p.id)}" aria-label="Carpeta en la que guarda este proceso">
            <option value="">Sin carpeta</option>
            ${(carpetas || []).map((c) => `<option value="${esc(c.id)}"${p.carpeta === c.id ? " selected" : ""}>${esc(c.nombre)}</option>`).join("")}
          </select></label>
        ${secop
          ? `<a class="exp-boton exp-boton-suave exp-ir-secop" href="${esc(secop)}" target="_blank" rel="noopener noreferrer"
               title="Abre el proceso en SECOP II, en una pestaña nueva">Abrir en SECOP II<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 17 17 7"/><path d="M9 7h8v8"/></svg></a>`
          : `<span class="exp-seccion-nota">La entidad no publicó el enlace a este proceso en SECOP II.</span>`}
      </div>
      <dl class="exp-cifras">
        ${cifras.map((c) => `<div class="exp-cifra${c.urgente ? " exp-cifra-urgente" : ""}"${c.titulo ? ` title="${esc(c.titulo)}"` : ""}>
          <dd class="exp-cifra-valor num">${cifraPartible(c.valor)}</dd><dt class="exp-cifra-rotulo">${esc(c.rotulo)}</dt></div>`).join("")}
      </dl>
      <nav class="exp-secciones" aria-label="Secciones del expediente">
        ${SECCIONES.map((s) => `<button type="button" class="exp-seccion-btn" data-exp-seccion="${esc(s.id)}"${seccion === s.id ? ' aria-current="page"' : ""}>${esc(s.etiqueta)}${conteos[s.id] ? `<span class="exp-seccion-n">${miles(conteos[s.id])}</span>` : ""}</button>`).join("")}
      </nav>
    </div>`;
  }

  /* ══════════════════════ EL ÍNDICE DE DOCUMENTOS ══════════════════════
     Dos orígenes y un solo folio corrido, como en un expediente de verdad:
     primero lo de la entidad (que es lo que rige) y después lo suyo. El folio
     no es decoración: es lo que separa un expediente de una carpeta. */

  const PESOS = [[1 << 30, "GB"], [1 << 20, "MB"], [1 << 10, "kB"]];
  function pesoLegible(bytes) {
    const n = Number(bytes);
    if (!Number.isFinite(n) || n <= 0) return null;
    for (const [u, s] of PESOS) if (n >= u) return `${(n / u).toFixed(n / u >= 10 ? 0 : 1).replace(".", ",")} ${s}`;
    return `${miles(n)} B`;
  }
  const formatoDe = (nombre) => { const m = /\.([a-z0-9]{1,5})$/i.exec(String(nombre || "")); return m ? m[1].toUpperCase() : null; };

  /* Los documentos DE LA ENTIDAD, tal como los sirve la guía (`guia.documentos`
     de lib/documentos_proceso): lo leído, lo que está por leer y lo que no se
     pudo leer, con su motivo. No se reordena por nombre: manda el orden del
     índice, que es el que fija el tipo documental. */
  function documentosEntidad(p) {
    const d = (p.guia && p.guia.documentos) || null;
    if (!d) return [];
    const fila = (x, estado) => ({
      origen: "entidad", id: x.id_documento || x.id || null,
      nombre: x.nombre || x.tipo_legible || "Documento del proceso",
      tipo: x.tipo_legible || null, fecha: x.fecha_carga || x.leido_el || null,
      paginas: x.paginas != null ? x.paginas : null, formato: formatoDe(x.nombre), peso: pesoLegible(x.tamano),
      estado, observacion: x.motivo || null, url: x.url || null,
    });
    return [
      ...(d.leidos || []).map((x) => fila(x, "leido")),
      ...(d.por_leer || []).map((x) => fila(x, "por_leer")),
      ...(d.ilegibles || []).map((x) => fila(x, "ilegible")),
      ...(d.no_legibles || []).map((x) => fila(x, "no_legible")),
      ...(d.formatos || []).map((x) => fila(x, "formato")),
    ];
  }

  const ESTADO_ENTIDAD = {
    leido: { clase: "exp-estado-ok", texto: "Leído" },
    por_leer: { clase: "exp-estado-nd", texto: "Por leer" },
    ilegible: { clase: "exp-estado-falta", texto: "No se pudo leer" },
    no_legible: { clase: "exp-estado-nd", texto: "No es un PDF con texto" },
    formato: { clase: "exp-estado-nd", texto: "Formato para llenar" },
  };

  function htmlFilaDoc(f, folio) {
    const meta = [f.tipo, f.formato, f.paginas != null ? `${miles(f.paginas)} ${f.paginas === 1 ? "página" : "páginas"}` : null, f.peso,
      f.fecha ? String(f.fecha).slice(0, 10) : null, f.observacion].filter(Boolean).join(" · ");
    const e = ESTADO_ENTIDAD[f.estado] || ESTADO_ENTIDAD.por_leer;
    /* un documento de Word de la entidad se puede LLENAR con los datos de la
       empresa (27-sep-2026, lib/formato_entidad): la carta de presentación y
       los formatos vienen así */
    const llenable = f.origen === "entidad" && f.url && f.formato === "DOCX";
    return `<div class="exp-doc">
      <span class="exp-doc-folio num">${miles(folio)}</span>
      <span class="exp-doc-nombre">${esc(f.nombre)}</span>
      <span class="exp-doc-meta">${esc(meta || "Sin más datos publicados")}</span>
      <span class="exp-doc-mandos"><span class="exp-estado ${e.clase}"><span class="exp-punto" aria-hidden="true">&#9679;</span>${esc(e.texto)}</span>${llenable
        ? `<button type="button" class="exp-boton" data-seg-llenar="${esc(f.url)}" data-seg-llenar-nombre="${esc(f.nombre)}" data-seg-llenar-n="${miles(folio)}">Llenar con sus datos</button>` : ""}</span>
    </div>${llenable ? `<p class="exp-seccion-nota hidden" data-seg-llenar-estado="${miles(folio)}" role="status"></p>` : ""}`;
  }

  /* Los documentos SUYOS. Cada uno lleva su estado y, si el usuario la anotó,
     la fecha en que vence — y ahí está el único juicio que esta pantalla emite,
     porque es aritmética sobre dos fechas conocidas y no una norma inventada:
     un documento que caduca ANTES del cierre no le sirve, y se dice. */
  function htmlFilaDocSuyo(d, folio, { estadosDoc = {}, hoy = null, cierre = null } = {}) {
    const C = raizCalendario();
    const dia = (f) => (f && C ? C.fechaLegibleAnio(f) : f);
    const vencido = d.vence && hoy && d.vence < hoy;
    const antes = d.vence && cierre && !vencido && d.vence < String(cierre).slice(0, 10);
    const clase = d.estado === "listo" && !vencido && !antes ? "exp-estado-ok"
      : vencido || antes ? "exp-estado-mal"
        : d.estado === "no_aplica" ? "exp-estado-nd" : "exp-estado-falta";
    /* LA PALABRA TIENE QUE DECIR LO MISMO QUE EL COLOR. Un documento que el
       usuario marcó «Listo» pero que caduca antes del cierre salía con la
       palabra «Listo» y el punto en rojo: dos afirmaciones contrarias en el
       mismo chip, y la que se lee es la palabra. Cuando hay un problema con la
       fecha, la palabra es el problema. */
    const palabra = vencido ? "Vencido" : antes ? "Vence antes del cierre" : (estadosDoc[d.estado] || d.estado);
    const meta = [
      d.archivo ? `${esc(d.archivo.nombre || "archivo")}${d.archivo.paginas ? ` · ${miles(d.archivo.paginas)} ${d.archivo.paginas === 1 ? "página" : "páginas"}` : ""}${d.archivo.con_texto ? " · sí traía texto" : " · sin texto legible"}` : "Sin archivo cargado",
      d.vence ? (vencido ? `<b>Venció el ${esc(dia(d.vence))}</b>` : antes ? `<b>Vence el ${esc(dia(d.vence))}, antes del cierre</b>` : `Vence el ${esc(dia(d.vence))}`) : null,
      d.nota ? esc(d.nota) : null,
    ].filter(Boolean).join(" · ");
    return `<div class="exp-doc" data-exp-doc="${esc(d.id)}">
      <span class="exp-doc-folio num">${miles(folio)}</span>
      <span class="exp-doc-nombre">${esc(d.nombre || "Documento sin nombre")}</span>
      <span class="exp-doc-meta">${meta}</span>
      <span class="exp-doc-mandos">
        <span class="exp-estado ${clase}"><span class="exp-punto" aria-hidden="true">&#9679;</span>${esc(palabra)}</span>
        <button type="button" class="exp-doc-enlace" data-exp-doc-editar="${esc(d.id)}">Cambiar</button>
        <button type="button" class="exp-doc-enlace" data-exp-doc-quitar="${esc(d.id)}">Quitar</button>
      </span>
    </div>`;
  }

  /* Los tipos que se le OFRECEN al usuario para clasificar un documento suyo
     salen de los requisitos que la guía ya calculó para ESTE proceso: si el
     pliego pide garantía de seriedad, ahí está; si no, no se nombra. Más
     «Otro documento», con el nombre que él le ponga. */
  function tiposSuyos(p) {
    const rs = (p.guia && p.guia.requisitos) || [];
    const vistos = new Set();
    const out = [];
    for (const r of rs) {
      const c = String(r.clave || "").trim();
      if (!c || vistos.has(c)) continue;
      vistos.add(c);
      out.push({ clave: c, etiqueta: r.titulo || c });
    }
    out.push({ clave: "otro", etiqueta: "Otro documento" });
    return out;
  }

  function htmlDocumentos(p, { estadosDoc = {}, hoy = null, topes = {} } = {}) {
    const deEntidad = documentosEntidad(p);
    const suyos = p.documentos || [];
    const pr = p.proceso || {};
    const tope = topes.documentos || 30;
    let folio = 0;
    const tipos = tiposSuyos(p);
    const docsEnt = deEntidad.length
      ? `<div class="exp-docs">${deEntidad.map((f) => htmlFilaDoc(f, ++folio)).join("")}</div>`
      : `<div class="exp-vacio"><p class="exp-vacio-titulo">Todavía no se han encontrado los documentos de la entidad</p>
          <p class="exp-vacio-texto">La aplicación los busca en SECOP II y los lee sola. Si el proceso es anterior a 2025 o la entidad no los publicó ahí, cargue el pliego usted mismo y todo lo demás funciona igual.</p>
          <button type="button" class="exp-boton exp-boton-suave" data-seg-docs-leer="${esc(p.id)}">Buscar los documentos ahora</button></div>`;
    const docsSuyos = suyos.length
      ? `<div class="exp-docs">${suyos.map((d) => htmlFilaDocSuyo(d, ++folio, { estadosDoc, hoy, cierre: pr.fecha_cierre })).join("")}</div>`
      : `<div class="exp-vacio"><p class="exp-vacio-titulo">Su carpeta de este proceso está vacía</p>
          <p class="exp-vacio-texto">Anote aquí los papeles que tiene que reunir para presentarse. De cada uno puede decir en qué estado va y cuándo vence, y la aplicación le avisa antes de que se le pase.</p></div>`;
    /* ── LO QUE NO EXISTE NO VA PRIMERO NI OCUPA UNA TARJETA (13-sep-2026) ──
       Medido en la pantalla llena: con los documentos de la entidad todavía sin
       encontrar —que es lo normal el día que se guarda un proceso—, su sección
       vacía se comía 330 px de tarjeta blanca ANTES de las seis filas que el
       usuario venía a ver, y las dos cajas eran idénticas. Dos correcciones, y
       ninguna inventa material nuevo en la pantalla:
       · la sección sin nada dentro baja a nivel MENOR (sin caja, un filete), y
       · si está vacía y la suya no, se pinta DESPUÉS.
       Cuando las dos tienen documentos el orden es el de siempre —la entidad
       primero, porque su índice es el que numera los folios y alimenta el resto
       del expediente—: esto no reordena el trabajo, solo aparta un hueco. */
    const hayEnt = deEntidad.length > 0;
    const secEnt = `<section class="exp-seccion${hayEnt ? "" : " exp-seccion-menor"}">
        <h3 class="exp-seccion-titulo">Documentos de la entidad</h3>
        <p class="exp-seccion-nota">Lo que la entidad publicó en SECOP II, en el orden del índice.</p>
        ${docsEnt}
        <div data-seg-docs="${esc(p.id)}"></div>
      </section>`;
    const secSuyos = `<section class="exp-seccion">
        <h3 class="exp-seccion-titulo">Sus documentos</h3>
        <p class="exp-seccion-nota">Los papeles que usted tiene que reunir. <b>La aplicación no se queda con el archivo ni con lo que dice</b>: solo con su registro.</p>
        ${docsSuyos}
        ${suyos.length >= tope
          ? `<p class="exp-seccion-nota">Llegó al tope de ${miles(tope)} documentos en este proceso. Quite alguno que ya no necesite para anotar otro.</p>`
          : `<div class="exp-soltar" data-exp-soltar="${esc(p.id)}">
              <p>Anote un documento aunque todavía no lo tenga. Si ya lo tiene, arrastre el PDF aquí o búsquelo en su computador.</p>
              <p class="exp-seccion-nota">Del PDF se anotan las páginas, el nombre y si traía texto o era un escaneo. Ni el archivo ni lo que dice salen de su computador.</p>
              <div class="exp-soltar-mandos">
                <button type="button" class="exp-boton" data-exp-doc-nuevo="${esc(p.id)}">Anotar un documento</button>
                <button type="button" class="exp-boton exp-boton-suave" data-exp-doc-archivo="${esc(p.id)}">Elegir un archivo</button>
              </div>
            </div>
            <div class="exp-alta hidden" data-exp-alta="${esc(p.id)}">
              <label class="exp-campo"><span class="exp-campo-rotulo">Qué documento es</span>
                <select class="control-select" data-exp-alta-clave="${esc(p.id)}" aria-label="Qué documento es">
                  ${tipos.map((t) => `<option value="${esc(t.clave)}">${esc(t.etiqueta)}</option>`).join("")}
                </select></label>
              <label class="exp-campo"><span class="exp-campo-rotulo">Cómo lo llama usted</span>
                <input type="text" class="control-campo" maxlength="${topes.nombre_documento || 120}" placeholder="Por ejemplo: póliza Seguros del Estado 12345" data-exp-alta-nombre="${esc(p.id)}" aria-label="Cómo lo llama usted"></label>
              <label class="exp-campo"><span class="exp-campo-rotulo">Cómo va</span>
                <select class="control-select" data-exp-alta-estado="${esc(p.id)}" aria-label="Cómo va este documento">
                  ${Object.entries(estadosDoc).map(([k, v]) => `<option value="${esc(k)}">${esc(v)}</option>`).join("")}
                </select></label>
              <label class="exp-campo"><span class="exp-campo-rotulo">Vence el (opcional)</span>
                <input type="date" class="control-campo" data-exp-alta-vence="${esc(p.id)}" aria-label="Fecha en que vence este documento"></label>
              <div class="exp-campo-acciones">
                <button type="button" class="exp-boton" data-exp-alta-guardar="${esc(p.id)}">Guardar el documento</button>
                <button type="button" class="exp-boton exp-boton-suave" data-exp-alta-cancelar="${esc(p.id)}">Cancelar</button>
              </div>
            </div>`}
        <p class="exp-seccion-nota" data-exp-doc-mensaje="${esc(p.id)}" role="status"></p>
      </section>`;
    /* lo lleno primero cuando lo otro es un hueco; si las dos están vacías se
       conserva el orden de siempre, que es el que explica de dónde salen los
       folios */
    return (!hayEnt && suyos.length) ? secSuyos + secEnt : secEnt + secSuyos;
  }

  /* ══════════════════════ LAS FECHAS ══════════════════════
     Una sola línea de tiempo con lo de la entidad y lo suyo, en orden, y lo
     que ya pasó en gris. Cada fecha dice DE QUIÉN es: nunca se presenta una
     anotación propia como una fecha publicada por la entidad. */
  function lineaDeTiempo(p) {
    const suyas = (p.fechas_suyas || []).map((f) => ({ fecha: f.fecha, etiqueta: f.texto, origen: "usted", tipo: f.tipo }));
    const hitos = (p.hitos || []).map((h) => ({ fecha: String(h.fecha).slice(0, 10), etiqueta: h.etiqueta, origen: h.origen || "dataset", evidencia: h.evidencia || null }));
    return [...hitos, ...suyas].sort((a, b) => String(a.fecha).localeCompare(String(b.fecha)));
  }
  const FUENTE_FECHA = {
    usted: "lo anotó usted", pliego: "fecha del cronograma del pliego",
    calculado: "fecha calculada por la aplicación, no publicada", dataset: "fecha publicada en SECOP II",
  };
  function htmlFechas(p, { hoy = null } = {}) {
    const C = raizCalendario();
    const fs = lineaDeTiempo(p);
    if (!fs.length) {
      return `<section class="exp-seccion"><h3 class="exp-seccion-titulo">Fechas</h3>
        <div class="exp-vacio"><p class="exp-vacio-titulo">Este proceso no publica ninguna fecha</p>
        <p class="exp-vacio-texto">Cuando la entidad publique el cronograma, o cuando usted anote una fecha suya, aparecerán aquí y en el calendario de Mis procesos.</p></div></section>`;
    }
    const filas = fs.map((f) => {
      const pasada = hoy && f.fecha < hoy;
      const esHoy = hoy && f.fecha === hoy;
      return `<div class="exp-doc${pasada ? " exp-fecha-pasada" : ""}">
        <span class="exp-doc-folio num">${esc(C ? C.fechaLegible(f.fecha) : f.fecha)}</span>
        <span class="exp-doc-nombre">${esc(f.etiqueta)}</span>
        <span class="exp-doc-meta">${esc(FUENTE_FECHA[f.origen] || FUENTE_FECHA.dataset)}${f.evidencia ? ` · ${esc(f.evidencia)}` : ""}</span>
        <span class="exp-doc-mandos">${esHoy ? '<span class="exp-estado exp-urgente">Hoy</span>' : pasada ? '<span class="exp-estado exp-estado-nd"><span class="exp-punto" aria-hidden="true">&#9679;</span>Pasó</span>' : ""}</span>
      </div>`;
    }).join("");
    return `<section class="exp-seccion">
      <h3 class="exp-seccion-titulo">Fechas</h3>
      <p class="exp-seccion-nota">El cronograma de la entidad y las fechas que puso usted, en orden. Cada una dice de dónde sale.</p>
      <div class="exp-docs">${filas}</div>
      <div class="exp-campo-acciones">
        <button type="button" class="exp-boton exp-boton-suave" data-seg-ics="${esc(p.id)}">Descargar estas fechas (calendario)</button>
      </div>
    </section>`;
  }

  /* ══════════════════════ LOS DATOS CLAVE ══════════════════════
     Rejilla rótulo/valor, no cinco hechos concatenados con puntos medios. Todo
     sale de `guia.obra`, que lo resolvió el servidor. */
  function htmlDatosClave(p) {
    const o = (p.guia && p.guia.obra) || null;
    const pr = p.proceso || {};
    const K = raizCasillero();
    const dato = (rotulo, valor) => (valor ? `<div class="exp-dato"><dt>${esc(rotulo)}</dt><dd>${valor}</dd></div>` : "");
    if (!o) {
      return `<section class="exp-seccion"><h3 class="exp-seccion-titulo">El proceso en una mirada</h3>
        <dl class="exp-datos">
          ${dato("Entidad", esc(pr.entidad || ""))}
          ${dato("Dónde", esc(pr.departamento || ""))}
          ${dato("Presupuesto oficial", K ? esc(K.presupuestoDelProceso(pr.presupuesto_cop).texto) : "")}
          ${dato("Modalidad", esc(pr.modalidad || ""))}
        </dl>
        <p class="exp-seccion-nota">La guía completa de este proceso se arma cuando la aplicación lee sus documentos. Si acaba de guardarlo, espere unos segundos.</p></section>`;
    }
    const z = (o.donde && o.donde.zona) || {};
    const adj = o.como_lo_adjudican || {};
    /* «Cuánto» es el MISMO presupuesto que la cabecera, con la MISMA regla
       (`presupuestoDelProceso`, 23-sep-2026): el texto que manda el servidor
       (`cuanto.legible`) llegó a decir «$2 millones» bajo «$ 1.598.000», y una
       guía guardada antes del arreglo lo seguiría trayendo. Sin presupuesto (la
       ausencia se descarta antes de convertir: `Number(null)` vale 0) queda el
       texto del servidor, que entonces es null y la fila no se pinta. */
    const cuanto = o.cuanto || {};
    const conPresupuesto = cuanto.presupuesto_cop != null && cuanto.presupuesto_cop !== "" && Number(cuanto.presupuesto_cop) > 0;
    const cuantoTexto = conPresupuesto && K ? K.presupuestoDelProceso(cuanto.presupuesto_cop).texto : cuanto.legible || null;
    return `<section class="exp-seccion">
      <h3 class="exp-seccion-titulo">El proceso en una mirada</h3>
      <dl class="exp-datos">
        ${dato("Qué es", esc(o.que_es || "") + (o.tipo_trabajo_legible ? ` <span class="exp-seccion-nota">${esc(o.tipo_trabajo_legible)}</span>` : ""))}
        ${dato("Dónde", [o.donde && o.donde.entidad, o.donde && o.donde.ciudad, o.donde && o.donde.departamento].filter(Boolean).map(esc).join(" · ") + (z.etiqueta ? `<span class="exp-seccion-nota">${esc(z.etiqueta)}${z.km != null && z.km > 0 ? ` · unos ${miles(z.km)} km desde ${esc(z.desde || "su base")}` : ""}</span>` : ""))}
        ${dato("Cuánto", cuantoTexto ? esc(cuantoTexto) + (cuanto.tamano ? ` <span class="exp-seccion-nota">${esc(cuanto.tamano)}</span>` : "") : "")}
        ${dato("Plazo", o.plazo && o.plazo.legible ? esc(o.plazo.legible) : "")}
        ${dato("Cómo pagan", [o.pago && o.pago.anticipo_legible, o.pago && o.pago.forma_precio === "global" ? "A precio global: el riesgo de cantidades es suyo" : o.pago && o.pago.forma_precio === "unitarios" ? "A precios unitarios: las cantidades son un estimativo" : null].filter(Boolean).map(esc).join(". "))}
        ${dato("Cómo lo adjudican", (adj.nombre ? `<b>${esc(adj.nombre)}.</b> ` : "") + esc(adj.explicacion || ""))}
      </dl>
    </section>`;
  }

  /* El SIGUIENTE PASO, en una frase y arriba del todo: un contratista no
     técnico necesita una instrucción, no un tablero. Sale del primer paso de la
     guía que todavía no ha pasado; si no hay guía todavía, se dice qué falta
     para tenerla en vez de callar. */
  function htmlSiguientePaso(p, { hoy = null } = {}) {
    const pasos = (p.guia && p.guia.pasos) || [];
    const C = raizCalendario();
    const proximo = pasos.filter((s) => s.cuando).map((s) => ({ ...s, dia: String(s.cuando).slice(0, 10) }))
      .sort((a, b) => a.dia.localeCompare(b.dia)).find((s) => !hoy || s.dia >= hoy) || pasos[0] || null;
    if (!proximo) return "";
    return `<section class="exp-seccion">
      <h3 class="exp-seccion-titulo">Lo siguiente que tiene que hacer</h3>
      <p class="exp-seccion-cuerpo"><b>${esc(proximo.titulo || "")}</b>${proximo.dia ? ` &middot; ${esc(C ? C.fechaLegibleAnio(proximo.dia) : proximo.dia)}` : ""}</p>
      <p class="exp-seccion-nota">${esc(proximo.detalle || "")}</p>
    </section>`;
  }

  /* ══════════ CON QUIÉN CONVIENE IR (11-sep-2026, encargo del dueño) ══════════
     «Que al momento de dar guardar en Mis procesos me diga con quién conviene
     más y la justificación técnica simple.» El veredicto se congeló en el
     servidor el día del guardado (lib/handlers/perfil/seguimiento.congelarSocio)
     y aquí SOLO se pinta: recalcular en pantalla sería un segundo juicio que
     acabaría contradiciendo al primero.

     LO QUE HAY QUE VER VA ARRIBA Y LO QUE HAY QUE TOCAR VA PLEGADO: la frase y
     el reparto, a la vista; el porqué, en un pliegue.

     SI EL PLIEGO LEÍDO LO DESMIENTE (`contraste_pliego`, 26-sep-2026): el
     consejo congelado se midió sin el pliego; con los códigos que pide, puede
     no valer. Va debajo de la frase, a la vista y en ámbar, con su cifra.

     LO QUE ESTE BLOQUE NUNCA DICE: que con un socio SE CUMPLE el pliego. El
     recomendador no lo afirma y la pantalla tampoco puede. Cuando el socio
     mejora pero no alcanza, se dice en la MISMA frase, no en el pliegue. */
  function htmlConQuien(p) {
    const s = p && p.socio;
    if (!s || !s.recomendacion) return "";
    const r = s.recomendacion;
    const solo = r.tipo === "solo";
    const ninguna = r.tipo === "ninguna_sirve";
    // «solo_con_anticipo»: la capacidad solo alcanza con un anticipo que SECOP II no publica (26-sep-2026)
    // «solo_si_no_la_piden»: no le alcanza la capacidad, pero no consta que el proceso la pida (27-sep-2026)
    const titulo = solo ? (r.solo_con_anticipo ? "Puede ir solo si el pliego da anticipo" : r.solo_si_no_la_piden ? "Puede ir solo si el pliego no pide capacidad de contratación" : "Puede ir solo") : ninguna ? "Con ninguna de las dos alcanza" : `Conviene con ${r.nombre || r.socio || "un socio"}`;
    /* EL REPARTO NO SE REPITE (medido en Chromium, 11-sep-2026): la frase del
       servidor ya lo trae dentro —«Reparto sugerido: 80 % usted, 20 % …»— y
       pintarlo otra vez debajo dejaba la misma línea dos veces seguidas, que es
       exactamente el ruido que el dueño pidió quitar. La frase manda: es de
       donde sale el resto del consejo y no puede haber dos redacciones del mismo
       número que puedan divergir. */
    const avisos = (s.avisos || []).filter((a) => a && a.frase);
    const porque = [
      ...(r.reparto && r.reparto.porque ? [r.reparto.porque] : []),
      ...(r.reparto && r.reparto.nota ? [r.reparto.nota] : []),
      // lo que el reparto no pudo medir (mínimo de participación, códigos): viaja SIEMPRE con él
      ...(r.reparto && Array.isArray(r.reparto.avisos) ? r.reparto.avisos.filter((a) => typeof a === "string" && a) : []),
      ...avisos.map((a) => `${a.frase}${a.porque ? ` ${a.porque}` : ""}`),
    ];
    return `<section class="exp-seccion">
      <h3 class="exp-seccion-titulo">Con quién conviene presentarse</h3>
      <p class="exp-seccion-cuerpo"><b>${esc(titulo)}</b></p>
      <p class="exp-seccion-nota">${esc(s.frase || "")}</p>
      ${s.contraste_pliego && s.contraste_pliego.frase ? `<p class="exp-seccion-nota exp-nota-ojo">${esc(s.contraste_pliego.frase)}</p>` : ""}
      ${porque.length ? `<details class="guia-caja"><summary class="cursor-pointer exp-seccion-nota">Por qué</summary>
        <div class="exp-seccion-cuerpo">${porque.map((t) => `<p class="exp-seccion-nota">${esc(t)}</p>`).join("")}</div></details>` : ""}
      <p class="exp-seccion-nota">Este consejo es del día en que guardó el proceso${s.congelado_el ? `, ${esc(String(s.congelado_el).slice(0, 10))}` : ""}: si después cambian sus datos o los de una socia, no se reescribe.</p>
    </section>`;
  }

  /* EL PIE: lo que se hace de vez en cuando. Va al final y en tono discreto —
     no compite con lo que hay que hacer hoy— y lo destructivo va separado y
     dicho, nunca junto a una descarga y con el mismo peso, que es lo que hacía
     la fila de acciones de la tarjeta anterior. */
  /* EL PIE ES MANTENIMIENTO, NO CONTENIDO (13-sep-2026). Llevarse el
     expediente y quitarlo de Mis procesos no compiten con lo que se viene a
     mirar: bajan al nivel «lienzo» —sin tarjeta, con un filete que los separa—
     para que la última caja blanca de la pantalla sea siempre la que importa.
     Cuando todo resalta, nada resalta (la regla es del 7-sep). */
  function htmlPie(p) {
    return `<section class="exp-seccion exp-seccion-menor">
      <h3 class="exp-seccion-titulo">Llevarse este expediente</h3>
      <p class="exp-seccion-nota">Las fechas, para el calendario de su teléfono; y sus datos de empresa junto a los del proceso, en una hoja de cálculo, para copiarlos a los formatos del pliego.</p>
      <div class="exp-campo-acciones">
        <button type="button" class="exp-boton exp-boton-suave" data-seg-ics="${esc(p.id)}">Descargar las fechas (calendario)</button>
        <button type="button" class="exp-boton exp-boton-suave" data-seg-ficha="${esc(p.id)}">Ficha de la empresa (Excel)</button>
      </div>
      <p class="exp-seccion-nota">Si ya no va a presentarse, puede sacarlo de Mis procesos. Se pierde lo que anotó aquí: sus notas, su papeleo y sus fechas.</p>
      <div class="exp-campo-acciones">
        <button type="button" class="exp-doc-enlace" data-seg-quitar="${esc(p.id)}">Quitar este proceso de Mis procesos</button>
      </div>
    </section>`;
  }

  /* R-03 · CON CUÁNTO OFERTÓ (27-sep-2026). Solo en las etapas en que hubo
     oferta (`con_oferta` lo resuelve el servidor: la lista no se copia aquí).
     La cifra la lee el SERVIDOR (formato colombiano, «1.234 millones»): la
     pantalla manda lo escrito tal cual, y si no se entendió, la respuesta lo dice.
     Lo que hay que VER va arriba (la cifra y cuánto quedó bajo el presupuesto);
     lo que hay que TOCAR, plegado bajo «Corregir» cuando ya está anotada. */
  function htmlOferta(p) {
    if (!p || !p.con_oferta) return "";
    const o = p.oferta || null;
    const pct = p.oferta_por_debajo_del_presupuesto_pct;
    const pesos = (n) => `$${Math.round(Number(n)).toLocaleString("es-CO")}`;
    const frentePresupuesto = pct == null ? "" : pct >= 0
      ? ` · ${String(pct).replace(".", ",")} % por debajo del presupuesto oficial`
      : ` · ${String(-pct).replace(".", ",")} % por encima del presupuesto oficial`;
    const campo = `<label class="exp-campo"><span class="exp-campo-rotulo">Valor total de su oferta, en pesos</span>
        <input type="text" inputmode="decimal" class="control-campo" placeholder="Por ejemplo: 1.234.567.890 o 1.234 millones" data-seg-oferta-valor="${esc(p.id)}" aria-label="Valor total de su oferta, en pesos"${o ? ` value="${esc(Math.round(o.valor_cop).toLocaleString("es-CO"))}"` : ""}></label>
      <div class="exp-campo-acciones"><button type="button" class="exp-boton" data-seg-oferta="${esc(p.id)}">Guardar la oferta</button></div>`;
    return `<section class="exp-seccion"><h3 class="exp-seccion-titulo">Con cuánto ofertó</h3>
      ${o ? `<p class="exp-seccion-cuerpo">Ofertó <strong>${esc(pesos(o.valor_cop))}</strong>${esc(frentePresupuesto)}.</p>
        <details class="exp-seccion-cuerpo"><summary class="exp-doc-enlace">Corregir la cifra</summary>${campo}</details>`
        : `<p class="exp-seccion-nota">Anótelo ahora: queda en su expediente para compararlo con la oferta que gane cuando se publiquen.</p>${campo}`}
      <p class="exp-seccion-nota" data-seg-oferta-mensaje="${esc(p.id)}" role="status"></p>
    </section>`;
  }
  /* LO QUE SE LLENÓ EN EL FORMATO DE LA ENTIDAD (27-sep-2026), en palabras: qué
     se escribió, qué quedó en blanco por falta del dato y qué se dejó en blanco
     por no estar seguro de a quién corresponde. Pura: la llama app.js con la
     respuesta de op=descargar en modo «llenar». */
  function frasesLlenado(r) {
    if (!r) return [];
    const nombres = (l) => [...new Set((l || []).map((x) => x.nombre))].join(", ");
    const out = [];
    /* CADA casilla con su renglón y lo que quedó escrito (revisión adversaria: con
       solo los nombres, un correo escrito dos veces —una en la casilla postal— se
       leía «Correo electrónico» una vez) */
    const renglones = (l) => (l || []).map((x) => `«${String(x.renglon || x.nombre).slice(0, 90)}»`).join("; ");
    if (r.llenados && r.llenados.length) out.push(`Se escribió en ${r.llenados.length === 1 ? "esta casilla" : `estas ${r.llenados.length} casillas`}: ${renglones(r.llenados)}. Revise cada dato en el documento antes de firmarlo.`);
    else out.push(r.motivo || "No se encontró ninguna casilla de los datos del proponente que se pueda llenar sin riesgo de equivocarse: llénelo a mano.");
    if (r.sin_dato && r.sin_dato.length) out.push(`Quedó en blanco porque no lo ha guardado en Mi empresa: ${nombres(r.sin_dato)}.`);
    /* con el renglón: la misma casilla puede haberse escrito en un sitio y dejado en
       blanco en otro («Cédula del representante legal» y una «C.C.» suelta) */
    if (r.dudosos && r.dudosos.length) out.push(`Quedó en blanco porque no es seguro que sea del proponente: ${[...new Set(r.dudosos.map((x) => `«${String(x.renglon || x.nombre).slice(0, 60)}»`))].join(", ")}.`);
    if (r.hay_consorcio) out.push("La parte del consorcio o de la unión temporal no se llenó: lleva los datos de cada integrante.");
    if (r.para_persona_natural) out.push("Este formato dice ser para persona natural: confirme que es el que le corresponde a su empresa.");
    return out;
  }
  /* sin tildes ni otros caracteres fuera de ASCII: con uno solo, Chromium
     guardaba el archivo como «download», sin extensión (medido el 27-sep-2026 con
     «CARTA DE PRESENTACIÓN»), y en un teléfono eso no se abre con Word */
  const nombreLleno = (nombre) => `${String(nombre || "formato").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^\x20-\x7e]/g, "").replace(/\.docx$/i, "").replace(/[\\/:*?"<>|]+/g, " ").replace(/\s+/g, " ").trim().slice(0, 100)} (con sus datos).docx`;

  /* CON CUÁNTO OFERTARON TODOS (27-sep-2026, R-11). Pinta `ofertas` del detalle
     de competencia (lib/handlers/perfil/seguimiento.ofertasDelProceso): arriba
     el hecho —cuántas, la más baja, la del medio, quién ganó y dónde quedó la
     suya—; la lista entera, plegada. Aquí no se calcula ninguna cifra: lo que
     no viene (presupuesto con varios lotes, cobertura sin respuestas
     publicadas) no se dice. */
  function htmlOfertasTodos(o) {
    if (!o) return "";
    const pesos = (n) => `$${Math.round(Number(n)).toLocaleString("es-CO")}`;
    const frente = (pct) => pct == null ? "" : pct >= 0
      ? ` (${String(pct).replace(".", ",")} % por debajo del presupuesto)`
      : ` (${String(-pct).replace(".", ",")} % por encima del presupuesto)`;
    const titulo = `<h3 class="exp-seccion-titulo">Con cuánto ofertaron todos</h3>`;
    if (!o.ok || !o.distintas) {
      return `<section class="exp-seccion" data-seg-ofertas-todos>${titulo}<p class="exp-seccion-nota">${esc(o.motivo || "datos.gov.co todavía no publica las ofertas de este proceso.")}</p></section>`;
    }
    const lineas = [];
    const n = o.con_valor;
    const cuantas = o.distintas === 1 ? "Se publica 1 oferta" : `Se publican ${o.distintas} ofertas`;
    if (o.mezcla_lotes) {
      /* varios lotes o fases (o no se sabe): unas ofertas son por un lote y otras
         por el total; ni «la más baja» ni el puesto dicen algo */
      lineas.push(`${cuantas}.`);
      lineas.push(o.varias_fases_o_lotes === true
        ? "Este proceso tiene varios lotes o fases con ofertas y la fuente no dice a cuál corresponde cada una: por eso no se les da puesto ni se comparan con el presupuesto; la lista va de la más baja a la más alta solo para leerla."
        : "No se pudo saber si este proceso tiene varios lotes: por eso las ofertas no reciben puesto ni se comparan con el presupuesto.");
    } else {
      lineas.push(n
        ? `${cuantas}. La más baja: <strong>${esc(pesos(o.mas_baja_cop))}</strong>${esc(frente(o.mas_baja_por_debajo_pct))}${o.mediana_cop != null ? `; la del medio: <strong>${esc(pesos(o.mediana_cop))}</strong>${esc(frente(o.mediana_por_debajo_pct))}` : ""}.`
        : `${cuantas}, ninguna con su valor.`);
    }
    const gan = (o.ganadores || []).filter((g) => g && g.nombre);
    if (gan.length === 1) lineas.push(`Ganó ${esc(gan[0].nombre)}${gan[0].valor_cop != null ? ` con ${esc(pesos(gan[0].valor_cop))}` : ""}.`);
    else if (gan.length > 1) lineas.push(`Se adjudicó a ${gan.length}: ${esc(gan.map((g) => g.nombre).join(", "))}.`);
    const s = o.su_oferta;
    if (s && s.puesto != null) {
      lineas.push(`La suya, ${esc(pesos(s.valor_cop))}, ${s.puesto === 1 ? "es la más baja" : `quedó de número ${s.puesto} de la más baja a la más alta`}, entre ${s.de}.`);
    } else if (s) {
      lineas.push(`La suya, ${esc(pesos(s.valor_cop))}, no coincide al peso con ninguna oferta publicada. Si la cifra que anotó no es la exacta, corríjala en «Resumen» para ver en qué puesto quedó.`);
    }
    if (o.faltan_por_publicar > 0) lineas.push(`El proceso registra ${o.respondieron_segun_el_proceso} respuestas y datos.gov.co publica ${o.distintas}: faltan ${o.faltan_por_publicar}.`);
    if (o.sin_valor_publicado > 0) lineas.push(`${o.sin_valor_publicado === 1 ? "Una no publica" : `${o.sin_valor_publicado} no publican`} su valor.`);
    if (o.hay_confidenciales) lineas.push("Además hay ofertas marcadas como confidenciales: de esas no se publica ni quién ni cuánto.");
    const celdaPct = (pct) => pct == null ? "—" : pct >= 0 ? `${esc(String(pct).replace(".", ","))} % por debajo` : `${esc(String(-pct).replace(".", ","))} % por encima`;
    const filas = (o.ofertas || []).map((x) => `<tr class="align-top">
        <td class="py-1 pr-3 text-right num">${x.puesto != null ? x.puesto : "—"}</td>
        <td class="py-1 pr-3">${esc(x.proponente || "Sin nombre publicado")}${x.adjudicada ? ` <span class="font-medium text-emerald-700">● Ganó</span>` : ""}</td>
        <td class="py-1 pr-3 text-right num">${x.valor_cop != null ? esc(pesos(x.valor_cop)) : "sin valor publicado"}</td>
        <td class="py-1 text-right num">${celdaPct(x.por_debajo_del_presupuesto_pct)}</td>
      </tr>`).join("");
    return `<section class="exp-seccion" data-seg-ofertas-todos>${titulo}
      ${lineas.map((l) => `<p class="exp-seccion-cuerpo">${l}</p>`).join("")}
      <details class="exp-seccion-cuerpo"><summary class="exp-doc-enlace">Ver ${o.distintas === 1 ? "la oferta" : `las ${o.distintas} ofertas`}</summary>
        <div class="mt-2 overflow-x-auto"><table class="w-full text-xs">
          <thead class="text-left text-[11px] uppercase tracking-wide text-gray-400"><tr><th class="pb-1 pr-3 text-right">Puesto</th><th class="pb-1 pr-3">Proponente</th><th class="pb-1 pr-3 text-right">Valor ofertado</th><th class="pb-1 text-right">Frente al presupuesto</th></tr></thead>
          <tbody class="divide-y divide-gray-100">${filas}</tbody></table></div>
      </details>
      <p class="exp-seccion-nota">Fuente: SECOP II, ofertas por proceso (datos.gov.co).${o.mezcla_lotes ? "" : " El puesto va de la más baja a la más alta; no dice quién quedó habilitado."}</p>
    </section>`;
  }
  /* ══════════ ¿PUEDE PRESENTARSE? (27-sep-2026, encargo del dueño) ══════════
     «En vez de un párrafo que dice que el contrato mayor supera con holgura y que
     falta confirmar…, dígame: el pliego pide experiencia general X y específica X,
     y según su registro, solo o con tal empresa en consorcio, desde 40/60, puede
     postularse. Todo bien estructurado, datos reales.»

     AQUÍ NO SE JUZGA NADA NUEVO: se ORDENA lo que ya juzgaron otros.
     · «Lo que pide el pliego» y «lo que tiene usted» son las casillas de
       `guia.exigencias` (lib/guia_proceso), las mismas de «Lo que exige»: la
       cifra, su documento y su página, y el estado que ya les dio el servidor.
     · «Con quién sí alcanza» es, por cada socia, la respuesta de
       `op=consorcio-simular` con `recomendar: true` (lib/consorcio.recomendarReparto):
       las casillas pasadas con las dos empresas juntas en el reparto que más le
       deja a usted, y ese reparto.
     · «Alcanza» quiere decir «ninguna casilla en rojo»: la experiencia NUNCA
       sale «cumple» (lib/guia_proceso.EXIGENCIAS, `nunca_cumple`), así que el
       mejor veredicto posible es «lo que se puede medir alcanza» y el tipo de
       obra se confirma en el pliego. Decir «cumple» aquí sería afirmar lo que
       la aplicación no puede ver.
     · Sin casillas leídas no hay veredicto: «falta información», jamás un sí.
     Recalcula EN VIVO con el pliego leído; el consejo de «Con quién conviene
     presentarse» es del día del guardado y va aparte, con su fecha. */
  // las dos rentabilidades de la Matriz 2 (27-sep-2026): una que no llega también dice «No»
  const CLAVES_PRESENTARSE = ["experiencia_general", "experiencia_especifica", "liquidez", "endeudamiento", "cobertura", "rentabilidad_patrimonio", "rentabilidad_activo", "capital_trabajo", "patrimonio"];
  // lo que la app verifica y el pliego exige siempre: sin ellos en verde no hay «Sí» (revisión adversaria, 27-sep-2026)
  const REQUISITOS_PRESENTARSE = ["registro", "capacidad"];
  const esExperiencia = (clave) => /^experiencia_/.test(String(clave || ""));
  /* LO QUE NO SE LEYÓ NO SE DA POR CUMPLIDO (27-sep-2026, medido en producción con
     CO1.REQ.11039338): el lector sacó del pliego tipo solo la liquidez y el capital de
     trabajo —la experiencia está en su «Matriz 1»— y el bloque, que solo miraba las
     casillas CON cifra, dijo «Sí, todo lo que se puede medir alcanza». Para decir «Sí»
     tienen que haberse leído la experiencia (la general o la específica) y los tres
     indicadores de capacidad financiera que certifica el registro de proponentes
     (Decreto 1082 de 2015, art. 2.2.1.1.1.5.3: liquidez, endeudamiento y cobertura de
     intereses) y que los pliegos de obra verifican.
     El que falte se enseña como «no se leyó en el pliego» y deja la opción en «Por
     confirmar» (ámbar: se muestra, no se esconde ni se descarta). */
  const INDICADORES_PRESENTARSE = ["liquidez", "endeudamiento", "cobertura"];
  const TITULO_PRESENTARSE = Object.freeze({ experiencia_general: "Experiencia general", experiencia_especifica: "Experiencia específica",
    liquidez: "Liquidez mínima", endeudamiento: "Endeudamiento máximo", cobertura: "Cobertura de intereses" });
  // lo que hace falta leer del pliego para poder decir «Sí» y no se leyó, con su título y la nota del lector
  function sinLeerPresentarse(exigencias) {
    const lista = Array.isArray(exigencias) ? exigencias : [];
    // «leída» es lo MISMO que entra a las casillas (casillasPresentarse): una sola regla
    const leidas = casillasPresentarse(lista);
    const leida = (k) => leidas.some((x) => x.clave === k);
    const fila = (k) => {
      const x = lista.find((q) => q && q.clave === k) || null;
      return { clave: k, titulo: (x && x.titulo) || TITULO_PRESENTARSE[k], nota: (x && x.nota) || null };
    };
    const faltan = [];
    if (!leida("experiencia_general") && !leida("experiencia_especifica")) faltan.push(fila("experiencia_general"), fila("experiencia_especifica"));
    for (const k of INDICADORES_PRESENTARSE) if (!leida(k)) faltan.push(fila(k));
    return faltan;
  }
  // las casillas que deciden si se presenta, en el orden del pliego; solo las que el pliego leído fija con cifra
  function casillasPresentarse(exigencias) {
    const lista = Array.isArray(exigencias) ? exigencias : [];
    return CLAVES_PRESENTARSE.map((k) => lista.find((x) => x && x.clave === k)).filter((x) => x && x.exige != null && String(x.exige).trim() !== "");
  }
  // registro y capacidad: de `guia.requisitos` (solo) o de `puertas_app.estados` (con una socia); falta = null
  function requisitosPresentarse(lista) {
    return REQUISITOS_PRESENTARSE.map((k) => {
      const x = (Array.isArray(lista) ? lista : []).find((q) => q && q.clave === k);
      return x ? { clave: k, titulo: x.titulo || (k === "registro" ? "Registro de proponente" : "Capacidad de contratación"), estado: x.estado || null } : null;
    });
  }
  /* la experiencia nunca se pinta «cumple»: lo más que dice la app es «confírmelo» (lib/guia_proceso, `nunca_cumple`) */
  const estadoVisible = (x) => (esExperiencia(x.clave) && x.estado === "cumple" ? "revisar" : x.estado);
  function peorEstado(estados) {
    const l = estados.filter((e) => e != null);
    if (!l.length) return null;
    for (const e of ["no_cumple", "revisar", "pendiente", "sin_dato", "por_leer"]) if (l.includes(e)) return e;
    return "cumple";
  }
  /* LAS PALABRAS DEL ESTADO SALEN DEL GLOSARIO (Glosario.ESTADO), no de una tabla propia */
  function palabraEstado(e) {
    const G = raizGlosario();
    const EST = G && G.ESTADO ? G.ESTADO : null;
    if (EST && EST[e]) return EST[e].largo;
    return e === "por_leer" ? "Por leer" : "Sin dato";
  }
  const claseEstado = (e) => (e === "cumple" ? "exp-estado-ok" : e === "no_cumple" ? "exp-estado-mal" : e === "revisar" || e === "pendiente" ? "exp-estado-falta" : "exp-estado-nd");
  const chipEstado = (clase, texto) => `<span class="exp-estado ${clase}"><span class="exp-punto" aria-hidden="true">●</span>${esc(texto)}</span>`;
  /* EL ALCANCE DE UNA OPCIÓN (tres valores y un fallo):
       «no»            algo en rojo: una casilla, el registro o la capacidad;
       «si»            TODO medido y en verde: indicadores «cumple», la experiencia con la
                       cifra suya y sin rojo, registro y capacidad «cumple» y, con una socia,
                       un reparto que no es provisional;
       «por_confirmar» nada en rojo, pero algo sin cifra, por confirmar o sin leer;
       «error»         la consulta falló: no cuenta, aunque traiga cifras.
     La revisión adversaria del 27-sep-2026 tumbó la versión que contaba «revisar» y «por
     leer» como que alcanza: pintaba «Sí» sin haber comparado una sola cifra. */
  function alcanceOpcion(o) {
    if (o.error) return "error";
    const casillas = casillasPresentarse(o.exigencias);
    const reqs = o.requisitos || [];
    if (casillas.some((x) => x.estado === "no_cumple") || reqs.some((r) => r && r.estado === "no_cumple")) return "no";
    if (o.tipo === "socio" && o.suya == null) return o.sin_reparto_por === "no" ? "no" : "por_confirmar";
    if (!casillas.length) return "por_confirmar";
    if (sinLeerPresentarse(o.exigencias).length) return "por_confirmar";
    const medido = casillas.every((x) => (esExperiencia(x.clave) ? x.suyo != null && (x.estado === "revisar" || x.estado === "cumple") : x.estado === "cumple"))
      && reqs.length === REQUISITOS_PRESENTARSE.length && reqs.every((r) => r && r.estado === "cumple")
      && !(o.tipo === "socio" && o.provisional);
    return medido ? "si" : "por_confirmar";
  }
  // lo que falta para decir «sí»: los títulos que no están en verde (la experiencia pide solo su cifra)
  function pendientesDe(o) {
    const casillas = casillasPresentarse(o.exigencias);
    const faltan = sinLeerPresentarse(o.exigencias).map((x) => `${x.titulo} (no se leyó en el pliego)`);
    for (const x of casillas) if (esExperiencia(x.clave) ? x.suyo == null : x.estado !== "cumple") faltan.push(x.titulo);
    for (const r of o.requisitos || []) if (!r || r.estado !== "cumple") faltan.push(r ? r.titulo : "registro o capacidad sin leer");
    if (o.tipo === "socio" && o.provisional) faltan.push("el mínimo de participación que fija el pliego");
    if (o.tipo === "socio" && o.suya == null && o.sin_reparto_por !== "no") faltan.push("un reparto de la participación que sirva");
    return faltan;
  }
  /* una fila por opción: solo (o el consorcio de la barra), y cada socia con su respuesta del simulador */
  function opcionesPresentarse(p, socios, { consorcio = false } = {}) {
    const g = (p && p.guia) || null;
    const solo = { tipo: "solo", nombre: consorcio ? "Este consorcio" : "Solo", suya: 100, del_socio: null, exigencias: g ? g.exigencias : null,
      requisitos: requisitosPresentarse(g ? g.requisitos : null), error: null, avisos: [] };
    const conSocias = (Array.isArray(socios) ? socios : []).map((s) => {
      const r = (s && s.r) || null;
      const rec = (r && r.recomendacion) || null;
      const est = r && r.puertas_app && r.puertas_app.estados ? r.puertas_app.estados : null;
      return {
        tipo: "socio", id: (s && s.socio && s.socio.id) || null, nombre: (s && s.socio && s.socio.nombre) || "Socia",
        /* una respuesta sin casillas es un fallo de la consulta, no un pliego sin leer (revisión adversaria) */
        error: (s && s.error) || (r && r.ok === false ? (r.error || "No se pudo calcular.") : null)
          || (r && !Array.isArray(r.exigencias) ? (r.exigencias_motivo || "No se pudieron volver a pasar las cifras del pliego con esta socia.") : null),
        suya: rec && rec.suya != null ? Number(rec.suya) : null, del_socio: rec && rec.del_socio != null ? Number(rec.del_socio) : null,
        provisional: !!(rec && rec.provisional),
        exigencias: r && Array.isArray(r.exigencias) ? r.exigencias : null,
        requisitos: requisitosPresentarse(est ? REQUISITOS_PRESENTARSE.map((k) => (est[k] ? { clave: k, estado: est[k].estado } : null)).filter(Boolean) : null),
        avisos: rec && Array.isArray(rec.avisos) ? rec.avisos.map((a) => (typeof a === "string" ? a : a && a.frase) || "").filter(Boolean) : [],
        sin_reparto_por: rec && rec.suya == null && ((rec.experiencia && rec.experiencia.estado === "imposible") || (Array.isArray(rec.en_rojo_con_cualquier_reparto) && rec.en_rojo_con_cualquier_reparto.length)) ? "no" : null,
      };
    });
    return [solo, ...conSocias].map((o) => {
      const casillas = casillasPresentarse(o.exigencias);
      // lo que no se leyó entra al resumen de la fila como «sin dato»: un «Cumple» con la mitad sin leer mentía
      const sinLeer = o.error ? [] : sinLeerPresentarse(o.exigencias);
      const faltaDe = (exp) => sinLeer.filter((x) => esExperiencia(x.clave) === exp).map(() => "sin_dato");
      return { ...o, alcance: alcanceOpcion(o), pendientes: pendientesDe(o), sin_leer: sinLeer,
        experiencia: peorEstado([...casillas.filter((x) => esExperiencia(x.clave)).map(estadoVisible), ...faltaDe(true)]),
        indicadores: peorEstado([...casillas.filter((x) => !esExperiencia(x.clave)).map((x) => x.estado), ...faltaDe(false)]),
        registro_capacidad: peorEstado((o.requisitos || []).map((r) => (r ? r.estado : "sin_dato"))) };
    });
  }
  /* el reparto de la fila dice lo que se sabe: una consulta fallida no calculó ninguno, y sin
     reparto recomendado no está probado que ninguno sirva (solo `sin_reparto_por: "no"` lo prueba) */
  const repartoTexto = (o) => (o.tipo === "solo" ? (o.nombre === "Este consorcio" ? "el de su consorcio" : "usted 100 %")
    : o.error ? "no se pudo calcular" : o.suya != null ? `usted hasta ${o.suya} % (${o.suya}/${o.del_socio})`
      : o.sin_reparto_por === "no" ? "ningún reparto sirve" : "no se encontró uno que sirva con lo leído");
  /* LO QUE ESTÁ EN ROJO, EN PALABRAS (27-sep-2026): el «por qué» del «No alcanza». Sale
     de las MISMAS casillas y requisitos que deciden el alcance (`alcanceOpcion`): qué pide
     el pliego y qué tiene usted, para que el «no» no se lea como un juicio sin base. */
  const minuscula = (t) => { const s = String(t || ""); return s.charAt(0).toLowerCase() + s.slice(1); };
  const enLista = (l) => (l.length < 2 ? l[0] || "" : `${l.slice(0, -1).join(", ")} y ${l[l.length - 1]}`);
  /* registro y capacidad con un rótulo corto y PROPIO, igual para solo y para la socia: el
     título de la guía («Registro de proponente vigente, con este tipo de trabajo inscrito»)
     partía la lista con su coma y el de la socia salía con otro nombre (revisión adversaria) */
  const RAZON_REQUISITO = Object.freeze({ registro: "este tipo de trabajo no está inscrito en el registro de proponente", capacidad: "falta capacidad para facturar este contrato" });
  function rojosDe(o) {
    const out = [];
    for (const x of casillasPresentarse(o.exigencias)) {
      if (x.estado !== "no_cumple") continue;
      /* con una socia, el servidor FUERZA el rojo por otra razón (la fórmula que trae el pliego,
         o la experiencia con los códigos) y deja la cifra de la suma, que SÍ cumple: el porqué
         es su nota, no esa cifra (revisión adversaria, lib/consorcio.js) */
      if (o.tipo === "socio" && x.nota) { out.push(`${minuscula(x.titulo)} (${minuscula(String(x.nota).replace(/\.\s*$/, ""))})`); continue; }
      /* con una socia la cifra es la de las DOS empresas juntas (la misma guía, con el perfil
         del consorcio): el rótulo «el suyo» se la atribuía al usuario */
      const rotulo = o.tipo === "socio" ? "los dos juntos" : minuscula(x.suyo_rotulo || "usted tiene");
      out.push(`${minuscula(x.titulo)} (el pliego pide ${x.exige}${x.suyo != null ? `; ${rotulo}: ${x.suyo}` : ""})`);
    }
    for (const r of o.requisitos || []) if (r && r.estado === "no_cumple") out.push(RAZON_REQUISITO[r.clave] || minuscula(r.titulo));
    if (!out.length && o.tipo === "socio" && o.suya == null && o.sin_reparto_por === "no") out.push("ningún reparto de la participación sirve");
    return out;
  }
  /* LA FRASE DE ARRIBA, EN TRES ESTADOS (encargo del dueño, 27-sep-2026): «Puede ir solo»,
     «Necesita socio: con cuál» y «No alcanza: por qué». Las reglas de alcance NO cambian
     (`alcanceOpcion`, con las dos revisiones adversarias del mismo día): «puede ir» solo con
     TODO medido y en verde, nunca «cumple» para la experiencia. Y hay un cuarto estado que no
     se esconde: «Por confirmar» cuando falta un dato —«sin dato» no es «no» (en oportunidades
     el falso caro es el negativo: ante la duda, ámbar y se muestra)—. «Necesita socio» solo
     cuando SOLO no alcanza: si solo falta confirmar y con una socia alcanza, se dice «Puede ir
     con socio», porque «necesita» afirmaría que solo no puede. */
  const conPunto = (t) => `${String(t).replace(/[.\s]+$/, "")}.`;
  function veredictoPresentarse(opciones, { cargando = false, consultadas = 0, sinCasillas = false, sinSocias = false, consorcio = false } = {}) {
    if (sinCasillas) return { clase: "exp-estado-nd", chip: "Por saber", frase: "Falta información: todavía no hay cifras leídas del pliego." };
    const solo = opciones.find((o) => o.tipo === "solo");
    const esCons = !!(solo && solo.nombre === "Este consorcio");
    const quienSolo = esCons ? "Este consorcio" : "Solo";
    const soloNo = solo && solo.alcance === "no" ? `${quienSolo} no alcanza: ${enLista(rojosDe(solo))}.` : null;
    const siSocia = opciones.filter((o) => o.tipo === "socio" && o.alcance === "si").sort((a, b) => (b.suya || 0) - (a.suya || 0));
    if (solo && solo.alcance === "si") return { clase: "exp-estado-ok", chip: esCons ? "Puede ir" : "Puede ir solo", frase: `${quienSolo}: todo lo que se puede medir alcanza.` };
    if (siSocia.length) {
      const m = siSocia[0];
      const otras = siSocia.slice(1).map((o) => o.nombre);
      const con = `Con ${m.nombre}: ${repartoTexto(m)}.${otras.length ? ` También alcanza con ${conPunto(enLista(otras))}` : ""}`;
      if (soloNo) return { clase: "exp-estado-ok", chip: "Necesita socio", frase: `${con} ${soloNo}` };
      return { clase: "exp-estado-ok", chip: "Puede ir con socio", frase: `${con} ${quienSolo}, falta confirmar: ${conPunto(solo && solo.pendientes.length ? solo.pendientes.map(minuscula).join(", ") : "lo que el pliego no fija con cifra")}` };
    }
    if (cargando) return { clase: "exp-estado-nd", chip: "Por saber", frase: soloNo ? `${soloNo} Midiendo con sus socias…` : "Midiendo con sus socias…" };
    const porConfirmar = opciones.filter((o) => o.alcance === "por_confirmar");
    if (porConfirmar.length) {
      const o = porConfirmar[0];
      const quien = o.tipo === "solo" ? o.nombre : `Con ${o.nombre}`;
      const antes = soloNo && o.tipo === "socio" ? `${soloNo} ` : "";
      if (o.sin_leer.length) {
        // las dos experiencias sin leer se nombran juntas: basta una para decir «puede ir»
        const dosExp = o.sin_leer.filter((x) => esExperiencia(x.clave)).length === 2;
        const t = [...(dosExp ? ["la experiencia (general o específica)"] : []),
          ...o.sin_leer.filter((x) => !dosExp || !esExperiencia(x.clave)).map((x) => minuscula(x.titulo))];
        return { clase: "exp-estado-falta", chip: "Por confirmar", frase: `${antes}${quien} no tiene nada en rojo, pero del pliego no se leyó: ${enLista(t)}. ${t.length > 1 ? "Búsquelos" : "Búsquelo"} en el pliego antes de decidir.` };
      }
      return { clase: "exp-estado-falta", chip: "Por confirmar", frase: `${antes}${quien} no tiene nada en rojo, pero falta confirmar: ${o.pendientes.join(", ") || "lo que el pliego no fija con cifra"}.` };
    }
    /* «NO ALCANZA» EN ROJO SOLO CON TODO MEDIDO (revisión adversaria): con todas las socias
       en «no», o sin socias que medir (no hay ninguna cargada, o el perfil ya es el consorcio).
       Si una socia no respondió, o todavía no se consultaron (la primera pintura del
       expediente, o `op=consorcio` falló), es «sin dato», no «no»: «Por saber», con qué falta */
    const socias = opciones.filter((o) => o.tipo === "socio");
    const noSocias = socias.filter((o) => o.alcance === "no"), fallidas = socias.filter((o) => o.alcance === "error");
    const tampoco = noSocias.map((o) => `Con ${o.nombre}, tampoco: ${conPunto(enLista(rojosDe(o)) || "algo sigue en rojo")}`).join(" ");
    if (soloNo && socias.length && noSocias.length === socias.length) return { clase: "exp-estado-mal", chip: "No alcanza", frase: `${soloNo} ${tampoco}` };
    if (soloNo && !socias.length && (sinSocias || consorcio)) return { clase: "exp-estado-mal", chip: "No alcanza", frase: soloNo };
    if (soloNo && fallidas.length) return { clase: "exp-estado-nd", chip: "Por saber", frase: `${soloNo}${tampoco ? ` ${tampoco}` : ""} Con ${enLista(fallidas.map((o) => o.nombre))} no se pudo calcular: vuelva a intentarlo.` };
    if (soloNo) return { clase: "exp-estado-nd", chip: "Por saber", frase: `${soloNo} Falta medir con sus socias.` };
    return { clase: "exp-estado-nd", chip: "Por saber", frase: "Falta información para decirlo." };
  }
  function htmlPuedePresentarse(p, estado) {
    const g = (p && p.guia) || null;
    const casillas = casillasPresentarse(g ? g.exigencias : null);
    const consorcio = !!(estado && estado.consorcio);
    const sinSocias = !!(estado && estado.sin_socias);
    const cargando = !!(estado && estado.cargando);
    const socios = estado && Array.isArray(estado.filas) ? estado.filas : [];
    const opciones = opcionesPresentarse(p, socios, { consorcio });
    const v = veredictoPresentarse(opciones, { cargando, consultadas: socios.length, sinCasillas: !casillas.length, sinSocias, consorcio });
    const reqsSolo = opciones[0].requisitos || [];
    const estadoHtml = (e) => (e ? chipEstado(claseEstado(e), palabraEstado(e)) : "—");
    const donde = (x) => (x.pagina != null || x.documento ? ` <span class="exp-seccion-nota">(${x.pagina != null ? `pág. ${esc(x.pagina)}` : ""}${x.pagina != null && x.documento ? ", " : ""}${x.documento ? esc(x.documento) : ""})</span>` : "");
    /* FILAS APILADAS, NO TABLAS (medido en Chromium, 27-sep-2026): a 390 px una tabla de
       cinco columnas obligaba a desplazar de lado para leer el estado, que es lo que decide. */
    /* lo que hace falta para decir «Sí» y no se leyó también se ve, en su sitio: callarlo era el «Sí» falso */
    const sinLeer = sinLeerPresentarse(g ? g.exigencias : null);
    const filasPide = CLAVES_PRESENTARSE.map((k) => {
      const x = casillas.find((c) => c.clave === k);
      if (x) return `<li class="exp-fila-dato"><b>${esc(x.titulo)}:</b> ${esc(x.exige)}${donde(x)}</li>`;
      const f = sinLeer.find((c) => c.clave === k);
      return f ? `<li class="exp-fila-dato"><b>${esc(f.titulo)}:</b> ${chipEstado("exp-estado-falta", "No se leyó en el pliego")}${f.nota ? ` <span class="exp-seccion-nota">${esc(f.nota)}</span>` : ""}</li>` : "";
    }).join("");
    const filasTiene = casillas.map((x) => `<li class="exp-fila-dato"><b>${esc(x.titulo)}:</b> ${x.suyo != null ? `${esc(x.suyo_rotulo || "Usted")}: ${esc(x.suyo)}` : "Sin dato en su registro"} ${estadoHtml(estadoVisible(x))}</li>`).join("")
      + reqsSolo.map((r, i) => `<li class="exp-fila-dato"><b>${esc(r ? r.titulo : REQUISITOS_PRESENTARSE[i] === "registro" ? "Registro de proponente" : "Capacidad de contratación")}:</b> ${estadoHtml(r ? r.estado : "sin_dato")}</li>`).join("");
    const resultado = (o) => (o.alcance === "error" ? chipEstado("exp-estado-nd", "No se pudo calcular")
      : o.alcance === "si" ? chipEstado("exp-estado-ok", "Alcanza") : o.alcance === "no" ? chipEstado("exp-estado-mal", "No alcanza") : chipEstado("exp-estado-falta", "Por confirmar"));
    const filasOpciones = opciones.map((o) => `<li class="exp-fila-dato"><b>${o.tipo === "solo" ? esc(o.nombre) : `Con ${esc(o.nombre)}`}</b> ${resultado(o)}
        <br><span class="exp-seccion-nota">Reparto: ${esc(repartoTexto(o))} · Experiencia:</span> ${estadoHtml(o.experiencia)} <span class="exp-seccion-nota">· Indicadores:</span> ${estadoHtml(o.indicadores)} <span class="exp-seccion-nota">· Registro y capacidad:</span> ${estadoHtml(o.registro_capacidad)}
        ${o.alcance === "error" ? `<br><span class="exp-seccion-nota">${esc(o.error)}</span> <button type="button" class="exp-doc-enlace" data-seg-presentarse-reintentar="${esc(p && p.id)}">Volver a intentar</button>` : ""}
        ${o.alcance === "por_confirmar" && o.pendientes.length ? `<br><span class="exp-seccion-nota">Falta confirmar: ${esc(o.pendientes.join(", "))}.</span>` : ""}
        ${o.avisos.map((a) => `<br><span class="exp-seccion-nota">${esc(a)}</span>`).join("")}</li>`).join("");
    const hayExperiencia = casillas.some((x) => esExperiencia(x.clave));
    return `<section class="exp-seccion" data-seg-presentarse="${esc(p && p.id)}">
      <h3 class="exp-seccion-titulo">¿Puede presentarse?</h3>
      <p class="exp-seccion-cuerpo">${chipEstado(v.clase, v.chip)} <b>${esc(v.frase)}</b></p>
      ${!casillas.length ? `<p class="exp-seccion-nota">Cuando se lean los documentos del proceso, aquí aparece lo que pide el pliego y lo que tiene usted.</p>` : `
      <p class="exp-subtitulo">Lo que pide el pliego</p>
      <ul class="exp-filas-datos">${filasPide}</ul>
      <p class="exp-subtitulo">Lo que tiene usted, según su registro</p>
      <ul class="exp-filas-datos">${filasTiene}</ul>
      <p class="exp-subtitulo">${consorcio ? "Este consorcio" : "Solo o en consorcio"}</p>
      <ul class="exp-filas-datos">${filasOpciones}</ul>
      ${cargando ? `<p class="exp-seccion-nota" role="status">Pasando las cifras del pliego con cada socia…</p>` : ""}
      ${consorcio ? `<p class="exp-seccion-nota">Este perfil ya reúne varias empresas: para probar otra combinación, arme el consorcio en Mi empresa.</p>`
        : sinSocias ? `<p class="exp-seccion-nota">Para ver con quién alcanza, cargue en Mi empresa el registro de proponente de una socia.</p>` : ""}`}
      ${hayExperiencia ? `<p class="exp-seccion-nota">La experiencia nunca se da por cumplida: la aplicación compara la cifra, pero que los contratos sean del tipo de obra que pide el pliego lo confirma usted en el pliego y en las actas.</p>` : ""}
      <p class="exp-seccion-nota">Calculado hoy con el pliego leído. «Alcanza» quiere decir que del pliego se leyeron la experiencia, la liquidez, el endeudamiento y la cobertura de intereses, y que todo lo leído está en verde; no reemplaza la revisión del pliego.</p>
    </section>`;
  }
  return {
    htmlPuedePresentarse, opcionesPresentarse, veredictoPresentarse, casillasPresentarse, rojosDe,
    SECCIONES, seccionValida, cifrasDe, htmlCabecera, htmlPie, htmlConQuien, urlSegura, enlaceSecop, htmlOferta, htmlOfertasTodos, frasesLlenado, nombreLleno,
    documentosEntidad, tiposSuyos, pesoLegible, formatoDe, htmlFilaDoc, htmlFilaDocSuyo, htmlDocumentos,
    lineaDeTiempo, htmlFechas, htmlDatosClave, htmlSiguientePaso,
  };
});
