/* lib/novedades.js · LO QUE SE MUEVE EN UN PROCESO GUARDADO (8-sep-2026)
   ─────────────────────────────────────────────────────────────────────────────
   Encargo del dueño: «para todos los procesos en Mis procesos, el sistema debe
   avisar de cualquier cambio en el apartado "Observaciones y mensajes" de
   SECOP II, sin importar el tipo de cambio (nuevo mensaje, actualización,
   documento adjunto, etc.); el aviso debe aparecer tanto en el calendario como
   en la vista del proceso, con opción de ver el detalle».

   ═══ LA PREMISA, VERIFICADA CONTRA EL ÁRBOL ANTES DE CONSTRUIR ═══════════════

   «Observaciones y mensajes» es un módulo INTERNO de la cuenta de SECOP II: se
   ve dentro del expediente electrónico, con sesión iniciada, y ninguna fuente
   abierta lo publica. Esta casa ya lo midió por otro camino y lo dejó escrito
   con fecha: la página pública del proceso (`OpportunityDetail`) redirige a un
   reCAPTCHA, así que desde un servidor no se puede ni listar lo que hay dentro
   (MEMORIA.md § «Los documentos del proceso se leen solos al guardar en Mis
   procesos»). Detekta no tiene —ni debe tener— la contraseña de SECOP II del
   dueño. Prometer «le avisamos de cada mensaje» sería prometer un canal que no
   existe, y un aviso que no llega es peor que ninguno: el usuario deja de mirar
   porque cree que le avisarían.

   LO QUE SÍ SE PUBLICA, Y ES CASI TODO LO QUE IMPORTA: cuando una entidad
   responde observaciones, expide una adenda o publica un informe, sube un
   ARCHIVO, y ese archivo aparece en el índice abierto de datos.gov.co
   (`dmgg-8hin`, que esta casa ya lee en lib/documentos_proceso). Un documento
   nuevo del tipo «Respuesta a observaciones» ES la huella publicada de que en
   «Observaciones y mensajes» pasó algo. Sobre eso sí se puede avisar, con su
   nombre, su fecha y su enlace de descarga.

   POR ESO ESTE MÓDULO HACE DOS COSAS DISTINTAS Y NO LAS MEZCLA:
     1. NOVEDADES PUBLICADAS — documentos que aparecieron desde la última vez que
        usted los dio por vistos. Se derivan, se listan y se avisan.
     2. LA REVISIÓN QUE HACE USTED — el recordatorio de entrar a SECOP II a mirar
        los mensajes, con el enlace del proceso y la marca de cuándo lo revisó.
        La aplicación no puede leerlos; lo que sí puede es no dejar que se le
        pase, y decir sin rodeos por qué depende de usted.

   ═══ LAS DECISIONES QUE NO HAY QUE RE-APRENDER ═══════════════════════════════

   · LA PRIMERA VEZ NO ES «TODO NUEVO». Un proceso guardado hoy trae en su índice
     los doce documentos con los que se publicó: marcarlos todos como novedad
     encendería veinte procesos con doscientos avisos el primer día y el usuario
     apagaría la pestaña. Sin marca previa, la referencia es EL DÍA EN QUE USTED
     LO GUARDÓ: novedad es lo que la entidad publicó después.
   · UNA FECHA AUSENTE NO ES UNA NOVEDAD. Un archivo sin `fecha_carga` no se
     puede comparar contra nada: se cuenta aparte y se dice, jamás se cuela como
     nuevo ni se descarta en silencio (R1: la ausencia no es un dato).
   · SOLO LO DE LA ENTIDAD. El índice trae también lo que suben los proponentes
     con su oferta (`de_la_entidad: false`). Que un competidor suba su RUP no es
     una novedad del proceso para quien lo está siguiendo: es ruido, y en un
     proceso con veinte oferentes es MUCHO ruido.
   · LA MARCA DE VISTO SE GUARDA COMO IDENTIFICADORES, NO COMO FECHA. Dos
     documentos publicados el mismo día, uno visto y otro no, con una marca por
     fecha serían los dos vistos. Se guardan los identificadores, con tope; lo
     anterior al más antiguo guardado se da por visto y la marca lo dice
     (`desde`), que es lo único que un tope permite afirmar sin mentir.
   · EL ENLACE DE DESCARGA VIAJA TAL CUAL LO GUARDÓ EL ÍNDICE. `clasificarArchivo`
     ya sanea el dominio (solo `community.secop.gov.co`); aquí no se vuelve a
     construir una URL: se pasa la que hay, o null.

   Capa PURA: recibe el índice ya leído y la marca ya guardada, y devuelve qué
   hay de nuevo. Redis y la red viven en los handlers. */
