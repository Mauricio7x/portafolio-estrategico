# Notas del agente «muestra SECOP II» · piloto (2-oct-2026)

> Para: sesión principal (PC1) · Estado: resultado del piloto · Sustituido por: —

- **Inicio UTC:** 2026-10-02 03:20:53
- **Fin UTC:** 2026-10-02 03:53:07
- **Leído por:** agente muestra. Fichas F-081 a F-085 en `research/fichas/`; un JSON por proceso en esta carpeta.

## 1. Qué se leyó y qué no

Leído entero y en este orden, antes de abrir fuentes: `research/AGENTES_INSTRUCCIONES.md`,
`research/TAXONOMIA.md`, `research/fichas/ESQUEMA_FICHA.json`; después `research/muestra_secop/muestra_piloto.json`.
No se abrió nada de `lib/`, `docs/`, `tests/`, `public/` ni `api/`. **No se leyó el catálogo de ejes** (no estaba
entre los documentos autorizados): el campo `eje` de las cinco fichas lleva el valor provisional 4 y una nota
para reclasificar en el PC1.

Fuentes abiertas (todas con `curl` + agente de usuario de navegador, PDF en el scratchpad, nunca en el repositorio):

| Proceso | Informes del índice | Resultado de descarga | Texto | Cómo se leyó |
|---|---|---|---|---|
| CO1.REQ.10579597 (Cajicá, SAMC obra) | 2 (825198405, 825198404) | 200 y 200; **son el mismo archivo** (md5 idéntico) | escaneado, 22 p. | 22 páginas en imagen; OCR de pp. 14 y 21 para cotejar citas; OCR entero de respaldo lanzado (estado al cierre en § 5) |
| CO1.REQ.10276184 (El Doncello, LP obra) | 3 (776162301 preliminar; 776162302 y 776162303 definitivo) | 200, 200, **403** al primer intento (HTML «Azure WAF»), 200 al reintento; 302 y 303 son el mismo archivo | nativo, 38 y 39 p. | `pdftotext -layout`, lectura por secciones y `diff` preliminar/definitivo |
| CO1.REQ.10489956 (Floresta, CMA interventoría) | 1 (812453838) | 200 | nativo, **1 p.** (carátula) | entero; más «ANEXO INFORME DEFINITIVO» (3 p.) y «CONSOLIDADO Y RECOMENDACIÓN» (2 p.), bajados porque la carátula los declara parte integral |
| CO1.REQ.10434312 (Puerto Rondón, MC obra) | 1 (797348705) | 200 | escaneado, 26 p. | 26 páginas en imagen; OCR entero de respaldo lanzado (estado al cierre en § 5) |
| CO1.REQ.11018097 (Otanche, MC consultoría) | 1 (859318081) | 200 | escaneado, 6 p. | 6 páginas en imagen; OCR de p. 4 para cotejar; OCR entero de respaldo lanzado (estado al cierre en § 5) |

Además: pliego definitivo de Cajicá (84 p.; 403 al primer intento, 200 al reintento), de El Doncello (68 p.) y de
Floresta (76 p.): primeras 4-5 páginas con `pdftotext` y `grep` del texto entero por «documento tipo / versión /
resolución». Invitación de Puerto Rondón (86 p., escaneada): solo pp. 1-2 en imagen. Invitación de Otanche
(33 p., nativa): pp. 1-3 y `grep`. Índice `dmgg-8hin` y fila `p6dx-8zbt` de los cinco procesos (todos 200).

**No se abrió**: la página del proceso en SECOP II (`urlproceso`), las actas de audiencia ni los informes
preliminares que no están en el índice (Floresta cita uno). No se resolvió, por eso, la discrepancia de Floresta
(p6dx: 2 respuestas; informes: 1 proponente).

Ningún informe tuvo un error que impidiera leerlo. Los dos 403 fueron del WAF de `community.secop.gov.co` ante
descargas en paralelo; en secuencia y con 4 s de pausa no volvió a ocurrir.

## 2. Cuánto tardó cada proceso (aproximado: los procesos se trabajaron intercalados)

