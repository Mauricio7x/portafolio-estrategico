# Detekta como empresa: la estructura que su funcionamiento exige

> Para: dueño · Estado: informe fechado · Sustituido por: docs/ORGANIZACION_AGENTES.md

> **Superado el mismo 26-sep-2026.** El dueño rechazó una estructura de personas: pidió una organización de
> agentes de IA con mejora continua y un puesto para el orden del código y del conocimiento. La vigente es
> `docs/ORGANIZACION_AGENTES.md`, que conserva de esta la regla «el agente produce y la persona dueña del frente
> firma». Este documento queda como foto del inventario operativo de ese día; se archivará con la regla de retiro.

> Foto del **26-sep-2026**. Se hizo **desde cero**, por encargo del dueño: no toma como fuente los planes de
> negocio anteriores (`PLAN_SAAS`, `PLAN_DE_ACCION`, `PRECIO_Y_UNIT_ECONOMICS`, `EMPEZAR_AQUI` y sus anexos).
> Sale de un inventario operativo MEDIDO del árbol hecho en cinco frentes (datos del mercado, pliego, precios,
> cliente, plataforma): qué tiene que ocurrir para que Detekta funcione y qué parte de eso exige a una persona.
> Las cifras de git vienen de un clon superficial que empieza el 2-sep-2026: son un SUELO, no la historia entera.
> Los salarios son SUPUESTOS sin fuente: se confirman con ofertas reales antes de decidir.

## 1. Lo que el inventario enseña (y que decide la forma de la empresa)

1. **El software ya tiene quien lo escriba.** Desde el 2-sep, 155 de 203 commits son de autor Claude. Los otros 48
   (del dueño) son fusiones de PR por la web o llevan la sesión de Claude enlazada: ninguna línea de código la
   escribió una persona (`git log --format='%an' | sort | uniq -c`). Hubo unos 35 PR en 23 días. **La empresa no
   necesita un equipo de desarrollo; necesita a alguien que responda por lo que se fusiona y por producción.**
2. **Lo que falla no es el código: es la operación que nadie mira.** Algunos casos medidos:
   - el segundo disparo diario (`sync.yml`) falló las 19 veces que corrió entre el 7 y el 24-sep por un secreto
     que falta en GitHub, y nadie lo vio;
   - la extracción del histórico está parada en el mes 17 de 33 y la salud no lo avisa;
   - no hay respaldo automático de Redis;
   - el monitor de salud no consta creado;
   - de 14 fallos registrados en la ingesta de SECOP, 6 los detectó una persona (5 de ellos el dueño) y 7 una
     sesión de Claude.
3. **Hay trabajo de criterio que ninguna máquina firma hoy:**
   - las 18 normas que el dictamen puede citar tienen `literal_leido:false`: nadie ha leído su texto literal, así
     que el modelo recibe 0 de 18;
   - la guía calcula la garantía de seriedad sobre el presupuesto y la norma citable dice «sobre la oferta»;
   - hay 5 decisiones abiertas sobre el proponente plural;
   - solo 1.134 de 6.588 ítems de precio (17,2 %) traen su composición; el resto de un APU radicable se arma a mano;
   - el lector del RUP falla con empresas grandes: toma el primer corte del certificado y deja la utilidad
     subestimada; el tope de 20.000 líneas corta un certificado de 2.423 páginas en el contrato 62 de 327.
4. **Hay datos que caducan con calendario:**
   - INVIAS e IDU son semestrales, y la vigencia 2026-1 cerró hace 87 días;
   - EPC es mensual y su vigencia cerró hace 209 días;
   - FFIE e ICCU son anuales; el reajuste por ICOCIV sigue los boletines del DANE;
   - el salario mínimo cambia cada enero y está escrito en 4 sitios del código más Redis;
   - el calendario electoral (ley de garantías) cambia con cada circular.

   Recapturar un banco exige correr un script en una terminal, y el dueño no tiene terminal.
