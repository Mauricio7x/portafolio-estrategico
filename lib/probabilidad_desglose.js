/* ============================================================================
   lib/probabilidad_desglose · POR QUÉ ese 23 %, paso por paso
   ----------------------------------------------------------------------------
   La tarjeta dice «Prob. estimada: 23 %». Un contratista no puede decidir con
   eso: no sabe si es buena o mala, ni qué la causa, ni si puede discutirla.
   Este módulo devuelve la MISMA cifra abierta en pasos numerados, cada uno con
   su fórmula, sus datos de entrada con la fuente citada, su aritmética escrita
   y cuántos puntos porcentuales aporta al resultado final.

   REGLA DE ORO, la misma de lib/competencia_detalle: esto NO es un segundo
   cálculo, es el MISMO. `trazaP` (lib/probabilidad) es la única implementación
   y aquí solo se NARRA su traza. Reimplementar la cadena para poder explicarla
   habría creado dos aritméticas del mismo número —la que se enseña y la que la
   justifica— y esa es exactamente la clase de duplicación que este proyecto ya
   pagó cara (`total_procesos`/`procesos_contados`, `cargado`/`cargado_el`).
   Hay prueba de que `probabilidad_final` es EXACTAMENTE el `p_ganar` que sirve
   /api/oportunidades para el mismo proceso.

   ── SEIS PASOS, SIEMPRE LOS SEIS ──────────────────────────────────────────
     1. Probabilidad base por competencia histórica     P = 1/(1+n̄)
     2. Nivel de competencia de la entidad             ×1,30 · ×1,00 · ×0,70
     3. Prórroga del cierre                            ×1,20
     4. Precio: hasta dónde puede bajar el dueño       mult(min(b_max, mediana)) · 1 sin b_max
     5. Colisión de cierres                            ×(medido en el histórico; 1,15 sin medición)
     6. Límite [0,01 · 0,95] y redondeo

   Los seis viajan SIEMPRE, también cuando no aplican. Publicar solo los que
   mordieron dejaría al lector sin poder distinguir «no hay prórroga» de «no se
   miró la prórroga», que es la distinción que este módulo existe para hacer.

   REGLA DE HONESTIDAD: un AJUSTE (pasos 2 a 5) sin los datos que necesita dice
   `confianza: "Sin dato"` y aporta EXACTAMENTE 0 pp — nunca se inventa ni se
   aproxima un valor para rellenar el hueco. Hay prueba de esa equivalencia.

   El paso 1 es la EXCEPCIÓN y hay que explicarla, porque parece una
   contradicción: cuando no hay histórico ni de la entidad ni del departamento
   su confianza también es «Sin dato», pero SÍ aporta puntos —los del supuesto
   conservador de 5 rivales—. La alternativa era bajarlo a «Baja», y sería peor:
   «Baja» se lee como «poca muestra» y aquí no hay NINGUNA. Un paso 1 que
   aportara 0 pp dejaría la probabilidad en cero, que no es más honesto: es otro
   número inventado. Así que el «Sin dato» se conserva con su significado
   literal —nada se midió— y el supuesto viaja escrito en `datos_entrada.fuente`
   y en el `fundamento`, que es donde un auditor lo va a buscar.

   ── LOS APORTES SUMAN LA CIFRA FINAL, Y ESO ES UNA INVARIANTE ─────────────
   `aporte_pp` de cada paso es la DIFERENCIA real que ese paso introdujo en la
   cadena (`p_despues − p_antes`), en puntos porcentuales. Por telescopio, la
   suma de los seis es exactamente `probabilidad_final × 100`. El último paso
   —límites y redondeo— absorbe además el residuo del redondeo a dos decimales
   de los cinco anteriores, y eso es literalmente lo que ese paso es: la cifra
   publicada es la redondeada. Hay prueba de la igualdad; sin ella, una tabla
   de aportes que no cuadra con su total es peor que no tenerla.

   ── DOS DISCREPANCIAS ENTRE EL ENCARGO Y EL CÓDIGO, resueltas a favor del
      CÓDIGO y escritas aquí para que no se re-descubran ────────────────────
   · El encargo describe la colisión de cierres como «≥2 procesos de la misma
     entidad que cierran en ≤7 días». `lib/probabilidad.claveColision` agrupa
     por `entidad|YYYY-MM-DD`: es el MISMO DÍA exacto. Ensancharlo a una
     ventana de siete días no es documentar, es cambiar la probabilidad de todo
     el corpus, así que se conserva el día y la fórmula publicada lo dice.
   · El encargo lista cuatro factores; hoy la cadena aplica prórroga, PRECIO y
     colisión (ago 2026 · A4): la rampa de baja de mercado (×0,85 / ×1,10) se
     retiró porque penalizaba a la entidad por dónde está el centro de su
     mercado, no por dónde puede ofertar el dueño. El paso 4 explica ahora ese
     factor de precio —neutro mientras el dueño no declare hasta dónde puede
     bajar— y el paso 1 dice cuánto pesan los datos propios de la entidad
     (encogimiento, A3) y la banda que sale de ahí.
   ========================================================================== */
"use strict";

const { CLAVES, leerChunksDedup, leerJSON, comprimir, descomprimir } = require("./almacen.js");
const {
  trazaP, valorEsperado, promediosPorDepartamento, indiceColisionCierres, claveColision,
  PROMEDIO_CONSERVADOR,
  FACTOR_CIERRE_PRORROGADO, FACTOR_COLISION_CIERRES, factorColisionDe, factorProrrogaDe,
  P_MAXIMA, P_MINIMA, Z_BANDA,
} = require("./probabilidad.js");
// la LECTURA de los dos índices es la del listado (`cargarIndice`/`cargarIndiceBaja`, ver desgloseDeProceso)
const { competenciaDe, MIN_PROCESOS } = require("./indice_competencia.js");
const { bajaDeMercado, encogerBaja } = require("./indice_baja.js");
const { cargarCostosPorProceso, bajaMaximaDe } = require("./baja_maxima.js");

const TTL_CACHE_SEG = 300;          // 5 min (lo fija el encargo)
const LARGO_MAX_ID = 200;

/* Confianza del paso 1 y del paso 2. `MIN_PROCESOS` (5) es el suelo que el
   propio índice exige para clasificar a una entidad; el doble es el corte de
   «Alta». Es una CONVENCIÓN DECLARADA, no un umbral medido —no hay etiqueta de
   ganado/perdido contra la que calibrarlo—, y por eso el número de procesos
   viaja siempre en `datos_entrada`: quien lee puede juzgar la muestra sin
   creerse la etiqueta. */
const PROCESOS_CONFIANZA_ALTA = 2 * MIN_PROCESOS;

const ALTA = "Alta", MEDIA = "Media", BAJA = "Baja", SIN_DATO = "Sin dato";

/* ---------- formato ----------
   Sin `Intl`: las cifras entran en pruebas y en un texto que se copia a un
   informe, así que tienen que ser idénticas en cualquier runtime. */
const miles = (n) => String(Math.round(Math.abs(Number(n) || 0))).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
const cop = (n) => `${Number(n) < 0 ? "-" : ""}$${miles(n)}`;
const dec = (n, d = 2) => {
  const v = Number(n);
  return Number.isFinite(v) ? v.toFixed(d) : "—";
};
const pct = (fraccion, d = 2) => `${dec(Number(fraccion) * 100, d)}%`;
/* Fracción → puntos porcentuales con dos decimales. Dos decimales y no más
   porque la probabilidad publicada se redondea a cuatro cifras, o sea a dos
   decimales de punto porcentual: dar más sería precisión inventada. */
const pp = (fraccion) => Math.round(Number(fraccion) * 1e4) / 100;
const r2 = (n) => Math.round(Number(n) * 100) / 100;
const r4 = (n) => Math.round(Number(n) * 1e4) / 1e4;
/* LAS FRASES VAN EN es-CO, CON LA PRECISIÓN DEL TITULAR (23-sep-2026). Las
   viñetas decían «19.17 %» debajo de un titular «19,2 %», «4.0 empresas» y
   «una entre 5.0»: en Colombia el punto separa miles, y el mismo número en dos
   formatos en la misma pantalla se lee como dos números. Aquí: coma decimal,
   punto de miles, sin ceros de relleno y a lo sumo `d` decimales —los del
   `Intl.NumberFormat("es-CO", { maximumFractionDigits: 1 })` con que el modal
   pinta su titular—. Sin `Intl` por la regla de arriba (idéntico en cualquier
   runtime), y redondeando sobre la ESCRITURA decimal («16.65e1»), no sobre el
   binario, que es como redondea `Intl` («16,7», no «16,6»). La tabla auditable
   (fórmulas, cálculos y resultados) conserva sus dos decimales con punto: es
   aritmética escrita para comprobarse, y la cadena de pasos se verifica así. */
const numCO = (n, d = 1) => {
  if (n == null || n === "") return "—";
  const v = Number(n);
  if (!Number.isFinite(v)) return "—";
  const s = String(Math.abs(v));
  const r = /e/i.test(s) ? Math.round(Math.abs(v) * 10 ** d) / 10 ** d
    : Number(`${Math.round(Number(`${s}e${d}`))}e-${d}`);
  const [ent, frac = ""] = r.toFixed(d).split(".");
  const f = frac.replace(/0+$/, "");
  return `${v < 0 && r !== 0 ? "-" : ""}${miles(ent)}${f ? `,${f}` : ""}`;
};

