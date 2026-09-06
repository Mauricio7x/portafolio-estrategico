# PLAN DE ACCIÓN · Detekta, de herramienta interna a producto por suscripción
### Consultoría SaaS · 24-ago-2026 · plan ejecutable, tarea por tarea, de principio a fin

---

> ### 📖 ¿ES LA PRIMERA VEZ QUE LEE ESTO? EMPIECE POR OTRO LADO.
>
> Este documento es **técnico y está escrito para ejecutar**. Si lo que necesita es entender la
> situación, saber cómo se crea una empresa paso a paso o cómo le afecta su contrato de prestación de
> servicios con ENTerritorio, **lea primero `docs/EMPEZAR_AQUI.md`**: está escrito en lenguaje llano,
> sin tecnicismos, y cubre desde el primer trámite. Vuelva aquí cuando llegue a la programación.

## CÓMO SE USA ESTE DOCUMENTO

Este es el **plan ejecutable**. Los ocho anexos de la consultoría explican **por qué**; este dice
**qué se hace, en qué orden, quién lo hace, cuándo está terminado y cómo se comprueba**.

**Cada tarea trae una ficha con nueve campos.** Ninguno es decorativo:

| Campo | Para qué |
|---|---|
| **Frente** | A jurídico · B datos · C negocio · D arquitectura · E seguridad · F cobro · G ciencia de datos · H calidad · I operación · J mercado |
| **Clase** | **BLOQUEADOR** (sin esto no se cobra) · **NECESARIO** (sin esto se cobra mal) · **MEJORA** |
| **Esfuerzo** | En **jornadas** de una persona. Rango, porque estimar en punto es mentir |
| **Depende de** | Identificadores. Si la dependencia no está en verde, la tarea no empieza |
| **Qué se hace** | La acción concreta |
| **Por qué** | Qué se rompe sin ella. Si no se puede contestar, la tarea sobra |
| **Criterio de aceptación** | Comprobable **por un tercero**, sin ambigüedad. Es el «terminado» |
| **Cómo se verifica** | El comando, la prueba o la pantalla exacta |
| **Trampa conocida** | Lo que ya salió mal en este repositorio o lo que se sabe que sale mal |

**Reglas de ejecución, que no se negocian:**

1. **Una fase no empieza sin cerrar la puerta de la anterior.** Solapar está permitido donde lo dice
   el plan; saltarse una puerta, no.
2. **Todo va a `main`.** Sin ramas de trabajo. Si algo necesita aislarse antes de que lo vea el
   cliente, es un **interruptor de funcionalidad**, no una rama.
3. **La prueba se escribe antes que el arreglo**, y tiene que **fallar** contra el árbol anterior. Una
   prueba que pasa sin el arreglo es un adorno, no una cerradura.
4. **Cada tarea que toque lógica de negocio actualiza `CLAUDE.md` en el mismo commit**, escribiendo la
   **decisión y su motivo**, no un registro de cambios.
5. **Si se toca `public/`, se abre la página en un navegador real.** Sin excepción.
6. **Nada se da por hecho.** Si una premisa de una tarea resulta falsa al abrirla, se dice, se corrige
   y se sigue con lo que la tarea pretendía.

**Cómo leer el esfuerzo total.** Suman **56 a 78 jornadas** de trabajo efectivo. A dedicación
completa son **11 a 16 semanas**; a medio tiempo, el doble. Los trámites externos (autorización del
INVIAS, habilitación en la DIAN, revisión del abogado) **corren en paralelo y no consumen jornadas
suyas**, pero sí calendario: por eso se lanzan el primer día.

---

## MAPA GENERAL

```
SEMANA   1    2    3    4    5    6    7    8    9   10   11   12   13   14   15   16
        ─────────────────────────────────────────────────────────────────────────────
F0      ████                                        Decidir y desbloquear
F1           ████████████                           Mínimo jurídico + calibración
F2           ██████████████████████                 AISLAMIENTO ← camino crítico
F3                            ████████████████      Cuentas y autorización
F4                                      ████████    Cobro
F5                                 ██████████       Operación y calidad
F6                                           ██████████████████  Piloto medido
F7                                                          ████ Lanzamiento
```

**El camino crítico es F0-7 → F2 → F3 → F4 → F7.** Todo lo demás se puede reordenar; esa cadena no.

---

# FASE 0 · DECIDIR Y DESBLOQUEAR
### Semana 1 · 4–6 jornadas · Puerta: hay vehículo que factura decidido, el alojamiento admite cobro, existe un respaldo restaurado y la probabilidad ya se está guardando

> **Por qué esta fase existe.** Cuatro de sus siete tareas dependen de terceros que tardan semanas.
> Si no arrancan el primer día, bloquean la fase 4 cuando ya no haya margen. Y una —F0-7— tiene
> **fecha límite absoluta**: lo que no se empiece a guardar hoy, no se recupera nunca.

### F0-1 · Decidir quién factura
**Frente:** A · **Clase:** BLOQUEADOR · **Esfuerzo:** 0,5 j (más el trámite si es sociedad nueva) · **Depende de:** nada

**Qué se hace.** Elegir entre: persona natural, Génesis SAS, o una sociedad nueva. Anotar la decisión
por escrito con su motivo.

**Por qué.** Determina la obligación de facturar electrónicamente, el tratamiento del IVA, el régimen
de retenciones y —sobre todo— **si el patrimonio personal del dueño responde por el producto**.
Bloquea F0-6, F1-1 y toda la fase 4.

**Recomendación:** **sociedad**. Separa el patrimonio personal del riesgo del producto, y como toda
sociedad comercial está obligada a facturar electrónicamente desde su primera venta, **no hay ninguna
ventaja en aplazarlo**: el trámite habría que hacerlo igual, y migrar después obliga a rehacer términos,
facturación, pasarela y a novar los contratos de los clientes que ya firmaron.

**Cómo se hace, con clics y tarifas:** `docs/EMPEZAR_AQUI.md` **Parte 2** — siete pasos, de comprobar el
nombre en el RUES a abrir la cuenta bancaria. Trámite de **1 a 3 días hábiles** y **$100.000 a $150.000**
en la Cámara de Comercio; el NIT es gratis y no hay que ir a notaría.

**⚠️ Antes de constituir, hay un paso previo que no está en esta ficha:** leer el propio contrato de
prestación de servicios con ENTerritorio y **avisar por escrito al supervisor**. El análisis completo
—incluida la corrección de que ENTerritorio **no es una sociedad de economía mixta** sino una Empresa
Industrial y Comercial del Estado— está en `docs/LEGAL_COLOMBIA.md` §7, y el modelo del aviso en
`docs/EMPEZAR_AQUI.md` §1.4.

**Criterio de aceptación.** Existe un documento de una página con el vehículo elegido, su NIT (o la
fecha prevista de constitución) y quién es el representante legal.

**Cómo se verifica.** El documento existe y F0-6 puede empezar.

**Riesgo si no se hace.** Toda la fase 1 se queda parada: no se pueden redactar términos sin saber
quién contrata.

**Trampa conocida.** «Empiezo como persona natural y después migro» parece barato y no lo es: obliga a
rehacer términos, facturación, pasarela y a novar los contratos de los clientes que ya firmaron.

---

### F0-2 · Contratar el plan comercial de alojamiento y resolver la contradicción del tiempo de función
**Frente:** D · **Clase:** BLOQUEADOR · **Esfuerzo:** 0,5 j · **Depende de:** nada

**Qué se hace.** Contratar Vercel Pro (US$ 20/mes por asiento). Entrar al panel y **comprobar qué
duración máxima admite de verdad** la función `api/procesos.js`. Anotar el número.

**Por qué.** El plan gratuito **restringe el uso a personal y no comercial**: un sitio que cobra
incumple desde el día que enciende el cobro, y el proveedor puede suspender el proyecto. Es el
bloqueador más barato de toda la lista.

**Y hay una contradicción medida que hay que resolver aquí:** `vercel.json` declara
`maxDuration: 300` para `api/procesos.js`, mientras `lib/handlers/procesos/sync.js:69` fija el
presupuesto en **45 s** con el comentario *«cabe en el plan Hobby (60 s)»*. Las dos cosas no pueden ser
ciertas: o se está en el plan gratuito y el 300 se ignora en silencio, o el presupuesto está usando un
sexto del tiempo disponible.

**Criterio de aceptación.** El proyecto está en un plan que admite uso comercial **y** está anotado
el valor real de duración máxima que aplica.

**Cómo se verifica.** Captura del panel con el plan activo y con el límite de la función.

**Riesgo si no se hace.** Se cobra en incumplimiento del contrato del proveedor, con riesgo de
suspensión — es decir, el producto entero cae **el día que empieza a funcionar el negocio**.

**Trampa conocida.** Subir el presupuesto de sincronización de golpe a 300 s sin medir. Se sube por
tramos y se mira que la cadena de tandas siga siendo reanudable: el diseño de auto-encadenado existe
porque una función que se corta a mitad tiene que poder continuar.

---

### F0-3 · Solicitar por escrito la autorización de uso comercial al INVIAS
**Frente:** A · **Clase:** BLOQUEADOR (de ese banco de precios) · **Esfuerzo:** 0,5 j · **Depende de:** F0-1

