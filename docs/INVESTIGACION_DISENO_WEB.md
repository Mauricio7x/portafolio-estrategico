# Investigación · Cómo están hechas las mejores páginas web del mundo (4-sep-2026)

Encargo del dueño: mirar las páginas más visitadas del mundo y las mejores en estilo limpio y
minimalista, entender su estructura y su reparto, y aplicarlo a Detekta. Este documento es el
resultado de esa mirada, **con las cifras medidas sobre las hojas de estilo reales** (descargadas
con `curl` ese día, sin abrir un navegador): todo lo que dice MEDIDO se puede volver a comprobar
descargando el mismo archivo. Lo que se aplicó a Detekta está en MEMORIA.md § «La piel v2».

## 1. Qué se miró

**Los treinta sitios más visitados** (ranking Similarweb de julio de 2026 según Wikipedia):
Google, YouTube, Facebook, Instagram, ChatGPT, X, Reddit, Bing, TikTok, WhatsApp, Wikipedia,
Yahoo (JP y US), Yandex, Amazon, Gemini, LinkedIn, Baidu, Naver, Netflix, Pinterest, Live,
Microsoft, Bilibili, Weather, Twitch y otros. De esos, **no se pudieron medir** (y se dice):
Amazon (respuesta vacía), Reddit, OpenAI y ChatGPT (403), LinkedIn (página de captcha) y Bing
(redirección sin CSS). Facebook, Instagram, TikTok y WhatsApp sirven una cáscara sin estilos
útiles antes de iniciar sesión.

**Los referentes del estilo limpio**: apple.com (portada, Mac, iPhone) y sus Human Interface
Guidelines; Stripe, Linear, Vercel, Notion, GitHub, Airbnb, Mercury, Figma, Shopify, Robinhood,
Basecamp, BBC, The New York Times y Microsoft.

## 2. Apple, medido (apple.com y la HIG)

| Cosa | Valor medido | Dónde |
|---|---|---|
| Barra global | 44 px de alto (48 en pantallas grandes); fondo `rgba(250,250,252,.8)` + `blur(20px) saturate(180%)` al abrirse; contenido a 1024 px con 22 px laterales | `globalheader.css` |
| Barra local (la que se pega) | 52 px (48 compacta), 980 px de ancho, título 21 px/600, botón con radio 980 px | `ac-localnav.built.css` |
| Cuerpo | SF Pro Text 17 px, interlineado 1,47, tracking −0,022 em, peso 400 | `main.built.css` `body` |
| Titulares | SF Pro Display, **600**; 80/64/48 px (super), 56/48/32 (tile), 48/40/32 (headline); cuanto más grande, más negativo el tracking | `typography-*` |
| Subtítulos y pies | 28/24/19 px en 400; pie 12 px 400; sin ningún peso 300 en ninguna hoja | `typography-tile-subhead`, `-caption` |
| Fondos | `#f5f5f7` y blanco alternados; oscuro `#000` o `#1d1d1f`; texto principal `#1d1d1f`, secundario `#6e6e73` y `#86868b`; bordes `#d2d2d7`, `#e8e8ed` | conteos en `overview.built.css` |
| Azul | enlaces `rgb(0,102,204)`; botón `rgb(0,113,227)`; en oscuro `rgb(41,151,255)` | `--sk-*` |
| Tarjetas | radio **28 px**, relleno 28 px, **sin sombra** (una sola sombra en toda la portada); la separación la da el gris de fondo | `.card`, `--sk-tile-border-radius` |
| Botones | píldora (radio 980 px), 14 px 400, relleno 9×16; grande 17 px 18×31 | `.button`, `.button-super` |
| Ritmo | secciones a 96/112/56 px según ancho; rejilla de dos columnas con 12 px de hueco, una columna bajo 734 px; texto de lectura a 734 px | `--global-section-padding`, `.section` |
| Estructura de la portada | hero → tiles en rejilla 2×N → galería → pie. Cada tile: titular de ≤3 palabras + una línea + ≤2 enlaces («Más información ›», «Comprar») | `home.html` |
| HIG · tipos | Large Title 34/41 · Title 1 28/34 · Title 2 22/28 · Title 3 20/25 · Headline 17 semibold · Body 17/22 · Footnote 13/18 · Caption 12 y 11; «evite Ultralight, Thin y Light» | `typography.json` |
| HIG · barras | pestañas para secciones de primer nivel, **una palabra** cada una, siempre visibles; «no titule la ventana con el nombre de la app»; centros de botones a ≥ 60 pt | `tab-bars.json`, `toolbars.json`, `layout.json` |
| HIG · materiales | cuatro grosores (ultrafino, fino, regular, grueso): grueso para texto pequeño, fino para conservar el contexto | `materials.json` |

Lo que la HIG **no** trae en el texto descargado y por eso queda como supuesto: la altura de 49/83
px de la tab bar, el «2-5 pestañas» y el objetivo táctil de 44×44 pt (vive en la página de
accesibilidad, no descargada).

## 3. Lo que comparten los demás (medido)

| Sitio | Barra | Ancho de contenido | Cuerpo | Fondo · texto · secundario | Radios | Sombras |
|---|---|---|---|---|---|---|
| GitHub | 64 px, `#f6f8fa`, línea 1 px `#d1d9e0` | 1012 / 980 / 768 | Mona Sans 14 | `#fff` · `#1f2328` · `#59636e` | 3 / 6 / 12 | 14 bordes por cada 3 sombras |
| YouTube | 56 px fija, blanca | 1706 | Roboto | `#fff` · — · `#606060` | 8 / 12 | 1 |
| Wikipedia | sin barra | fluido | sistema 14 / 1,5 | `#fff` · `#202122` · `#54595d` | 2 | inset |
| Google | ~60 px (supuesto) | una columna | 14–16 | — · `#202124` · `#70757a` | caja 26, píldoras | caja 0 3px 10px 8 % |
| BBC | 80 px, blanca, borde 1 px | 1248 | Reith 14/16 | `#fff`, `#f6f6f6` · `#202224` · `#8a8c8e` | 0 | **0** |
| NYT | fija | 1200 | Franklin 16/14/11 | `#fff`, `#f7f7f7` · `#121212` · `#727272` | 3 | 2 |
| Stripe | 76 px | 608–939 | Söhne 14/16/18, peso 300 | `#fff`, `#f8fafd` · `#061b31` · `#64748d` | 2–32 | 8, muy suaves |
| Linear | 64 px | 1024 | Inter 15 / 1,6, −0,011 em | `#fff`, `#f9f8f9` · `#282a30` · `#6f6e77` | 6, píldora | 0 1px 4px 9 % |
| Vercel | 64 px | 1200 / 961 / 601 | Geist 14 | `#fff`, `#fafafa` · `#171717` | 6 / 12 | «borde como sombra» 1 px |
| Notion | 60 px | 940 | Inter 16 / 1,5, `lining-nums` | `#fff` · `#191918` · `#78736f` | 4–16 | casi invisibles |
| Airbnb | 60 px pegajosa | 1440 | Cereal 14 / 1,43 | `#fff`, `#F7F7F7` · `#222` · `#6C6C6C` | 8–32 | 629 (tarjetas comerciales) |
| Mercury | 72 px | 640–1536 | Arcadia 14–21, pesos 360–480 | `#fbfcfd`, `#f4f5f9` · `#10101a` · `#70707d` | 4–16 | utilidades |
| Shopify | 72 px | 1200 / 1600 | Inter 16–18; títulos peso 330 | `#fff`, `#f4f4f5` · `#18181b` · `#71717a` | 8–32 | utilidades |

**Los doce patrones que se repiten**:

1. Barra superior de 44–80 px, casi siempre fija o pegajosa (mediana: 64 px).
2. Fondo de barra blanco o translúcido con **línea inferior de 1 px**, no sombra.
3. Contenedor de 940–1200 px; el texto corrido más estrecho (608–734 px).
4. Cuerpo de 14–17 px con interlineado 1,4–1,6, en una sans del sistema o propia.
5. Texto secundario en un gris medio (`#59636e`–`#86868b`); terciario hacia `#a0a0a0`.
6. Dos superficies: blanco y un gris casi blanco (`#f5f5f7`, `#f6f8fa`, `#fafafa`).
7. **Bordes de 1 px en gris claro en lugar de sombra**; Apple y BBC con cero sombras.
8. Las sombras, cuando existen, casi invisibles (alfa del 2 al 9 %).
9. Radios pequeños en controles (4–8 px), medianos en tarjetas (12–28), píldora en chips y botones.
10. Tracking negativo en títulos (−0,01 a −0,03 em), neutro en el cuerpo.
11. Títulos con peso medio, no negrita gruesa: 300 (Stripe), 330 (Shopify), 590 (Linear), 600 (Apple).
12. Estados como **pares de tokens** (texto fuerte + fondo tenue del mismo matiz) y **cifras tabulares** (`tabular-nums` en Stripe, Vercel, Mercury, GitHub, Airbnb, X; Notion fuerza `lining-nums`).

## 4. Qué se aplicó a Detekta y qué no

Se aplicó (ver MEMORIA.md § «La piel v2» para el motivo de cada una): barra translúcida con
el blur de Apple y la sección activa como control segmentado centrado; título grande por
pestaña (Large Title de la HIG) con una línea de subtítulo; tarjetas blancas y planas sobre
`#f5f5f7`, sin sombra ni anillo; tres grises de texto; cifras en la sans del sistema con
`tabular-nums`; encabezados de sección a 21 px/600 con tracking negativo; botones píldora;
los cuatro tiles del tablero en gris neutro con la cifra en tinta.

No se aplicó, y por qué: la fuente propia (Söhne, Inter, Geist…) — la app no carga
dependencias y la del sistema ya es SF Pro en los aparatos del dueño; el peso 300 en títulos
(Stripe, Shopify) — Apple lo evita y el titular de la portada ya lleva su 250 a propósito; las
tablas con cabecera pegajosa para la lista de licitaciones — la tarjeta lleva tres cifras y un
semáforo que una fila de 44 px no puede contener sin volver a la jerga.

---

# Segunda investigación · el color «caro» y el detalle de interacción (4-sep-2026)

Encargo del dueño después de la piel v2: «que fueras más atrevido, un cambio total, un color
elegante que se vea caro, y súper detallado: que cada botón, cada animación, cada clic se sienta
que alguien pensó en eso». Dos investigadores en paralelo descargaron con `curl` las hojas de
estilo REALES de veintiséis sitios «caros» (Hermès, B&O, Superhuman, Notion, Craft, Family,
Vercel, Attio, Linear, Stripe, Mercury, Clerk, Wise, Brex, Cash, Revolut, Porsche, Teenage
Engineering, Nothing, Raycast, Arc, Resend, Reflect, Things, Bear, Robinhood) y de los sistemas
de diseño con tablas de movimiento publicadas (Carbon, Material 3, Atlassian, Polaris, Spectrum,
Geist, Radix, Primer, Sonner, Vaul, cmdk, la HIG de Apple y los artículos de Emil Kowalski y
Rauno). Los dos informes van íntegros a continuación, con cada valor y su archivo de origen.

## 5. Qué se aplicó de esta segunda investigación (piel v3, «Lino y tinta»)

- **Paleta A del informe de color** (fondo lino `#f6f4f0`, tinta cálida `#1a1916`, secundaria
  `#5c5952`, terciaria `#6f6b62`, borde 9 % de la tinta) y, como ÚNICO color, el azul tinta
  `#2b3f6b` que el informe reservaba a enlaces: el dueño pidió «un color», y la paleta A pura
  (botón = tinta) no tiene ninguno. Estados apagados `#2e7a4b` / `#9a5b0f` / `#b8372f`. Oscuro
  cálido `#121110` / `#1b1a18` con acento `#9db3e8`. Contrastes calculados con el script del
  informe: tinta 16:1, secundaria 6,4:1, acento 9,4:1, blanco sobre acento 9,8:1.
- **Sombras teñidas de la tinta y ≤ 8 %**, anillo de 1 px en vez de sombra en las tarjetas, filo
  de luz `inset 0 1px rgba(255,255,255,.05)` en oscuro.
- **Serif de sistema solo en los títulos grandes** (título de pestaña, titular de la portada,
  marca): el patrón de Mercury, Attio, Brex, Craft y Resend. Las cifras nunca.
- **Tokens de movimiento** del informe de detalle: 70 / 150 / 220 / 320 ms, ease-out de Carbon
  para lo que responde, expo-out de Radix para lo que flota, la curva de Vaul para las hojas; press
  `scale(.98)`; foco `outline: 2px solid` + `offset 2px` solo por teclado; indicador deslizante
  del control segmentado; esqueleto con brillo de Geist; diálogo desde `scale(.97)`.
- **Lo que NO se adoptó y por qué**: el toast de Sonner (la app no tiene toasts: los avisos son
  bloques en la página con `aria-live`); el stagger largo en listas de datos (se dejó en 20 ms ×
  8 tarjetas y 320 ms, el de apple.com, porque el dueño pidió que se note y la lista se repinta
  con cada filtro); `translateY` en tarjetas de datos (solo en las tres puertas de la portada, que
  son marketing).

## 6. Investigación de color para Detekta: qué hacen de verdad las páginas «que se ven caras»

Fecha: 4 de septiembre de 2026. Método: descarga con `curl` (User-Agent de Chrome 128, tiempo límite 20 s) del HTML de cada página y de TODAS sus hojas de estilo (`<link rel=stylesheet>` seguidas una a una, más los bloques `<style>` en línea); sobre el CSS concatenado se extrajeron con expresiones regulares las custom properties (`--…:`), y se contaron las apariciones de cada color (hex, rgb, oklch/hsl), de cada `box-shadow`, `border-radius`, `font-family`, `font-weight`, `font-size` y `letter-spacing`. Nada se tomó de memoria: cada valor de la tabla lleva la hoja de donde salió. Todo el material crudo (HTML, hojas, resúmenes JSON) quedó en `scratchpad/color/`.

Sitios pedidos: 30. Alcanzados: 28 páginas de 26 sitios (Apple con dos páginas; Vercel con dos). Bloqueados con 403 en dos intentos (con y sin cabeceras `Sec-Fetch-*`): **aesop.com** (5,6 KB de página de reto), **rolex.com** (367 B). **hermes.com** dio 403 en la raíz y 200 en `/us/en/`. **revolut.com** responde 403 pero entrega la página completa (873 KB con todo el CSS en línea): se midió igual. **ramp.com** sirve a este User-Agent una «Machine Version» en texto (14 KB, sin CSS, con publicidad dirigida a agentes): no se pudo medir; lo que contiene es marketing y se ignoró. **cron.com** se midió en su dirección actual, `notion.so/product/calendar`; **things.every.app** en `culturedcode.com/things/`.

Lectura de la tabla: «tinta 1» es el color del texto principal; «tinta 2», el secundario; «acento», el color de la acción principal (botón o enlace); «tema» dice si la página carga en claro u oscuro. Los conteos «×n» son apariciones en el CSS real, que es lo que dice cuál es la paleta de verdad y cuál es decorado.

### 6.1. Tabla por sitio (valores medidos)

