# Fase 2 · Eje 7 (SECOP II, datos abiertos, señales de alerta) · lente académica

> Para: sesión · Estado: referencia · Sustituido por: —

- **Lector:** lector fase2 eje7-academica. Rango F-0881 a F-0940.
- **Inicio de esta corrida (reanudación):** 2026-10-02 14:09:54 UTC. **Fin:** ver última línea (`date -u`).
- **Esta corrida no escribió fichas:** el rango llegó lleno (60 de 60, F-0881 a F-0940) de la corrida cortada por el límite de la sesión. Se leyeron las 60 para evaluar cobertura; no se abrió fuente nueva ni se editó ficha alguna.
- **Cómo terminó:** rango lleno (tope de 60 ids). La lectura previa quedó en 20 fuentes distintas (tope de 40 no alcanzado) y no hay registro de tiempo ni de saturación de la corrida cortada: no se declara saturación.

## Fuentes intentadas y abiertas por tipo (según las 60 fichas; claves de la taxonomía)
Intentadas y no abiertas de la corrida cortada: sin registro (la corrida murió antes de dejar notas). Solo consta lo abierto.

| Tipo | Fuentes abiertas | Fichas |
|---|---|---|
| academia | 8 (DT 120 Uniandes, tesis Utadeo, Redalyc 1942, Redalyc 6559, VigIA/Data & Policy, Dialnet 10033623, tesis Uniandes INVIAS, tesis Poligran) | 33 |
| gremio | 5 (IA-OCP working paper, Fedesarrollo CPBD, 3 páginas de OCP) | 16 |
| internacional | 2 (Banco Mundial DPO 2, diagnóstico RICG 2021) | 4 |
| dato | 5 (p6dx-8zbt, jbjy-vk9h, ceth-n4bn, cb9c-h8sn, dmgg-8hin) | 7 |
| ley, decreto, doc_tipo, cce_guia, cce_concepto, juris, control, practica | 0 (fuera de lente) | 0 |

Todas las fichas son `parcial` salvo F-0926 a F-0929 (`completa`). Ninguna lleva `verificacion_adversaria` (la llena la Fase 3).

## No abiertas con el error literal
Ninguna registrada: la corrida cortada no dejó lista de fallos. No se reintentó nada en esta reanudación.

