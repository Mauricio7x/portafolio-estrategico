# CLAUDE.md · Detekta

**Detekta**: app privada, EN PRODUCCIÓN, para decidir a qué licitaciones de obra civil presentarse
en Colombia. Su usuario es real, **no tiene terminal** (opera pegando URLs en Chrome) y fija el
precio de una oferta con la cifra que se ponga en pantalla: una cifra equivocada, creíble y bien
maquetada hace más daño que una que falta.

**Stack:** Vercel serverless (CommonJS) + Upstash Redis por REST + frontend estático en `public/`
(una sola página). **Sin build, sin package.json, cero dependencias** — `fetch`/`zlib`/`crypto`
nativos. Routers por dominio en `api/` que despachan por `?op=` a `lib/handlers/{dominio}/`;
**un endpoint nuevo se pliega como `op`, jamás como archivo nuevo** (la suite fija el conteo).
Una sola rama: **main**. Español en UI, comentarios, documentación y commits.

## Este archivo es lo ÚNICO que se auto-carga. Todo lo demás se BUSCA, no se lee.

**Leer es un costo, y buscar mal es peor**: el arranque «lee todo primero» quemaba ~250-400k tokens
antes de la primera línea de trabajo (medido, 27-ago-2026). Las tres herramientas, en este orden:

1. **`node tests/mapa.js <término>`** — EMPIEZA SIEMPRE AQUÍ. Da las coordenadas exactas de
   cualquier cosa: módulos que casan (con propósito, exports y **quién los llama**), las `op` que
   llegan hasta ellos, los documentos, y las secciones de la memoria **con el `sed` ya escrito**.
   Una llamada sustituye diez `grep` anchos y tres lecturas equivocadas. Sin argumentos imprime el
   mapa completo por dominios; `docs/MAPA.md` es esa foto para leer en GitHub.
2. **`node tests/estado.js`** — el estado MEDIDO (routers y sus op, conteos, auth, token, guardas).
   Jamás se afirma estado de memoria.
3. **`docs/MEMORIA.md`** — la crónica completa de decisiones. **Se lee por secciones,
   nunca entera**: el `sed` lo da el mapa. **Antes de tocar un módulo, leer su(s) sección(es) es
   OBLIGATORIO**: casi todo lo que se te ocurra «mejorar» está ahí explicado con el motivo por el
   que es así, y cada regla de esa crónica costó un defecto real. Las citas «CLAUDE.md § X»
   anteriores al 27-ago-2026 apuntan allí.

Después, y solo si el encargo lo toca: **`docs/PROMPT_INICIAL.md`** (rol, ciclo,
verificación, orquestación, formato de cierre) al empezar una sesión de trabajo · **`README.md`**
por grep dirigido, no entero · **dominio** (`docs/GUIA_ANALISTA_LICITACIONES.md` +
`docs/COMPLEMENTO_ANALISTA_LICITACIONES.md`, que corrige dos errores del manual: van juntos;
precios en `docs/APU_Y_RENTABILIDAD.md`) solo si toca reglas de negocio, y solo las secciones
pertinentes.

**La suite corre ANTES de commitear, no al arrancar**: `node tests/e2e.js` debe terminar **4/4** —
el código de salida se mira SIN tuberías (un `| tail` lo enmascara y ya costó un main en rojo).
`node tests/apu_bench.js` si se tocó el lector de pliegos. Si se tocó `public/`: navegador real
obligatorio (hay fallos que ninguna prueba de Node ve, con consola limpia — el precedente del CDN
de Tailwind bloqueado).

## Reglas duras (una sola copia; cada una es una cicatriz real — el porqué vive en MEMORIA.md)

- **«Sin dato» ≠ «cero».** Un `|| 0` sobre un conteo convierte «no sé» en «cero» creíble. Una
  cantidad ilegible es `null`, jamás 0. Las excepciones se declaran (en el índice de baja el 0
  SÍ es un dato). Y `Number(null) === 0`: la ausencia se descarta ANTES de convertir — ojo con
  las comparaciones, que la dejan pasar mudas (`null >= 1` es false, no «sin dato»).
- **Una cifra redondeada para MOSTRAR no puede DECIDIR.**
- **Dos cosas distintas no pueden tener nombres parecidos** (`total_procesos`/`procesos_contados`).
- **Redactar un campo no basta si otro permite despejarlo** — y sin credencial no salen las
  CIFRAS DEL PERFIL; token presente e inválido = 401, jamás degradación silenciosa.
