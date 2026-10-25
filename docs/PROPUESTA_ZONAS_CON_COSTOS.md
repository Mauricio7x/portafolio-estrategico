# Propuesta: que la lista de licitaciones priorice las zonas donde Detekta tiene costos con respaldo

> Para: dueño · Estado: pendiente del dueño · Sustituido por: —

Propuesta para decidir, sin código que ordene todavía (25-oct-2026). Sale del encargo del dueño de esa fecha: no hay un margen fijo; el piso de cada oferta sale del análisis de precios unitarios con los costos del sitio de la obra, y donde Detekta no tenga costos reales de esa zona tiene que decirlo como «costo del sitio sin respaldo» y no suponerlo. Antes de proponer cómo ordenar, se midió qué respaldo hay hoy en cada departamento ejecutando los módulos del árbol (no leyéndolos).

## 1. Qué hay hoy, medido el 25-oct-2026

Tres hechos que fijan el punto de partida:

- **Ningún insumo del catálogo tiene precio cotizado por región.** El catálogo semilla trae 437 insumos y 5 regiones de precios (Bogotá y Sabana, Medellín y Antioquia, Costa Atlántica, Eje Cafetero, Santanderes), y los 437 tienen vacío su `precios_cotizados`: todo precio fuera de Bogotá se DERIVA multiplicando el de Bogotá (contrato adjudicado del Nogal 4, 2025) por un factor de región estimado. Es una derivación declarada, no una cotización del sitio.
- **Las 5 regiones cubren 14 departamentos; los otros 19 salen «sin referencia regional».** `regionDeDepartamento` nunca devuelve la región base por defecto: para esos 19 el presupuesto se calcula con los precios de Bogotá sin ajuste y la respuesta lo dice (`ajuste_regional.estado = "sin_base"`). Lo que la pantalla enseña hoy es «SIN ajuste regional» junto a las referencias del IDU, el ICCU y la EPC cuando la obra no está en su zona; la frase «costo del sitio sin respaldo» no existe todavía en ninguna pantalla.
- **Las fuentes oficiales por departamento son dos y cubren cosas distintas.** Para obra vial, el banco del INVIAS trae 526 ítems con precio por provincia: 31 departamentos tienen precio propio (la provincia mediana del departamento) y 2 no (Caquetá y San Andrés y Providencia, que caen a la mediana nacional, declarada); en 9 departamentos el precio «propio» sale de una sola provincia (La Guajira, Casanare, Arauca, Putumayo, Guaviare, Vichada, Amazonas, Vaupes, Guainia). Para edificación, el FFIE publica precios TOPE por departamento en los 33 (1.042 ítems): es un techo que la entidad acepta, no un costo del sitio. El ICCU y la EPC solo valen en Cundinamarca; el IDU, en Bogotá.

Resumen por clase de obra (33 departamentos): en vial, 31 con precio oficial del sitio y 2 sin respaldo; en edificación con el catálogo, 2 con precio cotizado u oficial del sitio (Bogotá y Cundinamarca), 12 derivados por factor de región y 19 sin respaldo. En 13 departamentos remotos (La Guajira, Valle Del Cauca, Cauca, Arauca, Caqueta, Putumayo, Guaviare, Vichada, Choco, Amazonas, Vaupes, Guainia, San Andres Y Providencia) el tope del FFIE sube 15 % o más sobre Bogotá mientras el INVIAS de ese departamento no sube sobre Cundinamarca: las dos fuentes oficiales discrepan y un piso apoyado solo en una de ellas puede quedar corto.

