/* ============================================================================
   lib/unspsc · Whitelists de los RUP + MATCHING JERÁRQUICO por niveles
   ----------------------------------------------------------------------------
   DOS cosas viven aquí, y solo estas dos:

   1. LOS DATOS. Whitelists UNSPSC reales de los RUP (corte 07/05/2026),
      generadas programáticamente desde las listas embebidas en el index.html
      histórico (rama main) para evitar errores de transcripción:
        UNSPSC_HELDER  → 193 clases (RUP persona natural, Ing. Civil)
        UNSPSC_GENESIS → 343 clases (RUP Génesis Ingeniería y Construcción SAS)
        UNSPSC_JUNTOS  → 393 clases (consorcio): UNIÓN CALCULADA de las dos.
        La unión, jamás la intersección: un proponente plural acredita con la
        experiencia de CUALQUIERA de sus integrantes; intersecar sería absurdo
        (y dejaría al consorcio viendo menos que sus miembros por separado).

   2. EL MOTOR DE COMPARACIÓN. UNSPSC es jerárquico y de longitud fija:

        SS FF CC PP     72 14 10 15
        │  │  │  └── producto (8 dígitos)
        │  │  └───── clase    (6)
        │  └──────── familia  (4)
        └─────────── segmento (2)

      El NIVEL de un código se lee por sus pares "00" finales: 72000000 es un
      SEGMENTO, no «el producto cero de la clase cero». Ignorar eso es lo que
      rompía el matching en las dos direcciones.

   Parentesco BIDIRECCIONAL (el cambio de fondo frente al prefijo de 6 dígitos):

     a. RUP ⊃ proceso   RUP 72141000 · proceso 72141015 → tier "clase".
        El RUP está inscrito a nivel de clase y SECOP II publicó el producto.
     b. RUP = proceso   mismo código                    → tier "clase".
     c. RUP ⊂ proceso   proceso 72140000 (familia) · RUP 72141000 → tier
        "familia". La entidad publicó a nivel de familia y el RUP tiene clases
        dentro. Es un match AMPLIO: hay que verificar el pliego, y por eso
        viaja con su propio tier en vez de mezclarse con el fuerte.
     d. Segmento suelto (72000000): NO basta. Subir hasta el segmento haría
        que «servicios de construcción» casara con CUALQUIER cosa del segmento
        72. Se marca `segmento_afin` para que la co-señal de texto
        (lib/texto_unspsc) pueda confirmarlo, y el tier lo decide ella.

   Nunca devuelve un booleano: siempre {tier, codigo_proceso, codigo_rup,
   mensaje}. El tier es lo que la UI enseña y lo que /api/diagnostico cuenta.

   NORMALIZACIÓN (el otro bug silencioso): el `\d{8}` de antes fabricaba
   códigos falsos a partir de cualquier número largo del campo («1234567890»
   → 12345678). Aquí se tokeniza por RUNS COMPLETOS de dígitos y solo se
   aceptan longitudes 2/4/6/8; lo demás se descarta y se CUENTA (el
   diagnóstico lo reporta, no desaparece en silencio).

   Este módulo no depende de nada del proyecto: es hoja del grafo de requires.
   ========================================================================== */
"use strict";

const UNSPSC_HELDER = ["11121600","11162100","20142900","22101500","23153100","23181700","24101900","24141500","26121500","26121600","26131500","30101500","30101700","30101800","30102000","30102200","30102300","30102400","30102900","30103200","30111500","30111600","30111900","30121600","30131500","30131600","30131700","30151500","30151800","30152000","30161500","30161600","30161700","30161800","30161900","30162100","30162200","30162300","30171500","30171600","30171800","30171900","30172100","30181500","30181600","30181700","30181800","30191500","30191700","30241600","30261700","31162100","31211500","39111500","39111800","39121000","39121100","39121300","39121400","39121500","39121600","39121700","39121900","39122000","39122200","40151500","41113700","43211700","43211800","43221500","43221700","43221800","43222500","43222600","43222800","43222900","43223300","43232600","48101500","56101500","56101700","56101900","56111500","56111700","56111900","56112000","56112100","56112200","70111700","70151800","70171800","71101600","71101700","71121400","71121600","71122000","71122400","71122600","71123000","71141100","71161400","72101500","72102900","72103300","72111000","72111100","72121000","72121100","72121200","72121300","72121400","72121500","72141000","72141100","72141300","72141400","72141500","72141700","72151000","72151100","72151200","72151300","72151400","72151500","72151600","72151700","72151900","72152000","72152100","72152200","72152300","72152400","72152500","72152600","72152700","72152800","72152900","72153000","72153100","72153200","72153300","72153400","72153500","72153600","72153700","72153900","72154000","72154100","72154300","76111500","76121700","77101500","77101600","77101700","77101800","77101900","77102000","77111600","77121700","80101500","80101600","80101700","80111600","80111700","81101500","81101700","81102200","81102400","81111600","81111700","81141500","81141800","81151700","81151800","81151900","83101500","84111700","91111500","93141700","95101500","95101600","95111500","95111600","95121600","95121700","95121800","95121900","95122000","95122100","95122300","95122500","95122700","95141700"];

