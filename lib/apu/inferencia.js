/* ============================================================================
   lib/apu/inferencia · Del objeto contractual a los ítems que llevaría su APU
   ----------------------------------------------------------------------------
   El MOTOR. Los datos que consume viven en lib/apu/catalogo.js (semillas) y en
   Redis (`apu:mapeo_unspsc`, `apu:diccionario_terminos`), igual que
   lib/semantica.js es vocabulario y lib/filtros.js es juicio.

     inferirItems(objeto, unspsc, departamento, opts)
       → [{ item_id, descripcion, unidad, cantidad_sugerida, confianza, … }]

   ── Las dos rutas y cómo se combinan ─────────────────────────────────────
   1. UNSPSC → ítems, peso base 0.7. Se busca del prefijo más específico al más
      general (clase → familia → segmento), leyendo el NIVEL con
      `lib/unspsc.normalizarCodigo` — nunca con un `slice` a mano, que sería una
      segunda definición de «familia» conviviendo con la del repositorio.
   2. TEXTO → ítems, peso adicional 0.3. El objeto se normaliza (sin tildes,
      ñ→n, minúsculas), se tokeniza con las stopwords de lib/experiencia y se
      generan n-gramas; cada n-grama se busca en el diccionario.

   confianza = 0.7 × especificidad_unspsc + 0.3 × fuerza_texto, tope 1.
   Entra al resultado quien llegue a 0.3 (UMBRAL), comparado con «≥».

   ── Tres decisiones que parecen detalles y no lo son ─────────────────────

   · **El «≥» del umbral no es negociable.** El encargo fija texto = 0.3 y
     umbral = 0.3. Con «>» un proceso reconocido SOLO por su texto —con el
     término más inequívoco del diccionario, «placa huella», peso 1— daría
     exactamente 0.30 y quedaría fuera por un empate. La ruta de texto entera
     moriría en silencio y el motor parecería «no encontrar nada» justo en los
     objetos que mejor entiende.

   · **La especificidad GRADÚA el 0.7; no lo sustituye.** Una clase (6 dígitos)
     vale el 0.7 completo, la familia 0.9 de ese peso y el segmento 0.7. En
     `lib/unspsc` está PROHIBIDO subir el emparejamiento hasta el segmento
     porque ahí se decide si el dueño está HABILITADO y «72» casaría
     «servicios de construcción» con cualquier cosa. Aquí no se habilita nada:
     se sugiere qué ítems revisar, con casilla para desmarcarlos, así que el
     segmento sirve —como en lib/indice_baja, que lo usa para AGRUPAR— pero
     entra valiendo menos. La diferencia entre las dos situaciones es lo que
     está en juego, y por eso la regla no es la misma.

   · **La fuerza del texto es un OR RUIDOSO, no una suma.** `1 − Π(1 − peso)`:
     dos términos flojos se refuerzan sin poder superar nunca a uno decisivo, y
     ningún objeto largo puede acumular confianza a base de repetir vaguedades.
     Sumar dejaría que seis términos de peso 0.2 valieran más que «alcantarillado».

   ── La consecuencia del umbral que NO hay que «arreglar» ─────────────────
   Como el techo de la ruta de texto es 0.3 y el umbral es 0.3, por TEXTO SOLO
   pasan únicamente los términos DECISIVOS (peso 1): `0.3 × fuerza ≥ 0.3` exige
   fuerza = 1, y ni siquiera dos términos de peso 0.9 juntos llegan (0.297).
   Parece un efecto colateral y es la regla que se quiere: sin código UNSPSC el
   objeto es la única evidencia, y el repositorio ya decidió una vez —para la
   ruta de texto del juicio del RUP— que ahí un 🟡 no es evidencia de nada. Los
   términos flojos no son inútiles: en cuanto hay un código delante, aportan
   sobre esos 0.63-0.7 y mueven el orden, que es justo para lo que están. Si
   algún día se quiere que un término de 0.9 sugiera por sí solo, lo que hay
   que mover es SU PESO en el diccionario —dato, discutible, auditable— y no el
   umbral, que es lo que sostiene que la lista no se llene de ruido.

   ── La cantidad SIEMPRE es null, y eso es el resultado ───────────────────
   `cantidad_sugerida: null` en todas las filas, siempre. No es un hueco por
   llenar más adelante: sin el pliego —sin planos, sin cantidades de obra, sin
   el formulario 1— no hay forma de estimar cuántos m³ de excavación lleva una
   vía, y `p6dx-8zbt` no publica nada de eso. Es la misma regla que ya gobierna
   `anticipo_pct = 0` («sin dato», no «sin anticipo») y el contador de oferentes
   («0 = sin dato», no «nadie se presentó»): un número inventado se ve igual que
   un número medido, y quien lo lea no puede distinguirlos. El campo viaja
   explícito, con `cantidad_sugerida_motivo` al lado, para que la ausencia sea
   una afirmación y no un olvido.

   ── El departamento ──────────────────────────────────────────────────────
   Se acepta, se normaliza y se DEVUELVE, pero NO cambia qué ítems se sugieren,
   y conviene decirlo en voz alta en vez de dejar un parámetro decorativo: la
   geografía no cambia el hecho de que una placa huella lleve concreto y acero
   —cambia lo que cuestan—. Es el gancho de la Fase 3 (regionalización de
   precios: el módulo APU anterior a la reescritura ya traía índice por ciudad,
   y el ICOCIV del DANE ajusta por tipología). Inventar aquí una diferencia
   regional de ALCANCE sería fabricar información que nadie midió.

   ── Redis manda, el código respalda ──────────────────────────────────────
   Las dos tablas se leen de Redis y, si no hay nada publicado o Redis no
   responde, se usan las semillas del catálogo. NUNCA se lanza: quedarse sin
   conocimiento dejaría el motor mudo, que es exactamente lo que `lib/perfiles`
   evita conservando `PERFILES_FALLBACK`.
   ========================================================================== */
"use strict";

const { norm, BLACKLIST_OBJETO } = require("../semantica.js");
const { tokenizar } = require("../experiencia.js");
const { normalizarCodigo, extraerCodigos } = require("../unspsc.js");
const { CATALOGO, CAPITULOS, item, MAPEO_UNSPSC_SEMILLA, DICCIONARIO_SEMILLA } = require("./catalogo.js");

