---
name: precios
description: Atiende las solicitudes de «Buscar» de la pestaña Precios de Detekta con la suscripción de Claude Code (sin clave de API). Por cada presupuesto en cola, genera el Análisis de Precios Unitarios (APU) de cada ítem siguiendo el prompt de ingeniero de costos que trae el expediente, con precios promedio de mercado y sus fuentes, informa el progreso a la aplicación y devuelve el resultado, que la aplicación verifica (aritmética, unidad, fuentes) y enseña. Uso: /precios [id_borrador] [perfil]
---

# Los APU de un presupuesto, desde esta sesión

El servidor de la aplicación no tiene clave de API y no la va a tener: el dueño paga la suscripción de
Claude Code y los APU se hacen AQUÍ, en la sesión, con las instrucciones que trae el expediente (el prompt
del dueño: ingeniero de costos con quince años de experiencia, con el contexto de la obra ya puesto). La
aplicación verifica cada ítem (aritmética, unidad, fuente de cada material), aparta el que no cuadra, y lo
enseña en Precios; el usuario aplica los precios con un clic. Nada entra al costo solo.

Argumentos: `$ARGUMENTS` = `[id_borrador] [perfil]`. Sin argumentos se atienden TODAS las solicitudes en
cola («en_cola» y «buscando» que lleven más de dos horas sin avance). El perfil por defecto es `helder`.

## Pasos (en este orden, sin saltarse ninguno)

1. **Ver la cola.**

   ```bash
   TOKEN=$(grep -o 'const TOKEN = "[^"]*"' public/app.js | head -1 | cut -d'"' -f2)
   BASE=https://portafolio-estrategico.vercel.app
   curl -s -H "x-historico-token: $TOKEN" "$BASE/api/apu?op=ia&pendientes=1" -o /tmp/cola.json
   node -e 'const c=require("/tmp/cola.json"); for (const s of c.solicitudes) console.log(s.estado, s.perfil, s.id, s.filas, "filas ·", s.nombre, "·", s.ciudad||"", s.departamento||"", "·", s.solicitado_el, s.progreso?`· ${s.progreso.pct} % el ${s.progreso.actualizado_el}`:"")'
   ```

   Si se pasó un `id_borrador`, atienda solo ese. Si la cola está vacía, dígalo y termine. Dos solicitudes
   con las mismas filas son el mismo presupuesto pedido dos veces: haga el trabajo una vez y envíelo a las dos.

2. **Pedir el expediente** de cada solicitud: las instrucciones (el prompt, con obra, lugar, fecha, moneda,
   salario mínimo y factor prestacional), el esquema JSON exacto y las filas (descripción, unidad, cantidad,
   precio que ya traía el archivo, `es_titulo`, `necesita_precio`):

   ```bash
   curl -s -H "x-historico-token: $TOKEN" "$BASE/api/apu?op=ia&expediente=1&perfil=<PERFIL>&id=<ID>" -o /tmp/expediente.json
   node -e 'const e=require("/tmp/expediente.json"); if(!e.ok){console.log("ERROR",e.error);process.exit(1)} console.log(e.instrucciones); console.log(JSON.stringify(e.esquema,null,1)); console.log(JSON.stringify(e.entrada.contexto)); console.log("filas",JSON.stringify(e.entrada.resumen)); for (const f of e.entrada.filas) console.log(f.fila, f.es_titulo?"TÍTULO":f.necesita_precio?"APU":"tiene", "|", f.descripcion, "|", f.unidad, "| cant", f.cantidad, "|", f.precio_del_archivo!=null?`archivo ${f.precio_del_archivo}`:(f.precio_actual!=null?`${f.precio_actual} ${f.fuente_actual}`:""))'
   ```

   Lea las instrucciones enteras y sígalas: son el método que el dueño exige.

