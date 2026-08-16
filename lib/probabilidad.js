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

   DE DÓNDE SALEN LOS RIVALES ESPERADOS (ago 2026 · A2/A3 de
   docs/PROBABILIDAD_MEJORADA.md) — nunca un neutro inventado:
     1. `rivales_estimados` de la ENTIDAD, si el índice de competencia lo trae:
        r̂ = w·r̄_e + (1−w)·μ, con w = n_e/(n_e+m). Es la media posterior
        gamma-Poisson: los datos propios de la entidad pesan lo que valen
        (`peso_datos`) y el resto lo pone el promedio global μ. Vale para TODAS
        las entidades del índice, también las que tienen 1-4 procesos — antes
        esas caían al respaldo y UN proceso más en el histórico multiplicaba la
        probabilidad por 2,60 (de 5 rivales inventados a 2 medidos) sin que el
        mercado hubiera cambiado. `fuente` sigue diciendo "entidad" y además
        viajan `peso_datos` y `encogido:true`.
     2. promedio histórico de LA ENTIDAD (`promedio_oferentes`, ≥5 procesos)
        — es lo que hay cuando el hash de producción es anterior al
        encogimiento (`indice:competencia` no se purga nunca): mismo
        comportamiento que antes hasta que alguien reconstruya el índice.
     3. promedio de SU DEPARTAMENTO      (cuando la entidad no tiene base)
     4. PROMEDIO_CONSERVADOR = 5         (P = 1/6; deliberadamente pesimista)
   La fuente usada viaja SIEMPRE en la respuesta: una probabilidad sin su origen
   no se puede auditar ni discutir.

   LA BANDA. Con `rivales_desv` (√Var de la posterior, publicada por el índice)
   se publican `p_lo`/`p_hi` = la misma cadena evaluada en r̂ ± 1,645·σ. Es la
   respuesta honesta a «diferenciar pocos datos de muchos datos»: no un
   multiplicador, una banda que se estrecha con n_e. `ordenar_por=ve_conservador`
   ordena por la cota inferior (opción, no default).

   LOS TRES AJUSTES, y por qué cada uno:
     · cierre prorrogado ×1,20   una entidad mueve el cierre casi siempre porque
                                 NO llegaron ofertas suficientes. Es la única
                                 señal de competencia observable ANTES del cierre
                                 que existe en el corpus (el contador de
                                 oferentes es ex-post: en un proceso abierto vale
                                 0 por construcción). Sale gratis del dedup de
                                 lectura, que ya recorre todas las versiones de
                                 cada `_k` — ver lib/almacen.leerChunksDedup.
     · PRECIO (A4)               f_precio = mult( min(b_max, b_mkt) ), donde
                                 b_mkt es la baja mediana de la celda (índice de
                                 baja) y b_max la baja MÁXIMA que el dueño puede
                                 aceptar sin perder plata (`baja_maxima_pct` del
                                 contexto: la del APU del proceso o la declarada;
                                 sin declarar ⇒ b_max = b_mkt ⇒ f = 1). `mult` es
                                 LA MISMA CURVA de lib/apu/rentabilidad
                                 (`multiplicadorPrecio`: 25 % «menor valor» +
                                 75 % métodos centrales, normalizada a 1 en la
                                 mediana). Lo que mueve la probabilidad no es
                                 dónde está el centro del mercado sino a qué
                                 distancia de él puedo ofertar sin perder plata.
     · colisión de cierres ×1,15 si la misma entidad cierra varios procesos el
                                 mismo día, los rivales —firmas de 1 a 20
                                 personas con el mismo cuello de botella de
                                 ingeniería— se reparten entre ellos.

   Los factores de prórroga y colisión son SUPUESTOS declarados, no
   coeficientes ajustados: no hay etiqueta (no se sabe qué se ganó y qué se
   perdió) contra la que calibrarlos. Por eso son constantes con nombre, viven
   aquí y cada una viaja en el desglose de la respuesta.

   ── `p` Y `p_sin_precio` SON DOS CIFRAS, y el editor consume la SEGUNDA (A5) ─
   `p_sin_precio` es la cadena SIN el factor de precio: base × prórroga ×
   colisión. `/api/apu?op=rentabilidad` la toma como `p_base` y allí
   `pGanarPorPrecio` aplica el precio UNA vez, con la baja que el dueño está
   ofertando de verdad. Hasta ago 2026 el editor recibía la `p` ya multiplicada
   por la rampa de baja y volvía a modular por precio: el precio se cobraba DOS
   VECES (§2.5c del doc), y ofertar exactamente en la mediana costaba un 15 %
   de probabilidad en las entidades que descuentan.

   ── LO QUE SE RETIRÓ, PARA QUE NADIE LO VUELVA A PONER ─────────────────────
   1. EL AJUSTE POR TERTIL DE COMPETENCIA (×1,30 / ×0,70) — era el MISMO dato
      dos veces: `competencia.nivel` es el tertil del promedio que ya está en
      `rivales`. Sigue viajando, filtrando y ordenando; ya no multiplica.
   2. LA RAMPA DE BAJA (×1,10 hasta 2 % … ×0,85 desde 5 %). Penalizaba a una
      entidad por dónde está el CENTRO de su mercado: dos entidades con la misma
      competencia, cada oferente en su centro, daban 0,25 y 0,2125 — «falso como
      probabilidad de ganar»: si estoy en el centro de mi mercado mi posición
      frente a los rivales es idéntica; lo que cambia es el MARGEN, no las veces
      que gano. Era una penalización de margen disfrazada de probabilidad. Y el
      ×1,10 se retira SIN sustituto: «se puede ofertar cerca del oficial» es
      buena noticia para el margen, no una probabilidad más alta. La baja de la
      entidad SIGUE en la tarjeta como instrucción de precio («para tener opción
      hay que ofertar ~5 % por debajo») y en `ordenar_por=baja`; lo que ya no
      hace es multiplicar sin saber cuánto puede bajar el dueño.
   3. EL CORTE DURO EN 5 PROCESOS como estimador (ver arriba). El mínimo de 5
      sigue mandando sobre lo que se PUBLICA como promedio y sobre el badge.

   ── UNA SOLA CUENTA, TRES LECTORES ─────────────────────────────────────────
   `trazaP` es la implementación; `estimarPDetalle` es su vista redondeada y
   `lib/probabilidad_desglose` su vista narrada. La traza publica la cadena
   multiplicativa SIN REDONDEAR (p antes y después de cada ajuste). Repetir la
   cuenta para poder explicarla era la alternativa obvia y es justo la que este
   proyecto ya pagó cara (`total_procesos`/`procesos_contados`): dos cuentas
   «equivalentes hoy» divergen a la primera corrección que se aplique a una
   sola, y aquí la divergencia sería entre el número que enseña la tarjeta y el
   número que lo justifica.
   ========================================================================== */
