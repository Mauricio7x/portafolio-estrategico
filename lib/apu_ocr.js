/* ============================================================================
   lib/apu_ocr · OCR de páginas escaneadas vía OCR.space (respaldo, no vía principal)
   ----------------------------------------------------------------------------
   POR QUÉ UN SERVICIO EXTERNO Y NO TESSERACT. `tesseract.js` es WASM con datos
   entrenados de decenas de MB y segundos por página: «No en el mismo proceso …
   exige servicio externo o proceso local» (docs/APU_Y_RENTABILIDAD.md §1.G.3).
   Meterlo aquí rompería además la invariante del proyecto de no tener
   `package.json` ni dependencias. OCR.space se llama con `fetch` nativo y no
   añade ni una línea de dependencia.

   POR QUÉ EL NAVEGADOR MANDA IMÁGENES DE PÁGINA Y NO EL PDF ENTERO. El plan
   gratuito de OCR.space topa el TAMAÑO DE FICHERO (≈1 MB) y el número de páginas
   por petición, y el cuerpo de una función de Vercel topa en ~4,5 MB. Un pliego
   escaneado de 40 páginas no cabe por ninguno de los dos lados. Así que
   `public/apu.js` rasteriza cada página con pdf.js a JPEG y las manda de a poco:
   cada página es una petición, el progreso es visible y una página que falle no
   se lleva el documento entero.

   POR QUÉ NO SE LLAMA DESDE EL NAVEGADOR. Sería una petición menos, pero la
   `apikey` quedaría en el código del cliente, es decir publicada. El token del
   proyecto protege este endpoint y la clave nunca sale del servidor.

   `isTable=true` SE MANDA SIEMPRE, pero midiendo lo que promete: devuelve el
   texto **línea a línea**, respetando la fila. NO promete columnas separadas ni
   coordenadas — eso solo lo da pdf.js sobre un PDF nativo. Consecuencia
   práctica: el texto de OCR casi nunca activa la vía POSICIONAL de
   `lib/apu_pliego`; lo normal es que caiga en la vía por FIRMA DE UNIDAD o en la
   APLANADA, que existen precisamente por esto. De ahí que el OCR sea un respaldo
   y no la vía principal: se lee peor y hay que decirlo, no disimularlo con una
   opción de nombre tranquilizador.

   SIN CLAVE NO SE INVENTA NADA: se responde diciendo que hace falta configurar
   `OCRSPACE_API_KEY`, igual que `HISTORICO_TOKEN` responde 503 cuando no está.
   Nunca hay un default que valga como llave.
   ========================================================================== */
"use strict";

const OCR_URL = "https://api.ocr.space/parse/image";

/* Límites del plan gratuito. Son [CONOCIDO]: la documentación de OCR.space no se
   pudo abrir para confirmarlos, así que se aplican como cotas PROPIAS —conservar
   un margen y fallar con un mensaje claro antes de gastar la petición— y no como
   una transcripción de su tarifa. Si el servicio los cambia, el que manda es su
   respuesta, no este archivo. */
const MAX_BYTES_IMAGEN = 1024 * 1024;        // ~1 MB por fichero en el plan free
const MAX_PAGINAS_POR_LOTE = 5;              // tope propio: cada página es una petición
const TIMEOUT_MS = 25000;
const REINTENTOS = 2;
const IDIOMA = "spa";

const hayClaveOcr = () => Boolean(process.env.OCRSPACE_API_KEY);

const MENSAJE_SIN_CLAVE = "El OCR no está configurado en este despliegue. "
  + "Añada la variable de entorno OCRSPACE_API_KEY en Vercel (Settings → Environment Variables) "
  + "con una clave gratuita de https://ocr.space/ocrapi y vuelva a desplegar — las variables "
  + "solo entran en despliegues nuevos. Mientras no esté, un PDF escaneado no se puede leer: "
  + "extraiga la tabla a mano o consiga el formulario de cantidades en Excel.";

/* Tamaño real de un base64, sin materializar el Buffer: 4 caracteres → 3 bytes,
   menos el relleno. Un `Buffer.from()` solo para medir duplicaría en memoria
   cada página de un pliego de 40. */
