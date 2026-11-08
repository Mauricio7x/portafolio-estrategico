/* lib/entregar.js · «LO QUE TIENE QUE ENTREGAR»: UNA SOLA LISTA POR PROCESO, ARMADA EN EL SERVIDOR (3-nov-2026)
   ─────────────────────────────────────────────────────────────────────────────
   Encargo del dueño: por proceso, la lista de lo que exige el pliego para presentar la
   oferta, cada fila con cita y página, marcable por el usuario (por conseguir · en
   trámite · listo · no aplica), guardada por perfil y proceso. «Lo no leído se dice.
   Ante la duda, la fila sale «por confirmar»: aquí lo caro es que falte un requisito».

   UNA lista que une cuatro fuentes, y cada fila dice de cuál salió (`fuente`):
     1) «pliego»: lo leído del pliego con su cita (lib/entregables, en los hechos de cada
        documento de la familia del pliego). El documento que manda es el que elige
        `candidatosAlTextoDelPliego` (la misma regla del dictamen y del cronograma); las
        adendas y los demás definitivos SUMAN filas; una fila que solo trae una versión
        anterior sale «por confirmar» (puede que la nueva la quitó o la renumeró).
     2) «calculado»: lo que la guía ya calcula para ESTE proceso (garantía de seriedad,
        experiencia, indicadores y capital de trabajo, capacidad residual, registro,
        manifestación). Se PEGA a la fila del pliego que entrega eso (el Formato 3 lleva la
        experiencia que exige el pliego); si el pliego no la nombra, va sola.
     3) «dictamen»: del dictamen del pliego, SOLO las filas cuya cita la aplicación
        comprobó en su página (decisión D3 del dueño). El resumen es del modelo; la cita, no.
     4) «usual»: lo que no salió del pliego leído pero se suele pedir (RUP, existencia y
        representación, cédula, carta de presentación, seguridad social, oferta económica,
        garantía de seriedad), MARCADO como tal y siempre «por confirmar» (decisión D2).

   LAS MARCAS NO TIENEN ALMACÉN PROPIO. Son documentos del PAPELEO del expediente
   (lib/seguimiento.normalizarDocumentos) con un campo `req`: la identidad de la fila
   (tipo + número + nombre normalizado, lib/entregables.idDe). Una adenda que renumera
   el Formato 8 al 10 no deja la marca huérfana: se busca por identidad exacta, luego por
   tipo y nombre, luego por tipo y número con un nombre parecido. Lo que no casa con
   ninguna fila NO se pierde: sale en `huerfanas`, con su estado, para que el usuario la
   quite o vuelva a marcar la fila que corresponda. Y un documento suyo SIN `req` cuyo tipo es el de un requisito de la
   guía (la póliza que anotó como «garantía de seriedad») le da su estado a esa fila.

   El falso caro aquí es el NEGATIVO (que falte un requisito): ninguna regla de este módulo
   quita una fila por duda; la duda se dice. */
"use strict";

const E = require("./entregables.js");

const ESTADOS = Object.freeze(["por_conseguir", "en_tramite", "listo", "no_aplica"]);
const MAX_HUERFANAS = 40;
const MAX_DICTAMEN = 40;

/* la frase de cada duda, en un solo sitio (lib/entregables guarda solo el código) */
const POR_QUE = Object.freeze({
  solo_lista: "Solo aparece en la lista de formatos del pliego: el texto no dice cuándo se entrega.",
  anexo_dudoso: "No es claro si este anexo lo diligencia usted o solo lo publica la entidad.",
  sin_nombre: "El pliego lo nombra sin decir qué es.",
  dos_nombres: "El pliego le da otro nombre en otra parte: confirme cuál es.",
  no_reconocido: "La aplicación leyó que el pliego pide este documento, pero no lo reconoce: confirme qué es y si le aplica.",
  sin_verbo: "El pliego lo menciona, pero no dice con esas palabras que usted lo entregue: confírmelo.",
  version_anterior: "Sale en una versión anterior del pliego y no en la más nueva que se leyó: confirme si sigue.",
  calculado: "La aplicación lo calcula para este proceso; el pliego leído no nombra con qué documento se entrega: confírmelo.",
  calculado_sin_pliego: "La aplicación lo calcula para este proceso; el pliego todavía no se ha leído: confirme en él cómo se entrega.",
  dictamen: "Lo encontró el dictamen del pliego. La cita está comprobada en esa página; el resumen no: léala.",
  usual: "No salió del pliego leído, pero se suele pedir: confírmelo en el pliego.",
  usual_sin_pliego: "El pliego todavía no se ha leído. Esto se suele pedir: confírmelo cuando se lea.",
});