"use strict";

const PROMEDIO_CONSERVADOR = 5;      // sin ningún dato: P = 1/(1+5) = 0,1666…
const FACTOR_CIERRE_PRORROGADO = 1.20;
const FACTOR_COLISION_CIERRES = 1.15;
/* Techo: ni con todo a favor esta cuenta puede afirmar una cuasi-certeza. El
   modelo no ve inhabilidades, RUP vencido, experiencia específica del pliego ni
   indicadores financieros exigidos — todo eso puede tumbar la oferta y no está
   en los datos abiertos. */
const P_MAXIMA = 0.95;
const P_MINIMA = 0.01;
/* z de la banda: 90 % central de la posterior de r̂ (±1,645·σ). */
const Z_BANDA = 1.645;

const numero = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};
/* Resolución ÚNICA de todo lo que se publica: base, factores y `p`. Que sea la
   misma en los tres es lo que permite rehacer la cuenta a mano desde la tarjeta. */
const redondear4 = (x) => Math.round(x * 1e4) / 1e4;

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

/* Rivales ENCOGIDOS de la entidad (índice reconstruido con A2). `null` si el
   registro no los trae — hash anterior al encogimiento — o si son basura. */
function rivalesEncogidos(competencia) {
  const c = competencia || {};
  /* `numero()` no es guarda de ausencia: `Number(null)` es 0. Se descarta la
     ausencia ANTES (la lección de la rampa). */
  if (c.rivales_estimados == null || c.rivales_estimados === "") return null;
  const r = numero(c.rivales_estimados);
  if (r == null || r < 0) return null;
  // la misma guarda para el peso y la desviación: `Number(null)` es 0, y un
  // peso «0» donde hay ausencia diría «los datos propios no pesan nada»
  const w = c.peso_datos == null || c.peso_datos === "" ? null : numero(c.peso_datos);
  const sd = c.rivales_desv == null || c.rivales_desv === "" ? null : numero(c.rivales_desv);
  return {
    rivales: r,
    peso_datos: w != null && w >= 0 && w <= 1 ? w : null,
    desv: sd != null && sd >= 0 ? sd : null,
  };
}