| Sitio | Fondo de página | Superficie / tarjeta | Tinta 1 | Tinta 2 (y 3) | Acento (hover) | Sombra literal más usada | Radios | Tipografía: familia · pesos · cuerpo · titulares · tracking | Tema | Hoja de origen |
|---|---|---|---|---|---|---|---|---|---|---|
| linear.app | `#08090a` (`--color-bg-primary`, tema oscuro; claro `#fff`) | `#141516` (`--color-bg-tint`), paneles `#161718` | `#f7f8f8` (claro: `#282a30`) | `#d0d6e0` / `#8a8f98` (claro: `#3c4149` / `#6f6e77`) | `#5e6ad2` (`--color-brand-bg`), enlaces `#828fff`; botón hover sin cambio de color, solo brillo | `--shadow-low: 0 1px 4px -1px #00000017`, `--shadow-high: 0 7px 24px #0000000f`; bordes `#ffffff14` | 8 px ×37, 6 px ×24, píldora `9999px`, tarjeta 12 px | Inter Variable · 400/510/590/680 · cuerpo `.9375rem` (15 px) con tracking −.011em · títulos 2–4.5 rem, peso 590, tracking −.022em | Oscuro por defecto (`color-scheme: dark`) | static.linear.app/…/index.DF8NERDv.css |
| vercel.com | `#fff` (`--ds-background-100`), franjas `#fafafa` (`--ds-background-200`) | `#fff` con anillo `0 0 0 1px #00000014` (`--ds-shadow-border-base`) | `#171717` (`--ds-gray-1000` = hsl 0 0% 9%) | gray-900 hsl(0,0%,30%) = `#4d4d4d`; gray-600 53% = `#878787` | Botón principal NEGRO `#000` sobre blanco; azul `#0070f3` (`--ds-blue-700` hsl 212 100% 48%) solo para enlaces y foco | `--ds-shadow-xs: 0 1px 2px #0000000a`; `--ds-shadow-medium: 0 2px 2px #0000000a, 0 8px 8px -8px #0000000a` | 6 px (`--geist-radius`) y 12 px; píldora `2147483647px` | Geist Sans · 400/500/550/600 · cuerpo 14 y 16 px · titulares 48 px con tracking −.96 px hasta −2.4 px (−.02/−.04em) | Claro por defecto, oscuro completo por tokens | vercel.com/…/328y7_b581oob.css (geist/colors) |
| mercury.com | `#fbfcfd` (`--color-neutral-base-50`) y `#fff` | `#fff`; hundido `#f4f5f9` (base-100) | `#1e1e2a` (neutral-base-900) | `#535461` (base-600) / `#70707d` (base-500) | `#5266eb` (`--color-purple-magic-600`), hover `#4354c8` (700), activo `#3442a6` (800) | Solo anillos translúcidos: `#5266eb38` (alpha-5), `#7073931a`; casi sin sombra proyectada | `.75rem` (12 px) para tarjetas, `.25rem` para controles, 2–2.5 rem para heros | Arcadia (propia) + Tiempos (serif de titulares) · pesos fraccionarios 360/400/420/480/500 · tracking POSITIVO en versales: 0/.005/.01/.015/.02/.03em | Claro | mercury.com/…/b6126dec6da46da6.css |
| ramp.com | — (sirvió una «Machine Version» sin CSS a este User-Agent) | — | — | — | — | — | — | — | — | no medible |
| raycast.com | `#07080a` (`--grey-900`), capas `#0c0d0f` / `#111214` | `#101111` (`--color-bg-100`), `#18191a` (bg-200) | `#f4f4f6` (`--color-fg`) | `#c2c7ca` (fg-200) / `#78787c` (fg-300) | Botón BLANCO `#ffffffd0` con tinta `#18191a`, hover `#fff`; azul `#57c1ff` solo en enlaces; rojo de marca `#ff6363` ×27 | `inset 0 1px #ffffff1a` ×23 (filo de luz arriba), `0 4px 4px #00000040` | 6 px ×28, 12 px ×25, 8 px (`--radius`) | Inter + Geist Mono · 500 ×199 (medium domina), 400, 600 · cuerpo 14 px ×109, 13, 16 · tracking +.2 px / +.1 px (positivo, por ser oscuro) | Oscuro por defecto | raycast.com/…/3kx5useibgx0u.css |
| arc.net | `#fffcec` (`--colors-brandOffwhite`, crema) | blanco `#fff` y `#f7f7f7` | `#0e0f10` | `rgba(14,15,16,.6)` | `#3139fb` (`--colors-brandBlue`), `#0c50ff`; rojo `#fb3a4d` | `--shadows-small: 0 5px 10px rgba(0,0,0,.12)`, medium `0 8px 30px`, large `0 30px 60px` (misma opacidad .12) | grandes: 1.9–2.5 rem, 16 px, píldora | «Marlin Soft» + Inter · 700 ×28, 500, 400 · 16/14/20 px · −.32 px, −.05em | Claro | HTML `<style>` en línea + arc.net/…/df28c1bc1b1a6c7d.css |
| family.co | `#fff`; secciones `#fbfaf9` y `#f6f4ef` (cálidos) | `#fff` con `0 0 0 1px rgba(0,0,0,.04)` | `#343433` (`--color-text`, negro cálido) | `#848281` | `#1a88f8` ×14 (app `#018dff`); verde ok `#34c759` / `#44c67f` | `0 1px 6px rgba(0,0,0,.04), 0 0 24px rgba(0,0,0,.05)` | 12 px ×11, 8 px, 32 px; 2 px en detalles ×29 | Inter · 500 ×19, 400, 600 · cuerpo 15 y 17 px · titular 44 px · tracking −.22 / −.44 / −1.35 px | Claro | HTML `<style>` en línea |
| stripe.com | `#fff`; franjas `#f6f9fc` y `#f8fafd` (`--hds-color-core-neutral-25`) | `#fff` (`--cardBackground`); borde `#e5edf5` (neutral-50) | `#1a2c44` (neutral-900, azul marino tinta); textos `#424770` | `#64748d` (neutral-500) / `#3c4f69` (700) | `#533afd` (brand-600) y `#635bff`; brand-500 `#665efd` | `0 27px 40.5px -27px rgba(50,50,93,.25), 0 16.2px 32.4px -16.2px rgba(0,0,0,.1)` (sombra teñida de marino) | `--hds-space-core-radius`: 2/4/6/16 px; 6 px domina ×103 | Söhne (`sohne-var`) · 300/400/500 (su «bold» es 500) · cuerpo 14–16 px · tracking −.01em ×23 | Claro | b.stripecdn.com/…/f5d7a0708b41b5bf.css |
| apple.com/apple-card | `#fff`; franjas `#f5f5f7` ×26 | `#fff` plano, sin sombra; tarjeta oscura `#1d1d1f` | `#1d1d1f` ×20 (rgb 29,29,31 ×11) | `#6e6e73` ×12 / `#86868b` ×9 | `#0071e3` ×85 (`--sk-button-background`), hover `#0077ed`, activo `#006edb`; enlaces `#06c` (`#0066cc`) | `box-shadow: none` ×50; foco `0 0 0 3px #fff, 0 0 0 5px #0071e3`; flotante `4px 12px 40px 6px rgba(0,0,0,.09)` ×6 | botón píldora `980px`; 8 px ×12, 18 px ×4, 3 px | SF Pro Display/Text · 600 ×98, 400 ×82, 700 · cuerpo 17 px ×40, 14, 12 · titulares 40/28/24/21 px · tracking −.022em en titulares, +.011/+.009em en textos pequeños, 0em ×180 | Claro | apple.com/…/globalheader.css + hojas de la página |
| apple.com/macbook-pro | `#fff` de base; el hero y las secciones de producto van en `#000` ×41 con texto `#f5f5f7` (`color-scheme: dark` declarado) | franjas `rgb(245,245,247)` ×83; oscuras `#1d1d1f` | `#1d1d1f` ×37 (claro) / `#f5f5f7` (sobre negro) | `#6e6e73` ×30 / `#86868b` ×22 | `#0071e3` ×69, hover `#0076df`, activo `#006edb`; rojo `#e30000` solo en avisos | `inset 0 0 .5px 0 rgba(0,0,0,.11)` (filo de ½ px); `0 0 0 3px #000, 0 0 0 5px #0071e3` foco | 5/6/3 px, 50 %, 0 ×16 | SF Pro Display · 600 ×247, 400 ×122 · 17 px ×77, 28, 21, 24, 19, 32 px · −.022em ×61, +.011em ×37 | Claro con hero OSCURO | apple.com/…/globalheader.css + hojas de la página |
| aesop.com | 403 | | | | | | | | | bloqueado |
| rolex.com | 403 | | | | | | | | | bloqueado |
| porsche.com | `light-dark(#fff, #010205)` (`--p-color-canvas`) | `--p-color-surface: light-dark(#f1f1f4, #19191a)` | `--p-color-primary: light-dark(#010205, #fafbff)` (negro azulado, no `#000`) | `--p-color-contrast-high: rgba(26,26,30,.7)`, medium `rgba(17,17,19,.6)`, low `rgba(36,36,40,.5)` (tintas por OPACIDAD sobre negro) | Botón = tinta (`#010205`); azul `#1a44ea` ×13 solo en foco/enlace | `--p-shadow-sm: 0 3px 8px rgba(0,0,0,.16)`, md `0 4px 16px`, lg `0 8px 40px` (misma opacidad .16) | `--p-radius`: 2/4/6/8/12/16/24/32 px; 10 px ×43 | Porsche Next · 400/600/700 · `clamp(.81rem…, .88rem)` cuerpo, `clamp(1.27rem…1.78rem)` títulos | Claro y oscuro por `light-dark()` (sigue al sistema) | porsche.com/…/index.BsmHTUeo.css |
| hermes.com | `#f6f1eb` ×6 y `#fcf7f1` (crema cálida, `body`) | `#fffcf7` ×10 (blanco roto) | `#000` ×79 (negro puro sobre crema) | `#696969` ×10, `#919191` ×7 | NINGUNO: botones negros con `--button-border-radius: 0`; el naranja de marca no aparece en el CSS de la portada | `0 3px 3px #0003` ×1; prácticamente plano | 0 (`--button-border-radius: 0`), 4 px, `.3em` | Manrope (`--font-primary`) · 300/400/500/700 · tracking 0 ×42, +1 px en versales | Claro | hermes.com/…/hermes.cfe7ada2c4674397.css + `<style>` en línea |
| bang-olufsen.com | `#fafafa` ×22 y `#fff` | `#fff`; crema `#fcfaee` ×16 y `#f4f1e7` en franjas | `#191817` ×139 (negro CÁLIDO, el color más repetido del sitio) | `#555555` ×66, `#737373` | Botón = tinta `#191817`; rojo `#bf2839` ×15 (rebajas), azul `#3082fd` solo en anillo de foco | `0 0 0 1px #3082fd, 0 0 0 3px #bfdefb` (foco) ×9; `0 0 4px rgba(0,0,0,.2)` | 1 px ×9, 0 ×6, 2 px, 24 px en píldoras | BeoSupreme (propia) · 400/500/300 · `.875rem` ×29, `.75rem` ×24, 1 rem · versales con tracking +2 px ×48 y +1 px ×32 | Claro | HTML `<style>` en línea (foundation.css es el vendor) |
| teenage.engineering | `#f5f5f5` (`--te-white`) | `#fff`; campos `--field-background: var(--te-white)` | `#0f0e12` (`--te-black`, negro violáceo) | `#888`, `#767676` | Botón = tinta (`--button-background: var(--te-black)`); azul `#0071bb` ×1 | `box-shadow: none` ×8; una sola sombra `#00000080` proporcional al ancho | 0 ×8, píldora `1000px` ×7; radios proporcionales al ancho (`calc(.0255 * var(--client-width))`) | te-20 / te-40 (propias) · 400 ×57, 300, 100 · tamaños proporcionales al ancho (`--fs-15: calc(.0132653 * var(--client-width))`) | Claro | teenage.engineering/…/root.NRW9iUxr.css |
| nothing.tech | blanco `255 255 255` (`--greyscale-white`) | `#f4f4f4`, `#f5f5f5` | `4 4 4` (`--greyscale-black` = `#040404`) | `#b1b3b3`, `#9ca3af` | Botón = tinta; amarillo `255 199 0`, rojo `200 16 46` solo en marca | `--tw-shadow-color: rgb(var(--greyscale-900) / .05)`; `0 0 50px #0000004d` | píldora `999px`, `.25rem`, `.375rem` | Ndot (puntos) + NType82 + Geist Mono · 400 · 1.25 rem, 1 rem, 1.5 rem · +.025/+.1em en versales, −.04em en titulares | Claro | cdn.shopify.com/…/tailwind-sHsZORoi.css |
| revolut.com | blanco `255 255 255` (`--website-layout-background-channel`) | `#f4f4f4` ×10, `#f7f7f7` ×9, `#ebebf0` | `#191c1f` ×5, `#1c1c1e` | `rgba(25,28,31,.04)` como velo; grises `#8e8e93` (iOS) | Botón = tinta; `#0666eb` azul y `#4f55f1` índigo en enlaces; verde `#13d1a3`; rojo `#e23b4a` | `--rui-shadow-level1: 0 .125rem .1875rem rgb(negro/.05)`, level2 `0 .1875rem .5rem rgb(negro/.1)`, level3 `0 .1875rem 1.875rem rgb(negro/.08)` | `--rui-radius`: 2/4/6/8/12/16/24/32 px; widget 16, popup 24 | Inter (`--rui-font-brand`) + Aeonik Pro · 400/500/600/700 · 1 rem, 1.25, 1.5, 2, 2.5 rem · −.01 a −.025rem | Claro (tokens `data-theme` claro/oscuro) | HTML `<style>` en línea (respondió 403 con la página completa) |
| wise.com | `#ffffff` (`--color-background-screen`) | `#fff`; neutro `rgba(134,167,189,.10196)` | `#0e0f0c` (content-primary, negro cálido) y `#163300` (verde bosque, «forest») | `#5d7079` ×58 | `#163300` (`--color-interactive-primary`), hover `#0d1f00`; lima `#9fe870` ×28 como fondo de marca; positivo `#054d28`, aviso `#ffd11a`, negativo `#cb272f` | `inset 0 0 0 1px #c9cbce` ×16; `box-shadow: none` ×84 | `--radius-small: 10px` ×50, medium 16, large 24, píldora | Wise Sans (display) + Inter · 400/600/900 · `.875rem` ×50 y 1 rem · −.006em, −.03em | Claro | wise.com/…/27761ea483bf33ec.css |
| brex.com | `#fcfcfd` ×23, `#f9f9fb` | `#fff`, `#f3f3f7` hundido | `#15191e` ×48 | `#60646c` ×22 / `#6f737b` | `#ff3d00` ×47, hover `#ff5900` ×37, `#ff6b18`; azul `#006ef5` para foco | `0 1px 1px rgba(0,0,0,.04)`; `0 1px 0 0 rgba(66,87,138,.15)` (línea, no sombra) | 12 px ×26, 10 px ×11 | Inter + Flecha (serif) + Space Mono · 400/700/600/500 · 16 px ×148, 14 px ×87 · titulares 36/48 px · tracking −.32 px ×138, −.48, −.72, −.96 px | Claro | brex.com/…/850a48fe912141d5.css |
| cash.app | `#fff` ×126 y `#000` ×119 (alterna bloques blancos y negros) | `#f0f0f0`, `#f4f4f4` | `#000` / `#fff` | `#737373` ×27, `#333`, `#666` | verde `#00d632` / `#00e013` (marca), solo ×5; los botones son negros o blancos | `0 8px 24px #0000001f`, `0 2px 8px #00000014` | `.75em` ×43, `clamp(18px,1em,22px)` ×34, píldora, 20 px | Cash Sans / Cash Sans Wide (propias) · 400 ×457 (regular domina), 500, 600 · tamaños en `em` y `clamp` · −.02em ×199, −.03em ×113 | Claro con bloques negros | cash-f.squarecdn.com/…/8a3cd06797c193bc.css |
| robinhood.com | `rgb(0,0,0)` (`body`) | `#110e08` ×13, `#35322d` ×11 (negros CÁLIDOS, marrón) | `#ffffff` ×21 | `#808080`, `#888784` | lima `#ccff00` ×18 (único color); verde `rgba(0,200,5,.8)` en brillos | `0 0 8px rgba(0,200,5,.4)` (halo), `none` | 36 px ×5, 20 px, 3 px, píldora | Phonic + Capsule Sans + Nib Pro (serif display) · 400 ×70, 500, 700, 300 · 16 px, 40, 25, 72, 58, 44 px · −1 px ×15, −.25, −.5, −1.5 px | Oscuro por defecto | HTML `<style>` en línea |
| attio.com | `#fff` (`--color-white-100`), `#fafafb` (white-200) | `#fff`; hundido `#f3f4f6` (white-300); bordes `#e4e7ec`, `#eeeff1` | `#1c1d1f` (black-100) | `#505967` (black-600) / `#6f7988` (black-700) / `#8f99a8` (black-800) | Botón principal en degradado de negros (`--button-primary-bg: black-200 → black-600`); azul `#266df0` ×11 (blue-500), hover `#245bc2` (600) solo en enlaces | `0 1px 3px #0000000a, 0 0 2px #1c28402e` (sombra teñida de marino) | `--radius-md .375rem`, lg `.5rem`, xl `.75rem`; 5/7/9 px | Tiempos Text (serif) para titulares + Inter · 400/500 · `--text-sm` · −.015em ×17, −.01em | Claro | attio.com/…/2u932smwr0yu_.css |
| notion.so/product/calendar | `#fff` (`--tatami-color-background-base: var(--tatami-color-white)`) | `#f6f5f4` (gray-200), `#f9f9f8` (gray-100), `#f7f7f5` | `#37352f` ×31 (negro cálido clásico de Notion; `text-strong` = alpha-black-900) | `#78736f` (gray-500) / `#494744` (gray-700); bordes `#dfdcd9` (gray-300) | `#2383e2` ×14 (azul), blue-500 `#097fe8`, 600 `#0075de`; botones principales NEGROS `#000` | `--tatami-shadow-100: 0 .7px 1.462px #00000004, 0 3px 9px #00000008`; shadow-200 en tres capas de .8–7.8 px con alpha 3–5 % | `--tatami-border-radius-300 .3125rem` (5 px) ×31, 400 `.375rem` ×31, 700 `.75rem` ×22, 12 px | Notion Inter (propia) + pila del sistema · 400/500/600/700 · 14 px ×38, 16, 12, 20 px · tracking 0 ×107, −.0078rem | Claro (oscuro por `prefers-color-scheme`) | notion.so/…/2iig-cr4wkfln.css |
| resend.com | `#fdfdfd` (`body`) pero `#000` ×202: la portada es casi toda negra | `#111`, `#191919`, `#1d1c1b`, `#26292e` | `#fff` ×240 | `#8c8c8c` ×16, `#4b4b4b`; gray-500 `#6a7282` | menta `#62ffb3` ×20 (único color); verde `#22c55e`; naranja `#f76004` en avisos | sombras interiores complejas (`inset -1px -1px 4px 3px #00000040, inset 1px 1px 4px #ffffff1a…`) en piezas 3D; `0 -2px 40px #00000010` | 0 ×14, píldora, `.25rem`, `--radius-xl .75rem` | Domaine (serif display) + sans propia + mono · 600/400 · `--text-sm .875rem` · −.1rem, −.896px, −.02em | Oscuro (hero) sobre base clara | resend.com/…/448su1w6w0c1z.css |
| clerk.com | `#fff` ×99; `#f7f7f8` (gray-50) ×20; oscuro `#0a0a0b` ×26 | `#fafafb`, `#eeeef0` (gray-100); bordes `#e3e3e7`, `#d9d9de` (gray-200) | `#212126` (gray-900) ×24; `#131316` (gray-950) | `#747686` (gray-500) / `#42434d` (gray-700) | violeta `#6c47ff` ×23 (único color), cian `#64e5ff` en la parte oscura | `0 10px 32px #21212626, 0 1px 1px #0000000d, 0 0 0 1px anillo, 0 4px 6px #21212614, 0 24px 68px #2121261a` (sombra teñida de la tinta, no negra); `0 0 0 1px #00000026, 0 0 0 4px #00000014` | 0, `.25rem`, píldora, `--radius-md/lg/2xl` | Suisse (propia) + Mosaic · 500 ×32, 400, 600, 700 · `.8125rem` (13 px) ×20, `.875rem`, `.625rem` · −.035em ×11, −.015em | Claro con secciones oscuras | clerk.com/…/07azmb66b_sm0.css |
| reflect.app | `#030014` ×9 (negro azulado profundo, `body`) | vidrio `rgba(255,255,255,.08)` y `.1`; `inset 0 0 12px #ffffff14` ×8 | `#fff` ×1554 | `#d9d9d9`, `rgba(217,217,217,.8)` | lavanda `#ba9cff`, `#c9b1ff`, `#f4f0ff` (velos); `#8562ff` | `inset 0 0 12px #ffffff14` (borde de luz), `inset 0 -7px 11px #a48fff1f` | `inherit`, 50 %, 8/6/16/4 px | Aeonik Pro + Inter V · 500 ×22, 400 · 14/16/13 px, titulares 72 y 32 px · sin tracking declarado | Oscuro por defecto | HTML `<style>` en línea |
| superhuman.com | `light-dark(#fff, mulberry-100)` (`--color-bg-primary`); lienzo `--neutral-0: #fcfaf7` (blanco CÁLIDO) | `--neutral-5 #f7f5f2`, `--neutral-10 #f2f0eb` (secundario) | `--neutral-100: #141413` (negro cálido) | `--neutral-60 #73716d` / `--neutral-80 #474543` / `--neutral-40 #8d8a86`; bordes `rgb(neutral-60 / 20%)` | `--purple-60: #714cb6` (`--color-primary-base` en claro; `--purple-20 #d4c7ff` en oscuro), hover `--purple-80 #533192`; ok `#148072`, aviso `#dfad0d`, error `#cd0037` | `--elevation-xsmall: 0 0 0 1px rgb(sombra/4%), 0 4px 8px -2px …`; small `… 0 16px 8px -8px …` (anillo de 4 % + sombra suave) | `--radius-1x 4px`, `2x 8px`, `full 999px` | Super Sans VF / Super Serif VF / Super Sans Mono VF (propias) · regular 460, medium 540, bold 700 · `--font-size-14` ×11, 16, 24 · `--letter-spacing-tight` en titulares, −.14 px | Claro y oscuro por `light-dark()` | superhumanstatic.com/…/fed65934157d5181.css |
| culturedcode.com/things | `#fff` (`body`); auto-oscuro `#212224` con texto `#f0f1f2` | `#f2f5f7`, `#eceef0`; borde `#e6e8ec`, `#d5d9de` | `#303336` (negro azulado suave) | `#55606e`, `#818489` | azul `#2576eb` / `#5c9cf5` / `#649fff` (sistema, escaso) | `0 2px 4px rgba(0,0,0,.1), 0 4px 16px rgba(0,0,0,.1), 0 8px 32px rgba(0,0,0,.1)` (tres capas iguales); `0 0 0 1px rgba(0,20,49,.18) inset` | `.4em` ×5, `.25em`, `.5em`, `1em`, 6 px | pila del sistema (`ui-sans-serif, -apple-system…`) · 700 ×17, 600, 440 · en `em` (.85–1.125em) | Claro con auto-oscuro por `prefers-color-scheme` | culturedcode.com/…/shared.css |
| bear.app | `#fff` (`--background-color`) | `--background-secondary-color: #F3F5F7`, terciario `#E4E5E6` | `#444444` (`--text-color`, gris oscuro, NO negro) | `#888888` (`--text-secondary-color`) / `#d9d9d9` (terciario) | rojo `#DD4C4F` (`--accent-color`), único color | `0 13px 34px rgba(0,0,0,.12)` ×15 (una sola sombra grande y suave) | `.5em` ×10, `1em`, `2.5em`, `.3em`, 14 px | Bear Sans / Bear Sans Headline (propias) · 400/700/500 · en `em` (1.1em ×8, 1.4, 2.6em) · +.5 px | Claro | bear.app/screen.css |
| craft.do | `--background: var(--color-beige)` = `#fcf9f7` ×8 (beige cálido) | `#fff`; hundido `#fff3e7`, `#fce8e0` (cálidos) | `--foreground: var(--color-black)` = `#030302` (negro cálido) | `--muted-foreground: var(--color-black-500)`; oklch(37.3% .034 259.7) | `#0bf` ×11 (cian) mínimo; botones = tinta (`--primary: var(--color-black)`) | `0 50px 40px #00000003, 0 50px 40px #00000005, 0 20px 40px #0000000d, 0 3px 10px #00000014` (cuatro capas de 1–8 %) | `--radius .625rem` (10 px), `--radius-3xl`, 20 px | Inter + Untitled Serif / Source Serif 4 · 500 ×27, 400 ×25, 600 · 16 px, 36/24/28/32 px · −.02em ×19, −.03em ×16, −.04em | Claro | craft.do/…/130b0ae0ed1c5d86.css |

