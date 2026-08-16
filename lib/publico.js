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

/* Sustituto del motivo del ajuste por baja de mercado en la respuesta pública.
   Dice QUE el ajuste existe y por qué está tapado — no lo esconde, que sería
   otra forma de mentir— pero no lleva ninguna cifra dentro. */
const MOTIVO_BAJA_PUBLICO = "El descuento típico de esta entidad ajusta la probabilidad. "
  + "La cifra es inteligencia de precio y requiere credencial.";
/* Desde ago 2026 (A4) el ajuste se llama `precio` y su motivo lleva la mediana
   de la entidad Y la baja máxima del dueño: se redacta igual. `baja_mercado` se
   conserva en la lista por si un consumidor guardó una respuesta anterior. */
const AJUSTES_CON_CIFRA_DE_PRECIO = new Set(["baja_mercado", "precio"]);

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

  /* BAJA DE MERCADO — inteligencia de precio, solo con credencial.
     A diferencia del resto de lo que se redacta aquí, esto NO son las finanzas
     del dueño: es mercado, derivado de adjudicaciones públicas de SECOP. Se
     oculta por decisión de negocio (dice A QUÉ PRECIO se gana en cada entidad,
     que es la ventaja competitiva que la app construye), no porque exponerlo
     revele un dato personal.
     Y se anulan los TRES campos, no solo los escalares: `baja_mercado.mensaje`
     dice «Descuento típico del 8 % …» y dejarlo sería la misma redacción de
     mentira que dejaba el patrimonio dentro del texto de P3. */
  out.baja_entidad = null;
  out.baja_segmento = null;
  if ("baja_mercado" in out) out.baja_mercado = null;
  /* La baja MÁXIMA del proceso sale del APU del dueño (su costo): finanzas del
     perfil, nunca sin token. El listado ya no la calcula sin credencial; esto
     es defensa en profundidad. */
  if ("baja_maxima" in out) out.baja_maxima = { valor: null, origen: null, borrador: null };

  /* …Y EL MISMO NÚMERO IBA DENTRO DEL DESGLOSE DE `p_ganar` (ago 2026).
     `p_ganar_detalle.ajustes` traía `{nombre:"baja_mercado", factor:0.85,
     motivo:"la entidad adjudica ~8 % por debajo del presupuesto…"}` y no lo
     tocaba nadie: se anulaban los tres campos de arriba y la cifra salía igual,
     en texto, por la puerta de al lado. Es EXACTAMENTE el defecto que ya se
     corrigió en `p2_k.mensaje` y `p3_caja.mensaje` —redactar el campo y dejar el
     número dentro de la frase— repetido en un tercer sitio.
     Desde que el factor es una RAMPA además es INVERTIBLE: de un ×0,9333 se
     despeja la mediana. Se anulan los dos: el factor y su motivo.

     CUÁNTO SE FILTRA DE VERDAD, MEDIDO Y SIN EXAGERAR. Queda abierto el canal
     ARITMÉTICO: `p_ganar`, `base` y `rivales_esperados` siguen viajando (son la
     honestidad del número: «la probabilidad viaja SIEMPRE con su fuente») y los
     otros dos factores son constantes conocidas, así que
     `p / base ÷ 1,20^prórroga ÷ 1,15^colisión` devuelve el factor de baja.
     Pero eso NO da la mediana exacta: `lib/indice_baja` publica la mediana como
     una CUBETA ENTERA del histograma (`Math.round`), así que dentro de la banda
     solo existen 3 y 4, y fuera la rampa satura. El canal distingue CUATRO
     clases —{≤2 → 1,10 · 3 → 1,0167 · 4 → 0,9333 · ≥5 → 0,85}— donde antes
     distinguía tres. Es el mismo canal de inferencia de RANGO que CLAUDE.md ya
     declara aceptado para `ordenar_por=baja`, una clase más ancho; no es una
     fuga nueva ni revela el valor. Cerrarlo del todo exigiría anular también
     `base` y `rivales_esperados`, que es quitarle al cliente público la
     explicación de de dónde sale su propia probabilidad — un cambio de producto,
     no una corrección, y por eso no se toma aquí. */
  if (out.p_ganar_detalle && typeof out.p_ganar_detalle === "object"
      && Array.isArray(out.p_ganar_detalle.ajustes)) {
    out.p_ganar_detalle = {
      ...out.p_ganar_detalle,
      ajustes: out.p_ganar_detalle.ajustes.map((a) => (a && AJUSTES_CON_CIFRA_DE_PRECIO.has(a.nombre)
        ? { nombre: a.nombre, factor: null, motivo: MOTIVO_BAJA_PUBLICO }
        : a)),
    };
  }

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
