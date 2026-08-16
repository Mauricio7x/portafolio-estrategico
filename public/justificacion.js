/* Justificación del valor de la oferta — documento exportable (Fase 3, ago 2026).

   Cuando la entidad detecta una oferta con valor artificialmente bajo DEBE pedir
   al proponente que la sustente (Decreto 1082 de 2015, art. 2.2.1.1.2.2.4; Guía
   de Colombia Compra Eficiente para el manejo de ofertas artificialmente bajas)
   y la RECHAZA si la explicación no llega o no demuestra que el precio se puede
   sostener. La ventaja estructural de Detecta es que el usuario ya tiene el APU
   detrás del precio: este módulo lo convierte en un documento imprimible.

   Es UMD (navegador + Node) para que la suite lo EJECUTE: un generador que solo
   viviera dentro del manejador de un botón no se podría probar y su salida sería
   creíble sin ser verificable. No inventa ninguna cifra: todo sale del
   presupuesto calculado (`calcular`/`rentabilidad`) y del bloque `piso_techo`.
   Lo que no está —deducciones sin cargar, precios de referencia— se declara. */
(function (raiz, fabrica) {
  if (typeof module === "object" && module.exports) module.exports = fabrica();
  else raiz.Justificacion = fabrica();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const numero = (v) => {
    if (v === null || v === undefined || v === "") return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  };
  function cop(n) {
    n = numero(n);
    if (n == null) return "—";
    const s = Math.abs(Math.round(n)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    return `${n < 0 ? "−" : ""}$${s}`;
  }
  function pct(n, d = 1) {
    n = numero(n);
    if (n == null) return "—";
    const f = Math.pow(10, d);
    return `${(Math.round(n * f) / f).toString().replace(".", ",")} %`;
  }
  function cant(n) {
    n = numero(n);
    if (n == null) return "—";
    const [ent, dec] = n.toFixed(2).split(".");
    return `${ent.replace(/\B(?=(\d{3})+(?!\d))/g, ".")},${dec}`.replace(/,00$/, "");
  }
  const ORIGEN = {
    catalogo: "Catálogo de Detecta (APU calibrado con contrato adjudicado)",
    archivo: "Precio del archivo importado por el oferente",
    manual: "Precio tecleado por el oferente",
    usuario: "Precio propio del oferente",
  };

  /* Nombre de archivo determinista: sin reloj dentro (se pasa la fecha), como
     `APULibro.nombreArchivo`. */
  function nombreArchivo({ id_proceso, fecha }) {
    const id = String(id_proceso || "proceso").replace(/[^A-Za-z0-9._-]+/g, "_").slice(0, 60);
    const f = fecha ? String(fecha).slice(0, 10) : "";
    return `Justificacion_precio_${id}${f ? "_" + f : ""}.html`;
  }

  /* `entrada`:
       { calculo, piso_techo, contexto: { entidad, id_proceso, objeto, departamento,
         oferente, fecha (ISO), modalidad, presupuesto_oficial } }
     Devuelve { html, nombre, resumen } — `resumen` publica los totales usados
     para que la prueba pueda comprobar que el documento no dice una cifra
     distinta del presupuesto. */
  function generar(entrada = {}) {
    const calc = entrada.calculo || {};
    const r = calc.resumen || {};
    const cfg = calc.configuracion || {};
    const items = Array.isArray(calc.items) ? calc.items : [];
    const pt = entrada.piso_techo || null;
    const ctx = entrada.contexto || {};
    const fecha = ctx.fecha ? String(ctx.fecha).slice(0, 10) : "";
    const po = numero(ctx.presupuesto_oficial) ?? (pt && pt.cifras ? numero(pt.cifras.presupuesto_oficial) : null);
    const precio = numero(r.precio_final);
    const cd = numero(r.costo_directo_total);
    const bajaOfertada = po && precio ? (1 - precio / po) * 100 : null;
    const comp = r.por_componente || {};
    const costeados = items.filter((i) => !i.incompleto);
    const sinPrecio = items.filter((i) => i.incompleto);

    const filas = items.map((i, k) => `<tr>
      <td>${k + 1}</td>
      <td>${esc(i.item_id || i.codigo || "")}</td>
      <td>${esc(i.descripcion || "")}</td>
      <td>${esc(i.unidad || "")}</td>
      <td class="n">${cant(i.cantidad)}</td>
      <td class="n">${i.incompleto ? "sin precio" : cop(i.costo_directo_unitario)}</td>
      <td class="n">${i.incompleto ? "—" : cop(i.costo_total)}</td>
      <td>${esc(i.incompleto ? (i.mensaje || "Sin precio: no suma al total") : (ORIGEN[i.origen_precio] || i.origen_precio || ""))}</td>
    </tr>`).join("");

    const componentes = [
      ["Materiales", comp.material], ["Mano de obra", comp.mano_obra], ["Equipo", comp.equipo],
      ["Transporte", comp.transporte], ["Ítems con precio propio (sin desglose)", comp.sin_desglose],
    ].filter(([, v]) => numero(v) != null && numero(v) !== 0)
      .map(([n, v]) => `<tr><td>${n}</td><td class="n">${cop(v)}</td><td class="n">${cd ? pct(v * 100 / cd) : "—"}</td></tr>`).join("");

    const mercado = pt && pt.aplicable ? `
      <p>${esc(pt.frases.baja)}</p>
      <p>${esc(pt.frases.oferentes)}</p>
      <p>Precio mínimo del oferente para no trabajar a pérdida (utilidad mínima ${esc(pct(pt.cifras.utilidad_minima_pct))},
        contribución de obra pública${pt.cifras.piso_es_cota_inferior ? "" : " y deducciones de acta"} incluidas):
        <strong>${cop(pt.cifras.piso_rentable)}</strong>${pt.cifras.piso_es_cota_inferior ? " (cota inferior: las deducciones de acta no están cargadas)" : ""}.</p>
      ${pt.cifras.techo_competitivo != null ? `<p>Precio de referencia al que se suele adjudicar en esta entidad: <strong>${cop(pt.cifras.techo_competitivo)}</strong>.</p>` : ""}
      <p>La oferta de <strong>${cop(precio)}</strong> ${precio != null && pt.cifras.piso_rentable != null && precio >= pt.cifras.piso_rentable
        ? "está por encima del precio mínimo del oferente: cubre el costo directo, la administración, los imprevistos y la utilidad mínima declarada."
        : "está por debajo del precio mínimo calculado con la utilidad mínima declarada; el oferente asume esa diferencia con cargo a su utilidad y lo declara."}</p>`
      : `<p>Sin presupuesto oficial asociado no se comparó la oferta contra el mercado.</p>`;

    const supuestos = [
      "Los precios de los insumos provienen del catálogo de Detecta, calibrado con un contrato ADJUDICADO de obra en Bogotá (2025), regionalizado por factores declarados y contrastado con referencias oficiales (INVIAS) y de tienda. Fuera de Bogotá los precios son factores derivados, no cotizaciones.",
      calc.parametros_costo && calc.parametros_costo.mensaje ? calc.parametros_costo.mensaje : null,
      cfg.deducciones_pct == null
        ? "Las deducciones de acta (estampillas, ReteICA) no están cargadas; la contribución especial de obra pública del 5 % (Ley 418 de 1997) sí se tuvo en cuenta en el precio mínimo."
        : `Deducciones de acta declaradas por el oferente: ${pct(cfg.deducciones_pct)} del valor del contrato, además de la contribución del 5 %.`,
      cfg.anticipo_pct == null ? "Sin dato de anticipo: el flujo se calculó como si no lo hubiera (escenario conservador)." : `Anticipo considerado: ${pct(cfg.anticipo_pct)}.`,
      sinPrecio.length ? `${sinPrecio.length} ítem(s) no tienen precio y NO suman al total: el valor de la oferta que respalda este documento es, en esa medida, una cota inferior.` : null,
    ].filter(Boolean).map((t) => `<li>${esc(t)}</li>`).join("");

    const html = `<!doctype html>
<html lang="es"><head><meta charset="utf-8">
<title>Justificación del valor de la oferta — ${esc(ctx.id_proceso || "")}</title>
<style>
  body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;color:#111;margin:32px auto;max-width:900px;line-height:1.45;font-size:13px}
  h1{font-size:20px;margin:0 0 4px} h2{font-size:15px;margin:22px 0 6px;border-bottom:1px solid #ddd;padding-bottom:3px}
  table{border-collapse:collapse;width:100%;margin-top:6px} th,td{border:1px solid #ddd;padding:4px 6px;vertical-align:top} th{background:#f3f4f6;text-align:left}
  td.n,th.n{text-align:right;white-space:nowrap;font-variant-numeric:tabular-nums}
  .meta{color:#555} .firma{margin-top:48px;display:flex;gap:48px} .firma div{flex:1;border-top:1px solid #333;padding-top:6px}
  .nota{color:#555;font-size:12px}
  @media print{body{margin:0}}
</style></head><body>
<h1>Justificación del valor de la oferta económica</h1>
<p class="meta">Proceso ${esc(ctx.id_proceso || "—")} · ${esc(ctx.entidad || "Entidad no indicada")}${ctx.modalidad ? " · " + esc(ctx.modalidad) : ""}${fecha ? " · " + esc(fecha) : ""}</p>
${ctx.objeto ? `<p class="meta">Objeto: ${esc(ctx.objeto)}</p>` : ""}
${ctx.oferente ? `<p class="meta">Oferente: ${esc(ctx.oferente)}</p>` : ""}

<h2>1. Marco</h2>
<p>El proponente presenta esta sustentación en los términos del artículo 2.2.1.1.2.2.4 del Decreto 1082 de 2015
(oferta con valor artificialmente bajo): explica cómo se estructuró el precio, con el análisis de precios unitarios
que lo respalda, y declara los supuestos con los que se calculó.</p>

<h2>2. Valor de la oferta y estructura</h2>
<table>
<tr><th>Concepto</th><th class="n">Valor</th></tr>
<tr><td>Costo directo (suma de cantidades × precio unitario)</td><td class="n">${cop(cd)}</td></tr>
<tr><td>Administración (A) ${esc(pct(cfg.aiu_pct))}</td><td class="n">${cop(r.administracion)}</td></tr>
<tr><td>Imprevistos (I) ${esc(pct(cfg.imprevistos_pct))}</td><td class="n">${cop(r.imprevistos)}</td></tr>
<tr><td>Utilidad (U) ${esc(pct(cfg.utilidad_pct))}</td><td class="n">${cop(r.utilidad)}</td></tr>
${cfg.aplicar_ajuste_competitivo ? `<tr><td>Ajuste competitivo sobre el precio de venta (${esc(pct(cfg.factor_baja))})</td><td class="n">${cop(precio - numero(r.precio_venta))}</td></tr>` : ""}
<tr><th>Valor de la oferta</th><th class="n">${cop(precio)}</th></tr>
${po != null ? `<tr><td>Presupuesto oficial de la entidad</td><td class="n">${cop(po)}</td></tr>
<tr><td>Diferencia frente al presupuesto oficial</td><td class="n">${bajaOfertada != null ? pct(bajaOfertada) + " por debajo" : "—"}</td></tr>` : ""}
</table>
<p class="nota">El IVA sobre la utilidad (${cop(r.iva_sobre_utilidad)}) se liquida aparte, sobre la utilidad, conforme al art. 1.3.1.7.9 del Decreto 1625 de 2016.</p>

<h2>3. Reparto del costo directo</h2>
<table><tr><th>Componente</th><th class="n">Valor</th><th class="n">Participación</th></tr>${componentes || "<tr><td colspan=3>Sin desglose disponible</td></tr>"}</table>

<h2>4. Cómo se fijó el precio</h2>
${mercado}

<h2>5. Análisis de precios unitarios (${costeados.length} de ${items.length} ítems con precio)</h2>
<table>
<tr><th>#</th><th>Código</th><th>Descripción</th><th>Un.</th><th class="n">Cantidad</th><th class="n">Precio unitario</th><th class="n">Total</th><th>Origen del precio</th></tr>
${filas || "<tr><td colspan=8>Sin ítems</td></tr>"}
<tr><th colspan="6">Costo directo total</th><th class="n">${cop(cd)}</th><th></th></tr>
</table>
<p class="nota">El desglose por insumo de cada ítem (materiales, mano de obra, equipo y transporte, con rendimiento y precio regional) está en el libro de Excel «APU» que acompaña esta oferta.</p>

<h2>6. Supuestos declarados</h2>
<ul>${supuestos}</ul>

<div class="firma"><div>Representante legal / proponente</div><div>Ingeniero de costos</div></div>
<p class="nota" style="margin-top:24px">Documento generado con Detecta a partir del análisis de precios unitarios del oferente. Verifique cada precio contra cotización real antes de presentar.</p>
</body></html>`;

    return {
      html,
      nombre: nombreArchivo({ id_proceso: ctx.id_proceso, fecha }),
      resumen: {
        costo_directo: cd, precio, presupuesto_oficial: po,
        items: items.length, items_costeados: costeados.length, items_sin_precio: sinPrecio.length,
        piso: pt && pt.aplicable ? pt.cifras.piso_rentable : null,
        techo: pt && pt.aplicable ? pt.cifras.techo_competitivo : null,
      },
    };
  }

  return { generar, nombreArchivo, cop, pct, cant };
});
