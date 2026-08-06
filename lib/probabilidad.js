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
                                 ×0,85 (descuenta ≥5 %). NO es señal de cuántos
                                 rivales hay sino de A QUÉ PRECIO se adjudica, y
                                 por eso multiplica en vez de entrar en
                                 `rivales`: convierte la respuesta en «P(ganar a
                                 un precio que valga la pena)», que es la útil.

   Los factores son SUPUESTOS declarados, no coeficientes ajustados: no hay
   etiqueta (no se sabe qué se ganó y qué se perdió) contra la que calibrarlos.
   Suavizar la baja NO la calibra — sigue siendo 1,10 y 0,85 puestos a mano, solo
   que ahora sin saltos. Por eso son constantes con nombre, viven todas aquí y
   cada una viaja en el desglose de la respuesta.

   ── DOS COSAS QUE SE RETIRARON, PARA QUE NADIE LAS VUELVA A PONER (ago 2026) ─
   Salen de la auditoría de docs/PROBABILIDAD_MEJORADA.md, que las reprodujo
   EJECUTANDO este módulo. Las dos son Fase A del plan de ese documento.

   1. EL AJUSTE POR TERTIL DE COMPETENCIA (×1,30 «baja» / ×0,70 «alta») ERA EL
      MISMO DATO DOS VECES. `competencia.nivel` es el tertil del MISMO promedio
      de oferentes que ya está dentro de `rivales`: no es una segunda señal, es
      la primera aplicada otra vez. Tres consecuencias medidas:
        · saltaba −32 % de probabilidad por MEDIO rival en el corte del tertil;
        · 2 rivales por la entidad daban 0,4333 y 2 rivales por el departamento
          0,3333 — ×1,30 de diferencia por el ORIGEN del dato, no por el mercado,
          porque el respaldo departamental no trae `nivel`;
        · los tertiles son RELATIVOS, así que la probabilidad de un proceso
          cambiaba porque cambiaban OTRAS entidades del índice.
      No añadía información: añadía dispersión, y más de la que tiene la realidad
      (σ 0,121 contra 0,104 de la probabilidad verdadera en simulación).
      `competencia.nivel` NO desaparece: sigue viajando en la tarjeta, sigue
      filtrando (`?competencia_entidad=`) y sigue ordenando
      (`?ordenar_por=competencia`). Lo que ya no hace es multiplicar `p`.

   2. LOS DOS ESCALONES DE LA BAJA. Costaban −9,1 % de probabilidad al cruzar el
      2 % y −15,0 % al cruzar el 5 %, sobre una mediana que el índice publica con
      resolución de UN punto porcentual (histograma de enteros): dos entidades
      con 4,9 % y 5,1 % de baja son la misma entidad medida dos veces, y recibían
      un 15 % de diferencia. Ahora es una rampa continua entre los MISMOS dos
      extremos, así que los valores fuera de [2, 5] no se mueven ni un dígito y
      solo cambia la banda intermedia, donde antes había un escalón.

   ── LO QUE ESTO NO ARREGLA, Y HAY QUE DECIRLO ─────────────────────────────
   La rampa quita el SALTO, no el defecto SEMÁNTICO que la misma auditoría
   documenta en §2.5c: este factor sigue penalizando a una entidad por dónde está
   el centro de su mercado, cuando lo que debería penalizar es la distancia a la
   que uno puede ofertar de ese centro sin perder plata. Y como
   `/api/apu/[accion].js` consume esta `p` como su `p_base` y `pGanarPorPrecio`
   vuelve a modular por precio, el efecto del precio se sigue cobrando DOS VECES.
   Cerrarlo exige separar `p` de `p_sin_precio` y coordinarlo con
   lib/apu/rentabilidad — pasos A4/A5 del plan, deliberadamente fuera de este
   cambio. No dar por resuelto lo que solo está suavizado.
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
   dejaron de ser un escalón y pasaron a ser los EXTREMOS de una rampa. Siguen
   siendo supuestos puestos a mano: suavizar no es calibrar. */
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

