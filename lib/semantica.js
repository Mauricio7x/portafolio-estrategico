/* ============================================================================
   lib/semantica · Clasificación semántica del objeto contractual
   ----------------------------------------------------------------------------
   VOCABULARIOS (datos), no reglas: quién los usa y cómo decide vive en
   lib/filtros.js. Aquí solo está el «qué palabras significan qué».

   - norm(s)                  normalización única de toda la app: sin acentos
                              (ñ → n), minúsculas, espacios colapsados. Vivía en
                              lib/filtros.js; se mudó aquí para que los módulos
                              de vocabulario (lib/texto_unspsc.js) puedan
                              normalizar sin depender de filtros (que a su vez
                              depende de ellos). lib/filtros la RE-EXPORTA, así
                              que `require("./filtros.js").norm` sigue existiendo.
   - BLACKLIST_OBJETO         objetos que ningún RUP de Helder/Génesis cubre
                              (caninos, PAE, dotación, seguros, software,
                              vigilancia armada…). Si matchea, FUERA.
                              Regex heredado (probado en producción) del
                              index.html histórico, extraído programáticamente.
   - WHITELIST_OBRA           vocabulario inequívoco de obra/ingeniería civil.
                              Se exige cuando la licitación NO declara código
                              UNSPSC (mapeo textual tolerante). También heredado.
   - VERBOS_DE_OBRA_*         capa de PERTINENCIA (jul 2026): ¿el objeto es del
                              dominio de obra/infraestructura/consultoría?
   - TERMINOS_NO_PERTINENTES  el reverso: servicios administrativos, eventos,
                              alimentos, TI… que se colaban porque su código
                              UNSPSC sí está en el RUP.

   Los tres vocabularios nuevos se comparan SIEMPRE sobre texto normalizado
   (norm), por eso van sin tildes y con «ñ» ya convertida en «n»: «diseño» se
   escribe `diseno`, «señalización» `senalizacion`, «cumpleaños` `cumpleanos`.
   Los dos heredados se comparan sobre el texto CRUDO (llevan [oó] y flag i);
   no se tocan: están probados y cambiar su base de comparación sería una
   regresión silenciosa.
   ========================================================================== */
"use strict";

/* Normalización: sin acentos (NFD + descarte de diacríticos combinantes, lo
   que además convierte ñ→n), minúsculas, espacios colapsados. */
const norm = (s) => String(s || "")
  .normalize("NFD").replace(/[̀-ͯ]/g, "")
  .toLowerCase().replace(/\s+/g, " ").trim();

/* «CONECTIVIDAD» CON CONTEXTO DE TELECOMUNICACIÓN CERCA — una sola definición.
   La usan TERMINOS_BLOQUEANTES (texto normalizado) y BLACKLIST_OBJETO (texto
   crudo): las palabras de contexto no llevan tilde, así que la misma fuente
   vale para las dos bases de comparación. Hubo un tiempo con dos copias y ya
   habían divergido —a la de BLACKLIST_OBJETO le faltaba `red lan`—, que es
   exactamente lo que este repositorio prohíbe: dos definiciones de la misma
   regla contestando distinto a la misma pregunta.
   `digital` está en la lista porque «CONECTIVIDAD DIGITAL» es el fraseo de los
   programas de MinTIC y sin él «MEJORAMIENTO DE LA CONECTIVIDAD DIGITAL DE LAS
   INSTITUCIONES EDUCATIVAS» salía VERDE, que es el estado más confiado que
   sirve la app. Lo que la palabra NO puede seguir descartando es la obra vial
   («conectividad rural»), que es el corazón del negocio.
   ⚠️ «servicio» SALIÓ de la lista de contexto (27-ago-2026): reabría el mismo
   falso negativo — el fraseo de plantilla de la obra vial trae «…PARA LA
   CONECTIVIDAD RURAL EN SERVICIO DE LA COMUNIDAD» y moría en la ingesta,
   invisible al diagnóstico. El fraseo telecom real pone «servicio» ANTES
   («PRESTACIÓN DEL SERVICIO DE CONECTIVIDAD A INTERNET»), donde este lookahead
   no mira, y ese caso lo caza «internet» de todos modos (medido, con prueba). */