/* ¿HAY BASE MEDIDA DE ESTA ENTIDAD para enunciar «de cada N, gana 1»?
   (23-sep-2026, pregunta del dueño: «se supone que no hay histórico, ¿de dónde
   sacas el dato?»). Es la regla de `frecuenciaConBase` de public/app.js —la
   que ya siguen la celda 2 de la tarjeta y el titular de «Ver cómo se
   calcula»—: fuente «entidad» Y cuántos compiten medido (promedio y conteo).
   Con el promedio del departamento, con el supuesto de 5 rivales, con el
   índice sin leer o con los pocos procesos que el encogimiento completa con un
   promedio ajeno, la cifra sigue ordenando la lista, pero ninguna frase de este
   módulo la enuncia como un hecho de la entidad. El navegador no puede llamar
   a este módulo ni el servidor a app.js: la respuesta publica el resultado
   (`con_base_de_entidad`) y la suite ata las dos con un censo de casos
   («unidad sin base no hay frecuencia»). La ausencia se descarta ANTES de
   convertir: `Number(null)` es 0. */
function conBaseDeEntidad(fuente, competencia) {
  const c = competencia || {};
  if (fuente !== "entidad" || c.promedio_oferentes == null) return false;
  const promedio = Number(c.promedio_oferentes);
  const procesos = Number(c.total_procesos);
  return Number.isFinite(promedio) && Number.isFinite(procesos) && procesos > 0;
}
/* La MARCA de la tabla auditable sin base: UNA frase, la que pinta el modal
   sobre la tabla (`aviso_supuesto`) y la que lleva el texto copiado encima de
   los pasos. */
const AVISO_SUPUESTO = "Supuesto, no medición: las cifras de los pasos parten de un supuesto sobre cuántos compiten "
  + "y solo sirven para ordenar la lista.";
/* «De cada N procesos, gana 1»: N = 1/p redondeado, con suelo de 2 —«de cada 1
   gana 1» prometería certeza—. La misma cuenta de `frecuenciaNatural` en
   public/app.js; aquí, UNA vez para la explicación y el resumen, que la
   calculaban cada uno a su manera (el resumen sin el suelo). */
function deCadaDe(p) {
  const n = Number(p);
  if (p == null || !Number.isFinite(n) || n <= 0) return null;
  return Math.max(2, Math.round(1 / n));
}
/* EL CONTRATO ESPERADO POR INTENTO, con la precisión que la cifra tiene
   (23-sep-2026, antes en public/app.js). Sale de la probabilidad PUBLICADA, que
   viaja redondeada a cuatro decimales: al peso, «$1.050.210.000» sobre 6.300
   millones y 1/6 metía $210.000 que no existen. Se redondea a la unidad que
   esos cuatro decimales sostienen (± media diezmilésima de la cuantía) y se
   dice «≈». Vive aquí para que el modal y el texto de «Copiar justificación»
   digan la MISMA cifra (el texto copiado decía «Valor esperado: $243.270.000»
   al peso y el modal «≈ $243.300.000»). Es para MOSTRAR: el orden de la lista
   usa su propia cifra (`ve`, `valor_esperado_cop`). */
function contratoEsperadoAprox(valor, cuantia) {
  if (valor == null || cuantia == null) return null;
  const v = Number(valor), c = Number(cuantia);
  if (!Number.isFinite(v) || v <= 0 || !Number.isFinite(c) || c <= 0) return null;
  const unidad = Math.pow(10, Math.max(0, Math.ceil(Math.log10(c * 5e-5))));
  return Math.round(v / unidad) * unidad;
}

/* Nombre legible de cada nivel del índice de competencia. */
const NIVEL_COMPETENCIA = {
  baja: "baja (tercio del mercado con MENOS oferentes)",
  media: "media (tercio intermedio)",
  alta: "alta (tercio del mercado con MÁS oferentes)",
};
const NIVEL_BAJA = { bajo: "bajo", medio: "medio", alto: "alto" };
const GRANULARIDAD = {
  entidad_familia: "entidad + familia UNSPSC",
  entidad: "entidad (todos los tipos de obra)",
  departamento_familia: "departamento + familia UNSPSC (la entidad no tiene base propia)",
  departamento: "departamento (la entidad no tiene base propia)",
};

const idDe = (l) => String((l && (l.id_del_proceso || l._k || l[":id"])) || "").trim();

/* ══════════════════════ desglosarProbabilidad ══════════════════════
   `proceso`            la fila del corpus, tal cual (con `_cierre_prorrogado`
                        y `_versiones` si se leyó con `{senales:true}`)
   `indiceCompetencia`  hash leído con leerIndice()
   `indiceBaja`         hashes leídos con leerIndiceBaja()
   `contexto`           lo que no sale de los índices: el promedio del
                        departamento, la colisión de cierres y las metas de los
                        dos índices (para poder CITAR cuándo se construyeron).

   Los tres primeros argumentos son los que fija el encargo; `contexto` es
   opcional y su ausencia degrada cada paso a «Sin dato», nunca a un valor
   inventado. */
