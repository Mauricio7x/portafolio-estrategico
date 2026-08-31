/* public/calendario.js · EL CALENDARIO DE CIERRES (encargo del ingeniero, 31-ago-2026)
   ─────────────────────────────────────────────────────────────────────────────
   «Un calendario en el que se pueda ver el mes actual, el día en el que
   estamos y cuándo vencen los procesos de este mes, para que pueda darle clic
   al que le interese y pueda presentarse. Los datos que importan: un resumen
   del objeto contractual, el valor total del contrato y el lugar. Y si es
   selección abreviada de menor cuantía, hasta cuándo se puede uno presentar o
   enviar la manifestación de interés.» Lo que el ingeniero quiere es no
   perderse ni una oportunidad de avisar que le interesa.

   Todo sale de `/api/perfil?op=pulso&perfil=…` (`agregados.calendario`), que
   ya alimenta el resto de Mi empresa: son EXACTAMENTE los mismos procesos que
   cuenta la pestaña. Este módulo no pide nada por su cuenta ni recalcula un
   solo plazo: `public/pulso.js` le entrega el agregado ya servido.

   ═══ LAS SEIS DECISIONES QUE NO HAY QUE RE-APRENDER ═══

   1. EL DÍA SE COMPARA COMO CADENA `YYYY-MM-DD`, nunca con `new Date`. El
      navegador del ingeniero está en hora Colombia, pero `new Date("2026-09-13")`
      se interpreta en UTC y `getDate()` devuelve el 12: el calendario pintaría
      los cierres un día antes, que en esta app es la diferencia entre llegar y
      no llegar. El «hoy» lo fija el SERVIDOR (`calendario.hoy`, con la resta de
      5 h de `lib/habiles.hoyColombia`), no el reloj del aparato.
   2. LA HORA DE CIERRE SE ENSEÑA SI ESTÁ PUBLICADA, y si no, no se inventa.
      Viene leída literal del dato (`hora`, o `null`). Sin hora se dice
      «hora no publicada», nunca «12:00 a. m.».
   3. LA MANIFESTACIÓN NO LLEVA HORA JAMÁS, aunque la fecha esté confirmada. El
      cronograma del pliego publica el DÍA, nunca la hora, y una ventana de
      cuatro horas cierra a media jornada: por eso el día del vencimiento es
      `por_confirmar` («vaya AHORA»), no «le queda todo el día». Es la doctrina
      de Motavita (MEMORIA.md § «EL PLAZO DE MANIFESTACIÓN NO ES DE TRES DÍAS»)
      y aquí se respeta al pie de la letra: sin fecha confirmada no hay cuenta
      atrás, y con ella tampoco hay hora.
   4. UN PROCESO CON EL PLAZO VENCIDO NO SE ESCONDE. Pudo haber avisado a tiempo
      y la app no lo sabe; esconderlo sería un falso negativo, que en
      oportunidades es el error caro. Se pinta en gris y se dice qué significa.
   5. «DÓNDE» ES LA SEDE DE LA ENTIDAD y se rotula así. El dataset de SECOP II
      no publica el lugar de ejecución (censo en docs/datos.md §7): en la
      alcaldía de un municipio coincide casi siempre, en una gobernación no.
   6. NINGUNA PULSACIÓN SIN RESPUESTA VISIBLE: un día sin cierres no es
      pulsable, y el día abierto se marca; el proceso abierto enseña su ficha
      debajo, en la misma pantalla.

   Expone `window.Calendario`; también sirve en Node (pruebas). */
