/* ============================================================================
   lib/rup · Validación RUP por perfil → rup_valido(licitacion, perfil)
   ----------------------------------------------------------------------------
   Orquestador delgado sobre las fuentes únicas:
     lib/perfiles.js  → datos del dueño y de sus socias (RUP corte 31/12/2025)
     lib/unspsc.js    → whitelists + matching jerárquico por niveles
     lib/capacidad.js → K de contratación (CRP/CRPC, Guía CCE-EICP-GI-22)
     lib/filtros.js   → cascada del objeto (convenio, blacklist, UNSPSC,
                        equivalencias, texto, pertinencia, anti-suministro)

   rup_valido(l, perfilId, conocimiento) → true si:
     a. El OBJETO es del perfil: el matching UNSPSC da un tier distinto de
        "ninguno" (clase / familia / equivalente / texto), el objeto es
        PERTINENTE (obra, infraestructura o consultoría) y no es una compra
        pura disfrazada.
     b. La CAPACIDAD alcanza: CRPC ≤ CRP y presupuesto ≤ tope estratégico.

   `conocimiento` = {equivalencias, vocabulario} aprendidos del corpus
   histórico. Es OPCIONAL: sin él, las capas 6 y 7 de la cascada no disparan y
   todo lo demás funciona igual.
   `opciones` = {incluirTextoDebil} — abre la ruta de texto sin pertinencia
   verde (el toggle «Incluir procesos sin código UNSPSC» de la UI).

   `admisibleParaIngesta` se reexporta desde lib/filtros: desde jul 2026 la
   ingesta no juzga por perfil — guarda ancho y el juicio corre al servir.
   ========================================================================== */
"use strict";

const { PERFILES, ALIAS_PERFIL, SMMLV } = require("./perfiles.js");
const {
  MARGIN_MULTIPLIER, crp, calcCRPC, plazoMesesDe,
  factorCF, factorCT, factorE, calcSCE, coEstimado,
} = require("./capacidad.js");
const { evaluarObjeto, unspscClasesDe, admisibleParaIngesta } = require("./filtros.js");

function presupuestoDe(lic) {
  // cuantia_cop lo deja lib/negocio si la licitación ya está enriquecida
  const n = parseFloat(lic.cuantia_cop ?? lic.precio_base ?? lic.valor_total ?? lic.cuantia_definitiva);
  return isNaN(n) ? 0 : n;
}

/* ---------- carga del proceso contra la K, con el anticipo que falta ----------
   EL ANTICIPO QUE SECOP II NO PUBLICA NO PUEDE RETIRAR UNA FILA (13-sep-2026).
   Hermano vivo del arreglo de P3 (la caja) del 12-sep: `anticipo_pct = 0`
   significaba a la vez «el pliego dice que no hay» y «no se sabe», y aquí ese 0
   entra en `CRPC = Presupuesto − Anticipo` (art. 2.2.1.1.1.6.4, D. 1082/2015),
   que es la CASCADA: su veredicto no informa, RETIRA la fila del listado.
   Tratar la ausencia como 0 % MAXIMIZA la carga — el lado conservador— y por
   eso mismo esconde procesos viables. Medido sobre cuantías de obra civil de
   50 M a 20.000 M: con el perfil del dueño, 32 de 741 filas bajo el tope se
   retiran por K (4,3 %) y las 32 cabrían con un anticipo dentro del techo
   legal; con un perfil pequeño de los que produce la puerta de entrada, 103 de
   445 retiradas (23 %) dependen ENTERAMENTE del porcentaje que nadie publicó.

   La regla de faltantes no dice «deja pasar todo»: dice NO CERRAR POR
   IGNORANCIA. Y aquí la ignorancia está acotada — un anticipo no puede pasar
   del 50 % del valor del contrato (parágrafo del art. 40 de la Ley 80 de 1993),
   tope que YA vive en `lib/apu_pliego.TOPE_ANTICIPO_SUMA` y se LLAMA, no se
   copia: dos copias del mismo número divergen a la primera corrección. Así que:
     · `crpc`        la carga que se MUESTRA, con el supuesto conservador (sin
                     anticipo). Un porcentaje que nadie publicó no se pinta.
     · `crpc_minimo` la carga más baja que el dato ausente permitiría. Es la que
                     DECIDE si la puerta puede cerrar: si ni con el anticipo
                     máximo legal cabe, el dato que falta no cambia nada y la
                     puerta cierra con un veredicto, no con una suposición.
   Con el anticipo DECLARADO las dos son la misma cifra y el comportamiento es
   idéntico al de siempre — incluido el 0 de «no se pagará anticipo», que es un
   dato y sigue cerrando.
   El require va DIFERIDO: lib/negocio → lib/filtros → (diferido) lib/rup ya es
   un ciclo vivo, y `apu_pliego` no tiene por qué cargarse en cada arranque de
   la lista. Se memoiza porque esta función corre una vez por fila. */
