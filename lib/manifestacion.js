/* lib/manifestacion.js · La MANIFESTACIÓN DE INTERÉS de la selección abreviada de
   menor cuantía, como HOJA del grafo (ago 2026)
   ─────────────────────────────────────────────────────────────────────────────
   Vivía en lib/portada (Fase 9). Se extrajo aquí porque el aviso tiene que
   salir TAMBIÉN en el listado (lib/filtros_lista clasifica cada fila) y en
   Mis procesos (lib/seguimiento), y `portada` requiere a `filtros_lista`: un
   require de vuelta cerraría el ciclo. Nada cambió en la regla ni en la norma
   (D. 1082/2015 art. 2.2.1.2.1.2.20: manifestar interés en un término no
   mayor a TRES días hábiles desde la apertura; con más de diez, sorteo). La
   apertura se toma de la publicación (SUPUESTO declarado) y la fecha límite
   viaja SIEMPRE como «calculada»: el dataset no la publica. */
"use strict";

const { norm } = require("./semantica.js");
const habiles = require("./habiles.js");

const PLAZO_MANIFESTACION_HABILES = 3;              // D. 1082/2015 art. 2.2.1.2.1.2.20 num. 1
const MAX_MANIFESTACIONES_SIN_SORTEO = 10;          // num. 2: con más de diez, la entidad puede sortear
const NORMA = "Decreto 1082 de 2015, art. 2.2.1.2.1.2.20 (num. 1: manifestar interés en un término no mayor a tres días hábiles contados a partir de la apertura; num. 2: con más de diez manifestaciones la entidad puede sortear máximo diez). Verificado contra la transcripción literal del concepto CCE C-537 de 2025.";
const soloDigitos = (s) => String(s || "").replace(/\D/g, "");
const num = (v) => { const n = Number(v); return Number.isFinite(n) ? n : 0; };

/* ¿Es un proceso de menor cuantía CON manifestación de interés? La variante
   «Sin Manifestacion Interes» existe en el dataset y se excluye. */
function exigeManifestacion(l) {
  const m = norm(String((l && l.modalidad_de_contratacion) || ""));
  if (!m.includes("menor cuantia")) return false;
  return !m.includes("sin manifestacion");
}

/* Fecha de apertura tomada de la publicación (YYYY-MM-DD) — supuesto declarado. */
/* El AÑO también se valida, no solo el formato (ago 2026). `lib/habiles.festivos`
   LANZA fuera de [1984, 2200] —el calendario colombiano no está definido más
   allá— y esta fecha viaja hasta `sumarHabiles` a través de `filaManifestacion`,
   que el clasificador del listado llama para CADA fila. El dataset trae años
   imposibles de verdad: un `1970-01-01` de timestamp nulo, o el `2202` que esta
   misma memoria documenta como anomalía de la fuente. Con una sola de esas filas
   en menor cuantía, `/api/procesos?op=listar` respondía 500 para todos los
   perfiles: la pantalla principal caída por un dato malo de una fila. Una fecha
   que no se puede situar es «sin fecha legible», que es una respuesta que el
   módulo ya sabe dar (`origenFecha: "desconocida"`). */
const ANIO_MIN = 1984, ANIO_MAX = 2200;

function aperturaDe(l) {
  const v = l.fecha_de_publicacion_del || l.fecha_de_ultima_publicaci || l.fecha_publicacion;
  const m = String(v || "").match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return null;
  const anio = Number(m[1]);
  if (anio < ANIO_MIN || anio > ANIO_MAX) return null;
  return `${m[1]}-${m[2]}-${m[3]}`;
}

/* Fila de manifestación con su fecha límite CALCULADA. `hoy` (YYYY-MM-DD,
   Colombia) inyectable. `diasHabilesRestantes` cuenta HOY si es hábil y no
   venció (hoy todavía se puede avisar), más los hábiles hasta el vencimiento. */
function filaManifestacion(l, hoy) {
  const apertura = aperturaDe(l);
  const vence = apertura ? habiles.sumarHabiles(apertura, PLAZO_MANIFESTACION_HABILES) : null;
  const quedan = vence == null ? null : (hoy > vence ? 0 : habiles.habilesEntre(hoy, vence) + (habiles.esHabil(hoy) ? 1 : 0));
  return {
    proceso: l.id_del_proceso || null,
    entidad: l.entidad || null,
    nit_entidad: soloDigitos(l.nit_entidad) || null,
    objeto: l.nombre_del_procedimiento || l.descripci_n_del_procedimiento || null,
    valor: num(l.cuantia_cop) || null,                // 0 = sin dato → null
    modalidad: l.modalidad_de_contratacion || null,
    departamento: l.departamento_entidad || null,
    apertura,
    vence: vence ? `${vence}T23:59:59-05:00` : null,
    venceISO: vence,
    venceLegible: vence ? habiles.fechaLegible(vence) : null,
    diasHabilesRestantes: quedan,
    origenFecha: vence ? "calculada" : "desconocida",
    notaFecha: vence
      ? `Fecha calculada: apertura (${apertura}) + ${PLAZO_MANIFESTACION_HABILES} días hábiles (art. 2.2.1.2.1.2.20 del D. 1082/2015). Confirme en el cronograma del proceso en SECOP II.`
      : "El dataset no trae fecha de apertura legible: consulte el cronograma en el SECOP II.",
    cierreOfertas: l.fecha_cierre || null,            // el cierre de OFERTAS, del dataset (otra cosa)
    enlaceSecop: l.urlproceso || null,
  };
}

/* La versión COMPACTA para una fila del listado o un proceso guardado:
   {aplica, apertura, vence, venceLegible, quedan, vencida, calculada}. null si
   la modalidad no exige manifestación. */
function manifestacionDeFila(l, hoy) {
  if (!exigeManifestacion(l)) return null;
  const f = filaManifestacion(l, hoy);
  /* `dias_calendario`: cuántos días de calendario faltan (0 = vence HOY, 1 =
     mañana). Es lo que decide la FRASE («vence hoy / mañana»); `quedan_habiles`
     es cuántos días hábiles quedan para actuar, contando hoy si es hábil — un
     domingo con vencimiento el lunes tiene 1 hábil y 1 día de calendario. */
  const cal = f.venceISO ? Math.round((Date.parse(f.venceISO + "T00:00:00Z") - Date.parse(hoy + "T00:00:00Z")) / 86400000) : null;
  return {
    aplica: true, apertura: f.apertura, vence: f.venceISO, vence_legible: f.venceLegible,
    quedan_habiles: f.diasHabilesRestantes, dias_calendario: cal == null ? null : Math.max(0, cal),
    vencida: f.venceISO ? hoy > f.venceISO : null,
    calculada: true, nota: f.notaFecha, norma: NORMA,
  };
}

module.exports = { exigeManifestacion, aperturaDe, filaManifestacion, manifestacionDeFila, PLAZO_MANIFESTACION_HABILES, MAX_MANIFESTACIONES_SIN_SORTEO, NORMA };
