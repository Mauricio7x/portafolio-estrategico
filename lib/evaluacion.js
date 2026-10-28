"use strict";
/* lib/evaluacion.js · La CAPTURA de las evaluaciones de una entidad (Nivel 3, 26-oct-2026). PURO: sin red ni Redis.
   De un informe de evaluación, una resolución de adjudicación o un acta ya leídos por el navegador (texto con
   marcadores de página `\f<n>`), una sesión de Claude Code devuelve por oferta quién quedó hábil, por qué no, los
   puntajes y los puntos fuera del precio, y por proceso el método, la TRM y el adjudicatario, CADA DATO CON SU CITA.
   Aquí se verifica cada dato contra el texto guardado y se resumen los hechos de la entidad SOLO con lo verificado.
   Por qué así (docs/ADJUDICACION_NIVEL3_DISENO_2026-10-26.md § 10 y § 11):
   - el piloto de 30 mostró que, con los hábiles y el método reales, el motor de precio acierta al ganador casi
     siempre, y que donde no, lo decidieron los puntos fuera del precio: por eso se guardan también esos puntos;
   - una cifra se acepta solo si está COMPLETA dentro de su cita (como detekta-lector/lector/verificar_citas.py):
     un puntaje leído mal da una tasa creíble y falsa, y «sin dato» no es «cero»;
   - la cita se busca con `buscarCita`/`paginasDe` del dictamen (una sola regla de «está en el texto»).
   La elección del documento (`papel`, `elegirDocumento`) se mudó aquí desde tools/analisis/adjudicacion: las
   herramientas del piloto la llaman, no la copian. */

const Dic = require("./dictamen.js");

/* ── qué documento se lee de cada proceso ─────────────────────────────────── */
const nombrePlegado = (s) => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[_\-.]+/g, " ").replace(/\s+/g, " ").trim();
/* El papel de un archivo ya clasificado por `documentos_proceso.clasificarArchivo` (tipo + nombre). El nombre se
   pliega con la MISMA regla del clasificador (require diferido: documentos_proceso carga lectores que viven en ciclos). */
function papel(a) {
  const n = require("./documentos_proceso.js").nombrePlegado((a && a.nombre) || "");
  /* UN INFORME PARCIAL (28-oct-2026, medido en la primera lectura de producción): «INFORME DEFINITIVO DE EVALUACIÓN
     JURÍDICA» de Pasto dice que las tres ofertas cumplen en lo jurídico, pero no si quedaron hábiles en lo técnico y lo
     financiero, ni trae puntajes: con él no se sabe quién quedó hábil. El informe de UNA sola parte (jurídica,
     financiera o técnica, sin la económica ni la ponderación) va después de la resolución y del acta. */
  if (a && a.tipo === "informe_evaluacion") {
    /* LAS PARTES SON PALABRAS ENTERAS (revisión adversaria): «Politécnico», «comité técnico evaluador», «anexo técnico» o
       «Instituto Técnico» no son la evaluación técnica, y «evaluación de experiencia» sí es una parte. «General» no hace
       completo un informe («evaluación jurídica general» sigue siendo solo la jurídica). */
    const m = n.replace(/\b(?:comite|anexo|instituto|colegio|centro|servicio)s?\s+tecnic[oa]s?\b/g, " ");
    const partes = [/\bjuridic[oa]s?\b/, /\bfinancier[oa]s?\b/, /\btecnic[oa]s?\b/, /\bexperiencia\b/].filter((re) => re.test(m)).length;
    return partes === 1 && !/(econom|ponder|puntaj|consolid|integral|calificacion)/.test(m) ? "informe_parcial" : "informe_evaluacion";
  }
  if (a && a.tipo === "resolucion" && /adjudic/.test(n)) return "resolucion_adjudicacion";
  if (/\bacta\b/.test(n) && /(cierre|audiencia|adjudic|evaluac|apertura)/.test(n)) return "acta";
  if (/(habilitant|ponderab|verificacion de requisitos)/.test(n)) return "habilitantes_o_ponderables";
  return null;
}
const PRIORIDAD = ["informe_evaluacion", "resolucion_adjudicacion", "acta", "informe_parcial"];
/* El documento que se lee primero: por papel en el orden de PRIORIDAD; dentro del mismo papel, el último que la
   entidad cargó (un informe definitivo reemplaza al preliminar). Solo legibles (PDF u hoja). */
