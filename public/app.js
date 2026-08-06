/* ============================================================================
   Detecta · Frontend (sin build, sin dependencias — Tailwind por CDN)
   ----------------------------------------------------------------------------
   1. Gate de clave (231105). Nota honesta: es una barrera de cortesía en el
      cliente; la protección real del despliegue es Vercel Password Protection
      (servidor), que puede activarse encima sin tocar este código.
   2. Consulta /api/oportunidades y pinta tarjetas. Si el backend responde 503
      (Redis vacío → sincronización recién disparada), reintenta solo con
      cuenta regresiva hasta que la carga inicial produzca datos.
   3. El orden por defecto es «Más atractivas» (ordenar_por=atractividad):
      primero lo que pasa las CUATRO PUERTAS y, dentro de cada grupo, por valor
      esperado. Cada tarjeta muestra la banda de competencia de su entidad
      (🟢/🟡/🔴/⚪).
   3-bis. LAS CUATRO PUERTAS (ago 2026) sustituyen a la barra de puntaje 0-100:
      RUP · K · Caja · Competencia, cada una con su cifra en el `title`, más
      «Prob. estimada» y «Valor esperado». Lo que no pasa una puerta se atenúa
      con el motivo en vez de desaparecer, y el toggle «Mostrar solo viables»
      (encendido) decide si aparece. El porqué está en docs/ATRACTIVIDAD.md: una
      suma ponderada es compensatoria, y no poder financiar una obra no se
      compensa con cuantía alta.
   3-ter. LA LISTA NO PIDE TOKEN (ago 2026). Los clientes entran aquí a ver a
      qué presentarse y no tienen por qué tener credencial: se llama a
      /api/oportunidades sin cabecera y el servidor responde 200 con las cifras
      financieras REDACTADAS (`finanzas_visibles:false`) — el veredicto de cada
      puerta viaja igual, que es lo que se viene a ver. Si el dueño ya guardó el
      token en la pestaña (porque abrió el detalle de competencia) se manda y
      vuelven las cifras, pero su ausencia NUNCA bloquea ni abre un formulario;
      un 401 por token caducado se resuelve olvidándolo y reintentando sin él.
      El formulario del token sobrevive solo para /api/competencia-detalle, que
      sí exige credencial y se abre por una acción explícita del dueño.
      El gate de la clave 231105 es una cortesía del cliente y no protege la API.
   4. Veredicto GRADUADO en cada tarjeta (jul 2026): el badge de matching dice
      con qué FUERZA encaja en el RUP (RUP ✓ por clase · RUP ~ por familia ·
      RUP ≈ por clase afín · «Objeto sugiere obra») y el de pertinencia qué
      TIPO de trabajo es (Obra civil · Infraestructura · Consultoría ·
      Verificar objeto). El detalle completo va en el `title` de cada badge.
   ========================================================================== */
"use strict";

