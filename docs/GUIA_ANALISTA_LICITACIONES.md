# Manual del Analista de Licitaciones

**Contratación Pública Colombiana y SECOP II — Curso completo de formación**
Programa de Formación Profesional | Nivel Analista | Edición 2026

> Este archivo es la **base de conocimiento de dominio** del proyecto *Detekta*.
> **Se lee JUNTO con `docs/COMPLEMENTO_ANALISTA_LICITACIONES.md`**, que corrige dos puntos de
> este manual —**§ V-05** (el efecto de firmar la liquidación sin salvedades, Capítulo 20.3 y
> mandamiento 17) y **§ V-08** (el anticipo, Capítulo 11)— y llena vacíos que el manual no
> cubre: **la corrección vive allí, no aquí**; este texto se conserva tal como se escribió y
> cada pasaje corregido lleva una cita al complemento. Las decisiones técnicas del repositorio
> deben estar informadas por los dos: el destilado accionable vive en `docs/MEMORIA.md`, sección
> «CONOCIMIENTO DE DOMINIO: CONTRATACIÓN PÚBLICA COLOMBIANA» (`node tests/mapa.js dominio` da el
> `sed`), y las derivadas de producto en `CLAUDE.md` § «Filosofía de producto».

---

## Cómo usar este manual

Este manual tiene una regla: **cada concepto se explica dos veces.**

Primero en modo *«Tienes 8 años»* — con caramelos, animales y juegos de recreo.
Después en modo *«Eres el analista»* — con la norma, el artículo y el procedimiento exacto.

Si entiendes la primera versión, la segunda te va a entrar sola. Si te saltas la primera,
la segunda se te va a olvidar en una semana.

### Los íconos

| Ícono | Significa |
|---|---|
| 🍬 | Explicación para niños de 8 años |
| ⚖️ | La norma exacta (artículo, ley, decreto) |
| 🔧 | Cómo se hace en la práctica |
| ☠️ | Error que descalifica |
| 🎖️ | Truco de veterano (legal) |
| 🚩 | Señal de alarma en el terreno |

### Advertencia profesional del autor

Este manual describe el mercado real, **incluyendo sus zonas turbias**. Lo hace para que
sepas reconocerlas y sobrevivirlas, **no para que las practiques**. La razón es fría, no
moral: en contratación pública **el analista es quien firma, quien carga y quien queda
registrado en el expediente**. El dueño de la empresa negocia; el analista queda en el papel.
Cuando algo estalla, el papel es lo que investigan.

### Nota de edición