/* ─────────────── la rampa de la baja de mercado ───────────────
   Antes eran dos escalones; ahora es una función continua entre los MISMOS dos
   extremos, plana fuera de la banda:

       ×1,10 ┤━━━━━━━━━━┓
             │           ┗━━┓                 cruza ×1,00 en baja = 3,2 %
       ×1,00 ┤ · · · · · · ·╳· · · · · ·
             │              ┗━━┓
       ×0,85 ┤                  ┗━━━━━━━━━━━━━
             └────┬───────┬─────┬────────────→  baja mediana (%)
                  0       2     5

   Propiedades que hay que conservar y que la suite vigila:
     · CONTINUA — ese era el defecto: 4,9 % y 5,1 % de baja son la misma entidad
       medida dos veces (el índice publica con resolución de 1 punto porcentual)
       y recibían un 15 % de diferencia de probabilidad.
     · MONÓTONA no creciente: más descuento exigido nunca puede subir la
       probabilidad de ganar a un precio que valga la pena.
     · EXTREMOS IDÉNTICOS a los de antes. Fuera de [2, 5] no se mueve un solo
       dígito, y ahí es donde está la masa: la mediana de baja del mercado
       colombiano es 0 % (lib/indice_baja), o sea ×1,10 en los dos regímenes.
       Lo único que cambia es la banda intermedia, donde antes había un escalón.
   Se aplica REDONDEADA a cuatro decimales, y es esa misma cifra redondeada la
   que viaja en el desglose: así `base × Π factores` reproduce `p` a mano desde
   la tarjeta. Publicar un factor y multiplicar por otro haría del desglose una
   explicación que no cuadra con su propio resultado. */
function factorBaja(mediana) {
  /* `numero()` NO sirve de guarda aquí: `Number(null)` es 0 y `Number("")` es 0,
     los dos finitos, así que un «sin dato» entraría como una baja del 0 % y
     saldría con ×1,10 — «no sé» convertido en «adjudica por el presupuesto
     oficial», que es el error que este repositorio ya pagó caro. La ausencia se
     descarta ANTES de tocar `Number`. */
  if (mediana == null || mediana === "") return null;
  const m = numero(mediana);
  if (m == null) return null;                       // sin dato: no se ajusta nada
  if (m <= BAJA_BAJA_HASTA) return FACTOR_BAJA_BAJA;
  if (m >= BAJA_ALTA_DESDE) return FACTOR_BAJA_ALTA;
  const t = (m - BAJA_BAJA_HASTA) / (BAJA_ALTA_DESDE - BAJA_BAJA_HASTA);
  return Math.round((FACTOR_BAJA_BAJA + (FACTOR_BAJA_ALTA - FACTOR_BAJA_BAJA) * t) * 1e4) / 1e4;
}

/* ─────────────────────── el estimador ─────────────────────── */
/* `contexto`:
     competencia            competenciaDe(indice, lic) — histórico de la entidad
     promedio_departamento  respaldo cuando la entidad no tiene base
     colision_cierres       nº de procesos de la MISMA entidad que cierran el
                            mismo día (incluido este); >1 activa el ajuste
   Devuelve el desglose completo; `estimarP` es el atajo que devuelve el número. */