const UNSPSC_GENESIS = ["11111500","12161800","22101500","22101600","22101700","22101800","22101900","22102000","23151600","23153400","24101600","24102000","25121600","26141800","27111500","27112200","30101500","30101700","30101800","30102000","30102200","30102300","30102400","30102800","30102900","30103100","30103200","30103600","30111500","30111600","30111700","30111800","30111900","30121500","30121600","30121700","30121800","30121900","30131500","30131600","30131700","30141500","30141600","30151500","30151600","30151700","30151800","30151900","30152000","30152100","30161500","30161600","30161700","30161800","30161900","30162000","30162100","30162200","30162300","30162400","30171500","30171600","30171700","30171800","30171900","30172000","30172100","30181500","30181600","30181700","30181800","30191500","30191600","30191700","30191800","30241500","30241600","30241700","30263800","30263900","30264900","30265000","30265100","30265200","30265300","30265400","30266300","31152200","31162100","32101500","32101600","39101600","39101800","39101900","39111500","39111600","39111800","39111900","39112300","39121000","39121100","39121300","39121400","39121700","39121900","39122100","39122200","39122300","39131700","40141600","40141700","40141900","40151500","40171500","40171600","40171700","40171800","40171900","40172000","40172100","40172200","40172300","40172400","40172500","40172600","40172700","40172800","40172900","40173000","40173100","40173200","40173300","40173400","40173500","40173600","40173700","40173800","40173900","40174000","40174100","40174200","40174300","40174400","40174500","40174600","40174700","40174800","40174900","40175000","40175100","40175200","40175300","40181500","40181600","40181700","40181800","40181900","40182000","40182100","40182200","40182300","40182400","40182500","40182600","40182700","40182800","40182900","40183000","40183100","42271900","46171500","49221500","49241700","49241800","52131500","52131600","52131700","52171000","53121700","53131600","53131700","56101500","56101600","56101700","56101900","56111500","56111600","56112100","56112200","56121000","56121100","56121300","56121500","56121700","60101300","70111500","70111700","70131500","70131600","70131700","70171500","70171800","71101600","71122500","71151100","71161400","71161500","71161600","72101500","72102900","72103300","72111000","72111100","72121000","72121100","72121200","72121300","72121400","72121500","72141000","72141100","72141200","72141300","72141400","72141500","72141600","72141700","72151000","72151100","72151200","72151300","72151400","72151500","72151600","72151700","72151800","72151900","72152000","72152100","72152200","72152300","72152400","72152500","72152600","72152700","72152800","72152900","72153000","72153100","72153200","72153300","72153400","72153500","72153600","72153700","72153900","72154000","72154300","72154400","72154500","73121600","76111500","76122000","77101500","77101600","77101700","77101800","77101900","77102000","77111500","77111600","77121600","77121700","78101800","78101900","78111800","78111900","78181600","80101500","80101600","80101700","80111500","80111600","80131800","80161500","81101500","81101600","81101700","81101800","81101900","81102000","81102100","81102200","81102300","81102400","81141500","81141800","82121600","83101500","83101600","83101800","84131600","85101500","85101600","85101700","85121700","86101600","86101700","86121500","86121600","90111700","91101500","91111500","91111600","93131800","93142000","95101500","95101600","95101700","95101800","95101900","95111500","95111600","95121500","95121600","95121700","95121800","95121900","95122000","95122100","95122300","95122400","95122500","95122600","95122700","95131500","95131600","95131700","95141500","95141600","95141700","95141800","95141900"];

// Unión ordenada y sin duplicados: la lista del consorcio no se mantiene a
// mano — se deriva de las dos fuentes para que jamás pueda desincronizarse.
const UNSPSC_JUNTOS = [...new Set([...UNSPSC_HELDER, ...UNSPSC_GENESIS])].sort();

/* ══════════════════ 1 · Normalización de códigos ══════════════════ */

const LONGITUDES_VALIDAS = new Set([2, 4, 6, 8]);
const NIVELES = { 2: "segmento", 4: "familia", 6: "clase", 8: "producto" };

