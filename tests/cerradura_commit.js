/* tests/cerradura_commit.js · la suite antes de commitear, como CERRADURA (26-sep-2026)

   CLAUDE.md lo decía desde agosto —«la suite corre ANTES de commitear»— y una regla escrita
   no es una cerradura: ya costó un main en rojo. Esto la vuelve cerradura en dos mitades:

   · `registrar({ vueltas })` lo llama tests/e2e.js al terminar en verde: guarda la HUELLA
     del árbol de trabajo (un hash de todo lo versionable, incluidos los archivos nuevos) en
     .git/detekta-suite-verde.json, fuera de lo que se commitea. Si el árbol cambió durante
     la corrida, no registra nada: lo probado no es lo que hay.
   · Como hook PreToolUse de Claude Code (.claude/settings.json), lee la orden de Bash por
     stdin y, si es `git commit` o un `git merge` que commitea, compara la huella de AHORA con
     la registrada. Igual y con 4 vueltas (o con 1 si todo lo cambiado respecto de HEAD son
     .md, la excepción declarada en CLAUDE.md) → deja pasar. Si no → código 2 y el motivo, que
     Claude Code le enseña a la sesión y no ejecuta la orden.

   Cualquier otra orden sale con 0 al instante. Sin dependencias: solo git y node. */
"use strict";

const fs = require("fs");
const os = require("os");
const path = require("path");
const { execFileSync } = require("child_process");

const ARCHIVO = "detekta-suite-verde.json";

const git = (raiz, args, env) => execFileSync("git", args, { cwd: raiz, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], env: env || process.env }).trim();
const rutaGit = (raiz, nombre) => path.resolve(raiz, git(raiz, ["rev-parse", "--git-path", nombre]));

/* El hash del árbol de trabajo tal como quedaría con `git add -A`, sin tocar el índice real:
   se trabaja sobre una COPIA del índice (así git reutiliza su caché y no vuelve a leer los
   archivos que no cambiaron). */
function huella(raiz = process.cwd()) {
  const tmp = path.join(os.tmpdir(), `detekta-huella-${process.pid}-${Date.now()}`);
  try {
    const indice = rutaGit(raiz, "index");
    if (fs.existsSync(indice)) fs.copyFileSync(indice, tmp);
    const env = { ...process.env, GIT_INDEX_FILE: tmp };
    git(raiz, ["add", "-A"], env);
    return git(raiz, ["write-tree"], env);
  } finally {
    try { fs.unlinkSync(tmp); } catch { /* no quedó */ }
  }
}

/* ¿Todo lo que cambia respecto de HEAD son archivos .md? (la excepción de una vuelta) */
function soloTexto(raiz, arbol) {
  let nombres;
  try { nombres = git(raiz, ["diff-tree", "-r", "--name-only", "HEAD", arbol]).split("\n").filter(Boolean); } catch { return false; }
  return nombres.length > 0 && nombres.every((n) => /\.md$/i.test(n));
}

function registrar({ vueltas, raiz = process.cwd(), antes = null } = {}) {
  const ahora = huella(raiz);
  if (antes && antes !== ahora) return { ok: false, motivo: "el árbol cambió mientras corría la suite: no se registra" };
  const dato = { huella: ahora, vueltas: Number(vueltas) || 0, el: new Date().toISOString() };
  fs.writeFileSync(rutaGit(raiz, ARCHIVO), JSON.stringify(dato));
  return { ok: true, ...dato };
}

/* Separa una orden de shell en subórdenes (; && || | salto de línea) respetando comillas, y
   dice el subcomando de git de cada una saltando sus opciones globales (-c k=v, -C dir, --x). */
/* El CUERPO de un heredoc (<<EOF … EOF) es texto, no órdenes: un mensaje de commit o un
   script que menciona «git commit» no es un commit. Sin esto, la cerradura bloqueaba la
   orden que escribía su propia prueba (26-sep-2026). */
