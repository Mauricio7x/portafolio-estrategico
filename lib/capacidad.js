/* ============================================================================
   lib/capacidad · K de contratación (capacidad residual) — FÓRMULA ÚNICA
   ----------------------------------------------------------------------------
   Única implementación del cálculo de capacidad para TODA la app: tanto la
   sincronización (api/sync.js, que es el "cron" de Vercel) como la consulta
   (api/oportunidades.js) llegan aquí a través de lib/rup.js. La discrepancia
   histórica web-vs-cron (CO sin multiplicador, escalas CT distintas, SCE
   fijado en 0) desapareció por construcción: no hay segunda fórmula.

   Guía CCE-EICP-GI-22 v01 (29-sep-2023, capacidad residual), releída al pie
   de la letra el 25-sep-2026 (docs/PROPONENTE_PLURAL.md, apartado 2.4):
     CRP = CO × (E + CT + CF) / 100 − SCE
       CO  = mayor ingreso operacional de los últimos cinco años (num. 9.1,
             Tabla 3). El RUP no lo reporta (perfil.ingresoOp=null) → se ESTIMA
             utilidadOp × 16.7 (margen obra ≈ 6 %); la estimación se advierte y
             viaja a la UI como co_estimado. PISO: si es menor que USD 125.000
             (a la tasa del umbral Mipyme), la CO ES USD 125.000.
       E   = factor de experiencia (num. 9.2, Tabla 4): VALOR TOTAL de los
             contratos inscritos en el segmento 72 ÷ (presupuesto × % de
             participación del integrante; 100 % si va solo)
             → >10: 120 · >6: 100 · >3: 80 · >0: 60
       CT  = capacidad técnica (socios + profesionales, Tabla 6)
             → ≥11: 40 · 6-10: 30 · 1-5: 20 · 0: 0
       CF  = capacidad financiera (índice de liquidez, Tabla 5)
             → ≥1,51 o indeterminada: 40 · 1,01-1,50: 35 · 0,76-1,00: 30 ·
               0,51-0,75: 25 · 0-0,50: 20
       SCE = saldos de contratos en ejecución: saldo × % participación ×
             meses restantes / plazo (meses restantes con tope 12). Sin datos
             → 0, con advertencia en logs (una vez por perfil).

   HASTA EL 25-sep-2026 LAS TRES ESCALAS ESTABAN MAL, y en las dos direcciones:
   E salía del MAYOR contrato frente al presupuesto entero, con 120 puntos para
   una razón de 3 (la Guía da 60); una liquidez de 0,9 daba 0 (la Guía, 30) y
   una de 1,5 daba 40 (la Guía, 35). Reproducido con el ejemplo oficial de la
   Guía (Consorcio AB, num. 12): 17.340.000.000 exactos, y hay prueba.

   Proponente plural (perfil con `integrantes`): la capacidad residual es la
   SUMA de las CRP de los integrantes, «sin tener en cuenta el porcentaje de
   participación» (num. 11) — cada una con SUS indicadores, SU SCE y su E
   medida contra el presupuesto × SU participación. «En caso de ser negativa la
   Capacidad Residual de uno de los miembros, este valor se restará»: la de un
   integrante NO se recorta a cero antes de sumar. Los indicadores del perfil
   del consorcio (lib/perfiles.derivarPlural) son para los requisitos
   habilitantes, NO para esta suma.

   Carga del proceso (art. 2.2.1.1.1.6.4, D. 1082/2015):
     CRPC = Presupuesto − Anticipo; si el plazo > 12 meses, × 12 / plazo.
   ========================================================================== */
"use strict";

const { SMMLV, UMBRAL_MIPYME_COP, truncar2 } = require("./perfiles.js");

/* El piso de la capacidad de organización (Guía, Tabla 3): USD 125.000
   «liquidados a la tasa de cambio determinada por el Ministerio de Comercio,
   Industria y Turismo cada 2 años para efectos del umbral del beneficio de las
   Mipyme» — es decir, EXACTAMENTE el umbral Mipyme, que ya vive en lib/perfiles. */
