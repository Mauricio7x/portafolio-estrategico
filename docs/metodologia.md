# Metodología de cálculo del costo real (Fase 1 · Detekta v3)

Documento público y auditable. Cada fórmula, porcentaje y norma que usa el editor de APU para
costear la mano de obra y los costos indirectos, con el **estado de verificación** de cada
parámetro. Los valores viven en `apu:parametros` (editables en *Mi empresa → Sistema →
Parámetros de costo*) y se sirven en `GET /api/apu?op=parametros`; la pestaña *Precios* los enseña
en «Cómo calculamos» y rehace el ejemplo en el navegador con `public/costos.js`, el **mismo
módulo** que usa el servidor (`lib/costos.js` lo re-exporta; no hay copia).

**Última auditoría: 2026-08-15. Contraste con las fuentes primarias del IDU y del INVIAS: 2026-08-16 (§7).**

---

## 1. Auditoría previa: ¿qué divisor de horas usa el catálogo? — NINGUNO

Antes de tocar una fórmula se despejó el costo implícito de la mano de obra en tres APU del
catálogo (Bogotá / Sabana, catálogo del repositorio):

| APU | Línea de mano de obra | Rendimiento (u/día) | Jornal base ($/día) | Jornal aplicado ($/día) | Días por unidad | Subtotal MO |
|---|---|---|---|---|---|---|
| NOG-A2 · Desmonte de cubierta en teja de asbesto cemento | cuadrilla 1 of + 1 ay | 22,89 | 238.010 | 368.915,50 (×1,55) | 0,04369 | $16.117 |
| INV-PH.1 · Placa huella en concreto 3.000 PSI e=0,15 | cuadrilla 1 of + 3 ay | 18 | 313.053 | 485.232,15 (×1,55) | 0,05556 | $26.957 |
| INV-640.1 · Acero de refuerzo figurado e instalado | cuadrilla 1 of + 1 ay | 120 | 170.661 | 264.524,55 (×1,55) | 0,00833 | $2.204 |

En los tres casos `subtotal_MO ÷ días_por_unidad = jornal_base × 1,55` **exactamente**: el único
multiplicador entre el jornal declarado y el subtotal es el factor prestacional regional (1,55).
**No existe divisor de horas**: la mano de obra se cotiza **por día** (18 líneas de mano de obra;
174/174 ítems la llevan) y el motor calcula `cantidad ÷ rendimiento` en *días por unidad*
(`lib/apu/catalogo.js`, `costoDirecto`). El equipo va 40 líneas por día, 5 por hora y el resto por
unidad o global; ninguna se divide por 8, 7,33 ni 210 (`CLAUDE.md`, «Costo horario no se puede
publicar»).

**Conclusión:** la premisa «el catálogo usa divisor 220» no describe este catálogo. Corregir un
divisor inexistente sería la tercera premisa falsa del plan maestro (tras «regex sobre `fase`» y
«perfiles duplicados», `docs/datos.md` §1). Lo que sí toca la Ley 2101 de 2021 es **el contenido
del día** (§3).

## 2. Modelo de costo de mano de obra (costo por hora)

Parámetros de arranque (`lib/parametros.js` → `DEFAULTS`; todos editables):