### 6.2. Qué hace que cada uno se vea caro (una línea por sitio, medida)

- **linear.app**: negro casi puro pero no `#000` (`#08090a`), un solo acento índigo DESATURADO (`#5e6ad2`, croma bajo), pesos fraccionarios (510/590), tracking −.022em en todos los titulares, sombras de 6–9 % de opacidad; el color de marca aparece solo 3 veces en 589 KB de CSS.
- **vercel.com / Geist**: gris puro (hsl 0 0 %) en ocho pasos, botón principal NEGRO sobre blanco, el azul es solo enlace; el borde es un anillo de 8 % (`#00000014`) y la sombra más usada es `0 1px 2px #0000000a` (4 %). Titulares con tracking de −.02 a −.04em.
- **mercury.com**: neutros con un punto de violeta (`#1e1e2a`, `#535461`), pesos fraccionarios (360/420/480), serif Tiempos en titulares, tracking POSITIVO en versales pequeñas y ninguna sombra proyectada: solo anillos translúcidos del acento.
- **raycast.com**: negro `#07080a`, botón blanco, filo de luz `inset 0 1px #ffffff1a` en cada control (imita un bisel), tracking positivo (+.2 px) porque el texto claro sobre oscuro se aprieta.
- **arc.net**: crema `#fffcec` en lugar de blanco, negro `#0e0f10`, sombras de una sola opacidad (.12) en tres distancias; el lujo aquí es el fondo de color y los radios enormes.
- **family.co**: negro cálido `#343433`, fondos crema `#fbfaf9`/`#f6f4ef`, tarjeta con anillo de 4 % y sombra de 24 px al 5 %, cuerpo de 17 px con tracking −.44 px.
- **stripe.com**: no hay negro: la tinta es azul marino `#1a2c44` y hasta la sombra está teñida de marino (`rgba(50,50,93,.25)`); radios pequeños (6 px) y el «bold» de la marca es peso 500.
- **apple.com (ambas)**: gris `#f5f5f7`, tinta `#1d1d1f` (15,5:1), secundaria `#6e6e73` (4,66:1: justo la AA), sin sombras (`none` ×50), botón píldora de 980 px, cuerpo 17 px, titulares 600 con −.022em; y el hero de MacBook Pro sobre `#000` con texto `#f5f5f7`. El azul `#0071e3` está solo en botones y foco.
- **porsche.com**: tinta `#010205` (negro azulado) y las tres tintas secundarias son OPACIDADES de ese negro (.7/.6/.5), no grises distintos: la jerarquía sale del mismo pigmento. Un solo tono de sombra (.16) en tres tamaños.
- **hermes.com**: crema `#f6f1eb` + negro puro + botones cuadrados (`radius: 0`) + Manrope 300/400 + tracking +1 px en versales; cero acento en la portada. Es el patrón «lujo de moda»: el color lo pone la fotografía.
- **bang-olufsen.com**: el color más repetido es el negro cálido `#191817` (139 veces), radios de 1–2 px, versales con +2 px de tracking; el único rojo es la etiqueta de rebajas.
- **teenage.engineering**: gris `#f5f5f5`, negro violáceo `#0f0e12`, radios 0, botones = tinta, y TODO (tamaños, radios, sombra) proporcional al ancho de ventana; pesos 100/300/400.
- **nothing.tech**: blanco y `#040404` en canales RGB; la marca es la tipografía de puntos (Ndot), no el color; versales con +.1em.
- **revolut.com**: neutros `#191c1f`, `#f4f4f4`, `#f7f7f7`; sombras de 5–10 % en cuatro niveles; radios en escala 2→32 px; el color aparece solo en velos pastel (`#edeefd`, `#e5f7f3`).
- **wise.com**: tinta verde bosque `#163300` como color de acción (13,9:1) y lima `#9fe870` como fondo de marca: un solo par oscuro/claro, y el resto neutro cálido `#0e0f0c`.
- **brex.com**: negro `#15191e`, blanco `#fcfcfd`, un naranja saturado como único color (`#ff3d00`), y una escala de tracking negativo estricta (−.32/−.48/−.72/−.96 px) por tamaño.
- **cash.app**: bloques alternos blanco/negro, tipografía propia con 400 dominante (457 veces), el verde de marca casi no toca la interfaz (5 apariciones).
- **robinhood.com**: negro con superficies marrones cálidas (`#110e08`, `#35322d`), lima `#ccff00` como única nota, titulares de 72 px con −1 px; serif Nib Pro de display.
- **attio.com**: escala de «negros» azulados (`#1c1d1f` → `#a4adba`), botón en degradado de negros, serif Tiempos en titulares, sombra teñida de marino (`#1c28402e`).
- **notion.so/calendar**: negro cálido `#37352f`, grises cálidos (`#f6f5f4`, `#dfdcd9`, `#78736f`), sombra de dos capas a 2–3 %, botones negros; el azul es de enlace.
- **resend.com**: casi todo negro con un verde menta `#62ffb3` como única luz, serif Domaine, piezas con sombras interiores (efecto de objeto).
- **clerk.com**: violeta `#6c47ff` como único acento sobre grises `#212126`/`#f7f7f8`, sombras teñidas de la tinta (`#21212626`), tracking −.035em en titulares.
- **reflect.app**: fondo `#030014` (negro azulado), bordes de luz (`inset 0 0 12px #ffffff14`) en vez de bordes sólidos, lavandas como velos.
- **superhuman.com**: neutros CÁLIDOS en escala (`#fcfaf7` → `#141413`), pesos 460/540, anillo de 4 % + sombra suave, morado `#714cb6` de acento con estados ok/aviso/error propios (`#148072`, `#dfad0d`, `#cd0037`).
- **culturedcode.com/things**: `#303336` de tinta, pila del sistema, tres sombras apiladas de 10 %, auto-oscuro; lo caro es la contención.
- **bear.app**: tinta `#444444` (gris, no negro), una sola sombra de 34 px al 12 %, un solo rojo de acento.
- **craft.do**: beige `#fcf9f7`, negro cálido `#030302`, serif para titulares, sombras en cuatro capas de 1–8 %, botones = tinta.

### 6.3. Patrones comunes (con cifras)

