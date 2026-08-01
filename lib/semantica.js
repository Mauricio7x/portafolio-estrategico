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

const BLACKLIST_OBJETO = /\b(canin[oa]s?|perr[oa]s?|semovientes?|equin[oa]s?|bovin[oa]s?|porcin[oa]s?|aves\s+de\s+corral|ganado|adiestramiento|alimentaci[oó]n\s+(?:escolar|pae|adulto|infantil|complement)|aliment(?:os|aria|ario)\s+(?:escolar|pae|nutric)|paquetes?\s+alimentari|refrigerios?|v[ií]veres|mercad(?:o|os)\s+(?:campesin|familiar)|almuerz(?:o|os)|desayun(?:o|os)|loncher|vestuario|uniformes?|dotaci[oó]n\s+(?:de\s+)?(?:personal|empleados|escolar|trabajadores|polici|militar)|calzado|prendas\s+(?:de\s+vestir|escolar)|medicament(?:o|os|aria)|f[aá]rmacos?|insumos?\s+m[eé]dic(?:o|os|al)|insumos?\s+hospital|dispositivos?\s+m[eé]dic|odontol[oó]gic|farmac[eé]utic|papeler[ií]a|[uú]tiles\s+de\s+oficina|t[oó]ner|impresi[oó]n\s+(?:de\s+formul|de\s+document)|combustible|gasolina|acpm\b|lubricantes|aceite\s+de\s+motor|adquisici[oó]n\s+de\s+veh[ií]culos|compra\s+de\s+veh[ií]culos|motocicletas?|cuatrimoto|automotor(?:es)?|busetas?|camion(?:es|eta)|armament|munici[oó]n(?:es)?|dotaci[oó]n\s+polici|chaleco\s+antibalas|software|licenci(?:a|as)\s+(?:inform[aá]tic|de\s+software|microsoft|adobe|office|antiviru)|ofim[aá]tica|hosting|dominio\s+web|capacitaci[oó]n|congres(?:o|os)|seminari(?:o|os)|hospedaje|alojamiento|tiquetes?\s+a[eé]reos?|transporte\s+(?:de\s+)?personal|transporte\s+escolar|fumigaci[oó]n|control\s+(?:de\s+)?(?:vectores|plagas|roedores)|aseo\s+(?:y\s+)?(?:cafeter[ií]a|general|integral|institucion)|vigilancia\s+(?:armada|privada|y\s+seguridad)|seguridad\s+privada|seguros?\s+(?:de\s+|generales|todo\s+riesgo|automotor|vida|salud)|p[oó]liza|intermediaci[oó]n\s+de\s+seguros|corretaje|telefon[ií]a|conectividad|plan\s+de\s+datos|publicidad|impresos\s+(?:y|institucion)|pendones?|plotter|jur[ií]dic(?:o|os|a|as)\s+(?:asesor|representac|defensa)|defensa\s+judicial|representaci[oó]n\s+judicial|auditor[ií]a\s+(?:contable|financiera|forense|de\s+cumplimiento|interna|de\s+gesti)|libros|biblio(?:teca|gr[aá]fico)|juguetes?|navide[ñn](?:o|a|os|as)|premios?\s+(?:y\s+est[ií]mul|escolar|deportiv)|bonos?\s+(?:navide|nutric|alimentari|escolar)|becas?|fertilizantes?|abonos?\s+(?:org[aá]nicos|qu[ií]micos)|insumos?\s+agr[ií]cola|agropecuari|fungicidas?|herbicidas?|plaguicidas?|kits?\s+(?:escolar|estudiantil|alimentari|nutric|hi?gi[eé]nic|deportiv|biosanitar)|elementos?\s+de\s+protecci[oó]n\s+(?:personal|biosanitar)|epp\b|interpretaci[oó]n\s+de\s+lenguaje|traducci[oó]n)/i;

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
  + "obra\\s+(?:publica|civil|de)|obras\\s+(?:publicas|civiles|de|complementarias)|obras?\\b|"
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
  TERMINOS_NO_PERTINENTES,
  TIPO_CONSULTORIA, TIPO_INFRAESTRUCTURA,
};