const CONECTIVIDAD_DE_TELECOM = "conectividad(?=[\\s\\S]{0,40}\\b(?:internet|datos|banda|canal|wifi|red\\s+lan|digital|telecom|fibra|enlace|proveedor))";
/* ⚠️ TRES TÉRMINOS DE ESTA LISTA VAN CONDICIONADOS A CONTEXTO DE COMPRA/SERVICIO
   (27-ago-2026): «capacitación», «alojamiento» y «biblioteca» sueltos mataban
   en la INGESTA obra real — la construcción de una biblioteca (que la propia
   WHITELIST_OBRA declara obra), los alojamientos de un batallón y la vía que
   «incluye socialización y capacitación a la comunidad» — con el descarte
   invisible al diagnóstico, que censa el corpus ya guardado. El mecanismo es
   el que la lista ya usa para «conectividad» y «logística»: la palabra solo
   descarta con su contexto de compra/servicio al lado (lookbehind acotado;
   «hospedaje», «libros» y «bibliográfico» siguen sueltos porque no aparecen en
   objetos de obra). Lo que ahora entre de más lo descarta el JUICIO — la
   blacklist es la factura de Redis, no el veredicto.

   ⚠️ Y OTROS SIETE SEGUÍAN SUELTOS (1-sep-2026): «agropecuari», «seguro de»,
   «automotor», «odontológic», «alimentación escolar», «mercado campesino» y los
   animales («caninos», «perros», «bovinos»…) mataban en la ingesta 10 de 18
   objetos de obra de plantilla —la vía terciaria «para el desarrollo
   agropecuario», el puente peatonal «para el paso seguro de», el comedor
   escolar del PAE, la plaza de mercado campesino, el consultorio odontológico
   del centro de salud, el distrito de riego, el centro de bienestar animal, el
   puente vehicular «para el tráfico automotor»— (reproducido con
   `admisibleParaIngesta` real). Cada uno exige ahora el contexto de compra o
   servicio que lo hace suministro (lookbehind acotado, el mismo mecanismo), y
   «seguros» solo con lo que se asegura detrás: «paso/tránsito/abastecimiento
   seguro de …» no es una póliza. `libros`, `becas` y `ganado` cierran con `\b`
   porque casaban como prefijo («becarios»). La cerradura ejecuta la función
   real con los 10 objetos y sus 8 contra-casos de suministro. */
/* (2-sep-2026) Cada alternativa con lookbehind va precedida de un lookahead con
   su propio literal: el motor solo evalúa el contexto (lookbehind de hasta 40
   caracteres) donde la palabra clave está presente. Mismo conjunto de aciertos y
   mismo texto casado; 5× más rápida, medida con los 2 600 objetos de la suite. */
