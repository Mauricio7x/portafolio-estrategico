#!/usr/bin/env node
/* ════════════════════════════════════════════════════════════════
   Detecta · Validación de la capa legal y de la integridad del sitio.
   Sin dependencias obligatorias: con Node basta. Si `jsdom` está
   disponible (NODE_PATH o node_modules), añade un smoke test real del
   banner de consentimiento (aceptar / solo esenciales / guard).
   Uso:  node tests/validar-legal.js
   ════════════════════════════════════════════════════════════════ */
"use strict";
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const ROOT = path.join(__dirname, "..");
const read = (f) => fs.readFileSync(path.join(ROOT, f), "utf8");

let fallos = 0, ok = 0;
function check(nombre, cond, detalle) {
  if (cond) { ok++; console.log("  ✓ " + nombre); }
  else { fallos++; console.error("  ✗ " + nombre + (detalle ? " — " + detalle : "")); }
}

/* ── 1 · Sintaxis de TODOS los bloques <script> inline de index.html ── */
console.log("\n1 · Sintaxis JS inline (index.html)");
const html = read("index.html");
const bloques = [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)].map(m => m[1]);
check(`hay bloques inline (${bloques.length})`, bloques.length >= 6);
bloques.forEach((code, i) => {
  try { new Function(code); ok++; }
  catch (e) { fallos++; console.error(`  ✗ bloque #${i + 1}: ${e.message}`); }
});
console.log(`  ✓ ${bloques.length} bloques compilados`);

/* ── 2 · Sintaxis de los ficheros JS sueltos ── */
console.log("\n2 · node --check de sw.js, api/*, lib/*");
["sw.js", "api/proxy.js", "api/cron.js", "api/resumen.js", "lib/engine.js"].forEach(f => {
  try { execFileSync(process.execPath, ["--check", path.join(ROOT, f)], { stdio: "pipe" }); check(f, true); }
  catch (e) { check(f, false, String(e.stderr || e.message).trim().split("\n")[0]); }
});

/* ── 3 · Páginas legales: existencia y contenido mínimo ── */
console.log("\n3 · Páginas legales");
const paginas = {
  "privacidad.html": ["Ley 1581", "Decreto 1377", "suprimir", "Superintendencia de Industria y Comercio",
    "sic.gov.co", "mailto:", "RNBD", "aviso", "lang=\"es\""],
  "terminos.html": ["SECOP", "datos.gov.co", "OpenStreetMap", "ODbL", "GDELT", "Ley 527",
    "no es la probabilidad de ganar", "lang=\"es\""],
  "accesibilidad.html": ["WCAG", "2.1", "AA", "prefers-reduced-motion", "mailto:", "lang=\"es\""],
};
for (const [f, claves] of Object.entries(paginas)) {
  let cuerpo = "";
  try { cuerpo = read(f); } catch (e) { check(`${f} existe`, false); continue; }
  check(`${f} existe`, true);
  const low = cuerpo.toLowerCase();
  claves.forEach(c => check(`${f} menciona «${c}»`, low.includes(c.toLowerCase())));
}

