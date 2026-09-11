/* ============================================================================
   lib/perfiles · FUENTE ÚNICA DE VERDAD de los tres perfiles del negocio
   ----------------------------------------------------------------------------
   Datos REALES de los RUP (corte 31/12/2025; certificados en firmeza al
   07/05/2026), extraídos del index.html histórico del repositorio — aquí no
   hay placeholders ni datos inventados. Todo lo que la app sabe de Helder,
   Génesis y el consorcio sale de este archivo; nadie más duplica estas cifras.

   Desde ago 2026 esas cifras son el RESPALDO (`PERFILES_FALLBACK`), no la
   última palabra: el dueño puede subir su RUP como archivo JSON desde
   la pestaña Mi empresa (#/admin) de index.html (POST /api/admin/rup) y esa
   carga MANDA. El mecanismo:

     · `PERFILES` sigue siendo un objeto SÍNCRONO exportado, con la misma forma
       de siempre. Media app hace `const { PERFILES } = require("./perfiles")`
       en tiempo de carga y lee `PERFILES[id]` al evaluar: por eso la carga
       REEMPLAZA las propiedades del MISMO objeto y jamás lo sustituye. Ninguna
       función existente cambia de firma.
     · `recargarPerfiles(redis)` lee `config:perfiles:version` (UN GET barato) y
       solo baja la configuración entera cuando el sello cambió. Los endpoints
       que sirven lo llaman antes de evaluar, así que cargar un RUP tiene efecto
       INMEDIATO — sin desplegar, sin re-sincronizar, sin reiniciar.
     · Si Redis no responde, si la clave no existe o si el valor está corrupto,
       se conserva lo que ya estaba (o el respaldo). NUNCA se lanza: quedarse
       sin perfiles dejaría la app muda, y eso es peor que servir el respaldo.

   Notas de datos (limitaciones honestas, no supuestos silenciosos):
   · NIT: los archivos del repositorio NO transcriben el NIT de ninguno de los
     dos proponentes. Queda en null a propósito — completar desde el
     certificado RUP real (ahora se puede, subiéndolo); JAMÁS inventarlo.
   · Génesis Ingeniería y Construcción GIC SAS es PERSONA JURÍDICA (SAS),
     matriculada en Ibagué. (El error histórico de tratarla como persona
     natural queda corregido aquí, en la fuente.)
   · profesionales (insumo del factor CT): Helder = 1 (persona natural: él
     mismo, Ing. Civil — el histórico lo corrigió de 11 a 1). Génesis = 3
     (socios + profesionales de planta, "estimado conservador" según el
     histórico). Si la planta real de Génesis fuera ≥6, el factor CT subiría
     de 20 a 30 — CONFIRMAR con el dueño antes de cambiarlo (o cargar el RUP).
   · ingresoOp: el RUP no reporta el ingreso operacional → null. Cuando es
     null, lib/capacidad.js ESTIMA CO = utilidadOp × 16.7 (margen típico de
     obra civil ≈ 6 %) y lo marca como estimación en logs y en la UI.
   · sce: contratos en ejecución que comprometen capacidad residual. Génesis
     no registra ninguno en el repositorio → lista vacía (lib/capacidad.js
     asume SCE = 0 y lo advierte en logs).

   Consorcio (perfil "juntos", alias "consorcio" en la API):
   · Indicadores financieros PONDERADOS por % de participación — exigencia de
     la Guía CCE / práctica del D.1082/2015 para proponentes plurales. El
     repositorio no fija participación → se asume 50/50 y se DOCUMENTA. Los
     ponderados se calculan aquí a partir de los integrantes (no se copian).
   · La capacidad residual (K) del plural NO usa estos ponderados: es la SUMA
     de las CRP de los integrantes (Guía CCE-EICP-GI-22) — ver lib/capacidad.js.
     Por eso `integrantes` se vuelve a atar en cada carga: un consorcio subido a
     mano con sus propios indicadores SIGUE sumando las CRP de sus miembros.
   · experiencia (expSMMLV) y profesionales del plural: suma de integrantes.
   ========================================================================== */
