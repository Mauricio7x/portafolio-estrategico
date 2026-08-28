# Ramas superadas al unificar en `main` (21-ago-2026)

Encargo del dueño: **«Unifica todas las ramas y solo maneja en `main`»**. Este documento es el censo
de las 95 ramas remotas: qué se comprobó de cada una, por qué ninguna queda pendiente de fusionar, y
cómo borrarlas —o resucitar cualquiera— sin volver a auditarlas desde cero.

> ⚠️ **EL BORRADO NO SE PUDO EJECUTAR DESDE AQUÍ, y hay que decirlo en vez de darlo por hecho.**
> El relé de git de este entorno **permite empujar commits pero deniega el borrado de referencias**:
> `git push origin --delete <rama>` responde `HTTP 403` mientras `git push origin main` funciona con
> normalidad, y el proxy no registra el fallo como suyo (`recentRelayFailures: []`). El servidor MCP
> de GitHub tampoco expone ninguna herramienta de borrado de ramas. La instrucción del entorno es
> explícita: un 403 de política **no se reintenta ni se rodea**, se reporta.
>
> **Las 95 ramas siguen existiendo en GitHub.** No son trabajo pendiente —su contenido está auditado
> y absorbido, ver abajo— sino ruido. Cómo borrarlas con clics, sin terminal:
> <https://github.com/Mauricio7x/portafolio-estrategico/branches> → pestaña **All** → papelera 🗑 a la
> derecha de cada rama. GitHub ofrece **Restore** durante un tiempo en esa misma página, y este
> documento guarda además el SHA de cada una por si el botón ya no estuviera.

## Qué se comprobó antes de dar las ramas por superadas, y cómo

**La topología engaña: `main` se construyó con fusiones aplastadas (squash).** Por eso casi todas las
ramas aparecían como «96 ahead / 116 behind» aunque su contenido ya estuviera dentro. La comprobación
NO fue contar commits: fue **comparar archivos** (`git diff --name-status origin/main..<rama>`,
buscando lo que la rama AÑADE y `main` no tiene).

Resultado del barrido sobre las 95 ramas:

- **Una sola rama aportaba contenido que `main` no tenía**: `claude/tokens-vercel-github-setup-k40570`
  → `docs/CONFIGURACION_TOKENS.md`. **Ya está en `main`** (commit `fa0825a`), junto con la
  corrección del paso 1 del `README.md` que esa guía dejaba pendiente por no tener permiso de
  escritura entonces.
- **Todo lo demás que las ramas «añadían» son archivos RETIRADOS DE `main` A PROPÓSITO**, y volver a
  meterlos sería una regresión, no un rescate:
  - `api/admin/rup.js`, `api/admin/experiencia.js`, `api/apu/[accion].js`,
    `api/competencia-detalle.js`, `api/oportunidades.js`, `api/sync.js`, `api/diagnostico.js`… →
    plegados en los **6 routers por dominio** (`api/` está en 6 de 12; ver CLAUDE.md,
    «Consolidación a 6 routers»). La suite fija el conteo en `=== 6`.
  - `public/admin.html`, `public/admin.js`, `public/apu.html`, `public/apu.js`,
    `public/pliego.html` → retirados en **«Página única»**; la suite **prohíbe** que vuelvan
    (`tests/e2e.js`: `for (const viejo of ["admin.html", "apu.html", "pliego.html", "admin.js",
    "apu.js"])`).
  - `api/cron.js`, `api/proxy.js`, `api/telegram.js`, `lib/engine.js`, `index.html` en la raíz,
    `package.json`, `sw.js`, `manifest.webmanifest` → la arquitectura **anterior a la reescritura**
    de jul 2026 (el `index.html` monolítico de 580 KB). `package.json` en particular contradice la
    regla central del proyecto: sin dependencias, sin build.

## Las dos PR abiertas, cerradas sin fusionar

- **#21** «Motor de inferencia de ítems APU» (5-ago): `lib/apu/inferencia.js`, `lib/apu/catalogo.js`
  y `docs/APU_Y_RENTABILIDAD.md` ya están en `main`; lo único que añadiría son archivos retirados.
