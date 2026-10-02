# Piloto · eje 4 (RUP, experiencia, capacidad residual, plurales y UNSPSC) · lente institucional

> Para: sesión · Estado: nota de agente del piloto (2-oct-2026) · Sustituido por: —

Agente: «lector eje4-institucional». Fichas escritas: F-001 a F-020 en `research/fichas/` (ninguna lleva
`verificacion_adversaria`). No se tocó ningún otro archivo del repositorio; los F-021 en adelante que hay
en esa carpeta son de otros agentes y no se leyeron ni se modificaron.

## 1. Tiempos y ritmo

- Inicio UTC: **2026-10-02T03:20:48Z** (`date -u` al empezar).
- Fin UTC: **2026-10-02T03:45:43Z** (`date -u` al terminar).
- 20 fichas en ese lapso, con 12 fuentes sustantivas. Ritmo medido: 25 minutos de reloj para 20 fichas, es decir unas 48 fichas por hora (incluye bajar, convertir y leer los
  documentos y verificar las citas por programa). El tope de 90 minutos no se alcanzó; paró el tope de fuentes (12), no el reloj.
- Contador de contexto del agente: 15.000.000 de tokens al empezar, ~14,50 millones al escribir esta nota
  (≈ 0,50 millones gastados, incluida una lectura larga por error de una tabla de contenido de la guía de
  capacidad residual).
- Verificación propia (no sustituye a la Fase 3): un script comparó cada cita, y cada cita interna entre «»
  dentro de `notas`, contra el texto descargado (normalizado NFKC y espacios). En la primera pasada marcó 18
  citas internas (algunas por comillas mal emparejadas y otras escritas a mano sin tildes o con puntuación
  distinta, no literales); se corrigieron copiando el texto de la fuente antes de guardar. Al guardar: 0 marcas. Es un hallazgo de ritmo:
  copiar citas a mano produce errores; hay que extraerlas por programa.
- La ligadura «ﬁ» de los PDF de la relatoría se normalizó a «fi» en las citas (la fuente trae el carácter
  ligado). Las citas de documentos tipo salen del texto del .docx convertido; las ecuaciones de Word se
  aplanan (ver F-014 y F-018).

## 2. Hallazgo central sobre «qué cambió con el Decreto 0997 de 2026»

Leído el decreto completo (relatoría de Colombia Compra en HTML y PDF firmado de la Presidencia/DAPRE, 19
hojas, 14 artículos). Para el RUP **no cambia** la inscripción, la renovación anual (quinto día hábil de
abril), la clasificación en tercer nivel, la experiencia, la capacidad financiera ni la capacidad residual
(el decreto no modifica los arts. 2.2.1.1.1.5.1 a 5.3 ni el 2.2.1.1.1.6.4, según el listado de sus 14 artículos: F-001, F-003, F-006). Lo que cambia:

1. Caución para impugnar el RUP: 10 % de la utilidad operacional del último registro del impugnado (1 % de
   los ingresos si no hay utilidad), vigente hasta un año después de la decisión, no exigible si impugna el
   mismo inscrito (art. 2; F-004).
2. Reporte de sanciones: el envío mensual y la permanencia de multas (1 año) y sanciones ya figuraban en el
   texto compilado; lo nuevo es el parágrafo del art. 3: sentencias ejecutoriadas de responsabilidad civil
   contractual quedan en el certificado del RUP diez años desde la ejecutoria (F-005).
3. Requisitos habilitantes: la entidad no debe limitarse a la aplicación mecánica de fórmulas financieras
   (art. 6; F-008), con entrada progresiva.
4. Régimen de transición (art. 14): los arts. 2, 3, 8 y 11 rigen desde el día siguiente a la publicación en el
   Diario Oficial; el resto a los 6, 9, 12 o 15 meses según la categoría de la entidad; los procesos regidos
   por Documentos Tipo siguen con los Documentos Tipo y las normas anteriores hasta que Colombia Compra los
   actualice (F-006, F-007). Control de versiones consultado hoy: obra de transporte v4, interventoría v3 y
   consultoría v2, todas desde 03/02/2025, sin versión posterior.

No se encontró la fecha de publicación en el Diario Oficial (la Imprenta Nacional ofrece un buscador por
formulario). Sin ella no se pueden calcular las fechas de los 6, 9, 12 y 15 meses. El decreto lleva fecha
4-ago-2026 en la relatoría; el PDF de DAPRE se creó el 5-ago-2026; el ABC de Colombia Compra es del
10-sep-2026. El texto compilado del Decreto 1082 que sirve la relatoría es anterior al 0997 (no trae el inciso
tercero del 5.4 ni el parágrafo del 5.7), así que las fichas F-001 y F-003 se cotejaron contra la lista de
artículos que modifica el 0997, no contra un texto consolidado.

