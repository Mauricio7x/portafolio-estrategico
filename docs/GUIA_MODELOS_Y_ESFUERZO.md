# Guía: qué modelo y qué esfuerzo usar en cada pregunta

> Para: dueño · Estado: referencia · Sustituido por: —

**Para quién es esto:** para el dueño de Detekta, sin conocimientos de programación. Sirve para elegir el modelo y el esfuerzo antes de pedir un trabajo. No cambia la aplicación ni CLAUDE.md.

**Fuentes y fecha de corte: 25-oct-2026.** Las páginas de la documentación de Claude Code que se leyeron son `code.claude.com/docs/en/model-config` y `code.claude.com/docs/en/fast-mode`. Los modelos son los de la configuración de la sesión: `claude-haiku-5-5`, `claude-sonnet-5-5` y `claude-opus-5-5`. Lo que no se pudo confirmar en esas páginas va marcado como [sin verificar].

---

## 1. La idea central

El modelo más potente no siempre es el mejor. Lo que decide la elección es cuánto cuesta equivocarse y cuánto hay que razonar. Una búsqueda simple no necesita el modelo más pesado. Una cifra que va a decidir un precio de oferta sí merece el más cuidadoso.

## 2. Tres preguntas antes de elegir

1. **¿Qué pasa si se equivoca?** Si el error se ve y se corrige rápido, basta un modelo rápido. Si el error llega a un documento oficial o a un precio, suba el modelo y el esfuerzo.
2. **¿Hay que razonar o solo encontrar?** Buscar, copiar o resumir es encontrar. Calcular en varios pasos, cruzar normas o decidir es razonar.
3. **¿Se toca la aplicación?** Si sí, el cambio debe pasar la suite de pruebas, y solo se sube cuando termina en verde. Las reglas completas están en CLAUDE.md, sección «Esfuerzo proporcional a lo que está en juego».

## 3. Qué elegir en cada caso

| Tipo de pregunta | Ejemplo en Detekta | Modelo | Esfuerzo |
|---|---|---|---|
| Buscar un dato o resumir un archivo | Fecha de cierre de un proceso; resumen de un pliego | Haiku | bajo |
| Redactar un acta o un texto | Borrador de acta de una reunión; carta a un proveedor | Sonnet | medio |
| Cambiar la aplicación (cambio acotado) | Corregir un texto o un error pequeño de una pantalla | Sonnet | alto |
| Calcular un APU o un precio de oferta | Costo directo de un ítem; total de una propuesta | Opus | alto |
| Revisar una cifra que decide dinero | Revisar el precio antes de presentar la oferta | Opus | alto, más una segunda revisión (sección 6) |

Esta tabla es una regla práctica (sección 7). Si la sesión ya viene con un modelo, la tabla dice qué elegir al cambiarlo; no dice cuál usa su sesión hoy.

## 4. Qué es el esfuerzo

El esfuerzo no cambia de modelo. Cambia cuánto razona el modelo antes de responder: con un esfuerzo bajo responde más rápido y gasta menos; con uno alto razona más a fondo.

Es como revisar un recibo. A veces basta mirar el total de un vistazo. En una factura que va a pagar, usted suma línea por línea con calculadora y pide que otra persona la revise.

Niveles, con lo que dice la documentación de Claude Code:

| Nivel (nombre en la terminal) | Cuándo conviene |
|---|---|
| bajo (`low`) | Intercambios rápidos en los que usted revisa cada resultado, como una lluvia de ideas o un cambio pequeño como renombrar algo. |
| medio (`medium`) | Es el valor por defecto de los modelos Opus 5.5, Sonnet 5.5 y Haiku 5.5. Sirve para trabajo sensible al costo; puede dar algo menos de precisión. |
| alto (`high`) | Trabajo en que la verificación importa o hay casos borde, como corregir un error en un código que ya existe. |
| muy alto (`xhigh`) | Razonamiento más profundo, con más consumo. |
| máximo (`max`) | Problemas difíciles que Claude debe resolver sin supervisión, como buscar fallas de seguridad. Tiende a pensar de más y puede rendir menos: pruébelo antes de usarlo como costumbre. |

Regla práctica: el nivel alto o el máximo se piden cuando un error costaría caro. En el resto, el nivel medio basta.