/* ══════════════════ 1 · Claves y constantes ══════════════════ */

const CLAVES_APU = {
  mapeo: "apu:mapeo_unspsc",
  diccionario: "apu:diccionario_terminos",
  version: "apu:conocimiento:version",
};

const PESO_UNSPSC = 0.7;          // encargo
const PESO_TEXTO = 0.3;           // encargo
const UMBRAL = 0.3;               // encargo — comparado con «≥» (ver cabecera)

/* Cuánto del 0.7 se lleva cada nivel de código. Un producto o una clase son el
   código tal cual lo publicó la entidad; la familia y el segmento son lecturas
   cada vez más amplias del mismo. */
const ESPECIFICIDAD = { producto: 1, clase: 1, familia: 0.9, segmento: 0.7 };

const MAX_ITEMS = 40;             // tope de filas devueltas (se informa si recorta)
const MAX_OBJETO = 2000;          // caracteres del objeto que se analizan
const MAX_MOTIVOS = 6;            // términos/códigos que se citan por ítem
/* Mayor n-grama que se genera, y por tanto el término más largo que puede
   casar. Es UN solo número a propósito: si el generador y el compilador del
   diccionario tuvieran topes distintos, habría términos aceptados que no
   casarían jamás — muertos y en silencio. */
const MAX_NGRAMA = 6;

/* Derivación desde el histórico */
const PESO_DERIVADO = 0.4;        // estadística, no oficio: pesa menos que la semilla
const BONO_EXPERIENCIA = 0.1;     // corroborado por los contratos del dueño
const PESO_DERIVADO_MAX = 0.6;
const MIN_SOPORTE = 8;            // procesos en que el término acompaña al ítem
const LIFT_MIN = 2;               // veces sobre la frecuencia base del término
const MAX_TERMINOS_DERIVADOS = 400;   // términos NUEVOS que se añaden al diccionario
/* Cuántos términos distintos se siguen a la vez durante la derivación. Es un
   tope de MEMORIA, no de calidad: acota el «ítem → (término → n)», que es lo
   único que crece con el tamaño del histórico. Lo que se recorta se informa. */
const MAX_TERMINOS_SEGUIDOS = 20000;

/* Tope por valor de Upstash (lib/redis lo documenta). Las dos tablas van SIN
   comprimir a propósito: son pequeñas y se leen en cada petición sin token de
   por medio, así que la legibilidad desde la consola de Upstash —poder abrir la
   clave y ver qué término manda— vale más que los KB que ahorraría el deflate. */
const TOPE_VALOR_REDIS = 1024 * 1024;

/* ══════════════════ 2 · Normalización de las dos tablas ══════════════════ */

/* Un término del diccionario se escribe como se dice («pozo de inspección»)
   pero se compara como se tokeniza («pozo inspeccion»): el tokenizador quita
   las stopwords, así que un n-grama del objeto JAMÁS contendría el «de». Sin
   esta canonicalización, todas las entradas con preposición serían letra
   muerta — nunca casarían con nada y nadie lo notaría. */
const canonizar = (termino) => tokenizar(termino).join(" ");

/* Diccionario crudo (semilla o Redis) → estructura de consulta.
   Se conserva `etiqueta` (el término tal como se escribió) porque es lo que se
   le enseña al usuario como motivo: «pozo inspeccion» no se lee igual de bien. */
function compilarDiccionario(crudo) {
  const mapa = new Map();
  let descartados = 0, maxTokens = 1;
  for (const [termino, valor] of Object.entries(crudo || {})) {
    const items = Array.isArray(valor) ? valor : (valor && valor.items) || [];
    const validos = items.filter((id) => item(id));   // un id fantasma no puede puntuar

    /* El peso AUSENTE vale 1 (es la forma abreviada `termino: [items]`), pero un
       peso PRESENTE y disparatado —0, negativo, `"mucho"`— NO puede convertirse
       en 1, que es el máximo: un término mal escrito acabaría pesando más que
       uno curado a conciencia. Se descarta y se cuenta. */
    const declarado = !Array.isArray(valor) && valor && valor.peso !== undefined;
    const pesoBruto = declarado ? Number(valor.peso) : 1;
    if (declarado && !(Number.isFinite(pesoBruto) && pesoBruto > 0)) { descartados++; continue; }
    const peso = Math.min(1, pesoBruto);

    const clave = canonizar(termino);
    if (!clave || !validos.length) { descartados++; continue; }

    /* Un término más largo que el mayor n-grama que se genera NO casaría jamás:
       entraría al diccionario, ocuparía sitio y no puntuaría nunca — muerto y en
       silencio, que es la misma forma de fallar que la trampa de las
       preposiciones. Se descarta y se cuenta. */
    const n = clave.split(" ").length;
    if (n > MAX_NGRAMA) { descartados++; continue; }
    if (n > maxTokens) maxTokens = n;
    const previo = mapa.get(clave);
    if (previo) {
      // dos redacciones del mismo término: gana el peso mayor y se unen los ítems
      previo.peso = Math.max(previo.peso, peso);
      for (const id of validos) if (!previo.items.includes(id)) previo.items.push(id);
      if (valor && valor.origen && !previo.origen.includes(valor.origen)) previo.origen.push(valor.origen);
      continue;
    }
    mapa.set(clave, {
      etiqueta: String(termino), peso, items: [...new Set(validos)],
      origen: [(valor && valor.origen) || "semilla"],
    });
  }
  return { mapa, descartados, maxTokens };
}

/* Mapeo crudo → Map de prefijo significativo → ítems válidos. Las claves se
   validan: «7214» sirve, «abc» o «7» no, y un prefijo impar se descarta
   contado en vez de emparejar a medias. */
function compilarMapeo(crudo) {
  const mapa = new Map();
  let descartados = 0;
  for (const [prefijo, items] of Object.entries(crudo || {})) {
    const p = String(prefijo).trim();
    if (!/^\d+$/.test(p) || p.length % 2 !== 0 || p.length > 8) { descartados++; continue; }
    const validos = [...new Set((Array.isArray(items) ? items : []).filter((id) => item(id)))];
    if (!validos.length) { descartados++; continue; }
    mapa.set(p, validos);
  }
  return { mapa, descartados };
}

