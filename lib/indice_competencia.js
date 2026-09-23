/* ============================================================================
   lib/indice_competencia · ¿En qué entidades se presenta menos gente?
   ----------------------------------------------------------------------------
   El puntaje ponderado dice «dónde mirar primero»; este índice dice «dónde es
   más PROBABLE GANAR». Se construye sobre el corpus HISTÓRICO
   (licitaciones:historico:mes:*:chunk:*, que jamás se purga) y responde, por
   entidad: cuántos oferentes se presentan en promedio a sus procesos.

     construirIndice(redis, {presupuestoMs})  → recorre el histórico mes a mes
                                                (REANUDABLE) y publica el hash
                                                indice:competencia
     competenciaDe(indice, licitacion)        → {nivel, promedio_oferentes, …}

   Clasificación en TERTILES sobre el promedio de oferentes:
     "baja"     tercio con MENOS oferentes → MÁS atractiva (más probable ganar)
     "media"    tercio intermedio
     "alta"     tercio con MÁS oferentes  → MENOS atractiva
     "sin_dato" entidad con menos de MIN_PROCESOS procesos útiles, o ausente

   Reglas de honestidad del dato (mismo criterio que `anticipo_pct = 0` en
   lib/negocio: si la fuente no lo dice, no se inventa):

   · Solo cuentan los procesos con evidencia de ADJUDICACIÓN y con un conteo de
     oferentes ≥ 1. Un «0 oferentes» en un proceso adjudicado es un hueco del
     dataset, no una subasta desierta: contarlo como 0 arrastraría el promedio
     de la entidad a cero y TODAS acabarían clasificadas como «baja». Los
     descartes quedan contados en la meta del índice para auditarlo.
   · MIN_PROCESOS = 5: por debajo de eso el promedio es ruido — la entidad se
     marca "sin_dato" y en el orden queda por delante de las de alta
     competencia (no sabemos, pero puede ser oportunidad).

   ── ENCOGIMIENTO (ago 2026 · docs/PROBABILIDAD_MEJORADA.md A2/A3) ─────────
   El mínimo de 5 es correcto PARA PUBLICAR un promedio (la lección de «18,2
   oferentes sin base»), pero como ESTIMADOR de rivales era un acantilado: una
   entidad con 4 procesos y promedio 2 caía al respaldo (5 rivales, p = 0,17) y
   con 5 procesos saltaba a p = 0,43 — ×2,60 por UN proceso más, sin que el
   mercado hubiera cambiado. Ahora cada entidad publica ADEMÁS:
     rivales_estimados  r̂ = w·r̄_e + (1−w)·μ     media posterior gamma-Poisson
     peso_datos         w = n_e / (n_e + m)     cuánto pesan sus propios datos
     rivales_desv       √Var(r̂) = √((n_e·r̄_e + m·μ) / (n_e+m)²)   la banda
   con μ = el PRIOR de la entidad — el promedio de SU departamento encogido a su
   vez hacia el nacional (B7, `estimarPriorDepartamental`), o el nacional si el
   departamento no se conoce — y
   m = max(μ, σ̂²_dentro)/τ̂², donde τ̂² es la varianza ENTRE entidades descontado
   el ruido muestral y σ̂²_dentro la varianza dentro de entidad medida (método de
   los momentos sobre este mismo acumulador; el doc pone μ, que es el caso
   Poisson — con conteos sobredispersos sería asumir menos ruido del que hay). Si τ̂² ≤ 0 la dimensión
   «entidad» no distingue nada: m = ∞, w = 0, todo se encoge a μ y la meta lo
   dice (`encogimiento.entidad_no_distingue`).
   `promedio`, `mediana` y `oferentes_total` SIGUEN en null bajo el mínimo:
   «¿cuál es el promedio medido de esta entidad?» y «¿cuántos rivales espero?»
   son dos preguntas distintas y el badge solo responde la primera. Un hash
   escrito por la versión anterior no trae estos campos y `competenciaDe`
   responde EXACTAMENTE como antes: desplegar no exige reconstruir.
   `por_anio` (procesos y oferentes por año de adjudicación) se acumula para
   poder VER si el promedio de dos años mezcla un período atípico (la ley de
   garantías 2026, B2 del mismo doc): todavía no segmenta, solo se publica.

   Nombres de columna: VERIFICADOS contra `p6dx-8zbt` en ago 2026 (el «este
   entorno no alcanza datos.gov.co» era una observación CON FECHA, no una
   propiedad del entorno: se volvió a llamar y respondió 200). Se siguen leyendo
   por LISTA DE CANDIDATAS en orden de preferencia y no por un nombre único: si
   la fuente cambia, basta añadirlo aquí y reconstruir el índice
   (GET /api/sync/historico?reconstruir_indice=true) — sin re-extraer nada.
   ========================================================================== */
"use strict";

const {
  CLAVES, leerChunksDedup, leerJSON, escribirJSON,
  leerJSONComprimido, comprimir,
} = require("./almacen.js");
/* `norm` se toma de lib/semantica (su casa desde jul 2026) y NO de lib/filtros,
   que la re-exporta: filtros ya depende de lib/equivalencias y esta de aquí —
   importarla de filtros cerraría un ciclo de requires y dejaría este módulo
   con un `norm` sin definir en tiempo de carga. */
const { norm, nucleoEstado, FASE_TRAS_MANIFESTACION_RE } = require("./semantica.js");
const { relojDeTanda } = require("./presupuesto.js");
/* La mediana es la de `lib/estadistica`, no una copia: las tres medianas de
   cocientes por entidad de este módulo tomaban `cocientes[Math.floor(n/2)]`,
   que en conjuntos PARES devuelve el elemento SUPERIOR en vez de promediar el
   par (con [1; 2] publicaba 2 donde la mediana vale 1,5), y dos de ellas
   llegaban envueltas en `redondear2(...)` AL CALCULAR. Se importa con otro
   nombre porque `medirColision` ya usa `mediana` como variable local. */
const { mediana: medianaDe } = require("./estadistica.js");

const MIN_PROCESOS = 5;          // menos de 5 procesos útiles → "sin_dato"
const CAMPOS_POR_HSET = 200;     // campos por comando HSET (payload acotado)
const MAX_OFERENTES = 500;       // cota de cordura: valores mayores son basura

/* ---------- columnas del dataset (VERIFICADAS contra p6dx-8zbt, ago 2026) ----------
   Evidencia y trampas medidas en docs/APU_FUENTES.md: en la MISMA fila
   `conteo_de_respuestas_a_ofertas` vale 0 mientras `respuestas_al_procedimiento`
   vale 3 (por eso el ORDEN de las candidatas decide), y
   `nit_del_proveedor_adjudicado` puede llegar como la cadena «No Definido».
   Se conserva la lista de candidatas por si la fuente vuelve a cambiar.
   Nº de oferentes, de la más específica a la más genérica. `numero_de_ofertas`
   y `numero_proponentes` son las pedidas en el encargo; `proveedores_unicos_con`
   y `conteo_de_respuestas_a_ofertas` son las que p6dx-8zbt trae hoy (ya estaban
   en la proyección y en lib/negocio.COMPETENCIA_CAMPOS). */
const OFERENTES_CAMPOS = [
  "numero_de_ofertas", "numero_proponentes", "numero_de_proponentes", "numero_ofertas",
  "proveedores_unicos_con", "conteo_de_respuestas_a_ofertas",
  "respuestas_al_procedimiento", "respuestas_externas", "proponentes",
];

/* Datos de adjudicación. NO se guardan en el corpus activo (solo en el
   histórico) ni se exponen en /api/oportunidades: allí solo viaja el resumen
   agregado por entidad. */
const CAMPOS_ADJUDICATARIO = [
  "nombre_del_proveedor", "adjudicatario_nombre", "proveedor_adjudicado", "nombre_del_adjudicador",
];
const CAMPOS_ADJUDICATARIO_NIT = [
  "nit_del_proveedor_adjudicado", "adjudicatario_nit", "documento_proveedor", "codigoproveedor",
];
const CAMPOS_VALOR_ADJUDICADO = [
  "valor_total_adjudicacion", "valor_adjudicado", "valor_adjudicacion",
];
const CAMPOS_FECHA_ADJUDICACION = ["fecha_adjudicacion", "fecha_de_adjudicacion"];

/* Todo lo que la proyección histórica debe conservar (lib/proyeccion.js). */
const CAMPOS_ADJUDICACION = [...new Set([
  ...CAMPOS_ADJUDICATARIO, ...CAMPOS_ADJUDICATARIO_NIT,
  ...CAMPOS_VALOR_ADJUDICADO, ...CAMPOS_FECHA_ADJUDICACION,
  ...OFERENTES_CAMPOS,
  "id_adjudicacion", "departamento_proveedor", "ciudad_proveedor",
  "proveedores_invitados", "proveedores_que_manifestaron", "numero_de_lotes",
])];

/* Estados que evidencian que el proceso YA tuvo ganador (normalizados). */
const ESTADOS_ADJUDICADOS = [
  "adjudicado", "celebrado", "en ejecucion", "ejecucion", "terminado",
  "liquidado", "adjudicacion",
].map(norm);

/* ---------- lectura tolerante ---------- */
function numero(v) {
  if (v == null || v === "") return null;
  const n = parseFloat(String(v).replace(/[^\d.,-]/g, "").replace(/\.(?=\d{3}\b)/g, "").replace(",", "."));
  return isNaN(n) ? null : n;
}
const primero = (lic, campos) => {
  for (const c of campos) {
    const v = lic[c];
    if (v != null && String(v).trim() !== "") return v;
  }
  return null;
};

/* EL VALOR ADJUDICADO DE UNA FILA, con la regla ÚNICA del módulo: `numero(primero(…))` y un 0 (o
   menos) es «sin dato», jamás un contrato de $0 (la regla de anticipo_pct). La usan la puerta de
   «hubo ganador» (`adjudicacionAfirmada`) y la suma de «quién gana aquí» y del perfil del
   competidor. Hasta el 23-sep-2026 esas dos sumas leían con `parseFloat` candidata por candidata,
   que diverge de esta regla en cuanto el dataset trae separadores de miles («1.598.000» sumaba 8) o
   un 0 delante de otra columna: medido con detalleEntidad real (scratchpad del diagnóstico
   «modal-entidad»). Una cifra de dinero con dos lectores ya es dos cifras. */
function valorAdjudicadoDe(lic) {
  const v = numero(primero(lic, CAMPOS_VALOR_ADJUDICADO));
  return v != null && v > 0 ? v : null;
}

/* La fecha de adjudicación de una fila (YYYY-MM-DD) o null. Vivía en lib/competencia_detalle y bajó
   aquí el 23-sep-2026 porque «quién gana aquí» se ACUMULA también al construir el índice: el
   detalle la importa, no la copia. Se toma el texto tal cual (sus 10 primeros caracteres): pasar
   «YYYY-MM-DD» por `new Date` lo leería como UTC y lo pintaría un día antes en hora Colombia. */
function primeraFecha(lic) {
  for (const c of CAMPOS_FECHA_ADJUDICACION) {
    const v = lic[c];
    if (v && !isNaN(Date.parse(v))) return String(v).slice(0, 10);
  }
  return null;
}

/* Nº de oferentes del proceso, o null si la fuente no lo dice. El 0 es «sin
   dato» a propósito (ver cabecera), nunca «nadie se presentó». */
function oferentesDe(lic) {
  for (const c of OFERENTES_CAMPOS) {
    const n = numero(lic[c]);
    if (n != null && n >= 1 && n <= MAX_OFERENTES) return Math.round(n);
  }
  const propio = numero(lic.oferentes); // derivado guardado por la proyección histórica
  return propio != null && propio >= 1 && propio <= MAX_OFERENTES ? Math.round(propio) : null;
}

/* ¿El proceso llegó a tener ganador? Señales, de la más dura a la más blanda. */
/* «No Definido» NO es un adjudicatario (ago 2026, defecto real): p6dx-8zbt rellena
   `nombre_del_proveedor` y `nit_del_proveedor_adjudicado` con esa cadena en los
   procesos SIN ganador, y `primero()` la tomaba por un nombre → 79 k procesos
   desde 2024 con adjudicado=No entraban al índice como adjudicados (40 k en
   Evaluación, 17 k Cancelados, 8 k Abiertos/Publicados — uno de ellos una «lista
   multiusos» abierta hasta 2027 con 34 respuestas). Los rellenos se descartan
   ANTES de mirar si hay valor. `claveAdjudicatario` (equivalencias) ya lo hacía
   para el NIT; aquí faltaba en la puerta. */
