/* lib/plazo_pliego.js · El plazo de ejecución que DICE el pliego (17-oct-2026, Fase 1 del plazo)
   ─────────────────────────────────────────────────────────────────────────
   SECOP II publica la duración como «0 días» o vacía en 625 de 3.087 filas de licitación de obra de 2026 (p6dx-8zbt,
   conteo por filas del 17-oct-2026); ahí la casilla del capital de trabajo quedaba «sin cálculo». El plazo está en la
   tabla de la sección 1.1 del pliego tipo, pero en el TEXTO sus columnas se entrelazan: leído del texto, en la Fase 0
   dio 15 de 29 y un falso (la vigencia «seis (6) meses más» como plazo). Por eso el navegador manda solo la COLUMNA
   «Plazo» de esa tabla, recortada con las coordenadas de pdf.js (public/pliego.js, columnaPlazoDe), y aquí se interpreta.
   Fase 0 (29 pliegos de desarrollo, verdad doble): 27 correctos, 2 vacíos, 0 falsos. detekta-lector, plazo_fase0_2026-10-17.

   Reglas («sin dato» ≠ «cero»: lo que no se lee es null con su motivo):
     · la cifra con su unidad: «TRES (03) MESES», «(105) DIAS CALENDARIO», «4 meses», «Dos punto cinco meses (2.5)»,
       «UN (1) MES Y QUINCE (15) DIAS» (45 días), «PLAZO TOTAL SIETE (07) MESES» (manda sobre las etapas);
     · la VIGENCIA no es el plazo: una cifra seguida de «más» o «adicionales» no cuenta;
     · dos cifras distintas: null (no se escoge);
     · una fecha («hasta el 31 de diciembre de 2026») se dice, pero NO se convierte en meses: depende del acta de inicio;
     · días sin decir si son calendario o hábiles, de 200 o más: null en meses (200 hábiles ya pasan de nueve meses y la
       fórmula del capital de trabajo cambia a los doce);
     · días HÁBILES: null en meses (120 hábiles son unos 5,5 meses, no 4: dependen de los festivos);
     · plazos por ETAPA o FASE sin el total: null («Etapa I: tres (03) meses Etapa II: tres (03) meses» son 6, no 3);
     · una cifra que sigue a un punto o una coma no es una cifra suelta («1.095 días» no son 95).
   La cita termina en el plazo leído: lo que sigue en la columna suele ser de otras celdas (revisión adversaria). */
"use strict";

const MAX_COLUMNA = 600;
const DIAS_AMBIGUOS = 200;
const plegar = (s) => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, " ").trim();

/* lo que viene del navegador: {texto, pagina}, con tope; cualquier otra cosa es inerte (null) */
function columnaValida(c) {
  if (!c || typeof c !== "object" || typeof c.texto !== "string") return null;
  const texto = c.texto.replace(/\s+/g, " ").trim().slice(0, MAX_COLUMNA);
  if (!texto) return null;
  const pagina = Number.isInteger(c.pagina) && c.pagina > 0 && c.pagina < 100000 ? c.pagina : null;
  return { texto, pagina };
}

/* la cita llega hasta el ÚLTIMO plazo de la columna (cifra con su unidad, o la fecha): lo que sigue son otras celdas o la
   prosa de debajo. Se mide sobre el texto plegado, que conserva la longitud del original en NFC; si no la conserva, el
   tope de antes */
function citaHastaElPlazo(texto) {
  const t = String(texto || "").normalize("NFC");
  const q = t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  if (q.length !== t.length) return t.slice(0, 190);
  let fin = -1;
  for (const m of q.matchAll(/\d\s*\)?\s*(?:[a-z]{1,3}\s+)?(?:mes(?:es)?|dias?)\b(?:\s+(?:calendario|habiles))?|\b(?:mes(?:es)?|dias?)\s*\(\s*\d[\d .,]*\)|31\s*\)?\s*de\s*-?\s*diciembre\s+(?:de\s+|del\s+)?20\d\d/g)) {
    if (/^\s*(?:mas|adicionales)\b/.test(q.slice(m.index + m[0].length, m.index + m[0].length + 14))) continue;
    fin = m.index + m[0].length;
  }
  return fin > 0 ? t.slice(0, Math.min(fin, 240)) : t.slice(0, 190);
}