| Departamento | Región de precios cotizada | Obra vial | Edificación con el catálogo | Tope de edificación |
|---|---|---|---|---|
| Bogota D.C. | sí (bogota_sabana) | IDU (Bogotá) | catálogo adjudicado en Bogotá; IDU | FFIE tope, propio |
| Cundinamarca | sí (bogota_sabana) | INVIAS, 15 provincias con precio | ICCU y EPC de Cundinamarca | FFIE tope, propio |
| Antioquia | sí (medellin_antioquia) | INVIAS, 9 provincias con precio | derivado por factor de la región «medellin_antioquia» | FFIE tope, propio |
| Atlantico | sí (costa_atlantica) | INVIAS, 4 provincias con precio | derivado por factor de la región «costa_atlantica» | FFIE tope, propio |
| Bolivar | sí (costa_atlantica) | INVIAS, 6 provincias con precio | derivado por factor de la región «costa_atlantica» | FFIE tope, propio |
| Magdalena | sí (costa_atlantica) | INVIAS, 5 provincias con precio | derivado por factor de la región «costa_atlantica» | FFIE tope, propio |
| Cesar | sí (costa_atlantica) | INVIAS, 4 provincias con precio | derivado por factor de la región «costa_atlantica» | FFIE tope, propio |
| Sucre | sí (costa_atlantica) | INVIAS, 4 provincias con precio | derivado por factor de la región «costa_atlantica» | FFIE tope, propio |
| Cordoba | sí (costa_atlantica) | INVIAS, 7 provincias con precio | derivado por factor de la región «costa_atlantica» | FFIE tope, propio |
| Caldas | sí (eje_cafetero) | INVIAS, 6 provincias con precio | derivado por factor de la región «eje_cafetero» | FFIE tope, propio |
| Risaralda | sí (eje_cafetero) | INVIAS, 3 provincias con precio | derivado por factor de la región «eje_cafetero» | FFIE tope, propio |
| Quindio | sí (eje_cafetero) | INVIAS, 5 provincias con precio | derivado por factor de la región «eje_cafetero» | FFIE tope, propio |
| Santander | sí (santanderes) | INVIAS, 6 provincias con precio | derivado por factor de la región «santanderes» | FFIE tope, propio |
| Norte de Santander | sí (santanderes) | INVIAS, 5 provincias con precio | derivado por factor de la región «santanderes» | FFIE tope, propio |
| La Guajira | no | INVIAS, 1 provincia con precio | sin respaldo (catálogo de Bogotá sin ajuste, declarado) | FFIE tope, propio |
| Valle Del Cauca | no | INVIAS, 5 provincias con precio | sin respaldo (catálogo de Bogotá sin ajuste, declarado) | FFIE tope, propio |
| Tolima | no | INVIAS, 6 provincias con precio | sin respaldo (catálogo de Bogotá sin ajuste, declarado) | FFIE tope, propio |
| Huila | no | INVIAS, 4 provincias con precio | sin respaldo (catálogo de Bogotá sin ajuste, declarado) | FFIE tope, propio |
| Cauca | no | INVIAS, 5 provincias con precio | sin respaldo (catálogo de Bogotá sin ajuste, declarado) | FFIE tope, propio |
| Narino | no | INVIAS, 5 provincias con precio | sin respaldo (catálogo de Bogotá sin ajuste, declarado) | FFIE tope, propio |
| Boyaca | no | INVIAS, 13 provincias con precio | sin respaldo (catálogo de Bogotá sin ajuste, declarado) | FFIE tope, propio |
| Meta | no | INVIAS, 4 provincias con precio | sin respaldo (catálogo de Bogotá sin ajuste, declarado) | FFIE tope, propio |
| Casanare | no | INVIAS, 1 provincia con precio | sin respaldo (catálogo de Bogotá sin ajuste, declarado) | FFIE tope, propio |
| Arauca | no | INVIAS, 1 provincia con precio | sin respaldo (catálogo de Bogotá sin ajuste, declarado) | FFIE tope, propio |
| Caqueta | no | sin respaldo (INVIAS solo nacional) | sin respaldo (catálogo de Bogotá sin ajuste, declarado) | FFIE tope, propio |
| Putumayo | no | INVIAS, 1 provincia con precio | sin respaldo (catálogo de Bogotá sin ajuste, declarado) | FFIE tope, propio |
| Guaviare | no | INVIAS, 1 provincia con precio | sin respaldo (catálogo de Bogotá sin ajuste, declarado) | FFIE tope, propio |
| Vichada | no | INVIAS, 1 provincia con precio | sin respaldo (catálogo de Bogotá sin ajuste, declarado) | FFIE tope, propio |
| Choco | no | INVIAS, 5 provincias con precio | sin respaldo (catálogo de Bogotá sin ajuste, declarado) | FFIE tope, propio |
| Amazonas | no | INVIAS, 1 provincia con precio | sin respaldo (catálogo de Bogotá sin ajuste, declarado) | FFIE tope, propio |
| Vaupes | no | INVIAS, 1 provincia con precio | sin respaldo (catálogo de Bogotá sin ajuste, declarado) | FFIE tope, propio |
| Guainia | no | INVIAS, 1 provincia con precio | sin respaldo (catálogo de Bogotá sin ajuste, declarado) | FFIE tope, propio |
| San Andres y Providencia | no | sin respaldo (INVIAS solo nacional) | sin respaldo (catálogo de Bogotá sin ajuste, declarado) | FFIE tope, propio |