"use strict";

const { UNSPSC_HELDER, UNSPSC_GENESIS, UNSPSC_JUNTOS, indiceDe } = require("./unspsc.js");
const { CLAVES, leerJSONComprimido } = require("./almacen.js");

const SMMLV = 1750905; // SMMLV 2026 (decreto del Gobierno Nacional)

const HELDER = {
  id: "helder",
  nombre: "Helder Gustavo Rodríguez Santana",
  naturaleza: "Persona natural",
  nit: null, // no consta en el repositorio — completar del certificado RUP
  rol: "Persona natural · Ing. Civil · Purificación (Tolima)",
  liquidez: 129.12, endeudamiento: 0.04, patrimonio: 1107252964,
  coberturaIntereses: 662.70, // 198.810.000 ÷ 300.000 de intereses (RUP corte 31/12/2025)
  contratosRup: 33,           // contratos acreditados en el RUP (corte 31/12/2025)
  capitalTrabajo: 743096000,  // activo corriente 748.896.000 − pasivo corriente 5.800.000 (balance del RUP)
  utilidadOp: 198810000,
  ingresoOp: null,        // el RUP no lo reporta → CO se estima (ver capacidad)
  expSMMLV: 6768.87,      // mayor contrato acreditado (Consorcio Infra. Boyacá)
  profesionales: 1,       // persona natural: él mismo (histórico: corregido de 11)
  topeSMMLV: 4000,        // apetito estratégico, no límite del RUP
  unspsc: new Set(UNSPSC_HELDER),
  sce: [ // contratos en ejecución (saldo × % participación compromete capacidad)
    { v: 443141528, pct: 60, plazoMeses: 12, restanMeses: 8, obra: true },
    { v: 379500000, pct: 100, plazoMeses: 8, restanMeses: 4, obra: false },
  ],
};

const GENESIS = {
  id: "genesis",
  nombre: "Génesis Ingeniería y Construcción GIC SAS",
  naturaleza: "Persona jurídica (SAS)",
  nit: null, // no consta en el repositorio — completar del certificado RUP
  rol: "Persona jurídica · SAS · Ibagué",
  liquidez: 6.98, endeudamiento: 0.13, patrimonio: 211340888,
  coberturaIntereses: 168.81, // 150.244.977 ÷ 890.000 de intereses (RUP corte 31/12/2025)
  contratosRup: 108,          // contratos acreditados en el RUP (corte 31/12/2025)
  capitalTrabajo: 193090888,  // activo corriente 225.344.006 − pasivo corriente 32.253.118 (balance del RUP)
  utilidadOp: 150244977,
  ingresoOp: null,
  expSMMLV: 31593.88,
  profesionales: 3,       // socios + planta, estimado conservador (ver cabecera)
  topeSMMLV: 2000,
  unspsc: new Set(UNSPSC_GENESIS),
  sce: [], // sin contratos en ejecución registrados → SCE = 0 (se advierte en logs)
};

/* ═════════ EL ÚNICO combinador de proponente plural ═════════
   Vivía DOS veces —aquí (`derivarJuntos`, 50/50 fijo) y en lib/consorcio
   (`derivarConsorcio`, a la medida)— y las dos copias YA DIVERGÍAN para el
   MISMO consorcio. Medido el 11-sep-2026 con Helder + Génesis al 50/50:

     campo                 aquí (derivarJuntos)   allí (derivarConsorcio)
     utilidadOp            174.527.489 (round)    174.527.488 (trunc)
     capitalTrabajo        936.186.888 (suma)     undefined   ← habilitante
     mayorContratoSMMLV    undefined              31.593,88
     topeSMMLV             11.000 (fijo)          6.000 (suma)

   En llano: el mismo consorcio daba cifras distintas según por dónde se
   llegara; por el camino «a la medida» perdía EN SILENCIO el capital de
   trabajo que vigila lib/adendas, y con dos topes distintos mostraba dos
   listas de licitaciones distintas. Una sola implementación, y lo que de
   verdad difiere entre un plural y otro viaja como `base`.

   `integrantes`: [{perfil, perfilId?, participacion}] con la participación en
   FRACCIÓN (0-1), no en porcentaje. */

