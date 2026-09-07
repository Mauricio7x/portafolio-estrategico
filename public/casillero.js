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
    Object.freeze({ id: "otras", etiqueta: "Otras fechas del proceso" }),
  ]);
  const tipoDeEvento = (e) => (e.tipo === "tarea" ? "tarea" : (e.clave === "cierre" || e.clave === "manifestacion") ? e.clave : "otras");

  /* Todos los eventos, agrupados por el DÍA que ya traen. `sin_fecha` cuenta los
     procesos que no se pueden situar en ningún día (el corpus no publica su
     cierre): colocarlos «hoy» los inventaría, y callarlos los escondería. */
  function agendaDe(procesos, { hoy = null } = {}) {
    const porDia = new Map();
    const conteos = { todos: 0, cierre: 0, manifestacion: 0, tarea: 0, otras: 0 };
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
  };
});
