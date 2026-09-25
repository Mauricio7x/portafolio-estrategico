# Proponente plural: la norma vigente, 241 pliegos reales y las cifras de los RUP

> Para: dueño · Estado: informe fechado · Sustituido por: —

> Foto del **25-sep-2026**, hecha CON internet. El estado se mide con `node tests/estado.js`; las
> coordenadas, con `node tests/mapa.js`. Las decisiones que abre y los pendientes viven en
> `docs/MEMORIA.md` § «Proponente plural: la norma dice sumar los balances, no promediar los índices, y el
> reparto lo ata la experiencia (25-sep-2026)». Nada de lo que sigue cambió todavía el cálculo de la app:
> el dueño pidió ver esto ANTES.

## 0. En una pantalla

1. **En TODOS los Documentos Tipo vigentes de obra** (transporte, infraestructura social, agua potable;
   licitación, menor cuantía, mínima cuantía, interventoría y consultoría), el consorcio se evalúa
   **sumando los balances** de los socios: liquidez = (activo corriente de todos) ÷ (pasivo corriente de
   todos). **El porcentaje de participación no mueve** la liquidez, el endeudamiento, la cobertura de
   intereses, las rentabilidades ni el capital de trabajo.
2. **Lo que sí ata el reparto en un Documento Tipo es la EXPERIENCIA**: un socio aporta al menos el 50 % de
   la experiencia solicitada, cada uno de los demás al menos el 5 %, y solo uno puede no aportar nada, en
   cuyo caso su participación **no puede pasar del 10 %**. Para Helder: si no aporta experiencia, queda en
   10 % como máximo; para subir de ahí tiene que aportar al menos el 5 % de la experiencia pedida.
3. **La capacidad residual (K) también depende del reparto**: la experiencia de cada socio se mide contra
   «presupuesto × su porcentaje de participación». A más participación de Helder, menor su factor E.
4. **No hay en la norma un mínimo «frecuente del 30 % o 40 %»** para quien aporta la experiencia. El 40 % es
   el del puntaje por trabajadores con discapacidad (Decreto 392 de 2018); el 30 % es una propuesta de un
   ciudadano que Colombia Compra no acogió. En la muestra de 241 pliegos reales, **22 (9 %)** fijan algún
   mínimo de participación, **todos fuera del Documento Tipo**, con cifras del 10 % al 70 %.
5. **Hoy la app calcula el consorcio promediando los índices** (Σ liquidez × %). Ni el Manual de Colombia
   Compra ni ningún Documento Tipo lo hace así, y solo 9 de 241 pliegos (4 %). Medido: Helder + PRODIAC al
   50/50 enseña liquidez **65,55**; el evaluador calculará **2,13**.

## 1. Comprobación de red (25-sep-2026, ~12:40 UTC, desde el entorno «Detekta con internet»)

| Destino | Resultado |
|---|---|
| `https://www.colombiacompra.gov.co` | **200** |
| `https://www.datos.gov.co` (y la API SODA de `p6dx-8zbt`, `jbjy-vk9h`, `dmgg-8hin`) | **200** |
| `https://community.secop.gov.co` (raíz) | **403** del cortafuegos del propio SECOP («Microsoft-Azure-Application-Gateway/v2»), no del proxy |
| `…/Public/Tendering/ContractNoticeManagement/Index` con agente de navegador | **302 → reCAPTCHA** |
| `…/Public/Archive/RetrieveFile/Index?DocumentId=…` (descarga de un documento) | **200** `application/pdf`: los pliegos SÍ se pueden bajar |
| `https://portafolio-estrategico.vercel.app/api/procesos?op=salud` | **200**, `ok:true`, última sincronización 25-sep 07:21:41 UTC |

## 2. Cómo se calculan los indicadores de un plural (encargo 2a)

### 2.1 Los Documentos Tipo vigentes: suma de componentes, sin participación

La fórmula es la misma en las trece modalidades vigentes de obra (y en la nueva de agua que rige desde marzo
de 2027), leída en la ecuación del documento
(OMML del .docx), no parafraseada: **«Si el Proponente es Plural cada indicador debe calcularse así:
Indicador = (∑ Componente 1 del indicador_i) / (∑ Componente 2 del indicador_i) Donde n es el número de
integrantes del Proponente Plural (Unión Temporal o Consorcio).»** El capital de trabajo: **«CT proponente
plural = ∑ CT_i»**. Ninguna de las dos lleva el porcentaje de participación.

