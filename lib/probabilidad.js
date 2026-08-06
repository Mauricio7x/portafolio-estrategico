/* ============================================================================
   lib/probabilidad · P(ganar) estimada con lo que YA hay en Redis
   ----------------------------------------------------------------------------
   Un número entre 0 y 1 que responde «¿cuántas veces de cada cien me llevaría
   este proceso?». No sustituye a leer el pliego y no es una promesa: es la
   cuenta más honesta que se puede hacer con los datos disponibles.

   ESTRUCTURA:  P ≈ 1 / (1 + rivales esperados)  ·  ajustes observables

   Es la aproximación de reparto uniforme: si se presentan N rivales y todos
   están habilitados, cada uno gana 1 de cada N+1 veces. docs/ATRACTIVIDAD.md
   propone la forma cerrada con binomial negativa (que corrige la
   sobredispersión del contador de oferentes); aquí se usa la versión simple a
   propósito, porque el parámetro de dispersión NO está medido y fingirlo sería
   añadir precisión falsa sobre un dato que ya es ruidoso.

   DE DÓNDE SALEN LOS RIVALES ESPERADOS, en cascada — nunca un neutro inventado:
     1. promedio histórico de LA ENTIDAD   (índice de competencia, 2 años)
     2. promedio de SU DEPARTAMENTO        (cuando la entidad no tiene base)
     3. PROMEDIO_CONSERVADOR = 5           (P = 1/6; deliberadamente pesimista)
   La fuente usada viaja SIEMPRE en la respuesta: una probabilidad sin su origen
   no se puede auditar ni discutir.

   LOS TRES AJUSTES, y por qué cada uno:
     · cierre prorrogado ×1,20   una entidad mueve el cierre casi siempre porque
                                 NO llegaron ofertas suficientes. Es la única
                                 señal de competencia observable ANTES del cierre
                                 que existe en el corpus (el contador de
                                 oferentes es ex-post: en un proceso abierto vale
                                 0 por construcción). Sale gratis del dedup de
                                 lectura, que ya recorre todas las versiones de
                                 cada `_k` — ver lib/almacen.leerChunksDedup.
     · colisión de cierres ×1,15 si la misma entidad cierra varios procesos el
                                 mismo día, los rivales —firmas de 1 a 20
                                 personas con el mismo cuello de botella de
                                 ingeniería— se reparten entre ellos.
     · baja de mercado   RAMPA   de ×1,10 (adjudica por el presupuesto oficial) a
                                 ×0,85 (descuenta ≥5 %), interpolando entre 2 % y
                                 5 %. NO es señal de cuántos rivales hay sino de
                                 A QUÉ PRECIO se adjudica, y por eso multiplica en
                                 vez de entrar en `rivales`: convierte la respuesta
                                 en «P(ganar a un precio que valga la pena)».

   Los factores son SUPUESTOS declarados, no coeficientes ajustados: no hay
   etiqueta (no se sabe qué se ganó y qué se perdió) contra la que calibrarlos.
   Suavizar la baja NO la calibra — 1,10 y 0,85 siguen puestos a mano, solo que
   ahora sin escalones. Por eso son constantes con nombre, viven todas aquí y
   cada una viaja en el desglose de la respuesta.

   ── DOS COSAS QUE SE RETIRARON, PARA QUE NADIE LAS VUELVA A PONER (ago 2026) ─
   Salen de la auditoría de docs/PROBABILIDAD_MEJORADA.md, que las reprodujo
   EJECUTANDO este módulo. Las dos son Fase A del plan de ese documento.

   1. EL AJUSTE POR TERTIL DE COMPETENCIA (×1,30 «baja» / ×0,70 «alta») ERA EL
      MISMO DATO DOS VECES. `competencia.nivel` es el tertil del MISMO promedio
      de oferentes que ya está dentro de `rivales`: no es una segunda señal, es
      la primera aplicada otra vez. Tres consecuencias medidas:
        · saltaba −32 % de probabilidad por MEDIO rival en el corte del tertil;
        · 2 rivales por la entidad daban 0,4333 y 2 por el departamento 0,3333
          — ×1,30 de diferencia por el ORIGEN del dato, no por el mercado,
          porque el respaldo departamental no trae `nivel`;
        · los tertiles son RELATIVOS, así que la probabilidad de un proceso
          cambiaba porque cambiaban OTRAS entidades del índice.
      `competencia.nivel` NO desaparece: sigue viajando en la tarjeta, sigue
      filtrando (`?competencia_entidad=`) y sigue ordenando
      (`?ordenar_por=competencia`). Lo que ya no hace es multiplicar `p`.

   2. LOS DOS ESCALONES DE LA BAJA. Costaban −9,1 % al cruzar el 2 % y −15,0 %
      al cruzar el 5 %. Ahora es una rampa CONTINUA entre los mismos extremos,
      pero hay que contar bien lo que mejora:
      · La rampa suaviza la FUNCIÓN; el DATO sigue cuantizado. `lib/indice_baja`
        publica la mediana como cubeta ENTERA (`Math.round`), así que en
        producción solo existen …2, 3, 4, 5… y lo que se ve es una ESCALERA DE
        CUATRO PELDAÑOS {≤2 → 1,10 · 3 → 1,0167 · 4 → 0,9333 · ≥5 → 0,85}. Lo
        que mejora es la ALTURA del peldaño más alto: del 15,0 % al 8,9 %.
        «Ya no hay saltos» sería falso mientras la mediana sea entera.
      · LAS COMPARACIONES PASARON DE ESTRICTAS A INCLUSIVAS, y eso mueve dos
        valores frecuentes: antes `> 5` y `< 2` dejaban las medianas de
        exactamente 2 y 5 en la zona neutra ×1,00; ahora 2 → ×1,10 y 5 → ×0,85.
        Lo que no se mueve un dígito es el INTERIOR de las mesetas (0, 1, 6, 7…),
        no sus bordes. La ALCALDÍA DE PURIFICACIÓN del corpus tiene mediana
        exactamente 5 y su `p` cae de 0,325 a 0,2125 por las DOS causas a la vez.

   ── LO QUE ESTO NO ARREGLA, Y HAY QUE DECIRLO ─────────────────────────────
   La rampa quita el SALTO, no el defecto SEMÁNTICO que la misma auditoría
   documenta en §2.5c: este factor sigue penalizando a una entidad por dónde está
   el centro de su mercado, cuando lo que debería penalizar es la distancia a la
   que uno puede ofertar de ese centro sin perder plata. Y como
   `/api/apu/[accion].js` consume esta `p` como su `p_base` y `pGanarPorPrecio`
   vuelve a modular por precio, el precio se sigue cobrando DOS VECES. Cerrarlo
   exige separar `p` de `p_sin_precio` y coordinarlo con lib/apu/rentabilidad
   — pasos A4/A5, fuera de este cambio. No dar por resuelto lo que solo está
   suavizado.

   ── UNA SOLA CUENTA, DOS LECTORES (ago 2026) ──────────────────────────────
   `trazaP` es la implementación; `estimarPDetalle` es su vista redondeada y
   `lib/probabilidad_desglose` su vista narrada. La traza publica la cadena
   multiplicativa SIN REDONDEAR (p antes y después de cada ajuste), que es lo
   único que le faltaba al desglose para poder narrar el cálculo en vez de
   repetirlo. Repetirlo era la alternativa obvia y es justo la que este
   proyecto ya pagó cara (`total_procesos`/`procesos_contados`): dos cuentas
   «equivalentes hoy» divergen a la primera corrección que se aplique a una
   sola, y aquí la divergencia sería entre el número que enseña la tarjeta y el
   número que lo justifica — el peor sitio posible para discrepar.

   `estimarPDetalle` conserva EXACTAMENTE su contrato anterior (mismos campos,
   mismos valores, mismos redondeos): media app lo consume y la traza es un
   canal nuevo, no un cambio de la respuesta.
   ========================================================================== */