function elegirDocumento(archivos) {
  for (const p of PRIORIDAD) {
    const c = (archivos || []).filter((a) => papel(a) === p && a.legible).sort((x, y) => String(y.fecha_carga || "").localeCompare(String(x.fecha_carga || "")));
    if (c.length) return { papel: p, ...c[0], otros_del_mismo_papel: c.length - 1 };
  }
  return null;
}

/* ── el esquema que devuelve la sesión ───────────────────────────────────── */
const MOTIVOS = ["experiencia", "financiera", "juridica", "capacidad_residual", "tecnica", "precio_bajo", "no_subsano", "limitacion_mipyme", "formulario_oferta", "otro"];
/* Lo que la pantalla dice de cada motivo: en palabras del contratista, sin vocabulario interno. */
const MOTIVO_TEXTO = {
  experiencia: "experiencia", financiera: "indicadores financieros", juridica: "documentos jurídicos", capacidad_residual: "cupo para contratar",
  tecnica: "requisitos técnicos", precio_bajo: "precio muy por debajo del resto", no_subsano: "no corrigió a tiempo lo que le pidieron",
  limitacion_mipyme: "no cumplía la limitación a pequeñas empresas", formulario_oferta: "cambió el formulario de la oferta", otro: "otro motivo",
};
const CRITERIOS = ["calidad", "industria_nacional", "mujeres", "mipyme", "discapacidad", "gerencia_proyectos", "maquinaria", "plan_calidad", "ambiental", "social", "otro"];
const CRITERIO_TEXTO = {
  calidad: "factor de calidad", industria_nacional: "apoyo a la industria nacional", mujeres: "empresas de mujeres", mipyme: "pequeña empresa",
  discapacidad: "personas con discapacidad", gerencia_proyectos: "gerencia de proyectos", maquinaria: "maquinaria", plan_calidad: "plan de calidad",
  ambiental: "criterios ambientales", social: "criterios sociales", otro: "otro criterio",
};
const METODOS_CAPTURA = ["mediana", "geometrica", "aritmetica_baja", "menor_valor", "otro"];
const ESTADOS = ["habil", "rechazada", "sin_dato"];
const MAX_OFERTAS = 120;
const cita = { type: "string" }, pagina = { type: "integer" };
const ESQUEMA = {
  type: "object", required: ["documento_util", "ofertas"],
  properties: {
    documento_util: { type: "boolean" },
    motivo_no_util: { type: "string" },
    metodo: { type: "object", required: ["nombre", "cita", "pagina"], properties: { nombre: { type: "string", enum: METODOS_CAPTURA }, cita, pagina } },
    trm: { type: "object", required: ["valor", "cita", "pagina"], properties: { valor: { type: "string" }, fecha: { type: "string" }, cita, pagina } },
    adjudicatario: { type: "object", required: ["nombre", "cita", "pagina"], properties: { nombre: { type: "string" }, valor: { type: "string" }, cita, pagina } },
    ofertas: { type: "array", items: { type: "object", required: ["oferente", "estado", "cita", "pagina"], properties: {
      oferente: { type: "string" }, estado: { type: "string", enum: ESTADOS },
      estado_cita: cita, estado_pagina: pagina,
      motivo: { type: "string", enum: MOTIVOS }, motivo_texto: { type: "string" },
      valor: { type: "string" }, puntaje_precio: { type: "string" }, puntaje_total: { type: "string" },
      otros_puntos: { type: "array", items: { type: "object", required: ["criterio", "puntos"], properties: { criterio: { type: "string", enum: CRITERIOS }, puntos: { type: "string" } } } },
      cita, pagina } } },
  },
};

/* ── números escritos a la colombiana o a la inglesa ─────────────────────── */
/* «1.116.184.929», «$ 942,406,356.00», «49,5», «3.678,15», «3126.00». Con las dos marcas, la ÚLTIMA es la
   decimal. Con una sola marca repetida, son miles. Con una sola marca una vez: en dinero y en TRM, tres cifras
   detrás son miles («1.116» de un monto no es uno coma uno; «3.678» de una TRM son 3.678 pesos, no 3,678); en
   puntajes es la decimal. Sin cifras: null. */
