# Análisis estratégico · qué aporta esta sesión a Detekta y qué sigue

> Para: dueño · Estado: informe fechado · Sustituido por: —

Fecha de corte: 19-oct-2026 (UTC). Árbol: `claude/stoic-lamport-slvr9d` en `34335a0`; `main` en `76c2bfa`
(incluye el arreglo de la suite, PR #238). Cifras medidas hoy con `node tests/estado.js`, `git`, y con
los ficheros de `research/`. Lo que es inferencia se marca.

## 1. Qué ha aportado esta sesión (medido)

- **Base de contratación estatal, en curso.** 531 fichas en `research/fichas/` con localizador, cita
  literal y vigencia; 290 verificadas por un agente distinto que reabrió la fuente. Cero hallazgos de
  forma en el chequeo. Listas cerradas de los ejes 1 a 9 en `research/LISTAS_CERRADAS.md`.
- **Hallazgos verificados que tocan decisiones de Detekta** (todos con su ficha):
  - Decreto 0997 de 2026: caución del 10 % de la utilidad operacional para impugnar un RUP ajeno; reporte
    al RUP de condenas civiles por contratos estatales. Nada del árbol lo conoce.
  - El método económico con cuatro franjas de 25 centavos de la TRM. La memoria del repo todavía dice
    «primer decimal» (`docs/MEMORIA.md`, destilado de dominio).
  - Clase 72141300 deshabilitada en el CSV oficial de CCE; `lib/unspsc.js` no distingue versiones.
  - El umbral del 20 % de precio artificialmente bajo vale solo en la comparación absoluta de la guía.
- **Suite.** PR #238 fusionado en `main`: la aserción de hora ya no depende del espacio que pone el ICU.
- **Lo que NO está hecho:** ninguna cifra de Detekta cambió. Nada se implementó en `lib/` ni `public/`.

## 2. Qué NO se ha hecho antes (y es el aporte nuevo)

La base respalda siete decisiones del producto que hoy dicen algo falso o incompleto:

1. **Método de precio** (`lib/apu/rentabilidad.js`, `lib/guia_proceso.js`): ya retiró la regla vieja, pero
   el destilado de `docs/MEMORIA.md` sigue diciendo «primer decimal». Corregir el texto, y comprobar que
   el modelo de probabilidad usa las franjas y no un sorteo.
2. **Versión del clasificador UNSPSC** (`lib/unspsc.js`): hoy no hay versión. Riesgo: cruce RUP ↔ proceso
   sobre códigos deshabilitados (72141300 en obra).
3. **Decreto 0997 de 2026** (RUP): caución de impugnación y reporte de condenas. Aún no es una regla del
   producto; es un cambio de marco que el análisis de capacidad debe conocer.
4. **Precio artificialmente bajo**: el umbral del 20 % es de la comparación absoluta, no general. Si la app
   avisa con ese umbral en todo caso, da una alarma falsa.
5. **Pliego sastre y experiencia**: la muestra piloto (4 procesos) no sostiene tasas; no usar para calibrar.
6. **Experiencia de plurales**: la regla «porcentaje del porcentaje» es una propuesta de un autor, no la
   regla de los manuales. Ya verificado en el piloto.
7. **Muestra SECOP a 100 procesos**: el sorteo estratificado está listo (`research/muestra/sorteo_n100.json`).
   Ningún proceso de licitación entró en el piloto; el estrato de licitación tiene 22 de 100.

## 3. Pendientes con cierre real (medidos)

| Pendiente | Estado medido | Quién decide |
|---|---|---|
| Fase 2 de la base: 8 ejes restantes con verificación al 100 % | 290 de 531 verificadas; ejes 2, 6, 8 y continuación sin verificar; la muestra de 100 sin leer (4 de 100 leídos) | Sesión, si hay cuota |
| Verificación de las 3 lotes del piloto con error > 5 % | Lotes eje4-inst (3/14 fallaron), eje4-acad (4/9), eje9-acad (1/9): sin revisión completa aún | Sesión |
| Ficha derogada: Circular SIC del Título VIII (CE-F-0038, 0039) | Marcada derogada; la vigente (Supersociedades, 2022) no se abrió | Sesión |
| Fecha del Diario Oficial del Decreto 0997 | No encontrada en fuente abierta | Sesión (buscar) o dueño |
| Versión UNv260801 del clasificador: ¿ya opera en SECOP II y RUP? | Sin verificar | Sesión (SECOP) |
| PROMPT-MAESTRO v3 y su Anexo A | No están en el repo ni en Drive | **Dueño** (D7) |
| Suite: aserción «sin secretos la auto-llamada no manda cabeceras» | Falla en este entorno porque la variable `VERCEL_AUTOMATION_BYPASS_SECRET` está puesta; no es un defecto del producto | Sesión + dueño (ver §5) |

Pendientes del producto (31 en `docs/MEMORIA.md`, impresos por `node tests/estado.js`): los que tocan
dinero son el correo (encenderlo es decisión del dueño), la lista de `Subasta de prueba`, la capacidad del
consorcio con contratos ganados no vistos y la regla de la TRM. Ninguno lo cambió esta sesión.

## 4. Propuestas, ordenadas por valor para Detekta

| # | Propuesta | Qué gana el contratista | Coste | Riesgo | Ya existe |
|---|---|---|---|---|---|
| P1 | **Corregir el destilado de dominio** («primer decimal» → cuatro franjas de 25 centavos, con su ficha) | No calcula con un método que no existe | 1 sesión, solo texto | Bajo | No: es texto |
| P2 | **Avisar del umbral del 20 % solo en la comparación absoluta** (lib/apu/rentabilidad o la alerta de baja) | Menos alarmas falsas de «precio bajo» | 1-2 sesiones; toca un aviso que decide precio → plan y visto bueno | Medio (falso positivo caro en APU) | Parcial: existe el aviso |
| P3 | **Versión del clasificador UNSPSC como dato** (`lib/unspsc.js`) y aviso de códigos deshabilitados en el cruce | Un RUP que cumple no pierde un proceso por código retirado | 2-3 sesiones; cambia el matching → plan y mutación | Alto (falso negativo en oportunidades) | No |
| P4 | **Caución de impugnación y reporte de condenas (Decreto 0997)** en la ficha de RUP | El contratista sabe qué riesgo nuevo entra al RUP | 1 sesión, solo aviso | Bajo | No |
| P5 | **Muestra SECOP de 100 para calibrar causas de rechazo** (sorteo listo) | Medir qué tumba ofertas en obra, no suponerlo | 4-6 sesiones de lectura | Bajo | Parcial (piloto de 4) |
| P6 | **Cerrar la verificación de la base** (ejes 2, 6, 8, continuación; lotes con error > 5 %) | Base fiable para decidir qué implementar | Consumo de cuota | Bajo | En curso |

Recomendación: **P1 primero** (texto, verificado, sin riesgo), luego **P4** (aviso), y después **P2 con plan**.
P3 requiere el plan aparte que pide el dueño para lo que mueve un filtro.

## 5. Qué decide el dueño

1. D7: subir o pegar el PROMPT-MAESTRO v3 y su Anexo A. Sin ellos no hay corrección de sus dos errores.
2. Si se aprueban P1 y P4 como cambios de texto y aviso (sin tocar cifras ni filtros).
3. Si la auto-llamada de la suite debe seguir falsa cuando el entorno trae el secreto: propongo que el
   test lo quite del entorno al correr (`env -u`), no que se cambie la aserción. Requiere su visto bueno
   porque toca una prueba de seguridad.

## 6. Qué no se ha medido

- Ningún ahorro de Detekta (sin registro de uso).
- El costo en pesos de los agentes (solo tokens).
- La cuota: la cuenta llegó al límite semanal el 2-oct y se reinicia el 4-oct a la 1 UTC; la sonda de
  cuota de hoy falló por límite de la API.
