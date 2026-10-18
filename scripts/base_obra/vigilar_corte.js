"use strict";
/* Base nacional de obra · vigía del corte de la alerta de precio bajo (18-oct-2026). Solo MIDE y AVISA.
   Uso:  node scripts/base_obra/vigilar_corte.js <carpeta>
   Lee `cifras.json` de la corrida (`umbral_alerta`, campo «todas») y, para cada fila de
   `TEMERARIO_POR_MODALIDAD` (lib/apu/piso_techo), compara cuántas ganadoras quedan bajo el corte de
   la tabla con lo que la tabla dice. Si «de cada 100» se movió más de 1 o el número de ganadoras más
   de un 20 %, AVISA (anotación de GitHub y resumen de la corrida). NO cambia la tabla ni falla el
   flujo: mover el corte es otro encargo con el visto bueno del dueño. Una modalidad que la corrida
   no trae queda «sin_medir», jamás «0 de 0». Escribe vigilancia.json en la carpeta. */
const fs = require("fs");
const path = require("path");

const { miles } = require("../../lib/lenguaje_pantalla.js");
const coma = (x) => String(x).replace(".", ",");   // 2.2 → «2,2»
const UMBRAL_PUNTOS = 1;      // de cada 100 ganadoras
const UMBRAL_GANADORAS = 0.2; // fracción de cambio del número de ganadoras

/* PURA. La comparación se hace con las tasas SIN redondear (una cifra redondeada para mostrar no
   decide); el redondeo es solo para el texto y el resumen. */
function vigilarCorte(cifras, tabla) {
  const ua = cifras && cifras.umbral_alerta && typeof cifras.umbral_alerta === "object" ? cifras.umbral_alerta : null;
  const r1 = (x) => Math.round(x * 10) / 10;
  return Object.entries(tabla).map(([modalidad, t]) => {
    const corte_pct = 100 - t.baja_pct;
    const tasaAntes = t.bajo_el_corte / t.ganadoras;
    const antes = { ganadoras: t.ganadoras, bajo_el_corte: t.bajo_el_corte, de_cada_100: r1(100 * tasaAntes), datos_al: t.datos_al };
    const filas = ua && Array.isArray(ua[modalidad]) ? ua[modalidad] : null;
    const f = filas ? filas.find((x) => x && Number.isFinite(x.corte_pct) && Math.abs(x.corte_pct - corte_pct) < 1e-9) : null;
    const n = f && f.todas ? f.todas : null;
    // sin la fila, con 0 ganadoras (no hay tasa) o con conteos que no son conteos, no se mide:
    // «sin_medir», jamás «0 de cada 100» ni «igual»
    const conteo = (x) => Number.isInteger(x) && x >= 0;
    if (!n || !conteo(n.ganadoras) || n.ganadoras === 0 || !conteo(n.bajo_el_corte) || n.bajo_el_corte > n.ganadoras) return { modalidad, corte_pct, estado: "sin_medir", antes, ahora: null, aviso: null };
    const tasaAhora = n.bajo_el_corte / n.ganadoras;
    const dPuntos = 100 * (tasaAhora - tasaAntes);
    const dGanadoras = (n.ganadoras - t.ganadoras) / t.ganadoras;
    const movido = Math.abs(dPuntos) > UMBRAL_PUNTOS || Math.abs(dGanadoras) > UMBRAL_GANADORAS;
    const ahora = { ganadoras: n.ganadoras, bajo_el_corte: n.bajo_el_corte, de_cada_100: r1(100 * tasaAhora) };
    return { modalidad, corte_pct, estado: movido ? "movido" : "igual", antes, ahora,
      diferencia_puntos: r1(dPuntos), diferencia_ganadoras_pct: r1(100 * dGanadoras),
      aviso: movido ? `El corte de ${t.nombre} (${corte_pct} %) ya no dice lo mismo: la tabla dice ${miles(t.bajo_el_corte)} de ${miles(t.ganadoras)} ganadoras (${coma(antes.de_cada_100)} de cada 100, datos al ${t.datos_al}) y esta corrida, ${miles(n.bajo_el_corte)} de ${miles(n.ganadoras)} (${coma(ahora.de_cada_100)} de cada 100). Revise la tabla TEMERARIO_POR_MODALIDAD.` : null };
  });
}

