/* lib/consorcio.js · Consorcio a la medida (Fase 10 · Detekta v4)
   ─────────────────────────────────────────────────────────────────────────────
   Un proponente plural definido por el usuario: QUIÉNES van juntos y QUÉ PARTE
   pone cada uno. Se deriva SIEMPRE de los perfiles integrantes vivos
   (`PERFILES`, fijos o `rup_…`), nunca se copia: si Génesis sube un RUP
   nuevo, el consorcio cambia con ella.

   Reglas que no hay que re-aprender:
   · La suma de participaciones tiene que ser EXACTAMENTE 100 (a 1e-9): si no,
     no hay consorcio y el error lo dice en una línea. Dos o más integrantes,
     distintos, todos existentes.
   · Los INDICADORES habilitantes (liquidez, endeudamiento, cobertura de
     intereses, rentabilidades) salen de lib/perfiles.derivarPlural con la
     fórmula del Documento Tipo —SUMA de los componentes del balance, sin
     participación— desde el 25-sep-2026; hasta ese día se ponderaban los
     índices, que ninguna norma trae (docs/PROPONENTE_PLURAL.md, apartado 2).
     Se TRUNCAN a dos decimales, no se redondean: las cámaras de comercio
     truncan (Helder: endeudamiento 0,0498 → 0,04) y la cifra que ve el usuario
     tiene que ser la que va a leer el evaluador.
   · La CAPACIDAD RESIDUAL (K) del plural es la SUMA de las CRP de los
     integrantes (Guía CCE de capacidad residual; regla de lib/capacidad que
     costó caro): NO se recalcula con los indicadores del consorcio, que es lo
     que sugería el plan v4. Se declara en `advertencias` para que nadie «complete»
     el plan por obediencia. La caja (P3) también SUMA patrimonios (cada
     integrante responde por el 100 %, Ley 80 art. 7): por eso el objeto
     conserva `integrantes`, que es lo que leen capacidad.js y puertas.js.
   · Las clases UNSPSC se UNEN, no se suman: Helder ∪ Génesis es la unión real
     (hay prueba de que ≠ |A| + |B|). Los contratos acreditados sí se suman;
     el mayor contrato es el máximo. Un dato que falte en un integrante deja
     el agregado en null (sin dato), jamás en 0.
   · «Cuántas licitaciones más se abren» = viables del consorcio − las del
     MEJOR integrante solo, contadas con la MISMA cascada y las MISMAS puertas
     que el listado (`contarOportunidades` de la puerta de entrada): dos
     cuentas divergirían.
   · `cumple` es null: el dataset no publica los requisitos del pliego. Lo que
     la app SÍ puede verificar (RUP, K, caja) viaja como `puertas_app`, con la
     advertencia sobre el porcentaje mínimo de participación: los Documentos
     Tipo no fijan ninguno (reparten la EXPERIENCIA), pero 21 de 241 pliegos
     leídos el 25-sep-2026 sí lo fijan, así que se manda a mirarlo.
   · Art. 410A del Código Penal: el simulador compara CAPACIDAD. Nunca recibe,
     calcula ni compara precios de oferta entre perfiles distintos. */
"use strict";

const { PERFILES, truncar2, derivarPlural, METODO_SIN_LEER } = require("./perfiles.js");
const { crp } = require("./capacidad.js");
const { leerJSON, escribirJSON, conCandado, CANDADO_CORTO_TTL_SEG } = require("./almacen.js");

const CLAVE_CONSORCIOS = "config:consorcios";
/* config:consorcios es UN JSON y además GLOBAL: la carrera ocurre entre
   CUALQUIER par de usuarios. Guardar y borrar van bajo un candado corto
   (lib/almacen.conCandado, 6-sep-2026); si no se obtiene, lanzan el error
   tipado y el handler responde 409 diciendo qué hacer. */
const CLAVE_CANDADO_CONSORCIOS = "lock:consorcios";
const ID_CONSORCIO_RE = /^cons_[a-z0-9]{6,24}$/;
const TTL_SIM_SEG = 3600;
const claveSim = (hash) => `consorcio:sim:${hash}`;
/* Corregida el 25-sep-2026: decía que «varios Documentos Tipo» exigen un mínimo
   a quien aporta la experiencia, y ninguno lo hace (docs/PROPONENTE_PLURAL.md,
   apartado 3). Lo que sí fijan es cómo se reparte la experiencia. */
