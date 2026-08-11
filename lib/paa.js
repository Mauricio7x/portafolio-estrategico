/* ============================================================================
   lib/paa · Plan Anual de Adquisiciones (dataset Socrata `9sue-ezhx`)
   ----------------------------------------------------------------------------
   El PAA es la ÚNICA fuente que dice qué va a salir ANTES de que salga: objeto,
   valor y mes previsto de todo lo que una entidad piensa contratar en el año.
   Se publica el 31 de enero y da hasta seis meses de ventaja sobre una
   competencia que se entera el día del aviso y tiene 20 días para responder
   (docs/GUIA_ANALISTA_LICITACIONES.md, «Fuentes de inteligencia anticipada»).

   Hasta hoy la app solo ingería `p6dx-8zbt` —procesos YA publicados— y por eso
   avisaba cuando el proceso ya había salido. Esto abre la otra mitad.

   ── TRES ADVERTENCIAS QUE VIAJAN EN LA RESPUESTA, no solo en este comentario ──

   1. **UN PLAN NO ES UN COMPROMISO.** El PAA se modifica durante el año, se
      aplaza y se cancela. La app NO mide todavía qué porcentaje del PAA acaba
      publicándose (`tasa_de_acierto: null`), y publicar una previsión sin su
      tasa de acierto sería vender humo. Medirla exige cruzar el PAA de un año
      contra `licitaciones:historico:mes:*` del siguiente, que es otro trabajo.

   2. **EL DATASET NO SE PUDO ABRIR DESDE EL ENTORNO DE DESARROLLO.** `datos.gov.co`
      responde 403 aquí (verificado: `CONNECT tunnel failed, response 403`), así
      que ni el id `9sue-ezhx` ni UN SOLO nombre de columna están verificados
      contra la fuente real. Por eso NO se escribe un nombre de columna a pelo en
      ninguna consulta: se hace lo mismo que `lib/indice_competencia` y
      `lib/columnas_historicas` con las columnas de adjudicación —lista de
      CANDIDATAS + censo publicado de lo que realmente llegó— y la respuesta
      lleva `verificado: false` mientras nadie lo confirme. Si el censo dice
      `sin_resolver`, el arreglo es de una línea: añadir el nombre REAL a
      `CANDIDATAS` y desplegar. Ninguna consulta se rompe entre tanto.

   3. **UNA PREVISIÓN NUNCA SE MEZCLA CON UN PROCESO ABIERTO.** Cada fila sale
      marcada `tipo: "paa"` y `planeado: true`, y no lleva ni `p_ganar`, ni
      puertas, ni veredicto de RUP: no hay pliego que juzgar. Presentarla en la
      misma lista ordenada que un proceso vivo la haría parecer comparable, que
      es la peor forma posible de equivocarse aquí.

   ── DECISIONES QUE NO HAY QUE RE-APRENDER ─────────────────────────────────────

   · **El transporte se REUTILIZA** (`lib/socrata.crearCliente` con `baseUrl`):
     keyset por `:id`, backoff con jitter, `Retry-After`, y un 400 que jamás se
     reintenta. Un segundo cliente HTTP «equivalente hoy» diverge a la primera
     corrección aplicada a uno solo.
   · **Las columnas se RESUELVEN antes de usarse, con una sonda de 5 filas.**
     Construir un `$where` sobre una columna inventada da 400 —y un 400 no se
     reintenta—, así que el endpoint quedaría muerto hasta que alguien mirara
     los logs. Con la sonda, una columna que no existe simplemente no filtra, y
     el censo dice cuál falta.
   · **La ventana de 12 meses se aplica SIEMPRE en el cliente, y en el servidor
     solo si la fecha es comparable como texto.** Un `$where` de rango sobre una
     columna que guarde «Marzo» compararía cadenas y devolvería basura EN
     SILENCIO, que es peor que no filtrar. La sonda decide (`fecha_comparable_
     en_servidor`) y la respuesta lo declara.
   · **El punto es DECIMAL aquí, al revés que en `numeroColombiano`.** Aquel lee
     texto de pliegos colombianos, donde el punto separa miles; esto lee el JSON
     de una API, donde `"1500000.00"` son millón y medio de pesos. Aplicar la
     regla del pliego multiplicaría la cuantía por cien. Lo que no encaje en el
     formato máquina NO se adivina: es `null` y se cuenta.
   · **Cuantía 0 = SIN DATO**, la misma regla que `anticipo_pct = 0` y que el
     contador de oferentes. Un PAA con el valor sin diligenciar no es una obra
     gratis.
   · **Una fila con fecha ilegible NO entra en «los próximos 12 meses».** El
     endpoint promete una ventana; meter dentro algo que no se pudo situar sería
     afirmar lo que no se sabe. Se descarta Y SE CUENTA (`descartados`), que es
     lo que permite ver si el problema es grande.
   · **El barrido tiene presupuesto y lo DECLARA.** Sin filtros, el PAA nacional
     no cabe en una invocación; truncar en silencio se leería como «esto es todo
     lo que hay». `barrido.truncado` existe para que no pase.
   · **`total + Σ descartados = barrido.filas_leidas`**, con prueba: sin esa
     igualdad una fila se perdería sin que nadie lo notara.
   ========================================================================== */