/* lo que la guía calcula y a qué fila del pliego se pega */
const VINCULOS = Object.freeze([
  { req: "garantia_seriedad", exig: [], casa: (f) => f.clave === "garantia-seriedad", nueva: { tipo: "garantia", nombre: "Garantía de seriedad de la oferta", clave: "garantia-seriedad" } },
  { req: "experiencia", exig: ["experiencia_general", "experiencia_especifica"], casa: (f) => !!f.numero && /experiencia/.test(f.clave || "") && !/^matriz$/.test(f.tipo), nueva: { tipo: "requisito", nombre: "Experiencia (con el formato o las certificaciones que pida el pliego)", clave: "experiencia" } },
  { req: "financieros", exig: ["liquidez", "endeudamiento", "cobertura", "rentabilidad_patrimonio", "rentabilidad_activo", "capital_trabajo", "patrimonio"], casa: (f) => !!f.numero && /capacidad-financiera|financier|indicador/.test(f.clave || "") && !/^matriz$/.test(f.tipo), nueva: { tipo: "requisito", nombre: "Capacidad financiera y organizacional (indicadores y capital de trabajo)", clave: "capacidad-financiera" } },
  { req: "capacidad", exig: [], casa: (f) => !!f.numero && /residual/.test(f.clave || ""), nueva: { tipo: "requisito", nombre: "Capacidad para facturar este contrato sin pasarse (se calcula con su registro)", clave: "capacidad-contratar" } },
  /* donde la ley no exige el registro (mínima cuantía, lib/requisitos_ley vía la guía) no se pide como fila nueva */
  { req: "registro", exig: [], omitir: (r) => r.pide_registro === false || /no lo exige/i.test(String(r.titulo || "")), casa: (f) => f.clave === "rup", nueva: { tipo: "documento", nombre: "Certificado del Registro Único de Proponentes (RUP)", clave: "rup" } },
  { req: "manifestacion", exig: [], casa: (f) => /manifestacion-interes/.test(f.clave || ""), nueva: { tipo: "requisito", nombre: "Manifestación de interés en SECOP II", clave: "manifestacion-interes" } },
  { req: "personal_y_visita", exig: [], casa: (f) => f.clave === "constancia-visita" || f.clave === "hojas-vida", nueva: null },
]);
/* lo que se suele pedir (D2): solo si el pliego leído no lo trae ya, y siempre «por confirmar» */
const USUALES = Object.freeze([
  { clave: "rup", nombre: "Certificado del Registro Único de Proponentes (RUP)", tipo: "documento", ya: (f) => f.clave === "rup", siPideRegistro: true },
  { clave: "existencia-representacion", nombre: "Certificado de existencia y representación legal", tipo: "documento", ya: (f) => f.clave === "existencia-representacion", condicion: "Para personas jurídicas." },
  { clave: "documento-identidad", nombre: "Documento de identidad del proponente o del representante legal", tipo: "documento", ya: (f) => f.clave === "documento-identidad" },
  { clave: "carta-presentacion-oferta", nombre: "Carta de presentación de la oferta, firmada", tipo: "documento", ya: (f) => /carta-presentacion/.test(f.clave || "") },
  { clave: "seguridad-social", nombre: "Certificación de pagos de seguridad social y aportes parafiscales", tipo: "documento", ya: (f) => f.clave === "seguridad-social" || /seguridad-social|aporte/.test(f.clave || "") },
  { clave: "oferta-economica", nombre: "Oferta económica", tipo: "documento", ya: (f) => f.clave === "oferta-economica" || (f.tipo === "formulario" && /presupuesto|oferta|economic/.test(f.clave || "")) },
  { clave: "garantia-seriedad", nombre: "Garantía de seriedad de la oferta", tipo: "garantia", ya: (f) => f.clave === "garantia-seriedad" },
  { clave: "documento-conformacion-plural", nombre: "Documento de conformación del consorcio o unión temporal", tipo: "documento", ya: (f) => /conformacion|consorcio|union-temporal/.test(f.clave || ""), condicion: "Solo si se presenta en consorcio o unión temporal." },
]);