const ADVERTENCIA_PARTICIPACION_MINIMA = "Verifique en el pliego si exige un porcentaje mínimo de participación. El pliego tipo no fija ninguno, pero reparte la experiencia: un integrante aporta al menos el 50 % de la exigida, cada uno de los demás al menos el 5 %, y solo uno puede no aportar nada si su participación no pasa del 10 %. Algunos pliegos (21 de 241 leídos) sí fijan un mínimo, del 10 % al 70 %. Por eso este resultado no es un «sí cumple».";
const ADVERTENCIA_K = "La capacidad de contratación del consorcio es la SUMA de la capacidad residual de cada integrante, sin tener en cuenta la participación (Guía de capacidad residual de Colombia Compra Eficiente); la de un integrante que la tenga negativa se resta.";
/* LA K SOLO EXISTE FRENTE A UN PRESUPUESTO (12-sep-2026). Sin proceso, el
   factor E de la Guía CCE-EICP-GI-22 se va al mejor escalón (120) «porque sin
   presupuesto no hay ratio que exigir», y la cifra resultante SUPERA al mayor
   contrato que de verdad pasa la puerta P2: medido, Helder 5.798.971.989 frente
   a 5.134.946.589 (+12,9 %), Prodiac +50,0 % y el plural fijo +14,8 %. Es el
   hermano vivo de la guarda que `lib/puertas.js:p2K` ya tiene (presupuesto <= 0
   → `sin_dato` con su mensaje), y por eso aquí la capacidad viaja en `null` con
   este motivo, jamás con una cifra creíble que nadie puede facturar.
   Vive aquí, y no en cada llamador, para que haya UNA sola frase: su casa
   natural sería `lib/capacidad.js` (donde vive `factorE`, que es quien tiene el
   criterio), y allí debería mudarse el día que ese módulo se toque. */
const MOTIVO_CAPACIDAD_SIN_PRESUPUESTO = "La capacidad de contratación se calcula frente al presupuesto de una licitación concreta "
  + "(Guía CCE-EICP-GI-22: el factor de experiencia se mide contra ese presupuesto), así que sin una licitación elegida "
  + "no hay una sola cifra que mostrar. Abra una licitación y ahí verá cuánta capacidad le queda para ella.";

/* `truncar2` vive en lib/perfiles (una sola definición: la usan derivarJuntos y este módulo). */

const esConsorcio = (id) => ID_CONSORCIO_RE.test(String(id || ""));
function generarId() {
  const abc = "abcdefghijklmnopqrstuvwxyz0123456789";
  let s = "";
  for (let i = 0; i < 10; i++) s += abc[Math.floor(Math.random() * abc.length)];
  return `cons_${s}`;
}

/* Valida la definición: [{perfilId, participacion}] con participaciones en %
   (0-100). Devuelve {ok, integrantes normalizados} o {ok:false, error}. */
function validarIntegrantes(integrantes) {
  if (!Array.isArray(integrantes) || integrantes.length < 2) {
    return { ok: false, error: "Un consorcio necesita al menos dos integrantes." };
  }
  const vistos = new Set();
  const norm = [];
  let suma = 0;
  for (const it of integrantes) {
    const id = String((it && it.perfilId) || "").trim();
    const p = Number(it && it.participacion);
    if (!id) return { ok: false, error: "Cada integrante necesita un perfil." };
    if (esConsorcio(id) || id === "juntos") return { ok: false, error: `«${id}» ya es un consorcio: los integrantes tienen que ser perfiles individuales.` };
    if (!Object.prototype.hasOwnProperty.call(PERFILES, id)) return { ok: false, error: `El perfil «${id}» no existe o ya caducó.` };
    if (vistos.has(id)) return { ok: false, error: `El perfil «${id}» aparece dos veces.` };
    if (!Number.isFinite(p) || p <= 0 || p > 100) return { ok: false, error: `La participación de «${id}» debe ser un porcentaje mayor que 0 y hasta 100.` };
    vistos.add(id);
    suma += p;
    norm.push({ perfilId: id, participacion: p });
  }
  if (Math.abs(suma - 100) > 1e-9) {
    const falta = Math.round((100 - suma) * 100) / 100;
    return { ok: false, error: falta > 0 ? `Las participaciones suman ${Math.round(suma * 100) / 100} %: falta ${falta} % para llegar a 100 %.` : `Las participaciones suman ${Math.round(suma * 100) / 100} %: se pasan ${-falta} % de 100 %.` };
  }
  return { ok: true, integrantes: norm };
}