const BLACKLIST_OBJETO = new RegExp(String.raw`\b((?=(?:canin[oa]s?|perr[oa]s?|semovientes?|equin[oa]s?|bovin[oa]s?|porcin[oa]s?|ganado\b))(?<=\b(?:adquisici[oó]n|compra|suministro|adiestramiento|entrenamiento|alimento|concentrado|esterilizaci[oó]n|vacunaci[oó]n|manejo|transporte)\s+(?:de\s+|del\s+|los\s+|las\s+|el\s+|la\s+)*)(?:canin[oa]s?|perr[oa]s?|semovientes?|equin[oa]s?|bovin[oa]s?|porcin[oa]s?|ganado\b)|aves\s+de\s+corral|adiestramiento|(?=alimentaci[oó]n\s+(?:escolar|pae|adulto|infantil|complement))(?<=\b(?:suministro|prestaci[oó]n|servicios?|entrega|contrataci[oó]n|operador(?:es)?|raciones?|complementos?)\b[\s\S]{0,25})alimentaci[oó]n\s+(?:escolar|pae|adulto|infantil|complement)|aliment(?:os|aria|ario)\s+(?:escolar|pae|nutric)|paquetes?\s+alimentari|refrigerios?|v[ií]veres|(?=mercad(?:o|os)\s+(?:campesin|familiar))(?<=\b(?:suministro|entrega|compra|adquisici[oó]n|operaci[oó]n|paquetes?|bonos?|kits?|distribuci[oó]n)\b[\s\S]{0,40})mercad(?:o|os)\s+(?:campesin|familiar)|almuerz(?:o|os)|desayun(?:o|os)|loncher|vestuario|uniformes?|dotaci[oó]n\s+(?:de\s+)?(?:personal|empleados|escolar|trabajadores|polici|militar)|calzado|prendas\s+(?:de\s+vestir|escolar)|medicament(?:o|os|aria)|f[aá]rmacos?|insumos?\s+m[eé]dic(?:o|os|al)|insumos?\s+hospital|dispositivos?\s+m[eé]dic|(?=odontol[oó]gic)(?<=\b(?:insumos?|equipos?|servicios?|unidad(?:es)?|sill[oó]n(?:es)?|material(?:es)?|elementos?|dispositivos?|instrumental|suministros?|atenci[oó]n)\b[\s\S]{0,40})odontol[oó]gic|farmac[eé]utic|papeler[ií]a|[uú]tiles\s+de\s+oficina|t[oó]ner|impresi[oó]n\s+(?:de\s+formul|de\s+document)|combustible|gasolina|acpm\b|lubricantes|aceite\s+de\s+motor|adquisici[oó]n\s+de\s+veh[ií]culos|compra\s+de\s+veh[ií]culos|motocicletas?|cuatrimoto|(?=automotor(?:es)?)(?<=\b(?:parque|reparaci[oó]n|seguros?|taller(?:es)?|veh[ií]culos?|repuestos?|lavado|alquiler|arrendamiento)\b[\s\S]{0,25})automotor(?:es)?|busetas?|camion(?:es|eta)|armament|munici[oó]n(?:es)?|dotaci[oó]n\s+polici|chaleco\s+antibalas|software|licenci(?:a|as)\s+(?:inform[aá]tic|de\s+software|microsoft|adobe|office|antiviru)|ofim[aá]tica|hosting|dominio\s+web|(?=capacitaci[oó]n)(?<=\b(?:servicios?\s+(?:de|para)(?:\s+la)?|jornadas?\s+de|programas?\s+de|cursos?\s+de|talleres?\s+de|procesos?\s+de)\s+)capacitaci[oó]n|congres(?:o|os)|seminari(?:o|os)|hospedaje|(?=alojamiento)(?<=\bservicios?\s+de\s+)alojamiento|alojamiento(?=\s+y\s+alimentaci[oó]n)|tiquetes?\s+a[eé]reos?|transporte\s+(?:de\s+)?personal|transporte\s+escolar|fumigaci[oó]n|control\s+(?:de\s+)?(?:vectores|plagas|roedores)|aseo\s+(?:y\s+)?(?:cafeter[ií]a|general|integral|institucion)|vigilancia\s+(?:armada|privada|y\s+seguridad)|seguridad\s+privada|seguros?\s+(?:generales|todo\s+riesgo|automotor|vida|salud|estudiantil(?:es)?|de\s+(?:vida|salud|bienes|responsabilidad|accidentes|da[ñn]os|veh[ií]culos|autom[oó]viles|automotores|manejo|cumplimiento|todo\s+riesgo|la\s+entidad|los\s+bienes|exequias|hogar|incendio|infraestructura|maquinaria|transporte))|programa\s+de\s+seguros|p[oó]liza|intermediaci[oó]n\s+de\s+seguros|corretaje|telefon[ií]a|` + CONECTIVIDAD_DE_TELECOM + String.raw`|plan\s+de\s+datos|publicidad|impresos\s+(?:y|institucion)|pendones?|plotter|jur[ií]dic(?:o|os|a|as)\s+(?:asesor|representac|defensa)|defensa\s+judicial|representaci[oó]n\s+judicial|auditor[ií]a\s+(?:contable|financiera|forense|de\s+cumplimiento|interna|de\s+gesti)|libros\b|bibliogr[aá]fic|(?=biblioteca)(?<=\b(?:dotaci[oó]n|adquisici[oó]n|compra|suministro|material(?:es)?|elementos)\b[\s\S]{0,40})biblioteca|juguetes?|navide[ñn](?:o|a|os|as)|premios?\s+(?:y\s+est[ií]mul|escolar|deportiv)|bonos?\s+(?:navide|nutric|alimentari|escolar)|becas?\b|fertilizantes?|abonos?\s+(?:org[aá]nicos|qu[ií]micos)|insumos?\s+agr[ií]cola|(?=agropecuari)(?<=\b(?:suministro|adquisici[oó]n|compra|entrega|insumos?|kits?|maquinaria|herramientas?|semillas?|asistencia\s+t[eé]cnica|extensi[oó]n|fomento|proyectos?\s+productivos?|unidades?\s+productivas?)\b[\s\S]{0,25})agropecuari|fungicidas?|herbicidas?|plaguicidas?|kits?\s+(?:escolar|estudiantil|alimentari|nutric|hi?gi[eé]nic|deportiv|biosanitar)|elementos?\s+de\s+protecci[oó]n\s+(?:personal|biosanitar)|epp\b|interpretaci[oó]n\s+de\s+lenguaje|traducci[oó]n)`, "i");