1. **Casi nadie usa `#000` como tinta sobre claro.** De 22 páginas claras, 20 usan un «casi negro» entre L 6 y L 22: `#1d1d1f` (Apple), `#191817` (B&O), `#141413` (Superhuman), `#1c1d1f` (Attio), `#212126` (Clerk), `#1e1e2a` (Mercury), `#37352f` (Notion), `#343433` (Family), `#15191e` (Brex), `#0e0f0c` (Wise), `#010205` (Porsche), `#030302` (Craft), `#303336` (Things), `#444` (Bear), `#0f0e12` (Teenage), `#191c1f` (Revolut), `#1a2c44` (Stripe, marino). Solo Hermès y Cash usan `#000`. **Diez de esos casi-negros son CÁLIDOS** (rojo ≥ verde ≥ azul: B&O, Superhuman, Notion, Family, Wise, Craft, Robinhood…) y siete son fríos/azulados (Apple, Attio, Clerk, Mercury, Porsche, Stripe, Teenage).
2. **El fondo no es blanco puro ni gris frío.** Cálidos: Hermès `#f6f1eb`, Superhuman `#fcfaf7`, Craft `#fcf9f7`, Family `#fbfaf9`, Notion `#f6f5f4`, Arc `#fffcec`, B&O `#fcfaee`. Neutros: Apple `#f5f5f7`, Vercel `#fafafa`, Attio `#fafafb`, Clerk `#f7f7f8`, Resend `#fdfdfd`, Brex `#fcfcfd`, Teenage `#f5f5f5`, Revolut `#f4f4f4`. Fríos: Stripe `#f6f9fc`, Bear `#f3f5f7`, Mercury `#fbfcfd`. Once páginas ponen la tarjeta en `#fff` sobre un fondo apenas más oscuro (diferencia de 1,05 a 1,2:1) y separan por ANILLO de 4–8 % (`0 0 0 1px #00000014`, Vercel; `rgba(0,0,0,.04)`, Family; 4 %, Superhuman), no por sombra.
3. **Contraste alto de tinta, secundaria justo en AA.** Tinta 1 sobre fondo: 12–18:1 en todas (Apple 15,5; Linear 14,3; Vercel 17,9; Superhuman 17,7; Mercury 16,5; B&O 17,0; Hermès 18,7). Tinta 2: entre 4,2 y 7,5:1 (Apple 4,66; Notion 4,69; Superhuman 4,67; Hermès 4,89; Stripe 4,75; Clerk 4,49; Attio 4,22; Family 3,67). Es decir: la secundaria se lleva al límite legal para que la principal mande.
4. **Un solo acento, y muchas veces el acento es la tinta.** Botón principal negro/tinta en Vercel, Attio, Notion, Hermès, B&O, Teenage, Nothing, Craft, Porsche, Cash, Revolut (11 de 26). Cuando hay color, es UNO y desaturado o muy oscuro: Linear `#5e6ad2` (croma bajo), Mercury `#5266eb`, Superhuman `#714cb6`, Wise `#163300`, Stripe `#533afd`, Clerk `#6c47ff`. El acento de Detekta hoy, `#007aff`, da 3,69:1 sobre `#f5f5f7` y el blanco sobre él 4,02:1: es el más saturado y el de menor contraste de todos los medidos (Apple usa `#0071e3`, más oscuro, y solo en botones). Estados ok/aviso/peligro: verde, ámbar y rojo APAGADOS (Superhuman `#148072`/`#dfad0d`/`#cd0037`; Wise `#054d28`/`#ffd11a`/`#cb272f`), nunca del tono del acento.
5. **Sombras casi invisibles y a menudo teñidas.** La sombra más frecuente es de 2–10 % de opacidad: Vercel `0 1px 2px #0000000a` (4 %), Notion `0 .7px 1.46px #00000004, 0 3px 9px #00000008`, Linear `0 1px 4px -1px #00000017` (9 %), Brex `0 1px 1px rgba(0,0,0,.04)`, Craft cuatro capas de 1–8 %. Cuando es más fuerte, va teñida de la tinta: Stripe `rgba(50,50,93,.25)`, Attio `#1c28402e`, Clerk `#21212626`. Apple directamente no usa sombra (`none` ×50). Los sitios oscuros sustituyen la sombra por un FILO DE LUZ (`inset 0 1px #ffffff1a`, Raycast ×23; `inset 0 0 12px #ffffff14`, Reflect).
6. **Radios: 6–12 px para controles y tarjetas, píldora para botones; el lujo de moda va a 0–2 px.** 6 px (Vercel, Stripe, Linear), 8 px (Linear ×37, Superhuman 2x), 10 px (Wise, Craft, Porsche), 12 px (Linear tarjeta, Brex ×26, Family, Vercel); píldora 980–9999 px (Apple, Linear, Vercel, Wise). Hermès 0, B&O 1–2 px, Teenage 0.
7. **Tipografía: una sans neutra con pesos intermedios y tracking negativo en titulares, positivo en versales.** Inter o derivadas en 9 sitios; Geist, SF Pro, Söhne, propias en el resto. Peso del cuerpo 400–460; el «medium» real es 500–550 (Vercel 550, Linear 510, Superhuman 540); «bold» de titulares 590–600, casi nunca 700. Cuerpo 14–17 px (Apple 17, Family 15/17, Linear 15, Vercel 14/16, Raycast 14). Titulares 28–48 px en producto (72 px en marketing) con −.02 a −.04em (Apple −.022, Linear −.022, Vercel −.02/−.04, Craft −.02/−.03/−.04, Clerk −.035, Brex −.32…−.96 px). Versales pequeñas con +.01 a +.1em (Apple +.011, Mercury +.005…+.03, B&O +2 px, Hermès +1 px). Serif de display en seis (Mercury, Attio, Brex, Resend, Craft, Robinhood).
8. **Claro por defecto en producto; oscuro en herramientas de desarrollador.** Oscuro por defecto: Linear, Raycast, Reflect, Robinhood, Resend (hero). Claro: las otras 21. Cinco resuelven ambos con `light-dark()` o tokens (Porsche, Superhuman, Vercel, Linear, Revolut).
9. **Aire.** Las tarjetas «caras» tienen padding ≥ 24 px y titulares de sección de 21–28 px; el color se reserva a menos del 2 % de las apariciones (Linear: 3 de ~600 hex son de marca; Cash: 5 de ~400).

### 6.4. Tres candidatas de paleta para Detekta

Requisitos duros comprobados con el script del final: tinta 1 sobre fondo ≥ 7:1, tinta 2 y 3 ≥ 4,5:1, acento sobre fondo ≥ 3:1, tinta sobre acento ≥ 4,5:1, estados ≥ 3:1 (todos quedaron entre 4,6 y 5,8:1 en claro, es decir sirven también como TEXTO). Los verdes/ámbar/rojos de estado son apagados y de tonos alejados del acento en las tres, para que el semáforo del veredicto sea la única nota de color que compite con nada.

#### A · «Lino y tinta» (RECOMENDADA)

Linaje medido: Superhuman (`#fcfaf7`/`#141413`), Hermès (`#f6f1eb`/negro), Notion (`#f6f5f4`/`#37352f`), B&O (`#191817`), Craft (`#fcf9f7`/`#030302`), Family (`#fbfaf9`/`#343433`), con el botón-tinta de Vercel/Attio/Teenage.

| Papel | Claro | Contraste (claro) | Oscuro | Contraste (oscuro) |
|---|---|---|---|---|
| Fondo de página | `#f6f4f0` | — | `#121110` | — |
| Superficie (tarjeta) | `#ffffff` | 1,05:1 vs fondo | `#1b1a18` | — |
| Superficie hundida | `#efece6` | 1,18:1 vs superficie | `#0c0b0a` | 1,13:1 |
| Tinta 1 | `#1a1916` | **16,00:1** fondo · 17,58:1 superficie | `#f3f0ea` | 16,58:1 · 15,29:1 |
| Tinta 2 | `#5c5952` | **6,36:1** · 6,99:1 | `#b1ada4` | 8,43:1 · 7,77:1 |
| Tinta 3 | `#6f6b62` | **4,83:1** · 5,31:1 | `#8a867e` | 5,20:1 · 4,80:1 |
| Borde | `#e3dfd7` | 1,21:1 vs fondo | `#2a2926` | 1,30:1 |
| Acento (botón principal, selección) | `#1a1916` (la tinta) | **16,00:1** | `#f3f0ea` | 16,58:1 |
| Acento hover | `#000000` | 21,00:1 blanco sobre él | `#ffffff` | 18,86:1 |
| Tinta sobre acento | `#ffffff` | **17,58:1** | `#121110` | 16,58:1 |
| Enlace / pestaña activa (acento secundario, azul tinta) | `#2b3f6b` | **9,44:1** · 10,37:1 | `#9db3e8` | 9,02:1 · 8,32:1 |
| Ok | `#2e7a4b` | 4,78:1 · 5,25:1 | `#5fc98a` | 9,17:1 |
| Aviso | `#9a5b0f` | 4,93:1 · 5,42:1 | `#e4a84a` | 8,98:1 |
| Peligro | `#b8372f` | 5,27:1 · 5,79:1 | `#f07a72` | 6,94:1 |

Por qué se ve cara: es exactamente el patrón que comparten las páginas de lujo medidas: fondo de lino apenas cálido (no blanco de pantalla ni gris de iOS), tinta casi negra y cálida (`#1a1916` está a un paso de `#191817` de B&O y de `#141413` de Superhuman) con 16:1 de contraste, y **ningún color de marca**: el botón principal es la tinta, como en Vercel, Attio, Hermès, Teenage, Craft y Notion. En Detekta eso tiene una ventaja de producto: el único color de la pantalla pasa a ser el veredicto (verde, ámbar, rojo), así que el color SIGNIFICA algo y no decora. Es también el cambio más total respecto a hoy (gris frío + azul iOS saturado). El «azul tinta» `#2b3f6b` (linaje Stripe `#1a2c44`) queda para enlaces y pestaña activa: lee como tinta, no como acento de app. Sombras: anillo `0 0 0 1px rgba(26,25,22,.06)` y, si algo flota, `0 1px 2px rgba(26,25,22,.04), 0 8px 24px rgba(26,25,22,.06)` (teñidas de la tinta, como Clerk/Attio). Radios 10 px tarjeta, 8 px control, píldora botón.

#### B · «Marino y cobalto»

Linaje medido: Stripe (`#1a2c44` de tinta, `#f6f9fc` de fondo, sombras teñidas de marino), Mercury (`#5266eb`, `#535461`), Attio (`#266df0`, negros azulados).

| Papel | Claro | Contraste (claro) | Oscuro | Contraste (oscuro) |
|---|---|---|---|---|
| Fondo | `#f5f7fa` | — | `#0b1220` | — |
| Superficie | `#ffffff` | — | `#131c2e` | — |
| Hundida | `#eceff4` | 1,15:1 | `#070c16` | 1,15:1 |
| Tinta 1 | `#101b30` | **16,02:1** · 17,19:1 | `#eef2f8` | 16,67:1 · 15,16:1 |
| Tinta 2 | `#4f5f78` | **6,04:1** · 6,48:1 | `#a3aec2` | 8,37:1 · 7,61:1 |
| Tinta 3 | `#64728a` | **4,53:1** · 4,87:1 | `#7a8aa3` | 5,34:1 · 4,86:1 |
| Borde | `#dbe1ea` | 1,23:1 | `#233047` | 1,41:1 |
| Acento | `#2d4fc2` | **6,50:1** · 6,98:1 | `#8fa4ff` | 7,95:1 · 7,23:1 |
| Acento hover | `#2340a3` | 9,00:1 blanco sobre él | `#a8b8ff` | 9,78:1 |
| Tinta sobre acento | `#ffffff` | **6,98:1** | `#0b1220` | 7,95:1 |
| Ok | `#1f7a4a` | 4,97:1 · 5,33:1 | `#5ccd8b` | 9,42:1 |
| Aviso | `#9b5a0c` | 5,07:1 · 5,44:1 | `#e8ac4e` | 9,31:1 |
| Peligro | `#bf3a31` | 5,06:1 · 5,43:1 | `#f27d75` | 7,10:1 |

Por qué se ve cara: es la paleta de la banca y las finanzas de diseño (Stripe, Mercury, Brex): no hay negro, la tinta es un marino profundo y todos los grises llevan ese mismo pigmento, así que la pantalla parece hecha de un solo material. El cobalto `#2d4fc2` es un azul de sello, más oscuro y menos saturado que el `#007aff` de iOS (6,5:1 frente a 3,7:1 sobre el fondo), y el blanco sobre él llega a 7:1 en vez de 4:1. Riesgo: el verde «ok» y el azul del acento conviven bien, pero la pantalla sigue teniendo «un azul», y el dueño pidió cambio total. Sombras teñidas: `0 1px 2px rgba(16,27,48,.06), 0 8px 24px rgba(16,27,48,.08)`.

#### C · «Grafito e índigo»

Linaje medido: Linear (`#282a30` / `#5e6ad2`), Clerk (`#212126` / `#6c47ff`), Superhuman (`#714cb6`), Raycast en oscuro.

| Papel | Claro | Contraste (claro) | Oscuro | Contraste (oscuro) |
|---|---|---|---|---|
| Fondo | `#f7f7f8` | — | `#0f0f12` | — |
| Superficie | `#ffffff` | — | `#17171b` | — |
| Hundida | `#efeff1` | 1,15:1 | `#09090b` | 1,11:1 |
| Tinta 1 | `#17171c` | **16,68:1** · 17,86:1 | `#f3f3f5` | 17,27:1 · 16,13:1 |
| Tinta 2 | `#5c5c66` | **6,17:1** · 6,61:1 | `#aaaab3` | 8,30:1 · 7,75:1 |
| Tinta 3 | `#6e6e79` | **4,70:1** · 5,04:1 | `#86868f` | 5,30:1 · 4,95:1 |
| Borde | `#dfdfe5` | 1,24:1 | `#28282e` | 1,31:1 |
| Acento | `#4f52c4` | **5,88:1** · 6,29:1 | `#9396f7` | 7,24:1 · 6,76:1 |
| Acento hover | `#4043a8` | 8,12:1 blanco sobre él | `#adb0ff` | 9,51:1 |
| Tinta sobre acento | `#ffffff` | **6,29:1** | `#0f0f12` | 7,24:1 |
| Ok | `#22803f` | 4,64:1 · 4,97:1 | `#5dcb85` | 9,43:1 |
| Aviso | `#9a5b0f` | 5,06:1 · 5,42:1 | `#e6aa4c` | 9,31:1 |
| Peligro | `#c0392b` | 5,08:1 · 5,44:1 | `#f37f77` | 7,39:1 |

Por qué se ve cara: es el «lujo de software» (Linear, Clerk, Superhuman): grafito neutro con un índigo desaturado que no existe en ningún sistema operativo, así que no parece «la app del teléfono». El índigo no se confunde ni con el verde ni con el rojo del veredicto, y en oscuro (`#9396f7` sobre `#0f0f12`) es la versión que mejor rinde de las tres. Riesgo: es la estética de herramienta para desarrolladores; para un contratista de obra civil puede leerse como «app de tecnología» más que como «despacho serio».

### Recomendación

**A · «Lino y tinta».** Es la que reproduce el patrón mayoritario de los sitios medidos que se ven caros (fondo cálido, casi-negro cálido, sin color de marca, botón = tinta), es el cambio más total respecto a la piel actual, y en Detekta convierte el color en información: lo único cromático que queda en pantalla es el semáforo del veredicto y los avisos. Si el dueño quiere de todos modos «un color», la salida es B (marino y cobalto), no C: B se parece a un banco y C a un editor de código. En cualquiera de las tres, la tipografía que las acompaña según lo medido es: sans del sistema o Inter, cuerpo 15–17 px con tracking −.011em, peso 500 para etiquetas, titulares 21–28 px en peso 600 con −.022em, cifras en `tabular-nums`, versales pequeñas de 12 px con +.04em; sombras a ≤ 8 % teñidas de la tinta, radios 8–10 px, botón píldora.

### 6.5. Script de contraste (Node, sin dependencias)

Ejecutar con `node contraste.js`; imprime cada par con su razón y «ok/FALLA» contra el mínimo, y además el contraste de los sitios medidos.

