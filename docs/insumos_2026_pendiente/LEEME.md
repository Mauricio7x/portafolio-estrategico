# Insumos de precios 2026 · las FUENTES de los bancos del módulo APU

Los 22 archivos que aportó el dueño en agosto de 2026. **Esta carpeta no es un
acopio pendiente: es la fuente de la que se regeneran tres bancos de precios de
la app.** El censo, los contrastes y las decisiones están en
[`../INSUMOS_2026.md`](../INSUMOS_2026.md); aquí solo va el mapa
archivo → capturador → JSON, para que nadie tenga que abrirlos otra vez para
saber qué son.

El nombre de la carpeta dice «pendiente» porque así nació y renombrarla movería
las rutas de los tres capturadores; lo que está pendiente y lo que no, lo dice
esta tabla.

## Integrados — se regeneran con su capturador

| Archivo | Capturador | Produce |
|---|---|---|
| `APUsEPC2026_Feb.xlsx` + `CARTILLAUBATE.pdf` | `tests/capturar_epc_apu.js` | `data/apu_epc_items.json` (440 APU **con composición**) |
| `Listado_Precios_Tope_Dpto_Vigencia_2026.xlsx` | `tests/capturar_ffie_apu.js` | `data/apu_ffie_items.json` (1 042 ítems × 33 dptos, precio **TOPE**) |
| `LISTA_DE_PRECIOS_ICCU_2026.pdf` | `tests/capturar_iccu_apu.js` | `data/apu_iccu_items.json` (1 234 ítems, 58 municipios) |
| `Visor_BPR_2026I_FaseI_29072026.xlsx` | `tests/capturar_idu_apu.js` | `data/apu_idu_items.json` — **ya lo estaba** (está aquí duplicado) |

Los capturadores son **herramientas manuales**: la app nunca lee esta carpeta.
Se corren a mano cuando la entidad publique una vigencia nueva, y todos declaran
en su cabecera qué miden y qué descartan.

## Usadas parcialmente

Las **11 cartillas provinciales de EPC** restantes (`ALTOMAGDALENA`,
`BAJOMAGDALENA`, `GUALIVA`, `GUAVIO`, `MAGDALENACENTRO`, `MEDINA`, `RIONEGRO`,
`SABANACENTRO`, `SOACHA`, `SUMAPAZ`, `TEQUENDAMA`) **no se usan**: sus filas no
traen numeral y su texto está corrupto en origen (el ToUnicode del PDF sustituye
letras). Las dos vías para aprovecharlas se descartaron midiendo — ver
`INSUMOS_2026.md` §7. Solo entró Ubaté, la única con numeral.

## No integradas, y por qué

| Archivo | Motivo |
|---|---|
| `Lista_oficial_precios_unitarios_Boyaca_20260818.csv` | Es el dataset de **2022**; la fecha del nombre es la de descarga. Sale ×0,42–0,88 contra el FFIE 2026 del mismo departamento: **subestimaría el costo** |
| `APU_2023_Construccion_Infraestructura_V5_del_15sep23.pdf` | Vigencia 2023, mismo problema de rezago |
| `Analisis_ManoDeObra_FactorPrestacional_Cuadrillas_2026.xlsx` | **Alto valor, pendiente**: trae el factor prestacional 2026 con desglose, pero **no es «el 1,55 corregido»** (incluye dotación, bioseguridad y días reales). Toca el motor entero: `INSUMOS_2026.md` §4 |
| `Listado_Herramientas_Equipos_Insumos_2026.xlsx` | 2 795 precios de **insumo** (no de ítem). Alimentaría la capa de `apu_retail`/`apu_invias` |
| `Listado_Precios_EstudiosYDisenos_2026.xlsx` | Estudios y diseños por m². No es obra |
| `Capacitacion_Presentacion_ItemsNoPrevistos.pptx` | Material de capacitación, no una fuente de precios |

## Licencia

**Ninguno de estos documentos declara licencia de uso comercial.** Son de
entidades públicas y los precios son públicos, pero «público» no es
«licenciado»: antes de comercializar Detekta con estos datos hay que verificarlo
con FFIE, ICCU y EPC, como el INVIAS ya obligó a dejar escrito en su `_meta`.

Para las listas y los APU adjudicados que **no** deben versionarse (contratos del
negocio, listas con restricción expresa) está la carpeta `entrada/` de la raíz,
que sí está en `.gitignore`.

## Decisión del 28-ago-2026 · SE CONSERVAN TODOS (pendiente cerrado)

El dueño delegó la decisión sobre los 7 archivos que ningún capturador lee
(«haz lo que mejor te parezca») y la decisión es **conservarlos**, por cuatro
motivos medidos:

1. **Dos son la EVIDENCIA de análisis citados en la memoria**: el
   `Analisis_ManoDeObra…` es la fuente del factor 2,19 que CLAUDE.md discute, y
   el `Visor_BPR…` es el documento fuente del banco IDU — los demás bancos
   conservan su fuente en esta misma carpeta, y la URL del IDU puede morir
   (los portales colombianos se reorganizan: ya pasó con INVIAS).
2. **Tres son candidatos CON CONDICIÓN documentada** (Boyacá y APU-2023
   esperan un índice oficial que los traiga a 2026; Herramientas y
   EstudiosYDiseños son capas futuras): borrarlos cierra la opción para
   ahorrar kilobytes.
3. **El costo real es ~9 MB de clon y CERO de despliegue**: `docs/` no viaja a
   Vercel (`includeFiles` apunta a `data/**`).
4. La regla del censo de higiene: **un falso «borrar seguro» cuesta más que
   diez «no borrar»**.

Esta carpeta deja de ser un pendiente: es el archivo de fuentes del módulo de
precios. Nada de aquí se borra sin una decisión nueva del dueño.