function leerPlazoDeColumna(columna) {
  const c = columnaValida(columna);
  if (!c) return null;
  let p = plegar(c.texto);
  // cifras partidas por pdf.js dentro del paréntesis: «(0 2 )» → «(02)», «(2 .5 )» → «(2.5)»
  p = p.replace(/\(\s*([\d .,]+?)\s*\)/g, (m, d) => (/^\d[\d .,]*$/.test(d) ? `(${d.replace(/\s+/g, "")})` : m));
  const base = { pagina: c.pagina, cita: citaHastaElPlazo(c.texto) };
  const fecha = /(?:hasta|sin superar|sin exceder|sin pasar de) el (?:[a-z]{1,3} )?(?:treinta y uno )?\(?31\)? de -? ?diciembre (?:de |del )?(20\d\d)/.exec(p);
  const hasta = fecha ? `${fecha[1]}-12-31` : null;
  const calendario = /\bcalendario\b/.test(p) ? "calendario" : /\bhabiles\b/.test(p) ? "habiles" : null;
  const resultado = (valor, unidad) => {
    const tipoDias = unidad === "dias" ? calendario : null;
    const ambiguo = unidad === "dias" && tipoDias !== "calendario" && valor >= DIAS_AMBIGUOS;
    const habiles = unidad === "dias" && tipoDias === "habiles";
    const meses = ambiguo || habiles ? null : unidad === "meses" ? valor : Math.round((valor / 30) * 100) / 100;
    const motivo = ambiguo ? `${valor} días sin decir si son calendario o hábiles` : habiles ? "los días hábiles no se pasan a meses sin el calendario de festivos" : null;
    return { ...base, valor, unidad, tipo_dias: tipoDias, meses, hasta, ...(motivo ? { motivo } : {}) };
  };
  // «plazo total siete (07) meses»: el total manda sobre las etapas
  const total = /plazo total[^0-9]{0,30}\((\d{1,3})\) (mes(?:es)?|dias?)\b/.exec(p);
  if (total) return resultado(Number(total[1]), total[2].startsWith("mes") ? "meses" : "dias");
  const cands = [];
  /* entre la cifra entre paréntesis y la unidad cabe UNA palabra corta de otra columna («(75) la dias»); la cifra suelta no
     puede seguir a un punto o una coma («1.095 días», «1.50 meses») */
  const re = /(?:\(\s*(\d{1,3}(?:[.,]\d)?)\s*\)(?:\s+[a-z]{1,3}(?=\s+(?:mes|dia)))?|(?<![\d.,])\b(\d{1,3}(?:[.,]\d)?))\s*(mes(?:es)?|dias?)\b/g;
  let m;
  while ((m = re.exec(p))) {
    if (/^\s*(?:mas|adicionales)\b/.test(p.slice(m.index + m[0].length, m.index + m[0].length + 14))) continue; // la vigencia
    cands.push({ n: Number((m[1] || m[2]).replace(",", ".")), u: m[3].startsWith("mes") ? "meses" : "dias" });
  }
  /* dos cifras con «etapa» o «fase» y sin el total: cada etapa trae su plazo, y quitar repetidos dejaba 3 meses donde son 6
     (o 8 donde son 16, que cruza los doce meses de la fórmula); también antes de «un (1) mes y quince (15) días» */
  if (/\b(?:etapa|fase)s?\b/.test(p) && cands.filter((x) => x.n > 0).length > 1) return { ...base, valor: null, unidad: null, tipo_dias: null, meses: null, hasta, motivo: "la columna trae plazos por etapa sin el total" };
  // «un (1) mes y quince (15) dias»: 45 días
  const mesY = /\(1\) mes y [a-z ]{0,20}\((\d{1,2})\) dias?\b/.exec(p);
  if (mesY) return resultado(30 + Number(mesY[1]), "dias");
  // «meses (2.5)»: la cifra DESPUÉS de la unidad
  const tras = /\b(mes(?:es)?|dias?) \((\d{1,3}(?:[.,]\d)?)\)/.exec(p);
  if (tras) cands.push({ n: Number(tras[2].replace(",", ".")), u: tras[1].startsWith("mes") ? "meses" : "dias" });
  const distintos = [...new Map(cands.filter((x) => x.n > 0).map((x) => [x.u === "meses" ? x.n * 30 : x.n, x])).values()];
  if (distintos.length === 1) return resultado(distintos[0].n, distintos[0].u);
  if (!distintos.length && hasta) return { ...base, valor: null, unidad: null, tipo_dias: null, meses: null, hasta };
  return { ...base, valor: null, unidad: null, tipo_dias: null, meses: null, hasta, motivo: distintos.length ? `la columna trae ${distintos.length} plazos distintos` : "la columna no trae una cifra de plazo legible" };
}

/* «3 meses», «105 días calendario», «hasta el 31 de diciembre de 2026» */
function plazoLegible(pl) {
  if (!pl) return null;
  const fecha = pl.hasta ? `el ${Number(pl.hasta.slice(8, 10))} de diciembre de ${pl.hasta.slice(0, 4)}` : null;
  if (pl.valor == null) return fecha ? `hasta ${fecha}` : null;
  const n = String(pl.valor).replace(".", ",");
  const u = pl.unidad === "meses" ? (pl.valor === 1 ? "mes" : "meses") : pl.valor === 1 ? "día" : "días";
  return `${n} ${u}${pl.tipo_dias ? ` ${pl.tipo_dias === "habiles" ? "hábiles" : "calendario"}` : ""}${fecha ? `, sin pasar del ${fecha.slice(3)}` : ""}`;
}

module.exports = { leerPlazoDeColumna, columnaValida, plazoLegible, MAX_COLUMNA, DIAS_AMBIGUOS };
