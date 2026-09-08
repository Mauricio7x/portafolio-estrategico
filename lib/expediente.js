/* lib/expediente.js · EL EXPEDIENTE DEL CONTRATO ADJUDICADO (8-sep-2026)
   ─────────────────────────────────────────────────────────────────────────────
   Encargo del dueño: «que Mis procesos satisfaga todas las necesidades del
   usuario DESPUÉS de que se le ha adjudicado un proceso: gestión documental del
   contrato, obligaciones, cronograma de ejecución, comunicaciones oficiales,
   pólizas, informes».

   Hasta hoy la pestaña terminaba en «Ganado»: la etiqueta que cierra la
   predicción congelada (F0-7) y a partir de la cual la aplicación no volvía a
   decir nada. Pero ganar es donde EMPIEZA el dinero — y donde se pierde: una
   póliza que vence sin renovar, un acta parcial sin radicar, un contrato
   terminado que nadie liquida y que sigue comiéndose la capacidad para el
   siguiente. Este módulo es la capa PURA de ese expediente: qué se guarda, qué
   se deriva de lo guardado, qué avisa y qué se niega a afirmar.

   ═══ LAS DECISIONES QUE NO HAY QUE RE-APRENDER ═══════════════════════════════

   · TODO CABE EN EL JSON QUE YA EXISTE. El expediente vive en
     `seguimiento:{perfil}.procesos[id].expediente`, al lado de `tareas` y
     `carpeta`. Ni una clave nueva en Redis, ni un archivo nuevo en `api/`: la
     acción se pliega como `accion` del MISMO POST de `op=seguimiento`, igual que
     las carpetas del casillero. Un perfil anterior a esto no trae el campo y
     abre igual (`normalizar(undefined)` devuelve el expediente vacío).

   · EL ESTADO SE DERIVA DE LAS FECHAS, NO SE ESCRIBE. Un contrato que dice
     «firmado» y trae fecha de acta de inicio está en ejecución: un rótulo que
     contradice a sus propias fechas es exactamente la clase de mentira creíble
     que este proyecto persigue. La cascada va de lo más avanzado a lo menos
     (liquidado → terminado → en ejecución → firmado → adjudicado) y se resuelve
     con las fechas que el usuario registró. `suspendido` es la ÚNICA excepción y
     por eso es un interruptor: ninguna fecha implica una suspensión.

   · «SIN DATO» ≠ «CERO», y aquí se paga en plata. Un valor ausente es `null`,
     jamás 0: un contrato sin valor registrado no vale cero pesos. Toda suma dice
     de cuántos registros salió y cuántos se quedaron fuera por no tener cifra
     (`incompletos`): «lleva cobrados $120.000.000» con dos actas sin valor es
     falso, y la frase lo dice.

   · LAS FECHAS QUE USTED REGISTRA SON SUYAS. Viajan al calendario y al `.ics`
     con `origen: "usted"` — la misma cuarta rama de `fuenteDeHito` que abrió la
     lista de verificación del casillero. Ninguna fecha del expediente puede
     salir con el sello «Fuente: SECOP II»: la escribió el contratista, no la
     publicó la entidad.

   · NO SE INVENTA NI UN AMPARO EXIGIDO, NI UN PORCENTAJE, NI UNA VIGENCIA.
     Quién exige qué garantía, por cuánto y hasta cuándo lo fijan el pliego y la
     minuta del contrato, proceso por proceso. Este módulo aporta el VOCABULARIO
     (los amparos que se usan en obra pública, con su nombre de pantalla) para
     que el usuario registre los suyos, y dice de dónde sale el dato: del
     contrato. Nunca afirma que a un contrato le corresponda tal porcentaje.

   · EL FALSO CARO AQUÍ ES EL NEGATIVO. En APU y precios manda no presupuestar
     ante la duda; en un expediente en ejecución manda AVISAR: no advertir de una
     póliza que vence cuesta el contrato entero, y advertir de más cuesta una
     línea de más en la pantalla. Por eso una póliza sin fecha de vencimiento
     PIDE la fecha en vez de callarse, y un contrato sin acta de inicio a los
     quince días de firmado lo dice.

   Función pura y ejecutable en Node: la suite la corre con cifras. La red, Redis
   y el candado del perfil viven en lib/handlers/perfil/seguimiento.js. */
"use strict";

const { diaValido } = require("./cronograma.js");
const { fechaLegible } = require("./habiles.js");

/* ═══ EL CICLO DE VIDA, EN LAS PALABRAS DEL CONTRATISTA ══════════════════════
   Seis estados y el HECHO que hace pasar de uno al siguiente. No son etapas de
   un manual: son las cinco fechas que un contratista tiene apuntadas en una
   libreta, más la suspensión. `orden` es lo avanzado que está (la cascada de
   `estadoDe` lo recorre de mayor a menor). */
