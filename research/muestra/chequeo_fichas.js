/* research/muestra/chequeo_fichas.js · Chequeo de FORMA de las fichas del piloto
   ----------------------------------------------------------------------------
   No comprueba que la cita esté en la fuente (eso lo hace un verificador que
   reabre la fuente): comprueba campos obligatorios, vocabularios cerrados, la
   forma del id y del rango, la longitud de la cita y la grafía de la marca.
   Es el borrador del validador de la Fase 3, que irá dentro de la suite.

   Uso: node research/muestra/chequeo_fichas.js [desde] [hasta]
        (sin argumentos revisa todas; con rango, solo CE-F-desde..hasta) */
"use strict";
const fs = require("fs");
const path = require("path");

const DIR = path.join(__dirname, "..", "fichas");
const ETAPAS = new Set(["E0", "E1", "E2", "E3", "E4", "E5", "E6", "E7", "E8", "E9", "E10", "T"]);
const DECISIONES = new Set(["D1", "D2", "D3", "D4"]);
const MODULOS = new Set(["M-INGESTA", "M-LISTA", "M-RUP", "M-CAPACIDAD", "M-PLURAL", "M-PLIEGO", "M-ADENDAS", "M-APU", "M-PRECIO", "M-OFERTA", "M-SEGUIMIENTO", "M-ENTIDAD", "M-NINGUNO"]);
const TIPOS = new Set(["ley", "decreto", "resolucion", "documento_tipo", "guia_cce", "circular_cce", "concepto_cce", "jurisprudencia", "organo_control", "multilateral", "gremio_ong", "academia", "dato_secop", "documento_proceso", "manual_entidad", "video_transcripcion", "herramienta_oficial"]);
const AUTORIDAD = new Set(["A1", "A2", "A3", "A4", "A5", "A6", "A7"]);
const NATURALEZA = new Set(["normativa", "empirica", "practica"]);
const LECTURA = /^(completa|parcial|solo_resumen|no_leida)\b/;
const OBLIGATORIOS = ["id", "tipo", "autor", "titulo", "anio", "institucion", "url", "fecha_consulta", "estado_lectura", "localizador", "cita", "afirmacion", "eje", "etapa", "decision", "modulo", "naturaleza", "nivel_autoridad", "vigencia_verificada"];
const MARCA_VIEJA = new RegExp("\\bDetec" + "ta\\b");

const desde = process.argv[2] ? parseInt(String(process.argv[2]).replace(/\D/g, ""), 10) : null;
const hasta = process.argv[3] ? parseInt(String(process.argv[3]).replace(/\D/g, ""), 10) : null;

const archivos = fs.existsSync(DIR) ? fs.readdirSync(DIR).filter((f) => f.endsWith(".json")).sort() : [];
let revisadas = 0;
const hallazgos = [];
for (const f of archivos) {
  const n = parseInt(f.replace(/\D/g, ""), 10);
  if (desde !== null && (n < desde || n > hasta)) continue;
  revisadas++;
  const txt = fs.readFileSync(path.join(DIR, f), "utf8");
  const mal = (m) => hallazgos.push(`${f}: ${m}`);
  if (MARCA_VIEJA.test(txt)) mal("trae la grafía vieja de la marca");
  let x;
  try { x = JSON.parse(txt); } catch (e) { mal("no es JSON: " + e.message); continue; }
  if (!/^CE-F-\d{4}$/.test(x.id || "")) mal(`id «${x.id}» no es CE-F-####`);
  if (x.id && `${x.id}.json` !== f) mal(`el archivo se llama ${f} y el id es ${x.id}`);
  for (const c of OBLIGATORIOS) if (!(c in x)) mal(`falta el campo «${c}»`);
  if (x.tipo && !TIPOS.has(x.tipo)) mal(`tipo «${x.tipo}» fuera del vocabulario`);
  if (x.nivel_autoridad && !AUTORIDAD.has(x.nivel_autoridad)) mal(`nivel_autoridad «${x.nivel_autoridad}» fuera del vocabulario`);
  if (x.naturaleza && !NATURALEZA.has(x.naturaleza)) mal(`naturaleza «${x.naturaleza}» fuera del vocabulario`);
  for (const [campo, voc] of [["etapa", ETAPAS], ["decision", DECISIONES], ["modulo", MODULOS]]) {
    if (!Array.isArray(x[campo]) || !x[campo].length) { mal(`«${campo}» tiene que ser una lista no vacía`); continue; }
    for (const v of x[campo]) if (!voc.has(v)) mal(`${campo} «${v}» fuera del vocabulario`);
  }
  if (x.estado_lectura && !LECTURA.test(x.estado_lectura)) mal(`estado_lectura «${String(x.estado_lectura).slice(0, 30)}» no empieza por completa/parcial/solo_resumen/no_leida`);
  if (typeof x.cita === "string" && x.cita.length > 300) mal(`la cita tiene ${x.cita.length} caracteres (tope 300)`);
  if (typeof x.cita === "string" && !x.cita.trim()) mal("la cita está vacía");
  if (x.fecha_consulta && !/^\d{4}-\d{2}-\d{2}$/.test(x.fecha_consulta)) mal("fecha_consulta no es AAAA-MM-DD");
  if (x.url && !/^https?:\/\//.test(x.url)) mal("url no empieza por http");
  if (![1, 2, 3, 4, 5, 6, 7, 8, 9].includes(x.eje)) mal(`eje «${x.eje}» no es 1-9`);
  const v = x.vigencia_verificada;
  if (!v || typeof v !== "object" || !("fecha" in v) || !("fuente" in v)) mal("vigencia_verificada sin {fecha, fuente}");
  if (x.naturaleza === "normativa") {
    if (!x.regla || typeof x.regla !== "object") mal("normativa sin «regla» {regimen, desde_aviso, documento_tipo}");
    else for (const c of ["regimen", "desde_aviso", "documento_tipo"]) if (!(c in x.regla)) mal(`regla sin «${c}»`);
  }
  if (x.tipo === "jurisprudencia" && typeof x.unificacion !== "boolean") mal("jurisprudencia sin unificacion true/false");
}
console.log(`fichas revisadas: ${revisadas} · hallazgos: ${hallazgos.length}`);
for (const h of hallazgos) console.log("  · " + h);
process.exit(hallazgos.length ? 1 : 0);
