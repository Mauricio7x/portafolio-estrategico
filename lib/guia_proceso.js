/* lib/guia_proceso.js · LA GUÍA «DON HÉCTOR» DE UN PROCESO GUARDADO (sep 2026)
   ─────────────────────────────────────────────────────────────────────────────
   Encargo del dueño: «cuando guardamos un proceso, automáticamente la plataforma
   le diga al usuario todo lo que necesita para presentarse: contexto general de
   qué es la obra, dónde está, si existe anticipo, tips o consejos que una
   persona novata desconoce, qué necesita para presentarse, qué tiene que tener
   en cuenta». Es el manual del analista (docs/GUIA_ANALISTA_LICITACIONES.md y
   su complemento) aplicado a UN proceso concreto y a UN perfil concreto, en el
   lenguaje de la filosofía del producto: el hecho, no el modelo.

   Capa PURA: recibe la fila (viva del corpus, o la foto guardada si el proceso
   ya no está), el id del perfil y un contexto opcional (competencia de la
   entidad, cuánto suelen bajar, «ahora» inyectado) y devuelve la guía. Ni red
   ni Redis: el handler de seguimiento la llama por cada guardado.

   Reglas que no hay que re-aprender:
   · NO REIMPLEMENTA NINGÚN JUICIO: el encaje del registro es `evaluarRup`, la
     capacidad y la caja son `evaluarPuertas` (lib/puertas), la zona es
     `evaluarZona`, la manifestación es `manifestacionDeFila`, el anticipo es
     `anticipoPct` de lib/negocio y el plazo `plazoMesesDe`. Una guía que
     calculara por su cuenta acabaría contradiciendo a la tarjeta que el usuario
     acaba de guardar, y entonces no se podría creer a ninguna de las dos.
   · LO QUE LA APP NO PUEDE VERIFICAR VIAJA COMO `pendiente` O `sin_dato`, jamás
     como «cumple». La garantía de seriedad, la firma digital, los antecedentes,
     la visita de obra y los mínimos financieros del pliego los fija el pliego,
     que el dataset no trae. Se dice qué es, dónde se consigue y cuándo hay que
     tenerlo — no se afirma que ya está.
   · `anticipo_pct = 0` sigue siendo SIN DATO (regla de lib/negocio): la guía
     dice «el proceso no publica si hay anticipo» y manda al pliego; solo afirma
     un anticipo cuando el texto lo trae. Y cuando lo trae, explica la fiducia.
   · Un proceso que ya no está en el corpus (solo foto) recibe una guía
     `completa:false`: las reglas que exigen el objeto y los códigos (registro,
     capacidad, caja) quedan en `sin_dato` en vez de fingir un veredicto sobre
     una fila que no existe.
   · Registro formal (usted) y sin jerga del glosario: «lo que le exigen para
     poder participar», «registro de proponente», «cuánto puede facturar»; nunca
     «habilitante», «RUP ✓», siglas de capacidad ni la sigla del salario mínimo.
     Hay prueba que barre la guía entera contra la lista de jerga.
   · Los `require` de rup/puertas/negocio/filtros_lista van DIFERIDOS dentro de
     la función: `filtros` participa en ciclos que resuelve con esa misma
     técnica y este módulo no puede atarse a ese nudo en tiempo de carga.
   · LOS DOCUMENTOS DEL PROCESO MANDAN SOBRE EL DATASET (3-sep-2026). `ctx.documentos`
     es lo que el navegador ya leyó de SECOP II (lib/documentos_proceso, op=documentos):
     un anticipo que el pliego niega gana al que el objeto insinúa; los indicadores
     que el pliego fija se comparan con el perfil con la regla de lib/diff; el
     personal, la visita, las garantías y las causales pasan de «pendiente» a
     «revisar» CON su documento y su página. Lo que ningún documento dice sigue
     `pendiente` o `sin_dato`: leer un documento no autoriza a inventar el resto.
     El bloque `documentos` dice qué se leyó, qué falta y qué no se puede leer. */
"use strict";

const { hoyColombia, fechaLegible, sumarDias, esHabil, sumarHabiles } = require("./habiles.js");
const { evaluarZona } = require("./accesibilidad.js");
const { manifestacionDeFila, porAbrir, yaRecibeOfertas: recibeOfertasM, enSorteo: enSorteoM, faseEnDuda: faseEnDudaM, PLAZO_MANIFESTACION_HABILES } = require("./manifestacion.js");
const { plazoMesesDe } = require("./capacidad.js");
const { numCO } = require("./lenguaje_pantalla.js"); // coma decimal: «liquidez ≥ 1,2», no «1.2»

const VERSION = 5;                      // 5: la acción de cada casilla en rojo (6-sep-2026) · 4: las citas literales del pliego (4-sep-2026, noche) · 3: «lo que exige este pliego» · 2: los documentos del proceso
/* ── LO QUE EXIGE ESTE PLIEGO (4-sep-2026) ──
   Las cifras que cambian de un pliego a otro (salvo en los pliegos tipo, que las
   fijan): experiencia general y específica, los indicadores del registro, y si
   hay anticipo. Es la FICHA de arriba de la guía: SIEMPRE las ocho casillas, en
   este orden, cada una con lo que el pliego exige (con documento y página), la
   cifra de la empresa, y un estado. Una casilla sin cifra dice POR QUÉ no la
   hay («por leer» mientras los documentos se leen; «el documento no lo fija»
   cuando se leyó y no está): la ausencia se declara, jamás se rellena con 0 ni
   con la referencia de los pliegos tipo. Los hechos salen de lib/documentos_proceso
   (que a su vez llama a lib/diff): aquí no se lee ni una línea del pliego. */
const ESTADOS_EXIGENCIA = Object.freeze(["cumple", "no_cumple", "revisar", "por_leer", "sin_dato", "dato"]);
const ESTADO_EXIGENCIA_LEGIBLE = Object.freeze({ cumple: "Cumple", no_cumple: "No cumple", revisar: "Confírmelo", por_leer: "Por leer", sin_dato: "Sin cifra en lo leído", dato: "" });
const EXIGENCIAS = Object.freeze([
  /* la experiencia NUNCA sale «cumple»: la aplicación solo compara el mayor contrato acreditado con la cifra; el tipo de obra y las condiciones las fija el pliego */
  { clave: "experiencia_general", titulo: "Experiencia general", hechos: ["requisito_experiencia_general", "requisito_experiencia_smmlv"], campo: "expSMMLV", suyo_rotulo: "Su mayor contrato", nunca_cumple: true,
    sin_cifra: "El pliego suele fijarla en una tabla (tipo de obra, número de contratos, porcentaje del presupuesto): léala en el apartado de experiencia." },
  { clave: "experiencia_especifica", titulo: "Experiencia específica", hechos: ["requisito_experiencia_especifica"], campo: "expSMMLV", suyo_rotulo: "Su mayor contrato", nunca_cumple: true,
    sin_cifra: "El pliego suele fijarla en una tabla (códigos, tipo de obra, número de contratos): léala en el apartado de experiencia." },
  { clave: "liquidez", titulo: "Liquidez mínima", hechos: ["requisito_liquidez"], campo: "liquidez", suyo_rotulo: "La suya", sin_cifra: "El documento leído no la fija en una línea con cifra: puede estar en una tabla." },
  { clave: "endeudamiento", titulo: "Endeudamiento máximo", hechos: ["requisito_endeudamiento"], campo: "endeudamiento", suyo_rotulo: "El suyo", sin_cifra: "El documento leído no lo fija en una línea con cifra: puede estar en una tabla." },
  { clave: "cobertura", titulo: "Cobertura de intereses", hechos: ["requisito_cobertura"], campo: "coberturaIntereses", suyo_rotulo: "La suya", sin_cifra: "El documento leído no la fija en una línea con cifra: puede estar en una tabla." },
  /* las dos rentabilidades de la Matriz 2 (27-sep-2026): capacidad organizacional, que el pliego tipo exige */
  { clave: "rentabilidad_patrimonio", titulo: "Rentabilidad del patrimonio", hechos: ["requisito_rentabilidad_patrimonio"], campo: "rentabilidadPatrimonio", suyo_rotulo: "La suya", sin_cifra: "El documento leído no la fija en una línea con cifra: puede estar en la matriz de indicadores." },
  { clave: "rentabilidad_activo", titulo: "Rentabilidad del activo", hechos: ["requisito_rentabilidad_activo"], campo: "rentabilidadActivo", suyo_rotulo: "La suya", sin_cifra: "El documento leído no la fija en una línea con cifra: puede estar en la matriz de indicadores." },
  { clave: "capital_trabajo", titulo: "Capital de trabajo", hechos: ["requisito_capital_trabajo"], campo: "capitalTrabajo", suyo_rotulo: "El suyo", sin_cifra: "El documento leído no lo fija en una línea con cifra: puede estar en una tabla." },
  { clave: "patrimonio", titulo: "Patrimonio", hechos: ["requisito_patrimonio"], campo: "patrimonio", suyo_rotulo: "El suyo", sin_cifra: "El documento leído no lo fija en una línea con cifra: puede estar en una tabla." },
  { clave: "anticipo", titulo: "Anticipo o pago anticipado", hechos: ["anticipo"], campo: null, suyo_rotulo: null, sin_cifra: "Ningún documento leído lo menciona: búsquelo en la forma de pago del pliego." },
]);
/* LA CONTRIBUCIÓN DE OBRA PÚBLICA SALE DE lib/ganancia, NO DE UNA COPIA
   (13-sep-2026). Aquí vivía un `= 5` con su propia condición (`esObra`), que
   era la TERCERA copia de la misma tarifa: `lib/ganancia` la aplica al precio y
   `lib/baja_maxima` a la baja, las dos desde `CONTRIBUCION_PCT` +
   `aplicaContribucion`. Y las dos condiciones YA divergían: `esObra` exoneraba
   a suministro y servicios, mientras la fuente única solo exonera interventoría
   y consultoría («un tipo que no está en la lista SÍ la causa: ante la duda, no
   prometer»). El mismo contrato salía con contribución en el precio y sin ella
   en la guía. El nombre exportado se conserva —hay consumidores— pero el VALOR
   y la CONDICIÓN son las de la fuente única. Ley 418/1997 art. 120 (permanente:
   Ley 1738/2014 art. 8). */
const { CONTRIBUCION_PCT: CONTRIBUCION_OBRA_PCT, aplicaContribucion } = require("./ganancia.js");
const GARANTIA_SERIEDAD_PCT = 10;       // documentos tipo: 10 % del presupuesto oficial, vigencia 3 meses desde el cierre
const FRACCION_FINANCIACION = 0.20;     // la misma de lib/puertas (P3): 20 % del valor a ejecutar antes del primer cobro
const REFERENCIA_FINANCIERA = Object.freeze({ liquidez_min: 1.2, endeudamiento_max: 0.65, cobertura_min: 2 }); // referencia de los documentos tipo (complemento del manual)
const TRASLADO_HABILES = Object.freeze({ licitacion: 5, seleccion_abreviada: 3, concurso: 3, minima: 1 });
const ESTADOS_REQUISITO = Object.freeze(["cumple", "revisar", "no_cumple", "pendiente", "sin_dato"]);
/* Los requisitos que un consorcio puede cubrir (Ley 80 art. 7: los integrantes
   suman experiencia y capacidad; los indicadores suman sus balances, pliego tipo). El aviso de
   interés vencido y lo que hay que conseguir (pólizas, firma, antecedentes) no
   los cubre ningún socio: no llevan acción. */
// los indicadores de capacidad financiera que certifica el registro (D. 1082 de 2015, art. 2.2.1.1.1.5.3)
const INDICADORES_DEL_REGISTRO = Object.freeze(["liquidez", "endeudamiento", "cobertura"]);
const NOMBRE_INDICADOR = Object.freeze({ liquidez: "la liquidez", endeudamiento: "el endeudamiento", cobertura: "la cobertura de intereses" });
const REQUISITOS_CON_SOCIO = Object.freeze(["registro", "experiencia", "capacidad", "financieros"]);
const OFFSET_COLOMBIA_MS = 5 * 3600 * 1000;

const num = (v) => { if (v === null || v === undefined || v === "") return null; const n = Number(v); return Number.isFinite(n) ? n : null; };
/* LA ÚNICA FORMA DE PINTAR PESOS EN LA GUÍA, EXACTA (23-sep-2026). Todas las
   cifras que redacta este módulo son de UN proceso o de UN contrato —el
   presupuesto, el contrato acreditado más grande, la póliza, la contribución,
   la plata antes del primer cobro—, y la pantalla las pinta tal cual junto a la
   cabecera exacta del expediente. Aquí vivía un formateador corto que ponía
   «$2 millones» junto a «$ 1.598.000» (la queja literal del dueño) y «$11,9 mil
   millones es menor que $11,9 mil millones» en la frontera. Se retiró sin
   excepciones: las frases con «cerca de» (póliza, contribución, financiación)
   ya declaran la estimación con esas palabras, y su cifra es la MISMA que
   publica `dinero` en la tabla de la misma guía: redondearla otra vez pintaba
   un mismo hecho a dos escalas («cerca de $160 millones» junto a $159.800.000). */
const cop = (n) => (n == null ? null : `$${Math.round(n).toLocaleString("es-CO")}`);
const norm = (s) => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const plural = (n, uno, varios) => (n === 1 ? uno : varios);

/* ── la modalidad, en llano ──────────────────────────────────────────────────
   Cómo se adjudica cada modalidad y qué le cambia al oferente. Se casa por
   RAÍZ normalizada (los literales de SECOP II varían). */
/* CADA MODALIDAD DICE SI LA LEY PIDE EL REGISTRO (27-sep-2026, N06): no lo
   decide esta tabla, lo LLAMA de lib/requisitos_ley (una sola regla con su
   fuente); null en régimen especial o sin modalidad. */
