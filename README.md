# Detekta · decidir a qué licitaciones de obra civil presentarse

Aplicación privada, **en producción**, para que un contratista de obra civil en Colombia decida **a
qué licitaciones presentarse y a qué precio**. Lee en vivo el dataset abierto de SECOP II
(`p6dx-8zbt`, Colombia Compra Eficiente), guarda dos años de adjudicaciones como histórico, cruza
cada proceso con el RUP y la capacidad financiera reales del perfil, y muestra las oportunidades
viables ordenadas por dónde es más probable ganar. Su usuario **no tiene terminal**: opera pegando
direcciones en Chrome y fija el precio de una oferta con la cifra que ve en pantalla, así que una
cifra equivocada, creíble y bien maquetada hace más daño que una que falta.

> **Este README es breve a propósito (6-sep-2026).** Dice qué es la aplicación, cómo se ejecuta,
> se prueba y se despliega, y dónde vive cada cosa. **No lleva estado** —conteos, tamaños, «está
> hecho»—: el estado se mide con `node tests/estado.js`, la ubicación de cualquier cosa se busca
> con `node tests/mapa.js <término>` y cada decisión con su motivo vive en `docs/MEMORIA.md`, que
> se lee por secciones y nunca entera. El README anterior (ago 2026, con la descripción de cada
> ruta, los índices y el módulo de precios explicados uno a uno) se conserva íntegro en
> `docs/archivo/README_2026-09.md`: lo que allí siga siendo cierto sigue siéndolo, pero la fuente de
> verdad es el árbol y la suite, no un documento.

## Qué hace, en una pantalla

Una sola página (`public/index.html` + `public/app.js`) con cuatro apartados que se recorren por
la URL:

| Apartado | Dirección | Qué se hace ahí |
| --- | --- | --- |
| **Mi empresa** | `#/mi-empresa` | El perfil: RUP (por archivo o por PDF), experiencia ejecutada, cobertura del RUP, consorcios, resumen del mercado y, plegado, el sistema (parámetros de costo, sincronización, diagnóstico). *Mi empresa → Sistema* y *Mi empresa → Verifique a su socio antes de firmar* son rutas de esa pestaña |
| **Licitaciones** | `#/licitaciones` | Las oportunidades viables del perfil, con sus filtros en la URL, el detalle de cada proceso y el índice de baja de mercado (a qué precio se adjudica) |
| **Mis procesos** | `#/mis-procesos` | Seguimiento de los procesos elegidos: cambios del pliego, cronograma, deducciones y el dictamen del pliego |
| **Precios** | `#/precios` | El editor de APU (análisis de precios unitarios) con el lector de pliegos, el catálogo de precios, la rentabilidad y el panel piso / techo |

Quien entra con su propio RUP y sin clave ve una **vista de visitante** con lo suyo; el dueño entra
con la clave del sitio. El lenguaje de la pantalla es de **usted**, sin jerga interna ni pictogramas;
la marca sale de un solo sitio (`MARCA.nombre` en `public/glosario.js`; inventario en
`docs/marca.md`).

Guías para el dueño, sin conocimientos técnicos: `docs/CONFIGURACION_TOKENS.md` (variables de
Vercel, una por una, con clics), `docs/EMPEZAR_AQUI.md` (convertir la aplicación en un negocio),
`docs/DICTAMEN_DESDE_CLAUDE_CODE.md` y `docs/PRECIOS_DESDE_CLAUDE_CODE.md` (el dictamen del pliego
y la búsqueda de precios atendidos desde una sesión de Claude Code, sin clave de API).

## Cómo se ejecuta, se prueba y se despliega

- **Sin build, sin `package.json`, cero dependencias.** Node 22 en Vercel (mínimo 18 por el
  `fetch` global; 18 está sin soporte desde abril de 2025). `public/` se sirve estático y cada
  `api/*.js` es una función serverless (CommonJS). Redis es Upstash por su API REST con `fetch`
  nativo (`lib/redis.js`); la compresión es `zlib` nativo.
