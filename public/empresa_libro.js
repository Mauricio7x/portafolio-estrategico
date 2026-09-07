/* ============================================================================
   public/empresa_libro · Los datos de su empresa → libro Excel para copiarlos
   ----------------------------------------------------------------------------
   Construye las HOJAS que `public/xlsx.js` (el escritor propio, sin
   dependencias) convierte en bytes, a partir del MISMO bloque `empresa` que
   /api/perfil?op=pulso ya devuelve y que la pantalla ya pinta: el archivo es
   una vista de lo que está en Mi empresa, no una segunda consulta ni un
   segundo juicio. Vive en su propio archivo UMD por la misma razón que
   lista_libro.js y apu_libro.js: el navegador lo usa desde el botón y la suite
   lo EJECUTA en Node.

   QUÉ NO ES, Y ES LA RAZÓN DE QUE EXISTA ASÍ. No reproduce ningún formato
   oficial de pliego —ni su numeración, ni su encabezado, ni su articulado—.
   Los formatos los fija cada pliego y cambian por resolución; reproducir uno
   de memoria sería inventar una norma, que es justo lo que este proyecto no
   hace. Lo que la hoja da son SUS datos, ordenados y con su fecha de corte,
   para copiarlos al formato que imponga cada entidad.

   Reglas que no hay que re-aprender:
   · «SIN DATO» ≠ «CERO»: un dato que no está en el registro va como celda
     VACÍA y la columna de al lado dice qué completar. Un 0 en la casilla del
     patrimonio de un formato es una cifra creíble y falsa.
   · LAS CIFRAS VIAJAN CRUDAS: el número exacto del registro, con formato de
     moneda solo para leerlo. Lo que se copia a un formato decide.
   · SIN CREDENCIAL NO SALEN SUS CIFRAS: el servidor las manda en null
     (`finanzas_visibles:false`) y aquí van vacías, con la nota que lo dice.
     Este módulo no redacta nada: solo escribe lo que le llegó.
   · Sin jerga y de usted, como el resto de public/*.js.
   ========================================================================== */
"use strict";

