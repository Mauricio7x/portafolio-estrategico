/* ============================================================================
   lib/formato_entidad · LLENAR EL FORMATO QUE PUBLICÓ LA ENTIDAD (27-sep-2026)
   ----------------------------------------------------------------------------
   Encargo del dueño (27-sep-2026, al elegir entre dos caminos): «el formato de
   la entidad» — tomar el Word que la entidad publica en SECOP II para ESE
   proceso (carta de presentación, compromiso anticorrupción, capacidad
   financiera…) y devolverlo con los datos de la empresa puestos.

   NO DESHACE la decisión del 7-sep («datos, no formato», M-COMP-07): aquella
   prohibía REPRODUCIR de memoria un formato oficial, porque sería inventar una
   norma. Aquí no se reproduce nada: se escribe en el archivo real que la
   entidad publicó, y todo lo demás del documento viaja byte a byte
   (lib/docx.reemplazarEntrada).

   LO MEDIDO EN 13 FORMATOS REALES (dmgg-8hin, septiembre de 2026), que fija las
   reglas:
     · el dato del proponente va en una línea con etiqueta y un blanco de
       guiones bajos («NIT.: ______», «Nombre del Representante Legal: ____»),
       en una etiqueta que termina en «:» sin nada detrás («Teléfono:»), o en
       una tabla con la etiqueta en una celda y la de al lado vacía;
     · hay casillas que NO son del proponente aunque se llamen igual:
       «[Dirección de la entidad]», «[Ciudad]» bajo el nombre de la entidad,
       «Ciudad y fecha», el «Nombre: / C.C.:» de quien recibe comunicaciones o
       del contador que firma al lado;
     · los formatos de consorcio llevan casillas por integrante («El Consorcio
       se denomina ____», «Dirección de correo» del domicilio del consorcio).

   REGLAS QUE NO HAY QUE DESHACER. Un dato equivocado en una carta que se firma
   bajo la gravedad del juramento es peor que una casilla vacía (el falso caro
   aquí es el POSITIVO), así que:
     (1) las etiquetas van AL PRINCIPIO del renglón o de la celda (con, a lo
         sumo, una viñeta o una numeración): el NIT en mitad de la prosa es el
         de otro; se llenan las inequívocas del proponente (razón social, NIT,
         nombre y cédula del representante legal) y las que se llaman igual en
         otros sitios (dirección, ciudad, teléfono, correo) SOLO dentro del
         bloque del proponente (14 párrafos desde su última casilla);
     (2) jamás un marcador entre corchetes: con el ancla del renglón, un «[…]»
         no abre ninguna etiqueta, y el blanco solo admite delante UNA nota
         cerrada;
     (3) el documento del consorcio no se llena: ni si lo dice el título o el
         nombre del archivo, ni desde la frase que lo constituye («se denomina»,
         «se conforma», «está integrado», «asociarnos en consorcio»);
     (4) cada dato se escribe UNA vez por documento: la misma casilla otra vez
         es la de otra persona o la de cada integrante, y se deja;
     (5) «Dirección de correo» sin «electrónico» no se llena: en el Formato 1
         de Colombia Compra es la dirección postal y en otros, el correo;
     (6) lo que el usuario no guardó no se inventa, y todo lo que se llenó, lo
         que quedó sin dato y lo que se dejó por dudoso se lista con su renglón.
   Las reglas (1), (3), (4) y (5) y los arreglos de `blancoDe` y de los párrafos
   autocerrados salieron de la revisión adversaria del 27-sep-2026 sobre 132
   formatos reales: en 10 se escribían 16 casillas donde no iban.
   Función PURA sobre el XML (sin red ni Redis): el servidor la llama con el
   archivo que bajó por el puente SSRF-endurecido de lib/apu_descargar.
   ========================================================================== */
"use strict";
const { entradaZip, reemplazarEntrada, desescapar, esZip } = require("./docx.js");

/* LAS ETIQUETAS VAN AL PRINCIPIO DEL RENGLÓN (revisión adversaria, 27-sep-2026,
   132 formatos reales): sin ancla, «…identificada con NIT ___» en mitad de la
   prosa —el NIT del establecimiento de una persona natural, el de la entidad que
   certifica una experiencia— recibía el de la empresa. Se admite delante una
   viñeta o una numeración corta («▪ », «1. », «a) »). */
