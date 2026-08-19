/* ============================================================================
   /api/apu/extraer-texto · Del texto de un pliego a la lista de ítems y cantidades
   ----------------------------------------------------------------------------
   GET  /api/apu/extraer-texto?token=…   → el CONTRATO del endpoint y el catálogo
                                           vigente (qué ítems conoce, qué
                                           tipologías, qué unidades acepta).
   POST /api/apu/extraer-texto?token=…   → parsea y mapea.

   Cuerpo del POST:
     {
       texto_extraido:  string     el texto del formulario de cantidades. Lo
                                   produce pdf.js EN EL NAVEGADOR (public/pliego.js),
                                   con las columnas separadas por TABULADOR.
       objeto_proceso:  string     objeto del proceso — acota la tipología
       unspsc:          string[]   códigos del proceso — refuerzan la tipología
       precio_base:     number     presupuesto oficial, si se conoce: es el ANCLA
                                   EXTERNA del nivel Documento de la validación
       imagenes_base64: [{base64,mime}]   RESPALDO para PDF escaneado: si no hay
                                   texto, estas páginas van a OCR (lib/apu_ocr)
     }

   PROTEGIDO con el mismo `HISTORICO_TOKEN` que el resto de la administración
   (lib/auth). No es un endpoint público como `/api/oportunidades`: recibe un
   documento del dueño, gasta cuota de un servicio externo y devuelve una lectura
   de un pliego concreto. Nada de esto es una lista de oportunidades.

   NO TOCA REDIS. Ni lee el corpus, ni escribe, ni toma candados: es una función
   PURA sobre lo que llega en el cuerpo. Por eso no necesita credenciales de
   Upstash y no puede dejar nada a medias — la misma garantía que hace fiable a
   `/api/diagnostico`, aunque por motivos distintos.

   POR QUÉ NO PARSEA EL PDF AQUÍ. `pdfjs-dist` pesa decenas de MB en Node y hay
   que sacarlo del request path (docs/APU_INFORME_COMPLETO.md §1.G.3); el OCR «no
   cabe en el mismo proceso». El navegador ya tiene un motor de PDF y tiempo de
   sobra: hace la parte cara y manda texto. Es la misma decisión que llevó el
   encadenado de la full a `/admin.html`.
   ========================================================================== */
"use strict";

const { autorizarToken } = require("./auth.js");
const { parsearPliego, UNIDADES_CANONICAS, CORTE_FILAS_VERDE, CORTE_FILAS_ROJO, TOPE_ANTICIPO_SUMA } = require("./apu_pliego.js");
const { mapearTabla, UMBRAL_ACEPTAR, UMBRAL_FIRME } = require("./apu_mapeo.js");
const { TIPOLOGIAS, ITEMS, META_CATALOGO } = require("./apu_catalogo.js");
const { ocrPaginas, hayClaveOcr, MENSAJE_SIN_CLAVE, MAX_BYTES_IMAGEN, MAX_PAGINAS_POR_LOTE } = require("./apu_ocr.js");

const MAX_BYTES = 4 * 1024 * 1024;      // el cuerpo de una función de Vercel topa ~4,5 MB
const MIN_TEXTO = 40;                   // por debajo no hay tabla que buscar

/* Advertencia que viaja en TODAS las respuestas, no solo en las dudosas.
   §1.I: aquí el falso positivo cuesta más que el falso negativo, así que la
   salida no puede parecer un dato verificado ni cuando el semáforo está verde:
   verde dice que la ARITMÉTICA cuadra, no que la lectura sea la del pliego. */
const ADVERTENCIA = "La extracción automática puede tener errores. Verifique siempre los datos contra el "
  + "pliego original antes de usar el APU. El semáforo mide la coherencia aritmética de lo leído, "
  + "no que lo leído sea lo que dice el documento.";

/* El lector de cuerpo es el COMPARTIDO (lib/cuerpo). Aquí vivía una copia
   privada —con el mismo `buf += c` que corrompía los caracteres multibyte y el
   mismo `reject` que rompía el contrato «nunca lanza»—, y su comentario decía
   que era «el mismo lector que /api/admin/rup», que ya usaba el consolidado:
   una corrección al de verdad no llegaba justo al endpoint que más texto
   español recibe. El mensaje propio de «body vacío» se conserva en el llamador
   (por eso se pide SIN `que`: aquí las dos claves posibles son alternativas). */
const { leerCuerpo } = require("./cuerpo.js");

/* Códigos UNSPSC: se aceptan como arreglo o como cadena separada por comas
   (el dueño los pega de la ficha del proceso). Solo dígitos, longitud 2-8. */
