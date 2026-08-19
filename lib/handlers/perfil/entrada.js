/* /api/perfil?op=diagnostico (POST) · PUERTA DE ENTRADA DE 60 SEGUNDOS (Fase 2)
   ─────────────────────────────────────────────────────────────────────────────
   Responde, sin cuenta y sin token, la primera pregunta del producto: «¿a
   cuántas licitaciones abiertas puedo presentarme HOY?». Tres caminos, y
   NINGUNO termina en un error sin salida:

     1. { texto }              texto del RUP extraído por pdf.js EN EL NAVEGADOR
                              (rápido, gratis, privado). Igual que la carga por
                              PDF de siempre: el servidor no recibe el PDF.
     2. { imagenes_base64 }   páginas rasterizadas de un escaneo o fotos de un
                              ZIP → OCR.space (lib/apu_ocr) → mismo camino que
                              (1), con `origen: "ocr"` y confianza BAJA: se
                              devuelve lo leído para que la persona lo CONFIRME
                              antes de crear nada.
     3. { manual }            tres datos: patrimonio, contrato más grande y
                              actividad → perfil APROXIMADO (lib/perfil_manual).

   En los tres casos se crea un perfil dinámico (`rup_…`, TTL 45 días, la
   misma vía que la carga por PDF: lib/perfil_dinamico.crearPerfilDinamico) y
   se cuentan las oportunidades con la MISMA cascada y las MISMAS puertas que
   /api/oportunidades — hay prueba de que `total` coincide con el listado del
   mismo perfil. «Ver las 47» abre ese perfil.

   Reglas que no se negocian:
   · El DOCUMENTO no se persiste jamás: ni el texto, ni las imágenes, ni un
     hash del que se pudiera reconstruir nada. Solo el perfil derivado y el
     RESULTADO del análisis, este último en `diagnostico:{hash}` 24 h.
   · Lo que no se pudo leer se PIDE, y solo eso (`camposNoLeidos` /
     `necesita`); un 0 no es un dato.
   · Ninguna cifra sin fuente: `total` viaja con `como_leerlo` y el perfil con
     `origen` y `confianza`. */

const crypto = require("crypto");
const { crearRedis, hayCredenciales } = require("../../redis.js");
const { leerCuerpo } = require("../../cuerpo.js");
const { CLAVES, leerChunksDedup } = require("../../almacen.js");
const { filtrarProcesosVisibles } = require("../../filtros.js");
const { evaluarPuertas } = require("../../puertas.js");
const { extraerRupDeTexto } = require("../../rup_pdf.js");
const { validarPerfilDinamico, derivarUnspsc } = require("../../config_rup.js");
const { crearPerfilDinamico } = require("../../perfil_dinamico.js");
const { configDesdeManual, ACTIVIDADES } = require("../../perfil_manual.js");
const { crp } = require("../../capacidad.js");
const FiltrosLista = require("../../filtros_lista.js");
const Filtros = require("../../../public/filtros.js");

const MAX_BYTES = 6 * 1024 * 1024;   // imágenes en base64 (varias páginas)
const CACHE_TTL_SEG = 24 * 3600;
const MUESTRA_N = 5;
const CLAVE_CACHE = (hash) => `diagnostico:${hash}`;

/* Campos que la puerta de entrada puede COMPLETAR sobre lo extraído: el
   patrimonio (obligatorio para la puerta de caja) y el contrato más grande
   (opcional: fija el tope). El resto de indicadores queda «sin dato». */
const COMPLETABLES = new Set(["patrimonio", "experiencia_smmlv", "utilidad_operacional", "liquidez", "endeudamiento", "cobertura_intereses"]);

function hashDe(obj) {
  return crypto.createHash("sha256").update(JSON.stringify(obj)).digest("hex").slice(0, 32);
}

const cop = (n) => (Number.isFinite(n) ? Math.round(n) : null);

/* LOS DÍAS AL CIERRE SE CUENTAN UNA SOLA VEZ, Y NO AQUÍ (ago 2026). Esta
   función redondeaba con `Math.floor` mientras TODO lo demás —el filtro
   `?cierre=`, las facetas, el chip de la tarjeta, el aviso de las 24 horas, Mis
   procesos y la portada— usa `Math.ceil` (`FiltrosLista.diasParaCierre`). Como
   floor = ceil − 1 salvo en múltiplos exactos de un día, el pulso titulaba «7
   cierran esta semana» y el clic en esa misma cifra abría la lista con 5. Dos
   cuentas del mismo dato divergen siempre; la regla del proyecto es que la
   cuenta viva en un sitio. */
