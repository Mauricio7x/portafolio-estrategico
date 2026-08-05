# Experiencia ejecutada de Génesis — PENDIENTE DE APORTAR

**Estado: los 106 contratos NO están en el repositorio.** No es que falte
generar el archivo: faltan **los datos**, y no se pueden reconstruir de memoria
ni inventar. Es la misma regla que ya rige el NIT en `lib/perfiles.js` («no
consta en el repositorio; jamás inventarlo») y por la misma razón — esta lista
alimenta la auditoría que decide **con qué códigos UNSPSC se renueva el RUP**,
y un contrato inventado ahí es un código inscrito de más durante un año entero.

## Qué se buscó, y dónde (para no repetir la búsqueda)

| Dónde | Cómo | Resultado |
|---|---|---|
| `main` y el árbol de trabajo | listado completo de `data/`, raíz y `docs/` | sin rastro |
| **Las 25 ramas remotas** | `git ls-tree -r` en cada una, filtrando por `experienc\|contrat\|genesis` | solo **código** (`lib/experiencia.js`, `api/admin/experiencia.js`), ningún dato |
| **Todo `.json` que haya existido jamás** | `git log --all --diff-filter=AMR --name-only` | **7 archivos en total**: `apu_catalogo`, `apu_regional`, `apu_tipologias`, `catalogo_apu`, `vocabulario_unspsc`, `package.json`, `vercel.json`. Ninguno es de contratos |
| **Los 1 041 blobs del object store**, incluidos los **colgantes e inalcanzables** (`git fsck --unreachable --dangling`) | contenido de cada blob contra los marcadores de un JSON de contratos | **0 blobs** con un arreglo `contratos` de datos |
| Mensajes de commit | `--grep` sobre `experiencia`/`contratos`/`106` en todos los refs | nada |
| Historial de `CLAUDE.md` | `git grep experiencia_genesis` en todos los refs | **una sesión anterior ya llegó a la misma conclusión** y la dejó escrita en la rama sin fusionar `claude/session-a11nje` |

La conclusión coincide con la de aquella sesión, alcanzada por caminos
independientes: **el archivo nunca estuvo en git.**

## Los campos que necesita el endpoint

`POST /api/admin/experiencia` (validación literal en `lib/experiencia.js`,
función `validarContratos`). El cuerpo es **un objeto con la clave
`contratos`**, no un arreglo suelto:

```json
{ "contratos": [ … ] }
```

### Por contrato

| Campo | ¿Obligatorio? | Tipo y límite | Qué pasa si falta |
|---|---|---|---|
| `objeto` | **SÍ** | texto, **máx. 1 000 caracteres** | error de validación con el índice exacto (`contratos[7].objeto`) |
| `valor_smmlv` **o** `valor_cop` | **SÍ, al menos uno** | número **positivo** | error: `debe venir «valor_smmlv» o «valor_cop» con un número positivo` |
| `no_contrato` | no | texto, máx. 300 | queda en `null` |
| `entidad` | no | texto, máx. 300 | queda en `null` |
| `modalidad` | no | texto, máx. 300 | queda en `null` |
| `participacion` | no | número **> 0 y ≤ 100** (porcentaje en consorcio/UT) | queda en `null`; si viene fuera de rango, error |
| `fecha_inicio` | no | texto, máx. 40 (se guarda tal cual, no se parsea) | queda en `null` |
| `fecha_fin` | no | texto, máx. 40 | queda en `null` |

**Los números se aceptan como texto.** `"350.000.000"` y `"450,5"` se
normalizan solos (`numeroTolerante`), porque este JSON se arma copiando de una
hoja de cálculo. Lo que **no** se acepta es un texto que no sea un número.

### Límites de la carga

- **Máximo 500 contratos** por carga (`MAX_CONTRATOS`). Los 106 caben de sobra.
- Cuerpo **≤ 5 MB**.
- La validación **no se detiene en el primer error**: devuelve la lista
  completa, cada uno con su campo exacto. Y **un rechazo no guarda nada** — no
  hay cargas a medias.

## ⚠️ El único campo que hace el trabajo es `objeto`

El vocabulario del oficio —lo que después cruza `/api/admin/cobertura-rup` con
el histórico de SECOP— se destila **solo de `objeto`**
(`construirVocabulario`). Los demás campos se guardan para poder *explicar* un
match («este proceso se parece al contrato 001-2024»), pero no aportan un solo
término. Consecuencias prácticas al armar el archivo:

- **Un objeto vago no aporta nada.** «Contrato de obra civil» produce cero
  términos útiles; «Construcción de placa huella en concreto de 3 000 psi en la
  vía terciaria El Retiro–San José, incluye cunetas y obras de drenaje» produce
  el vocabulario que hace útil la auditoría. **Copie el objeto textual del
  contrato**, sin resumirlo.