const numOrNull = (v) => (v == null || v === "" ? null : (Number.isFinite(Number(v)) ? Number(v) : null));
function sumar(integrantes, campo) {
  let acc = 0;
  for (const i of integrantes) { const v = numOrNull(i.perfil[campo]); if (v == null) return null; acc += v; }
  return acc;
}

/* Deriva el PERFIL del consorcio a la medida. NO combina por su cuenta: llama a
   `derivarPlural` de lib/perfiles, que es la ÚNICA definición de cómo se
   combinan dos proponentes. Aquí vivía una SEGUNDA copia y las dos ya daban
   cifras distintas para el mismo consorcio (el detalle, con lo medido, está en
   la cabecera de `derivarPlural`). Lo propio de este camino es solo que la
   participación llega en PORCENTAJE (0-100) y no en fracción. */
function derivarConsorcio(id, nombre, integrantesDef) {
  const integrantes = integrantesDef.map((i) => ({ perfil: PERFILES[i.perfilId], perfilId: i.perfilId, participacion: i.participacion / 100 }));
  return {
    ...derivarPlural(integrantes, {
      id,
      nombre: nombre || undefined,
      naturaleza: "Proponente plural (consorcio o unión temporal a la medida)",
    }),
    consorcio: true,
  };
}

/* Los indicadores que se MUESTRAN (truncados) y las cifras derivadas. */
function resumenIndicadores(perfil) {
  return {
    liquidez: perfil.liquidez, endeudamiento: perfil.endeudamiento, cobertura: perfil.coberturaIntereses, patrimonio: perfil.patrimonio,
    rentabilidad_patrimonio: perfil.rentabilidadPatrimonio != null ? perfil.rentabilidadPatrimonio : null,
    rentabilidad_activo: perfil.rentabilidadActivo != null ? perfil.rentabilidadActivo : null,
    capital_trabajo: perfil.capitalTrabajo != null ? perfil.capitalTrabajo : null,
    utilidad_operacional: perfil.utilidadOp,
    // con qué fórmula salieron, en claro, y a quién le falta el balance para calcularlos
    metodo: perfil.metodoIndicadores || null,
    metodo_texto: perfil.metodoIndicadoresTexto || null,
    falta_balance_de: perfil.indicadoresFaltaBalanceDe || [],
    indeterminados: perfil.indicadoresIndeterminados || [],
    // lo que suma la CAJA (P3): cada integrante responde por el 100 %
    patrimonio_sumado: sumar(perfil.integrantes, "patrimonio"),
    truncado_a: 2,
  };
}

/* ─── persistencia ─── */
async function leerConsorcios(redis) {
  const c = await leerJSON(redis, CLAVE_CONSORCIOS);
  return c && typeof c === "object" ? c : {};
}
/* Sin nombre, «Consorcio N» (encargo del dueño, 18-ago-2026): el nombre
   derivado —«Helder Gustavo Rodríguez Santana + Génesis Ingeniería y
   Construcción GIC SAS»— era ilegible en el selector. N es el siguiente al
   mayor «Consorcio N» ya guardado (borrar uno no renumera los demás). Se
   numera DENTRO del candado: fuera, dos guardados a la vez sacaban el mismo N. */
