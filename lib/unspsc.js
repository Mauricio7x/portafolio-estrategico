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

const UNSPSC_GENESIS = ["12161800","22101500","22101600","22101700","22101800","22101900","22102000","23151600","23153400","24101600","24102000","25121600","26141800","27111500","27112200","30101500","30101700","30101800","30102000","30102200","30102300","30102400","30102800","30102900","30103100","30103200","30103600","30111500","30111600","30111700","30111800","30111900","30121500","30121600","30121700","30121800","30121900","30131500","30131600","30131700","30141500","30141600","30151500","30151600","30151700","30151800","30151900","30152000","30152100","30161500","30161600","30161700","30161800","30161900","30162000","30162100","30162200","30162300","30162400","30171500","30171600","30171700","30171800","30171900","30172000","30172100","30181500","30181600","30181700","30181800","30191500","30191600","30191700","30191800","30241500","30241600","30241700","30263800","30263900","30264900","30265000","30265100","30265200","30265300","30265400","30266300","31152200","31162100","32101500","32101600","39101600","39101800","39101900","39111500","39111600","39111800","39111900","39112300","39121000","39121100","39121400","39121700","39121900","39122100","39122200","39122300","39131700","40141700","40141900","40151500","40171500","40171600","40171700","40171800","40171900","40172000","40172100","40172200","40172300","40172400","40172500","40172600","40172700","40172800","40172900","40173000","40173100","40173200","40173300","40173400","40173500","40173600","40173700","40173800","40173900","40174000","40174100","40174200","40174300","40174400","40174500","40174600","40174700","40174800","40174900","40175000","40175100","40175200","40175300","40181500","40181600","40181700","40181800","40181900","40182000","40182100","40182200","40182300","40182400","40182500","40182600","40182700","40182800","40182900","40183000","40183100","42271900","46171500","49221500","49241700","49241800","52131500","52131600","52131700","52171000","53121700","53131600","53131700","56101500","56101600","56101700","56101900","56111500","56111600","56112100","56112200","56121000","56121100","56121300","56121500","56121700","60101300","70111500","70111700","70131500","70131600","70131700","70171500","70171800","71161400","71161500","71161600","72101500","72102900","72103300","72111000","72111100","72121000","72121100","72121200","72121300","72121400","72121500","72141000","72141100","72141200","72141300","72141400","72141500","72141600","72141700","72151000","72151100","72151200","72151300","72151400","72151500","72151600","72151700","72151800","72151900","72152000","72152100","72152200","72152300","72152400","72152500","72152600","72152700","72152800","72152900","72153000","72153100","72153200","72153300","72153400","72153500","72153600","72153700","72153900","72154000","72154300","72154400","72154500","73121600","76111500","76122000","77101500","77101600","77101700","77101800","77101900","77102000","77111500","77111600","77121600","77121700","78101800","78101900","78111800","78111900","78181600","80101500","80101600","80101700","80111500","80111600","80161500","81101500","81101600","81101700","81101800","81101900","81102000","81102100","81102200","81102300","81102400","81141500","81141800","82121600","83101500","83101600","83101800","84131600","85101500","85101600","85101700","85121700","86101600","86101700","86121500","86121600","90111700","91101500","91111500","91111600","93131800","93142000","95101500","95101600","95101700","95101800","95101900","95111500","95111600","95121500","95121600","95121700","95121800","95121900","95122000","95122100","95122300","95122400","95122500","95122600","95122700","95131500","95131600","95131700","95141500","95141700","95141800","95141900"];