function bytesDeBase64(b64) {
  const limpio = String(b64 || "").replace(/^data:[^;]*;base64,/, "").replace(/\s+/g, "");
  if (!limpio) return 0;
  const relleno = (limpio.match(/=+$/) || [""])[0].length;
  return Math.floor((limpio.length * 3) / 4) - relleno;
}

/* OCR.space exige el prefijo `data:<mime>;base64,` en `base64Image`. Sin él
   responde un error genérico que no dice qué falta. */
function conPrefijoData(b64, mime) {
  const s = String(b64 || "").replace(/\s+/g, "");
  if (/^data:[^;]*;base64,/.test(s)) return s;
  return `data:${mime || "image/jpeg"};base64,${s}`;
}

const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

/* Backoff con jitter, honrando `Retry-After`, y la misma regla que rige el
   cliente de Socrata: un 4xx NO se reintenta (es un problema de la petición y
   repetirla gasta cuota del plan gratuito); 429 y 5xx sí. */
function esperaDe(respuesta, intento) {
  const cabecera = respuesta && respuesta.headers && respuesta.headers.get("retry-after");
  const segundos = cabecera ? parseInt(cabecera, 10) : NaN;
  if (Number.isFinite(segundos) && segundos > 0) return Math.min(segundos * 1000, 20000);
  return Math.min(1000 * 2 ** intento, 8000) + Math.floor(Math.random() * 500);
}

/**
 * OCR de UNA página.
 * @param {object} pagina { base64, mime } o { url }
 * @returns {Promise<{ok:boolean, texto?:string, error?:string, status?:number, detalle?:any}>}
 */
async function ocrPagina(pagina, opciones = {}) {
  const clave = process.env.OCRSPACE_API_KEY || "";
  if (!clave) return { ok: false, status: 503, error: MENSAJE_SIN_CLAVE, sin_clave: true };

  const cuerpo = new URLSearchParams();
  cuerpo.set("language", opciones.idioma || IDIOMA);
  cuerpo.set("isOverlayRequired", "false");
  cuerpo.set("scale", "true");            // mejora páginas de baja resolución
  cuerpo.set("isTable", "true");          // texto línea a línea (no columnas): ver cabecera
  cuerpo.set("OCREngine", "2");           // motor 2: mejor con tablas y números
  cuerpo.set("detectOrientation", "true");

  if (pagina && pagina.url) {
    cuerpo.set("url", String(pagina.url));
  } else if (pagina && pagina.base64) {
    const bytes = bytesDeBase64(pagina.base64);
    if (!bytes) return { ok: false, status: 400, error: "La imagen llegó vacía." };
    if (bytes > MAX_BYTES_IMAGEN) {
      return {
        ok: false, status: 413,
        error: `La página pesa ${Math.round(bytes / 1024)} KB y el plan gratuito de OCR.space topa en `
          + `${Math.round(MAX_BYTES_IMAGEN / 1024)} KB. Baje la escala de rasterizado y reintente.`,
      };
    }
    cuerpo.set("base64Image", conPrefijoData(pagina.base64, pagina.mime));
    if (pagina.mime === "application/pdf") cuerpo.set("filetype", "PDF");
  } else {
    return { ok: false, status: 400, error: "Se esperaba «base64» o «url» para la página." };
  }

  let ultimo = null;
  for (let intento = 0; intento <= REINTENTOS; intento++) {
    let r = null;
    const corte = AbortSignal.timeout ? AbortSignal.timeout(TIMEOUT_MS) : undefined;
    try {
      r = await fetch(OCR_URL, {
        method: "POST",
        headers: { apikey: clave, "Content-Type": "application/x-www-form-urlencoded" },
        body: cuerpo.toString(),
        signal: corte,
      });
    } catch (e) {
      ultimo = { ok: false, status: 504, error: `No se pudo contactar OCR.space: ${(e && e.message) || "error de red"}.` };
      if (intento < REINTENTOS) { await esperar(esperaDe(null, intento)); continue; }
      return ultimo;
    }

    if (r.status === 429 || r.status >= 500) {
      ultimo = { ok: false, status: r.status, error: `OCR.space respondió ${r.status}.` };
      if (intento < REINTENTOS) { await esperar(esperaDe(r, intento)); continue; }
      return ultimo;
    }
    if (!r.ok) {
      // 4xx: no se reintenta. Repetir gasta cuota y el resultado sería el mismo.
      const texto = await r.text().catch(() => "");
      return {
        ok: false, status: r.status,
        error: r.status === 401 || r.status === 403
          ? "OCR.space rechazó la clave (OCRSPACE_API_KEY). Verifíquela en https://ocr.space/ocrapi."
          : `OCR.space respondió ${r.status}: ${String(texto).slice(0, 200)}`,
      };
    }

    let json = null;
    try { json = await r.json(); } catch (e) {
      return { ok: false, status: 502, error: `OCR.space devolvió una respuesta ilegible: ${(e && e.message) || "no es JSON"}.` };
    }

    /* OCR.space señala el fallo DENTRO de un 200: `IsErroredOnProcessing` y
       `OCRExitCode` (1 = todo, 2 = parcial, 3 = fallo, 4 = fatal). Tratar el 200
       como éxito devolvería texto vacío como si la página no tuviera nada. */
    const salida = Number(json.OCRExitCode);
    if (json.IsErroredOnProcessing || salida === 3 || salida === 4) {
      const detalle = [].concat(json.ErrorMessage || [], json.ErrorDetails || []).filter(Boolean).join(" · ");
      return {
        ok: false, status: 422,
        error: `OCR.space no pudo procesar la página${detalle ? `: ${String(detalle).slice(0, 300)}` : "."}`,
        codigo_salida: Number.isFinite(salida) ? salida : null,
      };
    }

    const partes = (json.ParsedResults || []).map((p) => String((p && p.ParsedText) || ""));
    const texto = partes.join("\n").replace(/\r\n?/g, "\n").trim();
    if (!texto) {
      return {
        ok: false, status: 422,
        error: "OCR.space procesó la página pero no encontró texto. Puede ser una página en blanco, "
          + "un plano, o un escaneo demasiado pobre para reconocer.",
        codigo_salida: Number.isFinite(salida) ? salida : null,
      };
    }
    return {
      ok: true, texto,
      parcial: salida === 2,
      ms: Number(json.ProcessingTimeInMilliseconds) || null,
      paginas: partes.length,
    };
  }
  return ultimo || { ok: false, status: 502, error: "OCR.space no respondió." };
}