const ESTADOS_CONTRATO = Object.freeze([
  { id: "adjudicado", orden: 1, etiqueta: "Adjudicado, sin firmar", hecho: "le adjudicaron el proceso", campo: null },
  { id: "firmado", orden: 2, etiqueta: "Firmado, sin empezar", hecho: "firmó el contrato", campo: "fecha_firma" },
  { id: "ejecucion", orden: 3, etiqueta: "En ejecución", hecho: "firmó el acta de inicio", campo: "fecha_acta_inicio" },
  { id: "terminado", orden: 4, etiqueta: "Terminado, sin liquidar", hecho: "terminó la obra", campo: "fecha_terminacion" },
  { id: "liquidado", orden: 5, etiqueta: "Liquidado", hecho: "firmó el acta de liquidación", campo: "fecha_liquidacion" },
]);
const ESTADO_SUSPENDIDO = Object.freeze({ id: "suspendido", etiqueta: "Suspendido", hecho: "la entidad suspendió el contrato" });
const ETIQUETA_CONTRATO = Object.freeze(Object.fromEntries([...ESTADOS_CONTRATO, ESTADO_SUSPENDIDO].map((e) => [e.id, e.etiqueta])));

/* ═══ LOS AMPAROS DE UNA GARANTÍA DE OBRA PÚBLICA ════════════════════════════
   VOCABULARIO, NO EXIGENCIA. Son los amparos que se ven en los contratos de
   obra en Colombia, con la palabra que usa el contratista y lo que cubre cada
   uno dicho sin abogado. La aplicación NO afirma cuáles le exigen a un contrato
   concreto, ni por qué porcentaje, ni hasta cuándo: eso lo fija el pliego y lo
   escribe la minuta, y varía proceso por proceso. Registrarlos sirve para una
   sola cosa, que es la que vale dinero: saber cuál vence primero. */
const AMPAROS = Object.freeze([
  { id: "cumplimiento", etiqueta: "Cumplimiento del contrato", que_cubre: "que usted haga la obra en el plazo y como dice el contrato." },
  { id: "anticipo", etiqueta: "Buen manejo del anticipo", que_cubre: "que la plata que le adelantan se invierta en la obra y se descuente de sus actas hasta devolverla." },
  { id: "salarios", etiqueta: "Pago de salarios y prestaciones", que_cubre: "los sueldos y la seguridad social de quienes trabajan en la obra." },
  { id: "estabilidad", etiqueta: "Estabilidad y calidad de la obra", que_cubre: "que la obra no se dañe después de entregada. Es la que vence más tarde." },
  { id: "responsabilidad_civil", etiqueta: "Responsabilidad civil frente a terceros", que_cubre: "los daños que la obra le cause a alguien de fuera." },
  { id: "otro", etiqueta: "Otro amparo", que_cubre: "cualquiera que el contrato exija y no esté en esta lista." },
]);
const AMPARO_ETIQUETA = Object.freeze(Object.fromEntries(AMPAROS.map((a) => [a.id, a.etiqueta])));

/* ═══ LOS TOPES ══════════════════════════════════════════════════════════════
   Del mismo sitio que los del casillero: el JSON entero del perfil se lee y se
   escribe en cada guardado, y la respuesta del GET se corta a 4,5 MB en Vercel.
   Un expediente solo existe en los procesos GANADOS —un contratista pequeño gana
   unos pocos al año—, así que el peso real es una fracción del de las
   anotaciones; aun así el tope existe, porque un pegado accidental no puede
   dejar el perfil sin poder guardar. El coste medido de cada lista está en la
   sección de la memoria de este trabajo. */
const MAX_POLIZAS = 8;      // los amparos de un contrato de obra caben de sobra
const MAX_PAGOS = 40;       // un acta parcial al mes durante tres años
const MAX_OFICIOS = 40;     // la correspondencia radicada que importa
const LARGO_TEXTO = 160;    // el mismo de una anotación del cuaderno
const LARGO_CORTO = 60;     // números de contrato, de póliza, de radicado

const RELLENOS = new Set(["", "no definido", "null", "undefined", "n/a", "na", "-"]);

/* Los tres saneadores. `textoLimpio` e `idNuevo` son los del casillero
   (lib/seguimiento): se IMPORTAN diferido para no cerrar el ciclo
   seguimiento → expediente → seguimiento. Dos saneadores de texto de pantalla
   divergirían a la primera corrección. */
function util() { return require("./seguimiento.js"); }
const limpio = (v, tope) => util().textoLimpio(v, tope);
/* Una cifra de dinero: null si no se puede leer, y null si es negativa (un pago
   de menos veinte millones no es un dato, es un error de dedo). El 0 SÍ se
   admite y significa cero: un acta de cobro de valor cero existe (una entrega
   sin cobro), y aquí es el usuario quien lo escribe — no un dataset que rellena
   con ceros lo que no publica. */
function dinero(v) {
  if (v === null || v === undefined || v === "") return null;
  const bruto = String(v).trim();
  if (RELLENOS.has(bruto.toLowerCase())) return null;
  /* ⚠️ EL PUNTO DE MILES ES LO NORMAL AQUÍ. Un contratista colombiano escribe
     «1.180.000.000», y `Number("1.180.000.000")` es NaN: la cifra del contrato
     se habría perdido en silencio, que es el peor modo de fallo de este
     formulario. Con coma manda la coma (es el decimal en es-CO) y los puntos
     son separadores; sin coma, un patrón de grupos de tres con puntos también
     son separadores. Lo demás se lee tal cual. */
  const s = bruto.replace(/[^\d.,-]/g, "");
  if (!s || s === "-") return null;
  let n;
  if (s.includes(",")) n = Number(s.replace(/\./g, "").replace(",", "."));
  else if (/^-?\d{1,3}(\.\d{3})+$/.test(s)) n = Number(s.replace(/\./g, ""));
  else n = Number(s);
  return Number.isFinite(n) && n >= 0 ? Math.round(n) : null;
}
/* Un día que EXISTA. La misma cuenta que ya valida las fechas de la lista de
   verificación y las de los pliegos: `Date.parse` acepta «2026-02-31» y lo
   corre al 3 de marzo (medido), así que no sirve de filtro. */