"use strict";

const { fechaLegible } = require("./habiles.js");
const { diaValido } = require("./cronograma.js");

/* Tope de identificadores guardados por proceso. Del caso real que la casa ya
   documentó (CO1.REQ.10379092: 209 filas, 150 distintas, 96 de la entidad):
   con 120 caben todos los procesos de ese tamaño y el peso por proceso queda en
   ~3 KiB. Por encima del tope se guardan los MÁS NUEVOS y se anota `desde`: lo
   anterior a esa fecha se da por visto, que es exactamente lo que se puede
   afirmar cuando no se guardó todo. */
const MAX_DOCS_VISTOS = 120;
/* Cada cuánto pedirle al usuario que entre a mirar los mensajes de SECOP II en
   un proceso que sigue abierto. Cinco días es el hueco que deja pasar una
   respuesta a observaciones sin que nadie la lea; con el cierre encima el aviso
   se aprieta solo (ver `revisionDe`). */
const DIAS_SIN_REVISAR = 5;
/* CUÁNTOS DOCUMENTOS NUEVOS SE LISTAN, y por qué hay un tope. El conteo (`n`) es
   siempre exacto; lo que se acota es la LISTA que viaja en la respuesta. Un
   proceso real puede traer cerca de cien archivos de la entidad, y a doscientos
   procesos guardados eso son megabytes en una respuesta que Vercel corta en 4,5
   MB — y una respuesta cortada mata la pestaña entera y en silencio, que es el
   modo de fallo que este proyecto persigue desde el arranque en la zona muerta.
   Doce son los que caben en pantalla sin que nadie los lea todos; los demás se
   cuentan y se dicen. */
const MAX_NUEVOS_LISTADOS = 12;
/* Los tipos de documento que, cuando aparecen, casi siempre significan que en
   «Observaciones y mensajes» pasó algo que cambia la oferta. El resto también se
   avisa, pero estos se dicen por su nombre. */
const TIPOS_CALIENTES = Object.freeze(["adenda", "respuesta_observaciones", "informe_evaluacion", "pliego"]);

const texto = (v, tope) => {
  const s = String(v == null ? "" : v).replace(/[\u0000-\u001f\u007f]+/g, " ").replace(/\s+/g, " ").trim();
  return s ? s.slice(0, tope) : null;
};
const dia = (v) => diaValido(String(v == null ? "" : v).slice(0, 10));

/* ═══ LA MARCA DE VISTO ══════════════════════════════════════════════════════ */

/* Lo guardado en el proceso. Tolera lo que no existía: `normalizarMarca(undefined)`
   es la marca vacía y un perfil de producción anterior a esto abre igual. */
function normalizarMarca(v) {
  const m = v && typeof v === "object" ? v : {};
  const ids = [];
  const vistos = new Set();
  for (const x of Array.isArray(m.docs) ? m.docs : []) {
    const s = texto(x, 40);
    if (!s || vistos.has(s)) continue;
    vistos.add(s); ids.push(s);
    if (ids.length >= MAX_DOCS_VISTOS) break;
  }
  return {
    el: texto(m.el, 30),                    // cuándo dio por vistos los documentos
    docs: ids,
    desde: dia(m.desde),                    // lo anterior a este día se da por visto (tope alcanzado)
    revisado_el: texto(m.revisado_el, 30),  // cuándo entró a SECOP II a mirar los mensajes
  };
}

/* La marca que deja «Ya los vi»: los identificadores de lo que la entidad tiene
   publicado AHORA. Con más archivos que el tope se guardan los más nuevos y
   `desde` dice desde cuándo, en vez de perder los viejos en silencio. */