/**
 * OCR de varias páginas, en serie y con tope. En serie a propósito: en paralelo
 * el plan gratuito devuelve 429 y se pierde el lote entero. Una página que falla
 * NO cancela las demás — se registra y se sigue, porque 39 páginas leídas valen
 * mucho más que un error global.
 */
async function ocrPaginas(paginas, opciones = {}) {
  if (!hayClaveOcr()) return { ok: false, status: 503, error: MENSAJE_SIN_CLAVE, sin_clave: true };
  const lista = Array.isArray(paginas) ? paginas : [];
  if (!lista.length) return { ok: false, status: 400, error: "No llegó ninguna página para procesar." };
  const tope = Math.min(lista.length, opciones.max_paginas || MAX_PAGINAS_POR_LOTE);

  const textos = [];
  const fallos = [];
  for (let i = 0; i < tope; i++) {
    const r = await ocrPagina(lista[i], opciones);
    if (r.ok) textos.push(r.texto);
    else fallos.push({ pagina: i + 1, error: r.error, status: r.status });
    // sin clave o cuota agotada: seguir es tirar el resto del lote a la basura
    if (!r.ok && (r.sin_clave || r.status === 401 || r.status === 403)) break;
  }

  return {
    ok: textos.length > 0,
    texto: textos.join("\n"),
    paginas_leidas: textos.length,
    paginas_pedidas: lista.length,
    paginas_procesadas: tope,
    // se DICE lo que se dejó fuera: un tope silencioso se lee como «se leyó todo»
    truncado: lista.length > tope,
    fallos,
    error: textos.length ? null : (fallos[0] && fallos[0].error) || "Ninguna página se pudo leer.",
    status: textos.length ? 200 : ((fallos[0] && fallos[0].status) || 502),
  };
}

module.exports = {
  OCR_URL, MAX_BYTES_IMAGEN, MAX_PAGINAS_POR_LOTE, IDIOMA, MENSAJE_SIN_CLAVE,
  hayClaveOcr, bytesDeBase64, conPrefijoData, ocrPagina, ocrPaginas,
};
