# Mis procesos, del interés a la liquidación · especificación, plan y decisiones de pantalla

> Para: dueño · Estado: vigente · Sustituido por: —

Este documento acompaña al trabajo del 8-sep-2026 y responde a los cinco entregables que pidió el
encargo: la especificación técnica de lo que se construyó, el plan por fases, las decisiones de
interfaz con su justificación, la lista priorizada de lo que falta y la respuesta —fundamentada— a
lo que no se puede hacer.

**Dónde vive cada cosa.** El *porqué* de cada decisión, con su fecha, está en `docs/MEMORIA.md`
§ «Mis procesos después de ganar: el expediente del contrato, lo que se mueve, el sorteo y lo que
agrega usted». El *dónde* lo da `node tests/mapa.js <término>`. El *cuánto* lo mide
`node tests/estado.js`. Aquí va lo que ninguno de los tres contesta: el plan.

---

## 1 · El ciclo completo de un contratista, y qué cubre hoy la plataforma

Un ingeniero civil que licita recorre siempre el mismo camino. Estas son sus cinco etapas y lo que
la aplicación pone en cada una.

**Antes de decidir** — buscar y filtrar procesos, leer el pliego, calcular el precio, decidir si se
presenta. Lo cubren la pestaña Licitaciones (búsqueda, filtros, índice de competencia, índice de
baja, probabilidad y la plata que deja el contrato), el lector de pliegos y el editor de precios.

**Preparando la oferta** — reunir documentos, vigilar el cronograma, avisar que le interesa, saber
si hay sorteo. Lo cubre Mis procesos: la guía de cada proceso guardado dice qué necesita y qué le
falta; el cuaderno guarda su lista de verificación; el calendario sitúa las fechas; la ficha de la
empresa en Excel le ahorra volver a teclear sus datos. **Nuevo**: la cuenta atrás para entregar y
la respuesta sobre el sorteo.

**Presentada la oferta** — esperar, vigilar adendas, responder observaciones, seguir subsanaciones.
**Nuevo**: el aviso de cada documento que la entidad publique, y el recordatorio de entrar a mirar
los mensajes de SECOP II con la marca de cuándo lo hizo.

**Adjudicado** — firmar, constituir garantías, empezar, cobrar, pedir prórrogas, responder
requerimientos. **Nuevo, y es el hueco que este trabajo llena**: el expediente del contrato.

**Terminado** — recibir, liquidar, dejar escritos los reclamos, liberar la capacidad y las
garantías. **Nuevo**: el aviso de la liquidación y el saldo que el contrato todavía compromete.

---

## 2 · Especificación técnica

### 2.1 Dónde se guarda la información

No hay una base de datos nueva. Todo lo que este trabajo añade cabe en la clave que ya existía por
perfil, `seguimiento:{perfil}`, un solo documento JSON en Redis:

    seguimiento:{perfil}
      carpetas[]                         (del casillero)
      procesos{ id }
        id, estado, notas, foto, guardado, actualizado, visto, visto_el, prediccion
        carpeta, tareas[]                (del casillero)
        origen: "usted" | ausente        ← un proceso que agregó usted
        expediente                       ← NUEVO
          contrato{ numero, valor_cop, plazo_dias, anticipo_pct, supervisor,
                    fecha_adjudicacion, fecha_firma, fecha_acta_inicio,
                    fecha_terminacion, fecha_liquidacion, suspendido }
          polizas[]{ id, amparo, numero, aseguradora, desde, hasta, valor_cop, aprobada }
          pagos[]{ id, concepto, numero, valor_cop, radicado_el, pagado_el }
          oficios[]{ id, asunto, sentido, numero, fecha, responder_antes, respondido }
        novedades                        ← NUEVO
          { el, docs[], desde, revisado_el }

Motivos, cada uno con su consecuencia práctica:

- **Una clave por perfil y no una por proceso.** La pantalla necesita los doscientos guardados a la
  vez para ordenar, agrupar y armar el calendario: con una clave por proceso serían doscientas
  lecturas por pantallazo. El precio es que hay TOPES, y que un tope alcanzado **se dice**.
