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
     (1) se llenan solo las etiquetas INEQUÍVOCAS del proponente (razón social,
         NIT, nombre y cédula del representante legal) y, las que se llaman
         igual en otros sitios (dirección, ciudad, teléfono, correo), SOLO
         cerca —en los 14 párrafos siguientes— de una etiqueta inequívoca: es
         el bloque de datos del proponente, no el encabezado de la entidad;
     (2) jamás se llena un marcador entre corchetes («[nombre]»): en los
         formatos reales son de la entidad, del contador o de cada integrante;
     (3) a partir del primer párrafo que habla de los integrantes de un
         consorcio o unión temporal no se llena nada (el mismo archivo trae a
         veces la carta y, después, el documento del consorcio);
     (4) un dato que el usuario no guardó no se inventa: la casilla queda en
         blanco y se dice qué falta;
     (5) todo lo que se llenó se lista con el texto de su renglón, para que
         el usuario lo revise antes de firmar.
   Función PURA sobre el XML (sin red ni Redis): el servidor la llama con el
   archivo que bajó por el puente SSRF-endurecido de lib/apu_descargar.
   ========================================================================== */
"use strict";

const { entradaZip, reemplazarEntrada, desescapar, esZip } = require("./docx.js");

/* Los campos, en el orden en que se buscan dentro de un párrafo (el más
   específico primero: «Dirección de correo electrónico» es CORREO, no dirección;
   «Cédula de ciudadanía del Representante legal» es la cédula, no el nombre). */
const CAMPOS = [
  { clave: "representante_documento", nombre: "Cédula del representante legal", fuerte: true,
    re: /(?:c[eé]dula\s+de\s+ciudadan[ií]a|identificaci[oó]n|documento\s+de\s+identidad)\s+del\s+representante\s+legal/i },
  { clave: "correo", nombre: "Correo electrónico", fuerte: false,
    re: /correos?\s+electr[oó]nicos?|direcci[oó]n\s+(?:de\s+)?correo(?:\s+electr[oó]nico)?|direcci[oó]n\s+electr[oó]nica|\be-?mail\b/i },
  { clave: "razon_social", nombre: "Nombre o razón social del proponente", fuerte: true,
    re: /nombre\s+(?:completo\s+)?(?:o\s+raz[oó]n\s+social\s+)?del\s+proponente(?!\s+o\s+de\s+su)|raz[oó]n\s+social(?:\s+del\s+proponente)?(?!\s+o\s+de\s+su)/i },
  { clave: "representante_legal", nombre: "Nombre del representante legal", fuerte: true,
    re: /nombre\s+del\s+representante\s+legal|^\s*representante\s+legal\b/i },
  { clave: "nit", nombre: "NIT", fuerte: true,
    re: /\bnit\b\.?|identificaci[oó]n\s+(?:tributaria\s+)?del\s+proponente/i },
  { clave: "representante_documento", nombre: "Cédula del representante legal", fuerte: false, soloTrasRepresentante: true,
    re: /^\s*c\.\s?c\.(?:\s*no\.?)?/i },
  { clave: "direccion", nombre: "Dirección", fuerte: false,
    re: /direcci[oó]n(?:\s+f[ií]sica)?(?!\s+(?:de\s+)?(?:correo|electr))/i },
  { clave: "telefono", nombre: "Teléfono", fuerte: false, re: /tel[eé]fonos?(?![a-z])|\bcelular\b/i },
  { clave: "ciudad", nombre: "Ciudad", fuerte: false, re: /\bciudad\b/i },
];
const CAMPOS_DATOS = ["razon_social", "nit", "representante_legal", "representante_documento", "direccion", "ciudad", "telefono", "correo"];
const VENTANA = 14;          // párrafos (con texto) después de una etiqueta inequívoca
const LARGO_MAX_VALOR = 200;

/* el blanco que sigue a la etiqueta: guiones bajos (con, en medio, un «:», un
   «No.», una nota entre paréntesis o corchetes y el número de una nota al pie) */