function marcaDeVisto(archivos, { ahora = null, previa = null } = {}) {
  const p = normalizarMarca(previa);
  const deEntidad = (archivos || []).filter((a) => a && a.de_la_entidad !== false && a.id_documento);
  const ordenados = [...deEntidad].sort((a, b) => String(b.fecha_carga || "").localeCompare(String(a.fecha_carga || "")) || String(b.id_documento).localeCompare(String(a.id_documento)));
  const guardados = ordenados.slice(0, MAX_DOCS_VISTOS);
  const recortado = ordenados.length > guardados.length;
  const fechas = guardados.map((a) => dia(a.fecha_carga)).filter(Boolean).sort();
  return {
    el: ahora || null,
    docs: guardados.map((a) => String(a.id_documento)),
    desde: recortado && fechas.length ? fechas[0] : p.desde,
    revisado_el: p.revisado_el,
  };
}

/* ═══ QUÉ HAY DE NUEVO ═══════════════════════════════════════════════════════ */

/* `archivos` = indice.archivos de pliego:{id}:docs (ya clasificados por
   lib/documentos_proceso). `marca` = lo guardado en el proceso. `guardado_el` =
   cuándo se guardó el proceso, que es la referencia mientras no haya marca. */
function nuevosDe(archivos, marca, { guardado_el = null } = {}) {
  const m = normalizarMarca(marca);
  const lista = (archivos || []).filter((a) => a && a.de_la_entidad !== false && a.id_documento);
  const base = { total_entidad: lista.length, nuevos: [], n: 0, sin_fecha: 0, referencia: null, primera_vez: !m.el };
  if (!lista.length) return base;

  const conMarca = !!m.el;
  const vistos = new Set(m.docs);
  const corte = conMarca ? m.desde : dia(guardado_el);
  const nuevos = [];
  let sinFecha = 0;
  for (const a of lista) {
    const f = dia(a.fecha_carga);
    if (conMarca) {
      if (vistos.has(String(a.id_documento))) continue;
      /* con el tope alcanzado, lo anterior al corte se dio por visto */
      if (corte && f && f < corte) continue;
      nuevos.push(a);
      if (!f) sinFecha++;
      continue;
    }
    /* SIN marca: novedad es lo publicado DESPUÉS de guardar. Sin fecha no se
       puede comparar y no se afirma que sea nuevo: se cuenta aparte. */
    if (!f) { sinFecha++; continue; }
    if (!corte || f > corte) nuevos.push(a);
  }
  nuevos.sort((a, b) => String(b.fecha_carga || "").localeCompare(String(a.fecha_carga || "")) || String(b.id_documento).localeCompare(String(a.id_documento)));
  return {
    ...base,
    nuevos: nuevos.slice(0, MAX_NUEVOS_LISTADOS).map((a) => ({
      id_documento: String(a.id_documento), nombre: a.nombre || null,
      tipo: a.tipo || "otro", tipo_legible: a.tipo_legible || null,
      fecha_carga: dia(a.fecha_carga), url: a.url || null,
      legible: a.legible !== false, caliente: TIPOS_CALIENTES.includes(a.tipo),
    })),
    n: nuevos.length,
    listados: Math.min(nuevos.length, MAX_NUEVOS_LISTADOS),
    sin_fecha: sinFecha,
    referencia: conMarca ? { tipo: "visto", el: m.el, desde: m.desde } : { tipo: "guardado", el: guardado_el, desde: corte },
  };
}

/* La frase de la tarjeta. Dice CUÁNTOS, DE QUÉ TIPO y DESDE CUÁNDO — nunca «hay
   novedades» a secas, que obliga a abrir para saber si vale la pena. */
function fraseNovedades(n) {
  if (!n || !n.n) {
    if (n && n.sin_fecha) return `La entidad no ha publicado documentos nuevos desde entonces (${n.sin_fecha} ${n.sin_fecha === 1 ? "archivo no trae fecha de publicación y no se puede" : "archivos no traen fecha de publicación y no se pueden"} comparar).`;
    return "La entidad no ha publicado documentos nuevos desde entonces.";
  }
  const calientes = n.nuevos.filter((x) => x.caliente);
  const cuantos = `${n.n} ${n.n === 1 ? "documento nuevo" : "documentos nuevos"}`;
  const desde = n.referencia && n.referencia.tipo === "guardado" ? "desde que lo guardó" : "desde la última vez que los dio por vistos";
  if (!calientes.length) return `La entidad publicó ${cuantos} ${desde}.`;
  const primero = calientes[0];
  const que = (primero.tipo_legible || "documento").toLowerCase();
  return `La entidad publicó ${cuantos} ${desde}, y uno de ellos es ${que === "adenda" ? "una" : "un"} ${que}${primero.fecha_carga ? ` del ${fechaLegible(primero.fecha_carga)}` : ""}.`;
}

