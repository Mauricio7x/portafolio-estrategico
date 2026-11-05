/* ============================================================================
   lib/ofertas · CON CUÁNTO OFERTARON TODOS (27-sep-2026, R-11)
   ----------------------------------------------------------------------------
   El dueño lo subió de prioridad el 27-sep: un competidor ya vende «dónde
   quedaron todas las ofertas de un proceso», así que dejó de ser un diferencial
   y es lo mínimo. La fuente es `wi7w-2nvm` («SECOPII - Ofertas Por Proceso»).
   LO MEDIDO ANTES DE ESCRIBIR ESTO (27-sep-2026, datos.gov.co en vivo, con
   CO1.BDOS.7581129, licitación de obra de 2.500 millones):
     · la llave es `id_del_proceso_de_compra`, y trae el `CO1.BDOS…` del
       EXPEDIENTE: casa con `id_del_portafolio` de p6dx-8zbt, no con el
       `id_del_proceso` (CO1.REQ…) de cada fase;
     · 1.836 filas para 100 identificadores de oferta: la fila se repite (una
       por cada código de entidad y más), así que una oferta es su
       `identificador_de_la_oferta` (CO1.RPL…), no una fila. Los 99 que no son
       «Confidencial» casan EXACTO con `respuestas_al_procedimiento` = 99;
     · hay filas «Confidencial» (nombre, NIT e identificador) con valor 0,00:
       ese 0 es «no se publica», jamás «ofertó cero», y como comparten el
       identificador no se pueden contar: se dice que las hay, sin número;
     · el NIT llega también como «No Definido» (el literal-trampa de hgi6);
     · el adjudicatario (AASING SAS, 2.199.985.727 en p6dx) está entre ellas
       con el mismo valor.
   Función PURA (sin red): la consulta la hace lib/handlers/perfil/seguimiento
   con el mismo cliente de las demás fuentes del detalle. */
"use strict";

const normNombre = (s) => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, " ").trim().toUpperCase();
const numero = (v) => { if (v == null || v === "") return null; const n = Number(v); return Number.isFinite(n) ? n : null; };
const esConfidencial = (s) => /^confidencial$/i.test(String(s || "").trim());

/* El NIT publicable: la misma regla de rellenos del seguimiento (require
   diferido: lib/seguimiento arrastra medio árbol), más los dos que esta fuente
   añade — «Confidencial» y los ceros de relleno. */
function nitDe(v) {
  const s = String(v == null ? "" : v).trim();
  if (!s || esConfidencial(s) || /^0+$/.test(s)) return null;
  return require("./seguimiento.js").nitONull(s);
}
/* «por debajo del presupuesto» es la MISMA cuenta de la oferta propia (R-03):
   se llama, no se reescribe. */
const bajo = (valor, presupuesto) => require("./seguimiento.js").ofertaFrenteAlPresupuesto({ valor_cop: valor }, presupuesto);

/* Las filas crudas (o agrupadas) de wi7w-2nvm de UN expediente → las ofertas
   distintas, con el valor en null cuando no se publica o no es en pesos,
   ordenadas de la más baja a la más alta (las sin valor al final).
   · `presupuestoCop` añade a cada una cuánto quedó por debajo del presupuesto;
     sin presupuesto, null (no se inventa la base);
   · `suOferta` (la que anotó el usuario, lib/seguimiento.normalizarOferta) dice
     su puesto SOLO si coincide al peso con una publicada: «2.200 millones»
     anotado frente a 2.199.985.727 publicado se contaba dos veces y decía «habría
     sido la número 2» de quien quizá ganó (revisión adversaria, 27-sep-2026);
   · `mezcla` (varios lotes o fases, o no se sabe): las ofertas no son
     comparables entre sí —unas son por un lote y otras por el total—, así que
     no hay «la del medio» ni puesto;
   · `respuestas` (lo que el proceso dice que respondieron) mide la cobertura;
   · `ganadores` ([{nombre, valor}]) marca la adjudicada si se reconoce. */
/* EL NIT DEL REGISTRO FRENTE AL PUBLICADO (5-nov-2026, plan «Detekta a otro nivel», proceso 14.4; corregido por la revisión
   adversaria del mismo día). El registro escribe «901096271-1» (o «9396710-3», una cédula) y SECOP II publica
   «901096271» o «9010962711». Se acepta SOLO el número igual o el número con SU dígito de verificación pegado: aceptar
   «un dígito más cualquiera» hacía de la cédula 93967105 de un desconocido la oferta del dueño. Sin dígito en el registro,
   solo la igualdad. `registro` es el NIT del perfil; `publicado`, el de la oferta. */