function numeroDe(s, tipo = "puntaje") {
  if (s === null || s === undefined) return null;
  const t = String(s).replace(/[^\d.,]/g, "");
  if (!/\d/.test(t)) return null;
  const p = t.lastIndexOf("."), c = t.lastIndexOf(",");
  let dec = null;
  if (p >= 0 && c >= 0) dec = p > c ? "." : ",";
  else if (p >= 0 || c >= 0) {
    const sep = p >= 0 ? "." : ",", veces = t.split(sep).length - 1, tras = t.length - t.lastIndexOf(sep) - 1;
    dec = veces > 1 ? null : (tipo === "dinero" || tipo === "trm") && tras === 3 ? null : sep;
  }
  let n;
  if (dec) { const i = t.lastIndexOf(dec); n = Number(`${t.slice(0, i).replace(/[.,]/g, "")}.${t.slice(i + 1)}`); }
  else n = Number(t.replace(/[.,]/g, ""));
  return Number.isFinite(n) ? n : null;
}
const TIPO_DE_CAMPO = { valor: "dinero", puntaje_precio: "puntaje", puntaje_total: "puntaje", puntos: "puntaje", trm: "trm" };
/* ¿La cifra está COMPLETA en la cita? Por su VALOR, leído con la misma regla a los dos lados («100» y «100,00»
   son la misma; «4,95» y «49,5» no). Comparar solo los dígitos dejaba pasar una coma corrida, y un puntaje de
   precio diez veces menor voltea «ganó sin el mejor puntaje de precio» (revisión adversaria del 26-oct-2026).
   Una cifra que solo aparece dentro de otra más larga no cuenta. */
function cifraEnCita(campoTexto, citaTexto, tipo) {
  const enCita = [...String(citaTexto || "").matchAll(/\d[\d.,]*\d|\d/g)].map((m) => m[0]);
  const v = numeroDe(campoTexto, tipo);
  return v !== null && enCita.some((x) => { const w = numeroDe(x, tipo); return w !== null && Math.abs(w - v) <= 1e-9 * Math.max(1, Math.abs(v)); });
}

/* ── el oferente tiene que estar en su cita ──────────────────────────────── */
const GENERICAS = new Set("consorcio union temporal ut sas s a ltda limitada de del la las el los y e sa bic ingenieria ingenieros construcciones constructora obras servicios colombia proyectos".split(" "));
/* «A&N», «D&C», «S\&G»: el «&» se pega («an», «dc», «sg») a los dos lados de la comparación */
const limpio = (s) => nombrePlegado(s).replace(/\\?\s*&\s*/g, "").replace(/[^a-z0-9]+/g, " ").trim();
/* las palabras PROPIAS del nombre; un número suelto también lo es («CONSORCIO VIAS 1» no es «… 2») */
const fichas = (s) => limpio(s).split(" ").filter((t) => (t.length >= 2 || /^\d$/.test(t)) && !GENERICAS.has(t));
/* TODAS las palabras propias tienen que estar en la cita: con la mitad, «CONSORCIO VIAS DEL NORTE» se sostenía en la
   fila de «… DEL SUR» y «VIAL 2025» en la de «VIAL 2024» (revisión adversaria del 26-oct-2026). */
function nombreEnCita(nombre, citaTexto) {
  const f = fichas(nombre), c = ` ${limpio(citaTexto)} `;
  if (!f.length) { const n = limpio(nombre); return !!n && c.includes(` ${n} `); }
  return f.every((t) => c.includes(` ${t} `));
}
/* ¿Es el mismo oferente escrito de otra forma («CONSORCIO TORRE PT» y «CONSORCIO TORRE P.T.»)? Los números tienen
   que ser los mismos, las palabras propias de uno tienen que estar todas en el otro y compartir al menos la mitad. */
const numerosDe = (s) => limpio(s).split(" ").filter((t) => /^\d+$/.test(t)).sort().join(" ");
const parecido = (a, b) => {
  if (numerosDe(a) !== numerosDe(b)) return false;
  const x = new Set(fichas(a)), y = new Set(fichas(b));
  if (!x.size || !y.size) return limpio(a) === limpio(b);
  const i = [...x].filter((t) => y.has(t)).length;
  return (i === x.size || i === y.size) && i / (x.size + y.size - i) >= 0.5;
};

