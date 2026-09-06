/* tests/estado.js · Herramienta MANUAL de arranque de sesión (sin red, sin Redis).

   Imprime el ESTADO MEDIDO del sistema en este momento: routers y sus
   operaciones, conteos, vercel.json, puntos de llamada de lib/auth, el token
   integrado, las guardas estructurales de la suite y los títulos más nuevos
   de CLAUDE.md. Existe porque un prompt inicial NO puede contener hechos de
   estado — se quedan obsoletos y entonces el prompt miente («23 documentos
   en docs/» cuando ya hay 34). La regla es: el estado se MIDE al arrancar,
   nunca se afirma de memoria. Ver docs/PROMPT_INICIAL.md §2.

   Todo lo que imprime sale del árbol AHORA. Nada de esta salida debe
   copiarse a un prompt ni a la documentación como cifra fija: se re-mide en
   cada sesión con `node tests/estado.js`.

   Derivación de operaciones por router, en capas y DECLARANDO la vía:
     1. mapa `clave: () => require(...)` en el fuente del router (OPS);
     2. `const ACCIONES = [...]` en el router o en sus handlers;
     3. literales comparados (`op === "x"`, `accion === "x"`, `vista === "x"`)
        en router + handlers, más las claves de VISTA_POR_OP como alias.
   Si ninguna vía responde, se dice «no derivable: leer el router» — la
   ausencia no se rellena (la regla de «sin dato ≠ cero»). */

"use strict";

const fs = require("fs");
const path = require("path");

const RAIZ = path.join(__dirname, "..");

function git(args) {
  try {
    const { execSync } = require("child_process");
    return execSync(`git ${args}`, { cwd: RAIZ, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
  } catch {
    return null; // git no disponible en este entorno: se dice, no se inventa
  }
}

function archivosJs(dir, recursivo) {
  const abs = path.join(RAIZ, dir);
  if (!fs.existsSync(abs)) return [];
  const salida = [];
  for (const e of fs.readdirSync(abs, { withFileTypes: true })) {
    if (e.isDirectory() && recursivo) {
      salida.push(...archivosJs(path.join(dir, e.name), true));
    } else if (e.isFile() && e.name.endsWith(".js")) {
      salida.push(path.join(dir, e.name));
    }
  }
  return salida;
}

function contarExtension(dir, ext, recursivo) {
  const abs = path.join(RAIZ, dir);
  if (!fs.existsSync(abs)) return null;
  let n = 0;
  for (const e of fs.readdirSync(abs, { withFileTypes: true })) {
    if (e.isDirectory() && recursivo) n += contarExtension(path.join(dir, e.name), ext, true);
    else if (e.isFile() && e.name.endsWith(ext)) n += 1;
  }
  return n;
}

/* — Operaciones de un router, con la vía de derivación declarada — */
function operacionesDeRouter(archivo) {
  const fuente = fs.readFileSync(path.join(RAIZ, archivo), "utf8");
  const dominio = path.basename(archivo, ".js");
  const handlers = archivosJs(path.join("lib", "handlers", dominio), false);

  // Parámetro de despacho: qué claves de la query mira el router.
  const parametros = [];
  for (const p of ["op", "accion", "vista"]) {
    if (new RegExp(`q\\.${p}\\b|query\\.${p}\\b`).test(fuente)) parametros.push(p);
  }

  // Vía 1: mapa `clave: () => …require(...)` en el router. El valor puede ser
  // el require directo o un envoltorio (`() => (req, res) => require(...)`,
  // como "consorcio-simular" en api/perfil.js): basta que la línea de la
  // clave lleve `() =>` y un `require(`.
  const mapa = [...fuente.matchAll(/^\s*"?([a-z0-9_-]+)"?\s*:\s*\(\)\s*=>.*require\(/gm)].map((m) => m[1]);
  if (mapa.length) return { parametros, operaciones: mapa, via: "mapa del router", handlers };

  // Vía 2: `const ACCIONES = [...]` en router o handlers.
  const fuentes = [fuente, ...handlers.map((h) => fs.readFileSync(path.join(RAIZ, h), "utf8"))];
  for (const f of fuentes) {
    const m = f.match(/const\s+ACCIONES\s*=\s*\[([^\]]+)\]/);
    if (m) {
      const acciones = [...m[1].matchAll(/"([a-z0-9_-]+)"/g)].map((x) => x[1]);
      if (acciones.length) return { parametros, operaciones: acciones, via: "ACCIONES del handler", handlers };
    }
  }

  // Vía 3: literales comparados + claves de VISTA_POR_OP como alias.
  const literales = new Set();
  for (const f of fuentes) {
    for (const m of f.matchAll(/(?:op|accion|vista)\s*===\s*"([a-z0-9_-]+)"/g)) literales.add(m[1]);
    const vpo = f.match(/const\s+VISTA_POR_OP\s*=\s*\{([^}]+)\}/);
    if (vpo) for (const m of vpo[1].matchAll(/"?([a-z0-9_-]+)"?\s*:/g)) literales.add(m[1]);
  }
  if (literales.size) return { parametros, operaciones: [...literales].sort(), via: "literales comparados (router + handlers)", handlers };

  return { parametros, operaciones: null, via: "no derivable: leer el router", handlers };
}

/* — Puntos de llamada de lib/auth — */
function puntosDeAuth() {
  const modulos = [...archivosJs("api", false), ...archivosJs("lib", true)];
  const puntos = [];
  for (const rel of modulos) {
    const fuente = fs.readFileSync(path.join(RAIZ, rel), "utf8");
    if (/require\((["'])[^"']*\/auth(?:\.js)?\1\)/.test(fuente) || /require\((["'])\.\/auth(?:\.js)?\1\)/.test(fuente)) {
      puntos.push(rel);
    }
  }
  return puntos;
}

/* — Guardas estructurales de la suite (solo las localizables por texto) — */
function guardasDeSuite() {
  const ruta = path.join(RAIZ, "tests", "e2e.js");
  if (!fs.existsSync(ruta)) return ["tests/e2e.js no existe — medir a mano"];
  const lineas = fs.readFileSync(ruta, "utf8").split("\n");
  const guardas = [];
  lineas.forEach((l, i) => {
    if (l.includes('"api"') && /\.length,\s*\d+/.test(l)) guardas.push(`tests/e2e.js:${i + 1} → ${l.trim().slice(0, 110)}`);
  });
  return guardas.length ? guardas : ["conteo de api/ no localizado por texto — buscar a mano en la suite"];
}

/* — Impresión — */
const linea = (s) => console.log(s);

linea("== ESTADO MEDIDO DE DETEKTA · " + new Date().toISOString().slice(0, 10) + " ==");
linea("(todo lo de abajo se midió AHORA contra el árbol; no copiar a un prompt: se re-mide en cada sesión)");
linea("");

const rama = git("branch --show-current");
const head = git("log --oneline -3");
linea("· Rama: " + (rama || "git no disponible"));
if (head) for (const l of head.split("\n")) linea("  " + l);
linea("");

const routers = archivosJs("api", false).sort();
linea("· api/ — " + routers.length + " archivo(s):");
for (const r of routers) {
  const info = operacionesDeRouter(r);
  const ops = info.operaciones ? info.operaciones.join(" · ") : info.via;
  linea("  " + r + "  [despacha por: " + (info.parametros.join("/") || "?") + "]");
  linea("    operaciones (" + info.via + "): " + ops);
}
linea("");

linea("· Conteos: lib/ " + contarExtension("lib", ".js", true) + " js · public/ " + contarExtension("public", ".js", false) +
  " js · data/ " + contarExtension("data", ".json", false) + " json · docs/ " + contarExtension("docs", ".md", false) +
  " md · tests/ " + contarExtension("tests", ".js", false) + " js");

try {
  const v = JSON.parse(fs.readFileSync(path.join(RAIZ, "vercel.json"), "utf8"));
  linea("· vercel.json: " + (v.rewrites || []).length + " rewrites · " + (v.redirects || []).length +
    " redirects · crons: " + JSON.stringify(v.crons || []));
} catch {
  linea("· vercel.json: no legible desde aquí — leerlo a mano");
}

const auth = puntosDeAuth();
linea("· lib/auth: " + auth.length + " punto(s) de require → " + auth.join(", "));

const conToken = archivosJs("public", false).filter((rel) => {
  const m = fs.readFileSync(path.join(RAIZ, rel), "utf8").match(/const TOKEN = "([^"]+)"/);
  return Boolean(m);
});
linea("· Token integrado (const TOKEN) en: " + (conToken.length ? conToken.join(", ") : "ningún archivo de public/"));
linea("");

