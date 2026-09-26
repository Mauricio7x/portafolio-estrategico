/* ============================================================================
   lib/perfiles · FUENTE ÚNICA DE VERDAD del perfil del dueño y de sus socias
   ----------------------------------------------------------------------------
   Datos REALES de los RUP (corte 31/12/2025; certificados en firmeza al
   07/05/2026), extraídos del index.html histórico del repositorio — aquí no
   hay placeholders ni datos inventados. Todo lo que la app sabe de Helder
   —el único perfil PROPIO— y de sus dos candidatas a consorcio —Génesis y
   PRODIAC— sale de este archivo; nadie más duplica estas cifras. Quién es
   quién lo dicen `ID_DUENO` y `CANDIDATOS_CONSORCIO`, no el orden de lectura:
   una socia es un RECURSO para presentarse a más procesos, no una identidad
   desde la que mirar el mercado.

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
   · NIT: los tres se leyeron del certificado el 11-sep-2026 y constan aquí
     (9396710-3 · 901096271-1 · 900263450-4). Con ellos se puede correr la
     verificación de socio por documento. Un NIT que no conste va en null:
     JAMÁS se inventa.
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
   · Indicadores financieros con la fórmula del DOCUMENTO TIPO: se SUMAN los
     componentes del balance de los integrantes (Σ numerador ÷ Σ denominador),
     sin participación (25-sep-2026; hasta ese día se ponderaban los ÍNDICES,
     que ninguna norma trae: docs/PROPONENTE_PLURAL.md, apartado 2). Se
     calculan aquí a partir de los integrantes (no se copian).
   · La capacidad residual (K) del plural NO usa estos ponderados: es la SUMA
     de las CRP de los integrantes (Guía CCE-EICP-GI-22) — ver lib/capacidad.js.
     Por eso `integrantes` se vuelve a atar en cada carga: un consorcio subido a
     mano con sus propios indicadores SIGUE sumando las CRP de sus miembros.
   · experiencia (expSMMLV) y profesionales del plural: suma de integrantes.
   ========================================================================== */
"use strict";

const { UNSPSC_HELDER, UNSPSC_GENESIS, UNSPSC_PRODIAC, UNSPSC_PICS, UNSPSC_JUNTOS, indiceDe } = require("./unspsc.js");
const { CLAVES, leerJSONComprimido } = require("./almacen.js");
/* La escala de tamaños vive en el esquema y NO se copia aquí: la misma lista la
   valida lib/config_rup y la lee lib/rup_pdf del certificado. */
const { TAMANOS_EMPRESA: ESCALA_TAMANO } = require("./config_rup.js");

const SMMLV = 1750905; // SMMLV 2026 (decreto del Gobierno Nacional)
/* Umbral para limitar una convocatoria a Mipyme en 2026: el equivalente de
   US$125.000 a la tasa que fija el MinCIT (docs/COMPLEMENTO_ANALISTA_LICITACIONES.md
   §V-12). Es una cifra CON FECHA: cambia y hay que revisarla en enero. Vive aquí,
   junto al SMMLV, porque la leen DOS reglas: el aviso de convocatoria limitada
   (lib/socio_por_proceso) y el PISO de la capacidad de organización de la Guía
   de capacidad residual (lib/capacidad, Tabla 3: «USD 125.000 liquidados a la
   tasa de cambio determinada por el MinCIT […] para efectos del umbral del
   beneficio de las Mipyme»). Una sola cifra para las dos. */
const UMBRAL_MIPYME_COP = 511708497;

/* ══ HELDER · EL DUEÑO ══
   Certificado de la Cámara de Comercio del Sur y Oriente del Tolima, expedición
   07/05/2026, código de verificación mbrKDtnyQg, 47 páginas leídas enteras el
   11-sep-2026. El certificado trae DOS cortes: 31/12/2024 (liquidez 289,99) y
   31/12/2025 (liquidez 129,12). Aquí manda el de 2025, que es el vigente — y es
   el que ya tenía el repositorio. Ojo al leerlo: tomar el corte equivocado
   cambia la liquidez más del doble. */
