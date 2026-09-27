/* ============================================================================
   lib/objetos · El almacén de archivos (compatible con S3), sin dependencias
   ----------------------------------------------------------------------------
   Para qué existe (27-sep-2026, docs/INFRAESTRUCTURA_2026-09-27.md): el
   histórico y los datos que el usuario teclea vivían SOLO en Upstash. Una parte
   del histórico no se puede volver a bajar de SECOP (las señales de prórroga que
   la aplicación anota desde el 16-ago-2026), así que perder la base era perderla
   para siempre. Este módulo habla con un almacén de archivos FUERA de Upstash
   —Cloudflare R2, o cualquiera que entienda la API de S3— para guardar la copia
   nocturna (lib/respaldo).

   Sin SDK: la firma AWS Signature Version 4 se calcula con `crypto` nativo y se
   comprueba en la suite contra los dos ejemplos PUBLICADOS por AWS («Signature
   Calculations for the Authorization Header: Transferring Payload in a Single
   Chunk»: GET con rango → f0e8bdb8…, PUT con cuerpo → 98ad7217…). Una prueba
   que comparara la firma con otra copia de esta misma función no probaría nada.

   Configuración (docs/CONFIGURACION_TOKENS.md explica de dónde sale cada una):
     OBJETOS_ENDPOINT        https://<cuenta>.r2.cloudflarestorage.com
     OBJETOS_BUCKET          el nombre del almacén (bucket)
     OBJETOS_ACCESS_KEY_ID   la llave de acceso
     OBJETOS_SECRET_ACCESS_KEY el secreto de esa llave
     OBJETOS_REGION          opcional; R2 usa «auto» (por defecto)
   Sin las cuatro primeras, `faltan()` las nombra y quien llama responde qué
   hacer: jamás una copia que «salió bien» sin haberse guardado.

   Direcciones «path-style» (endpoint/bucket/clave): R2 las acepta y así el
   dominio del almacén no depende del nombre del bucket.
   ========================================================================== */
"use strict";

const crypto = require("crypto");

const TIMEOUT_MS = 60000;
const VARIABLES = ["OBJETOS_ENDPOINT", "OBJETOS_BUCKET", "OBJETOS_ACCESS_KEY_ID", "OBJETOS_SECRET_ACCESS_KEY"];

const sha256 = (d) => crypto.createHash("sha256").update(d).digest("hex");
const hmac = (k, d) => crypto.createHmac("sha256", k).update(d).digest();

function faltan(env = process.env) {
  return VARIABLES.filter((v) => !String(env[v] || "").trim());
}
const hayCredencialesObjetos = (env = process.env) => faltan(env).length === 0;

/* Codificación de un segmento de ruta según SigV4 (RFC 3986: solo A-Z a-z 0-9
   - _ . ~ quedan tal cual). `encodeURIComponent` deja pasar ! ' ( ) *. */