const dia = (v) => diaValido(String(v == null ? "" : v).slice(0, 10));
const entero = (v) => { const n = Number(v); return Number.isFinite(n) && n > 0 ? Math.floor(n) : null; };
/* Un porcentaje de 0 a 100; fuera de ese rango es un error de dedo, no un dato. */
const porcentaje = (v) => { if (v === null || v === undefined || v === "") return null; const n = Number(v); return Number.isFinite(n) && n >= 0 && n <= 100 ? Math.round(n * 100) / 100 : null; };

/* ═══ LO QUE SE GUARDA ═══════════════════════════════════════════════════════ */

/* La ficha del contrato: los datos que están en la primera página de la minuta.
   Todos opcionales — un contrato recién adjudicado todavía no tiene número. */
function normalizarContrato(v) {
  const c = v && typeof v === "object" ? v : {};
  return {
    numero: limpio(c.numero, LARGO_CORTO),
    valor_cop: dinero(c.valor_cop),
    plazo_dias: entero(c.plazo_dias),
    anticipo_pct: porcentaje(c.anticipo_pct),
    supervisor: limpio(c.supervisor, LARGO_TEXTO),
    fecha_adjudicacion: dia(c.fecha_adjudicacion),
    fecha_firma: dia(c.fecha_firma),
    fecha_acta_inicio: dia(c.fecha_acta_inicio),
    fecha_terminacion: dia(c.fecha_terminacion),
    fecha_liquidacion: dia(c.fecha_liquidacion),
    suspendido: c.suspendido === true,
  };
}

/* Una póliza registrada. `hasta` es el único campo que de verdad importa: es la
   fecha que avisa. Sin amparo reconocible cae en «otro» — nunca se descarta la
   póliza por no saber clasificarla (la regla del valor de filtro desconocido). */
function normalizarPolizas(v, { ahora = null } = {}) {
  const out = [], vistos = new Set();
  for (const p of Array.isArray(v) ? v : []) {
    if (!p || typeof p !== "object") continue;
    const amparo = AMPARO_ETIQUETA[String(p.amparo || "").trim()] ? String(p.amparo).trim() : "otro";
    const numero = limpio(p.numero, LARGO_CORTO);
    const aseguradora = limpio(p.aseguradora, LARGO_TEXTO);
    const desde = dia(p.desde), hasta = dia(p.hasta);
    /* una póliza sin NADA escrito no es una póliza: es una fila en blanco */
    if (!numero && !aseguradora && !desde && !hasta && dinero(p.valor_cop) == null && amparo === "otro") continue;
    let id = limpio(p.id, 40);
    if (!id || !/^[A-Za-z0-9_-]+$/.test(id) || vistos.has(id)) id = util().idNuevo("g", vistos, ahora ? Date.parse(ahora) || Date.now() : Date.now());
    vistos.add(id);
    out.push({ id, amparo, amparo_etiqueta: AMPARO_ETIQUETA[amparo], numero, aseguradora, desde, hasta,
      valor_cop: dinero(p.valor_cop), aprobada: p.aprobada === true });
    if (out.length >= MAX_POLIZAS) break;
  }
  return out;
}

/* Un cobro: el acta parcial o la factura. Dos fechas y por eso dos estados —
   RADICADO (usted lo entregó) y PAGADO (le entró la plata) —, que es la
   distinción con la que un contratista pequeño vive. Un cobro sin concepto no
   se guarda: sin él la lista no dice nada. */
function normalizarPagos(v, { ahora = null } = {}) {
  const out = [], vistos = new Set();
  for (const p of Array.isArray(v) ? v : []) {
    if (!p || typeof p !== "object") continue;
    const concepto = limpio(p.concepto, LARGO_TEXTO);
    if (!concepto) continue;
    let id = limpio(p.id, 40);
    if (!id || !/^[A-Za-z0-9_-]+$/.test(id) || vistos.has(id)) id = util().idNuevo("p", vistos, ahora ? Date.parse(ahora) || Date.now() : Date.now());
    vistos.add(id);
    const pagado_el = dia(p.pagado_el);
    out.push({ id, concepto, numero: limpio(p.numero, LARGO_CORTO), valor_cop: dinero(p.valor_cop),
      radicado_el: dia(p.radicado_el), pagado_el, pagado: !!pagado_el });
    if (out.length >= MAX_PAGOS) break;
  }
  return out;
}

/* La correspondencia oficial: lo que usted radicó y lo que le radicaron. El
   `sentido` importa porque solo lo RECIBIDO puede estar esperando respuesta
   suya, y eso es lo que avisa. */
