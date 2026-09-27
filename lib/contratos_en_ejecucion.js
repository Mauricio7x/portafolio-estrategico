/* ============================================================================
   lib/contratos_en_ejecucion · Los contratos que un perfil tiene en obra, también los de sus consorcios
   ----------------------------------------------------------------------------
   La capacidad residual (lib/capacidad) resta los SALDOS de los contratos en
   ejecución (Guía CCE-EICP-GI-22: saldo × % de participación × meses que le
   quedan / plazo). Hasta el 27-sep-2026 esa lista era la que se escribía a mano
   en lib/perfiles (solo la de Helder traía algo) y nadie la consultaba en
   SECOP II. Y consultar por `documento_proveedor`, como hacen lib/socio y el
   seguimiento de la competencia, NO BASTA: un contrato ganado en consorcio
   está a nombre del consorcio —«No Definido» o el NIT del propio consorcio—,
   no a nombre de sus integrantes. Medido el 27-sep-2026 en datos.gov.co: el
   contrato de la Universidad Pedagógica Nacional por $738.569.213
   (CO1.PCCNTR.9413188, CONSORCIO INFRAESTRUCTURA 1A: Helder 60 %, Génesis
   40 %) tiene `documento_proveedor = «No Definido»`.

   Cómo se encuentra (dos consultas, tres si hay contratos en consorcio, y las modificaciones de los vencidos):
     1. `ceth-n4bn` (integrantes de grupos de proveedores de SECOP II) por
        `nit_participante`: los consorcios y uniones temporales de los que el
        NIT es integrante y su `participacion`. `codigo_grupo` es el
        `codigo_proveedor` del consorcio en `jbjy-vk9h`.
     2. `jbjy-vk9h` (contratos electrónicos) en UNA consulta: los del
        consorcio (`codigo_proveedor in (…)`) O a su nombre
        (`documento_proveedor = NIT`), en los estados vigentes.
     3. `ceth-n4bn` por `codigo_grupo` solo para los consorcios con contrato
        vigente: con quién está (el nombre de los socios). Si falla, el
        contrato se cuenta igual y la frase no nombra a los socios.

   Reglas que rigen aquí:
   · UN CONTRATO, UNA VEZ. Se identifica por `id_contrato`; si la misma fila
     casa por las dos vías (el consorcio inscrito con la cédula de su
     representante, que es integrante), manda la del CONSORCIO, que es la que
     trae la participación: contarlo además «a su nombre» al 100 % sería
     contarlo dos veces.
   · Una PARTICIPACIÓN ilegible (vacía, «No Definido», 0, más de 100, o dos
     filas del mismo consorcio con porcentajes distintos) es «sin dato»: el
     contrato NO se pondera ni al 100 % ni al 0 % a escondidas. Va APARTE, con
     su motivo, y no se resta. La capacidad es una puerta de OPORTUNIDADES, donde
     el error caro es esconder un proceso que sí se podía tomar (CLAUDE.md,
     «el falso caro cambia de lado por módulo»); callar el contrato sería peor,
     así que se dice cuál es y qué confirmar.
   · Lo mismo con el valor ilegible, sin fecha de terminación o de inicio, y con
     el contrato vigente cuyo plazo publicado ya venció (SECOP II lo deja
     «Modificado» o «En ejecución» meses después): no se sabe cuánto le queda,
     y se dice.
   · Los meses que quedan NO se escriben a mano: salen de la fecha de
     terminación publicada contra HOY en Colombia, cada vez que se calcula la
     K (`mesesDe`), para que la cuenta atrás corra sola.
   · Nunca lanza: una fuente caída es `ok:false` con motivo. Transporte:
     `lib/socrata.crearCliente`, tiempo acotado por consulta, como lib/socio.
   ========================================================================== */
"use strict";

const { crearCliente, escSoQL } = require("./socrata.js");
const { hoyColombia, fechaOperable } = require("./habiles.js");

const DATASETS = { grupos: "ceth-n4bn", contratos: "jbjy-vk9h", modificaciones: "u8cx-r425" };
const BASES = {
  grupos: () => process.env.GRUPOS_BASE_URL || `https://www.datos.gov.co/resource/${DATASETS.grupos}.json`,
  contratos: () => process.env.EJECUCION_BASE_URL || `https://www.datos.gov.co/resource/${DATASETS.contratos}.json`,
  modificaciones: () => process.env.MODIFICACIONES_BASE_URL || `https://www.datos.gov.co/resource/${DATASETS.modificaciones}.json`,
};
/* Los estados que el seguimiento de la competencia ya trata como vigentes
   (lib/handlers/perfil/seguimiento): una sola lista para las dos consultas. */