const primeraFrase = (s, max = 220) => {
  const t = String(s || "").replace(/\s+/g, " ").trim();
  if (!t) return null;
  const i = t.search(/\.\s/);
  const f = i > 0 && i < max ? t.slice(0, i + 1) : t.length > max ? `${t.slice(0, max).replace(/\s+\S*$/, "")}…` : t;
  return f;
};
const diaValido = (d) => (/^\d{4}-\d{2}-\d{2}$/.test(String(d || "")) ? String(d) : null);

/* ── 1 · lo leído de los documentos de la familia del pliego ─────────────────────────────────── */
function filasDelPliego(docs) {
  const Docs = require("./documentos_proceso.js");
  const leidos = Object.entries((docs && docs.leidos) || {}).map(([id, x]) => ({ ...x, id_documento: id }))
    .filter((x) => x && Docs.TIPOS_ENTREGABLES.includes(x.tipo) && !(x.hechos && x.hechos.plantilla_en_blanco));
  const conLectura = leidos.filter((x) => x.hechos && x.hechos.entregables && Array.isArray(x.hechos.entregables.filas));
  const porActualizar = leidos.filter((x) => !(x.hechos && x.hechos.entregables)).map((x) => x.nombre || "documento");
  const definitivos = conLectura.filter((x) => !Docs.esBorradorDoc(x));
  /* el documento que manda (la misma regla del dictamen y del cronograma), y los demás que suman */
  const elegido = Docs.candidatosAlTextoDelPliego(docs).find((c) => conLectura.some((x) => x.id_documento === c.id_documento)) || null;
  const fuentes = definitivos.length ? definitivos : conLectura;   // solo borradores: se usan, y se dice
  const fechaElegido = elegido ? String(elegido.fecha_carga || "").slice(0, 10) : "";
  const filas = new Map();   // id → fila
  const deLaEntidad = new Map();
  /* el elegido primero: sus citas y páginas mandan; luego lo más nuevo */
  const orden = [...fuentes].sort((a, b) => Number(!(elegido && a.id_documento === elegido.id_documento)) - Number(!(elegido && b.id_documento === elegido.id_documento))
    || String(b.fecha_carga || "").localeCompare(String(a.fecha_carga || "")));
  for (const d of orden) {
    const anterior = !!fechaElegido && d.tipo !== "adenda" && !!d.fecha_carga && String(d.fecha_carga).slice(0, 10) < fechaElegido;
    for (const f of d.hechos.entregables.filas) {
      const id = E.idDe(f);
      if (filas.has(id)) { const g = filas.get(id); if (!g.tambien_en.includes(d.nombre)) g.tambien_en.push(d.nombre); if (!anterior && g.duda === "version_anterior") g.duda = f.duda || null; continue; }
      filas.set(id, { ...f, id, documento: d.nombre || null, tambien_en: [], duda: anterior ? "version_anterior" : f.duda || null });
    }
    for (const x of d.hechos.entregables.de_la_entidad || []) { const k = `${x.tipo}|${x.numero}`; if (!deLaEntidad.has(k)) deLaEntidad.set(k, { ...x, documento: d.nombre || null }); }
  }
  /* EL MISMO PAPEL CON OTRO NÚMERO NO SE PINTA DOS VECES (revisión adversaria): con la versión vieja y la nueva leídas,
     «Formato 8 – Factores de desempate» (vieja) y «Formato 10 – Factores de desempate» (nueva) son UN papel. Pintar la
     vieja aparte hacía que marcarla cambiara la nueva. La vieja se funde en la nueva: su identidad queda como ALIAS (una
     marca hecha sobre ella casa exacta) y la nueva dice qué número tenía. Solo si la nueva es UNA: dos filas vigentes con
     el mismo nombre (13 y 14 «Acreditación de Mipyme») no reciben nada por nombre */
  const todas = [...filas.values()];
  for (const f of todas) { f.alias = f.alias || []; }
  for (const vieja of todas.filter((f) => f.duda === "version_anterior" && f.clave)) {
    const nuevas = todas.filter((f) => f !== vieja && f.duda !== "version_anterior" && f.tipo === vieja.tipo && f.clave === vieja.clave);
    if (nuevas.length !== 1) continue;
    nuevas[0].alias.push(vieja.id);
    if (vieja.numero && vieja.numero !== nuevas[0].numero) nuevas[0].antes = `${vieja.numero}`;
    filas.delete(vieja.id);
  }
  const recortados = conLectura.filter((x) => x.hechos.entregables.recortada === true).map((x) => x.nombre || "documento");
  return { filas: [...filas.values()], deLaEntidad: [...deLaEntidad.values()], elegido, soloBorrador: !definitivos.length && conLectura.length > 0, porActualizar, hayLectura: conLectura.length > 0, recortados };
}