**Qué se hace.** Escribir a `preciosunitarios@invias.gov.co` solicitando autorización de uso comercial
de los APU Regionalizados y del banco de insumos. Identificar al solicitante, describir el uso
(referencia de precios dentro de una herramienta de apoyo a la decisión, con atribución y vigencia
declaradas) y pedir respuesta escrita. **Guardar el radicado.**

**Por qué.** Los documentos del INVIAS **prohíben el uso comercial sin autorización** — lo declara el
propio repositorio, con el correo de contacto. Es el único bloqueador jurídico duro que depende de un
tercero, y por eso arranca el primer día.

**Criterio de aceptación.** Existe el correo enviado con radicado o acuse.

**Cómo se verifica.** El acuse guardado.

**Riesgo si no se hace.** Se vende un producto que incorpora datos cuya licencia lo prohíbe.

**Trampa conocida.** Esperar la respuesta para seguir. **No se espera:** el plan de pago se diseña
desde ya **sin ese banco**, y si llega la autorización, se añade. Quedan cuatro bancos oficiales.

---

### F0-4 · Respaldar el histórico **y restaurarlo**
**Frente:** B · **Clase:** BLOQUEADOR · **Esfuerzo:** 1–1,5 j · **Depende de:** nada

**Qué se hace.** Exportar el keyspace `licitaciones:historico:mes:*` completo a un archivo comprimido
fuera de Upstash. **Después, restaurarlo en una base de datos de prueba y comprobar que el índice de
competencia se reconstruye a partir de él.** Anotar la fecha de la restauración.

**Por qué.** El histórico es **el activo del producto**: dos años de procesos adjudicados que ninguna
purga toca, y de él salen el índice de competencia, el de baja y toda la inteligencia. **No consta
ningún procedimiento de respaldo en el repositorio.** Y es el único riesgo de la lista que **no avisa**:
el día que se pierde, ya está perdido.

**Criterio de aceptación.** Existe el archivo, existe la constancia de la restauración con fecha, y el
índice reconstruido desde el respaldo da las mismas cifras que el de producción.

**Cómo se verifica.** Comparar `indice:competencia:meta` de producción con el de la restauración:
entidades, μ y mediana tienen que coincidir.

**Riesgo si no se hace.** Pérdida irrecuperable del activo principal, y con clientes pagando.

**Trampa conocida.** Dar por bueno un respaldo que nunca se restauró. **Un respaldo sin restauración
probada no es un respaldo**, es un archivo del que nadie sabe si sirve.

---

### F0-5 · Buscar antecedentes de la marca «Detekta»
**Frente:** A · **Clase:** NECESARIO · **Esfuerzo:** 0,5 j · **Depende de:** nada

**Qué se hace.** Búsqueda de antecedentes marcarios en el sistema de la SIC, en las clases que
correspondan a software y a servicios de información comercial. **Antes de imprimir o registrar nada.**

**Por qué.** La marca sale hoy de una sola fuente de verdad en el código y está en toda la interfaz. Si
está tomada, cambiarla después cuesta mucho más — y ya hubo un cambio de nombre en este producto.
Tarifa verificada: **$1.347.500** la solicitud en línea por clase; **$674.000** cada clase adicional
(Resolución 77243 de 2025, vigente desde el 1-ene-2026), con tarifas reducidas acreditando MIPYME.

**Criterio de aceptación.** Informe de búsqueda con veredicto: libre, con riesgo, u ocupada.

**Cómo se verifica.** El informe.

**Riesgo si no se hace.** Invertir en marca y publicidad sobre un nombre que hay que cambiar.

**Trampa conocida.** Registrar sin buscar antes. La tasa **no se devuelve** si la solicitud se niega.

---

### F0-6 · Habilitarse en facturación electrónica ante la DIAN
**Frente:** A · **Clase:** BLOQUEADOR · **Esfuerzo:** 1 j (más el trámite) · **Depende de:** F0-1

**Qué se hace.** Registrar la responsabilidad en el RUT, habilitarse como facturador electrónico,
elegir proveedor tecnológico o el servicio gratuito de la DIAN, y **emitir una factura de prueba**.

**Por qué.** **Toda sociedad comercial está obligada desde su primera venta**, sin importar tamaño ni
ingresos. Para persona natural depende de topes y del RUT. No se cobra sin esto.

**Criterio de aceptación.** Habilitación activa y **una factura de prueba emitida y recibida**.

**Cómo se verifica.** La factura de prueba en el correo del destinatario.

**Riesgo si no se hace.** Se cobra sin poder facturar: incumplimiento tributario desde el primer peso.

**Trampa conocida.** Dejarlo para «cuando haya clientes». El trámite tarda y F4-8 depende de él.

---

### F0-7 · ⏰ EMPEZAR A GUARDAR LA PROBABILIDAD QUE SE LE ENSEÑÓ AL CLIENTE
**Frente:** G · **Clase:** BLOQUEADOR (con fecha límite absoluta) · **Esfuerzo:** 1 j · **Depende de:** nada

**Qué se hace.** Cuando un usuario guarda un proceso en Mis procesos, **congelar en el registro la
`p_ganar` que se le estaba enseñando, la fecha, y las entradas del cálculo** (rivales estimados, peso
de los datos, factor de precio, banda). Añadir la **fecha de cada cambio de estado**, y distinguir «no
me presenté» de «no lo marqué».

**Por qué.** docs/PROBABILIDAD_MEJORADA.md § «0.2 Los ~11 667 procesos con par completo» demuestra que `P(ganar)` **no es falsable** hoy: el
corpus dice quién ganó, no a qué se presentó nadie. `lib/seguimiento.js:44` ya recoge
`presentado · ganado · perdido` — **es exactamente la etiqueta que falta**. Pero sin la predicción de
aquel momento no hay nada contra qué compararla.

**ESTA ES LA ÚNICA TAREA DEL PLAN CON FECHA LÍMITE ABSOLUTA.** Todo lo demás se puede hacer más tarde
y cuesta lo mismo. **Esto no: cada día que pasa sin guardarlo es un día de datos que no vuelve.** Y es
la ventaja competitiva defendible del producto: los datos de SECOP los baja cualquiera; el registro de
qué decidió el contratista y cómo le fue no lo tiene nadie más.

**Criterio de aceptación.** Un proceso guardado hoy conserva la `p` de hoy aunque el modelo cambie
mañana. Un cambio de estado deja fecha. Un guardado sin desenlace **no cuenta como derrota**.

**Cómo se verifica.** Prueba: guardar, cambiar el modelo, releer y comprobar que la `p` congelada no
se movió. Y que un guardado sin desenlace responde `null` y no `perdido`.

**Riesgo si no se hace.** Se pierde para siempre la posibilidad de validar el modelo con los primeros
meses de clientes, que son justo los que más falta harían.

**Trampa conocida.** Guardar solo el número. Sin las entradas del cálculo no se puede diagnosticar
**por qué** falló una predicción, solo que falló.

---

### F0-8 · Auditar las licencias de los otros cuatro bancos y de los precios de tienda
**Frente:** A · **Clase:** BLOQUEADOR · **Esfuerzo:** 1 j · **Depende de:** nada

**Qué se hace.** Abrir las condiciones de uso de **IDU, FFIE, ICCU y EPC** y de los comercios cuyos
precios se capturaron. Por cada uno: quién publica, bajo qué licencia, si permite uso comercial, qué
exige. **Escribirlo en `docs/LEGAL_COLOMBIA.md` L-8 y L-9.**

**Por qué.** Uno de los cinco bancos ya prohíbe el uso comercial sin autorización. **Nadie ha
comprobado si los otros cuatro dicen lo mismo.** Descubrirlo con clientes pagando es el peor momento.

**Criterio de aceptación.** Las filas L-8 y L-9 dejan de decir «sin auditar» y dicen qué permite cada
una, con enlace y fecha de consulta.

**Cómo se verifica.** El documento actualizado.

**Riesgo si no se hace.** Se vende un producto con datos que no se pueden explotar comercialmente, y
sin saberlo.

**Trampa conocida.** Suponer que «lo publica una entidad pública» significa «se puede usar para
vender». El caso del INVIAS demuestra lo contrario **dentro de este mismo producto**.

---

# FASE 1 · MÍNIMO JURÍDICO Y CALIBRACIÓN PREVIA
### Semanas 2–4 · 5–7 jornadas propias + revisión externa · Solapa con F2 · Puerta: un abogado firmó los documentos y las dos retro-pruebas están ejecutadas y escritas

### F1-1 · Encargar los seis documentos legales
**Frente:** A · **Clase:** BLOQUEADOR · **Esfuerzo:** 1 j propia + honorarios · **Depende de:** F0-1

**Qué se hace.** Encargar a un abogado colombiano: **términos y condiciones del servicio · política de
tratamiento de datos · aviso de privacidad · descargo de responsabilidad · contrato de encargo con los
proveedores de infraestructura · política de reembolso y retracto.** Entregarle el anexo
`docs/LEGAL_COLOMBIA.md` entero, incluidas **las tres preguntas de su §3.1** sobre la ficha del socio.

**Por qué.** Sin términos no hay contrato de suscripción; sin política de tratamiento no se puede
tratar el dato del cliente; sin descargo, la cifra con la que el cliente oferta queda sin ninguna
protección. Y **hay cosas que esta consultoría no puede firmar**.

**Lo que hay que decirle al abogado, textualmente, porque es lo que decide el encargo:**
- El producto **procesa datos personales de terceros que no son clientes** (NIT, representantes
  legales, sanciones disciplinarias, multas) obtenidos de fuentes públicas.