- **Los tokens con dígitos se descartan** (`2024`, `cm001`, `inv-03`): son el
  número del proceso, no el trabajo. No hace falta limpiarlos, pero tampoco
  cuentan.
- Se descartan también las palabras de menos de 3 letras y el trámite
  contractual (`prestacion`, `servicios`, `contrato`, `objeto`…): un término que
  está en todos los contratos no distingue ninguno.

## Ejemplo — cómo debe verse el archivo

Guárdelo como **`experiencia_genesis_106.json`** en la raíz del repositorio.
Estos tres contratos son **una plantilla de formato, no datos reales**: hay que
sustituirlos por los suyos.

```json
{
  "contratos": [
    {
      "no_contrato": "MC-2024-018",
      "entidad": "MUNICIPIO DE SAN JOSE DEL GUAVIARE",
      "objeto": "CONSTRUCCION DE PLACA HUELLA EN CONCRETO DE 3000 PSI EN LA VIA TERCIARIA EL RETIRO - SAN JOSE, INCLUYE CUNETAS, OBRAS DE DRENAJE Y SENALIZACION",
      "modalidad": "Mínima cuantía",
      "participacion": 100,
      "valor_cop": 348500000,
      "valor_smmlv": null,
      "fecha_inicio": "2024-03-11",
      "fecha_fin": "2024-09-30"
    },
    {
      "no_contrato": "LP-2023-004",
      "entidad": "GOBERNACION DEL META",
      "objeto": "MEJORAMIENTO Y OPTIMIZACION DE LA RED DE ACUEDUCTO DEL CORREGIMIENTO DE PUERTO LLERAS: ADUCCION, CONDUCCION Y REDES DOMICILIARIAS",
      "modalidad": "Licitación pública",
      "participacion": 45,
      "valor_cop": "1.240.000.000",
      "fecha_inicio": "2023-05-02",
      "fecha_fin": "2024-01-15"
    },
    {
      "no_contrato": "SA-2022-091",
      "entidad": "ALCALDIA DE VILLAVICENCIO",
      "objeto": "CONSTRUCCION DE AULAS ESCOLARES Y BATERIA SANITARIA EN LA INSTITUCION EDUCATIVA LA ESPERANZA, SEDE RURAL",
      "modalidad": "Selección abreviada",
      "valor_smmlv": 420.5,
      "fecha_inicio": "2022-08-01",
      "fecha_fin": "2023-02-28"
    }
  ]
}
```

Lo que muestra el ejemplo, a propósito: el **1.º** trae todos los campos; el
**2.º** trae el valor **como texto con puntos de miles** y participación
parcial (consorcio); el **3.º** omite `participacion` y usa **`valor_smmlv` en
vez de `valor_cop`**. Los tres son válidos.

## Cómo pasarme los datos

Cualquiera de estas tres vías sirve. En orden de preferencia:

1. **El JSON ya armado.** Si puede exportarlo desde donde lleve la lista,
   páseme el archivo con la estructura de arriba y lo dejo commiteado.
2. **La tabla en crudo** (Excel, CSV, o pegada en el chat), con al menos estas
   columnas: `nº de contrato · entidad · objeto · modalidad · participación % ·
   valor · fecha inicio · fecha fin`. Yo la convierto al JSON, la valido contra
   `validarContratos` **antes** de commitearla, y le reporto cualquier fila que
   no pase.
3. **El RUP en PDF** (formulario de experiencia, F. 3) o las certificaciones.
   Ahí están el objeto, el valor en SMMLV y las fechas de cada contrato. **Este
   entorno no tiene salida a internet** para descargarlo: tiene que adjuntarlo.

### Lo mínimo viable, si no tiene todo a mano

Con **`objeto` + `valor_cop`** de cada contrato ya se puede cargar y la
auditoría funciona completa. El resto de campos mejora la trazabilidad, no el
resultado.

### Lo que NO voy a hacer

Rellenar los 106 con objetos plausibles. Un vocabulario inventado produce una
auditoría de cobertura que *parece* medida y no lo está — y su salida es la
lista de códigos con la que se renueva el RUP. Es exactamente el error que el
proyecto ya tiene documentado como prohibido en tres sitios distintos
(`anticipo_pct = 0` es «sin dato»; el `score` sin experiencia viaja en `null` y
nunca en `0`; el NIT jamás se inventa).

## Qué funciona hoy sin este archivo

`/api/admin/cobertura-rup?perfil=genesis` **responde igual**, con el método base
(vocabulario de obra genérico). La diferencia está declarada en la propia
respuesta: el `score` de similitud viaja en **`null`**, que significa «no
medido», no «cero». Con la experiencia cargada, ese mismo endpoint prioriza los
códigos faltantes por parecido con lo que Génesis **realmente ha ejecutado**.

Cuando tenga los datos: `./cargar_experiencia.sh` (en la raíz del repo) hace los
tres pasos en orden.