const HELDER = {
  id: "helder",
  nombre: "Helder Gustavo Rodríguez Santana",
  naturaleza: "Persona natural",
  nit: "9396710-3",       // pág. 1 del RUP (C.C. 9396710). El documento consorcial
                          // del proceso UPN-VAD-CP-009-2026 escribe «9396710-1»:
                          // manda el certificado de la cámara, no el formulario.
  tamanoEmpresa: "microempresa", // pág. 1, «TAMAÑO DE EMPRESA» — dato PUBLICADO,
                          // y el que decide si un consorcio cabe en una
                          // convocatoria limitada a Mipyme
  rol: "Persona natural · Ing. Civil · Purificación (Tolima)",
  liquidez: 129.12, endeudamiento: 0.04, patrimonio: 1107252964, // pág. 45 (corte 31/12/2025; el certificado dice 1.107.252.964,18)
  coberturaIntereses: 662.70, // pág. 45 — 198.810.000 ÷ 300.000 de intereses
  contratosRup: 33,           // 33 registros de experiencia, contados en el certificado
  /* activo corriente 748.908.684,18 − pasivo corriente 5.800.000 (págs. 44-45).
     El repositorio traía 743.096.000, con un activo corriente de 748.896.000 que
     el certificado NO dice: 12.684 pesos de diferencia, corregidos el
     11-sep-2026 contra el documento. */
  capitalTrabajo: 743108684,
  utilidadOp: 198810000,  // pág. 45
  ingresoOp: null,        // el RUP no lo reporta → CO se estima (ver capacidad)
  /* LOS COMPONENTES DEL BALANCE (25-sep-2026). El Documento Tipo calcula los
     indicadores de un proponente plural SUMANDO estos componentes de los
     integrantes, no promediando los índices (ver `derivarPlural`), así que el
     índice publicado no basta: sin el balance el consorcio no se puede
     calcular. Leídos del certificado al centavo, con su página. El corte 2025
     figura «en proceso de adquirir firmeza» en el certificado del 07/05/2026 y
     EN FIRME, con las mismas cifras, en la copia del 27/05/2026 que viene dentro
     del expediente de PRODIAC. */
  balance: {
    corte: "2025-12-31", paginas: "44-45",
    firmeza: "en firme en la copia del 27/05/2026 (el certificado del 07/05/2026 lo daba en proceso de adquirir firmeza)",
    activoCorriente: 748908684.18, activoTotal: 1165295964.18,
    pasivoCorriente: 5800000, pasivoTotal: 58043000,
    patrimonio: 1107252964.18, utilidadOperacional: 198810000, gastosIntereses: 300000,
  },
  rentabilidadPatrimonio: 0.17, rentabilidadActivo: 0.17, // pág. 45, publicadas
  expSMMLV: 6768.87,      // mayor contrato inscrito, el mayor de los 33 (verificado). OJO: es un
                          // consorcio al 40 % — lo que acredita es 2.707,55 (docs/PROPONENTE_PLURAL.md, apartado 5)
  /* Valor TOTAL de los contratos inscritos en el segmento 72, cada uno por el
     porcentaje que tuvo (100 % en los 16 que celebró solo y sin porcentaje
     impreso). Es lo que pide el factor de experiencia de la capacidad residual
     (Guía CCE-EICP-GI-22, num. 9.2): 31 de sus 33 contratos, 19.330,6040
     truncado a dos decimales. */
  expSeg72SMMLV: 19330.60,
  /* Los SIETE mayores contratos del segmento 72, cada uno por su porcentaje y
     truncado (SMMLV del año de terminación, como los publica el certificado).
     Es lo que pide la regla de experiencia del proponente plural del pliego tipo
     (num. 3.5.3 D: uno aporta ≥ 50 % de la experiencia exigida, los demás ≥ 5 %,
     y quien no aporte no pasa del 10 % de participación), que se acredita con
     hasta 5 contratos —6 o 7 con condiciones Mipyme o de mujeres—. Son COTA
     SUPERIOR: el pliego pide códigos concretos, y aquí están todos los del 72.
     lib/reparto la usa solo para decir lo que es IMPOSIBLE, nunca lo seguro. */
  expSeg72MayoresSMMLV: [4820, 2707.54, 2354.7, 2307, 1174, 1129, 804],
  profesionales: 1,       // persona natural: él mismo (histórico: corregido de 11)
  /* SIN TOPE (26-sep-2026, decisión del dueño: «lo que diga la ley»). Era
     4.000, un apetito que escondía los procesos más grandes aunque la
     capacidad de contratación —el límite que SÍ fija la ley— alcanzara. */
  topeSMMLV: null,
  unspsc: new Set(UNSPSC_HELDER), // 193 clases: la sección CLASIFICACIONES del certificado, exacta
  sce: [ // contratos en ejecución (saldo × % participación compromete capacidad)
    { v: 443141528, pct: 60, plazoMeses: 12, restanMeses: 8, obra: true },
    { v: 379500000, pct: 100, plazoMeses: 8, restanMeses: 4, obra: false },
  ],
};

/* ══ GÉNESIS · SOCIA ══
   Certificado de la Cámara de Comercio de Ibagué, expedición 07/05/2026, código
   de verificación 5FvfSPt1cz, 259 páginas leídas enteras el 11-sep-2026. Un
   solo corte: 31/12/2025. Todas sus cifras financieras coincidieron EXACTAS con
   lo que ya tenía el repositorio; lo único que no coincidía era la lista de
   actividades (ver UNSPSC_GENESIS en lib/unspsc). */
const GENESIS = {
  id: "genesis",
  nombre: "Génesis Ingeniería y Construcción GIC SAS",
  naturaleza: "Persona jurídica (SAS)",
  nit: "901096271-1",            // pág. 1 del RUP
  tamanoEmpresa: "microempresa", // pág. 1, «TAMAÑO DE EMPRESA»
  rol: "Persona jurídica · SAS · Ibagué",
  liquidez: 6.98, endeudamiento: 0.13, patrimonio: 211340888,
  coberturaIntereses: 168.81, // 150.244.977 ÷ 890.000 de intereses (RUP corte 31/12/2025)
  contratosRup: 108,          // 108 registros de experiencia, contados en el certificado
  capitalTrabajo: 193090888,  // activo corriente 225.344.006 − pasivo corriente 32.253.118
  utilidadOp: 150244977,
  ingresoOp: null,
  balance: {
    corte: "2025-12-31", paginas: "11-12", firmeza: "en firme",
    activoCorriente: 225344006, activoTotal: 243594006,
    pasivoCorriente: 32253118, pasivoTotal: 32253118,
    patrimonio: 211340888, utilidadOperacional: 150244977, gastosIntereses: 890000,
  },
  rentabilidadPatrimonio: 0.71, rentabilidadActivo: 0.61, // pág. 12, publicadas
  expSMMLV: 31593.88,     // el mayor de los 108, verificado contra el certificado (al 75 %, y de un socio)
  /* Segmento 72 × porcentaje: 106 de los 108 contratos. Cuenta tal como están
     INSCRITOS el probable duplicado (N.º 5 y N.º 90) y el «0.5%» del N.º 82:
     el evaluador lee el RUP, y el dueño no pudo confirmarlos con la socia
     (25-sep-2026). 100 de los 108 son de socios: ver docs/PROPONENTE_PLURAL.md,
     apartado 4, sobre qué pasa si un socio se retiró. */
  expSeg72SMMLV: 134465.17,
  expSeg72MayoresSMMLV: [23695.41, 10220.34, 9974.47, 7829.98, 7158.6, 6031.97, 5656.18], // ver Helder; casi todos de socios
  profesionales: 3,       // socios + planta, estimado conservador (ver cabecera)
  topeSMMLV: null,        // sin tope: «lo que diga la ley» (26-sep-2026); era un apetito de 2.000
  unspsc: new Set(UNSPSC_GENESIS), // 335 clases: la sección CLASIFICACIONES, no el documento entero
  sce: [], // sin contratos en ejecución registrados → SCE = 0 (se advierte en logs)
};