function normalizarOficios(v, { ahora = null } = {}) {
  const out = [], vistos = new Set();
  for (const o of Array.isArray(v) ? v : []) {
    if (!o || typeof o !== "object") continue;
    const asunto = limpio(o.asunto, LARGO_TEXTO);
    if (!asunto) continue;
    let id = limpio(o.id, 40);
    if (!id || !/^[A-Za-z0-9_-]+$/.test(id) || vistos.has(id)) id = util().idNuevo("o", vistos, ahora ? Date.parse(ahora) || Date.now() : Date.now());
    vistos.add(id);
    const sentido = o.sentido === "recibido" ? "recibido" : "enviado";
    out.push({ id, asunto, sentido, numero: limpio(o.numero, LARGO_CORTO), fecha: dia(o.fecha),
      responder_antes: dia(o.responder_antes), respondido: o.respondido === true });
    if (out.length >= MAX_OFICIOS) break;
  }
  return out;
}

/* El expediente entero, saneado. Tolera lo que no existía: `normalizar(undefined)`
   es el expediente vacío y un proceso de producción anterior a esto abre igual. */
function normalizar(v, { ahora = null } = {}) {
  const e = v && typeof v === "object" ? v : {};
  return {
    contrato: normalizarContrato(e.contrato),
    polizas: normalizarPolizas(e.polizas, { ahora }),
    pagos: normalizarPagos(e.pagos, { ahora }),
    oficios: normalizarOficios(e.oficios, { ahora }),
    abierto: e.abierto === true,          // lo abrió el usuario: la tarjeta lo recuerda
    actualizado: limpio(e.actualizado, 30) || null,
  };
}

/* ¿QUÉ SE QUEDÓ FUERA AL SANEAR? Los tres normalizadores cortan en su tope y
   descartan las filas en blanco, y hasta aquí lo hacían EN SILENCIO: el usuario
   habría creído que apuntó algo que no está. Es la misma regla que ya obligó a
   `tareas_no_guardadas` en el casillero, y quien la contesta es el handler, que
   es el que responde. Compara lo PEDIDO con lo GUARDADO, lista por lista. */
function loQueNoCupo(pedido, guardado) {
  const n = (v) => (Array.isArray(v) ? v.length : 0);
  const out = {};
  for (const [k, tope] of [["polizas", MAX_POLIZAS], ["pagos", MAX_PAGOS], ["oficios", MAX_OFICIOS]]) {
    const pedidas = n(pedido && pedido[k]), guardadas = n(guardado && guardado[k]);
    if (pedidas > guardadas) out[k] = { pedidas, guardadas, tope };
  }
  const partes = [];
  if (out.polizas) partes.push(`${out.polizas.guardadas} de las ${out.polizas.pedidas} pólizas (el tope es ${out.polizas.tope} y una fila en blanco no se guarda)`);
  if (out.pagos) partes.push(`${out.pagos.guardadas} de los ${out.pagos.pedidas} cobros (el tope es ${out.pagos.tope} y un cobro sin concepto no se guarda)`);
  if (out.oficios) partes.push(`${out.oficios.guardadas} de los ${out.oficios.pedidas} oficios (el tope es ${out.oficios.tope} y un oficio sin asunto no se guarda)`);
  return partes.length ? { listas: out, aviso: `Se guardaron ${partes.join("; ")}.` } : null;
}

/* ¿Hay algo escrito? Un expediente con todo vacío no se guarda ni se pinta: es
   ruido en la tarjeta y peso en la respuesta. */
function tieneAlgo(exp) {
  if (!exp) return false;
  const c = exp.contrato || {};
  const conDatos = Object.entries(c).some(([k, v]) => (k === "suspendido" ? v === true : v != null));
  return conDatos || (exp.polizas || []).length > 0 || (exp.pagos || []).length > 0 || (exp.oficios || []).length > 0;
}

/* ═══ LO QUE SE DERIVA ═══════════════════════════════════════════════════════ */

/* EL ESTADO SALE DE LAS FECHAS. La suspensión gana a todo (es un hecho que
   ninguna fecha implica); después manda la fecha más avanzada que exista. Sin
   ninguna fecha, «adjudicado»: es donde empieza todo proceso ganado. */
function estadoDe(exp) {
  const c = (exp && exp.contrato) || {};
  if (c.suspendido === true) return ESTADO_SUSPENDIDO.id;
  for (let i = ESTADOS_CONTRATO.length - 1; i >= 0; i--) {
    const e = ESTADOS_CONTRATO[i];
    if (!e.campo) return e.id;
    if (c[e.campo]) return e.id;
  }
  return ESTADOS_CONTRATO[0].id;
}

/* Cuándo debería terminar, si se puede saber: acta de inicio + plazo. Se dice
   que es CALCULADO, porque el plazo suele contarse en días calendario pero
   algunos contratos lo cuentan en meses o en días hábiles y la minuta manda. Un
   dato PUBLICADO gana a uno calculado: si el usuario registró la terminación
   real, esta cuenta no se enseña. */
function terminacionPrevista(exp) {
  const c = (exp && exp.contrato) || {};
  if (!c.fecha_acta_inicio || !c.plazo_dias) return null;
  const [y, m, d] = c.fecha_acta_inicio.split("-").map(Number);
  const t = Date.UTC(y, m - 1, d) + c.plazo_dias * 86400000;
  const f = new Date(t);
  const iso = `${f.getUTCFullYear()}-${String(f.getUTCMonth() + 1).padStart(2, "0")}-${String(f.getUTCDate()).padStart(2, "0")}`;
  return diaValido(iso);
}

