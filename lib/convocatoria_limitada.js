"use strict";
/* ============================================================================
   lib/convocatoria_limitada · ¿La convocatoria quedó limitada a Mipyme, a qué territorio, y hay sorteo?
   ----------------------------------------------------------------------------
   PLAN_X20, tanda 2 (11-nov-2026): las dos barreras de entrada a la menor cuantía. PURO: sin red ni Redis.

   Lo que dice el documento tipo (DocBase de menor cuantía de transporte V3, leído el 11-nov-2026 del paquete
   oficial de Colombia Compra Eficiente):
   · numeral 2.5 «LIMITACIÓN A MIPYME»: la entidad escribe «el presente procedimiento de selección no es
     susceptible de limitarse a Mipyme» o, si procede, que limita la convocatoria; en SECOP II la limitación
     se marca además «en el espacio dispuesto por la plataforma», así que el texto del pliego puede no decirlo;
   · la entidad «podrá definir si es procedente alguna limitación territorial» (Mipyme del departamento o del
     municipio: art. 2.2.1.2.4.2.3 del Decreto 1082 de 2015);
   · numeral 2.4 «AUDIENCIA PÚBLICA DE SORTEO»: «Si la entidad recibe más de diez (10) manifestaciones de interés
     realizará un sorteo a través de […]»; solo se incluye si la entidad optó por continuar con diez.
   Frases reales que este lector reconoce (fichas de detekta-lector, procesos de 2026): «El presente
   procedimiento de selección no es susceptible de limitarse a Mipyme.» y «El presente proceso de selección se
   limitará a Mipyme Territorial Turbaco conforme a las solicitudes recibidas para tal fin.»

   Reglas que no hay que deshacer:
   · una frase dentro de corchetes es instrucción de la plantilla, no lo que decidió la entidad: no cuenta;
   · las reglas generales («en las convocatorias limitadas a Mipyme…», «cuando…», «en caso de que…», «la
     intención de limitar…») no dicen si ESTA convocatoria quedó limitada: no cuentan;
   · lo que no consta es `null` («no consta»), y en oportunidades no bloquea nada (el error caro es esconder);
   · si el mismo documento dice las dos cosas, es «contradictorio» con las dos citas: no se escoge.
   ============================================================================ */

const plegar = (s) => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/* El texto con su página: las líneas «\f<n>» marcan la página (la misma convención de lib/documentos_proceso). Se
   devuelve el texto en una sola tira (las frases de un PDF se parten en renglones) y el mapa offset → página. */
function tiraConPaginas(texto) {
  let tira = "", pagina = null;
  const cortes = [];   // [offset, pagina]
  for (const cruda of String(texto || "").replace(/\r\n?/g, "\n").split("\n")) {
    const m = cruda.match(/^[ \t]*\f(\d*)[ \t]*$/);
    if (m) { pagina = m[1] ? Number(m[1]) : (pagina == null ? 1 : pagina + 1); cortes.push([tira.length, pagina]); continue; }
    // NFC: con los caracteres compuestos, `plegar` no cambia la longitud y las posiciones casan entre las dos tiras
    const l = cruda.normalize("NFC").replace(/\f/g, "").replace(/[ \t ]+/g, " ").trim();
    if (l) tira += (tira ? " " : "") + l;
  }
  const paginaEn = (i) => { let p = null; for (const [o, pg] of cortes) { if (o <= i) p = pg; else break; } return p; };
  return { tira, paginaEn };
}

/* La frase que contiene la posición `i` (de punto a punto, sin pasar de 600 caracteres a cada lado). */
function fraseEn(tira, i, fin) {
  let a = i; while (a > 0 && i - a < 600 && !/[.;:]\s/.test(tira.slice(a - 2, a))) a--;
  let b = fin; while (b < tira.length && b - fin < 600 && tira[b] !== ".") b++;
  return tira.slice(a, Math.min(tira.length, b + 1)).trim();
}

const ES_REGLA_GENERAL = /\b(?:en\s+las\s+convocatorias\s+limitadas|en\s+caso\s+de\s+que|cuando\s+(?:la\s+convocatoria|el\s+proceso)|si\s+procede|intencion\s+de\s+limitar|manifestacion\s+de\s+interes\s+(?:de|para)\s+limitar|solicitud(?:es)?\s+de\s+limitacion|podra\s+limitar|deben\s+limitar|susceptible\s+de\s+limitarse\s+a\s+mipyme,?\s+conforme)/;
const NIEGA = /no\s+es\s+susceptible\s+de\s+limitar(?:se)?\s+a\s+(?:las\s+)?mipymes?|no\s+(?:se\s+)?limit(?:a|ara|o)\s+(?:la\s+convocatoria\s+(?:de\s+este\s+|del\s+)?(?:proceso\s+(?:de\s+contratacion\s+)?)?|el\s+proceso\s+(?:de\s+(?:contratacion|seleccion)\s+)?)?a\s+(?:las\s+)?mipymes?|no\s+procede\s+la\s+limitacion/g;
const AFIRMA = /(?:se\s+limit(?:a|ara|o)|queda\s+limitad[oa]|esta\s+limitad[oa]|limita\s+la\s+convocatoria|convocatoria\s+limitada)\s+(?:la\s+convocatoria\s+|el\s+(?:presente\s+)?proceso\s+(?:de\s+(?:seleccion|contratacion)\s+)?|de\s+este\s+proceso\s+de\s+contratacion\s+)?(?:exclusivamente\s+)?a\s+(?:las\s+)?mipymes?/g;
const SORTEO_SI = /realizara\s+(?:un\s+|el\s+)?sorteo/g;
const SORTEO_NO = /no\s+(?:se\s+)?realizara\s+(?:ningun\s+)?sorteo|continuara\s+(?:el\s+proceso\s+)?con\s+todos\s+los\s+(?:interesados|que\s+(?:lo\s+)?manifest)/g;

