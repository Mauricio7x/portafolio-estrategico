/* ============================================================================
   lib/apu/catalogo · Los ítems de obra que puede tener un APU, y las dos
   semillas que permiten adivinarlos desde un objeto contractual
   ----------------------------------------------------------------------------
   DATOS, no reglas. Quién los usa y cómo decide vive en lib/apu/inferencia.js,
   exactamente igual que lib/semantica.js es el vocabulario y lib/filtros.js el
   juicio. Este módulo es HOJA del grafo de requires: no importa nada del
   proyecto, así que ningún ciclo puede nacer aquí.

   Tres estructuras:

     CATALOGO            los ítems. `{ item_id, descripcion, unidad, capitulo }`.
                         La unidad es la de MEDIDA Y PAGO (m³, m², ml, kg, und,
                         glb, mes), que es la que gobierna un APU: el precio
                         unitario se expresa por ella.
     MAPEO_UNSPSC_SEMILLA  código UNSPSC → ítems que ese objeto suele contener.
     DICCIONARIO_SEMILLA   término/frase → ítems, con el PESO de la evidencia.

   ── Por qué «SEMILLA» y no «tabla» ────────────────────────────────────────
   El encargo pide que las dos tablas vivan en Redis (`apu:mapeo_unspsc`,
   `apu:diccionario_terminos`) y ahí es donde manda la versión publicada. Pero
   una app cuyo conocimiento vive SOLO en Redis se queda muda el día que Redis
   no responde o que nadie ha publicado todavía — que es, exactamente, el estado
   de un despliegue nuevo. Es la misma lección que ya costó cara con los
   perfiles: `lib/perfiles.js` conserva `PERFILES_FALLBACK` y la carga del dueño
   REEMPLAZA sus propiedades. Aquí igual: esto es el respaldo en código, Redis
   manda cuando hay algo publicado, y nunca se lanza por no encontrarlo.

   ── Por qué el catálogo es CURADO y hay que decirlo ───────────────────────
   Estos ítems y sus unidades salen de la estructura de pago habitual de INVIAS
   e IDU y del módulo APU que la app tuvo antes de la reescritura (ahí estaban
   ya el concreto de 21 MPa, el muro en ladrillo y el acero de refuerzo, con la
   descomposición mano de obra + materiales + equipo + transporte). NO son una
   estadística del histórico de SECOP II: son conocimiento de oficio escrito a
   mano, igual que `data/vocabulario_unspsc.json`, y presentarlos de otro modo
   sería la clase de mentira que este repositorio evita a propósito. Lo que sí
   se deriva del histórico son TÉRMINOS nuevos para el diccionario, y llegan con
   peso menor precisamente porque son estadística y no oficio.

   ── Lo que este módulo NO hace ────────────────────────────────────────────
   No trae precios ni rendimientos. Un ítem dice QUÉ se ejecuta y en qué unidad
   se paga; cuánto vale es la Fase 3 (ver docs/APU_Y_RENTABILIDAD.md), y para
   eso hará falta la regionalización que ya existía en el módulo viejo (índice
   por ciudad) y el reajuste sectorial del ICOCIV. Mezclarlo aquí convertiría un
   catálogo estable en una tabla de precios que caduca cada semestre.
   ========================================================================== */
"use strict";

/* ══════════════════ 1 · Capítulos ══════════════════
   El orden es el de ejecución de una obra, que es también el orden en que se
   leen los capítulos de un presupuesto. Sirve para AGRUPAR la sugerencia en
   pantalla: 40 ítems sueltos son ilegibles; 40 ítems en 8 capítulos se revisan. */
const CAPITULOS = {
  preliminares: { orden: 1, nombre: "Preliminares" },
  movimiento_tierras: { orden: 2, nombre: "Movimiento de tierras" },
  estructuras: { orden: 3, nombre: "Estructuras y concretos" },
  pavimentos: { orden: 4, nombre: "Pavimentos y vías" },
  hidraulica: { orden: 5, nombre: "Hidráulica y sanitaria" },
  edificacion: { orden: 6, nombre: "Edificación y acabados" },
  electrico: { orden: 7, nombre: "Eléctrico e iluminación" },
  urbanismo: { orden: 8, nombre: "Urbanismo y espacio público" },
  senalizacion: { orden: 9, nombre: "Señalización y seguridad vial" },
  ambiental: { orden: 10, nombre: "Ambiental, SST y social" },
  consultoria: { orden: 11, nombre: "Estudios, diseños e interventoría" },
};

/* ══════════════════ 2 · Catálogo de ítems ══════════════════
   `item_id` es la LLAVE ESTABLE: viaja a Redis, al diccionario, al mapeo y a
   la selección que el dueño guarde. Renombrar uno rompe todo lo anterior, así
   que se añaden ítems nuevos y no se rebautizan los viejos. */