/* ══ PRODIAC LTDA · SOCIA ══
   Certificado de la Cámara de Comercio de Ibagué, expedición 03/07/2026, código
   de verificación 4u4dTZyAzx, **2.423 páginas** leídas enteras el 11-sep-2026
   (el PDF del expediente trae 2.469: las 46 últimas son otra copia del RUP de
   Helder, que aquí se ignora porque su certificado propio manda). Un solo corte,
   31/12/2025, y el certificado entero EN FIRME.

   ES LA CONTRARIA DE GÉNESIS, y por eso la elección de socio importa:
     · patrimonio 8.309.706.000 — casi 40 veces el de Génesis;
     · 327 contratos acreditados y un mayor contrato de 18.264,85 salarios;
     · 581 actividades registradas (428 que Helder no tiene);
     · pero indicadores mucho más justos (liquidez 1,98 · endeudamiento 0,39) y,
       sobre todo, es GRAN EMPRESA: en una convocatoria limitada a Mipyme un
       proponente plural tiene que estar formado SOLO por Mipymes, así que con
       PRODIAC el consorcio queda fuera y con Génesis no. */
const PRODIAC = {
  id: "prodiac",
  nombre: "PRODIAC LTDA",
  naturaleza: "Persona jurídica (sociedad limitada)",
  nit: "900263450-4",             // pág. 1 del RUP
  tamanoEmpresa: "gran_empresa",  // pág. 1, «TAMAÑO DE EMPRESA»
  rol: "Persona jurídica · Ltda · Ibagué",
  liquidez: 1.98, endeudamiento: 0.39, patrimonio: 8309706000, // pág. 17 (corte 31/12/2025)
  coberturaIntereses: 9.11,   // pág. 17 — 2.129.512.000 ÷ 233.466.000 de intereses
  contratosRup: 327,          // 327 registros de experiencia, contados en el certificado
  capitalTrabajo: 4918588000, // activo corriente 9.908.649.000 − pasivo corriente 4.990.061.000
  utilidadOp: 2129512000,     // pág. 17
  ingresoOp: null,            // el RUP no lo reporta → CO se estima (ver capacidad)
  balance: {
    corte: "2025-12-31", paginas: "17-18", firmeza: "en firme",
    activoCorriente: 9908649000, activoTotal: 13705196000,
    pasivoCorriente: 4990061000, pasivoTotal: 5395490000,
    patrimonio: 8309706000, utilidadOperacional: 2129512000, gastosIntereses: 233466000,
  },
  rentabilidadPatrimonio: 0.25, rentabilidadActivo: 0.15, // pág. 18, publicadas
  expSMMLV: 18264.85,         // el mayor de los 327, verificado contra el certificado
  // segmento 72 × porcentaje: los 327 (100 % en los 190 que celebró sola sin porcentaje impreso)
  expSeg72SMMLV: 182865.60,
  expSeg72MayoresSMMLV: [18264.85, 4720.12, 4558.74, 3561.87, 3554.58, 3491.37, 3327.65], // ver Helder
  /* El RUP NO reporta la planta de profesionales de nadie. Para Helder y Génesis
     el repositorio ya traía una cifra; para PRODIAC se usa 1, que es el SUELO que
     no inventa nada (cualquier proponente inscrito tiene al menos uno) y deja el
     factor de capacidad técnica en su escalón más bajo. SUBESTIMA a propósito:
     nunca infla su capacidad. Con la planta real la cifra solo puede subir. */
  profesionales: 1,
  /* SIN TOPE. El tope es el apetito que el DUEÑO se fija, y el de una socia no
     nos consta: ponerle uno inventado recortaría la lista por una cifra que
     nadie declaró. `null` = sin techo, que es además la dirección que no
     esconde procesos. */
  topeSMMLV: null,
  unspsc: new Set(UNSPSC_PRODIAC), // 581 clases: la sección CLASIFICACIONES
  sce: [], // el certificado no publica contratos en ejecución → SCE = 0, advertido en logs
};

/* ══ PICS · SOCIA (desde el 25-sep-2026) ══
   Proyectos de Ingeniería Consultoría y Servicios SAS («PICS INGENIERIA
   S.A.S.»). Certificado de la Cámara de Comercio de Sogamoso, expedición
   23/06/2026, código de verificación F45sySh8PX, 96 páginas leídas enteras el
   25-sep-2026. Un solo corte, 31/12/2025, EN FIRME. El dueño decidió ese día
   que entra como socia posible.

   Qué aporta, dicho sin adornos: es MICROEMPRESA —como Génesis, así que un
   consorcio con ella cabe en una convocatoria limitada a Mipyme— pero pequeña
   (patrimonio 130 M, mayor contrato 1.146,99 salarios, que además es un
   subcontrato), con indicadores justos (liquidez 1,82, endeudamiento 0,39). */