function siguienteNombre(todos) {
  let mayor = 0;
  for (const c of Object.values(todos)) { const m = /^Consorcio (\d+)$/.exec(String(c.nombre || "")); if (m) mayor = Math.max(mayor, Number(m[1])); }
  return `Consorcio ${mayor + 1}`;
}
async function guardarConsorcio(redis, { id, nombre, integrantes }) {
  return conCandado(redis, CLAVE_CANDADO_CONSORCIOS, CANDADO_CORTO_TTL_SEG, async () => {
    const todos = await leerConsorcios(redis);
    todos[id] = { id, nombre: nombre || siguienteNombre(todos), integrantes, guardado: new Date().toISOString() };
    await escribirJSON(redis, CLAVE_CONSORCIOS, todos);
    return todos[id];
  }, { accion: "guardar el consorcio" });
}
const _inyectados = new Set();
async function borrarConsorcio(redis, id) {
  const habia = await conCandado(redis, CLAVE_CANDADO_CONSORCIOS, CANDADO_CORTO_TTL_SEG, async () => {
    const todos = await leerConsorcios(redis);
    const estaba = !!todos[id];
    delete todos[id];
    await escribirJSON(redis, CLAVE_CONSORCIOS, todos);
    return estaba;
  }, { accion: "borrar el consorcio" });
  if (_inyectados.has(id)) { delete PERFILES[id]; _inyectados.delete(id); }
  return habia;
}

/* Carga (e inyecta en PERFILES) un consorcio guardado para que el listado lo
   sirva como cualquier perfil. Los integrantes `rup_…` se cargan antes. */
async function cargarConsorcio(redis, id) {
  if (!esConsorcio(id)) return null;
  const todos = await leerConsorcios(redis);
  const def = todos[id];
  if (!def) { if (_inyectados.has(id)) { delete PERFILES[id]; _inyectados.delete(id); } return null; }
  const { esPerfilDinamico, cargarPerfilDinamico } = require("./perfil_dinamico.js");
  for (const i of def.integrantes) {
    if (esPerfilDinamico(i.perfilId) && !(await cargarPerfilDinamico(redis, i.perfilId))) return null; // un integrante caducó
  }
  const v = validarIntegrantes(def.integrantes);
  if (!v.ok) return null;
  const perfil = derivarConsorcio(id, def.nombre, v.integrantes);
  PERFILES[id] = perfil;
  _inyectados.add(id);
  return perfil;
}
function olvidarConsorcios() { for (const id of _inyectados) delete PERFILES[id]; _inyectados.clear(); }

/* Inyecta un perfil TEMPORAL (simulación) y lo retira al terminar `fn`. El id
   es único por llamada: dos simulaciones concurrentes no se pisan. */
async function conPerfilTemporal(perfil, fn) {
  const id = `sim_${Math.random().toString(36).slice(2, 12)}`;
  PERFILES[id] = { ...perfil, id };
  try { return await fn(id, PERFILES[id]); } finally { delete PERFILES[id]; }
}

const hashDe = (obj) => require("crypto").createHash("sha1").update(JSON.stringify(obj)).digest("hex").slice(0, 16);

/* La SIMULACIÓN completa: indicadores del consorcio, capacidad, unión, contratos y
   «cuántas se abren más» frente al mejor integrante solo. `contar(redis,
   perfilId, perfil, ahora)` es `contarOportunidades` inyectada; `proceso`
   opcional (fila del corpus) da la K con su presupuesto y las puertas de la
   app. */