const RELLENOS_SIN_VALOR = new Set(["no definido", "no aplica", "n/a", "na", "sin definir", "-", "0"]);
const conValorReal = (lic, campos) => {
  const v = primero(lic, campos);
  return v != null && !RELLENOS_SIN_VALOR.has(norm(v)) ? v : null;
};
/* La parte DURA de «hubo ganador»: el dataset AFIRMA la adjudicación —lo dice
   `adjudicado`, o nombra a un ganador real, o publica un valor adjudicado—.
   Se separó del resto (remate B9b-H3, 6-sep-2026) porque una simple FECHA de
   adjudicación no afirma nada de eso: un proceso declarado desierto también
   trae la fecha en que se declaró, y con ella bastaba para contarlo como
   adjudicado. Ver `desenlaceDe`. */
function adjudicacionAfirmada(lic) {
  if (norm(lic.adjudicado) === "si") return true;
  if (conValorReal(lic, CAMPOS_ADJUDICATARIO) || conValorReal(lic, CAMPOS_ADJUDICATARIO_NIT)) return true;
  return valorAdjudicadoDe(lic) != null;
}
function esAdjudicado(lic) {
  if (adjudicacionAfirmada(lic)) return true;
  if (primero(lic, CAMPOS_FECHA_ADJUDICACION)) return true;
  for (const v of [lic.estado_del_procedimiento, lic.fase]) {
    const n = norm(v);
    if (n && ESTADOS_ADJUDICADOS.some((e) => n === e || n.startsWith(e))) return true;
  }
  return false;
}

/* ¿El proceso se declaró DESIERTO? Es el otro desenlace con nombre de un
   proceso cerrado (el primero es «adjudicado»): cancelado, revocado o anulado
   no son ninguno de los dos y no entran en la base de desiertos. Se mira el
   estado y, de respaldo, la fase — el dataset lo escribe «Desierto» o
   «Declarado desierto» (M-DGF-08, 6-sep-2026). */
function esDesierto(lic) {
  for (const v of [lic.estado_del_procedimiento, lic.fase]) {
    const n = norm(v);
    if (n && n.includes("desierto")) return true;
  }
  return false;
}

/* EL DESENLACE DE UN PROCESO CERRADO, DECIDIDO POR EL HECHO PUBLICADO
   (remate B9b-H3, 6-sep-2026 · un defecto reproducido). Hasta hoy el orden era
   `esAdjudicado(lic) ? "adjudicado" : esDesierto(lic) ? "desierto" : null`, y
   `esAdjudicado` se contenta con una FECHA de adjudicación: un proceso cuyo
   estado Y fase dicen «Desierto», sin ganador y sin valor, pero con la fecha
   en que se declaró desierto, entraba en la base de ADJUDICADOS y su «plazo»
   —del cierre a la declaratoria— engordaba la mediana. Medido: 6 adjudicados +
   2 desiertos (uno con fecha) → el hash publicaba 7 adjudicados y 1 desierto, y
   el modal decía «Declaró desierto 1 de sus 8»; con un solo desierto habría
   dicho «No declaró desierto ninguno», creíble y falso.

   Regla, en el orden en que manda la evidencia (regla dura: un dato PUBLICADO
   gana a uno CALCULADO):
   1. Estado o fase dicen «desierto» y NADA afirma la adjudicación → DESIERTO.
      El estado publicado gana a una fecha, que por sí sola no afirma ganador.
   2. Estado o fase dicen «desierto» pero el dataset AFIRMA la adjudicación
      (adjudicado=Si, ganador real o valor > 0) → CONTRADICCIÓN: no entra en
      NINGUNA base. Ante la duda no se inventa un desenlace; se cuenta en la
      meta (`desierto_con_adjudicacion`) para poder medir cuántos son en
      producción tras desplegar. Pasa de verdad en procesos por lotes, donde un
      lote se declara desierto y otro se adjudica.
   3. Sin señal de desierto, la regla de siempre.
   Nadie más decide esto: `acumular`, el censo (lib/columnas_historicas) y el
   marcado del histórico (lib/proyeccion) LLAMAN a esta función. */
function desenlaceDe(lic) {
  if (esDesierto(lic)) return adjudicacionAfirmada(lic) ? "desierto_con_adjudicacion" : "desierto";
  return esAdjudicado(lic) ? "adjudicado" : null;
}

/* ¿El CONTEO de oferentes es FINAL? Es lo que necesita el índice de competencia
   (cuántos se presentan), que no es lo mismo que «hubo ganador»: un proceso en
   Evaluación o Seleccionado ya cerró la recepción de ofertas y su conteo vale
   —y hasta ago 2026 entraba, pero por la trampa de «No Definido», no por
   regla—. Uno Publicado/Abierto/Suspendido con respuestas no: sigue recibiendo.
   Cancelado tampoco: no se sabe si cerró la recepción. Regla EXPLÍCITA:
   adjudicado, o estado Evaluación/Seleccionado, o fase posterior al cierre.
   «Adjudicado» aquí es el DESENLACE (remate B9b-H3, 6-sep-2026), no
   `esAdjudicado` a secas: un declarado desierto que traiga la fecha en que se
   declaró no aporta un conteo de competencia, y con el predicado suelto sí
   entraba —y engordaba `total_procesos_adjudicados` del detalle de la entidad,
   que es una cifra de pantalla—. Un desierto SIN esa fecha ya quedaba fuera:
   esto solo cierra la puerta por la que se colaba su gemelo. */
const ESTADOS_OFERTAS_CERRADAS = ["evaluacion", "seleccionado"].map(norm);
const FASES_OFERTAS_CERRADAS = ["evaluacion", "adjudicacion", "contratacion", "ejecucion"].map(norm);
function cuentaParaCompetencia(lic) {
  if (desenlaceDe(lic) === "adjudicado") return true;
  /* «Evaluación» con la fase ANTERIOR a la manifestación no es el conteo final de ofertas: es la
     entidad respondiendo observaciones (22-sep-2026, la misma regla de la ingesta; require diferido
     porque lib/filtros no puede requerirse desde aquí en carga). Antes engordaba
     `total_procesos_adjudicados` del detalle de la entidad con procesos que no han abierto. */
  if (require("./filtros.js").evaluacionDeFaseAnterior(lic.estado_del_procedimiento, lic.fase)) return false;
  const e = norm(lic.estado_del_procedimiento);
  if (e && ESTADOS_OFERTAS_CERRADAS.some((x) => e === x || e.startsWith(x))) return true;
  const f = norm(lic.fase);
  if (f && FASES_OFERTAS_CERRADAS.some((x) => f === x || f.startsWith(x))) return true;
  /* EL PROCESO PUBLICADO COMO «CERRADO» EN LA FASE DE OFERTAS (22-sep-2026, medición del dueño sobre
     1.948 menores cuantías): `estado_de_apertura_del_proceso` vale «Cerrado» en las 387 filas
     «Presentación de oferta / Abierto» y NUNCA convive con una recepción de ofertas futura (0 filas
     con `fecha_de_recepcion_de` ≥ mañana), así que «Abierto» en esa fase es «ofertas ya abiertas» y
     el conteo de respuestas es FINAL; 387 conteos que este índice dejaba fuera por leer «Abierto»
     como «sigue recibiendo». No se cablea el literal «Abierto» (una licitación no está medida):
     se cablea la columna publicada, que es la que consta. «Publicado» con el proceso «Abierto»
     (134) sigue fuera: puede estar recibiendo. Cancelado, suspendido y desierto siguen fuera. */
  const apertura = norm(lic.estado_de_apertura_del_proceso);
  if (apertura === "cerrado" && FASE_TRAS_MANIFESTACION_RE.test(nucleoEstado(f)) && /^(?:publicado|abierto|activo)\b/.test(nucleoEstado(e))) return true;
  return false;
}

/* ---------- identidad de la entidad: UNA sola definición ----------
   `claveCanonica` es la ÚNICA forma de decir «estas dos filas son la misma
   entidad» en todo el proyecto: `norm` (sin acentos, minúsculas, espacios
   colapsados) MÁS el descarte de la puntuación.

   Por qué la puntuación (ago 2026, defecto real): el mismo organismo aparece en
   el dataset como «… RIOS NEGRO - NARE» y «… RIOS NEGRO NARE». Con `norm` a
   secas son DOS entidades: el índice les partía el historial en dos registros
   de 2 y 3 procesos —ninguno llegaba al mínimo— mientras
   /api/competencia-detalle, que sí quitaba la puntuación, los contaba juntos y
   veía 5. El badge decía ⚪ y el detalle enseñaba un promedio de 5 procesos, y
   los dos tenían razón según su propia definición de «entidad». El problema no
   era el cálculo: eran dos identidades distintas para la misma cosa.

   `claveLegado` es la clave ANTERIOR (`norm` sin más). Se conserva SOLO para
   leer: `indice:competencia` no se purga nunca, así que el hash que hay hoy en
   producción está escrito con ella y tiene que seguir resolviéndose hasta que
   alguien reconstruya el índice. No se escribe jamás. */
const claveCanonica = (s) => norm(s).replace(/[^a-z0-9ñ ]+/g, " ").replace(/\s+/g, " ").trim();

/* Clave de entidad: el nombre canónico manda (siempre viene) y el NIT entra
   como alias, para que un cambio de razón social no parta el historial. */
function claveEntidad(lic) {
  const nit = String(lic.nit_entidad || "").replace(/\D/g, "");
  const canonica = claveCanonica(lic.entidad);
  const legado = norm(lic.entidad);
  return {
    clave: canonica || (nit ? `nit:${nit}` : ""),
    claveLegado: legado || (nit ? `nit:${nit}` : ""),
    aliasNit: nit ? `nit:${nit}` : null,
    nombre: String(lic.entidad || "").trim() || (nit ? `NIT ${nit}` : "Entidad no informada"),
    nit: nit || null,
  };
}

/* ---------- tertiles ---------- */
/* Cortes en los promedios ORDENADOS. Se comparan con `<=` para que entidades
   con el mismo promedio caigan siempre en el mismo nivel. */
function cortesTertiles(promediosOrdenados) {
  const n = promediosOrdenados.length;
  if (!n) return null;
  const min = promediosOrdenados[0], max = promediosOrdenados[n - 1];
  if (min === max) return { c1: null, c2: null, degenerado: true }; // sin poder discriminante
  const idx = (frac) => Math.min(n - 1, Math.max(0, Math.ceil(n * frac) - 1));
  return { c1: promediosOrdenados[idx(1 / 3)], c2: promediosOrdenados[idx(2 / 3)], degenerado: false };
}
function nivelPorCortes(promedio, cortes) {
  if (!cortes || cortes.degenerado) return "media"; // todas iguales: ninguna destaca
  if (promedio <= cortes.c1) return "baja";
  if (promedio <= cortes.c2) return "media";
  return "alta";
}

/* Mediana a partir del histograma {oferentes: veces} (sin guardar la muestra). */
function medianaHistograma(histograma, n) {
  if (!n) return null;
  const valores = Object.keys(histograma).map(Number).sort((a, b) => a - b);
  const i1 = Math.floor((n - 1) / 2), i2 = Math.ceil((n - 1) / 2);
  let acumulado = 0, lo = null, hi = null;
  for (const v of valores) {
    acumulado += histograma[v];
    if (lo === null && i1 < acumulado) lo = v;
    if (hi === null && i2 < acumulado) { hi = v; break; }
  }
  return lo == null || hi == null ? null : (lo + hi) / 2;
}

/* Percentil sobre un histograma {valorEntero: nVeces}. Genérico —admite
   cubetas negativas y sirve para p25/p75 además de la mediana— y con UNA sola
   copia: nació en lib/indice_baja (la baja se guarda en puntos porcentuales
   enteros) y desde el 6-sep-2026 vive aquí, que es el módulo de abajo, porque
   el plazo de adjudicación en días hábiles se guarda con la misma forma y
   necesita el mismo p75. lib/indice_baja lo importa y lo re-exporta. */
function percentilHistograma(hist, total, p) {
  if (!total) return null;
  const cubetas = Object.keys(hist).map(Number).filter(Number.isFinite).sort((a, b) => a - b);
  if (!cubetas.length) return null;
  const objetivo = p * total;
  let acum = 0;
  for (const k of cubetas) {
    acum += hist[k];
    if (acum >= objetivo) return k;
  }
  return cubetas[cubetas.length - 1];
}

const redondear = (n) => Math.round(n * 10) / 10;

/* ---------- qué se PUBLICA por entidad ----------
   Una entidad por debajo de MIN_PROCESOS no se clasifica… pero hasta ago 2026
   SÍ se publicaba su `promedio`. El registro quedaba
   `{procesos: 3, promedio: 18.2, nivel: "sin_dato"}` y cualquier consumidor que
   pintara el promedio sin mirar el nivel enseñaba una cifra sin ninguna base
   («18.2 oferentes en 0 procesos» en producción). El promedio de 3 procesos no
   es un promedio: es ruido con dos decimales.

   Regla: por debajo del mínimo NO SE PUBLICA NINGUNA CIFRA DERIVADA (ni
   promedio, ni mediana, ni el total de oferentes con el que se podría
   recalcular). Solo el conteo —que es un hecho, y es lo que explica el ⚪— y el
   nivel "sin_dato".

   `procesos_contados` viaja como ALIAS de `procesos`: es el nombre con el que
   se pide el dato desde fuera, y tenerlo escrito evita que un consumidor lea
   `undefined` y lo interprete como cero. El lector acepta los dos nombres. */
