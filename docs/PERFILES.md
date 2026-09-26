# El perfil del dueño y sus socias — resumen técnico

> Para: ingeniero · Estado: referencia · Sustituido por: —

**Un solo perfil es PROPIO: Helder.** Génesis, PRODIAC y PICS (esta, desde el 25-sep-2026) son **candidatas a consorcio** —un recurso
para presentarse a más procesos, no identidades desde las que mirar el mercado— y por eso no se
ofrecen en la barra ni en el tablero. Quién es quién lo dicen `ID_DUENO` y `CANDIDATOS_CONSORCIO` en
`lib/perfiles.js`, no el orden de este documento. El porqué está en `docs/MEMORIA.md` § «La barra
ofrece un solo perfil, y las socias las sirve el servidor».

Fuente de código: `lib/perfiles.js` (datos) · `lib/unspsc.js` (whitelists) ·
`lib/capacidad.js` (fórmula K). Origen de los datos: los **certificados de RUP leídos enteros el
11-sep-2026** (47 · 259 · 2.423 páginas, sin saltos) y **releídos el 25-sep-2026 junto con el de PICS**
(96 páginas), corte **31/12/2025**. Desde el 25-sep-2026 cada perfil lleva además los **componentes de
su balance**, al centavo y con su página, porque el Documento Tipo calcula los indicadores de un
consorcio sumándolos (apartado 5). **Nada de lo que sigue es un placeholder**; donde falta un dato se
dice explícitamente. Las cifras detalladas y sus fuentes: `docs/PROPONENTE_PLURAL.md`, apartado 5.

> **Desde ago 2026 estas cifras son el RESPALDO (`PERFILES_FALLBACK` en `lib/perfiles.js`), no la última
> palabra**: el RUP cargado por `POST /api/admin/rup` (pestaña Mi empresa, con la llave de la aplicación)
> manda, y `PERFILES` sigue siendo el objeto síncrono de siempre para quien lo requiere. Lo que sigue es lo
> que hay cuando no se ha subido ningún RUP.

## 1 · Helder Gustavo Rodríguez Santana — *el único perfil propio*

| Campo | Valor | Nota |
| --- | --- | --- |
| Naturaleza | Persona natural | Ing. Civil · Purificación (Tolima) |
| NIT | **9396710-3** | Leído del certificado (11-sep-2026) |
| Tamaño de empresa | **Microempresa** | Dato PUBLICADO del certificado; decide la convocatoria limitada |
| Clases UNSPSC | 193 | `UNSPSC_HELDER` |
| Índice de liquidez | 129,12 | CF = 40 |
| Endeudamiento | 0,04 | |
| Patrimonio | $1.107.252.964 | |
| Utilidad operacional | $198.810.000 | CO estimado = ×16,7 ≈ $3.320 M |
| Balance (págs. 44-45) | activo corriente 748.908.684,18 · pasivo corriente 5.800.000 · activo total 1.165.295.964,18 · pasivo total 58.043.000 · intereses 300.000 | Corte 2025 «en proceso de adquirir firmeza» en el certificado del 07/05/2026; EN FIRME en la copia del 27/05/2026 |
| Mayor contrato (SMMLV) | 6.768,87 | Consorcio Infraestructura Boyacá, **al 40 %**: acredita 2.707,55 |
| Segmento 72 × porcentaje | 19.330,60 SMMLV | 31 de 33 contratos; es lo que mide el factor E de la K |
| Profesionales (CT) | 1 | Persona natural: él mismo (el histórico lo corrigió de 11 a 1) → CT = 20 |
| Contratos en ejecución (SCE) | 2 | Solo el de obra compromete capacidad: $443,1 M × 60 % × 8/12 ≈ $177,3 M |
| Tope estratégico | **sin tope** | Decisión del dueño (26-sep-2026): «lo que diga la ley». Era 4.000 SMMLV, un apetito que escondía procesos que la capacidad de contratación sí alcanza; el que traiga el archivo cargado también se ignora |

## 2 · Génesis Ingeniería y Construcción GIC SAS — *candidata a consorcio*