const WHITELIST_OBRA = /\b(construcci[oó]n|construir|obra\s+(?:p[uú]blic|civil|de)|obras\s+(?:p[uú]blic|civil|de|complementari)|mejoramient[o]?\s+(?:de\s+(?:la\s+|el\s+|los\s+|las\s+)?)?(?:v[ií]a|infraestruc|sede|edifici|cancha|coleg|escuela|hospital|parque|red|acueduc|alcantarill|placa)|adecuaci[oó]n\s+(?:de\s+(?:la\s+|el\s+|los\s+|las\s+)?)?(?:sede|edifici|coleg|escuela|hospital|parque|cancha|infraestruc|v[ií]a|red|salon|sal[oó]n|aula|biblio|laborator|comedor|coliseo|estadio|cubiert)|remodelaci[oó]n|mantenimiento\s+(?:de\s+(?:la\s+|el\s+|los\s+|las\s+)?)?(?:v[ií]a|infraestruc|edifici|red(?:es)?|alcantarill|acueduc|puente|p[uú]blic|escuela|coleg|hospital|sede|parque|cancha|estadi|polid[eé]port|cubiert)|ampliaci[oó]n\s+(?:de\s+(?:la\s+|el\s+|los\s+|las\s+)?)?(?:v[ií]a|red|edifici|acueduc|alcantarill|cobertur)|optimizaci[oó]n\s+(?:de\s+(?:la\s+|el\s+|los\s+|las\s+)?)?(?:red|sistema|acueduc|alcantarill|infraestruc)|rehabilitaci[oó]n\s+(?:de\s+(?:la\s+|el\s+|los\s+|las\s+)?)?(?:v[ií]a|red|acueduc|alcantarill|edifici|cubierta|sede|coleg)|pavimentaci[oó]n|pavimento|asfalto|asf[aá]ltic|repavimentaci[oó]n|parcheo|v[ií]a\s+(?:terciari|secundari|urban|rural)|v[ií]as\s+(?:terciari|secundari|urban|rural)|carretera|carreteable|and[eé]n|aceras?|sardineles?|placa\s*huella|placahuella|puente\s+(?:vehicular|peaton|colgant|en\s+concret)|pontones?|box\s*culvert|alcantarill|acueducto|ptar\b|ptap\b|red(?:es)?\s+(?:de\s+)?(?:acueduct|alcantarill|el[eé]ctric|hidr[aá]ulic|sanitari|gas|distribuci|m[eé]dia\s+tensi|baja\s+tensi)|edificaci[oó]n|edificio\s+(?:p[uú]blic|institucion|administra|educativ)|coleg(?:io|ial)|polid[eé]port|urbanismo|espacio\s+p[uú]blico|drenaje|gavion(?:es)?|muro\s+de\s+contenci[oó]n|cuneta|interventor[ií]a\s+(?:t[eé]cnica|de\s+obra|para\s+la\s+obra|al\s+contrato\s+de\s+obra|administrativa\s+y\s+t[eé]cnica)|consultor[ií]a\s+(?:t[eé]cnica|de\s+obra|para\s+(?:el\s+dise|los\s+estudio|la\s+construc))|estudios?\s+y\s+dise[ñn]os?|dise[ñn]o(?:s)?\s+(?:t[eé]cnic|estructura|hidr[aá]ulic|el[eé]ctric|arquitect|de\s+obra|para\s+(?:obra|construc))|demolici[oó]n|reforzamiento\s+(?:estructur|s[ií]smic)|canalizaci[oó]n|cubierta\s+(?:met[aá]lic|liviana|en\s+teja)|electrificaci[oó]n\s+(?:rural|de\s+)?(?:red|vereda|barrio)|alumbrado\s+p[uú]blic|iluminaci[oó]n\s+(?:v[ií]al|p[uú]blic|parque|cancha)|se[ñn]alizaci[oó]n\s+(?:v[ií]al|horizontal|vertical)|tanque\s+(?:de\s+almacen|elevad|enterr|el[eé]vado)|pozo\s+(?:profun|s[eé]ptic|subterr)|infraestructura\s+(?:v[ií]al|educativ|deportiv|de\s+salud|sanitari|el[eé]ctric|hidr[aá]ulic|p[uú]blic)|sistema\s+(?:de\s+)?(?:acueduc|alcantarill|tratamient\s+de\s+agua))/i;

