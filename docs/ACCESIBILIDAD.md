# Accesibilidad de la zona · metodología (ago 2026)

> Foto del 21-ago-2026. El estado se mide con `node tests/estado.js`; las rutas, con `node tests/mapa.js`.

Encargo del dueño: que salgan de primeras las oportunidades de mayor probabilidad que **además**
estén a ≤250 km de Bogotá o Ibagué, o a ≤2h30 del aeropuerto más cercano, y que no sean zonas de
difícil acceso ni de conflicto. Objetivo de fondo: **minimizar el costo operativo** de licitar —
la plata y el tiempo que se van en llegar, visitar, movilizar equipo y sostener una obra lejos de
la base.

## 1 · Qué se construyó

- **`data/accesibilidad_departamentos.json`**: 32 departamentos + Bogotá D.C., cada uno con
  distancia aproximada por carretera a Bogotá y a Ibagué (redondeada a decenas de km), si la
  capital tiene aeropuerto comercial, si el acceso predominante es aéreo/fluvial/insular
  (`dificil_acceso`) y si hay alertas de orden público documentadas en partes del departamento
  (`verificar_orden_publico`).
- **`lib/accesibilidad.js` · `evaluarZona(fila, base)`**: clasifica cada proceso por su
  `departamento_entidad` en `cerca / media / lejos / sin_dato` y produce `puntos` 0–3, una
  `etiqueta` y un `mensaje` ya redactados en lenguaje de personas. **La base es del perfil**
  (6-sep-2026): `lib/perfil_resolver.baseDelPerfil` da Bogotá/Ibagué (`BASE_DUENO`) solo para los
  tres perfiles del dueño; un RUP subido, un consorcio a la medida o una simulación no han dicho
  desde dónde operan y reciben `null` → «Distancia sin calcular: no sabemos desde dónde opera»
  (km `null`, banda «sin dato», y las alertas del destino se conservan). Sin base nunca se mide
  desde Bogotá: una distancia ajena y creíble es peor que una que falta.
- **Integración** (`/api/procesos?op=listar`; `/api/oportunidades` es su rewrite en `vercel.json`): el campo `zona` viaja en cada fila; el orden por defecto
  (`atractividad`) usa los puntos como **cubeta dentro de los viables** (el valor esperado sigue
  decidiendo dentro de cada cubeta); y `?zona=facil` — el desplegable «Acceso a la zona» de
  Filtros avanzados — retira lo lejano y lo alertado **solo si el usuario lo pide**.
- **Tarjeta**: chip con la etiqueta («Su zona (Ibagué)», «Cerca · ~140 km de Ibagué», «Lejos,
  pero se llega volando», «Acceso difícil») y el detalle en el `title`. La alerta de orden público
  viaja como bandera (`verificar_orden_publico`) y la pantalla la pone en palabras UNA vez junto a
  la etiqueta («· verifique la seguridad de la zona»), igual en el chip y en la guía de Mis procesos
  (6-sep-2026: el sufijo «· verificar zona» de la etiqueta se retiró porque el chip la decía dos veces).

## 2 · Las reglas, y por qué son así

| Regla | Por qué |
|---|---|
| Granularidad **departamento**, capital como referencia | Es lo único derivable del dato publicado (`departamento_entidad`) sin inventar. El municipio exacto puede variar mucho: por eso esto **ordena y etiqueta**, y solo excluye con el filtro opt-in. |
| Distancias en **bandas anchas** (≤250 / ≤550 / >550 km) | Las cifras son estimaciones de red vial (declaradas «estimado» en pantalla). Un error de ±50 km rara vez cambia la banda; usarlas con más precisión sería fabricar exactitud. |
| **Aeropuerto sube «lejos» a «media»**, salvo difícil acceso | El criterio del encargo es un O lógico (carretera **o** aeropuerto). Leticia tiene aeropuerto y aun así mover equipo de obra hasta allá no se parece a volar a Barranquilla. |
| **Orden público = «verificá la zona»**, jamás un veredicto | La bandera es departamental y orientativa. Afirmar que UN proceso está en zona de conflicto con una tabla de 33 filas sería el falso positivo más caro posible. El mensaje pide verificar el municipio. |
| **`sin_dato` queda en la banda media** (puntos 2) | No saber dónde es la obra no es estar lejos (R1) — pero tampoco puede colarse de primero. Y el filtro `zona=facil` **no lo excluye**. |
| La cubeta solo aplica al orden **por defecto** | Quien pide «mayor cuantía» pidió ese orden, no una opinión sobre la zona. |
| Corre **al servir**, no en la ingesta | Afinar la tabla tiene efecto inmediato, sin relanzar la full (la regla ingesta ancha / juicio fino). |

