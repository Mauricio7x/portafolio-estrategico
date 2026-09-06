/* ============================================================================
   public/lista_libro · La lista filtrada de licitaciones → libro Excel
   ----------------------------------------------------------------------------
   Construye las HOJAS que `public/xlsx.js` (escritor propio, sin dependencias)
   convierte en bytes, a partir de las MISMAS filas que devuelve op=listar: el
   archivo es una vista de lo que ya está en pantalla, no una segunda consulta
   ni un segundo juicio. Vive en su propio archivo UMD por la misma razón que
   apu_libro.js: el navegador lo usa desde el botón «Excel» de la lista y la
   suite lo EJECUTA en Node sobre una respuesta de prueba, y si viviera dentro
   del IIFE de app.js habría que copiarlo para probarlo.

   Reglas que no hay que re-aprender:
   · «SIN DATO» ≠ «CERO»: un campo que viaja en null (o la cuantía que la
     entidad no publica, o el anticipo en 0, que en este dataset es «no se
     sabe») va como celda VACÍA. Un $0 en una hoja que se comparte es una cifra
     creíble y falsa.
   · LA CUANTÍA VIAJA CRUDA: el número exacto que publicó la entidad, con
     formato de moneda solo para leerlo. Una cifra redondeada para mostrar no
     puede decidir, y este archivo se lleva a la reunión donde se decide.
   · LAS CABECERAS HABLAN COMO LA PANTALLA: salen del glosario (`TERMINOS`), sin
     siglas ni jerga, y el estado de lo que la aplicación verifica lleva las
     palabras del semáforo único (`ESTADO`). Este módulo entra al censo de
     lenguaje de public/*.js como cualquier otro.
   · LO QUE SE REDACTA SIN CREDENCIAL SIGUE REDACTADO: «cuánto suelen bajar»
     llega en null sin la clave del sitio y aquí va vacío; la hoja «Cómo leer»
     lo dice. No se pide nada que la pantalla no pida.
   ========================================================================== */
"use strict";