- **La suite es el veredicto**: `node tests/e2e.js` debe terminar en **4/4** y su código de salida
  se mira sin tuberías (un `| tail` lo enmascara). Corre contra dobles HTTP locales de Socrata y
  de Upstash, sin red, ejercitando los handlers reales de `api/`. Si se tocó el lector de pliegos,
  además `node tests/apu_bench.js`. Si se tocó `public/`, navegador real obligatorio (hay fallos
  que ninguna prueba de Node ve). Desde el 6-sep-2026 GitHub repite el 4/4 en cada push y en cada
  pull request (`.github/workflows/suite.yml`, Node 22, sin secretos): registra y avisa, no
  sustituye correrla antes de commitear.
- **Despliegue**: repositorio → proyecto de Vercel (framework «Other»), variables de entorno y
  desplegar. Las variables **solo entran en despliegues nuevos**: añadir una sin volver a desplegar
  deja el 503 en pie. Cuáles son, qué hace cada una y cómo pegarlas está en
  `docs/CONFIGURACION_TOKENS.md`; la lista completa de nombres que el código lee la vigila la
  suite contra esa guía. Tras el primer despliegue hacen falta dos disparos —la sincronización
  completa y la extracción histórica—, descritos allí mismo (Parte G).
- **La llave de la aplicación** (`HISTORICO_TOKEN`) protege todo lo que escribe en Redis y las
  cifras del perfil, no la lectura pública. Va integrada en la página, así que su valor en Vercel
  tiene que ser **exactamente `MiExtraccion2025`**, el token integrado; con otro valor la
  aplicación queda a medias (401 en cada escritura). Rotarla son seis sitios en un orden concreto
  (`docs/CONFIGURACION_TOKENS.md`, § 10) y la suite comprueba que los archivos de `public/` que
  integran el token y los documentos que le dicen al dueño qué pegar lleven el mismo valor
  (`MiExtraccion2025` hoy). Token presente e inválido responde 401, jamás degradación silenciosa
  (`lib/auth.js`).
- **Una sola rama, `main`.** Español en interfaz, comentarios, documentación y commits. Cada
  decisión nueva se añade al final de `docs/MEMORIA.md` en el mismo commit del trabajo.

## Arquitectura en una página

```
Socrata (p6dx-8zbt) ──full/delta──▶ /api/procesos?op=sync ──chunks zlib──▶ Upstash Redis (REST)
                   ──2 años, 1 vez─▶ /api/procesos?op=historico ─▶ histórico + 3 derivados
                                                                    (competencia · equivalencias
                                                                     · vocabulario)
                                     /api/procesos?op=listar ◀── juicio fino por perfil ◀── Redis
                                            │ JSON paginado
                                            ▼
                                     public/ (una sola página)
```

**Ingesta ancha, juicio fino.** La sincronización guarda todo lo que *pueda* interesar (modalidad
competitiva, no convenio, sin lista negra, con un código de servicios u obra o con objeto de obra)
y **no** evalúa los RUP. Todo el juicio —encaje UNSPSC jerárquico por perfil, equivalencias
aprendidas del histórico, pertinencia del objeto, anti-suministro, capacidad de contratación—
corre al servir la consulta, así que afinar una regla o cargar un RUP nuevo tiene efecto inmediato
sin volver a bajar el año. El veredicto que ve el dueño es siempre graduado, nunca un sí/no, y el
orden por atractividad pone primero las entidades a las que históricamente se presenta menos gente.

**Routers por dominio.** Cada `api/<dominio>.js` despacha por `?op=` (o `accion` / `vista`) a los
handlers de `lib/handlers/<dominio>/`. **Un endpoint nuevo se pliega como `op` en el router que
exista, jamás como archivo nuevo en `api/`**: la suite fija cuántos archivos hay ahí. El cron de
Vercel llama a `/api/sync` a diario (`vercel.json`, 08:30 UTC).