const PICS = {
  id: "pics",
  nombre: "PICS Ingeniería SAS",
  naturaleza: "Persona jurídica (SAS)",
  nit: "900479928-0",            // pág. 1 del RUP
  tamanoEmpresa: "microempresa", // pág. 1, «TAMAÑO DE EMPRESA»
  rol: "Persona jurídica · SAS · Sogamoso",
  liquidez: 1.82, endeudamiento: 0.39, patrimonio: 129819065, // pág. 11 (el certificado dice 129.819.065,48)
  coberturaIntereses: 24.38,     // pág. 11 — 70.088.705,99 ÷ 2.874.749,53 de intereses
  contratosRup: 79,              // 79 registros de experiencia, contados en el certificado
  capitalTrabajo: 69427015,      // activo corriente 153.318.668,69 − pasivo corriente 83.891.653,21
  utilidadOp: 70088705,          // pág. 11 (70.088.705,99)
  ingresoOp: null,
  balance: {
    corte: "2025-12-31", paginas: "10-11", firmeza: "en firme",
    activoCorriente: 153318668.69, activoTotal: 213710718.69,
    pasivoCorriente: 83891653.21, pasivoTotal: 83891653.21,
    patrimonio: 129819065.48, utilidadOperacional: 70088705.99, gastosIntereses: 2874749.53,
  },
  rentabilidadPatrimonio: 0.53, rentabilidadActivo: 0.32, // pág. 11, publicadas
  expSMMLV: 1146.99,             // el mayor de los 79 (un subcontrato: pide la certificación del contratista principal)
  // segmento 72 × porcentaje: 77 de los 79 (100 % en los 63 que celebró sola sin porcentaje impreso)
  expSeg72SMMLV: 9598.56,
  expSeg72MayoresSMMLV: [1146.99, 587.74, 556.4, 407.34, 377.8, 361.58, 349.39], // ver Helder
  profesionales: 1,              // el RUP no reporta la planta: el SUELO que no infla (ver PRODIAC)
  topeSMMLV: null,               // sin tope: el apetito de una socia no nos consta (ver PRODIAC)
  unspsc: new Set(UNSPSC_PICS),  // 335 clases: la sección CLASIFICACIONES (págs. 3-10)
  sce: [], // el certificado no trae la sección de contratos reportados → SCE = 0, advertido en logs
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

/* Σ (valor_i × participación_i). Desde el 25-sep-2026 NO calcula ya las razones
   del plural (ver `razonPlural`): queda para los indicadores en pesos cuando el
   pliego declara la sumatoria ponderada, y para el método «índices ponderados»
   cuando un pliego lo fija así. `null` si a CUALQUIER integrante le falta el
   dato: «sin dato» no es cero, y un `|| 0` aquí convertía la ignorancia de un
   socio en un cero creíble que hundía el indicador del consorcio entero. */
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
/* De menor a mayor (ESCALA_TAMANO, del esquema): el tamaño del plural es el
   del integrante más grande. */
function tamanoQueAta(integrantes) {
  let peor = -1;
  for (const i of integrantes) {
    const t = i.perfil.tamanoEmpresa;
    if (t == null) return null;                 // sin dato en alguno: no se afirma nada
    const n = ESCALA_TAMANO.indexOf(String(t));
    if (n < 0) return null;                     // valor desconocido: inerte, jamás inventado
    if (n > peor) peor = n;
  }
  return peor < 0 ? null : ESCALA_TAMANO[peor];
}

/* Un valor explícito del archivo del dueño manda sobre el derivado. */
const oDerivado = (explicito, derivado) => (explicito != null ? explicito : derivado);
/* Los indicadores se TRUNCAN a dos decimales, no se redondean (Fase 10, plan v4
   §2.1; concepto C-626 de 2026: «sin aproximaciones»): las cámaras de comercio
   truncan (Helder: 58.043.000 ÷ 1.165.295.964 = 0,0498 → el certificado dice
   0,04) y la cifra que muestra la app tiene que ser la que va a leer el
   evaluador. Con un colchón de coma flotante para que 0,29 × 100 = 28,999…
   siga siendo 0,29. */
function truncar2(x) {
  const n = Number(x);
  if (!Number.isFinite(n)) return null;
  const signo = n < 0 ? -1 : 1;
  return signo * Math.trunc(Math.abs(n) * 100 + 1e-7) / 100;
}

/* ═════════ CÓMO SE CALCULAN LAS RAZONES DE UN PLURAL (25-sep-2026) ═════════
   Lo que dicen las fuentes, leídas el 25-sep-2026 (docs/PROPONENTE_PLURAL.md,
   apartado 2, con URL, versión y numeral):

     · Los trece Documentos Tipo vigentes de obra, que son inalterables
       (D. 1082 art. 2.2.1.2.6.1.4): «Indicador = (∑ Componente 1 del
       indicador_i) / (∑ Componente 2 del indicador_i)», SIN participación.
     · Fuera de ellos, el Manual CCE-EICP-MA-04 v03, num. 5.4, deja elegir la
       suma de componentes (opción 3) o la ponderación de componentes (opción 4):
       Σ (numerador_i × part._i) ÷ Σ (denominador_i × part._i).
     · Promediar los ÍNDICES ya calculados (Σ índice_i × part._i) no es opción en
       ninguna versión del Manual. Es lo que hacía esta función hasta hoy, y
       enseñaba a Helder + PRODIAC al 50/50 con liquidez 65,55 cuando el
       Documento Tipo da 2,13: el socio de índice alto inflaba al consorcio.
       Solo se usa si el pliego lo fija así (8 de 241 pliegos leídos).

   `metodo` por omisión es el del Documento Tipo, que es lo que rige la obra
   pública. Cuando se sepa que el pliego declara otro, quien llama lo pasa; si no
   se leyó el pliego, se calcula con el del Documento Tipo y la advertencia
   `METODO_SIN_LEER` lo dice. */
const METODOS_INDICADORES = Object.freeze({
  suma_componentes: "Pliego tipo: se suman los componentes de todos los integrantes (el activo corriente de todos entre el pasivo corriente de todos) y la participación no cuenta.",
  componentes_ponderados: "Manual de requisitos habilitantes de Colombia Compra, opción 4: cada componente se multiplica por la participación del integrante antes de sumar.",
  indices_ponderados: "Promedio de los índices por participación: solo cuando el pliego lo fija así.",
});
const METODO_POR_OMISION = "suma_componentes";
const METODO_SIN_LEER = "Los indicadores del consorcio se calcularon como manda el pliego tipo (sumando los balances de los integrantes, sin participación). Si el pliego de este proceso fija otra fórmula, manda la del pliego: verifíquelo en el capítulo de capacidad financiera.";

/* [campo del perfil, numerador del balance, denominador del balance] */
const RAZONES = Object.freeze([
  ["liquidez", "activoCorriente", "pasivoCorriente"],
  ["endeudamiento", "pasivoTotal", "activoTotal"],
  ["coberturaIntereses", "utilidadOperacional", "gastosIntereses"],
  ["rentabilidadPatrimonio", "utilidadOperacional", "patrimonio"],
  ["rentabilidadActivo", "utilidadOperacional", "activoTotal"],
]);

/* Una razón del plural. Devuelve {valor, falta_balance_de?, indeterminado?}.
   · Sin el balance de un integrante no hay cifra (`null`), y se dice de quién:
     el índice publicado solo NO basta para la fórmula del Documento Tipo, y
     promediarlo en su lugar daría una cifra equivocada y creíble.
   · Denominador cero (nadie debe intereses, pasivo corriente nulo): la razón es
     INDETERMINADA, no cero ni infinita. `null` con `indeterminado: true`; el
     Documento Tipo la da por cumplida y quien la pinte lo tiene que decir. */
function razonPlural(integrantes, campo, num, den, metodo) {
  if (metodo === "indices_ponderados") return { valor: trunc2(ponderar(integrantes, campo)) };
  let n = 0, d = 0;
  const sinBalance = [];
  for (const i of integrantes) {
    const b = i.perfil.balance;
    const vn = b ? numOrNull(b[num]) : null, vd = b ? numOrNull(b[den]) : null;
    if (vn == null || vd == null) { sinBalance.push(i.perfil.nombre || i.perfilId || "un integrante"); continue; }
    const w = metodo === "componentes_ponderados" ? i.participacion : 1;
    n += vn * w; d += vd * w;
  }
  if (sinBalance.length) return { valor: null, falta_balance_de: sinBalance };
  if (d === 0) return { valor: null, indeterminado: true };
  // una rentabilidad sobre un patrimonio sumado que no es positivo no tiene
  // sentido (dos negativos darían una rentabilidad positiva): sin cifra
  if (den === "patrimonio" && d < 0) return { valor: null, patrimonio_no_positivo: true };
  return { valor: truncar2(n / d) };
}

/* Proponente plural DERIVADO de sus integrantes. Se recalcula en cada carga
   porque los indicadores, la experiencia sumada y la unión de UNSPSC dependen de
   ellos: si se copiaran, un RUP nuevo de un integrante dejaría al consorcio
   desincronizado.

   Regla por campo (una sola, para los dos caminos):
     razones (Documento Tipo)  → Σ numerador ÷ Σ denominador, truncado a 2
                                 (liquidez, endeudamiento, cobertura, ROE, ROA)
     pesos                     → suma simple con el Documento Tipo (CT = Σ CT_i);
                                 sumatoria ponderada si el pliego pondera
                                 (capital de trabajo, patrimonio, utilidad)
     suma                      → contratos, experiencia, segmento 72, profesionales, tope
     máximo                    → mayor contrato
     unión                     → unspsc (jamás la intersección ni la suma)
     falta a alguno            → null, jamás 0 */
function derivarPlural(integrantes, base = {}) {
  const metodo = Object.prototype.hasOwnProperty.call(METODOS_INDICADORES, base.metodoIndicadores) ? base.metodoIndicadores : METODO_POR_OMISION;
  const razones = {};
  for (const [campo, num, den] of RAZONES) razones[campo] = razonPlural(integrantes, campo, num, den, metodo);
  const pesos = metodo === "suma_componentes" ? sumar : ponderar;
  const faltaBalanceDe = [...new Set(Object.values(razones).flatMap((r) => r.falta_balance_de || []))];
  const indeterminados = Object.entries(razones).filter(([, r]) => r.indeterminado).map(([c]) => c);
  return {
    id: base.id || "plural",
    nombre: base.nombre || integrantes.map((i) => i.perfil.nombre).join(" + "),
    naturaleza: base.naturaleza || "Proponente plural (consorcio o unión temporal)",
    // un consorcio no existe como figura registrada hasta que se constituye
    nit: base.nit !== undefined ? base.nit : null,
    /* El tamaño que ATA al plural es el del integrante MÁS GRANDE: en una
       convocatoria limitada a Mipyme todos los integrantes tienen que serlo, así
       que un solo socio que sea gran empresa deja fuera al consorcio entero.
       Sin dato en alguno, `null`: no se afirma nada. */
    tamanoEmpresa: base.tamanoEmpresa !== undefined ? base.tamanoEmpresa : tamanoQueAta(integrantes),
    rol: base.rol || `Consorcio · ${integrantes.map((i) => `${i.perfil.nombre} ${Math.round(i.participacion * 1000) / 10} %`).join(" · ")}`,
    integrantes,
    // cómo se calcularon las razones, dicho en claro, y qué les falta
    metodoIndicadores: metodo,
    metodoIndicadoresTexto: METODOS_INDICADORES[metodo],
    indicadoresFaltaBalanceDe: faltaBalanceDe,
    indicadoresIndeterminados: indeterminados,
    // indicadores habilitantes: fórmula del método, TRUNCADOS
    liquidez: oDerivado(base.liquidez, razones.liquidez.valor),
    endeudamiento: oDerivado(base.endeudamiento, razones.endeudamiento.valor),
    coberturaIntereses: oDerivado(base.coberturaIntereses, razones.coberturaIntereses.valor),
    rentabilidadPatrimonio: oDerivado(base.rentabilidadPatrimonio, razones.rentabilidadPatrimonio.valor),
    rentabilidadActivo: oDerivado(base.rentabilidadActivo, razones.rentabilidadActivo.valor),
    patrimonio: oDerivado(base.patrimonio, trunc0(pesos(integrantes, "patrimonio"))),
    utilidadOp: oDerivado(base.utilidadOp, trunc0(pesos(integrantes, "utilidadOp"))),
    ingresoOp: oDerivado(base.ingresoOp, null),
    capitalTrabajo: oDerivado(base.capitalTrabajo, trunc0(pesos(integrantes, "capitalTrabajo"))),
    // lo que acredita cualquiera de los integrantes: se SUMA
    contratosRup: oDerivado(base.contratosRup, sumar(integrantes, "contratosRup")),
    expSMMLV: oDerivado(base.expSMMLV, sumar(integrantes, "expSMMLV")),
    expSeg72SMMLV: oDerivado(base.expSeg72SMMLV, sumar(integrantes, "expSeg72SMMLV")),
    profesionales: oDerivado(base.profesionales, sumar(integrantes, "profesionales")),
    /* SIN TOPE salvo que alguien lo FIJE (26-sep-2026, decisión del dueño: «lo
       que la ley nos diga y como las entidades califiquen»). El tope estratégico
       no es una norma: es un apetito. Lo que la ley mide en un consorcio es la
       capacidad de contratación y los requisitos habilitantes, y eso ya se juzga
       aparte. Sumar los apetitos (lo que se hacía hasta hoy) le ponía a Helder +
       Génesis un techo de 6.000 salarios que ninguna entidad exige. */
    topeSMMLV: oDerivado(base.topeSMMLV, null),
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
  const plural = derivarJuntosSinMarca(helder, genesis, base);
  plural.topeFijado = base.topeSMMLV != null;
  return plural;
}
function derivarJuntosSinMarca(helder, genesis, base) {
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
    /* SIN TOPE FIJO (25-sep-2026, encargo del dueño). Aquí vivía un 11.000
       escrito a mano: el único campo en que este plural difería del «a la
       medida». Ahora sigue la regla de todos los plurales (`derivarPlural`: sin
       tope desde el 26-sep-2026), salvo que el archivo de carga fije uno. */
    ...(base.topeSMMLV != null ? { topeSMMLV: base.topeSMMLV } : {}),
  }, base.topeSMMLV != null);
}