| Proceso | Minutos | Dónde se fue el tiempo |
|---|---|---|
| Cajicá | ~14 | PDF escaneado; 22 imágenes; caer en cuenta de que el rechazo solo aparece en la hoja de puntaje y el consolidado final |
| El Doncello | ~12 | dos informes de 38-39 p.; reconstruir las subsanaciones por `diff` |
| Floresta | ~10 | descubrir que el «informe» es una carátula y bajar los dos anexos |
| Puerto Rondón | ~9 | PDF escaneado; 26 imágenes, 15 de ellas anexos de la oferta |
| Otanche | ~7 | PDF escaneado; 6 imágenes |
| Infraestructura (descargas, índice, p6dx, OCR) | ~20 | instalar tesseract; el OCR a 300 dpi con la máquina a carga 12 tardaba ~12 min/página y hubo que matarlo; a 200 dpi con la máquina libre tardó segundos por página |

Total de sesión: ver inicio y fin. Páginas leídas: 22 + 77 + 6 + 26 + 6 = 137 de informes, más 14 de pliegos e
invitaciones.

## 3. Qué fue difícil de contar (calibra la muestra grande)

1. **Tres de cinco informes son escaneados sin capa de texto** (Cajicá, Puerto Rondón, Otanche). `pdftotext`
   devuelve 0 caracteres. Hace falta OCR (tesseract 5 con `spa` se instaló con `apt-get` en este entorno) o
   lectura en imagen. A 300 dpi con la máquina cargada es inviable; a 200 dpi y `--psm 6` basta para cotejar citas.
2. **«Habilitados» cambia según la tabla que se mire.** En Cajicá el informe técnico (p. 7) marca a los dos
   oferentes CUMPLE/HABILITADO y solo la hoja de puntaje (p. 14) y el consolidado final (p. 21) muestran el
   RECHAZADO por oferta económica. Regla: contar sobre el consolidado final, no sobre la primera tabla.
3. **Las subsanaciones casi nunca están listadas.** El Doncello anuncia la subsanación (numeral 7.1) sin
   enumerarla: hubo que hacer `diff` entre preliminar y definitivo. Otanche las marca celda por celda
   («SUBSANA», «SUBSNA Y CUMPLE»). Cajicá, Floresta y Puerto Rondón no documentan ninguna: se dejó `null`, no 0.
   Se cuenta por ítem subsanado, no por oficio de requerimiento (el número de oficios no consta).
4. **El archivo llamado «informe» puede no serlo.** Floresta: carátula de 1 página; la evaluación está en
   «ANEXO INFORME DEFINITIVO.pdf» y «CONSOLIDADO Y RECOMENDACIÓN (1) (2) (1).pdf». Un filtro por nombre de
   archivo que exija «informe» o «evaluaci» pierde el dato. Para la muestra grande: cuando el informe tenga
   ≤ 2 páginas, bajar también los archivos cargados el mismo día.
5. **Duplicados en el índice**: Cajicá y El Doncello publican el mismo PDF dos veces con ids distintos
   (md5 idéntico). Hay que deduplicar por hash antes de contar «informes».
6. **Erratas de plantilla que rompen un parseo por regex**: Cajicá trae en los formatos jurídicos el objeto y la
   referencia de otro proceso («MC-017-2026», «LP-016-2025», una vía veredal) y su pliego dice «SAMC-015-2026»;
   Floresta llama al concurso de méritos «Selección Abreviada de Menor Cuantía» y recomienda adjudicar
   «MF-SAMC-002»; Puerto Rondón titula «MENOR CUANTÍA» un informe de mínima cuantía; El Doncello escribe
   «LP-2026-0028», «26 de marzo de 2025» y «24/03/20265». El número de proceso debe tomarse del índice, no del informe.
7. **Causas de rechazo o no habilitación**: solo dos procesos las tienen (Cajicá: 1 rechazo económico por AIU;
   El Doncello: 4 ítems de no habilitación en el preliminar, todos subsanados). Con un solo proponente en 4 de 5
   procesos, la muestra grande necesitará procesos con varios oferentes para medir causas con sentido.
8. **Capacidad residual** no encaja limpio en las siete categorías de causa (se usó `otra` con detalle). Proponer
   en el PC1 una categoría `capacidad_residual` o incluirla explícitamente en `financiera`.