const soloDigitos = (s) => String(s == null ? "" : s).replace(/\D/g, "");
function mismoNit(registro, publicado) {
  const r = String(registro == null ? "" : registro).trim();
  const partes = r.split("-");
  const base = soloDigitos(partes[0]), dv = partes.length === 2 ? soloDigitos(partes[1]) : "";
  const pub = soloDigitos(publicado);
  if (base.length < 6 || !pub) return false;
  return pub === base || (dv.length === 1 && pub === base + dv);
}
function agruparOfertas(filas, { presupuestoCop = null, suOferta = null, respuestas = null, ganadores = [], mezcla = false, nitsPropios = [] } = {}) {
  const P = numero(presupuestoCop);
  const conP = P != null && P > 0;
  const distintas = new Map();
  let confidenciales = false;
  for (const f of Array.isArray(filas) ? filas : []) {
    if (!f || typeof f !== "object") continue;
    const ident = String(f.identificador_de_la_oferta || "").trim();
    const nombreCrudo = String(f.nombre_proveedor || "").trim();
    if (esConfidencial(ident) || esConfidencial(nombreCrudo)) { confidenciales = true; continue; }
    const v = numero(f.valor_de_la_oferta);
    const moneda = String(f.moneda || "COP").trim().toUpperCase();
    // otra moneda no se convierte: sin dato
    const valor = v != null && v > 0 && moneda === "COP" ? Math.round(v) : null;
    const nombre = nombreCrudo && !/^no definido$/i.test(nombreCrudo) ? nombreCrudo : null;
    const k = ident ? `id:${ident}` : `n:${nombre ? normNombre(nombre) : "?"}|${valor == null ? "?" : valor}`;
    const previa = distintas.get(k);
    if (!previa) { distintas.set(k, { identificador: ident || null, proponente: nombre, nit: nitDe(f.nit_del_proveedor), valor_cop: valor }); continue; }
    /* el MISMO identificador con dos valores distintos: no se elige uno, se
       declara sin dato (un valor elegido al azar sería una cifra creíble y falsa) */
    if (!previa.valor_ambiguo && previa.valor_cop !== valor) {
      if (previa.valor_cop == null) previa.valor_cop = valor;
      else if (valor != null) { previa.valor_ambiguo = true; previa.valor_cop = null; }
    }
    if (!previa.proponente && nombre) previa.proponente = nombre;
    if (!previa.nit) previa.nit = nitDe(f.nit_del_proveedor);
  }
  const ofertas = [...distintas.values()].map((o) => ({
    ...o,
    por_debajo_del_presupuesto_pct: conP && !mezcla && o.valor_cop != null ? bajo(o.valor_cop, P) : null,
  })).sort((a, b) => (a.valor_cop == null) - (b.valor_cop == null) || (a.valor_cop || 0) - (b.valor_cop || 0));
  /* la adjudicada: por nombre; si hay varias con ese nombre, la del valor adjudicado */
  for (const g of Array.isArray(ganadores) ? ganadores : []) {
    if (!g || !g.nombre) continue;
    const gn = normNombre(g.nombre), gv = numero(g.valor);
    const candidatas = ofertas.filter((o) => o.proponente && normNombre(o.proponente) === gn);
    const cual = candidatas.find((o) => gv != null && o.valor_cop === Math.round(gv)) || (candidatas.length === 1 ? candidatas[0] : null);
    if (cual) cual.adjudicada = true;
  }
  const valores = ofertas.map((o) => o.valor_cop).filter((x) => x != null);
  const n = valores.length;
  /* el puesto de cada una, con empates (dos iguales comparten puesto); con mezcla, ninguno */
  for (const o of ofertas) o.puesto = !mezcla && o.valor_cop != null ? valores.filter((x) => x < o.valor_cop).length + 1 : null;
  /* LA SUYA POR EL NIT (5-nov-2026, proceso 14.4): antes solo se reconocía si el valor anotado coincidía al peso; ahora
     también por el NIT de la empresa o de los integrantes del perfil. Una sola: si casan varias (dos lotes de la misma
     empresa), ninguna se elige y se queda la regla del valor anotado */
  const propias = (Array.isArray(nitsPropios) ? nitsPropios : []).length ? ofertas.filter((o) => o.nit && nitsPropios.some((n) => mismoNit(n, o.nit))) : [];
  if (propias.length === 1) propias[0].propia = true;
  const porNit = propias.length === 1 && propias[0].valor_cop != null ? propias[0] : null;
  /* «la del medio» es una oferta REAL (con número par, la más baja de las dos
     centrales), no un promedio que nadie ofertó; con menos de tres no la hay */
  const mediana = !mezcla && n >= 3 ? valores[Math.floor((n - 1) / 2)] : null;
  const suya = suOferta && numero(suOferta.valor_cop) != null ? Math.round(numero(suOferta.valor_cop)) : null;
  const r = numero(respuestas);
  const conR = r != null && r > 0;   // el 0 de esta columna ex-post es SIN DATO (lib/indice_competencia)
  return {
    ofertas,
    distintas: ofertas.length,
    con_valor: n,
    sin_valor_publicado: ofertas.length - n,
    /* las confidenciales comparten identificador y no se pueden contar: se dice que las hay */
    hay_confidenciales: confidenciales,
    mas_baja_cop: n ? valores[0] : null,
    mas_alta_cop: n ? valores[n - 1] : null,
    mediana_cop: mediana,
    mas_baja_por_debajo_pct: conP && n && !mezcla ? bajo(valores[0], P) : null,
    mediana_por_debajo_pct: conP && mediana != null ? bajo(mediana, P) : null,
    /* la suya frente a las publicadas: «puesto k de N» por valor (1 = la más
       baja), solo si está publicada al peso; si no, puesto null */
    su_oferta: !n || mezcla ? null : porNit ? {
      valor_cop: porNit.valor_cop,
      puesto: porNit.puesto,
      de: n,
      por_debajo_del_presupuesto_pct: conP ? bajo(porNit.valor_cop, P) : null,
      esta_publicada: true,
      por_nit: true,
    } : suya == null ? null : {
      valor_cop: suya,
      puesto: valores.includes(suya) ? valores.filter((x) => x < suya).length + 1 : null,
      de: n,
      por_debajo_del_presupuesto_pct: conP ? bajo(suya, P) : null,
      esta_publicada: valores.includes(suya),
    },
    mezcla_lotes: !!mezcla,
    /* cobertura: lo publicado frente a lo que el proceso dice que respondieron */
    respondieron_segun_el_proceso: conR ? r : null,
    faltan_por_publicar: conR ? Math.max(0, r - ofertas.length) : null,
  };
}