- **El falso caro cambia de lado por módulo**: en oportunidades cuesta el falso NEGATIVO (ante la
  duda, ámbar y se muestra; nunca bloquear por falta de información); en APU/precios cuesta el
  falso POSITIVO (ante la duda, no se presupuesta). No unificar.
- **Nunca inventar una norma, resolución, NIT, precio o porcentaje**: sin fuente va `null` con su
  motivo. Citar la reforma vigente, no la ley original modificada.
- **Un dato PUBLICADO gana a uno CALCULADO**; un techo legal no es un plazo (ni un suelo
  inventado); un calculado que contradice a un publicado se calla o manda a verificar.
- **Un valor de filtro desconocido es INERTE** — nunca 400 ni lista vacía.
- **El arranque automático va AL FINAL del IIFE** (el fallo en la zona muerta es MUDO).
- **Los require que cerrarían un ciclo van DIFERIDOS dentro de la función.**
- **El parseo del JSON va APARTE del fetch** (el muro del edge responde HTML).
- **Ninguna pulsación sin respuesta visible**; una respuesta que no hizo nada dice qué hacer.
- **Una regla escrita en la memoria NO es una cerradura; la cerradura es la prueba** — que debe
  FALLAR contra el árbol anterior (mutación) y EJECUTAR la función real, no buscarla por regex.
- **Una invariante se defiende con un CENSO, no con una lista.** Una lista de sitios donde mirar
  deja huecos y la jerga —o el `.hidden`, o el tuteo— vuelve por ellos: se barre TODO el conjunto
  y las excepciones se DECLARAN con su motivo. Vale igual para una cerca de lenguaje que para una
  de estructura.
- **Un arreglo que solo cubre el caso que se reprodujo deja hermanos vivos**: si la guarda valía
  para una fecha, revisar las otras dos; si valía para un campo, revisar sus gemelos.
- **No reescribir una regla que ya existe: llamarla.** Dos cálculos «equivalentes hoy» divergen a
  la primera corrección. Antes de construir «lo que falta», buscarlo con `node tests/mapa.js`, en
  el árbol y en la historia de git. Antes de dar una fuente externa por perdida, volver a llamarla
  (un 403 documentado es una observación CON FECHA, no una propiedad del entorno).
- **Comprobar la FORMA que devuelve una función antes de declarar un defecto** por lectura; sin
  reproducción ejecutada no hay defecto.

## Filosofía de producto (manda sobre lo demás)

Del dueño: «problemas difíciles, simplificados para personas normales, sin curso académico».
> **Si para entender un número hace falta leer un párrafo, el número está mal elegido. Se muestra
> el HECHO que hay detrás, no el modelo que lo produjo.**

Derivadas fijas: la tarjeta no dice «probabilidad» (hecho medido + frecuencia natural); registro
formal de **usted**, nada de voseo/tuteo **en ninguna pantalla** (la cerca es un censo de todos los
`public/*.js`, con excepciones declaradas); **ni jerga**: «cuatro puertas», «capacidad residual» y
compañía son vocabulario interno, no de interfaz; **ni un emoji** (semáforo = clase de color +
`●`; SVG en línea con `currentColor`; `public/apu_libro.js` exento — sus marcadores van al Excel);
la marca es **Detekta** y sale solo de `MARCA.nombre` (`public/glosario.js`); lo que hay que VER va
arriba y lo que hay que TOCAR va plegado.

## La memoria se escribe, no se relee

Toda decisión nueva con su motivo se AÑADE AL FINAL de `docs/MEMORIA.md` (con fecha) en el mismo
commit del trabajo — nunca como changelog, siempre como «qué se decidió y por qué no hay que
re-aprenderlo». **Este archivo (CLAUDE.md) solo cambia si cambia una regla dura o el protocolo**,
y no puede contener ESTADO (conteos, «está hecho», «está pendiente»): el estado se mide con
`tests/estado.js`, la ubicación se busca con `tests/mapa.js`, y lo que pasó se escribe en
MEMORIA.md como evento fechado. Un hecho histórico con fecha es duradero; un conteo escrito aquí
es una mentira en incubación.
