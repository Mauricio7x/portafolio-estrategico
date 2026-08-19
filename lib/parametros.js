/* lib/parametros.js · Parámetros normativos del costo real, VERSIONADOS (Fase 1)
   ─────────────────────────────────────────────────────────────────────────────
   Los porcentajes de nómina, la jornada legal, la ARL, el TPNL/MVP y los
   costos indirectos NO viven en el código: viven en `apu:parametros`
   (Upstash), se editan desde «Mi empresa → Sistema» y cada guardado deja una
   copia en `apu:parametros:v:{vigencia}`. Aquí están:
   · DEFAULTS — los valores de arranque del encargo (§6.1.2), con su norma.
   · VERIFICACION — para CADA parámetro, si está contrastado con la fuente
     original o es «referencia sectorial, pendiente de contraste». El
     contraste con el IDU (Base de Precios de Referencia y guía GU-DP-017) y
     el INVIAS (APU Regionalizados 2026-1) se hizo el 16-ago-2026 (docs/
     metodologia.md §7): el divisor de 210 h, la herramienta menor del 5 % y
     el auxilio de transporte pasaron a «verificado»; TPNL/MVP/EPP siguen en
     «referencia» porque NINGUNA de las dos entidades publica esos
     porcentajes — y no se «completan» a verificado sin fuente.
   · validar / leer / guardar / historial — con Redis caído se sirven los
     DEFAULTS y la respuesta LO DICE (`fuente: "defaults"`): quedarse sin
     parámetros dejaría el editor mudo, y servirlos sin decir de dónde salen
     sería la mentira de siempre.
   · paraMotor — lo ÚNICO que el motor del catálogo necesita: el factor de
     jornada y el % de EPP. El catálogo cotiza por día y no divide por
     ninguna jornada; ver docs/metodologia.md §1.

   Regla: un parámetro ausente no se rellena por su cuenta. `validar` exige
   los campos completos y `paraMotor` lanza si falta lo que necesita. */

const CLAVE = "apu:parametros";
const CLAVE_VERSION = (vigencia) => `apu:parametros:v:${vigencia}`;
const PATRON_VERSIONES = "apu:parametros:v:*";

const DEFAULTS = Object.freeze({
  vigencia: "2026-07-15",                 // Ley 2101 de 2021: 42 h desde esta fecha

  smmlv: 1750905,                         // D. 159/2026 (transitorio tras la suspensión del D. 1469/2025; editable)
  auxilioTransporte: 249095,              // aplica si salario ≤ 2 SMMLV

  divisorAPU: 210,                        // horas PAGADAS al mes (42 h × 5 semanas)
  jornadaLegalMes: 210,                   // Ley 2101 de 2021, desde 15-jul-2026
  horasSemanaVigente: 42,                 // Ley 2101 de 2021, art. 2 (escalón final)
  horasSemanaCalibracion: 44,             // régimen bajo el que se calibró el catálogo (Nogal, Bogotá 2025)
  diasLaboradosSemana: 6,                 // solo para traducir hora ↔ día en el CONTRASTE; el motor no lo usa

  prestaciones: Object.freeze({
    cesantias: 0.08333,                   // CST art. 249
    interesesCesantias: 0.01000,          // Ley 50 de 1990 art. 99
    prima: 0.08333,                       // CST art. 306
    vacaciones: 0.04167,                  // CST art. 186
    salud: 0.08500,                       // Ley 100/1993 art. 204 mod. Ley 1122/2007 art. 10 (8,5 % empleador)
    pension: 0.12000,                     // Ley 100/1993 art. 20 mod. Ley 797/2003 art. 7 (12 % empleador)
    cajaCompensacion: 0.04000,            // Ley 21/1982
    sena: 0.02000,                        // Ley 21/1982 — exonerable (E.T. 114-1)
    icbf: 0.03000,                        // Ley 27/1974 y Ley 89/1988 — exonerable (E.T. 114-1)
  }),
  exoneracionParafiscales: true,          // E.T. art. 114-1: salud + SENA + ICBF, salario < 10 SMMLV

  arl: Object.freeze({
    clase: "V",                           // obra civil pesada = V; edificación = IV (D. 1072/2015 art. 2.2.4.3.5)
    tarifas: Object.freeze({ I: 0.00522, II: 0.01044, III: 0.02436, IV: 0.04350, V: 0.06960 }), // D.-L. 1295/1994 art. 27
  }),

  tpnl: 0.225,                            // tiempo pagado no laborado (26,67 % IDU − 4,17 % vacaciones ya contadas)
  mvp: 0.1472,                            // mayor valor prestacional sobre el TPNL (17,45 % × 22,5/26,67)

  herramientaMenor: 0.05,                 // % sobre MANO DE OBRA (INVIAS)
  epp: 0.03,                              // % sobre MANO DE OBRA

  ivaSobreUtilidad: 0.19,                 // solo sobre la utilidad (D. 1372/1992 art. 3; hoy D. 1625/2016)
});

