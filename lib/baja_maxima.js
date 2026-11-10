/* ============================================================================
   lib/baja_maxima · hasta dónde puede bajar el dueño en CADA proceso (A4)
   ----------------------------------------------------------------------------
   El factor de precio de P(ganar) (lib/probabilidad.factorPrecio) necesita
   `b_max`: la baja máxima que el dueño soporta sin perder plata. Este módulo la
   resuelve, en orden:
     1. del PRESUPUESTO GUARDADO del proceso en el editor de APU (borrador con
        `costo_directo_guardado` e `id_proceso`): b_max = 1 − piso_rentable /
        presupuesto_oficial, con la MISMA `pisoTecho` del panel Piso/Techo —
        el piso ya lleva las deducciones cargadas y la contribución especial
        CUANDO el tipo de trabajo la causa (ver `contribucionPctDe`);
     2. si no hay borrador, la DECLARADA (`?baja_max=`);
     3. si no hay ninguna, null ⇒ el factor de precio es neutro.
   La leen /api/procesos?op=listar (la tarjeta) y la vista `probabilidad` de
   /api/inteligencia (el desglose): si divergieran, el desglose explicaría una
   probabilidad que la lista no calculó, y hay prueba de que reproducen la
   misma `p`. Por eso vive en un módulo y no copiado en los dos handlers.

   Los borradores se leen con SCAN + MGET sobre las propias claves (la clave es
   la fuente de verdad: un índice aparte con TTL se desincroniza al caducar un
   borrador). Un borrador guardado antes de que se guardara el costo directo
   cuenta en `sin_costo` y no sirve. Si hay varios del mismo proceso manda el
   más reciente.
   ========================================================================== */
"use strict";

const { CLAVES, descomprimir } = require("./almacen.js");
const { pisoTecho } = require("./apu/piso_techo.js");

/* La CONFIGURACIÓN MÁS RECIENTE del usuario (administración, imprevistos,
   ganancia, deducciones de acta) sale del último borrador guardado — de
   CUALQUIERA, también de los que no tienen costo: la estructura de precio es
   suya y no del proceso. La usa `lib/ganancia` para estimar lo que deja un
   proceso que todavía no ha costeado, y sale gratis: los borradores ya están
   leídos aquí. Sin ningún borrador viaja `null` y quien la consuma usa el
   defecto documentado Y LO DECLARA — jamás se le atribuye al usuario una
   estructura de precio que nunca escribió. */
/* `leido` (10-nov-2026, el precio del expediente): una lectura que FALLA devolvía lo mismo que un perfil sin
   borradores, y el expediente habría dicho «todavía no ha calculado su precio» cuando solo no pudo leerlo —un «no sé»
   convertido en un hecho—. `leido: false` si el SCAN falló; `incompleto: true` si algún lote del MGET falló (lo que
   faltó podía ser justo el borrador del proceso). Quien solo necesita lo que haya (la lista, el desglose) lo ignora. */
async function cargarCostosPorProceso(redis, perfil) {
  const porProceso = new Map();
  let claves = [];
  try { claves = await redis.scan(CLAVES.patronApuPerfil(perfil)); } catch { return { porProceso, borradores: 0, sin_costo: 0, config_reciente: null, config_guardado: null, leido: false, incompleto: false }; }
  let borradores = 0, sinCosto = 0, incompleto = false;
  const sinCostoPorProceso = new Map();
  let configReciente = null, configGuardado = null;
  for (let i = 0; i < claves.length; i += 8) {
    let valores = [];
    try { valores = await redis.mget(claves.slice(i, i + 8)); } catch { incompleto = true; continue; }
    for (const v of valores) {
      const r = v == null ? null : descomprimir(v);
      if (!r || !r.id) continue;
      borradores++;
      if (r.config && typeof r.config === "object" && (configGuardado == null || String(r.guardado) > String(configGuardado))) {
        configReciente = r.config; configGuardado = r.guardado || "";
      }
      const cd = Number(r.costo_directo_guardado);
      if (!r.id_proceso || !Number.isFinite(cd) || cd <= 0) {
        sinCosto++;
        if (r.id_proceso) sinCostoPorProceso.set(r.id_proceso, (sinCostoPorProceso.get(r.id_proceso) || 0) + 1);
        continue;
      }
      const previo = porProceso.get(r.id_proceso);
      if (!previo || String(r.guardado) > String(previo.guardado)) {
        porProceso.set(r.id_proceso, {
          id: r.id, guardado: r.guardado, costo_directo: cd, config: r.config || {}, total_guardado: r.total_guardado ?? null,
        });
      }
    }
  }
  return { porProceso, borradores, sin_costo: sinCosto, sin_costo_por_proceso: sinCostoPorProceso, config_reciente: configReciente, config_guardado: configGuardado, leido: true, incompleto };
}