- El Decreto 1377 de 2013 art. 10 **exime de autorización los datos de naturaleza pública**, y eso
  cubre lo general — **pero el módulo de antecedentes del socio necesita criterio propio**.
- La infraestructura está **fuera de Colombia**.
- Desde el piloto se recogerá **el historial de a qué se presentó cada cliente y si ganó**, con
  finalidad de uso agregado para mejorar el modelo. **Esa finalidad va en la política antes de
  recoger la primera fila.**
- El registro de bases de datos ante la SIC **no aplica** si los activos no superan 100.000 UVT
  (verificado). Confirmarlo con los activos reales.

**Criterio de aceptación.** Los seis documentos existen, están firmados o revisados por el abogado, y
publicados en el sitio.

**Cómo se verifica.** Están accesibles desde el pie de la página y desde el alta.

**Riesgo si no se hace.** Se cobra sin contrato, sin base legal para tratar datos y sin límite de
responsabilidad.

**Trampa conocida.** Copiar unos términos de otra plataforma. Los de una tienda no cubren un producto
que **produce la cifra con la que el cliente fija el precio de una oferta**.

---

### F1-2 · Poner la atribución de fuentes en pantalla
**Frente:** A · **Clase:** BLOQUEADOR · **Esfuerzo:** 0,5 j · **Depende de:** F0-8

**Qué se hace.** Línea visible en la portada y en el pie de la lista: **de dónde salen los datos, bajo
qué licencia y con qué fecha de corte**. En el editor de precios, la procedencia de cada banco con su
vigencia — el módulo de fuentes ya la arma desde el `meta()` de cada banco; falta enseñarla.

**Por qué.** `datos.gov.co` permite el uso comercial **a cambio de reconocer la autoría del conjunto
de datos**. Detekta hoy **no atribuye en pantalla**. Es la obligación más fácil de cumplir y la más
fácil de olvidar, y es exactamente el tipo de incumplimiento que se descubre cuando ya hay clientes.

**Criterio de aceptación.** La atribución se ve **sin abrir ningún enlace** en portada, lista y editor.

**Cómo se verifica.** En navegador real, a 390 px de ancho también.

**Riesgo si no se hace.** Incumplimiento de la condición que permite usar los datos comercialmente.

**Trampa conocida.** Transcribir las URL a mano. **Se arman desde el `meta()` de cada banco**: una
segunda lista se desincroniza al re-capturar una vigencia y acabaría citando un documento que no es el
que se usó para calcular.

---

### F1-3 · Poner el descargo donde se muestra la cifra
**Frente:** A · **Clase:** BLOQUEADOR · **Esfuerzo:** 0,5 j · **Depende de:** F1-1

**Qué se hace.** Descargo **visible, no enterrado en un enlace**, en: la tarjeta donde aparece la
probabilidad, el panel de piso y techo, y el presupuesto exportado. Redacción alineada con la doctrina
que el producto ya aplica: **ayuda a la decisión, no asesoría jurídica ni financiera**; las cifras son
referencia con su procedencia declarada.

**Por qué.** Un cliente que oferta con una cifra de Detekta y pierde plata va a mirar de dónde salió.
Las tres capas de defensa son el descargo visible, el límite de responsabilidad en los términos y **la
disciplina de declarar la incertidumbre que ya está en el código**.

**Criterio de aceptación.** El descargo se lee **en la misma pantalla** que la cifra, sin desplegar nada.

**Cómo se verifica.** Navegador real, escritorio y móvil.

**Riesgo si no se hace.** Exposición directa por la cifra con la que el cliente fija su oferta.

**Trampa conocida.** Redactarlo tan largo que nadie lo lea, o tan agresivo que asuste. Dos líneas.

**Corolario que hay que dejar escrito en `CLAUDE.md`:** cualquier cambio futuro que borre una
declaración de incertidumbre «para que la pantalla se vea mejor» **aumenta la exposición jurídica**.
Ya no es solo doctrina interna.

---

### F1-4 · Sacar el módulo de antecedentes del socio del plan de pago
**Frente:** A · **Clase:** BLOQUEADOR · **Esfuerzo:** 0,5 j · **Depende de:** F1-1

**Qué se hace.** El módulo **no entra en ningún plan de pago** hasta que el abogado se pronuncie sobre
las tres preguntas de `docs/LEGAL_COLOMBIA.md` §3.1. Se mantiene para el dueño, que es su uso original.

**Por qué.** Muestra a un cliente el historial sancionatorio **de un tercero que no es cliente**. El
diseño actual ya hace lo correcto —el semáforo **nunca dice «limpio»**, distingue lo vigente de lo
histórico, declara sobre qué fuentes opina y manda pedir los certificados oficiales—, y eso hay que
conservarlo intacto. Lo que cambia al cobrar es que deja de ser una consulta sobre datos públicos y
pasa a ser **un servicio de reporte sobre personas, prestado por precio**.

**Criterio de aceptación.** Ningún plan de pago lo lista entre sus funciones y el acceso está detrás
de un interruptor.

**Cómo se verifica.** La página de precios no lo menciona; una cuenta de pago no lo alcanza.

**Riesgo si no se hace.** Reclamación de un tercero que no aceptó nada y no es cliente.

**Trampa conocida.** «Lo dejo, total ya está hecho». **Retirar un módulo de un plan es barato;
retirarlo después de haberlo vendido, no.**

---

### F1-5 · Ejecutar la retro-prueba temporal de rivales (§9.1)
**Frente:** G · **Clase:** NECESARIO · **Esfuerzo:** 1,5–2 j · **Depende de:** nada

**Qué se hace.** Ejecutar el protocolo **ya escrito** en docs/PROBABILIDAD_MEJORADA.md § «9.1 · Backtest temporal de los rivales (el importante)»: partir el
histórico por tiempo, estimar los rivales esperados de cada entidad con los datos anteriores al corte y
compararlos con los oferentes realmente observados después. **Corre sobre el corpus ya bajado, sin
extraer una sola fila de SECOP.**

**Por qué.** Es la mitad de la cadena de la probabilidad, y **es calibrable hoy**. Si sale bien, es lo
único que se puede escribir con respaldo en la página de precios. **No existe ninguna medida de
calibración en el código**: se buscó y no hay ninguna.

**Criterio de aceptación.** Existe una cifra de error, escrita, con su método y su fecha, y una
comparación contra la banda del 90 % que el modelo ya publica.

**Cómo se verifica.** El documento con el resultado y el guion reproducible.

**Riesgo si no se hace.** Se vende una probabilidad sin haber medido la única parte que se podía medir.

**Trampa conocida.** Elegir el criterio de aprobado **después** de ver el resultado. Está fijado de
antemano en `docs/VALIDACION_MODELOS.md` §4, y ahí se queda.

---

### F1-6 · Ejecutar la retro-prueba temporal de la baja (§9.2)
**Frente:** G · **Clase:** NECESARIO · **Esfuerzo:** 1 j · **Depende de:** nada

**Qué se hace.** Lo mismo con la baja esperada de cada celda contra la baja observada después.

**Por qué.** La baja es lo que sostiene el consejo de precio, que es lo que el cliente va a usar para
ofertar. Aquí un error se traduce en pesos directamente.

**Criterio de aceptación.** Cifra de error escrita, con método y fecha.

**Cómo se verifica.** Igual que F1-5.

**Trampa conocida.** Mezclar celdas con muestra insuficiente. El mínimo de 5 procesos por celda ya está
en el código y **la retro-prueba tiene que respetarlo**, o mide ruido.

---

### F1-7 · Escribir qué se promete y qué no
**Frente:** C · **Clase:** BLOQUEADOR · **Esfuerzo:** 0,5 j · **Depende de:** F1-5, F1-6

**Qué se hace.** Con los dos resultados delante, redactar la lista de afirmaciones que la página de
precios **puede** hacer y la de las que **no**.

**Se puede afirmar, porque está medido:** cuántas empresas suelen competir en esa entidad y sobre
cuántos procesos · cuánto descontaron los que ganaron ahí · de qué banco oficial salió cada precio y
con qué vigencia · cuándo vence el plazo de manifestación de interés.

**No se puede afirmar:** que la aplicación predice si va a ganar · un porcentaje de acierto · que el
precio recomendado maximiza algo comprobado.

**Por qué.** Es la frontera entre vender información y vender una promesa. Y es **la mejor defensa
jurídica del producto**: no se vende una predicción, se vende información con su procedencia.

**Criterio de aceptación.** La lista existe y **toda** la publicidad y la página de precios se ajustan
a ella.

**Cómo se verifica.** Revisión palabra por palabra de la página de precios contra la lista.

**Trampa conocida.** El impulso de escribir «acertamos el 88 %». Ese 88 % es la tasa de acierto del PAA,
que mide **otra cosa**, y usarlo como si midiera la probabilidad sería exactamente el tipo de cifra
creíble y equivocada que este producto existe para no producir.

---

# FASE 2 · AISLAMIENTO ENTRE CLIENTES ← **CAMINO CRÍTICO**
### Semanas 2–6 · 14–19 jornadas · Puerta: la prueba de dos inquilinos pasa **y falla si se revierte el arreglo**