"use strict";

const { crearCliente, escSoQL, ahoraColombia } = require("./socrata.js");
const { normalizarCodigo, extraerCodigos, indiceDe, emparejar } = require("./unspsc.js");

const DATASET = "9sue-ezhx";
const BASE = () => process.env.PAA_BASE_URL || `https://www.datos.gov.co/resource/${DATASET}.json`;

/* Presupuesto del barrido. El plan Hobby da 60 s a esta función y la respuesta
   no puede pasar de 4,5 MB; los dos topes se declaran en `barrido`. */
const PAGINA = parseInt(process.env.PAA_PAGE, 10) || 1000;
const MAX_FILAS = parseInt(process.env.PAA_MAX_FILAS, 10) || 6000;
const PRESUPUESTO_MS = parseInt(process.env.PAA_PRESUPUESTO_MS, 10) || 20000;
const MAX_RESULTADOS = 200;

/* ── CANDIDATAS ────────────────────────────────────────────────────────────────
   NINGUNO de estos nombres está verificado contra la fuente (ver advertencia 2).
   El orden es la PRIORIDAD: gana la primera candidata que exista de verdad en el
   dataset. Añadir el nombre real aquí es todo lo que hace falta el día que
   alguien pueda abrir `datos.gov.co`. */
const CANDIDATAS = {
  entidad: ["entidad", "nombre_entidad", "nombre_de_la_entidad", "entidad_estatal",
    "nombre_de_la_entidad_estatal", "razon_social", "nombre_organismo"],
  nit_entidad: ["nit_entidad", "nit_de_la_entidad", "nit", "nit_entidad_estatal"],
  /* Socrata transcribe los acentos a `_` («descripción» → `descripci_n`), y eso
     NO se puede reconciliar normalizando: quitar el guion bajo deja
     «descripcin», que no es «descripcion». Tratarlo como comodín sería adivinar.
     Las variantes con `_` van explícitas, que es como el resto del repositorio
     ya lee `descripci_n_del_procedimiento` de p6dx-8zbt. */
  objeto: ["descripcion", "descripci_n", "descripcion_del_objeto", "descripci_n_del_objeto",
    "objeto", "objeto_contractual", "descripcion_objeto", "nombre_del_procedimiento",
    "descripci_n_del_procedimiento", "objeto_a_contratar"],
  unspsc: ["codigo_unspsc", "codigos_unspsc", "codigo_principal_de_categoria",
    "codigo_de_categoria_principal", "unspsc", "categoria", "codigo_producto_unspsc"],
  cuantia_estimada: ["valor_total_estimado", "valor_estimado", "valor_estimado_en_la_vigencia_actual",
    "valor_total", "presupuesto_estimado", "valor"],
  fecha_estimada_publicacion: ["fecha_estimada_de_inicio_de_proceso_de_seleccion",
    "fecha_estimada_de_inicio_de", "fecha_estimada_inicio_proceso", "fecha_estimada_publicacion",
    "fecha_inicio_estimada", "fecha_estimada"],
  modalidad: ["modalidad_de_seleccion", "modalidad_de_selecci_n", "modalidad_de_contratacion",
    "modalidad", "posibles_modalidades_de_seleccion"],
  duracion_estimada: ["duracion_estimada_del_contrato", "duraci_n_estimada_del_contrato",
    "duracion_estimada", "duracion"],
  estado: ["estado_de_solicitud", "estado", "estado_del_registro"],
  departamento: ["departamento", "departamento_entidad", "departamento_de_la_entidad"],
};
/* Los campos que el encargo exige en cada fila. Sin `entidad` y `objeto` la
   respuesta no dice nada útil, y el censo lo señala como bloqueante. */