/* Estado de verificación por parámetro. «verificado» = contrastado con la
   fuente primaria; «referencia» = tomado de metodologías públicas del sector
   recopiladas de fuentes secundarias y NO encontrado en la fuente primaria
   al contrastar (16-ago-2026). La etiqueta se PUBLICA junto al valor (API,
   pantalla y docs/metodologia.md). */
const VERIFICACION = Object.freeze({
  smmlv: { estado: "verificado", fuente: "$1.750.905: Decreto 1469/2025 suspendido provisionalmente por el Consejo de Estado (auto 12-feb-2026, ratificado 14-abr-2026); rige TRANSITORIAMENTE por el Decreto 159 de 2026 (19-feb-2026) hasta la sentencia de fondo. Contrastado 16-ago-2026" },
  auxilioTransporte: { estado: "verificado", fuente: "Decreto 1470 de 2025 art. 1: $249.095 desde el 1-ene-2026 para quienes devengan hasta 2 SMMLV (texto del decreto leído el 16-ago-2026)" },
  divisorAPU: { estado: "verificado", fuente: "IDU, Base de Precios de Referencia (Visor 2024-I Fase II): tarifa hora = jornal ÷ (horas semana ÷ 6) y jornal = mes ÷ 30 → 30 días × 7 h = 210 h con la jornada de 42 h (230 con 46 h, 220 con 44 h; reproducido con sus tarifas publicadas: 71.580 ≈ 2.147.411/30 y 9.337 ≈ 71.580/7,667). INVIAS APU Regionalizados 2026-1 (Hoja de cálculos: 42 h → 7 h/día; jornal = salario/30). Contrastado 16-ago-2026" },
  jornadaLegalMes: { estado: "verificado", fuente: "Ley 2101/2021 art. 2: 42 h/semana desde el 15-jul-2026" },
  horasSemanaVigente: { estado: "verificado", fuente: "Ley 2101/2021 art. 2" },
  horasSemanaCalibracion: { estado: "supuesto", fuente: "el contrato Nogal es de 2025 sin fecha exacta en el catálogo: 44 h si es posterior al 15-jul-2025, 46 h si es anterior — se toma 44 y se declara" },
  diasLaboradosSemana: { estado: "supuesto", fuente: "convención de obra (lunes a sábado); solo se usa para el contraste hora↔día" },
  prestaciones: { estado: "verificado", fuente: "CST arts. 186/249/306, Ley 50/1990 art. 99, Ley 100/1993 (mod. Ley 1122/2007 y Ley 797/2003), Ley 21/1982, Ley 27/1974 + Ley 89/1988. Contraste IDU GU-DP-017 v3 (2024), tabla 3: 45,10 % (2–10 SMMLV, exonerado) y 58,90 % (>10 SMMLV) frente al 44,79 % / 58,29 % de este modelo; los 0,3–0,6 pp de diferencia son la dotación, que aquí queda fuera y se declara" },
  exoneracionParafiscales: { estado: "verificado", fuente: "Estatuto Tributario art. 114-1 (personas jurídicas y naturales con ≥ 2 trabajadores)" },
  arl: { estado: "verificado", fuente: "Decreto-Ley 1295/1994 art. 27; tabla de actividades Decreto 768/2022; clase por centro de trabajo D. 1072/2015 art. 2.2.4.3.5" },
  tpnl: { estado: "referencia", fuente: "26,67 % − vacaciones 4,17 % (ya contadas), de fuentes secundarias. Contrastado el 16-ago-2026 contra el IDU y el INVIAS y NO aparece en ninguno: la BPR del IDU publica hora = mes con factor ÷ (30 × h/día) sin este recargo, y la guía GU-DP-017 v3 (2024) tampoco lo trae; INVIAS APU 2026-1 aplica al obrero un factor prestacional GLOBAL de 2,04 sobre el salario (≈ nuestro recargo × 1,23) que no desglosa. Solo afecta al ejemplo público de costo-hora, no al precio; editable" },
  mvp: { estado: "referencia", fuente: "17,45 % × (22,5/26,67), de fuentes secundarias; sin fuente IDU/INVIAS (contrastado 16-ago-2026). Ojo: el costo-hora del ejemplo con TPNL solo (sin MVP) reproduce el jornal INVIAS 2026-1 del obrero al ±1 %; con MVP encima queda ~11 % por encima. Solo afecta al ejemplo público, no al precio; editable" },
  herramientaMenor: { estado: "verificado", fuente: "INVIAS, APU Regionalizados de Referencia 2026-1 (Territorio_APU_2026_1.xlsx): en todos los APU la línea HERMENINV «HERRAMIENTA MENOR (% MANO DE OBRA)» vale 0,05. Contrastado 16-ago-2026" },
  epp: { estado: "referencia", fuente: "práctica sectorial (% sobre mano de obra). Contrastado 16-ago-2026: ni el IDU ni el INVIAS publican un %: el IDU cotiza la dotación como insumos con precio (grupo «DOTACIÓN (EPP) Y EQUIP. Y HERRAM. SEGUR. INDUSTR.») y el INVIAS la absorbe en su factor prestacional global" },
  ivaSobreUtilidad: { estado: "verificado", fuente: "art. 3 D. 1372/1992, hoy art. 1.3.1.7.9 D. 1625/2016 (la Ley 1819/2016 conserva la base)" },
});

