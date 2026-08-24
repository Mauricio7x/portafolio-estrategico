# Anexo D · Identidad, autorización, seguridad y cobro
### Consultoría SaaS Detekta · 24-ago-2026 · silla de seguridad + adversaria

---

## 1. LA SECUENCIA QUE NO SE PUEDE EQUIVOCAR

**Hoy la única protección real de Detekta es Vercel Password Protection.** La llave de la aplicación
(`const TOKEN = "MiExtraccion2025"`) está integrada en `public/app.js`, `public/onboarding.js` y
`public/pliego.js`, **a la vista de cualquiera que abra el código fuente**. Eso es una decisión
correcta y documentada para un dueño sin terminal: el muro está delante.

**El riesgo de secuencia:** vender obliga a quitar ese muro —no se puede dar una contraseña común a
todos los clientes— y **en el instante en que se quita, la aplicación queda sin ninguna protección**,
porque el token que hay detrás lo lee cualquiera.

> **REGLA DURA: Password Protection no se retira hasta que las cuentas estén funcionando y probadas.**
> Ni «un rato para enseñarlo», ni «solo para el piloto». Es el único orden seguro:
> **cuentas primero, muro después.**

---

## 2. DE UN TOKEN COMPARTIDO A CUENTAS REALES

### 2.1 · Lo que se conserva

`lib/auth.js` está bien construido y **no se tira**: digest SHA-256 comparado en tiempo constante,
sin valor por defecto —sin la variable de entorno responde 503 y no hace nada—, una sola
implementación con doce puntos de llamada. Eso es la base sobre la que se monta la sesión.

**También se conserva la doble vía header/query.** El dueño no tiene terminal y su forma real de
disparar una sincronización es pegar la URL en Chrome. Lo que cambia es **quién** usa esa vía: pasa a
ser exclusiva de las operaciones de administración del dueño, no la credencial de los clientes.

### 2.2 · Lo que se añade

| Pieza | Decisión | Por qué |
|---|---|---|
| Registro | Correo + contraseña, con verificación del correo | Sin verificar, la escritura pública se convierte en un vector de alta masiva |
| Sesión | Cookie firmada, `HttpOnly`, `Secure`, `SameSite=Lax`, con caducidad y renovación | Una cookie `HttpOnly` no la lee el JavaScript de la página: es lo que hoy no se cumple con el token integrado |
| Contraseñas | Derivación con `scrypt` de `crypto` nativo, sal por usuario | Ya está disponible sin dependencias |
| Recuperación | Enlace de un solo uso, caducidad corta, invalidando sesiones | Sin esto, cada olvido es un ticket de soporte manual |
| Cuenta ≠ perfil | La cuenta es la **empresa**; los perfiles cuelgan de ella | Ver `docs/ARQUITECTURA_MULTITENANT.md` §1 |
| Cierre de sesión y borrado | Exportación de sus datos antes de borrar | Obligación de la política de tratamiento |

### 2.3 · La migración de los perfiles vivos

Hay hasta **300 perfiles dinámicos** en producción (`lib/perfil_dinamico.js:95`), con TTL de **45
días** (`lib/almacen.js:231`). Al aparecer las cuentas, esos perfiles **no pueden desaparecer de
golpe**: son visitantes que ya subieron su certificado.

**Regla:** un perfil `rup_…` vivo sigue funcionando **hasta que caduque**, y se le ofrece «cree su
cuenta y conserve su perfil». Echar a alguien que ya está dentro para estrenar el sistema de cuentas
es la peor primera impresión posible.

---

## 3. AUTORIZACIÓN POR RECURSO — EL AGUJERO MEDIDO

```
lib/handlers/procesos/listar.js:349
    let perfil = String(q.perfil || "").toLowerCase();
```

El perfil llega **por la query** y **nadie comprueba que quien pide sea su dueño**. Hoy es inofensivo:
todos los perfiles son del mismo señor y detrás hay un muro con contraseña. Con cuentas, es **acceso
directo al registro de proponente, los presupuestos y el seguimiento de otro cliente cambiando un
parámetro en la barra de direcciones**.

