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

  /* Las cifras de la cabecera son SIEMPRE las mismas tres, en el mismo sitio:
     con cuánto se compite, cuánto falta y cómo va su papeleo. Una cifra que
     cambia de sitio según el proceso obliga a buscarla cada vez. Sin dato se
     dice; nunca un cero que parezca una medición. */
  function cifrasDe(p) {
    const K = raizCasillero();
    const pr = p.proceso || {};
    const dinero = K ? K.dineroCorto(pr.presupuesto_cop) : { corto: "—", exacto: "" };
    const dr = p.documentos_resumen || {};
    const cierre = p.cerrado === true ? { valor: "Cerró", rotulo: "Entrega de la oferta", urgente: false }
      : p.dias_para_cierre == null ? { valor: "Sin fecha", rotulo: "Entrega de la oferta", urgente: false }
        : p.dias_para_cierre === 0 ? { valor: "Hoy", rotulo: "Entrega de la oferta", urgente: true }
          : p.dias_para_cierre === 1 ? { valor: "Mañana", rotulo: "Entrega de la oferta", urgente: true }
            : { valor: `${miles(p.dias_para_cierre)} días`, rotulo: "Para entregar la oferta", urgente: p.dias_para_cierre <= 3 };
    return [
      { valor: dinero.corto, rotulo: "Presupuesto oficial", titulo: dinero.exacto, urgente: false },
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
    return `<div class="exp-cabecera">
      <button type="button" class="exp-volver" data-exp-volver="1">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m15 18-6-6 6-6"/></svg>
        Mis procesos
      </button>
      <h2 class="exp-nombre">${esc(pr.nombre || p.id)}</h2>
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
      </div>
      <dl class="exp-cifras">
        ${cifras.map((c) => `<div class="exp-cifra${c.urgente ? " exp-cifra-urgente" : ""}"${c.titulo ? ` title="${esc(c.titulo)}"` : ""}>
          <dd class="exp-cifra-valor num">${esc(c.valor)}</dd><dt class="exp-cifra-rotulo">${esc(c.rotulo)}</dt></div>`).join("")}
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
    ];
  }

  const ESTADO_ENTIDAD = {
    leido: { clase: "exp-estado-ok", texto: "Leído" },
    por_leer: { clase: "exp-estado-nd", texto: "Por leer" },
    ilegible: { clase: "exp-estado-falta", texto: "No se pudo leer" },
    no_legible: { clase: "exp-estado-nd", texto: "No es un PDF con texto" },
  };

  function htmlFilaDoc(f, folio) {
    const meta = [f.tipo, f.formato, f.paginas != null ? `${miles(f.paginas)} ${f.paginas === 1 ? "página" : "páginas"}` : null, f.peso,
      f.fecha ? String(f.fecha).slice(0, 10) : null, f.observacion].filter(Boolean).join(" · ");
    const e = ESTADO_ENTIDAD[f.estado] || ESTADO_ENTIDAD.por_leer;
    return `<div class="exp-doc">
      <span class="exp-doc-folio num">${miles(folio)}</span>
      <span class="exp-doc-nombre">${esc(f.nombre)}</span>
      <span class="exp-doc-meta">${esc(meta || "Sin más datos publicados")}</span>
      <span class="exp-doc-mandos"><span class="exp-estado ${e.clase}"><span class="exp-punto" aria-hidden="true">&#9679;</span>${esc(e.texto)}</span></span>
    </div>`;
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
    return `<section class="exp-seccion">
        <h3 class="exp-seccion-titulo">Documentos de la entidad</h3>
        <p class="exp-seccion-nota">Lo que la entidad publicó en SECOP II para este proceso, en el orden del índice. Lo que dice un documento leído es lo que alimenta el resto del expediente.</p>
        ${docsEnt}
        <div data-seg-docs="${esc(p.id)}"></div>
      </section>
      <section class="exp-seccion">
        <h3 class="exp-seccion-titulo">Sus documentos</h3>
        <p class="exp-seccion-nota">Los papeles que usted tiene que reunir. <b>La aplicación no se queda con el archivo ni con lo que dice</b>: guarda el registro de cada documento —qué es, cómo va, cuándo vence, cómo se llamaba y cuántas páginas tenía—. El archivo se queda en su computador.</p>
        ${docsSuyos}
        ${suyos.length >= tope
          ? `<p class="exp-seccion-nota">Llegó al tope de ${miles(tope)} documentos en este proceso. Quite alguno que ya no necesite para anotar otro.</p>`
          : `<div class="exp-soltar" data-exp-soltar="${esc(p.id)}">
              <p>Anote un documento aunque todavía no lo tenga. Si ya lo tiene, arrastre el PDF aquí o búsquelo en su computador.</p>
              <p class="exp-seccion-nota">Del PDF se anotan las páginas y si traía texto o era un escaneo. Lo que dice el documento no sale de su computador.</p>
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
          ${dato("Presupuesto oficial", K ? esc(K.dineroCorto(pr.presupuesto_cop).exacto) : "")}
          ${dato("Modalidad", esc(pr.modalidad || ""))}
        </dl>
        <p class="exp-seccion-nota">La guía completa de este proceso se arma cuando la aplicación lee sus documentos. Si acaba de guardarlo, espere unos segundos.</p></section>`;
    }
    const z = (o.donde && o.donde.zona) || {};
    const adj = o.como_lo_adjudican || {};
    return `<section class="exp-seccion">
      <h3 class="exp-seccion-titulo">El proceso en una mirada</h3>
      <dl class="exp-datos">
        ${dato("Qué es", esc(o.que_es || "") + (o.tipo_trabajo_legible ? ` <span class="exp-seccion-nota">${esc(o.tipo_trabajo_legible)}</span>` : ""))}
        ${dato("Dónde", [o.donde && o.donde.entidad, o.donde && o.donde.ciudad, o.donde && o.donde.departamento].filter(Boolean).map(esc).join(" · ") + (z.etiqueta ? `<span class="exp-seccion-nota">${esc(z.etiqueta)}${z.km != null && z.km > 0 ? ` · unos ${miles(z.km)} km desde ${esc(z.desde || "su base")}` : ""}</span>` : ""))}
        ${dato("Cuánto", o.cuanto && o.cuanto.legible ? esc(o.cuanto.legible) + (o.cuanto.tamano ? ` <span class="exp-seccion-nota">${esc(o.cuanto.tamano)}</span>` : "") : "")}
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

  /* EL PIE: lo que se hace de vez en cuando. Va al final y en tono discreto —
     no compite con lo que hay que hacer hoy— y lo destructivo va separado y
     dicho, nunca junto a una descarga y con el mismo peso, que es lo que hacía
     la fila de acciones de la tarjeta anterior. */
  function htmlPie(p) {
    return `<section class="exp-seccion">
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

  return {
    SECCIONES, seccionValida, cifrasDe, htmlCabecera, htmlPie,
    documentosEntidad, tiposSuyos, pesoLegible, formatoDe, htmlFilaDoc, htmlFilaDocSuyo, htmlDocumentos,
    lineaDeTiempo, htmlFechas, htmlDatosClave, htmlSiguientePaso,
  };
});