/* CÓMO SE GANA CON EL PRECIO, POR MODALIDAD (27-sep-2026, N13' de
   docs/INVESTIGACION_LICITANTE.md). UNA sola regla, y la llaman la guía de Mis
   procesos (explicación y consejo de precio) y la pestaña Precios
   (lib/apu/rentabilidad: la probabilidad por precio, el ajuste competitivo y el
   optimizador). Antes Precios decía «se sortea en la audiencia» de una mínima
   cuantía mientras esta guía decía, del MISMO proceso, «gana el menor precio».
   `se_gana`:
     · "menor_precio"   mínima cuantía y subasta: gana la oferta más barata que
                        cumpla; no hay sorteo del método. Precios NO modula la
                        probabilidad con la curva del sorteo ni sugiere precio.
     · "metodo_al_azar" licitación y selección abreviada (menor cuantía): con el
                        pliego tipo de obra, el método para puntuar el precio se
                        escoge al azar y nadie lo conoce al ofertar.
     · "no_puntua"      concurso de méritos: el precio no da puntos.
     · null             régimen especial o modalidad desconocida: lo dice el pliego.
   LA TRM, SIN INVENTAR EL DETALLE. Lo leído en el repositorio sostiene «los
   centavos de la TRM» para la licitación de obra con pliego tipo
   (docs/APU_INFORME_COMPLETO.md §3.3, verificado vía Colombia Compra Eficiente y
   la guía del DNP); el DÍA de esa TRM varía entre pliegos (§2 del mismo informe),
   así que se dice «la fecha que fija el pliego». Para la menor cuantía no hay en
   el repositorio texto leído del pliego tipo sobre la fecha ni los dígitos: se
   dice «la regla y la fecha que fija el pliego» y se manda a confirmarlas. La
   vieja «primer decimal / TRM del día / en la audiencia» se retiró. Sin tabla de
   métodos: la aplicación no reconoce qué versión del pliego tipo trae cada
   proceso, y una tabla de otra versión sería falsa. */
const PRECIO_POR_CLAVE = (() => {
  const { FUENTE } = require("./requisitos_ley.js");
  const confirmar = "Qué métodos entran y qué fecha cuenta, léalo en el capítulo de la oferta económica del pliego.";
  const regla = (se_gana, frase, fuente = null) => Object.freeze({ se_gana, frase, fuente });
  return Object.freeze({
    minima: regla("menor_precio", "En mínima cuantía gana la oferta de menor precio entre las que cumplen los requisitos: no hay sorteo del método para puntuar el precio.", FUENTE.minima),
    subasta: regla("menor_precio", "En subasta inversa gana el menor precio al cierre de la puja: no hay sorteo del método para puntuar el precio."),
    licitacion: regla("metodo_al_azar", `En licitación de obra con pliego tipo, el método con el que puntúan el precio se escoge al azar con los centavos de la tasa del dólar (TRM) de la fecha que fija el pliego: nadie lo conoce al ofertar. ${confirmar}`),
    menor_cuantia: regla("metodo_al_azar", `En menor cuantía de obra con pliego tipo, el método con el que puntúan el precio también se escoge al azar, con la regla y la fecha que fija el pliego: nadie lo conoce al ofertar. ${confirmar}`),
    seleccion_abreviada: regla("metodo_al_azar", `En selección abreviada de obra con pliego tipo, el método con el que puntúan el precio se escoge al azar, con la regla y la fecha que fija el pliego: nadie lo conoce al ofertar. ${confirmar}`),
    concurso: regla("no_puntua", "En concurso de méritos el precio no da puntos: se compite por experiencia y equipo, y el precio se revisa después contra el presupuesto oficial."),
    regimen_especial: regla(null, "La entidad contrata con su propio manual: el pliego dice cómo puntúan el precio."),
    otra: regla(null, "No consta cómo puntúan el precio en este proceso: léalo en el pliego."),
    desconocida: regla(null, "El proceso no publica cómo lo adjudican: el pliego dice cómo puntúan el precio."),
  });
})();
function precioDeClave(clave) { return PRECIO_POR_CLAVE[clave] || PRECIO_POR_CLAVE.otra; }
/* `precio_decide` (el booleano de siempre) sale de la MISMA regla: true donde gana
   el menor precio, false donde puntúa de otro modo, null donde no consta. */
const precioDecide = (p) => (p.se_gana === "menor_precio" ? true : p.se_gana == null ? null : false);

/* Por qué el consorcio queda «por confirmar» en los indicadores (N21; revisión adversaria del
   28-sep-2026). Dos causas distintas, y cada una se dice como es: el pliego declara su fórmula
   y lo que no llega es el REPARTO que supuso la aplicación (otro sí llega), o el pliego no
   declara la fórmula y con alguna de las que usan los pliegos no llega —o no se puede saber—.
   «No llega» solo se dice si alguna fórmula dio «no» de verdad. */
function fraseConsorcioPorConfirmar(hechos) {
  const titulos = (lista) => lista.map((h) => h.titulo.toLowerCase()).join(", ");
  const porReparto = hechos.filter((h) => h.plural && Array.isArray(h.plural.repartos_que_llegan) && h.plural.repartos_que_llegan.length);
  const porFormula = hechos.filter((h) => !porReparto.includes(h));
  const partes = [];
  if (porReparto.length) partes.push(`Con la fórmula que trae el pliego, el resultado del consorcio depende de la parte que ponga cada integrante (${titulos(porReparto)}): con el reparto que supone la aplicación no llega y con otro sí. Pruebe el reparto en «¿Y con un socio?» antes de decidir.`);
  if (porFormula.length) {
    const algunNo = porFormula.some((h) => ((h.plural && h.plural.por_metodo) || []).some((x) => x.estado === "no"));
    partes.push(`El resultado del consorcio depende de cómo calcula el pliego sus cifras (${titulos(porFormula)}): ${algunNo ? "con alguna de las fórmulas que usan los pliegos no llega" : "con alguna de las fórmulas que usan los pliegos no se puede confirmar"}. Busque la fórmula en el capítulo financiero del pliego antes de decidir.`);
  }
  return partes.join(" ");
}

function modalidadEnLlano(modalidad) {
  const reg = require("./requisitos_ley.js").requisitosQueAplican({ modalidad_de_contratacion: modalidad }).registro;
  const r = modalidadEnLlanoSinRegistro(modalidad);
  const precio = precioDeClave(r.clave);
  return { ...r, precio, precio_decide: precioDecide(precio), pide_registro: reg.pide, fuente_registro: reg.fuente };
}
/* La regla de «cómo se gana con el precio» de una modalidad publicada, con su clave:
   la llama lib/apu/rentabilidad (require diferido) para que Precios diga lo mismo
   que Mis procesos del mismo proceso. */
function comoSeGanaElPrecio(modalidad) {
  const m = modalidadEnLlano(modalidad);
  return { clave: m.clave, nombre: m.nombre, ...m.precio };
}
function modalidadEnLlanoSinRegistro(modalidad) {
  const m = norm(modalidad);
  if (!m) return { clave: "desconocida", nombre: null, explicacion: "El proceso no publica cómo lo adjudican: mírelo en el pliego.", traslado_habiles: null, precio_decide: null };
  if (m.includes("minima cuantia")) {
    return { clave: "minima", nombre: "Mínima cuantía", traslado_habiles: TRASLADO_HABILES.minima, precio_decide: true,
      explicacion: "Proceso pequeño: gana la oferta de MENOR precio entre las que cumplen los requisitos. Aquí el precio sí decide, pero una oferta muy por debajo del presupuesto le exige justificar sus costos. La ley no exige registro de proponente: la invitación dice qué experiencia pide." };
  }
  if (m.includes("menor cuantia")) {
    /* LA VARIANTE SIN MANIFESTACIÓN DE INTERÉS (27-sep-2026, N03). SECOP II publica
       «Seleccion Abreviada Menor Cuantia Sin Manifestacion Interes» (25 procesos de
       obra desde el 1-jun) y aquí se le decía «Sin ese aviso no puede presentarse»,
       mientras lib/manifestacion no le pide el aviso. Quién exige el aviso lo decide
       `exigeManifestacion` —la regla que ya existe se llama, no se copia— y la clave
       se conserva: sigue siendo una menor cuantía para el traslado y los consejos. */
    if (!require("./manifestacion.js").exigeManifestacion({ modalidad_de_contratacion: modalidad })) {
      return { clave: "menor_cuantia", nombre: "Selección abreviada de menor cuantía, sin manifestación de interés", traslado_habiles: TRASLADO_HABILES.seleccion_abreviada, precio_decide: false, exige_manifestacion: false,
        explicacion: "SECOP II la publica sin la etapa de manifestación de interés: no hay que avisar antes que le interesa ni hay sorteo de interesados; la oferta se presenta dentro del plazo del cronograma. Confirme en el cronograma del proceso que no haya aviso previo." };
    }
    return { clave: "menor_cuantia", nombre: "Selección abreviada de menor cuantía", traslado_habiles: TRASLADO_HABILES.seleccion_abreviada, precio_decide: false, exige_manifestacion: true,
      explicacion: `Antes de presentar oferta hay que AVISAR que le interesa (manifestación de interés) en el plazo que fije el pliego: la ley permite como máximo ${PLAZO_MANIFESTACION_HABILES} días hábiles desde la apertura, y suele ser menos. Si avisan más de 10, la entidad puede sortear quiénes siguen. Sin ese aviso no puede presentarse.` };
  }
  /* «Enajenación de bienes con subasta» trae la palabra «subasta» y es una VENTA del Estado:
     ahí gana el MAYOR precio, no el menor. Cae antes, como en la lista blanca (lib/filtros) */
  if (m.includes("enajenacion")) {
    return { clave: "otra", nombre: String(modalidad).trim(), traslado_habiles: null, precio_decide: null,
      explicacion: "Es una venta de bienes de la entidad, no la contratación de una obra: quien compra ofrece, y la regla del precio la fija el aviso de la venta." };
  }
  if (m.includes("subasta")) {
    return { clave: "subasta", nombre: "Subasta inversa", traslado_habiles: TRASLADO_HABILES.seleccion_abreviada, precio_decide: true,
      explicacion: "Los que cumplen los requisitos pujan hacia abajo en la plataforma: gana el menor precio al cierre de la subasta. Prepare su precio piso ANTES de entrar." };
  }
  if (m.includes("seleccion abreviada")) {
    return { clave: "seleccion_abreviada", nombre: "Selección abreviada", traslado_habiles: TRASLADO_HABILES.seleccion_abreviada, precio_decide: false,
      explicacion: "Proceso de trámite más corto que la licitación, con requisitos de participación y factores de puntaje. Los plazos son cortos: el cronograma manda." };
  }
  if (m.includes("concurso")) {
    return { clave: "concurso", nombre: "Concurso de méritos", traslado_habiles: TRASLADO_HABILES.concurso, precio_decide: false,
      explicacion: "Es para consultoría o interventoría: se compite por experiencia y equipo de trabajo, NO por precio (el precio se revisa después, contra el presupuesto oficial)." };
  }
  if (m.includes("licitacion")) {
    return { clave: "licitacion", nombre: "Licitación pública", traslado_habiles: TRASLADO_HABILES.licitacion, precio_decide: false,
      explicacion: `El proceso grande: requisitos para participar y puntaje por calidad, precio y apoyo a la industria nacional. ${PRECIO_POR_CLAVE.licitacion.frase} Tirar el precio al piso no garantiza nada.` };
  }
  if (m.includes("regimen especial")) {
    return { clave: "regimen_especial", nombre: "Régimen especial con ofertas", traslado_habiles: null, precio_decide: null,
      explicacion: "La entidad tiene sus propias reglas de contratación (empresa de servicios públicos, universidad, entre otras): lea su manual de contratación, no el estatuto general." };
  }
  return { clave: "otra", nombre: String(modalidad).trim(), traslado_habiles: null, precio_decide: null, explicacion: "Modalidad poco frecuente: lea el pliego para saber cómo puntúan y qué exigen." };
}

/* ── el tamaño de la obra, en palabras ─────────────────────────────────── */
function tamanoDe(presupuesto) {
  if (presupuesto == null || presupuesto <= 0) return null;
  if (presupuesto < 150e6) return "obra pequeña";
  if (presupuesto < 1000e6) return "obra mediana";
  if (presupuesto < 5000e6) return "obra grande";
  return "obra muy grande";
}

/* ── la foto guardada, con los nombres de columna del corpus ───────────── */
function filaDesdeFoto(foto) {
  const f = foto || {};
  return {
    id_del_proceso: f.id || null, nombre_del_procedimiento: f.nombre || null, entidad: f.entidad || null, nit_entidad: f.nit_entidad || null,
    departamento_entidad: f.departamento || null, modalidad_de_contratacion: f.modalidad || null, precio_base: f.presupuesto_cop ?? null,
    fecha_de_publicacion_del: f.fecha_publicacion || null, fecha_cierre: f.fecha_cierre || null, fecha_de_apertura_de_respuesta: f.fecha_apertura || null,
    urlproceso: f.url || null,
    /* lo último publicado de la fase y la apertura publicada de la manifestación viajan en la foto
       (22-sep-2026, la misma regla que `enriquecer` en lib/seguimiento): sin fila viva, la guía sigue
       diciendo lo que SECOP II dijo, con su fecha, y cuenta el plazo desde la apertura publicada */
    fase: f.fase || null, estado_del_procedimiento: f.estado_secop || null, ":updated_at": f.secop_visto || null,
    fecha_de_publicacion: f.manifestacion_publicada || null,
  };
}

function anticipoDe(l) {
  const declarado = num(l.anticipo_pct);
  if (declarado != null && declarado > 0) return declarado;
  try {
    const { anticipoPct } = require("./negocio.js");
    return num(anticipoPct(l, `${l.nombre_del_procedimiento || ""} ${l.descripci_n_del_procedimiento || ""}`)) || 0;
  } catch { return declarado || 0; }
}

function cierreDe(l) {
  const c = String(l.fecha_cierre || "").slice(0, 19);
  if (c) return c;
  try { return String(require("./negocio.js").fechaCierre(l) || "").slice(0, 19) || null; } catch { return null; }
}

/* «Mes(es)» / «Dia(s)» del dataset → «meses» / «días» según la cantidad */
function unidadLegible(unidad, n) {
  const u = String(unidad || "meses").toLowerCase().replace("(es)", n === 1 ? "" : "es").replace("(s)", n === 1 ? "" : "s").trim();
  return u.replace(/^dias?$/, n === 1 ? "día" : "días").replace(/^anos?$/, n === 1 ? "año" : "años");
}

function smmlv() { try { return require("./perfiles.js").SMMLV; } catch { return 1750905; } }

/* ═══════════════════════════════ LA GUÍA ═══════════════════════════════════ */
/* `fila`: la fila VIVA del corpus, o null; `foto`: la foto guardada (siempre).
   `ctx`: {conocimiento, competencia, baja, ahoraMs, incluirTextoDebil}. */