let _topeAnticipoPct = null;
function topeAnticipoPct() {
  if (_topeAnticipoPct == null) _topeAnticipoPct = 100 * require("./apu_pliego.js").TOPE_ANTICIPO_SUMA;
  return _topeAnticipoPct;
}
function cargaK(lic, presupuesto) {
  const { anticipoDeclarado } = require("./negocio.js"); // la MISMA cascada que fija `anticipo_pct`
  const plazo = plazoMesesDe(lic);
  const declarado = anticipoDeclarado(lic);
  const pct = declarado ? Math.min(Math.max(Number(lic.anticipo_pct) || 0, 0), 100) : 0;
  const crpc = calcCRPC(presupuesto, pct, plazo);
  return {
    crpc,
    // sin ausencia no hay banda: las dos cifras coinciden y nada cambia
    crpc_minimo: declarado ? crpc : calcCRPC(presupuesto, topeAnticipoPct(), plazo),
    anticipo_sin_publicar: !declarado,
  };
}

/* ---------- validación por perfil ---------- */
function evaluarRup(lic, perfilId, conocimiento, opciones) {
  const perfil = Object.prototype.hasOwnProperty.call(PERFILES, perfilId) ? PERFILES[perfilId] : null;
  if (!perfil) return { ok: false, motivo: "perfil desconocido" };

  const objeto = evaluarObjeto(lic, perfil, conocimiento, opciones);

  const presupuesto = presupuestoDe(lic);
  const k_cop = crp(perfil, presupuesto);
  const { crpc, crpc_minimo, anticipo_sin_publicar } = cargaK(lic, presupuesto);
  /* K SIN DATO (perfil aproximado sin utilidad/ingreso operacional): la regla de
     faltantes deja pasar y lo declara (`k_sin_dato`). Cerrar por ignorancia
     escondería todo el listado a quien entró con tres datos. */
  const kSinDato = k_cop == null;
  const dentroDeK = kSinDato ? true : crpc_minimo <= k_cop;
  /* EL AVISO NO SE PIERDE: esta fila pasa solo porque no se sabe el anticipo.
     Se marca únicamente cuando el veredicto DEPENDE de la ausencia (sin ella
     la fila se retiraría); si cabe hasta sin anticipo no hay nada que advertir,
     y advertir en todas sería ruido en la inmensa mayoría del corpus. */
  const kDependeDelAnticipo = !kSinDato && anticipo_sin_publicar && dentroDeK && crpc > k_cop;
  // sin tope declarado (perfil aproximado sin mayor contrato) tampoco se corta
  const topeCop = perfil.topeSMMLV == null ? null : perfil.topeSMMLV * SMMLV;
  const dentroDeTope = topeCop == null ? true : presupuesto <= topeCop;
  const capacidad_ok = dentroDeK && dentroDeTope;

  return {
    ok: objeto.ok && capacidad_ok,
    // veredicto GRADUADO del objeto: tier del matching + pertinencia. Nunca
    // un booleano suelto — es lo que la tarjeta enseña para poder decidir.
    tier: objeto.tier,
    unspsc: objeto.unspsc,
    pertinencia: objeto.pertinencia,
    paso: objeto.paso,
    unspsc_ok: objeto.unspsc_ok, fuente_unspsc: objeto.fuente_unspsc,
    anti_suministro: objeto.anti_suministro,
    capacidad_ok,
    // los dos motivos por separado: quien cuenta el embudo necesita saber CUÁL
    // de los dos falló sin tener que comparar cadenas de `motivo` ni rehacer la
    // aritmética del tope por su cuenta (lib/filtros.filtrarProcesosVisibles)
    dentro_de_k: dentroDeK, dentro_de_tope: dentroDeTope,
    k_sin_dato: kSinDato,
    /* DISTINTO DE `k_sin_dato`, y por eso con otro nombre: allí no se pudo
       calcular la capacidad; aquí se calculó y el veredicto pende del anticipo
       que el proceso no publica. `crpc_cop` es el del supuesto conservador. */
    k_depende_del_anticipo: kDependeDelAnticipo,
    k_cop: kSinDato ? null : Math.round(k_cop), crpc_cop: Math.round(crpc),
    tope_cop: topeCop,
    co_estimado: coEstimado(perfil), // la UI lo señala: K sobre CO estimado
    motivo: !objeto.ok ? objeto.motivo
      : !dentroDeTope ? "cuantía sobre el tope estratégico"
      : !dentroDeK ? "cuantía sobre el K de contratación (CRPC > CRP)"
      : null,
  };
}

function rup_valido(lic, perfilId, conocimiento, opciones) { return evaluarRup(lic, perfilId, conocimiento, opciones).ok; }

module.exports = {
  PERFILES, ALIAS_PERFIL, SMMLV, MARGIN_MULTIPLIER,
  rup_valido, evaluarRup, admisibleParaIngesta,
  /* lib/puertas.p2K la llama para no escribir una SEGUNDA regla del anticipo
     ausente: la cascada y la puerta P2 tienen que dar el mismo veredicto de K
     (de eso vive `distribucion_puertas.fallan_p2 === 0` del diagnóstico). */
  cargaK,
  // el presupuesto de una fila, con la MISMA precedencia de campos (lo llama lib/reparto)
  presupuestoDe,
  // reexportados para pruebas y compatibilidad (fórmula única en lib/capacidad)
  kContratacion: crp, calcCRPC, unspscClasesDe, plazoMesesDe,
  factorCF, factorCT, factorE, calcSCE,
};