/* El territorio de una frase que limita: «domiciliadas en el departamento del Tolima», «Mipyme Territorial
   Turbaco», «del municipio de Ibagué». Se copia del texto ORIGINAL (con mayúsculas y tildes). */
function territorioDe(frase) {
  const f = String(frase || "");
  const m = f.match(/(departamento|municipio|distrito)\s+(?:de(?:l)?\s+)?((?:[A-ZÁÉÍÓÚÑ][\wÁÉÍÓÚÑáéíóúñ.]+)(?:\s+(?:de\s+|del\s+)?[A-ZÁÉÍÓÚÑ][\wÁÉÍÓÚÑáéíóúñ.]+){0,3})/)
    || f.match(/Mipymes?\s+[Tt]erritorial(?:es)?\s+(?:de(?:l)?\s+)?((?:[A-ZÁÉÍÓÚÑ][\wÁÉÍÓÚÑáéíóúñ.]+)(?:\s+[A-ZÁÉÍÓÚÑ][\wÁÉÍÓÚÑáéíóúñ.]+){0,3})/);
  if (!m) return null;
  return m.length === 3 ? { tipo: m[1].toLowerCase(), nombre: m[2].replace(/\.$/, "") } : { tipo: null, nombre: m[1].replace(/\.$/, "") };
}

function hallazgos(tira, tiraPlegada, re, paginaEn) {
  const out = [];
  re.lastIndex = 0;
  let m;
  while ((m = re.exec(tiraPlegada)) && out.length < 6) {
    /* dentro de un corchete que se abrió antes (aunque la frase empiece después de «:») sigue siendo plantilla; un
       corchete YA CERRADO antes de la frase es la instrucción que la entidad dejó encima de la opción que eligió:
       se quita de la cita y la frase cuenta (las entidades dejan los corchetes en el pliego definitivo) */
    const frase = fraseEn(tira, m.index, m.index + m[0].length);
    const dentro = tira.lastIndexOf("[", m.index) > tira.lastIndexOf("]", m.index);
    const limpia = frase.replace(/\[[^\]]*\]/g, " ").replace(/\s+/g, " ").trim();
    if (dentro || /[[\]]/.test(limpia) || ES_REGLA_GENERAL.test(plegar(limpia))) continue;
    out.push({ cita: limpia.slice(0, 500), pagina: paginaEn(m.index) });
  }
  return out;
}

/* Lo que dice UN documento: {mipyme: "limitada"|"no_limitada"|"contradictorio"|null, territorio, sorteo:
   "si_mas_de_10"|"no"|null, citas}. null en cada campo = no consta en este documento. */
function leerConvocatoria(texto) {
  const { tira, paginaEn } = tiraConPaginas(texto);
  if (!tira) return { mipyme: null, territorio: null, sorteo: null, citas: {} };
  const pp = plegar(tira);   // misma longitud que `tira` (NFC): las posiciones sirven en las dos
  const no = hallazgos(tira, pp, NIEGA, paginaEn);
  // una negación contiene «limita… a mipyme»: lo que afirma no puede ser parte de una frase que niega
  const niega = new RegExp(NIEGA.source);
  const si = hallazgos(tira, pp, AFIRMA, paginaEn).filter((h) => !niega.test(plegar(h.cita)));
  const mipyme = si.length && no.length ? "contradictorio" : si.length ? "limitada" : no.length ? "no_limitada" : null;
  const territorio = mipyme === "limitada" ? si.map((h) => territorioDe(h.cita)).find(Boolean) || null : null;
  const sSi = hallazgos(tira, pp, SORTEO_SI, paginaEn), sNo = hallazgos(tira, pp, SORTEO_NO, paginaEn);
  const sorteo = sSi.length && sNo.length ? "contradictorio" : sSi.length ? "si_mas_de_10" : sNo.length ? "no" : null;
  return {
    mipyme, territorio, sorteo,
    citas: {
      ...(mipyme ? { mipyme: (mipyme === "no_limitada" ? no : mipyme === "limitada" ? si : [...si, ...no]).slice(0, 3) } : {}),
      ...(sorteo ? { sorteo: (sorteo === "no" ? sNo : sorteo === "si_mas_de_10" ? sSi : [...sSi, ...sNo]).slice(0, 2) } : {}),
    },
  };
}

