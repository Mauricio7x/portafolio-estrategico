---
name: precios
description: Atiende las solicitudes de «Precios buscados por inteligencia artificial» de Detekta con la suscripción de Claude Code (sin clave de API). Busca en la web el precio unitario de cada ítem de un presupuesto (listas oficiales, contratos adjudicados, fabricantes, tiendas), lo devuelve con fuente, fecha y enlace, y la aplicación lo verifica y lo enseña para que el usuario lo acepte fila a fila. Uso: /precios [id_borrador] [perfil]
---

# Precios de un presupuesto desde esta sesión

El servidor de la aplicación no tiene clave de API y no la va a tener: el dueño paga la suscripción de
Claude Code y los precios se buscan AQUÍ, en la sesión, con las MISMAS instrucciones que recibiría un
modelo en el servidor. La aplicación verifica cada precio (dirección web, fecha, unidad), aparta lo que no
pasa, y lo enseña en Precios con su fuente para que el usuario decida cuáles usar. Nada entra al costo solo.

Argumentos: `$ARGUMENTS` = `[id_borrador] [perfil]`. Sin argumentos se atienden TODAS las solicitudes en
cola. El perfil por defecto es `helder`.

## Pasos (en este orden, sin saltarse ninguno)

1. **Ver la cola.** La aplicación lista las solicitudes vivas (el usuario pulsó «Pedir precios» en Precios):

   ```bash
   TOKEN=$(grep -o 'const TOKEN = "[^"]*"' public/app.js | head -1 | cut -d'"' -f2)
   BASE=https://portafolio-estrategico.vercel.app
   curl -s -H "x-historico-token: $TOKEN" "$BASE/api/apu?op=ia&pendientes=1" -o /tmp/cola.json
   node -e 'const c=require("/tmp/cola.json"); for (const s of c.solicitudes) console.log(s.estado, s.perfil, s.id, s.filas, "filas ·", s.nombre, "·", s.departamento)'
   ```

   Si se pasó un `id_borrador`, atienda solo ese (aunque no esté «en_cola»: el usuario puede pedirlo dos
   veces). Si la cola está vacía, dígalo y termine.

2. **Pedir el expediente** de cada solicitud. Trae las instrucciones (texto de sistema), el esquema JSON
   exacto y la entrada: las filas con descripción, unidad, cantidad, el precio que la aplicación YA tiene
   con su fuente y su confianza, y `necesita_precio`:

   ```bash
   curl -s -H "x-historico-token: $TOKEN" "$BASE/api/apu?op=ia&expediente=1&perfil=<PERFIL>&id=<ID>" -o /tmp/expediente.json
   node -e 'const e=require("/tmp/expediente.json"); if(!e.ok){console.log("ERROR",e.error);process.exit(1)} console.log(e.instrucciones); console.log(JSON.stringify(e.esquema,null,1)); console.log("filas",e.entrada.resumen, "departamento", e.entrada.departamento); for (const f of e.entrada.filas) console.log(f.fila, f.necesita_precio?"BUSCAR":"tiene", "|", f.descripcion, "|", f.unidad, "|", f.precio_actual, f.fuente_actual||"")'
   ```

   Lea las instrucciones enteras: son las reglas que la verificación impone.

3. **Buscar cada precio en la web** (WebSearch y WebFetch de esta sesión), empezando por las filas
   `necesita_precio: true`. Orden de fuentes: listas oficiales vigentes del departamento de la obra
   (Gobernación de Antioquia, IDU, INVIAS, Gobernación de Cundinamarca, alcaldías, empresas públicas) →
   contratos adjudicados en SECOP con precios unitarios → listas de fabricantes → tiendas con precio
   publicado (Homecenter, Easy, ferreterías) → revistas del sector. Por cada precio anote: nombre de la
   fuente, dirección web completa, fecha de hoy (AAAA-MM-DD), la cita literal, si incluye IVA, y la
   unidad EXACTA de la fila. Si la fuente cotiza en otra unidad y la conversión no es exacta, `null` y
   la explicación en `nota`. Nunca invente ni redondee «para que cuadre».

4. **Escribir la propuesta** en `/tmp/propuesta.json` con la forma EXACTA de `esquema`: todas las filas de
   la entrada, en orden, con su `fila`; `precio_unitario` número o `null`; `fuente` con `nombre`, `url`,
   `fecha` y `cita`; `tipo_fuente` y `confianza` de las listas del esquema; `nota` corta. Registro de
   usted, sin emojis.

5. **Enviarla.** La aplicación la verifica y la guarda; lo que no pase (sin dirección web, sin fecha, en
   otra unidad, cero) vuelve en `apartados` con su motivo:

   ```bash
   node -e 'const p=require("/tmp/propuesta.json"); process.stdout.write(JSON.stringify({perfil:"<PERFIL>",id:"<ID>",motor:"sesion",propuesta:p}))' > /tmp/cuerpo.json
   curl -s -X POST -H "x-historico-token: $TOKEN" -H "Content-Type: application/json" --data-binary @/tmp/cuerpo.json "$BASE/api/apu?op=ia" -o /tmp/respuesta.json
   node -e 'const r=require("/tmp/respuesta.json"); console.log(r.ok?`GUARDADA · ${r.resumen.con_precio} con precio · ${r.resumen.sin_precio} sin precio · ${r.apartados.length} apartados`:`ERROR ${r.error||""} ${JSON.stringify(r.detalle||"")}`); for (const a of (r.apartados||[])) console.log("  apartado fila", a.fila, "·", a.motivo)'
   ```

   Si hay apartados que pueda corregir (por ejemplo, faltaba la dirección web), corríjalos y vuelva a
   enviar: cada envío reemplaza al anterior.

6. **Cerrar** diciéndole al dueño, por solicitud: cuántos precios con fuente, cuántos sin precio y por
   qué, cuántos apartados; y que el usuario ya los ve en Precios (abrir el borrador desde «Guardar o
   abrir un borrador» → «Abrir un borrador…» → el nombre del presupuesto → la tarjeta «Precios buscados
   por inteligencia artificial» → «Usar» en cada fila).

Reglas que no se negocian: nunca un precio sin dirección web ni fecha; nunca en otra unidad sin decirlo;
nunca una cifra inventada. Con ella se fija el precio de una oferta real.
