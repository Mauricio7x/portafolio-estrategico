#!/usr/bin/env node
'use strict';
// Prueba de la cerradura del commit. Ejecuta el hook REAL (guarda-commit.js, o el que diga GUARDA_HOOK
// para probar contra una versión anterior: así se comprueba que la prueba FALLA contra el árbol viejo)
// sobre repositorios de juguete cuya suite es falsa: registra con qué argumentos la llamaron y sale con
// código 1, de modo que «código 2» = «el hook corrió la suite y bloqueó» y «código 0» = «dejó pasar».
// No corre la suite de Detekta ni toca el repositorio real. Uso: node .claude/hooks/guarda-commit.test.js
// No es parte del 4/4 de tests/e2e.js: se corre a mano cuando se toca el hook.

const { spawnSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const HOOK = process.env.GUARDA_HOOK || path.join(__dirname, 'guarda-commit.js');
const RAIZ = fs.mkdtempSync(path.join(os.tmpdir(), 'guarda-commit-'));
const REG = path.join(RAIZ, 'corridas.log');
let fallos = 0, casos = 0;

function sh(args, cwd) {
  const r = spawnSync('git', args, { cwd, encoding: 'utf8' });
  if (r.status !== 0) throw new Error('git ' + args.join(' ') + ': ' + r.stderr);
}

function repo(nombre) {
  const d = path.join(RAIZ, nombre);
  fs.mkdirSync(path.join(d, 'tests'), { recursive: true });
  sh(['init', '-q', '.'], d);
  sh(['config', 'user.email', 'a@b.c'], d);
  sh(['config', 'user.name', 't'], d);
  fs.writeFileSync(path.join(d, 'tests', 'e2e.js'),
    'require("fs").appendFileSync(process.env.TOY_LOG, JSON.stringify(process.argv.slice(2)) + "\\n");process.exit(Number(process.env.TOY_EXIT || 1));\n');
  fs.writeFileSync(path.join(d, 'a.js'), 'a\n');
  fs.writeFileSync(path.join(d, 'n.md'), 'n\n');
  sh(['add', '-A'], d);
  sh(['commit', '-qm', 'base'], d);
  return d;
}

function correr(d, comando, env) {
  try { fs.unlinkSync(REG); } catch (e) { /* sin registro previo */ }
  const entrada = JSON.stringify({ tool_name: 'Bash', cwd: d, tool_input: { command: comando } });
  const r = spawnSync('node', [HOOK], { input: entrada, encoding: 'utf8', env: Object.assign({}, process.env, { TOY_LOG: REG }, env || {}) });
  let corridas = [];
  try { corridas = fs.readFileSync(REG, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l)); } catch (e) { /* no corrió */ }
  return { codigo: r.status, corridas, stderr: r.stderr };
}

function esperar(rotulo, ok, detalle) {
  casos++;
  if (!ok) { fallos++; console.log('  ✘ ' + rotulo + (detalle ? ' · ' + detalle : '')); } else console.log('  ✔ ' + rotulo);
}

function limpio(d) { sh(['reset', '-q', '--hard'], d); sh(['clean', '-fdq'], d); try { fs.unlinkSync(path.join(d, '.git', 'guarda-commit.json')); } catch (e) { /* sin sello */ } }
function stage(d, archivo, texto) { fs.writeFileSync(path.join(d, archivo), texto || 'x\n'); sh(['add', '-A', '--', archivo], d); }

// 1 · Detección: qué comandos son un commit.
console.log('Detección');
const d1 = repo('deteccion');
const SI = [
  'git commit -m x', 'git commit -am x', 'git commit -a -m x', 'git commit --all -m x', 'git -C ' + d1 + ' commit -m x',
  'git -c user.name=x commit -m x', 'git --no-pager commit -m x', 'echo hola; git commit -m x', 'true || git commit -m x',
  '(git commit -m x)', 'FOO=1 git commit -m x', 'time git commit -m x', 'sudo git commit -m x', 'bash -c "git commit -m x"',
  "sh -lc 'git commit -m x'", 'eval "git commit -m x"', 'if true; then git commit -m x; fi', 'echo $(git commit -m x)',
  "git commit -F - <<'E'\nmensaje\nE", 'git commit --amend -m x',
];
const NO = [
  'git status', 'grep -n "git commit" docs/MEMORIA.md', 'git show HEAD | grep -n "todo git commit"', 'echo "git commit"',
  "echo 'corre la suite antes de todo git commit'", 'git commit-tree HEAD^{tree}', 'git commit-graph write', 'git log --grep="git commit"',
  'cat docs/x.md', 'npm run commit', 'git push origin main',
  // los dos que reprodujo el revisor: «git commit» con un espacio delante, dentro de comillas
  'grep -n "corre la suite antes de todo git commit que lance" docs/MEMORIA.md',
  'git show HEAD | grep -n "todo git commit que"', 'echo "antes de todo git commit hoy"', "echo 'hoy se hace git commit de nuevo'",
];
for (const c of SI) {
  limpio(d1); stage(d1, 'a.js', 'cambio\n');
  const r = correr(d1, c);
  esperar('bloquea y corre la suite: ' + JSON.stringify(c), r.codigo === 2 && r.corridas.length === 1, 'codigo=' + r.codigo + ' corridas=' + r.corridas.length);
}
for (const c of NO) {
  limpio(d1); stage(d1, 'a.js', 'cambio\n');
  const r = correr(d1, c);
  esperar('no la corre: ' + JSON.stringify(c), r.codigo === 0 && r.corridas.length === 0, 'codigo=' + r.codigo + ' corridas=' + r.corridas.length);
}