/* Prefijos de versión del clasificador tal como los publica SECOP II:
   "V1.72141000", "v1_72141000", "V1 72141000". Se retiran ANTES de tokenizar;
   si no, el "1" de "V1" entraría como un run de dígitos inválido y ensuciaría
   el contador de descartes.
   El SEPARADOR es obligatorio a propósito: con `[._-]?` el `\d+` glotón se
   tragaría el código entero en un hipotético "V172141000". */
const RE_VERSION = /\bv\d+[._\-\s]\s*/gi;
const RE_RUN_DIGITOS = /\d+/g;

/* Nivel por pares "00" finales: 3 pares → segmento, 2 → familia, 1 → clase,
   0 → producto. Es la única lectura correcta de 72000000 vs 72141015. */
function nivelDe(codigo8) {
  let pares = 0;
  for (let i = 6; i >= 2; i -= 2) {
    if (codigo8.slice(i, i + 2) === "00") pares++;
    else break;
  }
  return 8 - pares * 2;
}

/* Un run de dígitos → código canónico, o null si no es un UNSPSC posible.
   Reglas: solo longitudes 2/4/6/8 (lo demás es basura o un número que no es
   un clasificador), relleno con "0" a la derecha y segmento "00" rechazado
   (no existe). */
function normalizarCodigo(crudo) {
  const s = String(crudo == null ? "" : crudo).trim();
  if (!/^\d+$/.test(s) || !LONGITUDES_VALIDAS.has(s.length)) return null;
  const codigo = s.padEnd(8, "0");
  if (codigo.slice(0, 2) === "00") return null;
  const nivel = nivelDe(codigo);
  return {
    codigo, nivel, tipo: NIVELES[nivel],
    segmento: codigo.slice(0, 2), familia: codigo.slice(0, 4), clase: codigo.slice(0, 6),
  };
}

/* Texto libre → {codigos:[…], invalidos:[…]}. Los inválidos NO se tiran en
   silencio: /api/diagnostico los reporta (son la pista de que una entidad
   publica el código en un formato que no estamos leyendo). */
function extraerCodigos(texto) {
  const limpio = String(texto || "").replace(RE_VERSION, " ");
  const codigos = [], invalidos = [], vistos = new Set();
  for (const run of limpio.match(RE_RUN_DIGITOS) || []) {
    const c = normalizarCodigo(run);
    if (!c) { invalidos.push(run); continue; }
    if (vistos.has(c.codigo)) continue;
    vistos.add(c.codigo);
    codigos.push(c);
  }
  return { codigos, invalidos };
}

/* Los dos campos donde SECOP II declara la categoría. */
function codigosDeLicitacion(lic) {
  return extraerCodigos(`${lic.codigo_principal_de_categoria || ""} ${lic.categorias_adicionales || ""}`);
}

/* ══════════════════ 2 · Índice precomputado por perfil ══════════════════ */
/* Se calcula UNA vez por Set de RUP (memoizado por identidad del Set) y deja
   las cuatro estructuras que el matching consulta en O(1). */
const _indices = new WeakMap();
function indiceDe(setRup) {
  let idx = _indices.get(setRup);
  if (idx) return idx;
  const clases = new Set(), familias = new Set(), segmentos = new Set(), codigos = new Map();
  for (const crudo of setRup) {
    const c = normalizarCodigo(crudo);
    if (!c) continue;
    clases.add(c.clase);
    familias.add(c.familia);
    segmentos.add(c.segmento);
    codigos.set(c.codigo, c);
  }
  idx = { clases, familias, segmentos, codigos, total: codigos.size };
  _indices.set(setRup, idx);
  return idx;
}

/* Índices de las tres listas, listos para quien los quiera sin un perfil. */
const INDICE_HELDER = indiceDe(new Set(UNSPSC_HELDER));
const INDICE_GENESIS = indiceDe(new Set(UNSPSC_GENESIS));
const INDICE_JUNTOS = indiceDe(new Set(UNSPSC_JUNTOS));

/* ══════════════════ 3 · Matching jerárquico ══════════════════ */

/* Fuerza relativa de cada tier: el mejor código del proceso manda. */
const FUERZA_TIER = { ninguno: 0, texto: 1, equivalente: 2, familia: 3, clase: 4 };

const SIN_MATCH = Object.freeze({
  tier: "ninguno", codigo_proceso: null, codigo_rup: null, segmento_afin: false,
  mensaje: "Ninguna clase UNSPSC del proceso está inscrita en el RUP",
});