const INICIO = String.raw`^[\s•▪●·*\-–]*(?:\(?(?:\d{1,2}|[a-z])[.)]\s+)?`;
const etiqueta = (cuerpo) => new RegExp(INICIO + cuerpo, "i");

/* Los campos, en el orden en que se buscan (el más específico primero). */
const CAMPOS = [
  { clave: "representante_documento", nombre: "Cédula del representante legal", fuerte: true,
    re: etiqueta(String.raw`(?:c[eé]dula\s+de\s+ciudadan[ií]a|identificaci[oó]n|documento\s+de\s+identidad)\s+del\s+representante\s+legal`) },
  /* «Dirección de correo» sin «electrónico» es la dirección POSTAL en el Formato 1
     de Colombia Compra (la casilla siguiente es «Correo electrónico»), y en otros
     formatos es el correo: no se sabe, no se llena y se dice */
  { clave: "direccion", nombre: "Dirección de correo (no se sabe si es la postal o la electrónica)", dudosa: true,
    re: etiqueta(String.raw`direcci[oó]n\s+de\s+correo(?!\s+electr)`) },
  { clave: "correo", nombre: "Correo electrónico", fuerte: false,
    re: etiqueta(String.raw`(?:correos?\s+electr[oó]nicos?|direcci[oó]n\s+(?:de\s+)?correo\s+electr[oó]nico|direcci[oó]n\s+electr[oó]nica|e-?mail)`) },
  { clave: "razon_social", nombre: "Nombre o razón social del proponente", fuerte: true,
    re: etiqueta(String.raw`(?:nombre\s+(?:completo\s+)?(?:o\s+raz[oó]n\s+social\s+)?del\s+proponente(?!\s+o\s+de\s+su)|raz[oó]n\s+social(?:\s+del\s+proponente)?)`) },
  { clave: "representante_legal", nombre: "Nombre del representante legal", fuerte: true,
    re: etiqueta(String.raw`(?:nombre\s+del\s+)?representante\s+legal(?!\s+o\b)`) },
  { clave: "nit", nombre: "NIT", fuerte: true,
    re: etiqueta(String.raw`(?:nit\b\.?|identificaci[oó]n\s+(?:tributaria\s+)?del\s+proponente)`) },
  { clave: "representante_documento", nombre: "Cédula del representante legal", fuerte: false, soloTrasRepresentante: true,
    re: etiqueta(String.raw`c\.\s?c\.(?:\s*no\.?)?`) },
  { clave: "direccion", nombre: "Dirección", fuerte: false,
    re: etiqueta(String.raw`direcci[oó]n(?:\s+f[ií]sica)?(?!\s+(?:de\s+)?(?:correo|electr))`) },
  { clave: "telefono", nombre: "Teléfono", fuerte: false, re: etiqueta(String.raw`(?:tel[eé]fonos?(?![a-z])|celular)`) },
  { clave: "ciudad", nombre: "Ciudad", fuerte: false, re: etiqueta(String.raw`ciudad\b`) },
];
const CAMPOS_DATOS = ["razon_social", "nit", "representante_legal", "representante_documento", "direccion", "ciudad", "telefono", "correo"];
const VENTANA = 14;          // párrafos (con texto) después de una casilla del bloque del proponente
const LARGO_MAX_VALOR = 200;

/* EL BLANCO QUE SIGUE A LA ETIQUETA, con un recorrido sin retroceso (revisión
   adversaria: la expresión anterior, con cuatro `\s*` superpuestos, tardaba 17 s
   con «NIT» y 800 espacios, y 248 s con 1.600: un Word con espacios subrayados
   agotaba la función). Se admite, en este orden: separadores («:», «.», guiones,
   espacios), UNA nota cerrada entre paréntesis o corchetes, «No.», una cifra de
   nota al pie, y tres o más guiones bajos. → { desde, hasta } relativo o null */
