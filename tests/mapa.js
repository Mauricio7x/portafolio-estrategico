/* tests/mapa.js · EL BUSCADOR DE COORDENADAS (sin red, sin dependencias).

   Responde «¿dónde está X?» con la RUTA EXACTA en vez de obligar a leer
   documento por documento. Existe porque el costo real de una sesión no es
   leer: es BUSCAR — un `grep` ancho sobre 500 KB de memoria y 100 módulos
   devuelve decenas de aciertos, y cada fichero abierto «por si acaso» se paga
   entero. Este índice se DERIVA del árbol en cada ejecución (nunca se escribe
   a mano: sería la misma mentira en incubación que un conteo en un prompt).

   USO
     node tests/mapa.js <término>     → coordenadas de ese término:
                                        · módulos cuyo nombre o propósito casan
                                        · quién los llama (dependencia inversa)
                                        · op del router que llegan hasta ellos
                                        · secciones de la memoria, con el `sed`
                                          EXACTO ya escrito para pegarlo, su
                                          resumen «En una línea:» si lo tiene y
                                          «(superada → …)» si otra la sustituyó
     node tests/mapa.js               → el mapa completo por dominios (~150
                                        líneas: mucho más barato que un `ls`
                                        seguido de diez lecturas)
     node tests/mapa.js --indice      → el índice de la memoria (título · fecha ·
                                        líneas · bytes · superada por), derivado
     node tests/mapa.js --escribir    → regenera docs/MAPA.md y
                                        docs/MEMORIA_INDICE.md con esas vistas
     node tests/mapa.js --archivo …   → incluye docs/archivo/ (documentos
                                        superados) en la lista de documentos
   Toda lista que se recorta lo dice: «(+N más: afine el término)». Un truncado
   mudo hace creer que el índice acabó, y ya costó leer secciones equivocadas.

   CÓMO SE DERIVA CADA COSA (y qué se dice cuando no se puede)
     · Propósito de un módulo: la 2.ª línea de su cabecera `/* ===…`, que en
       este repositorio tiene la forma «ruta · propósito». Sin cabecera con esa
       forma se dice «sin cabecera», jamás se inventa un resumen.
     · Dependencia inversa: cada `require` se resuelve a RUTA REAL relativa a quien
       lo escribe (por nombre de fichero habría falsos positivos: hay diez
       colisiones entre lib y lib/handlers); un require dinámico se omite.
     · op → handler: el mapa del router, igual que en tests/estado.js.
     · Secciones de la memoria: los títulos `##`/`###` y su rango de líneas (la
       MISMA definición que tests/estado.js). Bajo el título, y antes del cuerpo,
       dos líneas opcionales que la memoria escribe a mano (6-sep-2026):
         > SUPERADA el dd-mmm-2026 por «título de la sección que la sustituye» — nota
         En una línea: lo que decidió esta sección, en una frase.
       El marcador se resuelve al título completo (exacto, sin el pictograma
       inicial que algún título de agosto lleva, o prefijo único de 12+ letras);
       si no resuelve, se dice «título no hallado», nunca se adivina. La nota,
       si la hay, va tras « — »: el título acaba en el primer » seguido de esa
       raya o del final de la línea.
     · Documentos: docs/*.md y *.txt y un nivel de subcarpetas; los generados
       (MAPA.md, MEMORIA_INDICE.md) no se listan, docs/archivo/ solo con --archivo,
       y un archivo sin título `#` sale como «(sin título)».
   Ninguna de estas vías adivina: lo que no case, se declara. */

"use strict";

const fs = require("fs");
const path = require("path");

const RAIZ = path.join(__dirname, "..");
const MEMORIA = ["docs/MEMORIA.md", "CLAUDE.md"].find((r) => fs.existsSync(path.join(RAIZ, r)));
const CON_ARCHIVO = process.argv.includes("--archivo");

/* ── Recolección ─────────────────────────────────────────────────────────── */

function jsDe(dir) {
  const abs = path.join(RAIZ, dir);
  if (!fs.existsSync(abs)) return [];
  const salida = [];
  for (const e of fs.readdirSync(abs, { withFileTypes: true })) {
    if (e.isDirectory()) salida.push(...jsDe(path.join(dir, e.name)));
    else if (e.name.endsWith(".js")) salida.push(path.join(dir, e.name));
  }
  return salida;
}