/* ══════════════════ Capa de PERTINENCIA (sobre texto normalizado) ══════════════════

   Sustantivos de infraestructura. Son el ANCLA de los verbos ambiguos: un
   «mantenimiento» o una «instalación» solo cuentan como obra si hay algo de
   esto cerca (si no, «mantenimiento de vehículos» sería obra civil). */
const INFRAESTRUCTURA = "(?:obras?|vias?|vial(?:es)?|carreter\\w*|puentes?|pontones?|box\\s*culvert|edifici\\w*|edificacion(?:es)?|infraestructura|acueducto?s?|alcantarill\\w*|saneamiento|ptar|ptap|planta\\s+de\\s+tratamiento|bocatoma|red(?:es)?|sedes?|colegios?|escuelas?|hospital(?:es)?|puesto\\s+de\\s+salud|centro\\s+de\\s+salud|viviendas?|parques?|canchas?|coliseos?|polideportiv\\w*|estadios?|aulas?|salones?|salon|biblioteca|comedor(?:es)?|cubiertas?|placa\\s*huella|placas?|pavimento|andenes?|anden|aceras?|sardineles?|muros?|gavion(?:es)?|cunetas?|drenajes?|canal(?:es)?|jarillon(?:es)?|tanques?|pozos?|alumbrado|luminarias?|subestacion(?:es)?|bateria\\s+sanitaria|unidad(?:es)?\\s+sanitaria|terraplen(?:es)?|alcantarillas?|box|espacio\\s+publico|parque\\s+biosaludable|malla\\s+vial|via\\s+terciaria)";

/* 1 · Verbos y sustantivos INEQUÍVOCOS de obra civil / infraestructura.
      Si alguno aparece, el objeto es pertinente sin más preguntas. */
const VERBOS_DE_OBRA_FUERTES = new RegExp(
  "\\b(?:construccion(?:es)?|construir|construyendo|rehabilitacion|rehabilitar|reconstruccion|"
  + "mejoramiento|mejorar|adecuacion(?:es)?|adecuar|remodelacion|reparacion(?:es)?|ampliacion|"
  + "reforzamiento|reposicion|optimizacion|repotenciacion|"
  + "pavimentacion|repavimentacion|pavimentar|pavimento|asfalto|asfaltic\\w*|parcheo|placa\\s*huella|placahuella|"
  /* «obra» suelta SALVO en «MANO DE OBRA» (ago 2026). Iba sin la guarda, y
     «SUMINISTRO DE MANO DE OBRA NO CALIFICADA PARA ASEO Y ORNATO» —fraseo
     corriente de los contratos de personal, que se publican con 80111600, clase
     inscrita en los RUP— contaba como verbo FUERTE de obra: la pertinencia lo
     daba VERDE «Obra civil» y el término «aseo», que existe exactamente para
     ese caso, no llegaba a evaluarse (la regla exige CERO verbos de obra). Un
     verde es el estado más confiado que sirve la app; el mismo objeto sin la
     palabra «obra» cae ROJO. La segunda «obra» de «mano de obra para la obra de
     la escuela» no lleva el prefijo y sigue contando. */
  + "obra\\s+(?:publica|civil|de)|obras\\s+(?:publicas|civiles|de|complementarias)|(?<!mano\\s+de\\s+)obras?\\b|"
  + "edificacion(?:es)?|infraestructura|urbanismo|espacio\\s+publico|"
  + "demolicion|excavacion(?:es)?|movimiento(?:s)?\\s+de\\s+tierra|explanacion|terraceo|"
  + "alcantarillado|acueducto|saneamiento\\s+basico|ptar\\b|ptap\\b|planta\\s+de\\s+tratamiento|bocatoma|"
  + "electrificacion|alumbrado\\s+publico|redes?\\s+electricas|linea\\s+electrica|subestacion\\s+electrica|"
  + "senalizacion\\s+(?:vial|horizontal|vertical)|"
  + "box\\s*culvert|muro(?:s)?\\s+de\\s+contencion|estabilizacion|contencion|gavion(?:es)?|"
  + "canalizacion|drenaje|cuneta(?:s)?|sardinel(?:es)?|anden(?:es)?|"
  + "puente\\s+(?:vehicular|peatonal|colgante|en\\s+concreto)|"
  + "via(?:s)?\\s+(?:terciaria|terciarias|secundaria|secundarias|urbana|urbanas|rural|rurales)|"
  + "carretera(?:s)?|carreteable(?:s)?|malla\\s+vial|"
  + "interventoria|"
  + "estudios?\\s+y\\s+disenos?|"
  + "cubierta\\s+(?:metalica|liviana|en\\s+teja)"
  + ")\\b");

