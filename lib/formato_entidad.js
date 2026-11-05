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
const { entradaZip, reescribirZip, desescapar, esZip } = require("./docx.js");

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
  /* la matrícula y la persona de contacto se llaman igual en los formatos de personal y de experiencia (la del director de
     obra, la del ingeniero que abona, la persona de contacto del contratante): la revisión adversaria (5-nov-2026) las vio
     caer ahí con solo la ventana del bloque. La matrícula, SOLO en el renglón del representante legal o justo después de
     él o de su cédula; la persona de contacto, SOLO en la carta de presentación */
  { clave: "matricula_profesional", nombre: "Matrícula profesional del representante legal", fuerte: false, trasRepresentanteOCedula: true,
    re: etiqueta(String.raw`matr[ií]cula\s+profesional(?:\s+(?:no\.?|n[°º]\.?|n[uú]mero))?`) },
  { clave: "persona_contacto", nombre: "Persona de contacto", fuerte: false, soloEnCarta: true, re: etiqueta(String.raw`persona\s+de\s+contacto`) },
  { clave: "ciudad", nombre: "Ciudad", fuerte: false, re: etiqueta(String.raw`ciudad\b`) },
];
/* 5-nov-2026 (encargo del dueño, con la carta de presentación del CONSORCIO INFRAESTRUCTURA 1A en Cali delante): la ciudad
   de expedición de la cédula (los formatos la piden: «C.C. No. 9´396.710 de Sogamoso»), la matrícula profesional del
   representante y la persona de contacto para notificaciones */
const CAMPOS_DATOS = ["razon_social", "nit", "representante_legal", "representante_documento", "representante_expedicion", "matricula_profesional", "persona_contacto", "direccion", "ciudad", "telefono", "correo",
  /* 5-nov-2026: lo que la carta de presentación de Colombia Compra hace MARCAR con una X (el tipo de proponente, si
     pertenece a un grupo empresarial, si cotiza en bolsa). Son declaraciones juradas: sin el dato del usuario no se marca */
  "tipo_proponente", "grupo_empresarial", "cotiza_bolsa"];
const TIPOS_PROPONENTE = ["persona_natural", "persona_juridica", "consorcio", "union_temporal"];
/* LOS OFRECIMIENTOS QUE DAN PUNTAJE (factor de calidad, industria nacional, sostenibilidad ambiental y social): firmarlos
   COMPROMETE al proponente con algo que cuesta (un programa de gerencia, un plan de calidad, personal colombiano). Si se
   ofrece o no lo decide el dueño: se llenan sus datos, pero la firma no se pone sola (5-nov-2026). Por el título o por el
   nombre del archivo (los tipo los abrevian: «F7_FactorCal», «F9_IndNac», «F14_CalAmbSocial») */
const ES_OFRECIMIENTO = /factor(?:es)?\s+de\s+(?:calidad|sostenibilidad|desempate)|desempate|factor(?:es)?_?desemp|industria\s+nacional|ambiental\s+y\s+social|sostenibilidad\s+t[eé]cnico|factor_?cal|ind_?nac|amb_?social|cal_?amb|factor_?a?_?amb/i;
// lo que se escribe de la ENTIDAD (de SECOP II) no hace del documento uno «del proponente»: con solo eso no se firma
/* LAS DECLARACIONES DE UNA CONDICIÓN (revisión adversaria, 5-nov-2026, reproducido: la acreditación Mipyme salía FIRMADA
   sola en 8 formatos del corpus): «declaramos bajo la gravedad del juramento que … es una Mipyme», que es emprendimiento de
   mujeres, que vincula personas con discapacidad… Si la condición se tiene lo sabe el dueño: se llena, no se firma sola */