## 3. Fuentes por tipo

Abiertas y usadas (12; el decreto 0997 cuenta dos veces por tener dos copias):

| Tipo | Fuente (URL abierta) | Lectura | Fichas |
|---|---|---|---|
| decreto | Decreto 1082 de 2015, relatoría (https://relatoria.colombiacompra.gov.co/normativa/decreto-1082-de-2015/) | parcial (Subsección 5, arts. 2.2.1.1.1.5.1 a 5.7; no se leyó el 2.2.1.1.1.6.4: se conoce por la cita de la guía GI-22) | F-001, F-003 |
| decreto | Decreto 0997 de 2026, relatoría (https://relatoria.colombiacompra.gov.co/normativa/decreto-0997-de-2026/) | completa | F-004 a F-008 |
| decreto | Decreto 0997 de 2026, PDF DAPRE (https://dapre.presidencia.gov.co/normativa/normativa/DECRETO%20No.%200997%20DEL%204%20DE%20AGOSTO%20DE%202026.pdf) | completa; imagen con capa OCR con huecos, solo para cotejo y número de hoja | localizadores de F-004 a F-008 |
| ley | Ley 1150 de 2007, relatoría (https://relatoria.colombiacompra.gov.co/normativa/ley-1150-de-2007/) | parcial (art. 6) | F-002 |
| doc_tipo | Documento Tipo de licitación de obra de transporte v4 (https://www.colombiacompra.gov.co/documentos-tipo/descarga/29920/, zip con 25 archivos; se leyó el Documento Base, la Matriz 1 en extracción parcial y la Matriz 2) | parcial | F-009 a F-012, F-016, F-018 |
| doc_tipo | Documento Tipo de concurso de méritos de interventoría de transporte v3 (https://www.colombiacompra.gov.co/documentos-tipo/descarga/29953/, zip con 25 archivos; se leyó el Documento Base por secciones) | parcial | F-013 |
| cce_guia | Guía de capacidad residual CCE-EICP-GI-22 (https://www.colombiacompra.gov.co/wp-content/uploads/2024/08/2023-Guia-para-determinar-y-verificar-la-Capacidad-Residual-del-proponente-en-los-Procesos-de-Contratacion-de-obra-publica-CCE-REC-GI-22.pdf) | parcial (págs. 1-22 de 36) | F-014, F-015 |
| cce_guia | Guía de codificación UNSPSC G-CBS-02 (https://www.colombiacompra.gov.co/wp-content/uploads/2025/05/Guia-de-Codificacion-ByS-V3-2026-Final.pdf) | parcial (págs. 1-9 y 12-17 por lectura; el resto por palabras clave) | F-019 |
| cce_guia | ABC del Decreto 0997 de 2026, RUP e integridad (https://www.colombiacompra.gov.co/wp-content/uploads/2026/09/ABC-Decreto-0997-RUP-y-Transparencia.pdf), orientación, no sustituye al decreto | completa | citado en notas de F-004, F-006, F-007 |
| cce_concepto | Concepto C-1732 de 2025 (https://relatoria.colombiacompra.gov.co/conceptos/c-1732-de-2025/) | completa | F-017 |
| dato | Control de versiones de Documentos Tipo, con la ventana «Métricas de la nueva Versión» del módulo UNSPSC (https://www.colombiacompra.gov.co/normativa-y-relatoria/control-de-versiones-documentos-tipo) | parcial | F-020; vigencia de F-009 a F-018 |
| dato | Módulo UNSPSC de Colombia Compra (POST a admin-ajax.php, acción `unspsc_get_metric_detail`, con el nonce público de la página, 31 consultas por prefijo de familia) | parcial | notas de F-020 |

Por tipo: decreto 3, ley 1, doc_tipo 2, cce_guia 3, cce_concepto 1, dato 2 (total 12).

Intentadas (25): decreto 5 (los tres anteriores, más el Decreto 1082 vía `sisjur` de Bogotá y el Diario Oficial de
la Imprenta Nacional), ley 1, doc_tipo 2, cce_guia 4 (las tres anteriores más la consulta RUP de Colombia Compra),
cce_concepto 10 (se descargaron diez conceptos de la relatoría para clasificarlos por conteo de «capacidad
residual», «plural» y «RUP»; solo C-1732 de 2025 se leyó completo y del C-012 de 2026 se leyó el primer
tercio, sin ficha), dato 3 (control de versiones, módulo UNSPSC y RUES).

Páginas de navegación abiertas para encontrar enlaces (no se cuentan como fuentes y no sostienen fichas):
relatoría (inicio, listado de normativa, buscador), página de guías y manuales, página de documentos tipo y
sus listados por sector y por nodo (transporte: obra, interventoría), página de la guía de capacidad residual,
página y FAQ del módulo UNSPSC, tres páginas de infografías del ABC, buscador JSON del sitio de Colombia
Compra, boletín N.º 5 de 2026 (solo para buscar fecha del decreto), `alcaldiabogota.gov.co/sisjur/` (inicio).

## 4. No abiertas, con el error literal

| URL | Qué pasó |
|---|---|
| https://ruppro.colombiacompra.gov.co (Consulta RUP) | `curl: (60) SSL certificate problem: unable to get local issuer certificate`, dos veces (reintento único). No se desactivó la verificación TLS. |
| https://www.rues.org.co/ | Respondió 200 pero con 4.304 bytes de HTML: una cáscara de JavaScript cuyo único texto es el título `RUES Registro Unico Empresarial y Social`; el script principal (12,7 KB) carga el resto. No hay texto sobre qué muestra la consulta pública del RUP: lectura `no_abierta`, sin ficha. |
| https://www.alcaldiabogota.gov.co/sisjur/normas/Norma1.jsp?i=62512 | Respondió 200, pero es el Decreto Único Reglamentario 1077 de 2015 (vivienda), no el 1082. Descartada: era un identificador que probé de memoria. El inicio de `sisjur` es solo un buscador. |
| https://www.imprenta.gov.co/diario-oficial | Respondió 200; la página es un buscador por formulario (no se envió) y no permite ubicar el número ni la fecha del Diario Oficial del Decreto 0997. |

No se abrió (no se intentó): la «Guía rápida para la creación de proponentes plurales en el SECOP II», la
Circular Externa Única, el Documento Tipo de concurso de méritos de consultoría (v2), los Documentos Tipo de
infraestructura social y de agua y saneamiento, la Resolución 465 de 2024, la memoria justificativa y el informe
anual de capacidad financiera y organizacional de los Documentos Tipo de transporte, la Matriz 1 completa.

## 5. Problemas candidatos

Cada uno con etapa · decisión · tipo de contrato · fichas · consecuencia en plata (si la fuente la da).

1. **RUP sin renovar a tiempo: cesan sus efectos y el proponente queda fuera.** E0 · D1/D3 · todos · F-001. Plata: la
   fuente no la da.
2. **Experiencia inscrita en un código UNSPSC deshabilitado o distinto del que pide el pliego** (hay una «nueva
   versión» del clasificador cuyo estado en SECOP II y RUP no está verificado). E2 · D3 · todos · F-003, F-012, F-019,
   F-020. Plata: la fuente no la da.
3. **El reparto de participación en el plural fija cuánta experiencia aporta cada socio** (uno ≥ 50 %, los demás ≥ 5 %,
   un solo socio sin experiencia con tope de 10 % de participación) **y no se puede cambiar tras el cierre.** E2 ·
   D1 · obra (misma regla en interventoría) · F-009, F-013, F-018. Plata: la fuente no la da.
4. **La experiencia de contratos ejecutados antes en consorcio o unión temporal cuenta por el porcentaje de
   participación del RUP del socio** (valor × porcentaje). E2 · D1 · obra · F-010. Plata: no se cuantifica.
5. **Valor mínimo de experiencia en obra: 75 % del presupuesto oficial en SMMLV con 1 o 2 contratos, 120 % con 3 o 4,
   150 % con hasta 5** (6 o 7 contratos solo para Mipyme o empresas de mujeres). E2 · D1 · obra · F-011. Plata: la
   fuente da porcentajes del presupuesto oficial, no un monto.
6. **Concurso de méritos de interventoría: experiencia habilitante igual o mayor al 100 % del presupuesto oficial en
   SMMLV; el personal clave no se evalúa al seleccionar.** E2 · D1 · interventoría · F-013. Plata: porcentaje del
   presupuesto oficial.
7. **Capacidad residual: omitir en el Formato 5 un contrato en ejecución (incluidos privados, suspendidos o sin acta
   de inicio) lleva a rechazar la oferta aunque se descubra después del cierre, incluso por observación de un
   tercero en el traslado.** E2 · D3 · obra · F-016, F-014. Plata: no se cuantifica; hay exposición a acciones contra
   quienes firmaron las certificaciones.
8. **Capacidad residual de un plural: suma de las de los socios sin ponderar por participación; el saldo negativo de un
   socio se resta** (en cambio, el factor de experiencia E de cada socio sí se divide por su participación). E2 · D1 ·
   obra · F-015, F-014. Plata: no se cuantifica; ejemplo numérico de la guía en F-015.
9. **Grupo empresarial con varias ofertas en un proceso por lotes: la entidad debe evitar que se multiplique la misma
   capacidad financiera.** E2 · D1 · obra · F-017. Plata: no se cuantifica.
10. **Caución para impugnar un RUP (propio o del competidor): 10 % de la utilidad operacional del último registro del
    impugnado, o 1 % de los ingresos si no hay utilidad, vigente hasta un año después de la decisión.** E2 · D3 · todos
    · F-004. Plata: sí, esos porcentajes.
11. **Información inconsistente en el RUP: cancelación e inhabilidad de 5 años (permanente si reincide).** E0 · D3 ·
    todos · F-002. Plata: inhabilidad de 5 años; sin cifra.
12. **Sentencia civil de responsabilidad contractual queda en el RUP diez años.** E0 · D3 · todos · F-005. Plata: no.
13. **Transición del Decreto 0997: caución y reporte rigen ya; el resto por categoría de entidad; los procesos con
    Documento Tipo siguen con las reglas anteriores hasta nueva versión.** E2 · D3 · todos · F-006, F-007. Plata: no.
14. **Habilitantes financieros: fuera de Documentos Tipo y tras la gradualidad, la entidad no debe limitarse a la
    fórmula** (cómo se concreta, sin cubrir). E2 · D3 · todos · F-008. Plata: no.
15. **Oferta de un plural presentada desde una cuenta distinta al proponente plural registrado en SECOP II: rechazo.**
    E2 · D3 · obra (misma regla en interventoría) · F-018. Plata: rechazo; sin cifra.
16. **Los indicadores financieros de un plural se suman, no se ponderan** (un socio débil arrastra o un socio fuerte
    rescata; es una inferencia de la fórmula de suma). E2 · D1 · obra · F-018. Plata: no.

## 6. Lo que quedó sin cubrir

- **Firmeza del RUP**: ni la Ley 1150 art. 6 ni el Decreto 1082 (5.1 a 5.7) abiertos la definen; los Documentos Tipo
  piden RUP «vigente y en firme». Falta la Circular Externa Única u otra norma.
- **Versión del UNSPSC vigente en SECOP II y en el RUP**: solo hay la declaración de la guía (UNv260801, 18-mar-2025)
  y unas métricas de «nueva versión» sin fecha ni acto; los «comunicados» del módulo son de prueba. Códigos
  deshabilitados y equivalencias: el módulo lista 11.958 deshabilitados pero no da reemplazos; solo se probó una
  muestra por prefijo en los segmentos 72, 80 y 81 (límite de 100 filas).
- **Experiencia en concurso de méritos de consultoría** (estudios y diseños): su Documento Tipo no se abrió.
- **Matriz 1 de experiencia completa** y los demás sectores (social, agua y saneamiento).
- **Fecha de publicación del Decreto 0997 en el Diario Oficial**, y por tanto las fechas de entrada gradual.
- **Qué muestra la consulta pública del RUP** (RUES y consulta RUP de Colombia Compra): ninguna de las dos abrió.
- **Excepciones por modalidad**: solo la Ley 1150 art. 6; falta el cruce con selección abreviada, subasta y
  contratos de consultoría en la reglamentación y la Circular Externa Única.
- **Guía rápida de plurales en SECOP II** y cuenta del proponente plural.
- Jurisprudencia (Consejo de Estado) sobre RUP, experiencia y capacidad residual; la lente académica del eje 4 la
  cubre otro agente.

## 7. Observaciones para el PC1 (esquema y taxonomía)

- Un módulo web de la agencia (métricas de una «nueva versión» del clasificador) no encaja en ningún tipo ni nivel
  de autoridad; se marcó `dato` con A7 en F-020. Conviene una categoría para datos de plataforma.
- Los Documentos Tipo no tienen número de página en el .docx: los localizadores usan el numeral y la página que
  declara el índice del propio documento. Hay una referencia cruzada rota dentro del Documento Tipo de obra v4
  (el numeral 3.5.2 remite a «la tabla del numeral 3.5.8» pero la tabla está en el 3.5.9; el 3.5.8 es de
  subcontratos): se anotó en F-011.
- Discrepancias de nombre de las fuentes frente al encargo: la «Guía de codificación V3 2026» se titula
  «G-CBS-02, versión 2, marzo de 2026» (el archivo dice V3-2026); la guía de capacidad residual lleva el código
  CCE-EICP-GI-22 en el texto y CCE-REC-GI-22 en el pie y el archivo; es la versión 01 del 29-sep-2023 (anterior al
  decreto, que no toca el artículo 2.2.1.1.1.6.4).
- El campo `cita_textual` quedó entre 108 y 292 caracteres en todas las fichas (máximo ~300 del esquema).
- `url` de los Documentos Tipo: la URL que se abrió responde con redirección a la misma dirección sin barra final
  y entrega un .zip; el texto sale del .docx dentro del paquete.
