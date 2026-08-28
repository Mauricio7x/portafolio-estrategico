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
                                          EXACTO ya escrito para pegarlo
     node tests/mapa.js               → el mapa completo por dominios (~150
                                        líneas: mucho más barato que un `ls`
                                        seguido de diez lecturas)
     node tests/mapa.js --escribir    → regenera docs/MAPA.md con esa vista

   CÓMO SE DERIVA CADA COSA (y qué se dice cuando no se puede)
     · Propósito de un módulo: la 2.ª línea de su cabecera `/* ===…`, que en
       este repositorio tiene la forma «ruta · propósito». Sin cabecera con esa
       forma se dice «sin cabecera», jamás se inventa un resumen.
     · Dependencia inversa: cada `require` se resuelve a RUTA REAL relativa a quien
       lo escribe (por nombre de fichero habría falsos positivos: hay diez
       colisiones entre lib y lib/handlers); un require dinámico se omite.
     · op → handler: el mapa del router, igual que en tests/estado.js.
     · Secciones de la memoria: los títulos `##`/`###` y su rango de líneas.
   Ninguna de estas vías adivina: lo que no case, se declara. */

"use strict";

const fs = require("fs");
const path = require("path");

const RAIZ = path.join(__dirname, "..");
const MEMORIA = ["docs/MEMORIA.md", "CLAUDE.md"].find((r) => fs.existsSync(path.join(RAIZ, r)));

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

/* Secciones de la memoria con su rango de líneas, para dar el `sed` exacto. */
const SECCIONES = [];
if (MEMORIA) {
  const lineas = fs.readFileSync(path.join(RAIZ, MEMORIA), "utf8").split("\n");
  lineas.forEach((l, i) => {
    if (/^##+ /.test(l)) SECCIONES.push({ titulo: l.replace(/^#+\s*/, ""), desde: i + 1, hasta: null });
  });
  SECCIONES.forEach((s, i) => { s.hasta = i + 1 < SECCIONES.length ? SECCIONES[i + 1].desde - 1 : lineas.length; });
}

/* Documentos temáticos: primer título o primera línea con contenido. */
const DOCS = [];
for (const f of (fs.existsSync(path.join(RAIZ, "docs")) ? fs.readdirSync(path.join(RAIZ, "docs")) : [])) {
  if (!f.endsWith(".md") || f === "MEMORIA.md") continue;
  const primeras = fs.readFileSync(path.join(RAIZ, "docs", f), "utf8").split("\n", 12);
  const titulo = primeras.find((l) => /^#+ /.test(l));
  DOCS.push({ ruta: "docs/" + f, titulo: titulo ? titulo.replace(/^#+\s*/, "").slice(0, 88) : null });
}

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
  const docs = DOCS.filter((d) => norm(d.ruta).includes(t) || (d.titulo && norm(d.titulo).includes(t)));
  return { modulos, ops, secciones, docs };
}

/* El cuerpo de la memoria se rastrea solo si los títulos no bastaron: es la
   pasada cara (500 KB), y se devuelve ACOTADA a la sección que contiene el
   acierto, no la línea suelta — una línea sin su sección no se entiende. */
function enCuerpoDeMemoria(termino, tope) {
  if (!MEMORIA) return [];
  const t = norm(termino);
  const lineas = fs.readFileSync(path.join(RAIZ, MEMORIA), "utf8").split("\n");
  const cuenta = new Map();
  lineas.forEach((l, i) => {
    if (!norm(l).includes(t)) return;
    const s = SECCIONES.filter((x) => x.desde <= i + 1).pop();
    if (s) cuenta.set(s, (cuenta.get(s) || 0) + 1);
  });
  return [...cuenta].sort((a, b) => b[1] - a[1]).slice(0, tope);
}

/* ── Impresión ───────────────────────────────────────────────────────────── */

const p = (s = "") => console.log(s);
const termino = process.argv.slice(2).filter((a) => !a.startsWith("--")).join(" ");

if (termino) {
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
    if (r.modulos.length > 12) p("  … y " + (r.modulos.length - 12) + " más (afinar el término)");
    p();
  }
  if (r.ops.length) {
    p("· ENDPOINTS que llegan ahí:");
    for (const o of r.ops.slice(0, 10)) p("  /" + o.router.replace(/\.js$/, "") + "?op=" + o.op + "  →  " + o.destino);
    p();
  }
  if (r.docs.length) {
    p("· DOCUMENTOS:");
    for (const d of r.docs.slice(0, 8)) p("  " + d.ruta + (d.titulo ? "  — " + d.titulo : ""));
    p();
  }

  const porTitulo = r.secciones.slice(0, 8);
  const porCuerpo = porTitulo.length >= 3 ? [] : enCuerpoDeMemoria(termino, 6);
  if (porTitulo.length || porCuerpo.length) {
    p("· MEMORIA (" + MEMORIA + ") — leer SOLO estas secciones, con el comando ya escrito:");
    for (const s of porTitulo) {
      p("  «" + s.titulo.slice(0, 88) + "»");
      p(`    sed -n '${s.desde},${s.hasta}p' ${MEMORIA}`);
    }
    for (const [s, n] of porCuerpo) {
      p("  «" + s.titulo.slice(0, 88) + "»  (" + n + " menciones en el cuerpo)");
      p(`    sed -n '${s.desde},${s.hasta}p' ${MEMORIA}`);
    }
    p();
  }
  if (!r.modulos.length && !r.ops.length && !r.docs.length && !porTitulo.length && !porCuerpo.length) {
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
      p("  " + path.basename(rel).padEnd(26) + (i.proposito || "(sin cabecera)").slice(0, 96));
    }
    p();
  }
  p("· FRONTEND public/ — " + [...MODULOS].filter(([r]) => r.startsWith("public/")).length + " módulos:");
  for (const [rel, i] of [...MODULOS].filter(([r]) => r.startsWith("public/")).sort()) {
    p("  " + path.basename(rel).padEnd(26) + (i.proposito || "(sin cabecera)").slice(0, 96));
  }
  p();
  p("· MEMORIA · " + (MEMORIA || "no encontrada") + " — " + SECCIONES.length + " secciones. Las 10 más nuevas:");
  for (const s of SECCIONES.slice(-10)) p("  L" + String(s.desde).padStart(6) + "  " + s.titulo.slice(0, 92));
  p();
  p("· DOCUMENTOS docs/ — " + DOCS.length + ":");
  for (const d of DOCS.sort((a, b) => a.ruta.localeCompare(b.ruta))) {
    p("  " + d.ruta.replace("docs/", "").padEnd(38) + (d.titulo || "").slice(0, 84));
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
}