function guiaDe({ fila = null, foto = null, perfil, ctx = {} } = {}) {
  const completa = !!fila;
  const l = fila || filaDesdeFoto(foto);
  const ahoraMs = ctx.ahoraMs || Date.now();
  const hoy = hoyColombia(ahoraMs);
  const objeto = String(l.nombre_del_procedimiento || "").trim() || null;
  const descripcion = String(l.descripci_n_del_procedimiento || "").trim() || null;
  const presupuesto = num(l.cuantia_cop) || num(l.precio_base) || null;
  let anticipo = anticipoDe(l);
  const cierre = cierreDe(l);
  const modalidad = modalidadEnLlano(l.modalidad_de_contratacion);
  /* la base es del perfil (Bogotá/Ibagué solo para los del dueño; null para un
     RUP subido o un consorcio a la medida → distancia declarada sin calcular).
     Require diferido: perfil_resolver arrastra perfiles y consorcio. */
  const zona = evaluarZona(l, require("./perfil_resolver.js").baseDelPerfil(perfil));
  /* la fecha límite REAL, si alguien ya leyó el pliego (peldaño 1 de lib/manifestacion):
     un dato publicado gana a la ventana calculada, y un techo legal no es un plazo */
  const manif = manifestacionDeFila(l, hoy, { fechaCronograma: ctx.fechaManifestacionCronograma || null });
  /* LA ETAPA DEL GUARDADO (22-sep-2026): a quien ya avisó que le interesa no se
     le pide avisar, y el sorteo se juzga por lo que él marcó. Los predicados
     viven en lib/seguimiento (una sola lista de etapas); require diferido
     porque ese módulo participa en el nudo de filtros. */
  const etapa = String(ctx.etapa || "").trim().toLowerCase() || null;
  const Seg = (() => { try { return require("./seguimiento.js"); } catch { return null; } })();
  /* tres hechos que la etapa SÍ sostiene (una sola lista, la de lib/seguimiento):
     «manifestado» y «no salí en el sorteo» declaran el aviso; con oferta
     presentada (presentado · ganado · perdido) hubo aviso Y habilitación —SECOP II
     no recibe la oferta sin ellos—; «preparando» no declara nada: se REVISA. */
  const declaroAviso = !!(etapa && Seg && (Seg.yaAviso(etapa) || etapa === "no_sorteado"));
  const conOferta = !!(etapa && Seg && Seg.conOferta(etapa));
  const yaAvisoEtapa = declaroAviso || conOferta;
  const preparando = etapa === "preparando";
  const plazoMeses = l.duracion && num(l.duracion) > 0 ? plazoMesesDe(l) : null;
  let formaPrecio = null;
  try { formaPrecio = require("./negocio.js").tipoPrecio(`${objeto || ""} ${descripcion || ""}`); } catch { formaPrecio = null; }

  /* el juicio del perfil: SOLO con la fila viva (sin objeto ni códigos no hay
     nada que juzgar) — y solo si el perfil existe en PERFILES */
  let rup = null, puertas = null, perfilObj = null, tipoTrabajo = null;
  if (perfil) {
    try {
      const { PERFILES, evaluarRup } = require("./rup.js");
      const { evaluarPuertas } = require("./puertas.js");
      /* el perfil (indicadores, experiencia) se lee SIEMPRE que exista: la foto
         de un proceso que ya no está en el corpus sigue pudiendo compararse con
         los indicadores del registro; lo que exige la fila viva es el juicio */
      if (Object.prototype.hasOwnProperty.call(PERFILES, perfil)) perfilObj = PERFILES[perfil];
      if (completa && perfilObj) {
        rup = evaluarRup(l, perfil, ctx.conocimiento || {}, { incluirTextoDebil: !!ctx.incluirTextoDebil });
        puertas = evaluarPuertas(l, perfil, { rup, competencia: ctx.competencia || null, conocimiento: ctx.conocimiento || {} });
        try { tipoTrabajo = require("./filtros_lista.js").tipoTrabajoDe(l, rup); } catch { tipoTrabajo = null; }
      }
    } catch { rup = null; puertas = null; }
  }

  const TIPO_LEGIBLE = { obra: "obra civil", consultoria: "consultoría o diseño", interventoria: "interventoría", suministro: "compra o suministro", servicios: "servicio" };
  const dias = cierre ? Math.ceil((Date.parse(cierre) - (ahoraMs - OFFSET_COLOMBIA_MS)) / 86400000) : null;
  const cerrado = dias != null ? dias < 0 : null;
  const esObra = !tipoTrabajo || tipoTrabajo === "obra";

  /* ── los documentos del proceso, ya leídos (lib/documentos_proceso) ────── */
  const Docs = require("./documentos_proceso.js");
  const lectura = Docs.resumenLectura(ctx.documentos || null, ahoraMs);
  /* el plazo y el anticipo del objeto entran para la fórmula del capital de trabajo del pliego (lib/capital_trabajo) */
  const dicen = Docs.loQueDicen(ctx.documentos || null, { perfilObj, presupuestoCOP: presupuesto, tipoContrato: l.tipo_de_contrato || null, plazoMeses, anticipoPctObjeto: anticipo });
  const hechoDe = (clave) => dicen.hechos.find((h) => h.clave === clave) || null;
  const citaDe = (h) => (h ? `${h.documento}${h.pagina != null ? `, pág. ${h.pagina}` : ""}` : null);
  const hAnt = hechoDe("anticipo");
  /* un documento que NIEGA el anticipo gana a la regex sobre el objeto: dato publicado sobre calculado */
  if (hAnt && hAnt.anticipo === "no") anticipo = 0;

  /* LA PLATA DE ESTE PROCESO, CALCULADA UNA SOLA VEZ (23-sep-2026). La frase
     del requisito o del consejo («serían cerca de $159.800 asegurados») y la
     tabla «La plata que nadie suma» dicen la MISMA cifra exacta: cada una salía
     de su propia cuenta, y dos cuentas «equivalentes hoy» divergen a la primera
     corrección. Va después de fijar el anticipo (un documento que lo niega lo
     pone en 0). Sin presupuesto publicado, `null`: nunca un $0. */
  const plata = {
    garantia_seriedad: presupuesto ? Math.round(presupuesto * GARANTIA_SERIEDAD_PCT / 100) : null,
    contribucion_obra: presupuesto && aplicaContribucion(tipoTrabajo) ? Math.round(presupuesto * CONTRIBUCION_OBRA_PCT / 100) : null,
    financiacion_antes_del_primer_pago: presupuesto ? Math.round(Math.max(0, presupuesto * (1 - anticipo / 100)) * FRACCION_FINANCIACION) : null,
  };

  /* ── 1 · LA OBRA EN UNA MIRADA ─────────────────────────────────────────── */
  const obra = {
    que_es: objeto,
    descripcion: descripcion ? descripcion.slice(0, 600) : null,
    tipo_trabajo: tipoTrabajo, tipo_trabajo_legible: tipoTrabajo ? TIPO_LEGIBLE[tipoTrabajo] || tipoTrabajo : null,
    contrato_declarado: String(l.tipo_de_contrato || "").trim() || null,
    donde: { entidad: l.entidad || null, departamento: l.departamento_entidad || null, ciudad: String(l.ciudad_entidad || "").trim() || null,
      zona: { nivel: zona.nivel, etiqueta: zona.etiqueta, km: zona.km, desde: zona.base || null, dificil_acceso: !!zona.dificil_acceso, verificar_orden_publico: !!zona.verificar_orden_publico, mensaje: zona.mensaje } },
    cuanto: { presupuesto_cop: presupuesto, legible: cop(presupuesto), tamano: tamanoDe(presupuesto) },
    plazo: { meses: plazoMeses != null ? Math.round(plazoMeses * 10) / 10 : null, legible: plazoMeses == null ? null : `${l.duracion} ${unidadLegible(l.unidad_de_duracion, num(l.duracion))}`, cruza_diciembre: null },
    pago: {
      anticipo_pct: anticipo > 0 ? anticipo : null,
      anticipo_legible: hAnt
        ? (hAnt.anticipo === "no" ? "El pliego dice que no hay anticipo"
          : hAnt.contradice ? "Los documentos no coinciden sobre el anticipo: confírmelo en el pliego definitivo"
          : hAnt.anticipo === "mencion" ? (anticipo > 0 ? `Anticipo del ${anticipo} % según el objeto; el pliego lo trata en un apartado: confírmelo ahí` : "El pliego tiene un apartado sobre el anticipo: léalo, la aplicación no leyó la cláusula")
            : anticipo > 0 ? `Anticipo del ${anticipo} % (el pliego lo contempla)` : "Hay anticipo: confirme el porcentaje en el pliego")
        : anticipo > 0 ? `Anticipo del ${anticipo} %` : "El proceso no publica si hay anticipo",
      fuente_anticipo: hAnt ? citaDe(hAnt) : anticipo > 0 ? "texto del objeto" : "sin dato en la fuente pública",
      forma_precio: formaPrecio, // unitarios | global | null
    },
    como_lo_adjudican: { modalidad: l.modalidad_de_contratacion || null, ...modalidad, manifestacion: manif },
    cierre: { fecha: cierre, legible: cierre ? fechaLegible(cierre.slice(0, 10)) : null, dias_para_cierre: dias, cerrado },
    /* la MISMA regla de aplanado que la ingesta y que la foto guardada: Socrata
       publica `urlproceso` como objeto y escribirlo a mano guardaba texto basura */
    enlace_secop: require("./proyeccion.js").urlDeFila(l),
  };
  if (plazoMeses != null && cierre) {
    const inicio = new Date(Date.parse(cierre.slice(0, 10) + "T12:00:00Z"));
    const fin = new Date(inicio.getTime() + plazoMeses * 30 * 86400000);
    obra.plazo.cruza_diciembre = fin.getUTCFullYear() > inicio.getUTCFullYear();
  }

  /* ── 2 · LO QUE NECESITA PARA PRESENTARSE ─────────────────────────────── */
  const req = [];
  const add = (r) => { if (!ESTADOS_REQUISITO.includes(r.estado)) throw new Error(`estado de requisito desconocido: ${r.estado}`); req.push(r); };

  /* registro de proponente: el encaje del objeto y los códigos (evaluarRup). SI LA LEY
     LO PIDE lo dice lib/requisitos_ley (N06, 27-sep-2026): en mínima cuantía no —Ley 1150
     de 2007, art. 6, modificado por el art. 221 del Decreto Ley 19 de 2012—, así que ni
     «la oferta se rechaza» ni «no cumple»: se dice lo cierto y se manda a la invitación.
     En régimen especial no consta (manda el manual de la entidad): el rechazo se dice
     condicionado. `modalidad.pide_registro` es la misma regla (modalidadEnLlano la llama). */
  const pideRegistro = modalidad.pide_registro;
  const fraseSinRegistro = pideRegistro === false ? require("./requisitos_ley.js").requisitosQueAplican(l).registro.frase : null;
  const tituloRegistro = pideRegistro === false ? "Registro de proponente: la ley no lo exige en esta modalidad" : "Registro de proponente vigente, con este tipo de trabajo inscrito";
  const dondeRegistro = pideRegistro === false
    ? "Solo si la invitación lo pide: certificado del registro de proponente (Cámara de Comercio), en firme, con menos de 30 días."
    : "Certificado del registro de proponente (Cámara de Comercio), en firme, con menos de 30 días.";
  if (!completa || !rup) {
    add({ clave: "registro", titulo: tituloRegistro, estado: "sin_dato",
      detalle: (completa ? "Su perfil no se pudo evaluar contra este proceso." : "El proceso ya no está en la lista viva: no se puede comprobar si el trabajo encaja con lo que tiene inscrito.")
        + (fraseSinRegistro ? ` ${fraseSinRegistro}` : ""),
      donde: pideRegistro === false ? dondeRegistro : "Cámara de Comercio (renovación antes del quinto día hábil de abril de cada año)." });
  } else {
    const tier = rup.tier || "ninguno";
    const solido = ["exacto", "producto", "clase"].includes(tier);
    const flojo = ["familia", "equivalente", "texto"].includes(tier);
    const codigo = String(l.codigo_principal_de_categoria || "").trim() || null;
    const conCodigo = (t) => t + (codigo ? ` Código del proceso: ${codigo}.` : "");
    add({ clave: "registro", titulo: tituloRegistro,
      estado: solido ? "cumple" : pideRegistro === false ? "revisar" : flojo ? "revisar" : "no_cumple",
      detalle: pideRegistro === false
        ? conCodigo(solido ? `Este trabajo encaja con lo que usted tiene inscrito. ${fraseSinRegistro}` : fraseSinRegistro)
        : solido ? conCodigo("Este trabajo encaja con lo que usted tiene inscrito.")
        : flojo ? conCodigo("Encaja solo por parecido (familia o descripción): confirme en el pliego el código exacto que exigen y que lo tenga inscrito.")
          : pideRegistro === null
            ? `El trabajo NO encaja con lo que tiene inscrito. ${modalidad.clave === "regimen_especial" ? "Esta entidad contrata con su propio manual: confirme" : "Confirme"} en el pliego si pide registro de proponente; si lo pide, sin el código la oferta se rechaza.`
            : "El trabajo NO encaja con lo que tiene inscrito. Sin el código en el registro, la oferta se rechaza aunque todo lo demás esté bien.",
      donde: dondeRegistro });
  }

  // experiencia acreditada: el pliego fija cuánta; aquí solo se compara el mayor contrato acreditado con el valor del proceso
  {
    const mayor = perfilObj && num(perfilObj.expSMMLV) != null ? num(perfilObj.expSMMLV) * smmlv() : null;
    const detalle = mayor == null ? "El pliego dice cuánta experiencia exige (contratos terminados de este mismo tipo, sumados en salarios mínimos). Compárela con la que tiene acreditada en su registro."
      : presupuesto ? (mayor >= presupuesto
        ? `Su contrato acreditado más grande (${cop(mayor)}) supera el valor de este proceso (${cop(presupuesto)}): buena señal, pero el pliego suele pedir experiencia del MISMO tipo de obra y con condiciones propias. Léalo.`
        : `Su contrato acreditado más grande (${cop(mayor)}) es menor que el valor de este proceso (${cop(presupuesto)}): revise si el pliego permite sumar varios contratos o si necesita un socio que aporte la experiencia.`)
        : "El proceso no publica cuantía: la experiencia exigida la fija el pliego.";
    const hExp = hechoDe("requisito_experiencia_smmlv");
    add({ clave: "experiencia", titulo: "Experiencia acreditada del mismo tipo de obra",
      estado: hExp && hExp.estado === "no_cumple" ? "no_cumple" : "revisar",
      detalle: hExp ? `El pliego exige ${hExp.valor_legible} (${citaDe(hExp)}). ${hExp.estado === "cumple" ? "Su contrato acreditado más grande supera esa cifra, pero el pliego suele pedir experiencia del MISMO tipo de obra y con condiciones propias: confírmelo." : hExp.texto}` : detalle,
      donde: pideRegistro === false
        ? "Las certificaciones de cada contrato, firmadas por la entidad contratante, en la forma que pida la invitación."
        : "Registro de proponente (los contratos inscritos) más las certificaciones de cada contrato, firmadas por la entidad contratante." });
  }

  // capacidad de contratación (P2) y caja (P3), de lib/puertas
  if (puertas) {
    const p2 = puertas.p2_k || {};
    const pctK = p2.crp && p2.crpc != null ? Math.round(100 * p2.crpc / p2.crp) : null;
    /* PASA SOLO POR EL ANTICIPO QUE NADIE PUBLICÓ (26-sep-2026, revisión adversaria):
       decía «cumple» y «consume 134 %»; es «confírmelo» con la cifra del servidor */
    const soloConAnticipo = !!(p2.pasa && p2.depende_del_anticipo);
    /* SIN LA LISTA DE CONTRATOS EN EJECUCIÓN (27-sep-2026, R-02): el certificado
       de Génesis, PRODIAC y PICS no la trae, y lib/capacidad la toma como cero
       («no sé» convertido en «nada que descontar»). Pasar así no es «cumple»: es
       confírmelo, con lo que falta dicho. En un consorcio, basta con que falte la
       de un integrante. */
    const sinLista = (x) => !x || !Array.isArray(x.sce) || !x.sce.length;
    const sinListaDe = !!perfilObj && Array.isArray(perfilObj.integrantes) && perfilObj.integrantes.length
      ? perfilObj.integrantes.filter((i) => sinLista(i && i.perfil)).map((i) => (i.perfil && i.perfil.nombre) || "un integrante") : null;
    const sceDesconocida = !!perfilObj && (sinListaDe ? sinListaDe.length > 0 : sinLista(perfilObj));
    /* ¿LA LEY LA PIDE AQUÍ? (27-sep-2026, N19): lo trae la puerta de lib/requisitos_ley.
       No pedida (interventoría, consultoría) = «cumple» con la norma, sin porcentaje que
       asuste; no consta y no cabe = «confírmelo», nunca «no cumple» ni «la rechaza». */
    const RL = require("./requisitos_ley.js");
    const noExigida = !!(p2.exigencia && p2.exigencia.exigida === false);
    const superaSiLaPiden = !!(p2.pasa && p2.supera_si_la_piden);
    const pasaSinDescontar = !!(p2.pasa && !noExigida && !superaSiLaPiden && !soloConAnticipo && sceDesconocida);
    /* LO QUE SECOP II SÍ LE REGISTRA (27-sep-2026, lib/contratos_en_ejecucion):
       sin lista en el registro, la K ya resta los contratos de obra que SECOP II
       le tiene en ejecución —también los de sus consorcios, por su parte—, así
       que la casilla no puede decir «sin descontar». Sigue en «revisar»: lo que
       tenga fuera de SECOP II (SECOP I, particulares) no está restado. */
    const secop = pasaSinDescontar ? require("./contratos_en_ejecucion.js").lineasSecop(perfilObj) : null;
    const haySecop = !!(secop && (secop.n_restados || secop.n_aparte));
    /* LO QUE LA LISTA CARGADA DEJÓ APARTE (27-sep-2026): un contrato de la lista de la empresa
       cuyo plazo publicado ya terminó no se resta (lib/capacidad.sceParaK), y la casilla no puede
       quedar en «cumple» sin nombrarlo: «confírmelo», con el contrato y el motivo. */
    const aparteCargada = perfilObj ? require("./contratos_en_ejecucion.js").apartesDeLaListaCargada(perfilObj) : { n: 0, lineas: [] };
    const fraseAparteCargada = aparteCargada.n ? ` No se restó, y conviene confirmarlo: ${aparteCargada.lineas.join("; ")}.` : "";
    const fraseSecop = !haySecop ? ""
      : `${secop.n_restados ? `Ya se restaron los contratos de obra que SECOP II le registra en ejecución: ${secop.restados.join("; ")}.` : "SECOP II no le registra contratos de obra que se puedan restar."}`
        + `${secop.n_aparte ? ` No se restaron, y conviene confirmarlos: ${secop.aparte.join("; ")}.` : ""}`
        + ` Lo que tenga fuera de SECOP II no está restado: réstelo antes de contar con esta cifra.`;
    add({ clave: "capacidad", titulo: "Capacidad para facturar este contrato sin pasarse",
      estado: noExigida ? "cumple" : p2.sin_dato ? "sin_dato" : superaSiLaPiden || soloConAnticipo || pasaSinDescontar || (p2.pasa && aparteCargada.n) ? "revisar" : p2.pasa ? "cumple" : "no_cumple",
      detalle: noExigida ? RL.notaConFuente(p2.exigencia)
        : p2.sin_dato ? "No se puede calcular todavía: cargue en «Mi empresa» la utilidad operacional de su empresa (o el proceso no publica cuantía)."
        : superaSiLaPiden ? `${p2.exigencia && p2.exigencia.nota ? `${p2.exigencia.nota} ` : ""}Este contrato supera lo que puede facturar hoy con sus contratos en curso${pctK != null ? ` (consume ${pctK} %)` : ""}. ${RL.FRASE_CONFIRME_CAPACIDAD}`
        : soloConAnticipo ? `Solo le alcanza si el pliego da un anticipo${p2.anticipo_minimo_pct != null ? ` del ${p2.anticipo_minimo_pct} % o más` : " alto"}${p2.anticipo_tope_legal_pct != null ? ` (la ley permite hasta el ${p2.anticipo_tope_legal_pct} %)` : ""}: sin anticipo, este contrato consume ${pctK != null ? pctK : "—"} % de lo que puede facturar hoy. SECOP II no publica el anticipo: confírmelo en el pliego.`
        : pasaSinDescontar && haySecop ? `Este contrato consume ${pctK != null ? pctK : "—"} % de lo que podría facturar. ${fraseSecop}${fraseAparteCargada}`
        : pasaSinDescontar ? `Este contrato consume ${pctK != null ? pctK : "—"} % de lo que podría facturar, pero sin descontar los contratos que tenga en ejecución: ${sinListaDe && sinListaDe.length ? `el registro de ${sinListaDe.join(" y ")} no los trae` : "su registro no los trae"}. Si hoy ejecuta obra, le queda menos: réstela antes de contar con esta cifra.${fraseAparteCargada}`
        : p2.pasa ? `Este contrato consume ${pctK != null ? pctK : "—"} % de lo que puede facturar hoy con sus contratos en curso.${fraseAparteCargada}`
          : "Este contrato supera lo que puede facturar hoy con sus contratos en curso: la entidad hace la misma cuenta con su registro y lo rechaza. La salida es un consorcio con quien tenga capacidad libre.",
      donde: noExigida ? "La ley la pide solo en contratos de obra."
        /* sin constancia de que la pidan, «la entidad hace la misma cuenta» no es seguro */
        : p2.exigencia && p2.exigencia.exigida === null ? `Se calcula con su registro de proponente y sus contratos en ejecución. ${p2.exigencia.nota || ""}`.trim()
          : "Se calcula con su registro de proponente y sus contratos en ejecución; la entidad hace la misma cuenta." });
    const p3 = puertas.p3_caja || {};
    /* QUÉ ES LO QUE NO SE SABE (13-sep-2026). P3 tiene DOS ausencias posibles
       —la cuantía que el proceso no publica y el anticipo que SECOP II no
       trae— y `sin_dato_de` las distingue. Responder a las dos «el proceso no
       publica cuantía» decía una falsedad sobre un proceso CON cuantía, justo
       en la casilla con la que el usuario decide si le alcanza la plata. Si un
       documento leído ya NEGÓ el anticipo, gana él (dato publicado sobre
       calculado): P3 mira la fila, no el pliego. La rama de cierre no inventa
       cuál falta, por si algún día hay una tercera. */
    const detalleCaja = !p3.sin_dato
      ? `Tendría que financiar cerca de ${cop(p3.financiacion_requerida)} antes del primer cobro (el Estado paga contra acta, semanas o meses después)` + (p3.pasa ? ", y su patrimonio alcanza." : ", y su patrimonio queda corto: piense en anticipo, línea de crédito o un socio.")
      : p3.sin_dato_de === "anticipo"
        ? `${hAnt && hAnt.anticipo === "no" ? `El pliego leído dice que no hay anticipo (${citaDe(hAnt)})` : "El proceso no publica si tiene anticipo"}: sin anticipo tendría que financiar cerca de ${cop(p3.financiacion_requerida)} antes del primer cobro. Confírmelo en la forma de pago del pliego antes de fijar el precio.`
        : p3.sin_dato_de === "cuantia" || !p3.sin_dato_de
          ? "El proceso no publica cuantía: no se puede estimar cuánto tendría que financiar."
          : "Falta un dato del proceso para estimar cuánto tendría que financiar: confírmelo en el pliego.";
    add({ clave: "caja", titulo: "Plata para arrancar la obra antes del primer pago",
      estado: p3.sin_dato ? "sin_dato" : p3.pasa ? "cumple" : "revisar",
      detalle: detalleCaja,
      donde: "Su flujo de caja mes a mes (hágalo ANTES de fijar el precio)." });
  } else {
    add({ clave: "capacidad", titulo: "Capacidad para facturar este contrato sin pasarse", estado: "sin_dato", detalle: "Se evalúa con la fila viva del proceso y su perfil.", donde: "Su registro de proponente." });
    add({ clave: "caja", titulo: "Plata para arrancar la obra antes del primer pago", estado: "sin_dato", detalle: presupuesto ? `Con el presupuesto publicado tendría que financiar cerca de ${cop(plata.financiacion_antes_del_primer_pago)} antes del primer cobro; si alcanza o no depende de su patrimonio.` : "El proceso no publica cuantía.", donde: "Su flujo de caja mes a mes (hágalo ANTES de fijar el precio)." });
  }

  // indicadores financieros: el pliego los fija; los de referencia de los documentos tipo se comparan
  {
    const liq = perfilObj ? num(perfilObj.liquidez) : null, end = perfilObj ? num(perfilObj.endeudamiento) : null, cob = perfilObj ? num(perfilObj.coberturaIntereses) : null;
    const conDato = liq != null && end != null;
    const ok = conDato && liq >= REFERENCIA_FINANCIERA.liquidez_min && end <= REFERENCIA_FINANCIERA.endeudamiento_max && (cob == null || cob >= REFERENCIA_FINANCIERA.cobertura_min);
    const fin = ["liquidez", "endeudamiento", "cobertura", "capital_trabajo", "patrimonio", "rentabilidad_patrimonio", "rentabilidad_activo"].map((k) => hechoDe(`requisito_${k}`)).filter(Boolean);
    /* LO QUE NO SE LEYÓ NO SE DA POR CUMPLIDO (27-sep-2026, CO1.REQ.11039338): con solo la
       liquidez y el capital de trabajo leídos, el chip decía «Indicadores: Cumple» bajo un título
       que nombra la liquidez, el endeudamiento y la cobertura. Sin leer uno de esos tres (los que
       certifica el registro, D. 1082 de 2015, art. 2.2.1.1.1.5.3) el verde baja a «revisar» y el
       detalle dice cuál falta; un rojo leído sigue en rojo. La misma regla del bloque «¿Puede
       presentarse?» (public/expediente.js, sinLeerPresentarse). */
    const faltanFin = fin.length ? INDICADORES_DEL_REGISTRO.filter((k) => !hechoDe(`requisito_${k}`)) : [];
    const finEstado = !fin.length ? null : fin.some((h) => h.estado === "no_cumple") ? "no_cumple" : fin.every((h) => h.estado === "cumple") && !faltanFin.length ? "cumple" : "revisar";
    const noLeidos = faltanFin.map((k) => NOMBRE_INDICADOR[k]);
    const finDetalle = !fin.length ? null : `El pliego exige: ${fin.map((h) => `${h.titulo.toLowerCase()} ${h.valor_legible} (${citaDe(h)})`).join("; ")}. `
      + (finEstado === "cumple" ? "Sus cifras cumplen todo lo que se leyó."
        : finEstado === "revisar" && fin.every((h) => h.estado === "cumple") ? `Sus cifras cumplen lo que se leyó, pero en lo leído no está ${noLeidos.length < 2 ? noLeidos[0] : `${noLeidos.slice(0, -1).join(", ")} ni ${noLeidos[noLeidos.length - 1]}`}: búsquelo en el pliego antes de decidir.`
        /* un consorcio sin la fórmula del pliego: depende de ella, no le falta ninguna cifra (27-sep-2026, N21) */
        : finEstado === "revisar" && fin.some((h) => h.estado === "revisar" && h.plural && !h.confirmar) ? fraseConsorcioPorConfirmar(fin.filter((h) => h.estado === "revisar" && h.plural && !h.confirmar)) : finEstado === "no_cumple" ? `Sus cifras no llegan en: ${fin.filter((h) => h.estado === "no_cumple").map((h) => h.titulo.toLowerCase()).join(", ")}. Verifíquelo en su registro de proponente y en el pliego antes de descartarse.` : (fin.some((h) => h.estado === "revisar" && h.confirmar) ? `Hay cifras por confirmar en el documento (${fin.filter((h) => h.estado === "revisar" && h.confirmar).map((h) => h.titulo.toLowerCase()).join(", ")}): léalas en la cita antes de decidir.` : `Faltan cifras suyas para comparar (${fin.filter((h) => h.estado === "revisar").map((h) => h.titulo.toLowerCase()).join(", ")}): cárguelas en «Mi empresa» o compárelas con su registro.`))
      + (noLeidos.length && !(finEstado === "revisar" && fin.every((h) => h.estado === "cumple")) ? ` En lo leído no está ${noLeidos.length < 2 ? noLeidos[0] : `${noLeidos.slice(0, -1).join(", ")} ni ${noLeidos[noLeidos.length - 1]}`}: búsquelo en el pliego.` : "");
    /* en mínima cuantía no hay registro exigido que los traiga: la entidad solo puede pedir
       capacidad financiera si no paga contra entrega, y lo dice en la invitación (N06) */
    const minimaSinRegistro = modalidad.clave === "minima" && pideRegistro === false;
    add({ clave: "financieros", titulo: minimaSinRegistro ? "Indicadores financieros (liquidez, endeudamiento, cobertura de intereses), si la invitación los pide" : "Indicadores financieros del registro (liquidez, endeudamiento, cobertura de intereses)",
      /* sin pliego leído la referencia de los pliegos tipo NO es un requisito de
         este proceso: por debajo de ella es «confírmelo», nunca «no cumple» (27-sep-2026, R-02) */
      estado: finEstado || (!conDato ? "sin_dato" : "revisar"),
      /* un CONSORCIO no tiene certificado propio: si le faltan los indicadores es
         porque falta el balance de un integrante (lib/perfiles.derivarPlural), y
         mandarlo «al certificado» era mandarlo a buscar lo que no existe */
      detalle: finDetalle ? finDetalle : !conDato ? (perfilObj && perfilObj.indicadoresFaltaBalanceDe && perfilObj.indicadoresFaltaBalanceDe.length
          ? `Los indicadores del consorcio salen de sumar los balances de todos los integrantes, y falta el de ${perfilObj.indicadoresFaltaBalanceDe.join(" y ")}: cárguelo con su registro de proponente completo para que se puedan calcular.`
          : "Su perfil no trae los indicadores: están en el certificado del registro de proponente.")
        : ok ? `Sus indicadores (liquidez ${liq.toLocaleString("es-CO")}, endeudamiento ${(end * 100).toFixed(0)} %${cob != null ? `, cobertura ${cob.toLocaleString("es-CO")}` : ""}) cumplen los de referencia de los pliegos tipo (liquidez ≥ ${numCO(REFERENCIA_FINANCIERA.liquidez_min, 2)}, endeudamiento ≤ ${Math.round(REFERENCIA_FINANCIERA.endeudamiento_max * 100)} %, cobertura ≥ ${numCO(REFERENCIA_FINANCIERA.cobertura_min, 2)}). Confirme los del pliego: si piden cifras raras (liquidez ≥ 3,7) es señal de pliego hecho a la medida de alguien.`
          : `Sus indicadores (liquidez ${liq.toLocaleString("es-CO")}, endeudamiento ${(end * 100).toFixed(0)} %) no llegan a los de referencia de los pliegos tipo (liquidez ≥ ${numCO(REFERENCIA_FINANCIERA.liquidez_min, 2)}, endeudamiento ≤ ${Math.round(REFERENCIA_FINANCIERA.endeudamiento_max * 100)} %), pero cada pliego fija los suyos: compárelos con los de este pliego antes de descartarse.`,
      donde: minimaSinRegistro
        ? `En mínima cuantía la entidad solo puede pedirlos si no paga contra entrega, y dice en la invitación cómo los verifica (${require("./requisitos_ley.js").FUENTE.minima}).`
        : "Certificado del registro de proponente (la entidad los lee de ahí, con dos decimales truncados)." });
  }

  // manifestación de interés (solo menor cuantía; lib/manifestacion)
  if (manif && manif.aplica) {
    const m = manif;
    const estadoM = yaAvisoEtapa ? "cumple"
      : preparando ? "revisar"
      : m.estado === "vencida" ? "no_cumple"
        : (m.estado === "abierta" || porAbrir(m)) ? "pendiente" : "revisar";
    /* `vencida` solo sale ya de una fecha PUBLICADA (15-sep-2026), así que aquí
       se dice de dónde viene y no se menciona ningún techo legal: el techo
       pasado es `pudo_vencer`, que tiene su propia frase y NO cierra la puerta.
       Antes caía en la última rama —«la fecha no se pudo situar»—, que era falso:
       la ventana sí se situó; lo que pasó es que se agotó sin que nadie publicara
       el plazo real. */
    const detalleM = yaAvisoEtapa
      ? (conOferta ? "Usted marcó que ya presentó la oferta: SECOP II no la recibe sin el aviso, así que este paso está hecho."
        : `Usted marcó en Mis procesos que ya avisó que le interesa${etapa === "manifestado" ? ": ahora toca esperar el sorteo o la lista de interesados" : ""}.`)
      : preparando
        ? `Usted marcó «Preparando la oferta»: si avisó a tiempo, este paso está hecho; si no avisó, ya no puede presentarse${m.estado === "vencida" ? ` (${m.nota})` : ""}. Confírmelo en SECOP II.`
      : m.estado === "vencida" && m.origen_vencimiento === "fase_secop"
        ? `${m.nota} Si no avisó a tiempo, ya no puede presentarse.`
        : porAbrir(m)
          /* con las observaciones cerradas la nota ya trae la orden: una sola vez (revisión del 22-sep) */
          ? (m.secop_observaciones_cerradas ? m.nota : `${m.nota} Avise el mismo día que abra: puede durar solo unas horas.`)
          : m.estado === "vencida"
            ? `El plazo venció${m.fecha_limite_legible ? ` el ${m.fecha_limite_legible}${m.hora_limite_legible ? ` a las ${m.hora_limite_legible}` : ""} (fecha del pliego)` : ""}. Si no avisó a tiempo, ya no puede presentarse: confírmelo en el cronograma del proceso.`
            : m.estado === "abierta"
        ? `Tiene hasta el ${m.fecha_limite_legible}${m.hora_limite_legible ? ` a las ${m.hora_limite_legible}` : ""}${m.quedan_habiles != null ? ` (${m.quedan_habiles} ${plural(m.quedan_habiles, "día hábil", "días hábiles")})` : ""}, fecha leída del pliego. Sin este aviso no puede presentar oferta.`
        : faseEnDudaM(m)
          ? `${m.nota}`   // la contradicción tiene su frase: cita la fase y la publicación
        : m.estado === "por_confirmar"
          ? `El plazo lo fija el pliego y puede cerrar en cualquier momento entre el ${m.puede_cerrar_desde_legible} y el ${m.vence_a_mas_tardar_legible} (la ley permite como máximo ${m.plazo_maximo_habiles} días hábiles desde la apertura; a veces son horas). Confírmelo HOY en el cronograma de SECOP II y avise cuanto antes.`
          : m.estado === "pudo_vencer"
            ? `Nadie ha publicado la fecha límite y el máximo que da la ley (${m.plazo_maximo_habiles} días hábiles desde la apertura) ya pasó: el plazo pudo cerrarse, pero no consta que lo hiciera. Ábralo en SECOP II y mire el «Plazo para manifestación de Interés» antes de trabajar en la oferta.`
            : `La fecha no se pudo situar${m.motivo_sin_fecha ? ` (${m.motivo_sin_fecha})` : ""}: mire el cronograma del proceso en SECOP II hoy mismo.`;
    add({ clave: "manifestacion", titulo: "Avisar que le interesa (manifestación de interés) en SECOP II", estado: estadoM, detalle: detalleM,
      donde: "Botón «Manifestar interés» dentro del proceso en SECOP II. Es gratis y toma cinco minutos." });
    /* EL SORTEO, O LA LISTA DE INTERESADOS (22-sep-2026): el segundo trámite sin
       el cual no hay oferta en menor cuantía, y el que la etapa nueva «avisé ·
       en espera del sorteo» sigue. Se juzga por lo que el usuario marcó —la
       app no sabe si salió sorteado— y se dice lo que SECOP II publica de la
       fase: si ya recibe ofertas, el resultado ya está; si cerró los avisos y
       sigue en esa fase, está por salir. */
    const yaRecibeOfertas = recibeOfertasM(m);   // por el ESTADO final, no por la posición (revisión del 22-sep)
    /* quedó habilitado = marcó una etapa POSTERIOR al sorteo en el recorrido de
       lib/seguimiento (preparando · presentado · ganado · perdido) */
    const estadoS = etapa === "no_sorteado" ? "no_cumple"
      : conOferta ? "cumple"
        : preparando ? "revisar"
          : "pendiente";
    const detalleS = etapa === "no_sorteado"
      ? "Usted marcó que no salió en el sorteo: en este proceso ya no puede presentar oferta."
      : conOferta
        ? "Usted marcó que ya presentó la oferta: SECOP II solo la recibe de quien quedó habilitado, así que este paso está hecho."
        : preparando
          ? "Usted marcó «Preparando la oferta»: confírmelo en la lista de interesados o en el acta del sorteo del proceso en SECOP II."
        : yaRecibeOfertas
          ? `SECOP II ya recibe ofertas en este proceso${m.secop_fase ? ` (fase «${m.secop_fase}»${m.secop_fecha_legible ? `, vista el ${m.secop_fecha_legible}` : ""})` : ""}: el sorteo o la lista de interesados ya se publicó. Mire si quedó y cambie la etapa a «Preparando la oferta» o a «No salí en el sorteo».`
          : enSorteoM(m)
            ? `SECOP II ya cerró los avisos de interés${m.secop_fecha_legible ? ` (visto el ${m.secop_fecha_legible})` : ""}: mire en el proceso si ya salió la lista de interesados o el sorteo y si usted quedó.`
            : faseEnDudaM(m)
              ? `SECOP II tiene este proceso en la fase «${m.secop_fase || "posterior"}», pero se publicó hace poco y esa fase puede venir de una publicación anterior: mire HOY en el proceso si su aviso sigue en pie y si ya salió la lista de interesados o el sorteo.`
            : "Cuando cierre el plazo de avisos, la entidad publica quiénes siguen: si avisaron más de 10, puede sortear; si no, siguen todos los que avisaron. Solo después de eso se presenta la oferta.";
    add({ clave: "sorteo", titulo: "Quedar habilitado tras el sorteo o en la lista de interesados", estado: estadoS, detalle: detalleS,
      donde: "En SECOP II, dentro del proceso: la lista de interesados y, si lo hubo, el acta del sorteo entre los documentos." });
  }

  // lo que la app no puede verificar y el usuario tiene que conseguir
  add({ clave: "garantia_seriedad", titulo: `Garantía de seriedad de la oferta (póliza, normalmente el ${GARANTIA_SERIEDAD_PCT} % del presupuesto)`, estado: "pendiente",
    detalle: (presupuesto ? `Para este proceso serían cerca de ${cop(plata.garantia_seriedad)} asegurados; la prima es una fracción de eso. ` : "") + "Sin la póliza NO hay oferta (no se puede corregir después); un defecto de forma en ella sí se corrige." + (hechoDe("garantias") ? ` Las garantías exactas están en ${citaDe(hechoDe("garantias"))}.` : ""),
    donde: "Su aseguradora, con al menos cinco días hábiles de anticipación: la primera vez piden estados financieros y la vigencia debe cubrir tres meses desde el cierre." });
  add({ clave: "firma_digital", titulo: "Usuario en SECOP II y certificado de firma digital vigente", estado: "pendiente",
    detalle: "La oferta se firma en la plataforma; un certificado vencido el día del cierre es una oferta que no existe. Verifique la fecha de vencimiento hoy.",
    donde: "Entidad certificadora (Certicámara, GSE, Andes SCD u otra)." });
  add({ clave: "antecedentes", titulo: "Certificados de antecedentes y paz y salvo de seguridad social", estado: "pendiente",
    detalle: "Procuraduría (disciplinarios), Contraloría (fiscales), Policía (judiciales), medidas correctivas, el Registro de Deudores Alimentarios Morosos (REDAM: quien figure en él, usted o el representante legal de su empresa, no puede contratar con el Estado hasta ponerse a paz y salvo; Ley 2097 de 2021, art. 6), y el pago de salud, pensión y parafiscales de los últimos seis meses, firmado por el revisor fiscal o el representante legal.",
    donde: "Los de Procuraduría, Contraloría, Policía y medidas correctivas son gratis y en línea; el de seguridad social lo firma usted (o su revisor fiscal)." });
  {
    const leidoPV = ["personal", "visita_obligatoria", "equipos_o_laboratorio"].map(hechoDe).filter(Boolean);
    if (leidoPV.length) add({ clave: "personal_y_visita", titulo: "Equipo de trabajo, equipos y visita de obra que exige el pliego", estado: "revisar",
      detalle: `${leidoPV.map((h) => `${h.titulo} (${citaDe(h)})`).join(". ")}. NUNCA prometa personal ni equipos que no tiene: si gana, tiene que presentarlos.${hechoDe("visita_obligatoria") ? " La visita es obligatoria: sin el acta la oferta se rechaza." : ""}`,
      donde: "Hojas de vida, tarjetas profesionales, cartas de compromiso y de disponibilidad de equipos; el acta de visita la expide la entidad." });
    else if (esObra) add({ clave: "personal_y_visita", titulo: "Equipo de trabajo mínimo y visita de obra (si el pliego los exige)", estado: "pendiente",
      detalle: "Director e ingeniero residente con la experiencia que pida el pliego, con cartas de compromiso firmadas. NUNCA prometa personal que no está vinculado: si gana, tiene que presentarlo. Si hay visita de obra obligatoria, la fecha va en el cronograma.",
      donde: "Hojas de vida, tarjetas profesionales y cartas de compromiso; el acta de visita la expide la entidad." });
  }
  add({ clave: "carpeta", titulo: "Los formularios del pliego, diligenciados y en la sección correcta de SECOP II", estado: "pendiente",
    detalle: "Carta de presentación, formulario de experiencia, oferta económica en el formato EXACTO que exigen, apoyo a la industria nacional y los anexos de desempate (empresa pequeña, personas con discapacidad, mujeres, entre otros). El formulario de la plataforma prevalece sobre el PDF: no deje campos vacíos «porque ya está en el PDF»." + (hechoDe("causal_de_rechazo") ? ` Las causales de rechazo están en ${citaDe(hechoDe("causal_de_rechazo"))}: léalas primero.` : ""),
    donde: "El pliego trae los formatos; cada uno se carga en su carpeta en SECOP II (el precio jamás en la carpeta técnica)." });

  /* ── 2b · LO QUE EXIGE ESTE PLIEGO (las ocho casillas) ─────────────────── */
  const exigencias = exigenciasDe({ hechoDe, perfilObj, lectura, hAnt, anticipo, anticipoLegible: obra.pago.anticipo_legible, idProceso: l.id_del_proceso || null,
    presupuestoCOP: presupuesto, plazoMeses, tipoContrato: l.tipo_de_contrato || null, modalidadClave: modalidad.clave, porLotes: !!dicen.por_lotes, capitalTrabajo: dicen.capital_trabajo || null });
  /* ── 2c · LO QUE DICE EL PLIEGO, CITADO (4-sep-2026, noche) ──────────────
     Encargo del dueño: «experiencia específica y general, estados financieros y
     si hay anticipo: cita qué dice el pliego, y que lo que cites sea real». Cinco
     temas, siempre, con el PÁRRAFO literal (lib/documentos_proceso.citasDeTexto)
     y su documento y página; debajo, si la aplicación además leyó una cifra, la
     comparación con la empresa (de `exigencias`). Sin cita: se dice por qué. */
  const CIFRA_DE_TEMA = { experiencia_especifica: ["experiencia_especifica"], experiencia_general: ["experiencia_general"], financieros: ["liquidez", "endeudamiento", "cobertura", "capital_trabajo", "patrimonio", "rentabilidad_patrimonio", "rentabilidad_activo"], organizacional: [], anticipo: ["anticipo"] };
  const citasPliego = (dicen.citas || []).map((c) => {
    const cifras = (CIFRA_DE_TEMA[c.clave] || []).map((k) => exigencias.find((x) => x.clave === k)).filter((x) => x && x.exige != null && !x.estimado) // un estimado no es una cifra del pliego citado
      .map((x) => ({ clave: x.clave, titulo: x.titulo, exige: x.exige, suyo: x.suyo, estado: x.estado, estado_legible: x.estado_legible, accion: x.accion || null }));
    const estado = c.texto ? "citado" : lectura.leidos > 0 ? "sin_mencion" : (lectura.estado === "sin_indice" || lectura.estado === "por_leer") ? "por_leer" : "sin_documentos";
    return { clave: c.clave, titulo: c.titulo, estado, texto: c.texto, documento: c.documento, pagina: c.pagina, cifras,
      nota: estado === "citado" ? null : estado === "por_leer" ? "Los documentos del proceso se están leyendo." : estado === "sin_mencion" ? "Ningún documento leído lo menciona con esas palabras: búsquelo en el pliego." : "No se leyó ningún documento de este proceso: cargue el pliego." };
  });

  /* ── 3 · PASO A PASO, CON FECHAS ──────────────────────────────────────── */
  const pasos = [];
  const paso = (titulo, cuando, detalle) => pasos.push({ orden: pasos.length + 1, titulo, cuando: cuando || null, cuando_legible: cuando ? fechaLegible(String(cuando).slice(0, 10)) : null, detalle });
  paso("Lea primero las causales de rechazo y el cronograma del pliego", hoy, "Es lo primero que se lee, antes que el objeto: ahí está lo que lo deja por fuera. Anote cada fecha en su calendario (descargue el archivo de calendario de este proceso).");
  if (manif && manif.aplica && etapa === "manifestado") {
    paso("Mire en SECOP II si quedó habilitado (sorteo o lista de interesados)", null, "Usted ya avisó que le interesa. Cuando la entidad publique quiénes siguen, cambie la etapa en Mis procesos: «Preparando la oferta» si quedó, «No salí en el sorteo» si no.");
  } else if (manif && manif.aplica && manif.estado !== "vencida" && !yaAvisoEtapa) {
    /* «preparando» sigue recibiendo el paso: no declara el aviso y perderlo cuesta el proceso */
    /* con fecha del pliego, ese día; sin ella, HOY: la ventana calculada es un techo, no un plazo.
       Con la fase publicada ANTERIOR (22-sep-2026) no hay «hoy mismo» que valga: el plazo no ha abierto. */
    if (porAbrir(manif) && manif.secop_observaciones_cerradas) paso("Avise que le interesa en SECOP II el día que abra el plazo", null, "Según SECOP II las observaciones al pliego ya cerraron: el plazo para avisar puede abrir en cualquier momento con el pliego definitivo y durar solo unas horas. Mire hoy el cronograma. Sin este aviso no hay oferta.");
    else if (porAbrir(manif)) paso("Avise que le interesa en SECOP II el día que abra el plazo", null, `Según SECOP II el proceso todavía está en «${manif.secop_fase || "una fase anterior"}»: el plazo para avisar abre con el pliego definitivo y puede durar solo unas horas. Siga el cronograma. Sin este aviso no hay oferta.`);
    else if (manif.confirmada && manif.fecha_limite) paso("Avise que le interesa en SECOP II", manif.fecha_limite, "Fecha límite leída del pliego. Sin este aviso no hay oferta.");
    else paso("Avise que le interesa en SECOP II (hoy mismo)", hoy, `El plazo lo fija el pliego y puede cerrar en cualquier momento${manif.vence_a_mas_tardar_legible ? `, a más tardar el ${manif.vence_a_mas_tardar_legible}` : ""}: confírmelo en el cronograma y avise ya. Sin este aviso no hay oferta.`);
  }
  if (cierre && !cerrado) {
    const cierreDia = cierre.slice(0, 10);
    const observaciones = sumarDias(cierreDia, -7);
    /* UN PUBLICADO GANA A UN CALCULADO (revisión del 22-sep): si SECOP II ya tiene cerradas las
       observaciones (fase de observaciones en «Evaluación», en cualquier modalidad), no se manda
       a enviar observaciones «hoy» por una fecha calculada del cierre. `require` diferido: cierra ciclo. */
    const observacionesCerradas = !!(manif && manif.secop_observaciones_cerradas) || require("./filtros.js").evaluacionDeFaseAnterior(l.estado_del_procedimiento, l.fase);   // `l`: sin fila viva es la foto
    if (observaciones >= hoy && !observacionesCerradas) paso("Envíe observaciones al pliego si algo lo deja por fuera", observaciones, "Si un requisito parece hecho a la medida de otro, obsérvelo con la redacción alternativa lista para pegar y el argumento de que restringe la participación. La fecha exacta está en el cronograma; esta es orientativa.");
    let seriedad = sumarHabiles(cierreDia, -5);
    if (seriedad < hoy) seriedad = hoy;
    paso("Pida la garantía de seriedad a su aseguradora", seriedad, "Al menos cinco días hábiles antes del cierre: la primera vez tardan.");
    let anterior = sumarDias(cierreDia, -1);
    while (!esHabil(anterior) && anterior > hoy) anterior = sumarDias(anterior, -1);
    if (anterior < hoy) anterior = hoy;
    paso("Cargue y PRESENTE la oferta completa", anterior, "El día ANTERIOR al cierre, nunca el mismo día: a la hora del cierre se cae la plataforma, la luz o el internet. Puede modificarla hasta la hora exacta del cierre sin revelar nada.");
    paso("Verifique que el estado diga «Presentada» y tome pantallazo con la hora", anterior, "«En creación» al cierre es lo mismo que no haber presentado: es el error número uno del país. Guarde la evidencia.");
    paso("Cierre del proceso", cierreDia, "Desde aquí puede descargar las ofertas de todos los competidores: precio, experiencia y consorcios. Es información pública y casi nadie la usa.");
    if (modalidad.traslado_habiles) paso("Revise el informe de evaluación y responda dentro del traslado", null, `Cuando publiquen el informe tiene ${modalidad.traslado_habiles} ${plural(modalidad.traslado_habiles, "día hábil", "días hábiles")} para: corregir lo suyo (con tabla de trazabilidad y ni una línea de más), revisar lo ajeno y observar el informe. Si le marcan «no cumple», corrija sin esperar a que se lo pidan.`);
    paso("Adjudicación, firma y acta de inicio", null, "Si gana: pólizas del contrato, firma, y NO firme el acta de inicio si la entidad no le ha entregado predio, diseños, licencias o permisos. El plazo corre desde el acta.");
  } else if (cerrado) {
    paso("El proceso ya cerró", cierre ? cierre.slice(0, 10) : null, "Si se presentó: revise el informe de evaluación y responda dentro del traslado. Si no: descargue las ofertas de los competidores y aprenda cuánto bajaron y con quién se juntaron.");
  }
  /* EL PASO A PASO SE ORDENA POR FECHA, NO POR EL ORDEN EN QUE SE ESCRIBIÓ
     (13-sep-2026). «Envíe observaciones» son 7 días CALENDARIO antes del cierre
     y «Pida la garantía de seriedad» son 5 días HÁBILES: con un festivo en esa
     última semana —y Colombia tiene dieciocho, casi todos en lunes— la hábil cae
     ANTES que la calendario, y el paso 3 quedaba fechado DESPUÉS del 4. Medido:
     con cierre el martes 13-oct-2026 (el lunes 12 es Día de la Raza),
     observaciones el 6 y garantía el 5. Cada fecha es correcta por separado; lo
     que estaba mal era el orden en que se leen, y una lista numerada cuyas
     fechas van hacia atrás es una pantalla que se contradice sola.
     NO SE PERMUTA ESE PAR A MANO: cerraría el caso reproducido dejando hermanos vivos
     —la fecha de manifestación leída del pliego, el suelo `hoy` que se aplica a tres pasos y
     cualquier regla con fecha que entre después pueden volver a cruzarse—. Se ordena el BLOQUE
     ENTERO.
     El orden es ESTABLE: dos pasos del mismo día conservan el suyo (presentar y
     comprobar que dice «Presentada»), y los pasos SIN fecha —el traslado y la
     adjudicación, que dependen de cuándo publique la entidad— se quedan al
     final, que es donde nacen. */
  const conFecha = pasos.filter((p) => p.cuando), sinFecha = pasos.filter((p) => !p.cuando);
  conFecha.sort((a, b) => (a.cuando < b.cuando ? -1 : a.cuando > b.cuando ? 1 : a.orden - b.orden));
  const enOrden = [...conFecha, ...sinFecha];
  pasos.length = 0;
  for (const p of enOrden) pasos.push({ ...p, orden: pasos.length + 1 });

  /* ── 4 · CONSEJOS PARA ESTE PROCESO ───────────────────────────────────── */
  const consejos = [];
  const consejo = (clave, titulo, detalle, por_que_aqui) => consejos.push({ clave, titulo, detalle, por_que_aqui: por_que_aqui || null });

  if (hAnt && hAnt.anticipo === "no") consejo("sin_anticipo", "El pliego dice que no hay anticipo: usted financia el arranque",
    "Paga los primeros meses de obra con su plata y cobra contra actas parciales (semanas o meses después). Haga el flujo de caja mes a mes antes de fijar el precio: si el acumulado se hunde, suba el precio o no se presente.", citaDe(hAnt));
  else if (anticipo > 0) consejo("anticipo", `Hay anticipo del ${anticipo} %, pero no es plata suya todavía`,
    "El anticipo va a una fiducia (patrimonio autónomo) y se gasta solo con el plan de inversión aprobado por la interventoría; se descuenta de cada acta. Sirve para arrancar, no para financiar la empresa. Y exige una póliza de buen manejo del anticipo.", hAnt ? citaDe(hAnt) : "el objeto del proceso menciona el anticipo");
  else if (hAnt && hAnt.anticipo === "si") consejo("anticipo", "Hay anticipo, pero confirme el porcentaje y cómo se descuenta",
    "El anticipo va a una fiducia (patrimonio autónomo) y se gasta solo con el plan de inversión aprobado por la interventoría; se descuenta de cada acta. Exige una póliza de buen manejo del anticipo. El porcentaje exacto está en el documento citado.", citaDe(hAnt));
  else if (hAnt) consejo("sin_anticipo", "El pliego tiene un apartado sobre el anticipo: léalo antes de fijar el precio",
    "La aplicación vio el título, el índice o una fórmula, no la cláusula. Si no hay anticipo, usted paga los primeros meses de obra con su plata y cobra contra actas parciales: haga el flujo de caja mes a mes antes de fijar el precio.", citaDe(hAnt));
  else consejo("sin_anticipo", "El proceso no publica si hay anticipo: búsquelo en el pliego",
    "Si no hay anticipo, usted paga los primeros meses de obra con su plata y cobra contra actas parciales (semanas o meses después). Haga el flujo de caja mes a mes antes de fijar el precio: si el acumulado se hunde, suba el precio o no se presente.", "la fuente pública no trae el anticipo de este proceso");
  /* la condición es la de lib/ganancia: solo interventoría y consultoría están
     exentas. El motivo se dice como es —«es un contrato de obra» sería falso en
     un suministro— y la prudencia es la misma que allí: ante un tipo que no se
     pudo descartar, se presupuesta el descuento. */
  if (aplicaContribucion(tipoTrabajo)) consejo("contribucion_5", `Sume la contribución de obra pública del ${CONTRIBUCION_OBRA_PCT} %`,
    (presupuesto ? `Sobre el valor del contrato sin impuestos: aquí son cerca de ${cop(plata.contribucion_obra)}, descontados en cada pago. ` : "Se descuenta del valor del contrato en cada pago. ") + "Es el olvido más caro del país y no está en ningún análisis de precios unitarios. Aplica también a las adiciones.",
    esObra ? "es un contrato de obra" : "no se pudo descartar que sea un contrato de obra pública: solo interventoría y consultoría quedan por fuera");
  consejo("estampillas", "Pregunte por las estampillas del departamento y del municipio",
    "Cada departamento y municipio tiene las suyas (universidad, adulto mayor, cultura, entre otras): entre 0,5 % y 5 % acumulado, descontadas en cada pago. Están en el pliego o en el estatuto tributario de la entidad; si no las suma, las paga de su ganancia.", l.departamento_entidad ? `la obra es en ${l.departamento_entidad}` : null);
  consejo("regla_24h", "Presente la oferta el día ANTERIOR al cierre",
    "SECOP II permite retirar y modificar la oferta cuantas veces quiera hasta la hora exacta del cierre; presentar temprano no revela nada. La hora del cierre es la hora en que más ofertas mueren en Colombia.", null);
  consejo("errores_forma", "Los nueve errores de forma que descalifican, y todos dependen de usted",
    "Guardar sin dar «Presentar»; cargar el archivo en la carpeta equivocada (el precio en la técnica lo revela antes de tiempo); pasarse del peso máximo por archivo; PDF con contraseña o dañado; firma digital vencida; no responder un mensaje DENTRO de la plataforma (el correo no cuenta); dejar campos del formulario vacíos; oferta económica en otro formato; empezar a cargar el día del cierre.", null);
  /* el consejo de precio sale de la regla de la modalidad (`modalidad.precio`), la misma que lee Precios */
  if (modalidad.precio.se_gana === "metodo_al_azar") {
    const b = ctx.baja && ctx.baja.baja_mediana != null && ctx.baja.granularidad_utilizada === "entidad" ? ctx.baja : null;
    consejo("precio_no_al_piso", "No tire el precio al piso: el método con el que puntúan el precio se sortea",
      (b ? `Los que ganaron en esta entidad ofertaron cerca de ${Math.round(b.baja_mediana)} % por debajo del presupuesto oficial (${b.procesos_contados} contratos ya adjudicados). ` : "")
      + `${modalidad.precio.frase} En la mayoría de los métodos posibles gana la oferta cercana al centro de las ofertas, no la más barata. Ubíquese donde gana bajo más métodos y compruebe que la ganancia sobreviva. Una oferta muy por debajo obliga a la entidad a pedirle explicaciones y, sin estructura de costos, a rechazarla.`, "la modalidad puntúa el precio");
  } else if (modalidad.precio.se_gana === "menor_precio") {
    consejo("precio_minima", "Aquí sí gana el menor precio, pero no por debajo de su costo",
      "Calcule su costo real (con contribución, estampillas y pólizas) en la pestaña Precios y ponga el precio piso ANTES de ofertar. Una oferta por debajo del 80 % del presupuesto oficial le exige justificar sus costos y puede rechazarse.", "la modalidad adjudica al menor precio");
  } else if (modalidad.precio.se_gana === "no_puntua") {
    consejo("concurso", "No compite por precio: compite por experiencia y equipo",
      "El puntaje sale de la experiencia de la empresa y de las hojas de vida del equipo. Cada certificación tiene que decir exactamente lo que el pliego pide (objeto, valor, fechas, entidad): una certificación incompleta vale cero puntos y no se puede corregir después.", "es un concurso de méritos");
  }
  if (manif && manif.aplica) consejo("manifestacion", "En este tipo de proceso hay que avisar ANTES de poder presentarse",
    `El interés se manifiesta en SECOP II en el plazo que fija el pliego (la ley permite como máximo ${PLAZO_MANIFESTACION_HABILES} días hábiles desde la apertura, y suele ser menos: a veces horas). Si avisan más de 10, la entidad puede sortear quiénes siguen. Avise aunque no esté seguro: no cuesta nada y sin el aviso no hay oferta.`, "selección abreviada de menor cuantía");
  if (zona.nivel === "lejos" || zona.dificil_acceso) consejo("zona_lejos", "La obra queda lejos: el costo de llegar no está en el presupuesto oficial",
    `${zona.km != null ? `${zona.capital ? `${zona.capital}, la capital del departamento, queda a unos ${zona.km} km de ${zona.base || "su base"} por carretera (estimado); el municipio de la obra puede estar más cerca o más lejos. ` : `Unos ${zona.km} km desde ${zona.base || "su base"} (estimado). `}` : ""}Transporte de equipo, alojamiento del personal y visitas del director cuestan y no aparecen en el análisis de precios unitarios de la entidad. Súmelos en su administración.`, zona.etiqueta);
  if (zona.verificar_orden_publico) consejo("orden_publico", "Verifique la seguridad de la zona antes de ofertar",
    "El departamento tiene zonas donde las obras se paran por orden público. Pregunte en el municipio y a otros contratistas; una obra suspendida meses cuesta más que no haberse presentado.", zona.etiqueta);
  if (formaPrecio === "global") consejo("precio_global", "Es a precio global: el riesgo de las cantidades es suyo",
    "Si hay más cantidad de obra que la del presupuesto, no se la pagan aparte. Mida bien y ponga un colchón; en precio global, subestimar cantidades es perder plata sin remedio.", "el objeto dice «precio global»");
  else if (formaPrecio === "unitarios") consejo("precios_unitarios", "Es a precios unitarios: las cantidades del pliego son un estimativo",
    "Las mayores cantidades que la entidad ordene se deben pagar (y no cuentan como adición). Lo que sí es suyo es el precio de cada unidad: revise cada análisis, sobre todo los ítems que más pesan.", "el objeto dice «precios unitarios»");
  if (obra.plazo.cruza_diciembre || (plazoMeses != null && plazoMeses > 12)) consejo("reajuste", "El contrato cruza un cambio de año: pregunte si hay reajuste de precios",
    "En enero suben el salario mínimo y los materiales; si el contrato no tiene cláusula de reajuste, ese aumento sale de su ganancia. Si no la tiene, cotice los meses del año siguiente con el aumento incluido.", `plazo de ${obra.plazo.legible}`);
  if (puertas && puertas.p3_caja && puertas.p3_caja.pasa === false) consejo("consorcio", "Si la caja no alcanza, piense en un socio, y verifíquelo antes de firmar",
    "Un consorcio suma experiencia, capacidad y patrimonio, pero cada integrante responde por el 100 %. Antes de firmar: antecedentes del socio (Procuraduría, Contraloría, Policía, medidas correctivas) y su historial de multas. Esta aplicación lo hace en «Mi empresa» con el NIT. Y ojo con el reparto: el pliego tipo no fija un mínimo de participación pero sí reparte la experiencia (uno aporta al menos la mitad), y algunos pliegos sí fijan un mínimo: léalo antes de acordar los porcentajes.", "el patrimonio queda corto para financiar la obra");
  if (ctx.competencia && ctx.competencia.promedio_oferentes != null) consejo("competencia", `En esta entidad suelen presentarse cerca de ${Math.round(ctx.competencia.promedio_oferentes)} empresas`,
    ctx.competencia.nivel === "baja" ? "Poca competencia puede ser un nicho ganable, o un pliego hecho a la medida de alguien: mire quién ganó antes y con qué requisitos. Si el histórico muestra siempre uno o dos oferentes, y uno sin capacidad, es la segunda." : "Cuando hay muchos oferentes, los empates son frecuentes: acredite TODOS los factores de desempate que legítimamente cumpla (empresa pequeña, personas con discapacidad en la nómina, mujeres cabeza de familia, entre otros). Es la póliza más barata del oficio.", `${ctx.competencia.total_procesos} procesos ya adjudicados de la entidad`);
  consejo("mensajes_plataforma", "Revise los mensajes DENTRO de SECOP II todos los días",
    "Las entidades piden aclaraciones por mensaje dentro del proceso y dan plazos cortos. No responder a tiempo equivale a no haber presentado. El correo externo no cuenta.", null);
  consejo("etica", "Canal formal siempre",
    "Ningún contacto con la entidad por fuera de la plataforma; ningún acuerdo con otro oferente. La regla de oro: si le incomodaría que se publicara, no se hace. La sanción es cárcel e inhabilidad de hasta 20 años.", null);

  /* ── 5 · LA PLATA QUE NADIE SUMA ──────────────────────────────────────── */
  const dinero = {
    presupuesto_oficial_cop: presupuesto,
    contribucion_obra_5pct_cop: plata.contribucion_obra,
    garantia_seriedad_asegurada_cop: plata.garantia_seriedad,
    financiacion_antes_del_primer_pago_cop: plata.financiacion_antes_del_primer_pago,
    anticipo_cop: presupuesto && anticipo > 0 ? Math.round(presupuesto * anticipo / 100) : null,
    otros_que_nadie_suma: [
      { concepto: "Estampillas del departamento y del municipio", tipico: "0,5 % a 5 % acumulado", nota: "varían por entidad: verifíquelas en el pliego" },
      { concepto: "Retención en la fuente y retención de industria y comercio", tipico: "1 % a 11 % / 0,4 % a 1,4 %", nota: "según concepto y municipio" },
      { concepto: "Pólizas del contrato (cumplimiento, salarios, estabilidad, responsabilidad civil)", tipico: "1 % a 3 %", nota: "según riesgo e historial con la aseguradora" },
      { concepto: "Costo financiero del capital de trabajo", tipico: "variable y grande", nota: "2 % mensual financiando el 40 % durante 6 meses son cerca de 5 puntos de ganancia" },
      { concepto: "Ensayos, laboratorio y certificaciones", tipico: "0,5 % a 2 %", nota: "no están en los análisis de precios" },
      { concepto: "Plan de manejo ambiental, señalización y seguridad en el trabajo", tipico: "1 % a 3 %", nota: "obligatorios y se olvidan" },
      { concepto: "Liquidación, actas y cierre", tipico: "0,5 %", nota: "el contrato no termina cuando termina la obra" },
    ],
    nota: "Cifras de referencia del manual del oficio (capítulo 11), no del pliego: confírmelas ahí antes de fijar el precio.",
  };

  /* ── 6 · LOS DOCUMENTOS DEL PROCESO: qué se leyó, qué falta, qué no se puede ── */
  const documentos = bloqueDocumentos(ctx.documentos || null, lectura, dicen, l.urlproceso || null, ahoraMs);

  /* la acción que cubre un requisito en rojo (6-sep-2026, M-COMP-02): los que un
     socio puede cubrir —registro, experiencia, capacidad, indicadores— llevan
     `accion: {tipo:"consorcio", proceso}`; los demás (el aviso vencido, lo que
     hay que conseguir) llevan null: ningún socio los arregla */
  for (const r of req) r.accion = r.estado === "no_cumple" && REQUISITOS_CON_SOCIO.includes(r.clave) ? { tipo: "consorcio", proceso: l.id_del_proceso || null } : null;

  const cuenta = (e) => req.filter((r) => r.estado === e).length;
  const nc = cuenta("no_cumple"), ok = cuenta("cumple");
  return {
    version: VERSION, completa, perfil: perfil || null, generada_el: new Date(ahoraMs).toISOString(),
    obra, citas_pliego: citasPliego, exigencias, requisitos: req, pasos, consejos, dinero, documentos, lo_que_dicen: dicen.hechos,
    resumen: {
      requisitos_total: req.length, cumple: ok, revisar: cuenta("revisar"), no_cumple: nc, pendiente: cuenta("pendiente"), sin_dato: cuenta("sin_dato"),
      exigencias: resumenExigencias(exigencias),
      consejos: consejos.length, pasos: pasos.length, hechos_de_documentos: dicen.hechos.length, documentos_leidos: lectura.leidos,
      bloqueado_por: req.filter((r) => r.estado === "no_cumple").map((r) => r.titulo),
      frase: nc ? `Hay ${nc} ${plural(nc, "requisito", "requisitos")} que hoy no cumple: léalo antes de invertir tiempo.`
        : `${ok} de ${req.length} requisitos verificados por la aplicación; el resto lo consigue usted (${cuenta("pendiente")} por conseguir, ${cuenta("revisar")} por confirmar en el pliego).`,
    },
    como_leerlo: "Guía generada con las reglas de esta aplicación, los documentos del proceso que ya se leyeron (cada hecho dice de qué documento y página sale) y el manual del oficio: lo verificado se dice «cumple» o «no cumple»; lo que solo el pliego puede confirmar, «revisar»; lo que usted tiene que conseguir, «pendiente». Ninguna cifra sustituye al pliego.",
  };
}