3. **Avisar que empezó y, cada pocos ítems, el avance.** La pantalla dice «Buscando… completado x %»:

   ```bash
   node -e 'process.stdout.write(JSON.stringify({perfil:"<PERFIL>",id:"<ID>",motor:"sesion",progreso:{hecho:<N>,total:<TOTAL>,mensaje:"<ítem en curso>"}}))' > /tmp/prog.json
   curl -s -X POST -H "x-historico-token: $TOKEN" -H "Content-Type: application/json" --data-binary @/tmp/prog.json "$BASE/api/apu?op=ia" -o /dev/null
   ```

   `total` = filas que no son título. Mande el primero con `hecho: 0` antes de buscar nada, y luego uno cada
   3 a 5 ítems terminados.

4. **Hacer cada APU** (WebSearch y WebFetch de esta sesión) para las filas que no son título, empezando por
   las de `necesita_precio: true`; las que traen precio del archivo también llevan APU, y en `observacion`
   se contrasta con ese precio. Materiales: precio promedio de distribuidores y ferreterías de la zona (no el
   más barato), con desperdicio, y la fuente (nombre; dirección web y fecha de consulta cuando exista; una
   lista oficial de precios del departamento —Antioquia, Boyacá, Cundinamarca, IDU, INVIAS— vale como
   fuente). Mano de obra: cuadrilla, rendimiento, salario mínimo y factor prestacional del expediente. Equipo
   y transporte si aplican; herramienta menor 3-5 % de la mano de obra. Subtotal directo sin AIU. Verifique
   la aritmética: `cantidad_total = cantidad × (1 + desperdicio/100)`, `valor_total = cantidad_total ×
   precio_unitario`, `subtotal_directo = Σ valor_total` (la aplicación aparta lo que se desvíe más de 1,5 %).
   Un ítem que no se pueda calcular va con `subtotal_directo: null` y el motivo en `supuestos`. Nunca una
   cifra inventada.

5. **Escribir la propuesta** en `/tmp/propuesta.json` con la forma EXACTA de `esquema`: `items` con TODAS las
   filas que no son título, cada una con `fila`, `unidad`, `componentes`, `resumen`, `subtotal_directo`,
   `rendimiento`, `supuestos`, `confianza`, `incluye_iva_materiales`; y `observaciones_generales`. Registro
   de usted, sin emojis.

6. **Enviarla.**

   ```bash
   node -e 'const p=require("/tmp/propuesta.json"); process.stdout.write(JSON.stringify({perfil:"<PERFIL>",id:"<ID>",motor:"sesion",propuesta:p}))' > /tmp/cuerpo.json
   curl -s -X POST -H "x-historico-token: $TOKEN" -H "Content-Type: application/json" --data-binary @/tmp/cuerpo.json "$BASE/api/apu?op=ia" -o /tmp/respuesta.json
   node -e 'const r=require("/tmp/respuesta.json"); console.log(r.ok?`GUARDADA · ${r.resumen.con_precio} con APU · ${r.resumen.sin_precio} sin precio · ${r.apartados.length} apartados · costo directo ${r.resumen.costo_directo_total}`:`ERROR ${r.error||""} ${JSON.stringify(r.detalle||"")}`); for (const a of (r.apartados||[])) console.log("  apartado fila", a.fila, "·", a.motivo)'
   ```

   Si hay apartados por aritmética o por fuente, corríjalos y vuelva a enviar: cada envío reemplaza al
   anterior.

7. **Cerrar** diciéndole al dueño, por solicitud: ítems con APU, sin precio (y por qué), apartados, costo
   directo total y las alertas de mercado; y que el usuario lo ve en Precios: paso 2, el borrador se abre
   desde «Más herramientas» → «Guardar o abrir un borrador» → «Abrir un borrador…» → el nombre; el resultado
   sale bajo el botón «Buscar» con «Usar estos precios y calcular».

Reglas que no se negocian: nunca una cifra inventada; cada material con su fuente; la unidad de la fila se
respeta; la aritmética cuadra. Con esto se fija el precio de una oferta real.
