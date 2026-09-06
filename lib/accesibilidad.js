/* ════════════════ Accesibilidad operativa de la zona de la obra ════════════════

   Responde una pregunta que ningún dato de SECOP II responde solo: ¿CUÁNTO
   CUESTA LLEGAR? Una obra a 900 km de la base quema viáticos, transporte de
   equipo y días de ingeniero antes de poner el primer peso de utilidad; una en
   zona de acceso fluvial o con alertas de orden público cuesta además riesgo.
   El encargo del dueño (ago 2026): que salgan de primeras las de mayor
   probabilidad que ADEMÁS estén a ≤250 km de Bogotá o Ibagué, o a ≤2h30 del
   aeropuerto más cercano, y que no sean zonas de difícil acceso ni de conflicto.

   LA BASE ES DEL PERFIL, NO DE LA APLICACIÓN (6-sep-2026, M-SEG-10). Bogotá e
   Ibagué son las bases del DUEÑO (`BASE_DUENO`, los tres perfiles fijos). Un
   RUP subido desde la landing, un consorcio a la medida o una simulación no
   han dicho desde dónde operan: para ellos `evaluarZona(fila, null)` devuelve
   la distancia SIN CALCULAR (nivel `sin_dato`, km null, base null) y lo dice
   en la etiqueta. Antes toda fila de cualquier perfil se medía desde Ibagué o
   Bogotá: para un contratista de Cali, «Su zona (Bogotá)» y «~300 km de
   Ibagué» eran cifras creíbles y falsas en la primera pantalla de decisión.
   El parámetro NO tiene la base del dueño por defecto a propósito: quien
   olvide pasarla obtiene «sin calcular», nunca una distancia ajena — la regla
   de la casa es que una cifra equivocada y creíble hace más daño que una que
   falta. La base del perfil la decide lib/perfil_resolver.baseDelPerfil.
   Las alertas del destino (difícil acceso, orden público) no dependen de
   dónde esté la base y se conservan también sin ella.

   METODOLOGÍA (docs/ACCESIBILIDAD.md tiene el detalle y los límites):
   · Granularidad DEPARTAMENTO, con la capital como referencia. El municipio
     exacto puede estar más cerca o más lejos: por eso esto ORDENA y ETIQUETA,
     y solo EXCLUYE si el usuario lo pide con el filtro (jamás por defecto —
     el falso negativo cuesta más que el amarillo, la regla de la casa).
   · Distancias APROXIMADAS por carretera en data/accesibilidad_departamentos
     .json, usadas solo para clasificar en TRES BANDAS anchas (≤250 / ≤550 /
     >550 km): un error de ±50 km rara vez cambia la banda. Cada mensaje al
     usuario dice «estimado».
   · El criterio del aeropuerto se aproxima por la capital: un departamento
     lejano cuya capital tiene vuelos comerciales SUBE a la banda media («se
     llega volando»), salvo que sea de difícil acceso — Leticia tiene
     aeropuerto y aun así mover equipo de obra hasta allá no se parece en nada
     a volar a Barranquilla. El tiempo real municipio→aeropuerto NO es
     computable sin datos externos y no se inventa.
   · «verificar_orden_publico» es ORIENTATIVO y de nivel departamento: la app
     dice «verificá la zona de la obra», nunca afirma que el proceso esté en
     zona de conflicto. Un municipio tranquilo de un departamento con alertas
     merece la advertencia de verificar, no un veredicto.
   · SIN DATO (departamento ausente o no reconocido) queda en la banda MEDIA:
     no saber no es estar lejos (R1) — pero tampoco puede colarse de primero.

   PUNTOS para ordenar (0–3): cerca=3 · media/sin_dato=2 · lejos=1, y −1 si
   hay difícil acceso u orden público por verificar. El orden por defecto usa
   estos puntos como cubeta DENTRO de los viables, y el valor esperado sigue
   decidiendo dentro de cada cubeta. */

const TABLA = require("../data/accesibilidad_departamentos.json");

const CERCA_KM = (TABLA._meta && TABLA._meta.bandas && TABLA._meta.bandas.cerca_km) || 250;
const MEDIA_KM = (TABLA._meta && TABLA._meta.bandas && TABLA._meta.bandas.media_km) || 550;

/* Normalización local (sin tildes, mayúsculas, sin puntuación de sigla): el
   dataset escribe «Distrito Capital de Bogotá», «Tolima», «BOGOTA»… según la
   entidad. No se importa `norm` de semantica para conservar a este módulo
   como HOJA del grafo de requires (la lección de indice_competencia). */
