# Marca · Detekta (Fase 7 del plan maestro v4 · ago 2026)

El producto se llama **Detekta**, con k. Antes se escribía con c. Este documento es el
inventario de qué cambió con el nombre, qué NO cambió a propósito, y qué hay que hacer el
día que se compre un dominio propio.

## 1. Una sola fuente de verdad

El nombre vive en **`public/glosario.js`** (`MARCA.nombre`, `MARCA.nombreLargo`, `MARCA.lema`,
`MARCA.dominio`). `lib/glosario.js` lo re-exporta para el servidor: es el MISMO archivo, no una
copia (el patrón de `lib/costos.js`). Ninguna cadena visible escribe el nombre a mano:

| Dónde se ve | Cómo lo obtiene |
|---|---|
| Encabezado de la landing, del gate y de la barra superior | nodos `[data-marca="nombre"]`, que nacen VACÍOS en `index.html`; `glosario.js` los rellena al cargar (`Glosario.estampar`) |
| Pestaña del navegador (`<title>`) y `<meta>` (description, og:title, og:site_name, application-name) | literales en `index.html`. Son la **única excepción**: el navegador y los rastreadores las leen antes de que corra ningún script. La suite exige que sean EXACTAMENTE `Glosario.titulo()` y `Glosario.descripcion()`, para que no puedan separarse |
| Excel exportado (`docProps/core.xml` creator y `docProps/app.xml` Application) | `public/xlsx.js` recibe `MARCA` del glosario (en Node por `require`, en el navegador por `window.Glosario`) |
| Justificación de precio (documento imprimible: «Catálogo de …», «Documento generado con …») | `public/justificacion.js`, igual que el Excel |
| `User-Agent` del descargador de pliegos | `lib/apu_descargar.js` importa `MARCA` de `lib/glosario.js` |
| Comentarios de cabecera de `app.js`, `onboarding.js`, `pliego.js`, plantilla `formato_experiencia.csv`, `README.md`, `CLAUDE.md`, `docs/*` | texto, renombrado una vez |

`glosario.js` se carga **primero** entre los módulos del navegador (`index.html`), porque
`xlsx.js`, `justificacion.js` y `app.js` leen la marca de él; si falta, los dos primeros lanzan
un error explícito en vez de firmar con un nombre vacío.

El mismo archivo trae el **glosario** (`TERMINOS`: concepto interno → lo que ve el usuario,
tabla §8 del plan maestro), los **verbos en la voz del usuario** (`VERBOS`) y la frase única
para «no hay dato» (`sinReferencia()`). Las pantallas nuevas (fases 8-10) leen de ahí; traducir
las existentes es la Fase 6, transversal.

## 2. Qué NO cambió, y por qué

Renombrar cualquiera de estas cosas rompería producción sin darle nada al usuario:

| Se conserva | Motivo |
|---|---|
| Repositorio `Mauricio7x/portafolio-estrategico`, rama `main` | Vercel despliega desde él |
| URL de producción `https://portafolio-estrategico.vercel.app` | Es la que el dueño tiene pegada en Chrome, y la que citan todas las docs. Ver §4 para el dominio propio |
| Claves de Redis (`licitaciones:*`, `config:*`, `indice:*`, `apu:*`, …) | Renombrarlas exigiría migrar el corpus entero |
| Variables de entorno (`HISTORICO_TOKEN`, `SOCRATA_APP_TOKEN`, `OCRSPACE_API_KEY`, Upstash) | Vercel las inyecta por nombre |
| Nombres de archivos, funciones y endpoints (`/api/{router}?op=…` y los rewrites) | Son contratos, no marca |
| **Claves de almacenamiento del navegador**: `sessionStorage["detecta-acceso"]` (pasó el gate) y `localStorage["detecta_perfil_rup"]` (perfil `rup_…` guardado) | Renombrarlas **cerraría la sesión de todos los usuarios y les borraría el perfil guardado**. Van en minúscula, no son texto visible, y hay prueba de que siguen ahí |

## 3. Cómo se verifica

`node tests/e2e.js`, bloque **j-quinquies**:

- `lib/glosario.js` y `public/glosario.js` son el mismo objeto.
- La grafía vieja no aparece en **ningún** archivo de texto del repositorio (recorrido
  recursivo sobre `.js/.json/.md/.html/.css/.csv/...`; la prueba construye la palabra por
  concatenación para no cazarse a sí misma). Es literalmente el criterio de aceptación de la
  fase: «cero apariciones, verificado con búsqueda de texto».
- Los nodos `[data-marca]` de `index.html` nacen vacíos y cada uno apunta a un campo real de
  `MARCA`; fuera de `<title>`/`<meta>` el nombre no está escrito en el marcado; los módulos del
  navegador no lo escriben entre comillas.
- `<title>` ≡ `Glosario.titulo()`; `meta description` ≡ `Glosario.descripcion()`.
- `Glosario.estampar()` ejecutada contra un DOM mínimo: rellena, es idempotente, no lanza sin
  documento.
- El Excel generado firma con `MARCA.nombre` en los dos `docProps`; la justificación de precio,
  también.
- Las claves de almacenamiento del navegador siguen intactas.

## 4. El día que se compre un dominio propio (p. ej. `detekta.co`)

La aplicación **no necesita ningún cambio de código** para servirse desde otro dominio: no hay
URL absolutas propias en el frontend (todo es `/api/…` relativo) y el token va por header.

Pasos, sin terminal:

1. Comprar el dominio en el proveedor que sea (GoDaddy, Namecheap, .CO Internet, …).
2. En Vercel: abrir el proyecto → **Settings → Domains → Add** → escribir el dominio → **Add**.
3. Vercel muestra uno o dos registros DNS (típicamente un `A` a `76.76.21.21` para el dominio
   raíz y un `CNAME` a `cname.vercel-dns.com` para `www`). Copiarlos tal cual en el panel DNS del
   proveedor del dominio.
4. Esperar a que Vercel marque el dominio como **Valid Configuration** (minutos, a veces horas por
   la propagación DNS). El certificado HTTPS lo emite Vercel solo.
5. En el repositorio, cambiar **una sola línea**: `dominio: "portafolio-estrategico.vercel.app"`
   en `public/glosario.js` por el dominio nuevo, y actualizar la prueba que fija ese valor en
   `tests/e2e.js` (bloque j-quinquies) y la tabla de §2 de este documento.
6. La URL vieja `portafolio-estrategico.vercel.app` **sigue funcionando** (Vercel la conserva como
   alias): los enlaces que el dueño tiene pegados en Chrome no se rompen.

Lo que sí conviene revisar ese día: si Vercel Password Protection está activa, aplica igual al
dominio nuevo (es del proyecto, no de la URL); y la meta `robots noindex` de `index.html` sigue
siendo deliberada mientras la herramienta sea privada.

## 5. Historial

- **ago 2026 (esta fase):** Detekta, con k. Se creó `public/glosario.js` + `lib/glosario.js`,
  se ató `index.html` al glosario y se renombraron los textos de `docs/`, `README.md`,
  `CLAUDE.md`, la constancia `autorizacion_helder.md` (plantilla) y la licencia declarada en
  `data/apu_invias.json` / `tests/capturar_invias.js`.
- **ago 2026 (antes):** «Portafolio Estratégico» —el nombre del REPOSITORIO— dejó de asomarse a
  la pantalla; el producto ya se llamaba con c en `<title>`, landing, gate y barra.