const CATALOGO = [
  /* ---------- Preliminares ---------- */
  { item_id: "prel_localizacion_replanteo", descripcion: "Localización y replanteo topográfico", unidad: "m²", capitulo: "preliminares" },
  { item_id: "prel_descapote", descripcion: "Descapote y limpieza del terreno", unidad: "m²", capitulo: "preliminares" },
  { item_id: "prel_demolicion_concreto", descripcion: "Demolición de estructuras en concreto", unidad: "m³", capitulo: "preliminares" },
  { item_id: "prel_demolicion_pavimento", descripcion: "Demolición de pavimento existente", unidad: "m²", capitulo: "preliminares" },
  { item_id: "prel_campamento", descripcion: "Campamento e instalaciones provisionales", unidad: "glb", capitulo: "preliminares" },
  { item_id: "prel_cerramiento", descripcion: "Cerramiento provisional de obra", unidad: "ml", capitulo: "preliminares" },

  /* ---------- Movimiento de tierras ---------- */
  { item_id: "mt_excavacion_manual", descripcion: "Excavación manual en material común", unidad: "m³", capitulo: "movimiento_tierras" },
  { item_id: "mt_excavacion_mecanica", descripcion: "Excavación mecánica en material común", unidad: "m³", capitulo: "movimiento_tierras" },
  { item_id: "mt_relleno_material_sitio", descripcion: "Relleno compactado con material del sitio", unidad: "m³", capitulo: "movimiento_tierras" },
  { item_id: "mt_relleno_seleccionado", descripcion: "Relleno con material seleccionado de préstamo", unidad: "m³", capitulo: "movimiento_tierras" },
  { item_id: "mt_retiro_sobrantes", descripcion: "Cargue, retiro y disposición de sobrantes", unidad: "m³", capitulo: "movimiento_tierras" },
  { item_id: "mt_terraplen", descripcion: "Conformación de terraplén", unidad: "m³", capitulo: "movimiento_tierras" },
  { item_id: "mt_conformacion_subrasante", descripcion: "Conformación y compactación de subrasante", unidad: "m²", capitulo: "movimiento_tierras" },

  /* ---------- Estructuras y concretos ---------- */
  { item_id: "est_concreto_21", descripcion: "Concreto de 21 MPa (3000 PSI)", unidad: "m³", capitulo: "estructuras" },
  { item_id: "est_concreto_28", descripcion: "Concreto de 28 MPa (4000 PSI)", unidad: "m³", capitulo: "estructuras" },
  { item_id: "est_concreto_ciclopeo", descripcion: "Concreto ciclópeo", unidad: "m³", capitulo: "estructuras" },
  { item_id: "est_solado", descripcion: "Solado de limpieza", unidad: "m²", capitulo: "estructuras" },
  { item_id: "est_acero_refuerzo", descripcion: "Acero de refuerzo 60.000 PSI figurado y armado", unidad: "kg", capitulo: "estructuras" },
  { item_id: "est_malla_electrosoldada", descripcion: "Malla electrosoldada", unidad: "m²", capitulo: "estructuras" },
  { item_id: "est_formaleta", descripcion: "Formaleta y encofrado", unidad: "m²", capitulo: "estructuras" },
  { item_id: "est_muro_contencion", descripcion: "Muro de contención en concreto reforzado", unidad: "m³", capitulo: "estructuras" },
  { item_id: "est_gavion", descripcion: "Gavión en malla de alambre", unidad: "m³", capitulo: "estructuras" },
  { item_id: "est_pilote", descripcion: "Pilote de cimentación", unidad: "ml", capitulo: "estructuras" },
  { item_id: "est_viga_cimentacion", descripcion: "Viga de cimentación en concreto reforzado", unidad: "m³", capitulo: "estructuras" },
  { item_id: "est_estructura_metalica", descripcion: "Estructura metálica", unidad: "kg", capitulo: "estructuras" },
  { item_id: "est_reforzamiento", descripcion: "Reforzamiento estructural", unidad: "m²", capitulo: "estructuras" },

  /* ---------- Pavimentos y vías ---------- */
  { item_id: "pav_subbase", descripcion: "Subbase granular", unidad: "m³", capitulo: "pavimentos" },
  { item_id: "pav_base_granular", descripcion: "Base granular", unidad: "m³", capitulo: "pavimentos" },
  { item_id: "pav_afirmado", descripcion: "Afirmado para vía en material granular", unidad: "m³", capitulo: "pavimentos" },
  { item_id: "pav_imprimacion", descripcion: "Imprimación asfáltica", unidad: "m²", capitulo: "pavimentos" },
  { item_id: "pav_mezcla_asfaltica", descripcion: "Mezcla asfáltica densa en caliente", unidad: "m³", capitulo: "pavimentos" },
  { item_id: "pav_pavimento_rigido", descripcion: "Pavimento rígido en concreto", unidad: "m³", capitulo: "pavimentos" },
  { item_id: "pav_placa_huella", descripcion: "Placa huella en concreto reforzado", unidad: "m²", capitulo: "pavimentos" },
  { item_id: "pav_parcheo", descripcion: "Parcheo de pavimento", unidad: "m²", capitulo: "pavimentos" },
  { item_id: "pav_fresado", descripcion: "Fresado de pavimento asfáltico", unidad: "m²", capitulo: "pavimentos" },
  { item_id: "pav_sardinel", descripcion: "Sardinel en concreto", unidad: "ml", capitulo: "pavimentos" },
  { item_id: "pav_anden", descripcion: "Andén en concreto", unidad: "m²", capitulo: "pavimentos" },
  { item_id: "pav_cuneta", descripcion: "Cuneta en concreto", unidad: "ml", capitulo: "pavimentos" },
  { item_id: "pav_bordillo", descripcion: "Bordillo prefabricado", unidad: "ml", capitulo: "pavimentos" },
  { item_id: "pav_adoquin", descripcion: "Adoquín en concreto", unidad: "m²", capitulo: "pavimentos" },

  /* ---------- Hidráulica y sanitaria ---------- */
  { item_id: "hid_tuberia_alcantarillado", descripcion: "Suministro e instalación de tubería de alcantarillado", unidad: "ml", capitulo: "hidraulica" },
  { item_id: "hid_tuberia_acueducto", descripcion: "Suministro e instalación de tubería de acueducto", unidad: "ml", capitulo: "hidraulica" },
  { item_id: "hid_pozo_inspeccion", descripcion: "Pozo de inspección", unidad: "und", capitulo: "hidraulica" },
  { item_id: "hid_sumidero", descripcion: "Sumidero de aguas lluvias", unidad: "und", capitulo: "hidraulica" },
  { item_id: "hid_caja_inspeccion", descripcion: "Caja de inspección", unidad: "und", capitulo: "hidraulica" },
  { item_id: "hid_box_culvert", descripcion: "Box culvert en concreto reforzado", unidad: "ml", capitulo: "hidraulica" },
  { item_id: "hid_alcantarilla", descripcion: "Alcantarilla en tubería de concreto", unidad: "ml", capitulo: "hidraulica" },
  { item_id: "hid_domiciliaria", descripcion: "Acometida domiciliaria", unidad: "und", capitulo: "hidraulica" },
  { item_id: "hid_tanque_almacenamiento", descripcion: "Tanque de almacenamiento de agua", unidad: "und", capitulo: "hidraulica" },
  { item_id: "hid_ptap", descripcion: "Planta de tratamiento de agua potable (PTAP)", unidad: "glb", capitulo: "hidraulica" },
  { item_id: "hid_ptar", descripcion: "Planta de tratamiento de aguas residuales (PTAR)", unidad: "glb", capitulo: "hidraulica" },
  { item_id: "hid_bocatoma", descripcion: "Bocatoma y obra de captación", unidad: "und", capitulo: "hidraulica" },
  { item_id: "hid_valvula", descripcion: "Válvula y accesorios de red", unidad: "und", capitulo: "hidraulica" },
  { item_id: "hid_hidrante", descripcion: "Hidrante", unidad: "und", capitulo: "hidraulica" },
  { item_id: "hid_pozo_profundo", descripcion: "Pozo profundo de captación", unidad: "ml", capitulo: "hidraulica" },
  { item_id: "hid_unidad_sanitaria", descripcion: "Unidad sanitaria básica", unidad: "und", capitulo: "hidraulica" },

  /* ---------- Edificación y acabados ---------- */
  { item_id: "edi_mamposteria", descripcion: "Muro en mampostería de ladrillo o bloque", unidad: "m²", capitulo: "edificacion" },
  { item_id: "edi_panete", descripcion: "Pañete o revoque de muros", unidad: "m²", capitulo: "edificacion" },
  { item_id: "edi_estuco_pintura", descripcion: "Estuco y pintura", unidad: "m²", capitulo: "edificacion" },
  { item_id: "edi_cubierta_metalica", descripcion: "Cubierta metálica con estructura de soporte", unidad: "m²", capitulo: "edificacion" },
  { item_id: "edi_cubierta_teja", descripcion: "Cubierta en teja", unidad: "m²", capitulo: "edificacion" },
  { item_id: "edi_cielo_raso", descripcion: "Cielo raso", unidad: "m²", capitulo: "edificacion" },
  { item_id: "edi_piso_ceramica", descripcion: "Piso en cerámica o porcelanato", unidad: "m²", capitulo: "edificacion" },
  { item_id: "edi_enchape", descripcion: "Enchape de muros", unidad: "m²", capitulo: "edificacion" },
  { item_id: "edi_carpinteria_metalica", descripcion: "Carpintería metálica", unidad: "m²", capitulo: "edificacion" },
  { item_id: "edi_ventaneria", descripcion: "Ventanería en aluminio y vidrio", unidad: "m²", capitulo: "edificacion" },
  { item_id: "edi_puerta", descripcion: "Puerta", unidad: "und", capitulo: "edificacion" },
  { item_id: "edi_aparato_sanitario", descripcion: "Aparato sanitario y grifería", unidad: "und", capitulo: "edificacion" },
  { item_id: "edi_impermeabilizacion", descripcion: "Impermeabilización de cubierta", unidad: "m²", capitulo: "edificacion" },

  /* ---------- Eléctrico e iluminación ---------- */
  { item_id: "ele_red_media_tension", descripcion: "Red eléctrica de media tensión", unidad: "ml", capitulo: "electrico" },
  { item_id: "ele_red_baja_tension", descripcion: "Red eléctrica de baja tensión", unidad: "ml", capitulo: "electrico" },
  { item_id: "ele_canalizacion_electrica", descripcion: "Canalización eléctrica subterránea", unidad: "ml", capitulo: "electrico" },
  { item_id: "ele_luminaria", descripcion: "Luminaria de alumbrado público", unidad: "und", capitulo: "electrico" },
  { item_id: "ele_poste", descripcion: "Poste de concreto o metálico", unidad: "und", capitulo: "electrico" },
  { item_id: "ele_subestacion", descripcion: "Subestación eléctrica", unidad: "und", capitulo: "electrico" },
  { item_id: "ele_transformador", descripcion: "Transformador", unidad: "und", capitulo: "electrico" },
  { item_id: "ele_acometida", descripcion: "Acometida eléctrica", unidad: "und", capitulo: "electrico" },
  { item_id: "ele_tablero", descripcion: "Tablero de distribución", unidad: "und", capitulo: "electrico" },

  /* ---------- Urbanismo y espacio público ---------- */
  { item_id: "urb_zona_verde", descripcion: "Empradización y zonas verdes", unidad: "m²", capitulo: "urbanismo" },
  { item_id: "urb_arborizacion", descripcion: "Arborización y siembra", unidad: "und", capitulo: "urbanismo" },
  { item_id: "urb_mobiliario_urbano", descripcion: "Mobiliario urbano", unidad: "und", capitulo: "urbanismo" },
  { item_id: "urb_grama_sintetica", descripcion: "Grama sintética", unidad: "m²", capitulo: "urbanismo" },
  { item_id: "urb_cancha", descripcion: "Cancha deportiva en concreto", unidad: "m²", capitulo: "urbanismo" },
  { item_id: "urb_juegos_biosaludables", descripcion: "Juegos infantiles y gimnasio biosaludable", unidad: "und", capitulo: "urbanismo" },
  { item_id: "urb_cubierta_escenario", descripcion: "Cubierta de escenario deportivo", unidad: "m²", capitulo: "urbanismo" },

  /* ---------- Señalización y seguridad vial ---------- */
  { item_id: "sen_senalizacion_horizontal", descripcion: "Señalización horizontal (demarcación)", unidad: "m²", capitulo: "senalizacion" },
  { item_id: "sen_senalizacion_vertical", descripcion: "Señalización vertical", unidad: "und", capitulo: "senalizacion" },
  { item_id: "sen_defensa_metalica", descripcion: "Defensa metálica vial", unidad: "ml", capitulo: "senalizacion" },
  { item_id: "sen_tachas", descripcion: "Tachas reflectivas", unidad: "und", capitulo: "senalizacion" },

  /* ---------- Ambiental, SST y social ----------
     No son «relleno»: son los costos que el Cap. 11 del manual señala como los
     que casi nadie suma (PMA, señalización, SST). Aparecen como ítem propio
     justo para que se vean al armar el presupuesto. */
  { item_id: "amb_pma", descripcion: "Plan de manejo ambiental (PMA)", unidad: "mes", capitulo: "ambiental" },
  { item_id: "amb_manejo_transito", descripcion: "Plan de manejo de tránsito y señalización de obra", unidad: "mes", capitulo: "ambiental" },
  { item_id: "amb_sst", descripcion: "Seguridad y salud en el trabajo (SST)", unidad: "mes", capitulo: "ambiental" },
  { item_id: "amb_gestion_social", descripcion: "Gestión social y comunicación con la comunidad", unidad: "mes", capitulo: "ambiental" },

  /* ---------- Estudios, diseños e interventoría ---------- */
  { item_id: "con_topografia", descripcion: "Levantamiento topográfico", unidad: "glb", capitulo: "consultoria" },
  { item_id: "con_estudio_suelos", descripcion: "Estudio de suelos y geotecnia", unidad: "glb", capitulo: "consultoria" },
  { item_id: "con_estudios_disenos", descripcion: "Estudios y diseños", unidad: "glb", capitulo: "consultoria" },
  { item_id: "con_diseno_estructural", descripcion: "Diseño estructural", unidad: "glb", capitulo: "consultoria" },
  { item_id: "con_interventoria", descripcion: "Interventoría técnica y administrativa", unidad: "mes", capitulo: "consultoria" },
];