const diasRestantes = (fechaIso, ahora) =>
  FiltrosLista.diasParaCierre({ fecha_cierre: fechaIso }, ahora);

/* ── contar oportunidades para un perfil YA inyectado en PERFILES ─────────── */
async function contarOportunidades(redis, perfilId, perfilVivo, ahora = Date.now()) {
  const claves = await redis.scan(CLAVES.patronChunks);
  if (!claves.length) {
    return { total: 0, valorTotal: 0, conCapacidadSuficiente: 0, muestra: [], corpus_vacio: true, visibles: 0 };
  }
  const filas = await leerChunksDedup(redis, claves);
  const { cargarConocimiento } = require("../procesos/listar.js");
  let conocimiento = {};
  try { conocimiento = (await cargarConocimiento(redis)).conocimiento || {}; } catch { conocimiento = {}; }

  const cascada = filtrarProcesosVisibles(filas, perfilId, conocimiento);
  const conPuertas = [];
  for (const l of cascada.visibles) {
    const rup = cascada.veredictos.get(l);
    const puertas = evaluarPuertas(l, perfilId, { rup, conocimiento });
    if (!puertas.pasa_todas) continue;
    conPuertas.push({ l, puertas });
  }
  /* LOS FILTROS POR DEFECTO DEL LISTADO TAMBIÉN CUENTAN AQUÍ (17-ago-2026).
     Producción destapó la brecha: el pulso decía 827 y la lista 771, porque la
     Fase 8 apaga «suministro» por defecto en el listado y este conteo no lo
     sabía. «Hoy hay N» y «Ver las N» tienen que ser la MISMA N que la lista
     enseña al abrirse; por eso se aplica el MISMO `FiltrosLista.aplicar` con
     el estado vacío (= los tipos por defecto), con el clasificador alimentado
     por los mismos veredictos. Lo que queda fuera se publica
     (`ocultosPorFiltroDefecto`): el usuario puede encenderlo en la lista. */
  const viables = filtrarPorDefecto(conPuertas, cascada, ahora);
  const ocultosPorFiltroDefecto = conPuertas.length - viables.length;
  const valorTotal = viables.reduce((a, v) => a + (Number(v.l.precio_base) || 0), 0);
  /* «Le alcanza de sobra»: la caja cubre el DOBLE de lo que habría que financiar
     y, si la K se pudo calcular, el proceso consume como mucho la mitad. Con la
     K sin dato manda solo la caja — y se dice en como_leerlo. */
  const deSobra = viables.filter(({ puertas }) => {
    const p3 = puertas.p3_caja || {};
    const p2 = puertas.p2_k || {};
    const cajaSobra = p3.sin_dato ? false : (Number(p3.patrimonio) || 0) >= 2 * (Number(p3.financiacion_requerida) || 0);
    const kSobra = p2.sin_dato ? true : (Number(p2.crpc) || 0) <= 0.5 * (Number(p2.crp) || 0);
    return cajaSobra && kSobra;
  }).length;

  const muestra = viables
    .map(({ l }) => ({
      id: l.id_del_proceso || l._k || null,
      entidad: l.entidad || null,
      // el MISMO campo que titula la tarjeta del listado (app.js): `nombre_del_procedimiento`
      objeto: String(l.nombre_del_procedimiento || l.descripci_n_del_procedimiento || "").slice(0, 220),
      valor: cop(Number(l.precio_base)),
      cierre: l.fecha_cierre || null,
      diasRestantes: l.fecha_cierre ? diasRestantes(l.fecha_cierre, ahora) : null,
      departamento: l.departamento_entidad || null,
      url: l.urlproceso || l.url || null,
    }))
    // primero lo que cierra antes (y tiene fecha): es lo accionable
    .sort((a, b) => (a.diasRestantes ?? 9999) - (b.diasRestantes ?? 9999))
    .slice(0, MUESTRA_N);

  return {
    total: viables.length, valorTotal: cop(valorTotal), conCapacidadSuficiente: deSobra, muestra,
    visibles: cascada.visibles.length, corpus_vacio: false,
    ocultosPorFiltroDefecto,
    agregados: agregarPulso(viables.map((v) => v.l), ahora),
  };
}