/* ══════════════════ 3 · Conocimiento: Redis manda, el código respalda ══════════════════ */

async function leerJSONSuave(redis, clave) {
  try {
    const crudo = await redis.get(clave);
    if (!crudo) return null;
    const v = typeof crudo === "string" ? JSON.parse(crudo) : crudo;
    return v && typeof v === "object" ? v : null;
  } catch {
    return null;   // Redis caído o valor corrupto: se usa la semilla, no se lanza
  }
}

/* Las tablas TAL CUAL están publicadas (sin compilar), con la semilla como
   respaldo. Es la fuente de verdad de «lo vigente» para quien va a MODIFICARLO
   —derivar y publicar—, mientras que `leerConocimiento` devuelve la versión
   compilada, que es la que sirve para CONSULTAR. Separarlas evita el error de
   intentar reconstruir el JSON original a partir de los Map compilados. */
async function leerConocimientoCrudo(redis) {
  const [mapeoRedis, dicRedis, version] = redis
    ? await Promise.all([
      leerJSONSuave(redis, CLAVES_APU.mapeo),
      leerJSONSuave(redis, CLAVES_APU.diccionario),
      leerJSONSuave(redis, CLAVES_APU.version),
    ])
    : [null, null, null];

  const hayMapeo = !!(mapeoRedis && Object.keys(mapeoRedis).length);
  const hayDic = !!(dicRedis && Object.keys(dicRedis).length);
  return {
    mapeo: hayMapeo ? mapeoRedis : MAPEO_UNSPSC_SEMILLA,
    diccionario: hayDic ? dicRedis : DICCIONARIO_SEMILLA,
    origen: { mapeo: hayMapeo ? "redis" : "semilla", diccionario: hayDic ? "redis" : "semilla" },
    version: (version && version.version) || null,
  };
}

/* Devuelve SIEMPRE algo utilizable. `origen` dice de dónde salió cada tabla,
   porque «el motor no sugirió nada» tiene dos causas muy distintas: el objeto
   no se parece a nada, o nadie publicó el conocimiento todavía. */
async function leerConocimiento(redis) {
  const crudo = await leerConocimientoCrudo(redis);
  const mapeo = compilarMapeo(crudo.mapeo);
  const diccionario = compilarDiccionario(crudo.diccionario);

  return {
    mapeo: mapeo.mapa,
    diccionario: diccionario.mapa,
    maxTokens: diccionario.maxTokens,
    origen: crudo.origen,
    descartados: { mapeo: mapeo.descartados, diccionario: diccionario.descartados },
    version: crudo.version,
  };
}

/* Publica las dos tablas. El SELLO va AL FINAL y lleva sufijo aleatorio además
   del ISO: dos publicaciones en el mismo milisegundo darían el mismo sello y la
   segunda pasaría desapercibida (misma lección que el sello del RUP).

   LA TABLA QUE NO SE PASA NO SE TOCA — y «no tocar» significa conservar lo
   PUBLICADO, no reescribir la semilla encima. Es un defecto que ya estuvo aquí:
   `?derivar=true` publica solo el diccionario, y con el respaldo en código como
   valor por defecto eso revertía `apu:mapeo_unspsc` a la semilla, borrando en
   silencio lo que el dueño hubiera editado. Contradecía las tres reglas a la
   vez —«Redis manda, el código respalda», «lo derivado se MEZCLA, jamás
   sustituye» y la carga parcial del RUP («subir solo Génesis conserva a
   Helder»)— y dejaba sin sentido el propio mensaje del GET, que invita a editar
   la tabla en Redis. La semilla solo entra cuando NO hay nada publicado. */
async function publicarConocimiento(redis, { mapeo, diccionario, nota = null } = {}) {
  const vigente = await leerConocimientoCrudo(redis);
  const m = mapeo && Object.keys(mapeo).length ? mapeo : vigente.mapeo;
  const d = diccionario && Object.keys(diccionario).length ? diccionario : vigente.diccionario;

  /* Upstash no acepta más de 1 MB por valor. Hoy no se llega ni de lejos —la
     semilla son 12 KB y el peor caso con los 400 derivados del tope son ~257
     KB—, pero el que se pase un día lo haría contra un error de Upstash sin
     contexto, y con el sello ya escrito o a medias. Se comprueba antes de la
     primera escritura, y se falla diciendo qué pasó y cuál es la palanca. */
  const cuerpos = [JSON.stringify(m), JSON.stringify(d)];
  for (const [i, cuerpo] of cuerpos.entries()) {
    const bytes = Buffer.byteLength(cuerpo, "utf8");
    if (bytes > TOPE_VALOR_REDIS) {
      throw new Error(`el ${i === 0 ? "mapeo" : "diccionario"} ocupa ${Math.round(bytes / 1024)} KB y el `
        + `tope por valor de Upstash es ${Math.round(TOPE_VALOR_REDIS / 1024)} KB. `
        + "Baje MAX_TERMINOS_DERIVADOS o suba LIFT_MIN antes de volver a derivar.");
    }
  }

  await redis.set(CLAVES_APU.mapeo, cuerpos[0]);
  await redis.set(CLAVES_APU.diccionario, cuerpos[1]);
  const version = `${new Date().toISOString()}-${Math.random().toString(36).slice(2, 8)}`;
  await redis.set(CLAVES_APU.version, JSON.stringify({
    version, nota,
    claves_mapeo: Object.keys(m).length,
    terminos: Object.keys(d).length,
  }));
  return { version, claves_mapeo: Object.keys(m).length, terminos: Object.keys(d).length };
}

/* Siembra idempotente: deja en Redis exactamente lo que hay en el catálogo. */
const sembrarConocimiento = (redis, nota = "semilla del catálogo") =>
  publicarConocimiento(redis, { mapeo: MAPEO_UNSPSC_SEMILLA, diccionario: DICCIONARIO_SEMILLA, nota });

/* ══════════════════ 4 · Texto → n-gramas ══════════════════ */