const numOrNull = (v) => (v == null || v === "" ? null : (Number.isFinite(Number(v)) ? Number(v) : null));

/* Σ (valor_i × participación_i) — indicadores habilitantes de un plural.
   `null` si a CUALQUIER integrante le falta el dato: «sin dato» no es cero, y
   un `|| 0` aquí convertía la ignorancia de un socio en un cero creíble que
   hundía el indicador del consorcio entero. */
function ponderar(integrantes, campo) {
  let acc = 0;
  for (const i of integrantes) {
    const v = numOrNull(i.perfil[campo]);
    if (v == null) return null;
    acc += v * i.participacion;
  }
  return acc;
}
/* Σ valor_i — lo que acredita cualquiera de los integrantes (Ley 80 art. 7). */
function sumar(integrantes, campo) {
  let acc = 0;
  for (const i of integrantes) {
    const v = numOrNull(i.perfil[campo]);
    if (v == null) return null;
    acc += v;
  }
  return acc;
}
/* El mayor contrato del plural es el MÁXIMO, jamás la suma: dos contratos
   distintos de dos integrantes no se acumulan en uno solo. */
function maximo(integrantes, campo) {
  const vs = integrantes.map((i) => numOrNull(i.perfil[campo])).filter((v) => v != null);
  return vs.length ? Math.max(...vs) : null;
}
/* Un valor explícito del archivo del dueño manda sobre el derivado. */
const oDerivado = (explicito, derivado) => (explicito != null ? explicito : derivado);
/* Los indicadores ponderados se TRUNCAN a dos decimales, no se redondean (Fase 10,
   plan v4 §2.1): las cámaras de comercio truncan (Helder: 58.043.000 ÷
   1.165.295.964 = 0,0498 → el certificado dice 0,04) y la cifra que muestra la
   app tiene que ser la que va a leer el evaluador. Con un colchón de coma
   flotante para que 0,29 × 100 = 28,999… siga siendo 0,29. */
function truncar2(x) {
  const n = Number(x);
  if (!Number.isFinite(n)) return null;
  const signo = n < 0 ? -1 : 1;
  return signo * Math.trunc(Math.abs(n) * 100 + 1e-7) / 100;
}

/* Proponente plural DERIVADO de sus integrantes. Se recalcula en cada carga
   porque los ponderados, la experiencia sumada y la unión de UNSPSC dependen de
   ellos: si se copiaran, un RUP nuevo de un integrante dejaría al consorcio
   desincronizado.

   Regla por campo (una sola, para los dos caminos):
     ponderado + truncar2 → liquidez, endeudamiento, cobertura   (lo que lee el evaluador)
     ponderado + trunc    → patrimonio, utilidad operacional     (truncar nunca infla un mínimo)
     suma                 → capital de trabajo, contratos, experiencia, profesionales, tope
     máximo               → mayor contrato
     unión                → unspsc (jamás la intersección ni la suma)
     falta a alguno       → null, jamás 0 */