function registroPublicado(e, encogimiento = null) {
  const comun = {
    nombre: e.nombre, nit: e.nit,
    procesos: e.procesos, procesos_contados: e.procesos,
    min_procesos: MIN_PROCESOS,
  };
  /* Los campos de ENCOGIMIENTO se publican para TODAS las entidades, también
     bajo el mínimo: son el estimador de rivales (otro objeto que el promedio,
     ver cabecera), no la cifra medida. Solo cuando se pudo estimar `m`. */
  const enc = encogerEntidad(e, encogimiento);
  const extra = enc ? { ...enc } : {};
  /* `por_anio` se publica con la MISMA regla de base que el promedio de la
     entidad: el conteo siempre (es un hecho) y el promedio solo con
     MIN_PROCESOS en ESE año. Publicar `{n, suma}` crudas devolvía por la puerta
     de al lado justo la cifra que la cerradura de arriba anula —55/3 = 18,3
     oferentes «sin base»—, que es el defecto «18.2 oferentes» otra vez. */
  if (e.por_anio && typeof e.por_anio === "object") {
    extra.por_anio = Object.fromEntries(Object.entries(e.por_anio).map(([anio, a]) => [anio, {
      n: a.n,
      promedio: a.n >= MIN_PROCESOS ? Math.round((a.suma / a.n) * 100) / 100 : null,
    }]));
  }
  /* La PRÓRROGA por entidad (M-DGF-06, 6-sep-2026): SOLO los CONTEOS del
     acumulador `{prorrogados: [n, Σof], no_prorrogados: [n, Σof]}` —lo que la
     pantalla enseña como «movió la fecha de cierre en 3 de 8»—; las sumas de
     oferentes quedan para la calibración del ×1,20 (`medirProrroga`, meta).
     Es un hecho, así que se publica también bajo el mínimo; sin acumulador
     (sin señal: el backfill no la trae, el delta la estampa desde el
     16-ago-2026) va null, jamás {0, 0}. Hasta hoy el par solo vivía en la
     lista en memoria de `construirIndice` y ningún consumidor podía leerlo. */
  extra.prorroga = e.prorroga && Array.isArray(e.prorroga.prorrogados) && Array.isArray(e.prorroga.no_prorrogados)
    ? { prorrogados: e.prorroga.prorrogados[0], no_prorrogados: e.prorroga.no_prorrogados[0] }
    : null;
  /* CUÁNTO TARDA EN ADJUDICAR y CUÁNTOS DECLARA DESIERTOS (M-DGF-08,
     6-sep-2026): los hechos de CIERRE de la entidad, que no dependen del
     conteo de oferentes. Los CONTEOS se publican siempre (son hechos, como la
     prórroga); la mediana y el p75 del plazo y el porcentaje de desiertos solo
     con la base mínima —la misma regla que el promedio de oferentes—. Sin
     acumulador (hash anterior o entidad sin proceso cerrado con desenlace) va
     null, jamás {0, 0}. */
  extra.plazo_adjudicacion = plazoPublicado(e.hechos);
  extra.desiertos = desiertosPublicados(e.hechos);
  if (e.procesos < MIN_PROCESOS) {
    return { ...comun, oferentes_total: null, promedio: null, mediana: null, nivel: "sin_dato", ...extra };
  }
  return { ...comun, oferentes_total: e.oferentes_total, promedio: e.promedio, mediana: e.mediana, nivel: e.nivel, ...extra };
}

/* ---------- hechos de cierre: plazo de adjudicación y desiertos ----------
   Acumulador por entidad `{adjudicados, desiertos, plazo: {n, hist}}`, con el
   plazo en DÍAS HÁBILES (lib/habiles: se llama, no se reescribe) entre el día
   de cierre y el de adjudicación, guardado como histograma para que quepa en
   el progreso reanudable igual que el de oferentes. Un proceso sin alguna de
   las dos fechas NO entra ni como 0: se cuenta en la meta. Una adjudicación el
   mismo día del cierre o antes tampoco es un plazo —es un dato fuera de orden—
   y se cuenta aparte (`no_posterior_al_cierre`). */
function plazoAdjudicacionDe(lic) {
  const { fechaOperable, habilesEntre } = require("./habiles.js");
  const cierre = diaCierreDe(lic);
  const cruda = fechaOperable(primero(lic, CAMPOS_FECHA_ADJUDICACION));
  const adj = cruda ? String(cruda).slice(0, 10) : null;
  const adjLegible = adj && /^\d{4}-\d{2}-\d{2}$/.test(adj) ? adj : null;
  if (!cierre && !adjLegible) return { dias: null, motivo: "sin_ninguna_fecha" };
  if (!cierre) return { dias: null, motivo: "sin_fecha_cierre" };
  if (!adjLegible) return { dias: null, motivo: "sin_fecha_adjudicacion" };
  if (adjLegible <= cierre) return { dias: null, motivo: "no_posterior_al_cierre" };
  return { dias: habilesEntre(cierre, adjLegible), motivo: null };
}

function acumularHechos(e, stats, lic, desenlace) {
  const h = e.hechos || (e.hechos = { adjudicados: 0, desiertos: 0, plazo: { n: 0, hist: {} } });
  const s = stats.hechos || (stats.hechos = {
    adjudicados: 0, desiertos: 0, con_ambas_fechas: 0,
    sin_fecha_cierre: 0, sin_fecha_adjudicacion: 0, sin_ninguna_fecha: 0, no_posterior_al_cierre: 0,
    desierto_con_adjudicacion: 0,
  });
  /* el desenlace contradictorio (desierto + adjudicación afirmada) NO entra en
     ninguna base de la entidad: solo se cuenta, para poder medirlo */
  if (desenlace === "desierto_con_adjudicacion") { s.desierto_con_adjudicacion++; return; }
  if (desenlace === "desierto") { h.desiertos++; s.desiertos++; return; }
  h.adjudicados++; s.adjudicados++;
  const p = plazoAdjudicacionDe(lic);
  if (p.dias == null) { s[p.motivo] = (s[p.motivo] || 0) + 1; return; }
  s.con_ambas_fechas++;
  h.plazo.n++;
  h.plazo.hist[p.dias] = (h.plazo.hist[p.dias] || 0) + 1;
}

/* Acumulador → lo que se publica. `base` = procesos con las dos fechas y
   `adjudicados` = sobre cuántos se buscó: la frase de la pantalla dice «de A
   adjudicados, B traen las dos fechas». Bajo el mínimo, cifras derivadas null. */
function plazoPublicado(h) {
  if (!h || !h.plazo) return null;
  const n = h.plazo.n || 0;
  const base = { base: n, adjudicados: h.adjudicados || 0, min_procesos: MIN_PROCESOS };
  if (n < MIN_PROCESOS) return { ...base, mediana_dias_habiles: null, p75_dias_habiles: null };
  return {
    ...base,
    mediana_dias_habiles: percentilHistograma(h.plazo.hist, n, 0.5),
    p75_dias_habiles: percentilHistograma(h.plazo.hist, n, 0.75),
  };
}
function desiertosPublicados(h) {
  if (!h) return null;
  const n = h.desiertos || 0, adj = h.adjudicados || 0, base = n + adj;
  return { n, adjudicados: adj, base, min_procesos: MIN_PROCESOS, pct: base >= MIN_PROCESOS ? Math.round((n / base) * 100) : null };
}

/* Los hechos de cierre TAL COMO los publica el hash, validados con `maquina`
   (Number estricto: la ausencia se descarta ANTES de convertir). Un hash
   anterior al campo, o un registro sin acumulador, da null en los dos. Es el
   lector ÚNICO: lo usan `hechosDeEntidad` (calendario) y el detalle de la
   entidad (espejo), así que no hay un segundo predicado que pueda divergir. */
function hechosDeRegistro(m) {
  const out = { plazo_adjudicacion: null, desiertos: null };
  if (!m || typeof m !== "object") return out;
  const p = m.plazo_adjudicacion;
  if (p && typeof p === "object" && maquina(p.base) != null) {
    const base = Math.max(0, Math.trunc(maquina(p.base)));
    const med = maquina(p.mediana_dias_habiles), p75 = maquina(p.p75_dias_habiles);
    out.plazo_adjudicacion = {
      base, adjudicados: Math.max(0, Math.trunc(maquina(p.adjudicados) || 0)), min_procesos: MIN_PROCESOS,
      // la guarda del lector, no solo la del escritor: `indice:competencia` no se purga nunca
      mediana_dias_habiles: base >= MIN_PROCESOS && med != null && med >= 0 ? med : null,
      p75_dias_habiles: base >= MIN_PROCESOS && p75 != null && p75 >= 0 ? p75 : null,
    };
  }
  const d = m.desiertos;
  if (d && typeof d === "object" && maquina(d.n) != null && maquina(d.adjudicados) != null) {
    const n = Math.max(0, Math.trunc(maquina(d.n))), adj = Math.max(0, Math.trunc(maquina(d.adjudicados)));
    const base = n + adj;
    out.desiertos = { n, adjudicados: adj, base, min_procesos: MIN_PROCESOS, pct: base >= MIN_PROCESOS ? Math.round((n / base) * 100) : null };
  }
  return out;
}

/* ---------- acumulación ---------- */
/* El registro de la entidad en el acumulador, creado al primer proceso que lo
   necesite. `procesos` cuenta SOLO los que tienen conteo final de oferentes
   (lo de siempre); los hechos de cierre viven aparte en `hechos`, así que una
   entidad puede existir con `procesos: 0` si solo tiene desiertos o
   adjudicados sin conteo de oferentes — publica sus hechos y sigue en
   «sin_dato» para la competencia. */
function registroAcumulado(acc, lic) {
  const { clave, nombre, nit } = claveEntidad(lic);
  if (!clave) return null;
  const e = acc[clave] || (acc[clave] = { nombre, nit, procesos: 0, suma: 0, histograma: {} });
  if (!e.nit && nit) e.nit = nit;
  // departamento de la entidad (B7: prior por departamento). Se queda el
  // primero visto no vacío; una entidad no cambia de departamento.
  if (!e.depto) { const d = String(lic.departamento_entidad || "").trim().toUpperCase(); if (d) e.depto = d; }
  return e;
}

function acumular(acc, stats, lic, quienGana = null) {
  stats.filas++;
  /* HECHOS DE CIERRE (M-DGF-08), ANTES del descarte por oferentes: cuánto tardó
     en adjudicar y si declaró desierto no dependen de que el dataset diga
     cuántos se presentaron. El ORDEN lo decide `desenlaceDe` —el estado
     publicado gana a una fecha suelta (remate B9b-H3)—; un cerrado sin ninguno
     de los dos desenlaces no entra en ninguna base. */
  const desenlace = desenlaceDe(lic);
  if (desenlace) {
    const eh = registroAcumulado(acc, lic);
    if (eh) acumularHechos(eh, stats, lic, desenlace);
  }
  const cuenta = cuentaParaCompetencia(lic);
  /* QUIÉN GANA (23-sep-2026), también ANTES del descarte por oferentes: un
     ganador es un hecho aunque el dataset calle cuántos compitieron —la misma
     regla del detalle de la entidad—. Va en un acumulador APARTE (`quienGana`,
     no `acc`) para no tocar las entidades publicadas del índice ni su hash. */
  if (quienGana) acumularQuienGana(quienGana, lic, cuenta);
  // `sin_adjudicacion` conserva el nombre por compatibilidad: significa «sin
  // conteo final de oferentes» (ni adjudicado ni ofertas cerradas)
  if (!cuenta) { stats.sin_adjudicacion++; return; }
  const oferentes = oferentesDe(lic);
  if (oferentes == null) { stats.sin_oferentes++; return; }
  const e = registroAcumulado(acc, lic);
  if (!e) { stats.sin_entidad = (stats.sin_entidad || 0) + 1; return; }
  e.procesos++;
  e.suma += oferentes;
  e.histograma[oferentes] = (e.histograma[oferentes] || 0) + 1;
  // Σx² para la varianza DENTRO de la entidad (el ruido muestral que hay que
  // descontar al estimar τ²) y el reparto por AÑO. Un progreso guardado por la
  // versión anterior no trae estos campos: se crean al vuelo.
  e.suma2 = (e.suma2 || 0) + oferentes * oferentes;
  const anio = anioDe(lic);
  if (!e.por_anio) e.por_anio = {};
  const a = e.por_anio[anio] || (e.por_anio[anio] = { n: 0, suma: 0 });
  a.n++; a.suma += oferentes;
  /* Día de CIERRE (A7 · docs/PROBABILIDAD_MEJORADA.md §9.3): para medir si los
     procesos que una entidad cierra el MISMO día reciben menos ofertas. Se
     guarda [n, suma] por día — compacto, y es lo único que la medición
     necesita. Sin fecha de cierre legible, no entra en la medición (se cuenta). */
  /* B3: prórroga del cierre, si el delta la estampó al cerrar el proceso
     (`cierre_prorrogado` true/false; ausente = no se sabe, no entra). Con esto
     el ×1,20 se podrá medir cuando haya acumulación. */
  if (lic.cierre_prorrogado === true || lic.cierre_prorrogado === false) {
    const k = lic.cierre_prorrogado ? "prorrogados" : "no_prorrogados";
    if (!e.prorroga) e.prorroga = { prorrogados: [0, 0], no_prorrogados: [0, 0] };
    e.prorroga[k][0]++; e.prorroga[k][1] += oferentes;
  } else {
    stats.sin_senal_prorroga = (stats.sin_senal_prorroga || 0) + 1;
  }
  const dia = diaCierreDe(lic);
  if (dia) {
    if (!e.dias) e.dias = {};
    const d = e.dias[dia] || (e.dias[dia] = [0, 0]);
    d[0]++; d[1] += oferentes;
  } else {
    stats.sin_dia_cierre = (stats.sin_dia_cierre || 0) + 1;
  }
  stats.contados++;
}