const ESTADOS_VIGENTES = ["En ejecución", "Modificado", "Suspendido", "Prorrogado"];
/* FIRMADO Y SIN INICIAR (27-sep-2026, revisión adversaria): «Aprobado» es un contrato ya
   firmado que SECOP II aún no muestra en ejecución (CONSORCIO 47 TOLIMA de PRODIAC, $2.972 M,
   firmado el 22-sep-2026). Dejarlo fuera callaba una carga que viene; restarlo sin más da por
   hecho que la entidad lo cuenta igual. Se consulta y va APARTE, con su motivo, para confirmarlo. */
const ESTADOS_SIN_INICIAR = ["Aprobado"];
const TIEMPO_MAX_MS = parseInt(process.env.CONTRATOS_TIEMPO_MS, 10) || 6000;
const MAX_FILAS = 1000;
const LOTE_MODIFICACIONES = 50;
const DIA_MS = 86400e3;
const DIAS_MES = 30; // la misma conversión que lib/capacidad.plazoMesesDe (días / 30)

const num = (v) => { if (v == null || v === "") return null; const n = Number(v); return Number.isFinite(n) ? n : null; };
const texto = (v) => String(v == null ? "" : v).trim();

function conTiempo(promesa, ms) {
  let timer;
  const reloj = new Promise((_, rechazar) => { timer = setTimeout(() => rechazar(new Error(`tiempo agotado (${ms} ms)`)), ms); });
  return Promise.race([promesa, reloj]).finally(() => clearTimeout(timer));
}

/* El NIT sin dígito de verificación, que es como lo publican `ceth-n4bn`
   (`nit_participante`) y `jbjy-vk9h` (`documento_proveedor`): «9396710-3» →
   «9396710» (persona natural: su cédula), «901096271-1» → «901096271». Sin
   guion, un NIT de persona jurídica de 10 cifras trae el DV pegado. */
function nitSinDv(nit) {
  if (nit == null) return null;
  const s = texto(nit);
  const conGuion = s.includes("-");
  let d = (conGuion ? s.split("-")[0] : s).replace(/\D/g, "");
  if (!conGuion && /^[89]\d{9}$/.test(d)) d = d.slice(0, 9);
  return d.length >= 6 && d.length <= 10 ? d : null;
}

/* «60» → 60 · «12.8» → 12.8 · «40 %» → 40. Cero, más de 100 o texto → null
   («sin dato»): un 0 escondería el contrato entero y es la ausencia disfrazada. */
function participacionDe(v) {
  if (v == null) return null;
  const t = texto(v).replace(",", ".").replace(/\s*%$/, "");
  if (!/^\d+(\.\d+)?$/.test(t)) return null;
  const n = Number(t);
  return n > 0 && n <= 100 ? n : null;
}

const fechaDe = (v) => {
  const s = texto(v).slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(s) && fechaOperable(s) ? s : null;
};
const msDe = (iso) => Date.parse(`${iso}T00:00:00Z`);

/* Plazo y meses que QUEDAN, a partir de las fechas publicadas, HOY en
   Colombia. Si aún no empezó, le queda el plazo entero (nunca más: el saldo
   no puede pasar del valor). Devuelve null si las fechas no alcanzan. */
function mesesDe(inicio, fin, ahora = Date.now()) {
  if (!inicio || !fin) return null;
  const i = msDe(inicio), f = msDe(fin), hoy = msDe(hoyColombia(ahora));
  if (!(f > i)) return null;
  const plazoMeses = (f - i) / DIA_MS / DIAS_MES;
  const restanMeses = Math.max(0, (f - Math.max(hoy, i)) / DIA_MS / DIAS_MES);
  return { plazoMeses, restanMeses, vencido: f < hoy };
}

const NOMBRE_MES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const fechaLlana = (iso) => { const [a, m, d] = iso.split("-").map(Number); return `${d} de ${NOMBRE_MES[m - 1]} de ${a}`; };
const pctLlano = (p) => `${String(Math.round(p * 100) / 100).replace(".", ",")} %`;

/* La frase de un contrato, en el idioma del contratista: dónde, con quién y
   qué parte es suya. */