/* 2 · Verbos AMBIGUOS: cuentan como obra solo con un ancla de infraestructura
      cerca (hasta 5 palabras). El encargo lo pide explícitamente para
      «mantenimiento» (solo si va seguido de infraestructura) y para
      «instalación/montaje» (de sistemas constructivos, no de equipos de
      oficina). Se aplica el mismo criterio a la consultoría: «supervisión» o
      «diseño» a secas describen igual de bien una supervisión de personal. */
const CERCA = "(?:\\W+\\w+){0,5}?\\W+";
const VERBOS_DE_OBRA_CONDICIONADOS = new RegExp(
  "\\b(?:mantenimiento|mantener|mantenimientos|instalacion(?:es)?|instalar|montaje|"
  + "consultoria|supervision|diseno(?:s)?|estudios?|asesoria\\s+tecnica)\\b"
  + CERCA + INFRAESTRUCTURA + "\\b");
/* …y su forma invertida: «MANTENIMIENTO DE LA RED» pero también
   «RED DE ALCANTARILLADO: MANTENIMIENTO PREVENTIVO». */
const VERBOS_DE_OBRA_CONDICIONADOS_INV = new RegExp(
  "\\b" + INFRAESTRUCTURA + "\\b" + CERCA
  + "(?:mantenimiento|instalacion(?:es)?|montaje|consultoria|supervision|diseno(?:s)?|estudios?)\\b");

/* 3 · Términos NO PERTINENTES: si aparecen y NO hay ningún verbo de obra, el
      proceso es un servicio ajeno por más que su UNSPSC esté en el RUP. Es la
      capa que faltaba: la anti-suministro solo mira segmentos de BIENES (<70)
      y estos falsos positivos viven en 80 (gerencia), 85 (salud), 93
      (servicios sociales)… que sí están inscritos.
      Los condicionales llevan lookahead porque su versión «de obra» existe:
      logística DE OBRA, transporte DE MATERIALES, seguridad VIAL. */
const TERMINOS_NO_PERTINENTES = new RegExp(
  "\\b(?:"
  + "aliment(?:o|os|acion|aria|ario|arios)|raciones?|refrigerios?|comida|restaurante|cafeteria|viveres|"
  + "eventos?|ceremonia|celebracion(?:es)?|cumpleanos|festival(?:es)?|carnaval(?:es)?|fiestas?|agasajo|"
  + "logistic[ao]s?(?!\\s+(?:de\\s+)?(?:obra|obras|construccion))|"
  + "impresion|fotocopia\\w*|papeleria|litografia|"
  + "internet|conectividad|fibra\\s+optica|telefonia|plan\\s+de\\s+datos|"
  + "seguridad(?!\\s+(?:vial|industrial\\s+de\\s+obra))|vigilancia|celador(?:es|ia)?|"
  + "transporte(?!\\s+(?:de\\s+)?(?:material|materiales|escombro|escombros|concreto|agregado|agregados|mezcla|asfalto|tuberia|maquinaria|equipos?))|"
  + "traslado(?!\\s+(?:de\\s+)?(?:material|materiales|red(?:es)?|tuberia|poste|postes))|"
  + "capacitacion(?:es)?|formacion|talleres?|seminario|congreso|diplomado|"
  + "publicidad|marketing|mercadeo|comunicaciones|pauta|"
  + "software|sistema\\s+de\\s+informacion|desarrollo\\s+de\\s+aplicaciones|aplicativo|licenciamiento|"
  + "seguros?|poliza(?:s)?|corretaje|"
  + "dotacion(?:es)?|uniformes?|vestuario|calzado|"
  + "canin[oa]s?|semovientes?|ganado|"
  + "aseo|cafeteria|lavanderia|"
  + "honorarios|apoyo\\s+a\\s+la\\s+gestion"
  + ")\\b");