/* codigos (de extraerCodigos) × índice del perfil → veredicto graduado.
   NUNCA un booleano: la UI y el diagnóstico necesitan saber POR QUÉ. */
function emparejar(codigos, idx) {
  let mejor = null, segmentoAfin = false;
  for (const c of codigos || []) {
    // a/b. el RUP contiene al código del proceso (o son el mismo): match fuerte
    if (c.nivel >= 6 && idx.clases.has(c.clase)) {
      const exacto = idx.codigos.has(c.codigo);
      const cand = {
        tier: "clase", codigo_proceso: c.codigo, codigo_rup: `${c.clase}00`, segmento_afin: true,
        mensaje: exacto
          ? `Clase ${c.clase}00 inscrita en el RUP (código idéntico)`
          : `Producto ${c.codigo} dentro de la clase ${c.clase}00 inscrita en el RUP`,
      };
      if (!mejor || FUERZA_TIER[cand.tier] > FUERZA_TIER[mejor.tier]) mejor = cand;
      continue;
    }
    // c. el proceso se publicó a nivel de FAMILIA y el RUP tiene clases dentro
    if (c.nivel === 4 && idx.familias.has(c.familia)) {
      const cand = {
        tier: "familia", codigo_proceso: c.codigo, codigo_rup: `${c.familia}0000`, segmento_afin: true,
        mensaje: `El proceso se publicó a nivel de familia (${c.familia}0000) y el RUP tiene clases dentro — verificar el pliego`,
      };
      if (!mejor || FUERZA_TIER[cand.tier] > FUERZA_TIER[mejor.tier]) mejor = cand;
      continue;
    }
    // d. segmento suelto: NO es match. Se anota para la co-señal de texto.
    if (c.nivel === 2 && idx.segmentos.has(c.segmento)) segmentoAfin = true;
  }
  if (mejor) return mejor;
  return segmentoAfin
    ? { ...SIN_MATCH, segmento_afin: true, mensaje: "El proceso solo declara el SEGMENTO UNSPSC: hace falta confirmar el objeto" }
    : SIN_MATCH;
}

/* ══════════════════ 4 · Admisibilidad de INGESTA ══════════════════ */
/* El prefiltro de /api/sync ya NO juzga por perfil (ver lib/filtros
   .admisibleParaIngesta y el README): guarda todo lo que PUEDA llegar a
   interesar, y el juicio fino corre al servir. Aquí solo la parte UNSPSC:

     · segmentos 70–95  = obra, construcción, ingeniería, consultoría y
       servicios en general. Es deliberadamente ancho: afinar el matching no
       puede volver a exigir una recarga completa.
     · o la FAMILIA (4 dígitos) del código está en la unión de los dos RUP —
       así entran también los segmentos de bienes que los RUP sí inscriben
       (tubería 40, materiales 30, mobiliario 56…), cuya compra pura descarta
       después la capa anti-suministro EN CONSULTA. */
const SEG_SERVICIOS_MIN = "70", SEG_SERVICIOS_MAX = "95";
const FAMILIAS_UNION = INDICE_JUNTOS.familias;

function codigoAdmisibleIngesta(c) {
  if (c.segmento >= SEG_SERVICIOS_MIN && c.segmento <= SEG_SERVICIOS_MAX) return true;
  return FAMILIAS_UNION.has(c.familia);
}
const algunCodigoAdmisibleIngesta = (codigos) => (codigos || []).some(codigoAdmisibleIngesta);

/* ══════════════════ 5 · Compatibilidad hacia atrás ══════════════════ */
/* La comparación ANTERIOR (prefijo de 6 dígitos sobre `\d{8}`). Se conserva
   EXCLUSIVAMENTE para que /api/diagnostico pueda medir cuánto recupera el
   matching jerárquico frente a ella (contrafactual `ganancia_por_jerarquia`).
   Ningún camino de producción la usa para decidir. */
const claseDe = (codigo) => String(codigo).slice(0, 6);
function cubiertoPorPrefijo(clases, idx) {
  return (clases || []).some((c) => idx.clases.has(claseDe(c)));
}

module.exports = {
  UNSPSC_HELDER, UNSPSC_GENESIS, UNSPSC_JUNTOS,
  NIVELES, LONGITUDES_VALIDAS, FUERZA_TIER,
  nivelDe, normalizarCodigo, extraerCodigos, codigosDeLicitacion,
  indiceDe, INDICE_HELDER, INDICE_GENESIS, INDICE_JUNTOS,
  emparejar,
  codigoAdmisibleIngesta, algunCodigoAdmisibleIngesta, FAMILIAS_UNION,
  claseDe, cubiertoPorPrefijo,
};