(() => {
  const CLAVE = "231105";
  const MAX_INTENTOS_CLAVE = 3;
  const REINTENTO_SYNC_SEG = 20;   // espera entre reintentos tras un 503
  const MAX_REINTENTOS_SYNC = 30;  // ~10 min: suficiente para la carga inicial

  const $ = (id) => document.getElementById(id);
  const fmtCOP = new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 });
  const fmtNum = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 1 });

  /* Competencia histórica de la entidad (índice sobre 2 años de adjudicaciones):
     es lo que decide el orden por defecto — primero donde menos gente compite. */
  const COMPETENCIA_ENTIDAD = {
    baja: { emoji: "🟢", titulo: "Poca competencia", clases: "bg-green-50 text-green-800 ring-green-600/20" },
    media: { emoji: "🟡", titulo: "Competencia media", clases: "bg-amber-50 text-amber-800 ring-amber-600/20" },
    alta: { emoji: "🔴", titulo: "Alta competencia", clases: "bg-red-50 text-red-700 ring-red-600/20" },
    sin_dato: { emoji: "⚪", titulo: "Sin datos históricos de esta entidad", clases: "bg-gray-50 text-gray-500 ring-gray-500/20" },
  };

  /* Baja de mercado de la entidad (lib/indice_baja): cuánto descuenta el
     ganador frente al presupuesto oficial. MENOS baja es MEJOR — se puede
     ofertar cerca del oficial y conservar margen— así que el verde es el 0 %.
     Al revés que el resto de badges, aquí el CERO es un dato y no una ausencia:
     una entidad que adjudica por el presupuesto es exactamente lo que se busca. */
  const BAJA_MERCADO = {
    bajo: { clases: "bg-green-100 text-green-800" },
    medio: { clases: "bg-amber-100 text-amber-800" },
    alto: { clases: "bg-red-100 text-red-700" },
    sin_dato: { clases: "bg-gray-100 text-gray-500" },
  };
  /* ══════════ Gate ══════════ */
  let intentosClave = 0;
  function abrirApp() {
    sessionStorage.setItem("detecta-acceso", "1");
    $("gate").remove();
    $("app").classList.remove("hidden");
    buscar();
  }
  function bloquear() {
    $("gate").innerHTML =
      '<div class="text-center"><p class="text-2xl font-semibold">Acceso denegado</p>' +
      '<p class="mt-2 text-sm text-gray-500">Este sitio es privado.</p></div>';
  }
  $("gate-form").addEventListener("submit", (e) => {
    e.preventDefault();
    if ($("gate-clave").value === CLAVE) return abrirApp();
    intentosClave++;
    if (intentosClave >= MAX_INTENTOS_CLAVE) return bloquear();
    const err = $("gate-error");
    err.textContent = `Acceso denegado (${MAX_INTENTOS_CLAVE - intentosClave} intento${MAX_INTENTOS_CLAVE - intentosClave === 1 ? "" : "s"} restante${MAX_INTENTOS_CLAVE - intentosClave === 1 ? "" : "s"}).`;
    err.classList.remove("hidden");
    $("gate-clave").value = "";
    $("gate-clave").focus();
  });

  /* ══════════ Estados de la vista ══════════ */
  function mostrar(estado, msg) {
    for (const id of ["estado-carga", "estado-error", "estado-vacio", "resultados"]) $(id).classList.add("hidden");
    if (estado) $(estado).classList.remove("hidden");
    if (estado === "estado-carga" && msg) $("estado-carga-msg").textContent = msg;
    if (estado === "estado-error" && msg) $("estado-error-msg").textContent = msg;
  }

  /* ══════════ Consulta ══════════ */
  let pagina = 1, reintentosSync = 0, timerReintento = null;
  let peticionActual = 0; // descarta respuestas fuera de orden (carrera de filtros)

  function parametros() {
    const p = new URLSearchParams({ perfil: $("f-perfil").value, pagina: String(pagina), por_pagina: "20" });
    const ant = $("f-anticipo").value;
    if (ant !== "") p.set("anticipo_min", ant);
    /* NO se envía `nivel_competencia` (ago 2026): ese campo sale de columnas
       EX-POST que SECOP II no publica mientras el proceso está abierto, así que
       en el corpus activo vale «baja» siempre. Quien responde esta pregunta con
       base es `competencia_entidad`, del histórico. Ver docs/AUDITORIA_INTEGRAL §4.1. */
    for (const [id, nombre] of [["f-cuantia", "cuantia_rango"],
      ["f-entidad", "competencia_entidad"], ["f-ubicacion", "ubicacion_valida"]]) {
      if ($(id).value) p.set(nombre, $(id).value);
    }
    p.set("ordenar_por", $("f-ordenar").value);
    p.set("orden", $("f-orden").value);
    // encendido por defecto: la lista es para decidir, y un proceso que no se
    // puede tomar estorba más de lo que informa. Apagarlo los devuelve
    // atenuados y con el motivo, nunca mezclados con los viables.
    if (!$("f-solo-viables").checked) p.set("solo_viables", "false");
    // apagado por defecto: sin código del RUP y sin vocabulario claro de obra,
    // el proceso es ruido (software, equipos, servicios de salud…). Encenderlo
    // los devuelve, siempre marcados como «Objeto sugiere obra».
    if ($("f-sin-unspsc").checked) p.set("incluir_sin_unspsc", "1");
    return p;
  }

  async function buscar() {
    clearTimeout(timerReintento);
    const peticion = ++peticionActual;
    /* SIN TOKEN (ago 2026). La lista es lo que vienen a ver los clientes, así
       que no se les pide credencial: el servidor responde 200 y redacta las
       cifras financieras (`finanzas_visibles:false`). Si el dueño ya guardó el
       token en esta pestaña —porque abrió el detalle de competencia— se manda
       y entonces sí vuelven las cifras; pero su AUSENCIA nunca bloquea nada ni
       abre un formulario. */
    mostrar("estado-carga", "Buscando oportunidades…");
    let r, cuerpo;
    try {
      const token = tokenGuardado();
      r = await fetch(`/api/oportunidades?${parametros()}`,
        token ? { headers: { "x-historico-token": token } } : undefined);
      cuerpo = await r.json();
    } catch {
      if (peticion !== peticionActual) return; // llegó tarde: ya hay otra búsqueda
      // durante la sincronización inicial un fallo transitorio no debe cortar
      // la espera automática
      if (reintentosSync > 0) return esperarSincronizacion();
      return mostrar("estado-error", "No se pudo contactar el servidor. Revise su conexión e intente de nuevo.");
    }
    if (peticion !== peticionActual) return; // respuesta obsoleta: descartar

    if (r.status === 503 && cuerpo && cuerpo.sincronizando) return esperarSincronizacion();
    /* Un 401 aquí solo puede venir de un token GUARDADO que ya no vale (rotado
       o mal copiado). Se olvida y se reintenta SIN él: la lista pública sigue
       estando disponible, así que degradar es mejor que bloquear al cliente
       con un formulario que no necesita para nada. */
    if (r.status === 401) {
      olvidarToken();
      return buscar();
    }
    if (!r.ok || !cuerpo.ok) {
      return mostrar("estado-error", (cuerpo && cuerpo.error) || `Error del servidor (${r.status}). Intente de nuevo.`);
    }

    reintentosSync = 0;
    // refresco en segundo plano: con datos de >5 min el backend corre un
    // delta barato; si están frescos responde alDia sin tocar Socrata
    fetch("/api/sync?modo=auto").catch(() => {});
    if (cuerpo.sincronizado) {
      const s = $("sello-sync");
      s.textContent = `Datos: ${new Date(cuerpo.sincronizado).toLocaleString("es-CO", { dateStyle: "medium", timeStyle: "short" })}`;
      s.classList.remove("hidden");
    }
    if (!cuerpo.total) return mostrar("estado-vacio");
    pintar(cuerpo);
  }

  /* Primera visita con Redis vacío: el backend ya disparó /api/sync. Aquí se
     refuerza (por si el fire-and-forget del servidor murió) y se reintenta. */
  function esperarSincronizacion() {
    reintentosSync++;
    if (reintentosSync > MAX_REINTENTOS_SYNC) {
      return mostrar("estado-error", "La sincronización con SECOP II está tardando más de lo normal. Intente de nuevo en unos minutos.");
    }
    fetch("/api/sync?modo=auto").catch(() => {});
    let restante = REINTENTO_SYNC_SEG;
    const tic = () => {
      mostrar("estado-carga",
        `Sincronizando datos de SECOP II por primera vez… reintento en ${restante} s (intento ${reintentosSync}/${MAX_REINTENTOS_SYNC}). Puede tardar unos minutos.`);
      if (restante-- <= 0) return buscar();
      timerReintento = setTimeout(tic, 1000);
    };
    tic();
  }

  /* ══════════ Pintado ══════════ */
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  function chip(texto, clases, titulo) {
    const t = titulo ? ` title="${esc(titulo)}"` : "";
    return `<span${t} class="rounded-full px-2.5 py-0.5 text-xs font-medium ${clases}">${texto}</span>`;
  }

  function chipBaja(b) {
    const nivel = (b && b.nivel) || "sin_dato";
    const procesos = Number(b && b.procesos_contados) || 0;
    const mediana = b && b.baja_mediana != null ? Number(b.baja_mediana) : null;
    // misma invariante que la banda de competencia: sin base no se interpola
    // una cifra. `procesos_contados` sí viaja, es un hecho y explica el gris.
    const conBase = nivel !== "sin_dato" && mediana != null && !isNaN(mediana) && procesos > 0;
    const d = conBase ? (BAJA_MERCADO[nivel] || BAJA_MERCADO.sin_dato) : BAJA_MERCADO.sin_dato;
    if (!conBase) {
      return chip("Baja típica: sin datos", d.clases,
        (b && b.mensaje) || "No hay procesos adjudicados suficientes para estimar el descuento");
    }
    return chip(`Baja típica: ${fmtNum.format(mediana)}%`, d.clases, b.mensaje);
  }

  /* Veredicto GRADUADO del matching UNSPSC. Nunca es un sí/no: dice CON QUÉ
     FUERZA el proceso encaja en el RUP, y el detalle completo viaja en el
     title (por qué casó, con qué clase del RUP).
       clase       la clase del RUP contiene al código publicado → sólido
       familia     la entidad publicó a nivel de familia → amplio, ver pliego
       equivalente clase afín según el histórico de adjudicaciones
       texto       sin código utilizable; lo confirma el objeto */
  const MATCH_UNSPSC = {
    clase: { texto: "RUP ✓", clases: "bg-green-100 text-green-800" },
    familia: { texto: "RUP ~ (familia)", clases: "bg-lime-100 text-lime-800" },
    equivalente: { texto: "RUP ≈ (clase afín)", clases: "bg-amber-100 text-amber-800" },
    texto: { texto: "Objeto sugiere obra", clases: "bg-amber-100 text-amber-800" },
    ninguno: { texto: "RUP ✗", clases: "bg-red-100 text-red-700" },
  };
  /* Pertinencia del objeto: ¿es obra/consultoría o un servicio que se coló por
     tener un UNSPSC inscrito? Los rojos no deberían llegar nunca a la lista
     (se filtran en el servidor); el badge existe para que se note si uno pasa. */
  const PERTINENCIA = {
    verde: "bg-green-100 text-green-800",
    amarillo: "bg-amber-100 text-amber-800",
    rojo: "bg-red-100 text-red-700",
  };

  function badgesRup(rup) {
    const m = MATCH_UNSPSC[(rup && rup.tier) || "ninguno"] || MATCH_UNSPSC.ninguno;
    const u = (rup && rup.unspsc) || {};
    const detalle = [u.mensaje, u.codigo_proceso ? `Proceso: ${u.codigo_proceso}` : null,
      u.codigo_rup ? `RUP: ${u.codigo_rup}` : null].filter(Boolean).join(" · ");
    let salida = chip(m.texto, m.clases, detalle);
    const p = rup && rup.pertinencia;
    if (p) salida += chip(esc(p.etiqueta || ""), PERTINENCIA[p.nivel] || PERTINENCIA.amarillo, p.motivo || "");
    return salida;
  }

  /* Banda de competencia de la entidad. Sin índice construido todo cae en
     "sin_dato" y la tarjeta se ve igual que antes, sin líneas rotas.
     Es un BOTÓN: el promedio no puede ser una caja negra — al pulsarlo se
     abre el detalle con los procesos que lo sostienen. */
  /* REGLA (ago 2026, defecto de producción): el badge NUNCA enseña un número
     que no tenga detrás una clasificación real. Se vio «promedio 18.2 oferentes
     en 0 procesos» porque se pintaba el promedio del índice sin comprobar que
     hubiera base para él.

     Un promedio se pinta SOLO si se cumplen las tres cosas a la vez: hay
     procesos contados, el nivel está clasificado (baja/media/alta) y el
     promedio existe. En cualquier otro caso el badge dice «Sin datos
     históricos» y NO enseña ninguna cifra — el desglose (cuántos procesos hay y
     por qué no cuentan) está a un clic, en el modal, que es donde se puede
     explicar. El servidor ya impone la misma invariante en
     lib/indice_competencia.competenciaDe: esto es la segunda cerradura. */
  function bandaCompetencia(c, entidad) {
    const nivel = (c && c.nivel) || "sin_dato";
    const procesos = Number(c && c.total_procesos) || 0;
    const promedio = c && c.promedio_oferentes != null ? Number(c.promedio_oferentes) : null;
    const conBase = procesos > 0 && nivel !== "sin_dato" && promedio != null && !isNaN(promedio);
    const d = conBase ? (COMPETENCIA_ENTIDAD[nivel] || COMPETENCIA_ENTIDAD.sin_dato) : COMPETENCIA_ENTIDAD.sin_dato;
    const texto = conBase
      ? `${d.titulo} — promedio ${fmtNum.format(promedio)} oferentes en ${procesos} proceso${procesos === 1 ? "" : "s"}`
      : d.titulo;
    return `<button type="button" data-entidad="${esc(entidad || "")}"
        title="${conBase ? "Ver los procesos que sostienen este promedio" : "Ver qué hay en el histórico de esta entidad"}"
        class="banda-competencia mt-3 inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium ring-1 ring-inset transition hover:underline ${d.clases}">
        <span aria-hidden="true">${d.emoji}</span>${esc(texto)}
        <span aria-hidden="true" class="opacity-60">›</span>
      </button>`;
  }

  /* ══════════ Las cuatro puertas ══════════
     Sustituyen a la barra de puntaje 0-100. Un número sin unidades invitaba a
     leerse como probabilidad y su tercer componente era constante en todo lo
     servido (docs/ATRACTIVIDAD.md). Cada puerta enseña su veredicto Y la cifra
     que lo sostiene en el `title`: una puerta cerrada sin su número no se puede
     discutir ni corregir. */
  const VERDE = "bg-green-100 text-green-800";
  const AMBAR = "bg-amber-100 text-amber-800";
  const ROJO = "bg-red-100 text-red-700";
  const GRIS = "bg-gray-100 text-gray-500";

  function badgePuerta(etiqueta, puerta) {
    const p = puerta || {};
    if (p.sin_dato) return chip(`⚪ ${etiqueta} ?`, GRIS, p.mensaje || "Sin datos para evaluar esta puerta");
    if (!p.pasa) return chip(`🔴 ${etiqueta} ✗`, ROJO, p.mensaje || "");
    if (p.advertencia) return chip(`🟡 ${etiqueta} ~`, AMBAR, p.mensaje || "");
    return chip(`🟢 ${etiqueta} ✓`, VERDE, p.mensaje || "");
  }

  function badgesPuertas(puertas) {
    const g = puertas || {};
    return [
      badgePuerta("RUP", g.p1_rup),
      badgePuerta("K", g.p2_k),
      badgePuerta("Caja", g.p3_caja),
      badgePuerta("Competencia", g.p4_competencia),
    ].join("");
  }

  /* Probabilidad y valor esperado. La probabilidad SIEMPRE viaja con su fuente:
     «histórico de la entidad» no es lo mismo que «supuesto conservador», y
     enseñar el 17 % sin decir de dónde sale es lo que convierte una estimación
     en una promesa. */
  const FUENTE_P = {
    entidad: "Basada en el histórico de oferentes de esta entidad",
    departamento: "La entidad no tiene histórico suficiente: se usa el promedio de su departamento",
    conservador: "Sin histórico de la entidad ni del departamento: supuesto conservador de 5 rivales",
  };

  /* «Prob. estimada» es CLICABLE (ago 2026): abre el desglose paso a paso.
     El subrayado punteado es lo que anuncia que se puede pulsar — un número que
     esconde un modal sin ninguna marca es un modal que nadie encuentra. El
     `title` con el resumen de los ajustes SE CONSERVA: sigue siendo la
     respuesta de 1 segundo, y el modal es la de 30. */
  function bloqueProbabilidad(l) {
    const d = l.p_ganar_detalle || {};
    const pct = Math.round((Number(l.p_ganar) || 0) * 100);
    /* `a.factor` puede venir en `null`: sin token, lib/publico redacta el factor
       del ajuste por baja de mercado (es invertible y revelaría la mediana que
       `baja_mercado` acaba de ocultar). Sin esta guarda el cliente público —que
       es justo para quien se abrió el endpoint— leía «baja_mercado ×null: …».
       El ajuste SÍ se enseña: que exista es un hecho, y esconderlo sería otra
       forma de mentir. Lo que falta es la cifra, y el motivo ya lo explica. */
    const ajustes = (d.ajustes || [])
      .map((a) => `${a.nombre}${a.factor == null ? "" : ` ×${a.factor}`}: ${a.motivo}`).join("\n");
    const titulo = [FUENTE_P[d.fuente] || "", d.rivales_esperados != null ? `Rivales esperados: ${d.rivales_esperados}` : "", ajustes,
      "Pulse para ver el desglose completo del cálculo"].filter(Boolean).join("\n");
    // sin id no hay nada que consultar: se pinta el texto de siempre, no un
    // botón que al pulsarlo tenga que disculparse
    const id = l.id_del_proceso || "";
    const cifra = `Prob. estimada: <strong class="tabular-nums text-gray-900">${pct}%</strong>`;
    return `
      <div class="mt-4 flex flex-wrap items-baseline gap-x-6 gap-y-1 rounded-xl bg-gray-50 px-4 py-3">
        ${id
    ? `<button type="button" class="detalle-probabilidad cursor-pointer text-left text-sm text-gray-600 underline decoration-dotted decoration-gray-400 underline-offset-4 transition hover:text-gray-900 hover:decoration-gray-900"
             data-id="${esc(id)}" data-objeto="${esc(l.nombre_del_procedimiento || id)}" title="${esc(titulo)}">
             ${cifra} <span aria-hidden="true" class="opacity-60">›</span>
           </button>`
    : `<span title="${esc(titulo)}" class="text-sm text-gray-600">${cifra}</span>`}
        <span class="text-sm text-gray-600">
          Valor esperado: <strong class="tabular-nums text-gray-900">${esc(fmtCorto(l.ve))}</strong>
        </span>
        <span class="text-xs text-gray-400">${esc(FUENTE_P[d.fuente] ? d.fuente : "")}</span>
      </div>`;
  }

  function tarjeta(l) {
    const rup = l.rup || {};
    const cierre = l.fecha_cierre ? new Date(l.fecha_cierre) : null;
    const cierreTxt = cierre && !isNaN(cierre) ? cierre.toLocaleDateString("es-CO", { day: "numeric", month: "short", year: "numeric" }) : null;
    const puertas = l.puertas || {};
    // «No viable» se ATENÚA, no se esconde (cuando el toggle lo permite): ver un
    // proceso grande caído por caja enseña más que su ausencia
    const noViable = l.viable === false;
    const motivos = (puertas.no_viable_por || []).join(" · ");

    return `
    <article class="tarjeta rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-900/5${noViable ? " opacity-50" : ""}">
      <div class="flex flex-wrap items-start justify-between gap-3">
        <div class="min-w-0 flex-1">
          <h3 class="font-semibold leading-snug tracking-tight">${esc(l.nombre_del_procedimiento || l.id_del_proceso || "Proceso sin nombre")}</h3>
          <p class="mt-1 text-sm text-gray-500">${esc(l.entidad || "Entidad no informada")}</p>
          ${bandaCompetencia(l.competencia_entidad, l.entidad)}
        </div>
        <div class="text-right">
          <p class="text-lg font-semibold tabular-nums">${fmtCOP.format(l.cuantia_cop || 0)}</p>
          <p class="text-xs uppercase tracking-wide text-gray-400">cuantía ${esc(l.cuantia_rango || "")}</p>
        </div>
      </div>

      ${noViable ? `<p class="mt-3">${chip(`No viable${motivos ? ` — ${esc(motivos)}` : ""}`, "bg-red-100 text-red-700 ring-1 ring-inset ring-red-600/20",
    "No pasa una de las puertas: pase el cursor por los badges para ver por qué")}</p>` : ""}

      <div class="mt-4 flex flex-wrap gap-2">
        ${badgesPuertas(puertas)}
      </div>

      ${bloqueProbabilidad(l)}

      <div class="mt-4 flex flex-wrap gap-2">
        ${chip(l.anticipo_pct > 0 ? `Anticipo ${l.anticipo_pct}%` : "Anticipo no declarado", l.anticipo_pct > 0 ? "bg-blue-100 text-blue-800" : "bg-gray-100 text-gray-500")}
        ${chipBaja(l.baja_mercado)}
        ${chip(esc(`${l.ciudad_entidad || l.departamento_entidad || "Ubicación n/d"}`) + (l.ubicacion_valida ? " ✓" : ""), l.ubicacion_valida ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600")}
        ${badgesRup(rup)}
        ${rup.co_estimado ? chip("K sobre CO estimado", "bg-gray-100 text-gray-500", "La capacidad se calcula con un ingreso operacional estimado: no sirve para acreditar") : ""}
        ${cierreTxt ? chip(`Cierra ${cierreTxt}`, "bg-purple-100 text-purple-800") : ""}
        ${l._cierre_prorrogado ? chip("Cierre prorrogado", "bg-indigo-100 text-indigo-800", "El cierre se movió por adenda: suele indicar que no llegaron ofertas suficientes") : ""}
        ${l.modalidad_de_contratacion ? chip(esc(l.modalidad_de_contratacion), "bg-gray-100 text-gray-600") : ""}
      </div>

      <div class="mt-4 flex items-center justify-between text-sm">
        <span class="text-gray-400">${esc(l.estado_del_procedimiento || "")}</span>
        ${l.urlproceso ? `<a href="${esc(l.urlproceso)}" target="_blank" rel="noopener noreferrer" class="font-medium text-blue-600 hover:underline">Ver en SECOP II ↗</a>` : ""}
      </div>
    </article>`;
  }

  function pintar(cuerpo) {
    mostrar("resultados");
    // el reparto por solidez del match dice de un vistazo cuántas son «RUP ✓»
    // y cuántas hay que verificar en el pliego
    const m = cuerpo.por_match || {};
    const porVerificar = (m.familia || 0) + (m.equivalente || 0) + (m.texto || 0);
    $("resumen-resultados").textContent =
      `${cuerpo.total} oportunidad${cuerpo.total === 1 ? "" : "es"} para el perfil «${$("f-perfil").selectedOptions[0].text}»`
      + (cuerpo.viables !== undefined ? ` · ${cuerpo.viables} pasan las cuatro puertas` : "")
      + (cuerpo.no_viables ? `, ${cuerpo.no_viables} no viable${cuerpo.no_viables === 1 ? "" : "s"}` : "")
      + (m.clase !== undefined ? ` · ${m.clase} con RUP ✓${porVerificar ? `, ${porVerificar} por verificar` : ""}` : "")
      + (cuerpo.incluye_sin_unspsc ? " · incluye procesos sin código UNSPSC" : "");
    $("lista").innerHTML = cuerpo.resultados.map(tarjeta).join("");

    const totalPaginas = Math.max(1, Math.ceil(cuerpo.total / cuerpo.por_pagina));
    const pag = $("paginacion");
    if (totalPaginas <= 1) { pag.innerHTML = ""; return; }
    pag.innerHTML = `
      <button id="pag-ant" ${cuerpo.pagina <= 1 ? "disabled" : ""} class="rounded-lg border border-gray-300 bg-white px-3 py-1.5 disabled:opacity-40">← Anterior</button>
      <span class="text-gray-500">Página ${cuerpo.pagina} de ${totalPaginas}</span>
      <button id="pag-sig" ${cuerpo.pagina >= totalPaginas ? "disabled" : ""} class="rounded-lg border border-gray-300 bg-white px-3 py-1.5 disabled:opacity-40">Siguiente →</button>`;
    $("pag-ant")?.addEventListener("click", () => { pagina = Math.max(1, pagina - 1); buscar(); });
    $("pag-sig")?.addEventListener("click", () => { pagina++; buscar(); });
  }

  /* ══════════ Detalle de competencia (modal) ══════════
     El badge afirma «promedio 3 oferentes en 12 procesos». Aquí se ven los 12,
     con los que quedaron fuera del promedio y POR QUÉ. El endpoint está
     protegido con el mismo HISTORICO_TOKEN que el diagnóstico, así que:
       · el token se guarda en sessionStorage (nunca en la URL, que quedaría en
         el historial del navegador y en los logs de acceso);
       · viaja por el header `x-historico-token`;
       · si falta, el propio modal lo pide; si el servidor lo rechaza, se borra
         y se vuelve a pedir. */
  const CLAVE_TOKEN = "historico_token";
  function tokenGuardado() {
    // sessionStorage puede lanzar (modo restringido / almacenamiento
    // particionado): sin este try el clic del badge moría en silencio
    try { return sessionStorage.getItem(CLAVE_TOKEN) || ""; } catch { return ""; }
  }
  function guardarToken(t) {
    try { sessionStorage.setItem(CLAVE_TOKEN, t); return true; } catch { return false; }
  }
  function olvidarToken() {
    try { sessionStorage.removeItem(CLAVE_TOKEN); } catch { /* nada que borrar */ }
  }

  const MOTIVO_EXCLUSION = {
    sin_dato_oferentes: "El proceso se adjudicó pero el dataset no dice cuántos se presentaron",
    sin_adjudicacion: "Cerrado sin adjudicación (desierto, cancelado o revocado)",
    insuficientes_datos: "La entidad no llega al mínimo de procesos para calcular un promedio fiable",
  };

  /* Cuantías compactas: $999K · $350M · $1.200M */
  function fmtCorto(cop) {
    const n = Number(cop) || 0;
    if (!n) return "No definida";
    if (n >= 1e9) return `$${fmtNum.format(Math.round(n / 1e6))}M`;
    if (n >= 1e6) return `$${Math.round(n / 1e6)}M`;
    if (n >= 1e3) return `$${Math.round(n / 1e3)}K`;
    return `$${n}`;
  }
  const recorta = (s, n = 80) => (String(s || "").length > n ? `${String(s).slice(0, n)}…` : String(s || ""));

  /* Mostrar/ocultar toca las clases de Tailwind Y `style.display`. Las dos
     utilidades (`hidden` y `flex`) declaran la misma propiedad, así que cuál
     gana depende del orden del CSS generado, no del orden en que se añaden:
     el estilo en línea deja el resultado fuera de discusión (y el modal sigue
     funcionando aunque el CDN de Tailwind no cargue). */
  const $modal = () => $("modal-competencia");
  /* Lo que hay que copiar cuando se pulsa «Copiar justificación». Se guarda al
     pintar y se BORRA al abrir: si no, el botón de un desglose seguiría
     copiando el del proceso anterior. */
  let textoParaCopiar = "";
  function cerrarModal() {
    $modal().classList.add("hidden");
    $modal().classList.remove("flex");
    $modal().style.display = "none";
    document.removeEventListener("keydown", alPulsarTecla);
  }
  function alPulsarTecla(e) { if (e.key === "Escape") cerrarModal(); }
  /* Spinner mientras carga, no un «Cargando…» seco: la consulta recorre el
     corpus entero la primera vez (después la sirve la caché de 300 s). */
  const cargando = (msg) =>
    `<div class="py-10 text-center">
       <div class="spin mx-auto h-8 w-8 rounded-full border-2 border-gray-200 border-t-gray-900"></div>
       <p class="mt-3 text-sm text-gray-400">${esc(msg)}</p>
     </div>`;
  function abrirModal(titulo, rotulo = "Competencia histórica", msg = "Cargando…") {
    $("modal-rotulo").textContent = rotulo;
    $("modal-titulo").textContent = titulo || "Entidad no informada";
    $("modal-titulo").title = titulo || "";
    $("modal-cuerpo").innerHTML = cargando(msg);
    textoParaCopiar = "";
    $("modal-copiar").classList.add("hidden");
    $("modal-copiar").textContent = "Copiar justificación";
    $modal().classList.remove("hidden");
    $modal().classList.add("flex");
    $modal().style.display = "flex";
    document.addEventListener("keydown", alPulsarTecla);
  }

  function filaProceso(p, conMotivo) {
    const ofertas = p.numero_ofertas == null || p.numero_ofertas === 0
      ? '<span class="text-gray-400">sin dato</span>' : p.numero_ofertas;
    return `<tr class="border-t border-gray-100 align-top">
      <td class="py-2 pr-3" title="${esc(p.objeto)}">${esc(recorta(p.objeto))}
        <span class="block text-xs text-gray-400">${esc(p.modalidad || "")}${p.fecha_adjudicacion ? ` · ${esc(p.fecha_adjudicacion)}` : " · Sin fecha"}</span>
        ${conMotivo ? `<span class="block text-xs text-amber-700">${esc(MOTIVO_EXCLUSION[p.motivo_exclusion] || p.motivo_exclusion || "")}</span>` : ""}
      </td>
      <td class="py-2 pr-3 text-right tabular-nums">${ofertas}</td>
      <td class="py-2 text-right tabular-nums">${esc(fmtCorto(p.cuantia_cop))}</td>
    </tr>`;
  }

  const tabla = (titulo, filas, conMotivo, nota) => !filas.length ? "" : `
    <h3 class="mt-5 mb-1 text-sm font-semibold">${esc(titulo)} (${filas.length})</h3>
    ${nota ? `<p class="mb-2 text-xs text-gray-500">${esc(nota)}</p>` : ""}
    <div class="overflow-x-auto">
      <table class="w-full text-left text-sm">
        <thead class="text-xs uppercase tracking-wide text-gray-400">
          <tr><th class="pb-1">Objeto</th><th class="pb-1 text-right">Ofertas</th><th class="pb-1 text-right">Cuantía</th></tr>
        </thead>
        <tbody>${filas.map((p) => filaProceso(p, conMotivo)).join("")}</tbody>
      </table>
    </div>`;

  function pintarDetalle(d) {
    const i = d.indice || {};
    const banda = COMPETENCIA_ENTIDAD[i.nivel] || COMPETENCIA_ENTIDAD.sin_dato;
    // misma regla que el badge: un promedio sin procesos contados detrás no se
    // pinta (el servidor ya lo anula; aquí no se vuelve a interpolar a ciegas)
    const resumen = i.promedio_oferentes != null && i.procesos_contados > 0
      ? `<p class="mt-1 text-gray-600">Promedio ${fmtNum.format(i.promedio_oferentes)} oferentes · ${i.procesos_contados} proceso${i.procesos_contados === 1 ? "" : "s"}</p>
         <p class="text-xs text-gray-500">Mediana ${i.mediana_oferentes ?? "?"} · Mín ${i.min_oferentes ?? "?"} · Máx ${i.max_oferentes ?? "?"}</p>`
      : "";
    $("modal-cuerpo").innerHTML = `
      <p class="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${banda.clases}">
        <span aria-hidden="true">${banda.emoji}</span>${esc(banda.titulo)}
      </p>
      ${resumen}
      ${d.mensaje ? `<p class="mt-3 rounded-lg bg-amber-50 p-3 text-xs text-amber-800">${esc(d.mensaje)}</p>` : ""}
      ${tabla("Procesos incluidos", d.procesos || [], false)}
      ${tabla("Excluidos del promedio", d.excluidos || [], true,
    "Están cerrados o adjudicados, pero no cuentan para el promedio por el motivo indicado en cada uno.")}
      ${d.truncado ? `<p class="mt-3 text-xs text-gray-500">Se muestran los ${d.truncado.limite} más recientes de ${d.truncado.procesos || d.truncado.excluidos} procesos.</p>` : ""}
      ${(d.procesos || []).length || (d.excluidos || []).length ? "" : '<p class="mt-4 text-gray-500">No hay procesos históricos de esta entidad.</p>'}
      <p class="mt-4 text-xs text-gray-400">Datos del corpus histórico (procesos ya cerrados)${d.cache ? " · desde caché" : ""}.</p>`;
  }

  /* ══════════ Desglose de la probabilidad (modal) ══════════
     «Prob. estimada: 23 %» sin justificar es una caja negra: el contratista no
     sabe si es buena ni qué la causa. Aquí se abre en seis pasos con la
     fórmula, los datos con su fuente citada, la aritmética escrita y los puntos
     porcentuales que aporta cada uno — y la columna de aportes SUMA la cifra
     del encabezado, que es lo que la hace auditable.

     El endpoint exige el mismo HISTORICO_TOKEN que el detalle de competencia y
     se reutiliza su formulario tal cual: es otra acción explícita del dueño
     sobre el corpus, no algo que un cliente se encuentre al entrar.

     Se llama a la ruta CANÓNICA (/api/competencia-detalle?vista=probabilidad) y
     no al alias /api/probabilidad-desglose: el alias es un rewrite de
     vercel.json y, si fallara, el modal tiene que seguir funcionando. */
  const CONFIANZA = {
    Alta: "bg-green-100 text-green-800",
    Media: "bg-amber-100 text-amber-800",
    Baja: "bg-red-100 text-red-700",
    "Sin dato": "bg-gray-100 text-gray-500",
  };

  const signoPP = (n) => `${Number(n) > 0 ? "+" : Number(n) < 0 ? "−" : ""}${fmtNum.format(Math.abs(Number(n) || 0))} pp`;

  function filaPaso(s) {
    const datos = Object.entries(s.datos_entrada || {})
      .filter(([k, v]) => k !== "fuente" && v !== null && v !== undefined && v !== "")
      .map(([k, v]) => `<span class="whitespace-nowrap"><span class="text-gray-400">${esc(k)}:</span> ${esc(typeof v === "object" ? JSON.stringify(v) : String(v))}</span>`)
      .join(" · ");
    return `<tr class="border-t border-gray-100 align-top">
      <td class="py-3 pr-3 text-right tabular-nums text-gray-400">${esc(s.paso)}</td>
      <td class="py-3 pr-3">
        <p class="font-medium">${esc(s.nombre)}</p>
        <p class="mt-1 font-mono text-[11px] leading-relaxed text-gray-500">${esc(s.formula)}</p>
        ${datos ? `<p class="mt-1 text-xs text-gray-600">${datos}</p>` : ""}
        <p class="mt-1 text-xs text-gray-400">Fuente: ${esc((s.datos_entrada || {}).fuente || "—")}</p>
        <p class="mt-1 font-mono text-[11px] text-gray-900">${esc(s.calculo)}</p>
        <p class="mt-1 text-xs italic text-gray-500">${esc(s.fundamento)}</p>
      </td>
      <td class="py-3 pr-3 text-right tabular-nums font-medium">${esc(s.resultado)}</td>
      <td class="py-3 pr-3 text-right tabular-nums ${Number(s.aporte_pp) < 0 ? "text-red-700" : "text-gray-900"}">${esc(signoPP(s.aporte_pp))}</td>
      <td class="py-3 text-right">
        <span class="inline-block rounded-md px-2 py-0.5 text-xs font-medium ${CONFIANZA[s.confianza] || CONFIANZA["Sin dato"]}">${esc(s.confianza)}</span>
      </td>
    </tr>`;
  }

  function pintarDesglose(d) {
    const pasos = d.desglose || [];
    const p = d.proceso || {};
    textoParaCopiar = d.justificacion_texto || "";
    $("modal-copiar").classList.toggle("hidden", !textoParaCopiar);
    $("modal-cuerpo").innerHTML = `
      <div class="rounded-2xl bg-gray-50 px-5 py-4">
        <p class="text-xs font-medium uppercase tracking-wide text-gray-400">Probabilidad de adjudicación</p>
        <p class="mt-1 text-4xl font-semibold tabular-nums tracking-tight">${fmtNum.format(d.probabilidad_final_pct)}%</p>
        <p class="mt-1 text-xs text-gray-500">
          ${esc(p.entidad || "")}${p.departamento ? ` · ${esc(p.departamento)}` : ""}
          ${p.cuantia_cop ? ` · ${esc(fmtCorto(p.cuantia_cop))}` : ""}
          · Valor esperado ${esc(fmtCorto((d.contexto || {}).valor_esperado_cop))}
        </p>
      </div>

      <div class="mt-5 overflow-x-auto">
        <table class="w-full text-left text-sm">
          <thead class="text-xs uppercase tracking-wide text-gray-400">
            <tr>
              <th class="pb-1 text-right">#</th>
              <th class="pb-1">Paso, fórmula y datos</th>
              <th class="pb-1 text-right">Resultado</th>
              <th class="pb-1 text-right">Aporte</th>
              <th class="pb-1 text-right">Confianza</th>
            </tr>
          </thead>
          <tbody>${pasos.map(filaPaso).join("")}</tbody>
          <tfoot>
            <tr class="border-t-2 border-gray-200 font-medium">
              <td></td>
              <td class="py-2 text-gray-500">Suma de los aportes</td>
              <td></td>
              <td class="py-2 pr-3 text-right tabular-nums">${fmtNum.format(d.suma_aportes_pp)} pp</td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div class="mt-5 rounded-xl border border-gray-900/10 bg-white p-4">
        <p class="text-xs font-medium uppercase tracking-wide text-gray-400">Resumen ejecutivo</p>
        <p class="mt-2 whitespace-pre-line leading-relaxed text-gray-800">${esc(d.resumen_ejecutivo || "")}</p>
      </div>

      <p class="mt-4 text-xs text-gray-400">${esc(d.como_leerlo || "")}
        ${d.corpus === "historico" ? " · Proceso del corpus histórico (ya cerrado)." : ""}${d.cache ? " · desde caché" : ""}</p>`;
  }

  async function cargarDesglose(id) {
    const token = tokenGuardado();
    if (!token) return pedirToken(null, () => cargarDesglose(id));
    $("modal-cuerpo").innerHTML = cargando("Reconstruyendo el cálculo…");
    let r, cuerpo;
    try {
      r = await fetch(`/api/competencia-detalle?vista=probabilidad&id_proceso=${encodeURIComponent(id)}`,
        { headers: { "x-historico-token": token } });
    } catch {
      $("modal-cuerpo").innerHTML = '<p class="py-6 text-center text-red-600">No se pudo contactar el servidor. Intente de nuevo.</p>';
      return;
    }
    /* El parseo va APARTE del fetch: el muro del edge (Vercel Password
       Protection) responde HTML, así que `r.json()` LANZA y, con las dos cosas
       en el mismo `try`, ese muro se diagnosticaría como «sin conexión» —lo
       contrario de la verdad—. */
    try { cuerpo = await r.json(); } catch {
      $("modal-cuerpo").innerHTML = `<p class="py-6 text-center text-red-600">El servidor respondió algo que no es JSON (${r.status}). Si el sitio tiene protección por contraseña, inicie sesión y reintente.</p>`;
      return;
    }
    if (r.status === 401) {
      olvidarToken();
      return pedirToken("Token inválido. Escriba uno nuevo y vuelva a intentarlo.", () => cargarDesglose(id));
    }
    if (!r.ok || !cuerpo || !cuerpo.ok) {
      $("modal-cuerpo").innerHTML = `<p class="py-6 text-center text-red-600">${esc((cuerpo && cuerpo.error) || `Error del servidor (${r.status}).`)}</p>`;
      return;
    }
    pintarDesglose(cuerpo);
  }

  /* Formulario del token. REGLA: ninguna pulsación puede quedarse sin
     respuesta visible — un botón que «no hace nada» es peor que un error. Por
     eso el campo vacío avisa, el envío deshabilita el botón y muestra estado, y
     el fallo de almacenamiento se cuenta en vez de morir callado. */
  function pedirToken(aviso, alGuardar) {
    $("modal-cuerpo").innerHTML = `
      <div id="aviso-token" class="${aviso ? "" : "hidden "}mb-3 rounded-lg bg-red-50 p-3 text-sm font-medium text-red-700">${esc(aviso || "")}</div>
      <p class="text-gray-600">Este detalle sale del corpus histórico y está protegido con el mismo token que la
        extracción histórica (<code>HISTORICO_TOKEN</code>).</p>
      <form id="form-token" class="mt-3 flex flex-wrap gap-2">
        <input id="entrada-token" type="password" autocomplete="off" spellcheck="false" placeholder="Pegue aquí el token"
               class="min-w-0 flex-1 rounded-lg border-gray-300 text-sm focus:border-gray-900 focus:ring-gray-900/10">
        <button id="btn-token" type="submit"
                class="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-gray-700 disabled:opacity-50">
          Guardar y ver detalle
        </button>
      </form>
      <label class="mt-2 flex items-center gap-2 text-xs text-gray-500">
        <input id="ver-token" type="checkbox" class="h-3.5 w-3.5 rounded border-gray-300"> Mostrar el token
      </label>
      <p class="mt-2 text-xs text-gray-400">Se guarda solo en esta pestaña (sessionStorage) y viaja por cabecera,
        nunca en la URL.</p>`;

    const entrada = $("entrada-token");
    const aviso1 = (msg) => {
      const caja = $("aviso-token");
      caja.textContent = msg;
      caja.classList.remove("hidden");
    };
    const enviar = (e) => {
      if (e) e.preventDefault();
      const t = entrada.value.trim();
      if (!t) { aviso1("Pegue el token para poder consultar el detalle."); entrada.focus(); return; }
      if (!guardarToken(t)) { aviso1("Este navegador no permite guardar el token en la pestaña. Revise la configuración de almacenamiento."); return; }
      $("btn-token").disabled = true;
      alGuardar();
    };
    // submit del formulario Y clic del botón: si algo llegara a suprimir el
    // envío del formulario, el clic sigue funcionando
    $("form-token").addEventListener("submit", enviar);
    $("btn-token").addEventListener("click", enviar);
    $("ver-token").addEventListener("change", (e) => {
      entrada.type = e.target.checked ? "text" : "password";
    });
    entrada.focus();
  }

  /* El formulario del token SOBREVIVE, pero solo para el detalle de
     competencia: /api/competencia-detalle sí exige credencial porque abre el
     corpus histórico de una entidad. Es una acción EXPLÍCITA del dueño (pulsar
     la banda de competencia), no algo que el cliente se encuentre al entrar.
     La lista nunca llega hasta aquí. */
  async function cargarDetalle(entidad) {
    const token = tokenGuardado();
    if (!token) return pedirToken(null, () => cargarDetalle(entidad));
    $("modal-cuerpo").innerHTML = '<p class="py-8 text-center text-gray-400">Consultando el histórico…</p>';
    let r, cuerpo;
    try {
      r = await fetch(`/api/competencia-detalle?entidad=${encodeURIComponent(entidad)}`,
        { headers: { "x-historico-token": token } });
      cuerpo = await r.json();
    } catch {
      $("modal-cuerpo").innerHTML = '<p class="py-6 text-center text-red-600">No se pudo contactar el servidor. Intente de nuevo.</p>';
      return;
    }
    if (r.status === 401) {
      olvidarToken();
      return pedirToken("Token inválido. Escriba uno nuevo y vuelva a intentarlo.", () => cargarDetalle(entidad));
    }
    if (!r.ok || !cuerpo || !cuerpo.ok) {
      $("modal-cuerpo").innerHTML = `<p class="py-6 text-center text-red-600">${esc((cuerpo && cuerpo.error) || `Error del servidor (${r.status}).`)}</p>`;
      return;
    }
    pintarDetalle(cuerpo);
  }

  // delegación: las tarjetas se repintan en cada búsqueda, así que el listener
  // vive en el contenedor y no en cada badge
  $("lista").addEventListener("click", (e) => {
    /* La probabilidad va PRIMERO: su botón vive dentro de la tarjeta y, si se
       resolviera después, un `closest` más laxo podría quedárselo antes. Son
       dos vistas del mismo modal y solo puede ganar una. */
    const prob = e.target.closest(".detalle-probabilidad");
    if (prob) {
      const id = prob.getAttribute("data-id");
      abrirModal(prob.getAttribute("data-objeto") || id, "Desglose de la probabilidad", "Reconstruyendo el cálculo…");
      cargarDesglose(id);
      return;
    }
    const b = e.target.closest(".banda-competencia");
    if (!b) return;
    const entidad = b.getAttribute("data-entidad");
    abrirModal(entidad, "Competencia histórica");
    cargarDetalle(entidad);
  });
  /* Copiar la justificación entera en texto plano, lista para pegar en un
     informe. `navigator.clipboard` no existe en contexto no seguro ni en
     navegadores viejos, así que hay respaldo con `execCommand` — y si las dos
     fallan se DICE, en vez de dejar el botón fingiendo que copió. */
  $("modal-copiar").addEventListener("click", async () => {
    const btn = $("modal-copiar");
    if (!textoParaCopiar) { btn.textContent = "Nada que copiar"; return; }
    let ok = false;
    try {
      await navigator.clipboard.writeText(textoParaCopiar);
      ok = true;
    } catch {
      try {
        const ta = document.createElement("textarea");
        ta.value = textoParaCopiar;
        ta.setAttribute("readonly", "");
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        ok = document.execCommand("copy");
        document.body.removeChild(ta);
      } catch { ok = false; }
    }
    btn.textContent = ok ? "Copiada ✓" : "No se pudo copiar — selecciónela a mano";
    setTimeout(() => { btn.textContent = "Copiar justificación"; }, 2500);
  });
  $("modal-cerrar").addEventListener("click", cerrarModal);
  $("modal-cerrar-pie").addEventListener("click", cerrarModal);
  $("modal-fondo").addEventListener("click", cerrarModal);

  /* ══════════ Eventos ══════════ */
  $("btn-buscar").addEventListener("click", () => { pagina = 1; reintentosSync = 0; buscar(); });
  $("btn-reintentar").addEventListener("click", () => { reintentosSync = 0; buscar(); });
  for (const id of ["f-perfil", "f-cuantia", "f-entidad", "f-ubicacion", "f-ordenar", "f-orden",
    "f-sin-unspsc", "f-solo-viables"]) {
    $(id).addEventListener("change", () => { pagina = 1; buscar(); });
  }

  /* ══════════ Arranque ══════════ */
  /* Va AL FINAL a propósito. Estaba junto al gate, y en cada visita repetida
     de la misma pestaña (`detecta-acceso` ya en sessionStorage) llamaba a
     `buscar()` antes de que se inicializaran `pagina`/`timerReintento`: el
     `clearTimeout(timerReintento)` de la primera línea de `buscar` reventaba
     con «Cannot access 'timerReintento' before initialization». Como `buscar`
     es async, el error salía por una promesa rechazada —la consola lo mostraba
     y la app se quedaba sin resultados, en silencio— en vez de detener la
     carga. Aquí ya está todo declarado y cableado. */
  if (sessionStorage.getItem("detecta-acceso") === "1") abrirApp();
})();