/* Entre documentos: la ADENDA más reciente que lo diga gana; si no, el pliego definitivo (o el documento base);
   después la resolución de apertura y el aviso; el borrador del pliego, al final. Dos documentos del MISMO nivel
   que dicen cosas distintas: «contradictorio», con las dos citas. Cada lectura lleva su documento. */
const NIVEL = { adenda: 0, pliego: 1, documento_base: 1, resolucion: 2, aviso: 3, estudio_previo: 4, pliego_borrador: 5 };
function convocatoriaDeDocumentos(lecturas) {
  const con = (lecturas || []).filter((x) => x && x.lectura && NIVEL[x.tipo] != null);
  const elegir = (campo) => {
    const dicen = con.filter((x) => x.lectura[campo]);
    if (!dicen.length) return null;
    dicen.sort((a, b) => NIVEL[a.tipo] - NIVEL[b.tipo] || String(b.fecha || "").localeCompare(String(a.fecha || "")));
    const primero = dicen[0];
    const mismoNivel = dicen.filter((x) => NIVEL[x.tipo] === NIVEL[primero.tipo] && (primero.tipo !== "adenda" || x.fecha === primero.fecha));
    const valores = [...new Set(mismoNivel.map((x) => x.lectura[campo]))];
    const citas = (x) => ((x.lectura.citas || {})[campo === "territorio" ? "mipyme" : campo] || []).map((c) => ({ ...c, documento: x.documento || null }));
    if (valores.length > 1) return { valor: "contradictorio", citas: mismoNivel.flatMap(citas).slice(0, 4) };
    return { valor: primero.lectura[campo], citas: citas(primero).slice(0, 2), documento: primero.documento || null };
  };
  const mipyme = elegir("mipyme");
  const sorteo = elegir("sorteo");
  const conTerr = mipyme && mipyme.valor === "limitada" ? con.filter((x) => x.lectura.mipyme === "limitada" && x.lectura.territorio) : [];
  return { mipyme, territorio: conTerr.length ? conTerr.sort((a, b) => NIVEL[a.tipo] - NIVEL[b.tipo])[0].lectura.territorio : null, sorteo };
}

/* Lo que se le dice al usuario, en una línea por barrera. El territorio solo se nombra si se leyó. */
function frasesConvocatoria(c) {
  const out = [];
  const m = c && c.mipyme, s = c && c.sorteo;
  const pag = (x) => (x && x.citas && x.citas[0] && x.citas[0].pagina != null ? ` (pág. ${x.citas[0].pagina}${x.citas[0].documento ? `, ${x.citas[0].documento}` : ""})` : x && x.citas && x.citas[0] && x.citas[0].documento ? ` (${x.citas[0].documento})` : "");
  if (!m) out.push({ clave: "mipyme", nivel: "no_consta", texto: "Si la convocatoria está limitada a Mipyme: no consta en los documentos leídos. En SECOP II se marca también en la plataforma: revíselo en el proceso." });
  else if (m.valor === "no_limitada") out.push({ clave: "mipyme", nivel: "abierta", texto: `La convocatoria no está limitada a Mipyme${pag(m)}.` });
  else if (m.valor === "limitada") {
    const t = c.territorio;
    const donde = t ? (t.tipo ? ` domiciliadas en el ${t.tipo} de ${t.nombre}` : ` de ${t.nombre}`) : "";
    out.push({ clave: "mipyme", nivel: "limitada", texto: `La convocatoria está limitada a Mipyme${donde}${pag(m)}. Solo pueden ofertar Mipyme${t ? " con domicilio allí (una sucursal no cuenta)" : ""}, y en un consorcio todos los integrantes deben serlo.` });
  } else out.push({ clave: "mipyme", nivel: "contradictorio", texto: "Los documentos dicen cosas distintas sobre si la convocatoria está limitada a Mipyme: revise la adenda más reciente y la plataforma de SECOP II." });
  if (!s) out.push({ clave: "sorteo", nivel: "no_consta", texto: "Si habrá sorteo entre los interesados: no consta en los documentos leídos." });
  else if (s.valor === "si_mas_de_10") out.push({ clave: "sorteo", nivel: "sorteo", texto: `Si más de diez avisan que les interesa, la entidad sortea con quiénes sigue${pag(s)}.` });
  else if (s.valor === "no") out.push({ clave: "sorteo", nivel: "sin_sorteo", texto: `La entidad sigue con todos los que avisen que les interesa: no hay sorteo${pag(s)}.` });
  else out.push({ clave: "sorteo", nivel: "contradictorio", texto: "Los documentos dicen cosas distintas sobre el sorteo: revise la adenda más reciente." });
  return out;
}

module.exports = { leerConvocatoria, convocatoriaDeDocumentos, frasesConvocatoria, territorioDe, NIVEL };