> **Por qué esta fase es la más grande y la más importante.** Sin ella, el primer cliente de pago es
> una fuga de datos. Y no se recupera: en un gremio pequeño donde todos se conocen, que un contratista
> vea los contratos de otro **termina el producto**.

### F2-1 · Diseñar el modelo cuenta → perfiles
**Frente:** D · **Clase:** BLOQUEADOR · **Esfuerzo:** 1,5 j · **Depende de:** nada

**Qué se hace.** Escribir el diseño, en un documento, antes de tocar una línea:

```
cuenta (empresa)  ──┬── perfiles      (helder, genesis, juntos, cons_…, rup_…)
                    ├── experiencia ejecutada
                    ├── consorcios
                    ├── parámetros de costo
                    └── precios corregidos, presupuestos, seguimiento
```

Con la tabla completa de: clave vieja → clave nueva → quién lee → quién escribe → qué pasa en la
migración.

**Por qué.** **Al sistema no le falta aislamiento: le falta un nivel.** Hoy `perfil` hace dos trabajos
—identifica un registro de proponente **y** hace de dueño de los datos— y por eso `config:experiencia`
es una sola clave global: **es un dato de empresa, y el concepto de empresa no existe**.

**Prefijar con `perfil` no lo arregla:** duplicaría la experiencia entre los perfiles del mismo cliente
(helder, genesis, juntos son la misma empresa) y volvería a desincronizarse — que es el defecto que
este proyecto ya pagó varias veces.

**Criterio de aceptación.** El documento existe y responde, para las **doce** claves afectadas, si son
de mercado, de empresa o de perfil.

**Cómo se verifica.** Revisión contra la tabla de `docs/ARQUITECTURA_MULTITENANT.md` §2.

**Trampa conocida.** Empezar a mover claves antes de tener el modelo. Se mueve una, se descubre que
otra depende de ella, y se acaba con dos modelos conviviendo.

---

### F2-2 · Escribir la prueba de dos inquilinos **antes** del arreglo
**Frente:** H · **Clase:** BLOQUEADOR · **Esfuerzo:** 1,5–2 j · **Depende de:** F2-1

**Qué se hace.** Prueba que crea **dos cuentas**, escribe en cada una experiencia, consorcios,
parámetros de costo, precios corregidos, presupuestos y seguimiento, y comprueba que **ninguna ve nada
de la otra por ninguna vía**. Se escribe **ahora, y tiene que fallar**.

**Por qué.** Es la puerta de salida de la fase. Y porque la prueba escrita después del arreglo tiende a
comprobar lo que el arreglo hace, no lo que hacía falta.

**Criterio de aceptación.** La prueba **falla** contra el árbol actual, con un mensaje que nombra la
clave compartida.

**Cómo se verifica.** `node tests/e2e.js` en rojo, señalando la clave.

**Trampa conocida.** Escribir la prueba con la dependencia inyectada de mentira. **Una prueba unitaria
con dependencias inyectadas comprueba el cableado, no el contrato**: esta tiene que pasar por los
handlers reales. Ya costó un defecto en este repositorio — la caja de diagnóstico daba «apartado por
el juicio» sobre todo proceso y la unitaria pasaba en verde.

---

### F2-3 · Mover la experiencia ejecutada a la cuenta
**Frente:** D · **Clase:** BLOQUEADOR · **Esfuerzo:** 2–3 j · **Depende de:** F2-1, F2-2

**Qué se hace.** `config:experiencia` (`lib/almacen.js:153`) y `config:experiencia:terminos` pasan a
`emp:{cuenta}:experiencia` y `emp:{cuenta}:experiencia:terminos`, con **lectura tolerante** (§F2-8).

**Por qué.** Son **los contratos que la empresa ya ejecutó** y el vocabulario destilado de sus objetos.
Con dos clientes, el segundo ve la obra del primero y puede deducir su especialidad.

**Criterio de aceptación.** La parte de la prueba de F2-2 que cubre experiencia pasa a verde. La
auditoría de cobertura del registro de proponente sigue dando el mismo resultado para el dueño.

**Cómo se verifica.** `node tests/e2e.js`, y comparar la auditoría antes y después para la misma cuenta.

**Riesgo si no se hace.** Fuga directa de información comercial.

**Trampa conocida.** Olvidar `config:experiencia:terminos`. Es un **derivado** de la experiencia: si se
migra uno y no el otro, el vocabulario del cliente A puntúa la similitud del cliente B **en silencio**,
que es peor que la fuga evidente porque nadie la ve.

---

### F2-4 · Mover los consorcios a la cuenta
**Frente:** D · **Clase:** BLOQUEADOR · **Esfuerzo:** 1–1,5 j · **Depende de:** F2-1, F2-2

**Qué se hace.** `config:consorcios` (`lib/consorcio.js:47`) → `emp:{cuenta}:consorcios`.

**Por qué.** Es **con quién se alía** el cliente: información competitiva pura.

**Criterio de aceptación.** La parte de consorcios de la prueba pasa. Un consorcio sigue derivándose de
sus integrantes vivos en cada petición.

**Cómo se verifica.** La suite, más comprobar que cargar un registro de proponente nuevo sigue
cambiando el consorcio al instante.

**Trampa conocida.** Los consorcios **se derivan** de los integrantes en cada petición, no se guardan
calculados. Si la migración los congela, un registro nuevo deja de propagarse y el consorcio miente.

---

### F2-5 · Mover los parámetros de costo a la cuenta
**Frente:** D · **Clase:** BLOQUEADOR · **Esfuerzo:** 1–1,5 j · **Depende de:** F2-1, F2-2

**Qué se hace.** `apu:parametros` (`lib/parametros.js:27`) → `emp:{cuenta}:parametros`, **conservando
la caída a los valores por defecto del repositorio** cuando la cuenta no ha cargado los suyos.

**Por qué.** Es la **nómina, el factor prestacional, la jornada y la administración** de la empresa. Con
ellos se reconstruye su estructura de precio.

**Criterio de aceptación.** Dos cuentas con parámetros distintos producen **costos directos distintos**
para el mismo ítem, y una cuenta sin parámetros propios sigue calculando con los valores declarados.

**Cómo se verifica.** Prueba con dos cuentas y el mismo ítem; el resultado tiene que diferir en la
proporción esperada.

**Trampa conocida.** Que la ausencia de parámetros propios se convierta en ceros. **Un parámetro
ausente lanza, no se rellena**: inventar un porcentaje de nómina es inventar un precio. La regla ya
está en el código y hay que conservarla.

---

### F2-6 · Separar los registros de proponente por cuenta ← **el delicado**
**Frente:** D · **Clase:** BLOQUEADOR · **Esfuerzo:** 3–4 j · **Depende de:** F2-1, F2-2

**Qué se hace.** `config:perfiles` (`lib/almacen.js:137`) guarda hoy **un solo JSON con todos los
perfiles**. Pasa a una clave por cuenta, conservando `config:perfiles:{id}` para los dinámicos.

**Por qué.** El registro de proponente de cada cliente es su **documento financiero**: patrimonio,
capacidad, indicadores. No puede vivir en un JSON compartido.

**⚠️ LA INVARIANTE QUE NO SE PUEDE ROMPER.** `lib/perfiles.js` exporta `PERFILES` **síncrono y con la
misma identidad de objeto**, porque **media aplicación lo captura al requerir**. Una carga de registro
**reemplaza sus tres propiedades, nunca el objeto**. Cualquier diseño que convierta `PERFILES` en algo
que se resuelve por petición **rompe el matching, las puertas y el panel a la vez, y en silencio**.

**La ruta segura ya existe:** `lib/perfil_dinamico.js` **inyecta** el perfil en `PERFILES` por petición
y lo retira al terminar. **Se extiende ese mecanismo; no se inventa otro.**

**Y hay una segunda invariante:** `lib/unspsc.js` es hoja del grafo de módulos. Hacer que importe los
perfiles cerraría el ciclo `perfiles → unspsc → perfiles`. La admisibilidad de ingesta sigue saliendo
de las listas del repositorio a propósito.

**Criterio de aceptación.** Dos cuentas con registros distintos ven listas distintas; ninguna ve el
registro de la otra; el dueño conserva sus tres perfiles y el consorcio derivado.

**Cómo se verifica.** La suite completa, **prestando atención a las pruebas de matching y de puertas**:
si se rompe la identidad de objeto, fallan ahí y no en la prueba de aislamiento.

**Trampa conocida.** Además de la identidad de objeto: **si Redis no responde, si la clave no existe o
si el valor está corrupto, se conserva lo vigente o el respaldo y NUNCA se lanza.** Quedarse sin
perfiles deja la aplicación muda. Esa regla es anterior y sobrevive a la migración.

---

### F2-7 · Revisar los seis sellos de caché
**Frente:** E · **Clase:** BLOQUEADOR · **Esfuerzo:** 1,5–2 j · **Depende de:** F2-3 … F2-6

**Qué se hace.** Añadir la cuenta al sello de: `resumen:{perfil}` · `pulso:{perfil}` ·
`cobertura:{perfil}:{modo}` · `diagnostico:{hash}` · `consorcio:sim:{hash}` · `indice:detalle:*` y
`indice:desglose_p:*` (estos dos, caso a caso: mezclan mercado y perfil).

**Por qué.** **El repositorio ya pagó este defecto una vez:** el pulso cacheaba por perfil y no por
credencial, y una respuesta calculada con token servía las finanzas al siguiente sin token. **Un sello
incompleto es la forma más silenciosa de fuga que tiene este sistema**, porque además se sirve rápido.

