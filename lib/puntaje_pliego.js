"use strict";
/* ============================================================================
   lib/puntaje_pliego · Los puntos fuera del precio, uno por uno: cuáles da el pliego y cuáles puede acreditar usted
   ----------------------------------------------------------------------------
   PLAN_X20, tanda 5 (12-nov-2026). PURO: sin red ni Redis. Donde llegan una o dos ofertas, el precio casi no separa
   (con dos hábiles los cuatro métodos favorecen a la más baja por menos de un punto) y 0,25 de Mipyme o de empresa de
   mujeres voltea el resultado (docs/PLAN_X20.md § 2.5, hecho 2).

   La tabla que se lee (DocBase de menor cuantía de transporte V3, capítulo IV, leído el 11-nov-2026 del paquete oficial
   de Colombia Compra): «Concepto · Puntaje máximo»: Oferta económica 49,5 · Factor de calidad 30 · Apoyo a la industria
   nacional 20 · Emprendimientos y empresas de mujeres 0,25 · Mipyme 0,25 · Total 100; y una segunda tabla para las
   convocatorias limitadas a Mipyme (la económica sube a 49,75 y la fila de Mipyme sale). Lo que dice el mismo documento
   de cada factor y que este módulo repite al usuario:
   · Mipyme (4.5): «para obtener el puntaje, el Proponente entregará copia del certificado del Registro Único de
     Proponentes… vigente y en firme al momento de su presentación»; subsanarlo NO vale para el puntaje; en un plural,
     «por lo menos uno de los integrantes acredita la calidad de Mipyme y tiene una participación igual o superior al
     diez por ciento (10%)» (la regla de lib/perfiles.esMipyme, que se LLAMA);
   · empresas de mujeres (4.4): «debe diligenciar el Formato 12… y aportar la documentación requerida», con la misma
     regla del 10 % en un plural;
   · y las entidades «deberán reducir… dos (2) puntos a los Proponentes que se les haya impuesto una o más multas o
     cláusulas penales durante el último año».
   Lo que no se puede saber desde aquí (si la empresa es de mujeres, si tiene multas, qué exige el factor de calidad de
   ESTE pliego) se dice «por confirmar», nunca «sí» ni «no».
   ============================================================================ */

const plegar = (s) => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const CIFRA_RE = /(\d{1,3}(?:[.,]\d{1,2})?)\s*(?:puntos?)?\s*$/;

const FACTORES = Object.freeze([
  { clave: "economica", re: /oferta\s+economica|precio|propuesta\s+economica/ },
  { clave: "calidad", re: /calidad/ },
  { clave: "industria_nacional", re: /industria\s+nacional/ },
  { clave: "mujeres", re: /mujer/ },
  { clave: "mipyme", re: /mipyme/ },
  { clave: "discapacidad", re: /discapacidad/ },
]);
const claveDe = (concepto) => { const p = plegar(concepto); const f = FACTORES.find((x) => x.re.test(p)); return f ? f.clave : "otro"; };
const numero = (t) => { const n = Number(String(t).replace(",", ".")); return Number.isFinite(n) ? n : null; };

/* Las tablas «Concepto / Puntaje máximo» del texto: [{limitada_mipyme, pagina, filas:[{concepto, clave, puntaje}], total}].
   Admite la fila en un renglón («Factor de calidad 30») o en dos («Factor de calidad» / «30»). Una tabla cuyas cifras
   no suman su «Total» (o sin Total) se descarta: una suma que no cuadra es una lectura mala, no un pliego raro. */
function leerTablasPuntaje(texto) {
  const lineas = [];
  let pagina = null;
  for (const cruda of String(texto || "").replace(/\r\n?/g, "\n").split("\n")) {
    const m = cruda.match(/^[ \t]*\f(\d*)[ \t]*$/);
    if (m) { pagina = m[1] ? Number(m[1]) : (pagina == null ? 1 : pagina + 1); continue; }
    const l = cruda.replace(/\f/g, "").replace(/\s+/g, " ").trim();
    if (l) lineas.push({ l, pagina });
  }
  const out = [];
  for (let i = 0; i < lineas.length; i++) {
    const p = plegar(lineas[i].l);
    if (!/^concepto\b/.test(p) || !/puntaje\s+maximo/.test(`${p} ${plegar((lineas[i + 1] || {}).l)}`)) continue;
    const previo = plegar(lineas.slice(Math.max(0, i - 4), i).map((x) => x.l).join(" "));
    const filas = [];
    let total = null, j = /puntaje\s+maximo/.test(p) ? i + 1 : i + 2;
    for (; j < lineas.length && j < i + 40; j++) {
      const l = lineas[j].l, pl = plegar(l);
      if (/^total\b/.test(pl)) { const c = l.match(CIFRA_RE) || ((lineas[j + 1] || {}).l || "").match(/^(\d{1,3}(?:[.,]\d{1,2})?)$/); total = c ? numero(c[1]) : null; break; }
      const enLinea = l.match(/^(.*?[a-záéíóúñ)])\s+(\d{1,3}(?:[.,]\d{1,2})?)\s*(?:puntos?)?$/i);
      if (enLinea) { filas.push({ concepto: enLinea[1].trim(), clave: claveDe(enLinea[1]), puntaje: numero(enLinea[2]) }); continue; }
      const sig = (lineas[j + 1] || {}).l || "";
      if (/[a-záéíóúñ]/i.test(l) && /^\d{1,3}(?:[.,]\d{1,2})?$/.test(sig)) { filas.push({ concepto: l, clave: claveDe(l), puntaje: numero(sig) }); j++; continue; }
      if (filas.length) break;   // la tabla se acabó sin «Total»
    }
    if (!filas.length || total == null) continue;
    const suma = filas.reduce((a, f) => a + (f.puntaje || 0), 0);
    if (Math.abs(suma - total) > 0.011) continue;
    out.push({ limitada_mipyme: /limitadas?\s+a\s+mipyme/.test(previo), pagina: lineas[i].pagina, filas, total });
  }
  return out;
}