function estimarPDetalle(lic, contexto = {}) {
  const l = lic || {};
  let rivales = promedioDeEntidad(contexto.competencia);
  let fuente = "entidad";
  if (rivales == null) {
    rivales = numero(contexto.promedio_departamento);
    fuente = rivales != null && rivales >= 0 ? "departamento" : null;
  }
  if (rivales == null || rivales < 0) { rivales = PROMEDIO_CONSERVADOR; fuente = "conservador"; }

  const base = 1 / (1 + rivales);
  const ajustes = [];
  let p = base;

  /* NO hay ajuste por tertil de competencia, y no es un olvido: el nivel es el
     tertil del MISMO promedio que ya está en `rivales`, así que multiplicar por
     él contaba la competencia dos veces (ver la cabecera). El efecto de la
     competencia entra ENTERO por `1/(1+rivales)`, que además es continuo. */

  if (l._cierre_prorrogado) {
    p *= FACTOR_CIERRE_PRORROGADO;
    ajustes.push({ nombre: "cierre_prorrogado", factor: FACTOR_CIERRE_PRORROGADO, motivo: "el cierre se movió por adenda: suele indicar que no llegaron ofertas suficientes" });
  }

  /* Baja de mercado. Se exige `nivel` clasificado antes de mirar la mediana:
     `bajaDeMercado` ya garantiza que una cifra sin base llega como `sin_dato`
     con la mediana en null, y comprobar las dos cosas hace que este ajuste no
     dependa de que el otro módulo nunca falle. */
  const baja = contexto.baja || null;
  const medianaBaja = baja && baja.nivel && baja.nivel !== "sin_dato" ? numero(baja.baja_mediana) : null;
  const fBaja = factorBaja(medianaBaja);
  if (fBaja != null) {
    p *= fBaja;
    /* UN solo ajuste, y se emite SIEMPRE que haya dato — también cuando el
       factor sale exactamente 1,00. Con una función continua, «no aparece el
       ajuste» solo puede significar «no hay baja histórica»; si además
       significara «hay dato y no mueve nada», el desglose volvería a confundir
       «no sé» con «cero», que es el error que este repositorio ya pagó caro. */
    ajustes.push({
      nombre: "baja_mercado", factor: fBaja,
      motivo: fBaja > 1
        ? `la entidad adjudica cerca del presupuesto oficial (~${medianaBaja} % de baja): se puede ofertar alto`
        : fBaja < 1
          ? `la entidad adjudica ~${medianaBaja} % por debajo del presupuesto: ganar exige descontar`
          : `la entidad adjudica ~${medianaBaja} % por debajo del presupuesto: ni ayuda ni estorba`,
    });
  }

  const colision = Number(contexto.colision_cierres) || 0;
  if (colision > 1) {
    p *= FACTOR_COLISION_CIERRES;
    ajustes.push({ nombre: "colision_cierres", factor: FACTOR_COLISION_CIERRES, motivo: `la entidad cierra ${colision} procesos el mismo día: los rivales se reparten` });
  }

  // guarda dura: nada no finito puede salir de aquí. Un NaN en el orden no
  // explota — `sort` lo trata como «iguales» y la lista degrada en silencio al
  // orden de lectura de los chunks, con 200 OK (docs/ATRACTIVIDAD.md, R-NaN).
  if (!Number.isFinite(p)) p = 1 / (1 + PROMEDIO_CONSERVADOR);
  p = Math.min(P_MAXIMA, Math.max(P_MINIMA, p));

  return {
    p: Math.round(p * 1e4) / 1e4,
    base: Math.round(base * 1e4) / 1e4,
    rivales_esperados: Math.round(rivales * 100) / 100,
    fuente,
    ajustes,
  };
}

function estimarP(lic, contexto = {}) { return estimarPDetalle(lic, contexto).p; }

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
  estimarP, estimarPDetalle, valorEsperado,
  promediosPorDepartamento, indiceColisionCierres, claveColision, promedioDeEntidad,
  // `factorBaja` se exporta para poder probar la rampa AISLADA: la continuidad y
  // la monotonía son propiedades de la función, y comprobarlas a través de
  // `estimarPDetalle` las mezclaría con el clamp y con los otros dos factores.
  factorBaja,
  PROMEDIO_CONSERVADOR,
  FACTOR_CIERRE_PRORROGADO, FACTOR_COLISION_CIERRES, P_MAXIMA, P_MINIMA,
  FACTOR_BAJA_ALTA, FACTOR_BAJA_BAJA, BAJA_ALTA_DESDE, BAJA_BAJA_HASTA,
};
