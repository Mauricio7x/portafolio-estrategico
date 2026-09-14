# D · Síntesis de la reforma de la tarjeta · una sola lista sin duplicados (13-sep-2026)

> Para: dueño · Estado: propuesta fechada (síntesis de tres lentes) · Sustituido por: —
> Árbol: `main` en `3482415`, sin modificar (`git -C /home/user/portafolio-estrategico status --short` vacío antes y después). Fuentes: los tres informes de diseño `D-experimentado.md` (EXP-01…57), `D-sin_experiencia.md` (SIN-01…57) y `D-dueno.md` (DUE-01…56), leídos enteros, y los seis informes A1-A6 de este directorio. Lo que este informe añade lo comprobó en el árbol con `grep` (anexo). La memoria se cita por TÍTULO de sección.

## 0. Qué es esto y cómo leerlo

Tres diseñadores miraron la misma tarjeta con tres lentes (el ingeniero con quince años licitando, el que empieza, y el dueño que quiere adjudicar más) y propusieron 170 fichas. Este documento las funde en **79 datos** (D-01…D-79), uno por HECHO que se enseña, con la ficha completa que pidió el dueño —CORTO · CONCISO · EN QUÉ BENEFICIA · EN QUÉ AFECTA— más fuente, certeza, costo, tipo, para quién, necesidad (códigos E/P de `A5-necesidades-ingeniero.md § 2-3`) y tanda.

**Orden de la lista.** Primero por tanda —la tanda 1 es lo que el dueño pidió con sus palabras, la tanda 2 lo que corrige datos que ya se enseñan (la segunda exigencia literal: «todos los datos deben ser ciertos, siempre»), la 3 y siguientes datos nuevos por valor y costo— y dentro de cada tanda por lo que más pesa en la decisión «me presento, con quién y a qué precio». Lo que se conserva sin cambio va al final: no aporta valor nuevo, solo hay que verificar que sigue.

**Convenciones.** Certeza: `publicado` (SECOP lo dice) · `medido` (contado en el histórico o en el uso) · `calculado` (aritmética declarada sobre publicados o medidos) · `estimado` (supuesto con nombre, extracción de texto o deducción) · `sin_fuente` (la fuente no está confirmada por A4 o no existe: el verificador decide). Costo: `sync` (al ingerir o al reconstruir un índice) · `peticion` (al servir la lista) · `clic` (al pulsar) · `externo` (fuente viva fuera de Redis). Tipo: `nuevo` · `cambia` · `se_retira` · `se_pliega` · `se_conserva`. Para: `experimentado` · `sin_experiencia` · `ambos`.

**Las tandas (sesiones), como manda el encargo de síntesis:**

| Tanda | Qué agrupa | Datos |
|---|---|---|
| 1 | Lo que el dueño pidió literalmente: «con quién conviene» en cada tarjeta y «dónde más gana el competidor» instantáneo, con espera animada, a un clic | D-01 … D-08 |
| 2 | Lo que cambia datos que HOY se enseñan para que sean ciertos y se lean sin párrafo | D-09 … D-32 |
| 3 | Datos nuevos que salen de lo que YA viaja en la fila o ya existe en un módulo (costo petición/clic) | D-33 … D-49 |
| 4 | Datos nuevos que exigen reconstruir un índice, una extracción completa o una carga del dueño (costo sync) | D-50 … D-59 |
| 5 | Datos nuevos de fuentes externas vivas, tras la sonda fechada M-DGF-17 (que hoy no existe) | D-60 … D-64 |
| 6 | Propuestas cuya fuente A4 NO confirmó: `sin_fuente`, no se borran, el verificador decide | D-65 … D-67 |
| — | Lo que se conserva sin cambio (solo verificar que sigue) | D-68 … D-79 |

## 1. Reglas de fusión aplicadas, y los conflictos que hubo que resolver

### 1.1 Mismo hecho con palabras distintas → una ficha (regla 1)

| Hecho | Fichas fundidas | Texto elegido y por qué |
|---|---|---|
| Con quién conviene | EXP-08 · SIN-05 · SIN-06 · DUE-06 (+ DUE § 7) | Los ocho textos de A3 § (c) (ya medidos contra la cerca) más el estado condicional al anticipo con el texto de DUE («Solo si el pliego trae anticipo del 30 % o más; sin anticipo, con PRODIAC (80/20).», 83 caracteres): es el único de los tres ≤ 90 y dice reparto. EXP (100 c.) y SIN (95 c.) se descartan por largos. |
| Quien más gana aquí | EXP-38 · SIN-18 · DUE-31 | Idéntico en los tres: «Quien más gana aquí: X · 6 de 15 ›». |
| Perfil casi instantáneo | EXP-39 · SIN-19 · DUE-33 | Mismo diseño (A2 § 4.2). |
| La espera | EXP-39 · SIN-20 · DUE-33 | Frase de DUE «Buscando dónde más gana esta empresa…» (la más corta, pasa las cercas: `d_dueno_textos.js` 0 fallos); esqueleto con `.exp-esqueleto` (EXP § 7.g: el `brillo` de `#app` NO alcanza al modal, que está fuera de `#app`). |
| Cabecera honesta del perfil | EXP-40 · SIN-21 · DUE-32 | Mismos cuatro renglones. |
| Filas pulsables del modal de la entidad | EXP-52 · SIN-22 · DUE-32 | Mismo rótulo y botón. |
| Línea de requisitos con la cifra | EXP-07 · SIN-04 · DUE-05 | «● Para poder presentarse: cabe solo si el pliego trae anticipo del 30 % o más. Confírmelo en el pliego.» — el rótulo de SIN (separa «poder presentarse» de «ganar», A5 W1), la cifra de EXP (sin cifra no decide) y sin el «o con socio» (lo dice la línea de socio, justo debajo: una cosa por línea). DUE («falta confirmar el anticipo») pierde la cifra. |
| No viable | EXP-06 · SIN-03 · DUE-04 | «No le alcanza solo: supera lo que puede facturar · le falta caja» (ámbar si un socio cierra; rojo y atenuada si ninguna). Palabras del glosario (SIN) + la tarjeta viva cuando una socia la rescata (DUE). Sin el nombre del socio en el chip: lo da la línea de socio. |
| Cuántas compiten | EXP-09 · SIN-07 · DUE-07 | «1,4 empresas por proceso · 55 procesos» (el más corto). |
| De cada cuántos se gana uno | EXP-10 · SIN-08 · DUE-08 | «1 de 3 · se gana, aproximadamente · con los 55 procesos de esta entidad» / «— · sin histórico para estimar»; con fuente del departamento se dice. |
| Precio de mercado rotulado | EXP-11 · SIN-09 · DUE-09 | «≈ $5.920 M · si bajan lo habitual aquí (7 %, 8 contratos)». |
| Cierre con hora y sin fecha | EXP-14 · SIN-11 · DUE-11 | «Cierra en 31 días · mié 14 de oct · 3:00 p. m.» / «Sin fecha de cierre publicada: mírela en el pliego». El «presente el día anterior» de SIN va con los días que quedan (D-36), no en el chip. |
| Días de oficina que dio el proceso | EXP-15 · SIN-13 · DUE-37 (mitad por proceso) | «Da 30 días de oficina para ofertar (publicado el 1 de sep, cierra el 14 de oct)». |
| Lo que suele dar la entidad | EXP-16 · SIN-14 · DUE-37 (mitad por entidad) | «Esta entidad suele dar 21 días de oficina para ofertar; este proceso da 9». |
| Cierre en fecha difícil | EXP-15 (parte) · SIN-46 · DUE-38 | Dos textos idénticos en los tres. |
| Anticipo en tres estados | EXP-27 · SIN-31 · DUE-20 | «Anticipo 30 % (≈ $1.910 M)» · «Sin anticipo (lo dice el pliego)» · «Anticipo: no publicado · búsquelo en el pliego». |
| Suelen bajar con origen | EXP-28 · DUE-21 (SIN-39 conserva) | Banda en palabras (EXP) + origen (EXP, DUE). |
| Puertas en llano | SIN-29 · DUE-19 · EXP-26 · SIN-30 · DUE-41 (mitad tarjeta) · EXP-31 · DUE-24 | Un solo renglón por puerta con la cifra abreviada, «sin descontar contratos en ejecución», «le quedarían $X», «faltarían ≈ $Y» y «con ingreso estimado: cargue el ingreso de su RUP». |
| Plazo de obra y ritmo | EXP-05 · SIN-32 · SIN-33 · DUE-50 | «8 meses de obra» arriba; «unos $796 M por mes de obra» plegado; sin duración: «Plazo no publicado (la capacidad se calculó con un año)» (SIN: la ausencia declara el supuesto de la K). |
| Cierre prorrogado | EXP-20 · SIN-25 · DUE-15 | «Cierre prorrogado 12 días (antes cerraba el 1 de oct)». |
| Referencia | EXP-01 · SIN-01 · DUE-02 | «Ref. LP-008-2026» junto al título. |
| Calcular mi precio con plazo | EXP-36 · SIN-42 · DUE-29 | La fila lleva `plazo_meses` (`null` sin duración, nunca 12). |
| Umbral Mipyme | EXP-47 · DUE-36 | Texto de DUE, que dice la consecuencia con la socia. |
| Adjudica en N días · desiertos | EXP-44 · EXP-45 · DUE-39 · SIN-57 | Plegado (dos de tres lentes); EXP quería además un chip arriba: se anota. |
| Republicado | EXP-50 · SIN-48 · DUE-47 | «Republicado el 3 de septiembre (puede ser una adenda o una publicación de fase)». |
| Lotes | EXP-49 · SIN-47 · DUE-48 | «Proceso por lotes (3): puede presentarse a uno solo; el valor de cada lote está en el pliego». |
| Ganadores locales | EXP-46 · SIN-49 · DUE-49 | «7 de cada 10 ganadores aquí tienen domicilio registrado en Tolima (12 contratos)». |
| Al oficial en X de N | EXP-57 (departamento) · SIN-50 (entidad) | Un solo dato: por entidad y, sin base, por departamento. |
| Documento tipo | EXP-48 · SIN-55 · DUE-52 | «Probablemente rigen…: confírmelo en el aviso de convocatoria». |
| Capacidad de verdad (SCE) | SIN-51 · DUE-43 | Igual. |
| Cara a cara del competidor | DUE-35 · SIN-53 | Igual (hgi6). |
| Estampillas observadas | EXP-54 · SIN-54 · DUE-53 | Igual. |
| Archivos de oferta cargados | EXP-53 · SIN-52 · DUE-54 | Igual. |
| En todo SECOP II | EXP-43 · DUE-55 | Igual. |
| Usted aquí | DUE-46 (guardados con desenlace) · EXP-56 (hgi6 con el NIT del dueño) | Se queda la fuente interna (guardados): no exige red y es lo que la aplicación vio; EXP-56 se anota como variante externa. |
| Los «—» dicen por qué · sin clave una línea | SIN-10 · SIN-44 | Una ficha: la celda dice «sin cuantía publicada» y la cabecera de la lista dice una vez «Sin su clave…». |
| Modalidad | EXP-04 · DUE-25 (+ § 5) · SIN-38 | Dos datos distintos: el NOMBRE sube arriba (tanda 2) y la EXPLICACIÓN en llano es un dato nuevo (tanda 3). |
| Tipo de precio | EXP-32 · SIN-37 · DUE-26 | «Precio global: el riesgo de las cantidades es suyo» sube arriba (es el caso que cambia una decisión); «Precios unitarios: si hay más cantidad, se paga» queda plegado. |
| Entidad · municipio | EXP-02 · DUE-22 · SIN-39 (chip plegado) | Municipio arriba (EXP); el chip plegado con ✓ se absorbe (D-26). |

### 1.2 Dos datos DISTINTOS con nombres parecidos → renombrados o fundidos (regla 2)

| Choque | Decisión |
|---|---|
| `anticipo_que_cabe_pct` (SIN-04) frente a `anticipo_minimo_pct` (DUE-20) para el mismo número | **`anticipo_que_cabe_pct`**: es el nombre de la variable que ya existe en `lib/puertas.js:188` (`anticipoQueCabe`); «mínimo» sugeriría un mínimo publicado por el pliego, que no es. |
| Estado nuevo del socio: `segun_anticipo` (DUE) frente a `solo_si_anticipo` (SIN) | **`segun_anticipo`**: cubre las dos direcciones (solo si hay anticipo · con socio si no lo hay · ninguna si no lo hay). |
| Mecanismo del estado nuevo: contrafáctica «evaluar dos veces, con `anticipo_pct: 0, anticipo_declarado: true`» (EXP § 7.b′, DUE § 10.3 B, ejecutadas) frente a «carencia condicional `capacidad_si_no_hay_anticipo` dentro de `carenciasDe`» (SIN-06) | **La contrafáctica**: llama a la cadena completa que ya existe (`evaluarPuertas` → `socioPorProceso`) en vez de escribir una regla nueva, y cubre también la caja (`p3_caja.sin_dato_de === "anticipo"`, A5 § 6.1), que la carencia condicional de SIN no cubría. |
| `hechos_entidad` como campo aparte de `competencia_entidad` (EXP-44) frente a ampliar `competencia_entidad` (DUE-39) | **Ampliar `competencia_entidad`** con `plazo_adjudicacion` y `desiertos` leídos con `hechosDeRegistro` (`lib/indice_competencia.js:479`): un objeto por entidad, la misma forma que ya lee el modal. Dos nombres para «la entidad» son el precedente de `total_procesos`/`procesos_contados`. |
| «Días de oficina» con tres significados: los que DIO el proceso (publicación→cierre), los que QUEDAN (hoy→cierre) y los que SUELE DAR la entidad | Tres campos con nombres que no se parecen: **`dias_oficina_dados`**, **`dias_oficina_restantes`**, **`dias_oficina_suele_dar`** (EXP usaba `para_ofertar` y SIN `dias_oficina_hasta_cierre`). En pantalla: «Da 30 días de oficina para ofertar» · «Le quedan 22 días de oficina» · «suele dar 21». |
| «Cupo» (DUE) frente a «Capacidad de facturar» (glosario, SIN) frente a «K» | **«Capacidad de facturar» / «lo que puede facturar»**: es el término que ya fija `public/glosario.js:56` (`capacidad_contratacion.corto`); «cupo» sería una segunda palabra para el mismo hecho. |
| `alcanzable_con_socio` (primer socio que alcanza, `listar.js:920`) frente a `socio.con` (el recomendado) | **Se retira el nombre publicado** (D-08); el rescate de `listar.js:663` y `lib/filtros.js:693-696` se conserva porque solo mira si hay socio, no cuál. |
| «Presente el 13 de oct» (regla) frente a «Cierra el 14 de oct» (hecho) | Son dos datos y se pintan en dos líneas: el cierre en su chip, el «presente el» con los días que quedan (D-36). |
| «Republicado» frente a «adenda» · «tiene la actividad» frente a «aporta la experiencia» · «domicilio registrado» frente a «sede» · «sobre el presupuesto» frente a «sobre su oferta» | Se conservan las distinciones de los tres informes; ninguna pantalla afirma la segunda palabra sin fuente. |

### 1.3 Lo que exige un dato que A4 no confirmó → `sin_fuente` (regla 4)

A4 § 0 fija tres grados: `árbol` (verificado por Detekta contra la fuente con fecha o ejecutado hoy), `diccionario` (nombre publicado en el diccionario SARA o en el mapeo co-acc, NO comprobado por Detekta) y `búsqueda`. Solo el primero cuenta como confirmado:

| Propuesta | Fuente | Grado en A4 | Certeza aquí |
|---|---|---|---|
| Con cuánto ofertaron todos (EXP-55) | `wi7w-2nvm`, llave sin confirmar | diccionario + búsqueda | **sin_fuente** (D-65) |
| Cuánto tarda en pagar (SIN-56) | `uymx-8p3j.fecha_real_de_pago` | diccionario | **sin_fuente** (D-66) |
| Visto N veces (EXP-51) | `visualizaciones_del` | diccionario + búsqueda; cobertura no medida | **sin_fuente** (D-67) |
| Republicado (D-54) | `fecha_de_ultima_publicaci` | árbol + diccionario; cobertura 100 % en el censo del 16-ago | publicado |
| Lotes (D-55) | `numero_de_lotes` | árbol (llega al histórico: reproducido) | publicado, cobertura por medir |
| Ganadores locales (D-51) | `departamento_proveedor` | árbol (guardada, no leída) | medido |
| Archivos de oferta (D-63) · cara a cara (D-61) · SCE (D-60) · en todo SECOP II (D-62) | `dmgg-8hin` · `hgi6-6wh3` · `jbjy-vk9h` · p6dx en vivo | árbol (módulos que ya las consultan) | según la ficha; costo externo |

### 1.4 Lo que ninguna de las tres lentes tomó de A4 (para el verificador; no son fichas)