async function simular(redis, { integrantes, proceso = null, documentos = null, conocimiento = {}, contar, ahora = Date.now() }) {
  const v = validarIntegrantes(integrantes);
  if (!v.ok) return { ok: false, status: 400, error: v.error };
  const perfil = derivarConsorcio("sim", null, v.integrantes);
  const presupuesto = proceso ? Number(proceso.cuantia_cop || proceso.precio_base) || 0 : 0;
  // «se calcularon como manda el pliego tipo» solo si se calculó alguna razón
  const algunaRazon = [perfil.liquidez, perfil.endeudamiento, perfil.coberturaIntereses].some((v) => v != null);
  const advertencias = [...(algunaRazon ? [METODO_SIN_LEER] : []), ADVERTENCIA_PARTICIPACION_MINIMA, ADVERTENCIA_K];
  if (perfil.indicadoresFaltaBalanceDe && perfil.indicadoresFaltaBalanceDe.length) {
    advertencias.push(`Falta el balance (activos, pasivos, utilidad e intereses del registro) de ${perfil.indicadoresFaltaBalanceDe.join(" y ")}: sin él no se pueden calcular la liquidez, el endeudamiento ni la cobertura del consorcio como manda el pliego tipo, y quedan sin cifra. Promediar los índices daría una cifra equivocada.`);
  }
  if (perfil.indicadoresIndeterminados && perfil.indicadoresIndeterminados.length) {
    advertencias.push("Algún indicador del consorcio es indeterminado (el divisor es cero: nadie debe intereses o no hay pasivo corriente). El pliego tipo lo da por cumplido.");
  }
  if (perfil.utilidadOp == null) advertencias.push("A algún integrante le falta la utilidad operacional: la capacidad de contratación queda sin dato (no cero).");
  if (perfil.contratosRup == null) advertencias.push("A algún integrante le falta el número de contratos acreditados en el RUP: el total queda sin dato.");
  /* SIN PRESUPUESTO NO HAY K (12-sep-2026): ni la del consorcio, ni la del
     mejor integrante, ni la de cada uno — las tres salían del MISMO
     `crp(perfil, 0)`. La misma guarda que `p2K`, y el motivo va con ellas. */
  const sinPresupuesto = !(presupuesto > 0);
  const kConsorcio = sinPresupuesto ? null : crp(perfil, presupuesto);
  const kIndividual = v.integrantes.map((i) => ({ perfilId: i.perfilId, nombre: PERFILES[i.perfilId].nombre, k: sinPresupuesto ? null : crp(PERFILES[i.perfilId], presupuesto), clases: PERFILES[i.perfilId].unspsc ? PERFILES[i.perfilId].unspsc.size : null }));
  const mejorK = kIndividual.reduce((m, x) => (x.k != null && (m == null || x.k > m) ? x.k : m), null);

  const resultado = {
    ok: true,
    integrantes: v.integrantes.map((i) => ({ ...i, nombre: PERFILES[i.perfilId].nombre })),
    indicadores: resumenIndicadores(perfil),
    capacidadContratacion: kConsorcio == null ? null : Math.round(kConsorcio),
    capacidadMejorIntegrante: mejorK == null ? null : Math.round(mejorK),
    capacidadPorIntegrante: kIndividual.map((x) => ({ ...x, k: x.k == null ? null : Math.round(x.k) })),
    // por qué las tres cifras de arriba van vacías (null cuando SÍ hay cifra)
    capacidadMotivo: sinPresupuesto ? MOTIVO_CAPACIDAD_SIN_PRESUPUESTO : null,
    presupuestoReferencia: presupuesto || null,
    clasesUnspsc: perfil.unspsc.size,
    clasesSumadas: kIndividual.reduce((a, x) => a + (x.clases || 0), 0), // para que se vea que la unión NO es la suma
    contratos: perfil.contratosRup,
    mayorContratoSMMLV: perfil.mayorContratoSMMLV,
    cumple: null,
    advertencias,
    limite: "Este simulador compara capacidad. No recibe, calcula ni compara precios de oferta entre perfiles (art. 410A del Código Penal).",
  };

  if (typeof contar === "function") {
    /* EL SELLO DE LOS PERFILES ENTRA EN LA CLAVE (ago 2026). Se hasheaban solo
       los IDS de los integrantes, así que una carga de RUP no invalidaba nada:
       el resto de la respuesta se re-deriva viva en cada petición y la parte
       cacheada («se abren N licitaciones más») seguía contada con la whitelist
       anterior — media respuesta del RUP nuevo y media del viejo, con `cache:
       true` como única pista. Colgarlo del sello (`config:perfiles:version`) lo
       auto-invalida sin depender de que alguien se acuerde de purgar, que es el
       criterio que ya se adoptó para la caché de cobertura. */
    const sello = (() => { try { return require("./perfiles.js").fuentePerfiles().version || null; } catch { return null; } })();
    const clave = claveSim(hashDe({ integrantes: v.integrantes, proceso: proceso ? proceso.id_del_proceso : null, hora: new Date(ahora).toISOString().slice(0, 13), sello }));
    let cacheado = null;
    try { cacheado = await leerJSON(redis, clave); } catch { cacheado = null; }
    if (cacheado && Number.isInteger(cacheado.procesosAdicionales)) {
      Object.assign(resultado, cacheado, { cache: true });
    } else {
      const conteoConsorcio = await conPerfilTemporal(perfil, (id, p) => contar(redis, id, p, ahora));
      const conteosIndividuales = [];
      for (const i of v.integrantes) {
        const c = await contar(redis, i.perfilId, PERFILES[i.perfilId], ahora);
        conteosIndividuales.push({ perfilId: i.perfilId, nombre: PERFILES[i.perfilId].nombre, total: c.total });
      }
      const mejorSolo = conteosIndividuales.reduce((m, c) => (c.total > m ? c.total : m), 0);
      const extra = {
        procesosConsorcio: conteoConsorcio.total,
        procesosMejorIntegrante: mejorSolo,
        procesosPorIntegrante: conteosIndividuales,
        procesosAdicionales: Math.max(0, conteoConsorcio.total - mejorSolo),
        muestra: conteoConsorcio.muestra || [],
        corpus_vacio: !!conteoConsorcio.corpus_vacio,
      };
      Object.assign(resultado, extra, { cache: false });
      try { await redis.set(clave, JSON.stringify(extra), { ex: TTL_SIM_SEG }); } catch { /* la caché es opcional */ }
    }
  }
  if (proceso) {
    const { evaluarRup } = require("./rup.js");
    const { evaluarPuertas } = require("./puertas.js");
    /* LAS OCHO CASILLAS DEL PLIEGO, PARA EL CONSORCIO (6-sep-2026, M-COMP-02).
       La MISMA `guiaDe` que arma la ficha «Lo que fija el pliego» de Mis
       procesos, con el perfil derivado inyectado como temporal y los documentos
       del proceso ya leídos (`documentos`, lo que el navegador dejó en
       pliego:{id}:docs). Aquí no se compara nada: quien decide «cumple / no
       cumple» es lib/diff a través de lib/documentos_proceso, exactamente igual
       que para una empresa sola; y la cifra del consorcio que se juzga es la
       que lee el evaluador (la del pliego tipo, lib/perfiles.derivarPlural). Sin documentos, las ocho
       casillas dicen por qué están vacías, jamás una cifra. Require diferido:
       guia_proceso arrastra perfil_resolver, que arrastra este módulo. */
    const { guiaDe } = require("./guia_proceso.js");
    Object.assign(resultado, await conPerfilTemporal(perfil, async (id) => {
      /* EL MISMO CONOCIMIENTO QUE EL LISTADO (12-sep-2026). Iba `{}` en duro, así
         que las capas 6 (equivalencias) y 7 (vocabulario) de la cascada no
         disparaban y el MISMO consorcio ante el MISMO proceso daba un veredicto
         OPUESTO al de la tarjeta —justo lo que prohíbe la cabecera de este
         módulo—. Lo carga el handler con `cargarConocimiento` y llega aquí. */
      const rup = evaluarRup(proceso, id, conocimiento);
      const puertas = evaluarPuertas(proceso, id, { rup, conocimiento });
      /* best-effort como en Mis procesos: si la guía no se pudo armar, las casillas
         viajan null con su motivo y la simulación no se cae */
      let guia = null, motivo = null;
      try { guia = guiaDe({ fila: proceso, perfil: id, ctx: { documentos: documentos || null, conocimiento, ahoraMs: ahora } }); }
      catch (e) { motivo = `no se pudieron volver a pasar las cifras del pliego: ${String((e && e.message) || e)}`; }
      return {
        puertas_app: {
          pasa_todas: puertas.pasa_todas, no_viable_por: puertas.no_viable_por || [],
          p1_rup: !!(puertas.p1_rup && puertas.p1_rup.pasa), p2_k: !!(puertas.p2_k && puertas.p2_k.pasa), p3_caja: !!(puertas.p3_caja && puertas.p3_caja.pasa),
          nota: "Lo que la app puede verificar (RUP, capacidad K, caja). NO son los requisitos del pliego.",
        },
        exigencias: guia ? guia.exigencias : null,
        exigencias_resumen: guia ? guia.resumen.exigencias : null,
        exigencias_motivo: motivo,
        documentos_leidos: guia ? guia.resumen.documentos_leidos : null,
      };
    }));
  }
  return resultado;
}