**Puntos**: cerca 3 · media y sin_dato 2 · lejos 1 · −1 si hay difícil acceso u orden público
(piso 0). El orden queda: viables → puntos de zona → valor esperado.

## 3 · Lo que NO se puede computar hoy (dicho, no disimulado)

- **El tiempo real municipio→aeropuerto** («≤2h30») exige una matriz de tiempos de viaje que no
  existe en el repositorio y que ninguna fuente abierta accesible publica por municipio. Se
  aproxima por la capital y se declara. Cerrarlo bien = tabla municipio→aeropuerto (DIVIPOLA +
  red vial), esfuerzo alto.
- **El municipio de la obra**: el dataset trae `ciudad_entidad` (sede de la entidad), que no
  siempre es el sitio de la obra. Un refinamiento municipal (p. ej. distancias por municipio del
  Tolima y Cundinamarca, los más frecuentes) es la mejora natural v2.
- **Conflicto social/armado municipal**: las listas oficiales ZOMAC (D. 1650/2017) y PDET (170
  municipios) son públicas y estables — son el camino correcto para pasar la bandera de
  departamento a municipio, pero hay que **cargarlas de la fuente, no de memoria**: transcribirlas
  «de cabeza» inventaría datos. Queda como paso 2 documentado.
- **Las distancias no están verificadas contra INVÍAS** (403 desde este entorno): son estimaciones
  de red vial marcadas como tales. Verificarlas cambia números, difícilmente bandas.

## 4 · Cómo se refina (el orden correcto de los siguientes pasos)

1. **Medir**: `/api/diagnostico` + el reparto de `zona.nivel` sobre el corpus real — ¿cuántos
   procesos caen en cada banda? Si el 90 % del corpus ya es «cerca», el refinamiento municipal
   importa poco.
2. **Municipalizar Tolima/Cundinamarca/Boyacá/Meta** (donde vive el negocio del dueño): ~180
   municipios con distancia a Ibagué/Bogotá, de una fuente real.
3. **Cargar ZOMAC/PDET** desde el texto oficial para la bandera municipal de orden público.
4. **Percentil de flete del catálogo APU**: conectar la banda de zona con el costo de transporte
   que el editor ya modela (`distancia_km` en las líneas de transporte) para que el APU proponga
   la distancia por defecto según el departamento.

## 5 · El principio general: ahorrar la plata operativa de licitar

La misma lógica del encargo aplicada a cada etapa del ciclo (los portales comerciales del sector —
alertas de licitaciones por correo, tableros de vigilancia de mercado— compiten exactamente en
esto: menos horas de analista por oportunidad). Estado en Detekta:

| Etapa | Costo operativo típico | Qué lo ahorra en Detekta | Estado |
|---|---|---|---|
| Encontrar | Horas barriendo SECOP II | Orden por defecto: viable → zona → valor esperado; PAA aparte | ✅ (este PR cierra la zona) |
| Filtrar | Leer 50 fichas | Veredicto en una línea + frecuencia natural + cuenta regresiva | ✅ |
| Decidir | Armar Excel de comparación | VEG, baja del mercado, «quién gana aquí», desglose auditable | ✅ |
| Presupuestar | Días de APU manual | Lector de pliegos + editor APU + precio sugerido | ✅ (falta el puente pliego→APU, #17) |
| Vigilar | Entrar a diario | ⬜ Alertas (correo/WhatsApp) de nuevas oportunidades que pasan tus filtros — **el ahorro más grande pendiente** |
| Seguir | Memoria y carpetas | ⬜ Guardar/descartar/«ya me presenté» (#18) |
| Renovar RUP | Consultoría anual | Auditoría de cobertura con experiencia real | ✅ |

Los dos ⬜ son las piezas que más plata operativa ahorran de lo que falta, y quedan priorizadas en
`docs/ANALISIS_ESTRATEGICO.md` (#18 y nueva: alertas).