const PISO_CO_COP = UMBRAL_MIPYME_COP;

const MARGIN_MULTIPLIER = 16.7; // ingreso ≈ utilidad operacional / 6 % de margen

/* Advertencias de datos faltantes: una vez por perfil, no una por fila. */
const _advertidos = new Set();
function advertir(clave, msg) {
  if (_advertidos.has(clave)) return;
  _advertidos.add(clave);
  console.warn(`[capacidad] ${msg}`);
}

/* ---------- factores de la Guía CCE-EICP-GI-22 ---------- */
/* Tabla 5. La liquidez se lee TRUNCADA a dos decimales, como la publica el
   RUP: los rangos de la tabla saltan de 0,50 a 0,51 y de 1,50 a 1,51, y un
   1,505 sin truncar no cabría en ninguno. Indeterminada (pasivo corriente
   cero, `Infinity`) → el máximo, como manda la Guía. */
function factorCF(liquidez) {
  if (liquidez === Infinity) return 40;
  // la ausencia se descarta ANTES de truncar: `truncar2(null)` es 0 (Number(null) === 0)
  if (liquidez == null || liquidez === "") return null;
  const l = truncar2(liquidez);
  if (l == null) return null;
  if (l >= 1.51) return 40;
  if (l >= 1.01) return 35;
  if (l >= 0.76) return 30;
  if (l >= 0.51) return 25;
  return 20;
}
function factorCT(profesionales) {
  if (profesionales >= 11) return 40;
  if (profesionales >= 6) return 30;
  if (profesionales >= 1) return 20;
  return 0;
}
/* Tabla 4, con la razón del num. 9.2: experiencia del segmento 72 ÷
   (presupuesto × participación). La razón EXACTA decide (una cifra redondeada
   para mostrar no decide). Una razón 0 —nada inscrito en el segmento 72— no
   está en la tabla, que empieza en «mayor a 0»: da 0 puntos. */
function factorE(expSMMLV, presupuestoSMMLV, participacion = 1) {
  if (!presupuestoSMMLV) return 120; // sin presupuesto no hay ratio que exigir (las puertas lo marcan sin dato)
  const r = expSMMLV / (presupuestoSMMLV * participacion);
  if (r > 10) return 120;
  if (r > 6) return 100;
  if (r > 3) return 80;
  if (r > 0) return 60;
  return 0;
}

/* SCE desde la lista de contratos en ejecución del perfil. Sin datos → 0
   con advertencia (la capacidad queda optimista y hay que saberlo). */
function calcSCE(sceList, perfilId) {
  if (!sceList || !sceList.length) {
    advertir(`sce:${perfilId}`, `SCE de "${perfilId}" sin contratos en ejecución registrados: se asume 0 (capacidad posiblemente optimista)`);
    return 0;
  }
  let total = 0;
  for (const c of sceList) {
    if (!c.obra) continue; // solo obra compromete capacidad residual de obra
    const saldo = (c.v || 0) * ((c.pct || 100) / 100);
    const meses = Math.min(c.restanMeses || 0, 12); // tope 12 meses
    total += (c.plazoMeses ? saldo * meses / c.plazoMeses : saldo);
  }
  return total;
}

/* CO del perfil: ingreso operacional real si existe; si no, estimación
   documentada (marcada en logs y expuesta a la UI vía coEstimado). En los dos
   casos con el PISO de la Guía (Tabla 3). */