/* ── lo que no se leyó (o se leyó a medias) de los documentos que importan para esta lista ─── */
function lecturaDe(docs) {
  const Docs = require("./documentos_proceso.js");
  const d = docs || {};
  const archivos = d.indice && Array.isArray(d.indice.archivos) ? d.indice.archivos : [];
  const importa = (t) => Docs.TIPOS_ENTREGABLES.includes(t);
  const leidos = d.leidos || {}, ilegibles = d.ilegibles || {};
  /* lo superado (una versión más vieja, el borrador con definitivo) no es «sin leer»: es lo que no hace falta leer */
  const superado = (m) => /versi[oó]n m[aá]s (?:vieja|nueva)|borrador no cuenta/i.test(String(m || ""));
  const sinLeer = archivos.filter((a) => a && a.de_la_entidad !== false && importa(a.tipo) && !leidos[a.id_documento] && !superado(a.motivo_omision) && !Docs.esBorradorDoc(a))
    .map((a) => ({ nombre: a.nombre || "documento", fecha_carga: a.fecha_carga ? String(a.fecha_carga).slice(0, 10) : null,
      motivo: (ilegibles[a.id_documento] && ilegibles[a.id_documento].motivo) || a.motivo_omision || (a.en_plan ? "todavía no se ha leído" : null) || a.motivo_ilegible || null }));
  const aMedias = Object.values(leidos).filter((x) => x && importa(x.tipo) && (Docs.escaneoAMedias(x) || x.recortado === true))
    .map((x) => ({ nombre: x.nombre || "documento", paginas: Number.isInteger(x.paginas) ? x.paginas : null, paginas_total: Number.isInteger(x.paginas_total) ? x.paginas_total : null, recortado: x.recortado === true }));
  return { hay_indice: !!d.indice, sin_leer: sinLeer.slice(0, 12), a_medias: aMedias.slice(0, 12) };
}