function normalizarUnspsc(v) {
  const bruto = Array.isArray(v) ? v : String(v == null ? "" : v).split(/[,;\s]+/);
  return [...new Set(bruto
    .map((c) => String(c == null ? "" : c).replace(/\D/g, ""))
    .filter((c) => c.length >= 2 && c.length <= 8))].slice(0, 200);
}

function contrato() {
  return {
    metodo: "POST application/json",
    cuerpo: {
      texto_extraido: "string · texto del formulario de cantidades; columnas separadas por TABULADOR",
      objeto_proceso: "string · opcional; acota la tipología de obra",
      unspsc: "string[] · opcional; refuerza la tipología",
      precio_base: "number · opcional; ancla externa del nivel Documento de la validación",
      imagenes_base64: `[{base64, mime}] · opcional; respaldo por OCR para PDF escaneado (máx. ${MAX_PAGINAS_POR_LOTE} páginas por llamada, ${Math.round(MAX_BYTES_IMAGEN / 1024)} KB por página)`,
      solo_reconocer: "boolean · opcional; con imagenes_base64 devuelve «texto_ocr» SIN parsear, para poder "
        + "encadenar tandas de un documento largo y parsear el texto completo al final",
    },
    limites: { cuerpo_max_mb: 4, texto_minimo_caracteres: MIN_TEXTO },
    umbrales: {
      mapeo: { aceptar: UMBRAL_ACEPTAR, firme: UMBRAL_FIRME },
      semaforo: { filas_verde: CORTE_FILAS_VERDE, filas_rojo: CORTE_FILAS_ROJO },
      tope_legal_anticipo_mas_pago_anticipado: TOPE_ANTICIPO_SUMA,
    },
    catalogo: {
      items: ITEMS.length,
      tipologias: Object.keys(TIPOLOGIAS).length,
      unidades_aceptadas: [...UNIDADES_CANONICAS].sort(),
      por_que_ningun_codigo_invias: META_CATALOGO.por_que_ningun_codigo_INV,
      que_no_es: META_CATALOGO.que_NO_es,
    },
    ocr: {
      configurado: hayClaveOcr(),
      proveedor: "OCR.space",
      variable_de_entorno: "OCRSPACE_API_KEY",
      nota: hayClaveOcr() ? "El respaldo por OCR está disponible." : MENSAJE_SIN_CLAVE,
    },
    advertencia: ADVERTENCIA,
  };
}