const BLANCO = /^\s*(?:\([^)]{0,60}\)|\[[^\]]{0,60}\])?[\s:.\-–—]*(?:no\.?\s*)?\d?\s*[\-–—]?\s*(_{3,})/i;
/* o la etiqueta termina en «:» y el párrafo no dice nada más */
const SOLO_DOS_PUNTOS = /^\s*:\s*$/;
/* el documento del consorcio o de la unión temporal */
/* solo las frases que únicamente trae el documento del consorcio: una carta de
   presentación dice «…o de los integrantes del Consorcio…» entre paréntesis
   (medido: ANEXO 3 de CO1.BDOS.10816985) y eso no la vuelve de consorcio */
const PLURAL = /(?:consorcio|uni[oó]n\s+temporal)\s+se\s+denomina|(?:el|la)\s+(?:consorcio|uni[oó]n\s+temporal)\s+est[aá]\s+(?:integrad|conformad)[oa]/i;

const escaparXml = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const limpiarValor = (v) => {
  if (v == null) return null;
  const s = String(v).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "").replace(/\s+/g, " ").trim();
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
   corrida con el valor antes de `</w:p>`. */
function anadirCorrida(xmlParrafo, valor) {
  const i = xmlParrafo.lastIndexOf("</w:p>");
  if (i < 0) return null;
  return `${xmlParrafo.slice(0, i)}<w:r><w:t xml:space="preserve">${escaparXml(valor)}</w:t></w:r>${xmlParrafo.slice(i)}`;
}

const RE_PARRAFO = /<w:p(?=[\s>])[^>]*>[\s\S]*?<\/w:p>/g;
const contexto = (t) => t.replace(/\s+/g, " ").trim().slice(0, 140);

/* El XML de `word/document.xml` → { xml, llenados, sin_dato, dudosos, hay_consorcio }.
   `datos`: los de normalizarDatos. UNA sola pasada en el orden del documento
   (tablas y párrafos intercalados), para que cada celda se trate UNA vez: con
   dos pasadas, la etiqueta «Nombre o Razón Social del Proponente:» de una
   celda recibía el dato en la celda de al lado Y, por terminar en «:», también
   en la suya (medido en la primera versión de la prueba). */