"use strict";

const PROMEDIO_CONSERVADOR = 5;      // sin ningún dato: P = 1/(1+5) = 0,1666…
const FACTOR_CIERRE_PRORROGADO = 1.20;
const FACTOR_COLISION_CIERRES = 1.15;
/* Baja de mercado de la entidad (lib/indice_baja). Es una señal de PRECIO, no
   de número de rivales, y por eso entra como ajuste y no dentro de `rivales`:
   una entidad que adjudica sistemáticamente 8 % por debajo del presupuesto
   obliga a bajar para ganar, y bajar es exactamente lo que se quiere evitar.
   La lectura correcta de este factor es «probabilidad de ganar A UN PRECIO QUE
   VALGA LA PENA», que es la única que le sirve al dueño.

   Los cuatro números de abajo son los MISMOS de siempre; lo que cambió es que
   dejaron de ser un escalón y pasaron a ser los EXTREMOS de una rampa. */
const FACTOR_BAJA_ALTA = 0.85;   // mediana ≥ 5 %: hay que descontar mucho
const FACTOR_BAJA_BAJA = 1.10;   // mediana ≤ 2 %: se adjudica cerca del oficial
const BAJA_ALTA_DESDE = 5;
const BAJA_BAJA_HASTA = 2;
/* Techo: ni con todo a favor esta cuenta puede afirmar una cuasi-certeza. El
   modelo no ve inhabilidades, RUP vencido, experiencia específica del pliego ni
   indicadores financieros exigidos — todo eso puede tumbar la oferta y no está
   en los datos abiertos. */