const ES_DECLARACION_DE_CONDICION = /mipyme|acred_?mipyme|emprendimiento|empresas?\s+de\s+mujeres|acred_?mujeres|discapacidad|vinc_?discap|_discap|vinculaci[oó]n\s+de\s+(?:personas|poblaci)|poblaci[oó]n\s+(?:ind[ií]gena|vulnerable)|reincorporaci|reintegraci|adulto\s+mayor\s+no\s+beneficiario/i;
const CAMPOS_DE_LA_ENTIDAD = new Set(["entidad", "numero_proceso", "ciudad_entidad", "objeto"]);
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
function escribirEnParrafo(xmlParrafo, a, b, valor, { sinResaltado = false } = {}) {
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
    let previo = xmlParrafo.slice(ultimo, p.inicio);
    /* el corchete de la plantilla viene RESALTADO EN GRIS («los aspectos incluidos en corchetes y resaltados en gris»): el
       dato escrito encima no lo hereda (solo en la corrida de esa pieza; el resto del documento queda igual) */
    if (sinResaltado && p.nuevo !== p.texto) {
      const k = Math.max(previo.lastIndexOf("<w:r>"), previo.lastIndexOf("<w:r "));
      if (k >= 0) previo = previo.slice(0, k) + previo.slice(k).replace(/<w:highlight\b[^>]*\/>/g, "");
    }
    out += previo;
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
  let previoRepOCedula = false;       // … o la cédula que va tras él (para la matrícula)
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
  /* (revisión adversaria) solo los ofrecimientos tipo traen varias cartas del MISMO proponente (7A, 7B, 7C): en otro
     documento, una segunda carta puede ser la del revisor fiscal y la regla de «cada dato una vez» se mantiene */
  const variasCartas = ES_OFRECIMIENTO.test(cabeza);
  const esCarta = /carta\s+de\s+presentaci[oó]n/i.test(cabeza);

  function procesarParrafo(p) {
    let { texto } = piezasDe(p);
    if (!texto.trim()) return p;
    if (plural || PLURAL.test(texto)) { plural = true; previoRepresentante = false; previoRepOCedula = false; return p; }
    /* UN FORMATO CON VARIAS CARTAS (el 7 de los tipo trae 7A, 7B y 7C, cada una con su «Señores» y su bloque de firma del
       mismo proponente, 5-nov-2026): cada carta nueva vuelve a admitir los datos, que antes se escribían solo en la primera */
    if (variasCartas && /^\s*señores\s*:?\s*$/i.test(texto)) { escritos.clear(); desdeFuerte = Infinity; }
    desdeFuerte++;
    let actual = p, eraRepresentante = false, eraCedula = false;
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
      if (campo.soloTrasRepresentante) eraCedula = true;
      if (campo.trasRepresentanteOCedula && !(eraRepresentante || previoRepOCedula)) { anotar(dudosos, campo, texto, { motivo: "no se sabe de quién es esta matrícula" }); continue; }
      if (campo.soloEnCarta && !esCarta) { anotar(dudosos, campo, texto, { motivo: "fuera de la carta de presentación puede ser la persona de contacto de otro" }); continue; }
      if (!campo.fuerte && !campo.soloTrasRepresentante && desdeFuerte > VENTANA) { anotar(dudosos, campo, texto, { motivo: "no está en el bloque de datos del proponente" }); continue; }
      if (escritos.has(campo.clave)) { anotar(dudosos, campo, texto, { motivo: "la casilla aparece otra vez: puede ser de otra persona o de cada integrante" }); continue; }
      let valor = datos[campo.clave];
      if (!valor) { anotar(sinDato, campo, texto); continue; }
      /* «C.C. No. ____» → «9.396.710 de Sogamoso» si guardó la ciudad de expedición; si el renglón ya trae su «de ____», no
         se escribe dos veces (5-nov-2026) */
      let ciudadAparte = null;
      if (campo.clave === "representante_documento" && datos.representante_expedicion) {
        const tras = texto.slice(a1);
        const deBlanco = /^(\s*(?:de|expedida\s+en)\s*)_{3,}/i.exec(tras);
        if (deBlanco) ciudadAparte = { desde: deBlanco[1].length, hasta: deBlanco[0].length };
        else if (/^\s*[.;)]?\s*$/.test(tras)) valor = `${valor} de ${datos.representante_expedicion}`;
      }
      // un espacio entre la etiqueta y el dato, y entre el dato y lo que sigue
      const antes = texto[a0 - 1], despues = texto[a1];
      const escrito = `${antes && !/\s/.test(antes) ? " " : ""}${valor}${despues && !/[\s.,;:)\]]/.test(despues) ? " " : ""}`;
      const nuevo = escribirEnParrafo(actual, a0, a1, escrito);
      if (!nuevo) continue;
      actual = nuevo;
      texto = piezasDe(actual).texto;
      /* «C.C. No. ____ de ____»: la ciudad va en SU casilla, la de después de la cédula */
      if (ciudadAparte) {
        const base = a0 + escrito.length;
        const conCiudad = escribirEnParrafo(actual, base + ciudadAparte.desde, base + ciudadAparte.hasta, datos.representante_expedicion);
        if (conCiudad) { actual = conCiudad; texto = piezasDe(actual).texto; valor = `${valor} de ${datos.representante_expedicion}`; }
      }
      escritos.add(campo.clave);
      anotar(llenados, campo, texto, { valor });
      /* una casilla del bloque llenada lo mantiene abierto: «Dirección», «Ciudad» y
         «Teléfono» vienen en fila después de la cédula (medido: ANEXO 3 de
         CO1.BDOS.10816985 cortaba la ciudad y el teléfono a mitad del bloque) */
      desdeFuerte = 0;
    }
    previoRepresentante = eraRepresentante;
    previoRepOCedula = eraRepresentante || eraCedula;
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
      const campo = vecina && CAMPOS.find((c) => (c.fuerte || (c.soloEnCarta && esCarta)) && !c.soloTrasRepresentante && c.re.test(etq) && etq.replace(c.re, "").replace(/[\s:.()]/g, "").length <= 3);
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
  return { xml, llenados, sin_dato: sinDato, dudosos, hay_consorcio: plural, para_persona_natural: paraPersonaNatural, ofrecimiento: ES_OFRECIMIENTO.test(cabeza), declaracion: ES_DECLARACION_DE_CONDICION.test(cabeza) };
}

/* ============================================================================
   LA PLANTILLA DE COLOMBIA COMPRA, COMPLETA (5-nov-2026, encargo del dueño con la carta de Cartagena —CO1.REQ.11246436,
   formato tipo ISocialMenCV1— delante: «la idea es que el usuario final no tenga que hacer nada más que revisar»).
   Los formatos tipo traen entre corchetes lo que hay que escribir. Muchas entidades los publican SIN completar los suyos, y
   el proponente los completa: así lo hizo el dueño en la carta de Cali (CONSORCIO INFRAESTRUCTURA 1A, 4151.010.32.1.1255-2026).
   Se completan SOLO frases exactas medidas en el censo de 94 formatos tipo del corpus, y solo con un dato que se sabe:
   - de la ENTIDAD, con lo que publica SECOP II: su nombre, el número del proceso, la ciudad del encabezado y el objeto;
   - del PROPONENTE (no persona natural: su frase es otra): su nombre, el de su representante, y la dirección, el teléfono y
     el correo de «Recibiré notificaciones en»;
   - las X de «El proponente es», «grupo empresarial» y «cotiza en bolsa», solo con el dato que guardó el usuario (el tipo
     de un consorcio sale de su nombre);
   - «Dirección de correo» seguida de «Correo electrónico» es la dirección POSTAL; «Telefax», el teléfono.
   Nada se borra salvo la alternativa « o [Nombre del Proponente- persona natural]» cuando el proponente no lo es (el dueño
   la quitó en Cali); lo que no se sabe (la dirección de la entidad, el lote, los folios reservados) queda entre corchetes y
   se lista en `pendientes`. El documento de conformación del consorcio no pasa por aquí. */