const JUNTOS = derivarJuntos(HELDER, GENESIS, { unspsc: new Set(UNSPSC_JUNTOS) });

/* Los datos del repositorio, congelados como RESPALDO. Se usan mientras nadie
   haya subido un RUP, y también como red si la configuración cargada se borra. */
const PERFILES_FALLBACK = Object.freeze({ helder: HELDER, genesis: GENESIS, prodiac: PRODIAC, pics: PICS, juntos: JUNTOS });

/* Objeto VIVO. Su identidad no cambia nunca (media app lo capturó al requerir);
   lo que cambia son sus tres propiedades. */
const PERFILES = { helder: HELDER, genesis: GENESIS, prodiac: PRODIAC, pics: PICS, juntos: JUNTOS };

// Alias aceptados por la API (?perfil=…) → id canónico del perfil.
const ALIAS_PERFIL = { consorcio: "juntos" };

const IDS = ["helder", "genesis", "prodiac", "pics", "juntos"];

/* CON QUIÉN se puede ir a un proceso, y DESDE QUIÉN se navega, son dos cosas
   distintas y hasta hoy vivían mezcladas en IDS. El dueño es uno solo —Helder—
   y los demás son SOCIOS: sus cifras sirven para calcular con cuál conviene
   cada proceso, no para mirar el mercado con sus ojos. */