**La superficie HTTP se mide, no se copia**: `node tests/estado.js` enumera los routers y sus
`op` leyendo el código. La lista de abajo es a mano, pero la suite la compara en los dos sentidos
con esa medición (toda `op` real está aquí; nada de aquí es inventado):

- `/api/procesos?op=` sync · historico · listar · baja · entidades · portada · manifestacion · salud
- `/api/perfil?op=` resumen · diagnostico · entrada · pulso · consorcio · consorcio-simular · seguimiento
- `/api/pliego?op=` extraer-texto · parsear · descargar · formulario1 · diff · cronograma · deducciones · dictamen · documentos
- `/api/admin?op=` rup · experiencia · cobertura · cargar-catalogo · exportar · importar
- `/api/apu?accion=` catalogo · inferir · calcular · cotizar · rentabilidad · guardar · cargar · listar · importar · extraer-texto · descargar · parametros · ia
- `/api/inteligencia?vista=` adjudicatario · competidor · entidad · paa · probabilidad · socio

Qué pide llave y qué es público lo dice cada handler llamando a `lib/auth.js`; `node tests/estado.js`
lista los puntos de llamada. El cuerpo JSON de cualquier POST lo lee `lib/cuerpo.js` (un solo tope,
una sola política de cuerpo vacío) y el parseo del JSON va aparte del `fetch`, porque el muro del
borde responde HTML. Un handler que lanza responde un JSON 500 con una sola redacción
(`lib/error_interno.js`), nunca una promesa rechazada muda.

**Las direcciones clásicas siguen respondiendo** por `rewrites` de `vercel.json`; el frontend y las
auto-llamadas del servidor ya usan las canónicas, y hay prueba de que nada interno depende de los
rewrites (son compatibilidad para direcciones guardadas):

| Dirección clásica | Va a |
| --- | --- |
| `/api/sync` · `/api/sync/historico` | `/api/procesos?op=sync` · `?op=historico` |
| `/api/oportunidades` · `/api/indice-baja` | `/api/procesos?op=listar` · `?op=baja` |
| `/api/resumen` · `/api/diagnostico` | `/api/perfil?op=resumen` · `?op=diagnostico` |
| `/api/competencia-detalle` · `/api/probabilidad-desglose` · `/api/paa` | `/api/inteligencia` (`?vista=probabilidad`, `?vista=paa`) |
| `/api/admin/rup` · `/api/admin/rup-desde-pdf` · `/api/admin/experiencia` · `/api/admin/cargar-experiencia-genesis` · `/api/admin/cobertura-rup` · `/api/admin/apu/cargar-catalogo` | `/api/admin?op=rup` (`&origen=pdf`) · `?op=experiencia` (`&origen=repositorio`) · `?op=cobertura` · `?op=cargar-catalogo` |
| `/api/apu/:accion` · `/api/apu/extraer-texto` · `/api/apu/descargar` | `/api/apu?accion=:accion`; el lector de pliegos vive en `/api/pliego?op=extraer-texto` · `?op=descargar` |

Las páginas viejas (`/admin.html`, `/apu.html`, `/pliego.html`) son `redirects` a la página única.

**Módulos.** No hay tabla de módulos aquí: `node tests/mapa.js <término>` da la ruta, el propósito,
los exports, quién lo llama, la `op` que llega hasta él y la sección de la memoria que hay que leer
antes de tocarlo; `docs/MAPA.md` es esa foto para leer en GitHub (se regenera con
`node tests/mapa.js --escribir`, no se edita a mano). Las claves de Redis y su esquema viven en
`lib/almacen.js` (`CLAVES`), con la compresión y el particionado en chunks.