/* ── palabras que sostienen un estado o un método ────────────────────────── */
const RE_HABIL = /(habil|habilitad|cumple|aceptad|admisible|admitid|valida)/;
const RE_RECHAZO = /(rechaz|no cumple|incumpl|no habil|inhabil|no se habilit|no fue habilitad|descartad|no admisible|inadmisible|no admitid|no subsan|no valida|invalid|excluid)/;
/* «no se encuentra incurso en causales de rechazo» ni «en inhabilidades o incompatibilidades» es lo que se dice de
   una oferta HÁBIL: esas frases nombran la regla, no un rechazo, y se quitan antes de buscar la palabra. */
const sinNombresDeReglas = (s) => s.replace(/causal(?:es)? de rechazo/g, " ").replace(/\b(?:inhabilidad|incompatibilidad)(?:es)?\b/g, " ");
/* el motivo de un rechazo también se sostiene en el texto: con su palabra en la cita del estado o en la frase del motivo */
const RE_MOTIVO = {
  experiencia: /experiencia/, financiera: /(financier|liquidez|endeudamiento|cobertura de intereses|capital de trabajo|rentabilidad)/,
  juridica: /(juridic|garantia|poliza|camara de comercio|existencia y representacion|antecedentes|parafiscal|seguridad social|\brup\b|registro unico de proponentes)/,
  capacidad_residual: /(capacidad residual|capacidad de contratacion|\bk ?r\b)/, tecnica: /(tecnic|personal|profesional|maquinaria|equipo)/,
  precio_bajo: /(artificialmente baj|precio baj|valor baj|presuntamente baj)/, no_subsano: /subsan/, limitacion_mipyme: /(mipyme|limitacion)/,
  formulario_oferta: /(formulario|oferta economica|propuesta economica|modific)/, otro: /./,
};
const RE_METODO = { mediana: /mediana/, geometrica: /geometric/, aritmetica_baja: /aritmetica baja|media aritmetica baja/, menor_valor: /menor valor|menor precio/, otro: /./ };

/* ── la verificación ─────────────────────────────────────────────────────── */
/* `captura` es lo que devolvió la sesión; `texto` el documento guardado (con marcadores de página);
   `paginas_sin_leer`, las páginas con imagen que el OCR no leyó; `recortado`, si el texto pasó del tope y se cortó.
   Devuelve { errores } si la forma no cuadra con el esquema, o { captura, verificacion } con SOLO lo que se
   sostiene: una oferta cuya cita no está en el texto o no nombra al oferente se aparta entera; una cifra que no
   está completa en su cita se quita (queda «sin dato») y se anota por qué.
   `captura.completa` dice si el proceso se puede usar para las reglas de precio y de puntos fuera del precio:
   ninguna oferta apartada, ninguna sin estado, ninguna repetida con datos distintos, ninguna página sin leer y el
   texto entero.
   Sin eso, la oferta que faltaba podía ser justo la del mejor puntaje de precio (revisión adversaria, 26-oct-2026). */