/* ═══ LA REVISIÓN QUE HACE USTED ═════════════════════════════════════════════
   Lo que la aplicación NO puede leer, dicho sin rodeos y convertido en una
   acción con fecha. Devuelve qué enseñar y, si toca, con cuánta urgencia. */
function revisionDe({ marca = null, url = null, cerrado = null, dias_para_cierre = null, hay_nuevos = false, hoy = null } = {}) {
  const m = normalizarMarca(marca);
  const d = diaValido(hoy);
  const revisadoDia = m.revisado_el ? dia(m.revisado_el) : null;
  /* la cuenta de días entre dos días ya existe en el casillero: se llama, no se
     reescribe (require diferido: seguimiento → novedades → seguimiento) */
  const desde = revisadoDia && d ? require("./seguimiento.js").diasEntreDias(revisadoDia, d) : null;
  const abierto = cerrado === false;
  const cerca = abierto && dias_para_cierre != null && dias_para_cierre <= 7;
  /* Con el cierre encima el hueco tolerable se aprieta: dos días a menos de una
     semana del cierre, cinco el resto del tiempo. Con documentos nuevos sin ver,
     toca ya. */
  const tope = cerca ? 2 : DIAS_SIN_REVISAR;
  const toca = abierto && (hay_nuevos || revisadoDia == null || (desde != null && desde >= tope));
  return {
    puede_leerlos: false,
    url: url || null,
    revisado_el: m.revisado_el || null,
    revisado_hace_dias: desde,
    toca_revisar: toca,
    urgencia: !toca ? null : (hay_nuevos || (cerca && dias_para_cierre != null && dias_para_cierre <= 3)) ? "alta" : cerca ? "media" : "baja",
    /* La frase NO promete lo que no hay. Dice qué hace la aplicación (avisar de
       lo publicado) y qué le toca a usted (leer los mensajes), y por qué. */
    porque: "Los mensajes y las observaciones de un proceso viven dentro de su cuenta de SECOP II y ninguna fuente abierta los publica: esta pantalla no puede leerlos. Lo que sí hace es avisarle de cada documento que la entidad publique y recordarle entrar a mirar.",
    frase: !abierto ? "El proceso ya cerró: lo que quede en los mensajes es del trámite, no de la oferta."
      : revisadoDia == null ? "No ha anotado ninguna revisión de los mensajes de este proceso."
        : desde === 0 ? "Revisó los mensajes hoy."
          : desde === 1 ? "Revisó los mensajes ayer."
            : `Revisó los mensajes hace ${desde} días (${fechaLegible(revisadoDia)}).`,
  };
}

/* ═══ LO QUE ENTRA EN EL CENTRO DE ALERTAS ═══════════════════════════════════
   Dos avisos como mucho por proceso: los documentos nuevos (uno, con el conteo)
   y el recordatorio de revisar. Un aviso por documento convertiría el centro de
   alertas en un registro de sucesos, que es lo que el dueño pidió evitar. */
function alertasDe({ id, nombre, novedades = null, revision = null, url = null }) {
  const out = [];
  if (novedades && novedades.n) {
    const calientes = novedades.nuevos.filter((x) => x.caliente).length;
    out.push({ tipo: "novedad", id, proceso: nombre, fecha: novedades.nuevos[0].fecha_carga || null,
      urgencia: calientes ? "alta" : "media", url: url || null, cuantos: novedades.n,
      mensaje: `${fraseNovedades(novedades)} Ábralos desde la tarjeta o entre a SECOP II.` });
  }
  if (revision && revision.toca_revisar) {
    out.push({ tipo: "revisar_mensajes", id, proceso: nombre, fecha: null, urgencia: revision.urgencia || "baja", url: url || null,
      mensaje: `Entre a SECOP II y mire «Observaciones y mensajes» de este proceso. ${revision.frase} Esta pantalla no puede leerlos por usted.` });
  }
  return out;
}

module.exports = {
  MAX_DOCS_VISTOS, MAX_NUEVOS_LISTADOS, DIAS_SIN_REVISAR, TIPOS_CALIENTES,
  normalizarMarca, marcaDeVisto, nuevosDe, fraseNovedades, revisionDe, alertasDe,
};