function desglosarProbabilidad(proceso, indiceCompetencia, indiceBaja, contexto = {}) {
  const l = proceso || {};

  /* Las dos señales derivadas se resuelven con las MISMAS funciones que usa
     /api/oportunidades: si aquí se leyeran de otra forma, el desglose
     explicaría un cálculo que la app no hizo. */
  const competencia = competenciaDe(indiceCompetencia, l);
  const baja = bajaDeMercado(indiceBaja, l);
  const promedioDepto = contexto.promedio_departamento;
  const colision = Number(contexto.colision_cierres) || 0;

  const metaCompParaTraza = contexto.meta_competencia || null;
  const metaBajaParaTraza = contexto.meta_baja || null;
  const t = trazaP(l, {
    competencia, baja,
    promedio_departamento: promedioDepto,
    colision_cierres: colision,
    colision_medida: metaCompParaTraza && metaCompParaTraza.colision ? metaCompParaTraza.colision : null,
    prorroga_medida: metaCompParaTraza && metaCompParaTraza.prorroga ? metaCompParaTraza.prorroga : null,
    baja_maxima_pct: contexto.baja_maxima_pct == null ? null : contexto.baja_maxima_pct,
    baja_maxima_origen: contexto.baja_maxima_origen || null,
    baja_para_precio: encogerBaja(baja, metaBajaParaTraza),
  });
  const aplicado = (nombre) => t.pasos.find((x) => x.nombre === nombre) || null;

  const metaComp = contexto.meta_competencia || null;
  const metaBaja = contexto.meta_baja || null;
  const entidad = String(l.entidad || "").trim() || "(entidad no informada)";
  const depto = String(l.departamento_entidad || "").trim().toUpperCase();

  const pasos = [];
  const push = (paso) => { pasos.push(paso); return paso; };
  /* EL ÍNDICE NO SE PUDO LEER (23-sep-2026): `competenciaDe` lo dice con
     `motivo: "no_se_leyo"`. Con él, ninguna frase de este desglose puede decir
     que la entidad «no tiene historial»: nadie lo miró. Y con el índice leído,
     el supuesto conservador tampoco es «no hay historial» (la misma entidad
     puede tener siete contratos adjudicados y medida su baja): es que no
     publica cuántos ofertaron. */
  const noLeida = !!competencia && competencia.motivo === "no_se_leyo";

  /* ─────────── PASO 1 · probabilidad base ─────────── */
  {
    const construido = metaComp && metaComp.construido ? String(metaComp.construido).slice(0, 10) : null;
    const datos = {
      promedio_oferentes: r2(t.rivales),
      origen_del_promedio: t.fuente,
      procesos_analizados: t.fuente === "entidad" ? competencia.total_procesos : null,
      entidad: t.fuente === "entidad" ? entidad : null,
      departamento: t.fuente === "departamento" ? (depto || null) : null,
      min_procesos: MIN_PROCESOS,
      indice_construido: construido,
    };
    let fuenteTxt, confianza;
    if (t.fuente === "entidad" && t.encogido) {
      /* A3: rivales ENCOGIDOS. Los datos propios de la entidad pesan
         `peso_datos` y el resto lo pone el promedio global del índice. */
      /* B7: el prior es el del DEPARTAMENTO (encogido hacia el nacional) cuando
         el índice lo trae, si no el nacional; se dice cuál. */
      const mu = t.prior != null ? t.prior : (metaComp && metaComp.encogimiento ? metaComp.encogimiento.mu_global : null);
      const origenPrior = t.prior_origen || (mu != null ? "global" : null);
      datos.rivales_estimados = r2(t.rivales);
      datos.peso_datos_propios = t.peso_datos;
      datos.prior_oferentes = mu;
      datos.prior_origen = origenPrior;
      datos.promedio_nacional_oferentes = metaComp && metaComp.encogimiento ? metaComp.encogimiento.mu_global : null;
      datos.desviacion_rivales = t.rivales_desv;
      datos.banda_90 = t.p_lo != null && t.p_hi != null ? { desde: pct(t.p_lo), hasta: pct(t.p_hi) } : null;
      datos.metodo = "media posterior gamma-Poisson: w·promedio_entidad + (1−w)·prior, w = n/(n+m); prior = promedio del departamento encogido hacia el nacional, o el nacional";
      const priorTxt = origenPrior && origenPrior.startsWith("departamento:")
        ? `promedio de su departamento (${origenPrior.slice("departamento:".length)})` : "promedio nacional del índice";
      fuenteTxt = `Índice de competencia · ${competencia.total_procesos} procesos adjudicados con dato de oferentes de «${entidad}» `
        + `(pesan ${t.peso_datos != null ? Math.round(t.peso_datos * 100) : "?"} %) + ${priorTxt}`
        + (mu != null ? ` (${dec(mu, 2)} oferentes)` : "")
        + (construido ? ` · índice construido el ${construido}` : "");
      confianza = competencia.total_procesos >= PROCESOS_CONFIANZA_ALTA ? ALTA
        : competencia.total_procesos >= MIN_PROCESOS ? MEDIA : BAJA;
    } else if (t.fuente === "entidad") {
      fuenteTxt = `Índice de competencia · ${competencia.total_procesos} procesos adjudicados con dato de oferentes de «${entidad}»`
        + (construido ? ` · índice construido el ${construido}` : "");
      confianza = competencia.total_procesos >= PROCESOS_CONFIANZA_ALTA ? ALTA : MEDIA;
    } else if (t.fuente === "departamento") {
      fuenteTxt = `Índice de competencia · «${entidad}» no llega al mínimo de ${MIN_PROCESOS} procesos: promedio ponderado de ${depto || "su departamento"}`
        + (construido ? ` · índice construido el ${construido}` : "");
      confianza = BAJA;
      datos.motivo_del_respaldo = `la entidad no alcanza los ${MIN_PROCESOS} procesos que exige el índice para clasificarla`;
    } else if (noLeida) {
      fuenteTxt = `No se pudo consultar el índice de competencia en esta carga (no es falta de datos) · supuesto conservador de ${PROMEDIO_CONSERVADOR} rivales (lib/probabilidad.PROMEDIO_CONSERVADOR)`;
      confianza = SIN_DATO;
    } else {
      fuenteTxt = `Ni «${entidad}» ni su departamento tienen suficientes procesos adjudicados con el número de ofertas publicado · supuesto conservador de ${PROMEDIO_CONSERVADOR} rivales (lib/probabilidad.PROMEDIO_CONSERVADOR)`;
      confianza = SIN_DATO;
    }
    datos.fuente = fuenteTxt;
    push({
      paso: 1,
      nombre: "Probabilidad base por competencia histórica",
      formula: t.encogido
        ? "P_base = 1 / (1 + rivales_estimados)  ·  rivales_estimados = w·promedio_entidad + (1−w)·promedio_global  ·  w = n/(n+m)"
        : "P_base = 1 / (1 + promedio_oferentes_entidad)",
      datos_entrada: datos,
      calculo: `1 / (1 + ${dec(t.rivales, 2)}) = ${dec(t.base, 4)}`,
      resultado: pct(t.base),
      confianza,
      fundamento: "Reparto uniforme: con N rivales habilitados, cada oferta gana 1 de cada N+1 veces. "
        + (t.fuente === "conservador"
          ? (noLeida
            ? "Esta vez no se pudo consultar cuántos compiten en esta entidad, y eso no significa que no tenga datos: "
            : "Ni la entidad ni su departamento publican el número de ofertas en suficientes procesos adjudicados: ")
            + `los ${PROMEDIO_CONSERVADOR} rivales son un supuesto `
            + "declarado y deliberadamente pesimista, no una medición. Este paso aporta puntos porque un cero dejaría la "
            + "probabilidad en cero, que sería otro número inventado."
          : t.encogido
            ? "Los rivales esperados combinan el histórico de la entidad con el promedio de su departamento (encogido a "
              + "su vez hacia el nacional; el nacional si el departamento no se conoce), pesando los datos propios por "
              + "cuántos son (encogimiento gamma-Poisson): con pocos procesos manda el prior, con muchos manda la "
              + "entidad, y no hay ningún salto al cruzar los 5 procesos — antes UN proceso "
              + `más podía multiplicar la probabilidad por 2,6. La banda del 90 % (±${Z_BANDA}·σ) dice cuánto se puede `
              + "mover la cifra con la muestra que hay."
            /* con el respaldo del departamento, el fundamento decía que el
               promedio salía «de la entidad», dos renglones debajo de un dato
               que dice lo contrario (23-sep-2026) */
            : t.fuente === "departamento"
              ? `El promedio de oferentes NO es de esta entidad: sale de los procesos adjudicados de ${depto || "su departamento"}, `
                + `porque la entidad publica el número de ofertas en menos de ${MIN_PROCESOS}. Es un respaldo para ordenar la lista, `
                + "no una medición de la entidad."
              : "El promedio de oferentes sale del corpus histórico de procesos ya adjudicados de la entidad."),
      aporte_pp: pp(t.base),
    });
  }

  /* ─────────── PASO 2 · nivel de competencia de la entidad ─────────── */
  {
    /* Desde ago 2026 este paso NO multiplica. Se conserva como paso —y no se
       borra renumerando los demás— porque el nivel SÍ se le enseña al dueño en
       la tarjeta, y un desglose que lo omitiera dejaría sin explicar por qué un
       «competencia baja» bien visible no suma ni un punto. Explicarlo es
       justamente el trabajo de este módulo. */
    const clasificada = ["baja", "media", "alta"].includes(competencia.nivel);
    const cortes = metaComp && metaComp.cortes ? metaComp.cortes : null;
    const datos = {
      nivel_entidad: competencia.nivel,
      nivel_entidad_legible: NIVEL_COMPETENCIA[competencia.nivel]
        || (noLeida ? "no se pudo consultar en esta carga" : "sin el número de ofertas en suficientes procesos"),
      // null = no se contó (índice sin leer), jamás 0
      procesos_analizados: competencia.total_procesos ?? null,
      promedio_oferentes: competencia.promedio_oferentes,
      cortes_tertiles: cortes && !cortes.degenerado
        ? { baja_hasta: cortes.baja_hasta, media_hasta: cortes.media_hasta }
        : null,
      factor_aplicado: 1,
      fuente: clasificada
        ? `Índice de competencia · tertiles sobre el promedio de oferentes de todas las entidades clasificadas`
          + (metaComp && metaComp.clasificadas ? ` (${metaComp.clasificadas} entidades)` : "")
        : noLeida ? "Índice de competencia · no se pudo consultar en esta carga"
          : `Índice de competencia · «${entidad}» no está clasificada (mínimo ${MIN_PROCESOS} procesos)`,
    };
    push({
      paso: 2,
      nombre: "Nivel de competencia de la entidad (informativo: NO multiplica)",
      formula: "P = P  ·  el nivel no interviene: su efecto ya está entero en el paso 1",
      datos_entrada: datos,
      calculo: `${dec(t.base, 4)} × 1 = ${dec(t.base, 4)}`
        + (clasificada ? ` (nivel «${competencia.nivel}»: informa, no ajusta)` : " (entidad sin nivel clasificado)"),
      resultado: pct(t.base),
      confianza: !clasificada ? SIN_DATO
        : competencia.total_procesos >= PROCESOS_CONFIANZA_ALTA ? ALTA : MEDIA,
      fundamento: "El nivel es el TERTIL del mismo promedio de oferentes que ya está dentro de los rivales esperados del "
        + "paso 1, así que multiplicar por él contaba la competencia DOS VECES. Hasta ago 2026 lo hacía (×1,30 «baja» / "
        + "×0,70 «alta») y eso producía tres efectos medidos: un salto del −32 % de probabilidad por medio rival en el "
        + "corte del tertil; ×1,30 de diferencia según el promedio viniera de la entidad o del departamento —porque el "
        + "respaldo departamental no trae nivel—; y, como los tertiles son RELATIVOS, la probabilidad de este proceso "
        + "cambiaba cuando cambiaban OTRAS entidades del índice. El nivel se sigue publicando porque sitúa a la entidad "
        + "frente al mercado y sirve para filtrar y ordenar, pero su efecto sobre la cifra ya está entero en el paso 1.",
      aporte_pp: 0,
    });
  }

  /* ─────────── PASO 3 · prórroga del cierre ─────────── */
  {
    const a = aplicado("cierre_prorrogado");
    /* `_cierre_prorrogado` solo existe si el corpus se leyó con `{senales:true}`.
       Sin la bandera el campo llega `undefined`, y eso es SIN DATO —no «no hubo
       prórroga»—: la distinción es justo la que el paso tiene que preservar. */
    const observado = typeof l._cierre_prorrogado === "boolean";
    const pPrevia = a ? a.p_antes : pAntesDe(t, "cierre_prorrogado");
    /* B3: el factor sale de la MEDICIÓN cuando la señal tenga base (el delta la
       estampa al histórico desde el 16-ago-2026); hasta entonces, el 1,20
       supuesto — y se dice cuál aplicó y cuánta señal hay acumulada. */
    const medPr = metaCompParaTraza && metaCompParaTraza.prorroga ? metaCompParaTraza.prorroga : null;
    const fpr = factorProrrogaDe(medPr);
    push({
      paso: 3,
      nombre: "Ajuste por prórroga del cierre",
      formula: fpr.origen === "medido"
        ? `P = P × ${fpr.factor} si el cierre se movió por adenda  ·  ${fpr.factor} = multiplicador MEDIDO en el histórico (prorrogados vs no prorrogados de cada entidad)`
        : `P = P × ${FACTOR_CIERRE_PRORROGADO} si el cierre se movió por adenda (supuesto declarado: la señal aún no tiene base medida)`,
      datos_entrada: {
        cierre_prorrogado: observado ? l._cierre_prorrogado : null,
        versiones_observadas: typeof l._versiones === "number" ? l._versiones : null,
        fecha_cierre_vigente: l.fecha_cierre ? String(l.fecha_cierre).slice(0, 10) : null,
        factor_aplicado: a ? a.factor : (observado ? 1 : null),
        origen_del_factor: fpr.origen,
        medicion: medPr ? {
          entidades: medPr.entidades_con_ambos_grupos, procesos_prorrogados: medPr.procesos_prorrogados,
          procesos_no_prorrogados: medPr.procesos_no_prorrogados, multiplicador_implicito: medPr.multiplicador_implicito,
          sin_senal: medPr.sin_senal,
        } : null,
        fuente: observado
          ? `Corpus activo · dedup de lectura sobre ${typeof l._versiones === "number" ? l._versiones : "las"} versiones publicadas del proceso (lib/almacen.leerChunksDedup)`
          : "El corpus no se leyó con señales entre versiones: no consta si el cierre se movió",
      },
      calculo: a
        ? `${dec(a.p_antes, 4)} × ${a.factor} = ${dec(a.p_despues, 4)}`
        : observado
          ? `${dec(pPrevia, 4)} × 1 = ${dec(pPrevia, 4)} (el cierre no se movió)`
          : "sin dato: no se aplica ajuste",
      resultado: pct(a ? a.p_despues : pPrevia),
      confianza: observado ? ALTA : SIN_DATO,
      fundamento: "Es la única señal de competencia observable ANTES del cierre que existe en el corpus: el contador de "
        + "oferentes es ex-post y en un proceso abierto vale 0 por construcción. Supuesto declarado: la entidad mueve el "
        + "cierre cuando no llegaron ofertas suficientes. "
        + (fpr.origen === "medido"
          ? "La magnitud ya se mide en el histórico (prorrogados frente a no prorrogados de la misma entidad)."
          : "La magnitud (1,20) todavía es un supuesto: desde el 16-ago-2026 el delta guarda en el histórico si cada proceso "
            + "que cierra fue prorrogado, y en cuanto haya base el factor pasa a ser el medido, con su origen declarado."),
      aporte_pp: a ? pp(a.p_despues - a.p_antes) : 0,
    });
  }

  /* ─────────── PASO 4 · precio: hasta dónde puede bajar frente al mercado ─────────── */
  {
    const a = aplicado("precio");
    const conBase = baja.nivel && baja.nivel !== "sin_dato" && baja.baja_mediana != null;
    const pPrevia = a ? a.p_antes : pAntesDe(t, "precio");
    const generado = metaBaja && metaBaja.generado ? String(metaBaja.generado).slice(0, 10) : null;
    push({
      paso: 4,
      nombre: "Ajuste por precio: hasta dónde puede bajar frente al centro del mercado",
      formula: "P = P × mult( min(baja_maxima_del_dueño, baja_mediana_entidad) )  ·  mult = curva de precio de lib/apu/rentabilidad, "
        + "= 1 exactamente en la mediana",
      datos_entrada: {
        baja_mediana_pct: conBase ? baja.baja_mediana : null,
        // §3.3: la mediana que USA el factor va encogida hacia la referencia de su modalidad
        baja_mediana_para_precio_pct: a ? a.baja_mediana_pct : null,
        peso_datos_celda: a ? a.peso_datos_baja : null,
        referencia_encogimiento: a ? a.referencia_baja : null,
        nivel_baja: conBase ? (NIVEL_BAJA[baja.nivel] || baja.nivel) : "sin_dato",
        baja_maxima_del_dueno_pct: a ? a.baja_maxima_pct : null,
        origen_baja_maxima: a ? a.origen_b_max : null,
        baja_ofertable_pct: a ? a.baja_ofertable_pct : null,
        dispersion_pp: a ? a.dispersion_pp : null,
        granularidad_utilizada: baja.granularidad_utilizada
          ? (GRANULARIDAD[baja.granularidad_utilizada] || baja.granularidad_utilizada) : null,
        modalidad_utilizada: baja.modalidad_utilizada || null,
        // null = no se contó (índice de baja sin leer), jamás 0
        procesos_analizados: baja.procesos_contados ?? null,
        factor_aplicado: a ? a.factor : (conBase ? 1 : null),
        fuente: conBase
          ? `Índice de baja de mercado · ${baja.procesos_contados} procesos adjudicados con presupuesto y valor adjudicado en la misma fila`
            + (generado ? ` · índice generado el ${generado}` : "")
          : baja.mensaje || "Sin datos históricos de baja para esta entidad",
      },
      calculo: a
        ? `${dec(a.p_antes, 4)} × ${a.factor} = ${dec(a.p_despues, 4)}`
        : "sin dato: no se aplica ajuste",
      resultado: pct(a ? a.p_despues : pPrevia),
      confianza: !conBase ? SIN_DATO
        : a && a.origen_b_max === "neutra" ? SIN_DATO
          : String(baja.granularidad_utilizada || "").startsWith("departamento") ? BAJA
            : (baja.procesos_contados || 0) >= PROCESOS_CONFIANZA_ALTA ? ALTA : MEDIA,
      fundamento: "Lo que mueve la probabilidad no es dónde está el centro del mercado sino a qué distancia de él puede "
        + "ofertar el dueño sin perder plata. Si puede bajar hasta la mediana (o más), juega en el centro y el factor es "
        + "exactamente 1; si solo puede bajar menos, oferta por encima del centro y la misma curva de precio del editor "
        + "de APU dice cuánta probabilidad cuesta. Sin una baja máxima declarada el ajuste es NEUTRO: no se sabe hasta "
        + "dónde puede bajar, y penalizar por ignorancia sería inventar. Hasta ago 2026 aquí había una rampa (×1,10 si la "
        + "entidad adjudica cerca del oficial, ×0,85 si descuenta ≥5 %) que castigaba a la entidad por su centro y "
        + "cobraba el precio dos veces con el editor de APU: se retiró (§2.5c del análisis de probabilidad del proyecto).",
      aporte_pp: a ? pp(a.p_despues - a.p_antes) : 0,
    });
  }

  /* ─────────── PASO 5 · colisión de cierres ─────────── */
  {
    const a = aplicado("colision_cierres");
    /* «Se pudo mirar» exige fecha de cierre: sin ella no hay con qué colisionar
       y `claveColision` devuelve null. Un 0 aquí no es «no colisiona». */
    const medible = !!claveColision(l);
    const pPrevia = a ? a.p_antes : pAntesDe(t, "colision_cierres");
    /* A7: el factor sale de la MEDICIÓN del índice (multiplicador implícito por
       entidad sobre el histórico) y solo cae al 1,15 supuesto sin medición. Se
       narra cuál aplicó y sobre cuántas entidades se midió. */
    const fc = factorColisionDe(metaCompParaTraza && metaCompParaTraza.colision ? metaCompParaTraza.colision : null);
    const med = metaCompParaTraza && metaCompParaTraza.colision ? metaCompParaTraza.colision : null;
    push({
      paso: 5,
      nombre: "Ajuste por colisión de cierres",
      formula: fc.origen === "medido"
        ? `P = P × ${fc.factor} si la entidad cierra 2 o más procesos el MISMO DÍA  ·  ${fc.factor} = multiplicador MEDIDO en el histórico (P observada en colisión ÷ P esperada con el control de cada entidad)`
        : `P = P × ${FACTOR_COLISION_CIERRES} si la entidad cierra 2 o más procesos el MISMO DÍA (supuesto declarado: el índice no trae medición)`,
      datos_entrada: {
        procesos_que_cierran_el_mismo_dia: medible ? colision : null,
        fecha_cierre: l.fecha_cierre ? String(l.fecha_cierre).slice(0, 10) : null,
        ventana: "el mismo día exacto, no una ventana de días (lib/probabilidad.claveColision)",
        factor_aplicado: a ? a.factor : (medible ? 1 : null),
        origen_del_factor: fc.origen,
        medicion: med ? {
          entidades: med.entidades_con_ambos_grupos, procesos_colision: med.procesos_colision, procesos_control: med.procesos_control,
          cociente_promedios: med.cociente_pooled, multiplicador_implicito: med.multiplicador_implicito, mediana_por_entidad: med.mediana_cocientes,
        } : null,
        fuente: medible
          ? `Corpus activo · procesos de «${entidad}» con la misma fecha de cierre`
            + (fc.origen === "medido" ? ` · factor medido sobre ${fc.entidades} entidades del histórico` : "")
          : "El proceso no tiene fecha de cierre publicada: no se puede medir la colisión",
      },
      calculo: a
        ? `${dec(a.p_antes, 4)} × ${a.factor} = ${dec(a.p_despues, 4)}`
        : medible
          ? `${dec(pPrevia, 4)} × 1 = ${dec(pPrevia, 4)} (${colision} proceso${colision === 1 ? "" : "s"} ese día: no hay colisión)`
          : "sin fecha de cierre: no se aplica ajuste",
      resultado: pct(a ? a.p_despues : pPrevia),
      confianza: medible ? ALTA : SIN_DATO,
      fundamento: "Los rivales son firmas de 1 a 20 personas con un único cuello de botella de ingeniería: si la entidad "
        + "cierra varios procesos el mismo día, se reparten entre ellos. "
        + (fc.origen === "medido"
          ? "La magnitud ya no es un supuesto: se mide en el histórico, entidad por entidad, comparando los procesos que "
            + "cierran el mismo día con los demás de la misma entidad (estratificado, para no medir que las entidades grandes "
            + "reciben más ofertas). En producción salió ~1,06: el 1,15 que había era un supuesto y no estaba respaldado."
          : "El 1,15 es un supuesto declarado; con el índice reconstruido se sustituye por la magnitud medida."),
      aporte_pp: a ? pp(a.p_despues - a.p_antes) : 0,
    });
  }

  /* ─────────── PASO 6 · límites y redondeo ───────────
     Cierra la cadena y ABSORBE el residuo del redondeo a dos decimales de los
     cinco pasos anteriores. Es honesto porque es literalmente lo que este paso
     hace: la cifra que se publica es la redondeada. Gracias a esto Σ aporte_pp
     es EXACTAMENTE `probabilidad_final × 100`, y hay prueba de la igualdad. */
  const probabilidadFinal = r4(t.p);
  const finalPP = pp(t.p);
  {
    const acumulado = r2(pasos.reduce((s, x) => s + x.aporte_pp, 0));
    const mordio = t.limite;
    push({
      paso: 6,
      nombre: "Límite final y redondeo",
      formula: `P = min(${P_MAXIMA}, max(${P_MINIMA}, P)), redondeada a 4 decimales`,
      datos_entrada: {
        p_antes_de_limites: r4(t.p_antes_de_limites),
        p_minima: P_MINIMA,
        p_maxima: P_MAXIMA,
        limite_aplicado: mordio,
        resultado_no_finito: t.no_finito,
        fuente: "lib/probabilidad · constantes P_MINIMA y P_MAXIMA",
      },
      calculo: mordio
        ? `min(${P_MAXIMA}, max(${P_MINIMA}, ${dec(t.p_antes_de_limites, 4)})) = ${dec(t.p, 4)} — se aplicó el ${mordio}`
        : `min(${P_MAXIMA}, max(${P_MINIMA}, ${dec(t.p_antes_de_limites, 4)})) = ${dec(t.p, 4)} — ningún límite mordió`,
      resultado: pct(t.p),
      confianza: ALTA,
      fundamento: "El modelo no ve inhabilidades, RUP vencido, experiencia específica del pliego ni indicadores "
        + "financieros exigidos: nada de eso está en los datos abiertos y cualquiera puede tumbar la oferta. Por eso "
        + "ninguna combinación de factores puede afirmar una cuasi-certeza.",
      // el residuo es el redondeo de los cinco pasos anteriores: así la columna
      // de aportes suma exactamente la cifra que encabeza el desglose
      aporte_pp: r2(finalPP - acumulado),
    });
  }

  /* ─────────── LA EXPLICACIÓN EN SENCILLO (encargo del dueño, ago 2026) ────
     La misma cadena contada en frases que cualquiera entiende, SIN fórmulas.
     Se deriva de los MISMOS pasos ya calculados (un segundo cálculo divergiría
     — la regla de trazaP) y solo menciona lo que MOVIÓ la cifra: los pasos que
     no aplicaron siguen en `pasos`, que es la vista auditable, donde «no hubo
     prórroga» y «no se miró la prórroga» sí tienen que distinguirse. */
  const explicacion = [];
  /* SIN BASE MEDIDA DE ESTA ENTIDAD NO HAY FRECUENCIA NI PORCENTAJE DE GANAR
     (23-sep-2026, decisión del dueño: «se supone que no hay histórico, ¿de
     dónde sacas el dato?»). La viñeta de base decía «su oferta sería una entre
     6» y la de cierre, dos renglones abajo, «de cada 5 procesos como este se
     ganaría 1 (19.17 %)» —el salto lo mete la colisión de cierres, un supuesto
     más—: dos frecuencias distintas, ninguna medida. Sin base, la primera
     viñeta dice QUÉ FALTA y CON QUÉ se ordena la lista (el promedio del
     departamento, que sí es un hecho de otras entidades, o el supuesto de 5
     rivales), y el cierre dice la consecuencia, sin cifra. La cifra queda en la
     tabla auditable, marcada como supuesto. `conBase` es la regla de
     `conBaseDeEntidad`, la misma de la tarjeta. */
  const conBase = conBaseDeEntidad(t.fuente, competencia);
  {
    const rv = r2(t.rivales);
    const n = competencia.total_procesos;
    const mezcla = t.fuente === "entidad" && t.encogido && (!conBase || (t.peso_datos != null && t.peso_datos < 0.8));
    if (mezcla) {
      /* Con pocos datos propios la cifra NO es «el promedio de esta entidad»:
         es una mezcla con el promedio general, y decir lo contrario sería
         presentar un estimador como una medición. Y si la entidad ni siquiera
         tiene cuántos compiten medido (la celda 1 de la tarjeta en «—»),
         tampoco se dice «su oferta sería una entre N». */
      const mu = t.prior != null ? t.prior : (metaComp && metaComp.encogimiento ? metaComp.encogimiento.mu_global : null);
      const deDonde = t.prior_origen && t.prior_origen.startsWith("departamento:")
        ? `el promedio de su departamento, ${t.prior_origen.slice("departamento:".length)}` : "el promedio general del mercado";
      const conteo = Number.isFinite(Number(n)) && Number(n) > 0
        ? `Esta entidad tiene ${n} proceso${n === 1 ? "" : "s"} adjudicado${n === 1 ? "" : "s"} con dato`
        : "Esta entidad tiene pocos procesos adjudicados con dato";
      const peso = t.peso_datos != null
        ? `su historial pesa ${Math.round(t.peso_datos * 100)} % y el resto lo pone ${deDonde}`
        : `el cálculo lo completa con ${deDonde}`;
      explicacion.push({
        tipo: "base",
        texto: `${conteo}: poco para fiarse solo de eso, así que ${peso}${mu != null ? ` (${numCO(mu, 1)} empresas)` : ""}. `
          + (conBase
            ? `Salen ${numCO(rv, 1)} rivales esperados: su oferta sería una entre ${numCO(rv + 1, 1)}. Con más procesos suyos, la cifra se apoyará más en la entidad.`
            : "No alcanza para decir cuántas empresas compiten aquí: la lista se ordena con esa mezcla, que no es una medición de la entidad."),
      });
    } else if (t.fuente === "entidad") {
      explicacion.push({
        tipo: "base",
        texto: `A los procesos de esta entidad se han presentado, en promedio, ${numCO(rv, 1)} empresas — está contado `
          + `sobre ${n} procesos que ya se adjudicaron. Si se presentan ${numCO(rv, 1)}, su `
          + `oferta es una entre ${numCO(rv + 1, 1)}: ahí empieza la cuenta.`,
      });
    } else if (t.fuente === "departamento") {
      explicacion.push({
        tipo: "base",
        texto: `Esta entidad publica el número de ofertas en menos de ${MIN_PROCESOS} procesos adjudicados, así que `
          + `la lista se ordena con el promedio de su departamento${depto ? ` (${depto})` : ""}: ${numCO(rv, 1)} empresas por proceso. `
          + "Es un promedio de otras entidades, no una medición de esta.",
      });
    } else {
      explicacion.push({
        tipo: "base",
        texto: (noLeida
          ? "Esta vez no se pudo consultar cuántas empresas compiten en esta entidad (no significa que no tenga datos), así que mientras tanto "
          : "Ni esta entidad ni su departamento publican cuántas empresas ofertaron en suficientes procesos, así que ")
          + `la lista se ordena con un supuesto prudente de ${PROMEDIO_CONSERVADOR} rivales. Es un supuesto declarado, no una medición.`,
      });
    }
    if (aplicado("cierre_prorrogado")) {
      explicacion.push({ tipo: "sube", texto: "La entidad aplazó la fecha de cierre. Eso casi siempre pasa cuando llegaron pocas ofertas, así que su opción sube un poco." });
    }
    const pr = aplicado("precio");
    if (pr && pr.factor < 1) {
      explicacion.push({ tipo: "baja", texto: `Aquí el que gana suele bajar el precio ~${numCO(pr.baja_mediana_pct, 1)} % y usted solo puede bajar hasta ${numCO(pr.baja_maxima_pct, 1)} % sin perder plata: ofertar por encima de lo habitual le resta.` });
    } else if (pr && pr.origen_b_max === "declarada") {
      explicacion.push({ tipo: "neutro", texto: `Puede bajar hasta ${numCO(pr.baja_maxima_pct, 1)} % sin perder plata y aquí el que gana baja ~${numCO(pr.baja_mediana_pct, 1)} %: puede ofertar en el centro del mercado, el precio no le resta.` });
    }
    if (aplicado("colision_cierres")) {
      explicacion.push({ tipo: "sube", texto: "La entidad cierra varios procesos el mismo día: los competidores no alcanzan a presentarse a todos, y eso le suma un poco." });
    }
    if (t.limite) {
      explicacion.push({ tipo: "tope", texto: "La cifra se acota por prudencia: los datos públicos no ven el pliego, y una inhabilidad o un requisito de experiencia tumban cualquier oferta — por eso nunca se afirma una cuasi-certeza." });
    }
    const deCada = deCadaDe(probabilidadFinal);
    if (deCada && conBase) {
      // el porcentaje con la precisión y el formato del titular del modal («27 %», «19,2 %»)
      explicacion.push({ tipo: "cierre", texto: `Resultado: de cada ${deCada} procesos como este, se gana 1 aproximadamente (${numCO(finalPP, 1)} %).` });
    } else if (!conBase) {
      explicacion.push({ tipo: "cierre", texto: "Sin esa medición no se puede decir cuántas veces se gana aquí: el cálculo solo ordena la lista." });
    }
  }

  /* SIN CUANTÍA PUBLICADA, null — no 0 (1-sep-2026): la justificación copiable
     imprimía «Cuantía: $0 · Valor esperado: $0» en un texto pensado para
     pegarse en un informe, mientras el modal decía «No definida». */
  const cuantiaLeida = Number(l.cuantia_cop ?? l.precio_base);
  const cuantia = Number.isFinite(cuantiaLeida) && cuantiaLeida > 0 ? cuantiaLeida : null;
  return {
    id_proceso: idDe(l) || null,
    explicacion_simple: explicacion,
    /* sin base, «cuántas empresas se presentaron a los procesos que esta entidad
       adjudicó» afirmaba el conteo que la primera viñeta dice que falta */
    de_donde_salen_los_datos: conBase
      ? "Todo sale de datos públicos de SECOP II: los procesos que esta entidad ya adjudicó "
        + "desde 2024 — cuántas empresas se presentaron a cada uno, a qué precio se adjudicó y cuándo cerró."
      : "Todo sale de datos públicos de SECOP II (procesos adjudicados desde 2024).",
    // la regla de `conBaseDeEntidad`, publicada: el navegador la ata con `frecuenciaConBase` (censo de la suite)
    con_base_de_entidad: conBase,
    aviso_supuesto: conBase ? null : AVISO_SUPUESTO,
    objeto: String(l.nombre_del_procedimiento || "").trim() || null,
    entidad,
    departamento: depto || null,
    modalidad: l.modalidad_de_contratacion || null,
    cuantia_cop: cuantia,
    fecha_cierre: l.fecha_cierre || null,
    probabilidad_final: probabilidadFinal,
    probabilidad_final_pct: finalPP,
    valor_esperado_cop: cuantia != null ? valorEsperado(l, probabilidadFinal) : null,
    /* para MOSTRAR, y solo con base: sin ella es la cuantía por un supuesto,
       y un «≈ $243.300.000 por intento» se lee como dato (null, no 0) */
    contrato_esperado_aprox_cop: conBase && cuantia != null
      ? contratoEsperadoAprox(valorEsperado(l, probabilidadFinal), cuantia) : null,
    rivales_esperados: r2(t.rivales),
    fuente_del_promedio: t.fuente,
    // A5/A6: la cifra SIN el factor de precio (la que consume el editor de APU) y la banda del 90 %
    probabilidad_sin_precio: r4(t.p_sin_precio),
    banda_90: t.p_lo != null && t.p_hi != null ? { desde: r4(t.p_lo), hasta: r4(t.p_hi) } : null,
    peso_datos_entidad: t.peso_datos,
    pasos,
    // el reparto tiene que cuadrar y se publica cuadrado: sin esta igualdad,
    // una tabla de aportes es una tabla que no se puede auditar
    suma_aportes_pp: r2(pasos.reduce((s, x) => s + x.aporte_pp, 0)),
    competencia_entidad: competencia,
    baja_mercado: baja,
  };
}