const CAMPOS_EXIGIDOS = ["entidad", "objeto", "unspsc", "cuantia_estimada",
  "fecha_estimada_publicacion", "modalidad"];
const IMPRESCINDIBLES = ["entidad", "objeto"];

/* Nombres de columna comparados sin acentos, sin ñ y sin separadores: tolera
   «Valor Total Estimado» frente a `valor_total_estimado`, que es la misma
   columna escrita de dos formas. NO reconcilia la transcripción de Socrata
   (`descripci_n` → «descripcin» ≠ «descripcion»): eso exigiría tratar el guion
   bajo como comodín, o sea adivinar, y por eso esas variantes van explícitas en
   CANDIDATAS. Esto sigue siendo igualdad exacta, no una heurística. */
const clave = (s) => String(s == null ? "" : s)
  .normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/ñ/gi, "n")
  .toLowerCase().replace(/[^a-z0-9]/g, "");

function resolverColumnas(clavesObservadas) {
  const porClave = new Map();
  for (const k of clavesObservadas) if (!porClave.has(clave(k))) porClave.set(clave(k), k);
  const columnas = {}, sinResolver = [];
  for (const [campo, lista] of Object.entries(CANDIDATAS)) {
    const hallada = lista.map((c) => porClave.get(clave(c))).find((x) => x !== undefined) || null;
    columnas[campo] = hallada;
    if (!hallada && CAMPOS_EXIGIDOS.includes(campo)) sinResolver.push(campo);
  }
  return { columnas, sin_resolver: sinResolver };
}

/* ── lectura de valores ──────────────────────────────────────────────────────── */

/* Fecha → 'YYYY-MM-DD' o null. Solo RECONOCE formatos; no adivina ninguno.
   `DD/MM/YYYY` se lee a la colombiana (día primero), que es la convención de
   todo el proyecto; queda declarado en `censo.supuestos`. */
function fechaISO(valor) {
  const s = String(valor == null ? "" : valor).trim();
  if (!s) return null;
  let y, m, d;
  let x = s.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T ]|$)/);
  if (x) { [, y, m, d] = x; } else if ((x = s.match(/^(\d{4})-(\d{2})$/))) {
    [, y, m] = x; d = "01";
  } else if ((x = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/))) {
    [, d, m, y] = x;
  } else return null;
  const mi = Number(m), di = Number(d);
  if (mi < 1 || mi > 12 || di < 1 || di > 31) return null;
  return `${y}-${m}-${d}`;
}

/* Pesos desde el JSON de una API: el punto es DECIMAL (ver cabecera). Lo que no
   sea formato máquina no se convierte a ojo — es `null` y se cuenta. Un 0 es
   SIN DATO, jamás «gratis». */
function pesos(valor) {
  if (valor == null) return null;
  const s = String(valor).trim().replace(/^\$/, "").replace(/\s/g, "");
  if (!/^-?\d+(\.\d+)?$/.test(s)) return null;
  const n = Number(s);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.round(n);
}

const texto = (valor) => {
  const s = String(valor == null ? "" : valor).trim();
  return s === "" ? null : s;
};

/* ── ventana de 12 meses ─────────────────────────────────────────────────────── */

/* [desde, hasta): del primer día del mes EN CURSO (hora Colombia) al mismo mes
   del año siguiente. Arranca en el día 1 y no en hoy a propósito: las fechas del
   PAA son de granularidad mensual en la práctica, y cortar a mitad de mes
   escondería lo previsto para este mismo mes, que es lo más accionable que hay. */
function ventanaDoceMeses(ahora) {
  const hoy = ahoraColombia(ahora);
  const y = hoy.getUTCFullYear(), m = hoy.getUTCMonth() + 1;
  const mm = String(m).padStart(2, "0");
  return { desde: `${y}-${mm}-01`, hasta: `${y + 1}-${mm}-01`, meses: 12 };
}

/* ── coincidencia UNSPSC ─────────────────────────────────────────────────────── */

/* Se reutiliza el motor jerárquico del proyecto (`lib/unspsc.emparejar`) con un
   índice de UN solo código: así `?unspsc=72141000` casa con un producto de esa
   clase y con una publicación a nivel de familia, exactamente igual que el
   juicio del RUP. Escribir aquí un `startsWith` sería una SEGUNDA definición de
   «este código y este otro son lo mismo». */