(function (raiz, fabrica) {
  const api = fabrica();
  if (typeof module === "object" && module.exports) module.exports = api;
  else raiz.Calendario = api;
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const miles = (n) => Number(n || 0).toLocaleString("es-CO", { maximumFractionDigits: 0 });

  const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
  const DIAS_CORTOS = ["lun", "mar", "mié", "jue", "vie", "sáb", "dom"];

  /* ── aritmética de calendario sobre YYYY-MM-DD, sin `Date` local ──
     `Date.UTC` sí es seguro: se construye y se lee siempre en UTC, así que no
     hay huso que corra la fecha. Lo prohibido es `new Date("2026-09-13")` y
     después `.getDate()`, que mezcla las dos zonas. */
  const partes = (iso) => String(iso).slice(0, 10).split("-").map(Number);
  const mesDe = (iso) => String(iso).slice(0, 7);
  function diaSemanaLunes(iso) {              // 0 = lunes … 6 = domingo
    const [a, m, d] = partes(iso);
    return (new Date(Date.UTC(a, m - 1, d)).getUTCDay() + 6) % 7;
  }
  const diasDelMes = (mes) => { const [a, m] = partes(`${mes}-01`); return new Date(Date.UTC(a, m, 0)).getUTCDate(); };
  const iso = (mes, dia) => `${mes}-${String(dia).padStart(2, "0")}`;
  function mesVecino(mes, salto) {
    const [a, m] = partes(`${mes}-01`);
    const t = new Date(Date.UTC(a, m - 1 + salto, 1));
    return `${t.getUTCFullYear()}-${String(t.getUTCMonth() + 1).padStart(2, "0")}`;
  }
  function mesLegible(mes) {
    const [a, m] = partes(`${mes}-01`);
    return `${MESES[m - 1]} de ${a}`;
  }
  function fechaLegible(fecha) {
    const [, m, d] = partes(fecha);
    return `${d} de ${MESES[m - 1]}`;
  }

  /* Pesos completos: en el calendario la cifra que decide es el VALOR TOTAL del
     contrato, no una escala redondeada — una cifra redondeada para mostrar no
     puede decidir (regla dura del proyecto). Sin presupuesto publicado, se dice. */
  const pesos = (v) => (Number.isFinite(Number(v)) && Number(v) > 0 ? `$ ${miles(Math.round(Number(v)))}` : null);

  /* El nombre de la modalidad sale de public/filtros.js (una sola tabla de
     nombres: una segunda se desincronizaría del selector del listado). */
  function raizFiltros() {
    if (typeof window !== "undefined" && window.Filtros) return window.Filtros;
    try { return require("./filtros.js"); } catch { return null; }
  }
  function nombreModalidad(id) {
    const F = raizFiltros();
    const m = F && (F.MODALIDADES || []).find((x) => x.id === id);
    return m ? m.etiqueta : null;
  }

  /* ══ LA REJILLA DEL MES ══
     Lunes a domingo. Cada casilla con cierres es pulsable y dice CUÁNTOS; el
     día de hoy va marcado aunque no tenga ninguno («el día en el que estamos»
     es la mitad del encargo). Los días de otros meses no se rellenan: una
     casilla vacía es más legible que un número apagado que invita a pulsar. */
  function htmlRejilla(cal, { mes, dia }) {
    const porFecha = new Map((cal.dias || []).map((d) => [d.fecha, d]));
    const hoy = cal.hoy || "";
    const huecos = diaSemanaLunes(`${mes}-01`);
    const total = diasDelMes(mes);
    const celdas = [];
    for (let i = 0; i < huecos; i++) celdas.push('<div class="cal-celda cal-vacia" aria-hidden="true"></div>');
    for (let n = 1; n <= total; n++) {
      const f = iso(mes, n);
      const d = porFecha.get(f);
      const esHoy = f === hoy;
      const abierto = f === dia;
      const pasado = f < hoy;
      const clases = ["cal-celda"];
      if (d) clases.push("cal-con");
      if (esHoy) clases.push("cal-hoy");
      if (abierto) clases.push("cal-abierto");
      if (pasado) clases.push("cal-pasado");
      const rotulo = d
        ? `${n} de ${MESES[partes(f)[1] - 1]}: ${miles(d.n)} ${d.n === 1 ? "proceso cierra" : "procesos cierran"}${esHoy ? ", y es hoy" : ""}`
        : `${n} de ${MESES[partes(f)[1] - 1]}: ningún cierre${esHoy ? ", y es hoy" : ""}`;
      celdas.push(d
        ? `<button type="button" class="${clases.join(" ")}" data-dia="${esc(f)}" aria-label="${esc(rotulo)}" aria-pressed="${abierto ? "true" : "false"}" title="${esc(rotulo)}">
             <span class="cal-num">${n}</span><span class="cal-n">${miles(d.n)}</span></button>`
        : `<div class="${clases.join(" ")}" title="${esc(rotulo)}"><span class="cal-num">${n}</span></div>`);
    }
    const cabeza = DIAS_CORTOS.map((d) => `<div class="cal-dow">${d}</div>`).join("");
    return `<div class="cal-rejilla" role="group" aria-label="Cierres de ${esc(mesLegible(mes))}">${cabeza}${celdas.join("")}</div>`;
  }

  /* ══ EL PLAZO PARA AVISAR QUE LE INTERESA ══
     La selección abreviada de menor cuantía no admite oferta de quien no avisó
     antes. Cuatro estados, y ninguno afirma más de lo que se sabe:
       abierta       · con certeza sigue abierta (la fecha límite es futura)
       por_confirmar · la ventana está corriendo: MÁXIMA urgencia, vaya HOY
       vencida       · con certeza venció
       sin_fecha     · no se pudo situar: ámbar, verifíquelo
     Y NUNCA UNA HORA: el pliego publica el día, jamás la hora, así que decir
     «hasta las 5 p. m.» sería inventarla. Lo que sí se dice —porque es lo que
     el ingeniero preguntó— es que el plazo puede cerrar a media jornada y
     dónde se confirma. */
  const TONO = { rojo: "cal-rojo", ambar: "cal-ambar", gris: "cal-gris", verde: "cal-verde" };
  function plazoManifestacion(m) {
    if (!m || !m.aplica) return null;
    if (m.estado === "vencida") {
      return {
        tono: TONO.gris,
        titular: `Plazo para avisar que le interesa: vencido${m.confirmada && m.fecha_limite_legible ? ` el ${m.fecha_limite_legible}` : ""}`,
        detalle: "Solo puede presentar oferta si avisó a tiempo. Confírmelo en SECOP II antes de trabajar en la propuesta.",
      };
    }
    if (m.estado === "sin_fecha") {
      return {
        tono: TONO.ambar,
        titular: "Plazo para avisar que le interesa: sin fecha que se pueda situar",
        detalle: "Verifíquelo HOY en el cronograma del proceso en SECOP II.",
      };
    }
    if (m.estado === "por_confirmar") {
      return {
        tono: TONO.rojo,
        titular: m.confirmada && m.fecha_limite_legible
          ? `Avise HOY: el plazo vence hoy (${m.fecha_limite_legible}) y puede haber cerrado ya`
          : "Avise HOY: el plazo puede estar cerrando en este momento",
        detalle: "La entidad publica el DÍA, nunca la hora: una ventana de unas horas cierra a media jornada. Vaya a SECOP II ahora y confirme el cronograma.",
      };
    }
    // `abierta`: con certeza sigue abierta
    if (m.confirmada && m.fecha_limite_legible) {
      const q = m.quedan_habiles;
      return {
        tono: q != null && q <= 2 ? TONO.rojo : TONO.ambar,
        titular: `Puede avisar que le interesa hasta el ${m.fecha_limite_legible}`,
        detalle: `${q != null ? `Le quedan ${miles(q)} ${q === 1 ? "día de oficina" : "días de oficina"}. ` : ""}La fecha sale del cronograma del pliego; la hora de corte no se publica, así que no lo deje para el último día.`,
      };
    }
    return {
      tono: TONO.ambar,
      titular: `Avise cuanto antes: el plazo puede cerrar desde el ${m.puede_cerrar_desde_legible || "día de la apertura"}`,
      detalle: `La ley solo fija un techo de ${miles(m.plazo_maximo_habiles)} días de oficina desde la apertura: la entidad puede haber puesto menos en el pliego, y a veces son unas horas del mismo día${m.vence_a_mas_tardar_legible ? ` (a más tardar, el ${m.vence_a_mas_tardar_legible})` : ""}. Confírmelo en SECOP II.`,
    };
  }

  /* ══ EL LUGAR DE EJECUCIÓN ES LA ENTIDAD, y así se dice (decisión del
     ingeniero, 31-ago-2026) ══
     El dataset de SECOP II NO publica el sitio donde se ejecuta la obra: el
     censo de columnas (docs/datos.md §7) solo trae `ciudad_entidad` y
     `departamento_entidad`, que son la SEDE de quien contrata. Enseñar eso
     bajo el rótulo «lugar de ejecución» sería una inferencia presentada como
     medición, en el sitio donde se decide a qué presentarse. Se lo dije al
     ingeniero y su respuesta cerró la ambigüedad: «entonces solo di en lugar
     de ejecución qué entidad es». Es la salida correcta y además la más útil
     —«MUNICIPIO DE PLANETA RICA, Córdoba» le dice dónde es la obra mejor que
     cualquier código—: el VALOR del campo es la ENTIDAD, con su municipio y
     departamento debajo, y la línea de al lado declara que eso es lo que hay.
     Nada se afirma que el dato no sostenga. */
  function lugarDeEjecucion(p) {
    const sede = [p.ciudad, p.departamento].filter(Boolean).join(" · ");
    const entidad = (p.entidad || "").trim();
    if (!entidad && !sede) return null;
    return { entidad: entidad || null, sede: sede || null, corto: entidad || sede };
  }

  /* ══ UNA FILA DE PROCESO ══ Lo que el ingeniero pidió para decidir si entra:
     resumen del objeto, valor total del contrato y el lugar (la entidad). Nada
     más arriba; el resto, al abrirla. */
  function htmlFila(p, { abierto = false } = {}) {
    const plazo = plazoManifestacion(p.manifestacion);
    const lugar = lugarDeEjecucion(p);
    const valor = pesos(p.valor);
    return `<li class="cal-fila${abierto ? " cal-fila-abierta" : ""}" data-proceso="${esc(p.id || "")}">
      <button type="button" class="cal-fila-cabeza" data-abrir="${esc(p.id || "")}" aria-expanded="${abierto ? "true" : "false"}">
        <span class="cal-objeto">${esc(p.objeto || "Sin objeto publicado")}</span>
        <span class="cal-meta">
          <span class="cal-valor">${valor ? esc(valor) : "Sin presupuesto publicado"}</span>
          <span class="cal-lugar">${lugar ? esc(lugar.corto) : "Sin lugar publicado"}</span>
          ${lugar && lugar.entidad && lugar.sede ? `<span class="cal-sede">${esc(lugar.sede)}</span>` : ""}
        </span>
        ${plazo ? `<span class="cal-chip ${plazo.tono}">${esc(plazo.titular)}</span>` : ""}
      </button>
      ${abierto ? htmlFicha(p, plazo) : ""}
    </li>`;
  }

  function htmlFicha(p, plazo) {
    const modalidad = nombreModalidad(p.modalidad);
    const lugar = lugarDeEjecucion(p);
    const filas = [
      ["Objeto del contrato", p.objeto || null],
      /* El lugar de ejecución ES la entidad (ver `lugarDeEjecucion`): el dato
         abierto no publica el sitio de la obra, así que se nombra a quien
         contrata —y su municipio debajo, que es lo que de verdad sitúa la
         obra—. Por eso desaparece la fila «Entidad que lo publica»: era el
         mismo dato dos veces, y repetirlo es el ruido que este encargo vino a
         quitar. */
      ["Lugar de ejecución", lugar ? [lugar.entidad, lugar.sede].filter(Boolean).join(" — ") : null],
      ["Valor total del contrato", pesos(p.valor)],
      ["Cómo lo adjudican", modalidad],
      ["Entrega de la oferta", p.hora ? `hasta las ${p.hora}` : null],
    ];
    const cuerpo = filas.map(([r, v]) => `<div class="cal-dato"><dt>${esc(r)}</dt><dd>${v ? esc(v) : "Sin dato publicado"}</dd></div>`).join("");
    return `<div class="cal-ficha">
      <dl class="cal-datos">${cuerpo}</dl>
      <p class="cal-nota">El lugar es la entidad que contrata y el municipio donde queda: los datos abiertos de SECOP II no publican el sitio exacto de la obra.</p>
      ${p.hora ? "" : '<p class="cal-nota">La hora de cierre no viene publicada en los datos abiertos: confírmela en el cronograma del proceso.</p>'}
      ${plazo ? `<div class="cal-plazo ${plazo.tono}"><p class="cal-plazo-t">${esc(plazo.titular)}</p><p class="cal-plazo-d">${esc(plazo.detalle)}</p>${p.manifestacion && p.manifestacion.nota ? `<p class="cal-plazo-n">${esc(p.manifestacion.nota)}</p>` : ""}</div>` : ""}
      ${p.url ? `<a class="cal-ir" href="${esc(p.url)}" target="_blank" rel="noopener noreferrer">Abrir el proceso en SECOP II</a>`
        : '<p class="cal-nota">Este proceso no trae enlace publicado: búsquelo en SECOP II por su número.</p>'}
    </div>`;
  }

  /* ══ EL DÍA ABIERTO ══ */
  function htmlDia(cal, { dia, proceso }) {
    const d = (cal.dias || []).find((x) => x.fecha === dia);
    if (!d) return `<p class="cal-vacio">Ningún proceso de su perfil cierra el ${esc(fechaLegible(dia))}.</p>`;
    const hoy = cal.hoy || "";
    /* EL VERBO CAMBIA CON EL DÍA, y la frase se compone ENTERA en cada rama en
       vez de pegar un complemento a un verbo fijo: la primera versión decía «3
       procesos cierran ya cerraron» sobre un día pasado —lo cazó la captura del
       navegador real, no ninguna prueba de Node—. Un día ya vencido se nombra
       en pasado: sigue en el calendario a propósito (el proceso pudo haberse
       presentado a tiempo y esconderlo sería un falso negativo), pero no puede
       leerse como si todavía se pudiera entregar. */
    const suma = pesos(d.valor);
    const frase = d.fecha === hoy
      ? `${miles(d.n)} ${d.n === 1 ? "proceso cierra hoy" : "procesos cierran hoy"}`
      : d.fecha < hoy
        ? `${miles(d.n)} ${d.n === 1 ? "proceso cerró" : "procesos cerraron"} el ${fechaLegible(d.fecha)}`
        : `${miles(d.n)} ${d.n === 1 ? "proceso cierra" : "procesos cierran"} el ${fechaLegible(d.fecha)}`;
    return `<p class="cal-dia-t">${esc(frase)}${suma ? ` · ${esc(suma)} en total` : ""}</p>
      <ul class="cal-lista">${d.procesos.map((p) => htmlFila(p, { abierto: !!proceso && p.id === proceso })).join("")}</ul>`;
  }

  /* ══ LA PANTALLA ENTERA ══ */
  function htmlMes(cal, { mes, dia, proceso } = {}) {
    if (!cal || !Array.isArray(cal.dias)) return "";
    const m = mes || mesDe(cal.hoy || (cal.dias[0] && cal.dias[0].fecha) || "");
    if (!m) return "";
    const delMes = cal.dias.filter((d) => mesDe(d.fecha) === m);
    const nMes = delMes.reduce((a, d) => a + d.n, 0);
    const anterior = mesVecino(m, -1), siguiente = mesVecino(m, 1);
    const hayAntes = cal.dias.some((d) => mesDe(d.fecha) < m);
    const hayDespues = cal.dias.some((d) => mesDe(d.fecha) > m);
    const resumen = nMes
      ? `${miles(nMes)} ${nMes === 1 ? "proceso cierra" : "procesos cierran"} en ${mesLegible(m)}.`
      : `Ningún proceso de su perfil cierra en ${mesLegible(m)}.`;
    return `<div class="cal-barra">
        <button type="button" class="cal-mes-btn" data-mes="${esc(anterior)}"${hayAntes ? "" : " disabled"} aria-label="Mes anterior">‹</button>
        <h3 class="cal-mes">${esc(mesLegible(m))}</h3>
        <button type="button" class="cal-mes-btn" data-mes="${esc(siguiente)}"${hayDespues ? "" : " disabled"} aria-label="Mes siguiente">›</button>
      </div>
      <p class="cal-resumen">${esc(resumen)}${cal.sinFechaCierre ? ` ${miles(cal.sinFechaCierre)} sin fecha de cierre publicada: no se pueden situar en ningún día.` : ""}</p>
      ${htmlRejilla(cal, { mes: m, dia })}
      <div class="cal-detalle">${dia ? htmlDia(cal, { dia, proceso }) : '<p class="cal-vacio">Pulse un día con cierres para ver los procesos.</p>'}</div>`;
  }

  /* ══ QUÉ MES SE ABRE SOLO ══ (defecto de producción, 31-ago-2026)
     El calendario abría SIEMPRE el mes de hoy, y el ingeniero lo vio el 31 de
     agosto: agosto ya no tenía ni un cierre —todo lo suyo vencía en
     septiembre— así que la pantalla enseñaba una rejilla vacía con 264
     procesos esperando al otro lado de la flecha. La regla: se abre el mes de
     HOY si tiene cierres; si no, el PRÓXIMO que los tenga (y si ya no queda
     nada por delante, el último que hubo). El día de hoy se sigue marcando
     cuando se navega a su mes: «ver el mes actual» no se pierde, se pierde
     solo el mes vacío. Los últimos días de cada mes esto pasa SIEMPRE, así que
     no es un caso raro: es una de cada diez visitas. */
  function mesPorDefecto(cal) {
    const dias = cal.dias || [];
    if (!dias.length) return cal.hoy ? mesDe(cal.hoy) : null;
    const hoy = cal.hoy || "";
    const mesHoy = hoy ? mesDe(hoy) : null;
    if (mesHoy && dias.some((d) => mesDe(d.fecha) === mesHoy)) return mesHoy;
    const proximo = dias.find((d) => d.fecha > hoy);
    return mesDe((proximo || dias[dias.length - 1]).fecha);
  }

  /* ══ QUÉ DÍA SE ABRE SOLO ══ El de hoy si tiene cierres; si no, el primero
     que venga después (que es la pregunta siguiente: «¿qué es lo próximo que
     se me vence?»). Si ya no queda nada por delante, el último que hubo. */
  function diaPorDefecto(cal, mes) {
    const dias = (cal.dias || []).filter((d) => !mes || mesDe(d.fecha) === mes);
    if (!dias.length) return null;
    const hoy = cal.hoy || "";
    const exacto = dias.find((d) => d.fecha === hoy);
    if (exacto) return exacto.fecha;
    const proximo = dias.find((d) => d.fecha > hoy);
    return (proximo || dias[dias.length - 1]).fecha;
  }

  /* ── montaje ──
     Estado local mínimo (mes abierto, día abierto, proceso abierto) y UN
     delegado de clic sobre el contenedor: las filas se repintan enteras, así
     que un listener por fila se quedaría colgado en el primer repintado. */
  let estado = { mes: null, dia: null, proceso: null };
  let ultimo = null;

  function pintar(nodo, cal) {
    nodo.innerHTML = htmlMes(cal, estado);
  }

  function montar(nodo, cal, opciones = {}) {
    if (!nodo) return false;
    const seccion = opciones.seccion || null;
    if (!cal || !Array.isArray(cal.dias) || !cal.dias.length) {
      // vacío y honesto antes que bonito y falso: sin cierres que situar, no hay calendario
      nodo.innerHTML = "";
      if (seccion) seccion.classList.add("hidden");
      ultimo = null;
      return false;
    }
    ultimo = cal;
    estado = { mes: mesPorDefecto(cal), dia: null, proceso: null };
    estado.dia = diaPorDefecto(cal, estado.mes);
    pintar(nodo, cal);
    if (seccion) seccion.classList.remove("hidden");
    if (!nodo.dataset || !nodo.dataset.cableado) {
      nodo.addEventListener("click", (ev) => {
        if (!ultimo) return;
        const mes = ev.target.closest("[data-mes]");
        if (mes) {
          estado.mes = mes.getAttribute("data-mes");
          estado.dia = diaPorDefecto(ultimo, estado.mes);
          estado.proceso = null;
          return pintar(nodo, ultimo);
        }
        const dia = ev.target.closest("[data-dia]");
        if (dia) {
          const f = dia.getAttribute("data-dia");
          estado.dia = estado.dia === f ? null : f;   // volver a pulsar cierra: toda pulsación responde
          estado.proceso = null;
          return pintar(nodo, ultimo);
        }
        const abrir = ev.target.closest("[data-abrir]");
        if (abrir) {
          const id = abrir.getAttribute("data-abrir");
          estado.proceso = estado.proceso === id ? null : id;
          return pintar(nodo, ultimo);
        }
      });
      if (nodo.dataset) nodo.dataset.cableado = "1";
    }
    return true;
  }

  const olvidar = () => { estado = { mes: null, dia: null, proceso: null }; ultimo = null; };

  return {
    montar, olvidar, htmlMes, htmlRejilla, htmlDia, htmlFila, htmlFicha, lugarDeEjecucion,
    plazoManifestacion, diaPorDefecto, mesPorDefecto, mesDe, mesVecino, mesLegible, fechaLegible, diaSemanaLunes, diasDelMes, pesos,
  };
});