`ceth-n4bn` (con quién se ha consorciado un NIT y con qué porcentaje: la «sugerencia de socios» con mejor fuente que `qmzu-gj57`), `e2u2-swiw` (modificaciones a procesos), `u8cx-r425` (adición en valor y días), `it5q-hg94` (multas SECOP II del socio y del competidor, que desmiente `docs/datos.md` y `lib/socio.js:21`), `mfmm-jqmq` (atraso real frente al plan), `ordenentidad` (consumidor ya escrito en `lib/dictamen.js:390-400`), `codigo_entidad` (identidad limpia de la entidad; DUE la lista en la tanda de la full sin ficha). Todos `diccionario`: entrarían como `sin_fuente` tras la sonda. Se anotan para que no se pierdan; no se proponen aquí porque el encargo era fundir, no ampliar.

## 2. Las fichas · CORTO · CONCISO · EN QUÉ BENEFICIA · EN QUÉ AFECTA

Formato: **id · nombre en pantalla** · tipo · para · necesidad · tanda · certeza · costo. Las cifras de ejemplo son las del proceso de la captura del dueño (PAVIMENTACIÓN DE VÍAS URBANAS EN PURIFICACIÓN - TOLIMA, $6.365.863.685), reproducidas con las funciones reales por los tres informes (perfil `helder`; supuestos declarados: clase 72141000, plazo 8 meses, publicado el 1-sep-2026, cierre el 14-oct-2026 a las 15:00). Lo que depende del hash de producción (líder, días de adjudicación, desiertos, referencia) es EJEMPLO y se rotula.

### 2.1 Tanda 1 · lo que el dueño pidió literalmente

**D-01 · Con quién conviene** · cambia · ambos · E9/P11 · tanda 1 · calculado · peticion
- CORTO (ocho estados, una línea del servidor de ≤ 90 caracteres): gris «Solo: le alcanza sin socio.» · ámbar «Solo si el pliego trae anticipo del 30 % o más; sin anticipo, con PRODIAC (80/20).» · verde «Conviene con Génesis: tiene la actividad que a usted le falta · reparto sugerido 60/40» · verde «Conviene con PRODIAC: aporta el respaldo que le falta · reparto sugerido 80/20» · ámbar «Conviene con PRODIAC, pero no cabe si la convocatoria es solo para Mipyme.» · ámbar «Con Génesis se acerca, pero puede no bastar: falta respaldo para financiar la obra.» · rojo «Ninguna de las dos alcanza lo que falta.» · descartada por objeto: no se pinta.
- CONCISO: `socioPorProceso` ya corre por fila servida (`lib/handlers/procesos/listar.js:935`); `resumenSocio` (`:109`) pasa de `{tipo, cierra_todo}` a `{tipo, con, cierra_todo, aviso, linea}`; `linea` la redacta el servidor en el mismo módulo que redacta `frase` (una sola redacción para tarjeta y expediente); `con` sale SOLO de `recomendacion.socio`; hace falta `nombreCorto` en `lib/perfiles.js` (hoy 0 apariciones). Estado nuevo `segun_anticipo`: cuando `p2_k.depende_del_anticipo` (`lib/puertas.js:195`) o `p3_caja.sin_dato_de === "anticipo"` (`:222`), se evalúa además la contrafáctica `anticipo_pct: 0, anticipo_declarado: true` y la línea trae las dos ramas (ejecutado con Purificación: sin anticipo → PRODIAC 80/20, faltan capacidad y caja; con anticipo del 30 % → solo; `d_exp_repro`, `d_dueno_repro` escenario B). Variantes descartadas: carencia condicional dentro de `carenciasDe` (SIN-06); los textos de EXP (100 c.) y SIN (95 c.) para ese estado. El congelado al guardar (`lib/handlers/perfil/seguimiento.js:168-181`) no se toca: la tarjeta dice el consejo de HOY y el expediente el del día que decidió, con fecha.
- BENEFICIA: la pregunta que el dueño puso primera, en cada tarjeta, con nombre, reparto y la condición real (el anticipo) que hoy se esconde bajo «Solo. Le alcanza» (reproducido por las tres lentes con el proceso de la captura).
- AFECTA: 96-184 B por fila (medido) frente a 34-43 B hoy; una segunda evaluación solo en filas con anticipo sin publicar (0,25-0,84 ms por fila); cuatro aserciones de `tests/e2e.js:4706-4737` caen a propósito y se reescriben; la sección del 11-sep «El veredicto de socio se lee AL GUARDAR…» recibe «> SUPERADA» en su parte de tarjeta. Lo que el recomendador NO considera (puntaje, limitación Mipyme real, experiencia por contratos) sigue declarado en el expediente, no en la línea.
- Fuente: `lib/socio_por_proceso.js` → campo `socio` de la fila.

**D-02 · Quien más gana aquí** · nuevo · ambos · E5/P16 · tanda 1 · medido · sync (lectura por petición; perfil al clic)
- CORTO: «Quien más gana aquí: CONSTRUCTORA DEL TOLIMA SAS · 6 de 15 ›» (botón; sin base no hay botón). EJEMPLO.
- CONCISO: en el barrido de `construirIndice` se acumula por entidad el adjudicatario con más procesos ganados (`esAdjudicado` → `claveAdjudicatario`, `lib/equivalencias.js:72-88`) y el registro publica `lider: {nombre, clave, ganados, base}` solo con `base ≥ MIN_PROCESOS` (5, `lib/indice_competencia.js:86`); hoy el hash no lleva líder (censo DUE: solo el comentario `:1168`). `competenciaDe` lo pasa a la fila SOLO con token válido; `lib/publico.js` lo anula sin token; token inválido = 401. El botón `.lider-competencia[data-adjudicatario][data-nombre][data-entidad]` llama a `cargarAdjudicatario(clave, nombre)` (`public/app.js:3382`), que ya existe.
- BENEFICIA: la señal #11 del manual con nombre y frecuencia natural en la tarjeta; el perfil a UN clic en vez de tres (A2 § 1.3).
- AFECTA: +86 B por fila con token (medido por EXP); supera en su letra la decisión escrita en `lib/indice_competencia.js:1168` («`/api/oportunidades` … nunca adjudicatarios, NIT ni valores»): se conserva su espíritu (sin credencial nada; con credencial el nombre y la cuota, sin NIT ni valores) y se escribe en la memoria como decisión nueva, no se cuela. Frescura: la del índice. Orden de la delegación: antes de `.banda-competencia` (`tests/e2e.js:20786-20793`).
- Fuente: `indice:competencia` (histórico p6dx).

**D-03 · Dónde gana este competidor: cuánto, dónde y cuántas veces, casi al instante** · cambia · ambos · E5 · tanda 1 · medido · clic (2-3 comandos) / sync (construcción)
- CORTO: «15 contratos en 6 entidades · $28.400 M en 14 de 15 contratos con valor publicado · último: 12 de ago de 2026» y la tabla Entidad · Ganados · Valor adjudicado · Último contrato.
- CONCISO: la misma `op=competidor` (`api/inteligencia.js:17-24` → `lib/handlers/inteligencia/detalle.js:174` → `detalleAdjudicatario`, `lib/competencia_detalle.js:547`) sirve primero el hash inverso `indice:adjudicatario` (campo `nit:…`/`n:…`), construido en el MISMO barrido de `construirIndice` con las líneas `competencia_detalle.js:580-607` extraídas a una función que el barrido de hoy y el constructor comparten (el prototipo de A2 cuadró 155/155 · 143/143 · 147/147 y 253/253 · 224/224 · 238/238); `GET meta` + `HGET` → `origen: "indice"` y `construido`; sin registro cae al barrido de hoy con `origen: "barrido"`. Medido por A2: hoy cada clic en frío = 8-95 comandos y 2-2,7 MB (0,8-4,2 s con 40 ms/comando); con el hash 2-3 comandos. Construcción: 54-66 HSET, 6-9 MB, +0,3-0,7 s de CPU. Caché `v7` → `v8`. No cambian la identidad (NIT y nombre cuentan aparte) ni `esAdjudicado` (§ «Remates «R4-remates-inteligencia»…»).
- BENEFICIA: lo que el dueño pidió con sus palabras —cuánto han adjudicado en total, en qué otras entidades y cuánto— «casi automático».
- AFECTA: frescura hasta un mes salvo reconstrucción (`/api/sync/historico?reconstruir_indice=true`), declarada en pantalla (D-04); 6-9 MB más en Redis; el «no existe» también se sirve del hash. La latencia real en producción es NO VERIFICABLE aquí: el dueño la lee en `duracionMs`/`comandosRedis` pegando la URL en Chrome (A2 § 3.3).
- Fuente: `indice:adjudicatario` (nuevo) sobre el corpus histórico.

**D-04 · La espera del perfil, con forma, y de dónde salió el dato** · nuevo · ambos · E5 (petición del dueño) · tanda 1 · medido · clic
- CORTO: mientras carga: «Buscando dónde más gana esta empresa…» sobre un esqueleto con la forma del resultado (dos líneas de cabecera y cinco filas de tabla); si cae al barrido: «Esta empresa no está en el índice: se recorre el histórico completo. Puede tardar unos segundos.»; al pie: «Con datos hasta el 31 de agosto de 2026 · Actualizar ahora» (índice) o «Al día de hoy (recorrido completo)» (barrido).
- CONCISO: `abrirModal` (`public/app.js:2534`) pinta el esqueleto ANTES del `fetch` con la clase `.exp-esqueleto` que ya existe (`public/index.html:1288`; su regla bajo «Reducir movimiento» en `:1380`), `aria-busy="true"` en `#modal-cuerpo`; sin `@keyframes` nuevo (V4-19 quiere borrar cuatro), sin tocar `--dur-5`; bajo reduced-motion gris plano (se añade `background: var(--bg-inset-2)` a `:1380`, como hace `:850` con la lista) y el esqueleto desaparece de golpe cuando llega el dato (`docs/INVESTIGACION_DISENO_WEB.md § «7.3. Propuesta de tokens de movimiento para Detekta»`). El `brillo` de `#app .animate-pulse` NO alcanza al modal: está fuera de `#app` (EXP § 7.g). «Actualizar ahora» → `refrescar=1` con la misma espera. Sin marca escrita a mano ni pictograma. Variantes descartadas: «Leyendo el índice de adjudicaciones…» (EXP), «Buscando dónde más ha ganado esta empresa…» (SIN).
- BENEFICIA: «ninguna pulsación sin respuesta visible», diciendo qué se arma; el usuario sabe si ve el índice (con fecha) o el corpus vivo.
- AFECTA: un `<style>` mínimo; V4-19 cambiará el mecanismo de entrada/salida de los modales (se diseña sabiendo que llega `@starting-style`); la cerradura `tests/e2e.js:27970-28000` comprueba efectos, no nombres. Lo visual es NO VERIFICABLE sin navegador.
- Fuente: — (interfaz); la fecha, de la meta de `indice:adjudicatario`.

**D-05 · La cabecera del perfil dice qué sostiene cada cifra** · cambia · ambos · E5 · tanda 1 · medido · clic
- CORTO: «CONSTRUCTORA DEL TOLIMA SAS · NIT 900123456» · «$28.400 M en 14 de 15 contratos con valor publicado» · sin NIT: «SECOP no publica el NIT de esta empresa: se identifica por el nombre tal como lo escribe la entidad» · línea fija: «Solo lo que la aplicación sigue: obra y afines, procesos competitivos, desde enero de 2024. Fuera de eso, no aparece aquí.»
- CONCISO: `procesos_con_valor` ya viaja y no se pinta (`lib/competencia_detalle.js:669`; `public/app.js:3366-3368`); `identificacion null` hoy no pinta línea (`:3349-3353`); los límites viven solo en `que_es` al pie (A2 § 5). Suben a la cabecera.
- BENEFICIA: un total no parece completo (es cota inferior) y un perfil por nombre no se toma por el de un NIT.
- AFECTA: tres líneas más en la cabecera; ninguna cifra nueva.
- Fuente: respuesta de `detalleAdjudicatario`.

**D-06 · En esta entidad: N de sus M contratos** · nuevo · ambos · E5 · tanda 1 · medido · clic
- CORTO: «En esta entidad: 6 de sus 15 contratos», con la fila de la entidad de origen primero y resaltada.
- CONCISO: la tarjeta pasa `data-entidad`; el modal compara con `claveCanonica` (la misma que agrupa `detalleEntidad`, `lib/competencia_detalle.js:283-285`) para no partir una entidad en dos grafías (hoy `entidades[]` va con `lic.entidad` crudo, A2 § 2).
- BENEFICIA: «¿es de aquí o de todas partes?» sin buscar en la tabla.
- AFECTA: dos grafías se agrupan al mostrar y se publica el nombre más frecuente.
- Fuente: `detalleAdjudicatario.entidades[]`.

**D-07 · Las filas de «Quién gana aquí» dicen que se pueden pulsar** · cambia · sin_experiencia · E5 · tanda 1 · medido · clic
- CORTO: rótulo del pliegue «Ver los 5 que más ganan y dónde más ganan»; en cada fila «Ver dónde más gana ›»; los segmentos de la barra apilada también abren el perfil; «Otros» explica que es la cola.
- CONCISO: `public/app.js:2930` (fila con `title` «Ver en qué otras entidades gana» y `cursor-pointer`, sin texto: en teléfono no existe, cerradura `tests/e2e.js:8663-8680`) y `:2967` (rótulo). No se revierte el pliegue del 6-sep (§ «Lote «B9a-entidad-graficos»…»).
- BENEFICIA: la segunda puerta al perfil deja de ser a ciegas (A2 § 1.3).
- AFECTA: la aserción literal `tests/e2e.js:13033` se reescribe a propósito con el rótulo nuevo.
- Fuente: `detalleEntidad.adjudicatarios`.

**D-08 · Campo `alcanzable_con_socio` de la fila** · se_retira · ambos · E9 · tanda 1 · calculado · peticion
- CORTO: (no se pinta).
- CONCISO: `listar.js:920` publica el PRIMER socio que alcanza en el orden de candidatos (`socioQueAlcanza`, `lib/socio_por_proceso.js:282`), con nombre completo; `socio.recomendacion.socio` es el mejor tras el `sort`. Reproducido por A3 y DUE: Génesis frente a PRODIAC en la misma fila. Se deja de publicar el nombre; el rescate de filas (`listar.js:663`; `lib/filtros.js:693-696`, `alcanzaConSocio`) se conserva porque solo mira si HAY socio, no cuál.
- BENEFICIA: un solo «con quién» (regla dura: dos cosas distintas no pueden tener nombres parecidos).
- AFECTA: −4 a −77 B por fila; ningún `public/*.js` lo lee (censo A3).
- Fuente: `lib/socio_por_proceso.socioQueAlcanza`.

### 2.2 Tanda 2 · lo que cambia datos que hoy se enseñan

**D-09 · «Para poder presentarse»: la línea con la cifra que decide** · cambia · ambos · P1/E1/E4 · tanda 2 · calculado · peticion
- CORTO: «● Para poder presentarse: cabe solo si el pliego trae anticipo del 30 % o más. Confírmelo en el pliego.» (ámbar); los siete textos de hoy llevan el mismo rótulo delante («● Para poder presentarse: cumple los requisitos.»).
- CONCISO: `lineaRequisitos` (`public/app.js:1718`). Hoy, cuando P2 «pasa con advertencia» porque la capacidad depende del anticipo (`rup.k_depende_del_anticipo`, `lib/rup.js:135`; `p2_k.depende_del_anticipo`, `lib/puertas.js:195`) o P3 es `sin_dato`, dice «Cumple los requisitos, con detalles por revisar» y el detalle que decide vive plegado y en el `title`. El servidor publica `p2_k.anticipo_que_cabe_pct` (la variable local `anticipoQueCabe`, `lib/puertas.js:188`: `ceil(100·(1 − K/CRPC))`, reproducido 30 para Purificación); la decisión la sigue tomando `rup.js` con la cifra exacta: el 30 % es el techo redondeado HACIA ARRIBA de 29,77 %, más exigente, nunca más laxo. Con P3 `sin_dato` y financiación > patrimonio la línea dice la caja (D-12). Variantes descartadas: DUE «falta confirmar el anticipo» (sin cifra); EXP «…o con socio» (lo dice D-01, justo debajo).
- BENEFICIA: la decisión ir/no ir en una frase; separar «poder presentarse» de «ganar» corrige el error más frecuente de quien empieza (A5 W1).
- AFECTA: dos renglones en ese caso (P2 falla en el 4,3 % de las filas y 32 cabrían con anticipo, A3); «ante la duda, ámbar y se muestra» se conserva: la puerta sigue pasando.
- Fuente: `puertas.p2_k`, `p3_caja`.