const SEPARADORES = " \t :.-–—";
function blancoDe(resto) {
  const s = String(resto).slice(0, 160);
  let i = 0;
  const saltar = () => { while (i < s.length && SEPARADORES.includes(s[i])) i++; };
  saltar();
  if (s[i] === "(" || s[i] === "[") {
    const j = s.indexOf(s[i] === "(" ? ")" : "]", i);
    if (j < 0 || j - i > 62) return null;
    i = j + 1; saltar();
  }
  const no = /^no\.?/i.exec(s.slice(i));
  if (no) { i += no[0].length; saltar(); }
  if (/\d/.test(s[i] || "")) { i++; saltar(); }
  let j = i;
  while (j < s.length && s[j] === "_") j++;
  return j - i >= 3 ? { desde: i, hasta: j } : null;
}
/* o la etiqueta termina en «:» y el renglón no dice nada más */
const SOLO_DOS_PUNTOS = /^\s*:\s*$/;
/* EL DOCUMENTO DEL CONSORCIO O DE LA UNIÓN TEMPORAL. Las frases que solo trae ese
   documento, con lo que las plantillas reales ponen en medio (medido: «La UNIÓN
   TEMPORAL O CONSORCIO (especificar…) se denominará», «La Unión Temporal ( ) o
   Consorcio ( ) se conforma», «hemos convenido asociarnos en Consorcio»). Una
   carta que dice «…o de los integrantes del Consorcio…» entre paréntesis sigue
   siendo la carta. Tramos acotados: sin retroceso sin fin. */
const PLURAL = /(?:consorcio|uni[oó]n\s+temporal)[^.\n]{0,90}?\sse\s+(?:denomin|conform|constitu)|(?:consorcio|uni[oó]n\s+temporal)[^.\n]{0,90}?\sest[aá]\s+(?:integrad|conformad|compuest)|asociarnos\s+en\s+(?:consorcio|uni[oó]n\s+temporal)|integrantes?\s+del\s+(?:consorcio|la\s+uni[oó]n\s+temporal)\s*(?:son\b|es\b|:)/i;
/* y el que lo dice en su TÍTULO (los primeros renglones) o en el nombre del archivo */
const PLURAL_TITULO = /consorcio|uni[oó]n\s+temporal|proponente\s+plural|promesa\s+de\s+sociedad/i;
const PERSONA_NATURAL = /personas?\s+naturale?s?/i, PERSONA_JURIDICA = /personas?\s+jur[ií]dicas?/i;
const RENGLONES_TITULO = 6;
/* un TÍTULO es un renglón corto: la primera frase de una carta dice a veces «…en
   calidad de representante de la sociedad, consorcio o unión temporal…» y eso no
   la vuelve del consorcio (medido: FORMULARIO CARTA DE PRESENTACIÓN, formato 12 de
   la revisión) */
const LARGO_TITULO = 120;

const escaparXml = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
/* fuera también lo que XML no admite (U+FFFE, U+FFFF, sustitutos sueltos): un
   carácter así deja el documento «dañado» en Word (revisión adversaria) */
const NO_XML = /[^\t\n\r -퟿-�\u{10000}-\u{10ffff}]/gu;
const limpiarValor = (v) => {
  if (v == null) return null;
  const s = String(v).replace(NO_XML, "").replace(/\s+/g, " ").trim();
  return s ? s.slice(0, LARGO_MAX_VALOR) : null;
};

/* Los datos que se pueden escribir: solo los que el usuario guardó, limpios. */
function normalizarDatos(d) {
  const out = {};
  for (const k of CAMPOS_DATOS) out[k] = limpiarValor(d && d[k]);
  return out;
}

/* Un párrafo como piezas de texto editables: cada `<w:t>` con su texto ya
   desescapado y su posición en el texto del párrafo (los tabuladores cuentan
   como «\t» pero no se editan). */
function piezasDe(xmlParrafo) {
  const piezas = [];
  let texto = "";
  const re = /<w:t(?:\s[^>]*)?>([^<]*)<\/w:t>|<w:t(?:\s[^>]*)?\/>|<w:tab\/>|<w:tab\s[^>]*\/>/g;
  let m;
  while ((m = re.exec(xmlParrafo))) {
    if (m[0].startsWith("<w:tab")) { texto += "\t"; continue; }
    if (m[1] == null) continue;
    const t = desescapar(m[1]);
    piezas.push({ desde: texto.length, hasta: texto.length + t.length, texto: t, inicio: m.index, fin: m.index + m[0].length });
    texto += t;
  }
  return { texto, piezas };
}

/* Escribe `valor` en el tramo [a, b) del texto del párrafo: el valor entra en
   la pieza donde empieza el tramo y el resto del tramo se borra de las piezas
   siguientes. Si el tramo está vacío (a === b), se añade al final. */