const FRACCIONES = ["tpnl", "mvp", "herramientaMenor", "epp", "ivaSobreUtilidad"];
const POSITIVOS = ["smmlv", "divisorAPU", "jornadaLegalMes", "horasSemanaVigente", "horasSemanaCalibracion", "diasLaboradosSemana"];
const CLASES_ARL = ["I", "II", "III", "IV", "V"];

/* La ausencia se descarta ANTES de `Number` (la trampa de siempre: `Number(null)`
   y `Number("")` son 0). Sin esto, un campo en blanco del formulario de
   parámetros se guardaba como 0 % sin un solo error. */
const ausente = (v) => v === null || v === undefined || v === "" || typeof v === "boolean" || Array.isArray(v);
function esFraccion(v) { return !ausente(v) && Number.isFinite(Number(v)) && Number(v) >= 0 && Number(v) < 1; }

/* Valida un objeto de parámetros COMPLETO. Devuelve {ok, errores[], valor}
   con el valor normalizado (números como números). Un campo ausente es
   error: no se completa con el default en silencio — quien guarda tiene que
   mandar todo, y quien lee obtiene todo o los DEFAULTS declarados. */
function validar(cruda) {
  const errores = [];
  const p = cruda && typeof cruda === "object" ? cruda : {};
  const v = {};

  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(p.vigencia || ""))) errores.push("vigencia debe ser una fecha AAAA-MM-DD");
  else v.vigencia = String(p.vigencia);

  for (const k of POSITIVOS) {
    const n = Number(p[k]);
    if (!Number.isFinite(n) || n <= 0) errores.push(`${k} debe ser un número > 0`);
    else v[k] = n;
  }
  const aux = Number(p.auxilioTransporte);
  if (!Number.isFinite(aux) || aux < 0) errores.push("auxilioTransporte debe ser un número ≥ 0"); else v.auxilioTransporte = aux;

  for (const k of FRACCIONES) {
    if (!esFraccion(p[k])) errores.push(`${k} debe ser una fracción entre 0 y 1 (0.05 = 5 %)`);
    else v[k] = Number(p[k]);
  }

  const prest = p.prestaciones && typeof p.prestaciones === "object" ? p.prestaciones : null;
  if (!prest) errores.push("prestaciones debe ser un objeto {id: fracción}");
  else {
    v.prestaciones = {};
    for (const id of Object.keys(DEFAULTS.prestaciones)) {
      if (!esFraccion(prest[id])) errores.push(`prestaciones.${id} debe ser una fracción entre 0 y 1`);
      else v.prestaciones[id] = Number(prest[id]);
    }
    for (const id of Object.keys(prest)) if (!(id in DEFAULTS.prestaciones)) errores.push(`prestaciones.${id} no es un componente conocido`);
  }
  v.exoneracionParafiscales = !!p.exoneracionParafiscales;

  const arl = p.arl && typeof p.arl === "object" ? p.arl : null;
  if (!arl || !CLASES_ARL.includes(String(arl.clase))) errores.push("arl.clase debe ser I, II, III, IV o V");
  const tarifas = arl && arl.tarifas && typeof arl.tarifas === "object" ? arl.tarifas : null;
  if (!tarifas) errores.push("arl.tarifas debe ser un objeto con las cinco clases");
  else {
    v.arl = { clase: String(arl.clase), tarifas: {} };
    for (const c of CLASES_ARL) {
      if (!esFraccion(tarifas[c])) errores.push(`arl.tarifas.${c} debe ser una fracción entre 0 y 1`);
      else v.arl.tarifas[c] = Number(tarifas[c]);
    }
  }
  if (v.divisorAPU && v.jornadaLegalMes && v.divisorAPU !== v.jornadaLegalMes) {
    // no es error: el encargo los separa a propósito (uno divide el APU, el
    // otro la administración por tiempo); se avisa porque en la práctica van juntos
    v._aviso = "divisorAPU y jornadaLegalMes difieren: revise que sea intencional";
  }
  return { ok: errores.length === 0, errores, valor: errores.length ? null : v };
}