- **Toda escritura va bajo el candado corto del perfil.** Dos guardados simultáneos respondían «ok»
  los dos y sobrevivía uno; eso ya costó un defecto y está cerrado.
- **La copia de datos lo arrastra solo.** El respaldo trata el valor como una cadena opaca de punta
  a punta, así que el expediente entra en la copia sin tocar nada.
- **Los documentos NO se guardan aquí.** El índice de archivos publicados de cada proceso vive en su
  propia clave comprimida y el texto de cada documento, en la suya con caducidad. Este trabajo solo
  guarda el PUNTERO de lo que usted ya vio.

### 2.2 La API

Ni un endpoint nuevo. Todo se pliega en `/api/perfil?op=seguimiento`, que ya existía:

| Qué | Cómo |
|---|---|
| Ver todo | `GET ?perfil=X` — ahora trae además `expediente`, `expediente_resumen`, `expediente_avisos`, `hitos_contrato`, `sorteo`, `novedades`, `revision_mensajes`, `origen` y `externo` por proceso; y en el resumen, los contratos, el saldo comprometido, las novedades sin ver y cuántos procesos agregó usted |
| Guardar el contrato | `POST {perfil, id, expediente}` — la clave presente fija, la ausente conserva |
| Agregar un proceso suyo | `POST {perfil, accion:"externo_crear", datos:{…}}` — el identificador lo pone el servidor |
| Dar por vistos los documentos | `POST {perfil, id, accion:"novedades_visto"}` — la marca la calcula el servidor desde el índice |
| Anotar que revisó los mensajes | `POST {perfil, id, accion:"mensajes_revisado"}` |
| La agenda | `GET ?perfil=X&ics=todos` — ahora incluye las fechas del contrato |

La razón de no abrir endpoints es dura y está probada: el conteo de funciones de `api/` está fijado
por la suite y el plan de despliegue tiene un techo de funciones. Un servicio nuevo se pliega como
`op` de un router que ya existe, o como campo de una respuesta.

### 2.3 Las notificaciones, y qué se puede prometer

| Señal | ¿Se puede observar? | Latencia | Dónde avisa |
|---|---|---|---|
| Cierre, apertura, presupuesto, modalidad, estado y objeto del proceso | Sí, del corpus | Hasta medio día | Tarjeta, centro de alertas y correo |
| Documento nuevo publicado por la entidad (adenda, respuesta a observaciones, informe) | Sí, del índice abierto de archivos | Unos tres días de la fuente, más lo que tarde en refrescarse | Tarjeta y centro de alertas |
| Mensajes del apartado «Observaciones y mensajes» | **No.** Vive dentro de su cuenta de SECOP II y ninguna fuente abierta lo publica | — | Se dice que no se puede leer, con el enlace y la marca de cuándo lo revisó |
| Fecha del sorteo de oferentes | Solo si el pliego la publica y alguien lo leyó | La del pliego | Tarjeta, calendario y centro de alertas |
| Vencimiento de una póliza, plazo, cobro sin pagar, oficio sin responder | Sí, de lo que usted registre | Inmediata | Tarjeta, centro de alertas, calendario, `.ics` y correo |

**La regla que gobierna la tabla**: no se promete un aviso por un canal que no existe. Un aviso que
no llega es peor que ninguno, porque el usuario deja de mirar.

### 2.4 Seguridad y acceso

No cambia nada de lo que ya estaba y conviene dejarlo escrito, porque el encargo pregunta por ello:
la aplicación está detrás de la protección por contraseña del despliegue más el candado de la propia
pantalla; los endpoints exigen credencial en el servidor, y sin credencial **las cifras del perfil no
salen**; un token presente e inválido responde 401 y nunca degrada en silencio. El expediente del
contrato es información del dueño y viaja por el mismo camino protegido que sus procesos guardados.

**Lo que hoy NO hay, dicho para que no se dé por supuesto**: no hay roles (administrador, ingeniero,
asistente) ni cifrado por documento; hay perfiles, que separan datos pero no permisos. Está en la
lista de la sección 5.

