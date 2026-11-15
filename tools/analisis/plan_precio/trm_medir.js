"use strict";
/* ============================================================================
   Plan precio · Los centavos de la TRM: ¿los cuatro rangos del sorteo del método salen por igual? (14-nov-2026)
   ----------------------------------------------------------------------------
   Solo MIDE, fuera de la aplicación. En los documentos tipo de obra el método de ponderación del precio se
   escoge por los centavos de la TRM de un día posterior (rangos 0,00–0,24 · 0,25–0,49 · 0,50–0,74 · 0,75–0,99;
   lib/metodos_ponderacion.metodoPorTrm, que aquí se LLAMA). La regla de QUÉ día cambia por documento y está
   leída en tools/analisis/normas_metodos.json (campo `regla_fecha_trm`): aquí no se afirma ninguna norma.

     node tools/analisis/plan_precio/trm_medir.js <carpeta_de_datos> [salida.json]

   Baja (si no están ya en <carpeta>/trm/) la serie y sus metadatos de datos.gov.co, conjunto 32sa-8pi3
   («Tasa de Cambio Representativa del Mercado- TRM», Superintendencia Financiera de Colombia), y mide, para
   los días de vigencia desde 2020-01-01 hasta la fecha de la consulta:
     A · integridad de la serie (huecos, solapes, valores ilegibles);
     B · parte de cada rango por día calendario de vigencia, por día hábil de Colombia y por valor certificado
         (una fila de la serie = una certificación), con ji-cuadrado contra 25 % cada uno;
     C · si los centavos (00–99) y el último dígito salen parejos;
     D · si el rango de una certificación se anticipa con el de la anterior (tabla de transición, ji-cuadrado
         de independencia y acierto fuera de muestra: aprende hasta 2024, prueba 2025-2026);
     E · si se anticipa con la parte entera (último dígito y paridad), y cuánto se mueve la TRM de un día a otro;
     F · cuántos días calendario comparten la misma TRM (`vigenciadesde`..`vigenciahasta`) y, para una fecha F
         hábil en Colombia, cuándo queda certificada la TRM que rige el 1.er y el 2.º día hábil siguiente.
   Límites: el ji-cuadrado «por día» cuenta varias veces el mismo valor (fines de semana y festivos): la prueba
   válida es la de valores certificados; las otras dos se dan como hecho contado. Días hábiles con lib/habiles
   (festivos de Colombia); los festivos de Estados Unidos no se calculan: se ven en la serie como días hábiles
   de Colombia sin certificación nueva.
   ============================================================================ */
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const RAIZ = path.join(__dirname, "..", "..", "..");
const { metodoPorTrm, METODOS } = require(path.join(RAIZ, "lib", "metodos_ponderacion.js"));
const H = require(path.join(RAIZ, "lib", "habiles.js"));

const SERIE = "https://www.datos.gov.co/resource/32sa-8pi3.json";
const META = "https://www.datos.gov.co/api/views/32sa-8pi3.json";
const DESDE = "2020-01-01";
const CORTE_PRUEBA = "2025-01-01";
const RANGOS = ["0,00–0,24", "0,25–0,49", "0,50–0,74", "0,75–0,99"];
const DIA = 86400000;
const aUTC = (iso) => Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10));
const aISO = (ms) => new Date(ms).toISOString().slice(0, 10);
const mas = (iso, n) => aISO(aUTC(iso) + n * DIA);
const r2 = (x) => (x == null ? null : Math.round(x * 100) / 100);
const r4 = (x) => (x == null ? null : Math.round(x * 1e4) / 1e4);

/* ── ji-cuadrado: Q(a, x) = función gamma incompleta superior regularizada ── */
function lnGamma(z) { const g = 7, c = [0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313, -176.61502916214059, 12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7];
  if (z < 0.5) return Math.log(Math.PI / Math.sin(Math.PI * z)) - lnGamma(1 - z);
  z -= 1; let x = c[0]; for (let i = 1; i < g + 2; i++) x += c[i] / (z + i); const t = z + g + 0.5;
  return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(x); }