```js
// Contraste WCAG 2.x (luminancia relativa sRGB) para las tres candidatas de Detekta.
const lum = (hex) => { const h = hex.replace('#', ''); const c = [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16) / 255).map(v => v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
const ratio = (a, b) => { const [l1, l2] = [lum(a), lum(b)].sort((x, y) => y - x); return (l1 + 0.05) / (l2 + 0.05); };
const r = (a, b) => ratio(a, b).toFixed(2);
const P = {
  'A · Lino y tinta (claro)': { fondo: '#f6f4f0', superficie: '#ffffff', hundida: '#efece6', tinta1: '#1a1916', tinta2: '#5c5952', tinta3: '#6f6b62', borde: '#e3dfd7', acento: '#1a1916', acentoHover: '#000000', tintaSobreAcento: '#ffffff', enlace: '#2b3f6b', ok: '#2e7a4b', aviso: '#9a5b0f', peligro: '#b8372f' },
  'A · Lino y tinta (oscuro)': { fondo: '#121110', superficie: '#1b1a18', hundida: '#0c0b0a', tinta1: '#f3f0ea', tinta2: '#b1ada4', tinta3: '#8a867e', borde: '#2a2926', acento: '#f3f0ea', acentoHover: '#ffffff', tintaSobreAcento: '#121110', enlace: '#9db3e8', ok: '#5fc98a', aviso: '#e4a84a', peligro: '#f07a72' },
  'B · Marino y cobalto (claro)': { fondo: '#f5f7fa', superficie: '#ffffff', hundida: '#eceff4', tinta1: '#101b30', tinta2: '#4f5f78', tinta3: '#64728a', borde: '#dbe1ea', acento: '#2d4fc2', acentoHover: '#2340a3', tintaSobreAcento: '#ffffff', ok: '#1f7a4a', aviso: '#9b5a0c', peligro: '#bf3a31' },
  'B · Marino y cobalto (oscuro)': { fondo: '#0b1220', superficie: '#131c2e', hundida: '#070c16', tinta1: '#eef2f8', tinta2: '#a3aec2', tinta3: '#7a8aa3', borde: '#233047', acento: '#8fa4ff', acentoHover: '#a8b8ff', tintaSobreAcento: '#0b1220', ok: '#5ccd8b', aviso: '#e8ac4e', peligro: '#f27d75' },
  'C · Grafito e índigo (claro)': { fondo: '#f7f7f8', superficie: '#ffffff', hundida: '#efeff1', tinta1: '#17171c', tinta2: '#5c5c66', tinta3: '#6e6e79', borde: '#dfdfe5', acento: '#4f52c4', acentoHover: '#4043a8', tintaSobreAcento: '#ffffff', ok: '#22803f', aviso: '#9a5b0f', peligro: '#c0392b' },
  'C · Grafito e índigo (oscuro)': { fondo: '#0f0f12', superficie: '#17171b', hundida: '#09090b', tinta1: '#f3f3f5', tinta2: '#aaaab3', tinta3: '#86868f', borde: '#28282e', acento: '#9396f7', acentoHover: '#adb0ff', tintaSobreAcento: '#0f0f12', ok: '#5dcb85', aviso: '#e6aa4c', peligro: '#f37f77' },
};
const req = (v, min) => (v >= min ? 'ok' : 'FALLA');
for (const [nombre, p] of Object.entries(P)) {
  console.log('\n## ' + nombre);
  const f = p.fondo, s = p.superficie;
  const filas = [
    ['tinta1 / fondo', p.tinta1, f, 7], ['tinta1 / superficie', p.tinta1, s, 7],
    ['tinta2 / fondo', p.tinta2, f, 4.5], ['tinta2 / superficie', p.tinta2, s, 4.5],
    ['tinta3 / fondo', p.tinta3, f, 4.5], ['tinta3 / superficie', p.tinta3, s, 4.5],
    ['acento / fondo', p.acento, f, 3], ['acento / superficie', p.acento, s, 3],
    ['tintaSobreAcento / acento', p.tintaSobreAcento, p.acento, 4.5], ['tintaSobreAcento / acentoHover', p.tintaSobreAcento, p.acentoHover, 4.5],
    ['borde / fondo', p.borde, f, 1.2], ['hundida / superficie', p.hundida, s, 1.05],
    ['ok / fondo', p.ok, f, 3], ['aviso / fondo', p.aviso, f, 3], ['peligro / fondo', p.peligro, f, 3],
    ['ok / superficie', p.ok, s, 3], ['aviso / superficie', p.aviso, s, 3], ['peligro / superficie', p.peligro, s, 3],
  ];
  if (p.enlace) filas.push(['enlace / fondo', p.enlace, f, 4.5], ['enlace / superficie', p.enlace, s, 4.5]);
  for (const [n, a, b, min] of filas) { const v = ratio(a, b); console.log(`${n.padEnd(32)} ${a} sobre ${b}  ${v.toFixed(2)}:1  (mín ${min})  ${req(v, min)}`); }
}
// Medidos: lo que hacen los sitios reales
console.log('\n## Sitios medidos (tinta principal sobre fondo)');
const M = [['Apple #1d1d1f/#f5f5f7', '#1d1d1f', '#f5f5f7'], ['Apple secundaria #6e6e73/#f5f5f7', '#6e6e73', '#f5f5f7'], ['Apple terciaria #86868b/#fff', '#86868b', '#ffffff'], ['Linear claro #282a30/#fff', '#282a30', '#ffffff'], ['Linear sec #3c4149/#fff', '#3c4149', '#ffffff'], ['Linear ter #6f6e77/#fff', '#6f6e77', '#ffffff'], ['Linear oscuro #f7f8f8/#08090a', '#f7f8f8', '#08090a'], ['Linear oscuro sec #d0d6e0/#08090a', '#d0d6e0', '#08090a'], ['Linear acento #5e6ad2/#fff', '#5e6ad2', '#ffffff'], ['Vercel gray-1000 #171717/#fff', '#171717', '#ffffff'], ['Vercel gray-900 #4d4d4d/#fff', '#4d4d4d', '#ffffff'], ['Vercel azul #0070f3/#fff', '#0070f3', '#ffffff'], ['Superhuman #141413/#fcfaf7', '#141413', '#fcfaf7'], ['Superhuman sec #73716d/#fcfaf7', '#73716d', '#fcfaf7'], ['Superhuman acento #714cb6/#fcfaf7', '#714cb6', '#fcfaf7'], ['Mercury #1e1e2a/#fff', '#1e1e2a', '#ffffff'], ['Mercury sec #535461/#fff', '#535461', '#ffffff'], ['Mercury acento #5266eb/#fff', '#5266eb', '#ffffff'], ['Stripe #1a2c44/#fff', '#1a2c44', '#ffffff'], ['Stripe sec #64748d/#fff', '#64748d', '#ffffff'], ['Stripe acento #533afd/#fff', '#533afd', '#ffffff'], ['Notion #37352f/#fff', '#37352f', '#ffffff'], ['Notion sec #78736f/#fff', '#78736f', '#ffffff'], ['Attio #1c1d1f/#fafafb', '#1c1d1f', '#fafafb'], ['Attio sec #6f7988/#fafafb', '#6f7988', '#fafafb'], ['B&O #191817/#fafafa', '#191817', '#fafafa'], ['B&O sec #555555/#fafafa', '#555555', '#fafafa'], ['Hermes #000/#f6f1eb', '#000000', '#f6f1eb'], ['Hermes sec #696969/#f6f1eb', '#696969', '#f6f1eb'], ['Clerk #212126/#fff', '#212126', '#ffffff'], ['Clerk sec #747686/#fff', '#747686', '#ffffff'], ['Clerk acento #6c47ff/#fff', '#6c47ff', '#ffffff'], ['Wise #163300/#fff', '#163300', '#ffffff'], ['Wise sec #5d7079/#fff', '#5d7079', '#ffffff'], ['Family #343433/#fbfaf9', '#343433', '#fbfaf9'], ['Family sec #848281/#fbfaf9', '#848281', '#fbfaf9'], ['Family acento #1a88f8/#fff', '#1a88f8', '#ffffff'], ['Raycast #f4f4f6/#07080a', '#f4f4f6', '#07080a'], ['Raycast sec #c2c7ca/#07080a', '#c2c7ca', '#07080a'], ['Robinhood #ccff00/#000', '#ccff00', '#000000'], ['Detekta hoy #007aff/#f5f5f7', '#007aff', '#f5f5f7'], ['Blanco/#007aff', '#ffffff', '#007aff']];
for (const [n, a, b] of M) console.log(n.padEnd(40) + r(a, b) + ':1');
```


#### 7.7. Investigación de detalle de interacción (4-sep-2026)

Medido con `curl` (User-Agent de Chrome, 20 s) sobre el HTML, las hojas de estilo enlazadas y, donde
fue viable, los paquetes npm reales, de 21 sitios y sistemas de diseño. Los conteos son `grep | uniq -c`
sobre CSS real (HTML + hojas descargadas); los sitios que usan Tailwind inflan los conteos de `ease-out`
y compañía porque el nombre de la clase también aparece en el HTML: se advierte donde aplica. Todo lo que
no se midió aquí se marca como tal.

Descargas: todos respondieron 200. Excepciones: `emilkowal.ski/ui/building-a-button` no existe (404; se
usaron `7-practical-animation-tips`, `great-animations`, `building-a-toast-component`,
`you-dont-need-animations`, `building-a-drawer-component`); `cmdk.paco.me` redirige al repositorio de
GitHub (se leyeron sus `website/styles/cmdk/{vercel,raycast,linear}.scss` en raw.githubusercontent.com);
`m3.material.io`, `spectrum.adobe.com`, `primer.style/foundations/motion` y `polaris.shopify.com` son
SPA sin texto en el HTML: sus tablas salieron de los paquetes npm (`@material/web` tokens,
`@spectrum-css/tokens`, `@shopify/polaris-tokens`, `@carbon/motion`, `@primer/primitives`).

---

#### 7.1. Tabla de easing y duraciones por sitio

Formato: valor (apariciones) - dónde se usa. Fuente entre corchetes.

### Linear (linear.app, 54 hojas en static.linear.app/web/_next/static/css/)
Tokens declarados [`css/linear/*.css`]: `--ease-out-quad: cubic-bezier(.25,.46,.45,.94)` (el que usa
casi todo), `--ease-out-quint: cubic-bezier(.23,1,.32,1)`, `--ease-out-expo: cubic-bezier(.19,1,.22,1)`,
`--ease-in-out-quad: cubic-bezier(.455,.03,.515,.955)` y toda la familia Penner (quad/cubic/quart/quint/
expo/circ in/out/in-out). Velocidades: `--speed-quickTransition: .1s`, `--speed-regularTransition: .25s`,
`--speed-highlightFadeIn: 0s`, `--speed-highlightFadeOut: .15s`.
Duraciones medidas en `transition`/`animation`: `.16s` (el botón y casi todos los hovers), `.12s`
(iconos y enlaces del changelog), `.1s`/`80ms` (popups y menús contextuales), `.175s` (diálogo del
menú de comandos), `.18s` (menú de navegación), `.15s` (flechas), `.2s`/`.25s` (raros).
Literal del botón [`Button.dcAi4KbO.css`]: `transition: .16s var(--ease-out-quad);
transition-property: border, background-color, color, box-shadow, opacity, filter`.
Curvas literales: `cubic-bezier(.32,.72,0,1)` (2, hojas de carrusel), `cubic-bezier(.45,1.45,.8,1)` (1).

### Vercel + Geist (vercel.com, vercel.com/geist/*)
Tokens [`css/geist_button/0ggp-66pwlt2m.css`]: `--ds-motion-timing-swift: cubic-bezier(.175,.885,.32,1.1)`
(un ligero rebasamiento: termina en 1.1), `--ds-motion-popover-duration: .2s`,
`--ds-motion-overlay-duration: .3s`, `--ds-motion-overlay-scale: .96`, `--ease-out: cubic-bezier(0,0,.2,1)`,
`--ease-in-out: cubic-bezier(.4,0,.2,1)`, `--ease-in: cubic-bezier(.4,0,1,1)`.
Duraciones medidas (marketing + Geist): `.15s` (45 + 29: botones, campos), `.2s` (42 + 36: enlaces
`transition-colors`, popover), `.1s` (16 + 14: enlaces de nav, `duration-100` aparece 79 veces en `<a>`),
`.3s`, `.35s`/`.4s` (diálogos), `1.2s`/`1s` (marketing).
Curvas: `ease-out` 69, `ease-in-out` 47, `cubic-bezier(.4,0,.2,1)` 8+16, `cubic-bezier(.32,.72,0,1)`
4+7 (la curva de Vaul, para drawers), `cubic-bezier(.16,1,.3,1)` 3 (Radix), `cubic-bezier(.25,.57,.45,.94)`.
Clases del botón real de Geist [`geist_button.html`]: `transition-[border-color,background,color,transform,
box-shadow] duration-[time:150ms] ease-in-out`, `data-[focus]:transition-none`,
`data-[focus]:shadow-[var(--ds-focus-ring)]`.

### Raycast (raycast.com)
Duraciones: `.3s` 100, `.2s` 59, `.15s` 29, `.1s` 23, `.4s` 12. Curvas: `ease-in-out` 38, `ease-out` 20,
`cubic-bezier(.23,1,.32,1)` 21 (out-quint), `cubic-bezier(.4,0,.22,.96)` 10, `cubic-bezier(.16,1,.3,1)` 8,
`cubic-bezier(.215,.61,.355,1)` 9 (out-cubic), `cubic-bezier(.34,1.56,.64,1)` 2 (rebote, marketing),
y una `linear(...)` de 100 puntos que reproduce un muelle. Tarjetas: `transition: background-color .15s
ease-in-out`; enlaces `.3s`. [`css/raycast/*.css`]

### Stripe (stripe.com)
Curva de casa: `cubic-bezier(.25,1,.5,1)` 41 apariciones (out-quart suavizado). Botón
[`css/stripe/f5d7a...css`]: `.hds-button{transition: background-color .3s cubic-bezier(.25,1,.5,1),
color .3s ..., outline-color .3s ..., border .3s ...}`. Duraciones: `.3s` 50, `.5s` 14, `.15s` 10,
`.2s` 8. Otras: `cubic-bezier(.4,0,.2,1)` 8, `cubic-bezier(.33,1,.68,1)` 5, `cubic-bezier(.16,1,.3,1)` 4.

### Apple (apple.com: globalheader, localnav, home, footer)
Curvas: `cubic-bezier(.4,0,.6,1)` 78+44 (TODO el header y la cortina), `cubic-bezier(.28,.11,.32,1)` 8
(localnav: color, fondo y el subrayado de la pestaña actual), `cubic-bezier(.25,.1,.3,1)` 13 (bolsa),
`ease-in-out` 84 (galería), `ease` 18. Duraciones: `320ms` 73, `.24s` 66, `80ms` 35 (retardo base),
`250ms` 28, `.32s` 26, `20ms` 22 (paso de stagger), `.12s`, `140ms`, `.16s`.
Tokens: `--r-globalnav-search-base-duration: calc(.24s - 80ms)`, `--r-localnav-menu-link-transition-
duration: 320ms` con retardos escalonados 260..400 ms por `nth-child`. Botón `.button`: solo cambia
`background` en hover/active (`#0071e3 -> #0076DF -> #006EDB`), sin transform. [`css/apple/*.css`]

### Framer (framer.com)
Sitio generado; casi todo el movimiento está en JS. CSS: `750ms` 16 (appear), `transition: color .2s
cubic-bezier(.44,0,.56,1)`, `.15s`. Sin hover/active de botón en CSS. [`framer.html`]

### Family (family.co)
Botones y enlaces [`family.html`, styled-components]: `transition: 100ms ease; transition-property:
background, transform`, `transition: box-shadow 0.1s ease`, tarjeta `transition: 100ms ease;
transition-property: box-shadow, background`, chevron `transform 200ms ease`. Curva de marca:
`cubic-bezier(0.19,1,0.22,1)` 7 (out-expo). Duraciones: `200ms` 37, `100ms` 36, `220ms` 6, `180ms` 3.

### Arc (arc.net)
Botón principal `.c-bCeQxv{transition: transform 150ms ease, box-shadow 0.15s ease-out; will-change:
transform}`; `:hover,:focus{transform:scale(1.02)}`, `:active{transform:scale(0.98)}`. Botón secundario
`.c-bsQNRu` hover `scale(1.05)`, active `scale(1.00)`. Duraciones: `0.2s` 11, `150ms` 3, `0.1s` 3.
Solo `ease`/`ease-out`/`ease-in-out`. [`arc.html`, `css/arc/*.css`]

### GitHub + Primer (github.com, primer.style, @primer/css 21, @primer/primitives)
Curvas: `cubic-bezier(.33,1,.68,1)` 8+10 (out-cubic: diálogos), `cubic-bezier(.165,.84,.44,1)` 10
(out-quart), `cubic-bezier(.25,1,.5,1)` 2 (ActionList), `cubic-bezier(.11,0,.5,0)` (checkmark, in),
`cubic-bezier(.65,0,.35,1)` 2. Duraciones: `.2s` 27, `.25s` 17, `.12s` 8, `80ms` 6 (primer), `.16s`.
Tokens semánticos [`@primer/primitives dist/css/functional/motion/motion.css`]:
`--motion-duration-micro: var(--base-duration-100)`, `short: 200`, `medium: 300`, `long: 500`;
`--motion-easing-hover: ease`, `enter: easeOut`, `exit: easeIn`, `move: easeInOut`;
`--motion-transition-hover: micro hover`, `enter: medium enter`, `exit: short exit`,
`stateChange: short move`. Los valores base (`--base-duration-100 = 100ms`, etc.) y las curvas base
(`easeOut = cubic-bezier(0,0,.2,1)` según la documentación publicada de Primer) NO se midieron aquí:
el archivo `base/motion` no se descargó.
`.btn` de @primer/css [`primer_css.css`]: `:hover{transition-duration:.1s}` y `:active{transition:none}`
(el reposo no transiciona; el hover sí; el active es instantáneo). Primer React: UnderlineItem
`:hover{background-color: neutral-muted; transition: background-color .12s ease-out}`.

### shadcn/ui (ui.shadcn.com, Tailwind 4)
Tokens: `--default-transition-duration: .15s`, `--default-transition-timing-function:
cubic-bezier(.4,0,.2,1)`, `--ease-out: cubic-bezier(0,0,.2,1)`, `--animate-pulse: pulse 2s
cubic-bezier(.4,0,.6,1) infinite`. Duraciones: `.15s` 24, `.4s` 8, `.3s` 8, `.2s` 8. Curvas literales:
`cubic-bezier(.22,1,.36,1)` 3, `cubic-bezier(.32,.72,0,1)` 2 (drawer), `cubic-bezier(.23,1,.32,1)` 2.
`.animate-in{animation: enter var(--tw-duration,.15s) var(--tw-ease,ease)}`; `zoom-in-95`, `fade-in-0`.