const RE_CORCHETE_CAMPO = /\[\s*(?:nombre|incluir\s+(?:el|la|los|n[uú]mero|nombre)|indicar|direcci[oó]n|tel[eé]fono|ciudad|n[uú]mero)[^\]\n]{0,110}\]/gi;
const RE_CORCHETE_INSTRUCCION = /^\[\s*(?:incluir\s+(?:cuando|para|numeral|solo|el\s+siguiente)|en\s+caso|nota|marque|este\s+cuadro|anexar)/i;
  /* LOS CAMPOS DE WORD (MACROBUTTON) DE LOS FORMATOS TIPO: Word enseña su texto —«[Nombre del representante legal del
     Proponente]», «[Nombre del Proponente]»— pero no está en un <w:t>, y ni se llenaba ni se listaba como pendiente (revisión
     adversaria: «… de «[Nombre del Proponente]» EMPRESA SAS en adelante»). Cada campo cuyo texto es un corchete se cambia por
     ESE MISMO texto, con la letra de su corrida: lo que se ve no cambia, y las reglas de los corchetes lo llenan o lo listan */
function camposDeWordATexto(xml) {
  /* EL CAMPO «AUTHOR» DE LA PLANTILLA (5-nov-2026, la carta de Cartagena en LibreOffice): la carta tipo trae, al lado de
     «Otro__» y en la casilla de la persona de contacto, un campo AUTHOR «Nombre y Apellidos» que Word o LibreOffice llenan con
     el AUTOR DEL ARCHIVO —la funcionaria que hizo la plantilla— al actualizar los campos o al imprimir: el nombre de un
     tercero en una carta jurada. En el formato que se LLENA, ese campo sin resultado se quita (el que va tal cual no se toca) */
  xml = String(xml).replace(/<w:r\b(?:(?!<\/w:r>)[\s\S])*?<w:fldChar\s+w:fldCharType="begin"\s*\/>(?:(?!<\/w:r>)[\s\S])*<\/w:r>\s*<w:r\b(?:(?!<\/w:r>)[\s\S])*?<w:instrText[^>]*>\s*AUTHOR\s+"Nombre\s+y\s+Apellidos"[^<]*<\/w:instrText>(?:(?!<\/w:r>)[\s\S])*<\/w:r>\s*<w:r\b(?:(?!<\/w:r>)[\s\S])*?<w:fldChar\s+w:fldCharType="end"\s*\/>(?:(?!<\/w:r>)[\s\S])*?<\/w:r>/gi, "");
  return xml.replace(/<w:r\b[^>]*>((?:(?!<\/w:r>)[\s\S])*?)<w:fldChar\s+w:fldCharType="begin"\s*\/>(?:(?!<\/w:r>)[\s\S])*<\/w:r>\s*<w:r\b(?:(?!<\/w:r>)[\s\S])*?<w:instrText[^>]*>\s*MACROBUTTON\s+\S+\s+"?(\[[^\]<"]{2,120}\])"?\s*<\/w:instrText>(?:(?!<\/w:r>)[\s\S])*<\/w:r>\s*<w:r\b(?:(?!<\/w:r>)[\s\S])*?<w:fldChar\s+w:fldCharType="end"\s*\/>(?:(?!<\/w:r>)[\s\S])*?<\/w:r>/gi,
    (todo, previo, corchete) => {
      const rPr = (/<w:rPr>[\s\S]*?<\/w:rPr>/.exec(previo) || [""])[0];
      return `<w:r>${rPr}<w:t xml:space="preserve">${escaparXml(desescapar(corchete))}</w:t></w:r>`;
    });
}
function completarPlantilla(xmlEntrada, datos, delProceso = {}) {
  const llenados = [], pendientes = [];
  const cuadros = [];
  let xml = String(xmlEntrada).replace(/<w:txbxContent[\s>][\s\S]*?<\/w:txbxContent>/g, (c) => { cuadros.push(c); return `\u0000${cuadros.length - 1}\u0000`; });
  const tipo0 = TIPOS_PROPONENTE.includes(datos.tipo_proponente) ? datos.tipo_proponente : (TIPOS_PROPONENTE.includes(delProceso.tipo) ? delProceso.tipo : null);
  xml = camposDeWordATexto(xml);
  const ps = [...xml.matchAll(RE_PARRAFO)].map((m) => ({ inicio: m.index, largo: m[0].length, xml: m[0], t: piezasDe(m[0]).texto }));
  const conTexto = ps.map((p, i) => i).filter((i) => ps[i].t.trim());
  // el objeto, ENTERO: con el tope de 200 se cortaba en seco a mitad de palabra (revisión adversaria); con más de 600 no se escribe
  const objeto0 = delProceso.objeto == null ? null : String(delProceso.objeto).replace(NO_XML, "").replace(/\s+/g, " ").trim();
  const ent = { entidad: limpiarValor(delProceso.entidad), referencia: limpiarValor(delProceso.referencia), ciudad: limpiarValor(delProceso.ciudad_entidad), objeto: objeto0 && objeto0.length <= 600 ? objeto0 : null };
  const tipo = tipo0;
  const juridico = tipo && tipo !== "persona_natural";
  const anotar = (campo, nombre, p, valor) => llenados.push({ campo, nombre, renglon: contexto(p.t), valor, plantilla: true });
  // escribe en el párrafo k el tramo [a,b) con `valor` (sin el gris del corchete) y rehace su texto
  const escribir = (k, a, b, valor) => { const nuevo = escribirEnParrafo(ps[k].xml, a, b, valor, { sinResaltado: true }); if (!nuevo) return false; ps[k].xml = nuevo; ps[k].t = piezasDe(nuevo).texto; return true; };
  const reemplazar = (k, re, valorDe, campo, nombre) => {
    let hecho = false;
    for (let guarda = 0; guarda < 8; guarda++) {
      re.lastIndex = 0;
      const m = re.exec(ps[k].t);
      if (!m) break;
      let valor = valorDe(m, ps[k].t);
      if (valor == null) break;
      // el campo de Word va pegado a la palabra que sigue («…Proponente]en mi calidad»): el dato no se le pega
      if (valor && /[\p{L}\d]/u.test(ps[k].t[m.index + m[0].length] || "")) valor = `${valor}, `;
      if (!escribir(k, m.index, m.index + m[0].length, valor)) break;
      hecho = true;
    }
    if (hecho) anotar(campo, nombre, ps[k], null);
    return hecho;
  };
  const posEnTexto = (k) => conTexto.indexOf(k);
  // un formato puede traer VARIOS bloques (el 7 trae 7A, 7B y 7C): cada «Señores» abre el suyo, con su ciudad y su objeto
  let iSenores = null, objetoDelBloque = false, iRef = -1;
  let iNombreProp = -1;
  for (const k of conTexto) {
    const t = ps[k].t;
    if (/^\s*señores\b/i.test(t)) { iSenores = k; objetoDelBloque = false; }
    // ── la ENTIDAD ──
    if (ent.entidad) reemplazar(k, /\[\s*(?:NOMBRE\s+DE\s+LA\s+ENTIDAD(?:\s+ESTATAL)?|Incluir\s+(?:el\s+)?nombre\s+de\s+la\s+Entidad(?:\s+Estatal)?)\s*\]/i, () => ent.entidad, "entidad", "Nombre de la entidad");
    if (ent.referencia) reemplazar(k, /\[\s*(?:Incluir\s+(?:el\s+)?)?n[uú]mero\s+del\s+Proceso\s+de\s+Contrataci[oó]n\s*\]/i, () => ent.referencia, "numero_proceso", "Número del proceso");
    if (ent.ciudad && iSenores != null && posEnTexto(k) > posEnTexto(iSenores) && posEnTexto(k) <= posEnTexto(iSenores) + 4)
      reemplazar(k, /\[\s*Ciudad\s*\]/i, () => ent.ciudad, "ciudad_entidad", "Ciudad de la entidad");
    /* (revisión adversaria) el objeto va SOLO en el «Objeto:» vacío del encabezado: a lo sumo tres renglones bajo la
       REFERENCIA, y seguido del lote o del saludo. Ni la columna «OBJETO» de una tabla de experiencia, ni un «Objeto:» con
       el objeto que la entidad ya escribió debajo */
    if (/^\s*referencia\s*:/i.test(t)) iRef = posEnTexto(k);
    const sigT = conTexto[posEnTexto(k) + 1] != null ? ps[conTexto[posEnTexto(k) + 1]].t : "";
    if (ent.objeto && /^\s*objeto\s*:\s*$/i.test(ps[k].t) && iSenores != null && !objetoDelBloque && iRef >= 0 && posEnTexto(k) - iRef <= 3 && /^\s*(?:\[|estimad|lote\b)/i.test(sigT)) {
      if (escribir(k, ps[k].t.length, ps[k].t.length, ent.objeto)) { anotar("objeto", "Objeto", ps[k], ent.objeto); objetoDelBloque = true; }
    }
    // ── el PROPONENTE ──
    if (juridico) {
      const tieneJur = /\[\s*(?:Nombre\s+del\s+proponente|Nombre\s+del\s+Proponente\s*-\s*persona\s+jur[ií]dica|Indicar\s+nombre\s+del\s+Proponente)\s*\]/i.test(ps[k].t);
      if (datos.representante_legal) reemplazar(k, /\[\s*Nombre\s+del\s+representante\s+legal\s+del\s+proponente\s*\]/i, () => datos.representante_legal, "representante_legal", "Nombre del representante legal");
      /* «…de [persona jurídica] o [persona natural] o [Nombre del representante del Proponente Plural] en adelante…» (Formato 9):
         tras «o» es una alternativa más, que se quita como la de la persona natural; sola, lleva el nombre del representante */
      if (tieneJur) reemplazar(k, /\s+o\s+\[\s*Nombre\s+del\s+representante\s+del\s+Proponente\s+Plural\s*\]/i, () => "", "razon_social", "Nombre del proponente");
      if (datos.representante_legal && (tipo === "consorcio" || tipo === "union_temporal")) reemplazar(k, /\[\s*Nombre\s+del\s+representante\s+del\s+Proponente\s+Plural\s*\]/i, () => datos.representante_legal, "representante_legal", "Nombre del representante legal");
      if (datos.razon_social) {
        reemplazar(k, /\[\s*(?:Nombre\s+del\s+proponente|Nombre\s+del\s+Proponente\s*-\s*persona\s+jur[ií]dica|Indicar\s+nombre\s+del\s+Proponente)\s*\]/i, () => datos.razon_social, "razon_social", "Nombre del proponente");
        // la alternativa de la persona natural: se quita si al lado va el nombre de la empresa; si no, el nombre va en su lugar
        reemplazar(k, tieneJur ? /\s+o\s+\[\s*Nombre\s+del\s+Proponente\s*-\s*persona\s+natural\s*\]/i : /\bo\s+\[\s*Nombre\s+del\s+Proponente\s*-\s*persona\s+natural\s*\]/i,
          () => (tieneJur ? "" : datos.razon_social), "razon_social", "Nombre del proponente");
      }
    }
    // «Dirección y ciudad» va en el mismo renglón o en la celda de al lado (el renglón anterior con texto)
    const previo = posEnTexto(k) > 0 ? ps[conTexto[posEnTexto(k) - 1]].t : "";
    const antes3 = conTexto.slice(Math.max(0, posEnTexto(k) - 3), posEnTexto(k)).map((i) => ps[i].t).join("\n");
    if (datos.persona_contacto && /^\s*persona\s+de\s+contacto\s*:?\s*$/i.test(previo) && /recibir[eé]\s+notificaciones/i.test(antes3))
      reemplazar(k, /^\s*\[\s*Nombre\s*\]\s*$/, () => datos.persona_contacto, "persona_contacto", "Persona de contacto");
    if (datos.direccion) reemplazar(k, /\[\s*Direcci[oó]n\s+de\s+la\s+compa[ñn][ií]a\s*\]/i, (m, tt) => ((/direcci[oó]n\s+y\s+ciudad/i.test(tt) || /^\s*direcci[oó]n\s+y\s+ciudad\s*:?\s*$/i.test(previo)) && datos.ciudad ? `${datos.direccion} – ${datos.ciudad}` : datos.direccion), "direccion", "Dirección");
    if (datos.telefono) reemplazar(k, /\[\s*Tel[eé]fono\s+de\s+la\s+compa[ñn][ií]a\s*\]/i, () => datos.telefono, "telefono", "Teléfono");
    if (datos.correo) reemplazar(k, /\[\s*Direcci[oó]n\s+de\s+correo\s+electr[oó]nico\s+de\s+la\s+compa[ñn][ií]a\s*\]/i, () => datos.correo, "correo", "Correo electrónico");
    // ── el bloque de firma de la carta: la dirección POSTAL y el telefax ──
    if (/^\s*nombre\s+del\s+proponente\b/i.test(t)) iNombreProp = posEnTexto(k);
    const cerca = iNombreProp >= 0 && posEnTexto(k) - iNombreProp <= 12;
    if (cerca && datos.direccion && /^\s*direcci[oó]n\s+de\s+correo\s*:?\s*_{3,}\s*$/i.test(ps[k].t.replace(/\t/g, " "))) {
      const sig = conTexto[posEnTexto(k) + 1];
      if (sig != null && /^\s*correo\s+electr[oó]nico/i.test(ps[sig].t)) {
        const a = ps[k].t.indexOf("_"), b = ps[k].t.lastIndexOf("_") + 1;
        if (escribir(k, a, b, `${/\s/.test(ps[k].t[a - 1] || " ") ? "" : " "}${datos.direccion}`)) anotar("direccion", "Dirección (la postal: «Dirección de correo»)", ps[k], datos.direccion);
      }
    }
    if (cerca && datos.telefono && /^\s*telefax\s*:?\s*_{3,}\s*$/i.test(ps[k].t.replace(/\t/g, " "))) {
      const a = ps[k].t.indexOf("_"), b = ps[k].t.lastIndexOf("_") + 1;
      if (escribir(k, a, b, `${/\s/.test(ps[k].t[a - 1] || " ") ? "" : " "}${datos.telefono}`)) anotar("telefono", "Teléfono (en «Telefax»)", ps[k], datos.telefono);
    }
  }
  // ── las X: «El proponente es», «grupo empresarial», «cotiza en bolsa» ──
  const marcar = (k, re, nombre, campo) => {
    const m = re.exec(ps[k].t);
    if (!m) return false;
    const blanco = m[m.length - 1], a = m.index + m[0].length - blanco.length;
    // la X en medio de la raya; con una raya de dos («Persona natural__»), «_X_», para que no quede pegada a la palabra
    const n = Math.max(3, blanco.length), x = `${"_".repeat(Math.floor((n - 1) / 2))}X${"_".repeat(n - 1 - Math.floor((n - 1) / 2))}`;
    if (!escribir(k, a, a + blanco.length, x)) return false;
    anotar(campo, nombre, ps[k], "X");
    return true;
  };
  const ETQ_TIPO = { persona_natural: String.raw`persona\s+natural`, persona_juridica: String.raw`persona\s+jur[ií]dica\s+nacional`, consorcio: String.raw`consorcio`, union_temporal: String.raw`uni[oó]n\s+temporal` };
  const iEs = conTexto.find((k) => /el\s+proponente\s+es\s*:/i.test(ps[k].t));
  if (tipo && iEs != null) {
    const re = new RegExp(String.raw`(?:^|[\s_])${ETQ_TIPO[tipo]}\s*(_{2,})`, "i");
    // la lista va en el mismo renglón o en los siguientes (una opción por renglón): hasta ocho
    for (const k of conTexto.slice(posEnTexto(iEs), posEnTexto(iEs) + 9)) if (marcar(k, re, "El proponente es", "tipo_proponente")) break;
  }
  const siNo = (campo, reRenglon, nombre) => {
    const v = datos[campo];
    if (v !== "si" && v !== "no") return;
    const k = conTexto.find((i) => reRenglon.test(ps[i].t));
    if (k == null) return;
    marcar(k, v === "si" ? new RegExp(reRenglon.source + String.raw`\s*s[ií]\s*(_{2,})`, "i") : new RegExp(reRenglon.source + String.raw`\s*s[ií]\s*_{2,}\s*no\s*(_{2,})`, "i"), nombre, campo);
  };
  siNo("grupo_empresarial", /pertenece\s+a\s+un\s+grupo\s+empresarial\s*:/i, "Pertenece a un grupo empresarial");
  siNo("cotiza_bolsa", /cotiza\s+en\s+bolsa\s*:/i, "Cotiza en bolsa");
  /* lo que queda entre corchetes y es un dato: se dice. El aval de la nota 1 («…no sea un ingeniero») no cuenta: es para
     cuando el representante no es ingeniero */
  for (const k of conTexto) for (const m of (/\bavalo\s+la\s+presente/i.test(ps[k].t) ? [] : ps[k].t.matchAll(RE_CORCHETE_CAMPO))) {
    const c = m[0].replace(/\s+/g, " ");
    if (!RE_CORCHETE_INSTRUCCION.test(c) && !pendientes.includes(c)) pendientes.push(c);
  }
  let out = "", ultimo = 0;
  for (const p of ps) { out += xml.slice(ultimo, p.inicio) + p.xml; ultimo = p.inicio + p.largo; }
  out += xml.slice(ultimo);
  // la composición accionaria de la carta: la tabla de los accionistas de cada sociedad no se llena sola
  if (juridico && conTexto.some((k) => /composici[oó]n\s+accionaria/i.test(ps[k].t))) pendientes.push("La tabla de la composición accionaria (los accionistas de cada sociedad)");
  return { xml: out.replace(/\u0000(\d+)\u0000/g, (x, i) => cuadros[Number(i)]), llenados, pendientes: pendientes.slice(0, 12) };
}

/* El .docx de la entidad (Buffer) + los datos → { ok, buf, llenados, sin_dato,
   dudosos, hay_consorcio, para_persona_natural } | { ok:false, motivo } */
/* LA FIRMA (5-nov-2026, encargo del dueño: «ya tengo la firma, al final sí se añadirá»). La imagen que el usuario elige en
   el navegador —no se guarda en ninguna parte— se pone UNA vez, encima del renglón de firma del PROPONENTE o de su
   REPRESENTANTE LEGAL. El falso caro es la firma en el renglón de otro, en un documento que se firma bajo juramento: la
   revisión adversaria (5-nov-2026, reproducido) la vio caer en el del contratante de una certificación de experiencia, en
   la carta de compromiso del profesional y sobre el renglón del revisor fiscal. Por eso la regla es POSITIVA:
   - «Firma del proponente / del oferente …» sí;
   - «Firma del representante legal» sí, solo si lo que sigue está vacío o dice «del proponente», «del oferente», «de la
     sociedad», «de la empresa» o «o apoderado»;
   - «Firma:» o «(Firma)» sueltos, solo si el primer renglón con texto que los sigue (hasta tres) nombra al representante
     legal o al proponente y no a otra persona;
   - y en ningún caso si el renglón, o ese siguiente, nombra a otra persona (`NO_ES_DEL_PROPONENTE`).
   Además: un documento en el que no se llenó ninguna casilla del proponente no se firma (no parece suyo), ni el documento
   del consorcio (lo firma cada integrante). Ante la duda, no se pone y se dice por qué. */
/* el rótulo puede ir entre paréntesis o entre corchetes: los formatos tipo de Colombia Compra dicen «[Firma del Proponente o
   de su representante Legal]» (medido en 150 formatos reales del corpus, 5-nov-2026: 21 llenos se quedaban sin firma) */
const RE_RENGLON_FIRMA = /^[\s_.\-–]*[([]?\s*(?:nombre\s+y\s+)?firma(?![a-zñ])/i;
const NO_ES_DEL_PROPONENTE = /contador|revisor\s+fiscal|integrante|entidad|interventor|supervisor|testigo|notar|contratante|contratista|cliente|banco|bancari|asegurador|seguros|cr[eé]dito|financier|garant|avalista|fiador|profesional|director|residente|ingenier|arquitect|abona|certific|consorcio|uni[oó]n\s+temporal|socio|accionista|trabajador|empleado|personal/i;
/* «Nombre de quien firma» debajo de «Firma:» es el bloque del proponente en las proformas de la UPN (8 de 33 ofertas presentadas
   leídas en el Drive del dueño, 5-nov-2026); si quien firma es el contador o el revisor fiscal, el renglón lo dice y manda
   `NO_ES_DEL_PROPONENTE`, que se mira primero */
const ES_DEL_PROPONENTE = /representante\s+legal|proponente|oferente|nombre\s+de\s+quien\s+firma/i;
const RESTO_RL_VALIDO = /^(?:$|del\s+(?:proponente|oferente)\b|de\s+la\s+(?:sociedad|empresa)\b|o\s+(?:de\s+su\s+)?apoderado\b|[)\]])/i;
function esFirmaDelProponente(t, siguientes) {
  if (!RE_RENGLON_FIRMA.test(t) || NO_ES_DEL_PROPONENTE.test(t)) return false;
  const resto = t.replace(RE_RENGLON_FIRMA, "").replace(/^[\s:_.\-–)\]]+/, "").trim();
  if (/^(?:del|de\s+la)\s+(?:proponente|oferente)\b/i.test(resto)) return true;
  const rl = /^del\s+representante\s+legal\b/i.exec(resto);
  if (rl) return RESTO_RL_VALIDO.test(resto.slice(rl[0].length).replace(/^[\s,]+/, "").trim());
  if (/^(?:del?|de\s+la|de\s+los)\s/i.test(resto)) return false;         // «Firma de quien…», «Firma del garante»: de otro
  /* suelto («Firma:», «(Firma)», «Firma: ____ Nombre: ____»): decide lo que viene después, empezando por el mismo renglón */
  for (const x of [resto, ...siguientes]) {
    if (!x || /^[\s_.\-–:()]*$/.test(x)) continue;
    const y = x.replace(/matr[ií]cula\s+profesional/gi, " ");      // la del representante no es «de un profesional»
    if (NO_ES_DEL_PROPONENTE.test(y)) return false;
    if (ES_DEL_PROPONENTE.test(y)) return true;
  }
  return false;
}
/* el PNG o el JPG se reconoce por sus bytes, no por el nombre: un PNG con su cabecera IHDR y su cierre IEND; un JPG con su
   marco de dimensiones. Medidas absurdas (0 o más de 10.000 px) no son una firma */