/* n-gramas de 1 hasta `maxN` sobre el flujo de tokens YA filtrado (sin
   stopwords, sin tokens con dígitos: «2024» y «cm001» son el número del
   proceso, no el trabajo — la misma lección de lib/experiencia).
   `maxN` sale del diccionario en uso y no de una constante: si alguien añade
   un término de cuatro palabras, seguirá pudiendo casar en vez de quedar
   muerto sin que nadie se entere. El encargo pide bigramas y trigramas, que
   quedan incluidos por construcción. */
function ngramas(texto, maxN = 3) {
  /* El corte por longitud se lleva la ÚLTIMA palabra entera, no hasta el
     carácter 2000: partirla fabricaría un token que el objeto no contiene
     («…PAVIMENTA» de «PAVIMENTACIÓN») y ese token podría casar con un término
     del diccionario. Es un dato inventado, aunque sea uno pequeño. */
  const bruto = String(texto || "");
  let recortado = bruto.slice(0, MAX_OBJETO);
  if (bruto.length > MAX_OBJETO && !/\s/.test(bruto[MAX_OBJETO])) {
    recortado = recortado.replace(/\S+$/, "");
  }
  const tokens = tokenizar(recortado);
  const tope = Math.max(1, Math.min(MAX_NGRAMA, maxN));
  const salida = new Map();       // n-grama → veces
  for (let n = 1; n <= tope; n++) {
    for (let i = 0; i + n <= tokens.length; i++) {
      const g = tokens.slice(i, i + n).join(" ");
      salida.set(g, (salida.get(g) || 0) + 1);
    }
  }
  return { tokens, gramas: salida };
}

/* ══════════════════ 5 · UNSPSC → ítems ══════════════════ */

/* Prefijos de un código, del más específico al más general.

   El nivel se LEE de lib/unspsc (`tipo`: producto/clase/familia/segmento) y de
   ahí sale también CUÁNTOS prefijos existen. Emitirlos siempre los cuatro sería
   inventar: un código de familia como «72140000» tiene `clase = "721400"`, que
   es el relleno con ceros del propio nivel y NO una clase que exista. Buscarla
   no rompe nada hoy —simplemente no casa— pero etiquetaría como «clase» una
   coincidencia de familia el día que alguien añadiera esa llave al mapeo, y el
   motivo que se le enseña al usuario diría una cosa por otra.

   OJO: `c.nivel` es un NÚMERO (8/6/4/2) y `c.tipo` la cadena. Compararlo con
   una cadena da `false` siempre y en silencio. */
const PREFIJOS_POR_TIPO = {
  producto: (c) => [
    { prefijo: c.codigo, nivel: "producto" },
    { prefijo: c.clase, nivel: "clase" },
    { prefijo: c.familia, nivel: "familia" },
    { prefijo: c.segmento, nivel: "segmento" },
  ],
  clase: (c) => [
    { prefijo: c.clase, nivel: "clase" },
    { prefijo: c.familia, nivel: "familia" },
    { prefijo: c.segmento, nivel: "segmento" },
  ],
  familia: (c) => [
    { prefijo: c.familia, nivel: "familia" },
    { prefijo: c.segmento, nivel: "segmento" },
  ],
  segmento: (c) => [{ prefijo: c.segmento, nivel: "segmento" }],
};

function prefijosDe(codigo) {
  const c = normalizarCodigo(codigo);
  if (!c) return null;
  const construir = PREFIJOS_POR_TIPO[c.tipo];
  if (!construir) return null;
  return { codigo: c, niveles: construir(c) };
}

/* ══════════════════ 6 · El motor ══════════════════ */

/* `inferirItems(objeto, unspsc, departamento, opts)`

   - objeto        texto del objeto contractual (obligatorio en la práctica: sin
                   él y sin código no hay nada que inferir).
   - unspsc        código de 2/4/6/8 dígitos, o texto del que se extraiga uno
                   («V1.72141000» incluido — llega así en el dataset).
   - departamento  se normaliza y se devuelve; NO altera los ítems (ver cabecera).
   - opts.redis    cliente de Redis; sin él se usan las semillas.
   - opts.conocimiento  tablas ya leídas (para no releer Redis en un bucle).

   Es `async` porque leer el conocimiento lo es. Con `opts.conocimiento` dado no
   toca la red. */