5. **Hoy hay UN cliente.** El 11-sep el dueño decidió adaptar la página a un solo usuario (commit `0f66722`). Las
   cuentas están construidas y apagadas: `op=cuenta` responde 503 apagado, y 501 si se enciende. El perfil de un
   visitante vive solo en su navegador y caduca a los 45 días aunque se use. Su «Mis procesos» queda huérfano en
   Redis.
6. **Todo depende de una cuenta.** El dueño fusiona el 100 % de los PR, es el único administrador de Vercel,
   Upstash, GitHub, correo, OCR y la suscripción de Claude, y tiene 13 pendientes abiertos a su nombre
   (`node tests/estado.js`).

**Conclusión de diseño.** El producto que existe es **software más criterio experto**: la herramienta descubre,
filtra y calcula, y una persona con oficio firma lo que decide dinero (el dictamen, el precio, la lectura del RUP).
La empresa se organiza alrededor de ese criterio y de la operación, no del desarrollo, que lo hacen los agentes.

## 2. Estructura: una gerencia, tres áreas, dos servicios externos y una capa de agentes

```
GERENCIA GENERAL Y DE PRODUCTO ............................. el dueño
│
├── 1. PLATAFORMA Y DATOS ......... ingeniero de plataforma y datos
├── 2. COSTOS Y PRESUPUESTOS ...... ingeniero civil de costos
├── 3. ATENCIÓN Y ANÁLISIS ........ analista de licitaciones (desde el 2.º cliente)
│
├── Externo: abogado en contratación estatal (por horas, con bolsa mensual)
├── Externo: contador público (mensual)
└── Capa de agentes (sesiones de Claude Code): código, pruebas, auditorías, dictamen, «Buscar» precios
```

Es una estructura plana, sin mandos medios. Cada persona es dueña de un frente del inventario y de sus fallos.

## 3. Los cargos

### 3.0 Gerente general y de producto (el dueño)

- **Misión:** decidir qué se construye y qué se promete, y responder ante el cliente.
- **Funciones:**
  - redactar los encargos a los agentes y probar el resultado en el navegador;
  - cerrar las decisiones abiertas (plural, lo que se muestra, modo cuenta);
  - llevar la relación con el cliente y las finanzas;
  - fusionar a `main` solo con el visto bueno técnico de Plataforma;
  - mientras no exista el cargo 3, atender al cliente.
- **Qué deja de hacer:** pegar consultas SoQL, crear secretos y relanzar extracciones. Eso pasa a Plataforma.

### 3.1 Ingeniero de plataforma y datos

**Misión:** que la aplicación esté arriba, con datos frescos y sin fugas, y que nada falle en silencio.

**Funciones, sacadas del inventario:**

- **Consolas y credenciales:**
  - Vercel, Upstash, GitHub, Resend, OCR.space y datos.gov.co;
  - el `CRON_SECRET` que falta en GitHub;
  - rotar la clave y el token que hoy viajan en la página pública (`public/app.js:28,149`).
- **Vigilancia diaria:**
  - la salud (`op=salud`) y el monitor externo, que hay que crear;
  - la ingesta de SECOP y su deriva (14 fallos registrados);
  - la extracción del histórico hasta que termine.
- **Respaldo:** un respaldo de Redis restaurado y anotado cada mes (hoy no existe).
- **Seguridad:**
  - el repositorio consta como público (MEMORIA, 25-sep) y trae cifras de empresas reales en `lib/perfiles.js`;
  - la CSP está solo en modo de informe;
  - la cuota de altas por IP es un supuesto.
- **Revisión técnica de cada PR antes de que el dueño fusione:** suite 4/4 sin tuberías y navegador real si se
  tocó `public/`.
- **Ejecución técnica que el dueño no puede hacer sin terminal:**
  - los scripts `tests/capturar_*.js`;
  - `cargar-catalogo`;
  - crear las rutinas con el repositorio adjunto y la red abierta. Dos rutinas terminaron «en verde» sin hacer
    nada por nacer sin repositorio.