/* ─────────────── el factor de PRECIO (A4) ───────────────
   `baja`: registro de bajaDeMercado (mediana, p25/p75, nivel). `bajaMaxima`: la
   baja máxima que el dueño soporta, en % (o null = no declarada).
   Devuelve null sin centro de mercado (no hay contra qué situar nada). Con
   centro:
     · sin b_max declarada  → factor 1, `origen_b_max: "neutra"`
     · b_max ≥ mediana      → factor 1 (puede jugar en el centro)
     · b_max < mediana      → mult(b_max), calculado con la curva de rentabilidad
   EL TOPE `min(b_max, mediana)` ES DELIBERADO y por eso el listado y el editor
   pueden dar factores distintos para la misma cifra: `b_max` es hasta dónde el
   dueño PUEDE bajar, no lo que va a ofertar. La tarjeta no conoce la oferta y
   asume que, si puede, ofertará en el centro del mercado (la jugada dominante en
   3 de 4 métodos): premiarla por una baja más agresiva que nadie ha decidido
   sería subir la probabilidad con una oferta especulativa. El editor de APU sí
   conoce la baja REAL ofertada y `pGanarPorPrecio` la evalúa sin tope, en las
   dos direcciones — con la MISMA curva.
   La curva se IMPORTA (require diferido: lib/apu/rentabilidad es hoja, pero el
   diferido deja el grafo de este módulo como estaba). PROHIBIDO reimplementarla
   aquí. */
function factorPrecio(baja, bajaMaxima) {
  const b = baja || null;
  if (!b || !b.nivel || b.nivel === "sin_dato") return null;
  if (b.baja_mediana == null || b.baja_mediana === "") return null;
  const mediana = numero(b.baja_mediana);
  if (mediana == null) return null;
  const bmax = bajaMaxima == null || bajaMaxima === "" ? null : numero(bajaMaxima);
  const origen = bmax == null ? "neutra" : "declarada";
  if (bmax == null || bmax >= mediana) {
    return { factor: 1, mediana, b_max: bmax, origen_b_max: origen, ofertable: bmax == null ? mediana : bmax,
      dispersion_pp: null };
  }
  const { multiplicadorPrecio } = require("./apu/rentabilidad.js");
  const c = multiplicadorPrecio({
    baja_ofertada_pct: bmax, baja_mediana_pct: mediana,
    baja_p25: b.baja_p25, baja_p75: b.baja_p75,
  });
  const f = c && Number.isFinite(c.multiplicador) ? c.multiplicador : 1;
  return {
    factor: redondear4(Math.min(1, Math.max(0.01, f))),
    mediana, b_max: bmax, origen_b_max: origen, ofertable: bmax,
    dispersion_pp: c ? Math.round(c.sigma * 100) / 100 : null,
  };
}