**Regla:** si el contenido depende de la cuenta o de la credencial, **los dos van en el sello**.

**Criterio de aceptación.** Prueba de tres lecturas por cada caché: cuenta A, cuenta B, cuenta A otra
vez. La segunda no puede recibir lo de la primera.

**Cómo se verifica.** La suite, con la caché **poblada a propósito** — no basta con que el caso no
ocurra: hay que sembrarlo.

**Trampa conocida.** **Un bucle de aserciones sobre una lista que puede estar vacía es una prueba que
puede no existir.** Ya escondió un error 500 en este repositorio. Si el caso importa, se siembra.

---

### F2-8 · Migrar los datos vivos de producción con lectura tolerante
**Frente:** D · **Clase:** BLOQUEADOR · **Esfuerzo:** 2–3 j · **Depende de:** F2-3 … F2-7

**Qué se hace.**
1. Crear la **cuenta cero** con los datos del dueño.
2. **Lectura tolerante:** se busca `emp:{cuenta}:X`; si no está, se cae a la clave legada `X` **y se
   declara en la respuesta de qué sitio salió**.
3. **La escritura va siempre a la clave nueva.** La primera vez que el dueño guarda algo, migra solo.
4. **Nunca se escribe en la legada desde el código nuevo.**

**Por qué.** En producción hay datos vivos bajo las claves viejas, y **la suite no ve ese estado**:
solo conoce el del repositorio. Es exactamente la lección que ya costó un defecto —el catálogo cargado
en Redis antes de una renumeración, que solo se vio al desplegar—.

Es la misma técnica de `claveLegado` en el índice de competencia, que existe porque
`indice:competencia` **no se purga nunca**.

**Criterio de aceptación.** Tras desplegar, el dueño **no pierde nada** y la respuesta declara el
origen de cada dato. Ninguna operación normal exige reconstruir.

**Cómo se verifica.** Prueba con una base sembrada **con las claves viejas** que comprueba que se leen
y que al escribir migran. **Desplegar nunca debe exigir reconstruir.**

**Trampa conocida.** Escribir en los dos sitios «por si acaso». **Crea dos verdades**, que es el
defecto que este proyecto ya pagó varias veces. Se escribe en uno y se lee de dos.

---

### F2-9 · Verificar por mutación
**Frente:** H · **Clase:** BLOQUEADOR · **Esfuerzo:** 0,5 j · **Depende de:** F2-8

**Qué se hace.** Revertir cada arreglo, uno por uno, y comprobar que **su prueba cae**. Anotarlo.

**Por qué.** **Una prueba que pasa contra el árbol anterior es un adorno.** En la auditoría integral de
este repositorio, de 26 cerraduras, 25 fallaban contra el árbol anterior **y una pasaba**: era falsa.

**Criterio de aceptación.** Anotación por escrito, arreglo por arreglo, de que su prueba falla sin él.

**Cómo se verifica.** La anotación.

**Trampa conocida.** Comprobar por expresión regular que una función **se llama**. Eso no prueba lo que
**dice**. Se extrae y se ejecuta con el caso real.

---

### F2-10 · Retirar las claves legadas (diferido)
**Frente:** D · **Clase:** MEJORA · **Esfuerzo:** 0,5 j · **Depende de:** F2-8 + 30 días

**Qué se hace.** Un mes después, comprobar que ninguna lectura cae ya a la clave legada y borrarlas.

**Por qué.** Higiene. **No es urgente y no debe serlo:** borrar antes de tiempo deja sin datos a una
instancia caliente que todavía no había migrado.

**Criterio de aceptación.** Cero lecturas por la vía legada durante 30 días; después, las claves ya no
existen.

**Cómo se verifica.** El contador de origen que introdujo F2-8.

---

# FASE 3 · CUENTAS Y AUTORIZACIÓN
### Semanas 6–9 · 13–17 jornadas · Puerta: un cliente no puede leer el perfil de otro ni cambiando el parámetro, y el token integrado ya no existe

> **⚠️ LA SECUENCIA QUE NO SE PUEDE EQUIVOCAR.** Hoy la única protección real es Vercel Password
> Protection; el token está integrado **a la vista** en `public/app.js`, `public/onboarding.js` y
> `public/pliego.js`. Vender obliga a quitar ese muro —no se puede dar una contraseña común a todos los
> clientes— y **en el instante en que se quita, la aplicación queda sin ninguna protección**.
>
> **REGLA DURA: Password Protection no se retira hasta que F3-1…F3-10 estén en verde.** Ni «un rato
> para enseñárselo a un cliente». **Cuentas primero, muro después.**

### F3-1 · Modelo de datos de la cuenta
**Frente:** E · **Clase:** BLOQUEADOR · **Esfuerzo:** 1 j · **Depende de:** F2-1

**Qué se hace.** Definir la cuenta: identificador, correo, contraseña derivada, estado, plan, fecha de
alta, perfiles que le pertenecen. Y las claves de sesión.

**Criterio de aceptación.** El modelo está escrito y **es el mismo** que usa la migración de F2-8.

**Trampa conocida.** Identificadores predecibles. Los de perfil dinámico ya se generan **en el
servidor, jamás del cliente**; la cuenta hereda esa regla, y hay que revisar la entropía real.

---

### F3-2 · Registro con verificación de correo
**Frente:** E · **Clase:** BLOQUEADOR · **Esfuerzo:** 2 j · **Depende de:** F3-1

**Qué se hace.** Alta con correo y contraseña, verificación por enlace de un solo uso con caducidad.

**Por qué.** Sin verificar, la escritura pública se convierte en un vector de alta masiva.

**Criterio de aceptación.** Una cuenta sin verificar no puede usar el servicio de pago. El enlace
caduca y no se puede reutilizar.

**Trampa conocida.** No romper la puerta de entrada. **El diagnóstico gratuito del registro de
proponente sigue sin pedir credencial**: es el producto, y pedirle cuenta a quien llega a subir su
certificado mata la landing. La cuenta se pide **después** de ver el resultado.

---

### F3-3 · Sesión con cookie firmada
**Frente:** E · **Clase:** BLOQUEADOR · **Esfuerzo:** 1,5 j · **Depende de:** F3-1

**Qué se hace.** Cookie `HttpOnly`, `Secure`, `SameSite=Lax`, firmada, con caducidad y renovación.

**Por qué.** Una cookie `HttpOnly` **no la lee el JavaScript de la página**: es exactamente lo que hoy
no se cumple con el token integrado, que lo lee cualquiera.

**Criterio de aceptación.** El JavaScript de la página **no puede leer** la credencial. La sesión
caduca y se renueva sola mientras se usa.

**Cómo se verifica.** En navegador real, comprobar que la cookie no aparece en `document.cookie`.

---

### F3-4 · Contraseñas derivadas con sal
**Frente:** E · **Clase:** BLOQUEADOR · **Esfuerzo:** 0,5 j · **Depende de:** F3-1

**Qué se hace.** Derivación con `scrypt` del módulo `crypto` nativo, sal por usuario, comparación en
tiempo constante.

**Por qué.** Está disponible **sin dependencias**, y `lib/auth.js` ya hace comparación en tiempo
constante: se reutiliza el criterio, no se inventa otro.

**Criterio de aceptación.** No existe ninguna contraseña en claro ni con función de resumen simple.

---

### F3-5 · Recuperación de contraseña
**Frente:** E · **Clase:** NECESARIO · **Esfuerzo:** 1 j · **Depende de:** F3-2

**Qué se hace.** Enlace de un solo uso, caducidad corta, que **invalida las sesiones abiertas**.

**Por qué.** Sin esto, cada olvido es un ticket de soporte manual — y el soporte es el recurso escaso
(riesgo R-8).

---

### F3-6 · Autorización por recurso ← **el agujero medido**
**Frente:** E · **Clase:** BLOQUEADOR · **Esfuerzo:** 3–4 j · **Depende de:** F3-3, F2-8

**Qué se hace.** El perfil **deja de aceptarse** y pasa a **resolverse desde la sesión**. Un parámetro
`perfil` solo es válido si pertenece a la cuenta autenticada. Se aplica en **las siete vías**:
`listar` · `resumen` · `pulso` · `seguimiento` · `apu` · `cobertura` · `consorcio`.

**El caso concreto, medido:**
```
lib/handlers/procesos/listar.js:349
    let perfil = String(q.perfil || "").toLowerCase();
```
Llega por la query y **nadie comprueba de quién es**.

**Por qué.** Hoy es inofensivo: todos los perfiles son del mismo señor y hay un muro con contraseña
delante. Con cuentas es **acceso directo al registro de proponente, los presupuestos y el seguimiento
de otro cliente cambiando un parámetro en la barra de direcciones**.

**Y cierra dos canales de inferencia de golpe:** el patrimonio se puede acotar por bisección con el
booleano de la puerta de caja, y el conjunto de borradores revela en qué procesos trabaja alguien. Con
un solo dueño detrás de un muro eran aceptables; **con clientes que compiten entre sí, no**. Sin acceso
al perfil ajeno, ninguno de los dos existe. **Por eso esta tarea no es opcional.**

**Criterio de aceptación.** Dos cuentas; cada una pide el perfil de la otra por las siete vías; **todas
responden 404**.

**Cómo se verifica.** Prueba de las siete vías, que **falla si se revierte**.