function verificarCaptura(captura, texto, { paginas_sin_leer = [], recortado = false } = {}) {
  const errores = Dic.validarContraEsquema(captura, ESQUEMA);
  if (errores.length) return { errores: errores.slice(0, 8) };
  if (captura.ofertas.length > MAX_OFERTAS) return { errores: [`raiz.ofertas: más de ${MAX_OFERTAS} ofertas`] };
  const indice = Dic.paginasDe(texto);
  const apartados = [];
  let total = 0, verificadas = 0, incompleta = false;
  /* `buscarCita` compara solo los primeros CITA_MAX caracteres: una cita más larga se aparta ENTERA, porque el
     nombre y las cifras se buscan en toda la cita y una cola inventada se colaba detrás de 200 caracteres reales.
     Recortarla no basta: la misma cola entraría por el recorte. */
  const comprobar = (c, p) => {
    total++;
    if (Dic.plegar(c).length > Dic.CITA_MAX) return { motivo: "cita_demasiado_larga" };
    const r = Dic.buscarCita(c, p, indice);
    if (r.verificada || r.pagina_real) verificadas++;
    return r;
  };
  const aparta = (campo, i, motivo, extra = {}) => apartados.push({ campo, indice: i, motivo, ...extra });
  const enPagina = (r) => (r && (r.verificada || r.pagina_real) ? (r.pagina_real || null) : null);

  const ofertas = [];
  captura.ofertas.forEach((o, i) => {
    const r = comprobar(o.cita, o.pagina);
    if (!(r.verificada || r.pagina_real)) { incompleta = true; return aparta("ofertas", i, r.motivo || "cita_no_encontrada", { oferente: o.oferente }); }
    if (!nombreEnCita(o.oferente, o.cita)) { incompleta = true; return aparta("ofertas", i, "la_cita_no_nombra_al_oferente", { oferente: o.oferente }); }
    const v = { oferente: o.oferente, cita: o.cita, pagina: enPagina(r) };
    for (const k of ["valor", "puntaje_precio", "puntaje_total"]) {
      if (o[k] === undefined) continue;
      if (cifraEnCita(o[k], o.cita, TIPO_DE_CAMPO[k])) v[k] = numeroDe(o[k], TIPO_DE_CAMPO[k]);
      else aparta(`ofertas.${k}`, i, "cifra_fuera_de_la_cita", { oferente: o.oferente, cifra: o[k] });
    }
    if (Array.isArray(o.otros_puntos)) {
      const otros = [];
      o.otros_puntos.forEach((x) => { if (cifraEnCita(x.puntos, o.cita, "puntaje")) otros.push({ criterio: x.criterio, puntos: numeroDe(x.puntos, "puntaje") }); else aparta("ofertas.otros_puntos", i, "cifra_fuera_de_la_cita", { oferente: o.oferente, criterio: x.criterio, cifra: x.puntos }); });
      if (otros.length) v.otros_puntos = otros;
    }
    /* el estado: con una palabra que lo sostenga en la cita de la fila o en la suya propia. Una oferta con puntaje
       de precio comprobado está en la tabla de ponderación, que solo trae hábiles; pero un puntaje NO gana a una
       palabra de rechazo («RECHAZADA 0,00»): ante la duda, «sin dato». */
    let sostenEstado = nombrePlegado(o.cita);
    if (o.estado_cita) {
      const re = comprobar(o.estado_cita, o.estado_pagina);
      if (re.verificada || re.pagina_real) sostenEstado += ` ${nombrePlegado(o.estado_cita)}`;
      else aparta("ofertas.estado_cita", i, re.motivo || "cita_no_encontrada", { oferente: o.oferente });
    }
    const palabras = sinNombresDeReglas(sostenEstado), rechazo = RE_RECHAZO.test(palabras);
    if (o.estado === "rechazada" && rechazo) v.estado = "rechazada";
    else if (o.estado === "habil" && !rechazo && (RE_HABIL.test(palabras) || typeof v.puntaje_precio === "number")) v.estado = "habil";
    else { v.estado = "sin_dato"; if (o.estado !== "sin_dato") aparta("ofertas.estado", i, "estado_sin_respaldo_en_la_cita", { oferente: o.oferente, estado: o.estado }); }
    if (v.estado === "rechazada" && o.motivo) {
      /* la frase del motivo cuenta si está en el texto (en cualquier página: suele venir en otro párrafo) */
      const frase = o.motivo_texto && Dic.plegar(o.motivo_texto).length <= Dic.CITA_MAX && Dic.buscarCita(o.motivo_texto, null, indice);
      const fraseOk = !!(frase && (frase.verificada || frase.pagina_real));
      if (RE_MOTIVO[o.motivo].test(`${palabras} ${fraseOk ? sinNombresDeReglas(nombrePlegado(o.motivo_texto)) : ""}`)) {
        v.motivo = o.motivo;
        if (fraseOk) v.motivo_texto = String(o.motivo_texto).slice(0, 240);
      } else aparta("ofertas.motivo", i, "motivo_sin_respaldo_en_el_texto", { oferente: o.oferente, motivo: o.motivo });
    }
    ofertas.push(v);
  });

  /* UNA ENTRADA POR OFERENTE: la misma oferta capturada de dos tablas (habilitación y ponderación) se junta; si las
     dos dicen cosas distintas, la cifra o el estado en disputa quedan «sin dato» y el proceso, incompleto. */
  const porNombre = new Map();
  for (const v of ofertas) { const k = limpio(v.oferente); if (!porNombre.has(k)) porNombre.set(k, []); porNombre.get(k).push(v); }
  const unicas = [];
  for (const grupo of porNombre.values()) {
    if (grupo.length === 1) { unicas.push(grupo[0]); continue; }
    const u = { ...grupo[0] };
    for (const k of ["valor", "puntaje_precio", "puntaje_total"]) {
      const vals = [...new Set(grupo.map((g) => g[k]).filter((x) => typeof x === "number"))];
      if (vals.length === 1) u[k] = vals[0]; else { delete u[k]; if (vals.length > 1) { incompleta = true; aparta(`ofertas.${k}`, null, "oferente_repetido_con_cifras_distintas", { oferente: u.oferente }); } }
    }
    const crit = new Map();
    for (const g of grupo) for (const x of g.otros_puntos || []) { if (!crit.has(x.criterio)) crit.set(x.criterio, new Set()); crit.get(x.criterio).add(x.puntos); }
    const otros = [...crit.entries()].filter(([, set]) => set.size === 1).map(([criterio, set]) => ({ criterio, puntos: [...set][0] }));
    if (otros.length) u.otros_puntos = otros; else delete u.otros_puntos;
    const estados = [...new Set(grupo.map((g) => g.estado).filter((e) => e !== "sin_dato"))];
    u.estado = estados.length === 1 ? estados[0] : "sin_dato";
    if (estados.length > 1) { incompleta = true; aparta("ofertas.estado", null, "oferente_repetido_con_estados_distintos", { oferente: u.oferente }); }
    const conMotivo = grupo.find((g) => g.motivo);
    delete u.motivo; delete u.motivo_texto;
    if (u.estado === "rechazada" && conMotivo) { u.motivo = conMotivo.motivo; if (conMotivo.motivo_texto) u.motivo_texto = conMotivo.motivo_texto; }
    unicas.push(u);
  }

  const proceso = {};
  if (captura.metodo) {
    const r = comprobar(captura.metodo.cita, captura.metodo.pagina);
    if ((r.verificada || r.pagina_real) && RE_METODO[captura.metodo.nombre].test(nombrePlegado(captura.metodo.cita))) proceso.metodo = captura.metodo.nombre;
    else aparta("metodo", null, r.verificada || r.pagina_real ? "la_cita_no_nombra_el_metodo" : r.motivo || "cita_no_encontrada");
  }
  if (captura.trm) {
    const r = comprobar(captura.trm.cita, captura.trm.pagina);
    if ((r.verificada || r.pagina_real) && cifraEnCita(captura.trm.valor, captura.trm.cita, "trm")) proceso.trm = { valor: numeroDe(captura.trm.valor, "trm"), ...(captura.trm.fecha ? { fecha: String(captura.trm.fecha).slice(0, 40) } : {}) };
    else aparta("trm", null, r.verificada || r.pagina_real ? "cifra_fuera_de_la_cita" : r.motivo || "cita_no_encontrada");
  }
  if (captura.adjudicatario) {
    const a = captura.adjudicatario, r = comprobar(a.cita, a.pagina);
    if ((r.verificada || r.pagina_real) && nombreEnCita(a.nombre, a.cita)) {
      proceso.adjudicatario = { nombre: a.nombre };
      if (a.valor !== undefined) { if (cifraEnCita(a.valor, a.cita, "dinero")) proceso.adjudicatario.valor = numeroDe(a.valor, "dinero"); else aparta("adjudicatario.valor", null, "cifra_fuera_de_la_cita"); }
    } else aparta("adjudicatario", null, r.verificada || r.pagina_real ? "la_cita_no_nombra_al_adjudicatario" : r.motivo || "cita_no_encontrada");
  }
  const sinLeer = (Array.isArray(paginas_sin_leer) ? paginas_sin_leer : []).filter((n) => Number.isInteger(n) && n > 0);
  const util = captura.documento_util === true && unicas.length > 0;
  const completa = util && !incompleta && unicas.every((o) => o.estado !== "sin_dato") && !sinLeer.length && !recortado;
  return {
    captura: { documento_util: util, completa, ...(captura.documento_util === false && captura.motivo_no_util ? { motivo_no_util: String(captura.motivo_no_util).slice(0, 240) } : {}), ...proceso, ofertas: unicas },
    verificacion: { citas_total: total, citas_verificadas: verificadas, ofertas_recibidas: captura.ofertas.length, ofertas_verificadas: unicas.length,
      completa, ...(sinLeer.length ? { paginas_sin_leer: sinLeer.length } : {}), apartados: apartados.slice(0, 60), apartados_total: apartados.length },
  };
}