const ID_DUENO = "helder";
const CANDIDATOS_CONSORCIO = ["genesis", "prodiac", "pics"];

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
  PERFILES.prodiac = PRODIAC;
  PERFILES.pics = PICS;
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

/* El balance del archivo (snake_case) → el del perfil (camelCase), y vuelta. */
const BALANCE_CAMPOS = Object.freeze([
  ["activo_corriente", "activoCorriente"], ["activo_total", "activoTotal"],
  ["pasivo_corriente", "pasivoCorriente"], ["pasivo_total", "pasivoTotal"],
  ["patrimonio", "patrimonio"], ["utilidad_operacional", "utilidadOperacional"],
  ["gastos_intereses", "gastosIntereses"],
]);
function balanceDesdeConfig(b) {
  if (!b || typeof b !== "object") return null;
  const out = { corte: b.corte != null ? b.corte : null, paginas: b.paginas != null ? b.paginas : null, firmeza: b.firmeza != null ? b.firmeza : null };
  for (const [ext, int] of BALANCE_CAMPOS) out[int] = b[ext];
  return out;
}
function balanceComoConfig(b) {
  if (!b) return null;
  const out = { corte: b.corte != null ? b.corte : null, paginas: b.paginas != null ? b.paginas : null, firmeza: b.firmeza != null ? b.firmeza : null };
  for (const [ext, int] of BALANCE_CAMPOS) out[ext] = b[int];
  return out;
}
/* ¿El archivo es el MISMO certificado que el respaldo? Solo entonces se
   conservan del respaldo las cifras que el archivo no trae (el balance, el total
   del segmento 72). Si el dueño subió un RUP NUEVO sin ellas, heredar las del
   viejo daría un consorcio calculado con un balance que ya no es el suyo: mejor
   «sin dato», que el consorcio dice con su motivo. */