- **Encender cuentas y aislamiento entre clientes** cuando llegue el segundo cliente.

**Perfil:**

- **Formación:** ingeniero de sistemas o de software, con 4 o más años de experiencia.
- **Técnica:** Node.js en servidor sin frameworks; serverless (Vercel); Redis por REST.
- **Datos:** APIs de datos abiertos (Socrata/SoQL); seguridad web (sesiones, cookies, OWASP).
- **Desarrollo con agentes:** dirigir y revisar sesiones de Claude Code.
- **Imprescindible:** la disciplina de la casa. «Sin dato» no es cero, una prueba debe fallar contra el árbol
  anterior y el código de salida se lee sin tuberías.

**Dedicación:** medio tiempo por prestación de servicios mientras haya un cliente; tiempo completo cuando se
enciendan las cuentas para varios.

### 3.2 Ingeniero civil de costos

**Misión:** que ninguna cifra con la que el cliente fija su oferta salga sin fuente, vencida o equivocada (en
precios el error caro es el falso positivo).

**Funciones, sacadas del inventario:**

- **Calendario de los bancos:** INVIAS e IDU cada semestre, EPC cada mes, FFIE e ICCU cada año, ICOCIV con cada
  boletín del DANE y la tienda cuando haga falta.
  - Baja los archivos y revisa el contraste.
  - Plataforma corre los scripts.
  - Hoy hay dos bancos vencidos.
- **Parámetros del año:** salario mínimo, prestaciones, ARL, AIU y tasas. Hoy exige tocar 4 sitios del código;
  el encargo de dejar una sola fuente es de Plataforma con los agentes.
- **Cola de «Buscar»:** revisar los APU que genera la IA antes de que el cliente los use, y medir la mediana de
  respuesta (los sellos `solicitado_el` y `respondida_el` existen, nadie la ha calculado).
- **Completar cada presupuesto:** componer los APU que la app no trae (el 83 % de los ítems de los bancos),
  revisar los mapeos marcados «revisar» y leer en el pliego las estampillas y el AIU.
- **Calibración:** contrastar los presupuestos de la app contra ofertas reales ganadas y perdidas.
- **Licencias de las fuentes, con el abogado:**
  - INVIAS prohíbe el uso comercial sin autorización y la solicitud no se ha hecho;
  - EPC, FFIE, ICCU y la tienda no declaran licencia.

**Perfil:**

- **Formación:** ingeniero civil con 4 a 8 años preparando presupuestos y APU de obra pública, con dominio de los
  bancos oficiales (INVIAS, IDU, gobernaciones) y del factor prestacional colombiano.
- **Herramientas:** Excel avanzado.
- **Criterio clave:** distinguir un precio publicado de uno calculado, y un precio tope de uno de referencia.
- **Deseable:** especialización en gerencia de obras o en costos.

**Dedicación:** medio tiempo con un cliente; tiempo completo desde que el volumen de presupuestos lo pida
(medirlo con la cola de «Buscar»).

### 3.3 Analista de licitaciones (atención y análisis)

**Misión:** que cada cliente quede bien perfilado y que lo que la herramienta no resuelve sola le llegue resuelto.

**Funciones, sacadas del inventario:**

- **Alta y renovación del RUP:** revisar a mano lo que el lector no lee bien (primer corte, utilidad, números
  partidos, certificados de miles de páginas) y repetirlo en cada renovación anual.
- **Soporte de primer nivel.** Las preguntas previsibles ya están identificadas:
  - «¿por qué no aparece este proceso?» (se responde con `rastreo`);
  - «perdí mi perfil» (TTL de 45 días);
  - «la cifra de mi RUP está mal»;
  - «no me llegan los avisos».
- **Verificación de socios:** las tres fuentes con captcha (SIRI y compañía) que la app no puede consultar.
- **Cronograma y adendas por proceso**, y los avisos al cliente.
- **Registro de desenlaces:** que cada cliente marque «me presenté / gané / perdí». Hoy lo teclea el usuario y
  ningún módulo lo agrega. Sin ese registro la probabilidad de ganar nunca se podrá medir.