| Parámetro | Valor | Norma / origen | Estado |
|---|---|---|---|
| Vigencia | 2026-07-15 | Ley 2101/2021 art. 2 (42 h desde esa fecha) | verificado |
| Salario mínimo mensual | $1.750.905 | Decreto 1469/2025, **suspendido provisionalmente** por el Consejo de Estado (auto 12-feb-2026, ratificado 14-abr-2026); rige **transitoriamente** por el Decreto 159 de 2026 hasta la sentencia | verificado |
| Auxilio de transporte | $249.095 (aplica si salario ≤ 2 SMMLV) | Decreto 1470 de 2025 art. 1 (texto leído) | verificado |
| Horas pagadas al mes (`divisorAPU`) | 210 | IDU BPR: hora = jornal ÷ (h/sem ÷ 6), jornal = mes ÷ 30 → 30 × 7 h; INVIAS APU 2026-1: 42 h → 7 h/día (§7) | verificado |
| Jornada legal al mes | 210 h | Ley 2101/2021 | verificado |
| Horas por semana vigente | 42 | Ley 2101/2021 | verificado |
| Horas por semana al calibrar el catálogo | 44 | contrato Nogal, 2025 (§3) | **supuesto declarado** |
| Cesantías | 8,333 % | CST art. 249 | verificado |
| Intereses a las cesantías | 1,000 % | Ley 50/1990 art. 99 | verificado |
| Prima de servicios | 8,333 % | CST art. 306 | verificado |
| Vacaciones | 4,167 % | CST art. 186 | verificado |
| Salud (empleador) | 8,500 % | Ley 100/1993 art. 204 mod. Ley 1122/2007 art. 10 | verificado · exonerable |
| Pensión (empleador) | 12,000 % | Ley 100/1993 art. 20 mod. Ley 797/2003 art. 7 | verificado |
| Caja de compensación | 4,000 % | Ley 21/1982 | verificado |
| SENA | 2,000 % | Ley 21/1982 | verificado · exonerable |
| ICBF | 3,000 % | Ley 27/1974; tarifa Ley 89/1988 | verificado · exonerable |
| Exoneración de aportes | activa | E.T. art. 114-1: salud + SENA + ICBF, salarios < 10 SMMLV; personas jurídicas y naturales con ≥ 2 trabajadores | verificado |
| Riesgos laborales (ARL) | clase V · 6,960 % (I 0,522 · II 1,044 · III 2,436 · IV 4,350 · V 6,960) | D.-L. 1295/1994 art. 27; D. 768/2022; clase por centro de trabajo D. 1072/2015 art. 2.2.4.3.5 | verificado |
| Tiempo pagado no laborado (TPNL) | 22,5 % | 26,67 % − vacaciones 4,17 % (ya contadas), de fuentes secundarias; **no aparece en el IDU ni en el INVIAS** (§7) | **referencia, sin fuente oficial** |
| Mayor valor prestacional (MVP) | 14,72 % | 17,45 % × (22,5 / 26,67), de fuentes secundarias; **no aparece en el IDU ni en el INVIAS** (§7) | **referencia, sin fuente oficial** |
| Herramienta menor | 5 % de la mano de obra | INVIAS APU Regionalizados 2026-1: línea «HERRAMIENTA MENOR (% MANO DE OBRA)» = 0,05 en todos los APU | verificado |
| Elementos de protección personal | 3 % de la mano de obra | práctica sectorial; el IDU la cotiza como insumos con precio y el INVIAS la absorbe en su factor global — ninguno publica un % (§7) | **referencia, sin fuente oficial** |
| IVA sobre la utilidad | 19 % **solo sobre la U** | art. 3 D. 1372/1992, hoy art. 1.3.1.7.9 D. 1625/2016 | verificado |

**Fórmula** (`lib/costos.js · costoHora`):

```
costo_mensual_base  = salario + auxilio_transporte (si salario ≤ 2 SMMLV)
recargo             = Σ prestaciones aplicables + ARL(clase)
                      (con exoneración activa y salario < 10 SMMLV se descuentan salud, SENA e ICBF)
costo_mensual_total = costo_mensual_base × (1 + recargo)
costo_hora          = costo_mensual_total × (1 + TPNL + MVP) / divisorAPU
```

Recargos que salen de la tabla: **58,29 %** nominal · **44,79 %** con exoneración — idénticos a
los que publica `lib/apu/normativa.js`, y hay prueba que los ata.

Ejemplo (salario mínimo, exoneración activa): $2.000.000 × 1,4479 = $2.895.860 al mes → × 1,3722
÷ 210 = **$18.922 por hora** ($20.687 sin exoneración).