- **#3** «legal compliance audit» (29-jul): apunta a la arquitectura anterior a la reescritura.

Una PR abierta sobre trabajo ya integrado no es un pendiente: es ruido que la próxima sesión audita
otra vez. Las dos llevan un comentario que explica por qué se cerraron.

## Addendum del 27-ago-2026 · las ramas que nacieron DESPUÉS del censo

Re-auditado con el mismo método (comparar ARCHIVOS contra `origin/main`, no commits). El borrado
de referencias sigue denegado desde el entorno (reintentado el 27-ago-2026: sigue bloqueado), así
que la vía sigue siendo la página *branches* de GitHub. Las cinco ramas posteriores al censo:

| Última fecha | Rama | SHA | Veredicto |
| --- | --- | --- | --- |
| 2026-08-26 | `claude/banco-precios-verificable-e7j0si` | `2c89d4e6c15a` | **Rescatada a `main` el 27-ago-2026** (censo retail + referencia LS-ZH verificada por el dueño + sección de CLAUDE.md). Borrable |
| 2026-08-26 | `claude/robust-claude-code-prompt-x0p26e` | `d0632989a59e` | Fusionada vía PR #128: diff 0 archivos añadidos. Borrable |
| 2026-08-24 | `claude/web-subscription-consulting-g4g1or` | `9c87301b8f0c` | Añade solo `docs/PROMPT_CONSULTORIA_SAAS.md`, un prompt con tablas de ESTADO dentro (dice «23 docs», «12 puntos de auth» — ya falsas), el patrón que la doctrina del 26-ago retiró. NO se rescata; el encargo que contiene (vender por suscripción) se relanza desde `docs/PROMPT_INICIAL.md` si el dueño quiere. Borrable |
| 2026-08-24 | `claude/detekta-web-prompt-pz0gh6` | `25245458dd53` | Su punta ES su merge-base: no añade nada propio. Borrable |
| 2026-08-27 | `claude/audit-consultoria-repo-qbvdhj` | — | La rama de la sesión de auditoría del 27-ago; se borra DESPUÉS de fusionarla a `main` |

Con esto, **las 100 ramas remotas distintas de `main` quedan censadas y borrables** (las 95 del
censo original más estas cinco, con la última condicionada a su fusión).

## Cómo resucitar una rama

Si algún día se borran, su commit sigue existiendo mientras GitHub no lo recoja. Para devolver
cualquiera:

```bash
git push origin <sha>:refs/heads/<nombre-de-la-rama>
```

Y para ver qué tenía sin resucitarla:

```bash
git fetch origin <sha> && git show --stat <sha>
```

## Tabla de ramas retiradas