/* Aplica a los viables el estado de filtros VACÍO del listado —que no es «sin
   filtro»: son los tipos de trabajo por defecto de la Fase 8 (suministro
   apagado)— con el clasificador de `lib/filtros_lista` alimentado por los
   MISMOS veredictos de la cascada. Extraída para probarla con filas sintéticas. */
function filtrarPorDefecto(conPuertas, cascada, ahora = Date.now()) {
  const clasificar = FiltrosLista.crearClasificador({ rupDe: (l) => (cascada && cascada.veredictos ? cascada.veredictos.get(l) : null) || null, ahora });
  const estadoVacio = Filtros.leerEstado({});
  return conPuertas.filter(({ l }) => FiltrosLista.cumple(l, clasificar(l), estadoVacio));
}

/* ── El PULSO del perfil: los agregados que motivan y ordenan (ago 2026) ──
   Sobre los procesos VIABLES para el perfil (los mismos que cuenta `total`):
   cuántos cierran esta semana y cuánto suman, dónde están (departamento) y
   quién los publica (entidad), con conteo y dinero. Es lo que enseña la
   portada PERSONALIZADA del tablero y la pantalla de resultado de la
   entrada; cada fila enlaza a la lista filtrada (Fase 8). Reglas: una cuantía
   ausente suma 0 al dinero pero cuenta como proceso; «sin departamento» y
   «sin entidad» se cuentan aparte y no compiten por una barra (repartirlos a
   ojo sería inventar); el «total» es EXACTAMENTE `total` (mismo array). */
const TOP_PULSO = 8;
function agregarPulso(procesos, ahora = Date.now()) {
  let cierranN = 0, cierranValor = 0, sinDep = 0, sinEntidad = 0;
  const porDep = new Map(), porEnt = new Map();
  for (const l of procesos) {
    const valor = Number(l.precio_base) || 0;
    const dias = l.fecha_cierre ? diasRestantes(l.fecha_cierre, ahora) : null;
    if (dias != null && dias >= 0 && dias <= 7) { cierranN++; cierranValor += valor; }
    const dep = String(l.departamento_entidad || "").trim();
    if (!dep || /^no definido$/i.test(dep)) sinDep++;
    else { const d = porDep.get(dep) || { nombre: dep, n: 0, valor: 0 }; d.n++; d.valor += valor; porDep.set(dep, d); }
    const ent = String(l.entidad || "").trim();
    if (!ent) sinEntidad++;
    else {
      const k = ent.toUpperCase();
      const e = porEnt.get(k) || { nombre: ent, nit: (l.nit_entidad != null && String(l.nit_entidad).trim()) || null, n: 0, valor: 0 };
      e.n++; e.valor += valor; porEnt.set(k, e);
    }
  }
  /* DOS DISTRIBUCIONES PARA GRAFICAR, con las MISMAS cubetas que los filtros
     del listado (public/filtros.js): así cada barra del pulso es exactamente
     un filtro («Cierra esta semana» = ?cierre=7d; «De $200 a $1.000 millones»
     = ?min=…&max=…). Otra partición «más bonita» daría barras que no llevan a
     ninguna lista. Los días se calculan con `diasParaCierre` de filtros_lista
     —el mismo reloj Colombia del listado— y «sin fecha» / «sin valor» se
     cuentan aparte: no se reparten a ojo. */
  const porCierre = Filtros.VENTANAS_CIERRE.map((v) => ({ id: v.id, etiqueta: v.etiqueta, dias: v.dias, n: 0, valor: 0 }));
  const porCuantia = Filtros.RANGOS_CUANTIA.map((r) => ({ id: r.id, etiqueta: r.etiqueta, min: r.min, max: r.max, n: 0, valor: 0 }));
  let cierreSinFecha = 0, cuantiaSinDato = 0;
  for (const l of procesos) {
    const valor = Number(l.precio_base) || 0;
    const vId = Filtros.ventanaCierreDe(FiltrosLista.diasParaCierre(l, ahora));   // id de ventana o null
    const cv = vId ? porCierre.find((x) => x.id === vId) : null;
    if (cv) { cv.n++; cv.valor += valor; } else cierreSinFecha++;
    const rId = Filtros.rangoCuantiaDe(l.cuantia_cop != null ? l.cuantia_cop : l.precio_base);   // id de rango o null
    const cr = rId ? porCuantia.find((x) => x.id === rId) : null;
    if (cr) { cr.n++; cr.valor += valor; } else cuantiaSinDato++;
  }
  const orden = (a, b) => b.n - a.n || b.valor - a.valor || a.nombre.localeCompare(b.nombre);
  return {
    total: procesos.length,
    porCierre: porCierre.map((c) => ({ ...c, valor: cop(c.valor) })),
    cierreSinFecha,
    porCuantia: porCuantia.map((c) => ({ ...c, valor: cop(c.valor) })),
    cuantiaSinDato,
    valorTotal: cop(procesos.reduce((a, l) => a + (Number(l.precio_base) || 0), 0)),
    cierranEstaSemana: { n: cierranN, valor: cop(cierranValor) },
    porDepartamento: [...porDep.values()].sort(orden).slice(0, TOP_PULSO).map((d) => ({ ...d, valor: cop(d.valor) })),
    departamentosDistintos: porDep.size,
    sinDepartamento: sinDep,
    topEntidades: [...porEnt.values()].sort(orden).slice(0, TOP_PULSO).map((e) => ({ ...e, valor: cop(e.valor) })),
    entidadesDistintas: porEnt.size,
    sinEntidad,
    top: TOP_PULSO,
  };
}