function mismoCertificado(c, respaldo) {
  const ind = c.indicadores || {};
  return !!respaldo && ind.liquidez === respaldo.liquidez && ind.endeudamiento === respaldo.endeudamiento
    && ind.patrimonio === respaldo.patrimonio && c.experiencia_smmlv === respaldo.expSMMLV;
}

function perfilDesdeConfig(id, c, respaldo) {
  const ind = c.indicadores || {};
  const heredable = mismoCertificado(c, respaldo);
  return {
    id,
    nombre: c.nombre,
    naturaleza: NATURALEZA[c.tipo] || (respaldo && respaldo.naturaleza) || "Proponente",
    nit: c.nit != null ? c.nit : null,
    /* Tamaño de empresa: lo publica el RUP y decide si un proponente plural
       cabe en una convocatoria limitada a Mipyme. Va en la IDA y en la VUELTA:
       si solo fuera en la ida, re-subir el archivo que la propia app sirve lo
       borraría — que es exactamente lo que ya pasó con capitalTrabajo. */
    tamanoEmpresa: c.tamano_empresa != null ? c.tamano_empresa
      : (respaldo && respaldo.tamanoEmpresa != null ? respaldo.tamanoEmpresa : null),
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
    /* Gemelos del balance (25-sep-2026, revisión adversaria): el capital de
       trabajo ES activo corriente − pasivo corriente del MISMO balance, y el
       número de contratos es del MISMO certificado. Heredarlos de un RUP viejo
       daba una cifra vieja y creíble (el consorcio la suma y la compara con el
       pliego). Solo se heredan si el archivo es el mismo certificado. */
    capitalTrabajo: c.capital_trabajo != null ? c.capital_trabajo
      : (heredable && respaldo.capitalTrabajo != null ? respaldo.capitalTrabajo : null),
    contratosRup: c.contratos_rup != null ? c.contratos_rup
      : (heredable && respaldo.contratosRup != null ? respaldo.contratosRup : null),
    balance: c.balance != null ? balanceDesdeConfig(c.balance) : (heredable && respaldo.balance ? respaldo.balance : null),
    rentabilidadPatrimonio: ind.rentabilidad_patrimonio != null ? ind.rentabilidad_patrimonio
      : (heredable && respaldo.rentabilidadPatrimonio != null ? respaldo.rentabilidadPatrimonio : null),
    rentabilidadActivo: ind.rentabilidad_activo != null ? ind.rentabilidad_activo
      : (heredable && respaldo.rentabilidadActivo != null ? respaldo.rentabilidadActivo : null),
    expSeg72SMMLV: c.experiencia_segmento72_smmlv != null ? c.experiencia_segmento72_smmlv
      : (heredable && respaldo.expSeg72SMMLV != null ? respaldo.expSeg72SMMLV : null),
    expSeg72MayoresSMMLV: Array.isArray(c.experiencia_segmento72_mayores_smmlv) ? [...c.experiencia_segmento72_mayores_smmlv].sort((a, b) => b - a)
      : (heredable && Array.isArray(respaldo.expSeg72MayoresSMMLV) ? respaldo.expSeg72MayoresSMMLV : null),
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
    tamano_empresa: p.tamanoEmpresa != null ? p.tamanoEmpresa : null,
    unspsc: [...p.unspsc].sort(),
    indicadores: {
      liquidez: p.liquidez,
      endeudamiento: p.endeudamiento,
      cobertura_intereses: p.coberturaIntereses != null ? p.coberturaIntereses : 0,
      patrimonio: p.patrimonio,
      utilidad_operacional: p.utilidadOp,
      ingreso_operacional: p.ingresoOp != null ? p.ingresoOp : null,
      ...(p.rentabilidadPatrimonio != null ? { rentabilidad_patrimonio: p.rentabilidadPatrimonio } : {}),
      ...(p.rentabilidadActivo != null ? { rentabilidad_activo: p.rentabilidadActivo } : {}),
    },
    profesionales: p.profesionales,
    experiencia_smmlv: p.expSMMLV,
    /* El tope DERIVADO de un plural no se escribe: al volver a subir el archivo
       quedaría fijo, que es el mismo defecto que se quitó con el 11.000
       (revisión adversaria del 25-sep-2026). Solo viaja si alguien lo FIJÓ. */
    tope_smmlv: p.integrantes && !p.topeFijado ? null : p.topeSMMLV,
    /* CIERRAN EL CICLO «descargar → editar → volver a subir» (ago 2026). Iban
       en la ida y NO en la vuelta, así que cualquier carga de RUP —incluso
       re-subir el archivo que la propia app acaba de servir— dejaba
       `capitalTrabajo` y `contratosRup` en undefined: el pulso perdía los
       contratos acreditados y el vigía de adendas se quedaba sin el habilitante
       de capital de trabajo. Opcionales: `null` es «sin dato», no cero. */
    capital_trabajo: p.capitalTrabajo != null ? p.capitalTrabajo : null,
    contratos_rup: p.contratosRup != null ? p.contratosRup : null,
    /* El balance y el total del segmento 72 cierran el MISMO ciclo (25-sep-2026):
       sin ellos en la vuelta, re-subir el archivo que la app sirve dejaría a los
       consorcios sin indicadores. El del plural no se escribe: se deriva. */
    ...(p.balance && !p.integrantes ? { balance: balanceComoConfig(p.balance) } : {}),
    ...(p.expSeg72SMMLV != null && !p.integrantes ? { experiencia_segmento72_smmlv: p.expSeg72SMMLV } : {}),
    ...(Array.isArray(p.expSeg72MayoresSMMLV) && !p.integrantes ? { experiencia_segmento72_mayores_smmlv: [...p.expSeg72MayoresSMMLV] } : {}),
    ...(p.sce && p.sce.length ? { sce: p.sce } : {}),
  };
}

