# Fase 2 · Eje 6 (Patologías) · lente institucional · notas del lector

> Para: sesión · Estado: referencia · Sustituido por: —

Lector: «lector fase2 eje6-institucional». Alcance: obra pública, interventoría y consultoría. Ids F-0701 a F-0742 (42 de 60). Fecha de consulta de todas las fichas: 2026-10-19.

## 1. Tiempos y cómo terminó
- Inicio: lunes 19-oct-2026 17:49:04 UTC (`date -u` al empezar).
- El rango F-0701 a F-0760 estaba vacío al empezar (no hubo reanudación efectiva: no existían fichas de este lector).
- **Terminó por el tope de 40 fuentes abiertas**, no por saturación ni por tiempo (unos 23 minutos del reloj de la sesión, lejos de los 90). La saturación no se alcanzó: entre las últimas diez fuentes todavía aparecieron problemas nuevos según la taxonomía (impugnación de un pliego direccionado, RUP como barrera, señales de ejecución de la Contraloría, falsa pluralidad con métodos de calificación). Quedaron 18 ids libres sin usar.
- Fin: lunes 19-oct-2026 18:12 UTC (`date -u` al cerrar: 18:11:30 al terminar de escribir estas notas y validar las fichas).

## 2. Fuentes intentadas y abiertas por tipo (claves de la taxonomía)
Se cuenta una fuente por dirección distinta que respondió y se leyó. Una página descargada y no leída no cuenta en la tabla; sumadas las dos descargadas sin leer (la copia de la Contraloría de una nota sobre la Ley 2020 y la portada de la Cámara Colombiana de la Infraestructura) a las 38 leídas, el total de fuentes abiertas llega a 40, que es el tope.

| Tipo | Intentadas | Abiertas |
|---|---|---|
| `control` | 24 | 17 |
| `ley` | 7 | 5 |
| `decreto` | 1 | 1 |
| `cce_concepto` | 1 | 1 |
| `juris` | 2 | 2 |
| `internacional` | 5 | 3 |
| `gremio` | 5 | 3 |
| `practica` | 6 | 6 |
| `doc_tipo`, `cce_guia`, `academia`, `dato` | 0 | 0 |
| **Total** | **51** | **38** |

Notas de conteo:
- `control` abiertas (17): informe de auditoría de la Contraloría sobre obras inconclusas 2007-2011 (F-0701); comunicados de la SIC de 4-mar-2026 (F-0704, F-0705), de 21-sep-2022 (F-0707), de 30-ago-2023 (F-0708), de 16-jun-2021 (F-0711), de 3-oct-2024 (F-0712) y de 15-jul-2025 (F-0740, F-0741); relatoría de la Resolución 30415 de 2021 de la SIC (F-0709, F-0710); boletines de la Procuraduría (F-0716, F-0717, F-0730, F-0736); comunicados de la Contraloría Nos. 064 de 2020, 091 de 2020, 186 de 2022 y 016 de 2022 (F-0718, F-0724, F-0721 a F-0723, F-0738, F-0739); preguntas frecuentes SIRECI (F-0737).
- `practica` abiertas (6): dos comunicados del Invías (F-0719, F-0720) y cuatro páginas de noticias de Colombia Compra (archivos 10011 → F-0713; 10012, 9591 y 8743 se leyeron sin ficha: repiten la misma noticia, una nota de prensa de 2017 con una cita de un exdirector y una página sin cuerpo).
- `gremio` abiertas (3): informe de Transparencia por Colombia sobre el compromiso post-acceso a la OCDE (leído, sin ficha: trata de adopción de SECOP II, no de patologías), informe «Elecciones & Contratos» (F-0729), comunicado de la Cámara Colombiana de la Infraestructura (F-0735). Además se bajó la portada de la Cámara para buscar un enlace; no se cuenta.
- `ley`: las cinco son páginas de la relatoría de Colombia Compra con el texto de Ley 2020 de 2020 (F-0702, F-0703), Ley 1474 de 2011 (F-0728), Ley 1955 de 2019 (F-0725, F-0726), Ley 2195 de 2022 (F-0742) y Ley 2294 de 2023 (solo para cotejar derogatorias). `decreto`: Decreto 0997 de 2026 (F-0727).
- `cce_concepto`: C-1642 de 2025 (enlazado en la página de la Ley 2020; se leyó y trata de otra cosa, sin ficha).
- `juris`: Sentencia C-080 de 2025 (F-0706) y sentencia del Consejo de Estado del 19-may-2025, exp. 69.503 (F-0731, F-0732).
- `internacional`: caso de estudio del Banco Mundial sobre reformas de contratación abierta (F-0714, F-0715), informe de la OCDE de 2022 sobre el RUP (F-0733), resumen de una revisión de literatura de K4D (F-0734).
- Una página de la Contraloría (copia de una nota sobre la Ley 2020) se descargó y no se leyó; no cuenta.