/* Días de calendario entre dos días. Se llama a la del casillero para no tener
   dos cuentas del mismo número (require diferido: ciclo). */
const entreDias = (a, b) => util().diasEntreDias(a, b);

/* CUÁNTO LLEVA COBRADO Y CUÁNTO LE DEBEN. Toda suma dice de cuántos registros
   salió y cuántos se quedaron fuera por no tener cifra: «lleva cobrados
   $120.000.000» con dos actas sin valor es una cifra falsa bien maquetada, que
   es justo lo que este proyecto persigue. */
function dineroDe(exp) {
  const pagos = (exp && exp.pagos) || [];
  const valor = (exp && exp.contrato && exp.contrato.valor_cop) != null ? exp.contrato.valor_cop : null;
  const conValor = pagos.filter((p) => p.valor_cop != null);
  const sinValor = pagos.length - conValor.length;
  const pagado = conValor.filter((p) => p.pagado);
  const radicadoSinPagar = conValor.filter((p) => !p.pagado && p.radicado_el);
  const suma = (l) => l.reduce((n, p) => n + p.valor_cop, 0);
  /* CERO COBRADO ES UN DATO; «no se puede sumar» NO ES CERO. Aquí la fuente es
     el propio usuario: si tiene todos sus cobros escritos y ninguno pagado, ha
     cobrado CERO y eso es verdad. Lo que no se puede sumar es una lista con
     cobros SIN valor: ahí la respuesta es null, y las dos cifras que dependen de
     ella —el saldo y su rótulo de completitud— tienen que decir lo mismo.
     El defecto que esto arregla (cazado por la revisión adversaria del propio
     diff, 8-sep-2026): con valor de contrato y ningún cobro pagado, `cobrado`
     salía null por venir de una lista vacía, `saldo_cop` salía null en
     consecuencia y `saldo_incompleto` decía **false** — un hueco declarado
     completo, en pesos. La pantalla habría pintado un vacío sin motivo, o
     alguien lo habría «arreglado» con un `|| 0`, que es convertir «no sé» en
     «cero cobrado»: la regla dura número uno de esta casa, al revés. */
  const cobrado = sinValor > 0 ? null : suma(pagado);
  const porCobrar = sinValor > 0 ? null : suma(radicadoSinPagar);
  const saldo = valor != null && cobrado != null ? Math.max(0, valor - cobrado) : null;
  return {
    valor_contrato_cop: valor,
    cobrado_cop: cobrado,
    por_cobrar_radicado_cop: porCobrar,
    cobros: pagos.length, cobros_pagados: pagado.length, cobros_sin_valor: sinValor,
    /* el saldo solo existe si se conocen las DOS cifras y ninguna se inventó */
    saldo_cop: saldo,
    saldo_incompleto: saldo == null,
    nota: sinValor > 0
      ? `${sinValor === 1 ? "Un cobro no tiene" : `${sinValor} cobros no tienen`} valor escrito, así que no se puede sumar cuánto lleva cobrado. Escríbalo y la cuenta sale sola.`
      : valor == null && pagos.length ? "No ha escrito el valor del contrato, así que no se puede decir cuánto falta por cobrar." : null,
  };
}

/* LO QUE ESTE CONTRATO LE COME DE SU CAPACIDAD PARA EL SIGUIENTE.
   La guía CCE-EICP-GI-22 descuenta de la capacidad residual los SALDOS de los
   contratos en ejecución (SCE), y lib/capacidad lo recibe hoy en 0 con una
   advertencia en el registro: nadie se lo da. Este es el primer sitio de la casa
   donde ese saldo EXISTE, porque lo escribe quien lo tiene.
   Se PUBLICA, y no se mete en la K que decide: solo cuenta lo que el usuario
   haya registrado, y una K corregida a medias cambiaría en silencio qué procesos
   pasan la puerta de capacidad. Enseñarlo con su advertencia es un hecho; usarlo
   para decidir sería una cifra incompleta disfrazada de completa. */
