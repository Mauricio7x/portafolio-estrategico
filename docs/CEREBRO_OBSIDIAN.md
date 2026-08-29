# El cerebro digital en Obsidian

Guía para el dueño. No hace falta terminal ni saber de programación en ningún paso.

## Qué es y qué no es

Un *vault* de Obsidian **es una carpeta con archivos de texto**, nada más. Este proyecto ya es esa
carpeta: al abrirlo con Obsidian se ve el mismo repositorio, con buscador, enlaces y notas.

Eso importa porque marca lo que sirve y lo que no:

- **Sirve** todo lo que quede escrito en texto: el nombre del archivo, el título, los campos de
  arriba de la nota, las etiquetas, los enlaces `[[así]]`. Claude lee texto, y lo ve todo.
- **No sirve** nada que solo entienda la aplicación: el grafo, los tableros (*canvas*), las
  consultas de complementos como Dataview. Claude nunca abre Obsidian. Se puede usar para verlo
  bonito, pero **no se guarda ahí información que haga falta**, porque a efectos del proyecto no
  existe.

## Cómo se abre (una sola vez)

1. Instalar Obsidian (gratis) en el computador: `obsidian.md`.
2. «Abrir carpeta como vault» → elegir la carpeta del proyecto.
3. Listo. Ya se lee `CLAUDE.md`, `docs/MAPA.md` (el mapa del proyecto) y `docs/MEMORIA.md`
   (la crónica de decisiones) con buscador propio.

La configuración que Obsidian crea (`.obsidian/`) **no se sube al proyecto** a propósito: es del
equipo de cada quien.

## Cómo se escribe desde el celular

Con el complemento **Obsidian Git**, que sincroniza la carpeta sin usar terminal:

1. Obsidian en el celular → Ajustes → Complementos de la comunidad → instalar «Obsidian Git».
2. Configurarlo contra este mismo repositorio.
3. A partir de ahí: escribir una nota, y el complemento la sube. En la siguiente sesión, Claude
   ya la tiene.

## Cómo se escribe una nota que sirva

Las notas van en **`docs/bitacora/`**. Una nota, una idea. El archivo empieza con tres campos
entre guiones:

```
---
fecha: 2026-08-29
etiquetas: [precios, invias]
toca: [lib/ganancia.js]
---

# El margen del contrato de la 5ª

Lo que pasó y por qué importa.
```

- **fecha** — obligatoria, con esa forma. Ordena la bitácora.
- **etiquetas** — libres. Sirven para reencontrar la nota por tema.
- **toca** — rutas reales del proyecto que la nota explica. Es el campo que más rinde: cuando
  Claude vaya a cambiar `lib/ganancia.js`, el mapa le muestra esta nota **antes** de tocar nada.
  Si se escribe una ruta que no existe, la prueba del proyecto falla a propósito.

`docs/bitacora/_plantilla.md` tiene el formato listo para copiar. Los archivos cuyo nombre empieza
por `_` no cuentan como notas.

## Qué gana Claude con esto

En cada sesión, lo primero que corre es `node tests/mapa.js <término>`. Ese buscador ahora incluye
la bitácora: devuelve las notas que casan con el término y las que declaran tocar el módulo en
cuestión, con el comando exacto para leerlas. Es decir: **lo que usted anote se busca solo**, sin
que haya que contarlo por prompt ni pagar el costo de leer el proyecto entero para encontrarlo.

## Lo que conviene NO hacer

- **No escribir un índice a mano.** Cualquier lista de «dónde está cada cosa» escrita a mano queda
  desactualizada y pasa a mentir. El índice se genera solo desde los archivos.
- **No repetir aquí lo que ya está en la crónica.** Si algo ya está en `docs/MEMORIA.md`, la nota
  solo tiene que apuntar al tema; dos copias divergen a la primera corrección.
- **No guardar cifras de una oferta sin decir de dónde salieron.** Sin fuente, un número escrito
  aquí se vuelve creíble y equivocado, que es el daño más caro de esta aplicación.