function derivarPlural(integrantes, base = {}) {
  return {
    id: base.id || "plural",
    nombre: base.nombre || integrantes.map((i) => i.perfil.nombre).join(" + "),
    naturaleza: base.naturaleza || "Proponente plural (consorcio o unión temporal)",
    // un consorcio no existe como figura registrada hasta que se constituye
    nit: base.nit !== undefined ? base.nit : null,
    rol: base.rol || `Consorcio · ${integrantes.map((i) => `${i.perfil.nombre} ${Math.round(i.participacion * 1000) / 10} %`).join(" · ")}`,
    integrantes,
    // indicadores habilitantes: ponderados por participación y TRUNCADOS
    liquidez: oDerivado(base.liquidez, trunc2(ponderar(integrantes, "liquidez"))),
    endeudamiento: oDerivado(base.endeudamiento, trunc2(ponderar(integrantes, "endeudamiento"))),
    coberturaIntereses: oDerivado(base.coberturaIntereses, trunc2(ponderar(integrantes, "coberturaIntereses"))),
    patrimonio: oDerivado(base.patrimonio, trunc0(ponderar(integrantes, "patrimonio"))),
    utilidadOp: oDerivado(base.utilidadOp, trunc0(ponderar(integrantes, "utilidadOp"))),
    ingresoOp: oDerivado(base.ingresoOp, null),
    // lo que acredita cualquiera de los integrantes: se SUMA
    contratosRup: oDerivado(base.contratosRup, sumar(integrantes, "contratosRup")),
    capitalTrabajo: oDerivado(base.capitalTrabajo, sumar(integrantes, "capitalTrabajo")),
    expSMMLV: oDerivado(base.expSMMLV, sumar(integrantes, "expSMMLV")),
    profesionales: oDerivado(base.profesionales, sumar(integrantes, "profesionales")),
    topeSMMLV: oDerivado(base.topeSMMLV, sumar(integrantes, "topeSMMLV")),
    mayorContratoSMMLV: oDerivado(base.mayorContratoSMMLV, maximo(integrantes, "expSMMLV")),
    /* Unión CALCULADA de los RUP (jamás la intersección — un proponente plural
       acredita con la experiencia de cualquiera de sus integrantes). Si el
       archivo del dueño trae una lista propia para el plural, se SUMA en vez de
       sustituir: la unión es un hecho derivado y dejar que un archivo la
       reduzca desincronizaría al consorcio de sus miembros. */
    unspsc: new Set([...integrantes.flatMap((i) => [...(i.perfil.unspsc || [])]), ...(base.unspsc || [])]),
    sce: [], // la K del plural suma las CRP de los integrantes (cada una ya
             // descuenta su propio SCE) — no duplicar saldos aquí
    plural: true,
  };
}
/* Truncar CONSERVANDO el «sin dato». La ausencia se descarta ANTES de
   convertir: `Number(null) === 0`, así que `truncar2(null)` devuelve 0 y un
   indicador que nadie conoce se convertiría en un 0 creíble — que además
   hundiría el ponderado del consorcio entero. Por eso estas dos envolturas
   existen y por eso no se llama a `truncar2` directamente sobre un ponderado.
   En pesos se trunca y no se redondea: un redondeo hacia arriba puede enseñar
   como alcanzado un mínimo del pliego que no se alcanza, y una cifra que
   decide no se infla ni un peso. */
function trunc0(x) { return x == null ? null : Math.trunc(x); }
function trunc2(x) { return x == null ? null : truncar2(x); }

function derivarJuntos(helder, genesis, base = {}) {
  const integrantes = [
    { perfil: helder, perfilId: helder.id, participacion: 0.5 },
    { perfil: genesis, perfilId: genesis.id, participacion: 0.5 },
  ];
  return derivarPlural(integrantes, {
    ...base,
    id: "juntos",
    nombre: base.nombre || "Helder + Génesis · Consorcio / Unión Temporal",
    naturaleza: base.naturaleza || "Proponente plural (figura asociativa)",
    rol: base.rol || "Figura asociativa · participación asumida 50/50",
    // apetito del plural fijado por el dueño; no es la suma de los dos apetitos
    topeSMMLV: base.topeSMMLV != null ? base.topeSMMLV : 11000,
  });
}

const JUNTOS = derivarJuntos(HELDER, GENESIS, { unspsc: new Set(UNSPSC_JUNTOS) });

/* Los datos del repositorio, congelados como RESPALDO. Se usan mientras nadie
   haya subido un RUP, y también como red si la configuración cargada se borra. */
const PERFILES_FALLBACK = Object.freeze({ helder: HELDER, genesis: GENESIS, juntos: JUNTOS });

/* Objeto VIVO. Su identidad no cambia nunca (media app lo capturó al requerir);
   lo que cambia son sus tres propiedades. */
const PERFILES = { helder: HELDER, genesis: GENESIS, juntos: JUNTOS };

