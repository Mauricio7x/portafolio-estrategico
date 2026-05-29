# Detecta · Monitor autónomo + Resumen IA — Guía de instalación

Esto convierte tu app de "abrir para consultar" a "te avisa solo por Telegram".
Cuatro piezas nuevas, todas sobre tu Vercel actual. Sigue los pasos en orden.

## Qué hace cada archivo

| Archivo | Para qué |
|---|---|
| `lib/engine.js` | Tu motor de encaje (score 0–100) portado a Node, para que el cron calcule **lo mismo** que ves en la web. |
| `api/proxy.js` | El proxy de Socrata con App Token (CORS + más cuota). Reemplaza tu `/api/proxy` actual si quieres unificar. |
| `api/cron.js` | El monitor: consulta SECOP II + SECOP I, puntúa, verifica anticipo, **detecta lo nuevo** y avisa por Telegram. |
| `api/resumen.js` | Resumen IA de 2 frases por proceso (el botón "🤖 Resumen IA" de cada tarjeta). |
| `vercel.json` | Programa el cron cada 3 horas. |
| `index.html` | Tu archivo, ya parcheado con el botón de resumen y el bloque "¿Qué falta para 100%?". |

## Paso 1 · Subir los archivos a tu repo

Copia `lib/`, `api/`, `vercel.json` y el `index.html` parcheado a la raíz de tu
proyecto Vercel. Haz commit y push (o súbelo por el dashboard de Vercel).

## Paso 2 · Crear el almacenamiento (memoria del cron)

En Vercel → tu proyecto → **Storage** → **Create Database** → **KV** (Upstash Redis).
Al crearla, Vercel inyecta solo `KV_REST_API_URL` y `KV_REST_API_TOKEN`. No tienes
que copiarlas a mano. (Es lo que le da memoria: recordar qué ya te avisó.)

## Paso 3 · Crear el bot de Telegram (2 minutos)

1. En Telegram, abre **@BotFather** → `/newbot` → ponle nombre → te da un **token**
   tipo `8123456789:AAH...`. Ese es tu `TELEGRAM_BOT_TOKEN`.
2. Escríbele algo a tu bot recién creado (un "hola"), para que exista el chat.
3. Abre en el navegador:
   `https://api.telegram.org/bot<TU_TOKEN>/getUpdates`
   Busca `"chat":{"id": 123456789` → ese número es tu `TELEGRAM_CHAT_ID`.

## Paso 4 · Variables de entorno (Vercel → Settings → Environment Variables)

| Variable | Valor |
|---|---|
| `SOCRATA_APP_TOKEN` | Tu token de datos.gov.co (créalo gratis en tu cuenta de Socrata). |
| `TELEGRAM_BOT_TOKEN` | El del paso 3. |
| `TELEGRAM_CHAT_ID` | El del paso 3. |
| `CRON_SECRET` | Inventa una cadena larga aleatoria (protege el endpoint). |
| `ANTHROPIC_API_KEY` | Tu key de Anthropic (para el resumen IA; opcional pero recomendado). |

`KV_REST_API_URL` y `KV_REST_API_TOKEN` ya están desde el paso 2.

## Paso 5 · Probar sin esperar 3 horas

Despliega y abre en el navegador:
`https://TU-APP.vercel.app/api/cron?secret=<TU_CRON_SECRET>`

Debe responder un JSON como
`{"ok":true,"revisados":420,"fuertes":12,"nuevos":12,"enviados":12}`
y deben llegarte los mensajes a Telegram. (La primera corrida avisa todo lo que
encuentre ≥75; las siguientes solo lo nuevo.)

## Cómo ajustar

- **Umbral de alerta:** en `api/cron.js`, constante `UMBRAL` (hoy 75).
- **Frecuencia:** en `vercel.json`, `"schedule"`. `0 */3 * * *` = cada 3h.
  `0 */6 * * *` = cada 6h. `0 7 * * *` = una vez al día a las 7am UTC.
- **Ventana de días:** `DIAS_ATRAS` en `api/cron.js`.
- **Cuántas alertas por corrida:** el `.slice(0,15)` en `api/cron.js`.

## Notas honestas

- El cron lee el % de **anticipo** abriendo la URL del proceso. SECOP II es una
  SPA y a veces el % vive dentro de un PDF que la petición simple no alcanza;
  en esos casos el mensaje dice "no verificable (abrir pliego)". Tu lector de
  pliego en la web (PDF.js + OCR) sigue siendo el camino definitivo para esos.
- El resumen IA cuesta unos centavos por proceso (tokens de Claude). Con el
  `.slice(0,15)` y el botón bajo demanda, el gasto es mínimo.
- SECOP I (`j2gf-dg7m`) tiene campos más pobres que SECOP II; algunos procesos
  llegarán sin UNSPSC o sin plazo. El motor ya lo maneja (cae a semántica).