const P_MAXIMA = 0.95;
const P_MINIMA = 0.01;

const numero = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};
/* Resolución ÚNICA de todo lo que se publica: base, factores y `p`. Que sea la
   misma en los tres es lo que permite rehacer la cuenta a mano desde la tarjeta. */
const redondear4 = (x) => Math.round(x * 1e4) / 1e4;

/* ─────────────── la rampa de la baja de mercado ───────────────
       ×1,10 ┤━━━━━━━━━━┓
             │           ┗━━┓                 cruza ×1,00 en baja = 3,2 %
       ×1,00 ┤ · · · · · · ·╳· · · · · ·
             │              ┗━━┓
       ×0,85 ┤                  ┗━━━━━━━━━━━━━
             └────┬───────┬─────┬────────────→  baja mediana (%)
                  0       2     5
   CONTINUA (ese era el defecto: 4,9 % y 5,1 % son la misma entidad medida dos
   veces y recibían un 15 % de diferencia), MONÓTONA no creciente, y con los
   EXTREMOS de siempre. Se aplica REDONDEADA y es esa misma cifra la que viaja en
   el desglose: publicar un factor y multiplicar por otro haría de la explicación
   algo que no da su propio resultado. */
function factorBaja(mediana) {
  /* `numero()` NO sirve de guarda: `Number(null)` y `Number("")` son 0, los dos
     finitos, así que un «sin dato» entraría como baja del 0 % y saldría con
     ×1,10 — «no sé» convertido en «adjudica por el presupuesto oficial». La
     ausencia se descarta ANTES de tocar `Number`. */
  if (mediana == null || mediana === "") return null;
  const m = numero(mediana);
  if (m == null) return null;
  if (m <= BAJA_BAJA_HASTA) return FACTOR_BAJA_BAJA;
  if (m >= BAJA_ALTA_DESDE) return FACTOR_BAJA_ALTA;
  const t = (m - BAJA_BAJA_HASTA) / (BAJA_ALTA_DESDE - BAJA_BAJA_HASTA);
  return redondear4(FACTOR_BAJA_BAJA + (FACTOR_BAJA_ALTA - FACTOR_BAJA_BAJA) * t);
}

/* Promedio de oferentes utilizable de una entidad. Misma invariante que el
   badge de la tarjeta (lib/indice_competencia.competenciaDe): un promedio sin
   procesos contados detrás NO es un promedio. */
function promedioDeEntidad(competencia) {
  const c = competencia || {};
  const procesos = Number(c.total_procesos) || 0;
  const promedio = numero(c.promedio_oferentes);
  if (procesos <= 0 || !c.nivel || c.nivel === "sin_dato" || promedio == null || promedio < 0) return null;
  return promedio;
}

/* ─────────────────────── el estimador ───────────────────────
   `contexto`:
     competencia            competenciaDe(indice, lic) — histórico de la entidad
     promedio_departamento  respaldo cuando la entidad no tiene base
     baja                   bajaDeMercado(indiceBaja, lic) — señal de PRECIO
     colision_cierres       nº de procesos de la MISMA entidad que cierran el
                            MISMO DÍA (incluido este); >1 activa el ajuste.
                            OJO: es el mismo día exacto, no una ventana de días.
                            La clave la fabrica `claveColision` con `entidad|
                            YYYY-MM-DD`, y ensancharla a una ventana cambiaría la
                            probabilidad de todos los procesos del corpus.

   `trazaP` es la ÚNICA implementación. Devuelve la cadena multiplicativa sin
   redondear —`p_antes`/`p_despues` de cada paso— para que quien tenga que
   EXPLICAR el número no tenga que volver a calcularlo. `estimarPDetalle` es su
   vista redondeada: el contrato que consume la app. */