// Alias aceptados por la API (?perfil=…) → id canónico del perfil.
const ALIAS_PERFIL = { consorcio: "juntos" };

const IDS = ["helder", "genesis", "juntos"];

function idCanonico(nombre) {
  const n = String(nombre || "").toLowerCase();
  return Object.prototype.hasOwnProperty.call(ALIAS_PERFIL, n) ? ALIAS_PERFIL[n] : n;
}

/* ══════════════════ Estado de la configuración cargada ══════════════════ */
/* Memoria de la instancia serverless caliente. `version` es el sello que
   publica /api/admin/rup: mientras no cambie, no hace falta bajar nada. */
let _estado = { fuente: "respaldo", version: null, cargado: null, perfiles_cargados: [], error: null };

function fuentePerfiles() {
  return { ..._estado, perfiles_cargados: [..._estado.perfiles_cargados] };
}

/* Vuelve a los datos del repositorio. Se usa cuando la configuración se borra
   de Redis y en las pruebas, para que una carga no contamine lo siguiente. */
function restablecerPerfiles() {
  PERFILES.helder = HELDER;
  PERFILES.genesis = GENESIS;
  PERFILES.juntos = JUNTOS;
  _estado = { fuente: "respaldo", version: null, cargado: null, perfiles_cargados: [], error: null };
}

/* Fuerza que la próxima llamada a recargarPerfiles() vuelva a leer Redis
   aunque el sello parezca el mismo. La llama /api/admin/rup tras guardar. */
function invalidarCachePerfiles() { _estado.version = null; }

/* ---------- config (esquema de carga) → perfil interno ---------- */
const NATURALEZA = {
  persona_natural: "Persona natural",
  persona_juridica: "Persona jurídica",
  consorcio: "Proponente plural (consorcio)",
  union_temporal: "Proponente plural (unión temporal)",
};

function perfilDesdeConfig(id, c, respaldo) {
  const ind = c.indicadores || {};
  return {
    id,
    nombre: c.nombre,
    naturaleza: NATURALEZA[c.tipo] || (respaldo && respaldo.naturaleza) || "Proponente",
    nit: c.nit != null ? c.nit : null,
    rol: c.rol || (respaldo && respaldo.rol) || NATURALEZA[c.tipo] || "",
    liquidez: ind.liquidez,
    endeudamiento: ind.endeudamiento,
    coberturaIntereses: ind.cobertura_intereses != null ? ind.cobertura_intereses : null,
    patrimonio: ind.patrimonio,
    utilidadOp: ind.utilidad_operacional,
    ingresoOp: ind.ingreso_operacional != null ? ind.ingreso_operacional : null,
    expSMMLV: c.experiencia_smmlv,
    profesionales: c.profesionales,
    topeSMMLV: c.tope_smmlv,
    // los dos campos del ciclo cerrado (ver perfilComoConfig): si el archivo no
    // los trae, se conserva lo del respaldo del repositorio antes que perderlos
    capitalTrabajo: c.capital_trabajo != null ? c.capital_trabajo
      : (respaldo && respaldo.capitalTrabajo != null ? respaldo.capitalTrabajo : null),
    contratosRup: c.contratos_rup != null ? c.contratos_rup
      : (respaldo && respaldo.contratosRup != null ? respaldo.contratosRup : null),
    unspsc: new Set(c.unspsc || []),
    // el esquema de carga no exige SCE (el RUP no lo trae); si el dueño lo
    // incluye se respeta, y si no, se asume 0 con la advertencia de capacidad
    sce: Array.isArray(c.sce) ? c.sce : [],
  };
}

/* Perfil interno → esquema de CARGA. Es lo que devuelve GET /api/admin/rup
   cuando aún no se ha subido nada: así el botón «Descargar RUP actual» entrega
   un archivo que se puede editar y volver a subir sin traducir nada a mano. */
const TIPO_POR_NATURALEZA = (p) => {
  if (p.integrantes) return "consorcio";
  return /natural/i.test(p.naturaleza || "") ? "persona_natural" : "persona_juridica";
};