/* Índice por id. Se construye una vez al cargar el módulo: la inferencia lo
   consulta una vez por ítem candidato y por petición. */
const POR_ID = new Map(CATALOGO.map((i) => [i.item_id, i]));
const item = (id) => POR_ID.get(id) || null;
const existeItem = (id) => POR_ID.has(id);

/* ══════════════════ 3 · Mapeo UNSPSC → ítems ══════════════════

   Las claves son PREFIJOS SIGNIFICATIVOS del código, no códigos de 8 dígitos
   rellenos de ceros: "72" es el segmento, "7214" la familia, "721410" la clase.
   La inferencia busca del más específico al más general, que es como se lee un
   código UNSPSC — el nivel se deduce de los pares «00» finales, nunca se
   recorta a mano (lib/unspsc lo hace, y tener una segunda definición de
   «familia» aquí sería el error que el propio repositorio ya documenta).

   OJO con lo que esto NO es: en `lib/unspsc` el emparejamiento con el RUP tiene
   PROHIBIDO subir hasta el segmento, porque casaría «servicios de construcción»
   con cualquier cosa del 72 y eso decide si el dueño está HABILITADO. Aquí no
   se decide ninguna habilitación: se sugiere qué ítems podría llevar un
   presupuesto, y el usuario los revisa con casillas antes de aceptarlos. Por
   eso el segmento sí se usa — igual que lib/indice_baja lo usa para AGRUPAR —
   y por eso llega con menos especificidad y, por tanto, con menos confianza.

   Los códigos escogidos son los que de verdad inscriben los RUP del dueño
   (lib/unspsc: 393 códigos en la unión); mapear códigos que nadie inscribe
   sería decorar la tabla. */