function coDe(perfil) {
  const co = coSinPiso(perfil);
  return co == null ? null : Math.max(co, PISO_CO_COP);
}
function coSinPiso(perfil) {
  if (perfil.ingresoOp != null && perfil.ingresoOp !== "") {
    // el mismo filtro que la utilidad: un ingreso ilegible no es una CO (daría NaN o el piso de la nada)
    return Number.isFinite(Number(perfil.ingresoOp)) ? Number(perfil.ingresoOp) : null;
  }
  /* SIN utilidad ni ingreso operacional la CO no existe: se devuelve `null`
     («sin dato»), jamás 0. Un 0 daría K = 0 y cerraría la puerta de capacidad
     a un perfil aproximado (puerta de entrada, Fase 2) por ignorancia, que es
     exactamente lo que la regla de faltantes prohíbe. */
  if (perfil.utilidadOp == null || !Number.isFinite(Number(perfil.utilidadOp))) return null;
  advertir(`co:${perfil.id}`, `CO de "${perfil.id}" estimado como utilidadOp × ${MARGIN_MULTIPLIER} (el RUP no reporta ingreso operacional)`);
  return Math.round(perfil.utilidadOp * MARGIN_MULTIPLIER);
}
function coEstimado(perfil) {
  if (perfil.integrantes) return perfil.integrantes.some((i) => coEstimado(i.perfil));
  return perfil.ingresoOp == null;
}

/* La experiencia que mide E: el valor TOTAL de los contratos del segmento 72,
   cada uno por su porcentaje (Guía, num. 9.2). SIN ese total NO HAY E, y la K
   queda «sin dato» —P2 deja pasar y dice qué falta—. Se probó medirla con el
   mayor contrato (25-sep-2026) y la revisión adversaria lo tumbó con dos
   reproducciones: con las escalas de la Guía, pensadas para el TOTAL, un mayor
   contrato de 2.500 salarios cerraba por capacidad un proceso de 1.500 que el
   total real (12.000) abría —el falso negativo que la casa prohíbe—, y uno de
   10.000 al 10 % la inflaba, porque el mayor contrato va al 100 % y puede no
   ser del segmento 72. No es una cota de nada: es otro dato. Hoy lo traen los
   cuatro perfiles fijos y el esquema de carga; `lib/rup_pdf` aún no lo calcula
   (pendiente en docs/MEMORIA.md). */
function experienciaParaE(perfil) {
  const v = perfil.expSeg72SMMLV;
  if (v == null || v === "" || !Number.isFinite(Number(v))) return { smmlv: null, fuente: null };
  return { smmlv: Number(v), fuente: "segmento_72" };
}

/* QUÉ FALTA para calcular la K, con el mismo criterio con que `detalleCrp`
   decide que no se puede: una sola lista, para que el mensaje de la puerta P2
   no nombre como ausente lo que está (la liquidez indeterminada es un dato) ni
   calle lo que falta. En un plural, lo que le falte a cualquiera. */
function faltantesK(perfil) {
  if (perfil.integrantes) return [...new Set(perfil.integrantes.flatMap((i) => faltantesK(i.perfil)))];
  const sinDato = (v) => v == null || v === "" || !Number.isFinite(Number(v));
  const f = [];
  if (coSinPiso(perfil) == null) f.push("co");
  if (perfil.liquidez !== Infinity && sinDato(perfil.liquidez)) f.push("liquidez");
  if (experienciaParaE(perfil).smmlv == null) f.push("experiencia_segmento72");
  if (sinDato(perfil.profesionales)) f.push("profesionales");
  return f;
}

/* ---------- CRP: capacidad residual del proponente ---------- */
/* El DESGLOSE de la fórmula, por integrante. `crp` es su total; la vista y el
   recomendador de reparto leen los factores de aquí, no de otra cuenta. */