/* el plazo publicado ya terminó y el contrato sigue vigente en SECOP II: no se resta, se manda
   a confirmar. UNA redacción para la lista de SECOP II y para la cargada (lib/capacidad.sceParaK) */
function motivoPlazoVencido(c, fin, { cargada = false } = {}) {
  const dia = fechaLlana(String(fin).slice(0, 10));
  /* en la lista de la empresa la fecha la escribió alguien, no la lee SECOP II en vivo: se dice así
     y dónde se corrige (el dueño no tiene terminal: lo hace en «Mi empresa») */
  if (cargada) return `el plazo terminó el ${dia} según la lista de contratos de su empresa: no se descontó; si sigue en obra, corrija la fecha de fin en «Mi empresa»`;
  return `el plazo publicado terminó el ${dia}${c && c.estado ? ` y SECOP II lo sigue mostrando «${c.estado}»` : ""}: no se descontó; si sigue en obra, réstelo`;
}

function fraseContrato(c) {
  const donde = c.entidad || "Entidad sin nombre en SECOP II";
  if (c.origen === "propio") return `${donde}: a su nombre`;
  const socios = c.socios && c.socios.length ? ` con ${c.socios.join(" y ")}` : "";
  const nombre = c.consorcio || "un consorcio";
  return `${donde}: en ${nombre}${socios}, ${c.pct != null ? `su parte ${pctLlano(c.pct)}` : "sin su parte publicada"}`;
}

/* ─────────── LAS MODIFICACIONES PUBLICADAS (27-sep-2026, decisión del dueño) ───────────
   jbjy-vk9h llega tarde a las prórrogas: la Universidad Pedagógica decía fin 25-sep-2026 con su
   Otrosí No. 2 (prórroga al 25-oct) ya publicado en u8cx-r425. Para un contrato que jbjy da por
   VENCIDO se mira su última modificación «Publicado» (por fecha de aprobación; a igual fecha, la
   versión mayor): si lo prorroga más allá de hoy, vuelve a restar con su fin y su valor; si es
   una suspensión sin reinicio, sigue aparte con ese motivo. La fecha de fin la dice mejor el
   TEXTO («hasta el día 25 de octubre de 2026»): el campo `fecha_fin_contrato` va a menudo un día
   por delante (medido el 27-sep en 8 contratos de PRODIAC y en los dos otrosíes de la UPN). */