/* ── los hechos de una entidad, solo con capturas verificadas ────────────── */
/* `capturas`: las guardadas de la entidad ({ portafolio, id_proceso, captura }). Cuenta, no promedia: la
   pantalla dice «X de N» con su N (frecuencia natural), y un dato que falta es «sin dato», nunca cero. */
function hechosDeEntidad(capturas) {
  const H = { procesos: 0, ofertas: 0, habiles: 0, rechazadas: 0, sin_dato: 0, motivos: {}, metodos: {},
    precio: { con_dato: 0, gano_sin_el_mejor_precio: 0 }, fuera_del_precio: { con_dato: 0, con_diferencias: 0, ofertas_que_perdieron: 0, criterios: {} }, procesos_detalle: [] };
  for (const c of capturas || []) {
    const k = c && c.captura;
    if (!k || k.documento_util !== true || !Array.isArray(k.ofertas) || !k.ofertas.length) continue;
    H.procesos++;
    const det = { id_proceso: c.id_proceso || null, portafolio: c.portafolio || null, ofertas: k.ofertas.length, rechazadas: 0, gano_sin_el_mejor_precio: null };
    for (const o of k.ofertas) {
      H.ofertas++;
      if (o.estado === "habil") H.habiles++;
      else if (o.estado === "rechazada") { H.rechazadas++; det.rechazadas++; const m = o.motivo || "sin_motivo"; H.motivos[m] = (H.motivos[m] || 0) + 1; }
      else H.sin_dato++;
    }
    if (k.metodo) H.metodos[k.metodo] = (H.metodos[k.metodo] || 0) + 1;
    H.procesos_detalle.push(det);
    /* Las dos reglas que siguen comparan ofertas entre sí: solo valen en un proceso COMPLETO (ninguna oferta
       apartada, ninguna sin estado, ninguna página sin leer). Con una oferta de menos, la que faltaba podía ser la
       del mejor puntaje de precio, y la frase saldría al revés. */
    if (k.completa !== true) continue;
    const habiles = k.ofertas.filter((o) => o.estado === "habil");
    /* ¿ganó la de mejor puntaje de precio? Solo si TODOS los hábiles traen su puntaje de precio y el
       adjudicatario es uno de ellos: con un hábil sin puntaje no se sabe quién era el mejor en precio. El
       adjudicatario se busca primero con su nombre exacto y, si no está, con uno parecido. */
    const exactos = k.adjudicatario ? habiles.filter((o) => limpio(o.oferente) === limpio(k.adjudicatario.nombre)) : [];
    const gan = exactos.length ? exactos : k.adjudicatario ? habiles.filter((o) => parecido(o.oferente, k.adjudicatario.nombre)) : [];
    if (habiles.length >= 2 && gan.length === 1 && habiles.every((o) => typeof o.puntaje_precio === "number")) {
      const mejor = Math.max(...habiles.map((o) => o.puntaje_precio));
      H.precio.con_dato++;
      det.gano_sin_el_mejor_precio = gan[0].puntaje_precio < mejor - 1e-9;
      if (det.gano_sin_el_mejor_precio) H.precio.gano_sin_el_mejor_precio++;
    }
    /* ¿sacaron todos los mismos puntos fuera del precio? total − precio, solo con los dos comprobados */
    const conAmbos = habiles.filter((o) => typeof o.puntaje_precio === "number" && typeof o.puntaje_total === "number");
    if (conAmbos.length >= 2 && conAmbos.length === habiles.length) {
      const fuera = conAmbos.map((o) => Math.round((o.puntaje_total - o.puntaje_precio) * 1e6) / 1e6);
      const max = Math.max(...fuera);
      H.fuera_del_precio.con_dato++;
      /* «perdió» es quedar a más de 0,01 del mejor: los totales se publican con dos decimales y el redondeo no es una pérdida */
      const perdieron = conAmbos.filter((o, i) => fuera[i] < max - 0.01);
      if (perdieron.length) {
        H.fuera_del_precio.con_diferencias++;
        H.fuera_del_precio.ofertas_que_perdieron += perdieron.length;
        /* qué criterio les faltó, cuando la captura trae el desglose: el que sacó menos que el mejor del proceso */
        const mejores = {};
        for (const o of conAmbos) for (const x of o.otros_puntos || []) mejores[x.criterio] = Math.max(mejores[x.criterio] ?? -Infinity, x.puntos);
        for (const o of perdieron) for (const x of o.otros_puntos || []) if (x.puntos < mejores[x.criterio] - 0.01) H.fuera_del_precio.criterios[x.criterio] = (H.fuera_del_precio.criterios[x.criterio] || 0) + 1;
      }
    }
  }
  return H;
}

