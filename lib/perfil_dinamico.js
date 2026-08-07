/* ============================================================================
   lib/perfil_dinamico · Perfiles creados por onboarding (RUP subido en PDF)
   ----------------------------------------------------------------------------
   Los tres perfiles del negocio (helder/genesis/juntos) viven en lib/perfiles y
   son la configuración del DUEÑO. Los perfiles dinámicos son otra cosa: los
   crea cualquier contratista subiendo su RUP desde la landing, viven en Redis
   bajo `config:perfiles:rup_*` CON TTL (no son configuración permanente, son un
   onboarding renovable re-subiendo el PDF) y JAMÁS tocan ni los tres perfiles
   fijos ni su sello `config:perfiles:version`.

   CÓMO SE SIRVEN. Todo el juicio del repositorio (evaluarRup, evaluarPuertas,
   filtrarProcesosVisibles) resuelve el perfil con `PERFILES[perfilId]` sobre el
   objeto VIVO de lib/perfiles — media app lo capturó al requerir. Por eso aquí
   el perfil dinámico se INYECTA como una propiedad más de ese objeto antes de
   evaluar, en vez de enseñarle un segundo diccionario a cada consumidor: cero
   cambios de firma aguas abajo. La inyección se acota (tope de instancias
   calientes) y se puede deshacer (`olvidarPerfilesDinamicos`, que usan las
   pruebas para no contaminar bloques siguientes).

   CADA PETICIÓN RELEE LA CLAVE (un GET de un valor pequeño): es el mismo
   criterio que el sello de perfiles — sin TTL de memoria, el efecto de
   re-subir un RUP es inmediato y un perfil caducado deja de servirse en la
   siguiente petición, no «dentro de N minutos».
   ========================================================================== */
"use strict";

const { PERFILES, perfilDesdeConfig } = require("./perfiles.js");
const { CLAVES, leerJSONComprimido } = require("./almacen.js");

/* minúsculas y dígitos a propósito: el id viaja en URLs y en localStorage, y
   un id con mayúsculas se volvería dos ids según quién lo normalice */
const ID_DINAMICO_RE = /^rup_[a-z0-9]{6,24}$/;
/* Tope por instancia caliente: esto no es una caché infinita. Va holgado a
   propósito: la evicción borra `PERFILES[viejo]` y el juicio resuelve
   `PERFILES[perfilId]` POR FILA, así que evictar un perfil que otra petición
   concurrente de la misma instancia está usando lo dejaría a mitad de cascada
   juzgando «perfil desconocido» en silencio. Con 200 perfiles distintos
   simultáneos en UNA instancia (un perfil ≈ pocos KB) la carrera es teórica;
   el techo real de perfiles vivos lo pone MAX_PERFILES_DINAMICOS en la carga. */
const MAX_INYECTADOS = 200;

const _inyectados = new Set();

function esPerfilDinamico(id) {
  return ID_DINAMICO_RE.test(String(id || ""));
}

function generarIdDinamico() {
  const crypto = require("crypto");
  return `rup_${crypto.randomBytes(6).toString("hex")}`;
}

/* Carga el perfil dinámico desde Redis y lo inyecta en PERFILES.
   → el perfil, o null si no existe / caducó / el id no tiene el formato.
   Si Redis falla y la instancia caliente ya lo tenía, se sirve lo vigente
   (misma regla que recargarPerfiles: quedarse mudo es peor). Si la instancia
   está FRÍA, el error se PROPAGA: devolver null aquí haría que el endpoint
   respondiera «perfil caducado» por un Redis caído — y la web, obediente,
   BORRARÍA el perfil guardado del cliente. Un fallo transitorio no puede
   costarle el perfil a nadie: quien llama ya traduce el error a un 502. */
async function cargarPerfilDinamico(redis, id) {
  if (!esPerfilDinamico(id)) return null;
  let guardado = null;
  try {
    guardado = await leerJSONComprimido(redis, CLAVES.configPerfilDinamico(id));
  } catch (e) {
    if (Object.prototype.hasOwnProperty.call(PERFILES, id)) return PERFILES[id];
    throw e;
  }
  if (!guardado || !guardado.perfil) {
    // caducó o nunca existió: si estaba inyectado se retira — servir un perfil
    // fantasma desde la memoria caliente sería mentirle a quien ya lo perdió
    if (_inyectados.has(id)) { delete PERFILES[id]; _inyectados.delete(id); }
    return null;
  }
  const perfil = perfilDesdeConfig(id, guardado.perfil, null);
  PERFILES[id] = perfil;
  _inyectados.add(id);
  if (_inyectados.size > MAX_INYECTADOS) {
    for (const viejo of _inyectados) {
      if (viejo === id) continue;
      delete PERFILES[viejo];
      _inyectados.delete(viejo);
      break;
    }
  }
  return perfil;
}

/* Retira TODOS los perfiles inyectados (pruebas e higiene). Los tres fijos no
   se tocan: no están en `_inyectados` por construcción. */
function olvidarPerfilesDinamicos() {
  for (const id of _inyectados) delete PERFILES[id];
  _inyectados.clear();
}

module.exports = {
  ID_DINAMICO_RE, MAX_INYECTADOS,
  esPerfilDinamico, generarIdDinamico, cargarPerfilDinamico, olvidarPerfilesDinamicos,
};
