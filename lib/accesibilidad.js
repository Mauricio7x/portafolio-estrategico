/* ════════════════ Accesibilidad operativa de la zona de la obra ════════════════

   Responde una pregunta que ningún dato de SECOP II responde solo: ¿CUÁNTO
   CUESTA LLEGAR? Una obra a 900 km de la base quema viáticos, transporte de
   equipo y días de ingeniero antes de poner el primer peso de utilidad; una en
   zona de acceso fluvial o con alertas de orden público cuesta además riesgo.
   El encargo del dueño (ago 2026): que salgan de primeras las de mayor
   probabilidad que ADEMÁS estén a ≤250 km de Bogotá o Ibagué, o a ≤2h30 del
   aeropuerto más cercano, y que no sean zonas de difícil acceso ni de conflicto.

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

/* Evalúa la zona de UNA fila del corpus (usa `departamento_entidad`, que la
   proyección ya guarda). Devuelve siempre el mismo contrato:
   { nivel, puntos, km, base, capital, dificil_acceso, verificar_orden_publico,
     etiqueta, mensaje } — `km` en null cuando no hay estimación (R1). */
function evaluarZona(fila) {
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

  const km = d.km_bogota == null && d.km_ibague == null
    ? null
    : Math.min(d.km_bogota == null ? Infinity : d.km_bogota, d.km_ibague == null ? Infinity : d.km_ibague);
  const base = km == null ? null : (d.km_ibague != null && (d.km_bogota == null || d.km_ibague <= d.km_bogota) ? "Ibagué" : "Bogotá");

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
      + "materiales de obra cuesta mucho más que la distancia. Presupuestá la logística antes de decidir.";
  } else if (nivel === "cerca" && km <= 30) {
    // el departamento de una de las dos bases: «a ~0 km» leería raro
    etiqueta = `Su zona (${base})`;
    mensaje = `La obra es del departamento de su base (${base}): el costo de llegar es el mínimo posible. `
      + "El municipio exacto puede variar: confirmalo en la ficha del proceso.";
  } else if (nivel === "cerca") {
    etiqueta = `Cerca · ~${km} km de ${base}`;
    mensaje = `La capital del departamento (${d.capital}) está a unos ${km} km de ${base} por carretera `
      + "(estimado). El municipio exacto de la obra puede variar: confirmalo en la ficha del proceso.";
  } else if (porAeropuerto) {
    etiqueta = "Lejos, pero se llega volando";
    mensaje = `Por carretera son ~${km} km desde ${base} (estimado), pero ${d.capital} tiene aeropuerto `
      + "comercial. Vale para visitas e ingeniería; el transporte de equipo sigue siendo por tierra.";
  } else if (nivel === "media") {
    etiqueta = `Distancia media · ~${km} km`;
    mensaje = `La capital del departamento (${d.capital}) está a unos ${km} km de ${base} por carretera `
      + "(estimado): contá viáticos y transporte en el presupuesto.";
  } else {
    etiqueta = `Lejos · ~${km} km`;
    mensaje = `La capital del departamento (${d.capital}) está a unos ${km} km de ${base} por carretera `
      + "(estimado): los viáticos y el transporte pesan de verdad en una obra así.";
  }
  if (d.verificar_orden_publico) {
    etiqueta = d.dificil_acceso ? etiqueta : `${etiqueta} · verificar zona`;
    mensaje += " Atención: en partes de este departamento hay alertas de orden público documentadas — "
      + "conviene verificar la zona exacta de la obra antes de presentarse (el municipio puede estar tranquilo).";
  }

  return {
    nivel, puntos, km: km == null ? null : km, base, capital: d.capital,
    dificil_acceso: Boolean(d.dificil_acceso),
    verificar_orden_publico: Boolean(d.verificar_orden_publico),
    etiqueta, mensaje,
  };
}

module.exports = { evaluarZona, clave, CERCA_KM, MEDIA_KM };