**D-10 · No le alcanza solo (chip sin siglas, vivo si una socia lo rescata)** · cambia · ambos · P1/P11 · tanda 2 · calculado · peticion
- CORTO: «No le alcanza solo: supera lo que puede facturar · le falta caja» (ámbar, tarjeta viva) cuando `socio.cierra_todo`; «No le alcanza, ni con socio: supera lo que puede facturar · le falta caja» (rojo, atenuada al 50 %) cuando `ninguna_sirve`.
- CONCISO: `viable === false` + `puertas.no_viable_por` (`RUP`/`K`/`Caja`, `lib/puertas.js:305-350`) traducidos con `Glosario.corto("rup")` = «Registro de proponente» y `Glosario.corto("capacidad_contratacion")` = «Capacidad de facturar» (`public/glosario.js:54,56`), más `socio.cierra_todo` (D-01). Hoy dice «No viable — K · Caja» y apaga al 50 % aunque una socia cierre todo (reproducido por DUE con CO1.REQ.900002). El nombre de la socia no va en el chip: lo da D-01.
- BENEFICIA: los procesos grandes que siguen siendo suyos con la socia adecuada se ven vivos —la palanca más directa para presentarse a más—; «K» no significa nada para quien empieza.
- AFECTA: no cambia el orden ni el veredicto del servidor; la suite fija el chip «No viable» dentro de `iteracion()` (A6 § 1.11): localizar antes de tocar.
- Fuente: `puertas.no_viable_por`, `socio`.

**D-11 · Anticipo en tres estados** · cambia · ambos · E4 · tanda 2 · estimado · sync
- CORTO: «Anticipo 30 % (≈ $1.910 M)» · «Sin anticipo (lo dice el pliego)» · «Anticipo: no publicado · búsquelo en el pliego».
- CONCISO: `anticipo_pct` + `anticipo_declarado` (`enriquecer`, `lib/negocio.js:218-224`, regex sobre el objeto; el dataset no trae columna). Hoy `public/app.js:2192` mira solo `pct > 0` y pinta «no declarado» también cuando el pliego dijo «sin anticipo» (A1 H1; P3 sí distingue, `lib/puertas.js:247`). Los pesos = cuantía × pct/100, «≈», solo con cuantía.
- BENEFICIA: «sin anticipo» y «no se sabe» son decisiones distintas de caja y de socio.
- AFECTA: sigue siendo una lectura del texto (700 caracteres, `lib/proyeccion.js:88-90`): un anticipo escrito solo en el pliego → «no publicado», jamás «no hay». Anticipo ≠ pago anticipado (V-08): el detector es único y no se afirma la diferencia (NO VERIFICABLE).
- Fuente: `anticipo_pct`, `anticipo_declarado`.

