/* lib/contexto_vercel · El contexto de la petición de Vercel, o null (9-nov-2026)

   Es lo que hace `getContext()` de @vercel/functions: un símbolo global que el
   entorno de ejecución de Vercel pone. Su `waitUntil` deja que la función siga
   viva después de responder. Vivía en lib/autollamada (que lo reexporta); se
   separó para que lib/medidor_redis, que carga lib/redis, no arrastre la cadena
   de lib/autollamada (que alcanza apu/, fuera de la cerca de lib/filtros). */
"use strict";

function contextoDeVercel() {
  try {
    const almacen = globalThis[Symbol.for("@vercel/request-context")];
    const ctx = almacen && typeof almacen.get === "function" ? almacen.get() : null;
    return ctx && typeof ctx.waitUntil === "function" ? ctx : null;
  } catch { return null; }
}

module.exports = { contextoDeVercel };