function escribirEnParrafo(xmlParrafo, a, b, valor) {
  const { piezas } = piezasDe(xmlParrafo);
  if (!piezas.length) return null;
  const nuevas = piezas.map((p) => ({ ...p, nuevo: p.texto }));
  if (a === b) {
    const ultima = nuevas[nuevas.length - 1];
    ultima.nuevo = `${ultima.texto}${/\s$/.test(ultima.texto) ? "" : " "}${valor}`;
  } else {
    let puesto = false;
    for (const p of nuevas) {
      const i = Math.max(a, p.desde), j = Math.min(b, p.hasta);
      if (i >= j) continue;
      const antes = p.nuevo.slice(0, i - p.desde), despues = p.nuevo.slice(j - p.desde);
      p.nuevo = puesto ? antes + despues : `${antes}${valor}${despues}`;
      puesto = true;
    }
    if (!puesto) return null;
  }
  let out = "", ultimo = 0;
  for (const p of nuevas) {
    out += xmlParrafo.slice(ultimo, p.inicio);
    out += p.nuevo === p.texto ? xmlParrafo.slice(p.inicio, p.fin) : `<w:t xml:space="preserve">${escaparXml(p.nuevo)}</w:t>`;
    ultimo = p.fin;
  }
  return out + xmlParrafo.slice(ultimo);
}

/* Un párrafo sin texto editable (la celda vacía de una tabla): se le añade una
   corrida con el valor antes de `</w:p>`; un párrafo autocerrado se abre. */
function anadirCorrida(xmlParrafo, valor) {
  const corrida = `<w:r><w:t xml:space="preserve">${escaparXml(valor)}</w:t></w:r>`;
  const auto = /^(<w:p(?=[\s/])[^>]*?)\s*\/>$/.exec(xmlParrafo);
  if (auto) return `${auto[1]}>${corrida}</w:p>`;
  const i = xmlParrafo.lastIndexOf("</w:p>");
  if (i < 0) return null;
  return `${xmlParrafo.slice(0, i)}${corrida}${xmlParrafo.slice(i)}`;
}

/* un párrafo con cuerpo; el autocerrado `<w:p …/>` NO abre uno (revisión
   adversaria: se tragaba el párrafo siguiente, en 15 de 132 formatos reales) */
const RE_PARRAFO = /<w:p(?=[\s>])(?![^>]*\/>)[^>]*>[\s\S]*?<\/w:p>/g;
const RE_PARRAFO_AUTO = /<w:p(?=[\s/])[^>]*\/>/;
const contexto = (t) => t.replace(/\s+/g, " ").trim().slice(0, 140);

/* El XML de `word/document.xml` → { xml, llenados, sin_dato, dudosos, hay_consorcio, para_persona_natural }.
   `datos`: los de normalizarDatos; `nombre`: el del archivo. UNA sola pasada en
   el orden del documento (tablas y párrafos intercalados), para que cada celda
   se trate UNA vez: con dos pasadas, la etiqueta «Nombre o Razón Social del
   Proponente:» de una celda recibía el dato en la celda de al lado Y en la suya. */