### Radix Themes (radix-ui.com/themes, `css/radix/f226671f.css`, 685 KB)
Curva de casa: `cubic-bezier(.16,1,.3,1)` 12 (out-expo suave): popovers, tooltips, diálogos.
`cubic-bezier(.445,.05,.55,.95)` (in-out-sine): control segmentado y pulgar del switch.
`cubic-bezier(.87,0,.13,1)` 3. Duraciones: `.12s` 16 (tarjetas), `40ms` 12 (hover/active de tarjeta
clásica), `.1s` 11 (control segmentado, cierre de popover), `.14s` 9 (tooltip, switch), `.16s` 5
(apertura de popover), `.2s` (diálogo), `30ms`, `60ms`, `80ms`.

### Sonner (sonner.emilkowal.ski, `sonner@2/dist/styles.css`, `index.mjs`)
`[data-sonner-toast]{transition: transform 400ms, opacity 400ms, height 400ms, box-shadow 200ms}`
(curva por defecto `ease`), hijos `opacity 400ms`, salida `transform 500ms, opacity 200ms`, swipe-out
`.2s ease-out`, icono de promesa `sonner-fade-in 300ms ease`. Constantes: `TOAST_LIFETIME = 4000`,
`VISIBLE_TOASTS_AMOUNT = 3`, `GAP = 14`, `TOAST_WIDTH = 356`, `VIEWPORT_OFFSET = '24px'`,
`MOBILE_VIEWPORT_OFFSET = '16px'`, `SWIPE_THRESHOLD = 45`, `TIME_BEFORE_UNMOUNT = 200`.

### Vaul (vaul.emilkowal.ski, `vaul@1/dist/index.mjs`)
`TRANSITIONS = {DURATION: 0.5, EASE: [0.32, 0.72, 0, 1]}` -> `cubic-bezier(.32,.72,0,1)`;
`CLOSE_THRESHOLD = 0.25`, `VELOCITY_THRESHOLD = 0.4`, `BORDER_RADIUS = 8`, `WINDOW_TOP_OFFSET = 26`,
`NESTED_DISPLACEMENT = 16`; fondo escalado `scale(...) translate3d(0, calc(env(safe-area-inset-top) +
14px), 0)`. Es la misma curva que Vercel y shadcn usan para drawers.

### cmdk (repositorio pacocoursey/cmdk, `website/styles/cmdk/*.scss`)
`[cmdk-item]{transition: all 150ms ease; transition-property: none; &[data-selected='true']{background:
var(--gray4)} &:active{transition-property: background; background: var(--gray4)}}`,
`[cmdk-root]{transition: transform 100ms ease}`. La selección por teclado NO transiciona (property
none); solo el `:active` con ratón lo hace.

### Emil Kowalski (emilkowal.ski)
Su sitio: `cubic-bezier(.25,.46,.45,.94)` 8 (out-quad, el mismo de Linear), `cubic-bezier(.19,1,.22,1)`
4, `.2s` 24, `.15s` 16, `.4s` 12. Ejemplo «hold to delete»: `transition: transform .16s
cubic-bezier(.25,.46,.45,.94)`, `:active{transform:scale(.97)}`.

### Rauno (rauno.me/craft/interaction-design)
`cubic-bezier(.2,.8,.2,1)`, `250ms` 2, `150ms` 2, `100ms` 2, `200ms` 1; foco `outline: 2px solid
var(--colors-focus); outline-offset: var(--outline-offset)`; lista `li:hover, li[data-active=true]
{background: gray5}`.

### Material 3 (`@material/web@2.3.0/tokens/v0_192/_md-sys-motion.scss`)
Duraciones: short1 50, short2 100, short3 150, short4 200, medium1 250, medium2 300, medium3 350,
medium4 400, long1 450, long2 500, long3 550, long4 600, extra-long1..4 700/800/900/1000 ms.
Curvas: `standard: cubic-bezier(.2,0,0,1)`, `standard-decelerate: cubic-bezier(0,0,0,1)`,
`standard-accelerate: cubic-bezier(.3,0,1,1)`, `emphasized: cubic-bezier(.2,0,0,1)` (en la web, la
versión completa es una `path()`), `emphasized-decelerate: cubic-bezier(.05,.7,.1,1)`,
`emphasized-accelerate: cubic-bezier(.3,0,.8,.15)`, `legacy: cubic-bezier(.4,0,.2,1)`. La regla
publicada «emphasized 500 ms / standard 300 ms» viene de la página, que aquí no devolvió texto (SPA):
no medido aquí.

### Carbon (carbondesignsystem.com/elements/motion/overview + `@carbon/motion`)
Texto medido de la página: `duration-fast-01 70ms` (botón, toggle), `fast-02 110ms` (fade),
`moderate-01 150ms` (expansión pequeña), `moderate-02 240ms` (expansión, toast), `slow-01 400ms`
(expansión grande), `slow-02 700ms` (oscurecer fondo). Curvas: productivo standard
`cubic-bezier(.2,0,.38,.9)`, entrance `cubic-bezier(0,0,.38,.9)`, exit `cubic-bezier(.2,0,1,.9)`;
expresivo standard `cubic-bezier(.4,.14,.3,1)`, entrance `cubic-bezier(0,0,.3,1)`, exit
`cubic-bezier(.4,.14,1,1)`. Lista de comprobación textual: «¿Las microinteracciones usan ease-out en la
entrada del usuario? ¿Caen en una duración estática de 90-120 ms?». En su CSS real: `.1s` 295,
`.11s` 119, `70ms` 93, `.15s` 40, `.24s` 24; `cubic-bezier(.2,0,.38,.9)` 153.

### Atlassian (atlassian.design/foundations/motion, texto medido)
«Interactions (50-150 ms): hover y press. List item hover, 50 ms.» «Transitions (150-400 ms): entrar,
salir, moverse. Dropdown entrance 150 ms, modal entrance 250 ms.» Curvas: ease-out bold
`cubic-bezier(0,.4,0,1)` (panel, flag entrando), ease-in-out bold `cubic-bezier(.4,0,0,1)` (escalar
modales), ease-in practical `cubic-bezier(.6,0,.8,.6)` (salidas), ease-out practical
`cubic-bezier(.4,1,.6,1)` (popup, fondo de hover). «Si alguien dispara este movimiento docenas de veces
al día, manténlo por debajo de 150 ms.» «Las salidas más rápidas que las entradas.» «Un solo punto
focal: cuando varios elementos deben animarse, uno lidera y los otros acompañan.» «Con reduced motion
activo, el movimiento está apagado e instantáneo.» En su CSS: `0.2s` 22, `.15s` 4, `50ms` 3, `250ms` 3.

### Polaris (`@shopify/polaris-tokens/dist/css/styles.css`)
`--p-motion-duration-0/50/100/150/200/250/300/350/400/450/500/5000`; `--p-motion-ease:
cubic-bezier(.25,.1,.25,1)`, `ease-in: cubic-bezier(.42,0,1,1)`, `ease-out: cubic-bezier(.19,.91,.38,1)`,
`ease-in-out: cubic-bezier(.42,0,.58,1)`, `linear`. Keyframes `appear-above` (`translateY(space-100)
+ opacity 0 -> none/1`), `fade-in`, `pulse`, `bounce` (`scale(1) -> .85 -> 1`).

### Spectrum (`@spectrum-css/tokens/dist/css/global-vars.css`)
`--spectrum-animation-duration-100: 130ms`, `200: 160ms`, `300: 190ms`, `400: 220ms`, `500: 250ms`,
`600: 300ms`, `700: 350ms`, `800: 400ms`, `900: 450ms`, `1000: 500ms`, `2000: 1000ms`. Curvas:
`ease-in-out: cubic-bezier(.45,0,.4,1)`, `ease-in: cubic-bezier(.5,0,1,1)`, `ease-out:
cubic-bezier(0,0,.4,1)`. Foco: `--spectrum-focus-indicator-thickness: 2px`, `gap: 2px`, color blue-800.
En su CSS real `.13s` domina (22).

### Apple HIG, Motion (developer.apple.com/tutorials/data/.../motion.json, texto medido)
Sin cifras. Reglas: «añade movimiento con propósito; hazlo opcional; brevedad y precisión en la
retroalimentación; en apps, evita añadir movimiento a interacciones que ocurren con frecuencia; deja
que la gente cancele el movimiento; no hagas esperar a que termine una animación».

---

#### 7.2. Catálogo de micro-interacciones medidas (CSS literal y fuente)

#### 2.1 Botón
- Linear [`Button.dcAi4KbO.css`]: `transition: .16s cubic-bezier(.25,.46,.45,.94); transition-property:
  border, background-color, color, box-shadow, opacity, filter`. Hover primario `filter:
  brightness(115%)`; active de TODAS las variantes `transform: scale(.97)` (primario además
  `brightness(98%)`), `will-change: transform` solo en `:active`. `transform` NO está en la lista de
  transición: el encogido es instantáneo, la vuelta también.
- Emil [`7-practical-animation-tips`]: «Un scale de 0.97 en :active basta»; su demo: `transition:
  transform .16s cubic-bezier(.25,.46,.45,.94)`.
- Vercel/Geist [`geist_button.html`]: `duration-[time:150ms] ease-in-out` sobre `border-color,
  background, color, transform, box-shadow`; hover cambia fondo (`--themed-hover-bg`); foco
  `shadow-[var(--ds-focus-ring)]` con `transition-none` (el anillo aparece de golpe); disabled
  `cursor-not-allowed` + gris + `shadow-[0_0_0_1px ...]`. Sin scale.
- Raycast [`Button-module`]: reposo `box-shadow: inset 0 1px #ffffff0d, 0 0 0 1px #ffffff40, inset 0 -1px
  #0003`; hover `0 0 0 1px #ffffff80`; active `0 0 0 1px #ffffff26` (el borde se APAGA al pulsar);
  focus `0 0 0 2px #ffffff80`; `disabled:active{transform:none}`. Tarjetas: `:has(:active)
  {transform: scale(.98)}`.
- Arc [`arc.html`]: `transition: transform 150ms ease, box-shadow .15s ease-out; will-change:
  transform`; hover `scale(1.02)`, active `scale(0.98)`.
- Family [`family.html`]: `transition: 100ms ease; transition-property: background, transform`; hover
  `scale(1.02)`; active `transform: none` (vuelve al tamaño de reposo, no por debajo).
- Apple [`css/apple/*.css`]: `.button:hover{background: #0076DF}`, `:active{background: #006EDB;
  outline: none}`. Tres tonos, ningún transform.
- Stripe [`hds-button`]: `transition: background-color .3s cubic-bezier(.25,1,.5,1), color .3s ...`;
  hover solo cambia `background-color`.
- GitHub @primer/css [`primer_css.css`]: `.btn:hover{transition-duration: .1s}`,
  `.btn:active{transition: none}` (el active es instantáneo).
- Radix Themes [`f226671f.css`]: hover/active cambian solo el fondo por escala alfa (`accent-a3 ->
  a4` ghost, `a4 -> a5` soft, `a2 -> a3` outline); sólido `accent-9 -> 10 + filter`; clásico
  `:active{outline: .5em solid var(--accent-a4)}` y un `--base-button-classic-active-padding-top: 2px`
  (el texto baja 1-2 px: efecto de tecla física).
- shadcn [`shadcn.html`]: `transition-all` (150 ms), `hover:bg-primary/80`,
  `active:not-aria-[haspopup]:translate-y-px` (baja 1 px al pulsar), `focus-visible:border-ring
  focus-visible:ring-3 focus-visible:ring-ring/50`, `disabled:opacity-50 disabled:pointer-events-none`,
  `select-none`.
- Sonner [`styles.css`]: `.toast-button:active{scale .98}`; el botón del toast `focus-visible
  {box-shadow: 0 0 0 2px rgba(0,0,0,.4)}`.

#### 2.2 Campo de texto
- Stripe: `:where(.hds-input-group):not([aria-invalid=true]):focus-within{border-color: input-border-
  selected; outline: var(--hds-space-input-focus-shadowOuter) solid var(--hds-color-action-focus-
  outerSubdued)}`; inválido `outline ... outerError (#d8280f80); border-color: errorFocus`. El input
  interior lleva `outline: none`; el anillo lo pinta el GRUPO.
- Radix: `.rt-TextAreaRoot:where(:focus-within){outline: 2px solid var(--focus-8); outline-offset: -1px}`;
  campo con autocompletado `background-image: linear-gradient(var(--focus-a2), var(--focus-a2));
  box-shadow: inset 0 0 0 1px var(--focus-a5)`.
- shadcn input: `transition-[color,box-shadow] duration-200`, `focus-visible:border-ring
  focus-visible:ring-3 focus-visible:ring-ring/30`, `aria-invalid:border-destructive aria-invalid:ring-3
  aria-invalid:ring-destructive/20`.
- GitHub @primer/css: `.form-control:focus-visible{border-color: accent; outline: none; box-shadow:
  inset 0 0 0 1px accent}` y `:focus:not(:focus-visible){box-shadow: inset 0 0 0 1px transparent}`.
- Geist: `._2ZhahW_phone._2ZhahW_error:focus-within{box-shadow: 0 0 0 1px var(--ds-red-900), 0 0 0 4px
  var(--ds-red-300)}`; `[data-geist-input-wrapper]:not(:focus-within)` sombra de 2 px.
- Linear: `.wOrUyW_input:focus-visible{outline: none}` (el campo del menú de comandos no muestra
  anillo: el contenedor ya es el foco visible).

#### 2.3 Pestaña y control segmentado
- Radix SegmentedControl [`f226671f.css`]: el indicador es UN elemento absoluto detrás de los ítems:
  `.rt-SegmentedControlIndicator{z-index:-1; pointer-events:none; height:100%; transition-property:
  transform; transition-timing-function: cubic-bezier(.445,.05,.55,.95); transition-duration:
  var(--segmented-control-transition-duration) /* .1s */; position:absolute; top:0; left:0}`;
  anchura por número de hijos (`:nth-child(3){width:50%}` ... `:nth-child(11){width:10%}`); posición
  `:where(.rt-SegmentedControlItem[data-state=on]:nth-child(2))~.rt-SegmentedControlIndicator
  {transform: translate(100%)}`; `:before{inset:1px; border-radius: max(.5px, calc(radius - 1px));
  background: indicator-background}`. Las etiquetas activa/inactiva son DOS capas superpuestas
  (`LabelActive` medium `opacity 0 -> 1` ease-out; `LabelInactive` regular `1 -> 0` ease-in) con
  `transition: opacity calc(.8 * duración)`, y `letter-spacing`/`word-spacing` compensados para que el
  peso no mueva el ancho. Separadores `opacity 0` junto al activo o al foco. Foco `outline: 2px solid
  var(--focus-8); outline-offset: -1px`.
- Apple localnav [`ac-localnav.built.css`]: `.ac-ln-menu-link.current::after{transition: bottom .24s
  cubic-bezier(.28,.11,.32,1)}` (el subrayado se desliza).
- Geist Tabs [`geist_tabs.html`]: `border-b-2 border-transparent aria-selected:border-gray-1000
  aria-selected:text-gray-1000 not-disabled:hover:text-gray-1000`, lista `shadow-[0_-1px_0_var(--
  accents-2)_inset]`, `focus-visible:data-[show-focus-ring=true]:shadow-[var(--ds-focus-ring)]`;
  variante secundaria `h-8 px-3 rounded-md aria-selected:bg-gray-200`. Sin transición declarada.
  Texto de Geist: «Seleccionar una pestaña es instantáneo; no dispares confirmación de red ni toast al
  cambiar. Refleja la pestaña activa en la URL. Mantén el anillo de foco visible en la pestaña activa».
- Primer UnderlineItem: `:after{height:2px; background: transparent}`, `[aria-selected=true]:after
  {background-color: var(--underlineNav-borderColor-active)}`, `[data-content]:before{content:
  attr(data-content); font-weight: 600; visibility: hidden; height: 0}` (reserva el ancho del texto en
  negrita para que activar no mueva el layout), `:hover{background: neutral-muted; transition:
  background-color .12s ease-out}`.
- Linear toggleGroup: `.SjJXIW_toggleGroupItem{transition: color .2s}`, `.SjJXIW_toggleGroupItemBg
  {background: bg-quaternary; border-radius:5px; position:absolute; inset:0}` (capa de fondo separada
  que se mueve por JS), `.SjJXIW_fadeIn{animation: .18s SjJXIW_fadeIn}`.