## 5. Cómo cambiar el modelo y el esfuerzo

Lo que sigue está confirmado para Claude Code en la terminal. Para la versión web (`claude.ai/code`), la documentación dice que hay un menú de modelo junto a la caja de mensaje, pero no confirmé su nombre ni su forma en pantalla [sin verificar]. Si no sabe si usa la terminal o la web, pregunte a la sesión antes de seguir.

### 5.1 Cambiar el modelo para siempre

1. Escriba `/model haiku`, `/model sonnet` u `/model opus` (elija uno solo) en el campo donde escribe, y pulse «Enter».
   - Si sale bien: el modelo queda guardado como predeterminado. El texto exacto de confirmación no lo verifiqué [sin verificar].
   - Si ve un error: copie el texto completo y envíeselo a la sesión.

### 5.2 Cambiar el modelo solo para esta sesión

1. Escriba `/model` y pulse «Enter». Debe abrirse un selector de modelos. Cómo se ve en pantalla no lo verifiqué [sin verificar].
2. Elija el modelo que quiere.
3. Pulse la tecla «s» (no «Enter»). El modelo cambia solo para esta sesión y el predeterminado no se toca.

### 5.3 Cambiar el esfuerzo

1. Escriba `/effort high` (o `/effort medium`, `/effort low`, `/effort xhigh`, `/effort max`) y pulse «Enter».
   - El nivel queda guardado para el modelo que está usando.
2. Para ver los niveles en una barra deslizante, escriba solo `/effort` y pulse «Enter».
3. Para borrar el nivel que usted guardó para ese modelo, escriba `/effort auto` y pulse «Enter».

### 5.4 Modo rápido: `/fast`

El modo rápido no es otro modelo. Usa Claude Opus con una configuración que prioriza la velocidad. La documentación dice que la calidad es la misma y que cuesta más por token. Solo existe para los modelos Opus.

1. Escriba `/fast` y pulse «Enter».
2. Pulse «Espacio» para activarlo o desactivarlo, y luego «Enter» para confirmar.
3. Si ve el mensaje «Fast mode ON», está activado. Junto a la caja de mensaje aparece un icono pequeño con forma de rayo.
   - Si ve «Fast mode requires usage credits», la cuenta no tiene activados los créditos de uso. Es un ajuste de la cuenta, no un error de Detekta.
   - En una sesión en la nube, escriba `/fast on` en lugar de los pasos 1 y 2.

Úselo para trabajo interactivo en el que importa la velocidad. Para tareas largas o cuando el costo pesa más, desactívelo.

## 6. Lo que el modelo no arregla

- **La verificación depende de la fuente.** Ningún modelo sabe por sí solo un precio de hoy, una norma vigente o un NIT. Si un número no tiene una fuente que usted pueda abrir, no se acepta: va en blanco, con el motivo.
- **Las cifras que deciden necesitan una segunda revisión.** Un cambio que toca un precio, una cifra de oferta o un veredicto lo revisa otra sesión que no lo escribió. Las pruebas deben demostrar que detectan un error a propósito.
- **Un modelo más potente no reemplaza la suite de pruebas** ni la lectura de la fuente.
- Ni el modelo ni el esfuerzo convierten una respuesta en verdad. Un número se comprueba en su fuente.

## 7. Qué es esta tabla y qué no es

- **Es una regla práctica, no una medición.** La documentación describe cada modelo, pero no compara su calidad entre ellos. Haiku: «the fast and efficient Haiku model for simple tasks» (rápido y eficiente para tareas simples). Sonnet: «the latest Sonnet model for daily coding tasks» (para el trabajo diario de programación). Opus: «the latest Opus model for complex reasoning tasks» (para razonamiento complejo).
- **No compara precios por modelo.** Esos precios no están verificados en esta guía.
- **Fable no tiene uso asignado.** El modelo `claude-fable-5-1` y su alias `fable` existen, pero no hay una descripción verificada de cuándo usarlos. Por eso esta guía no les asigna ninguna tarea.
- Si la práctica muestra que la tabla falla en un caso, la regla nueva se propone al dueño para decidir en CLAUDE.md. Esta guía no lo cambia sola.
