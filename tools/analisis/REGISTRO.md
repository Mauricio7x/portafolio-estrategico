# Registro de la investigación «fórmula de adjudicación» · decisiones, hipótesis, fallos y descartes

> Para: sesión · Estado: informe fechado · Sustituido por: —

Bitácora en orden cronológico. Cada entrada: fecha, qué se hizo o decidió, con qué evidencia. Lo que
no se pudo hacer va con el error literal. Nada de aquí lo lee la aplicación.

## 2026-10-21 · Fase 1 (acceso e inventario) hasta el checkpoint C1

- **Auditoría de premisas del prompt contra el repo** (CLAUDE.md, `node tests/estado.js`, `node tests/mapa.js`,
  `docs/MEMORIA.md` secciones del 17 y 18-oct-2026, `scripts/base_obra/*`, `lib/indice_baja.js`,
  `lib/apu/piso_techo.js`): ver el informe, sección «Premisas que resultaron falsas o incompletas».
- **Acceso a datos.gov.co desde la sesión**: `curl` a `/resource/p6dx-8zbt.json?$limit=1` → HTTP 200 en 0,5 s.
  No hace falta la descarga manual del dueño (D3 del prompt queda sin efecto).
- **Metadatos de 15 conjuntos** bajados de `/api/views/<id>.json` (guardados con su SHA-256 en
  `ficha_fuentes.json`; columnas y tipos en `diccionario_datos.json`).
- **Hallazgo**: las vistas anuales «SECOP II - Ofertas - 2020/2021/2022/2023» (atkq-fc9r, pp6p-gvye, yk6j-79e6,
  vz4x-85r3) son FILTROS (`assetType: filter`) sobre `wi7w-2nvm`, que solo trae ofertas registradas desde el
  1-ene-2024: por eso 2023 responde 4 filas y 2020 responde 0. Las ofertas de 2015 a 2023 están en
  `b28v-edj8` («Ofertas Por Proceso Historico», 44.262.193 filas). Las dos tienen 16 columnas, no 14.
- **Corrida del inventario existente** (`node scripts/base_obra/inventario.js <carpeta fuera del repo> 2019-01-01`)
  lanzada a las 04:19 UTC para medir la cascada de exclusiones y la calidad de las ofertas desde 2019
  (la corrida de referencia del 17-oct-2026 fue desde 2024 y su salida vive en R2, sin credenciales en esta sesión).
- **Fallo de herramienta**: la agregación `count(*) ... group by modalidad` sobre las 50 M filas de `wi7w-2nvm`
  no respondió en 300 s (`curl: (28) Operation timed out after 300001 milliseconds with 0 bytes received`).
  Las agregaciones por moneda, por año y por tramo de valor sí respondieron (entre 1 y 4 minutos).
- **Subagente verificador normativo** lanzado con las 10 preguntas de la sección 2 del prompt; su tabla entra
  al informe solo con pasaje literal y URL abierta.
- **Verificación normativa terminada** (subagente, 90 llamadas; pasajes releídos por la sesión en los archivos
  descargados a la carpeta temporal `normas_pdf/`): tabla en el informe, § 2.4. Lo que no abrió: Función Pública
  y SUIN-Juriscol («HTTP 503 Service Unavailable»; con `curl`, «SSL certificate problem: unable to get local
  issuer certificate»); las resoluciones 539 de 2025 y 546 de 2026 son escaneos sin texto; la fórmula del
  «valor mínimo aceptable» de la guía CCE-EICP-GI-27 (pág. 11) es una imagen.
- **Medición propia**: ofertas de procesos cerrados y «en Evaluación» (12 a 120 días desde el cierre): 0 de 42
  con filas en `wi7w-2nvm`; adjudicados en sep–oct 2026: 71 de 77 con filas. Las ofertas se publican tras la
  adjudicación. `fecha_de_registro` es una sola fecha por proceso.
- **Cruce con proveedores registrados (`qmzu-gj57`)** en 6 procesos: 35 NIT válidos de 336 grupos
  proveedor × proceso; por NIT 32 de 35 encontrados con departamento; por `c_digo_proveedor`, 54 de 328.
- **Rama de trabajo** `claude/investigacion-formula-adjudicacion` creada por el gancho de cierre del dueño
  (pide que no queden archivos sin versionar); el índice y el mapa se regeneraron con `node tests/mapa.js --escribir`.
- **Orden del dueño (21-oct-2026, tras C1)**: seguir con las fases 2 a 7 con 2024–2026 como ventana principal, usar
  2022–2023 (y lo que haya desde 2019) solo para medir si las cifras cambian y si hay tendencia por año; no pasar
  ningún límite gratuito; guardar en Drive o R2 solo lo imprescindible. Esta sesión NO tiene credenciales de R2
  (no existen variables `OBJETOS_*`): nada se escribe allí. Umbrales de éxito: no fijó otros, rigen los sugeridos
  (`PREREGISTRO.md`).
- **Inventario desde 2019 terminado** (04:17 → 05:14 UTC): 93.424 filas de p6dx, 36.741 portafolios, 25.086 usables
  (licitación 5.531 · menor cuantía 11.392 · mínima 8.163). Fallos: conteos anuales de `b28v` 2017–2023 y `9sue`
  («agotados 5 intentos (The operation was aborted due to timeout)»), informativos.
- **Guiones** `tools/analisis/{analisis,hipotesis,modelo,domicilios}.py` probados sobre una base sintética de 600
  procesos antes de abrir la real (el modelo pasó de 117 s a 6 s al precalcular la tabla de inserción por proceso).