/* 3-bis · Términos BLOQUEANTES: descartan aunque haya verbo de obra.
   La regla normal (término ajeno + CERO verbos de obra) no basta para los
   servicios de telecomunicaciones: «PRESTACIÓN DEL SERVICIO DE INTERNET
   DEDICADO CON INSTALACIÓN Y CANALIZACIÓN DE REDES PARA LAS SEDES» trae verbo
   de obra de sobra y seguía colándose con un 80101600 del RUP. Confirmado en
   el diagnóstico real de producción.

   Esta lista es CORTA a propósito y solo debe crecer con falsos positivos
   CONFIRMADOS: un bloqueante se lleva por delante hasta la obra bien escrita
   que mencione la palabra. Por eso «fibra óptica» exige el contexto de
   servicio (canal/enlace/ancho de banda…) y no descarta el tendido de una red,
   que sí es obra.

   Y POR ESO MISMO «CONECTIVIDAD» TAMBIÉN LO EXIGE (ago 2026). Iba suelta, y en
   Colombia «mejoramiento de vías terciarias para la CONECTIVIDAD RURAL» es
   fraseo de plantilla del corazón del negocio: la palabra descartaba obra vial
   impecable, con su código del RUP, y además EN LA INGESTA —así que esos
   procesos no llegaban a Redis y el embudo de /api/diagnostico ni siquiera
   podía enseñarlos—. Es el falso negativo en su forma más cara: silenciosa e
   inauditable. Ahora la palabra descarta solo con contexto de telecomunicación
   cerca; sin él, decide el resto de la cascada. */
const TERMINOS_BLOQUEANTES = new RegExp(
  "\\b(?:"
  + "servicios?\\s+de\\s+internet|internet\\s+(?:dedicado|banda\\s+ancha|satelital|corporativo|wifi)|"
  + "canal(?:es)?\\s+(?:de\\s+)?dedicado|ancho\\s+de\\s+banda|"
  + CONECTIVIDAD_DE_TELECOM + "|acceso\\s+a\\s+internet|plan(?:es)?\\s+de\\s+datos|"
  + "fibra\\s+optica(?=[\\s\\S]{0,40}\\b(?:canal|enlace|ancho\\s+de\\s+banda|proveedor|servicio))"
  + ")\\b");

/* 3-ter · Objetos GENÉRICOS: el «objeto» es en realidad el número del proceso.
   «CONVOCATORIA PUBLICA», «CONCURSO DE MERITOS INV-CM-001-2026», «INFI
   CM001-2026» no describen nada — no hay forma de juzgarlos y en el
   diagnóstico real llegaban a la pantalla por la ruta de texto.

   PALABRAS_TRAMITE son las que nombran el TRÁMITE, no el trabajo: si al
   quitarlas (junto con los códigos alfanuméricos y los números) no queda
   contenido, el objeto no dice nada. */
const PALABRAS_TRAMITE = new Set(("convocatoria convocatorias publica publico proceso procesos procedimiento "
  + "concurso meritos merito licitacion seleccion abreviada minima cuantia subasta inversa acuerdo marco "
  + "invitacion invitaciones oferta ofertas propuesta propuestas contratacion contrato contratar objeto "
  + "pliego pliegos condiciones terminos referencia estudios previos aviso adenda numero radicado "
  + "municipio municipal departamento departamental alcaldia gobernacion entidad vigencia version "
  + "del de la las los el un una y o en con para por que se su sus al lo no ley decreto articulo").split(/\s+/));

