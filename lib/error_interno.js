/* ============================================================================
   lib/error_interno · La respuesta JSON de un fallo que nadie capturó (6-sep-2026)
   ----------------------------------------------------------------------------
   Los seis routers de api/ hacían `return h()(req, res)` sin try: un throw
   dentro de un handler rechazaba la promesa y la plataforma respondía un 500
   SIN JSON, que el navegador solo podía traducir a un consejo genérico. Aquí
   vive la ÚNICA copia de la forma de esa respuesta —un solo texto, en registro
   de usted, que dice qué hacer— para que seis routers no la deriven cada uno
   por su lado. No decide nada ni autoriza nada: los routers siguen sin lógica.

   El detalle (mensaje y pila) va al registro del servidor, NUNCA al cuerpo: un
   500 con la pila era un oráculo de rutas y de nombres internos.
   Módulo HOJA: no requiere nada.
   ========================================================================== */
"use strict";

const MENSAJE_ERROR_INTERNO = "Error interno al preparar la respuesta. Vuelva a intentarlo en un minuto; "
  + "si el fallo persiste, avise a quien administra la aplicación.";

/* LA BASE DE DATOS LLENA (30-sep-2026). Del 28 al 30-sep producción respondió «Error interno» a todo lo
   que guarda —leer los documentos, la sincronización, el latido— y la causa real solo apareció en el
   registro de un flujo de GitHub: «ERR DB capacity quota exceeded. Threshold: 268435456 bytes, Usage:
   276006634 bytes» (el plan gratuito de Upstash admite 256 MB; lleno, rechaza las escrituras y deja leer y
   borrar). Un fallo que tiene nombre se dice con su nombre y con qué hacer: la cifra es la de Upstash,
   tal cual; si el texto no la trae, va null («no sé»), nunca 0. */
const BASE_LLENA_RE = /DB capacity quota exceeded/i;
function baseLlenaDe(texto) {
  const t = String(texto || "");
  if (!BASE_LLENA_RE.test(t)) return null;
  const num = (re) => { const m = re.exec(t); return m ? Number(m[1]) : null; };
  return { limite_bytes: num(/Threshold:\s*(\d+)\s*bytes/i), uso_bytes: num(/Usage:\s*(\d+)\s*bytes/i) };
}
const mb = (b) => (b == null ? null : `${Math.round(b / 1048576)} MB`);
function mensajeBaseLlena(llena) {
  const cifras = llena && llena.uso_bytes != null && llena.limite_bytes != null ? ` (usa ${mb(llena.uso_bytes)} de ${mb(llena.limite_bytes)})` : "";
  return {
    error: `La base de datos de la aplicación está llena${cifras}: no se puede guardar nada nuevo hasta que se amplíe o se libere espacio. Lo ya guardado se sigue viendo.`,
    que_hacer: "Quien administra la aplicación entra a upstash.com, abre la base de datos y la pasa al plan de pago por uso (Upgrade, con tarjeta; admite un tope de gasto mensual), o borra datos que se puedan rehacer.",
  };
}

function responderErrorInterno(res, dominio, e) {
  console.error(`[api/${dominio}] fallo no capturado:`, (e && e.stack) || e);
  // si el handler ya empezó a responder no hay cabeceras que cambiar
  if (res && res.headersSent) return undefined;
  const llena = baseLlenaDe(e && e.message);
  if (llena) return res.status(503).json({ ok: false, motivo: "base_llena", ...mensajeBaseLlena(llena), ...llena });
  return res.status(500).json({ ok: false, error: MENSAJE_ERROR_INTERNO });
}

/* NINGUNA RESPUESTA DE ERROR LLEVA UNA LLAVE DEL ENTORNO (18-oct-2026). 59 respuestas de error de
   22 handlers devolvían `${e.message}` sin tachar (Redis, OCR, SECOP…), y solo algunas pasaban por
   `tacharClave`: una lista de sitios deja huecos y el siguiente error escrito vuelve por ellos. Aquí
   se tacha UNA vez, en el único sitio por donde pasan los seis routers: toda respuesta con estado
   ≥ 400 recorre sus textos y reemplaza el valor de cada secreto del entorno por «clave tachada». Las
   respuestas 2xx/3xx no se tocan (ni se recorren: cero CPU de más en el camino normal). La regla de
   qué es secreto NO se reescribe aquí: se llama a `tacharClave` de lib/apu_ocr (require diferido,
   para que este módulo siga sin requerir nada al cargarse). */
function tacharTextos(valor, tachar, prof = 0) {
  if (typeof valor === "string") return tachar(valor);
  if (valor == null || typeof valor !== "object") return valor;
  // más hondo que esto no se recorre, pero tampoco sale crudo: va como texto tachado (revisión adversaria)
  if (prof > 8) return tachar(JSON.stringify(valor));
  if (Array.isArray(valor)) return valor.map((v) => tacharTextos(v, tachar, prof + 1));
  // Date, Buffer y demás objetos no planos se dejan como están: aplanarlos los deformaba
  if (Object.getPrototypeOf(valor) !== Object.prototype && Object.getPrototypeOf(valor) !== null) return valor;
  const salida = {};
  for (const [k, v] of Object.entries(valor)) salida[k] = tacharTextos(v, tachar, prof + 1);
  return salida;
}
/* Solo se envuelve `res.json`: es lo único con lo que responden los handlers (censo del 18-oct-2026), y
   envolver `res.send` arriesgaba pasar dos veces por el tachado si el `json` del runtime lo usa por dentro,
   donde la regla de «apikey=…» se come las comillas de un JSON ya serializado. */
function conLlavesTachadas(res) {
  if (!res || res.__llavesTachadas) return res;
  let estado = typeof res.statusCode === "number" ? res.statusCode : 200;
  const status0 = typeof res.status === "function" ? res.status.bind(res) : null;
  const json0 = typeof res.json === "function" ? res.json.bind(res) : null;
  const tachar = (t) => require("./apu_ocr.js").tacharClave(t);
  if (status0) res.status = (n) => { estado = Number(n) || estado; status0(n); return res; };
  if (json0) {
    res.json = (o) => {
      if (estado < 400) return json0(o);
      let limpio;
      try { limpio = tacharTextos(o, tachar); } catch { limpio = { ok: false, error: MENSAJE_ERROR_INTERNO }; }
      return json0(limpio);
    };
  }
  res.__llavesTachadas = true;
  return res;
}

module.exports = { responderErrorInterno, MENSAJE_ERROR_INTERNO, baseLlenaDe, mensajeBaseLlena, conLlavesTachadas };