/* ── las marcas: del papeleo, por identidad y, si la versión cambió, por nombre ──────────── */
function emparejarMarcas(filas, documentos) {
  const marcas = (Array.isArray(documentos) ? documentos : []).filter((x) => x && typeof x.req === "string" && x.req);
  const porId = new Map(filas.map((f) => [f.id, f]));
  /* los ALIAS (la identidad de la fila vieja fundida, la de lo calculado o lo usual que absorbió una fila del pliego): una
     marca hecha antes de leer el pliego («documento||carta-presentacion-oferta») sigue en «Formato 1 – Carta…». Un alias que
     reclaman dos filas no vale para ninguna */
  const porAlias = new Map();
  for (const f of filas) for (const a of f.alias || []) { if (porId.has(a)) continue; porAlias.set(a, porAlias.has(a) ? null : f); }
  const usada = new Set();
  const huerfanas = [];
  const partes = (req) => { const [tipo = "", numero = "", clave = ""] = String(req).split("|"); return { tipo, numero, clave }; };
  /* pasadas de la más segura a la más laxa, para que una marca exacta no la gane antes otra parecida. Y primero en la
     VERSIÓN VIGENTE: con el pliego viejo («Formato 8 – Factores de desempate») y el nuevo («Formato 10 – …») leídos a la
     vez, la marca va a la fila del nuevo, no se queda en la que la versión nueva ya no trae */
  const vigente = (f) => f.duda !== "version_anterior";
  const exacta = (m, enVigor) => { const f = porId.get(m.req) || porAlias.get(m.req) || null; return f && vigente(f) === enVigor ? f : null; };
  /* POR NOMBRE, SOLO SI NO HAY DUDA DE CUÁL (revisión adversaria): el pliego tipo repite nombres —8H y 10H, 13 y 14
     «Acreditación (de) Mipyme»; 8 y 10B «…en condición de discapacidad»— y la primera fila con ese nombre era un «listo»
     en OTRO papel. Con varias, solo vale la del mismo número; si no la hay, la marca queda huérfana y se dice */
  const unica = (xs, p) => (xs.length === 1 ? xs[0] : xs.find((f) => String(f.numero || "").toLowerCase() === p.numero) || null);
  /* parecido sobre el nombre MÁS LARGO (sobre el corto, «Acreditación de Mipyme» y «Acreditación de emprendimientos y empresas
     de mujeres» se parecían en la mitad) */
  const parecidoFuerte = (a, b) => { const A = new Set(String(a || "").split("-").filter(Boolean)), B = new Set(String(b || "").split("-").filter(Boolean)); if (!A.size || !B.size) return 0; let n = 0; for (const w of A) if (B.has(w)) n++; return n / Math.max(A.size, B.size); };
  const pasadas = [
    (m) => exacta(m, true),
    (m) => { const p = partes(m.req); return p.clave ? unica(filas.filter((f) => vigente(f) && !usada.has(f.id) && f.tipo === p.tipo && f.clave === p.clave), p) : null; },
    (m) => { const p = partes(m.req); return p.numero ? unica(filas.filter((f) => vigente(f) && !usada.has(f.id) && f.tipo === p.tipo && String(f.numero || "").toLowerCase() === p.numero && parecidoFuerte(f.clave, p.clave) >= 0.75), p) : null; },
    (m) => exacta(m, false),
  ];
  const pendientes = [...marcas];
  pasadas.forEach((pasa, i) => {
    for (let k = pendientes.length - 1; k >= 0; k--) {
      const m = pendientes[k];
      const f = pasa(m);
      if (!f || usada.has(f.id)) continue;
      usada.add(f.id);
      f.marca = { id_doc: m.id, estado: ESTADOS.includes(m.estado) ? m.estado : "por_conseguir", vence: diaValido(m.vence), nota: m.nota || null, por: (i === 0 || i === 3) && m.req === f.id ? "marca" : "nombre_o_numero_cambio", req: m.req };
      pendientes.splice(k, 1);
    }
  });
  for (const m of pendientes) huerfanas.push({ id_doc: m.id, nombre: m.nombre || null, estado: ESTADOS.includes(m.estado) ? m.estado : "por_conseguir", vence: diaValido(m.vence), req: m.req });
  return huerfanas.slice(0, MAX_HUERFANAS);
}

