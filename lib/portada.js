/* lib/portada.js · El pulso del mercado y la manifestación de interés (Fase 9 · Detekta v4)
   ─────────────────────────────────────────────────────────────────────────────
   Agregados de la PORTADA (lo que ve quien abre la app sin haber subido nada)
   y las dos listas de MANIFESTACIÓN DE INTERÉS. Todo sale del corpus activo
   ya sincronizado (SECOP II `p6dx-8zbt` proyectado) más el índice de baja y el
   PAA; nada se inventa y todo viaja con su fuente y su fecha.

   Reglas que no hay que re-aprender:
   · La portada se PRECALCULA al terminar cada sincronización y se guarda en
     `portada:resumen` con `generado`. La petición del usuario solo LEE: si la
     clave no existe responde `disponible:false` y lo dice, no se pone a
     calcular. Un token permite `?reconstruir=1` (para el dueño).
   · «Suele bajar» por entidad SOLO con n ≥ 5 adjudicaciones conocidas y a
     nivel ENTIDAD (`granularidad_utilizada === "entidad"`), nunca con la
     caída a departamento: si no, `baja:null` y el frontend dice «Sin
     referencia».
   · «Cierran esta semana» = 0 ≤ días ≤ 7 con la MISMA cuenta de días del
     listado (hora Colombia).
   · MANIFESTACIÓN DE INTERÉS · lo que el dataset SÍ y NO dice (censo real
     2026-08-16, docs/datos.md §7): `fase = «Manifestación de interés (Menor
     Cuantía)»` es el RÓTULO del tipo de proceso (1 929 de 2 000 están en
     estado «Evaluación»), no la fase vigente; `proveedores_que_manifestaron`
     viene en 0 en toda la muestra; y `fecha_de_recepcion_de` es el cierre de
     OFERTAS (6–14 días después de la publicación), no el de manifestación. Por
     eso la fecha límite para avisar sale del peldaño 3 de la cascada del plan:
     apertura + 3 días hábiles (D. 1082/2015 art. 2.2.1.2.1.2.20, transcrito
     en el concepto CCE C-537/2025), y viaja SIEMPRE como `origenFecha:
     "calculada"` con la advertencia de confirmar en el cronograma. Nunca una
     cuenta regresiva sobre una fecha deducida sin decirlo. La apertura se toma
     de `fecha_de_publicacion_del` (supuesto declarado: la publicación del
     proceso en SECOP II es su apertura); el enlace al SECOP va en cada fila.
   · «Próximos a abrir» sale del PAA (`lib/paa`, consulta en vivo con
     presupuesto corto): un plan no es un compromiso y se rotula así. Si el PAA
     no responde, `proximos:null` — no un cero. */
"use strict";

const { estado_abierto } = require("./filtros.js");
const { norm } = require("./semantica.js");
const { bajaDeMercado, leerIndiceBaja } = require("./indice_baja.js");
const Filtros = require("../public/filtros.js");
const FiltrosLista = require("./filtros_lista.js");
const habiles = require("./habiles.js");
const { CLAVES, leerJSON, escribirJSON } = require("./almacen.js");

const CLAVE_PORTADA = "portada:resumen";
const CLAVE_ENTIDADES = "portada:entidades";
const CLAVE_MANIFESTACION = "manifestacion:ventana";
const PLAZO_MANIFESTACION_HABILES = 3;              // D. 1082/2015 art. 2.2.1.2.1.2.20 num. 1
const MAX_MANIFESTACIONES_SIN_SORTEO = 10;          // num. 2: con más de diez, la entidad puede sortear
const NORMA = "Decreto 1082 de 2015, art. 2.2.1.2.1.2.20 (num. 1: manifestar interés en un término no mayor a tres días hábiles contados a partir de la apertura; num. 2: con más de diez manifestaciones la entidad puede sortear máximo diez). Verificado contra la transcripción literal del concepto CCE C-537 de 2025.";
const TOP_ENTIDADES = 12;
const MUESTRA_CIERRAN = 3;
const BAJA_MIN_PROCESOS = 5;

const soloDigitos = (s) => String(s || "").replace(/\D/g, "");
const num = (v) => { const n = Number(v); return Number.isFinite(n) ? n : 0; };