function saldoEnEjecucion(exp, hoy) {
  const estado = estadoDe(exp);
  if (estado !== "ejecucion" && estado !== "suspendido") return null;
  const d = dineroDe(exp);
  if (d.valor_contrato_cop == null) return { saldo_cop: null, motivo: "sin el valor del contrato no se puede calcular el saldo." };
  if (d.cobros_sin_valor > 0) return { saldo_cop: null, motivo: "hay cobros sin valor escrito: el saldo saldría corto." };
  /* EL SALDO SALE DE `dineroDe`, NO SE VUELVE A RESTAR AQUÍ. Tenía su propia
     cuenta con un `|| 0` sobre `cobrado_cop`, y en el caso de «ningún cobro
     pagado» las dos hermanas daban dos verdades del mismo número: una decía
     «no sé» y la otra 500.000.000. Dos cálculos «equivalentes hoy» divergen a
     la primera corrección — se llama a la regla que ya existe. */
  const saldo = d.saldo_cop;
  if (saldo == null) return { saldo_cop: null, motivo: "no se puede sumar lo cobrado con los datos que hay." };
  const fin = (exp.contrato && exp.contrato.fecha_terminacion) || terminacionPrevista(exp);
  const faltan = fin && hoy ? entreDias(hoy, fin) : null;
  return {
    saldo_cop: saldo,
    meses_restantes: faltan == null ? null : Math.max(0, Math.min(12, Math.ceil(faltan / 30))),
    motivo: null,
    /* La frase de pantalla NO dice «capacidad residual»: es vocabulario interno
       y el glosario ya fijó cómo se dice de cara al usuario. La cifra se enseña
       con lo que significa —cuánto de este contrato le falta por facturar— y con
       su límite —solo cuenta lo que usted haya registrado—, nunca con el nombre
       de la fórmula que la usa. */
    lectura: "Es lo que le falta por facturar de este contrato. Mientras siga abierto le baja lo que le queda disponible para tomar otro; aquí se enseña la cifra, no se descuenta sola, porque solo cuenta los contratos que usted haya registrado.",
  };
}

/* ═══ LO QUE AVISA ═══════════════════════════════════════════════════════════
   El falso caro de un contrato en ejecución es el NEGATIVO. Cada aviso lleva su
   fecha (para que entre en el calendario con la urgencia por días que ya usan
   los hitos) y dice de quién es el dato: lo escribió usted. */
const DIAS_AVISO_POLIZA = 30;      // renovar una póliza no se hace en un día
const DIAS_SIN_ACTA_INICIO = 15;   // firmado hace más de dos semanas y sin empezar
const DIAS_COBRO_SIN_PAGAR = 45;   // radicado y sin pagar: hay que ir a preguntar