| Última fecha | Rama | SHA |
| --- | --- | --- |
| 2026-08-20 | `claude/secop-missing-processes-sync-3ubrqk` | `1f80ba1f5a52` |
| 2026-08-20 | `claude/tokens-vercel-github-setup-k40570` | `07375846f876` |
| 2026-08-20 | `claude/project-comprehensive-audit-x1sh1w` | `56b1312cf3b3` |
| 2026-08-20 | `claude/ecc-mental-framework-jhupip` | `f7ca950b8088` |
| 2026-08-20 | `claude/vercel-socrata-tokens-ytyfnd` | `e021b7088546` |
| 2026-08-20 | `claude/ecc-mental-framework-eny4wi` | `63f1dcfa72a9` |
| 2026-08-19 | `claude/codespaces-pending-work-7n0mz8` | `57d29d2d9394` |
| 2026-08-18 | `claude/docs-analysis-later-d10849` | `1a83491306b6` |
| 2026-08-17 | `claude/detecta-audit-competitive-analysis-2ciugk` | `cf2d790bd5c2` |
| 2026-08-17 | `fix/socio-falta-cedula` | `6217c284ff4d` |
| 2026-08-17 | `feature/socio-due-diligence` | `6637b8962d8f` |
| 2026-08-16 | `feature/ejecucion-jbjy` | `d5ab382b8c32` |
| 2026-08-16 | `feature/proponentes-hgi6` | `87d2475d8d76` |
| 2026-08-16 | `feature/invias-2026-1-xlsx` | `f10453808e2e` |
| 2026-08-16 | `docs/fase1-contraste-idu-invias` | `7288b54eaa9f` |
| 2026-08-16 | `feature/fase1-subcontrato-jornada-equipo` | `9509f0129b73` |
| 2026-08-16 | `docs/no-definido-medido` | `9d67485eeeea` |
| 2026-08-16 | `fix/no-definido-conteo-final` | `efd9d76a66f5` |
| 2026-08-16 | `fix/socrata-select-star-primero` | `e5f66b8b36d2` |
| 2026-08-16 | `fix/socrata-token-invalido` | `8a69cf4c7076` |
| 2026-08-16 | `feature/probabilidad-b3-prorroga` | `66530f3e0397` |
| 2026-08-16 | `feature/probabilidad-b7-prior-departamento` | `9b1ce33738fe` |
| 2026-08-16 | `feature/probabilidad-bmax-apu` | `7cb802eaf4e8` |
| 2026-08-16 | `docs/b2-cerrado` | `9dd70dc914bb` |
| 2026-08-16 | `feature/probabilidad-b2-medicion` | `4a84dd8ccb3c` |
| 2026-08-16 | `feature/probabilidad-a7-factor-medido` | `dc54bc9d37cc` |
| 2026-08-16 | `feature/probabilidad-a7-colision` | `48c71fd326d3` |
| 2026-08-16 | `fix/probabilidad-explicacion-encogida` | `c908c4ec170b` |
| 2026-08-16 | `feature/probabilidad-encogimiento-precio` | `47cfae97075d` |
| 2026-08-16 | `feature/fase-6-traduccion` | `c5f668f20123` |
| 2026-08-16 | `feature/fases-4-5-guardian-vigia` | `092cc6263716` |
| 2026-08-16 | `feature/fase-10-consorcio` | `a677fe0fb154` |
| 2026-08-16 | `feature/fase-9-portada` | `ef01f30d0eca` |
| 2026-08-16 | `feature/fase-8-filtros` | `46d2e0ac2518` |
| 2026-08-16 | `feature/fase-7-marca-detekta` | `5ff88404db1c` |
| 2026-08-15 | `feature/fase-3-panel-piso-techo` | `abed2d141cf1` |
| 2026-08-15 | `fix/entrada-textos` | `33f0cc7b31d9` |
| 2026-08-15 | `feature/fase-2-puerta-de-entrada` | `94be537637ac` |
| 2026-08-15 | `fix/factor-jornada-en-detalle` | `ab522a4f1b30` |
| 2026-08-15 | `feature/fase-1-motor-costo-real` | `334386961831` |
| 2026-08-15 | `docs/pre-auditoria-fase-1` | `fa546482e77c` |
| 2026-08-15 | `feature/frontend-rutas-canonicas` | `cd991c50b008` |
| 2026-08-15 | `feature/retail-mas-cobertura` | `2e9b9ea36292` |
| 2026-08-15 | `feature/fase-0-seis-routers` | `2af5f942f789` |
| 2026-08-12 | `fix/catalogo-viejo-en-redis` | `49b5ba19aa93` |
| 2026-08-12 | `feature/cascada-visible` | `f7e9f578bfb0` |
| 2026-08-12 | `feature/apu-tres-pasos` | `2e93738a3d9d` |
| 2026-08-12 | `fix/precios-propios-en-calcular` | `1f3fe8c9a1f5` |
| 2026-08-12 | `feature/codigos-invias` | `ec40f764fc67` |
| 2026-08-12 | `fix/invias-renumeracion` | `947dbfe403ea` |
| 2026-08-12 | `feature/invias-articulos` | `b810a5721b93` |
| 2026-08-12 | `feature/invias-provincias` | `1ea3733a8d82` |
| 2026-08-12 | `feature/apu-precios` | `e7f63954e064` |
| 2026-08-12 | `feature/panel-mi-empresa` | `4fa9a79e31e1` |
| 2026-08-12 | `feature/lenguaje-claro` | `a024f9746ba2` |
| 2026-08-12 | `feature/apu-reestructurado` | `c9ebe4440eee` |
| 2026-08-12 | `feature/apu-profesional` | `ece1b152169c` |
| 2026-08-12 | `claude/rup-delete-probability-design-h57s0u` | `d94820021e40` |
| 2026-08-12 | `fix/ui-apple-glass-final` | `d94820021e40` |
| 2026-08-11 | `claude/portafolio-tabs-glass-morphism-fg5tom` | `88433d43411a` |
| 2026-08-07 | `feature/investigacion-plataformas` | `bbf671dab0c0` |
| 2026-08-07 | `claude/apu-modulo-completo-p0lmwa` | `05024eb6684e` |
| 2026-08-07 | `claude/landing-rup-onboarding-cualau` | `53df9df6dba5` |
| 2026-08-06 | `fix/chip-competencia-sin-dato` | `63caf25bf3f3` |
| 2026-08-06 | `claude/audit-strategic-portfolio-96ydig` | `c06794329743` |
| 2026-08-06 | `feature/auditoria-correccion` | `913c74a8c4fe` |
| 2026-08-06 | `claude/optimizador-precio-oferta-tsyn5h` | `e74f1e5802f0` |
| 2026-08-06 | `fix/formula-probabilidad-faseA` | `8be19bedf7f9` |
| 2026-08-06 | `claude/probabilidad-desglose-justificado-kd0mzv` | `149f94c16297` |
| 2026-08-06 | `claude/win-probability-formula-jr4pbm` | `8e96000822a1` |
| 2026-08-05 | `claude/genesis-experiencia-apu-guards-vh339q` | `4712e039541c` |
| 2026-08-05 | `fix/falsos-positivos-inferencia` | `e9339b028b04` |
| 2026-08-05 | `feature/ocr-pliegos` | `b6dc9909161a` |
| 2026-08-05 | `claude/apu-opportunities-integration-7slu64` | `b060c1f98e55` |
| 2026-08-05 | `feature/integracion-apu-final` | `b060c1f98e55` |
| 2026-08-05 | `claude/apu-item-inference-engine-8ll12v` | `0b7e352a9d66` |
| 2026-08-05 | `claude/apu-dynamic-editor-hhf1ph` | `13250c8eb4a8` |
| 2026-08-05 | `claude/session-a11nje` | `d77b4fdb0caa` |
| 2026-08-04 | `claude/apu-precios-redis-sj8qyt` | `3301c9e47e20` |
| 2026-08-04 | `feature/indice-baja` | `f359d4c427e2` |
| 2026-08-04 | `claude/apu-rentabilidad-licitaciones-vxom4c` | `5981300ca41e` |
| 2026-08-04 | `claude/investigacion-apu-rentabilidad` | `5981300ca41e` |
| 2026-08-04 | `claude/experiencia-unspsc-endpoint-6ffkkm` | `6a9b54a60e28` |
| 2026-08-04 | `claude/puertas-ve-alternativa` | `fc730de2ba62` |
| 2026-08-03 | `claude/audit-dashboard-procesos-tctxi9` | `3bb8cca51df5` |
| 2026-08-03 | `claude/licitaciones-knowledge-extraction-zz1b0n` | `4cb96e428a17` |
| 2026-08-01 | `claude/unspsc-matching-false-positives-vymwbf` | `84d195773bbf` |
| 2026-08-01 | `claude/entity-win-probability-ranking-55u7rc` | `71d05f731a78` |
| 2026-07-31 | `claude/secop-licitaciones-atractividad-4ilp3v` | `1777447ac9fa` |
| 2026-07-31 | `claude/portafolio-secop-rewrite-079wcd` | `13cfc6310769` |
| 2026-07-29 | `claude/legal-compliance-audit-rcqitl` | `a85e9d6d57b0` |
| 2026-06-16 | `claude/peaceful-bohr-ybhwqs` | `17f577634433` |
| 2026-06-10 | `claude/funny-euler-wstjzu` | `eac4be3e0019` |
| 2026-06-07 | `claude/elegant-mccarthy-3zRu1` | `3e3ce7ae18cd` |
| 2026-06-02 | `claude/optimistic-bohr-axi3u` | `8badfa43e93a` |