---

## 3 · Plan de implementación por fases

**Fase A — hecha (8-sep-2026).** El expediente del contrato con su estado derivado de las fechas,
las pólizas que avisan, los cobros con radicación y pago, la correspondencia con su fecha de
respuesta, el saldo que compromete; las novedades publicadas y la revisión de los mensajes; el
sorteo con sus cuatro respuestas y sin fecha inventada; los procesos que agrega usted; la cuenta
atrás; y la capa de vidrio sobre lo que flota.

**Fase B — la ejecución que se lee sola.** El corpus ya trae la llave que une un proceso con su
contrato en el registro público de contratos (`proceso_de_compra` = `id_del_portafolio`). Con ella,
un contrato ganado podría traer solo su estado, su valor, sus prórrogas y sus fechas, sin que el
usuario teclee nada. **Requiere medir antes**: un valor pagado en cero es SIN DATO y no «no le han
pagado», y un proceso puede tener varios contratos — hay que decidir cuál es el suyo o enseñarlos
todos con su nombre.

**Fase C — la caja.** La calculadora de lo que le va a entrar por un acta: el bruto menos el
descuento del anticipo, menos lo que le retienen hasta liquidar, menos las deducciones. La
aritmética ya existe en la casa y está probada; falta la pantalla que la use con las cifras del
contrato real. Es la fase que más plata explica.

**Fase D — la prueba que se construye sola.** Bitácora por día con foto desde el teléfono, y el
segundo eje de los avisos («lo vi» ≠ «ya me ocupé»). Un reclamo se pierde por no haberlo escrito el
día que pasó, no por no tener razón.

**Fase E — casar un proceso suyo con el real.** Cuando un proceso que agregó a mano aparezca en
SECOP II, **se casa, no se fusiona**: se propone la pareja, el usuario decide, y el registro suyo
sobrevive adoptando el identificador oficial con todo lo que tenía dentro. La predicción congelada
no se puede reconstruir con fecha de entonces y se dirá.

**Fase F — roles y compartir.** Es lo único que exige repensar el almacenamiento, y por eso va al
final: hoy la unidad de aislamiento es el perfil, no la persona.

El orden no es caprichoso: cada fase vale por sí sola, ninguna bloquea a la siguiente, y las dos
primeras se apoyan en datos que ya están en el árbol.

---

## 4 · Decisiones de interfaz, con su justificación

Estas son las que hay que entender para no deshacerlas por accidente.

1. **Lo que hay que VER va arriba; lo que hay que TOCAR, plegado.** El expediente es un pliegue de
   la tarjeta y su título cerrado ya dice en qué va el contrato y qué es lo más urgente. Un pliegue
   sin pista es un cajón cerrado.
2. **El estado del contrato no se elige: se deriva de las fechas.** Cinco casillas de fecha y un
   interruptor de suspensión. Un rótulo elegido a mano que contradiga a sus propias fechas es una
   mentira creíble, y esas son las que este proyecto persigue.
3. **Solo se enseña lo que el momento pide** — los cobros aparecen cuando hay acta de inicio, la
   correspondencia cuando el contrato está firmado —, **pero una sección con algo escrito se enseña
   siempre**. Se oculta lo que sobra, jamás lo que el usuario escribió.
4. **Nada de valores por omisión en el formulario del contrato.** Un porcentaje precargado se
   convierte en el dato que nadie revisa y que después se firma.
5. **Ninguna cifra sale si falta un sumando.** Sale la frase que dice qué falta por registrar. Un
   total incompleto con aspecto de completo es la peor cifra de todas.
6. **Ni un porcentaje de avance, ni un estado en una palabra.** A dos renglones de un presupuesto,
   un «65 %» se lee como pronóstico. Se enseña el hecho: cuánto lleva cobrado de cuánto.
7. **La cuenta atrás solo cuenta horas donde hay hora**, y lo dice cuando no la hay.
8. **Un proceso que agregó usted se ve distinto y dice qué se pierde**, junto al hueco donde estaría
   lo que falta — no en un aviso que ya pasó.