**D-12 · Las puertas con su cifra, en palabras del glosario** · cambia · ambos · P1/P3/E1 · tanda 2 · calculado · peticion
- CORTO: «● Registro de proponente ✓ · La actividad de este proceso está inscrita en su registro.» · «● Capacidad de facturar ~ · Sin anticipo, esta obra ($6.366 M) supera lo que puede facturar hoy ($4.471 M): cabe con un anticipo del 30 % o más. Con el 30 %, le quedarían unos $15 M después de esta obra. Calculada sin descontar contratos en ejecución: no hay ninguno cargado.» · «● Caja ? · Sin anticipo tendría que financiar ≈ $1.273 M antes del primer cobro y su patrimonio es $1.107 M: faltarían ≈ $166 M.» · «● Competencia · Poca: 1,4 empresas por proceso en 55 procesos.» · cuando aplica: «Capacidad calculada con un ingreso estimado: cargue el ingreso de su RUP en Mi empresa.»
- CONCISO: mismos cálculos de `lib/puertas.js` (`p1Rup:105`, `p2K:120`, `p3Caja:225`, `p4Competencia:273`); cambia la redacción de `mensaje`, que hoy dice «clase UNSPSC», «CRPC», «K», «capacidad residual» (reproducido por DUE y SIN: textos del servidor, que `JERGA_JS` no censa porque solo barre `public/*.js`). «Le quedarían» = `p2_k.crp − p2_k.crpc` (viajan; ejecutado: $14.816.609 con anticipo del 30 %, el 0,33 % de la K); «faltarían» = `p3_caja.financiacion_requerida − patrimonio` (ejecutado: $165.919.773); «sin descontar contratos en ejecución» sale cuando `calcSCE` asume 0 (`lib/capacidad.js:70-74`, hoy solo aviso de consola); «ingreso estimado» cuando `rup.co_estimado` (chip #27 de A1, absorbido: D-27). Las cifras abreviadas van solo en el texto; las exactas siguen en el `title` y en el expediente; nada decide con la abreviada. Sin token los mensajes van sin cifras (`lib/publico.js:118`), como hoy.
- BENEFICIA: quien empieza entiende «capacidad» y «caja»; el experimentado sabe que la K es un TECHO (sin SCE, con CO estimado) y cuánto le queda después de esta obra.
- AFECTA: las aserciones que fijen los textos actuales de P2/P3 caen a propósito (`E2E_SOLO="unidad capacidad"`, `"unidad puerta caja sin anticipo"`); cerradura nueva que EJECUTE `evaluarPuertas` y pase `JERGA_JS` a los mensajes (cierra la fuga por el servidor; una prueba que falle contra el árbol de hoy); «faltarían» hereda el 20 % (`FRACCION_FINANCIACION`) y el anticipo desconocido, declarados en el texto.
- Fuente: `puertas.p1_rup..p4_competencia`, `rup.co_estimado`.

**D-13 · Cuántas empresas compiten (una cifra, un redondeo)** · cambia · ambos · E6/P16 · tanda 2 · medido · peticion
- CORTO: «1,4 · empresas por proceso · 55 procesos» · sin base: «— · sin histórico de esta entidad».
- CONCISO: `competencia_entidad.promedio_oferentes`, `total_procesos` (`competenciaDe`, `lib/indice_competencia.js:1213`; mínimo 5). Hoy `Math.round` (`public/app.js:2074`) pinta «~1» mientras la banda dice «1,4» (A1 H3; reproducido por DUE con el proceso del dueño). Un decimal en todas las apariciones; el rótulo «supuesto: 5 rivales» sale de la celda (el supuesto queda en «Ver cómo se calcula»).
- BENEFICIA: un solo número por hecho.
- AFECTA: nada de bytes.
- Fuente: `indice:competencia`.

**D-14 · De cada cuántos se gana uno («—» sin histórico)** · cambia · ambos · E6 · tanda 2 · estimado · peticion
- CORTO: «1 de 3 · se gana, aproximadamente · con los 55 procesos de esta entidad» · «1 de 4 · se gana, aproximadamente · con el promedio del departamento» · «— · sin histórico para estimar».
- CONCISO: `frecuenciaNatural(p_ganar)` (`public/app.js:1799`, suelo 2). Hoy `estimarPDetalle` siempre devuelve `p` (cae a `PROMEDIO_CONSERVADOR` de 5 rivales, `lib/probabilidad.js:124`) y la celda pinta «1 de 5» con el supuesto en letra pequeña (A1 H2); la rama «—» (`app.js:2079`) es inalcanzable. La celda mira `p_ganar_detalle.fuente`: con el supuesto pinta «—» y manda el supuesto a «Ver cómo se calcula»; con «departamento» lo dice. `p` sigue viajando y ordenando.
- BENEFICIA: un supuesto no se pinta como número y la celda buena recupera su crédito.
- AFECTA: más tarjetas con «—» (entidades sin 5 procesos en el índice); el orden no cambia.
- Fuente: `p_ganar`, `p_ganar_detalle.fuente`.

**D-15 · Lo que deja, y el precio de mercado como lo que es** · cambia · ambos · E2/P5/P6 · tanda 2 · calculado · peticion (con token)
- CORTO: (b) «≈ $5.920 M · si bajan lo habitual aquí (7 %, 8 contratos)» (hoy: «es lo que suele pagar esta entidad · medido en 8 contratos»); (a) «−$3 M · podría perder, en el peor caso · con el costo que usted calculó», (c) «Calcular · cuánto deja: falta su costo» y (d) «—» se conservan.
- CONCISO: `ganancia.precio_esperado = cuantía × (1 − mediana)` (`lib/ganancia.js:388-391`); lo MEDIDO es la mediana y su n (A1 H7). Solo cambia el rótulo; la cifra exacta sigue en el `title` y en el modal «Lo que deja». Bytes: `ganancia` pesa 3.083 B por fila (40 %) y solo la usa el modal local; si el peso aprieta, la fila lleva `{valor, motivo, precio_esperado, baja_procesos}` y el modal pide el resto al pulsar (decisión de bytes, no de datos).
- BENEFICIA: el precio de adjudicación no lo «paga» la entidad, lo pone el ganador: referencia, no hecho; nunca decide (decide Precios con el costo del usuario).
- AFECTA: revisar las aserciones de la tercera celda (§ «La tercera cifra de la tarjeta es LA PLATA QUE QUEDA»); sin token sigue «—».
- Fuente: `ganancia.precio_esperado`, `baja_mercado`.

**D-16 · Cierre con hora, y «sin fecha» dicho** · cambia · ambos · P7/E17 · tanda 2 · publicado · sync
- CORTO: «Cierra en 31 días · mié 14 de oct · 3:00 p. m.» · «Cierra HOY · 3:00 p. m.» · «Sin fecha de cierre publicada: mírela en el pliego» (gris).
- CONCISO: `fecha_cierre` (`lib/negocio.js:181`, `CIERRE_CANDIDATOS`) trae la hora (DUE reprodujo `2026-10-14T15:00:00.000`, hora de Colombia flotante: `public/app.js:1425` resta 5 h para contar días); `chipCierre` (`:1432`) recibe `cierreTxt` sin hora y con fecha ilegible devuelve `""` (A1 H6). La hora se pinta solo si no es medianoche. Variante descartada: «presente el 13 de oct» dentro del chip (SIN-11) → va en D-36.
- BENEFICIA: «el cierre a las 3:00 p. m. es la hora en que más ofertas mueren» (Guía cap. 4); la ausencia deja de ser muda.
- AFECTA: +12 caracteres en el chip (probar a 390 px); si la hora del dataset no fuera la de Colombia se enseñaría mal: NO VERIFICABLE contra la fuente hoy (403); donde el cronograma del pliego se leyó (`lib/cronograma.js`) esa fecha gana y se dice.
- Fuente: `fecha_de_recepcion_de` → `fecha_cierre`.

**D-17 · Cuánto bajan aquí, con la banda y con su origen** · cambia · ambos · E2/P5 · tanda 2 · medido · peticion (con token)
- CORTO: «Suelen bajar 7 % (unos $445 M) · la mitad de los ganadores bajó entre 3 % y 9 % · 8 contratos de esta entidad» · «Suelen bajar 4 % · lectura del departamento, no de esta entidad» · «Suelen bajar: sin datos de esta entidad».
- CONCISO: `baja_mercado.{baja_mediana, baja_p25, baja_p75, procesos_contados, granularidad_utilizada}` viajan (A1 § 2; `bajaDeMercado`, `lib/indice_baja.js:885-940`) y `chipBaja` (`public/app.js:1349-1366`) solo pinta la mediana; `granularidad_utilizada` se pinta solo en el panel. La banda en palabras, sin «p25/p75» ni «mediana» (cerca `tests/e2e.js:13082`).
- BENEFICIA: la cifra con la que se fija el precio (E2: «la razón número uno por la que las empresas grandes ganan más»); la banda dice cuánto puede moverse; el origen, si es de ESTA entidad.
- AFECTA: con n = 5 la banda es ruido (se enseña con su n y en cubetas); la mediana no decide (decide el optimizador de Precios); nunca dos instrucciones de precio en la misma tarjeta (§ «Lote «B9b-competencia-departamento»…»); sin token «sin datos».
- Fuente: `indice:baja`.

**D-18 · Cuantía, y su ausencia dicha** · cambia · ambos · P1/E1 · tanda 2 · publicado · sync
- CORTO: «$ 6.365.863.685» · «Cuantía no publicada: mírela en el pliego; sin ella no sabemos si le cabe.»
- CONCISO: `cuantia_cop` (`lib/negocio.js:207`; viaja 0 sin dato y la tarjeta lo trata como ausencia). El rótulo de tramo se retira (D-19). Hermano A1 H5: sin cuantía `ve = 0` ordena como cero (`listar.js:153`): las filas sin cuantía pasan a su propio grupo al final, rotulado, no mezcladas con las que valen poco. Toda derivada de la cuantía (D-11, D-35, D-40) descarta la ausencia ANTES de calcular.
- BENEFICIA: quien empieza entiende por qué media tarjeta está en «—» y qué hacer; una obra grande sin presupuesto publicado no se esconde «como si valiera cero».
- AFECTA: cambia el orden de esas filas (siguen al final, como grupo declarado); `puntaje_ponderado` null sin cuantía solo afecta a `?ordenar_por=puntaje`.
- Fuente: `precio_base` → `cuantia_cop`.

**D-19 · Rótulo «cuantía alta / media / baja»** · se_retira · ambos · E1 · tanda 2 · calculado · sync
- CORTO: (deja de pintarse).
- CONCISO: tramos internos < 100 M / 100-500 M / > 500 M (`lib/negocio.js:34-35`, `cuantia_rango`); nadie decide con «alta»: el dueño decide con la capacidad (D-12) y con el umbral Mipyme (D-40). Sigue viajando para el filtro por rango.
- BENEFICIA: quita un adjetivo que parecía un juicio y deja sitio a la modalidad y al plazo en la misma línea.
- AFECTA: ninguna.
- Fuente: `cuantia_rango`.

**D-20 · Banda de competencia: nivel, base y qué abre** · cambia · ambos · E5/E6 · tanda 2 · medido · peticion / clic
- CORTO: «● Poca competencia · 55 procesos · quién gana aquí ›» · «● Sin datos históricos de esta entidad ›».
- CONCISO: `bandaCompetencia` (`public/app.js:1606`) conserva nivel y botón; la cifra vive solo en D-13 (una cifra por hecho) y el texto dice el destino (SIN-17). Variante descartada: DUE-13 «1,4 por proceso · 55 procesos ›» (repite la cifra de la celda).
- BENEFICIA: se lee sin traducir y se sabe qué abre.
- AFECTA: la cerradura del badge (`tests/e2e.js:23608-23614`: `data-entidad`, `cursor-pointer`) se conserva.
- Fuente: `indice:competencia`.

**D-21 · Cierre prorrogado, con los días** · cambia · ambos · E6/E8 · tanda 2 · medido · peticion
- CORTO: «Cierre prorrogado 12 días (antes cerraba el 1 de oct)».
- CONCISO: `_cierre_prorrogado` + `_cierre_inicial` (`lib/almacen.js:370-371`, derivados entre versiones del dataset; los dos viajan); días = `fecha_cierre − _cierre_inicial`; solo si `_versiones > 1`.
- BENEFICIA: una prórroga larga suele significar que no llegaron ofertas (factor 1,20 de `lib/probabilidad.js:125`) y es más tiempo para armar la oferta.
- AFECTA: «no prorrogado» puede ser «no lo vimos»: se dice «desde que la aplicación lo sigue».
- Fuente: versiones del corpus.

**D-22 · Cambio de reglas, con conteo y fecha del último** · cambia · ambos · E8 · tanda 2 · medido · peticion
- CORTO: «La entidad cambió las reglas de este proceso · 2 cambios · el último el 3 de septiembre» + los renglones de hoy («● Cierre: pasó de … a …»).
- CONCISO: `adendas.n` y la fecha de la última versión (`_cambios`, `lib/almacen.js:378-384`; `evaluarAdendas`, `lib/adendas.js:44-100`).
- BENEFICIA: cuántas veces y cuándo cambió es lo que decide si releer el pliego hoy.
- AFECTA: solo ve cambios del dataset (cierre, presupuesto, plazo, objeto, modalidad), no adendas de texto: se dice; D-54 lo complementa.
- Fuente: versiones del corpus.

**D-23 · Cómo lo adjudican (la modalidad), arriba** · cambia · ambos · E15/E17/P13 · tanda 2 · publicado · sync
- CORTO: «Licitación pública» · «Selección abreviada de menor cuantía» · «Mínima cuantía» (chip corto junto a la cuantía).
- CONCISO: `modalidad_de_contratacion` tal como la publica p6dx; hoy plegada (`public/app.js:2201`). Es nombre propio (glosario `modalidad.visible` «Cómo lo adjudican», `public/glosario.js:81`). La explicación en llano es un dato aparte: D-46.
- BENEFICIA: la modalidad decide si hay manifestación de interés, si el método de precio se sortea y si la entidad puede limitar a Mipyme; se lee antes que la cuantía.
- AFECTA: ninguna (texto que ya viaja).
- Fuente: p6dx.

**D-24 · Precio global arriba; precios unitarios explicado, plegado** · cambia · ambos · E12 · tanda 2 · estimado · peticion
- CORTO: arriba, solo cuando aplica: «Precio global: el riesgo de las cantidades es suyo» (ámbar); plegado: «Precios unitarios: si hay más cantidad, se paga».
- CONCISO: `tipo_precio` (`tipoPrecio`, `lib/negocio.js:251-274`, regex sobre objeto y descripción; `null` si dice las dos o ninguna → no se pinta). Hoy la explicación vive en el `title` (`public/app.js:2200-2203`), que en teléfono no existe. Fusión de EXP-32 (arriba) y SIN-37 (explicado): arriba solo el caso que cambia una decisión.
- BENEFICIA: la variable de riesgo del APU (COMPLEMENTO V-03) a la vista cuando importa.
- AFECTA: estimado del texto; con `null` no se adivina.
- Fuente: objeto y descripción del proceso.

**D-25 · Entidad · municipio · departamento** · cambia · ambos · P12/E5 · tanda 2 · publicado · peticion
- CORTO: «ALCALDÍA MUNICIPAL DE PURIFICACIÓN · Purificación · Tolima».
- CONCISO: `entidad`, `ciudad_entidad`, `departamento_entidad` (publicados). Absorbe el chip plegado de ubicación (D-26).
- BENEFICIA: el «dónde» en una línea; con el municipio se sabe si se conoce la zona y los proveedores.
- AFECTA: es la SEDE de la entidad, no el sitio de la obra (A4 #3-4; `docs/ATRACTIVIDAD.md` R5): se dice; cuando exista `gra4-pcp2` (dónde se ejecuta) gana (fuente externa; sin ficha aquí).
- Fuente: p6dx.

**D-26 · Chip plegado de ubicación («PURIFICACIÓN ✓»)** · se_pliega · ambos · P12 · tanda 2 · publicado · sync
- CORTO: (absorbido por D-25; el ✓ deja de pintarse).
- CONCISO: `ciudad_entidad` + `ubicacion_valida` (`lib/negocio.js:170`: «está en la lista de ubicaciones del perfil»). El chip de zona (D-70) ya dice lo que decide.
- BENEFICIA: un dato menos repetido.
- AFECTA: ninguna.
- Fuente: `ubicacion_valida`.

**D-27 · Chip «Capacidad calculada con ingreso estimado»** · se_pliega · ambos · P3 · tanda 2 · estimado · peticion
- CORTO: pasa a ser la frase «Capacidad calculada con un ingreso estimado: cargue el ingreso de su RUP en Mi empresa» dentro del renglón de la capacidad (D-12).
- CONCISO: `rup.co_estimado` (`lib/rup.js:138`: CO = utilidad × 16,7 cuando el RUP no trae ingreso; sale en todas las reproducciones de hoy). Hoy el chip no dice qué hacer (DUE-24 lo corrige; EXP-31 lo funde).
- BENEFICIA: el dueño puede quitar el supuesto cargando un dato; hasta entonces sabe que su capacidad es un techo.
- AFECTA: sin token no se pinta (`co_estimado` null).
- Fuente: `rup.co_estimado`.

**D-28 · «Calcular mi precio» lleva el plazo** · cambia · ambos · P6 · tanda 2 · calculado · clic
- CORTO: (sin texto nuevo: el editor de Precios abre con el plazo del proceso).
- CONCISO: `qApu` (`public/app.js:2114-2126`) lee `l.plazo_meses`, que la fila de `op=listar` no lleva (A1 H4; reproducido `plazo_meses: undefined`). La fila publica `plazo_meses = plazoMesesDe(fila)` (`lib/capacidad.js:148`, llamada, no reescrita) SOLO con `duracion` legible; sin duración `null`, no el 12 que asume la K. Variante descartada: derivarlo en el cliente (EXP-36): `plazoMesesDe` vive en `lib/`.
- BENEFICIA: el APU nace con el plazo, que mueve administración y financiación.
- AFECTA: +15 B por fila.
- Fuente: `duracion`, `unidad_de_duracion`.

**D-29 · Los «—» dicen por qué (sin cuantía · sin clave)** · cambia · sin_experiencia · P1/P6 · tanda 2 · calculado · peticion
- CORTO: celda 3: «— · sin cuantía publicada» · «— · entre con su clave para ver cifras»; cabecera de la lista, una sola vez: «Sin su clave, la lista no enseña cifras de dinero ni cuánto bajan.»
- CONCISO: `ganancia.motivo` («sin_presupuesto_oficial») y `finanzas_visibles: false` en la cabecera de `op=listar` (`lib/publico.js:118`): sin credencial la tarjeta pierde exactamente cuatro cosas sin decir por qué (A1 H8). Fusión de SIN-10 y SIN-44.
- BENEFICIA: un «—» que dice por qué es una instrucción; el «—» de acceso no se confunde con «no hay datos».
- AFECTA: nada; token presente e inválido sigue siendo 401.
- Fuente: `ganancia.motivo`, `finanzas_visibles`.

**D-30 · Rótulo «Para ganar», y lo que la aplicación no mide** · cambia · sin_experiencia · P1/E15 · tanda 2 · calculado · peticion / clic
- CORTO: rótulo «Para ganar» sobre la franja de tres celdas; en «Ver cómo se calcula»: «Lo que la aplicación no mide: los puntos que da el pliego (calidad, precio, apoyo a la industria nacional). Léalos en el capítulo de evaluación.»
- CONCISO: `bloqueProbabilidad` (`public/app.js:2022-2110`) y el modal de `op=probabilidad`. Ningún módulo modela el puntaje (A3 § (b)): se declara, no se inventa un peso.
- BENEFICIA: quien empieza confunde «cumplo» con «gano» (A5 W1): dos rótulos lo separan y sabe qué le falta leer.
- AFECTA: nada.
- Fuente: — (rótulo).

**D-31 · Guardar dice qué da** · cambia · sin_experiencia · P4/P8 · tanda 2 · calculado · clic
- CORTO: «Guardar · para ver qué le piden y el paso a paso» (línea a la vista, no solo `title`).
- CONCISO: `botonGuardar` (`public/app.js:3553-3567`). Detrás de Guardar están la ficha de ocho casillas «Lo que exige este pliego», los 10 requisitos con «dónde se consigue» y el paso a paso fechado (`lib/guia_proceso.js`); quien empieza no lo sabe. El «›» de D-43 es este mismo botón.
- BENEFICIA: P4/P8 sin descubrirlo por accidente.
- AFECTA: nada.
- Fuente: — (rótulo).

**D-32 · Antesala ligera: el modal de la entidad no espera a Socrata** · cambia · ambos · E5/E7 · tanda 2 · medido · clic
- CORTO: (sin texto nuevo arriba) un pliegue al pie del modal: «Ver quiénes se presentan y cómo ejecuta sus contratos ›».
- CONCISO: `detalleEntidad` hace el barrido del histórico MÁS dos consultas vivas a datos.gov.co con tope de 6.000 ms cada una que no se cachean si fallan (`lib/competencia_detalle.js:482-485`, `lib/proponentes.js:45`, `lib/ejecucion.js:37`; A2 § 3.4). `op=entidad&ligero=1` desde la tarjeta (solo histórico) y las dos fuentes vivas en un segundo paso al pulsar el pliegue.
- BENEFICIA: «Quién gana aquí» abre sin esperar hasta 6 s a una fuente externa.
- AFECTA: dos peticiones cuando el usuario sí quiere lo vivo; la caché de 1 h por entidad se mantiene; es un parámetro, no una `op` nueva (`api/*.js` sigue en 6).
- Fuente: `op=entidad`.

### 2.3 Tanda 3 · datos nuevos con lo que ya viaja en la fila o ya existe en un módulo

**D-33 · Referencia del proceso** · nuevo · ambos · E1/P4/P8 · tanda 3 · publicado · peticion
- CORTO: «Ref. LP-008-2026» en gris junto al título (sin referencia, nada). EJEMPLO.
- CONCISO: `referencia_del_proceso` (proyección, `lib/proyeccion.js:38-61`) viaja en cada fila y ningún `public/*.js` la pinta (censo DUE: `grep -rl referencia_del_proceso public/` → nada; A4 Tabla A #8). Reproducido por DUE: `LP-008-2026-900001`.
- BENEFICIA: es el identificador con el que la entidad, el pliego y el correo nombran el proceso; así se busca en SECOP II, así se cita en observaciones y así se rotula la carpeta.
- AFECTA: 25-30 B que ya viajan.
- Fuente: `referencia_del_proceso`.

**D-34 · Plazo de obra** · nuevo · ambos · P3/E3 · tanda 3 · publicado · peticion
- CORTO: «8 meses de obra» arriba, junto a la cuantía · «Plazo no publicado (la capacidad se calculó con un año)».
- CONCISO: `duracion` + `unidad_de_duracion` (viajan; hoy solo en `public/expediente.js:405`) con `plazoMesesDe` (`lib/capacidad.js:148`; reproducido 8 → 8). Sin duración `plazoMesesDe({}) = 12` para la K (A4 C8) y ese 12 NO se enseña como plazo: la ausencia declara que la capacidad lo asumió (texto de SIN-32).
- BENEFICIA: la primera pregunta del flujo de caja y de la capacidad; hoy no se ve hasta guardar.
- AFECTA: +30 B de texto; `duraci_n_del_contrato` de jbjy puede diferir del proceso (A4).
- Fuente: `duracion`, `unidad_de_duracion`.

**D-35 · Ritmo mensual de la obra** · nuevo · ambos · P3/E3 · tanda 3 · calculado · peticion
- CORTO: «Unos $796 M por mes de obra durante 8 meses» (plegado).
- CONCISO: `cuantia_cop ÷ plazoMesesDe(fila)` (A4 C2; reproducido: 6.365.863.685 / 8 = 795.732.961). Solo con duración publicada y cuantía: un supuesto no se multiplica.
- BENEFICIA: el tamaño del compromiso mensual (facturación, personal, caja) en unidades que quien empieza entiende y que el experimentado compara con su capacidad.
- AFECTA: es ritmo, no flujo de caja real (actas, retenciones, anticipo): se dice «unos» y «de obra».
- Fuente: `cuantia_cop`, `duracion`.

**D-36 · Días de oficina que le quedan, y cuándo presentar** · nuevo · ambos · P7/P14 · tanda 3 · calculado · peticion
- CORTO: «Le quedan 22 días de oficina para armar la oferta · presente a más tardar el 13 de oct».
- CONCISO: `dias_oficina_restantes = habilesEntre(hoyColombia, fecha_cierre)` (`lib/habiles.js:93`, festivos incluidos; reproducido 22) y `presentar_el` = el día hábil anterior al cierre, la regla del paso «Cargue y PRESENTE la oferta completa» (`lib/guia_proceso.js:452`) extraída a una función que la guía y `listar` LLAMAN. «Días de oficina» es el término del glosario (`dias_habiles.visible`, `public/glosario.js:86`); la suite prohíbe «hábiles» en pantalla (`tests/e2e.js:13082`).
- BENEFICIA: P14 («¿me alcanza el tiempo?») y P7 (cada fecha lleva su acción); el manual estima 5-8 días de oficina para armar una oferta (A5 W19, estimado sin página: NO se pinta como cifra).
- AFECTA: `habilesEntre` cuenta el día del cierre entero aunque cierre a las 15:00 (SIN § 8.6): se dice «hasta el cierre» y se recuerda presentar el día anterior; sin fecha de cierre no se pinta; +14 B.
- Fuente: `fecha_cierre`, `lib/habiles`, regla de la guía.

**D-37 · Días de oficina que dio este proceso para ofertar** · nuevo · ambos · P14/E5/P16 · tanda 3 · calculado · peticion
- CORTO: «Da 30 días de oficina para ofertar (publicado el 1 de sep, cierra el 14 de oct)» (plegado, junto a D-50 cuando exista).
- CONCISO: `dias_oficina_dados = habilesEntre(fecha_de_publicacion_del, fecha_cierre)` (los dos campos viajan; reproducido por SIN: 30; por EXP con el 13-oct: 29; A4 C1 con otro par: 18). Nombre distinto de D-36 y D-50 a propósito.
- BENEFICIA: la mitad de la señal #5 del pliego a la medida (plazos mínimos) hecha dato sin leer el pliego (A5 § 4.2 desmiente que exija texto).
- AFECTA: si una adenda movió el cierre, el conteo es desde la publicación original (hasta D-54): se dice «publicado el …» para que se vea la base. Informativo, nunca bloquea.
- Fuente: `fecha_de_publicacion_del`, `fecha_cierre`.

**D-38 · Cierre en fecha difícil** · nuevo · ambos · E5/P16 · tanda 3 · calculado · peticion
- CORTO: «El cierre cae el día siguiente a un festivo: confirme la hora en el cronograma» · «Cierra entre el 20 de diciembre y el 10 de enero: pocos días de oficina para preparar la oferta» (ámbar, informativo).
- CONCISO: `fecha_cierre` contra `esFestivo`/`esHabil` (`lib/habiles.js:77-78`; reproducido: 12-oct-2026 festivo, 13-oct hábil) y la ventana 20-dic/10-ene (señal #10 del manual, cap. 18; no es una norma).
- BENEFICIA: retirarse temprano de un calendario diseñado para que nadie llegue, o al menos confirmar la hora.
- AFECTA: puede coincidir con procesos legítimos: por eso ámbar y «puede ser»; nunca bloquea (el falso caro es el negativo).
- Fuente: `fecha_cierre`, `lib/habiles`.

**D-39 · Cuánto tarda en adjudicar y cuántos declara desiertos** · nuevo (en la tarjeta; ya en el modal) · ambos · E7/P7 · tanda 3 · medido · peticion
- CORTO: «Adjudica en unos 7 días de oficina tras el cierre (la mitad de sus 8 procesos con las dos fechas) · Declaró desierto 1 de sus 9» (plegado); bajo el mínimo: «sin dato (hacen falta 5; hay 3)». EJEMPLO.
- CONCISO: el hash YA lo publica por entidad (`plazo_adjudicacion {base, mediana_dias_habiles, p75_dias_habiles}`, `desiertos {n, adjudicados, base, pct}`; `hechosDeRegistro`, `lib/indice_competencia.js:479`; M-DGF-08) y el modal ya lo enseña (`htmlPlazoAdjudicacion`, `htmlDesiertos`, `public/app.js:3050-3076`), pero la fila NO lo lleva (EXP § 7.a, reproducido: `competencia_entidad` sale sin `plazo_adjudicacion`). `competenciaDe` añade los dos objetos a `competencia_entidad` (≤ 183 B, medido) y la tarjeta reutiliza las dos funciones del modal. Variantes descartadas: campo aparte `hechos_entidad` (EXP-44) y chip arriba «Adjudica en ~7 días de oficina ›» (EXP).
- BENEFICIA: cuánto tarda la entidad en decidir es cuánto tarda su caja en saber si empieza y cuándo se libera capacidad; una entidad que declara desierto uno de cada tres avisa antes de gastar equipo.
- AFECTA: +≈ 183 B por fila; «días de oficina» y frecuencias naturales (ni «mediana» ni «p75»); cancelados y revocados no entran en la base (declarado en la meta); si el hash de producción es anterior a M-DGF-08 exige reconstruirlo (paso del dueño ya escrito en § «Lote «B9b-competencia-departamento»…»).
- Fuente: `indice:competencia`.

**D-40 · Cabe en el tope Mipyme, y con qué socia** · nuevo · ambos · E15 · tanda 3 · calculado · peticion
- CORTO: «Cabe en el tope Mipyme ($511,7 M en 2026): con Génesis conserva esa opción; con PRODIAC no» (plegado, solo si la cuantía es menor que el umbral; y como aviso en la línea de socio cuando la socia grande la cerraría). No aparece en Purificación ($6.366 M).
- CONCISO: `cuantia_cop < UMBRAL_MIPYME_2026` (`lib/socio_por_proceso.js:48`, cifra con fecha y fuente en `docs/COMPLEMENTO_ANALISTA_LICITACIONES.md § «V-12 · Umbrales y cifras de 2026»`) + `tamanoEmpresa` publicado de cada perfil (Helder y Génesis microempresa, PRODIAC gran empresa: `lib/perfiles.js:86,121,156`; `NO_ES_MIPYME`, `socio_por_proceso.js:53`). Es la sospecha que hoy produce `aviso_mipyme` (`:107-115`), enseñada. El corpus NO publica si la convocatoria quedó limitada (A3 § (b)): nunca «limitada», solo «cabe en el tope».
- BENEFICIA: para una microempresa es la ventaja más barata del mercado: por debajo del umbral, ir con Génesis (micro + micro) deja abierta una convocatoria solo para Mipyme; ir con PRODIAC la cierra. Elegir socia por proceso con este dato es «adjudicar más» sin bajar el precio.
- AFECTA: la regla de cuántas Mipyme deben pedir la limitación y cuándo (A5 W10: «al menos dos», «un día hábil antes del acto de apertura», resumen del buscador, norma NO leída) no se escribe en pantalla; el umbral cambia cada año (revisar en enero, como dice el propio código).
- Fuente: `cuantia_cop`, `UMBRAL_MIPYME_2026`, `tamanoEmpresa`.

**D-41 · Capacidad comprometida si gana lo que marcó «me presenté»** · nuevo · ambos · P3/E1 · tanda 3 · calculado · peticion
- CORTO: «Si gana todo lo que marcó «me presenté», compromete $9.200 M de los $4.471 M que puede facturar: no le caben todas» (cabecera de Mis procesos). EJEMPLO.
- CONCISO: suma de `p2_k.crpc` de los guardados en estado «me presenté» frente a la K del perfil; no existe hoy (censo DUE: `comprometid|cartera` en `lib/handlers/perfil/*` y `public/app.js` → solo el «valor comprometido» del COMPETIDOR, `lib/seguimiento.js:28,529`). La K hereda el «se asume 0» de los contratos en ejecución (D-60 lo corrige) y lo dice.
- BENEFICIA: la palanca (a) del dueño: presentarse a más procesos sin prometer lo que la capacidad no permite firmar.
- AFECTA: solo con token; calculado sobre un techo (D-27), y lo dice; mutación de su cerradura: contar «me interesa» en vez de «me presenté».
- Fuente: guardados del perfil + `p2_k.crpc`.

**D-42 · Cuántas obras adjudica al año esta entidad** · nuevo · experimentado · E10 · tanda 3 · medido · peticion
- CORTO: «Adjudicó 25 obras en 2025 y 10 en lo que va de 2026 (las que sigue la aplicación)» (plegado). EJEMPLO.
- CONCISO: `competencia_entidad.por_anio` ya viaja en la fila (`lib/indice_competencia.js:377-386`: conteo siempre, promedio solo con mínimo) y la tarjeta no lo usa (A1 § 2). Conteo por año de adjudicación en el corpus (obra y afines, competitivas, desde 2024): cota inferior.
- BENEFICIA: dónde invertir relación y RUP: una entidad que adjudica 25 obras al año vale más seguimiento que una que adjudica 2.
- AFECTA: nada de bytes; se dice «las que sigue la aplicación».
- Fuente: `competencia_entidad.por_anio`.

**D-43 · Siguiente paso** · nuevo · sin_experiencia · P7 · tanda 3 · calculado · peticion
- CORTO: «Siguiente paso · hoy: lea primero las causales de rechazo y el cronograma del pliego · Guárdelo para el paso a paso completo ›».
- CONCISO: el primer paso con fecha ≥ hoy del paso a paso de la guía (`lib/guia_proceso.js:434-481`: causales hoy, garantía −5 días de oficina, observaciones −7 días, presentar el día anterior, pantallazo, cierre, traslado, adjudicación). El bloque se extrae a `pasosDe({cierre, manif, modalidad, hoy})` que `guiaDe` y `listar` LLAMAN; por fila viajan `{cuando, titulo}` (97 B). `guiaDe` entera cuesta 473 µs por fila (reproducido por SIN); la función extraída, una fracción. Con manifestación de interés viva el paso ya lo dice el chip (D-69): se omite. «Guárdelo…» es el botón Guardar (D-31), no un botón nuevo.
- BENEFICIA: P7 («¿cuándo hago cada cosa?») sin tener que guardar; el resto del paso a paso sigue detrás de Guardar.
- AFECTA: ≈ 2 KB por página; el primer día el paso es genérico.
- Fuente: `pasosDe` (guía).

**D-44 · Le descontarán el 5 % de obra pública** · nuevo · sin_experiencia · E3/P6 · tanda 3 · calculado · peticion
- CORTO: «Le descontarán el 5 % de obra pública: ≈ $318 M sobre el presupuesto» (plegado).
- CONCISO: `CONTRIBUCION_PCT` y `aplicaContribucion(tipo)` (`lib/ganancia.js:111,136`, fuente única; Ley 418/1997 art. 120, permanente por Ley 1738/2014 art. 8, citada en `lib/guia_proceso.js:80-93`); la guía ya lo calcula (`dinero.contribucion_obra_5pct_cop`; reproducido 318.293.184). Solo obra (interventoría y consultoría no la causan); la base real es el valor del CONTRATO (su oferta): por eso «sobre el presupuesto».
- BENEFICIA: «el olvido más caro del país» (E3): quien empieza lo descubre en la primera acta.
- AFECTA: con tipo de trabajo desconocido no se pinta (ante la duda, no prometer); la norma no se releyó desde aquí (se cita como consta en el árbol).
- Fuente: `lib/ganancia` (tarifa publicada).

**D-45 · La obra cruza diciembre** · nuevo · sin_experiencia · P6/E3 · tanda 3 · calculado · peticion
- CORTO: «La obra cruza diciembre: en enero suben el salario mínimo y los materiales» (plegado).
- CONCISO: `obra.plazo.cruza_diciembre` de la guía (`lib/guia_proceso.js:286`; reproducido `true` con plazo 8 y cierre 14-oct) y su consejo de reajuste (`:532`). Se calcula desde el cierre + plazo: el acta de inicio llega después, así que es optimista, y se dice.
- BENEFICIA: un costo que quien empieza no ve hasta que le sube la nómina.
- AFECTA: sin plazo publicado no se pinta.
- Fuente: guía (`cruza_diciembre`).

**D-46 · Qué significa esa modalidad, en llano** · nuevo · sin_experiencia · P13/P1 · tanda 3 · publicado · peticion
- CORTO: «Licitación pública: el proceso grande; el método de puntuar el precio se sortea» (plegado; la explicación completa en el expediente).
- CONCISO: `modalidadEnLlano` (`lib/guia_proceso.js:121`) ya redacta las siete modalidades; `listar` publica UNA VEZ por respuesta un diccionario `modalidades: {clave: {nombre, explicacion}}` (≈ 1 KB) y cada fila lleva su clave (`filtro.modalidad` ya existe). El chip de arriba (D-23) sigue siendo el nombre propio.
- BENEFICIA: «Selección abreviada de menor cuantía» no le dice a quien empieza que hay que avisar antes; la explicación sí.
- AFECTA: ≈ 1 KB por respuesta; una sola redacción (servidor).
- Fuente: `modalidad_de_contratacion` + `modalidadEnLlano`.

**D-47 · Su historial con esta entidad** · nuevo · ambos · E16 · tanda 3 · medido · peticion
- CORTO: «Ya se presentó aquí 2 veces y ganó 1» (plegado; solo si hay guardados con desenlace en esa entidad).
- CONCISO: los guardados del perfil con esa `entidad` y su desenlace (`lib/handlers/perfil/seguimiento.js`, `S.desenlaceDe`, `:139-142`), calculados en el servidor al servir la página (el listado ya carga por proceso los costos del dueño, `listar.js:444`: misma ruta). Solo con token. Variante descartada: EXP-56 (el NIT del dueño en `hgi6`: externo y solo desde la apertura).
- BENEFICIA: dónde ya tiene pie (relación, formatos, conocimiento del pliego) y dónde ya perdió: el postmortem por entidad sin hoja de Excel.
- AFECTA: 30-40 B en las filas donde aplica; un desenlace sin marcar no cuenta como derrota.
- Fuente: guardados del perfil.

**D-48 · Con quién ha ganado** · nuevo · experimentado · E16 · tanda 3 · medido · peticion
- CORTO: «Presentadas 12 · ganadas 3 (2 con Génesis, 1 solo) · 4 sin resultado todavía · según el consejo guardado» (cabecera de Mis procesos). EJEMPLO.
- CONCISO: Mis procesos ya dice «Ganó 1 de 3 presentadas» con ≥ 3 presentadas (`public/app.js:4316-4338`); el expediente guarda el consejo congelado (`congelarSocio`, `seguimiento.js:168-181`) y el desenlace marcado. Se agrupa por `socio.recomendacion.socio` congelado. Es lo que el usuario marcó, no con quién consorció de verdad.
- BENEFICIA: la respuesta real a «¿con quién gano más?», acumulada sin trabajo (E16).
- AFECTA: mínimo 3 presentadas, como hoy; un consejo distinto del consorcio real desvía la cuenta y se declara.
- Fuente: expedientes guardados.

**D-49 · Lo que cuesta presentarse (expediente)** · se_conserva · ambos · E3 · tanda 3 · calculado · clic
- CORTO: «Garantía de seriedad asegurada: $637 M (10 %) · Contribución de obra pública 5 %: $318 M · Financiar antes del primer pago: ≈ $1.273 M».
- CONCISO: `guiaDe(...).dinero` (`lib/guia_proceso.js`; reproducido 636.586.369 / 318.293.184 / 1.273.172.737). La tarjeta enlaza (Guardar); no se repite. La base de la garantía (presupuesto en la guía `:95`, oferta en `lib/dictamen.js:338-339`) es un par por resolver (D-64).
- BENEFICIA: el costo que no está en el APU, antes de decidir.
- AFECTA: nada nuevo.
- Fuente: guía.

### 2.4 Tanda 4 · datos nuevos que exigen reconstruir un índice, una extracción completa o una carga del dueño

**D-50 · Lo que esta entidad suele dar para ofertar** · nuevo · ambos · P14/E5 · tanda 4 · medido · sync
- CORTO: «Esta entidad suele dar 21 días de oficina para ofertar (en 12 procesos); este proceso da 9» (plegado, junto a D-37). EJEMPLO.
- CONCISO: en `construirIndice`, por entidad, la mediana ÚNICA de `lib/estadistica` (§ «Cinco medianas en `lib/`, y ya divergían (13-sep-2026)») de `habilesEntre(publicación, cierre)` de los procesos cerrados, con el mismo `percentilHistograma` y el mismo mínimo de 5 que el plazo de adjudicación (`lib/indice_competencia.js:457-467`: llamar, no reescribir); campo `dias_oficina_suele_dar`. Censo hoy: 0 (A5 § 7.7).
- BENEFICIA: «este da 9 y la entidad suele dar 21» es la señal de plazo mínimo con base propia de la entidad.
- AFECTA: exige reconstruir el índice (`?reconstruir_indice=true`); frescura hasta un mes, declarada; +≈ 60 B por fila; ámbar, nunca bloquea.
- Fuente: histórico p6dx (índice de competencia).

**D-51 · Ganadores locales frente a foráneos** · nuevo · ambos · E5/P16 · tanda 4 · medido · sync
- CORTO: «7 de cada 10 ganadores aquí tienen domicilio registrado en Tolima (12 contratos)» (modal de la entidad; y plegado en la tarjeta cuando ese departamento es el de la base del dueño). EJEMPLO.
- CONCISO: `departamento_proveedor` se guarda en el histórico y ningún módulo la lee (A4 #45-46, grep); en el barrido del índice, por entidad, la proporción de adjudicados con `departamento_proveedor === departamento_entidad`, mínimo 5, «No Definido» aparte.
- BENEFICIA: si una alcaldía contrata con los de su zona y si un foráneo entra; para Helder (Ibagué) es la señal de dónde juega de local.
- AFECTA: es el domicilio REGISTRADO en SECOP, no la sede real: se dice; exige reconstruir el índice; ~20 B en el registro.
- Fuente: histórico p6dx.

**D-52 · Se adjudicó por el presupuesto oficial en X de N** · nuevo · ambos · E2/P5 · tanda 4 · medido · sync
- CORTO: «Aquí 9 de 12 ganaron ofertando el presupuesto completo» (entidad; modal y plegado) · sin base de la entidad: «Se adjudicó por el presupuesto oficial en 131 de 131 contratos de Tolima» (junto a D-75). EJEMPLO.
- CONCISO: la cubeta 0 del histograma de baja como frecuencia natural; la meta publica `baja_exactamente_cero` global (`lib/indice_baja.js:37-41`), no por entidad: se acumula por entidad y departamento en el mismo barrido. Fusión de SIN-50 (entidad) y EXP-57 (departamento): un dato, dos granularidades, la más cercana con base ≥ 5.
- BENEFICIA: «¿tengo que bajar?» con la respuesta más simple posible; «sin bajar el precio» con su cuenta.
- AFECTA: NO VERIFICADO si el registro publicado del índice de baja conserva la cubeta 0 por entidad; si no, exige reconstruir el índice de baja (cron nocturno).
- Fuente: `indice:baja`.

**D-53 · Gana sobre todo en <departamento> (perfil del competidor)** · nuevo · experimentado · E5 · tanda 4 · publicado · sync
- CORTO: «Gana sobre todo en Tolima: 4 de sus 6 entidades (11 de 15 contratos)». EJEMPLO.
- CONCISO: el acumulador del índice inverso (D-03) guarda, por entidad del competidor, `departamento_entidad` (columna publicada que ya está en la fila histórica) y el modal agrupa `entidades[]` por departamento; hoy `entidades[]` lleva solo nombre, ganados, valor y última (`lib/competencia_detalle.js:670-681`). Conviene reservar el campo desde la construcción de la tanda 1 para no barrer dos veces.
- BENEFICIA: el dueño (base Ibagué) sabe si el rival es local o foráneo y en qué departamentos no compite con él.
- AFECTA: 8-12 B por entidad del competidor; departamento = sede de la entidad, no la obra, y se dice.
- Fuente: `indice:adjudicatario` + `departamento_entidad`.

**D-54 · Republicado desde su publicación** · nuevo · ambos · E8 · tanda 4 · publicado · sync
- CORTO: «Republicado el 3 de septiembre (puede ser una adenda o una publicación de fase)» (plegado). EJEMPLO.
- CONCISO: `fecha_de_ultima_publicaci` (diccionario SARA #15; A4: cobertura 100 % en el censo del 16-ago; hoy descartada por la proyección, reproducido C4); tres módulos ya la leen como respaldo inerte (`lib/dictamen.js:404`, `lib/cronograma.js:91`, `lib/manifestacion.js:134`). Entra en `lib/proyeccion.CAMPOS` + una extracción completa (cero peticiones nuevas: se piden todas las columnas, `lib/socrata.js:12-17`) + medir cobertura con `lib/columnas_historicas` ANTES de enseñar.
- BENEFICIA: la señal de «algo cambió» sin leer el pliego, para los procesos que la ingesta no vio cambiar entre versiones (complementa D-22).
- AFECTA: NO se puede afirmar que sea adenda: el texto lo dice; `e2u2-swiw` (modificaciones a procesos) sería mejor fuente, tras la sonda.
- Fuente: p6dx.

**D-55 · Proceso por lotes** · nuevo · ambos · P1/E1 · tanda 4 · publicado · sync
- CORTO: «Proceso por lotes (3): puede presentarse a uno solo; el valor de cada lote está en el pliego» (plegado). EJEMPLO.
- CONCISO: `numero_de_lotes` llega solo al histórico (`lib/indice_competencia.js:121-127`; A4 C5 reproducido: activa `undefined`, histórica `3`) y ningún módulo lo lee. Entra en `CAMPOS` + full + cobertura medida antes de pintar (la lección de `proveedores_que_manifestaron = 0`). El valor por lote NO está en el dataset: la capacidad se evalúa contra la suma (cota superior) y se dice.
- BENEFICIA: para adjudicar MÁS, tres lotes son tres oportunidades con una sola oferta; para una empresa pequeña, un lote de $800 M dentro de $6.000 M es la diferencia entre poder y no poder. Explica además los desenlaces `desierto_con_adjudicacion` y los «lotes parciales» que el índice de baja excluye (`lib/indice_baja.js:23-26`).
- AFECTA: cobertura sin medir; sin dato por lote las puertas siguen midiendo la suma (declarado).
- Fuente: p6dx.

**D-56 · Qué documentos tipo probablemente rigen** · nuevo · experimentado · E11 · tanda 4 · estimado · peticion
- CORTO: «Probablemente rigen los documentos tipo de infraestructura social vigentes desde febrero de 2026: confírmelo en el aviso de convocatoria» (plegado; solo con sector inequívoco).
- CONCISO: sector (`tipo_de_contrato`, objeto, `codigo_principal_de_categoria`) + `fecha_de_publicacion_del` ≥ 16-feb-2026 → v2 de infraestructura social (`lib/dictamen.js:311-312` ya escribe la norma citable; transporte → `lib/formulario1.js:87`). Censo hoy: 0 (A5 § 4.1). Es una DEDUCCIÓN: «probablemente», y el aviso de convocatoria gana. Va en la tanda 4 por riesgo, no por costo.
- BENEFICIA: distingue un pliego desactualizado de uno a la medida y dice qué fórmula de experiencia aplica.
- AFECTA: riesgo de sector mal deducido (por eso solo con sector claro); el texto de la resolución no se leyó desde aquí (NO VERIFICABLE).
- Fuente: campos publicados + norma citada en el árbol.

**D-57 · Experiencia por contratos de cada socia** · nuevo · experimentado · E9 · tanda 4 · publicado · clic
- CORTO: «Génesis acredita 14 contratos de pavimentación por $9.800 M (RUP 2023)» · «PRODIAC: experiencia por contratos sin cargar» (expediente). EJEMPLO.
- CONCISO: `POST /api/admin?op=experiencia` ya valida y guarda `{contratos:[…]}` (`lib/experiencia.js`); la clave `config:experiencia` es única y compartida (`lib/almacen.js:180`): hay que hacerla POR PERFIL antes de cargar dos socias, o una tapa a la otra (A3 § (d)). Los 106 de Génesis existen en el árbol (`experiencia_genesis_106.json`; carga en producción NO VERIFICABLE); los 327 de PRODIAC no existen en el árbol. Con esto «aporta la experiencia» pasa de «tiene la clase» a «acredita N contratos de este tipo».
- BENEFICIA: elegir la socia que acredita la experiencia que pide el pliego y darle el porcentaje que el pliego exige a quien la aporta.
- AFECTA: sin archivo de PRODIAC, «sin cargar» (nunca 0 contratos); el pliego puede pedir otra definición de experiencia (las tablas siguen sin leerse, `lib/guia_proceso.js:68`). Hermano: `resumenPerfiles` omite `prodiac` (`lib/handlers/admin/rup.js:78-92`, ejecutado por A3).
- Fuente: `config:experiencia` por perfil (RUP de cada socia).

**D-58 · Lo que el pliego pide en consorcio** · nuevo · experimentado · E9/E15 · tanda 4 · publicado · clic
- CORTO: «El pliego limita la convocatoria a Mipyme (pág. 12)» · «Exige al menos 40 % al integrante que aporte la experiencia (pág. 31)» · «Máximo 3 integrantes» (expediente, con página). EJEMPLO.
- CONCISO: el lector de pliegos (`op=dictamen`, `lib/dictamen_reglas.js:45-60,88-92`) no tiene regla para «convocatoria limitada», «Mipyme», «integrante» ni «proponente plural» (grep A3 § (d): solo `NOTA_PLURAL`). Tres detectores nuevos con evidencia y página, como los existentes. El recomendador convierte el aviso Mipyme (D-40) en hecho y el 40 % sugerido en la cifra del pliego.
- BENEFICIA: «con quién» deja de ser una estimación en los procesos con pliego leído: es lo que el pliego dice, con página.
- AFECTA: solo con pliego (índice `dmgg-8hin` desde 2025 o carga manual); sin pliego `sin_dato`; una regex que no case deja «por leer», nunca «no lo exige».
- Fuente: texto del pliego.

**D-59 · Estampillas y descuentos vistos en pliegos de esta entidad** · nuevo · experimentado · E3 · tanda 4 · medido · clic
- CORTO: «Estampillas vistas en pliegos de esta entidad: 1,5 % (2 pliegos, el último el 3 de sep)» (modal de la entidad y plegado). EJEMPLO.
- CONCISO: `lib/deducciones.js` ya extrae concepto, porcentaje, evidencia y página de cada pliego leído (A5 § 7.3); cada lectura acumula `(entidad, concepto, pct, fecha, id_proceso)` en una clave propia y se enseña la última observación con su conteo. Observación con fecha, no tarifa («No hay tabla nacional que copiar», `lib/deducciones.js:12-16`).
- BENEFICIA: el costo oculto que más margen se come, con base y fecha; la tabla se construye sola con lo que el dueño ya lee.
- AFECTA: solo entidades con pliegos leídos; «lo que descontó en otros procesos», jamás «lo que le van a descontar»; enlazar deducciones a Precios sigue APARCADO (§ «Lo APARCADO por decisión del dueño (20-ago-2026)»): esto es una tabla de consulta, no un cambio del motor.
- Fuente: pliegos leídos (`lib/deducciones`).

### 2.5 Tanda 5 · fuentes externas vivas, tras la sonda M-DGF-17

**D-60 · Capacidad de verdad: los contratos en ejecución desde SECOP II** · cambia (la base de P2) · ambos · P3/P1/E1 · tanda 5 · calculado · externo
- CORTO: «Capacidad de facturar hoy: $4.471 M, descontando sus 2 contratos en ejecución ($1.900 M por ejecutar, calculado)» · «…, sin descontar contratos en ejecución: no hay ninguno registrado» (Mi empresa y el renglón de P2). EJEMPLO.
- CONCISO: `calcSCE` recibe una lista que nadie carga y asume 0 («capacidad posiblemente optimista», `lib/capacidad.js:70-74`; sale en todas las reproducciones). `lib/socio.js:26-32` ya consulta `jbjy-vk9h` por `documento_proveedor` para el socio: la misma consulta con el NIT de cada perfil (los tres tienen NIT) da los contratos «En ejecución» con valor y fechas, que es lo que la Guía CCE pide restar (A5 § 4.5); el saldo se aproxima como `valor × meses restantes / plazo` (la fórmula que `calcSCE` ya implementa) porque `valor_pagado` es sin dato para media Colombia (`lib/ejecucion.js:19-22`); el certificado cargado a mano gana. `resumenPerfiles` debe incluir `prodiac` antes.
- BENEFICIA: la cifra que decide el tamaño de contrato deja de ser una «creíble optimista»: exactamente la cifra equivocada que el dueño no puede permitirse.
- AFECTA: fuente externa (datos.gov.co, 403 desde aquí: NO VERIFICABLE) con caché; un contrato mal cerrado en SECOP resta capacidad que sí existe: se lista y se puede excluir a mano.
- Fuente: `jbjy-vk9h` por NIT.

**D-61 · Cara a cara: cuántas veces se presentó ante esta entidad y cuántas ganó (competidor)** · nuevo · experimentado · E5/E16 · tanda 5 · medido · externo
- CORTO: «Ante esta entidad: se presentó 9 veces y ganó 6 (desde 2025)» (modal del competidor, en un segundo paso). EJEMPLO.
- CONCISO: `lib/handlers/perfil/seguimiento.js:341-393` ya cruza `hgi6-6wh3` (proponentes) con p6dx por competidor y entidad y publica «veces» y «ganadas» por separado; el cociente en pantalla NO VERIFICADO (A4 Tabla A″). `hgi6` no tiene filas para procesos abiertos (`lib/proponentes.js:8-10`); el ganador identificado solo por nombre no cruza.
- BENEFICIA: «¿gana siempre que se presenta aquí?» es la lectura más rápida del pliego a la medida.
- AFECTA: consulta externa con tope de 6 s que no se cachea si falla: va detrás del clic, no en la carga instantánea, con «sin dato de proponentes hoy» cuando falla.
- Fuente: `hgi6-6wh3` + p6dx.

**D-62 · En todo SECOP II (segunda cifra, declarada)** · nuevo · experimentado · E5 · tanda 5 · medido · externo
- CORTO: «En todo SECOP II: 41 contratos por $380.000 M desde 2024 (todas las modalidades)» (segunda línea del perfil, solo con NIT). EJEMPLO.
- CONCISO: `lib/socio.js:333-360` ya agrupa en datos.gov.co las adjudicaciones de un NIT por año (`$group=anio`, `sum(valor_total_adjudicacion)`); un `$group=entidad` daría las entidades. Cubre todo SECOP II, no solo el corpus (A2 § 4.4). Best-effort, con tope; nunca se suman las dos cifras.
- BENEFICIA: el corpus es cota inferior; esta cifra dice cuánto más grande es el rival fuera de lo que la aplicación sigue.
- AFECTA: latencia externa (NO VERIFICABLE: 403); sin NIT no existe; «sin dato» si falla.
- Fuente: p6dx en vivo.

**D-63 · Archivos de oferta cargados a este proceso** · nuevo · experimentado · E13/E5 · tanda 5 · estimado · externo
- CORTO: «Archivos de oferta cargados: 4 (se leyeron 3 nombres de empresa)» (Mis procesos, tras el cierre). EJEMPLO.
- CONCISO: `dmgg-8hin` (índice de archivos desde 2025, `lib/documentos_proceso.js:16-21`) mezcla los archivos de la entidad con los que suben los proponentes; el módulo ya los separa (`RE_PROPONENTE`, `:183`) y hoy los descarta. Se agrupan por nombre; el índice va ~3 días por detrás; el nombre no siempre identifica al proponente: «se leyeron n nombres», nunca una lista cerrada de oferentes.
- BENEFICIA: contra quién compite de verdad, el día después del cierre y antes del informe de evaluación.
- AFECTA: fuente externa; identidad por nombre de archivo (estimado) y así se rotula; no se leen ofertas ajenas (decisión de producto pendiente).
- Fuente: `dmgg-8hin`.

**D-64 · La póliza de seriedad y cuándo pedirla** · nuevo · sin_experiencia · P4/P7/P10 · tanda 5 · estimado · peticion
- CORTO: «Necesitará una póliza de seriedad: suele ser el 10 % del presupuesto (≈ $637 M asegurados); pídala 5 días de oficina antes del cierre».
- CONCISO: `GARANTIA_SERIEDAD_PCT` (`lib/guia_proceso.js:95`: 10 % del presupuesto) y `dinero.garantia_seriedad_asegurada_cop` (reproducido 636.586.369); el paso «Pida la garantía» ya existe (D-43). PRECONDICIÓN: resolver el par de bases (guía: presupuesto; `lib/dictamen.js:338-339`: 10 % de la OFERTA, Decreto 1082 art. 2.2.1.2.3.1.9; A5 § 6.2, norma NO leída desde aquí). Hasta entonces «suele ser» y el pliego manda; por eso va en la tanda 5 y no en la 3.
- BENEFICIA: sin la póliza no hay oferta y no se corrige después (A5 W8); la primera vez la aseguradora tarda.
- AFECTA: cifra calculada sobre una regla con dos bases: estimado hasta resolverlo.
- Fuente: guía.

### 2.6 Tanda 6 · lo que A4 no confirmó (`sin_fuente`; el verificador decide)

**D-65 · Con cuánto ofertaron todos** · nuevo · experimentado · E2/E16 · tanda 6 · sin_fuente · externo
- CORTO: «De 12 ofertas, la que ganó fue la 4.ª más baja» (modal de la entidad, por proceso cerrado). EJEMPLO.
- CONCISO: `wi7w-2nvm` (Ofertas por proceso, `valor_de_la_oferta`; 41,9 M filas según co-acc); la llave (`id_del_proceso_de_compra` → ¿CO1.REQ o CO1.BDOS?) sin confirmar (A4 Tabla B); sin columna de causal de rechazo. Solo EXP la propone; SIN la descarta expresamente.
- BENEFICIA: la única forma de ver el rango de posturas, no solo la ganadora, y con cuánto suele ofertar cada competidor.
- AFECTA: sin llave confirmada no hay dato; exige la sonda M-DGF-17 desde una máquina con red.
- Fuente: `wi7w-2nvm` (diccionario; no confirmada).

**D-66 · Cuánto tarda en pagar esta entidad** · nuevo · ambos · E7/P6 · tanda 6 · sin_fuente · externo
- CORTO: «Aquí la mitad de las facturas de obra se pagaron en menos de 47 días (23 facturas)». EJEMPLO.
- CONCISO: `uymx-8p3j` (plan de pagos: `fecha_real_de_pago`, `fecha_de_emision`) por `codigo_entidad`/`nit_entidad`: la mora real que `lib/apu/rentabilidad.js` asume (`dso_meses`). A4: diccionario; cobertura de `fecha_real_de_pago` desconocida (el supervisor puede no registrar).
- BENEFICIA: «el Estado paga tarde», medido por entidad: lo que la memoria daba por imposible con jbjy (y sigue siéndolo con jbjy: el dato vive en otro dataset).
- AFECTA: sin medir cobertura no se enseña nada; solo con n suficiente y «sin dato» explícito.
- Fuente: `uymx-8p3j` (diccionario; no confirmada).

**D-67 · Visto N veces en SECOP II** · nuevo · experimentado · E5 · tanda 6 · sin_fuente · sync
- CORTO: «Visto 68 veces en SECOP II» (plegado). EJEMPLO.
- CONCISO: `visualizaciones_del` (diccionario; descartada hoy por la proyección; un cuaderno público la muestra poblada, A4 #33). Única señal ANTERIOR al cierre sobre interés. Solo EXP la propone; SIN la descarta.
- BENEFICIA: interés temprano antes de que exista dato de oferentes.
- AFECTA: mide miradas (incluidas las de la entidad), no oferentes; cobertura no medida: no se enseña hasta medirla con `lib/columnas_historicas` tras la full.
- Fuente: p6dx `visualizaciones_del` (diccionario; no confirmada).

### 2.7 Lo que se conserva sin cambio (solo verificar que sigue)

- **D-68 · «Ver cómo se calcula»** · se_conserva · ambos · E6 · tanda 2 · estimado · clic — botón → `op=probabilidad` (`public/app.js:3256`); recibe el supuesto de rivales cuando D-14 pinta «—» y la línea de D-30.
- **D-69 · Avisar que le interesa (chip y aviso)** · se_conserva · ambos · E17/P7 · tanda 2 · calculado · peticion — `manifestacionDeFila` (`lib/manifestacion.js:298-327`); la fecha del pliego gana; el techo legal no se pinta como plazo.
- **D-70 · Zona** · se_conserva · ambos · P12 · tanda 2 · estimado · peticion — `evaluarZona` (`lib/accesibilidad.js`); para Purificación desde Ibagué «Su zona (Ibagué)» (reproducido EXP § 7.f).
- **D-71 · Aviso de competencia baja (señal #11)** · se_conserva · ambos · P16/E5 · tanda 2 · medido · peticion — `avisoCompetencia` (`public/app.js:1465-1475`, umbral 2); misma cifra y redondeo que D-13.
- **D-72 · Aviso rojo de cierre (≤ 2 días)** · se_conserva · ambos · P7 · tanda 2 · calculado · peticion — `avisoCierre` (`public/app.js:1477-1485`).
- **D-73 · Margen entre su piso y el techo de la entidad** · se_conserva · experimentado · E2 · tanda 2 · calculado · peticion — `margenDe` (`listar.js:718-751`), solo con `?ordenar_por=margen` y token.
- **D-74 · Encaja con su registro** · se_conserva · sin_experiencia · P2 · tanda 2 · calculado · peticion — `evaluarRup` (`lib/rup.js:92-145`), `badgesRup`.
- **D-75 · Cómo se adjudica en el departamento** · se_conserva · ambos · E2 · tanda 2 · medido · peticion — `bajaDepartamentoDe` (`lib/indice_baja.js:988-1035`); se expone, no decide; D-52 se le añade.
- **D-76 · Activo · abierto (PAA)** · se_conserva · experimentado · E10 · tanda 2 · medido · peticion — bandera del PAA (`public/app.js:2176`).
- **D-77 · Estado del proceso y «Ver en SECOP II ↗»** · se_conserva · ambos · E1 · tanda 2 · publicado · sync — `estado_del_procedimiento`, `urlproceso` (`urlDeFila`, `lib/proyeccion.js:71-75`).
- **D-78 · Baja media con la que gana (perfil del competidor)** · se_conserva · experimentado · E2/E5 · tanda 1 · medido · clic — `baja_media` (`lib/competencia_detalle.js:649-653`), anulada sin NIT con motivo real; en el índice inverso se guardan `{n, suma, hist}` crudos y se aplica `encogerBaja` al servir, no una mediana ya calculada.
- **D-79 · El modal de la entidad, lo de hoy** · se_conserva · ambos · E5/E6/E7 · tanda 2 · medido · clic — `pintarDetalle` (`public/app.js:3078-3118`): banda → resumen → por año → prórroga → plazo de adjudicación → desiertos → encogimiento → quién gana aquí → proponentes → ejecución; D-07, D-32, D-51, D-52 y D-59 se añaden ahí.

## 3. El orden en pantalla

Regla de forma (de las tres lentes): **lo que se VE arriba cabe en una pantalla de teléfono sin abrir nada** y responde, en este orden, a las cuatro preguntas: ¿puedo? → ¿con quién? → ¿cuánto tiempo tengo? → ¿contra quién, cuánto bajo, me queda algo? Lo que se TOCA va plegado; lo que se COMPARA va en el modal.

**Arriba (se VE):**
1. Título · «Ref.» (D-33) · Entidad · municipio · departamento (D-25).
2. Cuantía (D-18) · modalidad (D-23) · plazo de obra (D-34) · «Precio global» solo si aplica (D-24).
3. «● Para poder presentarse: …» (D-09) o el chip «No le alcanza solo…» (D-10).
4. **«● Con quién: …»** (D-01), verde / ámbar / gris / rojo.
5. Cierre con hora (D-16) · «Le quedan N días de oficina · presente el …» (D-36) · Avisar que le interesa (D-69) · Siguiente paso (D-43).
6. Rótulo «Para ganar» (D-30) + tres celdas: compiten (D-13) · se gana uno de (D-14) · lo que deja (D-15) · «Ver cómo se calcula» (D-68).
7. Chips: zona (D-70) · «Poca competencia · 55 procesos · quién gana aquí ›» (D-20) · **«Quien más gana aquí: X · 6 de 15 ›»** (D-02) · prorrogado con días (D-21) · Activo · abierto (D-76).
8. Avisos solo cuando deciden: señal #11 (D-71) · cierre ≤ 2 días (D-72) · cambio de reglas con conteo (D-22) · fecha difícil (D-38).

**Plegado «Más detalles» (se TOCA):** las cuatro puertas en llano con cifra, lo que no descuentan y lo que quedaría/faltaría (D-12, con D-27 dentro) · anticipo en tres estados (D-11) · suelen bajar con banda y origen (D-17) · ritmo mensual (D-35) · cruza diciembre (D-45) · el 5 % (D-44) · precios unitarios explicado (D-24) · modalidad en llano (D-46) · días de oficina que dio el proceso (D-37) y lo que suele dar la entidad (D-50) · adjudica en N días de oficina y desiertos (D-39) · obras al año (D-42) · tope Mipyme (D-40) · su historial con la entidad (D-47) · encaje con su registro (D-74) · lotes (D-55) · republicado (D-54) · documento tipo (D-56) · estampillas vistas (D-59) · cómo se adjudica en el departamento (D-75) y «al oficial en X de N» (D-52) · póliza (D-64).

**Pie:** estado (D-77) · «Guardar · para ver qué le piden y el paso a paso» (D-31) · «Calcular mi precio» con plazo (D-28) · Ver en SECOP II ↗ (D-77). Margen solo con `ordenar_por=margen` (D-73).

**Modal de la entidad («Competencia histórica»):** lo de hoy (D-79) con antesala ligera (D-32) + filas y segmentos pulsables con texto (D-07) + ganadores locales (D-51) + lo que suele dar para ofertar (D-50) + al oficial en X de N (D-52) + estampillas vistas (D-59) + (tanda 6) posturas (D-65).

**Modal del competidor («Dónde gana este competidor»):** esqueleto con forma y frase (D-04) → cabecera honesta (D-05) → «En esta entidad: N de sus M» (D-06) → baja media (D-78) → por departamento (D-53) → tabla por entidad (D-03) → «En todo SECOP II» (D-62) → cara a cara en un segundo paso (D-61) → pie con frescura y «Actualizar ahora» (D-04).

**Modal de la probabilidad:** el desglose de hoy + el supuesto de rivales cuando la celda dice «—» (D-14) + «Lo que la aplicación no mide» (D-30).

**Mis procesos y expediente:** capacidad comprometida (D-41) · con quién ha ganado (D-48) · lo que cuesta presentarse (D-49) · lo que el pliego pide en consorcio (D-58) · experiencia por contratos de la socia (D-57) · archivos de oferta cargados (D-63) · el consejo de socio congelado con su fecha (hoy).

**Bytes.** Nuevo por fila con credencial: socio 96-184 B + líder 86 B + plazo de adjudicación y desiertos ≤ 183 B + tres cuentas de días de oficina ≈ 45 B + `plazo_meses` 15 B + siguiente paso 97 B + historial 0-40 B ≈ 520-650 B sobre una fila que hoy pesa 7.770-8.147 B (medido por A1 y DUE); ×100 filas (`por_pagina` máx.) ≈ 65 KB frente al corte de 4,5 MiB (`lib/cuerpo.js:39`). No hay una cerradura de bytes por fila (A6 § 1.9): hay una dirección, y se mide con `por_pagina=100` en cada tanda. Sin credencial: líder, cifras de puertas, baja y ganancia van a `null` (`lib/publico.js`), como hoy.

## 4. La maqueta final · PAVIMENTACIÓN DE VÍAS URBANAS EN PURIFICACIÓN - TOLIMA (tandas 1-3 aplicadas)

Cifras REALES (reproducidas por los tres informes con las funciones del árbol y la fila de la captura): cuantía, K, CRPC, «30 % o más», financiación, patrimonio, faltarían, quedarían, 30 y 22 días de oficina, $796 M/mes, 8 meses, cruza diciembre, $318 M, hora 15:00, veredicto de socio en sus dos ramas. Cifras de la CAPTURA: 1,4 en 55, «1 de 3», Tolima sin bajar en 131. EJEMPLO (dependen del hash de producción): la referencia, el líder, «7 días de oficina (8 procesos)», «desierto 1 de 9», «25 obras». Hoy = 13-sep-2026.

```
┌────────────────────────────────────────────────────────────────────────────────────┐
│ PAVIMENTACIÓN DE VÍAS URBANAS EN PURIFICACIÓN - TOLIMA · Ref. LP-008-2026           │
│ ALCALDÍA MUNICIPAL DE PURIFICACIÓN · Purificación · Tolima                          │
│ $ 6.365.863.685  ·  Licitación pública  ·  8 meses de obra                          │
│                                                                                    │
│ ● Para poder presentarse: cabe solo si el pliego trae anticipo del 30 % o más.     │
│   Confírmelo en el pliego.                                                  [ámbar] │
│ ● Con quién: Solo si el pliego trae anticipo del 30 % o más; sin anticipo,         │
│   con PRODIAC (80/20).                                                      [ámbar] │
│                                                                                    │
│ [Cierra en 31 días · mié 14 de oct · 3:00 p. m.]                                   │
│ Le quedan 22 días de oficina para armar la oferta · presente a más tardar el 13 de oct │
│ Siguiente paso · hoy: lea primero las causales de rechazo y el cronograma del      │
│ pliego · Guárdelo para el paso a paso completo ›                                    │
│                                                                                    │
│ Para ganar                                                                         │
│ ┌──────────────────────┬────────────────────────────┬────────────────────────────┐ │
│ │ 1,4                  │ 1 de 3                     │ Calcular                   │ │
│ │ empresas por proceso │ se gana, aproximadamente   │ cuánto deja: falta su      │ │
│ │ 55 procesos          │ con los 55 procesos de     │ costo · se calcula en      │ │
│ │                      │ esta entidad               │ Precios                    │ │
│ └──────────────────────┴────────────────────────────┴────────────────────────────┘ │
│                                                              Ver cómo se calcula   │
│ [Su zona (Ibagué)]  [● Poca competencia · 55 procesos · quién gana aquí ›]         │
│ [Quien más gana aquí: CONSTRUCTORA DEL TOLIMA SAS · 6 de 15 ›]          (ejemplo) │
│                                                                                    │
│ Atención: aquí se presentan 1,4 oferentes en promedio. Puede ser un nicho suyo    │
│ —que es por lo que la aplicación se lo muestra primero— o un pliego escrito a la  │
│ medida de otro. El dato no distingue las dos: revise requisitos y plazos antes    │
│ de invertir tiempo en la oferta.                                                  │
│                                                                                    │
│ ▸ Más detalles                                                                     │
│   ● Registro de proponente ✓ · La actividad de este proceso está inscrita en su    │
│     registro.                                                                      │
│   ● Capacidad de facturar ~ · Sin anticipo, esta obra ($6.366 M) supera lo que     │
│     puede facturar hoy ($4.471 M): cabe con un anticipo del 30 % o más. Con el     │
│     30 %, le quedarían unos $15 M después de esta obra. Calculada sin descontar    │
│     contratos en ejecución: no hay ninguno cargado. Capacidad calculada con un     │
│     ingreso estimado: cargue el ingreso de su RUP en Mi empresa.                   │
│   ● Caja ? · Sin anticipo tendría que financiar ≈ $1.273 M antes del primer cobro  │
│     y su patrimonio es $1.107 M: faltarían ≈ $166 M.                               │
│   ● Competencia · Poca: 1,4 empresas por proceso en 55 procesos.                   │
│   [Anticipo: no publicado · búsquelo en el pliego]  [Suelen bajar: sin datos de    │
│    esta entidad]  [Precios unitarios: si hay más cantidad, se paga]                │
│   [Unos $796 M por mes de obra durante 8 meses]  [La obra cruza diciembre: en      │
│    enero suben el salario mínimo y los materiales]                                 │
│   [Le descontarán el 5 % de obra pública: ≈ $318 M sobre el presupuesto]           │
│   [Licitación pública: el proceso grande; el método de puntuar el precio se        │
│    sortea]  [Encaja con su registro ✓ · Obra civil]                                │
│   [Da 30 días de oficina para ofertar (publicado el 1 de sep, cierra el 14 de oct)]│
│   [Adjudica en unos 7 días de oficina tras el cierre (8 procesos) · Declaró        │
│    desierto 1 de sus 9]  [Adjudicó 25 obras en 2025 (las que sigue la aplicación)] │
│                                                                          (ejemplo) │
│   Cómo se adjudica en TOLIMA: sin bajar el precio · 131 contratos. En TOLIMA se    │
│   gana sin bajar el precio: los que ganaron ofertaron prácticamente por el         │
│   presupuesto oficial (131 contratos ya adjudicados en todos los tipos de obra).   │
│                                                                                    │
│ Publicado   [Guardar · para ver qué le piden y el paso a paso]  [Calcular mi precio] │
│                                                              Ver en SECOP II ↗    │
└────────────────────────────────────────────────────────────────────────────────────┘
```

Lo que esta tarjeta dice en diez segundos y hoy no: que cabe solo con anticipo del 30 % (hoy: «con detalles por revisar»); que sin anticipo va con PRODIAC al 80/20 (hoy: «Solo. Le alcanza»); quién gana en Purificación y cuánto, a un clic (hoy: tres pulsaciones a ciegas); la hora del cierre, cuándo presentar y cuántos días de oficina quedan (hoy: nada); que la capacidad es un techo y cuánto le quedaría (hoy: «CRPC $6.365.863.685 / K $4.470.921.189» plegado); el plazo, el ritmo y el 5 % (hoy: detrás de Guardar). Ni «probabilidad», ni porcentaje de p, ni «K», ni «CRPC», ni «hábiles», ni emoji: los 79 textos CORTO salen de los tres informes, que los pasaron por `tuteoEn`, `VOSEO_RE`, `RE_EMOJI_UI` y la lista de jerga de la suite (EXP § 7.d: 58 textos, SIN `d_sin_textos.js`: 70, DUE `d_dueno_textos.js`: 91, todos con 0 fallos); las tres frases que aquí se recompusieron (D-09, D-10, D-12) usan solo palabras que ya pasaron en esos conjuntos y las del glosario, y se vuelven a pasar por la cerca en la tanda que las escriba.

**Si el pliego declara «sin anticipo»** (variante CO1.REQ.900002, ejecutada por DUE): el chip pasa a «No le alcanza solo: supera lo que puede facturar · le falta caja» (ámbar, tarjeta viva), la línea de socio a «Conviene con PRODIAC: aporta el respaldo que le falta · reparto sugerido 80/20» y el anticipo a «Sin anticipo (lo dice el pliego)».

**Al pulsar «Quien más gana aquí» (D-02 → D-04 → D-03 → D-05 → D-06):**

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ Dónde gana este competidor                                             [×]   │
│ CONSTRUCTORA DEL TOLIMA SAS                                                  │
│ ▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒  (.exp-esqueleto, brillo) │
│ ▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒                                                    │
│ Buscando dónde más gana esta empresa…                                        │
│ ▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒   ▒▒▒▒▒   ▒▒▒▒▒▒▒▒▒▒▒   ▒▒▒▒▒▒▒▒                       │
│ ▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒   ▒▒▒▒▒   ▒▒▒▒▒▒▒▒▒▒▒   ▒▒▒▒▒▒▒▒   (× 5 filas)         │
└──────────────────────────────────────────────────────────────────────────────┘
   ↓ 2-3 comandos con el índice (≈ 60-250 ms con el supuesto REST); el esqueleto desaparece de golpe
┌──────────────────────────────────────────────────────────────────────────────┐
│ Dónde gana este competidor                                             [×]   │
│ CONSTRUCTORA DEL TOLIMA SAS · NIT 900123456                                   │
│ Solo lo que la aplicación sigue: obra y afines, procesos competitivos, desde │
│ enero de 2024. Fuera de eso, no aparece aquí.                                │
│ 15 contratos en 6 entidades · $28.400 M en 14 de 15 contratos con valor      │
│ publicado · último: 12 de ago de 2026                                        │
│ En esta entidad: 6 de sus 15 contratos                                       │
│ Baja media con la que gana: 3 % (14 procesos)                                │
│ Gana sobre todo en Tolima: 4 de sus 6 entidades (11 de 15 contratos)  (t4)   │
│ Entidad                              Ganados   Valor adjudicado   Último     │
│ ALCALDÍA MUNICIPAL DE PURIFICACIÓN ◀    6      $9.800 M           12-ago-26  │
│ GOBERNACIÓN DEL TOLIMA                  4      $12.100 M          03-may-26  │
│ …                                                                            │
│ En todo SECOP II: 41 contratos por $380.000 M desde 2024 (todas las          │
│ modalidades)                                                          (t5)   │
│ ▸ Ver cuántas veces se ha presentado a esta entidad (consulta en vivo) (t5)  │
│ Con datos hasta el 31 de agosto de 2026 · Actualizar ahora                   │
└──────────────────────────────────────────────────────────────────────────────┘
```

Bajo «Reducir movimiento»: gris plano, sin brillo, mismo texto. Si la respuesta trae `origen: "barrido"`, la frase pasa a «Esta empresa no está en el índice: se recorre el histórico completo. Puede tardar unos segundos.» y el pie a «Al día de hoy (recorrido completo)».

## 5. El plan por sesiones

Cada tanda repite el método (A6 § 3; `docs/PROMPT_INICIAL.md § «3. El ciclo ECC»`): premisas verificadas contra el código, reproducción por hallazgo, pruebas escritas ANTES y que FALLEN contra el árbol anterior (mutación), lotes de ficheros DISJUNTOS entre agentes, `tests/e2e.js` fuera de la fase paralela (cerraduras como guiones autónomos, spliciadas en serie), ninguna aserción existente tocada sin decir cuál y por qué, no se commitea con agentes vivos, `node tests/e2e.js > salida.txt 2>&1; echo CODIGO=$?; tail -3 salida.txt` en 4/4, navegador real a 390 px con consola limpia si se tocó `public/`, sección nueva al final de `docs/MEMORIA.md` con «En una línea:», `> SUPERADA` donde toque, `node tests/mapa.js --escribir` en el mismo commit, y PR contra `main` con la URL completa (§ «Por qué la entrega cambió de «Trabaja en main» a «abre tú el pull request» (13-sep-2026)»).

| Tanda | Datos | Ficheros principales | Cerraduras que caen A PROPÓSITO · nuevas | Atajos mientras se trabaja · paso del dueño |
|---|---|---|---|---|
| **1 · Con quién, y quién gana aquí sin espera** | D-01…D-08, D-78 | `lib/socio_por_proceso.js` (línea, `segun_anticipo`, contrafáctica), `lib/perfiles.js` (`nombreCorto`), `lib/handlers/procesos/listar.js` (`resumenSocio`, retiro de `alcanzable_con_socio`, `lider` con token), `lib/indice_competencia.js` (líder; acumulador inverso; hash `indice:adjudicatario`), `lib/competencia_detalle.js` (función compartida; camino índice/barrido; `origen`), `lib/handlers/procesos/historico.js` (progreso propio), `lib/handlers/inteligencia/detalle.js`, `lib/publico.js`, `public/app.js` (línea de socio, botón del líder, esqueleto, `pintarAdjudicatario`, filas con texto), `public/index.html` (`.exp-esqueleto` reducido), `docs/MEMORIA.md` (dos decisiones: el líder sale solo con credencial; la tarjeta vuelve a decir con quién) | Caen: `tests/e2e.js:4706-4707` (claves del resumen), `:4732-4737` (textos de socio), `:13033` (rótulo del pliegue). Nuevas: `linea` ≤ 90 y mismo socio que `frase` (mutación: leer `alcanzable_con_socio`); `segun_anticipo` (mutación: sin contrafáctica vuelve a decir «solo»); `nombreCorto` en los tres perfiles y en `perfilDesdeConfig`; registro del índice inverso ≡ `detalleAdjudicatario` (155/155, 143/143, 147/147; mutación: publicar la mediana ya calculada); `lider` null sin token y 401 con token inválido; sin líder no hay botón; `aria-busy` en `#modal-cuerpo` y reduced-motion sobre la clase usada; `procesos_con_valor` pintado | `E2E_SOLO="unidad socio por proceso"`, `"unidad detalle de competencia"`, `"unidad índice de competencia"`, `"unidad adjudicatario"`; luego `iteraciones`; `E2E_REDIS_LENTO_MS` para el camino de barrido; navegador con «Reducir movimiento». **Dueño**: reconstruir el índice (`/api/sync/historico?reconstruir_indice=true`) y leer `duracionMs`/`comandosRedis`/`origen` en Chrome |
| **2 · La tarjeta dice la verdad con lo que ya viaja** | D-09…D-32 (+ verificación de D-68…D-77, D-79) | `public/app.js` (tarjeta y las funciones nombradas), `lib/puertas.js` (`anticipo_que_cabe_pct`; mensajes en llano), `lib/handlers/procesos/listar.js` (`plazo_meses`, `competencia_entidad` ampliada, grupo sin cuantía, `ligero=1` en `op=entidad`), `lib/competencia_detalle.js` (antesala ligera), `lib/publico.js`, `tests/e2e.js`, memoria | Caen: las que fijen los textos de P2/P3 y del chip de anticipo (`E2E_SOLO="unidad capacidad"`, `"unidad puerta caja sin anticipo"`), el chip «No viable» en `iteracion()`, las de la tercera celda. Nuevas: `anticipo_declarado` decide el chip (mutación: volver a `pct > 0`); celda 2 vacía con fuente supuesta (mutación: pintar «1 de 5»); un solo redondeo de oferentes; hora solo si no es medianoche; `plazo_meses` null sin duración (mutación: 12); cerca `JERGA_JS` EJECUTADA sobre los mensajes de `evaluarPuertas` (falla contra el árbol de hoy); sin cuantía no ordena como cero | `"unidad pantalla · public/app.js sin tooltip"`, `"unidad competencia de la fila"`, `"unidad tipo de precio"`; luego `iteraciones`; medir `por_pagina=100` contra 4,5 MiB; navegador a 390 px |
| **3 · Datos nuevos con lo que ya viaja** | D-33…D-49 | `lib/handlers/procesos/listar.js` (referencia, plazo, ritmo, tres cuentas de días de oficina, fecha difícil, tope Mipyme, historial, diccionario de modalidades), `lib/guia_proceso.js` (extraer `pasosDe` y la regla del día anterior; `modalidadEnLlano` compartida), `lib/habiles.js` (sin cambio; se llama), `lib/handlers/perfil/seguimiento.js` (capacidad comprometida, con quién ganó), `public/app.js`, memoria | Nuevas: «días de oficina» nunca «hábiles» en pantalla; umbral con fecha (mutación: comparar con ≥); un supuesto no se multiplica (sin duración no hay ritmo); `presentar_el` = la misma función que la guía (mutación: copiarla); capacidad comprometida = Σ crpc de «me presenté» (mutación: contar «me interesa»); el siguiente paso omite lo que ya dice el chip de manifestación | `"unidad guía · orden del paso a paso"`, `"unidad socio por proceso"`, `"unidad capacidad"`; luego `iteraciones` |
| **4 · Índices, extracción completa y cargas** | D-50…D-59 | `lib/indice_competencia.js` (días que suele dar; locales; departamento del competidor), `lib/indice_baja.js` (cubeta 0 por entidad), `lib/proyeccion.js` (`CAMPOS`: `fecha_de_ultima_publicaci`, `numero_de_lotes`, `codigo_entidad`, `ordenentidad`), `lib/columnas_historicas.js` (cobertura ANTES de pintar), `lib/experiencia.js` + `lib/almacen.js` (clave por perfil), `lib/handlers/admin/rup.js` (`resumenPerfiles` con `prodiac`), `lib/dictamen_reglas.js` (tres detectores), `lib/deducciones.js` (acumulador), `lib/dictamen.js` (documento tipo probable), `public/app.js`, `docs/datos.md` | Nuevas: una columna nueva no se pinta sin cobertura medida (mutación: pintar con 0 %); clave de experiencia por perfil (mutación: la de Génesis tapa a PRODIAC); detectores con evidencia y página; «republicado» nunca dice «adenda»; mediana única de `lib/estadistica` (mutación: una mediana local) | `"unidad índice de competencia · mediana única"`, `"unidad índice de baja"`, `"unidad experiencia/cobertura"`, `"unidad censo de ingesta"` (vía `iteraciones`). **Dueño**: una extracción completa; reconstruir los dos índices; cargar la experiencia de PRODIAC (no existe en el árbol) |
| **5 · Fuentes externas tras la sonda** | D-60…D-64 | `tests/sondear_fuentes.js` (M-DGF-17, nuevo; se corre desde una máquina con red), `lib/capacidad.js` + `lib/socio.js` (SCE desde jbjy por perfil), `lib/proponentes.js` (cara a cara en segundo paso), `lib/competencia_detalle.js` (`$group=entidad`), `lib/documentos_proceso.js`, `lib/guia_proceso.js` / `lib/dictamen.js` (base de la garantía, tras leer la norma), `public/app.js`, `public/expediente.js` | Nuevas: cada fuente con fecha y conteo; una fuente caída → «sin dato» con motivo, nunca 0; el certificado cargado a mano gana a jbjy; la cifra externa nunca se suma a la del corpus | `"unidad socrata"`, `"unidad tiempo de espera"`; `iteraciones`. **Dueño**: correr la sonda (aquí datos.gov.co responde 403) |
| **6 · Tras confirmar la llave** | D-65…D-67 | — | Sin llave confirmada no hay dato | — |

Fuera de las tandas, decisiones del dueño: (1) publicar el líder de la entidad con credencial (toca la lista blanca de `/api/oportunidades`; se escribe en la memoria como decisión); (2) si quiere ver en el expediente «Hoy, con los datos actuales, diría: …» junto al consejo congelado (A3 § (e)); (3) mover `EXPERIENCIA_PENDIENTE.md` a `docs/` con ficha (A6 § 2.3); (4) los cuatro puntos de gusto de la piel v4 (V4 § 9.6) y el choque declarado con V4-13, V4-19 y V4-20, que la tanda 1 y 2 deben diseñar sabiendo que llegan.

## 6. Las reglas duras, dato por dato

| Regla | Dónde más pesa | Cómo se cumple |
|---|---|---|
| Sin dato ≠ cero; un calculado se declara; un supuesto no se pinta como número | D-14 («—» sin histórico), D-15 («≈ … si bajan»), D-16 y D-18 (ausencias dichas), D-34 (sin duración: «no publicado», jamás el 12 de la K), D-35 (no se multiplica un supuesto), D-11 (tres estados), D-12 («sin descontar…», «faltarían ≈»), D-29, D-54 («puede ser adenda»), D-56 («probablemente»), D-64 («suele ser») | Cada CORTO derivado lleva «≈», «unos», «si…», «suele», «probablemente»; cada ausencia dice que lo es y dónde buscar; ningún `\|\| 0` nuevo: las lecturas del índice descartan la ausencia antes de convertir (`hechosDeRegistro`) |
| Un dato publicado gana a uno calculado | D-11 (el pliego gana a la regex), D-16 (cronograma del pliego gana a la fecha del dataset), D-58 (el pliego gana al aviso Mipyme y al 40 % sugerido), D-60 (el certificado gana a jbjy), D-56 (el aviso gana a la deducción), D-59 (el pliego del proceso gana a lo observado) | Donde el pliego se leyó, la tarjeta usa ese dato y lo dice |
| Una cifra redondeada para mostrar no decide | D-09 (el 30 % es techo de 29,77 %; decide `rup.js` con la exacta), D-12 (cifras abreviadas solo en el texto), D-13 (un decimal solo para mostrar; ordena `ve`), D-15 y D-17 (cubetas; decide el optimizador), D-39 (días enteros del histograma; nada decide con ellos) | Ningún dato nuevo entra en la cascada que ordena o filtra salvo el grupo «sin cuantía» de D-18, que agrupa sin eliminar |
| Dos cosas distintas, nombres distintos | § 1.2 entero; D-08 (se retira `alcanzable_con_socio`); D-36/D-37/D-50 (tres nombres); D-23/D-46 (nombre frente a explicación); D-47 («ya se presentó», guardados) frente a D-61 («se presentó», hgi6 del competidor) | Un solo campo por pregunta; los nombres nuevos no comparten prefijo con los viejos |
| Redactar un campo no basta si otro permite despejarlo; sin credencial no salen cifras del perfil; token inválido = 401 | D-02 (líder), D-12 (crp/crpc), D-17, D-15, D-41, D-47 | `lib/publico.sinFinanzas` (`:118`) sigue anulando; el líder y las cuentas nuevas se añaden a lo que se redacta sin token |
| El falso caro en oportunidades es el NEGATIVO | D-09/D-01 (ámbar, la puerta sigue pasando), D-10 (viva si una socia cierra), D-38, D-40, D-50, D-54, D-55 (ámbar o contexto; nada bloquea) | Ningún dato nuevo cambia `viable` ni la cascada |
| Nunca inventar norma, precio ni porcentaje | D-40 (umbral con fuente V-12; la regla de «al menos dos Mipyme» NO se pinta: norma no leída), D-44 (tarifa citada como consta en el árbol), D-64 (par de bases sin resolver → «suele ser»), D-30 (ningún peso de puntaje), D-01 (el 20 % del reparto de respaldo va sin fuente en el árbol, A3: se conserva como «sugerido», D-58 lo sustituye por la cifra del pliego) | Sin fuente va `null` con su motivo |
| Un endpoint nuevo es una `op`; el parseo aparte del fetch; el arranque al final del IIFE | D-03 (`op=competidor` existente), D-32 (`ligero=1` es un parámetro), D-02 (viaja en `op=listar`), D-04 (la rama nueva de `cargarAdjudicatario` conserva `leerJson` aparte) | `api/*.js` sigue en 6 (`tests/e2e.js:4285, 33412, 34533`) |
| No reescribir una regla que existe: llamarla | D-01 (`socioPorProceso`, `resumenSocio`, `congelarSocio` intacto), D-02/D-03 (`esAdjudicado`, `claveAdjudicatario`, `bajaDeFila`, `cargarAdjudicatario`), D-06 (`claveCanonica`), D-09 (`anticipoQueCabe`), D-28/D-34/D-35 (`plazoMesesDe`), D-36/D-37/D-38/D-50 (`habilesEntre`, `esFestivo`, `percentilHistograma`, mediana de `lib/estadistica`), D-39 (`hechosDeRegistro`, `htmlPlazoAdjudicacion`, `htmlDesiertos`), D-40 (`UMBRAL_MIPYME_2026`, `avisoMipyme`), D-43/D-36 (`pasosDe` y la regla del día anterior, extraídas y compartidas), D-44 (`CONTRIBUCION_PCT`, `aplicaContribucion`), D-46 (`modalidadEnLlano`), D-10 (`Glosario.corto`), D-60 (`calcSCE`), D-59 (`lib/deducciones`) | Cada ficha nombra la función; la cerradura de cada tanda incluye la mutación «sustituir la llamada por una copia» donde ya hay precedente (§ «Cinco medianas en `lib/`, y ya divergían») |
| Usted, sin jerga, sin emoji; ninguna pulsación sin respuesta visible; lo que un teléfono VE | todos los CORTO; D-04, D-02 (botón → esqueleto al instante; sin base no hay botón), D-07, D-24, D-31 (nada solo en `title`) | Los textos nuevos se pasan por `tuteoEn`, `VOSEO_RE`, `RE_EMOJI_UI` y `JERGA_JS` en la tanda que los escriba (los tres informes lo hicieron con 0 fallos); «días de oficina», «la mitad», «7 de cada 10» |
| Un arreglo que cubre solo el caso reproducido deja hermanos vivos | D-01 (`segun_anticipo` cubre P2 y P3, no solo el 30 % de Purificación), D-12 (cerca sobre TODOS los mensajes de `evaluarPuertas`), D-14 (las tres fuentes de `FUENTE_P`), D-37/D-38 (las tres fechas: publicación, cierre, festivo pegado) | Censo, no lista |

## 7. NO VERIFICABLE desde aquí (con motivo)

- El contenido real de `indice:competencia`, `indice:baja` e `indice:adjudicatario` (que no existe aún) en producción: sin credenciales de Upstash; el líder, los días de adjudicación, los desiertos, las obras al año, la referencia y lo que suele dar la entidad son EJEMPLO.
- La latencia real del perfil en Vercel/Upstash (30-80 ms por comando es SUPUESTO heredado de A2): el dueño la mide con `duracionMs`/`comandosRedis`.
- Que la hora de `fecha_de_recepcion_de` sea la hora local de Colombia en todas las filas (D-16): datos.gov.co responde 403 desde este entorno.
- Si el registro publicado del índice de baja conserva la cubeta 0 por entidad (D-52).
- La cobertura real de `numero_de_lotes`, `fecha_de_ultima_publicaci`, `visualizaciones_del`, `departamento_proveedor` en producción (D-51, D-54, D-55, D-67): se mide con `lib/columnas_historicas` tras la full.
- Toda fuente externa (jbjy, hgi6, dmgg, p6dx en vivo, uymx, wi7w): proxy 403/EGRESS_BLOCKED hoy; la sonda M-DGF-17 no existe (`tests/sondear_fuentes.js`).
- Las normas citadas (Ley 418/1997 y 1738/2014; Decreto 1082 art. 2.2.1.2.3.1.9; Resolución 539/2025; la limitación a Mipyme): dominios bloqueados; se citan como constan en el árbol.
- El comportamiento visual (390 px, esqueleto bajo reduced-motion, consola limpia) de cualquier cambio: no se abrió navegador.
- Qué aserciones exactas de `iteracion()` tumbarán D-10, D-13, D-14, D-15 y D-24: viven dentro de `iteracion()` (A6 § 5) y se localizan por `grep` en la tanda 2.
- Que los tres textos recompuestos aquí (D-09, D-10, D-12) pasen la cerca: se componen con palabras ya aprobadas por los tres informes, pero no se ejecutó `d_*_textos.js` sobre ellos (se hará en la tanda 2).

## Anexo · comandos ejecutados hoy (13-sep-2026) para esta síntesis

```
git -C /home/user/portafolio-estrategico status --short | wc -l                         → 0 (antes y después)
grep -n "anticipoQueCabe\|depende_del_anticipo\|sin_dato_de" lib/puertas.js               → :188 (const anticipoQueCabe = Math.ceil(100 * (1 - crpVal / (crpcVal || 1)))), :195, :205, :222
grep -n "k_depende_del_anticipo" lib/rup.js                                               → :135
grep -n "capacidad_contratacion\|dias_habiles\|modalidad" public/glosario.js               → :54 rup «Registro de proponente» · :56 «Capacidad de facturar» · :81 «Cómo lo adjudican» · :86 «Días de oficina…»
grep -n "nombreCorto" lib/perfiles.js | wc -l                                             → 0
grep -n "resumenSocio\|alcanzable_con_socio\|socioPorProceso" lib/handlers/procesos/listar.js → :109, :114, :920, :935
grep -n "alcanzaConSocio\|socioQueAlcanza" lib/handlers/procesos/listar.js lib/filtros.js lib/socio_por_proceso.js → listar :557, :663, :920 · filtros :693-696 · socio_por_proceso :282
grep -n "UMBRAL_MIPYME_2026\|NO_ES_MIPYME" lib/socio_por_proceso.js                       → :48 = 511708497, :53, :107-115
grep -n "function plazoMesesDe\|function habilesEntre\|function esFestivo\|function esHabil" lib/capacidad.js lib/habiles.js → capacidad :148 · habiles :77, :78, :93
grep -n "function hechosDeRegistro\|function hechosDeEntidad\|function competenciaDe\|MIN_PROCESOS =\|nunca adjudicatarios" lib/indice_competencia.js → :86, :479, :1168, :1209, :1213
grep -n "Dónde gana este competidor\|function cargarAdjudicatario\|function abrirModal\|function bloqueSocio\|function lineaRequisitos\|function chipCierre\|function bandaCompetencia\|function frecuenciaNatural" public/app.js → :1432, :1606, :1718, :1799, :2008, :2534, :3382-3383
grep -n "que más ganan\|Ver en qué otras entidades gana" public/app.js                    → :2930 (fila con title), :2967 (rótulo del pliegue)
grep -n "exp-esqueleto\|@keyframes brillo\|prefers-reduced-motion" public/index.html      → :794, :836, :1288, :1380
grep -n "indice:detalle:v7\|function detalleAdjudicatario\|procesos_con_valor" lib/competencia_detalle.js → :433, :547, :669, :677
grep -n "cruza_diciembre\|GARANTIA_SERIEDAD_PCT\|function modalidadEnLlano\|PRESENTE la oferta" lib/guia_proceso.js → :95, :121, :266, :286, :394-395, :452, :532
grep -n "CONTRIBUCION_PCT\|function aplicaContribucion" lib/ganancia.js                   → :111, :136
grep -n "function sinFinanzas" lib/publico.js                                            → :118
sed -n '4704,4710p;4730,4738p' tests/e2e.js                                               → las cuatro aserciones de socio que caen a propósito (claves del resumen; ×20; «Solo no le alcanza…Guárdelo»; «puede no bastar»)
```
Ficheros de esta síntesis: solo este documento. Las reproducciones citadas son las de los tres informes D y de A1-A6 (mismo directorio).
