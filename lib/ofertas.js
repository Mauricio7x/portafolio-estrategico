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
function agruparOfertas(filas, { presupuestoCop = null, suOferta = null, respuestas = null, ganadores = [], mezcla = false } = {}) {
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
    su_oferta: suya == null || !n || mezcla ? null : {
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

module.exports = { agruparOfertas, normNombre };