/* ── lo que la sesión recibe para trabajar ───────────────────────────────── */
const INSTRUCCIONES = [
  "Lea el documento (un informe de evaluación, una resolución de adjudicación o un acta de un proceso de obra pública) y devuelva UN objeto JSON con el esquema `esquema`.",
  "Por cada oferta que el documento nombre: el oferente tal como está escrito; si quedó hábil, rechazada o no se sabe («sin_dato»); si fue rechazada, el motivo (una categoría) y su frase; y lo que el documento cifre de ella: valor de la oferta, puntaje de precio, puntaje total y los otros puntos por criterio.",
  "Las cifras van como TEXTO, copiadas tal cual del documento («$ 942,406,356.00», «49,5»): la aplicación las busca dentro de la cita.",
  "Cada oferta lleva `cita` (de 20 a 200 caracteres, copiada literal de UNA página) que contenga el nombre del oferente y todas las cifras que usted le da, y `pagina` (el número de «=== Página N ===»). Si el estado está en otra parte (por ejemplo, la tabla de rechazos), dé además `estado_cita` y `estado_pagina`.",
  "Una sola entrada por oferente: si aparece en dos tablas (habilitación y ponderación), junte sus datos en una entrada, con la cita de la fila que trae las cifras y `estado_cita` para la otra. Una cita de más de 200 caracteres se aparta entera.",
  "Una oferta que aparece en la tabla de ponderación o de puntajes es hábil. Si el documento no dice el estado de una oferta, ponga «sin_dato»: no lo deduzca. El motivo de un rechazo necesita su palabra en el texto («experiencia», «liquidez», «garantía»…): si el documento no la trae, use «otro».",
  "Método (`metodo`), TRM (`trm`) y adjudicatario (`adjudicatario`), solo si el documento los dice, con su cita. Lo que no esté en el texto se omite: nunca un cero ni un valor estimado.",
  "Si el documento no trae evaluación de ofertas (por ejemplo, un acta de apertura), devuelva `documento_util: false`, `motivo_no_util` y `ofertas: []`.",
].join("\n");
const COMO_DEVOLVER = "POST /api/pliego?op=evaluacion con { portafolio, motor: \"sesion\", captura } (con las mismas cabeceras de credencial con las que pidió el expediente, como dice la habilidad). La respuesta dice cuántas citas se comprobaron y qué se apartó y por qué.";