function gammaQ(a, x) {
  if (x <= 0) return 1;
  if (x < a + 1) { let ap = a, sum = 1 / a, del = sum; for (let n = 0; n < 1000; n++) { ap++; del *= x / ap; sum += del; if (Math.abs(del) < Math.abs(sum) * 1e-14) break; } return 1 - sum * Math.exp(-x + a * Math.log(x) - lnGamma(a)); }
  let b = x + 1 - a, c = 1 / 1e-300, d = 1 / b, h = d;
  for (let i = 1; i < 1000; i++) { const an = -i * (i - a); b += 2; d = an * d + b; if (Math.abs(d) < 1e-300) d = 1e-300; c = b + an / c; if (Math.abs(c) < 1e-300) c = 1e-300; d = 1 / d; const del = d * c; h *= del; if (Math.abs(del - 1) < 1e-14) break; }
  return Math.exp(-x + a * Math.log(x) - lnGamma(a)) * h;
}
const pJi = (ji, gl) => gammaQ(gl / 2, ji / 2);
/* bondad de ajuste contra partes iguales */
function jiIgual(cuentas) { const n = cuentas.reduce((a, b) => a + b, 0), e = n / cuentas.length; const ji = cuentas.reduce((s, o) => s + (o - e) * (o - e) / e, 0); return { n, esperado_por_clase: r2(e), ji_cuadrado: r4(ji), grados: cuentas.length - 1, p: r4(pJi(ji, cuentas.length - 1)) }; }
/* independencia en una tabla filas × columnas */
function jiTabla(t) { const f = t.map((r) => r.reduce((a, b) => a + b, 0)), c = t[0].map((_, j) => t.reduce((s, r) => s + r[j], 0)), n = f.reduce((a, b) => a + b, 0);
  let ji = 0, minEsp = Infinity; for (let i = 0; i < t.length; i++) for (let j = 0; j < c.length; j++) { const e = f[i] * c[j] / n; if (e > 0) { ji += (t[i][j] - e) * (t[i][j] - e) / e; minEsp = Math.min(minEsp, e); } }
  const gl = (t.length - 1) * (c.length - 1); return { n, ji_cuadrado: r4(ji), grados: gl, p: r4(pJi(ji, gl)), esperado_minimo: r2(minEsp) }; }
/* intervalo de Wilson del 95 % de una proporción */
function wilson(k, n) { if (!n) return null; const z = 1.959964, p = k / n, d = 1 + z * z / n, c = (p + z * z / (2 * n)) / d, m = z * Math.sqrt(p * (1 - p) / n + z * z / (4 * n * n)) / d; return [r2(100 * (c - m)), r2(100 * (c + m))]; }

function curl(url, pares, salida) {
  const args = ["-sS", "-m", "180", "-G", url, "-o", salida, "-w", "%{http_code}"];
  for (const [k, v] of pares) args.push("--data-urlencode", `${k}=${v}`);
  let ultimo = "";
  for (let i = 1; i <= 5; i++) {
    try { const cod = execFileSync("curl", args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim(); if (cod === "200") { JSON.parse(fs.readFileSync(salida, "utf8")); return; } ultimo = "HTTP " + cod; } catch (e) { ultimo = String(e.stderr || e.message).trim().slice(0, 200); }
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, (ultimo === "HTTP 429" ? 20000 : 4000) * i);
  }
  throw new Error(`FALLÓ la descarga de ${url}: ${ultimo}`);
}

function descargar(dir) {
  const d = path.join(dir, "trm"); fs.mkdirSync(d, { recursive: true });
  const fS = path.join(d, "trm.json"), fM = path.join(d, "trm_meta.json"), fC = path.join(d, "consulta.json");
  if (!fs.existsSync(fS) || !fs.existsSync(fM) || !fs.existsSync(fC)) {
    const ahora = new Date().toISOString();
    curl(SERIE, [["$where", "vigenciahasta >= '2019-12-01T00:00:00'"], ["$order", "vigenciadesde"], ["$limit", "10000"]], fS);
    curl(META, [], fM);
    fs.writeFileSync(fC, JSON.stringify({ consulta_utc: ahora, consulta: H.hoyColombia(Date.parse(ahora)) }));
  }
  return { serie: JSON.parse(fs.readFileSync(fS, "utf8")), meta: JSON.parse(fs.readFileSync(fM, "utf8")), consulta: JSON.parse(fs.readFileSync(fC, "utf8")) };
}