/* Día (YYYY-MM-DD) del cierre, con la MISMA `fechaCierre` de lib/negocio que usa
   la app para todo lo demás — require DIFERIDO: negocio → filtros → equivalencias
   → este módulo cerraría un ciclo en tiempo de carga (la misma técnica que
   `cierre_vencido` en lib/filtros). Misma clave de día que `claveColision` en
   lib/probabilidad (los 10 primeros caracteres tal como vienen). */
function diaCierreDe(lic) {
  const { fechaCierre } = require("./negocio.js");
  const f = fechaCierre(lic);
  if (!f) return null;
  const d = String(f).slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : null;
}

/* ═════════════ QUIÉN GANA: UN CÁLCULO, DOS LECTORES (23-sep-2026) ═════════════
   «Quién gana aquí» (cuántos contratos ganó cada proponente en la entidad, por
   qué valor y cuándo fue el último) y el perfil del competidor («dónde más
   gana, cuántas veces, por cuánto») se calculaban SOLO recorriendo el histórico
   entero en cada clic. Con el corpus de producción ese recorrido dejó de caber
   en el tiempo de la función y el bloque desaparecía, mudo, en TODAS las
   entidades a la vez (diagnóstico «modal-entidad»: parcial a los 36 s con 10 015
   trozos, y 82 s el perfil, que no tenía techo, contra un corte de 60).
   Ahora las dos cosas se ACUMULAN en la misma pasada de `construirIndice` y se
   PUBLICAN en dos hashes aparte; el recorrido del clic queda de respaldo. Las
   funciones de aquí abajo son las ÚNICAS que cuentan: las llaman el índice al
   construirse y el detalle al recorrer (lib/competencia_detalle), así que el
   dato publicado y el recorrido no pueden divergir —la suite los cuadra en
   todas las entidades de un corpus—.

   Las dos bases NO son la misma, y es a propósito (cada una es la que ya
   usaba su pantalla):
   · por ENTIDAD, `cuentaParaCompetencia` —la base del detalle de la entidad,
     que además reparte `procesos_con_ganador` y `sin_adjudicatario`—;
   · por ADJUDICATARIO, `esAdjudicado` —«quién GANÓ, no cuántos se
     presentaron», la base del perfil del competidor—, agrupando por el
     nombre de entidad TAL COMO viene, que es lo que el perfil enseña.
   Identidad del ganador: `claveAdjudicatario` de lib/equivalencias, con
   require DIFERIDO: equivalencias requiere este módulo al cargar, y el require
   en carga cerraría el ciclo (medido: `undefined` en un orden de carga y
   TypeError en el otro).
   Y nada depende del ORDEN de las filas (el recorrido las lee en el orden del
   SCAN, el índice mes a mes): los empates de nombre, de campo del
   identificador y de posición en la tabla se deshacen con una regla fija. */
const TOP_GANADORES = 5;   // filas de «quién gana aquí» por entidad (lo de siempre)
/* El identificador se publica CON SU TIPO: «NIT» solo cuando salió de un campo
   de NIT del dataset; `codigoproveedor` es el código interno de SECOP (llega
   cuando el NIT viene como «No Definido») y rotularlo «NIT» sería una cifra con
   rótulo falso. */
const CAMPOS_NIT_REAL = new Set(["nit_del_proveedor_adjudicado", "adjudicatario_nit"]);
const tipoIdentificacion = (campo) => (CAMPOS_NIT_REAL.has(campo) ? "nit"
  : campo === "documento_proveedor" ? "documento" : "codigo_secop");

let claveAdjudicatarioDiferida = null;
function claveAdjudicatarioDe(lic) {
  if (!claveAdjudicatarioDiferida) claveAdjudicatarioDiferida = require("./equivalencias.js").claveAdjudicatario;
  return claveAdjudicatarioDiferida(lic);
}
/* El primer nombre no vacío de CAMPOS_ADJUDICATARIO, tal como viene. */
function nombreAdjudicatarioDe(lic) {
  for (const c of CAMPOS_ADJUDICATARIO) {
    const v = String(lic[c] == null ? "" : lic[c]).trim();
    if (v) return v;
  }
  return null;
}
const propio = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
function sumarUno(o, k) { if (k !== "__proto__") o[k] = (propio(o, k) ? o[k] : 0) + 1; }
/* El nombre más visto; empate → el menor en orden de código (fijo, no el primero leído). */
function masVisto(nom) {
  let nombre = null, veces = 0;
  for (const [n, v] of Object.entries(nom || {})) {
    if (v > veces || (v === veces && nombre != null && n < nombre)) { nombre = n; veces = v; }
  }
  return nombre;
}
/* Índice del campo de identificador más ESPECÍFICO visto (NIT antes que documento, documento antes
   que código interno): si alguna fila lo publicó como NIT, es un NIT. */
function campoMasEspecifico(actual, campo) {
  const i = CAMPOS_ADJUDICATARIO_NIT.indexOf(campo);
  if (i < 0) return actual;
  return actual == null || i < actual ? i : actual;
}
function acumularIdentidad(g, lic, quien) {
  g.n++;
  if (quien.clave.startsWith("nit:")) g.c = campoMasEspecifico(g.c, quien.campo);
  const nombre = nombreAdjudicatarioDe(lic);
  if (nombre) sumarUno(g.nom, nombre);
  const valor = valorAdjudicadoDe(lic);
  if (valor != null) { g.v += valor; g.cv++; }
  const f = primeraFecha(lic);
  if (f && (!g.u || f > g.u)) g.u = f;
  return { valor, f };
}
/* Cómo se llama y cómo se identifica un ganador acumulado: la regla de la pantalla. */
function identidadPublicada(clave, g) {
  const idValor = clave.startsWith("nit:") ? clave.slice(4) : null;
  // sin ningún proceso ganado no hay campo de origen: se conserva el rótulo de siempre («NIT …»)
  const tipo = idValor ? (g.c != null ? tipoIdentificacion(CAMPOS_ADJUDICATARIO_NIT[g.c]) : "nit") : null;
  return {
    idValor, tipo,
    nombre: masVisto(g.nom) || (idValor ? (tipo === "nit" ? `NIT ${idValor}` : `Proveedor ${idValor}`) : "(sin nombre)"),
  };
}

/* ---- por ENTIDAD: «quién gana aquí» ----
   Acumulador guardable como JSON (vive en el progreso reanudable):
   `{adj, sin, g: {[claveAdjudicatario]: {n, v, cv, u, c, nom}}}` — adjudicados
   de la base, los que no dicen quién ganó, y por ganador: ganados, suma de
   valor, cuántos con valor, última fecha, campo del identificador y nombres. */
const nuevoAcumuladorGanadores = () => ({ adj: 0, sin: 0, g: {} });
/* Una fila de la base (`cuentaParaCompetencia`: la decide quien llama). */
function acumularGanador(a, lic, quien = claveAdjudicatarioDe(lic)) {
  a.adj++;
  if (!quien || !quien.clave) { a.sin++; return; }
  const g = propio(a.g, quien.clave) ? a.g[quien.clave]
    : (a.g[quien.clave] = { n: 0, v: 0, cv: 0, u: null, c: null, nom: {} });
  acumularIdentidad(g, lic, quien);
}
const ordenGanadores = (a, b) => b.ganados - a.ganados
  || (b.valor_adjudicado_cop ?? -1) - (a.valor_adjudicado_cop ?? -1)
  || (a.clave < b.clave ? -1 : a.clave > b.clave ? 1 : 0);
/* Acumulador → el bloque «quién gana aquí» SIN su lectura (la redacta el
   detalle al servir). La concentración solo con base suficiente (el mismo
   MIN_PROCESOS del índice): un «ganó el 100 %» sobre 2 procesos es la cifra
   sin base que este proyecto ya pagó. */
function ganadoresDe(a, { topN = TOP_GANADORES } = {}) {
  const adj = a && Number.isFinite(a.adj) ? a.adj : 0;
  const sin = a && Number.isFinite(a.sin) ? a.sin : 0;
  const conGanador = adj - sin;
  const top = Object.entries((a && a.g) || {}).map(([clave, g]) => {
    const { idValor, tipo, nombre } = identidadPublicada(clave, g);
    return {
      clave, // la llave del perfil del competidor (vista adjudicatario)
      nombre,
      // `nit` conserva su contrato: SOLO un NIT de verdad; lo demás viaja en `identificacion`
      nit: tipo === "nit" ? idValor : null,
      identificacion: idValor ? { tipo, valor: idValor } : null,
      ganados: g.n,
      // suma solo de los procesos con valor legible; sin ninguno, null (no 0)
      valor_adjudicado_cop: g.cv ? Math.round(g.v) : null,
      procesos_con_valor: g.cv,
      ultima_adjudicacion: g.u || null,
    };
  }).sort(ordenGanadores);
  const lider = top[0] || null;
  const concentracion = conGanador >= MIN_PROCESOS && lider
    ? { lider: lider.nombre, ganados: lider.ganados, base: conGanador, pct: Math.round((lider.ganados / conGanador) * 100) }
    : null;
  return {
    top: top.slice(0, topN),
    distintos: top.length,
    procesos_con_ganador: conGanador,
    sin_adjudicatario: sin,
    min_procesos: MIN_PROCESOS,
    concentracion,
  };
}

/* ---- por ADJUDICATARIO: el perfil del competidor ----
   `{n, v, cv, u, c, nom, e: {[entidad]: [ganados, valor, con_valor, última]}}`.
   LA BAJA CON LA QUE GANA NO SE ACUMULA AQUÍ, y es a propósito: su regla es
   `bajaDeFila` de lib/indice_baja, y la suite prohíbe —sobre el grafo real de
   requires, diferidos incluidos— que la cadena de lib/filtros (que llega a este
   módulo por lib/equivalencias) alcance lib/indice_baja: sería un ciclo. Copiar
   la regla aquí sería una segunda aritmética de «cuánto descontó». Así que el
   perfil PUBLICADO la declara «sin dato» con su motivo, y la calcula solo el
   recorrido completo (lib/competencia_detalle), que sí puede importarla. */
const nuevoAcumuladorPerfil = () => ({ n: 0, v: 0, cv: 0, u: null, c: null, nom: {}, e: {} });
/* Una fila que el adjudicatario GANÓ (`esAdjudicado` y su clave: lo decide quien llama). */
function acumularPerfil(p, lic, quien = claveAdjudicatarioDe(lic)) {
  const { valor, f } = acumularIdentidad(p, lic, quien);
  const ent = String(lic.entidad || "").trim() || "(entidad no informada)";
  if (ent === "__proto__") return;
  const e = propio(p.e, ent) ? p.e[ent] : (p.e[ent] = [0, 0, 0, null]);
  e[0]++;
  if (valor != null) { e[1] += valor; e[2]++; }
  if (f && (!e[3] || f > e[3])) e[3] = f;
}
/* Acumulador → el perfil publicable (sin la baja: ver arriba). */
function perfilDe(clave, p) {
  const { idValor, tipo, nombre } = identidadPublicada(clave, p);
  const entidades = Object.entries(p.e || {}).map(([entidad, e]) => ({
    entidad,
    ganados: e[0],
    valor_adjudicado_cop: e[2] ? Math.round(e[1]) : null,
    procesos_con_valor: e[2],
    ultima_adjudicacion: e[3] || null,
  })).sort((a, b) => b.ganados - a.ganados
    || (b.valor_adjudicado_cop ?? -1) - (a.valor_adjudicado_cop ?? -1)
    || (a.entidad < b.entidad ? -1 : a.entidad > b.entidad ? 1 : 0));
  return {
    clave,
    nombre,
    identificacion: idValor && p.n > 0 ? { tipo, valor: idValor } : null,
    total_ganados: p.n,
    valor_adjudicado_cop: p.cv ? Math.round(p.v) : null,
    procesos_con_valor: p.cv,
    ultima_adjudicacion: p.u || null,
    entidades,
  };
}