(function (raiz, fabrica) {
  /* El glosario da la marca (nombre del archivo) y los términos (rótulos): en
     Node se requiere; en el navegador index.html lo carga ANTES que este
     archivo, como hacen xlsx.js y lista_libro.js. */
  const enNode = typeof module === "object" && module.exports;
  const glosario = enNode ? require("./glosario.js") : raiz.Glosario;
  if (!glosario) throw new Error("empresa_libro.js: falta glosario.js (debe cargarse antes)");
  const api = fabrica(glosario);
  if (enNode) module.exports = api;
  else raiz.EmpresaLibro = api;
})(typeof self !== "undefined" ? self : this, function (Glosario) {

  const { MARCA, TERMINOS } = Glosario;

  const num = (v) => (v === null || v === undefined || v === "" ? null : (Number.isFinite(Number(v)) ? Number(v) : null));
  const texto = (v) => { const t = v == null ? "" : String(v).trim(); return t || null; };
  /* «2026-09-20T15:00:00» → «2026-09-20 15:00»; sin fecha, vacío (la misma
     regla que lista_libro: una fecha a medias no se completa, se recorta) */
  const fechaLegible = (v) => { const m = /^(\d{4}-\d{2}-\d{2})(?:T(\d{2}:\d{2}))?/.exec(String(v || "")); return m ? (m[2] ? `${m[1]} ${m[2]}` : m[1]) : null; };

  /* Qué escribir en la columna de al lado cuando la celda va vacía. Nunca es
     un cero ni un guion: es lo que hay que hacer para tenerlo. */
  const COMPLETE = "Complete este dato con su certificado del registro de proponente.";
  const COMPLETE_CLAVE = "Complete este dato: sus cifras solo se descargan con la clave del sitio.";
  const COMPLETE_CORTE = "Complete la fecha de corte con su certificado del registro de proponente.";

  /* Las filas de la hoja principal, en orden. `valor` saca el dato del bloque
     `empresa` de op=pulso (null = celda vacía); `estilo` es el de la celda
     cuando es número; `conCorte` marca las que llevan la fecha de corte del
     registro al lado (los indicadores: un dato publicado viaja con su fecha).
     `deLaClave` marca las que el servidor redacta sin credencial, para que la
     nota diga el motivo verdadero en vez de mandar a completar lo que ya está
     en el certificado. */
  const FILAS = Object.freeze([
    { rotulo: "Nombre o razón social", valor: (e) => texto(e.nombre) },
    { rotulo: "Tipo de proponente", valor: (e) => texto(e.naturaleza) },
    { rotulo: "NIT o documento de identidad", valor: (e) => texto(e.nit), deLaClave: true },
    /* LA FECHA DE CORTE ES DEL REGISTRO, NO DE CADA INDICADOR, y por eso se
       pide UNA VEZ (7-sep-2026). La primera versión repetía «complete la fecha
       de corte» en las nueve filas de cifras —el mismo aviso nueve veces— y
       medido en el navegador con el perfil real (que no publica corte) la hoja
       salía ilegible: nueve párrafos para un solo hecho. La columna «Fecha de
       corte» sigue al lado de cada cifra cuando el registro sí la trae. */
    { rotulo: "Fecha de corte del registro", valor: (e) => fechaLegible(e.corte), notaSinDato: (c) => c.COMPLETE_CORTE },
    { rotulo: `${TERMINOS.unspsc.corto} inscritos`, estilo: "cantidad", valor: (e) => num(e.tipos_de_trabajo) },
    { rotulo: "Experiencia acreditada, en salarios mínimos", estilo: "cantidad", conCorte: true, valor: (e) => num(e.experiencia_smmlv) },
    { rotulo: "Contratos acreditados", estilo: "cantidad", conCorte: true, valor: (e) => num(e.contratos_acreditados) },
    { rotulo: "Patrimonio (pesos)", estilo: "moneda", conCorte: true, deLaClave: true, valor: (e) => num(e.patrimonio) },
    { rotulo: "Capital de trabajo (pesos)", estilo: "moneda", conCorte: true, deLaClave: true, valor: (e) => num(e.capital_trabajo) },
    { rotulo: "Utilidad operacional (pesos)", estilo: "moneda", conCorte: true, deLaClave: true, valor: (e) => num(e.utilidad_operacional) },
    { rotulo: "Índice de liquidez", estilo: "cantidad", conCorte: true, deLaClave: true, valor: (e) => num(e.liquidez) },
    { rotulo: "Índice de endeudamiento", estilo: "cantidad", conCorte: true, deLaClave: true, valor: (e) => num(e.endeudamiento) },
    { rotulo: "Razón de cobertura de intereses", estilo: "cantidad", conCorte: true, deLaClave: true, valor: (e) => num(e.cobertura_intereses) },
    { rotulo: `${TERMINOS.capacidad_contratacion.corto} (pesos)`, estilo: "moneda", conCorte: true, deLaClave: true, valor: (e) => num(e.capacidad_contratacion) },
  ]);

  /* Los datos del proceso, cuando la ficha se descarga desde uno guardado.
     Salen de la foto que guarda el seguimiento (lib/seguimiento.fotoDe): son
     los mismos que la tarjeta enseña, sin recalcular ninguno. */
  const FILAS_PROCESO = Object.freeze([
    { rotulo: "Número del proceso", valor: (p) => texto(p.id) },
    { rotulo: "Entidad", valor: (p) => texto(p.entidad) },
    { rotulo: "NIT de la entidad", valor: (p) => texto(p.nit_entidad) },
    { rotulo: "Objeto", valor: (p) => texto(p.nombre) },
    { rotulo: "Departamento", valor: (p) => texto(p.departamento) },
    { rotulo: TERMINOS.modalidad.visible, valor: (p) => texto(p.modalidad) },
    { rotulo: `${TERMINOS.cuantia.visible} (pesos)`, estilo: "moneda", valor: (p) => num(p.presupuesto_cop) },
    { rotulo: "Cierre", valor: (p) => fechaLegible(p.fecha_cierre) },
    { rotulo: "Enlace al proceso", valor: (p) => texto(p.url) },
  ]);

  /* Una definición → una fila de celdas. La celda del dato va VACÍA cuando no
     hay dato, y la nota de al lado dice qué hacer con ella. */
  function filaDe(def, fuente, { corte = null, finanzasVisibles = true } = {}) {
    const v = def.valor(fuente || {});
    const celda = v === null ? null : (typeof v === "number" ? (def.estilo ? { v, t: "n", s: def.estilo } : v) : String(v));
    const redactado = v === null && def.deLaClave && finanzasVisibles === false;
    const propia = def.notaSinDato ? def.notaSinDato({ COMPLETE, COMPLETE_CLAVE, COMPLETE_CORTE }) : COMPLETE;
    const nota = v === null ? (redactado ? COMPLETE_CLAVE : propia) : null;
    if (!def.conCorte) return [def.rotulo, celda, null, nota];
    /* la fecha de corte acompaña al DATO: escribirla junto a una casilla vacía
       daría fecha a algo que no existe. Y un dato sin corte se declara: un dato
       publicado viaja con su fecha, y aquí falta. */
    if (v === null) return [def.rotulo, null, null, nota];
    /* sin corte publicado la columna va VACÍA: lo que falta ya lo dice, una
       sola vez, la fila «Fecha de corte del registro» */
    return [def.rotulo, celda, corte, null];
  }

  /* `empresa`: el bloque `empresa` de /api/perfil?op=pulso, tal cual llegó.
     `proceso`: la foto de un proceso guardado (opcional; sin ella no hay hoja
     «Este proceso»). `meta`: {fecha}. Devuelve las hojas para
     `XLSXApu.construirLibro`. */
  function libroFichaEmpresa(empresa, proceso = null, meta = {}) {
    const e = empresa || {};
    /* `finanzas_visibles` es un BOOLEANO del servidor: solo `false` significa
       «lo redacté»; ausente significa «no lo dijo», y entonces una celda vacía
       es un dato que falta en el certificado, no una credencial que falta. */
    const finanzasVisibles = e.finanzas_visibles === false ? false : true;
    const corte = fechaLegible(e.corte);
    const cabecera = ["Dato", "Lo que dice su registro", "Fecha de corte", "Si la casilla está vacía"]
      .map((t) => ({ v: t, s: "encabezado" }));
    const filas = [
      [{ v: `${MARCA.nombre} · datos de su empresa`, s: "titulo" }],
      [{ v: "Datos para copiar a los formatos del pliego; el formato oficial lo fija cada pliego.", s: "subtitulo" }],
      [null],
      cabecera,
      ...FILAS.map((d) => filaDe(d, e, { corte, finanzasVisibles })),
    ];
    const hojas = [{ nombre: "Datos de la empresa", anchos: [42, 30, 16, 64], congelar: 4, filas }];

    if (proceso) {
      hojas.push({
        nombre: "Este proceso",
        anchos: [30, 70],
        congelar: 2,
        filas: [
          [{ v: "Dato del proceso", s: "encabezado" }, { v: "Lo que publica la fuente", s: "encabezado" }],
          ...FILAS_PROCESO.map((d) => {
            const f = filaDe(d, proceso, { finanzasVisibles: true });
            // en esta hoja no hay fecha de corte ni credencial: rótulo y dato
            return [f[0], f[1]];
          }),
        ],
      });
    }

    const lineas = [
      [{ v: `${MARCA.nombre} · cómo usar esta hoja`, s: "titulo" }],
      [`Preparada el ${meta.fecha || "—"}.`],
      [null],
      ["Esta hoja reúne los datos de su empresa para que usted los copie a los formatos que exija cada pliego."],
      ["No reproduce ningún formato oficial: el formato, su numeración y su contenido los fija cada pliego, y cambian."],
      ["Una celda vacía significa que ese dato no está en su registro: complétela con su certificado. Nunca es un cero."],
      [finanzasVisibles ? null : "Sus cifras (patrimonio, capital de trabajo, indicadores, capacidad y NIT) solo se descargan con la clave del sitio: por eso van vacías."],
      ["Las cifras van sin redondear, tal como constan en su registro."],
      [proceso ? "La hoja «Este proceso» trae lo que publica la fuente del proceso, sin recalcular nada." : null],
      ["Antes de firmar, confirme cada dato contra su certificado y contra lo que pida el pliego."],
    ].filter((f) => f[0] !== null);
    hojas.push({ nombre: "Cómo usarla", anchos: [110], filas: lineas });
    return hojas;
  }

  /* Nombre del archivo: la marca (glosario), qué es y la fecha. Se sanea lo que
     no admite un sistema de archivos, como hace lista_libro. */
  function nombreArchivo(fecha) {
    const marca = String(MARCA.nombre || "").replace(/[\\/:*?"<>|\s]+/g, "_").replace(/^_+|_+$/g, "") || "ficha";
    const dia = /^\d{4}-\d{2}-\d{2}$/.test(String(fecha || "")) ? fecha : null;
    return [marca, "datos_de_la_empresa", dia].filter(Boolean).join("_") + ".xlsx";
  }

  return { FILAS, FILAS_PROCESO, filaDe, libroFichaEmpresa, nombreArchivo };
});