/* POR QUÉ QUEDÓ ASÍ (5-nov-2026, plan «Detekta a otro nivel», proceso 14.2). Con lo que ya se tiene de UN proceso —las
   ofertas publicadas (wi7w) y, si se leyó, la evaluación (lib/evaluacion, cada dato con su cita)— se arma la explicación
   de su resultado, línea por línea y cada una con su fuente. No calcula puntajes ni adivina: lo que la evaluación no dice
   no se dice, y sin saber cuál es la oferta del usuario no hay explicación (null).
   `g` = agruparOfertas(...) · `captura` = el registro guardado de la evaluación ({captura: {ofertas, metodo, adjudicatario}}). */
const METODO_LEGIBLE = Object.freeze({ mediana: "la mediana con valor absoluto", geometrica: "la media geométrica", aritmetica_baja: "la media aritmética baja", menor_valor: "el menor valor" });
function explicarResultado(g, captura = null) {
  if (!g || !Array.isArray(g.ofertas)) return null;
  /* la suya: por el NIT, o por el valor anotado SOLO si una sola oferta publicada tiene ese valor (con dos iguales al
     peso, la primera podía ser la del rival: revisión adversaria) */
  const conEseValor = g.su_oferta && g.su_oferta.esta_publicada ? g.ofertas.filter((o) => o.valor_cop === g.su_oferta.valor_cop) : [];
  const propia = g.ofertas.find((o) => o.propia) || (conEseValor.length === 1 ? conEseValor[0] : null);
  if (!propia) return null;
  const pesos = (v) => `$${Math.round(Number(v)).toLocaleString("es-CO")}`;
  const pct = (x) => (Math.round(x * 10) / 10).toLocaleString("es-CO");
  const lineas = [];
  const ganadora = g.ofertas.find((o) => o.adjudicada) || null;
  if (!g.mezcla_lotes && propia.puesto != null && g.con_valor) {
    lineas.push({ fuente: "ofertas", texto: `Su oferta, ${pesos(propia.valor_cop)}, quedó de número ${propia.puesto} entre ${g.con_valor} por precio, de la más baja a la más alta.` });
  }
  if (!g.mezcla_lotes && ganadora && ganadora !== propia && ganadora.valor_cop != null && propia.valor_cop != null && propia.valor_cop > 0) {
    const d = ((propia.valor_cop - ganadora.valor_cop) / propia.valor_cop) * 100;
    lineas.push({ fuente: "ofertas", texto: Math.abs(d) < 0.05
      ? `Ganó ${ganadora.proponente || "otra oferta"} con casi el mismo valor que usted (${pesos(ganadora.valor_cop)}): no la separó el precio.`
      : d > 0 ? `Ganó ${ganadora.proponente || "otra oferta"} con ${pesos(ganadora.valor_cop)}: ofertó ${pct(d)} % menos que usted.`
        : `Ganó ${ganadora.proponente || "otra oferta"} con ${pesos(ganadora.valor_cop)}, ${pct(-d)} % MÁS que usted: no ganó por ser la más barata.` });
  } else if (ganadora === propia) {
    lineas.push({ fuente: "ofertas", texto: "Su oferta es la que figura como adjudicada." });
  }
  const k = captura && captura.captura ? captura.captura : null;
  if (k && Array.isArray(k.ofertas) && k.ofertas.length && propia.proponente) {
    const E = require("./evaluacion.js");
    /* SOLO el nombre exacto (revisión adversaria): con «parecido», «CONSORCIO ANDES» tomaba el rechazo de «UNION TEMPORAL
       ANDES» con la cita del otro debajo. Sin su fila exacta, la evaluación no dice nada de la oferta del usuario */
    const exactas = k.ofertas.filter((o) => E.claveDeOferente(o.oferente) === E.claveDeOferente(propia.proponente));
    const suya = exactas.length === 1 ? exactas[0] : null;
    if (suya) {
      if (suya.estado === "rechazada") lineas.push({ fuente: "evaluacion", cita: suya.cita || null, texto: `La evaluación la rechazó${suya.motivo ? ` por ${E.MOTIVO_TEXTO[suya.motivo] || "otro motivo"}` : ""}${suya.motivo_texto ? `: «${suya.motivo_texto}»` : ""}.` });
      else if (suya.estado === "habil") lineas.push({ fuente: "evaluacion", cita: suya.cita || null, texto: "La evaluación la dejó hábil." });
      const gan = k.adjudicatario ? k.ofertas.filter((o) => E.claveDeOferente(o.oferente) === E.claveDeOferente(k.adjudicatario.nombre)) : [];
      const g1 = gan.length === 1 ? gan[0] : null;
      /* las dos citas: la cifra del ganador está en SU fila, no en la del usuario */
      const dosCitas = g1 && g1.cita && suya.cita ? `${suya.cita} … ${g1.cita}` : suya.cita || null;
      if (typeof suya.puntaje_total === "number" && g1 && g1 !== suya && typeof g1.puntaje_total === "number") {
        lineas.push({ fuente: "evaluacion", cita: dosCitas, texto: `Sacó ${suya.puntaje_total.toLocaleString("es-CO")} puntos en total; el ganador, ${g1.puntaje_total.toLocaleString("es-CO")}.` });
      }
      if (typeof suya.puntaje_precio === "number" && g1 && g1 !== suya && typeof g1.puntaje_precio === "number") {
        lineas.push({ fuente: "evaluacion", cita: dosCitas, texto: `En el precio sacó ${suya.puntaje_precio.toLocaleString("es-CO")}; el ganador, ${g1.puntaje_precio.toLocaleString("es-CO")}.` });
      }
    }
    if (k.metodo && METODO_LEGIBLE[k.metodo]) lineas.push({ fuente: "evaluacion", texto: `El precio se puntuó con ${METODO_LEGIBLE[k.metodo]}.` });
  }
  /* `evaluacion_leida` aparte de `con_evaluacion`: leída sin nada que decir de la suya no es «todavía no se ha leído» */
  return lineas.length ? { lineas, con_evaluacion: lineas.some((l) => l.fuente === "evaluacion"), evaluacion_leida: !!k } : null;
}

module.exports = { agruparOfertas, normNombre, mismoNit, explicarResultado, METODO_LEGIBLE };
