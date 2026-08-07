/* ============================================================================
   public/apu_libro · El presupuesto calculado → libro Excel con formato Nogal
   ----------------------------------------------------------------------------
   Construye las HOJAS (estructura de filas/estilos/fórmulas) que `public/xlsx.js`
   convierte en bytes. Vive en su propio archivo UMD por la misma razón que el
   escritor: el navegador lo usa desde el editor y Node lo usa para generar el
   APU de prueba del repositorio — si el formato viviera dentro del IIFE de
   apu.js habría que duplicarlo para poder probarlo, y dos copias del formato
   divergen a la primera corrección.

   EL FORMATO ES EL DEL «PRESUPUESTO NOGAL 4» (UPN-VAD-CP-009-2025, contrato
   adjudicado que sirvió para calibrar el catálogo):

     Hoja «Presupuesto»: capítulos, ítem · descripción · und · cant · valor
       unitario · valor total (con FÓRMULA =D×E y valor cacheado), bloque de
       cierre COSTOS DIRECTOS → Administración → Imprevistos → Utilidad →
       IVA sobre la UTILIDAD (19 %) → COSTOS INDIRECTOS → TOTAL, y firmas.
       El IVA sobre la utilidad no es un adorno: es como presupuesta la
       referencia y añade ≈1 punto — dejarlo fuera descuadraría contra el
       formulario de la entidad.
     Hoja «APU»: un bloque por ítem con MATERIALES / EQUIPO y HERRAMIENTAS /
       TRANSPORTES / MANO de OBRA, subtotales y VR COSTO DIRECTO, desde el
       MISMO desglose (`detalle.insumos`) que produjo el total — no un segundo
       cálculo.

   LOS MARCADORES SON PARTE DEL CONTRATO, no decoración:
     · ÁMBAR  = ítem con precio del ARCHIVO importado (o tecleado a mano), sin
       composición de APU que lo respalde. Suma al total y se declara.
     · ROJO   = ítem SIN precio. No suma al total y sus celdas de valor van
       VACÍAS: un $0 sería un precio inventado, la regla de `anticipo_pct = 0`.
   ========================================================================== */
"use strict";