- Emil [`great-animations`]: la pestaña activa del dashboard de Vercel se animaba con «shared layout»
  y perdía frames al cargar la página; se pasó a CSS puro.

#### 2.4 Tarjeta y fila
- Radix Card clásica: `transition: box-shadow .12s`; `:hover`/`:active`/`[data-state=open]` cambian
  la sombra y bajan la duración a `40ms`; ghost `:hover{background: gray-a3}` `:active{gray-a4}`.
- Linear fila: `.RamgbG_row:after{content:""; opacity:0; background:#ffffff08; border-radius:8px;
  position:absolute; inset:0 8px}` `.RamgbG_row:hover:after{opacity:1}` (el hover de fila es un
  pseudo-elemento con margen de 8 px, no un fondo sobre la fila entera). Tarjetas de clientes
  `transition: filter .16s ease-out-quad`; enlaces `transition: filter .16s, transform .16s`.
- Vercel: `.[&_tr:hover]:bg-gray-100 tr:hover{background-color: var(--ds-gray-100)}`.
- GitHub ActionList: `:hover{background: control-transparent-bgColor-hover}`, `:active{...-active}`;
  `:hover:not([data-active],:focus-visible){box-shadow: inset 0 0 0 1px transparent; outline: 1px solid
  transparent}` (reserva el borde para que el foco no salte). Subgrupo `transition: opacity .16s
  cubic-bezier(.25,1,.5,1), transform .16s ...` bajo `prefers-reduced-motion: no-preference`.
- Raycast tarjeta: `transition: background-color .15s ease-in-out`, capa `:after{opacity:0; transition:
  opacity .15s ease-in-out}`, `cardWrapper:has(:active){transform: scale(.98)}`,
  `cardWrapper:has(:focus-within) .card{box-shadow: inset 0 0 0 2px #ffffff4d; outline:none}`.
- cmdk ítem: `[data-selected='true']{background: gray4}` sin transición; `:active{transition-property:
  background}`.
- Rauno: `li:hover, li[data-active="true"]{background: gray5; color: gray12}`.
- Arc: `.c-iTMVcO-hIuvwW-isHoverable-true:hover{background-color:#EBEBF2}`; tarjeta con sombra
  `:hover{box-shadow: 0 7px 15px rgba(0,0,0,.2)}`.
- Family tarjeta: `box-shadow: inset 0 0 0 1px var(--gray-light); transition: 100ms ease; transition-
  property: box-shadow, background` -> hover `background: beige; box-shadow: inset 0 0 0 0 beige`.

#### 2.5 Diálogo y hoja
- Radix: `.rt-BaseDialogContent[data-state=open]{animation: .2s cubic-bezier(.16,1,.3,1)
  rt-dialog-content-show}` con `@keyframes rt-dialog-content-show{0%{opacity:0; transform:
  translateY(5px) scale(.97)} to{opacity:1; transform: translateY(0) scale(1)}}`; cierre `.1s` con
  `rt-dialog-content-hide` (`to{opacity:0; transform: translateY(5px) scale(.99)}`); overlay `.2s
  rt-fade-in` / `.16s rt-fade-out`. Tooltip `.14s`, popover abierto `.16s` / cerrado `.1s`, con
  `rt-slide-from-*{0%{transform: translateY(4px) scale(.97)}}` + `rt-fade-in`, `transform-origin:
  var(--radix-*-transform-origin)`.
- Linear menú de comandos: `.wOrUyW_dialog{animation: wOrUyW_scaleIn .175s var(--ease-out-quad)}`,
  `@keyframes wOrUyW_scaleIn{0%{opacity:0; transform: translate(-50%) scale(.96)} to{... scale(1)}}`,
  cierre `scaleOut .175s`, overlay `fadeIn .175s`, `[data-bounce=true]{animation: .15s
  wOrUyW_dialogBounce}` (`50%{scale(.98)}`: el diálogo «rebota» cuando se pulsa Escape con algo
  pendiente). Popups: `transition: opacity 80ms, transform 80ms` con `transform-origin` del ancla;
  menú de navegación `.18s` `scaleIn` de `.98`.
- Vercel: `--ds-motion-overlay-scale: .96`, `cmdkScaleIn{0%{transform: scale(var(--ds-motion-overlay-
  scale)); opacity:0}}`, backdrop `transition: opacity var(--ds-motion-overlay-duration) /* .3s */
  var(--ds-motion-timing-swift)`; diálogo de marketing `dialog.geist-dialog[open]{animation: show .4s
  var(--dialog-open-cubic-bezier), content-fade-in .3s ease}` con `--translate-y-start: -40px`,
  `.modal[open]{animation-duration: .35s; timing cubic-bezier(.4,0,.2,1)}`, backdrop `touch-action:
  none; overscroll-behavior: none; background: #000000b3`.
- Raycast: `Dialog contentShow{0%{opacity:0; transform: translateY(-2%) scale(.96)}}`; AlertDialog
  `translate(-50%,-48%) scale(.96)` -> `(-50%,-50%) scale(1)`.
- Primer: `[data-position-regular=center]{animation: .2s cubic-bezier(.33,1,.68,1) 1ms scaleFade}`
  (`0%{opacity:0; transform: scale(.5)}`), hoja inferior `.25s slideUp` (`translateY(100%)`), lateral
  `.25s slideInRight`; todo bajo `prefers-reduced-motion: no-preference`.
- Vaul (hoja): `0.5s cubic-bezier(.32,.72,0,1)`, cierre por arrastre al 25 % o velocidad 0.4,
  fondo escalado con radio 8 px y 14 px de margen superior.
- Emil: «no animes desde scale(0); empieza en 0.9+ (usa 0.93)»; «haz los popovers conscientes del
  origen con transform-origin»; «180 ms se siente más rápido que 400 ms»; «tooltips: retardo la
  primera vez, sin retardo ni animación las siguientes (`&[data-instant]{transition-duration:0ms}`)».

#### 2.6 Toast
- Sonner [`styles.css`, `index.mjs`]: abajo a la derecha por defecto, `width 356px`, `offset 24px`
  (16 px en móvil), `gap 14px`, `3` visibles, vida `4000 ms`, desmontaje `200 ms` tras la salida.
  Entrada: `[data-sonner-toast]{--y: translateY(100%); opacity:0; transition: transform 400ms, opacity
  400ms, height 400ms, box-shadow 200ms}` -> `[data-mounted=true]{--y: translateY(0); opacity:1}`
  (transición, no keyframe: interrumpible y re-dirigible). Apilado: `[data-expanded=false][data-front=
  false]{--scale: var(--toasts-before) * 0.05 + 1; --y: translateY(calc(var(--lift-amount) *
  var(--toasts-before))) scale(calc(-1 * var(--scale))); height: var(--front-toast-height)}` y los
  hijos a `opacity 0`. Salida del frontal `translateY(calc(var(--lift) * -100%)); opacity:0`; de los
  traseros `translateY(40%); transition: transform 500ms, opacity 200ms`. Swipe: `SWIPE_THRESHOLD 45`
  o velocidad; `[data-swiping=true]{transition:none}`; salida `.2s ease-out forwards`. Foco
  `box-shadow: 0 4px 12px rgba(0,0,0,.1), 0 0 0 2px rgba(0,0,0,.2)`. `@media (prefers-reduced-motion)
  {[data-sonner-toast], [data-sonner-toast]>*, .sonner-loading-bar{transition:none!important;
  animation:none!important}}`. Emil: «usa `ease` en vez de ease-out y algo más lento de lo habitual
  para que se sienta elegante; los keyframes no se interrumpen, por eso son transiciones».
- Geist (texto): «los toasts se auto-descartan; `preserve` solo si el usuario debe leer o actuar;
  los snackbars con Deshacer duran 5-10 s con un único botón `Undo`; no encadenes toasts para narrar un
  flujo: uno al final; una frase, sentence case, sin punto final; `aria-live="polite"`».
- Carbon: toast = `moderate-02 240ms`, entrance `cubic-bezier(0,0,.38,.9)`, exit `cubic-bezier(.2,0,1,.9)`.

#### 2.7 Esqueleto de carga
- Geist [`geist_skeleton.html`]: `<span class="block rounded-[5px] relative overflow-hidden
  after:animate-loading-skeleton after:content-[''] after:absolute after:inset-0 after:right-[-200%]
  after:bg-gradient-to-r after:from-gray-100 after:via-gray-200 after:to-gray-100
  after:bg-[length:50%_100%] after:bg-[position:0_0]" data-geist-skeleton style="width:160px;
  min-height:24px">` con `--animate-loading-skeleton: loading-skeleton 1.5s ease-in-out infinite
  reverse` y `@keyframes loading-skeleton{to{transform: translate(-50%)}}`. Texto: «pon width y height
  iguales al contenido final para que no salte el layout; un bloque 200x20 que se vuelve un texto de
  80x16 se lee como un fallo; `aria-busy="true"` en la región y `aria-live="polite"` en el destino;
  respeta prefers-reduced-motion».
- GitHub [`github-*.css`]: `.Skeleton{color:#0000; background-color: bgColor-muted}`,
  `.Skeleton:after{content:""; background: linear-gradient(75deg, #0000 29%, #00000008 31%, #00000005
  70%, #0000 72%); width:300%; height:100%; animation: 1s -999999s infinite skeleton-loading; left:
  -100%}` con `@keyframes skeleton-loading{0%{transform: translate(-33%)} to{translate(33%)}}`
  (el retardo negativo enorme sincroniza todos los esqueletos de la página en la misma fase).
- Radix: `@keyframes rt-skeleton-pulse{0%{background-color: gray-a3} to{gray-a4}}` (pulso de color,
  sin brillo), `color:#0000; pointer-events:none; user-select:none; box-decoration-break: clone`.
- shadcn: `<div data-slot="skeleton" class="animate-pulse bg-muted h-8 w-24 rounded-lg">` con
  `pulse 2s cubic-bezier(.4,0,.6,1) infinite` (`50%{opacity:.5}`), y `.shimmer` apagado bajo
  reduced-motion (`background-image:none; animation:none`).
- Raycast: bloques planos `background: rgba(lines, .1); border-radius: 4px` sin animación.

#### 2.8 Lista con stagger
- Apple globalnav [`globalheader.css`]: `.globalnav-flyout-item{opacity:0; transform: translateY(-4px);
  transition: opacity .32s cubic-bezier(.4,0,.6,1) calc(var(--r-globalnav-flyout-item-number) * 20ms +
  (var(--r-globalnav-flyout-group-number,0) + 1) * 80ms), transform .32s ...}` (20 ms por ítem, 80 ms
  por grupo, 4 px de recorrido). Localnav móvil: retardos 260..400 ms por `nth-child` y duraciones
  320..400 ms.
- Linear: `.fFDhtq_inView .fFDhtq_dot{animation: fFDhtq_dotIn .42s ease-out-quad forwards;
  animation-delay: calc(var(--index) * 2ms)}`.
- Vercel: `--animation-delay: calc(var(--delay-step) * 2)`, cifras del hero con `animation-delay:
  calc(var(--animation-delay) + var(--animation-duration))`.
- GitHub: `transition-delay: calc(var(--headingReveal-staggerDelay)*N + .2s)`.
- Stripe: `animation-delay: calc(var(--reveal-delay) + .1s)`, `+ .2s` por `nth-child`.
- Ninguno de los productos (Linear app, Geist, Radix, cmdk) escalona listas de DATOS; el stagger vive
  en marketing y en menús de navegación.

#### 2.9 Foco
- Vercel: `--ds-focus-ring: 0 0 0 2px var(--ds-background-100), 0 0 0 4px var(--ds-focus-color)`
  (doble anillo: 2 px de fondo + 2 px de color = offset sin `outline-offset`), `--ds-focus-ring-
  outline: 2px solid var(--ds-focus-color)`; en `<a>`: `focus-visible:outline-2` 155 veces y
  `focus-visible:![box-shadow:var(--ds-focus-ring)]` 35; botones `focus-visible:shadow-focus-ring`.
- Linear: `:focus-visible{outline-style:solid; outline-color: var(--focus-ring-color); outline-width:
  var(--focus-ring-width); outline-offset: var(--focus-ring-offset)}` con `--focus-ring-width: 2px`
  (1 px en alguna hoja), `--focus-ring-offset: 2px`, `--focus-ring-color: var(--color-indigo)` /
  `#0006`; `:focus:not(:focus-visible){outline:none}`; enlaces `outline: 2px solid var(--color-accent);
  outline-offset: 2px`; filas `outline-offset: -2px; border-radius: 8px`.
- Apple: `:focus-visible{outline: 2px solid var(--sk-focus-color, #0071e3); outline-offset:
  var(--sk-focus-offset, 1px)}`, botones `offset 3px`.
- Radix: `outline: 2px solid var(--focus-8); outline-offset: -1px` (anillo hacia DENTRO en botones y
  segmentos), campos `focus-within` igual.
- Family: `a:focus-visible{outline: 2px solid var(--focus /* #848281 */); border-radius: 2px;
  padding: 0 2px; margin: 0 -2px; transition: none}` (el anillo no se anima y se ensancha el área).
- Arc: `a:focus-visible, button:focus-visible{outline-offset: 2px; box-shadow:none; outline: 2px solid
  var(--colors-gray7)}`; `:focus:not(:focus-visible){outline-style:none}`.
- Rauno: `outline: 2px solid var(--colors-focus); outline-offset: var(--outline-offset)`.
- Stripe: `--hds-focus-outline: 3px solid var(--hds-color-action-focus-outerSoft)`, `--hds-focus-
  outline-offset: 3px`, botones `offset 1px`.
- Atlassian: `outline: var(--ds-border-width-focused, 2px) solid var(--ds-border-focused, #2684FF);
  outline-offset: var(--ds-space-025, 2px)` y `@supports not selector(:focus-visible){a:focus{...}}`.
- Carbon: `outline: 2px solid var(--cds-focus, #0f62fe); outline-offset: 2px` (o `-2px` dentro);
  botón `box-shadow: inset 0 0 0 1px focus, inset 0 0 0 2px background`.
- Spectrum: `0 0 0 var(--spectrum-focus-ring-size) var(--spectrum-focus-ring-color)`, 2 px + 2 px.
- shadcn: `focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50` (3 px al 50 %).
- Sonner: `:focus-visible{outline-style:solid; outline-color: var(--focus-ring-color); ...}` y
  `:focus:not(:focus-visible){outline:none}`.
- Consenso medido: 2 px sólidos, offset 1-3 px (o negativo en controles compactos), un solo color de
  acento, SOLO con `:focus-visible`; el foco por ratón no pinta nada en 11 de 11 sitios que lo
  declaran; GitHub y Primer además reservan el hueco del borde en hover para que el foco no mueva nada.

#### 2.10 Propiedades de «tacto» (censo)
- `-webkit-tap-highlight-color: transparent`: Linear 1, Vercel 5, Geist 1, Raycast 8, Apple 5 (`rgba(0,0,0,0)`),
  Family 1, Framer 2, GitHub 3, Radix 10, shadcn 1, Sonner 1, Vaul 1, Emil 3, Primer 1, Spectrum 1.
- `touch-action: manipulation`: Vercel 2, Geist 3, Raycast 1, GitHub 2, shadcn 2, Emil 1, Carbon 1,
  Primer 1; `touch-action: none` en arrastrables (Vercel, Geist, Stripe, Radix, Emil, Rauno, Sonner).
- `overscroll-behavior: none|contain`: Vercel 4, Geist 8, Stripe 3, Apple 1, Framer 1, shadcn 3,
  Raycast 1, Rauno 1, Primer 2, backdrop de Geist.
- `user-select: none` en controles: Linear 260, Framer 134, Raycast 72, Radix 60, Family 52, Geist 44,
  Carbon 36, Emil 33, Vercel 20, Stripe 20, GitHub 18, Rauno 20, Primer 14, Apple 9; `user-select:
  text` explícito en contenido (Linear 2, Vercel 2, Raycast 6, Carbon 6).
- `scroll-behavior: smooth`: Linear 3 (solo bajo `prefers-reduced-motion: no-preference`), Carbon 1;
  Stripe `scroll-behavior: auto`.