function tamanoImagen(bytes) {
  const b = Buffer.from(bytes);
  const sana = (x) => (x && x.ancho >= 1 && x.alto >= 1 && x.ancho <= 10000 && x.alto <= 10000 ? x : null);
  if (b.length > 45 && b.readUInt32BE(0) === 0x89504e47 && b.readUInt32BE(4) === 0x0d0a1a0a && b.toString("latin1", 12, 16) === "IHDR"
    && b.lastIndexOf(Buffer.from("IEND", "latin1")) > 33) return sana({ tipo: "png", ancho: b.readUInt32BE(16), alto: b.readUInt32BE(20) });
  if (b.length > 4 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) {
    for (let i = 2; i + 9 < b.length;) {
      if (b[i] !== 0xff) return null;
      const m = b[i + 1];
      if ((m >= 0xc0 && m <= 0xc3) || (m >= 0xc5 && m <= 0xc7) || (m >= 0xc9 && m <= 0xcb) || (m >= 0xcd && m <= 0xcf)) return sana({ tipo: "jpeg", alto: b.readUInt16BE(i + 5), ancho: b.readUInt16BE(i + 7) });
      i += 2 + b.readUInt16BE(i + 2);
    }
  }
  return null;
}
const ID_FIRMA = "rIdFirmaDetekta";
/* el tamaño: cabe en 4,5 cm × 2,5 cm sin deformarse (la revisión vio una firma de 20:1 aplastada a 9:1) */
function medidaFirma(ancho, alto) {
  const MAX_X = 1620000, MAX_Y = 900000;                         // EMU: 4,5 cm y 2,5 cm
  let cx = MAX_X, cy = Math.round(MAX_X * alto / ancho);
  if (cy > MAX_Y) { cy = MAX_Y; cx = Math.round(MAX_Y * ancho / alto); }
  return { cx: Math.max(1, cx), cy: Math.max(1, cy) };
}
function ponerFirmaEnXml(xml, { ancho, alto }) {
  const { cx, cy } = medidaFirma(ancho, alto);
  const ps = [...xml.matchAll(RE_PARRAFO)].map((m) => ({ index: m.index, t: piezasDe(m[0]).texto.replace(/\s+/g, " ").trim() }));
  for (let k = 0; k < ps.length; k++) {
    const { t } = ps[k];
    if (!t) continue;
    const siguientes = ps.slice(k + 1).filter((x) => x.t && !/^[\s_.\-–]*$/.test(x.t)).slice(0, 3).map((x) => x.t);
    if (!esFirmaDelProponente(t, siguientes)) continue;
    /* si la raya de la firma va sola en el renglón de arriba («______» y debajo «Firma del representante legal»), la imagen
       va encima de la raya, no entre la raya y el rótulo */
    let donde = ps[k].index;
    for (let q = k - 1; q >= 0 && q >= k - 2; q--) {
      if (!ps[q].t) continue;
      if (/^[_.\-–\s]{3,}$/.test(ps[q].t)) donde = ps[q].index;
      break;
    }
    const dibujo = `<w:p xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><w:r><w:drawing>`
      + `<wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="${cx}" cy="${cy}"/><wp:docPr id="90017" name="Firma"/>`
      + `<a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">`
      + `<pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:nvPicPr><pic:cNvPr id="90017" name="firma"/><pic:cNvPicPr/></pic:nvPicPr>`
      + `<pic:blipFill><a:blip r:embed="${ID_FIRMA}"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill>`
      + `<pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic>`
      + `</a:graphicData></a:graphic></wp:inline></w:drawing></w:r></w:p>`;
    return { xml: xml.slice(0, donde) + dibujo + xml.slice(donde), renglon: contexto(t) };
  }
  return { xml, renglon: null };
}
/* las relaciones y los tipos del paquete, con la imagen: se añaden, no se reemplaza lo que había. Admite la etiqueta
   autocerrada (`<Relationships …/>`, la revisión la vio fallar muda); si no se puede añadir, devuelve null y la firma no se
   pone: una imagen sin su relación es una referencia rota */