(function (raiz, fabrica) {
  const api = fabrica();
  if (typeof module === "object" && module.exports) module.exports = api;
  else raiz.APULibro = api;
})(typeof self !== "undefined" ? self : this, function () {

  const fin = (n) => (Number.isFinite(n) ? n : null);

  /* ═══════════════ Cómo se LEE una línea de insumo ═══════════════════════
     UNA sola definición, que usan la hoja «APU» del Excel y el desglose que
     pinta el editor en pantalla. Dos copias divergirían a la primera
     corrección, y la divergencia sería entre el APU que el dueño ve y el que
     entrega a la entidad — la lección de `total_procesos`/`procesos_contados`,
     aquí en pesos.

     LA INVARIANTE QUE ESTO EXISTE PARA CUMPLIR: en toda fila,
     `cantidad × precio = valor`. No se cumplía en TRANSPORTE y era un defecto
     real del APU exportado: la tarifa de acarreo está en $/m³-km, así que el
     valor lleva un factor `distancia_km` que la fila NO enseñaba. Un acarreo de
     1,25 m³ a 8 km imprimía «1,25 × $1.256» al lado de un parcial de $12.560 —
     ocho veces más, sin nada que lo explicara. Quien auditara el APU encontraría
     una fila que no cuadra por un factor 8. Aquí la cantidad que se publica es
     la EFECTIVA (m³·km) y la composición viaja escrita en la descripción.

     El resto de rubros ya cuadraba y no se toca:
       · material    cantidad ya trae el desperdicio incorporado
       · mano_obra   el precio que multiplica es el jornal CON prestacional
       · equipo      cantidad = 1 / rendimiento (días por unidad de obra) */
  function lineaLegible(l) {
    const nombre = l.nombre || l.insumo_id || "—";
    const desperdicio = Number(l.desperdicio) || 0;
    const km = Number(l.distancia_km);
    const rend = Number(l.rendimiento);
    let cantidad = fin(Number(l.cantidad));
    let unidad = l.unidad || "—";
    const notas = [];

    if (l.tipo === "transporte" && Number.isFinite(km) && km > 0) {
      /* Cantidad EFECTIVA: es la que multiplica a la tarifa. La unidad del
         insumo YA dice sobre qué se cotiza («m3-km» = pesos por m³ y por km),
         así que se conserva tal cual — componerla otra vez daría «m3-km-km».
         Los fletes cerrados del Nogal viajan con `distancia_km = 1`: ahí no hay
         nada que explicar y la nota se calla en vez de escribir «× 1 km». */
      cantidad = cantidad == null ? null : Math.round(cantidad * km * 1e6) / 1e6;
      if (km !== 1) {
        const base = String(l.unidad || "").replace(/-?km$/i, "") || "und";
        notas.push(`${fmtNum(Number(l.cantidad))} ${base} × ${fmtNum(km)} km`);
      }
    }
    /* El desperdicio se enseña COMPROBABLE: «1,3 + 5 % de desperdicio» permite
       verificar 1,3 × 1,05 = 1,365 en vez de tener que creerse la cifra. Y solo
       cuando es > 0: en los 157 ítems calibrados del contrato adjudicado vale 0
       porque el pliego YA lo incorpora en su cantidad, así que pintar «0,00 %»
       ahí afirmaría que ese presupuesto no prevé desperdicio — falso, y del
       tipo de falsedad que este módulo existe para no cometer. */
    if (l.tipo === "material" && desperdicio > 0) {
      const base = Number(l.cantidad_base);
      notas.push(Number.isFinite(base)
        ? `${fmtNum(base)} + ${fmtNum(desperdicio * 100)} % de desperdicio`
        : `incl. ${fmtNum(desperdicio * 100)} % de desperdicio`);
    }
    /* EL RENDIMIENTO VA POR LA UNIDAD DEL INSUMO, no «por día». En el catálogo
       conviven 55 insumos tarifados por DÍA y 5 por HORA (retroexcavadora,
       vibrocompactador, motoniveladora, finisher, carrotanque): escribir «/día»
       en los horarios es falso, y encima se ve en pantalla al lado de la
       columna que dice «hora». Es la misma confusión por la que este módulo NO
       publica un «costo horario» —mezclaría una tarifa horaria real con otras
       divididas por una jornada inventada—, cometida un nivel más abajo. */
    if ((l.tipo === "mano_obra" || l.tipo === "equipo") && Number.isFinite(rend) && rend > 0) {
      const porUnidad = String(l.unidad || "").trim().toLowerCase() || "unidad";
      notas.push(`rendimiento ${fmtNum(rend)} por ${porUnidad}`);
    }
    if (l.tipo === "mano_obra" && Number.isFinite(Number(l.precio_region)) && Number(l.precio_region) > 0
        && Number.isFinite(Number(l.precio_aplicado))) {
      const factor = Number(l.precio_aplicado) / Number(l.precio_region);
      // el jornal que multiplica ya lleva las prestaciones: sin decirlo, la
      // fila parece cobrar de más respecto del jornal que el dueño conoce
      if (factor > 1.001) notas.push(`jornal × ${fmtNum(factor)} prestacional`);
    }

    return {
      nombre,
      // el precio que MULTIPLICA, que en mano de obra es el día con prestaciones
      precio: fin(Number(l.tipo === "mano_obra" ? l.precio_aplicado : l.precio_region)),
      cantidad,
      unidad,
      valor: fin(Number(l.valor)),
      nota: notas.join(" · "),
      descripcion: notas.length ? `${nombre}  (${notas.join(" · ")})` : nombre,
      tipo: l.tipo,
    };
  }

  /* formateo local: este archivo es UMD y no puede requerir nada del IIFE */
  function fmtNum(n) {
    if (!Number.isFinite(Number(n))) return "—";
    return new Intl.NumberFormat("es-CO", { maximumFractionDigits: 2 }).format(Number(n));
  }

  /* ═════════════ De dónde sale el precio de un ítem ══════════════════════
     UNA definición, dos presentaciones: el badge de la tabla en pantalla
     (`badgeOrigen` en app.js) y el marcador de la hoja del Excel llaman a ESTA
     función. Vivía solo en el IIFE de app.js, así que el Excel exportaba
     IDÉNTICOS un precio respaldado por el contrato adjudicado y uno derivado
     por factor regional — el hueco real que había detrás del encargo.

     Cinco estados, no cuatro. El encargo pide 🟢/🟡/🔴/⚪, pero «precio del
     ARCHIVO importado» y «precio TECLEADO a mano» no se pueden colapsar: la
     política de precios de la importación (CLAUDE.md) hace que el precio del
     archivo MANDE y quede declarado como tal, y fundirlos perdería esa
     trazabilidad justo donde importa —una cifra que vino de un Excel ajeno—.
     Los dos comparten el tratamiento visual de «lo puso una persona». */
  /* `Number(null)` y `Number("")` son 0, y 0 es finito: usar
     `Number.isFinite(Number(x))` como guarda de «sin precio» deja pasar la
     AUSENCIA disfrazada de cero. Hoy el motor siempre acompaña un
     `costo_directo_unitario: null` con `incompleto: true` —que se comprueba
     antes— así que la puerta no se cruza; pero es la trampa que este proyecto
     ya documentó en `lib/probabilidad` («numero() no sirve de guarda») y
     dejarla abierta es esperar a que alguien la cruce. */
  function precioONull(v) {
    if (v === null || v === undefined || v === "" || typeof v === "boolean") return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }

  function clasificarOrigen(it, r) {
    const reg = (r && r.ajuste_regional) || {};
    if (!it || it.incompleto || precioONull(it.costo_directo_unitario) == null) {
      return {
        estado: "sin_referencia",
        emoji: "🔴",
        etiqueta: "Sin referencia",
        suma: false,
        motivo: (it && it.mensaje)
          || "No hay precio en el catálogo ni escrito a mano. NO suma al total: un $0 sería un precio inventado.",
      };
    }
    if (it.sin_apu) {
      const delArchivo = it.origen_precio === "archivo";
      return {
        estado: delArchivo ? "archivo" : "manual",
        emoji: delArchivo ? "📄" : "⚪",
        etiqueta: delArchivo ? "Del archivo" : "Manual",
        suma: true,
        motivo: (Number.isFinite(Number(it.cd_catalogo))
          ? `Sin APU de respaldo. Referencia del catálogo: $${Math.round(it.cd_catalogo).toLocaleString("es-CO")}. `
          : "Sin APU de respaldo en el catálogo. ")
          + (delArchivo
            ? "El precio viene del archivo importado y manda sobre el catálogo."
            : "El precio lo escribió usted a mano."),
      };
    }
    /* VERDE solo con las dos condiciones: precio de un contrato adjudicado Y
       servido en la región donde se adjudicó. Fuera de Bogotá el mismo precio
       se multiplica por el factor regional y deja de ser «el precio real». */
    if (it.fuente === "adjudicado" && reg.estado === "mapeado" && reg.region_utilizada === "bogota_sabana") {
      return {
        estado: "adjudicado",
        emoji: "🟢",
        etiqueta: "Adjudicado · Nogal 4 (2025)",
        suma: true,
        motivo: "Precio de un contrato ADJUDICADO real (Presupuesto Nogal 4, UPN-VAD-CP-009-2025, Bogotá 2025), "
          + "servido en su misma región.",
      };
    }
    return {
      estado: "derivado",
      emoji: "🟡",
      etiqueta: "Derivado regional",
      suma: true,
      motivo: `Precio ${it.fuente || "de referencia"} ajustado por el factor de la región `
        + `${reg.region_nombre || reg.region_utilizada || "base"}`
        + (reg.estado === "mapeado" ? "" : " (su departamento no tiene región cotizada: se usó la base y se declara)")
        + ". Precio no verificado: requiere cotización.",
    };
  }

  /* ─────────────────── hoja 1 · Presupuesto (formato Nogal) ────────────── */
  function hojaPresupuesto(r, meta) {
    const c = r.configuracion;
    const s = r.resumen;
    const filas = [];
    const fusiones = [];
    const fila = (celdas) => { filas.push(celdas); return filas.length; }; // devuelve el nº de fila (base 1)
    const fusionA_F = (n) => fusiones.push(`A${n}:F${n}`);

    fusionA_F(fila([{ v: meta.titulo || "PRESUPUESTO DE OBRA", s: "titulo" }]));
    fusionA_F(fila([{ v: [meta.entidad, meta.departamento, meta.fecha].filter(Boolean).join("   ·   ") || " ", s: "subtitulo" }]));
    if (meta.objeto) fusionA_F(fila([{ v: String(meta.objeto).slice(0, 400), s: "subtitulo" }]));
    fila([]);
    const filaCabecera = fila([
      { v: "ÍTEM", s: "encabezado" }, { v: "DESCRIPCIÓN", s: "encabezado" },
      { v: "UND.", s: "encabezado" }, { v: "CANT.", s: "encabezado" },
      { v: "VALOR UNITARIO", s: "encabezado" }, { v: "VALOR TOTAL", s: "encabezado" },
    ]);

    let capituloActual = null;
    let primeraItem = null, ultimaItem = null;
    let consecutivo = 0;
    for (const it of r.items) {
      const cap = it.capitulo || null;
      if (cap !== capituloActual) {
        capituloActual = cap;
        if (cap) fusionA_F(fila([{ v: cap, s: "capituloTexto" }]));
      }
      consecutivo++;
      const codigo = it.codigo || it.item_id || String(consecutivo);
      /* El estado sale de `clasificarOrigen`, la MISMA función que decide el
         badge de la pantalla: antes el Excel solo distinguía dos estados y un
         precio derivado por factor regional salía idéntico a uno respaldado por
         el contrato adjudicado. */
      const org = clasificarOrigen(it, r);
      const sinPrecio = org.estado === "sin_referencia";
      const marcado = org.estado === "archivo" || org.estado === "manual";
      const noVerificado = org.estado === "derivado";
      const estiloTexto = sinPrecio ? "alertaTexto" : marcado ? "destacadoTexto"
        : noVerificado ? "noVerificadoTexto" : "texto";
      const estiloMoneda = sinPrecio ? "alertaTexto" : marcado ? "destacadoMoneda"
        : noVerificado ? "noVerificadoMoneda" : "moneda";
      const estiloCant = sinPrecio ? "alertaTexto" : marcado ? "destacadoCantidad"
        : noVerificado ? "noVerificadoCantidad" : "cantidad";

      const n = fila([
        { v: codigo, s: estiloTexto },
        {
          v: (it.descripcion || "—")
            + (sinPrecio ? "   ⛔ SIN PRECIO: no suma al total" : "")
            /* La advertencia va como TEXTO y no como comentario de celda: un
               comentario no se imprime (y el presupuesto se entrega impreso o
               en PDF), no se filtra, no se copia y el propio lector del
               proyecto no lo lee al reimportar. Además exigiría estrenar VML y
               un nivel de OPC nuevo, con dos modos de fallo que hacen que Excel
               se niegue a abrir el libro ENTERO. Un archivo roto cuesta más que
               un globo que falta. */
            + (noVerificado ? "   ⚠️ Precio no verificado - requiere cotización" : ""),
          s: estiloTexto,
        },
        { v: it.unidad || "—", s: estiloTexto },
        Number.isFinite(it.cantidad) ? { v: it.cantidad, s: estiloCant } : { v: "—", s: estiloTexto },
        // sin precio las celdas van VACÍAS con fondo rojo: un $0 sería un precio
        sinPrecio ? { v: " ", s: "alertaTexto" } : { v: it.costo_directo_unitario, s: estiloMoneda },
        sinPrecio
          ? { v: " ", s: "alertaTexto" }
          : { v: fin(it.costo_total), t: "n", s: estiloMoneda, f: `=D${filas.length + 1}*E${filas.length + 1}` },
      ]);
      if (!sinPrecio) {
        if (primeraItem === null) primeraItem = n;
        ultimaItem = n;
      }
    }

    fila([]);
    const rotulo = (texto, estilo) => ({ v: texto, s: estilo });
    const rangoTotales = primeraItem ? `F${primeraItem}:F${ultimaItem}` : null;

    const filaCD = fila([null, null, null, rotulo("COSTOS DIRECTOS", "resumenTexto"), null,
      { v: fin(s.costo_directo_total), t: "n", s: "resumenMoneda", f: rangoTotales ? `=SUM(${rangoTotales})` : undefined }]);
    const filaAdm = fila([null, null, null, rotulo(`Administración (A) — ${c.aiu_pct} %`, "totalTexto"), null,
      { v: fin(s.administracion), t: "n", s: "totalMoneda", f: `=F${filaCD}*${c.aiu_pct / 100}` }]);
    fila([null, null, null, rotulo(`Imprevistos (I) — ${c.imprevistos_pct} %`, "totalTexto"), null,
      { v: fin(s.imprevistos), t: "n", s: "totalMoneda", f: `=F${filaCD}*${c.imprevistos_pct / 100}` }]);
    const filaUti = fila([null, null, null, rotulo(`Utilidad (U) — ${c.utilidad_pct} %`, "totalTexto"), null,
      { v: fin(s.utilidad), t: "n", s: "totalMoneda", f: `=F${filaCD}*${c.utilidad_pct / 100}` }]);
    const filaIva = fila([null, null, null, rotulo("IVA sobre la utilidad (19 %)", "totalTexto"), null,
      { v: fin(s.iva_sobre_utilidad), t: "n", s: "totalMoneda", f: `=F${filaUti}*0.19` }]);
    const filaCI = fila([null, null, null, rotulo("COSTOS INDIRECTOS", "resumenTexto"), null,
      { v: fin((s.precio_venta ?? 0) - (s.costo_directo_total ?? 0) + (s.iva_sobre_utilidad ?? 0)), t: "n",
        s: "resumenMoneda", f: `=SUM(F${filaAdm}:F${filaIva})` }]);
    fila([null, null, null, rotulo("TOTAL", "destacadoTexto"), null,
      { v: fin(Math.round(((s.precio_venta ?? 0) + (s.iva_sobre_utilidad ?? 0)) || 0)), t: "n",
        s: "destacadoMoneda", f: `=ROUND(F${filaCD}+F${filaCI},0)` }]);

    if (c.aplicar_ajuste_competitivo) {
      fila([null, null, null, rotulo(`Ajuste competitivo aplicado — baja del ${c.factor_baja} % sobre el precio de venta`, "totalTexto"), null,
        { v: fin(s.precio_final), t: "n", s: "totalMoneda" }]);
      fila([null, null, null, rotulo("PRECIO FINAL OFERTADO (sin IVA de utilidad)", "destacadoTexto"), null,
        { v: fin(s.precio_final), t: "n", s: "destacadoMoneda" }]);
    }

    fila([]);
    fila([{ v: "Elaboró:", s: "negrita" }, { v: " ", s: "texto" }, null,
      { v: "Revisó:", s: "negrita" }, { v: " ", s: "texto" }, null]);
    fila([{ v: "Aprobó:", s: "negrita" }, { v: " ", s: "texto" }, null, null, null, null]);
    fila([]);

    const notas = [];
    /* La leyenda declara los TRES colores. Con tres estados y dos declarados,
       callarse uno sería mentir justo en la fila que existe para no mentir. */
    notas.push("Leyenda: fila SIN COLOR = precio de un contrato adjudicado (Nogal 4, 2025) servido en su misma región. "
      + "Fila AMARILLA = precio con APU pero derivado por factor regional o estimado: no está verificado y requiere cotización. "
      + "Fila ÁMBAR = precio del archivo importado o tecleado a mano, sin APU de respaldo en el catálogo (suma al total y queda declarado). "
      + "Fila ROJA = ítem sin precio: NO suma al total — un $0 sería un precio inventado.");
    if ((r.como_leerlo && r.como_leerlo.precios)) notas.push(r.como_leerlo.precios);
    for (const a of r.alertas || []) notas.push(a);
    for (const nota of notas) fusionA_F(fila([{ v: nota, s: "nota" }]));

    return {
      nombre: "Presupuesto",
      filas,
      anchos: [10, 64, 8, 11, 16, 18],
      altos: { 0: 28 },
      congelar: filaCabecera,
      fusiones,
    };
  }

  /* ─────────────────── hoja 2 · APU por ítem (formato Nogal) ───────────── */
  /* El orden y las grafías («EQUIPO y HERRAMIENTAS», «MANO de OBRA») vienen del
     Presupuesto Nogal 4: no se tocan.

     CADA SECCIÓN LLEVA SU PROPIA CABECERA (ago 2026). Antes había una sola para
     el bloque entero, con la columna C rotulada «CANT/ REND» — un rótulo que
     significaba tres cosas distintas según la fila (cantidad de material, días
     por unidad de obra, m³ de acarreo) y por tanto no describía ninguna. Cuesta
     tres filas por ítem y hace que cada etiqueta sea verdadera para lo que tiene
     debajo. Se conservan las CINCO columnas A-E de la referencia: la hoja del
     pliego cierra con `ROUND(SUM(Ea:Eb)/2)`, que solo tiene sentido si los
     parciales y los subtotales comparten la columna E. */
  const SECCIONES_APU = [
    ["material", "MATERIALES:", ["DESCRIPCIÓN", "UNIDAD", "CANTIDAD", "VR UNITARIO", "VR PARCIAL"]],
    ["equipo", "EQUIPO y HERRAMIENTAS:", ["DESCRIPCIÓN", "UNIDAD", "CANT. POR UNIDAD", "VR POR UNIDAD", "VR PARCIAL"]],
    ["transporte", "TRANSPORTES:", ["DESCRIPCIÓN", "UNIDAD", "CANT. × DISTANCIA", "TARIFA", "VR PARCIAL"]],
    // el jornal que multiplica YA lleva las prestaciones dentro: decirlo en el
    // rótulo evita que la fila parezca cobrar de más frente al jornal conocido
    ["mano_obra", "MANO de OBRA:", ["DESCRIPCIÓN", "UNIDAD", "CANT. POR UNIDAD", "JORNAL C/ PRESTACIONAL", "VR PARCIAL"]],
  ];

  function hojaApu(r, meta) {
    const filas = [];
    const fusiones = [];
    const fila = (celdas) => { filas.push(celdas); return filas.length; };
    const fusionA_E = (n) => fusiones.push(`A${n}:E${n}`);

    fusionA_E(fila([{ v: "ANÁLISIS DE PRECIOS UNITARIOS", s: "titulo" }]));
    fusionA_E(fila([{ v: [meta.titulo, meta.fecha].filter(Boolean).join(" · ") || " ", s: "subtitulo" }]));
    fila([]);

    let consecutivo = 0;
    for (const it of r.items) {
      consecutivo++;
      const codigo = it.codigo || it.item_id || String(consecutivo);
      const encabezadoItem = fila([
        { v: `${codigo} · ${it.descripcion || "—"}`, s: "negrita" }, null, null, null,
        { v: `UNIDAD: ${it.unidad || "—"}`, s: "negrita" },
      ]);
      fusiones.push(`A${encabezadoItem}:D${encabezadoItem}`);

      if (it.incompleto) {
        const n = fila([{ v: `⛔ SIN PRECIO — ${it.mensaje || "no se pudo costear"}`, s: "alertaTexto" }]);
        fusionA_E(n);
        fila([]);
        continue;
      }

      if (it.sin_apu) {
        const origen = it.origen_precio === "archivo" ? "PRECIO SEGÚN ARCHIVO IMPORTADO" : "PRECIO TECLEADO A MANO";
        const n = fila([
          { v: `${origen} — SIN APU DE RESPALDO EN EL CATÁLOGO`, s: "destacadoTexto" }, null, null,
          { v: "VR UNITARIO =", s: "destacadoTexto" },
          { v: fin(it.costo_directo_unitario), s: "destacadoMoneda" },
        ]);
        fusiones.push(`A${n}:C${n}`);
        if (Number.isFinite(it.cd_catalogo)) {
          const nota = fila([{
            v: `Referencia del catálogo para este ítem: $${Math.round(it.cd_catalogo).toLocaleString("es-CO")} de costo directo. `
              + "El precio del archivo MANDA; la diferencia queda declarada aquí para poder discutirla.",
            s: "nota",
          }]);
          fusionA_E(nota);
        }
        fila([]);
        continue;
      }

      const insumos = (it.detalle && it.detalle.insumos) || [];
      for (const [tipo, rotulo, cabecera] of SECCIONES_APU) {
        const delTipo = insumos.filter((l) => l.tipo === tipo);
        const esEquipo = tipo === "equipo";
        const hm = esEquipo && it.detalle && it.detalle.herramienta_menor_pct > 0
          ? it.detalle.herramienta_menor_unitario : null;
        if (!delTipo.length && hm == null) continue;
        fila([{ v: rotulo, s: "negrita" }]);
        fila(cabecera.map((t) => ({ v: t, s: "encabezado" })));
        let subtotal = 0;
        for (const l of delTipo) {
          /* `lineaLegible` es la MISMA función que usa el desglose en pantalla:
             la cantidad que se imprime es la que multiplica al precio, así que
             la fila cuadra siempre (incluido el acarreo, que lleva los km). */
          const v = lineaLegible(l);
          fila([
            { v: v.descripcion, s: "texto" },
            { v: v.unidad, s: "texto" },
            { v: v.cantidad, s: "cantidad" },
            { v: v.precio, s: "moneda2" },
            { v: v.valor, s: "moneda2" },
          ]);
          subtotal += l.valor || 0;
        }
        if (hm != null) {
          fila([
            { v: `HERRAMIENTA MENOR (${Math.round(it.detalle.herramienta_menor_pct * 100)} % de la mano de obra)`, s: "texto" },
            { v: "%", s: "texto" }, null, null, { v: fin(hm), s: "moneda2" },
          ]);
          subtotal += hm;
        }
        fila([null, null, null, { v: "Subtotal =", s: "moneda2Negrita" },
          { v: Math.round(subtotal * 100) / 100, s: "moneda2Negrita" }]);
      }

      fila([null, null, null, { v: "VR COSTO DIRECTO =", s: "resumenTexto" },
        { v: fin(it.costo_directo_unitario), s: "resumenMoneda" }]);
      fila([]);
    }

    return {
      nombre: "APU",
      filas,
      anchos: [58, 10, 13, 16, 16],
      fusiones,
    };
  }

  /**
   * @param {object} r     respuesta completa de /api/apu/calcular
   * @param {object} meta  {titulo, objeto, entidad, departamento, fecha}
   * @returns hojas para `XLSXApu.construirLibro`
   */
  function construirLibroNogal(r, meta = {}) {
    if (!r || !Array.isArray(r.items)) throw new Error("Falta el presupuesto calculado.");
    return [hojaPresupuesto(r, meta), hojaApu(r, meta)];
  }

  /* `lineaLegible` y `clasificarOrigen` se exportan a propósito: el editor
     pinta su desglose y su badge con ESTAS funciones, no con copias suyas. Dos
     definiciones de «de dónde sale este precio» divergirían a la primera
     corrección, y la divergencia sería entre lo que el dueño ve en pantalla y
     lo que entrega a la entidad. */
  return { construirLibroNogal, lineaLegible, clasificarOrigen };
});