async function inferirItems(objeto, unspsc = null, departamento = null, opts = {}) {
  /* `opts.conocimiento` es la escotilla para no releer Redis en un bucle. Se
     completa en vez de confiar en que venga entero: un llamante que pase solo
     `{diccionario}` reventaría con un TypeError dentro del motor, y el mensaje
     no diría nada sobre lo que de verdad faltó. */
  const dado = opts.conocimiento;
  const conocimiento = dado
    ? {
      mapeo: dado.mapeo instanceof Map ? dado.mapeo : new Map(),
      diccionario: dado.diccionario instanceof Map ? dado.diccionario : new Map(),
      maxTokens: Number.isFinite(dado.maxTokens) && dado.maxTokens > 0 ? dado.maxTokens : 3,
      origen: dado.origen || { mapeo: "dado", diccionario: "dado" },
      descartados: dado.descartados || { mapeo: 0, diccionario: 0 },
      version: dado.version || null,
    }
    : await leerConocimiento(opts.redis || null);
  const textoObjeto = String(objeto == null ? "" : objeto).slice(0, MAX_OBJETO);

  /* Los códigos se normalizan ANTES de las puertas porque una de ellas
     —anti-suministro— los necesita para decidir. */
  const crudos = [];
  if (Array.isArray(unspsc)) crudos.push(...unspsc);
  else if (unspsc != null && String(unspsc).trim()) crudos.push(unspsc);

  const codigosNorm = [];        // objetos de lib/unspsc.normalizarCodigo
  const codigosLeidos = [];      // {codigo, nivel} para el diagnóstico
  let codigoInvalido = null;
  for (const crudo of crudos) {
    const s = String(crudo).trim();
    // «V1.72141000», «72141000», o varios en un mismo campo
    const candidatos = /^\d+$/.test(s) ? [s] : extraerCodigos(s).codigos.map((c) => c.codigo);
    if (!candidatos.length) { codigoInvalido = codigoInvalido || s; continue; }
    for (const cand of candidatos) {
      const p = prefijosDe(cand);
      if (!p) { codigoInvalido = codigoInvalido || cand; continue; }
      codigosNorm.push(p);
      codigosLeidos.push({ codigo: p.codigo.codigo, nivel: p.codigo.tipo });
    }
  }

  /* ── Puerta de PERTINENCIA, reutilizando la regla que ya existe ──────────
     Defecto encontrado sobre el corpus real: «PRESTACIÓN DEL SERVICIO DE
     INTERNET DEDICADO», publicado con un código del segmento 80 (gerencia),
     sugería «interventoría». No es un fallo del mapeo: el 80 está en los RUP
     porque ahí viven la gerencia de proyectos y la interventoría, y es
     exactamente el agujero por el que ya se colaron impresión, alimentos e
     internet en el juicio del RUP.

     La respuesta correcta no es una lista de exclusiones nueva —serían dos
     definiciones de «esto no es obra» divergiendo a la primera corrección—
     sino LLAMAR a `evaluarPertinencia`, que es la regla que el repositorio ya
     discutió y probó. Rojo (bloqueante, genérico o término no pertinente sin
     un solo verbo de obra) ⇒ ningún ítem.

     Solo se juzga cuando HAY texto: si el llamante manda un código a secas, no
     hay objeto que evaluar, y tratar esa ausencia como «no pertinente» sería
     cerrar por ignorancia — la regla de faltantes de las cuatro puertas dice
     justo lo contrario (un dato ausente no vale 0 ni 1). */
  if (textoObjeto.trim()) {
    const { evaluarPertinencia } = require("../filtros.js");

    /* La BLACKLIST heredada va primero y se compara sobre el texto CRUDO (lleva
       [oó] y flag `i`): cambiarle la base de comparación sería una regresión
       silenciosa, y así está escrito en la memoria del proyecto. Hace falta
       aquí porque la pertinencia NO la cubre: «ADQUISICIÓN DE CANINOS
       ANTINARCÓTICOS» no trae ningún término no pertinente de su lista, y en el
       corpus real viene publicada con un 72141000 —código de vías— que le
       regalaría un APU de carretera entero. */
    const vetado = textoObjeto.match(BLACKLIST_OBJETO);
    if (vetado) {
      return {
        items: [], total: 0, recortados: 0,
        no_pertinente: {
          nivel: "rojo", tipo: "blacklist", termino: vetado[0],
          motivo: `objeto que ningún RUP de obra cubre («${vetado[0]}»)`,
        },
        diagnostico: {
          objeto_analizado: textoObjeto.length,
          departamento: departamento ? norm(departamento) : null,
          conocimiento: { origen: conocimiento.origen, version: conocimiento.version },
          motivo: `No es un objeto de obra («${vetado[0]}»). No se sugiere ningún ítem `
            + "aunque venga publicado con un código UNSPSC de construcción.",
        },
        cantidad_sugerida_motivo: "No aplica: el objeto no es de obra civil.",
      };
    }

    const textoNorm = norm(textoObjeto);
    const p = evaluarPertinencia(textoNorm, {});
    if (p.nivel === "rojo") {
      return {
        items: [], total: 0, recortados: 0,
        no_pertinente: { nivel: p.nivel, tipo: p.tipo, motivo: p.motivo, termino: p.termino || null },
        diagnostico: {
          objeto_analizado: textoObjeto.length,
          departamento: departamento ? norm(departamento) : null,
          conocimiento: { origen: conocimiento.origen, version: conocimiento.version },
          motivo: `El objeto no es de obra ni de consultoría de obra: ${p.motivo}. `
            + "No se sugiere ningún ítem aunque su código UNSPSC esté inscrito en el RUP.",
        },
        cantidad_sugerida_motivo: "No aplica: el objeto no es de obra civil.",
      };
    }

    /* Tercera puerta: ANTI-SUMINISTRO, otra vez la del repositorio y no una
       nueva. El mapeo cubre a propósito segmentos de BIENES (30 materiales, 40
       tubería, 26 eléctricos), porque un proceso de obra publicado con un 4017
       sí lleva tubería. El precio de esa cobertura es que una COMPRA PURA con
       el mismo código —«COMPRAVENTA DE TUBERÍA PVC», que la cascada de la app
       descarta— se llevaría aquí un APU de red de acueducto. `esSuministroPuro`
       ya distingue las dos cosas: solo dispara si NINGÚN código ancla obra
       (segmento ≥ 70 que no sea de servicios no constructivos) Y el texto es de
       adquisición sin ningún verbo de obra. Por eso «SUMINISTRO E INSTALACIÓN
       DE TUBERÍA» sigue pasando y «SUMINISTRO DE TUBERÍA» no. */
    const { esSuministroPuro } = require("../filtros.js");
    if (esSuministroPuro(textoNorm, codigosNorm.map((p2) => p2.codigo))) {
      return {
        items: [], total: 0, recortados: 0,
        no_pertinente: {
          nivel: "rojo", tipo: "suministro_puro", termino: null,
          motivo: "el objeto se redacta como una compra y ningún código ancla obra",
        },
        diagnostico: {
          objeto_analizado: textoObjeto.length,
          codigos_leidos: codigosLeidos,
          departamento: departamento ? norm(departamento) : null,
          conocimiento: { origen: conocimiento.origen, version: conocimiento.version },
          motivo: "Es un suministro, no una obra: se compra un bien y no se ejecuta ninguna "
            + "actividad. Un APU describe actividades, así que no hay ítems que sugerir.",
        },
        cantidad_sugerida_motivo: "No aplica: el objeto es un suministro, no una obra.",
      };
    }
  }

  /* --- ruta 1 · UNSPSC ---------------------------------------------------
     Los códigos ya vienen normalizados de arriba (la puerta anti-suministro los
     necesitaba). Aquí solo se puntúan. */
  const puntosUnspsc = new Map();   // item_id → {puntos, nivel, prefijo}
  for (const p of codigosNorm) {
    for (const { prefijo, nivel } of p.niveles) {
      const items = conocimiento.mapeo.get(prefijo);
      if (!items) continue;
      const puntos = PESO_UNSPSC * (ESPECIFICIDAD[nivel] || 0.7);
      for (const id of items) {
        const previo = puntosUnspsc.get(id);
        if (!previo || puntos > previo.puntos) puntosUnspsc.set(id, { puntos, nivel, prefijo });
      }
      break;   // el prefijo más específico que exista manda; no se acumula
    }
  }

  /* --- ruta 2 · texto ---------------------------------------------------- */
  const { tokens, gramas } = ngramas(textoObjeto, conocimiento.maxTokens);
  const golpes = new Map();         // item_id → [{etiqueta, peso}]
  const terminosVistos = [];
  for (const grama of gramas.keys()) {
    const entrada = conocimiento.diccionario.get(grama);
    if (!entrada) continue;
    terminosVistos.push({ termino: entrada.etiqueta, peso: entrada.peso, items: entrada.items.length });
    for (const id of entrada.items) {
      if (!golpes.has(id)) golpes.set(id, []);
      golpes.get(id).push({ etiqueta: entrada.etiqueta, peso: entrada.peso });
    }
  }

  /* --- combinar ---------------------------------------------------------- */
  const candidatos = new Set([...puntosUnspsc.keys(), ...golpes.keys()]);
  const filas = [];
  for (const id of candidatos) {
    const ficha = item(id);
    if (!ficha) continue;           // el id ya se validó al compilar; cinturón y tirantes

    const u = puntosUnspsc.get(id) || null;
    const lista = golpes.get(id) || [];
    // OR ruidoso: dos términos flojos se refuerzan, ninguno puede pasar de 1
    const fuerzaTexto = lista.length ? 1 - lista.reduce((acc, g) => acc * (1 - g.peso), 1) : 0;

    const puntosTexto = PESO_TEXTO * fuerzaTexto;
    const puntosCodigo = u ? u.puntos : 0;
    const confianza = Math.min(1, puntosCodigo + puntosTexto);
    if (confianza < UMBRAL) continue;   // «≥ UMBRAL» (ver cabecera: el empate cuenta)

    const motivos = [];
    if (u) motivos.push(`UNSPSC ${u.prefijo} (${u.nivel})`);
    for (const g of lista.slice(0, MAX_MOTIVOS)) motivos.push(`«${g.etiqueta}»`);

    filas.push({
      item_id: ficha.item_id,
      descripcion: ficha.descripcion,
      unidad: ficha.unidad,
      cantidad_sugerida: null,
      confianza: Math.round(confianza * 100) / 100,
      // --- contexto, no contrato: la tarjeta lo usa, el consumidor puede ignorarlo
      capitulo: ficha.capitulo,
      capitulo_nombre: (CAPITULOS[ficha.capitulo] || {}).nombre || ficha.capitulo,
      origen: u && lista.length ? "unspsc+texto" : (u ? "unspsc" : "texto"),
      motivos,
    });
  }

  /* orden: confianza ↓, luego el orden natural del presupuesto (capítulo) para
     que dos ítems empatados no salgan en un orden que cambia entre llamadas */
  filas.sort((a, b) => (b.confianza - a.confianza)
    || ((CAPITULOS[a.capitulo] || {}).orden || 99) - ((CAPITULOS[b.capitulo] || {}).orden || 99)
    || a.item_id.localeCompare(b.item_id));

  const recortados = Math.max(0, filas.length - MAX_ITEMS);
  const items = filas.slice(0, MAX_ITEMS);

  /* Una lista vacía tiene DOS causas distintas y un `[]` no las distingue: o el
     objeto no es de obra (y entonces ya se devolvió arriba, con su motivo), o
     es obra pero nada llegó al umbral. Lo segundo pasa de verdad —«ADECUACIÓN
     DE LA SEDE EDUCATIVA», sin código y con un término de lugar que no dice
     QUÉ se ejecuta— y devolverlo sin explicación dejaría al usuario mirando una
     tabla en blanco sin saber si preguntó mal o si el motor no sabe. Se dice, y
     se dice qué hacer. */
  let sinSugerencias = null;
  if (!items.length) {
    const reconocioAlgo = terminosVistos.length > 0 || codigosLeidos.length > 0;
    sinSugerencias = reconocioAlgo
      ? "El objeto es de obra, pero ningún ítem llegó al umbral: los términos reconocidos dicen DÓNDE "
        + "se trabaja, no QUÉ se ejecuta. Añada el código UNSPSC del proceso, o pegue también la "
        + "descripción del objeto (suele traer las actividades)."
      : "No se reconoció ningún término del diccionario ni ningún código UNSPSC utilizable. "
        + "Pegue el objeto completo del proceso, con su descripción.";
  }

  return {
    items,
    total: items.length,
    recortados,
    sin_sugerencias: sinSugerencias,
    // ── diagnóstico: por qué salió esto y no otra cosa ──
    diagnostico: {
      objeto_analizado: textoObjeto.length,
      tokens: tokens.length,
      codigos_leidos: codigosLeidos,
      codigo_no_legible: codigoInvalido,
      terminos_reconocidos: terminosVistos,
      departamento: departamento ? norm(departamento) : null,
      departamento_nota: "El departamento no cambia los ítems sugeridos: la geografía "
        + "cambia lo que cuestan, no lo que hay que ejecutar. Queda reservado para la "
        + "regionalización de precios (Fase 3).",
      conocimiento: {
        origen: conocimiento.origen,
        version: conocimiento.version,
        terminos_en_diccionario: conocimiento.diccionario.size,
        claves_en_mapeo: conocimiento.mapeo.size,
        descartados: conocimiento.descartados,
      },
      pesos: { unspsc: PESO_UNSPSC, texto: PESO_TEXTO, umbral: UMBRAL, especificidad: ESPECIFICIDAD },
    },
    cantidad_sugerida_motivo: "Sin el pliego (planos, cantidades de obra, formulario 1) no se "
      + "puede estimar ninguna cantidad, y el dataset de SECOP II no las publica. La cantidad "
      + "viaja en null a propósito: un número inventado no se distingue de uno medido.",
  };
}