// 2 · Modo: 4 vueltas (sin argumento) o 1 (solo .md).
console.log('Modo 4/4 o 1/1');
const d2 = repo('modo');
function modo(rotulo, preparar, comando, esperadas) {
  limpio(d2); preparar(d2);
  const r = correr(d2, comando || 'git commit -m x');
  const a = r.corridas.length === 1 ? r.corridas[0] : null;
  const ok = esperadas === null ? r.corridas.length === 0 : a && JSON.stringify(a) === JSON.stringify(esperadas);
  esperar(rotulo, ok, 'corridas=' + JSON.stringify(r.corridas));
}
modo('solo .md → 1 vuelta', (d) => stage(d, 'n.md', 'otro\n'), null, ['1']);
modo('solo .MD en mayúsculas → 1 vuelta', (d) => stage(d, 'N.MD', 'otro\n'), null, ['1']);
modo('ruta con ñ y espacio, .md → 1 vuelta', (d) => stage(d, 'año nuevo.md', 'otro\n'), null, ['1']);
modo('solo .js → 4 vueltas', (d) => stage(d, 'a.js', 'otro\n'), null, []);
modo('.md y .json juntos → 4 vueltas', (d) => { stage(d, 'n.md', 'o\n'); stage(d, 'x.json', '{}\n'); }, null, []);
modo('archivo .md.js → 4 vueltas', (d) => stage(d, 'n.md.js', 'o\n'), null, []);
modo('renombre a.js → a.md → 4 vueltas (se borra código)', (d) => sh(['mv', 'a.js', 'a.md'], d), null, []);
modo('borrar código → 4 vueltas', (d) => sh(['rm', '-q', 'a.js'], d), null, []);
modo('commit -a con .js modificado sin staged → 4 vueltas', (d) => { stage(d, 'n.md', 'o\n'); fs.writeFileSync(path.join(d, 'a.js'), 'mod\n'); }, 'git commit -am x', []);
modo('commit -m con .js sin staged y .md staged → 1 vuelta (solo entra el .md)', (d) => { stage(d, 'n.md', 'o\n'); fs.writeFileSync(path.join(d, 'a.js'), 'mod\n'); }, 'git commit -m x', ['1']);
modo('ruta de código en el comando, nada en staged → 4 vueltas (no pasa en silencio)', (d) => fs.writeFileSync(path.join(d, 'a.js'), 'mod\n'), 'git commit -m x a.js', []);
modo('ruta de código en el comando y .md en staged → 4 vueltas', (d) => { stage(d, 'n.md', 'o\n'); fs.writeFileSync(path.join(d, 'a.js'), 'mod\n'); }, 'git commit -m "x y" a.js', []);
modo('commit -o con ruta → 4 vueltas', (d) => { stage(d, 'n.md', 'o\n'); fs.writeFileSync(path.join(d, 'a.js'), 'mod\n'); }, 'git commit -o -m x -- a.js', []);
modo('git add encadenado → 4 vueltas', (d) => fs.writeFileSync(path.join(d, 'n.md'), 'o\n'), 'git add -A && git commit -m x', []);
modo('nada en staged y sin ruta → 4 vueltas (no se sabe qué entra)', (d) => fs.writeFileSync(path.join(d, 'a.js'), 'mod\n'), 'git commit -m x', []);
modo('--amend sin staged (solo el mensaje) → no corre', () => {}, 'git commit --amend -m nuevo', null);
modo('--allow-empty → no corre', () => {}, 'git commit --allow-empty -m x', null);
modo('mensaje con espacios y un token suelto dentro de comillas no cuenta como ruta', (d) => stage(d, 'a.js', 'otro\n'), 'git commit -m "arreglo de a.js y n.md"', []);

// 3 · Sello: mismo árbol no repite; otro árbol sí; suite roja nunca sella.
console.log('Sello y suite roja');
const d3 = repo('sello');
limpio(d3); stage(d3, 'a.js', 'v1\n');
let r = correr(d3, 'git commit -m x', { TOY_EXIT: '0' });
esperar('suite verde: pasa y corre una vez', r.codigo === 0 && r.corridas.length === 1);
r = correr(d3, 'git commit -m x', { TOY_EXIT: '0' });
esperar('mismo árbol: pasa SIN volver a correr', r.codigo === 0 && r.corridas.length === 0, 'corridas=' + r.corridas.length);
stage(d3, 'a.js', 'v2\n');
r = correr(d3, 'git commit -m x', { TOY_EXIT: '0' });
esperar('árbol distinto: vuelve a correr', r.codigo === 0 && r.corridas.length === 1);
stage(d3, 'a.js', 'v3\n');
r = correr(d3, 'git commit -m x', { TOY_EXIT: '1' });
esperar('suite roja: bloquea con código 2 y dice por qué', r.codigo === 2 && /COMMIT BLOQUEADO/.test(r.stderr), 'codigo=' + r.codigo);
r = correr(d3, 'git commit -m x', { TOY_EXIT: '1' });
esperar('suite roja no deja sello: el siguiente intento vuelve a correr', r.codigo === 2 && r.corridas.length === 1);
fs.writeFileSync(path.join(d3, '.git', 'guarda-commit.json'), '{no es json');
r = correr(d3, 'git commit -m x', { TOY_EXIT: '0' });
esperar('sello corrupto: se ignora y corre', r.codigo === 0 && r.corridas.length === 1);
const raro = spawnSync('node', [HOOK], { input: 'esto no es json', encoding: 'utf8' });
esperar('entrada que no es JSON: deja pasar', raro.status === 0);

fs.rmSync(RAIZ, { recursive: true, force: true });
console.log('\n' + (casos - fallos) + '/' + casos + ' casos' + (fallos ? ' · ' + fallos + ' FALLAN' : ' · todos en verde'));
process.exit(fallos ? 1 : 0);