const MAPEO_UNSPSC_SEMILLA = {
  /* ---- 72 · Servicios de edificación, construcción y mantenimiento ---- */
  "72": [
    "prel_localizacion_replanteo", "mt_excavacion_mecanica", "mt_retiro_sobrantes",
    "est_concreto_21", "est_acero_refuerzo", "amb_sst",
  ],
  // 7210 · mantenimiento y reparación de instalaciones
  "7210": ["edi_panete", "edi_estuco_pintura", "edi_impermeabilizacion", "prel_demolicion_concreto", "amb_sst"],
  // 7211/7212 · edificación residencial, comercial e institucional
  "7211": ["est_concreto_21", "est_acero_refuerzo", "est_formaleta", "edi_mamposteria", "edi_panete", "edi_estuco_pintura", "edi_cubierta_metalica", "edi_piso_ceramica"],
  "7212": ["est_concreto_21", "est_concreto_28", "est_acero_refuerzo", "est_formaleta", "edi_mamposteria", "edi_panete", "edi_estuco_pintura", "edi_cubierta_metalica", "edi_piso_ceramica", "edi_ventaneria"],
  // 7214 · construcción pesada: vías, puentes, redes, movimiento de tierras
  "7214": [
    "prel_localizacion_replanteo", "prel_descapote",
    "mt_excavacion_mecanica", "mt_relleno_seleccionado", "mt_retiro_sobrantes", "mt_conformacion_subrasante",
    "pav_subbase", "pav_base_granular", "pav_mezcla_asfaltica",
    "hid_alcantarilla", "pav_cuneta", "sen_senalizacion_horizontal", "amb_manejo_transito", "amb_pma",
  ],
  // 721410 · carreteras y autopistas (la lectura de trabajo del repositorio:
  // es el código con el que llegan las vías en los fixtures y en producción)
  "721410": [
    "prel_localizacion_replanteo", "prel_descapote", "prel_demolicion_pavimento",
    "mt_excavacion_mecanica", "mt_relleno_seleccionado", "mt_retiro_sobrantes",
    "mt_terraplen", "mt_conformacion_subrasante",
    "pav_subbase", "pav_base_granular", "pav_afirmado", "pav_imprimacion",
    "pav_mezcla_asfaltica", "pav_pavimento_rigido", "pav_placa_huella", "pav_cuneta",
    "hid_alcantarilla", "sen_senalizacion_horizontal", "sen_senalizacion_vertical",
    "amb_manejo_transito", "amb_pma", "amb_sst",
  ],
  // 721411/721412 · puentes y estructuras mayores
  "721411": ["est_concreto_28", "est_acero_refuerzo", "est_formaleta", "est_pilote", "est_viga_cimentacion", "est_estructura_metalica", "mt_excavacion_mecanica"],
  "721412": ["est_concreto_28", "est_acero_refuerzo", "est_formaleta", "est_muro_contencion", "est_gavion", "mt_excavacion_mecanica"],
  // 721415 · redes de acueducto y alcantarillado
  "721415": [
    "mt_excavacion_mecanica", "mt_relleno_seleccionado", "mt_retiro_sobrantes",
    "hid_tuberia_acueducto", "hid_tuberia_alcantarillado", "hid_pozo_inspeccion",
    "hid_caja_inspeccion", "hid_domiciliaria", "hid_valvula",
  ],
  // 7215 · oficios especializados de construcción
  "7215": ["edi_mamposteria", "edi_panete", "edi_estuco_pintura", "ele_red_baja_tension", "hid_tuberia_acueducto", "est_formaleta"],

  /* ---- 95 · Terrenos, edificios, estructuras y vías construidas ---- */
  "95": ["est_concreto_21", "est_acero_refuerzo", "edi_mamposteria"],
  "9512": ["est_concreto_21", "est_acero_refuerzo", "est_formaleta", "edi_mamposteria", "edi_cubierta_metalica", "edi_piso_ceramica", "edi_ventaneria", "edi_aparato_sanitario"],
  "9514": ["pav_subbase", "pav_base_granular", "pav_mezcla_asfaltica", "pav_anden", "pav_sardinel", "sen_senalizacion_horizontal"],

  /* ---- 81 · Servicios de ingeniería y de investigación ---- */
  "81": ["con_estudios_disenos"],
  "8110": ["con_topografia", "con_estudio_suelos", "con_estudios_disenos", "con_diseno_estructural"],
  "8111": ["con_estudios_disenos"],
  "8115": ["con_estudio_suelos", "con_topografia"],

  /* ---- 80 · Gerencia: la interventoría vive aquí, no en el 72 ---- */
  "8010": ["con_interventoria"],
  "8016": ["con_interventoria"],

  /* ---- 77 · Servicios medioambientales ---- */
  "77": ["amb_pma"],
  "7710": ["amb_pma", "amb_gestion_social"],
  "7712": ["amb_pma"],

  /* ---- 40 · Distribución y acondicionamiento: la tubería ---- */
  "40": ["hid_tuberia_acueducto"],
  "4017": ["hid_tuberia_acueducto", "hid_tuberia_alcantarillado", "hid_valvula", "hid_domiciliaria"],
  "4014": ["hid_valvula", "hid_hidrante"],

  /* ---- 30 · Componentes y suministros de construcción ---- */
  "30": ["est_concreto_21"],
  "3010": ["est_estructura_metalica", "est_acero_refuerzo"],
  "3011": ["est_concreto_21", "est_concreto_28", "est_acero_refuerzo"],
  "3013": ["edi_mamposteria"],
  "3015": ["edi_cubierta_teja", "edi_cubierta_metalica"],
  "3017": ["edi_puerta", "edi_ventaneria"],
  "3018": ["hid_tuberia_acueducto", "edi_aparato_sanitario"],

  /* ---- 26 · Generación y distribución eléctrica ---- */
  "26": ["ele_red_baja_tension"],
  "2612": ["ele_red_media_tension", "ele_red_baja_tension", "ele_canalizacion_electrica"],
  "2613": ["ele_transformador", "ele_subestacion"],

  /* ---- 39 · Iluminación ---- */
  "39": ["ele_luminaria"],
  "3911": ["ele_luminaria", "ele_poste"],
};