**Perfil:**

- **Formación:** tecnólogo o profesional en obras civiles, ingeniería o administración, con 2 a 4 años como
  auxiliar o analista de licitaciones.
- **Dominio:** usuario experto de SECOP II; lee un RUP y un pliego.
- **Habilidades:** explicar sin jerga y ser disciplinado en el registro.

**Dedicación:** no hace falta con un cliente, porque lo cubre el dueño. Tiempo completo desde el segundo o tercer
cliente.

### 3.4 Externos

- **Abogado en contratación estatal (por horas, con bolsa mensual pequeña):**
  - leer el texto literal de las 18 normas citables y activarlas;
  - decidir la base de la garantía de seriedad;
  - cerrar las decisiones jurídicas del proponente plural (incluida la experiencia de socios, donde la doctrina de
    CCE está dividida);
  - mantener el calendario de la ley de garantías;
  - tramitar las licencias de las fuentes de precio;
  - redactar el tratamiento de datos personales (Ley 1581), porque el repositorio público trae cifras de empresas
    reales.

  Es trabajo episódico: una nómina fija no se justifica.
- **Contador público (mensual):** facturación electrónica, impuestos y nómina.

### 3.5 Capa de agentes (Claude Code)

- **Qué hace:** escribe el código y las pruebas, audita, redacta el dictamen (`/dictamen`) y los APU de «Buscar»
  (`/precios`) y corre rutinas.
- **Regla de la casa:** **el agente produce y la persona dueña del frente firma.** Plataforma responde por el
  código, costos por los APU y el analista o el abogado por el dictamen.
- **Costo:** consta la suscripción del dueño (MEMORIA la cita en USD 200 al mes); lo que haya que añadir por más
  corridas de rutina no está medido.

## 4. Lo que deliberadamente NO se crea

| No se crea | Por qué, según el inventario |
|---|---|
| Programadores | El 100 % del código lo escriben los agentes. Se compra una persona que revise y opere, no volumen. |
| Probadores | La suite (9.833 aserciones) y la revisión técnica de cada PR cubren esa función. |
| Diseñador | Las reglas de pantalla están escritas y cercadas por pruebas. |
| Científico de datos | No hay desenlaces registrados que modelar. Primero, el registro (cargo 3). |
| Comercial | Con un cliente, vende el dueño. Se abre solo si se decide vender a muchos. |
| Abogado de planta | Su trabajo llega por episodios (normas, licencias, decisiones). |

## 5. Etapas y disparadores

| Etapa | Clientes | Equipo | Pasa a la siguiente cuando… |
|---|---|---|---|
| **0 · Poner la casa en orden** (hoy) | 1 | Dueño · plataforma a medio tiempo · costos a medio tiempo · abogado y contador por encargo | Se cierra la lista del § 6 |
| **1 · Servicio asistido** | 2 a ~10 | + analista a tiempo completo · costos a tiempo completo si la cola de «Buscar» lo pide | Hay segundo cliente y las cuentas están encendidas con aislamiento probado |
| **2 · Producto por suscripción** | ~10 en adelante | Plataforma a tiempo completo · un analista por cada tanda de clientes que se mida · comercial | Se mide cuántas consultas por cliente atiende un analista |

**Cómo contratar sin desperdiciar:** un cargo fijo se abre cuando se cumplen dos condiciones a la vez: su señal
del inventario se encendió y el ingreso cubre el costo con holgura. Hasta entonces se contrata por horas o por
entregable.

## 6. La lista de arranque, repartida por cargo

