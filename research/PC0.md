# PC0 · Punto de control de la Fase 0 (2-oct-2026)

> Para: dueño · Estado: informe fechado · Sustituido por: —

Copia en disco del informe entregado en el chat. Las respuestas del dueño se anotan al pie cuando lleguen.

## 1. Qué hice

- Medí el árbol con las tres herramientas (`mapa`, `estado`, `--indice`) y leí por secciones los
  informes del repositorio que el encargo nombra. Inventario: `research/INVENTARIO_FASE0.md`.
- Escribí la taxonomía común (`research/TAXONOMIA.md`), la forma de la ficha
  (`research/fichas/ESQUEMA_FICHA.json`) y la matriz de cobertura (`research/MATRIZ_FASE0.md`).
- Censé las citas normativas del árbol (`research/censo_citas_normativas.tsv`) y medí la red y el
  universo de la muestra en SECOP II.

## 2. Cifras

| Medida | Valor |
|---|---|
| Fuentes externas abiertas | 0 (solo sondeos HTTP y 3 consultas agregadas a datos.gov.co) |
| Documentos del árbol abiertos | 14 en parcial, 1 módulo completo, 30 cabeceras de módulos |
| Fichas | 0 |
| Errores hallados al verificar | 3: el Anexo A no está en el árbol y sus dos errores tampoco; dos grafías del Decreto 159 de 2026; el 403 a datos.gov.co de `docs/LEGAL_COLOMBIA.md` ya no se reproduce |
| Temas de la matriz | 70: 11 cubiertos, 40 a medias, 19 vacíos |
| Normas distintas citadas en el árbol | 121 (638 menciones), ninguna verificada aún en texto oficial |
| Tiempo | ≈ 50 min (02:20 a 03:10 UTC, aproximado) |
| Costo | ≈ 290 mil tokens según el contador de la sesión; en dinero no medible (suscripción) |

## 3. Lo que decidí yo (anotado en `research/BITACORA.md`)

1. Fase 0 sin agentes, como manda el encargo.
2. Lo intermedio vive en `research/`; los entregables finales irán a `docs/`.
3. Identificadores propios `F-###`, `CP-###`, `CR-###` (los `P-##` y `R-##` ya existen con otro significado).
4. La fecha de corte se fija al terminar la verificación (Fase 3).
5. El texto oficial de las normas saldrá del Diario Oficial, de la relatoría de Colombia Compra y
   del régimen legal de Bogotá: SUIN y Función Pública no responden desde aquí (error literal en el
   inventario § 4) y se reintentan en cada fase.

## 4. Lo que decide usted

| # | Decisión | Opciones | Recomendación |
|---|---|---|---|
| D1 | Fusión del PR | (a) automática al abrirlo · (b) tras su visto bueno en el PC4 | **(b)**: el PR mete un validador en la suite y corrige texto normativo; usted lo ve, dice «adelante» y la sesión activa la fusión automática para que no dependa de un clic suyo |
| D2 | Presentación | Para quién: usted · empresarios · inversionistas. Formato: HTML autocontenido en `docs/` · .pptx | **Usted primero, HTML en `docs/`**: sin dependencias, se abre en Chrome, queda versionado y se genera desde la base; una segunda versión para empresarios saldría de la misma base. El .pptx exige un binario en el repositorio |
| D3 | Alcance | (a) solo obra · (b) obra + consultoría e interventoría | **(a) solo obra**, con la interventoría solo como contraparte del contratista (eje 5). Incluir consultoría duplica las reglas de los ejes 3, 4 y 9 (concurso de méritos, sin capacidad residual) y sube el esfuerzo entre un 30 y un 40 % |
| D4 | Pesos de la priorización (se fijan en el PC3) | Punto de partida: 35 % plata que evita perder · 25 % frecuencia (muestra y fuentes) · 20 % costo en sesiones (inverso) · 10 % riesgo del falso positivo o negativo (penaliza) · 10 % lo da gratis una herramienta oficial (penaliza) | Aceptarlo como punto de partida y ajustarlo con el catálogo delante en el PC3 |
| D5 | Tope de esfuerzo por eje | Ejes de problemas (2, 5, 6, 7, 8): 30 fuentes abiertas por eje o 4 horas-agente, lo primero que llegue; ejes normativos (1, 3, 4, 9): lista cerrada, sin tope · Muestra: N provisional de 40 procesos (licitación y menor cuantía de obra 2026 con informe de evaluación), N definitivo en el PC1 | Aceptar los topes; el piloto dirá fichas por hora y se recalibra |
| D6 | Los documentos que faltan | (a) subirlos a Drive (detektaph@gmail.com) en una carpeta nueva y decirme su nombre · (b) pegarlos en el chat · (c) seguir sin ellos (los dos errores del Anexo A se tratan como afirmaciones a verificar en los ejes 3 y 9, sin archivo que corregir) | **(a)**: la cuenta de Drive sí responde desde aquí |
| D7 | Identificadores | (a) `CP-###` / `CR-###` · (b) `P-###` / `R-###` como pidió, aceptando el choque con los existentes | **(a)** |
| D8 | Persistencia entre PC | (a) empujar la rama `claude/great-cannon-ouop68` tras cada PC, sin PR hasta el PC4 · (b) solo commits locales | **(a)**: el contenedor se recicla y lo local se pierde |
| D9 | La suite en rojo por el espacio de «a. m.» | (a) una sesión corrige `public/portada.js` para que la hora salga con espacio normal (una línea, suite 4/4 y navegador real) · (b) dejarla y vigilar GitHub | **(a)**: cuesta media sesión y evita que `main` se ponga en rojo cuando el corredor de GitHub actualice Node 22 (aquí Node v22.22.0 ya lo reproduce) |

## 5. Respuestas del dueño (2-oct-2026)

D1 (b) · D2 recomendado · D3 (b) obra + consultoría e interventoría · D4 recomendado · D5 aceptar · D6 (a) · D7 (a) · D8 sí · D9 (a).