/* ══════════════════ 4 · Diccionario de términos ══════════════════

   Término (uno o varios tokens, ya NORMALIZADOS: sin tildes, ñ→n, minúsculas)
   → los ítems que ese término hace probables, y el PESO de esa evidencia.

   Por qué el peso es EXPLÍCITO y no se deduce del número de palabras: hay
   unigramas que son evidencia total («alcantarillado», «placahuella») y
   bigramas que son evidencia floja («sede educativa» dice dónde, no qué). Un
   peso derivado de la longitud premiaría a los segundos y castigaría a los
   primeros. Los términos DERIVADOS del histórico entran después con peso bajo
   por ser estadística y no oficio (lib/apu/inferencia los mezcla).

   El peso 1 significa «este término, solo, basta para sugerir el ítem» — y
   sugerir no es afirmar: la respuesta viaja con su confianza y con el término
   que la disparó, y la pantalla la presenta con casilla para desmarcarla. */
const DICCIONARIO_SEMILLA = {
  /* ---- vías y pavimentos ---- */
  "placa huella": { peso: 1, items: ["pav_placa_huella", "est_concreto_21", "est_acero_refuerzo", "pav_subbase", "mt_excavacion_manual", "prel_localizacion_replanteo", "mt_retiro_sobrantes"] },
  placahuella: { peso: 1, items: ["pav_placa_huella", "est_concreto_21", "est_acero_refuerzo", "pav_subbase", "mt_excavacion_manual"] },
  pavimentacion: { peso: 1, items: ["pav_subbase", "pav_base_granular", "pav_imprimacion", "pav_mezcla_asfaltica", "mt_conformacion_subrasante", "prel_localizacion_replanteo", "amb_manejo_transito"] },
  repavimentacion: { peso: 1, items: ["pav_fresado", "pav_imprimacion", "pav_mezcla_asfaltica", "prel_demolicion_pavimento", "amb_manejo_transito"] },
  pavimento: { peso: 0.9, items: ["pav_base_granular", "pav_mezcla_asfaltica", "pav_pavimento_rigido"] },
  "pavimento rigido": { peso: 1, items: ["pav_pavimento_rigido", "est_concreto_28", "est_acero_refuerzo", "pav_subbase"] },
  "pavimento flexible": { peso: 1, items: ["pav_mezcla_asfaltica", "pav_imprimacion", "pav_base_granular"] },
  asfalto: { peso: 0.9, items: ["pav_mezcla_asfaltica", "pav_imprimacion"] },
  asfaltica: { peso: 0.9, items: ["pav_mezcla_asfaltica", "pav_imprimacion"] },
  parcheo: { peso: 1, items: ["pav_parcheo", "pav_fresado", "pav_mezcla_asfaltica"] },
  fresado: { peso: 1, items: ["pav_fresado", "mt_retiro_sobrantes"] },
  "via terciaria": { peso: 1, items: ["pav_afirmado", "pav_placa_huella", "mt_conformacion_subrasante", "pav_cuneta", "mt_excavacion_mecanica", "hid_alcantarilla", "prel_localizacion_replanteo"] },
  "vias terciarias": { peso: 1, items: ["pav_afirmado", "pav_placa_huella", "mt_conformacion_subrasante", "pav_cuneta", "hid_alcantarilla"] },
  "malla vial": { peso: 1, items: ["pav_parcheo", "pav_mezcla_asfaltica", "pav_base_granular", "sen_senalizacion_horizontal", "amb_manejo_transito"] },
  carretera: { peso: 1, items: ["pav_subbase", "pav_base_granular", "mt_conformacion_subrasante", "pav_cuneta", "sen_senalizacion_vertical", "amb_manejo_transito"] },
  carreteable: { peso: 1, items: ["pav_afirmado", "mt_conformacion_subrasante", "pav_cuneta", "mt_excavacion_mecanica"] },
  afirmado: { peso: 1, items: ["pav_afirmado", "mt_conformacion_subrasante"] },
  anden: { peso: 1, items: ["pav_anden", "pav_sardinel", "est_concreto_21", "mt_excavacion_manual", "prel_demolicion_pavimento"] },
  andenes: { peso: 1, items: ["pav_anden", "pav_sardinel", "est_concreto_21", "mt_excavacion_manual", "prel_demolicion_pavimento"] },
  sardinel: { peso: 1, items: ["pav_sardinel", "est_concreto_21"] },
  sardineles: { peso: 1, items: ["pav_sardinel", "est_concreto_21"] },
  bordillo: { peso: 1, items: ["pav_bordillo"] },
  adoquin: { peso: 1, items: ["pav_adoquin", "pav_subbase", "mt_excavacion_manual"] },
  cuneta: { peso: 1, items: ["pav_cuneta", "est_concreto_21", "mt_excavacion_manual"] },
  cunetas: { peso: 1, items: ["pav_cuneta", "est_concreto_21", "mt_excavacion_manual"] },
  "espacio publico": { peso: 0.8, items: ["pav_anden", "pav_sardinel", "urb_mobiliario_urbano", "urb_zona_verde"] },

  /* ---- estructuras ---- */
  puente: { peso: 1, items: ["est_concreto_28", "est_acero_refuerzo", "est_formaleta", "est_pilote", "est_viga_cimentacion", "mt_excavacion_mecanica", "con_estudio_suelos"] },
  "puente vehicular": { peso: 1, items: ["est_concreto_28", "est_acero_refuerzo", "est_formaleta", "est_pilote", "est_viga_cimentacion", "est_estructura_metalica", "mt_excavacion_mecanica", "con_estudio_suelos"] },
  "puente peatonal": { peso: 1, items: ["est_estructura_metalica", "est_concreto_28", "est_acero_refuerzo", "est_pilote"] },
  ponton: { peso: 1, items: ["est_concreto_28", "est_acero_refuerzo", "est_formaleta", "mt_excavacion_mecanica"] },
  "box culvert": { peso: 1, items: ["hid_box_culvert", "est_concreto_28", "est_acero_refuerzo", "est_formaleta", "mt_excavacion_mecanica"] },
  boxcoulvert: { peso: 1, items: ["hid_box_culvert", "est_concreto_28", "est_acero_refuerzo"] },
  "muro de contencion": { peso: 1, items: ["est_muro_contencion", "est_concreto_28", "est_acero_refuerzo", "est_formaleta", "mt_excavacion_mecanica", "con_estudio_suelos"] },
  gavion: { peso: 1, items: ["est_gavion", "mt_excavacion_mecanica", "mt_relleno_seleccionado"] },
  gaviones: { peso: 1, items: ["est_gavion", "mt_excavacion_mecanica", "mt_relleno_seleccionado"] },
  concreto: { peso: 0.7, items: ["est_concreto_21", "est_formaleta", "est_acero_refuerzo"] },
  "concreto reforzado": { peso: 1, items: ["est_concreto_28", "est_acero_refuerzo", "est_formaleta"] },
  reforzamiento: { peso: 1, items: ["est_reforzamiento", "est_concreto_28", "est_acero_refuerzo", "con_diseno_estructural"] },
  "reforzamiento estructural": { peso: 1, items: ["est_reforzamiento", "est_concreto_28", "est_acero_refuerzo", "con_diseno_estructural", "con_estudio_suelos"] },
  cimentacion: { peso: 1, items: ["est_viga_cimentacion", "est_concreto_28", "est_acero_refuerzo", "mt_excavacion_mecanica", "con_estudio_suelos"] },
  pilotes: { peso: 1, items: ["est_pilote", "est_concreto_28", "est_acero_refuerzo"] },
  "estructura metalica": { peso: 1, items: ["est_estructura_metalica", "edi_cubierta_metalica"] },
  estabilizacion: { peso: 0.9, items: ["est_muro_contencion", "est_gavion", "mt_relleno_seleccionado", "con_estudio_suelos"] },
  demolicion: { peso: 1, items: ["prel_demolicion_concreto", "mt_retiro_sobrantes"] },

  /* ---- movimiento de tierras ---- */
  excavacion: { peso: 1, items: ["mt_excavacion_mecanica", "mt_excavacion_manual", "mt_retiro_sobrantes"] },
  "movimiento de tierras": { peso: 1, items: ["mt_excavacion_mecanica", "mt_relleno_seleccionado", "mt_retiro_sobrantes", "mt_terraplen"] },
  explanacion: { peso: 1, items: ["mt_excavacion_mecanica", "mt_terraplen", "mt_conformacion_subrasante"] },
  terraplen: { peso: 1, items: ["mt_terraplen", "mt_relleno_seleccionado"] },
  relleno: { peso: 0.9, items: ["mt_relleno_seleccionado", "mt_relleno_material_sitio"] },
  descapote: { peso: 1, items: ["prel_descapote", "mt_retiro_sobrantes"] },

  /* ---- hidráulica y saneamiento ---- */
  alcantarillado: { peso: 1, items: ["hid_tuberia_alcantarillado", "hid_pozo_inspeccion", "hid_domiciliaria", "mt_excavacion_mecanica", "mt_relleno_seleccionado", "mt_retiro_sobrantes", "prel_demolicion_pavimento"] },
  acueducto: { peso: 1, items: ["hid_tuberia_acueducto", "hid_valvula", "hid_domiciliaria", "mt_excavacion_mecanica", "mt_relleno_seleccionado", "mt_retiro_sobrantes"] },
  "saneamiento basico": { peso: 1, items: ["hid_tuberia_alcantarillado", "hid_pozo_inspeccion", "hid_unidad_sanitaria", "hid_ptar"] },
  ptap: { peso: 1, items: ["hid_ptap", "est_concreto_28", "est_acero_refuerzo", "hid_valvula"] },
  ptar: { peso: 1, items: ["hid_ptar", "est_concreto_28", "est_acero_refuerzo", "mt_excavacion_mecanica"] },
  "planta de tratamiento": { peso: 1, items: ["hid_ptap", "hid_ptar", "est_concreto_28", "est_acero_refuerzo"] },
  bocatoma: { peso: 1, items: ["hid_bocatoma", "est_concreto_28", "mt_excavacion_mecanica"] },
  "pozo de inspeccion": { peso: 1, items: ["hid_pozo_inspeccion", "est_concreto_21"] },
  sumidero: { peso: 1, items: ["hid_sumidero", "est_concreto_21"] },
  sumideros: { peso: 1, items: ["hid_sumidero", "est_concreto_21"] },
  tuberia: { peso: 0.8, items: ["hid_tuberia_acueducto", "hid_tuberia_alcantarillado", "mt_excavacion_mecanica"] },
  "tanque de almacenamiento": { peso: 1, items: ["hid_tanque_almacenamiento", "est_concreto_28", "est_acero_refuerzo"] },
  "pozo profundo": { peso: 1, items: ["hid_pozo_profundo", "hid_valvula"] },
  hidrante: { peso: 1, items: ["hid_hidrante", "hid_valvula"] },
  "unidad sanitaria": { peso: 1, items: ["hid_unidad_sanitaria", "edi_aparato_sanitario", "edi_mamposteria", "hid_tuberia_alcantarillado"] },
  "unidades sanitarias": { peso: 1, items: ["hid_unidad_sanitaria", "edi_aparato_sanitario", "edi_mamposteria"] },
  drenaje: { peso: 0.9, items: ["pav_cuneta", "hid_alcantarilla", "mt_excavacion_mecanica"] },
  canalizacion: { peso: 0.8, items: ["est_concreto_21", "mt_excavacion_mecanica"] },
  jarillon: { peso: 1, items: ["mt_terraplen", "est_gavion", "mt_relleno_seleccionado"] },

  /* ---- edificación ---- */
  edificacion: { peso: 0.9, items: ["est_concreto_21", "est_acero_refuerzo", "edi_mamposteria", "edi_panete", "edi_estuco_pintura"] },
  mamposteria: { peso: 1, items: ["edi_mamposteria", "edi_panete"] },
  cubierta: { peso: 0.9, items: ["edi_cubierta_metalica", "est_estructura_metalica", "edi_impermeabilizacion"] },
  "cubierta metalica": { peso: 1, items: ["edi_cubierta_metalica", "est_estructura_metalica"] },
  enchape: { peso: 1, items: ["edi_enchape", "edi_piso_ceramica"] },
  "cielo raso": { peso: 1, items: ["edi_cielo_raso"] },
  pintura: { peso: 0.8, items: ["edi_estuco_pintura", "edi_panete"] },
  impermeabilizacion: { peso: 1, items: ["edi_impermeabilizacion", "edi_cubierta_metalica"] },
  "bateria sanitaria": { peso: 1, items: ["edi_aparato_sanitario", "hid_tuberia_alcantarillado", "edi_enchape", "edi_mamposteria"] },
  "sede educativa": { peso: 0.6, items: ["edi_mamposteria", "edi_panete", "edi_estuco_pintura", "edi_cubierta_metalica", "edi_piso_ceramica", "est_concreto_21"] },
  "institucion educativa": { peso: 0.6, items: ["edi_mamposteria", "edi_panete", "edi_estuco_pintura", "edi_cubierta_metalica", "edi_piso_ceramica"] },
  aula: { peso: 0.8, items: ["edi_mamposteria", "edi_panete", "edi_estuco_pintura", "edi_cubierta_metalica", "edi_piso_ceramica", "est_concreto_21"] },
  aulas: { peso: 0.8, items: ["edi_mamposteria", "edi_panete", "edi_estuco_pintura", "edi_cubierta_metalica", "edi_piso_ceramica", "est_concreto_21"] },
  "puesto de salud": { peso: 0.8, items: ["edi_mamposteria", "edi_panete", "edi_piso_ceramica", "edi_aparato_sanitario", "ele_tablero"] },
  vivienda: { peso: 0.8, items: ["edi_mamposteria", "edi_panete", "edi_cubierta_teja", "edi_piso_ceramica", "est_concreto_21", "hid_unidad_sanitaria"] },
  viviendas: { peso: 0.8, items: ["edi_mamposteria", "edi_panete", "edi_cubierta_teja", "edi_piso_ceramica", "est_concreto_21"] },

  /* ---- eléctrico ---- */
  electrificacion: { peso: 1, items: ["ele_red_media_tension", "ele_red_baja_tension", "ele_poste", "ele_transformador", "ele_acometida"] },
  "alumbrado publico": { peso: 1, items: ["ele_luminaria", "ele_poste", "ele_red_baja_tension", "ele_canalizacion_electrica"] },
  luminaria: { peso: 1, items: ["ele_luminaria", "ele_poste"] },
  luminarias: { peso: 1, items: ["ele_luminaria", "ele_poste"] },
  "redes electricas": { peso: 1, items: ["ele_red_media_tension", "ele_red_baja_tension", "ele_poste"] },
  "media tension": { peso: 1, items: ["ele_red_media_tension", "ele_transformador", "ele_poste"] },
  "baja tension": { peso: 1, items: ["ele_red_baja_tension", "ele_acometida", "ele_tablero"] },
  subestacion: { peso: 1, items: ["ele_subestacion", "ele_transformador", "est_concreto_21"] },
  transformador: { peso: 1, items: ["ele_transformador", "ele_poste"] },
  "iluminacion vial": { peso: 1, items: ["ele_luminaria", "ele_poste", "ele_canalizacion_electrica"] },

  /* ---- urbanismo y deportivo ---- */
  cancha: { peso: 1, items: ["urb_cancha", "est_concreto_21", "mt_conformacion_subrasante", "ele_luminaria"] },
  polideportivo: { peso: 1, items: ["urb_cancha", "urb_cubierta_escenario", "est_estructura_metalica", "est_concreto_21", "ele_luminaria"] },
  coliseo: { peso: 1, items: ["urb_cubierta_escenario", "est_estructura_metalica", "est_concreto_28", "ele_luminaria"] },
  parque: { peso: 0.9, items: ["urb_zona_verde", "urb_mobiliario_urbano", "urb_juegos_biosaludables", "pav_anden", "ele_luminaria"] },
  "grama sintetica": { peso: 1, items: ["urb_grama_sintetica", "mt_conformacion_subrasante", "pav_subbase"] },
  biosaludable: { peso: 1, items: ["urb_juegos_biosaludables", "est_concreto_21", "urb_zona_verde"] },
  empradizacion: { peso: 1, items: ["urb_zona_verde"] },
  arborizacion: { peso: 1, items: ["urb_arborizacion", "urb_zona_verde"] },
  urbanismo: { peso: 0.9, items: ["pav_anden", "pav_sardinel", "urb_zona_verde", "urb_mobiliario_urbano"] },

  /* ---- señalización ---- */
  "senalizacion vial": { peso: 1, items: ["sen_senalizacion_horizontal", "sen_senalizacion_vertical", "sen_tachas", "amb_manejo_transito"] },
  "senalizacion horizontal": { peso: 1, items: ["sen_senalizacion_horizontal", "sen_tachas"] },
  "senalizacion vertical": { peso: 1, items: ["sen_senalizacion_vertical"] },
  demarcacion: { peso: 1, items: ["sen_senalizacion_horizontal", "sen_tachas"] },
  "defensa metalica": { peso: 1, items: ["sen_defensa_metalica"] },

  /* ---- oficios que aparecen dentro de casi cualquier obra ----
     Van aparte porque describen ACTIVIDADES de detalle, no tipologías: un
     objeto rara vez los nombra, pero cuando los nombra son inequívocos. Sin
     ellos habría ítems del catálogo a los que ninguna ruta puede llegar, y un
     ítem inalcanzable es un ítem que solo existe para ser tecleado a mano. */
  campamento: { peso: 1, items: ["prel_campamento"] },
  cerramiento: { peso: 1, items: ["prel_cerramiento"] },
  ciclopeo: { peso: 1, items: ["est_concreto_ciclopeo"] },
  solado: { peso: 1, items: ["est_solado", "est_concreto_21"] },
  "malla electrosoldada": { peso: 1, items: ["est_malla_electrosoldada", "est_concreto_21"] },
  "carpinteria metalica": { peso: 1, items: ["edi_carpinteria_metalica"] },
  baranda: { peso: 1, items: ["edi_carpinteria_metalica", "est_estructura_metalica"] },
  barandas: { peso: 1, items: ["edi_carpinteria_metalica", "est_estructura_metalica"] },
  formaleta: { peso: 1, items: ["est_formaleta"] },
  "acero de refuerzo": { peso: 1, items: ["est_acero_refuerzo", "est_formaleta"] },

  /* ---- consultoría ---- */
  interventoria: { peso: 1, items: ["con_interventoria"] },
  "estudios y disenos": { peso: 1, items: ["con_estudios_disenos", "con_topografia", "con_estudio_suelos", "con_diseno_estructural"] },
  "estudio de suelos": { peso: 1, items: ["con_estudio_suelos"] },
  topografia: { peso: 1, items: ["con_topografia"] },
  "diseno estructural": { peso: 1, items: ["con_diseno_estructural", "con_estudio_suelos"] },
  consultoria: { peso: 0.7, items: ["con_estudios_disenos"] },
};

module.exports = {
  CAPITULOS, CATALOGO, POR_ID,
  item, existeItem,
  MAPEO_UNSPSC_SEMILLA, DICCIONARIO_SEMILLA,
};
