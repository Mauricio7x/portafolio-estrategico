/* ============================================================================
   lib/rastreo · «¿Por qué no está este proceso?»
   ----------------------------------------------------------------------------
   Nace del defecto de producción del 20-ago-2026: el ingeniero vio cuatro
   convocatorias de la UNIVERSIDAD PEDAGÓGICA NACIONAL en SECOP II y una sola
   en la app, y NO HABÍA FORMA DE AVERIGUAR POR QUÉ. El embudo de
   /api/diagnostico censa el corpus ya guardado, así que un proceso descartado
   en la INGESTA no figura en ninguna de sus cubetas; y la sincronización
   publicaba una cifra agregada sin motivos.

   Este módulo responde la pregunta EXACTA que hace quien echa algo en falta:
   se escribe la referencia (o parte del objeto, o el NIT de la entidad) y
   contesta en cuál de los cuatro sitios posibles murió:

     1. `servido`         está en el corpus y la app lo sirve a este perfil.
     2. `en_corpus`       está guardado, pero el JUICIO lo aparta — y se dice el
                          paso exacto y su explicación (la misma `evaluarRup`).
     3. `descartado_en_ingesta`  la cascada de ingesta lo tiró: se dice el
                          motivo, tomado del censo (lib/censo_ingesta).
     4. `no_consta`       ni guardado ni censado. Eso NO significa «no existe»:
                          significa que la app no lo ha LEÍDO de la fuente, y el
                          siguiente paso es una full — nunca se afirma que el
                          proceso no exista, porque este módulo no ha mirado
                          SECOP II, solo lo que la app tiene.

   Reglas que no hay que re-aprender:
   · NO reimplementa el juicio: llama a `evaluarRup`/`evaluarPuertas` que le
     INYECTAN. Un segundo juicio explicaría una decisión distinta de la tomada.
   · El censo guarda EJEMPLOS con tope, no el universo: si un proceso murió en
     la ingesta y no está entre los ejemplos, se dice `descartado_probablemente`
     con los motivos que SÍ dispararon — jamás se afirma un motivo que no
     conste. Distinguir «lo sé» de «es lo más probable» es la regla de la casa.
   · La búsqueda es por TEXTO NORMALIZADO sobre referencia, nombre, objeto,
     id y NIT. Sin acentos y sin distinguir mayúsculas, porque quien busca
     copia del portal.
   ========================================================================== */
"use strict";

const { norm } = require("./semantica.js");

const MAX_RESULTADOS = 20;

function textoBuscable(r) {
  return norm([
    r.referencia_del_proceso, r.nombre_del_procedimiento, r.descripci_n_del_procedimiento,
    r.entidad, r.nit_entidad, r.id_del_proceso, r[":id"],
  ].filter(Boolean).join(" "));
}

function textoBuscableFicha(f) {
  return norm([f.referencia, f.id_proceso, f.entidad, f.objeto].filter(Boolean).join(" "));
}

function fichaDeFila(r) {
  return {
    referencia: r.referencia_del_proceso || r.nombre_del_procedimiento || null,
    id_proceso: r.id_del_proceso || r[":id"] || null,
    entidad: r.entidad || null,
    modalidad: r.modalidad_de_contratacion || null,
    estado: r.estado_del_procedimiento || null,
    fase: r.fase || null,
    publicado: r.fecha_de_publicacion_del || null,
    cierre: r.fecha_cierre || null,
    cuantia_cop: r.cuantia_cop ?? null,
    objeto: r.descripci_n_del_procedimiento || null,
    url: r.urlproceso || null,
  };
}

/* `evaluar(fila)` → { rup, puertas, visible } lo inyecta quien llama (el
   handler ya tiene el perfil, el conocimiento y las opciones vigentes). */
/* `censos` = [{origen, censo}]. Son DOS —el de la full y el del delta— y hay
   que mirar los dos: un proceso que tiró la carga completa no tiene por qué
   estar en el censo del último delta, y quedarse con uno solo respondería
   «no consta» sobre un descarte que sí consta. `censo` suelto se admite por
   comodidad de las pruebas. */