9. **Documentos tipo**: se reconocen bien cuando el pliego es el documento base de Colombia Compra (Cajicá,
   Floresta, Puerto Rondón traen «Versión N del día-mes-año» en el pie). Cuando la entidad vuelca el documento
   tipo en su membrete (El Doncello) la versión no consta: `null`.
10. **p6dx-8zbt**: `categorias_adicionales` = «No definido» en 5/5; `codigo_principal_de_categoria` =
    «UNSPECIFIED» en 1/5; `duracion` = 0 con el informe diciendo «un mes» en 1/5; `descripci_n_del_procedimiento`
    = «No definido» en 1/5; `respuestas_al_procedimiento` coincide con los informes en 4/5 y no en Floresta;
    El Doncello tiene dos filas idénticas. `departamento_entidad` = «No Definido» en Otanche (fuera de los diez campos).
11. **Privacidad**: los informes traen nombres y cédulas de representantes, evaluadores, contadores y, en
    Otanche, de la proponente persona natural; Puerto Rondón publica estados financieros y copias de documentos de
    identidad de terceros. Nada de eso se guardó; el censo de nombres se corrió con `grep` sobre lo escrito.

## 4. Problemas candidatos vistos (para el catálogo CP-###)

| Título | Etapa | Decisión | Tipo | Fichas | Consecuencia en plata (si la fuente la da) |
|---|---|---|---|---|---|
| Ofrecer un AIU mayor al del Formulario 1 es rechazo, aunque todo lo demás cumpla | E2 | D2, D3 | obra | F-081 | Se pierde el contrato entero (presupuesto 189.813.793; adjudicado a otro por 175.753.512 según p6dx) |
| Un solo proponente No Hábil en tres frentes queda Hábil por subsanación | E2 | D3, D1 | obra | F-082 | Contrato de 1.996.711.729 adjudicado por el 100 % del presupuesto |
| El «informe de evaluación» indexado puede ser una carátula; la evaluación va en anexos sin ese nombre | E2 | D1 | interventoría | F-083 | — (riesgo de ingesta: la inteligencia de competencia se queda sin datos) |
| En mínima cuantía la entidad puede suplir de oficio documentos no presentados (Formato 9 Mipyme) | E2 | D3 | obra | F-084 | Oferta por el 100 % del presupuesto (49.000.000) con AIU 37 % aceptada |
| En mínima cuantía la capacidad financiera depende de la forma de pago; nueve subsanaciones en una oferta | E2 | D1, D3 | consultoría | F-085 | 25.000.000 adjudicados a la única oferta |
| Campos de p6dx-8zbt con «No definido», «UNSPECIFIED» o 0 como si fueran datos | E0 | D1 | todos | (JSON de los cinco procesos) | — |

## 5. Incidencias del entorno

- Dos 403 del WAF de SECOP II en descargas paralelas; reintento en secuencia: 200.
- `tesseract` no estaba instalado; `apt-get install tesseract-ocr tesseract-ocr-spa` funcionó.
- Carga de la máquina 12 sobre 4 núcleos durante el OCR (otros agentes del piloto en paralelo); dos comandos
  propios murieron por un `pkill -f` que casó con la propia shell (código 144): lección, matar por PID.
- En el scratchpad ya existían, antes del inicio de esta sesión (03:18 UTC), `825198404.pdf` y `825198405.pdf`
  idénticos a los descargados: los dejó otro proceso; no se usaron.
- Las fichas se validaron contra `ESQUEMA_FICHA.json` (obligatorios y valores permitidos) con `node`.
- Estado del OCR de respaldo (200 dpi, archivo entero) al cierre (2026-10-02 03:53:07 UTC): CO1.REQ.11018097: 1/6 páginas con OCR; CO1.REQ.10579597: 1/22 páginas con OCR; CO1.REQ.10434312: 1/26 páginas con OCR; procesos tesseract aún vivos: 3. El OCR de las páginas citadas (Cajicá 14 y 21, Otanche 4) sí terminó y coincide con la lectura en imagen; los conteos de los tres informes escaneados se sostienen en la lectura de las imágenes, no en este respaldo.
