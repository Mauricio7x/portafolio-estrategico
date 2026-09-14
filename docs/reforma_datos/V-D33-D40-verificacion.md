# Verificación adversaria · D-33 … D-40 (14-sep-2026)

> Para: sesión · Estado: informe fechado · Sustituido por: —

Repositorio sin tocar (`git status --short` vacío al cerrar). Reproducciones en
`v_d33_d40.js` → `v_d33_d40.salida.txt` (mismo directorio). Fecha civil medida: `hoyColombia() = 2026-09-14`
(las fichas se reprodujeron el 13-sep, por eso «22» hoy es 21).

## Hallazgos transversales (afectan a D-36, D-37 y D-38)
1. **`habilesEntre` con la fecha ausente LANZA, no devuelve null**: `habilesEntre(hoy, null)` y
   `habilesEntre(hoy, undefined)` → `Error: festivos: año fuera de rango (2201)` (lib/habiles.js:61, el bucle
   de :97 avanza hasta el techo). `habilesEntre('1970-01-01', cierre)` → lanza con 1970. En `op=listar` es una
   fila que tumba la petición entera (500). **Condición obligatoria**: pasar por `fechaOperable`
   (lib/habiles.js:133-139; `fechaOperable('1970-01-01T…') = null`) y NO llamar sin las dos fechas.
2. **`habilesEntre` convierte «sin dato» en 0**: `habilesEntre(undefined, '2026-10-14') = 0` y
   `habilesEntre(hoy, '1970-01-01') = 0`. «Da 0 días de oficina» / «Le quedan 0 días» es el cero creíble
   que prohíbe la regla dura: la ausencia se descarta ANTES de contar.
3. `esFestivo('')` y `esFestivo(null)` también lanzan (año 0 / NaN).

## D-33 · Referencia del proceso — CONFIRMADO (con una corrección de ficha)
- FUENTE: `referencia_del_proceso` está en `CAMPOS` de la proyección activa (lib/proyeccion.js:40) y sobrevive a
  `sinAdjudicacion` (reproducido: `{"referencia_del_proceso":"LP-008-2026",…}`); `op=listar` esparce la fila
  entera (`...fila`, lib/handlers/procesos/listar.js:851) y `lib/publico.sinFinanzas` no la toca (solo anula
  bajas, ganancia, margen y finanzas: lib/publico.js:131-209). Viaja sin token también.