**Trampa conocida.** Responder **403 y no 404**. Un 403 confirma que ese perfil existe, y con
identificadores enumerables eso ya es información.

---

### F3-7 · Cuotas sobre la escritura pública
**Frente:** E · **Clase:** BLOQUEADOR · **Esfuerzo:** 1,5 j · **Depende de:** nada

**Qué se hace.** Límite por IP y por ventana de tiempo sobre el alta de perfil desde PDF; cuota diaria
por IP para el reconocimiento de imágenes.

**Por qué.** Es **la única escritura sin credencial** del sistema, y es deliberado: es el producto. Ya
tiene cerraduras —identificadores del servidor, TTL de 45 días, tope de 300 perfiles vivos, cuerpo
máximo de 5 MB (`lib/cuerpo.js:36`), tope de 2 000 códigos—, **pero el desalojo por antigüedad se puede
volver en contra**: con el tope lleno, 300 altas seguidas **expulsan a los visitantes legítimos antes de
tiempo**. Y el reconocimiento de imágenes es el único paso que llama a un tercero de pago.

**Criterio de aceptación.** Superar el límite responde **con un mensaje que explica y dice cuándo
reintentar**, nunca con una página en blanco ni un error mudo.

**Trampa conocida.** Poner el límite tan bajo que estorbe a una oficina con IP compartida. Se mide con
el tráfico real antes de apretar.

---

### F3-8 · Registro de auditoría
**Frente:** E · **Clase:** NECESARIO · **Esfuerzo:** 1 j · **Depende de:** F3-1

**Qué se hace.** Anotar: alta y baja de cuenta · inicio de sesión y fallo · cambio de contraseña ·
carga y borrado de registro de proponente · carga de experiencia · cambio de plan · cobro y fallo de
cobro · exportación y borrado de datos. Con quién, cuándo, desde dónde y qué cambió. Conservación:
doce meses.

**Trampa conocida.** Meter datos personales de terceros dentro del registro. Sería crear **una segunda
base de datos con el problema de L-3b**.

---

### F3-9 · Migrar los perfiles dinámicos vivos
**Frente:** E · **Clase:** BLOQUEADOR · **Esfuerzo:** 1,5 j · **Depende de:** F3-2

**Qué se hace.** Los hasta **300** perfiles `rup_…` vivos (`lib/perfil_dinamico.js:95`, TTL de 45 días
en `lib/almacen.js:231`) **siguen funcionando hasta que caduquen**, con la invitación «cree su cuenta y
conserve su perfil».

**Por qué.** Son visitantes que **ya subieron su certificado**. Echarlos para estrenar el sistema de
cuentas es la peor primera impresión posible.

**Criterio de aceptación.** Un perfil dinámico vivo sigue sirviendo su lista tras el despliegue. Uno
caducado responde **404 con la marca de caducado**, que es lo que hace que la web lo olvide.

**Trampa conocida.** Confundir **«Redis caído» con «perfil caducado»**. Ya pasó: el fallo de lectura
devolvía nulo, el endpoint respondía caducado y **la web borraba el perfil guardado del cliente**. El
error se propaga como error; solo el 404 real borra.

---

### F3-10 · Retirar el token integrado del navegador
**Frente:** E · **Clase:** BLOQUEADOR · **Esfuerzo:** 1,5 j · **Depende de:** F3-6

**Qué se hace.** Quitar `const TOKEN = "MiExtraccion2025"` de `public/app.js`, `public/onboarding.js` y
`public/pliego.js`. Las peticiones pasan a autenticarse con la sesión. **`lib/auth.js` y la variable
`HISTORICO_TOKEN` se conservan** para las operaciones de administración del dueño.

**Por qué.** Es la credencial que hoy lee cualquiera. Y **la doble vía header/query se conserva**: el
dueño no tiene terminal y su forma real de disparar una sincronización es pegar la URL en Chrome. Lo
que cambia es **quién** la usa.

**Criterio de aceptación.** Ninguna cadena parecida a una credencial en el código del navegador. La
prueba que ya prohíbe que el token viaje en una URL sigue en verde.

**Cómo se verifica.** Búsqueda en los seis módulos de `public/` + la suite + navegador real.

---

### F3-11 · Retirar Password Protection ← **la puerta de la fase**
**Frente:** E · **Clase:** BLOQUEADOR · **Esfuerzo:** 0,5 j · **Depende de:** F3-1 … F3-10 **todas en verde**

**Qué se hace.** Quitar la contraseña del sitio en el panel del proveedor. **Y ni un minuto antes.**

**Criterio de aceptación.** Antes de tocarlo: F2-9 anotada, F3-6 en verde con mutación, F3-10 sin
credenciales en el navegador. **Se firma la comprobación.**

**Riesgo si se hace antes.** La aplicación queda **completamente abierta**, con el token a la vista en
el código.

**Trampa conocida.** «Lo quito un momento para enseñárselo a un cliente y lo vuelvo a poner.» Es
exactamente como ocurre este fallo.

---

# FASE 4 · COBRO
### Semanas 9–11 · 9–13 jornadas · Puerta: el ciclo completo probado en el entorno de pruebas de la pasarela, **incluido el fallo de pago y la baja**

### F4-1 · Verificar la recurrencia real **antes** de integrar
**Frente:** F · **Clase:** BLOQUEADOR · **Esfuerzo:** 1 j · **Depende de:** F0-1

**Qué se hace.** Abrir la documentación de Wompi y **confirmar que el cobro recurrente funciona sin
intervención del cliente cada mes**: tokenización de tarjeta y de Nequi, cobro programado, qué pasa
cuando la tarjeta caduca. Comparar con Mercado Pago, ePayco y PayU. Confirmar comisiones, requisitos de
vinculación y tiempos de liquidación.

**Por qué.** **Es el punto donde más fácil se asume de más.** Una pasarela puede «tener suscripciones»
en el sentido de guardar la tarjeta y aun así exigir una acción del cliente cada mes — y eso no es una
suscripción, es un recordatorio de pago.

Lo verificado hasta ahora: Wompi ofrece cobros recurrentes con tokenización de tarjetas y Nequi,
comisión **≈ 2,5 %** y **1,49 % por PSE**, la mejor del mercado según la comparativa consultada. **Esas
cifras vienen de extractos del buscador, no de la página de tarifas**, que este entorno no pudo abrir.

**Criterio de aceptación.** Documento de una página: pasarela elegida, comisión real, cómo funciona la
recurrencia, qué pasa al caducar la tarjeta, requisitos de vinculación.

**Trampa conocida.** Integrar primero y descubrir después. Rehacer el cobro con clientes dentro es de
lo más caro que hay.

---

### F4-2 · Planes y límites en el código
**Frente:** C · **Clase:** BLOQUEADOR · **Esfuerzo:** 1,5 j · **Depende de:** F3-1

**Qué se hace.** Tres planes con sus límites, y **qué motor enciende cada uno**:

| Plan | Precio/mes | Motores |
|---|---|---|
| **Esencial** | **$190.000** | Descubrir + Decidir + Seguimiento |
| **Profesional** | **$420.000** | + Costear: editor de precios, bancos oficiales, lector de pliegos, piso y techo, deducciones, Excel |
| **Empresa** | **$850.000** | + Consorcios, huecos del registro, varios usuarios, soporte con compromiso |

**Gratis permanente:** diagnóstico del certificado y lista de a qué puede presentarse, **sin cifras de
dinero**. Ya está construido. **Prueba:** 14 días de Profesional, con final definido y aviso tres días
antes.

**Por qué.** El corte **no** va por número de alertas —así lo hace la competencia y compite en el
escalón barato— sino por **qué decisión toma el cliente**. «Descubrir» y «decidir» ahorran tiempo;
**«costear» decide cuánto gana**, y es donde ninguna plataforma de alertas compite.

**Criterio de aceptación.** El plan del cliente decide qué ve, en el **servidor**. Bajar de plan no
borra nada.

**Cómo se verifica.** Una cuenta Esencial no obtiene el editor de precios **ni llamando al endpoint
directamente**.

**Trampa conocida.** Aplicar el límite solo en el navegador. Esconder un botón no es un límite.

---

### F4-3 · Integrar el cobro
**Frente:** F · **Clase:** BLOQUEADOR · **Esfuerzo:** 3–4 j · **Depende de:** F4-1, F4-2

**Qué se hace.** Alta de método de pago, tokenización, primer cobro, renovación mensual.

**Por qué.** Es la única excepción aceptada a la regla de cero dependencias: la pasarela exige su
cliente, su firma de webhooks y su idempotencia. **Aislada en su módulo y declarada en `CLAUDE.md`.**

**Criterio de aceptación.** Un alta completa en el entorno de pruebas de la pasarela, de principio a fin.

**Trampa conocida.** Abrir la puerta a una segunda dependencia «ya que hay una». **Una, aislada, y se
escribe por qué.**

---

### F4-4 · Webhook firmado e idempotente
**Frente:** F · **Clase:** BLOQUEADOR · **Esfuerzo:** 1,5 j · **Depende de:** F4-3

**Qué se hace.** Validar la firma de cada webhook. Procesamiento **idempotente**: el mismo evento dos
veces no cobra ni activa dos veces.

**Criterio de aceptación.** Un webhook repetido no produce ningún efecto adicional. Uno con firma
inválida se rechaza y se anota.

