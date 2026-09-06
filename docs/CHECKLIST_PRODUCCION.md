# Anexo F · Lista de verificación previa a producción
### Consultoría SaaS Detekta · 24-ago-2026 · silla de calidad + adversaria

> **Cómo se usa:** esta lista **no se lee, se firma**. Cada línea la comprueba una persona, anota la
> fecha y la evidencia (el comando, la captura o el número), y **una línea en rojo detiene el
> lanzamiento**. No hay «rojo pero seguimos»: si algo no se puede cumplir, se retira del alcance y se
> anota que se retiró.
>
> **Lo que se promete no es «cero errores».** Eso es inalcanzable y prometerlo es mentir. Lo que se
> promete es: **ningún cambio llega al cliente sin haber pasado por aquí.**

---

## 0. QUÉ SIGNIFICA «FUNCIONA AL 100 %»

Traducido a criterios que puede comprobar un tercero:

1. Un contratista **que no conoce la aplicación** sube su certificado de proponente y ve su lista de
   licitaciones **sin ayuda y sin leer instrucciones**.
2. Ninguna cifra en pantalla afirma algo que el dato no sostenga. Cuando no hay dato, **dice que no
   lo hay** — nunca un cero disfrazado.
3. Ningún cliente puede ver datos de otro **por ninguna vía**.
4. Un fallo de un tercero (SECOP, la pasarela, OCR) **degrada** la aplicación, no la tumba.
5. Todo lo que el dueño necesita hacer para operar **se hace desde el navegador**.
6. Si Redis se pierde entero, existe un procedimiento **ya probado** para recuperarlo.

---

## 1. FUNCIONAL

| # | Criterio | Cómo se comprueba | Estado |
|---|---|---|---|
| F-1 | La suite pasa completa, 4 iteraciones | `node tests/e2e.js` → verde | ☐ |
| F-2 | El banco del lector de pliegos publica acierto **y límite** | `node tests/apu_bench.js` | ☐ |
| F-3 | Cada cerradura nueva **falla** contra el árbol anterior | Revertir el arreglo y ver caer la prueba, una por una | ☐ |
| F-4 | Ninguna referencia del frontend apunta a un nodo inexistente | La prueba que cruza los ids contra el HTML | ☐ |
| F-5 | El grafo de módulos no tiene requires rotos ni huérfanos | La auditoría del grafo | ☐ |
| F-6 | Los rewrites y redirects de `vercel.json` resuelven | Uno a uno | ☐ |

## 2. AISLAMIENTO ENTRE CLIENTES ← **sin esto no se lanza**

| # | Criterio | Cómo se comprueba | Estado |
|---|---|---|---|
| A-1 | Dos cuentas, cada una con sus datos; ninguna ve nada de la otra | Prueba de dos inquilinos sobre **todas** las claves de empresa | ☐ |
| A-2 | Pedir el perfil ajeno responde **404**, por todas las vías | `listar` · `resumen` · `pulso` · `seguimiento` · `apu` · `cobertura` · `consorcio` | ☐ |
| A-3 | Ninguna caché sirve a un cliente lo calculado para otro | Revisión de los seis sellos de `ARQUITECTURA_MULTITENANT` §2.5 | ☐ |
| A-4 | Las cuatro claves globales de empresa ya no existen | `scan` en producción: `config:experiencia`, `config:experiencia:terminos`, `config:consorcios`, `apu:parametros` | ☐ |
| A-5 | A-1 y A-2 **fallan** si se revierte el arreglo | Mutación demostrada y anotada | ☐ |

## 3. SEGURIDAD

| # | Criterio | Estado |
|---|---|---|
| S-1 | **Password Protection sigue puesto hasta que A-1..A-5 estén en verde** | ☐ |
| S-2 | No queda ningún token integrado en el código del navegador | ☐ |
| S-3 | La sesión va en cookie `HttpOnly`, `Secure`, `SameSite`, con caducidad | ☐ |
| S-4 | Las contraseñas se guardan derivadas con sal por usuario | ☐ |
| S-5 | La escritura pública tiene límite por IP y responde con un mensaje, no en blanco | ☐ |
| S-6 | El webhook de la pasarela valida firma y es idempotente | ☐ |
| S-7 | El registro de auditoría anota las nueve acciones de `SEGURIDAD_Y_CUENTAS` §7 | ☐ |
| S-8 | Ninguna cifra del perfil sale sin credencial | La prueba que serializa la respuesta pública y busca las cifras reales | ☐ |

## 4. COBRO