function coincideUnspsc(idxPedido, textoCodigos) {
  const { codigos } = extraerCodigos(textoCodigos || "");
  if (!codigos.length) return false;
  // `emparejar` devuelve el tier "ninguno" cuando no casa — NO `null`: comparar
  // contra `null` daría verdadero siempre y el filtro no filtraría nada.
  return emparejar(codigos, idxPedido).tier !== "ninguno";
}

/* ── consulta ────────────────────────────────────────────────────────────────── */

/* `$where` construido SOLO con columnas que la sonda confirmó que existen. */
function construirWhere({ columnas, entidad, unspsc, ventana, fechaComparable }) {
  const partes = [];
  if (fechaComparable && columnas.fecha_estimada_publicacion) {
    const c = columnas.fecha_estimada_publicacion;
    partes.push(`${c} >= '${ventana.desde}' AND ${c} < '${ventana.hasta}'`);
  }
  if (entidad && columnas.entidad) {
    partes.push(`upper(${columnas.entidad}) like '%${escSoQL(entidad.toUpperCase())}%'`);
  }
  /* El filtro de UNSPSC del servidor solo ESTRECHA (`like` sobre el texto del
     código); quien decide de verdad es la jerarquía, en el cliente.
     Se acota por la FAMILIA (4 dígitos), que es el nivel más grueso al que
     llega el matching del proyecto —el upward matching sube hasta familia y
     JAMÁS hasta segmento—. Recortar más (los 5-6 primeros dígitos del código
     pedido) dejaría fuera del barrido las publicaciones a nivel de familia, que
     son precisamente un match válido: el filtro del servidor estaría negando lo
     que el del cliente acepta. Y la familia sale de `normalizarCodigo`, no de
     un `slice(0,4)` a mano: recortar aquí sería una segunda definición de
     «familia». */
  if (unspsc && columnas.unspsc) {
    const c = normalizarCodigo(unspsc);
    if (c) partes.push(`${columnas.unspsc} like '%${escSoQL(c.familia)}%'`);
  }
  return partes.join(" AND ");
}

/* Sonda: 5 filas sin filtro. Da las CLAVES reales del dataset (el censo) y una
   muestra de valores de la columna de fecha, que es lo que decide si el rango
   se puede delegar al servidor. */
async function sondear(cliente) {
  const filas = await cliente.pedir({ "$limit": "5" }, "sonda PAA");
  if (!Array.isArray(filas)) throw new Error("respuesta no-array en la sonda del PAA");
  const claves = new Set();
  for (const f of filas) for (const k of Object.keys(f || {})) claves.add(k);
  return { filas, claves: [...claves].sort() };
}

/**
 * Consulta el PAA y devuelve `{ estado, cuerpo }` listo para el handler.
 * No toca Redis, no escribe nada y no toma ningún candado.
 */