**Datos.** El activo se purga y se rehace; el histórico (dos años de adjudicaciones) no se purga y
alimenta tres derivados: el índice de competencia por entidad (oferentes promedio, en tercios), las
equivalencias UNSPSC aprendidas de los adjudicatarios y el vocabulario distintivo por familia. La
metodología pública del costo está en `docs/metodologia.md`; las fuentes de datos verificadas y las
que no se pudieron verificar, en `docs/datos.md`; la investigación que sostiene el catálogo de
precios, en `docs/APU_Y_RENTABILIDAD.md`.

## Las reglas que mandan (la copia única está en CLAUDE.md)

`CLAUDE.md` es lo único que se auto-carga en una sesión de trabajo y lleva las reglas duras con el
motivo de cada una en `docs/MEMORIA.md`. Las que más cuestan cuando se olvidan:

- **«Sin dato» no es «cero».** Una cantidad ilegible es `null`, jamás 0; `Number(null) === 0`, así
  que la ausencia se descarta antes de convertir.
- **Una cifra redondeada para mostrar no puede decidir**, y **un dato publicado gana a uno
  calculado**: un techo legal no es un plazo, y un calculado que contradice a un publicado se
  calla o manda a verificar.
- **Nunca inventar una norma, un NIT, un precio o un porcentaje**: sin fuente va `null` con su
  motivo, y se cita la reforma vigente, no la ley original.
- **El falso caro cambia de lado por módulo**: en oportunidades cuesta el falso negativo (ante la
  duda, ámbar y se muestra); en precios cuesta el falso positivo (ante la duda, no se presupuesta).
- **Un valor de filtro desconocido es inerte**, **ninguna pulsación se queda sin respuesta visible**,
  y una respuesta que no hizo nada dice qué hacer.
- **Una regla escrita en la memoria no es una cerradura; la cerradura es la prueba**, que debe
  fallar contra el árbol anterior y ejecutar la función real. **Una invariante se defiende con un
  censo, no con una lista.**

Filosofía de producto, del dueño: «problemas difíciles, simplificados para personas normales, sin
curso académico». Si para entender un número hace falta leer un párrafo, el número está mal
elegido: se muestra el hecho que hay detrás, no el modelo que lo produjo.

## Cómo se lee la documentación

1. `CLAUDE.md`: reglas y protocolo. Es lo único que se lee entero.
2. `node tests/mapa.js <término>`: coordenadas de cualquier cosa, con el `sed` exacto de la sección
   de la memoria que toca. Sin argumentos imprime el mapa completo, incluida la lista de documentos
   de `docs/` con su título (esa lista es el índice: no se mantiene otro a mano).
3. `node tests/estado.js`: el estado medido (rama, routers y sus `op`, conteos, puntos de
   autenticación, guardas de la suite).
4. `docs/MEMORIA.md`: la crónica de decisiones, por secciones. Antes de tocar un módulo, leer las
   suyas es obligatorio. Se **cita por título de sección** (`MEMORIA.md § «…»`), nunca por número
   de línea: crece por el final y se edita, y una línea citada hoy apunta a otra cosa mañana; la
   suite censa las citas por línea a cualquier documento del árbol.
5. `docs/PROMPT_INICIAL.md` al empezar una sesión de trabajo (rol, ciclo, verificación,
   orquestación, formato de cierre).
6. Dominio, solo si el encargo toca reglas de negocio: `docs/GUIA_ANALISTA_LICITACIONES.md` junto
   con `docs/COMPLEMENTO_ANALISTA_LICITACIONES.md` (corrige dos errores del manual; van juntos) y
   `docs/APU_Y_RENTABILIDAD.md` para precios.

Los documentos de análisis fechados (auditorías, investigaciones, consultorías) abren con «Foto del
dd-mmm-20dd» y describen lo que había ese día; lo que dejó de ser cierto se corrige en sitio con
nota fechada. Lo archivado vive en `docs/archivo/` y no se edita.