/* EL PERFIL EN EL HASH, COMPACTO (medido el 23-sep-2026 sobre 150 000 procesos
   sintéticos: 15,0 MB con cada entidad como objeto, porque los cinco nombres de
   campo pesaban más que los datos; 7,75 MB así, con el perfil más grande en
   33 KB). En el hash cada entidad es una fila
   `[entidad, ganados, valor, con_valor, última]`; `perfilExpandido` la devuelve a
   la forma de la respuesta. Escritor y lector viven juntos para que no puedan
   separarse; un valor que no sea un número JSON se lee como null (sin dato). */
const numeroJson = (x) => (typeof x === "number" && Number.isFinite(x) ? x : null);
function perfilCompacto(perfil) {
  return {
    ...perfil,
    entidades: perfil.entidades.map((e) => [e.entidad, e.ganados, e.valor_adjudicado_cop, e.procesos_con_valor, e.ultima_adjudicacion]),
  };
}
function perfilExpandido(r) {
  if (!r || typeof r !== "object" || !Array.isArray(r.entidades)) return null;
  const entidades = [];
  for (const e of r.entidades) {
    if (!Array.isArray(e) || typeof e[0] !== "string" || numeroJson(e[1]) == null) return null; // fila ilegible: el perfil entero no vale
    entidades.push({
      entidad: e[0], ganados: e[1], valor_adjudicado_cop: numeroJson(e[2]),
      procesos_con_valor: numeroJson(e[3]), ultima_adjudicacion: typeof e[4] === "string" ? e[4] : null,
    });
  }
  return { ...r, entidades };
}

/* Las dos acumulaciones de una fila, en la pasada del índice. `cuenta` es
   `cuentaParaCompetencia(lic)`, que `acumular` ya calculó. */
const nuevoQuienGana = () => ({ entidades: {}, adjudicatarios: {} });
function acumularQuienGana(q, lic, cuenta = cuentaParaCompetencia(lic)) {
  const adjudicado = esAdjudicado(lic);
  if (!cuenta && !adjudicado) return;
  const quien = claveAdjudicatarioDe(lic);
  if (cuenta) {
    const ce = claveCanonica(lic.entidad);
    if (ce) {
      const a = propio(q.entidades, ce) ? q.entidades[ce] : (q.entidades[ce] = nuevoAcumuladorGanadores());
      acumularGanador(a, lic, quien);
    }
  }
  if (adjudicado && quien.clave) {
    const p = propio(q.adjudicatarios, quien.clave) ? q.adjudicatarios[quien.clave]
      : (q.adjudicatarios[quien.clave] = nuevoAcumuladorPerfil());
    acumularPerfil(p, lic, quien);
  }
}

/* ---- publicación: dos hashes APARTE, cada uno con su cambio de clave atómico ----
   Aparte de `indice:competencia` porque ese hash lo lee ENTERO el listado de
   oportunidades (HGETALL por petición): con los ganadores dentro pesaría el
   triple y llevaría NIT y valores a la tarjeta, contra el contrato de
   `competenciaDe`. Cada valor lleva su propio `construido`: si un día el cambio
   de clave falla, el hash anterior sigue en pie y sigue diciendo de cuándo es.
   Si el RENAME falla NO se escribe encima del vigente (a diferencia del índice,
   que tiene un respaldo): se conserva el anterior entero y la meta lo dice. */
const TOPE_BYTES_HSET = 2 * 1024 * 1024; // además de CAMPOS_POR_HSET: un perfil puede pesar 30 KB
async function publicarHashAtomico(redis, vigente, nuevo, pares) {
  await redis.del(nuevo);
  if (!pares.length) { await redis.del(vigente); return { ok: true, n: 0 }; }
  let lote = {}, enLote = 0, bytes = 0;
  for (const [campo, valor] of pares) {
    const texto = JSON.stringify(valor);
    lote[campo] = texto; enLote++; bytes += texto.length + campo.length;
    if (enLote >= CAMPOS_POR_HSET || bytes >= TOPE_BYTES_HSET) { await redis.hset(nuevo, lote); lote = {}; enLote = 0; bytes = 0; }
  }
  if (enLote) await redis.hset(nuevo, lote);
  try {
    await redis.rename(nuevo, vigente);
  } catch (e) {
    try { await redis.del(nuevo); } catch { /* la clave :nuevo se reescribe en la próxima construcción */ }
    return { ok: false, n: pares.length, motivo: `no se pudo cambiar el resumen anterior por el nuevo (${String((e && e.message) || e).slice(0, 80)}); sigue en pie el anterior` };
  }
  return { ok: true, n: pares.length };
}
async function publicarQuienGana(redis, q, construido) {
  const entidades = Object.entries(q.entidades).map(([k, a]) => [k, { ...ganadoresDe(a), construido }]);
  const adjudicatarios = Object.entries(q.adjudicatarios).map(([k, p]) => [k, { ...perfilCompacto(perfilDe(k, p)), construido }]);
  const rE = await publicarHashAtomico(redis, CLAVES.indiceGanadores, CLAVES.indiceGanadoresNuevo, entidades);
  const rA = await publicarHashAtomico(redis, CLAVES.indiceAdjudicatario, CLAVES.indiceAdjudicatarioNuevo, adjudicatarios);
  const motivo = [rE.ok ? null : `quién gana por entidad: ${rE.motivo}`, rA.ok ? null : `perfil del competidor: ${rA.motivo}`]
    .filter(Boolean).join(" · ") || null;
  return {
    publicado: rE.ok && rA.ok,
    construido,
    top_n: TOP_GANADORES,
    entidades: rE.ok ? rE.n : null,
    adjudicatarios: rA.ok ? rA.n : null,
    ...(motivo ? { motivo } : {}),
  };
}

/* ---------- B2 (medición previa) · oferentes por PERÍODO ----------
   La ley de garantías 2026 bloqueó convenios interadministrativos desde el
   8-nov-2025 y la contratación directa desde el 31-ene-2026, ambos hasta el
   31-may-2026: las entidades TUVIERON que competir y el promedio de dos años lo
   mezcla sin saberlo (CLAUDE.md, «Investigación de contraste»). Antes de
   segmentar el estimador hay que MEDIR si la ventana cambió los oferentes: se
   agregan los días de cierre (los mismos de `medirColision`) dentro y fuera de
   la ventana, pooled y ESTRATIFICADO por entidad (solo entidades con procesos en
   los dos lados: comparar entidades distintas mediría otra cosa). */
const VENTANA_GARANTIAS_2026 = { desde: "2025-11-08", hasta: "2026-05-31" };
const lecturaVentana = (c) => (c == null ? "sin entidades con procesos a los dos lados de la ventana: no se puede comparar"
  : Math.abs(c - 1) < 0.03 ? `cociente ≈1 (${redondear2(c)}): la ventana no cambió los oferentes por proceso; el promedio de dos años no mezcla nada raro`
    : c > 1 ? `cociente ${redondear2(c)}: durante la ventana se presentaron MÁS oferentes por proceso que en el resto del período de la misma entidad`
      : `cociente ${redondear2(c)}: durante la ventana se presentaron MENOS oferentes por proceso — más procesos compitiendo diluyen a los oferentes; `
        + "el promedio de dos años lo mezcla y este es el tamaño del sesgo. Es medición, no corrección: el estimador no segmenta.");
function medirPeriodos(entidades) {
  const porAnio = {};
  let dentroN = 0, dentroS = 0, fueraN = 0, fueraS = 0, esperadoDentro = 0, entsAmbos = 0;
  const cocientes = [];
  for (const e of entidades) {
    if (!e.dias) continue;
    let dN = 0, dS = 0, fN = 0, fS = 0;
    for (const [dia, d] of Object.entries(e.dias)) {
      const anio = dia.slice(0, 4);
      const a = porAnio[anio] || (porAnio[anio] = { procesos: 0, suma: 0 });
      a.procesos += d[0]; a.suma += d[1];
      if (dia >= VENTANA_GARANTIAS_2026.desde && dia <= VENTANA_GARANTIAS_2026.hasta) { dN += d[0]; dS += d[1]; }
      else { fN += d[0]; fS += d[1]; }
    }
    if (dN && fN) {
      entsAmbos++;
      dentroN += dN; dentroS += dS; fueraN += fN; fueraS += fS;
      esperadoDentro += dN * (fS / fN);   // lo que habrían recibido con el promedio de FUERA de su entidad
      if (dS > 0) cocientes.push((dS / dN) / (fS / fN));
    }
  }
  const medVentana = medianaDe(cocientes);
  const anios = Object.fromEntries(Object.entries(porAnio).sort().map(([a, x]) => [a, {
    procesos: x.procesos, promedio_oferentes: x.procesos ? redondear2(x.suma / x.procesos) : null,
  }]));
  return {
    por_anio: anios,
    ventana_garantias_2026: {
      ...VENTANA_GARANTIAS_2026,
      entidades_con_ambos_lados: entsAmbos,
      procesos_dentro: dentroN, procesos_fuera: fueraN,
      promedio_dentro: dentroN ? redondear2(dentroS / dentroN) : null,
      promedio_fuera_esperado: dentroN ? redondear2(esperadoDentro / dentroN) : null,
      // dentro ÷ fuera, estratificado por entidad: > 1 ⇒ en la ventana se presentó más gente
      cociente_pooled: dentroS > 0 && esperadoDentro > 0 ? redondear2(dentroS / esperadoDentro) : null,
      // la mediana se calcula SIN redondear; `redondear2` solo al MOSTRAR, y
      // nunca sobre null: `redondear2(null)` es 0, que es «sin dato» disfrazado
      mediana_cocientes: medVentana != null ? redondear2(medVentana) : null,
      lectura: lecturaVentana(dentroS > 0 && esperadoDentro > 0 ? dentroS / esperadoDentro : null),
    },
    metodo: "días de cierre por entidad (los de medirColision); por año pooled; la ventana estratificada por entidad con los dos lados",
  };
}

/* ---------- B3 · efecto de la PRÓRROGA del cierre, medido cuando haya datos ----------
   Misma forma que la colisión: por entidad, prorrogados vs no prorrogados;
   pooled y estratificado. Solo cuentan los procesos que el delta estampó con
   `cierre_prorrogado` (los del backfill no lo traen: una sola versión). Hasta
   que haya ≥ COLISION_MIN_ENTIDADES (lib/probabilidad) entidades con los dos
   grupos, la meta dice «sin medición» y el 1,20 sigue como supuesto. */
function medirProrroga(entidades) {
  let ents = 0, nP = 0, nN = 0, sP = 0, esperadoP = 0, sumaP = 0, sumaPEsp = 0;
  const cocientes = [];
  for (const e of entidades) {
    const g = e.prorroga;
    if (!g || !g.prorrogados[0] || !g.no_prorrogados[0]) continue;
    ents++;
    const [np, sp] = g.prorrogados, [nn, sn] = g.no_prorrogados;
    const mP = sp / np, mN = sn / nn;
    nP += np; nN += nn; sP += sp; esperadoP += np * mN;
    sumaP += np / (1 + mP); sumaPEsp += np / (1 + mN);
    if (mP > 0) cocientes.push(mN / mP);
  }
  if (!ents) {
    return { entidades_con_ambos_grupos: 0, procesos_prorrogados: nP, procesos_no_prorrogados: nN,
      cociente_pooled: null, multiplicador_implicito: null, mediana_cocientes: null,
      mensaje: "sin entidades con procesos prorrogados y no prorrogados a la vez: la señal se acumula desde el 16-ago-2026 (delta); el backfill no la trae" };
  }
  const medProrroga = medianaDe(cocientes);
  return {
    entidades_con_ambos_grupos: ents, procesos_prorrogados: nP, procesos_no_prorrogados: nN,
    promedio_oferentes_prorrogados: redondear2(sP / nP),
    promedio_oferentes_no_prorrogados_esperado: redondear2(esperadoP / nP),
    cociente_pooled: redondear2(esperadoP / sP),
    multiplicador_implicito: sumaPEsp > 0 ? redondear2(sumaP / sumaPEsp) : null,
    mediana_cocientes: medProrroga != null ? redondear2(medProrroga) : null,
    metodo: "por entidad: prorrogados = procesos con cierre_prorrogado true, control = false; pooled entre entidades con los dos grupos (misma forma que la colisión)",
  };
}