Por qué TPNL 22,5 % y no 26,67 %: la Metodología B del IDU incluye las vacaciones en el 26,67 %, y
las vacaciones ya están en las prestaciones (4,167 %); contarlas dos veces infla el costo. El MVP
se ajusta en la misma proporción. Por qué el divisor son 210 horas pagadas y no 174 productivas:
descontar del divisor el tiempo no laborado **y además** cobrarlo como TPNL lo contaría dos veces.

## 3. Cómo entra la Ley 2101 en un catálogo cotizado por día

Los jornales y rendimientos del catálogo (157 ítems `NOG-*` calibrados con un contrato adjudicado
en Bogotá en 2025, más los INVIAS/edificación) describen un día de trabajo bajo la jornada vigente
en 2025 (**44 h** desde el 15-jul-2025; 46 h antes — el catálogo no guarda la fecha exacta del
contrato, por eso 44 va declarado como *supuesto*). Desde el 15-jul-2026 rige la jornada de
**42 h**: el mismo día pagado rinde menos horas y, a jornal diario constante, un rendimiento medido
en unidades/día cae en la misma proporción.

```
factor_jornada = horas_semana_calibracion / horas_semana_vigente = 44 / 42 = 1,0476
días_MO_por_unidad (vigente) = (1 / rendimiento) × factor_jornada
```

- Se aplica a la **cantidad** (días) de las líneas de mano de obra, **no al jornal** (que es el
  dato calibrado). Cada línea publica `factor_jornada` y `cantidad × precio = valor` sigue
  cuadrando a mano; la hoja «APU» del Excel lo escribe en la descripción («días × 1,048 por
  jornada de 42 h»).
- **No** se aplica al equipo: la mayoría se alquila por día calendario y no hay evidencia de que la
  tarifa esté atada a la productividad de la cuadrilla; extenderlo sería asumir. Queda como
  tarea pendiente medible.
- Sin parámetros (`parametros: null`) el motor calcula **exactamente** como antes: así se prueba
  la calibración Nogal (149/157 ítems al peso, `tests/e2e.js`). El handler de `calcular` y
  `cotizar` **siempre** carga los parámetros (Redis → `DEFAULTS` si no hay nada guardado, y lo
  declara en `parametros_costo.fuente`).

**Impacto medido sobre los 174 ítems del catálogo (Bogotá / Sabana), factor 44/42 y EPP 3 %:**

| Medida | Resultado |
|---|---|
| Mano de obra | **+4,76 %** en los 174 ítems (exacto: 44/42 − 1) |
| Costo directo, promedio simple por ítem | **+2,37 %** |
| Costo directo, ponderado por valor | **+1,03 %** |
| Peso de la mano de obra en el costo directo (Bogotá) | 13,0 % |
| Materiales, equipo y transporte | sin cambio (prueba por ítem) |

Dirección: **al alza**, como preveía el encargo; magnitud menor que el 4,8 % «sobre el costo»
porque ese 4,8 % es sobre la **mano de obra**, que pesa el 13 % del costo directo en este catálogo.
La cifra se recalcula y se imprime en cada corrida de la suite (`· motor de costo real: …`).

## 4. Costos indirectos

- **Herramienta menor** y **EPP**: porcentaje sobre la **mano de obra** (INVIAS), nunca sobre el
  costo directo total. Se publican como capítulos propios (`herramienta_menor`, `epp`) y en la hoja
  APU van en la sección de EQUIPO, que es donde el motor los suma.