function codificar(segmento) {
  return encodeURIComponent(segmento).replace(/[!'()*]/g, (ch) => "%" + ch.charCodeAt(0).toString(16).toUpperCase());
}
const rutaCodificada = (partes) => "/" + partes.map((p) => String(p).split("/").map(codificar).join("/")).join("/");

/* La firma, pura: mismas entradas, misma salida (la suite la ejecuta contra los
   ejemplos de AWS). `cabeceras` son las que se FIRMAN, todas; `host` incluido. */
function firmar({ metodo, ruta, query = "", cabeceras, hashCuerpo, amzFecha, llave, secreto, region, servicio = "s3" }) {
  const dia = amzFecha.slice(0, 8);
  const nombres = Object.keys(cabeceras).map((k) => k.toLowerCase()).sort();
  const valor = (n) => String(cabeceras[Object.keys(cabeceras).find((k) => k.toLowerCase() === n)]).trim().replace(/\s+/g, " ");
  const firmadas = nombres.join(";");
  const canonica = [metodo, ruta, query, nombres.map((n) => `${n}:${valor(n)}\n`).join(""), firmadas, hashCuerpo].join("\n");
  const alcance = `${dia}/${region}/${servicio}/aws4_request`;
  const aFirmar = ["AWS4-HMAC-SHA256", amzFecha, alcance, sha256(canonica)].join("\n");
  let k = hmac("AWS4" + secreto, dia);
  k = hmac(k, region); k = hmac(k, servicio); k = hmac(k, "aws4_request");
  const firma = crypto.createHmac("sha256", k).update(aFirmar).digest("hex");
  return {
    firma,
    autorizacion: `AWS4-HMAC-SHA256 Credential=${llave}/${alcance}, SignedHeaders=${firmadas}, Signature=${firma}`,
  };
}

const amzAhora = (d = new Date()) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");

/* El secreto y la llave jamás salen en un mensaje de error: la regla es UNA,
   el censo de lib/apu_ocr (que ya los incluye), y aquí se llama, no se copia.
   El require va diferido: este módulo no necesita el OCR para nada más. */
const tachar = (texto) => require("./apu_ocr.js").tacharClave(texto);

function crearObjetos(env = process.env) {
  const falta = faltan(env);
  if (falta.length) {
    const e = new Error(`Falta configurar el almacén de archivos: ${falta.join(", ")}.`);
    e.faltan = falta;
    throw e;
  }
  const base = String(env.OBJETOS_ENDPOINT).trim().replace(/\/+$/, "");
  const url = new URL(base);
  const bucket = String(env.OBJETOS_BUCKET).trim();
  const region = String(env.OBJETOS_REGION || "auto").trim() || "auto";
  const llave = String(env.OBJETOS_ACCESS_KEY_ID).trim();
  const secreto = String(env.OBJETOS_SECRET_ACCESS_KEY).trim();
  const prefijoRuta = url.pathname.replace(/\/+$/, "");

  async function pedir(metodo, clave, cuerpo, tipo) {
    const ruta = prefijoRuta + rutaCodificada([bucket, clave]);
    const datos = cuerpo == null ? Buffer.alloc(0) : Buffer.isBuffer(cuerpo) ? cuerpo : Buffer.from(String(cuerpo), "utf8");
    const hashCuerpo = sha256(datos);
    const amzFecha = amzAhora();
    const cabeceras = { host: url.host, "x-amz-content-sha256": hashCuerpo, "x-amz-date": amzFecha };
    if (tipo) cabeceras["content-type"] = tipo;
    const { autorizacion } = firmar({ metodo, ruta, cabeceras, hashCuerpo, amzFecha, llave, secreto, region });
    const enviar = { ...cabeceras, authorization: autorizacion };
    delete enviar.host; // lo pone fetch con el mismo valor
    let r;
    try {
      r = await fetch(`${url.protocol}//${url.host}${ruta}`, {
        method: metodo, headers: enviar,
        body: metodo === "PUT" ? datos : undefined,
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
    } catch (e) {
      throw new Error(tachar(`El almacén de archivos no respondió (${metodo}): ${e && e.message}`));
    }
    return r;
  }

  /* Un fallo del almacén se dice con su código y un trozo del cuerpo (el XML de
     S3 trae el motivo: «SignatureDoesNotMatch», «NoSuchBucket»…), tachado. */
  async function fallo(r, metodo, clave) {
    let cuerpo = "";
    try { cuerpo = (await r.text()).slice(0, 300); } catch { /* sin cuerpo */ }
    const e = new Error(tachar(`El almacén de archivos respondió ${r.status} al ${metodo} de «${clave}»${cuerpo ? `: ${cuerpo}` : ""}`));
    e.status = r.status;
    return e;
  }

  return {
    bucket,
    async poner(clave, cuerpo, tipo = "application/octet-stream") {
      const r = await pedir("PUT", clave, cuerpo, tipo);
      if (!r.ok) throw await fallo(r, "PUT", clave);
      return { etag: r.headers.get("etag") || null };
    },
    /* Un objeto que no existe es `null` («no hay copia»), no un error ni un
       Buffer vacío: vacío y ausente son cosas distintas. */
    async traer(clave) {
      const r = await pedir("GET", clave);
      if (r.status === 404) return null;
      if (!r.ok) throw await fallo(r, "GET", clave);
      return Buffer.from(await r.arrayBuffer());
    },
  };
}

module.exports = { VARIABLES, faltan, hayCredencialesObjetos, crearObjetos, firmar, rutaCodificada, amzAhora, sha256, TIMEOUT_MS };