## 3. Fuentes no abiertas, con el error literal
| Dirección | Qué pasó |
|---|---|
| https://one.oecd.org/document/DAF/COMP/LACF(2016)18/es/pdf | HTTP 403; el cuerpo es la página «Just a moment...» del servicio anti-robot |
| https://www.oecd-ilibrary.org/governance/towards-efficient-public-procurement-in-colombia/evaluation-criteria-to-award-contracts-in-the-colombian-public-procurement-system_9789264252103-6-en | HTTP 403 |
| https://sic.gov.co/noticias/por-cartelizacion-empresarial-al-interior-de-una-licitacion-publica-ante-el-INVIAS-superindustria-sanciona-a-firmas-de-ingenieria | curl: (60) SSL certificate problem: unable to get local issuer certificate (no se desactivó la verificación) |
| https://www.sic.gov.co/recursos_user/documentos/articulos/2010/Guia_Contratacion.pdf | el mismo error de certificado curl (60) |
| https://sidn.ramajudicial.gov.co/…/Ley 2020 de 2020 (Crea el Registro Nacional de Obras Civiles Inconclusas).pdf | primero curl: (3) URL rejected: Malformed input to a URL function (por los espacios); con la dirección codificada, HTTP 404 |
| https://www.alcaldiabogota.gov.co/sisjur/normas/Norma1.jsp?i=100018 | HTTP 200 sin contenido (página «Cargando el Contenido del Documento», se arma con JavaScript). Esta dirección la armé yo con un número que no aparecía en ninguna búsqueda: no se usó para ninguna ficha |
| https://www.contraloria.gov.co/en/web/registro-de-obras-inconclusas | HTTP 403 (cuerpo de 581 bytes); el registro de la Contraloría no se pudo consultar |
| https://www.contraloria.gov.co/en/w/alerta-la-contralor%C3%ADa-menos-de-10-de-avance-f%C3%ADsico-o-financiero-reportan-proyectos-con-recursos-dirigidos-a-pol%C3%ADtica-de-construcci%C3%B3n-de-paz | HTTP 403 (cuerpo de 581 bytes) |
| https://www.contraloria.gov.co/en/w/contralor%C3%ADa-abri%C3%B3-proceso-de-responsabilidad-fiscal-por-23.308-millones-por-deficiencias-y-da%C3%B1os-en-la-construcci%C3%B3n-del-puente-hisgaura | HTTP 200 con la página armada sin el texto del comunicado (se carga por JavaScript); no se encontró la variante de dirección que sirva el cuerpo |
| …/contraloria.gov.co/en/w/por-riesgos-en-su-ejecucion-…-ocad-paz-… y …/en/w/tras-alerta-…-35-obras… | HTTP 200 con la página sin el cuerpo; el cuerpo salió abriendo la variante sin «/en» que devolvió la búsqueda; las fichas citan esa variante, que fue la que respondió con el texto |
| https://www.repository.fedesarrollo.org.co/handle/11445/3544 y …/bitstream/handle/11445/4213/Co_Eco_Diciembre_2021_Kahn_y_Saavedra.pdf | HTTP 200, pero la respuesta es una página HTML de Anubis («Making sure you're not a bot!… Anubis could not load its JavaScript»). No se intentó saltarla: Fedesarrollo quedó sin leer |