/* ── la ficha «lo que exige este pliego»: ocho casillas, siempre ──────────── */
function exigenciasDe({ hechoDe, perfilObj = null, lectura, hAnt = null, anticipo = 0, anticipoLegible = null, idProceso = null, presupuestoCOP = null, plazoMeses = null, tipoContrato = null, modalidadClave = null, porLotes = false, capitalTrabajo = null }) {
  const { fmtValorRequisito: fmtValor } = require("./diff.js");
  const leyoAlgo = (lectura && lectura.leidos > 0) || false;
  /* sin nada leído: «por leer» mientras la lectura está en marcha o por empezar;
     «sin dato» si SECOP II no publica índice (la guía ya pide cargar el pliego) */
  const sinLectura = !leyoAlgo ? ((lectura && (lectura.estado === "sin_indice" || lectura.estado === "por_leer")) ? "por_leer" : "sin_dato") : null;
  const salida = [];
  for (const e of EXIGENCIAS) {
    const base = { clave: e.clave, titulo: e.titulo, exige: null, exige_valor: null, tipo_valor: null, suyo: null, suyo_rotulo: e.suyo_rotulo, estado: "sin_dato", estado_legible: "", nota: null, documento: null, pagina: null, cita: null, cambiado_por_adenda: false, valor_anterior: null, accion: null };
    const cierra = (x) => { if (!ESTADOS_EXIGENCIA.includes(x.estado)) throw new Error(`estado de exigencia desconocido: ${x.estado}`); x.estado_legible = ESTADO_EXIGENCIA_LEGIBLE[x.estado]; salida.push(x); };
    if (e.clave === "anticipo") {
      /* el anticipo es un HECHO del contrato, no un requisito: estado «dato» cuando se sabe */
      const x = { ...base, nota: anticipoLegible };
      if (hAnt) {
        x.exige = hAnt.anticipo === "no" ? "No hay" : hAnt.contradice ? "Los documentos no coinciden" : hAnt.anticipo === "mencion" ? "Tiene un apartado" : anticipo > 0 ? `Sí, ${anticipo} %` : "Sí";
        x.estado = hAnt.anticipo === "mencion" ? "revisar" : "dato";
        x.documento = hAnt.documento || null; x.pagina = hAnt.pagina == null ? null : hAnt.pagina; x.cita = hAnt.cita || null;
      } else if (anticipo > 0) {
        x.exige = `${anticipo} %`; x.estado = "revisar"; x.nota = `El objeto del proceso menciona un anticipo del ${anticipo} %: confírmelo en la forma de pago del pliego.`;
      } else {
        x.estado = sinLectura || "sin_dato"; x.nota = sinLectura === "por_leer" ? "Los documentos del proceso se están leyendo." : e.sin_cifra;
      }
      cierra(x);
      continue;
    }
    let h = null, clavePrimera = null;
    for (const k of e.hechos) { h = hechoDe(k); if (h) { clavePrimera = k; break; } }
    const propio = e.campo && perfilObj ? perfilObj[e.campo] : null;
    const tieneSuyo = propio != null && propio !== "" && Number.isFinite(Number(propio));
    if (!h) {
      const x = { ...base, estado: sinLectura || "sin_dato", nota: sinLectura === "por_leer" ? "Los documentos del proceso se están leyendo." : e.sin_cifra };
      /* EL CAPITAL DE TRABAJO ESTIMADO (27-sep-2026): con los documentos leídos y sin la
         cifra, la fórmula del pliego tipo de obra (lib/capacidad.capitalTrabajoDemandado).
         Es un cálculo: la casilla queda en «confírmelo», sin cifra exigida que decida */
      /* solo donde rige el pliego tipo de obra (licitación y menor cuantía: en régimen especial
         un pliego real pide el 10 %, CO1.REQ.10323667) y sin lotes (el lote fija la cifra) */
      /* y nunca encima de una fórmula que ESTE pliego declara y no se pudo aplicar (falta el plazo,
         la tabla o el tramo: lib/capital_trabajo «sin_calculo»): la publicada gana al pliego tipo */
      /* …ni encima de VARIAS fórmulas que el pliego trae y la aplicación no sabe cuál aplica
         (CO1.REQ.10968059: «10 % x (PO)» por tramos junto al 33 % de la plantilla; el estimado
         salía 3,3 veces el $173.076.572 de su Matriz 2). En oportunidades el falso caro es el
         NEGATIVO: una exigencia inflada lo haría descartar un proceso que cumple. Sí se estima
         cuando el documento dice «CT = AC − PC ≥ CTd» sin fórmula («sin_formula»): la fórmula es
         la del documento tipo (CO1.REQ.11042743 y CO1.REQ.11033801, revisados a mano) */
      const formulaPropia = !!(capitalTrabajo && (capitalTrabajo.estado === "sin_calculo" || (capitalTrabajo.estado === "ilegible" && capitalTrabajo.motivo === "varias_formulas")));
      const est = e.clave === "capital_trabajo" && !sinLectura && !formulaPropia && /obra/i.test(String(tipoContrato || "")) && (modalidadClave === "licitacion" || modalidadClave === "menor_cuantia") && !porLotes
        ? require("./capacidad.js").capitalTrabajoDemandado({ presupuestoCOP, plazoMeses, anticipoPct: anticipo }) : null;
      if (est) {
        const cifra = fmtValor(est.valor, "dinero");
        x.estado = "revisar"; x.exige = `Unos ${cifra} (estimado)`; x.estimado = est;
        /* el anticipo, dicho como se sabe: negado por el pliego, supuesto por el objeto o sin leer */
        const deAnticipo = hAnt && hAnt.anticipo === "no" ? ", sin anticipo: el pliego dice que no hay"
          : !est.anticipo_supuesto ? `, descontando el anticipo del ${est.anticipo_pct} % que menciona el objeto (confírmelo)`
            : hAnt && (hAnt.anticipo === "si" || hAnt.anticipo === "mencion") ? ", sin descontar el anticipo, cuyo porcentaje no se leyó"
              : ", sin descontar anticipo: no se sabe si hay";
        /* un CONSORCIO: su capital de trabajo con la fórmula del plural del pliego, o con las tres
           (lib/reparto.casillaFinancieraPlural, 27-sep-2026, N21); la casilla sigue en «confírmelo» */
        const hMet = hechoDe("metodo_plural");
        const plE = require("./reparto.js").casillaFinancieraPlural({ perfil: perfilObj, campo: "capitalTrabajo", metodoLeido: hMet && hMet.metodo ? hMet : null,
          juzgar: (v) => (v == null || !Number.isFinite(Number(v)) ? "sin_dato" : Number(v) >= est.valor ? "si" : "no"), fmt: (v) => fmtValor(Number(v), "dinero") });
        x.nota = `La aplicación no encontró la cifra en lo leído. Con la fórmula del pliego tipo de obra (${plazoMeses < 12 ? "el 33 % del presupuesto" : `el presupuesto entre el plazo, por ${est.meses_apalancamiento} meses`}${deAnticipo}) serían unos ${cifra}`
          + (plE ? `. Frente a esa cifra: ${plE.texto.charAt(0).toLowerCase()}${plE.texto.slice(1).replace(/\.$/, "")}` : tieneSuyo ? `; el suyo es ${fmtValor(Number(propio), "dinero")}, ${Number(propio) >= est.valor ? "por encima" : "por debajo"}` : "") + ". Confírmelo en el pliego: si trae la cifra, esa es la que vale.";
        if (plE) x.suyo = plE.valor != null ? fmtValor(Number(plE.valor), "dinero") : null;
        else if (tieneSuyo) x.suyo = fmtValor(Number(propio), "dinero");
      } else if (e.clave === "capital_trabajo" && capitalTrabajo && capitalTrabajo.nota && !sinLectura) {
        /* sin estimado (otra modalidad, otro tipo, por lotes o sin plazo), el capital de trabajo
           sin cifra dice POR QUÉ: el pliego no lo declara, su fórmula no se pudo leer, o falta el
           plazo o el presupuesto para aplicarla (lib/capital_trabajo) */
        x.nota = capitalTrabajo.nota;
        if (capitalTrabajo.cita) { x.cita = capitalTrabajo.cita; x.documento = capitalTrabajo.documento || null; x.pagina = capitalTrabajo.pagina == null ? null : capitalTrabajo.pagina; }
      }
      cierra(x);
      continue;
    }
    const x = { ...base, exige: h.valor_legible || null, exige_valor: h.valor == null ? null : h.valor, tipo_valor: h.tipo_valor || null,
      documento: h.documento || null, pagina: h.pagina == null ? null : h.pagina, cita: h.cita || null, cambiado_por_adenda: !!h.cambiado_por_adenda, valor_anterior: h.valor_anterior_legible || null };
    if (tieneSuyo && h.tipo_valor) x.suyo = fmtValor(Number(propio), h.tipo_valor);
    /* la experiencia: el MISMO contrato que juzgó la regla (por su porcentaje), no el valor total inscrito */
    if (h.experiencia_sumada && h.experiencia_sumada.mayor_contrato_smmlv != null && h.tipo_valor) x.suyo = fmtValor(h.experiencia_sumada.mayor_contrato_smmlv, h.tipo_valor);
    /* la regla de cumplimiento ya la aplicó lib/documentos_proceso con cumpleRequisito (lib/diff): aquí solo se traduce */
    x.estado = h.estado === "cumple" ? (e.nunca_cumple ? "revisar" : "cumple") : h.estado === "no_cumple" ? "no_cumple" : "revisar";
    /* la experiencia: el texto de lib/documentos_proceso ya dice con cuántos contratos se llega o no (27-sep-2026, R-02) */
    x.nota = e.nunca_cumple
      ? (h.experiencia_sumada && h.estado !== "cumple" ? h.texto : h.confirmar ? h.texto : "La cifra es la del pliego; el tipo de obra y las condiciones para acreditarla también las fija él: léalas.")
      : h.estado === "cumple" ? "Su cifra cumple lo que exige el documento." : h.estado === "no_cumple" ? "Su cifra no llega: verifíquelo en su registro de proponente y en el pliego antes de descartarse."
        // «por confirmar» no es «falta su cifra»: una lectura con OCR, una fila con varias cifras o la tabla de Mipyme sin el tamaño en el registro (27-sep-2026)
        : h.confirmar ? h.texto : "La aplicación no tiene esa cifra de su empresa: cárguela en «Mi empresa» o compárela con su registro.";
    // la cifra calculada con la fórmula del pliego dice la fórmula y con qué anticipo se calculó
    if (h.calculado_con_formula) x.nota = h.texto;
    /* UN CONSORCIO (27-sep-2026, N21): la cifra y el juicio son los de la fórmula del pliego, o
       los de las tres fórmulas si no la declara (lib/reparto.casillaFinancieraPlural); la de la
       suma del perfil no se enseña como «la suya» si el pliego pondera */
    let propioCasilla = tieneSuyo ? Number(propio) : null;
    if (h.plural) {
      propioCasilla = h.plural.valor != null && Number.isFinite(Number(h.plural.valor)) ? Number(h.plural.valor) : null;
      x.suyo = propioCasilla != null && h.tipo_valor ? fmtValor(propioCasilla, h.tipo_valor) : null;
      x.nota = h.texto;
      x.formula_consorcio = h.plural.metodo_leido || null;
    }
    if (e.clave === "experiencia_general" && clavePrimera === "requisito_experiencia_smmlv") x.nota = `El documento no dice en esa línea si es la general o la específica. ${x.nota}`;
    x.accion = accionDeCasilla(x, h, propioCasilla, idProceso, fmtValor);
    cierra(x);
  }
  return salida;
}
/* ── de la casilla en rojo al socio que la cubre (6-sep-2026, M-COMP-02) ──
   Una casilla con cifra que NO cumple lleva la acción que puede cubrirla: un
   consorcio (Ley 80 art. 7: los integrantes suman experiencia y capacidad; los
   indicadores suman los balances de todos, pliego tipo, lib/perfiles.derivarPlural). `diferencia` es la
   MISMA resta que decidió el estado —`cumpleRequisito` de lib/diff comparó la
   cifra propia con la exigida en el sentido del requisito— y viaja CRUDA (decide)
   con su forma legible al lado (muestra). Aquí no se calcula si un socio
   alcanza: eso lo responde op=consorcio-simular con el proceso, que vuelve a
   pasar estas ocho casillas con el perfil derivado del consorcio por esta misma
   función. Ninguna casilla promete «se puede subsanar»: ningún documento leído
   lo afirma con página, y afirmarlo sin fuente es inventar una regla. */