const avisoSinMedir = (sm) => `${sm.length === 1 ? "1 modalidad quedó" : `${sm.length} modalidades quedaron`} sin medir (${sm.map((f) => f.modalidad).join(", ")}): la tabla no se pudo comparar con esta corrida.`;

/* El resumen de la corrida en Markdown (GITHUB_STEP_SUMMARY). PURA. */
function resumenMarkdown(filas) {
  const lineas = ["### Corte de la alerta de precio bajo frente a esta corrida", "", "| Modalidad | Corte | Tabla | Esta corrida | Estado |", "|---|---|---|---|---|"];
  for (const f of filas) {
    const ahora = f.ahora ? `${miles(f.ahora.bajo_el_corte)} de ${miles(f.ahora.ganadoras)} (${coma(f.ahora.de_cada_100)} de cada 100)` : "sin medir";
    lineas.push(`| ${f.modalidad} | ${f.corte_pct} % | ${miles(f.antes.bajo_el_corte)} de ${miles(f.antes.ganadoras)} (${coma(f.antes.de_cada_100)} de cada 100) | ${ahora} | ${f.estado} |`);
  }
  const avisos = filas.filter((f) => f.aviso), sinMedir = filas.filter((f) => f.estado === "sin_medir");
  const partes = avisos.map((f) => `**AVISO:** ${f.aviso}`);
  // «sin cambios» solo si TODO se midió: lo que no se midió no «no cambió» (sin dato ≠ cero)
  if (sinMedir.length) partes.push(`**AVISO:** ${avisoSinMedir(sinMedir)}`);
  lineas.push("", partes.length ? partes.join("\n\n") : "Sin cambios que obliguen a revisar la tabla.");
  return lineas.join("\n") + "\n";
}

function main() {
  const dir = process.argv[2];
  if (!dir) { process.stderr.write("uso: node scripts/base_obra/vigilar_corte.js <carpeta>\n"); process.exit(2); }
  const { TEMERARIO_POR_MODALIDAD } = require("../../lib/apu/piso_techo.js");
  let cifras = null, error = null;
  try { cifras = JSON.parse(fs.readFileSync(path.join(dir, "cifras.json"), "utf8")); } catch (e) { error = e.message; }
  const filas = vigilarCorte(cifras, TEMERARIO_POR_MODALIDAD);
  fs.writeFileSync(path.join(dir, "vigilancia.json"), JSON.stringify({ generado: new Date().toISOString(), error_cifras: error, umbral_puntos: UMBRAL_PUNTOS, umbral_ganadoras: UMBRAL_GANADORAS, filas }, null, 1));
  // las anotaciones de GitHub no admiten saltos de línea ni «%» sueltos: se escapan
  const anotar = (t) => process.stdout.write(`::warning title=Corte de la alerta::${String(t).replace(/%/g, "%25").replace(/\r/g, "%0D").replace(/\n/g, "%0A")}\n`);
  if (error) anotar(`No se pudo leer cifras.json (${error}): el corte queda sin medir en esta corrida.`);
  for (const f of filas) {
    process.stdout.write(`${f.modalidad}: ${f.estado}${f.ahora ? ` · ${f.ahora.bajo_el_corte} de ${f.ahora.ganadoras}` : ""}\n`);
    if (f.aviso) anotar(f.aviso);
  }
  const sinMedir = filas.filter((f) => f.estado === "sin_medir");
  if (sinMedir.length && !error) anotar(avisoSinMedir(sinMedir));
  if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, resumenMarkdown(filas));
}

if (require.main === module) main();
module.exports = { vigilarCorte, resumenMarkdown, UMBRAL_PUNTOS, UMBRAL_GANADORAS };