/* ══ «SU PRECIO» EN EL EXPEDIENTE (10-nov-2026, encargo del dueño sobre la maqueta de Mis procesos) ══
   El resultado del análisis de precios de ESTE proceso, para pintarlo en Mis procesos sin abrir Precios. No calcula
   nada propio: llama a `pisoTechoDeBorrador` —la que usan la lista (la baja máxima, el orden por margen) y el desglose
   de la probabilidad, y que lee el borrador COMO LO LEE PRECIOS— con el techo del pliego de la guía y con la baja y la
   competencia que ya leyó quien llama. Cinco respuestas, y ninguna es un cero inventado:
     · `no_se_leyo`   la lectura de los borradores falló o quedó a medias (con un lote perdido, el borrador que se ve
                      podía no ser el último: un precio viejo presentado como vigente);
     · `sin_calcular` se leyeron todos y ninguno de este proceso tiene costo directo guardado (con cuántos de ESTE
                      proceso quedaron sin costo, no los de todo el perfil);
     · `en_precios`   su análisis calcula la administración POR TIEMPO (ver `pisoTechoDeBorrador`): va el total
                      guardado y el veredicto se ve en Precios;
     · `calculado`    `su_precio` es el TOTAL que el usuario guardó en Precios (null si falta o es 0) y `piso_techo` la
                      salida entera de lib/apu/piso_techo, con sus frases ya redactadas;
     · null           sin proceso con que calcular (quien llama no lo pinta). */
function precioDelExpediente(fila, idProceso, costos, { baja = null, competencia = null, techoPliego = null } = {}) {
  if (!idProceso) return null;
  if (!costos || costos.leido === false || costos.incompleto) return { estado: "no_se_leyo" };
  const b = costos.porProceso.get(idProceso);
  if (!b) {
    const n = costos.sin_costo_por_proceso && costos.sin_costo_por_proceso.get(idProceso);
    // leídos TODOS (leido y sin lotes perdidos): que ninguno de este proceso quedara sin costo es un cero contado
    return { estado: "sin_calcular", borradores_sin_costo: Number.isSafeInteger(n) && n > 0 ? n : 0 };
  }
  const total = b.total_guardado;
  const suPrecio = total != null && total !== "" && Number.isFinite(Number(total)) && Number(total) > 0 ? Number(total) : null;
  const borrador = { id: b.id, guardado: b.guardado || null };
  const r = pisoTechoDeBorrador({ ...(fila || {}), id_del_proceso: idProceso }, costos, { baja, competencia, techoPliego });
  if (r && r.motivo === "administracion_por_tiempo") return { estado: "en_precios", motivo: r.motivo, borrador, su_precio: suPrecio };
  return { estado: "calculado", borrador, su_precio: suPrecio, piso_techo: r ? r.pt : null };
}

/* ¿Cuánto de contribución especial entra en el piso de ESTE proceso?
   La contribución del 5 % (Ley 418/1997 art. 120) grava los contratos de OBRA
   PÚBLICA; los de consultoría no la causan, y `lib/ganancia.aplicaContribucion`
   es la ÚNICA definición de esa frontera en el repositorio — el editor de APU
   ya decidía con ella (`handlers/apu/editor.js`) mientras este módulo la
   cobraba siempre. Eso inflaba el piso, hundía la `b_max` y, con una entidad
   que descuenta fuerte, enseñaba esos procesos bastante menos probables de lo
   que son; y las dos pantallas del MISMO proceso daban cifras distintas.

   Se resuelve AQUÍ DENTRO y no por parámetro del llamador a propósito: el
   desglose (`lib/probabilidad_desglose`) no tiene el tipo de trabajo a mano,
   así que un parámetro se le habría olvidado y habría divergido del listado —
   y hay prueba de que los dos reproducen la misma `p`. Los `require` van
   DIFERIDOS: `ganancia` arrastra medio grafo y esto corre por fila.

   La casilla del usuario manda igual que en el editor: si su administración ya
   lleva los impuestos del contrato dentro, cobrarlos otra vez los cobra dos
   veces. Un tipo de trabajo que no se reconoce SÍ la causa: ante la duda, no
   prometer. */