function accionDeCasilla(x, h, propio, idProceso, fmtValor) {
  if (x.estado !== "no_cumple" || !h || h.valor == null || propio == null || !Number.isFinite(propio)) return null;
  const { REQUISITOS } = require("./diff.js");
  const req = REQUISITOS.find((r) => r.id === h.requisito) || null;
  const sentido = req && req.sentido === "max" ? "max" : "min";
  /* la experiencia: lo que falta es sobre lo que SUMAN sus mayores contratos,
     no sobre el mayor solo (27-sep-2026, R-02). Sin la lista, la aplicación
     no sabe cuánto suman y no pone cifra. */
  const sumada = h.experiencia_sumada || null;
  if (sumada && !(sumada.medida === "segmento72" && sumada.suman_smmlv != null)) return { tipo: "consorcio", proceso: idProceso, sentido, diferencia: null, diferencia_legible: null, frase: "Un socio puede aportar la experiencia que le falta." };
  const diferencia = sumada ? Number(h.valor) - sumada.suman_smmlv : sentido === "max" ? propio - Number(h.valor) : Number(h.valor) - propio;
  const legible = fmtValor(diferencia, h.tipo_valor);
  return {
    tipo: "consorcio", proceso: idProceso, sentido, diferencia, diferencia_legible: legible,
    frase: sentido === "max"
      ? `Se pasa ${legible} de lo que permite el pliego: con un socio que tenga la cifra baja, la del consorcio sale de sumar los balances de los dos y puede quedar dentro.`
      : `Le falta ${legible} para lo que exige el pliego: un socio puede aportarla.`,
  };
}
function resumenExigencias(lista) {
  const cuenta = (s) => lista.filter((x) => x.estado === s).length;
  const conCifra = lista.filter((x) => x.exige != null && !x.estimado).length;   // un estimado no es una cifra leída del pliego
  const nc = cuenta("no_cumple"), ok = cuenta("cumple"), porLeer = cuenta("por_leer");
  const frase = porLeer === lista.length ? "Las cifras del pliego aparecen aquí cuando termine de leerse."
    : !conCifra ? "Ningún documento leído trae estas cifras en una línea: búsquelas en el pliego."
      : nc ? `${nc} ${plural(nc, "cifra", "cifras")} del pliego que hoy no cumple.`
        : `${conCifra} de ${lista.length} cifras leídas del pliego${ok ? `, ${ok} ${plural(ok, "cumplida", "cumplidas")}` : ""}.`;
  return { total: lista.length, con_cifra: conCifra, cumple: ok, no_cumple: nc, revisar: cuenta("revisar"), por_leer: porLeer, sin_dato: cuenta("sin_dato"), frase };
}

