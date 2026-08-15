# Inventario de fuentes de datos y auditorías de la Fase 0

Documento vivo. Cada fila responde «¿de dónde sale esto y en qué estado de verificación está?».
Regla del proyecto: **un 403/404 anotado aquí es una observación CON FECHA, no una propiedad del
entorno** — antes de dar una fuente por perdida, volver a llamarla.

## 1. Auditoría de la Fase 0 (2026-08-15): las dos «roturas» del encargo, medidas

### 1.1 «Se filtra por `fase` con expresiones regulares en vez de `estado_del_procedimiento`» — FALSO

El encargo daba por hecho que el filtrado de estado usaba regex sobre `fase`. La auditoría del
código real (`lib/filtros.js:142` y `:159`) muestra que desde hace tiempo:

- Se lee **`estado_del_procedimiento` PRIMERO** y `fase` solo como respaldo, exactamente el orden
  de candidatas que pide la capa defensiva (§5.4 del encargo).
- La comparación es contra **listas canónicas normalizadas** (`ESTADOS_ABIERTOS`,
  `ESTADOS_CERRADOS`), no regex libres, con la regla «estado desconocido = CERRADO» y el
  matiz documentado de que «seleccionado» no puede entrar por prefijo con la fase «Selección».
- El reloj (`cierre_vencido`) cierra además todo proceso con `fecha_cierre` vencida, diga lo que
  diga el estado declarado.

**Medición antes/después: idéntica por construcción — no se cambió ningún filtro.** No hay
diferencia que documentar porque el estado auditado ya era el estado pedido. Cambiarlo «para
cumplir el encargo» habría sido tocar un filtro sin necesidad, que es exactamente lo que la regla
«mide antes y después» existe para impedir.

### 1.2 «Fuentes de perfiles y UNSPSC duplicadas en varios archivos» — FALSO

- `lib/perfiles.js` es la única fuente de los perfiles (`PERFILES_FALLBACK` como respaldo del
  repositorio; lo que el dueño carga por la API manda sobre esos valores).
- Las whitelists UNSPSC viven UNA vez en `lib/unspsc.js` y `lib/perfiles.js` las **importa**
  (`lib/perfiles.js:58`). No hay segunda copia en el repositorio.
- La separación en dos archivos es deliberada y no debe «unificarse»: `lib/unspsc.js` es hoja del
  grafo de requires; hacer que importara perfiles cerraría el ciclo `perfiles → unspsc → perfiles`
  (decisión documentada en CLAUDE.md, sección «Dashboard y RUP por archivo»).

### 1.3 Conteo de funciones serverless

Antes: 12 archivos bajo `api/` (el techo del plan Hobby). Después: **6 routers** (`procesos`,
`inteligencia`, `perfil`, `admin`, `apu`, `pliego`), con la lógica intacta en `lib/handlers/` y
**todas** las rutas viejas respondiendo igual vía `rewrites` de `vercel.json`. La suite fija el
conteo exacto (`=== 6`) y las mismas peticiones de siempre (URLs viejas incluidas) pasan 4/4.

## 2. Inventario de fuentes

| Fuente | Identificador | Para qué | Estado verificado |
|---|---|---|---|
| SECOP II — Procesos | `p6dx-8zbt` (datos.gov.co) | Licitaciones activas + histórico adjudicado | **En uso.** Columnas de adjudicación/oferentes verificadas contra datos reales (2026-08); evidencia en `docs/APU_FUENTES.md`. 59 campos; keyset por `:id`. |
| SECOP II — PAA | `9sue-ezhx` | Planeación anticipada (12 meses) | **En uso.** Columnas verificadas contra la fuente real 2026-08-12 (`nombre_entidad`, `categorias_unspsc`, `valor_total_esperado`, mes en texto + `annio`). Tasa de acierto medida: 88 % (cota inferior, vigencia 2025). |
| SECOP II — Contratos Electrónicos | `jbjy-vk9h` | Valor realmente pagado tras adiciones (≠ baja de adjudicación) | **Por integrar (Fase 3).** No mezclar con `p6dx-8zbt`: una predice cómo se gana, la otra cómo se ejecuta. |
| Proponentes por Proceso | `hgi6-6wh3` | Nº real de oferentes y contra quién se compite | **Por verificar antes de comprometer arquitectura (Fase 3).** Esquema y frescura SIN verificar a fecha 2026-08-15. Si no sirve: «Sin referencia», nunca cero. |
| Proveedores Registrados | `qmzu-gj57` | Sugerencia de socios de consorcio | Futuro. |
| GDELT DOC 2.0 + Google News RSS | API directa | Riesgo de orden público por municipio | Parcial: la app etiqueta ZONA por departamento (`lib/accesibilidad.js`, bandas declaradas «estimado»). El «motor por municipio» que el encargo da por hecho NO existe como tal. |
| INVIAS APU Regionalizados | API ArcGIS `hermes2.invias.gov.co` | Referencia oficial de insumos | **En uso** (`data/apu_invias.json`, vigencia 2025-1; la 2025-2 está corrupta EN ORIGEN — medido, no re-descubrir). Licencia: uso comercial exige autorización. |
| Retail (Homecenter, Easy, fabricantes) | Capturador manual | Techo negociable por insumo | **En uso** (`data/apu_retail.json`), 100 % trazable; 8 departamentos sin cobertura, declarados. |
| DANE ICOCIV / ICCV | — | Reajuste de precios | En validación; el entorno recibe 403 en varias fuentes oficiales — no citar sin abrir la fuente. |
| Relatoría CCE | relatoria.colombiacompra.gov.co | Conceptos citables | Futuro. 403 desde este entorno (observación con fecha ago 2026). |