const MESES_TEXTO = new Map(["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"].map((m, i) => [m, i + 1]));
const sinTildes = (t) => String(t || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
/** «hasta el día VEINTICINCO (25) DE SEPTIEMBRE DE 2026» / «hasta el 25 de octubre de 2026» → "2026-09-25"; si no, null */
function finDelTexto(texto) {
  const t = sinTildes(texto);
  const m = t.match(/hasta el(?: dia)?\s+(?:[a-z]+\s*\()?(\d{1,2})\)?\s+de\s+([a-z]+)\s+(?:de(?:l)?\s+)?(\d{4})/);
  if (!m) return null;
  const mes = MESES_TEXTO.get(m[2]);
  const dia = Number(m[1]);
  if (!mes || !(dia >= 1 && dia <= 31)) return null;
  const iso = `${m[3]}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
  return Number.isFinite(Date.parse(`${iso}T00:00:00Z`)) ? iso : null;
}
/* SUSPENSIÓN (27-sep-2026, revisión adversaria sobre 600 contratos reales): el acta SUSPENDE
   («se suspende», «suspender», «suspensión 01», «acta suspension 2»…), no una que la recuerda al
   reiniciar, reactivar, superar sus motivos o ajustar la fecha de terminación. «Con reinicio
   automático el 14» sigue siendo una suspensión hasta ese día. */
const SUSPENDE_RE = /\bsuspen(?:de|der|dido|dida|sion|cion)\b/;
const NO_SUSPENDE_RE = /\breinicia|\breinicio(?! automatico)|reanud|reactiv|superad|superaron|levanta|ajusta(?:r)? (?:la )?fecha|ajuste de (?:la )?fecha|modifica la fecha|fecha de terminacion/;
const esSuspension = (prop) => { const t = sinTildes(prop); return SUSPENDE_RE.test(t) && !NO_SUSPENDE_RE.test(t); };
/** el fin de UNA modificación: el del texto manda si cae entre 3 días antes y el día del campo
    (medido: el campo va 1 día por delante; un «hasta el» POSTERIOR al campo suele ser el fin de una
    suspensión, no el del contrato); si no, el campo */
function finDeModificacion(u) {
  const campo = fechaDe(u.fecha_fin_contrato);
  const delTexto = finDelTexto(texto(u.proposito_modificacion));
  if (!delTexto || !campo) return campo || null;
  const d = Date.parse(delTexto) - Date.parse(campo);
  return d <= 0 && d >= -3 * DIA_MS ? delTexto : campo;
}
/** la última modificación publicada de un contrato (pura) →
    {fin, valor, suspendido, id, aprobada} · {ambigua: true, fines, aprobada} · null.
    Manda la fecha de APROBACIÓN (sin hora). `numero_version` NO ordena entre modificaciones: es el
    contador de ediciones de cada una. Si el último día trae varias con fines distintos, o una
    suspensión y otra no (SECOP II publica a veces el reinicio y el ajuste de fecha el mismo día),
    no se elige: «ambigua», y el contrato va a confirmar. */
function ultimaModificacion(filas) {
  const pub = (filas || []).filter((f) => texto(f.estado_modificacion) === "Publicado");
  if (!pub.length) return null;
  const dia = (f) => fechaDe(f.fecha_de_aprobacion) || "";
  const ultimoDia = pub.map(dia).sort().pop();
  const delDia = pub.filter((f) => dia(f) === ultimoDia);
  const lecturas = delDia.map((u) => ({ u, fin: finDeModificacion(u), suspendido: esSuspension(u.proposito_modificacion) }));
  const fines = [...new Set(lecturas.map((l) => l.fin || ""))];
  const susp = [...new Set(lecturas.map((l) => l.suspendido))];
  if (fines.length > 1 || susp.length > 1) return { ambigua: true, aprobada: ultimoDia || null, fines: fines.filter(Boolean).sort() };
  const { u, fin, suspendido } = lecturas[0];
  const valores = [...new Set(delDia.map((f) => num(f.valor_modificacion)).filter((x) => x != null && x > 0))];
  return { id: texto(u.identificador_modificacion) || null, aprobada: ultimoDia || null, fin: fin || null,
    valor: valores.length === 1 ? valores[0] : null, suspendido };
}

/* ─────────── la regla, PURA (con prueba) ───────────
   `grupos`: filas de ceth-n4bn del NIT · `contratos`: filas de jbjy-vk9h ·
   `sociosPorGrupo`: Map(codigo_grupo → [nombres de los OTROS integrantes]) o
   null. Devuelve la lista que resta la K (`sce`, con la forma que lee
   lib/capacidad.calcSCE: v = VALOR del contrato, pct = su parte) y la que va
   `aparte` con su motivo. */
function contratosEnEjecucionDe({ nit, grupos = [], contratos = [], sociosPorGrupo = null, modificaciones = null, modsNoLeidas = false, ahora = Date.now() } = {}) {
  /* `modificaciones`: filas de u8cx-r425 de los contratos vencidos, o null si no se pidieron;
     `modsNoLeidas`: se pidieron y no se pudieron leer («no sé» ≠ «no hay»: se dice) */
  const modsPor = new Map();
  for (const f of modificaciones || []) { const k = texto(f.id_contrato); if (k) { const l = modsPor.get(k) || []; l.push(f); modsPor.set(k, l); } }
  const id = nitSinDv(nit);
  const porGrupo = new Map();
  for (const g of grupos || []) {
    if (!id || nitSinDv(g.nit_participante) !== id) continue;
    const cod = texto(g.codigo_grupo);
    if (!cod) continue;
    const p = participacionDe(g.participacion);
    const previo = porGrupo.get(cod);
    if (!previo) porGrupo.set(cod, { pct: p, crudo: texto(g.participacion), nombre: texto(g.nombre_grupo) || null, ambiguo: false });
    else if (previo.pct !== p) { previo.pct = null; previo.ambiguo = true; }
  }
  const sce = [], aparte = [];
  const vistos = new Set();
  let otrosTipos = 0, propios = 0, enConsorcio = 0;
  /* Las filas del consorcio PRIMERO: si el mismo contrato llega también por
     la vía «a su nombre», la que queda es la que trae la participación. */
  const ordenadas = [...(contratos || [])].sort((a, b) => (porGrupo.has(texto(b.codigo_proveedor)) ? 1 : 0) - (porGrupo.has(texto(a.codigo_proveedor)) ? 1 : 0));
  for (const f of ordenadas) {
    const idc = texto(f.id_contrato);
    if (!idc || vistos.has(idc)) continue;
    const cod = texto(f.codigo_proveedor);
    const grupo = porGrupo.get(cod) || null;
    const esPropio = !grupo && !!id && nitSinDv(f.documento_proveedor) === id;
    if (!grupo && !esPropio) continue; // no es de este NIT
    const sinIniciar = ESTADOS_SIN_INICIAR.includes(texto(f.estado_contrato));
    if (!sinIniciar && !ESTADOS_VIGENTES.includes(texto(f.estado_contrato))) continue;
    vistos.add(idc);
    const obra = /^obra$/i.test(texto(f.tipo_de_contrato));
    if (!obra) { otrosTipos++; continue; } // la K de obra solo resta obra (lib/capacidad.calcSCE)
    const inicio = fechaDe(f.fecha_de_inicio_del_contrato) || fechaDe(f.fecha_de_firma);
    let fin = fechaDe(f.fecha_de_fin_del_contrato);
    let v = num(f.valor_del_contrato);
    /* vencido según jbjy: ¿lo prorroga una modificación publicada? */
    const mJ = mesesDe(inicio, fin, ahora);
    const mod = mJ && mJ.vencido && modsPor.has(idc) ? ultimaModificacion(modsPor.get(idc)) : null;
    const suspendidoJbjy = texto(f.estado_contrato) === "Suspendido"; // el estado publicado en jbjy
    let prorroga = null;
    if (mod && !mod.ambigua && mod.fin && !mod.suspendido && !suspendidoJbjy && Date.parse(mod.fin) > Date.parse(fin) + DIA_MS) {
      prorroga = { id_modificacion: mod.id, aprobada: mod.aprobada, fin_anterior: fin };
      fin = mod.fin;
      if (mod.valor != null) v = mod.valor;
    }
    const c = {
      id_contrato: idc,
      origen: grupo ? "consorcio" : "propio",
      consorcio: grupo ? (texto(f.proveedor_adjudicado) || grupo.nombre) : null,
      socios: grupo && sociosPorGrupo && sociosPorGrupo.get(cod) ? sociosPorGrupo.get(cod) : null,
      entidad: texto(f.nombre_entidad) || null,
      estado: texto(f.estado_contrato),
      v: v != null && v > 0 ? v : null,
      pct: grupo ? grupo.pct : 100,
      inicio, fin, obra: true,
      ...(prorroga ? { prorroga } : {}),
    };
    const m = mesesDe(inicio, fin, ahora);
    let motivo = null;
    if (grupo && c.pct == null) {
      motivo = grupo.ambiguo
        ? `SECOP II publica dos participaciones distintas suyas en ${c.consorcio || "el consorcio"}: no se descontó; confirme su parte en el documento de conformación`
        : `SECOP II no publica su participación en ${c.consorcio || "el consorcio"}${grupo.crudo ? ` (dice «${grupo.crudo}»)` : ""}: no se descontó; confirme su parte en el documento de conformación`;
    } else if (sinIniciar) motivo = `SECOP II lo muestra «${c.estado}» (firmado, aún sin iniciar): no se descontó; si ya lo va a ejecutar, réstelo`;
    else if (c.v == null) motivo = "SECOP II no publica el valor del contrato: no se descontó";
    else if (!fin) motivo = "SECOP II no publica cuándo termina: no se descontó";
    else if (!m) motivo = "SECOP II no publica cuándo empezó: no se descontó";
    else if (m.vencido && mod && mod.ambigua) motivo = `SECOP II publicó el ${fechaLlana(mod.aprobada)} varias modificaciones con fechas de fin distintas${mod.fines.length ? ` (${mod.fines.map(fechaLlana).join(" y ")})` : ""}: no se descontó; confirme cuándo termina`;
    else if (m.vencido && ((mod && mod.suspendido) || suspendidoJbjy)) motivo = `${mod && mod.suspendido ? `la última modificación publicada en SECOP II es una suspensión${mod.aprobada ? ` (aprobada el ${fechaLlana(mod.aprobada)})` : ""}` : "SECOP II lo muestra «Suspendido»"}: el plazo está detenido, no terminado; no se descontó; confirme el saldo y cuándo se reanuda`;
    else if (m.vencido && modificaciones === null && modsNoLeidas) motivo = `${motivoPlazoVencido(c, fin)}; no se pudieron leer sus modificaciones en SECOP II: confirme si fue prorrogado`;
    else if (m.vencido) motivo = motivoPlazoVencido(c, fin);
    if (grupo) enConsorcio++; else propios++;
    if (motivo) { aparte.push({ ...c, motivo, frase: fraseContrato(c) }); continue; }
    sce.push({ ...c, plazoMeses: m.plazoMeses, restanMeses: m.restanMeses, frase: fraseContrato(c) });
  }
  return { sce, aparte, propios, en_consorcio: enConsorcio, otros_tipos: otrosTipos, consorcios_integrados: porGrupo.size };
}

/* ─────────── la consulta (de dos a cuatro GET a datos.gov.co, más tandas de modificaciones) ─────────── */
async function consultarContratosEnEjecucion(nit, { fetchImpl, log = () => {}, tiempoMs = TIEMPO_MAX_MS, ahora = Date.now() } = {}) {
  const id = nitSinDv(nit);
  const base = { ok: false, nit: id, consultado_el: new Date(ahora).toISOString(), fuentes: [DATASETS.grupos, DATASETS.contratos],
    consultas: 0, sce: [], aparte: [], motivo: null };
  if (!id) return { ...base, motivo: "el perfil no tiene NIT: no se pueden buscar sus contratos en SECOP II" };
  try {
    const cg = crearCliente({ baseUrl: BASES.grupos(), fetchImpl, log });
    const grupos = await conTiempo(cg.pedir({
      "$select": "codigo_grupo,nombre_grupo,nit_participante,participacion",
      "$where": `nit_participante='${escSoQL(id)}'`,
      "$limit": String(MAX_FILAS),
    }, `consorcios de ${id}`, { plazoMs: tiempoMs }), tiempoMs);
    base.consultas++;
    const codigos = [...new Set((grupos || []).map((g) => texto(g.codigo_grupo)).filter(Boolean))];
    const quien = codigos.length
      ? `(codigo_proveedor in (${codigos.map((c) => `'${escSoQL(c)}'`).join(",")}) OR documento_proveedor='${escSoQL(id)}')`
      : `documento_proveedor='${escSoQL(id)}'`;
    const cc = crearCliente({ baseUrl: BASES.contratos(), fetchImpl, log });
    const contratos = await conTiempo(cc.pedir({
      "$select": "id_contrato,codigo_proveedor,documento_proveedor,proveedor_adjudicado,nombre_entidad,estado_contrato,tipo_de_contrato,valor_del_contrato,fecha_de_firma,fecha_de_inicio_del_contrato,fecha_de_fin_del_contrato",
      "$where": `${quien} AND estado_contrato in (${[...ESTADOS_VIGENTES, ...ESTADOS_SIN_INICIAR].map((e) => `'${escSoQL(e)}'`).join(",")})`,
      "$order": "fecha_de_firma desc", "$limit": String(MAX_FILAS),
    }, `contratos vigentes de ${id}`, { plazoMs: tiempoMs }), tiempoMs);
    base.consultas++;
    /* Los socios: solo de los consorcios con contrato vigente, y opcional. */
    const conContrato = [...new Set((contratos || []).map((c) => texto(c.codigo_proveedor)).filter((c) => codigos.includes(c)))];
    let socios = null;
    if (conContrato.length) {
      try {
        const filas = await conTiempo(cg.pedir({
          "$select": "codigo_grupo,nombre_participante,nit_participante",
          "$where": `codigo_grupo in (${conContrato.map((c) => `'${escSoQL(c)}'`).join(",")})`,
          "$limit": String(MAX_FILAS),
        }, `socios de ${id}`, { plazoMs: tiempoMs }), tiempoMs);
        base.consultas++;
        socios = new Map();
        for (const f of filas || []) {
          if (nitSinDv(f.nit_participante) === id) continue;
          const n = texto(f.nombre_participante);
          if (!n) continue;
          const cod = texto(f.codigo_grupo);
          const l = socios.get(cod) || [];
          if (!l.includes(n)) l.push(n);
          socios.set(cod, l);
        }
      } catch (e) { log(`contratos_en_ejecucion/socios: ${e && e.message}`); }
    }
    /* Las modificaciones: solo de los contratos de obra que jbjy da por VENCIDOS, y opcional —si
       no responde, se sigue con lo de jbjy (van aparte, como antes) y se dice—. */
    const vencidos = [...new Set((contratos || []).filter((f) => {
      const m = mesesDe(fechaDe(f.fecha_de_inicio_del_contrato) || fechaDe(f.fecha_de_firma), fechaDe(f.fecha_de_fin_del_contrato), ahora);
      return /^obra$/i.test(texto(f.tipo_de_contrato)) && m && m.vencido;
    }).map((f) => texto(f.id_contrato)).filter(Boolean))];
    let modificaciones = null, modificacionesLeidas = null, modsTruncadas = false;
    if (vencidos.length) {
      try {
        const cm = crearCliente({ baseUrl: BASES.modificaciones(), fetchImpl, log });
        /* en tandas de ~50 contratos (con cientos de ids la URL pasa de 8 KB y SECOP responde 414)
           y ordenadas por aprobación, para que un corte en 1.000 filas deje las más recientes */
        modificaciones = [];
        for (let i = 0; i < vencidos.length; i += LOTE_MODIFICACIONES) {
          const tanda = vencidos.slice(i, i + LOTE_MODIFICACIONES);
          const filas = await conTiempo(cm.pedir({
            "$select": "id_contrato,identificador_modificacion,numero_version,estado_modificacion,fecha_de_aprobacion,fecha_fin_contrato,valor_modificacion,proposito_modificacion",
            "$where": `id_contrato in (${tanda.map((c) => `'${escSoQL(c)}'`).join(",")}) AND estado_modificacion='Publicado'`,
            "$order": "fecha_de_aprobacion DESC", "$limit": String(MAX_FILAS),
          }, `modificaciones de ${id}`, { plazoMs: tiempoMs }), tiempoMs);
          base.consultas++;
          if (!Array.isArray(filas)) throw new Error("respuesta no-array en modificaciones");
          if (filas.length >= MAX_FILAS) modsTruncadas = true;
          modificaciones.push(...filas);
        }
        modificacionesLeidas = true;
        base.fuentes = [...base.fuentes, DATASETS.modificaciones];
      } catch (e) { modificaciones = null; modificacionesLeidas = false; log(`contratos_en_ejecucion/modificaciones: ${e && e.message}`); }
    }
    const r = contratosEnEjecucionDe({ nit: id, grupos, contratos, sociosPorGrupo: socios, modificaciones, modsNoLeidas: modificacionesLeidas === false, ahora });
    return { ...base, ok: true, ...r, modificaciones_leidas: modificacionesLeidas,
      truncado: (grupos || []).length >= MAX_FILAS || (contratos || []).length >= MAX_FILAS || modsTruncadas };
  } catch (e) {
    log(`contratos_en_ejecucion: ${e && e.message}`);
    return { ...base, motivo: `no se pudo consultar SECOP II: ${String((e && e.message) || e)}` };
  }
}

/* ─────────── guardar lo consultado (lo llama la sincronización) ───────────
   Una clave con lo de TODOS los NIT y un sello aparte, como el RUP: la lista
   solo LEE el sello (en el mismo comando que el del RUP) y baja el registro
   cuando cambió. Si la consulta de un NIT falla, se CONSERVA lo que había de
   él: dejarlo vacío subiría su K por un corte de red. */
async function refrescarContratosEnEjecucion(redis, perfiles, { fetchImpl, log = () => {}, tiempoMs = TIEMPO_MAX_MS, ahora = Date.now() } = {}) {
  const { CLAVES, leerJSON, escribirJSON } = require("./almacen.js");
  const nits = [...new Set((perfiles || []).map((p) => p && nitSinDv(p.nit)).filter(Boolean))];
  const previo = (await leerJSON(redis, CLAVES.contratosEnEjecucion)) || {};
  const antes = previo.por_nit || {};
  const resultados = await Promise.all(nits.map((n) => consultarContratosEnEjecucion(n, { fetchImpl, log, tiempoMs, ahora })));
  const por_nit = {};
  /* un NIT que falla conserva lo anterior; y uno que respondió SIN poder leer sus modificaciones
     también, si lo anterior sí las leyó: si no, la K subiría hasta el siguiente turno con prórrogas
     «olvidadas» (27-sep-2026, revisión adversaria). El fallo queda anotado: la sincronización
     reintenta en una hora. */
  const bueno = (x) => x && x.ok && x.modificaciones_leidas !== false;
  for (const r of resultados) {
    if (r.ok && r.modificaciones_leidas !== false) por_nit[r.nit] = r;
    else if (bueno(antes[r.nit])) por_nit[r.nit] = { ...antes[r.nit], ultimo_fallo: { el: r.consultado_el, motivo: r.ok ? "no se pudieron leer las modificaciones en SECOP II" : r.motivo } };
    else por_nit[r.nit] = r.ok ? { ...r, ultimo_fallo: { el: r.consultado_el, motivo: "no se pudieron leer las modificaciones en SECOP II" } } : r;
  }
  const registro = { version: `${new Date(ahora).toISOString()}#${Math.random().toString(36).slice(2, 8)}`, consultado_el: new Date(ahora).toISOString(), por_nit };
  await escribirJSON(redis, CLAVES.contratosEnEjecucion, registro);
  await redis.set(CLAVES.contratosEnEjecucionVersion, registro.version); // el sello, SIEMPRE al final
  return registro;
}

/* ─────────── aplicar lo guardado a un perfil (puro) ───────────
   El registro se cruza por NIT, no por id: un RUP nuevo con otro NIT no hereda
   los contratos del anterior. */
function registroDe(registro, perfil) {
  const id = perfil && nitSinDv(perfil.nit);
  const r = id && registro && registro.por_nit ? registro.por_nit[id] : null;
  return r && r.ok ? r : null;
}

/* Lo que se restó de SECOP II y lo que no, en frases, para la casilla de
   capacidad de Mis procesos. Solo de quien NO trae lista cargada (la misma
   regla de lib/capacidad.sceParaK: manda una sola lista); en un consorcio,
   con el nombre del integrante delante. Se cortan en `max` por lista. */
/* LO QUE LA K DEJÓ APARTE DE LA LISTA CARGADA (lib/capacidad.sceParaK). La casilla de capacidad de Mis procesos lo nombra para que no quede un verde
   sobre un contrato que no se restó por no constar que siga en obra (27-sep-2026). */
function apartesDeLaListaCargada(perfil, { max = 3 } = {}) {
  const { sceParaK } = require("./capacidad.js"); // diferido: capacidad ya pide este módulo
  const salida = [];
  // solo la CARGADA: lo que SECOP II deja aparte ya lo nombra `lineasSecop` (sin repetirlo)
  const de = (p, prefijo) => { const k = p ? sceParaK(p) : null; if (k && k.fuente === "cargada") for (const c of k.aparte) salida.push(`${prefijo}${c.frase || fraseContrato(c)} (${c.motivo})`); };
  if (perfil && Array.isArray(perfil.integrantes) && perfil.integrantes.length) {
    for (const i of perfil.integrantes) de(i && i.perfil, `${(i && i.perfil && i.perfil.nombre) || "un integrante"} · `);
  } else de(perfil, "");
  return { lineas: salida.length > max ? [...salida.slice(0, max), `y ${salida.length - max} más`] : salida, n: salida.length };
}

function lineasSecop(perfil, { max = 3 } = {}) {
  const restados = [], aparte = [];
  const de = (p, prefijo) => {
    if (!p || (Array.isArray(p.sce) && p.sce.length) || !p.contratosSecop) return;
    for (const c of p.contratosSecop.sce || []) restados.push(`${prefijo}${c.frase}`);
    for (const c of p.contratosSecop.aparte || []) aparte.push(`${prefijo}${c.frase} (${c.motivo})`);
  };
  if (perfil && Array.isArray(perfil.integrantes) && perfil.integrantes.length) {
    for (const i of perfil.integrantes) de(i && i.perfil, `${(i && i.perfil && i.perfil.nombre) || "un integrante"} · `);
  } else de(perfil, "");
  const cortar = (l) => (l.length > max ? [...l.slice(0, max), `y ${l.length - max} más`] : l);
  return { restados: cortar(restados), aparte: cortar(aparte), n_restados: restados.length, n_aparte: aparte.length };
}

module.exports = {
  DATASETS, ESTADOS_VIGENTES, ESTADOS_SIN_INICIAR,
  nitSinDv, participacionDe, mesesDe, motivoPlazoVencido, finDelTexto, ultimaModificacion, fraseContrato, lineasSecop, apartesDeLaListaCargada,
  contratosEnEjecucionDe, consultarContratosEnEjecucion, refrescarContratosEnEjecucion, registroDe,
};