/* ---------- A7 · efecto de la colisión de cierres, MEDIDO ----------
   §9.3 del doc: por entidad, «grupo colisión» = procesos cuyo día de cierre
   tiene ≥2 procesos de la MISMA entidad; «control» = el resto de la entidad.
   ESTRATIFICADO POR ENTIDAD, obligatorio: sin eso se mediría que las entidades
   grandes (que cierran muchos procesos el mismo día) reciben más ofertas, que
   es lo contrario de lo que se quiere medir. Solo entran entidades con los DOS
   grupos no vacíos.

   Estadístico pooled (Mantel-Haenszel sobre medias): oferentes que los procesos
   en colisión HABRÍAN recibido con el promedio de control de su entidad, dividido
   por los que recibieron. cociente ≈ 1 ⇒ el efecto no existe; ≈ 1,15 ⇒ el factor
   está bien puesto. Y `multiplicador_implicito` traduce ese cociente a lo que
   multiplica la probabilidad, que es 1/(1+r): (1 + r_ctrl)/(1 + r_col). Es lo
   que habría que comparar con FACTOR_COLISION_CIERRES. También la mediana de los
   cocientes por entidad, que no la arrastra ninguna gobernación. */
function medirColision(entidades) {
  let entidadesConAmbos = 0, procCol = 0, procCtrl = 0, sumCol = 0, esperadoCol = 0, sumCtrl = 0;
  let sumaP = 0, sumaPEsperada = 0; // 1/(1+r) por proceso, para el multiplicador implícito pooled
  const cocientes = [];
  for (const e of entidades) {
    if (!e.dias) continue;
    let nCol = 0, sCol = 0, nCtrl = 0, sCtrl = 0;
    for (const d of Object.values(e.dias)) {
      if (d[0] >= 2) { nCol += d[0]; sCol += d[1]; } else { nCtrl += d[0]; sCtrl += d[1]; }
    }
    if (!nCol || !nCtrl) continue;
    entidadesConAmbos++;
    const mCol = sCol / nCol, mCtrl = sCtrl / nCtrl;
    procCol += nCol; procCtrl += nCtrl; sumCol += sCol; sumCtrl += sCtrl;
    esperadoCol += nCol * mCtrl;
    sumaP += nCol / (1 + mCol); sumaPEsperada += nCol / (1 + mCtrl);
    if (mCol > 0) cocientes.push(mCtrl / mCol);
  }
  if (!entidadesConAmbos) {
    return { entidades_con_ambos_grupos: 0, procesos_colision: procCol, procesos_control: procCtrl,
      cociente_pooled: null, multiplicador_implicito: null, mediana_cocientes: null, mensaje: "sin entidades con procesos en colisión y de control a la vez: no se puede medir" };
  }
  const mediana = medianaDe(cocientes);
  return {
    entidades_con_ambos_grupos: entidadesConAmbos,
    procesos_colision: procCol,
    procesos_control: procCtrl,
    promedio_oferentes_colision: redondear2(sumCol / procCol),
    promedio_oferentes_control_esperado: redondear2(esperadoCol / procCol),
    promedio_oferentes_control: redondear2(sumCtrl / procCtrl),
    // cociente de promedios del §9.3, estratificado (control ÷ colisión, pooled)
    cociente_pooled: redondear2(esperadoCol / sumCol),
    // lo que de verdad multiplicaría 1/(1+r): P observada en colisión ÷ P esperada con el control
    multiplicador_implicito: sumaPEsperada > 0 ? redondear2(sumaP / sumaPEsperada) : null,
    mediana_cocientes: mediana != null ? redondear2(mediana) : null,
    metodo: "por entidad: colisión = procesos cuyo día de cierre tiene ≥2 de la misma entidad, control = el resto; pooled entre entidades con los dos grupos (§9.3 del análisis de probabilidad del proyecto)",
  };
}

/* Año del proceso para el reparto temporal: el de la adjudicación si viene, si
   no el de la publicación. Sin fecha legible, "sin_fecha" — se cuenta, no se
   adivina. */
function anioDe(lic) {
  const f = primero(lic, CAMPOS_FECHA_ADJUDICACION) || lic.fecha_de_publicacion_del || null;
  const m = f ? /^(\d{4})-\d{2}/.exec(String(f)) : null;
  return m ? m[1] : "sin_fecha";
}

/* ---------- encogimiento: μ, τ̂², m (método de los momentos) ----------
   Sobre el acumulador por entidad, sin guardar la muestra:
     μ    = Σ suma / Σ procesos                    (promedio global, por proceso)
     s²_i = (Σx² − n·r̄²)/(n−1)                     varianza dentro de la entidad i
     τ̂²   = Var(r̄_i) − mean(s²_i / n_i)            entre entidades, menos el ruido
     m    = μ / τ̂²                                  fuerza del prior, en «procesos»
   LA HETEROGENEIDAD SE ESTIMA SOBRE LAS ENTIDADES CON BASE (n ≥ MIN_PROCESOS)
   y el encogimiento se APLICA a todas. Estimarla con las de 1-4 procesos
   también fue el primer intento y la suite lo cazó: en un corpus con muchas
   entidades pequeñas y conteos ruidosos, el ruido muestral (s²/n, con n de 2)
   supera la varianza entre entidades y τ̂² sale ≤ 0 aunque las entidades con
   base difieran de sobra (3, 8 y 18 oferentes de promedio) — o sea, el ruido de
   las pequeñas anulaba la señal de las grandes. Con menos de
   MIN_ENTIDADES_ESTIMACION entidades con base no se estima nada: `null`, y el
   lector se comporta como el hash viejo. */
const MIN_ENTIDADES_ESTIMACION = 3;
function estimarEncogimiento(entidades) {
  const total = entidades.reduce((a, e) => a + e.procesos, 0);
  const sumaTotal = entidades.reduce((a, e) => a + e.oferentes_total, 0);
  if (!total) return null;
  const mu = sumaTotal / total;
  const conVar = entidades.filter((e) => e.procesos >= MIN_PROCESOS && Number.isFinite(e.suma2));
  if (conVar.length < MIN_ENTIDADES_ESTIMACION) {
    return { mu_global: redondear2(mu), tau2: null, m: null, entidades_estimacion: conVar.length,
      entidad_no_distingue: null, procesos: total,
      motivo: `hacen falta ${MIN_ENTIDADES_ESTIMACION} entidades con ≥${MIN_PROCESOS} procesos para estimar la heterogeneidad` };
  }
  const medias = conVar.map((e) => e.oferentes_total / e.procesos);
  const mediaDeMedias = medias.reduce((a, b) => a + b, 0) / medias.length;
  const varEntre = medias.reduce((a, r) => a + (r - mediaDeMedias) ** 2, 0) / (medias.length - 1);
  const ruido = conVar.reduce((a, e) => {
    const n = e.procesos, r = e.oferentes_total / n;
    const s2 = Math.max(0, (e.suma2 - n * r * r) / (n - 1));
    return a + s2 / n;
  }, 0) / conVar.length;
  const tau2 = varEntre - ruido;
  const noDistingue = !(tau2 > 0);
  /* Varianza DENTRO de entidad, ponderada por grados de libertad. `m` es
     «cuántos procesos vale el prior»: σ²_dentro / τ². Con Poisson σ²_dentro = μ
     (la fórmula del doc); los conteos reales están SOBREDISPERSOS, y asumir
     menos ruido del observado sobrepesaría el dato propio de una entidad de
     dos procesos. Se toma el MAYOR de los dos: nunca menos ruido del que hay. */
  const gl = conVar.reduce((a, e) => a + (e.procesos - 1), 0);
  const sigma2Dentro = gl > 0 ? conVar.reduce((a, e) => {
    const n = e.procesos, r = e.oferentes_total / n;
    return a + Math.max(0, e.suma2 - n * r * r);
  }, 0) / gl : mu;
  const m = noDistingue ? Infinity : Math.max(mu, sigma2Dentro) / tau2;
  const departamentos = estimarPriorDepartamental(entidades, mu);
  return {
    mu_global: redondear2(mu),
    tau2: redondear2(tau2),
    m: Number.isFinite(m) ? redondear2(m) : null,
    entidad_no_distingue: noDistingue,
    entidades_estimacion: conVar.length,
    procesos: total,
    var_entre_entidades: redondear2(varEntre),
    ruido_muestral: redondear2(ruido),
    sigma2_dentro: redondear2(sigma2Dentro),
    // B7: el prior de cada entidad es el de SU departamento, encogido a su vez hacia μ
    departamentos,
    metodo: `gamma-Poisson · método de los momentos sobre las entidades con ≥${MIN_PROCESOS} procesos (§3.1 del análisis de probabilidad del proyecto)`,
  };
}
const redondear2 = (n) => Math.round(n * 100) / 100;

/* ---------- B7 · el prior por DEPARTAMENTO, «el mismo estimador un nivel arriba» ----------
   Los departamentos difieren de verdad (medido en producción: Bogotá 8,9
   oferentes por proceso, Boyacá 2,3, Arauca 1,5, Caldas 11,4), así que el
   prior de una entidad con pocos procesos es mejor si es el de SU departamento
   que el μ nacional. Pero un departamento con pocos procesos tampoco se toma al
   pie de la letra: μ̂_d = w_d·μ_d + (1−w_d)·μ, con w_d = n_d/(n_d + m_d) y m_d por
   método de los momentos ENTRE departamentos (τ_d² = Var(μ_d) − ruido;
   σ_d² = varianza dentro del departamento pooled; m_d = σ_d²/τ_d²). Solo entran
   en la estimación los departamentos con ≥ MIN_PROCESOS_DEPTO procesos. Con
   τ_d² ≤ 0 (los departamentos no distinguen) todo prior es μ y se declara. */
const MIN_PROCESOS_DEPTO = 30;
function estimarPriorDepartamental(entidades, mu) {
  const acc = {};
  for (const e of entidades) {
    if (!e.depto || !Number.isFinite(e.suma2)) continue;
    const d = acc[e.depto] || (acc[e.depto] = { procesos: 0, suma: 0, suma2: 0, entidades: 0 });
    d.procesos += e.procesos; d.suma += e.oferentes_total; d.suma2 += e.suma2; d.entidades++;
  }
  const conBase = Object.entries(acc).filter(([, d]) => d.procesos >= MIN_PROCESOS_DEPTO);
  const salida = { min_procesos: MIN_PROCESOS_DEPTO, con_base: conBase.length, total: Object.keys(acc).length,
    m: null, tau2: null, sigma2_dentro: null, no_distinguen: null, priors: {} };
  if (conBase.length < MIN_ENTIDADES_ESTIMACION) {
    salida.motivo = `hacen falta ${MIN_ENTIDADES_ESTIMACION} departamentos con ≥${MIN_PROCESOS_DEPTO} procesos`;
    return salida;
  }
  const medias = conBase.map(([, d]) => d.suma / d.procesos);
  const mm = medias.reduce((a, b) => a + b, 0) / medias.length;
  const varEntre = medias.reduce((a, r) => a + (r - mm) ** 2, 0) / (medias.length - 1);
  let ruido = 0, gl = 0, ss = 0;
  for (const [, d] of conBase) {
    const r = d.suma / d.procesos;
    const s2 = Math.max(0, (d.suma2 - d.procesos * r * r) / (d.procesos - 1));
    ruido += s2 / d.procesos; gl += d.procesos - 1; ss += (d.procesos - 1) * s2;
  }
  ruido /= conBase.length;
  const sigma2 = gl > 0 ? ss / gl : mu;
  const tau2 = varEntre - ruido;
  const noDistinguen = !(tau2 > 0);
  const m = noDistinguen ? Infinity : Math.max(mu, sigma2) / tau2;
  salida.tau2 = redondear2(tau2); salida.sigma2_dentro = redondear2(sigma2);
  salida.m = Number.isFinite(m) ? redondear2(m) : null; salida.no_distinguen = noDistinguen;
  salida.var_entre_departamentos = redondear2(varEntre); salida.ruido_muestral = redondear2(ruido);
  for (const [dep, d] of Object.entries(acc)) {
    const mud = d.suma / d.procesos;
    const w = noDistinguen ? 0 : d.procesos / (d.procesos + m);
    salida.priors[dep] = {
      procesos: d.procesos, entidades: d.entidades,
      promedio: redondear2(mud),
      prior: redondear2(w * mud + (1 - w) * mu),
      peso: Math.round(w * 1000) / 1000,
    };
  }
  return salida;
}