| Campo | Valor | Nota |
| --- | --- | --- |
| Naturaleza | **Persona jurídica (SAS)** | Ibagué. El error histórico de tratarla como persona natural está corregido en toda la app |
| NIT | **901096271-1** | Leído del certificado (11-sep-2026) |
| Tamaño de empresa | **Microempresa** | Por eso cabe en una convocatoria limitada a Mipyme |
| Clases UNSPSC | **335** | `UNSPSC_GENESIS` — eran 343 hasta el 11-sep-2026: ocho solo aparecían dentro de contratos de experiencia, y lo que una empresa CONSTRUYÓ no es lo que su registro dice que OFRECE |
| Índice de liquidez | 6,98 | CF = 40 |
| Endeudamiento | 0,13 | |
| Patrimonio | $211.340.888 | |
| Utilidad operacional | $150.244.977 | CO estimado = ×16,7 ≈ $2.509 M |
| Balance (págs. 11-12) | activo corriente 225.344.006 · pasivo corriente 32.253.118 · activo total 243.594.006 · pasivo total 32.253.118 · intereses 890.000 | En firme |
| Mayor contrato (SMMLV) | 31.593,88 | Al 75 % y de un socio. **100 de sus 108 contratos son de socios** |
| Segmento 72 × porcentaje | 134.465,17 SMMLV | Tal como están inscritos (incluye el probable duplicado N.º 5/N.º 90 y el «0.5%» del N.º 82, que la socia no pudo confirmar el 25-sep-2026) |
| Profesionales (CT) | 3 | «Estimado conservador» del histórico → CT = 20. **Si la planta real es ≥6, CT sube a 30** — confirmar con el dueño |
| Contratos en ejecución (SCE) | 0 registrados | Se asume SCE = 0 **con advertencia en logs** (capacidad posiblemente optimista) |
| Tope estratégico | **sin tope** | Igual que Helder (26-sep-2026); era 2.000 |

## 3 · PRODIAC LTDA — *candidata a consorcio*

Entró el 11-sep-2026 con su certificado leído entero (2.423 páginas).

| Campo | Valor | Nota |
| --- | --- | --- |
| Naturaleza | Persona jurídica (Ltda.) | Ibagué |
| NIT | **900263450-4** | Leído del certificado |
| Tamaño de empresa | **GRAN EMPRESA** | **Deja al consorcio fuera de una convocatoria limitada a Mipyme**: es el diferenciador más duro entre las dos socias, y no sale de ninguna cifra |
| Clases UNSPSC | **581** | `UNSPSC_PRODIAC` |
| Índice de liquidez | 1,98 | |
| Endeudamiento | 0,39 | |
| Cobertura de intereses | 9,11 | |
| Patrimonio | $8.309.706.000 | |
| Capital de trabajo | $4.918.588.000 | |
| Utilidad operacional | $2.129.512.000 | |
| Contratos acreditados | 327 | |
| Mayor contrato | 18.264,85 SMMLV | |
| Balance (págs. 17-18) | activo corriente 9.908.649.000 · pasivo corriente 4.990.061.000 · activo total 13.705.196.000 · pasivo total 5.395.490.000 · intereses 233.466.000 | En firme. Sus componentes dan cobertura 9,12; vale la **publicada**, 9,11 |
| Segmento 72 × porcentaje | 182.865,60 SMMLV | Los 327 contratos |
| Tope estratégico | **sin declarar** | El apetito de una socia no nos consta: un tope inventado recortaría la lista por una cifra que nadie declaró |

## 3-bis · PICS Ingeniería SAS — *candidata a consorcio (desde el 25-sep-2026)*

Proyectos de Ingeniería Consultoría y Servicios SAS. Certificado de la Cámara de Comercio de Sogamoso,
expedición 23/06/2026, 96 páginas leídas enteras, un solo corte (31/12/2025) **en firme**. El dueño
decidió el 25-sep-2026 que entra como socia posible.