/* ══════════════════ 7 · Derivar diccionario del histórico ══════════════════

   Un término suelto extraído del histórico no sabe a qué ítem pertenece: hace
   falta un puente. El puente es el código UNSPSC con el que la entidad publicó
   el proceso — el mapeo ya dice qué ítems implica ese código, así que un
   término que acompaña sistemáticamente a esos códigos acompaña a sus ítems.
   Es la misma forma que ya tienen lib/equivalencias (lift sobre adjudicatarios)
   y el vocabulario por familia de lib/texto_unspsc.

   Tres cautelas heredadas del repositorio:
     · el derivado se MEZCLA con LO VIGENTE, jamás lo sustituye — una derivación
       flaca no puede dejar sin señal a lo que ya funcionaba;
     · lo derivado pesa menos que lo curado (estadística ≠ oficio);
     · si un término también está en el vocabulario de la experiencia del dueño
       (`config:experiencia:terminos`), sube un poco: dos fuentes independientes
       que coinciden valen más que una.

   «LO VIGENTE» es lo PUBLICADO en Redis, no la semilla del código. Derivar
   sobre la semilla ignoraría los términos que el dueño hubiera añadido a mano y
   usaría un puente (el mapeo) distinto del que la app está usando de verdad
   para responder — así que el motor aprendería para un mundo y contestaría en
   otro. La semilla sigue siendo el respaldo cuando no hay nada publicado.

   Un 0 aquí tiene causas distinguibles, y por eso el resultado las publica en
   vez de devolver un número pelado.

   ── Límites conocidos, dichos en voz alta ────────────────────────────────
   Recorre el histórico ENTERO en una sola invocación: sin presupuesto de
   tiempo, sin reanudación y sin candado. Es la misma forma que tiene
   `/api/admin/cobertura-rup` —y por el mismo motivo: corre a petición, no en un
   cron, y dos derivaciones simultáneas producirían el mismo resultado, así que
   la carrera no corrompe nada (la última publicación gana, y publicar es
   idempotente). Lo que sí puede pasar es que un histórico muy grande agote los
   60 s de la función. Cuando ocurra, lo que hay que hacer es lo que ya hacen
   `/api/sync` y el índice de baja —presupuesto + progreso reanudable—, no subir
   el `maxDuration`. La memoria, que era el límite que llegaba antes, ya está
   acotada por la poda de dos pasadas. */
