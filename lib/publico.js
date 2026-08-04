/* ============================================================================
   lib/publico · Qué puede ver un cliente SIN credencial
   ----------------------------------------------------------------------------
   `/api/oportunidades` dejó de exigir token (ago 2026): los clientes entran por
   la web pública y solo necesitan ver a qué presentarse. Pero el veredicto de
   cada proceso se calcula con el patrimonio, la utilidad operacional y la
   liquidez de una PERSONA NATURAL identificada por nombre completo
   (lib/perfiles), y esas cifras no pueden salir sin credencial.

   La solución no es quitar las puertas —son el producto— sino servirlas SIN
   los números que las sostienen: el cliente ve «Caja ✗», el dueño ve «Caja ✗
   porque su patrimonio es $211 M y hacen falta $500 M».

   ────────────────────────────────────────────────────────────────────────────
   DOS COSAS QUE HAY QUE ENTENDER ANTES DE TOCAR ESTO
   ────────────────────────────────────────────────────────────────────────────
   1. NO BASTA CON BORRAR CAMPOS: LOS MENSAJES LLEVAN LAS CIFRAS DENTRO.
      `p2_k.mensaje` dice «…(CRPC $324M / K $5.799M)» y `p3_caja.mensaje` dice
      «…su patrimonio es $211.340.888». Anular `crp` y dejar el mensaje sería
      una redacción de mentira. Por eso aquí se sustituyen los DOS, y hay una
      prueba que serializa la respuesta pública entera y busca las cifras
      reales de los perfiles: si alguna aparece, falla.

   2. QUEDA UN CANAL DE INFERENCIA, Y ES DELIBERADO. El booleano de cada puerta
      sigue viajando (sin él la app no sirve para nada), y `pasa` de P3 es
      `patrimonio ≥ cuantía × 0,20`. Con muchos procesos de cuantías distintas
      se puede acotar el patrimonio por bisección hasta la granularidad de las
      cuantías disponibles. Es un límite REAL de servir el veredicto sin la
      credencial, no un descuido: la alternativa es no publicar el veredicto.
      Si algún día eso importa más que la utilidad de la app, la salida no es
      redactar mejor — es volver a exigir token.

   Los campos derivados de datos PÚBLICOS se conservan a propósito:
   `financiacion_requerida` sale de la cuantía publicada × 0,20 y `crpc` del
   presupuesto, el anticipo y el plazo. Ocultarlos no protegería nada y quitaría
   información que el cliente puede recalcular con la ficha del proceso.
   ========================================================================== */
"use strict";

/* Campos de `rup` que derivan de las finanzas del perfil. `tope_cop` entra
   aunque sea apetito estratégico y no un dato contable: revela el tamaño de
   contrato que la empresa se permite, que es información de negocio. */
const CAMPOS_RUP_FINANCIEROS = ["k_cop", "crpc_cop", "tope_cop", "co_estimado"];
/* De la puerta 2: `crp` es el K (derivado del patrimonio) y `tope` el mismo
   tope. `crpc` NO es sensible —sale del presupuesto, el anticipo y el plazo,
   todos públicos— pero se anula igual porque publicarlo junto a `pasa` da la
   desigualdad `crpc ≤ crp` y con ella una cota inferior directa del K. */
const CAMPOS_P2_FINANCIEROS = ["crp", "crpc", "tope"];
/* De la puerta 3: solo el patrimonio. `financiacion_requerida` se conserva. */
const CAMPOS_P3_FINANCIEROS = ["patrimonio"];

/* Mensajes públicos: dicen lo MISMO que los privados menos las cifras del
   perfil. Se conserva el importe a financiar porque es público (cuantía×0,20). */
const cop = (n) => `$${Math.round(Number(n) || 0).toLocaleString("es-CO")}`;

function mensajeP2Publico(p2) {
  if (p2.sin_dato) return "El proceso no publica cuantía: la capacidad de contratación no se puede verificar. Confírmela en el pliego.";
  if (!p2.pasa) return "La carga de este proceso supera su capacidad residual de contratación (K).";
  if (p2.dentro_de_tope === false) return "Cabe en su capacidad de contratación, pero supera su tope estratégico.";
  return "El proceso cabe en su capacidad residual de contratación (K).";
}

function mensajeP3Publico(p3) {
  if (p3.sin_dato) return "El proceso no publica cuantía: no se puede estimar cuánto habría que financiar.";
  const cuanto = `Necesitaría financiar ≈ ${cop(p3.financiacion_requerida)} antes del primer cobro`;
  return p3.pasa
    ? `${cuanto}, y su patrimonio alcanza.`
    : `${cuanto}, y su patrimonio no alcanza.`
      + (p3.anticipo_pct === 0 ? " El dataset no publica el anticipo: se asume 0 %, que es el supuesto conservador — verifíquelo en el pliego." : "");
}

/* Copia del resultado sin una sola cifra derivada de las finanzas del perfil.
   Los campos se ponen a `null` en vez de borrarse: un consumidor que espera la
   clave la sigue encontrando, y `null` dice «no se te sirve» en vez de dejar
   que un `undefined` se lea como cero — que es el defecto que este proyecto ya
   pagó una vez con `i.total_procesos || 0`. */
function sinFinanzas(resultado) {
  if (!resultado || typeof resultado !== "object") return resultado;
  const out = { ...resultado };

  if (out.rup && typeof out.rup === "object") {
    out.rup = { ...out.rup };
    for (const c of CAMPOS_RUP_FINANCIEROS) if (c in out.rup) out.rup[c] = null;
  }

  if (out.puertas && typeof out.puertas === "object") {
    const p = { ...out.puertas };
    if (p.p2_k) {
      const p2 = { ...p.p2_k };
      for (const c of CAMPOS_P2_FINANCIEROS) if (c in p2) p2[c] = null;
      p2.mensaje = mensajeP2Publico(p.p2_k);
      p.p2_k = p2;
    }
    if (p.p3_caja) {
      const p3 = { ...p.p3_caja };
      for (const c of CAMPOS_P3_FINANCIEROS) if (c in p3) p3[c] = null;
      p3.mensaje = mensajeP3Publico(p.p3_caja);
      p.p3_caja = p3;
    }
    out.puertas = p;
  }

  return out;
}

module.exports = {
  sinFinanzas,
  CAMPOS_RUP_FINANCIEROS, CAMPOS_P2_FINANCIEROS, CAMPOS_P3_FINANCIEROS,
  mensajeP2Publico, mensajeP3Publico,
};