function clave(depto) {
  const n = String(depto || "")
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .toUpperCase().replace(/[.,]/g, " ").replace(/\s+/g, " ").trim();
  if (!n) return null;
  if (n.includes("BOGOTA")) return "BOGOTA D.C.";
  if (n.includes("SAN ANDRES")) return "SAN ANDRES PROVIDENCIA Y SANTA CATALINA";
  if (n === "VALLE") return "VALLE DEL CAUCA";
  if (TABLA[n]) return n;
  return null;
}

const PUNTOS_NIVEL = { cerca: 3, media: 2, sin_dato: 2, lejos: 1 };

/* Las bases desde las que la tabla SABE medir: cada una es una columna de
   kilómetros. Una ciudad que no esté aquí no tiene distancias (todavía) y se
   trata como «sin base»: no se aproxima por Bogotá. */
const BASES = Object.freeze({ "Bogotá": "km_bogota", "Ibagué": "km_ibague" });
/* La base del DUEÑO: la más cercana de sus dos ciudades (encargo ago 2026). */
const BASE_DUENO = Object.freeze(["Bogotá", "Ibagué"]);

/* `base` admite un nombre («Ibagué»), una lista de nombres (la del dueño) o
   null. Devuelve solo las que la tabla conoce, en el orden dado. */
function basesDe(base) {
  const lista = base == null ? [] : Array.isArray(base) ? base : [base];
  return lista.filter((b) => Object.prototype.hasOwnProperty.call(BASES, b));
}

/* Rótulo de la base para pantalla: «Bogotá / Ibagué» para el dueño, «Cali»
   para un perfil con una sola ciudad, null sin base. */
function nombreDeBase(base) {
  const bs = basesDe(base);
  return bs.length ? bs.join(" / ") : null;
}

/* Evalúa la zona de UNA fila del corpus (usa `departamento_entidad`, que la
   proyección ya guarda) DESDE la base del perfil. Devuelve siempre el mismo
   contrato: { nivel, puntos, km, base, capital, dificil_acceso,
   verificar_orden_publico, etiqueta, mensaje } — `km` en null cuando no hay
   estimación (R1), y también cuando no hay base desde la que medir. */