/* p con la que ENTRA un ajuste que no se aplicó: la salida del último paso
   aplicado ANTES de su posición en el orden canónico de la cadena. Sin esto,
   un paso «no aplica» tendría que enseñar una p arbitraria y el lector no
   podría seguir la cuenta de arriba abajo. */
const ORDEN_CADENA = ["competencia", "cierre_prorrogado", "precio", "colision_cierres"];
/* `competencia` ya no aparece como paso de la cadena —el tertil dejó de
   multiplicar en ago 2026— pero SIGUE en el orden: es la posición que ocupa el
   paso informativo, y quitarla desplazaría el `pAntesDe` de todos los demás. */
const GRUPO_DE = {
  cierre_prorrogado: "cierre_prorrogado",
  precio: "precio",
  colision_cierres: "colision_cierres",
};
function pAntesDe(t, grupo) {
  const hasta = ORDEN_CADENA.indexOf(grupo);
  let p = t.base;
  for (const paso of t.pasos) {
    if (ORDEN_CADENA.indexOf(GRUPO_DE[paso.nombre]) < hasta) p = paso.p_despues;
  }
  return p;
}

/* ══════════════════════ generarResumenEjecutivo ══════════════════════
   Tres o cuatro líneas en lenguaje de negocio, para pegar en un informe. Cero
   adjetivos vacíos y cero condicionales: cada frase es un dato del desglose o
   una división escrita.

   `costo_preparacion_estimado` es OPCIONAL y no existe en ninguna fuente del
   proyecto: sin él no se inventa una cifra, se enuncia el umbral en múltiplos
   del costo, que es igual de accionable y no afirma nada que no se sepa.

   SIN BASE MEDIDA DE ESTA ENTIDAD (23-sep-2026, `conBaseDeEntidad`): el resumen
   decía «Probabilidad de adjudicación: 16.7 %. En 1 de cada 6 procesos como
   este la oferta resultaría ganadora» con el supuesto de 5 rivales, y el mismo
   texto viajaba a «Copiar justificación». Sin base dice qué falta y con qué se
   ordena la lista, sin porcentaje, sin «1 de cada N» y sin el umbral de costo
   (que es 1/p, la misma frecuencia con otro nombre). Con base, las cifras en
   es-CO y con la precisión del titular del modal. */