Las referencias cruzadas de esta edición fueron **corregidas** contra la numeración real de
capítulos (el original remitía, por ejemplo, a «Cap. 20» para la lectura adversarial, que en
realidad se desarrolla en el [Capítulo 18, Palanca 3](#palanca-3--detección-de-pliegos-direccionados-impacto-alto)
y el [Capítulo 19](#capítulo-19-el-mapa-del-terreno-turbio)). El contenido no fue alterado.

---

## Índice

**[Mapa del conocimiento por categoría](#mapa-del-conocimiento-por-categoría)** · **[Tabla maestra del marco jurídico](#tabla-maestra-del-marco-jurídico)** · **[Índice de los 26 trucos](#índice-de-los-26-trucos-de-veterano)** · **[Índice de errores que descalifican](#índice-de-errores-que-descalifican)**

### Parte I — El terreno
1. [¿Qué es una licitación?](#capítulo-1-qué-es-una-licitación)
2. [Quién es quién en la cancha](#capítulo-2-quién-es-quién-en-la-cancha)
3. [Las modalidades de selección](#capítulo-3-las-modalidades-de-selección)
4. [SECOP II — la plataforma, sin romanticismo](#capítulo-4-secop-ii--la-plataforma-sin-romanticismo)
5. [El RUP — tu pasaporte](#capítulo-5-el-rup--tu-pasaporte)
6. [Leer un pliego como profesional](#capítulo-6-leer-un-pliego-como-profesional)

### Parte II — La máquina
7. [El ciclo completo de un proceso](#capítulo-7-el-ciclo-completo-de-un-proceso)
8. [Requisitos habilitantes vs. factores de puntaje](#capítulo-8-requisitos-habilitantes-vs-factores-de-puntaje)
9. [Cómo se arma el puntaje (aquí se gana)](#capítulo-9-cómo-se-arma-el-puntaje-aquí-se-gana)
10. [Consorcios y uniones temporales](#capítulo-10-consorcios-y-uniones-temporales)
11. [El precio: cómo costear de verdad](#capítulo-11-el-precio-cómo-costear-de-verdad)

### Parte III — Después del cierre
12. [El traslado del informe de evaluación](#capítulo-12-el-traslado-del-informe-de-evaluación)
13. [Subsanación: el capítulo que salva contratos](#capítulo-13-subsanación-el-capítulo-que-salva-contratos)
14. [Las observaciones: el escrito quirúrgico](#capítulo-14-las-observaciones-el-escrito-quirúrgico)
15. [La audiencia de adjudicación](#capítulo-15-la-audiencia-de-adjudicación)
16. [Recursos y acciones — con la verdad incómoda](#capítulo-16-recursos-y-acciones--con-la-verdad-incómoda)

### Parte IV — Estrategias para inclinar la balanza
17. [Advertencia de operador, no de moralista](#capítulo-17-advertencia-de-operador-no-de-moralista)
18. [Las siete palancas legales que sí inclinan la balanza](#capítulo-18-las-siete-palancas-legales-que-sí-inclinan-la-balanza)
19. [El mapa del terreno turbio](#capítulo-19-el-mapa-del-terreno-turbio)

### Parte V — Seguimiento post-cierre y ejecución
20. [Ganaste. Ahora empieza el riesgo de verdad](#capítulo-20-ganaste-ahora-empieza-el-riesgo-de-verdad)

### Parte VI — Montar y operar el área
21. [El área de licitaciones que funciona](#capítulo-21-el-área-de-licitaciones-que-funciona)

### Anexos
- [Anexo A — Glosario esencial](#anexo-a--glosario-esencial)
- [Anexo B — Los 20 mandamientos del analista](#anexo-b--los-20-mandamientos-del-analista)

---

## Mapa del conocimiento por categoría

Las dieciséis categorías en que se estructura este cuerpo de conocimiento y dónde vive cada una.

| # | Categoría | Dónde está |
|---|---|---|
| 1 | **Marco jurídico** | [Tabla maestra](#tabla-maestra-del-marco-jurídico) · [Cap. 1](#capítulo-1-qué-es-una-licitación) |
| 2 | **Modalidades de selección** | [Cap. 3](#capítulo-3-las-modalidades-de-selección) |
| 3 | **Habilitantes vs. puntaje** (qué es y qué no es subsanable) | [Cap. 8](#capítulo-8-requisitos-habilitantes-vs-factores-de-puntaje) · [Cap. 13](#capítulo-13-subsanación-el-capítulo-que-salva-contratos) |
| 4 | **Estructura de costos** (APU, AIU, ocultos, 5 %, estampillas, flujo de caja) | [Cap. 11](#capítulo-11-el-precio-cómo-costear-de-verdad) |
| 5 | **Ciclo completo del proceso** (14 etapas) | [Cap. 7](#capítulo-7-el-ciclo-completo-de-un-proceso) |
| 6 | **Estrategias de oferta** (precio bajo incertidumbre, media, valor esperado) | [Cap. 9 §9.1](#91-el-factor-económico-y-la-trampa-de-la-media) |
| 7 | **Subsanación y observaciones** | [Cap. 13](#capítulo-13-subsanación-el-capítulo-que-salva-contratos) · [Cap. 14](#capítulo-14-las-observaciones-el-escrito-quirúrgico) |
| 8 | **Consorcios y uniones temporales** | [Cap. 10](#capítulo-10-consorcios-y-uniones-temporales) |
| 9 | **Pliegos direccionados** (12 señales) | [Cap. 18, Palanca 3](#palanca-3--detección-de-pliegos-direccionados-impacto-alto) |
| 10 | **Terreno turbio** (colusión, captura, fuga) | [Cap. 19](#capítulo-19-el-mapa-del-terreno-turbio) |
| 11 | **Ejecución post-adjudicación** | [Cap. 20](#capítulo-20-ganaste-ahora-empieza-el-riesgo-de-verdad) |
| 12 | **Operación del área** (roles, KPIs, biblioteca, postmortem) | [Cap. 21](#capítulo-21-el-área-de-licitaciones-que-funciona) |
| 13 | **Trucos de veterano** (26 numerados + los no numerados) | [Índice de trucos](#índice-de-los-26-trucos-de-veterano) |
| 14 | **Errores que descalifican** | [Índice de errores](#índice-de-errores-que-descalifican) |
| 15 | **Glosario** | [Anexo A](#anexo-a--glosario-esencial) |
| 16 | **Mandamientos del analista** | [Anexo B](#anexo-b--los-20-mandamientos-del-analista) |

---

## Tabla maestra del marco jurídico

Todo lo normativo citado en el manual, en un solo lugar.

| Norma | Materia | Dónde se usa |
|---|---|---|
| **Ley 80 de 1993** | Estatuto General de Contratación de la Administración Pública | Transversal |
| Ley 80/1993, arts. 23–26 | Principios: transparencia, economía, responsabilidad, selección objetiva | [Cap. 1](#capítulo-1-qué-es-una-licitación) |
| Ley 80/1993, art. 7 | Consorcios y uniones temporales | [Cap. 10](#capítulo-10-consorcios-y-uniones-temporales) |
| Ley 80/1993, art. 8 | Inhabilidades e incompatibilidades | [Cap. 17](#capítulo-17-advertencia-de-operador-no-de-moralista) |
| Ley 80/1993, art. 24 | Transparencia (argumento de observación) | [Cap. 14](#capítulo-14-las-observaciones-el-escrito-quirúrgico) |
| Ley 80/1993, art. 30 num. 11 | Recurso contra la declaratoria de desierta | [Cap. 16 §16.2](#162-dónde-sí-procede-el-recurso-de-reposición) |
| Ley 80/1993, art. 40 par. | Límite de adición: 50 % del valor inicial en SMMLV | [Cap. 20 §20.2](#202-modificaciones-contractuales) |
| Ley 80/1993, art. 77 | Actos administrativos contractuales y recursos | [Cap. 16 §16.2](#162-dónde-sí-procede-el-recurso-de-reposición) |
| **Ley 1150 de 2007** | Modalidades de selección, subsanabilidad, publicidad | Transversal |
| Ley 1150/2007, art. 2 | Las modalidades; menor cuantía en SMMLV del presupuesto de la entidad | [Cap. 3](#capítulo-3-las-modalidades-de-selección) |
| Ley 1150/2007, art. 5 | **Selección objetiva**; habilitantes no dan puntaje | [Cap. 1](#capítulo-1-qué-es-una-licitación) · [Cap. 8](#capítulo-8-requisitos-habilitantes-vs-factores-de-puntaje) |
| Ley 1150/2007, art. 5 par. 1 | Subsanabilidad (modificado por Ley 1882/2018, art. 5) | [Cap. 13](#capítulo-13-subsanación-el-capítulo-que-salva-contratos) |
| Ley 1150/2007, art. 9 | Traslado del informe; audiencia; **adjudicación irrevocable, sin recurso** | [Cap. 12](#capítulo-12-el-traslado-del-informe-de-evaluación) · [Cap. 15](#capítulo-15-la-audiencia-de-adjudicación) · [Cap. 16](#capítulo-16-recursos-y-acciones--con-la-verdad-incómoda) |
| Ley 1150/2007, art. 11 | Liquidación: 4 meses de común acuerdo + 2 unilateral | [Cap. 20 §20.3](#203-la-liquidación) |
| **Ley 1474 de 2011** | Estatuto Anticorrupción | Transversal |
| Ley 1474/2011, art. 86 | Recurso contra actos sancionatorios contractuales | [Cap. 16 §16.2](#162-dónde-sí-procede-el-recurso-de-reposición) |
| Ley 1474/2011, art. 91 | Anticipo en patrimonio autónomo (fiducia) | [Cap. 11](#capítulo-11-el-precio-cómo-costear-de-verdad) |
| **Ley 1882 de 2018** | Pliegos tipo, reglas de subsanación, garantía de seriedad | [Cap. 5](#capítulo-5-el-rup--tu-pasaporte) · [Cap. 13](#capítulo-13-subsanación-el-capítulo-que-salva-contratos) |
| **Ley 2022 de 2020** | Obligatoriedad de los documentos tipo | [Cap. 14](#capítulo-14-las-observaciones-el-escrito-quirúrgico) · [Cap. 18](#palanca-3--detección-de-pliegos-direccionados-impacto-alto) |
| **Ley 2069 de 2020, art. 35** | Factores de desempate (13 criterios sucesivos) | [Cap. 9 §9.3](#93-factores-de-desempate-ley-2069-de-2020-art-35) |
| **Ley 2195 de 2022** | Transparencia, prevención de corrupción, **beneficiario final** | [Cap. 17](#capítulo-17-advertencia-de-operador-no-de-moralista) |
| **Decreto 1082 de 2015** | Decreto Único Reglamentario — el de todos los días | Transversal |
| D. 1082, art. 2.2.1.1.1.4.1–4.4 | Plan Anual de Adquisiciones (PAA) | [Cap. 7](#capítulo-7-el-ciclo-completo-de-un-proceso) |
| D. 1082, art. 2.2.1.1.1.5 | Registro Único de Proponentes (RUP) | [Cap. 5](#capítulo-5-el-rup--tu-pasaporte) |
| D. 1082, art. 2.2.1.1.1.6.1 | Análisis del sector / estudio de mercado | [Cap. 18, Palanca 2](#palanca-2--interlocución-legítima-con-la-entidad-impacto-alto) |
| D. 1082, art. 2.2.1.1.2.2.3 | Comité evaluador (asesor, no decisorio) | [Cap. 2](#capítulo-2-quién-es-quién-en-la-cancha) |
| D. 1082, art. 2.2.1.1.2.2.4 | Traslado del informe; requerimiento por **precio artificialmente bajo** | [Cap. 9 §9.1](#91-el-factor-económico-y-la-trampa-de-la-media) · [Cap. 12](#capítulo-12-el-traslado-del-informe-de-evaluación) |
| **Ley 1437 de 2011 (CPACA)** | Recursos y medios de control | [Cap. 16](#capítulo-16-recursos-y-acciones--con-la-verdad-incómoda) |
| CPACA, arts. 74 y ss. / 76 | Recursos; término de 10 días hábiles | [Cap. 16 §16.2](#162-dónde-sí-procede-el-recurso-de-reposición) |
| CPACA, art. 138 | Nulidad y restablecimiento del derecho | [Cap. 16 §16.1](#161-contra-el-acto-de-adjudicación-no-procede-recurso) |
| CPACA, art. 141 | Controversias contractuales | [Cap. 16 §16.1](#161-contra-el-acto-de-adjudicación-no-procede-recurso) |
| CPACA, art. 229 y ss. | Medida cautelar de suspensión provisional | [Cap. 16 §16.1](#161-contra-el-acto-de-adjudicación-no-procede-recurso) |
| **Ley 816 de 2003** | Apoyo a la industria nacional | [Cap. 9 §9.2](#92-apoyo-a-la-industria-nacional-ley-816-de-2003) |
| **Ley 361 de 1997** | Personas en condición de discapacidad (factor social) | [Cap. 9](#capítulo-9-cómo-se-arma-el-puntaje-aquí-se-gana) |
| **Ley 418 de 1997** y prórrogas | **Contribución especial de obra pública, 5 %** | [Cap. 11](#capítulo-11-el-precio-cómo-costear-de-verdad) |
| **Ley 489 de 1998, arts. 95–96** | Convenios interadministrativos y de asociación | *(contexto: no son licitaciones)* |
| **Código Penal, art. 410A** | Acuerdos restrictivos de la competencia en contratación | [Cap. 17](#capítulo-17-advertencia-de-operador-no-de-moralista) · [Cap. 19](#capítulo-19-el-mapa-del-terreno-turbio) |
| Código Penal, arts. 405–407 | Cohecho | [Cap. 19](#capítulo-19-el-mapa-del-terreno-turbio) |
| Código Penal, art. 409 | Interés indebido en la celebración de contratos | [Cap. 19](#capítulo-19-el-mapa-del-terreno-turbio) |
| Código Penal, art. 410 | Contrato sin cumplimiento de requisitos legales | [Cap. 19](#capítulo-19-el-mapa-del-terreno-turbio) |
| Código Penal, art. 418 | Utilización de asunto sometido a secreto o reserva | [Cap. 19](#capítulo-19-el-mapa-del-terreno-turbio) |
| **Guía CCE-EICP-GI-22** (Colombia Compra Eficiente) | Capacidad residual (CRP) | *(base del cálculo de K del proyecto)* |

---

# PARTE I — EL TERRENO

## Capítulo 1. ¿Qué es una licitación?

🍬 **Tienes 8 años.**
Imagina que la profesora tiene 100.000 pesos del salón para comprar el refrigerio de la fiesta
de fin de año. Ella no puede simplemente comprárselo a su primo. La regla del colegio dice que
tiene que:

1. Escribir en la cartelera exactamente qué quiere: «50 refrigerios, con jugo, sin maní,
   entregados el viernes a las 10 a.m.»
2. Dejar que cualquier papá que venda refrigerios se anote.
3. Recibir todos los sobres cerrados el mismo día a la misma hora.
4. Abrirlos delante de todos.
5. Darle el trabajo al que cumpla las reglas y ofrezca lo mejor.

Eso es una licitación. El Estado tiene la plata de todos, entonces no puede comprarle a quien
quiera. Tiene que hacer un concurso público.

Y aquí está lo primero que casi nadie entiende: **el concurso no lo gana el mejor. Lo gana el
que cumple todas las reglas Y ofrece lo mejor.** Si tu refrigerio es delicioso pero el sobre lo
entregaste 3 minutos tarde, perdiste. No importa qué tan bueno seas. Perdiste.

⚖️ **La norma.**
La licitación es el procedimiento reglado mediante el cual una entidad estatal formula
públicamente una convocatoria para que, en igualdad de oportunidades, los interesados presenten
ofertas y se seleccione entre ellas la más favorable.

- **Ley 80 de 1993** — Estatuto General de Contratación de la Administración Pública.
- **Ley 1150 de 2007** — modalidades de selección, subsanabilidad, publicidad.
- **Ley 1474 de 2011** — Estatuto Anticorrupción.
- **Ley 1882 de 2018** — pliegos tipo, reglas de subsanación, garantía de seriedad.
- **Ley 2022 de 2020** — obligatoriedad de los documentos tipo.
- **Ley 2069 de 2020, art. 35** — factores de desempate.
- **Ley 2195 de 2022** — transparencia, prevención de corrupción, beneficiario final.
- **Decreto 1082 de 2015** — decreto único reglamentario. Es el que usarás todos los días.
- **CPACA (Ley 1437 de 2011)** — recursos y medios de control.

**Los cuatro principios que rigen todo** (Ley 80, arts. 23–26):

| Principio | Qué significa en la práctica |
|---|---|
| **Transparencia** | Todo se publica, todo queda en el expediente |
| **Economía** | No se piden requisitos inútiles ni se dilata el trámite |
| **Responsabilidad** | El que firma responde con su patrimonio y su libertad |
| **Selección objetiva** (Ley 1150, art. 5) | Se escoge por factores objetivos, no por afecto, interés o motivación subjetiva |

🎖️ **Truco de veterano #1 — La selección objetiva es tu arma más subestimada.**
Cuando una entidad hace algo raro, no reclames «esto es injusto». Reclama:

> «Esta exigencia vulnera el deber de selección objetiva previsto en el artículo 5 de la Ley 1150
> de 2007, en tanto no guarda relación de proporcionalidad con el objeto contractual y restringe
> la pluralidad de oferentes.»

La primera frase la ignoran. La segunda va al expediente y les da miedo, porque es exactamente
lo que la Contraloría busca en una auditoría.
→ Se desarrolla en el [Capítulo 14](#capítulo-14-las-observaciones-el-escrito-quirúrgico).

---

## Capítulo 2. Quién es quién en la cancha

🍬 **Tienes 8 años.** En el concurso del refrigerio hay varios personajes. Necesitas saber quién
es cada uno, igual que en un videojuego necesitas saber quién es jefe, quién es aliado y quién
solo camina por ahí.

| Personaje | En el colegio | En la vida real | Qué le importa |
|---|---|---|---|
| El que tiene la plata | La rectora | **Ordenador del gasto** (alcalde, rector, gerente) | Que no lo investiguen |
| El que escribe las reglas | La profesora | **Área técnica / estructurador** | Que le llegue algo que sí sirva |
| Los que revisan los sobres | Tres profesores | **Comité evaluador** | Terminar sin que los demanden |
| Los que compiten | Los papás | **Oferentes / proponentes** | Ganar |
| El que vigila | El coordinador | **Control interno, Contraloría, Procuraduría** | Encontrar el error |
| Los curiosos | Los otros niños | **Veedurías ciudadanas** | Que todo sea claro |
| El árbitro de la cancha | — | **SIC** (competencia) y **Fiscalía** (delitos) | Carteles y sobornos |

⚖️ **Detalle crítico: el comité evaluador.**
El comité evaluador (D. 1082, art. 2.2.1.1.2.2.3) es **asesor, no decisorio**. Recomienda; el
ordenador del gasto adjudica. Pero el comité responde **disciplinaria, fiscal y penalmente** por
sus recomendaciones, y **el ordenador del gasto que se aparta de la recomendación debe motivar
por escrito por qué**.

🎖️ **Truco de veterano #2.**
Esa última frase es oro puro. Si el informe de evaluación te pone primero y la adjudicación se la
dan a otro, la entidad está **obligada a justificar por escrito** el apartamiento. Si no lo hizo o
lo hizo mal, tienes un caso sólido. Pide el expediente completo. Lo mismo si el comité cambió de
posición entre el informe preliminar y el definitivo sin explicar qué documento nuevo lo motivó.
→ Es también una señal de [captura del evaluador](#c-la-captura-del-evaluador).

🚩 **Señal de alarma.** Comité evaluador conformado por contratistas de prestación de servicios
que rotan entre entidades del mismo sector. No es ilegal por sí mismo, pero es el perfil que
aparece en el 80 % de los procesos amañados que terminan en noticia. Anótalo y observa cómo se
comporta el proceso.

---

## Capítulo 3. Las modalidades de selección

🍬 **Tienes 8 años.** No todas las compras se hacen igual, así como no todos los juegos del
recreo tienen las mismas reglas.

- ¿Vas a comprar 500 pupitres? Concurso grande, con público. → **Licitación pública**
- ¿Vas a comprar 20 pupitres? Concurso pequeño y rápido. → **Selección abreviada / menor cuantía**
- ¿Vas a comprar borradores, todos iguales, y solo importa el precio? El que grite el precio más
  bajo, en vivo. → **Subasta inversa**
- ¿Necesitas un arquitecto que diseñe el salón? Ahí no gana el más barato, gana el que sabe más.
  → **Concurso de méritos**
- ¿Vas a comprar un lápiz de 2.000 pesos? Pides tres precios y listo. → **Mínima cuantía**
- ¿Solo hay una persona en el mundo que hace eso? Se lo pides directo. → **Contratación directa**

⚖️ **Tabla operativa** — Ley 1150 art. 2 y Decreto 1082.

| Modalidad | Cuándo aplica | Cómo se gana |
|---|---|---|
| **Licitación pública** | Regla general. Mayor cuantía. Obra pública siempre que supere menor cuantía | Habilitación + puntaje (técnico + económico + industria nacional) |
| **Selección abreviada — menor cuantía** | Valor ≤ menor cuantía según presupuesto de la entidad | Manifestación de interés + sorteo (si > 10) + puntaje |
| **Selección abreviada — subasta inversa** | Bienes/servicios de características técnicas uniformes | Habilitación → lances de precio en vivo. Gana el precio más bajo |
| **Selección abreviada — Acuerdo Marco / TVEC** | Bienes en catálogo de Colombia Compra Eficiente | Estar en el Acuerdo Marco. Se compite por evento de cotización |
| **Concurso de méritos** | Consultoría, interventoría, diseños, estudios | **El precio NO da puntaje.** Se evalúa experiencia y equipo. Se abre el sobre económico solo del primero |
| **Mínima cuantía** | ≤ 10 % de la menor cuantía | Invitación pública. Gana el precio más bajo que cumpla |
| **Contratación directa** | Urgencia manifiesta, proveedor exclusivo, prestación de servicios profesionales, arrendamiento, etc. | No hay concurso. Se acredita la causal |

☠️ **Error que descalifica.** Presentarse a un **concurso de méritos** con la mentalidad de
licitación y bajar el precio para «ganar puntos». En concurso de méritos el precio no da puntos.
Bajaste tu margen a cambio de nada, y si tu propuesta económica **excede el presupuesto oficial**,
te rechazan igual.

🎖️ **Truco de veterano #3 — La cuantía es una decisión política, no técnica.**
La menor cuantía se calcula sobre el **presupuesto anual de la entidad expresado en SMMLV**
(Ley 1150 art. 2 num. 2). Una entidad grande tiene una menor cuantía enorme; una alcaldía de
sexta categoría la tiene diminuta.

**Consecuencia práctica:** el mismo contrato de $800 millones es **licitación pública** en un
municipio pequeño (proceso largo, competido, público) y **selección abreviada** en un ministerio
(proceso corto, con sorteo, menos competencia). Cuando estés eligiendo dónde competir, esto
cambia por completo tus probabilidades. Calcula la menor cuantía de tus entidades objetivo **una
vez al año, en enero**, y guárdala en una tabla.
→ Se conecta con la [estrategia del nicho incómodo](#palanca-4--ingeniería-de-la-propia-oferta-impacto-alto).

---

## Capítulo 4. SECOP II — la plataforma, sin romanticismo

🍬 **Tienes 8 años.** SECOP II es como un videojuego online donde todos los concursos del país
están publicados. Tú tienes tu personaje (tu empresa), tu inventario (tus documentos) y tu reloj.
Y como todo videojuego online: el servidor se cae justo cuando más gente entra.

⚖️ **Lo que tienes que saber:**

| Plataforma | Qué es |
|---|---|
| **SECOP I** | Portal de **publicidad**. Solo se publican documentos. Aún lo usan entidades de régimen especial |
| **SECOP II** | Plataforma **transaccional**. Todo el proceso ocurre ahí: se oferta, se evalúa, se adjudica, se ejecuta el contrato. Es la regla general |
| **TVEC** (Tienda Virtual del Estado Colombiano) | Para Acuerdos Marco de Precios y grandes almacenes |

🔧 **Configuración inicial (hazlo una vez, bien):**

1. Registro de la entidad/proveedor con NIT y documentos de existencia.
2. **Usuarios y roles.** Crea al menos tres: un administrador, un «creador de ofertas» y un
   usuario con permiso de envío.
3. **Verificación del correo.** El correo registrado en SECOP II es el canal oficial de
   notificación. Si es el correo personal de alguien que se fue de la empresa, **no te vas a
   enterar de tu propia adjudicación**.
4. Vincula el RUP.
5. **Configura alertas por códigos UNSPSC.** Esto es gratis y casi nadie lo hace bien.

### Los 9 errores que descalifican en SECOP II

☠️ **Memorízalos. Valen más que tres capítulos.**

| # | Error | Por qué mata |
|---|---|---|
| 1 | **Guardar la oferta y no darle «Presentar»** | Una oferta en estado «En creación» al cierre **no existe**. El sistema no la ve. Es el error #1 del país |
| 2 | **Cargar el archivo en la sección equivocada** | Precio en la carpeta técnica = revelación anticipada |
| 3 | **Superar el límite de peso por archivo** sin verificar | El archivo no sube y te enteras tarde |
| 4 | **Subir un PDF corrupto o protegido con contraseña** | El evaluador no puede abrirlo |
| 5 | **Firmar con certificado digital vencido** | Firma inválida |
| 6 | **No responder un «mensaje» de la entidad dentro de la plataforma** | Los correos externos **no cuentan** |
| 7 | **Dejar campos del formulario en blanco porque «ya está en el PDF»** | **El formulario prevalece** |
| 8 | **Cargar la oferta económica en un formato distinto al exigido** | Causal de rechazo |
| 9 | **Empezar a cargar el día del cierre** | Ver truco #4 |

🎖️ **Truco de veterano #4 — La regla de las 24 horas.**
**Carga y presenta tu oferta el día anterior al cierre.** SECOP II permite retirarla y modificarla
las veces que quieras hasta la hora exacta del cierre. Presentar temprano no revela nada a nadie y
te da el margen para arreglar el desastre.

La estadística del gremio: la mayoría de las ofertas que no entran, no entran por internet, luz o
servidor congestionado en la última hora. **El cierre a las 3:00 p.m. es la hora en que más
ofertas mueren en Colombia.**

🎖️ **Truco de veterano #5 — Pantallazos con reloj.**
Cuando cargues, toma captura de pantalla mostrando la hora del sistema y el estado «Presentada».
Si SECOP II falla, la constancia de la falla del sistema es lo único que sostiene una solicitud de
habilitación posterior. **Sin evidencia, tu palabra no vale nada ante el expediente.**

---

## Capítulo 5. El RUP — tu pasaporte

🍬 **Tienes 8 años.** El RUP es como tu carné de vacunas del colegio, pero para empresas. Dice:
cuántos años llevas, qué has hecho, qué tan grande eres y si debes plata. Sin el carné no entras a
la fiesta. Y no puedes llenarlo el día de la fiesta: tiene que estar **en firme antes**.

⚖️ **Registro Único de Proponentes** — Cámara de Comercio. D. 1082, art. 2.2.1.1.1.5.
Contiene tres bloques:

**1. Clasificación (códigos UNSPSC).** Es el «idioma» con el que el Estado nombra lo que compra.
Se usa a nivel de **tercer nivel (clase)**. Si el pliego pide el código `72141100` y tú no lo
tienes inscrito, estás fuera y **eso no siempre es subsanable**.

**2. Experiencia.** Contratos ejecutados, con: código UNSPSC, **valor en SMMLV del año de
terminación**, y contratante. Aquí está la trampa: el valor se expresa en salarios mínimos **del
año en que terminó el contrato**, no en pesos de hoy.

**3. Capacidad financiera y organizacional** — tomada de tus estados financieros:

| Indicador | Fórmula | Qué mide |
|---|---|---|
| Índice de liquidez | Activo corriente / Pasivo corriente | Si puedes pagar lo de este año |
| Índice de endeudamiento | Pasivo total / Activo total | Cuánto de la empresa es prestado |
| Razón de cobertura de intereses | Utilidad operacional / Gastos de intereses | Si aguantas la deuda |
| Capital de trabajo | Activo corriente − Pasivo corriente | Músculo para arrancar |
| Rentabilidad del patrimonio | Utilidad operacional / Patrimonio | Qué tan bien usas lo tuyo |
| Rentabilidad del activo | Utilidad operacional / Activo total | Qué tan bien usas todo |

🎖️ **Truco de veterano #6 — El RUP se planea en octubre, no en marzo.**
Los indicadores salen de tus estados financieros **a 31 de diciembre**. Eso significa que en
octubre y noviembre todavía puedes actuar **legalmente** sobre ellos: capitalizar utilidades en
lugar de repartirlas, reclasificar deuda de corto a largo plazo negociando con el banco, cobrar
cartera vencida, no adquirir pasivo corriente en diciembre. Esto es contabilidad legítima, no
maquillaje.

La **renovación del RUP vence el quinto día hábil de abril** de cada año. Si dejas vencer el RUP,
tu empresa desaparece del mercado hasta que lo renueves — y hay procesos que cierran en abril.

🎖️ **Truco de veterano #7 — Inscribe códigos de más.**
Inscribir códigos UNSPSC adicionales en el RUP no cuesta prácticamente nada y no te obliga a nada.
**Inscribe todos los códigos adyacentes a tu negocio real.** El día que salga el proceso perfecto y
pida un código raro, o lo tienes o pierdes tres semanas. Revisa el histórico de SECOP: mira qué
códigos usaron tus entidades objetivo en los últimos 3 años y asegúrate de tenerlos todos.

☠️ **Error que descalifica.** Presentar un certificado de RUP expedido **después del cierre** con
información **inscrita después del cierre**. La Ley 1882 de 2018 es tajante: no se pueden acreditar
circunstancias ocurridas con posterioridad al cierre. **Puedes reexpedir el certificado; no puedes
inscribir experiencia nueva.**

---

## Capítulo 6. Leer un pliego como profesional

🍬 **Tienes 8 años.** Un pliego es la lista de reglas del juego. La mayoría de los niños la lee por
encima y sale corriendo a jugar. El que gana es el que se la leyó completa y descubrió que en el
punto 14 decía «quien traiga sombrero rojo gana 5 puntos extra».

🔧 **El método de las 5 lecturas.** No leas un pliego una vez. Léelo **cinco veces**, buscando
cosas distintas.

**Lectura 1 — ¿Voy o no voy? (15 minutos, con cronómetro).**
Busca solo cinco datos y anótalos en una ficha:
- Objeto y presupuesto oficial
- Fecha y hora de cierre
- Experiencia mínima exigida
- Indicadores financieros exigidos
- Si exige documentos tipo

Si fallas en cualquiera de los tres últimos y no puedes formar consorcio, **cierra el archivo y
sigue**. Aquí se pierde el tiempo más caro del país: analistas trabajando tres días en un proceso
al que nunca iban a poder entrar.

**Lectura 2 — Los requisitos habilitantes** (la lista de «pasa / no pasa»).
Construye una tabla con tres columnas: **Requisito | Documento que lo prueba | ¿Lo tengo hoy?**
Este documento es tu checklist de armado. Nada más.
→ [Capítulo 8](#capítulo-8-requisitos-habilitantes-vs-factores-de-puntaje).

**Lectura 3 — El puntaje** (aquí se gana).
Todo lo que da puntos, con su **fórmula exacta y su tope**. Si el pliego da 100 puntos, tienes que
saber de dónde sale cada uno. *Un analista que no sabe recitar la distribución de puntaje del
proceso al que se presentó no es un analista.*
→ [Capítulo 9](#capítulo-9-cómo-se-arma-el-puntaje-aquí-se-gana).

**Lectura 4 — Las causales de rechazo.**
Es la sección más importante y la que menos se lee. Suele estar al final, en letra pequeña, con
quince viñetas. **Cada viñeta es una forma de perder.** Imprímela. Pégala al lado del monitor.

**Lectura 5 — Lectura adversarial: «¿para quién está escrito esto?»**
Esta es la lectura de veterano.
→ [Capítulo 18, Palanca 3](#palanca-3--detección-de-pliegos-direccionados-impacto-alto) y
[Capítulo 19](#capítulo-19-el-mapa-del-terreno-turbio).

🎖️ **Truco de veterano #8 — El diccionario del pliego.**
Los pliegos **definen palabras**: «contrato similar», «obra de edificación», «experiencia
específica», «personal clave». Esas definiciones están puestas ahí a propósito y son el terreno
donde se pelea todo. Antes de asumir que tu experiencia sirve, ve a la sección de definiciones y
compárala **palabra por palabra** con lo que dice tu certificación. *La diferencia entre
«construcción» y «adecuación» ha decidido contratos de miles de millones en Colombia.*

---

# PARTE II — LA MÁQUINA

## Capítulo 7. El ciclo completo de un proceso

🍬 **Tienes 8 años.** Un proceso de licitación es como el ciclo de una mariposa. Tiene etapas
fijas y no se puede saltar ninguna. Y lo más importante: **cada etapa tiene una puerta que se
cierra. Cuando se cierra, no se vuelve a abrir.**

⚖️ **Las 14 etapas:**

| # | Etapa | Qué pasa | Tu jugada |
|---|---|---|---|
| 1 | **Plan Anual de Adquisiciones (PAA)** | La entidad publica qué va a comprar todo el año | 🎖️ Aquí empieza tu **ventaja de 6 meses** |
| 2 | **Estudios previos y del sector** | Se justifica la necesidad y se sondea el mercado | 🎖️ Puedes participar respondiendo el estudio de mercado |
| 3 | **Aviso de convocatoria** | Anuncio formal | Alertas UNSPSC |
| 4 | **Proyecto de pliego** | Borrador público, mínimo 10 días hábiles en licitación | 🎖️ Tu **única ventana legal** para mover el terreno |
| 5 | **Observaciones al proyecto** | Cualquiera puede pedir cambios | Escrito quirúrgico → [Cap. 14](#141-observaciones-al-proyecto-de-pliego--la-más-poderosa-y-la-más-desaprovechada) |
| 6 | **Respuestas y pliego definitivo** | La entidad decide qué acepta | Verificar **QUÉ cambió** realmente |
| 7 | **Apertura + audiencia de riesgos** | Se abre el proceso; se asignan riesgos | Asistir. Es pública y se graba |
| 8 | **Adendas** | Modificaciones al pliego | **Releer TODO.** Las adendas cambian fechas |
| 9 | **Cierre** | Hora exacta. Se abren las ofertas | Cargaste ayer, ¿cierto? → [truco #4](#capítulo-4-secop-ii--la-plataforma-sin-romanticismo) |
| 10 | **Evaluación** | El comité revisa | Silencio. Responde solo lo que te pregunten |
| 11 | **Traslado del informe** | Se publica el informe. 5 días hábiles en licitación | 🎖️ **La etapa donde se gana o se pierde de verdad** → [Cap. 12](#capítulo-12-el-traslado-del-informe-de-evaluación) |
| 12 | **Subsanación y observaciones** | Arreglas lo tuyo, objetas lo ajeno | [Cap. 13](#capítulo-13-subsanación-el-capítulo-que-salva-contratos) y [Cap. 14](#capítulo-14-las-observaciones-el-escrito-quirúrgico) |
| 13 | **Audiencia de adjudicación** | Se adjudica en público | [Cap. 15](#capítulo-15-la-audiencia-de-adjudicación) |
| 14 | **Contrato, ejecución, liquidación** | El trabajo real | [Parte V](#capítulo-20-ganaste-ahora-empieza-el-riesgo-de-verdad) |

🎖️ **Truco de veterano #9 — Vive en el PAA.**
El Plan Anual de Adquisiciones debe publicarse **a más tardar el 31 de enero** de cada año
(D. 1082, art. 2.2.1.1.1.4.1–4.4) y se actualiza al menos una vez al año. Está en SECOP II, es
público y contiene: **el objeto, el valor estimado, el mes previsto de apertura y la modalidad.**

Esto significa que **en febrero tú ya sabes qué va a licitar tu entidad objetivo en agosto**.
Tienes seis meses para: inscribir el código UNSPSC que falta, conseguir la certificación de
experiencia que te falta, arreglar el indicador financiero, cerrar el acuerdo de consorcio, y
aprobar el cupo de póliza con la aseguradora.

Tu competencia se entera el día del aviso de convocatoria y tiene 20 días. **Tú tuviste seis
meses.** Esa es la diferencia entre un analista y alguien que llena formularios. No hay contacto,
no hay información privilegiada, no hay favor de nadie: **es un documento público que casi nadie
lee.**

🔧 **Rutina obligatoria de febrero:** descarga el PAA de tus 20 entidades objetivo. Filtra por tus
códigos UNSPSC. Arma un calendario anual. *Ese calendario es el activo más valioso de tu área.*

---

## Capítulo 8. Requisitos habilitantes vs. factores de puntaje

🍬 **Tienes 8 años.** Para entrar al parque de diversiones hay dos cosas distintas:

- **La estatura mínima** — o mides 1.20 o no te dejan subir. No importa si mides 1.19 y eres muy
  simpático. No subes. Eso son los **requisitos habilitantes**.
- **El concurso de disfraces** — una vez adentro, compites por premios. Ahí sí gana el mejor. Eso
  son los **factores de puntaje**.

**La regla de oro:** primero pasan todos por la estatura. Después compite el que pasó. Un
habilitante **no te da puntos por tenerlo de más**. Si piden 5 años de experiencia y tú tienes 30,
sacas exactamente los mismos **cero puntos** que el que tiene 5 años y un día.

⚖️ **La distinción jurídica es la más importante del manual:**

| | Requisitos habilitantes | Factores de puntaje |
|---|---|---|
| **Qué son** | Capacidad jurídica, financiera, organizacional y experiencia | Calidad, precio, industria nacional, sociales |
| **Efecto** | Habilita o rechaza. **No otorgan puntaje** (Ley 1150, art. 5 num. 1) | Ordenan a los habilitados |
| **¿Subsanables?** | **SÍ**, hasta el término de traslado del informe | **NO. Jamás.** |
| **Cuándo se verifican** | A la fecha de cierre | A la fecha de cierre |

☠️ **La consecuencia práctica que arruina carreras.**
Si te falta un documento **que da puntos**, no lo puedes subsanar. Nunca. Ni con la mejor carta,
ni con el mejor abogado. Si te falta un documento **habilitante**, casi siempre lo puedes subsanar
y sigues vivo.

Por eso el armado de la carpeta se hace en **dos pilas físicas distintas**, con dos niveles de
paranoia distintos:

- **Pila A (puntaje):** revisión **triple**, por tres personas diferentes, con lista de chequeo
  firmada. Un error aquí es **mortal**.
- **Pila B (habilitante):** revisión normal. Un error aquí es molesto pero **recuperable**.

🎖️ **Truco de veterano #10.** Cuando llegue el pliego, lo primero que haces es **imprimir la tabla
de puntaje y colgarla en la pared**. Todo el equipo debe poder recitarla. *He visto empresas perder
por 0.5 puntos que estaban regalados en un certificado de cinco líneas que nadie leyó porque estaba
enterrado en el numeral 4.3.7.2.*

---

## Capítulo 9. Cómo se arma el puntaje (aquí se gana)

🍬 **Tienes 8 años.** El puntaje es como el marcador de un videojuego. Normalmente son 100 puntos
y se reparten así: unos por hacerlo barato, unos por hacerlo bien, y unos por ser del barrio.

⚖️ **Estructura típica en licitación de obra con documentos tipo:**

| Factor | Puntos típicos | Base legal |
|---|---|---|
| **Oferta económica** | 60–80 | Documentos tipo CCE |
| **Calidad / técnico** | 10–20 | Pliego |
| **Apoyo a la industria nacional** | 10–20 | Ley 816 de 2003 |
| **Factores sociales** (MIPYME, discapacidad, etc.) | 1–10 | Ley 2069/2020, Ley 361/1997 |

### 9.1 El factor económico y la trampa de la media

🍬 **Tienes 8 años.** Aquí está lo más raro y lo más importante: **muchas veces NO gana el más
barato. Gana el que quede más cerca del promedio.**

Imagina que la profesora dice: «el que adivine el número más cercano al promedio de todos los
números que digan sus compañeros, gana». Ya no se trata de decir el número más pequeño. Se trata de
**adivinar qué van a decir los demás**.

⚖️ **Los 4 métodos de ponderación económica** (documentos tipo de obra pública, CCE):

| # | Método | Cómo funciona |
|---|---|---|
| 1 | **Media aritmética** | Promedio de todas las ofertas hábiles. Más puntos al más cercano |
| 2 | **Media aritmética alta** | Promedio **solo de las ofertas por encima de la media** |
| 3 | **Media geométrica con presupuesto oficial** | Se incluye el presupuesto oficial como un dato más (a veces varias veces) |
| 4 | **Menor valor** | El más barato gana todos los puntos |

🔧 **El detalle que define la estrategia:** en los documentos tipo, **el método NO se conoce
antes**. Se **sortea el día de la audiencia de adjudicación** tomando el **primer decimal de la TRM
vigente**. Es decir: **te enteras de las reglas del precio después de haber presentado el precio.**

🎖️ **Truco de veterano #11 — Cómo se juega un precio bajo incertidumbre.**
Como no sabes si premiarán al más barato o al más cercano al promedio, la estrategia de «tirar el
precio al piso» es **matemáticamente mala**: te gana solo en **uno de los cuatro** métodos y en los
otros tres te aleja de la media y te hace perder puntos, además de destruir tu margen.

El enfoque profesional es **calcular el valor esperado**:

1. Descarga del SECOP los **últimos 10 procesos similares de esa entidad**. Todo es público: las
   ofertas, los valores, los informes.
2. Calcula, para cada uno, el **porcentaje de descuento del ganador frente al presupuesto oficial**.
3. Vas a encontrar una **banda sorprendentemente estable** — típicamente **entre 5 % y 12 % en obra**.
4. Ubica tu oferta **dentro de esa banda**, en el punto donde ganas bajo el **mayor número de
   métodos posibles**.
5. Verifica que ese precio **todavía te deja margen**. Si no, **no te presentas**.

Esto es análisis de datos públicos. Se hace con Excel y paciencia. **Es la razón número uno por la
que las empresas grandes ganan más: no tienen mejores contactos, tienen base de datos histórica.**

☠️ **El precio artificialmente bajo.** Si tu oferta se aleja demasiado hacia abajo, la entidad
**debe requerirte para que justifiques** (D. 1082, art. 2.2.1.1.2.2.4). Si no justificas
convincentemente con tu estructura de costos, **te rechazan**. Ganar tirando el precio al piso no
es una estrategia: es una forma elaborada de perder dos veces.
→ Ver [Capítulo 11](#capítulo-11-el-precio-cómo-costear-de-verdad).

### 9.2 Apoyo a la industria nacional (Ley 816 de 2003)

🍬 **Tienes 8 años.** Si los caramelos los hicieron en tu país, te dan puntos extra. Si los
trajiste de afuera, menos puntos. Si eres extranjero pero contratas gente de acá, te dan algo.

🎖️ **Truco de veterano #12.** Estos son **los puntos más baratos del mercado** y se pierden por
pura desidia. Es una certificación, a veces del representante legal, a veces del revisor fiscal,
con un texto casi estandarizado. **Ten la plantilla lista, firmada y actualizada antes de que salga
el proceso.** Es literalmente **hasta 20 puntos sobre 100 a cambio de una hoja de papel**. *He visto
perder licitaciones de $4.000 millones por no anexar ese certificado.*

### 9.3 Factores de desempate (Ley 2069 de 2020, art. 35)

Cuando hay empate se aplican **en orden**, hasta **13 criterios sucesivos**:

1. Bienes y servicios **nacionales**
2. **MIPYME**
3. **Cooperativas** y organizaciones de economía solidaria
4. Empresas con **personas en condición de discapacidad** (mínimo 10 % de la nómina)
5. **Mujeres cabeza de familia** y población vulnerable
6. **Emprendimientos de mujeres**
7. Población **indígena, negra, afrocolombiana, raizal, palenquera o Rrom**
8. **Jóvenes entre 18 y 28 años**
9. … y al final, **sorteo por balotas**

🎖️ **Truco de veterano #13.** Los empates son **mucho más frecuentes de lo que crees**, sobre todo
con documentos tipo, porque los puntajes están muy comprimidos. **Acredita todos los criterios de
desempate que legítimamente cumplas, siempre, en todos los procesos.** Son certificados que ya
tienes o que consigues una vez y sirven todo el año. Es la póliza de seguros más barata del oficio:
el día que quedes empatado con otro, **ganas sin haber puesto un peso más**.

---

## Capítulo 10. Consorcios y uniones temporales

🍬 **Tienes 8 años.** ¿No alcanzas a cargar la caja tú solo? Te unes con un amigo y la cargan entre
los dos. Eso es un consorcio. Hay dos formas de unirse:

- **Consorcio:** los dos responden por todo. Si tu amigo se equivoca, tú también pagas. Los dos,
  completo.
- **Unión temporal:** cada uno dice de antemano qué parte hace. Si tu amigo se equivoca en su parte,
  la multa se reparte según los porcentajes.

En ambos casos: **la experiencia y la plata se suman.** Por eso es la herramienta más poderosa del
oficio.

⚖️ **Ley 80 de 1993, art. 7.**

| | Consorcio | Unión temporal |
|---|---|---|
| Responsabilidad por el cumplimiento | **Solidaria y total** | **Solidaria y total** |
| Sanciones | **A todos por igual** | **Según la participación declarada** |
| Personería jurídica propia | No | No |
| NIT para efectos fiscales | Sí | Sí |
| Suma de experiencia y capacidad | Sí | Sí |

🎖️ **Truco de veterano #14 — La alianza de último minuto es 100 % legal, y es un arte.**
Sí: puedes formar un consorcio la noche antes del cierre. Es completamente legal. Pero **el que lo
improvisa firma un desastre. El que lo tiene preparado gana.**

**El «cajón de alianzas» — la práctica profesional.** Mantén, en todo momento, **tres a cinco
acuerdos marco de intención firmados** con empresas que:
- tengan experiencia **complementaria** a la tuya (no igual — complementaria),
- tengan indicadores financieros **mejores que los tuyos en el rubro donde tú eres débil**,
- y **no sean tus competidores directos** en tu nicho.

Con cada una, ten firmado un acuerdo de intención que ya defina: quién lidera, cómo se reparten los
porcentajes, quién aporta qué experiencia, cómo se factura, quién pone la póliza, cómo se resuelven
las disputas y qué pasa si uno se retira. **Cuando salga el proceso, solo llenas el objeto, el
porcentaje y la fecha.**

**Cómo se calcula el porcentaje.** Aquí está el error clásico: la gente reparte por «quién puso más
plata». **Se reparte por quién aporta lo que el pliego necesita.** Si tú tienes la experiencia
específica y el otro solo tiene el músculo financiero, **tú lideras**.

Y ojo: en muchos pliegos, **el integrante que aporta la experiencia debe tener un porcentaje mínimo
de participación** (frecuentemente **30 % o 40 %**). Si le das 20 % al que trae la experiencia clave,
el pliego **te la desconoce entera** y quedas inhabilitado. **Lee esa cláusula antes de repartir.**

☠️ **Los 5 errores mortales del consorcio:**

1. Documento de conformación **sin firmas de todos** los representantes legales.
2. Falta de **autorización de la junta directiva** cuando el monto supera las facultades del
   representante legal.
3. **Porcentajes que no suman 100 %.**
4. El que **aporta la experiencia** con participación **inferior al mínimo** del pliego.
5. **Un integrante con inhabilidad — contamina a todo el consorcio.**

🎖️ **Truco de veterano #15 — El «due diligence de 20 minutos» del socio.**
Antes de firmar cualquier consorcio, verifica:

| Fuente | Qué revisa |
|---|---|
| **SIRI** (Procuraduría) | Antecedentes disciplinarios |
| **Boletín de responsables fiscales** (Contraloría) | Responsabilidad fiscal |
| **Antecedentes judiciales** (Policía Nacional) | Antecedentes penales |
| **RNMC** (Registro Nacional de Medidas Correctivas) | Medidas correctivas |
| **Histórico en SECOP** | ¿Contratos incumplidos, multas, caducidades? |

Todo es **público y gratis** y toma veinte minutos. *Es la diferencia entre una alianza y un problema
con tu nombre encima.* **Su problema se vuelve tuyo el segundo en que firmas.**

---

## Capítulo 11. El precio: cómo costear de verdad

🍬 **Tienes 8 años.** Si vendes limonada a 1.000 pesos y el limón te costó 900, no ganaste 100.
Porque olvidaste el azúcar, el hielo, el vaso, el puesto y que tu mamá te cobra por usar la cocina.
*La mayoría de la gente que quiebra vendiendo limonada no era mala vendiendo limonada: era mala
sumando.*

⚖️ **La estructura de costos completa en obra pública colombiana.** Este es el capítulo que salva
empresas.

**Costo directo:** materiales, mano de obra, equipo, transporte, subcontratos.
El desglose por ítem es el **APU** (Análisis de Precios Unitarios).

**A.I.U.** (Administración, Imprevistos, Utilidad) — el sobrecosto que se aplica al costo directo:

| Componente | Rango típico | Qué cubre |
|---|---|---|
| **A** — Administración | 12 % – 20 % | Oficina, dirección, ingeniero residente, campamento, servicios, papelería, vigilancia |
| **I** — Imprevistos | 3 % – 5 % | **No es utilidad. Es tu seguro.** El que se come los imprevistos para ganar, pierde en obra |
| **U** — Utilidad | 5 % – 10 % | Lo que realmente te queda |

### Y ahora, lo que casi nadie suma — los costos que aparecen después de firmar

| Concepto | Valor típico | Nota |
|---|---|---|
| **Contribución especial de obra pública** | **5 % del valor del contrato** | Ley 418/1997 y prórrogas. Obra pública con entidad estatal. **Es el olvido más caro del país** |
| **Estampillas** departamentales/municipales | 0.5 % – 5 % acumulado | Pro-Universidad, pro-cultura, pro-adulto mayor, pro-hospital. **Varían por entidad. Verifícalas SIEMPRE** |
| Retención en la fuente | 1 % – 11 % | Según concepto |
| ReteICA | 0.4 % – 1.4 % | Según municipio y actividad |
| IVA | Sobre la **utilidad** en contratos de construcción de inmueble | Régimen especial |
| Pólizas y garantías | 1 % – 3 % | Depende del riesgo y de tu historial con la aseguradora |
| **Costo financiero del capital de trabajo** | Variable, **y grande** | Ver truco #16 |
| Ensayos, laboratorios, certificaciones | 0.5 % – 2 % | Los piden y **no están en el APU** |
| Plan de manejo ambiental, señalización, SST | 1 % – 3 % | Obligatorios y se olvidan |
| Liquidación, actas, imprevistos de cierre | 0.5 % | El contrato no termina cuando termina |

🎖️ **Truco de veterano #16 — El costo del flujo de caja es el asesino silencioso.**
El Estado paga tarde. Si el contrato es a 8 meses, no tiene anticipo y las actas se pagan a 60 días
de radicadas, **tú estás financiando al Estado durante todo ese tiempo**. Si tu costo de capital es
2 % mensual y estás financiando el 40 % del contrato durante 6 meses, **ahí se fueron ~5 puntos de
margen que no estaban en tu APU**.

**Regla práctica:** haz **siempre** un flujo de caja **mes a mes** del contrato **antes de fijar el
precio**. Si el flujo acumulado se vuelve muy negativo en algún mes, o consigues anticipo, o subes el
precio, o **no te presentas**. *La empresa que quiebra ejecutando un contrato que ganó es un clásico
colombiano, y siempre es la misma causa.*

> **Corregido en `docs/COMPLEMENTO_ANALISTA_LICITACIONES.md` § V-08.** Lo que sigue sobre el
> anticipo se queda corto y en un punto induce a error; la regla corregida vive allí, no aquí.

🔧 **Sobre el anticipo:** si hay anticipo, va a **patrimonio autónomo (fiducia)** en contratos de
licitación pública (Ley 1474/2011, art. 91). **No es plata tuya:** es plata amarrada con destinación
específica y auditada. **Presupuesta el costo de la fiducia** y el tiempo que toma constituirla.

☠️ **Los «costos adicionales» que a veces te sugieren presupuestar.**
Vale la pena decirlo sin rodeos porque circula: hay quien te dirá que dejes un porcentaje «para
gestión», «para el que ayudó» o «para destrabar el pago». Dos hechos fríos:

1. Ese dinero **no es deducible**, así que su costo real es su valor **más** el impuesto que pagas
   sobre él **más** el riesgo.
2. Es **el rastro contable exacto** que busca cualquier investigación, porque una partida sin
   soporte en un contrato estatal es lo primero que se cruza.

La empresa que lo presupuesta como línea de costo **termina explicándola**. No es un consejo moral:
es que **la partida deja huella, y la huella es lo que se persigue**.
→ Ver [Capítulo 17](#capítulo-17-advertencia-de-operador-no-de-moralista).

---

# PARTE III — DESPUÉS DEL CIERRE

> Aquí se define el **40 % de los procesos**. Y es la parte que los analistas mediocres tratan como
> trámite.

## Capítulo 12. El traslado del informe de evaluación

🍬 **Tienes 8 años.** Ya entregaste tu sobre. La profesora revisó todos los sobres y pegó en la
cartelera una lista que dice quién pasó y quién no, y por qué. Y te da cinco días para reclamar.

Aquí pasa algo que la mayoría no aprovecha: **puedes leer los sobres de todos los demás**. Están
pegados en la cartelera. Puedes ver qué escribieron, cuánto cobraron y qué les faltó.

⚖️ **El traslado** (Ley 1150 art. 9; D. 1082 art. 2.2.1.1.2.2.4):

| Modalidad | Término de traslado |
|---|---|
| **Licitación pública** | **5 días hábiles** |
| **Selección abreviada** y **concurso de méritos** | **3 días hábiles** |
| **Mínima cuantía** | **1 día hábil** |

Durante el traslado ocurren **tres cosas simultáneas**, y tienes que ejecutar **las tres**:

1. **Subsanas lo tuyo** → [Capítulo 13](#capítulo-13-subsanación-el-capítulo-que-salva-contratos).
2. **Revisas lo ajeno**.
3. **Presentas observaciones al informe** → [Capítulo 14 §14.2](#142-observaciones-al-informe-de-evaluación).

🎖️ **Truco de veterano #17 — El traslado es tu departamento de inteligencia competitiva, gratis.**
En el traslado, **todas las ofertas de todos los competidores son públicas**. Están cargadas en
SECOP II y las puedes descargar. Esto significa que, **aunque pierdas** el proceso, te llevas:

- El **precio exacto** de cada competidor y su porcentaje de descuento.
- Su **estructura de costos**, si el pliego exigió APU desagregado.
- Sus **certificaciones de experiencia** — o sea, el mapa completo de qué contratos tienen y con
  qué entidades.
- Su **composición de consorcio** y con quién se alía.
- Sus **indicadores financieros**.
- **Qué les faltó** y en qué son débiles.

**Descarga siempre todas las ofertas de todos los procesos donde participes, ganes o pierdas.**
Guárdalas en una carpeta por competidor. En dos años tendrás una base de datos de tu competencia que
ninguna consultora te vende. Sabrás exactamente cuánto descuenta cada uno, en qué entidades es fuerte
y dónde tiene el hueco.

Esto no es espionaje. **Es información pública que la ley obliga a publicar** y que el 95 % de los
oferentes nunca descarga porque el día que pierden cierran el computador y se van con rabia.

> Es también la materia prima del [truco #11](#91-el-factor-económico-y-la-trampa-de-la-media) (la banda
> de descuento) y del [postmortem](#212-el-postmortem).

---

## Capítulo 13. Subsanación: el capítulo que salva contratos

🍬 **Tienes 8 años.** Te faltó una firma en la hoja. La profesora te dice: «tráemela mañana». Eso se
arregla. Pero si en tu sobre **no pusiste el precio**, no te deja escribirlo al día siguiente, porque
sería hacer trampa: ya viste los precios de los demás.

> **Se arregla lo que no cambia el resultado. No se arregla lo que sí lo cambia.**
> Esa frase es toda la teoría de la subsanación en Colombia.

⚖️ **Ley 1150 de 2007, art. 5, parágrafo 1** (modificado por Ley 1882 de 2018, art. 5).

**SÍ es subsanable:**
- **Todo requisito habilitante**: capacidad jurídica, financiera, organizacional, experiencia.
- Certificados, poderes, autorizaciones de junta, RUP, documentos incompletos o ilegibles.
- Firmas faltantes en documentos **que no sean la oferta económica**.
- **El plazo llega hasta el término de traslado del informe de evaluación** (y en licitación, la
  jurisprudencia ha admitido hasta antes de la adjudicación en audiencia).

**NO es subsanable, jamás:**
- **Todo lo que asigna puntaje.** Si no lo aportaste, perdiste esos puntos.
- **La oferta económica.** No se corrige, no se completa, no se aclara al alza.
- **La garantía de seriedad de la oferta**: su **no presentación** junto con la propuesta es causal
  de rechazo y **no es subsanable** (Ley 1882/2018). *Sí* son subsanables **defectos formales** de la
  garantía sí presentada.
- **La falta de capacidad** para presentar la oferta (por ejemplo, estar inhabilitado).
- **Circunstancias ocurridas después del cierre.** Puedes **reexpedir** un certificado; no puedes
  **crear un hecho nuevo**.

🔧 **Cómo se escribe una subsanación que funciona.**
Regla: **el evaluador tiene 40 ofertas y poco tiempo. Hazle el trabajo.**

**Estructura obligatoria:**

1. **Referencia** del proceso y del oferente.
2. **Cita textual del requerimiento** de la entidad. Copiado, entre comillas.
3. **Respuesta directa en una sola frase.** «Se adjunta el certificado de experiencia del contrato
   XYZ, en el folio 3 del anexo.»
4. **Tabla de trazabilidad:**

   | Lo que pidió | Documento aportado | Folio | Dónde queda acreditado |
   |---|---|---|---|
   | *[cita textual del requerimiento]* | *[nombre exacto del documento]* | *[n.º]* | *[numeral del pliego que queda satisfecho]* |

5. **Los documentos, en el mismo orden de la tabla, foliados.**

☠️ **El error de la subsanación: aprovechar el requerimiento para «mejorar» la oferta.**
Si te piden aclarar la experiencia y tú de paso mandas un certificado nuevo, más grande y mejor,
**estás modificando la oferta**. Eso te lo rechazan y además queda en el expediente como un intento
de mejora extemporánea. **Responde exactamente lo que te preguntaron. Ni una línea más.**

🎖️ **Truco de veterano #18 — La subsanación proactiva.**
**No esperes el requerimiento.** En cuanto se publique el informe de evaluación y veas que te
marcaron algo como «no cumple» o «pendiente», **radica la subsanación de inmediato**, sin esperar a
que te la pidan. Motivos:

1. El término corre, y si la entidad te requiere el día 3 de 5, **te quedan dos días**.
2. Llegar primero, ordenado y con tabla de trazabilidad, **cambia la disposición del evaluador**.
3. Si hay debate jurídico, **quedas como el diligente en el expediente**.

---

## Capítulo 14. Las observaciones: el escrito quirúrgico

🍬 **Tienes 8 años.** Reclamar bien es un arte. «¡Profe, eso no es justo!» no funciona nunca. Lo que
sí funciona: «Profe, en la regla número 4 usted escribió que el sobre debía tener sello, y el sobre
de Juan no tiene sello. Aquí está la regla y aquí está la foto del sobre.»

> **No reclames sintiéndote. Reclama señalando.**

⚖️ Hay **tres momentos** para observar, con propósitos completamente distintos.

### 14.1 Observaciones al proyecto de pliego — la más poderosa y la más desaprovechada

Es **la única ventana legal en la que puedes modificar las reglas del juego antes de jugar**. Y la
mayoría de los oferentes no la usa, o la usa mal.

🔧 **Cómo se escribe una observación que la entidad SÍ acepta.**
Una observación se acepta **cuando le resuelve un problema a la entidad**, no cuando te resuelve un
problema a ti. El comité no te va a ayudar; pero **sí se va a proteger a sí mismo**. Entonces escribe
apuntando **a su riesgo**, no a tu conveniencia:

1. **Cita el numeral exacto** que observas. Textual.
2. **Explica por qué genera un riesgo para la entidad** — restricción de pluralidad de oferentes,
   posible declaratoria de desierta, exposición a demandas, desviación de los documentos tipo.
3. **Cita la norma:** Ley 1150 art. 5 (selección objetiva); Ley 80 art. 24 (transparencia); Ley
   2022/2020 y documentos tipo; conceptos de Colombia Compra Eficiente; jurisprudencia del Consejo
   de Estado.
4. **PROPÓN LA REDACCIÓN ALTERNATIVA, ESCRITA Y LISTA PARA PEGAR.** *Este es el punto que lo cambia
   todo.* El comité está saturado. Si le entregas el párrafo redactado, hay una probabilidad enorme
   de que **aparezca literalmente en la adenda**.
5. **Cierra pidiendo respuesta motivada.**

🎖️ **Truco de veterano #19 — El argumento que casi siempre gana: pluralidad de oferentes.**
A una entidad lo que más miedo le da no es que tú te quejes: **es declarar desierto el proceso**. Un
proceso desierto significa repetir todo, retrasar la meta del plan de desarrollo, y explicarle a
control interno por qué.

Formulación modelo:

> «El requisito del numeral X, tal como está redactado, restringe la participación a un número muy
> reducido de proponentes, lo que expone a la entidad al riesgo de declaratoria de desierta y
> compromete el deber de selección objetiva. Se propone la siguiente redacción alternativa que
> preserva el estándar técnico requerido y amplía la pluralidad: **[texto]**.»

Fíjate en la mecánica: **no dices «déjenme entrar». Dices «así como está, se les puede caer el
proceso, y aquí está el arreglo redactado».** La entidad acepta **porque le conviene a ella**.

### 14.2 Observaciones al informe de evaluación

Aquí revisas las ofertas de tus competidores (las descargaste en el
[traslado](#capítulo-12-el-traslado-del-informe-de-evaluación)) y señalas **incumplimientos reales y
verificables contra el pliego**.

🔧 **Estructura del escrito quirúrgico:**

```
Observación N.º 1 — Oferente: [Nombre]

Requisito del pliego:      Numeral 3.2.1. Texto: "[cita textual]"
Lo aportado por el oferente: Folio 47, certificación de [X], que acredita [Y].
Incumplimiento:            El pliego exige [A]; el documento acredita [B]. No corresponde.
Consecuencia solicitada:   Se solicita declarar NO HÁBIL / descontar el puntaje
                           asignado en el factor [Z].
Soporte:                   Se anexa copia del folio referido.
```

Una observación con esa estructura, **con cita textual y número de folio**, es muy difícil de
ignorar, porque queda en el expediente y **el comité tiene que motivar por escrito por qué la
rechaza**. Una observación que dice «el oferente X no cumple, revisen» se responde en dos líneas y
se archiva.

### 14.3 Sobre observar para desgastar

Vale la pena ser explícito porque es una práctica que existe: hay quien presenta baterías de
observaciones sin fundamento con el único propósito de retrasar el proceso o consumirle el tiempo a
un competidor.

Los hechos operativos, sin adorno:

- **Casi nunca funciona.** La entidad responde en bloque, con una tabla, y sigue. El cronograma casi
  no se mueve porque el comité tiene la meta encima.
- **Te marca.** Los comités evaluadores son pequeños y rotan entre entidades del mismo sector. La
  empresa etiquetada como «la que siempre pone quejas sin sustento» recibe una revisión más dura en
  todos sus procesos futuros, **de manera perfectamente legal**. Es la peor inversión reputacional
  disponible.
- **En su versión extrema tiene nombre jurídico.** Cuando el desgaste es coordinado entre varios
  oferentes o se dirige a expulsar a un competidor del mercado, deja de ser una molestia procesal y
  entra en el terreno de las **prácticas restrictivas de la competencia** que investiga la SIC.

Lo que sí funciona y no tiene ninguno de esos costos: **tres observaciones impecables con cita,
folio y norma**. Una empresa conocida por observar poco pero con precisión letal tiene un poder real
en las audiencias. **Cuando esa empresa observa, el comité se detiene y lee.**

---

## Capítulo 15. La audiencia de adjudicación

🍬 **Tienes 8 años.** Es el día en que la profesora dice en voz alta quién ganó, delante de todo el
salón, y queda grabado.

⚖️ La audiencia es **pública, se graba y el acta hace parte del expediente**. En licitación pública
es **obligatoria** (Ley 1150, art. 9). Es también el momento en que **se sortea el método de
ponderación económica** con el primer decimal de la TRM
(→ [§9.1](#91-el-factor-económico-y-la-trampa-de-la-media)).

🔧 **Cómo se llega a una audiencia:**

- **Con una hoja, no con una carpeta.** Máximo **tres puntos**, escritos, con numeral de pliego y
  folio.
- Con **el texto de tu intervención redactado**, para leerlo si te pones nervioso.
- Sabiendo que **todo lo que digas queda grabado** y puede usarse en tu contra en un proceso judicial
  posterior.
- **Radicando por escrito todo lo que digas oralmente.** *Lo que no está por escrito, para efectos
  prácticos, no existe.*

☠️ **Nunca:** discutas con otro oferente, acuses sin documento, amenaces con demandar, o improvises
un argumento nuevo. **La audiencia no es para descubrir argumentos. Es para dejar constancia de los
que ya construiste.**

---

## Capítulo 16. Recursos y acciones — con la verdad incómoda

🍬 **Tienes 8 años.** Perdiste y crees que fue injusto. ¿Puedes reclamarle a la profesora? Depende de
qué decisión sea. Para algunas cosas sí puedes pedirle que lo piense otra vez. Para otras, ya no hay
reclamo con ella: hay que ir donde el rector. Y eso toma mucho más tiempo.

⚖️ **Este es el punto donde más gente se equivoca en Colombia. Léelo dos veces.**

### 16.1 Contra el acto de adjudicación: NO procede recurso

**Ley 1150 de 2007, art. 9:** el acto de adjudicación es **irrevocable** y obliga a la entidad y al
adjudicatario. **No procede recurso de reposición** en vía administrativa contra la adjudicación en
licitación pública.

Si pierdes una licitación y quieres atacar la adjudicación, **tu vía es judicial**:

| Vía | Norma |
|---|---|
| Nulidad y restablecimiento del derecho | CPACA, art. 138 |
| Controversias contractuales | CPACA, art. 141 |
| Medida cautelar de suspensión provisional | CPACA, art. 229 y ss. |
| **Requisito previo:** conciliación extrajudicial ante la Procuraduría | — |
| **Caducidad: 4 meses** desde la comunicación/notificación del acto | — |

**Consecuencia práctica que debes decirle a tu gerente antes de que gaste plata:** demandar una
adjudicación es **caro, lento (años) y la obra normalmente ya se ejecutó**. La reparación, si llega,
es **indemnizatoria**. **No te van a dar el contrato.** El 90 % de las veces la decisión racional es
**documentar, aprender y ganar el siguiente**.

### 16.2 Dónde SÍ procede el recurso de reposición

- Contra el acto que **declara desierto** el proceso (Ley 80, art. 30 num. 11).
- Contra **actos administrativos contractuales sancionatorios**: imposición de multas, declaratoria
  de incumplimiento, efectividad de la cláusula penal (Ley 1474/2011, art. 86).
- Contra **actos administrativos definitivos** proferidos en la actividad contractual que no tengan
  norma especial en contrario (Ley 80, art. 77 y CPACA, art. 74 y ss.).
- **Término: 10 días hábiles** siguientes a la notificación (CPACA, art. 76).

### 16.3 El rechazo de la oferta

El acto que rechaza una oferta suele ser un **acto de trámite** y por regla general **no admite
recurso autónomo**: se ataca junto con el acto definitivo de adjudicación, por vía judicial.

**Por eso las observaciones al informe de evaluación son tan importantes:** son tu oportunidad real,
y muchas veces la única, de corregir el rumbo **antes de que sea definitivo**.
→ [Capítulo 14 §14.2](#142-observaciones-al-informe-de-evaluación).

🎖️ **Truco de veterano #20 — La denuncia administrativa es más rápida que la demanda.**
Si detectas una irregularidad **seria y verificable**, existen vías paralelas mucho más ágiles que un
proceso judicial:

| Vía | Competencia |
|---|---|
| **Procuraduría** | Disciplinaria |
| **Contraloría** | Fiscal |
| **Superintendencia de Industria y Comercio (SIC)** | Si hay indicios de acuerdo entre oferentes |
| **Agencia Nacional de Defensa Jurídica del Estado** | Defensa jurídica |

Ninguna te devuelve el contrato, pero **mueven el expediente y cambian el comportamiento de una
entidad en sus procesos siguientes** de una forma que ninguna demanda logra en cuatro años.

---

# PARTE IV — ESTRATEGIAS PARA INCLINAR LA BALANZA

> El mapa completo: la ventaja que **puedes construir**, y el terreno turbio que **vas a encontrar**,
> para que sepas reconocerlo y sobrevivirlo.

## Capítulo 17. Advertencia de operador, no de moralista

Antes de las técnicas, **tres hechos operativos**. No son un sermón; son la razón por la que las
empresas que llevan 30 años en este mercado juegan como juegan.

**Hecho 1: el analista es el que queda en el papel.**
El dueño conversa, el gerente negocia, pero **el analista carga, firma, radica y aparece en el
expediente**. Cuando algo se investiga, se persigue el documento. El documento lleva tu nombre. *Es
el riesgo peor repartido del oficio.*

**Hecho 2: el castigo no es una multa, es la muerte comercial.**

| Sanción | Magnitud |
|---|---|
| Acuerdos restrictivos de la competencia (**C.P. art. 410A**) | **Prisión** |
| Multa SIC a la empresa | Hasta **100.000 SMLMV** |
| Multa SIC al individuo (de su bolsillo) | Hasta **2.000 SMLMV** |
| **Inhabilidad para contratar con el Estado** (Ley 80 art. 8; Ley 1474/2011) | **Hasta 20 años** |

Para una empresa que vive de contratación pública, **la inhabilidad no es una sanción: es el cierre**.

**Hecho 3: la trazabilidad cambió.**
SECOP II registra **cada acceso, cada carga, cada hora y cada IP**. La **Ley 2195 de 2022** introdujo
la identificación del **beneficiario final**. Los cruces entre SECOP, DIAN, Cámara de Comercio y UIAF
son **automáticos**. Las coincidencias de dirección, contador, IP, formato de archivo y **metadatos
de PDF** entre «competidores» son exactamente lo que detectan los algoritmos de la SIC — y es como se
ha desmantelado la mayoría de los carteles de contratación en Colombia en la última década.
**El terreno que existía hace quince años ya no existe.**

---

## Capítulo 18. Las siete palancas legales que sí inclinan la balanza

Ordenadas por **impacto real medido en procesos ganados**.

### Palanca 1 — Inteligencia anticipada (impacto: altísimo)

Ya lo vimos con el PAA ([truco #9](#capítulo-7-el-ciclo-completo-de-un-proceso)). Ampliémoslo.
**Fuentes públicas, gratuitas, que casi nadie explota sistemáticamente:**

| Fuente | Qué te da | Cuándo |
|---|---|---|
| **PAA en SECOP II** | Objeto, valor, mes y modalidad de todo lo que comprará la entidad este año | **31 de enero** |
| **Plan de Desarrollo** (Nación / dpto. / municipio) | Las metas que la entidad **tiene que** cumplir. **Predice el PAA del año entrante** | Cada 4 años |
| **Presupuesto aprobado** | Cuánta plata hay por rubro. Confirma o desmiente el PAA | Diciembre |
| **Histórico SECOP** | Quién ganó, a qué precio, con qué descuento, con qué consorcio | Permanente |
| **Estudios del sector publicados** | El análisis de mercado que hizo **la propia entidad** | Con el proyecto de pliego |
| **Informes de la Contraloría** | Qué le criticaron a la entidad. **Predice qué requisitos endurecerá** | Anual |

🎖️ **El uso avanzado:** el informe de auditoría de la Contraloría a una entidad **te dice qué va a
cambiar en sus próximos pliegos**. Si le observaron que contrató con empresas de baja capacidad
financiera, prepárate: el año entrante **los indicadores van a subir**. Si le observaron
incumplimientos de plazo, **van a endurecer la experiencia**. Vas a estar listo seis meses antes que
todos.

### Palanca 2 — Interlocución legítima con la entidad (impacto: alto)

Esta es la versión que funciona de «acercarse al comprador». **No hay que buscar puertas traseras:
hay puertas delanteras que casi nadie usa.**

**a) El estudio del sector.** Antes de estructurar un proceso, la entidad está **obligada** a analizar
el mercado (D. 1082, art. 2.2.1.1.1.6.1). Para eso pide cotizaciones y fichas técnicas a empresas del
ramo. **Responder ese requerimiento, bien y a tiempo, es legal, es esperado y es influyente**, porque
**tu ficha técnica puede convertirse en la base de la especificación**. Muchas empresas ignoran esos
correos por pereza. **Contéstalos todos, con calidad de propuesta.**

**b) La audiencia de asignación de riesgos.** Es pública, obligatoria en licitación, se graba, y es
donde se discute quién asume qué riesgo. **Casi nadie va.** Ir, hablar con criterio técnico y quedar
en el acta te construye reputación con el comité **de forma perfectamente transparente**.

**c) Las observaciones al proyecto de pliego.** La herramienta más potente del oficio.
→ [Capítulo 14 §14.1](#141-observaciones-al-proyecto-de-pliego--la-más-poderosa-y-la-más-desaprovechada).

**d) La solicitud de mesa de trabajo o aclaración técnica.** Radicada formalmente, por el canal
oficial de SECOP II o por radicación en la entidad. Pública. Queda en el expediente.

🎖️ **Truco de veterano #21 — La regla de oro del contacto: «¿me incomodaría que esto se publicara?»**
Todo contacto con la entidad debe pasar esa prueba. Si la respuesta es sí, **no lo hagas** — no por
moral, sino porque en contratación pública **todo termina publicándose**, y la asimetría es brutal:
**el beneficio es un contrato, el costo es 20 años de inhabilidad**.

**Consecuencia práctica:** usa **siempre el canal formal**, aunque sea más lento. Un correo por el
sistema de mensajería de SECOP II tiene una virtud enorme: **es público, con fecha, y te protege**.
Un WhatsApp no te protege de nada y **sirve de prueba en tu contra**.

### Palanca 3 — Detección de pliegos direccionados (impacto: alto)

🍬 **Tienes 8 años.** A veces la profesora escribe las reglas del concurso así: «gana el que traiga un
perro café de tres patas que se llame Pepe». Y resulta que solo hay un perro así en todo el colegio.
**Las reglas no están escritas para elegir al mejor: están escritas para elegir a uno.** Aprender a
ver eso te ahorra semanas de trabajo inútil.

🚩 **Las 12 señales de un pliego sastre:**

| # | Señal |
|---|---|
| 1 | **Experiencia hiperespecífica sin razón técnica.** «Cinco contratos de construcción de cubiertas metálicas en instituciones educativas de clima frío, entre 2019 y 2021.» **Cada adjetivo recorta el universo** |
| 2 | **Códigos UNSPSC inusuales o excesivamente restrictivos** para el objeto |
| 3 | **Indicadores financieros calibrados con precisión rara** (liquidez ≥ 3.7). *Los indicadores razonables son números redondos* |
| 4 | **Personal clave con certificaciones que emite una sola institución** o que muy pocos profesionales tienen en el país |
| 5 | **Plazos mínimos legales para todo.** Publicación del proyecto de pliego el mínimo, plazo para ofertar el mínimo, respuestas a último minuto |
| 6 | **Adendas que cambian requisitos técnicos faltando 24 horas** para el cierre |
| 7 | **Marca o especificación técnica de un solo fabricante**, sin la cláusula «o equivalente» |
| 8 | **Ficha técnica de un producto específico** que solo un distribuidor autorizado puede entregar |
| 9 | **Respuestas a observaciones evasivas o copiadas** — «se mantiene lo establecido en el pliego», sin motivación |
| 10 | **Apertura en fechas estratégicas:** 23 de diciembre, Semana Santa, cierres puente |
| 11 | **Un solo oferente o dos** (uno claramente sin capacidad) en el histórico reciente de esa entidad para ese objeto |
| 12 | **Desviación injustificada de los documentos tipo**, siendo obligatorios (Ley 2022 de 2020) |

🔧 **Qué hacer cuando lo detectas.** Tres opciones, **en orden de utilidad**:

- **A) Observar en el proyecto de pliego**, con propuesta de redacción alternativa. Funciona más de lo
  que la gente cree, sobre todo cuando el argumento es **la pluralidad de oferentes y el riesgo de
  desierta**. *La entidad prefiere modificar a que le auditen.*
- **B) Retirarte temprano** y ahorrarte tres semanas. Es una decisión de negocio perfectamente válida
  y **frecuentemente la correcta**. Tu recurso escaso es el tiempo del equipo.
- **C) Denunciar** ante Procuraduría, Contraloría o la SIC si hay elementos serios. Efecto lento sobre
  **este** proceso; **efecto real sobre los siguientes** de esa entidad.

**Lo que NO debes hacer:** presentarte «a ver qué pasa» gastando 80 horas de equipo. **Un pliego sastre
bien hecho no lo ganas por insistencia.**

### Palanca 4 — Ingeniería de la propia oferta (impacto: alto)

Aquí está la versión legítima y muy poderosa de «estructurar la oferta para dejar fuera al
competidor». **La distinción es simple y es la línea que separa una carrera de un proceso penal:**

- ✅ **Legal:** construir **tu oferta** de modo que sea difícil de igualar. Compites con lo que tú
  traes.
- ❌ **Ilegal:** conseguir que **la entidad escriba el pliego** alrededor de lo que solo tú tienes. Ahí
  ya no compites: **capturas al comprador**.

**La versión legal:**

- **Alianza exclusiva con el proveedor crítico.** Si el objeto depende de un insumo, tecnología o
  equipo escaso, negocia con el fabricante un acuerdo de distribución exclusiva o un respaldo
  preferencial. Es **competencia comercial pura**.
- **Certificaciones anticipadas.** ISO, certificaciones de producto, homologaciones, acreditaciones de
  laboratorio. **Tardan meses.** Si las sacas antes de que el mercado las necesite, cuando el pliego
  las pida **serás uno de tres**.
- **Personal clave contratado, no prometido.** Muchas empresas prometen un director de obra que no
  tienen. Ten a los perfiles críticos **vinculados o con acuerdo firmado**. Es diferencia real de
  puntaje **y de ejecución**.
- **Consorcio que suma lo que ninguno tiene solo.** →
  [Capítulo 10](#capítulo-10-consorcios-y-uniones-temporales).
- **Capacidad financiera superior al requisito.** No da puntos, pero **te permite entrar a procesos
  grandes donde hay tres competidores en lugar de treinta**. *Menos competencia es más rentable que
  más puntaje.*

🎖️ **Truco de veterano #22 — La estrategia del nicho incómodo.**
El error de la mayoría es competir en procesos **grandes, visibles y con 40 oferentes**. Ahí el margen
se destruye solo. **El dinero está en los procesos técnicamente incómodos:** geografía difícil,
especialidad rara, entidad con fama de pagar tarde, objeto que exige una certificación molesta. Ahí
compites **contra tres, no contra cuarenta**, y el precio ganador está mucho más cerca del presupuesto
oficial. **Construye deliberadamente la capacidad que hace incómodo tu nicho.**

### Palanca 5 — Disciplina documental (impacto: subestimado, enorme)

Un porcentaje grandísimo de las ofertas que se rechazan en Colombia **se rechazan por forma, no por
fondo**. Firma faltante, folio mal, certificado vencido, formato equivocado, archivo en la carpeta que
no era.

Esto significa algo que casi nadie dice en voz alta: **una parte importante de los procesos se gana
por eliminación.** No porque tú fueras el mejor, sino porque **el mejor se cayó por un documento**.

**Corolario doble:**
1. **Blinda tu forma.** Doble revisión cruzada, lista de chequeo firmada, cargue con 24 horas de
   anticipación.
2. **Revisa la forma de los demás en el traslado.** Ahí es donde una observación quirúrgica cambia el
   resultado, **sin necesidad de ninguna trampa**.

### Palanca 6 — Velocidad de respuesta (impacto: medio-alto)

El que responde una subsanación **en 4 horas, con tabla de trazabilidad**, tiene una ventaja real
sobre el que responde en el día 3 con un correo desordenado. El evaluador es una persona con exceso de
trabajo. **La oferta ordenada se evalúa mejor.** Eso no es corrupción: **es ergonomía**.

### Palanca 7 — Reputación de ejecución (impacto: a largo plazo, decisivo)

En un mercado donde todos los oferentes se parecen en el papel, **cumplir en obra es la ventaja que no
se puede copiar**. Un contratista sin multas, sin incumplimientos, sin caducidades, con actas de
liquidación limpias y certificaciones de buena ejecución, acumula **el activo más difícil de construir
del sector**. Y en el traslado, cuando un competidor tenga un incumplimiento registrado y tú no, **eso
pesa**.

---

## Capítulo 19. El mapa del terreno turbio

> Para que lo **reconozcas** cuando te lo apliquen, **entiendas** por qué perdiste, y sepas exactamente
> **qué te costaría** entrar ahí. Esto existe. Fingir que no, sería un mal manual. Se describe como
> **fenómeno de mercado, con sus señales y sus consecuencias — no como procedimiento.**

### 19.1 Los cuatro fenómenos principales

#### a) El pliego direccionado («pliego sastre»)

Cubierto en la [Palanca 3](#palanca-3--detección-de-pliegos-direccionados-impacto-alto). Es el más
común y **el más difícil de probar**, porque cada requisito individual siempre tiene una justificación
técnica aparente. **Se detecta por el conjunto, no por la pieza.**

#### b) El acuerdo entre oferentes (colusión)

Varios competidores coordinan quién gana, o presentan **ofertas de acompañamiento** deliberadamente
perdedoras para simular pluralidad, o **rotan** las adjudicaciones.

🚩 **Cómo se detecta desde afuera** — descarga las ofertas en el traslado y busca:
- **Errores de digitación idénticos** en ofertas de «competidores» distintos.
- **Metadatos de PDF con el mismo autor**, o formatos y tipografías idénticas.
- **Direcciones, teléfonos, contadores, revisores fiscales o representantes compartidos.**
- **Ofertas de acompañamiento** con precios absurdos o documentación intencionalmente incompleta.
- **Patrón de rotación** en el histórico: A gana, B acompaña; el siguiente B gana, A acompaña.
- **Consorcios que se rearman** entre las mismas cuatro empresas en todos los procesos.

**Lo que implica:** delito del **art. 410A** del Código Penal (acuerdos restrictivos de la competencia
en contratación pública), más investigación de la **SIC**, más **inhabilidad**. Si lo detectas, tu vía
es la **denuncia ante la SIC**, que tiene un **programa de beneficios por colaboración** para quien
aporta primero.

#### c) La captura del evaluador

Pago, promesa de empleo, favores o presión sobre quien evalúa o estructura.

🚩 **Señales:**
- Respuestas a observaciones **incoherentes con el pliego**.
- **Puntajes técnicos subjetivos sin motivación**.
- **Cambios de criterio entre informe preliminar y definitivo** sin documento nuevo que lo justifique.
- **Subsanaciones aceptadas a uno y negadas a otro** por el mismo hecho.
- **Adjudicación apartándose de la recomendación del comité sin motivación escrita**
  (→ [truco #2](#capítulo-2-quién-es-quién-en-la-cancha)).

**Lo que implica:** cohecho (arts. 405–407 C.P.), interés indebido en la celebración de contratos
(art. 409), contrato sin cumplimiento de requisitos legales (art. 410). **Para el particular:
inhabilidad y responsabilidad penal, no solo para la empresa.**

#### d) La fuga de información reservada

Conocer el presupuesto oficial, los precios de los competidores o el contenido del pliego **antes de
su publicación**.

🚩 **Señales:** un oferente cuya propuesta económica queda **a una fracción de porcentaje del
presupuesto oficial, en varios procesos seguidos**; alguien que llega con **la documentación exótica
ya lista** el día de la apertura.

**Lo que implica:** delitos de **utilización de asunto sometido a secreto o reserva** (art. 418 C.P.) y
violación de reserva. Y para el particular que la recibe y la usa, **responsabilidad como determinador
o interviniente**.

### 19.2 Por qué la aritmética no cuadra

El análisis frío que un consultor con veinte años le hace a un gerente que le pregunta si «vale la
pena»:

| Concepto | El atajo | La disciplina |
|---|---|---|
| **Costo de entrada** | Un porcentaje del contrato + el riesgo | Un analista bien formado y un sistema |
| **Escalabilidad** | Ninguna. Cada proceso hay que «gestionarlo» de nuevo | Total. El mismo sistema sirve para 200 procesos al año |
| **Vida útil** | Hasta que cambie el gobierno de la entidad, o alguien hable | Décadas |
| **Riesgo de ruina total** | Alto y creciente | Prácticamente nulo |
| **Quién asume el riesgo** | **El analista, que es quien firma** | Nadie |
| **Tasa de éxito real** | Depende de que TU contacto siga ahí | Depende de ti |

**Y el punto que nadie ve:** las empresas que compiten con atajos **nunca desarrollan capacidad**. No
aprenden a costear, no construyen base de datos, no montan el área. Cuando cambia el alcalde, se quedan
sin nada.

La empresa disciplinada, en cambio, **acumula**: base de precios históricos, biblioteca documental,
alianzas, certificaciones, reputación de ejecución. **Ese activo compuesto es la única cosa en este
mercado que no te pueden quitar.**

> *En veinte años he visto quebrar a muchas empresas de contactos. Las que siguen aquí son las
> aburridas: las que cargan la oferta un día antes y tienen todo el archivo en orden.*

---

# PARTE V — SEGUIMIENTO POST-CIERRE Y EJECUCIÓN

## Capítulo 20. Ganaste. Ahora empieza el riesgo de verdad

🍬 **Tienes 8 años.** Ganaste el concurso de refrigerios. Felicitaciones. Ahora tienes que hacer 50
refrigerios, entregarlos a tiempo, que estén buenos, y esperar a que te paguen. **Y aquí es donde
muchos descubren que ganar era la parte fácil.**

⚖️ **La secuencia post-adjudicación:**

| Paso | Qué es | Trampa |
|---|---|---|
| **Adjudicación** | Acto administrativo. **Irrevocable** | Tienes plazo para firmar; si no firmas, **pierdes la garantía de seriedad y te inhabilitas** |
| **Suscripción del contrato** | Firma | **Revisa que el texto coincida con el pliego.** A veces no |
| **Garantías** | Cumplimiento, salarios, calidad, estabilidad, RCE | **Sin aprobación de garantías no hay acta de inicio** |
| **Registro presupuestal (RP)** | La entidad compromete la plata | **Sin RP no hay pago posible** |
| **Acta de inicio** | Arranca el plazo | 🚩 **El plazo corre desde aquí, no desde la firma** |
| **Ejecución** | El trabajo | Actas parciales, bitácora, informes |
| **Liquidación** | Cierre de cuentas | Plazo: 4 meses de común acuerdo, +2 unilateral (Ley 1150, art. 11) |

☠️ **La trampa del acta de inicio.** Entre la adjudicación y el acta de inicio pueden pasar semanas. Si
tú ya compraste materiales y contrataste personal el día de la adjudicación, **estás pagando nómina sin
que corra el plazo ni haya facturación**. **Nunca movilices antes del acta de inicio firmada** — salvo
que tengas una razón contractual **y escrita** para hacerlo.

🎖️ **Truco de veterano #23 — El acta de inicio es negociable, y casi nadie lo negocia.**
Si la entidad **no te ha entregado el predio, los diseños, las licencias o los permisos** que le
corresponden, **no firmes el acta de inicio**. En el momento en que la firmas, **el reloj corre contra
ti** y los incumplimientos de la entidad **se vuelven tu problema**. **Deja constancia escrita de lo que
falta antes de firmar.** Esa constancia es lo que te salva ocho meses después cuando te quieran multar
por atraso.

### 20.1 Las garantías post-contractuales

| Amparo | Suficiencia típica | Vigencia |
|---|---|---|
| **Cumplimiento** | 10–20 % del valor | Plazo + 4 meses |
| **Salarios y prestaciones** | 5 % | Plazo + **3 años** |
| **Calidad** del servicio/bien | 10–20 % | Según objeto |
| **Estabilidad de la obra** | 10–30 % | **5 años desde el recibo final** |
| **RCE extracontractual** | ≥ 200 SMMLV | Plazo del contrato |

🎖️ **Truco de veterano #24 — Tu cupo con la aseguradora es un activo estratégico, y es finito.**
Cada póliza **consume cupo**. Si ganas tres contratos grandes seguidos, puedes **quedarte sin capacidad
de afianzamiento** y no poder presentarte a nada más. **Habla con tu corredor al principio del año, no
cuando ganes.** Planea el cupo como planeas la caja. Y ojo con la **estabilidad de obra: te consume cupo
durante cinco años después de terminada la obra**.

### 20.2 Modificaciones contractuales

| Figura | Qué hace | Límite |
|---|---|---|
| **Adición** | Aumenta el valor | **50 % del valor inicial expresado en SMMLV** (Ley 80, art. 40, par.) |
| **Prórroga** | Aumenta el plazo | **No** tiene el límite del 50 % |
| **Otrosí / modificación** | Cambia condiciones sin necesariamente alterar valor o plazo | — |
| **Suspensión** | Congela el plazo por causa justificada | Debe documentarse **impecablemente**, con acta y soportes |

🎖️ **Truco de veterano #25 — Documenta el hecho el día que ocurre, no el día que reclamas.**
El **90 % de las reclamaciones de contratistas en Colombia se pierden por falta de prueba oportuna, no
por falta de razón**. Llovió y no se pudo trabajar: **acta de ese día**, con foto, registro IDEAM y firma
del interventor. La entidad no entregó el predio: **oficio radicado ese mismo día**. Un reclamo construido
al final del contrato, con hechos de hace ocho meses, **casi nunca prospera**. *La bitácora de obra firmada
por el interventor es el documento más valioso que vas a tener.*

### 20.3 La liquidación

🍬 **Tienes 8 años.** La liquidación es cuando cuentan todo al final: cuánto entregaste, cuánto te deben,
cuánto quedó pendiente. **Si firmas ese papel sin poner tus reclamos, ya no puedes reclamar nunca más.**

⚖️ **Ley 1150, art. 11.** De común acuerdo dentro de los **4 meses** siguientes (o lo pactado); si no hay
acuerdo, **unilateral por la entidad** dentro de los **2 meses** siguientes.

> **Corregido en `docs/COMPLEMENTO_ANALISTA_LICITACIONES.md` § V-05.** Lo que sigue presenta
> como absoluto el efecto de firmar sin salvedades; la regla corregida vive allí, no aquí.

☠️ **El error irreversible: firmar el acta de liquidación SIN SALVEDADES.**
Al firmar sin salvedades, **renuncias a reclamar**. Si tienes cualquier reclamación pendiente —mayores
cantidades, obras adicionales, sobrecostos por suspensión, intereses de mora— **debe quedar escrita como
salvedad expresa en el acta**. Sin salvedad, **la vía judicial se te cierra**. *Esto ha costado miles de
millones a contratistas que «firmaron para no pelear».*

---

# PARTE VI — MONTAR Y OPERAR EL ÁREA

## Capítulo 21. El área de licitaciones que funciona

🔧 **Roles mínimos** (pueden ser 2 personas con varios sombreros, o 8):

| Rol | Función |
|---|---|
| **Rastreador** | Vigila PAA, alertas UNSPSC, SECOP. Alimenta el pipeline |
| **Analista** | Lee pliegos, hace el Go/No-Go, arma la carpeta, carga |
| **Costeador / presupuestista** | APU, AIU, flujo de caja, precio final |
| **Jurídico** | Observaciones, subsanaciones, recursos, consorcios |
| **Documental** | Biblioteca viva de certificados con alertas de vencimiento |

🔧 **KPIs que sí importan** (mide estos y **solo estos** al principio):

| Indicador | Fórmula | Meta razonable |
|---|---|---|
| **Tasa de habilitación** | Ofertas habilitadas / ofertas presentadas | **> 95 %** |
| **Tasa de adjudicación** | Ganados / presentados | 8 % – 20 % según sector |
| **Rechazos por forma** | Rechazos formales / presentadas | **0 %. Sin excusas** |
| **Costo por oferta** | Horas-hombre × costo | Baja con biblioteca |
| **Margen realizado vs. ofertado** | Real / proyectado | > 85 % |
| **Anticipación media** | Días entre alerta y cierre | **> 20 días** |

🚩 **El indicador que revela un área enferma: tasa de habilitación baja.** Si te caes por forma, el
problema **no** es la competencia ni la suerte ni la entidad. **Es tu proceso interno, y es 100 %
arreglable.**

### 21.1 La biblioteca documental

🍬 **Tienes 8 años.** Es tu mochila. Si cada vez que hay una tarea tienes que salir a buscar lápiz,
borrador y regla, siempre llegas tarde. **El que tiene la mochila lista sale primero.**

Carpeta viva, **con responsable y fecha de vencimiento por cada ítem**:

- Cámara de comercio, RUT, cédula del R.L., **RUP**
- Estados financieros con notas, dictamen del revisor fiscal, tarjeta profesional y antecedentes del
  contador y revisor
- **Certificaciones de experiencia** de todos los contratos — *pídelas al terminar cada contrato, no
  tres años después cuando el funcionario ya no está*
- Hojas de vida del **personal clave**, con soportes y cartas de compromiso
- Certificados: parafiscales, **industria nacional**, MIPYME, discapacidad, ISO, judiciales
- Formatos de la casa: carta de presentación, consorcio, UT, compromiso anticorrupción
- **Autorizaciones de junta directiva** vigentes
- **Certificado de cupo de la aseguradora**

🎖️ **Truco de veterano #26 — La alerta de 60 días.**
Monta un calendario que te avise **60 días antes** del vencimiento de cada documento. *Los documentos
vencidos son la **causa número dos** de rechazo del país, después del «guardé y no presenté».*

### 21.2 El postmortem

Después de **cada** proceso —ganado o perdido— **una hoja, media hora, todo el equipo**:

1. ¿Ganamos o perdimos? **¿Por cuánto?**
2. ¿Cuál fue el **factor decisivo**: precio, habilitante, puntaje, forma?
3. ¿**Qué precio puso cada competidor**? (descárgalo del traslado)
4. ¿Qué **haríamos distinto**?
5. ¿Qué se **guarda en la biblioteca** para no repetir esto?

*Esa hoja, acumulada durante dos años, vale más que cualquier consultor.*

---

## Índice de los 26 trucos de veterano

| # | Truco | Capítulo |
|---|---|---|
| 1 | Invocar la **selección objetiva** con la fórmula exacta, no «esto es injusto» | [1](#capítulo-1-qué-es-una-licitación) |
| 2 | El **apartamiento de la recomendación del comité** debe motivarse por escrito | [2](#capítulo-2-quién-es-quién-en-la-cancha) |
| 3 | **La cuantía es política:** calcula la menor cuantía de tus entidades en enero | [3](#capítulo-3-las-modalidades-de-selección) |
| 4 | **La regla de las 24 horas:** carga y presenta el día anterior | [4](#capítulo-4-secop-ii--la-plataforma-sin-romanticismo) |
| 5 | **Pantallazos con reloj** y estado «Presentada» | [4](#capítulo-4-secop-ii--la-plataforma-sin-romanticismo) |
| 6 | **El RUP se planea en octubre**, no en marzo | [5](#capítulo-5-el-rup--tu-pasaporte) |
| 7 | **Inscribe códigos UNSPSC de más** — no cuesta y no obliga | [5](#capítulo-5-el-rup--tu-pasaporte) |
| 8 | **El diccionario del pliego:** compara las definiciones palabra por palabra | [6](#capítulo-6-leer-un-pliego-como-profesional) |
| 9 | **Vive en el PAA:** ventaja de seis meses sobre la competencia | [7](#capítulo-7-el-ciclo-completo-de-un-proceso) |
| 10 | **Imprime la tabla de puntaje** y cuélgala en la pared | [8](#capítulo-8-requisitos-habilitantes-vs-factores-de-puntaje) |
| 11 | **Precio bajo incertidumbre:** banda de descuento histórica y valor esperado | [9](#91-el-factor-económico-y-la-trampa-de-la-media) |
| 12 | **Industria nacional:** hasta 20 puntos por una hoja de papel | [9](#92-apoyo-a-la-industria-nacional-ley-816-de-2003) |
| 13 | **Acredita todos los factores de desempate** que cumplas | [9](#93-factores-de-desempate-ley-2069-de-2020-art-35) |
| 14 | **El «cajón de alianzas»:** 3–5 acuerdos de intención firmados de antemano | [10](#capítulo-10-consorcios-y-uniones-temporales) |
| 15 | **Due diligence de 20 minutos** del socio (SIRI, Contraloría, Policía, RNMC, SECOP) | [10](#capítulo-10-consorcios-y-uniones-temporales) |
| 16 | **El flujo de caja es el asesino silencioso:** mes a mes antes de fijar precio | [11](#capítulo-11-el-precio-cómo-costear-de-verdad) |
| 17 | **El traslado es inteligencia competitiva gratis:** descarga todas las ofertas | [12](#capítulo-12-el-traslado-del-informe-de-evaluación) |
| 18 | **Subsanación proactiva:** no esperes el requerimiento | [13](#capítulo-13-subsanación-el-capítulo-que-salva-contratos) |
| 19 | **Pluralidad de oferentes:** el argumento que casi siempre gana | [14](#141-observaciones-al-proyecto-de-pliego--la-más-poderosa-y-la-más-desaprovechada) |
| 20 | **La denuncia administrativa es más rápida que la demanda** | [16](#163-el-rechazo-de-la-oferta) |
| 21 | **«¿Me incomodaría que esto se publicara?»** — la regla de oro del contacto | [18](#palanca-2--interlocución-legítima-con-la-entidad-impacto-alto) |
| 22 | **La estrategia del nicho incómodo:** compite contra tres, no contra cuarenta | [18](#palanca-4--ingeniería-de-la-propia-oferta-impacto-alto) |
| 23 | **El acta de inicio es negociable** — no firmes si la entidad no entregó lo suyo | [20](#capítulo-20-ganaste-ahora-empieza-el-riesgo-de-verdad) |
| 24 | **Tu cupo con la aseguradora es finito** — planéalo como la caja | [20](#201-las-garantías-post-contractuales) |
| 25 | **Documenta el hecho el día que ocurre**, no el día que reclamas | [20](#202-modificaciones-contractuales) |
| 26 | **La alerta de 60 días** antes del vencimiento de cada documento | [21](#211-la-biblioteca-documental) |

**Trucos no numerados, igual de valiosos:**

| Truco | Capítulo |
|---|---|
| **El método de las 5 lecturas** del pliego (y la lectura adversarial) | [6](#capítulo-6-leer-un-pliego-como-profesional) |
| **Dos pilas físicas:** puntaje (paranoia triple) vs. habilitante (revisión normal) | [8](#capítulo-8-requisitos-habilitantes-vs-factores-de-puntaje) |
| **Los informes de la Contraloría predicen los pliegos del año entrante** | [18](#palanca-1--inteligencia-anticipada-impacto-altísimo) |
| **Responder el estudio del sector**: tu ficha técnica puede volverse la especificación | [18](#palanca-2--interlocución-legítima-con-la-entidad-impacto-alto) |
| **Ir a la audiencia de asignación de riesgos** (casi nadie va) | [18](#palanca-2--interlocución-legítima-con-la-entidad-impacto-alto) |
| **Tres observaciones impecables** valen más que treinta de desgaste | [14](#143-sobre-observar-para-desgastar) |
| **Se gana por eliminación:** blinda tu forma y revisa la de los demás | [18](#palanca-5--disciplina-documental-impacto-subestimado-enorme) |
| **La velocidad de respuesta es ergonomía**, no corrupción | [18](#palanca-6--velocidad-de-respuesta-impacto-medio-alto) |
| **El postmortem de cada proceso**, ganado o perdido | [21](#212-el-postmortem) |

---

## Índice de errores que descalifican

**Los 9 de SECOP II** ([Capítulo 4](#los-9-errores-que-descalifican-en-secop-ii)) — encabezados por
*guardar y no presentar*, que es el error #1 del país.

**Y los distribuidos por el texto:**

| Error | Consecuencia | Capítulo |
|---|---|---|
| Bajar el precio en un **concurso de méritos** | Margen destruido a cambio de cero puntos; rechazo si excede el presupuesto oficial | [3](#capítulo-3-las-modalidades-de-selección) |
| **RUP con información inscrita después del cierre** | No se pueden acreditar circunstancias posteriores al cierre (Ley 1882/2018) | [5](#capítulo-5-el-rup--tu-pasaporte) |
| Faltar un documento **de puntaje** | **No subsanable jamás.** Se pierden esos puntos | [8](#capítulo-8-requisitos-habilitantes-vs-factores-de-puntaje) |
| **Precio artificialmente bajo** sin justificación de costos | Rechazo (D. 1082, art. 2.2.1.1.2.2.4) | [9](#91-el-factor-económico-y-la-trampa-de-la-media) |
| **No presentar la garantía de seriedad** con la propuesta | Causal de rechazo **no subsanable** | [13](#capítulo-13-subsanación-el-capítulo-que-salva-contratos) |
| Los **5 errores mortales del consorcio** (firmas, autorización de junta, porcentajes, mínimo de participación, integrante inhabilitado) | Inhabilitación del consorcio entero | [10](#capítulo-10-consorcios-y-uniones-temporales) |
| **Omitir la contribución del 5 %** y las estampillas del costeo | «El olvido más caro del país» | [11](#capítulo-11-el-precio-cómo-costear-de-verdad) |
| Presupuestar «**costos adicionales**» sin soporte | Partida no deducible + rastro contable que persigue cualquier investigación | [11](#capítulo-11-el-precio-cómo-costear-de-verdad) |
| **«Mejorar» la oferta** al subsanar | Rechazo + constancia de mejora extemporánea en el expediente | [13](#capítulo-13-subsanación-el-capítulo-que-salva-contratos) |
| **Improvisar o acusar sin documento** en la audiencia | Queda grabado y puede usarse en tu contra | [15](#capítulo-15-la-audiencia-de-adjudicación) |
| **Movilizar antes del acta de inicio** firmada | Nómina sin plazo corriendo ni facturación | [20](#capítulo-20-ganaste-ahora-empieza-el-riesgo-de-verdad) |
| **Firmar el acta de liquidación sin salvedades** | **Irreversible:** se cierra la vía judicial (matizado en COMPLEMENTO § V-05) | [20](#203-la-liquidación) |
| **No firmar el contrato** tras la adjudicación | Pérdida de la garantía de seriedad + inhabilidad | [20](#capítulo-20-ganaste-ahora-empieza-el-riesgo-de-verdad) |

---

## ANEXO A — Glosario esencial

| Término | Definición |
|---|---|
| **Adenda** | Modificación formal al pliego. **Cambia las reglas.** Léela completa siempre |
| **Adición** | Modificación que aumenta el valor del contrato. Límite: 50 % del valor inicial en SMMLV |
| **AIU** | Administración, Imprevistos y Utilidad |
| **APU** | Análisis de Precios Unitarios. El desglose de cada ítem |
| **Acta de inicio** | Documento desde el cual **corre el plazo** del contrato (no desde la firma) |
| **CDP** | Certificado de Disponibilidad Presupuestal. **Hay plata reservada** |
| **Comité evaluador** | Órgano **asesor, no decisorio**, que recomienda al ordenador del gasto |
| **Consorcio** | Unión de proponentes con **responsabilidad solidaria total**; las sanciones se aplican a todos por igual |
| **Contribución especial de obra pública** | 5 % del valor del contrato de obra con entidad estatal (Ley 418/1997) |
| **CPACA** | Código de Procedimiento Administrativo y de lo Contencioso Administrativo (Ley 1437/2011) |
| **Documentos tipo** | Pliegos estandarizados **obligatorios** (Ley 2022/2020) |
| **Estampillas** | Tributos departamentales/municipales acumulables (0.5 %–5 %). Varían por entidad |
| **Habilitante** | Requisito de **pasa/no pasa**. No da puntos. **Subsanable** |
| **Liquidación** | Cierre de cuentas del contrato. **Sin salvedades = renuncia a reclamar** (matizado en COMPLEMENTO § V-05) |
| **Menor cuantía** | Umbral calculado sobre el **presupuesto anual de la entidad en SMMLV** |
| **Ordenador del gasto** | Quien **adjudica**. Si se aparta del comité, debe motivarlo por escrito |
| **PAA** | Plan Anual de Adquisiciones. **Tu bola de cristal legal.** Se publica a más tardar el 31 de enero |
| **Pliego sastre** | Pliego escrito **a la medida de un oferente** |
| **Prórroga** | Modificación que aumenta el plazo. Sin el límite del 50 % |
| **RNMC** | Registro Nacional de Medidas Correctivas (Policía Nacional) |
| **RP** | Registro Presupuestal. **La plata quedó comprometida** para tu contrato |
| **RUP** | Registro Único de Proponentes. **Tu pasaporte.** Renovación: quinto día hábil de abril |
| **SECOP I / SECOP II** | Portal de publicidad / plataforma transaccional de contratación |
| **SIC** | Superintendencia de Industria y Comercio. Investiga **colusión** |
| **SIRI** | Sistema de Información de Registro de Sanciones (Procuraduría) |
| **SMMLV** | Salario Mínimo Mensual Legal Vigente. Unidad de medida de toda la contratación |
| **Subsanar** | Aportar o corregir un documento **habilitante** dentro del término |
| **TRM** | Tasa Representativa del Mercado. Su **primer decimal sortea el método** de ponderación económica |
| **Traslado** | Término para observar el informe de evaluación. **Y para leer las ofertas ajenas** |
| **TVEC** | Tienda Virtual del Estado Colombiano |
| **UNSPSC** | Código estándar con el que el Estado nombra lo que compra. El RUP se inscribe a nivel de **clase** |
| **Unión Temporal** | Igual que el consorcio, pero **las sanciones se aplican según el porcentaje declarado** |

---

## ANEXO B — Los 20 mandamientos del analista

1. **Cargar la oferta el día anterior al cierre.** Siempre.
2. **Verificar que el estado diga «Presentada»**, no «En creación».
3. **Leer las causales de rechazo** antes que cualquier otra cosa.
4. **Separar la carpeta** en pila de puntaje (paranoia triple) y pila habilitante.
5. **Descargar el PAA en febrero** y armar el calendario del año.
6. **Renovar el RUP** antes del quinto día hábil de abril.
7. **Observar el proyecto de pliego** con redacción alternativa lista para pegar.
8. **Nunca prometer un personal clave** que no tienes vinculado.
9. **Verificar los antecedentes del socio** de consorcio antes de firmar.
10. **Sumar la contribución del 5 %** de obra pública y las estampillas. Siempre.
11. **Hacer el flujo de caja mes a mes** antes de fijar el precio.
12. **Responder la subsanación con tabla de trazabilidad** y ni una línea de más.
13. **Descargar todas las ofertas** de todos los competidores en cada traslado.
14. **Acreditar todos los factores de desempate** que legítimamente cumples.
15. **No firmar el acta de inicio** si la entidad no entregó lo suyo.
16. **Documentar cada hecho el día que ocurre**, con foto y radicado.
17. **Nunca firmar el acta de liquidación sin salvedades.** (Su efecto, matizado en COMPLEMENTO § V-05.)
18. **Usar siempre el canal formal.** Si te incomodaría que se publicara, no lo hagas.
19. **Hacer el postmortem** de cada proceso, ganado o perdido.
20. **Mantener la tasa de rechazo por forma en cero.** Es lo único que depende enteramente de ti.

---

*Fin del manual.* Los anexos de formatos editables, el guion de diapositivas, los guiones de video, el
modelo de costeo en Excel y el examen de certificación se entregan como archivos independientes.