**Cómo se verifica.** Prueba que envía el mismo evento tres veces y comprueba un solo efecto.

**Trampa conocida.** Confiar en el identificador del evento sin guardarlo. La idempotencia exige
**recordar** lo procesado.

---

### F4-5 · El estado de la suscripción lo manda Detekta
**Frente:** F · **Clase:** NECESARIO · **Esfuerzo:** 1 j · **Depende de:** F4-4

**Qué se hace.** La fuente de verdad del estado es Detekta; la pasarela lo alimenta.

**Por qué.** Un panel de terceros caído **no puede dejar a un cliente sin servicio**.

**Criterio de aceptación.** Con la pasarela inaccesible, un cliente al día **sigue entrando**.

---

### F4-6 · Fin de la prueba gratuita
**Frente:** C · **Clase:** NECESARIO · **Esfuerzo:** 1 j · **Depende de:** F4-2

**Qué se hace.** Aviso a los 11 días, corte a los 14, **caída al plan gratuito y no a la nada**.

**Por qué.** Una prueba sin final es un coste sin ingreso y una expectativa que después se rompe.

**Trampa conocida.** Cortar sin avisar. El aviso previo es lo que convierte.

---

### F4-7 · Degradación por impago
**Frente:** F · **Clase:** NECESARIO · **Esfuerzo:** 1,5 j · **Depende de:** F4-4

**Qué se hace.** El calendario completo:

| Momento | Qué ocurre |
|---|---|
| Falla el cobro | Aviso y **7 días de gracia** con servicio completo. Reintentos a los 3 y 6 |
| Día 8 | Baja al plan gratuito: conserva registro y lista; **pierde cifras de dinero y editor** |
| Día 8–90 | Presupuestos y seguimiento **siguen guardados**, exportables en cualquier momento |
| Día 90 | Aviso de borrado con 15 días. Si no reactiva, se borra y se confirma |
| Baja voluntaria | Servicio hasta fin del período pagado. **Sin penalización** |

**Regla:** **nada se borra en silencio y nada se secuestra.**

**Criterio de aceptación.** Cada transición probada, incluida la exportación durante la degradación.

---

### F4-8 · Conectar la facturación electrónica
**Frente:** A · **Clase:** BLOQUEADOR · **Esfuerzo:** 1,5 j · **Depende de:** F0-6, F4-3

**Qué se hace.** Cada cobro emite su factura electrónica. Se piden **solo** razón social, NIT, correo y
dirección.

**Trampa conocida.** Pedir más campos «por si acaso». **Cada campo del formulario se justifica o se
elimina** — la doctrina de cero fricción no se suspende porque haya dinero de por medio.

---

### F4-9 · Retracto y reembolso
**Frente:** A · **Clase:** BLOQUEADOR · **Esfuerzo:** 1 j · **Depende de:** F4-3

**Qué se hace.** Procedimiento de retracto de **cinco días hábiles** (no calendario) con devolución
completa, y el de reversión del pago. Botón o canal claro, no un correo perdido.

**Por qué.** Ley 1480 de 2011 art. 47: en ventas a distancia **se entiende pactado**. No es cortesía.

**Criterio de aceptación.** Un retracto ejecutado de principio a fin en pruebas, con el dinero devuelto.

---

### F4-10 · Conciliación mensual
**Frente:** F · **Clase:** NECESARIO · **Esfuerzo:** 1 j · **Depende de:** F4-8

**Qué se hace.** Cuadrar **cobrado = facturado = cuentas activas**, sin abrir el panel de un tercero.

**Por qué.** Sin ella, un fallo silencioso de cobro se descubre a los tres meses.

---

### F4-11 · Portal del cliente
**Frente:** C · **Clase:** NECESARIO · **Esfuerzo:** 1,5 j · **Depende de:** F4-3

**Qué se hace.** Ver su plan, cambiar de plan, ver recibos y facturas, cambiar el método de pago,
**exportar sus datos** y **darse de baja sin escribir a nadie**.

**Por qué.** Cada una de esas seis cosas que no exista es un ticket de soporte, y el soporte es el
recurso escaso.

**Trampa conocida.** Esconder la baja. Además de desleal, multiplica las quejas.

---

# FASE 5 · OPERACIÓN Y CALIDAD
### Semanas 10–12 · 7–10 jornadas · Solapa con F4 · Puerta: se puede detectar un fallo, avisar, corregirlo y volver atrás — todo desde el navegador

### F5-1 · Registro estructurado y panel de salud
**Frente:** I · **Clase:** NECESARIO · **Esfuerzo:** 2 j

**Qué se hace.** Registro en JSON a la salida estándar de cada petición: operación, cuenta, duración,
resultado. Panel interno que enseñe **peticiones por operación, errores, duración, estado de la última
sincronización y frescura del corpus**. Sin dependencias: se cuenta con lo que ya está en Redis.

**Por qué.** Hoy **no hay nada**. Un fallo se descubre porque un cliente escribe.

**Criterio de aceptación.** Un error en producción se ve en el panel **sin abrir el código**.

---

### F5-2 · Alerta de deriva de la fuente
**Frente:** B · **Clase:** NECESARIO · **Esfuerzo:** 1,5 j

**Qué se hace.** Guardar el censo de ingesta de cada día y **compararlo con el anterior**. Avisar si:
un motivo de descarte se mueve más de un **50 %** respecto a la media de siete días · las filas
aceptadas caen más de un **30 %** · aparece un literal de modalidad nuevo con más de **100** filas ·
una sincronización acepta **cero** filas.

**Por qué.** **La fuente ya cambió tres veces con consecuencias medidas:** el orden aceptado en el
`$select` dejó producción sin sincronizar **14 horas**; las columnas del PAA eran otras y la vista
servía vacío; una `fase` rezagada mataba convocatorias publicadas **sin dejar rastro en ningún sitio**.
La deriva **no es hipotética en esta fuente**.

Lo bueno: `lib/censo_ingesta.js` **ya cuenta** los descartes por motivo y por literal de modalidad, con
la invariante `leídas = aceptadas + descartadas`. Falta lo barato: comparar y avisar.

**Criterio de aceptación.** Una deriva simulada dispara la alerta.

**Trampa conocida.** Umbrales inventados que avisan cada día. **Se ajustan con dos semanas de datos
reales**, y hasta entonces se anotan como supuestos.

---

### F5-3 · Entorno previo a producción
**Frente:** H · **Clase:** NECESARIO · **Esfuerzo:** 1,5 j

**Qué se hace.** Usar los despliegues de vista previa del proveedor con una base de datos aparte
sembrada con datos realistas. **Se prueba ahí antes de tocar producción.**

**Por qué.** Hoy **«el despliegue se valida desplegando»**. Con un dueño, era un riesgo asumido; con
clientes pagando, no.

**Criterio de aceptación.** Un cambio se prueba en vista previa antes de llegar al cliente.

---

### F5-4 · Reversión probada
**Frente:** I · **Clase:** NECESARIO · **Esfuerzo:** 0,5 j

**Qué se hace.** Volver a la versión anterior **desde el navegador, en minutos**, y probarlo una vez.

**Trampa conocida.** Suponer que revertir el código revierte también los datos. **No.** Si un cambio
escribió en Redis, la reversión necesita su propio paso.

---

### F5-5 · Canal de soporte y compromiso de respuesta
**Frente:** I · **Clase:** NECESARIO · **Esfuerzo:** 0,5 j

**Qué se hace.** Un canal publicado y un tiempo de respuesta **realista para una persona**: 48 horas
hábiles en Esencial y Profesional, 24 en Empresa. **Se promete lo que se puede cumplir.**

**Por qué.** El riesgo R-8 —el soporte desborda— es el único que **el éxito hace más probable**.

---

### F5-6 · Documentación mínima de usuario
**Frente:** I · **Clase:** NECESARIO · **Esfuerzo:** 1,5 j

**Qué se hace.** Cinco páginas, no un manual: cómo empezar · cómo leer una tarjeta · cómo armar un
presupuesto · cómo funcionan los planes · **por qué no aparece una licitación** (que ya tiene respuesta
auditable en la caja de diagnóstico, y es la pregunta que más va a llegar).

---

### F5-7 · Procedimiento de incidentes y página de estado
**Frente:** I · **Clase:** NECESARIO · **Esfuerzo:** 1 j

**Qué se hace.** Escrito: detectar, avisar al cliente, corregir, analizar después. Página de estado con
el estado del servicio y la última sincronización.

**Trampa conocida.** Callar durante un incidente. Un cliente que no sabe qué pasa escribe cinco veces.

---

# FASE 6 · PILOTO MEDIDO
### Semanas 12–15 y tres meses de calendario · 4–6 jornadas · Puerta: los supuestos de precio se convierten en mediciones

### F6-1 · Reclutar diez contratistas **que paguen**
**Frente:** J · **Clase:** NECESARIO · **Esfuerzo:** 2 j

**Qué se hace.** Diez contratistas de obra civil, tres meses, **pagando** —con descuento de
lanzamiento, pero pagando—.

**Por qué.** **Un piloto gratis no mide disposición a pagar: mide cortesía.**

---

### F6-2 · Tres precios a la vez
**Frente:** C · **Clase:** NECESARIO · **Esfuerzo:** 0,5 j

**Qué se hace.** Distintos clientes con distinto precio, declarado como precio de lanzamiento.