function generarResumenEjecutivo(desglose, costo_preparacion_estimado) {
  const d = desglose || {};
  const p = Number(d.probabilidad_final) || 0;
  const rivales = Number(d.rivales_esperados) || 0;
  const lineas = [];
  const costo = Number(costo_preparacion_estimado);
  const hayCosto = Number.isFinite(costo) && costo > 0;

  const noLeida = !!d.competencia_entidad && d.competencia_entidad.motivo === "no_se_leyo";
  if (!conBaseDeEntidad(d.fuente_del_promedio, d.competencia_entidad)) {
    const FALTA = {
      entidad: "la entidad tiene pocos procesos con el número de ofertas publicado, y el cálculo los completa con un promedio más amplio",
      departamento: `la entidad publica el número de ofertas en menos de ${MIN_PROCESOS} procesos adjudicados, y el cálculo usa el promedio de `
        + `${d.departamento || "su departamento"} (${numCO(rivales, 1)} oferentes por proceso)`,
      conservador: noLeida
        ? `esta vez no se pudo consultar cuántos compiten en la entidad, y eso no significa que no tenga datos; mientras tanto el cálculo usa un supuesto conservador de ${PROMEDIO_CONSERVADOR} rivales`
        : `ni la entidad ni su departamento publican el número de ofertas en suficientes procesos, y el cálculo usa un supuesto conservador de ${PROMEDIO_CONSERVADOR} rivales`,
    };
    lineas.push(`No se sabe cuántos oferentes compiten en ${d.entidad || "esta entidad"}: ${FALTA[d.fuente_del_promedio] || "no hay con qué medirlo"}.`);
    lineas.push("Sin esa medición no se puede decir cuántas veces se gana aquí: la cifra del cálculo es un supuesto que solo "
      + "sirve para ordenar la lista, y se detalla, marcada como tal, en los pasos.");
    lineas.push(hayCosto
      ? `Preparar la oferta cuesta ${cop(costo)}; sin esa medición no se calcula desde qué margen del contrato se paga.`
      : "Sin esa medición no se calcula desde qué margen del contrato se paga preparar la oferta.");
    return lineas.join("\n");
  }

  lineas.push(`Se esperan ${numCO(rivales, 1)} oferentes para esta licitación, medidos sobre el histórico adjudicado de ${d.entidad}.`);
  const deCada = deCadaDe(p);
  lineas.push(`Probabilidad de adjudicación: ${numCO(d.probabilidad_final_pct, 1)} %.`
    + (deCada ? ` En 1 de cada ${deCada} procesos como este la oferta resultaría ganadora.` : ""));

  /* Los ajustes que MOVIERON la cifra, con su aporte en puntos. Si ninguno se
     aplicó se dice, en vez de dejar la línea fuera: que la base no se corrigiera
     es información. */
  const movidos = (d.pasos || []).filter((x) => x.paso > 1 && x.paso < 6 && x.aporte_pp !== 0);
  lineas.push(movidos.length
    ? `Sobre la base del ${numCO((d.pasos[0] || {}).aporte_pp, 1)} % pesan: `
      + movidos.map((x) => `${x.nombre.replace(/^Ajuste por /, "")} (${x.aporte_pp > 0 ? "+" : "−"}${numCO(Math.abs(x.aporte_pp), 1)} puntos)`).join(", ")
      + "."
    : `Ningún ajuste observable modifica la base del ${numCO((d.pasos[0] || {}).aporte_pp, 1)} %.`);

  if (hayCosto && p > 0) {
    lineas.push(`Preparar la oferta cuesta ${cop(costo)}: se recomienda ofertar solo si el margen esperado del contrato `
      + `supera ${cop(costo / p)} (costo ÷ probabilidad).`);
  } else {
    lineas.push(`No se registró un costo de preparación: con esta probabilidad, preparar la oferta se paga solo si el `
      + `margen esperado del contrato supera ${numCO(p > 0 ? 1 / p : 0, 1)} veces ese costo.`);
  }
  return lineas.join("\n");
}