function llenarXml(xmlEntrada, datos, { nombre = "" } = {}) {
  const llenados = [], sinDato = [], dudosos = [];
  let desdeFuerte = Infinity;         // párrafos con texto desde la última casilla del bloque del proponente
  let previoRepresentante = false;    // el párrafo anterior con texto era el nombre del representante
  let plural = false;
  const escritos = new Set();         // cada dato se escribe UNA vez por documento
  const anotar = (lista, campo, t, extra = {}) => lista.push({ campo: campo.clave, nombre: campo.nombre, renglon: contexto(t), ...extra });

  /* los cuadros de texto se apartan y se devuelven intactos: dentro puede ir un
     bloque de la ENTIDAD, y la guarda de «párrafo dentro de párrafo» solo
     protegía el primero de sus párrafos (revisión adversaria) */
  const cuadros = [];
  let xml = xmlEntrada.replace(/<w:txbxContent[\s>][\s\S]*?<\/w:txbxContent>/g, (c) => { cuadros.push(c); return `\u0000${cuadros.length - 1}\u0000`; });

  /* el título: un documento de consorcio (o para persona natural) lo dice arriba */
  const titulo = [];
  let vistos = 0;
  for (const m of xml.matchAll(RE_PARRAFO)) { const t = piezasDe(m[0]).texto.trim(); if (!t) continue; if (t.length <= LARGO_TITULO) titulo.push(t); if (++vistos >= RENGLONES_TITULO) break; }
  const cabeza = `${nombre}\n${titulo.join("\n")}`;
  if (PLURAL_TITULO.test(cabeza)) plural = true;
  const paraPersonaNatural = PERSONA_NATURAL.test(cabeza) && !PERSONA_JURIDICA.test(cabeza);

  function procesarParrafo(p) {
    let { texto } = piezasDe(p);
    if (!texto.trim()) return p;
    if (plural || PLURAL.test(texto)) { plural = true; previoRepresentante = false; return p; }
    desdeFuerte++;
    let actual = p, eraRepresentante = false;
    const usados = new Set();
    for (const campo of CAMPOS) {
      if (usados.has(campo.clave)) continue;
      const m = campo.re.exec(texto);
      if (!m) continue;
      const tras = m.index + m[0].length;
      const resto = texto.slice(tras);
      const b = blancoDe(resto);
      let a0 = null, a1 = null;
      if (b) { a0 = tras + b.desde; a1 = tras + b.hasta; }
      else if (SOLO_DOS_PUNTOS.test(resto)) { a0 = texto.length; a1 = texto.length; }
      else continue;                                        // la palabra aparece, pero no hay casilla que llenar
      usados.add(campo.clave);
      if (campo.fuerte) desdeFuerte = 0;
      if (campo.clave === "representante_legal") eraRepresentante = true;
      if (campo.dudosa) { anotar(dudosos, campo, texto, { motivo: "la misma etiqueta es la dirección postal en unos formatos y el correo en otros" }); continue; }
      if (campo.soloTrasRepresentante && !previoRepresentante) { anotar(dudosos, campo, texto, { motivo: "no se sabe de quién es esta cédula" }); continue; }
      if (!campo.fuerte && !campo.soloTrasRepresentante && desdeFuerte > VENTANA) { anotar(dudosos, campo, texto, { motivo: "no está en el bloque de datos del proponente" }); continue; }
      if (escritos.has(campo.clave)) { anotar(dudosos, campo, texto, { motivo: "la casilla aparece otra vez: puede ser de otra persona o de cada integrante" }); continue; }
      const valor = datos[campo.clave];
      if (!valor) { anotar(sinDato, campo, texto); continue; }
      // un espacio entre la etiqueta y el dato, y entre el dato y lo que sigue
      const antes = texto[a0 - 1], despues = texto[a1];
      const escrito = `${antes && !/\s/.test(antes) ? " " : ""}${valor}${despues && !/[\s.,;:)\]]/.test(despues) ? " " : ""}`;
      const nuevo = escribirEnParrafo(actual, a0, a1, escrito);
      if (!nuevo) continue;
      actual = nuevo;
      texto = piezasDe(actual).texto;
      escritos.add(campo.clave);
      anotar(llenados, campo, texto, { valor });
      /* una casilla del bloque llenada lo mantiene abierto: «Dirección», «Ciudad» y
         «Teléfono» vienen en fila después de la cédula (medido: ANEXO 3 de
         CO1.BDOS.10816985 cortaba la ciudad y el teléfono a mitad del bloque) */
      desdeFuerte = 0;
    }
    previoRepresentante = eraRepresentante;
    return actual;
  }

  /* una fila: la etiqueta INEQUÍVOCA en una celda y la de al lado vacía (o solo
     guiones bajos) → el dato va en la de al lado y las dos quedan tratadas; las
     demás celdas, párrafo a párrafo, como el resto del documento */
  function procesarFila(fila) {
    if (/<w:tr[\s>]/.test(fila.slice(4))) return fila;    // tabla anidada: no se toca
    const celdas = [];
    const reC = /<w:tc(?=[\s>])[^>]*>[\s\S]*?<\/w:tc>/g;
    let m;
    while ((m = reC.exec(fila))) celdas.push({ xml: m[0], inicio: m.index, largo: m[0].length, texto: piezasDe(m[0]).texto.replace(/\s+/g, " ").trim() });
    const tratadas = new Set();
    for (let i = 0; i < celdas.length; i++) {
      if (tratadas.has(i)) continue;
      if (plural || PLURAL.test(celdas[i].texto)) { plural = true; break; }
      const vecina = celdas[i + 1];
      const etq = celdas[i].texto.replace(/[:.\s]+$/, "");
      const campo = vecina && CAMPOS.find((c) => c.fuerte && !c.soloTrasRepresentante && c.re.test(etq) && etq.replace(c.re, "").replace(/[\s:.()]/g, "").length <= 3);
      if (campo && (!vecina.texto || /^_{3,}$/.test(vecina.texto))) {
        tratadas.add(i); tratadas.add(i + 1);
        desdeFuerte = 0;
        if (escritos.has(campo.clave)) { anotar(dudosos, campo, celdas[i].texto, { motivo: "la casilla aparece otra vez: puede ser de otra persona o de cada integrante" }); continue; }
        const valor = datos[campo.clave];
        if (!valor) { anotar(sinDato, campo, celdas[i].texto); continue; }
        const conCuerpo = vecina.xml.match(RE_PARRAFO) || [];
        const objetivo = conCuerpo[0] || (RE_PARRAFO_AUTO.exec(vecina.xml) || [])[0];
        let nuevoP = null;
        if (objetivo) {
          const pieza = piezasDe(objetivo);
          nuevoP = vecina.texto ? escribirEnParrafo(objetivo, pieza.texto.indexOf("_"), pieza.texto.lastIndexOf("_") + 1, valor) : anadirCorrida(objetivo, valor);
        }
        // lo que no se pudo escribir también se dice (revisión adversaria: se saltaba en silencio)
        if (!nuevoP) { anotar(dudosos, campo, celdas[i].texto, { motivo: "la celda de al lado no admite texto" }); continue; }
        vecina.xml = vecina.xml.replace(objetivo, () => nuevoP);
        escritos.add(campo.clave);
        anotar(llenados, campo, `${celdas[i].texto} ${valor}`, { valor });
        continue;
      }
      celdas[i].xml = celdas[i].xml.replace(RE_PARRAFO, (p) => procesarParrafo(p));
    }
    let out = "", ultimo = 0;
    for (const c of celdas) { out += fila.slice(ultimo, c.inicio) + c.xml; ultimo = c.inicio + c.largo; }
    return out + fila.slice(ultimo);
  }

  xml = xml.replace(new RegExp(String.raw`<w:tbl(?=[\s>])[^>]*>[\s\S]*?<\/w:tbl>|` + RE_PARRAFO.source, "g"), (bloque) => {
    if (bloque.startsWith("<w:tbl")) {
      if (/<w:tbl[\s>]/.test(bloque.slice(6))) return bloque;   // tabla anidada: no se toca
      return bloque.replace(/<w:tr(?=[\s>])[^>]*>[\s\S]*?<\/w:tr>/g, (fila) => procesarFila(fila));
    }
    return procesarParrafo(bloque);
  });
  xml = xml.replace(/\u0000(\d+)\u0000/g, (_, i) => cuadros[Number(i)]);
  return { xml, llenados, sin_dato: sinDato, dudosos, hay_consorcio: plural, para_persona_natural: paraPersonaNatural };
}