/* ── 4 · HTTPS estricto: ningún recurso/llamada http:// (los xmlns de SVG no cuentan) ── */
console.log("\n4 · Solo HTTPS");
["index.html", "sw.js", "privacidad.html", "terminos.html", "accesibilidad.html",
 "api/proxy.js", "api/cron.js", "api/resumen.js", "lib/engine.js"].forEach(f => {
  let c = ""; try { c = read(f); } catch (e) { return; }
  const inseguros = (c.match(/http:\/\/[^\s"'<)]+/g) || [])
    .filter(u => !u.includes("www.w3.org"));   // xmlns de SVG: identificador, no red
  check(`${f} sin http://`, inseguros.length === 0, inseguros.slice(0, 3).join(", "));
});

/* ── 5 · Integraciones: SW precachea las páginas legales; vercel.json con cabeceras ── */
console.log("\n5 · Integraciones");
const sw = read("sw.js");
["privacidad.html", "terminos.html", "accesibilidad.html"].forEach(p =>
  check(`sw.js precachea ${p}`, sw.includes(p)));
let vercel = null;
try { vercel = JSON.parse(read("vercel.json")); check("vercel.json es JSON válido", true); }
catch (e) { check("vercel.json es JSON válido", false, e.message); }
if (vercel) {
  const hs = (vercel.headers || []).flatMap(h => h.headers || []).map(h => h.key);
  ["X-Frame-Options", "X-Content-Type-Options", "Referrer-Policy", "Strict-Transport-Security", "Permissions-Policy"]
    .forEach(k => check(`cabecera ${k}`, hs.includes(k)));
}
check("index.html enlaza privacidad", html.includes("privacidad.html"));
check("index.html enlaza términos", html.includes("terminos.html"));
check("index.html enlaza accesibilidad", html.includes("accesibilidad.html"));
check("gate: aviso de tratamiento", html.includes("dtc-gate-legal"));
check("gate: no guarda la clave en claro", !html.includes("sessionStorage.setItem(KEY, pw)"));
check("banner visible sobre el gate (override sec-locked)", html.includes("html.sec-locked body>#dtc-consent"));
check("api/resumen exige origen propio", read("api/resumen.js").includes("esOrigenPropio") &&
  !read("api/resumen.js").includes('Access-Control-Allow-Origin", "*"'));
check("api/proxy rechaza origen ajeno", read("api/proxy.js").includes("esOrigenAjeno"));

/* ── 5b · Accesibilidad estática ── */
console.log("\n5b · Accesibilidad estática");
check("gate: input con aria-label", /id="sec-pw"[^>]*aria-label="Contraseña"/.test(html));
check("#status es región viva", /id="status" role="status" aria-live="polite"/.test(html));
check("dropzone operable (tabindex+role)", /id="pliego-drop" tabindex="0" role="button"/.test(html));
check("modales con aria-modal (≥4)", (html.match(/aria-modal/g) || []).length >= 4);
check("caret KPI usa currentColor", !html.includes('stroke="#1d1d1f"'));
check("anticipo-trigger con aria-label", /id="anticipo-trigger"[^>]*aria-label/.test(html));
check("capa A11Y presente", html.includes("CAPA A11Y"));
check("atajos desactivables (WCAG 2.1.4)", html.includes("detecta-atajos-off"));

/* ── 6 · Smoke test del banner con jsdom (opcional) ── */
(async () => {
console.log("\n6 · Smoke test del banner (jsdom)");
let JSDOM = null;
try { JSDOM = require("jsdom").JSDOM; } catch (e) { console.log("  – jsdom no disponible: se omite (instala jsdom para el test completo)"); }
if (JSDOM) {
  const codigoLegal = bloques.find(b => b.includes("CAPA LEGAL"));
  const codigoA11y = bloques.find(b => b.includes("CAPA A11Y"));
  check("capa legal encontrada", !!codigoLegal);
  check("capa a11y encontrada", !!codigoA11y);

  function montar(preConsent) {
    const dom = new JSDOM(`<!DOCTYPE html><html class="sec-locked"><body>
      <div id="sec-gate"><div class="box"><input id="sec-pw"></div></div>
      <footer><div class="wrap">pie</div></footer></body></html>`,
      { runScripts: "outside-only", url: "https://portafolio-estrategico.vercel.app/" });
    const { window } = dom;
    if (preConsent) window.localStorage.setItem("detecta-consent-v1", JSON.stringify(preConsent));
    window.confirm = () => true;
    window.eval(codigoLegal);
    return window;
  }

  // 6a · Primera visita: banner presente, gate y footer con enlaces
  let w = montar(null);
  check("primera visita: banner visible", !!w.document.getElementById("dtc-consent"));
  check("gate recibe aviso de tratamiento", !!w.document.getElementById("dtc-gate-legal"));
  check("footer recibe enlaces legales", !!w.document.getElementById("dtc-foot"));

  // 6b · Aceptar todo → consentimiento funcional y banner fuera
  w.document.getElementById("dtc-acc").click();
  let rec = JSON.parse(w.localStorage.getItem("detecta-consent-v1"));
  check("aceptar guarda funcionales=true", rec && rec.funcionales === true);
  check("banner se retira al aceptar", !w.document.getElementById("dtc-consent"));
  w.localStorage.setItem("detecta-watchlist-v1", "[1]");
  check("con aceptación, localStorage funcional escribe", w.localStorage.getItem("detecta-watchlist-v1") === "[1]");

  // 6c · Solo esenciales → guard activo: purga y bloquea escrituras detecta-*
  w = montar(null);
  w.localStorage.setItem("detecta-watchlist-v1", "[9]");
  w.document.getElementById("dtc-ess").click();
  rec = JSON.parse(w.localStorage.getItem("detecta-consent-v1"));
  check("rechazo guarda funcionales=false", rec && rec.funcionales === false);
  check("rechazo purga datos funcionales", w.localStorage.getItem("detecta-watchlist-v1") === null);
  w.localStorage.setItem("detecta-kanban-v1", "{}");
  check("guard bloquea escrituras funcionales", w.localStorage.getItem("detecta-kanban-v1") === null);
  w.localStorage.setItem("ajeno", "1");
  check("guard no toca claves ajenas", w.localStorage.getItem("ajeno") === "1");
  check("registro de consentimiento persiste", !!w.localStorage.getItem("detecta-consent-v1"));
  w.localStorage.setItem("detecta-contraste", "1");
  check("preferencias de accesibilidad son esenciales (pasan el guard)",
    w.localStorage.getItem("detecta-contraste") === "1");

  // 6d · Visita posterior con consentimiento previo: sin banner
  w = montar({ v: 1, esenciales: true, funcionales: true, fecha: "2026-07-27" });
  check("con consentimiento previo no hay banner", !w.document.getElementById("dtc-consent"));

  // 6e · Configurar: guardar selección respeta el checkbox
  w = montar(null);
  w.document.getElementById("dtc-tog").click();
  check("configurar expande el panel", w.document.getElementById("dtc-consent").classList.contains("cfg"));
  w.document.getElementById("dtc-func").checked = false;
  w.document.getElementById("dtc-save").click();
  rec = JSON.parse(w.localStorage.getItem("detecta-consent-v1"));
  check("guardar selección respeta funcionales=false", rec && rec.funcionales === false);

  /* ── 7 · Smoke test de la capa A11Y ── */
  console.log("\n7 · Smoke test de la capa A11Y (jsdom)");
  const dom = new JSDOM(`<!DOCTYPE html><html lang="es"><body>
    <nav id="tabs"><button class="tab active" data-tab="resumen">Resumen</button>
    <button class="tab" data-tab="mapa">Mapa</button></nav>
    <button id="b1" title="Alto contraste">◐</button>
    <input id="i1" placeholder="🔎 Buscar proceso">
    <div id="pliego-drop" tabindex="0" role="button"></div>
    <div class="v3-toast" id="t1"></div></body></html>`,
    { runScripts: "outside-only", url: "https://portafolio-estrategico.vercel.app/" });
  const wa = dom.window;
  wa.eval(codigoA11y);
  check("labelize: title → aria-label", wa.document.getElementById("b1").getAttribute("aria-label") === "Alto contraste");
  check("labelize: placeholder → aria-label sin emoji",
    wa.document.getElementById("i1").getAttribute("aria-label") === "Buscar proceso");
  check("tabs: role=tablist", wa.document.getElementById("tabs").getAttribute("role") === "tablist");
  check("tabs: aria-selected sincronizado",
    wa.document.querySelector('[data-tab="resumen"]').getAttribute("aria-selected") === "true" &&
    wa.document.querySelector('[data-tab="mapa"]').getAttribute("aria-selected") === "false");
  check("región viva para toasts creada", !!wa.document.getElementById("dtc-live"));
  await new Promise(r => setTimeout(r, 30));
  const t1 = wa.document.getElementById("t1");
  t1.textContent = "★ Guardado"; t1.classList.add("show");
  await new Promise(r => setTimeout(r, 50));
  check("toast anunciado en la región viva", wa.document.getElementById("dtc-live").textContent === "★ Guardado");
}

/* ── Resultado ── */
console.log(`\n${fallos === 0 ? "✅" : "❌"} ${ok} comprobaciones OK · ${fallos} fallos`);
process.exit(fallos === 0 ? 0 : 1);
})().catch(e => { console.error("✗ error inesperado:", e); process.exit(1); });