function rastrear(consulta, { filas = [], censo = null, censos = null, evaluar = null, max = MAX_RESULTADOS } = {}) {
  const listaCensos = censos && censos.length ? censos : (censo ? [{ origen: null, censo }] : []);
  const q = norm(String(consulta || "")).trim();
  if (q.length < 3) {
    return { ok: false, error: "escriba al menos 3 caracteres (referencia, entidad, NIT o parte del objeto)" };
  }

  /* ---- 1 y 2 · ¿está en el corpus? ---- */
  const enCorpus = filas.filter((r) => textoBuscable(r).includes(q)).slice(0, max);
  const resultados = enCorpus.map((r) => {
    const ficha = fichaDeFila(r);
    if (!evaluar) return { ...ficha, donde: "en_corpus", explicacion: "está guardado; no se evaluó el juicio" };
    const v = evaluar(r);
    if (v && v.visible) {
      return { ...ficha, donde: "servido", explicacion: "la app lo sirve a este perfil" };
    }
    const rup = v && v.rup;
    const puertas = v && v.puertas;
    // el paso exacto en el que muere, con la MISMA explicación del juicio
    /* `evaluarRup` publica su explicación en `motivo` («UNSPSC fuera del RUP y
       el objeto no confirma que sea obra», «capacidad insuficiente»…). Se usa
       TAL CUAL: reescribirla aquí sería una segunda redacción de la misma
       decisión, y las dos divergirían. Si el objeto sí pasó y lo que falla es
       una puerta, se dice cuál — con el mensaje que la propia puerta publica. */
    let motivo = "no pasa el juicio para este perfil";
    if (rup && rup.motivo) motivo = rup.motivo;
    if (puertas) {
      for (const [clave, etiqueta] of [["p1_rup", "registro de proponente"], ["p2_k", "capacidad de facturar"], ["p3_caja", "caja"]]) {
        const p = puertas[clave];
        if (p && p.pasa === false) { motivo = p.mensaje || `no pasa la puerta de ${etiqueta}`; break; }
      }
    }
    return {
      ...ficha, donde: "en_corpus", explicacion: motivo,
      tier: rup && rup.tier ? rup.tier : null,
      pertinencia: rup && rup.pertinencia ? rup.pertinencia.nivel : null,
    };
  });

  /* ---- 3 · ¿lo tiró la ingesta? ---- */
  const enCenso = [];
  const motivosVistos = new Set();
  for (const { origen, censo: c } of listaCensos) {
    if (!c || !c.ejemplos) continue;
    for (const [motivo, lista] of Object.entries(c.ejemplos)) {
      if (((c.por_motivo || {})[motivo] || 0) > 0) motivosVistos.add(motivo);
      for (const f of lista || []) {
        if (textoBuscableFicha(f).includes(q)) enCenso.push({ ...f, donde: "descartado_en_ingesta", motivo, origen });
      }
    }
  }

  if (resultados.length || enCenso.length) {
    return {
      ok: true, consulta: String(consulta), encontrados: resultados.length + enCenso.length,
      resultados: [...resultados, ...enCenso.slice(0, max)],
      // el censo guarda ejemplos con tope: lo que no está entre ellos no se
      // puede afirmar, y decirlo es parte de la respuesta
      nota_censo: listaCensos.length ? "los descartes de ingesta se buscan sobre los EJEMPLOS guardados, no sobre todo lo leído" : null,
    };
  }

  /* ---- 4 · no consta en ninguno de los dos sitios ---- */
  return {
    ok: true, consulta: String(consulta), encontrados: 0, resultados: [],
    donde: "no_consta",
    /* NO se afirma que el proceso no exista: este módulo no ha mirado SECOP II.
       Se afirma exactamente lo que se sabe —que la app no lo tiene— y se dice
       el siguiente paso. */
    explicacion: "la app no lo tiene guardado y tampoco figura entre los ejemplos de descarte de la ingesta. "
      + "Eso NO quiere decir que no exista en SECOP II: quiere decir que la app no lo ha leído todavía, "
      + "o que se descartó y su ficha no quedó entre los ejemplos guardados.",
    siguiente_paso: "relanzar /api/procesos?op=sync&modo=full una vez y volver a consultar; "
      + "si sigue sin constar, mirar `censo_ingesta.por_motivo` para ver qué regla está tirando volumen.",
    motivos_activos_en_la_ingesta: [...motivosVistos],
  };
}

module.exports = { rastrear, fichaDeFila, textoBuscable, MAX_RESULTADOS };