const UNSPSC_PRODIAC = ["10141600","10151500","10151700","10151800","10151900","10152000","10152200","10161500","10161600","10161800","10161900","10171500","10171600","10171800","10212800","11101500","11101600","11101700","11111500","11111600","11111700","11121500","11121600","11121700","11151500","11171500","12141500","12161500","12162300","12164900","12352200","12352300","13101500","13101600","13111000","13111200","14101500","15101500","15121500","15121800","15121900","20101700","20101800","20101900","20102000","20111500","20111600","20111700","20121100","20121300","20121400","20121500","20121800","20121900","20122100","20122500","20122900","20142500","20142600","20142700","20142900","20143000","21101500","21101600","21101700","21101800","21102000","21102100","21102200","21102300","22101500","22101600","22101700","22101900","22102000","23101500","23131500","23151500","23151600","23151900","23153000","23153500","23191000","23201000","23201200","23232000","23241500","23241600","23251500","23271400","23271500","23271700","23271800","23301500","24101500","24101600","24101900","24102000","24111500","24111800","24112400","24112700","24121500","24141500","24141700","25101500","25101600","25101900","25151700","25172700","26101500","26111500","26111600","26111700","26111800","26121500","26121600","26131500","26131600","27111600","27111700","27111800","27111900","27112000","27112200","27112500","27112700","27112800","27113000","27121700","27121800","27131600","30101500","30101700","30101800","30102000","30102200","30102300","30102400","30102800","30102900","30103100","30103200","30103600","30111500","30111600","30111700","30111800","30111900","30121600","30121700","30121800","30121900","30131500","30131600","30131700","30141500","30151500","30151600","30151700","30151800","30151900","30152000","30152100","30161500","30161600","30161700","30161800","30161900","30162000","30162100","30162200","30162400","30171500","30171600","30171700","30171800","30171900","30172000","30172100","30181500","30181600","30181700","30181800","30191500","30191600","30191700","30191800","30241500","30241600","30264500","30264600","30264700","30264800","30264900","30265300","30265400","31111500","31151500","31151900","31152000","31152100","31152200","31161500","31161600","31161700","31161800","31162000","31162100","31162300","31162400","31162500","31162800","31163100","31163400","31201500","31201600","31211500","31211600","31211700","31211800","31211900","31241700","31241800","31261500","31261700","31281700","31421500","32101500","32101600","32151500","32151600","32151700","32151800","32151900","39101600","39101800","39101900","39111500","39111600","39111800","39112000","39112300","39112400","39112500","39121000","39121100","39121300","39121400","39121500","39121600","39121700","39122100","39122200","39131600","39131700","40101500","40101600","40101700","40101800","40101900","40102000","40102100","40141600","40141700","40141900","40142000","40142500","40151500","40151600","40151700","40161500","40161600","40161800","40171500","40171600","40171700","40171900","40172100","40172400","40172500","40172600","40172700","40172800","40172900","40173500","40173600","40173700","40173800","40174300","40174500","40174600","40174900","40175200","40175300","40181800","40181900","40183000","40183100","41101700","41103300","41104200","41104300","41104500","41104900","41111600","41111700","41111900","41112300","41112500","41112800","41112900","41113300","41113600","41113700","41113800","41113900","41114000","41114200","41114300","41114400","41114500","41115200","41115300","41115400","41115500","43191500","43191600","43201400","43201500","43211700","43221500","43221600","43221700","43221800","43222500","43222600","43222800","43222900","43223100","43223200","43223300","43232100","43232400","43232700","43232800","43232900","43233000","43233200","44101500","44101700","44102200","44102900","44103100","44111800","44122000","44122100","45111600","45111700","45111800","45111900","46151600","46161500","46161600","46171500","46171600","46181600","46181700","46181800","46181900","46182300","46182400","46191500","46191600","47101500","47101600","47121800","47131600","47131700","47131800","47132100","48101500","49121500","49161500","49161700","49181500","49201500","49201600","49221500","49241500","49241600","52131700","52141500","52141800","52151600","52171000","55121700","55121800","55121900","56101500","56101600","56111600","56112300","56121300","56121500","60122200","60122700","60124300","70101900","70111500","70111600","70111700","70131500","70131600","70131700","70141500","70141600","70141700","70141800","70151500","70151600","70151800","70151900","70161700","70171500","70171600","70171700","70171800","71101600","71101700","71121100","71121200","71122000","71122500","71122600","71122700","71151400","72101500","72102100","72102900","72103300","72111000","72111100","72121000","72121100","72121200","72121400","72121500","72141000","72141100","72141300","72141500","72141700","72151000","72151100","72151200","72151300","72151400","72151500","72151600","72151900","72152000","72152100","72152200","72152300","72152400","72152500","72152600","72152700","72152800","72152900","72153000","72153100","72153200","72153500","72153600","72153700","72153900","72154000","72154100","72154200","72154400","73111600","73171500","73181100","73181900","76101500","76111500","76111600","76121500","76121600","76121700","76121900","76122400","77101500","77101600","77101700","77101800","77101900","77102000","77111500","77111600","77121500","77121600","77121700","77131600","78101800","78121600","78141600","78181600","80101500","80101600","80101700","80111500","80131500","80131600","80131800","80141500","80161500","81101500","81101600","81101700","81102200","81102500","81102600","81102700","81111500","81111700","81111800","81111900","81112000","81112100","81112200","81121500","81131500","81141500","81141600","81141700","81141800","81151800","81161500","81161600","81161700","82121500","82141500","82141600","83101500","83101800","83111500","83111600","83111800","83112200","83112300","83112400","84111500","86101500","86101700","92121700","93141600","93141900","93142000","93142100","93151500","95101500","95111500","95111600","95121500","95121600","95121700","95121800","95121900","95122000","95122100","95122300","95122500","95131500","95131700","95141500","95141600","95141700","95141800"];

// Unión ordenada y sin duplicados: la lista de un proponente plural no se
// mantiene a mano — se deriva de sus fuentes para que jamás pueda
// desincronizarse. `UNSPSC_JUNTOS` es la de Helder + Génesis; la de cualquier
// otra combinación la calcula `derivarPlural` al vuelo.
const UNSPSC_JUNTOS = [...new Set([...UNSPSC_HELDER, ...UNSPSC_GENESIS])].sort();
/* TODAS las actividades que el conjunto de proponentes tiene registradas. Es lo
   que decide qué entra al corpus en la ingesta (`codigoAdmisibleIngesta`), así
   que PRODIAC entra aquí aunque no sea un perfil propio: si no, los procesos de
   sus 581 clases no se guardarían y no habría forma de descubrirlos después. */
const UNSPSC_TODOS = [...new Set([...UNSPSC_HELDER, ...UNSPSC_GENESIS, ...UNSPSC_PRODIAC])].sort();

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
const FAMILIAS_UNION = indiceDe(UNSPSC_TODOS).familias;

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
  codigoAdmisibleIngesta, algunCodigoAdmisibleIngesta, FAMILIAS_UNION, SEG_SERVICIOS_MIN, SEG_SERVICIOS_MAX,
  UNSPSC_PRODIAC, UNSPSC_TODOS,
  claseDe, cubiertoPorPrefijo,
};
