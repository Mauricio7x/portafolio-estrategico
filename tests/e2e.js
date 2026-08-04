/* ============================================================================
   tests/e2e · Ciclo completo sin red externa (este entorno no alcanza
   datos.gov.co): mock HTTP de Socrata + mock HTTP del REST de Upstash,
   ejercitando los HANDLERS REALES de /api de punta a punta.

     node tests/e2e.js            → 4 iteraciones (requisito del encargo)
     node tests/e2e.js 1          → 1 iteración (desarrollo)
     DUMP=1 node tests/e2e.js 1   → además imprime los VALORES REALES de los
                                    casos de borde del detalle de competencia
                                    (tabla f-bis), para re-verificarlos a ojo
                                    después de cualquier cambio

   Cada iteración:
     a. Limpia Redis (SCAN licitaciones:* + lock:sync → DEL) y verifica vacío.
     a'. /api/oportunidades sobre Redis vacío → 503 con sincronización disparada.
     a''. Candado ocupado → /api/sync responde enCurso:true sin romper nada.
     b. /api/sync?modo=full con presupuesto CORTO (fuerza varias invocaciones
        reanudables) + fallos 429/500 inyectados en el mock → termina, crea
        chunks, audita conteos por mes y libera el candado.
     c. /api/oportunidades?perfil=helder → resultados con campos de negocio,
        filtro RUP, estado abierto y modalidad competitiva verificados.
     c-bis. Corpus completo Helder: sin Contratación Directa, sin Adjudicado,
        sin suministros puros (capa anti-suministro); la instalación/montaje
        (verbo de obra) y los Convocado sí aparecen. Además:
        · los CUATRO falsos positivos de producción (impresión/fotocopia,
          alimentos, internet, cumpleaños — todos con UNSPSC del RUP) NO se
          sirven, aunque sí están GUARDADOS en Redis (ingesta ancha);
        · los falsos negativos sí: obra publicada por familia (tier "familia"),
          por segmento suelto y con el código ilegible (tier "texto");
        · la clase AFÍN todavía no se ve — aún no se ha aprendido nada.
     d. perfil=genesis&anticipo_min=25&cuantia_rango=medio&ordenar_por=puntaje
        → filtros aplicados y orden descendente verificado.
     d-bis. Consorcio: perfil=juntos y alias ?perfil=consorcio equivalentes;
        RUP del plural verificado (K = suma de integrantes).
     e. /api/sync/historico: protegido (sin token/token malo/sin variable),
        extracción reanudable de los 2 años anteriores con datos de
        adjudicación, y construcción automática de los TRES derivados:
        índice de competencia (tertiles verificados sobre 4 entidades mock:
        5, 8, 12 y 3 procesos), EQUIVALENCIAS funcionales (un único par supera
        los tres umbrales) y VOCABULARIO por familia. Reconstruir cada uno por
        separado no re-extrae nada.
     f. Orden por atractividad: baja → media → sin_dato → alta (default de la
        app), desempate por puntaje, filtro competencia_entidad, y la garantía
        de que /api/oportunidades no lee del histórico ni expone adjudicaciones.
     f-bis. /api/competencia-detalle: los procesos que sostienen el badge. La
        invariante fuerte es que el detalle RECONSTRUYE el índice publicado
        (mismo conteo, mismo promedio, mismo nivel) — si divergieran, no
        serviría para verificar nada. Más los bordes: 8 con oferentes + 2 sin
        dato, entidad bajo el mínimo, entidad inexistente, normalización con
        tildes y puntuación, tope de la lista, caché (y su invalidación al
        reconstruir el índice), varios meses, chunk corrupto y Redis caído.
        NOTA: del modal solo se verifica el CABLEADO (marcado, delegación del
        clic, las tres formas de cerrar, y que el token no viaje en la URL);
        no hay DOM en esta suite, así que su comportamiento visual no está
        cubierto y no se presenta como si lo estuviera.
        Además: la clase AFÍN pasa a verse por las equivalencias recién
        aprendidas, SIN volver a sincronizar (la promesa de separar ingesta de
        juicio, verificada de punta a punta).
     IDENTIDAD DE LA ENTIDAD (ago 2026), dos formas de confundir a dos
     entidades entre sí — las dos con prueba que falla sin la corrección:
       · un NIT NO identifica una entidad (las regionales publican con el de la
         matriz). El alias `nit:{NIT}` iba PRIMERO en la búsqueda, así que una
         entidad con su nombre bien escrito heredaba las cifras de su hermana.
         Ahora manda el nombre exacto y un alias ambiguo ni se publica.
       · la puntuación partía una entidad en dos: el índice agrupaba con `norm`
         y el detalle sin puntuación, de modo que «… - EAAA» y «… EAAA» se
         sumaban al contar (4 procesos) pero no al leer el hash (3). Una sola
         `claveCanonica` para las dos direcciones.

     Dos defectos de producción quedaron fijados por prueba (ago 2026):
       · badge «18.2 oferentes en 0 procesos»: el índice publicaba el promedio
         de entidades que NO se pueden clasificar (<5 procesos). Hay una unidad
         con 7 registros corruptos o escritos por la versión anterior, y la
         comprobación de punta a punta sobre una entidad de 3 procesos.
       · el panel encabezaba con «selección de accionista para constituir una
         sociedad de economía mixta»: sigue VISIBLE en /api/oportunidades (pasa
         la cascada con toda razón) y ya no puede encabezar los destacados.

     g-bis. /api/resumen (el dashboard): la invariante fuerte es que
        `totales.visibles` es EXACTAMENTE el `total` de /api/oportunidades y el
        `embudo.visibles` del diagnóstico — si divergieran, el panel sería un
        segundo cálculo. Además: cada reparto (pertinencia, modalidad, cuantía,
        tier, competencia, urgencia, anticipo, departamento) suma los visibles;
        descartes + visibles = corpus activo; caché MISS→HIT verificada por la
        cabecera X-Cache; 401 sin token, 400 con perfil inventado, alias
        «consorcio», y corpus vacío (en el paso a-bis) con 200 y visibles = 0.
     g-ter. /api/admin/rup (carga de RUP por archivo): GET sin carga previa
        devuelve los valores del repositorio en el MISMO esquema que se sube
        (ciclo descargar→editar→subir cerrado, validado contra su propio
        validador); POST válido guarda los tres perfiles; 11 casos de
        validación con el campo exacto señalado (unspsc que no es arreglo,
        código de 7 dígitos, duplicados, liquidez 0, endeudamiento como
        porcentaje, tipo desconocido, plural que no es plural, NIT mal formado,
        sin perfiles, sin indicadores, sin profesionales) y un body que no es
        JSON; un rechazo NO pisa lo guardado. Integración: el RUP cargado manda
        —getPerfil/getUnspsc lo devuelven, el matching usa el código nuevo, más
        profesionales suben el factor CT y la K que sirve la app, el consorcio
        re-deriva la unión y sigue atado a sus integrantes— y borrar la
        configuración devuelve la app al respaldo con los números originales.
     g. Delta: fila nueva + cambio de estado a Adjudicado → la nueva aparece, la
        adjudicada desaparece del listado (reemplazo por :updated_at) y SE MUDA
        al histórico con su adjudicatario; la full de higiene no lo borra.
     h. La raíz sirve el HTML del frontend (gate + app) y app.js compila.
     i. (Documentado) Sin CLI de Vercel ni red: pruebas locales con mocks.
   ========================================================================== */
"use strict";

const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const assert = require("assert");

process.env.NODE_ENV = "production"; // silenciar logs de desarrollo en la corrida

/* ════════════════ dataset sintético determinista ════════════════ */
const ANO = new Date(Date.now() - 5 * 3600e3).getUTCFullYear();
const MESES = (() => {
  const mFin = new Date(Date.now() - 5 * 3600e3).getUTCMonth() + 1;
  return Array.from({ length: mFin }, (_, i) => `${ANO}-${String(i + 1).padStart(2, "0")}`);
})();

/* Fechas de CIERRE del corpus sintético, relativas a hoy (ago 2026).
   Antes eran `${mes}-25`, es decir, dentro del mes de publicación — y como el
   dataset abarca todo el año en curso, la mayoría quedaban en el PASADO. Eso
   era irreal (un proceso abierto tiene su cierre por delante) y desde que el
   reloj cierra procesos (`lib/filtros.cierre_vencido`) habría vaciado el
   corpus de prueba. Se fijan en el futuro para lo que debe estar abierto, y
   hay una constante aparte para el caso vencido, que es el del defecto. */
const iso = (ms) => new Date(ms).toISOString().slice(0, 10);
const CIERRE_FUTURO = `${iso(Date.now() + 30 * 86400e3)}T17:00:00.000`;
const CIERRE_FUTURO_2 = `${iso(Date.now() + 45 * 86400e3)}T17:00:00.000`;
const CIERRE_VENCIDO = `${iso(Date.now() - 60 * 86400e3)}T17:00:00.000`;

function generarDataset() {
  const filas = [];
  let n = 0;
  for (const mes of MESES) {
    for (let i = 0; i < 120; i++) {
      n++;
      const id = `row-${String(n).padStart(6, "0")}`;
      const tipo = i % 10;
      const f = {
        ":id": id,
        ":updated_at": `${mes}-05T12:00:00.000Z`, // viejo: no cae en el solape del delta
        id_del_proceso: `CO1.REQ.${n}`,
        referencia_del_proceso: `REF-${n}`,
        fecha_de_publicacion_del: `${mes}-10T08:00:00.000`,
        entidad: ["ALCALDÍA DE PURIFICACIÓN", "GOBERNACIÓN DEL TOLIMA", "IDU", "ALCALDÍA DE IBAGUÉ"][i % 4],
        ciudad_entidad: ["BOGOTÁ D.C.", "IBAGUÉ", "PURIFICACIÓN", "MEDELLÍN"][i % 4],
        departamento_entidad: ["Distrito Capital de Bogotá", "Tolima", "Tolima", "Antioquia"][i % 4],
        // modalidades: competitivas + no competitivas (deben filtrarse aunque
        // el objeto sea obra perfecta)
        modalidad_de_contratacion: i % 12 === 0 ? "Contratación directa"
          : i % 12 === 6 ? "Contratación régimen especial"
          : i % 3 ? "Licitación pública" : "Selección abreviada menor cuantía",
        // estados: cerrado (Adjudicado), abierto explícito (Convocado) y
        // Publicado. i%7 (coprimo con el i%4 de la cuantía): que los
        // Convocado caigan en cuantías variadas, no solo en las de 9 000 M
        estado_del_procedimiento: i % 8 === 7 ? "Adjudicado" : i % 7 === 3 ? "Convocado" : "Publicado",
        fase: "Presentación de ofertas",
        precio_base: String([60e6, 250e6, 800e6, 9e9][i % 4] + n),
        duracion: String(2 + (i % 6)), unidad_de_duracion: i % 2 ? "Meses" : "Días",
        respuestas_al_procedimiento: String(i % 20),
        urlproceso: { url: `https://community.secop.gov.co/Public/Tendering/OpportunityDetail/Index?noticeUID=CO1.NTC.${n}` },
        tipo_de_contrato: "Obra",
      };
      if (i % 5 === 0) f.fecha_de_recepcion_de = CIERRE_FUTURO;
      else if (i % 5 === 1) f.fecha_limite_de_recepcion_respuestas = CIERRE_FUTURO_2;
      // tipos de objeto: obra por código (helder/génesis/ambos), obra por texto,
      // blacklist y no-afines — para ejercitar todas las ramas del filtro RUP
      if (tipo <= 2) {
        f.nombre_del_procedimiento = `Construcción de placa huella sector ${n}`;
        f.descripci_n_del_procedimiento = `Obra civil de pavimentación rural, contempla anticipo del 30% del valor del contrato`;
        f.codigo_principal_de_categoria = "V1.72141000"; // en ambos RUP
      } else if (tipo === 3) {
        f.nombre_del_procedimiento = `Mantenimiento de vía terciaria tramo ${n}`;
        f.descripci_n_del_procedimiento = "Mejoramiento de la vía con placa huella. Sin anticipo.";
        f.codigo_principal_de_categoria = "V1.72154100"; // solo RUP Helder
      } else if (tipo === 4) {
        f.nombre_del_procedimiento = `Prestación de servicios de salud ocupacional ${n}`;
        f.descripci_n_del_procedimiento = "Servicios integrales de salud para funcionarios";
        f.codigo_principal_de_categoria = "V1.85101500"; // solo RUP Génesis
        // mitad con anticipo declarado BAJO el mínimo típico (10 < 25): el
        // filtro anticipo_min debe excluirlos de verdad, no vacuamente
        f.porcentaje_de_anticipo = i % 20 === 4 ? "10" : "25";
      } else if (tipo === 5) {
        f.nombre_del_procedimiento = `Adecuación de la sede educativa vereda ${n}`;
        f.descripci_n_del_procedimiento = "Remodelación y reforzamiento del aula múltiple"; // obra por TEXTO
        // sin código UNSPSC a propósito
      } else if (tipo === 6) {
        f.nombre_del_procedimiento = `Adquisición de caninos antinarcóticos lote ${n}`;
        f.descripci_n_del_procedimiento = "Compra de semovientes caninos con adiestramiento";
        f.codigo_principal_de_categoria = "V1.72141000"; // blacklist gana aunque el código sea de obra
      } else if (tipo === 7) {
        f.nombre_del_procedimiento = `Suministro de alimentación escolar PAE ${n}`;
        f.descripci_n_del_procedimiento = "Paquetes alimentarios para instituciones educativas";
      } else if (tipo === 8) {
        f.nombre_del_procedimiento = `Renovación de licencias de software ofimático ${n}`;
        f.descripci_n_del_procedimiento = "Adquisición de licencias microsoft para la entidad";
        f.codigo_principal_de_categoria = "V1.43231500"; // fuera de ambos RUP
      } else {
        // tipo 9: pareja ANTI-SUMINISTRO con el mismo código de mobiliario
        // (segmento 56, presente en el RUP de Helder): la compra pura debe
        // filtrarse; la instalación/montaje (verbo de obra) debe pasar.
        // Reparto por paridad de la DECENA de i → ambos casos existen en
        // TODOS los meses (también si la suite corre en enero). La compra
        // pura lleva cuantía 180 M a propósito: abierta, competitiva y
        // dentro del K de todos — si la capa fallara, SÍ se serviría (la
        // aserción negativa no puede pasar por razones ajenas a la capa).
        f.codigo_principal_de_categoria = "V1.56112000";
        if (Math.floor((i - 9) / 10) % 2 === 1) {
          f.nombre_del_procedimiento = `Suministro de mobiliario escolar ${n}`;
          f.descripci_n_del_procedimiento = "Compra de pupitres y sillas para sedes educativas";
          f.precio_base = "180000000";
        } else {
          f.nombre_del_procedimiento = `Instalación y montaje de mobiliario para aulas ${n}`;
          f.descripci_n_del_procedimiento = "Instalación de mobiliario escolar con obras de adecuación menores";
        }
      }
      /* FIXTURE DE LA PUERTA DE CAJA (P3). Sin él, P3 se prueba solo con
         objetos sintéticos y NINGÚN proceso del corpus la ejercita de punta a
         punta: la suite pasaría verde sin haber comprobado nunca que la puerta
         nueva filtra algo de verdad en el endpoint.
         2.500 M, obra en el RUP de ambos y SIN anticipo:
           · financiación estimada = 20 % de 2.500 M = 500 M
           · patrimonio de Génesis  = 211 M   → P3 CIERRA
           · patrimonio de Helder   = 1.107 M → P3 abre
         y 2.500 M queda bajo el tope estratégico de Génesis (2.000 SMMLV ≈
         3.502 M) y bajo su K, así que llega vivo hasta P3: es la única puerta
         que puede matarlo. */
      if (i === 11) {
        f.nombre_del_procedimiento = `Construcción de puente vehicular sobre el río ${n}`;
        f.descripci_n_del_procedimiento = "Obra civil de construcción de puente vehicular. No se pagará anticipo.";
        f.codigo_principal_de_categoria = "V1.72141000";
        f.precio_base = "2500000000";
        f.duracion = "10"; f.unidad_de_duracion = "Meses";
        f.modalidad_de_contratacion = "Licitación pública";
        f.estado_del_procedimiento = "Publicado";
        delete f.porcentaje_de_anticipo;
      }
      /* DEFECTO DE PRODUCCIÓN (ago 2026), reproducido tal cual se reportó:
         «INVITACION PRIVADA EDUH-Turbo», objeto de optimización de
         alcantarillado, fecha límite 20/02/2026 — ya adjudicado y aún servido
         como abierto seis meses después. Dos reglas tienen que matarlo, y se
         prueban POR SEPARADO (i === 13 lleva las dos; i === 17 solo la fecha),
         porque si solo se comprobara el caso combinado bastaría con que una de
         las dos funcionara para que la prueba pasara. */
      if (i === 13) {
        f.nombre_del_procedimiento = `INVITACION PRIVADA EDUH-Turbo ${n}`;
        f.descripci_n_del_procedimiento = "LA OPTIMIZACION DE LOS SISTEMAS DE ALCANTARILLADO DEL MUNICIPIO";
        f.codigo_principal_de_categoria = "V1.72141000"; // objeto y código impecables: solo la modalidad y el reloj lo delatan
        f.modalidad_de_contratacion = "Invitación Privada";
        f.estado_del_procedimiento = "Publicado"; // el corpus lo conserva abierto
        f.precio_base = "800000000";
        f.fecha_de_recepcion_de = CIERRE_VENCIDO;
      } else if (i === 17) {
        // MISMO objeto y modalidad competitiva: lo único que lo cierra es el reloj
        f.nombre_del_procedimiento = `Optimización de sistemas de alcantarillado con fecha vencida ${n}`;
        f.descripci_n_del_procedimiento = "Obra civil de optimización de las redes de alcantarillado del municipio";
        f.codigo_principal_de_categoria = "V1.72141000";
        f.modalidad_de_contratacion = "Licitación pública";
        f.estado_del_procedimiento = "Publicado";
        f.precio_base = "800000000";
        f.fecha_de_recepcion_de = CIERRE_VENCIDO;
      }
      filas.push(f);
    }
    filas.push(...extrasDelMes(mes));
  }
  return filas;
}

/* Casos que reproducen fallos reales de producción (una tanda por mes):
     1-2. CONVENIOS publicados bajo modalidad competitiva → NO deben salir.
     3.   Obra legítima que menciona un convenio de pasada → SÍ debe salir
          (guarda contra el falso positivo de excluir por la palabra suelta).
     4.   Obra con UNSPSC a nivel de PRODUCTO (72141015) dentro de una clase
          que sí está en el RUP (72141000) → SÍ debe salir. Con la comparación
          exacta de 8 dígitos anterior, este proceso era invisible.

   FALSOS POSITIVOS confirmados en producción (código del RUP + objeto ajeno).
   Los cinco tienen modalidad competitiva, estado abierto y cuantía dentro del
   K de todos los perfiles: si la capa de PERTINENCIA fallara, se servirían de
   verdad — las aserciones negativas no pueden pasar vacuamente.
     5.   Impresión y fotocopia        (80101600, en el RUP de Helder)
     6.   Suministro de alimentos      (80111600, en el RUP de Helder)
     7.   Internet dedicado            (80101600)
     8.   Cumpleaños del municipio     (80111600, logística de eventos)

   FALSOS NEGATIVOS que el matching jerárquico rescata:
     9.   Obra publicada a nivel de FAMILIA (72140000): el prefijo de 6 dígitos
          la leía como «clase 721400», inexistente, y la tiraba.
     10.  Obra publicada solo con el SEGMENTO (72000000): no basta por sí sola,
          la confirma el objeto → tier "texto".
     11.  Obra con el código ILEGIBLE (número de 10 dígitos): el `\d{8}` viejo
          fabricaba un código falso a partir de él; ahora se descarta y el
          objeto la rescata.
     12.  Proceso de una clase AFÍN (80141600) sin vocabulario de obra: solo
          puede entrar por las equivalencias aprendidas del histórico.

   Lo que destapó el diagnóstico REAL sobre producción (ago 2026):
     13-14. OBJETOS GENÉRICOS: el «objeto» es el nombre del trámite y su código
          interno («CONVOCATORIA PUBLICA», «CONCURSO DE MERITOS INV-CM-001»).
          No describen nada, no hay forma de juzgarlos → fuera.
     15.  INTERNET: bloqueante aunque el objeto hable de instalar y canalizar
          redes. La regla normal (término ajeno + CERO verbos de obra) no lo
          alcanzaba.
     16.  RUTA DE TEXTO DÉBIL: sin código utilizable y sin vocabulario claro de
          obra. Fuera por defecto; vuelve con ?incluir_sin_unspsc=1. */
const EXTRAS_POR_MES = 19;
const CLASE_AFIN = "80141600";   // fuera de los dos RUP; afín a 72141000 en el histórico
let _seqExtra = 0;
function extrasDelMes(mes) {
  const base = (n, extra) => ({
    ":id": `extra-${mes}-${n}`, ":updated_at": `${mes}-06T12:00:00.000Z`,
    id_del_proceso: `CO1.EXTRA.${mes}.${n}`, referencia_del_proceso: `REF-EXTRA-${mes}-${n}`,
    fecha_de_publicacion_del: `${mes}-12T08:00:00.000`,
    entidad: "ALCALDÍA DE PURIFICACIÓN", ciudad_entidad: "PURIFICACIÓN", departamento_entidad: "Tolima",
    modalidad_de_contratacion: "Licitación pública",
    estado_del_procedimiento: "Publicado", fase: "Presentación de ofertas",
    precio_base: "250000000", duracion: "6", unidad_de_duracion: "Meses",
    respuestas_al_procedimiento: "2", tipo_de_contrato: "Obra",
    urlproceso: { url: `https://community.secop.gov.co/extra/${mes}/${n}` },
    ...extra,
  });
  _seqExtra++;
  return [
    base(1, {
      // el caso del reporte: convenio colado por «Régimen Especial (con ofertas)»
      modalidad_de_contratacion: "Contratación régimen especial (con ofertas)",
      nombre_del_procedimiento: `AUNAR ESFUERZOS TÉCNICOS; ADMINISTRATIVOS Y FINANCIEROS PARA EL MEJORAMIENTO DE VÍAS ${_seqExtra}`,
      descripci_n_del_procedimiento: "Convenio para el mejoramiento de la malla vial del municipio",
      codigo_principal_de_categoria: "V1.72141000",
    }),
    base(2, {
      nombre_del_procedimiento: `CONVENIO INTERADMINISTRATIVO PARA LA CONSTRUCCIÓN DE PLACA HUELLA ${_seqExtra}`,
      descripci_n_del_procedimiento: "Construcción de placa huella en zona rural",
      codigo_principal_de_categoria: "V1.72141000",
    }),
    base(3, {
      nombre_del_procedimiento: `Construcción de placa huella vereda El Cairo ${_seqExtra}`,
      descripci_n_del_procedimiento: "Obra ejecutada en el marco del convenio interadministrativo 123 de 2025, incluye suministro de materiales",
      codigo_principal_de_categoria: "V1.72141000",
    }),
    base(4, {
      nombre_del_procedimiento: `Mejoramiento de vía terciaria con producto UNSPSC específico ${_seqExtra}`,
      descripci_n_del_procedimiento: "Obra civil de mejoramiento vial con pavimentación",
      codigo_principal_de_categoria: "V1.72141015", // producto de la clase 721410 (RUP: 72141000)
    }),

    /* ---- falsos positivos: UNSPSC del RUP con objeto que NO es obra ---- */
    base(5, {
      nombre_del_procedimiento: `PRESTACION DE SERVICIOS DE IMPRESIÓN Y FOTOCOPIA ${_seqExtra}`,
      descripci_n_del_procedimiento: "Servicio de reprografía para las dependencias de la alcaldía",
      codigo_principal_de_categoria: "V1.80101600",
    }),
    base(6, {
      nombre_del_procedimiento: `SUMINISTRO DE ALIMENTOS PARA PREPARAR RACIONES ${_seqExtra}`,
      descripci_n_del_procedimiento: "Entrega de mercados para la población vulnerable",
      codigo_principal_de_categoria: "V1.80111600",
    }),
    base(7, {
      nombre_del_procedimiento: `PRESTACIÓN DEL SERVICIO DE INTERNET DEDICADO ${_seqExtra}`,
      descripci_n_del_procedimiento: "Canal dedicado para las sedes administrativas",
      codigo_principal_de_categoria: "V1.80101600",
    }),
    base(8, {
      nombre_del_procedimiento: `APOYO LOGISTICO PARA EL CUMPLEAÑOS DEL MUNICIPIO ${_seqExtra}`,
      descripci_n_del_procedimiento: "Tarima, sonido y logística para la celebración",
      codigo_principal_de_categoria: "V1.80111600",
    }),

    /* ---- falsos negativos que el matching jerárquico rescata ---- */
    base(9, {
      nombre_del_procedimiento: `Construcción de puente vehicular publicado por familia ${_seqExtra}`,
      descripci_n_del_procedimiento: "Obra civil de puente en concreto reforzado",
      codigo_principal_de_categoria: "V1.72140000", // FAMILIA, no clase
    }),
    base(10, {
      nombre_del_procedimiento: `Rehabilitación de vía urbana publicada por segmento ${_seqExtra}`,
      descripci_n_del_procedimiento: "Obra de rehabilitación vial con pavimento asfáltico",
      codigo_principal_de_categoria: "V1.72000000", // SEGMENTO suelto
    }),
    base(11, {
      nombre_del_procedimiento: `Pavimentación de andenes con código ilegible ${_seqExtra}`,
      descripci_n_del_procedimiento: "Obra de urbanismo y espacio público en el casco urbano",
      codigo_principal_de_categoria: "1234567890", // 10 dígitos: no es un UNSPSC
    }),
    base(12, {
      // sin una sola palabra de obra: solo las equivalencias pueden rescatarlo
      nombre_del_procedimiento: `Gestion tecnica y administrativa del proyecto fase II ${_seqExtra}`,
      descripci_n_del_procedimiento: "Acompañamiento profesional al proyecto municipal",
      codigo_principal_de_categoria: `V1.${CLASE_AFIN}`,
    }),

    /* ---- lo que el diagnóstico REAL destapó (ago 2026) ---- */
    base(13, {
      // objeto genérico: el «objeto» es el nombre del trámite
      nombre_del_procedimiento: "CONVOCATORIA PUBLICA",
      descripci_n_del_procedimiento: "",
      codigo_principal_de_categoria: "V1.72141000",
    }),
    base(14, {
      // objeto genérico: trámite + código interno
      nombre_del_procedimiento: `CONCURSO DE MERITOS INV-CM-00${_seqExtra}-2026`,
      descripci_n_del_procedimiento: "",
      codigo_principal_de_categoria: "V1.72151000",
    }),
    base(15, {
      // internet: BLOQUEANTE aunque el objeto hable de instalar y canalizar
      nombre_del_procedimiento: `PRESTACION DEL SERVICIO DE INTERNET DEDICADO ${_seqExtra}`,
      descripci_n_del_procedimiento: "Incluye la instalación y canalización de redes en las sedes",
      codigo_principal_de_categoria: "V1.80101600",
    }),
    base(16, {
      // ruta de TEXTO sin pertinencia verde: fuera por defecto, dentro con el
      // toggle. Sin código y sin un solo verbo de obra; entra al tier "texto"
      // solo porque comparte 3 términos genéricos con el vocabulario de la
      // familia 7212 (institucion, educativa, sede) — exactamente la fuga que
      // metía servicios y equipos en el listado real.
      nombre_del_procedimiento: `Servicio integral para la institucion educativa sede principal ${_seqExtra}`,
      descripci_n_del_procedimiento: "Atencion de las necesidades de la institucion durante la vigencia",
      // código de servicios educativos: entra a la ingesta (segmento 86) pero
      // NO está en el RUP de Helder, así que el único camino era el texto
      codigo_principal_de_categoria: "V1.86101700",
    }),
    /* ---- defecto de producción (ago 2026): lo que encabezaba el panel ---- */
    base(17, {
      /* «Seleccionar accionista para constituir una entidad mixta que
         construya…» PASA la cascada entera con toda razón: es competitivo, tiene
         un UNSPSC del RUP y su objeto habla de construir. Pero no es un contrato
         de obra al que este dueño pueda presentarse — se busca un SOCIO que
         ponga capital. Cuantía alta y entidad de competencia BAJA a propósito:
         sin el filtro de estructuración, encabeza «los 10 más atractivos».
         Debe seguir SIENDO VISIBLE en /api/oportunidades (ahí el dueño lo juzga
         con la tarjeta delante) y NO puede aparecer en los destacados. */
      nombre_del_procedimiento: `SELECCION DE ACCIONISTA PARA CONSTITUIR UNA SOCIEDAD DE ECONOMIA MIXTA ${_seqExtra}`,
      descripci_n_del_procedimiento: "Vinculación de un socio estratégico que aporte capital para construir y operar la infraestructura del acueducto municipal",
      codigo_principal_de_categoria: "V1.72141000",
      precio_base: "900000000",
    }),
    base(18, {
      /* Obra normal de una entidad con SOLO 3 procesos en el histórico. En el
         dataset general ALCALDÍA DE IBAGUÉ siempre cae en la cuantía de
         9 000 M —se va por el tope y nunca se ve—, así que sin esta fila no
         habría ninguna tarjeta de una entidad por debajo del mínimo y el
         defecto del badge no se podría comprobar de punta a punta. */
      entidad: "ALCALDÍA DE IBAGUÉ", ciudad_entidad: "IBAGUÉ",
      nombre_del_procedimiento: `Construcción de placa huella en zona rural de Ibagué ${_seqExtra}`,
      descripci_n_del_procedimiento: "Obra civil de placa huella con pavimentación en concreto",
      codigo_principal_de_categoria: "V1.72141000",
      precio_base: "300000000",
    }),
    base(19, {
      /* ESTADO «Activo» de punta a punta. El caso unitario prueba que
         `estado_abierto` lo clasifica bien; esta fila prueba lo que de verdad
         importaba: que la FULL lo ingiere y que llega a la pantalla. Es donde
         se descartaba en silencio — el filtro de estado corre en la INGESTA
         (`lib/proyeccion.transformar` excluye de origen lo que no está
         abierto), así que un proceso «Activo» no es que se filtrara al
         servirlo: nunca entraba a Redis, y por eso el arreglo exige una full.
         Va con fase «Selección», que tampoco está en ninguna de las dos listas:
         así el proceso depende ÚNICAMENTE de que «activo» esté en la lista. */
      nombre_del_procedimiento: `Construcción de puente vehicular con estado Activo ${_seqExtra}`,
      descripci_n_del_procedimiento: "Obra civil de puente en concreto reforzado sobre la quebrada",
      codigo_principal_de_categoria: "V1.72141000",
      estado_del_procedimiento: "Activo", fase: "Selección",
      precio_base: "400000000",
    }),
  ];
}

/* ════════════════ dataset histórico (2 años anteriores) ════════════════
   Cuatro entidades con distinta presión competitiva, diseñadas para caer una
   en cada tertil (y una por debajo del mínimo de procesos):
     ALCALDÍA DE PURIFICACIÓN   5 procesos · promedio  3 oferentes → "baja"
     GOBERNACIÓN DEL TOLIMA     8 procesos · promedio  8 oferentes → "media"
     IDU                       12 procesos · promedio 18 oferentes → "alta"
     ALCALDÍA DE IBAGUÉ         3 procesos (<5)                    → "sin_dato"
   Las cuatro existen también en el dataset del año vigente, así que el orden
   por atractividad tiene los cuatro grupos. El nº de oferentes viaja SOLO en
   `numero_de_ofertas`: si la proyección histórica no conservara esa columna,
   el índice quedaría vacío y estas pruebas fallarían. */
const ANOS_HIST = [ANO - 2, ANO - 1];
const MESES_HIST = ANOS_HIST.flatMap((y) => Array.from({ length: 12 }, (_, i) => `${y}-${String(i + 1).padStart(2, "0")}`));
const ENTIDADES_HIST = [
  { entidad: "ALCALDÍA DE PURIFICACIÓN", nit: "800100001", ofertas: [2, 3, 3, 4, 3] },
  { entidad: "GOBERNACIÓN DEL TOLIMA", nit: "800100002", ofertas: [7, 8, 9, 8, 7, 9, 8, 8] },
  { entidad: "IDU", nit: "800100003", ofertas: [16, 17, 18, 19, 18, 17, 20, 18, 19, 17, 18, 19] },
  { entidad: "ALCALDÍA DE IBAGUÉ", nit: "800100004", ofertas: [1, 2, 1] },
];
const PROMEDIO_ESPERADO = { "ALCALDÍA DE PURIFICACIÓN": 3, "GOBERNACIÓN DEL TOLIMA": 8, "IDU": 18 };

/* ---- IDENTIDAD DE ENTIDAD: los dos defectos de ago 2026 ----
   Las cuatro entradas van DEBAJO del mínimo de 5 procesos a propósito: así
   ejercitan la identidad de la entidad sin tocar los tertiles (solo entran en
   el reparto las entidades clasificables, y estas no lo son). Si alguna llegara
   a 5, los cortes se recalcularían y IDU dejaría de ser «alta».

   · NIT COMPARTIDO: dos regionales del mismo organismo publican con el NIT de
     la matriz. El alias `nit:{NIT}` solo puede apuntar a una, y la otra
     heredaba sus cifras. Se distinguen por el CONTEO (3 vs 4): con el alias
     mandando, al menos una de las dos consultas devuelve el número de su
     hermana, sea cual sea el orden en que se escribieron.
   · GUION: la MISMA entidad escrita de dos formas que solo difieren en la
     puntuación. El índice las separaba (2 y 2, ninguna llega al mínimo) y el
     detalle las sumaba (4): el badge y el detalle hablaban de conjuntos
     distintos. Con la clave canónica son una sola, con 4 procesos. */
const NIT_COMPARTIDO = "899999074";
const AEROCIVIL_NORTE = "AEROCIVIL REGIONAL NORTE";
const AEROCIVIL_SUR = "AEROCIVIL REGIONAL SUR";
const NIT_GUION = "800100006";
const ENTIDAD_GUION = "EMPRESA DE ACUEDUCTO Y ALCANTARILLADO - EAAA";
const ENTIDAD_GUION_SIN = "EMPRESA DE ACUEDUCTO Y ALCANTARILLADO EAAA";
const CLASE_IDENTIDAD = "72151000"; // fuera de la clase A de las equivalencias
const ENTIDADES_HIST_IDENTIDAD = [
  { entidad: AEROCIVIL_NORTE, nit: NIT_COMPARTIDO, ofertas: [1, 1, 2], codigo: CLASE_IDENTIDAD },
  { entidad: AEROCIVIL_SUR, nit: NIT_COMPARTIDO, ofertas: [25, 28, 30, 26], codigo: CLASE_IDENTIDAD },
  // 3 + 1, no 2 + 2, y el reparto importa: así la grafía CON guion es la
  // dominante y `nombreOriginal` es predecible. Con 2 + 2 el desempate lo
  // decide el orden del corpus y la prueba pasaría o fallaría por azar.
  { entidad: ENTIDAD_GUION, nit: NIT_GUION, ofertas: [4, 5, 6], codigo: CLASE_IDENTIDAD },
  { entidad: ENTIDAD_GUION_SIN, nit: NIT_GUION, ofertas: [7], codigo: CLASE_IDENTIDAD },
];
// 4 canónicas + NORTE + SUR + la del guion ya FUSIONADA en una sola entidad
const ENTIDADES_EN_INDICE = ENTIDADES_HIST.length + 3;

/* ---- bloque para las EQUIVALENCIAS FUNCIONALES ----
   Objetivo: que el par (72141000 → 80141600) supere los tres umbrales
   (lift ≥ 3, soporte ≥ 20 procesos en la clase inscrita, ≥ 5 adjudicatarios
   en la intersección) y que NINGÚN otro par los supere.

     · NITS_AFINES adjudicatarios ganan en las DOS clases          → intersección
     · NITS_RELLENO adjudicatarios ganan solo en otra clase del RUP → bajan P(B)
       y con ello suben el lift: lift = total_NITs / |ganadores de A|

   Estos procesos NO traen columna de oferentes a propósito: así el índice de
   competencia los cuenta como «sin dato» y las cuatro entidades del test
   siguen dando exactamente los mismos tertiles. */
const CLASE_AFIN_HIST = "80141600";  // fuera de los dos RUP
const NITS_AFINES = 6;               // > el mínimo de 5 adjudicatarios
const NITS_RELLENO = 80;             // 34 ganadores en A sobre 114 NITs → lift ≈ 3,35
const HIST_EQUIVALENCIAS = NITS_AFINES * 2 + NITS_RELLENO;

function generarDatasetEquivalencias() {
  const filas = [];
  const fila = (i, clase, nit) => ({
    ":id": `eqv-${String(i).padStart(4, "0")}`,
    ":updated_at": `${MESES_HIST[i % MESES_HIST.length]}-20T10:00:00.000Z`,
    id_del_proceso: `CO1.EQV.${i}`, referencia_del_proceso: `REF-EQV-${i}`,
    fecha_de_publicacion_del: `${MESES_HIST[i % MESES_HIST.length]}-05T08:00:00.000`,
    entidad: "ENTIDAD SIN CONTEO DE OFERENTES", nit_entidad: "800100009",
    ciudad_entidad: "IBAGUÉ", departamento_entidad: "Tolima",
    modalidad_de_contratacion: "Licitación pública",
    estado_del_procedimiento: "Adjudicado", fase: "Adjudicación", adjudicado: "Si",
    precio_base: String(150e6 + i), duracion: "6", unidad_de_duracion: "Meses",
    nombre_del_procedimiento: `Construcción de obra adjudicada ${i}`,
    descripci_n_del_procedimiento: "Obra civil ya ejecutada",
    codigo_principal_de_categoria: `V1.${clase}`, tipo_de_contrato: "Obra",
    nombre_del_proveedor: `CONSTRUCTORA EQV ${nit} SAS`,
    nit_del_proveedor_adjudicado: nit,
    valor_total_adjudicacion: String(140e6 + i),
    fecha_adjudicacion: `${MESES_HIST[i % MESES_HIST.length]}-25T10:00:00.000`,
    urlproceso: { url: `https://community.secop.gov.co/eqv/${i}` },
  });
  let i = 0;
  for (let k = 0; k < NITS_AFINES; k++) {
    const nit = `90200000${k}`;
    filas.push(fila(i++, "72141000", nit));      // clase inscrita en los dos RUP
    filas.push(fila(i++, CLASE_AFIN_HIST, nit)); // clase afín, fuera de los RUP
  }
  for (let k = 0; k < NITS_RELLENO; k++) filas.push(fila(i++, "72151000", `90300${String(k).padStart(4, "0")}`));
  return filas;
}