async function consultarPaa(opciones = {}) {
  const t0 = Date.now();
  const ventana = ventanaDoceMeses(opciones.ahora);
  const entidad = texto(opciones.entidad);
  const unspscPedido = normalizarCodigo(opciones.unspsc);
  if (opciones.unspsc && !unspscPedido) {
    return {
      estado: 400,
      cuerpo: {
        ok: false,
        error: `El código UNSPSC «${opciones.unspsc}» no es legible: se esperan 2, 4, 6 u 8 dígitos `
          + "(segmento, familia, clase o producto).",
      },
    };
  }
  const cliente = crearCliente({ baseUrl: BASE(), fetchImpl: opciones.fetchImpl, log: opciones.log });

  /* 1 · sonda. Si la fuente no responde, es un 502: el fallo es de arriba, no
     del que pregunta, y decirlo «sin datos» lo haría indistinguible de un PAA
     vacío. */
  let sonda;
  try {
    sonda = await sondear(cliente);
  } catch (e) {
    return {
      estado: 502,
      cuerpo: {
        ok: false,
        error: `No se pudo consultar el Plan Anual de Adquisiciones (dataset ${DATASET}): ${e.message}`,
        dataset: DATASET, fuente: BASE(), verificado: false,
        siguiente_paso: "Compruebe que el id del dataset sigue siendo válido en datos.gov.co y que el "
          + "despliegue tiene salida a Internet. Con SOCRATA_APP_TOKEN el límite pasa de ~100 a ~1.000 "
          + "peticiones por hora.",
      },
    };
  }

  const { columnas, sin_resolver } = resolverColumnas(sonda.claves);
  const colFecha = columnas.fecha_estimada_publicacion;
  /* ¿Se puede delegar el rango al servidor? Solo si TODAS las muestras de la
     columna de fecha se leen como fecha: sobre un «Marzo» el `>=` compararía
     cadenas y devolvería basura sin avisar. Sin muestras, no se arriesga. */
  const muestrasFecha = colFecha ? sonda.filas.map((f) => f[colFecha]).filter((v) => v != null && String(v).trim() !== "") : [];
  const fechaComparable = muestrasFecha.length > 0 && muestrasFecha.every((v) => fechaISO(v) !== null);

  const censo = {
    columnas, sin_resolver,
    candidatas: CANDIDATAS,
    claves_observadas: sonda.claves,
    fecha_comparable_en_servidor: fechaComparable,
    muestra_fecha: muestrasFecha.slice(0, 3).map(String),
    supuestos: [
      "Los nombres de columna NO están verificados contra datos.gov.co: se resuelven por lista de "
      + "candidatas contra las claves reales del dataset y el censo publica cuál ganó.",
      "Una fecha «DD/MM/AAAA» se lee a la colombiana (día primero).",
      "El punto separa DECIMALES (es JSON de API, no texto de pliego): «1500000.00» son $1.500.000.",
      "Cuando la fecha es comparable en el servidor, el rango de 12 meses se delega a Socrata. La sonda "
      + "solo ve 5 filas, así que una fila suelta con la fecha en OTRO formato quedaría fuera del "
      + "barrido sin aparecer en `descartados`. Es el precio de no barrer el PAA nacional entero.",
    ],
  };
  const cabecera = {
    ok: true, vista: "paa", dataset: DATASET, fuente: BASE(), verificado: false,
    ventana, filtros: { entidad: entidad || null, unspsc: unspscPedido ? unspscPedido.codigo : null },
    censo,
    /* La advertencia va en la RESPUESTA y no solo en la pantalla: cualquier
       consumidor del endpoint tiene que recibirla, no solo el que use la web. */
    advertencia: "El PAA es un PLAN, no un compromiso: las entidades lo modifican, lo aplazan y lo "
      + "cancelan durante el año. Estos procesos AÚN NO EXISTEN en SECOP II y no se pueden comparar con "
      + "una licitación abierta.",
    tasa_de_acierto: null,
    tasa_de_acierto_nota: "Sin medir. Calcularla exige cruzar el PAA de un año contra los procesos "
      + "realmente publicados al siguiente (licitaciones:historico:mes:*), que es un trabajo aparte. "
      + "Mientras no esté medida, no hay ninguna cifra que respalde «este proceso va a salir».",
  };

  /* 2 · sin las dos columnas imprescindibles no se puede componer una fila. NO
     es un error del que pregunta: es un RESULTADO —200 con la lista vacía y el
     censo—, igual que «el pliego no traía tablas» en el módulo APU. Un 4xx haría
     creer que la petición estaba mal. */
  const faltanImprescindibles = IMPRESCINDIBLES.filter((c) => !columnas[c]);
  if (faltanImprescindibles.length) {
    return {
      estado: 200,
      cuerpo: {
        ...cabecera, total: 0, resultados: [],
        barrido: { filas_leidas: 0, paginas: 0, truncado: false, limite_filas: MAX_FILAS },
        descartados: { fuera_de_ventana: 0, fecha_ilegible: 0, sin_objeto: 0, unspsc_no_coincide: 0 },
        motivo_lista_vacia: `El dataset respondió, pero no se reconoció la columna de ${faltanImprescindibles.join(" ni la de ")}. `
          + "Añada el nombre REAL (está en `censo.claves_observadas`) a CANDIDATAS en lib/paa.js y vuelva a desplegar.",
        duracionMs: Date.now() - t0,
      },
    };
  }

  /* 3 · barrido con keyset por `:id`, con presupuesto declarado. */
  const where = construirWhere({ columnas, entidad, unspsc: unspscPedido && unspscPedido.codigo, ventana, fechaComparable });
  const idxPedido = unspscPedido ? indiceDe([unspscPedido.codigo]) : null;
  const descartados = { fuera_de_ventana: 0, fecha_ilegible: 0, sin_objeto: 0, unspsc_no_coincide: 0 };
  const resultados = [];
  let lastId = null, filasLeidas = 0, paginas = 0, truncado = false;

  try {
    for (;;) {
      if (filasLeidas >= MAX_FILAS || Date.now() - t0 > PRESUPUESTO_MS) { truncado = true; break; }
      const clausulas = [];
      if (where) clausulas.push(where);
      if (lastId) clausulas.push(`:id > '${escSoQL(lastId)}'`);
      const params = { "$select": ":id,*", "$order": ":id", "$limit": String(PAGINA) };
      if (clausulas.length) params["$where"] = clausulas.join(" AND ");
      const filas = await cliente.pedir(params, `PAA página ${paginas + 1}`);
      if (!Array.isArray(filas)) throw new Error("respuesta no-array en el barrido del PAA");
      paginas++;
      filasLeidas += filas.length;
      for (const f of filas) {
        lastId = f[":id"] || lastId;
        const objeto = texto(f[columnas.objeto]);
        if (!objeto) { descartados.sin_objeto++; continue; }
        const codigos = columnas.unspsc ? texto(f[columnas.unspsc]) : null;
        if (idxPedido && !coincideUnspsc(idxPedido, codigos)) { descartados.unspsc_no_coincide++; continue; }
        const fecha = colFecha ? fechaISO(f[colFecha]) : null;
        if (!fecha) { descartados.fecha_ilegible++; continue; }
        if (fecha < ventana.desde || fecha >= ventana.hasta) { descartados.fuera_de_ventana++; continue; }
        resultados.push({
          tipo: "paa", planeado: true,
          id: texto(f[":id"]),
          entidad: texto(f[columnas.entidad]),
          nit_entidad: columnas.nit_entidad ? texto(f[columnas.nit_entidad]) : null,
          objeto,
          unspsc: codigos,
          cuantia_estimada: columnas.cuantia_estimada ? pesos(f[columnas.cuantia_estimada]) : null,
          fecha_estimada_publicacion: fecha,
          /* El literal de la fuente viaja al lado de la fecha normalizada: si
             algún día la columna trae «Marzo» o un trimestre, se ve el dato
             crudo en vez de tener que creerse la conversión. */
          fecha_estimada_original: colFecha ? texto(f[colFecha]) : null,
          modalidad: columnas.modalidad ? texto(f[columnas.modalidad]) : null,
          duracion_estimada: columnas.duracion_estimada ? texto(f[columnas.duracion_estimada]) : null,
          estado_paa: columnas.estado ? texto(f[columnas.estado]) : null,
          departamento_entidad: columnas.departamento ? texto(f[columnas.departamento]) : null,
        });
      }
      if (filas.length < PAGINA) break; // última página
    }
  } catch (e) {
    return {
      estado: 502,
      cuerpo: {
        ...cabecera,
        ok: false,
        error: `Falló el barrido del Plan Anual de Adquisiciones: ${e.message}`,
        barrido: { filas_leidas: filasLeidas, paginas, truncado: true, limite_filas: MAX_FILAS },
      },
    };
  }

  // lo que primero va a salir, primero: un plan se lee por calendario
  resultados.sort((a, b) => (a.fecha_estimada_publicacion < b.fecha_estimada_publicacion ? -1
    : a.fecha_estimada_publicacion > b.fecha_estimada_publicacion ? 1
      : String(a.entidad || "").localeCompare(String(b.entidad || ""))));

  const total = resultados.length;
  const recortados = Math.max(0, total - MAX_RESULTADOS);
  return {
    estado: 200,
    cuerpo: {
      ...cabecera,
      total,
      resultados: resultados.slice(0, MAX_RESULTADOS),
      // el recorte de la RESPUESTA se dice aparte del recorte del BARRIDO: son
      // dos cosas distintas y solo la segunda significa «faltan datos»
      recortados_en_la_respuesta: recortados,
      max_resultados: MAX_RESULTADOS,
      barrido: { filas_leidas: filasLeidas, paginas, truncado, limite_filas: MAX_FILAS },
      descartados,
      duracionMs: Date.now() - t0,
    },
  };
}

module.exports = {
  consultarPaa, DATASET, CANDIDATAS, CAMPOS_EXIGIDOS, IMPRESCINDIBLES,
  resolverColumnas, fechaISO, pesos, ventanaDoceMeses, coincideUnspsc,
};