function conRelacionFirma(rels, archivo) {
  const s = String(rels || '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"></Relationships>');
  if (new RegExp(`Id="${ID_FIRMA}"`).test(s)) return null;               // ya hay una con ese Id: no se pisa
  const rel = `<Relationship Id="${ID_FIRMA}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/${archivo}"/>`;
  if (/<\/Relationships>\s*$/.test(s)) return s.replace(/<\/Relationships>\s*$/, `${rel}</Relationships>`);
  if (/<Relationships\b[^>]*\/>\s*$/.test(s)) return s.replace(/<Relationships\b([^>]*?)\s*\/>\s*$/, `<Relationships$1>${rel}</Relationships>`);
  return null;
}
function conTipoImagen(tipos, ext) {
  const s = String(tipos || "");
  if (new RegExp(`<Default\\s+Extension="${ext}"`, "i").test(s)) return s;
  const def = `<Default Extension="${ext}" ContentType="image/${ext === "jpg" ? "jpeg" : ext}"/>`;
  if (/<\/Types>\s*$/.test(s)) return s.replace(/<\/Types>\s*$/, `${def}</Types>`);
  if (/<Types\b[^>]*\/>\s*$/.test(s)) return s.replace(/<Types\b([^>]*?)\s*\/>\s*$/, `<Types$1>${def}</Types>`);
  return null;
}

