---
name: contratacion
description: Responde preguntas sobre la contratación estatal de obra en Colombia (Ley 80 de 1993 y sus reformas) con la base de conocimiento de Detekta, y confirma la vigencia de cada norma antes de citarla. Uso: /contratacion <pregunta>
---

# Contratación estatal con la base de Detekta

Argumentos: `$ARGUMENTS` = la pregunta. Si no hay pregunta, diga qué etapas cubre la base (los títulos de la sección 3 de `docs/CONTRATACION_ESTATAL.md`) y pida la pregunta.

Pasos, en este orden:

1. Busque los títulos que responden la pregunta con `grep -n "^## \|^### \|^#### " docs/CONTRATACION_ESTATAL.md` y lea solo esas secciones.
2. Para cada norma, cifra o sentencia que vaya a usar, revise en las secciones 2 y 4 si quedó confirmada, corregida, retirada o sin verificar, y dígalo en la respuesta.
3. Cuando necesite el enlace o la referencia completa de una fuente, búsquela por su identificador `F-` en `docs/CONTRATACION_ESTATAL_FUENTES.md`. Una fuente marcada «sin ficha de agente» no se cita sin abrirla antes.
4. Antes de citar una norma, confirme su vigencia en la fuente oficial: el texto de la Secretaría del Senado con sus notas de vigencia, o Colombia Compra Eficiente. Si no puede confirmarla en esta sesión, escriba «sin verificar».
5. No cite ni calcule una cifra que no esté en la base ni en una fuente que usted abra en esta sesión.
6. La respuesta es una lectura de la base, no asesoría jurídica: diga qué problema describe, qué dice la norma vigente y qué queda por verificar.

Esta habilidad no escribe nada en el repositorio y no cambia código.