function trazaP(lic, contexto = {}) {
  const l = lic || {};
  let rivales = promedioDeEntidad(contexto.competencia);
  let fuente = "entidad";
  if (rivales == null) {
    rivales = numero(contexto.promedio_departamento);
    fuente = rivales != null && rivales >= 0 ? "departamento" : null;
  }
  if (rivales == null || rivales < 0) { rivales = PROMEDIO_CONSERVADOR; fuente = "conservador"; }

  /* La base se REDONDEA aquí, no al publicarla. Publicando `round(base)` pero
     multiplicando por la base cruda, `base × Π factores` se desviaba de `p` en
     hasta 1,2e-4 —más de una unidad del último decimal publicado— en el 95 % de
     los casos: la tarjeta enseñaba una cuenta que no daba su propio resultado.
     Redondeando una sola vez, al principio, la única diferencia que queda es el
     redondeo final de `p`: media unidad del último decimal. La cadena de `pasos`
     sigue SIN redondear a partir de ahí, que es lo que necesita el desglose. */
  const base = redondear4(1 / (1 + rivales));
  const pasos = [];
  let p = base;
  /* Cada ajuste se registra CON la p de entrada y la de salida sin redondear.
     Es lo que permite que el desglose reparta puntos porcentuales sobre la
     cadena real en vez de reconstruirla a ojo desde los factores. */
  const aplicar = (nombre, factor, motivo) => {
    const antes = p;
    p *= factor;
    pasos.push({ nombre, factor, motivo, p_antes: antes, p_despues: p });
  };

  /* NO hay ajuste por tertil de competencia, y no es un olvido: el nivel es el
     tertil del MISMO promedio que ya está en `rivales`, así que multiplicar por
     él contaba la competencia dos veces (ver la cabecera). El efecto entra
     ENTERO por `1/(1+rivales)`, que además es continuo. */

  if (l._cierre_prorrogado) {
    aplicar("cierre_prorrogado", FACTOR_CIERRE_PRORROGADO,
      "el cierre se movió por adenda: suele indicar que no llegaron ofertas suficientes");
  }

  /* Baja de mercado. Se exige `nivel` clasificado antes de mirar la mediana:
     `bajaDeMercado` ya garantiza que una cifra sin base llega como `sin_dato`
     con la mediana en null, y comprobar las dos cosas hace que este ajuste no
     dependa de que el otro módulo nunca falle. */
  const baja = contexto.baja || null;
  /* OJO: aquí NO se llama a `numero()`. Llamarlo dejaba la guarda de
     `factorBaja` en código muerto —`numero(null)` es 0, finito— así que un
     registro con el nivel clasificado y la mediana en `null` entraba como «baja
     del 0 %» y salía premiado con ×1,10. Ese registro EXISTE: `indice:baja` no
     se purga nunca y un hash de una versión anterior puede traerlo. */
  const medianaBaja = baja && baja.nivel && baja.nivel !== "sin_dato" ? baja.baja_mediana : null;
  const fBaja = factorBaja(medianaBaja);
  if (fBaja != null) {
    const m = numero(medianaBaja);
    /* UN solo ajuste, y se emite SIEMPRE que haya dato — también cuando el
       factor sale exactamente 1. Con una función continua, «no aparece el
       ajuste» solo puede significar «no hay baja histórica»; si además
       significara «hay dato y no mueve nada», el desglose volvería a confundir
       «no sé» con «cero». */
    aplicar("baja_mercado", fBaja,
      fBaja > 1
        ? `la entidad adjudica cerca del presupuesto oficial (~${m} % de baja): se puede ofertar alto`
        : fBaja < 1
          ? `la entidad adjudica ~${m} % por debajo del presupuesto: ganar exige descontar`
          : `la entidad adjudica ~${m} % por debajo del presupuesto: ni ayuda ni estorba`);
  }

  const colision = Number(contexto.colision_cierres) || 0;
  if (colision > 1) {
    aplicar("colision_cierres", FACTOR_COLISION_CIERRES,
      `la entidad cierra ${colision} procesos el mismo día: los rivales se reparten`);
  }

  // guarda dura: nada no finito puede salir de aquí. Un NaN en el orden no
  // explota — `sort` lo trata como «iguales» y la lista degrada en silencio al
  // orden de lectura de los chunks, con 200 OK (docs/ATRACTIVIDAD.md, R-NaN).
  const pAntesDeLimites = p;
  const noFinito = !Number.isFinite(p);
  if (noFinito) p = 1 / (1 + PROMEDIO_CONSERVADOR);
  const pSinLimitar = p;
  p = Math.min(P_MAXIMA, Math.max(P_MINIMA, p));

  return {
    rivales, fuente, base, pasos,
    // lo que salió de la cadena, antes de la guarda de finitud y de los límites
    p_antes_de_limites: pAntesDeLimites,
    no_finito: noFinito,
    // `limite` dice si el clamp MORDIÓ, que es distinto de que exista
    limite: p > pSinLimitar ? "piso" : p < pSinLimitar ? "techo" : null,
    p,
    p_minima: P_MINIMA,
    p_maxima: P_MAXIMA,
  };
}