Cómo leer la tabla: «con respaldo» es un precio cotizado u oficial del propio departamento; «derivado por factor» es el precio de Bogotá multiplicado por un factor regional estimado; «sin respaldo» es el precio de Bogotá sin ajuste, declarado así en la respuesta. El respaldo depende del tipo de obra: una vía en Nariño tiene precios del INVIAS de 5 provincias; un colegio en Nariño solo tiene el catálogo de Bogotá sin ajuste y el tope del FFIE.

## 2. Cómo ordena hoy la lista

El orden por defecto («atractividad») va en tres pisos: primero lo viable (las puertas), dentro de lo viable la cubeta de ZONA (puntos 0 a 3 de accesibilidad: cerca de la base, media o sin dato, lejos, menos uno por difícil acceso u orden público por verificar) y dentro de cada cubeta el valor esperado. La zona solo ordena y etiqueta; esconde únicamente si el usuario pide «Solo cerca de mi zona» (`?zona=facil`, opt-in), porque en oportunidades el error caro es el falso NEGATIVO: una obra lejana puede valer la pena y la tarjeta lo dice con su chip. Un valor desconocido del filtro es inerte. (Decisiones de «Accesibilidad de la zona · el costo de LLEGAR ordena (ago 2026)» en la memoria.)

El costo del sitio no entra hoy en ningún piso del orden: una obra en Vaupés y una en Cundinamarca se ordenan igual aunque en la primera el piso de precio salga de un catálogo de Bogotá sin ajuste.

## 3. Tres opciones

### 3.1. Opción A · Decir «costo del sitio sin respaldo» donde no lo hay, sin tocar el orden

- **Qué cambia:** `lib/apu/calculo.js` ya publica `ajuste_regional.estado`; se añade una clasificación única `respaldoDelSitio(departamento, tipo_obra)` que combina la región cotizada, el INVIAS por departamento, el ICCU, la EPC y el IDU y devuelve «con respaldo», «derivado por factor» o «sin respaldo», con la fuente. La usan el editor de Precios (una línea bajo el piso: «Piso calculado con costos del sitio sin respaldo: precios de Bogotá sin ajuste, 2 fuentes oficiales no cubren Vaupés para edificación») y la tarjeta de la lista (un chip de texto, sin color de veredicto).
- **Qué gana el dueño:** cumple la regla del encargo de inmediato (no suponer un costo del sitio); ve en la tarjeta antes de abrir el proceso si el piso que va a calcular tiene con qué sostenerse.
- **Qué cuesta:** un módulo pequeño con su censo (33 departamentos × 2 tipos de obra), el chip, la línea del editor, 3 bloques de prueba y navegador real. Una sesión. Riesgo bajo: no cambia ninguna cifra ni ningún orden.
- **Pruebas por mutación:** quitar un departamento del INVIAS tiene que cambiar la clase; invertir «derivado» y «sin respaldo» tiene que fallar; el chip tiene que salir en la tarjeta de un proceso de Vaupés y no en uno de Cundinamarca.

