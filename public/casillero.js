/* public/casillero.js · EL CASILLERO DE MIS PROCESOS (encargo del dueño, 7-sep-2026)
   ─────────────────────────────────────────────────────────────────────────────
   «Que se parezca más a un casillero, como un repositorio donde se pueda de
   manera organizada hacer gestión de todo, como si fuera un cuaderno o un
   drive, donde se puedan tener carpetas con los procesos y ver un calendario
   con los próximos eventos de los procesos a los que me estoy presentando.»

   Hasta hoy la pestaña era UNA lista plana ordenada por cierre. Con veinte
   procesos guardados eso deja de ser un sitio donde trabajar: no hay dónde
   separar lo de vías de lo de edificaciones, no hay dónde apuntar lo que falta
   y no hay una sola pantalla que responda «¿qué me vence esta semana?».

   Este módulo es la capa PURA de esa reforma: organizar (buscar, ordenar,
   agrupar, carpetas), la AGENDA (los eventos de los guardados situados en un
   mes) y el CUADERNO de cada proceso (sus notas y su lista de verificación).
   No pide nada por su cuenta ni escribe en ningún sitio: recibe la respuesta ya
   servida de `/api/perfil?op=seguimiento` y devuelve HTML. Quien llama al
   servidor es public/app.js.

   ═══ LAS SIETE DECISIONES QUE NO HAY QUE RE-APRENDER ═══

   1. NO SE CALCULA NI UN DÍA NI UN PLAZO. Los hitos, los avisos, la ventana de
      la manifestación y los días para el cierre vienen resueltos del servidor;
      aquí solo se AGRUPAN por la fecha que ya traen. El «hoy» es el que manda
      el servidor (`r.hoy`, hora Colombia), nunca el reloj del aparato: en
      Bogotá son las 19:00 y en Greenwich ya es mañana.
   2. LA ARITMÉTICA DEL MES SE PIDE PRESTADA, NO SE COPIA. `mesVecino`,
      `mesLegible`, `diaSemanaLunes`, `diasDelMes`, `mesPorDefecto`,
      `diaPorDefecto` y la propia rejilla salen de public/calendario.js, que ya
      resolvió que un día se compara como cadena `YYYY-MM-DD` y jamás con
      `new Date`. Una segunda aritmética divergiría a la primera corrección.
   3. EL COLOR MIDE PLAZO, NO TIPO. Las clases `cal-rojo/ambar/verde/gris` de
      esta casa significan «cuánto falta», y así se usan aquí. El TIPO de evento
      (cierre, avisar que le interesa, una nota suya) se dice con su PALABRA, no
      con un color: pintar «cierre» de rojo siempre haría que el rojo dejara de
      querer decir «corre prisa».
   4. UNA CARPETA QUE YA NO EXISTE ES INERTE. Si el usuario borra una carpeta y
      la preferencia guardada apuntaba a ella, se abre «Todo»: nunca una lista
      vacía sin explicación. La misma regla del valor de filtro desconocido.
   5. UNA CARPETA VACÍA SE VE. Es un estante que el usuario creó a propósito y
      esconderlo sería decirle que su carpeta no existe; se enseña con la frase
      que dice cómo llenarla. Solo desaparece cuando hay una búsqueda en curso:
      ahí el usuario preguntó por unos procesos, no por sus estantes.
   6. BUSCAR ALCANZA A LO QUE USTED ESCRIBIÓ. Un cuaderno donde no se pueden
      buscar las propias notas no es un cuaderno: la búsqueda barre el nombre,
      la entidad, el departamento, las notas y la lista de verificación.
   7. NADA SE PIERDE POR UN FALLO DEL ALMACENAMIENTO LOCAL. Las preferencias de
      vista viven en `localStorage` dentro de try/catch; en modo restringido la
      pestaña abre con los valores por omisión y no se entera nadie.

   Expone `window.Casillero`; también sirve en Node (las pruebas lo requieren). */