function avisosDeExpediente(exp, hoy, { nombre = null } = {}) {
  const out = [];
  if (!exp || !tieneAlgo(exp)) return out;
  const d = diaValido(hoy);
  if (!d) return out;
  const c = exp.contrato || {};
  const estado = estadoDe(exp);
  /* El mensaje se escribe en minúscula para poder colgar del nombre del proceso
     («Obra X: la póliza vence…», que es como lo arma el correo diario). Sin
     nombre delante, la frase es la oración entera y empieza en mayúscula: dos
     mayúsculas distintas para el mismo texto serían dos textos. */
  const quien = nombre ? `${nombre}: ` : "";
  const push = (o) => out.push({ origen: "usted", ...o,
    mensaje: nombre ? `${quien}${o.mensaje}` : o.mensaje.charAt(0).toLocaleUpperCase("es-CO") + o.mensaje.slice(1) });

  /* 1 · LA PÓLIZA QUE VENCE. Es el aviso más caro de todos: sin garantía vigente
     la entidad puede declarar el incumplimiento y cobrar la que hay. */
  for (const p of exp.polizas || []) {
    if (estado === "liquidado") continue;
    const como = p.amparo_etiqueta || AMPARO_ETIQUETA[p.amparo] || "Garantía";
    if (!p.hasta) {
      push({ tipo: "poliza_sin_fecha", fecha: null, urgencia: "media", poliza: p.id,
        mensaje: `no ha escrito hasta cuándo vale la póliza de ${como.toLowerCase()}. Sin esa fecha no se le puede avisar antes de que venza.` });
      continue;
    }
    const faltan = entreDias(d, p.hasta);
    if (faltan == null || faltan > DIAS_AVISO_POLIZA) continue;
    push({ tipo: "poliza", fecha: p.hasta, poliza: p.id,
      urgencia: faltan <= 7 ? "alta" : "media",
      mensaje: faltan < 0 ? `la póliza de ${como.toLowerCase()} venció el ${fechaLegible(p.hasta)}. Renuévela y radíquela hoy.`
        : faltan === 0 ? `la póliza de ${como.toLowerCase()} vence HOY (${fechaLegible(p.hasta)}).`
          : `la póliza de ${como.toLowerCase()} vence en ${faltan} ${faltan === 1 ? "día" : "días"} (${fechaLegible(p.hasta)}). Renovarla y que la entidad la apruebe no se hace en un día.` });
  }

  /* 2 · FIRMADO Y SIN EMPEZAR. El plazo no corre, pero los costos fijos sí. */
  if (estado === "firmado" && c.fecha_firma) {
    const desde = entreDias(c.fecha_firma, d);
    if (desde != null && desde >= DIAS_SIN_ACTA_INICIO) {
      push({ tipo: "sin_acta_inicio", fecha: c.fecha_firma, urgencia: "media",
        mensaje: `firmó el contrato hace ${desde} días y todavía no ha registrado el acta de inicio. Mientras no se firme, el plazo no corre y usted ya está gastando.` });
    }
  }

  /* 3 · EL PLAZO QUE SE ACABA. Con acta de inicio y plazo se sabe el día. */
  if (estado === "ejecucion" || estado === "suspendido") {
    const fin = c.fecha_terminacion || terminacionPrevista(exp);
    if (fin) {
      const faltan = entreDias(d, fin);
      if (faltan != null && faltan <= DIAS_AVISO_POLIZA) {
        const calculada = !c.fecha_terminacion;
        push({ tipo: "plazo", fecha: fin, urgencia: faltan <= 7 ? "alta" : "media",
          mensaje: faltan < 0 ? `el plazo de ejecución se cumplió el ${fechaLegible(fin)}${calculada ? " según el acta de inicio y el plazo que usted registró" : ""}. Si la obra sigue sin prórroga firmada, la entidad puede multarlo y, en el peor caso, quitarle el contrato y dejarlo sin poder contratar con el Estado. Una prórroga se firma ANTES del vencimiento.`
            : `al plazo de ejecución le queda ${faltan === 1 ? "1 día" : `${faltan} días`} (${fechaLegible(fin)})${calculada ? ", contando desde el acta de inicio" : ""}. Una prórroga se firma antes de que venza, nunca después.` });
      }
    }
  }

  /* 4 · EL COBRO RADICADO QUE NO LLEGA. La caja es lo que mata al pequeño. */
  for (const p of exp.pagos || []) {
    if (p.pagado || !p.radicado_el) continue;
    const desde = entreDias(p.radicado_el, d);
    if (desde == null || desde < DIAS_COBRO_SIN_PAGAR) continue;
    push({ tipo: "cobro", fecha: p.radicado_el, urgencia: "media", pago: p.id,
      mensaje: `radicó «${p.concepto}» hace ${desde} días y no ha registrado el pago. Pregunte en la entidad por dónde va.` });
  }

  /* 5 · EL OFICIO SIN RESPONDER. Un requerimiento sin respuesta a tiempo es la
     puerta de una multa. */
  for (const o of exp.oficios || []) {
    if (o.respondido || o.sentido !== "recibido" || !o.responder_antes) continue;
    const faltan = entreDias(d, o.responder_antes);
    if (faltan == null || faltan > 7) continue;
    push({ tipo: "oficio", fecha: o.responder_antes, urgencia: faltan <= 2 ? "alta" : "media", oficio: o.id,
      mensaje: faltan < 0 ? `se le pasó responder «${o.asunto}»: era antes del ${fechaLegible(o.responder_antes)}.`
        : faltan === 0 ? `hoy vence el plazo para responder «${o.asunto}».`
          : `le queda${faltan === 1 ? " 1 día" : `n ${faltan} días`} para responder «${o.asunto}» (${fechaLegible(o.responder_antes)}).` });
  }

  /* 5 bis · LA LIQUIDACIÓN QUE SE VA A FIRMAR. Es el aviso de una sola pantalla
     que más dinero decide en un contrato de obra: lo que usted no deje escrito
     como reclamo CONCRETO en el acta de liquidación bilateral, después no lo
     puede pedir. Se enseña en cuanto la obra termina —no cuando ya la firmó— y
     no se apaga hasta que registre la liquidación. No cita ningún plazo legal:
     el del contrato manda y esta aplicación no lo ha leído. */
  if (estado === "terminado") {
    push({ tipo: "liquidacion", fecha: c.fecha_terminacion || null, urgencia: "media",
      mensaje: "antes de firmar el acta de liquidación, escriba en ella sus reclamos, uno por uno y con su cifra: mayores cantidades, obras que ordenaron de más, sobrecostos por esperas. Lo que no quede escrito ahí, concreto, después ya no se puede pedir." });
  }

  /* 6 · TERMINADO Y SIN LIQUIDAR. Mientras no se liquide, las garantías siguen
     abiertas y el saldo sigue contando contra su capacidad para el siguiente.
     NO se afirma un plazo legal: el del contrato manda y esta aplicación no lo
     ha leído. Se dice el hecho —cuánto lleva— y qué se le está yendo. */
  if (estado === "terminado" && c.fecha_terminacion) {
    const desde = entreDias(c.fecha_terminacion, d);
    if (desde != null && desde >= 60) {
      push({ tipo: "sin_liquidar", fecha: c.fecha_terminacion, urgencia: "baja",
        mensaje: `terminó hace ${desde} días y no ha registrado el acta de liquidación. Mientras no se liquide, las garantías siguen abiertas. El plazo para liquidar lo fija su contrato: revíselo.` });
    }
  }
  return out;
}

/* ═══ LO QUE VA AL CALENDARIO ════════════════════════════════════════════════
   Las fechas del expediente en la forma de un hito, para que el calendario del
   casillero y el `.ics` las lleven. `origen: "usted"` SIEMPRE: las escribió el
   contratista y `lib/cronograma.fuenteDeHito` las estampa como suyas — jamás
   con el sello «Fuente: SECOP II». Lo ya cumplido no viaja: un recordatorio de
   algo hecho es ruido. */