| # | Criterio | Estado |
|---|---|---|
| C-1 | Ciclo completo probado en el entorno de pruebas de la pasarela | ☐ |
| C-2 | **Fallo de cobro** probado: reintentos, gracia, baja de plan | ☐ |
| C-3 | **Baja voluntaria** probada: servicio hasta fin de período, exportación disponible | ☐ |
| C-4 | Retracto de 5 días hábiles: procedimiento escrito y probado una vez | ☐ |
| C-5 | Factura electrónica emitida y recibida en una compra real de prueba | ☐ |
| C-6 | Conciliación: cobrado = facturado = cuentas activas | ☐ |
| C-7 | El estado de la suscripción lo manda Detekta, no el panel de la pasarela | ☐ |

## 5. DATOS Y CONTINUIDAD

| # | Criterio | Estado |
|---|---|---|
| D-1 | **Respaldo del histórico restaurado de verdad**, con fecha anotada | ☐ |
| D-1b | **Copia de los datos de usuario restaurada de verdad en producción**, con fecha anotada (la vía existe desde el 6-sep-2026: Mi empresa → Sistema → Copia de sus datos, `op=exportar`/`op=importar`; la ida y vuelta está probada contra el Upstash falso, no contra el real) | ☐ |
| D-2 | Objetivo de recuperación declarado en los términos | ☐ |
| D-3 | La comparación diaria del censo de ingesta avisa si un motivo salta | ☐ |
| D-4 | Retro-pruebas 9.1 y 9.2 ejecutadas, con su resultado escrito | ☐ |
| D-5 | Ninguna pantalla promete predecir si el cliente gana | ☐ |

## 6. LEGAL

| # | Criterio | Estado |
|---|---|---|
| L-1 | Alojamiento con plan que admite uso comercial | ☐ |
| L-2 | Términos, política de tratamiento y aviso de privacidad **firmados por un abogado** | ☐ |
| L-3 | Descargo visible donde se muestra el precio y la probabilidad | ☐ |
| L-4 | Atribución de fuentes visible, con licencia y fecha de corte | ☐ |
| L-5 | Autorización del INVIAS obtenida **o su banco retirado del producto de pago** | ☐ |
| L-6 | Licencias de IDU, FFIE, ICCU, EPC y comercios auditadas | ☐ |
| L-7 | Habilitación de facturación electrónica activa | ☐ |
| L-8 | Módulo de antecedentes del socio: **fuera del plan de pago** hasta que un abogado se pronuncie | ☐ |

## 7. INTERFAZ (obligatorio si se tocó `public/`)

| # | Criterio | Cómo | Estado |
|---|---|---|---|
| I-1 | **Abrir la página en un navegador real** | No hay sustituto. El precedente: con el CDN de estilos bloqueado, los cuatro paneles salían apilados **con cero errores en consola** | ☐ |
| I-2 | Sin desborde horizontal a 390 px | `scrollWidth > clientWidth` | ☐ |
| I-3 | Los valores se leen con `getComputedStyle`, no de memoria | | ☐ |
| I-4 | Con el CDN bloqueado, **se ve la vista correcta** | Simular el bloqueo | ☐ |
| I-5 | Ninguna pulsación se queda sin respuesta visible | Recorrido manual | ☐ |
| I-6 | Ni un emoji en la interfaz; registro formal, de usted | La prueba de jerga y registro | ☐ |

## 8. OPERACIÓN

| # | Criterio | Estado |
|---|---|---|
| O-1 | Canal de soporte publicado, con tiempo de respuesta realista para una persona | ☐ |
| O-2 | Página de estado | ◐ 6-sep-2026: la página de estado ES `/api/procesos?op=salud` (pública, `"ok":true` cuando la sincronización está viva). Falta el monitor externo que la llame cada 15 min y avise por correo (paso del dueño, M-INF-04) |
| O-3 | Procedimiento de incidentes escrito: detectar, avisar, corregir, analizar | ◐ 6-sep-2026: **detectar** = el monitor sobre `op=salud` y sobre la página principal; **avisar** = correo del monitor; **corregir** = abrir `/admin.html` → «Actualizar»; si persiste, en Vercel → Deployments → Redeploy de la versión anterior (O-6, pendiente de probar una vez); **analizar** = `ultimo_error.texto` de `op=salud` dice el fallo y `modo`. Falta configurar el monitor |
| O-4 | Documentación mínima de usuario | ☐ |
| O-5 | **Todo procedimiento de operación se ejecuta desde el navegador** | ☐ |
| O-6 | Reversión de un despliegue malo probada una vez | ☐ |

---

## 9. LA DECISIÓN

```
Fecha: ____________    Quien firma: ____________________

Líneas en verde: ____ / 47        Líneas en rojo: ____

Retirado del alcance (y por qué):
  ______________________________________________________

Decisión:   ☐ SE LANZA        ☐ NO SE LANZA

Si no se lanza, qué falta exactamente:
  ______________________________________________________
```

**Una línea en rojo detiene el lanzamiento.** La alternativa —lanzar con rojos «menores»— es cómo se
llega a un incidente con clientes pagando, y con una persona sola atendiendo.
