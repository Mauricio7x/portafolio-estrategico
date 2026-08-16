/* lib/adendas.js · Vigía de adendas · lo que el DATASET dice que cambió (Fase 5)
   ─────────────────────────────────────────────────────────────────────────────
   El delta guarda cada reescritura de un proceso y `leerChunksDedup` (con
   `senales`) conserva la foto más vieja y la más nueva: cierre, presupuesto,
   plazo, objeto y modalidad. Aquí esos cambios se traducen a lo único que le
   importa al usuario: «la entidad cambió las reglas» + «le afecta / no le
   afecta», REEVALUANDO las puertas del perfil con los valores viejos y los
   nuevos (misma `evaluarRup` y `evaluarPuertas` del listado: no hay una
   segunda regla). Corre al SERVIR, sin token adicional, sobre datos públicos.
   Solo se enseñan los cambios: sin `_cambios`, `adendas` no viaja. */
"use strict";

const { evaluarRup } = require("./rup.js");
const { evaluarPuertas } = require("./puertas.js");


const cop = (n) => `$${Math.round(Number(n) || 0).toLocaleString("es-CO")}`;
const fechaLeg = (v) => { const s = String(v || "").slice(0, 10); return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s.split("-").reverse().join("/") : String(v || "—"); };

/* Reconstruye la fila «como era antes» a partir de la vigente y la foto vieja. */
function filaAntes(l, cambios) {
  const antes = { ...l };
  for (const c of cambios) {
    if (c.campo === "fecha_cierre") antes.fecha_cierre = c.antes;
    else if (c.campo === "precio_base") { antes.precio_base = c.antes; const n = Number(c.antes); antes.cuantia_cop = Number.isFinite(n) ? n : 0; }
    else if (c.campo === "duracion") antes.duracion = c.antes;
    else if (c.campo === "unidad_de_duracion") antes.unidad_de_duracion = c.antes;
    else if (c.campo === "objeto") antes.nombre_del_procedimiento = c.antes;
    else if (c.campo === "modalidad") antes.modalidad_de_contratacion = c.antes;
  }
  // el plazo lo deriva lib/capacidad.plazoMesesDe(lic) de duracion + unidad al evaluar: nada más que hacer
  return antes;
}