/* ---- filas para /api/competencia-detalle ----
   Procesos ADJUDICADOS pero SIN conteo de oferentes. Dos propósitos:
     · GOBERNACIÓN DEL TOLIMA (8 con oferentes) suma 2 sin dato → el detalle
       debe mostrar 8 en la tabla principal y 2 en «excluidos»;
     · la CAR de nombre largo y con guion prueba la normalización (tildes,
       puntuación y espacios de más) y el caso «entidad que no está en el
       índice»: sin un solo proceso contable, no puede clasificarse.
   Como ninguno trae oferentes, el índice de competencia los ignora y los
   tertiles de las cuatro entidades siguen exactamente igual. */
const ENTIDAD_CAR = "CORPORACION AUTONOMA REGIONAL DE LAS CUENCAS DE LOS RIOS NEGRO - NARE";
const HIST_SIN_OFERENTES = [
  { entidad: "GOBERNACIÓN DEL TOLIMA", nit: "800100002", n: 2 },
  { entidad: ENTIDAD_CAR, nit: "800100005", n: 2 },
  // cerrado SIN ganador: ni cuenta para el promedio ni puede desaparecer sin
  // explicación — es el tercer motivo de exclusión
  { entidad: "GOBERNACIÓN DEL TOLIMA", nit: "800100002", n: 1, desierto: true },
];
const HIST_DETALLE = HIST_SIN_OFERENTES.reduce((a, e) => a + e.n, 0);

function generarDatasetDetalle() {
  const filas = [];
  let i = 0;
  for (const e of HIST_SIN_OFERENTES) {
    for (let k = 0; k < e.n; k++) {
      i++;
      const mes = MESES_HIST[(i * 7) % MESES_HIST.length];
      filas.push({
        ":id": `det-${String(i).padStart(4, "0")}`, ":updated_at": `${mes}-20T10:00:00.000Z`,
        id_del_proceso: `CO1.DET.${i}`, referencia_del_proceso: `REF-DET-${i}`,
        fecha_de_publicacion_del: `${mes}-05T08:00:00.000`,
        entidad: e.entidad, nit_entidad: e.nit,
        ciudad_entidad: "IBAGUÉ", departamento_entidad: "Tolima",
        modalidad_de_contratacion: "Licitación pública",
        estado_del_procedimiento: e.desierto ? "Declarado desierto" : "Adjudicado",
        fase: e.desierto ? "Declarado desierto" : "Adjudicación",
        ...(e.desierto ? {} : { adjudicado: "Si" }),
        precio_base: String(800e6 + i),
        duracion: "6", unidad_de_duracion: "Meses",
        nombre_del_procedimiento: e.desierto
          ? `Construccion de placa huella declarada desierta ${i}`
          : `Construccion de puente vehicular sin conteo de oferentes ${i}`,
        descripci_n_del_procedimiento: "Obra civil de puente en concreto reforzado",
        codigo_principal_de_categoria: "V1.72141000", tipo_de_contrato: "Obra",
        // SIN numero_de_ofertas a propósito: es el «sin dato» que hay que explicar
        ...(e.desierto ? {} : {
          nombre_del_proveedor: `CONSTRUCTORA DET ${i} SAS`,
          nit_del_proveedor_adjudicado: `90050${String(i).padStart(4, "0")}`,
          valor_total_adjudicacion: String(790e6 + i),
          fecha_adjudicacion: `${mes}-25T10:00:00.000`,
        }),
        urlproceso: { url: `https://community.secop.gov.co/det/${i}` },
      });
    }
  }
  return filas;
}

/* ---- bloque para la AUDITORÍA DE COBERTURA DEL RUP (ago 2026) ----
   Tres códigos que NO están en el RUP de Helder, elegidos para que cada uno
   caiga en una casilla distinta de la clasificación y ninguna prueba pase por
   casualidad:

     72131600 · 15 procesos · objeto IDÉNTICO al de la experiencia cargada
               (score 1.0) y segmento de obra pura → CRÍTICO.
     72132000 ·  3 procesos · un solo término en común de seis (score 0.167:
               moderado, por encima del 0.15 con el que se entra al análisis y
               por debajo del 0.20 de ALTO) y NINGUNO altamente similar → BAJO.
               Es el caso que distingue las dos lecturas posibles del encargo.
     85121700 ·  4 procesos · salud: score 0 → ni siquiera entra al análisis, y
               tiene que aparecer en «excluidos_por_baja_relevancia» con su
               motivo. Está en el RUP de Génesis y no en el de Helder, que es
               justo lo que hace que la auditoría dependa del perfil.

   Van SIN conteo de oferentes (como el bloque de equivalencias): así el índice
   de competencia los cuenta como «sin dato» y los tertiles de las cuatro
   entidades no se mueven ni un milímetro. Y con entidad propia, para no
   engordar los «excluidos» de ninguna entidad que el detalle ya audita.

   Los objetos NO llevan descripción a propósito: el score va calibrado al
   tercer decimal y cualquier palabra de más lo movería de casilla. */
const ENTIDAD_COBERTURA = "MUNICIPIO DE ALVARADO";
const COD_COB_CRITICO = "72131600";
const COD_COB_BAJO = "72132000";
const COD_COB_SALUD = "85121700";
const COBERTURA_BLOQUES = [
  { codigo: COD_COB_CRITICO, n: 15, nombre: "CONSTRUCCION DE PLACA HUELLA EN LA VEREDA EL PORVENIR", descripcion: "PAVIMENTACION RURAL" },
  { codigo: COD_COB_BAJO, n: 3, nombre: "REHABILITACION DE PUENTE PEATONAL SOBRE QUEBRADA GRANDE MUNICIPIO", descripcion: "" },
  { codigo: COD_COB_SALUD, n: 4, nombre: "PRESTACION DE SERVICIOS DE APOYO A LA GESTION EN SALUD OCUPACIONAL", descripcion: "" },
];
const HIST_COBERTURA = COBERTURA_BLOQUES.reduce((a, b) => a + b.n, 0);

function generarDatasetCobertura() {
  const filas = [];
  let i = 0;
  for (const b of COBERTURA_BLOQUES) {
    for (let k = 0; k < b.n; k++) {
      i++;
      const mes = MESES_HIST[(i * 3) % MESES_HIST.length];
      filas.push({
        ":id": `cob-${String(i).padStart(4, "0")}`, ":updated_at": `${mes}-18T10:00:00.000Z`,
        id_del_proceso: `CO1.COB.${i}`, referencia_del_proceso: `REF-COB-${i}`,
        fecha_de_publicacion_del: `${mes}-04T08:00:00.000`,
        entidad: ENTIDAD_COBERTURA, nit_entidad: "800100010",
        ciudad_entidad: "ALVARADO", departamento_entidad: "Tolima",
        modalidad_de_contratacion: "Licitación pública",
        estado_del_procedimiento: "Adjudicado", fase: "Adjudicación", adjudicado: "Si",
        precio_base: String(300e6 + i * 1e6),
        duracion: "6", unidad_de_duracion: "Meses",
        nombre_del_procedimiento: b.nombre,
        descripci_n_del_procedimiento: b.descripcion,
        codigo_principal_de_categoria: `V1.${b.codigo}`, tipo_de_contrato: "Obra",
        // SIN numero_de_ofertas: no pueden mover los tertiles del índice
        nombre_del_proveedor: `CONSTRUCTORA COB ${i} SAS`,
        nit_del_proveedor_adjudicado: `90040${String(i).padStart(4, "0")}`,
        valor_total_adjudicacion: String(290e6 + i),
        fecha_adjudicacion: `${mes}-26T10:00:00.000`,
        urlproceso: { url: `https://community.secop.gov.co/cob/${i}` },
      });
    }
  }
  return filas;
}

/* La experiencia REAL que se carga en las pruebas: tres contratos ejecutados
   con el vocabulario del oficio del dueño. El del CRÍTICO comparte con el
   primero todos sus términos; el del BAJO, exactamente uno. */
const CONTRATOS_EXPERIENCIA = [
  {
    no_contrato: "001-2024", entidad: "ALCALDIA MUNICIPAL DE PURIFICACION",
    objeto: "CONSTRUCCION DE PLACA HUELLA EN LA VEREDA EL PORVENIR DEL MUNICIPIO DE PURIFICACION",
    modalidad: "Licitacion publica", participacion: 100, valor_cop: 350000000,
    fecha_inicio: "2024-03-15", fecha_fin: "2024-09-15", valor_smmlv: 450.5,
  },
  {
    no_contrato: "014-2024", entidad: "GOBERNACION DEL TOLIMA",
    objeto: "MEJORAMIENTO Y PAVIMENTACION DE VIA TERCIARIA EN EL SECTOR RURAL",
    modalidad: "Seleccion abreviada", participacion: 60, valor_cop: 1200000000,
    fecha_inicio: "2024-06-01", fecha_fin: "2025-02-01", valor_smmlv: 1500,
  },
  {
    no_contrato: "007-2025", entidad: "ALCALDIA DE IBAGUE",
    objeto: "CONSTRUCCION DE ALCANTARILLADO SANITARIO PARA EL BARRIO CENTRO",
    modalidad: "Licitacion publica", participacion: 100, valor_cop: 800000000,
    fecha_inicio: "2025-01-20", fecha_fin: "2025-10-20", valor_smmlv: 900,
  },
];

function generarDatasetHistorico() {
  const filas = [];
  let n = 0;
  for (const e of [...ENTIDADES_HIST, ...ENTIDADES_HIST_IDENTIDAD]) {
    for (let i = 0; i < e.ofertas.length; i++) {
      n++;
      const mes = MESES_HIST[(n * 5) % MESES_HIST.length]; // repartidos por todo el rango
      filas.push({
        ":id": `hist-${String(n).padStart(4, "0")}`,
        ":updated_at": `${mes}-20T10:00:00.000Z`,
        id_del_proceso: `CO1.HIST.${n}`, referencia_del_proceso: `REF-HIST-${n}`,
        fecha_de_publicacion_del: `${mes}-05T08:00:00.000`,
        entidad: e.entidad, nit_entidad: e.nit,
        ciudad_entidad: "IBAGUÉ", departamento_entidad: "Tolima",
        modalidad_de_contratacion: "Licitación pública",
        estado_del_procedimiento: "Adjudicado", fase: "Adjudicación", adjudicado: "Si",
        precio_base: String(200e6 + n),
        duracion: "6", unidad_de_duracion: "Meses",
        nombre_del_procedimiento: `Construcción de placa huella histórica ${n}`,
        descripci_n_del_procedimiento: "Obra civil de pavimentación rural ya ejecutada",
        /* La clase va por fixture: los de IDENTIDAD usan 72151000 (la misma que
           el relleno de equivalencias) para no tocar el conteo de
           adjudicatarios de 72141000, que es la clase A del único par que
           debe superar los tres umbrales de lift/soporte/intersección. */
        codigo_principal_de_categoria: `V1.${e.codigo || "72141000"}`, tipo_de_contrato: "Obra",
        // columnas de adjudicación (nombres pendientes de verificación en vivo)
        numero_de_ofertas: String(e.ofertas[i]),
        nombre_del_proveedor: `CONSTRUCTORA HIST ${n} SAS`,
        nit_del_proveedor_adjudicado: `90010${String(n).padStart(4, "0")}`,
        valor_total_adjudicacion: String(190e6 + n),
        fecha_adjudicacion: `${mes}-25T10:00:00.000`,
        urlproceso: { url: `https://community.secop.gov.co/hist/${n}` },
      });
    }
  }
  return filas;
}

/* ════════════════ mock Socrata (SoQL mínimo) ════════════════ */
function crearMockSocrata() {
  let dataset = [];
  let contadorPeticiones = 0;
  let inyectarFallos = true;

  const cumple = (fila, clausula) => {
    const m = clausula.match(/^(\S+)\s*(>=|<=|>|<)\s*'(.*)'$/);
    if (!m) throw new Error(`mock: clausula no soportada: ${clausula}`);
    const [, campo, op, valor] = m;
    const v = String(fila[campo] ?? "");
    if (op === ">=") return v >= valor;
    if (op === "<=") return v <= valor;
    if (op === ">") return v > valor;
    return v < valor;
  };

  const server = http.createServer((req, res) => {
    setTimeout(() => { // latencia simulada: fuerza el corte por presupuesto
      contadorPeticiones++;
      if (inyectarFallos && contadorPeticiones % 29 === 3) {
        res.writeHead(429, { "Retry-After": "0.05" }); return res.end("rate limited");
      }
      if (inyectarFallos && contadorPeticiones % 37 === 5) {
        res.writeHead(500); return res.end("upstream error");
      }
      const u = new URL(req.url, "http://x");
      const q = Object.fromEntries(u.searchParams);
      let filas = dataset.slice();
      if (q.$where) filas = filas.filter((f) => q.$where.split(" AND ").every((c) => cumple(f, c.trim())));
      if ((q.$select || "").startsWith("count(*)")) {
        res.writeHead(200, { "Content-Type": "application/json" });
        return res.end(JSON.stringify([{ n: String(filas.length) }]));
      }
      filas.sort((a, b) => (a[":id"] < b[":id"] ? -1 : 1));
      const offset = parseInt(q.$offset, 10) || 0;
      const limit = parseInt(q.$limit, 10) || 1000;
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(filas.slice(offset, offset + limit)));
    }, 15);
  });

  return {
    server,
    setDataset: (d) => { dataset = d; },
    getDataset: () => dataset,
    setFallos: (v) => { inyectarFallos = v; },
    peticiones: () => contadorPeticiones,
  };
}

/* ════════════════ mock Upstash Redis REST ════════════════ */
function crearMockUpstash() {
  const datos = new Map();   // clave → valor
  const hashes = new Map();  // clave → Map(campo → valor)  (índice de competencia)
  const expiras = new Map(); // clave → ts de expiración
  const viva = (k) => {
    if (expiras.has(k) && Date.now() > expiras.get(k)) { datos.delete(k); expiras.delete(k); }
    return datos.has(k);
  };
  const globRe = (p) => new RegExp("^" + p.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*") + "$");

  function ejecutar(cmd) {
    const op = String(cmd[0]).toUpperCase();
    switch (op) {
      case "GET": return viva(cmd[1]) ? datos.get(cmd[1]) : null;
      case "SET": {
        const [, k, v, ...resto] = cmd;
        const nx = resto.map((x) => String(x).toUpperCase()).includes("NX");
        if (nx && viva(k)) return null;
        datos.set(k, String(v));
        const iEx = resto.map((x) => String(x).toUpperCase()).indexOf("EX");
        if (iEx >= 0) expiras.set(k, Date.now() + parseInt(resto[iEx + 1], 10) * 1000);
        else expiras.delete(k);
        return "OK";
      }
      case "DEL": {
        let borradas = 0;
        for (const k of cmd.slice(1)) {
          if (viva(k) || hashes.has(k)) borradas++;
          datos.delete(k); expiras.delete(k); hashes.delete(k);
        }
        return borradas;
      }
      case "MGET": return cmd.slice(1).map((k) => (viva(k) ? datos.get(k) : null));
      case "TTL": {
        const k = cmd[1];
        if (!viva(k) && !hashes.has(k)) return -2;          // no existe
        if (!expiras.has(k)) return -1;                      // sin expiración
        return Math.max(0, Math.ceil((expiras.get(k) - Date.now()) / 1000));
      }
      case "EXISTS": return viva(cmd[1]) || hashes.has(cmd[1]) ? 1 : 0;
      case "SCAN": {
        const iMatch = cmd.map((x) => String(x).toUpperCase()).indexOf("MATCH");
        const re = globRe(cmd[iMatch + 1]);
        const claves = [...datos.keys()].filter((k) => viva(k) && re.test(k))
          .concat([...hashes.keys()].filter((k) => re.test(k)));
        return ["0", claves];
      }
      /* ---- hashes: el índice de competencia por entidad ---- */
      case "HSET": {
        const [, k, ...resto] = cmd;
        const h = hashes.get(k) || new Map();
        for (let i = 0; i + 1 < resto.length; i += 2) h.set(String(resto[i]), String(resto[i + 1]));
        hashes.set(k, h);
        return Math.floor(resto.length / 2);
      }
      case "HGETALL": {
        const h = hashes.get(cmd[1]);
        if (!h) return [];
        const plano = [];
        for (const [f, v] of h) plano.push(f, v);
        return plano; // Upstash devuelve el array plano [campo, valor, …]
      }
      case "HGET": {
        const h = hashes.get(cmd[1]);
        return h && h.has(cmd[2]) ? h.get(cmd[2]) : null;
      }
      case "HLEN": return hashes.has(cmd[1]) ? hashes.get(cmd[1]).size : 0;
      case "RENAME": {
        const [, de, a] = cmd;
        if (hashes.has(de)) { hashes.set(a, hashes.get(de)); hashes.delete(de); return "OK"; }
        if (viva(de)) { datos.set(a, datos.get(de)); datos.delete(de); expiras.delete(de); return "OK"; }
        throw new Error("ERR no such key"); // como Redis: RENAME de clave inexistente falla
      }
      default: throw new Error(`mock redis: comando no soportado ${op}`);
    }
  }

  const server = http.createServer((req, res) => {
    let cuerpo = "";
    req.on("data", (c) => { cuerpo += c; });
    req.on("end", () => {
      try {
        const r = ejecutar(JSON.parse(cuerpo));
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ result: r }));
      } catch (e) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: String(e.message) }));
      }
    });
  });
  return { server, tamano: () => datos.size + hashes.size };
}

/* ════════════════ invocador de handlers estilo Vercel ════════════════
   `cabeceras` se recoge de verdad (no se tira): /api/resumen anuncia por
   `X-Cache` si sirvió de la caché, y sin capturarla no habría forma de
   distinguir un HIT de un MISS desde la prueba.
   `opciones.metodo` + `opciones.body` cubren el POST de /api/admin/rup;
   Vercel entrega el cuerpo ya parseado cuando el Content-Type es JSON, y el
   handler acepta además cadena y stream (se prueban las tres formas). */
function invocar(handler, urlStr, headers = {}, opciones = {}) {
  const u = new URL(urlStr, "http://app.local");
  const req = {
    url: urlStr, method: opciones.metodo || "GET",
    headers: { host: "app.local", "x-forwarded-proto": "https", ...headers },
    query: Object.fromEntries(u.searchParams),
  };
  if (opciones.body !== undefined) req.body = opciones.body;
  return new Promise((resolve, reject) => {
    const cabeceras = {};
    const res = {
      _status: 200,
      setHeader(k, v) { cabeceras[String(k).toLowerCase()] = String(v); },
      status(n) { this._status = n; return this; },
      json(o) { resolve({ status: this._status, cuerpo: o, cabeceras }); },
      send(b) { resolve({ status: this._status, cuerpo: b, cabeceras }); },
      end() { resolve({ status: this._status, cuerpo: null, cabeceras }); },
    };
    Promise.resolve(handler(req, res)).catch(reject);
  });
}
const invocarPost = (handler, urlStr, body, headers = {}) =>
  invocar(handler, urlStr, { "content-type": "application/json", ...headers }, { metodo: "POST", body });

const escuchar = (server) => new Promise((r) => server.listen(0, "127.0.0.1", () => r(server.address().port)));

/* Quita comentarios de un fuente antes de vigilarlo con expresiones regulares:
   varios comentarios CITAN a propósito el código defectuoso que explican, y una
   aserción que no los distinga acaba fallando por la explicación del arreglo. */
const sinComentarios = (fuente) => String(fuente)
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .replace(/^\s*\/\/.*$/gm, "");