function llenarXml(xml, datos) {
  const llenados = [], sinDato = [], dudosos = [];
  let desdeFuerte = Infinity;         // párrafos con texto desde la última casilla del bloque del proponente
  let previoRepresentante = false;    // el párrafo anterior con texto era el nombre del representante
  let plural = false;
  const anotar = (lista, campo, t, extra = {}) => lista.push({ campo: campo.clave, nombre: campo.nombre, renglon: contexto(t), ...extra });

  function procesarParrafo(p) {
    if (/<w:p[\s>]/.test(p.slice(4))) return p;          // un cuadro de texto dentro: no se toca
    let { texto } = piezasDe(p);
    if (!texto.trim()) return p;
    if (plural || PLURAL.test(texto)) { plural = true; return p; }
    desdeFuerte++;
    let actual = p, eraRepresentante = false;
    const usados = new Set();
    for (const campo of CAMPOS) {
      if (usados.has(campo.clave)) continue;
      const m = campo.re.exec(texto);
      if (!m) continue;
      const tras = m.index + m[0].length;
      const resto = texto.slice(tras);
      const b = BLANCO.exec(resto);
      let a0 = null, a1 = null;
      if (b) { a1 = tras + b.index + b[0].length; a0 = a1 - b[1].length; }
      else if (SOLO_DOS_PUNTOS.test(resto)) { a0 = texto.length; a1 = texto.length; }
      else continue;                                        // la palabra aparece, pero no hay casilla que llenar
      usados.add(campo.clave);
      if (campo.fuerte) desdeFuerte = 0;
      if (campo.clave === "representante_legal") eraRepresentante = true;
      if (campo.soloTrasRepresentante && !previoRepresentante) { anotar(dudosos, campo, texto, { motivo: "no se sabe de quién es esta cédula" }); continue; }
      if (!campo.fuerte && !campo.soloTrasRepresentante && desdeFuerte > VENTANA) { anotar(dudosos, campo, texto, { motivo: "no está en el bloque de datos del proponente" }); continue; }
      const valor = datos[campo.clave];
      if (!valor) { anotar(sinDato, campo, texto); continue; }
      const nuevo = escribirEnParrafo(actual, a0, a1, valor);
      if (!nuevo) continue;
      actual = nuevo;
      texto = piezasDe(actual).texto;
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
      const etiqueta = celdas[i].texto.replace(/[:.\s]+$/, "");
      const campo = vecina && CAMPOS.find((c) => c.fuerte && !c.soloTrasRepresentante && c.re.test(etiqueta) && etiqueta.replace(c.re, "").replace(/[\s:.()]/g, "").length <= 3);
      if (campo && (!vecina.texto || /^_{3,}$/.test(vecina.texto))) {
        tratadas.add(i); tratadas.add(i + 1);
        desdeFuerte = 0;
        const valor = datos[campo.clave];
        if (!valor) { anotar(sinDato, campo, celdas[i].texto); continue; }
        const parrafos = vecina.xml.match(RE_PARRAFO) || [];
        if (!parrafos.length) continue;
        const pieza = piezasDe(parrafos[0]);
        const nuevoP = vecina.texto ? escribirEnParrafo(parrafos[0], pieza.texto.indexOf("_"), pieza.texto.lastIndexOf("_") + 1, valor) : anadirCorrida(parrafos[0], valor);
        if (!nuevoP) continue;
        vecina.xml = vecina.xml.replace(parrafos[0], () => nuevoP);
        anotar(llenados, campo, `${celdas[i].texto} ${valor}`, { valor });
        continue;
      }
      celdas[i].xml = celdas[i].xml.replace(RE_PARRAFO, (p) => procesarParrafo(p));
    }
    let out = "", ultimo = 0;
    for (const c of celdas) { out += fila.slice(ultimo, c.inicio) + c.xml; ultimo = c.inicio + c.largo; }
    return out + fila.slice(ultimo);
  }

  xml = xml.replace(/<w:tbl(?=[\s>])[^>]*>[\s\S]*?<\/w:tbl>|<w:p(?=[\s>])[^>]*>[\s\S]*?<\/w:p>/g, (bloque) => {
    if (bloque.startsWith("<w:tbl")) {
      if (/<w:tbl[\s>]/.test(bloque.slice(6))) return bloque;   // tabla anidada: no se toca
      return bloque.replace(/<w:tr(?=[\s>])[^>]*>[\s\S]*?<\/w:tr>/g, (fila) => procesarFila(fila));
    }
    return procesarParrafo(bloque);
  });
  return { xml, llenados, sin_dato: sinDato, dudosos, hay_consorcio: plural };
}

/* El .docx de la entidad (Buffer) + los datos → { ok, buf, llenados, sin_dato,
   dudosos, hay_consorcio } | { ok:false, motivo } */
function llenarFormato(buf, datosCrudos) {
  if (!esZip(buf)) return { ok: false, motivo: "no es un documento de Word (.docx)" };
  let e;
  try { e = entradaZip(buf, "word/document.xml"); } catch { e = { motivo: "el documento está dañado" }; }
  if (!e.datos) return { ok: false, motivo: e.motivo };
  const datos = normalizarDatos(datosCrudos);
  const r = llenarXml(e.datos.toString("utf8"), datos);
  if (!r.llenados.length) return { ok: true, buf: null, ...r, xml: undefined };
  const z = reemplazarEntrada(buf, "word/document.xml", Buffer.from(r.xml, "utf8"));
  if (!z.ok) return { ok: false, motivo: z.motivo };
  return { ok: true, buf: z.buf, llenados: r.llenados, sin_dato: r.sin_dato, dudosos: r.dudosos, hay_consorcio: r.hay_consorcio };
}

module.exports = { llenarFormato, llenarXml, normalizarDatos, CAMPOS_DATOS, piezasDe, escribirEnParrafo };