/* El .docx de la entidad (Buffer) + los datos → { ok, buf, llenados, sin_dato,
   dudosos, hay_consorcio, para_persona_natural } | { ok:false, motivo } */
function llenarFormato(buf, datosCrudos, { nombre = "" } = {}) {
  if (!esZip(buf)) return { ok: false, motivo: "no es un documento de Word (.docx)" };
  let e;
  try { e = entradaZip(buf, "word/document.xml"); } catch { e = { motivo: "el documento está dañado" }; }
  if (!e.datos) return { ok: false, motivo: e.motivo };
  const datos = normalizarDatos(datosCrudos);
  const r = llenarXml(e.datos.toString("utf8"), datos, { nombre });
  const resumen = { llenados: r.llenados, sin_dato: r.sin_dato, dudosos: r.dudosos, hay_consorcio: r.hay_consorcio, para_persona_natural: r.para_persona_natural };
  if (!r.llenados.length) return { ok: true, buf: null, ...resumen };
  const z = reemplazarEntrada(buf, "word/document.xml", Buffer.from(r.xml, "utf8"));
  if (!z.ok) return { ok: false, motivo: z.motivo };
  return { ok: true, buf: z.buf, ...resumen };
}

module.exports = { llenarFormato, llenarXml, normalizarDatos, blancoDe, CAMPOS_DATOS, piezasDe, escribirEnParrafo, PLURAL };