/* La 2.ª línea de la cabecera es «ruta · propósito» en la convención de este
   repositorio. Se acepta también un `/* comentario` suelto de una línea. */
function propositoDe(fuente) {
  const lineas = fuente.split("\n", 6);
  for (const l of lineas.slice(0, 5)) {
    const m = l.match(/^\s*(?:\/\*\s*)?(?:[a-z0-9_./-]+)\s+·\s+(.+?)\s*$/i);
    if (m && m[1].length > 3) return m[1].replace(/\s*[-=]{3,}\s*$/, "").trim();
  }
  // Cabecera de una línea, con o sin marco decorativo alrededor del texto
  // (`/* ═══ Título ═══`): el marco se recorta, el texto se conserva.
  const suelto = lineas[0].match(/^\/\*+\s*[═─=\s]*(.{8,120}?)[═─=\s]*(?:\*\/)?$/);
  return suelto && /[a-záéíóúñ]/i.test(suelto[1]) ? suelto[1].trim() : null;
}

function exportsDe(fuente) {
  const bloque = fuente.match(/module\.exports\s*=\s*\{([\s\S]{0,900}?)\n\s*\};/);
  if (bloque) {
    const claves = [...bloque[1].matchAll(/^\s*([A-Za-z_$][\w$]*)\s*[,:]/gm)].map((m) => m[1]);
    if (claves.length) return [...new Set(claves)];
  }
  const directo = fuente.match(/module\.exports\s*=\s*([A-Za-z_$][\w$]*)\s*;/);
  return directo ? [directo[1]] : [];
}

/* Los require se resuelven a RUTA REAL, relativa a quien los escribe. Por
   nombre de fichero no vale: hay diez colisiones entre `lib` y
   `lib/handlers/<dominio>` (deducciones, cronograma, rup, diff…), y resolver por
   nombre hacía decir «api/pliego.js llama a lib/deducciones.js» cuando llama
   a lib/handlers/pliego/deducciones.js — un falso positivo en la respuesta a
   «¿quién usa esto?», que es justo la pregunta con la que se decide si un
   cambio es seguro. */
function resolver(desdeRel, spec) {
  if (!spec.startsWith(".")) return null; // paquete de Node: no es del árbol
  const abs = path.resolve(path.dirname(path.join(RAIZ, desdeRel)), spec);
  for (const cand of [abs, abs + ".js", path.join(abs, "index.js")]) {
    if (fs.existsSync(cand) && fs.statSync(cand).isFile()) {
      return path.relative(RAIZ, cand).replace(/\\/g, "/");
    }
  }
  return null; // require dinámico o ruta que no existe: se omite, no se adivina
}

const MODULOS = new Map(); // ruta → { proposito, exports, requiere:Set, llamadoPor:Set }
for (const rel of [...jsDe("lib"), ...jsDe("api"), ...jsDe("public")]) {
  const fuente = fs.readFileSync(path.join(RAIZ, rel), "utf8");
  MODULOS.set(rel, {
    proposito: propositoDe(fuente),
    exports: exportsDe(fuente),
    requiere: new Set([...fuente.matchAll(/require\(["']([^"']+)["']\)/g)]
      .map((m) => resolver(rel, m[1])).filter(Boolean)),
    llamadoPor: new Set(),
    lineas: fuente.split("\n").length,
  });
}
// Dependencia inversa: quién requiere a quién, por ruta resuelta.
for (const [rel, info] of MODULOS) {
  for (const [otro, oInfo] of MODULOS) {
    if (otro !== rel && oInfo.requiere.has(rel)) info.llamadoPor.add(otro);
  }
}

