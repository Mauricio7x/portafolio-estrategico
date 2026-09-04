# Precios · cómo funciona «Buscar» y quién lo atiende

**Fecha:** 4-sep-2026 (tercera pasada). **Para:** el dueño de Detekta (sin terminal: todo son URL y clics).

## Qué hace el usuario

1. **Paso 1 · Cargue el pliego o su análisis de precios**: suelta el PDF del pliego o el Excel/CSV con su
   APU (con o sin precios) en la zona «Suelte aquí el archivo». Los ítems entran a la lista.
2. **Paso 2 · Buscar los precios y armar los APU**: revisa la lista, escribe dónde es la obra (departamento,
   ciudad, qué obra es, condiciones del sitio) y pulsa **«Buscar»**. La pantalla dice «En cola…» y luego
   **«Buscando… completado x % (n de m ítems)»** con una barra. Puede cerrar la página: el resultado queda
   con el borrador.
3. Cuando termina, aparece cada ítem con su **costo directo** y su desglose (materiales, mano de obra,
   equipo, transporte, herramienta menor, con fuentes, rendimiento y supuestos), el **Análisis** (base de
   precios, fuentes, alertas de mercado) y el botón **«Usar estos N precios y calcular»**, que aplica los
   precios y muestra el **Paso 3 · Su precio** (con AIU, y el botón «Descargar mi presupuesto (Excel)»).
   Un precio que ya venía en su archivo se respeta.

## Quién atiende «Buscar»

El servidor no tiene clave de API. La orden la ejecuta una **sesión de Claude Code** con la suscripción del
dueño, siguiendo el prompt de ingeniero de costos (está en `lib/apu/precios_ia.js`, con el contexto de la
obra puesto automáticamente: lugar, fecha, salario mínimo y factor prestacional). Hay dos caminos:

- **Automático**: una rutina en la nube corre **cada hora** (el mínimo que permite el programador) y
  atiende todo lo que esté en cola. Se ve, se pausa o se ejecuta a mano en
  **https://claude.ai/code/routines** (nombre: «Detekta · atender la cola de Precios»).
- **A mano, ya mismo**: abra https://claude.ai/code con el repositorio Mauricio7x/portafolio-estrategico
  (rama main) y escriba `/precios`. Para un solo borrador: `/precios <id_del_borrador> helder`.

## Ver la cola sin abrir Claude Code

```
https://portafolio-estrategico.vercel.app/api/apu?op=ia&pendientes=1&token=<SU_TOKEN>
```

Responde `total`, `en_cola` y cada solicitud con estado (`en_cola`, `buscando` con `progreso`, `listo`).

## Lo que la aplicación verifica antes de enseñar un APU

- La aritmética de cada componente y del subtotal (tolerancia 1,5 %): lo que no cuadra se aparta y el ítem
  queda sin precio, con el motivo.
- La unidad del ítem (un APU en m² para una fila en m³ se aparta).
- Cada material trae la fuente de su precio (nombre; dirección web y fecha cuando existen).
- Nada entra al costo hasta que el usuario pulsa «Usar estos precios y calcular».

## Lo que NO hace

- No busca precios desde el servidor: busca la sesión.
- No inventa: lo que no se pudo calcular vuelve sin precio y con su supuesto.
- No garantiza un precio de proveedor: son precios promedio de mercado con fuente; verifique antes de
  presentar.

## Dónde vive en el código

- `lib/apu/precios_ia.js`: el prompt con contexto, el esquema del APU, la verificación y el progreso.
- `lib/handlers/apu/editor.js`, acción `ia` (`/api/apu?op=ia`): cola, expediente, progreso, propuesta.
- `public/app.js` (`pintarIa`, `usarPrecioIa`) y `public/index.html` (`#seccion-items`).
- `.claude/skills/precios/SKILL.md`: la skill de la sesión (y la rutina la invoca).