| Campo | Valor | Nota |
| --- | --- | --- |
| Naturaleza | Persona jurídica (SAS) | Sogamoso (Boyacá) |
| NIT | **900479928-0** | Leído del certificado |
| Tamaño de empresa | **Microempresa** | Como Génesis: un consorcio con ella cabe en una convocatoria limitada a Mipyme |
| Clases UNSPSC | **335** | `UNSPSC_PICS` — 51 clases y 13 familias que ninguno de los otros tres inscribe |
| Índice de liquidez | 1,82 | |
| Endeudamiento | 0,39 | |
| Cobertura de intereses | 24,38 | |
| Patrimonio | $129.819.065 | El certificado dice 129.819.065,48 |
| Capital de trabajo | $69.427.015 | |
| Utilidad operacional | $70.088.705 | |
| Balance (págs. 10-11) | activo corriente 153.318.668,69 · pasivo corriente 83.891.653,21 · activo total 213.710.718,69 · pasivo total 83.891.653,21 · intereses 2.874.749,53 | En firme |
| Contratos acreditados | 79 | |
| Mayor contrato | 1.146,99 SMMLV | Es un **subcontrato**: pide la certificación del contratista principal |
| Segmento 72 × porcentaje | 9.598,56 SMMLV | 77 de 79 |
| Profesionales (CT) | 1 | El RUP no reporta la planta: el suelo que no infla |
| Tope estratégico | **sin declarar** | Igual que PRODIAC |

## 4 · El plural, DERIVADO (ya no hay consorcio fijo)

> **SUPERADO el 11-sep-2026** — el perfil `juntos` con participación fija **50/50** dejó de ser la
> referencia: el reparto lo decide **cada proceso** (`lib/socio_por_proceso`), y el plural se deriva
> cuando se necesita con **un solo combinador** (`lib/perfiles.derivarPlural`). El id `juntos` sigue
> RESPONDIENDO —un enlace guardado es inerte, jamás un error— pero ya no se ofrece en ningún
> selector. Las cifras de abajo son las de ese 50/50 histórico y se conservan solo como referencia
> de cómo se pondera.

> **SUPERADO el 25-sep-2026** — la tabla que había aquí ponderaba los ÍNDICES por participación
> (liquidez 68,05 = 0,5×129,12 + 0,5×6,98). Ninguna norma trae ese cálculo: los Documentos Tipo
> SUMAN los componentes del balance (`docs/PROPONENTE_PLURAL.md`, apartado 2). La tabla de abajo es
> la misma pareja con la fórmula vigente.

| Campo (Helder + Génesis) | Valor | Cómo se obtiene |
| --- | --- | --- |
| Clases UNSPSC | 393 | Unión **calculada** de ambos RUP (nunca una tercera lista a mano) |
| Índice de liquidez | 25,60 | (748.908.684,18 + 225.344.006) ÷ (5.800.000 + 32.253.118), truncado — **con cualquier reparto** |
| Endeudamiento | 0,06 | Σ pasivo total ÷ Σ activo total |
| Cobertura de intereses | 293,32 | Σ utilidad operacional ÷ Σ intereses |
| Capital de trabajo | $936.199.572 | Suma (CT = Σ CT_i) |
| Patrimonio | $1.318.593.852 | Suma |
| Mayor contrato (SMMLV) | 31.593,88 | Máximo de los integrantes (`mayorContratoSMMLV`) |
| Profesionales (CT) | 4 | Suma (1 + 3) → CT = 20 |
| Tope estratégico | **sin tope** | Decisión del dueño (26-sep-2026): «lo que la ley nos diga y como las entidades califiquen». El tope es un apetito, no una norma; en consorcio lo que cuenta es la capacidad de contratación y los habilitantes. El 11.000 fijo se retiró el 25-sep-2026 y la suma de apetitos (6.000) el 26-sep-2026 |

**Tres reglas distintas, a propósito** (y verificadas en `tests/e2e.js`):

- Los **indicadores habilitantes** del plural se calculan con la fórmula del **Documento Tipo**:
  Σ numerador ÷ Σ denominador de los integrantes, **sin participación**. `derivarPlural` admite
  además, pedidos por su nombre, la ponderación de componentes (Manual CCE-EICP-MA-04 v03, num. 5.4,
  opción 4) y el promedio de índices, solo para cuando un pliego los fije.
- Sin el balance de un integrante (un RUP subido sin él), las razones del plural quedan **sin dato**
  y se dice de quién falta: promediar los índices en su lugar daría una cifra creíble y equivocada.
- La **capacidad residual (K)** del plural es la **SUMA de las CRP de los integrantes** sin tener en
  cuenta la participación (Guía CCE-EICP-GI-22, num. 11); **la negativa de un integrante se resta**.
  Lo único que la participación mueve es el factor E de cada uno (su experiencia contra el
  presupuesto × su parte).