/* Vista redondeada: el contrato que consumen /api/oportunidades, /api/resumen y
   el editor de APU. No calcula nada — proyecta la traza. */
function estimarPDetalle(lic, contexto = {}) {
  const t = trazaP(lic, contexto);
  return {
    p: redondear4(t.p),
    base: t.base,                          // ya viene redondeada desde `trazaP`
    rivales_esperados: Math.round(t.rivales * 100) / 100,
    fuente: t.fuente,
    ajustes: t.pasos.map(({ nombre, factor, motivo }) => ({ nombre, factor, motivo })),
  };
}


/* Valor esperado en COP. No es «lo que se gana»: es la cuantía ponderada por la
   probabilidad de llevársela. El margen real (docs/ATRACTIVIDAD.md lo llama
   `m`) no se puede estimar desde datos públicos —el dataset no trae costos— así
   que aquí NO se inventa: VE queda en unidades de contrato, comparable entre
   procesos, y el dueño aplica su margen mentalmente. */
function valorEsperado(lic, p) {
  const cuantia = Number((lic && (lic.cuantia_cop ?? lic.precio_base)) || 0);
  const prob = Number(p) || 0;
  const ve = cuantia * prob;
  return Number.isFinite(ve) ? Math.round(ve) : 0;
}

/* Promedio de oferentes por DEPARTAMENTO, derivado del mismo índice por entidad
   que ya se lee para las tarjetas: se pondera cada entidad por sus procesos
   contados, que es lo que hace comparable a una alcaldía con 3 procesos con una
   gobernación con 40. Se calcula una vez por petición sobre el corpus ya
   deduplicado en memoria — cero comandos de Redis. */
function promediosPorDepartamento(filas, competenciaDe) {
  const acc = new Map();
  const vistas = new Set();
  for (const l of filas || []) {
    const depto = String(l.departamento_entidad || "").trim().toUpperCase();
    if (!depto) continue;
    const c = competenciaDe(l);
    const prom = promedioDeEntidad(c);
    if (prom == null) continue;
    // una entidad aporta UNA vez a su departamento, no una por proceso: si no,
    // la entidad que más publica arrastraría el promedio del departamento entero
    const clave = `${depto}|${String(l.entidad || "").trim().toUpperCase()}`;
    if (vistas.has(clave)) continue;
    vistas.add(clave);
    const peso = Math.max(1, Number(c.total_procesos) || 1);
    const a = acc.get(depto) || { suma: 0, peso: 0, entidades: 0 };
    a.suma += prom * peso; a.peso += peso; a.entidades++;
    acc.set(depto, a);
  }
  const salida = new Map();
  for (const [depto, a] of acc) {
    if (a.peso > 0) salida.set(depto, Math.round((a.suma / a.peso) * 100) / 100);
  }
  return salida;
}

/* Procesos de la MISMA entidad que cierran el MISMO día. Clave por entidad +
   día local de la fecha de cierre; los procesos sin fecha de cierre no cuentan
   (no se puede colisionar con una fecha que no existe). */
function indiceColisionCierres(filas) {
  const cuenta = new Map();
  for (const l of filas || []) {
    const k = claveColision(l);
    if (!k) continue;
    cuenta.set(k, (cuenta.get(k) || 0) + 1);
  }
  return cuenta;
}

function claveColision(l) {
  if (!l || !l.fecha_cierre) return null;
  const d = String(l.fecha_cierre).slice(0, 10); // YYYY-MM-DD tal como viene
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return null;
  const ent = String(l.nit_entidad || l.entidad || "").trim().toUpperCase();
  if (!ent) return null;
  return `${ent}|${d}`;
}

module.exports = {
  estimarPDetalle, trazaP, valorEsperado,
  promediosPorDepartamento, indiceColisionCierres, claveColision, promedioDeEntidad,
  // `factorBaja` se exporta para poder probar la rampa AISLADA: continuidad y
  // monotonía son propiedades de la función, y comprobarlas a través de
  // `estimarPDetalle` las mezclaría con el clamp y con los otros dos factores.
  factorBaja,
  PROMEDIO_CONSERVADOR,
  FACTOR_CIERRE_PRORROGADO, FACTOR_COLISION_CIERRES, P_MAXIMA, P_MINIMA,
  FACTOR_BAJA_ALTA, FACTOR_BAJA_BAJA, BAJA_ALTA_DESDE, BAJA_BAJA_HASTA,
};