- **Administración — dos metodologías, una sola función** (`lib/costos.administracion`):
  - *Porcentaje* (INVIAS, licitación pública de infraestructura; predeterminada en la app):
    `administración = costos_directos × %A`.
  - *Tiempo* (IDU 2.2.2): `costo_hora_admin = gastos_fijos_mensuales / jornadaLegalMes`;
    `administración = horas_proyecto × costo_hora_admin`. Al elegirla en *Ajustes*, la **A % se
    deriva** (`administración ÷ costos_directos`) y resumen, Excel y PDF —que leen `aiu_pct`—
    dicen lo mismo por construcción; hay prueba de que las dos dan el mismo precio de venta.
    Sin gastos fijos u horas cae al porcentaje **y lo avisa** (nunca una A vacía en silencio).
  - Se conserva el porcentaje como predeterminado —y no «tiempo», como sugiere el encargo— porque
    exige un dato (gastos fijos) que el usuario no siempre tiene: un valor por defecto que produce
    nada es peor que uno que produce un 15 % declarado.
- **IVA**: 19 % **únicamente sobre la utilidad**. El motor no lo suma al precio final; la hoja de
  Excel sí lo suma a su TOTAL, como cierra la referencia — las dos mitades van dichas.
- **AIU de subcontratista** (16-ago-2026): un ítem se marca **subcontratado** (casilla por fila en
  el paso 3, o columna «SUBCONTRATADO» del Excel) con el **AIU que el subcontratista lleva dentro de su
  precio** (%, opcional; columna «AIU SUB»). Entra al costo directo por el precio del sub; la casilla
  de Ajustes «Aplicar mi administración, imprevistos y ganancia también a lo subcontratado» (default
  SÍ: el principal administra, responde y financia) decide si el AIU propio se aplica también sobre
  eso o si va al precio a costo. El resumen publica `costo_directo_subcontratado`, `costo_directo_propio`,
  `base_aiu` y `aiu_subcontratista_incluido` (= costo × pct/(100+pct), solo con % declarado; sin % es
  `null` y se cuenta en `subcontratados_sin_aiu_declarado`). Es información y decisión, no un descuento
  automático: el AIU ajeno NO se resta solo.

## 4 bis. Panel Piso / Techo — ¿me presento, y a cuánto? (Fase 3, 2026-08-15)

`lib/apu/piso_techo.js`, servido dentro de `POST /api/apu?op=rentabilidad` como bloque `piso_techo`
y pintado primero entre los resultados de la pestaña *Precios*. Es una capa pura sobre lo que ya
existe (no recalcula el costo ni la cascada de baja).

| Cifra | Fórmula | Fuente | Regla de honestidad |
|---|---|---|---|
| Costo total | `CD × (1 + A + I + U_min)` (aditivo; compuesto si así está el AIU) | Su APU (`lib/apu/calculo`) | `U_min` la declara el usuario en *Ajustes → Utilidad mínima aceptable*; sin declararla se usa la U del AIU **y se dice**. |
| Piso rentable («precio mínimo para no perder plata») | `costo_total ÷ (1 − τ)`, `τ` = contribución de obra pública 5 % + deducciones de acta cargadas | Ley 418/1997 art. 120 (permanente por Ley 1738/2014); deducciones del usuario | Sin deducciones cargadas el piso es **cota inferior** y viaja `piso_es_cota_inferior:true`. |
| Techo competitivo («precio al que probablemente se gana») | `presupuesto_oficial × (1 − baja_mediana)` | `lib/indice_baja` (p6dx adjudicados): entidad+familia → entidad → departamento+familia | **Solo con n ≥ 5** en el nivel usado. Con menos: «Sin referencia» y NO hay techo. El índice por segmento (mín. 3) no se usa. |
| Umbral de precio artificialmente bajo | `presupuesto_oficial × 0,80` | Regla de referencia (la media − σ de las ofertas no se conoce antes del cierre); riesgo: D. 1082/2015 art. 2.2.1.1.2.2.4 | Se avisa solo cuando el piso queda por debajo. Declarado como referencia, no como norma. |
| Cuántos suelen presentarse | promedio de oferentes por entidad | `lib/indice_competencia` (p6dx), n ≥ 5 | Del proceso abierto no existe (hgi6 = 0 filas hasta la apertura): «Sin referencia», jamás 0. |