function llenarFormato(buf, datosCrudos, { nombre = "", firma = null, contexto = null } = {}) {
  if (!esZip(buf)) return { ok: false, motivo: "no es un documento de Word (.docx)" };
  let e;
  try { e = entradaZip(buf, "word/document.xml"); } catch { e = { motivo: "el documento está dañado" }; }
  if (!e.datos) return { ok: false, motivo: e.motivo };
  const datos = normalizarDatos(datosCrudos);
  // los campos de Word cuyo texto es un corchete, primero: así ni la tabla ni la plantilla escriben al lado de un «[Nombre]» que se ve
  const r = llenarXml(camposDeWordATexto(e.datos.toString("utf8")), datos, { nombre });
  /* la plantilla de Colombia Compra, completa (lo de la entidad, los corchetes del proponente y las X), salvo en el documento
     del consorcio; lo que quedó entre corchetes se dice */
  r.pendientes = [];
  if (!r.hay_consorcio) {
    const c = completarPlantilla(r.xml, datos, contexto || {});
    r.xml = c.xml; r.llenados = [...r.llenados, ...c.llenados]; r.pendientes = c.pendientes;
    // lo que la plantilla llenó ya no es «dudoso» (la dirección postal de «Dirección de correo»)
    if (c.llenados.some((x) => x.campo === "direccion")) r.dudosos = r.dudosos.filter((x) => !(x.campo === "direccion" && /^direcci[oó]n\s+de\s+correo/i.test(x.renglon)));
  }
  const resumen = { llenados: r.llenados, sin_dato: r.sin_dato, dudosos: r.dudosos, pendientes: r.pendientes, hay_consorcio: r.hay_consorcio, para_persona_natural: r.para_persona_natural, ofrecimiento: !!r.ofrecimiento, declaracion: !!r.declaracion, firma: null };
  /* la firma: solo si el documento NO es del consorcio, si se llenó alguna casilla del proponente, y una sola vez */
  let xml = r.xml;
  const img = firma ? tamanoImagen(firma) : null;
  const ext = img && img.tipo === "png" ? "png" : "jpg";
  const archivo = `firma_detekta.${ext}`;
  let relsNuevo = null, tiposNuevo = null, traeRels = false;
  if (firma && !img) resumen.firma = { puesta: false, motivo: "la imagen de la firma no es un PNG ni un JPG que se pueda abrir" };
  else if (img && r.hay_consorcio) resumen.firma = { puesta: false, motivo: "el documento del consorcio lo firma cada integrante" };
  else if (img && r.ofrecimiento) resumen.firma = { puesta: false, motivo: "es un ofrecimiento que da puntaje y compromete: fírmelo usted si decide ofrecerlo" };
  else if (img && r.declaracion) resumen.firma = { puesta: false, motivo: "declara bajo juramento una condición (Mipyme, mujeres, discapacidad…): fírmelo usted si la cumple" };
  else if (img && !r.llenados.some((x) => !CAMPOS_DE_LA_ENTIDAD.has(x.campo))) resumen.firma = { puesta: false, motivo: "no se llenó ninguna casilla del proponente: no parece un formato que firme usted" };
  else if (img) {
    const rels = entradaZip(buf, "word/_rels/document.xml.rels");
    const tipos = entradaZip(buf, "[Content_Types].xml");
    traeRels = !!rels.datos;
    relsNuevo = conRelacionFirma(rels.datos ? rels.datos.toString("utf8") : null, archivo);
    tiposNuevo = tipos.datos ? conTipoImagen(tipos.datos.toString("utf8"), ext) : null;
    if (relsNuevo === null || tiposNuevo === null) resumen.firma = { puesta: false, motivo: "el documento no admite una imagen nueva (sus relaciones o sus tipos no se pudieron leer)" };
    else {
      const f = ponerFirmaEnXml(xml, img);
      xml = f.xml;
      resumen.firma = f.renglon ? { puesta: true, renglon: f.renglon } : { puesta: false, motivo: "no se encontró el renglón de firma del proponente o de su representante legal" };
    }
  }
  const conFirma = !!(resumen.firma && resumen.firma.puesta);
  if (!r.llenados.length) return { ok: true, buf: null, ...resumen };
  const reemplazos = { "word/document.xml": Buffer.from(xml, "utf8") };
  const nuevas = [];
  if (conFirma) {
    const rb = Buffer.from(relsNuevo, "utf8");
    if (traeRels) reemplazos["word/_rels/document.xml.rels"] = rb; else nuevas.push({ nombre: "word/_rels/document.xml.rels", datos: rb });
    reemplazos["[Content_Types].xml"] = Buffer.from(tiposNuevo, "utf8");
    nuevas.push({ nombre: `word/media/${archivo}`, datos: Buffer.from(firma) });
  }
  const z = reescribirZip(buf, { reemplazos, nuevas });
  if (!z.ok) return { ok: false, motivo: z.motivo };
  return { ok: true, buf: z.buf, ...resumen };
}

module.exports = { camposDeWordATexto, completarPlantilla, TIPOS_PROPONENTE, ES_OFRECIMIENTO, ES_DECLARACION_DE_CONDICION, esFirmaDelProponente, NO_ES_DEL_PROPONENTE, tamanoImagen, medidaFirma, ponerFirmaEnXml, conRelacionFirma, conTipoImagen, llenarFormato, llenarXml, normalizarDatos, blancoDe, CAMPOS_DATOS, piezasDe, escribirEnParrafo, PLURAL };