- `prefers-reduced-motion`: Linear envuelve TODAS las animaciones de menú en `no-preference`; Radix
  igual para popovers y tooltips (y el diálogo cae a `rt-dialog-overlay-no-op`); Primer igual para
  diálogos; GitHub para ActionList; Raycast apaga hero, marquee (`animation-play-state: paused`) y
  tarjetas (`filter:none; opacity:1; animation:none; transform:none`); Sonner apaga todo con
  `!important`; Geist `.motion-reduce:!transition-none`; shadcn `.shimmer{background-image:none;
  animation:none}`; Carbon apaga coachmarks; Atlassian: «con reduced motion el movimiento está apagado
  e instantáneo»; Emil: «anima solo la opacidad cuando el usuario prefiere menos movimiento».
  Apple, Family, Arc, Stripe y Framer no declaran nada en CSS (Framer lo consulta en JS).

#### 2.11 Sombras (número de `box-shadow` distintos, sin `none` ni `var()`)
Apple 1 · Primer 1 · Sonner 3 · Rauno 3 · Linear 4 · Family 5 · Radix 5 · Vercel 6 · Geist 7 · Arc 8 ·
Emil 9 · Carbon 13 · GitHub 14 · Framer 17 · Stripe 32 · Raycast 93 (tema oscuro con bordes de luz).
Escalas declaradas: Linear `--shadow-low: 0 1px 4px -1px #00000017`, `medium: 0 3px 12px #00000017`,
`high: 0 7px 24px #0000000f` (tres pasos); Geist `--ds-shadow-border: 0 0 0 1px #00000014`,
`small: 0 2px 2px #0000000a`, `medium: 0 2px 2px #0000000a, 0 8px 8px -8px #0000000a`, `menu/modal:
borde + 0 1px 1px #00000005 + 0 4px 8px -4px #0000000a + 0 16px 24px -8px #0000000f` (siempre borde
de 1 px en la sombra + capas de 2-6 % de opacidad).

---

#### 7.3. Propuesta de tokens de movimiento para Detekta

Restricciones de partida: una sola página, CSS propio + Tailwind por CDN, sin JS de animación; el
usuario repite las mismas pulsaciones muchas veces al día (Atlassian: «por debajo de 150 ms»; Emil:
«las acciones frecuentes no se animan o casi»). Las cifras salen de la moda medida arriba.

#### 3.1 Duraciones (cinco)
| Token | Valor | Uso | Respaldo |
|---|---|---|---|
| `--dur-instant` | `0ms` | Selección por teclado, cambio de pestaña, `:active` | cmdk `transition-property:none`; @primer/css `.btn:active{transition:none}`; Geist «seleccionar una pestaña es instantáneo» |
| `--dur-press` | `80ms` | Vuelta del `:active`, popups de menú contextual, hover de fila | Linear popups `80ms`; Radix tarjeta `40ms`; Carbon `fast-01 70ms`; Atlassian «list item hover 50 ms» |
| `--dur-hover` | `150ms` | Hover/foco de botones, campos, tarjetas (color, fondo, sombra, borde) | Linear `.16s`, Geist `150ms`, Raycast/shadcn `.15s`, Carbon `moderate-01 150ms`, Material `short3` |
| `--dur-enter` | `200ms` | Entrada de popover, tooltip, diálogo, indicador de pestañas | Radix diálogo `.2s`, Primer `.2s`, Vercel popover `.2s`, Atlassian dropdown 150 / modal 250 |
| `--dur-exit` | `120ms` | Salida de popover, diálogo, toast (más rápida que la entrada) | Radix cierre `.1s`, Linear `.175s` -> salida igual, Atlassian «exit más rápido», Radix popover `.16s`/`.1s` |
| `--dur-toast` | `400ms` | Solo movimiento del toast (entrada, apilado) | Sonner `400ms` |

Techo absoluto: 300 ms (Emil, Carbon «90-120 ms para micro»). Nada por encima salvo el toast.

#### 3.2 Curvas (cuatro)
| Token | Valor | Uso | Respaldo |
|---|---|---|---|
| `--ease-out` | `cubic-bezier(.25,.46,.45,.94)` | TODO lo que responde a una acción: hover, foco, entradas | Linear `--ease-out-quad` (uso mayoritario), Emil |
| `--ease-out-soft` | `cubic-bezier(.16,1,.3,1)` | Entrada de popover, tooltip, diálogo (llega rápido, se asienta largo) | Radix (12), Vercel (3), Stripe (4), Raycast (8) |
| `--ease-in` | `cubic-bezier(.4,0,1,1)` | Salidas | Geist `--ease-in`, Material `legacy-accelerate`, Atlassian ease-in practical |
| `--ease-in-out` | `cubic-bezier(.445,.05,.55,.95)` | Indicador deslizante del control segmentado, pulgar de switch | Radix SegmentedControl y SwitchThumb |

Sin `ease-in` en entradas nunca (Emil: «ease-in es lo contrario de lo que queremos»). Sin rebote ni
sobreimpulso (Carbon: «no bounce, stretch ni paradas bruscas»); la única excepción medida es
`--ds-motion-timing-swift` de Vercel (termina en 1.1) y no se adopta.

#### 3.3 Reglas por componente
- Anillo de foco: `:focus-visible{outline: 2px solid var(--acento); outline-offset: 2px}` en botones y
  enlaces; `outline-offset: -2px` dentro de filas y segmentos (Linear, Radix); campos por
  `:focus-within` en el contenedor con `box-shadow: 0 0 0 1px var(--acento), 0 0 0 4px
  var(--acento-25%)` (Geist `--ds-focus-ring`, Stripe); `:focus:not(:focus-visible){outline:none}`; el
  anillo NO se anima (Family `transition:none`, Geist `data-[focus]:transition-none`).
- Botón: `transition: background-color, color, border-color, box-shadow var(--dur-hover)
  var(--ease-out)`; hover = un tono de fondo (Apple tres tonos, Radix un paso alfa); `:active
  {transform: scale(.97)}` sin `transform` en la lista de transición (Linear, Emil) o
  `translateY(1px)` en botones planos (shadcn, Radix marketing); `disabled{opacity:.5;
  pointer-events:none; cursor:not-allowed}`; `user-select:none; -webkit-tap-highlight-color:
  transparent; touch-action: manipulation`.
- Campo: `transition: border-color, box-shadow var(--dur-hover)`; el anillo lo pinta el contenedor
  (`:focus-within`) y el `<input>` lleva `outline:none`; inválido = mismo anillo en rojo (shadcn,
  Stripe), nunca solo el color del borde.
- Pestañas / control segmentado: UN indicador absoluto detrás (`z-index:-1; pointer-events:none`) que
  se mueve por `transform: translateX(N*100%)` con `--dur-press`+`--ease-in-out` (Radix: `.1s`); las
  etiquetas cambian de peso con `letter-spacing` compensado o con el truco de Primer (`::before{content:
  attr(data-content); font-weight:600; visibility:hidden; height:0}`) para que el ancho no salte; el
  contenido de la pestaña aparece SIN animación (Geist) o, como mucho, `opacity 0->1` en `--dur-hover`
  (Linear `.18s fadeIn`). Cambiar de pestaña no dispara toast ni red.
- Tarjeta: `transition: box-shadow, background-color var(--dur-hover)`; hover = sombra un paso arriba
  o fondo gris-alfa; NUNCA `translateY` ni `scale` en tarjetas de datos (Linear, Radix, Vercel no lo
  hacen; Arc y Family solo en marketing).
- Fila: hover con fondo gris-alfa en `--dur-press` o instantáneo; el fondo con 8 px de margen en un
  `::after` (Linear) para que no toque los bordes; selección por teclado instantánea (cmdk).
- Diálogo: contenido `opacity 0->1 + translateY(5px) scale(.97) -> 1` en `--dur-enter`
  `--ease-out-soft` (Radix); salida `opacity->0, scale(.99)` en `--dur-exit`; overlay solo opacidad
  (`--dur-enter` / `--dur-exit`); `transform-origin` en el ancla si es popover; nunca desde
  `scale(0)`; backdrop con `overscroll-behavior:none; touch-action:none`.
- Hoja inferior (móvil): `translateY(100%) -> 0` en `300ms cubic-bezier(.32,.72,0,1)` (Vaul a 0.5 s;
  Primer 0.25 s: 300 ms es el medio); sin escalar el fondo (no hay JS de arrastre).
- Toast: abajo a la derecha (16 px en móvil, 24 px en escritorio), 356 px, `translateY(100%) -> 0` +
  `opacity` con `transition` (no keyframes) en `--dur-toast` y `ease`; vida 4 s; máximo 3; salida
  `opacity 200ms`; foco con sombra + anillo; `aria-live="polite"`; un toast por evento, al final del
  flujo, `{Sustantivo} {participio}` sin «correctamente» (Geist).
- Esqueleto: mismas dimensiones que el dato final; brillo `linear-gradient(90deg, gris-100, gris-200,
  gris-100)` en un `::after` de 50 % de ancho que recorre `translateX` en `1.5s ease-in-out infinite`
  (Geist) con `animation-delay: -999999s` común (GitHub) para que todos pulsen en fase; `aria-busy`
  en la región; bajo reduced-motion, gris plano (shadcn, Raycast).
- Listas de datos: sin stagger. El stagger (20 ms por ítem, 80 ms por grupo, 4 px de recorrido: Apple)
  queda reservado a un menú de navegación si algún día lo hay.

#### 3.4 Qué se apaga con `prefers-reduced-motion: reduce`
Se apaga TODO `transform` y toda `animation` (toast, esqueleto, diálogo, indicador de pestañas, press);
se conservan las transiciones de color/opacidad/sombra en `--dur-hover` (Emil: «anima solo la
opacidad»; Atlassian: «apagado e instantáneo»; Sonner: `transition:none!important`). Implementación:
un solo bloque al final de la hoja que redefine `--dur-enter`, `--dur-exit`, `--dur-toast` y
`--dur-press` a `0ms` y pone `transform:none` en los estados `:active`; y `scroll-behavior: smooth`
solo bajo `no-preference` (Linear).

#### 3.5 Regla de «una animación por evento»
Cada evento del usuario dispara COMO MÁXIMO una animación visible, y la lidera el elemento que
cambió (Atlassian: «un solo punto focal; los demás acompañan»; Apple HIG: «brevedad y precisión»;
Carbon: «¿se nota el movimiento con frecuencia? entonces quítalo»). Derivadas: al pulsar un botón se
ve el press, no un press más un cambio de sombra más un cambio de color; al abrir un diálogo se
anima el diálogo, el fondo solo se oscurece; al cambiar de pestaña se mueve el indicador y el
contenido aparece sin animación; al llegar un toast no se mueve nada más; al cargar datos el esqueleto
es el único movimiento y desaparece de golpe cuando llega el dato (Geist: sin reflow). Y lo que se
repite decenas de veces al día (teclado, filas, pestañas) no se anima (Emil, Atlassian, Apple).

---

#### 7.4. Diez reglas de «se nota que alguien lo pensó», con la medición que las respalda

1. El hover nunca mueve el layout. Ningún sitio medido cambia `padding`, `border-width` ni
   `font-weight` sin compensar en hover: GitHub reserva `outline: 1px solid transparent` y `box-shadow:
   inset 0 0 0 1px transparent` en hover; Primer reserva el ancho del texto en negrita con
   `::before{content: attr(data-content); visibility:hidden; height:0}`; Radix compensa el peso de la
   pestaña activa con `--tab-active-letter-spacing`; Family agranda el área de foco con `padding: 0 2px;
   margin: 0 -2px` (suma cero).
2. El active es más rápido que el hover, y la salida más rápida que la entrada. @primer/css `.btn:hover
   {transition-duration:.1s}` frente a `.btn:active{transition:none}`; Radix tarjeta `.12s` en reposo
   y `40ms` en hover/active; Radix popover `.16s` abrir / `.1s` cerrar, diálogo `.2s` / `.1s`;
   Atlassian «exit motion faster than entrances»; Linear excluye `transform` de la transición del botón
   para que el `scale(.97)` sea inmediato.
3. El foco por teclado es un anillo; el foco por ratón no pinta nada. 11 de 11 sitios que declaran
   foco usan `:focus-visible` y `:focus:not(:focus-visible){outline:none}` (Linear, Arc, Sonner,
   Primer, Carbon, Framer, GitHub, Family, Vercel, Radix, Atlassian con `@supports`). El anillo es de
   2 px, un color, offset 1-3 px, y no se anima (Family `transition:none`; Geist `transition-none`).
4. Lo que se repite no se anima. cmdk: la selección por teclado tiene `transition-property:none` y
   solo el `:active` de ratón transiciona; Geist: «seleccionar una pestaña es instantáneo»; Emil: «nunca
   animes acciones iniciadas por teclado; Raycast no tiene animaciones y se siente bien»; Atlassian:
   «si se dispara docenas de veces al día, por debajo de 150 ms»; Apple HIG: «evita añadir movimiento a
   interacciones frecuentes».
5. Un press es un encogido de 2-3 % o un descenso de 1 px, nunca ambos ni más. Linear `scale(.97)` en
   siete variantes, Emil «0.97 basta», Raycast y Arc `scale(.98)`, Apple play-button `.95`, shadcn y
   Radix marketing `translateY(1px)`, Radix clásico baja el texto 1-2 px con `padding-top`. Family y
   Arc, que agrandan en hover (`1.02`), vuelven a `1.00`/`none` en active: el active siempre queda por
   debajo del hover.
6. Las entradas nacen casi a tamaño real y desde el origen. Radix `scale(.97)` + 4-5 px, Linear
   `scale(.96)`/`.98`, Vercel `--ds-motion-overlay-scale: .96`, Raycast `.96`, Emil «desde 0.93, nunca
   desde scale(0)»; `transform-origin: var(--radix-*-transform-origin)` en Radix, Linear (`var(--
   transform-origin)`) y Emil («origin-aware»). La única entrada desde `.5` (Primer scaleFade) es un
   diálogo centrado a pantalla completa en móvil.
7. Una curva de casa y se usa en todo. Linear: `--ease-out-quad` en botones, tarjetas, menús, popups,
   diálogo (`.16s`, `.12s`, `80ms`, `.175s`, siempre la misma curva); Apple: `cubic-bezier(.4,0,.6,1)`
   122 veces en el header; Stripe: `cubic-bezier(.25,1,.5,1)` 41; Radix: `cubic-bezier(.16,1,.3,1)`
   en todo lo flotante; Carbon: una productiva y una expresiva. Las curvas nativas `ease-in-out`
   dominan solo en marketing (Apple galería, Raycast) y Emil advierte que «las curvas nativas no son
   suficientemente fuertes».
8. Las transiciones se pueden interrumpir; los keyframes solo donde no hay reentrada. Sonner cambió de
   keyframes a transiciones porque «los toasts saltaban a su nueva posición al añadir varios rápido»;
   Emil: «una transición CSS se puede interrumpir y re-dirigir; los keyframes no»; Radix y Linear usan
   keyframes solo en diálogos y popovers (abrir/cerrar, sin estados intermedios) y transiciones en
   segmentos, switches, tarjetas y filas.
9. La sombra es un sistema de tres o cuatro pasos, no una por componente. Apple 1 sombra en toda la
   home, Primer 1, Linear 3 (`low/medium/high`) + 1 de foco, Geist una escala con borde de 1 px
   incorporado en cada nivel (`--ds-shadow-border-*`, `menu`, `modal`) y opacidades del 2 al 6 %;
   Raycast, con 93 sombras distintas, es el contraejemplo de un tema oscuro con bordes de luz.
10. El esqueleto y el toast respetan el layout y al lector de pantalla. Geist: «width y height iguales
    al contenido final; `aria-busy` en la región, `aria-live="polite"` en el destino, no en el
    esqueleto; sin controles enfocables dentro»; GitHub sincroniza todos los brillos con `animation-
    delay: -999999s`; Sonner: 3 visibles, 4 s, `aria-live`, foco con anillo, `prefers-reduced-motion`
    apaga todo con `!important`; Geist: «un toast por flujo, al final; sin `successfully`; Deshacer 5-10 s».

Fuentes locales: `scratchpad/inv/*.html`, `scratchpad/inv/css/<sitio>/*.css`, `sonner_styles.css`,
`sonner_index.mjs`, `vaul_index.mjs`, `spectrum_tokens.css`, `polaris_tokens.css`, `primer_css.css`,
`hig_motion.json`, `emil_*.html`.