/* Prior de UNA entidad: el de su departamento (encogido) si existe, si no μ. */
function priorDe(e, enc) {
  const dep = e && e.depto ? e.depto : null;
  const pd = dep && enc && enc.departamentos && enc.departamentos.priors ? enc.departamentos.priors[dep] : null;
  if (pd && pd.prior != null) return { valor: pd.prior, origen: `departamento:${dep}` };
  return { valor: enc.mu_global, origen: "global" };
}

/* r̂, w y su desviación para UNA entidad, dados μ y m. Con m = null (no se pudo
   estimar) devuelve null: el lector cae al comportamiento de siempre. */
function encogerEntidad(e, enc) {
  if (!enc || enc.mu_global == null || (enc.m == null && !enc.entidad_no_distingue)) return null;
  const n = e.procesos;
  // una entidad publicada solo por sus hechos de cierre (M-DGF-08) no tiene
  // ningún dato propio de oferentes que encoger: null, como un hash sin el campo
  if (!(n > 0)) return null;
  const prior = priorDe(e, enc);
  const mu = prior.valor;
  /* Con τ̂² ≤ 0 todo se encoge al prior y la posterior es degenerada: la
     desviación sería 0, y una banda de ancho CERO se leería como certeza
     absoluta justo donde MENOS información individualizada hay. `null`. */
  if (enc.entidad_no_distingue) return { rivales_estimados: redondear2(mu), peso_datos: 0, rivales_desv: null, prior: redondear2(mu), prior_origen: prior.origen };
  const m = enc.m;
  const rbar = e.oferentes_total / n;
  const w = n / (n + m);
  const rhat = w * rbar + (1 - w) * mu;
  const varianza = (n * rbar + m * mu) / ((n + m) ** 2);
  return {
    rivales_estimados: redondear2(rhat),
    peso_datos: Math.round(w * 1000) / 1000,
    rivales_desv: redondear2(Math.sqrt(Math.max(0, varianza))),
    prior: redondear2(mu),
    prior_origen: prior.origen,
  };
}

/* EL PROGRESO REANUDABLE, con un tope para lo que añade «quién gana»
   (23-sep-2026). Con los dos acumuladores de ganadores el progreso pasa de
   ~0,4 MB a unos pocos MB comprimidos (medido en el diagnóstico sobre 150 000
   procesos: 1,8 MB solo el de entidades). Upstash admite 10 MB por petición:
   si un corpus mayor lo empujara por encima del tope, el SET fallaría y con él
   se caería también el índice de siempre, que no tiene la culpa. Así que,
   pasado el tope, se sueltan los acumuladores de ganadores (no se publican: la
   meta dice por qué) y el índice sigue. Se comprime UNA vez para medir y
   escribir: es el mismo formato que `escribirJSONComprimido`. */
const TOPE_PROGRESO_B64 = 8 * 1024 * 1024;
async function guardarProgreso(redis, p) {
  let b64 = comprimir(p);
  if (b64.length > TOPE_PROGRESO_B64 && p.quienGana) {
    const mb = Math.round((b64.length / 1048576) * 10) / 10;
    delete p.quienGana;
    p.quienGana_motivo = `El resumen de quién gana no cupo en el progreso guardado (${mb} MB comprimidos, tope ${TOPE_PROGRESO_B64 / 1048576} MB): `
      + "se armó el índice sin él.";
    b64 = comprimir(p);
  }
  await redis.set(CLAVES.indiceProgreso, b64);
}

/* ============================ construirIndice ============================
   Recorre el histórico MES A MES (no chunk a chunk) porque un proceso vive en
   un solo mes: deduplicar por `_k` dentro del mes basta y el acumulador que se
   persiste entre invocaciones es por ENTIDAD (pequeño), no por proceso.
   Reanudable: progreso comprimido en indice:competencia:progreso. */
async function construirIndice(redis, { presupuestoMs = 40000, reiniciar = false, log = () => {} } = {}) {
  const t0 = Date.now();

  const claves = await redis.scan(CLAVES.patronChunksHist);
  const porMes = new Map();
  for (const k of claves) {
    const mes = CLAVES.mesDeClaveHist(k);
    if (!mes) continue;
    if (!porMes.has(mes)) porMes.set(mes, []);
    porMes.get(mes).push(k);
  }

  let p = reiniciar ? null : await leerJSONComprimido(redis, CLAVES.indiceProgreso);
  if (!p || !Array.isArray(p.pendientes)) {
    p = {
      iniciado: new Date().toISOString(),
      pendientes: [...porMes.keys()].sort(),
      acc: {},
      stats: { filas: 0, contados: 0, sin_adjudicacion: 0, sin_oferentes: 0, meses: 0 },
      // quién gana, por entidad y por adjudicatario (23-sep-2026): aparte de `acc`
      quienGana: nuevoQuienGana(),
    };
  } else if (!p.quienGana && !p.quienGana_motivo) {
    /* UN PROGRESO ESCRITO POR EL DESPLIEGUE ANTERIOR no trae el acumulador de
       quién gana: los meses que ya recorrió no se contaron. Seguir acumulando
       desde aquí publicaría ganadores de medio corpus —una cifra creíble y
       falsa—, así que NO se acumula ni se publica y la meta dice cómo
       arreglarlo. El índice de siempre sigue su curso sin cambios. */
    p.quienGana_motivo = "El resumen se empezó a armar antes de este cambio y no contó quién gana en los meses que ya había recorrido. "
      + "Vuelva a armarlo desde cero con /api/sync/historico?reconstruir_indice=true&reiniciar=1";
  }
  if (!p.pendientes.length && !Object.keys(p.acc).length && !porMes.size) {
    return { done: true, vacio: true, entidades: 0, clasificadas: 0, msg: "no hay corpus histórico todavía" };
  }

  const tanda = relojDeTanda(t0, presupuestoMs);
  while (p.pendientes.length) {
    /* «rendirse solo después de avanzar» (7-sep-2026, lib/presupuesto): sin esto,
       una invocación cuya preparación consuma el presupuesto devolvía cero meses y
       la cadena de reconstrucción no convergía. */
    if (tanda.agotado()) {
      await guardarProgreso(redis, p);
      return { done: false, pendientes: p.pendientes.length, entidades: Object.keys(p.acc).length };
    }
    const mes = p.pendientes[0];
    const registros = await leerChunksDedup(redis, porMes.get(mes) || []);
    for (const r of registros) acumular(p.acc, p.stats, r, p.quienGana || null);
    p.stats.meses++;
    p.pendientes.shift();
    tanda.avanzo();   // el mes ya está procesado
    await guardarProgreso(redis, p);
    log(`índice: ${mes} → ${registros.length} procesos (${Object.keys(p.acc).length} entidades)`);
  }

  /* ---------- métricas por entidad + tertiles ---------- */
  const entidades = Object.entries(p.acc).map(([clave, a]) => ({
    clave,
    nombre: a.nombre,
    nit: a.nit || null,
    procesos: a.procesos,
    oferentes_total: a.suma,
    // una entidad que solo tiene hechos de cierre (M-DGF-08) no tiene promedio:
    // null, no un 0/0
    promedio: a.procesos > 0 ? redondear(a.suma / a.procesos) : null,
    mediana: medianaHistograma(a.histograma, a.procesos),
    suma2: Number.isFinite(a.suma2) ? a.suma2 : null,
    por_anio: a.por_anio || null,
    dias: a.dias || null,
    depto: a.depto || null,
    prorroga: a.prorroga || null,
    hechos: a.hechos || null,
  }));
  const entidadesConOferentes = entidades.filter((e) => e.procesos > 0).length;
  const encogimiento = estimarEncogimiento(entidades);
  /* La MEDICIÓN vive aquí; la comparación con el factor vigente
     (`FACTOR_COLISION_CIERRES`) vive en lib/probabilidad (`leerColision`), que es
     quien posee la constante: este módulo no la conoce ni la importa — la cadena
     filtros → equivalencias → indice_competencia no puede alcanzar apu/. */
  const colision = medirColision(entidades);
  colision.sin_dia_cierre = p.stats.sin_dia_cierre || 0;
  const periodos = medirPeriodos(entidades);
  const prorroga = medirProrroga(entidades);
  prorroga.sin_senal = p.stats.sin_senal_prorroga || 0;
  const clasificables = entidades.filter((e) => e.procesos >= MIN_PROCESOS)
    .sort((a, b) => a.promedio - b.promedio || a.clave.localeCompare(b.clave));
  const cortes = cortesTertiles(clasificables.map((e) => e.promedio));
  for (const e of entidades) {
    e.nivel = e.procesos >= MIN_PROCESOS ? nivelPorCortes(e.promedio, cortes) : "sin_dato";
  }

  /* ---------- NITs que NO pueden llevar alias ----------
     El alias `nit:{NIT}` → `{ref: entidad}` existe para que un cambio de razón
     social no parta el historial. Pero un NIT NO identifica a una entidad de
     forma única en este dataset: las regionales y unidades de un mismo
     organismo publican con el NIT de la matriz. Cuando dos entidades distintas
     lo comparten, el alias solo puede apuntar a UNA, y hasta ago 2026 ganaba
     «la última escrita»: la otra entidad heredaba en la tarjeta el nivel de
     competencia de su hermana, en silencio y sin forma de notarlo.

     Un alias ambiguo no es un alias: es una respuesta equivocada. Así que no se
     publica, y esas entidades se identifican SOLO por su nombre —que es exacto—
     La cuenta va a la meta: si un día son muchas, hay que saberlo. */
  const clavesReales = new Set(entidades.map((e) => e.clave));
  const clavesPorNit = new Map();
  for (const e of entidades) {
    if (!e.nit) continue;
    if (!clavesPorNit.has(e.nit)) clavesPorNit.set(e.nit, new Set());
    clavesPorNit.get(e.nit).add(e.clave);
  }
  const nitsAmbiguos = new Set();
  for (const [nit, claves] of clavesPorNit) {
    // dos entidades con el mismo NIT, o un NIT que YA es la clave real de una
    // entidad sin nombre (ahí el alias no sería ambiguo: sería destructivo)
    if (claves.size > 1 || clavesReales.has(`nit:${nit}`)) nitsAmbiguos.add(nit);
  }

  /* ---------- publicación con swap atómico ---------- */
  /* Escribe el hash completo en `destino`, por lotes de CAMPOS_POR_HSET campos:
     un HSET por lote acota el tamaño del request REST. Cada entidad va bajo su
     clave canónica y, si su NIT no es ambiguo, un alias que apunta al mismo
     registro (sin duplicar la carga útil). */
  async function publicarEn(destino) {
    let lote = {}, enLote = 0;
    for (const e of entidades) {
      lote[e.clave] = registroPublicado(e, encogimiento);
      enLote++;
      if (e.nit && !nitsAmbiguos.has(e.nit) && `nit:${e.nit}` !== e.clave) {
        lote[`nit:${e.nit}`] = { ref: e.clave };
        enLote++;
      }
      if (enLote >= CAMPOS_POR_HSET) { await redis.hset(destino, lote); lote = {}; enLote = 0; }
    }
    if (enLote) await redis.hset(destino, lote);
  }

  if (!entidades.length) {
    // hay corpus histórico pero NADA contable (p. ej. ninguna columna de
    // oferentes reconocida): dejar el índice vacío es coherente — todas las
    // entidades caen en "sin_dato" y la meta explica por qué en `descartados`
    await redis.del(CLAVES.indice, CLAVES.indiceNuevo);
  } else {
    await redis.del(CLAVES.indiceNuevo);
    await publicarEn(CLAVES.indiceNuevo);
    try {
      await redis.rename(CLAVES.indiceNuevo, CLAVES.indice);
    } catch {
      // sin RENAME disponible: publicar sobre la vigente (hay una ventana
      // corta con el índice a medias; los niveles solo caen a "sin_dato")
      await redis.del(CLAVES.indice);
      await publicarEn(CLAVES.indice);
      await redis.del(CLAVES.indiceNuevo);
    }
  }

  /* ---------- quién gana: publicado aparte (23-sep-2026) ----------
     Sin el acumulador completo NO se publica nada: el hash anterior (si lo
     hay) queda como estaba, con su propia fecha dentro. Un fallo aquí no tumba
     el índice de siempre, que ya está publicado: se declara en la meta. */
  const construido = new Date().toISOString();
  let ganadores;
  if (!p.quienGana) {
    ganadores = { publicado: false, motivo: p.quienGana_motivo || "no se acumuló quién gana en esta construcción" };
  } else {
    try {
      ganadores = await publicarQuienGana(redis, p.quienGana, construido);
    } catch (e) {
      try { await redis.del(CLAVES.indiceGanadoresNuevo, CLAVES.indiceAdjudicatarioNuevo); } catch { /* se reescriben en la próxima */ }
      ganadores = { publicado: false, motivo: `no se pudo publicar quién gana (${String((e && e.message) || e).slice(0, 120)})` };
    }
  }

  const porNivel = { baja: 0, media: 0, alta: 0, sin_dato: 0 };
  for (const e of entidades) porNivel[e.nivel]++;
  /* Cobertura de la PAREJA de fechas y de los desenlaces (M-DGF-08): explica
     para cuántas entidades puede salir el plazo y de dónde sale la base de
     desiertos. `con_ambas_fechas` es el Σ de las bases por entidad. */
  const h = p.stats.hechos || {};
  const plazoAdjudicacion = {
    min_procesos: MIN_PROCESOS,
    adjudicados: h.adjudicados || 0,
    desiertos: h.desiertos || 0,
    con_ambas_fechas: h.con_ambas_fechas || 0,
    sin_fecha_cierre: h.sin_fecha_cierre || 0,
    sin_fecha_adjudicacion: h.sin_fecha_adjudicacion || 0,
    sin_ninguna_fecha: h.sin_ninguna_fecha || 0,
    no_posterior_al_cierre: h.no_posterior_al_cierre || 0,
    // desierto Y adjudicación afirmada a la vez: fuera de las dos bases, contado para poder medirlo
    desierto_con_adjudicacion: h.desierto_con_adjudicacion || 0,
    entidades_con_plazo: entidades.filter((e) => e.hechos && e.hechos.plazo && e.hechos.plazo.n >= MIN_PROCESOS).length,
    entidades_con_base_de_desiertos: entidades.filter((e) => e.hechos && (e.hechos.adjudicados + e.hechos.desiertos) >= MIN_PROCESOS).length,
    // entidades publicadas SOLO por sus hechos de cierre (sin proceso con conteo de oferentes)
    entidades_solo_hechos: entidades.length - entidadesConOferentes,
    nota: "plazo = días hábiles (lib/habiles) entre el día de cierre y el de adjudicación, solo con las DOS fechas; "
      + "una adjudicación el mismo día del cierre o antes no es un plazo y se cuenta en no_posterior_al_cierre. "
      + "desiertos: estado o fase con «desierto» y sin adjudicación afirmada (el estado publicado gana a una fecha suelta); "
      + "la base es adjudicados + desiertos (cancelados y revocados no entran, y un desierto que además afirma adjudicación "
      + "tampoco: se cuenta en desierto_con_adjudicacion).",
  };
  const meta = {
    construido,
    // entidades con al menos un proceso con conteo de oferentes (lo de siempre);
    // las que solo publican hechos de cierre van en plazo_adjudicacion.entidades_solo_hechos
    entidades: entidadesConOferentes,
    entidades_publicadas: entidades.length,
    clasificadas: clasificables.length,
    min_procesos: MIN_PROCESOS,
    cortes: cortes ? { baja_hasta: cortes.c1, media_hasta: cortes.c2, degenerado: cortes.degenerado } : null,
    por_nivel: porNivel,
    // NITs compartidos por dos o más entidades: no se publica alias para ellos
    // (ver «NITs que no pueden llevar alias»). Si un día son muchos, se ve aquí.
    nits_ambiguos: nitsAmbiguos.size,
    procesos_contados: p.stats.contados,
    filas_leidas: p.stats.filas,
    descartados: { sin_adjudicacion: p.stats.sin_adjudicacion, sin_oferentes: p.stats.sin_oferentes },
    meses: p.stats.meses,
    // μ, τ̂², m del encogimiento (ver cabecera). Con m en null el índice se
    // comporta como antes; con `entidad_no_distingue` todo se encoge a μ.
    encogimiento,
    // A7: efecto MEDIDO de la colisión de cierres (no cambia ningún factor solo)
    colision,
    // B3: efecto de la prórroga, medido cuando la señal se haya acumulado
    prorroga,
    // B2 (medición previa): oferentes por año y dentro/fuera de la ventana de la
    // ley de garantías 2026 — para saber si el promedio de dos años mezcla un
    // período atípico ANTES de segmentar nada
    periodos,
    // M-DGF-08: cobertura de la pareja de fechas y de los desenlaces por entidad
    plazo_adjudicacion: plazoAdjudicacion,
    // 23-sep-2026: «quién gana aquí» y el perfil del competidor, publicados aparte
    // (indice:competencia:ganadores e indice:adjudicatario) — o por qué no
    ganadores,
  };
  await escribirJSON(redis, CLAVES.indiceMeta, meta);
  await redis.del(CLAVES.indiceProgreso);
  log(`índice publicado: ${entidadesConOferentes} entidades con oferentes, ${entidades.length} publicadas (${clasificables.length} clasificadas)`);
  return { done: true, ...meta };
}