function contribucionPctDe(l, cfg) {
  const { aplicaContribucion, CONTRIBUCION_PCT } = require("./ganancia.js");
  const { tipoTrabajoDe } = require("./filtros_lista.js");
  if (cfg && cfg.contribucion_en_administracion === true) return 0;
  return aplicaContribucion(tipoTrabajoDe(l)) ? CONTRIBUCION_PCT : 0;
}

/* Piso/techo del proceso con su borrador: la MISMA función pura del panel
   (lib/apu/piso_techo). `baja` y `competencia` son los registros que ya calculó
   quien llama (bajaDeMercado / competenciaDe). null sin borrador con costo.
   EL BORRADOR SE LEE COMO LO LEE PRECIOS (10-nov-2026, decisión del dueño). Leído tal cual, la lista y el expediente
   comparaban con la cifra de SECOP II y con la configuración TECLEADA, y Precios con el techo del pliego (o la cuantía
   del análisis) y con la configuración que él mismo acota o deriva: con el pliego en 250 millones y SECOP II en 260,
   Precios decía «No se presente» y el expediente «Preséntese» (revisión adversaria del expediente, reproducido). Por eso:
     · el presupuesto es el MÁS BAJO entre el de la fila (SECOP II, o `precio_base` de la foto), el techo del pliego
       (`techoPliego`: el expediente lo trae de la guía; la lista no tiene los documentos a mano y no lo pasa) y la
       `cuantia_cop` que guardó el borrador, que es la que Precios usa al abrirlo y la que trae el techo del pliego
       cuando el análisis se abrió desde Mis procesos: una oferta por encima del más bajo se rechaza;
     · la configuración pasa por `lib/apu/calculo.normalizarConfig`, la de Precios (AIU hasta 100 %, deducciones hasta
       30 %, el modo y los porcentajes por defecto que Precios pone si faltan);
     · con administración POR TIEMPO, Precios deriva la A con la jornada legal de SUS parámetros; aquí no se repite esa
       cuenta (sería un segundo cálculo, y en precios el error caro es el falso positivo): `pt` va en null con
       `motivo`, y quien lo consume lo dice —la baja máxima cae a la declarada o a nada, el margen dice por qué no hay
       cifra, el expediente manda a Precios—.
   `borrador.config` sale ya leída así: lo que la lista calcula con ella (lo que deja) usa la misma. */
/* La configuración de un borrador COMO LA LEE PRECIOS (lib/apu/calculo.normalizarConfig: AIU hasta 100 %, deducciones
   hasta 30 %, el modo y los porcentajes por defecto si faltan), con el resto de los campos tal cual. Una sola lectura:
   la del borrador del proceso y la «más reciente» con que la lista estima lo que deja un proceso sin analizar
   (revisión adversaria: la segunda iba cruda y la misma configuración se leía de dos formas). */
function configComoPrecios(config) {
  if (!config || typeof config !== "object") return config || null;
  const n = require("./apu/calculo.js").normalizarConfig(config);
  return { ...config, modo_aiu: n.modo_aiu, aiu_pct: n.aiu_pct, imprevistos_pct: n.imprevistos_pct, utilidad_pct: n.utilidad_pct,
    deducciones_pct: n.deducciones_pct, metodo_administracion: n.metodo_administracion, cuantia_cop: n.cuantia_cop };
}

