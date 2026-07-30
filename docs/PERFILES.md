# Perfiles del negocio — resumen técnico

Fuente de código: `lib/perfiles.js` (datos) · `lib/unspsc.js` (whitelists) ·
`lib/capacidad.js` (fórmula K). Origen de los datos: RUP con corte **31/12/2025**
(certificados en firmeza al 07/05/2026), extraídos del `index.html` histórico del
repositorio. **Nada de lo que sigue es un placeholder**; donde falta un dato se dice
explícitamente.

## 1 · Helder Gustavo Rodríguez Santana

| Campo | Valor | Nota |
| --- | --- | --- |
| Naturaleza | Persona natural | Ing. Civil · Purificación (Tolima) |
| NIT | — | No consta en el repositorio; completar del certificado RUP |
| Clases UNSPSC | 193 | `UNSPSC_HELDER` |
| Índice de liquidez | 129,12 | CF = 40 |
| Endeudamiento | 0,04 | |
| Patrimonio | $1.107.252.964 | |
| Utilidad operacional | $198.810.000 | CO estimado = ×16,7 ≈ $3.320 M |
| Mayor contrato (SMMLV) | 6.768,87 | Consorcio Infraestructura Boyacá |
| Profesionales (CT) | 1 | Persona natural: él mismo (el histórico lo corrigió de 11 a 1) → CT = 20 |
| Contratos en ejecución (SCE) | 2 | Solo el de obra compromete capacidad: $443,1 M × 60 % × 8/12 ≈ $177,3 M |
| Tope estratégico | 4.000 SMMLV ≈ $7.004 M | Apetito de riesgo, no límite del RUP |

## 2 · Génesis Ingeniería y Construcción GIC SAS

| Campo | Valor | Nota |
| --- | --- | --- |
| Naturaleza | **Persona jurídica (SAS)** | Ibagué. El error histórico de tratarla como persona natural está corregido en toda la app |
| NIT | — | No consta en el repositorio; completar del certificado RUP |
| Clases UNSPSC | 343 | `UNSPSC_GENESIS` |
| Índice de liquidez | 6,98 | CF = 40 |
| Endeudamiento | 0,13 | |
| Patrimonio | $211.340.888 | |
| Utilidad operacional | $150.244.977 | CO estimado = ×16,7 ≈ $2.509 M |
| Mayor contrato (SMMLV) | 31.593,88 | |
| Profesionales (CT) | 3 | «Estimado conservador» del histórico → CT = 20. **Si la planta real es ≥6, CT sube a 30** — confirmar con el dueño |
| Contratos en ejecución (SCE) | 0 registrados | Se asume SCE = 0 **con advertencia en logs** (capacidad posiblemente optimista) |
| Tope estratégico | 2.000 SMMLV ≈ $3.502 M | |

## 3 · Consorcio / Unión Temporal (perfil `juntos`, alias `consorcio`)

Participación **asumida 50/50** (el repositorio no fija otra) y documentada.

| Campo | Valor | Cómo se obtiene |
| --- | --- | --- |
| Clases UNSPSC | 393 | Unión **calculada** de ambos RUP (nunca una tercera lista a mano) |
| Índice de liquidez | 68,05 | Ponderado: 0,5×129,12 + 0,5×6,98 |
| Patrimonio | $659.296.926 | Ponderado 50/50 |
| Utilidad operacional | $174.527.489 | Ponderada 50/50 |
| Mayor contrato (SMMLV) | 38.362,75 | Suma de integrantes |
| Profesionales (CT) | 4 | Suma (1 + 3) → CT = 20 |
| Tope estratégico | 11.000 SMMLV ≈ $19.260 M | |

**Dos reglas distintas, a propósito** (y verificadas en `tests/e2e.js`):

- Los **indicadores habilitantes** del plural se **ponderan por participación**
  (práctica del D. 1082/2015; exigencia del encargo).
- La **capacidad residual (K)** del plural es la **SUMA de las CRP de los
  integrantes** (Guía CCE-EICP-GI-22), cada una calculada con los indicadores y el
  SCE propios de cada integrante. No se calcula una CRP «del promedio».

## Fórmula K (única para toda la app — `lib/capacidad.js`)

```
CRP  = CO × (E + CT + CF) / 100 − SCE          (Guía CCE-EICP-GI-22)
CRPC = Presupuesto − Anticipo                  (D. 1082/2015, art. 2.2.1.1.1.6.4)
       × 12 / plazo, solo si el plazo > 12 meses
Viable ⇔ CRPC ≤ CRP  y  Presupuesto ≤ tope estratégico
```

| Factor | Escala (todas las comparaciones con `>=`) |
| --- | --- |
| E (mayor contrato SMMLV / presupuesto SMMLV) | ≥3 → 120 · ≥2 → 100 · ≥1 → 80 · resto → 60 |
| CT (socios + profesionales de nómina) | ≥11 → 40 · ≥6 → 30 · ≥1 → 20 |
| CF (índice de liquidez) | ≥1.5 → 40 · ≥1.2 → 30 · ≥1.0 → 20 |
| SCE | Σ saldo × %participación × min(meses restantes, 12) / plazo (solo contratos de obra) |

`SMMLV 2026 = $1.750.905`.

## Estimaciones y limitaciones (honestas, visibles)

1. **CO estimado**: el RUP no reporta el ingreso operacional → `CO = utilidad × 16,7`
   (margen típico de obra ≈ 6 %). Advertido una vez en logs; la UI marca
   «Capacidad K ✓ (CO estimado)». Si algún día se conoce el ingreso real, basta
   llenar `ingresoOp` en `lib/perfiles.js`.
2. **SCE de Génesis = 0** por falta de datos (advertido en logs). Mantener la lista
   `sce` al día es responsabilidad del dueño: un contrato grande en ejecución
   cambia el K de verdad.
3. **NIT en null**: no consta en el repositorio y no se inventa.
4. **CT de Génesis = 3**: estimado conservador heredado. Confirmar la planta real.
5. **El puntaje y el K orientan dónde mirar primero**: no reemplazan leer el pliego
   ni son probabilidad de ganar.
