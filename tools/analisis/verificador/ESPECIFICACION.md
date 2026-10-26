# Especificación escrita del conteo de la Fase 0 (para el verificador independiente)

Archivos de entrada (JSON, en la carpeta que se te indique):
- `p6dx_obra.json`: lista de filas crudas del dataset p6dx-8zbt de SECOP II (una fila por FASE de un proceso),
  ya filtradas en el servidor por `tipo_de_contrato = 'Obra'`, `fecha_de_publicacion_del >= 2020-01-01`
  y modalidades competitivas.
- `ofertas_cruzadas.json`: lista de pares `[id_del_portafolio, [grupos]]`. Cada grupo es una oferta AGRUPADA
  en el servidor por (id_del_proceso_de_compra, nit_del_proveedor, c_digo_proveedor, nombre_proveedor,
  valor_de_la_oferta), con `n` (filas crudas juntadas), `fecha` y `_ds` (dataset de origen: wi7w-2nvm o b28v-edj8).
  Solo se pidieron ofertas de procesos adjudicados ("Si"), con precio_base > 0 y sin varios precios base.

## 1. Un proceso
Un proceso es un `id_del_portafolio`; las filas sin `id_del_portafolio` se ignoran. De sus filas se elige UNA
ordenando por esta clave, de menor a mayor, y tomando la ÚLTIMA:
1. `adjudicado == "Si"` (1) o no (0);
2. `valor_total_adjudicacion` numérico > 0 (1) o no (0);
3. `fecha_adjudicacion` como texto ("" si falta);
4. `fecha_de_publicacion_del` como texto ("" si falta);
5. el número entero al final de `id_del_proceso` (-1 si no hay).

## 2. Modalidad
Sobre `modalidad_de_contratacion` de la fila elegida, sin tildes, en minúsculas y con espacios simples:
- "licitacion publica" y "licitacion publica obra publica" → licitación;
- "seleccion abreviada de menor cuantia" y "seleccion abreviada menor cuantia sin manifestacion interes" → menor cuantía;
- "minima cuantia" → mínima;
- cualquier otra → fuera.

## 3. Números
Un valor es número solo si su texto (sin espacios a los lados) casa con `^-?\d+(\.\d+)?$`. Si no, es "sin dato",
NUNCA cero.

## 4. Años
- Año de adjudicación: los 4 primeros caracteres de `fecha_adjudicacion` de la fila elegida.
- Se reportan 2020 a 2026; el resto va a "otro_o_sin_fecha".

## 5. Columnas por (modalidad, año de adjudicación), solo procesos con `adjudicado == "Si"` en la fila elegida
- `adjudicados`.
- `a`: `valor_total_adjudicacion` > 0, `precio_base` > 0 y valor adjudicado <= precio base.
- Exclusiones del proceso, en este orden: sin precio_base > 0; dos o más `precio_base` positivos DISTINTOS
  entre sus filas (lote); `numero_de_lotes` de la fila elegida > 1 (lote); sin ofertas en `ofertas_cruzadas`.
- Ofertas válidas (solo para no excluidos y con ofertas), recorriendo los grupos en orden:
  1. si el nombre normalizado contiene "confidencial", se descarta;
  2. el valor debe ser número > 0;
  3. identidad del oferente: NIT válido = solo dígitos tras quitar espacios, puntos y guiones, 6 o más,
     que no sea un mismo dígito repetido, ni un dígito 1-9 seguido de 5 o más ceros, ni un prefijo de
     "1234567890". Nombre comparable = sin tildes, minúsculas, sin . , ; : ( ) " ' ´ `, "s a s" → "sas",
     "s a" → "sa", espacios simples. Un nombre vacío, "no definido", "sin descripcion" o "confidencial" no
     identifica. Un NIT que dentro del proceso aparece con 2 o más nombres comparables distintos no
     identifica (en ese proceso). Si no hay NIT ni nombre, el código `c_digo_proveedor` (no vacío ni todo
     ceros) identifica. Dos grupos son el MISMO oferente si comparten NIT válido o nombre comparable
     (unión transitiva dentro del proceso). Sin identidad → se descarta;
  4. mismo (oferente, valor) repetido → se descarta la repetición;
  5. valor > precio_base → se descarta;
  6. valor < 50 % del precio_base → se descarta (hay un rescate raro que usa contratos de otro dataset: NO lo
     implementes; anota que tus válidas pueden diferir por eso).
  Si un mismo oferente queda con 2 o más valores distintos válidos → el proceso se excluye (lote por ofertas).
- `b`: proceso no excluido con 3 o más ofertas válidas.
- `c`: proceso NO excluido (ninguna de las exclusiones de arriba, tampoco lote por ofertas) y entre sus
  válidas hay EXACTAMENTE una del adjudicatario. El adjudicatario es el oferente cuya
  identidad (con la misma regla del punto 3, usando `nit_del_proveedor_adjudicado` y `nombre_del_proveedor`
  de la fila elegida) se une con las de las ofertas del proceso.
- `d`: dentro de `b`, todas las ofertas válidas tienen NIT válido como parte de su identidad.
- `usable`: `b` y `c`, el valor adjudicado no está a más del 1 % de la oferta del adjudicatario, y no todas
  las válidas tienen el mismo valor.

## Salida pedida
JSON con, por modalidad y año: adjudicados, a, b, c, d, usable. Y la lista de diferencias que esperas por el
rescate (cuántos procesos tienen alguna oferta entre 0 y 50 % que sea igual, al peso, al valor adjudicado).

## Lo que esta especificación dejó ambiguo (medido el 25-oct-2026 al comparar las dos lecturas)

Tras corregir la columna (a) de `fase0.js`, quedaron 5 celdas distintas de 144. Las explican 6 procesos:
- **Adjudicado por encima del precio base.** `fase0.js` lo excluye de «usable» y este texto no lo decía
  (CO1.BDOS.7133350, CO1.BDOS.2885529).
- **Tolerancia del «mismo valor».** Con ofertas que difieren en 1 centavo o en 10 pesos, `cifras.sinPrecio`
  (tolerancia relativa 1e-9) lee «sin competencia de precio»; la comparación exacta, «con competencia»
  (CO1.BDOS.8348899, CO1.BDOS.2028594).
- **«sin . , ;…».** `limpieza.nombreComparable` cambia la puntuación por un ESPACIO, y el verificador la QUITÓ.
  Así, «U.T. PANTANILLO» y «UT PANTANILLO» son dos oferentes para la base y uno, con dos valores (lote), para el
  verificador (CO1.BDOS.2165775, CO1.BDOS.2008550). Qué lectura es la cierta está sin verificar.
