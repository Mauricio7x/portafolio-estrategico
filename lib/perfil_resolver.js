/* lib/perfil_resolver.js · el perfil que pide una petición, resuelto en UN solo sitio
   ─────────────────────────────────────────────────────────────────────────────
   Un `?perfil=` puede ser un alias documentado (consorcio → juntos), uno de los
   perfiles fijos del dueño (lib/perfiles), un perfil DINÁMICO del onboarding
   (`rup_…`, vive en Redis con TTL) o un CONSORCIO a la medida (`cons_…`, se
   deriva de sus integrantes vivos en cada petición). Hasta el 2-sep-2026 esa
   cascada vivía en línea dentro del listado (lib/handlers/procesos/listar.js);
   el dictamen del pliego la necesitaba igual, y dos resoluciones «equivalentes
   hoy» divergen a la primera corrección (la lección de `cuerpo.js`). Por eso
   está aquí y las dos la LLAMAN.

   Dos pasos a propósito, como hacía el listado:
   · `validarIdPerfil` solo mira el FORMATO: un id malformado es un 400 como
     cualquier perfil inexistente, no un viaje a Redis. No toca la red.
   · `cargarPerfilResuelto` va a Redis SOLO para los dinámicos y los consorcios
     (los fijos ya están en `PERFILES`, recargados por `recargarPerfiles`), y
     devuelve el 404 que dice qué hacer cuando el perfil caducó.
   Los textos de error son los mismos que servía el listado: hay frontends que
   los reconocen. `hasOwnProperty` en los dos mapas: `?perfil=constructor` no
   debe resolverse por el prototipo. */
"use strict";

const { PERFILES, ALIAS_PERFIL } = require("./perfiles.js");
const { esPerfilDinamico, cargarPerfilDinamico } = require("./perfil_dinamico.js");
const { BASE_DUENO } = require("./accesibilidad.js"); // hoja del grafo: no cierra ciclo

const ERROR_PERFIL = "falta ?perfil=helder | genesis | juntos (alias: consorcio) — o el id de un RUP subido (rup_…)";
const ERROR_CONSORCIO_CADUCADO = "Ese consorcio ya no existe (se borró o alguno de sus integrantes caducó). Vuelva a Mi empresa y ármelo de nuevo.";
const ERROR_RUP_CADUCADO = "El perfil de este RUP no existe o ya caducó (los perfiles subidos por PDF duran 45 días). "
  + "Vuelva a la página de inicio y suba su RUP de nuevo: toma menos de un minuto.";

/* Los perfiles que se pueden nombrar sin credencial ni Redis: los fijos. */
const perfilesFijos = () => Object.keys(PERFILES).filter((k) => !esPerfilDinamico(k) && !/^cons_|^sim_/.test(k));

function validarIdPerfil(crudo) {
  let perfil = String(crudo || "").toLowerCase();
  if (Object.prototype.hasOwnProperty.call(ALIAS_PERFIL, perfil)) perfil = ALIAS_PERFIL[perfil];
  /* require diferido: lib/consorcio requiere perfiles y capacidad, y el listado
     ya lo requería así para no arrastrarlo en la carga del módulo. */
  const { esConsorcio } = require("./consorcio.js");
  const dinamico = esPerfilDinamico(perfil);
  const consorcio = esConsorcio(perfil);
  if (!dinamico && !consorcio && !Object.prototype.hasOwnProperty.call(PERFILES, perfil)) {
    return { ok: false, status: 400, error: ERROR_PERFIL, perfiles: perfilesFijos() };
  }
  return { ok: true, perfil, dinamico, consorcio };
}

/* Tras `recargarPerfiles(redis)`. Devuelve el objeto del perfil listo para
   evaluar, o el 404 con su motivo. */
async function cargarPerfilResuelto(redis, info) {
  if (!info || !info.ok) return { ok: false, status: 400, error: ERROR_PERFIL, perfiles: perfilesFijos() };
  if (info.consorcio) {
    const { cargarConsorcio } = require("./consorcio.js");
    if (!(await cargarConsorcio(redis, info.perfil))) return { ok: false, status: 404, perfil_caducado: true, error: ERROR_CONSORCIO_CADUCADO };
  }
  if (info.dinamico && !(await cargarPerfilDinamico(redis, info.perfil))) {
    return { ok: false, status: 404, perfil_caducado: true, error: ERROR_RUP_CADUCADO };
  }
  const perfil = Object.prototype.hasOwnProperty.call(PERFILES, info.perfil) ? PERFILES[info.perfil] : null;
  if (!perfil) return { ok: false, status: 404, perfil_caducado: true, error: ERROR_RUP_CADUCADO };
  return { ok: true, perfil };
}

/* LA BASE DESDE LA QUE SE MIDE «CUÁNTO CUESTA LLEGAR» (lib/accesibilidad),
   decidida aquí porque es un hecho del PERFIL (6-sep-2026, M-SEG-10). Solo los
   perfiles del dueño operan desde Bogotá/Ibagué (el encargo de ago 2026); un
   RUP subido (`rup_…`), un consorcio a la medida (`cons_…`) o una simulación
   (`sim_…`) no han dicho desde dónde operan → null, y el listado y la guía
   declaran la distancia sin calcular. Jamás Bogotá por defecto: para un
   contratista de Cali «Su zona (Bogotá)» era una cifra creíble y falsa en la
   primera pantalla. Cuando el perfil dinámico guarde su ciudad (peldaño
   siguiente de la ficha), este es el único sitio que hay que enseñarle. */
function baseDelPerfil(crudo) {
  let perfil = String(crudo || "").toLowerCase();
  if (Object.prototype.hasOwnProperty.call(ALIAS_PERFIL, perfil)) perfil = ALIAS_PERFIL[perfil];
  return perfilesFijos().includes(perfil) ? BASE_DUENO : null;
}

module.exports = { validarIdPerfil, cargarPerfilResuelto, perfilesFijos, baseDelPerfil, ERROR_PERFIL, ERROR_CONSORCIO_CADUCADO, ERROR_RUP_CADUCADO };
