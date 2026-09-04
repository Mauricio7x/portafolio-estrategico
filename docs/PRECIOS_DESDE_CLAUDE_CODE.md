# Precios buscados por inteligencia artificial · cómo se atienden desde Claude Code

**Fecha:** 4-sep-2026. **Para:** el dueño de Detekta (sin terminal: todo son URL y clics).

## Qué ve el usuario

En la pestaña **Precios**, debajo del paso 3, hay una tarjeta **«Precios buscados por inteligencia
artificial»** con el botón **«Pedir precios»**. Al pulsarlo:

1. El presupuesto se guarda como borrador (si no tenía nombre, «Presupuesto sin nombre»).
2. La solicitud queda **en cola**. La tarjeta lo dice y puede cerrar la página.
3. Cuando una sesión de Claude Code la atiende, la tarjeta enseña una tabla con cada ítem, el
   **precio propuesto**, la **fuente** (con enlace), la **fecha de consulta**, si **incluye IVA** y la
   **confianza**. Ningún precio entra al costo por su cuenta: hay que pulsar **«Usar»** en cada fila
   (o «Usar los N precios con fuente»). Al usarlo, la fila queda marcada **«Buscado por la IA»** en
   ámbar (es una referencia publicada, no una cotización de su proveedor) y, al guardar el borrador,
   se recuerda como precio suyo.

Lo que la aplicación **aparta** y no enseña como precio: cualquier cifra sin dirección web, sin
fecha, en otra unidad que la de la fila, o en cero. Se dice cuántas se apartaron y por qué.

## Cómo se atiende la cola (el dueño, con la suscripción de Claude Code)

No hace falta clave de API. Abra una sesión de Claude Code con el repositorio conectado:

1. Entre en **https://claude.ai/code** y abra el repositorio **Mauricio7x/portafolio-estrategico**,
   rama **main**.
2. Escriba en el cuadro de la sesión, literalmente: **`/precios`** (sin argumentos atiende TODAS las
   solicitudes en cola) o **`/precios <id_del_borrador> helder`** para una sola.
3. La sesión pide la cola, baja el expediente de cada solicitud (las filas con el precio que la
   aplicación ya tiene y cuáles necesitan precio), **busca en la web** (listas oficiales de precios,
   contratos adjudicados, fabricantes, tiendas), y devuelve la propuesta. La aplicación la verifica y
   la guarda; la sesión cierra diciendo cuántos precios con fuente, cuántos sin precio y cuántos
   apartados.
4. El usuario abre el borrador en Precios (**«Guardar o abrir un borrador» → «Abrir un borrador…» →
   el nombre**) y ve la tabla con los precios propuestos.

## Ver la cola sin abrir Claude Code

Pegue en Chrome (con su token, como las demás URL de administración):

```
https://portafolio-estrategico.vercel.app/api/apu?op=ia&pendientes=1&token=<SU_TOKEN>
```

Responde `total`, `en_cola` y la lista de solicitudes con perfil, id, nombre, filas y fecha.

## Para que se atienda sola (opcional, decisión del dueño)

La skill `/precios` puede programarse como **rutina en la nube** de Claude Code (por ejemplo cada
hora): en la sesión escriba **`/schedule`** y pida «cada hora, ejecutar /precios». Es una decisión
con costo (consume la suscripción) y por eso no se dejó programada: el dueño la activa cuando quiera.

## Lo que NO hace, y no hay que prometer

- No busca precios desde el servidor: el servidor no llama a ninguna fuente externa en la ruta de una
  petición. Busca la sesión.
- No convierte unidades: si la fuente cotiza en otra unidad, el precio vuelve vacío con la nota.
- No pone un precio en el costo sin que el usuario lo acepte fila a fila.
- Los precios de tienda llevan IVA y margen de mostrador: son un techo para negociar, no su costo.

## Dónde vive en el código

- `lib/apu/precios_ia.js`: instrucciones, esquema, expediente y verificación (capa pura).
- `lib/handlers/apu/editor.js`, acción `ia` (`/api/apu?op=ia`): cola, expediente, propuesta, estado.
- `public/app.js` (`pintarIa`, `usarPrecioIa`, `enrutarArchivoEntrada`) y `public/index.html`
  (`#seccion-ia`, `#entrada-archivo`).
- `.claude/skills/precios/SKILL.md`: la skill de la sesión.