Veredicto (frase completa, nunca un porcentaje suelto): `piso > presupuesto` → «No se presente…
se rechaza» · sin techo → «Su precio mínimo es X. No tenemos historial suficiente…» · `techo <
piso` → «No se presente. El precio que necesita para ganar está por debajo del precio que necesita
para no perder plata.» · si no → «Preséntese entre piso y techo» (+ aviso de justificación si piso
< umbral). Además dice dónde queda el precio ACTUAL del editor respecto al rango — incluido el caso
normal del APU con U = 5 %, que cubre el AIU pero no la contribución del 5 %: se dice cuánto falta.

**Justificación de precio** (`public/justificacion.js`, botón «Descargar mi justificación de
precio»): documento HTML imprimible con el marco (D. 1082 art. 2.2.1.1.2.2.4), el valor y su
estructura, el reparto del costo directo, cómo se fijó el precio (piso, techo, mercado) y la tabla
de APU ítem a ítem con el origen de cada precio; se genera desde el MISMO presupuesto y el MISMO
panel que se ven en pantalla, nunca desde texto genérico.

## 5. Estado de verificación — resumen honesto

- **Verificados contra la norma o la fuente primaria**: prestaciones (CST, Ley 50/1990, Ley
  100/1993 con sus reformas, Ley 21/1982, Ley 27/1974 + Ley 89/1988; contrastadas además con la
  tabla 3 de la guía IDU GU-DP-017 v3, §7), exoneración (E.T. 114-1), ARL (D.-L. 1295/1994, D.
  768/2022, D. 1072/2015), jornada (Ley 2101/2021), IVA sobre la utilidad, salario mínimo (D.
  159/2026, transitorio), **auxilio de transporte** (D. 1470/2025 art. 1), **divisor de 210 horas**
  (IDU BPR e INVIAS APU 2026-1) y **herramienta menor 5 %** (INVIAS APU 2026-1).
- **Referencia sectorial, SIN fuente oficial** (contrastado el 16-ago-2026 contra el IDU y el INVIAS y
  no encontrado en ninguno): TPNL 22,5 %, MVP 14,72 % y EPP 3 %. El IDU publica su costo-hora sin
  TPNL/MVP; el INVIAS usa un factor global de 2,04 sobre el salario del obrero que no desglosa. Los
  tres solo mueven el **ejemplo público** de costo-hora («Cómo calculamos») y la casilla de EPP; **no
  mueven el jornal del catálogo**, que es el dato calibrado. Son editables en *Parámetros de costo* y
  siguen etiquetados como referencia: no se «completan» a verificado sin fuente.
- **Supuestos declarados**: 44 h como jornada de calibración del catálogo; 6 días trabajados por
  semana (solo para el ejemplo hora ↔ día; el motor no lo usa).

## 6. Pendiente

1. ~~Contrastar TPNL/MVP/divisor con el Manual IDU 2.2.2 y el Manual INVIAS cap. 8.~~ **Hecho el
   16-ago-2026 (§7)**: divisor, herramienta menor y auxilio pasaron a «verificado» con la fuente
   primaria; TPNL/MVP/EPP **no están en ninguna de las dos fuentes** y quedan como «referencia, sin
   fuente oficial». Lo que sigue pendiente aquí es de criterio del dueño, no de fuente: si el
   ejemplo público debe llevar TPNL+MVP (+37 %), solo TPNL (+22,5 %, que reproduce el jornal INVIAS
   2026-1 al ±1 %) o nada (método IDU). Se cambia en *Parámetros de costo*, sin código.
2. Confirmar la fecha del contrato Nogal (UPN-VAD-CP-009-2025): si es anterior al 15-jul-2025 la
   jornada de calibración es 46 h (factor 1,095) — se cambia en *Parámetros de costo*, sin código.