/* Los perfiles fijos VIGENTES en el esquema de carga (para GET y para descargar). */
function perfilesComoConfig() {
  return {
    helder: perfilComoConfig(PERFILES.helder),
    genesis: perfilComoConfig(PERFILES.genesis),
    prodiac: perfilComoConfig(PERFILES.prodiac),
    pics: perfilComoConfig(PERFILES.pics),
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
  /* SIN TOPE, TAMPOCO EL QUE TRAIGA EL ARCHIVO (26-sep-2026, decisión del dueño:
     «lo que diga la ley»). El archivo guardado en producción puede traer el
     4.000 de antes (o el 2 × mayor contrato que ponía la carga del PDF), y el
     dueño no tiene terminal para quitarlo: se ignora aquí, donde entra. Lo que
     decide si un proceso cabe es la capacidad de contratación y el pliego. */
  const sinTope = (p) => (p && p.topeSMMLV != null ? { ...p, topeSMMLV: null } : p);
  const helder = sinTope(perfiles.helder ? perfilDesdeConfig("helder", perfiles.helder, HELDER) : PERFILES.helder);
  const genesis = sinTope(perfiles.genesis ? perfilDesdeConfig("genesis", perfiles.genesis, GENESIS) : PERFILES.genesis);
  const prodiac = sinTope(perfiles.prodiac ? perfilDesdeConfig("prodiac", perfiles.prodiac, PRODIAC) : PERFILES.prodiac);
  const pics = sinTope(perfiles.pics ? perfilDesdeConfig("pics", perfiles.pics, PICS) : PERFILES.pics);
  const plural = perfiles.consorcio || perfiles.juntos;
  /* DEL BLOQUE DEL PLURAL SOLO MANDA LO QUE NO SE DERIVA (25-sep-2026). El
     archivo que la app sirve trae en «consorcio» las cifras que ELLA derivó, y
     al volver a subirlo se convertían en explícitas y congelaban al plural: un
     archivo descargado antes de este día seguía enseñando la liquidez 68,05 de
     los índices ponderados con el rótulo del pliego tipo (reproducido por la
     revisión adversaria). Los indicadores, el patrimonio, el capital, los
     contratos y la experiencia del plural se DERIVAN de sus integrantes, siempre;
     del archivo quedan el nombre, el rol, la naturaleza, el tope y las
     actividades que se añaden a la unión. */
  const completa = plural ? perfilDesdeConfig("juntos", plural, null) : null;
  const base = completa ? {
    nombre: completa.nombre, rol: completa.rol, naturaleza: completa.naturaleza,
    ...(completa.topeSMMLV != null ? { topeSMMLV: completa.topeSMMLV } : {}), unspsc: completa.unspsc,
  } : {};
  const juntos = derivarJuntos(helder, genesis, base);

  PERFILES.helder = helder;
  PERFILES.genesis = genesis;
  /* PRODIAC se LEÍA del archivo y no se ASIGNABA (medido el 25-sep-2026): un
     RUP de PRODIAC subido a mano quedaba validado, sellado y sin efecto. */
  PERFILES.prodiac = prodiac;
  PERFILES.pics = pics;
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
  PERFILES, PERFILES_FALLBACK, ALIAS_PERFIL, SMMLV, UMBRAL_MIPYME_COP, IDS, ID_DUENO, CANDIDATOS_CONSORCIO,
  idCanonico, derivarJuntos, truncar2,
  // EL combinador de proponente plural: una sola definición para los dos
  // caminos (el plural fijo de aquí y el «a la medida» de lib/consorcio)
  derivarPlural, METODOS_INDICADORES, METODO_POR_OMISION, METODO_SIN_LEER,
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