function perfilComoConfig(p) {
  return {
    nombre: p.nombre,
    tipo: TIPO_POR_NATURALEZA(p),
    nit: p.nit != null ? p.nit : null,
    unspsc: [...p.unspsc].sort(),
    indicadores: {
      liquidez: p.liquidez,
      endeudamiento: p.endeudamiento,
      cobertura_intereses: p.coberturaIntereses != null ? p.coberturaIntereses : 0,
      patrimonio: p.patrimonio,
      utilidad_operacional: p.utilidadOp,
      ingreso_operacional: p.ingresoOp != null ? p.ingresoOp : null,
    },
    profesionales: p.profesionales,
    experiencia_smmlv: p.expSMMLV,
    tope_smmlv: p.topeSMMLV,
    /* CIERRAN EL CICLO «descargar → editar → volver a subir» (ago 2026). Iban
       en la ida y NO en la vuelta, así que cualquier carga de RUP —incluso
       re-subir el archivo que la propia app acaba de servir— dejaba
       `capitalTrabajo` y `contratosRup` en undefined: el pulso perdía los
       contratos acreditados y el vigía de adendas se quedaba sin el habilitante
       de capital de trabajo. Opcionales: `null` es «sin dato», no cero. */
    capital_trabajo: p.capitalTrabajo != null ? p.capitalTrabajo : null,
    contratos_rup: p.contratosRup != null ? p.contratosRup : null,
    ...(p.sce && p.sce.length ? { sce: p.sce } : {}),
  };
}

/* Los tres perfiles VIGENTES en el esquema de carga (para GET y para descargar). */
function perfilesComoConfig() {
  return {
    helder: perfilComoConfig(PERFILES.helder),
    genesis: perfilComoConfig(PERFILES.genesis),
    consorcio: perfilComoConfig(PERFILES.juntos),
  };
}

/* Aplica una configuración YA VALIDADA (lib/config_rup.validarConfig).
   Parcial a propósito: quien no venga en el archivo conserva lo que tenía —
   subir solo el RUP de Génesis no puede dejar a Helder sin datos. El consorcio
   se REDERIVA salvo que venga explícito, y aun entonces se le vuelven a atar
   los integrantes (la K del plural es la suma de sus CRP). */
function aplicarConfig(config, { version = null, cargado = null } = {}) {
  const perfiles = (config && config.perfiles) || {};
  const helder = perfiles.helder ? perfilDesdeConfig("helder", perfiles.helder, HELDER) : PERFILES.helder;
  const genesis = perfiles.genesis ? perfilDesdeConfig("genesis", perfiles.genesis, GENESIS) : PERFILES.genesis;
  const plural = perfiles.consorcio || perfiles.juntos;
  const base = plural ? perfilDesdeConfig("juntos", plural, JUNTOS) : {};
  const juntos = derivarJuntos(helder, genesis, plural ? base : {});

  PERFILES.helder = helder;
  PERFILES.genesis = genesis;
  PERFILES.juntos = juntos;
  _estado = {
    fuente: "redis",
    version: version || (config && config._meta && config._meta.version) || null,
    cargado: cargado || (config && config._meta && config._meta.cargado) || null,
    perfiles_cargados: Object.keys(perfiles),
    error: null,
  };
  return PERFILES;
}

/* ══════════════════ Lectura desde Redis ══════════════════ */
/* Un GET del sello por llamada (barato y sin sorpresas) y la configuración
   completa solo cuando cambió. No hay TTL a propósito: un TTL convertiría el
   «efecto inmediato» prometido en «efecto dentro de N minutos», que es
   exactamente lo que el dueño no puede verificar desde el navegador. */
