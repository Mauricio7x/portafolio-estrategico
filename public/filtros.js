/* public/filtros.js · Vocabulario y estado de los SIETE filtros (Fase 8 · Detekta v4)
   ─────────────────────────────────────────────────────────────────────────────
   ÚNICA fuente de verdad de lo que un filtro SIGNIFICA: las opciones de cada
   uno, su etiqueta en lenguaje llano (la que ve el usuario), los rangos de
   cuantía, las ventanas de cierre y la tabla de departamentos con su código
   DANE. `lib/filtros_lista.js` lo RE-USA en el servidor para aplicar los
   filtros al corpus; el navegador lo carga como <script> para pintar los
   controles y para leer/escribir el estado en la URL. No hay una copia
   «espejo» que pueda divergir (el patrón de costos.js y glosario.js): si un
   rango cambia, cambia para el que filtra y para el que pinta a la vez.

   Regla de la fase: el nombre TÉCNICO de un filtro (modalidad, cuantía,
   UNSPSC, código DANE) NO aparece en pantalla. Aquí cada opción trae
   `etiqueta` (lo que se ve) e `id` (lo que viaja en la URL, corto y estable).

   Este archivo NO clasifica filas ni toca el corpus: eso exige `norm`, los
   verbos de obra y la pertinencia, que viven en el servidor
   (lib/filtros_lista.js). Aquí solo hay vocabulario y aritmética de URL. */