/* {n, cambios:[{campo, etiqueta, antes, despues, afecta, mensaje}], resumen} o null. */
function evaluarAdendas(l, perfilId, { conocimiento = {}, incluirTextoDebil = false } = {}) {
  const cambios = Array.isArray(l && l._cambios) ? l._cambios : [];
  if (!cambios.length) return null;
  let puertasAntes = null, puertasAhora = null;
  try {
    const antes = filaAntes(l, cambios);
    const rupA = evaluarRup(antes, perfilId, conocimiento, { incluirTextoDebil });
    const rupD = evaluarRup(l, perfilId, conocimiento, { incluirTextoDebil });
    puertasAntes = evaluarPuertas(antes, perfilId, { rup: rupA, conocimiento, incluirTextoDebil });
    puertasAhora = evaluarPuertas(l, perfilId, { rup: rupD, conocimiento, incluirTextoDebil });
  } catch { puertasAntes = null; puertasAhora = null; }
  const pasa = (p, k) => !!(p && p[k] && p[k].pasa);
  const salida = [];
  // el plazo se junta en un solo cambio aunque cambien duracion y unidad
  const plazoCambio = cambios.filter((c) => c.campo === "duracion" || c.campo === "unidad_de_duracion");
  for (const c of cambios) {
    let etiqueta, antesTxt, despuesTxt, afecta = false, detalle = "";
    if (c.campo === "fecha_cierre") {
      etiqueta = "Fecha de cierre"; antesTxt = fechaLeg(c.antes); despuesTxt = fechaLeg(c.despues);
      const adelanto = c.antes && c.despues && Date.parse(c.despues) < Date.parse(c.antes);
      afecta = !!adelanto || !c.despues;
      detalle = adelanto ? " Cierra ANTES de lo previsto: revise su calendario." : c.despues ? " Se prorrogó: hay más tiempo, y suele significar que no llegaron ofertas suficientes." : " Ya no hay fecha de cierre publicada.";
    } else if (c.campo === "precio_base") {
      etiqueta = "Presupuesto oficial"; antesTxt = cop(c.antes); despuesTxt = cop(c.despues);
      const kAntes = pasa(puertasAntes, "p2_k"), kAhora = pasa(puertasAhora, "p2_k"), cAntes = pasa(puertasAntes, "p3_caja"), cAhora = pasa(puertasAhora, "p3_caja");
      if (puertasAntes && puertasAhora) {
        if (kAntes && !kAhora) { afecta = true; detalle += " Con el nuevo valor su capacidad de contratación ya no alcanza."; }
        if (cAntes && !cAhora) { afecta = true; detalle += " Con el nuevo valor su caja ya no cubre lo que habría que financiar."; }
        if (!kAntes && kAhora) { afecta = true; detalle += " Ahora sí le alcanza la capacidad de contratación."; }
        if (!cAntes && cAhora) { afecta = true; detalle += " Ahora sí le alcanza la caja."; }
        if (!afecta) detalle = " Sus requisitos siguen igual.";
      }
    } else if (c.campo === "duracion" || c.campo === "unidad_de_duracion") {
      if (c !== plazoCambio[0]) continue; // se reporta una sola vez
      etiqueta = "Plazo de ejecución";
      const a = cambios.find((x) => x.campo === "duracion"), u = cambios.find((x) => x.campo === "unidad_de_duracion");
      antesTxt = `${a ? a.antes : l.duracion} ${u ? u.antes : l.unidad_de_duracion || ""}`.trim(); despuesTxt = `${a ? a.despues : l.duracion} ${u ? u.despues : l.unidad_de_duracion || ""}`.trim();
      const kAntes = pasa(puertasAntes, "p2_k"), kAhora = pasa(puertasAhora, "p2_k");
      if (puertasAntes && puertasAhora && kAntes !== kAhora) { afecta = true; detalle = kAhora ? " Con el nuevo plazo sí le alcanza la capacidad." : " Con el nuevo plazo la capacidad de contratación ya no alcanza."; }
      else detalle = " No le afecta.";
    } else if (c.campo === "objeto") {
      etiqueta = "Objeto del proceso"; antesTxt = String(c.antes || "").slice(0, 120); despuesTxt = String(c.despues || "").slice(0, 120);
      const rA = pasa(puertasAntes, "p1_rup"), rD = pasa(puertasAhora, "p1_rup");
      if (puertasAntes && puertasAhora && rA !== rD) { afecta = true; detalle = rD ? " Con el nuevo objeto su RUP sí encaja." : " Con el nuevo objeto su RUP ya no encaja."; }
      else detalle = " Su encaje no cambia, pero léalo: puede haber cambiado el alcance.";
    } else if (c.campo === "modalidad") {
      etiqueta = "Cómo lo adjudican"; antesTxt = String(c.antes || "—"); despuesTxt = String(c.despues || "—"); afecta = true;
      detalle = " Cambian las reglas del concurso: revise el pliego.";
    } else continue;
    salida.push({ campo: c.campo, etiqueta, antes: c.antes, despues: c.despues, afecta, mensaje: `${etiqueta}: pasó de ${antesTxt} a ${despuesTxt}.${detalle}` });
  }
  if (!salida.length) return null;
  const pasaTodasAntes = !!(puertasAntes && puertasAntes.pasa_todas), pasaTodasAhora = !!(puertasAhora && puertasAhora.pasa_todas);
  return {
    n: salida.length, cambios: salida,
    le_afecta: salida.some((c) => c.afecta),
    cumplia_antes: puertasAntes ? pasaTodasAntes : null, cumple_ahora: puertasAhora ? pasaTodasAhora : null,
    resumen: "La entidad cambió las reglas de este proceso." + (puertasAntes && puertasAhora && pasaTodasAntes && !pasaTodasAhora ? " Usted ya no cumple." : puertasAntes && puertasAhora && !pasaTodasAntes && pasaTodasAhora ? " Ahora sí cumple." : salida.some((c) => c.afecta) ? " Hay algo que le afecta." : " No le afecta."),
    fuente: "Versiones del proceso en SECOP II (dataset p6dx-8zbt): comparación entre la primera y la última publicación sincronizadas.",
  };
}

module.exports = { evaluarAdendas, filaAntes };