/* Lo que el pliego dice de las multas: «reducir… dos (2) puntos… multas o cláusulas penales». null si no lo dice. */
function leerDescuentoMultas(texto) {
  const p = plegar(texto);
  const m = p.match(/reduci\w*[^.]{0,80}?\(?(\d)\)?\s+puntos?[^.]{0,120}?multas?/);
  return m ? { puntos: Number(m[1]) } : null;
}

/* Factor por factor, para un perfil: estado «a_su_alcance» (lo obtiene entregando lo que el pliego pide), «no» (el
   perfil no lo cumple), «por_confirmar» (la aplicación no lo sabe). La económica no entra: es el precio.
   `limitadaMipyme`: true si la convocatoria quedó limitada (lib/convocatoria_limitada): entonces se usa la tabla de las
   limitadas si se leyó. */
function puntosFueraDelPrecio({ tablas, perfil = null, limitadaMipyme = null, descuentoMultas = null } = {}) {
  if (!Array.isArray(tablas) || !tablas.length) return null;
  const tabla = (limitadaMipyme === true && tablas.find((t) => t.limitada_mipyme)) || tablas.find((t) => !t.limitada_mipyme) || tablas[0];
  const { esMipyme } = require("./perfiles.js");
  const mip = perfil ? esMipyme(perfil) : null;
  const plural = !!(perfil && Array.isArray(perfil.integrantes) && perfil.integrantes.length);
  const factores = [];
  for (const f of tabla.filas) {
    if (f.clave === "economica") continue;
    let estado, como;
    if (f.clave === "calidad") { estado = "a_su_alcance"; como = "Se obtiene con el formato de factor de calidad del pliego, firmado: lo que ofrece ahí lo tiene que cumplir en la obra."; }
    else if (f.clave === "industria_nacional") { estado = "a_su_alcance"; como = `Se obtiene ofreciendo servicios nacionales con el formato de apoyo a la industria nacional${plural ? "; en un consorcio, todos los integrantes demuestran el origen nacional" : ""}.`; }
    else if (f.clave === "mipyme") {
      estado = mip === true ? "a_su_alcance" : mip === false ? "no" : "por_confirmar";
      como = mip === true ? `Su registro de proponente dice que es Mipyme${plural ? " (un integrante con el 10 % o más)" : ""}: entregue el certificado vigente y en firme CON la oferta; subsanarlo después no da el puntaje.`
        : mip === false ? `Según su registro de proponente no es Mipyme${plural ? " ninguno de los integrantes con el 10 % o más" : ""}: este puntaje no lo obtiene.`
          : "No se sabe si su registro de proponente dice Mipyme: confírmelo en el certificado.";
    } else if (f.clave === "mujeres") { estado = "por_confirmar"; como = `Solo si la empresa es de mujeres${plural ? " (un integrante con el 10 % o más)" : ""}, con su formato de acreditación y los documentos: la aplicación no lo sabe.`; }
    else if (f.clave === "discapacidad") { estado = "por_confirmar"; como = "Solo si tiene vinculadas personas con discapacidad en la planta, certificado por el Ministerio del Trabajo: la aplicación no lo sabe."; }
    else { estado = "por_confirmar"; como = "Un factor que la aplicación no sabe juzgar: léalo en el pliego."; }
    factores.push({ concepto: f.concepto, clave: f.clave, puntaje: f.puntaje, estado, como });
  }
  const suma = (e) => Math.round(factores.filter((x) => !e || x.estado === e).reduce((a, x) => a + x.puntaje, 0) * 100) / 100;
  const en = (n) => String(n).replace(".", ",");
  const lista = (e) => factores.filter((x) => x.estado === e).map((x) => `${x.concepto.toLowerCase()} ${en(x.puntaje)}`).join(", ");
  const total = suma(null), alcance = suma("a_su_alcance"), confirmar = suma("por_confirmar"), no = suma("no");
  const frase = `Fuera del precio el pliego reparte ${en(total)} puntos: puede obtener ${en(alcance)}${lista("a_su_alcance") ? ` (${lista("a_su_alcance")})` : ""}`
    + `${confirmar ? `; ${en(confirmar)} por confirmar (${lista("por_confirmar")})` : ""}${no ? `; ${en(no)} no los obtiene (${lista("no")})` : ""}.`
    + " Cada uno se entrega con su formato y su soporte CON la oferta: sin él, son puntos perdidos."
    + (descuentoMultas ? ` Y si le impusieron multas o cláusulas penales en el último año, le restan ${descuentoMultas.puntos} puntos.` : "");
  return { total_fuera_del_precio: total, a_su_alcance: alcance, por_confirmar: confirmar, no_obtiene: no, factores, tabla_limitada_mipyme: !!tabla.limitada_mipyme, pagina: tabla.pagina, frase };
}

module.exports = { leerTablasPuntaje, leerDescuentoMultas, puntosFueraDelPrecio, claveDe };