## Problemas candidatos (señal observable en datos abiertos de SECOP II entre corchetes)
1. **El dato abierto contradice al documento del contrato** (valor, plazo, adiciones, estado). Etapa E0, decisión D1/D2, M-ING/M-INT, tipo todos. Fichas F-0881, F-0884, F-0885, F-0893, F-0910, F-0932, F-0933. Plata: el precio de referencia que se toma del dato puede estar mal. Señal: valor_del_contrato <= 0 en 196.699 de 6.092.927 contratos (3,2%) (F-0924); precio_base <= 0 en 349.311 procesos (3,8%) y 1.336 de 146.816 de obra (0,9%) (F-0923).
2. **Filas duplicadas por proceso** (conteo por filas multiplica procesos). E0, D1, M-ING, todos. F-0897, F-0922. Señal: 437.238 filas sobrantes (4,7%) el 2-oct-2026.
3. **Estados incoherentes** (adjudicado con apertura «Abierto», «Adjudicado» sin adjudicar, «No Definido»). E2, D1, M-ING, todos. F-0891, F-0892, F-0925. Señal: 575.704 filas con departamento «No Definido» (6,2%); 4.151 adjudicadas con valor cero; 1.746 de obra con estado Abierto y adjudicadas.
4. **Fechas incoherentes** (firma posterior al inicio, sin fecha de firma, publicación tardía, cero días). E3, D4, M-ING/M-INT, todos. F-0891, F-0898, F-0899, F-0900, F-0901, F-0918, F-0924. Señal: 210.360 con firma posterior al inicio (3,5%) y 428.414 sin firma (7,0%).
5. **Mismo NIT con varios nombres y registros que desaparecen entre descargas.** E0, D1, M-INT/M-ING, todos. F-0887, F-0889, F-0917. Señal: llave por NIT, no por nombre; comparar descargas. [no detectable] la desaparición salvo por snapshots propios.
6. **Cobertura parcial de SECOP II** (SECOP I y II conviven; régimen especial y empresas del Estado fuera). E0, D1, M-ING, todos. F-0882, F-0903, F-0904, F-0905, F-0906, F-0907, F-0909, F-0912, F-0915, F-0916, F-0931. Plata: el Banco Mundial da 72% del valor en SECOP II y 28% en SECOP I (marzo 2024, F-0912). Señal: [no detectable] qué procesos viven solo en SECOP I.
7. **Modificaciones sin monto ni plazo en el conjunto de adiciones.** E4, D4, M-NUEVO, todos. F-0895, F-0939. Señal: cb9c-h8sn trae tipo y fecha, no valor ni días; 48,6% son «Modificacion General».
8. **Sin número de proponentes ni fecha de anuncio de adjudicatario como campo** (competencia). E2, D1, M-TARJ/M-INT, todos. F-0901, F-0928, F-0929, F-0930. Señal: proponentes por proceso solo vía el conjunto de proponentes; fecha de anuncio [no detectable].
9. **Lista de documentos por proceso solo desde 2025** (dmgg-8hin, 74.939.975 filas); nombres de archivo, no contenido; riesgo de leer «sin documentos» por falta de rigor. E2, D3, M-VIGIA, todos. F-0919, F-0920, F-0940.
10. **Plataforma sin acuse de radicación inequívoco y sin corrección tras enviar la oferta** (descalificación por error menor). E2, D3, M-F1, obra (encuesta de infraestructura). F-0935, F-0937. Señal: [no detectable]. Uso de SECOP II por tamaño (microempresa 52,9%, pequeña 90,9%, mediana 100%, F-0936).
11. **Concurso de méritos publicado temporalmente en SECOP I** (Decreto 399 de 2021, según el autor). E2, D1, M-ING, consultoría. F-0905. Señal: [no detectable]; la norma se cita desde su texto, no desde el autor.
12. **Datos de consorcios incompletos** (participación, «No definido», líder). E2, D1, M-CONS, todos. F-0927, F-0938.
13. **Precios realmente pagados no públicos** (sin acta final de cantidades); se asume el adjudicado. E5, D2, M-APU, obra. F-0913, F-0914. Plata: el descuento sobre presupuesto oficial subió tras los pliegos tipo y los admisibles bajaron de 86 (2016) (F-0914, cifra parcial en la ficha).
14. **Indicadores financieros del pliego sin relación con cuantía** (Valle del Cauca, 50 licitaciones). E2, D3, M-K, obra. F-0894.
15. **Alertas de riesgo con muchos falsos positivos; una señal aislada no es irregularidad.** E0, D1, M-TARJ, todos. F-0886, F-0934, F-0902. Señal: combinar varias.
16. **Copia OCDS de OCP congelada en abril de 2022**; proveedores con identificador «1». E0, D1, M-ING/M-CONS. F-0926, F-0927.

## Temas cubiertos (de la lista del eje 7, lente académica)
Calidad del dato en trabajos que usan SECOP (valor, fechas, duplicados, NIT, estados); señales de alerta (precio_base 0, «No Definido», duplicados); cobertura SECOP I/II; adiciones; consorcios; documentos del proceso; competencia/proponentes; obligatoriedad de SECOP II (según doctrina); usabilidad para proveedores de obra; conteos vivos de p6dx-8zbt, jbjy-vk9h, ceth-n4bn, cb9c-h8sn, dmgg-8hin.

## Temas sin cubrir
- Diccionario de columnas completo de ofertas (wi7w-2nvm), proponentes (hgi6-6wh3) y PAA (9sue-ezhx): sin ficha.
- Releases de SECOP II 2025 y 2026 y manuales de formación virtual para proveedores (lente institucional).
- «Confidencial», «Prueba» y NIT compartidos entre proponentes: sin ficha propia.
- reCAPTCHA y WAF de community.secop.gov.co (cubierto por el eje institucional y las instrucciones comunes).
- Datasets que el repositorio no usa (sanciones SIC, garantías, proveedores registrados): citados solo vía F-0883 y F-0896.
- Trabajos académicos 2024 a 2026: casi todo lo leído es de 2019 a 2022; reverificar contra el SECOP II actual.

Fin: ver `date -u` al cierre.
Fri Oct  2 14:10:35 UTC 2026