/* ══════════════════════ texto plano para copiar ══════════════════════
   Es lo que produce el botón «Copiar justificación» cuando alguien la pide por
   API. El frontend arma el suyo con el mismo contenido y sin volver a pedir
   nada: son dos formatos del mismo desglose, no dos desgloses.
   SIN BASE (23-sep-2026): el titular copiado decía «PROBABILIDAD DE
   ADJUDICACIÓN: 16.7 %» y «Valor esperado: $243.270.000» al peso; ahora dice
   que no hay medición y que los pasos parten de un supuesto, y el contrato
   esperado solo sale con base, con la precisión del modal
   (`contrato_esperado_aprox_cop`) y con su nombre: el modal lo llama «Contrato
   esperado por intento» y el texto copiado no puede llamarlo de otra forma.
   Los pasos conservan su aritmética: son la tabla auditable. */
function justificacionTexto(desglose, resumen) {
  const d = desglose || {};
  const conBase = conBaseDeEntidad(d.fuente_del_promedio, d.competencia_entidad);
  const L = [];
  L.push(conBase
    ? `PROBABILIDAD DE ADJUDICACIÓN: ${numCO(d.probabilidad_final_pct, 1)} %`
    : "PROBABILIDAD DE ADJUDICACIÓN: sin medición de esta entidad (los pasos usan un supuesto)");
  L.push(`Proceso: ${d.id_proceso || "(sin id)"} · ${d.objeto || "(sin objeto)"}`);
  L.push(`Entidad: ${d.entidad}${d.departamento ? ` (${d.departamento})` : ""}`);
  L.push(`Cuantía: ${d.cuantia_cop != null ? cop(d.cuantia_cop) : "no publicada"}`
    + (conBase && d.contrato_esperado_aprox_cop != null ? ` · Contrato esperado por intento ≈ ${cop(d.contrato_esperado_aprox_cop)}` : ""));
  if (!conBase) L.push(AVISO_SUPUESTO);
  L.push("");
  for (const s of d.pasos || []) {
    L.push(`${s.paso}. ${s.nombre}  [confianza: ${s.confianza}]`);
    L.push(`   Fórmula: ${s.formula}`);
    L.push(`   Datos:   ${(s.datos_entrada && s.datos_entrada.fuente) || "—"}`);
    L.push(`   Cálculo: ${s.calculo}`);
    L.push(`   Resultado: ${s.resultado}  ·  Aporte: ${s.aporte_pp > 0 ? "+" : ""}${dec(s.aporte_pp, 2)} pp`);
    L.push(`   Fundamento: ${s.fundamento}`);
    L.push("");
  }
  L.push(`Suma de aportes: ${dec(d.suma_aportes_pp, 2)} pp = ${dec(d.probabilidad_final_pct, 2)} %${conBase ? "" : " (supuesto)"}`);
  L.push("");
  L.push("RESUMEN EJECUTIVO");
  L.push(resumen || "");
  L.push("");
  L.push("Fuente: SECOP II (dataset p6dx-8zbt, Colombia Compra Eficiente), corpus histórico propio.");
  return L.join("\n");
}