/* Token que parece un código y no una palabra: mezcla letras y dígitos
   («cm001», «inv», «2026», «no.123»). Un objeto hecho solo de estos no habla
   de nada. Se aceptan siglas cortas como código (INFI, INV, CM). */
const TOKEN_CODIGO_RE = /^(?:\d+|[a-z]{1,4}\d[\w-]*|\d[\w-]*|[a-z]{1,4})$/;

/* 3-quater · Procesos de ESTRUCTURACIÓN, no de obra (ago 2026, defecto real).
   «SELECCIONAR UN ACCIONISTA PARA CONSTITUIR UNA SOCIEDAD DE ECONOMÍA MIXTA QUE
   CONSTRUYA…» llegó al primer puesto del panel: trae «construir», trae un
   UNSPSC del RUP y pasa la cascada entera con toda razón — es un proceso REAL
   y competitivo. Lo que no es, es un contrato de obra al que este dueño pueda
   presentarse: lo que se busca es un SOCIO que aporte capital.

   Por eso esta lista NO se aplica a la cascada (no cambia `visibles`, y el
   proceso sigue apareciendo en /api/oportunidades, donde el dueño lo juzga con
   la tarjeta delante): solo decide quién puede encabezar «los 10 más
   atractivos» del panel, que es una recomendación y debe ser conservadora.

   Se compara sobre texto NORMALIZADO (sin tildes). Dos precisiones:
   · «app» va con frontera de palabra — como sigla de Asociación Público-Privada,
     no como fragmento de otra palabra.
   · «concesión DE AGUAS» es un permiso ambiental que las obras de acueducto
     mencionan de pasada; esa sí es obra y no puede caerse por la palabra. */
const TERMINOS_ESTRUCTURACION = new RegExp(
  "\\b(?:"
  + "accionistas?|"
  + "socios?\\s+(?:estrategico|estrategicos|inversionista|inversionistas|privado|privados|gestor|gestores)|"
  + "seleccion\\s+de\\s+socio|vinculacion\\s+de\\s+(?:un\\s+)?(?:socio|inversionista)|"
  + "inversionistas?|capital\\s+privado|"
  + "sociedad(?:es)?\\s+de\\s+economia\\s+mixta|entidad(?:es)?\\s+mixtas?|empresa\\s+mixta|"
  + "alianza(?:s)?\\s+publico[\\s-]*privad\\w*|asociacion(?:es)?\\s+publico[\\s-]*privad\\w*|"
  + "app|"
  + "concesion(?:es)?(?!\\s+de\\s+aguas)"
  + ")\\b");

/* 4 · Tipo de objeto (solo para la etiqueta que ve el dueño en la tarjeta).
      El orden importa: consultoría gana a obra porque «interventoría de la
      construcción» es consultoría, no construcción. */
const TIPO_CONSULTORIA = /\b(?:interventoria|consultoria|supervision\s+tecnica|estudios?\s+y\s+disenos?|diseno(?:s)?\s+(?:tecnico|estructural|hidraulico|electrico|arquitectonico|de\s+obra)|asesoria\s+tecnica|estudios?\s+(?:tecnico|de\s+suelos|geotecnico|hidrologico|de\s+factibilidad))\b/;
const TIPO_INFRAESTRUCTURA = /\b(?:acueducto|alcantarillado|saneamiento|ptar|ptap|planta\s+de\s+tratamiento|red(?:es)?\s+(?:de\s+)?(?:acueducto|alcantarillado|electrica|electricas|hidraulica|sanitaria|gas)|electrificacion|alumbrado\s+publico|subestacion|via(?:s)?\s+(?:terciaria|secundaria|urbana|rural)|carretera|malla\s+vial|puente|box\s*culvert|infraestructura)\b/;

module.exports = {
  norm,
  BLACKLIST_OBJETO, WHITELIST_OBRA,
  INFRAESTRUCTURA,
  VERBOS_DE_OBRA_FUERTES, VERBOS_DE_OBRA_CONDICIONADOS, VERBOS_DE_OBRA_CONDICIONADOS_INV,
  TERMINOS_NO_PERTINENTES, TERMINOS_BLOQUEANTES, TERMINOS_ESTRUCTURACION,
  PALABRAS_TRAMITE, TOKEN_CODIGO_RE,
  TIPO_CONSULTORIA, TIPO_INFRAESTRUCTURA,
};
