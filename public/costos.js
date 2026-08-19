/* public/costos.js · Motor de costo de mano de obra y costos indirectos (Fase 1)
   ─────────────────────────────────────────────────────────────────────────────
   ÚNICA implementación de las fórmulas del costo real. `lib/costos.js` la
   re-exporta para el servidor y el navegador la carga como <script>: no hay
   una copia «espejo» que pueda divergir (el patrón de `apu_libro.js`). Es
   ARITMÉTICA PURA: no lee Redis, no conoce el catálogo, no toca la red. Los
   parámetros (jornada, prestaciones, ARL, TPNL/MVP, herramienta menor, EPP)
   le llegan de fuera —`lib/parametros.js` los sirve desde `apu:parametros`—
   y ninguna tasa vive escrita aquí: si un porcentaje cambia, cambia en un
   solo sitio y el código y la documentación no pueden discrepar.

   Convenciones:
   · Los porcentajes de los parámetros van en FRACCIÓN (0.08333), no en %.
   · Un parámetro ausente NO se rellena con un valor «razonable»: la función
     lanza. Inventar un porcentaje de nómina es inventar un precio.
   · Todo resultado que se muestra sale acompañado de sus pasos
     (`explicarCostoHora`), para que un evaluador pueda rehacerlo a mano.

   Metodología de referencia (ver docs/metodologia.md, con el estado de
   verificación de cada parámetro): Base de Precios de Referencia del IDU y
   APU Regionalizados del INVIAS. Contrastados el 16-ago-2026 (§7 del doc):
   el divisor de 210 h y la herramienta menor del 5 % están en las fuentes
   primarias; TPNL y MVP NO aparecen en ninguna de las dos y siguen como
   «referencia sectorial» — solo mueven el ejemplo público de costo-hora. */