## 4. Problemas candidatos
La señal en SECOP II dice si el problema se puede ver en los datos abiertos de la plataforma; «no medida» significa que la señal es plausible pero este lector no calculó nada (no hubo descargas de datos, solo lectura de fuentes). Montos tal como los da cada fuente; las cifras que no cuadran se señalan en la ficha.

| # | Título | Etapa | Decisión | Contrato | Fichas | Consecuencia en plata (si la fuente la da) | Señal en SECOP II |
|---|---|---|---|---|---|---|---|
| 1 | Pliego a la medida o requisito habilitante que direcciona | E1 / E2 | D1, D3 | todos | F-0709, F-0710, F-0713, F-0716, F-0717, F-0723, F-0731, F-0732 | Un contrato de vigilancia por 849.605.341 pesos quedó con un único proponente tras cláusulas restrictivas (F-0717). La Colombia Compra reclamó «ahorro de hasta 10 %» al subir los oferentes; la cifra no se verificó (F-0713) | Parcial: número de ofertas por proceso medible; el contenido de un requisito (domicilio, índices) no es detectable sin leer el pliego |
| 2 | Proponente único y baja competencia | E2 | D1 | todos / obra | F-0713, F-0714, F-0715, F-0733 | El caso de estudio da un 7 % más de costo en procesos de un solo oferente, sin la fuente (F-0715); 56 % de los contratos regionales de 2017 con un oferente (F-0714) | Medible: ofertas por proceso (depende de que la entidad publique las ofertas; lotes) |
| 3 | Reparto de procesos entre empresas aliadas («carrusel») | E2 | D1 | obra | F-0704, F-0706, F-0707, F-0709, F-0711 | 3.106.861.964 pesos en multas por 259 procesos de obras hídricas (F-0707); 956.860.540 pesos por mantenimiento y adecuación locativa (F-0711); 13 decisiones, 136 personas, más de 66 mil millones en multas en toda la contratación estatal, no solo obra (F-0704); prisión de 6 a 12 años para quien se concierte (F-0706) | Parcial: adjudicatario repetido por entidad, proponentes que nunca ganan, retiros; el reparto por zonas o turnos requiere cruzar procesos |
| 4 | Falsa pluralidad: empresas o consorcios vinculados compiten entre sí, y el método de calificación de la oferta económica se manipula | E2 | D1, D2 | obra, interventoría | F-0708, F-0712, F-0726, F-0740, F-0741, F-0728 | 5.730.517.858 pesos de un concurso de méritos de interventoría (F-0708); multas de 577.561.873 y 945.216.729 pesos en concursos de interventoría del INVIAS (F-0712); al menos 13 de 151 procesos coincidentes con ofertas coordinadas en tres de cuatro métodos de calificación (F-0740) | Medible con cruce: dos proponentes que coinciden mucho, integrantes comunes en consorcios distintos del mismo proceso, ofertas cercanas a la media. Las direcciones y teléfonos no sirven para vincular (F-0741) |
| 5 | Obra inconclusa y registro público que alcanza al contratista y al interventor | E4 / E5 | D1, D4 | obra | F-0701, F-0702, F-0703, F-0718, F-0724, F-0737 | 5.364 millones de daño fiscal presunto en 51 viviendas inconclusas (F-0718); 1.300 elefantes blancos, obras inconclusas y proyectos críticos por 20 billones en julio de 2020 (F-0724) | Parcial: obras con liquidación vencida más de un año; el registro de la Contraloría no se pudo consultar (403) |
| 6 | Plazo contractual irreal, firma de fin de año y prórrogas en cadena | E3 / E4 | D4 | obra | F-0701, F-0718 | Plazo de 3 días para 51 viviendas y cuatro prórrogas (F-0718); en otro caso una prórroga de 86 días llevó el contrato de 3 a 6 meses y la interventoría se adicionó en 39,8 millones, según el texto del informe (F-0701) | Medible: contratos firmados en diciembre con plazo de días y prórrogas posteriores |
| 7 | Estudios previos deficientes que se pagan en adiciones | E1 / E4 | D4 | obra, interventoría | F-0701, F-0734, F-0718 | Las adiciones al objeto y al presupuesto «injustificadas» (F-0701) | Parcial: adiciones y prórrogas por contrato |
| 8 | Pagos tardíos: la factura se cobra por turno y por cupo de caja | E4 | D4 | todos | F-0719, F-0720, F-0735 | El gremio habló de cerca de 600.000 millones adeudados por actas (26-feb-2026, F-0735); el Invías informó 422.000 millones asignados entre marzo y abril de 2026 (F-0720); los dos montos no son comparables | No detectable (la fecha de pago no está en los procesos abiertos) |
| 9 | Pagos y anticipo por encima del avance físico | E4 | D4 | obra | F-0722, F-0739 | Pagos por 987.879.556 pesos con 0 % de avance físico (F-0722); 230.000 millones parados en fiducias (F-0739) | Parcial: solo con datos de ejecución de contratos |
| 10 | Interventoría que pesa casi un cuarto del contrato vigilado | E1 | D2 | interventoría | F-0721 | 1.738.084.431 pesos frente a 7.295.890.509 del contrato de estudios (23,8 %) | Medible si se enlazan los dos contratos |
| 11 | Obra fuera del concurso abierto: convenios interadministrativos, régimen especial, invitaciones a «aliados», convenios solidarios no publicados | E1 / E2 | D1 | obra | F-0723, F-0730, F-0736 | 3,3 billones en 918 convenios con 19 «contrataderos» (F-0730); 233.853 millones en 1.035 convenios solidarios, gran parte sin publicar en SECOP II (F-0736) | Parcial: contratos interadministrativos y de régimen especial son visibles; los no publicados no son detectables |
| 12 | Inhabilidad por incumplimiento reiterado que se extiende a los socios, y reporte al RUP | E2 / E5 | D1, D3 | todos | F-0725, F-0726, F-0727, F-0742 | Inhabilidad de 3 años (F-0725); sanciones y multas de hasta 200.000 salarios mínimos e inhabilidad hasta 20 años solo por soborno de servidor extranjero (F-0742) | No medible hasta que el RUP publique multas e inhabilidades (el Decreto 0997 de 2026 lo ordena; su publicación en el Diario Oficial no se verificó) |
| 13 | Financiadores de campaña que contratan e inhabilidad del art. 2 de la Ley 1474 | E2 | D3, D1 | todos | F-0728, F-0729 | Cerca de un tercio de los financiadores contrató con el Estado (F-0729), sin que el informe pruebe causalidad | No detectable con SECOP II solo (exige el cruce con Cuentas Claras) |
| 14 | Impugnar un pliego direccionado cuesta años y rara vez devuelve el contrato | E2 | D1 | todos | F-0731, F-0732 | Proceso iniciado en 2013 y fallado en 2025; se anuló solo el requisito de domicilio y se negó anular la adjudicación | No detectable |
| 15 | El RUP lento o exigente como barrera de entrada | E0 | D1 | todos | F-0733 | Plazo legal de 15 días a las cámaras de comercio (OCDE, 2022) | No detectable |
| 16 | Proyectos de obra en riesgo por señales de ejecución (sin contratista, avance 0 a 10 %, suspensiones de más de tres meses, desfase) | E4 | D4 | obra | F-0738, F-0739 | 53 proyectos de vivienda con alertas por más de 455 mil millones (el comunicado también dice «cerca de medio billón»; el porcentaje de Cesar no cuadra) | Parcial: suspensiones y avance si están en los datos de ejecución |