**Corrección:** el perfil **no se acepta**, se **resuelve** desde la sesión. Un parámetro `perfil`
solo es válido si pertenece a la cuenta autenticada; si no, **404 y no 403** — un 403 confirma que ese
perfil existe, y con identificadores predecibles eso ya es información.

**La prueba que lo cierra:** dos cuentas, cada una pide el perfil de la otra por todas las vías
(`listar`, `resumen`, `pulso`, `seguimiento`, `apu`, `cobertura`, `consorcio`) y **todas responden
404**. Y falla si se revierte el arreglo.

---

## 4. LA ESCRITURA PÚBLICA: ACOTARLA SIN MATARLA

La creación de perfil desde el PDF del registro es **la única escritura sin credencial** del sistema.
Es deliberado y **es el producto**: pedir credencial a quien llega a subir su certificado mata la
landing.

**Cerraduras que ya existen y hay que conservar:** identificadores generados en el servidor, jamás del
cliente · solo puede escribir bajo `config:perfiles:rup_*` y `config:unspsc:rup_*` · no alcanza los
perfiles del dueño ni el sello que fuerza la recarga · TTL de 45 días · tope de 300 perfiles vivos,
que **desaloja el más antiguo en vez de rechazar** · cuerpo máximo de 5 MB (`lib/cuerpo.js:36`) ·
tope de 2.000 códigos por perfil, que da error y no truncado silencioso.

**Lo que falta al cobrar:**

| Riesgo | Mitigación | Por qué así |
|---|---|---|
| Alta masiva automatizada | Límite por IP y por ventana de tiempo | Con 300 plazas, 300 altas seguidas dejan la puerta llena de basura. El desalojo por antigüedad **lo convierte en un ataque contra los visitantes legítimos**, que pierden su perfil antes de tiempo |
| Coste de OCR | Cuota diaria por IP para el reconocimiento de imágenes | Es el único paso que llama a un tercero de pago |
| Sondeo de perfiles ajenos | Identificadores no adivinables y **404 en vez de 403** | Ya están generados en el servidor: falta comprobar la entropía |

**Ninguna de estas respuestas puede ser un error mudo.** «Ha superado el límite, inténtelo en una
hora» es una respuesta; una página en blanco no lo es.

---

## 5. CANALES DE INFERENCIA (lo que se deduce de lo que sí sale)

El repositorio ya documenta y acepta tres. **Con clientes que compiten entre sí, hay que releerlos:**

| Canal | Qué se deduce | ¿Cambia al vender? |
|---|---|---|
| La probabilidad publicada permite despejar la baja de mercado | El descuento típico de la entidad | **No.** Es dato de mercado y cualquiera lo recalcula bajando el dataset público. Se conserva |
| `p3_caja.pasa` permite acotar el patrimonio por bisección | El patrimonio del perfil | **SÍ, y mucho.** Hoy es el patrimonio del dueño detrás de un muro. Mañana es el de un cliente, y quien bisecciona puede ser **su competidor** |
| El conjunto de borradores revela en qué procesos trabaja alguien | Su cartera comercial | **SÍ.** Es información competitiva directa |

**Los dos últimos dejan de ser aceptables.** Con la autorización por recurso del §3, ambos se cierran
solos: sin acceso al perfil ajeno no hay bisección ni listado de borradores que valga.
**Es la razón de que el §3 no sea opcional.**

**Y uno nuevo que aparece con las cuentas:** las cachés compartidas. Si `resumen:{perfil}` o
`pulso:{perfil}` no llevan la cuenta en el sello, una respuesta calculada para un cliente se sirve al
siguiente. Ya pasó una vez con el pulso y la credencial; está corregido, y la lección es que
**el sello incompleto es la forma más silenciosa de fuga que tiene este sistema**.

---

## 6. MODELO DE AMENAZAS

