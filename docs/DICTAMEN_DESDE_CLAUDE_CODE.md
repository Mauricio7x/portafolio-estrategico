# Dictamen del pliego con la suscripción de Claude Code (sin clave de API) · 3-sep-2026

El dueño paga el plan Max de Claude y no va a pagar además una clave de API para el servidor. La API que
llama el servidor (`api.anthropic.com`) se cobra aparte y no la cubre ninguna suscripción de claude.ai:
eso no cambia. Lo que sí cambia es DÓNDE se escribe el dictamen: en una sesión de Claude Code, que la
suscripción sí cubre, con las mismas instrucciones y el mismo contrato que el servidor, y con la MISMA
verificación en el servidor. Tres motores, un contrato (`lib/handlers/pliego/dictamen.js`):

| Motor | Quién escribe | Cuándo | Qué exige |
|---|---|---|---|
| `reglas` | `lib/dictamen_reglas.js` (expresiones regulares por línea, con página) | Siempre; es el defecto cuando no hay clave | Nada: ni red, ni clave, ni cuota |
| `sesion` | Una sesión de Claude Code con la skill `/dictamen <id> [perfil]` | Cuando el dueño lo pide desde Claude Code | La suscripción del dueño; el expediente lo da `GET …&expediente=1` |
| `modelo` | La API de Anthropic desde el servidor | Solo si algún día hay `ANTHROPIC_API_KEY` | Clave con saldo propio, cuota diaria, candado |

Los tres pasan por `verificarDictamen` (citas buscadas en su página, censo de cifras, acusaciones y
lenguaje, rebaja del veredicto) y se guardan con la misma forma bajo claves distintas (el «modelo» de la
clave de caché es `reglas-<versión>`, `sesion` o el nombre del modelo). La pantalla dice de cuál viene
(`origen_legible`).

## Cómo pedir un dictamen desde Claude Code (rutas exactas)

1. Cargar el pliego una vez: en `https://portafolio-estrategico.vercel.app`, pestaña **Licitaciones**,
   botón **Calcular mi precio** de la tarjeta → pestaña **Precios** → sección del lector → subir el PDF
   del pliego. (O desde **Mis procesos**: abrir la guía del proceso guardado → «Cargar el pliego (PDF) de
   este proceso».) Al terminar, el texto queda guardado bajo el id del proceso.
2. Abrir Claude Code sobre este repositorio (`https://claude.ai/code`, repositorio
   `Mauricio7x/portafolio-estrategico`, rama `main`) y escribir: `/dictamen CO1.REQ.123456 helder`
   (el id está en la tarjeta; el perfil es `helder`, `genesis`, `juntos` o el id de un consorcio).
3. La sesión pide el expediente, lee el pliego completo, escribe el dictamen y lo envía. Al terminar
   dice el veredicto y cuántas citas se verificaron.
4. Verlo: **Mis procesos** → el proceso guardado → «Qué necesita para presentarse» → «Dictamen del
   pliego». Mientras no exista el de la sesión, ahí se ve la lectura por reglas.

## Lo que la lectura por reglas hace y no hace

Encuentra en el texto guardado, con la página de cada línea: los requisitos numéricos que la aplicación
ya compara con el perfil (capital de trabajo, patrimonio, liquidez, endeudamiento, cobertura, experiencia
en salarios mínimos, plazo), y por palabras habituales: personal exigido, equipos o laboratorio,
certificaciones, garantías, multas, forma de pago, anticipo (y su negación), obligaciones sin valor,
proveedores impuestos, marcas sin «o equivalente», licencias y permisos, visita obligatoria y causales
de rechazo. Lo que no encuentra lo lista como «no encontrado en el pliego», que es un resultado, no una
ausencia: el pliego puede decirlo con otras palabras. Nunca baja el veredicto a «no conviene presentarse»
sin un requisito numérico incumplido y citado.