Observaciones transversales:
- **Una acusación no es una sanción.** F-0705, F-0708, F-0716 y F-0740 documentan investigaciones abiertas o pliegos de cargos; las fichas lo dicen. Ninguna se debe mostrar como culpabilidad.
- **Cifras que no cuadran en la propia fuente** (no se repiten como hecho): F-0713 (el 560 % de aumento no es compatible con pasar de «entre una y tres» propuestas a 42,5); F-0712 (3 procesos frente a hasta 31); F-0739 (16 % frente a 17,9 %).
- **Muchas fuentes no son de obra**: F-0704, F-0716, F-0717, F-0731, F-0732 y F-0742 tratan de otros objetos o de soborno internacional; se usaron como precedente de la regla, y la ficha lo dice.
- **Entidades y empresas** aparecen con nombre solo cuando la fuente es una entidad pública y el dato es un total (por ejemplo, los 19 «contrataderos» son entidades). Ninguna ficha lleva nombres de personas ni de empresas de una investigación.

## 5. Temas de la lista del eje: cubiertos y sin cubrir
Cubiertos:
- Pliego sastre y direccionamiento: Procuraduría (F-0716, F-0717), SIC (F-0709, F-0710), Consejo de Estado (F-0731, F-0732), Contraloría (F-0723) y Colombia Compra (F-0713).
- Proponente único y baja competencia, con cifras publicadas: Banco Mundial (F-0714, F-0715) y Colombia Compra (F-0713).
- Colusión: SIC en obra e interventoría (F-0704, F-0707, F-0708, F-0711, F-0712, F-0740) y el delito del art. 410A del Código Penal (F-0706).
- Obras inconclusas: Ley 2020 de 2020 (F-0702, F-0703) y casos y cifras de la Contraloría (F-0701, F-0718, F-0721 a F-0724, F-0737, F-0738, F-0739).
- Pagos tardíos: Invías y gremio (F-0719, F-0720, F-0735).
- Inhabilidades y sanciones del socio: art. 90 de la Ley 1474 (por la Ley 1955, art. 43), Ley 2195 y Decreto 0997 de 2026 (F-0725 a F-0728, F-0742).
- Concentración del ganador: solo parcial (señales de la SIC en F-0709 y el cruce de financiadores en F-0729).