function evaluarZona(fila, base = null) {
  const k = clave(fila && fila.departamento_entidad);
  const d = k ? TABLA[k] : null;
  if (!d) {
    return {
      nivel: "sin_dato", puntos: PUNTOS_NIVEL.sin_dato, km: null, base: null, capital: null,
      dificil_acceso: false, verificar_orden_publico: false,
      etiqueta: "Zona sin clasificar",
      mensaje: "El proceso no dice en qué departamento es la obra (o el nombre no se reconoció): "
        + "no se puede estimar el costo de llegar. No se descarta por eso.",
    };
  }

  const bases = basesDe(base);
  if (!bases.length) {
    /* SIN BASE no hay distancia que calcular, pero las alertas del destino
       siguen valiendo: una obra en Amazonas es de difícil acceso para
       cualquiera. Banda «sin dato» (R1: no saber no es estar lejos) menos la
       alerta — nunca 0 por no saber. */
    const alertaSinBase = Boolean(d.dificil_acceso || d.verificar_orden_publico);
    let etiqueta = d.dificil_acceso ? "Acceso difícil" : "Distancia sin calcular: no sabemos desde dónde opera";
    let mensaje = d.dificil_acceso
      ? `${d.capital} y su departamento se alcanzan sobre todo por aire o por río: mover equipo y `
        + "materiales de obra cuesta mucho más que la distancia. Presupueste la logística antes de decidir."
      : `La obra queda en la zona de ${d.capital}. La aplicación no sabe desde qué ciudad opera su empresa, `
        + "así que no calculó la distancia ni la usó para ordenar: solo cuentan las alertas de la zona.";
    /* La alerta de orden público viaja como BANDERA (`verificar_orden_publico`),
       no dentro de la etiqueta (6-sep-2026, B2b-H6): la pantalla ya la pone en
       palabras junto al chip y a la guía —«verifique la seguridad de la zona»—
       y con el sufijo «· verificar zona» aquí el chip la decía dos veces
       (medido en Chromium a 390 px: tres líneas). La etiqueta es el hecho de la
       distancia; el `mensaje` largo sí la cuenta, porque va al `title`. */
    if (d.verificar_orden_publico) {
      mensaje += " Atención: en partes de este departamento hay alertas de orden público documentadas — "
        + "conviene verificar la zona exacta de la obra antes de presentarse (el municipio puede estar tranquilo).";
    }
    return {
      nivel: "sin_dato", puntos: Math.max(0, PUNTOS_NIVEL.sin_dato - (alertaSinBase ? 1 : 0)),
      km: null, base: null, capital: d.capital,
      dificil_acceso: Boolean(d.dificil_acceso),
      verificar_orden_publico: Boolean(d.verificar_orden_publico),
      etiqueta, mensaje,
    };
  }

  /* la más cercana de las bases del perfil; una columna en null es «sin
     conexión vial practicable» y no compite */
  let km = null, baseNombre = null;
  for (const b of bases) {
    const v = d[BASES[b]];
    if (v == null) continue;
    if (km == null || v < km) { km = v; baseNombre = b; }
  }
  const base_ = baseNombre;

  let nivel;
  if (km != null && km <= CERCA_KM) nivel = "cerca";
  else if (km != null && km <= MEDIA_KM) nivel = "media";
  else nivel = "lejos";

  /* El aeropuerto de la capital sube «lejos» a «media» — el criterio del
     encargo es un O lógico (cerca por carretera O cerca de un aeropuerto) —
     salvo en difícil acceso, donde volar personas no resuelve mover equipo. */
  let porAeropuerto = false;
  if (nivel === "lejos" && d.aeropuerto_capital && !d.dificil_acceso) {
    nivel = "media";
    porAeropuerto = true;
  }

  const alerta = Boolean(d.dificil_acceso || d.verificar_orden_publico);
  const puntos = Math.max(0, PUNTOS_NIVEL[nivel] - (alerta ? 1 : 0));

  let etiqueta, mensaje;
  if (d.dificil_acceso) {
    etiqueta = "Acceso difícil";
    mensaje = `${d.capital} y su departamento se alcanzan sobre todo por aire o por río: mover equipo y `
      + "materiales de obra cuesta mucho más que la distancia. Presupueste la logística antes de decidir.";
  } else if (nivel === "cerca" && km <= 30) {
    // el departamento de una de las dos bases: «a ~0 km» leería raro
    etiqueta = `Su zona (${base_})`;
    mensaje = `La obra es del departamento de su base (${base_}): el costo de llegar es el mínimo posible. `
      + "El municipio exacto puede variar: confírmelo en la ficha del proceso.";
  } else if (nivel === "cerca") {
    etiqueta = `Cerca · ~${km} km de ${base_}`;
    mensaje = `La capital del departamento (${d.capital}) está a unos ${km} km de ${base_} por carretera `
      + "(estimado). El municipio exacto de la obra puede variar: confírmelo en la ficha del proceso.";
  } else if (porAeropuerto) {
    etiqueta = "Lejos, pero se llega volando";
    mensaje = `Por carretera son ~${km} km desde ${base_} (estimado), pero ${d.capital} tiene aeropuerto `
      + "comercial. Vale para visitas e ingeniería; el transporte de equipo sigue siendo por tierra.";
  } else if (nivel === "media") {
    etiqueta = `Distancia media · ~${km} km`;
    mensaje = `La capital del departamento (${d.capital}) está a unos ${km} km de ${base_} por carretera `
      + "(estimado): cuente viáticos y transporte en el presupuesto.";
  } else {
    etiqueta = `Lejos · ~${km} km`;
    mensaje = `La capital del departamento (${d.capital}) está a unos ${km} km de ${base_} por carretera `
      + "(estimado): los viáticos y el transporte pesan de verdad en una obra así.";
  }
  // la alerta va como bandera, no en la etiqueta (ver la rama sin base, B2b-H6)
  if (d.verificar_orden_publico) {
    mensaje += " Atención: en partes de este departamento hay alertas de orden público documentadas — "
      + "conviene verificar la zona exacta de la obra antes de presentarse (el municipio puede estar tranquilo).";
  }

  return {
    nivel, puntos, km: km == null ? null : km, base: base_, capital: d.capital,
    dificil_acceso: Boolean(d.dificil_acceso),
    verificar_orden_publico: Boolean(d.verificar_orden_publico),
    etiqueta, mensaje,
  };
}

module.exports = { evaluarZona, clave, nombreDeBase, BASES, BASE_DUENO, CERCA_KM, MEDIA_KM };