/* ══════════════════════ acceso a Redis ══════════════════════
   Separado a propósito de las dos funciones de arriba, que son PURAS y se
   pueden probar sin levantar nada. Mismo reparto que lib/competencia_detalle.

   La caché lleva el sello del corpus y el de los DOS índices: resincronizar o
   reconstruir cualquiera de ellos la invalida sola, sin esperar al TTL. */
/* `v2` (ago 2026): la respuesta ganó `explicacion_simple` — sin el sufijo, una
   caché de la versión anterior serviría el modal sin la explicación hasta 5
   minutos después de desplegar (R11: desplegar nunca exige esperar).
   `v3` (23-sep-2026): sin base ya no se enuncia una frecuencia, y la respuesta
   ganó `con_base_de_entidad` y `contexto.contrato_esperado_aprox_cop`. */
const claveCache = (id) => `${CLAVES.desgloseProbabilidad}v3:${id}`;

async function leerCache(redis, id, sello) {
  const v = await redis.get(claveCache(id));
  if (v == null) return null;
  const obj = descomprimir(v);
  if (!obj || obj.sello !== sello) return null;
  return obj;
}
const guardarCache = (redis, id, obj) =>
  redis.set(claveCache(id), comprimir(obj), { ex: TTL_CACHE_SEG });

/* Busca el proceso por `id_del_proceso` en el corpus ACTIVO y, si no está, en
   el HISTÓRICO. Los dos, porque el desglose de un proceso ya adjudicado es
   justo el que sirve para calibrar: se puede contrastar contra lo que pasó. */
async function buscarProceso(redis, id) {
  for (const [corpus, patron] of [["activo", CLAVES.patronChunks], ["historico", CLAVES.patronChunksHist]]) {
    const claves = await redis.scan(patron);
    if (!claves.length) continue;
    // `senales` deriva del propio dedup, sin coste, la prórroga del cierre: es
    // el dato del paso 3 y sin él ese paso sería «Sin dato» siempre
    const filas = await leerChunksDedup(redis, claves, { senales: true });
    const fila = filas.find((f) => idDe(f) === id);
    if (fila) return { fila, filas, corpus };
  }
  return null;
}

/* ============================ desgloseDeProceso ============================
   Devuelve {estado, cuerpo}, igual que `detalleEntidad`: el módulo no toca
   `req`/`res` para poder probarlo suelto. */