## 3. Reglas de acceso que no hay que re-aprender

- Todo acceso a columnas de Socrata pasa por listas de **candidatas en orden de preferencia**
  (`lib/indice_competencia.js`, `lib/paa.js` con censo + sonda). Nunca leer un campo a pelo.
- Un **400 de Socrata jamás se reintenta**; 429/5xx con backoff + jitter honrando `Retry-After`.
- `conteo_de_respuestas_a_ofertas` puede valer 0 en la misma fila donde
  `respuestas_al_procedimiento` vale 3 — el ORDEN de las candidatas decide.
- `nit_del_proveedor_adjudicado` puede llegar como la cadena `"No Definido"`, que no es un NIT ni
  un `null`.
- Token de Socrata (App Token): va en variables de entorno de Vercel, jamás en el código. Si un
  token se compartió por un canal inseguro, se considera comprometido y se regenera.

## 4. Pre-auditoría de la Fase 1 (2026-08-15): «el divisor de horas del catálogo» — NO EXISTE

El plan de la Fase 1 (motor de costo real) manda **auditar el divisor de horas del catálogo antes
de tocarlo**, porque la Ley 2101/2021 baja la jornada máxima a **42 h semanales desde el
15-jul-2026** (≈ 210 h/mes, 8,4 h/día en semana de 5 días). Medido contra `data/apu_catalogo.json`
y `lib/apu/*.js`:

- **No hay ningún divisor de horas ni ninguna jornada en el repositorio.** La mano de obra se
  cotiza **por DÍA** (15 insumos `mano_obra` en `dia`, 3 en `glb`; 174/174 ítems llevan una
  línea de mano de obra) y el motor calcula `cantidad ÷ rendimiento` en **días por unidad de
  obra** (`lib/apu/catalogo.js:236`). El equipo va 40 por día, **5 por hora**, y el resto por
  unidad/global. Ni `calculo.js` ni `catalogo.js` dividen por 8, por 7,33 ni por 210: la
  advertencia de `CLAUDE.md` («no existe ninguna jornada en el repositorio; elegir 7,33 h u 8 h
  mueve la mano de obra ~9 %») sigue siendo cierta. **Corregir un divisor que no existe sería la
  tercera premisa falsa del prompt maestro** (tras «regex sobre `fase`» y «perfiles duplicados»).
- **Lo que SÍ toca la Ley 2101 es el CONTENIDO del día**: los jornales y las nueve cuadrillas
  calibradas con el Nogal (Bogotá, 2025, régimen de 44 h) pagan un día que desde el 15-jul-2026
  rinde 8,4 h en vez de 8,8 h. Si el jornal diario no cambia, **el costo por hora efectiva sube
  ≈ 4,8 %** (44/42 − 1) y, a rendimiento por día constante, el catálogo **subestima la mano de
  obra en esa proporción**. Es un factor de PARÁMETRO (aplicable sobre las 18 líneas de MO y sobre
  las 40 de equipo cotizadas por día si el equipo se paga por jornada), no una división.
- **La cerradura que impide colar una jornada por la puerta de atrás**: cinco equipos se tarifan
  por hora y 40 por día en el mismo catálogo; cualquier «costo horario» exigiría inventar la
  jornada que los une, y la prueba del módulo ya prohíbe publicarlo. Un parámetro editable
  (`apu:parametros`, como pide la F1) tiene que declarar **horas/día y horas/semana con su fecha
  de vigencia legal**, y el motor debe seguir SIN dividir: solo aplicar el factor declarado y
  publicarlo en `ajuste_regional`/`normativa` para que la cifra viaje con su origen.
- Prestacional: 1,55 en las cinco regiones (supuesto declarado, no dato — ver «normativa» en
  `CLAUDE.md`); la Ley 2101 no lo mueve.

Consecuencia para la sesión de F1: **empezar por el parámetro de jornada (vigencia + factor), no
por buscar el divisor.** Hecho en la Fase 1 (2026-08-15): `lib/parametros.js` + `lib/costos.js` +
`apu:parametros`; el despeje con cifras, las fórmulas, el impacto medido y el estado de verificación
de cada parámetro están en **`docs/metodologia.md`**.