module.exports = async function handler(req, res) {
  const q = req.query || {};
  res.setHeader("Cache-Control", "no-store");

  const permiso = autorizarToken(req, q);
  if (!permiso.ok) return res.status(permiso.status).json({ ok: false, error: permiso.error });

  const metodo = String(req.method || "GET").toUpperCase();
  if (metodo === "GET") return res.status(200).json({ ok: true, ...contrato() });
  if (metodo !== "POST") {
    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({ ok: false, error: "Método no permitido: use GET para el contrato y POST para extraer." });
  }

  const cuerpo = await leerCuerpo(req, { maxBytes: MAX_BYTES });
  if (!cuerpo.ok) {
    const salida = { ok: false, error: cuerpo.error };
    if (cuerpo.max_mb) salida.max_mb = cuerpo.max_mb;
    return res.status(cuerpo.status).json(salida);
  }
  const datos = cuerpo.datos || {};

  let texto = typeof datos.texto_extraido === "string" ? datos.texto_extraido : "";
  let ocr = null;

  /* ── respaldo por OCR ──
     Solo si NO llegó texto utilizable. Con texto nativo disponible, gastar una
     petición del plan gratuito para leer peor la misma página no tiene sentido. */
  /* SE COPIAN SOLO `base64` Y `mime`. Pasar los objetos del cliente tal cual
     dejaba que un campo `url` llegara hasta OCR.space, que lo descargaría por
     nosotros: un SSRF por delegación, y además saltándose el control de tamaño.
     Aquí se declara la forma exacta de lo que entra. */
  const imagenes = (Array.isArray(datos.imagenes_base64) ? datos.imagenes_base64 : [])
    .filter((p) => p && typeof p === "object" && typeof p.base64 === "string")
    .map((p) => ({ base64: p.base64, mime: typeof p.mime === "string" ? p.mime : "image/jpeg" }));
  if (texto.trim().length < MIN_TEXTO && imagenes.length) {
    if (!hayClaveOcr()) {
      return res.status(503).json({ ok: false, error: MENSAJE_SIN_CLAVE, ocr_configurado: false });
    }
    ocr = await ocrPaginas(imagenes, {});
    if (!ocr.ok) {
      return res.status(ocr.status || 502).json({
        ok: false,
        error: ocr.error,
        ocr: { paginas_pedidas: ocr.paginas_pedidas, paginas_leidas: ocr.paginas_leidas, fallos: ocr.fallos },
      });
    }
    texto = ocr.texto;

    /* ── SOLO RECONOCER, sin parsear ──
       El tope de páginas por llamada existe por el reloj de la función (OCR.space
       tarda segundos por página y `maxDuration` son 60 s), así que un formulario
       escaneado de 40 páginas NO cabe en una sola invocación. La salida es que el
       cliente ENCADENE tandas —el mismo patrón con que /admin.html encadena la
       full— y para eso necesita el texto reconocido de vuelta: acumula las tandas
       y al final manda el texto completo por `texto_extraido` para parsearlo
       ENTERO de una vez. Parsear cada tanda por separado partiría la tabla en
       trozos y ni los capítulos ni la suma del documento cuadrarían. */
    if (datos.solo_reconocer === true) {
      return res.status(200).json({
        ok: true,
        solo_reconocer: true,
        texto_ocr: texto,
        ocr: {
          usado: true, paginas_leidas: ocr.paginas_leidas, paginas_pedidas: ocr.paginas_pedidas,
          paginas_procesadas: ocr.paginas_procesadas, truncado: ocr.truncado, fallos: ocr.fallos,
        },
        advertencia: ADVERTENCIA,
        nota: "Texto reconocido, SIN parsear. Acumule las tandas y mándelas juntas por «texto_extraido» "
          + "para que la tabla se parsee completa: por trozos, ni los capítulos ni la suma del documento cuadran.",
      });
    }
  }

  if (texto.trim().length < MIN_TEXTO) {
    return res.status(400).json({
      ok: false,
      error: imagenes.length
        ? "El OCR no devolvió texto suficiente para buscar una tabla."
        : "No llegó texto suficiente para buscar una tabla. Si el PDF es escaneado (imágenes), pdf.js no "
          + "puede extraer texto: use el respaldo por OCR desde la página /apu, que rasteriza las páginas y "
          + "las manda a reconocer.",
      caracteres_recibidos: texto.trim().length,
      minimo: MIN_TEXTO,
      ocr_configurado: hayClaveOcr(),
    });
  }

  /* ── parseo y mapeo ── */
  const precioBase = typeof datos.precio_base === "number" && Number.isFinite(datos.precio_base) && datos.precio_base > 0
    ? datos.precio_base : null;
  const objeto = String(datos.objeto_proceso == null ? "" : datos.objeto_proceso).slice(0, 4000);
  const unspsc = normalizarUnspsc(datos.unspsc);

  let parseado = null;
  try {
    parseado = parsearPliego(texto, { precio_base: precioBase });
  } catch (e) {
    return res.status(500).json({ ok: false, error: `Error interno al parsear la tabla: ${e.message}` });
  }

  if (!parseado.items.length) {
    /* «PDF sin tablas» es un resultado, no un fallo del servidor: se responde 200
       con la lista vacía y el DIAGNÓSTICO, que es lo que permite entender por
       qué. Devolver un 4xx haría creer que el envío estaba mal. */
    return res.status(200).json({
      ok: true,
      items: [],
      mensaje: "No se reconoció ninguna fila de ítem. Lo más probable es que el documento enviado no sea el "
        + "formulario de cantidades (pruebe con el «Formulario 1 · Presupuesto oficial»), o que el texto "
        + "llegara sin columnas. Revise «ejemplos_no_reconocidos» para ver qué se descartó.",
      confianza: { color: "rojo", motivo: "sin_filas" },
      diagnostico: parseado.diagnostico,
      unidades_aceptadas: [...UNIDADES_CANONICAS].sort(),
      ocr: ocr ? { paginas_leidas: ocr.paginas_leidas, truncado: ocr.truncado, fallos: ocr.fallos } : null,
      advertencia: ADVERTENCIA,
    });
  }

  let mapeado = null;
  try {
    mapeado = mapearTabla(parseado.items, { objeto_proceso: objeto, unspsc });
  } catch (e) {
    return res.status(500).json({ ok: false, error: `Error interno al mapear al catálogo: ${e.message}` });
  }

  /* Avisos que el dueño tiene que ver antes de usar la lista, en orden de
     gravedad. El del tope legal del anticipo NO es un aviso sobre el pliego: si
     el parseo produce más del 50 %, el parseo está mal (§1.G.5.bis). */
  const avisos = [];
  if (parseado.confianza.color === "rojo") {
    avisos.push("🔴 Menos del 90 % de las filas con precio cuadran aritméticamente: el parseo se considera "
      + "poco fiable y NO debe usarse como lista de cantidades sin revisarlo fila por fila.");
  } else if (parseado.confianza.color === "amarillo") {
    avisos.push(parseado.confianza.motivo === "sin_precios_unitarios"
      ? "🟡 El documento trae cantidades sin precios unitarios, así que no hay aritmética que validar. "
        + "La lista sigue siendo útil (ítem + unidad + cantidad ya permite valorar con precios propios), "
        + "pero exige confirmación humana."
      : "🟡 La lista no está completamente validada: exige confirmación humana antes de valorar.");
  }
  if (mapeado.resumen_mapeo.personalizados) {
    avisos.push(`${mapeado.resumen_mapeo.personalizados} ítem(s) no están en el catálogo y entraron como `
      + "«personalizados», con su descripción y unidad tal como venían. Eso no es un error: el pliego manda.");
  }
  if (mapeado.resumen_mapeo.revisar) {
    avisos.push(`${mapeado.resumen_mapeo.revisar} ítem(s) se mapearon con confianza intermedia: revíselos.`);
  }
  if (mapeado.resumen_mapeo.con_unidad_discrepante) {
    avisos.push(`${mapeado.resumen_mapeo.con_unidad_discrepante} ítem(s) traen una unidad distinta a la del `
      + "catálogo. Se conserva la DEL PLIEGO y no se convierte: pasar m² a m³ exigiría un espesor que el "
      + "catálogo no conoce.");
  }
  if (mapeado.resumen_mapeo.sin_cantidad) {
    avisos.push(`${mapeado.resumen_mapeo.sin_cantidad} ítem(s) quedaron SIN CANTIDAD legible. Viajan en `
      + "«null», nunca en 0: una cantidad de obra que en realidad es «no sé» es plata.");
  }
  if (parseado.anticipo && parseado.anticipo.excede_tope_legal) {
    avisos.push("El anticipo más el pago anticipado leídos superan el 50 % del valor del contrato, que es el "
      + "tope del parágrafo del art. 40 de la Ley 80 de 1993. Si el parseo produce más, EL PARSEO ESTÁ MAL: "
      + "confirme los dos porcentajes en la minuta.");
  }
  if (parseado.validacion.documento.estado === "diagnostico") {
    avisos.push("El pliego no declara AIU, así que el cuadre contra el presupuesto oficial es DIAGNÓSTICO y "
      + "nunca produce verde: con 25 puntos de parámetro libre casi cualquier suma encuentra un AIU que «cuadra».");
  }
  if (ocr && ocr.truncado) {
    avisos.push(`Se procesaron ${ocr.paginas_procesadas} de ${ocr.paginas_pedidas} páginas enviadas `
      + `(tope de ${MAX_PAGINAS_POR_LOTE} por llamada). Las restantes NO se leyeron.`);
  }

  return res.status(200).json({
    ok: true,
    items: mapeado.items,
    capitulos: parseado.capitulos,
    confianza: parseado.confianza,
    validacion: parseado.validacion,
    aiu_declarado: parseado.aiu_declarado,
    anticipo: parseado.anticipo,
    tipologias_probables: mapeado.tipologias_probables,
    tipologias_usadas: mapeado.tipologias_usadas,
    resumen_mapeo: mapeado.resumen_mapeo,
    diagnostico: parseado.diagnostico,
    ocr: ocr ? {
      usado: true, paginas_leidas: ocr.paginas_leidas, paginas_pedidas: ocr.paginas_pedidas,
      truncado: ocr.truncado, fallos: ocr.fallos,
    } : { usado: false },
    fuente: ocr ? "ocr" : "pdf_nativo",
    avisos,
    advertencia: ADVERTENCIA,
    como_leerlo: {
      confianza: "Semáforo de dos ejes: filas que cuadran (cantidad × unitario = total) × total que cuadra "
        + "con el AIU DECLARADO. Verde exige las dos cosas. Un total que solo cuadra por barrido nunca da verde.",
      cantidad: "«null» significa que no se pudo leer. NUNCA es 0: cero y «no sé» son cosas distintas.",
      unidad: "Se devuelve la unidad DEL PLIEGO, que es la que se va a pagar. «unidad_catalogo» es la del "
        + "catálogo y «unidad_discrepante» avisa si difieren. No se convierte nunca.",
      item_id: "Código del catálogo, o «null» con «personalizado: true» si ningún ítem alcanzó el umbral. "
        + "Todos los códigos son «LOC-»: no se publica un código INVÍAS sin haber abierto la especificación oficial.",
    },
  });
};
