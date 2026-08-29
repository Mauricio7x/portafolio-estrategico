---
fecha: 2026-08-29
etiquetas: [bitacora, contexto, tokens]
toca: [tests/mapa.js, docs/CEREBRO_OBSIDIAN.md]
---

# Cómo nació esta bitácora

Encargo del dueño (29-ago-2026): «un cerebro digital con Obsidian, para que Claude tenga mejor
contexto en cada prompt y sepa dónde buscar». El diagnóstico: la mitad cara ya estaba hecha
—`tests/mapa.js` da las coordenadas del código y de la memoria—, pero **faltaba el canal de
entrada del dueño**, que no tiene terminal y por tanto no puede escribir en la crónica ni correr
ninguna herramienta.

Esta carpeta es ese canal. Lo que se escriba aquí desde Obsidian entra en el índice del mapa sin
que nadie lo copie a un prompt: en la sesión siguiente, `node tests/mapa.js <término>` ya devuelve
la nota con el `cat` escrito, y si la nota declara `toca:`, aparece también al buscar ese módulo.

Esta primera nota queda como ejemplo vivo del formato. `docs/CEREBRO_OBSIDIAN.md` explica cómo
abrir el vault y cómo escribir desde el celular.
