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
     intereses) y el PATRIMONIO se ponderan por participación (Guía
     CCE-EICP-GI-22) y se TRUNCAN a dos decimales, no se redondean: las
     cámaras de comercio truncan (Helder: endeudamiento 0,0498 → 0,04) y la
     cifra que ve el usuario tiene que ser la que va a leer el evaluador. Un
     0,085 mostrado como 0,09 puede aparecer cumplido cuando el evaluador lo ve
     incumplido.
   · La CAPACIDAD RESIDUAL (K) del plural es la SUMA de las CRP de los
     integrantes (Guía CCE de capacidad residual; regla de lib/capacidad que
     costó caro): NO se recalcula con indicadores ponderados, que es lo que
     sugería el plan v4. Se declara en `advertencias` para que nadie «complete»
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
     advertencia literal del plan sobre el porcentaje mínimo del integrante que
     aporta la experiencia — un umbral que NO está verificado contra los
     Documentos Tipo.
   · Art. 410A del Código Penal: el simulador compara CAPACIDAD. Nunca recibe,
     calcula ni compara precios de oferta entre perfiles distintos. */
"use strict";

const { PERFILES, truncar2 } = require("./perfiles.js");
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
const ADVERTENCIA_PARTICIPACION_MINIMA = "Verifique en el pliego si exigen un porcentaje mínimo al integrante que aporta la experiencia (varios Documentos Tipo lo hacen y algunos limitan el número de integrantes): esos umbrales NO están verificados aquí, así que este resultado no es un «sí cumple».";
const ADVERTENCIA_K = "La capacidad de contratación del consorcio es la SUMA de la capacidad residual de cada integrante (Guía de capacidad residual de Colombia Compra Eficiente), no un recálculo con los indicadores ponderados.";

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
/* Σ valor_i × p_i; null si a alguno le falta el dato (sin dato ≠ 0). */
function ponderar(integrantes, campo) {
  let acc = 0;
  for (const i of integrantes) {
    const v = numOrNull(i.perfil[campo]);
    if (v == null) return null;
    acc += v * i.participacion;
  }
  return acc;
}
function sumar(integrantes, campo) {
  let acc = 0;
  for (const i of integrantes) { const v = numOrNull(i.perfil[campo]); if (v == null) return null; acc += v; }
  return acc;
}

/* Deriva el PERFIL del consorcio (mismo contrato que `derivarJuntos` de
   lib/perfiles: capacidad.js y puertas.js leen `integrantes`, `unspsc`,
   `expSMMLV`, `profesionales`, `topeSMMLV`, `sce`). */
function derivarConsorcio(id, nombre, integrantesDef) {
  const integrantes = integrantesDef.map((i) => ({ perfil: PERFILES[i.perfilId], perfilId: i.perfilId, participacion: i.participacion / 100 }));
  const liq = ponderar(integrantes, "liquidez"), end = ponderar(integrantes, "endeudamiento"), cob = ponderar(integrantes, "coberturaIntereses");
  const patr = ponderar(integrantes, "patrimonio"), util = ponderar(integrantes, "utilidadOp");
  const contratos = sumar(integrantes, "contratosRup");
  const mayor = integrantes.map((i) => numOrNull(i.perfil.expSMMLV)).filter((v) => v != null);
  return {
    id, nombre: nombre || integrantes.map((i) => i.perfil.nombre).join(" + "),
    naturaleza: "Proponente plural (consorcio o unión temporal a la medida)",
    nit: null,
    rol: `Consorcio · ${integrantes.map((i) => `${i.perfil.nombre} ${Math.round(i.participacion * 1000) / 10} %`).join(" · ")}`,
    integrantes,
    // indicadores habilitantes ponderados por participación y TRUNCADOS
    liquidez: liq == null ? null : truncar2(liq),
    endeudamiento: end == null ? null : truncar2(end),
    coberturaIntereses: cob == null ? null : truncar2(cob),
    patrimonio: patr == null ? null : Math.trunc(patr),
    utilidadOp: util == null ? null : Math.trunc(util),
    ingresoOp: null,
    expSMMLV: sumar(integrantes, "expSMMLV"),                 // experiencia acreditable: la de cualquiera (suma para el factor E)
    mayorContratoSMMLV: mayor.length ? Math.max(...mayor) : null,
    profesionales: sumar(integrantes, "profesionales"),
    topeSMMLV: sumar(integrantes, "topeSMMLV"),               // apetito combinado
    contratosRup: contratos,                                  // suma; null si a alguno le falta
    unspsc: new Set(integrantes.flatMap((i) => [...(i.perfil.unspsc || [])])), // UNIÓN, jamás suma
    sce: [],
    consorcio: true,
  };
}

