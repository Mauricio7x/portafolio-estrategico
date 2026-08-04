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

   LOS SEIS AJUSTES, y por qué cada uno:
     · competencia baja  ×1,30   la entidad recibe pocas ofertas de forma estable
     · competencia alta  ×0,70   lo contrario
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
     · baja alta         ×0,85   la entidad adjudica >5 % por debajo del
                                 presupuesto (lib/indice_baja): ganar exige
                                 descontar, y eso sale del margen.
     · baja baja         ×1,10   adjudica a menos del 2 % de baja: se puede
                                 ofertar cerca del oficial.
   Los dos últimos NO son señal de cuántos rivales hay sino de A QUÉ PRECIO se
   adjudica, y por eso multiplican en vez de entrar en `rivales`: convierten la
   respuesta en «P(ganar a un precio que valga la pena)», que es la útil.

   Los factores son SUPUESTOS declarados, no coeficientes ajustados: no hay
   etiqueta (no se sabe qué se ganó y qué se perdió) contra la que calibrarlos.
   Por eso son constantes con nombre, viven todas aquí y cada una viaja en el
   desglose de la respuesta.
   ========================================================================== */
"use strict";

const PROMEDIO_CONSERVADOR = 5;      // sin ningún dato: P = 1/(1+5) = 0,1666…
const FACTOR_COMPETENCIA_BAJA = 1.30;
const FACTOR_COMPETENCIA_ALTA = 0.70;
const FACTOR_CIERRE_PRORROGADO = 1.20;
const FACTOR_COLISION_CIERRES = 1.15;
/* Baja de mercado de la entidad (lib/indice_baja). Es una señal de PRECIO, no
   de número de rivales, y por eso entra como ajuste y no dentro de `rivales`:
   una entidad que adjudica sistemáticamente 8 % por debajo del presupuesto
   obliga a bajar para ganar, y bajar es exactamente lo que se quiere evitar.
   La lectura correcta de este factor es «probabilidad de ganar A UN PRECIO QUE
   VALGA LA PENA», que es la única que le sirve al dueño. */
const FACTOR_BAJA_ALTA = 0.85;   // mediana > 5 %: hay que descontar mucho
const FACTOR_BAJA_BAJA = 1.10;   // mediana < 2 %: se adjudica cerca del oficial
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

  const nivel = (contexto.competencia && contexto.competencia.nivel) || "sin_dato";
  if (nivel === "baja") {
    p *= FACTOR_COMPETENCIA_BAJA;
    ajustes.push({ nombre: "competencia_baja", factor: FACTOR_COMPETENCIA_BAJA, motivo: "la entidad recibe pocas ofertas en su histórico" });
  } else if (nivel === "alta") {
    p *= FACTOR_COMPETENCIA_ALTA;
    ajustes.push({ nombre: "competencia_alta", factor: FACTOR_COMPETENCIA_ALTA, motivo: "la entidad recibe muchas ofertas en su histórico" });
  }

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
  if (medianaBaja != null) {
    if (medianaBaja > BAJA_ALTA_DESDE) {
      p *= FACTOR_BAJA_ALTA;
      ajustes.push({
        nombre: "baja_alta", factor: FACTOR_BAJA_ALTA,
        motivo: `la entidad adjudica ~${medianaBaja} % por debajo del presupuesto: ganar exige descontar`,
      });
    } else if (medianaBaja < BAJA_BAJA_HASTA) {
      p *= FACTOR_BAJA_BAJA;
      ajustes.push({
        nombre: "baja_baja", factor: FACTOR_BAJA_BAJA,
        motivo: `la entidad adjudica cerca del presupuesto oficial (~${medianaBaja} % de baja)`,
      });
    }
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
  PROMEDIO_CONSERVADOR, FACTOR_COMPETENCIA_BAJA, FACTOR_COMPETENCIA_ALTA,
  FACTOR_CIERRE_PRORROGADO, FACTOR_COLISION_CIERRES, P_MAXIMA, P_MINIMA,
  FACTOR_BAJA_ALTA, FACTOR_BAJA_BAJA, BAJA_ALTA_DESDE, BAJA_BAJA_HASTA,
};