function hitosDeExpediente(exp) {
  const out = [];
  if (!exp || !tieneAlgo(exp)) return out;
  const c = exp.contrato || {};
  const estado = estadoDe(exp);
  const add = (id, etiqueta, fecha, evidencia) => { if (fecha) out.push({ id, etiqueta, fecha, origen: "usted", evidencia }); };
  if (estado !== "liquidado") {
    for (const p of exp.polizas || []) {
      add(`poliza-${p.id}`, `Vence la póliza de ${(p.amparo_etiqueta || AMPARO_ETIQUETA[p.amparo] || "garantía").toLowerCase()}`, p.hasta, "lo registró usted en el expediente del contrato");
    }
  }
  if (estado === "ejecucion" || estado === "suspendido") {
    const fin = c.fecha_terminacion || terminacionPrevista(exp);
    add("fin-plazo", c.fecha_terminacion ? "Termina el plazo del contrato" : "Termina el plazo del contrato (contado desde el acta de inicio)", fin,
      c.fecha_terminacion ? "lo registró usted en el expediente del contrato" : "calculado con el acta de inicio y el plazo que usted registró");
  }
  for (const o of exp.oficios || []) {
    if (o.respondido || o.sentido !== "recibido") continue;
    add(`oficio-${o.id}`, `Responder: ${o.asunto}`, o.responder_antes, "lo registró usted en el expediente del contrato");
  }
  return out.sort((a, b) => String(a.fecha).localeCompare(String(b.fecha)));
}

/* ═══ LA CABECERA DEL EXPEDIENTE ═════════════════════════════════════════════
   Lo que hay que VER de un contrato en una mirada, sin abrir nada: en qué va,
   cuánto lleva cobrado, qué vence primero y cuál es el paso siguiente. El paso
   siguiente sale del ESTADO, que sale de las fechas: nunca hay dos verdades. */
function siguientePaso(exp, hoy) {
  const estado = estadoDe(exp);
  const c = (exp && exp.contrato) || {};
  if (estado === "suspendido") return "El contrato está suspendido. Guarde el acta de suspensión y esté pendiente del acta de reinicio: el plazo se congela, las pólizas no.";
  if (estado === "adjudicado") return "Le adjudicaron: lo siguiente es constituir las garantías que pide el pliego y firmar el contrato. Registre aquí el número y el valor cuando los tenga.";
  if (estado === "firmado") return "Ya está firmado: lo siguiente es que la entidad apruebe las pólizas y firmar el acta de inicio. Hasta esa acta el plazo no corre.";
  if (estado === "ejecucion") {
    const sinPolizas = !(exp.polizas || []).length;
    if (sinPolizas) return "Está en ejecución. Registre las pólizas con su fecha de vencimiento: es lo único que esta pantalla puede avisarle antes de que sea tarde.";
    return "Está en ejecución. Vaya registrando cada acta de cobro cuando la radique y cuando se la paguen: es lo que le dice cuánto le deben.";
  }
  if (estado === "terminado") return "Terminó la obra: lo siguiente es el acta de liquidación, y ahí es donde se decide la plata que queda pendiente. Escriba sus reclamos en el acta, concretos y con cifra, ANTES de firmarla. Mientras no se liquide, las garantías siguen abiertas y el saldo sigue contando en su capacidad.";
  if (estado === "liquidado") return c.fecha_liquidacion ? `Liquidado el ${fechaLegible(c.fecha_liquidacion)}. Este contrato ya no le compromete capacidad.` : "Liquidado. Este contrato ya no le compromete capacidad.";
  return null;
}

function resumen(exp, hoy) {
  const e = exp && tieneAlgo(exp) ? exp : null;
  if (!e) return null;
  const estado = estadoDe(e);
  const d = dineroDe(e);
  const avisos = avisosDeExpediente(e, hoy);
  const polizas = (e.polizas || []).filter((p) => p.hasta).sort((a, b) => a.hasta.localeCompare(b.hasta));
  const dia = diaValido(hoy);
  const proxima = dia ? polizas.find((p) => p.hasta >= dia) || polizas[polizas.length - 1] || null : polizas[0] || null;
  return {
    estado, estado_etiqueta: ETIQUETA_CONTRATO[estado] || estado,
    numero: (e.contrato && e.contrato.numero) || null,
    dinero: d,
    polizas: (e.polizas || []).length,
    polizas_sin_fecha: (e.polizas || []).filter((p) => !p.hasta).length,
    proxima_poliza: proxima ? { id: proxima.id, amparo: proxima.amparo, etiqueta: proxima.amparo_etiqueta, hasta: proxima.hasta, dias: dia ? entreDias(dia, proxima.hasta) : null } : null,
    termina: (e.contrato && e.contrato.fecha_terminacion) || terminacionPrevista(e),
    termina_calculada: !(e.contrato && e.contrato.fecha_terminacion) && !!terminacionPrevista(e),
    saldo_en_ejecucion: saldoEnEjecucion(e, hoy),
    avisos: avisos.length,
    avisos_altos: avisos.filter((a) => a.urgencia === "alta").length,
    siguiente_paso: siguientePaso(e, hoy),
  };
}

module.exports = {
  ESTADOS_CONTRATO, ESTADO_SUSPENDIDO, ETIQUETA_CONTRATO, AMPAROS, AMPARO_ETIQUETA,
  MAX_POLIZAS, MAX_PAGOS, MAX_OFICIOS, LARGO_TEXTO, LARGO_CORTO,
  DIAS_AVISO_POLIZA, DIAS_SIN_ACTA_INICIO, DIAS_COBRO_SIN_PAGAR,
  normalizar, normalizarContrato, normalizarPolizas, normalizarPagos, normalizarOficios, loQueNoCupo,
  tieneAlgo, estadoDe, terminacionPrevista, dineroDe, saldoEnEjecucion,
  avisosDeExpediente, hitosDeExpediente, siguientePaso, resumen,
};