function pisoTechoDeBorrador(l, costos, { baja = null, competencia = null, techoPliego = null } = {}) {
  const idProc = l && l.id_del_proceso ? l.id_del_proceso : null;
  const c = costos && idProc ? costos.porProceso.get(idProc) : null;
  if (!c) return null;
  const cfg = configComoPrecios(c.config || {});
  const borrador = { ...c, config: cfg };
  /* EL PRESUPUESTO va en la respuesta, en las dos ramas (revisión adversaria): «lo que deja» de la lista medía contra
     SECOP II mientras el margen y la baja máxima medían contra este, y la misma tarjeta decía «aquí no da» y «le
     quedan $10,6 M» a un precio que el pliego rechaza. Quien estime algo del mismo proceso usa ESTE. */
  // la ausencia se descarta ANTES de convertir: Number(null) sería 0, y un 0 es «sin dato», no un presupuesto de cero pesos
  const positivo = (v) => (v != null && v !== "" && Number.isFinite(Number(v)) && Number(v) > 0 ? Number(v) : null);
  const deFila = positivo(l.cuantia_cop) ?? positivo(l.precio_base);
  const candidatos = [deFila, positivo(techoPliego), cfg.cuantia_cop].filter((v) => v != null);
  const presupuesto = candidatos.length ? Math.min(...candidatos) : null;
  if (cfg.metodo_administracion === "tiempo") return { borrador, pt: null, motivo: "administracion_por_tiempo", presupuesto };
  const pt = pisoTecho({
    contribucion_pct: contribucionPctDe(l, cfg),
    presupuesto_oficial: presupuesto,
    costo_directo: c.costo_directo,
    aiu: { administracion_pct: cfg.aiu_pct, imprevistos_pct: cfg.imprevistos_pct, utilidad_pct: cfg.utilidad_pct, modo: cfg.modo_aiu },
    utilidad_minima_pct: cfg.utilidad_minima_pct ?? null,
    deducciones_pct: cfg.deducciones_pct ?? null,
    baja, competencia,
    precio_actual: c.total_guardado,
    // el campo y su respaldo declarado, como la probabilidad: si no, la misma tarjeta se contradice (28-oct-2026)
    modalidad: require("./frecuencia_precio.js").modalidadDeFila(l),
    /* la variante del pliego de ESTE proceso, si el usuario lo leyó en Precios
       (viaja en la configuración de su borrador); sin ella se cuenta (R-01b) */
    iva_utilidad: { variante: cfg.variante_iva || null },
  });
  return { borrador, pt, presupuesto };
}

/* b_max del proceso: {valor (%), origen: "apu"|"declarada"|null, borrador}.
   El APU manda sobre la declarada: es de ESTE proceso y está calculado; la
   declarada es una cifra general del dueño. */
function bajaMaximaDe(l, costos, { baja = null, competencia = null, bajaDeclarada = null } = {}) {
  return bajaMaximaDesdePisoTecho(l, pisoTechoDeBorrador(l, costos, { baja, competencia }), bajaDeclarada);
}
/* La misma resolución a partir de un piso/techo YA calculado (el listado lo
   memoiza por fila): una sola definición de b_max.
   b_max = 1 − (piso + su IVA de la utilidad) ÷ PO desde el 27-sep-2026 (R-01b):
   la entidad compara con su presupuesto el TOTAL, y con «1 − piso ÷ PO» una
   utilidad del 10 % daba 2,15 % de baja máxima donde solo cabe 0,72 %. La
   cuenta la hace `pisoTecho` con la regla única (`piso_baja_pct`); aquí solo
   se redondea y se acota. */
function bajaMaximaDesdePisoTecho(l, r, bajaDeclarada = null) {
  const cf = r && r.pt && r.pt.cifras ? r.pt.cifras : null;
  /* el presupuesto con que se midió el piso (el más bajo: ver `pisoTechoDeBorrador`); sin piso/techo, el de la fila */
  const po = cf && cf.presupuesto_oficial != null ? Number(cf.presupuesto_oficial) : Number(l && l.cuantia_cop);
  const piso = cf ? Number(cf.piso_rentable) : NaN;
  /* la ausencia se descarta ANTES de convertir: Number(null) sería 0 % de baja */
  const bajaPiso = cf && cf.piso_baja_pct != null ? Number(cf.piso_baja_pct) : NaN;
  if (Number.isFinite(piso) && piso > 0 && Number.isFinite(po) && po > 0 && Number.isFinite(bajaPiso)) {
    return { valor: Math.max(0, Math.round(bajaPiso * 100) / 100), origen: "apu", borrador: r.borrador.id, piso_techo: r };
  }
  const decl = bajaDeclarada == null || bajaDeclarada === "" ? null : Number(bajaDeclarada);
  if (Number.isFinite(decl) && decl >= 0 && decl <= 100) return { valor: decl, origen: "declarada", borrador: null, piso_techo: r };
  return { valor: null, origen: null, borrador: null, piso_techo: r };
}

module.exports = { cargarCostosPorProceso, contribucionPctDe, configComoPrecios, pisoTechoDeBorrador, bajaMaximaDe, bajaMaximaDesdePisoTecho, precioDelExpediente };
