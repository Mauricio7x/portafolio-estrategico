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
      const sinPrecio = it.incompleto || !Number.isFinite(it.costo_directo_unitario);
      const marcado = !sinPrecio && it.sin_apu;
      const estiloTexto = sinPrecio ? "alertaTexto" : marcado ? "destacadoTexto" : "texto";
      const estiloMoneda = sinPrecio ? "alertaTexto" : marcado ? "destacadoMoneda" : "moneda";
      const estiloCant = sinPrecio ? "alertaTexto" : marcado ? "destacadoCantidad" : "cantidad";

      const n = fila([
        { v: codigo, s: estiloTexto },
        { v: (it.descripcion || "—") + (sinPrecio ? "   ⛔ SIN PRECIO: no suma al total" : ""), s: estiloTexto },
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
    notas.push("Leyenda: fila ÁMBAR = precio del archivo importado o tecleado a mano, sin APU de respaldo en el catálogo (suma al total y queda declarado). Fila ROJA = ítem sin precio: NO suma al total — un $0 sería un precio inventado.");
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
  const SECCIONES_APU = [
    ["material", "MATERIALES:"],
    ["equipo", "EQUIPO y HERRAMIENTAS:"],
    ["transporte", "TRANSPORTES:"],
    ["mano_obra", "MANO de OBRA:"],
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

      fila([
        { v: "DESCRIPCIÓN", s: "encabezado" }, { v: "UNIDAD", s: "encabezado" },
        { v: "CANT/ REND", s: "encabezado" }, { v: "PRECIO UNITARIO", s: "encabezado" },
        { v: "VR PARCIAL", s: "encabezado" },
      ]);

      const insumos = (it.detalle && it.detalle.insumos) || [];
      for (const [tipo, rotulo] of SECCIONES_APU) {
        const delTipo = insumos.filter((l) => l.tipo === tipo);
        const esEquipo = tipo === "equipo";
        const hm = esEquipo && it.detalle && it.detalle.herramienta_menor_pct > 0
          ? it.detalle.herramienta_menor_unitario : null;
        if (!delTipo.length && hm == null) continue;
        fila([{ v: rotulo, s: "negrita" }]);
        let subtotal = 0;
        for (const l of delTipo) {
          fila([
            { v: l.nombre || l.insumo_id, s: "texto" },
            { v: l.unidad || "—", s: "texto" },
            { v: fin(l.cantidad), s: "cantidad" },
            // en mano de obra el precio que multiplica es el día CON prestaciones
            { v: fin(tipo === "mano_obra" ? l.precio_aplicado : l.precio_region), s: "moneda2" },
            { v: fin(l.valor), s: "moneda2" },
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

  return { construirLibroNogal };
});