/* Lo que el motor del catálogo consume. Publica también las cifras de las
   que sale el factor para que viaje con su origen. */
function paraMotor(p) {
  const C = require("./costos.js");
  const factor = C.factorJornada(p);
  return {
    vigencia: p.vigencia,
    factor_jornada: Math.round(factor * 1e6) / 1e6,
    horas_semana_vigente: Number(p.horasSemanaVigente),
    horas_semana_calibracion: Number(p.horasSemanaCalibracion),
    epp_pct: Number(p.epp),
    herramienta_menor_pct_defecto: Number(p.herramientaMenor),
    jornada_legal_mes: Number(p.jornadaLegalMes),   // para la administración por tiempo (IDU)
  };
}

/* ── Redis ─────────────────────────────────────────────────────────────── */
async function leer(redis) {
  if (!redis) return { parametros: DEFAULTS, fuente: "defaults", error: null };
  let crudo = null;
  try { crudo = await redis.get(CLAVE); } catch (e) {
    return { parametros: DEFAULTS, fuente: "defaults", error: `Redis no respondió: ${e.message}` };
  }
  if (!crudo) return { parametros: DEFAULTS, fuente: "defaults", error: null };
  let obj = null;
  try { obj = typeof crudo === "string" ? JSON.parse(crudo) : crudo; } catch { obj = null; }
  const v = validar(obj && obj.parametros ? obj.parametros : obj);
  if (!v.ok) return { parametros: DEFAULTS, fuente: "defaults", error: `apu:parametros ilegible o incompleto (${v.errores[0]}); se usan los valores de arranque` };
  return { parametros: v.valor, fuente: "redis", guardado_el: obj && obj.guardado_el ? obj.guardado_el : null, error: null };
}

async function guardar(redis, cruda, ahora = new Date()) {
  const v = validar(cruda);
  if (!v.ok) return { ok: false, errores: v.errores };
  const sobre = { parametros: v.valor, guardado_el: ahora.toISOString() };
  const json = JSON.stringify(sobre);
  // primero la versión, después la vigente: si falla a mitad, queda el historial
  // y la vigente anterior sigue sirviendo — nunca una vigente sin su versión
  await redis.set(CLAVE_VERSION(v.valor.vigencia), json);
  await redis.set(CLAVE, json);
  return { ok: true, parametros: v.valor, guardado_el: sobre.guardado_el, version: CLAVE_VERSION(v.valor.vigencia) };
}

async function historial(redis) {
  let claves = [];
  try { claves = await redis.scan(PATRON_VERSIONES); } catch (e) { return { ok: false, error: e.message, versiones: [] }; }
  claves.sort();
  if (!claves.length) return { ok: true, versiones: [] };
  let valores = [];
  try { valores = await redis.mget(claves); } catch (e) { return { ok: false, error: e.message, versiones: [] }; }
  const versiones = claves.map((k, i) => {
    let o = null; try { o = JSON.parse(valores[i]); } catch { o = null; }
    return {
      vigencia: k.slice("apu:parametros:v:".length),
      guardado_el: o && o.guardado_el ? o.guardado_el : null,
      legible: !!(o && o.parametros),
      resumen: o && o.parametros ? {
        smmlv: o.parametros.smmlv, divisorAPU: o.parametros.divisorAPU,
        horasSemanaVigente: o.parametros.horasSemanaVigente, arl: o.parametros.arl && o.parametros.arl.clase,
        exoneracionParafiscales: o.parametros.exoneracionParafiscales,
      } : null,
    };
  });
  return { ok: true, versiones };
}

module.exports = { CLAVE, CLAVE_VERSION, PATRON_VERSIONES, DEFAULTS, VERIFICACION, validar, paraMotor, leer, guardar, historial };