async function desgloseDeProceso(redis, idCrudo, {
  usarCache = true, costoPreparacion = null, log = () => {},
  /* A4: perfil cuyos borradores de APU dan la baja máxima del proceso, y la
     declarada (`?baja_max=`). Sin perfil, sin b_max del APU: el factor de
     precio queda neutro salvo declarada — y el desglose reproduce el listado
     SOLO si el listado tampoco la tenía. Por eso el frontend manda el perfil. */
  perfil = null, bajaDeclarada = null,
} = {}) {
  const id = String(idCrudo == null ? "" : idCrudo).trim();
  if (!id) {
    return {
      estado: 400,
      cuerpo: { ok: false, error: "id_proceso requerido", como_hacerlo: "/api/probabilidad-desglose?id_proceso=CO1.REQ.123" },
    };
  }
  if (id.length > LARGO_MAX_ID) {
    return { estado: 400, cuerpo: { ok: false, error: `id_proceso requerido (máximo ${LARGO_MAX_ID} caracteres)` } };
  }

  const metaCorpus = await leerJSON(redis, CLAVES.meta);
  /* NO LEÍDO no es NO CONSTRUIDO (23-sep-2026). Un fallo de la meta o del hash
     del índice de competencia se tragaba y el desglose explicaba «sin histórico
     de la entidad» —y lo guardaba cinco minutos en caché—. Ahora el índice pasa
     como centinela (competenciaDe responde `motivo: "no_se_leyo"`), la respuesta
     lo avisa y NO se lee ni se escribe la caché: el fallo no se memoiza, y con
     la meta sin leer el sello de la caché tampoco es de fiar. */
  /* …Y EL HERMANO DE LA BAJA (23-sep-2026): su catch mudo explicaba «Sin datos
     históricos de baja para esta entidad» y lo guardaba cinco minutos, con el
     sello idéntico porque la meta sí se había leído. Mismo centinela (la baja
     responde `motivo: "no_se_leyo"`), mismo veto de caché. */
  const { INDICE_NO_LEIDO } = require("./indice_competencia.js");
  /* UNA REGLA DE LECTURA, LA DEL LISTADO (23-sep-2026). El desglose leía la
     meta y el hash por su cuenta y, con la meta AUSENTE, igual leía el hash: la
     tarjeta decía «sin datos de cuántos compiten» (el listado exige la meta
     para dar el índice por construido) y, a un clic, este modal decía «De cada
     4 procesos como este, gana 1». Ahora llama a `cargarIndice` y
     `cargarIndiceBaja` del listado —las mismas que ya reutilizan la guía y el
     seguimiento—: sin meta no hay índice, el fallo viaja con su texto ya
     tachado y la memoria caliente de la instancia se comparte (la probabilidad
     del desglose y la de la tarjeta salen del MISMO hash). `require` DIFERIDO:
     el listado es un handler y carga medio proyecto. */
  const L = require("./handlers/procesos/listar.js");
  const [lecturaComp, lecturaBaja] = await Promise.all([L.cargarIndice(redis), L.cargarIndiceBaja(redis)]);
  const errorLecturaIndice = lecturaComp.leido ? null : (lecturaComp.error || "fallo sin mensaje");
  const errorLecturaBaja = lecturaBaja.leido ? null : (lecturaBaja.error || "fallo sin mensaje");
  const metaComp = lecturaComp.meta || null;
  const metaBaja = lecturaBaja.meta || null;
  /* El costo de preparación entra en el SELLO: dos consultas del mismo proceso
     con costos distintos producen resúmenes distintos, y servir el de otro
     costo desde caché sería enseñar una recomendación que no se pidió. */
  const sello = [
    (metaCorpus && metaCorpus.last_sync) || "sin-corpus",
    (metaComp && metaComp.construido) || "sin-indice",
    (metaBaja && metaBaja.generado) || "sin-baja",
    costoPreparacion == null ? "sin-costo" : String(costoPreparacion),
    perfil ? `perfil:${perfil}` : "sin-perfil",
    bajaDeclarada == null || bajaDeclarada === "" ? "sin-bmax" : `bmax:${bajaDeclarada}`,
  ].join("|");

  if (usarCache && !errorLecturaIndice && !errorLecturaBaja) {
    const enCache = await leerCache(redis, id, sello);
    if (enCache) {
      log(`desglose de «${id}» servido desde caché`);
      return { estado: 200, cuerpo: { ...enCache.cuerpo, cache: true } };
    }
  }

  const hallazgo = await buscarProceso(redis, id);
  if (!hallazgo) {
    return {
      estado: 404,
      cuerpo: {
        ok: false, error: `No hay ningún proceso con id_del_proceso «${id}» en el corpus.`,
        detalle: "Se buscó en el corpus activo y en el histórico. Si el proceso existe en SECOP II pero no aquí, "
          + "o no pasó el prefiltro de ingesta, o la sincronización aún no lo ha traído.",
      },
    };
  }
  const { fila, filas, corpus } = hallazgo;

  // lo que no se pudo leer viaja como centinela; sin construir (sin meta), null
  const indice = errorLecturaIndice ? INDICE_NO_LEIDO : lecturaComp.indice;
  const indiceBaja = errorLecturaBaja ? INDICE_NO_LEIDO : lecturaBaja.indice;

  /* Los dos derivados salen del corpus que ya está en memoria —cero comandos
     extra— y con las MISMAS funciones que usa /api/oportunidades. */
  const _comp = new Map();
  const compDe = (l) => {
    let c = _comp.get(l);
    if (!c) { c = competenciaDe(indice, l); _comp.set(l, c); }
    return c;
  };
  const promediosDepto = promediosPorDepartamento(filas, compDe);
  const colisiones = indiceColisionCierres(filas);
  const clave = claveColision(fila);
  const depto = String(fila.departamento_entidad || "").trim().toUpperCase();

  /* b_max del proceso (lib/baja_maxima): APU guardado del perfil → declarada →
     null. Es LA MISMA resolución del listado; un fallo de lectura de los
     borradores deja `costos` en null y el desglose sigue (sin b_max del APU). */
  let bmax = { valor: null, origen: null, borrador: null };
  if (perfil) {
    let costos = null;
    try { costos = await cargarCostosPorProceso(redis, perfil); } catch { costos = null; }
    bmax = bajaMaximaDe(fila, costos, { baja: bajaDeMercado(indiceBaja, fila), competencia: compDe(fila), bajaDeclarada });
  } else if (bajaDeclarada != null && bajaDeclarada !== "") {
    bmax = bajaMaximaDe(fila, null, { bajaDeclarada });
  }
  const desglose = desglosarProbabilidad(fila, indice, indiceBaja, {
    promedio_departamento: depto ? promediosDepto.get(depto) : null,
    colision_cierres: clave ? (colisiones.get(clave) || 0) : 0,
    meta_competencia: metaComp,
    meta_baja: metaBaja,
    baja_maxima_pct: bmax.valor,
    baja_maxima_origen: bmax.origen,
  });
  const resumen_ejecutivo = generarResumenEjecutivo(desglose, costoPreparacion);

  const cuerpo = {
    ok: true,
    id_proceso: desglose.id_proceso,
    corpus,
    probabilidad_final: desglose.probabilidad_final,
    probabilidad_final_pct: desglose.probabilidad_final_pct,
    // A5/A6: la cifra sin el factor de precio y la banda del 90 % (null sin encogimiento)
    probabilidad_sin_precio: desglose.probabilidad_sin_precio,
    banda_90: desglose.banda_90,
    peso_datos_entidad: desglose.peso_datos_entidad,
    desglose: desglose.pasos,
    // la vista para personas: primero la historia en frases, después la tabla
    explicacion_simple: desglose.explicacion_simple,
    de_donde_salen_los_datos: desglose.de_donde_salen_los_datos,
    // sin base, la marca de la tabla auditable (null con base)
    aviso_supuesto: desglose.aviso_supuesto,
    resumen_ejecutivo,
    justificacion_texto: justificacionTexto(desglose, resumen_ejecutivo),
    // A4: la baja máxima con la que se calculó el paso 4 (apu | declarada | null)
    baja_maxima: { valor: bmax.valor, origen: bmax.origen, borrador: bmax.borrador || null, perfil: perfil || null },
    proceso: {
      id: desglose.id_proceso, objeto: desglose.objeto, entidad: desglose.entidad,
      departamento: desglose.departamento, modalidad: desglose.modalidad,
      cuantia_cop: desglose.cuantia_cop, fecha_cierre: desglose.fecha_cierre,
    },
    contexto: {
      rivales_esperados: desglose.rivales_esperados,
      fuente_del_promedio: desglose.fuente_del_promedio,
      valor_esperado_cop: desglose.valor_esperado_cop,
      // para MOSTRAR, solo con base (null sin ella): la misma cifra del modal y del texto copiado
      contrato_esperado_aprox_cop: desglose.contrato_esperado_aprox_cop,
      // `conBaseDeEntidad`: la suite la ata con `frecuenciaConBase` del navegador
      con_base_de_entidad: desglose.con_base_de_entidad,
      competencia_entidad: desglose.competencia_entidad,
      baja_mercado: desglose.baja_mercado,
      costo_preparacion_cop: costoPreparacion,
    },
    suma_aportes_pp: desglose.suma_aportes_pp,
    como_leerlo: "Cada paso aporta puntos porcentuales a la cifra final y la suma de los seis es exactamente esa cifra. "
      + "Un AJUSTE (pasos 2 a 5) con confianza «Sin dato» aporta 0 pp: el dato no está y no se aproxima. En el paso 1, "
      + "«Sin dato» significa que el promedio de rivales es un supuesto conservador declarado y no una medición.",
    cache: false,
    generado: new Date().toISOString(),
    /* null cuando el índice se leyó (o no está construido); si no, por qué el
       cálculo cae al supuesto: la entidad puede tener datos. Es texto de
       PANTALLA (el modal lo pinta en ámbar arriba): ni el error técnico ni
       nombres de campo; el error viaja aparte, en `lectura_indices`. */
    aviso_competencia: errorLecturaIndice
      ? "No se pudo consultar cuántos compiten en esta entidad: mientras tanto el cálculo usa un supuesto de "
        + `${PROMEDIO_CONSERVADOR} rivales, pero eso no significa que la entidad no tenga datos. Vuelva a abrir este detalle en unos minutos.`
      : null,
    // la frase de la baja que no se pudo leer es la del registro (lib/indice_baja.SIN_LECTURA_BAJA): una sola redacción
    aviso_baja: errorLecturaBaja ? (desglose.baja_mercado && desglose.baja_mercado.mensaje) || null : null,
    lectura_indices: {
      competencia: { leido: !errorLecturaIndice, error: errorLecturaIndice },
      baja: { leido: !errorLecturaBaja, error: errorLecturaBaja },
    },
  };
  if (!errorLecturaIndice && !errorLecturaBaja) await guardarCache(redis, id, { sello, cuerpo });
  return { estado: 200, cuerpo };
}

module.exports = {
  desglosarProbabilidad, generarResumenEjecutivo, justificacionTexto, desgloseDeProceso,
  claveCache, buscarProceso, pAntesDe,
  // 23-sep-2026: la regla de base, la frecuencia, el contrato esperado para mostrar y el formato es-CO
  conBaseDeEntidad, deCadaDe, contratoEsperadoAprox, numCO,
  TTL_CACHE_SEG, LARGO_MAX_ID, PROCESOS_CONFIANZA_ALTA,
  NIVEL_COMPETENCIA, CONFIANZAS: [ALTA, MEDIA, BAJA, SIN_DATO],
};
