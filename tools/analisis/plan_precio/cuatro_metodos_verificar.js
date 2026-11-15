"use strict";
/* ============================================================================
   Plan precio · los cuatro métodos · comprobaciones de la medición (14-nov-2026)
   ----------------------------------------------------------------------------
   Solo MIDE. Cuatro comprobaciones EJECUTADAS sobre `cuatro_metodos_medir.js`; sale con código 1 si alguna falla.

     node tools/analisis/plan_precio/cuatro_metodos_verificar.js <carpeta_de_datos>

   1 · caso a mano del motor: rivales 90 y 100, oferta propia 95 → gana la mediana y la media geométrica, empata la
       media aritmética baja y pierde el menor valor: 0,25 + 0,25 + 0,125 + 0 = 0,625.
   2 · NADA DEL FUTURO: para procesos de prueba tomados a intervalos fijos, las referencias se vuelven a calcular con
       una base RECORTADA a lo adjudicado antes de su recepción (más el propio proceso). Deben salir idénticas a las de
       la corrida completa: si algo posterior entrara a la predicción, cambiarían.
   3 · la comprobación 2 PUEDE fallar (mutación): las referencias del modo «recepcion», que sí usan procesos aún sin
       adjudicar, se comparan contra la misma base recortada y deben diferir en una parte de los procesos.
   4 · el techo del sorteo no deja precios mejores sin mirar: en procesos chicos se compara contra una rejilla de
       0,002 puntos entre el mínimo − 1 y el máximo + 1.
   ============================================================================ */
const path = require("path");
const MD = require(path.join(__dirname, "cuatro_metodos_medir.js"));

const CAMPOS = ["entidad_ganador", "entidad_centro", "tamano_centro", "identidad", "identidad_3mas", "identidad_relativa", "n_anunciado", "oraculo_n"];
const iguales = (a, b) => CAMPOS.every((k) => (a[k] == null && b[k] == null) || (a[k] != null && b[k] != null && Math.abs(a[k] - b[k]) < 1e-9));

function main() {
  const dir = process.argv[2];
  if (!dir) { console.error("uso: node tools/analisis/plan_precio/cuatro_metodos_verificar.js <carpeta_de_datos>"); process.exit(2); }
  let fallos = 0;
  const decir = (ok, texto) => { if (!ok) fallos++; console.log((ok ? "  bien · " : "  FALLA · ") + texto); };

  console.log("1 · caso a mano del motor");
  const f = MD.fraccion([90, 100], 95, 49.5);
  decir(Math.abs(f - 0.625) < 1e-12, `rivales 90 y 100, propia 95 → ${f} (esperado 0,625)`);

  const { filas } = MD.cargar(dir);
  for (const mod of ["abreviada", "licitacion"]) {
    const F = filas.filter((x) => x.mod === mod);
    const ventana = MD.elegirVentana(F, "estricto").elegida_dias;
    const completa = MD.anunciar(F, "estricto", ventana).refs, laxa = MD.anunciar(F, "recepcion", ventana).refs;
    const prueba = F.filter((x) => x.pp && x.d >= MD.CORTE_PRUEBA);
    const paso = Math.max(1, Math.floor(prueba.length / 30)), muestra = prueba.filter((_, i) => i % paso === 0);
    let distintas = 0, distintasLaxa = 0;
    for (const T of muestra) {
      const recorte = F.filter((x) => x === T || (MD.disponibleEl(x, "estricto") != null && MD.disponibleEl(x, "estricto") < T.d));
      const r = MD.anunciar(recorte, "estricto", ventana).refs.get(T.id);
      if (!iguales(r, completa.get(T.id))) distintas++;
      if (!iguales(r, laxa.get(T.id))) distintasLaxa++;
    }
    console.log(`2 · nada del futuro · ${mod} (ventana ${ventana || "todo"}; ${muestra.length} procesos de prueba)`);
    decir(distintas === 0, `referencias con la base recortada a lo adjudicado antes de la recepción: ${distintas} distintas de ${muestra.length}`);
    console.log(`3 · la comprobación puede fallar · ${mod}`);
    decir(distintasLaxa > 0, `contra el modo «recepcion» (usa procesos aún sin adjudicar): ${distintasLaxa} distintas de ${muestra.length} (debe haber alguna)`);

    const chicos = prueba.filter((T) => T.n <= 6).filter((_, i) => i % 7 === 0).slice(0, 40);
    let peor = 0;
    for (const T of chicos) {
      const t = MD.techosDe(T.pcts, MD.MAXIMO[mod], 0.05).sorteo;
      let bruto = 0; const a = Math.max(1, Math.min(...T.pcts) - 1), b = Math.min(100, Math.max(...T.pcts) + 1);
      for (let p = a; p <= b + 1e-9; p += 0.002) { const w = MD.fraccion(T.pcts, p, MD.MAXIMO[mod]); if (w > bruto) bruto = w; }
      if (bruto - t > peor) peor = bruto - t;
    }
    console.log(`4 · techo del sorteo contra rejilla de 0,002 · ${mod} (${chicos.length} procesos de 3 a 6 ofertas)`);
    decir(peor <= 1e-9, `mayor exceso de la rejilla fina sobre el techo calculado: ${peor}`);
  }
  console.log(fallos ? `\nFALLARON ${fallos} comprobaciones` : "\ntodas las comprobaciones pasan");
  process.exit(fallos ? 1 : 0);
}
if (require.main === module) main();