/* ── el bloque «documentos»: qué se leyó, qué falta, qué no se puede leer ─── */
/* cuándo vuelve a intentar solo un escaneo que el OCR no atendió (lib/documentos_proceso
   .reintentoTrasSaturacion); ya vencido, el documento está en «por leer» y no aquí */
function cuandoReintenta(x, ahoraMs) {
  const min = Math.ceil((Date.parse(x.reintentar_desde) - ahoraMs) / 60000);
  if (!(min > 0)) return null;
  const h = Math.round(min / 60);
  /* se lee al ENTRAR al expediente (la lista viaja sin guía: public/app.js), no al abrir la pestaña */
  return `la aplicación lo vuelve a intentar sola ${min === 1 ? "en un minuto" : min < 60 ? `en unos ${min} minutos` : h === 1 ? "en una hora" : `en unas ${h} horas`}, cuando usted abra este proceso`;
}
function bloqueDocumentos(docs, lectura, dicen, enlaceSecop, ahoraMs = Date.now()) {
  const archivos = docs && docs.indice && Array.isArray(docs.indice.archivos) ? docs.indice.archivos : [];
  const leidos = dicen.documentos || [];
  /* el que ya volvió a «por leer» no se repite aquí; uno vencido que salió del plan sí se queda */
  const enPendientes = new Set((lectura.pendientes || []).map((a) => a.id_documento));
  const ilegibles = Object.entries((docs && docs.ilegibles) || {}).filter(([id]) => !enPendientes.has(id)).map(([id, x]) => {
    const cuando = x && x.saturado === true ? cuandoReintenta(x, ahoraMs) : null;
    return { id_documento: id, nombre: x.nombre, tipo_legible: x.tipo_legible, motivo: cuando ? `${String(x.motivo || "").replace(/[.\s]+$/, "")}: ${cuando}.` : x.motivo, reintenta: !!cuando };
  });
  const noLegibles = archivos.filter((a) => a.de_la_entidad && !a.legible).map((a) => ({ nombre: a.nombre, tipo_legible: a.tipo_legible, motivo: a.motivo_ilegible, url: a.url }));
  const porLeer = (lectura.pendientes || []).map((a) => ({ id_documento: a.id_documento, nombre: a.nombre, tipo_legible: a.tipo_legible }));
  const adendas = archivos.filter((a) => a.tipo === "adenda").map((a) => ({ nombre: a.nombre, fecha: a.fecha_carga, leida: !!(docs && docs.leidos && docs.leidos[a.id_documento]) }));
  const tipos = [];
  for (const x of leidos) { const t = tipos.find((y) => y.tipo === x.tipo); if (t) t.n++; else tipos.push({ tipo: x.tipo, legible: x.tipo_legible, n: 1 }); }
  const tiposLegibles = tipos.map((t) => (t.n === 1 ? t.legible.toLowerCase() : `${t.n} ${t.legible.toLowerCase()}${/s$/.test(t.legible) ? "" : "s"}`)).join(", ");
  const nL = leidos.length, nP = porLeer.length, nI = ilegibles.length, nN = noLegibles.length
  const nR = ilegibles.filter((x) => x.reintenta).length;   // escaneos que el OCR no atendió y se reintentan solos
  const nC = leidos.filter((x) => x.recortado).length;
  const nO = leidos.filter((x) => x.origen === "ocr").length;
  const frase = lectura.estado === "sin_indice" ? "La aplicación busca los documentos de este proceso en SECOP II y los lee sola: en un momento verá aquí lo que dicen."
    : lectura.estado === "sin_archivos" ? `${lectura.motivo || "SECOP II no publica un índice de archivos para este proceso."} Cargue el pliego usted y la guía lo leerá.`
      : lectura.estado === "por_leer" && !nP && lectura.por_actualizar ? `${nL} ${plural(nL, "documento leído", "documentos leídos")}; lo que dicen se está actualizando con las reglas nuevas de lectura.`
      : lectura.estado === "por_leer" ? `${nL ? `${nL} ${plural(nL, "documento leído", "documentos leídos")} y ` : ""}${nP} por leer: se leen solos mientras esta pestaña esté abierta.`
        : `${nL} ${plural(nL, "documento leído", "documentos leídos")}${tiposLegibles ? ` (${tiposLegibles})` : ""}${nC ? `; ${nC === 1 ? "uno es tan largo que se leyó" : `${nC} son tan largos que se leyeron`} solo hasta donde dice la lista` : ""}${nO ? `; ${nO === 1 ? "uno es un escaneo leído" : `${nO} son escaneos leídos`} con reconocimiento de texto: confirme sus cifras en el documento` : ""}${nI - nR ? `; ${nI - nR} no se ${plural(nI - nR, "pudo", "pudieron")} leer (escaneados o sin texto)` : ""}${nR ? `; ${nR === 1 ? "un escaneo espera" : `${nR} escaneos esperan`} porque el servicio de reconocimiento de texto no está atendiendo: se ${plural(nR, "vuelve a intentar solo", "vuelven a intentar solos")}` : ""}${nN ? `; ${nN} no ${plural(nN, "legible", "legibles")} (hojas de cálculo, comprimidos u otros formatos): ábralos en SECOP II` : ""}.`;
  return { estado: lectura.estado, frase, consultado_el: lectura.consultado_el, publicados: lectura.publicados, leidos, por_leer: porLeer, ilegibles, no_legibles: noLegibles, adendas,
    de_proponentes: archivos.filter((a) => !a.de_la_entidad).length, enlace_secop: enlaceSecop };
}

module.exports = { guiaDe, exigenciasDe, resumenExigencias, accionDeCasilla, modalidadEnLlano, comoSeGanaElPrecio, tamanoDe, filaDesdeFoto, ESTADOS_REQUISITO, ESTADOS_EXIGENCIA, EXIGENCIAS, REQUISITOS_CON_SOCIO, CONTRIBUCION_OBRA_PCT, GARANTIA_SERIEDAD_PCT, REFERENCIA_FINANCIERA, VERSION };