function medir(dir) {
  const { serie, meta, consulta } = descargar(dir);
  const HOY = consulta.consulta;
  const fecha = (s) => (s ? new Date(s * 1000).toISOString() : null);
  const R = {
    consulta: HOY, consulta_utc: consulta.consulta_utc,
    fuente: { conjunto: "datos.gov.co · 32sa-8pi3", url: SERIE, nombre: meta.name || null, atribucion: meta.attribution || null,
      entidad: (((meta.metadata || {}).custom_fields || {})["Información de la Entidad"] || {})["Nombre de la Entidad"] || null,
      frecuencia_declarada: (((meta.metadata || {}).custom_fields || {})["Información de Datos"] || {})["Frecuencia de Actualización"] || null,
      filas_actualizadas_utc: fecha(meta.rowsUpdatedAt), vista_modificada_utc: fecha(meta.viewLastModified) },
    periodo: { desde: DESDE, hasta: HOY }, rangos: RANGOS, metodo_de_cada_rango: METODOS,
  };

  /* A · filas legibles, en orden, sin huecos ni solapes */
  const filas = []; const ilegibles = [];
  for (const r of serie) {
    const v = r.valor == null || r.valor === "" ? null : Number(r.valor);
    const d = String(r.vigenciadesde || "").slice(0, 10), h = String(r.vigenciahasta || "").slice(0, 10);
    if (v == null || !Number.isFinite(v) || v <= 0 || !/^\d{4}-\d{2}-\d{2}$/.test(d) || !/^\d{4}-\d{2}-\d{2}$/.test(h) || h < d || r.unidad !== "COP") { ilegibles.push(r); continue; }
    const m = metodoPorTrm(v); if (!m) { ilegibles.push(r); continue; }
    const cent = Math.round(v * 100) % 100;          // la misma cuenta entera de metodoPorTrm
    filas.push({ v, d, h, cent, rango: METODOS.indexOf(m), entero: Math.floor(Math.round(v * 100) / 100), dias: (aUTC(h) - aUTC(d)) / DIA + 1 });
  }
  filas.sort((a, b) => (a.d < b.d ? -1 : 1));
  let huecos = 0, solapes = 0;
  for (let i = 1; i < filas.length; i++) { const dif = (aUTC(filas[i].d) - aUTC(filas[i - 1].h)) / DIA; if (dif > 1) huecos++; if (dif < 1) solapes++; }
  /* el rango por cuenta propia debe coincidir con metodoPorTrm: se comprueba, no se supone */
  const desacuerdos = filas.filter((f) => f.rango !== (f.cent <= 24 ? 0 : f.cent <= 49 ? 1 : f.cent <= 74 ? 2 : 3)).length;
  const F = filas.filter((f) => f.h >= DESDE && f.d <= HOY);       // certificaciones con algún día en el periodo
  R.A_serie = { filas_bajadas: serie.length, ilegibles: ilegibles.length, huecos_entre_filas: huecos, solapes, desacuerdos_con_metodoPorTrm: desacuerdos,
    certificaciones_en_el_periodo: F.length, primera: F[0] ? { desde: F[0].d, hasta: F[0].h, valor: F[0].v } : null, ultima: F.length ? { desde: F[F.length - 1].d, hasta: F[F.length - 1].h, valor: F[F.length - 1].v } : null };

  /* el valor que rige cada día calendario del periodo */
  const porDia = new Map();
  for (let i = 0; i < F.length; i++) for (let x = F[i].d; x <= F[i].h; x = mas(x, 1)) if (x >= DESDE && x <= HOY) porDia.set(x, i);
  const dias = [...porDia.keys()].sort();
  const totalDias = (aUTC(HOY) - aUTC(DESDE)) / DIA + 1;

  /* B · partes por rango */
  const partes = (cuentas) => { const n = cuentas.reduce((a, b) => a + b, 0); return { cuentas, pct: cuentas.map((c) => r2(100 * c / n)), ic95_pct: cuentas.map((c) => wilson(c, n)), ...jiIgual(cuentas) }; };
  const cDia = [0, 0, 0, 0], cHabil = [0, 0, 0, 0], cValor = [0, 0, 0, 0];
  for (const x of dias) { const f = F[porDia.get(x)]; cDia[f.rango]++; if (H.esHabil(x)) cHabil[f.rango]++; }
  for (const f of F) cValor[f.rango]++;
  R.B_partes_por_rango = {
    por_valor_certificado: { ...partes(cValor), nota: "una fila de la serie = una certificación; es la prueba válida (observaciones distintas)" },
    por_dia_habil_de_colombia: { ...partes(cHabil), nota: "días hábiles con lib/habiles; un valor que rige dos días hábiles (festivo en EE. UU.) cuenta dos veces" },
    por_dia_calendario_de_vigencia: { ...partes(cDia), dias_esperados: totalDias, dias_cubiertos: dias.length, nota: "cuenta el mismo valor en cada día que rige (fines de semana y festivos): el ji-cuadrado sobrestima la evidencia" },
  };
  const porAno = {};
  for (const f of F) { const a = (f.h < DESDE ? DESDE : f.h).slice(0, 4); (porAno[a] || (porAno[a] = [0, 0, 0, 0]))[f.rango]++; }
  R.B_por_ano_valor_certificado = Object.fromEntries(Object.entries(porAno).map(([a, c]) => [a, { cuentas: c, pct: c.map((x) => r2(100 * x / c.reduce((s, y) => s + y, 0))), ...jiIgual(c) }]));
  { const ps = Object.entries(R.B_por_ano_valor_certificado).map(([a, o]) => [a, o.p]).sort((x, y) => x[1] - y[1]), k = ps.length;
    R.B_por_ano_lectura = { anos_probados: k, p_mas_bajo: { ano: ps[0][0], p: ps[0][1], corregido_por_probar_varios_anos: r4(Math.min(1, ps[0][1] * k)) },
      nota: "probar varios años por separado hace esperable algún p bajo por azar: se corrige multiplicando por el número de años (Bonferroni)" }; }

  /* C · centavos y último dígito */
  const c100 = new Array(100).fill(0), c10 = new Array(10).fill(0);
  for (const f of F) { c100[f.cent]++; c10[f.cent % 10]++; }
  R.C_centavos = { cien_clases: jiIgual(c100), ultimo_digito: { cuentas: c10, ...jiIgual(c10) }, centavo_mas_frecuente: c100.indexOf(Math.max(...c100)), veces_el_mas_frecuente: Math.max(...c100), veces_el_menos_frecuente: Math.min(...c100) };

  /* D · transición entre certificaciones consecutivas */
  const T = [0, 1, 2, 3].map(() => [0, 0, 0, 0]);
  for (let i = 1; i < F.length; i++) T[F[i - 1].rango][F[i].rango]++;
  const pares = F.length - 1, igual = T.reduce((s, r, i) => s + r[i], 0);
  /* fuera de muestra: aprende la tabla con lo que rige antes del corte y anuncia el rango más frecuente tras el anterior */
  const Ta = [0, 1, 2, 3].map(() => [0, 0, 0, 0]); let ac = 0, np = 0, acFijo = 0; const cuentaA = [0, 0, 0, 0];
  for (let i = 1; i < F.length; i++) if (F[i].d < CORTE_PRUEBA) { Ta[F[i - 1].rango][F[i].rango]++; cuentaA[F[i].rango]++; }
  const moda = (v) => v.indexOf(Math.max(...v)), fijo = moda(cuentaA);
  for (let i = 1; i < F.length; i++) if (F[i].d >= CORTE_PRUEBA) { np++; if (moda(Ta[F[i - 1].rango]) === F[i].rango) ac++; if (fijo === F[i].rango) acFijo++; }
  R.D_transicion = {
    tabla_anterior_a_siguiente: T, filas: "rango de la certificación anterior", columnas: "rango de la siguiente",
    pct_por_fila: T.map((r) => { const n = r.reduce((a, b) => a + b, 0); return r.map((x) => r2(100 * x / n)); }),
    independencia: jiTabla(T), mismo_rango_que_la_anterior: { veces: igual, de: pares, pct: r2(100 * igual / pares), ic95_pct: wilson(igual, pares), al_azar_pct: 25 },
    fuera_de_muestra: { aprende_hasta: CORTE_PRUEBA, prueba_certificaciones: np, regla: "anunciar el rango más frecuente después del rango anterior",
      aciertos: ac, acierto_pct: r2(100 * ac / np), ic95_pct: wilson(ac, np), anunciar_siempre_el_mas_frecuente_pct: r2(100 * acFijo / np), al_azar_pct: 25 },
  };

  /* E · la parte entera */
  const Tdig = Array.from({ length: 10 }, () => [0, 0, 0, 0]), Tpar = [[0, 0, 0, 0], [0, 0, 0, 0]];
  for (const f of F) { Tdig[f.entero % 10][f.rango]++; Tpar[f.entero % 2][f.rango]++; }
  const TdA = Array.from({ length: 10 }, () => [0, 0, 0, 0]); let acE = 0, npE = 0;
  for (const f of F) if (f.d < CORTE_PRUEBA) TdA[f.entero % 10][f.rango]++;
  for (const f of F) if (f.d >= CORTE_PRUEBA) { npE++; if (moda(TdA[f.entero % 10]) === f.rango) acE++; }
  const saltos = []; for (let i = 1; i < F.length; i++) saltos.push(Math.abs(F[i].v - F[i - 1].v));
  saltos.sort((a, b) => a - b);
  const q = (p) => saltos[Math.floor(p * (saltos.length - 1))];
  R.E_parte_entera = {
    ultimo_digito_de_los_pesos_contra_rango: jiTabla(Tdig), paridad_de_los_pesos_contra_rango: jiTabla(Tpar),
    fuera_de_muestra_por_ultimo_digito: { prueba_certificaciones: npE, aciertos: acE, acierto_pct: r2(100 * acE / npE), ic95_pct: wilson(acE, npE), al_azar_pct: 25 },
    salto_absoluto_entre_certificaciones_pesos: { p10: r2(q(0.1)), mediana: r2(q(0.5)), p90: r2(q(0.9)), saltos_de_menos_de_25_centavos: saltos.filter((s) => s < 0.25).length, de: saltos.length,
      nota: "el rango mide 25 centavos; el salto típico de un día a otro es de decenas de pesos: conocer la TRM de ayer no acota los centavos de hoy" },
  };

  /* F · días que comparten la misma TRM */
  const largo = {}; let diasRepetidos = 0;
  for (const f of F) { let n = 0; for (let x = f.d; x <= f.h; x = mas(x, 1)) if (x >= DESDE && x <= HOY) n++; if (n > 0) { largo[n] = (largo[n] || 0) + 1; diasRepetidos += n - 1; } }
  const habiles = dias.filter((x) => H.esHabil(x));
  /* día hábil de Colombia cuyo valor ya regía el día calendario anterior (no hubo certificación nueva la víspera) */
  const habilSinNueva = habiles.filter((x) => F[porDia.get(x)].d < x);
  const habilSinNuevaTrasHabil = habilSinNueva.filter((x) => H.esHabil(mas(x, -1)));
  /* Para una fecha F hábil (cierre, fin del traslado o audiencia, según el documento): la TRM que rige el k-ésimo día
     hábil siguiente se certifica la tarde del día anterior a su `vigenciadesde`. ¿Ese día es anterior a F, el mismo F o posterior? */
  const regla = (k) => {
    const c = { fechas: 0, certificada_antes_de_F: 0, certificada_la_tarde_de_F: 0, certificada_despues_de_F: 0, sin_dato_aun: 0 }; const ejemplos = [];
    for (const x of habiles) {
      const t = H.sumarHabiles(x, k); if (t > HOY || !porDia.has(t)) { c.sin_dato_aun++; continue; }
      const f = F[porDia.get(t)], cert = mas(f.d, -1); c.fechas++;
      if (cert < x) { c.certificada_antes_de_F++; if (ejemplos.length < 400) ejemplos.push({ F: x, dia_que_rige: t, vigencia: `${f.d}..${f.h}`, valor: f.v }); }
      else if (cert === x) c.certificada_la_tarde_de_F++; else c.certificada_despues_de_F++;
    }
    return { ...c, pct_antes_de_F: r2(100 * c.certificada_antes_de_F / c.fechas), pct_la_tarde_de_F: r2(100 * c.certificada_la_tarde_de_F / c.fechas), pct_despues_de_F: r2(100 * c.certificada_despues_de_F / c.fechas),
      fechas_con_la_trm_ya_certificada_antes: ejemplos.map((e) => e.F), ultimos_casos: ejemplos.slice(-5) };
  };
  R.F_dias_que_comparten_valor = {
    dias_calendario: dias.length, certificaciones: F.length, dias_por_certificacion_media: r2(dias.length / F.length),
    certificaciones_por_numero_de_dias_que_rigen: largo,
    dias_calendario_con_el_mismo_valor_del_dia_anterior: { dias: diasRepetidos, pct: r2(100 * diasRepetidos / dias.length) },
    dias_habiles_de_colombia: habiles.length,
    dias_habiles_cuyo_valor_ya_regia_la_vispera: { dias: habilSinNueva.length, pct: r2(100 * habilSinNueva.length / habiles.length), nota: "incluye el lunes (o martes tras festivo): rige la certificada el viernes, que ya regía sábado y domingo" },
    de_ellos_con_vispera_tambien_habil: { dias: habilSinNuevaTrasHabil.length, pct: r2(100 * habilSinNuevaTrasHabil.length / habiles.length), fechas: habilSinNuevaTrasHabil,
      nota: "dos días hábiles seguidos de Colombia con la misma TRM: la víspera no hubo mercado (festivo de Estados Unidos u otro cierre)" },
    regla_dia_habil_siguiente_a_F: regla(1), regla_segundo_dia_habil_siguiente_a_F: regla(2),
    lectura: "«certificada antes de F» = la TRM que decide ya se conocía la tarde anterior a F; «la tarde de F» = se conoce al cierre del mercado del propio día F; «después de F» = no se conoce el día F.",
  };
  return R;
}