3. ~~Decidir con evidencia si el factor de jornada se aplica al equipo alquilado por día.~~ **Decidido
   el 16-ago-2026 con dato: NO.** En la semilla la maquinaria va por HORA con rendimiento propio de la
   máquina (independiente de la jornada) y en los 157 ítems Nogal solo 2 de 452 líneas de equipo por día
   coinciden con el rendimiento de la cuadrilla (son costos por unidad, no días de presencia): aplicarles
   44/42 multiplicaría una amortización que no depende de las horas del obrero. La medición quedó como
   prueba en la suite: si el catálogo cambiara y el equipo siguiera a la cuadrilla, la decisión se retoma.
4. ~~AIU de subcontratista~~ **Hecho el 16-ago-2026** (ver §3, «AIU de subcontratista»).
5. (Fase 3) Umbral de precio artificialmente bajo por MODALIDAD: el dueño advierte que «hay
   modalidades de selección que te descalifican si te bajas cierto %». No se encontró una tabla
   verificable de porcentajes por modalidad (los Documentos Tipo rechazan por EXCEDER el
   presupuesto y remiten la oferta baja al art. 2.2.1.1.2.2.4); el panel usa el 80 % de referencia
   y lo declara. Con la tabla verificada, `TEMERARIO_PCT` pasa a depender de la modalidad.
6. (Fase 3) ~~`hgi6-6wh3` en vivo para «contra quién compite»~~ **Hecho el 16-ago-2026**: bloque
   `proponentes` en la vista de entidad («Quiénes se presentan aquí», docs/datos.md §5.1). Sigue
   pendiente `jbjy-vk9h` para «cómo se ejecuta» (adiciones, pagos) — verificado, no integrado
   (`docs/datos.md` §5).
7. Contrastar los jornales del catálogo con el costo normativo por hora (§2): un oficial del
   catálogo cuesta $154.171/día con prestaciones; un trabajador de salario mínimo cuesta $132.457
   por día de 7 h según §2 (con exoneración). El contraste sirve para detectar jornales por debajo
   del piso legal cuando el catálogo se recalibre.

## 7. Contraste con las fuentes primarias del IDU y del INVIAS (2026-08-16)

El «403 en las fuentes oficiales» que sostenía el §5 era una observación con fecha, no una propiedad
del entorno: el 16-ago-2026 `idu.gov.co` e `invias.gov.co` respondieron 200 y se leyeron los documentos
de verdad. Qué se abrió, qué dice cada uno y qué cambia:

