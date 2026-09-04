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