/* Los indicadores que se MUESTRAN (truncados) y las cifras derivadas. */
function resumenIndicadores(perfil) {
  return {
    liquidez: perfil.liquidez, endeudamiento: perfil.endeudamiento, cobertura: perfil.coberturaIntereses, patrimonio: perfil.patrimonio,
    utilidad_operacional: perfil.utilidadOp,
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

/* La SIMULACIÓN completa: indicadores ponderados, capacidad, unión, contratos y
   «cuántas se abren más» frente al mejor integrante solo. `contar(redis,
   perfilId, perfil, ahora)` es `contarOportunidades` inyectada; `proceso`
   opcional (fila del corpus) da la K con su presupuesto y las puertas de la
   app. */
async function simular(redis, { integrantes, proceso = null, contar, ahora = Date.now() }) {
  const v = validarIntegrantes(integrantes);
  if (!v.ok) return { ok: false, status: 400, error: v.error };
  const perfil = derivarConsorcio("sim", null, v.integrantes);
  const presupuesto = proceso ? Number(proceso.cuantia_cop || proceso.precio_base) || 0 : 0;
  const advertencias = [ADVERTENCIA_PARTICIPACION_MINIMA, ADVERTENCIA_K];
  if (perfil.utilidadOp == null) advertencias.push("A algún integrante le falta la utilidad operacional: la capacidad de contratación queda sin dato (no cero).");
  if (perfil.contratosRup == null) advertencias.push("A algún integrante le falta el número de contratos acreditados en el RUP: el total queda sin dato.");
  const kConsorcio = crp(perfil, presupuesto);
  const kIndividual = v.integrantes.map((i) => ({ perfilId: i.perfilId, nombre: PERFILES[i.perfilId].nombre, k: crp(PERFILES[i.perfilId], presupuesto), clases: PERFILES[i.perfilId].unspsc ? PERFILES[i.perfilId].unspsc.size : null }));
  const mejorK = kIndividual.reduce((m, x) => (x.k != null && (m == null || x.k > m) ? x.k : m), null);

  const resultado = {
    ok: true,
    integrantes: v.integrantes.map((i) => ({ ...i, nombre: PERFILES[i.perfilId].nombre })),
    indicadores: resumenIndicadores(perfil),
    capacidadContratacion: kConsorcio == null ? null : Math.round(kConsorcio),
    capacidadMejorIntegrante: mejorK == null ? null : Math.round(mejorK),
    capacidadPorIntegrante: kIndividual.map((x) => ({ ...x, k: x.k == null ? null : Math.round(x.k) })),
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
    resultado.puertas_app = await conPerfilTemporal(perfil, async (id) => {
      const rup = evaluarRup(proceso, id, {});
      const puertas = evaluarPuertas(proceso, id, { rup, conocimiento: {} });
      return {
        pasa_todas: puertas.pasa_todas, no_viable_por: puertas.no_viable_por || [],
        p1_rup: !!(puertas.p1_rup && puertas.p1_rup.pasa), p2_k: !!(puertas.p2_k && puertas.p2_k.pasa), p3_caja: !!(puertas.p3_caja && puertas.p3_caja.pasa),
        nota: "Lo que la app puede verificar (RUP, capacidad K, caja). NO son los requisitos del pliego.",
      };
    });
  }
  return resultado;
}

module.exports = {
  truncar2, esConsorcio, generarId, validarIntegrantes, derivarConsorcio, resumenIndicadores,
  leerConsorcios, guardarConsorcio, borrarConsorcio, cargarConsorcio, olvidarConsorcios, conPerfilTemporal, simular,
  CLAVE_CONSORCIOS, CLAVE_CANDADO_CONSORCIOS, ID_CONSORCIO_RE, TTL_SIM_SEG, ADVERTENCIA_PARTICIPACION_MINIMA, ADVERTENCIA_K,
};