**Por qué.** Es la única forma de saber dónde está el límite sin adivinarlo.

**Trampa conocida.** Que dos clientes que se conocen comparen precios sin explicación. Se declara desde
el principio que es un precio de lanzamiento por tiempo limitado.

---

### F6-3 · Instrumentar las cinco métricas
**Frente:** G · **Clase:** NECESARIO · **Esfuerzo:** 1,5 j

**Qué se hace.** Cada una con **la decisión que dispara** — una métrica que no cambia ninguna decisión
no se recoge:

| Métrica | Decisión |
|---|---|
| Llega a ver su lista tras subir el certificado | Si baja, el problema está en la puerta de entrada |
| Guarda un proceso en la primera semana | Predice renovación |
| Exporta un presupuesto al mes | **La** métrica del plan Profesional |
| Marca un desenlace (ganado/perdido) | Alimenta el modelo **y** mide confianza |
| Renueva al mes 4 | La única que valida el precio |

**Sin analítica de terceros.** Todo se cuenta con lo que ya está en Redis — y además es coherente con lo
que se le promete al cliente en la política de tratamiento.

---

### F6-4 · Recoger corpus real de pliegos
**Frente:** G · **Clase:** NECESARIO · **Esfuerzo:** 0,5 j

**Qué se hace.** Con permiso y anonimizados, guardar los pliegos que los clientes suben, hasta reunir
**15–20 variados en entidad y formato**.

**Por qué.** El banco de pruebas del lector da **100 % sobre un corpus sintético escrito por el autor
del parser**: mide previsión, no cobertura. El dueño lo aparcó, **y en contexto interno era razonable**:
si una cantidad salía mal, la veía él. **Al vender cambia quién paga el error**, y en este módulo el
falso positivo cuesta más que el falso negativo.

**Mientras no esté medido:** el lector se ofrece **declarando que la lectura hay que revisarla**, que es
lo que el semáforo de dos ejes ya hace. Lo que no se puede es publicar el 100 % del banco sintético
como si fuera cobertura.

---

### F6-5 · Medir a los tres meses y fijar el precio
**Frente:** C · **Clase:** BLOQUEADOR (del lanzamiento abierto) · **Esfuerzo:** 1 j

**Qué se hace.** Calcular abandono real, coste de conseguir un cliente, meses hasta recuperarlo y valor
de vida. **Hoy esas cuatro cifras no existen y esta consultoría no las inventa.**

**Criterio de decisión, fijado ahora para no elegirlo después del dato:**
- **Más de 7 de 10 renuevan al mes 4** → el precio está **bajo**: se sube el siguiente.
- **Entre 4 y 7** → el precio es el correcto.
- **Menos de 4** → **el problema no es el precio**: el producto no cambió ninguna decisión. Se
  investiga eso **antes de bajar un peso**.

---

# FASE 7 · LANZAMIENTO
### 2–3 jornadas · Puerta: la lista de 47 comprobaciones con decisión firmada

### F7-1 · Recorrer la lista completa
**Frente:** H · **Clase:** BLOQUEADOR · **Esfuerzo:** 1,5 j

**Qué se hace.** Las 47 líneas de `docs/CHECKLIST_PRODUCCION.md`, una por una, con fecha, evidencia y
quién comprobó.

**Criterio de aceptación.** Cero líneas en rojo, o lo que esté en rojo **retirado del alcance y
anotado**.

---

### F7-2 · Firmar la decisión
**Frente:** H · **Clase:** BLOQUEADOR · **Esfuerzo:** 0,5 j

**Qué se hace.** Firmar el bloque final de la lista: **se lanza** o **no se lanza**.

**Por qué.** **Una línea en rojo detiene el lanzamiento.** La alternativa —lanzar con rojos «menores»—
es exactamente cómo se llega a un incidente con clientes pagando y una persona sola atendiendo.

---

### F7-3 · Abrir
**Frente:** J · **Clase:** — · **Esfuerzo:** 0,5 j

**Qué se hace.** Publicar la página de precios, abrir el registro, avisar a los del piloto de que pasan
a precio normal con el descuento prometido.

---

# DESPUÉS DEL LANZAMIENTO · LA RUTINA

**Cada semana:** mirar el panel de salud y las alertas de deriva · revisar los tres riesgos de cabecera
(**R-1** fuga entre clientes, **R-7** deriva de la fuente, **R-8** soporte desbordado) · atender soporte
· una mejora pequeña.

**Cada mes:** conciliación de cobros · respaldo restaurado **y anotado** · revisar altas, bajas y
renovaciones · repasar el censo de ingesta contra el mes anterior.

**Cada trimestre:** reconstruir los índices y **volver a mirar la medición de dispersión y la de
colisión** — el propio sistema las publica en cada reconstrucción · revisar precios contra la
competencia · postmortem de los procesos que los clientes ganaron y perdieron.

**Cuando haya suficientes desenlaces marcados** (orientativo: 300–500 pares con desenlace):
**medir `P(ganar)` de verdad** por primera vez, con el criterio ya fijado en
`docs/VALIDACION_MODELOS.md` §4 — incluida la cuarta fila, la que dice que si el modelo no mejora al
promedio general, **se retira el número de la tarjeta**. Está escrita para que, si llega, no se discuta.

---

# RESUMEN DE ESFUERZO

| Fase | Jornadas | Semanas | Clase dominante |
|---|---|---|---|
| F0 · Decidir y desbloquear | 4–6 | 1 | BLOQUEADOR |
| F1 · Mínimo jurídico y calibración | 5–7 | 2–4 | BLOQUEADOR |
| F2 · **Aislamiento** | **14–19** | 2–6 | BLOQUEADOR |
| F3 · Cuentas y autorización | 13–17 | 6–9 | BLOQUEADOR |
| F4 · Cobro | 9–13 | 9–11 | BLOQUEADOR |
| F5 · Operación y calidad | 7–10 | 10–12 | NECESARIO |
| F6 · Piloto medido | 4–6 | 12–15 | NECESARIO |
| F7 · Lanzamiento | 2–3 | 15–16 | BLOQUEADOR |
| **TOTAL** | **58–81** | **11–16** | |

**Camino crítico:** `F0-7 → F2-1 → F2-2 → F2-3…F2-8 → F2-9 → F3-6 → F3-10 → F3-11 → F4-1 → F4-3 → F4-4 → F7-1 → F7-2`.
Todo lo demás se puede reordenar. Esa cadena, no.

---

# SI SOLO PUDIERA HACER CINCO COSAS

En este orden exacto:

1. **F0-7** — empezar a guardar la probabilidad que se le enseña al cliente. **Es la única tarea con
   fecha límite absoluta**: lo que no se guarde hoy no se recupera, y es lo único que un competidor no
   puede copiar.
2. **F0-4** — respaldar el histórico y **restaurarlo**. Es el riesgo que **no avisa**.
3. **F0-2** — contratar el plan comercial. Veinte dólares compran legalidad.
4. **F2 entera** — el aislamiento. Sin él, cobrar es imprudente.
5. **F3-6** — la autorización por recurso. Cierra de un golpe el agujero medido y dos canales de
   inferencia.

---

# LO QUE ESTE PLAN **NO** HACE, Y POR QUÉ

- **No reescribe la arquitectura.** Ocho claves ya están aisladas y cuatro no. Es cirugía, no reforma.
- **No precalcula el juicio.** Multiplicaría por el número de clientes el trabajo que hoy es constante
  —lo que da el 95 % de margen— y **mataría la promesa que hace vendible el onboarding**: subir el
  certificado y ver la lista al instante.
- **No añade dependencias salvo una**, la del cobro, aislada y declarada.
- **No abre ramas.** Todo a `main`; lo que haya que aislar es un interruptor.
- **No promete que la probabilidad acierta.** Hasta que se mida, se venden los hechos medidos, que
  además son más vendibles porque son verificables.
- **No mete el módulo de antecedentes del socio en un plan de pago** hasta que un abogado se pronuncie.
- **No inventa ninguna cifra.** Lo medido, lo verificado, lo supuesto y lo no verificable van
  separados en cada anexo, y aquí también.

---

# LOS OCHO DOCUMENTOS DE LA CONSULTORÍA

| Documento | Qué responde |
|---|---|
| **`docs/EMPEZAR_AQUI.md`** | **Por dónde empezar**, en lenguaje llano: la situación con ENTerritorio, cómo se crea la empresa paso a paso, las primeras cuatro semanas y un glosario |
| **`docs/PLAN_DE_ACCION.md`** | **Este.** Qué se hace, en qué orden, cómo se comprueba |
| `docs/PLAN_SAAS.md` | El diagnóstico y el resumen para el dueño |
| `docs/LEGAL_COLOMBIA.md` | Qué habilita o impide vender, con estado de verificación |
| `docs/PRECIO_Y_UNIT_ECONOMICS.md` | Cuánto cobrar y con qué método |
| `docs/ARQUITECTURA_MULTITENANT.md` | Cómo separar a los clientes y qué aguanta |
| `docs/SEGURIDAD_Y_CUENTAS.md` | Cuentas, autorización, amenazas y cobro |
| `docs/VALIDACION_MODELOS.md` | Qué se puede prometer y cómo se mide |
| `docs/CHECKLIST_PRODUCCION.md` | Las 47 comprobaciones firmables |
| `docs/RIESGOS.md` | Los quince riesgos con su señal de alerta temprana |
