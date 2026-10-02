#!/usr/bin/env node
'use strict';
// Cerradura del commit (hook PreToolUse de Claude Code sobre Bash).
// CLAUDE.md manda correr la suite ANTES de commitear: 4/4, o 1/1 si el commit solo cambia .md.
// Una regla escrita no es una cerradura; esto lo es. Si el comando no es un `git commit` sale en
// silencio. Si lo es, corre la suite REAL (node tests/e2e.js) y bloquea el commit si no termina en
// verde. No hay bandera para saltarla: para apagarla se edita .claude/settings.json a la vista.
//
// Atajo legítimo: si el árbol de trabajo es byte a byte el que ya pasó la suite (sello en .git),
// no se repite. El sello solo lo escribe este mismo hook tras una corrida en verde.
// Sin dependencias: solo módulos nativos de Node, como el resto del repositorio.

const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

function git(args, cwd) {
  const r = spawnSync('git', args, { cwd, encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 });
  return r.status === 0 ? r.stdout : null;
}

function leerEntrada() {
  try { return JSON.parse(fs.readFileSync(0, 'utf8')); } catch (e) { return null; }
}

const ES_COMMIT = /(^|[;&|(\s])git\s+(?:-[^\s]+\s+(?:[^\s-][^\s]*\s+)?)*commit(\s|$)/;
const HAY_ADD = /(^|[;&|(\s])git\s+(?:-[^\s]+\s+)*(add|rm|mv|checkout|restore|stash)(\s|$)/;
const OPCION_A = /\scommit\b[^;&|]*\s(-[a-zA-Z]*a[a-zA-Z]*|--all)(\s|$)/;

function archivosDelCommit(cmd, cwd) {
  // null = no se puede saber qué entra: se trata como cambio completo (4/4), el lado seguro.
  if (HAY_ADD.test(cmd)) return null;
  const staged = git(['diff', '--cached', '--name-only'], cwd);
  if (staged === null) return null;
  let lista = staged.split('\n').filter(Boolean);
  if (OPCION_A.test(cmd)) {
    const mod = git(['diff', '--name-only'], cwd);
    if (mod === null) return null;
    lista = lista.concat(mod.split('\n').filter(Boolean));
  }
  return lista;
}

function huella(cwd) {
  const h = crypto.createHash('sha1');
  const d = git(['diff', 'HEAD'], cwd);
  if (d === null) return null;
  h.update(d);
  const sin = git(['ls-files', '--others', '--exclude-standard', '-z'], cwd);
  if (sin === null) return null;
  for (const f of sin.split('\0').filter(Boolean).sort()) {
    h.update('\0' + f + '\0');
    try { h.update(fs.readFileSync(path.join(cwd, f))); } catch (e) { h.update('?'); }
  }
  return h.digest('hex');
}

function main() {
  const entrada = leerEntrada();
  const cmd = entrada && entrada.tool_input && entrada.tool_input.command;
  if (typeof cmd !== 'string' || !ES_COMMIT.test(cmd)) return 0;

  const cwd = (entrada && entrada.cwd) || process.cwd();
  const raiz = (git(['rev-parse', '--show-toplevel'], cwd) || '').trim();
  if (!raiz || !fs.existsSync(path.join(raiz, 'tests', 'e2e.js'))) return 0; // otro repositorio: no es de este hook

  const archivos = archivosDelCommit(cmd, raiz);
  if (archivos && archivos.length === 0) return 0; // nada que commitear (o solo cambia el mensaje)
  const soloMd = !!archivos && archivos.every((f) => /\.md$/i.test(f));
  const vueltas = soloMd ? 1 : 4;

  const gitDir = path.resolve(raiz, (git(['rev-parse', '--git-dir'], raiz) || '.git').trim());
  const sello = path.join(gitDir, 'guarda-commit.json');
  const fp = huella(raiz);
  try {
    const s = JSON.parse(fs.readFileSync(sello, 'utf8'));
    if (fp && s.fp === fp && s.vueltas >= vueltas) return 0;
  } catch (e) { /* sin sello: se corre */ }

  const salida = path.join(gitDir, 'guarda-commit.salida.txt');
  const fd = fs.openSync(salida, 'w');
  const args = ['tests/e2e.js'].concat(vueltas === 4 ? [] : [String(vueltas)]);
  // Sin tuberías: el código de salida es el de la suite, no el de un `tail`.
  const r = spawnSync('node', args, { cwd: raiz, stdio: ['ignore', fd, fd] });
  fs.closeSync(fd);

  if (r.status === 0) {
    // La huella se toma DESPUÉS de correr: la suite puede dejar archivos en el árbol, y el próximo
    // commit verá ese árbol, no el de antes de la corrida.
    const despues = huella(raiz);
    if (despues) fs.writeFileSync(sello, JSON.stringify({ fp: despues, vueltas, cuando: new Date().toISOString() }));
    return 0;
  }
  let cola = '';
  try { cola = fs.readFileSync(salida, 'utf8').split('\n').slice(-25).join('\n'); } catch (e) { /* sin salida */ }
  process.stderr.write(
    'COMMIT BLOQUEADO: `node tests/e2e.js' + (vueltas === 4 ? '' : ' ' + vueltas) + '` terminó con código ' +
    (r.status === null ? 'señal ' + r.signal : r.status) + '. Arregle lo que falla y vuelva a commitear; ' +
    'no se salta la suite. Salida completa en ' + salida + '.\n---\n' + cola + '\n'
  );
  return 2;
}

process.exit(main());