- «Ningún public/*.js la pinta»: cierto para la TARJETA (la cabecera pinta `nombre_del_procedimiento || id_del_proceso`,
  public/app.js:2148) pero **falso en absoluto**: la pantalla «¿Dónde está mi proceso?» pinta `x.referencia`
  (public/app.js:8465), que `lib/rastreo.js:135` llena con `referencia_del_proceso || nombre_del_procedimiento`.
  El mapa no la conoce (`node tests/mapa.js referencia_del_proceso` → SIN ACIERTOS): no hay sección de memoria
  que decida sobre ella.
- COSTO «petición»: es un campo que YA viaja; el costo real es cero en servidor y solo pintado. Correcto.
- LENGUAJE: «Ref. LP-008-2026» — abreviatura; el manual llama a esto «referencia» y SECOP II «Referencia del
  proceso». Propuesta: «Referencia LP-008-2026». Sin jerga.
- Condición: si `referencia_del_proceso` es null la fila no muestra nada (no caer al `id_del_proceso`, que ya
  está en la cabecera y significa otra cosa: `_k` de dedup, lib/proyeccion.js:99).

## D-34 · Plazo de obra — CON CONDICIONES
- FUENTE: `duracion` y `unidad_de_duracion` viajan (lib/proyeccion.js:44; reproducido en la fila). En la app
  solo se pintan en el expediente vía `guia.obra.plazo.legible` (public/expediente.js:405 ← lib/guia_proceso.js:266):
  reproducido `{"meses":8,"legible":"8 meses"}`, sin duración `{"meses":null,"legible":null}`, con 240 días
  `{"meses":8,"legible":"240 días"}`.
- VERDAD: `plazoMesesDe({}) = 12` (lib/capacidad.js:150; reproducido) y `cargaK` (lib/rup.js:79) usa ese 12
  para el CRPC: «la capacidad se calculó con un año» es CIERTO para la K de la tarjeta. La guía ya publica
  `null` para la misma ausencia: la ficha debe LLAMAR `guia_proceso`'s regla (`l.duracion && num(l.duracion) > 0 ?
  plazoMesesDe(l) : null`, lib/guia_proceso.js:219) o extraerla, no escribir una tercera.
- El corto «8 meses de obra»: el dato publicado es «8 Meses»; con `unidad_de_duracion = "Días"` hay que decir
  «240 días de obra» (lo que la guía ya hace con `unidadLegible`), nunca la conversión (8) como si fuera lo publicado.
- La nota «duraci_n_del_contrato de jbjy puede diferir» no es verificable aquí (no se ingiere jbjy en la fila).
- Condiciones: (a) sin duración: texto «Plazo no publicado (la capacidad se calculó con un año)» solo si el
  perfil tiene K —sin token no hay K y la coletilla sobra—; (b) `duracion` = "0" también es ausencia
  (`plazoMesesDe({duracion:"0"}) = 12`); (c) reutilizar `unidadLegible` de lib/guia_proceso.

## D-35 · Ritmo mensual de la obra — CON CONDICIONES
- FUENTE/VERDAD: `cuantia_cop / plazoMesesDe(fila)` = 6.365.863.688 / 8 = 795.732.961 (reproducido).
  PERO `enriquecer` guarda `cuantia_cop` con `|| 0` (lib/negocio.js:207,242): sin precio `cuantia_cop = 0` y el
  ritmo ingenuo da 0 (reproducido «ritmo ingenuo= 0»). La regla que ya existe es `presupuestoOficialDe(l)`
  (lib/negocio.js:246, devuelve null; ya importada en listar.js) — se LLAMA, no se comprueba `cuantia_cop > 0` a mano.
- Plazo: mismo predicado que D-34 (publicado > 0), jamás el 12 por defecto (la ficha lo dice; se convierte en condición
  con cerradura: `presupuestoOficialDe(l) != null && plazoPublicado != null`).
- Mostrar: «unos $796 M» es redondeo de pantalla; no decide nada (correcto). «durante 8 meses» → con unidad en días
  decir «durante 240 días» (o «unos 8 meses»), marcado como conversión.
- COSTO petición: una división por fila, correcto. Memoria: la sección de la guía (3-sep-2026) ya decidió que sin
  duración el plazo es null; no la contradice si se cumple la condición.

## D-36 · Días de oficina que le quedan, y cuándo presentar — CON CONDICIONES
- Reproducido: `habilesEntre('2026-09-14','2026-10-14') = 21` (la ficha dice 22 porque contó desde el 13);
  `presentar_el` con la regla de lib/guia_proceso.js:449-452 → `2026-10-13` (hábil; 12-oct festivo).
- **Ya existe otra cuenta de «le quedan N días de oficina» con OTRA convención**: lib/manifestacion.js:246 y
  lib/handlers/procesos/manifestacion.js:55 cuentan `habilesEntre(hoy, f) + (esHabil(hoy) ? 1 : 0)` (hoy cuenta
  si es hábil) y el calendario la pinta como «Le quedan N días de oficina» (public/calendario.js:220). La ficha
  propone `habilesEntre(hoy, cierre)` a secas (hoy NO cuenta): dos «le quedan» en la misma app con un día de
  diferencia. Condición: usar la MISMA convención (extraer `quedanHabiles(hoy, fecha)` de lib/manifestacion) o
  declarar por qué difiere.
- Hallazgos transversales 1 y 2: sin `fecha_cierre` operable NO se llama (lanza); con 1970 daría 0 (cero creíble).
  `fecha_cierre` sale de `fechaCierre(lic)` (lib/negocio.js:181) y trae hora («2026-10-14T15:00:00.000»): el
  `slice(0,10)` de habiles la ignora, como la ficha reconoce.
- «presentar_el» hoy solo vive dentro de `guiaDe` como paso (no exportada); extraerla a lib/habiles o lib/guia_proceso
  y que ambos la llamen es lo correcto; incluir el suelo `hoy` (`if (anterior < hoy) anterior = hoy`, :451).
- LENGUAJE: «días de oficina» es el visible del glosario (public/glosario.js:86) y la cerca `!/hábiles/` existe
  (tests/e2e.js:13082, solo para esas cuatro funciones del modal — no es un censo de public/). Texto correcto.
- Memoria: «⚠️ EL PLAZO DE MANIFESTACIÓN NO ES DE TRES DÍAS: TRES ES EL TECHO (20-ago-2026)» (convención de conteo)
  y «Fase 9 · …» (aritmética pura sin hora).

## D-37 · Días de oficina que dio este proceso para ofertar — CON CONDICIONES
- Reproducido: `habilesEntre('2026-09-01','2026-10-14') = 30`, con el 13-oct 29, A4 C1 = 18. Los dos campos viajan
  (lib/proyeccion.js:43 y la candidata de cierre :93-95).
- Sin publicación: `habilesEntre(undefined, cierre) = 0` → «Da 0 días de oficina» (cero creíble); con publicación
  1970 lanza. Condición: `fechaOperable` en ambas fechas y sin ambas no se pinta.
- Adendas: la fila YA sabe si el cierre se movió (`l._cambios` con `campo === "fecha_cierre"`, lib/adendas.js:32,61;
  listar.js:911). Condición: si hay cambio de cierre, decir «(el cierre se movió: contado desde la publicación
  original)» o callar; no esperar a D-54.
- COSTO petición: correcto (dos fechas ya en la fila). Informativo, no bloquea: coherente con el falso caro.

## D-38 · Cierre en fecha difícil — CON CONDICIONES (una mitad refutada en su fuente)
- Festivos: `esFestivo('2026-10-12') = true`, `esHabil('2026-10-13') = true` (reproducido). Ventana dic/ene 2026-27:
  8-dic, 25-dic, 1-ene, 11-ene (Reyes). Lib existente, fuente Ley 51/1983 (lib/habiles.js:9-16).
- **La ventana «20 de diciembre – 10 de enero» NO es la señal #10 del manual**: la señal dice «Apertura en fechas
  estratégicas: 23 de diciembre, Semana Santa, cierres puente» (docs/GUIA_ANALISTA_LICITACIONES.md § «Palanca 3 — Detección de pliegos direccionados (impacto: alto)»).
  Ni 20-dic ni 10-ene aparecen en ningún documento (grep). Es un umbral inventado por la ficha: o se declara como
  heurística de la aplicación con su motivo, o se pinta solo lo que el manual dice (23-dic, Semana Santa —que
  lib/habiles calcula: Jueves/Viernes Santo—, día siguiente a un festivo ≈ «cierre puente»).
- Condición transversal: `esFestivo`/`esHabil` lanzan con '' o null (reproducido) → `fechaOperable` antes.
- LENGUAJE: «Cierre en fecha difícil» y las frases están en usted, sin jerga; ámbar y «puede ser» respetan el falso
  caro. Propuesta: «Cierra el día siguiente a un festivo: confirme la hora en el cronograma» ·
  «Cierra en fechas de fin de año: pocos días de oficina para preparar la oferta».
- No existe hoy ninguna comprobación de festivo sobre el cierre (grep esFestivo/esHabil fuera de manifestación y guía → nada).

## D-39 · Cuánto tarda en adjudicar y cuántos declara desiertos — CON CONDICIONES
- El hash publica `plazo_adjudicacion` y `desiertos` y el lector ÚNICO es `hechosDeRegistro` (lib/indice_competencia.js:479);
  el modal ya los pinta (public/app.js:3050-3076). Reproducido: `competenciaDe` NO los incluye (140 B, sin plazo ni
  desiertos) y `hechosDeEntidad(indice, l)` sí (184 B, el «≤ 183 B» de la ficha es exacto en el ejemplo).
- **La función por fila ya existe y ya se llama por fila**: `hechosDeEntidad` (lib/indice_competencia.js:1210) la usa
  el calendario de cierres del perfil (lib/handlers/perfil/entrada.js:139) sobre el índice cargado por el listado.
  Condición: el listado LLAMA `hechosDeEntidad`, no «añade campos a competenciaDe».
- Motivo de no meterlo en `competenciaDe`: bajo 5 procesos con oferentes devuelve `sinDatoCon`/`SIN_DATO` (congelado,
  :1132) y la memoria fija que «una entidad con desenlaces pero sin conteo de oferentes existe con procesos: 0 y
  competenciaDe la sigue tratando como sin dato (hay cerradura)» — colgar los hechos de ese objeto pierde justo las
  entidades con 9 desenlaces y 0 conteos, o rompe la cerradura. Hash viejo → `{null,null}` (reproducido), y bajo el
  mínimo los derivados son null y los conteos viajan (reproducido base 3: mediana null, pct null).
- Reutilizar `htmlPlazoAdjudicacion`/`htmlDesiertos` en la tarjeta: correcto (tienen cerca sin «hábiles», e2e:13082).
- «Si el hash de producción es anterior a M-DGF-08 exige reconstruirlo»: NO VERIFICABLE aquí (no hay Redis de
  producción); el lector devuelve null y la tarjeta calla, que es el comportamiento seguro.
- Memoria: «Lote «B9b-competencia-departamento» … M-DGF-08 (6-sep-2026)» y «Remates «R4-remates-inteligencia» … (6-sep-2026)».

## D-40 · Cabe en el tope Mipyme, y con qué socia — CON CONDICIONES
- FUENTE: `UMBRAL_MIPYME_2026 = 511708497` (lib/socio_por_proceso.js:48; docs/COMPLEMENTO §V-12 tabla «Umbral MiPyme»);
  `tamanoEmpresa` publicado: helder=microempresa, genesis=microempresa, prodiac=gran_empresa (reproducido desde PERFILES).
- La regla YA existe: `avisoMipyme(socio, cuantia)` (:104-115) — reproducido: PRODIAC con $400 M → aviso; PRODIAC con
  $0 → null; con la cuantía = umbral → null; Génesis → null; sin tamaño → null. Y YA SE ENSEÑA: el expediente pinta
  `s.avisos` (public/expediente.js:455-459) que `socioPorProceso` llena con `mejor.aviso_mipyme` (:410) — solo del
  socio recomendado. En la tarjeta viaja únicamente `resumenSocio = {tipo, cierra_todo}` (listar.js:109-113).
- VERDAD: `cuantiaCop` llega como `cuantia_cop` con `|| 0`; la función descarta ≤ 0 (correcto). Condición: la tarjeta
  llama `avisoMipyme` (o `socioPorProceso`) y no reescribe la comparación; el umbral es cifra CON FECHA
  («revisarla en enero», :47).
- LENGUAJE: «tope Mipyme» es vocabulario legal que la app ya evitó: el texto vigente dice «empresas pequeñas»
  (socio_por_proceso.js:108; app.js:10636). «(solo si la cuantía es menor que el umbral)» es la condición del cálculo
  dicha al usuario: sobra. Propuesta: «Por su cuantía, la entidad puede reservar este proceso para empresas
  pequeñas ($511,7 M en 2026): con Génesis usted sigue cabiendo; con PRODIAC no. No publican si lo reservaron:
  confírmelo en el pliego.» Sin token (perfil plural/onboarding) no se pinta (`socioAplica`, listar.js:935).
- Memoria: «Con cuál de mis socios conviene ESTE proceso · `lib/socio_por_proceso` (11-sep-2026)» («avisa, jamás
  excluye»), «El tamaño de empresa se lee del certificado, y hay UNA sola lista de tamaños (11-sep-2026)».