async function recargarPerfiles(redis, { forzar = false } = {}) {
  if (!redis) return fuentePerfiles();
  let version = null;
  try {
    version = await redis.get(CLAVES.configPerfilesVersion);
  } catch (e) {
    _estado.error = `no se pudo leer el sello de configuración: ${e.message}`;
    return fuentePerfiles(); // Redis caído: se sigue sirviendo lo que ya había
  }
  if (version == null) {
    // la configuración se borró: volver al respaldo del repositorio
    if (_estado.fuente === "redis") restablecerPerfiles();
    _estado.error = null;
    return fuentePerfiles();
  }
  if (!forzar && version === _estado.version && _estado.fuente === "redis") {
    _estado.error = null;
    return fuentePerfiles();
  }
  let config = null;
  try {
    config = await leerJSONComprimido(redis, CLAVES.configPerfiles);
  } catch (e) {
    _estado.error = `no se pudo leer la configuración: ${e.message}`;
    return fuentePerfiles();
  }
  if (!config || !config.perfiles) {
    // sello sin contenido (o valor corrupto): NO se pisa lo vigente en silencio
    _estado.error = "el sello de configuración existe pero la configuración no se pudo leer";
    return fuentePerfiles();
  }
  aplicarConfig(config, { version: String(version) });
  return fuentePerfiles();
}

/* Cliente opcional: los accesores pueden llamarse sin uno (pruebas, scripts).
   Sin credenciales no se intenta nada — el respaldo basta. */
function clienteOpcional() {
  try {
    const { crearRedis, hayCredenciales } = require("./redis.js");
    return hayCredenciales() ? crearRedis({}) : null;
  } catch { return null; }
}

/* ---------- accesores asíncronos (los que usa la app cargada) ---------- */
/* getPerfil(nombre[, redis]) → el perfil VIGENTE (Redis si hay carga, respaldo
   si no) o null si el nombre no existe. Nunca lanza por culpa de Redis. */
async function getPerfil(nombre, redis) {
  await recargarPerfiles(redis || clienteOpcional());
  const id = idCanonico(nombre);
  return Object.prototype.hasOwnProperty.call(PERFILES, id) ? PERFILES[id] : null;
}

/* getUnspsc(nombre[, redis]) → {clases, familias, segmentos, total} en Sets.
   Prefiere las whitelists precomputadas que dejó la carga
   (`config:unspsc:{perfil}:completo`) y, si no están, las deriva del perfil
   vigente con el mismo motor que usa el matching (lib/unspsc.indiceDe). */
async function getUnspsc(nombre, redis) {
  const perfil = await getPerfil(nombre, redis);
  if (!perfil) return null;
  const cliente = redis || clienteOpcional();
  if (cliente && _estado.fuente === "redis") {
    try {
      const crudo = await cliente.get(CLAVES.configUnspsc(perfil.id, "completo"));
      if (crudo) {
        const j = typeof crudo === "string" ? JSON.parse(crudo) : crudo;
        if (j && Array.isArray(j.clases)) {
          return {
            clases: new Set(j.clases), familias: new Set(j.familias || []),
            segmentos: new Set(j.segmentos || []), total: j.total || perfil.unspsc.size,
            fuente: "redis",
          };
        }
      }
    } catch { /* derivar del perfil es equivalente: no es un error que valga un 500 */ }
  }
  const idx = indiceDe(perfil.unspsc);
  return { clases: idx.clases, familias: idx.familias, segmentos: idx.segmentos, total: idx.total, fuente: "perfil" };
}

module.exports = {
  PERFILES, PERFILES_FALLBACK, ALIAS_PERFIL, SMMLV, IDS,
  idCanonico, derivarJuntos, truncar2,
  // EL combinador de proponente plural: una sola definición para los dos
  // caminos (el plural fijo de aquí y el «a la medida» de lib/consorcio)
  derivarPlural,
  // carga de RUP por archivo
  recargarPerfiles, aplicarConfig, invalidarCachePerfiles, restablecerPerfiles,
  fuentePerfiles, perfilComoConfig, perfilesComoConfig,
  // config (esquema de carga) → perfil interno; lo usa lib/perfil_dinamico
  // para construir los perfiles del onboarding con la MISMA traducción que
  // usan los tres fijos — una segunda traducción divergiría a la primera
  // corrección que se aplicara a una sola
  perfilDesdeConfig,
  getPerfil, getUnspsc,
};