(function (raiz, fabrica) {
  /* El glosario da la marca (nombre del archivo), los términos (cabeceras) y
     el semáforo (estados): en Node se requiere; en el navegador index.html lo
     carga ANTES que este archivo, como hace xlsx.js. */
  const enNode = typeof module === "object" && module.exports;
  const glosario = enNode ? require("./glosario.js") : raiz.Glosario;
  if (!glosario) throw new Error("lista_libro.js: falta glosario.js (debe cargarse antes)");
  const api = fabrica(glosario);
  if (enNode) module.exports = api;
  else raiz.ListaLibro = api;
})(typeof self !== "undefined" ? self : this, function (Glosario) {

  const { MARCA, TERMINOS, ESTADO } = Glosario;
  /* tope de filas del archivo: diez páginas del tamaño máximo que sirve op=listar
     (100). Si la lista tiene más, el archivo lleva las primeras y lo dice. */
  const MAX_FILAS = 1000;

  const num = (v) => (v === null || v === undefined || v === "" ? null : (Number.isFinite(Number(v)) ? Number(v) : null));
  const texto = (v) => { const t = v == null ? "" : String(v).trim(); return t || null; };
  /* «2026-09-20T15:00:00.000» → «2026-09-20 15:00»; sin fecha, vacío */
  const fechaLegible = (v) => { const m = /^(\d{4}-\d{2}-\d{2})(?:T(\d{2}:\d{2}))?/.exec(String(v || "")); return m ? (m[2] ? `${m[1]} ${m[2]}` : m[1]) : null; };
  /* el veredicto de lo que la aplicación verifica: `sin_dato` es un estado
     declarado (se escribe), un veredicto ausente también es «sin dato» */
  const veredicto = (p) => (!p || p.sin_dato || typeof p.pasa !== "boolean" ? ESTADO.sin_dato.largo : p.pasa ? ESTADO.cumple.largo : ESTADO.no_cumple.largo);
  const NIVEL_COMPETENCIA = { baja: "Baja", media: "Media", alta: "Alta" };

  /* Las columnas, en el orden de la hoja: título (como habla la pantalla),
     ancho, estilo de la celda cuando es número, y el valor sacado de la fila
     de op=listar (null = celda vacía). */
  const COLUMNAS = Object.freeze([
    { titulo: "Proceso", ancho: 20, valor: (l) => texto(l.id_del_proceso) },
    { titulo: "Entidad", ancho: 34, valor: (l) => texto(l.entidad) },
    { titulo: "Departamento", ancho: 16, valor: (l) => texto(l.departamento_entidad) },
    { titulo: "Objeto", ancho: 60, valor: (l) => texto(l.nombre_del_procedimiento) },
    { titulo: TERMINOS.modalidad.visible, ancho: 30, valor: (l) => texto(l.modalidad_de_contratacion) },
    { titulo: `${TERMINOS.cuantia.visible} (pesos)`, ancho: 18, estilo: "moneda", valor: (l) => num(l.cuantia_cop) },
    { titulo: "Cierre", ancho: 17, valor: (l) => fechaLegible(l.fecha_cierre) },
    { titulo: "Días para el cierre", ancho: 10, valor: (l) => num(l.filtro && l.filtro.dias_cierre) },
    /* anticipo 0 = sin dato (regla de lib/negocio): vacío, jamás «0 %» */
    { titulo: "Anticipo (%)", ancho: 10, valor: (l) => { const a = num(l.anticipo_pct); return a != null && a > 0 ? a : null; } },
    { titulo: TERMINOS.rup.corto, ancho: 20, valor: (l) => veredicto(l.puertas && l.puertas.p1_rup) },
    { titulo: TERMINOS.capacidad_contratacion.corto, ancho: 20, valor: (l) => veredicto(l.puertas && l.puertas.p2_k) },
    { titulo: "Plata para arrancar la obra", ancho: 22, valor: (l) => veredicto(l.puertas && l.puertas.p3_caja) },
    { titulo: "Cumple los requisitos", ancho: 12, valor: (l) => (l.viable === true ? "Sí" : l.viable === false ? "No" : null) },
    { titulo: `${TERMINOS.indice_competencia.corto} en la entidad`, ancho: 14, valor: (l) => { const c = l.competencia_entidad || null; return c && NIVEL_COMPETENCIA[c.nivel] ? NIVEL_COMPETENCIA[c.nivel] : ESTADO.sin_dato.largo; } },
    { titulo: "Empresas que suelen presentarse", ancho: 14, estilo: "cantidad", valor: (l) => num(l.competencia_entidad && l.competencia_entidad.promedio_oferentes) },
    { titulo: `${TERMINOS.baja_mercado.visible} (%)`, ancho: 14, estilo: "cantidad", valor: (l) => num(l.baja_entidad) },
    { titulo: "Zona", ancho: 22, valor: (l) => texto(l.zona && l.zona.etiqueta) },
    { titulo: "Enlace a SECOP II", ancho: 40, valor: (l) => texto(l.urlproceso) },
  ]);

  /* Una fila de op=listar → una fila de celdas (null = vacía). */
  function filaDe(l) {
    return COLUMNAS.map((c) => {
      const v = c.valor(l || {});
      if (v === null || v === undefined) return null;
      if (typeof v === "number") return c.estilo ? { v, t: "n", s: c.estilo } : v;
      return String(v);
    });
  }

  /* `filas`: los resultados de op=listar (ya cargados). `meta`: {fecha, perfil,
     filtros: [textos], orden, corte, total, finanzas_visibles}. Devuelve las
     hojas para `XLSXApu.construirLibro`: la lista y «Cómo leer». */
  function libroDeLista(filas, meta = {}) {
    const lista = Array.isArray(filas) ? filas.slice(0, MAX_FILAS) : [];
    const cabecera = COLUMNAS.map((c) => ({ v: c.titulo, s: "encabezado" }));
    const hoja = { nombre: "Licitaciones", anchos: COLUMNAS.map((c) => c.ancho), congelar: 1, filas: [cabecera, ...lista.map(filaDe)] };
    const total = num(meta.total);
    const recorte = total != null && lista.length < total;
    const filtros = Array.isArray(meta.filtros) && meta.filtros.length ? meta.filtros.join(" · ") : "sin filtros";
    const lineas = [
      [{ v: `${MARCA.nombre} · lista de licitaciones`, s: "titulo" }],
      [`Descargada el ${meta.fecha || "—"}${meta.perfil ? ` para el perfil «${meta.perfil}»` : ""}.`],
      [`Filtros: ${filtros}.`],
      [meta.orden ? `Orden: ${meta.orden}.` : null],
      [meta.corte ? `Datos de SECOP II con corte del ${meta.corte}.` : "Corte de los datos de SECOP II: sin dato."],
      [total != null ? (recorte ? `Filas: las primeras ${lista.length} de ${total}. Para las demás, afine los filtros y vuelva a descargar.` : `Filas: ${lista.length} de ${total}.`) : `Filas: ${lista.length}.`],
      [null],
      ["Una celda vacía significa que la fuente no publica ese dato: no es un cero."],
      [`«${TERMINOS.cuantia.visible}» es la cifra exacta que publicó la entidad, sin redondear.`],
      [`«${TERMINOS.rup.corto}», «${TERMINOS.capacidad_contratacion.corto}» y «Plata para arrancar la obra» son lo que la aplicación verifica con su perfil; no son los requisitos del pliego.`],
      [meta.finanzas_visibles === false ? `«${TERMINOS.baja_mercado.visible}» va vacío: esa columna solo se descarga con la clave del sitio.` : null],
      ["Nada reemplaza la lectura del pliego."],
    ].filter((f) => f[0] !== null);
    const comoLeer = { nombre: "Cómo leer", anchos: [110], filas: lineas };
    return [hoja, comoLeer];
  }

  /* Nombre del archivo: la marca (glosario), qué es y la fecha. Se sanea lo que
     no admite un sistema de archivos, como hace apu_libro con el título. */
  function nombreArchivo(fecha) {
    const marca = String(MARCA.nombre || "").replace(/[\\/:*?"<>|\s]+/g, "_").replace(/^_+|_+$/g, "") || "lista";
    const dia = /^\d{4}-\d{2}-\d{2}$/.test(String(fecha || "")) ? fecha : null;
    return [marca, "licitaciones", dia].filter(Boolean).join("_") + ".xlsx";
  }

  return { COLUMNAS, filaDe, libroDeLista, nombreArchivo, MAX_FILAS };
});