/* ════════════════ pruebas ════════════════ */
async function main() {
  const objetivo = parseInt(process.argv[2], 10) || 4;
  const socrata = crearMockSocrata();
  const upstash = crearMockUpstash();
  const puertoSocrata = await escuchar(socrata.server);
  const puertoUpstash = await escuchar(upstash.server);

  process.env.SECOP_BASE_URL = `http://127.0.0.1:${puertoSocrata}/resource/p6dx-8zbt.json`;
  process.env.UPSTASH_REDIS_REST_URL = `http://127.0.0.1:${puertoUpstash}`;
  process.env.UPSTASH_REDIS_REST_TOKEN = "token-de-prueba";
  process.env.SECOP_PAGE = "50";       // páginas chicas → ejercita keyset multi-página
  process.env.SECOP_BACKOFF_MS = "10"; // backoff rápido en el mock
  process.env.HISTORICO_TOKEN = "token-historico-de-prueba";

  // requerir DESPUÉS de fijar el entorno (PAGE/backoff se leen al cargar)
  const sync = require("../api/sync.js");
  const historico = require("../api/sync/historico.js");
  const diagnostico = require("../api/diagnostico.js");
  const detalleComp = require("../api/competencia-detalle.js");
  const oportunidades = require("../api/oportunidades.js");
  const resumen = require("../api/resumen.js");
  const adminRup = require("../api/admin/rup.js");
  const { crearRedis } = require("../lib/redis.js");
  const { empaquetar, descomprimir, CHUNK_MAX_COMPRIMIDO, CLAVES } = require("../lib/almacen.js");
  const indiceComp = require("../lib/indice_competencia.js");
  const { rup_valido } = require("../lib/rup.js");
  const filtros = require("../lib/filtros.js");
  const unspsc = require("../lib/unspsc.js");
  const equivalencias = require("../lib/equivalencias.js");
  const textoUnspsc = require("../lib/texto_unspsc.js");
  const competenciaDetalle = require("../lib/competencia_detalle.js");
  const capacidad = require("../lib/capacidad.js");
  const perfilesMod = require("../lib/perfiles.js");
  const { PERFILES } = perfilesMod;
  const configRup = require("../lib/config_rup.js");
  // el token de los endpoints protegidos, por cabecera (la vía preferida)
  const CAB_TOKEN = { "x-historico-token": process.env.HISTORICO_TOKEN };
  const redis = crearRedis({});

  /* unidad: el empaquetador respeta los 500 KB comprimidos y no pierde filas */
  {
    const grandes = Array.from({ length: 9000 }, (_, i) => ({ _k: `k${i}`, blob: crypto.randomBytes(120).toString("hex") }));
    const paquetes = empaquetar(grandes);
    assert.ok(paquetes.length > 1, "empaquetar debe partir lotes grandes");
    for (const p of paquetes) assert.ok(Buffer.byteLength(p, "base64") <= CHUNK_MAX_COMPRIMIDO, "chunk sobre el límite de 500 KB");
    const vueltas = paquetes.flatMap((p) => descomprimir(p));
    assert.strictEqual(vueltas.length, grandes.length, "el empaquetador perdió filas");
    console.log(`· unidad empaquetar: ${paquetes.length} chunks ≤500 KB, ${vueltas.length} filas conservadas`);
  }

  /* unidad: la detección de anticipo no cruza frases ni ignora negaciones */
  {
    const { enriquecer } = require("../lib/negocio.js");
    const casos = [
      ["NO SE PAGARA ANTICIPO NI PAGO ANTICIPADO. FORMA DE PAGO: ACTAS PARCIALES DEL 90% del valor", 0],
      ["No se pagara anticipo. Garantia de cumplimiento del 10 % del valor", 0],
      ["No se contempla anticipo para este proceso", 0],
      ["El contrato contempla anticipo del 30% del valor", 30],
      ["Anticipo: 50% contra acta de inicio", 50],
      ["Se entregará un 20 % en calidad de anticipo", 20],
      ["Obra de pavimentación sin mención alguna", 0],
    ];
    for (const [texto, esperado] of casos) {
      const l = enriquecer({ nombre_del_procedimiento: "x", descripci_n_del_procedimiento: texto, precio_base: "1" });
      assert.strictEqual(l.anticipo_pct, esperado, `anticipo de «${texto}» → ${l.anticipo_pct}, esperaba ${esperado}`);
    }
    console.log(`· unidad anticipo: ${casos.length} casos de texto correctos (negaciones y cruces de frase)`);
  }

  /* unidad: estados canónicos — desconocido = CERRADO, sin fallback optimista */
  {
    const casos = [
      [{ estado_del_procedimiento: "Convocado" }, true],
      [{ estado_del_procedimiento: "Presentación de oferta" }, true],
      [{ estado_del_procedimiento: "Presentación de ofertas" }, true], // variante real
      [{ estado_del_procedimiento: "Borrador" }, true],                // prefijo de "Borrador de pliegos"
      [{ estado_del_procedimiento: "Publicado", fase: "Presentación de ofertas" }, true],
      // "Activo": valor documentado de `estado` en p6dx-8zbt. Se descartaba en
      // silencio por caer en "desconocido = cerrado" (ver lib/filtros).
      [{ estado_del_procedimiento: "Activo" }, true],
      [{ estado_del_procedimiento: "Activo", fase: "Selección" }, true],
      // ...pero el cierre sigue ganando: añadirlo NO puede resucitar un cerrado
      [{ estado_del_procedimiento: "Activo", fase: "Adjudicación" }, false],
      [{ estado_del_procedimiento: "Activo", adjudicado: "Si" }, false],
      /* ...y NO puede arrastrar al literal que significa lo contrario. La
         coincidencia es por prefijo en ambos sentidos, así que un vecino como
         «Inactivo» es justo lo que una lista de estados puede tragarse sin que
         nadie lo note — y servir como abierto un proceso desactivado sería peor
         que el defecto que «activo» vino a arreglar. */
      [{ estado_del_procedimiento: "Inactivo" }, false],
      [{ estado_del_procedimiento: "INACTIVO" }, false],
      [{ estado_del_procedimiento: "Desactivado" }, false],
      [{ estado_del_procedimiento: "Adjudicado" }, false],
      [{ estado_del_procedimiento: "En evaluación" }, false],
      [{ estado_del_procedimiento: "Evaluación de ofertas" }, false],
      [{ estado_del_procedimiento: "Declarado desierto" }, false],
      [{ estado_del_procedimiento: "Publicado", adjudicado: "Si" }, false], // señal dura gana
      [{ estado_del_procedimiento: "Publicado", fase: "Ejecución" }, false], // cerrado gana
      [{ estado_del_procedimiento: "Estado rarísimo nuevo" }, false],  // desconocido = cerrado
      [{}, false],                                                     // sin dato = cerrado
    ];
    for (const [lic, esperado] of casos) {
      assert.strictEqual(filtros.estado_abierto(lic), esperado,
        `estado_abierto(${JSON.stringify(lic)}) esperaba ${esperado}`);
    }
    console.log(`· unidad estados: ${casos.length} clasificaciones correctas (desconocido = cerrado)`);

    /* EL RELOJ CIERRA PROCESOS (ago 2026, defecto de producción).
       «INVITACION PRIVADA EDUH-Turbo» cerraba el 20/02/2026 y seguía servido
       como abierto en agosto. Ninguna columna de estado lo desmentía.

       El «ahora» se INYECTA para que estas aserciones no dependan del día en
       que corra la suite: una prueba de husos horarios que se calibra sola
       contra el reloj real no prueba nada y falla sola en la frontera. */
    {
      // 4 ago 2026, 12:00 UTC = 07:00 en Colombia
      const AHORA = Date.parse("2026-08-04T12:00:00.000Z");
      const conCierre = (fecha, extra = {}) => ({ estado_del_procedimiento: "Publicado", fecha_cierre: fecha, ...extra });

      // el caso reportado, textual
      const eduh = conCierre("2026-02-20T17:00:00.000");
      assert.strictEqual(filtros.cierre_vencido(eduh, AHORA), true, "20/02/2026 ya venció el 4/08/2026");
      assert.strictEqual(filtros.estado_abierto(eduh, AHORA), false,
        "un proceso con la fecha límite vencida NO puede seguir abierto, diga lo que diga el estado");
      assert.strictEqual(filtros.estado_cerrado(eduh, AHORA), true,
        "…y la fecha vencida es un hecho: consta como cerrado");

      // futuro: intacto
      const futuro = conCierre("2026-12-20T17:00:00.000");
      assert.strictEqual(filtros.estado_abierto(futuro, AHORA), true, "un cierre futuro no puede cerrar el proceso");
      assert.strictEqual(filtros.estado_cerrado(futuro, AHORA), false);

      /* LA FRONTERA DEL HUSO, que es donde está el error caro. El dataset
         publica hora Colombia FLOTANTE (sin zona) y `Date.parse` la lee como
         UTC, adelantándola 5 h. Sin la corrección, un proceso que cierra HOY a
         las 17:00 en Colombia (= 22:00 UTC) se daría por vencido a las 17:00
         UTC — cinco horas antes — y desaparecería del listado el mismo día en
         que había que presentarse. */
      assert.strictEqual(filtros.estado_abierto(conCierre("2026-08-04T17:00:00.000"), AHORA), true,
        "el que cierra HOY a las 17:00 de Colombia sigue abierto a las 07:00 de Colombia");
      assert.strictEqual(filtros.estado_abierto(conCierre("2026-08-04T06:00:00.000"), AHORA), false,
        "el que cerró HOY a las 06:00 de Colombia ya venció a las 07:00");
      // exactamente en el instante del cierre todavía NO está vencido
      assert.strictEqual(filtros.cierre_vencido(conCierre("2026-08-04T07:00:00.000"), AHORA), false,
        "justo en la hora del cierre el proceso aún no está vencido");

      // sin fecha o con fecha ilegible NO se inventa un cierre (regla de faltantes)
      assert.strictEqual(filtros.cierre_vencido({ estado_del_procedimiento: "Publicado" }, AHORA), false);
      assert.strictEqual(filtros.cierre_vencido(conCierre(""), AHORA), false);
      assert.strictEqual(filtros.cierre_vencido(conCierre("no es una fecha"), AHORA), false);
      assert.strictEqual(filtros.estado_abierto(conCierre("no es una fecha"), AHORA), true,
        "una fecha ilegible no puede cerrar un proceso: sería cerrar por ignorancia");

      /* En la INGESTA la fila todavía no pasó por `enriquecer`, así que no
         trae `fecha_cierre` resuelto: la regla tiene que derivarlo de las
         columnas crudas o el filtro no serviría de nada en la full. */
      assert.strictEqual(filtros.cierre_vencido(
        { estado_del_procedimiento: "Publicado", fecha_de_recepcion_de: "2026-02-20T17:00:00.000" }, AHORA), true,
        "la regla debe leer las columnas crudas cuando aún no hay fecha_cierre");
      assert.strictEqual(filtros.estado_abierto(
        { estado_del_procedimiento: "Publicado", fecha_limite_de_recepcion_respuestas: "2026-02-20T17:00:00.000" }, AHORA), false,
        "…por cualquiera de las columnas candidatas");

      // y la fecha vencida gana también a los estados abiertos más explícitos
      for (const est of ["Convocado", "Presentación de ofertas", "Activo"]) {
        assert.strictEqual(filtros.estado_abierto({ estado_del_procedimiento: est, fecha_cierre: "2026-02-20T17:00:00.000" }, AHORA), false,
          `«${est}» con fecha vencida sigue siendo un proceso cerrado`);
      }
      console.log("· unidad reloj: la fecha de cierre vencida cierra el proceso, con la frontera del huso horario probada");
    }
  }

  /* unidad: modalidades — solo lista blanca competitiva */
  {
    const casos = [
      ["Licitación pública", true],
      ["Licitación pública Obra Publica", true],
      ["Selección Abreviada de Menor Cuantía (Ley 1150 de 2007)", true],
      ["Mínima cuantía", true],
      ["Subasta", true],
      ["Concurso de méritos abierto", true],
      ["Licitación Pública Acuerdo Marco de Precios", true],
      ["Contratación régimen especial (con ofertas)", true], // hay convocatoria
      ["Contratación directa", false],
      ["Contratación directa (con ofertas)", false],         // sigue siendo directa
      ["Contratación régimen especial", false],
      ["Licitación privada", false],
      // «Invitación Privada» (defecto de producción ago 2026): la entidad elige
      // a quién invita, así que no hay concurso abierto al que presentarse
      ["Invitación Privada", false],
      ["INVITACION PRIVADA EDUH-Turbo", false],
      ["Invitación privada de mínima cuantía", false], // la exclusión gana a la lista blanca
      ["Solicitud de información a los Proveedores", false],
      ["Enajenación de bienes con Subasta", false], // venta de activos, no obra
      ["Enajenación de bienes con Sobre Cerrado", false],
      ["", false],                                           // sin dato = fuera
      ["Modalidad desconocida", false],
    ];
    for (const [m, esperado] of casos) {
      assert.strictEqual(filtros.modalidad_competitiva({ modalidad_de_contratacion: m }), esperado,
        `modalidad_competitiva(«${m}») esperaba ${esperado}`);
    }
    console.log(`· unidad modalidades: ${casos.length} clasificaciones correctas (lista blanca)`);
  }

  /* unidad: capa anti-suministro sobre segmentos de bienes. Cada caso se
     evalúa contra un perfil cuyo RUP SÍ contiene la clase — así el rechazo
     solo puede venir de la capa (se verifica anti_suministro como causa). */
  {
    const casos = [ // [licitación, perfil con la clase en su RUP, ¿pasa?]
      // compra pura con el quinteto vigilado histórico (56, 43) → fuera
      [{ nombre_del_procedimiento: "Suministro de mobiliario escolar", descripci_n_del_procedimiento: "Compra de pupitres", codigo_principal_de_categoria: "V1.56112000" }, "helder", false],
      [{ nombre_del_procedimiento: "Adquisición de equipos de cómputo", descripci_n_del_procedimiento: "Compra de estaciones", codigo_principal_de_categoria: "V1.43211700" }, "helder", false],
      // segmentos de bienes FUERA del quinteto histórico 30/39/43/48/56:
      // tubería (40, el bloque más grande del RUP de Génesis) y herramientas (27)
      [{ nombre_del_procedimiento: "Suministro de tubería y accesorios en PVC", descripci_n_del_procedimiento: "Para la red de acueducto municipal", codigo_principal_de_categoria: "V1.40171500" }, "genesis", false],
      [{ nombre_del_procedimiento: "Adquisición de herramientas menores", descripci_n_del_procedimiento: "Ferretería para la entidad", codigo_principal_de_categoria: "V1.27111500" }, "genesis", false],
      // redacciones reales de compra: "compraventa de" y plurales
      [{ nombre_del_procedimiento: "Compraventa de equipos de cómputo", descripci_n_del_procedimiento: "Para las sedes educativas", codigo_principal_de_categoria: "V1.43211700" }, "helder", false],
      [{ nombre_del_procedimiento: "Suministros de mobiliario escolar", descripci_n_del_procedimiento: "Pupitres y sillas", codigo_principal_de_categoria: "V1.56112000" }, "helder", false],
      // mismo segmento pero con verbo de obra → pasa
      [{ nombre_del_procedimiento: "Instalación y montaje de mobiliario", descripci_n_del_procedimiento: "Con obras de adecuación", codigo_principal_de_categoria: "V1.56112000" }, "helder", true],
      [{ nombre_del_procedimiento: "Suministro e instalación de tubería PVC", descripci_n_del_procedimiento: "Optimización de la red de acueducto", codigo_principal_de_categoria: "V1.40171500" }, "genesis", true],
      // código de obra (72) ancla el proceso aunque haya verbo de compra → pasa
      [{ nombre_del_procedimiento: "Construcción de aula y suministro de materiales", descripci_n_del_procedimiento: "Obra e insumos", codigo_principal_de_categoria: "V1.72141000 V1.30111500" }, "helder", true],
    ];
    for (const [lic, perfilId, esperado] of casos) {
      const ev = filtros.evaluarObjeto(lic, PERFILES[perfilId]);
      assert.strictEqual(ev.ok, esperado,
        `objeto_valido(«${lic.nombre_del_procedimiento}», ${perfilId}) esperaba ${esperado} (motivo: ${ev.motivo})`);
      if (!esperado) {
        assert.strictEqual(ev.anti_suministro, true,
          `«${lic.nombre_del_procedimiento}» debía caer por la CAPA anti-suministro, cayó por: ${ev.motivo}`);
      }
    }
    console.log(`· unidad anti-suministro: ${casos.length} casos correctos (segmentos de bienes, causa verificada)`);
  }

  /* unidad: convenios — «aunar esfuerzos» y compañía NO son licitaciones */
  {
    const convenios = [
      "AUNAR ESFUERZOS TÉCNICOS; ADMINISTRATIVOS Y FINANCIEROS PARA EL MEJORAMIENTO DE VÍAS",
      "AUNAR ESFUERZOS TECNICOS ADMINISTRATIVOS Y FINANCIEROS",
      "Aunar recursos para la construcción de un parque",
      "CONVENIO INTERADMINISTRATIVO PARA LA CONSTRUCCIÓN DE PLACA HUELLA",
      "Convenio de cooperación internacional para infraestructura educativa",
      "CONVENIO MARCO DE APOYO A LA GESTIÓN VIAL",
      "Contrato interadministrativo para la ejecución de obras",
      "Convenio de asociación con entidad sin ánimo de lucro para obras",
    ];
    for (const nombre of convenios) {
      assert.strictEqual(filtros.es_convenio({ nombre_del_procedimiento: nombre }), true,
        `«${nombre.slice(0, 50)}…» debía clasificarse como convenio`);
    }
    // …y la obra REAL que solo menciona un convenio de pasada NO es un convenio
    const obrasLegitimas = [
      { nombre_del_procedimiento: "Construcción de placa huella vereda El Cairo",
        descripci_n_del_procedimiento: "Obra ejecutada en el marco del convenio interadministrativo 123 de 2025" },
      { nombre_del_procedimiento: "Mejoramiento de vía terciaria",
        descripci_n_del_procedimiento: "Recursos provenientes del contrato interadministrativo suscrito con la gobernación" },
      { nombre_del_procedimiento: "Mantenimiento de la red de alcantarillado" },
    ];
    for (const l of obrasLegitimas) {
      assert.strictEqual(filtros.es_convenio(l), false,
        `«${l.nombre_del_procedimiento}» NO es un convenio: mencionarlo no lo convierte en uno`);
    }
    // el convenio muere en evaluarObjeto, con motivo propio y ANTES que todo
    const ev = filtros.evaluarObjeto({
      nombre_del_procedimiento: "AUNAR ESFUERZOS TÉCNICOS; ADMINISTRATIVOS Y FINANCIEROS",
      descripci_n_del_procedimiento: "Mejoramiento de vías",
      codigo_principal_de_categoria: "V1.72141000",
    }, PERFILES.helder);
    assert.strictEqual(ev.ok, false);
    assert.strictEqual(ev.paso, "convenio", `el convenio debía morir en el paso «convenio», murió en «${ev.paso}»`);
    console.log(`· unidad convenios: ${convenios.length} excluidos, ${obrasLegitimas.length} obras legítimas conservadas`);
  }

  /* unidad: NORMALIZACIÓN de códigos UNSPSC. El `\d{8}` anterior fabricaba
     códigos falsos a partir de cualquier número largo del campo. */
  {
    const casos = [
      ["V1.72141000", ["72141000"], []],
      ["v1_72141015", ["72141015"], []],
      ["V1.72141000 V1.30111500", ["72141000", "30111500"], []],
      ["72141000;72151000", ["72141000", "72151000"], []],
      ["V1.7214", ["72140000"], []],            // familia: se rellena a 8
      ["V1.721410", ["72141000"], []],          // clase
      ["V1.72", ["72000000"], []],              // segmento
      ["1234567890", [], ["1234567890"]],       // 10 dígitos: NO es un UNSPSC
      ["123", [], ["123"]],                     // longitud inválida
      ["00000000", [], ["00000000"]],           // segmento 00 no existe
      ["", [], []],
    ];
    for (const [crudo, esperados, invalidos] of casos) {
      const r = unspsc.extraerCodigos(crudo);
      assert.deepStrictEqual(r.codigos.map((c) => c.codigo), esperados, `extraerCodigos(«${crudo}»)`);
      assert.deepStrictEqual(r.invalidos, invalidos, `inválidos de «${crudo}»`);
    }
    // el NIVEL se lee por los pares "00" finales: es lo que distingue
    // 72000000 (segmento) de 72141015 (producto)
    assert.strictEqual(unspsc.normalizarCodigo("72000000").tipo, "segmento");
    assert.strictEqual(unspsc.normalizarCodigo("72140000").tipo, "familia");
    assert.strictEqual(unspsc.normalizarCodigo("72141000").tipo, "clase");
    assert.strictEqual(unspsc.normalizarCodigo("72141015").tipo, "producto");
    assert.strictEqual(unspsc.normalizarCodigo("72100000").tipo, "familia", "7210 es familia, no segmento");
    console.log(`· unidad UNSPSC (normalización): ${casos.length} campos tokenizados, niveles correctos`);
  }

  /* unidad: MATCHING JERÁRQUICO bidireccional. Los cuatro casos del encargo. */
  {
    assert.ok([...PERFILES.juntos.unspsc].every((c) => c.endsWith("00")),
      "supuesto roto: los códigos del RUP ya no están a nivel de clase");
    const idx = unspsc.indiceDe(PERFILES.helder.unspsc);
    const tier = (codigo) => unspsc.emparejar(unspsc.extraerCodigos(codigo).codigos, idx).tier;

    // a. RUP 72141000 ⊃ proceso 72141015 (producto dentro de la clase)
    assert.strictEqual(tier("72141015"), "clase");
    assert.strictEqual(PERFILES.helder.unspsc.has("72141015"), false,
      "el código de producto NO está literalmente en el RUP (esa es la premisa)");
    // b. proceso 72140000 (familia) ⊃ RUP 72141000 → match AMPLIO
    assert.strictEqual(tier("72140000"), "familia");
    // c. mismo código
    assert.strictEqual(tier("72141000"), "clase");
    // d. el SEGMENTO suelto NO basta por sí solo (haría casar todo el 72)
    assert.strictEqual(tier("72000000"), "ninguno");
    assert.strictEqual(unspsc.emparejar(unspsc.extraerCodigos("72000000").codigos, idx).segmento_afin, true,
      "el segmento afín debe quedar anotado para que lo confirme el texto");
    // e. familia distinta → NO match
    assert.strictEqual(tier("80111500"), "ninguno");
    assert.strictEqual(tier("53102700"), "ninguno"); // ropa

    // el índice precomputado del perfil (clases/familias/segmentos)
    assert.strictEqual(idx.clases.size, PERFILES.helder.unspsc.size, "193 clases de Helder");
    assert.ok(idx.familias.size < idx.clases.size && idx.familias.size > 0, "familias derivadas");
    assert.strictEqual(idx.segmentos.size, 26, "26 segmentos en el RUP de Helder");
    // el consorcio usa la UNIÓN, jamás la intersección
    assert.strictEqual(PERFILES.juntos.unspsc.size,
      new Set([...PERFILES.helder.unspsc, ...PERFILES.genesis.unspsc]).size,
      "el consorcio debe ver la unión de los dos RUP");
    assert.ok(PERFILES.juntos.unspsc.size > PERFILES.genesis.unspsc.size,
      "la unión no puede ser menor que cualquiera de los dos RUP");
    console.log("· unidad UNSPSC (jerarquía): clase ⊃ producto, familia ⊃ clase, segmento NO basta");
  }

  /* unidad: PERTINENCIA del objeto. Los cinco falsos positivos confirmados en
     producción, con su código UNSPSC realmente inscrito en el RUP. */
  {
    const casos = [ // [objeto, código, ¿pertinente?]
      ["CONSTRUCCIÓN DE AULA ESCOLAR", "V1.80101600", true],
      ["PRESTACION DE SERVICIOS DE IMPRESIÓN Y FOTOCOPIA", "V1.80101600", false],
      ["INTERVENTORÍA TÉCNICA DE OBRA", "V1.80101500", true],
      ["SUMINISTRO DE ALIMENTOS PARA PREPARAR RACIONES", "V1.80111600", false],
      ["APOYO LOGISTICO PARA EL CUMPLEAÑOS DEL MUNICIPIO", "V1.80111600", false],
      ["PRESTACIÓN DEL SERVICIO DE INTERNET DEDICADO", "V1.80101600", false],
      ["APOYO LOGISTICO PARA GRUPO DE PILONERAS", "V1.93141700", false],
      // el código de obra pura sostiene un objeto escueto (no se bloquea por
      // falta de información: eso sería un falso negativo)
      ["MEJORAMIENTO SEDE FASE II", "V1.72141000", true],
      // …y la logística DE OBRA no es un evento
      ["LOGISTICA DE OBRA PARA LA CONSTRUCCIÓN DEL PARQUE", "V1.72141000", true],
    ];
    for (const [nombre, codigo, esperado] of casos) {
      const ev = filtros.evaluarObjeto(
        { nombre_del_procedimiento: nombre, descripci_n_del_procedimiento: "", codigo_principal_de_categoria: codigo },
        PERFILES.helder);
      assert.strictEqual(ev.ok, esperado, `«${nombre}» esperaba ${esperado ? "PASAR" : "caer"} (motivo: ${ev.motivo})`);
      assert.strictEqual(ev.tier, "clase", `«${nombre}»: el código sí está en el RUP, el tier debía ser "clase"`);
      if (!esperado) {
        assert.strictEqual(ev.paso, "no_pertinente", `«${nombre}» debía caer por PERTINENCIA, cayó en «${ev.paso}»`);
        assert.strictEqual(ev.pertinencia.nivel, "rojo");
        assert.ok(ev.termino, "el veredicto debe decir QUÉ término lo delató");
      } else {
        assert.ok(["verde", "amarillo"].includes(ev.pertinencia.nivel), `«${nombre}»: nivel de pertinencia`);
      }
    }
    /* términos BLOQUEANTES: descartan aunque el objeto traiga verbos de obra.
       La regla normal (término ajeno + CERO verbos) no los alcanzaba. */
    {
      const bloqueantes = [
        "PRESTACION DEL SERVICIO DE INTERNET DEDICADO CON INSTALACION Y CANALIZACION DE REDES",
        "SERVICIO DE INTERNET BANDA ANCHA PARA LAS SEDES EDUCATIVAS",
        // «conectividad» ya la ataja la blacklist heredada; el bloqueante cubre
        // la redacción que sí llegaba: internet + trabajos sobre la red
        "SERVICIO DE INTERNET DEDICADO Y MANTENIMIENTO DE LA RED DE FIBRA DE LA ALCALDIA",
      ];
      for (const nombre of bloqueantes) {
        const ev = filtros.evaluarObjeto(
          { nombre_del_procedimiento: nombre, codigo_principal_de_categoria: "V1.80101600" }, PERFILES.helder);
        assert.strictEqual(ev.ok, false, `«${nombre.slice(0, 40)}…» debía caer aunque mencione obra`);
        assert.strictEqual(ev.paso, "no_pertinente");
        assert.strictEqual(ev.pertinencia.bloqueante, true, "debe constar que fue un término bloqueante");
      }
      // …y el tendido de una red de fibra SÍ es obra: el bloqueante de fibra
      // exige contexto de servicio (canal, enlace, ancho de banda, proveedor)
      const obraFibra = filtros.evaluarObjeto({
        nombre_del_procedimiento: "CANALIZACION Y TENDIDO DE FIBRA OPTICA EN LA VIA PRINCIPAL",
        codigo_principal_de_categoria: "V1.72141000",
      }, PERFILES.helder);
      assert.strictEqual(obraFibra.ok, true, "el bloqueante de fibra no puede llevarse por delante una obra real");
    }

    /* OBJETOS GENÉRICOS: el «objeto» es el nombre del trámite y su código
       interno. Los tres casos son textuales del diagnóstico de producción. */
    {
      const genericos = ["CONVOCATORIA PUBLICA", "CONCURSO DE MERITOS INV-CM-001-2026", "INFI CM001-2026", "OBRA"];
      for (const nombre of genericos) {
        const ev = filtros.evaluarObjeto(
          { nombre_del_procedimiento: nombre, codigo_principal_de_categoria: "V1.72141000" }, PERFILES.helder);
        assert.strictEqual(ev.ok, false, `«${nombre}» no describe nada y no debería mostrarse`);
        assert.strictEqual(ev.paso, "objeto_generico", `«${nombre}» debía caer como objeto genérico, cayó en «${ev.paso}»`);
        assert.strictEqual(ev.pertinencia.etiqueta, "Objeto genérico");
      }
      // …pero el mismo código interno CON descripción del trabajo sí pasa
      const conObjeto = ["CM-001-2026 CONSTRUCCION DE PLACA HUELLA EN LA VEREDA EL CAIRO",
        "CONVOCATORIA PUBLICA PARA EL MEJORAMIENTO DE LA VIA TERCIARIA"];
      for (const nombre of conObjeto) {
        const ev = filtros.evaluarObjeto(
          { nombre_del_procedimiento: nombre, codigo_principal_de_categoria: "V1.72141000" }, PERFILES.helder);
        assert.strictEqual(ev.ok, true, `«${nombre}» sí describe el trabajo: no es genérico`);
      }
      assert.strictEqual(filtros.esObjetoGenerico("convocatoria publica").generico, true);
      assert.strictEqual(filtros.esObjetoGenerico("construccion de placa huella").generico, false);
    }

    /* RUTA DE TEXTO: sin código del RUP, la pertinencia tiene que llegar a
       VERDE. Un 🟡 «verificar» sin código no es evidencia de nada — es la fuga
       que metía servicios y equipos por el vocabulario genérico de familia. */
    {
      const debil = {
        nombre_del_procedimiento: "Servicio integral para la institucion educativa sede principal",
        descripci_n_del_procedimiento: "Atencion de las necesidades de la institucion",
        codigo_principal_de_categoria: "V1.86101700", // fuera del RUP de Helder
      };
      const voc = textoUnspsc.vocabularioActivo(null);
      const cerrado = filtros.evaluarObjeto(debil, PERFILES.helder, { vocabulario: voc });
      assert.strictEqual(cerrado.tier, "texto", "el vocabulario de familia sí lo lleva al tier texto");
      assert.strictEqual(cerrado.pertinencia.nivel, "amarillo");
      assert.strictEqual(cerrado.ok, false, "por defecto la ruta de texto exige pertinencia verde");
      assert.strictEqual(cerrado.paso, "texto_debil");
      // el toggle lo devuelve, con su etiqueta de «verificar»
      const abierto = filtros.evaluarObjeto(debil, PERFILES.helder, { vocabulario: voc }, { incluirTextoDebil: true });
      assert.strictEqual(abierto.ok, true, "?incluir_sin_unspsc=1 debe devolverlo");
      assert.strictEqual(abierto.tier, "texto");
      // …y un objeto de obra SIN código sigue entrando siempre (pertinencia verde)
      const obraSinCodigo = filtros.evaluarObjeto(
        { nombre_del_procedimiento: "Adecuación de la sede educativa vereda El Cairo",
          descripci_n_del_procedimiento: "Remodelación del aula múltiple" }, PERFILES.helder, { vocabulario: voc });
      assert.strictEqual(obraSinCodigo.ok, true, "la obra sin código no puede perderse: su pertinencia es verde");
      assert.strictEqual(obraSinCodigo.tier, "texto");
      assert.strictEqual(obraSinCodigo.pertinencia.nivel, "verde");
    }

    // el veredicto es GRADUADO, nunca booleano: tipo de trabajo detectado
    const consul = filtros.evaluarObjeto({ nombre_del_procedimiento: "INTERVENTORÍA TÉCNICA DE OBRA", codigo_principal_de_categoria: "V1.80101500" }, PERFILES.helder);
    assert.strictEqual(consul.pertinencia.tipo, "consultoria");
    const infra = filtros.evaluarObjeto({ nombre_del_procedimiento: "Optimización de la red de acueducto", codigo_principal_de_categoria: "V1.72141000" }, PERFILES.helder);
    assert.strictEqual(infra.pertinencia.tipo, "infraestructura");
    // «mantenimiento» solo cuenta como obra si va con infraestructura
    assert.strictEqual(filtros.hayVerboDeObra(filtros.norm("Mantenimiento de la red de alcantarillado")), true);
    assert.strictEqual(filtros.hayVerboDeObra(filtros.norm("Mantenimiento de vehículos oficiales")), false);
    console.log(`· unidad pertinencia: ${casos.length} objetos clasificados (los falsos positivos de producción, fuera)`);
  }

  /* unidad: EQUIVALENCIAS funcionales. El lift se calcula sobre
     ADJUDICATARIOS, no sobre procesos: una entidad que saque 40 procesos
     gemelos no puede fabricar una equivalencia. */
  {
    const acc = { porNit: {}, procesosPorClase: {}, nNits: 0 };
    // 6 adjudicatarios ganan en la clase inscrita (721410) Y en la afín (801416)
    for (let k = 0; k < 6; k++) acc.porNit[`nit:9020000${k}`] = ["721410", "801416"];
    // 40 adjudicatarios más, solo en clases del RUP: bajan P(B) y suben el lift
    for (let k = 0; k < 40; k++) acc.porNit[`nit:9030000${k}`] = ["721510"];
    acc.procesosPorClase = { 721410: 30, 801416: 6, 721510: 40 };
    const { mapa, totalNits } = equivalencias.calcularPares(acc);
    assert.strictEqual(totalNits, 46);
    assert.ok(mapa["801416"], "la clase afín debía quedar registrada");
    assert.strictEqual(mapa["801416"][0].clase, "721410");
    assert.ok(mapa["801416"][0].lift >= equivalencias.LIFT_MIN, `lift ${mapa["801416"][0].lift} bajo el umbral`);
    assert.strictEqual(mapa["801416"][0].adjudicatarios, 6);
    assert.ok(!mapa["721410"], "una clase YA inscrita no necesita equivalencia");

    // umbral de adjudicatarios: con 4 en la intersección no hay equivalencia
    const flojo = { porNit: {}, procesosPorClase: { 721410: 30, 801416: 4, 721510: 40 }, nNits: 0 };
    for (let k = 0; k < 4; k++) flojo.porNit[`nit:a${k}`] = ["721410", "801416"];
    for (let k = 0; k < 40; k++) flojo.porNit[`nit:b${k}`] = ["721510"];
    assert.deepStrictEqual(equivalencias.calcularPares(flojo).mapa, {},
      "con menos de 5 adjudicatarios en común no puede nacer una equivalencia");
    // umbral de soporte: la clase inscrita necesita ≥20 procesos históricos
    const pocoSoporte = { ...acc, procesosPorClase: { 721410: 10, 801416: 6, 721510: 40 } };
    assert.deepStrictEqual(equivalencias.calcularPares(pocoSoporte).mapa, {},
      "sin soporte suficiente en la clase inscrita, el cociente es ruido");

    // y la búsqueda: un proceso de la clase afín casa con el perfil que tiene
    // la clase inscrita, y NO con uno que no la tenga
    const idxHelder = unspsc.indiceDe(PERFILES.helder.unspsc);
    const cod = unspsc.extraerCodigos("V1.80141600").codigos;
    const eq = equivalencias.equivalenteDe(mapa, cod, idxHelder);
    assert.ok(eq && eq.tier === "equivalente", "el proceso de la clase afín debía casar por equivalencia");
    assert.strictEqual(eq.codigo_rup, "72141000");
    assert.ok(/evidencia hist[oó]rica/i.test(eq.mensaje), "el mensaje debe decir de dónde sale la afinidad");
    assert.strictEqual(equivalencias.equivalenteDe({ 801416: [{ clase: "999999", lift: 9 }] }, cod, idxHelder), null,
      "una afinidad hacia una clase que el perfil NO tiene no sirve de nada");
    console.log("· unidad equivalencias: lift por adjudicatarios, tres umbrales y búsqueda por perfil");
  }

  /* unidad: por qué NO hay equivalencias. Un índice en cero tiene cuatro
     explicaciones posibles y un 0 no las distingue: el diagnóstico debe
     decirlo en castellano y decir qué hacer. */
  {
    const sinConstruir = equivalencias.explicarEquivalencias(null);
    assert.strictEqual(sinConstruir.hay, false);
    assert.ok(/reconstruir_equivalencias/.test(sinConstruir.por_que.join(" ")),
      "si nunca se construyó, hay que decir cómo construirlo");

    // el caso típico del backfill real: el dataset no trae adjudicatario
    const sinAdjudicatario = equivalencias.explicarEquivalencias({
      pares: 0, procesos_contados: 100, pares_evaluados: 0,
      descartados: { sin_adjudicacion: 12, sin_adjudicatario: 900, sin_clase: 3 },
      umbrales: { lift_min: 3, soporte_min: 20, adjudicatarios_min: 5 },
    });
    assert.ok(/sin nombre ni nit/i.test(sinAdjudicatario.por_que.join(" ")),
      "la causa más probable (sin adjudicatario en el dataset) debe nombrarse");
    assert.ok(/columnas de adjudicatario/i.test(sinAdjudicatario.que_hacer),
      "y debe decir qué hacer: revisar los nombres de columna");

    // el caso «hay datos, pero ningún par alcanza los umbrales»
    const umbrales = equivalencias.explicarEquivalencias({
      pares: 0, procesos_contados: 5000, pares_evaluados: 40, adjudicatarios: 900,
      descartados: { sin_adjudicacion: 0, sin_adjudicatario: 0, sin_clase: 0 },
      fallos_por_umbral: { pocos_adjudicatarios: 38, poco_soporte: 2, lift_bajo: 0 },
      umbrales: { lift_min: 3, soporte_min: 20, adjudicatarios_min: 5 },
    });
    assert.ok(/5 adjudicatarios en com/i.test(umbrales.por_que.join(" ")),
      "debe decir cuántos pares murieron en cada umbral");
    assert.ok(/ampliar el rango/i.test(umbrales.que_hacer));

    // y cuando SÍ hay, lo dice sin alarmar
    assert.strictEqual(equivalencias.explicarEquivalencias({ pares: 3, adjudicatarios: 50, procesos_contados: 900 }).hay, true);
    console.log("· unidad equivalencias (por qué no hay): cuatro causas distinguidas, cada una con su siguiente paso");
  }

  /* unidad: TEXTO como co-señal (vocabulario por familia + verbo de obra) */
  {
    const idx = unspsc.indiceDe(PERFILES.helder.unspsc);
    const voc = textoUnspsc.vocabularioActivo(null); // semilla del repositorio
    assert.strictEqual(voc.fuente, "semilla");
    // el derivado del histórico se MEZCLA con la semilla, familia a familia:
    // una derivación flaca no puede dejar sin señal a las demás familias
    const mezcla = textoUnspsc.vocabularioActivo({ familias: { 7214: ["alfa", "beta", "gamma", "delta"] } });
    assert.strictEqual(mezcla.derivadas, 1);
    assert.strictEqual(mezcla.indice.size, voc.indice.size, "la mezcla conserva todas las familias de la semilla");
    assert.ok(mezcla.indice.get("7214").has("alfa"), "el derivado manda en SU familia");
    assert.ok(mezcla.indice.get("8110").has("topografia"), "la semilla sigue en las familias sin derivado");
    assert.ok(voc.indice.size > 0, "la semilla del repositorio no se cargó");
    // ≥3 términos distintivos de una familia que el perfil SÍ tiene
    const sug = textoUnspsc.sugerirFamilia(
      filtros.norm("Construcción de placa huella y cunetas en la vía terciaria"), voc, idx.familias);
    assert.ok(sug && sug.familia === "7214", `esperaba familia 7214, llegó ${sug && sug.familia}`);
    assert.ok(sug.terminos.length >= 3, "el umbral es de 3 términos distintivos");
    // dos términos no bastan
    assert.strictEqual(textoUnspsc.sugerirFamilia(filtros.norm("Compra de concreto"), voc, idx.familias), null);
    // una familia que el perfil no tiene no puede sugerirse
    assert.strictEqual(textoUnspsc.sugerirFamilia(
      filtros.norm("Suministro de tuberia con valvula y accesorios de acueducto"), voc, new Set(["9999"])), null);

    // derivación TF-IDF: un término que sale en TODAS las familias no distingue
    const registros = [
      ...Array.from({ length: 25 }, (_, i) => ({ f: ["7214"], t: `contrato construccion placa huella vereda ${i}` })),
      ...Array.from({ length: 25 }, (_, i) => ({ f: ["8110"], t: `contrato estudios disenos topografia proyecto ${i}` })),
    ];
    const der = textoUnspsc.derivarVocabulario(registros, { familiasDe: (r) => r.f, textoDe: (r) => r.t });
    assert.ok(der.familias["7214"].includes("placa"), "el término distintivo debía sobrevivir");
    assert.ok(!der.familias["7214"].includes("contrato"), "un término presente en todas las familias no distingue nada");
    assert.ok(der.familias["8110"].includes("topografia"));
    console.log(`· unidad texto: vocabulario semilla (${voc.indice.size} familias), umbral de 3 términos y TF-IDF`);
  }

  /* unidad: INGESTA vs JUICIO. La ingesta guarda ancho (no sabe de perfiles);
     el juicio fino descarta al servir. Es lo que permite afinar el matching
     sin volver a bajar el año entero. */
  {
    const casos = [ // [licitación, ¿se GUARDA?, ¿la ve HELDER?]
      // servicio administrativo con código del RUP: se guarda, no se sirve
      [{ nombre_del_procedimiento: "PRESTACION DE SERVICIOS DE IMPRESIÓN Y FOTOCOPIA", codigo_principal_de_categoria: "V1.80101600" }, true, false],
      // obra con código ajeno a los RUP: se guarda (segmento de servicios)…
      [{ nombre_del_procedimiento: "Construcción de placa huella", codigo_principal_de_categoria: "V1.78111800" }, true, true],
      // …y una obra sin código también, por el objeto
      [{ nombre_del_procedimiento: "Construcción de placa huella rural" }, true, true],
      // un convenio jamás entra
      [{ nombre_del_procedimiento: "AUNAR ESFUERZOS PARA EL MEJORAMIENTO DE VÍAS", codigo_principal_de_categoria: "V1.72141000" }, false, false],
      // ni un objeto de la blacklist (ningún RUP de obra lo querrá nunca)
      [{ nombre_del_procedimiento: "Adquisición de caninos antinarcóticos", codigo_principal_de_categoria: "V1.72141000" }, false, false],
      // ni un bien de una familia que ningún RUP inscribe, sin objeto de obra
      [{ nombre_del_procedimiento: "Compra de instrumentos musicales", codigo_principal_de_categoria: "V1.60121000" }, false, false],
    ];
    for (const [lic, guarda, sirve] of casos) {
      assert.strictEqual(filtros.admisibleParaIngesta(lic), guarda,
        `ingesta de «${lic.nombre_del_procedimiento}» esperaba ${guarda}`);
      assert.strictEqual(filtros.evaluarObjeto(lic, PERFILES.helder).ok, sirve,
        `juicio de «${lic.nombre_del_procedimiento}» esperaba ${sirve}`);
    }
    // el prefiltro de ingesta NO puede depender de los RUP: si dependiera,
    // cargar un RUP nuevo obligaría a re-sincronizar (el bug estructural)
    assert.strictEqual(filtros.admisibleParaIngesta.length, 1, "admisibleParaIngesta no recibe perfil");
    console.log(`· unidad ingesta/juicio: ${casos.length} casos (la ingesta guarda lo que el juicio descarta)`);
  }

  /* unidad: PRESUPUESTO DE TIEMPO. Los dos límites del encargo, medidos sobre
     un corpus del tamaño real (2 600 procesos):
       ingesta  < 1 ms por proceso (corre dentro de la sincronización)
       consulta < 500 ms por el corpus entero (corre en cada petición) */
  {
    const N = 2600;
    const corpus = Array.from({ length: N }, (_, i) => ({
      nombre_del_procedimiento: [
        `Construcción de placa huella en la vereda ${i}`,
        `PRESTACION DE SERVICIOS DE IMPRESIÓN Y FOTOCOPIA ${i}`,
        `Mantenimiento de la red de alcantarillado sector ${i}`,
        `Gestion tecnica y administrativa del proyecto fase ${i}`,
      ][i % 4],
      descripci_n_del_procedimiento: `Descripción del proceso número ${i} con detalle suficiente para ejercitar los regex de pertinencia y de anticipo, incluyendo texto de relleno realista.`,
      codigo_principal_de_categoria: ["V1.72141015", "V1.80101600", "V1.72140000", "1234567890"][i % 4],
      precio_base: String(200e6 + i),
    }));

    let t = Date.now();
    for (const l of corpus) filtros.admisibleParaIngesta(l);
    const msIngesta = Date.now() - t;
    assert.ok(msIngesta < N, `la ingesta tardó ${msIngesta} ms en ${N} procesos (límite: 1 ms por proceso)`);

    t = Date.now();
    for (const l of corpus) filtros.evaluarObjeto(l, PERFILES.helder, {});
    const msConsulta = Date.now() - t;
    assert.ok(msConsulta < 500, `el juicio fino tardó ${msConsulta} ms sobre ${N} procesos (límite: 500 ms)`);
    console.log(`· unidad rendimiento: ingesta ${msIngesta} ms y juicio ${msConsulta} ms sobre ${N} procesos (límites 2600/500)`);
  }

  /* unidad: anti-suministro — bloquea la compra pura, jamás la obra que
     además compra materiales (los dos casos exactos del encargo) */
  {
    const casos = [
      ["CONSTRUCCIÓN DE AULA ESCOLAR INCLUYENDO SUMINISTRO DE MOBILIARIO", "V1.56112000", true],
      ["SUMINISTRO DE MOBILIARIO ESCOLAR", "V1.56112000", false],
      ["Construcción de vía incluyendo suministro de materiales", "V1.30111500", true],
      ["Ejecución de obras de acueducto con suministro de tubería", "V1.40171500", true],
      ["Adecuación de sede con adquisición de equipos", "V1.43211700", true],
      ["Adquisición de equipos de cómputo", "V1.43211700", false],
    ];
    for (const [nombre, codigo, esperado] of casos) {
      const ev = filtros.evaluarObjeto(
        { nombre_del_procedimiento: nombre, descripci_n_del_procedimiento: "", codigo_principal_de_categoria: codigo },
        PERFILES.juntos);
      assert.strictEqual(ev.ok, esperado,
        `«${nombre}» esperaba ${esperado ? "PASAR" : "caer"}, motivo: ${ev.motivo}`);
      if (!esperado) assert.strictEqual(ev.paso, "anti_suministro", `«${nombre}» debía caer por la capa anti-suministro`);
    }
    console.log(`· unidad anti-suministro (obra vs compra pura): ${casos.length} casos correctos`);
  }

  /* unidad: capacidad — fórmula única, escalas de la Guía y consorcio */
  {
    // una sola implementación para toda la app (web y cron llegan a la misma función)
    assert.strictEqual(require("../lib/rup.js").kContratacion, capacidad.crp,
      "rup.kContratacion debe SER capacidad.crp (fórmula única)");
    // escalas con >= en los cortes exactos
    assert.strictEqual(capacidad.factorE(3, 1), 120);
    assert.strictEqual(capacidad.factorE(2, 1), 100);
    assert.strictEqual(capacidad.factorE(1, 1), 80);
    assert.strictEqual(capacidad.factorE(0.9, 1), 60);
    assert.strictEqual(capacidad.factorCT(11), 40);
    assert.strictEqual(capacidad.factorCT(6), 30);
    assert.strictEqual(capacidad.factorCT(1), 20);
    assert.strictEqual(capacidad.factorCF(1.5), 40);
    assert.strictEqual(capacidad.factorCF(1.2), 30);
    assert.strictEqual(capacidad.factorCF(1.0), 20);
    assert.strictEqual(capacidad.factorCF(0.9), 0);
    // CRPC oficial: directo con plazo ≤12, proporcional lineal si >12
    assert.strictEqual(capacidad.calcCRPC(1000e6, 30, 6), 700e6);
    assert.strictEqual(capacidad.calcCRPC(1000e6, 30, 24), 350e6);
    // CRP de Helder a mano: CO = 198 810 000 × 16.7 = 3 320 127 000;
    // presupuesto 300M → 171,34 SMMLV; exp 6768,87/171,34 ≥ 3 → E=120;
    // CT(1)=20, CF(129,12)=40; SCE = 443 141 528×0,6×8/12 = 177 256 611,2
    // → CRP = 3 320 127 000×1,80 − 177 256 611,2 = 5 798 971 988,8
    assert.strictEqual(Math.round(capacidad.crp(PERFILES.helder, 300e6)), 5798971989);
    // consorcio = SUMA de las CRP de los integrantes (Guía CCE), no ponderado
    const p = 300e6;
    assert.ok(Math.abs(capacidad.crp(PERFILES.juntos, p)
      - (capacidad.crp(PERFILES.helder, p) + capacidad.crp(PERFILES.genesis, p))) < 1e-6,
      "CRP del consorcio debe ser la suma de las CRP de los integrantes");
    // indicadores habilitantes del consorcio ponderados 50/50 (calculados)
    assert.ok(Math.abs(PERFILES.juntos.liquidez - 68.05) < 1e-9, "liquidez ponderada 50/50");
    assert.strictEqual(PERFILES.juntos.patrimonio, Math.round((1107252964 + 211340888) / 2));
    assert.strictEqual(PERFILES.juntos.utilidadOp, Math.round((198810000 + 150244977) / 2));
    // el CO estimado se declara (el RUP no trae ingreso operacional)
    assert.strictEqual(capacidad.coEstimado(PERFILES.helder), true);
    assert.strictEqual(capacidad.coEstimado(PERFILES.juntos), true);
    console.log("· unidad capacidad: fórmula única, escalas de la Guía, CRPC y consorcio (suma) correctos");
  }

  /* unidad: normalización de nombres de entidad para el detalle. Es lo que
     decide si «  alcaldia   de purificacion » encuentra los procesos de
     «ALCALDÍA DE PURIFICACIÓN», y tiene que ser O(1) por proceso. */
  {
    const { claveBusqueda, claveIndice, memoNormalizador } = competenciaDetalle;
    const mismas = [
      "ALCALDÍA DE PURIFICACIÓN", "alcaldia de purificacion",
      "  ALCALDIA   DE    PURIFICACION  ", "Alcaldía de Purificación.",
    ];
    const ref = claveBusqueda(mismas[0]);
    for (const v of mismas) assert.strictEqual(claveBusqueda(v), ref, `«${v}» debía normalizar igual`);
    // la puntuación no puede partir una entidad en dos (nombres reales de CAR)
    assert.strictEqual(claveBusqueda("CORPORACION AUTONOMA REGIONAL DE LOS RIOS NEGRO - NARE"),
      claveBusqueda("Corporación Autónoma Regional de los Ríos Negro Nare"));
    // …pero entidades distintas siguen siendo distintas
    assert.notStrictEqual(claveBusqueda("ALCALDÍA DE IBAGUÉ"), claveBusqueda("ALCALDÍA DE PURIFICACIÓN"));
    /* LAS DOS CLAVES SON LA MISMA FUNCIÓN (ago 2026). Antes eran dos: el
       recuento agrupaba sin puntuación y el índice se leía con ella, así que
       «… - NARE» y «… NARE» se sumaban al contar y no al leer. Que sean
       idénticas es la corrección; comprobarlo con un nombre sin puntuación no
       probaría nada, por eso el caso lleva guion. */
    assert.strictEqual(claveIndice, claveBusqueda,
      "agrupar el corpus y leer el índice tienen que usar LA MISMA definición de entidad");
    assert.strictEqual(claveIndice("CORPORACION ... RIOS NEGRO - NARE"),
      claveIndice("Corporación ... Ríos Negro Nare"),
      "la clave del índice tampoco puede partir una entidad por un guion");
    // y es la misma que usa el índice al construirse
    assert.strictEqual(claveIndice("ALCALDÍA DE PURIFICACIÓN"),
      indiceComp.claveEntidad({ entidad: "ALCALDÍA DE PURIFICACIÓN" }).clave,
      "el detalle debe leer el hash con la clave con la que el índice lo escribió");
    // memoización: el trabajo caro corre una vez por nombre DISTINTO
    let llamadas = 0;
    const memo = memoNormalizador((s) => { llamadas++; return claveBusqueda(s); });
    for (let i = 0; i < 500; i++) memo("ALCALDÍA DE PURIFICACIÓN");
    memo("IDU");
    assert.strictEqual(llamadas, 2, `esperaba 2 normalizaciones reales, hubo ${llamadas}`);
    console.log("· unidad detalle de competencia: normalización estable, puntuación tolerada y memoizada");
  }

  /* unidad: tertiles, mediana y lectura de oferentes/adjudicación del índice */
  {
    // seis entidades: los cortes deben repartirlas 2/2/2 y respetar empates
    const cortes = indiceComp.cortesTertiles([2, 3, 8, 8, 18, 20]);
    assert.strictEqual(indiceComp.nivelPorCortes(2, cortes), "baja");
    assert.strictEqual(indiceComp.nivelPorCortes(3, cortes), "baja");
    assert.strictEqual(indiceComp.nivelPorCortes(8, cortes), "media", "los empates deben caer en el mismo nivel");
    assert.strictEqual(indiceComp.nivelPorCortes(18, cortes), "alta");
    assert.strictEqual(indiceComp.nivelPorCortes(20, cortes), "alta");
    // tres entidades (el caso del encargo): una por tertil
    const c3 = indiceComp.cortesTertiles([3, 8, 18]);
    assert.deepStrictEqual([3, 8, 18].map((p) => indiceComp.nivelPorCortes(p, c3)), ["baja", "media", "alta"]);
    // todas iguales: ninguna destaca → "media" (jamás todas "baja")
    const cIguales = indiceComp.cortesTertiles([5, 5, 5]);
    assert.strictEqual(indiceComp.nivelPorCortes(5, cIguales), "media");
    // mediana desde histograma, par e impar
    assert.strictEqual(indiceComp.medianaHistograma({ 2: 1, 3: 3, 4: 1 }, 5), 3);
    assert.strictEqual(indiceComp.medianaHistograma({ 7: 2, 8: 4, 9: 2 }, 8), 8);
    assert.strictEqual(indiceComp.medianaHistograma({ 1: 1, 5: 1 }, 2), 3);
    // 0 oferentes = SIN DATO (hueco del dataset), no "nadie se presentó"
    assert.strictEqual(indiceComp.oferentesDe({ numero_de_ofertas: "0" }), null);
    assert.strictEqual(indiceComp.oferentesDe({ numero_de_ofertas: "4" }), 4);
    assert.strictEqual(indiceComp.oferentesDe({ proveedores_unicos_con: "9" }), 9);
    assert.strictEqual(indiceComp.oferentesDe({}), null);
    // evidencia de adjudicación
    assert.strictEqual(indiceComp.esAdjudicado({ adjudicado: "Si" }), true);
    assert.strictEqual(indiceComp.esAdjudicado({ nombre_del_proveedor: "X SAS" }), true);
    assert.strictEqual(indiceComp.esAdjudicado({ estado_del_procedimiento: "Celebrado" }), true);
    assert.strictEqual(indiceComp.esAdjudicado({ estado_del_procedimiento: "Publicado" }), false);
    // la entidad se identifica igual con y sin NIT
    assert.strictEqual(indiceComp.claveEntidad({ entidad: "ALCALDÍA DE PURIFICACIÓN" }).clave,
      indiceComp.claveEntidad({ entidad: "Alcaldia de Purificacion", nit_entidad: "800100001" }).clave);
    console.log("· unidad índice de competencia: tertiles con empates, mediana, oferentes 0 = sin dato");
  }

  /* unidad: NINGÚN promedio sin base — el defecto «18.2 oferentes en 0 procesos»
     ------------------------------------------------------------------------
     `indice:competencia` NO SE PURGA NUNCA (es su razón de ser), así que en
     producción sigue vivo el hash que escribió una versión anterior. Estos
     casos son registros CORRUPTOS o VIEJOS metidos a mano: la guarda de
     `competenciaDe` tiene que neutralizarlos SIN reconstruir el índice, porque
     reconstruirlo es un paso manual que el dueño puede tardar días en dar. */
  {
    const lic = { entidad: "AEROCIVIL" };
    const clave = filtros.norm("AEROCIVIL");
    const casos = [
      ["el defecto reportado: promedio con CERO procesos",
        { procesos: 0, promedio: 18.2, nivel: "alta" }],
      ["promedio por debajo del mínimo (índice escrito por la versión anterior)",
        { procesos: 3, promedio: 18.2, nivel: "sin_dato" }],
      ["…y aunque la versión vieja lo hubiera clasificado igualmente",
        { procesos: 3, promedio: 18.2, nivel: "alta" }],
      ["conteo como CADENA: '0' es truthy y colaba por la guarda anterior",
        { procesos: "0", promedio: 18.2, nivel: "alta" }],
      ["nivel corrupto con procesos de sobra: sin clasificación no hay cifra",
        { procesos: 40, promedio: 18.2, nivel: "altísima" }],
      ["nivel clasificado pero sin promedio: no se inventa",
        { procesos: 40, promedio: null, nivel: "alta" }],
      ["registro con el nombre nuevo del campo (procesos_contados)",
        { procesos_contados: 3, promedio: 18.2, nivel: "alta" }],
    ];
    for (const [que, registro] of casos) {
      const c = indiceComp.competenciaDe({ [clave]: registro }, lic);
      assert.strictEqual(c.promedio_oferentes, null, `${que}: se filtró un promedio sin base`);
      assert.strictEqual(c.nivel, "sin_dato", `${que}: no puede haber nivel sin base`);
      assert.strictEqual(c.mediana_oferentes, null, `${que}: tampoco la mediana`);
      assert.ok(typeof c.total_procesos === "number" && !isNaN(c.total_procesos),
        `${que}: el conteo debe seguir siendo un número (es lo que explica el ⚪)`);
    }
    // …y un registro legítimo sigue pasando entero
    const bueno = indiceComp.competenciaDe({ [clave]: { procesos: 12, promedio: 18.2, mediana: 18, nivel: "alta" } }, lic);
    assert.deepStrictEqual(bueno, { nivel: "alta", promedio_oferentes: 18.2, mediana_oferentes: 18, total_procesos: 12 },
      "la guarda no puede llevarse por delante un registro con base suficiente");
    // el ESCRITOR, además, ya no publica cifras derivadas por debajo del mínimo
    const pub = indiceComp.registroPublicado({ nombre: "X", nit: null, procesos: 3, oferentes_total: 40, promedio: 13.3, mediana: 13, nivel: "sin_dato" });
    assert.strictEqual(pub.promedio, null);
    assert.strictEqual(pub.mediana, null);
    assert.strictEqual(pub.oferentes_total, null, "publicar la suma permitiría recalcular el promedio anulado");
    assert.strictEqual(pub.procesos, 3, "el CONTEO sí se publica: es un hecho y explica el ⚪");
    assert.strictEqual(pub.procesos_contados, 3, "alias para quien lea el campo por su nombre largo");
    console.log(`· unidad badge sin base: ${casos.length} registros corruptos o viejos neutralizados sin reconstruir el índice`);
  }

  /* unidad: IDENTIDAD DE LA ENTIDAD — el nombre exacto manda sobre el alias
     ------------------------------------------------------------------------
     Un NIT NO identifica una entidad: las regionales de un organismo publican
     con el de la matriz. El alias `nit:{NIT}` iba PRIMERO en la búsqueda, así
     que una entidad con su nombre bien escrito y su propio registro acababa
     enseñando las cifras de su hermana. Estos hashes son los que hay HOY en
     producción (con alias ambiguos ya escritos): la corrección tiene que
     neutralizarlos sin reconstruir nada. */
  {
    const NORTE = indiceComp.claveCanonica(AEROCIVIL_NORTE);
    const SUR = indiceComp.claveCanonica(AEROCIVIL_SUR);
    const hash = {
      [NORTE]: { nombre: AEROCIVIL_NORTE, procesos: 9, promedio: 2, mediana: 2, nivel: "baja" },
      [SUR]: { nombre: AEROCIVIL_SUR, procesos: 40, promedio: 27.6, mediana: 28, nivel: "alta" },
      [`nit:${NIT_COMPARTIDO}`]: { ref: SUR }, // el alias ambiguo, apuntando a UNA
    };
    const norte = indiceComp.competenciaDe(hash, { entidad: AEROCIVIL_NORTE, nit_entidad: NIT_COMPARTIDO });
    assert.strictEqual(norte.nivel, "baja",
      "el nombre EXACTO tiene que ganarle al alias: si no, esta entidad hereda el nivel de su hermana");
    assert.strictEqual(norte.total_procesos, 9, "…y sus cifras, no las de la otra");
    const sur = indiceComp.competenciaDe(hash, { entidad: AEROCIVIL_SUR, nit_entidad: NIT_COMPARTIDO });
    assert.strictEqual(sur.nivel, "alta", "la entidad a la que sí apunta el alias no puede verse afectada");

    // el alias SIGUE sirviendo para lo que existe: un cambio de razón social
    // (nombre que no está en el índice) resuelve por NIT
    const renombrada = indiceComp.competenciaDe(hash, { entidad: "AEROCIVIL REGIONAL SUR SAS", nit_entidad: NIT_COMPARTIDO });
    assert.strictEqual(renombrada.nivel, "alta", "sin el nombre en el índice, el alias por NIT sigue siendo el puente");

    /* Y la clave LEGADO: el hash de producción está escrito con `norm` a secas
       (con la puntuación dentro). Desplegar no puede dejarlo todo en ⚪. */
    const conGuion = { [filtros.norm(ENTIDAD_GUION)]: { procesos: 12, promedio: 9, mediana: 9, nivel: "media" } };
    assert.strictEqual(indiceComp.competenciaDe(conGuion, { entidad: ENTIDAD_GUION }).nivel, "media",
      "un índice escrito con la clave anterior tiene que seguir resolviéndose hasta que se reconstruya");
    // y la clave canónica ve la misma entidad escrita de las dos formas
    assert.strictEqual(indiceComp.claveCanonica(ENTIDAD_GUION), indiceComp.claveCanonica(ENTIDAD_GUION_SIN),
      "dos grafías que solo difieren en la puntuación son la MISMA entidad");
    console.log("· unidad identidad de entidad: el nombre exacto gana al alias por NIT; clave legado y canónica resuelven");
  }

  /* unidad: experiencia ejecutada — tokenización, similitud y criticidad.
     Las tres cosas que deciden qué se le recomienda inscribir al dueño, sin
     Redis de por medio. */
  {
    const exp = require("../lib/experiencia.js");
    const cob = require("../lib/cobertura_rup.js");

    // tokenizar: fuera las stopwords, fuera los códigos, y sin tildes
    const t = exp.tokenizar("PRESTACIÓN DE SERVICIOS PARA LA CONSTRUCCIÓN DE PLACA HUELLA CM-001 DE 2024");
    assert.deepStrictEqual(t, ["construccion", "placa", "huella"],
      `la tokenización dejó pasar trámite o códigos: ${JSON.stringify(t)}`);
    assert.deepStrictEqual(exp.tokenizar("Diseño y señalización vial"), ["disenno".replace("nn", "n"), "senalizacion", "vial"],
      "los términos deben compararse sin tildes ni ñ (misma base que el resto del proyecto)");

    // vocabulario: frecuencia por CONTRATO, no por aparición
    const v = exp.construirVocabulario([
      { objeto: "CONSTRUCCION DE PLACA HUELLA, PLACA HUELLA Y MAS PLACA HUELLA" },
      { objeto: "CONSTRUCCION DE ALCANTARILLADO SANITARIO" },
    ]);
    assert.strictEqual(v.terminos.construccion, 2, "«construccion» está en los dos contratos");
    assert.strictEqual(v.terminos.placa, 1, "la frecuencia se cuenta por contrato, no por repetición dentro del objeto");

    // similitud: el denominador son los términos ÚNICOS del objeto comparado
    const set = new Set(Object.keys(v.terminos));
    assert.strictEqual(exp.similitud("CONSTRUCCION DE PLACA HUELLA", set).score, 1);
    assert.strictEqual(exp.similitud("SUMINISTRO DE PAPELERIA", set).score, 0);
    assert.strictEqual(exp.nivelRelevancia(0.31), "alta");
    assert.strictEqual(exp.nivelRelevancia(0.15), "moderada"); // el umbral ENTRA
    assert.strictEqual(exp.nivelRelevancia(0.149), "baja");

    // validación: los dos casos que el encargo nombra explícitamente
    assert.strictEqual(exp.validarContratos({ contratos: [] }).ok, false, "un arreglo vacío no es una carga");
    assert.strictEqual(exp.validarContratos({
      contratos: [{ objeto: "CONSTRUCCION DE PLACA HUELLA", valor_smmlv: 450.5 }],
    }).ok, true, "con valor_smmlv basta: no hacen falta los dos valores");
    // los números que llegan como cadena (copiar y pegar de una hoja de cálculo)
    assert.strictEqual(exp.numeroTolerante("350.000.000"), 350000000);
    assert.strictEqual(exp.numeroTolerante("450,5"), 450.5);

    // segmentos: 70-95 menos los servicios NO constructivos (la misma lista de
    // la capa anti-suministro: si allí no ancla obra, aquí no es hueco de obra)
    assert.deepStrictEqual(["72", "77", "95", "56", "80", "85", "99"].map(cob.segmentoAdmisible),
      [true, true, true, false, false, false, false]);

    // criticidad: la cascada, con el caso ambiguo del encargo resuelto
    const c = (procesos, altamente, score, obraClara = true) =>
      cob.clasificar({ procesos, altamente, scorePromedio: score, obraClara, conExperiencia: true });
    assert.strictEqual(c(15, 15, 1), "CRÍTICO");
    assert.strictEqual(c(15, 15, 1, false), "ALTO", "sin ser obra pura, 15 procesos no obligan a inscribir");
    assert.strictEqual(c(12, 0, 0.16), "ALTO", "≥10 procesos sin ninguno muy similar no llega a CRÍTICO");
    assert.strictEqual(c(6, 1, 0.18), "ALTO");
    assert.strictEqual(c(3, 1, 0.25), "ALTO", "con ≥2 procesos, el promedio ≥0,20 basta para ALTO");
    assert.strictEqual(c(3, 1, 0.17), "MEDIO");
    assert.strictEqual(c(3, 0, 0.17), "BAJO", "pocos procesos y ninguno muy similar: evidencia débil");
    assert.strictEqual(c(1, 1, 1), "BAJO", "un solo proceso nunca es evidencia suficiente");
    // sin experiencia la cascada cae a los conteos y NO inventa un score
    const cb = (procesos) => cob.clasificar({ procesos, altamente: 0, scorePromedio: 0, obraClara: true, conExperiencia: false });
    assert.deepStrictEqual([cb(10), cb(5), cb(2), cb(1)], ["CRÍTICO", "ALTO", "MEDIO", "BAJO"]);

    // el puntaje combinado del encargo: 60 % volumen, 40 % similitud
    assert.strictEqual(cob.puntajeCombinado(10, 0.5), Math.round((10 * 0.6 + 50 * 0.4) * 100) / 100);
    assert.ok(cob.puntajeCombinado(10, 0.9) > cob.puntajeCombinado(10, 0.1),
      "a igual volumen, más similitud tiene que ordenar antes");
    console.log("· unidad experiencia/cobertura: tokenización, similitud, validación y la cascada de criticidad");
  }

  async function limpiarRedis() {
    const claves = [
      ...(await redis.scan("licitaciones:*")), ...(await redis.scan("lock:sync*")),
      ...(await redis.scan("indice:*")), ...(await redis.scan("sync:historico:*")),
      ...(await redis.scan("equivalencias:*")), ...(await redis.scan("vocabulario:*")),
      // la configuración del RUP y la caché del panel viven fuera de
      // `licitaciones:*` a propósito (ninguna purga del corpus las toca), así
      // que hay que borrarlas aquí o una iteración contaminaría la siguiente
      ...(await redis.scan("config:*")), ...(await redis.scan("resumen:*")),
      // la caché de la auditoría de cobertura vive una hora: sin borrarla, la
      // iteración siguiente auditaría con el histórico de la anterior
      ...(await redis.scan("cobertura:*")),
    ];
    if (claves.length) await redis.del(...claves);
    for (const patron of ["licitaciones:*", "indice:*", "sync:historico:*", "equivalencias:*",
      "vocabulario:*", "config:*", "resumen:*", "cobertura:*"]) {
      assert.strictEqual((await redis.scan(patron)).length, 0, `Redis no quedó limpio: ${patron}`);
    }
    // los perfiles vuelven a los datos del repositorio: una carga de RUP de la
    // iteración anterior no puede cambiar los números de esta
    perfilesMod.restablecerPerfiles();
  }

  /* Todos los registros del corpus histórico, leídos como los leería el índice. */
  async function leerHistorico() {
    const claves = await redis.scan(CLAVES.patronChunksHist);
    const filas = [];
    for (const b of await redis.mget(claves)) for (const r of (descomprimir(b) || [])) filas.push(r);
    return filas;
  }
  async function leerActivo() {
    const claves = await redis.scan(CLAVES.patronChunks);
    const filas = [];
    for (const b of await redis.mget(claves)) for (const r of (descomprimir(b) || [])) filas.push(r);
    return filas;
  }

  async function todasLasOportunidades(params) {
    const filas = [];
    for (let pag = 1; pag < 50; pag++) {
      const r = await invocar(oportunidades, `/api/oportunidades?${params}&por_pagina=100&pagina=${pag}`, CAB_TOKEN);
      assert.strictEqual(r.status, 200, `esperaba 200, llegó ${r.status}: ${JSON.stringify(r.cuerpo).slice(0, 200)}`);
      filas.push(...r.cuerpo.resultados);
      if (filas.length >= r.cuerpo.total) break;
    }
    return filas;
  }

  async function iteracion(n) {
    const t0 = Date.now();
    // el dataset trae el año vigente Y los dos anteriores: la full solo debe
    // ver el vigente (consulta mes a mes del año en curso)
    socrata.setDataset([...generarDataset(), ...generarDatasetHistorico(), ...generarDatasetEquivalencias(),
      ...generarDatasetDetalle(), ...generarDatasetCobertura()]);
    socrata.setFallos(true);

    /* a. limpiar Redis */
    await limpiarRedis();

    /* a'. Redis vacío → 503 con mensaje de sincronización */
    {
      const r = await invocar(oportunidades, "/api/oportunidades?perfil=helder", CAB_TOKEN);
      assert.strictEqual(r.status, 503, "sin datos debía responder 503");
      assert.ok(/Sincronizaci[oó]n iniciada/.test(r.cuerpo.error), `mensaje 503 inesperado: ${r.cuerpo.error}`);
      assert.strictEqual(r.cuerpo.ok, false);
    }

    /* a-bis. /api/resumen sobre un corpus VACÍO: no puede ser un 500 ni un
       503 críptico. Responde 200 con visibles=0 y dice qué hacer. */
    {
      const r = await invocar(resumen, "/api/resumen?perfil=helder", CAB_TOKEN);
      assert.strictEqual(r.status, 200, "resumen con corpus vacío debía responder 200");
      assert.strictEqual(r.cuerpo.ok, true);
      assert.strictEqual(r.cuerpo.totales.visibles, 0, "sin chunks no puede haber visibles");
      assert.ok(/Ejecute \/api\/sync/.test(r.cuerpo.mensaje || ""),
        `el mensaje debe decir cómo arreglarlo: ${r.cuerpo.mensaje}`);
      assert.strictEqual(r.cabeceras["x-cache"], "MISS", "sin caché la cabecera debe decir MISS");
      assert.strictEqual(r.cabeceras["cache-control"], "no-store", "el cliente no debe cachear el resumen");
    }

    /* a''. candado ocupado → enCurso, sin tocar datos */
    {
      await redis.set("lock:sync", "otro-proceso", { nx: true, ex: 60 });
      const r = await invocar(sync, "/api/sync?modo=full&chain=0");
      assert.strictEqual(r.cuerpo.enCurso, true, "con candado ajeno debía responder enCurso");
      await redis.del("lock:sync");
    }

    /* b. carga completa con presupuesto corto (reanudable) + fallos inyectados */
    let r = await invocar(sync, "/api/sync?modo=full&presupuesto=150&chain=0");
    assert.strictEqual(r.status, 200);
    assert.strictEqual(r.cuerpo.ok, true, `sync full falló: ${JSON.stringify(r.cuerpo)}`);
    let invocaciones = 1;
    while (r.cuerpo.done === false) {
      r = await invocar(sync, "/api/sync?modo=auto&presupuesto=150&chain=0");
      assert.strictEqual(r.cuerpo.ok, true, `continuación falló: ${JSON.stringify(r.cuerpo)}`);
      if (++invocaciones > 400) throw new Error("la carga completa no converge");
    }
    assert.ok(invocaciones >= 2, "el presupuesto corto debía forzar varias invocaciones (reanudable)");
    const chunks = await redis.scan(CLAVES.patronChunks);
    assert.ok(chunks.length >= MESES.length, `esperaba ≥${MESES.length} chunks activos, hay ${chunks.length}`);
    assert.strictEqual((await redis.scan(CLAVES.patronChunksHist)).length, 0,
      "la full NO debe escribir en el corpus histórico");
    assert.ok(!chunks.some((k) => ANOS_HIST.some((y) => k.includes(`:mes:${y}-`))),
      "la full del año vigente se llevó meses de años anteriores");
    const meta = JSON.parse(await redis.get("licitaciones:meta"));
    assert.ok(meta.last_full && meta.last_sync, "meta sin sellos de sincronización");
    assert.strictEqual(Object.keys(meta.porMes).length, MESES.length, "faltan meses en la auditoría");
    const POR_MES = 120 + EXTRAS_POR_MES;
    for (const mes of MESES) {
      assert.strictEqual(meta.porMes[mes].leidas, POR_MES, `${mes}: leídas ${meta.porMes[mes].leidas} ≠ ${POR_MES} esperadas`);
      assert.strictEqual(meta.porMes[mes].esperados, POR_MES, `${mes}: count(*) no auditado`);
    }
    assert.ok(meta.total > 0 && meta.total < meta.leidas, "el prefiltro RUP debía descartar parte del dataset");
    assert.strictEqual(await redis.get("lock:sync"), null, "el candado no se liberó");

    /* c. oportunidades para Helder */
    const rHelder = await invocar(oportunidades, "/api/oportunidades?perfil=helder", CAB_TOKEN);
    assert.strictEqual(rHelder.status, 200);
    const cH = rHelder.cuerpo;
    assert.ok(cH.ok && cH.total > 0 && cH.resultados.length > 0, "helder sin resultados");
    assert.strictEqual(cH.perfil, "helder");
    for (const l of cH.resultados) {
      assert.strictEqual(typeof l.anticipo_pct, "number", "falta anticipo_pct");
      assert.ok(["bajo", "medio", "alto"].includes(l.cuantia_rango), "cuantia_rango inválido");
      assert.ok(["baja", "media", "alta"].includes(l.nivel_competencia), "nivel_competencia inválido");
      assert.strictEqual(typeof l.ubicacion_valida, "boolean", "falta ubicacion_valida");
      /* `puntaje_ponderado` SÍ viaja, aunque ya no sea criterio de decisión: lo
         sustituyen las cuatro puertas, la probabilidad y el valor esperado, y la
         tarjeta no lo pinta. Se conserva en el contrato de la API porque es lo
         que permite el A/B por URL (`ordenar_por=puntaje` contra el orden nuevo)
         y porque /api/resumen lo calcula — dos consumidores del mismo campo no
         pueden discrepar sobre si existe. */
      assert.strictEqual(typeof l.puntaje_ponderado, "number",
        "puntaje_ponderado tiene que seguir viajando para poder comparar el orden nuevo contra el viejo");
      assert.ok(l.puertas && l.puertas.p1_rup && l.puertas.p2_k && l.puertas.p3_caja && l.puertas.p4_competencia,
        "falta el veredicto de las cuatro puertas");
      assert.ok(typeof l.p_ganar === "number" && l.p_ganar > 0 && l.p_ganar <= 1, "p_ganar fuera de rango");
      assert.strictEqual(l.ve, Math.round((l.cuantia_cop || 0) * l.p_ganar), "VE no es p_ganar × cuantía");
      assert.strictEqual(l.proceso_abierto, true, "apareció un proceso cerrado");
      assert.ok(filtros.estado_abierto(l), "estado no abierto servido");
      assert.ok(filtros.modalidad_competitiva(l), `modalidad no competitiva servida: ${l.modalidad_de_contratacion}`);
      assert.strictEqual(rup_valido(l, "helder"), true, `filtro RUP no aplicado: ${l.nombre_del_procedimiento}`);
      assert.ok(l.rup && l.rup.ok, "falta el detalle rup del resultado");
      assert.strictEqual(typeof l.rup.co_estimado, "boolean", "falta co_estimado en el detalle rup");
      assert.ok(!/canino|alimentaci/i.test(l.nombre_del_procedimiento), "se coló un objeto de blacklist");
    }

    /* c-bis. corpus completo de Helder: la cascada dejó fuera lo que debía */
    {
      const todasH = await todasLasOportunidades("perfil=helder");
      assert.ok(!todasH.some((l) => /directa|r[ée]gimen especial$/i.test(l.modalidad_de_contratacion)),
        "se sirvió un proceso de Contratación Directa o régimen especial sin ofertas");
      assert.ok(!todasH.some((l) => /Adjudicado/i.test(l.estado_del_procedimiento)),
        "se sirvió un proceso Adjudicado");
      assert.ok(!todasH.some((l) => /suministro de mobiliario/i.test(l.nombre_del_procedimiento)),
        "la capa anti-suministro dejó pasar una compra pura de mobiliario");
      assert.ok(todasH.some((l) => /Instalaci[oó]n y montaje de mobiliario/i.test(l.nombre_del_procedimiento)),
        "la instalación/montaje (verbo de obra, segmento 56) debía pasar y no aparece");
      assert.ok(todasH.some((l) => /Convocado/i.test(l.estado_del_procedimiento)),
        "los procesos Convocado (abiertos) debían aparecer");

      /* ESTADO «Activo»: el defecto era que se descartaban EN SILENCIO. El caso
         unitario prueba la clasificación; esto prueba que la full los ingiere y
         que llegan a la pantalla, que es lo que el dueño no veía. */
      {
        const activos = todasH.filter((l) => /estado Activo/i.test(l.nombre_del_procedimiento || ""));
        assert.strictEqual(activos.length, MESES.length,
          `un proceso «Activo» por mes debía llegar al listado; llegaron ${activos.length} de ${MESES.length}`);
        for (const l of activos) {
          assert.strictEqual(l.estado_del_procedimiento, "Activo");
          assert.strictEqual(l.proceso_abierto, true,
            "el sello guardado en la ingesta también tiene que decir abierto: es un AND con la reclasificación");
          assert.ok(filtros.estado_abierto(l), "la reclasificación al servir debe confirmarlo");
        }
        // y siguen guardados en Redis, no es que la consulta los rescate
        assert.ok((await leerActivo()).some((r) => /estado Activo/i.test(r.nombre_del_procedimiento || "")),
          "los «Activo» tienen que estar GUARDADOS: el filtro de estado corre en la ingesta");
      }

      /* CONVENIOS: no son licitaciones y no pueden llegar a la pantalla */
      assert.ok(!todasH.some((l) => /aunar\s+esfuerzos/i.test(l.nombre_del_procedimiento)),
        "se sirvió un «AUNAR ESFUERZOS» (convenio interadministrativo)");
      assert.ok(!todasH.some((l) => /^convenio\s+interadministrativo/i.test(l.nombre_del_procedimiento)),
        "se sirvió un proceso cuyo objeto ES un convenio interadministrativo");
      // …pero la obra real que solo MENCIONA un convenio sí debe aparecer
      assert.ok(todasH.some((l) => /vereda El Cairo/i.test(l.nombre_del_procedimiento)),
        "el filtro de convenios se llevó por delante una obra que solo mencionaba uno");
      /* UNSPSC a nivel de PRODUCTO dentro de una clase del RUP: debe pasar
         (con la comparación exacta de 8 dígitos anterior era invisible) */
      assert.ok(todasH.some((l) => l.codigo_principal_de_categoria === "V1.72141015"),
        "un proceso con UNSPSC de producto (72141015) de una clase del RUP (72141000) no llegó a la pantalla");

      /* ---- FALSOS POSITIVOS: código del RUP, objeto ajeno → NO se sirven ---- */
      for (const [patron, que] of [
        [/IMPRESI[OÓ]N Y FOTOCOPIA/i, "impresión y fotocopia (80101600)"],
        [/SUMINISTRO DE ALIMENTOS/i, "suministro de alimentos (80111600)"],
        [/INTERNET DEDICADO/i, "internet dedicado (80101600)"],
        [/CUMPLEA[NÑ]OS/i, "logística de un cumpleaños (80111600)"],
      ]) {
        assert.ok(!todasH.some((l) => patron.test(l.nombre_del_procedimiento)),
          `la capa de pertinencia dejó pasar un falso positivo: ${que}`);
      }

      /* ---- FALSOS NEGATIVOS: el matching jerárquico y el texto los rescatan ---- */
      const rescatados = [
        [/publicado por familia/i, "familia", "obra publicada a nivel de FAMILIA (72140000)"],
        [/publicada por segmento/i, "texto", "obra publicada solo con el SEGMENTO (72000000)"],
        [/c[oó]digo ilegible/i, "texto", "obra cuyo código no es un UNSPSC (10 dígitos)"],
      ];
      for (const [patron, tierEsperado, que] of rescatados) {
        const l = todasH.find((x) => patron.test(x.nombre_del_procedimiento));
        assert.ok(l, `no se rescató ${que}`);
        assert.strictEqual(l.rup.tier, tierEsperado, `${que}: tier ${l.rup.tier}, esperaba ${tierEsperado}`);
        assert.ok(l.rup.unspsc.mensaje, "el veredicto debe explicar por qué casó");
        assert.ok(l.rup.pertinencia && l.rup.pertinencia.etiqueta, "falta la etiqueta de pertinencia");
      }

      /* ---- INGESTA ANCHA + JUICIO FINO: lo guardado ≠ lo servido ---- */
      const enRedis = await leerActivo();
      assert.ok(enRedis.some((r) => /IMPRESI[OÓ]N Y FOTOCOPIA/i.test(r.nombre_del_procedimiento)),
        "la ingesta debe GUARDAR el proceso dudoso (si lo filtrara, afinar la regla exigiría otra full)");
      assert.ok(enRedis.some((r) => r.codigo_principal_de_categoria === `V1.${CLASE_AFIN}`),
        "la ingesta debe guardar la clase afín aunque ningún RUP la tenga");
      assert.ok(!enRedis.some((r) => /aunar\s+esfuerzos/i.test(r.nombre_del_procedimiento)),
        "un convenio no puede llegar ni siquiera a Redis");

      /* ---- la clase AFÍN todavía NO es visible: el histórico no se ha bajado ---- */
      assert.ok(!todasH.some((l) => l.codigo_principal_de_categoria === `V1.${CLASE_AFIN}`),
        "sin equivalencias aprendidas, una clase fuera del RUP y sin objeto de obra no puede verse");

      /* ---- lo que destapó el diagnóstico real: nada de esto puede verse ---- */
      for (const [patron, que] of [
        [/^CONVOCATORIA PUBLICA/i, "objeto genérico «CONVOCATORIA PUBLICA»"],
        [/CONCURSO DE MERITOS INV-CM/i, "objeto genérico (trámite + código interno)"],
        [/INTERNET DEDICADO/i, "internet, aunque el objeto mencione instalación y canalización"],
        [/Servicio integral para la institucion educativa/i, "ruta de texto sin pertinencia verde"],
      ]) {
        assert.ok(!todasH.some((l) => patron.test(l.nombre_del_procedimiento)),
          `se sirvió lo que no debía: ${que}`);
      }

      /* ---- el TOGGLE «Incluir procesos sin código UNSPSC» ---- */
      {
        const conToggle = await todasLasOportunidades("perfil=helder&incluir_sin_unspsc=1");
        const debiles = conToggle.filter((l) => /Servicio integral para la institucion educativa/i.test(l.nombre_del_procedimiento));
        assert.ok(debiles.length > 0, "?incluir_sin_unspsc=1 debe devolver la ruta de texto débil");
        for (const l of debiles) {
          assert.strictEqual(l.rup.tier, "texto");
          assert.strictEqual(l.rup.pertinencia.nivel, "amarillo", "vuelven marcados como «verificar», nunca en verde");
        }
        assert.ok(conToggle.length > todasH.length, "el toggle solo puede AÑADIR procesos");
        // …pero el toggle NO reabre nada de lo demás: genéricos, internet y
        // falsos positivos siguen fuera con él encendido
        for (const patron of [/^CONVOCATORIA PUBLICA/i, /INTERNET DEDICADO/i, /IMPRESI[OÓ]N Y FOTOCOPIA/i]) {
          assert.ok(!conToggle.some((l) => patron.test(l.nombre_del_procedimiento)),
            "el toggle de texto no puede reabrir objetos genéricos ni servicios ajenos");
        }
        const r1 = await invocar(oportunidades, "/api/oportunidades?perfil=helder&por_pagina=1", CAB_TOKEN);
        assert.strictEqual(r1.cuerpo.incluye_sin_unspsc, false, "el toggle está apagado por defecto");
        const r2 = await invocar(oportunidades, "/api/oportunidades?perfil=helder&por_pagina=1&incluir_sin_unspsc=1", CAB_TOKEN);
        assert.strictEqual(r2.cuerpo.incluye_sin_unspsc, true);
        assert.ok(r2.cuerpo.total > r1.cuerpo.total, "con el toggle encendido debe haber más resultados");
      }

      /* ---- el reparto por solidez del match viaja en la respuesta ---- */
      const m1 = (await invocar(oportunidades, "/api/oportunidades?perfil=helder&por_pagina=1", CAB_TOKEN)).cuerpo;
      assert.ok(m1.por_match && m1.por_match.clase > 0 && m1.por_match.familia > 0 && m1.por_match.texto > 0,
        `la respuesta debe repartir por tier: ${JSON.stringify(m1.por_match)}`);
      assert.strictEqual(Object.values(m1.por_match).reduce((a, b) => a + b, 0), m1.total,
        "el reparto por tier debe sumar exactamente el total");
      // …y se puede filtrar por él
      const soloClase = await todasLasOportunidades("perfil=helder&match=clase");
      assert.ok(soloClase.length > 0 && soloClase.every((l) => l.rup.tier === "clase"),
        "?match=clase debe devolver solo los de match sólido");
      assert.strictEqual(soloClase.length, m1.por_match.clase);
    }

    /* c'. parámetros hostiles: claves del prototipo no tumban el endpoint */
    for (const url of [
      "/api/oportunidades?perfil=constructor",
      "/api/oportunidades?perfil=__proto__",
      "/api/oportunidades?perfil=hasownproperty",
    ]) {
      const r = await invocar(oportunidades, url, CAB_TOKEN);
      assert.strictEqual(r.status, 400, `${url} debía dar 400, dio ${r.status}`);
    }
    for (const url of [
      "/api/oportunidades?perfil=helder&ordenar_por=__proto__",
      "/api/oportunidades?perfil=helder&ordenar_por=hasOwnProperty",
      "/api/oportunidades?perfil=helder&anticipo_min=abc&pagina=-3&por_pagina=99999",
    ]) {
      const r = await invocar(oportunidades, url, CAB_TOKEN);
      assert.strictEqual(r.status, 200, `${url} debía degradar a 200, dio ${r.status}`);
      assert.ok(r.cuerpo.ok && r.cuerpo.resultados.length > 0, `${url} sin resultados`);
    }

    /* d. génesis con filtros y orden */
    const rGen = await invocar(oportunidades,
      "/api/oportunidades?perfil=genesis&anticipo_min=25&cuantia_rango=medio&ordenar_por=ve", CAB_TOKEN);
    assert.strictEqual(rGen.status, 200);
    const cG = rGen.cuerpo;
    assert.ok(cG.ok && cG.total > 0, "génesis sin resultados");
    for (const l of cG.resultados) {
      assert.strictEqual(l.cuantia_rango, "medio", "filtro de cuantía no aplicado");
      assert.ok(l.anticipo_pct === 0 || l.anticipo_pct >= 25, `anticipo declarado bajo el mínimo: ${l.anticipo_pct}`);
      assert.strictEqual(rup_valido(l, "genesis"), true, "filtro RUP génesis no aplicado");
    }
    // el filtro de anticipo muerde de verdad: los declarados al 10 % existen
    // en el corpus (visibles con mínimo 5) y desaparecen con mínimo 25
    {
      const conMin5 = await todasLasOportunidades("perfil=genesis&anticipo_min=5");
      assert.ok(conMin5.some((l) => l.anticipo_pct === 10), "faltan los anticipos del 10 % en el corpus");
      const conMin25 = await todasLasOportunidades("perfil=genesis&anticipo_min=25");
      assert.ok(!conMin25.some((l) => l.anticipo_pct === 10), "anticipo_min=25 no excluyó los declarados al 10 %");
      assert.ok(conMin25.length < conMin5.length, "anticipo_min=25 debía excluir filas frente a anticipo_min=5");
    }
    for (let i = 1; i < cG.resultados.length; i++) {
      assert.ok(cG.resultados[i - 1].ve >= cG.resultados[i].ve, "orden por valor esperado roto");
    }

    /* d-bis. consorcio: perfil=juntos y su alias ?perfil=consorcio */
    {
      const rJ = await invocar(oportunidades, "/api/oportunidades?perfil=juntos", CAB_TOKEN);
      const rC = await invocar(oportunidades, "/api/oportunidades?perfil=consorcio", CAB_TOKEN);
      assert.strictEqual(rJ.status, 200, "perfil=juntos falló");
      assert.strictEqual(rC.status, 200, "alias perfil=consorcio falló");
      assert.ok(rJ.cuerpo.total > 0, "consorcio sin resultados");
      assert.strictEqual(rC.cuerpo.total, rJ.cuerpo.total, "el alias consorcio difiere de juntos");
      assert.strictEqual(rC.cuerpo.perfil, "juntos", "el alias no se canonicaliza");
      for (const l of rJ.cuerpo.resultados) {
        assert.strictEqual(rup_valido(l, "juntos"), true, "filtro RUP del consorcio no aplicado");
      }
      // el consorcio (K = suma de integrantes, tope 11 000 SMMLV) ALCANZA
      // procesos que NINGÚN integrante puede tomar solo: las obras de 9 000 M
      // superan el tope de Helder (7 004 M) y el de Génesis (3 502 M)
      const todasJ = await todasLasOportunidades("perfil=juntos");
      const soloConsorcio = todasJ.filter((l) => l.cuantia_cop > 7.1e9);
      assert.ok(soloConsorcio.length > 0, "faltan las obras grandes que solo el consorcio alcanza");
      for (const l of soloConsorcio.slice(0, 3)) {
        assert.strictEqual(rup_valido(l, "helder"), false, "una obra de 9 000 M no puede ser viable para Helder solo");
        assert.strictEqual(rup_valido(l, "genesis"), false, "una obra de 9 000 M no puede ser viable para Génesis sola");
      }
      assert.ok(todasJ.length >= cH.total, "el consorcio no puede ver menos que Helder");
    }

    /* e. extracción histórica de los 2 años anteriores + índice de competencia.
       Corre ANTES del delta a propósito: así el índice se verifica sobre un
       corpus histórico conocido (28 procesos), sin la adjudicación que el
       delta añadirá después. */
    {
      socrata.setFallos(false); // el histórico corre limpio; los fallos ya se probaron en la full
      const rango = `desde=${ANOS_HIST[0]}-01&hasta=${ANOS_HIST[1]}-12`;
      const TOKEN = { "x-historico-token": process.env.HISTORICO_TOKEN };

      /* protección: sin token, con token equivocado y sin la variable definida */
      assert.strictEqual((await invocar(historico, `/api/sync/historico?${rango}&chain=0`)).status, 401,
        "sin token debía responder 401");
      {
        const r401 = await invocar(historico, `/api/sync/historico?${rango}&token=equivocado&chain=0`);
        assert.strictEqual(r401.status, 401, "token equivocado por la URL debía responder 401");
        // el error explica LAS DOS formas de autenticarse (el dueño puede no tener terminal)
        assert.ok(r401.cuerpo.como_autenticar.header.includes("x-historico-token"), "el 401 no sugiere el header");
        assert.ok(r401.cuerpo.como_autenticar.url.includes("token"), "el 401 no sugiere el token por URL");
      }
      {
        const guardado = process.env.HISTORICO_TOKEN;
        delete process.env.HISTORICO_TOKEN;
        const r0 = await invocar(historico, `/api/sync/historico?${rango}&chain=0`, TOKEN);
        assert.strictEqual(r0.status, 503, "sin HISTORICO_TOKEN el endpoint debe negarse, nunca abrirse");
        process.env.HISTORICO_TOKEN = guardado;
      }
      assert.strictEqual((await invocar(historico, `/api/sync/historico?desde=${ANO}-13&hasta=${ANO}-12&chain=0`, TOKEN)).status, 400,
        "rango de meses inválido debía dar 400");
      assert.strictEqual((await redis.scan(CLAVES.patronChunksHist)).length, 0,
        "una petición rechazada no puede haber escrito nada");

      /* extracción reanudable con presupuesto corto (varias invocaciones) */
      let rh = await invocar(historico, `/api/sync/historico?${rango}&presupuesto=200&chain=0`, TOKEN);
      assert.strictEqual(rh.status, 200, `histórico falló: ${JSON.stringify(rh.cuerpo).slice(0, 300)}`);
      assert.strictEqual(rh.cuerpo.ok, true);
      let invHist = 1;
      while (rh.cuerpo.done === false) {
        rh = await invocar(historico, `/api/sync/historico?${rango}&presupuesto=200&chain=0`, TOKEN);
        assert.strictEqual(rh.cuerpo.ok, true, `continuación histórica falló: ${JSON.stringify(rh.cuerpo)}`);
        if (++invHist > 400) throw new Error("la extracción histórica no converge");
      }
      assert.ok(invHist >= 2, "el presupuesto corto debía forzar varias invocaciones reanudables");
      assert.strictEqual(await redis.get("lock:sync:historico"), null, "el candado del histórico no se liberó");
      assert.strictEqual(await redis.get("lock:sync"), null, "el histórico no debe tocar el candado del sync normal");

      /* el histórico guardó todo el rango CON datos de adjudicación */
      const hist = await leerHistorico();
      const conOferentes = [...ENTIDADES_HIST, ...ENTIDADES_HIST_IDENTIDAD]
        .reduce((a, e) => a + e.ofertas.length, 0);
      const totalHist = conOferentes + HIST_EQUIVALENCIAS + HIST_DETALLE + HIST_COBERTURA;
      assert.strictEqual(hist.length, totalHist, `histórico: ${hist.length} registros, esperaba ${totalHist}`);
      for (const r of hist) {
        // el proceso declarado desierto es el único sin datos de adjudicación
        if (/desierta/i.test(r.nombre_del_procedimiento || "")) {
          assert.strictEqual(r.fue_adjudicado, false, "un desierto no puede figurar como adjudicado");
          assert.strictEqual(r.oferentes, null);
          continue;
        }
        assert.ok(r.nombre_del_proveedor && r.nit_del_proveedor_adjudicado, "falta el adjudicatario en el histórico");
        assert.ok(r.valor_total_adjudicacion && r.fecha_adjudicacion, "faltan valor/fecha de adjudicación");
        assert.strictEqual(r.fue_adjudicado, true, "el histórico no marcó la adjudicación");
        // el bloque de equivalencias viaja SIN conteo de oferentes a propósito
        // (así el índice de competencia no cambia): ahí `oferentes` es null
        if (!/^CO1\.(EQV|DET|COB)\./.test(String(r.id_del_proceso))) {
          assert.ok(r.oferentes >= 1, "el histórico no derivó el nº de oferentes");
        } else {
          assert.strictEqual(r.oferentes, null, "0 oferentes = SIN DATO, nunca «nadie se presentó»");
        }
      }

      /* los dos corpus no se mezclan */
      const activo = await leerActivo();
      assert.ok(!activo.some((r) => String(r.id_del_proceso).startsWith("CO1.HIST.")),
        "el corpus activo se contaminó con procesos históricos");
      assert.ok(!activo.some((r) => "nombre_del_proveedor" in r),
        "el corpus activo guardó datos de adjudicación (solo deben vivir en el histórico)");

      /* índice construido automáticamente al terminar la extracción */
      const metaIdx = JSON.parse(await redis.get("indice:competencia:meta"));
      assert.ok(metaIdx && metaIdx.construido, "no se construyó el índice al terminar la extracción");
      assert.strictEqual(metaIdx.entidades, ENTIDADES_EN_INDICE,
        "faltan entidades en el índice (o las dos grafías de la del guion no se fusionaron en una)");
      assert.strictEqual(metaIdx.clasificadas, 3, "solo las entidades con ≥5 procesos pueden clasificarse");
      // solo cuentan los procesos con conteo de oferentes: los del bloque de
      // equivalencias quedan como «sin dato» y no mueven ni un tertil
      assert.strictEqual(metaIdx.procesos_contados, conOferentes, "el índice no contó los procesos con oferentes");
      assert.strictEqual(metaIdx.descartados.sin_oferentes, HIST_EQUIVALENCIAS + HIST_DETALLE + HIST_COBERTURA - 1,
        "un proceso adjudicado sin conteo de oferentes debe quedar contado como descarte, no colarse como 0");
      assert.strictEqual(metaIdx.min_procesos, 5);

      const hash = await redis.hgetall("indice:competencia");
      for (const e of ENTIDADES_HIST) {
        const m = JSON.parse(hash[filtros.norm(e.entidad)]);
        assert.strictEqual(m.procesos, e.ofertas.length, `${e.entidad}: nº de procesos`);
        assert.strictEqual(m.procesos_contados, e.ofertas.length, `${e.entidad}: alias procesos_contados`);
        if (e.ofertas.length >= 5) {
          assert.strictEqual(m.oferentes_total, e.ofertas.reduce((a, b) => a + b, 0), `${e.entidad}: suma de oferentes`);
          assert.strictEqual(m.promedio, PROMEDIO_ESPERADO[e.entidad], `${e.entidad}: promedio de oferentes`);
          assert.ok(m.mediana > 0, `${e.entidad}: mediana`);
        } else {
          /* DEFECTO DE PRODUCCIÓN (ago 2026): el badge enseñaba «18.2 oferentes
             en 0 procesos». Nacía aquí — se publicaba el `promedio` de una
             entidad que NO se puede clasificar, y bastaba con que un consumidor
             lo pintara sin mirar el nivel. Por debajo del mínimo no se publica
             NINGUNA cifra derivada: ni promedio, ni mediana, ni el total de
             oferentes con el que se podría recalcular. */
          assert.strictEqual(m.nivel, "sin_dato", "una entidad con <5 procesos no puede clasificarse");
          assert.strictEqual(m.promedio, null, `${e.entidad}: no puede publicarse un promedio sin base`);
          assert.strictEqual(m.mediana, null, `${e.entidad}: tampoco la mediana`);
          assert.strictEqual(m.oferentes_total, null,
            `${e.entidad}: publicar la suma permitiría recalcular el promedio que se acaba de anular`);
        }
        // alias por NIT → mismo registro (una entidad que cambie de nombre no parte su historial)
        assert.deepStrictEqual(JSON.parse(hash[`nit:${e.nit}`]), { ref: filtros.norm(e.entidad) });
      }
      // TERTILES: 3 / 8 / 18 oferentes de promedio → baja / media / alta
      assert.strictEqual(JSON.parse(hash[filtros.norm("ALCALDÍA DE PURIFICACIÓN")]).nivel, "baja");
      assert.strictEqual(JSON.parse(hash[filtros.norm("GOBERNACIÓN DEL TOLIMA")]).nivel, "media");
      assert.strictEqual(JSON.parse(hash[filtros.norm("IDU")]).nivel, "alta");

      /* ═══ IDENTIDAD DE LA ENTIDAD, sobre el índice REAL ═══ */
      {
        const clave = indiceComp.claveCanonica;
        // (1) NIT compartido: cada regional conserva SUS cifras…
        const indice = await indiceComp.leerIndice(redis);
        const norte = indiceComp.competenciaDe(indice, { entidad: AEROCIVIL_NORTE, nit_entidad: NIT_COMPARTIDO });
        const sur = indiceComp.competenciaDe(indice, { entidad: AEROCIVIL_SUR, nit_entidad: NIT_COMPARTIDO });
        assert.strictEqual(norte.total_procesos, 3, "la regional NORTE debe traer sus 3 procesos, no los de su hermana");
        assert.strictEqual(sur.total_procesos, 4, "la regional SUR debe traer sus 4 procesos, no los de su hermana");
        // …y el alias ambiguo NO se publica: apuntar a una de las dos es mentir
        assert.ok(!Object.prototype.hasOwnProperty.call(hash, `nit:${NIT_COMPARTIDO}`),
          "un NIT compartido por dos entidades no puede publicar alias: solo podría apuntar a una");
        assert.strictEqual(metaIdx.nits_ambiguos, 1, "la meta debe CONTAR los NITs ambiguos, no ocultarlos");
        // el alias de un NIT que sí identifica a una sola entidad sigue ahí
        assert.deepStrictEqual(JSON.parse(hash[`nit:${ENTIDADES_HIST[0].nit}`]),
          { ref: clave(ENTIDADES_HIST[0].entidad) },
          "un NIT no ambiguo conserva su alias: es lo que evita partir el historial al cambiar de razón social");

        // (2) GUION: las dos grafías son UNA entidad, con 4 procesos
        const fusionada = JSON.parse(hash[clave(ENTIDAD_GUION)]);
        assert.strictEqual(fusionada.procesos, 4,
          "las dos grafías (con guion y sin él) tienen que agruparse en una sola entidad de 4 procesos");
        assert.ok(!Object.prototype.hasOwnProperty.call(hash, filtros.norm(ENTIDAD_GUION)),
          "la clave con puntuación ya no debe escribirse: la canónica es la única que se publica");
        assert.strictEqual(indiceComp.competenciaDe(indice, { entidad: ENTIDAD_GUION_SIN, nit_entidad: NIT_GUION }).total_procesos, 4,
          "consultar por la otra grafía debe dar exactamente la misma entidad");
      }

      /* el token TAMBIÉN autentica por la URL: es la única vía del dueño, que
         dispara la carga pegando el enlace en Chrome (portátil sin terminal) */
      {
        const soloUrl = await invocar(historico,
          `/api/sync/historico?reconstruir_indice=true&presupuesto=20000&chain=0&token=${encodeURIComponent(process.env.HISTORICO_TOKEN)}`);
        assert.strictEqual(soloUrl.status, 200, "el token por URL debía autenticar igual que el header");
        assert.strictEqual(soloUrl.cuerpo.ok, true);
        assert.strictEqual(soloUrl.cuerpo.done, true, "la carga disparada desde el navegador no llegó a término");
        // y si vienen los dos, MANDA EL HEADER: header bueno + URL basura → autoriza
        const headerGana = await invocar(historico,
          "/api/sync/historico?reconstruir_indice=true&presupuesto=20000&chain=0&token=basura", TOKEN);
        assert.strictEqual(headerGana.status, 200, "con header válido, un token basura en la URL no debe estorbar");
      }

      /* escotillas de diagnóstico y rescate desde el navegador */
      {
        // ?estado=true SOLO LEE: ni candado, ni escrituras
        const est = await invocar(historico, "/api/sync/historico?estado=true", TOKEN);
        assert.strictEqual(est.status, 200);
        assert.strictEqual(est.cuerpo.estado.candado.tomado, false, "?estado no debe tomar el candado");
        assert.strictEqual(est.cuerpo.estado.extraccion.terminada, true);
        assert.strictEqual(est.cuerpo.estado.corpus_historico.chunks > 0, true);
        assert.ok(est.cuerpo.estado.indice.clasificadas === 3, "?estado no informa el índice");
        assert.strictEqual(await redis.get("lock:sync:historico"), null);
        // y está protegido igual que todo lo demás
        assert.strictEqual((await invocar(historico, "/api/sync/historico?estado=true")).status, 401);
        assert.strictEqual((await invocar(historico, "/api/sync/historico?reset=true")).status, 401,
          "?reset debe exigir token: destraba, no es público");

        // ?reset=true con un candado ajeno puesto a mano (el escenario a rescatar)
        await redis.set("lock:sync:historico", "tanda-muerta", { nx: true, ex: 600 });
        const conCandado = await invocar(historico, "/api/sync/historico?estado=true", TOKEN);
        assert.strictEqual(conCandado.cuerpo.estado.candado.tomado, true);
        assert.ok(conCandado.cuerpo.estado.candado.se_libera_solo_en_seg > 0,
          "el estado debe decir en cuántos segundos se libera solo el candado");

        const chunksAntes = (await redis.scan(CLAVES.patronChunksHist)).length;
        const rst = await invocar(historico, "/api/sync/historico?reset=true", TOKEN);
        assert.strictEqual(rst.status, 200);
        assert.deepStrictEqual(
          { ok: rst.cuerpo.ok, reset: rst.cuerpo.reset, msg: rst.cuerpo.msg },
          { ok: true, reset: true, msg: "Candado liberado. Vuelva a llamar sin ?reset para iniciar." });
        assert.strictEqual(await redis.get("lock:sync:historico"), null, "?reset no liberó el candado");
        assert.strictEqual(await redis.get("sync:historico:progreso"), null, "?reset no borró el progreso");
        assert.strictEqual(await redis.get("sync:historico:meta"), null, "?reset no borró la meta");
        // …y NO tocó lo ya bajado ni el índice publicado
        assert.strictEqual((await redis.scan(CLAVES.patronChunksHist)).length, chunksAntes,
          "?reset borró chunks del histórico");
        assert.strictEqual((await leerHistorico()).length, totalHist, "?reset perdió procesos históricos");
        assert.ok(JSON.parse(await redis.get("indice:competencia:meta")).clasificadas === 3,
          "?reset tumbó el índice publicado");

        // tras el reset se puede volver a lanzar y el resultado es el mismo
        // (la extracción REEMPLAZA los meses, no los duplica)
        let re = await invocar(historico, `/api/sync/historico?${rango}&presupuesto=20000&chain=0`, TOKEN);
        let vueltas = 1;
        while (re.cuerpo.done === false) {
          re = await invocar(historico, `/api/sync/historico?${rango}&presupuesto=20000&chain=0`, TOKEN);
          if (++vueltas > 50) throw new Error("la extracción tras ?reset no converge");
        }
        assert.strictEqual((await leerHistorico()).length, totalHist,
          "re-lanzar tras ?reset duplicó el corpus histórico");
      }

      /* reconstrucción del índice sin volver a bajar nada */
      const rr = await invocar(historico, "/api/sync/historico?reconstruir_indice=true&presupuesto=20000&chain=0", TOKEN);
      assert.strictEqual(rr.cuerpo.ok, true, `reconstrucción falló: ${JSON.stringify(rr.cuerpo).slice(0, 300)}`);
      assert.strictEqual(rr.cuerpo.done, true, "la reconstrucción del índice quedó a medias");
      assert.strictEqual(rr.cuerpo.extraccion, null, "reconstruir_indice no debe re-extraer");
      assert.strictEqual(rr.cuerpo.indice.clasificadas, 3, "la reconstrucción cambió la clasificación");
      assert.strictEqual(rr.cuerpo.equivalencias, null, "reconstruir_indice solo reconstruye el índice");
      assert.strictEqual((await leerHistorico()).length, totalHist, "la reconstrucción duplicó el histórico");

      /* ---- EQUIVALENCIAS FUNCIONALES aprendidas del histórico ----
         Se construyeron solas al terminar la extracción; aquí se verifica el
         contenido y que reconstruirlas no re-extraiga nada. */
      {
        const metaEq = JSON.parse(await redis.get("equivalencias:unspsc:meta"));
        assert.ok(metaEq && metaEq.construido, "no se construyeron las equivalencias al terminar la extracción");
        assert.deepStrictEqual(metaEq.umbrales,
          { lift_min: equivalencias.LIFT_MIN, soporte_min: equivalencias.SOPORTE_MIN, adjudicatarios_min: equivalencias.NITS_INTERSECCION_MIN },
          "los umbrales deben quedar publicados junto al resultado");
        const mapa = await equivalencias.leerEquivalencias(redis);
        const clave = CLASE_AFIN.slice(0, 6);
        assert.ok(mapa && mapa[clave], `la clase afín ${clave} no quedó en el índice de equivalencias`);
        assert.strictEqual(mapa[clave][0].clase, "721410", "la afinidad debe apuntar a la clase inscrita en el RUP");
        assert.ok(mapa[clave][0].lift >= equivalencias.LIFT_MIN);
        assert.strictEqual(mapa[clave][0].adjudicatarios, NITS_AFINES);
        // NADA MÁS pasó los umbrales: el corpus está diseñado para un solo par
        assert.strictEqual(Object.keys(mapa).length, 1,
          `los umbrales dejaron pasar pares que no debían: ${Object.keys(mapa).join(", ")}`);
        assert.strictEqual(metaEq.identificados_por_nombre, 0,
          "el histórico de prueba trae NIT: no debería hacer falta el respaldo por nombre");

        // reconstruir SOLO las equivalencias: ni re-extrae ni toca el índice
        const re = await invocar(historico, "/api/sync/historico?reconstruir_equivalencias=true&presupuesto=20000&chain=0", TOKEN);
        assert.strictEqual(re.cuerpo.done, true, `la reconstrucción de equivalencias quedó a medias: ${JSON.stringify(re.cuerpo).slice(0, 200)}`);
        assert.strictEqual(re.cuerpo.extraccion, null, "reconstruir_equivalencias no debe re-extraer");
        assert.strictEqual(re.cuerpo.indice, null, "reconstruir_equivalencias no debe tocar el índice");
        assert.strictEqual(re.cuerpo.equivalencias.pares, metaEq.pares, "la reconstrucción cambió el resultado");
        assert.strictEqual((await leerHistorico()).length, totalHist, "la reconstrucción duplicó el histórico");
      }

      /* ---- VOCABULARIO por familia derivado del histórico ----
         El corpus de prueba no llega al mínimo de procesos por familia, así
         que el resultado correcto es «sigue mandando la semilla»: lo que se
         verifica es que lo diga, no que invente un vocabulario. */
      {
        const rv = await invocar(historico, "/api/sync/historico?reconstruir_vocabulario=true&presupuesto=20000&chain=0", TOKEN);
        assert.strictEqual(rv.cuerpo.done, true, "la reconstrucción del vocabulario quedó a medias");
        assert.strictEqual(rv.cuerpo.extraccion, null, "reconstruir_vocabulario no debe re-extraer");
        assert.ok(rv.cuerpo.vocabulario, "sin resultado de vocabulario");
        assert.strictEqual(rv.cuerpo.vocabulario.solo_familias_del_rup, true,
          "solo se acumulan las familias que algún RUP inscribe (el resto no se usaría nunca)");
        assert.ok(rv.cuerpo.vocabulario.procesos > 0, "el vocabulario no leyó ningún proceso histórico");
        // el estado lo reporta, y la app sigue usando la semilla del repositorio
        const est = await invocar(historico, "/api/sync/historico?estado=true", TOKEN);
        assert.ok(est.cuerpo.estado.equivalencias.pares > 0, "?estado no informa las equivalencias");
        assert.ok("vocabulario" in est.cuerpo.estado, "?estado no informa el vocabulario");
      }
    }

    /* f. el índice se USA: orden por atractividad = dónde es más probable ganar */
    {
      // perfil=juntos: es el único que ve las CUATRO entidades del corpus (las
      // obras de 9 000 M de la Alcaldía de Ibagué superan el K de cada
      // integrante por separado), así que los cuatro grupos están presentes
      const todas = await todasLasOportunidades("perfil=juntos&ordenar_por=atractividad");
      assert.ok(todas.length > 0, "sin resultados que ordenar");

      /* ORDEN NUEVO (ago 2026): primero lo que pasa las cuatro puertas y,
         dentro de cada grupo, por VALOR ESPERADO descendente. El criterio
         anterior —agrupar por banda de competencia y desempatar por
         `puntaje_ponderado`— se retiró porque ese puntaje tenía su tercer
         componente constante en todo lo servido (docs/ATRACTIVIDAD.md §0). */
      let vistoNoViable = false, veAnterior = Infinity;
      for (const l of todas) {
        assert.ok(l.competencia_entidad, "falta competencia_entidad en el resultado");
        assert.ok(l.puertas && typeof l.puertas.pasa_todas === "boolean", "falta el veredicto de las puertas");
        if (!l.puertas.pasa_todas) { vistoNoViable = true; veAnterior = Infinity; continue; }
        assert.ok(!vistoNoViable, `un viable (${l.id_del_proceso}) apareció después de uno no viable`);
        assert.ok(l.ve <= veAnterior, `orden por valor esperado roto en ${l.id_del_proceso}`);
        veAnterior = l.ve;
      }
      // el índice de competencia sigue alimentando la probabilidad: la entidad
      // con histórico propio no usa el supuesto conservador
      const niveles = new Set(todas.map((l) => l.competencia_entidad.nivel));
      for (const n of ["baja", "media", "alta", "sin_dato"]) assert.ok(niveles.has(n), `falta el grupo ${n} en el corpus`);
      const conBaja = todas.filter((l) => l.competencia_entidad.nivel === "baja");
      assert.ok(conBaja.length > 0, "el corpus no trae ninguna entidad de poca competencia");
      assert.strictEqual(conBaja[0].competencia_entidad.promedio_oferentes, 3);
      assert.strictEqual(conBaja[0].p_ganar_detalle.fuente, "entidad",
        "con histórico de la entidad, la probabilidad no puede salir de un supuesto");
      // 1/(1+3) = 0,25 y el ajuste por competencia baja lo sube a 0,325
      assert.ok(Math.abs(conBaja[0].p_ganar_detalle.base - 0.25) < 1e-6,
        `P base con promedio 3 debería ser 0,25 y fue ${conBaja[0].p_ganar_detalle.base}`);
      assert.ok(conBaja[0].p_ganar > conBaja[0].p_ganar_detalle.base,
        "la competencia baja debe ajustar la probabilidad al alza");
      // una entidad de competencia alta tiene que quedar por debajo de una baja
      const conAlta = todas.filter((l) => l.competencia_entidad.nivel === "alta");
      assert.ok(conAlta.length > 0 && conAlta[0].p_ganar < conBaja[0].p_ganar,
        "la entidad de alta competencia no puede tener más probabilidad que la de baja");

      // atractividad es el orden POR DEFECTO (lo que ve el dueño al abrir la app)
      const porDefecto = await invocar(oportunidades, "/api/oportunidades?perfil=juntos&por_pagina=100", CAB_TOKEN);
      assert.strictEqual(porDefecto.cuerpo.ordenado_por, "atractividad", "el orden por defecto no es atractividad");
      assert.strictEqual(porDefecto.cuerpo.solo_viables, true, "solo_viables debe venir encendido por defecto");
      assert.strictEqual(porDefecto.cuerpo.resultados[0].id_del_proceso, todas[0].id_del_proceso);
      assert.ok(porDefecto.cuerpo.indice_competencia && porDefecto.cuerpo.indice_competencia.entidades === 3,
        "la respuesta no informa el estado del índice");

      // los órdenes anteriores siguen funcionando (aunque el puntaje ya no viaje)
      const porCuantia = (await invocar(oportunidades, "/api/oportunidades?perfil=juntos&ordenar_por=cuantia&por_pagina=100", CAB_TOKEN)).cuerpo;
      for (let i = 1; i < porCuantia.resultados.length; i++) {
        assert.ok(porCuantia.resultados[i - 1].cuantia_cop >= porCuantia.resultados[i].cuantia_cop,
          "orden por cuantía roto");
      }
      assert.strictEqual((await invocar(oportunidades, "/api/oportunidades?perfil=juntos&ordenar_por=puntaje", CAB_TOKEN)).status, 200,
        "el orden legado por puntaje dejó de responder");

      // filtro por competencia de la entidad
      const bajas = await todasLasOportunidades("perfil=juntos&competencia_entidad=baja");
      assert.ok(bajas.length > 0 && bajas.every((l) => l.competencia_entidad.nivel === "baja"),
        "el filtro competencia_entidad no se aplicó");
      assert.strictEqual(bajas.length, conBaja.length);

      /* ---- EFECTO INMEDIATO del conocimiento nuevo, sin re-sincronizar ----
         El proceso de la clase afín (80141600) NO tiene una sola palabra de
         obra y su clase no está en ningún RUP: antes de aprender las
         equivalencias era invisible (verificado en c-bis). Ahora entra, con
         el tier "equivalente" y su explicación. Y el corpus no se ha vuelto a
         bajar: es exactamente la promesa de separar ingesta de juicio. */
      {
        const conAfin = (await todasLasOportunidades("perfil=helder"))
          .filter((l) => l.codigo_principal_de_categoria === `V1.${CLASE_AFIN}`);
        assert.ok(conAfin.length > 0,
          "las equivalencias aprendidas no rescataron la clase afín (efecto inmediato, sin full)");
        for (const l of conAfin) {
          assert.strictEqual(l.rup.tier, "equivalente", "el rescate por afinidad debe llevar su propio tier");
          assert.strictEqual(l.rup.unspsc.codigo_rup, "72141000", "debe decir CON QUÉ clase del RUP es afín");
          assert.ok(/evidencia hist[oó]rica/i.test(l.rup.unspsc.mensaje), "la tarjeta debe explicar de dónde sale");
          assert.ok(l.rup.pertinencia.nivel === "amarillo",
            "sin vocabulario de obra el veredicto es «verificar», no un verde");
        }
        // …y sigue fuera para quien NO tenga la clase inscrita a la que es afín
        const soloEquivalente = await todasLasOportunidades(`perfil=helder&match=equivalente`);
        assert.ok(soloEquivalente.length > 0 && soloEquivalente.every((l) => l.rup.tier === "equivalente"));
      }

      // /api/oportunidades NO lee del histórico NI expone datos de adjudicación
      for (const l of todas) {
        assert.ok(!String(l.id_del_proceso).startsWith("CO1.HIST."), "se sirvió un proceso del corpus histórico");
        assert.ok(!ANOS_HIST.some((y) => String(l.fecha_de_publicacion_del).startsWith(String(y))),
          "se sirvió un proceso de años anteriores (el histórico no se consulta aquí)");
        for (const c of ["nombre_del_proveedor", "nit_del_proveedor_adjudicado", "valor_total_adjudicacion",
          "fecha_adjudicacion", "numero_de_ofertas", "oferentes", "fue_adjudicado"]) {
          assert.ok(!(c in l), `/api/oportunidades expuso el campo de adjudicación «${c}»`);
        }
      }
    }

    /* f-ter. LAS CUATRO PUERTAS + P(ganar) + valor esperado (ago 2026).
       Sustituyen al `puntaje_ponderado` como criterio de decisión. Lo que se
       comprueba aquí es lo que el puntaje NO podía comprobar: que un proceso
       que la empresa no puede financiar deje de aparecer como oportunidad
       aunque su cuantía sea alta y su K alcance. */
    {
      const { evaluarPuertas } = require("../lib/puertas.js");
      const { estimarPDetalle, valorEsperado, PROMEDIO_CONSERVADOR,
        FACTOR_COMPETENCIA_BAJA, FACTOR_CIERRE_PRORROGADO, FACTOR_COLISION_CIERRES } = require("../lib/probabilidad.js");
      const { PERFILES } = require("../lib/perfiles.js");

      /* 1 · un proceso que pasa las cuatro puertas */
      const deGenesis = await todasLasOportunidades("perfil=genesis");
      const base = deGenesis.find((l) => l.puertas.pasa_todas);
      assert.ok(base, "ningún proceso de génesis pasa las cuatro puertas");
      for (const p of ["p1_rup", "p2_k", "p3_caja", "p4_competencia"]) {
        assert.strictEqual(base.puertas[p].pasa, true, `pasa_todas=true con ${p} cerrada`);
      }
      assert.deepStrictEqual(base.puertas.no_viable_por, [], "un viable no puede traer motivos de inviabilidad");

      /* 2 · el mismo proceso a 3.100 M: la K alcanza y la CAJA no.
         Es el caso real que motivó la puerta (docs/ATRACTIVIDAD.md): Génesis
         tiene patrimonio de ~$211 M y financiar el 20 % de 3.100 M son ~$620 M.
         Hoy este proceso se mostraba con «Capacidad K ✓» en verde. */
      const CUANTIA_GRANDE = 3100e6;
      const grande = { ...base, cuantia_cop: CUANTIA_GRANDE, precio_base: String(CUANTIA_GRANDE), anticipo_pct: 0 };
      const pg = evaluarPuertas(grande, "genesis", { rup: base.rup, competencia: base.competencia_entidad });
      assert.strictEqual(pg.p1_rup.pasa, true, "el objeto no cambió: P1 debe seguir abierta");
      assert.strictEqual(pg.p2_k.pasa, true, "3.100 M caben en la K de génesis: P2 debe seguir abierta");
      assert.strictEqual(pg.p3_caja.pasa, false, "la caja de génesis no puede financiar 3.100 M");
      assert.strictEqual(pg.pasa_todas, false, "pasa_todas debe caer si cae una sola puerta");
      assert.deepStrictEqual(pg.no_viable_por, ["Caja"], "el motivo de inviabilidad debe nombrar la caja");
      /* `pasa_rup_y_k` es la categoría «técnicamente viable aunque
         financieramente ajustado»: no es un proceso a descartar, es uno que
         habría que financiar (anticipo, crédito o consorcio). Por eso se
         publica aparte de `pasa_todas`. */
      assert.strictEqual(pg.pasa_rup_y_k, true, "el objeto es suyo y la K alcanza: pasa_rup_y_k debe seguir en true");
      assert.strictEqual(base.puertas.pasa_rup_y_k, true);
      const sinRupNiK = evaluarPuertas(grande, "genesis", { rup: { tier: "ninguno", unspsc: {} }, competencia: null });
      assert.strictEqual(sinRupNiK.pasa_rup_y_k, false, "sin RUP no puede ser técnicamente viable");
      assert.strictEqual(pg.p3_caja.financiacion_requerida, Math.round(CUANTIA_GRANDE * 0.20));
      assert.strictEqual(pg.p3_caja.patrimonio, Math.round(PERFILES.genesis.patrimonio));
      assert.ok(pg.p3_caja.patrimonio < pg.p3_caja.financiacion_requerida);
      // y con anticipo declarado la exigencia baja, porque hay menos que financiar
      const conAnticipo = evaluarPuertas({ ...grande, anticipo_pct: 30 }, "genesis",
        { rup: base.rup, competencia: base.competencia_entidad });
      assert.ok(conAnticipo.p3_caja.financiacion_requerida < pg.p3_caja.financiacion_requerida,
        "el anticipo declarado debe reducir la financiación requerida");

      /* 3 · P(ganar): entidad con promedio 3 oferentes → P base = 1/(1+3) */
      const comp3 = { nivel: "media", promedio_oferentes: 3, total_procesos: 10 };
      const d3 = estimarPDetalle({}, { competencia: comp3 });
      assert.strictEqual(d3.base, 0.25, `P base con promedio 3 debería ser 0,25 y fue ${d3.base}`);
      assert.strictEqual(d3.p, 0.25, "la competencia media no ajusta la probabilidad");
      assert.strictEqual(d3.fuente, "entidad");
      // competencia baja la sube; sin datos cae al supuesto conservador 1/6
      const dBaja = estimarPDetalle({}, { competencia: { ...comp3, nivel: "baja" } });
      assert.strictEqual(dBaja.p, Math.round(0.25 * FACTOR_COMPETENCIA_BAJA * 1e4) / 1e4);
      const dSin = estimarPDetalle({}, {});
      assert.strictEqual(dSin.fuente, "conservador");
      assert.strictEqual(dSin.p, Math.round((1 / (1 + PROMEDIO_CONSERVADOR)) * 1e4) / 1e4);
      // el promedio del departamento es el respaldo entre la entidad y el supuesto
      const dDepto = estimarPDetalle({}, { promedio_departamento: 9 });
      assert.strictEqual(dDepto.fuente, "departamento");
      assert.strictEqual(dDepto.p, 0.1);
      // señales ex-ante: prórroga del cierre y colisión de cierres
      const dPro = estimarPDetalle({ _cierre_prorrogado: true }, { competencia: comp3 });
      assert.strictEqual(dPro.p, Math.round(0.25 * FACTOR_CIERRE_PRORROGADO * 1e4) / 1e4);
      assert.ok(dPro.ajustes.some((a) => a.nombre === "cierre_prorrogado"), "el ajuste debe viajar explicado");
      const dCol = estimarPDetalle({}, { competencia: comp3, colision_cierres: 3 });
      assert.strictEqual(dCol.p, Math.round(0.25 * FACTOR_COLISION_CIERRES * 1e4) / 1e4);
      assert.strictEqual(estimarPDetalle({}, { competencia: comp3, colision_cierres: 1 }).p, 0.25,
        "un proceso solo no colisiona consigo mismo");
      // ninguna combinación puede salirse de [0,1] ni devolver algo no finito
      for (const ctx of [{}, { competencia: { nivel: "baja", promedio_oferentes: 0, total_procesos: 1 } },
        { promedio_departamento: -5 }, { competencia: { nivel: "alta", promedio_oferentes: 231, total_procesos: 40 } }]) {
        const p = estimarPDetalle({ _cierre_prorrogado: true }, { ...ctx, colision_cierres: 9 }).p;
        assert.ok(Number.isFinite(p) && p > 0 && p <= 1, `p fuera de rango: ${p}`);
      }

      /* 3-bis · la señal de PRÓRROGA DEL CIERRE sale del dedup de lectura.
         Es la única señal de competencia observable ANTES del cierre que hay en
         el corpus (el contador de oferentes es ex-post: en un proceso abierto
         vale 0 por construcción). Se comprueba contra un redis de mentira para
         no depender de que el mock traiga justo una adenda con cambio de fecha. */
      {
        const { comprimir, leerChunksDedup } = require("../lib/almacen.js");
        const v1 = { _k: "P-1", ":updated_at": "2026-07-01T00:00:00.000Z", fecha_cierre: "2026-07-20" };
        const v2 = { _k: "P-1", ":updated_at": "2026-07-10T00:00:00.000Z", fecha_cierre: "2026-08-05" }; // prorrogado
        const q1 = { _k: "P-2", ":updated_at": "2026-07-01T00:00:00.000Z", fecha_cierre: "2026-07-20" };
        const q2 = { _k: "P-2", ":updated_at": "2026-07-10T00:00:00.000Z", fecha_cierre: "2026-07-20" }; // adenda sin mover el cierre
        const falso = { mget: async () => [comprimir([v1, q1]), comprimir([v2, q2])] };
        const filas = await leerChunksDedup(falso, ["a", "b"], { senales: true });
        const p1 = filas.find((f) => f._k === "P-1"), p2 = filas.find((f) => f._k === "P-2");
        assert.strictEqual(p1.fecha_cierre, "2026-08-05", "el dedup debe quedarse con la versión más reciente");
        assert.strictEqual(p1._versiones, 2, "no se contaron las versiones vistas");
        assert.strictEqual(p1._cierre_prorrogado, true, "no se detectó la prórroga del cierre");
        assert.strictEqual(p2._cierre_prorrogado, false, "una adenda que NO mueve el cierre no es una prórroga");
        // sin la bandera, el dedup se comporta exactamente como antes
        const sinSenales = await leerChunksDedup(falso, ["a", "b"]);
        assert.ok(sinSenales.every((f) => f._versiones === undefined && f._cierre_prorrogado === undefined),
          "las señales no pueden aparecer sin pedirlas: /api/resumen y el histórico leen por aquí");
      }

      /* 4 · valor esperado = P(ganar) × cuantía */
      assert.strictEqual(valorEsperado({ cuantia_cop: 400e6 }, 0.25), 100e6);
      assert.strictEqual(valorEsperado({ cuantia_cop: 0 }, 0.25), 0);
      for (const l of deGenesis) assert.strictEqual(l.ve, Math.round(l.cuantia_cop * l.p_ganar), "VE inconsistente");

      /* 5 · ?solo_viables=false enseña lo no viable, SIEMPRE al final */
      const conTodo = (await invocar(oportunidades,
        "/api/oportunidades?perfil=genesis&solo_viables=false&por_pagina=100", CAB_TOKEN)).cuerpo;
      assert.strictEqual(conTodo.solo_viables, false);
      assert.ok(conTodo.total >= deGenesis.length, "solo_viables=false no puede devolver menos filas");
      assert.strictEqual(conTodo.viables + conTodo.no_viables, conTodo.total, "el reparto viables/no viables no cuadra");
      assert.ok(conTodo.no_viables > 0,
        "el corpus de prueba debe traer algún no viable: si no, esta prueba pasaría sin comprobar nada");
      let yaHuboNoViable = false;
      for (const l of conTodo.resultados) {
        if (!l.viable) { yaHuboNoViable = true; assert.ok(l.puertas.no_viable_por.length > 0, "un no viable sin motivo"); }
        else assert.ok(!yaHuboNoViable, "un viable apareció después de uno no viable");
      }
      // y con el toggle encendido (default) NINGUNO de los no viables se sirve
      for (const l of deGenesis) assert.strictEqual(l.viable, true, "solo_viables=true sirvió un proceso no viable");

      /* 6 · LA PUERTA DE CAJA MUERDE DE PUNTA A PUNTA, y depende del PERFIL.
         El fixture del puente (2.500 M, sin anticipo, obra en ambos RUP) pasa
         objeto, K y tope, así que llega vivo hasta P3 — y ahí Génesis (211 M de
         patrimonio) no puede financiar los 500 M mientras Helder (1.107 M) sí.
         Sin esta comprobación, P3 solo se probaba con objetos sintéticos y
         ningún proceso del corpus la ejercitaba a través del endpoint. */
      const ES_FIXTURE_CAJA = (l) => l.cuantia_cop === 2500000000;
      // por todas las páginas: los no viables caen al FINAL de la lista
      const puenteGen = (await todasLasOportunidades("perfil=genesis&solo_viables=false")).find(ES_FIXTURE_CAJA);
      assert.ok(puenteGen, "no llegó el fixture del puente de 2.500 M al corpus de Génesis");
      assert.strictEqual(puenteGen.viable, false, "Génesis no puede financiar el puente: tiene que salir no viable");
      assert.strictEqual(puenteGen.puertas.p1_rup.pasa, true, "…pero su objeto sí es del RUP");
      assert.strictEqual(puenteGen.puertas.p2_k.pasa, true, "…y su K alcanza");
      assert.deepStrictEqual(puenteGen.puertas.no_viable_por, ["Caja"], "el único motivo debe ser la caja");
      assert.strictEqual(puenteGen.puertas.p3_caja.financiacion_requerida, 500000000);

      const puenteHel = (await todasLasOportunidades("perfil=helder&solo_viables=false")).find(ES_FIXTURE_CAJA);
      assert.ok(puenteHel, "el fixture del puente no aparece para Helder");
      assert.strictEqual(puenteHel.puertas.p3_caja.pasa, true,
        "el MISMO proceso tiene que ser financiable para Helder: la puerta depende del perfil, no del proceso");
      assert.strictEqual(puenteHel.viable, true);
    }

    /* f-ter-bis. EL DEFECTO REPORTADO, de punta a punta: ni la invitación
       privada ni el proceso con la fecha límite vencida pueden salir servidos.
       Se comprueban por separado —uno cae por modalidad, el otro solo por el
       reloj— porque el caso reportado traía las dos causas a la vez y con una
       sola aserción bastaría con que funcionara una de ellas. */
    {
      const todo = await todasLasOportunidades("perfil=juntos&solo_viables=false&incluir_sin_unspsc=1");
      const nombres = todo.map((l) => String(l.nombre_del_procedimiento || ""));

      assert.ok(!nombres.some((s) => /INVITACION PRIVADA/i.test(s)),
        "una «Invitación Privada» se sigue sirviendo: no es una modalidad competitiva");
      assert.ok(!nombres.some((s) => /fecha vencida/i.test(s)),
        "un proceso con la fecha límite vencida se sigue sirviendo como abierto");

      /* Y NINGÚN proceso servido puede tener el cierre en el pasado. Es la
         invariante de verdad: las dos aserciones anteriores vigilan los dos
         fixtures, esta vigila el corpus entero. */
      const AHORA = Date.now();
      for (const l of todo) {
        if (!l.fecha_cierre) continue;
        assert.ok(!filtros.cierre_vencido(l, AHORA),
          `se sirvió «${l.nombre_del_procedimiento}» con cierre ${l.fecha_cierre}, ya vencido`);
      }

      /* Estos dos NO aparecen en el embudo del diagnóstico, y es lo correcto:
         la INGESTA ya los descartó de origen (la full no guarda lo que no es
         competitivo ni lo que no está abierto), así que nunca llegan al corpus
         activo que el diagnóstico recorre. El embudo mide lo que SÍ se guardó. */
      const dia = (await invocar(diagnostico, "/api/diagnostico?perfil=juntos&muestra=1", CAB_TOKEN)).cuerpo;
      assert.ok(dia.embudo.total_activo > 0, "el diagnóstico no ve corpus");
      assert.ok(dia.corpus.activo.filas_unicas < MESES.length * 120,
        "la ingesta tiene que haber descartado filas del dataset: si guardara todo, el prefiltro no está corriendo");
    }

    /* f-quater. /api/oportunidades con TOKEN OPCIONAL (ago 2026).
       Los clientes entran por la web pública y solo necesitan ver a qué
       presentarse; exigirles credencial dejaba la app inservible para ellos.
       Lo que no puede salir sin token son las CIFRAS del perfil, que derivan
       del patrimonio, la utilidad operacional y la liquidez de una persona
       natural identificada por nombre completo. */
    {
      /* 1 · sin token: 200, con datos y sin finanzas */
      const pub = await invocar(oportunidades, "/api/oportunidades?perfil=helder&por_pagina=5");
      assert.strictEqual(pub.status, 200, "sin token la lista pública tiene que servirse");
      assert.strictEqual(pub.cuerpo.finanzas_visibles, false, "sin token las finanzas no pueden declararse visibles");
      assert.ok(pub.cuerpo.total > 0 && pub.cuerpo.resultados.length > 0, "la lista pública llegó vacía");

      /* 2 · el veredicto SÍ viaja: es el producto, y sin él la app no sirve */
      for (const l of pub.cuerpo.resultados) {
        assert.ok(l.puertas && l.puertas.p1_rup && l.puertas.p3_caja, "sin token deben seguir viajando las puertas");
        assert.strictEqual(typeof l.viable, "boolean", "el veredicto de viabilidad no puede desaparecer");
        assert.ok(Number.isFinite(l.p_ganar) && Number.isFinite(l.ve), "p_ganar y ve no son sensibles: deben viajar");
        // …y los campos financieros llegan en null, no borrados (un `undefined`
        // se leería como cero, que es el defecto que este proyecto ya pagó)
        for (const c of ["k_cop", "crpc_cop", "tope_cop", "co_estimado"]) {
          assert.ok(c in l.rup, `rup.${c} debe seguir existiendo como clave`);
          assert.strictEqual(l.rup[c], null, `rup.${c} tiene que venir en null sin token`);
        }
        for (const c of ["crp", "crpc", "tope"]) {
          if (c in l.puertas.p2_k) assert.strictEqual(l.puertas.p2_k[c], null, `p2_k.${c} tiene que venir en null`);
        }
        assert.strictEqual(l.puertas.p3_caja.patrimonio, null, "el patrimonio no puede salir sin token");
        // lo derivable de datos PÚBLICOS se conserva: no protege nada ocultarlo
        assert.ok(Number.isFinite(l.puertas.p3_caja.financiacion_requerida),
          "financiacion_requerida sale de la cuantía publicada: no hay por qué ocultarla");
      }

      /* 3 · LA INVARIANTE FUERTE: ninguna cifra real del perfil puede aparecer
         en el payload público, ni como campo NI DENTRO DE UN MENSAJE. Los
         mensajes de las puertas llevaban los importes en el texto («…su
         patrimonio es $211.340.888»), así que anular los campos y dejar el
         texto habría sido una redacción de mentira. Se serializa la respuesta
         entera y se buscan las cifras, con y sin separadores de miles. */
      {
        const p = PERFILES.helder;
        const kReal = capacidad.crp(p, 800e6);
        const secretos = [p.patrimonio, p.utilidadOp, Math.round(kReal), Math.round(p.topeSMMLV * perfilesMod.SMMLV)];
        const json = JSON.stringify(pub.cuerpo);
        for (const n of secretos) {
          for (const forma of [String(n), Number(n).toLocaleString("es-CO"), String(Math.round(n / 1e6))+"M"]) {
            if (forma.length < 6) continue; // cadenas cortas darían falsos positivos
            assert.ok(!json.includes(forma),
              `la respuesta pública filtra una cifra del perfil: «${forma}»`);
          }
        }
      }

      /* 4 · con token: vuelven las cifras, por las dos vías válidas */
      for (const [via, r] of [
        ["header", await invocar(oportunidades, "/api/oportunidades?perfil=helder&por_pagina=5", CAB_TOKEN)],
        ["query", await invocar(oportunidades,
          `/api/oportunidades?perfil=helder&por_pagina=5&token=${encodeURIComponent(process.env.HISTORICO_TOKEN)}`)],
      ]) {
        assert.strictEqual(r.status, 200, `con token por ${via} debería responder 200`);
        assert.strictEqual(r.cuerpo.finanzas_visibles, true, `con token por ${via} las finanzas deben declararse visibles`);
        const l = r.cuerpo.resultados[0];
        assert.ok(Number.isFinite(l.rup.k_cop) && l.rup.k_cop > 0, `con token por ${via} el K tiene que viajar`);
        assert.ok(Number.isFinite(l.puertas.p3_caja.patrimonio) && l.puertas.p3_caja.patrimonio > 0,
          `con token por ${via} el patrimonio tiene que viajar`);
      }

      /* 5 · un token PRESENTE pero inválido es un ERROR, no un modo público:
         quien se molestó en mandarlo tiene que enterarse de que está mal. */
      const r401 = await invocar(oportunidades, "/api/oportunidades?perfil=helder&token=equivocado");
      assert.strictEqual(r401.status, 401, "un token equivocado no puede degradar en silencio a modo público");
      assert.ok(r401.cuerpo.como_autenticar.header.includes("x-historico-token"), "el 401 no dice cómo autenticarse");

      /* 6 · sin perfil sigue siendo un 400: ya no hay nada que proteger antes */
      assert.strictEqual((await invocar(oportunidades, "/api/oportunidades")).status, 400,
        "sin perfil y sin token debe responder 400 (el token dejó de ser obligatorio)");

      /* 7 · sin la variable de entorno la lista PÚBLICA sigue funcionando —es
         lo que ven los clientes— y solo se niega quien pida el modo con token */
      {
        const guardado = process.env.HISTORICO_TOKEN;
        delete process.env.HISTORICO_TOKEN;
        const rPub = await invocar(oportunidades, "/api/oportunidades?perfil=helder&por_pagina=1");
        assert.strictEqual(rPub.status, 200, "sin HISTORICO_TOKEN la lista pública debe seguir sirviéndose");
        assert.strictEqual(rPub.cuerpo.finanzas_visibles, false);
        const r503 = await invocar(oportunidades, "/api/oportunidades?perfil=helder", CAB_TOKEN);
        assert.strictEqual(r503.status, 503, "sin HISTORICO_TOKEN el modo con token debe negarse, jamás abrirse");
        process.env.HISTORICO_TOKEN = guardado;
      }

      /* 8 · los DEMÁS endpoints no se relajaron */
      assert.strictEqual((await invocar(diagnostico, "/api/diagnostico?perfil=helder")).status, 401,
        "/api/diagnostico dejó de exigir token");
      assert.strictEqual((await invocar(resumen, "/api/resumen?perfil=helder")).status, 401,
        "/api/resumen dejó de exigir token");
      assert.strictEqual((await invocar(detalleComp, "/api/competencia-detalle?entidad=IDU")).status, 401,
        "/api/competencia-detalle dejó de exigir token");
    }

    /* f-bis. /api/competencia-detalle: los procesos que SOSTIENEN el badge.
       El promedio de la tarjeta deja de ser una caja negra: se puede abrir y
       verificar proceso a proceso, incluidos los que NO cuentan y por qué. */
    {
      const TOKEN = { "x-historico-token": process.env.HISTORICO_TOKEN };
      const detalle = async (entidad, extra = "", headers = TOKEN) => invocar(
        detalleComp, `/api/competencia-detalle?entidad=${encodeURIComponent(entidad)}${extra}`, headers);

      /* --- protección: mismo token que el resto, y nada se filtra sin él --- */
      {
        const sinToken = await invocar(detalleComp, "/api/competencia-detalle?entidad=IDU");
        assert.strictEqual(sinToken.status, 401, "el detalle expone el corpus: debe exigir token");
        assert.ok(!JSON.stringify(sinToken.cuerpo).includes("CO1.HIST."), "un 401 no puede filtrar datos");
        assert.strictEqual((await detalle("IDU", "", { "x-historico-token": "equivocado" })).status, 401);
        const guardado = process.env.HISTORICO_TOKEN;
        delete process.env.HISTORICO_TOKEN;
        assert.strictEqual((await detalle("IDU")).status, 503, "sin HISTORICO_TOKEN debe negarse, nunca abrirse");
        process.env.HISTORICO_TOKEN = guardado;
      }

      /* --- validación de entrada --- */
      for (const [entidad, que] of [["", "vacía"], ["   ", "solo espacios"], ["x".repeat(301), "de más de 300 caracteres"]]) {
        const r = await detalle(entidad);
        assert.strictEqual(r.status, 400, `una entidad ${que} debía dar 400`);
        assert.ok(/entidad requerida/.test(r.cuerpo.error), "el 400 debe decir qué falta");
      }

      /* --- INVARIANTE: el detalle reconstruye EXACTAMENTE el badge ---
         Si el detalle y el índice pudieran divergir, el detalle no serviría
         para verificar nada. Se comprueba entidad por entidad contra el hash
         publicado. */
      const hashIdx = await redis.hgetall("indice:competencia");
      for (const e of ENTIDADES_HIST) {
        const r = await detalle(e.entidad, "&refrescar=1");
        assert.strictEqual(r.status, 200, `detalle de ${e.entidad} falló`);
        const c = r.cuerpo;
        assert.strictEqual(c.ok, true);
        assert.strictEqual(c.entidad, e.entidad, "debe devolver el nombre TAL COMO viene en los datos");
        const publicado = JSON.parse(hashIdx[filtros.norm(e.entidad)]);
        assert.strictEqual(c.indice.procesos_contados, publicado.procesos,
          `${e.entidad}: el detalle cuenta ${c.indice.procesos_contados} y el índice ${publicado.procesos}`);
        if (e.ofertas.length >= 5) {
          assert.strictEqual(c.indice.promedio_oferentes, publicado.promedio,
            `${e.entidad}: el promedio del detalle no reproduce el del badge`);
          assert.strictEqual(c.indice.nivel, publicado.nivel, `${e.entidad}: el nivel debe ser el PUBLICADO`);
          assert.strictEqual(c.procesos.length, e.ofertas.length, `${e.entidad}: faltan procesos en la tabla`);
          // suma de oferentes y orden ascendente (menos competencia primero)
          assert.strictEqual(c.procesos.reduce((a, p) => a + p.numero_ofertas, 0),
            e.ofertas.reduce((a, b) => a + b, 0), `${e.entidad}: la suma de oferentes no cuadra`);
          for (let i = 1; i < c.procesos.length; i++) {
            assert.ok(c.procesos[i - 1].numero_ofertas <= c.procesos[i].numero_ofertas,
              "los procesos deben ir de menos a más oferentes");
          }
          assert.ok(c.indice.min_oferentes <= c.indice.max_oferentes);
          for (const p of c.procesos) {
            assert.strictEqual(p.incluido_en_promedio, true);
            assert.ok(p.objeto && p.modalidad && p.codigo_unspsc, "cada fila debe traer objeto, modalidad y UNSPSC");
            assert.ok(/^\d{4}-\d{2}-\d{2}$/.test(p.fecha_adjudicacion), "fecha de adjudicación normalizada");
          }
        }
      }

      /* --- (a) 8 con oferentes + 2 sin dato → 8 en la tabla, 2 en excluidos --- */
      {
        const c = (await detalle("GOBERNACIÓN DEL TOLIMA", "&refrescar=1")).cuerpo;
        assert.strictEqual(c.procesos.length, 8, "los 8 con oferentes van a la tabla principal");
        const sinDato = c.excluidos.filter((p) => p.motivo_exclusion === "sin_dato_oferentes");
        assert.strictEqual(sinDato.length, 2, "los 2 sin conteo de oferentes van a «excluidos», no al limbo");
        // y el declarado DESIERTO: cerrado sin ganador, con su propio motivo
        const desiertos = c.excluidos.filter((p) => p.motivo_exclusion === "sin_adjudicacion");
        assert.strictEqual(desiertos.length, 1, "un cerrado sin adjudicación tampoco puede desaparecer en silencio");
        assert.strictEqual(desiertos[0].numero_ofertas, null);
        assert.strictEqual(c.excluidos.length, 3);
        assert.strictEqual(c.indice.procesos_contados, 8);
        assert.strictEqual(c.indice.total_procesos_adjudicados, 10, "el total adjudicado incluye los que no cuentan");
        assert.strictEqual(c.indice.total_procesos_historico, 11, "…y el histórico total incluye además el desierto");
        // 0 oferentes = SIN DATO, jamás «nadie se presentó»
        for (const p of sinDato) assert.strictEqual(p.numero_ofertas, 0);
        // excluidos ordenados por fecha descendente
        for (let i = 1; i < c.excluidos.length; i++) {
          assert.ok(String(c.excluidos[i - 1].fecha_adjudicacion || "") >= String(c.excluidos[i].fecha_adjudicacion || ""),
            "los excluidos van del más reciente al más antiguo");
        }
      }

      /* --- (b) por debajo del mínimo → TODO a excluidos, con el porqué --- */
      {
        const c = (await detalle("ALCALDÍA DE IBAGUÉ", "&refrescar=1")).cuerpo;
        assert.strictEqual(c.procesos.length, 0, "sin el mínimo no se presenta un promedio como si lo hubiera");
        assert.strictEqual(c.excluidos.length, 3, "los 3 procesos deben verse, marcados");
        for (const p of c.excluidos) {
          assert.strictEqual(p.motivo_exclusion, "insuficientes_datos");
          assert.strictEqual(p.incluido_en_promedio, false);
        }
        assert.strictEqual(c.indice.nivel, "sin_dato");
        assert.strictEqual(c.indice.promedio_oferentes, null, "no se publica un promedio que no es fiable");
        assert.strictEqual(c.indice.procesos_contados, 3);
        assert.strictEqual(c.indice.min_procesos, indiceComp.MIN_PROCESOS);
        assert.ok(/m[ií]nimo 5/i.test(c.mensaje), `el mensaje debe explicar el ⚪: «${c.mensaje}»`);
        // el espejo del hash tampoco puede filtrar la cifra que se acaba de anular
        assert.strictEqual(c.indice.publicado.promedio, null,
          "`publicado.promedio` es un espejo del hash y en producción trae el promedio que escribió la versión anterior");
        assert.strictEqual(c.indice.publicado.procesos, 3,
          "el CONTEO publicado sí se conserva: es lo que permite ver de un vistazo si el índice y el recuento divergen");
      }

      /* --- (b-ter) GUION: el recuento y el índice tienen que agrupar IGUAL ---
         El defecto: el detalle quitaba la puntuación al agrupar el corpus y NO
         al leer el hash. «… - EAAA» y «… EAAA» se sumaban al contar (4) pero el
         registro leído era el de una sola grafía (2), así que el detalle
         enseñaba un promedio de un conjunto y la banda salía de otro. Ahora
         las dos direcciones usan `claveCanonica`. */
      {
        const c = (await detalle(ENTIDAD_GUION, "&refrescar=1")).cuerpo;
        assert.strictEqual(c.encontrada, true);
        assert.strictEqual(c.entidad, ENTIDAD_GUION,
          "el nombre devuelto es el MÁS FRECUENTE del dataset: el que lleva guion");
        assert.strictEqual(c.indice.procesos_contados, 4, "las dos grafías son la misma entidad: 2 + 2");
        assert.strictEqual(c.indice.publicado.procesos, c.indice.procesos_contados,
          "el índice y el recuento tienen que agrupar por la MISMA definición de entidad");
        // consultar por la otra grafía da exactamente lo mismo
        const c2 = (await detalle(ENTIDAD_GUION_SIN, "&refrescar=1")).cuerpo;
        assert.strictEqual(c2.indice.procesos_contados, 4, "la grafía sin guion debe encontrar la misma entidad");
        assert.strictEqual(c2.entidad_normalizada, c.entidad_normalizada,
          "las dos grafías tienen que normalizar a la misma clave");
        // …y escribiéndola a mano con tildes, minúsculas y espacios de más
        const c3 = (await detalle("  empresa   de acueducto y alcantarillado eaaa ", "&refrescar=1")).cuerpo;
        assert.strictEqual(c3.indice.procesos_contados, 4, "la normalización debe tolerar el texto que escribe una persona");
      }

      /* --- (b-bis) ÍNDICE DESACTUALIZADO: hay base pero no clasificación ---
         El segundo camino a la contradicción «⚪ + un promedio debajo». El
         índice solo se reconstruye A MANO mientras el delta engorda el
         histórico en cada visita, así que el recuento adelanta al hash de forma
         permanente. El promedio es legítimo (12 procesos con oferentes) y se
         conserva; lo que no puede faltar es la explicación de por qué la banda
         sigue en ⚪ — si no, las dos cosas no se pueden conciliar mirando la
         pantalla. */
      {
        await redis.del("indice:competencia");                 // índice sin construir
        const cacheadas = await redis.scan("indice:detalle:*"); // y sin caché que lo tape
        if (cacheadas.length) await redis.del(...cacheadas);

        const c = (await detalle("IDU", "&refrescar=1")).cuerpo;
        assert.strictEqual(c.indice.procesos_contados, 12, "el recuento del corpus no depende del índice");
        assert.ok(c.indice.promedio_oferentes > 0,
          "con 12 procesos contados el promedio tiene base y no hay razón para ocultarlo");
        assert.strictEqual(c.indice.nivel, "sin_dato", "sin índice no hay clasificación posible");
        assert.ok(c.mensaje && /reconstr/i.test(c.mensaje),
          `el ⚪ con base suficiente debe explicarse y decir cómo arreglarlo: «${c.mensaje}»`);
        assert.ok(/reconstruir_indice/.test(c.mensaje),
          "el mensaje debe traer el parámetro exacto que lo arregla, no una vaguedad");

        // …y reconstruir el índice devuelve la clasificación, sin re-extraer nada
        const r = await invocar(historico, "/api/sync/historico?reconstruir_indice=true&presupuesto=20000&chain=0", CAB_TOKEN);
        assert.strictEqual(r.status, 200);
        assert.strictEqual(r.cuerpo.done, true, "la reconstrucción del índice no llegó a término");
        const tras = (await detalle("IDU", "&refrescar=1")).cuerpo;
        assert.strictEqual(tras.indice.nivel, "alta", "tras reconstruir, la entidad vuelve a estar clasificada");
        assert.strictEqual(tras.mensaje, null, "clasificada y con base: no hay nada que explicar");
      }

      /* --- (c) entidad inexistente: respuesta explícita, no un vacío mudo --- */
      {
        const r = await detalle("ALCALDIA DE UN MUNICIPIO QUE NO EXISTE");
        assert.strictEqual(r.status, 200, "no encontrar no es un error del servidor");
        assert.strictEqual(r.cuerpo.ok, true);
        assert.strictEqual(r.cuerpo.encontrada, false, "debe decir explícitamente que no la encontró");
        assert.deepStrictEqual(r.cuerpo.procesos, []);
        assert.deepStrictEqual(r.cuerpo.excluidos, []);
        assert.ok(/no hay procesos/i.test(r.cuerpo.mensaje), "un array vacío sin explicación no sirve");
      }

      /* --- (d) normalización: tildes, mayúsculas, espacios de más, puntuación --- */
      for (const [consulta, esperada] of [
        ["  alcaldia   de   purificacion  ", "ALCALDÍA DE PURIFICACIÓN"],
        ["ALCALDÍA DE PURIFICACIÓN", "ALCALDÍA DE PURIFICACIÓN"],
        ["gobernacion del tolima", "GOBERNACIÓN DEL TOLIMA"],
        // guion y espacios distintos: el nombre largo real de una CAR
        ["corporacion autonoma regional de las cuencas de los rios negro nare", ENTIDAD_CAR],
      ]) {
        const c = (await detalle(consulta, "&refrescar=1")).cuerpo;
        assert.strictEqual(c.encontrada, true, `«${consulta}» no encontró la entidad`);
        assert.strictEqual(c.entidad, esperada, "debe devolver el nombre original del dataset");
      }

      /* --- (e) muchos procesos: tope y metadata, sin mentir en los conteos --- */
      {
        const c = (await detalle("ENTIDAD SIN CONTEO DE OFERENTES", "&refrescar=1")).cuerpo;
        assert.strictEqual(c.excluidos.length, HIST_EQUIVALENCIAS,
          "una entidad con muchos procesos adjudicados sin oferentes los muestra todos hasta el tope");
        assert.strictEqual(c.indice.total_procesos_adjudicados, HIST_EQUIVALENCIAS);
        assert.strictEqual(c.indice.nivel, "sin_dato");
        // el tope se ejercita con un límite bajo: la LISTA se recorta pero las
        // CIFRAS siguen siendo las reales (si no, el detalle mentiría)
        const capado = await competenciaDetalle.detalleEntidad(redis, "ENTIDAD SIN CONTEO DE OFERENTES",
          { usarCache: false, maxProcesos: 5 });
        assert.strictEqual(capado.cuerpo.excluidos.length, 5, "la lista se recorta al tope");
        assert.strictEqual(capado.cuerpo.truncado.excluidos, HIST_EQUIVALENCIAS, "…y dice cuántos hay en realidad");
        assert.strictEqual(capado.cuerpo.indice.total_procesos_adjudicados, HIST_EQUIVALENCIAS,
          "el recorte es de presentación: las cifras no se tocan");
        assert.strictEqual(competenciaDetalle.MAX_PROCESOS_DETALLE, 200, "el tope real de la API es 200");
      }

      /* --- (f) caché: segunda llamada sin barrer el corpus --- */
      {
        const primera = await detalle("IDU", "&refrescar=1");
        assert.strictEqual(primera.cuerpo.cache, false, "con ?refrescar=1 nunca sale de caché");
        const segunda = await detalle("IDU");
        assert.strictEqual(segunda.cuerpo.cache, true, "la segunda llamada debe salir de caché");
        assert.deepStrictEqual(segunda.cuerpo.procesos, primera.cuerpo.procesos, "la caché no puede alterar la respuesta");
        assert.ok(segunda.cuerpo.comandosRedis < primera.cuerpo.comandosRedis,
          `la caché debe ahorrar comandos: ${segunda.cuerpo.comandosRedis} vs ${primera.cuerpo.comandosRedis}`);
        assert.ok(segunda.cuerpo.comandosRedis <= 3, "un acierto de caché son 2-3 comandos, no un barrido");
        // y RECONSTRUIR el índice la invalida al instante (sin esperar al TTL)
        await invocar(historico, "/api/sync/historico?reconstruir_indice=true&presupuesto=20000&chain=0", TOKEN);
        assert.strictEqual((await detalle("IDU")).cuerpo.cache, false,
          "reconstruir el índice debe invalidar los detalles cacheados");
      }

      /* --- (h) el barrido cubre TODOS los meses del histórico --- */
      {
        const c = (await detalle("IDU", "&refrescar=1")).cuerpo;
        const meses = new Set(c.procesos.map((p) => String(p.fecha_adjudicacion).slice(0, 7)));
        assert.ok(meses.size > 1, `los procesos de IDU viven en varios meses: se encontraron ${meses.size}`);
      }

      /* --- seguridad: ni adjudicatarios ni NITs salen de aquí --- */
      {
        const crudo = JSON.stringify((await detalle("GOBERNACIÓN DEL TOLIMA", "&refrescar=1")).cuerpo);
        for (const prohibido of ["nombre_del_proveedor", "nit_del_proveedor_adjudicado", "CONSTRUCTORA HIST",
          "CONSTRUCTORA DET", "valor_total_adjudicacion", "90010", "90050"]) {
          assert.ok(!crudo.includes(prohibido), `el detalle expuso «${prohibido}»`);
        }
      }

      /* --- chunk corrupto: se omite, se cuenta y el resto sigue --- */
      {
        const claves = await redis.scan(CLAVES.patronChunksHist);
        const victima = claves[0];
        const original = await redis.get(victima);
        await redis.set(victima, "esto-no-es-un-chunk-comprimido");
        const c = (await detalle("IDU", "&refrescar=1")).cuerpo;
        assert.strictEqual(c.ok, true, "un chunk corrupto no puede tumbar la consulta");
        assert.ok(c.chunks_ilegibles >= 1, "…pero tiene que quedar contado, no en silencio");
        await redis.set(victima, original);
      }

      /* --- Redis caído: 503 accionable, jamás un 500 mudo --- */
      {
        const url = process.env.UPSTASH_REDIS_REST_URL;
        process.env.UPSTASH_REDIS_REST_URL = "http://127.0.0.1:1";  // puerto cerrado
        const r = await detalle("IDU");
        process.env.UPSTASH_REDIS_REST_URL = url;
        assert.strictEqual(r.status, 503, `con Redis caído debía dar 503, dio ${r.status}`);
        assert.ok(/no disponible/i.test(r.cuerpo.error), "el 503 debe ser accionable");
      }

      /* ---- VOLCADO DE VERIFICACIÓN (solo con DUMP=1) ---- */
      if (process.env.DUMP === "1") {
        const linea = (k, v) => console.log(`   [${k}] ${v}`);
        console.log("\n=== CASOS DE BORDE (valores reales) ===");
        const a = (await detalle("GOBERNACIÓN DEL TOLIMA", "&refrescar=1")).cuerpo;
        linea("a) 8 con oferentes + 2 sin + 1 desierto", `procesos=${a.procesos.length} excluidos=${a.excluidos.length} `
          + `motivos=${JSON.stringify(a.excluidos.map((p) => p.motivo_exclusion))} contados=${a.indice.procesos_contados} adjudicados=${a.indice.total_procesos_adjudicados}`);
        const b = (await detalle("ALCALDÍA DE IBAGUÉ", "&refrescar=1")).cuerpo;
        linea("b) bajo el mínimo", `procesos=${b.procesos.length} excluidos=${b.excluidos.length} nivel=${b.indice.nivel} motivo=${b.excluidos[0].motivo_exclusion}`);
        linea("b) mensaje", b.mensaje);
        const c = (await detalle("ENTIDAD QUE NO EXISTE")).cuerpo;
        linea("c) inexistente", `status=200 encontrada=${c.encontrada} procesos=${c.procesos.length} excluidos=${c.excluidos.length}`);
        linea("c) mensaje", c.mensaje);
        const d = (await detalle("  alcaldia   de   purificacion  ", "&refrescar=1")).cuerpo;
        linea("d) normalización", `pedida=«  alcaldia   de   purificacion  » → devuelta=«${d.entidad}» procesos=${d.procesos.length}`);
        const dCar = (await detalle("corporacion autonoma regional de las cuencas de los rios negro nare", "&refrescar=1")).cuerpo;
        linea("d) puntuación", `«…rios negro nare» → «${dCar.entidad}» excluidos=${dCar.excluidos.length}`);
        const e1 = (await detalle("ENTIDAD SIN CONTEO DE OFERENTES", "&refrescar=1")).cuerpo;
        const e2 = (await competenciaDetalle.detalleEntidad(redis, "ENTIDAD SIN CONTEO DE OFERENTES", { usarCache: false, maxProcesos: 5 })).cuerpo;
        linea("e) muchos procesos", `sin tope: excluidos=${e1.excluidos.length} truncado=${JSON.stringify(e1.truncado)}`);
        linea("e) con tope 5", `lista=${e2.excluidos.length} truncado=${JSON.stringify(e2.truncado)} cifra_real=${e2.indice.total_procesos_adjudicados}`);
        const f1 = await detalle("IDU", "&refrescar=1");
        const f2 = await detalle("IDU");
        linea("f) caché", `1ª cache=${f1.cuerpo.cache} ${f1.cuerpo.duracionMs}ms ${f1.cuerpo.comandosRedis} comandos · `
          + `2ª cache=${f2.cuerpo.cache} ${f2.cuerpo.duracionMs}ms ${f2.cuerpo.comandosRedis} comandos`);
        const g = await invocar(detalleComp, "/api/competencia-detalle?entidad=IDU");
        linea("g) sin token", `status=${g.status} fuga=${JSON.stringify(g.cuerpo).includes("CO1.") ? "SÍ" : "no"}`);
        const h = (await detalle("IDU", "&refrescar=1")).cuerpo;
        const meses = [...new Set(h.procesos.map((p) => String(p.fecha_adjudicacion).slice(0, 7)))].sort();
        linea("h) varios meses", `${meses.length} meses distintos: ${meses.join(", ")}`);
        const inv = JSON.parse((await redis.hgetall("indice:competencia"))[filtros.norm("IDU")]);
        linea("INVARIANTE", `badge: promedio=${inv.promedio} procesos=${inv.procesos} nivel=${inv.nivel} · `
          + `detalle: promedio=${h.indice.promedio_oferentes} procesos=${h.indice.procesos_contados} nivel=${h.indice.nivel}`);
        console.log("=== FIN CASOS DE BORDE ===\n");
      }

      // la caché quedó poblada por las pruebas: se limpia para no arrastrarla
      const cacheadas = await redis.scan("indice:detalle:*");
      if (cacheadas.length) await redis.del(...cacheadas);
    }

    /* g. delta: fila nueva + cambio de estado (reemplazo y traslado al histórico) */
    {
      socrata.setFallos(false); // el delta corre limpio; los fallos ya se probaron en la full
      const ds = socrata.getDataset();
      const mesActual = MESES[MESES.length - 1];
      const nuevaId = `CO1.REQ.NUEVA.${n}`;
      ds.push({
        ":id": `row-zz-${n}`, ":updated_at": new Date().toISOString(),
        id_del_proceso: nuevaId, referencia_del_proceso: `REF-NUEVA-${n}`,
        fecha_de_publicacion_del: `${mesActual}-11T09:00:00.000`,
        entidad: "ALCALDÍA DE PURIFICACIÓN", ciudad_entidad: "PURIFICACIÓN", departamento_entidad: "Tolima",
        modalidad_de_contratacion: "Licitación pública", estado_del_procedimiento: "Publicado",
        fase: "Presentación de ofertas", precio_base: "300000000",
        duracion: "5", unidad_de_duracion: "Meses", respuestas_al_procedimiento: "1",
        nombre_del_procedimiento: `Construcción de puente vehicular ${n}`,
        descripci_n_del_procedimiento: "Obra de puente en concreto con anticipo del 40%",
        codigo_principal_de_categoria: "V1.72141000",
        urlproceso: { url: "https://community.secop.gov.co/x" },
      });
      // elegir una fila que SÍ está guardada y listada (obra, competitiva,
      // sin blacklist, cuantía dentro del K de Helder) y VERIFICAR su
      // presencia ANTES del cambio — sin eso, la aserción de ausencia
      // posterior podría pasar vacuamente
      const abierta = ds.find((f) => f.estado_del_procedimiento === "Publicado"
        && f.codigo_principal_de_categoria === "V1.72141000"
        && /^Construcción/.test(f.nombre_del_procedimiento)
        && /Licitación pública/.test(f.modalidad_de_contratacion)
        && parseFloat(f.precio_base) < 1e9
        && !f.id_del_proceso.includes("NUEVA"));
      const antes = await todasLasOportunidades("perfil=helder");
      assert.ok(antes.some((l) => l.id_del_proceso === abierta.id_del_proceso),
        "la fila elegida para adjudicar debía estar listada ANTES del delta");
      const histAntes = (await leerHistorico()).length;
      abierta.estado_del_procedimiento = "Adjudicado";
      abierta.adjudicado = "Si";
      abierta.nombre_del_proveedor = "CONSTRUCTORA GANADORA SAS";
      abierta.nit_del_proveedor_adjudicado = "901234567";
      abierta.valor_total_adjudicacion = abierta.precio_base;
      abierta.fecha_adjudicacion = `${mesActual}-20T10:00:00.000`;
      abierta.numero_de_ofertas = "4";
      abierta[":updated_at"] = new Date().toISOString();

      const rd = await invocar(sync, "/api/sync?modo=delta&presupuesto=20000&chain=0");
      assert.strictEqual(rd.cuerpo.ok, true, `delta falló: ${JSON.stringify(rd.cuerpo)}`);
      assert.strictEqual(rd.cuerpo.done, true, "delta quedó parcial");
      assert.ok(rd.cuerpo.delta.guardadas >= 2, `delta debía guardar ≥2 filas, guardó ${rd.cuerpo.delta.guardadas}`);
      assert.ok(rd.cuerpo.delta.historicas >= 1, "el delta no reportó traslados al histórico");

      const todas = await todasLasOportunidades("perfil=helder");
      assert.ok(todas.some((l) => l.id_del_proceso === nuevaId), "la fila nueva del delta no aparece");
      assert.ok(!todas.some((l) => l.id_del_proceso === abierta.id_del_proceso), "la fila adjudicada sigue apareciendo");

      /* el proceso que cerró SE MUDÓ al histórico, con sus datos de adjudicación */
      const hist = await leerHistorico();
      assert.ok(hist.length > histAntes, "el delta no escribió nada en el histórico");
      const mudado = hist.find((r) => r.id_del_proceso === abierta.id_del_proceso);
      assert.ok(mudado, "el proceso adjudicado no llegó al corpus histórico");
      assert.strictEqual(mudado.nombre_del_proveedor, "CONSTRUCTORA GANADORA SAS");
      assert.strictEqual(mudado.oferentes, 4);
      assert.strictEqual(mudado.fue_adjudicado, true);
      assert.strictEqual(mudado.proceso_abierto, false);
      // …y su copia en el activo (que solo existe para REEMPLAZAR a la versión
      // abierta vía :updated_at) va sin un solo dato de adjudicación
      const enActivo = (await leerActivo()).filter((r) => r.id_del_proceso === abierta.id_del_proceso);
      assert.ok(enActivo.length > 0, "falta el reemplazo en el activo: la versión abierta quedaría congelada");
      for (const r of enActivo) {
        for (const c of ["nombre_del_proveedor", "nit_del_proveedor_adjudicado", "valor_total_adjudicacion", "numero_de_ofertas"]) {
          assert.ok(!(c in r), `el corpus activo guardó el campo de adjudicación «${c}»`);
        }
      }
      // y la purga del activo jamás toca el histórico
      const histFinal = (await leerHistorico()).length;
      const rFull = await invocar(sync, "/api/sync?modo=full&presupuesto=20000&chain=0");
      assert.strictEqual(rFull.cuerpo.done, true, "la full de higiene no terminó en una invocación");
      assert.strictEqual((await leerHistorico()).length, histFinal,
        "una full de higiene borró parte del corpus histórico");
      assert.ok(!(await leerActivo()).some((r) => r.id_del_proceso === abierta.id_del_proceso),
        "la full de higiene debía dejar fuera del activo el proceso ya adjudicado");
    }

    /* g-bis. /api/diagnostico: el embudo cuadra con lo que sirve la app */
    {
      assert.strictEqual((await invocar(diagnostico, "/api/diagnostico?perfil=helder")).status, 401,
        "el diagnóstico expone el corpus: debe exigir token");
      const d = await invocar(diagnostico, "/api/diagnostico?perfil=helder&muestra=20",
        { "x-historico-token": process.env.HISTORICO_TOKEN });
      assert.strictEqual(d.status, 200, `diagnóstico falló: ${JSON.stringify(d.cuerpo).slice(0, 300)}`);
      const c = d.cuerpo;
      assert.ok(c.corpus.activo.filas_unicas > 0, "el diagnóstico no ve el corpus activo");
      assert.ok(c.corpus.historico.chunks > 0, "el diagnóstico no ve el corpus histórico");

      /* INVARIANTE FUERTE, reformulada al añadirse las puertas. Antes era
         «embudo.visibles == total de /api/oportunidades» y se cumplía por
         casualidad: con `solo_viables` encendido por defecto el total ya no es
         el conjunto de la cascada, y solo coincidía mientras ningún proceso
         fallara una puerta. La relación EXACTA es:

             embudo.visibles = viables + los que cierra P3

         y por el otro lado el reparto de puertas del diagnóstico tiene que ser
         el mismo que el de la app. Si divergen, hay dos cálculos de puertas y
         ninguno de los dos endpoints sirve para verificar al otro. */
      const real = await invocar(oportunidades, "/api/oportunidades?perfil=helder&por_pagina=1", CAB_TOKEN);
      assert.strictEqual(c.embudo.visibles, real.cuerpo.viables + c.distribucion_puertas.fallan_p3,
        `el embudo dice ${c.embudo.visibles} visibles y la app ${real.cuerpo.viables} viables + ${c.distribucion_puertas.fallan_p3} sin caja`);
      assert.strictEqual(c.distribucion_puertas.pasan_todas, real.cuerpo.viables,
        "el diagnóstico y la app no cuentan los mismos viables");
      assert.strictEqual(c.contrafactuales.visibles_solo_viables, c.distribucion_puertas.pasan_todas,
        "el contrafactual de viables tiene que ser el mismo conteo");

      /* Las puertas van ANIDADAS en el embudo y NO entran en su suma: son
         posteriores a la cascada y un proceso puede fallar dos a la vez. */
      assert.ok(c.embudo.puertas && typeof c.embudo.puertas.fuera_p3_caja === "number",
        "el embudo no publica el reparto de puertas");
      assert.strictEqual(c.embudo.puertas.fuera_p3_caja, c.distribucion_puertas.fallan_p3);
      assert.strictEqual(c.distribucion_puertas.fallan_p4, 0,
        "P4 no puede cerrar nunca: la competencia informa el orden, no la elegibilidad");
      /* P1 y P2 son 0 en esta posición, y no es un fallo: la cascada ya
         descartó antes lo que no es del RUP y lo que excede la capacidad, así
         que entre los visibles esas dos puertas no pueden cerrar. */
      assert.strictEqual(c.distribucion_puertas.fallan_p1, 0,
        "entre los visibles P1 no puede cerrar: la cascada ya filtró por objeto");
      assert.strictEqual(c.distribucion_puertas.fallan_p2, 0,
        "entre los visibles P2 no puede cerrar: la cascada ya filtró por capacidad");
      assert.strictEqual(c.contrafactuales.visibles_sin_filtro_caja, c.distribucion_puertas.pasan_rup_y_k,
        "el contrafactual «ignorando la caja» tiene que ser el conteo de pasan_rup_y_k");
      assert.ok(c.distribucion_puertas.pasan_rup_y_k >= c.distribucion_puertas.pasan_todas,
        "pasan_rup_y_k incluye a los que además pasan caja");

      // el embudo suma: nadie se pierde sin quedar contado en algún paso
      const bajas = Object.entries(c.embudo)
        .filter(([k]) => k.startsWith("fuera_")).reduce((a, [, v]) => a + v, 0);
      assert.strictEqual(bajas + c.embudo.visibles, c.embudo.total_activo,
        "el embudo no cuadra: hay procesos que desaparecen sin motivo registrado");

      /* los contrafactuales miden CADA mecanismo nuevo por separado */
      assert.ok(c.contrafactuales.pasarian_unspsc_jerarquico > c.contrafactuales.pasarian_unspsc_prefijo,
        "el matching jerárquico debe cubrir MÁS que el prefijo de 6 dígitos (el corpus trae familias)");
      assert.ok(c.contrafactuales.pasarian_unspsc_prefijo >= c.contrafactuales.pasarian_unspsc_exacto,
        "el prefijo nunca puede cubrir menos que la comparación exacta de 8 dígitos");
      assert.ok(c.contrafactuales.ganancia_por_jerarquia >= MESES.length,
        `la obra publicada por FAMILIA (una por mes) debía recuperarse: ganancia ${c.contrafactuales.ganancia_por_jerarquia}`);
      assert.ok(c.contrafactuales.ganancia_por_texto >= MESES.length,
        "las obras con segmento suelto y con código ilegible se rescatan por el objeto");
      assert.ok(c.contrafactuales.ganancia_por_equivalencias >= MESES.length,
        `las equivalencias aprendidas debían rescatar la clase afín: ${c.contrafactuales.ganancia_por_equivalencias}`);
      assert.ok(c.unspsc_cobertura.cubiertas_por_clase >= c.unspsc_cobertura.cubiertas_exacto_8_digitos,
        "el match jerárquico nunca puede cubrir menos que el exacto");
      assert.ok(c.unspsc_cobertura.codigos_ilegibles >= MESES.length,
        "los códigos que no son UNSPSC deben quedar CONTADOS, no desaparecer en silencio");

      /* la capa de pertinencia sacó de la pantalla los falsos positivos */
      assert.ok(c.embudo.fuera_no_pertinente >= 4 * MESES.length,
        `los 4 falsos positivos por mes debían morir en pertinencia: ${c.embudo.fuera_no_pertinente}`);
      assert.strictEqual(c.contrafactuales.visibles_sin_capa_pertinencia,
        c.embudo.visibles + c.embudo.fuera_no_pertinente + c.embudo.fuera_objeto_generico,
        "el contrafactual de pertinencia no cuadra");

      /* OBJETOS GENÉRICOS: el «objeto» es el nombre del trámite y su código */
      assert.ok(c.embudo.fuera_objeto_generico >= 2 * MESES.length,
        `los objetos genéricos por mes debían caer: ${c.embudo.fuera_objeto_generico}`);
      assert.ok(c.matching.objetos_genericos_ejemplos.some((g) => /CONVOCATORIA PUBLICA/i.test(g.objeto)),
        "el diagnóstico no muestra qué objetos genéricos se descartaron");

      /* RUTA DE TEXTO DÉBIL: contada aparte, con sus ejemplos y su contrafactual */
      assert.ok(c.embudo.fuera_texto_debil >= MESES.length,
        `la ruta de texto sin pertinencia verde debía filtrarse: ${c.embudo.fuera_texto_debil}`);
      assert.strictEqual(c.contrafactuales.visibles_incluyendo_texto_debil,
        c.embudo.visibles + c.embudo.fuera_texto_debil,
        "el contrafactual del toggle «sin código UNSPSC» no cuadra");
      assert.ok(c.matching.texto_debil_ejemplos.length > 0, "sin ejemplos de lo que devolvería el toggle");

      /* EQUIVALENCIAS: el diagnóstico explica POR QUÉ están como están */
      const porQue = c.conocimiento.equivalencias_por_que;
      assert.ok(porQue && Array.isArray(porQue.por_que) && porQue.por_que.length > 0,
        "el diagnóstico no explica el estado del índice de equivalencias");
      assert.strictEqual(porQue.hay, true, "en esta corrida SÍ hay equivalencias aprendidas");
      assert.ok(c.conocimiento.equivalencias.pares_evaluados > 0,
        "el diagnóstico debe reportar cuántos pares se evaluaron");
      assert.ok(c.conocimiento.equivalencias.descartados,
        "el diagnóstico debe reportar los descartes del aprendizaje");
      const terminos = Object.keys(c.distribuciones.no_pertinente_terminos_que_dispararon);
      // «logistico» es el término del CUMPLEAÑOS: se reporta el PRIMERO que
      // aparece en el objeto («APOYO LOGISTICO PARA EL CUMPLEAÑOS…»)
      for (const t of ["impresion", "alimentos", "logistico"]) {
        assert.ok(terminos.includes(t), `el diagnóstico no reporta el término «${t}» como causa`);
      }
      // internet viaja como término BLOQUEANTE, así que el tramo reportado es
      // el de la expresión completa («servicio de internet», «internet dedicado»)
      assert.ok(terminos.some((t) => /internet/.test(t)),
        `el diagnóstico no reporta ningún término de internet: ${terminos.join(" · ")}`);
      assert.ok(c.matching.no_pertinentes_ejemplos.length > 0, "sin ejemplos de falsos positivos bloqueados");

      /* el reparto por solidez del match cuadra con los visibles */
      const sumaTiers = Object.values(c.matching.visibles_por_tier).reduce((a, b) => a + b, 0);
      assert.strictEqual(sumaTiers, c.embudo.visibles,
        "todo visible debe tener un tier (clase, familia, equivalente o texto) y ninguno más");
      assert.strictEqual(Object.values(c.matching.visibles_por_pertinencia).reduce((a, b) => a + b, 0),
        c.embudo.visibles, "todo visible debe tener un nivel de pertinencia");
      assert.strictEqual(c.matching.visibles_por_pertinencia.rojo, 0,
        "un objeto NO pertinente jamás puede quedar entre los visibles");
      assert.ok(c.matching.visibles_por_tier.clase > 0 && c.matching.visibles_por_tier.familia > 0
        && c.matching.visibles_por_tier.texto > 0 && c.matching.visibles_por_tier.equivalente > 0,
        `el corpus de prueba tiene los cuatro tipos de match: ${JSON.stringify(c.matching.visibles_por_tier)}`);

      /* el conocimiento derivado se reporta (y el vocabulario dice de dónde sale) */
      assert.ok(c.conocimiento.equivalencias && c.conocimiento.equivalencias.pares > 0,
        "el diagnóstico no ve las equivalencias publicadas");
      assert.ok(["semilla", "historico+semilla"].includes(c.conocimiento.vocabulario.fuente),
        `fuente del vocabulario inesperada: ${c.conocimiento.vocabulario.fuente}`);
      assert.ok(c.conocimiento.vocabulario.familias >= textoUnspsc.vocabularioActivo(null).indice.size,
        "el vocabulario derivado MEZCLA con la semilla: nunca puede dejar menos familias que ella");

      // y las distribuciones traen los valores REALES de las columnas
      assert.ok(Object.keys(c.distribuciones.estado_del_procedimiento).length > 0, "sin distribución de estados");
      assert.ok(c.muestra.length > 0 && c.muestra[0].objeto, "sin muestra de procesos visibles");
      assert.ok(c.muestra.every((m) => m.match && m.pertinencia),
        "la muestra debe traer el veredicto graduado (match + pertinencia), no un sí/no");
      assert.ok(!c.muestra.some((m) => /aunar esfuerzos/i.test(m.objeto)), "un convenio llegó a la muestra de visibles");
    }

    /* ═══════════ g-bis. /api/resumen · el dashboard ═══════════
       La invariante que lo sostiene todo: `totales.visibles` TIENE que ser el
       mismo número que sirve /api/oportunidades. Si el panel calculara por su
       cuenta, tarde o temprano contradiría a la app y no se podría creer a
       ninguno de los dos. */
    {
      const r = await invocar(resumen, "/api/resumen?perfil=helder", CAB_TOKEN);
      assert.strictEqual(r.status, 200, `resumen falló: ${JSON.stringify(r.cuerpo).slice(0, 200)}`);
      const c = r.cuerpo;
      assert.strictEqual(c.ok, true);
      assert.strictEqual(c.perfil, "helder");
      assert.strictEqual(c.cache, false, "la primera llamada no puede venir de la caché");
      assert.strictEqual(r.cabeceras["x-cache"], "MISS", "la primera llamada debe declarar MISS");
      assert.ok(c.totales.visibles > 0, "el resumen no ve ningún proceso");

      // 1. el número es EL MISMO que el de la app
      const rOp = await invocar(oportunidades, "/api/oportunidades?perfil=helder&por_pagina=1", CAB_TOKEN);
      assert.strictEqual(c.totales.visibles, rOp.cuerpo.total,
        `el panel dice ${c.totales.visibles} visibles y la app ${rOp.cuerpo.total}: son dos cálculos distintos`);
      // …y también el mismo que el embudo del diagnóstico
      const rDia = await invocar(diagnostico, "/api/diagnostico?perfil=helder&muestra=1", CAB_TOKEN);
      assert.strictEqual(c.totales.visibles, rDia.cuerpo.embudo.visibles,
        "el panel y el diagnóstico no cuentan lo mismo");

      // 2-4. los repartos describen EXACTAMENTE el conjunto visible
      const suma = (o) => Object.values(o).reduce((a, b) => a + b, 0);
      assert.strictEqual(suma(c.totales.por_pertinencia), c.totales.visibles, "por_pertinencia no suma los visibles");
      assert.strictEqual(suma(c.totales.por_modalidad), c.totales.visibles, "por_modalidad no suma los visibles");
      assert.strictEqual(suma(c.totales.por_rango_cuantia), c.totales.visibles, "por_rango_cuantia no suma los visibles");
      assert.strictEqual(suma(c.totales.por_tier_unspsc), c.totales.visibles, "por_tier_unspsc no suma los visibles");
      assert.strictEqual(suma(c.totales.por_nivel_competencia_entidad), c.totales.visibles,
        "por_nivel_competencia_entidad no suma los visibles");
      assert.strictEqual(suma(c.totales.por_urgencia), c.totales.visibles,
        "por_urgencia no suma los visibles (algún proceso se perdió entre las cubetas de fecha)");
      assert.strictEqual(suma(c.totales.por_anticipo), c.totales.visibles, "por_anticipo no suma los visibles");
      assert.strictEqual(suma(c.totales.por_departamento), c.totales.visibles,
        "por_departamento no suma los visibles (el resto va a OTROS y lo no clasificable a SIN_DEPARTAMENTO)");
      // el embudo cierra: nadie desaparece sin quedar contado
      assert.strictEqual(suma(c.descartes) + c.totales.visibles, c.corpus.filas_unicas,
        "los descartes y los visibles deben sumar el corpus activo entero");
      // pertinencia ROJA nunca llega a los visibles (el diagnóstico fija lo mismo)
      assert.strictEqual(c.totales.por_pertinencia.obra_civil
        + c.totales.por_pertinencia.consultoria + c.totales.por_pertinencia.infraestructura
        + c.totales.por_pertinencia.verificar_objeto, c.totales.visibles, "hay un tipo de pertinencia sin cubeta");

      // la K se cuenta sobre los que pasaron el objeto, no sobre los visibles
      assert.ok(c.totales.base_capacidad >= c.totales.visibles,
        "la base de capacidad no puede ser menor que los visibles");
      assert.strictEqual(c.totales.superan_k + c.totales.no_superan_k + c.descartes.fuera_tope_estrategico,
        c.totales.base_capacidad, "superan_k + no_superan_k + fuera de tope debe ser la base de capacidad");
      assert.ok(c.totales.no_superan_k > 0 || c.descartes.fuera_tope_estrategico > 0,
        "el dataset de prueba tiene procesos de 9 000 M: alguno debe caerse por capacidad o tope");

      // top de entidades: ordenado y con su badge (el mismo texto de la app)
      assert.ok(c.top_entidades.length > 0 && c.top_entidades.length <= 15, "top_entidades fuera de rango");
      for (let i = 1; i < c.top_entidades.length; i++) {
        assert.ok(c.top_entidades[i - 1].procesos >= c.top_entidades[i].procesos, "top_entidades sin ordenar");
      }
      assert.ok(c.top_entidades.every((e) => /🟢|🟡|🔴|⚪/.test(e.badge)), "cada entidad debe traer su badge");
      assert.ok(c.top_entidades.some((e) => ["baja", "media", "alta"].includes(e.competencia)),
        "con el índice construido alguna entidad debe tener nivel de competencia");
      // destacados: nunca «Verificar objeto» ni cuantía 0, y como máximo 10
      assert.ok(c.procesos_destacados.length <= 10, "más de 10 destacados");
      for (const p of c.procesos_destacados) {
        assert.ok(p.cuantia_cop > 0, "un destacado sin cuantía");
        assert.notStrictEqual(p.pertinencia, "Verificar objeto", "un 🟡 no puede ser un destacado");
        assert.ok(p.objeto.length <= 100, "el objeto del destacado debe venir recortado a 100 caracteres");
        assert.ok(!("nombre_del_proveedor" in p) && !("adjudicatario_nombre" in p),
          "el panel jamás puede exponer datos de adjudicación");
      }
      // municipios: el dataset de prueba SÍ trae ciudad_entidad
      assert.ok(c.top_municipios && c.top_municipios.length > 0, "faltan los municipios (ciudad_entidad existe en el corpus)");

      /* ═══ DEFECTOS DE PRODUCCIÓN (ago 2026) ═══ */

      // la verificación cruzada que publica el propio endpoint
      assert.ok(c.integridad && c.integridad.ok === true,
        `el endpoint declara sus números inconsistentes: ${JSON.stringify(c.integridad)}`);

      /* (2) ningún proceso CERRADO puede estar entre los visibles ni encabezar
         los destacados. La cascada ya lo impide (exige estado_abierto), y los
         destacados lo vuelven a comprobar porque es la afirmación más fuerte
         que hace el panel. */
      const todosVisibles = await todasLasOportunidades("perfil=helder");
      for (const l of todosVisibles) {
        assert.ok(!filtros.estado_cerrado(l),
          `un proceso cerrado llegó al listado: ${l.estado_del_procedimiento} · ${l.nombre_del_procedimiento}`);
      }
      assert.ok(!c.procesos_destacados.some((p) => /adjudicad|desiert|cancelad/i.test(p.objeto)),
        "un proceso cerrado encabeza los destacados");
      for (const p of c.procesos_destacados) {
        const enCorpus = todosVisibles.find((l) => l.id_del_proceso === p.id_del_proceso);
        assert.ok(enCorpus, `el destacado «${p.objeto}» no está entre los visibles de /api/oportunidades`);
        assert.ok(!filtros.estado_cerrado(enCorpus), `el destacado «${p.objeto}» está cerrado`);
      }

      /* (3) el proceso de ESTRUCTURACIÓN: visible en la app —es real y
         competitivo— pero JAMÁS entre los diez que el panel recomienda. */
      const accionistaEnApp = todosVisibles.filter((l) => /SELECCION DE ACCIONISTA/i.test(l.nombre_del_procedimiento || ""));
      assert.ok(accionistaEnApp.length > 0,
        "el proceso de accionista debe seguir siendo VISIBLE en /api/oportunidades: pasa la cascada con toda razón");
      assert.ok(accionistaEnApp.some((l) => (l.cuantia_cop || 0) >= 900e6),
        "el proceso de accionista debe tener cuantía alta: si no, no probaría que encabezaría el panel");
      assert.ok(!c.procesos_destacados.some((p) => /accionista|socio estrateg|economia mixta/i.test(p.objeto)),
        `un proceso de estructuración encabeza los destacados: ${JSON.stringify(c.procesos_destacados.map((p) => p.objeto))}`);
      assert.ok(c.destacados_descartados.estructuracion > 0,
        "el panel debe CONTAR los que aparta por estructuración, no apartarlos en silencio");
      // …y sigue contando entre los visibles: apartarlo del top no lo esconde
      assert.ok(c.totales.visibles >= accionistaEnApp.length,
        "los descartes de destacados no pueden tocar totales.visibles");

      /* (1) entidad con MENOS de 5 procesos históricos: ni promedio ni nivel,
         ni en el índice, ni en la API, ni en el badge. */
      {
        const conIbague = todosVisibles.filter((l) => /IBAGU/i.test(l.entidad || ""));
        assert.ok(conIbague.length > 0, "el corpus de prueba tiene procesos de ALCALDÍA DE IBAGUÉ (3 en el histórico)");
        for (const l of conIbague) {
          assert.strictEqual(l.competencia_entidad.nivel, "sin_dato", "3 procesos no clasifican una entidad");
          assert.strictEqual(l.competencia_entidad.promedio_oferentes, null,
            "no puede viajar un promedio de una entidad que no se puede clasificar");
          assert.strictEqual(l.competencia_entidad.total_procesos, 3,
            "el CONTEO sí viaja: es lo que explica el ⚪ y no engaña a nadie");
        }
        const enPanel = c.top_entidades.find((e) => /IBAGU/i.test(e.entidad));
        if (enPanel) {
          assert.strictEqual(enPanel.competencia, "sin_dato");
          assert.strictEqual(enPanel.promedio_oferentes, null, "el panel tampoco puede enseñar ese promedio");
          assert.ok(!/\d/.test(enPanel.badge),
            `el badge sin base no puede llevar NINGÚN número: «${enPanel.badge}»`);
          assert.ok(/Sin datos hist/i.test(enPanel.badge), `el badge sin base debe decirlo: «${enPanel.badge}»`);
        }
        // y el badge de una entidad CON base sigue llevando su promedio
        const conBase = c.top_entidades.find((e) => e.competencia !== "sin_dato");
        assert.ok(conBase && /promedio/.test(conBase.badge) && /\d/.test(conBase.badge),
          "una entidad clasificada sí debe enseñar su promedio");
      }

      // 5. la segunda llamada viene de la caché, sin volver a barrer los chunks
      {
        const antes = redis.comandos();
        const r2 = await invocar(resumen, "/api/resumen?perfil=helder", CAB_TOKEN);
        assert.strictEqual(r2.status, 200);
        assert.strictEqual(r2.cuerpo.cache, true, "la segunda llamada debía venir de la caché");
        assert.strictEqual(r2.cabeceras["x-cache"], "HIT", "la segunda llamada debe declarar HIT");
        assert.strictEqual(r2.cuerpo.totales.visibles, c.totales.visibles, "la caché devolvió otros números");
        assert.ok(redis.comandos() - antes >= 0, "contador de comandos inconsistente");
        assert.ok(r2.cuerpo.top_entidades.length === c.top_entidades.length, "la caché truncó el top de entidades");
      }

      // 6. sin token → 401 (y el mensaje dice las dos formas de enviarlo)
      {
        const r3 = await invocar(resumen, "/api/resumen?perfil=helder");
        assert.strictEqual(r3.status, 401, "sin token debía responder 401");
        assert.ok(/token/i.test(r3.cuerpo.error), "el 401 debe explicar el token");
      }
      // 7. perfil inválido → 400 con los valores aceptados
      {
        const r4 = await invocar(resumen, "/api/resumen?perfil=constructor", CAB_TOKEN);
        assert.strictEqual(r4.status, 400, "un perfil inventado debía responder 400");
        assert.strictEqual(r4.cuerpo.error, "perfil inválido");
        assert.deepStrictEqual(r4.cuerpo.valores_validos, ["helder", "genesis", "consorcio", "juntos"]);
      }
      // 8. el alias «consorcio» resuelve al perfil plural, como en la app
      {
        const r5 = await invocar(resumen, "/api/resumen?perfil=consorcio", CAB_TOKEN);
        assert.strictEqual(r5.status, 200);
        assert.strictEqual(r5.cuerpo.perfil, "juntos", "el alias consorcio debe resolver a juntos");
        const rOpC = await invocar(oportunidades, "/api/oportunidades?perfil=juntos&por_pagina=1", CAB_TOKEN);
        assert.strictEqual(r5.cuerpo.totales.visibles, rOpC.cuerpo.total,
          "el panel del consorcio no coincide con la app");
      }
      console.log(`  · resumen: ${c.totales.visibles} visibles = total de /api/oportunidades · ${c.top_entidades.length} entidades · caché HIT/MISS verificada`);
    }

    /* ═══════════ g-ter. /api/admin/rup · cargar el RUP por archivo ═══════════
       El RUP deja de ser un dato hardcodeado. Lo que se verifica no es solo que
       el endpoint guarde, sino que la carga TENGA EFECTO en la siguiente
       consulta: esa es toda la promesa (el juicio corre al servir desde
       jul 2026, así que no hace falta re-sincronizar nada).
       Al final se restablece el respaldo del repositorio: una carga de prueba
       no puede contaminar el resto de la iteración. */
    {
      const visiblesAntes = (await invocar(oportunidades, "/api/oportunidades?perfil=helder&por_pagina=1", CAB_TOKEN)).cuerpo.total;

      /* 10. GET sin haber cargado nada → los valores del repositorio */
      {
        const r = await invocar(adminRup, "/api/admin/rup", CAB_TOKEN);
        assert.strictEqual(r.status, 200);
        assert.strictEqual(r.cuerpo.fuente, "hardcoded", "sin carga previa la fuente debe ser el repositorio");
        assert.ok(/por defecto/i.test(r.cuerpo.advertencia || ""), "debe advertir que son los valores por defecto");
        assert.ok(r.cuerpo.perfiles.helder.unspsc.length === PERFILES.helder.unspsc.size,
          "el GET debe devolver el RUP completo, listo para editar y volver a subir");
        // lo que devuelve el GET tiene que poder volver a subirse tal cual
        assert.strictEqual(configRup.validarConfig({ perfiles: r.cuerpo.perfiles }).ok, true,
          "el archivo que entrega el GET no pasa su propia validación: el ciclo descargar→subir está roto");
      }

      /* 9. sin token → 401, tanto en GET como en POST */
      {
        assert.strictEqual((await invocar(adminRup, "/api/admin/rup")).status, 401, "GET sin token debía ser 401");
        assert.strictEqual((await invocarPost(adminRup, "/api/admin/rup", { perfiles: {} })).status, 401,
          "POST sin token debía ser 401");
      }

      /* --- un RUP válido de los tres perfiles, con cambios verificables --- */
      const CODIGO_NUEVO = "15101500"; // combustibles: no está en ningún RUP real
      const base = perfilesMod.perfilesComoConfig();
      const nuevo = {
        perfiles: {
          helder: {
            ...base.helder,
            nombre: "Helder Gustavo Rodríguez Santana (RUP cargado)",
            nit: "900123456-7",
            unspsc: [...base.helder.unspsc, CODIGO_NUEVO],
          },
          genesis: { ...base.genesis, profesionales: 11 }, // CT 20 → 40
          consorcio: { ...base.consorcio, tope_smmlv: 11000 },
        },
      };

      /* 1. POST con JSON válido completo */
      {
        const r = await invocarPost(adminRup, "/api/admin/rup", nuevo, CAB_TOKEN);
        assert.strictEqual(r.status, 200, `carga válida rechazada: ${JSON.stringify(r.cuerpo).slice(0, 400)}`);
        assert.strictEqual(r.cuerpo.ok, true);
        assert.strictEqual(r.cuerpo.guardado, true);
        assert.deepStrictEqual(r.cuerpo.perfiles_cargados.sort(), ["consorcio", "genesis", "helder"]);
        assert.ok(r.cuerpo.unspsc.helder.clases > 0 && r.cuerpo.unspsc.genesis.clases > 0,
          "la respuesta debe decir cuántas clases/familias/segmentos quedaron por perfil");
        assert.ok(r.cuerpo.version, "la carga debe publicar un sello de versión");
        // las advertencias no bloquean: el tope es apetito estratégico y en el
        // RUP real va por debajo de la experiencia acreditada
        assert.ok(Array.isArray(r.cuerpo.advertencias), "faltan las advertencias");
        assert.ok(r.cuerpo.advertencias.some((a) => /tope_smmlv/.test(a)),
          `el tope por debajo de la experiencia debe AVISAR sin bloquear: ${JSON.stringify(r.cuerpo.advertencias)}`);
      }

      /* 2. GET después del POST → lo cargado, con fuente redis */
      {
        const r = await invocar(adminRup, "/api/admin/rup", CAB_TOKEN);
        assert.strictEqual(r.cuerpo.fuente, "redis", "tras cargar, la fuente debe ser Redis");
        assert.strictEqual(r.cuerpo.perfiles.helder.nit, "900123456-7", "el GET no devuelve lo que se cargó");
        assert.ok(r.cuerpo.perfiles.helder.unspsc.includes(CODIGO_NUEVO), "falta el código nuevo en el GET");
        assert.ok(r.cuerpo.cargado, "debe informar cuándo se cargó");
      }

      /* --- validación: cada error nombra su campo y NO se guarda nada --- */
      const casosMalos = [
        [{ perfiles: { helder: { ...base.helder, unspsc: "72141000" } } }, "perfiles.helder.unspsc", "unspsc no es un arreglo"],
        [{ perfiles: { helder: { ...base.helder, indicadores: undefined } } }, "perfiles.helder.indicadores", "faltan los indicadores"],
        [{ perfiles: { helder: { ...base.helder, unspsc: ["7214100"] } } }, "perfiles.helder.unspsc[0]", "código de 7 dígitos"],
        [{ perfiles: { helder: { ...base.helder, indicadores: { ...base.helder.indicadores, liquidez: 0 } } } }, "perfiles.helder.indicadores.liquidez", "liquidez = 0"],
        [{ perfiles: {} }, "perfiles", "ningún perfil"],
        [{ perfiles: { helder: { ...base.helder, unspsc: [...base.helder.unspsc, base.helder.unspsc[0]] } } }, "perfiles.helder.unspsc", "códigos duplicados"],
        [{ perfiles: { helder: { ...base.helder, tipo: "empresa" } } }, "perfiles.helder.tipo", "tipo desconocido"],
        [{ perfiles: { consorcio: { ...base.consorcio, tipo: "persona_natural" } } }, "perfiles.consorcio.tipo", "el plural no puede ser persona natural"],
        [{ perfiles: { helder: { ...base.helder, nit: "novale" } } }, "perfiles.helder.nit", "NIT mal formado"],
        [{ perfiles: { genesis: { ...base.genesis, indicadores: { ...base.genesis.indicadores, endeudamiento: 13 } } } }, "perfiles.genesis.indicadores.endeudamiento", "endeudamiento como porcentaje"],
        [{ perfiles: { genesis: { ...base.genesis, profesionales: 0 } } }, "perfiles.genesis.profesionales", "sin profesionales"],
      ];
      for (const [cuerpo, campo, que] of casosMalos) {
        const r = await invocarPost(adminRup, "/api/admin/rup", cuerpo, CAB_TOKEN);
        assert.strictEqual(r.status, 400, `${que}: esperaba 400, llegó ${r.status}`);
        assert.strictEqual(r.cuerpo.ok, false);
        assert.ok(r.cuerpo.errores.some((e) => e.campo === campo),
          `${que}: ningún error apunta a «${campo}» → ${JSON.stringify(r.cuerpo.errores)}`);
      }
      /* 8. body que no es JSON (llega como cadena, como lo mandaría un curl) */
      {
        const r = await invocarPost(adminRup, "/api/admin/rup", "{esto no es json", CAB_TOKEN);
        assert.strictEqual(r.status, 400, "un body ilegible debía responder 400");
        assert.ok(/JSON/i.test(r.cuerpo.error), `el error debe decir que el body no es JSON: ${r.cuerpo.error}`);
      }
      /* un rechazo NO puede tocar lo guardado */
      {
        const r = await invocar(adminRup, "/api/admin/rup", CAB_TOKEN);
        assert.strictEqual(r.cuerpo.perfiles.helder.nit, "900123456-7",
          "un POST rechazado pisó la configuración anterior: la carga no es atómica");
      }

      /* ═══ integración: la carga TIENE EFECTO, sin re-sincronizar ═══ */
      {
        // 1. getPerfil devuelve lo cargado, no lo hardcodeado
        const p = await perfilesMod.getPerfil("helder", redis);
        assert.ok(/RUP cargado/.test(p.nombre), `getPerfil sigue devolviendo el perfil del repositorio: ${p.nombre}`);
        assert.strictEqual(p.nit, "900123456-7", "el NIT cargado no llegó al perfil vigente");
        assert.notStrictEqual(p.nombre, perfilesMod.PERFILES_FALLBACK.helder.nombre, "el respaldo se quedó pegado");

        // 3. getUnspsc trae el código nuevo y el matching lo usa
        const u = await perfilesMod.getUnspsc("helder", redis);
        assert.ok(u.clases.has("151015"), `getUnspsc no ve la clase nueva: ${u.clases.size} clases`);
        const licNueva = {
          nombre_del_procedimiento: "Construcción de placa huella con material especial",
          descripci_n_del_procedimiento: "Obra civil en zona rural",
          codigo_principal_de_categoria: `V1.${CODIGO_NUEVO}`,
        };
        const ev = filtros.evaluarObjeto(licNueva, PERFILES.helder);
        assert.strictEqual(ev.tier, "clase", `el matching no usa el código recién cargado: tier=${ev.tier}`);
        // con el RUP del repositorio ese código NO está inscrito: lo más que
        // consigue es el rescate por texto. Si ya casara por clase, la prueba
        // no probaría nada.
        assert.notStrictEqual(filtros.evaluarObjeto(licNueva, perfilesMod.PERFILES_FALLBACK.helder).tier, "clase",
          "el código nuevo ya casaba por clase con el RUP del repositorio");

        // 2. más profesionales → CT sube de 20 a 40 → la K crece
        assert.strictEqual(PERFILES.genesis.profesionales, 11, "el perfil vigente no refleja los profesionales cargados");
        assert.strictEqual(capacidad.factorCT(PERFILES.genesis.profesionales), 40, "el factor CT no se recalculó");
        const kNueva = capacidad.crp(PERFILES.genesis, 100e6);
        const kVieja = capacidad.crp(perfilesMod.PERFILES_FALLBACK.genesis, 100e6);
        assert.ok(kNueva > kVieja, `la K de Génesis debía crecer con 11 profesionales: ${kNueva} vs ${kVieja}`);
        // …y la consulta real lo enseña
        const rg = await invocar(oportunidades, "/api/oportunidades?perfil=genesis&por_pagina=1", CAB_TOKEN);
        assert.strictEqual(rg.status, 200);
        assert.strictEqual(rg.cuerpo.resultados[0].rup.k_cop, Math.round(capacidad.crp(PERFILES.genesis, rg.cuerpo.resultados[0].cuantia_cop || 0)),
          "la K servida por la app no es la del RUP cargado");

        // el consorcio se RE-DERIVA: su unión incluye el código nuevo de Helder
        assert.ok(PERFILES.juntos.unspsc.has(CODIGO_NUEVO), "el consorcio no re-derivó la unión de UNSPSC");
        assert.strictEqual(PERFILES.juntos.integrantes.length, 2,
          "el consorcio debe seguir atado a sus integrantes: su K es la SUMA de las CRP");

        // la caché del panel se invalidó al cargar (sus números salen del RUP)
        assert.strictEqual((await redis.scan("resumen:*")).length, 0,
          "la carga de RUP debe invalidar la caché del dashboard");
        const rr = await invocar(resumen, "/api/resumen?perfil=helder", CAB_TOKEN);
        assert.strictEqual(rr.cuerpo.cache, false, "tras cargar el RUP el resumen no puede venir de la caché vieja");
        const rOp2 = await invocar(oportunidades, "/api/oportunidades?perfil=helder&por_pagina=1", CAB_TOKEN);
        assert.strictEqual(rr.cuerpo.totales.visibles, rOp2.cuerpo.total,
          "con el RUP cargado el panel y la app volvieron a divergir");
        assert.ok(rOp2.cuerpo.total >= visiblesAntes,
          "añadir un código al RUP no puede hacer desaparecer procesos");
      }

      /* borrar la configuración devuelve la app al respaldo del repositorio:
         nadie se queda sin perfiles porque una clave desaparezca */
      {
        const claves = await redis.scan("config:*");
        if (claves.length) await redis.del(...claves);
        await perfilesMod.recargarPerfiles(redis);
        assert.strictEqual(PERFILES.helder.nombre, perfilesMod.PERFILES_FALLBACK.helder.nombre,
          "al borrarse la configuración, los perfiles deben volver al respaldo");
        assert.strictEqual(perfilesMod.fuentePerfiles().fuente, "respaldo");
        const rv = await invocar(oportunidades, "/api/oportunidades?perfil=helder&por_pagina=1", CAB_TOKEN);
        assert.strictEqual(rv.cuerpo.total, visiblesAntes, "volver al respaldo no restauró los números originales");
        const viejas = await redis.scan("resumen:*");
        if (viejas.length) await redis.del(...viejas);
      }
      console.log("  · carga de RUP: 11 casos de validación, ciclo GET→editar→POST y efecto inmediato verificados");
    }

    /* ═══ g-quater. Experiencia ejecutada + auditoría de cobertura del RUP ═══
       Dos endpoints nuevos que responden a una pregunta que la app no sabía
       contestar: «¿qué códigos UNSPSC usa el mercado para lo que YO ya hago, y
       cuáles no tengo inscritos?».

       Este bloque corre DESPUÉS del de RUP a propósito: allí se borra `config:*`
       al terminar, así que aquí se empieza sin experiencia cargada — que es
       exactamente el estado en el que hay que comprobar el método base antes de
       comprobar el que usa la experiencia real.

       El corpus está diseñado para que cada casilla de la clasificación tenga un
       caso y ninguno pase por casualidad (ver COBERTURA_BLOQUES). */
    {
      const experiencia = require("../api/admin/experiencia.js");
      const coberturaApi = require("../api/admin/cobertura-rup.js");
      const libExp = require("../lib/experiencia.js");

      /* 8. sin token → 401 en los dos endpoints, en GET y en POST */
      {
        assert.strictEqual((await invocar(experiencia, "/api/admin/experiencia")).status, 401,
          "GET de experiencia sin token debía ser 401");
        assert.strictEqual((await invocarPost(experiencia, "/api/admin/experiencia", { contratos: [] })).status, 401,
          "POST de experiencia sin token debía ser 401");
        assert.strictEqual((await invocar(coberturaApi, "/api/admin/cobertura-rup?perfil=helder")).status, 401,
          "la auditoría de cobertura sin token debía ser 401");
        // …y un token MALO tampoco pasa (no hay degradación silenciosa)
        assert.strictEqual((await invocar(coberturaApi, "/api/admin/cobertura-rup?perfil=helder&token=basura")).status, 401);
      }

      /* 3-bis. GET sin haber cargado nada: no es un error, es un estado — y lo
         dice con la frase que el panel enseña tal cual */
      {
        const r = await invocar(experiencia, "/api/admin/experiencia", CAB_TOKEN);
        assert.strictEqual(r.status, 200);
        assert.strictEqual(r.cuerpo.cargada, false);
        assert.deepStrictEqual(r.cuerpo.contratos, []);
        assert.ok(/No hay experiencia cargada/.test(r.cuerpo.mensaje || ""),
          `sin experiencia el GET debe explicar qué hacer: ${r.cuerpo.mensaje}`);
      }

      /* 5. AUDITORÍA SIN EXPERIENCIA → método base (vocabulario de obra).
         Lo que se verifica es que NO se invente una similitud: el score viaja
         en null y la respuesta lo declara. */
      let sinExp = null;
      {
        const r = await invocar(coberturaApi, "/api/admin/cobertura-rup?perfil=helder", CAB_TOKEN);
        assert.strictEqual(r.status, 200, `auditoría sin experiencia falló: ${JSON.stringify(r.cuerpo).slice(0, 300)}`);
        sinExp = r.cuerpo;
        assert.strictEqual(sinExp.ok, true);
        assert.strictEqual(sinExp.experiencia_utilizada, false, "sin cargar nada no puede decir que usó la experiencia");
        assert.strictEqual(sinExp.contratos_experiencia, 0);
        assert.ok(/No hay experiencia cargada/.test(sinExp.mensaje || ""),
          `la auditoría debe avisar de que está en el método base: ${sinExp.mensaje}`);
        assert.ok(sinExp.faltantes.length > 0, "el método base tiene que detectar huecos igualmente");
        for (const f of sinExp.faltantes) {
          assert.strictEqual(f.score_similitud_promedio, null,
            `sin experiencia no puede publicarse un score de similitud (${f.codigo})`);
        }
        // el bloque de 15 procesos se detecta también por el método base
        const critico = sinExp.faltantes.find((f) => f.codigo === COD_COB_CRITICO);
        assert.ok(critico, `el método base no detectó ${COD_COB_CRITICO}`);
        assert.strictEqual(critico.criticidad, "CRÍTICO", "15 procesos de obra pura son CRÍTICO con o sin experiencia");
      }

      /* 2. POST con JSON inválido → 400, con el campo exacto señalado y SIN
         guardar nada. Los casos son los del encargo más los bordes del tope. */
      {
        const malos = [
          [{ contratos: [] }, "contratos", "arreglo vacío"],
          [{ contratos: "no soy un arreglo" }, "contratos", "no es un arreglo"],
          [{}, "contratos", "sin la clave contratos"],
          [{ contratos: [{ objeto: "", valor_cop: 1e6 }] }, "contratos[0].objeto", "objeto vacío"],
          [{ contratos: [{ objeto: "x".repeat(1001), valor_cop: 1e6 }] }, "contratos[0].objeto", "objeto de más de 1000 caracteres"],
          [{ contratos: [{ objeto: "CONSTRUCCION DE PLACA HUELLA" }] }, "contratos[0].valor_smmlv", "sin valor_cop ni valor_smmlv"],
          [{ contratos: [{ objeto: "CONSTRUCCION DE PLACA HUELLA", valor_cop: 1e6, participacion: 140 }] },
            "contratos[0].participacion", "participación fuera de 0-100"],
          [{ contratos: Array.from({ length: libExp.MAX_CONTRATOS + 1 }, () => ({ objeto: "CONSTRUCCION DE VIA", valor_cop: 1e6 })) },
            "contratos", "más de 500 contratos"],
        ];
        for (const [cuerpo, campo, que] of malos) {
          const r = await invocarPost(experiencia, "/api/admin/experiencia", cuerpo, CAB_TOKEN);
          assert.strictEqual(r.status, 400, `${que}: esperaba 400, llegó ${r.status}`);
          assert.strictEqual(r.cuerpo.ok, false);
          assert.ok(r.cuerpo.errores.some((e) => e.campo === campo),
            `${que}: ningún error apunta a «${campo}» → ${JSON.stringify(r.cuerpo.errores).slice(0, 300)}`);
        }
        // un body que no es JSON (como lo mandaría un curl mal escrito)
        const r = await invocarPost(experiencia, "/api/admin/experiencia", "{esto no es json", CAB_TOKEN);
        assert.strictEqual(r.status, 400);
        assert.ok(/JSON/i.test(r.cuerpo.error), `el error debe decir que el body no es JSON: ${r.cuerpo.error}`);
        // y NADA de esto pudo guardar
        assert.strictEqual((await invocar(experiencia, "/api/admin/experiencia", CAB_TOKEN)).cuerpo.cargada, false,
          "una carga rechazada dejó experiencia guardada");
      }

      /* 1. POST válido → 200 con el vocabulario extraído */
      {
        const r = await invocarPost(experiencia, "/api/admin/experiencia",
          { contratos: CONTRATOS_EXPERIENCIA }, CAB_TOKEN);
        assert.strictEqual(r.status, 200, `carga válida rechazada: ${JSON.stringify(r.cuerpo).slice(0, 300)}`);
        assert.strictEqual(r.cuerpo.ok, true);
        assert.strictEqual(r.cuerpo.contratos_cargados, CONTRATOS_EXPERIENCIA.length);
        assert.ok(r.cuerpo.terminos_extraidos > 0, "no se extrajo ningún término del objeto de los contratos");
        for (const t of ["construccion", "placa", "huella", "pavimentacion", "alcantarillado"]) {
          assert.ok(r.cuerpo.ejemplos_terminos.includes(t), `falta «${t}» entre los términos extraídos`);
        }
        // las palabras de trámite NO son vocabulario del oficio: si entraran,
        // cualquier objeto del dataset ganaría similitud gratis
        for (const t of ["prestacion", "servicios", "contrato", "para", "del"]) {
          assert.ok(!r.cuerpo.ejemplos_terminos.includes(t), `«${t}» es una stopword y se coló en el vocabulario`);
        }
        assert.ok(r.cuerpo.version && r.cuerpo.cargado, "la carga debe publicar sello y fecha");
        assert.ok(/auditoría de cobertura/i.test(r.cuerpo.nota || ""),
          "tras cargar hay que decir cuál es el siguiente paso");
      }

      /* 3. GET después del POST → los contratos, tal como se cargaron */
      {
        const r = await invocar(experiencia, "/api/admin/experiencia", CAB_TOKEN);
        assert.strictEqual(r.status, 200);
        assert.strictEqual(r.cuerpo.cargada, true);
        assert.strictEqual(r.cuerpo.contratos_cargados, CONTRATOS_EXPERIENCIA.length);
        assert.strictEqual(r.cuerpo.contratos[0].no_contrato, CONTRATOS_EXPERIENCIA[0].no_contrato);
        assert.strictEqual(r.cuerpo.contratos[0].objeto, CONTRATOS_EXPERIENCIA[0].objeto);
        assert.strictEqual(r.cuerpo.contratos[0].valor_smmlv, CONTRATOS_EXPERIENCIA[0].valor_smmlv);
        assert.ok(r.cuerpo.terminos_extraidos > 0, "el GET debe informar del vocabulario vigente");
      }

      /* 4 · 6 · 7. AUDITORÍA CON EXPERIENCIA: la priorización por similitud */
      let conExp = null;
      {
        const r = await invocar(coberturaApi, "/api/admin/cobertura-rup?perfil=helder", CAB_TOKEN);
        assert.strictEqual(r.status, 200, `auditoría con experiencia falló: ${JSON.stringify(r.cuerpo).slice(0, 300)}`);
        conExp = r.cuerpo;
        assert.strictEqual(conExp.experiencia_utilizada, true, "la experiencia recién cargada no se usó");
        assert.strictEqual(conExp.contratos_experiencia, CONTRATOS_EXPERIENCIA.length);
        assert.ok(conExp.terminos_experiencia > 0);
        assert.strictEqual(conExp.cache, false, "cargar experiencia tiene que invalidar la caché de la auditoría");

        /* 6. 15 procesos con el objeto de su experiencia → CRÍTICO y PRIMERO */
        const critico = conExp.faltantes.find((f) => f.codigo === COD_COB_CRITICO);
        assert.ok(critico, `${COD_COB_CRITICO} no aparece entre los códigos faltantes`);
        assert.strictEqual(critico.criticidad, "CRÍTICO");
        assert.strictEqual(critico.procesos_adjudicados, 15);
        assert.strictEqual(critico.procesos_altamente_relevantes, 15,
          "los 15 objetos son idénticos a un contrato ejecutado: todos altamente relevantes");
        assert.strictEqual(critico.score_similitud_promedio, 1,
          "un objeto cuyos términos están TODOS en la experiencia tiene similitud 1");
        assert.strictEqual(critico.segmento, "72");
        assert.strictEqual(critico.familia, "7213");
        assert.strictEqual(conExp.faltantes[0].codigo, COD_COB_CRITICO,
          "el puntaje combinado (volumen + similitud) debe poner el crítico en el primer puesto");
        assert.ok(/INSCRIBIR/.test(critico.recomendacion), `la recomendación debe ser accionable: ${critico.recomendacion}`);
        // ejemplos: hasta 5, los más similares primero, con la entidad y la cuantía
        assert.ok(critico.ejemplos_objetos.length > 0 && critico.ejemplos_objetos.length <= 5,
          "hasta 5 ejemplos de objeto por código");
        for (let i = 1; i < critico.ejemplos_objetos.length; i++) {
          assert.ok(critico.ejemplos_objetos[i - 1].similitud >= critico.ejemplos_objetos[i].similitud,
            "los ejemplos deben ir de más a menos similares");
        }
        assert.strictEqual(critico.entidades_top[0].entidad, ENTIDAD_COBERTURA);
        assert.strictEqual(critico.entidades_top[0].procesos, 15);
        assert.ok(critico.entidades_top.length <= 3, "top 3 de entidades por código");
        assert.ok(critico.cuantia.min > 0 && critico.cuantia.max >= critico.cuantia.min
          && critico.cuantia.promedio >= critico.cuantia.min, "rango de cuantías incoherente");

        /* 7. 3 procesos con un solo término en común → BAJO.
           Es el caso que separa las dos lecturas posibles del encargo: por
           conteo caería en MEDIO (2-4 procesos), pero sin un solo objeto
           altamente similar y con el promedio por debajo de 0,20 la evidencia
           es débil y la clasificación tiene que decirlo. */
        const bajo = conExp.faltantes.find((f) => f.codigo === COD_COB_BAJO);
        assert.ok(bajo, `${COD_COB_BAJO} no aparece entre los códigos faltantes`);
        assert.strictEqual(bajo.procesos_adjudicados, 3);
        assert.strictEqual(bajo.procesos_altamente_relevantes, 0);
        assert.strictEqual(bajo.procesos_moderadamente_relevantes, 3);
        assert.ok(bajo.score_similitud_promedio >= libExp.UMBRAL_MODERADA && bajo.score_similitud_promedio < 0.2,
          `el caso está calibrado entre 0,15 y 0,20: llegó ${bajo.score_similitud_promedio}`);
        assert.strictEqual(bajo.criticidad, "BAJO");
        assert.ok(critico.puntaje > bajo.puntaje, "el orden por puntaje combinado no separa el crítico del bajo");

        /* el código de SALUD ni siquiera entra al análisis, y se dice por qué */
        assert.ok(!conExp.faltantes.some((f) => f.codigo === COD_COB_SALUD),
          "un código de un nicho donde nunca se ha trabajado no puede recomendarse");
        const excluido = conExp.excluidos_por_baja_relevancia.find((e) => e.codigo === COD_COB_SALUD);
        assert.ok(excluido, "lo excluido por baja relevancia tiene que verse, no desaparecer en silencio");
        assert.strictEqual(excluido.procesos, 4);
        assert.ok(/fuera del nicho/.test(excluido.motivo), `el motivo debe explicarse: ${excluido.motivo}`);

        /* lo que YA está en el RUP no puede aparecer como hueco */
        for (const f of conExp.faltantes) {
          assert.ok(!PERFILES.helder.unspsc.has(f.codigo),
            `${f.codigo} está inscrito en el RUP de Helder y se reporta como faltante`);
          assert.ok(f.segmento >= "70" && f.segmento <= "95", `segmento fuera de obra: ${f.segmento}`);
          assert.ok(!filtros.SEGMENTOS_SERVICIOS_NO_CONSTRUCTIVOS.has(f.segmento),
            `${f.codigo}: los segmentos de servicios no constructivos no pueden ser un hueco de obra`);
        }

        /* INVARIANTE del embudo: cada proceso del histórico muere en exactamente
           un paso. Sin esto, cualquier cifra de la auditoría es indemostrable. */
        const e = conExp.embudo;
        assert.strictEqual(
          e.sin_adjudicacion + e.baja_relevancia + e.no_pertinentes + e.sin_codigo_utilizable
          + e.sin_codigo_faltante + e.con_codigo_faltante,
          e.procesos_historico,
          "los pasos del embudo de cobertura no suman el total del histórico");
        assert.strictEqual(conExp.resumen.procesos_analizados, e.procesos_historico);
        assert.strictEqual(conExp.resumen.procesos_relevantes,
          e.procesos_historico - e.sin_adjudicacion - e.baja_relevancia);
        assert.strictEqual(conExp.resumen.codigos_faltantes_detectados, conExp.faltantes.length);
        assert.strictEqual(conExp.resumen.criticos + conExp.resumen.altos + conExp.resumen.medios + conExp.resumen.bajos,
          conExp.faltantes.length, "el reparto por criticidad debe sumar los códigos faltantes");
        assert.strictEqual(conExp.resumen.codigos_en_rup, PERFILES.helder.unspsc.size);
      }

      /* la auditoría depende del PERFIL, no solo del corpus: para Génesis el
         código de salud SÍ está inscrito, así que no puede figurar ni como
         hueco ni como excluido por relevancia */
      {
        const r = await invocar(coberturaApi, "/api/admin/cobertura-rup?perfil=genesis", CAB_TOKEN);
        assert.strictEqual(r.status, 200);
        assert.strictEqual(r.cuerpo.perfil, "genesis");
        assert.ok(!r.cuerpo.excluidos_por_baja_relevancia.some((x) => x.codigo === COD_COB_SALUD),
          "85121700 está en el RUP de Génesis: no es ni hueco ni exclusión");
        assert.ok(r.cuerpo.faltantes.some((f) => f.codigo === COD_COB_CRITICO),
          "el hueco de obra es el mismo para los dos perfiles");
        assert.strictEqual(r.cuerpo.resumen.codigos_en_rup, PERFILES.genesis.unspsc.size);
      }

      /* toggle ?usar_experiencia=false: vuelve al método base sin borrar nada */
      {
        const r = await invocar(coberturaApi, "/api/admin/cobertura-rup?perfil=helder&usar_experiencia=false", CAB_TOKEN);
        assert.strictEqual(r.cuerpo.experiencia_utilizada, false, "el toggle no apagó la priorización por experiencia");
        assert.strictEqual((await invocar(experiencia, "/api/admin/experiencia", CAB_TOKEN)).cuerpo.cargada, true,
          "consultar sin experiencia no puede borrar la experiencia cargada");
      }

      /* caché: la segunda consulta idéntica viene de Redis, ?refrescar la salta,
         y una carga nueva de experiencia la invalida entera */
      {
        const hit = await invocar(coberturaApi, "/api/admin/cobertura-rup?perfil=helder", CAB_TOKEN);
        assert.strictEqual(hit.cuerpo.cache, true, "la segunda consulta idéntica debía venir de la caché");
        assert.strictEqual(hit.cuerpo.faltantes.length, conExp.faltantes.length, "la caché devolvió otra cosa");
        const fresca = await invocar(coberturaApi, "/api/admin/cobertura-rup?perfil=helder&refrescar=1", CAB_TOKEN);
        assert.strictEqual(fresca.cuerpo.cache, false, "?refrescar debe recalcular");

        await invocarPost(experiencia, "/api/admin/experiencia", { contratos: CONTRATOS_EXPERIENCIA }, CAB_TOKEN);
        const tras = await invocar(coberturaApi, "/api/admin/cobertura-rup?perfil=helder", CAB_TOKEN);
        assert.strictEqual(tras.cuerpo.cache, false,
          "cargar experiencia nueva tiene que invalidar la auditoría cacheada");
      }

      /* usos incorrectos: el perfil es obligatorio (no hay default: servir el
         de otro perfil sería la peor forma de equivocarse) y la auditoría no
         escribe nada */
      {
        assert.strictEqual((await invocar(coberturaApi, "/api/admin/cobertura-rup", CAB_TOKEN)).status, 400,
          "sin perfil debía responder 400");
        assert.strictEqual((await invocar(coberturaApi, "/api/admin/cobertura-rup?perfil=inventado", CAB_TOKEN)).status, 400);
        assert.strictEqual(
          (await invocar(coberturaApi, "/api/admin/cobertura-rup?perfil=helder", CAB_TOKEN, { metodo: "POST" })).status, 405,
          "la auditoría solo lee: un POST debe responder 405");
        // el alias del consorcio funciona igual que en el resto de la API
        assert.strictEqual((await invocar(coberturaApi, "/api/admin/cobertura-rup?perfil=consorcio", CAB_TOKEN)).cuerpo.perfil,
          "juntos", "el alias «consorcio» debe resolver al perfil plural");
      }

      /* no contaminar lo que viene después: la experiencia y la caché se borran
         (el resto de la iteración cuenta procesos y no puede heredar esto) */
      {
        const claves = [...await redis.scan("config:experiencia*"), ...await redis.scan("cobertura:*")];
        if (claves.length) await redis.del(...claves);
      }
      console.log(`  · cobertura RUP: ${conExp.faltantes.length} códigos faltantes (${conExp.resumen.criticos} críticos) `
        + `sobre ${conExp.resumen.procesos_analizados} procesos históricos · método base y con experiencia verificados`);
    }

    /* h. la raíz sirve el frontend (Vercel: /public es el output estático) */
    {
      const html = fs.readFileSync(path.join(__dirname, "..", "public", "index.html"), "utf8");
      for (const debe of ['id="gate"', 'id="app"', "/app.js", "cdn.tailwindcss.com", 'id="btn-buscar"',
        'id="f-entidad"', '<option value="atractividad">']) {
        assert.ok(html.includes(debe), `index.html sin ${debe}`);
      }
      // el orden por defecto de la app debe ser el de atractividad: primera opción del selector
      const opciones = html.slice(html.indexOf('id="f-ordenar"')).match(/<option value="([^"]+)"/g) || [];
      assert.strictEqual(opciones[0], '<option value="atractividad"', "«Más atractivas» debe ser la opción por defecto");
      const js = fs.readFileSync(path.join(__dirname, "..", "public", "app.js"), "utf8");
      new Function(js); // valida sintaxis sin ejecutar
      assert.ok(js.includes('"231105"'), "app.js sin la clave de acceso");

      /* ---- LA LISTA NO PIDE TOKEN (ago 2026) ----
         El cliente entra a ver oportunidades; pedirle una credencial dejaba la
         app inservible para él. Lo que se vigila aquí es que `buscar()` no
         pueda volver a bloquearse: ni exigiendo token antes de llamar, ni
         abriendo el formulario cuando falta. */
      {
        const i = js.indexOf("async function buscar()");
        const cuerpo = js.slice(i, js.indexOf("\n  }", i));
        assert.ok(i > 0, "no se encontró buscar() en app.js");
        assert.ok(!/pedirToken/.test(cuerpo),
          "buscar() volvió a abrir el formulario del token: la lista pública no puede pedir credencial");
        assert.ok(!/if\s*\(!token\)/.test(cuerpo),
          "buscar() volvió a exigir token antes de consultar");
        assert.ok(/olvidarToken\(\)/.test(cuerpo) && /return buscar\(\)/.test(cuerpo),
          "un 401 por token caducado debe olvidarlo y reintentar sin él, no bloquear");
      }
      // `pedirTokenParaBuscar` era el atajo que bloqueaba la lista: no vuelve
      assert.ok(!js.includes("pedirTokenParaBuscar"),
        "pedirTokenParaBuscar volvió: la lista no puede depender de un token");
      // …pero el formulario SIGUE existiendo para el detalle de competencia,
      // que sí exige credencial porque abre el corpus histórico de una entidad
      assert.ok(/function pedirToken\(/.test(js) && /cargarDetalle/.test(js),
        "el formulario del token debe seguir existiendo para el detalle de competencia");
      {
        const i = js.indexOf("async function cargarDetalle");
        const cuerpo = js.slice(i, js.indexOf("\n  }", i));
        assert.ok(i > 0 && /pedirToken\(/.test(cuerpo),
          "cargarDetalle debe seguir pidiendo el token: /api/competencia-detalle no se relajó");
      }

      /* panel de administración: encadenado de la sincronización */
      const admHtml = fs.readFileSync(path.join(__dirname, "..", "public", "admin.html"), "utf8");
      for (const debe of ['id="gate"', 'id="app"', "/admin.js", "cdn.tailwindcss.com",
        'id="btn-iniciar"', 'id="btn-detener"', 'id="prog-barra"', 'id="m-tandas"', 'id="chip-texto"']) {
        assert.ok(admHtml.includes(debe), `admin.html sin ${debe}`);
      }
      const admJs = fs.readFileSync(path.join(__dirname, "..", "public", "admin.js"), "utf8");
      new Function(admJs); // valida sintaxis sin ejecutar
      assert.ok(admJs.includes('"231105"'), "admin.js sin la clave de acceso");
      // la secuencia de modos es lo único que puede colgar el encadenado
      assert.ok(/modo=\$\{modo\}/.test(admJs), "admin.js debe parametrizar el modo, no fijarlo");
      assert.ok(/let modo = "full"/.test(admJs), "la primera tanda debe ser modo=full");
      assert.ok((admJs.match(/modo = "auto"/g) || []).length >= 2,
        "las tandas siguientes deben pasar a modo=auto (si no, la carga se reinicia sin fin)");
      // esperas del encargo: 3 s entre tandas, 10 s con el candado tomado, backoff 5/10/20
      assert.ok(/ESPERA_ENTRE_TANDAS_MS = 3000/.test(admJs), "espera entre tandas ≠ 3 s");
      assert.ok(/ESPERA_CANDADO_MS = 10000/.test(admJs), "espera por candado ≠ 10 s");
      assert.ok(/BACKOFF_MS = \[5000, 10000, 20000\]/.test(admJs), "backoff de reintentos ≠ 5/10/20 s");
      for (const debe of ["bandaCompetencia", "competencia_entidad", "Poca competencia", "Alta competencia"]) {
        assert.ok(js.includes(debe), `app.js sin ${debe} (la tarjeta no muestra la competencia de la entidad)`);
      }
      /* DEFECTO «18.2 oferentes en 0 procesos»: el badge no puede interpolar un
         promedio sin comprobar antes que haya base. La condición se llama
         `conBase` y exige las tres cosas a la vez. */
      {
        const i = js.indexOf("function bandaCompetencia");
        const cuerpo = js.slice(i, js.indexOf("\n  }", i));
        assert.ok(i > 0 && /const conBase = /.test(cuerpo),
          "bandaCompetencia debe decidir con `conBase` si hay base para enseñar un promedio");
        assert.ok(/procesos > 0/.test(cuerpo) && /nivel !== "sin_dato"/.test(cuerpo) && /promedio != null/.test(cuerpo),
          "`conBase` debe exigir procesos > 0, nivel clasificado y promedio presente");
        assert.ok(/conBase\s*\n?\s*\?\s*`\$\{d\.titulo\} — promedio/.test(cuerpo),
          "el promedio solo puede interpolarse en la rama `conBase`");
        // sin base, el texto es el título de sin_dato: ninguna cifra
        assert.ok(/:\s*d\.titulo;/.test(cuerpo), "sin base, el badge debe quedarse en el título, sin números");
      }
      // el modal aplica la misma regla al resumen del detalle
      assert.ok(/i\.promedio_oferentes != null && i\.procesos_contados > 0/.test(js),
        "el modal tampoco puede pintar un promedio sin procesos contados detrás");

      /* LA CAUSA REAL del «promedio 18,2 oferentes en 0 procesos»: el detalle
         en línea del panel leía `i.total_procesos`, un campo que
         /api/competencia-detalle NUNCA ha devuelto (ese nombre pertenece al
         OTRO payload, el `competencia_entidad` de /api/oportunidades). El
         `|| 0` disfrazaba el `undefined` de cero, así que el conteo era 0
         SIEMPRE, con cualquier entidad y cualquier dato. */
      {
        const i = admJs.indexOf('$("d-entidades").addEventListener');
        // sin comentarios: lo que se vigila es el CÓDIGO. El comentario que
        // explica el defecto cita el campo viejo a propósito.
        const handler = sinComentarios(admJs.slice(i, admJs.indexOf("\n  });", i)));
        assert.ok(i > 0, "no se encontró el detalle en línea del panel");
        assert.ok(!/i\.total_procesos/.test(handler),
          "el detalle del panel vuelve a leer `total_procesos`: ese campo NO existe en /api/competencia-detalle");
        assert.ok(/i\.procesos_contados/.test(handler),
          "el conteo del detalle se llama `procesos_contados` — es el nombre que devuelve el endpoint");
        assert.ok(/const conBase = /.test(handler),
          "el detalle del panel debe exigir base antes de pintar un promedio, igual que el badge");
      }
      /* Y la regla que evita repetirlo: un conteo ausente NO se pinta como 0.
         Ningún renderizador puede convertir «no sé» en «cero» con un `|| 0`. */
      for (const [archivo, fuente] of [["app.js", js], ["admin.js", admJs]]) {
        // `Number(x) || 0` sí es legítimo: normaliza un valor YA leído. Lo que
        // no puede haber es `i.campo || 0` a pelo sobre el conteo.
        const codigo = sinComentarios(fuente).replace(/Number\([^)]*\)\s*\|\|\s*0/g, "");
        assert.ok(!/\bi\.(?:procesos_contados|total_procesos)\s*\|\|\s*0/.test(codigo),
          `${archivo}: un conteo leído con «|| 0» convierte un campo ausente en un cero creíble`);
      }
      /* veredicto GRADUADO en la tarjeta: un badge por la solidez del match y
         otro por el tipo de objeto. Sin esto el dueño no puede decidir. */
      for (const debe of ["badgesRup", "MATCH_UNSPSC", "RUP ✓", "RUP ~ (familia)", "RUP ≈ (clase afín)",
        "Objeto sugiere obra", "PERTINENCIA", "por_match"]) {
        assert.ok(js.includes(debe), `app.js sin ${debe} (la tarjeta no muestra el veredicto graduado)`);
      }
      /* toggle «Incluir procesos sin código UNSPSC»: apagado por defecto (sin
         atributo `checked` en el HTML) y cableado al parámetro de la API */
      /* modal de competencia: el badge deja de ser una caja negra */
      for (const debe of ['id="modal-competencia"', 'id="modal-fondo"', 'id="modal-titulo"',
        'id="modal-cuerpo"', 'id="modal-cerrar"', 'id="modal-cerrar-pie"', 'role="dialog"', 'aria-modal="true"']) {
        assert.ok(html.includes(debe), `index.html sin ${debe} (falta el modal del detalle de competencia)`);
      }
      assert.ok(/id="modal-competencia"[^>]*\bhidden\b/.test(html), "el modal debe arrancar oculto");
      for (const debe of ["banda-competencia", "cargarDetalle", "abrirModal", "cerrarModal",
        "/api/competencia-detalle", "x-historico-token", "sessionStorage", "MOTIVO_EXCLUSION"]) {
        assert.ok(js.includes(debe), `app.js sin ${debe} (el badge no abre el detalle)`);
      }
      /* el formulario del token: clave acordada, etiqueta explícita y —sobre
         todo— NINGÚN camino silencioso. Un botón que «no hace nada» es peor
         que un error: el campo vacío tiene que avisar. */
      assert.ok(/CLAVE_TOKEN = "historico_token"/.test(js), "la clave de sesión debe ser historico_token");
      assert.ok(js.includes("Guardar y ver detalle"), "el botón debe decir «Guardar y ver detalle»");
      assert.ok(/Pegue el token/.test(js), "el campo vacío debe avisar, nunca quedarse mudo");
      assert.ok(/Token inválido/.test(js), "un 401 debe decir «Token inválido» y dejar escribir otro");
      assert.ok(/\$\("btn-token"\)\.addEventListener\("click", enviar\)/.test(js)
        && /\$\("form-token"\)\.addEventListener\("submit", enviar\)/.test(js),
        "el envío debe estar cableado al submit Y al clic del botón");
      assert.ok(/try \{ return sessionStorage\.getItem/.test(js),
        "leer sessionStorage debe ir protegido: si lanza, el clic moría en silencio");
      // mostrar/ocultar el modal no puede depender del orden del CSS generado
      assert.ok(/style\.display = "flex"/.test(js) && /style\.display = "none"/.test(js),
        "el modal debe fijar display en línea (las clases hidden/flex compiten por la misma propiedad)");

      /* ARRANQUE: `abrirApp()` automático tiene que ir DESPUÉS de declarar el
         estado de la vista. Estaba antes, y en cada visita repetida de la misma
         pestaña `buscar()` reventaba en la zona muerta temporal de
         `timerReintento` — la app se quedaba sin resultados en silencio. */
      {
        const iAuto = js.indexOf('sessionStorage.getItem("detecta-acceso") === "1"');
        const iEstado = js.indexOf("let pagina = 1, reintentosSync = 0, timerReintento = null;");
        assert.ok(iAuto > 0 && iEstado > 0, "no se encontraron el arranque automático y el estado de la vista");
        assert.ok(iAuto > iEstado,
          "el arranque automático corre antes de declarar timerReintento: buscar() morirá en la zona muerta temporal");
      }
      // el badge tiene que ser pulsable y llevar la entidad consigo
      assert.ok(/data-entidad=/.test(js), "el badge debe llevar la entidad en data-entidad");
      assert.ok(/cursor-pointer/.test(js) && /hover:underline/.test(js), "el badge debe verse pulsable");
      // las tres formas de cerrar del encargo: botón, tecla ESC y clic fuera
      assert.ok(/"modal-cerrar"\)\.addEventListener\("click", cerrarModal\)/.test(js), "no se cierra con el botón");
      assert.ok(/"modal-cerrar-pie"\)\.addEventListener\("click", cerrarModal\)/.test(js), "no se cierra con [Cerrar]");
      assert.ok(/"modal-fondo"\)\.addEventListener\("click", cerrarModal\)/.test(js), "no se cierra al hacer clic fuera");
      assert.ok(/e\.key === "Escape"/.test(js), "no se cierra con ESC");
      // el token NUNCA puede viajar en la URL del frontend
      assert.ok(!/competencia-detalle\?[^`"']*token=/.test(js),
        "el token del detalle no puede ir en la URL: va por cabecera");
      // los delegados escuchan en el contenedor: las tarjetas se repintan
      assert.ok(/\$\("lista"\)\.addEventListener\("click"/.test(js), "el clic del badge debe ir por delegación");

      /* ---- panel: dashboard de procesos y carga de RUP ---- */
      for (const debe of ['id="dashboard"', 'id="d-perfil"', 'id="btn-actualizar"', 'id="d-visibles"',
        'id="d-obra"', 'id="d-consultoria"', 'id="d-semana"', 'id="d-barras"', 'id="d-entidades"',
        'id="d-departamentos"', 'id="d-destacados"', 'id="d-meta"', 'id="d-skeleton"',
        'id="seccion-rup"', 'id="rup-archivo"', 'id="rup-preview"', 'id="btn-rup-cargar"',
        'id="btn-rup-cancelar"', 'id="btn-rup-descargar"', 'id="rup-actual"',
        'id="seccion-token"', 'id="input-token-admin"']) {
        assert.ok(admHtml.includes(debe), `admin.html sin ${debe} (falta el dashboard o la carga de RUP)`);
      }
      // las tarjetas llevan los colores del encargo y el esqueleto pulsa
      for (const debe of ["bg-blue-50", "bg-green-50", "bg-amber-50", "bg-red-50", "animate-pulse"]) {
        assert.ok(admHtml.includes(debe), `admin.html sin ${debe} (tarjetas del dashboard)`);
      }
      // responsive: 2 columnas en móvil → 4 en escritorio, tablas apiladas
      assert.ok(/grid-cols-2[^"]*sm:grid-cols-4/.test(admHtml), "las tarjetas deben apilarse en 2 columnas en móvil");
      assert.ok(/lg:grid-cols-2/.test(admHtml), "las tablas laterales deben apilarse en móvil");
      // el archivo solo acepta JSON
      assert.ok(/id="rup-archivo"[^>]*accept="\.json/.test(admHtml), "el input de archivo debe aceptar solo .json");

      for (const debe of ["/api/resumen", "/api/admin/rup", "cache_bust", "X-Cache", "x-historico-token",
        "FileReader", "readAsText", "revokeObjectURL", "visibilityState", "dashboard_perfil"]) {
        assert.ok(admJs.includes(debe), `admin.js sin ${debe} (el panel o la carga de RUP no están cableados)`);
      }
      // la clave de sesión del token es LA MISMA que la de la app
      assert.ok(/CLAVE_TOKEN = "historico_token"/.test(admJs), "el panel debe reutilizar la clave de sesión historico_token");
      // el refresco automático es el mismo TTL de la caché del endpoint
      assert.ok(/REFRESCO_MS = 300000/.test(admJs), "el refresco automático debe ser de 5 minutos");
      // …y NO se dispara con la pestaña oculta
      assert.ok(/document\.visibilityState === "visible"\) cargarDashboard\(\)/.test(admJs),
        "el refresco automático no puede correr con la pestaña oculta");
      assert.ok(/pendientePorVisibilidad/.test(admJs), "al volver a la pestaña debe refrescarse lo que quedó pendiente");
      // doble clic en «Confirmar carga»: el botón se deshabilita durante el envío
      assert.ok(/\$\("btn-rup-cargar"\)\.disabled = true/.test(admJs),
        "«Confirmar carga» debe deshabilitarse durante el envío (si no, un doble clic carga dos veces)");
      // el token NUNCA viaja en la URL desde el navegador
      assert.ok(!/\/api\/(resumen|admin\/rup)\?[^`"']*token=/.test(admJs),
        "el token no puede ir en la URL del panel: va por cabecera");
      // sessionStorage siempre dentro de try (en modo restringido lanza)
      assert.ok(/try \{ return sessionStorage\.getItem\(CLAVE_TOKEN\)/.test(admJs),
        "leer el token debe ir protegido: si lanza, el panel moriría en silencio");
      // el campo de token vacío AVISA, nunca se queda mudo
      assert.ok(/Pegue el token antes de guardar/.test(admJs), "el token vacío debe avisar");
      assert.ok(/\$\("btn-token-admin"\)\.addEventListener\("click", enviarToken\)/.test(admJs)
        && /\$\("form-token-admin"\)\.addEventListener\("submit", enviarToken\)/.test(admJs),
        "el token debe estar cableado al submit Y al clic");
      // sin token, el panel no se queda en blanco: dice qué falta
      assert.ok(/Configure su token de acceso/.test(admJs), "sin token el panel debe explicar qué hacer");
      /* ARRANQUE (la misma lección que costó cara en app.js): el arranque
         automático va DESPUÉS de declarar el estado del panel, o `abrirApp`
         reventaría en la zona muerta temporal y lo haría en silencio. */
      {
        const iAuto = admJs.indexOf("if (accesoConcedido()) abrirApp();");
        const iEstado = admJs.indexOf('const CLAVE_TOKEN = "historico_token"');
        assert.ok(iAuto > 0 && iEstado > 0, "no se encontraron el arranque automático y el estado del panel");
        assert.ok(iAuto > iEstado,
          "el arranque automático del panel corre antes de declarar su estado: morirá en la zona muerta temporal");
      }

      /* ---- panel: experiencia ejecutada y auditoría de cobertura ---- */
      for (const debe of ['id="seccion-experiencia"', 'id="exp-json"', 'id="btn-exp-cargar"',
        'id="btn-exp-confirmar"', 'id="btn-exp-cancelar"', 'id="btn-exp-descargar"',
        'id="exp-preview"', 'id="exp-actual"', 'id="exp-mensaje"', 'id="exp-errores"',
        'id="seccion-cobertura"', 'id="c-perfil"', 'id="c-usar-experiencia"', 'id="btn-cobertura"',
        'id="btn-cobertura-exportar"', 'id="c-faltantes"', 'id="c-criticos"', 'id="c-altos"',
        'id="c-medios"', 'id="c-bajos"', 'id="c-alerta"', 'id="c-skeleton"', 'id="c-excluidos"']) {
        assert.ok(admHtml.includes(debe), `admin.html sin ${debe} (falta la experiencia o la auditoría de cobertura)`);
      }
      // el toggle de priorización por experiencia viene ENCENDIDO (el encargo:
      // «activado por defecto si hay experiencia cargada»; admin.js lo apaga
      // solo cuando el GET dice que no hay nada cargado)
      {
        const i = admHtml.indexOf('id="c-usar-experiencia"');
        assert.ok(/\bchecked\b/.test(admHtml.slice(i, i + 200)), "el toggle de experiencia debe venir activado");
      }
      // sin experiencia cargada el panel dice exactamente qué hacer
      assert.ok(/No hay experiencia cargada\. Cargue sus contratos ejecutados/.test(admJs),
        "sin experiencia el panel debe enseñar el mensaje del encargo, no una caja vacía");
      for (const debe of ["/api/admin/experiencia", "/api/admin/cobertura-rup", "usar_experiencia",
        "descargarJSON", "🔴", "🟠", "🟡", "⚪", "ejecutarAuditoria", "cargarExperienciaActual"]) {
        assert.ok(admJs.includes(debe), `admin.js sin ${debe} (la experiencia o la auditoría no están cableadas)`);
      }
      // doble clic en «Confirmar carga» de experiencia: mismo blindaje que el RUP
      assert.ok(/\$\("btn-exp-confirmar"\)\.disabled = true/.test(admJs),
        "«Confirmar carga» de la experiencia debe deshabilitarse durante el envío");
      // el token tampoco viaja en la URL de los endpoints nuevos
      assert.ok(!/\/api\/admin\/(experiencia|cobertura-rup)\?[^`"']*token=/.test(admJs),
        "el token de la experiencia y de la auditoría va por cabecera, nunca en la URL");
      // la auditoría NO se dispara sola: recorre el histórico entero
      {
        const i = admJs.indexOf("function arrancarPaneles()");
        const cuerpo = admJs.slice(i, admJs.indexOf("\n  }", i));
        assert.ok(i > 0 && /cargarExperienciaActual\(\)/.test(cuerpo),
          "el arranque debe consultar la experiencia cargada (decide el estado del toggle)");
        assert.ok(!/ejecutarAuditoria\(\)/.test(cuerpo),
          "la auditoría recorre el histórico entero: no puede lanzarse sola al abrir el panel");
      }
      // el resumen del panel exige base antes de dividir (misma lección del «|| 0»)
      assert.ok(/analizados > 0 \? Math\.round/.test(admJs),
        "el porcentaje de procesos relevantes no puede calcularse sin comprobar el denominador");

      assert.ok(html.includes('id="f-sin-unspsc"'), "index.html sin el toggle de procesos sin código UNSPSC");
      const inputToggle = html.slice(html.indexOf('id="f-sin-unspsc"'), html.indexOf('id="f-sin-unspsc"') + 200);
      assert.ok(!/\bchecked\b/.test(inputToggle), "el toggle debe venir APAGADO por defecto");
      assert.ok(js.includes("incluir_sin_unspsc"), "app.js no envía el parámetro del toggle");
      const vercel = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "vercel.json"), "utf8"));
      for (const fn of Object.keys(vercel.functions)) {
        assert.ok(fs.existsSync(path.join(__dirname, "..", fn)), `vercel.json apunta a ${fn} inexistente`);
        // la semilla de vocabulario viaja con la función: si dejara de
        // empaquetarse, la co-señal de texto se quedaría muda en producción
        assert.strictEqual(vercel.functions[fn].includeFiles, "data/**",
          `${fn} no empaqueta data/** (la semilla de vocabulario no llegaría al despliegue)`);
      }
      const semilla = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "vocabulario_unspsc.json"), "utf8"));
      assert.ok(semilla.familias && Object.keys(semilla.familias).length >= 5, "semilla de vocabulario vacía");
      assert.ok(/semilla/i.test(semilla._meta.origen),
        "el archivo debe declarar que es una semilla curada, no una estadística del histórico");
      assert.ok(vercel.crons.some((c) => c.path === "/api/sync"), "falta el cron de /api/sync");
    }

    /* i. la INVARIANTE que sostiene el encadenado del panel de administración:
       modo=full REINICIA y modo=auto CONTINÚA. Si el botón repitiera modo=full
       en cada tanda, la carga volvería a enero para siempre y nunca terminaría.
       Se verifica contra el handler real, no contra el código del navegador. */
    {
      const progreso = async () => JSON.parse(await redis.get("licitaciones:progreso"));

      let r1 = await invocar(sync, "/api/sync?modo=full&presupuesto=1&chain=0");
      assert.strictEqual(r1.cuerpo.done, false, "con presupuesto de 1 ms la full no puede terminar");
      const p1 = await progreso();
      assert.strictEqual(p1.mesIdx, 0, "una full nueva arranca en el primer mes");

      // avanzar con AUTO hasta pasar de mes: eso demuestra que continúa
      let vueltas = 0;
      let p2 = p1;
      while (p2.mesIdx < 1 && !p2.terminado && vueltas < 60) {
        await invocar(sync, "/api/sync?modo=auto&presupuesto=150&chain=0");
        p2 = await progreso();
        vueltas++;
      }
      assert.ok(p2.mesIdx >= 1 || p2.terminado, "modo=auto no hizo avanzar la carga");
      assert.strictEqual(p2.iniciado, p1.iniciado, "modo=auto NO puede reiniciar la carga");

      // y ahora la prueba de por qué el botón no debe repetir modo=full
      await invocar(sync, "/api/sync?modo=full&presupuesto=1&chain=0");
      const p3 = await progreso();
      assert.strictEqual(p3.mesIdx, 0, "modo=full debe reiniciar desde el primer mes");
      assert.notStrictEqual(p3.iniciado, p1.iniciado, "modo=full debe empezar una corrida nueva");

      // dejar el corpus completo otra vez (como lo dejaría el botón real)
      let rf = { cuerpo: { done: false } };
      vueltas = 0;
      while (rf.cuerpo.done === false && vueltas < 200) {
        rf = await invocar(sync, "/api/sync?modo=auto&presupuesto=20000&chain=0");
        vueltas++;
      }
      assert.strictEqual(rf.cuerpo.done, true, "el encadenado full→auto debe converger");
    }

    const idx = JSON.parse(await redis.get("indice:competencia:meta"));
    return {
      invocaciones, chunks: chunks.length, corpus: meta.total, leidas: meta.leidas,
      historico: (await leerHistorico()).length, entidades: idx.clasificadas, ms: Date.now() - t0,
    };
  }

  /* i. contexto: sin CLI de Vercel ni salida a datos.gov.co en este entorno →
     las 4 iteraciones corren contra los mocks locales con los handlers reales. */
  console.log(`Mock Socrata en :${puertoSocrata} · mock Upstash en :${puertoUpstash} · ${MESES.length} meses × 120 filas`);
  const resultados = [];
  for (let i = 1; i <= objetivo; i++) {
    const r = await iteracion(i);
    resultados.push(r);
    console.log(`✔ iteración ${i}/${objetivo}: full en ${r.invocaciones} invocaciones reanudables · ${r.chunks} chunks · corpus ${r.corpus}/${r.leidas} filas · histórico ${r.historico} procesos → ${r.entidades} entidades clasificadas · ${r.ms} ms`);
  }
  console.log(`\nTODAS LAS ITERACIONES PASARON (${objetivo}/${objetivo}) · peticiones Socrata simuladas: ${socrata.peticiones()}`);
  socrata.server.close();
  upstash.server.close();
}

main().catch((e) => { console.error("\n✘ FALLO:", e.message); process.exit(1); });