async function derivarDiccionario(redis, opts = {}) {
  const { CLAVES, leerChunksDedup } = require("../almacen.js");
  const { leerTerminos } = require("../experiencia.js");
  const { codigosDeLicitacion } = require("../unspsc.js");
  const log = opts.log || (() => {});

  const vigente = await leerConocimientoCrudo(redis);
  const mapeoCrudo = opts.mapeo || vigente.mapeo;
  const diccionarioCrudo = opts.diccionario || vigente.diccionario;
  const mapeoBase = compilarMapeo(mapeoCrudo).mapa;

  let claves = [];
  try {
    claves = await redis.scan(CLAVES.patronChunksHist);
  } catch (e) {
    return { ok: false, motivo: "redis_inaccesible", detalle: e.message, terminos_nuevos: 0, diccionario: null };
  }
  if (!claves.length) {
    return {
      ok: false, motivo: "sin_historico", terminos_nuevos: 0, diccionario: null,
      siguiente_paso: "Ejecute /api/sync/historico para bajar el corpus histórico; sin él no hay de dónde derivar.",
    };
  }

  let corruptos = 0;
  const filas = await leerChunksDedup(redis, claves, { onCorrupto: () => { corruptos++; } });

  let vocabExperiencia = null;
  try { vocabExperiencia = await leerTerminos(redis); } catch { /* opcional */ }
  const setExperiencia = (vocabExperiencia && vocabExperiencia.set) || new Set();

  /* ── DOS PASADAS, y la primera existe por MEMORIA, no por elegancia ──────
     `docsPorItemTermino` es «ítem → (término → n)». Con una sola pasada, cada
     proceso mete TODOS sus n-gramas en CADA uno de sus ítems mapeados, y un
     proceso de vía mapea 22 ítems: el vocabulario entero se duplica una vez por
     ítem. Sobre un histórico de verdad (decenas de miles de procesos, cientos
     de miles de n-gramas distintos) eso son millones de entradas y la función
     de Vercel se queda sin memoria — en el corpus de prueba no se nota, que es
     exactamente por lo que hay que escribirlo aquí.

     La primera pasada cuenta el término una sola vez y PODA: un término que no
     alcanza `MIN_SOPORTE` en todo el corpus no puede alcanzarlo dentro de
     ningún ítem (el conteo por ítem es un subconjunto del global), así que no
     puede llegar a candidato y no hace falta guardarlo. Y sobre lo que
     sobrevive se aplica un tope duro por frecuencia, que se INFORMA: un recorte
     silencioso se lee como «esto es todo lo que había».

     Las dos mitades del lift se miden sobre EL MISMO universo —los procesos con
     código mapeado—. Contando el denominador sobre todas las filas, `P(t)`
     saldría menor de lo que es y el lift INFLADO: el filtro dejaría pasar
     términos que no llegan al umbral que dice aplicar. */
  const itemsDeFila = (fila) => {
    const { codigos } = codigosDeLicitacion(fila);
    const items = new Set();
    for (const c of codigos) {
      const p = prefijosDe(c.codigo);
      if (!p) continue;
      for (const { prefijo } of p.niveles) {
        const its = mapeoBase.get(prefijo);
        if (!its) continue;
        its.forEach((id) => items.add(id));
        break;   // el prefijo más específico que exista manda
      }
    }
    return items;
  };
  const gramasDeFila = (fila) => [...ngramas(
    `${fila.nombre_del_procedimiento || ""} ${fila.descripci_n_del_procedimiento || ""}`, 3).gramas.keys()];

  /* Pasada 1 · frecuencia global del término, solo sobre el universo válido */
  const docsPorTermino = new Map();
  const mapeadas = [];
  let conCodigoUtil = 0;
  for (const fila of filas) {
    const items = itemsDeFila(fila);
    if (!items.size) continue;
    const unicos = gramasDeFila(fila);
    if (!unicos.length) continue;
    conCodigoUtil++;
    mapeadas.push({ items, unicos });
    for (const g of unicos) docsPorTermino.set(g, (docsPorTermino.get(g) || 0) + 1);
  }

  /* Poda: fuera lo que no puede llegar a candidato, y tope duro por frecuencia */
  const vivos = [...docsPorTermino.entries()].filter(([, n]) => n >= MIN_SOPORTE);
  vivos.sort((a, b) => b[1] - a[1]);
  const terminosPodados = Math.max(0, vivos.length - MAX_TERMINOS_SEGUIDOS);
  const seguidos = new Set(vivos.slice(0, MAX_TERMINOS_SEGUIDOS).map(([t]) => t));

  /* Pasada 2 · conteo por (ítem, término), ya solo sobre los que sobrevivieron */
  const docsPorItemTermino = new Map();   // item_id → Map(termino → n)
  const docsPorItem = new Map();
  for (const { items, unicos } of mapeadas) {
    const utiles = unicos.filter((g) => seguidos.has(g));
    for (const id of items) {
      docsPorItem.set(id, (docsPorItem.get(id) || 0) + 1);
      if (!utiles.length) continue;
      let m = docsPorItemTermino.get(id);
      if (!m) { m = new Map(); docsPorItemTermino.set(id, m); }
      for (const g of utiles) m.set(g, (m.get(g) || 0) + 1);
    }
  }

  if (!conCodigoUtil) {
    return {
      ok: false, motivo: "sin_codigos_mapeados", terminos_nuevos: 0, diccionario: null,
      procesos_historico: filas.length, chunks_corruptos: corruptos,
      siguiente_paso: "El histórico no trae códigos UNSPSC que el mapeo cubra: revise apu:mapeo_unspsc "
        + "antes de tocar los umbrales — bajar el lift no arregla que falte el puente.",
    };
  }

  /* lift = P(término | ítem) / P(término). Un término frecuente en TODOS los
     objetos («municipio») tiene lift ≈ 1 y no distingue nada.
     `totalDocs` es el universo de los procesos con código mapeado — el mismo
     sobre el que se cuentan las dos mitades del cociente. */
  const totalDocs = conCodigoUtil;
  const candidatos = [];
  for (const [id, porTermino] of docsPorItemTermino) {
    const docsItem = docsPorItem.get(id) || 0;
    if (docsItem < MIN_SOPORTE) continue;
    for (const [termino, n] of porTermino) {
      if (n < MIN_SOPORTE) continue;
      const base = (docsPorTermino.get(termino) || 0) / totalDocs;
      if (!base) continue;
      const lift = (n / docsItem) / base;
      if (lift < LIFT_MIN) continue;
      candidatos.push({ termino, id, lift, soporte: n });
    }
  }
  candidatos.sort((a, b) => b.lift - a.lift || b.soporte - a.soporte);

  /* Mezcla sobre la semilla: nunca se pisa un término curado, solo se le pueden
     AÑADIR ítems; los términos nuevos entran con peso de derivado. */
  /* Copia profunda: la semilla del catálogo es un objeto COMPARTIDO por todo el
     proceso, y ampliar sus `items` in situ contaminaría a los siguientes
     llamantes de la misma instancia serverless. */
  const salida = JSON.parse(JSON.stringify(diccionarioCrudo));
  const canonSemilla = new Map();
  for (const t of Object.keys(salida)) canonSemilla.set(canonizar(t), t);

  let nuevos = 0, ampliados = 0;
  const vistos = new Set();
  for (const c of candidatos) {
    const yaCurado = canonSemilla.get(c.termino);
    if (yaCurado) {
      const entrada = salida[yaCurado];
      if (entrada && Array.isArray(entrada.items) && !entrada.items.includes(c.id)) {
        entrada.items.push(c.id);
        ampliados++;
      }
      continue;
    }
    if (vistos.size >= MAX_TERMINOS_DERIVADOS && !vistos.has(c.termino)) continue;
    const enExperiencia = c.termino.split(" ").some((t) => setExperiencia.has(t));
    if (!salida[c.termino]) {
      salida[c.termino] = {
        peso: Math.min(PESO_DERIVADO_MAX, PESO_DERIVADO + (enExperiencia ? BONO_EXPERIENCIA : 0)),
        items: [],
        origen: enExperiencia ? "historico+experiencia" : "historico",
      };
      nuevos++;
    }
    if (!salida[c.termino].items.includes(c.id)) salida[c.termino].items.push(c.id);
    vistos.add(c.termino);
  }

  log(`derivación APU: ${filas.length} procesos, ${conCodigoUtil} con código mapeado, ${nuevos} términos nuevos`);
  return {
    ok: true,
    diccionario: salida,
    procesos_historico: filas.length,
    procesos_con_codigo_mapeado: conCodigoUtil,
    chunks_corruptos: corruptos,
    terminos_nuevos: nuevos,
    terminos_ampliados: ampliados,
    terminos_totales: Object.keys(salida).length,
    experiencia_cargada: setExperiencia.size > 0,
    umbrales: {
      min_soporte: MIN_SOPORTE, lift_min: LIFT_MIN,
      max_terminos: MAX_TERMINOS_DERIVADOS, max_terminos_seguidos: MAX_TERMINOS_SEGUIDOS,
    },
    /* Lo que la poda dejó fuera por el tope de memoria. Viaja SIEMPRE: un
       recorte silencioso se lee como «esto es todo lo que había». */
    terminos_podados_por_tope: terminosPodados,
    terminos_distintos_seguidos: seguidos.size,
    /* El universo sobre el que se midieron LAS DOS mitades del lift. Viaja
       porque un lift sin su base no se puede discutir —misma razón por la que
       `granularidad_utilizada` acompaña siempre a la baja— y porque es lo que
       hace comprobable que numerador y denominador comparten universo. */
    universo_lift: totalDocs,
  };
}

module.exports = {
  CLAVES_APU,
  PESO_UNSPSC, PESO_TEXTO, UMBRAL, ESPECIFICIDAD, MAX_ITEMS,
  PESO_DERIVADO, PESO_DERIVADO_MAX, BONO_EXPERIENCIA, MIN_SOPORTE, LIFT_MIN,
  canonizar, compilarDiccionario, compilarMapeo, ngramas, prefijosDe,
  leerConocimiento, leerConocimientoCrudo, publicarConocimiento, sembrarConocimiento,
  inferirItems, derivarDiccionario,
  CATALOGO,
};