/* ─────────────────────── el estimador ───────────────────────
   `contexto`:
     competencia            competenciaDe(indice, lic) — histórico de la entidad
                            (con `rivales_estimados`/`peso_datos`/`rivales_desv`
                            si el índice está reconstruido)
     promedio_departamento  respaldo cuando la entidad no tiene base
     baja                   bajaDeMercado(indiceBaja, lic) — el CENTRO del mercado
     baja_maxima_pct        baja máxima que el dueño soporta (APU o declarada);
                            null ⇒ factor de precio neutro
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
  let rivales = null, fuente = null, pesoDatos = null, desv = null, encogido = false;
  const enc = rivalesEncogidos(contexto.competencia);
  if (enc) {
    rivales = enc.rivales; fuente = "entidad"; pesoDatos = enc.peso_datos; desv = enc.desv; encogido = true;
  } else {
    rivales = promedioDeEntidad(contexto.competencia);
    fuente = rivales != null ? "entidad" : null;
  }
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
  let factorSinPrecio = 1;   // producto de los factores que NO son de precio
  const aplicar = (nombre, factor, motivo, extra = {}) => {
    const antes = p;
    p *= factor;
    if (nombre !== "precio") factorSinPrecio *= factor;
    pasos.push({ nombre, factor, motivo, p_antes: antes, p_despues: p, ...extra });
  };

  /* NO hay ajuste por tertil de competencia, y no es un olvido: el nivel es el
     tertil del MISMO promedio que ya está en `rivales`, así que multiplicar por
     él contaba la competencia dos veces (ver la cabecera). El efecto entra
     ENTERO por `1/(1+rivales)`, que además es continuo. */

  if (l._cierre_prorrogado) {
    aplicar("cierre_prorrogado", FACTOR_CIERRE_PRORROGADO,
      "el cierre se movió por adenda: suele indicar que no llegaron ofertas suficientes");
  }

  /* PRECIO. Con centro de mercado el ajuste viaja SIEMPRE, también cuando el
     factor sale exactamente 1: así «no aparece» solo puede significar «no hay
     baja histórica», y no se vuelve a confundir «no sé» con «no mueve nada». */
  const fp = factorPrecio(contexto.baja, contexto.baja_maxima_pct);
  if (fp) {
    const m = fp.mediana;
    const motivo = fp.origen_b_max === "neutra"
      ? `aquí el que gana descuenta ~${m} %; sin una baja máxima declarada se asume que puede ofertar en ese centro: el precio no resta ni suma`
      : fp.factor >= 1
        ? `puede bajar hasta ${fp.b_max} % sin perder plata y aquí el que gana descuenta ~${m} %: puede jugar en el centro del mercado`
        : `solo puede bajar hasta ${fp.b_max} % sin perder plata y aquí el que gana descuenta ~${m} %: ofertar por encima del centro cuesta probabilidad`;
    aplicar("precio", fp.factor, motivo, {
      baja_mediana_pct: m, baja_maxima_pct: fp.b_max, origen_b_max: fp.origen_b_max,
      baja_ofertable_pct: fp.ofertable, dispersion_pp: fp.dispersion_pp,
    });
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
  const limitar = (x) => Math.min(P_MAXIMA, Math.max(P_MINIMA, x));
  p = limitar(p);

  /* p SIN precio: la misma cadena sin el factor de precio, con los mismos
     límites. Es lo que consume el editor de APU como `p_base` (A5). */
  let pSinPrecio = base * factorSinPrecio;
  if (!Number.isFinite(pSinPrecio)) pSinPrecio = 1 / (1 + PROMEDIO_CONSERVADOR);
  pSinPrecio = limitar(pSinPrecio);

  /* La BANDA: la cadena entera evaluada en r̂ ± z·σ. Sin `rivales_desv` no hay
     banda (null, jamás ±0: «no sé cuánto vale la banda» no es «la banda es
     nula»). r̂ − z·σ no puede bajar de 0 rivales. */
  let pLo = null, pHi = null;
  if (encogido && desv != null && Number.isFinite(pAntesDeLimites)) {
    const factores = base > 0 ? pAntesDeLimites / base : 1;
    pLo = limitar(redondear4(1 / (1 + rivales + Z_BANDA * desv)) * factores);
    pHi = limitar(redondear4(1 / (1 + Math.max(0, rivales - Z_BANDA * desv))) * factores);
    if (!Number.isFinite(pLo) || !Number.isFinite(pHi)) { pLo = null; pHi = null; }
  }

  return {
    rivales, fuente, base, pasos,
    encogido, peso_datos: pesoDatos, rivales_desv: desv,
    // lo que salió de la cadena, antes de la guarda de finitud y de los límites
    p_antes_de_limites: pAntesDeLimites,
    no_finito: noFinito,
    // `limite` dice si el clamp MORDIÓ, que es distinto de que exista
    limite: p > pSinLimitar ? "piso" : p < pSinLimitar ? "techo" : null,
    p,
    p_sin_precio: pSinPrecio,
    p_lo: pLo, p_hi: pHi,
    p_minima: P_MINIMA,
    p_maxima: P_MAXIMA,
  };
}