linea("· Guardas estructurales localizadas en la suite:");
for (const g of guardasDeSuite()) linea("  " + g);
linea("");

// La crónica vive en docs/MEMORIA.md desde el 27-ago-2026 (antes era CLAUDE.md
// entero, que se auto-cargaba en cada sesión); en un checkout anterior a la
// mudanza se cae a CLAUDE.md — la herramienta mide el árbol que tiene delante.
const rutaMemoria = ["docs/MEMORIA.md", "CLAUDE.md"].find((r) => fs.existsSync(path.join(RAIZ, r)));
try {
  const memoria = fs.readFileSync(path.join(RAIZ, rutaMemoria), "utf8");
  // La definición de «sección» es la de tests/mapa.js (`^##+ `: ##, ### y ####):
  // las dos herramientas contaban distinto (109 frente a 102 el 1-sep-2026) y
  // dos cifras distintas con el mismo nombre son una mentira en incubación.
  const titulos = memoria.split("\n").filter((l) => /^##+ /.test(l));
  linea("· " + rutaMemoria + ": " + Math.round(memoria.length / 1024) + " KB · " + titulos.length +
    " secciones. Las 12 más nuevas (lo nuevo va al FINAL del archivo; leer por secciones con" +
    " grep -n \"^###\" + sed -n 'A,Bp', jamás entero):");
  for (const t of titulos.slice(-12)) linea("  " + t.replace(/^#+ /, "— "));
} catch {
  linea("· memoria (" + rutaMemoria + "): no legible desde aquí");
}
linea("");
// Los dos documentos de protocolo NO llevan su tamaño escrito (M-DOC-07, 6-sep-2026: «~500 KB»
// con 665 KB reales): se mide aquí, en bytes del árbol que hay delante.
linea("· " + ["CLAUDE.md", "docs/PROMPT_INICIAL.md"].map((rel) => {
  try { return rel + ": " + fs.statSync(path.join(RAIZ, rel)).size + " bytes"; } catch { return rel + ": no legible desde aquí"; }
}).join(" · "));
linea("");
linea("· Verificación que cuenta como hecho: node tests/e2e.js (debe terminar 4/4) · node tests/apu_bench.js");