/* ============================ lectura ============================ */
async function leerIndiceMeta(redis) { return leerJSON(redis, CLAVES.indiceMeta); }

/* Hash completo → objeto {clave: métricas}. Un solo comando; /api/oportunidades
   lo memoiza por instancia caliente contra el sello de indice:competencia:meta. */
async function leerIndice(redis) {
  const crudo = await redis.hgetall(CLAVES.indice);
  const out = {};
  for (const [k, v] of Object.entries(crudo || {})) {
    if (v == null) continue;
    if (typeof v === "object") { out[k] = v; continue; }
    try { out[k] = JSON.parse(v); } catch { /* campo corrupto: se ignora */ }
  }
  return out;
}

const SIN_DATO = Object.freeze({ nivel: "sin_dato", promedio_oferentes: null, mediana_oferentes: null, total_procesos: 0 });
const NIVELES_CLASIFICADOS = ["baja", "media", "alta"];

/* Un registro sin base suficiente: se conserva el CONTEO (es un hecho, y es lo
   que explica el ⚪ en la tarjeta) y se anulan todas las cifras derivadas. */
const sinDatoCon = (procesos, extra = null) => (procesos > 0 || extra
  ? { nivel: "sin_dato", promedio_oferentes: null, mediana_oferentes: null, total_procesos: procesos, ...(extra || {}) }
  : SIN_DATO);

/* Campos de ENCOGIMIENTO y reparto temporal del registro, SOLO si el hash los
   trae (un hash viejo no los tiene y la respuesta queda idéntica a la de
   siempre — sin claves nuevas, para que nadie lea `undefined` como dato). */
/* OJO: aquí NO se usa `numero()`, que es el lector TOLERANTE del dataset
   (punto = miles: leería «0.963» como 963). Estos campos los escribe este mismo
   módulo como números JSON; se leen con `Number` estricto y la ausencia se
   descarta ANTES (`Number(null)` es 0). */
const maquina = (v) => {
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};
function extraDe(m) {
  const r = maquina(m.rivales_estimados);
  if (r == null || r < 0) return null;
  const out = { rivales_estimados: r };
  const w = maquina(m.peso_datos);
  out.peso_datos = w != null && w >= 0 && w <= 1 ? w : null;
  const sd = maquina(m.rivales_desv);
  out.rivales_desv = sd != null && sd >= 0 ? sd : null;
  const pr = maquina(m.prior);
  if (pr != null) { out.prior = pr; out.prior_origen = typeof m.prior_origen === "string" ? m.prior_origen : null; }
  if (m.por_anio && typeof m.por_anio === "object") out.por_anio = m.por_anio;
  return out;
}

/* Resumen AGREGADO de la entidad de una licitación. Es lo único del histórico
   que /api/oportunidades expone: nunca adjudicatarios, NIT ni valores.
   ---------------------------------------------------------------------------
   ÚNICO PUNTO DE PASO de los tres consumidores (tarjeta, panel y detalle), y
   por eso es aquí donde se impone la invariante que faltaba:

     un promedio SOLO sale de aquí si la entidad tiene ≥ MIN_PROCESOS procesos
     contados Y un nivel clasificado. En cualquier otro caso, promedio null.

   No basta con arreglar el escritor: `indice:competencia` NO SE PURGA NUNCA
   (es su razón de ser), así que en producción sigue vivo el hash que escribió
   la versión anterior —con promedios publicados para entidades de 3 procesos—
   hasta que alguien reconstruya el índice. Esta guarda hace que ese hash viejo
   ya no pueda enseñar una cifra sin base, con reconstrucción o sin ella.
   Acepta `procesos` y `procesos_contados` por el mismo motivo. */
/* El REGISTRO publicado de la entidad de una licitación, o null. Es la única
   búsqueda en el hash: la usan `competenciaDe` (el badge) y `hechosDeEntidad`
   (el plazo de adjudicación del calendario), para que las dos no puedan
   resolver la misma entidad de dos formas.
   ORDEN DE BÚSQUEDA, y este orden es la corrección (ago 2026):
     1. la clave canónica — el nombre es EXACTO y solo puede ser esta entidad;
     2. la clave legado — el hash que hay hoy en producción está escrito así y
        no se purga nunca: sin este paso, desplegar dejaría todo en ⚪ hasta
        que alguien reconstruyera el índice a mano;
     3. el alias por NIT, y solo entonces — es el más DÉBIL de los tres porque
        un NIT lo comparten las regionales de un mismo organismo. Antes iba
        PRIMERO, así que una entidad con el nombre bien escrito y su propio
        registro en el índice acababa enseñando las cifras de su hermana.
   El escritor ya no publica alias ambiguos; este orden protege además al hash
   viejo, que sí los tiene. */
function registroDe(indice, lic) {
  if (!indice || !lic) return null;
  const { clave, claveLegado, aliasNit } = claveEntidad(lic);
  const en = (k) => (k && Object.prototype.hasOwnProperty.call(indice, k) ? indice[k] : null);
  let m = en(clave) || en(claveLegado) || en(aliasNit);
  if (m && m.ref) m = en(m.ref);
  return m || null;
}

/* Los hechos de cierre de la entidad de una licitación (M-DGF-08): cuánto
   tarda en adjudicar y cuántos declara desiertos, tal como los publicó el
   hash. `{plazo_adjudicacion: null, desiertos: null}` sin índice o sin registro. */
function hechosDeEntidad(indice, lic) {
  return hechosDeRegistro(registroDe(indice, lic));
}

function competenciaDe(indice, lic) {
  if (!indice) return SIN_DATO;
  const m = registroDe(indice, lic);
  if (!m) return SIN_DATO;
  // `numero()` y no un `||`: un conteo que llegue como cadena ("3") o como
  // basura no puede colarse como truthy y arrastrar consigo un promedio
  const procesos = Math.max(0, Math.trunc(numero(m.procesos ?? m.procesos_contados) || 0));
  const extra = extraDe(m);
  if (procesos < MIN_PROCESOS) return sinDatoCon(procesos, extra);
  if (!NIVELES_CLASIFICADOS.includes(m.nivel)) return sinDatoCon(procesos, extra);
  const promedio = numero(m.promedio);
  if (promedio == null) return sinDatoCon(procesos, extra); // nivel sin promedio: no hay nada que enseñar
  return {
    nivel: m.nivel,
    promedio_oferentes: promedio,
    mediana_oferentes: numero(m.mediana),
    total_procesos: procesos,
    ...(extra || {}),
  };
}

module.exports = {
  // `numero` y `primero` se exportan para que el censo de columnas
  // (lib/columnas_historicas) resuelva los campos con las MISMAS reglas que usa
  // este módulo para leerlos: si divergieran, el diagnóstico informaría de una
  // columna que el índice no mira, o al revés.
  numero, primero,
  MIN_PROCESOS, OFERENTES_CAMPOS, CAMPOS_ADJUDICACION,
  CAMPOS_ADJUDICATARIO, CAMPOS_ADJUDICATARIO_NIT, CAMPOS_VALOR_ADJUDICADO, CAMPOS_FECHA_ADJUDICACION,
  oferentesDe, esAdjudicado, esDesierto, adjudicacionAfirmada, desenlaceDe, cuentaParaCompetencia, claveEntidad, claveCanonica,
  cortesTertiles, nivelPorCortes, medianaHistograma, percentilHistograma, registroPublicado,
  construirIndice, leerIndice, leerIndiceMeta, competenciaDe, registroDe,
  // M-DGF-08: hechos de cierre (plazo de adjudicación en días hábiles y desiertos)
  plazoAdjudicacionDe, hechosDeRegistro, hechosDeEntidad,
  // 23-sep-2026: quién gana (por entidad) y el perfil del competidor — un cálculo que llaman el índice y el detalle
  valorAdjudicadoDe, primeraFecha, TOP_GANADORES, tipoIdentificacion, nuevoAcumuladorGanadores, acumularGanador, ganadoresDe,
  nuevoAcumuladorPerfil, acumularPerfil, perfilDe, perfilCompacto, perfilExpandido, nuevoQuienGana, acumularQuienGana,
  // encogimiento (A2/A3): se exportan para poder probar el estimador aislado
  estimarEncogimiento, encogerEntidad, anioDe, MIN_ENTIDADES_ESTIMACION,
  medirColision, diaCierreDe, medirPeriodos, VENTANA_GARANTIAS_2026, medirProrroga,
  estimarPriorDepartamental, priorDe, MIN_PROCESOS_DEPTO,
};