| Familia · modalidad | Versión vigente | Acto | Numeral (financiera / organizacional / CT) | Fuente |
|---|---|---|---|---|
| Transporte · licitación de obra | v4, avisos desde 3-feb-2025 | Res. 465 de 2024 | 3.6 / 3.9 / 3.7 | [descarga/29920](https://www.colombiacompra.gov.co/documentos-tipo/descarga/29920/) |
| Transporte · menor cuantía | v3, desde 3-feb-2025 | Res. 463 de 2024 | 3.6 / 3.8 / 3.7 | [descarga/29950](https://www.colombiacompra.gov.co/documentos-tipo/descarga/29950/) |
| Transporte · mínima cuantía | v2 con Res. 464 de 2024 | Res. 625 de 2022 | 4.6 (solo financiera) | [descarga/30021](https://www.colombiacompra.gov.co/documentos-tipo/descarga/30021/) |
| Transporte · interventoría | v3, desde 3-feb-2025 | Res. 725 de 2024 | 3.5 / 3.7 / 3.6 | [descarga/29953](https://www.colombiacompra.gov.co/documentos-tipo/descarga/29953/) |
| Transporte · consultoría de estudios | v2, desde 3-feb-2025 | Res. 726 de 2024 | 3.5 / 3.7 / 3.6 | [descarga/29824](https://www.colombiacompra.gov.co/documentos-tipo/descarga/29824/) |
| Infraestructura social · licitación | v2, avisos desde 16-feb-2026 | Res. 539 de 2025 | 3.6 / 3.9 / 3.7 | [descarga/29837](https://www.colombiacompra.gov.co/documentos-tipo/descarga/29837/) |
| Infraestructura social · menor cuantía | v1, desde 16-feb-2026 | Res. 540 de 2025 | 3.6 / 3.8 / 3.7 | [descarga/29561](https://www.colombiacompra.gov.co/documentos-tipo/descarga/29561/) |
| Infraestructura social · mínima cuantía | v1, desde 16-feb-2026 | Res. 541 de 2025 | 4.6 (solo financiera) | [descarga/29582](https://www.colombiacompra.gov.co/documentos-tipo/descarga/29582/) |
| Infraestructura social · interventoría | v2, desde 16-feb-2026 | Res. 953 de 2025 | 3.5 / 3.7 / 3.6 | [descarga/29844](https://www.colombiacompra.gov.co/documentos-tipo/descarga/29844/) |
| Infraestructura social · consultoría | v1, desde 16-feb-2026 | Res. 952 de 2025 | 3.5 / 3.7 / 3.6 | [descarga/29624](https://www.colombiacompra.gov.co/documentos-tipo/descarga/29624/) |
| Agua potable · licitación de obra | Documento Base CCE-EICP-GI-09 **v4** | Res. 248 de 2020 modificada por la Res. 275 de 2022 (art. 105) | 3.6 / 3.9 / 3.7 | [ZIP Res. 275](https://www.colombiacompra.gov.co/wp-content/uploads/2024/09/04._licitacion_-_infraestructura_apsab_-_res._275_-_2022.zip) |
| Agua potable · llave en mano | CCE-EICP-GI-10 v4 | Res. 249 de 2020 mod. Res. 275 de 2022 | 3.6 | [descarga/29523](https://www.colombiacompra.gov.co/documentos-tipo/descarga/29523/) |
| Agua potable · interventoría | CCE-EICP-GI-20 v1, desde 3-oct-2022 | Res. 333 de 2022 | 3.5 | [descarga/29529](https://www.colombiacompra.gov.co/documentos-tipo/descarga/29529/) |
| Agua, saneamiento y estructuras hidráulicas · licitación (NUEVA) | v2, **solo avisos desde el 1-mar-2027** | Res. 546 de 2026 | 3.6 | [descarga/30129](https://www.colombiacompra.gov.co/documentos-tipo/descarga/30129/) |

**Trampa del portal, medida**: el ZIP que la página de agua potable rotula «Versión vigente a partir del 29
de agosto de 2022» ([descarga/29511](https://www.colombiacompra.gov.co/documentos-tipo/descarga/29511/)) trae
en realidad el Documento Base **v1 de 2020, obsoleto**: lo dice su encabezado («Versión No. 1»), su listado
maestro ([descarga/29514](https://www.colombiacompra.gov.co/documentos-tipo/descarga/29514/), págs. 5-6: v1
«Obsoleto», v4 «Vigente a partir del 29/08/2022 – Resolución 275 de 2022») y es idéntico byte a byte al que
el portal archiva como no vigente. Dos de los agentes de esta investigación cayeron en él. El vigente es el
del enlace «Res. 275» de la tabla.

Tampoco es obra de la app: los convenios solidarios (Res. 358 de 2023) solo admiten organismos de acción
comunal, y la gestión catastral (Res. 269 de 2020) no es obra.

**Los Documentos Tipo son inalterables**: «Las entidades estatales contratantes no podrán incluir o
modificar dentro de los Documentos del Proceso las condiciones habilitantes […] distintos a los señalados
en los Documentos Tipo» (Decreto 1082 de 2015, art. 2.2.1.2.6.1.4; Documento Base transporte v4, num. 1.17;
Res. 465 de 2024, art. 3; conceptos C-034 y C-1221 de 2026). Colombia Compra explica por qué suman sin
ponderar: para «promover la participación y aumentar la pluralidad de oferentes» (concepto C-688 de 2024).

### 2.2 Fuera de los Documentos Tipo: el Manual deja elegir entre cuatro, y ninguna es la de la app

Manual para determinar y verificar los requisitos habilitantes, **CCE-EICP-MA-04 versión 03 del 29-sep-2023**
(el vigente; el código «M-DVRHPC» es de las versiones de 2013-2014), numeral **5.4**, págs. 32-35
([PDF](https://www.colombiacompra.gov.co/wp-content/uploads/2024/08/cce-eicp-ma-04._manual_requisitos_habilitantes_v3_29-09-2023.pdf)):
«La Entidad Estatal debe determinar y justificar en los Documentos del Proceso la metodología para calcular
los indicadores de los proponentes plurales». Las opciones:

| Tipo de indicador | Opción | Fórmula |
|---|---|---|
| En pesos (capital de trabajo) | 1 · sumatoria ponderada | Σ CT_i × participación_i |
| En pesos | 2 · sumatoria simple | Σ CT_i |
| Razones (liquidez, endeudamiento, cobertura, rentabilidades) | 3 · suma de componentes | Σ numerador_i / Σ denominador_i |
| Razones | 4 · ponderación de componentes | Σ (numerador_i × part._i) / Σ (denominador_i × part._i) |

**No existe la opción de promediar los índices ya calculados** (Σ liquidez_i × participación_i) en ninguna
de las tres versiones leídas (M-DVRHPC-01 de 2013, M-DVRHPC-04 de 2014 y MA-04 v03 de 2023). Las notas al pie
35 y 36 prefieren las opciones que ponderan (1 y 4), pero es una preferencia, no un mandato. Los indicadores
ponderados se expresan con dos decimales **truncados**, «sin aproximaciones» (concepto C-626 de 2026).

### 2.3 Lo que hace hoy la app, y cuánto se aparta (MEDIDO con las cifras certificadas)

`derivarPlural` (`lib/perfiles.js`) pondera los ÍNDICES. Con los componentes del corte 31/12/2025 de cada
RUP (tabla del apartado 5), truncando a dos decimales como las cámaras:

| Consorcio | Documento Tipo (suma de componentes; el % no importa) | App hoy, 50/50 | App hoy, 70/30 | Opción 4 del Manual, 70/30 |
|---|---|---|---|---|
| Helder + Génesis | liquidez 25,60 · endeudamiento 0,06 · cobertura 293,32 · ROE 0,26 · ROA 0,24 | 68,05 · 0,08 · 415,75 | 92,47 · 0,06 · 514,53 | 43,08 · 0,05 · 386,24 |
| Helder + PRODIAC | **liquidez 2,13 · endeudamiento 0,36 · cobertura 9,96** · ROE 0,24 · ROA 0,15 | **65,55 · 0,21 · 335,90** | 90,97 · 0,14 · 466,62 | 2,32 · 0,33 · 11,07 |

Al 50/50 la opción 4 coincide con la suma simple (los pesos iguales se cancelan); fuera del 50/50 difieren.
Capital de trabajo del consorcio según el Documento Tipo (suma simple): Helder + Génesis 936.199.572,18;
Helder + PRODIAC 5.661.696.684,18.

### 2.4 Capacidad residual del plural (Guía CCE-EICP-GI-22, v01 del 29-sep-2023, «de obligatoria observancia»)

[PDF de la Guía](https://www.colombiacompra.gov.co/wp-content/uploads/2024/08/2023-Guia-para-determinar-y-verificar-la-Capacidad-Residual-del-proponente-en-los-Procesos-de-Contratacion-de-obra-publica-CCE-REC-GI-22.pdf).

- **Confirma** lo que la app hace al final: la K del plural es la suma de la K de cada integrante «sin tener
  en cuenta el porcentaje de participación» (num. 11, p. 19; concepto C-1732 de 2025). Pero «en caso de ser
  negativa la Capacidad Residual de uno de los miembros, este valor se restará»: la app la recorta a 0.
- **Desmiente** el factor de experiencia: E_i = **valor total** de los contratos del segmento 72 inscritos en
  el RUP (los de consorcio, × la participación que tuvo) ÷ (**presupuesto oficial × % de participación del
  integrante** en el plural nuevo) (num. 9.2, p. 11-12; Anexo 1, p. 31). La app usa el **mayor contrato** y el
  presupuesto entero.
- **Desmiente** las escalas (Tablas 4 y 5, p. 13), reproducido con `node`: razón E de 3 → app 120 puntos,
  Guía 60; liquidez 0,9 → app 0, Guía 30; liquidez 1,5 → app 40, Guía 35. La capacidad de organización tiene
  un piso de USD 125.000 que la app no aplica.
- Ejemplo oficial de la Guía (Consorcio AB, p. 20-22) reproducido con sus tablas: 17.340.000.000 exactos.

## 3. El porcentaje mínimo de participación (encargo 2b)

### 3.1 Lo que dicen los Documentos Tipo: se reparte la EXPERIENCIA, no la participación

Transporte v4, num. **3.5.3 literal D** (igual en las modalidades de la tabla 2.1, cada una con su numeral):
**«Tratándose de Proponentes Plurales se tendrá en cuenta lo siguiente: i) uno de los integrantes debe
aportar como mínimo el cincuenta por ciento (50 %) de la experiencia solicitada; ii) los demás integrantes
deben acreditar al menos el cinco por ciento (5 %) de la experiencia solicitada; y iii) sin perjuicio de lo
anterior, solo uno (1) de los integrantes, si así lo considera pertinente, podrá no acreditar experiencia. En
este último caso, el porcentaje de participación del integrante que no aporta experiencia en la estructura
plural no podrá superar el diez por ciento (10 %).»**

- Los porcentajes se calculan sobre el «valor mínimo a certificar (como % del Presupuesto Oficial de obra
  expresado en SMMLV)»: 75 % con 1-2 contratos, 120 % con 3-4, 150 % con 5 (obra); 100 % del presupuesto en
  interventoría y consultoría. Para esta regla basta acreditar SMMLV, sin longitudes ni magnitudes.
- En agua potable el tope fue **5 %** del 11-dic-2020 al 28-ago-2022 (versiones 1 a 3) y es **10 %** desde el
  29-ago-2022 (Res. 275 de 2022, art. 101, hoja 89).
- Si el plural no cumple estos porcentajes, no se le habilita en experiencia (concepto C-243 de 2021), y los
  porcentajes de participación no se pueden cambiar después del cierre: sería mejorar la oferta (C-695 de
  2026, C-226 de 2025; Documento Base v4 num. 3.3.3).
- En menor cuantía, los porcentajes de la manifestación de interés son indicativos y pueden cambiar antes
  del cierre, pero no los integrantes (Documento Base transporte menor cuantía v3, num. 2.3; causales AA-CC).

### 3.2 Lo que dice Colombia Compra cuando un pliego SÍ fija un mínimo

- **C-496 de 2026** (mínima cuantía): exigir que el integrante que aporta la experiencia tenga el 50 % «podría
  resultar contraria a los principios de selección objetiva, pluralidad de oferentes y libre concurrencia»
  ([concepto](https://relatoria.colombiacompra.gov.co/conceptos/c-496-de-2026/)).
- **C-648 de 2024**: la entidad es autónoma para fijar habilitantes y puede exigir un mínimo si lo dice con
  claridad y sin limitar la concurrencia ([concepto](https://relatoria.colombiacompra.gov.co/conceptos/c-648-de-2024/)).
- Los conceptos no obligan (art. 28 de la Ley 1437 de 2011, sustituido por la Ley 1755 de 2015). En cada
  proceso manda el pliego; si el proceso es de Documento Tipo, manda el Documento Tipo.

### 3.3 De dónde sale el «frecuentemente 30 % o 40 %» (la guía del proyecto lo dice sin fuente)

- **40 %**: es la parte de la EXPERIENCIA que debe aportar el integrante cuya planta de personal cuenta para
  el PUNTAJE por trabajadores con discapacidad (Decreto 392 de 2018; concepto C-436 de 2020). No habilita. El
  Decreto 287 de 2026 lo cambió al «integrante con mayor participación porcentual» (C-572 de 2026), pero los
  procesos de Documento Tipo siguen con el 40 % hasta que Colombia Compra actualice los documentos (C-587 y
  C-1221 de 2026), y los procesos abiertos hasta el 19-mar-2026 siguen con la regla anterior (C-572).
- **30 %**: la única aparición en la relatoría es la propuesta de un ciudadano sobre socios de sociedades
  nuevas, que Colombia Compra no acogió (C-585 de 2026).
- Barrido del agente: 7.566 fichas de conceptos (2019-2026) y el texto completo de 1.751; su verificador
  repasó las 919 fichas publicadas entre el 29-abr y el 24-sep-2026. Ninguno halló otra fuente.

### 3.4 Lo que exigen 241 pliegos reales de SECOP II (2025-2026)

Muestra: procesos de datos.gov.co (`p6dx-8zbt`) publicados desde marzo de 2025, como máximo dos por
entidad; pliego, Matriz 1, Matriz 2 o estudios previos bajados de SECOP II con el índice de archivos
(`dmgg-8hin`). Cada pliego lo leyó un agente y lo revisó otro escéptico (cita comprobada contra el texto;
fórmulas en imagen miradas renderizando la página). Hubo disputa en 31 procesos: las 23 que cambiaban una
cifra de la tabla se aplicaron a mano, una por una; las demás eran de página, o citas de PDF escaneado que el
escéptico confirmó mirando la imagen.

| | Licitación de obra | Menor cuantía de obra | Concurso de méritos | Régimen especial (ESE, empresas) | **Total** |
|---|---|---|---|---|---|
| Procesos leídos | 79 | 68 | 44 | 50 | **241** |
| Regla estándar 50/5/10 del Documento Tipo | 56 | 47 | 25 | 6 | **134 (56 %)** |
| Otro reparto de experiencia | 12 | 7 | 9 | 11 | 39 |
| Sin regla de reparto | 11 | 12 | 10 | 30 | 63 |
| **Mínimo de participación habilitante** | 7 | 3 | 4 | 8 | **22 (9 %)** |
| Indicadores: suma de componentes sin ponderar | 57 | 51 | 28 | 13 | **149 (62 %)** |
| Indicadores: componentes ponderados | 13 | 6 | 10 | 9 | 38 (16 %) |
| Indicadores: **índices ponderados (lo de la app)** | 1 | 2 | 1 | 5 | **9 (4 %)** |
| Indicadores: mixto, ambiguo o contradictorio | 5 | 8 | 2 | 15 | 30 |

**Ninguno de los 134 pliegos con la regla estándar añade un mínimo de participación.** Los 22 que lo fijan
(todos por fuera de esa regla):

| Proceso | Entidad | Regla literal (resumida) | Dónde |
|---|---|---|---|
| CO1.REQ.10433774 | Gobernación del Putumayo | si un integrante aporta TODA la experiencia, ≥30 % | pliego p. 54 |
| CO1.REQ.8818282 | Alcaldía de Popayán | el que acredita toda la experiencia, ≥30 % | pliego p. 30 |
| CO1.REQ.8274512 | Rama Judicial, Medellín | si uno solo aporta la experiencia, ≥70 % | pliego p. 51 |
| CO1.REQ.8293694 | Municipio de Tuta | quien aporta el 50 % de la experiencia, ≥10 % | pliego p. 44 |
| CO1.REQ.10617531 | Municipio de Yumbo | uno ≥60 % y ninguno <20 % | estudios previos p. 19 |
| CO1.REQ.10170773 | Alcaldía de Santa Marta | quien aporte la mayor experiencia, participación mayoritaria (sin cifra) | pliego p. 30 |
| CO1.REQ.9036004 | Municipio de Tibasosa | quien aporte la mayor experiencia, participación mayor (sin cifra) | pliego p. 44 |
| CO1.REQ.10418852 | Municipio de Funza | los que aportan experiencia, ≥20 % cada uno | pliego p. 24 |
| CO1.REQ.10982369 | Localidad Isla del Cascajal | el de mayor participación ≥40 % y es quien acredita la experiencia | pliego p. 16 |
| CO1.REQ.7888786 | I. E. Luis Carlos Galán Sarmiento (Casanare) | quien aporta la experiencia, ≥30 % | pliego p. 43 |
| CO1.REQ.10209401 | Región de Planeación del Valle | quien acredita el contrato de metodología, ≥40 % | pliego p. 39-40 |
| CO1.REQ.10468360 | Gobernación de Nariño | si uno acredita más del 50 % de la experiencia, ≥50 % | pliego p. 52 |
| CO1.REQ.10407811 | CRA del Atlántico | el de mayor experiencia ≥20 % (condicional: dudoso si solo es de puntaje) | pliego |
| CO1.REQ.10204275 | Distrito de Cali | el integrante con sucursal en Cali, ≥10 % (no es experiencia) | pliego p. 51 |
| CO1.REQ.10294381 | ESE Centro de Salud Santa Bárbara | quien aporta la experiencia, ≥50 % | pliego p. 41 |
| CO1.REQ.9396645 | Universidad Pedagógica Nacional | quien acredita la experiencia, ≥40 % | pliego p. 27 |
| CO1.REQ.9423689 | Empresa de Energía de Casanare | quien aporta la experiencia, ≥30 % | pliego p. 62 |
| CO1.REQ.11059792 | Metro Cali | quien aporta la mayor experiencia, ≥30 % | términos p. 45 |
| CO1.REQ.8760398 | ESE Hospital San Martín de Porres | uno ≥50 % y ninguno <30 % | pliego p. 32 |
| CO1.REQ.8686783 | «HSVPG» (así figura la entidad en SECOP II) | ninguno <30 % | estudios previos p. 15 |
| CO1.REQ.10741919 | Empresa de Vivienda de Antioquia | ninguno <33,33 % | condiciones p. 41 |
| CO1.REQ.9373745 | ESE Hospital San Antonio del Tequendama | el que asume las responsabilidades, la mayoría (sin cifra) | pliego p. 17 |

Cada proceso se abre en `https://community.secop.gov.co/Public/Tendering/OpportunityDetail/Index?noticeUID=<aviso>`;
el aviso y la dirección de cada documento están en los datos de la cosecha (ver «Método»).

**Hallazgos que el lector de pliegos tendrá que aprender** (nada de esto está programado todavía):
la cláusula aparece en tres formas —mínimo de quien aporta experiencia, mínimo de cada integrante, y «el de
mayor experiencia tiene la mayoría»—; a veces solo en los estudios previos y no en el pliego (Yumbo,
HSVPG); y en varios pliegos (no se contaron) la fórmula financiera del plural es una IMAGEN que el texto
no trae o contradice (Santa Marta: el texto dice «por el porcentaje de participación» y la fórmula impresa
suma sin ponderar).

### 3.5 Porcentajes de participación que NO habilitan pero sí cuentan

Aparecen en casi todos los pliegos de Documento Tipo y dependen del reparto: 10 % del integrante Mipyme o
emprendimiento de mujeres para los indicadores Mipyme de la Matriz 2, para aportar 1 o 2 contratos
adicionales de experiencia y para los puntajes Mipyme y de mujeres; 25 % de participación y 25 % de la
experiencia en los desempates (Mipyme en plural, nómina con discapacidad, madre cabeza de familia); 40 % de
la experiencia para el puntaje por discapacidad (Decreto 392 de 2018; ver 3.3).

## 4. Cómo se acredita la experiencia de un plural (encargo 2c)

Documento Base transporte v4, num. 3.5 a 3.5.9 (igual en social v2 y agua v4, con su numeración):

- La experiencia del plural es la **suma** de la que aporta cada integrante (1 a 5 contratos; 6 o 7 si un
  integrante Mipyme o de mujeres tiene ≥10 %). Todos los contratos cuentan para el número de contratos, que
  fija el valor mínimo a certificar (75/120/150 %).
- Un contrato ejecutado antes en consorcio vale **el valor registrado en el RUP × el porcentaje que el
  integrante tuvo en ESE contrato** (3.5.3 F-G); la longitud o magnitud exigida también se afecta por ese
  porcentaje (3.5.3 H). Si dos integrantes del plural nuevo ejecutaron juntos un contrato, cuenta como UNO,
  con la suma de sus porcentajes.
- SMMLV del año de terminación, redondeados a la unidad (1.13 B). RUP con los códigos del segmento 72
  (obra) u 80-81 (interventoría y consultoría) hasta el tercer nivel.
- **Contratos con particulares y subcontratos se aceptan**, pero exigen además una certificación de
  facturación posterior a la terminación, firmada por el revisor fiscal o contador de quien EJECUTÓ el
  contrato (transporte 3.5.7, social 3.5.7, agua 3.5.6; conceptos C-513 de 2024 y C-926 de 2026). Un
  subcontrato de un contrato estatal pide dos certificaciones: la del contratista principal y la de la
  entidad (transporte 3.5.8).
- **Experiencia de socios** (100 de los 108 contratos de Génesis): la regla de los tres años se mira al
  INSCRIBIR en el RUP, no al ofertar; «pasado este tiempo, la sociedad conservará esta experiencia, tal y
  como haya quedado registrada en el RUP» (transporte v4 3.5.2 E; social v2 3.5.1 J; conceptos C-1074,
  C-943 y C-1123 de 2026), siempre que se haya inscrito antes de cumplir la sociedad tres años y que el RUP se
  haya renovado a tiempo cada año. **Si el socio que la aportó se retiró, la doctrina está DIVIDIDA**:
  C-560, C-585, C-1114, C-1166 y C-1196 de 2026 (este último dice «se unifica el criterio») dicen que se
  pierde; C-943 de 2026 dice que se conserva «aun cuando con posterioridad el accionista, socio o
  constituyente se retire». Si el plural lo forman la sociedad y un socio, el contrato transferido se
  acredita una sola vez. El certificado de Génesis no imprime en qué renovación entró cada contrato: el
  bloque N.º 89 a 103 (13.152,98 SMMLV) pudo entrar en la renovación registrada el 17/07/2020, seis días
  después de cumplir tres años (la fecha impresa es la del registro, no la de la solicitud).
- Toda persona natural integrante del plural debe tener título de ingeniero con matrícula vigente (Ley 842
  de 2003; Documento Base transporte v4, num. 2.1). Una misma persona no puede estar en dos ofertas del mismo
  proceso: Helder no puede ir a la vez con Génesis y con PRODIAC (causales de rechazo, num. 1.15).
- La vigencia de la estructura plural debe ser el plazo del contrato más un año (3.3.3 D).

## 5. Las cifras de los RUP, leídas del certificado (encargo 5)

Los cuatro certificados de la carpeta «RUP´S» del Drive del dueño, leídos enteros el 25-sep-2026 (Helder
47 de 47 págs.; Génesis 259 de 259; PRODIAC 2.423 de 2.423 en cinco archivos, más 46 páginas finales que son
otra copia del RUP de Helder; PICS 96 de 96). Tres extractores de texto distintos, revisión visual de los
bloques financieros y un verificador adversario por certificado: **0 discrepancias de dato en 547 contratos**.
Los indicadores publicados coinciden con los componentes **truncando** a dos decimales, salvo uno (abajo).

| Corte 31/12/2025 | Helder (págs. 44-45) | Génesis (págs. 11-12) | PRODIAC (págs. 17-18) |
|---|---|---|---|
| Firmeza en ese certificado | en proceso de adquirir firmeza (renovación del 28/04/2026) | en firme | en firme |
| Activo corriente | 748.908.684,18 | 225.344.006,00 | 9.908.649.000,00 |
| Activo total | 1.165.295.964,18 | 243.594.006,00 | 13.705.196.000,00 |
| Pasivo corriente | 5.800.000,00 | 32.253.118,00 | 4.990.061.000,00 |
| Pasivo total | 58.043.000,00 | 32.253.118,00 | 5.395.490.000,00 |
| Patrimonio | 1.107.252.964,18 | 211.340.888,00 | 8.309.706.000,00 |
| Utilidad operacional | 198.810.000,00 | 150.244.977,00 | 2.129.512.000,00 |
| Gastos de intereses | 300.000,00 | 890.000,00 | 233.466.000,00 |
| Liquidez · endeudamiento · cobertura | 129,12 · 0,04 · 662,70 | 6,98 · 0,13 · 168,81 | 1,98 · 0,39 · **9,11** |
| Rentabilidad del patrimonio · del activo | 0,17 · 0,17 | 0,71 · 0,61 | 0,25 · 0,15 |

Alertas que cambian una decisión:

- **Helder tiene dos cortes.** El de 31/12/2024 (págs. 6-7) está en firme: liquidez 289,99, cobertura 5,68,
  rentabilidades 0. El de 2025 figura «en proceso de adquirir firmeza» en el certificado del 07/05/2026; la
  copia del 27/05/2026 que viene dentro del archivo de PRODIAC ya lo trae EN FIRME y con las mismas cifras.
- **La cobertura de PRODIAC**: el certificado publica 9,11, pero sus propios componentes dan 9,12. Vale el
  publicado.
- **El «mayor contrato» del repositorio no es lo acreditable.** Helder: 6.768,87 SMMLV es un consorcio al
  40 % → acredita 2.707,55; su mayor contrato propio es de 4.820 SMMLV, con «CHF INTERNACIONAL- RED DE
  SOLIDARIDAD» (si es entidad estatal o particular no está verificado; si es particular, pide además la
  certificación de facturación del apartado 4). Génesis:
  31.593,88 al 75 % → 23.695,41, y lo celebró un socio. PRODIAC: 18.264,85 es propio (CORTOLIMA).
- **Génesis vive de la experiencia de sus socios**: 100 de 108 contratos (97,5 % de sus SMMLV) son «socio /
  asociado». Vale con las condiciones del apartado 4; si un socio se retiró, es un riesgo disputado. Sin esa
  experiencia, sus cinco mejores contratos (valor × porcentaje; 100 % donde no se imprime) bajan de
  58.878,81 a 3.276,15 SMMLV. Hay un probable contrato duplicado
  (N.º 5 y N.º 90, Universidad del Tolima, 3.073,73 SMMLV al 20 %) y un porcentaje impreso «0.5%» (N.º 82).
- **PRODIAC es gran empresa**: con ella el consorcio queda fuera de toda convocatoria limitada a Mipyme.
- **Los cuatro certificados ya pasaron sus 60 días de verificación en línea**: para ofertar hacen falta
  certificados nuevos.
- **Ninguno trae la sección de multas y sanciones** (eso es «no reporta», no «cero»). PRODIAC sí trae
  contratos reportados por entidades, incluidos dos en ejecución (INVIAS 1168 de 2013, FAC CACOM-6 de 2024).
- Experiencia en el segmento 72 (la que usa la K), sumando valor × porcentaje y suponiendo 100 % donde el
  certificado no imprime porcentaje: Helder 19.330,60 SMMLV; Génesis 134.465,18; PRODIAC 182.865,61.

El detalle contrato por contrato no se publica aquí: este repositorio es público y los certificados traen
nombres y cédulas de personas naturales.

## 6. La sincronización y `historico_hace_dias` (encargo 4)

Diagnóstico de solo lectura, con su verificador adversario (lo MEDIDO se ejecutó; lo PROBABLE no se pudo
ver sin los registros de Vercel):

- **MEDIDO**: la corrida de la tarde desde GitHub (`.github/workflows/sync.yml`) falló las 19 veces entre el
  7 y el 24-sep con «HTTP 401 … Token ausente»: el secreto `CRON_SECRET` está vacío en GitHub (en Vercel sí
  existe). En la práctica solo hay un disparo diario.
- **MEDIDO**: el 24-sep a las 17:01 UTC SECOP volvió a sellar el `:updated_at` de sus 9.217.412 filas. El delta,
  que filtra por esa columna, ya no distingue nada: cada ciclo relee las 1.402.242 filas de 2026 (unas 281
  páginas de 11,8 MB).
- **MEDIDO**: la «última sincronización» es el INICIO de la corrida que cerró, no su fin. La del 25-sep
  07:21:41 fue una carga completa que terminó a las 12:29:14 (5 h 07 min), según `/api/diagnostico`
  consultado por el primer agente; el verificador no pudo repetir esa consulta.
- **PROBABLE, sin registros de Vercel**: la auto-llamada que encadena los tramos (`fetch` sin esperar, justo
  antes de responder) se pierde; o el tramo muere por memoria (una página de 11,8 MB ocupa ~9,8 MB al
  leerla; el delta junta todas antes de repartir); o el muro de protección de Vercel la detiene.
- **`historico_hace_dias` es null** porque la extracción del histórico (2024-01 a 2026-09) empezó el 15-sep
  y está parada en el mes 17 de 33 (2025-06), sin candado. El sello solo se escribe al terminar. La salud no
  avisa de una extracción abierta y parada: por eso decía `ok:true`.

## Método, fuentes y límites

- Quince agentes de norma (catálogo de Documentos Tipo; un lector y un verificador por cada una de las cinco
  familias; Manual, Guía de capacidad residual y Decreto 1082 con su verificador; conceptos y jurisprudencia
  con su verificador) y seis más para tres huecos (experiencia de socios, contratos con particulares y tope
  de agua potable), cada uno con su verificador. Toda cita se copió del documento; lo
  inferido se marca como tal.
- 241 pliegos reales: 20 lectores y 20 escépticos, más un clasificador determinista (`clasificar.py`) que
  separa las cláusulas de puntaje y desempate de las habilitantes.
- **No verificable desde aquí**: los registros de Vercel, la fecha en que se inscribió cada contrato de los
  socios de Génesis (el certificado no la imprime) y si esos socios lo siguen siendo.
- Los datos de trabajo (textos de los pliegos, tablas, scripts y resultados de cada agente) quedaron en la
  máquina de la sesión, que es temporal; lo que hay que conservar está en este documento y en la memoria.