if (require.main === module) {
  const dir = process.argv[2];
  if (!dir) { console.error("uso: node tools/analisis/plan_precio/trm_medir.js <carpeta_de_datos> [salida.json]"); process.exit(2); }
  const R = medir(dir);
  const salida = process.argv[3] || path.join(__dirname, `resultados_trm_${R.consulta}.json`);
  fs.writeFileSync(salida, JSON.stringify(R, null, 1) + "\n");
  console.log("escrito " + salida);
  const b = R.B_partes_por_rango;
  console.log("por valor certificado:", JSON.stringify(b.por_valor_certificado.cuentas), b.por_valor_certificado.pct.join(" · "), "ji", b.por_valor_certificado.ji_cuadrado, "p", b.por_valor_certificado.p);
  console.log("por día hábil:", b.por_dia_habil_de_colombia.pct.join(" · "), "p", b.por_dia_habil_de_colombia.p, "| por día calendario:", b.por_dia_calendario_de_vigencia.pct.join(" · "), "p", b.por_dia_calendario_de_vigencia.p);
  console.log("transición p", R.D_transicion.independencia.p, "mismo rango", R.D_transicion.mismo_rango_que_la_anterior.pct, "% · fuera de muestra", R.D_transicion.fuera_de_muestra.acierto_pct, "%");
}
module.exports = { medir, gammaQ, pJi, jiIgual, jiTabla };
