/* ============================================================================
   public/apu_libro · El presupuesto calculado → libro Excel con formato Nogal
   ----------------------------------------------------------------------------
   Construye las HOJAS (estructura de filas/estilos/fórmulas) que `public/xlsx.js`
   convierte en bytes. Vive en su propio archivo UMD por la misma razón que el
   escritor: el navegador lo usa desde el editor y Node lo usa para generar el
   APU de prueba del repositorio — si el formato viviera dentro del IIFE de
   app.js habría que duplicarlo para poder probarlo, y dos copias del formato
   divergen a la primera corrección.

   EL FORMATO ES EL DEL «PRESUPUESTO NOGAL 4» (UPN-VAD-CP-009-2025, contrato
   adjudicado que sirvió para calibrar el catálogo):

     Hoja «Presupuesto»: capítulos con SUBTOTAL propio, ítem · código ·
       descripción · und · cant · valor unitario · valor total (con FÓRMULA
       =E×F y valor cacheado), bloque de cierre COSTOS DIRECTOS →
       Administración → Imprevistos → Utilidad → IVA sobre la UTILIDAD (19 %) →
       COSTOS INDIRECTOS → TOTAL, y firmas. El IVA sobre la utilidad no es un
       adorno: es como presupuesta la referencia y añade ≈1 punto — dejarlo
       fuera descuadraría contra el formulario de la entidad.
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
    /* Fase 1: cuando el motor aplicó el factor de jornada (Ley 2101), la
       cantidad de días ya no es 1 ÷ rendimiento sino factor ÷ rendimiento. Se
       escribe para que quien rehaga la fila con calculadora encuentre el número. */
    /* `Number(null)` es 0 —y 0 es finito—: sin la guarda de ausencia, una línea
       SIN factor de jornada escribía «días × 0,000 por jornada de 42 h». Es la
       trampa documentada en lib/probabilidad («numero() no sirve de guarda»),
       cazada aquí al pasar por primera vez líneas con `factor_jornada: null`. */
    if (l.tipo === "mano_obra" && l.factor_jornada != null && Number.isFinite(Number(l.factor_jornada)) && Math.abs(Number(l.factor_jornada) - 1) > 1e-6) {
      notas.push(`días × ${Number(l.factor_jornada).toFixed(3).replace(".", ",")} por jornada de 42 h`);
    }
    /* La nota que trae la propia línea (hoy solo los APU de referencia INVIAS:
       «precio de IBAGUE × 1,02 al nivel de NORTE»): quien rehaga la fila tiene
       que poder encontrar el factor, y el motor lo escribe ahí. */
    if (typeof l.nota === "string" && l.nota.trim()) notas.push(l.nota.trim());

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

  /* Sobre-recargo prestacional de una línea de mano de obra, en PUNTOS
     PORCENTUALES sobre el jornal base. Sale de dividir el precio que de verdad
     multiplica (`precio_aplicado`, el día CON prestaciones) por el jornal base
     regional: no se lee de ninguna constante, así que no puede desincronizarse
     del número que produjo el valor de la fila. `null` cuando no hay con qué
     dividir — jamás 0, que se leería como «esta cuadrilla no paga prestaciones».  */
  function recargoPrestacionalPct(l) {
    const base = Number(l.precio_region);
    const aplicado = Number(l.precio_aplicado);
    if (!Number.isFinite(base) || base <= 0 || !Number.isFinite(aplicado)) return null;
    const pct = (aplicado / base - 1) * 100;
    return pct > 0.1 ? Math.round(pct * 100) / 100 : null;
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

     SEIS estados, no cuatro. El encargo pide 🟢/🟡/🔴/⚪, pero:
       · «precio del ARCHIVO importado» y «precio TECLEADO a mano» no se pueden
         colapsar: la política de precios de la importación (CLAUDE.md) hace que
         el del archivo MANDE y quede declarado como tal, y fundirlos perdería
         esa trazabilidad justo donde importa —una cifra que vino de un Excel
         ajeno—. Los dos comparten el tratamiento visual de «lo puso una
         persona».
       · «COTIZACIÓN de proveedor» y «DERIVADO por factor regional» tampoco: el
         primero es un precio que alguien verificó y el segundo uno que hay que
         verificar. Decirles lo mismo es perder la única distinción que el
         auditor va a preguntar.

     EL ESTADO «INVIAS» EXISTE DESDE AGO 2026: los 526 APU de Referencia
     Regionalizados del INVIAS (vigencia 2026-1) están en
     `data/apu_invias_items.json` y `calculo.js` los costea con el costo directo
     oficial de la provincia representativa del departamento
     (`origen_precio: "invias"` + `referencia_invias_apu`). El badge dice la
     vigencia y la provincia, y NO es verde: es una referencia oficial, no un
     contrato adjudicado — y tampoco ámbar, porque tiene respaldo. Antes de eso
     el estado se declaraba inexistente a propósito (rotular «INVIAS» un precio
     que no lo era habría sido el peor error posible aquí).

     EL ESTADO DEL ENCARGO QUE SIGUE SIN EXISTIR, Y POR QUÉ:
       · 🟠 «Histórico SECOP · [N] procesos» — `p6dx-8zbt` publica el valor
         ADJUDICADO del contrato entero, no precios unitarios por ítem. No hay
         de dónde sacar un precio unitario del histórico, así que el estado no
         se puede alimentar con lo que hay. También documentado. */
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
    /* PRECIO DE REFERENCIA IDU (Bogotá, ago 2026): oficial y con vigencia, pero
       SIN composición y sin ajuste regional. Va ANTES de la rama `sin_apu`
       genérica (que es la de los precios que puso una persona) porque comparte
       la forma —sin desglose— y no el significado. */
    if (it.origen_precio === "idu") {
      const ri = it.referencia_idu_apu || {};
      return {
        estado: "idu",
        emoji: "🔵",
        etiqueta: `IDU ${ri.vigencia || ""} · ${ri.ciudad || "Bogotá"}`.trim(),
        suma: true,
        motivo: `Precio de referencia oficial del IDU (vigencia ${ri.vigencia || "—"}, publicado ${ri.publicado || "—"}, APU ${ri.codigo_idu || "—"}): `
          + `costo directo de referencia en ${ri.ciudad || "Bogotá"}, sin composición publicada`
          + (ri.ajuste_regional === "ninguno" ? " y SIN ajuste a su departamento (la obra no está en Bogotá)" : "")
          + ". Es una referencia, no una cotización: verifique antes de presentar.",
      };
    }
    if (it.sin_apu) {
      /* «propio» es un estado APARTE de «manual»: no es un precio tecleado al
         vuelo en este presupuesto, sino uno que este contratista ya corrigió
         antes y quedó guardado en su perfil. Es la fuente MÁS fuerte de la
         cascada —viene de su proveedor y de su región— y colapsarlo con
         «manual» escondería justo eso. */
      const propio = it.origen_precio === "propio";
      const delArchivo = it.origen_precio === "archivo";
      return {
        estado: propio ? "propio" : delArchivo ? "archivo" : "manual",
        emoji: propio ? "★" : delArchivo ? "📄" : "⚪",
        etiqueta: propio ? "Su precio" : delArchivo ? "Del archivo" : "Manual",
        suma: true,
        motivo: (Number.isFinite(Number(it.cd_catalogo))
          ? `Sin APU de respaldo. Referencia del catálogo: $${Math.round(it.cd_catalogo).toLocaleString("es-CO")}. `
          : "Sin APU de respaldo en el catálogo. ")
          + (propio
            ? "Es un precio que usted ya corrigió antes y quedó guardado en su perfil: manda sobre el "
              + "catálogo porque viene de su proveedor y de su región."
            : delArchivo
              ? "El precio viene del archivo importado y manda sobre el catálogo."
              : "El precio lo escribió usted a mano."),
      };
    }
    /* APU de REFERENCIA OFICIAL del INVIAS: costo directo publicado por el
       INVIAS para ese ítem de pago en la provincia representativa del
       departamento (la de precio mediano). Con respaldo (composición oficial),
       con vigencia y provincia declaradas, y NO cotizado por nadie para esta
       obra: por eso no es verde ni ámbar. */
    if (it.origen_precio === "invias") {
      const ra = it.referencia_invias_apu || {};
      const prov = ra.provincia_representativa ? ra.provincia_representativa.provincia : null;
      return {
        estado: "invias",
        emoji: "🔵",
        etiqueta: `INVIAS ${ra.vigencia || ""}${prov ? ` · ${prov}` : ""}`.trim(),
        suma: true,
        motivo: `APU de referencia oficial del INVIAS (vigencia ${ra.vigencia || "—"}, ítem de pago ${ra.item_de_pago || "—"}): `
          + `costo directo de la provincia ${prov || "—"}${ra.provincia_representativa ? ` (${ra.provincia_representativa.departamento})` : ""}, `
          + `la de precio mediano entre las ${ra.provincias_usadas || "—"} ${ra.nivel === "nacional" ? "del país — su departamento no tiene libro INVIAS —" : "de su departamento"}. `
          + "Es una referencia, no una cotización: verifique antes de presentar.",
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
    /* ═══ COTIZACIÓN DE PROVEEDOR ═══════════════════════════════════════════
       `precioEnRegion` decide insumo por insumo entre una COTIZACIÓN REAL
       cargada en `precios_cotizados` y DERIVAR el precio base por el factor de
       la región, y lo publica en `linea.origen_precio`. Ese dato existía y
       moría en el desglose: este badge solo miraba `fuente`, así que un ítem
       cotizado de verdad salía rotulado «Derivado regional — precio no
       verificado» sobre un precio que SÍ estaba verificado. Trazabilidad al
       revés, en el módulo donde la trazabilidad es el producto.

       El corte es por VALOR, no por número de líneas: nueve insumos cotizados
       que pesan el 3 % no hacen «cotizado» un ítem cuyo 97 % se derivó. Y se
       exige que NO QUEDE NINGUNA línea derivada: con una sola, parte del precio
       sigue sin verificar y decir «cotizado» a secas prometería de más.

       LA PUERTA SE ABRE CON `lineas_derivadas === 0`, NO CON
       `cotizado_pct === 100`. `cotizado_pct` viaja REDONDEADO a dos decimales,
       así que una línea derivada de $1 al lado de una cotizada de $3.350.400
       da 99,99997 % y `red()` lo sube a un 100 EXACTO: el ítem se rotulaba
       «Cotización de proveedor» —o sea, verificado— con parte del precio sin
       verificar. Es la misma trampa que `numero()` como guarda de «sin dato»
       (lib/probabilidad): una cifra redondeada para MOSTRAR no sirve para
       DECIDIR. El porcentaje se sigue publicando, pero solo informa. */
    const org = it.origen_insumos || null;
    if (org && org.lineas_derivadas === 0 && org.lineas_cotizadas > 0) {
      return {
        estado: "cotizado",
        emoji: "🟡",
        etiqueta: "Cotización de proveedor",
        suma: true,
        motivo: `Los ${org.lineas_cotizadas} insumos de este ítem llevan cotización real cargada para la región `
          + `${reg.region_nombre || reg.region_utilizada || "base"}: el precio NO se derivó por factor. `
          + "Verifique la vigencia de la cotización antes de presentar.",
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

  /* ─────────────────── hoja 1 · Presupuesto (formato Nogal) ──────────────
     SIETE columnas. «ÍTEM» y «CÓDIGO» son dos cosas distintas y por eso van
     separadas: el ítem es la POSICIÓN en el presupuesto (1.1, 1.2, 2.1 — lo que
     el pliego usa para referirse a una fila y lo que la entidad compara entre
     oferentes) y el código es la IDENTIDAD del ítem en el catálogo (NOG-A2,
     INV-200.1). Cuando compartían columna, dos presupuestos con los mismos
     ítems en distinto orden no se podían cotejar fila a fila.

     SUBTOTAL POR CAPÍTULO con `=SUM()` real. El bloque de COSTOS DIRECTOS ya no
     suma el rango entero de ítems sino la LISTA de celdas de subtotal: sumar el
     rango completo contaría cada peso dos veces en cuanto hay subtotales
     intercalados, que es el defecto clásico de un presupuesto armado a mano. */
  function hojaPresupuesto(r, meta) {
    const c = r.configuracion;
    const s = r.resumen;
    const filas = [];
    const fusiones = [];
    const fila = (celdas) => { filas.push(celdas); return filas.length; }; // devuelve el nº de fila (base 1)
    const fusionA_G = (n) => fusiones.push(`A${n}:G${n}`);
    // el rótulo de una fila de cierre vive en la columna ancha (DESCRIPCIÓN) y
    // se extiende hasta la del valor unitario: en la estrecha quedaría cortado
    const rotuloAncho = (n) => fusiones.push(`C${n}:F${n}`);

    fusionA_G(fila([{ v: meta.titulo || "PRESUPUESTO DE OBRA", s: "titulo" }]));
    fusionA_G(fila([{ v: [meta.entidad, meta.departamento, meta.fecha].filter(Boolean).join("   ·   ") || " ", s: "subtitulo" }]));
    if (meta.objeto) fusionA_G(fila([{ v: String(meta.objeto).slice(0, 400), s: "subtitulo" }]));
    fila([]);
    const filaCabecera = fila([
      { v: "ÍTEM", s: "encabezado" }, { v: "CÓDIGO", s: "encabezado" },
      { v: "DESCRIPCIÓN", s: "encabezado" }, { v: "UND.", s: "encabezado" },
      { v: "CANT.", s: "encabezado" }, { v: "VALOR UNITARIO", s: "encabezado" },
      { v: "VALOR TOTAL", s: "encabezado" },
    ]);

    /* Referencias que suman el COSTO DIRECTO: una celda por capítulo cerrado y
       un rango por cada tramo de ítems sin capítulo. Nunca las dos cosas sobre
       los mismos pesos. */
    const refsCostoDirecto = [];
    let capituloActual = null;
    let capIdx = 0, itemIdx = 0, sueltos = 0;
    let bloqueDesde = null, bloqueHasta = null, bloqueTotal = 0, bloqueEsCapitulo = false;

    const cerrarBloque = () => {
      if (bloqueDesde === null) return;
      if (bloqueEsCapitulo) {
        const n = fila([null, null,
          { v: `Subtotal ${capituloActual}`, s: "resumenTexto" }, null, null, null,
          { v: fin(Math.round(bloqueTotal)), t: "n", s: "resumenMoneda", f: `=SUM(G${bloqueDesde}:G${bloqueHasta})` }]);
        rotuloAncho(n);
        refsCostoDirecto.push(`G${n}`);
      } else {
        refsCostoDirecto.push(`G${bloqueDesde}:G${bloqueHasta}`);
      }
      bloqueDesde = null; bloqueHasta = null; bloqueTotal = 0;
    };

    for (const it of r.items) {
      const cap = it.capitulo || null;
      if (cap !== capituloActual) {
        cerrarBloque();
        capituloActual = cap;
        bloqueEsCapitulo = !!cap;
        if (cap) { capIdx++; itemIdx = 0; fusionA_G(fila([{ v: `${capIdx}. ${cap}`, s: "capituloTexto" }])); }
      }
      const numeroItem = capituloActual ? `${capIdx}.${++itemIdx}` : String(++sueltos);
      const codigo = it.codigo || it.item_id || "—";
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
        { v: numeroItem, s: estiloTexto },
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
            + (noVerificado ? "   ⚠️ Precio no verificado - requiere cotización" : "")
            /* El APU de referencia INVIAS se marca en la descripción con el
               MISMO patrón (dos espacios + emoji) que los otros avisos, que es
               lo que el importador del proyecto sabe limpiar al reimportar
               (`MARCADOR_EXPORTADO_RE`): un marcador con otro anclaje
               envenenaría el mapeo de vuelta, medido con los otros dos. */
            + (org.estado === "invias" ? `   🔵 ${org.etiqueta} (APU de referencia oficial)` : "")
            + (org.estado === "idu" ? `   🔵 ${org.etiqueta} (precio de referencia oficial, sin composición)` : ""),
          s: estiloTexto,
        },
        { v: it.unidad || "—", s: estiloTexto },
        Number.isFinite(it.cantidad) ? { v: it.cantidad, s: estiloCant } : { v: "—", s: estiloTexto },
        // sin precio las celdas van VACÍAS con fondo rojo: un $0 sería un precio
        sinPrecio ? { v: " ", s: "alertaTexto" } : { v: it.costo_directo_unitario, s: estiloMoneda },
        sinPrecio
          ? { v: " ", s: "alertaTexto" }
          : { v: fin(it.costo_total), t: "n", s: estiloMoneda, f: `=E${filas.length + 1}*F${filas.length + 1}` },
      ]);
      if (!sinPrecio) {
        if (bloqueDesde === null) bloqueDesde = n;
        bloqueHasta = n;
        bloqueTotal += Number(it.costo_total) || 0;
      }
    }
    cerrarBloque();

    fila([]);
    const rotulo = (texto, estilo) => ({ v: texto, s: estilo });
    const cierre = (texto, estiloTexto, valor, estiloMoneda, formula) => {
      const n = fila([null, null, rotulo(texto, estiloTexto), null, null, null,
        { v: fin(valor), t: "n", s: estiloMoneda, f: formula }]);
      rotuloAncho(n);
      return n;
    };

    const filaCD = cierre("COSTOS DIRECTOS", "resumenTexto", s.costo_directo_total, "resumenMoneda",
      refsCostoDirecto.length ? `=SUM(${refsCostoDirecto.join(",")})` : undefined);
    const filaAdm = cierre(`Administración (A) — ${c.aiu_pct} %`, "totalTexto", s.administracion, "totalMoneda",
      `=G${filaCD}*${c.aiu_pct / 100}`);
    cierre(`Imprevistos (I) — ${c.imprevistos_pct} %`, "totalTexto", s.imprevistos, "totalMoneda",
      `=G${filaCD}*${c.imprevistos_pct / 100}`);
    const filaUti = cierre(`Utilidad (U) — ${c.utilidad_pct} %`, "totalTexto", s.utilidad, "totalMoneda",
      `=G${filaCD}*${c.utilidad_pct / 100}`);
    const filaIva = cierre("IVA sobre la utilidad (19 %)", "totalTexto", s.iva_sobre_utilidad, "totalMoneda",
      `=G${filaUti}*0.19`);
    const filaCI = cierre("COSTOS INDIRECTOS", "resumenTexto",
      (s.precio_venta ?? 0) - (s.costo_directo_total ?? 0) + (s.iva_sobre_utilidad ?? 0), "resumenMoneda",
      `=SUM(G${filaAdm}:G${filaIva})`);
    cierre("TOTAL", "destacadoTexto", Math.round(((s.precio_venta ?? 0) + (s.iva_sobre_utilidad ?? 0)) || 0),
      "destacadoMoneda", `=ROUND(G${filaCD}+G${filaCI},0)`);

    if (c.aplicar_ajuste_competitivo) {
      cierre(`Ajuste competitivo aplicado — baja del ${c.factor_baja} % sobre el precio de venta`,
        "totalTexto", s.precio_final, "totalMoneda", undefined);
      cierre("PRECIO FINAL OFERTADO (sin IVA de utilidad)", "destacadoTexto", s.precio_final,
        "destacadoMoneda", undefined);
    }

    fila([]);
    fila([{ v: "Elaboró:", s: "negrita" }, { v: " ", s: "texto" }, null,
      { v: "Revisó:", s: "negrita" }, { v: " ", s: "texto" }, null, null]);
    fila([{ v: "Aprobó:", s: "negrita" }, { v: " ", s: "texto" }, null, null, null, null, null]);
    fila([]);

    const notas = [];
    /* La leyenda declara TODOS los colores. Con estados y colores en juego,
       callarse uno sería mentir justo en la fila que existe para no mentir. */
    notas.push("Leyenda: fila SIN COLOR = precio de un contrato adjudicado (Nogal 4, 2025) servido en su misma región, "
      + "insumos con cotización de proveedor cargada, APU de referencia oficial del INVIAS o precio de referencia del IDU (marcados 🔵 en la descripción, con su vigencia). "
      + "Fila AMARILLA = precio con APU pero derivado por factor regional o estimado: no está verificado y requiere cotización. "
      + "Fila ÁMBAR = precio del archivo importado o tecleado a mano, sin APU de respaldo en el catálogo (suma al total y queda declarado). "
      + "Fila ROJA = ítem sin precio: NO suma al total — un $0 sería un precio inventado.");
    notas.push(`Fecha de generación: ${meta.fecha || "—"}. `
      + `Región de precios: ${(r.ajuste_regional && (r.ajuste_regional.region_nombre || r.ajuste_regional.region_utilizada)) || "—"}. `
      + `Factor prestacional aplicado sobre el jornal: ${(r.ajuste_regional && r.ajuste_regional.prestacional) || "—"}. `
      + `Catálogo ${(r.catalogo && r.catalogo.version) || "—"}, base de precios ${(r.catalogo && r.catalogo.base_precios) || "—"}.`);
    if ((r.como_leerlo && r.como_leerlo.precios)) notas.push(r.como_leerlo.precios);
    for (const a of r.alertas || []) notas.push(a);
    for (const nota of notas) fusionA_G(fila([{ v: nota, s: "nota" }]));

    return {
      nombre: "Presupuesto",
      filas,
      anchos: [9, 14, 58, 8, 11, 16, 18],
      altos: { 0: 28 },
      congelar: filaCabecera,
      fusiones,
    };
  }

  /* ─────────────────── hoja 2 · APU por ítem (formato Nogal) ───────────── */
  /* El orden y las grafías («EQUIPO y HERRAMIENTAS», «MANO de OBRA») vienen del
     Presupuesto Nogal 4: no se tocan.

     CADA SECCIÓN LLEVA SU PROPIA CABECERA. Antes había una sola para el bloque
     entero, con la columna C rotulada «CANT/ REND» — un rótulo que significaba
     tres cosas distintas según la fila (cantidad de material, días por unidad de
     obra, m³ de acarreo) y por tanto no describía ninguna. Cuesta tres filas por
     ítem y hace que cada etiqueta sea verdadera para lo que tiene debajo.

     LAS COLUMNAS A-E SON LAS CINCO DE LA REFERENCIA y no se mueven: la hoja del
     pliego cierra con `ROUND(SUM(Ea:Eb)/2)`, que solo tiene sentido si los
     parciales y los subtotales comparten la columna E. Las dos columnas nuevas
     (F y G) van DETRÁS y llevan los factores que hasta ahora viajaban dentro
     del texto de la descripción: desperdicio, rendimiento, distancia y recargo
     prestacional. Un auditor los pedía uno por uno; ahora los puede ordenar. */
  const SECCIONES_APU = [
    ["material", "MATERIALES:",
      ["DESCRIPCIÓN", "UNIDAD", "CANTIDAD", "VR UNITARIO", "VR PARCIAL", "CANT. BASE", "DESPERDICIO"]],
    ["equipo", "EQUIPO y HERRAMIENTAS:",
      ["DESCRIPCIÓN", "UNIDAD", "CANT. POR UNIDAD", "VR POR UNIDAD", "VR PARCIAL", "RENDIMIENTO", ""]],
    ["transporte", "TRANSPORTES:",
      ["DESCRIPCIÓN", "UNIDAD", "CANT. × DISTANCIA", "TARIFA", "VR PARCIAL", "DISTANCIA (km)", ""]],
    // el jornal que multiplica YA lleva las prestaciones dentro: decirlo en el
    // rótulo evita que la fila parezca cobrar de más frente al jornal conocido
    ["mano_obra", "MANO de OBRA:",
      ["DESCRIPCIÓN", "UNIDAD", "CANT. POR UNIDAD", "JORNAL C/ PRESTACIONAL", "VR PARCIAL", "RENDIMIENTO", "FACTOR PRESTACIONAL"]],
  ];

  /* Las dos columnas de factores, por tipo de insumo. Devuelve celdas ya
     estiladas o `null` — y `null` significa «no aplica», nunca cero: un 0 en
     DESPERDICIO afirmaría que ese ítem no prevé desperdicio, que es
     precisamente lo que los 157 ítems calibrados NO dicen (su desperdicio ya
     viene dentro de la cantidad del pliego). */
  function columnasFactor(l) {
    const rend = Number(l.rendimiento);
    const celdaRend = Number.isFinite(rend) && rend > 0 ? { v: rend, s: "cantidad" } : null;
    if (l.tipo === "material") {
      const base = Number(l.cantidad_base);
      const desp = Number(l.desperdicio) || 0;
      return [
        Number.isFinite(base) ? { v: base, s: "cantidad" } : null,
        desp > 0 ? { v: Math.round(desp * 10000) / 100, s: "porcentaje" } : null,
      ];
    }
    if (l.tipo === "transporte") {
      const km = Number(l.distancia_km);
      // el 1 de los fletes cerrados del Nogal NO es un dato del pliego: no se pinta
      return [Number.isFinite(km) && km !== 1 ? { v: km, s: "cantidad" } : null, null];
    }
    if (l.tipo === "mano_obra") {
      const pct = recargoPrestacionalPct(l);
      return [celdaRend, pct == null ? null : { v: pct, s: "porcentaje" }];
    }
    return [celdaRend, null];
  }

  function hojaApu(r, meta) {
    const filas = [];
    const fusiones = [];
    const fila = (celdas) => { filas.push(celdas); return filas.length; };
    const fusionA_G = (n) => fusiones.push(`A${n}:G${n}`);

    fusionA_G(fila([{ v: "ANÁLISIS DE PRECIOS UNITARIOS", s: "titulo" }]));
    fusionA_G(fila([{ v: [meta.titulo, meta.fecha].filter(Boolean).join(" · ") || " ", s: "subtitulo" }]));
    fila([]);

    let consecutivo = 0;
    for (const it of r.items) {
      consecutivo++;
      const codigo = it.codigo || it.item_id || String(consecutivo);
      const encabezadoItem = fila([
        { v: `${codigo} · ${it.descripcion || "—"}`, s: "negrita" }, null, null, null,
        { v: `UNIDAD: ${it.unidad || "—"}`, s: "negrita" }, null, null,
      ]);
      fusiones.push(`A${encabezadoItem}:D${encabezadoItem}`);

      if (it.incompleto) {
        const n = fila([{ v: `⛔ SIN PRECIO — ${it.mensaje || "no se pudo costear"}`, s: "alertaTexto" }]);
        fusionA_G(n);
        fila([]);
        continue;
      }

      if (it.sin_apu) {
        const ri = it.origen_precio === "idu" ? (it.referencia_idu_apu || {}) : null;
        const origen = ri ? `PRECIO DE REFERENCIA IDU ${ri.vigencia || ""} (${ri.ciudad || "Bogotá"}, APU ${ri.codigo_idu || "—"}, publicado ${ri.publicado || "—"})`
          : it.origen_precio === "propio" ? "PRECIO PROPIO YA CORREGIDO (guardado en su perfil)"
          : it.origen_precio === "archivo" ? "PRECIO SEGÚN ARCHIVO IMPORTADO" : "PRECIO TECLEADO A MANO";
        const n = fila([
          { v: ri ? `${origen} — SIN COMPOSICIÓN PUBLICADA${ri.ajuste_regional === "ninguno" ? "; SIN AJUSTE REGIONAL" : ""}` : `${origen} — SIN APU DE RESPALDO EN EL CATÁLOGO`, s: ri ? "texto" : "destacadoTexto" }, null, null,
          { v: "VR UNITARIO =", s: "destacadoTexto" },
          { v: fin(it.costo_directo_unitario), s: "destacadoMoneda" }, null, null,
        ]);
        fusiones.push(`A${n}:C${n}`);
        if (Number.isFinite(it.cd_catalogo)) {
          const nota = fila([{
            v: `Referencia del catálogo para este ítem: $${Math.round(it.cd_catalogo).toLocaleString("es-CO")} de costo directo. `
              + "El precio del archivo MANDA; la diferencia queda declarada aquí para poder discutirla.",
            s: "nota",
          }]);
          fusionA_G(nota);
        }
        fila([]);
        continue;
      }

      /* APU de referencia INVIAS: la hoja dice de qué provincia es el costo
         directo y que las líneas van llevadas desde la provincia de referencia
         de la composición — sin eso, quien audite verá precios de Ibagué
         multiplicados por un factor sin nombre. */
      if (it.origen_precio === "invias" && it.referencia_invias_apu) {
        const ra = it.referencia_invias_apu;
        const prov = ra.provincia_representativa ? `${ra.provincia_representativa.provincia} (${ra.provincia_representativa.departamento})` : "—";
        const nota = fila([{
          v: `APU DE REFERENCIA OFICIAL INVIAS ${ra.vigencia || ""} · ítem de pago ${ra.item_de_pago || "—"}${ra.articulo ? ` · ${ra.articulo}` : ""}. `
            + `Costo directo de la provincia ${prov}, la de precio mediano entre las ${ra.provincias_usadas || "—"} ${ra.nivel === "nacional" ? "del país (el departamento no tiene libro INVIAS)" : "del departamento"}. `
            + `Cantidades y rendimientos oficiales; precios de las líneas de ${ra.provincia_referencia_composicion || "la provincia de referencia"} llevados al nivel de esa provincia (factor por línea en la nota). Referencia, no cotización.`,
          s: "nota",
        }]);
        fusionA_G(nota);
      }
      const insumos = (it.detalle && it.detalle.insumos) || [];
      for (const [tipo, rotulo, cabecera] of SECCIONES_APU) {
        const delTipo = insumos.filter((l) => l.tipo === tipo);
        const esEquipo = tipo === "equipo";
        const hm = esEquipo && it.detalle && it.detalle.herramienta_menor_pct > 0
          ? it.detalle.herramienta_menor_unitario : null;
        /* Los elementos de protección personal (Fase 1: % de la mano de obra
           desde apu:parametros) van en la sección de EQUIPO junto a la
           herramienta menor, que es donde el motor los suma (`calculo.js`): si
           no se imprimieran, VR COSTO DIRECTO incluiría un valor que ninguna
           fila de la hoja explica — la fila «que no cuadra» otra vez. */
        const epp = esEquipo && it.detalle && it.detalle.epp_pct > 0
          ? it.detalle.epp_unitario : null;
        if (!delTipo.length && hm == null && epp == null) continue;
        fila([{ v: rotulo, s: "negrita" }]);
        fila(cabecera.map((t) => (t ? { v: t, s: "encabezado" } : null)));
        let subtotal = 0;
        const desde = filas.length + 1;
        for (const l of delTipo) {
          /* `lineaLegible` es la MISMA función que usa el desglose en pantalla:
             la cantidad que se imprime es la que multiplica al precio, así que
             la fila cuadra siempre (incluido el acarreo, que lleva los km). */
          const v = lineaLegible(l);
          const [f, g] = columnasFactor(l);
          fila([
            { v: v.descripcion, s: "texto" },
            { v: v.unidad, s: "texto" },
            { v: v.cantidad, s: "cantidad" },
            { v: v.precio, s: "moneda2" },
            { v: v.valor, s: "moneda2" },
            f, g,
          ]);
          subtotal += l.valor || 0;
        }
        if (hm != null) {
          fila([
            { v: `HERRAMIENTA MENOR (${Math.round(it.detalle.herramienta_menor_pct * 100)} % de la mano de obra)`, s: "texto" },
            /* El porcentaje va DENTRO de la descripción y NO en la columna G:
               en la sección de EQUIPO esa columna no tiene rótulo, y una cifra
               bajo una columna sin nombre es exactamente el «CANT/ REND» que
               este formato ya retiró una vez. La herramienta menor tampoco
               tiene rendimiento, así que la F también se calla. */
            { v: "%", s: "texto" }, null, null, { v: fin(hm), s: "moneda2" },
            null, null,
          ]);
          subtotal += hm;
        }
        if (epp != null) {
          fila([
            { v: `ELEMENTOS DE PROTECCIÓN PERSONAL (${Math.round(it.detalle.epp_pct * 1000) / 10} % de la mano de obra)`, s: "texto" },
            { v: "%", s: "texto" }, null, null, { v: fin(epp), s: "moneda2" },
            null, null,
          ]);
          subtotal += epp;
        }
        const hasta = filas.length;
        fila([null, null, null, { v: "Subtotal =", s: "moneda2Negrita" },
          { v: Math.round(subtotal * 100) / 100, s: "moneda2Negrita", f: `=SUM(E${desde}:E${hasta})` },
          null, null]);
      }

      /* VR COSTO DIRECTO va con el valor del MOTOR y SIN fórmula, a propósito.
         El unitario que publica `calculo.js` es la suma de los cuatro capítulos
         ya REDONDEADOS, así que un `=SUM()` de los subtotales de arriba daría un
         número que puede diferir en céntimos — y entonces esta hoja
         contradiría, en su cifra más importante, la columna VALOR UNITARIO de la
         hoja «Presupuesto». Entre una fórmula bonita y dos hojas que dicen lo
         mismo, gana lo segundo. Hay prueba de esa igualdad. */
      fila([null, null, null, { v: "VR COSTO DIRECTO =", s: "resumenTexto" },
        { v: fin(it.costo_directo_unitario), s: "resumenMoneda" }, null, null]);
      fila([]);
    }

    /* Firma del ingeniero de costos. Va al final de la hoja de APU y no solo en
       la del presupuesto porque son dos entregables distintos: la entidad suele
       pedir el análisis unitario firmado aparte, y una hoja sin firma se
       devuelve. */
    fila([]);
    const firma = fila([{ v: "Analizó y elaboró los APU:", s: "negrita" }, null, null,
      { v: "Firma:", s: "negrita" }, null, null, null]);
    fusiones.push(`A${firma}:C${firma}`);
    fusiones.push(`D${firma}:G${firma}`);
    const matricula = fila([{ v: "Nombre / Matrícula profesional:", s: "negrita" }, null, null,
      { v: " ", s: "texto" }, null, null, null]);
    fusiones.push(`A${matricula}:C${matricula}`);
    fusiones.push(`D${matricula}:G${matricula}`);
    fusionA_G(fila([{
      v: "Los factores de cada línea (cantidad base, desperdicio, rendimiento, distancia y recargo prestacional) "
        + "van en las columnas F y G para que el análisis se pueda auditar sin leer la descripción.",
      s: "nota",
    }]));

    return {
      nombre: "APU",
      filas,
      anchos: [58, 10, 13, 16, 16, 14, 16],
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

  /* Nombre del archivo, en UN solo sitio: `APU_<proyecto>_<fecha>.xlsx`. Lo
     pedía el encargo y estaba escrito dentro del manejador del botón, donde ni
     se podía probar ni lo veía el generador del repositorio. Se sanea lo que
     el usuario teclee —un nombre con `/` o `:` produce descargas que el sistema
     de archivos rechaza en silencio— y se conserva el acento, que sí es válido. */
  function nombreArchivo(titulo, fecha) {
    const limpio = String(titulo || "").trim()
      .replace(/[\\/:*?"<>|]+/g, " ")
      .replace(/\s+/g, "_")
      .slice(0, 60)
      .replace(/^_+|_+$/g, "");
    const dia = /^\d{4}-\d{2}-\d{2}$/.test(String(fecha || "")) ? fecha : null;
    return ["APU", limpio || "presupuesto", dia].filter(Boolean).join("_") + ".xlsx";
  }

  /* `lineaLegible` y `clasificarOrigen` se exportan a propósito: el editor
     pinta su desglose y su badge con ESTAS funciones, no con copias suyas. Dos
     definiciones de «de dónde sale este precio» divergirían a la primera
     corrección, y la divergencia sería entre lo que el dueño ve en pantalla y
     lo que entrega a la entidad. */
  return { construirLibroNogal, lineaLegible, clasificarOrigen, nombreArchivo, recargoPrestacionalPct };
});