function detalleCrp(perfil, presupuestoCOP, participacion = 1) {
  if (perfil.integrantes) {
    const integrantes = perfil.integrantes.map((i) => ({ perfilId: i.perfilId || (i.perfil && i.perfil.id) || null, nombre: i.perfil.nombre, participacion: i.participacion, ...detalleCrp(i.perfil, presupuestoCOP, i.participacion) }));
    // si a alguno le falta un insumo, la suma tampoco se conoce (null, no «la de los otros»)
    const k = integrantes.some((x) => x.k == null) ? null : integrantes.reduce((a, x) => a + x.k, 0);
    return { k, integrantes };
  }
  // K sin dato: la puerta P2 lo declara y deja pasar, nombrando lo que falta
  const faltan = faltantesK(perfil);
  if (faltan.length) return { k: null, falta: faltan };
  const co = coDe(perfil);
  /* ⚠️ LA REGLA DE FALTANTES VALE PARA LOS TRES INDICADORES, NO SOLO PARA LA CO
     (27-ago-2026). `null >= 1` es false y `null / x` es 0, así que una liquidez
     ausente caía al factor 0 y una experiencia ausente al peor escalón (60): la
     K se recortaba hasta un 35 % EN SILENCIO y P2 podía cerrar por ignorancia —
     exactamente lo que la regla de faltantes prohíbe. Un perfil de PDF con
     patrimonio legible y la línea de liquidez ilegible entra aquí (`rup_pdf`
     produce null y `validarPerfilDinamico` en modo aproximado lo acepta). La
     ausencia se descarta ANTES de convertir; un 0 REAL (liquidez 0, cero
     profesionales declarados) sí es un dato y conserva su factor. */
  // (la liquidez INDETERMINADA, `Infinity`, es un dato y no una ausencia: faltantesK no la cuenta)
  const exp = experienciaParaE(perfil);
  const presupuestoSMMLV = (presupuestoCOP || 0) / SMMLV;
  const e = factorE(exp.smmlv, presupuestoSMMLV, participacion);
  const ct = factorCT(perfil.profesionales);
  const cf = factorCF(perfil.liquidez);
  const sce = calcSCE(perfil.sce, perfil.id);
  const coBruta = coSinPiso(perfil);
  return {
    // la de un integrante puede ser NEGATIVA: en el plural se resta (Guía, num. 11)
    k: co * (e + ct + cf) / 100 - sce,
    co, co_estimada: perfil.ingresoOp == null, co_en_piso: coBruta < PISO_CO_COP,
    e, experiencia_smmlv: exp.smmlv, experiencia_fuente: exp.fuente,
    razon_e: presupuestoSMMLV > 0 ? exp.smmlv / (presupuestoSMMLV * participacion) : null,
    ct, cf, sce,
  };
}
/* La K que decide. Un total negativo (el SCE se come la capacidad) se muestra
   como 0: frente a un proceso con presupuesto las dos cierran la puerta igual,
   y «le quedan menos de cero pesos» no es una cifra que se pueda facturar. */
function crp(perfil, presupuestoCOP) {
  const { k } = detalleCrp(perfil, presupuestoCOP);
  return k == null ? null : Math.max(k, 0);
}

/* ---------- CRPC: carga real del proceso (D. 1082/2015) ---------- */
function calcCRPC(presupuestoCOP, anticipoPct, plazoMeses) {
  const base = presupuestoCOP - presupuestoCOP * (anticipoPct || 0) / 100;
  if (!plazoMeses || plazoMeses <= 12) return base; // plazo corto: directo
  return base * 12 / plazoMeses;
}

/* Plazo en meses desde duracion + unidad_de_duracion (acentos normalizados —
   el bug histórico: "Días".includes("dia") era false por la í). Default 12. */
function plazoMesesDe(lic) {
  const n = parseFloat(lic.duracion);
  if (isNaN(n) || n <= 0) return 12;
  const u = String(lic.unidad_de_duracion || "meses")
    .normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  if (u.includes("dia")) return n / 30;
  if (u.includes("seman")) return n / 4.33;
  if (u.includes("hora")) return n / 720;
  if (u.includes("an")) return n * 12; // años
  return n; // meses
}

module.exports = {
  MARGIN_MULTIPLIER, PISO_CO_COP,
  crp, detalleCrp, faltantesK, calcCRPC, plazoMesesDe,
  factorCF, factorCT, factorE, calcSCE, coDe, coEstimado, experienciaParaE,
};