/* Vista redondeada: el contrato que consumen /api/oportunidades, /api/resumen y
   el editor de APU. No calcula nada — proyecta la traza. Los campos de siempre
   (`p`, `base`, `rivales_esperados`, `fuente`, `ajustes`) conservan nombre,
   posición y redondeo; los nuevos se añaden. */
function estimarPDetalle(lic, contexto = {}) {
  const t = trazaP(lic, contexto);
  return {
    p: redondear4(t.p),
    base: t.base,                          // ya viene redondeada desde `trazaP`
    rivales_esperados: Math.round(t.rivales * 100) / 100,
    fuente: t.fuente,
    ajustes: t.pasos.map(({ nombre, factor, motivo }) => ({ nombre, factor, motivo })),
    // A5: lo que consume el editor como p_base
    p_sin_precio: redondear4(t.p_sin_precio),
    // A3/A6: cuánto pesan los datos propios de la entidad y la banda
    encogido: t.encogido,
    peso_datos: t.peso_datos,
    p_lo: t.p_lo == null ? null : redondear4(t.p_lo),
    p_hi: t.p_hi == null ? null : redondear4(t.p_hi),
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

/* A7 · lectura de la MEDICIÓN de la colisión (lib/indice_competencia.medirColision)
   frente al factor vigente. Vive aquí porque aquí vive la constante; el índice
   mide y no opina. No cambia el factor solo: dice cuánto vale lo medido y una
   persona decide (docs/PROBABILIDAD_MEJORADA.md §9.3: ≈1 ⇒ retirar). */
function leerColision(medicion) {
  // `Number(null)` es 0: la ausencia se descarta ANTES de convertir (la regla de siempre)
  const crudo = medicion ? medicion.multiplicador_implicito : null;
  const m = crudo == null || crudo === "" || !Number.isFinite(Number(crudo)) ? null : Number(crudo);
  const F = FACTOR_COLISION_CIERRES;
  const lectura = m == null ? "sin medición: no hay entidades con procesos en colisión y de control a la vez"
    : Math.abs(m - 1) < 0.03 ? `el efecto medido es ≈1 (${m}): cerrar varios procesos el mismo día NO cambia las ofertas recibidas; el factor ${F} no está respaldado por el histórico`
      : m > 1 ? `los procesos que cierran el mismo día reciben MENOS ofertas: multiplicador implícito ${m} frente al ${F} vigente`
        : `los procesos que cierran el mismo día reciben MÁS ofertas (${m} < 1): el factor ${F} va en la dirección CONTRARIA a lo medido`;
  return { ...(medicion || {}), factor_vigente: F, lectura };
}

module.exports = {
  estimarPDetalle, trazaP, valorEsperado, leerColision,
  promediosPorDepartamento, indiceColisionCierres, claveColision, promedioDeEntidad,
  // se exportan para probarlos AISLADOS: la neutralidad del precio sin b_max y
  // la lectura del encogimiento son propiedades suyas, no de la cadena entera
  factorPrecio, rivalesEncogidos,
  PROMEDIO_CONSERVADOR,
  FACTOR_CIERRE_PRORROGADO, FACTOR_COLISION_CIERRES, P_MAXIMA, P_MINIMA, Z_BANDA,
};