| Fuente (primaria) | Qué se leyó | Qué fija |
|---|---|---|
| **Decreto 1470 de 2025** (29-dic-2025), texto completo | Art. 1: «Fijar a partir del primero (1°) de enero de dos mil veintiséis (2026), el auxilio de transporte a que tienen derecho los servidores públicos y los trabajadores particulares que devengan hasta dos (2) veces el Salario Mínimo Legal Mensual Vigente, en la suma de DOSCIENTOS CUARENTA Y NUEVE MIL NOVENTA Y CINCO PESOS ($249.095)»; art. 2 deroga el D. 1573/2024 | Auxilio → **verificado** |
| **Decreto 159 de 2026** (19-feb-2026) + auto del Consejo de Estado (12-feb-2026, ratificado 14-abr-2026) | El D. 1469/2025 quedó suspendido provisionalmente; el D. 159/2026 fija **transitoriamente** el mismo $1.750.905 hasta la sentencia | SMMLV: valor igual, **base legal corregida** (ya no «en litigio» a secas) |
| **IDU · Visor de la Base de Precios de Referencia 2024-I Fase II** (`idu.gov.co/Archivos_Portal/2024/…/-1A-Visor-de-Precios-Unitarios-de-Referencia-2024-I-Fase-II _23-12-2024.xlsx`), hoja «Presentación» y grupo «SUELDOS Y JORNALES» | «46 horas semanales/6 días laborables = 7.6666 horas laborables diarias» para las tarifas por hora, y «un incremento del 2,174 % en los rendimientos de 1950 APU» con jornales (= 47/46: la Ley 2101 entra como FACTOR sobre los rendimientos de la mano de obra, no sobre el jornal). Con sus tarifas: ayudante MES con factor $2.147.411, JORNAL $71.580 (= mes ÷ 30) y HORA $9.337 (= jornal ÷ 7,667) | **Divisor**: hora = mes ÷ (30 × h/día) → 230 h con 46 h, 220 con 44, **210 con 42** → verificado. **Método del factor de jornada** de este repositorio: es el del IDU |
| **IDU · GU-DP-017 v3 (2024)** «Elaboración de presupuestos para contratos de consultoría, construcción, conservación y apoyo a la gestión», tabla 3 | Prestaciones sociales + seguridad social + parafiscales: **56,70 %** (≤ 2 SMMLV, incluye subsidio de transporte y dotación), **45,10 %** (2–10 SMMLV, exonerado), **58,90 %** (> 10 SMMLV, sin exoneración) | Nuestros 44,79 % / 58,29 % **quedan a 0,3–0,6 pp**: la diferencia es la dotación, que aquí queda fuera y se declara. La estructura de exoneración por tramos coincide |
| **INVIAS · APU Regionalizados de Referencia 2026-1** (`hermes2.invias.gov.co/APUs/Provincias/Territorio_APU_2026_1.xlsx`, todo el país), hojas «HOJA DE CALCULOS», «MANO DE OBRA» y cualquier APU (p. ej. 600.1.1) | «HORAS LABORALES: 48 → 8 · 46 → 7,67 · 44 → 7,33 · 42 → 7» h/día; jornal = salario ÷ 30; en cada APU la línea **HERMENINV «HERRAMIENTA MENOR (% MANO DE OBRA)» = 0,05**; el obrero (SMMLV) lleva un **factor prestacional global de 2,04** sobre el salario (2,046 Amazonas, 2,040 Tolima), el oficial 1,93, el ingeniero 1,79 — sin desglose. Consideración 12 de la publicación: los APU «han sido ajustados considerando el impacto» de la Ley 2101 «especialmente en lo relacionado con el costo horario de la mano de obra y los rendimientos» | **Herramienta menor 5 % → verificado**. Divisor 30 × 7 = 210 confirmado por segunda fuente. La API ArcGIS que alimenta `data/apu_invias.json` **todavía no publica 2026-1** (solo hasta 2025-2, corrupta): la re-captura, cuando llegue, va con la comprobación de medianas de siempre |

**Lo que NO se encontró en ninguna de las dos fuentes**: el TPNL (26,67 % ni 22,5 %), el MVP (17,45 % ni
14,72 %) ni un % de EPP. Son cifras de metodologías de fuentes secundarias que se atribuían al «Manual
IDU 2.2.2 / metodología B»; ese manual no existe con ese nombre en el portal del IDU y la BPR del IDU calcula
la hora **sin** ese recargo. La comparación numérica, con salario mínimo 2026 y exoneración:

| Método | Costo por hora del ayudante/obrero |
|---|---|
| Este modelo con TPNL + MVP (como está en DEFAULTS) | $18.922 |
| Este modelo con TPNL solo (MVP = 0) | $16.892 |
| INVIAS 2026-1, obrero Tolima: 1.750.905 ÷ 30 × 2,0398 ÷ 7 h | $17.007 |
| Método IDU (mes con factor ÷ 210, sin TPNL/MVP) | $13.789 |

El TPNL solo reproduce el jornal INVIAS al ±1 %; con el MVP encima el ejemplo queda ~11 % por encima del
INVIAS. **No se cambia el DEFAULT desde el código**: es una decisión del dueño (editable en *Parámetros
de costo*) y no mueve ningún precio — el jornal del catálogo es el dato calibrado y `costoHora` solo
alimenta el ejemplo público. Lo que sí cambia es la etiqueta: «referencia, **sin fuente oficial**».