function resumenPerfil(perfilVivo, derivado) {
  const k = crp(perfilVivo, 0);
  return {
    nombre: perfilVivo.nombre || null,
    patrimonio: perfilVivo.patrimonio ?? null,
    capacidadContratacion: k == null ? null : Math.round(k),   // null = sin dato (falta utilidad/ingreso operacional)
    experiencia_smmlv: perfilVivo.expSMMLV ?? null,
    familias: derivado.familias,
    clases: derivado.clases.length,
  };
}

const COMO_LEERLO = {
  total: "Licitaciones ABIERTAS hoy en el corpus de SECOP II que pasan el objeto (sus códigos de obra), la capacidad "
    + "de contratación (si se pudo calcular) y la caja (patrimonio ≥ 20 % de lo que habría que financiar). Es el mismo "
    + "número que sirve el listado con este perfil.",
  conCapacidadSuficiente: "De esas, las que le quedan holgadas: el patrimonio cubre el doble de lo que habría que financiar "
    + "y, si la capacidad K se pudo calcular, el proceso consume como mucho la mitad. Con la K sin dato manda solo la caja.",
  valorTotal: "Suma de los presupuestos oficiales publicados de esas licitaciones (COP).",
  muestra: `${MUESTRA_N} licitaciones reales y abiertas, las que cierran antes.`,
  origen: "texto = RUP leído del PDF en su navegador · ocr = leído de un escaneo o foto (confírmelo) · manual = tres datos.",
  confianza: "alta = certificado leído completo · media = faltó algún indicador (la capacidad K queda sin dato) o perfil aproximado · baja = OCR.",
  documento: "El documento no se guarda: ni el PDF, ni el texto, ni las imágenes. Solo el perfil derivado (45 días) y este resultado (24 h).",
};

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  const metodo = String(req.method || "GET").toUpperCase();
  if (metodo !== "POST") {
    /* Un GET no analiza nada, pero sí SIRVE lo que el navegador necesita para
       pintar el formulario de tres datos: las doce actividades (una sola lista,
       la del servidor) y cómo llamar. 200 porque es una lectura sin efectos. */
    res.setHeader("Allow", "GET, POST");
    return res.status(200).json({
      ok: true,
      analizado: false,
      mensaje: "El diagnóstico se hace por POST. Este GET solo enseña las actividades y el contrato.",
      como_hacerlo: {
        texto: "POST {texto} · el texto del RUP extraído por pdf.js en el navegador",
        imagenes: "POST {imagenes_base64:[{base64,mime}]} · páginas de un escaneo o fotos → OCR (confirmar después)",
        manual: `POST {manual:{patrimonio, mayorContrato, unidad:"COP"|"SMMLV", actividad}} · actividades: ${ACTIVIDADES.map((a) => a.id).join(" | ")}`,
      },
      actividades: ACTIVIDADES.map((a) => ({ id: a.id, etiqueta: a.etiqueta })),
    });
  }
  if (!hayCredenciales()) return res.status(503).json({ ok: false, error: "Faltan credenciales de Upstash Redis en el despliegue." });

  const cuerpo = await leerCuerpo(req, { maxBytes: MAX_BYTES });
  if (!cuerpo.ok) return res.status(cuerpo.status).json({ ok: false, error: cuerpo.error });
  const datos = cuerpo.datos || {};
  const redis = crearRedis({});
  const ahora = Date.now();

  /* ── 1 · de dónde sale el perfil ─────────────────────────────────────── */
  let origen = null, confianza = null, config = null, advertencias = [], camposNoLeidos = [], extra = {};

  if (datos.manual && typeof datos.manual === "object") {
    const m = configDesdeManual(datos.manual);
    if (!m.ok) return res.status(400).json({ ok: false, error: m.error, campos: m.campos, actividades: ACTIVIDADES.map((a) => ({ id: a.id, etiqueta: a.etiqueta })) });
    origen = "manual"; confianza = "media"; config = m.config; advertencias = m.advertencias;
    camposNoLeidos = ["liquidez", "endeudamiento", "cobertura_intereses", "utilidad_operacional"];
    extra = { actividad: { id: m.actividad.id, etiqueta: m.actividad.etiqueta }, familias: m.familias };
  } else {
    let texto = typeof datos.texto === "string" ? datos.texto : (typeof datos.texto_extraido === "string" ? datos.texto_extraido : "");
    let origenDeclarado = String(datos.origen || "texto").toLowerCase() === "ocr" ? "ocr" : "texto";
    const imagenes = Array.isArray(datos.imagenes_base64) ? datos.imagenes_base64 : [];

    if (!texto.trim() && imagenes.length) {
      /* ── OCR: respaldo para escaneos y fotos. Se devuelve lo leído SIN crear
         nada: la confianza es baja y la persona confirma (o corrige) antes. ── */
      const { ocrPaginas, hayClaveOcr } = require("../../apu_ocr.js");
      if (!hayClaveOcr()) {
        return res.status(200).json({
          ok: true, origen: "ocr", leido: false, ocr_disponible: false,
          siguiente: "manual",
          mensaje: "El reconocimiento de imágenes no está configurado en este despliegue. Con tres datos le muestro lo mismo.",
          camposNoLeidos: ["patrimonio", "mayorContrato", "actividad"], como_leerlo: COMO_LEERLO,
        });
      }
      const ocr = await ocrPaginas(imagenes, {});
      if (!ocr.ok) {
        return res.status(200).json({
          ok: true, origen: "ocr", leido: false, ocr_disponible: true, siguiente: "manual",
          mensaje: `No se pudo reconocer el documento (${ocr.error}). Con tres datos le muestro lo mismo.`,
          camposNoLeidos: ["patrimonio", "mayorContrato", "actividad"], como_leerlo: COMO_LEERLO,
        });
      }
      const ext = extraerRupDeTexto(ocr.texto);
      return res.status(200).json({
        ok: true, origen: "ocr", confianza: "baja", leido: !!ext.ok,
        requiere_confirmacion: true, siguiente: ext.ok ? "confirmar" : "manual",
        texto_ocr: ocr.texto,   // viaja de vuelta al navegador para la confirmación; NO se guarda
        paginas_leidas: ocr.paginas_leidas, truncado: ocr.truncado,
        leido_detalle: ext.ok ? {
          nombre: ext.config.nombre, codigos_unspsc: ext.config.unspsc.length,
          patrimonio: ext.config.indicadores.patrimonio, experiencia_smmlv: ext.config.experiencia_smmlv,
          faltan: ext.faltan,
        } : null,
        mensaje: ext.ok
          ? "Leímos el documento con reconocimiento de imágenes, que se equivoca a veces: revise estos datos y confírmelos."
          : `Con reconocimiento de imágenes no se pudo entender el certificado${ext.diagnostico ? "" : ""}. Con tres datos le muestro lo mismo.`,
        camposNoLeidos: ext.ok ? ext.faltan.map((f) => f.campo) : ["patrimonio", "mayorContrato", "actividad"],
        como_leerlo: COMO_LEERLO,
      });
    }

    if (!texto.trim()) {
      return res.status(400).json({
        ok: false, error: "Falta el contenido: mande «texto» (RUP leído en el navegador), «imagenes_base64» (escaneo) o «manual» (tres datos).",
        actividades: ACTIVIDADES.map((a) => ({ id: a.id, etiqueta: a.etiqueta })),
      });
    }

    const ext = extraerRupDeTexto(texto);
    if (!ext.ok) {
      // «no lo pude leer» es un RESULTADO con salida (los tres datos), no un 4xx
      return res.status(200).json({
        ok: true, origen: origenDeclarado, leido: false, siguiente: "manual",
        mensaje: "No pudimos leer su documento automáticamente. Dígame tres datos y le muestro lo mismo en 30 segundos.",
        detalle: ext.error, camposNoLeidos: ["patrimonio", "mayorContrato", "actividad"], como_leerlo: COMO_LEERLO,
      });
    }
    /* completar SOLO lo que el servidor declaró faltante o el patrimonio/experiencia (los dos que decide la persona) */
    const completar = datos.completar && typeof datos.completar === "object" ? datos.completar : {};
    for (const [campo, valor] of Object.entries(completar)) {
      if (!COMPLETABLES.has(campo)) continue;
      const n = Number(valor);
      if (!Number.isFinite(n) || n <= 0) continue;   // un 0 no es un dato
      if (campo === "experiencia_smmlv") {
        ext.config.experiencia_smmlv = n;
        ext.config.tope_smmlv = Math.ceil(n * 2);
      } else if (campo === "endeudamiento") {
        ext.config.indicadores.endeudamiento = n > 1 ? Math.round((n / 100) * 10000) / 10000 : n;
      } else if (campo === "liquidez") {
        ext.config.indicadores.liquidez = n;
      } else {
        ext.config.indicadores[campo] = Math.round(n);
      }
    }
    // qué sigue faltando de lo que el extractor considera pedible
    const faltanAhora = (ext.faltan || []).filter((f) => (
      (f.campo === "experiencia_smmlv" ? ext.config.experiencia_smmlv : ext.config.indicadores[f.campo]) == null
    ));
    camposNoLeidos = faltanAhora.map((f) => f.campo);
    /* Lo único IMPRESCINDIBLE es el patrimonio (puerta de caja). Sin él se pide
       ESE campo y nada más — no el formulario entero otra vez. */
    if (ext.config.indicadores.patrimonio == null) {
      return res.status(200).json({
        ok: true, origen: origenDeclarado, leido: true, siguiente: "completar",
        necesita: [{ campo: "patrimonio", etiqueta: "¿Cuánto es el patrimonio de su empresa? (pesos)" }],
        leido_detalle: { nombre: ext.config.nombre, codigos_unspsc: ext.config.unspsc.length, experiencia_smmlv: ext.config.experiencia_smmlv },
        camposNoLeidos, advertencias: ext.advertencias, como_leerlo: COMO_LEERLO,
        mensaje: "Leímos su certificado. Solo falta un dato para poder decirle cuántas licitaciones puede financiar.",
      });
    }
    // sin experiencia leída no hay tope: se deja SIN tope (no se inventa) y se avisa
    if (ext.config.experiencia_smmlv == null) {
      // el esquema exige experiencia > 0: se pide junto con nada más si de verdad falta
      return res.status(200).json({
        ok: true, origen: origenDeclarado, leido: true, siguiente: "completar",
        necesita: [{ campo: "experiencia_smmlv", etiqueta: "¿Cuál es el contrato más grande que ha ejecutado? (en salarios mínimos, o escríbalo en pesos)" }],
        leido_detalle: { nombre: ext.config.nombre, codigos_unspsc: ext.config.unspsc.length, patrimonio: ext.config.indicadores.patrimonio },
        camposNoLeidos, advertencias: ext.advertencias, como_leerlo: COMO_LEERLO,
        mensaje: "Leímos su certificado. Solo falta un dato para fijar hasta qué cuantía buscar.",
      });
    }
    origen = origenDeclarado;
    confianza = origenDeclarado === "ocr" ? "baja" : (camposNoLeidos.length ? "media" : "alta");
    config = ext.config; advertencias = ext.advertencias || [];
    extra = { vigencia: ext.vigencia || null, k_declarada_smmlv: ext.k_declarada_smmlv ?? null };
  }

  /* ── 2 · caché del RESULTADO por hash del contenido (24 h) ─────────────── */
  const hash = hashDe({ origen, config });
  try {
    const cacheado = await redis.get(CLAVE_CACHE(hash));
    if (cacheado) {
      const obj = typeof cacheado === "string" ? JSON.parse(cacheado) : cacheado;
      /* el resultado cacheado apunta a un perfil `rup_…`: si ese perfil ya no
         existe (lo borraron desde Mi empresa), servirlo mandaría a un «Ver las
         47» que responde «perfil caducado» — se recalcula y se recrea */
      const vive = obj && obj.ok && obj.perfil_id
        ? await redis.exists(CLAVES.configPerfilDinamico(obj.perfil_id)) : 0;
      if (obj && obj.ok && Number(vive) > 0) return res.status(200).json({ ...obj, cache: true });
    }
  } catch { /* la caché es un ahorro, no un requisito */ }

  /* ── 3 · perfil dinámico (misma vía que la carga por PDF) ───────────────── */
  const v = validarPerfilDinamico("rup", config, { aproximado: origen === "manual" || camposNoLeidos.length > 0 });
  if (!v.ok) {
    return res.status(200).json({
      ok: true, origen, leido: true, siguiente: "manual",
      mensaje: "Un dato del certificado no pasa la validación. Con tres datos le muestro lo mismo.",
      detalle: v.errores.slice(0, 3), camposNoLeidos: ["patrimonio", "mayorContrato", "actividad"], como_leerlo: COMO_LEERLO,
    });
  }
  const creado = await crearPerfilDinamico(redis, { perfil: v.perfil, meta: { origen: `entrada:${origen}`, confianza, ...extra } });
  if (!creado.ok) return res.status(creado.status).json({ ok: false, error: creado.error });

  /* ── 4 · contar con la misma cascada y las mismas puertas del listado ───── */
  let conteo;
  try {
    conteo = await contarOportunidades(redis, creado.id, creado.perfil, ahora);
  } catch (e) {
    return res.status(502).json({ ok: false, error: `Perfil creado (${creado.id}) pero no se pudo contar: ${e.message}`, perfil_id: creado.id });
  }

  const respuesta = {
    ok: true,
    origen, confianza,
    perfil_id: creado.id,
    url_dashboard: `/?perfil=${creado.id}`,
    perfil: resumenPerfil(creado.perfil, creado.derivado),
    oportunidades: {
      total: conteo.total, valorTotal: conteo.valorTotal, conCapacidadSuficiente: conteo.conCapacidadSuficiente,
      muestra: conteo.muestra, visibles_antes_de_puertas: conteo.visibles, corpus_vacio: conteo.corpus_vacio,
      // el pulso en cifras de la pantalla de resultado (cierran esta semana, dónde, quién)
      agregados: conteo.agregados || null,
      ocultosPorFiltroDefecto: conteo.ocultosPorFiltroDefecto == null ? 0 : conteo.ocultosPorFiltroDefecto,
    },
    camposNoLeidos,
    advertencias: [...(v.advertencias || []).map((a) => (typeof a === "string" ? a : a.mensaje || JSON.stringify(a))), ...advertencias],
    ...extra,
    generado: new Date(ahora).toISOString(),
    como_leerlo: COMO_LEERLO,
  };
  try { await redis.set(CLAVE_CACHE(hash), JSON.stringify(respuesta), { ex: CACHE_TTL_SEG }); } catch { /* opcional */ }
  return res.status(200).json(respuesta);
};

module.exports.CLAVE_CACHE = CLAVE_CACHE;
// el simulador de consorcio (Fase 10) cuenta con la MISMA función: dos cuentas divergirían
module.exports.contarOportunidades = contarOportunidades;
module.exports.CACHE_TTL_SEG = CACHE_TTL_SEG;
module.exports.agregarPulso = agregarPulso;
module.exports.filtrarPorDefecto = filtrarPorDefecto;