| # | Qué | Quién | Evidencia |
|---|---|---|---|
| 1 | Clave y token fuera de la página pública; revisar qué datos de empresas reales hay en un repositorio público | Plataforma + abogado | `public/app.js:28,149`; `lib/perfiles.js`; MEMORIA 25-sep |
| 2 | Crear el `CRON_SECRET` en GitHub (19 fallos) | Plataforma | `.github/workflows/sync.yml` |
| 3 | Monitor externo de la salud, y que la salud avise de una extracción parada | Plataforma (+ agentes) | `lib/handlers/procesos/salud.js` |
| 4 | Respaldo de Redis restaurado y anotado | Plataforma | no existe |
| 5 | Terminar la extracción del histórico (mes 17 de 33) | Plataforma | `node tests/estado.js` |
| 6 | Recapturar IDU e INVIAS 2026-2 y EPC | Costos + Plataforma | `lib/apu/fuentes.js` |
| 7 | Una sola fuente del salario mínimo (hoy 4 en código + Redis) | Plataforma (+ agentes) | `lib/perfiles.js:70`, `lib/parametros.js:34`, `public/onboarding.js:543`, `lib/guia_proceso.js:206` |
| 8 | Leer las 18 normas citables; decidir la base de la garantía de seriedad | Abogado | `lib/dictamen.js:290-344`; `lib/guia_proceso.js:95` |
| 9 | Verificar la rutina de «Buscar» (repositorio adjunto, URL y token en Vercel) | Plataforma | `docs/PRECIOS_DESDE_CLAUDE_CODE.md` |
| 10 | Las tres deudas del lector del RUP (corte, utilidad, tope de líneas) | Plataforma (+ agentes), con el analista o costos como verificador | `lib/rup_pdf.js:47` |
| 11 | Solicitar las licencias de las fuentes de precio | Costos + abogado | MEMORIA, fuentes APU |
| 12 | Aviso cuando un banco de precios se vence (hoy se calcula y no avisa) | Plataforma (+ agentes) | `lib/apu/fuentes.js` |

## 7. Costo mensual orientativo (SUPUESTOS sin fuente: confirmar con ofertas reales)

| Cargo | Modalidad | Costo mensual para la empresa (COP) |
|---|---|---|
| Plataforma y datos | Medio tiempo por servicios → tiempo completo | 5–7,5 M → 10–15 M |
| Costos | Medio tiempo por servicios → tiempo completo en nómina (salario 5–7 M + prestaciones ≈ 52 %) | 3,5–5 M → 7,5–10,5 M |
| Analista | Tiempo completo en nómina (salario 2,5–3,5 M + prestaciones) | 3,8–5,3 M |
| Abogado | Bolsa de horas | cotizar |
| Contador | Mensual | 0,8–1,5 M |

- **Etapa 0:** unos **9–14 M al mes** más el abogado por encargo, sin contar la remuneración del dueño.
- **Etapa 1:** unos **20–32 M al mes**.

La infraestructura y los agentes son una fracción pequeña de eso. El recurso que se optimiza es el criterio
humano, y por eso cada punto del § 6 que automatiza una vigilancia (3, 4, 7, 12) le quita horas a una nómina.

## 8. MEDIDO · SUPUESTO · NO VERIFICABLE DESDE AQUÍ

- **Medido** (comandos y archivo:línea en el inventario de la sesión del 26-sep-2026):
  - autores y fusiones de git desde el 2-sep;
  - los fallos citados en MEMORIA;
  - las normas con `literal_leido:false`;
  - la cobertura de composición de los bancos y la vigencia de cada banco (`fuentes()`);
  - los topes y TTL del perfil;
  - la clave y el token en `public/app.js`;
  - las respuestas 503/501 de `op=cuenta`.
- **Supuesto:** los salarios; la dedicación de cada cargo (ningún proceso tiene horas humanas medidas); el umbral
  de clientes por analista.
- **No verificable desde aquí:**
  - el plan real de Vercel y los cupos consumidos;
  - si el muro de contraseña de Vercel está activo;
  - las rutinas vivas;
  - la protección de la rama `main`;
  - cuántos procesos guarda y presupuesta el cliente al mes, que es el dato que dimensiona costos y analista.