## El reparto de un consorcio (`lib/reparto.js`, desde el 25-sep-2026)

La app recomienda, por proceso y por socia, la MAYOR parte para el dueño que sostiene lo que se puede
medir: la capacidad de contratación (que depende del reparto: la experiencia de cada uno se mide contra
el presupuesto × su parte) y la regla de experiencia del pliego tipo (uno aporta ≥ 50 % de la
experiencia exigida, el otro ≥ 5 %; quien no aporte no pasa del 10 % de participación). Para esa regla
cada perfil lleva sus siete mayores contratos del segmento 72 × porcentaje, que son una cota superior:
solo sirven para decir lo imposible. Lo que no se puede medir sin el pliego —un porcentaje mínimo de
participación, los códigos exactos de la experiencia— viaja siempre como aviso. En pantalla: «¿Y con un
socio?» de Mis procesos, dejando vacía la parte del socio.

## Fórmula K (única para toda la app — `lib/capacidad.js`)

```
CRP  = CO × (E + CT + CF) / 100 − SCE          (Guía CCE-EICP-GI-22)
CRPC = Presupuesto − Anticipo                  (D. 1082/2015, art. 2.2.1.1.1.6.4)
       × 12 / plazo, solo si el plazo > 12 meses
Viable ⇔ CRPC ≤ CRP          (sin tope estratégico desde el 26-sep-2026: lo que diga la ley)
```

Escalas de la Guía CCE-EICP-GI-22 v01 (Tablas 3 a 6), vigentes en el código desde el 25-sep-2026 (antes
E daba 120 a una razón de 3 y CF daba 0 a una liquidez de 0,9):

| Factor | Escala |
| --- | --- |
| CO | Mayor ingreso operacional de 5 años (estimado ×16,7 de la utilidad); **piso USD 125.000** = $511.708.497 (umbral Mipyme 2026) |
| E (segmento 72 × % SMMLV ÷ (presupuesto SMMLV × participación)) | >10 → 120 · >6 → 100 · >3 → 80 · >0 → 60 |
| CT (socios + profesionales) | ≥11 → 40 · 6-10 → 30 · 1-5 → 20 · 0 → 0 |
| CF (índice de liquidez, truncado) | ≥1,51 o indeterminada → 40 · 1,01-1,50 → 35 · 0,76-1,00 → 30 · 0,51-0,75 → 25 · 0-0,50 → 20 |
| SCE | Σ saldo × %participación × min(meses restantes, 12) / plazo (solo contratos de obra) |

Comprobado con el ejemplo oficial de la Guía (Consorcio AB, num. 12): 17.340.000.000 exactos.

`SMMLV 2026 = $1.750.905`.

## Estimaciones y limitaciones (honestas, visibles)

1. **CO estimado**: el RUP no reporta el ingreso operacional → `CO = utilidad × 16,7`
   (margen típico de obra ≈ 6 %). Advertido una vez en logs; la UI marca
   «Capacidad K ✓ (CO estimado)». Si algún día se conoce el ingreso real, basta
   llenar `ingresoOp` en `lib/perfiles.js`.
2. **SCE de Génesis = 0** por falta de datos (advertido en logs). Mantener la lista
   `sce` al día es responsabilidad del dueño: un contrato grande en ejecución
   cambia el K de verdad.
3. **NIT**: los cuatro constan, leídos del certificado (PICS desde el 25-sep-2026). Uno que no conste va en `null` y **no se inventa**.
4. **CT de Génesis = 3**: estimado conservador heredado. Confirmar la planta real.
5. **Unión de clases**: Helder ∪ Génesis ∪ PRODIAC ∪ PICS = **769** (`UNSPSC_TODOS`), y de ahí sale
   `FAMILIAS_UNION`, que es **la puerta de la ingesta**: 204 familias (191 antes de PICS, 105 antes
   de PRODIAC). Hace falta una sincronización completa en producción para que el ensanche alcance a lo
   ya guardado.
6. **`tamanoEmpresa`**: dato PUBLICADO del certificado. Jamás se deduce del patrimonio ni de los
   contratos — el umbral legal es de ingresos, y un tamaño inventado deja una oferta fuera o la mete
   donde no cabe.
5. **El puntaje y el K orientan dónde mirar primero**: no reemplazan leer el pliego
   ni son probabilidad de ganar.