/* ═════════ LA LISTA ═════════ */
function listaParaEntregar({ docs = null, guia = null, dictamen = null, documentos = [], hoy = null, cierre = null } = {}) {
  const P = filasDelPliego(docs);
  const filas = P.filas.map((f) => ({ ...f, fuente: "pliego" }));
  const req = (guia && Array.isArray(guia.requisitos)) ? guia.requisitos : [];
  const exig = (guia && Array.isArray(guia.exigencias)) ? guia.exigencias : [];
  const reqDe = (k) => req.find((r) => r && r.clave === k) || null;

  /* 2 · lo calculado, pegado a su fila o solo */
  for (const v of VINCULOS) {
    const r = reqDe(v.req);
    if (!r) continue;
    const ex = exig.filter((x) => v.exig.includes(x.clave) && (x.exige != null || x.estado === "no_cumple"));
    const cifras = ex.map((x) => `${x.titulo}: ${x.exige}`).join(" · ");
    /* sin dato la guía no tiene nada que decir de ESTE proceso: su frase («Se evalúa con la fila viva…») es de la
       aplicación, no del pliego, y no se copia a la fila (medido en Chromium con el Formato 5) */
    const dato = cifras || (r.estado === "sin_dato" ? null : primeraFrase(r.titulo && /\(/.test(r.titulo) ? `${r.titulo}. ${r.detalle || ""}` : r.detalle));
    const calculo = { requisito_guia: v.req, estado_app: r.estado || null, dato: dato || null, cita_app: r.cita ? { pagina: r.pagina != null ? r.pagina : null, cita: String(r.cita).slice(0, 200), documento: r.documento || null } : null };
    const destino = filas.filter((f) => v.casa(f));
    if (destino.length) {
      for (const f of destino) Object.assign(f, calculo);
      if (v.nueva && destino.length === 1) (destino[0].alias = destino[0].alias || []).push(E.idDe({ ...v.nueva, numero: null }));
      continue;
    }
    if (!v.nueva || (v.omitir && v.omitir(r))) continue;
    filas.push({ ...v.nueva, numero: null, id: E.idDe({ ...v.nueva, numero: null }), fuente: "calculado", pagina: calculo.cita_app ? calculo.cita_app.pagina : null, cita: calculo.cita_app ? calculo.cita_app.cita : null,
      documento: calculo.cita_app ? calculo.cita_app.documento : null, otras_paginas: [], tambien_en: [], origen: "guia", duda: P.hayLectura ? "calculado" : "calculado_sin_pliego", condicion: null, ...calculo });
  }

  /* 3 · el dictamen: solo lo citado y comprobado en su página (D3) */
  const deDictamen = dictamen && Array.isArray(dictamen.filas) ? dictamen.filas : [];
  for (const x of deDictamen.slice(0, MAX_DICTAMEN)) {
    if (!x || x.cita_verificada !== true || !x.cita || !x.texto) continue;
    /* por el TEXTO primero (revisión adversaria: «Visita de obra obligatoria…» con una cita que nombra el RUP de paso se
       perdía dentro de la fila del RUP); la cita solo si el texto no casa con nada */
    const cat = E.CATALOGO.find((c) => c.re.test(String(x.texto))) || E.CATALOGO.find((c) => c.re.test(String(x.cita)));
    const clave = cat ? cat.clave : E.claveNombre(x.texto);
    const ya = filas.find((f) => f.clave === clave || (clave && E.parecido(f.clave, clave) >= 0.6 && clave.split("-").length >= 2));
    if (ya) { ya.dictamen = { texto: String(x.texto).slice(0, 200), pagina: x.pagina, cita: String(x.cita).slice(0, 200) }; continue; }
    const base = { tipo: "documento", numero: null, nombre: cat ? cat.nombre : String(x.texto).slice(0, 140), clave };
    filas.push({ ...base, id: E.idDe(base), fuente: "dictamen", pagina: Number.isInteger(x.pagina) ? x.pagina : null, cita: String(x.cita).slice(0, 200), documento: (dictamen.documento && typeof dictamen.documento === "object" ? dictamen.documento.nombre : dictamen.documento) || null,
      otras_paginas: [], tambien_en: [], origen: "dictamen", duda: "dictamen", condicion: null });
  }

  /* 4 · lo usual que no salió del pliego (D2) */
  const registro = reqDe("registro");
  // el campo estable de la guía (8-nov-2026: con la invitación leída el título del registro cambia); el título, de respaldo
  const pideRegistro = !(registro && (registro.pide_registro === false || /no lo exige/i.test(String(registro.titulo || ""))));
  const pideGarantia = !guia || !!reqDe("garantia_seriedad");
  for (const u of USUALES) {
    const yaEstan = filas.filter(u.ya);
    if (yaEstan.length) { if (yaEstan.length === 1) (yaEstan[0].alias = yaEstan[0].alias || []).push(E.idDe({ tipo: u.tipo, numero: null, clave: u.clave })); continue; }
    if (u.siPideRegistro && !pideRegistro) continue;
    if (u.clave === "garantia-seriedad" && !pideGarantia) continue;
    const base = { tipo: u.tipo, numero: null, nombre: u.nombre, clave: u.clave };
    filas.push({ ...base, id: E.idDe(base), fuente: "usual", pagina: null, cita: null, documento: null, otras_paginas: [], tambien_en: [], origen: "usual",
      duda: P.hayLectura ? "usual" : "usual_sin_pliego", condicion: u.condicion || null });
  }

  /* las marcas del papeleo, y los documentos suyos con el tipo de un requisito de la guía */
  const huerfanas = emparejarMarcas(filas, documentos);
  const propios = (Array.isArray(documentos) ? documentos : []).filter((x) => x && !x.req && x.clave && x.clave !== "otro");
  const dia = diaValido(hoy), diaCierre = diaValido(String(cierre || "").slice(0, 10));
  const filasDeRequisito = (k) => filas.filter((x) => x.requisito_guia === k).length;
  for (const f of filas) {
    /* solo si el requisito de la guía se pega a UNA fila: la hoja de vida anotada como «equipo y visita» marcaba también la
       constancia de la visita (revisión adversaria, IDIGER) */
    if (!f.marca && f.requisito_guia && filasDeRequisito(f.requisito_guia) === 1) {
      const p = propios.find((x) => x.clave === f.requisito_guia);
      if (p) f.marca = { id_doc: p.id, estado: ESTADOS.includes(p.estado) ? p.estado : "por_conseguir", vence: diaValido(p.vence), nota: p.nombre || null, por: "documento" };
    }
    f.estado = f.marca ? f.marca.estado : "por_conseguir";
    const v = f.marca && f.marca.vence;
    /* la palabra dice lo mismo que el color: un «listo» que vence antes del cierre no está listo */
    f.alerta = f.estado === "no_aplica" || !v ? null : dia && v < dia ? "vencido" : diaCierre && v < diaCierre ? "vence_antes_del_cierre" : null;
    f.confianza = f.duda ? "por_confirmar" : "leido";
    f.por_que = f.duda ? POR_QUE[f.duda] || null : null;
    f.titulo = E.tituloDe(f);
    f.grupo = f.condicion ? "segun_caso" : "todos";
  }
  /* el orden de la pantalla: lo que le piden a todos primero; dentro, lo del pliego, lo calculado, el dictamen y lo usual */
  const ordenFuente = { pliego: 0, calculado: 1, dictamen: 2, usual: 3 };
  const enOrden = filas.map((f, i) => ({ f, i })).sort((a, b) => (a.f.grupo === "todos" ? 0 : 1) - (b.f.grupo === "todos" ? 0 : 1) || ordenFuente[a.f.fuente] - ordenFuente[b.f.fuente] || a.i - b.i).map((x) => x.f);

  const cuentan = enOrden.filter((f) => f.estado !== "no_aplica");
  const listos = cuentan.filter((f) => f.estado === "listo" && !f.alerta).length;
  const resumen = {
    total: enOrden.length, cuentan: cuentan.length, listos, no_aplica: enOrden.length - cuentan.length,
    en_tramite: cuentan.filter((f) => f.estado === "en_tramite").length,
    por_conseguir: cuentan.filter((f) => f.estado === "por_conseguir").length,
    por_confirmar: enOrden.filter((f) => f.confianza === "por_confirmar").length,
    con_problema_de_fecha: enOrden.filter((f) => f.alerta).length,
    huerfanas: huerfanas.length,
  };
  return {
    filas: enOrden, resumen, huerfanas,
    de_la_entidad: P.deLaEntidad,
    pliego: P.elegido ? { nombre: P.elegido.nombre || null, fecha_carga: P.elegido.fecha_carga ? String(P.elegido.fecha_carga).slice(0, 10) : null } : null,
    solo_borrador: P.soloBorrador, por_actualizar: P.porActualizar, hay_lectura: P.hayLectura,
    lectura: { ...lecturaDe(docs), recortados: P.recortados },
    dictamen: dictamen && dictamen.generado ? { generado: String(dictamen.generado).slice(0, 10), filas: deDictamen.filter((x) => x && x.cita_verificada === true).length } : null,
  };
}

module.exports = { listaParaEntregar, filasDelPliego, emparejarMarcas, lecturaDe, POR_QUE, VINCULOS, USUALES, ESTADOS };