/* op → handler, leído del mapa de cada router (misma vía que tests/estado.js). */
const OPS = []; // { router, op, destino }
for (const rel of jsDe("api")) {
  const fuente = fs.readFileSync(path.join(RAIZ, rel), "utf8");
  for (const m of fuente.matchAll(/^\s*"?([a-z0-9_-]+)"?\s*:\s*\(\)\s*=>.*require\(["']([^"']+)["']/gm)) {
    OPS.push({ router: rel, op: m[1], destino: path.normalize(path.join("api", m[2])).replace(/\\/g, "/") });
  }
}

/* Secciones de la memoria con su rango de líneas, para dar el `sed` exacto.
   Bajo el título se leen los marcadores «> SUPERADA …» y el resumen «En una
   línea: …» (opcionales, hasta la primera línea de cuerpo). */
/* El título acaba en el primer » seguido de « — » (la nota) o del final de línea: así un
   título con «» dentro («La piel v3 · «Lino y tinta»: …») y una nota con «» se leen bien. */
const RE_SUPERADA = /^> SUPERADA (?:el|en) (\d{1,2}-[a-z]{3}-20\d\d|[a-z]{3} 20\d\d) por «(.+?)»(?=\s*(?:[—–]|$))(.*)$/;
const RE_RESUMEN = /^En una línea: (.+)$/;
const RE_FECHA_TITULO = [/\b\d{1,2}(?:\/\d{1,2})?-[a-z]{3}-20\d\d\b/, /\b[a-z]{3} 20\d\d\b/];
const sinPictograma = (t) => t.replace(/^[^\p{L}\p{N}«"'(`]+/u, "").trim();
const SECCIONES = []; // { titulo, desde, hasta, bytes, fecha, superada:[{fecha,por,nota}], resumen }
let LINEAS_MEMORIA = [];
if (MEMORIA) {
  LINEAS_MEMORIA = fs.readFileSync(path.join(RAIZ, MEMORIA), "utf8").split("\n");
  LINEAS_MEMORIA.forEach((l, i) => {
    if (/^##+ /.test(l)) {
      const titulo = l.replace(/^#+\s*/, "").trim();
      const fecha = RE_FECHA_TITULO.map((re) => (titulo.match(re) || [])[0]).find(Boolean) || null;
      SECCIONES.push({ titulo, desde: i + 1, hasta: null, bytes: 0, fecha, superada: [], resumen: null });
    }
  });
  SECCIONES.forEach((s, i) => {
    s.hasta = i + 1 < SECCIONES.length ? SECCIONES[i + 1].desde - 1 : LINEAS_MEMORIA.length;
    s.bytes = Buffer.byteLength(LINEAS_MEMORIA.slice(s.desde - 1, s.hasta).join("\n")) + (i + 1 < SECCIONES.length ? 1 : 0);
    for (let j = s.desde; j < s.hasta; j++) {
      const l = LINEAS_MEMORIA[j];
      if (!l.trim()) continue;
      const m = RE_SUPERADA.exec(l);
      if (m) { s.superada.push({ fecha: m[1], por: m[2].trim(), nota: m[3].replace(/^\s*[—–-]\s*/, "").trim() }); continue; }
      const r = RE_RESUMEN.exec(l);
      if (r && !s.resumen) { s.resumen = r[1].trim(); continue; }
      break;
    }
  });
}

/* Un marcador nombra un título: exacto (sin el pictograma inicial que algún
   título de agosto lleva) o prefijo ÚNICO de 12 letras o más. Si no resuelve,
   se devuelve null y quien imprime lo dice. */
function seccionPorTitulo(nombre) {
  const n = sinPictograma(nombre);
  if (!n) return null;
  const exactas = SECCIONES.filter((s) => sinPictograma(s.titulo) === n);
  if (exactas.length) return exactas[0];
  if (n.length < 12) return null;
  const prefijo = SECCIONES.filter((s) => sinPictograma(s.titulo).startsWith(n));
  return prefijo.length === 1 ? prefijo[0] : null;
}

/* Documentos temáticos: docs/*.md|txt y un nivel de subcarpetas. Los generados
   no se listan (son fotos de esta herramienta), docs/archivo/ va aparte. */
const DOCS = [];          // vivos
const DOCS_ARCHIVO = [];  // docs/archivo/: superados, solo con --archivo
const GENERADOS = new Set(["MAPA.md", "MEMORIA_INDICE.md"]);
function docsDe(dirRel, niveles) {
  const abs = path.join(RAIZ, dirRel);
  if (!fs.existsSync(abs)) return;
  for (const e of fs.readdirSync(abs, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    const rel = path.join(dirRel, e.name).replace(/\\/g, "/");
    if (e.isDirectory()) { if (niveles > 0) docsDe(rel, niveles - 1); continue; }
    if (!/\.(md|txt)$/.test(e.name) || rel === MEMORIA || (dirRel === "docs" && GENERADOS.has(e.name))) continue;
    const primeras = fs.readFileSync(path.join(RAIZ, rel), "utf8").split("\n", 12);
    const titulo = primeras.find((l) => /^#+ /.test(l));
    (rel.startsWith("docs/archivo/") ? DOCS_ARCHIVO : DOCS).push({ ruta: rel, titulo: titulo ? titulo.replace(/^#+\s*/, "").slice(0, 88) : null });
  }
}
docsDe("docs", 1);

/* ── Consulta ────────────────────────────────────────────────────────────── */

const norm = (s) => String(s).toLowerCase()
  .normalize("NFD").replace(/[̀-ͯ]/g, "");

function buscar(termino) {
  const t = norm(termino);
  const modulos = [...MODULOS].filter(([rel, i]) =>
    norm(rel).includes(t) || (i.proposito && norm(i.proposito).includes(t)) ||
    i.exports.some((e) => norm(e).includes(t)));
  const ops = OPS.filter((o) => norm(o.op).includes(t) || norm(o.destino).includes(t));
  const secciones = SECCIONES.filter((s) => norm(s.titulo).includes(t));
  const docs = (CON_ARCHIVO ? [...DOCS, ...DOCS_ARCHIVO] : DOCS)
    .filter((d) => norm(d.ruta).includes(t) || (d.titulo && norm(d.titulo).includes(t)));
  return { modulos, ops, secciones, docs };
}

/* El cuerpo de la memoria se rastrea solo si los títulos no bastaron: es la
   pasada cara (500 KB), y se devuelve ACOTADA a la sección que contiene el
   acierto, no la línea suelta — una línea sin su sección no se entiende. */
function enCuerpoDeMemoria(termino, tope) {
  if (!MEMORIA) return { lista: [], total: 0 };
  const t = norm(termino);
  const cuenta = new Map();
  LINEAS_MEMORIA.forEach((l, i) => {
    if (!norm(l).includes(t)) return;
    const s = SECCIONES.filter((x) => x.desde <= i + 1).pop();
    if (s) cuenta.set(s, (cuenta.get(s) || 0) + 1);
  });
  const orden = [...cuenta].sort((a, b) => b[1] - a[1]);
  return { lista: orden.slice(0, tope), total: orden.length };
}

/* ── Impresión ───────────────────────────────────────────────────────────── */

const p = (s = "") => console.log(s);
const termino = process.argv.slice(2).filter((a) => !a.startsWith("--")).join(" ");
const masAviso = (total, tope, que) => `  (+${total - tope} ${que}: afine el término)`;

/* Una sección de la memoria en la respuesta: título, lo que la superó (con el
   sed de la sección vigente), su resumen si lo tiene, y el sed exacto. */
function imprimirSeccion(s, sufijo) {
  p("  «" + s.titulo.slice(0, 88) + "»" + (sufijo || ""));
  for (const x of s.superada) {
    const dest = seccionPorTitulo(x.por);
    p("    (superada " + (/^\d/.test(x.fecha) ? "el " : "en ") + x.fecha + " → «" + (dest ? dest.titulo : x.por) + "»" +
      (dest ? `  sed -n '${dest.desde},${dest.hasta}p' ${MEMORIA}` : "  — título no hallado en la memoria: corrija el marcador") +
      (x.nota ? " · " + x.nota : "") + ")");
  }
  if (s.resumen) p("    en una línea: " + s.resumen);
  p(`    sed -n '${s.desde},${s.hasta}p' ${MEMORIA}`);
}

/* El índice de la memoria: una fila por sección, derivada. Sin fecha de
   generación a propósito: la suite compara este texto con docs/MEMORIA_INDICE.md
   y una fecha lo haría distinto cada día sin que la memoria cambiara. */
function indiceDeMemoria() {
  const esc = (t) => t.replace(/\|/g, "\\|");
  const conMarcador = SECCIONES.filter((s) => s.superada.length).length;
  const filas = SECCIONES.map((s) => {
    const por = s.superada.map((x) => {
      const d = seccionPorTitulo(x.por);
      return "«" + esc(d ? d.titulo : x.por) + "»" + (d ? "" : " (título no hallado)");
    }).join(" · ");
    return `| ${esc(s.titulo)} | ${s.fecha || "—"} | ${s.desde}-${s.hasta} | ${s.bytes} | ${por} |`;
  });
  return [
    "<!-- GENERADO por `node tests/mapa.js --escribir` · NO editar a mano: se regenera y se pierde.",
    "     La suite compara este archivo con la memoria del árbol: tras escribir en " + MEMORIA + ",",
    "     vuelva a ejecutar `node tests/mapa.js --escribir` y añada los dos generados al commit. -->",
    "",
    "# Índice de " + MEMORIA,
    "",
    `Derivado del árbol: ${Buffer.byteLength(LINEAS_MEMORIA.join("\n"))} bytes · ${SECCIONES.length} secciones · ${conMarcador} con marcador de superación.`,
    "Una sección se lee con `sed -n 'A,Bp' " + MEMORIA + "` (A-B es la columna «Líneas»). Una sección superada",
    "remite a la que la sustituye y conserva su cuerpo (la crónica no se reescribe). La fecha sale del título;",
    "«—» es que el título no la lleva. `node tests/mapa.js <término>` da estas mismas coordenadas por término.",
    "",
    "| Sección | Fecha | Líneas | Bytes | Superada por |",
    "|---|---|---|---|---|",
    ...filas,
    "",
  ].join("\n");
}

if (process.argv.includes("--indice")) {
  process.stdout.write(indiceDeMemoria());
} else if (termino) {
  const r = buscar(termino);
  p(`== COORDENADAS DE «${termino}» ==`);
  p("(derivado del árbol ahora; si nada casa, el término no existe con ese nombre — probar un sinónimo)");
  p();

  if (r.modulos.length) {
    p("· MÓDULOS (" + r.modulos.length + "):");
    for (const [rel, i] of r.modulos.slice(0, 12)) {
      p("  " + rel + "  (" + i.lineas + " líneas)");
      p("    propósito: " + (i.proposito || "sin cabecera con la forma «ruta · propósito»"));
      if (i.exports.length) p("    exporta: " + i.exports.slice(0, 10).join(", "));
      if (i.llamadoPor.size) p("    lo llaman: " + [...i.llamadoPor].slice(0, 6).join(", ") +
        (i.llamadoPor.size > 6 ? ` (+${i.llamadoPor.size - 6})` : ""));
    }
    if (r.modulos.length > 12) p(masAviso(r.modulos.length, 12, "módulos más"));
    p();
  }
  if (r.ops.length) {
    p("· ENDPOINTS que llegan ahí:");
    for (const o of r.ops.slice(0, 10)) p("  /" + o.router.replace(/\.js$/, "") + "?op=" + o.op + "  →  " + o.destino);
    if (r.ops.length > 10) p(masAviso(r.ops.length, 10, "op más"));
    p();
  }
  if (r.docs.length) {
    p("· DOCUMENTOS:");
    for (const d of r.docs.slice(0, 8)) p("  " + d.ruta + "  — " + (d.titulo || "(sin título)"));
    if (r.docs.length > 8) p(masAviso(r.docs.length, 8, "documentos más"));
    p();
  }

  const porTitulo = r.secciones.slice(0, 8);
  const cuerpo = porTitulo.length >= 3 ? { lista: [], total: 0 } : enCuerpoDeMemoria(termino, 6);
  if (porTitulo.length || cuerpo.lista.some(([s]) => !porTitulo.includes(s))) {
    p("· MEMORIA (" + MEMORIA + ") — leer SOLO estas secciones, con el comando ya escrito:");
    for (const s of porTitulo) imprimirSeccion(s);
    if (r.secciones.length > 8) p(masAviso(r.secciones.length, 8, "secciones más por título"));
    // Una sección ya dada por su título no se repite por su cuerpo.
    const soloCuerpo = cuerpo.lista.filter(([s]) => !porTitulo.includes(s));
    for (const [s, n] of soloCuerpo) imprimirSeccion(s, "  (" + n + " menciones en el cuerpo)");
    if (cuerpo.total > 6) p(masAviso(cuerpo.total, 6, "secciones más por el cuerpo"));
    p();
  }
  if (!r.modulos.length && !r.ops.length && !r.docs.length && !porTitulo.length && !cuerpo.lista.length) {
    p("SIN ACIERTOS. El término no aparece en nombres de módulo, propósitos, exports, op,");
    p("documentos ni títulos/cuerpo de la memoria. Probar un sinónimo del léxico (CLAUDE.md)");
    p("antes de dar por hecho que la función no existe: casi nada aquí se construye desde cero.");
  }
} else {
  /* Mapa completo por dominios. Barato de leer y suficiente para orientarse. */
  p("== MAPA DE DETEKTA · generado del árbol el " + new Date().toISOString().slice(0, 10) + " ==");
  p("(no editar a mano: sale de `node tests/mapa.js --escribir`. Para ir a un sitio concreto,");
  p(" `node tests/mapa.js <término>` da la ruta, la línea y el sed exacto — más barato que leer esto)");
  p();
  p("· SUPERFICIE HTTP — " + OPS.length + " op declaradas en los mapas de los routers:");
  const porRouter = new Map();
  for (const o of OPS) porRouter.set(o.router, [...(porRouter.get(o.router) || []), o]);
  for (const [router, lista] of [...porRouter].sort()) {
    p("  /" + router.replace(/\.js$/, "") + "?op=  " + lista.map((o) => o.op).join(" · "));
  }
  p("  (api/apu.js e api/inteligencia.js despachan por accion/vista desde su handler:");
  p("   `node tests/estado.js` los enumera midiendo)");
  p();

  const grupos = new Map();
  for (const [rel, i] of MODULOS) {
    if (rel.startsWith("public/")) continue;
    const g = rel.startsWith("lib/handlers/") ? "lib/handlers/" + rel.split("/")[2]
      : rel.startsWith("lib/apu/") ? "lib/apu" : rel.startsWith("api/") ? "api" : "lib";
    grupos.set(g, [...(grupos.get(g) || []), [rel, i]]);
  }
  for (const [g, lista] of [...grupos].sort()) {
    p("· " + g + "/ — " + lista.length + " módulos:");
    for (const [rel, i] of lista.sort()) {
      p("  " + path.basename(rel).padEnd(26) + "  " + (i.proposito || "(sin cabecera)").slice(0, 96));
    }
    p();
  }
  p("· FRONTEND public/ — " + [...MODULOS].filter(([r]) => r.startsWith("public/")).length + " módulos:");
  for (const [rel, i] of [...MODULOS].filter(([r]) => r.startsWith("public/")).sort()) {
    p("  " + path.basename(rel).padEnd(26) + "  " + (i.proposito || "(sin cabecera)").slice(0, 96));
  }
  p();
  const superadas = SECCIONES.filter((s) => s.superada.length).length;
  p("· MEMORIA · " + (MEMORIA || "no encontrada") + " — " + SECCIONES.length + " secciones (" + superadas +
    " con marcador de superación; el índice entero, derivado: docs/MEMORIA_INDICE.md). Las 10 más nuevas:");
  for (const s of SECCIONES.slice(-10)) p("  L" + String(s.desde).padStart(6) + "  " + s.titulo.slice(0, 92) + (s.superada.length ? "  (superada)" : ""));
  p();
  p("· DOCUMENTOS docs/ — " + DOCS.length + (DOCS_ARCHIVO.length && !CON_ARCHIVO ? " (y " + DOCS_ARCHIVO.length + " en docs/archivo/, superados: `--archivo` los lista)" : "") + ":");
  for (const d of DOCS) p("  " + d.ruta.replace("docs/", "").padEnd(38) + "  " + (d.titulo || "(sin título)").slice(0, 84));
  if (CON_ARCHIVO && DOCS_ARCHIVO.length) {
    p();
    p("· ARCHIVO docs/archivo/ — " + DOCS_ARCHIVO.length + " (superados, solo historia; cada uno dice qué lo sustituyó):");
    for (const d of DOCS_ARCHIVO) p("  " + d.ruta.replace("docs/", "").padEnd(38) + "  " + (d.titulo || "(sin título)").slice(0, 84));
  }
}

if (process.argv.includes("--escribir")) {
  const { execFileSync } = require("child_process");
  const salida = execFileSync(process.execPath, [__filename], { encoding: "utf8", cwd: RAIZ });
  fs.writeFileSync(path.join(RAIZ, "docs", "MAPA.md"),
    "<!-- GENERADO por `node tests/mapa.js --escribir` · NO editar a mano: se regenera y se pierde.\n" +
    "     Es una FOTO para leer en GitHub; la fuente de verdad es ejecutar la herramienta. -->\n\n" +
    "```\n" + salida + "```\n");
  console.error("· escrito docs/MAPA.md");
  fs.writeFileSync(path.join(RAIZ, "docs", "MEMORIA_INDICE.md"), indiceDeMemoria());
  console.error("· escrito docs/MEMORIA_INDICE.md");
}