Sin cubrir o cubiertos a medias:
- OCDE sobre competencia en contratación pública colombiana: el documento de 2016 respondió 403 y OECD iLibrary también; solo se leyó el informe de 2022 sobre el RUP.
- Fedesarrollo (índice de riesgo de corrupción en compra pública, que mide persistencia y concentración de contratistas): bloqueado por Anubis, sin leer.
- Cifras actuales de procesos de un solo proponente en obra con datos abiertos de SECOP II: no se calcularon (solo lectura de fuentes; sin descargas masivas). Las cifras publicadas halladas son de 2017 a 2020.
- Concentración del ganador en obra con cifra publicada reciente (porcentaje del valor adjudicado en pocos contratistas): no se halló fuente primaria.
- Registro Nacional de Obras Civiles Inconclusas de la Contraloría y el balance de 2026 («Salvando Obras», con 1.970 proyectos y 67,07 billones según la prensa): el registro respondió 403 y la cifra de 2026 solo apareció en medios, sin fuente primaria abierta.
- SIRI de la Procuraduría y certificados de antecedentes del socio: no se abrió (consulta interactiva, no se imita por POST).
- Texto consolidado del art. 410A del Código Penal y sentencias de constitucionalidad posteriores sobre el art. 43 de la Ley 1955 de 2019: no se abrieron; la vigencia de F-0725 y F-0726 se declaró con la relatoría y tres normas cotejadas, sin sentencias.
- Ley 2024 de 2020 y reglas legales de plazo de pago a contratistas del Estado: no se buscaron.
- Cartilla de Colusiones de la SIC (la menciona el comunicado de marzo de 2026): no se encontró el documento.

## 6. Limitaciones que el siguiente paso debe saber
- Casi todo lo hallado es **comunicado de prensa de una entidad** (A7): documenta lo que la entidad dice haber visto, no una decisión firme. Las fichas de ley (F-0702, F-0703, F-0725 a F-0728) tienen la vigencia sin verificar o verificada solo con la relatoría de Colombia Compra y las normas cotejadas que la ficha lista.
- **Fechas de las cifras:** los comunicados de 2020 a 2022 no se actualizaron; los montos y los conteos valen para su fecha.
- **Para Detekta:** las señales del cuadro 4 con «medible» o «parcial» son candidatas a pasar por la verificación de la Fase 3 con datos reales; ninguna se calculó aquí.
- **Aviso sobre el entorno compartido:** otro lector (eje 6, lente académica) escribía en el mismo directorio temporal de la sesión; sobrescribió a mitad de la corrida una herramienta mía de validación de fichas (`tools/mk.js`). Se rehízo en un directorio propio y las fichas ya escritas no se tocaron.