function sinHeredocs(orden) {
  const lineas = String(orden || "").split("\n");
  const fuera = [];
  const pendientes = [];
  for (const l of lineas) {
    if (pendientes.length) {
      const d = pendientes[0];
      if ((d.tabs ? l.replace(/^\t+/, "") : l) === d.fin) pendientes.shift();
      continue;
    }
    fuera.push(l);
    for (const m of l.matchAll(/<<(-?)\s*(['"]?)([A-Za-z_][A-Za-z0-9_]*)\2/g)) pendientes.push({ fin: m[3], tabs: m[1] === "-" });
  }
  return fuera.join("\n");
}

function subcomandosGit(orden) {
  const partes = [];
  let actual = [], palabra = "", comilla = null, hay = false;
  const cerrarPalabra = () => { if (hay) actual.push(palabra); palabra = ""; hay = false; };
  const cerrarOrden = () => { cerrarPalabra(); if (actual.length) partes.push(actual); actual = []; };
  const s = sinHeredocs(orden);
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (comilla) { if (c === comilla) comilla = null; else palabra += c; continue; }
    if (c === "'" || c === '"') { comilla = c; hay = true; continue; }
    if (c === "\\" && i + 1 < s.length) { palabra += s[++i]; hay = true; continue; }
    if (c === "\n" || c === ";" || c === "|" || c === "&" || c === "(" || c === ")") { cerrarOrden(); continue; }
    if (/\s/.test(c)) { cerrarPalabra(); continue; }
    palabra += c; hay = true;
  }
  cerrarOrden();
  const res = [];
  for (const p of partes) {
    let i = 0;
    while (i < p.length && /^[A-Za-z_][A-Za-z0-9_]*=/.test(p[i])) i++; // VAR=valor git …
    if (p[i] !== "git") continue;
    i++;
    while (i < p.length && p[i].startsWith("-")) { if (p[i] === "-c" || p[i] === "-C") i++; i++; }
    if (i < p.length) res.push({ sub: p[i], args: p.slice(i + 1) });
  }
  return res;
}

const COMMITEA = ({ sub, args }) => (sub === "commit")
  || (sub === "merge" && !args.some((a) => a === "--no-commit" || a === "--abort" || a === "--squash"));

function decidir(orden, raiz = process.cwd()) {
  if (!subcomandosGit(orden).some(COMMITEA)) return { pasa: true };
  const que = "Corra la suite ENTERA sobre estos mismos archivos —`node tests/e2e.js > salida.txt 2>&1; echo CODIGO=$?` (4/4), o `node tests/e2e.js 1` si solo cambian archivos .md— y vuelva a commitear sin tocar nada entre medias (CLAUDE.md, «La suite corre ANTES de commitear»). Para unir otra rama: `git merge --no-commit`, la suite, y después `git commit`.";
  let registro = null;
  try { registro = JSON.parse(fs.readFileSync(rutaGit(raiz, ARCHIVO), "utf8")); } catch { registro = null; }
  if (!registro) return { pasa: false, motivo: `Bloqueado: no hay registro de una suite en verde en este árbol. ${que}` };
  let ahora;
  try { ahora = huella(raiz); } catch (e) { return { pasa: false, motivo: `Bloqueado: no se pudo calcular la huella del árbol (${String((e && e.message) || e).slice(0, 120)}). ${que}` }; }
  if (registro.huella !== ahora) return { pasa: false, motivo: `Bloqueado: la suite pasó el ${registro.el} sobre OTROS archivos; algo cambió después. ${que}` };
  if (registro.vueltas >= 4) return { pasa: true };
  if (registro.vueltas >= 1 && soloTexto(raiz, ahora)) return { pasa: true };
  return { pasa: false, motivo: `Bloqueado: la suite pasó ${registro.vueltas} vuelta(s) y este cambio toca archivos que no son .md: hacen falta las 4. ${que}` };
}

module.exports = { huella, soloTexto, registrar, subcomandosGit, decidir, ARCHIVO };

if (require.main === module) {
  let entrada = "";
  process.stdin.setEncoding("utf8");
  process.stdin.on("data", (t) => { entrada += t; });
  process.stdin.on("end", () => {
    let orden = "";
    try { const j = JSON.parse(entrada || "{}"); orden = (j.tool_input && j.tool_input.command) || ""; } catch { orden = ""; }
    const d = decidir(orden, (() => { try { return JSON.parse(entrada).cwd || process.cwd(); } catch { return process.cwd(); } })());
    if (d.pasa) process.exit(0);
    process.stderr.write(d.motivo + "\n");
    process.exit(2);
  });
}