/* ¿Es un proceso de menor cuantía CON manifestación de interés? La variante
   «Sin Manifestacion Interes» existe en el dataset y se excluye. */
function exigeManifestacion(l) {
  const m = norm(String(l.modalidad_de_contratacion || ""));
  if (!m.includes("menor cuantia")) return false;
  return !m.includes("sin manifestacion");
}

/* Fecha de apertura tomada de la publicación (YYYY-MM-DD) — supuesto declarado. */
function aperturaDe(l) {
  const v = l.fecha_de_publicacion_del || l.fecha_de_ultima_publicaci;
  const m = String(v || "").match(/^(\d{4}-\d{2}-\d{2})/);
  return m ? m[1] : null;
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

/* La lista «abierto ahora» de manifestación sobre el corpus abierto. */
function manifestacionDe(abiertas, { ahora = Date.now() } = {}) {
  const hoy = habiles.hoyColombia(ahora);
  const abiertosAhora = [];
  for (const l of abiertas) {
    if (!exigeManifestacion(l)) continue;
    const f = filaManifestacion(l, hoy);
    if (f.venceISO && hoy <= f.venceISO) abiertosAhora.push(f);
  }
  abiertosAhora.sort((a, b) => (a.diasHabilesRestantes ?? 99) - (b.diasHabilesRestantes ?? 99) || (b.valor || 0) - (a.valor || 0));
  return { hoy, abiertos: abiertosAhora };
}

/* Agregados de la portada. `filas` = corpus activo deduplicado; `indiceBaja`
   opcional; `paa` = { total, muestra } o null. */
function agregar(filas, { indiceBaja = null, ahora = Date.now(), paa = null } = {}) {
  const abiertas = filas.filter((l) => estado_abierto(l, ahora));
  const clasificar = FiltrosLista.crearClasificador({ ahora });
  let valorTotal = 0;
  const porEntidad = new Map(), porDepto = new Map();
  const cierran = [];
  for (const l of abiertas) {
    const v = num(l.cuantia_cop);
    valorTotal += v;
    const nit = soloDigitos(l.nit_entidad) || `sin_nit:${norm(String(l.entidad || ""))}`;
    let e = porEntidad.get(nit);
    if (!e) { e = { nit: soloDigitos(l.nit_entidad) || null, nombre: String(l.entidad || "").trim(), abiertos: 0, valor: 0, fila: l }; porEntidad.set(nit, e); }
    e.abiertos++; e.valor += v;
    const c = clasificar(l);
    const cod = c.departamento || "sin_dato";
    let d = porDepto.get(cod);
    if (!d) { d = { cod, nombre: cod === "sin_dato" ? "Sin departamento" : ((Filtros.departamento(cod) || {}).nombre || cod), n: 0, valor: 0 }; porDepto.set(cod, d); }
    d.n++; d.valor += v;
    if (c.dias != null && c.dias >= 0 && c.dias <= 7) cierran.push({ l, dias: c.dias, valor: v });
  }
  cierran.sort((a, b) => a.dias - b.dias || b.valor - a.valor);
  const topEntidades = [...porEntidad.values()].sort((a, b) => b.valor - a.valor || b.abiertos - a.abiertos).slice(0, TOP_ENTIDADES).map((e) => {
    let baja = null, nBaja = null;
    if (indiceBaja) {
      const b = bajaDeMercado(indiceBaja, e.fila, { granularidad: "entidad", modalidad: null });
      if (b && b.granularidad_utilizada === "entidad" && b.baja_mediana != null && num(b.procesos_contados) >= BAJA_MIN_PROCESOS) {
        baja = b.baja_mediana; nBaja = b.procesos_contados;
      } else if (b && b.procesos_contados) nBaja = b.procesos_contados;
    }
    return { nit: e.nit, nombre: e.nombre, abiertos: e.abiertos, valor: Math.round(e.valor), baja, nBaja };
  });
  const porDepartamento = [...porDepto.values()].sort((a, b) => b.valor - a.valor).map((d) => ({ ...d, valor: Math.round(d.valor) }));
  const manif = manifestacionDe(abiertas, { ahora });
  return {
    generado: new Date(ahora).toISOString(),
    fuente: "SECOP II · dataset p6dx-8zbt (Colombia Compra Eficiente), corpus activo sincronizado por la app: procesos abiertos con cierre no vencido, modalidades competitivas de obra civil.",
    procesosAbiertos: abiertas.length,
    valorTotal: Math.round(valorTotal),
    entidadesActivas: porEntidad.size,
    cierranEstaSemana: {
      n: cierran.length,
      valor: Math.round(cierran.reduce((a, x) => a + x.valor, 0)),
      muestra: cierran.slice(0, MUESTRA_CIERRAN).map(({ l, dias, valor }) => ({
        proceso: l.id_del_proceso || null, entidad: l.entidad || null, objeto: l.nombre_del_procedimiento || null,
        valor: valor || null, dias, fecha_cierre: l.fecha_cierre || null, enlaceSecop: l.urlproceso || null,
        departamento: l.departamento_entidad || null,
      })),
    },
    topEntidades,
    porDepartamento,
    manifestacion: {
      abiertos: manif.abiertos.length,
      proximos: paa && Number.isInteger(paa.total) ? paa.total : null,
      hoy: manif.hoy,
      norma: NORMA,
      plazoHabiles: PLAZO_MANIFESTACION_HABILES,
      sorteoDesde: MAX_MANIFESTACIONES_SIN_SORTEO,
    },
    bajaMinimoProcesos: BAJA_MIN_PROCESOS,
    _manifestacion: manif.abiertos,
    _paa: paa && Array.isArray(paa.muestra) ? paa.muestra : null,
  };
}

/* ─── persistencia ─── */
async function leerPortada(redis) {
  return (await leerJSON(redis, CLAVE_PORTADA)) || null;
}
async function leerManifestacion(redis) {
  return (await leerJSON(redis, CLAVE_MANIFESTACION)) || null;
}

/* Reconstruye y guarda. `cargarCorpus` se inyecta (es el del listado, con su
   memoización); `consultarPaa` opcional con presupuesto corto. Devuelve la
   portada. Nunca lanza por el PAA: `proximos:null` si falla. */
async function reconstruirPortada(redis, { cargarCorpus, consultarPaa = null, ahora = Date.now(), presupuestoPaaMs = 6000 } = {}) {
  const meta = await leerJSON(redis, CLAVES.meta);
  const filas = await cargarCorpus(redis, meta);
  if (!filas) return null;
  let indiceBaja = null;
  try { indiceBaja = await leerIndiceBaja(redis); } catch { /* opcional */ }
  let paa = null;
  if (consultarPaa) {
    try {
      const r = await Promise.race([
        consultarPaa({ ahora }),
        new Promise((resolve) => setTimeout(() => resolve(null), presupuestoPaaMs)),
      ]);
      if (r && r.cuerpo && r.cuerpo.ok && Number.isInteger(r.cuerpo.total)) {
        paa = { total: r.cuerpo.total, muestra: (r.cuerpo.resultados || []).slice(0, 8) };
      }
    } catch { paa = null; }
  }
  const portada = agregar(filas, { indiceBaja, ahora, paa });
  const { _manifestacion, _paa, ...publica } = portada;
  await escribirJSON(redis, CLAVE_PORTADA, { ...publica, sincronizado: meta ? meta.last_sync : null });
  await escribirJSON(redis, CLAVE_ENTIDADES, { generado: publica.generado, entidades: publica.topEntidades });
  await escribirJSON(redis, CLAVE_MANIFESTACION, { generado: publica.generado, hoy: publica.manifestacion.hoy, abiertos: _manifestacion, proximos: _paa });
  return portada;
}

module.exports = {
  agregar, manifestacionDe, filaManifestacion, exigeManifestacion, aperturaDe, leerPortada, leerManifestacion, reconstruirPortada,
  CLAVE_PORTADA, CLAVE_ENTIDADES, CLAVE_MANIFESTACION, PLAZO_MANIFESTACION_HABILES, MAX_MANIFESTACIONES_SIN_SORTEO, NORMA, TOP_ENTIDADES, BAJA_MIN_PROCESOS,
};