(function (raiz, fabrica) {
  if (typeof module === "object" && module.exports) module.exports = fabrica();
  else raiz.Costos = fabrica();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  const red = (n) => Math.round(n * 100) / 100;
  const num = (v, nombre) => {
    /* LA AUSENCIA SE DESCARTA ANTES DE CONVERTIR. `Number(null)`, `Number("")`,
       `Number([])` y `Number(false)` son 0 y finitos, así que la guarda dejaba
       pasar como «0 %» justo lo que este módulo existe para rechazar: un campo
       de nómina en blanco. Medido: con las cesantías vacías el recargo cae de
       44,79 % a 36,46 % y la hora de mano de obra un 5,76 % — un precio
       silenciosamente bajo, que es el error caro aquí. */
    if (v === null || v === undefined || v === "" || typeof v === "boolean" || Array.isArray(v)) {
      throw new Error(`parámetro «${nombre}» ausente o no numérico`);
    }
    const n = Number(v);
    if (!Number.isFinite(n)) throw new Error(`parámetro «${nombre}» ausente o no numérico`);
    return n;
  };

  /* Prestaciones que la exoneración del art. 114-1 del E.T. deja de cobrar
     al empleador cobijado cuando el trabajador gana menos de 10 SMMLV:
     salud patronal, SENA e ICBF — los tres juntos, nunca uno solo. */
  const EXONERABLES = Object.freeze(["salud", "sena", "icbf"]);

  /* ── recargo prestacional aplicable a UN salario ─────────────────────────
     Suma las prestaciones del parámetro más la ARL de la clase declarada.
     Con exoneración activa y salario < 10 SMMLV se descuentan las tres
     exonerables. Devuelve la fracción y el detalle (qué entró y qué no). */
  function recargoPrestacional(p, salario) {
    const smmlv = num(p.smmlv, "smmlv");
    const s = num(salario, "salario");
    const prest = p.prestaciones || {};
    const clase = String((p.arl && p.arl.clase) || "");
    const tarifas = (p.arl && p.arl.tarifas) || {};
    if (!(clase in tarifas)) throw new Error(`clase de riesgo ARL «${clase}» sin tarifa declarada`);
    const exonera = !!p.exoneracionParafiscales && s < 10 * smmlv;
    const detalle = [];
    let total = 0;
    for (const id of Object.keys(prest)) {
      const pct = num(prest[id], `prestaciones.${id}`);
      const aplica = !(exonera && EXONERABLES.includes(id));
      detalle.push({ id, pct, aplica, motivo: aplica ? null : "exonerado (E.T. art. 114-1, salario < 10 SMMLV)" });
      if (aplica) total += pct;
    }
    const arl = num(tarifas[clase], `arl.tarifas.${clase}`);
    detalle.push({ id: `arl_${clase}`, pct: arl, aplica: true, motivo: null });
    total += arl;
    return { fraccion: total, exonerado: exonera, detalle };
  }

  /* ── auxilio de transporte: aplica si el salario ≤ 2 SMMLV ─────────────── */
  function auxilioAplicable(p, salario) {
    const s = num(salario, "salario");
    return s <= 2 * num(p.smmlv, "smmlv") ? num(p.auxilioTransporte, "auxilioTransporte") : 0;
  }

  /* ── costo mensual y costo-hora ──────────────────────────────────────────
       costo_mensual_base  = salario + auxilio (si aplica)
       costo_mensual_total = costo_mensual_base × (1 + recargo)
       costo_hora          = costo_mensual_total × (1 + TPNL + MVP) / divisorAPU
     El divisor son las horas PAGADAS al mes (210 con la Ley 2101 desde el
     15-jul-2026): descontar del divisor el tiempo no laborado Y ADEMÁS
     cobrarlo como TPNL lo contaría dos veces. Las ~174 h productivas son un
     dato informativo que explica el origen del TPNL, no un divisor. */
  function costoHora(p, salario) {
    const s = num(salario, "salario");
    const rec = recargoPrestacional(p, s);
    const auxilio = auxilioAplicable(p, s);
    const base = s + auxilio;
    const total = base * (1 + rec.fraccion);
    const tpnl = num(p.tpnl, "tpnl");
    const mvp = num(p.mvp, "mvp");
    const divisor = num(p.divisorAPU, "divisorAPU");
    if (divisor <= 0) throw new Error("divisorAPU debe ser > 0");
    const hora = total * (1 + tpnl + mvp) / divisor;
    return {
      salario: s,
      auxilio,
      costo_mensual_base: red(base),
      recargo: rec.fraccion,
      exonerado: rec.exonerado,
      costo_mensual_total: red(total),
      factor_tiempo: 1 + tpnl + mvp,
      divisor,
      costo_hora: red(hora),
      detalle_recargo: rec.detalle,
    };
  }

  /* ── horas por día y costo-día ─────────────────────────────────────────── */
  function horasDia(p) {
    const semana = num(p.horasSemanaVigente, "horasSemanaVigente");
    const dias = num(p.diasLaboradosSemana, "diasLaboradosSemana");
    if (dias <= 0) throw new Error("diasLaboradosSemana debe ser > 0");
    return semana / dias;
  }
  function costoDia(p, salario) {
    const h = costoHora(p, salario);
    const hd = horasDia(p);
    return { ...h, horas_dia: red(hd), costo_dia: red(h.costo_hora * hd) };
  }

  /* ── factor de jornada sobre un catálogo cotizado POR DÍA ────────────────
     Los jornales y rendimientos del catálogo se calibraron con un contrato
     ejecutado bajo una jornada de `horasSemanaCalibracion` horas; el mismo
     día pagado rinde ahora `horasSemanaVigente`. A jornal diario constante,
     un rendimiento medido en unidades/día cae en la misma proporción y la
     mano de obra por unidad sube 44/42 − 1 ≈ 4,8 %. Es un FACTOR declarado,
     no una división: el motor sigue sin conocer ninguna jornada. */
  function factorJornada(p) {
    const cal = num(p.horasSemanaCalibracion, "horasSemanaCalibracion");
    const vig = num(p.horasSemanaVigente, "horasSemanaVigente");
    if (cal <= 0 || vig <= 0) throw new Error("las horas por semana deben ser > 0");
    return cal / vig;
  }

  /* ── costos indirectos sobre la MANO DE OBRA (metodología INVIAS) ──────── */
  function herramientaMenor(manoObra, p) { return red(num(manoObra, "manoObra") * num(p.herramientaMenor, "herramientaMenor")); }
  function epp(manoObra, p) { return red(num(manoObra, "manoObra") * num(p.epp, "epp")); }

  /* ── administración: DOS metodologías, un solo sitio ───────────────────
     · tiempo (IDU 2.2.2, predeterminada): gastos fijos mensuales ÷ jornada
       legal → costo-hora de administración × horas totales del proyecto.
     · porcentaje (INVIAS): costos directos × % de administración.
     Las dos devuelven la misma forma; quien las muestre (resumen, Excel,
     PDF) llama a ESTA función y no reescribe la fórmula. */
  function administracion(entrada, p) {
    const e = entrada || {};
    const metodo = e.metodo === "porcentaje" ? "porcentaje" : "tiempo";
    if (metodo === "porcentaje") {
      const cd = num(e.costosDirectos, "costosDirectos");
      const pct = num(e.porcentaje, "porcentaje");
      return { metodo, valor: red(cd * pct), costo_hora_admin: null, horas: null, porcentaje: pct };
    }
    const gastos = num(e.gastosFijosMensuales, "gastosFijosMensuales");
    const horas = num(e.horasProyecto, "horasProyecto");
    const jornada = num(p.jornadaLegalMes, "jornadaLegalMes");
    if (jornada <= 0) throw new Error("jornadaLegalMes debe ser > 0");
    const costoHoraAdmin = gastos / jornada;
    const valor = horas * costoHoraAdmin;
    return {
      metodo, valor: red(valor), costo_hora_admin: red(costoHoraAdmin), horas,
      // el % equivalente sobre los costos directos, si se conocen: es lo que
      // permite comprobar que las dos metodologías coinciden
      porcentaje: Number.isFinite(Number(e.costosDirectos)) && Number(e.costosDirectos) > 0
        ? valor / Number(e.costosDirectos) : null,
    };
  }

  /* ── IVA: 19 % ÚNICAMENTE sobre la utilidad, nunca sobre el AIU entero ─── */
  function ivaSobreUtilidad(utilidad, p) { return red(num(utilidad, "utilidad") * num(p.ivaSobreUtilidad, "ivaSobreUtilidad")); }

  /* ── pasos escritos, para que la cifra viaje con su cuenta ─────────────── */
  function explicarCostoHora(p, salario) {
    const c = costoHora(p, salario);
    const pct = (f) => `${red(f * 100)} %`;
    const cop = (n) => "$" + Math.round(n).toLocaleString("es-CO");
    const aplicadas = c.detalle_recargo.filter((d) => d.aplica).map((d) => `${d.id} ${pct(d.pct)}`).join(" + ");
    const exon = c.detalle_recargo.filter((d) => !d.aplica).map((d) => d.id).join(", ");
    return {
      ...c,
      pasos: [
        `Salario ${cop(c.salario)}${c.auxilio ? ` + auxilio de transporte ${cop(c.auxilio)}` : " (sin auxilio: supera 2 salarios mínimos)"} = ${cop(c.costo_mensual_base)} al mes.`,
        `Prestaciones y aportes: ${aplicadas} = ${pct(c.recargo)}${c.exonerado ? ` (exonerado de ${exon}: E.T. art. 114-1)` : ""}.`,
        `Costo mensual: ${cop(c.costo_mensual_base)} × (1 + ${pct(c.recargo)}) = ${cop(c.costo_mensual_total)}.`,
        `Tiempo pagado no trabajado y su mayor valor prestacional: × ${red(c.factor_tiempo)}.`,
        `Dividido entre las ${c.divisor} horas pagadas del mes = ${cop(c.costo_hora)} por hora.`,
      ],
    };
  }

  return {
    EXONERABLES, recargoPrestacional, auxilioAplicable, costoHora, costoDia, horasDia,
    factorJornada, herramientaMenor, epp, administracion, ivaSobreUtilidad, explicarCostoHora,
  };
});