### 3.2. Opción B · Una cubeta de «costos del sitio» junto a la de zona, opt-in

- **Qué cambia:** en `lib/handlers/procesos/listar.js`, dentro de lo viable y después de la zona, una segunda cubeta con la clase de la opción A (3 con respaldo · 2 derivado · 1 sin respaldo), solo cuando el usuario pide `?ordenar_por=atractividad&costos=1` o marca una casilla «Primero donde tengo costos del sitio». Por defecto nada cambia.
- **Qué gana el dueño:** con dos horas al día, mira primero los procesos donde el piso tiene respaldo y deja para después los que exigirían cotizar en sitio.
- **Qué cuesta:** depende de la opción A; una cubeta más en un orden que ya tiene tres pisos, con la prueba de que un valor desconocido es inerte y de que el orden por defecto no se mueve (la cerradura del orden existe y hay que ampliarla). Una sesión más. Riesgo: medio-bajo; no esconde nada, solo reordena a pedido.
- **Pruebas por mutación:** sin el parámetro, el orden tiene que ser idéntico al de hoy fila a fila; con él, dos procesos iguales en zona y valor esperado tienen que ordenarse por la clase; `costos=xyz` tiene que ser inerte.

### 3.3. Opción C · Cotizar el sitio con lo que el dueño ya tiene

- **Qué cambia:** los `precios_cotizados` por región del catálogo existen y están vacíos. Cargar las cotizaciones reales del dueño (los 389 insumos del Nogal 4 ya son de Bogotá; faltan las de Ibagué y las de cada obra que cotice) convierte «derivado por factor» en «con respaldo» para su zona de verdad, y la clase de la opción A lo refleja sola.
- **Qué gana el dueño:** el piso de sus ofertas en Tolima y Cundinamarca deja de ser una derivación y pasa a ser su costo. Es lo único de las tres que mueve la cifra que decide, y por eso va con plan, prueba por mutación y revisión aparte.
- **Qué cuesta:** las cotizaciones las consigue el dueño (no se inventan); el cargue ya tiene camino (`precios_cotizados` manda sobre la derivación, documentado en el catálogo). Tiempo del dueño, no de la aplicación.

## 4. Recomendación y lo que decide el dueño

Se recomienda la opción A primero (dice la verdad sin mover ninguna cifra; es lo que el encargo pide de frente), la opción B después como complemento opt-in, y la opción C a medida que el dueño tenga cotizaciones. Ninguna de las tres cambia el precio que propone Precios: eso sigue dependiendo del centro de mercado, que la retro-prueba de menor cuantía (docs/RETROPRUEBA_MENOR_CUANTIA.md) muestra que hoy no sirve para esa modalidad y es otra decisión.

Decisiones que son del dueño:
1. ¿Se aprueba la opción A tal como está descrita (clase única, chip de texto, línea bajo el piso)?
2. ¿La cubeta de la opción B va opt-in (recomendado) o por defecto? Por defecto escondería hacia abajo obras ganables en zonas sin costos: el falso negativo caro.
3. ¿Qué cotizaciones propias existen hoy (Ibagué, Tolima, obras anteriores) para la opción C, y en qué formato?
4. Para obra vial en los 9 departamentos con una sola provincia del INVIAS, ¿se trata como «con respaldo» (es un precio oficial) o como «derivado» (una sola provincia no representa el departamento)? Esta propuesta lo deja como «con respaldo» y lo marca.

## 5. Límites de la medición

- La clase se midió por departamento; el municipio y la vereda cambian el costo real (transporte, fletes) y ninguna fuente del árbol baja de departamento salvo las provincias del INVIAS.
- El FFIE es un tope aceptado por la entidad, no un costo: se cuenta como referencia propia del departamento, no como respaldo del piso.
- La discrepancia FFIE/INVIAS en los 13 departamentos remotos se midió con medianas de dos bancos distintos; no se sabe cuál de los dos refleja el costo real de una obra concreta.
- No se midió cuántos procesos abiertos caen hoy en cada clase (eso exige el corpus de producción, que esta medición no tocó).