9. **El aviso vive en la tarjeta del proceso y en el centro de alertas, no en una bandeja aparte.**
   Una bandeja crea un segundo sitio donde mirar y un segundo estado que se desincroniza del primero.
10. **Como mucho dos renglones de novedad por proceso.** Uno por documento convertiría el centro de
    alertas en un registro de sucesos.
11. **El vidrio es para lo que flota**, no para lo que sostiene un dato. Las barras, las hojas y los
    velos lo llevan; las tarjetas con cifras, no. Y las tres preferencias del sistema —reducir
    transparencia, reducir movimiento y aumentar contraste— lo apagan entero.
12. **Registro de usted, ni un pictograma, ni jerga.** «Cuando usted lo entregó» y «cuando le entró
    la plata», no «radicación» y «fecha de pago». La cerca es un censo, no una lista.

---

## 5 · Lo que falta, priorizado por dinero en juego

| # | Qué | Por qué vale | Fase |
|---|---|---|---|
| 1 | La ejecución leída sola del registro público de contratos | El usuario deja de teclear lo que ya está publicado, y lo que teclee se puede contrastar | B |
| 2 | Lo que le va a entrar por esta acta | Es la cifra con la que un contratista decide si aguanta el mes | C |
| 3 | Control del descuento del anticipo | Evita el saldo sorpresa en la liquidación, que se cobra contra la póliza | C |
| 4 | Cupo con la aseguradora | Para el contratista pequeño la póliza —no la capacidad ni la experiencia— es el cuello de botella real: se gana el proceso y no se puede firmar | C |
| 5 | Foto del acta o del oficio desde el teléfono | Convierte «documentar el día que ocurre» en algo que de verdad ocurre | D |
| 6 | Bitácora de obra por día | Construye el reclamo mientras pasa, no ocho meses después | D |
| 7 | Lista de verificación de la liquidación, con las salvedades | La pantalla que impide firmar en blanco | D |
| 8 | «Volver a marcarlo como no visto» y el eje «ya me ocupé» | Sin el deshacer, el usuario no se atreve a abrir | D |
| 9 | Los documentos nuevos también por correo | Hoy el correo lleva el recordatorio, no los documentos | B |
| 10 | Casar un proceso suyo con el real de SECOP II | Evita el duplicado, que es el modo de fallo clásico | E |
| 11 | Exportar el expediente completo a un archivo | Para el contador, el abogado o la reclamación | E |
| 12 | Aviso de reajuste de precios en contratos largos | No pedirlo es dinero regalado | C |
| 13 | Aviso de mayor cantidad ejecutada sin orden escrita | Un argumento que muchos contratistas no saben que tienen | D |
| 14 | Pantalla de qué le llega por correo y cada cuánto | Hoy no hay dónde apagar un canal sin apagarlos todos | E |
| 15 | Roles y compartir con un asistente | Exige repensar la unidad de aislamiento | F |

---

## 6 · Lo que se pidió y no se puede hacer, con su motivo

- **Avisar de cada mensaje de «Observaciones y mensajes».** No hay fuente abierta y la página pública
  del proceso está detrás de un reCAPTCHA para un servidor. La alternativa —pedirle la contraseña de
  SECOP II al dueño— no se va a proponer. Lo que sí se hace: avisar de cada documento que la entidad
  publique, que es la huella de esa conversación, y recordarle entrar a mirar.
- **Decir la fecha del sorteo siempre.** Ninguna fuente abierta la publica y la norma solo dice que
  la entidad PUEDE sortear. Se dice el día cuando el pliego lo trae, y cuando no, se dice que puede
  haberlo y de qué depende.
- **Descontar solo el saldo en ejecución de la capacidad que decide.** Solo cuenta lo que el usuario
  haya registrado, y una capacidad corregida a medias cambiaría en silencio qué procesos pasan la
  puerta. Se publica la cifra con su límite escrito.
- **Arrastrar y soltar documentos.** Excluido por decisión anterior y por el aparato: en el teléfono
  del dueño no existe. Mover es un selector.