/* ── claves en Redis (los ayudantes de lib/almacen.js las escriben) ──────── */
const TEXTO_TTL_SEG = 30 * 86400;          // el texto solo hace falta hasta que la sesión lo lea
const CAPTURA_TTL_SEG = 400 * 86400;       // lo verificado dura más de un año: es la historia de la entidad
const claveCaptura = (portafolio) => `evaluacion:${portafolio}`;
const claveTexto = (portafolio) => `evaluacion:texto:${portafolio}`;
const CLAVE_PENDIENTES = "evaluacion:pendientes";
/* LOS PROCESOS CON SU EVALUACIÓN COMPLETA (28-oct-2026, decisión del dueño tras el consejo): HASH portafolio →
   fecha de la lectura, sin caducidad. Es el contador que Precios enseña frente a la meta de la prueba del % por
   precio (200 procesos de 2026 por modalidad con quién quedó hábil, docs/MEMORIA.md). Un HASH y no un número: la
   misma evaluación leída dos veces cuenta una vez, y la que deja de estar completa sale. */
const CLAVE_COMPLETAS = "evaluacion:completas";
const claveEntidad = (clave) => `evaluacion:entidad:${clave}`;
const MAX_POR_LECTURA = 5;                 // procesos cerrados que se leen por cada pulsación del botón

module.exports = {
  papel, PRIORIDAD, elegirDocumento, nombrePlegado,
  MOTIVOS, MOTIVO_TEXTO, CRITERIOS, CRITERIO_TEXTO, METODOS_CAPTURA, ESTADOS, ESQUEMA, MAX_OFERTAS,
  numeroDe, cifraEnCita, nombreEnCita, parecido, verificarCaptura, hechosDeEntidad,
  INSTRUCCIONES, COMO_DEVOLVER,
  TEXTO_TTL_SEG, CAPTURA_TTL_SEG, claveCaptura, claveTexto, CLAVE_PENDIENTES, CLAVE_COMPLETAS, claveEntidad, MAX_POR_LECTURA,
};
