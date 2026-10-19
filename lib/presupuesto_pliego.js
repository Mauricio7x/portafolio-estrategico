/* lib/presupuesto_pliego.js · El presupuesto que DICE el pliego (17-oct-2026, Fase 2)
   ─────────────────────────────────────────────────────────────────────────
   Para AVISAR cuando SECOP II y el pliego no coinciden, nunca para reemplazar en silencio la
   cifra con que se calculan la K, el capital de trabajo o la experiencia (decisión del dueño,
   17-oct-2026). El caso que lo motivó: Santa Elena (Cali), donde SECOP mostraba el valor del
   borrador ($1.744.426.146) y el pliego definitivo decía $1.581.425.810.

   Se lee la sección «1.1. OBJETO, PRESUPUESTO OFICIAL, PLAZO Y UBICACIÓN» del documento tipo (la
   que está sola en su línea, no la del índice). Al pasar el PDF a texto las columnas de esa tabla
   se ENTRELAZAN, así que:
     · presupuesto: las cifras «$ 1.234.567.890(,12)» de la sección; si hay DOS distintas, null
       (no se escoge). El formato inglés «993,687,600.00» también se lee.
     · el PLAZO NO se lee aquí: medido en 9 pliegos reales, en CO1.REQ.10955924 la única cifra
       pegada a su unidad era la vigencia («seis (6) meses más») y el plazo real, 75 días, quedaba
       partido entre columnas. Leerlo exige las coordenadas de pdf.js (otro cambio).
   «Sin dato» ≠ «cero»: lo que no se lee es null con su motivo. */
"use strict";

/* «1.1.OBJETO» sin espacio también (Manizales, CO1.REQ.10287523: revisión adversaria, 17-oct-2026) */
/* …y sin número (el título numerado automáticamente no deja el «1.1» en el texto: Sucre, La Jagua, Arauca, Oporapa,
   CO1.REQ.11092753 · 11215571 · 11191342 · 11175317) y con «PLAZO, UBICACIÓN Y ESPECIFICACIONES…» (Paicol, CO1.REQ.11151463;
   ronda 5 de detekta-lector, 17-oct-2026). La línea del índice no casa: termina en puntos de guía y número de página. */
const TITULO_RE = /^[ \t]*(?:1\.1\.?[ \t]*)?OBJETO,?[ \t]+PRESUPUESTO[ \t]+OFICIAL,?[ \t]+PLAZO,?[ \t]+(?:Y[ \t]+)?UBICACI[ÓO]N(?:,?[ \t]+Y[ \t]+ESPECIFICACIONES(?:[ \t]+[A-ZÁÉÍÓÚÑ \t]*)?)?[ \t]*$/im;
/* el fin: el 1.2, o —sin número— el título que sigue en el documento tipo («DOCUMENTOS DEL PROCESO»); sin fin hallado,
   la sección iba hasta 4.000 caracteres y alcanzaba el valor del certificado de disponibilidad presupuestal */
const FIN_RE = /^[ \t]*1\.2\.?[ \t]*[A-ZÁÉÍÓÚÑ]|^[ \t]*(?:DOCUMENTOS[ \t]+DEL[ \t]+PROCESO|COMUNICACIONES[ \t]+Y[ \t]+OBSERVACIONES|CLASIFICADOR[ \t]+DE[ \t]+BIENES|RECURSOS[ \t]+QUE[ \t]+RESPALDAN)\b/m;
const LARGO_SECCION = 4000;
/* tres formas reales: «$ 1.076.606.477,00»; la cifra que cierra paréntesis con el «( $» en otra línea por las columnas
   entrelazadas («M/CTE ( $ / … / 1.581.425.810)», Santa Elena definitivo); y el formato inglés con centavos, con o sin «$»
   («993,687,600.00», Caldas CO1.REQ.10710451). Los centavos también con PUNTO tras los miles con punto
   («($685.335.300.87)», Mariquita CO1.REQ.11169004): un grupo de dos cifras al final solo puede ser de centavos. Y ni un
   dígito ni «,d»/«.d» detrás: «$1.581.425.810,0» retrocedía y leía «1.581.425,81», mil veces menos (revisión adversaria) */
const DINERO_RE = /\$\s*\(?\s*(\d{1,3}(?:\.\d{3}){2,})(?:[,.](\d{2}))?(?!\d|[.,]\d)|\$?\s*\(?\s*(\d{1,3}(?:,\d{3}){2,})\.(\d{2})(?!\d|[.,]\d)|(?<![\d.,$])(\d{1,3}(?:\.\d{3}){2,})(?:[,.](\d{2}))?\s*\)/g;

function paginaEn(texto, pos) {
  let p = null;
  const re = /^[ \t]*\f(\d+)[ \t]*$/gm;
  let m;
  while ((m = re.exec(texto)) && m.index <= pos) p = Number(m[1]);
  return p;
}
const plano = (s) => String(s || "").replace(/\s+/g, " ").trim();

function seccion(texto) {
  const t = String(texto || "");
  const m = TITULO_RE.exec(t);
  if (!m) return null;
  const ini = m.index + m[0].length;
  let cuerpo = t.slice(ini, ini + LARGO_SECCION);
  /* SIN título de cierre no hay sección: una adenda que solo NOMBRA el numeral 1.1 en su línea y trae más abajo otra cifra
     («capital de trabajo ≥ $ 400.000.000») bajaba el techo de Precios (revisión adversaria, 17-oct-2026). Medido: los 30
     pliegos reales con la tabla (Fase 0, Santa Elena, rondas 5 y 6) encuentran su cierre */
  const f = FIN_RE.exec(cuerpo);
  if (!f) return null;
  cuerpo = cuerpo.slice(0, f.index);
  // sin los marcadores de página para leer, pero con la posición para citar la página
  return { ini, cuerpo };
}

function leerPresupuesto(t, s) {
  const valores = new Map();
  DINERO_RE.lastIndex = 0;
  let m;
  while ((m = DINERO_RE.exec(s.cuerpo))) {
    const entero = m[1] ? m[1].replace(/\./g, "") : m[3] ? m[3].replace(/,/g, "") : m[5].replace(/\./g, "");
    const cent = m[1] ? m[2] : m[3] ? m[4] : m[6];
    const v = Number(entero) + (cent && Number(cent) ? Number(cent) / 100 : 0);
    if (!(v >= 1000000)) continue;               // un monto de obra, no un número suelto
    if (!valores.has(v)) valores.set(v, m);
  }
  if (!valores.size) return { valor: null, motivo: "la sección 1.1 no trae una cifra en pesos legible" };
  if (valores.size > 1) return { valor: null, motivo: `la sección 1.1 trae ${valores.size} cifras distintas`, leidas: [...valores.keys()] };
  const [[valor, mm]] = [...valores];
  return { valor, pagina: paginaEn(t, s.ini + mm.index), cita: plano(mm[0]) };
}

function leerPresupuestoDelPliego(texto) {
  const s = seccion(texto);
  if (!s) return null;
  return { presupuesto: leerPresupuesto(String(texto), s) };
}

module.exports = { leerPresupuestoDelPliego, TITULO_RE };