| Actor | Activo | Vía | Impacto | Mitigación |
|---|---|---|---|---|
| **Cliente legítimo curioso** ← el más probable | Perfil, presupuestos y cartera de otro cliente | Cambiar `?perfil=` | Fuga competitiva directa | §3 |
| Competidor de Detekta | El corpus y los índices | Raspado con una cuenta de pago | Pérdida de ventaja | Límites por cuenta; aceptar que los datos base son públicos |
| Visitante malicioso | Disponibilidad de la puerta de entrada | Alta masiva | Los visitantes legítimos pierden su perfil por desalojo | §4 |
| Cualquiera con el código fuente | La aplicación entera | Leer el token integrado | Total | §1: cuentas antes de quitar el muro |
| Operador (el dueño) | Todo | Error humano sin terminal | Pérdida de datos | Respaldo restaurado + registro de auditoría |
| Proveedor caído | Disponibilidad | Upstash o Vercel fuera | Servicio caído | Página de estado y comunicación; el corpus se reconstruye |

---

## 7. REGISTRO DE AUDITORÍA

Qué se anota, como mínimo: **alta y baja de cuenta · inicio de sesión y fallo · cambio de contraseña ·
carga y borrado de registro de proponente · carga de experiencia · cambio de plan · cobro y fallo de
cobro · exportación y borrado de datos**.

Con **quién, cuándo, desde dónde y qué cambió**. Conservación: doce meses.
**Sin datos personales de terceros dentro del registro** — sería crear una segunda base de datos con
el problema de L-3b.

---

## 8. COBRO: EL CICLO COMPLETO

```
alta → verificación del correo → elección de plan → tokenización de la tarjeta
     → cobro → recibo → factura electrónica → renovación mensual
     → [fallo de cobro] → 3 reintentos → gracia de 7 días → baja de plan
     → [baja voluntaria] → hasta fin del período → exportación → borrado a los 90 días
```

**Decisiones:**

1. **Pasarela: Wompi.** Ofrece cobro recurrente con tokenización de tarjetas y de Nequi, comisión
   aproximada del **2,5 %** y **1,49 % por PSE**, la mejor del mercado según la comparativa
   consultada. **Verificar antes de integrar** que la recurrencia funciona sin intervención del
   cliente cada mes: es el punto donde más fácil se asume de más.
2. **El webhook de la pasarela se valida con su firma**, y el procesamiento es **idempotente**: un
   webhook repetido no puede cobrar ni activar dos veces.
3. **La fuente de verdad del estado de la suscripción es Detekta, no la pasarela.** Un panel de
   terceros caído no puede dejar a un cliente sin servicio.
4. **Conciliación mensual** entre lo cobrado, lo facturado y las cuentas activas. Sin ella, un fallo
   silencioso de cobro se descubre a los tres meses.
5. **Datos que se piden para facturar:** razón social, NIT, correo y dirección. **Nada más.** Cada
   campo del formulario se justifica o se elimina — la doctrina de cero fricción no se suspende
   porque haya dinero de por medio.

---

## 9. TRES COLUMNAS

**MEDIDO** — el token integrado en tres módulos del navegador · `listar.js:349` acepta el perfil de la
query sin comprobación · doce puntos de llamada a `lib/auth.js` · tope de 300 perfiles y TTL de 45
días · cuerpo máximo de 5 MB · los tres canales de inferencia ya documentados.

**VERIFICADO CONTRA FUENTE EXTERNA** — Wompi admite cobros recurrentes con tokenización; comisión
≈ 2,5 % y 1,49 % por PSE.

**SUPUESTO** — que `scrypt` nativo basta sin dependencias · los plazos de gracia y borrado · que la
verificación de correo frena el alta masiva · doce meses de conservación del registro de auditoría.

**NO VERIFICABLE DESDE AQUÍ** — las condiciones contractuales reales de la pasarela (requisitos de
vinculación, tiempos de liquidación, si la recurrencia exige contrato aparte): el proxy bloquea
`wompi.com` · la entropía real de los identificadores `rup_…`, que hay que revisar en el código.