(function (raiz, fabrica) {
  const api = fabrica();
  if (typeof module === "object" && module.exports) module.exports = api;
  else raiz.Casillero = api;
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const miles = (n) => Number(n || 0).toLocaleString("es-CO", { maximumFractionDigits: 0 });

  /* El calendario de cierres ya resolvió toda la aritmética del mes. Se busca
     DIFERIDO, dentro de la función: un `window.Calendario` en el nivel superior
     se evaluaría al cargar el archivo, cuando todavía puede no existir. */
  function raizCalendario() {
    if (typeof window !== "undefined" && window.Calendario) return window.Calendario;
    try { return require("./calendario.js"); } catch { return null; }
  }

  /* ══════════════════════ CÓMO SE ORGANIZA LA PANTALLA ══════════════════════ */

  const VISTAS = Object.freeze([
    Object.freeze({ id: "lista", etiqueta: "Lista" }),
    Object.freeze({ id: "calendario", etiqueta: "Calendario" }),
  ]);
  const ORDENES = Object.freeze([
    Object.freeze({ id: "cierre", etiqueta: "Los que cierran antes" }),
    Object.freeze({ id: "guardado", etiqueta: "Los últimos que guardó" }),
    Object.freeze({ id: "presupuesto", etiqueta: "Los de más presupuesto" }),
    Object.freeze({ id: "entidad", etiqueta: "Por entidad" }),
    Object.freeze({ id: "nombre", etiqueta: "Por nombre" }),
  ]);
  const AGRUPACIONES = Object.freeze([
    Object.freeze({ id: "carpeta", etiqueta: "Agrupados por carpeta" }),
    Object.freeze({ id: "etapa", etiqueta: "Agrupados por etapa" }),
    Object.freeze({ id: "ninguna", etiqueta: "Todos seguidos" }),
  ]);
  const CARPETA_TODO = "todo";
  const CARPETA_SIN = "sin";
  const POR_OMISION = Object.freeze({ vista: "lista", orden: "cierre", agrupar: "carpeta", carpeta: CARPETA_TODO });
  const CLAVE_PREFERENCIAS = "detekta-casillero";

  const idsDe = (lista) => lista.map((x) => x.id);
  const valido = (v, lista, omision) => (idsDe(lista).includes(String(v)) ? String(v) : omision);

  /* Las preferencias de la pestaña (qué vista, qué orden, qué carpeta abierta).
     SIEMPRE dentro de try: en modo restringido el acceso LANZA y la pestaña no
     puede morir por una preferencia. Un valor desconocido cae al de omisión. */
  function leerPreferencias(almacen) {
    let bruto = null;
    try {
      const a = almacen || (typeof localStorage !== "undefined" ? localStorage : null);
      bruto = a ? JSON.parse(a.getItem(CLAVE_PREFERENCIAS) || "null") : null;
    } catch { bruto = null; }
    const v = bruto && typeof bruto === "object" ? bruto : {};
    return {
      vista: valido(v.vista, VISTAS, POR_OMISION.vista),
      orden: valido(v.orden, ORDENES, POR_OMISION.orden),
      agrupar: valido(v.agrupar, AGRUPACIONES, POR_OMISION.agrupar),
      carpeta: typeof v.carpeta === "string" && v.carpeta ? v.carpeta : POR_OMISION.carpeta,
    };
  }
  function guardarPreferencias(pref, almacen) {
    try {
      const a = almacen || (typeof localStorage !== "undefined" ? localStorage : null);
      if (a) a.setItem(CLAVE_PREFERENCIAS, JSON.stringify(pref));
    } catch { /* preferencia no recordada: la pestaña abre con lo de siempre */ }
  }
  /* La carpeta abierta que ya no existe NO deja la pantalla vacía: se abre
     «Todo». Es la regla del valor de filtro desconocido, aplicada al casillero. */
  function carpetaVigente(carpeta, carpetas) {
    const c = String(carpeta || CARPETA_TODO);
    if (c === CARPETA_TODO || c === CARPETA_SIN) return c;
    return (carpetas || []).some((x) => x.id === c) ? c : CARPETA_TODO;
  }

  /* ══════════════════════ BUSCAR, ORDENAR Y AGRUPAR ══════════════════════ */

  /* Sin tildes y en minúsculas: quien busca «vias» tiene que encontrar «vías».
     El texto del proceso incluye lo que USTED escribió (notas y lista de
     verificación): un cuaderno donde no se buscan las propias notas no sirve. */
  const plano = (s) => String(s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  function textoDe(p) {
    const pr = p.proceso || {};
    return plano([
      pr.nombre, pr.entidad, pr.departamento, pr.modalidad, p.id, p.notas, p.estado_etiqueta,
      ...((p.tareas || []).map((t) => t.texto)),
    ].filter(Boolean).join(" "));
  }
  function filtrar(procesos, { texto = "", carpeta = CARPETA_TODO } = {}) {
    const q = plano(texto).trim();
    const partes = q ? q.split(/\s+/) : [];
    return (procesos || []).filter((p) => {
      if (carpeta === CARPETA_SIN && p.carpeta) return false;
      if (carpeta !== CARPETA_TODO && carpeta !== CARPETA_SIN && p.carpeta !== carpeta) return false;
      if (!partes.length) return true;
      const t = textoDe(p);
      return partes.every((x) => t.includes(x));
    });
  }

  /* El orden «cierre» NO se recalcula: el servidor ya sirve la lista con lo que
     cierra antes delante y lo cerrado detrás (una segunda cuenta de días
     divergiría). Los demás órdenes reordenan lo ya servido, y lo que no tiene
     el dato va SIEMPRE al final: sin presupuesto publicado no es presupuesto 0. */
  function ordenar(procesos, { por = "cierre" } = {}) {
    const l = [...(procesos || [])];
    const cmpTexto = (a, b) => String(a || "").localeCompare(String(b || ""), "es-CO");
    const alFinal = (v) => (v == null || v === "" ? 1 : 0);
    if (por === "guardado") return l.sort((a, b) => String(b.guardado || "").localeCompare(String(a.guardado || "")));
    if (por === "presupuesto") {
      return l.sort((a, b) => {
        const va = (a.proceso || {}).presupuesto_cop, vb = (b.proceso || {}).presupuesto_cop;
        return (alFinal(va) - alFinal(vb)) || (Number(vb || 0) - Number(va || 0));
      });
    }
    if (por === "entidad") {
      return l.sort((a, b) => {
        const va = (a.proceso || {}).entidad, vb = (b.proceso || {}).entidad;
        return (alFinal(va) - alFinal(vb)) || cmpTexto(va, vb);
      });
    }
    if (por === "nombre") {
      return l.sort((a, b) => {
        const va = (a.proceso || {}).nombre, vb = (b.proceso || {}).nombre;
        return (alFinal(va) - alFinal(vb)) || cmpTexto(va, vb);
      });
    }
    return l;
  }

  /* Los grupos del casillero. Devuelve [{clave, titulo, n, nota, vacio, procesos}].
     · por carpeta: una por cada carpeta del perfil (VACÍAS incluidas: son
       estantes que el usuario creó) y «Sin carpeta» al final. Con una búsqueda
       en curso las vacías no salen: ahí preguntó por procesos, no por estantes.
     · por etapa: en el orden del recorrido que fija el servidor.
     · ninguna: un solo grupo sin cabecera. */
  function agrupar(procesos, { por = "carpeta", carpetas = [], estados = {}, ordenEstados = [], buscando = false } = {}) {
    const ps = procesos || [];
    if (por === "etapa") {
      const orden = ordenEstados.length ? ordenEstados : [...new Set(ps.map((p) => p.estado))];
      return orden
        .map((e) => ({ clave: `etapa:${e}`, titulo: estados[e] || e, procesos: ps.filter((p) => p.estado === e) }))
        .filter((g) => g.procesos.length)
        .map(conCierre);
    }
    if (por === "carpeta") {
      const grupos = (carpetas || []).map((c) => ({ clave: `carpeta:${c.id}`, titulo: c.nombre, carpeta: c.id, procesos: ps.filter((p) => p.carpeta === c.id) }));
      const sueltos = ps.filter((p) => !p.carpeta);
      if (sueltos.length) grupos.push({ clave: "carpeta:sin", titulo: "Sin carpeta", carpeta: null, procesos: sueltos });
      return grupos.filter((g) => g.procesos.length || !buscando).map(conCierre);
    }
    return [{ clave: "todos", titulo: null, procesos: ps, n: ps.length, nota: null, vacio: !ps.length }];
  }
  /* La cabecera de un grupo dice CUÁNTOS hay y qué es lo próximo que cierra —de
     las fechas ya servidas, sin calcular ninguna—. Sin ninguna abierta, calla:
     «el próximo cierre» de un grupo cerrado sería una fecha del pasado con cara
     de aviso. */
  function conCierre(g) {
    const abiertos = g.procesos.filter((p) => p.cerrado === false && (p.proceso || {}).fecha_cierre);
    const proximo = abiertos.map((p) => String(p.proceso.fecha_cierre).slice(0, 10)).sort()[0] || null;
    return { ...g, n: g.procesos.length, proximo_cierre: proximo, nota: null, vacio: !g.procesos.length };
  }

  /* ══════════════════════ LA AGENDA ══════════════════════
     Un evento es una fecha de un proceso guardado. Salen de dos sitios y los dos
     vienen ya resueltos del servidor: los HITOS del cronograma (con su origen:
     dataset de SECOP II, cronograma del pliego o calculado por la aplicación) y
     lo que USTED se apuntó en la lista de verificación con fecha. Nunca se
     mezcla de quién es la fecha: el evento lleva `origen` y la pantalla lo dice. */
  function eventosDe(p) {
    const pr = p.proceso || {};
    const base = { id_proceso: p.id, proceso: pr.nombre || p.id, entidad: pr.entidad || null, estado: p.estado };
    const out = [];
    for (const h of p.hitos || []) {
      if (!h || !h.fecha) continue;
      out.push({ ...base, tipo: "hito", clave: h.id, etiqueta: h.etiqueta, fecha: String(h.fecha).slice(0, 10), origen: h.origen || "dataset", evidencia: h.evidencia || null, hecha: null });
    }
    for (const t of p.tareas || []) {
      if (!t || !t.fecha) continue;
      out.push({ ...base, tipo: "tarea", clave: t.id, etiqueta: t.texto, fecha: String(t.fecha).slice(0, 10), origen: "usted", evidencia: null, hecha: t.hecha === true });
    }
    /* LAS FECHAS DEL CONTRATO (8-sep-2026). Vienen YA RESUELTAS del servidor
       (`hitos_contrato`, de lib/expediente): aquí no se vuelve a derivar cuándo
       vence una póliza — es la regla 1 de este módulo, y una segunda derivación
       divergiría de la que arma los avisos y el .ics. */
    for (const h of p.hitos_contrato || []) {
      if (!h || !h.fecha) continue;
      out.push({ ...base, tipo: "contrato", clave: h.id, etiqueta: h.etiqueta, fecha: String(h.fecha).slice(0, 10), origen: h.origen || "usted", evidencia: h.evidencia || null, hecha: null });
    }
    return out;
  }
  /* POR QUÉ EL CALENDARIO SE FILTRA POR TIPO DE FECHA. Con veinte procesos
     guardados hay más de cien fechas y el mes se vuelve ilegible justo cuando
     más procesos lleva. Los tipos son los del oficio —entregar la oferta,
     avisar que le interesa, lo que usted apuntó— y no categorías genéricas: es
     lo que hacen los tableros de licitación que sí funcionan. «Otras fechas»
     agrupa el resto del cronograma (apertura, adjudicación, observaciones). */
  const TIPOS_EVENTO = Object.freeze([
    Object.freeze({ id: "todos", etiqueta: "Todas" }),
    Object.freeze({ id: "cierre", etiqueta: "Entrega de la oferta" }),
    Object.freeze({ id: "manifestacion", etiqueta: "Avisar que le interesa" }),
    Object.freeze({ id: "tarea", etiqueta: "Lo que usted apuntó" }),
    /* las fechas de un contrato ya ganado son un tipo aparte: mezclarlas con
       «otras fechas del proceso» escondería lo único que corre después de
       adjudicar (8-sep-2026) */
    Object.freeze({ id: "contrato", etiqueta: "Fechas del contrato" }),
    Object.freeze({ id: "otras", etiqueta: "Otras fechas del proceso" }),
  ]);
  const tipoDeEvento = (e) => (e.tipo === "tarea" ? "tarea" : e.tipo === "contrato" ? "contrato" : (e.clave === "cierre" || e.clave === "manifestacion") ? e.clave : "otras");

  /* Todos los eventos, agrupados por el DÍA que ya traen. `sin_fecha` cuenta los
     procesos que no se pueden situar en ningún día (el corpus no publica su
     cierre): colocarlos «hoy» los inventaría, y callarlos los escondería. */
  function agendaDe(procesos, { hoy = null } = {}) {
    const porDia = new Map();
    const conteos = { todos: 0, cierre: 0, manifestacion: 0, tarea: 0, contrato: 0, otras: 0 };
    let sinFecha = 0;
    for (const p of procesos || []) {
      const evs = eventosDe(p);
      if (!evs.length) { sinFecha++; continue; }
      for (const e of evs) {
        const d = porDia.get(e.fecha) || { fecha: e.fecha, n: 0, eventos: [] };
        d.n++; d.eventos.push(e); porDia.set(e.fecha, d);
        conteos.todos++; conteos[tipoDeEvento(e)]++;
      }
    }
    const dias = [...porDia.values()].sort((a, b) => a.fecha.localeCompare(b.fecha));
    for (const d of dias) d.eventos.sort((a, b) => (PESO_EVENTO(a) - PESO_EVENTO(b)) || String(a.proceso).localeCompare(String(b.proceso), "es-CO"));
    return { hoy: hoy || null, dias, sin_fecha: sinFecha, total: (procesos || []).length, conteos_por_tipo: conteos, tipo: "todos" };
  }
  /* La agenda con un solo tipo de fecha. Los CONTEOS no se recalculan: los chips
     tienen que seguir diciendo cuántas hay de cada tipo aunque haya una puesta,
     o el usuario no sabría a qué está volviendo. */
  function filtrarAgenda(agenda, tipo) {
    const t = TIPOS_EVENTO.some((x) => x.id === tipo) ? tipo : "todos";
    if (!agenda || t === "todos") return { ...(agenda || {}), tipo: "todos" };
    const dias = (agenda.dias || [])
      .map((d) => { const evs = d.eventos.filter((e) => tipoDeEvento(e) === t); return { ...d, eventos: evs, n: evs.length }; })
      .filter((d) => d.n);
    return { ...agenda, dias, tipo: t };
  }
  /* Dentro de un día manda lo que no se puede recuperar si se pasa: primero el
     cierre, después el plazo para avisar que le interesa, después lo demás y al
     final lo que usted mismo se apuntó (eso lo puede mover; una fecha de la
     entidad, no). */
  const ORDEN_CLAVE = { cierre: 0, manifestacion: 1, apertura: 2, adjudicacion: 3 };
  const PESO_EVENTO = (e) => (e.tipo === "tarea" ? 9 : (ORDEN_CLAVE[e.clave] != null ? ORDEN_CLAVE[e.clave] : 5));

  /* CÓMO SE NOMBRA CADA EVENTO. El tipo se dice con su PALABRA; el color mide
     PLAZO (cuánto falta), que es lo que las clases `cal-*` significan en esta
     casa. Una fecha que la aplicación calculó, o que usted anotó, lo declara:
     nunca se presenta como publicada por la entidad. */
  function rotuloEvento(e) {
    if (e.tipo === "tarea") return "Se lo apuntó usted";
    if (e.clave === "cierre") return "Entrega de la oferta";
    if (e.clave === "manifestacion") return "Avisar que le interesa";
    if (e.clave === "apertura") return "Apertura de ofertas";
    if (e.clave === "adjudicacion") return "Adjudicación";
    return "Fecha del proceso";
  }
  function fuenteEvento(e) {
    if (e.origen === "usted") return "lo anotó usted";
    if (e.origen === "pliego") return "fecha del cronograma del pliego";
    if (e.origen === "calculado") return "fecha calculada por la aplicación, no publicada";
    return "fecha publicada en SECOP II";
  }
  function tonoPlazo(fecha, hoy) {
    if (!hoy) return "cal-gris";
    if (fecha < hoy) return "cal-gris";
    const C = raizCalendario();
    if (!C) return "cal-verde";
    const dias = Math.round((Date.parse(`${fecha}T12:00:00Z`) - Date.parse(`${hoy}T12:00:00Z`)) / 86400000);
    if (dias <= 1) return "cal-rojo";
    if (dias <= 7) return "cal-ambar";
    return "cal-verde";
  }

  /* ══════════════════════ EL HTML DE LA AGENDA ══════════════════════ */

  function htmlEvento(e, hoy) {
    const tono = tonoPlazo(e.fecha, hoy);
    const hecha = e.tipo === "tarea" && e.hecha === true;
    return `<li class="cal-fila">
      <div class="cal-fila-cabeza">
        <span class="cal-chip ${tono}">${esc(rotuloEvento(e))}</span>
        <span class="cal-objeto">${esc(e.etiqueta)}${hecha ? " (ya la marcó como hecha)" : ""}</span>
      </div>
      <p class="cal-meta"><button type="button" class="cas-enlace" data-seg-ir="${esc(e.id_proceso)}" title="Llevarme a este proceso en la lista">${esc(e.proceso)}</button>${e.entidad ? ` · ${esc(e.entidad)}` : ""} · ${esc(fuenteEvento(e))}</p>
    </li>`;
  }

  function htmlDiaAgenda(agenda, dia) {
    const C = raizCalendario();
    const d = (agenda.dias || []).find((x) => x.fecha === dia);
    const legible = C ? C.fechaLegible(dia) : dia;
    if (!d) return `<p class="cal-vacio">No tiene ninguna fecha el ${esc(legible)}.</p>`;
    const hoy = agenda.hoy || "";
    const frase = d.fecha === hoy
      ? `${miles(d.n)} ${d.n === 1 ? "fecha suya es hoy" : "fechas suyas son hoy"}`
      : d.fecha < hoy
        ? `${miles(d.n)} ${d.n === 1 ? "fecha pasó" : "fechas pasaron"} el ${legible}`
        : `${miles(d.n)} ${d.n === 1 ? "fecha le cae" : "fechas le caen"} el ${legible}`;
    return `<p class="cal-dia-t">${esc(frase)}</p>
      <ul class="cal-lista">${d.eventos.map((e) => htmlEvento(e, hoy)).join("")}</ul>`;
  }

  /* Los chips de tipo de fecha. Cuentan sobre la agenda COMPLETA aunque haya un
     tipo puesto —si no, el usuario no sabría a qué está volviendo— y el que no
     tiene ninguna no se pinta: un chip «Avisar que le interesa (0)» invita a
     pulsar algo que no va a enseñar nada. */
  function htmlTiposEvento(agenda, { activo = "todos" } = {}) {
    const c = (agenda && agenda.conteos_por_tipo) || {};
    return TIPOS_EVENTO.filter((t) => t.id === "todos" || c[t.id])
      .map((t) => chip(activo === t.id, `${t.etiqueta} (${miles(c[t.id] || 0)})`, `data-cas-tipo="${esc(t.id)}"`))
      .join("");
  }

  /* La pantalla del mes. La rejilla y toda la aritmética son las de
     public/calendario.js, con el sustantivo cambiado: aquí una casilla no cuenta
     cierres, cuenta fechas de cualquier tipo. */
  function htmlMesAgenda(agenda, { mes, dia } = {}) {
    const C = raizCalendario();
    if (!C || !agenda || !Array.isArray(agenda.dias)) return "";
    const m = mes || C.mesDe(agenda.hoy || (agenda.dias[0] && agenda.dias[0].fecha) || "");
    if (!m) return "";
    const delMes = agenda.dias.filter((d) => C.mesDe(d.fecha) === m);
    const nMes = delMes.reduce((a, d) => a + d.n, 0);
    const anterior = C.mesVecino(m, -1), siguiente = C.mesVecino(m, 1);
    const hayAntes = agenda.dias.some((d) => C.mesDe(d.fecha) < m);
    const hayDespues = agenda.dias.some((d) => C.mesDe(d.fecha) > m);
    const resumen = nMes
      ? `${miles(nMes)} ${nMes === 1 ? "fecha suya cae" : "fechas suyas caen"} en ${C.mesLegible(m)}.`
      : `No tiene ninguna fecha en ${C.mesLegible(m)}.`;
    const sin = agenda.sin_fecha
      ? ` ${miles(agenda.sin_fecha)} ${agenda.sin_fecha === 1 ? "proceso guardado no tiene ninguna fecha publicada" : "procesos guardados no tienen ninguna fecha publicada"}: no se pueden situar en ningún día.`
      : "";
    /* UN FILTRO PUESTO SE DICE ARRIBA, no solo en el chip encendido: el riesgo
       conocido de este mando es que el usuario deje un tipo puesto, vuelva un
       mes después y crea que no tiene nada. La frase nombra el filtro y cuántas
       está escondiendo. */
    const t = agenda.tipo && agenda.tipo !== "todos" ? TIPOS_EVENTO.find((x) => x.id === agenda.tipo) : null;
    const escondidas = t ? ((agenda.conteos_por_tipo || {}).todos || 0) - ((agenda.conteos_por_tipo || {})[t.id] || 0) : 0;
    const filtro = t ? ` Está viendo solo «${t.etiqueta}»: hay ${miles(escondidas)} ${escondidas === 1 ? "fecha más" : "fechas más"} que no salen. Pulse «Todas» para verlas.` : "";
    return `<div class="cas-tipos" role="group" aria-label="Qué fechas quiere ver">${htmlTiposEvento(agenda, { activo: agenda.tipo || "todos" })}</div>
      <div class="cal-barra">
        <button type="button" class="cal-mes-btn" data-cas-mes="${esc(anterior)}"${hayAntes ? "" : " disabled"} aria-label="Mes anterior">&lsaquo;</button>
        <h3 class="cal-mes">${esc(C.mesLegible(m))}</h3>
        <button type="button" class="cal-mes-btn" data-cas-mes="${esc(siguiente)}"${hayDespues ? "" : " disabled"} aria-label="Mes siguiente">&rsaquo;</button>
      </div>
      <p class="cal-resumen">${esc(resumen)}${esc(sin)}${esc(filtro)}</p>
      ${C.htmlRejilla(agenda, { mes: m, dia }, { uno: "fecha", varios: "fechas", ninguno: "ninguna fecha", grupo: "Fechas" })}
      <div class="cal-detalle">${dia ? htmlDiaAgenda(agenda, dia) : '<p class="cal-vacio">Pulse un día marcado para ver qué le cae ese día.</p>'}</div>`;
  }

  /* Qué mes y qué día se abren solos: los mismos criterios del calendario de
     cierres (el de hoy si tiene algo; si no, el próximo que lo tenga). */
  function mesPorDefecto(agenda) { const C = raizCalendario(); return C ? C.mesPorDefecto(agenda) : null; }
  function diaPorDefecto(agenda, mes) { const C = raizCalendario(); return C ? C.diaPorDefecto(agenda, mes) : null; }

  /* ══════════════════════ LAS CARPETAS ══════════════════════ */

  function chip(activo, texto, attrs) {
    return `<button type="button" class="${activo ? "cas-chip cas-chip-activo" : "cas-chip"}" aria-pressed="${activo ? "true" : "false"}" ${attrs}>${esc(texto)}</button>`;
  }
  /* La fila de carpetas: «Todo», cada carpeta con cuántos tiene y «Sin carpeta»
     solo si hay alguno suelto. Es la navegación del casillero. */
  function htmlCarpetas(carpetas, { activa = CARPETA_TODO, resumen = {}, total = 0 } = {}) {
    const porCarpeta = resumen && resumen.por_carpeta ? resumen.por_carpeta : {};
    const sueltos = porCarpeta.sin_carpeta;
    const filas = [chip(activa === CARPETA_TODO, `Todo (${miles(total)})`, `data-cas-carpeta="${CARPETA_TODO}"`)];
    for (const c of carpetas || []) {
      const n = c.n_procesos != null ? c.n_procesos : porCarpeta[c.id];
      filas.push(chip(activa === c.id, `${c.nombre} (${miles(n || 0)})`, `data-cas-carpeta="${esc(c.id)}"`));
    }
    if (sueltos) filas.push(chip(activa === CARPETA_SIN, `Sin carpeta (${miles(sueltos)})`, `data-cas-carpeta="${CARPETA_SIN}"`));
    return filas.join("");
  }

  /* El panel para crear, cambiar de nombre y quitar carpetas. Va plegado: lo que
     hay que VER va arriba y lo que hay que TOCAR va plegado. Quitar una carpeta
     dice, antes de pulsar, que los procesos NO se borran. */
  function htmlOrganizar(carpetas, { topes = {} } = {}) {
    const tope = topes.carpetas || 40;
    const largo = topes.nombre_carpeta || 60;
    const filas = (carpetas || []).map((c) => `<li class="cas-org-fila">
        <input type="text" class="control-campo cas-org-campo" value="${esc(c.nombre)}" maxlength="${largo}" data-cas-nombre="${esc(c.id)}" aria-label="Nombre de la carpeta ${esc(c.nombre)}">
        <button type="button" class="control-boton cas-org-boton" data-cas-renombrar="${esc(c.id)}">Guardar el nombre</button>
        <button type="button" class="control-boton cas-org-boton" data-cas-quitar="${esc(c.id)}" title="La carpeta se quita; los procesos que tenga dentro pasan a «Sin carpeta» y no se borra ninguno">Quitar la carpeta</button>
      </li>`).join("");
    return `<div class="cas-org">
      <div class="cas-org-nueva">
        <!-- se localiza por ATRIBUTO, no por id: este marcado lo pinta el
             navegador y un id suelto no estaría en index.html, que es donde la
             suite comprueba que todo lo que app.js busca existe de verdad -->
        <input type="text" data-cas-nueva="1" class="control-campo cas-org-campo" maxlength="${largo}" placeholder="Nombre de la carpeta nueva" aria-label="Nombre de la carpeta nueva">
        <button type="button" class="control-boton cas-org-boton" data-cas-crear="1">Crear la carpeta</button>
      </div>
      ${filas ? `<ul class="cas-org-lista">${filas}</ul>` : `<p class="cas-nota">Todavía no tiene carpetas. Cree una y después, en cada proceso, elija en cuál guardarlo.</p>`}
      <p class="cas-nota">Puede tener hasta ${miles(tope)} carpetas. Quitar una carpeta no borra ningún proceso: los que tenga dentro pasan a «Sin carpeta».</p>
    </div>`;
  }

  /* El mando de cada tarjeta: en qué carpeta está este proceso. Un selector, no
     un arrastre: en el teléfono arrastrar no existe y el dueño trabaja ahí. */
  function htmlCarpetaDe(p, carpetas) {
    const opciones = [`<option value="">Sin carpeta</option>`]
      .concat((carpetas || []).map((c) => `<option value="${esc(c.id)}"${p.carpeta === c.id ? " selected" : ""}>${esc(c.nombre)}</option>`));
    return `<label class="cas-carpeta-sel"><span class="cas-carpeta-rotulo">Carpeta</span>
      <select class="control-select cas-carpeta-select" data-seg-carpeta="${esc(p.id)}" aria-label="Carpeta en la que guarda este proceso">${opciones.join("")}</select>
    </label>`;
  }

  /* ══════════════════════ EL CUADERNO DE CADA PROCESO ══════════════════════
     Sus notas (texto libre) y su lista de verificación (lo que falta, con fecha
     opcional). El servidor guardaba las notas desde agosto y la pantalla nunca
     las enseñó: aquí aparecen por primera vez. */
  function htmlTarea(p, t, hoy) {
    const vencida = !t.hecha && t.fecha && hoy && t.fecha < hoy;
    const C = raizCalendario();
    const cuando = t.fecha ? (C ? C.fechaLegibleAnio(t.fecha) : t.fecha) : null;
    /* LA CASILLA VA DENTRO DE SU `label`, que es como esta casa resuelve el
       suelo táctil: `#app input[type=checkbox]` fija 16 px para TODAS las
       casillas y `#app label:has(> input[type=checkbox])` le da 24 px de alto
       al rótulo. Así el área que se pulsa es la línea entera —el texto también
       marca— y el nombre accesible sale del propio texto, sin un `aria-label`
       que lo repita. Medido en Chromium: la casilla suelta se quedaba en 16 px,
       por debajo del suelo, y en el teléfono se falla el toque. */
    return `<li class="cas-tarea">
      <label class="cas-tarea-marca">
        <input type="checkbox" class="cas-tarea-casilla" data-seg-tarea="${esc(p.id)}" data-seg-tarea-id="${esc(t.id)}"${t.hecha ? " checked" : ""}>
        <span class="${t.hecha ? "cas-tarea-texto cas-tarea-hecha" : "cas-tarea-texto"}">${esc(t.texto)}</span>
      </label>
      ${cuando ? `<span class="${vencida ? "cal-chip cal-rojo" : "cal-chip cal-gris"}">${vencida ? "Se le pasó: " : "Para el "}${esc(cuando)}</span>` : ""}
      <button type="button" class="cas-tarea-quitar" data-seg-tarea-quitar="${esc(p.id)}" data-seg-tarea-quitar-id="${esc(t.id)}" aria-label="Quitar de la lista: ${esc(t.texto)}" title="Quitar de la lista">Quitar</button>
    </li>`;
  }

  /* EL DISTINTIVO DE LA TARJETA: «2 de 5 hechas», para ver de un vistazo qué
     proceso tiene cabos sueltos sin abrir nada. Sin lista NO se pinta: un
     «0 de 0» leería como «no ha avanzado nada» sobre alguien que ni siquiera
     tiene lista — la ausencia no es un cero. */
  /* CÓMO VA LA LISTA, EN UNA FRASE Y EN UN SOLO SITIO. La usan el distintivo de
     la tarjeta y el título del pliegue: dos redacciones de lo mismo divergirían
     a la primera corrección — y la primera fue la concordancia, que el navegador
     real cazó («0 de 1 hechas», «1 se le pasaron»). */
  function fraseTareas(r) {
    if (!r || !r.total) return "";
    const hechas = `${miles(r.hechas)} de ${miles(r.total)} ${r.total === 1 ? "hecha" : "hechas"}`;
    return r.vencidas ? `${hechas} · ${miles(r.vencidas)} se le ${r.vencidas === 1 ? "pasó" : "pasaron"}` : hechas;
  }
  function insigniaCuaderno(p) {
    const r = (p && p.tareas_resumen) || null;
    if (!r || !r.total) return "";
    const tono = r.vencidas ? "cal-chip cal-rojo" : r.hechas === r.total ? "cal-chip cal-verde" : "cal-chip cal-gris";
    return `<span class="${tono}" title="Lo que apuntó en su cuaderno de este proceso">${esc(fraseTareas(r))}</span>`;
  }

  /* `abierto` y `borrador` no son adorno: la lista se repinta sola cuando
     termina de leerse un documento, y sin ellos el pliegue se cerraba y lo que
     el usuario estaba escribiendo se perdía sin un aviso. El borrador manda
     sobre lo guardado mientras exista; lo olvida quien lo guardó. */
  function htmlCuaderno(p, { hoy = null, topes = {}, abierto = false, borrador = null } = {}) {
    const tareas = p.tareas || [];
    const r = p.tareas_resumen || { total: 0, hechas: 0, pendientes: 0, vencidas: 0 };
    const notas = borrador != null ? borrador : (p.notas || "");
    const largoNotas = topes.notas || 600;
    const largoTarea = topes.texto_tarea || 160;
    const topeTareas = topes.tareas || 30;
    const resumen = r.total ? fraseTareas(r) : (notas ? "con notas suyas" : "vacío");
    const sinGuardar = borrador != null && borrador !== (p.notas || "");
    return `<details class="guia-caja cas-cuaderno" data-seg-cuaderno="${esc(p.id)}"${abierto ? " open" : ""}>
      <summary class="cas-cuaderno-titulo"><span class="min-w-0 flex-1">Su cuaderno de este proceso <span class="cas-nota">${esc(resumen)}</span></span></summary>
      <div class="cas-cuaderno-cuerpo">
        <p class="cas-rotulo">Lo que le falta para presentarse</p>
        ${tareas.length ? `<ul class="cas-tareas">${tareas.map((t) => htmlTarea(p, t, hoy)).join("")}</ul>`
          : `<p class="cas-nota">Todavía no ha apuntado nada. Escriba abajo lo que le falte y, si tiene fecha, se la recordamos en el calendario.</p>`}
        ${tareas.length >= topeTareas
          ? `<p class="cas-nota">Llegó al tope de ${miles(topeTareas)} anotaciones en este proceso. Quite alguna hecha para apuntar otra.</p>`
          : `<div class="cas-tarea-nueva">
              <input type="text" class="control-campo cas-tarea-campo" maxlength="${largoTarea}" placeholder="Qué le falta (por ejemplo: pedir la póliza)" data-seg-tarea-texto="${esc(p.id)}" aria-label="Qué le falta para presentarse a este proceso">
              <input type="date" class="control-campo cas-tarea-fecha" data-seg-tarea-fecha="${esc(p.id)}" aria-label="Para cuándo lo necesita (opcional)">
              <button type="button" class="control-boton cas-org-boton" data-seg-tarea-anadir="${esc(p.id)}">Apuntar</button>
            </div>`}
        <p class="cas-rotulo">Sus notas</p>
        <textarea class="control-campo cas-notas" rows="3" maxlength="${largoNotas}" data-seg-notas="${esc(p.id)}" aria-label="Notas suyas sobre este proceso" placeholder="Lo que quiera recordar de este proceso: con quién habló, qué le dijeron, qué decidió.">${esc(notas)}</textarea>
        <div class="cas-notas-pie">
          <button type="button" class="control-boton cas-org-boton" data-seg-notas-guardar="${esc(p.id)}">Guardar las notas</button>
          <span class="cas-nota">${sinGuardar ? "Lo que escribió todavía no está guardado." : `Hasta ${miles(largoNotas)} caracteres. Solo las ve usted.`}</span>
        </div>
      </div>
    </details>`;
  }


  /* ═══════════════ LA CUENTA ATRÁS, Y POR QUÉ NO SIEMPRE HAY HORA ═══════════
     Encargo del dueño: «cuando un proceso esté en Presentando oferta, mostrar
     cuánto falta, actualizado en tiempo real».

     LA REGLA QUE LA GOBIERNA: solo se cuenta en horas y minutos lo que TIENE
     hora. El cierre de ofertas la trae del dataset («2026-10-20T15:00:00») y
     ahí un reloj es honesto. El sorteo, la manifestación y cualquier fecha del
     cronograma del pliego traen el DÍA y nada más —el pliego publica el día, no
     la hora—, así que ahí la cuenta se dice en días: un contador de horas sobre
     una fecha sin hora es una precisión inventada, y esta casa ya tiene escrito
     que no se pone cuenta regresiva sobre una fecha que no la sostiene.

     Y LA TRAMPA DEL HUSO, que es la que rompe esto en un navegador: la marca de
     tiempo del dataset no lleva zona, y `Date.parse("2026-10-20T15:00:00")` la
     interpreta con la zona DEL APARATO — en el servidor (UTC) sale una hora y
     en un teléfono en Bogotá otra. Se arma con `Date.UTC` a partir de las
     piezas y se compara contra el «ahora» corrido a hora de Colombia: así la
     cuenta sale igual en cualquier parte del mundo, que es la misma doctrina
     del calendario de esta casa. */
  const OFFSET_COLOMBIA_MS = 5 * 3600000;
  const RE_FECHA_HORA = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2}))?)?/;

  function cuentaAtras(fechaHora, ahoraMs) {
    const m = RE_FECHA_HORA.exec(String(fechaHora == null ? "" : fechaHora));
    if (!m) return null;
    const [, a, me, d, h, mi, se] = m;
    const conHora = h != null;
    const t = Date.UTC(Number(a), Number(me) - 1, Number(d), conHora ? Number(h) : 0, conHora ? Number(mi) : 0, conHora ? Number(se || 0) : 0);
    if (!Number.isFinite(t)) return null;
    const ahora = Number(ahoraMs);
    if (!Number.isFinite(ahora)) return null;
    /* «Ahora», llevado a hora de Colombia y expresado en el mismo marco que `t`.
       SIN HORA la referencia no es este instante sino el PRINCIPIO DEL DÍA de
       hoy: del 8 al 10 faltan DOS días, no uno y pico. Medir desde este momento
       hasta la medianoche del día 10 daba 1 día y 17 horas, que redondeado hacia
       abajo son «1 día» — un día menos del que el usuario cuenta con los dedos, y
       uno menos del que dice el servidor, que cuenta días de calendario
       (`diasEntreDias`). Dos cuentas del mismo número que no coinciden es
       exactamente lo que esta casa no permite. */
    const ahoraCol = ahora - OFFSET_COLOMBIA_MS;
    const hoy = new Date(ahoraCol);
    const referencia = conHora ? ahoraCol : Date.UTC(hoy.getUTCFullYear(), hoy.getUTCMonth(), hoy.getUTCDate());
    const ms = t - referencia;
    const abs = Math.abs(ms);
    const dias = Math.floor(abs / 86400000);
    const horas = Math.floor((abs % 86400000) / 3600000);
    const minutos = Math.floor((abs % 3600000) / 60000);
    return { ms, paso: ms < 0, con_hora: conHora, dias, horas, minutos, dia: `${a}-${me}-${d}` };
  }

  /* La cuenta atrás en palabras. Con hora baja a minutos; sin hora se queda en
     días Y LO DICE, para que nadie lea una precisión que el dato no tiene. */
  function textoCuentaAtras(c) {
    if (!c) return "";
    const plural = (n, u) => `${miles(n)} ${n === 1 ? u : u + "s"}`;
    if (!c.con_hora) {
      if (c.paso) return c.dias === 0 ? "fue hoy" : `hace ${plural(c.dias, "día")}`;
      return c.dias === 0 ? "es hoy" : `en ${plural(c.dias, "día")}`;
    }
    if (c.paso) return "ya pasó";
    if (c.dias > 0) return `${plural(c.dias, "día")} y ${plural(c.horas, "hora")}`;
    if (c.horas > 0) return `${plural(c.horas, "hora")} y ${plural(c.minutos, "minuto")}`;
    return plural(Math.max(0, c.minutos), "minuto");
  }

  /* EL RELOJ DE LA ENTREGA. Solo mientras el proceso siga abierto: un contador
     en cero sobre algo cerrado es ruido, y en rojo, ruido que asusta. El tono
     sale de la MISMA escala de plazo que todo el casillero (`tonoPlazo` mide
     días), para que el rojo siga queriendo decir lo mismo en toda la pantalla. */
  function htmlCuentaAtrasCierre(p, { ahoraMs = null } = {}) {
    const cierre = p && p.proceso && p.proceso.fecha_cierre;
    if (!cierre || p.cerrado !== false || ahoraMs == null) return "";
    const c = cuentaAtras(cierre, ahoraMs);
    if (!c || c.paso) return "";
    const tono = c.dias <= 1 ? "cal-rojo" : c.dias <= 3 ? "cal-ambar" : c.dias <= 7 ? "cal-gris" : "cal-gris";
    return `<span class="cal-chip ${tono} cas-reloj" data-seg-reloj="${esc(p.id)}" data-seg-reloj-fecha="${esc(String(cierre))}">Para entregar: ${esc(textoCuentaAtras(c))}${c.con_hora ? "" : " (el dato no trae hora)"}</span>`;
  }

  /* ═══════════════ EL SORTEO ═══════════════
     Tres respuestas y no dos, porque la norma es potestativa: «sí» (el pliego
     publicó el día), «puede que sí» (la modalidad lo contempla y todavía no se
     sabe), «aquí no hay» y «no se sabe» (un proceso que agregó usted). La
     decisión y la frase vienen resueltas del servidor (lib/manifestacion): aquí
     solo se elige el tono y se pinta. */
  function htmlSorteo(p, { compacto = false } = {}) {
    const s = p && p.sorteo;
    if (!s) return "";
    if (compacto) {
      if (s.aplica === "si") {
        const tono = s.paso ? "cal-gris" : s.dias != null && s.dias <= 1 ? "cal-rojo" : s.dias != null && s.dias <= 3 ? "cal-ambar" : "cal-gris";
        return `<span class="cal-chip ${tono}">Sorteo ${esc(s.paso ? "el " + (s.fecha || "") : s.dias === 0 ? "hoy" : "en " + miles(s.dias) + (s.dias === 1 ? " día" : " días"))}</span>`;
      }
      if (s.aplica === "posible") return `<span class="cal-chip cal-gris">Puede haber sorteo</span>`;
      return "";
    }
    const titulo = s.aplica === "si" ? "El sorteo" : s.aplica === "posible" ? "El sorteo, si lo hay" : "El sorteo";
    return `<div class="cas-exp-nota"><p class="cas-rotulo">${esc(titulo)}</p><p class="cas-exp-frase">${esc(s.frase)}</p></div>`;
  }

  /* El distintivo de un proceso que agregó el usuario. Va SIEMPRE que exista,
     en la tarjeta y en la agenda: confundirlo con uno de SECOP II sería
     atribuirle a la entidad un dato que escribió el contratista. */
  function insigniaExterno(p) {
    if (!p || !p.externo) return "";
    return `<span class="cal-chip cal-gris cas-externo">Lo agregó usted, no viene de SECOP II</span>`;
  }

  /* Y QUÉ SE PIERDE, EN LA TARJETA. El distintivo dice de dónde viene el dato;
     esta frase dice qué NO va a poder hacer la aplicación con él. La respuesta
     del guardado ya lo decía, pero quien abre la tarjeta tres semanas después no
     vio esa respuesta: la explicación va junto al hueco, no en un aviso que pasó. */
  function notaExterno(p) {
    if (!p || !p.externo) return "";
    return `<p class="cas-nota cas-exp-nota">${esc(p.lectura || "Este proceso lo agregó usted: no viene de SECOP II.")}</p>`;
  }

  /* ═══════════════ LO QUE SE MOVIÓ EN EL PROCESO ═══════════════
     Dos cosas que no se mezclan: los DOCUMENTOS que la entidad publicó (se
     detectan y se listan) y los MENSAJES de SECOP II (no se pueden leer desde
     aquí y se dice sin rodeos). El servidor ya decidió qué es nuevo. */
  function htmlNovedades(p) {
    const n = p && p.novedades;
    const rev = p && p.revision_mensajes;
    if (!p || !n && !rev) return "";
    /* Un proceso que agregó usted NO tiene página en SECOP II ni índice de
       documentos publicados: ofrecerle «revise los mensajes» sería mandarlo a
       un sitio que no existe. */
    if (p.externo) return "";
    /* Y en un proceso ya cerrado el bloque solo aparece si de verdad hay algo
       nuevo: un recordatorio de revisar mensajes sobre un proceso terminado es
       la clase de renglón que hace que el usuario deje de leer los demás. */
    if (p.cerrado !== false && !(n && n.n)) return "";
    const url = (p.proceso && p.proceso.url) || null;
    const enlaceProceso = url && /^https:\/\//i.test(url)
      ? `<a href="${esc(url)}" target="_blank" rel="noopener noreferrer" class="cas-enlace">Abrir el proceso en SECOP II</a>` : "";
    /* El servidor ya acotó la lista (el conteo sigue siendo exacto): aquí no se
       vuelve a recortar, solo se dice cuántos quedaron fuera. */
    const lista = n && n.n
      ? `<ul class="cas-nov-lista">${n.nuevos.map((x) => `<li class="cas-nov-fila">
          <span class="cas-nov-tipo">${esc(x.tipo_legible || "Documento")}</span>
          <span class="cas-nov-nombre">${esc(x.nombre || "sin nombre")}</span>
          ${x.fecha_carga ? `<span class="cas-nota">${esc(x.fecha_carga)}</span>` : `<span class="cas-nota">sin fecha de publicación</span>`}
          ${x.url ? `<a href="${esc(x.url)}" target="_blank" rel="noopener noreferrer" class="cas-enlace">Descargar</a>` : ""}
        </li>`).join("")}</ul>
        ${n.n > n.nuevos.length ? `<p class="cas-nota">Y ${miles(n.n - n.nuevos.length)} más que no caben en esta lista.</p>` : ""}`
      : "";
    const tono = n && n.n ? (n.nuevos.some((x) => x.caliente) ? "cas-nov cas-nov-alta" : "cas-nov cas-nov-media") : "cas-nov";
    return `<div class="${tono}" data-seg-novedades="${esc(p.id)}">
      <p class="cas-rotulo">Lo que se movió en este proceso</p>
      ${n ? `<p class="cas-exp-frase">${esc(fraseNovedadesCliente(n))}</p>` : `<p class="cas-nota">Todavía no se ha leído la lista de documentos publicados de este proceso.</p>`}
      ${lista}
      ${n && n.n ? `<button type="button" class="control-boton cas-org-boton" data-seg-novedades-visto="${esc(p.id)}">Ya los vi</button>` : ""}
      <p class="cas-rotulo">Observaciones y mensajes de SECOP II</p>
      <p class="cas-exp-frase">${esc(rev ? rev.porque : "")}</p>
      <p class="cas-nota">${esc(rev ? rev.frase : "")}</p>
      <div class="cas-nov-acciones">
        ${enlaceProceso}
        <button type="button" class="control-boton cas-org-boton" data-seg-mensajes-revisado="${esc(p.id)}">Ya los revisé</button>
      </div>
    </div>`;
  }

  /* La frase la escribe el servidor (lib/novedades.fraseNovedades) y viaja en la
     alerta; en la tarjeta se vuelve a necesitar sin la alerta, así que aquí se
     arma la MISMA con los mismos datos. No es una segunda cuenta: `n` ya trae
     resuelto qué es nuevo y desde cuándo. */
  function fraseNovedadesCliente(n) {
    if (!n) return "";
    if (!n.n) {
      return n.sin_fecha
        ? `La entidad no ha publicado documentos nuevos desde entonces (${miles(n.sin_fecha)} ${n.sin_fecha === 1 ? "archivo no trae fecha y no se puede" : "archivos no traen fecha y no se pueden"} comparar).`
        : "La entidad no ha publicado documentos nuevos desde entonces.";
    }
    const desde = n.referencia && n.referencia.tipo === "guardado" ? "desde que lo guardó" : "desde la última vez que los dio por vistos";
    return `La entidad publicó ${miles(n.n)} ${n.n === 1 ? "documento nuevo" : "documentos nuevos"} ${desde}.`;
  }

  /* ═══════════════ EL EXPEDIENTE DEL CONTRATO ═══════════════
     Encargo del dueño: que Mis procesos sirva DESPUÉS de la adjudicación —
     documentos del contrato, obligaciones, cronograma de ejecución,
     comunicaciones oficiales, pólizas, informes.

     CUATRO DECISIONES DE PANTALLA QUE NO HAY QUE RE-APRENDER:
     · SOLO SE ENSEÑA LO QUE TOCA EN ESTE MOMENTO. Un contrato recién adjudicado
       no necesita ver la lista de cobros; uno terminado sí. Pero una sección que
       YA TIENE algo escrito se enseña siempre, aunque el estado no la pida: se
       oculta lo que sobra, jamás lo que el usuario escribió.
     · LO QUE SE ESCRIBE VIVE EN UN BORRADOR, no en el DOM. `#seg-lista` se rehace
       entera sola cuando termina de leerse un documento, y un formulario de
       quince casillas perdido a media escritura es el peor defecto posible aquí.
       El borrador manda sobre lo guardado mientras exista y solo se olvida cuando
       el servidor confirmó — la misma lección del cuaderno.
     · NI UN VALOR POR OMISIÓN EN UNA CASILLA DE PÓLIZA. Los porcentajes y las
       vigencias los fija el pliego proceso por proceso; un «10 %» precargado se
       convierte en el dato que el usuario no revisa y que después firma.
     · LAS CIFRAS SE ENSEÑAN CON SU AUSENCIA DECLARADA. «Lleva cobrado» no sale
       si hay un cobro sin valor: sale la frase que dice por qué no se puede
       sumar. Un total incompleto con aspecto de completo es la peor cifra. */

  const AMPAROS_PANTALLA = Object.freeze([
    Object.freeze({ id: "cumplimiento", etiqueta: "Cumplimiento del contrato" }),
    Object.freeze({ id: "anticipo", etiqueta: "Buen manejo del anticipo" }),
    Object.freeze({ id: "salarios", etiqueta: "Pago de salarios y prestaciones" }),
    Object.freeze({ id: "estabilidad", etiqueta: "Estabilidad y calidad de la obra" }),
    Object.freeze({ id: "responsabilidad_civil", etiqueta: "Responsabilidad civil frente a terceros" }),
    Object.freeze({ id: "otro", etiqueta: "Otro amparo" }),
  ]);
  const TONO_CONTRATO = Object.freeze({
    adjudicado: "cal-ambar", firmado: "cal-ambar", ejecucion: "cal-verde",
    suspendido: "cal-ambar", terminado: "cal-gris", liquidado: "cal-gris",
  });
  const pesos = (n) => (n == null ? null : `$${miles(n)}`);
  const campo = (ruta, valor, tipo, etiqueta, extra) => `<label class="cas-exp-campo">
      <span class="cas-exp-rotulo">${esc(etiqueta)}</span>
      <input class="control-campo cas-exp-input" type="${tipo}" data-campo="${esc(ruta)}" value="${esc(valor == null ? "" : valor)}"${extra || ""}>
    </label>`;

  /* EL IDENTIFICADOR DE LA FILA VIAJA EXPLÍCITO, no por su posición. Al leer el
     formulario se funde sobre lo guardado por índice, y con el id escondido en
     el propio campo la correspondencia deja de depender de que el orden de la
     pantalla y el del servidor coincidan — que hoy coinciden, y mañana es una
     suposición que nadie recuerda. */
  const campoId = (lista, i, valor) => `<input type="hidden" data-campo="${lista}.${i}.id" value="${esc(valor == null ? "" : valor)}">`;
  /* Y una fila se puede QUITAR. Sin el botón, la única forma de deshacer una
     fila añadida por error es borrarle el texto y confiar en que el saneador la
     descarte: eso funciona, pero nadie lo adivina. */
  const quitarFila = (id, lista, i, que) => `<button type="button" class="cas-tarea-quitar" data-seg-exp-quitar="${esc(id)}" data-seg-exp-lista="${esc(lista)}" data-seg-exp-fila="${i}" aria-label="Quitar ${esc(que)}">Quitar</button>`;

  /* Una póliza. La fecha que de verdad importa es «hasta»: es la que avisa. */
  function htmlPoliza(g, i, idProceso) {
    const p = g || {};
    return `<li class="cas-exp-fila" data-fila="${i}">
      ${campoId("polizas", i, p.id)}
      <label class="cas-exp-campo">
        <span class="cas-exp-rotulo">Qué ampara</span>
        <select class="control-select cas-exp-input" data-campo="polizas.${i}.amparo">
          ${AMPAROS_PANTALLA.map((a) => `<option value="${esc(a.id)}"${p.amparo === a.id ? " selected" : ""}>${esc(a.etiqueta)}</option>`).join("")}
        </select>
      </label>
      ${campo(`polizas.${i}.numero`, p.numero, "text", "Número de la póliza", ' maxlength="60"')}
      ${campo(`polizas.${i}.aseguradora`, p.aseguradora, "text", "Aseguradora", ' maxlength="160"')}
      ${campo(`polizas.${i}.desde`, p.desde, "date", "Vale desde")}
      ${campo(`polizas.${i}.hasta`, p.hasta, "date", "Vale hasta")}
      ${campo(`polizas.${i}.valor_cop`, p.valor_cop, "text", "Valor asegurado", ' inputmode="numeric"')}
      <label class="cas-exp-marca">
        <input type="checkbox" data-campo="polizas.${i}.aprobada"${p.aprobada ? " checked" : ""}>
        <span>La entidad ya la aprobó</span>
      </label>
      ${idProceso ? quitarFila(idProceso, "polizas", i, "esta póliza") : ""}
    </li>`;
  }

  /* Un cobro. Dos fechas y por eso dos estados: cuándo lo entregó y cuándo le
     entró la plata. Es la distinción con la que vive un contratista pequeño. */
  function htmlCobro(g, i, idProceso) {
    const p = g || {};
    return `<li class="cas-exp-fila" data-fila="${i}">
      ${campoId("pagos", i, p.id)}
      ${campo(`pagos.${i}.concepto`, p.concepto, "text", "De qué es el cobro", ' maxlength="160" placeholder="Acta de cobro 1"')}
      ${campo(`pagos.${i}.numero`, p.numero, "text", "Número", ' maxlength="60"')}
      ${campo(`pagos.${i}.valor_cop`, p.valor_cop, "text", "Valor", ' inputmode="numeric"')}
      ${campo(`pagos.${i}.radicado_el`, p.radicado_el, "date", "Cuando usted lo entregó")}
      ${campo(`pagos.${i}.pagado_el`, p.pagado_el, "date", "Cuando le entró la plata")}
      ${idProceso ? quitarFila(idProceso, "pagos", i, "este cobro") : ""}
    </li>`;
  }

  /* Un oficio. Solo lo RECIBIDO puede estar esperando respuesta suya, y eso es
     lo único que avisa: un oficio que usted mandó no le vence a usted. */
  function htmlOficio(g, i, idProceso) {
    const p = g || {};
    return `<li class="cas-exp-fila" data-fila="${i}">
      ${campoId("oficios", i, p.id)}
      ${campo(`oficios.${i}.asunto`, p.asunto, "text", "De qué se trata", ' maxlength="160"')}
      <label class="cas-exp-campo">
        <span class="cas-exp-rotulo">Quién lo mandó</span>
        <select class="control-select cas-exp-input" data-campo="oficios.${i}.sentido">
          <option value="enviado"${p.sentido !== "recibido" ? " selected" : ""}>Lo mandé yo</option>
          <option value="recibido"${p.sentido === "recibido" ? " selected" : ""}>Me lo mandaron</option>
        </select>
      </label>
      ${campo(`oficios.${i}.numero`, p.numero, "text", "Número de radicado", ' maxlength="60"')}
      ${campo(`oficios.${i}.fecha`, p.fecha, "date", "Fecha")}
      ${campo(`oficios.${i}.responder_antes`, p.responder_antes, "date", "Hay que responder antes del")}
      <label class="cas-exp-marca">
        <input type="checkbox" data-campo="oficios.${i}.respondido"${p.respondido ? " checked" : ""}>
        <span>Ya está respondido</span>
      </label>
      ${idProceso ? quitarFila(idProceso, "oficios", i, "esta comunicación") : ""}
    </li>`;
  }

  /* Las cifras de arriba: lo que hay que VER de un contrato en una mirada. Cada
     una sale solo si se puede afirmar; la ausencia se dice con su motivo. */
  function htmlCifrasContrato(r) {
    if (!r) return "";
    const d = r.dinero || {};
    const filas = [];
    if (d.valor_contrato_cop != null) filas.push(["Vale", pesos(d.valor_contrato_cop)]);
    if (d.cobrado_cop != null) filas.push(["Lleva cobrado", pesos(d.cobrado_cop)]);
    if (d.por_cobrar_radicado_cop != null && d.por_cobrar_radicado_cop > 0) filas.push(["Entregado y sin pagar", pesos(d.por_cobrar_radicado_cop)]);
    if (d.saldo_cop != null) filas.push(["Falta por cobrar", pesos(d.saldo_cop)]);
    /* las fechas se enseñan legibles, como en toda la casa: «20 de enero de
       2027», no «2027-01-20». La forma la da el calendario, que ya la resolvió. */
    const C = raizCalendario();
    const dia = (f) => (C ? C.fechaLegibleAnio(f) : f);
    if (r.termina) filas.push([r.termina_calculada ? "Termina (contando desde el acta de inicio)" : "Termina", dia(r.termina)]);
    if (r.proxima_poliza && r.proxima_poliza.hasta) filas.push(["Primera póliza que vence", dia(r.proxima_poliza.hasta)]);
    if (!filas.length && !d.nota) return "";
    return `<div class="cas-exp-cifras">
      ${filas.map(([k, v]) => `<div class="cas-exp-cifra"><span class="cas-exp-cifra-rotulo">${esc(k)}</span><span class="cas-exp-cifra-valor">${esc(v)}</span></div>`).join("")}
    </div>${d.nota ? `<p class="cas-nota">${esc(d.nota)}</p>` : ""}`;
  }

  /* El resumen del pliegue cerrado: en qué va y qué es lo más urgente. */
  /* El resumen del pliegue CERRADO. No repite el estado —el distintivo de al
     lado ya lo dice— sino lo que hay que saber sin abrir: lo más urgente, o
     cuánto lleva cobrado. Dos veces la misma palabra en la misma línea gasta el
     único renglón que hay para decir algo. */
  function resumenExpediente(p) {
    const r = p && p.expediente_resumen;
    if (!r) return "todavía sin datos del contrato";
    const av = (p.expediente_avisos || [])[0];
    if (av) return av.mensaje;
    const d = r.dinero || {};
    if (d.valor_contrato_cop != null && d.cobrado_cop != null) return `lleva cobrados ${pesos(d.cobrado_cop)} de ${pesos(d.valor_contrato_cop)}`;
    if (d.nota) return d.nota;
    return "sin nada que le corra prisa";
  }

  function htmlExpediente(p, { abierto = false, borrador = null } = {}) {
    if (!p || p.estado !== "ganado") return "";
    const guardado = p.expediente || null;
    const e = borrador != null ? borrador : (guardado || { contrato: {}, polizas: [], pagos: [], oficios: [] });
    const c = e.contrato || {};
    const r = p.expediente_resumen || null;
    const estado = r ? r.estado : "adjudicado";
    const tono = TONO_CONTRATO[estado] || "cal-gris";
    const sinGuardar = borrador != null;
    const polizas = e.polizas || [], pagos = e.pagos || [], oficios = e.oficios || [];
    /* qué toca enseñar: lo que pide el momento MÁS lo que ya tiene algo escrito */
    const avanzado = (x) => ["ejecucion", "suspendido", "terminado", "liquidado"].includes(x);
    const verCobros = avanzado(estado) || pagos.length > 0;
    const verOficios = estado !== "adjudicado" || oficios.length > 0;
    const verLiquidacion = estado === "terminado" || estado === "liquidado" || !!c.fecha_liquidacion;
    const seccion = (rotulo, ayuda, filas, plantilla, boton, dato) => `
      <p class="cas-rotulo">${esc(rotulo)}</p>
      <p class="cas-nota">${esc(ayuda)}</p>
      ${filas.length ? `<ul class="cas-exp-lista" data-lista="${esc(dato)}">${filas.map((f, i) => plantilla(f, i, p.id)).join("")}</ul>` : ""}
      <button type="button" class="control-boton cas-org-boton" data-seg-exp-anadir="${esc(p.id)}" data-seg-exp-lista="${esc(dato)}">${esc(boton)}</button>`;
    return `<details class="guia-caja cas-exp" data-seg-expediente="${esc(p.id)}"${abierto ? " open" : ""}>
      <summary class="cas-exp-titulo"><span class="min-w-0 flex-1">El contrato <span class="cal-chip ${tono}">${esc(r ? r.estado_etiqueta : "Sin empezar")}</span> <span class="cas-nota">${esc(resumenExpediente(p))}</span></span></summary>
      <div class="cas-exp-cuerpo" data-seg-exp-form="${esc(p.id)}">
        ${r && r.siguiente_paso ? `<p class="cas-exp-paso">${esc(r.siguiente_paso)}</p>` : ""}
        ${htmlCifrasContrato(r)}
        ${r && r.saldo_en_ejecucion && r.saldo_en_ejecucion.saldo_cop != null
          ? `<p class="cas-nota">${esc(r.saldo_en_ejecucion.lectura)}</p>` : ""}

        <p class="cas-rotulo">El contrato</p>
        <div class="cas-exp-rejilla">
          ${campo("contrato.numero", c.numero, "text", "Número del contrato", ' maxlength="60"')}
          ${campo("contrato.valor_cop", c.valor_cop, "text", "Por cuánto es", ' inputmode="numeric"')}
          ${campo("contrato.plazo_dias", c.plazo_dias, "number", "Plazo en días", ' min="1" step="1"')}
          ${campo("contrato.anticipo_pct", c.anticipo_pct, "number", "Anticipo (%)", ' min="0" max="100" step="0.1"')}
          ${campo("contrato.supervisor", c.supervisor, "text", "Quién le revisa la obra", ' maxlength="160"')}
        </div>

        <p class="cas-rotulo">Las fechas del contrato</p>
        <p class="cas-nota">Estas fechas las escribe usted: no vienen de SECOP II, y así salen en el calendario. De ellas sale en qué va el contrato.</p>
        <div class="cas-exp-rejilla">
          ${campo("contrato.fecha_adjudicacion", c.fecha_adjudicacion, "date", "Se lo adjudicaron")}
          ${campo("contrato.fecha_firma", c.fecha_firma, "date", "Firmó el contrato")}
          ${campo("contrato.fecha_acta_inicio", c.fecha_acta_inicio, "date", "Firmó el acta de inicio")}
          ${campo("contrato.fecha_terminacion", c.fecha_terminacion, "date", "Terminó la obra")}
          ${verLiquidacion ? campo("contrato.fecha_liquidacion", c.fecha_liquidacion, "date", "Firmó la liquidación") : ""}
        </div>
        <label class="cas-exp-marca">
          <input type="checkbox" data-campo="contrato.suspendido"${c.suspendido ? " checked" : ""}>
          <span>El contrato está parado. El plazo se congela; las pólizas no.</span>
        </label>

        ${seccion("Sus pólizas", "Lo único que esta pantalla puede avisarle antes de que sea tarde es una póliza a punto de vencer: escriba hasta cuándo vale cada una. Cuáles le exigen y por cuánto lo dice su contrato.", polizas, htmlPoliza, "Añadir una póliza", "polizas")}

        ${verCobros ? seccion("Sus cobros", "Cada acta o factura, con la fecha en que la entregó y la fecha en que le pagaron. Es lo que dice cuánto le deben.", pagos, htmlCobro, "Añadir un cobro", "pagos") : ""}

        ${verOficios ? seccion("Comunicaciones oficiales", "Lo que radicó y lo que le radicaron. Un reclamo se pierde por no haberlo escrito el día que pasó, no por no tener razón.", oficios, htmlOficio, "Añadir una comunicación", "oficios") : ""}

        <div class="cas-notas-pie">
          <button type="button" class="control-boton cas-org-boton" data-seg-exp-guardar="${esc(p.id)}">Guardar el contrato</button>
          <span class="cas-nota">${sinGuardar ? "Lo que escribió todavía no está guardado." : "Solo lo ve usted. De estas fechas salen los avisos y el calendario."}</span>
        </div>
      </div>
    </details>`;
  }

  /* ═══════════════ AGREGAR UN PROCESO QUE NO VIENE DE SECOP II ═══════════════
     Lo mínimo es el NOMBRE: sin él la tarjeta no dice nada. Todo lo demás es
     opcional, y lo que se deje en blanco queda en blanco — nunca en cero. */
  function htmlAltaExterno({ mensaje = null } = {}) {
    return `<div class="cas-org" data-cas-externo-caja>
      <p class="cas-nota">Para un proceso que no está en SECOP II: una invitación privada, un proceso de SECOP I o una obra de un particular. Se guarda con sus fechas y entra en el calendario, en las alertas y en su cuaderno, igual que los demás. Lo que la aplicación no podrá hacer es leerle el estado, los documentos ni quiénes se presentaron: eso solo existe en SECOP II.</p>
      <div class="cas-exp-rejilla">
        <label class="cas-exp-campo"><span class="cas-exp-rotulo">Nombre del proceso o de la obra</span>
          <input class="control-campo cas-exp-input" type="text" maxlength="200" data-cas-ext="nombre" placeholder="Mantenimiento de la vía a la vereda El Roble"></label>
        <label class="cas-exp-campo"><span class="cas-exp-rotulo">Quién contrata</span>
          <input class="control-campo cas-exp-input" type="text" maxlength="160" data-cas-ext="entidad"></label>
        <label class="cas-exp-campo"><span class="cas-exp-rotulo">Departamento</span>
          <input class="control-campo cas-exp-input" type="text" maxlength="80" data-cas-ext="departamento"></label>
        <label class="cas-exp-campo"><span class="cas-exp-rotulo">Modalidad</span>
          <input class="control-campo cas-exp-input" type="text" maxlength="120" data-cas-ext="modalidad" placeholder="Invitación privada"></label>
        <label class="cas-exp-campo"><span class="cas-exp-rotulo">Presupuesto</span>
          <input class="control-campo cas-exp-input" type="text" inputmode="numeric" data-cas-ext="presupuesto_cop"></label>
        <label class="cas-exp-campo"><span class="cas-exp-rotulo">Cuándo lo publicaron</span>
          <input class="control-campo cas-exp-input" type="date" data-cas-ext="fecha_publicacion"></label>
        <label class="cas-exp-campo"><span class="cas-exp-rotulo">Cuándo hay que entregar</span>
          <input class="control-campo cas-exp-input" type="datetime-local" data-cas-ext="fecha_cierre"></label>
        <label class="cas-exp-campo"><span class="cas-exp-rotulo">Enlace (opcional)</span>
          <input class="control-campo cas-exp-input" type="url" maxlength="400" data-cas-ext="url" placeholder="https://"></label>
      </div>
      <div class="cas-notas-pie">
        <button type="button" class="control-boton cas-org-boton" data-cas-externo-crear>Agregar el proceso</button>
        <span class="cas-nota">Solo el nombre es obligatorio.</span>
      </div>
      ${mensaje ? `<p class="cas-nota">${esc(mensaje)}</p>` : ""}
    </div>`;
  }

  /* ══════════════════════ LA CABECERA DE UN GRUPO ══════════════════════ */
  function htmlCabeceraGrupo(g, { hoy = null } = {}) {
    if (!g.titulo) return "";
    const C = raizCalendario();
    const cuando = g.proximo_cierre ? (C ? C.fechaLegibleAnio(g.proximo_cierre) : g.proximo_cierre) : null;
    const nota = g.n === 0 ? "esta carpeta está vacía"
      : cuando ? `el próximo cierra el ${cuando}`
        : "ninguno tiene fecha de cierre por delante";
    return `<div class="cas-grupo-cabeza">
      <h3 class="cas-grupo-titulo">${esc(g.titulo)}</h3>
      <p class="cas-grupo-nota">${miles(g.n)} ${g.n === 1 ? "proceso" : "procesos"} · ${esc(nota)}</p>
    </div>${g.n === 0 ? `<p class="cas-nota cas-grupo-vacio">Mueva aquí un proceso con el selector «Carpeta» de su tarjeta.</p>` : ""}`;
  }

  return {
    VISTAS, ORDENES, AGRUPACIONES, CARPETA_TODO, CARPETA_SIN, POR_OMISION, CLAVE_PREFERENCIAS,
    leerPreferencias, guardarPreferencias, carpetaVigente,
    filtrar, ordenar, agrupar, textoDe,
    TIPOS_EVENTO, tipoDeEvento, eventosDe, agendaDe, filtrarAgenda, rotuloEvento, fuenteEvento, tonoPlazo,
    htmlEvento, htmlDiaAgenda, htmlMesAgenda, htmlTiposEvento, mesPorDefecto, diaPorDefecto,
    htmlCarpetas, htmlOrganizar, htmlCarpetaDe, htmlCuaderno, htmlTarea, htmlCabeceraGrupo, insigniaCuaderno, fraseTareas,
    /* 8-sep-2026: la cuenta atrás, el sorteo, las novedades, el expediente del
       contrato y el alta de un proceso que no viene de SECOP II */
    cuentaAtras, textoCuentaAtras, htmlCuentaAtrasCierre, htmlSorteo, insigniaExterno, notaExterno,
    htmlNovedades, fraseNovedadesCliente, AMPAROS_PANTALLA, htmlExpediente, htmlPoliza, htmlCobro, htmlOficio,
    htmlCifrasContrato, resumenExpediente, htmlAltaExterno,
  };
});