/* ══════════ EL REPARTO RECOMENDADO PARA ESTE PROCESO (25-sep-2026) ══════════
   El encargo: «la participación que deja a Helder con el mayor porcentaje
   posible cumpliendo el pliego, con la cita y el cálculo, llamando al simulador
   que ya existe». Aquí no se calcula nada nuevo:
     1. las casillas del pliego se pasan UNA vez con `simular` (los indicadores
        del pliego tipo no dependen del reparto) y de ahí sale la experiencia
        exigida con su documento y su página (dato publicado gana a calculado);
     2. la frontera la da `lib/reparto.fronteraReparto` (capacidad con la misma
        `crp` y el umbral de la puerta P2; regla de experiencia 50/5/10);
     3. el resultado es `simular` OTRA VEZ en el reparto recomendado, con su
        `recomendacion` al lado: lo que se enseña es lo que el simulador dice
        de ESE reparto, no una segunda cuenta.
   Lo que sigue en rojo con CUALQUIER reparto (una liquidez que no alcanza, por
   ejemplo) se nombra con su cita: ningún porcentaje lo arregla. */
async function recomendarReparto(redis, { dueno, socio, proceso, documentos = null, conocimiento = {}, ahora = Date.now() }) {
  if (!proceso) return { ok: false, status: 400, error: "El reparto se recomienda frente a un proceso concreto: elija uno." };
  const v = validarIntegrantes([{ perfilId: dueno, participacion: 50 }, { perfilId: socio, participacion: 50 }]);
  if (!v.ok) return { ok: false, status: 400, error: v.error };
  const { fronteraReparto } = require("./reparto.js");
  const { cargaK, presupuestoDe } = require("./rup.js");
  const mitad = await simular(redis, { integrantes: v.integrantes, proceso, documentos, conocimiento, ahora });
  if (!mitad.ok) return mitad;
  const experienciaLeida = (mitad.exigencias || []).find((x) => (x.clave === "experiencia_especifica" || x.clave === "experiencia_general")
    && x.tipo_valor === "smmlv" && Number.isFinite(Number(x.exige_valor))) || null;
  const presupuesto = presupuestoDe(proceso);
  const crpc = presupuesto > 0 ? cargaK(proceso, presupuesto).crpc_minimo : null;
  const f = fronteraReparto({
    dueno: PERFILES[dueno], socio: PERFILES[socio], presupuestoCOP: presupuesto, crpc,
    exigidaSMMLV: experienciaLeida ? Number(experienciaLeida.exige_valor) : null, tipoContrato: proceso.tipo_de_contrato || null,
  });
  const resultado = f.suya_maxima == null ? mitad
    : await simular(redis, { integrantes: [{ perfilId: dueno, participacion: f.suya_maxima }, { perfilId: socio, participacion: f.del_socio }], proceso, documentos, conocimiento, ahora });
  if (!resultado.ok) return resultado;
  const cita = (x) => (x && x.documento ? { documento: x.documento, pagina: x.pagina, cita: x.cita } : null);
  const enRojoSiempre = (resultado.exigencias || []).filter((x) => x.estado === "no_cumple")
    .map((x) => ({ clave: x.clave, titulo: x.titulo, exige: x.exige, juntos: x.suyo, ...cita(x) }));
  return {
    ...resultado,
    recomendacion: {
      suya: f.suya_maxima, del_socio: f.del_socio, frase: f.frase, deja_en: f.deja_en, avisos: f.avisos,
      capacidad: f.capacidad,
      experiencia: { estado: f.experiencia.estado, exigida_de: f.experiencia.exigida_de || null, exigida_smmlv: experienciaLeida ? Number(experienciaLeida.exige_valor) : null, cita: cita(experienciaLeida) },
      // en rojo con este reparto; como los indicadores no dependen del reparto, tampoco los arregla otro
      en_rojo_con_cualquier_reparto: enRojoSiempre,
    },
  };
}

module.exports = {
  recomendarReparto,
  truncar2, esConsorcio, generarId, validarIntegrantes, derivarConsorcio, resumenIndicadores,
  leerConsorcios, guardarConsorcio, borrarConsorcio, cargarConsorcio, olvidarConsorcios, conPerfilTemporal, simular,
  CLAVE_CONSORCIOS, CLAVE_CANDADO_CONSORCIOS, ID_CONSORCIO_RE, TTL_SIM_SEG, ADVERTENCIA_PARTICIPACION_MINIMA, ADVERTENCIA_K,
  MOTIVO_CAPACIDAD_SIN_PRESUPUESTO,
};