(function (raiz, fabrica) {
  const api = fabrica();
  if (typeof module === "object" && module.exports) module.exports = api;
  else raiz.Filtros = api;
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  /* ─── 1 · Qué tipo de trabajo es ─────────────────────────────────────── */
  const TIPOS_TRABAJO = Object.freeze([
    { id: "obra", etiqueta: "Obra", ayuda: "Construcción, mantenimiento, mejoramiento, adecuación" },
    { id: "consultoria", etiqueta: "Consultoría", ayuda: "Estudios y diseños, asesoría técnica" },
    { id: "interventoria", etiqueta: "Interventoría", ayuda: "Vigilar la obra de otro" },
    { id: "suministro", etiqueta: "Suministro", ayuda: "Compra de materiales o equipos, sin obra. Apagado por defecto: un contratista de obra rara vez lo quiere" },
    { id: "servicios", etiqueta: "Servicios", ayuda: "Mantenimiento de equipos, alquiler de maquinaria y otros servicios que no son obra civil. Apagado por defecto" },
  ]);
  /* Suministro y Servicios vienen APAGADOS por defecto (plan v4 §8.6, y el
     18-ago-2026: bajo «servicios» viven el mantenimiento de ascensores, aires y
     extintores, el alquiler de maquinaria y la logística — lo que el dueño vio
     colarse). Con el filtro ausente en la URL se aplican estos tres;
     `tipo=todos` los enciende todos. */
  const TIPOS_POR_DEFECTO = Object.freeze(["obra", "consultoria", "interventoria"]);

  /* ─── 2 · Cómo lo adjudican ──────────────────────────────────────────── */
  const MODALIDADES = Object.freeze([
    { id: "licitacion", etiqueta: "Licitación pública", ayuda: "La más grande y abierta: cualquiera se presenta" },
    /* EL NOMBRE PROPIO DE LA MODALIDAD, Y NO UN APODO (encargo del ingeniero,
       24-ago-2026). Decía «Proceso pequeño», que además de no ser su nombre
       chocaba con «Mínima cuantía» —la de aquí abajo, que SÍ es la pequeña— y
       escondía lo único que hay que saber: que aquí no se oferta sin avisar
       antes, y que el plazo para avisar puede ser de horas. La regla de la
       Fase 6 lo permite: los nombres propios de las modalidades no son jerga
       de campo (la prueba de jerga solo barre las ETIQUETAS de los campos). */
    { id: "abreviada", etiqueta: "Selección abreviada de menor cuantía · Manifestación de interés", ayuda: "Primero hay que avisar que le interesa y después se oferta. El plazo para avisar lo fija la entidad y puede ser de solo unas horas: la ley solo pone el techo de 3 días hábiles." },
    { id: "subasta", etiqueta: "Subasta inversa", ayuda: "Gana el precio más bajo en una puja" },
    { id: "meritos", etiqueta: "Concurso de méritos", ayuda: "Para consultoría e interventoría: pesa la experiencia, no el precio" },
    { id: "minima", etiqueta: "Mínima cuantía", ayuda: "Procesos pequeños y rápidos, gana el menor precio" },
    { id: "directa", etiqueta: "Contratación directa", ayuda: "La entidad elige sin concurso: no aparece aquí porque no hay a qué presentarse" },
    { id: "especial", etiqueta: "Régimen especial (con ofertas)", ayuda: "Entidades con reglas propias que sí reciben ofertas" },
  ]);

  /* ─── 3 · Dónde queda: departamentos con código DANE (DIVIPOLA) ──────── */
  const DEPARTAMENTOS = Object.freeze([
    { codigo: "05", nombre: "Antioquia", clave: "ANTIOQUIA" },
    { codigo: "08", nombre: "Atlántico", clave: "ATLANTICO" },
    { codigo: "11", nombre: "Bogotá D.C.", clave: "BOGOTA D.C." },
    { codigo: "13", nombre: "Bolívar", clave: "BOLIVAR" },
    { codigo: "15", nombre: "Boyacá", clave: "BOYACA" },
    { codigo: "17", nombre: "Caldas", clave: "CALDAS" },
    { codigo: "18", nombre: "Caquetá", clave: "CAQUETA" },
    { codigo: "19", nombre: "Cauca", clave: "CAUCA" },
    { codigo: "20", nombre: "Cesar", clave: "CESAR" },
    { codigo: "23", nombre: "Córdoba", clave: "CORDOBA" },
    { codigo: "25", nombre: "Cundinamarca", clave: "CUNDINAMARCA" },
    { codigo: "27", nombre: "Chocó", clave: "CHOCO" },
    { codigo: "41", nombre: "Huila", clave: "HUILA" },
    { codigo: "44", nombre: "La Guajira", clave: "LA GUAJIRA" },
    { codigo: "47", nombre: "Magdalena", clave: "MAGDALENA" },
    { codigo: "50", nombre: "Meta", clave: "META" },
    { codigo: "52", nombre: "Nariño", clave: "NARINO" },
    { codigo: "54", nombre: "Norte de Santander", clave: "NORTE DE SANTANDER" },
    { codigo: "63", nombre: "Quindío", clave: "QUINDIO" },
    { codigo: "66", nombre: "Risaralda", clave: "RISARALDA" },
    { codigo: "68", nombre: "Santander", clave: "SANTANDER" },
    { codigo: "70", nombre: "Sucre", clave: "SUCRE" },
    { codigo: "73", nombre: "Tolima", clave: "TOLIMA" },
    { codigo: "76", nombre: "Valle del Cauca", clave: "VALLE DEL CAUCA" },
    { codigo: "81", nombre: "Arauca", clave: "ARAUCA" },
    { codigo: "85", nombre: "Casanare", clave: "CASANARE" },
    { codigo: "86", nombre: "Putumayo", clave: "PUTUMAYO" },
    { codigo: "88", nombre: "San Andrés y Providencia", clave: "SAN ANDRES PROVIDENCIA Y SANTA CATALINA" },
    { codigo: "91", nombre: "Amazonas", clave: "AMAZONAS" },
    { codigo: "94", nombre: "Guainía", clave: "GUAINIA" },
    { codigo: "95", nombre: "Guaviare", clave: "GUAVIARE" },
    { codigo: "97", nombre: "Vaupés", clave: "VAUPES" },
    { codigo: "99", nombre: "Vichada", clave: "VICHADA" },
  ]);
  const DEPTO_POR_CODIGO = new Map(DEPARTAMENTOS.map((d) => [d.codigo, d]));
  const DEPTO_POR_CLAVE = new Map(DEPARTAMENTOS.map((d) => [d.clave, d]));

  /* Normaliza lo que escriba el usuario o publique el dataset («Distrito
     Capital de Bogotá», «tolima», «Valle») a la CLAVE de la tabla. Es la misma
     regla que lib/accesibilidad.clave, escrita aquí porque el navegador no
     puede requerir aquel módulo — hay prueba que las ata sobre la misma
     batería. */
  function claveDepartamento(texto) {
    const n = String(texto || "")
      .normalize("NFD").replace(/[̀-ͯ]/g, "")
      .toUpperCase().replace(/[.,]/g, " ").replace(/\s+/g, " ").trim();
    if (!n) return null;
    if (n.includes("BOGOTA")) return "BOGOTA D.C.";
    if (n.includes("SAN ANDRES")) return "SAN ANDRES PROVIDENCIA Y SANTA CATALINA";
    if (n === "VALLE") return "VALLE DEL CAUCA";
    return DEPTO_POR_CLAVE.has(n) ? n : null;
  }
  /* Acepta código DANE («73») o nombre («Tolima», «TOLIMA»); devuelve el
     departamento de la tabla o null. */
  function departamento(valor) {
    const v = String(valor || "").trim();
    if (!v) return null;
    if (/^\d{1,2}$/.test(v)) return DEPTO_POR_CODIGO.get(v.padStart(2, "0")) || null;
    const clave = claveDepartamento(v);
    return clave ? DEPTO_POR_CLAVE.get(clave) : null;
  }

  /* ─── 4 · Cuánto vale ────────────────────────────────────────────────── */
  const RANGOS_CUANTIA = Object.freeze([
    { id: "hasta_50m", etiqueta: "Hasta $50 millones", min: 0, max: 50e6 },
    { id: "50_200m", etiqueta: "De $50 a $200 millones", min: 50e6, max: 200e6 },
    { id: "200_1000m", etiqueta: "De $200 a $1.000 millones", min: 200e6, max: 1000e6 },
    { id: "mas_1000m", etiqueta: "Más de $1.000 millones", min: 1000e6, max: null },
  ]);
  function rangoCuantiaDe(pesos) {
    const v = Number(pesos);
    if (!Number.isFinite(v) || v <= 0) return null; // 0 = sin dato, no «gratis»
    for (const r of RANGOS_CUANTIA) if (v > r.min - 1e-9 && (r.max == null || v <= r.max)) return r.id;
    return null;
  }

  /* ─── 5 · Cuándo hay que entregar la oferta ──────────────────────────── */
  const VENTANAS_CIERRE = Object.freeze([
    { id: "3d", etiqueta: "Cierra en 3 días o menos", dias: 3 },
    { id: "7d", etiqueta: "Cierra esta semana", dias: 7 },
    { id: "15d", etiqueta: "Cierra en 15 días o menos", dias: 15 },
    { id: "+15d", etiqueta: "Cierra en más de 15 días", dias: null },
  ]);
  const VENTANA_POR_ID = new Map(VENTANAS_CIERRE.map((v) => [v.id, v]));
  /* La ventana de un proceso a partir de los DÍAS que le quedan (número o
     null cuando no hay fecha). Sin fecha → null: no se inventa una ventana. */
  function ventanaCierreDe(dias) {
    if (dias == null || !Number.isFinite(dias)) return null;
    if (dias < 0) return "vencido";
    if (dias <= 3) return "3d";
    if (dias <= 7) return "7d";
    if (dias <= 15) return "15d";
    return "+15d";
  }
  /* ¿Un proceso con `dias` para cerrar entra en la ventana pedida? Las
     ventanas son ACUMULATIVAS («esta semana» incluye «en 3 días»), salvo la
     última, que es el resto. */
  function cumpleVentana(dias, id) {
    const v = VENTANA_POR_ID.get(id);
    if (!v || dias == null || !Number.isFinite(dias) || dias < 0) return false;
    return v.dias == null ? dias > 15 : dias <= v.dias;
  }

  /* ─── 6 · Dónde me queda más (orden) y 7 · Buscar entidad ────────────── */
  /* CADA ORDEN DICE SU CRITERIO (encargo del dueño, 18-ago-2026: «dar un
     concepto de por qué los procesos que muestras con esos filtros los muestras,
     de por qué decimos que este es el mejor para el usuario»). `concepto` se
     pinta bajo la barra al elegir el orden y viaja como `title` de la opción.
     Se escribe lo que el orden HACE y lo que NO promete. */
  const ORDENES = Object.freeze([
    { id: "atractividad", etiqueta: "Las mejores para usted (recomendado)",
      concepto: "Primero las que pasan sus cuatro requisitos (registro de proponente, capacidad de contratación, caja y competencia); entre esas, las más cercanas a su zona cuando la aplicación sabe desde qué ciudad opera su empresa (si no lo sabe, la distancia no ordena y solo pesan las alertas de acceso de la zona); y dentro de cada grupo, las de mayor contrato esperado (presupuesto oficial × opción estimada de ganar). Es un orden para mirar primero lo que más probablemente vale su tiempo, no una promesa de adjudicación." },
    { id: "ganancia", etiqueta: "Lo que más deja (solo las que ya costeó)",
      concepto: "Solo las que ya costeó en Precios: ordena por lo que le queda del contrato si lo gana —precio al que suele adjudicar la entidad, menos su costo medido, su administración e imprevistos, y menos la contribución del 5 % de obra pública y las deducciones que haya cargado—, multiplicado por su opción de ganar, que es lo que hace comparable un contrato grande y difícil con uno mediano y ganable. Mientras no haya costeado el proceso no hay cifra que ordenar: el costo se cerraría con su propia estructura de precio y saldría la cuantía multiplicada por una constante, no un dato del proceso. Esas van al final, sin cifra. Para «cuánto dinero hay en juego» está «Mayor contrato esperado»." },
    { id: "margen", etiqueta: "Más recorrido de precio (solo las que ya costeó)",
      concepto: "Solo las que ya costeó en Precios: ordena por el RECORRIDO que le queda al precio entre su piso rentable (costo directo + administración, imprevistos y ganancia mínima + contribución) y el precio al que suele adjudicar la entidad. Es margen de maniobra para ofertar, NO la plata que deja el contrato: para eso está «Lo que más deja». Las demás van al final, sin cifra." },
    { id: "cierre", etiqueta: "Las que cierran antes",
      concepto: "Las que cierran antes, primero. Regla del oficio: la oferta se presenta el día ANTERIOR al cierre." },
    { id: "cuantia", etiqueta: "Las más grandes",
      concepto: "Presupuesto oficial de mayor a menor. Solo el tamaño; no dice nada de la opción de ganar ni de lo que deja." },
    { id: "ve", etiqueta: "Mayor contrato esperado",
      concepto: "Presupuesto oficial multiplicado por la opción estimada de ganar: es un promedio por intento —cuenta las veces que no se gana— y NO es utilidad. La utilidad la calcula el análisis de precios en Precios; aquí solo se ordena por tamaño × opción." },
    { id: "p_ganar", etiqueta: "Las más ganables",
      concepto: "Las que más opción estimada de ganar tienen: sale de cuánta gente compite en esa entidad (histórico de dos años de adjudicaciones), ajustada por prórroga del cierre, por cierres simultáneos y por precio. Sin histórico se asume la competencia típica (5 rivales) y se dice." },
    { id: "competencia", etiqueta: "Las menos peleadas",
      concepto: "Primero las entidades donde históricamente se presentan menos oferentes por proceso (promedio de dos años de adjudicaciones; sin base, al final). Ojo: poca competencia también puede ser señal de un pliego hecho a la medida — revise el pliego." },
    { id: "anticipo", etiqueta: "Mayor anticipo",
      concepto: "Mayor porcentaje de anticipo publicado, primero. Un 0 % casi siempre es «sin dato», no «sin anticipo»: la fuente no publica esa columna." },
  ]);
  const conceptoDe = (id) => { const o = ORDENES.find((x) => x.id === id); return o ? o.concepto : ""; };

  /* ─── Estado del filtro en la URL ────────────────────────────────────────
     Los nombres de los parámetros son cortos y estables (son un contrato: un
     enlace guardado tiene que seguir valiendo). Un valor desconocido se IGNORA,
     jamás vacía la lista ni da error (la regla de `?zona=`). */
  const PARAMS = Object.freeze(["tipo", "modalidad", "dep", "ciudad", "min", "max", "cierre", "cierreDesde", "cierreHasta", "entidad", "q", "manif", "ordenar_por"]);
  /* Avisar que le interesa (menor cuantía): `manif=abierta` deja los procesos
     en los que TODAVÍA VALE LA PENA avisar — los que con certeza siguen
     abiertos y los que están dentro de la ventana en que el plazo puede cerrar
     (la ley fija un máximo de 3 días hábiles desde la apertura, no un plazo:
     la entidad pone el suyo en el pliego). `manif=todas`, los de menor cuantía
     con manifestación, vencida o no. Cualquier otro valor es INERTE. */
  const MANIF_IDS = new Set(["abierta", "todas"]);
  const lista = (v) => String(v || "").split(",").map((s) => s.trim()).filter(Boolean);
  const idsDe = (arr) => new Set(arr.map((x) => x.id));
  const TIPO_IDS = idsDe(TIPOS_TRABAJO), MODALIDAD_IDS = idsDe(MODALIDADES), CIERRE_IDS = idsDe(VENTANAS_CIERRE);
  /* UN VALOR ILEGIBLE ES INERTE, también aquí (ago 2026). Limpiar los caracteres
     ajenos y convertir después dejaba `?max=abc` en `Number("")` = 0: finito,
     ≥ 0 y con la cadena original no vacía, así que pasaba la guarda y la lista
     salía VACÍA con la ficha «Cuánto vale: hasta $0» — justo lo que el contrato
     de este módulo prohíbe («un valor desconocido se IGNORA, jamás vacía la
     lista»). Ahora la cadena tiene que SER un número (admite separadores de
     miles y decimales) para valer; si no, null = sin filtro.
     EL PUNTO SE LEE POR SU FORMA, NO SIEMPRE COMO MILES (ago 2026). La primera
     versión aceptaba `1000000.00` y luego borraba TODOS los puntos, así que
     `?max=1000000.00` filtraba hasta $100 000 000 — cien veces el tope pedido,
     en silencio y con la ficha diciendo la cifra equivocada. Un valor inerte es
     aceptable (lo dice el contrato); un filtro con OTRO valor, no. Se separan
     las tres formas: agrupación colombiana (`1.000.000,50`), decimal con coma
     (`1000000,50`) y decimal con punto (`1000000.50`). `1.000` sigue siendo mil
     —lo captura la agrupación—, que es la lectura colombiana y la que escribe la
     propia app. */
  const numero = (v) => {
    const s = String(v ?? "").trim();
    let n = null;
    if (/^\d{1,3}(\.\d{3})+(,\d+)?$/.test(s)) n = Number(s.replace(/\./g, "").replace(",", "."));
    else if (/^\d+(,\d+)?$/.test(s)) n = Number(s.replace(",", "."));
    else if (/^\d+(\.\d+)?$/.test(s)) n = Number(s);
    return n != null && Number.isFinite(n) && n >= 0 ? n : null;
  };
  /* Una fecha con la FORMA correcta pero que no existe («2026-13-45»,
     «0000-00-00») pasaba y, como `cumple` compara cadenas, vaciaba la lista
     con una ficha que la exhibía. Lo ilegible es inerte, como en `numero()`:
     solo sobrevive lo que vuelve intacto del viaje por Date. */
  const fechaISO = (v) => {
    const s = String(v || "");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
    const d = new Date(s + "T00:00:00Z");
    return Number.isFinite(d.getTime()) && d.toISOString().slice(0, 10) === s ? s : null;
  };

  /* De la query (objeto plano o URLSearchParams) al estado NORMALIZADO. Cada
     campo ausente vale null = «sin filtro». */
  function leerEstado(q) {
    const get = (k) => (q && typeof q.get === "function" ? q.get(k) : (q ? q[k] : null));
    const tipoCrudo = lista(get("tipo"));
    const tipo = tipoCrudo.length === 0 ? null : tipoCrudo.includes("todos") ? [...TIPO_IDS] : tipoCrudo.filter((t) => TIPO_IDS.has(t));
    const modalidad = lista(get("modalidad")).filter((m) => MODALIDAD_IDS.has(m));
    const dep = lista(get("dep")).map(departamento).filter(Boolean).map((d) => d.codigo);
    const ciudad = String(get("ciudad") || "").trim() || null;
    const min = numero(get("min")), max = numero(get("max"));
    const cierre = CIERRE_IDS.has(String(get("cierre") || "")) ? String(get("cierre")) : null;
    const cierreDesde = fechaISO(get("cierreDesde")), cierreHasta = fechaISO(get("cierreHasta"));
    const entidad = String(get("entidad") || "").trim() || null;
    const texto = String(get("q") || "").trim() || null;
    const manif = MANIF_IDS.has(String(get("manif") || "")) ? String(get("manif")) : null;
    return {
      // solo valores desconocidos («tipo=zzz») = filtro inerte, no lista vacía
      tipo: tipo && tipo.length ? [...new Set(tipo)] : null,
      modalidad: modalidad.length ? [...new Set(modalidad)] : null,
      dep: dep.length ? [...new Set(dep)] : null,
      ciudad,
      min: min != null || max != null ? { min, max } : null,
      cierre: cierre ? { ventana: cierre } : (cierreDesde || cierreHasta ? { desde: cierreDesde, hasta: cierreHasta } : null),
      entidad,
      q: texto,
      manif,
    };
  }

  /* Del estado a los parámetros de URL (solo los activos). */
  function escribirEstado(estado, params) {
    const p = params || new URLSearchParams();
    for (const k of PARAMS) if (k !== "ordenar_por") p.delete(k);
    if (!estado) return p;
    if (estado.tipo) p.set("tipo", estado.tipo.length === TIPO_IDS.size ? "todos" : estado.tipo.join(","));
    if (estado.modalidad && estado.modalidad.length) p.set("modalidad", estado.modalidad.join(","));
    if (estado.dep && estado.dep.length) p.set("dep", estado.dep.join(","));
    if (estado.ciudad) p.set("ciudad", estado.ciudad);
    if (estado.min) { if (estado.min.min != null) p.set("min", String(estado.min.min)); if (estado.min.max != null) p.set("max", String(estado.min.max)); }
    if (estado.cierre) {
      if (estado.cierre.ventana) p.set("cierre", estado.cierre.ventana);
      if (estado.cierre.desde) p.set("cierreDesde", estado.cierre.desde);
      if (estado.cierre.hasta) p.set("cierreHasta", estado.cierre.hasta);
    }
    if (estado.entidad) p.set("entidad", estado.entidad);
    if (estado.q) p.set("q", estado.q);
    if (estado.manif) p.set("manif", estado.manif);
    return p;
  }

  const cop = (n) => (n == null ? "" : "$" + Math.round(n).toLocaleString("es-CO"));
  const etiquetaDe = (arr, id) => { const x = arr.find((o) => o.id === id); return x ? x.etiqueta : id; };

  /* Fichas legibles de los filtros ACTIVOS: [{filtro, etiqueta}] — la ficha
     dice «Qué tipo de trabajo es: Obra, Consultoría», nunca «tipo=obra». El
     tipo por defecto (los cuatro sin suministro) NO es una ficha: no lo eligió
     el usuario. */
  function fichas(estado) {
    const out = [];
    if (!estado) return out;
    if (estado.tipo) {
      const esDefecto = estado.tipo.length === TIPOS_POR_DEFECTO.length && TIPOS_POR_DEFECTO.every((t) => estado.tipo.includes(t));
      if (!esDefecto) out.push({ filtro: "tipo", etiqueta: "Qué tipo de trabajo es: " + (estado.tipo.length === TIPO_IDS.size ? "todos (incluye suministro)" : estado.tipo.map((t) => etiquetaDe(TIPOS_TRABAJO, t)).join(", ")) });
    }
    if (estado.modalidad) out.push({ filtro: "modalidad", etiqueta: "Cómo lo adjudican: " + estado.modalidad.map((m) => etiquetaDe(MODALIDADES, m)).join(", ") });
    if (estado.dep) out.push({ filtro: "dep", etiqueta: "Dónde queda: " + estado.dep.map((c) => (DEPTO_POR_CODIGO.get(c) || { nombre: c }).nombre).join(", ") });
    if (estado.ciudad) out.push({ filtro: "ciudad", etiqueta: "Ciudad: " + estado.ciudad });
    if (estado.min) {
      const { min, max } = estado.min;
      out.push({ filtro: "min", etiqueta: "Cuánto vale: " + (min != null && max != null ? `de ${cop(min)} a ${cop(max)}` : min != null ? `desde ${cop(min)}` : `hasta ${cop(max)}`) });
    }
    if (estado.cierre) {
      out.push({ filtro: "cierre", etiqueta: "Cuándo hay que entregar la oferta: " + (estado.cierre.ventana ? etiquetaDe(VENTANAS_CIERRE, estado.cierre.ventana).toLowerCase() : `${estado.cierre.desde ? "desde " + estado.cierre.desde : ""} ${estado.cierre.hasta ? "hasta " + estado.cierre.hasta : ""}`.trim()) });
    }
    if (estado.entidad) out.push({ filtro: "entidad", etiqueta: "Entidad: " + estado.entidad });
    if (estado.q) out.push({ filtro: "q", etiqueta: "Palabra: " + estado.q });
    if (estado.manif) out.push({ filtro: "manif", etiqueta: estado.manif === "abierta" ? "Avisar que le interesa: todavía puede" : "Avisar que le interesa: procesos pequeños" });
    return out;
  }

  /* Quita UN filtro del estado (devuelve un estado nuevo). `min` y `cierre`
     se quitan enteros: quitar solo la mitad de un rango no es lo que nadie
     quiere. */
  function sinFiltro(estado, filtro) {
    const e = { ...(estado || {}) };
    if (filtro === "tipo") e.tipo = null;
    else if (filtro === "min" || filtro === "max") e.min = null;
    else if (filtro === "cierre" || filtro === "cierreDesde" || filtro === "cierreHasta") e.cierre = null;
    else e[filtro] = null;
    return e;
  }
  const hayFiltros = (estado) => fichas(estado).length > 0;

  /* ─── La caja de búsqueda entiende FRASES (6-sep-2026 · M-COMP-05) ──────
     `traducirConsulta(texto)` lee lo que la persona escribió en la caja y
     devuelve { estado, resto }: `estado` trae SOLO las claves que reconoció
     —departamento, tope o suelo de cuantía, ventana de cierre, tipo de
     trabajo, modalidad— con la forma exacta de `leerEstado`, y `resto` es lo
     que no entendió, que sigue viajando en `q` como palabra (la búsqueda por
     subcadena del servidor no cambia). Es una TABLA de frases, determinista,
     sin modelo y sin servidor: lo que no casa con la tabla es INERTE (se queda
     en `resto`; jamás vacía la lista ni da error). Lo que se decidió:
     · La cuantía SOLO con unidad explícita («millones», «mil millones»,
       «pesos» o «$») Y con dirección («hasta», «desde», «más de», «entre A y
       B», «de A a B»): «500» no es nada, «500 millones» a secas tampoco (¿tope,
       suelo o aproximado?), y dos topes, dos suelos o un suelo por encima del
       tope son ambigüedad → no se fija nada y las palabras se quedan en `resto`.
     · «N mil» sin «millones» ni «pesos» no se interpreta: en una obra «500 mil»
       lo mismo es medio millón que quinientos mil millones según quien hable.
     · El departamento casa por su NOMBRE completo o por el apodo que ya
       entiende `claveDepartamento` («Valle», «Bogotá», «San Andrés»), del más
       largo al más corto, para que «Norte de Santander» no se lea como
       «Santander» ni «Valle del Cauca» como «Cauca». «Meta» o «Cesar» se leen
       como departamento —es lo que casi siempre son en una búsqueda— y la
       ficha lo enseña con su × para corregirlo.
     · El tipo de trabajo casa por el NOMBRE de los cinco tipos y su plural:
       «construcción» o «mantenimiento» NO fijan «obra», porque son palabras
       del objeto que la persona quiere buscar tal cual.
     · «Licitación» a secas no fija la modalidad: en el habla del oficio es
       cualquier proceso, así que es relleno y desaparece (igual que «proceso»,
       «oportunidad» y «convocatoria»); «licitación pública» sí la fija.
     · Las preposiciones y artículos pegados a algo reconocido («en Tolima»,
       «que cierren esta semana») se van con ello; los que quedan en los bordes
       del resto se recortan; los del medio se quedan («estudios y diseños» se
       busca tal cual). Los verbos de cierre («cierra», «vence») solo se van
       pegados a una ventana: «cierre perimetral» es un objeto real. */
  const llano = (s) => String(s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()
    .replace(/[.,;:¿?¡!()"«»'“”]/g, " ").replace(/\s+/g, " ").trim();
  const STOP = new Set(["el", "la", "los", "las", "un", "una", "unos", "unas", "de", "del", "en", "con", "para", "por", "que", "y", "e", "o", "u", "a", "al", "lo"]);
  /* palabras que solo se van pegadas a la pieza que anuncian */
  const PREVIAS = Object.freeze({
    cierre: new Set(["cierra", "cierran", "cierre", "cierren", "cierres", "vence", "vencen", "cerrando", "plazo", "entrega", "hasta", "dentro", "durante", "proximos", "proximas", "siguientes"]),
    min: new Set(["valor", "valen", "vale", "presupuesto", "cuantia", "monto", "precio", "cuestan", "cuesta"]),
    dep: new Set(["departamento", "dpto", "ubicada", "ubicadas", "ubicado", "ubicados", "queda", "quedan", "zona"]),
    tipo: new Set(), modalidad: new Set(),
  });
  const RELLENO = new Set(["licitacion", "licitaciones", "proceso", "procesos", "oportunidad", "oportunidades", "convocatoria", "convocatorias"]);
  const TIPO_FRASES = new Map([
    ["obra", "obra"], ["obras", "obra"], ["obra civil", "obra"], ["obras civiles", "obra"],
    ["consultoria", "consultoria"], ["consultorias", "consultoria"],
    ["interventoria", "interventoria"], ["interventorias", "interventoria"],
    ["suministro", "suministro"], ["suministros", "suministro"],
    ["servicio", "servicios"], ["servicios", "servicios"],
  ]);
  const MODALIDAD_FRASES = new Map([
    ["licitacion publica", "licitacion"], ["licitaciones publicas", "licitacion"],
    ["seleccion abreviada", "abreviada"], ["seleccion abreviada de menor cuantia", "abreviada"], ["menor cuantia", "abreviada"], ["abreviada", "abreviada"],
    ["subasta", "subasta"], ["subastas", "subasta"], ["subasta inversa", "subasta"],
    ["concurso de meritos", "meritos"], ["concursos de meritos", "meritos"], ["meritos", "meritos"],
    ["minima cuantia", "minima"],
    ["contratacion directa", "directa"],
    ["regimen especial", "especial"],
  ]);
  const CIERRE_FRASES = new Map([
    ["hoy", "3d"], ["manana", "3d"], ["urgente", "3d"], ["urgentes", "3d"],
    ["3 dias", "3d"], ["tres dias", "3d"], ["3 dias o menos", "3d"], ["tres dias o menos", "3d"], ["menos de 3 dias", "3d"], ["menos de tres dias", "3d"],
    ["esta semana", "7d"], ["una semana", "7d"], ["1 semana", "7d"], ["7 dias", "7d"], ["siete dias", "7d"], ["8 dias", "7d"], ["ocho dias", "7d"], ["menos de una semana", "7d"], ["menos de 8 dias", "7d"], ["menos de ocho dias", "7d"],
    ["15 dias", "15d"], ["quince dias", "15d"], ["15 dias o menos", "15d"], ["quince dias o menos", "15d"], ["dos semanas", "15d"], ["2 semanas", "15d"], ["quincena", "15d"], ["esta quincena", "15d"], ["menos de 15 dias", "15d"], ["menos de quince dias", "15d"], ["menos de dos semanas", "15d"],
    ["mas de 15 dias", "+15d"], ["mas de quince dias", "+15d"], ["mas de dos semanas", "+15d"], ["mas de 2 semanas", "+15d"], ["con tiempo", "+15d"],
  ]);
  /* dirección de la cuantía: tope («hasta») o suelo («desde») */
  const DIRECCION_FRASES = new Map([
    ["hasta", "max"], ["maximo", "max"], ["maximo de", "max"], ["como maximo", "max"], ["menos de", "max"], ["menor a", "max"], ["menor de", "max"], ["menor que", "max"], ["menores a", "max"], ["menores de", "max"], ["menores que", "max"], ["inferior a", "max"], ["inferiores a", "max"], ["por debajo de", "max"], ["no mas de", "max"], ["tope", "max"], ["tope de", "max"],
    ["desde", "min"], ["minimo", "min"], ["minimo de", "min"], ["como minimo", "min"], ["mas de", "min"], ["mayor a", "min"], ["mayor de", "min"], ["mayor que", "min"], ["mayores a", "min"], ["mayores de", "min"], ["mayores que", "min"], ["superior a", "min"], ["superiores a", "min"], ["por encima de", "min"], ["a partir de", "min"], ["al menos", "min"],
  ]);
  /* los apodos de departamento son los que ya entiende `claveDepartamento`
     (hay prueba de que cada alias resuelve al mismo departamento por ella) */
  const ALIAS_DEP = new Map();
  for (const d of DEPARTAMENTOS) { ALIAS_DEP.set(llano(d.nombre), d.codigo); ALIAS_DEP.set(llano(d.clave), d.codigo); }
  ALIAS_DEP.set("valle", "76"); ALIAS_DEP.set("bogota", "11"); ALIAS_DEP.set("bogota dc", "11"); ALIAS_DEP.set("san andres", "88");
  const N_MAX = 6; // «san andres providencia y santa catalina»
  const frase = (claves, i, n) => claves.slice(i, i + n).join(" ");
  /* la entrada más LARGA de la tabla que empieza en i: {n, valor} o null */
  function casar(tabla, claves, i) {
    for (let n = Math.min(N_MAX, claves.length - i); n >= 1; n--) {
      const v = tabla.get(frase(claves, i, n));
      if (v != null) return { n, valor: v };
    }
    return null;
  }
  /* UNA COMA SEGUIDA DE TRES DÍGITOS ES AMBIGUA Y NO DECIDE (6-sep-2026).
     `numero()` lee la URL, que la escribe la propia aplicación, y allí «2,000»
     es la coma decimal colombiana = 2. En una FRASE la escribe una persona, y
     «hasta 2,000 millones» tanto puede ser dos mil millones (agrupación
     anglosajona) como dos millones con decimales: mil veces de diferencia en la
     cifra que fija el tope. Un tope mil veces menor, creíble y bien maquetado,
     es exactamente el daño que esta aplicación no puede hacer, así que la
     cantidad se queda INERTE: `null`, las palabras vuelven enteras al resto y la
     ficha «Palabra: hasta 2,000 millones» dice qué se entendió y dónde
     corregirlo. La coma decimal corta («1,5 millones») sigue viva: solo cae la
     forma de agrupación (uno a tres dígitos y grupos de exactamente tres).
     Vale para TODOS los sitios del traductor que convierten un token en cifra
     —`leerPesos` y las dos lecturas sueltas de `leerCuantia`—, no solo para el
     que se reprodujo. `numero()` no cambia: es el lector de la URL. */
  const AGRUPACION_AMBIGUA = /^\d{1,3}(,\d{3})+$/;
  const cifraDeFrase = (t) => (AGRUPACION_AMBIGUA.test(String(t ?? "").trim()) ? null : numero(t));
  /* una cantidad en pesos a partir de i: {n, pesos} solo con unidad explícita */
  function leerPesos(crudos, claves, i) {
    let j = i, conPeso = false, factor = 1;
    if (claves[j] === "$") { conPeso = true; j++; }
    let t = String(crudos[j] || "").replace(/^[¿¡("«]+|[.,;:?!)"»]+$/g, "");
    if (t.startsWith("$")) { conPeso = true; t = t.slice(1); }
    if (t === "mil" && /^millon(es)?$/.test(claves[j + 1] || "")) { factor = 1e9; j += 2; }
    else {
      const v = cifraDeFrase(t);
      if (v == null || v <= 0) return null;
      factor = v; j++;
      if (claves[j] === "mil") { factor *= 1000; j++; }
      if (/^millon(es)?$/.test(claves[j] || "")) { factor *= 1e6; j++; }
      else if (claves[j] === "pesos") j++;
      else if (!conPeso) return null; // sin unidad no se interpreta: «500» no es nada
    }
    if (claves[j] === "de" && claves[j + 1] === "pesos") j += 2; else if (claves[j] === "pesos") j++;
    return { n: j - i, pesos: factor };
  }
  /* una pieza de cuantía a partir de i: dirección + cantidad, o rango */
  function leerCuantia(crudos, claves, i) {
    if (claves[i] === "entre" || claves[i] === "de") {
      const a = leerPesos(crudos, claves, i + 1);
      const a2 = a ? a : (() => { // «entre 200 y 1.000 millones»: la unidad va al final
        const t = String(crudos[i + 1] || "").replace(/^\$/, "").replace(/[.,;:]+$/, "");
        const v = cifraDeFrase(t); return v != null && v > 0 ? { n: 1, pesos: v, sinUnidad: true } : null;
      })();
      if (!a2) return null;
      const k = i + 1 + a2.n;
      if (!(claves[k] === "y" || claves[k] === "a")) return null;
      const b = leerPesos(crudos, claves, k + 1);
      if (!b) return null;
      let minV = a2.pesos, maxV = b.pesos;
      if (a2.sinUnidad) { // la unidad de B vale para A: «entre 200 y 1.000 millones»
        const tB = String(crudos[k + 1] || "").replace(/^\$/, "").replace(/[.,;:]+$/, "");
        const vB = cifraDeFrase(tB); if (vB == null || vB <= 0) return null;
        minV = a2.pesos * (b.pesos / vB);
      }
      return { n: k + 1 + b.n - i, min: minV, max: maxV };
    }
    const d = casar(DIRECCION_FRASES, claves, i);
    if (!d) return null;
    const c = leerPesos(crudos, claves, i + d.n);
    if (c) return d.valor === "max" ? { n: d.n + c.n, min: null, max: c.pesos } : { n: d.n + c.n, min: c.pesos, max: null };
    return leerParDirecciones(crudos, claves, i, d);
  }
  /* «DESDE A Y HASTA B MILLONES» ES UN PAR, NO MEDIA FRASE (6-sep-2026). Con la
     unidad escrita UNA vez al final, `leerPesos` no podía leer «100» y la pieza
     se perdía: se fijaba solo el tope y «desde 100» quedaba de PALABRA, una
     subcadena que no casa con ningún objeto → lista vacía por una cuantía que la
     persona sí dijo entera. Es el mismo caso que «entre 200 y 1.000 millones»,
     con las dos direcciones escritas, así que se resuelve con la misma regla: la
     unidad de B vale para A. Si tampoco así hay unidad, no se fija NADA y las
     dos piezas vuelven enteras al resto (ambigüedad), nunca una sola. */
  function leerParDirecciones(crudos, claves, i, d) {
    const cifraSuelta = (k) => {
      const t = String(crudos[k] || "").replace(/^\$/, "").replace(/[.,;:]+$/, "");
      const v = cifraDeFrase(t);
      return v != null && v > 0 ? v : null;
    };
    const vA = cifraSuelta(i + d.n);
    if (vA == null) return null;
    let k = i + d.n + 1;
    if (claves[k] === "y" || claves[k] === "e") k++;      // la «y» es opcional: «desde A hasta B millones»
    const d2 = casar(DIRECCION_FRASES, claves, k);
    if (!d2 || d2.valor === d.valor) return null;         // hacen falta las DOS direcciones, y distintas
    const b = leerPesos(crudos, claves, k + d2.n);
    if (!b) return null;
    const vB = cifraSuelta(k + d2.n);
    if (vB == null) return null;
    const A = vA * (b.pesos / vB), B = b.pesos;
    const min = d.valor === "min" ? A : B, max = d.valor === "min" ? B : A;
    if (!(Number.isFinite(min) && Number.isFinite(max) && min > 0 && max > 0)) return null;
    return { n: k + d2.n + b.n - i, min, max };
  }
  function traducirConsulta(texto) {
    const crudos = String(texto ?? "").trim().split(/\s+/).filter(Boolean);
    if (!crudos.length) return { estado: {}, resto: null };
    const claves = crudos.map((t) => llano(t) || (t === "$" ? "$" : ""));
    const usado = new Array(crudos.length).fill(false);
    const piezas = [];
    /* marca la pieza y las palabras pegadas delante; devuelve dónde empezó
       lo marcado, para poder soltarlo entero si resulta ambiguo */
    const marcar = (campo, i, n) => {
      for (let k = i; k < i + n; k++) usado[k] = true;
      let j = i - 1;
      for (; j >= 0 && !usado[j] && (STOP.has(claves[j]) || PREVIAS[campo].has(claves[j])); j--) usado[j] = true;
      return j + 1;
    };
    for (let i = 0; i < crudos.length; i++) {
      if (usado[i]) continue;
      let r;
      const pieza = (campo, r, extra) => { piezas.push({ campo, i, n: r.n, desde: marcar(campo, i, r.n), ...extra }); i += r.n - 1; };
      if ((r = casar(CIERRE_FRASES, claves, i))) { pieza("cierre", r, { valor: r.valor }); continue; }
      if ((r = leerCuantia(crudos, claves, i))) { pieza("min", r, { min: r.min, max: r.max }); continue; }
      if ((r = casar(ALIAS_DEP, claves, i))) { pieza("dep", r, { valor: r.valor }); continue; }
      if ((r = casar(MODALIDAD_FRASES, claves, i))) { pieza("modalidad", r, { valor: r.valor }); continue; }
      if ((r = casar(TIPO_FRASES, claves, i))) { pieza("tipo", r, { valor: r.valor }); continue; }
      if (RELLENO.has(claves[i])) usado[i] = true;
    }
    /* ambigüedad → no se fija y sus palabras vuelven ENTERAS al resto */
    const soltar = (ps) => { for (const p of ps) for (let k = p.desde; k < p.i + p.n; k++) usado[k] = false; };
    const estado = {};
    const de = (campo) => piezas.filter((p) => p.campo === campo);
    const cuantias = de("min");
    if (cuantias.length) {
      const mins = cuantias.filter((p) => p.min != null), maxs = cuantias.filter((p) => p.max != null);
      const minV = mins.length === 1 ? mins[0].min : null, maxV = maxs.length === 1 ? maxs[0].max : null;
      const ambigua = mins.length > 1 || maxs.length > 1 || (minV != null && maxV != null && minV > maxV);
      if (ambigua) soltar(cuantias); else estado.min = { min: minV, max: maxV };
    }
    const cierres = de("cierre");
    if (cierres.length) {
      const ventanas = [...new Set(cierres.map((p) => p.valor))];
      if (ventanas.length === 1) estado.cierre = { ventana: ventanas[0] }; else soltar(cierres);
    }
    for (const campo of ["dep", "modalidad", "tipo"]) {
      const ps = de(campo);
      if (ps.length) estado[campo] = [...new Set(ps.map((p) => p.valor))];
    }
    const restoTokens = crudos.filter((_, k) => !usado[k]).map((t) => t.replace(/^[,;:]+|[,;:]+$/g, "")).filter(Boolean);
    while (restoTokens.length && STOP.has(llano(restoTokens[0]))) restoTokens.shift();
    while (restoTokens.length && STOP.has(llano(restoTokens[restoTokens.length - 1]))) restoTokens.pop();
    return { estado, resto: restoTokens.length ? restoTokens.join(" ") : null };
  }

  return {
    TIPOS_TRABAJO, TIPOS_POR_DEFECTO, MODALIDADES, DEPARTAMENTOS, RANGOS_CUANTIA, VENTANAS_CIERRE, ORDENES, conceptoDe, PARAMS,
    claveDepartamento, departamento, rangoCuantiaDe, ventanaCierreDe, cumpleVentana,
    leerEstado, escribirEstado, fichas, sinFiltro, hayFiltros, etiquetaDe, cop,
    traducirConsulta, TIPO_FRASES, MODALIDAD_FRASES, CIERRE_FRASES, ALIAS_DEP,
  };
});
